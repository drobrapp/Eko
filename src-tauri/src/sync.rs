// Eko en el móvil: el PC hace de «casa base» en tu Wi-Fi.
// Un servidor HTTP mínimo, solo para la red de casa. El móvil se conecta una vez escaneando un QR
// (ip, puerto y una clave secreta) y después pide el estado de Eko cuando lo necesita.
// El estado viaja cifrado (AES-GCM): lo cifra la página con la clave del QR y aquí solo se guarda y se sirve.
// Para pedirlo, el móvil manda un «token» (resumen SHA-256 de la clave), así la clave nunca viaja por la red.
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream, UdpSocket};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub const PORT: u16 = 47913;

struct St {
    token: String,    // token del móvil ya conectado
    pending: String,  // token esperando a que el móvil escanee el QR
    snapshot: String, // estado de Eko, ya cifrado por la página
    started: bool,
}
static ST: OnceLock<Mutex<St>> = OnceLock::new();
static APP: OnceLock<AppHandle> = OnceLock::new();
fn st() -> &'static Mutex<St> {
    ST.get_or_init(|| Mutex::new(St { token: String::new(), pending: String::new(), snapshot: String::new(), started: false }))
}

pub fn init(app: AppHandle) {
    let _ = APP.set(app);
}

// IP del PC en la red de casa (no envía nada: solo pregunta al sistema por qué interfaz saldría)
fn local_ip() -> String {
    for target in ["8.8.8.8:80", "192.168.1.1:80", "10.0.0.1:80"] {
        if let Ok(s) = UdpSocket::bind("0.0.0.0:0") {
            if s.connect(target).is_ok() {
                if let Ok(a) = s.local_addr() {
                    let ip = a.ip().to_string();
                    if !ip.starts_with("0.") && ip != "127.0.0.1" { return ip; }
                }
            }
        }
    }
    String::new()
}

fn ensure_server() {
    {
        let mut s = st().lock().unwrap();
        if s.started { return; }
        s.started = true;
    }
    std::thread::spawn(|| {
        let l = match TcpListener::bind(("0.0.0.0", PORT)) { Ok(l) => l, Err(_) => { st().lock().unwrap().started = false; return; } };
        for c in l.incoming().flatten() {
            std::thread::spawn(move || { let _ = handle(c); });
        }
    });
}

fn find(h: &[u8], n: &[u8]) -> Option<usize> { h.windows(n.len()).position(|w| w == n) }

fn handle(mut c: TcpStream) -> std::io::Result<()> {
    c.set_read_timeout(Some(Duration::from_secs(5)))?;
    let mut buf: Vec<u8> = Vec::new();
    let mut tmp = [0u8; 4096];
    loop {
        let n = c.read(&mut tmp)?;
        if n == 0 { break; }
        buf.extend_from_slice(&tmp[..n]);
        if let Some(p) = find(&buf, b"\r\n\r\n") {
            let head = String::from_utf8_lossy(&buf[..p]).to_lowercase();
            let len = head.lines().find_map(|l| l.strip_prefix("content-length:").map(|v| v.trim().parse::<usize>().unwrap_or(0))).unwrap_or(0);
            if buf.len() >= p + 4 + len { break; }
        }
        if buf.len() > 2_000_000 { break; }
    }
    let text = String::from_utf8_lossy(&buf).to_string();
    let head = text.split("\r\n\r\n").next().unwrap_or("");
    let path = head.lines().next().unwrap_or("").split_whitespace().nth(1).unwrap_or("/").to_string();
    let token = head.lines().find_map(|l| {
        let (k, v) = l.split_once(':')?;
        if k.trim().eq_ignore_ascii_case("x-eko-token") { Some(v.trim().to_string()) } else { None }
    }).unwrap_or_default();
    let (code, out) = route(&path, &token);
    let resp = format!("HTTP/1.1 {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}", code, out.len(), out);
    c.write_all(resp.as_bytes())
}

fn route(path: &str, token: &str) -> (&'static str, String) {
    let mut s = st().lock().unwrap();
    match path {
        "/hello" => ("200 OK", r#"{"app":"eko"}"#.into()),
        // El móvil acaba de escanear el QR
        "/pair" => {
            if !s.pending.is_empty() && token == s.pending {
                s.token = s.pending.clone();
                s.pending.clear();
                if let Some(a) = APP.get() { let _ = a.emit("sync-paired", ()); }
                ("200 OK", r#"{"ok":true}"#.into())
            } else { ("403 Forbidden", r#"{"ok":false}"#.into()) }
        }
        // El móvil pide a Eko
        "/state" => {
            if !s.token.is_empty() && token == s.token {
                ("200 OK", if s.snapshot.is_empty() { "{}".into() } else { s.snapshot.clone() })
            } else { ("403 Forbidden", "{}".into()) }
        }
        _ => ("404 Not Found", "{}".into()),
    }
}

// Ajustes → «Conectar con mi móvil»: arranca el servidor y devuelve lo que va en el QR (y el QR dibujado)
#[tauri::command]
pub fn sync_start(token: String, secret: String) -> serde_json::Value {
    ensure_server();
    st().lock().unwrap().pending = token;
    let ip = local_ip();
    let text = format!("eko1:{}:{}:{}", ip, PORT, secret);
    let svg = qrcode::QrCode::new(text.as_bytes())
        .map(|q| q.render::<qrcode::render::svg::Color>().min_dimensions(220, 220).quiet_zone(true).build())
        .unwrap_or_default();
    serde_json::json!({ "ip": ip, "port": PORT, "svg": svg })
}

// Al arrancar, si ya estaba conectado con un móvil
#[tauri::command]
pub fn sync_set_token(token: String) {
    if token.is_empty() { return; }
    ensure_server();
    st().lock().unwrap().token = token;
}

// La página manda el estado de Eko (ya cifrado) cada poco
#[tauri::command]
pub fn sync_snapshot(data: String) {
    st().lock().unwrap().snapshot = data;
}
