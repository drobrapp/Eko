// Eko TV · el «cerebro» de la tele. Dibuja el Valle (zona principal y huerto, como src/world.js) y lleva a Eko de paseo:
// elige un sitio, va andando, hace su gesto y comenta algo de ese sitio. Nada se toca: es un salvapantallas.
// Eko es el mismo de la app del móvil (eko/overlay.html), dentro de un marco; se le habla con postMessage, como en su casa.
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const Q = new URLSearchParams(location.search);
  // ?demo=1 → comenta mucho más a menudo (para probar) · ?h=22.5 → finge esa hora · ?debug=1 → datos en pantalla
  const DEMO = Q.get("demo") === "1";
  const FAKE_H = Q.has("h") ? parseFloat(Q.get("h")) : null;
  const DEBUG = Q.get("debug") === "1";
  const L = window.EkoTvLines;
  const petName = "Eko", userName = "";     // fase 0.2: llegan del PC

  // ---------- Reloj ----------
  const hour = () => { if (FAKE_H != null) return FAKE_H; const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
  // mismas franjas que el Valle del PC (world.js:28)
  const phase = () => { const h = hour(); return h >= 21.5 || h < 6.5 ? "night" : h >= 19.5 ? "dusk" : h < 8 ? "dawn" : "day"; };
  const bedTime = () => { const h = hour(); return h >= 23.5 || h < 6.5; };
  const month = () => new Date().getMonth() + 1;
  const weather = () => { const m = month(); return m === 12 || m <= 2 ? "snow" : m === 10 || m === 11 ? "leaves" : ""; };
  function allowed(when) {
    if (!when) return true;
    const p = phase();
    if (when === "day") return p === "day" || p === "dawn";
    if (when === "night") return p === "night";
    if (when === "dusk") return p === "dusk";
    if (when === "spring") return month() >= 3 && month() <= 8;
    if (when === "winter") return weather() === "snow";
    if (when === "autumn") return weather() === "leaves";
    return false;   // "never" y lo que no se conozca
  }

  // ---------- Medidas (todo escala con la altura de la pantalla, en «unidades de 1080p») ----------
  let W = innerWidth, H = innerHeight, k = H / 1080;
  const G = () => 300 * k;
  const groundTop = () => H - G();
  const PATH = () => groundTop() + G() * 0.29;     // donde pisa Eko
  const BACK = () => groundTop() + G() * 0.215;
  const FRONT = () => groundTop() + G() * 0.37;
  const OPEN = { x0: 140, x1: 3760 };               // de la casa al pozo; más allá, niebla (el estanque no se enseña)
  const WORLD = 4300;
  const U = (u) => u * k;
  // Alto de Eko: en el Valle del PC son 160 unidades (world.js:884); aquí ~170, apenas más grande para verlo desde el sofá.
  // (el SVG de overlay.html mide 141 px a escala 1)
  const SCALE = 1.2;

  // ---------- Cielo real: hora y estación (como world.js:27-60) ----------
  const SKY = { day: ["#8EC3EC", "#D3E9F7"], dawn: ["#F6C59B", "#CFE0EE"], dusk: ["#5C5C9E", "#F3A58A"], night: ["#141B3D", "#34406B"] };
  for (let i = 0; i < 70; i++) { const s = document.createElement("i"); s.style.left = Math.random() * 100 + "%"; s.style.top = Math.random() * 55 + "%"; $("#stars").appendChild(s); }
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    const c = document.createElement("img"); c.src = "art/valley/cloud.webp"; c.alt = ""; c.className = "cloud";
    c.style.top = 6 + Math.random() * 30 + "%"; $("#clouds").appendChild(c);
    clouds.push({ el: c, x: Math.random() * 2400, v: 4 + Math.random() * 7, w: 160 + Math.random() * 180 });
  }
  function sky() {
    const p = phase(), [a, b] = SKY[p], h = hour(), night = p === "night";
    $("#sky").style.background = `linear-gradient(${a}, ${b} 70%)`;
    document.body.classList.toggle("night", night);
    document.body.classList.toggle("lit", night || p === "dusk");
    const sun = $("#sun");
    const t = night ? ((h + 24 - 21.5) % 24) / 9 : clamp((h - 6.5) / 15, 0, 1);
    sun.style.left = lerp(8, 86, t) + "%"; sun.style.top = (34 - Math.sin(Math.PI * t) * 26) + "%";
    sun.style.backgroundImage = `url(art/valley/${night ? "moon" : "sun"}.webp)`;
    sun.style.filter = night ? "drop-shadow(0 0 18px rgba(255,248,220,.45))" : "drop-shadow(0 0 30px rgba(255,214,120,.55))";
    sun.style.width = sun.style.height = (night ? 120 : 160) * k + "px";
    for (const c of clouds) c.el.style.opacity = night ? 0.25 : 0.9;
    const w = weather();
    if (w !== sky.w) {
      sky.w = w; document.querySelectorAll(".flake").forEach((f) => f.remove());
      if (w) for (let i = 0; i < 24; i++) {
        const f = document.createElement("div"); f.className = "flake" + (w === "leaves" ? " leaf" : "");
        f.style.left = Math.random() * 100 + "%"; f.style.animationDuration = 8 + Math.random() * 10 + "s"; f.style.animationDelay = -Math.random() * 14 + "s";
        if (w === "leaves") f.style.background = ["#D0795A", "#E9A93B", "#C9A27A"][i % 3];
        document.body.appendChild(f);
      }
    }
  }

  // ---------- Escenario: los mismos objetos y posiciones que world.js:88-153 ----------
  const back = $("#backL"), front = $("#frontL");
  const props = [];
  function prop(src, ux, uh, layer, ar, o = {}) {
    const el = document.createElement("div"); el.className = "prop" + (o.sway ? " sway" : "");
    el.innerHTML = `<img src="art/valley/${src}" alt="">`;
    (layer === "front" ? front : back).appendChild(el);
    const p = { el, ux, uh, ar, base: layer, o }; props.push(p); return p;
  }
  function glows(p, list) { for (const g of list) { const d = document.createElement("div"); d.className = "glow"; d.dataset.g = g.join(","); p.el.appendChild(d); } }
  const house = prop("house.webp", 900, 560, "back", 1102 / 971);
  glows(house, [[0.31, 0.19, 50], [0.67, 0.24, 42], [0.08, 0.54, 50], [0.96, 0.63, 50], [0.62, 0.62, 70]]);
  prop("tree.webp", 280, 360, "back", 736 / 800, { sway: true });
  prop("bush.webp", 560, 120, "back", 786 / 710);
  prop("fence.webp", 1300, 90, "back", 900 / 338);
  prop("bush.webp", 1560, 100, "back", 786 / 710);
  prop("tree.webp", 1820, 400, "back", 736 / 800, { sway: true });
  for (const x of [420, 1460]) glows(prop("lamp.webp", x, 260, "front", 162 / 800), [[0.54, 0.17, 120]]);
  const sign = prop("sign.webp", 1180, 240, "front", 379 / 700);
  const signText = document.createElement("div"); signText.id = "signText"; signText.textContent = `El Valle\nde ${petName}`; sign.el.appendChild(signText);
  // Huerto: girasoles, arco, cobertizo, bancales (vacíos de momento), Don Paja, pozo, regadera, semillas y carretilla
  const sunflowers = document.createElement("div"); sunflowers.id = "sunflowers"; back.appendChild(sunflowers);
  const arch = prop("h-arch.webp", 2260, 360, "back", 697 / 900);
  const plaque = document.createElement("div"); plaque.className = "plaque"; plaque.textContent = "Huerto"; arch.el.appendChild(plaque);
  prop("h-shed.webp", 2520, 290, "back", 900 / 820);
  for (const x of [2860, 3290]) prop("g-bed.webp", x, 66, "back", 1000 / 202);
  prop("h-scarecrow.webp", 3075, 250, "back", 572 / 800, { sway: true });
  prop("h-well.webp", 3560, 230, "back", 627 / 800);
  prop("g-can.webp", 2590, 58, "front", 500 / 265);
  prop("g-seeds.webp", 2660, 82, "front", 436 / 500);
  prop("h-barrow.webp", 3090, 92, "front", 600 / 253);
  // Niebla a los lados: a la derecha tapa el arroyo y el estanque
  const fogR = document.createElement("div"); fogR.id = "fogR"; $("#world").appendChild(fogR);
  const fogL = document.createElement("div"); fogL.id = "fogL"; $("#world").appendChild(fogL);
  for (let i = 0; i < 6; i++) { const m = document.createElement("div"); m.className = "mist"; m.style.animationDelay = -i * 1.5 + "s"; fogR.appendChild(m); }

  function layout() {
    W = innerWidth; H = innerHeight; k = H / 1080;
    $("#ground").style.height = G() + "px"; $("#ground").style.backgroundImage = "url(art/valley/ground.webp)";
    $("#far").style.height = 210 * k + "px"; $("#far").style.bottom = G() * 0.78 + "px"; $("#far").style.backgroundImage = "url(art/valley/hills-far.webp)";
    $("#mid").style.height = 190 * k + "px"; $("#mid").style.bottom = G() * 0.7 + "px"; $("#mid").style.backgroundImage = "url(art/valley/hills-mid.webp)";
    for (const id of ["#far", "#mid", "#ground"]) $(id).style.width = U(WORLD) + W + "px";   // anchas: se desplazan sin repintar
    $("#world").style.width = U(WORLD) + "px";
    for (const p of props) {
      const h = U(p.uh), w = h * p.ar, by = p.base === "front" ? FRONT() : BACK();
      Object.assign(p.el.style, { left: U(p.ux) - w / 2 + "px", top: by - h + "px", width: w + "px", height: h + "px", zIndex: p.base === "front" ? 30 : 5 });
      p.el.querySelectorAll(".glow").forEach((g) => { const [gx, gy, gs] = g.dataset.g.split(",").map(Number), s = U(gs); Object.assign(g.style, { left: gx * w - s / 2 + "px", top: gy * h - s / 2 + "px", width: s + "px", height: s + "px" }); });
    }
    Object.assign(signText.style, { left: "4%", width: "92%", top: "13%", fontSize: U(21) + "px" });
    Object.assign(plaque.style, { left: "32%", width: "36%", top: "19%", height: "10%", fontSize: U(20) + "px", lineHeight: U(34) + "px" });
    Object.assign(sunflowers.style, { left: U(2300) + "px", width: U(1660) + "px", top: groundTop() + G() * 0.14 - U(230) + "px", height: U(240) + "px", backgroundSize: "auto 100%" });
    Object.assign(fogR.style, { left: U(OPEN.x1 - 120) + "px", width: U(WORLD - OPEN.x1 + 400) + "px", zIndex: 40 });
    Object.assign(fogL.style, { left: U(-400) + "px", width: U(OPEN.x0 + 380) + "px", zIndex: 40 });
    fogR.querySelectorAll(".mist").forEach((m, i) => Object.assign(m.style, { left: U(160 + (i % 3) * 110) + "px", top: H * (0.35 + 0.1 * i) + "px", width: U(360) + "px", height: U(200) + "px" }));
    for (const c of clouds) { c.el.style.width = c.w * k + "px"; c.el.style.height = "auto"; }
    $("#bub").style.fontSize = 40 * k + "px";
    $("#bub").style.padding = `${0.45}em ${0.85}em`;
    $("#bub").style.maxWidth = 900 * k + "px";
    sky();
  }
  addEventListener("resize", layout);

  // ---------- Eko ----------
  const frame = $("#eko");
  let ekoReady = false;
  const send = (fn, ...args) => ekoReady && frame.contentWindow && frame.contentWindow.postMessage({ eko: fn, args }, "*");
  let status = "marco: cargando";             // se ve con ?debug=1
  addEventListener("error", (e) => { status += " · error: " + e.message + " " + String(e.filename || "").split("/").pop() + ":" + e.lineno; });
  addEventListener("message", (e) => {
    const d = e.data || {};
    if (d.ready !== undefined) { ekoReady = !!d.ready; status = "marco: " + (d.ready ? "Eko listo" : "sin Eko"); send("set", E.mode === "sleep" ? "sleep" : "idle", E.dir); }
    if (d.error) status += " · error en Eko: " + d.error;   // overlay.html avisa de sus errores al marco de fuera
  });
  frame.addEventListener("load", () => { if (status === "marco: cargando") status = "marco: cargado, sin respuesta"; });
  // ?x=2900 → empieza ahí (para probar el huerto)
  const start = Q.has("x") ? { x: +Q.get("x") } : pick(L.PLACES.slice(0, 6));
  const E = { x: start.x, dir: 1, mode: "idle", target: null, place: null, onArrive: null, next: performance.now() + 3000, last: null };
  const speed = () => { const p = phase(); return p === "night" ? 85 : p === "dusk" || p === "dawn" ? 100 : 125; };   // unidades por segundo: sin prisa

  function walkTo(place, then) {
    E.target = clamp(place.x, OPEN.x0 + 40, OPEN.x1 - 80); E.place = place; E.onArrive = then || null;
    if (Math.abs(E.target - E.x) < 10) { arrive(); return; }
    E.mode = "walk"; E.dir = E.target > E.x ? 1 : -1; send("set", "walk", E.dir);
  }
  function arrive() {
    E.mode = "idle"; E.target = null; send("set", "idle", E.dir);
    const t = E.onArrive; E.onArrive = null; t && t();
  }
  function rest(min, max) { E.mode = "idle"; E.next = performance.now() + rnd(min, max) * 1000; }

  // Gestos al llegar a cada sitio (los de anim.js)
  function gesture(place) {
    switch (place.gesture) {
      case "lookUp": send("act", "lookAround"); break;
      case "look": send("act", "curious", { dir: E.dir }); break;
      case "smell": send("express", "enamorado", 3); send("fx", "heart", 2); if (place.butterflies) butterflies(place.x); break;
      case "wave": send("act", "wave"); break;
      case "point": send("act", "point"); break;
      case "scratch": send("act", "scratch"); break;
      case "crouch": send("act", "think"); break;
      case "well": send("act", "knock"); break;
    }
  }
  function butterflies(ux) {
    for (let i = 0; i < 3; i++) {
      const b = document.createElement("img"); b.src = "art/valley/g-mariposa.webp"; b.alt = ""; b.className = "fly";
      const s = U(46 + Math.random() * 16);
      Object.assign(b.style, { left: U(ux) + rnd(-U(60), U(60)) + "px", top: BACK() - U(110) + "px", width: s + "px", height: "auto", animationDelay: i * 0.25 + "s" });
      b.style.setProperty("--dx", rnd(-U(260), U(260)) + "px"); b.style.setProperty("--dy", -rnd(U(160), U(320)) + "px");
      $("#world").appendChild(b); setTimeout(() => b.remove(), 4800);
    }
  }

  // ---------- Lo que dice ----------
  const bub = $("#bub");
  let bubT = 0, bubUntil = 0, lastTalk = -1e9;
  // Entre comentario y comentario: 4-8 min (en la tele nadie quiere un charlatán). En modo demo, mucho más a menudo.
  const gapMs = () => DEMO ? rnd(20, 45) * 1000 : rnd(4, 8) * 60000;
  let nextGap = DEMO ? 0 : rnd(60, 120) * 1000;
  const canTalk = () => E.mode !== "sleep" && performance.now() - lastTalk > nextGap;
  const fill = (t) => t.replace("{name}", petName).replace(/,? ?\{user\}/, userName ? ", " + userName : "");
  // No repetir: lo dicho hoy se guarda; si ya se ha dicho todo lo de un sitio, se permite repetir lo más antiguo
  const today = () => new Date().toDateString();
  let said = { day: today(), list: [] };
  try { const s = JSON.parse(localStorage.getItem("eko-tv-said") || "null"); if (s && s.day === today()) said = s; } catch (_) {}
  function choose(list) {
    if (said.day !== today()) said = { day: today(), list: [] };
    const ok = list.filter((l) => allowed(l.when)).map((l) => l.t);
    if (!ok.length) return null;
    const fresh = ok.filter((t) => !said.list.includes(t));
    return fresh.length ? pick(fresh) : ok.reduce((a, b) => (said.list.indexOf(a) < said.list.indexOf(b) ? a : b));
  }
  function say(text, force) {
    if (!text || (!force && !canTalk())) return false;
    said.list = said.list.filter((t) => t !== text).concat(text);
    try { localStorage.setItem("eko-tv-said", JSON.stringify(said)); } catch (_) {}
    bub.textContent = fill(text); bub.classList.add("on");
    const ms = clamp(2500 + 70 * text.length, 4000, 9000);
    clearTimeout(bubT); bubT = setTimeout(() => bub.classList.remove("on"), ms);
    bubUntil = performance.now() + ms; lastTalk = performance.now(); nextGap = gapMs();
    E.next = Math.max(E.next, performance.now() + ms + 800);   // no se va mientras habla
    return true;
  }

  // ---------- Rutina ----------
  let lastTrick = -1e9;
  function roam() {
    if (bedTime()) { goToBed(); return; }
    // De vez en cuando, un comentario del cielo o de la estación sin moverse
    if (canTalk() && Math.random() < 0.25) { const t = choose(L.SKY); if (t) { send("act", "lookAround"); setTimeout(() => say(t), 900); rest(8, 14); return; } }
    // Alguna travesura suelta (las del PC) o un baile, muy de vez en cuando
    const r = Math.random();
    if (r < 0.06) { send("act", pick(["drawAir", "mumble", "bored", "knock"])); rest(8, 12); return; }
    if (r < 0.09 && phase() === "day") { send("dance", 6); rest(9, 12); return; }
    const trickGap = DEMO ? 5 * 60000 : 3 * 3600000;
    if (r < 0.11 && performance.now() - lastTrick > trickGap && phase() === "day") { lastTrick = performance.now(); send("act", pick(["pirouette", "flip"])); rest(6, 9); return; }
    // Paseo con intención: un sitio no muy lejos (para que no se pase la vida andando) y distinto del último
    const near = L.PLACES.filter((p) => p !== E.last && Math.abs(p.x - E.x) < 1500);
    const place = pick(near.length ? near : L.PLACES.filter((p) => p !== E.last));
    E.last = place;
    walkTo(place, () => {
      gesture(place);
      const chance = DEMO ? 0.85 : 0.5;
      if (Math.random() < chance) setTimeout(() => { if (E.mode === "idle") say(choose(place.lines)); }, 1300);
      const p = phase();
      if (p === "night" && Math.random() < 0.3) setTimeout(() => send("prop", "nightcap", 300), 2500);
      rest(...(p === "dusk" ? [14, 26] : p === "night" ? [16, 30] : [8, 16]));
    });
  }
  function goToBed() {
    const home = { x: 760 };
    if (E.mode === "sleep") return;
    walkTo(home, () => {
      say(pick(L.BED), true);
      send("act", "yawn");
      setTimeout(() => { E.mode = "sleep"; send("set", "sleep", E.dir); $("#dim").classList.add("on"); }, 3500);
    });
  }
  function wake() {
    E.mode = "idle"; $("#dim").classList.remove("on"); send("wake");
    E.next = performance.now() + 4000;
    setTimeout(() => say(pick(L.MORNING), true), 2500);
  }

  // ---------- Bucle: a la velocidad de la pantalla, moviendo solo con transform (lo hace la GPU, sin repintar) ----------
  let cam = 0, last = performance.now();
  const T = (el, x, y, s) => { el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)` + (s ? ` scale(${s})` : ""); };
  function place() {
    const sc = SCALE * k;
    T(frame, U(E.x) - 80, PATH() - 250, sc.toFixed(3));
    // bocadillo por encima de la cabeza (con sitio para el gorro), sin salirse del margen de seguridad
    if (bub.classList.contains("on")) {
      const half = bub.offsetWidth / 2, sx = U(E.x) - cam;
      bub.style.left = clamp(sx, half + W * 0.05, W - half - W * 0.05) + "px";
      bub.style.top = Math.max(H * 0.06 + bub.offsetHeight, PATH() - 205 * sc) + "px";
    }
  }
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (E.mode === "walk") {
      const step = speed() * dt * E.dir;
      if (Math.abs(E.target - E.x) <= Math.abs(step)) { E.x = E.target; arrive(); }
      else { E.x += step; send("v", Math.round(speed() * 1.3 * E.dir), 0); }
    } else if (E.mode === "idle" && now > E.next) roam();
    // la cámara sigue a Eko muy despacio (y así el fondo nunca está quieto)
    const want = clamp(U(E.x) - W * 0.45, U(OPEN.x0 - 300), U(WORLD) - W);
    cam = lerp(cam, want, Math.min(1, dt * 0.6));
    T($("#world"), -cam, 0);
    T($("#far"), -cam * 0.15, 0); T($("#mid"), -cam * 0.35, 0); T($("#ground"), -cam, 0);
    for (const c of clouds) { c.x += c.v * dt; const X = ((c.x - cam * 0.05) % (W + 600)) - 300; T(c.el, X < -300 ? X + W + 600 : X, 0); }
    place();
    if (DEBUG) { $("#debug").style.display = "block"; $("#debug").textContent = `h=${hour().toFixed(2)} ${phase()} · ${E.mode} · x=${Math.round(E.x)} · ${E.place ? E.place.id : "-"} · ${status} · fr=${frame.getBoundingClientRect().left | 0},${frame.getBoundingClientRect().top | 0}`; }
  }

  // Cada minuto: cielo, hora de dormir y de despertar
  setInterval(() => {
    sky();
    if (E.mode === "sleep" && !bedTime()) wake();
    else if (E.mode !== "sleep" && bedTime() && E.mode !== "walk") goToBed();
  }, 60000);

  layout();
  cam = clamp(U(E.x) - W * 0.45, U(OPEN.x0 - 300), U(WORLD) - W);
  requestAnimationFrame(loop);
  // Al empezar: un saludo (o a dormir directamente si ya es tarde)
  setTimeout(() => {
    if (bedTime()) { E.mode = "sleep"; send("set", "sleep", E.dir); $("#dim").classList.add("on"); return; }
    send("act", "wave"); setTimeout(() => say(pick(L.HELLO), true), 900);
  }, 2500);
})();
