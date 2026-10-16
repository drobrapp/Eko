// Eko · amistad (niveles 1-20), logros y misiones de bienvenida.
// Ritmo: lo primero del día cuenta entero y luego al 25 % (nunca a cero); hacer cosas distintas
// en cada franja da un extra; si vuelves tras un día fuera, te recibe con un regalo. Sin rachas que se pierdan.
window.EkoProgress = (() => {
  "use strict";
  const E = window.Eko;
  if (!E) return null;
  const KEY = "eko-progress";
  const cfg = () => (window.EkoSettings ? window.EkoSettings.get() : {});
  const petName = () => cfg().petName || "Eko";
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const later = (ms, f) => setTimeout(f, ms);
  const dayKey = (d = new Date()) => d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  // ---------- Niveles ----------
  const cost = (n) => 40 + 10 * n;                        // XP para pasar de n a n+1 (≈ 2 meses hasta el 20)
  const xpFor = (lvl) => { let t = 0; for (let n = 1; n < lvl; n++) t += cost(n); return t; };
  const MAX = 20;
  // Qué desbloquea cada nivel. soon = aún no existe (llega en próximas versiones)
  const LEVELS = {
    1:  { t: "Galleta, pelota, piedra-papel-tijera, gorro de dormir y paraguas" },
    2:  { t: "Juego: ¿Qué mano?", id: "game:hand" },
    3:  { t: "Truco: voltereta", id: "trick:flip" },
    4:  { t: "Accesorio: gafas", id: "acc:readglasses" },
    5:  { t: "Juego: escondite", id: "game:hide" },
    6:  { t: "Decoración: camita", id: "deco:bed" },
    7:  { t: "Truco: pirueta", id: "trick:spin" },
    8:  { t: "Accesorio: pajarita", id: "acc:bowtie" },
    9:  { t: "Juego: atrapa galletas", id: "game:catch" },
    10: { t: "Accesorio: bufanda (¡y fiesta!)", id: "acc:scarf" },
    11: { t: "Truco: equilibrio a la pata coja", id: "trick:balance" },
    12: { t: "Decoración: maceta", id: "deco:pot" },
    13: { t: "Juego: tócame donde brille", id: "game:glow" },
    14: { t: "Accesorio: corona", id: "acc:crown" },
    15: { t: "Truco: malabares", id: "trick:juggle" },
    16: { t: "Cuadro: Eko dormilón", id: "deco:frame" },
    17: { t: "Accesorio: auriculares", id: "acc:headphones" },
    18: { t: "Juego: adivina qué pienso", id: "game:guess" },
    19: { t: "Truco: magia", id: "trick:magic" },
    20: { t: "Título «Mejor amigo» y trofeo", id: "deco:trophy" },
  };
  const TITLES = [[20, "Mejor amigo"], [15, "Inseparables"], [10, "Muy amigos"], [5, "Amigos"], [2, "Colegas"], [1, "Recién conocidos"]];
  const title = (l) => TITLES.find(([n]) => l >= n)[1];

  // ---------- Logros ----------
  // n = cuántas veces; give = qué desbloquea; xp = premio
  const ACH = [
    { id: "first", ic: "artHeart", name: "Primer amigo", how: "Completa las misiones de bienvenida", xp: 30 },
    { id: "glutton", ic: "artCookie", name: "Goloso", how: "Dale 20 galletas (desbloquea el truco «Barriga llena»)", n: 20, ev: "feed", xp: 25, give: ["trick:belly"] },
    { id: "gardener", ic: "artCan", name: "Jardinero", how: "Riégale 7 días distintos", n: 7, ev: "waterDay", xp: 30 },
    { id: "rps", ic: "artSpark", name: "Invencible", how: "Gánale 10 veces a piedra, papel o tijera", n: 10, ev: "rpsWin", xp: 25 },
    { id: "detective", ic: "artAsk", name: "Detective", how: "Encuéntralo 10 veces en el escondite", n: 10, ev: "found", xp: 25 },
    { id: "eye", ic: "artSpark", name: "Buen ojo", how: "Acierta 5 seguidas en ¿Qué mano?", n: 1, ev: "handStreak", xp: 25 },
    { id: "voice", ic: "artNote", name: "Me conoce", how: "Llámalo por su nombre 10 veces", n: 10, ev: "voice", xp: 25, when: () => cfg().listen },
    { id: "chat", ic: "artNotes", name: "Charlatán", how: "Mándale 20 mensajes", n: 20, ev: "chat", xp: 25, when: () => cfg().ai },
    { id: "explorer", ic: "artBang", name: "Explorador", how: "Que visite 10 iconos del escritorio", n: 10, ev: "iconVisit", xp: 25, when: () => cfg().desktop },
    { id: "early", ic: "artSpark", name: "Madrugador", how: "Hazle caso antes de las 8 de la mañana", xp: 20 },
    { id: "night", ic: "artNightcap", name: "Noctámbulo", how: "Hazle caso pasadas las 12 de la noche", xp: 20 },
    { id: "happy", ic: "artHeart", name: "Feliz del todo", how: "Que tenga sus 4 necesidades altas a la vez", xp: 30, when: () => cfg().needs !== false },
    { id: "reunion", ic: "artHeart", name: "Reencuentro", how: "Vuelve después de una semana fuera", xp: 30 },
    { id: "loyal", ic: "artHeart", name: "Fiel", how: "Pasad juntos 30 días distintos", n: 30, ev: "day", xp: 50 },
    { id: "bday", ic: "artSpark", name: "Cumpleaños", how: "Estad juntos en tu cumpleaños o en el suyo", xp: 40, give: ["acc:party"] },
    { id: "xmas", ic: "artSpark", name: "Navidad juntos", how: "Ábrelo en diciembre", xp: 30, give: ["acc:santa", "acc:elf", "acc:reindeer"] },
    { id: "halloween", ic: "artSpark", name: "Noche de miedo", how: "Ábrelo en la semana de Halloween", xp: 30, give: ["acc:witch", "acc:pumpkin", "acc:vampire", "acc:ghost"] },
  ];

  // ---------- Estado ----------
  let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (_) {}
  const P = Object.assign({ xp: 0, day: "", dayPts: 0, slots: {}, last: 0, ach: {}, cnt: {}, unl: [], days: 0, lastDay: "", mis: null, offered: false, v: 1 }, saved || {});
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (_) {} };
  const level = () => { let l = 1; while (l < MAX && P.xp >= xpFor(l + 1)) l++; return l; };
  const has = (id) => {
    if (!id) return true;
    try { if (window.EkoSettings && window.EkoSettings.get().testAll) return true; } catch (_) {}   // modo pruebas: todo desbloqueado
    for (const [n, d] of Object.entries(LEVELS)) if (d.id === id) return level() >= +n;
    return P.unl.includes(id);
  };

  // Primera vez con niveles: un Eko que ya llevaba tiempo contigo no empieza de cero
  if (!saved) {
    let born = null; try { const b = localStorage.getItem("eko-born"); born = b ? new Date(b.replace(/^"|"$/g, "")) : null; } catch (_) {}
    const days = born && !isNaN(born) ? Math.floor((Date.now() - born) / 86400000) : 0;
    const startLvl = Math.min(6, 1 + Math.floor(days / 7));
    P.xp = xpFor(startLvl); P.last = Date.now(); P.days = Math.min(days, 29);
    P.veteran = startLvl > 1 ? startLvl : 0;
    try { P.offered = !localStorage.getItem("eko-onboarded"); } catch (_) { P.offered = false; }   // los nuevos hacen las misiones al nacer
    save();
  }

  // ---------- Ganar puntos ----------
  const PTS = { pet: 2, feed: 4, play: 6, fetch: 1, voice: 2, chat: 2, water: 4, hug: 3 };
  const DAY_FULL = 40;
  const slot = () => { const h = new Date().getHours(); return h >= 6 && h < 14 ? "m" : h >= 14 && h < 21 ? "t" : "n"; };
  function newDay() {
    const k = dayKey();
    if (P.day === k) return;
    P.day = k; P.dayPts = 0; P.slots = {};
    if (P.lastDay !== k) { P.lastDay = k; P.days++; count("day"); }
  }
  function earn(src) {
    if (E.A.hidden) return;
    newDay();
    let pts = PTS[src] || 0;
    if (!pts) return;
    pts = P.dayPts < DAY_FULL ? pts : pts * 0.25;
    const sk = slot() + ":" + src;
    if (!P.slots[sk]) { P.slots[sk] = 1; pts += 2; }          // variedad: lo primero de cada tipo en cada franja
    P.dayPts += pts;
    const h = new Date().getHours();
    if (h >= 5 && h < 8) unlockAch("early");
    if (h >= 0 && h < 4) unlockAch("night");
    count(src === "feed" ? "feed" : src === "voice" ? "voice" : src === "chat" ? "chat" : "");
    mission(src);
    addXp(pts);
  }
  function addXp(pts) {
    const before = level();
    P.xp += pts; P.last = Date.now(); save();
    const after = level();
    if (after > before) later(1500, () => levelUp(after));
    if (window.EkoProgress && EkoProgress.onChange) EkoProgress.onChange();
  }

  // ---------- Celebraciones ----------
  const stage = E.stage;
  let toast = document.getElementById("lvlToast");
  if (!toast) { toast = document.createElement("div"); toast.id = "lvlToast"; stage.appendChild(toast); }
  const artSrc = (id) => { const n = document.getElementById(id); return n ? n.getAttribute("href") || "" : ""; };
  let toastT = 0;
  function showToast(img, big, small, secs = 5) {
    toast.innerHTML = `<img src="${artSrc(img)}" alt=""><span><b>${big}</b><em>${small}</em></span>`;
    toast.classList.remove("in"); void toast.offsetWidth; toast.classList.add("in");
    clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove("in"), secs * 1000);
  }
  // Fiesta por niveles: crece con el nivel (cada 5, fiesta grande)
  function levelUp(l) {
    const d = LEVELS[l] || {};
    const big = l % 5 === 0;
    E.hold(5);
    E.express("emocionado", 4);
    E.hop(-520);
    later(450, () => { E.fx("spark", big ? 5 : 3); E.Voice.chirp && E.Voice.chirp(); });
    later(1100, () => E.act("tada"));
    if (big) { later(1300, () => E.fx("notes", 3)); later(1600, () => { E.setDance(true); later(4200, () => E.setDance(false)); }); }
    showToast("artSpark", `¡Nivel ${l}!`, d.soon ? `${d.t} (muy pronto)` : d.t, 6);
    // si lo nuevo es un truco, lo estrena en cuanto acaba la fiesta
    const TR = { "trick:flip": "flip", "trick:spin": "pirouette", "trick:balance": "balance", "trick:juggle": "juggle", "trick:magic": "magic" };
    if (TR[d.id]) later(big ? 7600 : 5200, () => { if (window.EkoTricks && !E.S.sleeping) { E.say("¡Mira lo que he aprendido!", 1600, true); later(900, () => window.EkoTricks.run(TR[d.id])); } });
    later(900, () => E.say(d.soon ? `¡Nivel ${l}! Estoy aprendiendo algo nuevo…` : `¡Nivel ${l}! ${d.t.split(": ").pop().replace(/^./, (c) => c.toUpperCase())} para ti`, 3600, true));
  }
  function unlockAch(id) {
    const a = ACH.find((x) => x.id === id);
    if (!a || P.ach[id] || a.soon) return;
    P.ach[id] = Date.now();
    if (a.give) for (const g of a.give) if (!P.unl.includes(g)) P.unl.push(g);
    save();
    later(600, () => {
      if (E.busy() && !E.S.sleeping) { later(4000, () => celebrateAch(a)); return; }
      celebrateAch(a);
    });
    addXp(a.xp || 20);
  }
  function celebrateAch(a) {
    showToast(a.ic, `¡Logro: ${a.name}!`, a.give ? (a.give[0].startsWith("trick:") ? "Truco nuevo desbloqueado" : "Nuevo en el armario") : a.how, 5);
    E.express("orgulloso", 3); E.fx("heart", 2); E.hop(-380);
  }
  function count(ev, n = 1) {
    if (!ev) return;
    P.cnt[ev] = (P.cnt[ev] || 0) + n;
    for (const a of ACH) if (a.ev === ev && P.cnt[ev] >= (a.n || 1)) unlockAch(a.id);
    save();
  }
  // Eventos de juegos y cosas sueltas
  function event(ev, v) {
    if (ev === "handStreak") { if (v >= 5) count("handStreak"); return; }
    if (ev === "waterDay") { P.cnt.waterDay = v; for (const a of ACH) if (a.ev === "waterDay" && v >= a.n) unlockAch(a.id); save(); return; }
    if (ev === "menu" || ev === "notebook" || ev === "dblclick") { mission(ev); return; }
    count(ev);
  }

  // ---------- Al arrancar ----------
  function boot() {
    if (E.A.hidden) { later(5000, boot); return; }
    const vet = P.veteran;
    const gapDays = P.last ? (Date.now() - P.last) / 86400000 : 0;
    const wasNewDay = P.lastDay !== dayKey();
    newDay();
    const m = new Date().getMonth() + 1, d = new Date().getDate();
    if (m === 12) unlockAch("xmas");
    if ((m === 10 && d >= 25) || (m === 11 && d === 1)) unlockAch("halloween");
    const md = String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    let born = ""; try { born = (localStorage.getItem("eko-born") || "").replace(/^"|"$/g, ""); } catch (_) {}
    const bornMd = born ? born.slice(5, 10) : "";
    if (cfg().birthday === md || (bornMd === md && born.slice(0, 4) !== String(new Date().getFullYear()))) unlockAch("bday");
    if (gapDays >= 7) unlockAch("reunion");
    if (P.veteran) {
      const l = P.veteran; P.veteran = 0; save();
      later(6000, () => { showToast("artHeart", `Nivel de amistad: ${l}`, "Por todo lo que llevamos juntos", 6); E.say(`¡Ahora tenemos nivel de amistad! Por todo lo que llevamos juntos, empezamos en el ${l}`, 4200, true); E.fx("spark", 3); });
    } else if (wasNewDay && gapDays >= 0.8) {
      // regalo de bienvenida (sin rachas ni castigos)
      later(5000, () => { E.act("tada"); E.fx("heart", 2); E.say(pick(["¡Has vuelto! Toma, un regalito", "¡Hola otra vez! Te he guardado esto", "¡Te esperaba! Un regalo por volver"]), 3200, true); addXp(8); });
    }
    if (!P.offered) later(vet ? 14000 : 9000, offerMissions);
    else if (P.mis && !P.mis.done && !P.mis.skipped) later(7000, () => showMission(true));
  }
  // Feliz del todo: lo comprueba cada minuto
  setInterval(() => {
    const N = window.EkoNeeds && window.EkoNeeds.on() ? window.EkoNeeds.get() : null;
    if (N && ["hunger", "energy", "fun", "love"].every((k) => N[k] >= 75)) unlockAch("happy");
  }, 60000);

  // ---------- Misiones de bienvenida ----------
  const MIS = [
    { ev: "pet", t: "Hazme clic", intro: () => "¡Te enseño lo que sé hacer! Primero, hazme clic", ok: "¡Así se saluda!" },
    { ev: "menu", t: "Clic derecho sobre mí", intro: () => "Ahora hazme clic derecho: ahí está mi menú", ok: "¡Ese es mi menú! Ahí tienes de todo" },
    { ev: "feed", t: "Dame de comer: Cuidarme → Comida", intro: () => "A veces me entra hambre… Dame de comer: clic derecho, Cuidarme, Comida", ok: "¡Ñam! Cuando tenga hambre, te lo diré", when: () => cfg().needs !== false },
    { ev: "play", t: "Juega conmigo: Jugar", intro: () => "También necesito divertirme. Clic derecho, Jugar, y elige un juego", ok: "¡Qué bien me lo paso contigo!" },
    { ev: "water", t: "Riégame: Cuidarme → Riégame", intro: () => "Tengo un brote que hay que regar. Clic derecho, Cuidarme, Riégame", ok: "¡Gracias! Si me riegas cada día, crezco" },
    { ev: "notebook", t: "Abre mi libreta", intro: () => "En mi libreta ves cómo estoy, nuestro nivel y los logros. Clic derecho, Libreta", ok: "Cuanto más nos conozcamos, más cosas aprenderé" },
    { ev: "dblclick", t: "Doble clic en el escritorio", intro: () => "Si haces doble clic en cualquier sitio de la pantalla, voy corriendo", ok: "¡Aquí estoy!" },
    { ev: "voice", t: `Di «${petName()}, baila»`, intro: () => `Puedo oírte: prueba a decir «${petName()}, baila»`, ok: "¡Te he oído!", when: () => cfg().listen },
    { ev: "chat", t: "Escríbeme en la barrita", intro: () => "Y si te apetece charlar, escríbeme en la barrita", ok: "¡Me encanta hablar contigo!", when: () => cfg().ai },
  ];
  const active = () => MIS.filter((m) => !m.when || m.when());
  let pill = document.getElementById("mission");
  if (!pill) { pill = document.createElement("div"); pill.id = "mission"; stage.appendChild(pill); }
  let remindT = 0;
  function cur() { if (!P.mis || P.mis.done || P.mis.skipped) return null; return active()[P.mis.i] || null; }
  function showMission(intro) {
    const m = cur();
    if (!m) { pill.classList.remove("in"); return; }
    const list = active();
    pill.innerHTML = `<b>${P.mis.i + 1}/${list.length}</b> ${m.t}`;
    pill.classList.add("in");
    if (intro) { E.act("wave"); E.say(m.intro(), 4600, true); }
    clearInterval(remindT);
    remindT = setInterval(() => {                       // si no avanzas, te lo recuerda (sin agobiar)
      if (!cur() || E.busy() || E.S.sleeping) return;
      if (Date.now() - P.mis.at > 150000) { P.mis.at = Date.now(); save(); E.act("wave"); E.say(cur().intro(), 4200, true); }
    }, 30000);
  }
  function startMissions() { P.offered = true; P.mis = { i: 0, at: Date.now() }; save(); showMission(true); }
  function skipMissions() { if (P.mis) P.mis.skipped = true; else P.mis = { i: 0, skipped: true }; P.offered = true; save(); clearInterval(remindT); pill.classList.remove("in"); }
  function mission(ev) {
    const m = cur();
    if (!m || m.ev !== ev) return;
    P.mis.i++; P.mis.at = Date.now(); save();
    pill.classList.add("ok");
    later(700, () => pill.classList.remove("ok"));
    later(ev === "feed" ? 3600 : ev === "play" ? 2600 : 900, () => {
      E.fx("spark", 2); E.hop(-380); E.say("¡Misión cumplida! " + m.ok, 3200, true);
      addXp(6);
      if (P.mis.i >= active().length) { P.mis.done = true; save(); pill.classList.remove("in"); clearInterval(remindT); later(3600, () => unlockAch("first")); }
      else later(4200, () => showMission(true));
    });
  }
  function offerMissions() {
    P.offered = true; save();
    const M = window.EkoMenu;
    if (!M || !M.card) { startMissions(); return; }
    if (E.busy()) { P.offered = false; later(30000, offerMissions); return; }
    E.act("wave");
    const c = M.card(`<p>¿Te enseño todo lo que sé hacer? Son unas misiones cortitas</p><div class="chips"><button type="button" class="chip main yes">¡Vale!</button><button type="button" class="chip later">Luego</button><button type="button" class="chip no">No, gracias</button></div>`);
    c.querySelector(".yes").addEventListener("click", () => { M.closeCard(); startMissions(); });
    c.querySelector(".later").addEventListener("click", () => { M.closeCard(); P.offered = false; save(); E.say("¡Vale! Te lo vuelvo a proponer otro día", 2400, true); });
    c.querySelector(".no").addEventListener("click", () => { M.closeCard(); skipMissions(); E.say("¡Vale! Si cambias de idea, está en mi libreta", 2600, true); });
  }
  // el menú tapa la misión: se oculta mientras está abierto
  E.HOOKS.tick.push(() => {
    const open = window.EkoMenu && window.EkoMenu.isOpen && window.EkoMenu.isOpen();
    pill.classList.toggle("hid", !!open || E.A.hidden || toast.classList.contains("in") || !!document.querySelector(".card.in"));
  });

  later(3000, boot);
  // «Repetir» desde Ajustes
  if (E.listen) E.listen("cmd", (e) => { if (e.payload === "missions") startMissions(); });
  else window.addEventListener("storage", (e) => { if (e.key === "eko-missions-replay") startMissions(); });

  return {
    earn, event, has, level, title, xpFor, cost, MAX, LEVELS, ACH,
    get: () => ({ ...P, level: level() }),
    nextUnlock: () => { for (let n = level() + 1; n <= MAX; n++) if (LEVELS[n]) return { lvl: n, ...LEVELS[n] }; return null; },
    missions: () => ({ list: active(), i: P.mis ? P.mis.i : 0, done: !!(P.mis && P.mis.done), skipped: !!(P.mis && P.mis.skipped), running: !!cur() }),
    startMissions, skipMissions, onChange: null, bump: (n) => addXp(n),
  };
})();
