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
    let newest = latest_download_path(&app)?.ok_or_else(|| "vacía".to_string())?;
    open_path(&newest.to_string_lossy());
    Ok(newest.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default())
}

fn latest_download_path(app: &AppHandle) -> Result<Option<std::path::PathBuf>, String> {
    let dir = app.path().download_dir().map_err(|e| e.to_string())?;
    let newest = std::fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .flatten()
        .filter(|e| e.path().is_file())
        .filter_map(|e| e.metadata().ok().and_then(|m| m.modified().ok()).map(|t| (t, e.path())))
        .max_by_key(|(t, _)| *t)
        .map(|(_, p)| p);
    Ok(newest)
}

/// Devuelve solo el nombre de la descarga más reciente para pedir aprobación antes de abrirla.
#[tauri::command]
pub fn latest_download(app: AppHandle) -> Result<Option<String>, String> {
    Ok(latest_download_path(&app)?.and_then(|p| p.file_name().map(|n| n.to_string_lossy().to_string())))
}

/// Abre por nombre un archivo de Descargas, comprobando que sigue dentro de esa carpeta.
#[tauri::command]
pub fn open_download_named(app: AppHandle, name: String) -> Result<(), String> {
    let dir = app.path().download_dir().map_err(|e| e.to_string())?;
    let filename = std::path::Path::new(&name);
    if filename.components().count() != 1 || filename.file_name().map(|n| n.to_string_lossy().to_string()).as_deref() != Some(name.as_str()) {
        return Err("nombre de archivo no válido".into());
    }
    let path = dir.join(filename);
    if !path.is_file() { return Err("el archivo ya no está en Descargas".into()); }
    let root = dir.canonicalize().map_err(|e| e.to_string())?;
    let resolved = path.canonicalize().map_err(|e| e.to_string())?;
    if resolved.parent() != Some(root.as_path()) { return Err("el archivo no está dentro de Descargas".into()); }
    open_path(&resolved.to_string_lossy());
    Ok(())
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

/// Busca coincidencias en los accesos directos del menú Inicio sin abrirlas.
#[tauri::command]
pub fn find_apps(name: String) -> Result<Vec<String>, String> {
    let q = normalize_app_name(&name);
    if q.len() < 2 || q.len() > 40 {
        return Err("nombre raro".into());
    }
    let query_terms: Vec<&str> = q.split_whitespace().filter(|s| s.len() >= 2).collect();
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
    const SKIP: [&str; 6] = ["uninstall", "desinstalar", "readme", "help", "ayuda", "leame"];
    let mut matches: Vec<(u32, String)> = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for l in links {
        let stem = l.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        let low = normalize_app_name(&stem);
        if !seen.insert(low.clone()) { continue; }
        if SKIP.iter().any(|s| low.contains(s)) {
            continue;
        }
        let title_terms: Vec<&str> = low.split_whitespace().collect();
        let matched_terms = query_terms.iter().filter(|q| title_terms.iter().any(|t| t.contains(**q))).count();
        let score = if low == q { 0 } else if matched_terms == query_terms.len() { 1 } else if matched_terms > 0 { 2 } else if low.contains(&q.replace(' ', "")) { 3 } else { continue };
        matches.push((score, stem));
    }
    matches.sort_by(|a, b| a.0.cmp(&b.0).then_with(|| a.1.to_lowercase().cmp(&b.1.to_lowercase())));
    Ok(matches.into_iter().take(8).map(|(_, stem)| stem).collect())
}

fn normalize_app_name(name: &str) -> String {
    name.chars().map(|c| match c {
        'á' | 'à' | 'ä' | 'â' | 'Á' | 'À' | 'Ä' | 'Â' => 'a',
        'é' | 'è' | 'ë' | 'ê' | 'É' | 'È' | 'Ë' | 'Ê' => 'e',
        'í' | 'ì' | 'ï' | 'î' | 'Í' | 'Ì' | 'Ï' | 'Î' => 'i',
        'ó' | 'ò' | 'ö' | 'ô' | 'Ó' | 'Ò' | 'Ö' | 'Ô' => 'o',
        'ú' | 'ù' | 'ü' | 'û' | 'Ú' | 'Ù' | 'Ü' | 'Û' => 'u',
        'ñ' | 'Ñ' => 'n',
        _ => c.to_ascii_lowercase(),
    }).map(|c| if c.is_ascii_alphanumeric() { c } else { ' ' }).collect::<String>().split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Abre solo el acceso directo cuyo nombre exacto se confirmó en la interfaz.
#[tauri::command]
pub fn open_app(name: String) -> Result<String, String> {
    let selected = name.trim();
    let options = find_apps(selected.to_string())?;
    let Some(stem) = options.into_iter().find(|s| s.eq_ignore_ascii_case(selected)) else {
        return Err("programa no seleccionado exactamente".into());
    };
    let mut dirs: Vec<std::path::PathBuf> = Vec::new();
    for var in ["ProgramData", "APPDATA"] {
        if let Ok(base) = std::env::var(var) {
            dirs.push(std::path::Path::new(&base).join("Microsoft").join("Windows").join("Start Menu").join("Programs"));
        }
    }
    fn find_link(dir: &std::path::Path, depth: u32, selected: &str) -> Option<std::path::PathBuf> {
        if depth > 4 { return None; }
        for entry in std::fs::read_dir(dir).ok()?.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if let Some(found) = find_link(&path, depth + 1, selected) { return Some(found); }
            } else if path.extension().map(|x| x.eq_ignore_ascii_case("lnk")).unwrap_or(false)
                && path.file_stem().map(|s| s.to_string_lossy().eq_ignore_ascii_case(selected)).unwrap_or(false) {
                return Some(path);
            }
        }
        None
    }
    let path = dirs.iter().find_map(|d| find_link(d, 0, &stem)).ok_or_else(|| "el acceso directo ya no existe".to_string())?;
    open_path(&path.to_string_lossy());
    Ok(stem)
}

#[cfg(windows)]
struct OpenAppWindows {
    query: String,
    exact: bool,
    windows: Vec<(windows::Win32::Foundation::HWND, String)>,
}

#[cfg(windows)]
unsafe extern "system" fn collect_open_app_windows(
    hwnd: windows::Win32::Foundation::HWND,
    param: windows::Win32::Foundation::LPARAM,
) -> windows::core::BOOL {
    use windows::core::PWSTR;
    use windows::Win32::System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION};
    use windows::Win32::UI::WindowsAndMessaging::{GetClassNameW, GetWindowThreadProcessId, IsWindowVisible};
    unsafe {
        let state = &mut *(param.0 as *mut OpenAppWindows);
        if !IsWindowVisible(hwnd).as_bool() { return true.into(); }
        let mut class = [0u16; 96];
        let class_len = GetClassNameW(hwnd, &mut class);
        let class = String::from_utf16_lossy(&class[..class_len.max(0) as usize]);
        if matches!(class.as_str(), "Progman" | "WorkerW" | "Shell_TrayWnd" | "Shell_SecondaryTrayWnd") { return true.into(); }
        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut pid as *mut u32));
        if pid == 0 || pid == std::process::id() { return true.into(); }
        let Ok(process) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else { return true.into(); };
        let mut buffer = [0u16; 1024];
        let mut length = buffer.len() as u32;
        let result = QueryFullProcessImageNameW(process, PROCESS_NAME_WIN32, PWSTR(buffer.as_mut_ptr()), &mut length);
        let _ = windows::Win32::Foundation::CloseHandle(process);
        if result.is_err() { return true.into(); }
        let path = String::from_utf16_lossy(&buffer[..length as usize]);
        let executable = std::path::Path::new(&path).file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        let normalized = normalize_app_name(&executable);
        let matches = if state.exact {
            normalized == state.query
        } else {
            let app_terms: Vec<&str> = normalized.split_whitespace().collect();
            state.query.split_whitespace().any(|q| q.len() >= 3 && app_terms.iter().any(|term| term.contains(q)))
        };
        if matches {
            state.windows.push((hwnd, executable));
        }
        true.into()
    }
}

/// Devuelve los nombres de aplicaciones abiertas que coinciden con el nombre completo o una parte reconocible.
#[tauri::command]
pub fn find_running_apps(name: String) -> Result<Vec<String>, String> {
    let query = normalize_app_name(&name);
    if query.len() < 2 || query.len() > 40 { return Err("nombre raro".into()); }
    #[cfg(windows)]
    {
        use windows::Win32::Foundation::LPARAM;
        use windows::Win32::UI::WindowsAndMessaging::EnumWindows;
        let mut state = OpenAppWindows { query, exact: false, windows: Vec::new() };
        unsafe { EnumWindows(Some(collect_open_app_windows), LPARAM(&mut state as *mut _ as isize)).map_err(|e| e.to_string())?; }
        state.windows.sort_by(|a, b| a.1.to_lowercase().cmp(&b.1.to_lowercase()));
        let mut apps = Vec::new();
        for (_, app) in state.windows {
            if !apps.iter().any(|known: &String| known.eq_ignore_ascii_case(&app)) { apps.push(app); }
        }
        Ok(apps)
    }
    #[cfg(not(windows))]
    { Err("cerrar aplicaciones solo está disponible en Windows".into()) }
}

/// Envía WM_CLOSE a las ventanas visibles de una aplicación identificada por el nombre exacto de su proceso.
/// Windows conserva su confirmación habitual si hay cambios sin guardar.
#[tauri::command]
pub fn close_app(name: String) -> Result<(), String> {
    let query = normalize_app_name(&name);
    if query.len() < 2 || query.len() > 40 { return Err("nombre raro".into()); }
    #[cfg(windows)]
    {
        use windows::Win32::Foundation::{LPARAM, WPARAM};
        use windows::Win32::UI::WindowsAndMessaging::{EnumWindows, PostMessageW, WM_CLOSE};
        let mut state = OpenAppWindows { query, exact: true, windows: Vec::new() };
        unsafe { EnumWindows(Some(collect_open_app_windows), LPARAM(&mut state as *mut _ as isize)).map_err(|e| e.to_string())?; }
        if state.windows.is_empty() { return Err("la aplicación ya no está abierta".into()); }
        for (hwnd, _) in state.windows {
            unsafe { PostMessageW(Some(hwnd), WM_CLOSE, WPARAM(0), LPARAM(0)).map_err(|e| e.to_string())?; }
        }
        Ok(())
    }
    #[cfg(not(windows))]
    { Err("cerrar aplicaciones solo está disponible en Windows".into()) }
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
