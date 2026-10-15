//! Escritorio: qué iconos hay, dónde están y de qué tipo son, para que Eko pueda curiosear.
//! Solo lee nombres, posiciones y recuentos (cuántas cosas hay en una carpeta). Nunca abre ni lee archivos.
//! Solo se usa si el usuario activa «Dejar que Eko curiosee el escritorio» en Ajustes.
use serde::Serialize;

#[derive(Serialize, Clone, Debug, Default)]
pub struct DeskIcon {
    pub name: String,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    /// folder · file · shortcut · web · recycle · system
    pub kind: String,
    pub ext: String,
    /// elementos dentro (carpetas)
    pub count: i64,
    /// cuántos son fotos (carpetas)
    pub images: i64,
}

#[derive(Serialize, Clone, Debug, Default)]
pub struct DeskInfo {
    pub icons: Vec<DeskIcon>,
    pub bin_items: i64,
    pub bin_bytes: i64,
}

#[tauri::command]
pub async fn desktop_scan(app: tauri::AppHandle) -> Result<DeskInfo, String> {
    #[cfg(windows)]
    {
        use tauri::Manager;
        let scale = app.get_webview_window("main").and_then(|w| w.scale_factor().ok()).unwrap_or(1.0);
        return tauri::async_runtime::spawn_blocking(move || imp::scan(scale)).await.map_err(|e| e.to_string())?;
    }
    #[cfg(not(windows))]
    {
        let _ = app;
        Ok(DeskInfo::default())
    }
}

#[allow(dead_code)]
fn classify(path: &str) -> (String, String, i64, i64) {
    const IMG: [&str; 12] = ["jpg", "jpeg", "png", "heic", "webp", "gif", "tif", "tiff", "cr2", "cr3", "nef", "arw"];
    if path.starts_with("::{645FF040-5081-101B-9F08-00AA002F954E}") {
        return ("recycle".into(), String::new(), 0, 0);
    }
    if path.starts_with("::") || path.is_empty() {
        return ("system".into(), String::new(), 0, 0);
    }
    let p = std::path::Path::new(path);
    if p.is_dir() {
        let (mut n, mut im) = (0i64, 0i64);
        if let Ok(rd) = std::fs::read_dir(p) {
            for e in rd.take(5000).flatten() {
                n += 1;
                let ext = e.path().extension().map(|x| x.to_string_lossy().to_lowercase()).unwrap_or_default();
                if IMG.contains(&ext.as_str()) {
                    im += 1;
                }
            }
        }
        return ("folder".into(), String::new(), n, im);
    }
    let ext = p.extension().map(|x| x.to_string_lossy().to_lowercase()).unwrap_or_default();
    let kind = match ext.as_str() {
        "lnk" => "shortcut",
        "url" => "web",
        _ => "file",
    };
    (kind.into(), ext, 0, 0)
}

#[cfg(windows)]
mod imp {
    use super::{classify, DeskIcon, DeskInfo};
    use windows::core::{Interface, PCWSTR, PWSTR};
    use windows::Win32::Foundation::{HWND, POINT, RECT};
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CoTaskMemFree, CoUninitialize, IServiceProvider, CLSCTX_ALL, COINIT_APARTMENTTHREADED};
    use windows::Win32::System::Variant::{VARIANT, VT_I4};
    use windows::Win32::UI::Shell::Common::{ITEMIDLIST, STRRET};
    use windows::Win32::UI::Shell::{
        IEnumIDList, IFolderView, IShellBrowser, IShellFolder, IShellWindows, SHQueryRecycleBinW, ShellWindows, StrRetToStrW, SHGDNF, SHGDN_FORPARSING,
        SHGDN_NORMAL, SHQUERYRBINFO, SID_STopLevelBrowser, SVGIO_ALLVIEW, SWC_DESKTOP, SWFO_NEEDDISPATCH,
    };
    use windows::Win32::UI::WindowsAndMessaging::GetWindowRect;

    pub fn scan(scale: f64) -> Result<DeskInfo, String> {
        unsafe {
            let hr = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
            let out = scan_inner(scale);
            if hr.is_ok() {
                CoUninitialize();
            }
            out.map_err(|e| e.to_string())
        }
    }

    unsafe fn display(folder: &IShellFolder, pidl: *const ITEMIDLIST, f: SHGDNF) -> String {
        unsafe {
            let mut sr = STRRET::default();
            if folder.GetDisplayNameOf(pidl, f, &mut sr).is_err() {
                return String::new();
            }
            let mut p = PWSTR::null();
            if StrRetToStrW(&mut sr, Some(pidl), &mut p).is_err() || p.is_null() {
                return String::new();
            }
            let s = p.to_string().unwrap_or_default();
            CoTaskMemFree(Some(p.0 as *const core::ffi::c_void));
            s
        }
    }

    unsafe fn scan_inner(scale: f64) -> windows::core::Result<DeskInfo> {
        unsafe {
            let sw: IShellWindows = CoCreateInstance(&ShellWindows, None, CLSCTX_ALL)?;
            let mut loc = VARIANT::default();
            {
                let v = &mut *loc.Anonymous.Anonymous;
                v.vt = VT_I4;
                v.Anonymous.lVal = 0; // CSIDL_DESKTOP
            }
            let empty = VARIANT::default();
            let mut hwnd: i32 = 0;
            let disp = sw.FindWindowSW(&loc, &empty, SWC_DESKTOP, &mut hwnd, SWFO_NEEDDISPATCH)?;
            let sp: IServiceProvider = disp.cast()?;
            let browser: IShellBrowser = sp.QueryService(&SID_STopLevelBrowser)?;
            let view = browser.QueryActiveShellView()?;
            let fv: IFolderView = view.cast()?;
            let folder: IShellFolder = fv.GetFolder()?;
            let mut spacing = POINT::default();
            let _ = fv.GetSpacing(&mut spacing);
            let cw = if spacing.x > 0 { spacing.x } else { 76 } as f64;
            let ch = if spacing.y > 0 { spacing.y } else { 100 } as f64;
            // la lista de iconos usa coordenadas relativas a la ventana del escritorio
            let mut r = RECT::default();
            let _ = GetWindowRect(HWND(hwnd as isize as *mut core::ffi::c_void), &mut r);
            let items: IEnumIDList = fv.Items(SVGIO_ALLVIEW)?;
            let mut out = DeskInfo::default();
            loop {
                let mut arr: [*mut ITEMIDLIST; 1] = [core::ptr::null_mut()];
                let mut got = 0u32;
                let hr = items.Next(&mut arr, Some(&mut got));
                if hr.is_err() || got == 0 || arr[0].is_null() {
                    break;
                }
                let pidl = arr[0];
                let pos = fv.GetItemPosition(pidl).unwrap_or_default();
                let name = display(&folder, pidl, SHGDN_NORMAL);
                let path = display(&folder, pidl, SHGDN_FORPARSING);
                CoTaskMemFree(Some(pidl as *const core::ffi::c_void));
                let (kind, ext, count, images) = classify(&path);
                out.icons.push(DeskIcon {
                    name,
                    x: (r.left + pos.x) as f64 / scale,
                    y: (r.top + pos.y) as f64 / scale,
                    w: cw / scale,
                    h: ch / scale,
                    kind,
                    ext,
                    count,
                    images,
                });
                if out.icons.len() >= 300 {
                    break;
                }
            }
            let mut q = SHQUERYRBINFO { cbSize: core::mem::size_of::<SHQUERYRBINFO>() as u32, ..Default::default() };
            if SHQueryRecycleBinW(PCWSTR::null(), &mut q).is_ok() {
                out.bin_items = q.i64NumItems;
                out.bin_bytes = q.i64Size;
            }
            Ok(out)
        }
    }
}
