// Eko en el móvil · cuerpo y animaciones. Copia adaptada del motor del Eko de escritorio (src/main.js y src/tricks.js):
// mismas poses, muelles, parpadeo, caras y gestos. Aquí NO se mueve la ventana: eso lo hace Android (EkoService.kt),
// que avisa del estado (andar, quieto, dormir, cogido, en el aire) y de la velocidad; esta página solo dibuja a Eko.
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const stage = $("#eko"), fxLayer = $("#fx");
  const el = {
    pet: $("#pet"), upper: $("#upper"), head: $("#head"), body: $("#body"), eyes: $("#eyes"), legs: $("#legs"),
    legL: $("#legL"), legR: $("#legR"), armL: $("#armL"), armR: $("#armR"), shadow: $("#shadow"), hl: $("#hl"),
    mouth: $("#mouth"), bridge: $("#bridge"), hat: $("#hat"), bodyHl: $("#bodyHl"), accBack: $("#accBack"), accBody: $("#accBody"),
    accFace: $("#accFace"), snack: $("#snack"), mouthShapes: $("#mouthShapes"), propFront: $("#propFront"), propHand: $("#propHand"), antic: $("#antic"),
    props: [...document.querySelectorAll("[data-prop]")].reduce((o, e) => ((o[e.dataset.prop] = o[e.dataset.prop] || []).push(e), o), {}), flash: document.querySelector("[data-prop=camera] .flash"),
    cape: $("#cape"), capeShape: $("#capeShape"), capeStrips: [...document.querySelectorAll("#capeStrips path")], capeFold: $("#capeFold"), capeEdge: $("#capeEdge"),
    tipHats: [...document.querySelectorAll(".tipflip")], opens: [...document.querySelectorAll(".eye .open")], eyeEls: [...document.querySelectorAll(".eye")],
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const env = (k, edge = 0.18) => clamp(Math.min(k / edge, (1 - k) / edge), 0, 1);
  const sm = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const ease = (k) => k * k * (3 - 2 * k);
  const back = (k) => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  const once = (o, key, f) => { if (!o["_" + key]) { o["_" + key] = 1; f(); } };
  const AND = window.Android || null;

  // ---------- Objetos de un rato (como en el PC): taza, auriculares, gorro de dormir, palomitas, cámara, libro, pincel, pajarita ----------
  // wear: se lleva puesto (cabeza, cara, cuello) · hand: en la mano derecha · two: con las dos manos delante
  const PROP_DEF = {
    headphones: { wear: "head" }, nightcap: { wear: "head" }, readglasses: { wear: "face" },
    mug: { hand: true }, camera: { two: true }, brush: { hand: true }, umbrella: { hand: true, walk: true },
    popcorn: { two: true }, book: { two: true, glasses: true }, bowtie: { wear: "neck" },
  };
  const PROP = { cur: null, until: 0, t0: 0, cd: {}, shown: null, extra: null, extraUntil: 0, camUp: 0 };
  const tallHat = () => stage.classList.contains("has-hat");
  const ghost = () => stage.classList.contains("acc-ghost");
  function useProp(name, secs = 120, cooldownMin = 20) {
    const d = PROP_DEF[name];
    if (!d || (S.sleeping && name !== "nightcap") || ghost()) return false;
    if (PROP.cur === name && A.t < PROP.until) { PROP.until = Math.max(PROP.until, A.t + secs); return true; }
    if (PROP.extra === name && A.t < PROP.extraUntil) { PROP.extraUntil = Math.max(PROP.extraUntil, A.t + secs); return true; }
    if ((PROP.cd[name] || 0) > A.t && PROP.cur !== name) return false;
    if (d.wear === "head" && tallHat()) return false;
    if (PROP.cur && PROP.cur !== name && PROP.until - A.t > 10) {
      // ya lleva algo: una cosa de vestir puede ir a la vez que otra de mano
      if (PROP_DEF[PROP.cur].wear || d.wear) { PROP.extra = name; PROP.extraUntil = A.t + secs; PROP.cd[name] = A.t + secs + cooldownMin * 60; return true; }
      return false;
    }
    PROP.cur = name; PROP.t0 = A.t; PROP.until = A.t + secs; PROP.cd[name] = A.t + secs + cooldownMin * 60;
    return true;
  }
  function dropProp(name) { if (!name || PROP.cur === name) PROP.until = 0; if (!name || PROP.extra === name) PROP.extraUntil = 0; }
  // Lo que se ve ahora (las cosas de la mano se guardan al andar, volar, si lo coges o durante un gesto)
  function propsVisible() {
    const out = new Set();
    for (const [n, until] of [[PROP.cur, PROP.until], [PROP.extra, PROP.extraUntil]]) {
      if (!n || A.t > until) continue;
      const d = PROP_DEF[n];
      const handsBusy = S.dragging || FLY || S.airborne || (A.action && !["nod", "lookAround", "think", "wink", "yawn"].includes(A.action.name));
      if ((d.hand || d.two) && (handsBusy || (S.walking && !d.walk) || S.sleeping)) continue;
      if (d.wear === "head" && tallHat()) continue;
      out.add(n);
      if (d.glasses) out.add("readglasses");
    }
    if (PROP.cur && A.t > PROP.until) PROP.cur = null;
    if (PROP.extra && A.t > PROP.extraUntil) PROP.extra = null;
    return out;
  }
  function propPose(P, vis) {
    const t = A.t;
    const toHand = (e) => { P.hturn += (-0.37 - A.turn - P.turn) * e; P.eyeX = -3 * e; };
    if (vis.has("popcorn")) {
      P.aL = -26; P.aR = 34; P.front = true;
      const k = (t % 4.6) / 4.6;
      if (k > 0.5 && k <= 0.66) P.aR = lerp(34, 56, Math.sin((k - 0.5) / 0.16 * Math.PI / 2));
      else if (k > 0.66 && k <= 0.86) { const e = Math.sin((k - 0.66) / 0.2 * Math.PI / 2); P.aR = lerp(56, 118, e); P.mouth = Math.max(P.mouth, 0.45 * e); toHand(e); }
      else if (k > 0.86) { const e = 1 - (k - 0.86) / 0.14; P.aR = lerp(34, 118, e); toHand(e); if (!P.eyes) P.eyes = "happy"; }
    }
    if (vis.has("book")) { P.aL = -24; P.aR = 24; P.front = true; P.nod += 4; P.eyeY = 3; P.eyeX = Math.sin(t * 0.9) * 3; }
    if (vis.has("mug")) {
      const k = (t % 6) / 6; P.aR = 62; P.front = true;
      if (k > 0.72) { const e = Math.sin((k - 0.72) / 0.28 * Math.PI); P.aR = lerp(62, 114, e); toHand(e); if (e > 0.5 && !P.eyes) P.eyes = "closed"; }
    }
    if (vis.has("camera")) {
      const u = PROP.camUp || 0;
      P.aR = lerp(36, 162, u); P.aL = lerp(-36, -150, u); P.front = true;
      if (u > 0.6) { P.eyeX = -2; if (!P.eyes) P.eyes = "wink"; }
    }
    if (vis.has("brush")) { const k = (t % 7) / 7; P.aR = -38; P.front = true; if (k > 0.86) P.aR += Math.sin((k - 0.86) / 0.14 * Math.PI) * -18; }
    if (vis.has("umbrella")) { P.aR = -132; P.front = true; }
    if (vis.has("headphones")) { P.nod += Math.sin(t * 7.5) * 2.2; P.tilt += Math.sin(t * 3.75) * 3; }
    if (vis.has("nightcap") && !S.sleeping && Math.sin(t * 0.4) > 0.97) P.mouth = Math.max(P.mouth, 0.5);
  }
  function renderProps(vis) {
    const key = [...vis].sort().join(",");
    if (key === PROP.shown) return;
    PROP.shown = key;
    for (const [n, list] of Object.entries(el.props || {})) for (const e of list) {
      const on = vis.has(n);
      if (on && e.style.display !== "inline") { e.style.display = "inline"; e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260 }); fx("spark", 1); }
      if (!on) e.style.display = "none";
    }
    stage.classList.toggle("has-readglasses", vis.has("readglasses"));
  }
  // De vez en cuando se pone pajarita porque sí (≈ una vez cada pocas horas)
  setInterval(() => {
    if (Math.random() > 1 / 150 || S.sleeping || PROP.cur || ghost()) return;
    if (useProp("bowtie", rnd(900, 1800), 240)) { express("orgulloso", 2.5); setTimeout(() => say(["¿A que voy elegante?", "Hoy me he arreglado", "Pajarita: modo seductor"][Math.floor(Math.random() * 3)], 3000), 500); }
  }, 60000);

  // ---------- Capa de vuelo (la misma tela que en el PC: puntos con muelles, viento y pliegues) ----------
  let FLY = null;
  const CAPE = { cols: [-40, -20, 0, 20, 40], seg: 6, len: 21, flare: 0.2, pts: null, grow: 0, target: 0 };
  const capeAnchor = (c) => ({ x: CAPE.cols[c], y: 52 - Math.pow(CAPE.cols[c] / 40, 2) * 5 });
  function capeReset() {
    CAPE.pts = CAPE.cols.map((x0, c) => Array.from({ length: CAPE.seg + 1 }, (_, i) => {
      const a = capeAnchor(c), x = x0 * (1 + i * CAPE.flare), y = a.y + i * CAPE.len * 0.97;
      return { x, y, px: x, py: y };
    }));
  }
  function setCape(on) {
    if (!el.cape) return;
    CAPE.target = on ? 1 : 0;
    if (on) { el.cape.style.display = "inline"; if (!CAPE.pts) { capeReset(); CAPE.grow = 0; } }
  }
  function stepCape(dt) {
    if (!el.cape || el.cape.style.display !== "inline") { CAPE.pts = null; CAPE.grow = 0; return; }
    if (!CAPE.pts) capeReset();
    CAPE.grow += (CAPE.target - CAPE.grow) * Math.min(1, dt * (CAPE.target ? 5 : 4));
    if (!CAPE.target && CAPE.grow < 0.04) { el.cape.style.display = "none"; CAPE.pts = null; CAPE.grow = 0; return; }
    const segLen = CAPE.len, n = CAPE.cols.length, h = Math.min(dt, 1 / 30), k = 2.18;
    const lean = ((FLY ? FLY.dir * 22 : 0) + (A.pose.P ? A.pose.P.sway : 0)) * Math.PI / 180;
    const gx = Math.sin(-lean) * 900, gy = Math.cos(lean) * 900;
    const wx = -A.vx * k * 3.2, wy = -A.vy * k * 1.4;
    const sp = Math.min(1, Math.hypot(A.vx, A.vy) / 300);
    const breeze = Math.sin(A.t * 1.7) * 60 + Math.sin(A.t * 3.1) * 30;
    for (let c = 0; c < n; c++) {
      const col = CAPE.pts[c], side = (c - (n - 1) / 2) / ((n - 1) / 2);
      for (let i = 1; i < col.length; i++) {
        const p = col[i], u = i / CAPE.seg;
        const flutter = Math.sin(A.t * 14 - i * 1.15 + c * 1.3) * sp * 1000 * u;
        const spread = side * sp * 1900 * u;
        const fxx = gx + wx * u + flutter * 0.25 + breeze * u, fyy = gy + wy * u + flutter + spread;
        const vx = (p.x - p.px) * 0.982, vy = (p.y - p.py) * 0.982;
        p.px = p.x; p.py = p.y; p.x += vx + fxx * h * h; p.y += vy + fyy * h * h;
      }
      const a = capeAnchor(c); col[0].x = col[0].px = a.x; col[0].y = col[0].py = a.y;
    }
    for (let it = 0; it < 5; it++) {
      for (let c = 0; c < n; c++) {
        const col = CAPE.pts[c];
        for (let i = 1; i < col.length; i++) {
          const a = col[i - 1], b = col[i];
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, diff = (d - segLen) / d;
          if (i === 1) { b.x -= dx * diff; b.y -= dy * diff; }
          else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
        }
      }
      for (let i = 1; i <= CAPE.seg; i++) {
        const want = 20 * (1 + i * CAPE.flare);
        for (let c = 0; c < n - 1; c++) {
          const a = CAPE.pts[c][i], b = CAPE.pts[c + 1][i];
          let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
          if (d < 0.01) { dx = 0.01; dy = 0; d = 0.01; }
          const lo = want * 0.3, hi = want * 1.05;
          if (d > hi || d < lo) { const diff = (d - (d > hi ? hi : lo)) / d; a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
        }
      }
    }
  }
  const CAPE_RGB = [[200, 48, 60], [122, 20, 32]];
  function capeColor(dark) {
    const m = clamp(dark, 0, 1), [a, b] = CAPE_RGB;
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * m)},${Math.round(a[1] + (b[1] - a[1]) * m)},${Math.round(a[2] + (b[2] - a[2]) * m)})`;
  }
  function drawCape() {
    if (!CAPE.pts || !el.capeShape) return;
    const P = CAPE.pts, n = P.length, last = CAPE.seg;
    const f = (p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    const side = (pts) => {
      let d = ` L${f(pts[0])}`;
      for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2; d += ` Q${f(pts[i])} ${mx.toFixed(1)},${my.toFixed(1)}`; }
      return d + ` L${f(pts[pts.length - 1])}`;
    };
    const hemSeg = (a, b, k) => { const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y; return ` Q${(mx - dy * 0.18 * k).toFixed(1)},${(my + dx * 0.18 * k).toFixed(1)} ${f(b)}`; };
    let out = `M${f(P[0][0])}` + side(P[0]).slice(2 + f(P[0][0]).length);
    for (let c = 0; c < n - 1; c++) out += hemSeg(P[c][last], P[c + 1][last], 1);
    out += side([...P[n - 1]].reverse()) + "Z";
    el.capeShape.setAttribute("d", out);
    for (let c = 0; c < n - 1; c++) {
      const L = P[c], R = P[c + 1];
      let w = 0, want = 0;
      for (let i = 1; i <= last; i++) { w += Math.hypot(R[i].x - L[i].x, R[i].y - L[i].y); want += 20 * (1 + i * CAPE.flare); }
      const dark = (1 - clamp(w / want, 0, 1)) * 0.9 + (c % 2 ? 0.12 : 0) + (c === 0 || c === n - 2 ? 0.06 : 0);
      const d = `M${f(L[0])}` + side(L).slice(2 + f(L[0]).length) + hemSeg(L[last], R[last], 1) + side([...R].reverse()) + "Z";
      const s = el.capeStrips[c]; if (!s) continue;
      s.setAttribute("d", d); s.setAttribute("fill", capeColor(dark)); s.setAttribute("stroke", capeColor(dark)); s.setAttribute("stroke-width", "0.8");
    }
    let folds = "";
    for (let c = 1; c < n - 1; c += 2) folds += `M${f(P[c][1])}` + side(P[c].slice(1)).slice(2 + f(P[c][1]).length);
    if (el.capeFold) el.capeFold.setAttribute("d", folds);
    let hem = `M${f(P[0][last])}`;
    for (let c = 0; c < n - 1; c++) hem += hemSeg(P[c][last], P[c + 1][last], 1);
    if (el.capeEdge) el.capeEdge.setAttribute("d", hem);
    const gr = CAPE.grow, e = 1 - Math.pow(1 - gr, 3);
    el.cape.setAttribute("transform", gr > 0.995 ? "" : `translate(0 50) scale(${(0.35 + 0.65 * e).toFixed(3)} ${Math.max(0.02, e).toFixed(3)}) translate(0 -50)`);
  }

  // ---------- Pequeños efectos de las travesuras ----------
  function say(text, ms) { try { if (AND && AND.say) AND.say(text, ms || 2800); } catch (_) {} }
  // aro que se expande donde llama con los nudillos (toc, toc)
  function ring() {
    if (!fxLayer) return;
    const r = document.createElement("div");
    r.style.cssText = "position:absolute;left:calc(50% + " + (S.facing * 30) + "px);top:62%;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;border:2.5px solid rgba(255,255,255,.95);box-shadow:0 0 6px rgba(255,255,255,.6);pointer-events:none";
    fxLayer.appendChild(r);
    r.animate([{ transform: "scale(.3)", opacity: 1 }, { transform: "scale(1.8)", opacity: 0 }], { duration: 550, easing: "ease-out", fill: "forwards" });
    setTimeout(() => r.remove(), 650);
  }
  // corazón o estrella dibujados en el aire, que luego suben flotando
  function airDraw() {
    if (!fxLayer) return null;
    const shape = Math.random() < 0.6 ? "M0,10 C-30,-14 -22,-38 0,-24 C22,-38 30,-14 0,10Z" : "M0,-30 L8,-9 L30,-9 L12,4 L19,26 L0,13 L-19,26 L-12,4 L-30,-9 L-8,-9Z";
    const box = document.createElement("div");
    box.style.cssText = "position:absolute;left:calc(50% + " + (S.facing * 42) + "px);top:22%;width:64px;height:64px;margin-left:-32px;pointer-events:none;transition:transform 1.6s ease-out,opacity 1.6s";
    box.innerHTML = `<svg width="64" height="64" viewBox="-40 -40 80 80"><path d="${shape}" fill="none" stroke="#ffd36e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg>`;
    fxLayer.appendChild(box);
    const o = { box, path: box.querySelector("path") };
    const mo = new MutationObserver(() => { if (box.classList.contains("airfloat")) { box.style.transform = "translateY(-30px)"; box.style.opacity = "0"; setTimeout(() => box.remove(), 1700); mo.disconnect(); } });
    mo.observe(box, { attributes: true, attributeFilter: ["class"] });
    setTimeout(() => box.remove(), 6000);
    return o;
  }

  // ---------- Estado (lo manda Android) ----------
  const S = { st: "idle", facing: 1, vx: 0, vy: 0, sleeping: false, dragging: false, airborne: false, walking: false };
  const A = {
    t: 0, walkPhase: 0, turn: 0, tilt: 0, tiltTarget: 0, eyeX: 0, eyeY: 0, gNod: 0,
    squash: 0, squashV: 0, sqx: 0, sqxV: 0, lag: 0, lagV: 0, hy: 0, hyV: 0, splat: 0,
    legSwing: 0, legSwingV: 0, kick: 0, sit: 0, vx: 0, vy: 0, ax: 0, ay: 0,
    blink: 1, blinkEnd: 0, nextBlink: 2, appear: 1, mood: "normal", dance: false, danceUntil: 0,
    action: null, expr: null, brows: "none", energy: 0.5,
    pose: { aL: 0, aR: 0, P: null }, aLv: 0, aRv: 0, farLeft: null, farRight: null, armsFront: null,
  };
  const bump = (n) => { A.squashV += n; };

  // ---------- Caras ----------
  let faceKey = "";
  function setFace(eyes, brows, mouth = "none") {
    const key = eyes + "|" + brows + "|" + mouth;
    if (key === faceKey) return;
    faceKey = key;
    stage.dataset.eyes = eyes; stage.dataset.brows = brows; stage.dataset.mouth = mouth;
  }
  let blushT = 0;
  function blush(secs = 2.5) { stage.classList.add("blushing"); clearTimeout(blushT); blushT = setTimeout(() => stage.classList.remove("blushing"), secs * 1000); }
  // Expresiones (catálogo del PC: expr.js). Completan la cara durante unos segundos sin pisar los gestos.
  function express(name, secs = 2.6) {
    const ex = window.EkoExpr && EkoExpr.LIST[name];
    if (!ex) return;
    A.expr = { ex, t0: A.t, until: A.t + secs };
    if (ex.fx) fx(ex.fx, ex.fx === "heart" ? 2 : 1);
    if (ex.blush) blush(secs);
  }

  // ---------- Símbolos que salen de la cabeza (corazones, notas, chispas…) ----------
  const FX = { heart: ["♥", "#ef6b86"], bang: ["!", "#f2a33a"], ask: ["?", "#8a7cc9"], note: ["♪", "#5fa8d8"], spark: ["✦", "#f2c14e"], drop: ["…", "#9d8a7f"], "·": ["·", "#b58a5a"] };
  function fx(kind, n = 1) {
    const f = FX[kind]; if (!f || !fxLayer) return;
    for (let i = 0; i < n; i++) setTimeout(() => {
      const s = document.createElement("span");
      s.className = "fx"; s.textContent = f[0]; s.style.color = f[1];
      s.style.left = (50 + rnd(-22, 22)) + "%"; s.style.top = (kind === "·" ? 62 : 30 + rnd(-6, 6)) + "%";
      s.style.setProperty("--dx", rnd(-18, 18).toFixed(0) + "px");
      if (kind === "·") s.style.fontSize = "26px";
      fxLayer.appendChild(s);
      setTimeout(() => s.remove(), 1400);
    }, i * 160);
  }

  // Saltar de verdad: lo hace Android con la ventana (v en px/s del PC ≈ dp/s del móvil)
  // Nube que tapa a Eko (mudanza con magia): crece, lo cubre un instante y se disipa hacia fuera
  function puff(n = 10) {
    if (!fxLayer) return;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.6, rr = i === 0 ? 0 : 0.45 + Math.random() * 0.55;
      const w = i === 0 ? 70 : 40 + Math.random() * 24;
      const im = document.createElement("img");
      im.src = "art/fx-puff.webp"; im.alt = "";
      im.style.cssText = `position:absolute;left:calc(50% + ${(Math.cos(a) * 26 * rr).toFixed(1)}px);top:calc(64% + ${(Math.sin(a) * 36 * rr).toFixed(1)}px);width:${w.toFixed(0)}px;pointer-events:none;z-index:5`;
      fxLayer.appendChild(im);
      const dx = Math.cos(a) * (16 + Math.random() * 14), dy = Math.sin(a) * (12 + Math.random() * 10) - 8, r = Math.random() * 40 - 20;
      im.animate([
        { transform: `translate(-50%,-50%) scale(.3) rotate(${r}deg)`, opacity: 0 },
        { transform: `translate(-50%,-50%) scale(1.05) rotate(${r}deg)`, opacity: 1, offset: 0.25 },
        { transform: `translate(-50%,-50%) scale(1.05) rotate(${r}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(calc(-50% + ${dx.toFixed(0)}px), calc(-50% + ${dy.toFixed(0)}px)) scale(1.35) rotate(${r * 2}deg)`, opacity: 0 },
      ], { duration: 1150, delay: Math.random() * 60, easing: "ease-out", fill: "forwards" });
      setTimeout(() => im.remove(), 1300);
    }
  }
  // Esconderlo debajo de la nube (sin esconder la nube, que va en la capa de efectos)
  function vanish(on) { vanished = on; vanishAt = performance.now(); const m = $("#mochi"); if (m) { m.style.transition = "opacity .15s"; m.style.opacity = on ? "0" : "1"; } }
  let vanished = false, vanishAt = 0;
  // Tamaño (Ajustes → Comportamiento): solo en tu pantalla; dentro de su casa el tamaño lo pone la casa
  let sizeAt = 0, sizeCur = 1;
  function applySize() {
    if (window.self !== window.top) return;
    let s = 1;
    try { const m = JSON.parse(localStorage.getItem("eko-m-settings") || "{}"); s = { small: 0.85, normal: 1, big: 1.15 }[m.size] || 1; } catch (_) {}
    if (s === sizeCur) return;
    sizeCur = s;
    const mo = $("#mochi");
    if (mo) { mo.style.transformOrigin = "50% 100%"; mo.style.transform = s === 1 ? "" : `scale(${s})`; }
  }
  function hop(v) { if (AND && AND.hop) AND.hop(Math.abs(v)); else { A.squashV -= 6; } }
  // Que Android no lo ponga a andar en mitad de un gesto
  function hold(secs) { if (AND && AND.hold) AND.hold(Math.round(secs * 1000)); }

  // ---------- Gestos (los mismos que en el PC) ----------
  function waveF(P, k, e) { P.aR = lerp(P.aR, -112 + Math.sin(k * Math.PI * 6) * 24, e); P.front = true; P.tilt += 6 * e; }
  const ACTIONS = {
    wave: { dur: 1.7, eyes: "happy", f: waveF },
    bye: { dur: 1.7, eyes: "happy", f: waveF },
    nod: { dur: 1.1, f(P, k) { P.nod += Math.sin(k * Math.PI * 4) * 7 * (1 - k * 0.35); } },
    shake: { dur: 1.1, f(P, k) { P.hturn += Math.sin(k * Math.PI * 4) * 0.45 * (1 - k * 0.5); } },
    shrug: { dur: 1.2, brows: "up", f(P, k, e) { P.aL = lerp(P.aL, 58, e); P.aR = lerp(P.aR, -58, e); P.nod -= 3 * e; P.tilt += 9 * e; } },
    point: { dur: 1.9, f(P, k, e, o) {
      const d = o.dir || 1;
      P.turn += 0.55 * d * e;
      if (d > 0) P.aR = lerp(P.aR, -98, e); else P.aL = lerp(P.aL, 98, e);
      P.front = true; P.eyeX = 5 * d * e;
    } },
    stretch: { dur: 2.6, f(P, k) {
      const s = Math.sin(clamp(k, 0, 1) * Math.PI);
      P.aL = lerp(P.aL, 122, s); P.aR = lerp(P.aR, -122, s); P.front = s > 0.3;
      P.sy *= 1 + 0.09 * s; P.sx *= 1 - 0.045 * s; P.lift += 5 * s;
      if (s > 0.35) P.eyes = "closed";
      P.mouth = Math.max(P.mouth, clamp((s - 0.55) * 2.4, 0, 1));
    } },
    yawn: { dur: 1.8, f(P, k) {
      const s = Math.sin(k * Math.PI);
      P.mouth = Math.max(P.mouth, s); P.nod -= 4 * s; P.tilt += 7 * s;
      if (s > 0.25) P.eyes = "closed";
    } },
    scratch: { dur: 2.6, eyes: "squint", f(P, k, e) {
      const sc = Math.sin(A.t * 26);
      P.aR = lerp(P.aR, -160 + sc * 10, e); P.front = true;
      P.tilt += 12 * e; P.hturn += 0.15 * e; P.nod += sc * 1.2 * e; P.eyeY = -2 * e;
    } },
    think: { dur: 3.6, f(P, k, e) {
      P.aR = lerp(P.aR, 104 + Math.sin(A.t * 9) * 4, e); P.front = true;
      P.tilt -= 10 * e; P.hturn -= 0.18 * e; P.eyeX = -4 * e; P.eyeY = -4.5 * e;
      if (k > 0.35) P.brows = "up";
    } },
    lookAround: { dur: 3.4, f(P, k, e) { P.hturn += Math.sin(k * Math.PI * 2) * 0.75 * e; P.eyeX = Math.sin(k * Math.PI * 2) * 4 * e; } },
    curious: { dur: 2.8, f(P, k, e, o) {
      const d = o.dir || 1;
      P.turn += 0.35 * d * e; P.hturn += 0.2 * d * e; P.sway += 7 * d * e; P.tilt += 9 * d * e;
      P.eyeScale = 1 + 0.25 * e; P.eyeX = 5 * d * e; P.eyeY = -1.5 * e;
      P.aL = lerp(P.aL, -12, e); P.aR = lerp(P.aR, 12, e);
    } },
    eat: { dur: 3.4, f(P, k, e, o) {
      P.aL = lerp(P.aL, -100, e); P.aR = lerp(P.aR, 100, e); P.front = true;
      const chew = k > 0.2 && k < 0.8;
      P.mouth = chew ? Math.abs(Math.sin(A.t * 11)) * 0.8 : 0;
      P.eyes = k > 0.25 ? "happy" : null; P.nod += chew ? Math.sin(A.t * 11) * 1.5 : 0;
      P.snack = k < 0.8 ? 1 - Math.floor(clamp((k - 0.2) / 0.6, 0, 0.99) * 4) / 4 : 0;
      if (chew && Math.floor(A.t * 3.5) !== o.lastCrumb) { o.lastCrumb = Math.floor(A.t * 3.5); fx("·"); }
      if (k > 0.82 && !o.done) { o.done = true; blush(2); fx("heart", 2); }
    } },
    fists: { dur: 1.8, f(P, k, e) { P.aL = lerp(P.aL, -14, e); P.aR = lerp(P.aR, 14, e); P.eyes = "wink"; P.tilt += 6 * e; } },
    // Mudarse con magia (al PC o desde el PC), con continuidad entre los dos:
    //  teleOut: saca la varita, hace círculos con chispas, ¡puf! y desaparece entre nubecitas
    //  teleIn: aparece entre nubecitas con la varita aún en alto, la agita y se la guarda
    // ---------- Travesuras del Eko de escritorio (las que no mueven la ventana) ----------
    // Llama a la pantalla desde dentro: toc, toc… «¿Hay alguien?»
    knock: { dur: 5, f(P, k, e, o) {
      const t = k * 5;
      if (t < 2.3) { const q = (t - 0.4) % 0.35 / 0.35; P.aR = 70 + Math.sin(Math.max(0, q) * Math.PI) * 18; P.front = true; P.lift += 2; P.eyeScale *= 1.1; }
      const n = Math.floor((t - 0.4) / 0.35);
      if (t > 0.4 && t < 2.2 && n !== o.n) { o.n = n; ring(); }
      if (t > 2.4 && !o.w) { o.w = 1; say("¡Eh! ¿Hay alguien?", 2400); express("feliz", 2.5); }
      if (t > 2.4 && t < 4.2) { P.aR = -120 + Math.sin(A.t * 12) * 22; P.front = true; }
    } },
    // Dibuja un corazón o una estrella en el aire con el dedo
    drawAir: { dur: 4.6, f(P, k, e, o) {
      const t = k * 4.6;
      if (!o.el) o.el = airDraw();
      if (o.el) o.el.path.setAttribute("stroke-dashoffset", String(100 - 100 * sm(0.3, 2.2, t)));
      if (t > 2.2 && !o.done) { o.done = 1; o.el && o.el.box.classList.add("airfloat"); express("enamorado", 2); }
      if (t < 2.3) { P.aR = -110 + Math.sin(t * 5) * 30; P.front = true; P.eyeX = 4 * S.facing; P.eyeY = -4; }
    } },
    // Habla solo, muy concentrado, y se ríe
    mumble: { dur: 4.5, f(P, k, e, o) {
      const t = k * 4.5;
      if (!o.s) { o.s = 1; say(["Mmm… sí, sí… jeje", "Y entonces le dije… jajaja", "Hmm… ¿dónde lo dejé?"][Math.floor(Math.random() * 3)], 3000); }
      P.eyeX = -4; P.tilt += Math.sin(t * 2) * 5;
      if (t > 3) { P.eyes = "happy"; P.lift += Math.abs(Math.sin(t * 14)) * 2; }
    } },
    // Se aburre: se apoya en las manos, suspira y tamborilea
    bored: { dur: 8, f(P, k, e, o) {
      const t = k * 8;
      if (!o.s) { o.s = 1; express("triste", 2.5); say("Me abuuurro…", 1800); }
      if (t < 1.6) { const q = ease(clamp(t / 1.6, 0, 1)); P.nod += 6 * q; P.sy *= 1 - 0.05 * q; P.eyeY = 2 * q; return; }
      const q = ease(clamp((t - 1.6) / 0.7, 0, 1)) * (1 - ease(clamp((t - 7.2) / 0.8, 0, 1)));
      P.sy *= 1 - 0.1 * q; P.sx *= 1 + 0.05 * q; P.lift -= 6 * q;
      P.aR = lerp(P.aR, 62, q); P.aL = lerp(P.aL, -62, q); P.front = true;
      P.nod += 7 * q; P.eyes = "half"; P.brows = "sad";
      P.sway += Math.sin(t * 1.6) * 4 * q; P.eyeX = Math.sin(t * 0.8) * 4 * q;
      if (t > 4.5 && t < 6.5) P.lift += Math.abs(Math.sin(t * 9)) * 1.5 * q;
    } },
    teleOut: { dur: 2.8, f(P, k, e, o) {
      P.front = true;
      P.wand = Math.min(1, k / 0.1);
      if (k < 0.15) { P.aR = lerp(P.aR, -70, k / 0.15); P.eyes = "happy"; }
      else if (k < 0.62) { P.aR = -105 + Math.sin(A.t * 9) * 26; P.brows = "up"; P.eyeY = -3; P.mouth = Math.max(P.mouth, Math.abs(Math.sin(A.t * 11)) * 0.3); if (Math.random() < 0.06) fx("spark"); }
      else { P.aR = lerp(P.aR, -160, Math.min(1, (k - 0.62) / 0.08)); P.eyes = "happy"; P.brows = "up"; }
      if (k > 0.66 && !o.puf) { o.puf = true; puff(); }
      if (k > 0.74 && !o.gone) { o.gone = true; vanish(true); }
    } },
    teleIn: { dur: 2.8, f(P, k, e, o) {
      P.front = true;
      if (!o.started) { o.started = true; vanish(true); puff(); setTimeout(() => vanish(false), 230); }
      if (k < 0.45) { P.aR = -150 + Math.sin(A.t * 6) * 10; P.eyes = "happy"; P.brows = "up"; if (Math.random() < 0.05) fx("spark"); }
      else if (k < 0.75) { const m = (k - 0.45) / 0.3; P.aR = lerp(-150, 25, m); P.nod += 2 * Math.sin(Math.PI * m); }
      else { P.eyes = "happy"; P.mouth = Math.max(P.mouth, 0.3); }
      P.wand = k < 0.55 ? 1 : Math.max(0, 1 - (k - 0.55) / 0.15);   // se la guarda: encoge en la mano
      if (k > 0.7 && !o.stored) { o.stored = true; fx("spark", 2); }
    } },
    tada: { dur: 1.9, f(P, k, e, o) {
      if (k < 0.18) { const m = k / 0.18; P.sy *= 1 - 0.1 * m; P.sx *= 1 + 0.06 * m; P.nod += 4 * m; P.aR = lerp(P.aR, -18, m); P.aL = lerp(P.aL, 18, m); return; }
      if (!o.up) { o.up = true; hop(-620); fx("spark", 3); }
      const m = clamp((k - 0.18) / 0.12, 0, 1);
      P.aR = lerp(-18, -68, m); P.aL = -P.aR; P.eyes = "happy"; P.brows = "up"; P.mouth = Math.max(P.mouth, 0.35 * m);
      if (k > 0.6) { const w = Math.sin((k - 0.6) * 18) * (1 - k) * 2; P.tilt += 6 + w * 4; P.aR += w * 6; P.aL += w * 6; }
    } },
    hug: { dur: 2.6, eyes: "happy", f(P, k, e) {
      const open = k < 0.4 ? e : 0, close = k >= 0.4 ? e : 0;
      P.aL = lerp(lerp(P.aL, 118, open), -38, close);
      P.aR = lerp(lerp(P.aR, -118, open), 38, close);
      P.front = true; P.sy *= 1 + 0.04 * close; P.tilt += 5 * close;
    } },
    dizzy: { dur: 2.6, eyes: "spiral", f(P, k) { P.tilt += Math.sin(A.t * 7) * 13 * (1 - k); P.sway += Math.sin(A.t * 5) * 4 * (1 - k); } },
    surprise: { dur: 1.4, f(P, k, e) {
      P.eyeScale = 1 + 0.8 * e; P.brows = "up"; P.mouth = Math.max(P.mouth, 0.45 * e);
      P.lift += 9 * Math.sin(clamp(k * 2.2, 0, 1) * Math.PI); P.aL = lerp(P.aL, 38, e); P.aR = lerp(P.aR, -38, e);
    } },
    sad: { dur: 2.2, f(P, k, e) { P.brows = "sad"; P.nod += 4 * e; P.eyeY = 2 * e; P.sy *= 1 - 0.03 * e; } },
    angry: { dur: 1.6, f(P, k, e) { P.brows = "angry"; P.sx *= 1 + 0.03 * e; P.aL = lerp(P.aL, 30, e); P.aR = lerp(P.aR, -30, e); } },
    wink: { dur: 1.2, eyes: "wink", f(P, k, e) { P.tilt += 8 * e; } },
    // Voltereta hacia atrás (tricks.js): se agacha, salta, gira encogido y aterriza con los brazos arriba
    flip: { dur: 2.4, f(P, k, e, o) {
      const d = o.d || (o.d = -(S.facing || 1));
      P.front = true;
      if (k < 0.2) {
        const m = ease(sm(0, 0.2, k));
        P.sy *= 1 - 0.17 * m; P.sx *= 1 + 0.1 * m; P.nod += 7 * m;
        P.aL = lerp(P.aL, -28, m); P.aR = lerp(P.aR, 28, m);
        P.eyes = "squint"; P.brows = "angry";
        return;
      }
      once(o, "jump", () => hop(-800));
      const air = sm(0.21, 0.56, k), tuck = Math.sin(Math.PI * air);
      const ang = d * 360 * ease(sm(0.23, 0.53, k));
      P.spin += ang;
      { const c = Math.cos(ang * Math.PI / 180), sn = Math.abs(Math.sin(ang * Math.PI / 180));
        const low = Math.max(80 + 96 * c, 80 - 184 * c) + 100 * 0.62 * sn;
        P.lift += Math.max(0, low - 176) + 16 * sn; }
      if (air > 0 && air < 1) {
        P.sy *= 1 - 0.13 * tuck; P.sx *= 1 + 0.03 * tuck;
        P.aL = lerp(70, -75, tuck); P.aR = -P.aL;
        P.eyes = tuck > 0.35 ? "closed" : null;
        P.legL = -10 * tuck; P.legR = -10 * tuck;
      }
      if (k >= 0.56) {
        const m = back(sm(0.56, 0.7, k));
        once(o, "land", () => fx("spark", 4));
        const w = Math.sin((k - 0.56) * 26) * (1 - sm(0.56, 1, k)) * 6;
        P.aL = lerp(P.aL, 150, m) + w; P.aR = lerp(P.aR, -150, m) + w;
        P.eyes = "happy"; P.brows = "up"; P.mouth = Math.max(P.mouth, 0.4 * m); P.tilt += w;
      }
    } },
    // Pirueta (tricks.js): de puntillas, brazos abiertos que se cierran al coger velocidad y pose final con guiño
    pirouette: { dur: 2.9, f(P, k, e, o) {
      P.front = true;
      const pre = ease(sm(0, 0.14, k)), run = sm(0.14, 0.8, k);
      const spd = Math.sin(Math.PI * run);
      const phi = Math.PI * 2 * 3.25 * (run < 0.5 ? 2 * run * run : 1 - Math.pow(-2 * run + 2, 2) / 2);
      P.lift += 6 * pre * (1 - sm(0.8, 0.88, k));
      if (k < 0.8) {
        P.turn += Math.sin(phi) * (run > 0 ? 1 : 0);
        P.hturn += Math.sin(phi + 0.5) * 0.3 * spd;
        P.sx *= 1 - 0.2 * Math.abs(Math.sin(phi)) * spd;
        const open = lerp(95, 18, spd);
        P.aL = lerp(P.aL, open, pre); P.aR = lerp(P.aR, -open, pre);
        P.eyes = spd > 0.55 ? "closed" : "happy";
        P.sway += Math.sin(phi * 0.5) * 2 * spd;
        if (spd > 0.6 && Math.floor(phi / Math.PI) !== o.half) { o.half = Math.floor(phi / Math.PI); fx("spark"); }
      } else {
        const m = back(sm(0.8, 0.92, k));
        const over = Math.sin((k - 0.8) * 30) * (1 - sm(0.8, 1, k)) * 0.35;
        P.turn += over;
        P.aR = lerp(-20, -125, m); P.aL = lerp(20, -30, m);
        P.tilt += 9 * m; P.eyes = k > 0.84 ? "wink" : "happy"; P.mouth = Math.max(P.mouth, 0.3 * m);
        once(o, "end", () => fx("note", 2));
      }
    } },
  };

  function act(name, opts = {}) {
    const a = ACTIONS[name];
    if (!a || S.dragging) return false;
    A.action = { name, t0: A.t, dur: opts.dur || a.dur, opts };
    hold(A.action.dur + 0.4);
    if (name === "scratch") setTimeout(() => fx("ask"), 500);
    if (name === "dizzy") fx("spark", 2);
    if (name === "hug") setTimeout(() => { fx("heart", 3); blush(2.5); }, 900);
    if (name === "surprise") fx("bang");
    return true;
  }

  // ---------- Baile (el mismo del PC: 4 frases de 8 tiempos) ----------
  function dancePose(P) {
    const b = A.t * 1.9, bi = Math.floor(b), ph = b - bi;
    const phrase = Math.floor(bi / 8) % 4, pb = bi % 8;
    const beat = Math.sin(ph * Math.PI);
    const side = bi % 2 ? 1 : -1;
    P.bob = beat * 5;
    if (phrase === 0) {
      P.sway += side * 7 * beat; P.shift += side * 7 * beat; P.tilt += side * 8 * beat;
      P.aL = 45 + side * 28 * beat; P.aR = -45 + side * 28 * beat;
      if (side > 0) P.legR = -6 * beat; else P.legL = -6 * beat;
    } else if (phrase === 1) {
      P.aL = 112 + beat * 18; P.aR = -112 - beat * 18; P.front = true;
      P.eyes = "happy"; P.sy *= 1 + 0.05 * beat; P.legL = -4 * beat; P.legR = -4 * beat;
    } else if (phrase === 2) {
      const sw = Math.sin(b * Math.PI / 2);
      P.turn += sw * 0.6; P.shift += sw * 10; P.hturn += sw * 0.15;
      P.aL = 20 + Math.max(0, sw) * 70; P.aR = -20 - Math.max(0, -sw) * 70;
      if (sw > 0) P.legL = -6 * beat; else P.legR = -6 * beat;
    } else if (pb < 4) {
      P.turn += Math.sin((b % 4) / 4 * Math.PI * 2);
      P.aL = 60; P.aR = -60; P.eyes = "happy";
    } else if (pb < 6) {
      P.lift += beat * 14; P.aL = 120; P.aR = -120; P.front = true; P.eyes = "happy";
    } else {
      P.aR = -112; P.aL = 22; P.front = true; P.eyes = "wink"; P.tilt += 10;
    }
  }

  // ---------- Cada fotograma ----------
  function update(dt) {
    A.t += dt;
    const walking = S.walking, dragging = S.dragging, airborne = S.airborne;
    if (walking) {
      const ready = clamp((A.turn * S.facing - 0.35) / 0.4, 0, 1);
      A.walkPhase += dt * 13 * ready;
    }
    if (dragging) A.kick += dt * 18;
    if (A.action && A.t - A.action.t0 > A.action.dur) A.action = null;

    A.squashV += (-170 * A.squash - 10 * A.squashV) * dt;
    A.squash += A.squashV * dt;
    const velX = S.walking ? S.facing * 72 : S.vx, velY = S.vy;
    const pvx = A.vx, pvy = A.vy;
    A.vx += (velX - A.vx) * Math.min(1, dt * 18);
    A.vy += (velY - A.vy) * Math.min(1, dt * 18);
    A.ax += (((A.vx - pvx) / Math.max(dt, 1e-3)) - A.ax) * Math.min(1, dt * 10);
    A.ay += (((A.vy - pvy) / Math.max(dt, 1e-3)) - A.ay) * Math.min(1, dt * 10);
    stepCape(dt);
    // gorro de dormir mientras duerme (y fuera al despertar)
    if (S.sleeping && PROP.cur !== "nightcap") useProp("nightcap", 7200, 0);
    else if (!S.sleeping && PROP.cur === "nightcap") dropProp("nightcap");
    A.lagV += ((clamp(-velX * 0.012, -8, 8) - A.lag) * 120 - A.lagV * 9) * dt;
    A.lag += A.lagV * dt;
    A.hyV += (-A.hy * 220 - A.hyV * 11 + clamp(-A.ay * 0.004, -60, 60)) * dt;
    A.hy = clamp(A.hy + A.hyV * dt, -10, 12);
    A.sqxV += (-A.sqx * 170 - A.sqxV * 10) * dt;
    A.sqx += A.sqxV * dt;
    A.splat *= Math.pow(0.02, dt);
    const legTarget = airborne || dragging ? clamp(-A.vx * 0.02, -35, 35) : 0;
    A.legSwingV += ((legTarget - A.legSwing) * 60 - A.legSwingV * 6) * dt;
    A.legSwing += A.legSwingV * dt;

    const sitGoal = S.sleeping && !airborne && !dragging ? 1 : 0;
    A.sit += (sitGoal - A.sit) * Math.min(1, dt * 5);
    const dancing = (A.dance || A.t < A.danceUntil) && !walking && !airborne && !dragging && !S.sleeping;
    const tiltGoal = S.sleeping ? 11 : dancing ? Math.sin(A.t * 3.2) * 7 : A.tiltTarget;
    A.tilt += (tiltGoal - A.tilt) * Math.min(1, dt * 5);
    const etx = dragging ? 0 : walking ? S.facing * 2 : 0, ety = dragging ? -2 : 0;
    A.eyeX += (etx - A.eyeX) * Math.min(1, dt * 10);
    A.eyeY += (ety - A.eyeY) * Math.min(1, dt * 10);
    const turnGoal = walking ? S.facing * 0.85 : 0;
    A.turn += (turnGoal - A.turn) * Math.min(1, dt * 5);
    if (A.t > A.nextBlink) { A.blinkEnd = A.t + 0.13; A.nextBlink = A.t + (Math.random() < 0.2 ? 0.25 : rnd(2, 6)); }
    A.blink = A.t < A.blinkEnd ? 0.1 : 1;
    if (dancing) { const q = Math.floor(A.t * 1.9 / 4); if (q !== A.lastNote) { A.lastNote = q; fx("note"); } }
    idleLife();
    computePose(dt, dancing);
  }

  function computePose(dt, dancing) {
    const walking = S.walking;
    const P = {
      aL: 0, aR: 0, front: false, nod: 0, tilt: 0, turn: 0, hturn: 0, sway: 0, shift: 0, sx: 1, sy: 1, lift: 0,
      legL: 0, legR: 0, bob: 0, spin: 0, snack: 0, wand: 0, mouth: 0, mouthShape: null, eyeX: null, eyeY: null,
      eyeScale: S.dragging ? 1.25 : 1, eyes: null, brows: "none",
    };
    if (walking) {
      const tw = clamp(A.turn, -1, 1);
      P.aL = -Math.sin(A.walkPhase) * 22 * tw;
      P.aR = -Math.sin(A.walkPhase + Math.PI) * 22 * tw;
    } else if (S.dragging) {
      P.aL = 70 + Math.sin(A.kick * 0.7) * 12; P.aR = -70 - Math.sin(A.kick * 0.7) * 12;
      const sp = Math.min(1, Math.hypot(A.vx, A.vy) / 1500);
      P.sy = 1.08 + 0.08 * sp; P.sx = 0.94 - 0.05 * sp; P.sway = clamp(S.vx * 0.012, -22, 22);
    } else if (S.airborne) {
      const fall = clamp(A.vy / 900, -1, 1);
      P.aL = 30 + 45 * Math.max(0, fall); P.aR = -P.aL;
    } else if (dancing) dancePose(P);
    else { P.aL = Math.sin(A.t * 2.2) * 2; P.aR = -P.aL; }
    // saltitos de energía en el sitio
    if (A.energy > 0.3 && S.st === "idle" && !A.action && Math.sin(A.t * 0.9) > 0.8) P.lift += Math.max(0, Math.sin(A.t * 9)) * 4 * A.energy;
    P.nod += A.gNod;
    if (A.woozyUntil > A.t) {
      const k = clamp((A.woozyUntil - A.t) / 3, 0, 1);
      P.sway += Math.sin(A.t * 2.6) * 8 * k; P.tilt += Math.sin(A.t * 3.4 + 1) * 10 * k; P.shift += Math.sin(A.t * 1.9) * 4 * k;
      if (!P.eyes && k > 0.45) P.eyes = "spiral";
    }
    const a = A.action;
    if (a) {
      const def = ACTIONS[a.name];
      const k = clamp((A.t - a.t0) / a.dur, 0, 1);
      def.f(P, k, env(k), a.opts);
      if (def.eyes && !P.eyes) P.eyes = def.eyes;
      if (def.brows && P.brows === "none") P.brows = def.brows;
    }
    if (P.brows === "none" && A.brows !== "none") P.brows = A.brows;
    if (A.expr && A.t < A.expr.until && !S.sleeping) {
      const x = A.expr.ex, k = clamp(Math.min(A.t - A.expr.t0, A.expr.until - A.t) / 0.25, 0, 1);
      if (!P.eyes && x.eyes !== "open") P.eyes = x.eyes;
      if (P.brows === "none" && x.brows !== "none") P.brows = x.brows;
      if (!P.mouthShape && x.mouth !== "o" && x.mouth !== "none") P.mouthShape = x.mouth;
      if (x.mouth === "o") P.mouth = Math.max(P.mouth, (x.o || 0.3) * k);
      if (x.scale) P.eyeScale *= 1 + (x.scale - 1) * k;
      if (x.eyeX && P.eyeX == null) P.eyeX = x.eyeX * S.facing * k;
      if (x.eyeY && P.eyeY == null) P.eyeY = x.eyeY * k;
      if (x.tilt) P.tilt += x.tilt * k;
      if (x.nod) P.nod += x.nod * k;
      if (x.shiver) P.shift += Math.sin(A.t * 42) * 1.3 * k;
    } else if (A.expr) A.expr = null;
    // Objetos de un rato (taza, auriculares, palomitas…) y vuelo con capa
    const vis = propsVisible(); A.propVis = vis;
    if (vis.size) propPose(P, vis);
    if (FLY) { P.aR = -158; P.aL = 18; P.front = true; P.sway += FLY.dir * 12; P.tilt += FLY.dir * 8; if (!P.eyes) P.eyes = "happy"; }
    let eyes = P.eyes;
    if (!eyes) eyes = S.sleeping ? "closed" : A.t < (A.happyUntil || 0) ? "happy" : "open";
    setFace(eyes, P.brows, P.mouth > 0.12 ? "none" : (P.mouthShape || "none"));
    const tL = P.aL + clamp(A.ax * 0.006, -28, 28), tR = P.aR + clamp(A.ax * 0.006, -28, 28);
    A.aLv += ((tL - A.pose.aL) * 260 - A.aLv * 20) * dt;
    A.aRv += ((tR - A.pose.aR) * 260 - A.aRv * 20) * dt;
    A.pose.aL += A.aLv * dt; A.pose.aR += A.aRv * dt;
    A.pose.P = P;
  }

  function render() {
    const P = A.pose.P; if (!P) return;
    const walking = S.walking;
    const dancing = (A.dance || A.t < A.danceUntil) && !walking && !S.airborne && !S.dragging && !S.sleeping;
    const breathe = Math.sin(A.t * (S.sleeping ? 1.3 : 2.2)) * (S.sleeping ? 0.022 : 0.012);
    const contact = walking ? Math.abs(Math.sin(A.walkPhase)) : 0;
    const bob = walking ? -(1 - contact) * 5 : dancing ? -P.bob : 0;
    const sq = clamp(A.squash * 0.075, -0.32, 0.42);
    const fallStretch = S.airborne ? clamp(Math.abs(A.vy) / 3200, 0, 0.16) : 0;
    let sy = (1 - sq + breathe - contact * 0.04 + fallStretch) * P.sy;
    let sx = Math.pow(Math.max(0.5, sy / P.sy), -0.65) * P.sx;
    const sqx = clamp(A.sqx * 0.06, -0.3, 0.3);
    sx *= 1 - sqx; sy *= 1 + sqx * 0.6;
    const t = clamp(A.turn + P.turn, -1, 1), at = Math.abs(t);
    const th = clamp(t + P.hturn, -1, 1), ath = Math.abs(th);
    const lean = (walking ? t * 5 : 0) + P.sway;
    const leanLift = S.dragging ? 0 : 84 * Math.abs(Math.sin(lean * Math.PI / 180));
    el.pet.setAttribute("transform", `translate(${P.shift.toFixed(2)} ${(bob - P.lift - leanLift).toFixed(2)}) rotate(${P.spin.toFixed(1)} 0 80) rotate(${lean.toFixed(2)} 0 176) translate(0 176) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(0 -176)`);
    // la sombra se queda en el suelo: en el aire o cogido, se esconde
    el.shadow.style.opacity = S.airborne || S.dragging ? "0" : "0.28";

    let lL = 0, lR = 0, rL = 0, rR = 0;
    if (walking) {
      const phL = A.walkPhase, phR = A.walkPhase + Math.PI;
      rL = -Math.sin(phL) * 24 * t; rR = -Math.sin(phR) * 24 * t;
      lL = -Math.max(0, Math.cos(phL)) * 7; lR = -Math.max(0, Math.cos(phR)) * 7;
    } else if (S.dragging) { lL = Math.sin(A.kick) * 8; lR = Math.sin(A.kick + Math.PI) * 8; rL = rR = A.legSwing; }
    else { lL = P.legL; lR = P.legR; rL = rR = A.legSwing; }
    const spread = A.splat * 9;
    const xL = 10 * at - spread, xR = -10 * at + spread;
    const sitDrop = 29 * A.sit;
    el.legs.setAttribute("transform", `translate(0 176) scale(1 ${(1 - 0.5 * A.sit).toFixed(3)}) translate(0 -176)`);
    el.legL.setAttribute("transform", `translate(${xL.toFixed(2)} ${lL.toFixed(2)}) rotate(${rL.toFixed(2)} -21 122)`);
    el.legR.setAttribute("transform", `translate(${xR.toFixed(2)} ${lR.toFixed(2)}) rotate(${rR.toFixed(2)} 21 122)`);
    const farLeft = t < -0.15, farRight = t > 0.15;
    if (farLeft !== A.farLeft || farRight !== A.farRight) {
      A.farLeft = farLeft; A.farRight = farRight;
      if (farLeft) el.legs.appendChild(el.legR); else el.legs.appendChild(el.legL);
    }
    el.upper.setAttribute("transform", `translate(0 ${sitDrop.toFixed(2)})`);
    const armKey = P.front ? "front" : farLeft ? "R" : farRight ? "L" : "back";
    if (armKey !== A.armsFront) {
      A.armsFront = armKey;
      el.pet.insertBefore(el.armL, el.upper); el.pet.insertBefore(el.armR, el.upper);
      if (armKey === "front") { el.pet.appendChild(el.armL); el.pet.appendChild(el.armR); }
      else if (armKey === "R") el.upper.after(el.armR);
      else if (armKey === "L") el.upper.after(el.armL);
      if (el.propFront) el.pet.appendChild(el.propFront);
      if (el.propHand) el.pet.appendChild(el.propHand);
      if (el.antic) el.pet.appendChild(el.antic);
    }
    const dxL = t > 0 ? 16 * t : -22 * t, dxR = t > 0 ? -22 * t : 16 * t;
    el.armL.setAttribute("transform", `translate(${dxL.toFixed(2)} ${sitDrop.toFixed(2)}) rotate(${A.pose.aL.toFixed(2)} -50 58)`);
    el.armR.setAttribute("transform", `translate(${dxR.toFixed(2)} ${sitDrop.toFixed(2)}) rotate(${A.pose.aR.toFixed(2)} 50 58)`);
    // Objetos: lo que va en la mano sigue la punta del brazo derecho; la cámara sube a la cara de vez en cuando
    if (A.propVis) {
      renderProps(A.propVis);
      if (A.propVis.size && el.propHand) {
        const r = A.pose.aR * Math.PI / 180, hx = dxR + 50 + 15 * Math.cos(r) - 60 * Math.sin(r), hy = sitDrop + 58 + 15 * Math.sin(r) + 60 * Math.cos(r);
        el.propHand.setAttribute("transform", `translate(${hx.toFixed(1)} ${hy.toFixed(1)})`);
        if (el.propFront) el.propFront.setAttribute("transform", `translate(0 ${sitDrop.toFixed(1)})`);
        if (A.propVis.has("camera") && el.props.camera) {
          const k = ((A.t - PROP.t0) % 10) / 10;
          const up = k < 0.55 ? 0 : k < 0.65 ? (k - 0.55) / 0.1 : k < 0.88 ? 1 : 1 - (k - 0.88) / 0.12;
          PROP.camUp = up * up * (3 - 2 * up);
          const shot = k > 0.74 && k < 0.8 ? 1 - (k - 0.74) / 0.06 : 0;
          if (el.flash) { el.flash.setAttribute("opacity", shot.toFixed(2)); el.flash.setAttribute("transform", `translate(38 -4) scale(${(0.6 + (1 - shot) * 0.6).toFixed(2)}) translate(-38 4)`); }
          const cu = PROP.camUp, cx = lerp(-14, 0, cu), cy = lerp(82, 0, cu), sc = lerp(0.72, 1, cu);
          el.props.camera[0].setAttribute("transform", `translate(${cx.toFixed(1)} ${(cy - (shot > 0.8 ? 2 : 0)).toFixed(1)}) scale(${sc.toFixed(3)})`);
        }
      }
    }
    drawCape();
    const bodyT = `translate(${(3 * t).toFixed(2)} 0) scale(${(1 - 0.12 * at).toFixed(4)} 1)`;
    el.body.setAttribute("transform", bodyT);
    if (el.bodyHl) el.bodyHl.setAttribute("transform", `translate(${(4 * t).toFixed(2)} 0)`);
    if (el.accBody) el.accBody.setAttribute("transform", bodyT);
    const headDrop = (S.sleeping ? 4 : 0) + P.nod + A.hy;
    if (el.accBack) el.accBack.setAttribute("transform", `translate(${(2 * th + A.lag * 0.6).toFixed(2)} ${(sitDrop + Math.min(0, headDrop) * 0.3).toFixed(2)}) scale(${(1 - 0.1 * at).toFixed(4)} 1)`);
    el.head.setAttribute("transform", `translate(${(4 * th + A.lag).toFixed(2)} ${headDrop.toFixed(2)}) rotate(${(A.tilt + P.tilt).toFixed(2)} 0 40) scale(${(1 - 0.05 * ath).toFixed(4)} 1)`);
    if (el.hl) el.hl.setAttribute("transform", `translate(${(5 * th).toFixed(2)} ${(P.nod * 0.5).toFixed(2)})`);
    if (el.hat) el.hat.setAttribute("transform", `translate(${(10 * th).toFixed(2)} 0)`);
    A.capS = A.capS ?? 1;
    A.capS += ((S.facing > 0 ? -1 : 1) - A.capS) * 0.16;
    const capT = `scale(${(Math.abs(A.capS) < 0.04 ? 0.04 * Math.sign(A.capS || 1) : A.capS).toFixed(3)} 1)`;
    for (const g of el.tipHats) g.setAttribute("transform", capT);
    const ex = P.eyeX != null ? P.eyeX : A.eyeX;
    const ey = (P.eyeY != null ? P.eyeY : A.eyeY) + P.nod * 0.9;
    el.eyes.setAttribute("transform", `translate(${ex.toFixed(2)} ${ey.toFixed(2)})`);
    if (window.ekoLook) ekoLook.pose(A.t, (A.lag || 0) * 0.4);
    const pos = [];
    el.eyeEls.forEach((e, i) => {
      const base = i === 0 ? -32 : 32;
      const far = Math.sign(base) !== Math.sign(th) && ath > 0.01;
      const x = base * (1 - 0.3 * ath) + th * 24;
      const esx = far ? 1 - 0.3 * ath : 1 - 0.04 * ath;
      pos.push([x, esx]);
      e.setAttribute("transform", `translate(${x.toFixed(2)} 20) scale(${esx.toFixed(3)} 1)`);
    });
    if (el.bridge && pos.length === 2) { el.bridge.setAttribute("x1", (pos[0][0] + 12 * pos[0][1]).toFixed(2)); el.bridge.setAttribute("x2", (pos[1][0] - 12 * pos[1][1]).toFixed(2)); }
    const es = P.eyeScale;
    for (const o of el.opens) o.setAttribute("transform", `scale(${es} ${A.blink * es})`);
    el.mouth.setAttribute("cx", (th * 30 + ex * 0.6).toFixed(2));
    el.mouth.setAttribute("cy", (40 + ey * 0.6).toFixed(2));
    if (el.mouthShapes) el.mouthShapes.setAttribute("transform", `translate(${(th * 30 + ex * 0.6).toFixed(2)} ${(40 + ey * 0.6).toFixed(2)}) scale(${(1 - 0.3 * ath).toFixed(3)} 1)`);
    if (el.accFace) el.accFace.setAttribute("transform", `translate(${(th * 30 + ex * 0.6).toFixed(2)} ${(ey * 0.6).toFixed(2)}) scale(${(1 - 0.3 * ath).toFixed(3)} 1)`);
    el.mouth.setAttribute("ry", (P.mouth * 10).toFixed(2));
    el.mouth.setAttribute("rx", (5.5 + P.mouth * 3).toFixed(2));
    if (P.snack > 0) { el.snack.style.display = "inline"; el.snack.setAttribute("transform", `translate(${(th * 30).toFixed(2)} 54) scale(${(P.snack * 1.7).toFixed(2)})`); }
    else el.snack.style.display = "none";
    // Varita (mudanza con magia): en la mano derecha, apuntando hacia fuera del brazo; encoge al guardársela
    const wand = $("#wandR");
    if (wand) {
      if (P.wand > 0.01) { wand.style.display = "inline"; wand.setAttribute("transform", `translate(67 125) scale(${P.wand.toFixed(3)}) translate(-67 -125) rotate(168 71.6 146.5)`); }
      else wand.style.display = "none";
    }
  }

  // ---------- Vida propia estando quieto: de vez en cuando hace un gesto suyo (como en el PC) ----------
  let idleSince = 0, nextIdle = rnd(6, 12);
  function idleLife() {
    if (S.st !== "idle" || A.action || A.dance || A.t < A.danceUntil) { idleSince = A.t; return; }
    if (A.t - idleSince < nextIdle) return;
    idleSince = A.t; nextIdle = rnd(7, 16);
    const h = new Date().getHours(), late = h >= 23 || h < 7;
    const pool = late ? ["yawn", "yawn", "stretch", "lookAround", "scratch"] : ["lookAround", "lookAround", "stretch", "scratch", "think", "curious", "nod", "wink", "yawn"];
    const n = pool[Math.floor(Math.random() * pool.length)];
    act(n, n === "curious" ? { dir: Math.random() < 0.5 ? -1 : 1 } : {});
  }

  // ---------- Ahorro: fotogramas según lo que haga y ventana grande solo cuando hace falta ----------
  // Siempre a la velocidad de la pantalla (sin límite de fotogramas)
  let last = performance.now(), lowPower = false, big = false, bigUntil = 0, hitT = 0, hitKey = "", clipPx = 0;
  function busy() { return !!A.action || S.walking || S.dragging || S.airborne || A.dance || A.t < A.danceUntil || Math.abs(A.squashV) > 2; }
  function wantBig() { return !!A.action || S.dragging || S.airborne || A.dance || A.t < A.danceUntil; }
  function frame(now) {
    requestAnimationFrame(frame);
    // Sin límite de fotogramas: se dibuja a la velocidad de la pantalla
    const dt = Math.min(0.07, (now - last) / 1000); last = now;
    update(dt); render();
    if (now > sizeAt) { sizeAt = now + 2000; applySize(); }
    // Seguridad: si se quedó escondido tras la magia (y ya no hay magia en marcha), vuelve a verse
    if (vanished && now - vanishAt > 3500 && !(A.action && A.action.name.startsWith("tele"))) vanish(false);
    // Zona tocable = solo su cuerpo (Android deja pasar los toques del resto de la ventana)
    if (AND && AND.hit && A.t > hitT) {
      hitT = A.t + 0.12;
      const r = el.pet.getBoundingClientRect(), p = 8;
      // si está escondido detrás del teclado, la parte tapada no recibe toques (para no robarle teclas)
      const k = [r.left - p, r.top - p, r.right + p, Math.min(r.bottom + p, innerHeight - clipPx)].map(Math.round);
      const key = k.join(",");
      if (key !== hitKey) { hitKey = key; AND.hit(k[0], k[1], k[2], k[3]); }
    }
    const w = wantBig();
    if (w) bigUntil = A.t + 0.8;
    if (w !== big && (w || A.t > bigUntil)) { big = w; if (AND && AND.big) AND.big(big); }
  }
  requestAnimationFrame(frame);

  // ---------- Lo que pide Android (EkoService.kt) ----------
  const TRICKS = ["pirouette", "flip", "tada"];
  window.eko = {
    set(st, dir) {
      const was = S.st;
      S.st = st; if (dir) S.facing = dir;
      S.walking = st === "walk"; S.dragging = st === "drag"; S.airborne = st === "fall"; S.sleeping = st === "sleep";
      stage.dataset.state = st;
      if (st === "drag") { A.action = null; bump(-3); fx("bang"); }
      if (st !== "drag" && st !== "fall") { S.vx = 0; S.vy = 0; }
      if (st === "sleep" && was !== "sleep") { A.action = null; A.dance = false; A.danceUntil = 0; }
    },
    v(vx, vy) { S.vx = vx; S.vy = vy; },
    tap() { A.happyUntil = A.t + 1.2; bump(-4); A.sqxV += 3; if (Math.random() < 0.35) act(["wave", "wink", "nod", "surprise"][Math.floor(Math.random() * 4)]); else fx("heart"); },
    happy() { A.happyUntil = A.t + 1.5; },
    land() { const v = Math.max(400, Math.abs(S.vy || 900)); A.squashV += clamp(v / 90, 6, 20); A.splat = Math.min(1, v / 1400); A.happyUntil = A.t + 0.8; },
    wake() { S.sleeping = false; S.st = "idle"; stage.dataset.state = "idle"; act("stretch"); },
    brows(b) { A.brows = b || "none"; },
    dance(secs) { A.danceUntil = A.t + (secs || 6); hold(secs || 6); },
    setDance(v) { A.dance = !!v; },
    dizzy() { act("dizzy", { dur: 2.8 }); A.woozyUntil = A.t + 4.5; },
    eat() { act("eat"); },
    spin() { act(TRICKS[Math.floor(Math.random() * TRICKS.length)]); },
    // Objetos de un rato (los pide Android según lo que pasa: app abierta, mañana, música…)
    prop(name, secs) { useProp(name, secs || 120, 0); },
    dropProp(name) { dropProp(name); },
    // Suena música: auriculares y a bailar (Android lo repite cada pocos segundos mientras suena)
    music(on) {
      if (on) { useProp("headphones", 600, 0); A.danceUntil = A.t + 7; }
      else { dropProp("headphones"); A.danceUntil = 0; }
    },
    // Vuelo con capa (Android mueve la ventana; aquí la capa, la pose y el aire en la tela)
    fly(dir) { FLY = { dir: dir >= 0 ? 1 : -1 }; S.vx = FLY.dir * 320; setCape(true); fx("spark", 3); },
    flyEnd() { FLY = null; S.vx = 0; act("land" in ACTIONS ? "land" : "tada"); setTimeout(() => { if (!FLY) setCape(false); }, 2600); },
    // Una travesura del Eko de escritorio (knock, drawAir, mumble, bored)
    antic(name) { if (ACTIONS[name]) act(name); },
    // Esconder la parte de abajo (cuando se asoma por detrás del teclado): px desde abajo de la ventana
    clip(px) { clipPx = Math.max(0, px || 0); stage.style.clipPath = clipPx ? `inset(0 0 ${clipPx}px 0)` : "none"; hitKey = ""; },
    lowPower(v) { lowPower = !!v; },
    act, fx, blush, express,
    talk(ev, chance, arg) { if (window.ekoTalk) ekoTalk.talk(ev, chance, arg); },
    chatter() { if (window.ekoTalk) ekoTalk.chatter(); },
  };
})();
