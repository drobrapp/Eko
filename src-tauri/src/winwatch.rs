//! Vigila la ventana activa (~10 veces por segundo) para que Eko pueda subirse a ella y reaccionar
//! cuando se mueve, se maximiza, se minimiza, se cierra o se enseña el escritorio.
//! Solo lee geometría y clase de ventana: nunca el contenido ni el título.
use serde::Serialize;
use tauri::AppHandle;

#[allow(dead_code)]
#[derive(Serialize, Clone, PartialEq, Debug)]
pub struct WinInfo {
    pub id: i64,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    pub max: bool,
    pub desk: bool,
}

pub fn start(app: AppHandle) {
    #[cfg(windows)]
    std::thread::spawn(move || imp::run(app));
    #[cfg(not(windows))]
    let _ = app;
}

#[cfg(windows)]
mod imp {
    use super::WinInfo;
    use std::time::{Duration, Instant};
    use tauri::{AppHandle, Emitter, Manager};
    use windows::Win32::Foundation::{HWND, RECT};
    use windows::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED, DWMWA_EXTENDED_FRAME_BOUNDS};
    use windows::Win32::UI::WindowsAndMessaging::{
        GetClassNameW, GetForegroundWindow, GetWindowRect, GetWindowThreadProcessId, IsIconic, IsWindow, IsWindowVisible, IsZoomed,
    };

    fn hwnd(id: i64) -> HWND {
        HWND(id as isize as *mut core::ffi::c_void)
    }

    fn class_of(h: HWND) -> String {
        let mut buf = [0u16; 128];
        let n = unsafe { GetClassNameW(h, &mut buf) };
        if n <= 0 {
            return String::new();
        }
        String::from_utf16_lossy(&buf[..n as usize])
    }

    fn cloaked(h: HWND) -> bool {
        let mut v: u32 = 0;
        let ok = unsafe { DwmGetWindowAttribute(h, DWMWA_CLOAKED, &mut v as *mut u32 as *mut core::ffi::c_void, 4) }.is_ok();
        ok && v != 0
    }

    // Borde visible de verdad (sin el marco invisible de Windows 10/11)
    fn rect_of(h: HWND) -> Option<RECT> {
        let mut r = RECT::default();
        let ok = unsafe {
            DwmGetWindowAttribute(
                h,
                DWMWA_EXTENDED_FRAME_BOUNDS,
                &mut r as *mut RECT as *mut core::ffi::c_void,
                std::mem::size_of::<RECT>() as u32,
            )
        }
        .is_ok();
        if !ok && unsafe { GetWindowRect(h, &mut r) }.is_err() {
            return None;
        }
        Some(r)
    }

    fn gone(h: HWND) -> bool {
        !unsafe { IsWindow(Some(h)) }.as_bool() || !unsafe { IsWindowVisible(h) }.as_bool()
    }

    pub fn run(app: AppHandle) {
        let me = std::process::id();
        let mut last: Option<WinInfo> = None;
        let mut sent_once = false;
        // Ventana que acaba de perder el foco: la vigilamos un momento para saber si se cerró o se minimizó
        let mut watch: Option<(i64, Instant)> = None;
        let mut prev_real: i64 = 0;
        loop {
            std::thread::sleep(Duration::from_millis(60));
            let Some(main) = app.get_webview_window("main") else { continue };
            let scale = main.scale_factor().unwrap_or(1.0);

            if let Some((pid_w, since)) = watch {
                let h = hwnd(pid_w);
                if gone(h) {
                    let _ = app.emit_to("main", "winev", "closed");
                    watch = None;
                } else if unsafe { IsIconic(h) }.as_bool() || cloaked(h) {
                    let _ = app.emit_to("main", "winev", "minimized");
                    watch = None;
                } else if since.elapsed() > Duration::from_millis(1500) {
                    watch = None;
                }
            }

            let fg = unsafe { GetForegroundWindow() };
            let id = fg.0 as isize as i64;
            if id == 0 {
                continue;
            }
            let mut pid = 0u32;
            unsafe { GetWindowThreadProcessId(fg, Some(&mut pid as *mut u32)) };
            if pid == me {
                continue; // las ventanas de Eko no cuentan
            }
            let cls = class_of(fg);
            let desk = cls == "Progman" || cls == "WorkerW";
            let shell = matches!(
                cls.as_str(),
                "Shell_TrayWnd" | "Shell_SecondaryTrayWnd" | "Windows.UI.Core.CoreWindow" | "XamlExplorerHostIslandWindow"
                    | "ForegroundStaging" | "MultitaskingViewFrame" | "TaskListThumbnailWnd" | "NotifyIconOverflowWindow"
                    | "TopLevelWindowForOverflowXamlIsland"
            );
            let cur = if shell {
                None
            } else if desk {
                Some(WinInfo { id, x: 0.0, y: 0.0, w: 0.0, h: 0.0, max: false, desk: true })
            } else if !unsafe { IsWindowVisible(fg) }.as_bool() || unsafe { IsIconic(fg) }.as_bool() || cloaked(fg) {
                None
            } else {
                rect_of(fg).map(|r| WinInfo {
                    id,
                    x: r.left as f64 / scale,
                    y: r.top as f64 / scale,
                    w: (r.right - r.left) as f64 / scale,
                    h: (r.bottom - r.top) as f64 / scale,
                    max: unsafe { IsZoomed(fg) }.as_bool(),
                    desk: false,
                })
            };

            if sent_once && cur == last {
                continue;
            }
            let new_id = cur.as_ref().filter(|c| !c.desk).map(|c| c.id).unwrap_or(0);
            if prev_real != 0 && new_id != prev_real {
                watch = Some((prev_real, Instant::now()));
            }
            if new_id != 0 {
                prev_real = new_id;
            } else if cur.as_ref().map(|c| c.desk).unwrap_or(false) || cur.is_none() {
                prev_real = 0;
            }
            sent_once = true;
            last = cur.clone();
            let _ = app.emit_to("main", "win", cur);
        }
    }
}
