//! Habla con Eko usando una IA que funciona en tu propio PC (Ollama, gratis y sin internet).
//! Solo se usa si lo activas en Ajustes. Nada sale de tu ordenador: se habla con 127.0.0.1:11434.
use std::io::{Read, Write};
use std::net::TcpStream;
use std::time::Duration;

fn http(method: &str, path: &str, body: &str, timeout: u64) -> Result<String, String> {
    let mut s = TcpStream::connect_timeout(&"127.0.0.1:11434".parse().unwrap(), Duration::from_secs(2)).map_err(|_| "offline".to_string())?;
    s.set_read_timeout(Some(Duration::from_secs(timeout))).ok();
    s.set_write_timeout(Some(Duration::from_secs(10))).ok();
    let req = format!(
        "{method} {path} HTTP/1.1\r\nHost: 127.0.0.1:11434\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    s.write_all(req.as_bytes()).map_err(|e| e.to_string())?;
    let mut raw = Vec::new();
    s.read_to_end(&mut raw).map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&raw).to_string();
    let Some(i) = text.find("\r\n\r\n") else { return Err("respuesta rara".into()) };
    let (head, rest) = (&text[..i], &text[i + 4..]);
    if !head.starts_with("HTTP/1.1 200") && !head.starts_with("HTTP/1.0 200") {
        return Err(format!("http: {}", head.lines().next().unwrap_or("")));
    }
    if head.to_lowercase().contains("transfer-encoding: chunked") {
        // une los trozos
        let mut out = String::new();
        let mut r = rest;
        while let Some(p) = r.find("\r\n") {
            let n = usize::from_str_radix(r[..p].trim(), 16).unwrap_or(0);
            if n == 0 {
                break;
            }
            let start = p + 2;
            let end = (start + n).min(r.len());
            out.push_str(&r[start..end]);
            r = r.get(end + 2..).unwrap_or("");
        }
        return Ok(out);
    }
    Ok(rest.to_string())
}

/// ¿Está Ollama funcionando? Devuelve la lista de modelos instalados (JSON de /api/tags).
#[tauri::command]
pub async fn ai_status() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| http("GET", "/api/tags", "", 5)).await.map_err(|e| e.to_string())?
}

/// Envía la conversación a Ollama (/api/chat, sin streaming) y devuelve la respuesta tal cual (JSON).
#[tauri::command]
pub async fn ai_chat(body: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || http("POST", "/api/chat", &body, 120)).await.map_err(|e| e.to_string())?
}
