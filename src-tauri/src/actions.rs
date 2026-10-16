//! Atajos del menú de Eko: abrir descargas, captura de pantalla y control de la música.

use tauri::{AppHandle, Manager};

/// Abre una carpeta, archivo, acceso directo o web con su programa por defecto, por la vía normal de Windows
/// (ShellExecute), sin lanzar otros procesos intermedios.
fn open_path(target: &str) {
    #[cfg(windows)]
    {
        use windows::core::{HSTRING, PCWSTR};
        use windows::Win32::UI::Shell::ShellExecuteW;
        use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;
        let file = HSTRING::from(target);
        let verb = HSTRING::from("open");
        unsafe {
            ShellExecuteW(None, &verb, &file, PCWSTR::null(), PCWSTR::null(), SW_SHOWNORMAL);
        }
    }
    #[cfg(not(windows))]
    {
        let _ = target;
    }
}

#[tauri::command]
pub fn open_downloads(app: AppHandle) -> Result<(), String> {
    let dir = app.path().download_dir().map_err(|e| e.to_string())?;
    open_path(&dir.to_string_lossy());
    Ok(())
}

/// Abre el archivo más reciente de la carpeta Descargas con su programa por defecto.
#[tauri::command]
pub fn open_last_download(app: AppHandle) -> Result<String, String> {
    let dir = app.path().download_dir().map_err(|e| e.to_string())?;
    let newest = std::fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .flatten()
        .filter(|e| e.path().is_file())
        .filter_map(|e| e.metadata().ok().and_then(|m| m.modified().ok()).map(|t| (t, e.path())))
        .max_by_key(|(t, _)| *t)
        .map(|(_, p)| p)
        .ok_or_else(|| "vacía".to_string())?;
    open_path(&newest.to_string_lossy());
    Ok(newest.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default())
}

/// Abre la herramienta Recortes de Windows en modo captura.
#[tauri::command]
pub fn screenshot() {
    open_path("ms-screenclip:");
}

#[tauri::command]
pub fn media_play_pause() {
    media(false);
}

#[tauri::command]
pub fn media_next() {
    media(true);
}

fn media(next: bool) {
    #[cfg(windows)]
    std::thread::spawn(move || {
        use windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager as Manager;
        let Ok(op) = Manager::RequestAsync() else { return };
        let Ok(mgr) = op.join() else { return };
        let Ok(session) = mgr.GetCurrentSession() else { return };
        let res = if next { session.TrySkipNextAsync() } else { session.TryTogglePlayPauseAsync() };
        if let Ok(op) = res {
            let _ = op.join();
        }
    });
    #[cfg(not(windows))]
    let _ = next;
}

// ---------- Cosas que Eko puede hacer en el PC cuando se lo pides en el chat ----------
// Lista cerrada: nada de comandos libres, ni borrar, mover o cerrar nada.

#[tauri::command]
pub fn media_prev() {
    #[cfg(windows)]
    std::thread::spawn(|| {
        use windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager as Manager;
        let Ok(op) = Manager::RequestAsync() else { return };
        let Ok(mgr) = op.join() else { return };
        let Ok(session) = mgr.GetCurrentSession() else { return };
        if let Ok(op) = session.TrySkipPreviousAsync() {
            let _ = op.join();
        }
    });
}

/// Sube, baja o silencia el volumen con el control de audio de Windows (sin simular teclas)
#[tauri::command]
pub fn volume(dir: String) {
    #[cfg(windows)]
    std::thread::spawn(move || {
        use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
        use windows::Win32::Media::Audio::{eConsole, eRender, IMMDeviceEnumerator, MMDeviceEnumerator};
        use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED};
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
            let en: IMMDeviceEnumerator = match CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL) {
                Ok(x) => x,
                Err(_) => return,
            };
            let Ok(dev) = en.GetDefaultAudioEndpoint(eRender, eConsole) else { return };
            let vol: IAudioEndpointVolume = match dev.Activate(CLSCTX_ALL, None) {
                Ok(x) => x,
                Err(_) => return,
            };
            match dir.as_str() {
                "up" => {
                    for _ in 0..4 {
                        let _ = vol.VolumeStepUp(std::ptr::null());
                    }
                }
                "down" => {
                    for _ in 0..4 {
                        let _ = vol.VolumeStepDown(std::ptr::null());
                    }
                }
                _ => {
                    if let Ok(m) = vol.GetMute() {
                        let _ = vol.SetMute(!m.as_bool(), std::ptr::null());
                    }
                }
            }
        }
    });
    #[cfg(not(windows))]
    let _ = dir;
}

#[tauri::command]
pub fn open_folder(app: AppHandle, which: String) -> Result<(), String> {
    let p = app.path();
    let dir = match which.as_str() {
        "documentos" => p.document_dir(),
        "imagenes" => p.picture_dir(),
        "escritorio" => p.desktop_dir(),
        "musica" => p.audio_dir(),
        "videos" => p.video_dir(),
        _ => p.download_dir(),
    }
    .map_err(|e| e.to_string())?;
    open_path(&dir.to_string_lossy());
    Ok(())
}

/// Abre una dirección web con el navegador por defecto
fn open_url(url: &str) {
    open_path(url);
}

fn encode(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => out.push(b as char),
            b' ' => out.push('+'),
            _ => out.push_str(&format!("%{:02X}", b)),
        }
    }
    out
}

#[tauri::command]
pub fn web_search(q: String) {
    let q: String = q.chars().take(200).collect();
    open_url(&format!("https://www.google.com/search?q={}", encode(q.trim())));
}

/// Solo direcciones https normales (nada de otros protocolos ni caracteres raros)
#[tauri::command]
pub fn open_site(url: String) -> Result<(), String> {
    let ok = url.starts_with("https://")
        && url.len() < 300
        && url.chars().all(|c| c.is_ascii_alphanumeric() || "-._~:/?#@!$&()*+,;=%".contains(c));
    if !ok {
        return Err("dirección no válida".into());
    }
    open_url(&url);
    Ok(())
}

/// Busca el programa entre los accesos directos del menú Inicio y lo abre
#[tauri::command]
pub fn open_app(name: String) -> Result<String, String> {
    let q = name.trim().to_lowercase();
    if q.len() < 2 || q.len() > 40 {
        return Err("nombre raro".into());
    }
    let mut dirs: Vec<std::path::PathBuf> = Vec::new();
    for var in ["ProgramData", "APPDATA"] {
        if let Ok(base) = std::env::var(var) {
            dirs.push(std::path::Path::new(&base).join("Microsoft").join("Windows").join("Start Menu").join("Programs"));
        }
    }
    fn walk(dir: &std::path::Path, depth: u32, out: &mut Vec<std::path::PathBuf>) {
        if depth > 4 {
            return;
        }
        let Ok(rd) = std::fs::read_dir(dir) else { return };
        for e in rd.flatten() {
            let p = e.path();
            if p.is_dir() {
                walk(&p, depth + 1, out);
            } else if p.extension().map(|x| x.eq_ignore_ascii_case("lnk")).unwrap_or(false) {
                out.push(p);
            }
        }
    }
    let mut links = Vec::new();
    for d in &dirs {
        walk(d, 0, &mut links);
    }
    const SKIP: [&str; 6] = ["uninstall", "desinstalar", "readme", "help", "ayuda", "léame"];
    let mut best: Option<(u32, usize, std::path::PathBuf, String)> = None;
    for l in links {
        let stem = l.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        let low = stem.to_lowercase();
        if SKIP.iter().any(|s| low.contains(s)) {
            continue;
        }
        let score = if low == q { 0 } else if low.starts_with(&q) { 1 } else if low.contains(&q) { 2 } else { continue };
        let better = match &best {
            None => true,
            Some((s, len, _, _)) => score < *s || (score == *s && low.len() < *len),
        };
        if better {
            best = Some((score, low.len(), l.clone(), stem));
        }
    }
    match best {
        Some((_, _, path, stem)) => {
            open_path(&path.to_string_lossy());
            Ok(stem)
        }
        None => Err("no encontrado".into()),
    }
}

#[tauri::command]
pub fn lock_pc() {
    #[cfg(windows)]
    unsafe {
        let _ = windows::Win32::System::Shutdown::LockWorkStation();
    }
}

// ---------- Copia de seguridad de Eko (nivel, logros, casa, recuerdos…) ----------
/// Guarda la copia en Documentos\Eko y abre la carpeta. Devuelve la ruta del archivo.
#[tauri::command]
pub fn backup_save(app: AppHandle, data: String, name: String) -> Result<String, String> {
    let dir = app.path().document_dir().map_err(|e| e.to_string())?.join("Eko");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let safe: String = name.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_' || *c == '.').collect();
    let file = dir.join(if safe.is_empty() { "eko-copia.json".to_string() } else { safe });
    std::fs::write(&file, data).map_err(|e| e.to_string())?;
    open_path(&dir.to_string_lossy());
    Ok(file.to_string_lossy().to_string())
}

/// Reinicia Eko (tras recuperar una copia)
#[tauri::command]
pub fn app_restart(app: AppHandle) {
    app.restart();
}
