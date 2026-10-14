//! Sentidos de Eko (fase 2). Todo se procesa en local; nada sale del PC.
//! Cada 2 s emite "senses" al frontend con la actividad y el estado del sistema.
//! Además emite "drive" (tarjeta/USB conectado) y "download" (descarga terminada),
//! y oculta a Eko solo con pantalla completa o mientras el micrófono está en uso (llamadas).

use std::collections::{HashMap, HashSet};
use std::net::{SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use serde::Serialize;
use sysinfo::{Disks, ProcessRefreshKind, ProcessesToUpdate, System};
use tauri::{AppHandle, Emitter, Manager};

use crate::AppState;

#[derive(Serialize, Clone, Default)]
pub struct Music {
    title: String,
    artist: String,
    playing: bool,
}

#[derive(Serialize, Clone, Default)]
pub struct Senses {
    app: String,
    title: String,
    idle: u64,
    fullscreen: bool,
    in_call: bool,
    cpu: f32,
    ram: f32,
    battery: Option<u8>,
    charging: bool,
    online: bool,
    disk_free: f32,
    music: Option<Music>,
}

#[derive(Serialize, Clone)]
struct DrivePayload {
    name: String,
    mount: String,
    photos: u32,
}

/// Programas que se han abierto o cerrado desde la última comprobación.
#[derive(Serialize, Clone)]
struct ProcsPayload {
    started: Vec<String>,
    stopped: Vec<String>,
}

#[derive(Serialize, Clone)]
struct DownloadPayload {
    name: String,
}

pub fn start(app: AppHandle) {
    let online = Arc::new(AtomicBool::new(true));
    start_online_probe(online.clone());
    start_downloads(app.clone());
    start_main_loop(app, online);
}

// ---------------------------------------------------------------- bucle principal

fn start_main_loop(app: AppHandle, online: Arc<AtomicBool>) {
    std::thread::spawn(move || {
        let mut sys = System::new();
        let mut known_removable: Option<HashSet<String>> = None;
        let mut known_procs: Option<HashSet<String>> = None;
        let mut disk_free = 100.0_f32;
        let mut tick: u64 = 0;
        #[cfg(windows)]
        let mut media = win::Media::new();

        loop {
            std::thread::sleep(Duration::from_secs(2));
            tick += 1;

            // Ventana activa
            let (exe, title, fullscreen) = match active_win_pos_rs::get_active_window() {
                Ok(w) => {
                    let exe = w
                        .process_path
                        .file_stem()
                        .map(|s| s.to_string_lossy().to_lowercase())
                        .unwrap_or_default();
                    let fs = is_fullscreen(&app, &exe, &w.position);
                    (exe, w.title, fs)
                }
                Err(_) => (String::new(), String::new(), false),
            };

            // Sistema
            sys.refresh_cpu_usage();
            sys.refresh_memory();
            let cpu = sys.global_cpu_usage();
            let ram = if sys.total_memory() > 0 {
                sys.used_memory() as f32 / sys.total_memory() as f32 * 100.0
            } else {
                0.0
            };

            // Programas abiertos/cerrados cada ~4 s (solo nombres, sin leer nada más del proceso)
            if tick % 2 == 1 {
                sys.refresh_processes_specifics(ProcessesToUpdate::All, true, ProcessRefreshKind::nothing());
                let now: HashSet<String> = sys
                    .processes()
                    .values()
                    .map(|p| {
                        let n = p.name().to_string_lossy().to_lowercase();
                        n.strip_suffix(".exe").unwrap_or(&n).to_string()
                    })
                    .collect();
                if let Some(prev) = &known_procs {
                    let started: Vec<String> = now.difference(prev).cloned().collect();
                    let stopped: Vec<String> = prev.difference(&now).cloned().collect();
                    if !started.is_empty() || !stopped.is_empty() {
                        let _ = app.emit_to("main", "procs", ProcsPayload { started, stopped });
                    }
                }
                known_procs = Some(now);
            }

            // Discos cada ~4 s: tarjetas/USB nuevos y espacio libre
            if tick % 2 == 0 {
                let disks = Disks::new_with_refreshed_list();
                let mut removable = HashSet::new();
                for d in disks.list() {
                    let mount = d.mount_point().to_string_lossy().to_string();
                    if d.is_removable() {
                        removable.insert(mount.clone());
                        if let Some(known) = &known_removable {
                            if !known.contains(&mount) {
                                let name = d.name().to_string_lossy().to_string();
                                let photos = count_photos(d.mount_point());
                                let _ = app.emit_to("main", "drive", DrivePayload { name, mount: mount.clone(), photos });
                            }
                        }
                    } else if is_system_disk(&mount) && d.total_space() > 0 {
                        disk_free = d.available_space() as f32 / d.total_space() as f32 * 100.0;
                    }
                }
                known_removable = Some(removable);
            }

            let (battery, charging) = power();
            let in_call = mic_in_use();
            #[cfg(windows)]
            let music = media.current();
            #[cfg(not(windows))]
            let music: Option<Music> = None;

            apply_discretion(&app, fullscreen || in_call);

            let senses = Senses {
                app: exe,
                title,
                idle: idle_secs(),
                fullscreen,
                in_call,
                cpu,
                ram,
                battery,
                charging,
                online: online.load(Ordering::Relaxed),
                disk_free,
                music,
            };
            let _ = app.emit_to("main", "senses", senses);
        }
    });
}

/// Oculta a Eko con pantalla completa o en llamada, y lo devuelve al terminar.
fn apply_discretion(app: &AppHandle, should_hide: bool) {
    let Some(win) = app.get_webview_window("main") else { return };
    let state = app.state::<AppState>();
    if should_hide {
        if !state.user_hidden.load(Ordering::Relaxed) && win.is_visible().unwrap_or(false) {
            let _ = win.hide();
            state.auto_hidden.store(true, Ordering::Relaxed);
        }
    } else if state.auto_hidden.swap(false, Ordering::Relaxed) && !state.user_hidden.load(Ordering::Relaxed) {
        let _ = win.show();
        let _ = app.emit_to("main", "cmd", "back");
    }
}

fn is_fullscreen(app: &AppHandle, exe: &str, pos: &active_win_pos_rs::WindowPosition) -> bool {
    if exe.is_empty() || exe == "explorer" || exe == "eko" || exe == "searchhost" || exe == "startmenuexperiencehost" {
        return false;
    }
    let Ok(monitors) = app.available_monitors() else { return false };
    monitors.iter().any(|m| {
        let p = m.position();
        let s = m.size();
        pos.x <= p.x as f64 + 1.0
            && pos.y <= p.y as f64 + 1.0
            && pos.x + pos.width >= (p.x + s.width as i32) as f64 - 1.0
            && pos.y + pos.height >= (p.y + s.height as i32) as f64 - 1.0
    })
}

fn is_system_disk(mount: &str) -> bool {
    let m = mount.to_uppercase();
    m.starts_with("C:") || m == "/"
}

/// Cuenta fotos en DCIM (o en la raíz si no hay DCIM), con límite para no tardar.
fn count_photos(root: &Path) -> u32 {
    const EXT: [&str; 14] = ["jpg", "jpeg", "png", "heic", "cr2", "cr3", "nef", "arw", "raf", "orf", "rw2", "dng", "pef", "srw"];
    let dcim = root.join("DCIM");
    let start = if dcim.is_dir() { dcim } else { root.to_path_buf() };
    let mut count = 0u32;
    let mut stack: Vec<(PathBuf, u8)> = vec![(start, 0)];
    let deadline = Instant::now() + Duration::from_secs(3);
    while let Some((dir, depth)) = stack.pop() {
        if Instant::now() > deadline || count > 50_000 {
            break;
        }
        let Ok(entries) = std::fs::read_dir(&dir) else { continue };
        for e in entries.flatten() {
            let p = e.path();
            if p.is_dir() {
                if depth < 4 {
                    stack.push((p, depth + 1));
                }
            } else if let Some(ext) = p.extension() {
                let ext = ext.to_string_lossy().to_lowercase();
                if EXT.contains(&ext.as_str()) {
                    count += 1;
                }
            }
        }
    }
    count
}

// ---------------------------------------------------------------- conexión

fn start_online_probe(online: Arc<AtomicBool>) {
    std::thread::spawn(move || {
        let targets: [SocketAddr; 2] = [
            SocketAddr::from(([1, 1, 1, 1], 443)),
            SocketAddr::from(([8, 8, 8, 8], 53)),
        ];
        loop {
            let ok = targets
                .iter()
                .any(|t| TcpStream::connect_timeout(t, Duration::from_secs(3)).is_ok());
            online.store(ok, Ordering::Relaxed);
            std::thread::sleep(Duration::from_secs(20));
        }
    });
}

// ---------------------------------------------------------------- descargas

fn start_downloads(app: AppHandle) {
    let Ok(dir) = app.path().download_dir() else { return };
    std::thread::spawn(move || {
        use notify::event::{CreateKind, ModifyKind, RenameMode};
        use notify::{EventKind, RecursiveMode, Watcher};

        let (tx, rx) = std::sync::mpsc::channel();
        let Ok(mut watcher) = notify::recommended_watcher(tx) else { return };
        if watcher.watch(&dir, RecursiveMode::NonRecursive).is_err() {
            return;
        }
        const TEMP: [&str; 7] = ["crdownload", "part", "tmp", "partial", "download", "opdownload", "!ut"];
        let mut seen: HashMap<PathBuf, Instant> = HashMap::new();

        for res in rx {
            let Ok(ev) = res else { continue };
            let relevant = matches!(
                ev.kind,
                EventKind::Create(CreateKind::File)
                    | EventKind::Create(CreateKind::Any)
                    | EventKind::Modify(ModifyKind::Name(RenameMode::To))
                    | EventKind::Modify(ModifyKind::Name(RenameMode::Both))
                    | EventKind::Modify(ModifyKind::Name(RenameMode::Any))
            );
            if !relevant {
                continue;
            }
            let Some(path) = ev.paths.last().cloned() else { continue };
            let name = path.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
            let ext = path.extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default();
            if name.is_empty() || name.starts_with('.') || name.starts_with('~') || TEMP.contains(&ext.as_str()) {
                continue;
            }
            // Espera un momento para asegurar que el archivo existe de verdad
            std::thread::sleep(Duration::from_millis(400));
            if !path.is_file() {
                continue;
            }
            let now = Instant::now();
            seen.retain(|_, t| now.duration_since(*t) < Duration::from_secs(60));
            if seen.contains_key(&path) {
                continue;
            }
            seen.insert(path, now);
            let _ = app.emit_to("main", "download", DownloadPayload { name });
        }
        drop(watcher);
    });
}

// ---------------------------------------------------------------- específico de Windows

#[cfg(windows)]
fn idle_secs() -> u64 {
    use windows::Win32::System::SystemInformation::GetTickCount;
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
    unsafe {
        let mut lii = LASTINPUTINFO { cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32, dwTime: 0 };
        if GetLastInputInfo(&mut lii).as_bool() {
            (GetTickCount().wrapping_sub(lii.dwTime) / 1000) as u64
        } else {
            0
        }
    }
}
#[cfg(not(windows))]
fn idle_secs() -> u64 {
    0
}

#[cfg(windows)]
fn power() -> (Option<u8>, bool) {
    use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
    let mut s = SYSTEM_POWER_STATUS::default();
    if unsafe { GetSystemPowerStatus(&mut s) }.is_err() {
        return (None, false);
    }
    let charging = s.ACLineStatus == 1;
    if s.BatteryFlag & 128 != 0 || s.BatteryLifePercent == 255 {
        return (None, charging);
    }
    (Some(s.BatteryLifePercent), charging)
}
#[cfg(not(windows))]
fn power() -> (Option<u8>, bool) {
    (None, true)
}

/// Micrófono en uso por cualquier app (Zoom, Meet, Teams, Discord…) = estás en una llamada.
#[cfg(windows)]
fn mic_in_use() -> bool {
    use winreg::RegKey;
    let base = r"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone";
    let Ok(root) = winreg::HKCU.open_subkey(base) else { return false };
    fn active(k: &RegKey) -> bool {
        matches!(k.get_value::<u64, _>("LastUsedTimeStop"), Ok(0))
            && matches!(k.get_value::<u64, _>("LastUsedTimeStart"), Ok(v) if v > 0)
    }
    for name in root.enum_keys().flatten() {
        let Ok(k) = root.open_subkey(&name) else { continue };
        if name == "NonPackaged" {
            for sub in k.enum_keys().flatten() {
                if let Ok(k2) = k.open_subkey(&sub) {
                    if active(&k2) {
                        return true;
                    }
                }
            }
        } else if active(&k) {
            return true;
        }
    }
    false
}
#[cfg(not(windows))]
fn mic_in_use() -> bool {
    false
}

#[cfg(windows)]
mod win {
    use super::Music;
    use windows::Media::Control::{
        GlobalSystemMediaTransportControlsSessionManager as Manager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status,
    };

    /// Lee lo que suena en Windows (Spotify, YouTube en el navegador, etc.).
    pub struct Media {
        mgr: Option<Manager>,
    }

    impl Media {
        pub fn new() -> Self {
            Self { mgr: None }
        }

        pub fn current(&mut self) -> Option<Music> {
            if self.mgr.is_none() {
                self.mgr = Manager::RequestAsync().ok().and_then(|op| op.join().ok());
            }
            let mgr = self.mgr.as_ref()?;
            let session = mgr.GetCurrentSession().ok()?;
            let playing = session.GetPlaybackInfo().ok()?.PlaybackStatus().ok()? == Status::Playing;
            let props = session.TryGetMediaPropertiesAsync().ok()?.join().ok()?;
            Some(Music {
                title: props.Title().map(|s| s.to_string()).unwrap_or_default(),
                artist: props.Artist().map(|s| s.to_string()).unwrap_or_default(),
                playing,
            })
        }
    }
}
