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
  const PATH = () => groundTop() + G() * 0.29;              // donde pisa Eko (el camino de tierra)
  const BACK = () => groundTop() + G() * 0.215;             // base de lo que está detrás: pisa un poco el camino
  const FRONT = () => groundTop() + G() * 0.37;             // base de lo que está delante: pisa el borde del camino
  const OPEN = { x0: 140, x1: 3760 };                       // zona abierta (en «unidades de 1080p»): el prado y el huerto
  const WORLD = 4200;
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
  prop("fence.webp", 1300, 90, "back", "back", { ar: 900 / 338 });
  prop("bush.webp", 1560, 100, "back", "back", { ar: 786 / 710 });
  prop("tree.webp", 1820, 400, "back", "back", { ar: 736 / 800, sway: true, click: () => goTo(1780, () => say(pick(["Desde aquí se ve todo el valle", "Este árbol es muy viejo… y muy sabio"]))) });
  const lamps = [prop("lamp.webp", 420, 260, "front", "front", { ar: 162 / 800 }), prop("lamp.webp", 1460, 260, "front", "front", { ar: 162 / 800 })];
  for (const l of lamps) { const g = document.createElement("div"); g.className = "glow"; g.dataset.g = [0.54, 0.17, 120]; l.el.appendChild(g); l.el.addEventListener("click", (e) => { e.stopPropagation(); goTo(l.ux + 40, () => say(phase() === "night" ? "De noche se encienden solas" : "Por la noche esto brilla muchísimo")); }); }
  const sign = prop("sign.webp", 1180, 240, "front", "front", { ar: 379 / 700, click: () => goTo(1140, () => say(`«El Valle de ${name}». ¡Bienvenido a mi valle!`)) });
  const st = document.createElement("div"); st.id = "signText"; st.textContent = `El Valle\nde ${name}`; st.style.whiteSpace = "pre"; sign.el.appendChild(st);

  // ---------- El Huerto (fase 2): una zona nueva al otro lado de la niebla ----------
  // Arco de entrada, girasoles, cobertizo, dos bancales, Don Paja (el espantapájaros), el pozo y la carretilla.
  const testMode = (() => { try { return !!JSON.parse(localStorage.getItem("eko-settings") || "{}").testAll; } catch (_) { return false; } })();
  const GROW = testMode ? 20e3 : 3 * 3600e3;                 // tiempo mínimo entre fases (regada)
  const CAN = 3;                                             // riegos por cada vez que se llena la regadera
  let GD = { slots: [], hv: { carrot: 0, tomato: 0 }, cart: { carrot: 0, tomato: 0 }, water: CAN, seen: false };
  try { GD = Object.assign(GD, JSON.parse(localStorage.getItem("eko-garden") || "{}")); } catch (_) {}
  while (GD.slots.length < 6) GD.slots.push(null);
  GD.cart = GD.cart || { carrot: 0, tomato: 0 }; if (GD.water == null) GD.water = CAN;
  const gSave = () => { try { localStorage.setItem("eko-garden", JSON.stringify(GD)); } catch (_) {} };
  const Z = { arch: 2260, x0: 2300, x1: 3760 };               // la zona del huerto
  // girasoles: una franja de fondo solo en el huerto
  const sun1 = document.createElement("div"); sun1.id = "sunflowers"; back.appendChild(sun1);
  const arch = prop("h-arch.webp", Z.arch, 360, "front", "front", { ar: 697 / 900, click: () => goTo(E.x < Z.arch ? Z.arch + 145 : Z.arch - 145) });
  const at = document.createElement("div"); at.className = "plaque"; at.textContent = "Huerto"; arch.el.appendChild(at);
  prop("h-shed.webp", 2520, 290, "back", "back", { ar: 900 / 820, click: () => goTo(2520, () => say(pick(["Aquí guardo las herramientas", "Huele a madera y a tierra", "Un día ordenaré este cobertizo… algún día", "Dentro hay más macetas que sitio"]))) });
  const BEDS = [{ ux: 2860 }, { ux: 3290 }], BED = { uh: 66, ar: 1000 / 202 };
  const beds = BEDS.map((b, j) => prop("g-bed.webp", b.ux, BED.uh, "back", "back", { ar: BED.ar, click: (p, e) => slotAt(j, e) }));
  prop("h-scarecrow.webp", 3075, 250, "back", "back", { ar: 572 / 800, sway: true, click: () => goTo(3035, () => chatPaja()) });
  const well = prop("h-well.webp", 3560, 230, "back", "back", { ar: 627 / 800, click: () => goTo(3500, () => fillCan()) });
  const can = prop("g-can.webp", 2590, 58, "front", "front", { ar: 500 / 265, click: () => waterNext() });
  prop("g-seeds.webp", 2660, 82, "front", "front", { ar: 436 / 500, click: () => plantNext() });
  const barrow = prop("h-barrow.webp", 3090, 92, "front", "front", { ar: 600 / 253, click: () => goTo(3030, () => emptyCart()) });
  const SX = [0.2, 0.5, 0.8];                                 // huecos de cada bancal (fracción del ancho)
  const ART = { 0: ["g-sprout.webp", 347 / 400, 70], 1: ["g-young.webp", 500 / 475, 100], carrot: ["g-carrotplant.webp", 461 / 500, 125], tomato: ["g-tomato.webp", 447 / 600, 170] };
  const plants = GD.slots.map((_, i) => { const d = document.createElement("div"); d.className = "plant"; d.innerHTML = `<img alt="" draggable="false"><b class="thirst"></b>`; d.addEventListener("click", (e) => { e.stopPropagation(); act(i); }); back.appendChild(d); return d; });
  const slotX = (i) => BEDS[Math.floor(i / 3)].ux + (SX[i % 3] - 0.5) * BED.uh * BED.ar;
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
    const full = GD.cart.carrot + GD.cart.tomato > 0, im = barrow.el.firstChild;
    barrow.ar = full ? 600 / 358 : 600 / 253; barrow.uh = full ? 120 : 92;
    if (!im.src.endsWith(full ? "h-barrowfull.webp" : "h-barrow.webp")) im.src = "art/valley/" + (full ? "h-barrowfull.webp" : "h-barrow.webp");
    layout();
  }
  function gLayout() {
    const bh = U(BED.uh), base = BACK() - bh + bh * 0.42;
    plants.forEach((d, i) => { if (!d.dataset.uh) return; const h = U(+d.dataset.uh), w = h * +d.dataset.ar; Object.assign(d.style, { left: U(slotX(i)) - w / 2 + "px", top: base - h + "px", width: w + "px", height: h + "px" }); });
    for (const b of beds) b.el.style.zIndex = 6;
    // Keep crops in front of the wooden bed rim so they read as planted in the soil.
    for (const d of plants) d.style.zIndex = 7;
    Object.assign(sun1.style, { left: U(Z.x0) + "px", width: U(Z.x1 - Z.x0 + 200) + "px", top: groundTop() + G() * 0.14 - U(230) + "px", height: U(240) + "px", backgroundSize: "auto 100%" });
    Object.assign(at.style, { left: "32%", width: "36%", top: "19%", height: "10%", fontSize: U(20) + "px", lineHeight: U(34) + "px" });
  }
  function slotAt(j, e) { const r = beds[j].el.getBoundingClientRect(); const f = (e.clientX - r.left) / r.width; act(j * 3 + (f < 0.35 ? 0 : f < 0.65 ? 1 : 2)); }
  // efectos
  function fx(cls, x, y, n, life) {
    for (let j = 0; j < n; j++) { const d = document.createElement("i"); d.className = cls; Object.assign(d.style, { left: x + (Math.random() - 0.5) * U(50) + "px", top: y + "px", animationDelay: j * (life / n) + "ms", "--dx": (Math.random() - 0.5) * U(80) + "px" }); front.appendChild(d); setTimeout(() => d.remove(), life + 1200); }
  }
  function floatText(t, x, y) { const d = document.createElement("div"); d.className = "gtext"; d.textContent = t; Object.assign(d.style, { left: x + "px", top: y + "px", fontSize: U(26) + "px" }); front.appendChild(d); setTimeout(() => d.remove(), 1900); }
  let gBusy = false;
  function work(pose, ms, done) { gBusy = true; E.pose = pose; E.poseT = E.t; setTimeout(() => { E.pose = null; gBusy = false; done && done(); }, ms); }
  const GL = {
    plant: ["¡A plantar!", "Una semillita aquí…", "Crece fuerte, ¿eh?", "Tapadita con tierra"],
    planted: ["¡Listo! Ahora hay que regarla", "Ya está plantada. Le falta agua", "Hecho. Ahora, la regadera"],
    water: ["¡Agüita!", "Glu, glu, glu…", "Que no le falte de nada", "Riego, riego…"],
    wait: ["Aún está creciendo, hay que tener paciencia", "Todavía le falta un poco", "Ya está regada. Ahora, a esperar", "Crece despacito, como todo lo bueno"],
    carrot: ["¡Una zanahoria enorme!", "¡Mira qué zanahoria!", "¡Zanahoria recién sacada!"],
    tomato: ["¡Tomates rojitos!", "¡Qué tomates más buenos!", "¡Cosecha de tomates!"],
    full: ["Los bancales ya están llenos", "No queda sitio para más semillas"],
    nodry: ["Ahora mismo nada necesita agua", "Todo está regado"],
    empty: ["Uy, la regadera está vacía. Voy al pozo", "Sin agua… ¡al pozo!", "Me he quedado seco. Un momento"],
    fill: ["¡Regadera llena!", "Agua fresquita del pozo", "Clonc, clonc… ¡llena!"],
    full2: ["La regadera ya está llena", "Todavía me queda agua"],
    paja: ["Hola, Don Paja. ¿Algún pájaro por aquí?", "Don Paja no habla mucho, pero escucha muy bien", "Don Paja vigila el huerto mientras no estamos", "¿Te gusta tu sombrero nuevo, Don Paja?", "Don Paja dice que los girasoles han crecido", "Le cuento mis secretos a Don Paja. No se los dice a nadie"],
    cartEmpty: ["La carretilla está vacía. ¡A cosechar!", "Aquí irá la cosecha", "Cuando cosechemos, la traigo aquí"],
    hello: ["¡Bienvenido al huerto!", "¡Ya estamos en el huerto!", "Mira, los girasoles nos saludan", "Huele a tierra mojada… me encanta"],
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
        if (GD.water <= 0) { say(pick(GL.empty), 1800); setTimeout(() => goTo(3500, () => fillCan(() => act(i))), 900); return; }
        say(pick(GL.water), 1800);
        can.el.classList.add("held"); work("water", 1900, () => { can.el.classList.remove("held"); can.el.style.transform = ""; GD.water--; s.wet = Date.now(); gSave(); drawPlants(); say(pick(GL.wait) + (GD.water === 0 ? " Y la regadera se ha vaciado." : ""), 2400); });
        setTimeout(() => fx("drop", bx, by - U(110), 14, 1200), 400);
      } else if (s.st < 2) {
        const left = Math.max(0, GROW - (Date.now() - s.since)), hrs = Math.ceil(left / 3600e3);
        say(left > 0 && !testMode ? `${pick(GL.wait)} (unas ${hrs} h)` : pick(GL.wait), 2600);
      } else {
        work("dig", 1100, () => {
          const n = s.c === "tomato" ? 3 : 1;
          GD.hv[s.c] = (GD.hv[s.c] || 0) + n; GD.cart[s.c] = (GD.cart[s.c] || 0) + n;
          if (s.c === "carrot") { GD.slots[i] = null; const im = document.createElement("img"); im.src = "art/valley/g-carrot.webp"; im.className = "pull"; Object.assign(im.style, { left: bx - U(60) + "px", top: by - U(60) + "px", width: U(120) + "px" }); front.appendChild(im); setTimeout(() => im.remove(), 1800); }
          else { s.st = 1; s.since = Date.now(); s.wet = 0; floatText("+3 tomates", bx, by - U(150)); }
          gSave(); drawPlants(); fx("dirt", bx, by, 8, 300);
          say(pick(GL[s.c]) + " A la carretilla.", 2600);
        });
      }
    });
  }
  function fillCan(then) {
    if (GD.water >= CAN && !then) { say(pick(GL.full2)); return; }
    E.face = 1; say("Clonc, clonc…", 1400);
    work("dig", 1400, () => { GD.water = CAN; gSave(); fx("drop", U(well.ux), BACK() - U(120), 8, 500); say(pick(GL.fill), 1600); if (then) setTimeout(then, 900); });
  }
  function emptyCart() {
    const c = GD.cart, t = c.carrot + c.tomato;
    if (!t) { say(pick(GL.cartEmpty)); return; }
    const parts = [c.carrot ? `${c.carrot} zanahoria${c.carrot > 1 ? "s" : ""}` : "", c.tomato ? `${c.tomato} tomate${c.tomato > 1 ? "s" : ""}` : ""].filter(Boolean).join(" y ");
    say(`¡${parts}! Me lo llevo a casa para cenar`, 3000);
    work("dig", 900, () => { GD.cart = { carrot: 0, tomato: 0 }; gSave(); drawPlants(); });
  }
  let pajaI = -1;
  function chatPaja() {
    const r = GD.slots.filter((s) => s && s.st >= 2).length, d = GD.slots.filter((s) => s && thirsty(s)).length;
    if (r && Math.random() < 0.5) { say("Don Paja dice que hay cosas listas para cosechar", 2600); return; }
    if (d && Math.random() < 0.5) { say("Don Paja me chiva que alguna planta tiene sed", 2600); return; }
    pajaI = (pajaI + 1 + Math.floor(Math.random() * (GL.paja.length - 1))) % GL.paja.length; say(GL.paja[pajaI], 2800);
  }
  function plantNext() { const i = GD.slots.findIndex((s) => !s); if (i < 0) { goTo(2640, () => say(pick(GL.full))); return; } act(i); }
  function waterNext() { const i = GD.slots.findIndex((s) => s && thirsty(s)); if (i < 0) { goTo(2570, () => say(pick(GL.nodry))); return; } act(i); }
  const inGarden = () => E.x > Z.arch;
  function gardenTalk() {
    const n = GD.slots.filter((s) => s && thirsty(s)).length, r = GD.slots.filter((s) => s && s.st >= 2).length;
    if (inGarden()) return r ? "¡Hay cosas listas para cosechar!" : n ? "Algunas plantas tienen sed" : GD.slots.every((s) => !s) ? "¿Plantamos algo?" : pick(["Me encanta este sitio", "Los girasoles siempre miran al sol", "Don Paja hace muy bien su trabajo"]);
    return r ? "¡Hay cosas listas en el huerto!" : n ? "Las plantas del huerto tienen sed" : "";
  }

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
  const interior = $("#interior"), houseActors = $("#houseActors"), houseProps = $("#houseProps"), houseGallery = $("#houseGallery");
  let inHouse = false, houseX = 9, houseTarget = null, houseDone = null, houseWalk = false, houseLift = 0, houseScale = 1, houseClimb = null, houseSignature = "";
  const HOME_FURNITURE = [
    { id: "bed", src: "house-bed.png", cx: 105, b: 170, w: 29, ar: 1671 / 941, kind: "floor" },
    { id: "pot", src: "house-pot.png", cx: 249, b: 187, w: 8, ar: 1374 / 1145, kind: "floor" },
    { id: "rug", src: "house-rug.png", cx: 197, b: 184, w: 34, ar: 2243 / 701, kind: "rug" },
    { id: "curtains", src: "house-curtains.png", cx: 284, t: 31, w: 29, ar: 1536 / 1024, kind: "wall" },
    { id: "lamp", src: "house-lamp.png", cx: 182, b: 151, w: 7, ar: 1024 / 1536, kind: "floor" },
    { id: "cabinet", src: "house-cabinet.png", cx: 320, b: 189, w: 18, ar: 1024 / 1536, kind: "floor" },
    { id: "trophy", src: "house-trophy.png", cx: 320, b: 189, w: 5.4, ar: 1199 / 1312, kind: "wall" },
  ];
  const HOUSE_PICS = [
    { id: "portrait", name: "Retrato", src: "art/pic-portrait.webp", origin: "Me llegó en un paquete cuando construimos la casa." },
    { id: "sprout", name: "El brote", src: "art/pic-sprout.webp", origin: "Lo conseguí cuando empezó a crecer nuestro primer brote." },
    { id: "cookies", name: "Bodegón de galletas", src: "art/pic-cookies.webp", origin: "Lo gané jugando a Atrapa galletas." },
    { id: "sleep", name: "Eko dormilón", src: "art/pic-sleep.webp", origin: "Lo desbloqueé al llegar al nivel 16." },
    { id: "astro", name: "Eko astronauta", src: "art/pic-astro.webp", origin: "Lo desbloqueé al llegar al nivel 19." },
  ];
  const HOUSE_SOUVENIRS = [
    ["catch", "medalla de oro", "art/sv/medal-gold.webp", "La gané al conseguir 30 puntos en Atrapa galletas.", 10],
    ["catchS", "medalla de plata", "art/sv/medal-silver.webp", "La gané al conseguir 18 puntos en Atrapa galletas.", 8],
    ["catchB", "medalla de bronce", "art/sv/medal-bronze.webp", "La gané al conseguir 8 puntos en Atrapa galletas.", 4],
    ["home", "llave de mi casa", "art/sv/key.webp", "Es la llave que llegó con mi casa.", 9],
    ["first", "pulsera de la amistad", "art/sv/bracelet.webp", "La conseguimos cuando nos hicimos amigos.", 9],
    ["loyal", "calendario de 30 días", "art/sv/calendar.webp", "Lo gané por cumplir 30 días juntos.", 9],
    ["gallery", "paleta de pintor", "art/sv/palette.webp", "La gané al llenar la galería de mi libreta.", 8],
    ["bday", "magdalena de cumpleaños", "art/sv/cupcake.webp", "La guardé de la fiesta de mi cumpleaños.", 8],
    ["xmas", "bola de nieve", "art/sv/snowglobe.webp", "Es un recuerdo de nuestras navidades.", 7],
    ["halloween", "farolillo de calabaza", "art/sv/lantern.webp", "Lo conseguí en Halloween.", 7],
    ["happy", "cuatro corazones", "art/sv/hearts.webp", "Lo celebramos cuando llegamos a cuatro corazones.", 7],
    ["reunion", "postal de reencuentro", "art/sv/postcard.webp", "La guardé de nuestro reencuentro.", 7],
    ["glutton", "bote de galletas", "art/sv/cookie-jar.webp", "Lo conseguí por zampar un montón de galletas.", 6],
    ["gardener", "regadera dorada", "art/sv/can-gold.webp", "La gané por cuidar mucho las plantas.", 6],
    ["rps", "copa de piedra, papel o tijera", "art/sv/rps-cup.webp", "La gané jugando a piedra, papel o tijera.", 6],
    ["detective", "lupa de detective", "art/sv/magnifier.webp", "La conseguí resolviendo un misterio.", 6],
    ["eye", "canica de buen ojo", "art/sv/eye-marble.webp", "La gané en un reto de buen ojo.", 6],
    ["voice", "micrófono", "art/sv/mic.webp", "Es un recuerdo de nuestras primeras charlas.", 5],
    ["chat", "bocadillo de charla", "art/sv/bubble.webp", "Lo gané por charlar mucho contigo.", 5],
    ["explorer", "brújula de explorador", "art/sv/compass.webp", "La conseguí explorando el valle.", 5],
    ["early", "solecito de madrugador", "art/sv/sun.webp", "Lo gané por levantarme tempranito.", 5],
    ["night", "luna de noctámbulo", "art/sv/moon.webp", "La conseguí por trasnochar contigo.", 5],
    ["mail", "sobre", "art/sv/envelope.webp", "Es un recuerdo de nuestra primera carta.", 5],
    ["napper", "antifaz de dormir", "art/sv/sleepmask.webp", "Lo conseguí después de muchas siestas.", 5],
    ["tidy", "nivel de burbuja", "art/sv/level.webp", "Lo gané por dejarlo todo en su sitio.", 4],
    ["shiny", "trapito de sacar brillo", "art/sv/cloth.webp", "Lo conseguí cuidando y sacando brillo a mis cosas.", 4],
  ].map(([id, name, src, origin, rank]) => ({ id, name, src, origin, rank }));
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
  const roomData = () => { try { return JSON.parse(localStorage.getItem("eko-corner") || "{}"); } catch (_) { return {}; } };
  const roomX = (cx) => clamp(8 + ((cx - 30) / 342) * 84, 8, 92);
  const roomBottom = (b) => 21 - clamp((b - 146) / 44, 0, 1) * 13;
  const roomTop = (t) => 11 + clamp(t / 125, 0, 1) * 13;
  const roomWallX = (cx) => clamp(roomX(cx) - 20, 10, 90);
  const HOUSE_COLORS = {
    bed: ["", "hue-rotate(125deg) saturate(1.1)", "hue-rotate(-75deg) saturate(.8)", "hue-rotate(35deg)", "hue-rotate(170deg) saturate(1.3)"],
    rug: ["", "hue-rotate(190deg)", "hue-rotate(240deg)", "hue-rotate(120deg) saturate(.8)", "hue-rotate(25deg) saturate(1.5)"],
    curtains: ["", "hue-rotate(80deg)", "hue-rotate(-110deg) saturate(.8)", "hue-rotate(-40deg)", "hue-rotate(160deg) saturate(1.2)"],
    lamp: ["", "hue-rotate(240deg)", "hue-rotate(120deg)", "hue-rotate(190deg)"],
    cabinet: ["", "brightness(1.12) saturate(.85)", "brightness(.72) saturate(1.1)", "grayscale(.6) brightness(1.3)"],
    pot: ["", "brightness(1.1) saturate(.8)", "brightness(.8) saturate(1.1)"],
  };
  const PICTURE_ORIGINS = {
    portrait: "Me llegó en un paquete cuando construimos la casa.", sprout: "Lo conseguí cuando empezó a crecer nuestro primer brote.",
    cookies: "Lo gané jugando a Atrapa galletas.", sleep: "Lo desbloqueé al llegar al nivel 16.", astro: "Lo desbloqueé al llegar al nivel 19.",
  };
  function houseAsset(id, src, xPct, widthPct, ar, kind, extra = {}) {
    const el = document.createElement("button"), w = W * widthPct / 100, h = w / ar;
    el.type = "button"; el.className = `house-item ${kind}`; el.dataset.houseId = id;
    el.setAttribute("aria-label", extra.label || id);
    const img = document.createElement("img"); img.src = "art/" + src; img.alt = ""; img.draggable = false; el.appendChild(img);
    Object.assign(el.style, { left: xPct + "%", width: w + "px", height: h + "px", zIndex: extra.z || 4 });
    if (extra.top != null) el.style.top = extra.top + "%";
    else el.style.bottom = (extra.bottom == null ? 10 : extra.bottom) + "%";
    const filter = HOUSE_COLORS[id] && HOUSE_COLORS[id][extra.color || 0]; if (filter) img.style.filter = filter;
    houseProps.appendChild(el); return { el, xPct, top: extra.top, bottom: extra.bottom, w, h };
  }
  function pictureAsset(pic, slot, cx, topPct, widthPct) {
    const el = document.createElement("button"); el.type = "button"; el.className = "house-frame"; el.dataset.houseId = "picture:" + pic.id;
    el.setAttribute("aria-label", pic.name); const w = W * widthPct / 100, h = w / (400 / 500);
    Object.assign(el.style, { left: cx + "%", top: topPct + "%", width: w + "px", height: h + "px", zIndex: 3 });
    const art = document.createElement("img"); art.className = "art"; art.src = pic.src; art.alt = ""; art.draggable = false;
    const frame = document.createElement("img"); frame.src = "art/house-frame.png"; frame.alt = ""; frame.draggable = false;
    el.append(art, frame); houseProps.appendChild(el); return el;
  }
  function houseSouvenirButton(item, cabinetBox, i) {
    const el = document.createElement("button"); el.type = "button"; el.className = "house-memento"; el.dataset.houseId = "sv:" + item.id; el.setAttribute("aria-label", item.name);
    const img = document.createElement("img"); img.src = item.src; img.alt = ""; img.draggable = false; el.appendChild(img);
    const row = Math.floor(i / 3), col = i % 3;
    Object.assign(el.style, { left: cabinetBox.x + cabinetBox.w * (0.39 + col * 0.12) - W * 0.011 + "px", top: cabinetBox.y + cabinetBox.h * ([0.36, 0.61, 0.85][row]) - W * 0.026 + "px", width: W * 0.022 + "px", height: W * 0.022 + "px", zIndex: 16 });
    houseProps.appendChild(el);
  }
  function makeGalleryButton(item, type) {
    const b = document.createElement("button"); b.type = "button"; b.dataset.houseId = type === "picture" ? "picture:" + item.id : "sv:" + item.id;
    const img = document.createElement("img"); img.src = item.src; img.alt = ""; img.draggable = false;
    const label = document.createElement("span"); label.textContent = item.name;
    b.append(img, label); return b;
  }
  function renderHouse(force = false) {
    const c = roomData(), sig = JSON.stringify([c.built, c.pos, c.color, c.wallC, c.floorC, c.off, c.got, c.hung, c.pic]);
    if (!force && sig === houseSignature) return; houseSignature = sig;
    const pos = c.pos || {}, colors = c.color || {}, off = c.off || {}, got = new Set(Array.isArray(c.got) ? c.got : []);
    houseProps.replaceChildren();
    const wallColors = ["", "rgba(246,213,210,.5)", "rgba(216,235,221,.5)", "rgba(225,217,242,.5)", "rgba(214,228,243,.5)", "rgba(247,227,181,.5)"];
    $("#houseWallTint").style.background = wallColors[c.wallC || 0] || "transparent";
    const floorTint = $("#houseFloorTint");
    floorTint.style.background = c.floorC === 1 ? "rgba(255,255,255,.28)" : c.floorC === 2 ? "rgba(84,51,30,.25)" : "transparent";
    floorTint.style.mixBlendMode = c.floorC === 1 ? "screen" : "multiply";
    const items = {};
    if (c.built) for (const d of HOME_FURNITURE) {
      if (!got.has(d.id) || off[d.id] || d.id === "trophy") continue;
      const p = pos[d.id] || {}, x = d.kind === "wall" ? roomWallX(p.cx == null ? d.cx : p.cx) : roomX(p.cx == null ? d.cx : p.cx), bottom = roomBottom(p.b == null ? d.b : p.b), top = roomTop(p.t == null ? d.t : p.t);
      const color = colors[d.id] || 0;
      items[d.id] = houseAsset(d.id, "house-" + d.id + ".png", x, d.w, d.ar, d.kind, { bottom: d.kind === "wall" ? null : bottom, top: d.kind === "wall" ? top : null, color, z: d.kind === "wall" ? 3 : d.id === "rug" ? 2 : 5 });
    }
    if (c.built && got.has("trophy") && !off.trophy && items.cabinet) {
      const t = HOME_FURNITURE.find((d) => d.id === "trophy"), cab = items.cabinet, w = W * t.w / 100, h = w / t.ar;
      const el = document.createElement("button"); el.type = "button"; el.className = "house-item wall"; el.dataset.houseId = "trophy"; el.setAttribute("aria-label", "Trofeo");
      const img = document.createElement("img"); img.src = "art/house-trophy.png"; img.alt = ""; img.draggable = false; el.appendChild(img);
      Object.assign(el.style, { left: cab.xPct + "%", bottom: `calc(${cab.bottom}% + ${cab.h - h * 0.55}px)`, width: w + "px", height: h + "px", zIndex: 10 }); houseProps.appendChild(el);
    }
    const picById = new Map(HOUSE_PICS.map((p) => [p.id, p]));
    const hung = Array.isArray(c.hung) ? c.hung : c.pic ? [c.pic] : [];
    const slots = [{ id: "frame", cx: 203, t: 24 }, { id: "pic1", cx: 120, t: 30 }, { id: "pic2", cx: 334, t: 26 }];
    for (let i = 0; i < Math.min(3, hung.length); i++) {
      const pic = picById.get(hung[i]); if (!pic || !got.has("pic:" + pic.id)) continue;
      const p = pos[slots[i].id] || {}, cx = roomWallX(p.cx == null ? slots[i].cx : p.cx), top = roomTop(p.t == null ? slots[i].t : p.t);
      pictureAsset(pic, i, cx, top, 10.5);
    }
    const cabinet = items.cabinet;
    if (cabinet) {
      const rect = cabinet.el.getBoundingClientRect();
      const souvenirList = HOUSE_SOUVENIRS.filter((v) => got.has("sv:" + v.id)).sort((a, b) => b.rank - a.rank).slice(0, 9);
      souvenirList.forEach((v, i) => houseSouvenirButton(v, { x: rect.left, y: rect.top, w: rect.width, h: rect.height }, i));
    }
    if (houseGallery.classList.contains("on")) renderGallery(c);
  }
  function renderGallery(c = roomData()) {
    houseGallery.replaceChildren();
    const title = document.createElement("h2"); title.textContent = "Mis recuerdos"; title.style.cssText = "grid-column:1/-1;margin:0 0 4px;color:#634734;font:700 26px 'Segoe Print','Comic Sans MS',cursive"; houseGallery.appendChild(title);
    const got = new Set(Array.isArray(c.got) ? c.got : []), souvenirs = HOUSE_SOUVENIRS.filter((v) => got.has("sv:" + v.id)).sort((a, b) => b.rank - a.rank);
    const pictures = HOUSE_PICS.filter((p) => got.has("pic:" + p.id));
    souvenirs.forEach((v) => houseGallery.appendChild(makeGalleryButton(v, "souvenir")));
    pictures.forEach((p) => houseGallery.appendChild(makeGalleryButton(p, "picture")));
    if (!souvenirs.length && !pictures.length) { const empty = document.createElement("p"); empty.textContent = "Cuando lleguen nuevos recuerdos, los guardaré aquí."; empty.style.cssText = "grid-column:1/-1;color:#795e4a"; houseGallery.appendChild(empty); }
  }
  function openGallery() { renderGallery(); houseGallery.classList.add("on"); }
  function moveHouseTo(x, done) { houseTarget = clamp(x, 7, 94); houseDone = done || null; }
  function explainHouseItem(id) {
    if (id === "cabinet") { moveHouseTo(roomX((roomData().pos || {}).cabinet?.cx || 320), openGallery); return; }
    if (id === "bed") { moveHouseTo(roomX((roomData().pos || {}).bed?.cx || 105), () => say(pick(["Qué bien se está en mi camita", "Aquí me echo una siestecita", "Mi rincón favorito para descansar"]), 2400)); return; }
    if (id === "lamp") { moveHouseTo(roomX((roomData().pos || {}).lamp?.cx || 182), () => say(pick(["Esta luz es perfecta para leer", "Me encanta mi lamparita", "Qué acogedor queda este rincón"]), 2200)); return; }
    if (id === "pot") { moveHouseTo(roomX((roomData().pos || {}).pot?.cx || 249), () => say(pick(["Mi plantita está preciosa", "Hay que acordarse de regarla", "Las hojas nuevas son una monada"]), 2200)); return; }
    if (id === "rug") { moveHouseTo(roomX((roomData().pos || {}).rug?.cx || 197), () => say("Esta alfombra es muy suave", 2000)); return; }
    if (id === "curtains") { moveHouseTo(roomX((roomData().pos || {}).curtains?.cx || 284), () => say("Desde aquí entra una luz preciosa", 2200)); return; }
    if (id === "trophy") { moveHouseTo(roomX((roomData().pos || {}).cabinet?.cx || 320), () => say("Mi trofeo, me acuerdo de cómo lo ganamos", 2300)); return; }
    if (id.startsWith("sv:")) {
      const item = HOUSE_SOUVENIRS.find((v) => v.id === id.slice(3)); if (!item) return;
      moveHouseTo(roomX((roomData().pos || {}).cabinet?.cx || 320), () => say(`Me acuerdo de ${item.name}. ${item.origin}`, 3000)); return;
    }
    if (id.startsWith("picture:")) {
      const pic = HOUSE_PICS.find((p) => p.id === id.slice(8)); if (!pic) return;
      moveHouseTo(50, () => say(`${pic.name}: ${PICTURE_ORIGINS[pic.id] || "Es uno de mis recuerdos favoritos."}`, 3000)); return;
    }
  }
  function beginClimb() {
    if (houseClimb) return;
    moveHouseTo(84, () => { houseClimb = { t: E.t, told: false }; });
  }
  function exitHouse() {
    if (!inHouse || houseTarget != null || houseClimb) return;
    moveHouseTo(7.5, () => {
      inHouse = false; houseTarget = null; houseDone = null; houseGallery.classList.remove("on"); document.body.classList.remove("in-house"); interior.classList.remove("on");
      box.append(eko, bub, shd); E.x = house.ux - 560 * 1102 / 971 * 0.18; E.tx = null; E.then = null; E.entering = E.t; houseSignature = "";
      say(pick(["Ya estamos otra vez en el valle", "¡Qué bien se está en casa! ¿Paseamos?", "Vamos a dar una vuelta por el valle"]), 2500);
    });
  }
  $("#houseExit").addEventListener("click", (e) => { e.stopPropagation(); exitHouse(); });
  $("#houseStairs").addEventListener("click", (e) => { e.stopPropagation(); beginClimb(); });
  $("#houseGalleryClose").addEventListener("click", (e) => { e.stopPropagation(); houseGallery.classList.remove("on"); });
  houseGallery.addEventListener("click", (e) => { const b = e.target.closest("button[data-house-id]"); if (!b) return; houseGallery.classList.remove("on"); explainHouseItem(b.dataset.houseId); });
  interior.addEventListener("click", (e) => {
    if (!inHouse || houseGallery.classList.contains("on")) return;
    const item = e.target.closest("[data-house-id]"); if (item) { e.stopPropagation(); explainHouseItem(item.dataset.houseId); return; }
    if (e.target.closest("#houseStairs,#houseExit")) return;
    if (e.clientX < W * 0.105 && e.clientY > H * 0.48) { exitHouse(); return; }
    moveHouseTo(e.clientX / W * 100);
  });
  document.addEventListener("click", (e) => {
    if (inHouse) return;
    if (e.target.closest("#back") || e.target.closest(".prop") || e.target.closest("#eko")) return;
    goTo((e.clientX + cam) / k);
  });
  eko.addEventListener("click", (e) => { e.stopPropagation(); E.wave = E.t; say(pick(["¡Hola!", "¿Damos un paseo?", "¡Qué bien se está aquí fuera!", "¿A dónde vamos?"])); });

  // La casa del valle abre el interior; el botón superior sigue devolviendo al escritorio.
  function enterHouse() {
    if (E.exiting || inHouse) return;
    E.tx = null; E.then = null; E.exiting = E.t;
    say(pick(["¡A casa!", "Hogar, dulce hogar", "Vamos para dentro"]), 1400);
    setTimeout(() => {
      E.exiting = 0; E.x = house.ux - 560 * 1102 / 971 * 0.18; inHouse = true; houseX = 8.5; houseTarget = null; houseDone = null; houseClimb = null;
      houseActors.append(eko, bub, shd); document.body.classList.add("in-house"); interior.classList.add("on"); renderHouse(true);
    }, 720);
  }
  function leaveValley() {
    if (E.exiting) return;
    E.exiting = E.t; say(pick(["¡De vuelta al escritorio!", "Luego volvemos al valle", "Bueno, voy contigo"]), 1400);
    setTimeout(() => $("#cover").classList.remove("off"), 900);
    setTimeout(() => emit("world-exit"), 2100);
  }
  $("#back").addEventListener("click", (e) => { e.stopPropagation(); if (inHouse) { exitHouse(); return; } goTo(house.ux - 560 * 1102 / 971 * 0.18, () => leaveValley()); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") { if (inHouse) { if (houseGallery.classList.contains("on")) houseGallery.classList.remove("on"); else exitHouse(); } else { E.tx = null; leaveValley(); } } });
  addEventListener("resize", layout);
  addEventListener("resize", () => { if (inHouse) renderHouse(true); });
  setInterval(() => { if (inHouse) renderHouse(); }, 900);

  // ---------- Bucle ----------
  let cam = 0, last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; E.t += dt;
    // paseo
    let walking = false; houseWalk = false;
    if (inHouse && houseTarget != null) {
      const d = houseTarget - houseX;
      if (Math.abs(d) < 0.45) { houseX = houseTarget; houseTarget = null; const f = houseDone; houseDone = null; if (f) f(); }
      else { houseWalk = true; E.face = Math.sign(d); houseX += E.face * Math.min(Math.abs(d), 35 * dt); }
    } else if (!inHouse && E.tx != null && !E.exiting) {
      const d = E.tx - E.x;
      if (Math.abs(d) < 4) { E.tx = null; const f = E.then; E.then = null; if (E.fog) { E.fog = false; say(pick(["Más allá hay niebla… algún día exploraremos", "Uy, por ahí aún no se puede pasar", "¿Qué habrá detrás de la niebla?"])); } if (f) f(); }
      else { walking = true; E.face = Math.sign(d); E.x += E.face * Math.min(Math.abs(d), 230 * dt); }
    }
    if (inHouse && houseClimb) {
      const q = E.t - houseClimb.t;
      if (q < 0.75) { const a = q / 0.75; houseLift = -H * 0.34 * (a * a * (3 - 2 * a)); houseScale = 1 - 0.13 * a; }
      else if (q < 1.35) { houseLift = -H * 0.34; houseScale = 0.87; if (!houseClimb.told) { houseClimb.told = true; say("Aún no se puede subir. Esa puerta la abriremos más adelante", 2800); } }
      else if (q < 2.1) { const a = (q - 1.35) / 0.75; houseLift = -H * 0.34 * (1 - a * a * (3 - 2 * a)); houseScale = 0.87 + 0.13 * a; }
      else { houseLift = 0; houseScale = 1; houseClimb = null; }
    }
    if (inHouse) walking = houseWalk;
    E.ph += dt * (walking ? 9 : 0);
    if (inGarden() !== E.inG) { E.inG = inGarden(); if (E.inG && E.t > 2) { say(GD.seen ? pick(GL.hello) : `¡Mira! ¡Detrás de la niebla había un huerto! Será nuestro`, 3200); if (!GD.seen) { GD.seen = true; gSave(); } } }
    // Eko: pasea por el valle o por la habitación a pantalla completa.
    const h = EH(), w = h * 240 / 310;
    let y = PATH(), sc = 1, op = 1;
    if (E.entering) { const q = clamp((E.t - E.entering) / 1.1, 0, 1); y = lerp(BACK() - U(6), PATH(), q); sc = lerp(0.82, 1, q); op = Math.min(1, q * 3); if (q >= 1) E.entering = 0; }
    if (E.exiting) { const q = clamp((E.t - E.exiting) / 1.1, 0, 1); y = lerp(PATH(), BACK() - U(6), q); sc = lerp(1, 0.82, q); op = 1 - clamp((q - 0.6) / 0.4, 0, 1); }
    const bob = walking ? Math.abs(Math.sin(E.ph)) * U(6) : Math.sin(E.t * 2) * U(1.5);
    if (inHouse) {
      const floor = H * 0.91 + houseLift, hb = walking ? Math.abs(Math.sin(E.ph)) * U(5) : Math.sin(E.t * 2) * U(1.5);
      Object.assign(eko.style, { left: W * houseX / 100 - (w * houseScale) / 2 + "px", top: floor - h * houseScale - hb + "px", transform: `scale(${houseScale})`, transformOrigin: "50% 100%", opacity: 1, zIndex: 8 });
      Object.assign(shd.style, { left: W * houseX / 100 - w * 0.42 + "px", top: floor - U(9) + "px", width: w * 0.84 + "px", height: U(18) + "px", opacity: 0.72 - Math.max(0, -houseLift / H) });
      Object.assign(bub.style, { left: W * houseX / 100 + "px", top: floor - h * houseScale - U(14) + "px", zIndex: 45 });
    } else {
      const crossingArch = E.x > Z.arch - 95 && E.x < Z.arch + 95;
      arch.el.style.zIndex = 30; eko.style.zIndex = crossingArch ? 32 : 20;
      Object.assign(eko.style, { left: U(E.x) - (w * sc) / 2 + "px", top: y - h * sc - bob + "px", transform: `scale(${sc})`, transformOrigin: "50% 100%", opacity: op });
      Object.assign(shd.style, { left: U(E.x) - w * 0.42 + "px", top: y - U(9) + "px", width: w * 0.84 + "px", height: U(18) + "px", opacity: op * (1 - bob / U(12)) });
      Object.assign(bub.style, { left: U(E.x) + "px", top: y - h * sc - U(14) + "px", zIndex: 45 });
    }
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
    if (inHouse || E.t < E.talkUntil + 6 || E.exiting || gBusy || Math.random() < 0.5) return;
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
