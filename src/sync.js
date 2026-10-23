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
    const plain = new TextEncoder().encode(JSON.stringify({ app: "eko", v: 1, at: new Date().toISOString(), from: "pc", data,
      extra: { level: window.EkoProgress && EkoProgress.level ? EkoProgress.level() : null } }));
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
  let calling = false, callT = 0;   // el PC lo ha llamado y espera a que el móvil lo suelte
  // Cuando Eko está en el móvil no puede quedar rastro en el PC: se esconde su ventana entera y las auxiliares
  // (pelota, juegos, rincón, chat), así no quedan bocadillos, objetos ni reacciones a la vista.
  function goneFromPc() {
    const E = window.Eko;
    E && E.setHidden && E.setHidden(true);
    for (const c of ["ball_hide", "catch_hide", "corner_hide", "chatbar_hide", "world_hide", "wrapped_hide"]) invoke(c).catch(() => {});
    invoke("set_main_visible", { on: false }).catch(() => {});
  }
  function backToPc() { invoke("set_main_visible", { on: true }).catch(() => {}); }
  const startedAt = Date.now();
  let lastMove = 0;

  async function decrypt(body) {
    const s = read(KEY); if (!s) return null;
    const j = JSON.parse(body);
    const bin = (x) => Uint8Array.from(atob(x), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("raw", unhex(s.k), "AES-GCM", false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bin(j.iv) }, key, bin(j.ct));
    return JSON.parse(new TextDecoder().decode(plain));
  }
  // Lo que trae del móvil: sus necesidades (el último que las tocó manda), los recordatorios que ya te dio allí
  // y lo que ha pasado (pasos, fotos…) para comentarlo al llegar
  let recap = null;
  function mergeFromPhone(p) {
    const n = p && p.needs, N = window.EkoNeeds;
    if (n && N) {
      for (const k of ["hunger", "fun", "love", "energy"]) if (typeof n[k] === "number") N.set(k, Math.max(0, Math.min(100, n[k])));
      N.set("t", Date.now());
    }
    if (p && Array.isArray(p.done) && p.done.length) {
      try {
        const list = JSON.parse(localStorage.getItem("eko-reminders") || "[]").filter((r) => !p.done.includes(r.at));
        localStorage.setItem("eko-reminders", JSON.stringify(list));
      } catch (_) {}
    }
    if (p && p.recap) recap = p.recap;
  }
  // Una frase sobre lo que ha pasado en el móvil (si hay algo que contar)
  function recapLine(r) {
    if (!r || !ES) return null;
    const n = (x) => Number(x).toLocaleString("es-ES");
    const opts = [];
    if (r.photos > 0) opts.push(r.photos === 1 ? "¡En el móvil me diste una foto para mi álbum!" : `¡En el móvil me diste ${r.photos} fotos para mi álbum!`);
    if (r.steps >= 3000) opts.push(r.goal && r.steps >= r.goal ? `¡Hoy hemos andado ${n(r.steps)} pasos! Meta cumplida` : `Hoy llevamos ${n(r.steps)} pasos juntos`);
    if (r.finds && r.finds.length) opts.push(`Por el camino encontré ${r.finds.slice(0, 2).join(" y ")}`);
    if (r.streak >= 2) opts.push(`¡Llevamos ${r.streak} días seguidos cumpliendo la meta de pasos!`);
    if (r.diary) opts.push("Gracias por contarme tu día en el diario");
    return opts.length ? pickL(opts) : null;
  }
  // ¿Está Eko en el móvil? (entonces los recordatorios los da el móvil, no el PC)
  const isAway = () => !!read(KEY) && where() === "phone";
  function leave() {
    lastMove = Date.now();
    const E = window.Eko; if (!E || where() === "phone") { setWhere("phone"); return; }
    setWhere("phone");
    E.express && E.express("emocionado", 2.5);
    E.say && E.say(pickL(ES ? ["¡Me voy contigo al móvil!", "¡Hasta luego, PC! Me voy al bolsillo", "¡Allá voy! Nos vemos en el móvil"] : ["Off to your phone!", "See you on the phone!"]), 2400, true);
    // Magia: saca la varita, conjuro y ¡puf! entre nubecitas (en el móvil aparece con la varita en la mano)
    if (window.EkoTricks && window.EkoTricks.tele) window.EkoTricks.tele("out");
    // Cuando ya se ha esfumado (≈ 2,1 s), se manda su estado al día y se avisa: solo entonces aparece en el móvil
    setTimeout(async () => {
      goneFromPc();
      try { await snapshot(); } catch (_) {}
      invoke("sync_left").catch(() => {});
    }, 2150);
  }
  function arrive(line) {
    const E = window.Eko;
    calling = false; clearTimeout(callT);
    setWhere("pc");
    if (!E) return;
    backToPc();
    // Aparece entre nubecitas con la varita aún en alto y se la guarda
    if (window.EkoTricks && window.EkoTricks.tele) setTimeout(() => window.EkoTricks.tele("in"), 120);
    else E.setHidden && E.setHidden(false);
    setTimeout(() => {
      E.express && E.express("emocionado", 2.5);
      E.say && E.say(line || pickL(ES ? ["¡Ya he vuelto!", "¡Hola otra vez! Ya estoy en el PC", "¡Mudanza al PC completada!"] : ["I'm back!", "Hello again!"]), 2800, true);
      // y lo que ha pasado en el móvil, como si lo hubiera vivido contigo
      const r = recapLine(recap); recap = null;
      if (r) setTimeout(() => E.say && E.say(r, 3400, true), 3200);
    }, 1300);
    lastMove = Date.now();
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
  // Al arrancar: si Eko está en el móvil, desaparece desde el primer momento (nada de verse dos)
  if (isMain && read(KEY) && where() === "phone") { goneFromPc(); setTimeout(goneFromPc, 1200); setTimeout(goneFromPc, 3500); }
  if (isMain) setTimeout(() => {
    startLoop();
    if (!read(KEY)) return;
    invoke("sync_set_where", { w: where() }).catch(() => {});
    if (where() === "phone") goneFromPc();
  }, 3000);
  if (isMain) {
    // ---------- Fase 3: Eko te sigue ----------
    // Cada 3 s: se dice al servidor cuánto llevas sin tocar el PC (el móvil se lleva a Eko si lo usas y el PC lleva un rato quieto)
    // y, si Eko está en el móvil y vuelves al PC mientras el móvil está apagado o guardado, se le llama.
    const follow = () => { try { const s = JSON.parse(localStorage.getItem("eko-settings") || "{}"); return s.followPhone !== false; } catch (_) { return true; } };
    setInterval(async () => {
      if (!read(KEY)) return;
      const idle = window.Eko && window.Eko.lastSenses ? Math.round(window.Eko.lastSenses.idle || 0) : 0;
      invoke("sync_idle", { secs: idle }).catch(() => {});
      if (!follow() || where() !== "phone" || calling || Date.now() - lastMove < 60000 || idle > 3) return;
      try {
        const st = await invoke("sync_status");
        // móvil sin pantalla encendida desde hace 20 s (no pregunta) y tú en el PC: Eko vuelve contigo
        if (st.seen < 0 || st.seen > 20) startCall();
      } catch (_) {}
    }, 3000);
  }
  // El PC llama a Eko (bandeja o al volver al PC): no aparece hasta que el móvil lo suelte, o en 10 s si el móvil no contesta
  function startCall() {
    if (!read(KEY) || where() !== "phone" || calling) return;
    calling = true;
    invoke("sync_set_where", { w: "calling" }).catch(() => {});
    clearTimeout(callT);
    callT = setTimeout(() => { if (calling) arrive(); }, 10000);
  }
  if (isMain) {
    // El móvil le ha llamado: se despide aquí
    T.event.listen("sync-leave", () => leave());
    // El móvil lo devuelve (o cuenta cómo está): se juntan sus necesidades y, si estaba fuera, vuelve
    T.event.listen("sync-arrive", async (e) => {
      try { const p = await decrypt(e.payload); mergeFromPhone(p); } catch (_) {}
      if (where() === "phone") arrive();
    });
    // Bandeja → «¡Ven aquí!»: el PC lo llama, pero no aparece hasta que el móvil lo haya soltado (hace su magia y avisa).
    // Si el móvil no contesta en 10 s (pantalla apagada, fuera de casa…), vuelve igualmente.
    T.event.listen("cmd", (e) => { if (e.payload === "sync-come") startCall(); });
    // Seguridad: si el móvil lleva 10 minutos sin dar señales (fuera de casa, apagado…) Y estás usando el PC,
    // Eko vuelve al PC. Con el móvil bloqueado en casa y tú sin tocar el PC, se queda donde estaba.
    setInterval(async () => {
      if (!read(KEY) || where() !== "phone" || calling) return;
      const idle = window.Eko && window.Eko.lastSenses ? window.Eko.lastSenses.idle : 9999;
      if (idle > 30) return;                               // no estás en el PC: no hay prisa
      try {
        const st = await invoke("sync_status");
        const silent = st.seen < 0 ? (Date.now() - startedAt) / 1000 : st.seen;
        if (silent > 600) arrive(ES ? "¡He vuelto! Tu móvil no daba señales" : "I'm back! Your phone went quiet");
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
    isAway,
    // Ajustes: prepara un QR nuevo y devuelve { ip, port, svg }
    async pair() { const p = await newPair(); return invoke("sync_start", { token: p.t, secret: p.k }); },
    forget() { localStorage.removeItem(KEY); localStorage.removeItem(PENDING); },
  };
})();
