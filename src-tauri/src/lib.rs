//! Núcleo nativo de Eko (fase 1).
//! - Ventana transparente que deja pasar los clics salvo encima de la mascota.
//! - Emite la posición global del cursor al frontend (para mirarte y las caricias).
//! - Icono en la bandeja, arranque con Windows, atajo de pánico y una sola instancia.

mod actions;
mod desktop;
mod senses;
mod winwatch;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_updater::UpdaterExt;

/// Zona "sólida" de la mascota en px lógicos, relativa a la ventana.
#[derive(Default)]
struct HitBox {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

#[derive(Default)]
pub(crate) struct AppState {
    hitbox: Mutex<HitBox>,
    dragging: AtomicBool,
    /// Oculto por el usuario (bandeja o Ctrl+Alt+E).
    pub(crate) user_hidden: AtomicBool,
    /// Oculto automáticamente (pantalla completa o llamada).
    pub(crate) auto_hidden: AtomicBool,
}

#[derive(Clone, serde::Serialize)]
struct CursorPayload {
    x: f64,
    y: f64,
    over: bool,
}

#[tauri::command]
fn set_hitbox(state: tauri::State<AppState>, x: f64, y: f64, w: f64, h: f64) {
    *state.hitbox.lock().unwrap() = HitBox { x, y, w, h };
}

/// Casilla "Sonido" de la bandeja, para sincronizarla con la preferencia guardada en el frontend.
struct SoundItem(CheckMenuItem<tauri::Wry>);

/// Qué situaciones esconden a Eko (desde Ajustes)
#[tauri::command]
fn set_discretion(call: bool, record: bool, fullscreen: bool) {
    use std::sync::atomic::Ordering;
    senses::HIDE_CALL.store(call, Ordering::Relaxed);
    senses::HIDE_RECORD.store(record, Ordering::Relaxed);
    senses::HIDE_FULLSCREEN.store(fullscreen, Ordering::Relaxed);
}

#[tauri::command]
fn set_sound_menu(item: tauri::State<SoundItem>, value: bool) {
    let _ = item.0.set_checked(value);
}

/// Abre (o trae al frente) la ventana de Ajustes.
#[tauri::command]
async fn open_settings(app: AppHandle) -> Result<(), String> {
    show_settings(&app)
}

fn show_settings(app: &AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("settings") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
        return Ok(());
    }
    tauri::WebviewWindowBuilder::new(app, "settings", tauri::WebviewUrl::App("settings.html".into()))
        .title("Eko · Ajustes")
        .inner_size(560.0, 720.0)
        .min_inner_size(420.0, 480.0)
        .center()
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---------- Pelota: ventanita propia para que pueda recorrer toda la pantalla ----------
#[tauri::command]
async fn ball_show(app: AppHandle, x: f64, y: f64) -> Result<(), String> {
    let pos = tauri::LogicalPosition::new(x, y);
    if let Some(w) = app.get_webview_window("ball") {
        let _ = w.set_position(pos);
        let _ = w.show();
        return Ok(());
    }
    tauri::WebviewWindowBuilder::new(&app, "ball", tauri::WebviewUrl::App("ball.html".into()))
        .title("Eko · pelota")
        .inner_size(40.0, 40.0)
        .position(x, y)
        .transparent(true)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .shadow(false)
        .focused(false)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Si Eko se esconde, la pelota se guarda con él
pub(crate) fn put_ball_away(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("ball") {
        let _ = w.hide();
    }
    let _ = app.emit_to("main", "cmd", "stowball");
}

#[tauri::command]
fn ball_pos(app: AppHandle, x: f64, y: f64) {
    if let Some(w) = app.get_webview_window("ball") {
        let _ = w.set_position(tauri::LogicalPosition::new(x, y));
    }
}

#[tauri::command]
fn ball_hide(app: AppHandle) {
    if let Some(w) = app.get_webview_window("ball") {
        let _ = w.hide();
    }
}

#[tauri::command]
fn get_autostart(app: AppHandle) -> bool {
    app.autolaunch().is_enabled().unwrap_or(false)
}

#[tauri::command]
fn set_autostart(app: AppHandle, value: bool) {
    let al = app.autolaunch();
    let _ = if value { al.enable() } else { al.disable() };
}

#[tauri::command]
fn app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

/// Busca actualización ya; si la hay, la instala en segundo plano y reinicia.
#[tauri::command]
async fn check_update_now(app: AppHandle) -> Result<Option<String>, String> {
    let update = app.updater().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())?;
    match update {
        Some(u) => {
            let version = u.version.clone();
            let handle = app.clone();
            let _ = app.emit_to("main", "cmd", "updating");
            tauri::async_runtime::spawn(async move {
                if u.download_and_install(|_, _| {}, || {}).await.is_ok() {
                    handle.restart();
                }
            });
            Ok(Some(version))
        }
        None => Ok(None),
    }
}

#[tauri::command]
fn set_dragging(state: tauri::State<AppState>, value: bool) {
    state.dragging.store(value, Ordering::Relaxed);
}

fn toggle_visible(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let state = app.state::<AppState>();
        let hidden_now = state.user_hidden.load(Ordering::Relaxed)
            || state.auto_hidden.load(Ordering::Relaxed)
            || !w.is_visible().unwrap_or(false);
        if hidden_now {
            state.user_hidden.store(false, Ordering::Relaxed);
            state.auto_hidden.store(false, Ordering::Relaxed);
            let _ = w.show();
            let _ = app.emit_to("main", "cmd", "wake");
        } else {
            state.user_hidden.store(true, Ordering::Relaxed);
            let _ = w.hide();
            put_ball_away(app);
        }
    }
}

/// Hilo ligero (25 Hz): click-through dinámico + posición del cursor.
fn start_cursor_loop(app: AppHandle) {
    std::thread::spawn(move || {
        let mut last_ignore: Option<bool> = None;
        loop {
            std::thread::sleep(Duration::from_millis(40));
            let Some(win) = app.get_webview_window("main") else { continue };
            if !win.is_visible().unwrap_or(false) {
                continue;
            }
            let Ok(cur) = app.cursor_position() else { continue };
            let Ok(pos) = win.outer_position() else { continue };
            let scale = win.scale_factor().unwrap_or(1.0);
            let lx = (cur.x - pos.x as f64) / scale;
            let ly = (cur.y - pos.y as f64) / scale;

            let state = app.state::<AppState>();
            let over = {
                let hb = state.hitbox.lock().unwrap();
                lx >= hb.x && lx <= hb.x + hb.w && ly >= hb.y && ly <= hb.y + hb.h
            };
            let ignore = !over && !state.dragging.load(Ordering::Relaxed);
            if last_ignore != Some(ignore) {
                let _ = win.set_ignore_cursor_events(ignore);
                last_ignore = Some(ignore);
            }
            let _ = app.emit_to(
                "main",
                "cursor",
                CursorPayload { x: cur.x / scale, y: cur.y / scale, over },
            );
        }
    });
}

fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let autostart_on = app.autolaunch().is_enabled().unwrap_or(false);
    let sleep = MenuItem::with_id(app, "sleep", "Dormir / Despertar", true, None::<&str>)?;
    let toggle = MenuItem::with_id(app, "toggle", "Ocultar / Mostrar   Ctrl+Alt+E", true, None::<&str>)?;
    let auto = CheckMenuItem::with_id(app, "autostart", "Arrancar con Windows", true, autostart_on, None::<&str>)?;
    let sound = CheckMenuItem::with_id(app, "sound", "Sonido", true, true, None::<&str>)?;
    let hat = MenuItem::with_id(app, "hat", "Probar complemento", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Ajustes…", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&settings, &sleep, &toggle, &sound, &hat, &auto, &sep, &quit])?;
    app.manage(SoundItem(sound.clone()));

    let auto_item = auto.clone();
    let mut builder = TrayIconBuilder::with_id("eko")
        .tooltip("Eko")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "sleep" => {
                let _ = app.emit_to("main", "cmd", "sleep");
            }
            "toggle" => toggle_visible(app),
            "autostart" => {
                let al = app.autolaunch();
                let on = al.is_enabled().unwrap_or(false);
                let _ = if on { al.disable() } else { al.enable() };
                let _ = auto_item.set_checked(al.is_enabled().unwrap_or(!on));
            }
            "sound" => {
                let on = app.state::<SoundItem>().0.is_checked().unwrap_or(true);
                let _ = app.emit_to("main", "cmd", if on { "sound-on" } else { "sound-off" });
            }
            "settings" => {
                let _ = show_settings(app);
            }
            "hat" => {
                let _ = app.emit_to("main", "cmd", "hat-cycle");
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_visible(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

/// La primera vez que se ejecuta, activa el arranque con Windows (desactivable desde la bandeja).
fn first_run_autostart(app: &tauri::App) {
    let Ok(dir) = app.path().app_data_dir() else { return };
    let marker = dir.join(".first-run-done");
    if marker.exists() {
        return;
    }
    let _ = std::fs::create_dir_all(&dir);
    let _ = app.autolaunch().enable();
    let _ = std::fs::write(marker, b"1");
}

/// Busca una versión nueva en GitHub Releases; si la hay, Eko lo anuncia y tú decides cuándo instalarla (clic en él).
async fn check_update(app: &AppHandle) -> tauri_plugin_updater::Result<()> {
    if let Some(update) = app.updater()?.check().await? {
        let _ = app.emit_to("main", "update-available", update.version.clone());
    }
    Ok(())
}

/// Instala la actualización ahora (lo pide Eko cuando le dices que sí) y reinicia.
#[tauri::command]
async fn install_update(app: AppHandle) -> Result<bool, String> {
    let update = app.updater().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())?;
    let Some(u) = update else { return Ok(false) };
    let _ = app.emit_to("main", "cmd", "updating");
    u.download_and_install(|_, _| {}, || {}).await.map_err(|e| e.to_string())?;
    app.restart();
}

/// Comprueba actualizaciones 30 s después de arrancar y luego cada 3 horas.
fn start_update_loop(app: AppHandle) {
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(30));
        loop {
            let _ = tauri::async_runtime::block_on(check_update(&app));
            std::thread::sleep(Duration::from_secs(3 * 60 * 60));
        }
    });
}

pub fn run() {
    let panic_key = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyE);

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
            }
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed && shortcut == &panic_key {
                        toggle_visible(app);
                    }
                })
                .build(),
        )
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![set_hitbox, set_dragging, set_sound_menu, set_discretion, open_settings, ball_show, ball_pos, ball_hide, desktop::desktop_scan, get_autostart, set_autostart, app_version, check_update_now, install_update, actions::open_downloads, actions::open_last_download, actions::screenshot, actions::media_play_pause, actions::media_next])
        .setup(move |app| {
            first_run_autostart(app);
            build_tray(app)?;
            let _ = app.global_shortcut().register(panic_key);
            start_cursor_loop(app.handle().clone());
            winwatch::start(app.handle().clone());
            start_update_loop(app.handle().clone());
            senses::start(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error al arrancar Eko");
}
