// El Valle de Eko (fase 1): su casa por fuera, el camino, el cielo real y la niebla de lo que aún no está abierto.
// Vista lateral a pantalla completa. Haces clic y Eko va; él comenta el paisaje. Esc o «Volver a casa» para salir.
(() => {
  "use strict";
  const T = window.__TAURI__;
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const emit = (n, p) => T && T.event.emit(n, p || {});
  let name = "Eko";
  try { name = (JSON.parse(localStorage.getItem("eko-settings") || "{}").petName || "Eko").trim() || "Eko"; } catch (_) {}
  let room = {};
  try { room = JSON.parse(localStorage.getItem("eko-corner") || "{}"); } catch (_) {}

  // ---------- Medidas (todo escala con la altura de la pantalla) ----------
  let W = innerWidth, H = innerHeight, k = H / 1080;
  const G = () => 300 * k;                                  // alto del suelo
  const groundTop = () => H - G();
  const PATH = () => groundTop() + G() * 0.25;              // donde pisa Eko (el camino de tierra)
  const BACK = () => groundTop() + G() * 0.12;              // base de lo que está detrás del camino
  const FRONT = () => groundTop() + G() * 0.52;             // base de lo que está delante
  const OPEN = { x0: 140, x1: 2050 };                       // zona abierta en la fase 1 (en «unidades de 1080p»)
  const WORLD = 2600;
  const U = (u) => u * k;                                   // unidades → px

  // ---------- Cielo real: hora y estación ----------
  const SKY = { day: ["#8EC3EC", "#D3E9F7"], dawn: ["#F6C59B", "#CFE0EE"], dusk: ["#5C5C9E", "#F3A58A"], night: ["#141B3D", "#34406B"] };
  function phase() { const h = new Date().getHours() + new Date().getMinutes() / 60; return h >= 21.5 || h < 6.5 ? "night" : h >= 19.5 ? "dusk" : h < 8 ? "dawn" : "day"; }
  for (let i = 0; i < 60; i++) { const s = document.createElement("i"); s.style.left = Math.random() * 100 + "%"; s.style.top = Math.random() * 55 + "%"; $("#stars").appendChild(s); }
  const clouds = [];
  for (let i = 0; i < 6; i++) { const c = document.createElement("img"); c.src = "art/valley/cloud.webp"; c.alt = ""; c.draggable = false; c.className = "cloud"; const w = 140 + Math.random() * 160; c.style.width = w + "px"; c.style.height = "auto"; c.style.top = 6 + Math.random() * 30 + "%"; $("#clouds").appendChild(c); clouds.push({ el: c, x: Math.random() * 2400, v: 6 + Math.random() * 10, par: 0.05 + Math.random() * 0.08 }); }
  function sky() {
    const p = phase(), [a, b] = SKY[p];
    $("#sky").style.background = `linear-gradient(${a}, ${b} 70%)`;
    document.body.classList.toggle("night", p === "night");
    document.body.classList.toggle("lit", p === "night" || p === "dusk");
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    const sun = $("#sun"), night = p === "night";
    const t = night ? ((h + 24 - 21.5) % 24) / 9 : clamp((h - 6.5) / 15, 0, 1);
    sun.style.left = lerp(8, 86, t) + "%"; sun.style.top = (34 - Math.sin(Math.PI * t) * 26) + "%";
    sun.style.backgroundImage = `url(art/valley/${night ? "moon" : "sun"}.webp)`;
    sun.style.filter = night ? "drop-shadow(0 0 18px rgba(255,248,220,.45))" : "drop-shadow(0 0 30px rgba(255,214,120,.55))";
    sun.style.width = sun.style.height = (night ? 110 : 150) * k + "px";
    for (const c of clouds) c.el.style.opacity = night ? 0.25 : 0.9;
    // estación: nieve o hojas
    const m = new Date().getMonth() + 1, w = m === 12 || m <= 2 ? "snow" : m === 10 || m === 11 ? "leaves" : "";
    if (w !== sky.w) {
      sky.w = w; document.querySelectorAll(".flake").forEach((f) => f.remove());
      if (w) for (let i = 0; i < 40; i++) { const f = document.createElement("div"); f.className = "flake" + (w === "leaves" ? " leaf" : ""); f.style.left = Math.random() * 100 + "%"; f.style.animationDuration = 6 + Math.random() * 8 + "s"; f.style.animationDelay = -Math.random() * 12 + "s"; if (w === "leaves") f.style.background = ["#D0795A", "#E9A93B", "#C9A27A"][i % 3]; document.body.appendChild(f); }
    }
  }

  // ---------- Escenario ----------
  const back = $("#backL"), front = $("#frontL");
  const props = [];
  function prop(src, ux, uh, layer, base, o = {}) {
    const el = document.createElement("div"); el.className = "prop" + (o.sway ? " sway" : "");
    el.innerHTML = `<img src="art/valley/${src}" alt="" draggable="false">`;
    (layer === "front" ? front : back).appendChild(el);
    const p = { el, src, ux, uh, ar: o.ar || 1, base, o };
    props.push(p);
    if (o.click) el.addEventListener("click", (e) => { e.stopPropagation(); o.click(p); });
    return p;
  }
  // casa (relación de aspecto 489×354); la puerta está al 36 % del ancho
  const house = prop("house.webp", 900, 470, "back", "back", { ar: 489 / 354, click: () => goTo(900 - 470 * 489 / 354 * 0.14, () => enterHouse()) });
  // farolillos y ventana de la casa (se encienden de noche)
  const GLOWS = [[0.26, 0.24, 46], [0.31, 0.37, 36], [0.12, 0.55, 40], [0.79, 0.24, 46], [0.90, 0.57, 40], [0.66, 0.69, 70]];
  for (const [gx, gy, gs] of GLOWS) { const g = document.createElement("div"); g.className = "glow"; g.dataset.g = [gx, gy, gs]; house.el.appendChild(g); }
  prop("tree.webp", 280, 360, "back", "back", { ar: 317 / 400, sway: true, click: () => goTo(330, () => say(pick(["Este árbol es mi favorito", "Aquí da una sombrita estupenda", "Algún día le pondré un columpio"]))) });
  prop("bush.webp", 560, 120, "back", "back", { ar: 360 / 314, click: () => goTo(560, () => say(pick(["¡Qué florecitas!", "Huele a primavera", "Las flores lilas son las mejores"]))) });
  prop("fence.webp", 1300, 90, "back", "back", { ar: 663 / 168 });
  prop("bush.webp", 1560, 100, "back", "back", { ar: 360 / 314 });
  prop("tree.webp", 1820, 400, "back", "back", { ar: 317 / 400, sway: true, click: () => goTo(1780, () => say(pick(["Desde aquí se ve todo el valle", "Este árbol es muy viejo… y muy sabio"]))) });
  const lamps = [prop("lamp.webp", 420, 240, "front", "front", { ar: 83 / 320 }), prop("lamp.webp", 1460, 240, "front", "front", { ar: 83 / 320 })];
  for (const l of lamps) { const g = document.createElement("div"); g.className = "glow"; g.dataset.g = [0.5, 0.14, 120]; l.el.appendChild(g); l.el.addEventListener("click", (e) => { e.stopPropagation(); goTo(l.ux + 40, () => say(phase() === "night" ? "De noche se encienden solas" : "Por la noche esto brilla muchísimo")); }); }
  const sign = prop("sign.webp", 1180, 190, "front", "front", { ar: 261 / 320, click: () => goTo(1140, () => say(`«El Valle de ${name}». ¡Bienvenido a mi valle!`)) });
  const st = document.createElement("div"); st.id = "signText"; st.textContent = `El Valle\nde ${name}`; st.style.whiteSpace = "pre"; sign.el.appendChild(st);
  // niebla: lo que todavía no se puede visitar
  const fogR = document.createElement("div"); fogR.id = "fogR"; back.parentNode.appendChild(fogR);
  const fogL = document.createElement("div"); fogL.id = "fogL"; back.parentNode.appendChild(fogL);
  for (let i = 0; i < 6; i++) { const m = document.createElement("div"); m.className = "mist"; m.style.animationDelay = -i * 1.5 + "s"; fogR.appendChild(m); }

  function layout() {
    W = innerWidth; H = innerHeight; k = H / 1080;
    $("#ground").style.height = G() + "px";
    $("#far").style.height = 210 * k + "px"; $("#far").style.bottom = G() * 0.78 + "px"; $("#far").style.backgroundImage = "url(art/valley/hills-far.webp)";
    $("#mid").style.height = 190 * k + "px"; $("#mid").style.bottom = G() * 0.7 + "px"; $("#mid").style.backgroundImage = "url(art/valley/hills-mid.webp)";
    $("#ground").style.backgroundImage = "url(art/valley/ground.webp)";
    $("#world").style.width = U(WORLD) + "px";
    for (const p of props) {
      const h = U(p.uh), w = h * p.ar;
      const by = p.base === "front" ? FRONT() : BACK();
      Object.assign(p.el.style, { left: U(p.ux) - w / 2 + "px", top: by - h + "px", width: w + "px", height: h + "px", zIndex: p.base === "front" ? 30 : 5 });
      p.el.querySelectorAll(".glow").forEach((g) => { const [gx, gy, gs] = g.dataset.g.split(",").map(Number); const s = U(gs); Object.assign(g.style, { left: gx * w - s / 2 + "px", top: gy * h - s / 2 + "px", width: s + "px", height: s + "px" }); });
    }
    const sb = sign.el; Object.assign(st.style, { left: "8%", width: "84%", top: "16%", fontSize: U(24) + "px" });
    Object.assign(fogR.style, { left: U(OPEN.x1 - 120) + "px", width: U(WORLD - OPEN.x1 + 400) + "px", zIndex: 40 });
    Object.assign(fogL.style, { left: U(-400) + "px", width: U(OPEN.x0 + 380) + "px", zIndex: 40 });
    fogR.querySelectorAll(".mist").forEach((m, i) => Object.assign(m.style, { left: U(160 + (i % 3) * 110) + "px", top: H * (0.35 + 0.1 * i) + "px", width: U(360) + "px", height: U(200) + "px" }));
    void sb;
    placeEko();
  }

  // ---------- Eko ----------
  const box = $("#ekoBox"), tpl = $("#ekoTpl");
  const eko = document.createElement("div"); eko.id = "eko"; eko.dataset.eyes = "open"; eko.dataset.brows = "none"; eko.dataset.mood = "normal";
  const svg = tpl.querySelector("svg"); eko.appendChild(svg); tpl.remove(); box.appendChild(eko);
  const bub = document.createElement("div"); bub.id = "bub"; box.appendChild(bub);
  const el = { pet: svg.querySelector("#pet"), legL: svg.querySelector("#legL"), legR: svg.querySelector("#legR"), armL: svg.querySelector("#armL"), armR: svg.querySelector("#armR"), head: svg.querySelector("#head"), upper: svg.querySelector("#upper") };
  const E = { x: 900 - 470 * 489 / 354 * 0.14, tx: null, then: null, v: 0, ph: 0, t: 0, face: 1, blinkAt: 2, entering: 0, exiting: 0, talkUntil: 0, wave: 0 };
  const EH = () => U(160);                                   // alto de Eko en el valle
  function placeEko() {
    const h = EH(), w = h * 240 / 310;
    svg.style.width = w + "px"; svg.style.height = h + "px";
    eko.style.width = w + "px"; eko.style.height = h + "px";
  }
  function say(t, ms = 2600) {
    bub.textContent = t; bub.classList.add("on"); E.talkUntil = E.t + ms / 1000;
    clearTimeout(say.tm); say.tm = setTimeout(() => bub.classList.remove("on"), ms);
  }
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function goTo(ux, then) { if (E.entering || E.exiting) return; E.tx = clamp(ux, OPEN.x0 + 20, OPEN.x1 - 60); E.then = then || null; if (ux > OPEN.x1 - 60) E.fog = true; }
  document.addEventListener("click", (e) => {
    if (e.target.closest("#back") || e.target.closest(".prop") || e.target.closest("#eko")) return;
    goTo((e.clientX + cam) / k);
  });
  eko.addEventListener("click", (e) => { e.stopPropagation(); E.wave = E.t; say(pick(["¡Hola!", "¿Damos un paseo?", "¡Qué bien se está aquí fuera!", "¿A dónde vamos?"])); });

  // Entrar en casa = volver al escritorio
  function enterHouse() {
    if (E.exiting) return;
    E.exiting = E.t;
    say(pick(["¡A casa!", "Hogar, dulce hogar", "Vamos para dentro"]), 1400);
    setTimeout(() => $("#cover").classList.remove("off"), 900);
    setTimeout(() => emit("world-exit"), 2100);
  }
  $("#back").addEventListener("click", (e) => { e.stopPropagation(); goTo(house.ux - 470 * 489 / 354 * 0.14, () => enterHouse()); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") { E.tx = null; enterHouse(); } });
  addEventListener("resize", layout);

  // ---------- Bucle ----------
  let cam = 0, last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; E.t += dt;
    // paseo
    let walking = false;
    if (E.tx != null && !E.exiting) {
      const d = E.tx - E.x;
      if (Math.abs(d) < 4) { E.tx = null; const f = E.then; E.then = null; if (E.fog) { E.fog = false; say(pick(["Más allá hay niebla… algún día exploraremos", "Uy, por ahí aún no se puede pasar", "¿Qué habrá detrás de la niebla?"])); } if (f) f(); }
      else { walking = true; E.face = Math.sign(d); E.x += E.face * Math.min(Math.abs(d), 230 * dt); }
    }
    E.ph += dt * (walking ? 9 : 0);
    // Eko: posición, entrar/salir por la puerta
    const h = EH(), w = h * 240 / 310;
    let y = PATH(), sc = 1, op = 1;
    if (E.entering) { const q = clamp((E.t - E.entering) / 1.1, 0, 1); y = lerp(BACK() - U(6), PATH(), q); sc = lerp(0.82, 1, q); op = Math.min(1, q * 3); if (q >= 1) E.entering = 0; }
    if (E.exiting) { const q = clamp((E.t - E.exiting) / 1.1, 0, 1); y = lerp(PATH(), BACK() - U(6), q); sc = lerp(1, 0.82, q); op = 1 - clamp((q - 0.6) / 0.4, 0, 1); }
    const bob = walking ? Math.abs(Math.sin(E.ph)) * U(6) : Math.sin(E.t * 2) * U(1.5);
    Object.assign(eko.style, { left: U(E.x) - (w * sc) / 2 + "px", top: y - h * sc - bob + "px", transform: `scale(${sc})`, transformOrigin: "50% 100%", opacity: op, zIndex: 20 });
    Object.assign(bub.style, { left: U(E.x) + "px", top: y - h * sc - U(14) + "px", zIndex: 45 });
    // cuerpo: patas, brazos, cabeza, parpadeo
    const s = Math.sin(E.ph), wav = E.t - E.wave < 1.4 ? Math.sin((E.t - E.wave) * 14) : 0;
    el.legL.setAttribute("transform", `rotate(${(walking ? s * 22 : 0).toFixed(1)} -21 122)`);
    el.legR.setAttribute("transform", `rotate(${(walking ? -s * 22 : 0).toFixed(1)} 21 122)`);
    el.armL.setAttribute("transform", `rotate(${(walking ? -s * 18 : 4 + Math.sin(E.t * 2) * 2).toFixed(1)} -50 58)`);
    el.armR.setAttribute("transform", `rotate(${(wav ? -120 + wav * 18 : walking ? -s * 18 : -4 - Math.sin(E.t * 2) * 2).toFixed(1)} 50 58)`);
    el.head.setAttribute("transform", `translate(${(E.face * (walking ? 4 : 0)).toFixed(1)} 0) rotate(${(walking ? E.face * 3 : Math.sin(E.t * 0.7) * 2).toFixed(1)} 0 40)`);
    el.pet.setAttribute("transform", `rotate(${(walking ? E.face * 4 : 0).toFixed(1)} 0 176)`);
    if (E.t > E.blinkAt) { eko.dataset.eyes = "closed"; if (E.t > E.blinkAt + 0.13) { eko.dataset.eyes = E.t < E.talkUntil ? "happy" : "open"; E.blinkAt = E.t + 2 + Math.random() * 4; } }
    // cámara: sigue a Eko con suavidad
    const want = clamp(U(E.x) - W / 2, U(OPEN.x0 - 300), U(WORLD) - W);
    cam = lerp(cam, want, 1 - Math.pow(0.02, dt));
    $("#world").style.transform = `translateX(${-cam}px)`;
    $("#ground").style.backgroundPositionX = -cam + "px";
    $("#mid").style.backgroundPositionX = -cam * 0.5 + "px";
    $("#far").style.backgroundPositionX = -cam * 0.25 + "px";
    for (const c of clouds) { c.x += c.v * dt; const x = ((c.x - cam * c.par) % (W + 400) + (W + 400)) % (W + 400) - 300; c.el.style.left = x + "px"; }
    requestAnimationFrame(frame);
  }

  // Comentarios sueltos mientras paseáis
  setInterval(() => {
    if (E.t < E.talkUntil + 6 || E.exiting || Math.random() < 0.5) return;
    const p = phase();
    say(pick(p === "night" ? ["Mira cuántas estrellas", "Qué tranquilo está el valle de noche", "Los farolillos de casa son mi parte favorita"] : p === "dusk" ? ["Qué atardecer más bonito", "El cielo se está poniendo naranja"] : sky.w === "snow" ? ["¡Está nevando!", "Brrr… qué frío"] : sky.w === "leaves" ? ["Me encanta el ruido de las hojas", "Ya es otoño en el valle"] : ["Qué buen día hace", "Me encanta pasear contigo", "¿Oyes los pájaros?", "Huele a hierba recién cortada"]), 2800);
  }, 9000);

  // ---------- Arranque ----------
  $("#title").textContent = `El Valle de ${name}`;
  layout(); sky(); setInterval(sky, 60000);
  cam = clamp(U(E.x) - W / 2, U(OPEN.x0 - 300), U(WORLD) - W);
  E.entering = 0.001;
  requestAnimationFrame((t) => { last = t; frame(t); });
  setTimeout(() => $("#cover").classList.add("off"), 150);
  setTimeout(() => $("#title").classList.add("on"), 700);
  setTimeout(() => $("#title").classList.remove("on"), 4500);
  setTimeout(() => say(pick([`¡Bienvenido al Valle de ${name}!`, "¡Mira, esta es mi casa por fuera!", "¡Ya estamos fuera! ¿Damos una vuelta?"]), 3200), 1300);
  void room;
})();
