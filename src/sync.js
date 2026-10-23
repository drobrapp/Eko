// Eko · conexión con el móvil (fase 1: conectar con un QR y que el móvil adopte a Eko).
// La clave del QR (32 bytes al azar) solo la conocen este PC y tu móvil. Con ella se cifra el estado (AES-GCM)
// y el móvil se identifica con un token (SHA-256 de la clave), así la clave nunca viaja por la red.
// Todo va por tu Wi-Fi, sin internet. El servidor lo pone Rust (src-tauri/src/sync.rs).
window.EkoSync = (() => {
  "use strict";
  const T = window.__TAURI__;
  if (!T || !T.core) return null;
  const invoke = T.core.invoke;
  const KEY = "eko-sync";            // { k: clave en hex, t: token en hex, at: cuándo se conectó }
  const PENDING = "eko-sync-pending"; // la de un QR que aún no se ha escaneado

  const hex = (b) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
  const unhex = (h) => new Uint8Array(h.match(/../g).map((x) => parseInt(x, 16)));
  const b64 = (b) => { let s = ""; const u = new Uint8Array(b); for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (_) { return null; } };

  async function newPair() {
    const k = crypto.getRandomValues(new Uint8Array(32));
    const t = await crypto.subtle.digest("SHA-256", k);
    const pair = { k: hex(k), t: hex(t) };
    localStorage.setItem(PENDING, JSON.stringify(pair));
    return pair;
  }

  // Todo lo de Eko (lo mismo que la copia de seguridad), cifrado con la clave
  async function snapshot() {
    const s = read(KEY); if (!s) return;
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("eko") && !k.startsWith("eko-sync")) data[k] = localStorage.getItem(k);
    }
    const plain = new TextEncoder().encode(JSON.stringify({ app: "eko", v: 1, at: new Date().toISOString(), from: "pc", data }));
    const key = await crypto.subtle.importKey("raw", unhex(s.k), "AES-GCM", false, ["encrypt"]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
    await invoke("sync_snapshot", { data: JSON.stringify({ iv: b64(iv), ct: b64(ct) }) });
  }

  // Ventana principal: si ya hay un móvil conectado, se mantiene el estado al día para cuando lo pida
  function startLoop() {
    const s = read(KEY); if (!s) return;
    invoke("sync_set_token", { token: s.t }).catch(() => {});
    snapshot().catch(() => {});
    clearInterval(startLoop.id);
    startLoop.id = setInterval(() => snapshot().catch(() => {}), 20000);
  }

  const isMain = !!window.Eko;   // la ventana de Eko (no la de ajustes)

  // ---------- Fase 2: Eko se muda («¡Ven aquí!») ----------
  // "pc" = está aquí; "phone" = se ha ido al móvil (aquí se esconde)
  const WHERE = "eko-where";
  const where = () => (localStorage.getItem(WHERE) === "phone" ? "phone" : "pc");
  function setWhere(w) { localStorage.setItem(WHERE, w); invoke("sync_set_where", { w }).catch(() => {}); }
  const ES = !window.Eko || window.Eko.LANG === "es";
  const pickL = (a) => a[Math.floor(Math.random() * a.length)];

  async function decrypt(body) {
    const s = read(KEY); if (!s) return null;
    const j = JSON.parse(body);
    const bin = (x) => Uint8Array.from(atob(x), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("raw", unhex(s.k), "AES-GCM", false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bin(j.iv) }, key, bin(j.ct));
    return JSON.parse(new TextDecoder().decode(plain));
  }
  // Lo que trae del móvil: sus necesidades (el último que las tocó manda)
  function mergeFromPhone(p) {
    const n = p && p.needs, N = window.EkoNeeds;
    if (!n || !N) return;
    for (const k of ["hunger", "fun", "love", "energy"]) if (typeof n[k] === "number") N.set(k, Math.max(0, Math.min(100, n[k])));
    N.set("t", Date.now());
  }
  function leave() {
    const E = window.Eko; if (!E || where() === "phone") { setWhere("phone"); return; }
    setWhere("phone");
    E.express && E.express("emocionado", 2.5);
    E.act && E.act("wave");
    E.say && E.say(pickL(ES ? ["¡Me voy contigo al móvil!", "¡Hasta luego, PC! Me voy al bolsillo", "¡Allá voy! Nos vemos en el móvil"] : ["Off to your phone!", "See you on the phone!"]), 2600, true);
    setTimeout(() => { E.setHidden && E.setHidden(true); snapshot().catch(() => {}); }, 2400);
  }
  function arrive(line) {
    const E = window.Eko;
    setWhere("pc");
    if (!E) return;
    E.setHidden && E.setHidden(false);
    setTimeout(() => {
      E.act && E.act("tada");
      E.express && E.express("emocionado", 2.5);
      E.say && E.say(line || pickL(ES ? ["¡Ya he vuelto!", "¡Hola otra vez! Ya estoy en el PC", "¡Mudanza al PC completada!"] : ["I'm back!", "Hello again!"]), 2800, true);
    }, 500);
    snapshot().catch(() => {});
  }
  T.event.listen("sync-paired", () => {
    const p = read(PENDING);
    if (p) { localStorage.setItem(KEY, JSON.stringify({ ...p, at: new Date().toISOString() })); localStorage.removeItem(PENDING); }
    if (!isMain) return;
    startLoop();
    const E = window.Eko;
    setTimeout(() => {
      E.express && E.express("emocionado", 3);
      E.act && E.act("tada");
      E.say && E.say(E.LANG === "es" ? "¡Ya estamos conectados! Ahora también vivo en tu móvil" : "We're connected! Now I live on your phone too", 3800, true);
    }, 400);
  });
  if (isMain) setTimeout(() => {
    startLoop();
    if (!read(KEY)) return;
    invoke("sync_set_where", { w: where() }).catch(() => {});
    if (where() === "phone" && window.Eko && window.Eko.setHidden) window.Eko.setHidden(true);
  }, 3000);
  if (isMain) {
    // El móvil le ha llamado: se despide aquí
    T.event.listen("sync-leave", () => leave());
    // El móvil lo devuelve (o cuenta cómo está): se juntan sus necesidades y, si estaba fuera, vuelve
    T.event.listen("sync-arrive", async (e) => {
      try { const p = await decrypt(e.payload); mergeFromPhone(p); } catch (_) {}
      if (where() === "phone") arrive();
    });
    // Bandeja → «¡Ven aquí!»: vuelve al PC (el móvil se entera la próxima vez que pregunte)
    T.event.listen("cmd", (e) => { if (e.payload === "sync-come" && read(KEY) && where() === "phone") arrive(); });
    // Seguridad: si el móvil lleva 10 minutos sin dar señales, Eko vuelve solo (nunca te quedas sin él)
    setInterval(async () => {
      if (!read(KEY) || where() !== "phone") return;
      try {
        const st = await invoke("sync_status");
        if (st.seen < 0 || st.seen > 600) arrive(ES ? "¡He vuelto! Tu móvil no daba señales" : "I'm back! Your phone went quiet");
      } catch (_) {}
    }, 60000);
  }

  // ---------- Ventana de ajustes: botón «Conectar con mi móvil» y el QR ----------
  function wireSettings() {
    const btn = document.getElementById("syncPair"); if (!btn) return;
    const state = document.getElementById("syncState"), box = document.getElementById("syncBox"), qr = document.getElementById("syncQr");
    const showPaired = () => { const s = read(KEY); if (s) { state.textContent = "Conectado con tu móvil ✓ · desde el " + new Date(s.at).toLocaleDateString(); btn.textContent = "Volver a conectar"; } };
    showPaired();
    btn.addEventListener("click", async () => {
      state.textContent = "Preparando el código…";
      try {
        const r = await invoke("sync_start", await newPair().then((p) => ({ token: p.t, secret: p.k })));
        if (!r.ip) { state.textContent = "No encuentro tu Wi-Fi. ¿Está conectado el PC a la red de casa?"; return; }
        qr.innerHTML = r.svg; box.hidden = false;
        state.textContent = "Escanéalo con el móvil. Si Windows pregunta si Eko puede usar la red, dile que sí (redes privadas).";
      } catch (e) { state.textContent = "No he podido preparar el código: " + e; }
    });
    T.event.listen("sync-paired", () => { box.hidden = true; setTimeout(showPaired, 300); });
  }
  if (!isMain) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wireSettings); else wireSettings(); }

  return {
    paired: () => !!read(KEY),
    // Ajustes: prepara un QR nuevo y devuelve { ip, port, svg }
    async pair() { const p = await newPair(); return invoke("sync_start", { token: p.t, secret: p.k }); },
    forget() { localStorage.removeItem(KEY); localStorage.removeItem(PENDING); },
  };
})();
