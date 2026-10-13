//! Atajos del menú de Eko: abrir descargas, captura de pantalla y control de la música.

use tauri::{AppHandle, Manager};

fn open_path(target: &str) {
    #[cfg(windows)]
    {
        let _ = std::process::Command::new("explorer").arg(target).spawn();
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
