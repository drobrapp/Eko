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
  const OPEN = { x0: 140, x1: 5500 };                       // zona abierta (en «unidades de 1080p»): el prado, el huerto y el estanque
  const WORLD = 5760;
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
    const houseView = $("#houseView"), houseSun = $("#houseWindowSun");
    houseView.style.background = `linear-gradient(${a}, ${b} 70%)`;
    houseSun.src = `art/valley/${p === "night" ? "moon" : "sun"}.webp`;
    const clockHour = new Date().getHours() + new Date().getMinutes() / 60;
    const skyT = p === "night" ? ((clockHour + 24 - 21.5) % 24) / 9 : clamp((clockHour - 6.5) / 15, 0, 1);
    houseSun.style.left = lerp(8, 72, skyT) + "%";
    houseSun.style.top = (28 - Math.sin(Math.PI * skyT) * 18) + "%";
    $(".houseWindowCloud").style.opacity = p === "night" ? "0.28" : "0.9";
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
    const seasonView = $("#houseSeason"), seasonName = w || "none";
    if (seasonView.dataset.season !== seasonName) {
      seasonView.dataset.season = seasonName; seasonView.replaceChildren();
      if (w) for (let i = 0; i < 10; i++) {
        const f = document.createElement("i"); f.className = w === "leaves" ? "leaf" : "snow";
        f.style.left = Math.random() * 100 + "%"; f.style.animationDuration = 5 + Math.random() * 7 + "s"; f.style.animationDelay = -Math.random() * 10 + "s";
        if (w === "leaves") f.style.background = ["#D0795A", "#E9A93B", "#C9A27A"][i % 3];
        seasonView.appendChild(f);
      }
    }
  }

  // ---------- Escenario ----------
  const back = $("#backL"), front = $("#frontL");
  let storyStep = 0;
  try { if (!localStorage.getItem("eko-valley-story-v1")) storyStep = 1; } catch (_) { storyStep = 1; }
  let suppressGardenClick = 0, gardenDrag = null;
  function storyTarget(p) { props.forEach((v) => v.el.classList.remove("story-target")); if (p) p.el.classList.add("story-target"); if (p === arch) archNear.el.classList.add("story-target"); }
  const props = [];
  function prop(src, ux, uh, layer, base, o = {}) {
    const el = document.createElement("div"); el.className = "prop" + (o.sway ? " sway" : "") + (o.click ? " interactable" : "");
    el.innerHTML = `<img src="art/valley/${src}" alt="" draggable="false">`;
    (layer === "front" ? front : back).appendChild(el);
    const p = { el, src, ux, uh, ar: o.ar || 1, base, o };
    props.push(p);
    if (o.click) el.addEventListener("click", (e) => { e.stopPropagation(); if (Date.now() < suppressGardenClick) return; o.click(p, e); });
    return p;
  }
  // casa (1102×971); la puerta está un 18 % a la izquierda del centro
  const house = prop("house.webp", 900, 560, "back", "back", { ar: 1102 / 971, click: () => {
    if (storyStep === 1) {
      storyTarget(null); goTo(900 - 560 * 1102 / 971 * 0.18, () => { storyStep = 2; storyTarget(tree); say("Al principio, este valle era solo un prado tranquilo. Encontré esta casita y pensé que podría ser un buen lugar para vivir.", 5000); });
      return;
    }
    goTo(900 - 560 * 1102 / 971 * 0.18, () => enterHouse());
  } });
  // farolillos y ventana de la casa (se encienden de noche)
  const GLOWS = [[0.31, 0.19, 50], [0.67, 0.24, 42], [0.08, 0.54, 50], [0.96, 0.63, 50], [0.62, 0.62, 70]];
  for (const [gx, gy, gs] of GLOWS) { const g = document.createElement("div"); g.className = "glow"; g.dataset.g = [gx, gy, gs]; house.el.appendChild(g); }
  const tree = prop("tree.webp", 280, 360, "back", "back", { ar: 736 / 800, sway: true, click: () => {
    if (storyStep === 2) {
      storyTarget(null); goTo(330, () => {
        say("Planté este árbol para tener un sitio fresquito donde descansar después de pasear.", 4200);
        storyStep = 3;
        setTimeout(() => { if (storyStep !== 3) return; storyTarget(arch); say("Vamos, quiero enseñarte algo que descubrí al otro lado de la niebla.", 3000); goTo(Z.arch + 145, () => {
          storyStep = 4; storyTarget(scarecrow);
          try { localStorage.setItem("eko-valley-story-v1", "1"); } catch (_) {}
          say("Un día, la niebla se apartó y descubrí este huerto. Don Paja ya estaba aquí… ¡Pensaba que se había quedado dormido de pie! Aquí podemos plantar semillas y regarlas para que crezcan.", 6200);
          setTimeout(() => { if (storyStep === 4) { storyStep = 5; storyTarget(seedBag); say("¿Me ayudas a plantar? Coge el saquito y arrástralo hasta un hueco del bancal.", 5200); } }, 6500);
        }); }, 4300);
      });
      return;
    }
    goTo(330, () => say(pick(["Este árbol es mi favorito", "Aquí da una sombrita estupenda", "Algún día le pondré un columpio"])));
  } });
  prop("bush.webp", 560, 120, "back", "back", { ar: 786 / 710, click: () => { butterflies(560); goTo(560, () => say(pick(["¡Qué florecitas!", "Huele a primavera", "Las flores lilas son las mejores"]))); } });
  prop("fence.webp", 1300, 90, "back", "back", { ar: 900 / 338 });
  prop("bush.webp", 1560, 100, "back", "back", { ar: 786 / 710, click: () => { butterflies(1560); goTo(1560, () => say(pick(["¡Mariposas!", "Las he despertado, perdón"]))); } });
  const bigTree = prop("tree.webp", 1820, 400, "back", "back", { ar: 736 / 800, sway: true, click: () => treeTap() });
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
  const archClick = () => goTo(E.x < Z.arch ? Z.arch + 145 : Z.arch - 145);
  // El arco está algo en perspectiva (el poste izquierdo queda más cerca). Para que Eko pase POR DEBAJO:
  // el arco entero queda detrás de él y una copia recortada al poste cercano va delante.
  const arch = prop("h-arch.webp", Z.arch, 360, "front", "front", { ar: 697 / 900, click: archClick });
  const archNear = prop("h-arch.webp", Z.arch, 360, "front", "front", { ar: 697 / 900, click: archClick });
  archNear.el.style.clipPath = "polygon(0 0, 36% 0, 36% 100%, 0 100%)"; archNear.el.style.pointerEvents = "none";
  const at = document.createElement("div"); at.className = "plaque"; at.textContent = "Huerto"; arch.el.appendChild(at);
  prop("h-shed.webp", 2520, 290, "back", "back", { ar: 900 / 820, click: () => goTo(2520, () => say(pick(["Aquí guardo las herramientas", "Huele a madera y a tierra", "Un día ordenaré este cobertizo… algún día", "Dentro hay más macetas que sitio"]))) });
  const BEDS = [{ ux: 2860 }, { ux: 3290 }], BED = { uh: 66, ar: 1000 / 202 };
  const beds = BEDS.map((b, j) => { const p = prop("g-bed.webp", b.ux, BED.uh, "back", "back", { ar: BED.ar, click: (_, e) => { const i = slotAtPoint(e.clientX, e.clientY); if (i >= 0 && !GD.slots[i]) act(i, "plant"); else if (i >= 0) explainPlant(i); } }); p.el.dataset.bedIndex = j; return p; });
  const bedFronts = BEDS.map(() => { const img = document.createElement("img"); img.className = "bed-front"; img.src = "art/valley/g-bed.webp"; img.alt = ""; img.draggable = false; back.appendChild(img); return img; });
  const scarecrow = prop("h-scarecrow.webp", 3075, 250, "back", "back", { ar: 572 / 800, sway: true, click: () => pajaTap() });
  const well = prop("h-well.webp", 3560, 230, "back", "back", { ar: 627 / 800, click: () => goTo(3500, () => fillCan()) });
  const can = prop("g-can.webp", 2590, 58, "front", "front", { ar: 500 / 265, click: () => waterNext() });
  can.el.dataset.gardenTool = "water";
  const seedBag = prop("g-seeds.webp", 2660, 82, "front", "front", { ar: 436 / 500, click: () => plantNext() });
  seedBag.el.dataset.gardenTool = "seed";
  const barrow = prop("h-barrow.webp", 3090, 92, "front", "front", { ar: 600 / 253, click: () => goTo(3030, () => emptyCart()) });
  const SX = [0.2, 0.5, 0.8];                                 // huecos de cada bancal (fracción del ancho)
  const ART = { 0: ["g-sprout.webp", 347 / 400, 62], 1: ["g-young.webp", 500 / 475, 88], carrot: ["g-carrotplant.webp", 461 / 500, 108], tomato: ["g-tomato.webp", 447 / 600, 146] };
  const plants = GD.slots.map((_, i) => { const d = document.createElement("div"); d.className = "plant"; d.dataset.slot = i; d.innerHTML = `<img alt="" draggable="false"><b class="thirst"></b>`; d.addEventListener("click", (e) => { e.stopPropagation(); if (Date.now() < suppressGardenClick) return; const s = GD.slots[i]; if (s && (s.st >= 2 || thirsty(s))) act(i); else explainPlant(i); }); back.appendChild(d); return d; });
  const slotX = (i) => BEDS[Math.floor(i / 3)].ux + (SX[i % 3] - 0.5) * BED.uh * BED.ar;
  const stage = (s) => (s.st >= 2 ? s.c : s.st);
  const thirsty = (s) => s.st < 2 && !(s.wet > s.since);
  function grow() {
    const now = Date.now(); let ch = false;
    for (const s of GD.slots) if (s && s.st < 2 && s.wet > s.since && now - s.since >= GROW * (weedy(GD.slots.indexOf(s)) ? 1.5 : 1)) { s.st++; s.since = now; ch = true; }
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
    const full = (GD.cart.carrot || 0) + (GD.cart.tomato || 0) + (GD.cart.apple || 0) > 0, im = barrow.el.firstChild;
    barrow.ar = full ? 600 / 358 : 600 / 253; barrow.uh = full ? 120 : 92;
    if (!im.src.endsWith(full ? "h-barrowfull.webp" : "h-barrow.webp")) im.src = "art/valley/" + (full ? "h-barrowfull.webp" : "h-barrow.webp");
    layout();
  }
  function gLayout() {
    const bh = U(BED.uh), bw = bh * BED.ar, bedTop = BACK() - bh, base = bedTop + bh * 0.40;
    beds.forEach((b) => { b.el.style.zIndex = 5; });
    bedFronts.forEach((img, i) => Object.assign(img.style, { left: U(BEDS[i].ux) - bw / 2 + "px", top: bedTop + "px", width: bw + "px", height: bh + "px", zIndex: 8 }));
    plants.forEach((d, i) => { if (!d.dataset.uh) return; const h = U(+d.dataset.uh), w = h * +d.dataset.ar; Object.assign(d.style, { left: U(slotX(i)) - w / 2 + "px", top: base - h + "px", width: w + "px", height: h + "px" }); });
    // Las hojas quedan sobre la tierra; el frente del bancal tapa la base y las integra en el parterre.
    for (const d of plants) d.style.zIndex = 7;
    Object.assign(sun1.style, { left: U(Z.x0) + "px", width: U(Z.x1 - Z.x0 + 200) + "px", top: groundTop() + G() * 0.14 - U(230) + "px", height: U(240) + "px", backgroundSize: "auto 100%" });
    Object.assign(at.style, { left: "32%", width: "36%", top: "19%", height: "10%", fontSize: U(20) + "px", lineHeight: U(34) + "px" });
  }
  function explainPlant(i) {
    const s = GD.slots[i];
    if (!s) { say("Aquí podemos plantar algo. Arrastra el saquito de semillas hasta este hueco."); return; }
    if (s.st >= 2) { say(s.c === "carrot" ? "¡La zanahoria está lista! Arrástrala a la carretilla para recogerla." : "¡Los tomates están listos! Arrastra la planta a la carretilla para recogerlos."); return; }
    if (thirsty(s)) { say("Esta plantita tiene sed. Arrastra la regadera hasta ella para darle agua."); return; }
    const left = Math.max(0, GROW - (Date.now() - s.since)), hrs = Math.ceil(left / 3600e3);
    const eta = left < 3600e3 ? "menos de una hora" : hrs === 1 ? "una hora" : `${hrs} horas`;
    say(left > 0 && !testMode ? `Está creciendo. Le falta aproximadamente ${eta} para cambiar.` : "Está creciendo; pronto cambiará un poquito.");
  }
  function plantNext() { const i = GD.slots.findIndex((s) => !s); if (i < 0) { say(pick(GL.full)); return; } act(i, "plant"); }
  function waterNext() {
    const i = GD.slots.findIndex((s) => s && thirsty(s));
    if (i < 0) { say(pick(GL.nodry)); return; }
    if (GD.water <= 0) { say(pick(GL.empty), 1800); goTo(3500, () => fillCan(() => act(i, "water"))); return; }
    act(i, "water");
  }
  function waterPrompt() { say(`Cógeme y llévame sobre una planta que tenga sed. Te quedan ${GD.water} ${GD.water === 1 ? "riego" : "riegos"}.`); }
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
  function act(i, action = "auto") {
    if (E.exiting) return;
    if (gBusy) { say("¡Un segundo, que termino esto!", 1600); return; }
    goTo(slotX(i) - 90, () => {
      E.face = 1;
      const s = GD.slots[i], bx = U(slotX(i)), by = BACK() - U(BED.uh) * 0.5;
      if (action === "plant" && s) { say("Ese hueco ya está ocupado. Prueba con otro."); return; }
      if (action === "water" && (!s || !thirsty(s))) { say(s ? "Esta planta no necesita agua ahora." : "Primero tenemos que plantar algo aquí."); return; }
      if (action === "harvest" && (!s || s.st < 2)) { say(s ? "Todavía no está lista para cosechar." : "Aquí no hay nada que cosechar."); return; }
      if (!s) {
        say(pick(GL.plant), 1500);
        work("dig", 1500, () => { const c = (GD.hv.carrot || 0) <= (GD.hv.tomato || 0) ? (Math.random() < 0.65 ? "carrot" : "tomato") : (Math.random() < 0.65 ? "tomato" : "carrot"); GD.slots[i] = { c, st: 0, since: Date.now(), wet: 0 }; gSave(); drawPlants(); statAdd("plant"); plants[i].classList.add("pop"); setTimeout(() => plants[i].classList.remove("pop"), 600); fx("dirt", bx, by, 8, 300); say(pick(GL.planted), 2200); if (storyStep === 5) { storyStep = 6; storyTarget(can); setTimeout(() => say("¡Muy bien! Ahora coge la regadera y llévala hasta la plantita.", 4500), 700); } });
        fx("dirt", bx, by, 10, 1200);
      } else if (thirsty(s)) {
        if (GD.water <= 0) { say(pick(GL.empty), 1800); setTimeout(() => goTo(3500, () => fillCan(() => act(i, "water"))), 900); return; }
        say(pick(GL.water), 1800);
        can.el.classList.add("held"); work("water", 1900, () => { can.el.classList.remove("held"); can.el.style.transform = ""; GD.water--; s.since = Date.now(); s.wet = s.since + 1; gSave(); drawPlants(); statAdd("waterPlant"); say(pick(GL.wait) + (GD.water === 0 ? " Y la regadera se ha vaciado." : ""), 2400); if (storyStep === 6) { storyStep = 0; storyTarget(null); setTimeout(() => say("¡Hecho! Ahora la dejamos crecer. Cuando tenga sed o esté lista, te aviso.", 3500), 700); } });
        setTimeout(() => fx("drop", bx, by - U(110), 14, 1200), 400);
      } else if (s.st < 2) {
        const left = Math.max(0, GROW - (Date.now() - s.since)), hrs = Math.ceil(left / 3600e3);
        say(left > 0 && !testMode ? `${pick(GL.wait)} (unas ${hrs} h)` : pick(GL.wait), 2600);
      } else {
        work("dig", 1100, () => {
          const n = s.c === "tomato" ? 3 - Math.min(2, s.eaten || 0) : 1; s.eaten = 0;
          GD.hv[s.c] = (GD.hv[s.c] || 0) + n; GD.cart[s.c] = (GD.cart[s.c] || 0) + n; statAdd(s.c, n);
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
  // Estadísticas para «Nuestra semana» (misma clave que stats.js en la ventana principal)
  function statAdd(key, n = 1) {
    try {
      const s = JSON.parse(localStorage.getItem("eko-stats") || "{}"), d = new Date();
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const day = s[k] || (s[k] = {}); day[key] = (day[key] || 0) + n; localStorage.setItem("eko-stats", JSON.stringify(s));
    } catch (_) {}
  }
  statAdd("valley");
  // ---------- Herramientas en tu mano ----------
  // Coges la regadera o el saquito de verdad (el original desaparece de su sitio y vuelve al soltarlo).
  // Pasando la regadera por encima de una planta con sed, la riegas; por el pozo, la llenas. Con el saquito, plantas en un hueco libre.
  // Mientras tanto Eko se aparta y comenta lo que haces. Un toque sin arrastrar sigue siendo «hazlo tú, Eko».
  const DWELL = { water: 550, fill: 650, seed: 380 };
  const EC = {
    water: ["¡Eso, riega tú!", "Te miro desde aquí", "Cuidado, que pesa un poquito"],
    seed: ["¿Dónde plantamos?", "Busca un hueco libre", "¡Tú eliges el sitio!"],
    watered: ["¡Glu, glu! Bien regada", "¡Esa tenía sed!", "¡Perfecto!", "Riegas mejor que yo", "¡Qué fresquita!"],
    noNeed: ["Esa ya tiene agua", "Esa no necesita más, de momento"],
    empty: ["¡Se ha vaciado! Llévala al pozo", "Sin agua… ¡al pozo!"],
    filled: ["¡Llena hasta arriba!", "Clonc, clonc… ¡llena!", "Agua fresquita del pozo"],
    full: ["Ya está llena"],
    planted: ["¡Plantada! Ahora necesita agua", "¡Qué bien se te da!", "Una semillita más", "¡Ahí crecerá genial!"],
    taken: ["Ahí ya hay algo plantado"],
    noRoom: ["Ya no quedan huecos libres"],
  };
  let eTalk = 0;
  function comment(key, force = false) {
    if (!force && Date.now() - eTalk < 2200) return;
    eTalk = Date.now(); say(pick(EC[key]), 2200);
  }
  function stepAside() {
    // Eko se aparta de los bancales para no estorbar y mira hacia donde trabajas
    if (gBusy) return;
    const side = E.x < 3000 ? 2440 : 3690;
    if (E.x > 2600 && E.x < 3560) goTo(side);
  }
  const plantPos = (i) => [U(slotX(i)), BACK() - U(BED.uh) * 0.5];
  function userPlant(i) {
    if (GD.slots[i]) return false;
    const c = (GD.hv.carrot || 0) <= (GD.hv.tomato || 0) ? (Math.random() < 0.65 ? "carrot" : "tomato") : (Math.random() < 0.65 ? "tomato" : "carrot");
    GD.slots[i] = { c, st: 0, since: Date.now(), wet: 0 }; gSave(); drawPlants(); statAdd("plant");
    plants[i].classList.add("pop"); setTimeout(() => plants[i].classList.remove("pop"), 600);
    const [bx, by] = plantPos(i); fx("dirt", bx, by, 10, 400);
    if (storyStep === 5) { storyStep = 6; storyTarget(can); setTimeout(() => say("¡Muy bien! Ahora coge la regadera y pásala por encima de la plantita.", 4500), 300); }
    else comment(GD.slots.some((s) => !s) ? "planted" : "noRoom", true);
    return true;
  }
  function userWater(i) {
    const s = GD.slots[i];
    if (!s || !thirsty(s)) return false;
    if (GD.water <= 0) { comment("empty", true); return false; }
    GD.water--; s.since = Date.now(); s.wet = s.since + 1; gSave(); drawPlants(); statAdd("waterPlant");
    const [bx, by] = plantPos(i); fx("drop", bx, by - U(110), 14, 900);
    if (storyStep === 6) { storyStep = 0; storyTarget(null); setTimeout(() => say("¡Hecho! Ahora la dejamos crecer. Cuando tenga sed o esté lista, te aviso.", 3500), 300); }
    else if (GD.water === 0) comment("empty", true);
    else if (GD.paja.revealed && Math.random() < 0.15) pSay(pick(["Buen pulso. Ni una gota fuera.", "Ni una gota en mis zapatos. Ah, que no tengo."]), 2600);
    else comment("watered", true);
    return true;
  }
  function userFill() {
    if (GD.water >= CAN) { comment("full"); return false; }
    GD.water = CAN; gSave(); fx("drop", U(well.ux), BACK() - U(120), 8, 500); comment("filled", true);
    return true;
  }
  function harvestNow(i) {
    const s = GD.slots[i]; if (!s || s.st < 2) return false;
    const [bx, by] = plantPos(i), n = s.c === "tomato" ? 3 - Math.min(2, s.eaten || 0) : 1; s.eaten = 0;
    GD.hv[s.c] = (GD.hv[s.c] || 0) + n; GD.cart[s.c] = (GD.cart[s.c] || 0) + n; statAdd(s.c, n);
    if (s.c === "carrot") GD.slots[i] = null; else { s.st = 1; s.since = Date.now(); s.wet = 0; }
    floatText(`+${n} ${n === 1 ? (s.c === "carrot" ? "zanahoria" : "tomate") : (s.c === "carrot" ? "zanahorias" : "tomates")}`, U(barrow.ux), BACK() - U(130));
    gSave(); drawPlants(); fx("dirt", bx, by, 8, 300);
    say(pick(GL[s.c]), 2200);
    return true;
  }

  function beginGardenDrag(e, kind, index = -1) {
    if (e.button !== 0 || inHouse) return;
    if (kind === "harvest" && (!GD.slots[index] || GD.slots[index].st < 2)) return;
    e.preventDefault(); e.stopPropagation();
    const tool = kind === "water" ? can : kind === "seed" ? seedBag : null;
    const src = kind === "water" ? "g-can.webp" : kind === "seed" ? "g-seeds.webp" : GD.slots[index].c === "carrot" ? "g-carrot.webp" : "g-tomato.webp";
    const r = tool ? tool.el.getBoundingClientRect() : null;
    gardenDrag = { kind, index, tool, src, r, x: e.clientX, y: e.clientY, ox: r ? e.clientX - r.left : 38, oy: r ? e.clientY - r.top : 38, moved: false, ghost: null, aim: null, aimT: 0, done: new Set(), px: e.clientX, py: e.clientY };
  }
  function startCarry(d) {
    d.moved = true; storyTarget(null);
    const g = document.createElement("img"); g.className = "garden-drag"; g.src = "art/valley/" + d.src; g.alt = "";
    if (d.r) Object.assign(g.style, { width: d.r.width + "px", height: d.r.height + "px" });
    document.body.appendChild(g); d.ghost = g;
    if (d.tool) { d.tool.el.style.visibility = "hidden"; stepAside(); comment(d.kind, true); }
  }
  function moveGardenDrag(e) {
    const d = gardenDrag; if (!d) return;
    d.px = e.clientX; d.py = e.clientY;
    if (!d.moved) { if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return; startCarry(d); }
    const w = d.ghost.offsetWidth || 76, h = d.ghost.offsetHeight || 76;
    const ox = d.r ? d.ox : w / 2, oy = d.r ? d.oy : h / 2;
    d.ghost.style.left = e.clientX - ox + "px"; d.ghost.style.top = e.clientY - oy + "px";
  }
  // Lo que hay bajo la herramienta: para la regadera se mira el pico (abajo a la izquierda), para el saquito su base
  function aimAt(d) {
    const gr = d.ghost.getBoundingClientRect();
    const x = d.kind === "water" ? gr.left + gr.width * 0.12 : gr.left + gr.width / 2, y = gr.top + gr.height * (d.kind === "water" ? 0.55 : 0.9);
    if (d.kind === "water") {
      if (near(well.el, x, y, 10)) return "well";
      const i = slotAtPoint(x, y + U(60)); return i >= 0 && GD.slots[i] ? i : null;
    }
    if (d.kind === "seed") { const i = slotAtPoint(x, y); return i >= 0 ? i : null; }
    return null;
  }
  function carryTick() {
    const d = gardenDrag;
    if (d && d.moved && d.kind !== "harvest") {
      const a = aimAt(d), now = performance.now();
      if (a !== d.aim) { d.aim = a; d.aimT = now; }
      let pouring = false;
      if (a === "well") { if (GD.water < CAN) { pouring = true; if (now - d.aimT > DWELL.fill && !d.done.has("well")) { d.done.add("well"); userFill(); } } else if (!d.done.has("wellFull")) { d.done.add("wellFull"); comment("full"); } }
      else if (a != null && d.kind === "water") {
        const s = GD.slots[a];
        if (s && thirsty(s)) { pouring = GD.water > 0; if (now - d.aimT > DWELL.water && !d.done.has(a)) { d.done.add(a); userWater(a); } }
        else if (!d.done.has("no" + a)) { d.done.add("no" + a); comment("noNeed"); }
      } else if (a != null && d.kind === "seed") {
        if (!GD.slots[a]) { if (now - d.aimT > DWELL.seed) { d.done.add(a); userPlant(a); } }
        else if (!d.done.has("no" + a) && !d.done.has(a)) { d.done.add("no" + a); comment("taken"); }
      }
      d.ghost.classList.toggle("pour", pouring && d.kind === "water");
      if (pouring && d.kind === "water" && a !== "well" && Math.random() < 0.35) {
        // pico de la regadera ya inclinada (−32° sobre el asa): ≈ 6 % del ancho y 91 % del alto de la caja sin girar
        const g = d.ghost, fr = front.getBoundingClientRect(), wx = parseFloat(g.style.left) + g.offsetWidth * 0.06 - fr.left, wy = parseFloat(g.style.top) + g.offsetHeight * 0.91 - fr.top;
        const dr = document.createElement("i"); dr.className = "drop pourDrop"; Object.assign(dr.style, { left: wx + "px", top: wy + "px" }); front.appendChild(dr); setTimeout(() => dr.remove(), 900);
      }
      if (E.tx == null && !gBusy) E.face = (d.px + cam) / k > E.x ? 1 : -1;
    }
    requestAnimationFrame(carryTick);
  }
  requestAnimationFrame(carryTick);
  function putBack(d) {
    if (!d.ghost) return;
    const g = d.ghost;
    if (!d.tool) { g.remove(); return; }
    const r = d.tool.el.getBoundingClientRect();
    g.classList.remove("pour"); g.classList.add("back");
    Object.assign(g.style, { left: r.left + "px", top: r.top + "px" });
    setTimeout(() => { g.remove(); d.tool.el.style.visibility = ""; }, 320);
  }
  function dropGardenDrag(e) {
    if (!gardenDrag) return;
    const d = gardenDrag; gardenDrag = null; suppressGardenClick = Date.now() + 350;
    if (!d.moved) {
      if (d.kind === "water") waterNext();       // un toque: Eko lo hace solo con la primera que lo necesite
      else if (d.kind === "seed") plantNext();
      else act(d.index, "harvest");
      return;
    }
    const x = e.clientX, y = e.clientY;
    if (d.kind === "harvest") {
      d.ghost.remove();
      if (near(barrow.el, x, y)) harvestNow(d.index); else say("Llévala hasta la carretilla para recogerla.", 2400);
      return;
    }
    // Si sueltas justo encima de algo antes de que dé tiempo, también cuenta
    const a = aimAt(d);
    if (d.kind === "water" && a === "well" && !d.done.has("well")) userFill();
    else if (d.kind === "water" && a != null && a !== "well" && !d.done.has(a)) userWater(a);
    else if (d.kind === "seed" && a != null && !GD.slots[a]) userPlant(a);
    putBack(d);
  }
  // ¿Qué hueco del bancal hay bajo el puntero? Se mide por posición (con margen por arriba para las plantas altas),
  // así da igual soltar sobre la tierra, el borde delantero del bancal o la propia planta.
  const near = (el, x, y, pad = 24) => { const r = el.getBoundingClientRect(); return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad; };
  function slotAtPoint(x, y) {
    for (let j = 0; j < beds.length; j++) {
      const r = beds[j].el.getBoundingClientRect();
      if (x < r.left - 16 || x > r.right + 16 || y < r.top - r.height * 2.6 || y > r.bottom + 20) continue;
      const wx = (x + cam) / k;
      return [0, 1, 2].map((n) => j * 3 + n).sort((a, b) => Math.abs(slotX(a) - wx) - Math.abs(slotX(b) - wx))[0];
    }
    return -1;
  }
  can.el.addEventListener("pointerdown", (e) => beginGardenDrag(e, "water"));
  seedBag.el.addEventListener("pointerdown", (e) => beginGardenDrag(e, "seed"));
  plants.forEach((p, i) => p.addEventListener("pointerdown", (e) => beginGardenDrag(e, "harvest", i)));
  addEventListener("pointermove", moveGardenDrag);
  addEventListener("pointerup", dropGardenDrag);
  const cancelGardenDrag = () => { const d = gardenDrag; if (!d) return; gardenDrag = null; if (d.ghost) putBack(d); };
  addEventListener("pointercancel", cancelGardenDrag);
  addEventListener("blur", cancelGardenDrag);
  let pajaI = -1;
  function chatPaja() {
    const r = GD.slots.filter((s) => s && s.st >= 2).length, d = GD.slots.filter((s) => s && thirsty(s)).length;
    if (r && Math.random() < 0.5) { say("Don Paja dice que hay cosas listas para cosechar", 2600); return; }
    if (d && Math.random() < 0.5) { say("Don Paja me chiva que alguna planta tiene sed", 2600); return; }
    pajaI = (pajaI + 1 + Math.floor(Math.random() * (GL.paja.length - 1))) % GL.paja.length; say(GL.paja[pajaI], 2800);
  }
  const inGarden = () => E.x > Z.arch;
  function gardenTalk() {
    const n = GD.slots.filter((s) => s && thirsty(s)).length, r = GD.slots.filter((s) => s && s.st >= 2).length;
    if (inGarden()) return r ? "¡Hay cosas listas para cosechar!" : n ? "Algunas plantas tienen sed" : GD.slots.every((s) => !s) ? "¿Plantamos algo?" : pick(["Me encanta este sitio", "Los girasoles siempre miran al sol", "Don Paja hace muy bien su trabajo"]);
    return r ? "¡Hay cosas listas en el huerto!" : n ? "Las plantas del huerto tienen sed" : "";
  }
  function skipStoryToGarden() {
    try { localStorage.setItem("eko-valley-story-v1", "1"); } catch (_) {}
    if (GD.slots.some(Boolean)) { storyStep = 0; gardenWelcome(); return; }
    storyStep = 5; storyTarget(seedBag);
    say("¡Has encontrado el huerto! Don Paja lo cuida. ¿Me ayudas a plantar? Arrastra el saquito hasta un hueco del bancal.", 5200);
  }
  function gardenWelcome() {
    const dry = GD.slots.filter((s) => s && thirsty(s)).length;
    const ripe = GD.slots.filter((s) => s && s.st >= 2).length;
    const empty = GD.slots.filter((s) => !s).length;
    if (dry && GD.water <= 0) { storyTarget(well); say(`${dry === 1 ? "Una planta tiene" : `${dry} plantas tienen`} sed. La regadera está vacía; vamos al pozo.`, 3600); }
    else if (dry) { storyTarget(can); say(`${dry === 1 ? "Esta plantita tiene" : `${dry} plantas tienen`} sed. Coge la regadera y llévala hasta una de ellas.`, 3600); }
    else if (ripe) { storyTarget(barrow); say(ripe === 1 ? "Hay una planta lista para cosechar. Arrástrala a la carretilla." : `Hay ${ripe} plantas listas para cosechar. Arrástralas a la carretilla.`, 3600); }
    else if (empty) { storyTarget(seedBag); say("¿Plantamos algo? Arrastra el saquito de semillas hasta un hueco.", 3600); }
    else { storyTarget(null); say(pick(GL.hello), 2800); }
  }

  // ---------- El Estanque (a la derecha del huerto, cruzando el arroyo) ----------
  // Paisaje propio (fondo con cascada y suelo de orilla), sauce, juncos, rana, nenúfares y luciérnagas de noche.
  // Pescar: tocas el agua, Eko lanza la caña y, cuando el corcho se hunde («¡Pica!»), tocas en cualquier sitio para sacarlo.
  // Los peces se vuelven al agua (se apuntan en la colección); la bota, la botella y el cofre se guardan en el cubo.
  // La zona es UNA escena (p-escena, 1774×887) con la misma perspectiva que el valle; su camino coincide con el del valle.
  // 1 px de la escena = 1,114 unidades. La escena empieza en x 3780 y su borde de arriba queda 639 u por encima del suelo.
  const PZ = { x0: 3780, su: 1.114, top: 639, s0: 3815, s1: 4090, sign: 4115, pond: 4870, spot: 4716, frogX: 4985, bucketX: 4800, tx: 4838, ty: 61, dockY: 26,
               wx0: 4480, wx1: 5250, wy0: 89, wy1: -28 };   // agua: de x wx0 a wx1, de 89 u por encima del suelo a 28 u por encima
  let PD = { c: {}, n: 0, seen: false };
  try { PD = Object.assign(PD, JSON.parse(localStorage.getItem("eko-pond") || "{}")); } catch (_) {}
  const pSave = () => { try { localStorage.setItem("eko-pond", JSON.stringify(PD)); } catch (_) {} };
  const CATCH = [
    ["coral", "pez coral", "p-pez-coral.webp", 30, ["¡Un pez coral! Qué gordito", "¡Pez coral! Hola, pequeño"]],
    ["azul", "pez azul", "p-pez-azul.webp", 25, ["¡Un pez azul a rayas!", "¡Mira qué rayitas!"]],
    ["salvia", "pez salvia", "p-pez-salvia.webp", 20, ["¡Un pez con lunares!", "¡Pez salvia! Parece un pepinillo con aletas"]],
    ["lavanda", "pez lavanda", "p-pez-lavanda.webp", 11, ["¡Mira qué aletas tiene!", "¡Un pez lavanda! Qué elegante"]],
    ["bota", "bota vieja", "p-bota.webp", 7, ["Una bota… ¿de quién será?", "¡Una bota! Si sale la otra, me las pongo"]],
    ["botella", "botella con mensaje", "p-botella.webp", 4, ["¡Una botella con un mensaje!"]],
    ["dorado", "pez dorado", "p-pez-dorado.webp", 2, ["¡¡EL PEZ DORADO!! ¡Es rarísimo!", "¡No me lo creo! ¡El pez dorado!"]],
    ["cofre", "cofre del tesoro", "p-cofre.webp", 1, ["¡Un tesoro! ¡¡Un tesoro de verdad!!", "¡Somos ricos! Bueno, de bellotas"]],
  ];
  const FISHY = new Set(["coral", "azul", "salvia", "lavanda", "dorado"]);
  const MSGS = ["«Quien encuentre esto: ¡que tengas un día precioso!»", "«Hoy alguien piensa en ti. Seguro.»", "«Bebe agua y mira las nubes un rato.»", "«Lo importante no es pescar, es la compañía.»", "«Firmado: Don Paja.» … ¿¡Don Paja!?"];

  // Estilos propios del estanque (así world.html y su plantilla no cambian)
  const pst = document.createElement("style");
  pst.textContent = `
  #pondScene{position:absolute;pointer-events:none;background:url(art/valley/p-escena.webp) 0 0/100% 100% no-repeat;-webkit-mask-image:linear-gradient(90deg,transparent,#000 5%);mask-image:linear-gradient(90deg,transparent,#000 5%)}
  #pondWater{position:absolute;cursor:pointer}
  #eko.backview #eyes,#eko.backview #mouth,#eko.backview #accFace,#eko.backview #propFace,#eko.backview [class*=blush]{opacity:0;transition:opacity .2s}
  .prop.bob img{animation:pbob 3.4s ease-in-out infinite}@keyframes pbob{50%{transform:translateY(5%) rotate(-2deg)}}
  .prop.hop img{animation:phop .7s cubic-bezier(.3,1.5,.5,1)}@keyframes phop{40%{transform:translateY(-55%) scaleY(1.08)}70%{transform:translateY(0) scaleY(.9)}}
  #pondRod,#pondBob,.pcatch{position:absolute;pointer-events:none;z-index:33}
  #pondLine{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:32;overflow:visible}
  .pring{position:absolute;border:2px solid rgba(255,255,255,.85);border-radius:50%;pointer-events:none;z-index:6;animation:pring 1.2s ease-out forwards}
  @keyframes pring{from{transform:translate(-50%,-50%) scale(.2);opacity:1}to{transform:translate(-50%,-50%) scale(1);opacity:0}}
  .pfly{position:absolute;width:6px;height:6px;border-radius:50%;background:#fff6a8;box-shadow:0 0 8px 3px rgba(255,240,140,.75);pointer-events:none;z-index:31;opacity:0;animation:pfly 6s ease-in-out infinite}
  body.lit .pfly{opacity:1}@keyframes pfly{25%{transform:translate(18px,-14px)}50%{transform:translate(-8px,-26px);opacity:.3}75%{transform:translate(-20px,-8px)}}
  .pbang{position:absolute;transform:translate(-50%,-100%);font:800 26px "Segoe UI",system-ui,sans-serif;color:#D0795A;text-shadow:0 2px 0 #fff,0 0 8px #fff;pointer-events:none;z-index:46;animation:pbang .5s cubic-bezier(.3,1.6,.5,1)}
  @keyframes pbang{from{transform:translate(-50%,-60%) scale(.3)}}
  #pondCard{position:fixed;left:50%;top:70px;transform:translate(-50%,-8px);z-index:80;background:#fffaf6;color:#3b2f2a;border-radius:20px;box-shadow:0 10px 30px rgba(50,30,20,.3);padding:16px 18px 14px;width:min(380px,calc(100vw - 32px));box-sizing:border-box;font:14px "Segoe UI",system-ui,sans-serif;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s}
  #pondCard.on{opacity:1;pointer-events:auto;transform:translate(-50%,0)}
  #pondCard h3{margin:0;font:700 19px "Segoe Print","Comic Sans MS",cursive;color:#6b4a33}
  #pondCard .sub{margin:2px 0 10px;color:#9a8478;font-size:13px}
  #pondCard .x{position:absolute;right:10px;top:8px;border:none;background:none;font-size:22px;color:#9a8478;cursor:pointer}
  #pondCard .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  #pondCard .it{background:#f6ece2;border-radius:14px;padding:8px 4px 6px;text-align:center;font-size:11.5px;line-height:1.2;position:relative}
  #pondCard .it img{width:52px;height:44px;object-fit:contain;display:block;margin:0 auto 4px}
  #pondCard .it b{position:absolute;right:6px;top:4px;font-size:11px;color:#9a8478}
  #pondCard .it.no img{filter:grayscale(1) brightness(.4) opacity(.25)}#pondCard .it.no{color:#b5a59a}
  #pondCard .it.rare:not(.no){box-shadow:inset 0 0 0 2px #E9A93B}`;
  document.head.appendChild(pst);

  const scene = document.createElement("div"); scene.id = "pondScene"; back.appendChild(scene);
  // ---------- Agua viva (sin imágenes nuevas): destellos, cascada, espuma, arroyo y una ondulación suave ----------
  // Todo va dentro de la escena, en % de la imagen (1774×887), así se mueve y escala con ella.
  const SP = (x, y, w, h) => `left:${(x / 17.74).toFixed(2)}%;top:${(y / 8.87).toFixed(2)}%;width:${(w / 17.74).toFixed(2)}%;height:${(h / 8.87).toFixed(2)}%`;
  const WB = { x: 612, y: 488, w: 750, h: 134 };                                  // caja del agua del estanque
  const pfx = document.createElement("div"); pfx.id = "pondFx"; scene.appendChild(pfx);
  pfx.innerHTML = `
    <div class="pwave" style="${SP(WB.x, WB.y, WB.w, WB.h)}"></div>
    <div class="pshim" style="${SP(WB.x, WB.y, WB.w, WB.h)}"></div>
    <div class="pfall" style="${SP(950, 356, 84, 118)}"></div>
    <div class="pfoam" style="${SP(940, 462, 120, 34)}"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="pstream" style="${SP(0, 628, 310, 259)}"></div>`;
  const pwave = pfx.querySelector(".pwave");
  // filtro de ondulación (se anima solo; se apaga lejos del estanque)
  const pws = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  pws.setAttribute("width", "0"); pws.setAttribute("height", "0"); pws.style.position = "absolute";
  pws.innerHTML = `<filter id="pondWaveF" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.010 0.07" numOctaves="1" seed="3" result="n">
    <animate attributeName="baseFrequency" dur="9s" values="0.010 0.07;0.013 0.09;0.010 0.07" repeatCount="indefinite"/></feTurbulence>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/></filter>`;
  document.body.appendChild(pws);
  const pfxCss = document.createElement("style");
  pfxCss.textContent = `
  #pondFx{position:absolute;inset:0;pointer-events:none;display:none}#pondFx.live{display:block}
  #pondFx>div{position:absolute}
  #pondFx .pwave{clip-path:ellipse(49% 47% at 50% 52%);filter:url(#pondWaveF)}
  #pondFx .pshim{clip-path:ellipse(49% 47% at 50% 52%);mix-blend-mode:screen;opacity:.5;
    background:repeating-linear-gradient(172deg,transparent 0 18px,rgba(255,255,255,.32) 22px,transparent 27px),repeating-linear-gradient(6deg,transparent 0 30px,rgba(255,255,255,.2) 34px,transparent 41px);
    background-size:320px 64px,280px 90px;animation:pshim 11s linear infinite;
    -webkit-mask-image:radial-gradient(ellipse at 50% 55%,#000 45%,transparent 72%);mask-image:radial-gradient(ellipse at 50% 55%,#000 45%,transparent 72%)}
  @keyframes pshim{to{background-position:320px 0,-280px 0}}
  body.lit #pondFx .pshim{opacity:.32;filter:saturate(0) brightness(1.15)}
  #pondFx .pfall{mix-blend-mode:screen;opacity:.6;
    background:repeating-linear-gradient(180deg,rgba(255,255,255,0) 0 9px,rgba(255,255,255,.55) 13px,rgba(255,255,255,0) 19px),repeating-linear-gradient(180deg,rgba(255,255,255,0) 0 15px,rgba(220,245,255,.4) 19px,rgba(255,255,255,0) 26px);
    background-size:100% 38px,100% 52px;animation:pfall .7s linear infinite;
    -webkit-mask-image:linear-gradient(90deg,transparent,#000 22%,#000 78%,transparent);mask-image:linear-gradient(90deg,transparent,#000 22%,#000 78%,transparent)}
  @keyframes pfall{to{background-position:0 38px,0 104px}}
  #pondFx .pfoam i{position:absolute;bottom:20%;width:16%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#fff 30%,rgba(255,255,255,0) 70%);opacity:0;animation:pfoam 1.6s ease-out infinite}
  #pondFx .pfoam i:nth-child(1){left:18%;animation-delay:0s}#pondFx .pfoam i:nth-child(2){left:34%;animation-delay:.3s}#pondFx .pfoam i:nth-child(3){left:50%;animation-delay:.7s}
  #pondFx .pfoam i:nth-child(4){left:62%;animation-delay:1s}#pondFx .pfoam i:nth-child(5){left:28%;animation-delay:1.25s}#pondFx .pfoam i:nth-child(6){left:72%;animation-delay:.5s}
  @keyframes pfoam{0%{transform:translateY(0) scale(.4);opacity:0}25%{opacity:.9}100%{transform:translateY(-70%) scale(1.1);opacity:0}}
  #pondFx .pstream{mix-blend-mode:screen;opacity:.5;clip-path:polygon(44% 1%,97% 1%,89% 24%,69% 51%,82% 100%,0 100%,0 39%,23% 28%);
    background:repeating-linear-gradient(118deg,transparent 0 12px,rgba(255,255,255,.4) 15px,transparent 20px);background-size:110px 110px;animation:pstream 1.9s linear infinite}
  @keyframes pstream{to{background-position:-110px 110px}}`;
  document.head.appendChild(pfxCss);
  // la ondulación usa la misma imagen, recortada al agua, deformada por el filtro
  function pondFxLayout(sw, sh) {
    const k = sw / 1774;
    Object.assign(pwave.style, { backgroundImage: "url(art/valley/p-escena.webp)", backgroundSize: `${sw}px ${sh}px`, backgroundPosition: `${-WB.x * k}px ${-WB.y * k}px`, backgroundRepeat: "no-repeat" });
  }
  const water = document.createElement("div"); water.id = "pondWater"; back.appendChild(water);
  water.addEventListener("click", (e) => { e.stopPropagation(); pondTap(); });
  const pSign = prop("p-cartel.webp", PZ.sign, 150, "front", "front", { ar: 551 / 804, click: () => goTo(PZ.sign - 40, () => say(PD.n ? `Ya hemos pescado ${PD.n} ${PD.n === 1 ? "cosa" : "cosas"}. ¿Vamos a por más?` : "¡El estanque! ¿Vamos a pescar? Toca el agua", 3000)) });
  const frog = prop("p-rana.webp", PZ.frogX, 40, "back", "back", { ar: 450 / 473, z: 6, lift: 88, click: () => frogTap() });
  const bucket = prop("p-cubo.webp", PZ.bucketX, 38, "back", "back", { ar: 500 / 528, z: 6, lift: 52, click: () => goTo(PZ.spot, () => openPondCard()) });
  const flies = [];
  for (let i = 0; i < 9; i++) { const f = document.createElement("i"); f.className = "pfly"; f.style.animationDelay = -i * 0.7 + "s"; f.style.animationDuration = 5 + Math.random() * 3 + "s"; back.appendChild(f); flies.push({ el: f, ux: PZ.wx0 + Math.random() * (PZ.wx1 - PZ.wx0), uy: 80 + Math.random() * 180 }); }
  // caña, corcho e hilo (el hilo se dibuja en SVG sobre todo el mundo)
  const rod = document.createElement("img"); rod.id = "pondRod"; rod.src = "art/valley/p-cana.webp"; rod.alt = ""; rod.style.display = "none"; front.appendChild(rod);
  const bob = document.createElement("img"); bob.id = "pondBob"; bob.src = "art/valley/p-corcho.webp"; bob.alt = ""; bob.style.display = "none"; front.appendChild(bob);
  const lineSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); lineSvg.id = "pondLine"; lineSvg.innerHTML = `<path fill="none" stroke="rgba(70,48,36,.6)" stroke-width="1.8"/>`; front.appendChild(lineSvg);
  const linePath = lineSvg.firstChild;
  const pCard = document.createElement("div"); pCard.id = "pondCard"; document.body.appendChild(pCard);
  pCard.addEventListener("pointerdown", (e) => e.stopPropagation());
  pCard.addEventListener("click", (e) => { e.stopPropagation(); if (e.target.closest(".x")) pCard.classList.remove("on"); });

  // agua del estanque en px (para el corcho, las ondas y los peces que saltan)
  const pondBox = () => { const gt = groundTop(), y = gt - U(PZ.wy0); return { x: U(PZ.wx0), y, w: U(PZ.wx1 - PZ.wx0), h: gt - U(PZ.wy1) - y }; };
  // Al cruzar el arroyo (corta el camino), Eko da un saltito
  const streamHop = () => (!inHouse && E.x > PZ.s0 && E.x < PZ.s1) ? Math.sin(Math.PI * (E.x - PZ.s0) / (PZ.s1 - PZ.s0)) * U(70) : 0;
  const waterPt = (fx, fy) => { const b = pondBox(); return { x: b.x + b.w * fx, y: b.y + b.h * fy }; };
  function ring(x, y, size) { const r = document.createElement("i"); r.className = "pring"; Object.assign(r.style, { left: x + "px", top: y + "px", width: size + "px", height: size * 0.38 + "px" }); back.appendChild(r); setTimeout(() => r.remove(), 1300); }
  function bang(t, x, y) { const d = document.createElement("div"); d.className = "pbang"; d.textContent = t; Object.assign(d.style, { left: x + "px", top: y + "px", fontSize: U(30) + "px" }); front.appendChild(d); setTimeout(() => d.remove(), 900); }

  function pondLayout() {
    const gt = groundTop(), sw = U(1774 * PZ.su), sh = U(887 * PZ.su);
    Object.assign(scene.style, { left: U(PZ.x0) + "px", top: gt - U(PZ.top) + "px", width: sw + "px", height: sh + "px", zIndex: 1 });
    pondFxLayout(sw, sh);
    const b = pondBox(); Object.assign(water.style, { left: b.x + "px", top: b.y + "px", width: b.w + "px", height: b.h + "px", zIndex: 5 });
    const rh = U(92); Object.assign(rod.style, { height: rh + "px", width: rh * 500 / 632 + "px" });
    const bh = U(28); Object.assign(bob.style, { height: bh + "px", width: bh * 200 / 264 + "px" });
    for (const f of flies) Object.assign(f.el.style, { left: U(f.ux) + "px", top: BACK() - U(f.uy) + "px" });
  }

  // ---------- Pescar ----------
  const FI = { st: null, t0: 0, biteAt: 0, misses: 0, tip: null, bx: 0, by: 0 };
  function pondTap() {
    if (FI.st === "bite") { reel(); return; }
    if (FI.st) { say(pick(["Shh… que se asustan los peces", "Paciencia, ya picará", "Estoy en ello…"]), 1600); return; }
    startFish();
  }
  function startFish() {
    FI.st = "walk";
    if (Math.abs(E.x - PZ.spot) < 6) E.x = PZ.spot + 6;                 // para que goTo siempre llegue y lance
    goTo(PZ.spot, () => {
      if (FI.st !== "walk") return;
      // se da la vuelta y camina por el muelle hacia el fondo (se hace más pequeño); al llegar al final, lanza
      E.face = 1; gBusy = true; FI.st = "board"; FI.misses = 0; pondDT = 1;
    });
  }
  function endFish() {
    FI.st = null; E.pose = null; gBusy = false; pondDT = 0;          // vuelve por el muelle hacia ti

    rod.style.display = bob.style.display = "none"; linePath.setAttribute("d", "");
  }
  function reel() {
    FI.st = "reel"; suppressGardenClick = Date.now() + 500;
    // ¿qué sale? (por pesos; lo raro, raro)
    let r = Math.random() * CATCH.reduce((a, c) => a + c[3], 0), it = CATCH[0];
    for (const c of CATCH) { r -= c[3]; if (r <= 0) { it = c; break; } }
    const [id, nm, src, , lines] = it;
    PD.c[id] = (PD.c[id] || 0) + 1; PD.n++; pSave(); statAdd("fish");
    ring(FI.bx, FI.by, U(70)); fx("drop", FI.bx, FI.by, 8, 300);
    const im = document.createElement("img"); im.className = "pcatch"; im.src = "art/valley/" + src; im.alt = "";
    const ih = U(id === "botella" || id === "bota" ? 70 : 54); Object.assign(im.style, { height: ih + "px", width: "auto" }); front.appendChild(im);
    const x0 = FI.bx, y0 = FI.by, x1 = FI.ekoX + U(10), y1 = FI.ekoY - U(30);
    const t0 = performance.now();
    rod.style.display = bob.style.display = "none"; linePath.setAttribute("d", "");
    const fly = (now) => {
      const q = Math.min(1, (now - t0) / 650), e = q * (2 - q);
      im.style.left = lerp(x0, x1, e) - ih * 0.6 + "px"; im.style.top = lerp(y0, y1, e) - Math.sin(q * Math.PI) * U(120) - ih / 2 + "px";
      im.style.transform = `rotate(${(1 - q) * -40}deg)`;
      if (q < 1) requestAnimationFrame(fly);
    };
    requestAnimationFrame(fly);
    E.wave = E.t;
    setTimeout(() => {
      say(pick(lines), 2600);
      if (id === "dorado" || id === "cofre") { fx("drop", x1, y1, 12, 500); bang("✦", x1, y1 - U(30)); }
    }, 650);
    // los peces vuelven al agua; las cosas, al cubo
    setTimeout(() => {
      const t1 = performance.now(), bx2 = FISHY.has(id) ? { x: U(PZ.tx + 60), y: groundTop() - U(PZ.ty + 6) } : (() => { const b = bucket.el.getBoundingClientRect(), w = front.getBoundingClientRect(); return { x: b.left - w.left + b.width / 2, y: b.top - w.top + b.height * 0.3 }; })();
      const back2 = (now) => {
        const q = Math.min(1, (now - t1) / 700), e = q * q;
        im.style.left = lerp(x1, bx2.x, e) - ih * 0.6 + "px"; im.style.top = lerp(y1, bx2.y, e) - Math.sin(q * Math.PI) * U(90) - ih / 2 + "px";
        im.style.transform = `rotate(${q * (FISHY.has(id) ? 160 : 20)}deg) scale(${1 - q * 0.5})`;
        if (q < 1) requestAnimationFrame(back2);
        else { im.remove(); if (FISHY.has(id)) { ring(bx2.x, bx2.y, U(60)); fx("drop", bx2.x, bx2.y, 6, 300); } else { bucket.el.classList.remove("hop"); void bucket.el.offsetWidth; bucket.el.classList.add("hop"); } }
      };
      requestAnimationFrame(back2);
      if (FISHY.has(id)) setTimeout(() => say(pick(["¡Adiós, pececito! Vuelve con tu familia", "Al agua otra vez. ¡Hasta la próxima!", "Lo apunto en mi colección y lo suelto"]), 2400), 900);
      else if (id === "botella") setTimeout(() => say("Dice: " + pick(MSGS), 4200), 900);
      endFish();
    }, 2300);
  }
  // Rana: salta y croa; a veces se tira al agua y vuelve a su nenúfar
  function frogTap() {
    frog.el.classList.remove("hop"); void frog.el.offsetWidth; frog.el.classList.add("hop");
    const b = frog.el.getBoundingClientRect(), w = front.getBoundingClientRect();
    bang(pick(["¡Croac!", "¡Cruac!", "Croooac"]), b.left - w.left + b.width / 2, b.top - w.top);
    if (Math.random() < 0.3) {
      setTimeout(() => { frog.el.style.opacity = "0"; const p = waterPt(0.6, 0.55); ring(p.x, p.y, U(70)); fx("drop", p.x, p.y, 6, 300); }, 380);
      setTimeout(() => { frog.el.style.opacity = ""; frog.el.classList.remove("hop"); void frog.el.offsetWidth; frog.el.classList.add("hop"); }, 2600);
    }
    if (Math.abs(E.x - frog.ux) > 400) goTo(frog.ux - 120);
  }
  function openPondCard() {
    const got = CATCH.filter((c) => PD.c[c[0]]).length;
    pCard.innerHTML = `<button class="x" aria-label="Cerrar">×</button><h3>Lo que hemos pescado</h3>
      <p class="sub">${PD.n ? `${PD.n} ${PD.n === 1 ? "vez" : "veces"} · ${got} de ${CATCH.length} distintas` : "Todavía nada. ¡Toca el agua para pescar!"}</p>
      <div class="grid">${CATCH.map(([id, nm, src, w]) => { const n = PD.c[id] || 0; return `<div class="it${n ? "" : " no"}${w <= 4 ? " rare" : ""}"><img src="art/valley/${src}" alt="">${n ? nm : "???"}${n > 1 ? `<b>×${n}</b>` : ""}</div>`; }).join("")}</div>`;
    pCard.classList.add("on");
    say(PD.n ? pick(["¡Mira nuestra colección!", "Los peces los soltamos, pero los apunto todos"]) : "El cubo está vacío. ¡Vamos a pescar!", 2400);
  }
  // Clic en cualquier sitio cuando pica: sacarlo (y que no cuente como «camina hasta aquí»)
  addEventListener("pointerdown", (e) => {
    if (FI.st !== "bite" || inHouse || e.target.closest("#pondCard") || e.target.closest("#pajaCard")) return;
    e.stopPropagation(); reel();
  }, true);
  // Peces que saltan solos de vez en cuando
  setInterval(() => {
    if (inHouse || Math.abs(E.x - PZ.pond) > 1400 || Math.random() < 0.4) return;
    const p = waterPt(0.25 + Math.random() * 0.5, 0.3 + Math.random() * 0.3); ring(p.x, p.y, U(50)); fx("drop", p.x, p.y, 4, 250);
  }, 7000);

  // Profundidad del muelle: 0 = en el camino, 1 = al final del muelle (de espaldas, más pequeño)
  let pondD = 0, pondDT = 0, pondLastT = 0;
  const pondFeet = () => lerp(PATH(), groundTop() - U(PZ.dockY), pondD);
  function pondFrame() {
    if (inHouse) return;
    const dt = Math.min(0.05, Math.max(0, E.t - (pondLastT || E.t))); pondLastT = E.t;
    if (pondD !== pondDT) pondD = pondDT > pondD ? Math.min(pondDT, pondD + dt / 1.3) : Math.max(pondDT, pondD - dt / 1.1);
    eko.classList.toggle("backview", pondDT === 1 && pondD > 0.02);
    pfx.classList.toggle("live", Math.abs(E.x - PZ.pond) < 1500);   // solo se anima cerca del estanque
    // la escena trae sus propias colinas: las del valle se apagan al entrar en esta zona
    const X = U(PZ.x0 + 60) - cam, mk = `linear-gradient(90deg,#000 ${X}px,transparent ${X + U(380)}px)`;
    for (const id of ["#far", "#mid"]) { const l = $(id); l.style.webkitMaskImage = l.style.maskImage = mk; }
    // primera visita
    if (!PD.seen && E.x > PZ.x0 + 80) { PD.seen = true; pSave(); say("¡Un estanque! ¿Pescamos? Toca el agua y lanzo la caña", 3600); }
    if (!FI.st || FI.st === "walk") { if (FI.st === "walk" && E.tx == null && Math.abs(E.x - PZ.spot) > 10) FI.st = null; return; }
    if (E.tx != null) { say("Vale, lo dejamos para luego", 1600); endFish(); return; }        // te lo has llevado a otro sitio
    if (FI.st === "board") {
      if (pondD < 1) return;
      FI.st = "cast"; FI.t0 = E.t; E.pose = "fish"; E.poseT = E.t;
      say(pick(["¡A pescar!", "A ver qué pica…", "Allá va… ¡zas!", "Silencio, que se asustan"]), 1700);
    }
    // caña en la mano y punta
    // Eko de espaldas al final del muelle (más pequeño): la caña sobre su hombro, hacia el agua
    const sc = 1 - 0.26 * pondD, h = EH() * sc, w = h * 240 / 310, ex = U(E.x), top = pondFeet() - h;
    FI.ekoX = ex; FI.ekoY = top;
    const rh = U(92) * sc, rw = rh * 500 / 632, rx = ex - w * 0.02, ry = top - h * 0.18;
    rod.style.height = rh + "px"; rod.style.width = rw + "px";
    Object.assign(rod.style, { display: "block", left: rx + "px", top: ry + "px", transform: `rotate(${FI.st === "bite" ? 10 : 0}deg)`, transformOrigin: "10% 95%" });
    const tip = { x: rx + rw * 0.93, y: ry + rh * 0.04 };
    const target = { x: U(PZ.tx), y: groundTop() - U(PZ.ty) }, q = E.t - FI.t0;   // agua abierta, entre el muelle y los nenúfares
    let bx = target.x, by = target.y;
    if (FI.st === "cast") {
      const k2 = Math.min(1, q / 0.7);
      bx = lerp(tip.x, target.x, k2); by = lerp(tip.y, target.y, k2) - Math.sin(k2 * Math.PI) * U(70);
      if (k2 >= 1) { FI.st = "wait"; FI.biteAt = E.t + 3 + Math.random() * 6; ring(target.x, target.y, U(50)); }
    } else if (FI.st === "wait") {
      by += Math.sin(E.t * 2.4) * U(1.5);
      if (E.t > FI.biteAt) { FI.st = "bite"; FI.t0 = E.t; bang("!", ex, top - U(20)); say("¡Pica! ¡Toca ya!", 1300); }
    } else if (FI.st === "bite") {
      by += U(5) + Math.abs(Math.sin(E.t * 22)) * U(4);
      if (Math.random() < 0.15) ring(bx, by + U(6), U(36));
      if (q > 1.4) {
        FI.misses++;
        if (FI.misses >= 3) { say("Hoy no pican mucho… Otro rato", 2200); endFish(); return; }
        say(pick(["¡Se ha escapado!", "¡Ay! Por poco", "Era muy rápido…"]), 1700); FI.st = "wait"; FI.biteAt = E.t + 3 + Math.random() * 5;
      }
    }
    FI.bx = bx; FI.by = by;
    const bh = U(28), bw = bh * 200 / 264;
    Object.assign(bob.style, { display: "block", left: bx - bw / 2 + "px", top: by - bh * 0.7 + "px" });
    const mx = (tip.x + bx) / 2, my = Math.max(tip.y, by) + U(FI.st === "bite" ? 4 : 26);
    linePath.setAttribute("d", `M${tip.x.toFixed(1)},${tip.y.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${bx.toFixed(1)},${(by - bh * 0.6).toFixed(1)}`);
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
      Object.assign(p.el.style, { left: U(p.ux) - w / 2 + "px", top: by - h - U((p.o && p.o.lift) || 0) + "px", width: w + "px", height: h + "px", zIndex: (p.o && p.o.z) || (p.base === "front" ? 30 : 5) });
      p.el.querySelectorAll(".glow").forEach((g) => { const [gx, gy, gs] = g.dataset.g.split(",").map(Number); const s = U(gs); Object.assign(g.style, { left: gx * w - s / 2 + "px", top: gy * h - s / 2 + "px", width: s + "px", height: s + "px" }); });
    }
    const sb = sign.el; Object.assign(st.style, { left: "4%", width: "92%", top: "13%", fontSize: U(21) + "px" });
    Object.assign(fogR.style, { left: U(OPEN.x1 - 120) + "px", width: U(WORLD - OPEN.x1 + 400) + "px", zIndex: 40 });
    Object.assign(fogL.style, { left: U(-400) + "px", width: U(OPEN.x0 + 380) + "px", zIndex: 40 });
    fogR.querySelectorAll(".mist").forEach((m, i) => Object.assign(m.style, { left: U(160 + (i % 3) * 110) + "px", top: H * (0.35 + 0.1 * i) + "px", width: U(360) + "px", height: U(200) + "px" }));
    void sb;
    gLayout();
    pondLayout();
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
  // La habitación se dibuja en un «escenario» con la proporción de su imagen (1672×941): antes se estiraba a la pantalla
  // y en monitores 4:3 o 5:4 la ventana y los muebles se deformaban. Todo lo de dentro se mide respecto a él.
  const houseStage = document.createElement("div"); houseStage.id = "houseStage"; interior.prepend(houseStage);
  for (const id of ["houseView", "houseRoom", "houseWallTint", "houseFloorTint", "houseProps", "houseExit", "houseActors"]) houseStage.appendChild($("#" + id));
  $("#houseStairs").remove();                                 // escalera dibujada con CSS: fuera hasta tener su imagen
  const ROOM_AR = 1672 / 941;
  let SW = W, SH = H;
  const hU = (v) => v * SH / 1080;
  function sizeStage() {
    // Siempre a lo ancho: en pantallas más cuadradas sobra hueco arriba (se rellena con el color de la pared), nunca se corta la puerta
    SW = W; SH = W / ROOM_AR;
    houseStage.classList.toggle("gap", SH < H - 2);
    Object.assign(houseStage.style, { width: SW + "px", height: SH + "px" });
  }
  const stagePt = (e) => { const r = houseStage.getBoundingClientRect(); return [(e.clientX - r.left) / SW, (e.clientY - r.top) / SH]; };
  let inHouse = false, houseX = 9, houseTarget = null, houseDone = null, houseWalk = false, houseLift = 0, houseScale = 1, houseClimb = null, houseSignature = "";
  // Distribución de la casa del valle, a escala de habitación real (medidas respecto a la altura de la habitación, SH):
  // la puerta mide ~0,66 SH, así que 1 m ≈ 0,33 SH. Todo lo que va contra la pared apoya en el zócalo (y ≈ 0,77–0,85);
  // la alfombra va delante, en el centro, y Eko camina por delante de los muebles.
  // x = centro en % del ancho · h = alto (fracción de SH) · y = dónde apoya (fracción de SH desde arriba)
  const HOME_FURNITURE = [
    { id: "bed", x: 25, h: 0.34, y: 0.85, ar: 1671 / 941, kind: "floor" },
    { id: "lamp", x: 90, h: 0.42, y: 0.80, ar: 1024 / 1536, kind: "floor" },
    { id: "rug", x: 56, h: 0.19, y: 0.975, ar: 2243 / 701, kind: "rug" },
    { id: "curtains", x: 50, top: 0.135, w: 26, ar: 1536 / 1024, kind: "wall" },
    { id: "cabinet", x: 75, h: 0.52, y: 0.815, ar: 1024 / 1536, kind: "floor" },
    { id: "pot", x: 45.5, h: 0.2, y: 0.85, ar: 1374 / 1145, kind: "floor" },
    { id: "trophy", h: 0.085, ar: 1199 / 1312, kind: "wall" },
  ];
  // Zonas tocables del salón [x, y, ancho, alto] en % de la habitación, y dónde se coloca Eko para cada una
  const SALON_SPOTS = {
    hat: [15, 26, 15, 24], dresser: [18, 50, 15, 29], window: [40, 30, 20, 29], ceiling: [44, 8, 12, 14],
    shelves: [68, 17, 17, 30], heart: [91, 25, 7, 21], armchair: [65, 48, 22, 34], mushroom: [88, 51, 10, 18],
    sidetable: [87, 68, 11, 20], table: [41, 59, 18, 25], rug: [26, 84, 47, 11],
  };
  const SALON_X = { hat: 22, dresser: 25, window: 50, ceiling: 50, shelves: 76, heart: 90, armchair: 77, mushroom: 88, sidetable: 88, table: 50, rug: 45, trophy: 28 };
  const SALON_LIGHTS = { ceiling: [50, 19, 34], mushroom: [93, 60.5, 20] };
  const LIGHT_KEY = "eko-salon-lights";
  const lightState = () => { try { return JSON.parse(localStorage.getItem(LIGHT_KEY) || "{}"); } catch (_) { return {}; } };
  const lightOn = (id) => { const st = lightState()[id]; return st == null ? (phase() === "night" || phase() === "dusk") : st; };
  function toggleLight(id) {
    const st = lightState(); st[id] = !lightOn(id); try { localStorage.setItem(LIGHT_KEY, JSON.stringify(st)); } catch (_) {}
    const g = houseProps.querySelector(`[data-light="${id}"]`); if (g) g.classList.toggle("on", st[id]);
    return st[id];
  }
  const houseItemX = (id) => (HOME_FURNITURE.find((v) => v.id === id) || {}).x || 50;
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
    const h = inHouse ? hU(240) : EH(), w = h * 240 / 310;
    svg.style.width = w + "px"; svg.style.height = h + "px";
    eko.style.width = w + "px"; eko.style.height = h + "px";
  }
  function say(t, ms = 2600) {
    const pb = document.getElementById("pajaBub"); if (pb) pb.classList.remove("on"); // nunca dos bocadillos a la vez
    bub.textContent = t; bub.classList.add("on"); E.talkUntil = E.t + ms / 1000;
    clearTimeout(say.tm); say.tm = setTimeout(() => bub.classList.remove("on"), ms);
  }
  bub.addEventListener("click", () => { bub.classList.remove("on"); clearTimeout(say.tm); });
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
    const el = document.createElement("button"), w = SW * widthPct / 100, h = w / ar;
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
    el.setAttribute("aria-label", pic.name); const w = SW * widthPct / 100, h = w / (400 / 500);
    Object.assign(el.style, { left: cx + "%", top: topPct + "%", width: w + "px", height: h + "px", zIndex: 3 });
    // Los cuadros del álbum ya incluyen su propio marco; no se superpone el marco vacío de la habitación.
    const art = document.createElement("img"); art.className = "art"; art.src = pic.src; art.alt = ""; art.draggable = false;
    el.appendChild(art); houseProps.appendChild(el); return el;
  }
  function houseSouvenirButton(item, cabinetBox, i) {
    const el = document.createElement("button"); el.type = "button"; el.className = "house-memento"; el.dataset.houseId = "sv:" + item.id; el.setAttribute("aria-label", item.name);
    const img = document.createElement("img"); img.src = item.src; img.alt = ""; img.draggable = false; el.appendChild(img);
    const row = Math.floor(i / 3), col = i % 3;
    const m = cabinetBox.w * 0.12;
    Object.assign(el.style, { left: cabinetBox.x + cabinetBox.w * ([0.37, 0.5, 0.63][col]) - m / 2 + "px", top: cabinetBox.y + cabinetBox.h * ([0.33, 0.5, 0.67][row]) - m + "px", width: m + "px", height: m + "px", zIndex: 40 });
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
    sizeStage(); houseProps.replaceChildren();
    const wallColors = ["", "rgba(246,213,210,.5)", "rgba(216,235,221,.5)", "rgba(225,217,242,.5)", "rgba(214,228,243,.5)", "rgba(247,227,181,.5)"];
    $("#houseWallTint").style.background = wallColors[c.wallC || 0] || "transparent";
    const floorTint = $("#houseFloorTint");
    floorTint.style.background = c.floorC === 1 ? "rgba(255,255,255,.28)" : c.floorC === 2 ? "rgba(84,51,30,.25)" : "transparent";
    floorTint.style.mixBlendMode = c.floorC === 1 ? "screen" : "multiply";
    const items = {};
    // El salón ya viene amueblado en su imagen (house-salon.webp). Encima van: zonas tocables, luces, trofeo y cuadros.
    const add = (cls, id, [x, y, w, h], z = 6) => {
      const el = document.createElement("button"); el.type = "button"; el.className = cls; if (id) el.dataset.houseId = id; el.setAttribute("aria-label", id || "");
      Object.assign(el.style, { left: x + "%", top: y + "%", width: w + "%", height: h + "%", zIndex: z }); houseProps.appendChild(el); return el;
    };
    for (const [id, box] of Object.entries(SALON_SPOTS)) add("house-spot", id, box);
    for (const [id, [x, y, d]] of Object.entries(SALON_LIGHTS)) {
      const g = document.createElement("div"); g.className = "house-glow" + (lightOn(id) ? " on" : ""); g.dataset.light = id;
      Object.assign(g.style, { left: x + "%", top: y + "%", width: SW * d / 100 + "px", height: SW * d / 100 + "px" }); houseProps.appendChild(g);
    }
    if (false && got.has("trophy") && !off.trophy) {   // fuera hasta tener trofeo del mismo estilo que el salón
      const t = add("house-item floor", "trophy", [0, 0, 0, 0], 7), h = SH * 0.075, w = h * 1199 / 1312;
      const img = document.createElement("img"); img.src = "art/house-trophy.png"; img.alt = ""; img.draggable = false; t.appendChild(img);
      Object.assign(t.style, { left: "30.2%", top: SH * 0.588 - h + "px", width: w + "px", height: h + "px" });
    }
    const picById = new Map(HOUSE_PICS.map((p) => [p.id, p]));
    const hung = Array.isArray(c.hung) ? c.hung : c.pic ? [c.pic] : [];
    const slots = [];   // los cuadros vuelven cuando haya marcos del mismo estilo que el salón
    for (let i = 0; i < Math.min(slots.length, hung.length); i++) {
      const pic = picById.get(hung[i]); if (!pic || !got.has("pic:" + pic.id)) continue;
      pictureAsset(pic, i, slots[i].cx, slots[i].t, slots[i].w);
    }
    const cabinet = null;
    if (cabinet) {
      const rect = cabinet.el.getBoundingClientRect(), sr = houseStage.getBoundingClientRect();
      rect.x -= sr.left; rect.y -= sr.top;
      const souvenirList = HOUSE_SOUVENIRS.filter((v) => got.has("sv:" + v.id)).sort((a, b) => b.rank - a.rank).slice(0, 9);
      souvenirList.forEach((v, i) => houseSouvenirButton(v, { x: rect.x, y: rect.y, w: rect.width, h: rect.height }, i));
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
  const SALON_SAY = {
    hat: ["Mi sombrero para los días de sol", "Con este sombrero voy al huerto"],
    dresser: ["En mi cómoda guardo bufandas y calcetines", "El cajón de abajo no cierra bien… shh"],
    window: () => phase() === "night" ? ["Mira cuántas estrellas hay esta noche", "De noche el valle duerme"] : ["Desde aquí veo todo el valle", "Hoy hace un día precioso"],
    heart: ["Un corazón. Me recuerda a ti", "Lo colgué el primer día"],
    armchair: ["¡Qué blandito! Aquí me echo la siesta", "Mi sillón favorito del mundo", "Aquí leo cuentos con la mantita"],
    sidetable: ["Mi mesita de noche", "Aquí dejo mis gafas… si las encuentro"],
    table: ["Aquí meriendo galletas", "Tengo un libro a medias"],
    rug: ["Esta alfombra es suavísima", "A veces me tumbo aquí a mirar el techo"],
  };
  function explainHouseItem(id) {
    if (SALON_X[id] != null && id !== "trophy") {
      if (id === "shelves") { moveHouseTo(SALON_X[id], openGallery); return; }
      if (id === "ceiling" || id === "mushroom") { moveHouseTo(SALON_X[id], () => { const on = toggleLight(id); say(on ? pick(["¡Luz!", "Así está más acogedor"]) : pick(["Apagada", "Ahorramos un poquito"]), 1600); }); return; }
      if (id === "heart") { const c = roomData(), hung = Array.isArray(c.hung) ? c.hung : c.pic ? [c.pic] : []; if (hung[0]) { explainHouseItem("picture:" + hung[0]); return; } }
      const l = SALON_SAY[id]; moveHouseTo(SALON_X[id], () => say(pick(typeof l === "function" ? l() : l), 2400)); return;
    }
    if (id === "cabinet") { moveHouseTo(houseItemX("cabinet"), openGallery); return; }
    if (id === "bed") { moveHouseTo(houseItemX("bed"), () => say(pick(["Qué bien se está en mi camita", "Aquí me echo una siestecita", "Mi rincón favorito para descansar"]), 2400)); return; }
    if (id === "lamp") { moveHouseTo(houseItemX("lamp"), () => say(pick(["Esta luz es perfecta para leer", "Me encanta mi lamparita", "Qué acogedor queda este rincón"]), 2200)); return; }
    if (id === "pot") { moveHouseTo(houseItemX("pot"), () => say(pick(["Mi plantita está preciosa", "Hay que acordarse de regarla", "Las hojas nuevas son una monada"]), 2200)); return; }
    if (id === "rug") { moveHouseTo(houseItemX("rug"), () => say("Esta alfombra es muy suave", 2000)); return; }
    if (id === "curtains") { moveHouseTo(houseItemX("curtains"), () => say("Desde aquí entra una luz preciosa", 2200)); return; }
    if (id === "trophy") { moveHouseTo(SALON_X.trophy, () => say("Mi trofeo, me acuerdo de cómo lo ganamos", 2300)); return; }
    if (id.startsWith("sv:")) {
      const item = HOUSE_SOUVENIRS.find((v) => v.id === id.slice(3)); if (!item) return;
      moveHouseTo(SALON_X.shelves, () => say(`Me acuerdo de ${item.name}. ${item.origin}`, 3000)); return;
    }
    if (id.startsWith("picture:")) {
      const pic = HOUSE_PICS.find((p) => p.id === id.slice(8)); if (!pic) return;
      moveHouseTo(SALON_X.heart, () => say(`${pic.name}: ${PICTURE_ORIGINS[pic.id] || "Es uno de mis recuerdos favoritos."}`, 3000)); return;
    }
  }
  function beginClimb() {
    if (houseClimb) return;
    moveHouseTo(84, () => { houseClimb = { t: E.t, told: false }; });
  }
  function exitHouse() {
    if (!inHouse || houseTarget != null || houseClimb) return;
    moveHouseTo(7.5, () => {
      inHouse = false; placeEko(); houseTarget = null; houseDone = null; houseGallery.classList.remove("on"); document.body.classList.remove("in-house"); interior.classList.remove("on");
      box.append(eko, bub, shd); E.x = house.ux - 560 * 1102 / 971 * 0.18; E.tx = null; E.then = null; E.entering = E.t; houseSignature = "";
      say(pick(["Ya estamos otra vez en el valle", "¡Qué bien se está en casa! ¿Paseamos?", "Vamos a dar una vuelta por el valle"]), 2500);
    });
  }
  $("#houseExit").addEventListener("click", (e) => { e.stopPropagation(); exitHouse(); });
  $("#houseGalleryClose").addEventListener("click", (e) => { e.stopPropagation(); houseGallery.classList.remove("on"); });
  houseGallery.addEventListener("click", (e) => { const b = e.target.closest("button[data-house-id]"); if (!b) return; houseGallery.classList.remove("on"); explainHouseItem(b.dataset.houseId); });
  interior.addEventListener("click", (e) => {
    if (!inHouse || houseGallery.classList.contains("on")) return;
    const item = e.target.closest("[data-house-id]"); if (item) { e.stopPropagation(); explainHouseItem(item.dataset.houseId); return; }
    if (e.target.closest("#houseExit")) return;
    const [px, py] = stagePt(e);
    if (px < 0.12 && py > 0.33) { exitHouse(); return; }
    moveHouseTo(px * 100);
  });
  document.addEventListener("click", (e) => {
    if (inHouse) return;
    if (Date.now() < suppressGardenClick) return; // el clic que sigue a soltar algo no es «camina hasta aquí»
    if (e.target.closest("#back") || e.target.closest(".prop") || e.target.closest("#eko") || e.target.closest("#bub")) return;
    goTo((e.clientX + cam) / k);
  });
  eko.addEventListener("click", (e) => { e.stopPropagation(); E.wave = E.t; say(pick(["¡Hola!", "¿Damos un paseo?", "¡Qué bien se está aquí fuera!", "¿A dónde vamos?"])); });

  // La casa del valle abre el interior; el botón superior sigue devolviendo al escritorio.
  function enterHouse() {
    if (E.exiting || inHouse) return;
    E.tx = null; E.then = null; E.exiting = E.t;
    say(pick(["¡A casa!", "Hogar, dulce hogar", "Vamos para dentro"]), 1400);
    setTimeout(() => {
      E.exiting = 0; E.x = house.ux - 560 * 1102 / 971 * 0.18; inHouse = true; sizeStage(); placeEko(); houseX = 13; houseTarget = null; houseDone = null; houseClimb = null;
      houseActors.append(eko, bub, shd); document.body.classList.add("in-house"); interior.classList.add("on"); renderHouse(true);
    }, 720);
  }
  function leaveValley() {
    if (E.exiting) return;
    E.exiting = E.t; say(pick(["¡De vuelta al escritorio!", "Luego volvemos al valle", "Bueno, voy contigo"]), 1400);
    setTimeout(() => $("#cover").classList.remove("off"), 900);
    setTimeout(() => emit("world-exit"), 2100);
  }
  $("#back").addEventListener("click", (e) => { e.stopPropagation(); if (Date.now() < suppressGardenClick) return; if (inHouse) { exitHouse(); return; } goTo(house.ux - 560 * 1102 / 971 * 0.18, () => leaveValley()); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") { if (gardenDrag) { cancelGardenDrag(); return; } if (inHouse) { if (houseGallery.classList.contains("on")) houseGallery.classList.remove("on"); else exitHouse(); } else { E.tx = null; leaveValley(); } } });
  addEventListener("resize", layout);
  addEventListener("resize", () => { if (inHouse) { sizeStage(); placeEko(); renderHouse(true); } });
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
    if (inGarden() !== E.inG) { E.inG = inGarden(); if (E.inG && E.t > 2) { if (storyStep === 1 || storyStep === 2) skipStoryToGarden(); else if (storyStep !== 3 && storyStep !== 4) gardenWelcome(); if (!GD.seen) { GD.seen = true; gSave(); } } }
    // Eko: pasea por el valle o por la habitación a pantalla completa.
    const h = inHouse ? hU(240) : EH(), w = h * 240 / 310;
    const archDepth = !inHouse ? clamp((155 - Math.abs(E.x - Z.arch)) / 75, 0, 1) : 0;
    const archBlend = archDepth * archDepth * (3 - 2 * archDepth);
    let y = lerp(PATH(), FRONT() - U(360) * 0.03, archBlend) - streamHop(), sc = 1, op = 1; // bajo el arco pisa entre sus dos postes; saltito en el arroyo
    if (pondD > 0) { y = pondFeet() - (pondD < 1 ? Math.abs(Math.sin(E.t * 9)) * U(4) : 0); sc = 1 - 0.26 * pondD; }   // por el muelle, alejándose
    if (E.entering) { const q = clamp((E.t - E.entering) / 1.1, 0, 1); y = lerp(BACK() - U(6), PATH(), q); sc = lerp(0.82, 1, q); op = Math.min(1, q * 3); if (q >= 1) E.entering = 0; }
    if (E.exiting) { const q = clamp((E.t - E.exiting) / 1.1, 0, 1); y = lerp(PATH(), BACK() - U(6), q); sc = lerp(1, 0.82, q); op = 1 - clamp((q - 0.6) / 0.4, 0, 1); }
    const bob = walking ? Math.abs(Math.sin(E.ph)) * U(6) : Math.sin(E.t * 2) * U(1.5);
    if (inHouse) {
      const floor = SH * 0.955 + houseLift, hb = walking ? Math.abs(Math.sin(E.ph)) * hU(5) : Math.sin(E.t * 2) * hU(1.5);
      Object.assign(eko.style, { left: SW * houseX / 100 - (w * houseScale) / 2 + "px", top: floor - h * houseScale - hb + "px", transform: `scale(${houseScale})`, transformOrigin: "50% 100%", opacity: 1, zIndex: 8 });
      Object.assign(shd.style, { left: SW * houseX / 100 - w * 0.42 + "px", top: floor - hU(9) + "px", width: w * 0.84 + "px", height: hU(18) + "px", opacity: 0.72 - Math.max(0, -houseLift / SH) });
      Object.assign(bub.style, { left: SW * houseX / 100 + "px", top: floor - h * houseScale - hU(14) + "px", zIndex: 45 });
    } else {
      eko.style.pointerEvents = inGarden() ? "none" : "";
      arch.el.style.zIndex = 30; archNear.el.style.zIndex = 34; eko.style.zIndex = archDepth > 0 ? 32 : 20;
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
    el.armR.setAttribute("transform", `rotate(${(pz === "dig" ? 30 - Math.sin(pq * 14) * 25 : pz === "water" ? -80 : pz === "fish" ? -62 + Math.sin(E.t * 1.5) * 3 : wav ? -120 + wav * 18 : walking ? -s * 18 : -4 - Math.sin(E.t * 2) * 2).toFixed(1)} 50 58)`);
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
    pondFrame();
    for (const c of clouds) { c.x += c.v * dt; const x = ((c.x - cam * c.par) % (W + 400) + (W + 400)) % (W + 400) - 300; c.el.style.left = x + "px"; }
    requestAnimationFrame(frame);
  }

  // Comentarios sueltos mientras paseáis
  setInterval(() => {
    if (inHouse || (storyStep > 0 && storyStep < 5) || E.t < E.talkUntil + 6 || E.exiting || gBusy || Math.random() < 0.5) return;
    const gt = gardenTalk(); if (gt && Math.random() < 0.4) { say(gt, 2800); return; }
    const p = phase();
    say(pick(p === "night" ? ["Mira cuántas estrellas", "Qué tranquilo está el valle de noche", "Los farolillos de casa son mi parte favorita"] : p === "dusk" ? ["Qué atardecer más bonito", "El cielo se está poniendo naranja"] : sky.w === "snow" ? ["¡Está nevando!", "Brrr… qué frío"] : sky.w === "leaves" ? ["Me encanta el ruido de las hojas", "Ya es otoño en el valle"] : ["Qué buen día hace", "Me encanta pasear contigo", "¿Oyes los pájaros?", "Huele a hierba recién cortada"]), 2800);
  }, 9000);

  // ---------- Arranque ----------
  $("#title").textContent = `El Valle de ${name}`;

  // ---------- Don Paja: encargos, premios y su secreto ----------
  // Al principio solo es un espantapájaros… pero alguien deja notas con encargos. Tras unos cuantos, habla.
  // Etapas: 0 nada raro · 1 se mueve cuando no miras · 2 se revela al entregar el 4.º encargo · 3 vivo, con personalidad.
  GD.ord = Object.assign({ n: 0, need: null, fresh: true }, GD.ord || {});
  GD.paja = Object.assign({ revealed: false, skin: "auto", told: 0 }, GD.paja || {});
  GD.cart.apple = GD.cart.apple || 0; GD.hv.apple = GD.hv.apple || 0;
  GD.weeds = GD.weeds || []; GD.weedT = GD.weedT || Date.now(); GD.appleT = GD.appleT || 0;
  const ITEMS = { carrot: ["zanahoria", "zanahorias", "g-carrot.webp"], tomato: ["tomate", "tomates", "g-tomato.webp"], apple: ["manzana", "manzanas", "g-manzana.webp"] };
  const REWARDS = [
    { id: "flores", kind: "skin", name: "Sombrero de flores", quip: "Flores. En la cabeza. Si algún cuervo se ríe, lo espanto con la mirada." },
    { id: "banderines", kind: "deco", name: "Banderines en el arco", quip: "Banderines. Muy festivo. Los pájaros pensarán que hay fiesta… mal asunto." },
    { id: "lana", kind: "skin", name: "Gorro y bufanda de lana", quip: "Por fin. Llevaba tres inviernos con la paja helada." },
    { id: "columpio", kind: "deco", name: "Columpio en el árbol", quip: "Un columpio. Yo no puedo subir. Pero me alegro por vosotros. Mucho. En serio." },
    { id: "gafas", kind: "skin", name: "Gafas de sol", quip: "No me mires a los ojos. Bueno, a los botones." },
    { id: "caseta", kind: "deco", name: "Caseta de pájaros", quip: "¿Una casa para PÁJAROS? ¿En MI huerto? Respira, Paja. Respira." },
    { id: "pajarita", kind: "skin", name: "Pajarita", quip: "Elegante pero práctico. Como yo." },
    { id: "molinillo", kind: "deco", name: "Molinillo de viento", quip: "Gira y gira y no llega a ninguna parte. Me cae bien." },
    { id: "farolillos", kind: "deco", name: "Farolillos en el camino", quip: "Ahora de noche se ve todo. Incluido yo. Bien." },
    { id: "corona", kind: "skin", name: "Corona de paja dorada", quip: "Rey del huerto. Podéis llamarme Majestad. O Don Paja. Prefiero Majestad." },
  ];
  const unlocked = () => REWARDS.slice(0, GD.ord.n);
  const has = (id) => unlocked().some((r) => r.id === id);
  const halloween = () => { const d = new Date(), m = d.getMonth(), day = d.getDate(); return (m === 9 && day >= 24) || (m === 10 && day <= 2); };
  const stageP = () => GD.paja.revealed ? 3 : GD.ord.n >= 2 ? 1 : 0;
  // Imágenes nuevas: cada cosa se activa sola cuando su imagen existe (hasta entonces, no aparece)
  const artOK = {};
  const probe = (key, src) => { const im = new Image(); im.onload = () => { artOK[key] = true; }; im.src = "art/valley/" + src; };
  probe("weed", "g-maleza.webp"); probe("bird", "g-pajaro.webp"); probe("birdFly", "g-pajaro-vuela.webp"); probe("fly", "g-mariposa.webp"); probe("apple", "g-manzana.webp");

  // Pedidos: empiezan pequeños y crecen poco a poco (las manzanas salen del árbol grande)
  const FIRST = [{ carrot: 1 }, { tomato: 3 }, { carrot: 1, tomato: 3 }, { carrot: 2 }, { tomato: 6 }, { carrot: 2, tomato: 3, apple: 1 }];
  function makeOrder(n) {
    if (FIRST[n]) return { ...FIRST[n] };
    const o = { carrot: 2 + (n % 3), tomato: 3 * (1 + (n % 2)) };
    if (n % 3 === 0 && artOK.apple) o.apple = 1;
    return o;
  }
  if (!GD.ord.need) { GD.ord.need = makeOrder(GD.ord.n); GD.ord.fresh = true; }
  const missing = () => Object.entries(GD.ord.need).map(([k, v]) => [k, Math.max(0, v - (GD.cart[k] || 0))]).filter(([, v]) => v > 0);
  const listTxt = (pairs) => pairs.map(([k, v]) => `${v} ${ITEMS[k][v === 1 ? 0 : 1]}`).join(" y ").replace(/ y (?=.* y )/g, ", ");

  // Ropa de Don Paja (variantes completas de la imagen) y decoración del valle
  const pajaImg = scarecrow.el.firstChild;
  function currentSkin() {
    const s = GD.paja.skin;
    if (s === "auto") { if (halloween()) return "calabaza"; const sk = unlocked().filter((r) => r.kind === "skin"); return sk.length ? sk[sk.length - 1].id : "normal"; }
    return s;
  }
  function applySkin() {
    const id = currentSkin(), src = id === "normal" ? "h-scarecrow.webp" : `paja-${id}.webp`;
    pajaImg.onerror = () => { pajaImg.onerror = null; pajaImg.src = "art/valley/h-scarecrow.webp"; };
    // Las variantes tienen el mismo ancho (brazo a brazo) y la base alineada, pero pueden ser algo más altas (gorros)
    pajaImg.onload = () => { const w = pajaImg.naturalWidth, h = pajaImg.naturalHeight; if (!w) return; scarecrow.ar = w / h; scarecrow.uh = 250 * (h / w) / (800 / 572); layout(); };
    if (!pajaImg.src.endsWith(src)) pajaImg.src = "art/valley/" + src;
  }
  const DECO = {
    banderines: ["deco-banderines.webp", Z.arch + 4, 46, "front", 196],
    columpio: ["deco-columpio.webp", 1930, 230, "back", 10, 4],   // detrás del árbol: las cuerdas se pierden en la copa
    caseta: ["deco-caseta.webp", 1660, 175, "back", 0],
    molinillo: ["deco-molinillo.webp", 3470, 120, "back", 0],
    farolillos: ["deco-farolillos.webp", 1352, 46, "front", 196],
  };
  const decos = {};
  function placeDecos() {
    for (const r of unlocked()) {
      if (r.kind !== "deco" || decos[r.id]) continue;
      const [src, ux, uh, base, lift, z] = DECO[r.id];
      const p = prop(src, ux, uh, base, base, { lift, z, click: r.id === "columpio" ? () => goTo(1860, () => say(pick(["¡Wiii! Bueno, me imagino el wiii", "Algún día me atreveré a columpiarme bien alto"]))) : null });
      p.el.classList.add("deco", "deco-" + r.id);
      const im = p.el.firstChild; im.onerror = () => { p.el.style.display = "none"; };
      im.onload = () => { p.ar = im.naturalWidth / im.naturalHeight; layout(); };
      decos[r.id] = p;
    }
  }

  // Nota clavada y aviso «!» en Don Paja
  const note = document.createElement("img"); note.className = "paja-note"; note.src = "art/valley/g-nota.webp"; note.alt = ""; note.draggable = false; note.onerror = () => note.remove(); scarecrow.el.appendChild(note);
  const alertB = document.createElement("b"); alertB.className = "paja-alert"; alertB.textContent = "!"; scarecrow.el.appendChild(alertB);
  const markNote = () => scarecrow.el.classList.toggle("has-order", !!GD.ord.fresh);

  // Bocadillo propio de Don Paja (papel de estraza). Si no se le ve, habla desde el borde de la pantalla.
  const pBub = document.createElement("div"); pBub.id = "pajaBub"; document.body.appendChild(pBub);
  function pSay(t, ms = 3600) {
    bub.classList.remove("on"); clearTimeout(say.tm);
    pBub.textContent = t; pBub.classList.add("on"); E.talkUntil = E.t + ms / 1000; posPBub();
    clearTimeout(pSay.tm); pSay.tm = setTimeout(() => pBub.classList.remove("on"), ms);
    pajaAnim("paja-hop");
  }
  function posPBub() {
    if (!pBub.classList.contains("on")) return;
    const r = scarecrow.el.getBoundingClientRect(), off = r.right < 0 || r.left > innerWidth;
    pBub.classList.toggle("edge", off);
    if (off) Object.assign(pBub.style, { left: (r.left > innerWidth ? innerWidth - 20 : 20) + "px", top: innerHeight * 0.42 + "px" });
    else Object.assign(pBub.style, { left: r.left + r.width / 2 + "px", top: r.top - 6 + "px" });
    pBub.classList.toggle("left", off && r.right < 0);
  }
  setInterval(posPBub, 120);
  function pajaAnim(cls) { pajaImg.classList.remove(cls); void pajaImg.offsetWidth; pajaImg.classList.add(cls); setTimeout(() => pajaImg.classList.remove(cls), 700); }

  const PL = {
    tap: ["Cuidado con la camisa, que es de cuadros vintage.", "Si me tocas tanto, se me cae la paja.", "¿Sí? Estoy ocupado. Mirando. Es mi trabajo.", "Un día me bajaré de este palo. Hoy no.", "Me pica la oreja. Ah, no, que no tengo orejas.", "Llevo aquí plantado más tiempo que el pozo. Y el pozo no se queja tanto."],
    thirsty: ["Psst. Tú. Sí, tú. Hay una planta con más sed que yo.", "Esa plantita lleva un rato mirándome con cara de pena. Riégala, anda.", "Te lo digo yo, que no bebo: esa planta necesita agua."],
    ripe: ["Eso ya está maduro. Si tardas, se lo lleva un pájaro. Los conozco.", "Huele a cosecha. Y a pájaro con hambre.", "¿Vas a cosechar o lo dejamos de adorno?"],
    weeds: ["Hay una mala hierba. No me mires, mis manos son de paja.", "Esa hierba me está mirando raro. Arráncala, por favor."],
    idle: ["¿Te vas a quedar ahí mirando? Yo llevo años y no lo recomiendo.", "La regadera no se va a mover sola. Créeme, lo he intentado.", "Eko habla mucho, ¿no? Yo prefiero escuchar. Y juzgar en silencio.", "Si buscas conversación, soy todo oídos. Metafóricamente."],
    night: ["De noche el huerto es mío. Tú vete a dormir, que mañana hay encargos.", "Las estrellas y yo tenemos un trato: ellas brillan, yo vigilo.", "¿Despierto a estas horas? Yo no duermo. ¿Tú qué excusa tienes?"],
    far: ["¡Eh! ¡Desde aquí veo una planta con sed!", "¡Psst! ¡El huerto te echa de menos! Bueno, yo no. Las plantas.", "¡Hay cosecha esperando! Lo digo por decir…"],
    order: ["Te he dejado una nota. Sí, la escribo yo. ¿Quién creías?", "Nuevo encargo. Y no, no me como las zanahorias. Son para… un amigo.", "Otra notita. Mi letra mejora, ¿verdad?"],
    thanks: ["Perfecto. Bueno, aceptable. Vale, perfecto.", "Gracias. Esto queda entre tú, yo y la carretilla.", "Buen trabajo. No lo diré dos veces."],
    shoo: ["¡Fuera, plumífero! … Gracias. Me dan pánico.", "Un espantapájaros con miedo a los pájaros. No se lo cuentes a nadie.", "Eso, eso. ¡Y no vuelvas! … Bueno, vuelve en primavera."],
    ate: ["Se ha llevado un tomate. Yo he hecho lo que he podido: nada.", "Un tomate menos. Lo apunto en mi lista de enemigos."],
  };
  const HINT = ["Juraría que Don Paja tenía el sombrero recto…", "¿Lo has visto? ¡Creo que se ha movido!", "Don Paja, ¿has sido tú? … Nada. Ni pestañea.", "Qué raro… esta mañana miraba hacia el otro lado."];

  // Tarjeta del encargo (y ropa de Don Paja)
  const card = document.createElement("div"); card.id = "pajaCard"; document.body.appendChild(card);
  card.addEventListener("pointerdown", (e) => e.stopPropagation());
  card.addEventListener("click", (e) => {
    e.stopPropagation();
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.k === "close") { card.classList.remove("on"); return; }
    if (b.dataset.k === "give") { card.classList.remove("on"); goTo(3030, () => emptyCart()); return; }
    if (b.dataset.skin) { GD.paja.skin = b.dataset.skin; gSave(); applySkin(); pajaAnim("paja-shake"); renderCard(); }
  });
  function renderCard() {
    const st = stageP(), m = new Map(missing()), next = REWARDS[GD.ord.n];
    const items = Object.entries(GD.ord.need).map(([k, v]) => { const got = Math.min(v, GD.cart[k] || 0); return `<span class="it${got >= v ? " ok" : ""}"><img src="art/valley/${ITEMS[k][2]}" alt="">${got}/${v}</span>`; }).join("");
    const skins = [["auto", "Automático"], ["normal", "Sombrero de paja"], ...unlocked().filter((r) => r.kind === "skin").map((r) => [r.id, r.name]), ...(halloween() ? [["calabaza", "Calabaza"]] : [])];
    card.innerHTML = `<button class="x" data-k="close" aria-label="Cerrar">×</button>
      <h3>${st >= 2 ? "Encargo de Don Paja" : "Una nota misteriosa"}</h3>
      <p class="sub">${st >= 2 ? "Llévalo en la carretilla" : "Alguien la ha clavado en el espantapájaros…"}</p>
      <div class="items">${items}</div>
      <p class="prize">${next ? `Premio: <b>${next.name}</b>` : "¡Ya tienes todos los premios! Los encargos siguen, por amor al arte."}</p>
      ${m.size ? `<p class="hint">Faltan ${listTxt([...m])}</p>` : `<button class="give" data-k="give">Entregar</button>`}
      ${GD.paja.revealed && skins.length > 2 ? `<div class="skins"><span>Ropa:</span>${skins.map(([id, n]) => `<button data-skin="${id}" class="${GD.paja.skin === id ? "on" : ""}">${n}</button>`).join("")}</div>` : ""}`;
  }
  function openCard() { renderCard(); card.classList.add("on"); if (GD.ord.fresh) { GD.ord.fresh = false; gSave(); markNote(); } }

  function pajaTap() {
    goTo(2975, () => {
      const st = stageP(), fresh = GD.ord.fresh;
      if (st === 3) pSay(fresh ? pick(PL.order) : pick(PL.tap), 3400);
      else if (fresh) say(GD.ord.n === 0 ? "¡Hay una nota clavada en Don Paja! ¿Quién la habrá dejado?" : st === 1 ? pick(["Otra nota… y Don Paja sin moverse. Muy sospechoso.", "¿Otra nota? Aquí no ha entrado nadie…"]) : "¡Otra nota! Qué misterio…", 3200);
      else if (st === 1 && Math.random() < 0.5) say(pick(HINT), 2800);
      else chatPaja();
      setTimeout(openCard, 500);
    });
  }

  // Entregar: si la carretilla lleva lo pedido, el encargo se cumple y llega el premio
  function emptyCart() {
    const c = GD.cart, t = (c.carrot || 0) + (c.tomato || 0) + (c.apple || 0);
    if (!t) { say(pick(GL.cartEmpty)); return; }
    const m = missing();
    if (m.length) { say(`Para el encargo de Don Paja aún faltan ${listTxt(m)}. Lo guardo en la carretilla.`, 3400); return; }
    work("dig", 900, () => {
      for (const [k, v] of Object.entries(GD.ord.need)) GD.cart[k] -= v;
      const r = REWARDS[GD.ord.n];
      GD.ord.n++; GD.ord.need = makeOrder(GD.ord.n); GD.ord.fresh = true; statAdd("order");
      gSave(); drawPlants(); markNote(); placeDecos(); applySkin();
      floatText("¡Encargo cumplido!", U(3075), BACK() - U(280));
      fx("drop", U(3075), BACK() - U(200), 10, 600);
      if (GD.ord.n === 4 && !GD.paja.revealed) { reveal(r); return; }
      const after = () => { if (r) setTimeout(() => celebrate(r), 300); };
      if (GD.paja.revealed) { pSay(pick(PL.thanks), 2800); setTimeout(after, 3000); }
      else { say(pick(["¡Entregado! Seguro que a quien escribe las notas le gusta", "¡Hecho! Aunque… ¿para quién será todo esto?"]), 2800); setTimeout(after, 3000); }
    });
  }
  function celebrate(r) {
    floatText("¡Nuevo! " + r.name, U(r.kind === "deco" ? DECO[r.id][1] : 3075), BACK() - U(320));
    if (GD.paja.revealed) pSay(r.quip, 4200);
    else say(r.kind === "skin" ? `¡Don Paja tiene ${r.name.toLowerCase()}! ¿Quién se lo habrá puesto?` : `¡Ha aparecido algo nuevo en el valle: ${r.name.toLowerCase()}!`, 3600);
  }
  // La revelación: la primera vez que Don Paja habla
  function reveal(r) {
    GD.paja.revealed = true; gSave();
    const seq = [
      [() => { pajaAnim("paja-shake"); pSay("…Ejem.", 1800); }, 2000],
      [() => say("¡¿Has… HABLADO?!", 1800), 2000],
      [() => pSay("Llevo aquí plantado desde antes que tú. Alguien tenía que escribir las notas.", 4200), 4400],
      [() => say("¡Don Paja está vivo! ¡Siempre lo supe! … Bueno, casi siempre.", 3000), 3200],
      [() => pSay("Vivo, vivo… digamos que aguanto de pie. Y gracias por los encargos. De verdad.", 4200), 4400],
      [() => r && celebrate(r), 0],
    ];
    let t = 600; for (const [f, ms] of seq) { setTimeout(f, t); t += ms; }
  }

  // Malas hierbas: salen con el tiempo (como mucho 2) y se arrancan arrastrando hacia arriba
  const weedEls = [];
  function drawWeeds() {
    weedEls.forEach((w) => w.remove()); weedEls.length = 0;
    if (!artOK.weed) return;
    GD.weeds.forEach((wd, idx) => {
      const im = document.createElement("img"); im.className = "weed"; im.src = "art/valley/g-maleza.webp"; im.alt = ""; im.draggable = false; im.dataset.idx = idx;
      const h = U(72), x = U(slotX(wd.slot) + (wd.side || 0.32) * BED.uh * BED.ar / 3);
      Object.assign(im.style, { left: x - h / 2 + "px", top: BACK() - U(BED.uh) * 0.6 - h + "px", width: h + "px", height: h + "px" });
      let y0 = null;
      im.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); y0 = e.clientY; im.setPointerCapture(e.pointerId); });
      im.addEventListener("pointermove", (e) => { if (y0 == null) return; const dy = Math.min(0, e.clientY - y0); im.style.transform = `translateY(${dy * 0.6}px) scaleY(${1 - dy / 300})`; if (dy < -45) { y0 = null; pullWeed(idx, im); } });
      im.addEventListener("pointerup", () => { if (y0 == null) return; y0 = null; im.style.transform = ""; say("¡Tira hacia arriba para arrancarla!", 2000); });
      im.addEventListener("click", (e) => e.stopPropagation());
      back.appendChild(im); weedEls.push(im);
    });
  }
  function pullWeed(idx, im) {
    suppressGardenClick = Date.now() + 350;
    im.classList.add("gone"); fx("dirt", parseFloat(im.style.left) + U(36), parseFloat(im.style.top) + U(62), 8, 300);
    GD.weeds.splice(idx, 1); gSave(); statAdd("weed"); setTimeout(drawWeeds, 500);
    if (GD.paja.revealed && Math.random() < 0.4) setTimeout(() => pSay(pick(["Gracias. Esa hierba llevaba días cotilleando.", "Fuera intrusa. Buen tirón."]), 2600), 600);
    else say(pick(["¡Fuera, hierbajo!", "¡Pop! Arrancada", "Una menos"]), 1600);
  }
  function spawnWeeds() {
    if (!artOK.weed || !GD.seen) return;
    const every = testMode ? 60e3 : 3 * 3600e3;
    while (Date.now() - GD.weedT > every && GD.weeds.length < 2) {
      GD.weedT += every;
      const slot = Math.floor(Math.random() * 6);
      if (!GD.weeds.some((w) => w.slot === slot)) GD.weeds.push({ slot, side: Math.random() < 0.5 ? -0.32 : 0.32 });
    }
    if (GD.weeds.length >= 2) GD.weedT = Date.now();
    gSave(); drawWeeds();
  }
  const weedy = (i) => GD.weeds.some((w) => w.slot === i);

  // Pájaros: se posan en lo que está maduro. Tócalos para espantarlos; si no, se llevan un tomate
  let bird = null;
  function maybeBird() {
    if (bird || !artOK.bird || !artOK.birdFly || inHouse || !inGarden() || Math.random() > 0.25) return;
    const ripe = GD.slots.map((s, i) => (s && s.st >= 2 ? i : -1)).filter((i) => i >= 0); if (!ripe.length) return;
    const i = pick(ripe), im = document.createElement("img"); im.className = "bird"; im.src = "art/valley/g-pajaro.webp"; im.alt = ""; im.draggable = false;
    const h = U(54); Object.assign(im.style, { left: U(slotX(i)) - h / 2 + "px", top: BACK() - U(BED.uh) * 0.4 - U(110) - h + "px", width: h + "px", height: h + "px" });
    back.appendChild(im); bird = { im, i, tm: setTimeout(() => birdLeave(true), 25000) };
    im.addEventListener("pointerdown", (e) => { e.stopPropagation(); e.preventDefault(); if (bird && bird.im === im) { clearTimeout(bird.tm); birdLeave(false); } });
    im.addEventListener("click", (e) => e.stopPropagation());
    if (stageP() === 3 && Math.random() < 0.6) setTimeout(() => pSay(pick(["¡Pájaro! ¡PÁJARO! Haz algo, que yo no puedo.", "Ahí hay uno. Espántalo tú, que a mí no me hace caso."]), 2800), 900);
    else if (stageP() >= 1) setTimeout(() => pajaAnim("paja-shake"), 700);
  }
  function birdLeave(ate) {
    if (!bird) return; const { im, i } = bird; bird = null; suppressGardenClick = Date.now() + 350;
    const s = GD.slots[i];
    if (ate && s && s.c === "tomato" && s.st >= 2 && !(s.eaten > 1)) { s.eaten = (s.eaten || 0) + 1; gSave(); if (stageP() === 3) pSay(pick(PL.ate), 3000); else say("¡Un pájaro se ha comido un tomate!", 2400); }
    else if (!ate) { if (stageP() === 3 && Math.random() < 0.6) setTimeout(() => pSay(pick(PL.shoo), 3000), 400); else say(pick(["¡Fuera, pajarito!", "¡Zas! Se ha ido volando"]), 1800); }
    im.src = "art/valley/g-pajaro-vuela.webp"; im.classList.add("away"); setTimeout(() => im.remove(), 1400);
  }

  // Árbol grande: tres toques seguidos lo sacuden; a veces cae una manzana (va a la carretilla)
  let treeTaps = [];
  function treeTap() {
    const now = Date.now(); treeTaps = treeTaps.filter((t) => now - t < 1600); treeTaps.push(now);
    bigTree.el.classList.remove("shake"); void bigTree.el.offsetWidth; bigTree.el.classList.add("shake");
    if (treeTaps.length < 3) { if (treeTaps.length === 1) goTo(1780, () => say(pick(["Desde aquí se ve todo el valle", "Este árbol es muy viejo… y muy sabio", "Si lo sacudes bien… a veces cae algo"]))); return; }
    treeTaps = [];
    const leaves = document.createElement("div"); leaves.className = "treeLeaves";
    for (let j = 0; j < 9; j++) { const l = document.createElement("i"); l.style.left = 20 + Math.random() * 60 + "%"; l.style.animationDelay = j * 90 + "ms"; leaves.appendChild(l); }
    bigTree.el.appendChild(leaves); setTimeout(() => leaves.remove(), 2200);
    const wait = testMode ? 20e3 : 2 * 3600e3;
    if (artOK.apple && now - GD.appleT > wait && Math.random() < 0.6) {
      GD.appleT = now; gSave();
      const im = document.createElement("img"); im.className = "apple"; im.src = "art/valley/g-manzana.webp"; im.alt = ""; im.draggable = false;
      const h = U(40), x = U(1820 + (Math.random() - 0.5) * 160);
      Object.assign(im.style, { left: x - h / 2 + "px", top: BACK() - U(250) + "px", width: h + "px", height: h + "px", "--fall": U(250) - h + U(6) + "px" });
      back.appendChild(im);
      im.addEventListener("click", (e) => { e.stopPropagation(); goTo(x / k, () => { im.remove(); GD.cart.apple = (GD.cart.apple || 0) + 1; GD.hv.apple = (GD.hv.apple || 0) + 1; gSave(); drawPlants(); say("¡Una manzana! A la carretilla del huerto", 2400); }); });
      setTimeout(() => say("¡Ha caído una manzana! Tócala y la recojo", 2400), 700);
    }
  }

  // Mariposas al tocar los arbustos (y alguna suelta por el huerto)
  function butterflies(ux, n = 3) {
    if (!artOK.fly) return;
    for (let j = 0; j < n; j++) {
      const im = document.createElement("img"); im.className = "fly"; im.src = "art/valley/g-mariposa.webp"; im.alt = ""; im.draggable = false;
      const h = U(30 + Math.random() * 10); Object.assign(im.style, { left: U(ux + (Math.random() - 0.5) * 80) + "px", top: BACK() - U(80) + "px", width: h + "px", height: h + "px", animationDelay: j * 180 + "ms", "--dx": (Math.random() - 0.3) * U(300) + "px", "--dy": -U(220 + Math.random() * 120) + "px" });
      front.appendChild(im); setTimeout(() => im.remove(), 4400);
    }
  }

  // Don Paja te llama la atención de vez en cuando (y antes de revelarse… se mueve cuando no miras)
  let lastUser = Date.now();
  addEventListener("pointerdown", () => { lastUser = Date.now(); }, true);
  setInterval(() => {
    if (inHouse || E.exiting || (storyStep > 0 && storyStep < 5) || E.t < E.talkUntil + 4 || card.classList.contains("on")) return;
    maybeBird();
    const st = stageP(), dry = GD.slots.some((s, i) => s && thirsty(s)), ripe = GD.slots.some((s) => s && s.st >= 2);
    if (st === 1 && inGarden() && Math.random() < 0.12) { pajaAnim("paja-snap"); if (Math.random() < 0.5) setTimeout(() => say(pick(HINT), 2600), 600); return; }
    if (st !== 3 || Math.random() > 0.3) return;
    if (!inGarden()) { if ((dry || ripe) && Math.random() < 0.4) pSay(pick(PL.far), 3000); return; }
    const idle = Date.now() - lastUser > 40e3;
    const pool = dry ? PL.thirsty : ripe ? PL.ripe : GD.weeds.length && artOK.weed ? PL.weeds : phase() === "night" ? PL.night : idle ? PL.idle : null;
    if (pool) pSay(pick(pool), 3600); else if (Math.random() < 0.3) pSay(pick(PL.tap), 3200);
  }, testMode ? 6000 : 15000);

  applySkin(); placeDecos(); markNote();
  setTimeout(() => { spawnWeeds(); drawWeeds(); }, 1500); setInterval(spawnWeeds, 60000);
  addEventListener("resize", () => { drawWeeds(); card.classList.remove("on"); });

  layout(); sky(); setInterval(sky, 60000); grow(); setInterval(grow, testMode ? 2000 : 30000);
  cam = clamp(U(E.x) - W / 2, U(OPEN.x0 - 300), U(WORLD) - W);
  E.entering = 0.001;
  requestAnimationFrame((t) => { last = t; frame(t); });
  setTimeout(() => $("#cover").classList.add("off"), 150);
  setTimeout(() => $("#title").classList.add("on"), 700);
  setTimeout(() => $("#title").classList.remove("on"), 4500);
  setTimeout(() => {
    if (storyStep === 1 && GD.seen) { storyStep = 0; try { localStorage.setItem("eko-valley-story-v1", "1"); } catch (_) {} }
    if (storyStep === 1) { storyTarget(house); say("¿Te cuento cómo empezó todo? Toca la casita y te lo cuento.", 4200); }
    else say(pick([`¡Bienvenido al Valle de ${name}!`, "¡Mira, esta es mi casa por fuera!", "¡Ya estamos fuera! ¿Damos una vuelta?"]), 3200);
  }, 1300);
  void room;
})();
