//! Doble clic en cualquier parte de la pantalla → Eko va hacia allí.
//! Solo mira el botón izquierdo y la posición del ratón; no lee nada de lo que pulsas.
use serde::Serialize;
use tauri::AppHandle;

#[allow(dead_code)]
#[derive(Serialize, Clone, Debug)]
pub struct DblClick {
    pub x: f64,
    pub y: f64,
}

pub fn start(app: AppHandle) {
    #[cfg(windows)]
    std::thread::spawn(move || imp::run(app));
    #[cfg(not(windows))]
    let _ = app;
}

#[cfg(windows)]
mod imp {
    use super::DblClick;
    use std::time::{Duration, Instant};
    use tauri::{AppHandle, Emitter, Manager};
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, GetDoubleClickTime, VK_LBUTTON};
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

    pub fn run(app: AppHandle) {
        let dbl = Duration::from_millis(unsafe { GetDoubleClickTime() }.clamp(200, 900) as u64);
        let mut was_down = false;
        let mut last: Option<(Instant, POINT)> = None;
        loop {
            std::thread::sleep(Duration::from_millis(15));
            let down = unsafe { GetAsyncKeyState(VK_LBUTTON.0 as i32) } as u16 & 0x8000 != 0;
            if down && !was_down {
                let mut p = POINT::default();
                if unsafe { GetCursorPos(&mut p) }.is_ok() {
                    let now = Instant::now();
                    match last {
                        Some((t, q)) if now.duration_since(t) <= dbl && (p.x - q.x).abs() <= 6 && (p.y - q.y).abs() <= 6 => {
                            let scale = app.get_webview_window("main").and_then(|w| w.scale_factor().ok()).unwrap_or(1.0);
                            let _ = app.emit_to("main", "dblclick", DblClick { x: p.x as f64 / scale, y: p.y as f64 / scale });
                            last = None;
                        }
                        _ => last = Some((now, p)),
                    }
                }
            }
            was_down = down;
        }
    }
}
