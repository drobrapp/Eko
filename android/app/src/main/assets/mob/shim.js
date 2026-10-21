// Eko en el móvil · hace de «Tauri» para que el código del Eko de escritorio (src/) funcione tal cual dentro de Android.
// La ventana de Eko (420×380) es virtual: Android solo enseña el trocito donde está Eko, para no tapar las demás apps.
(() => {
  "use strict";
  const A = window.Android;
  if (!A) return;
  const kind = A.kind();
  const ok = (v) => Promise.resolve(v);

  // ---------- Órdenes (invoke) ----------
  let seq = 0;
  const pend = {};
  window.__ekoRes = (id, good, json) => {
    const p = pend[id]; if (!p) return;
    delete pend[id];
    let v = null; try { v = json ? JSON.parse(json) : null; } catch (_) {}
    good ? p.res(v) : p.rej(v);
  };
  let hb = null, full = false;
  function invoke(cmd, args) {
    args = args || {};
    if (cmd === "set_hitbox") { hb = args; full = args.w >= 419 && args.h >= 379; return ok(null); }
    if (cmd === "set_dragging") { dragging = !!args.value; return ok(null); }
    return new Promise((res, rej) => { const id = ++seq; pend[id] = { res, rej }; A.invoke(id, cmd, JSON.stringify(args)); });
  }

  // ---------- Eventos entre ventanas ----------
  const L = {};
  window.__ekoBus = (name, json) => {
    let p = null; try { p = JSON.parse(json); } catch (_) {}
    (L[name] || []).slice().forEach((f) => { try { f({ event: name, payload: p }); } catch (e) { console.error(e); } });
  };
  const listen = (name, cb) => { (L[name] || (L[name] = [])).push(cb); return ok(() => { L[name] = (L[name] || []).filter((f) => f !== cb); }); };
  const once = (name, cb) => { const f = (e) => { L[name] = (L[name] || []).filter((x) => x !== f); cb(e); }; return listen(name, f); };
  const emit = (name, payload) => { A.emit(name, JSON.stringify(payload === undefined ? null : payload)); return ok(); };

  // ---------- Ventana ----------
  const pos = { x: 0, y: 0 };
  let dragging = false;
  const base = {
    setPosition(p) { pos.x = p.x; pos.y = p.y; A.pos(p.x, p.y); return ok(); },
    show() { A.show(true); return ok(); },
    hide() { A.show(false); return ok(); },
    setFocus() { A.focus(true); return ok(); },
    close() { A.close(); return ok(); },
    isVisible() { return ok(true); },
    listen, once, emit,
  };
  const win = new Proxy(base, { get: (t, k) => (k in t ? t[k] : () => ok()) });
  class P { constructor(x, y) { this.x = x; this.y = y; this.width = x; this.height = y; } }
  window.__TAURI__ = {
    core: { invoke },
    event: { listen, once, emit },
    window: { getCurrentWindow: () => win },
    webviewWindow: { getCurrentWebviewWindow: () => win },
    dpi: { LogicalPosition: P, PhysicalPosition: P, LogicalSize: P, PhysicalSize: P },
    app: { getVersion: () => ok(A.version()) },
  };
  window.EKO_MOBILE = true;

  if (kind !== "overlay") return;

  // ---------- Pantalla del móvil (en dp, que aquí son los px de la página) ----------
  let sc = null, scAt = 0;
  const S = () => { const n = Date.now(); if (!sc || n - scAt > 2000) { try { sc = JSON.parse(A.screen()); } catch (_) { sc = { w: 400, h: 800, top: 0, bottom: 0 }; } scAt = n; } return sc; };
  const def = (k, f) => { try { Object.defineProperty(screen, k, { get: f, configurable: true }); } catch (_) {} };
  def("availLeft", () => 0);
  def("availTop", () => S().top);
  def("availWidth", () => S().w);
  def("availHeight", () => S().h - S().top - S().bottom);
  def("width", () => S().w);
  def("height", () => S().h);

  // Coordenadas de pantalla del dedo (la ventana se mueve con Eko, así que se las pregunta a Android)
  const rawOf = (e) => {
    if (e.__r) return e.__r;
    let r = null;
    if (e.pointerType === "touch" || e.pointerType === "pen") { try { r = JSON.parse(A.raw()); } catch (_) {} }
    if (!r) r = { x: e.clientX + pos.x, y: e.clientY + pos.y };
    try { Object.defineProperty(e, "__r", { value: r }); } catch (_) {}
    return r;
  };
  Object.defineProperty(MouseEvent.prototype, "screenX", { get() { return rawOf(this).x; }, configurable: true });
  Object.defineProperty(MouseEvent.prototype, "screenY", { get() { return rawOf(this).y; }, configurable: true });

  // Mantener pulsado = botón derecho (su menú). Se ignora el del navegador para que no se abra dos veces.
  let lpT = 0, lpX = 0, lpY = 0;
  const cancelLp = () => { clearTimeout(lpT); lpT = 0; };
  addEventListener("contextmenu", (e) => { if (e.isTrusted) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  addEventListener("pointerdown", (e) => {
    cancelLp();
    if (e.pointerType !== "touch") return;
    const t = e.target, cx = e.clientX, cy = e.clientY;
    lpX = e.screenX; lpY = e.screenY;
    lpT = setTimeout(() => {
      lpT = 0;
      if (dragging || (window.Eko && window.Eko.S.dragging)) return;
      try { A.vibrate(); } catch (_) {}
      t.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 2 }));
    }, 550);
  }, true);
  addEventListener("pointermove", (e) => { if (lpT && Math.hypot(e.screenX - lpX, e.screenY - lpY) > 12) cancelLp(); }, true);
  addEventListener("pointerup", cancelLp, true);
  addEventListener("pointercancel", cancelLp, true);

  // ---------- Trozo visible de la ventana: Eko + bocadillos (o todo, con el menú abierto) ----------
  const VW = 420, VH = 380;
  const SEL = ["#bubble", "#thought", "#wish", "#zz", "#sweat", "#badge", "#boxes > *"];
  let cur = null, shrinkAt = 0;
  const shown = (el) => {
    if (!el.isConnected) return false;
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && parseFloat(cs.opacity) > 0.04;
  };
  function need() {
    if (full) return [0, 0, VW, VH];
    let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
    const add = (x0, y0, x1, y1) => { if (x1 - x0 < 1 || y1 - y0 < 1) return; l = Math.min(l, x0); t = Math.min(t, y0); r = Math.max(r, x1); b = Math.max(b, y1); };
    if (hb) add(hb.x - 34, hb.y - 64, hb.x + hb.w + 34, hb.y + hb.h + 10);
    else add(150, 220, 270, 380);
    for (const s of SEL) for (const el of document.querySelectorAll(s)) {
      if (!shown(el)) continue;
      const R = el.getBoundingClientRect();
      add(R.left - 6, R.top - 6, R.right + 6, R.bottom + 6);
    }
    l = Math.max(0, Math.floor(l)); t = Math.max(0, Math.floor(t)); r = Math.min(VW, Math.ceil(r)); b = Math.min(VH, Math.ceil(b));
    return [l, t, Math.max(1, r - l), Math.max(1, b - t)];
  }
  function clipTick() {
    const n = need(), now = performance.now();
    const inside = cur && n[0] >= cur[0] && n[1] >= cur[1] && n[0] + n[2] <= cur[0] + cur[2] && n[1] + n[3] <= cur[1] + cur[3];
    if (!inside) {
      if (cur) { const l = Math.min(n[0], cur[0]), t = Math.min(n[1], cur[1]); cur = [l, t, Math.max(n[0] + n[2], cur[0] + cur[2]) - l, Math.max(n[1] + n[3], cur[1] + cur[3]) - t]; }
      else cur = n;
      shrinkAt = now + 1500;
      A.clip(cur[0], cur[1], cur[2], cur[3]);
    } else if (n[2] * n[3] < cur[2] * cur[3] * 0.8) {
      if (now > shrinkAt && !dragging) { cur = n; A.clip(cur[0], cur[1], cur[2], cur[3]); }
    } else shrinkAt = now + 1500;
  }
  setInterval(clipTick, 100);
  addEventListener("load", clipTick);

  // Para escribir (chat, nombre…) la ventana necesita el teclado; al cerrar el menú se suelta
  addEventListener("focusout", () => setTimeout(() => { const a = document.activeElement; if (!a || a === document.body) A.focus(false); }, 200));
})();
