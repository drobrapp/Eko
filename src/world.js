// El Valle de Eko: su casa por fuera, el camino, el huerto, el cielo real y la niebla de lo que aún no está abierto.
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
  const PATH = () => groundTop() + G() * 0.27;              // donde pisa Eko (el camino de tierra)
  const BACK = () => groundTop() + G() * 0.14;              // base de lo que está detrás del camino
  const FRONT = () => groundTop() + G() * 0.42;             // base de lo que está delante
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
    if (o.click) el.addEventListener("click", (e) => { e.stopPropagation(); o.click(p, e); });
    return p;
  }
  // casa (1102×971); la puerta está un 18 % a la izquierda del centro
  const house = prop("house.webp", 900, 560, "back", "back", { ar: 1102 / 971, click: () => goTo(900 - 560 * 1102 / 971 * 0.18, () => enterHouse()) });
  // farolillos y ventana de la casa (se encienden de noche)
  const GLOWS = [[0.31, 0.19, 50], [0.67, 0.24, 42], [0.08, 0.54, 50], [0.96, 0.63, 50], [0.62, 0.62, 70]];
  for (const [gx, gy, gs] of GLOWS) { const g = document.createElement("div"); g.className = "glow"; g.dataset.g = [gx, gy, gs]; house.el.appendChild(g); }
  prop("tree.webp", 280, 360, "back", "back", { ar: 736 / 800, sway: true, click: () => goTo(330, () => say(pick(["Este árbol es mi favorito", "Aquí da una sombrita estupenda", "Algún día le pondré un columpio"]))) });
  prop("bush.webp", 560, 120, "back", "back", { ar: 786 / 710, click: () => goTo(560, () => say(pick(["¡Qué florecitas!", "Huele a primavera", "Las flores lilas son las mejores"]))) });
  prop("fence.webp", 1260, 90, "back", "back", { ar: 900 / 338 });
  prop("tree.webp", 1910, 400, "back", "back", { ar: 736 / 800, sway: true, click: () => goTo(1860, () => say(pick(["Desde aquí se ve todo el valle", "Este árbol es muy viejo… y muy sabio"]))) });
  const lamps = [prop("lamp.webp", 420, 260, "front", "front", { ar: 162 / 800 }), prop("lamp.webp", 1430, 260, "front", "front", { ar: 162 / 800 })];
  for (const l of lamps) { const g = document.createElement("div"); g.className = "glow"; g.dataset.g = [0.54, 0.17, 120]; l.el.appendChild(g); l.el.addEventListener("click", (e) => { e.stopPropagation(); goTo(l.ux + 40, () => say(phase() === "night" ? "De noche se encienden solas" : "Por la noche esto brilla muchísimo")); }); }
  const sign = prop("sign.webp", 1180, 240, "front", "front", { ar: 379 / 700, click: () => goTo(1140, () => say(`«El Valle de ${name}». ¡Bienvenido a mi valle!`)) });
  const st = document.createElement("div"); st.id = "signText"; st.textContent = `El Valle\nde ${name}`; st.style.whiteSpace = "pre"; sign.el.appendChild(st);

  // ---------- Huerto (fase 2): plantar, regar y cosechar en tiempo real ----------
  const testMode = (() => { try { return !!JSON.parse(localStorage.getItem("eko-settings") || "{}").testAll; } catch (_) { return false; } })();
  const GROW = testMode ? 20e3 : 3 * 3600e3;                 // tiempo mínimo entre fases (regada)
  let GD = { slots: [null, null, null], hv: { carrot: 0, tomato: 0 } };
  try { GD = Object.assign(GD, JSON.parse(localStorage.getItem("eko-garden") || "{}")); } catch (_) {}
  const gSave = () => { try { localStorage.setItem("eko-garden", JSON.stringify(GD)); } catch (_) {} };
  const BED = { ux: 1640, uh: 66, ar: 1000 / 202 };
  const bed = prop("g-bed.webp", BED.ux, BED.uh, "back", "back", { ar: BED.ar, click: (p, e) => slotAt(e) });
  const can = prop("g-can.webp", 1690, 58, "front", "front", { ar: 500 / 265, click: () => waterNext() });
  prop("g-seeds.webp", 1770, 82, "front", "front", { ar: 436 / 500, click: () => plantNext() });
  const SX = [0.2, 0.5, 0.8];                                 // huecos del bancal (fracción del ancho)
  const ART = { 0: ["g-sprout.webp", 347 / 400, 70], 1: ["g-young.webp", 500 / 475, 100], carrot: ["g-carrotplant.webp", 461 / 500, 125], tomato: ["g-tomato.webp", 447 / 600, 170] };
  const plants = SX.map((fx, i) => { const d = document.createElement("div"); d.className = "plant"; d.innerHTML = `<img alt="" draggable="false"><b class="thirst"></b>`; d.addEventListener("click", (e) => { e.stopPropagation(); act(i); }); back.appendChild(d); return d; });
  const slotX = (i) => BED.ux + (SX[i] - 0.5) * BED.uh * BED.ar;
  const stage = (s) => (s.st >= 2 ? s.c : s.st);
  const thirsty = (s) => s.st < 2 && !(s.wet > s.since);
  function grow() {
    const now = Date.now(); let ch = false;
    for (const s of GD.slots) if (s && s.st < 2 && s.wet > s.since && now - s.since >= GROW) { s.st++; s.since = now; ch = true; }
    if (ch) gSave();
    drawPlants();
  }
  function drawPlants() {
    plants.forEach((d, i) => {
      const s = GD.slots[i]; d.style.display = s ? "" : "none"; if (!s) return;
      const [src, ar, uh] = ART[stage(s)], img = d.firstChild;
      if (!img.src.endsWith(src)) img.src = "art/valley/" + src;
      d.dataset.ar = ar; d.dataset.uh = uh; d.classList.toggle("dry", thirsty(s));
    });
    gLayout();
  }
  function gLayout() {
    const bh = U(BED.uh), top = BACK() - bh, base = top + bh * 0.42;
    plants.forEach((d, i) => { if (!d.dataset.uh) return; const h = U(+d.dataset.uh), w = h * +d.dataset.ar; Object.assign(d.style, { left: U(slotX(i)) - w / 2 + "px", top: base - h + "px", width: w + "px", height: h + "px" }); });
    bed.el.style.zIndex = 6;
  }
  function slotAt(e) { const r = bed.el.getBoundingClientRect(); const f = (e.clientX - r.left) / r.width; act(f < 0.35 ? 0 : f < 0.65 ? 1 : 2); }
  // efectos
  function fx(cls, x, y, n, life) {
    for (let j = 0; j < n; j++) { const d = document.createElement("i"); d.className = cls; Object.assign(d.style, { left: x + (Math.random() - 0.5) * U(50) + "px", top: y + "px", animationDelay: j * (life / n) + "ms", "--dx": (Math.random() - 0.5) * U(80) + "px" }); front.appendChild(d); setTimeout(() => d.remove(), life + 1200); }
  }
  function floatText(t, x, y) { const d = document.createElement("div"); d.className = "gtext"; d.textContent = t; Object.assign(d.style, { left: x + "px", top: y + "px", fontSize: U(26) + "px" }); front.appendChild(d); setTimeout(() => d.remove(), 1900); }
  let gBusy = false;
  function work(pose, ms, done) { gBusy = true; E.pose = pose; E.poseT = E.t; setTimeout(() => { E.pose = null; gBusy = false; done && done(); }, ms); }
  const GL = {
    plant: ["¡A plantar!", "Una semillita aquí…", "Crece fuerte, ¿eh?", "Tapadita con tierra"],
    planted: ["¡Listo! Ahora hay que regarla", "Ya está plantada. Le falta agua", "Hecho. ¿Me pasas la regadera?"],
    water: ["¡Agüita!", "Glu, glu, glu…", "Que no le falte de nada", "Riego, riego…"],
    wait: ["Aún está creciendo, hay que tener paciencia", "Todavía le falta un poco", "Ya está regada. Ahora, a esperar", "Crece despacito, como todo lo bueno"],
    carrot: ["¡Una zanahoria enorme!", "¡Mira qué zanahoria!", "¡Zanahoria recién sacada!"],
    tomato: ["¡Tomates rojitos!", "¡Qué tomates más buenos!", "¡Cosecha de tomates!"],
    full: ["El bancal ya está lleno", "No queda sitio para más semillas"],
    nodry: ["Ahora mismo nada necesita agua", "Todo está regado"],
  };
  function act(i) {
    if (gBusy || E.exiting) return;
    goTo(slotX(i) - 90, () => {
      E.face = 1;
      const s = GD.slots[i], bx = U(slotX(i)), by = BACK() - U(BED.uh) * 0.5;
      if (!s) {
        say(pick(GL.plant), 1500);
        work("dig", 1500, () => { const c = (GD.hv.carrot || 0) <= (GD.hv.tomato || 0) ? (Math.random() < 0.65 ? "carrot" : "tomato") : (Math.random() < 0.65 ? "tomato" : "carrot"); GD.slots[i] = { c, st: 0, since: Date.now(), wet: 0 }; gSave(); drawPlants(); plants[i].classList.add("pop"); setTimeout(() => plants[i].classList.remove("pop"), 600); fx("dirt", bx, by, 8, 300); say(pick(GL.planted), 2200); });
        fx("dirt", bx, by, 10, 1200);
      } else if (thirsty(s)) {
        say(pick(GL.water), 1800);
        can.el.classList.add("held"); work("water", 1900, () => { can.el.classList.remove("held"); can.el.style.transform = ""; layout(); s.wet = Date.now(); gSave(); drawPlants(); say(pick(GL.wait), 2200); });
        setTimeout(() => fx("drop", bx, by - U(110), 14, 1200), 400);
      } else if (s.st < 2) {
        const left = Math.max(0, GROW - (Date.now() - s.since)), hrs = Math.ceil(left / 3600e3);
        say(left > 0 && !testMode ? `${pick(GL.wait)} (unas ${hrs} h)` : pick(GL.wait), 2600);
      } else {
        work("dig", 1100, () => {
          GD.hv[s.c] = (GD.hv[s.c] || 0) + (s.c === "tomato" ? 3 : 1);
          if (s.c === "carrot") { GD.slots[i] = null; const im = document.createElement("img"); im.src = "art/valley/g-carrot.webp"; im.className = "pull"; Object.assign(im.style, { left: bx - U(60) + "px", top: by - U(60) + "px", width: U(120) + "px" }); front.appendChild(im); setTimeout(() => im.remove(), 1800); }
          else { s.st = 1; s.since = Date.now(); s.wet = 0; floatText("+3 tomates", bx, by - U(150)); }
          gSave(); drawPlants(); fx("dirt", bx, by, 8, 300);
          say(pick(GL[s.c]) + (GD.hv[s.c] > 1 ? ` Ya llevamos ${GD.hv[s.c]}.` : ""), 2600);
        });
      }
    });
  }
  function plantNext() { const i = GD.slots.findIndex((s) => !s); if (i < 0) { goTo(1740, () => say(pick(GL.full))); return; } act(i); }
  function waterNext() { const i = GD.slots.findIndex((s) => s && thirsty(s)); if (i < 0) { goTo(1650, () => say(pick(GL.nodry))); return; } act(i); }
  function gardenTalk() { const n = GD.slots.filter((s) => s && thirsty(s)).length, r = GD.slots.filter((s) => s && s.st >= 2).length; return r ? "¡Hay cosas listas para cosechar en el huerto!" : n ? "Las plantas del huerto tienen sed" : GD.slots.every((s) => !s) ? "¿Plantamos algo en el huerto?" : ""; }
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
    const sb = sign.el; Object.assign(st.style, { left: "4%", width: "92%", top: "13%", fontSize: U(21) + "px" });
    Object.assign(fogR.style, { left: U(OPEN.x1 - 120) + "px", width: U(WORLD - OPEN.x1 + 400) + "px", zIndex: 40 });
    Object.assign(fogL.style, { left: U(-400) + "px", width: U(OPEN.x0 + 380) + "px", zIndex: 40 });
    fogR.querySelectorAll(".mist").forEach((m, i) => Object.assign(m.style, { left: U(160 + (i % 3) * 110) + "px", top: H * (0.35 + 0.1 * i) + "px", width: U(360) + "px", height: U(200) + "px" }));
    void sb;
    gLayout();
    placeEko();
  }

  // ---------- Eko ----------
  const box = $("#ekoBox"), tpl = $("#ekoTpl");
  const eko = document.createElement("div"); eko.id = "eko"; eko.dataset.eyes = "open"; eko.dataset.brows = "none"; eko.dataset.mood = "normal";
  const svg = tpl.querySelector("svg"); eko.appendChild(svg); tpl.remove(); box.appendChild(eko);
  const bub = document.createElement("div"); bub.id = "bub"; box.appendChild(bub);
  const shd = document.createElement("div"); shd.id = "ekoShadow"; box.appendChild(shd);
  const el = { pet: svg.querySelector("#pet"), legL: svg.querySelector("#legL"), legR: svg.querySelector("#legR"), armL: svg.querySelector("#armL"), armR: svg.querySelector("#armR"), head: svg.querySelector("#head"), upper: svg.querySelector("#upper") };
  const E = { x: 900 - 560 * 1102 / 971 * 0.18, tx: null, then: null, v: 0, ph: 0, t: 0, face: 1, blinkAt: 2, entering: 0, exiting: 0, talkUntil: 0, wave: 0 };
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
  $("#back").addEventListener("click", (e) => { e.stopPropagation(); goTo(house.ux - 560 * 1102 / 971 * 0.18, () => enterHouse()); });
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
    Object.assign(shd.style, { left: U(E.x) - w * 0.42 + "px", top: y - U(9) + "px", width: w * 0.84 + "px", height: U(18) + "px", opacity: op * (1 - bob / U(12)) });
    Object.assign(bub.style, { left: U(E.x) + "px", top: y - h * sc - U(14) + "px", zIndex: 45 });
    // cuerpo: patas, brazos, cabeza, parpadeo
    const s = Math.sin(E.ph), wav = E.t - E.wave < 1.4 ? Math.sin((E.t - E.wave) * 14) : 0;
    el.legL.setAttribute("transform", `rotate(${(walking ? s * 22 : 0).toFixed(1)} -21 122)`);
    el.legR.setAttribute("transform", `rotate(${(walking ? -s * 22 : 0).toFixed(1)} 21 122)`);
    el.armL.setAttribute("transform", `rotate(${(walking ? -s * 18 : 4 + Math.sin(E.t * 2) * 2).toFixed(1)} -50 58)`);
    const pz = E.pose && !walking ? E.pose : null, pq = E.t - (E.poseT || 0);
    if (pz === "dig") { el.armL.setAttribute("transform", `rotate(${(-30 + Math.sin(pq * 14) * 25).toFixed(1)} -50 58)`); }
    el.armR.setAttribute("transform", `rotate(${(pz === "dig" ? 30 - Math.sin(pq * 14) * 25 : pz === "water" ? -80 : wav ? -120 + wav * 18 : walking ? -s * 18 : -4 - Math.sin(E.t * 2) * 2).toFixed(1)} 50 58)`);
    if (can.el.classList.contains("held")) { const cw = U(58) * 500 / 265; Object.assign(can.el.style, { left: U(E.x) + w * 0.35 + "px", top: y - h * 0.62 + "px", width: cw + "px", height: U(58) + "px", transform: `rotate(${(pq < 0.4 ? pq * 75 : 30).toFixed(0)}deg)`, zIndex: 31 }); }
    el.head.setAttribute("transform", `translate(${(E.face * (walking ? 4 : 0)).toFixed(1)} 0) rotate(${(walking ? E.face * 3 : Math.sin(E.t * 0.7) * 2).toFixed(1)} 0 40)`);
    el.pet.setAttribute("transform", pz === "dig" ? `translate(0 ${(8 + Math.sin(pq * 14) * 3).toFixed(1)}) rotate(${(E.face * 10).toFixed(1)} 0 176)` : `rotate(${(walking ? E.face * 4 : 0).toFixed(1)} 0 176)`);
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
    if (E.t < E.talkUntil + 6 || E.exiting || gBusy || Math.random() < 0.5) return;
    const gt = gardenTalk(); if (gt && Math.random() < 0.4) { say(gt, 2800); return; }
    const p = phase();
    say(pick(p === "night" ? ["Mira cuántas estrellas", "Qué tranquilo está el valle de noche", "Los farolillos de casa son mi parte favorita"] : p === "dusk" ? ["Qué atardecer más bonito", "El cielo se está poniendo naranja"] : sky.w === "snow" ? ["¡Está nevando!", "Brrr… qué frío"] : sky.w === "leaves" ? ["Me encanta el ruido de las hojas", "Ya es otoño en el valle"] : ["Qué buen día hace", "Me encanta pasear contigo", "¿Oyes los pájaros?", "Huele a hierba recién cortada"]), 2800);
  }, 9000);

  // ---------- Arranque ----------
  $("#title").textContent = `El Valle de ${name}`;
  layout(); sky(); setInterval(sky, 60000); grow(); setInterval(grow, testMode ? 2000 : 30000);
  cam = clamp(U(E.x) - W / 2, U(OPEN.x0 - 300), U(WORLD) - W);
  E.entering = 0.001;
  requestAnimationFrame((t) => { last = t; frame(t); });
  setTimeout(() => $("#cover").classList.add("off"), 150);
  setTimeout(() => $("#title").classList.add("on"), 700);
  setTimeout(() => $("#title").classList.remove("on"), 4500);
  setTimeout(() => say(pick([`¡Bienvenido al Valle de ${name}!`, "¡Mira, esta es mi casa por fuera!", "¡Ya estamos fuera! ¿Damos una vuelta?"]), 3200), 1300);
  void room;
})();
