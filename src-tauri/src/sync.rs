// Eko en el móvil: el PC hace de «casa base» en tu Wi-Fi.
// Un servidor HTTP mínimo, solo para la red de casa. El móvil se conecta una vez escaneando un QR
// (ip, puerto y una clave secreta) y después pregunta dónde está Eko, se lo lleva o lo devuelve.
// El estado viaja cifrado (AES-GCM): lo cifran y descifran las páginas con la clave del QR; aquí solo se guarda y se pasa.
// El móvil se identifica con un «token» (SHA-256 de la clave), así la clave nunca viaja por la red.
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream, UdpSocket};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

pub const PORT: u16 = 47913;

struct St {
    token: String,     // token del móvil ya conectado
    pending: String,   // token esperando a que el móvil escanee el QR
    snapshot: String,  // estado de Eko, ya cifrado por la página
    where_: String,    // dónde está Eko: "pc", "phone" o "calling" (el PC lo ha llamado y espera a que el móvil lo suelte)
    left: bool,        // la página avisa cuando Eko ya ha desaparecido del PC (para que el móvil no lo enseñe antes)
    pc_idle: u64,      // segundos sin tocar el PC (para que Eko te siga al móvil cuando dejas el PC)
    seen: Option<Instant>, // última vez que el móvil dio señales
    started: bool,
}
static ST: OnceLock<Mutex<St>> = OnceLock::new();
static APP: OnceLock<AppHandle> = OnceLock::new();
fn st() -> &'static Mutex<St> {
    ST.get_or_init(|| Mutex::new(St { token: String::new(), pending: String::new(), snapshot: String::new(), where_: "pc".into(), left: false, pc_idle: 0, seen: None, started: false }))
}

pub fn init(app: AppHandle) {
    let _ = APP.set(app);
}
fn emit<S: serde::Serialize + Clone>(ev: &str, payload: S) {
    if let Some(a) = APP.get() { let _ = a.emit(ev, payload); }
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
    let mut tmp = [0u8; 8192];
    let mut body_at = 0usize;
    let mut len = 0usize;
    loop {
        let n = c.read(&mut tmp)?;
        if n == 0 { break; }
        buf.extend_from_slice(&tmp[..n]);
        if body_at == 0 {
            if let Some(p) = find(&buf, b"\r\n\r\n") {
                body_at = p + 4;
                let head = String::from_utf8_lossy(&buf[..p]).to_lowercase();
                len = head.lines().find_map(|l| l.strip_prefix("content-length:").map(|v| v.trim().parse::<usize>().unwrap_or(0))).unwrap_or(0);
            }
        }
        if body_at > 0 && buf.len() >= body_at + len { break; }
        if buf.len() > 4_000_000 { break; }
    }
    let head = String::from_utf8_lossy(&buf[..body_at.saturating_sub(4).min(buf.len())]).to_string();
    let body = if body_at > 0 && buf.len() >= body_at { String::from_utf8_lossy(&buf[body_at..]).to_string() } else { String::new() };
    let path = head.lines().next().unwrap_or("").split_whitespace().nth(1).unwrap_or("/").to_string();
    let token = head.lines().find_map(|l| {
        let (k, v) = l.split_once(':')?;
        if k.trim().eq_ignore_ascii_case("x-eko-token") { Some(v.trim().to_string()) } else { None }
    }).unwrap_or_default();
    let (code, out) = route(&path, &token, body);
    let resp = format!("HTTP/1.1 {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}", code, out.len(), out);
    c.write_all(resp.as_bytes())
}

fn route(path: &str, token: &str, body: String) -> (&'static str, String) {
    let mut s = st().lock().unwrap();
    if path == "/hello" { return ("200 OK", r#"{"app":"eko"}"#.into()); }
    // El móvil acaba de escanear el QR
    if path == "/pair" {
        if !s.pending.is_empty() && token == s.pending {
            s.token = s.pending.clone();
            s.pending.clear();
            s.seen = Some(Instant::now());
            drop(s);
            emit("sync-paired", ());
            return ("200 OK", r#"{"ok":true}"#.into());
        }
        return ("403 Forbidden", r#"{"ok":false}"#.into());
    }
    if s.token.is_empty() || token != s.token { return ("403 Forbidden", "{}".into()); }
    s.seen = Some(Instant::now());
    match path {
        // ¿Dónde está Eko? («calling» = el PC lo quiere de vuelta: para el móvil es como si ya estuviera en el PC)
        "/where" => ("200 OK", format!(r#"{{"where":"{}","pcIdle":{}}}"#, if s.where_ == "phone" { "phone" } else { "pc" }, s.pc_idle)),
        // El estado de Eko (cifrado)
        "/state" => ("200 OK", if s.snapshot.is_empty() { "{}".into() } else { s.snapshot.clone() }),
        // El móvil le llama («¡Ven aquí!»): Eko hace la magia en el PC y, SOLO cuando ya ha desaparecido,
        // se responde al móvil con su estado (así nunca está en los dos a la vez)
        "/come" => {
            let was_here = s.where_ != "phone";
            s.where_ = "phone".into();
            s.left = false;
            drop(s);
            if was_here {
                emit("sync-leave", ());
                for _ in 0..50 {                         // hasta 5 s esperando a que se esfume
                    std::thread::sleep(Duration::from_millis(100));
                    if st().lock().unwrap().left { break; }
                }
            }
            let s = st().lock().unwrap();
            ("200 OK", if s.snapshot.is_empty() { "{}".to_string() } else { s.snapshot.clone() })
        }
        // El móvil devuelve a Eko (o le cuenta cómo está): la página lo descifra y decide
        "/give" => {
            drop(s);
            emit("sync-arrive", body);
            ("200 OK", r#"{"ok":true}"#.into())
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

// Dónde está Eko (la página lo guarda y lo dice al arrancar y cuando cambia)
#[tauri::command]
pub fn sync_set_where(w: String) {
    st().lock().unwrap().where_ = match w.as_str() { "phone" => "phone".into(), "calling" => "calling".into(), _ => "pc".into() };
}

// La página avisa: Eko ya ha desaparecido del PC (el móvil puede hacerlo aparecer)
#[tauri::command]
pub fn sync_left() {
    st().lock().unwrap().left = true;
}

// La página dice cuánto llevas sin tocar el PC (el móvil lo usa para decidir si Eko se va contigo)
#[tauri::command]
pub fn sync_idle(secs: u64) {
    st().lock().unwrap().pc_idle = secs;
}

// Para la página: dónde está y hace cuántos segundos dio señales el móvil (-1 = nunca desde que arrancó)
#[tauri::command]
pub fn sync_status() -> serde_json::Value {
    let s = st().lock().unwrap();
    let seen = s.seen.map(|t| t.elapsed().as_secs() as i64).unwrap_or(-1);
    serde_json::json!({ "where": s.where_, "seen": seen })
}
