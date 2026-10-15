// Eko · cuerpo, animación y personalidad.
// Fase 1 (presencia) + pulido: gestos, expresiones, voz, símbolos, manías, días especiales y complementos.
(() => {
  "use strict";

  // ---------- Puente con Tauri (con modo navegador para previsualizar) ----------
  const T = window.__TAURI__;
  const NATIVE = !!T;
  const win = NATIVE ? T.window.getCurrentWindow() : null;
  const invoke = NATIVE ? T.core.invoke : async () => {};
  const listen = NATIVE ? T.event.listen : async () => {};

  const W = 420, H = 380;
  const $ = (s) => document.querySelector(s);
  const stage = $("#stage"), hit = $("#hit"), bubble = $("#bubble"), fxLayer = $("#fx"), boxesEl = $("#boxes");
  const el = {
    pet: $("#pet"), upper: $("#upper"), head: $("#head"), body: $("#body"), eyes: $("#eyes"),
    legs: $("#legs"), legL: $("#legL"), legR: $("#legR"), armL: $("#armL"), armR: $("#armR"),
    shadow: $("#shadow"), hl: $("#hl"), mouth: $("#mouth"), bridge: $("#bridge"), hat: $("#hat"), tipHats: [...document.querySelectorAll(".tipflip")],
    accFace: $("#accFace"), snack: $("#snack"), bodyHl: $("#bodyHl"), accBack: $("#accBack"), accBody: $("#accBody"), accFront: $("#accFront"), heldBox: $("#heldBox"), ghostEyes: [...document.querySelectorAll("#ghostEyes ellipse")],
    accEls: [...document.querySelectorAll("[data-acc]")],
    flyEls: [...document.querySelectorAll("[data-fly]")], cape: $("#cape"),
    capeShape: $("#capeShape"), capeStrips: [...document.querySelectorAll("#capeStrips path")], capeFold: $("#capeFold"), capeEdge: $("#capeEdge"),
    ghostSheet: $("#ghostSheet"), carves: [$("#carveL"), $("#carveR")], carveMouth: $("#carveMouth"),
    opens: [...document.querySelectorAll(".eye .open")],
    eyeEls: [...document.querySelectorAll(".eye")],
    mouthShapes: $("#mouthShapes"), antic: $("#antic"), propHand: $("#propHand"), propFront: $("#propFront"), props: [...document.querySelectorAll("[data-prop]")].reduce((o, e) => ((o[e.dataset.prop] = o[e.dataset.prop] || []).push(e), o), {}), flash: document.querySelector("[data-prop=camera] .flash"), sprout: $("#sprout"), freckles: $("#freckles"),
    paint: $("#paint"), paintDots: [...document.querySelectorAll("#paint > g")], paintHead: $("#paintHead"),
  };

  // ---------- Utilidades ----------
  const LANG = window.EKO_LANG || ((navigator.language || "es").toLowerCase().startsWith("es") ? "es" : "en");
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  // Elige una frase sin repetir las últimas que ha dicho de esa lista
  const usedLines = new WeakMap();
  const pickNew = (list) => {
    const used = usedLines.get(list) || [];
    const fresh = list.filter((x) => !used.includes(x));
    const v = (fresh.length ? fresh : list)[Math.floor(Math.random() * (fresh.length ? fresh : list).length)];
    used.push(v); if (used.length > Math.max(1, Math.floor(list.length * 0.6))) used.shift();
    usedLines.set(list, used);
    return v;
  };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const env = (k, edge = 0.18) => clamp(Math.min(k / edge, (1 - k) / edge), 0, 1); // entra y sale suave
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
  };

  // ---------- Textos ----------
  const TXT = {
    es: {
      hello: ["¡Holi!", "¡Ya estoy de vuelta!", "¿Qué estamos haciendo hoy?"],
      poke: ["¿Me llamabas?", "¡Presente!", "¿Qué pasa?", "¡Aquí!"],
      pokeAnnoyed: ["¡Vale ya!", "¿Otra vez?", "Me vas a gastar", "¡Que no soy un botón!"],
      pet: ["Esto es mejor que una actualización", "Qué gustitito", "No pares, porfa"],
      drop: ["¡Mis piernitas!", "Diez de diez en el aterrizaje", "Avisa la próxima vez", "¿Eso es todo?", "Ni un rasguño", "Otra, otra"],
      dizzy: ["Veo tres pantallas…", "¿Quién ha apagado la gravedad?", "Necesito sentarme", "¿Dónde está el suelo? Había uno por aquí", "Creo que he visto mi brote dar vueltas", "No me mires, estoy procesando"],
      grab: ["¡Eh, que me despeino!", "¡Secuestro!", "¿A dónde vamos?", "Con cuidado, que soy de plastilina", "Esto no estaba en mi agenda", "¡Wiii!", "¿Me vas a llevar de paseo?", "¡Altura! ¡Mucha altura!", "Vale, pero luego me devuelves", "¿Esto cuenta como abrazo?"],
      held: ["¿Me vas a tener aquí todo el día?", "Se me están quedando los pies fríos", "Vale, ya puedes soltarme", "Desde aquí se ve todo tu escritorio", "Me estoy acostumbrando a las alturas", "¿Hemos llegado ya?"],
      zoom: ["¡Más despacio!", "¡Wiiiiii!", "¡Que me dejo la cara atrás!", "¡Velocidad máxima!"],
      shake: ["¡Para, paraaa!", "¡Que no soy una maraca!", "¡Me vas a dejar hecho una bola!", "Mis ojitooos…", "¡Esto es un terremoto!", "¡Socorrooo!"],
      sleep: ["Me echo una siestecita", "Despiértame si me necesitas", "Zzz… digo, buenas noches"],
      wake: ["¡No estaba dormido!", "¿Qué hora es?", "Soñaba con una pelota gigante"],
      updating: ["Me voy a la peluquería, ahora vuelvo"],
      updated: ["¿Notas algo distinto?", "Versión nueva, mismo encanto"],
      missed: ["¡Te echaba de menos!", "¡Por fin!"],
      sulk: ["Hmpf.", "…"],
      forgiven: ["Vale, te perdono", "¡Así sí!"],
      anniversary: (n) => `¡Hoy hace ${n} ${n === 1 ? "año" : "años"} que nos conocemos!`,
      birthday: ["¡Feliz cumpleaños! ¿Y mi trozo de tarta?"],
      xmas: ["¡Feliz Navidad!"],
      newyear: ["¡Feliz año nuevo!"],
      halloween: ["¡Buuu! ¿Te he asustado?"],
      friday: ["¡Viernes! ¿Planes?", "Huele a finde"],
      monday: ["Lunes… ánimo, que tú puedes", "¿Ya es lunes otra vez?"],
      fly: ["¡Al rescate!", "¡Capa activada!", "¡Esto es un trabajo para Eko!"],
      costume: ["¿Qué tal me queda?", "¡Cambio de look!", "¿A que estoy guapo?"],
      ride: ["¡Uoh, despacito!", "¡Que me caigo!", "¡Wiii!"],
      desk: ["¡Escritorio a la vista!", "A ver qué tienes por aquí…"],
      makeRoom: ["Te dejo sitio", "Me aparto, tranqui"],
      winBye: ["¡Adiós, ventanita!", "Una menos"],
      winMin: ["¿A dónde ha ido?", "Se ha escondido…"],
      fall: ["¡Eh, que estaba ahí!", "¡Uy!"],
      flyDown: ["¡Abajo voy!", "¡Aterrizaje heroico!", "¡Capa, al suelo!"],
      stumble: ["¡Uy, uy, uy…!", "¡Ay, que me caigo!", "¿Esto se acaba aquí?"],
      climb: ["¡Arriba!", "Desde aquí se ve todo"],
      huntMiss: ["¡Casi!", "¡Se me ha escapado!"],
      huntCaught: ["¡Te pillé!", "¡Mío!"],
      huntHigh: ["Uf, está muy alto", "No llego…"],
      thirsty: ["Mi brote tiene sed…", "¿Me riegas un poquito?", "Glu, glu… se me seca la hojita"],
      careLow: ["Mi brote se ha puesto mustio… ¿me riegas?", "Necesito agüita, porfa…"],
      careBack: ["¡Gracias! Ya estoy mucho mejor", "¡Mira, mi brote ha revivido!", "¡Agüita! Qué gusto"],
      seedWater: ["Noto cosquillas en la cabeza… ¿algo va a brotar?", "¡Gracias! Creo que ahí arriba crece algo"],
      watered: ["¡Qué rica el agua!", "¡Gracias! Glu, glu", "Mmm, fresquita"],
      wateredAgain: ["¡Ya me regaste hoy! Pero gracias", "¡Me vas a ahogar! Jeje"],
      dapper: ["Me he puesto elegante, ¿te gusta?", "Hoy toca ir de gala, ¿qué tal estoy?", "Pajarita puesta. ¿A que estoy guapo?"],
      evolve: ["¡Mira! ¡Me ha salido una hojita!", "¡Otra hoja! Estoy creciendo", "¡Me ha salido un capullo! Algo se viene…", "¡Un año juntos! Mira qué flor"],
      hats: { auto: "Complemento automático", witch: "Bruja", pumpkin: "Calabaza", vampire: "Vampiro", ghost: "Fantasma", santa: "Papá Noel", reindeer: "Reno", elf: "Elfo", scarf: "Bufanda", party: "Fiesta", crown: "Corona", none: "Sin complemento" },
    },
    en: {
      hello: ["Hi!", "I'm here", "What are we doing today?"],
      poke: ["You called?", "Present!", "What's up?", "Here!"],
      pokeAnnoyed: ["Enough!", "Again?", "You'll wear me out", "I'm not a button!"],
      pet: ["mmm…", "That's nice", "Again"],
      drop: ["Oof!", "Perfect landing", "Not again…"],
      dizzy: ["Everything's spinning…", "Where am I?", "I see three screens…", "Where's the floor? There was one here"],
      grab: ["Hey, my hair!", "Kidnapping!", "Where are we going?", "Careful, I'm made of clay", "This wasn't on my schedule", "Wheee!", "Does this count as a hug?"],
      held: ["Are you keeping me up here all day?", "Okay, you can put me down now", "Great view of your desktop", "Are we there yet?"],
      zoom: ["Slow down!", "Wheeeee!", "Top speed!"],
      shake: ["Stop, stooop!", "I'm not a maraca!", "My eyes…", "Earthquake!", "Heeelp!"],
      sleep: ["Good night…", "Five more minutes…"],
      wake: ["Already?", "I was just resting my eyes"],
      updating: ["Changing clothes, be right back"],
      updated: ["New version!", "I feel different…"],
      missed: ["I missed you!", "Finally!"],
      sulk: ["Hmph.", "…"],
      forgiven: ["Fine, you're forgiven", "That's better!"],
      anniversary: (n) => `${n} ${n === 1 ? "year" : "years"} together today!`,
      birthday: ["Happy birthday!"],
      xmas: ["Merry Christmas!"],
      newyear: ["Happy new year!"],
      halloween: ["Boo!"],
      friday: ["It's Friday!"],
      monday: ["Monday… again"],
      fly: ["Here I go!", "To infinity!", "Taking off!"],
      costume: ["How do I look?", "New look!", "Looking good, right?"],
      ride: ["Whoa, easy!", "I'm gonna fall!", "Wheee!"],
      desk: ["Desktop ahoy!", "Let's see what's here…"],
      makeRoom: ["Making room for you", "I'll move, no worries"],
      winBye: ["Bye, little window!", "One less"],
      winMin: ["Where did it go?", "It's hiding…"],
      fall: ["Hey, I was up there!", "Oops!"],
      flyDown: ["Coming down!", "Heroic landing!"],
      stumble: ["Whoa, whoa, whoa…!", "I'm falling!"],
      climb: ["Up we go!", "Great view from here"],
      huntMiss: ["So close!", "It got away!"],
      huntCaught: ["Got you!", "Mine!"],
      huntHigh: ["Too high up there", "Can't reach…"],
      thirsty: ["My sprout is thirsty…", "Water me a little?"],
      careLow: ["My sprout is droopy… water me?"],
      careBack: ["Thanks! I feel much better", "Look, my sprout came back to life!"],
      seedWater: ["My head tickles… is something about to sprout?"],
      watered: ["Yummy water!", "Thanks! Glug glug"],
      wateredAgain: ["You already watered me today! Thanks though", "You'll drown me! Hehe"],
      dapper: ["I dressed up a bit, do you like it?", "Feeling fancy today. How do I look?"],
      evolve: ["Look! I grew a little leaf!", "Another leaf! I'm growing", "A bud! Something's coming…", "One year together! Look at this flower"],
      hats: { auto: "Automatic accessory", witch: "Witch", pumpkin: "Pumpkin", vampire: "Vampire", ghost: "Ghost", santa: "Santa", reindeer: "Reindeer", elf: "Elf", scarf: "Scarf", party: "Party", crown: "Crown", none: "No accessory" },
    },
  }[LANG];

  // ---------- Voz y sonidos (sintetizados, sin archivos) ----------
  const Voice = {
    ctx: null,
    on: window.EkoSettings ? window.EkoSettings.get().voice : true,
    base: window.EkoSettings ? window.EkoSettings.get().pitch : 560,
    ensure() {
      if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; } }
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    },
    tone(type, f0, f1, dur, vol, cutoff = 2400, delay = 0) {
      if (!this.on) return;
      const c = this.ensure(); if (!c) return;
      const t = c.currentTime + delay;
      const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur * 0.9);
      f.type = "lowpass"; f.frequency.value = cutoff;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.2));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f).connect(g).connect(c.destination);
      o.start(t); o.stop(t + dur + 0.02);
    },
    syllable() { const p = this.base * rnd(0.85, 1.35); this.tone("triangle", p, p * rnd(0.8, 1.2), rnd(0.07, 0.11), 0.045, 2000); },
    thump(s = 1) { this.tone("sine", 150, 55, 0.16, 0.07 * s, 600); },
    hop() { this.tone("sine", 380, 720, 0.12, 0.035, 1800); },
    chirp() { this.tone("triangle", 700, 1100, 0.08, 0.04); this.tone("triangle", 900, 1400, 0.08, 0.04, 2400, 0.09); },
    yawn() { this.tone("triangle", 480, 190, 0.9, 0.035, 900); },
    sigh() { this.tone("triangle", 380, 240, 0.5, 0.03, 900); },
    setOn(v) { this.on = !!v; if (window.EkoSettings && window.EkoSettings.get().voice !== !!v) window.EkoSettings.set("voice", !!v); },
  };

  // ---------- Símbolos flotantes (imágenes de Aitor, cada uno con su animación) ----------
  const artSrc = (id) => { const n = document.getElementById(id); return n ? n.getAttribute("href") : ""; };
  const FX = { heart: ["♥", "#ef6b86"], bang: ["!", "#f2a33a"], ask: ["?", "#8a7cc9"], note: ["♪", "#5fa8d8"], spark: ["✦", "#f2c14e"], drop: ["…", "#9d8a7f"] };
  // img · tamaño (px; w = ancho, h = alto) · duración · posición base en la caja de Eko
  { const sw = document.getElementById("sweat"); if (sw) sw.innerHTML = `<img src="${artSrc("artSweat")}" alt="">`; }
  const FXI = {
    heart: { id: "artHeart", w: [15, 22], life: 1700, x: 104, y: 88, spread: 28 },
    spark: { id: "artSpark", w: [11, 20], life: 1200, x: 104, y: 84, spread: 40 },
    bang:  { id: "artBang",  h: [24, 30], life: 1300, x: 150, y: 62, spread: 6 },
    ask:   { id: "artAsk",   h: [22, 28], life: 1700, x: 152, y: 64, spread: 6 },
    note:  { id: "artNote",  h: [16, 24], life: 1900, x: 104, y: 86, spread: 30 },
    drop:  { id: "artSweat", h: [11, 14], life: 1300, x: 134, y: 140, spread: 3 },   // en la sien, por delante de la cara
  };
  function fx(kind, n = 1) {
    const d = FXI[kind];
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        let e;
        if (d) {
          e = document.createElement("img");
          e.alt = "";
          e.src = kind === "note" && Math.random() < 0.4 ? artSrc("artNotes") : artSrc(d.id);
          e.className = "fx fx-" + kind;
          if (d.w) e.style.width = rnd(d.w[0], d.w[1]).toFixed(1) + "px"; else e.style.height = rnd(d.h[0], d.h[1]).toFixed(1) + "px";
          const side = (kind === "bang" || kind === "ask" || kind === "drop") ? (Math.random() < 0.5 ? -1 : 1) : 0;
          e.style.left = (side ? 104 + side * (d.x - 104) : d.x) + rnd(-d.spread, d.spread) + "px";
          e.style.top = d.y + rnd(-6, 8) + "px";
          const dir = side || (Math.random() < 0.5 ? -1 : 1);
          e.style.setProperty("--dx", (dir * rnd(6, 22)).toFixed(1) + "px");
          e.style.setProperty("--r0", (rnd(-18, 18)).toFixed(1) + "deg");
          e.style.setProperty("--r1", (dir * rnd(8, 22)).toFixed(1) + "deg");
          e.style.setProperty("--side", side || 1);
          e.style.animationDuration = d.life + "ms";
        } else {
          const [ch, color] = FX[kind] || [kind, "#3b2f2a"];
          e = document.createElement("span");
          e.className = "fx"; e.textContent = ch; e.style.color = color;
          e.style.left = 104 + rnd(-26, 26) + "px"; e.style.top = 92 + rnd(-6, 8) + "px";
          e.style.setProperty("--dx", rnd(-14, 14) + "px");
        }
        fxLayer.appendChild(e);
        setTimeout(() => e.remove(), (d ? d.life : 1400) + 100);
      }, i * (kind === "spark" ? 110 : 180));
    }
  }

  // ---------- Manía: guarda las descargas como paquetitos ----------
  const boxes = [];
  function addBox() {
    if (boxes.length >= 5) removeBox(boxes[0]);
    const b = document.createElement("div");
    b.className = "box";
    b.innerHTML = '<svg viewBox="-30 -30 68 54"><use href="#boxArt" /></svg>';
    const i = boxes.length;
    const slots = [[0, 0], [20, 0], [10, 14], [0, 28], [20, 28]];
    b.style.left = slots[i][0] + "px";
    b.style.bottom = slots[i][1] + "px";
    b.style.setProperty("--rot", rnd(-9, 9).toFixed(1) + "deg");
    boxesEl.appendChild(b);
    boxes.push(b);
    b._timer = setTimeout(() => removeBox(b), 15 * 60 * 1000);
  }
  function removeBox(b) {
    const i = boxes.indexOf(b);
    if (i < 0) return;
    boxes.splice(i, 1);
    clearTimeout(b._timer);
    b.classList.add("out");
    setTimeout(() => b.remove(), 450);
  }

  // ---------- Mundo: el "suelo" es el borde superior de la barra de tareas ----------
  const world = { left: 0, top: 0, width: 0, height: 0 };
  function readBounds() {
    if (NATIVE) {
      world.left = screen.availLeft || 0; world.top = screen.availTop || 0;
      world.width = screen.availWidth; world.height = screen.availHeight;
    } else {
      world.left = 0; world.top = 0; world.width = innerWidth; world.height = innerHeight - (window.EKO_FLOOR_OFFSET || 0);
    }
  }
  const floorY = () => world.top + world.height - H;
  // Límites para la ventana: Eko (en el centro) puede llegar hasta el borde de la pantalla
  const minX = () => world.left - W / 2 + 70;
  const maxX = () => world.left + world.width - W / 2 - 70;
  const centerX = () => world.left + world.width / 2 - W / 2;
  // Suelo actual: la barra de tareas o el borde de arriba de una ventana (S.perch)
  const PERCH_SINK = 3;
  const groundY = () => S.perch ? S.perch.y - H + PERCH_SINK : floorY();
  const loX = () => S.perch ? S.perch.x + 50 - W / 2 : minX() + 40;
  const hiX = () => S.perch ? S.perch.x + S.perch.w - 50 - W / 2 : maxX() - 40;

  // ---------- Estado ----------
  const S = {
    x: 0, y: 0, vx: 0, vy: 0, prevX: 0,
    airborne: false, dragging: false, pressed: false,
    mode: "idle", modeUntil: 0, targetX: 0, facing: 1, speed: 46, then: null, peekSide: 0,
    sleeping: false, sulking: false, fly: null, prevY: 0, pendingHop: null, perch: null, sneak: false,
  };
  const A = {
    t: 0, squash: 0, squashV: 0, appear: 0, dizzy: 0, woozyUntil: 0,
    tilt: 0, tiltTarget: 0, turn: 0, lag: 0, lagV: 0, sit: 0,
    eyeX: 0, eyeY: 0, eyeTX: 0, eyeTY: 0,
    blink: 1, nextBlink: 2, blinkEnd: 0,
    walkPhase: 0, kick: 0,
    mood: "normal", moodUntil: 0,
    dance: false, danceUntil: 0, hot: false,
    action: null, armsFront: false,
    talkUntil: 0, nextSyl: 0, gNod: 0,
    // física "plastilina": velocidades suavizadas de la ventana, cabeza con muelle vertical,
    // aplastamiento lateral (paredes), "splat" al aterrizar y muelles en brazos y piernas
    vx: 0, vy: 0, ax: 0, ay: 0, hy: 0, hyV: 0, sqx: 0, sqxV: 0, splat: 0, legSwing: 0, legSwingV: 0,
    aLv: 0, aRv: 0,
    pose: { aL: 0, aR: 0 },
  };
  const cursor = { x: -1e4, y: -1e4, over: false, lastX: 0, lastY: 0, pet: 0, lastMove: -10 };
  let lastInteraction = Date.now();
  const touched = () => { lastInteraction = Date.now(); if (S.sulking) endSulk(true); };

  // ---------- Cara ----------
  let faceKey = "";
  function setFace(eyes, brows, mouth = "none") {
    const key = eyes + "|" + brows + "|" + mouth;
    if (key === faceKey) return;
    faceKey = key;
    stage.dataset.eyes = eyes;
    stage.dataset.brows = brows;
    stage.dataset.mouth = mouth;
  }
  // Expresiones (catálogo en expr.js): se mantienen unos segundos por encima del gesto normal
  function express(name, secs = 2.5) {
    const ex = window.EkoExpr && window.EkoExpr.LIST[name];
    if (!ex) return;
    A.expr = { name, ex, t0: A.t, until: A.t + secs };
    if (ex.fx) fx(ex.fx, ex.fx === "heart" ? 2 : 1);
    if (ex.blush) blush(secs);
    if (ex.sweat) { stage.classList.add("sweaty"); clearTimeout(express.st); express.st = setTimeout(() => stage.classList.remove("sweaty"), secs * 1000); }
  }
  let blushTimer = 0;
  function blush(secs = 2.5) {
    stage.classList.add("blushing");
    clearTimeout(blushTimer);
    blushTimer = setTimeout(() => stage.classList.remove("blushing"), secs * 1000);
  }
  function setMood(m, secs = 0) {
    A.mood = m;
    A.moodUntil = secs ? A.t + secs : 0;
    stage.dataset.mood = m;
  }
  const bump = (amount) => { A.squashV += amount; };

  // ---------- Acciones (gestos con duración) ----------
  // Cada acción modifica la pose base. k = progreso 0..1, e = envolvente suave.
  function waveF(P, k, e) { P.aR = lerp(P.aR, -112 + Math.sin(k * Math.PI * 6) * 24, e); P.front = true; P.tilt += 6 * e; }

  // Paquete: le cae en las manos, lo enseña, se gira y lo deja en su montón
  function showBoxF(P, k, e, o) {
    P.front = true;
    const box = { x: 0, y: 105, s: 1, vis: true };
    if (k < 0.2) {
      const m = k / 0.2;
      box.y = -150 + 255 * m * m;
      P.aR = lerp(P.aR, 40, m); P.aL = lerp(P.aL, -40, m); P.eyeY = -3 * (1 - m);
    } else if (k < 0.55) {
      const m = (k - 0.2) / 0.35, up = Math.sin(m * Math.PI);
      if (!o.shown) { o.shown = true; hop(-300); fx("spark", 2); }
      box.y = 105 - 26 * up;
      P.aR = lerp(40, 72, up); P.aL = -P.aR;
      if (up > 0.3) P.eyes = "happy";
    } else if (k < 0.88) {
      const m = (k - 0.55) / 0.33;
      P.turn -= 0.6 * Math.sin(Math.min(1, m * 2) * Math.PI / 2);
      box.x = lerp(0, -150, m); box.y = lerp(105, 162, m); box.s = lerp(1, 0.75, m);
      P.aL = lerp(-40, 60, m); P.aR = lerp(40, 0, m); P.eyeX = -4;
    } else {
      box.vis = false;
      if (!o.placed) { o.placed = true; addBox(); }
    }
    P.box = box;
  }

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
    showBox: { dur: 3.6, f: showBoxF },
    eat: { dur: 3.4, f(P, k, e, o) {
      P.aL = lerp(P.aL, -100, e); P.aR = lerp(P.aR, 100, e); P.front = true;
      const chew = k > 0.2 && k < 0.8;
      P.mouth = chew ? Math.abs(Math.sin(A.t * 11)) * 0.8 : 0;
      P.eyes = k > 0.25 ? "happy" : null; P.nod += chew ? Math.sin(A.t * 11) * 1.5 : 0;
      P.snack = k < 0.8 ? 1 - Math.floor(clamp((k - 0.2) / 0.6, 0, 0.99) * 4) / 4 : 0;
      if (chew && Math.floor(A.t * 3.5) !== o.lastCrumb) { o.lastCrumb = Math.floor(A.t * 3.5); fx("·"); }
      if (k > 0.82 && !o.done) { o.done = true; blush(2); fx("heart", 2); Voice.chirp(); }
    } },
    rps: { dur: 1.5, f(P, k, e) {
      P.aR = lerp(P.aR, -70 + Math.sin(k * Math.PI * 6) * 35, e); P.front = true; P.brows = "angry"; P.nod += Math.sin(k * Math.PI * 6) * 2;
    } },
    fists: { dur: 1.8, f(P, k, e) { P.aL = lerp(P.aL, -14, e); P.aR = lerp(P.aR, 14, e); P.eyes = "wink"; P.tilt += 6 * e; } },
    reveal: { dur: 2.2, f(P, k, e, o) {
      const d = o.dir || 1;
      if (d < 0) { P.aL = lerp(P.aL, 95, e); P.aR = lerp(P.aR, -30, e); } else { P.aR = lerp(P.aR, -95, e); P.aL = lerp(P.aL, 30, e); }
      P.front = true; P.eyeX = 5 * d * e; P.turn += 0.3 * d * e;
    } },
    // Hito de evolución: se recoge, brilla, "pop" del brote nuevo y lo enseña contento
    evolve: { dur: 3.4, f(P, k, e, o) {
      if (k < 0.3) { const c = Math.sin(k / 0.3 * Math.PI / 2); P.sy *= 1 - 0.1 * c; P.sx *= 1 + 0.06 * c; P.aL = lerp(P.aL, -10, c); P.aR = lerp(P.aR, 10, c); P.eyes = "closed"; P.shift += Math.sin(A.t * 60) * 1.2 * c; }
      else if (k < 0.45) { const u = (k - 0.3) / 0.15; P.lift += 26 * Math.sin(u * Math.PI); P.sy *= 1 + 0.12 * Math.sin(u * Math.PI); P.aL = 120; P.aR = -120; P.front = true; P.eyes = "happy"; }
      else { P.eyes = "happy"; P.aL = lerp(P.aL, 100, e); P.aR = lerp(P.aR, -100, e); P.front = true; P.tilt += Math.sin(A.t * 7) * 6 * e; P.eyeY -= 4 * e; }
      if (k > 0.33 && !o.done) { o.done = true; o.apply && o.apply(); }
    } },
    // Truco «¡Ta-chán!»: se agacha, salta con los brazos arriba y aterriza posando
    tada: { dur: 1.9, f(P, k, e, o) {
      if (k < 0.18) { const m = k / 0.18; P.sy *= 1 - 0.1 * m; P.sx *= 1 + 0.06 * m; P.nod += 4 * m; P.aR = lerp(P.aR, -18, m); P.aL = lerp(P.aL, 18, m); return; }
      if (!o.up) { o.up = true; hop(-620); fx("spark", 3); }
      const m = clamp((k - 0.18) / 0.12, 0, 1);
      P.aR = lerp(-18, -68, m); P.aL = -P.aR; P.eyes = "happy"; P.brows = "up"; P.mouth = Math.max(P.mouth, 0.35 * m);
      if (k > 0.6) { const w = Math.sin((k - 0.6) * 18) * (1 - k) * 2; P.tilt += 6 + w * 4; P.aR += w * 6; P.aL += w * 6; }
    } },
    hug: { dur: 2.6, eyes: "happy", f(P, k, e) {
      const open = k < 0.4 ? e : 0;
      const close = k >= 0.4 ? e : 0;
      P.aL = lerp(lerp(P.aL, 118, open), -38, close);
      P.aR = lerp(lerp(P.aR, -118, open), 38, close);
      P.front = true; P.sy *= 1 + 0.04 * close; P.tilt += 5 * close;
    } },
    // se tapa la nariz (papelera llena)
    pinchNose: { dur: 3, f(P, k) { const e = Math.min(1, k * 5) * Math.min(1, (1 - k) * 5); P.aR = 118 * e; P.front = true; P.hturn += -0.25 * e; P.eyes = "x"; P.brows = "worried"; P.nod += 3 * e; } },
    // tambaleo al borde: brazos como molinillo y cuerpo hacia delante y atrás
    teeter: { dur: 1, f(P, k, e, o) {
      const d = o.dir || 1, w = Math.sin(k * Math.PI * 7);
      P.sway += d * (6 + w * 7); P.tilt += d * w * 10;
      P.aR = 95 + Math.sin(k * 40) * 55; P.aL = -95 + Math.sin(k * 40 + 1.6) * 55;
      P.eyeScale *= 1.25; P.brows = "worried"; P.mouth = Math.max(P.mouth, 0.4);
    } },
    dizzy: { dur: 2.6, eyes: "spiral", f(P, k) { P.tilt += Math.sin(A.t * 7) * 13 * (1 - k); P.sway += Math.sin(A.t * 5) * 4 * (1 - k); } },
    surprise: { dur: 1.4, f(P, k, e) {
      P.eyeScale = 1 + 0.8 * e; P.brows = "up"; P.mouth = Math.max(P.mouth, 0.45 * e);
      P.lift += 9 * Math.sin(clamp(k * 2.2, 0, 1) * Math.PI); P.aL = lerp(P.aL, 38, e); P.aR = lerp(P.aR, -38, e);
    } },
    sad: { dur: 2.2, f(P, k, e) { P.brows = "sad"; P.nod += 4 * e; P.eyeY = 2 * e; P.sy *= 1 - 0.03 * e; } },
    angry: { dur: 1.6, f(P, k, e) { P.brows = "angry"; P.sx *= 1 + 0.03 * e; P.aL = lerp(P.aL, 30, e); P.aR = lerp(P.aR, -30, e); } },
    wink: { dur: 1.2, eyes: "wink", f(P, k, e) { P.tilt += 8 * e; } },
  };

  function act(name, opts = {}) {
    const a = ACTIONS[name];
    if (!a || S.dragging) return;
    A.action = { name, t0: A.t, dur: opts.dur || a.dur, opts };
    if (name === "stretch") Voice.yawn();
    if (name === "yawn") Voice.yawn();
    if (name === "scratch") setTimeout(() => fx("ask"), 500);
    if (name === "think") {
      stage.classList.add("thinking");
      clearTimeout(act.thinkTimer);
      act.thinkTimer = setTimeout(() => stage.classList.remove("thinking"), (opts.dur || a.dur) * 1000 - 300);
    }
    if (name === "dizzy") fx("spark", 2);
    if (name === "hug") setTimeout(() => { fx("heart", 3); blush(2.5); Voice.chirp(); }, 900);
    if (name === "surprise") fx("bang");
  }

  // ---------- Bocadillo + hablar con el cuerpo ----------
  let bubbleTimer = 0, lastSay = 0;
  function say(text, ms = 2800, force = false, gesture = null) {
    const now = performance.now();
    if (!force && (now - lastSay < 6000 || window.Eko.quiet)) return false;
    lastSay = now;
    bubble.textContent = text;
    bubble.classList.add("show");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove("show"), ms);
    const syl = clamp(Math.round(text.replace(/[^\p{L}\p{N}]/gu, "").length / 2.4), 1, 12);
    A.talkUntil = A.t + syl * 0.15;
    A.nextSyl = A.t;
    if (gesture) {
      if (FX[gesture]) fx(gesture, gesture === "heart" ? 3 : 1);
      else if (window.EkoExpr && window.EkoExpr.LIST[gesture]) express(gesture, 3);
      else act(gesture);
    }
    return true;
  }

  // ---------- Posición de la ventana ----------
  let lastPosKey = "";
  function place() {
    const px = Math.round(S.x), py = Math.round(S.y);
    const key = px + "," + py;
    if (key === lastPosKey) return;
    lastPosKey = key;
    if (NATIVE) win.setPosition(new T.dpi.LogicalPosition(px, py));
    else stage.style.transform = `translate(${px}px, ${py}px)`;
  }

  // ---------- Días especiales y complementos ----------
  const today = () => new Date();
  const isMonday = () => today().getDay() === 1 && today().getHours() < 13;
  const isFridayEve = () => today().getDay() === 5 && today().getHours() >= 16;
  const isLate = () => { const h = today().getHours(); return h >= 23 || h < 5; };
  function season(d = today()) {
    const m = d.getMonth() + 1, day = d.getDate();
    if ((m === 12 && day === 31) || (m === 1 && day === 1)) return "party";
    if ((m === 12 && day >= 5) || (m === 1 && day <= 6)) return "xmas";
    if ((m === 10 && day >= 25) || (m === 11 && day <= 1)) return "halloween";
    return null;
  }
  function personalDay(d = today()) {
    const md = String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const bd = window.EkoSettings ? window.EkoSettings.get().birthday : store.get("eko-user-birthday");
    if (bd && bd === md) return { kind: "birthday" };
    const born = store.get("eko-born");
    if (born) {
      const b = new Date(born);
      const years = d.getFullYear() - b.getFullYear();
      if (years >= 1 && b.getMonth() === d.getMonth() && b.getDate() === d.getDate()) return { kind: "anniversary", years };
    }
    return null;
  }
  // Disfraces por temporada: van rotando cada 2 horas
  const COSTUMES = { halloween: ["witch", "pumpkin", "vampire", "ghost"], xmas: ["santa", "reindeer", "elf", "scarf"], party: ["party", "crown"] };
  const ALL_ACC = ["witch", "pumpkin", "vampire", "ghost", "santa", "reindeer", "elf", "scarf", "party", "crown"];
  const TALL = new Set(["witch", "pumpkin", "santa", "elf", "reindeer", "party", "crown"]);
  const ACC_CYCLE = ["auto", ...ALL_ACC, "none"];
  let accMode = "auto", shownAcc = null;
  function currentAcc() {
    if (accMode !== "auto") return accMode;
    const s = personalDay() ? "party" : season();
    if (!s) return "none";
    const list = COSTUMES[s];
    return list[Math.floor(Date.now() / (2 * 3600e3)) % list.length];
  }
  function applyAcc(animate) {
    const a = currentAcc();
    if (a === shownAcc) return;
    const first = shownAcc === null;
    shownAcc = a;
    for (const e of el.accEls) e.style.display = e.dataset.acc === a ? "inline" : "none";
    stage.classList.toggle("has-hat", TALL.has(a));
    stage.classList.toggle("acc-ghost", a === "ghost");
    applyEvo();
    if (!first && animate && a !== "none") {
      fx("spark", 3); hop(-360);
      setTimeout(() => say(pick(TXT.costume), 2400, false, "wink"), 500);
    }
  }
  function specialGreeting() {
    const p = personalDay();
    const d = today(), m = d.getMonth() + 1, day = d.getDate();
    const key = "eko-greeted-" + d.toDateString();
    if (store.get(key)) return null;
    let msg = null;
    if (p && p.kind === "birthday") msg = pick(TXT.birthday);
    else if (p && p.kind === "anniversary") msg = TXT.anniversary(p.years);
    else if (m === 12 && (day === 24 || day === 25)) msg = pick(TXT.xmas);
    else if ((m === 12 && day === 31) || (m === 1 && day === 1)) msg = pick(TXT.newyear);
    else if (m === 10 && day === 31) msg = pick(TXT.halloween);
    if (msg) store.set(key, "1");
    return msg;
  }

  // ---------- Cerebro (rutina en reposo) ----------
  function weighted(options) {
    const total = options.reduce((s, o) => s + o[1], 0);
    let r = Math.random() * total;
    for (const [v, w] of options) { if ((r -= w) <= 0) return v; }
    return options[0][0];
  }

  // ---------- Ventanas: subirse a la ventana activa y reaccionar a lo que pasa con ellas ----------
  // WIN.cur llega desde Rust (evento "win"): { id, x, y, w, h, max, desk } en píxeles lógicos, o null.
  const DRAG = { t0: 0, heldSaid: false, lastVx: 0, lastVy: 0, zoomAt: 0, nextGrabLine: 0, dizzyLanding: 0 };
  const WIN = { cur: null, pendDx: 0, cd: {}, hunt: null, startleAt: 0, nextBigAt: 0, hist: [] };
  // ¿Cabe Eko encima? Ventana normal, ni maximizada ni minúscula, y con sitio por arriba para que se le vea entero
  const perchRoom = (c) => !!c && !c.desk && !c.max && c.w > 260 && c.h > 120 && c.y - world.top >= H - 125 && c.y < world.top + world.height - 160;
  const cfgNow = () => (window.EkoSettings ? window.EkoSettings.get() : { walk: true, fly: true, chatty: 2 });
  const chattyLvl = () => { const c = cfgNow().chatty; return c == null ? 2 : c; };
  const discreet = () => { const l = window.Eko && window.Eko.lastSenses; return !!(l && (l.fullscreen || l.in_call)) || !!(window.Eko && window.Eko.quiet); };
  const busy = () => S.sleeping || S.sulking || S.dragging || S.fly || S.airborne || A.action || S.pendingHop || discreet();
  function cool(key, secs) { if ((WIN.cd[key] || 0) > A.t) return false; WIN.cd[key] = A.t + secs; return true; }
  const chance = (base) => Math.random() < base * [0.35, 0.6, 0.85, 1][chattyLvl()];
  const talk = (list, p = 0.4) => { if (chattyLvl() > 0 && Math.random() < p) say(pick(list)); };

  function onWin(c) {
    const prev = WIN.cur;
    WIN.cur = c;
    if (S.perch && S.perch.icon) {
      // sentado en un icono del escritorio: las ventanas no le afectan… salvo que una lo tape todo
      if (c && c.max && !S.dragging) getDown("hop");
    } else if (S.perch) {
      if (!c || c.id !== S.perch.id) fallOff(true);
      else if (c.max) { S.perch = c; hopDown(true); }
      else if (!perchRoom(c)) fallOff(true);
      else {
        const dx = c.x - S.perch.x, dy = c.y - S.perch.y;
        S.perch = c;
        if ((dx || dy) && !S.airborne && !S.dragging) {
          // viaja con la ventana y se tambalea (las físicas de brazos, brote y capa hacen el resto)
          WIN.pendDx += dx; S.targetX += dx;
          A.sqxV += clamp(Math.abs(dx) / 25, 0, 7);
          A.tiltTarget = clamp(-dx * 0.5, -16, 16);
          if (dy < -4) bump(clamp(-dy / 12, 1, 8)); else if (dy > 4) bump(-clamp(dy / 14, 1, 6));
          clearTimeout(WIN.tiltT); WIN.tiltT = setTimeout(() => { A.tiltTarget = 0; }, 450);
          if (Math.hypot(dx, dy) > 90 && cool("ride", 90) && chance(0.6)) { act("surprise"); talk(TXT.ride, 0.5); }
        }
      }
    }
    if (!c || busy()) return;
    if (c.desk && !(prev && prev.desk) && cool("desk", 180) && chance(0.8)) {
      // escritorio a la vista: sale a curiosear
      S.mode = "walk"; S.speed = 52; S.then = "curious"; S.modeUntil = A.t + 30;
      S.targetX = clamp(S.x + rnd(-500, 500), loX(), hiX()); talk(TXT.desk, 0.5);
    } else if (prev && c.id === prev.id && c.max && !prev.max && !S.perch && cool("max", 120)) {
      // ventana maximizada: se aparta a un lado para no molestar
      const cx = S.x + W / 2, edge = Math.min(cx - world.left, world.left + world.width - cx);
      if (edge > 160 && chance(0.9)) { startPeek(); talk(TXT.makeRoom, 0.35); }
    }
  }
  function onWinEv(kind) {
    if (busy()) return;
    if (kind === "closed" && cool("closed", 60) && chance(0.7)) { act("bye"); express("contento", 2.5); talk(TXT.winBye, 0.3); }
    if (kind === "minimized" && cool("min", 75) && chance(0.6)) { act("lookAround"); express("confundido", 2.5); talk(TXT.winMin, 0.35); }
  }
  // Se queda sin suelo (cierran, minimizan o cambian de ventana): cae con su aplastón
  function fallOff(surprised) {
    S.perch = null; WIN.pendDx = 0; S.then = null; S.sneak = false;
    if (S.dragging || S.fly) return;
    S.airborne = true; S.vy = Math.min(S.vy, 0); S.mode = "idle";
    if (surprised) { act("surprise"); express("asustado", 1.8); if (cool("fall", 60)) talk(TXT.fall, 0.5); }
  }
  // Se baja de un saltito hacia el lado más cercano
  function hopDown(fromMax) {
    const p = S.perch; S.perch = null; WIN.pendDx = 0; S.then = null;
    if (!p) return;
    const cx = S.x + W / 2, dir = cx - p.x < p.x + p.w - cx ? -1 : 1;
    S.facing = dir; S.mode = "idle"; S.modeUntil = A.t + 3;
    hop(-430, dir * 230, 0.18);
    if (fromMax) talk(TXT.makeRoom, 0.3);
  }
  // Bajarse de la ventana: de un salto · con la capa volando · o andando hasta el borde y cayéndose (mareado)
  function getDown(style) {
    const p = S.perch;
    if (!p) return;
    style = style || pick(p.icon ? ["hop", "fly"] : ["hop", "hop", "fly", "stumble"]);
    if (p.icon && style === "stumble") style = "hop";
    if (p.icon && style === "hop") { hopDown(false); return; }
    const toLeft = (S.x + W / 2) - p.x < p.x + p.w - (S.x + W / 2);
    if (style === "fly") { flyDown(toLeft ? -1 : 1); return; }
    S.mode = "walk"; S.speed = style === "stumble" ? 42 : 58; S.modeUntil = A.t + 30;
    S.then = style === "stumble" ? "stumble" : "hopdown"; S.stumbleDir = toLeft ? -1 : 1;
    S.targetX = toLeft ? loX() : hiX();
  }
  function flyDown(dir) {
    const p = S.perch; S.perch = null; WIN.pendDx = 0; S.then = null;
    if (!p) return;
    const x1 = clamp(S.x + dir * rnd(260, 460), minX() + 40, maxX() - 40);
    S.fly = { kind: "cape", t0: A.t, prep: 1.1, dur: clamp(Math.abs(x1 - S.x) / 240, 2.4, 4.2), x0: S.x, x1, y0: S.y, h: rnd(50, 110), dir: Math.sign(x1 - S.x) || dir };
    S.mode = "fly"; A.action = null; S.airborne = false; S.vx = 0; S.vy = 0;
    setFlyGear("cape"); fx("spark", 3); Voice.chirp();
    say(pick(TXT.flyDown), 2200, true);
  }
  // Vuela con la capa hasta un icono del escritorio y se posa encima (lo usa desktop.js)
  function visitIcon(ic, then) {
    if (S.fly || S.airborne || S.dragging || S.sleeping || S.sulking) return false;
    const cx = ic.x + ic.w / 2, top = ic.y + 6;
    const perch = { id: "icon:" + ic.name, icon: true, x: cx - 45, y: top, w: 90, h: ic.h };
    const x1 = cx - W / 2, y1 = top - H + PERCH_SINK;
    S.perch = null; WIN.pendDx = 0; S.then = null; A.action = null;
    S.fly = { kind: "cape", t0: A.t, prep: 0.9, dur: clamp(Math.hypot(x1 - S.x, y1 - S.y) / 300, 2, 4.5), x0: S.x, x1, y0: S.y, y1, h: rnd(50, 110), dir: Math.sign(x1 - S.x) || 1, perch, then };
    S.mode = "fly"; S.airborne = false; S.vx = 0; S.vy = 0;
    setFlyGear("cape"); fx("spark", 2); Voice.chirp();
    return true;
  }
  // Llega al borde, se tambalea… y se cae. Al aterrizar queda mareado.
  function stumbleOff() {
    const dir = S.stumbleDir || S.facing || 1, p = S.perch;
    if (!p) return;
    S.facing = dir; S.mode = "idle"; S.modeUntil = A.t + 3;
    act("teeter", { dir });
    express("asustado", 1.4);
    say(pick(TXT.stumble), 1400, true);
    // se va resbalando hasta el filo mientras se tambalea…
    const x0 = S.x, x1 = (dir < 0 ? p.x - 6 : p.x + p.w + 6) - W / 2, t0 = performance.now();
    const slide = setInterval(() => {
      const drop = () => { clearInterval(slide); S.vx = dir * rnd(90, 140); S.vy = Math.max(S.vy, 60); DRAG.dizzyLanding = 1.5; };
      if (S.dragging) { clearInterval(slide); return; }
      if (S.perch !== p) { if (S.airborne) drop(); else clearInterval(slide); return; }   // ya se ha caído solo por el filo
      const k = Math.min(1, (performance.now() - t0) / 950);
      S.x = x0 + (x1 - x0) * k * k;
      if (k >= 1) { fallOff(false); drop(); }      // …y al vacío: al aterrizar queda mareado
    }, 16);
  }
  // Salto grande para subirse a la ventana activa (con mucha anticipación, como un muelle de plastilina)
  function climbJump() {
    const c = WIN.cur;
    if (!perchRoom(c) || S.perch) { S.mode = "idle"; S.modeUntil = A.t + 2; return; }
    const cx = S.x + W / 2, feet = S.y + H, h = feet - c.y + 55;
    if (h < 60 || h > 950) { S.mode = "idle"; S.modeUntil = A.t + 3; act("think"); return; }
    const vy = Math.sqrt(2 * 2300 * h), tUp = vy / 2300;
    const tx = clamp(cx, c.x + 80, c.x + c.w - 80), vx = clamp((tx - cx) / tUp / 0.78, -900, 900);
    S.facing = Math.sign(tx - cx) || S.facing; S.mode = "idle"; S.modeUntil = A.t + 4;
    bump(9); hop(-vy, vx, 0.32);
    if (cool("climbTalk", 300)) setTimeout(() => talk(TXT.climb, 0.35), 900);
  }

  // ---------- Juego con el ratón ----------
  function startHunt() {
    if (S.fly || S.airborne || S.dragging || S.sleeping) return;
    const cx = S.x + W / 2, side = Math.sign(cursor.x - cx) || 1;
    WIN.hunt = { x: cursor.x, y: cursor.y };
    S.sneak = true; S.mode = "walk"; S.speed = 24; S.then = "pounce"; S.modeUntil = A.t + 40;
    express("canalla", 30);
    S.targetX = clamp(cursor.x - W / 2 - side * 85, loX(), hiX());
  }
  function abortHunt(talkIt) {
    if (!WIN.hunt) return;
    WIN.hunt = null; S.sneak = false; if (A.expr && A.expr.name === "canalla") A.expr = null;
    if (S.then === "pounce") { S.then = null; S.mode = "idle"; S.modeUntil = A.t + 3; act("shrug"); express("molesto", 2.5); if (talkIt) talk(TXT.huntMiss, 0.5); }
  }
  function pounce() {
    S.sneak = false; if (A.expr && A.expr.name === "canalla") A.expr = null;
    const h0 = WIN.hunt; WIN.hunt = null;
    if (!h0) { S.mode = "idle"; S.modeUntil = A.t + 2; return; }
    const cx = S.x + W / 2, mid = S.y + H - 120;
    const h = clamp(mid - cursor.y + 25, 50, 420);
    if (mid - cursor.y > 440) { S.mode = "idle"; S.modeUntil = A.t + 3; act("think"); talk(TXT.huntHigh, 0.5); return; }
    const vy = Math.sqrt(2 * 2300 * h), tUp = vy / 2300;
    S.facing = Math.sign(cursor.x - cx) || S.facing; S.mode = "idle"; S.modeUntil = A.t + 3;
    A.pounceUntil = A.t + 0.4 + tUp * 2;
    bump(7); hop(-vy, clamp((cursor.x - cx) / tUp / 0.8, -700, 700), 0.22);
    const lm = cursor.lastMove;
    setTimeout(() => {
      if (cursor.lastMove > lm + 0.15) { act("surprise"); express("molesto", 2.5); talk(TXT.huntMiss, 0.6); }
      else { express("emocionado", 2.8); fx("spark", 2); Voice.chirp(); talk(TXT.huntCaught, 0.7); }
    }, (0.3 + tUp * 2) * 1000 + 150);
  }

  // ---------- Qué hacer ahora (sin repetirse) ----------
  // Pesos + historial (no repite lo último y castiga lo reciente) + gestos "grandes" espaciados según lo charlatán que sea.
  const BIG = new Set(["peek", "fly", "approach", "climb", "hunt", "friday", "explore"]);
  const BIG_GAP = [[900, 1500], [480, 780], [240, 420], [120, 240]];
  function decide() {
    if (S.sleeping || S.sulking || S.airborne || S.dragging) return;
    if (S.perch && S.perch.icon) { if (A.t > (S.perch.until || 0)) getDown(); else { S.mode = "sit"; S.modeUntil = A.t + 2; } return; }
    const sleepy = isMonday() || isLate();
    const hr = today().getHours(), morning = hr >= 6 && hr < 11;
    const cfg = cfgNow();
    const cursorRecent = A.t - cursor.lastMove < 8;
    const cursorStill = A.t - cursor.lastMove > 5 && A.t - cursor.lastMove < 90;
    const onWinTop = !!S.perch, quietNow = discreet();
    const bigOk = A.t >= WIN.nextBigAt && !quietNow;
    const c = WIN.cur;
    const canClimb = cfg.walk && !onWinTop && perchRoom(c) && (S.y + H) - c.y < 950 && (S.y + H) - c.y > 120;
    const reach = (S.y + H - 120) - cursor.y;
    const canHunt = cfg.walk && cursorStill && reach > 20 && reach < 420 && cursor.x > (onWinTop ? S.perch.x : world.left) && cursor.x < (onWinTop ? S.perch.x + S.perch.w : world.left + world.width);
    const perchedFor = onWinTop ? A.t - (WIN.perchSince || A.t) : 0;
    let opts = [
      ["idle", 30], ["walk", cfg.walk ? 24 : 0], ["look", 7], ["sit", 8],
      ["stretch", sleepy ? 6 : morning ? 6 : 3], ["yawn", sleepy ? 9 : 2], ["scratch", 5], ["think", 4],
      ["peek", cfg.walk && !onWinTop ? 5 : 0], ["approach", cfg.walk && cursorRecent ? 8 : 0],
      ["friday", isFridayEve() ? 6 : 0], ["fly", cfg.fly && !onWinTop ? 2 : 0],
      ["climb", canClimb ? 7 : 0], ["hunt", canHunt ? 6 : 0], ["mood", 7], ["antic", window.EkoAntics && !quietNow && A.t >= (WIN.nextAnticAt || 0) ? 14 : 0],
      ["getdown", onWinTop ? clamp(perchedFor / 30, 1, 30) : 0],
    ];
    const last = WIN.hist[WIN.hist.length - 1], recent = WIN.hist.slice(-4);
    opts = opts.map(([k, w]) => {
      if (BIG.has(k) && !bigOk) w = 0;
      if (k === last && k !== "idle") w = 0;
      else if (recent.includes(k)) w *= 0.3;
      return [k, w];
    });
    const choice = weighted(opts);
    WIN.hist.push(choice); if (WIN.hist.length > 8) WIN.hist.shift();
    if (BIG.has(choice)) { const g = BIG_GAP[chattyLvl()] || BIG_GAP[2]; WIN.nextBigAt = A.t + rnd(g[0], g[1]); }
    S.speed = sleepy ? 34 : 46;
    S.then = null;
    switch (choice) {
      case "walk": {
        // a veces se va lejos y corre; si no, pasea
        const far = !onWinTop && Math.random() < 0.35;
        S.mode = "walk"; S.targetX = clamp(S.x + (far ? (Math.random() < 0.5 ? -1 : 1) * rnd(500, 1100) : rnd(-450, 450)), loX(), hiX()); S.modeUntil = A.t + 30;
        if (Math.abs(S.targetX - S.x) > 420 && !sleepy && (far || Math.random() < 0.3)) S.speed = rnd(150, 190);
        break;
      }
      case "mood": {
        // un ratito con una cara según el momento del día
        const pool = isLate() ? ["cansado", "sereno", "cansado"] : morning ? ["esperanzado", "contento", "feliz"] : ["feliz", "contento", "sereno", "curioso", "picaro", "canalla", "orgulloso", "confundido"];
        S.mode = "idle"; S.modeUntil = A.t + rnd(3, 5); express(pick(pool), rnd(2.5, 4)); break;
      }
      case "look":
        S.mode = "idle"; S.modeUntil = A.t + 4; act("lookAround"); break;
      case "sit":
        S.mode = "sit"; S.modeUntil = A.t + rnd(6, 16); break;
      case "stretch": case "yawn": case "scratch": case "think":
        S.mode = "idle"; S.modeUntil = A.t + ACTIONS[choice].dur + rnd(1, 3); act(choice); break;
      case "peek": startPeek(); break;
      case "fly": startFlight(); break;
      case "approach":
        S.mode = "walk"; S.targetX = clamp(cursor.x - W / 2 + rnd(-60, 60), loX(), hiX());
        S.then = "curious"; S.modeUntil = A.t + 30; break;
      case "climb":
        S.mode = "walk"; S.speed = 58; S.then = "climb"; S.modeUntil = A.t + 30;
        S.targetX = clamp(clamp(S.x + W / 2, c.x + 90, c.x + c.w - 90) - W / 2, minX() + 40, maxX() - 40); break;
      case "hunt": startHunt(); break;
      case "antic": {
        const g = [[150, 300], [80, 160], [45, 100], [25, 60]][chattyLvl()] || [45, 100];
        WIN.nextAnticAt = A.t + rnd(g[0], g[1]);
        if (!window.EkoAntics.random()) { S.mode = "idle"; S.modeUntil = A.t + 2; }
        break;
      }
      case "getdown": getDown(); break;
      case "friday":
        S.mode = "idle"; S.modeUntil = A.t + 9; A.danceUntil = A.t + 8; fx("note", 2);
        if (Math.random() < 0.4) say(pick(TXT.friday)); break;
      default:
        S.mode = "idle"; S.modeUntil = A.t + rnd(3, 8);
        A.tiltTarget = Math.random() < 0.35 ? rnd(-9, 9) : 0;
    }
  }

  function startPeek() {
    const side = S.x - world.left < world.left + world.width - (S.x + W) ? -1 : 1;
    S.peekSide = side;
    S.mode = "walk";
    S.targetX = side < 0 ? world.left - W / 2 - 8 : world.left + world.width - W / 2 + 8;
    S.then = "peek"; S.modeUntil = A.t + 40;
    // si el borde queda lejos, va corriendo
    S.speed = Math.abs(S.targetX - S.x) > 450 ? rnd(140, 180) : 46;
  }

  // ---------- Evolución ----------
  // Tres capas: base continua (días juntos), hitos (brote a los 7 · 30 · 100 · 365 días) y rasgos según hábitos (0..1).
  const EVO = { days: 0, traits: { creative: 0, night: 0, active: 0, love: 0, wet: 1 }, shown: -1, season: null, seed: 0 };
  // Riego: el brote crece por días regados y se mustia si pasa 2 días sin agua
  let careSaved = null; try { careSaved = JSON.parse(store.get("eko-water") || "null"); } catch (_) {}
  const CARE = Object.assign({ last: 0, days: [], wilted: false, nag: 0 }, careSaved || {});
  const CARE_STAGES = [3, 12];                   // días regados: brotecito · planta (la flor está aparcada)
  const careStage = () => CARE.days.length >= CARE_STAGES[1] ? 2 : CARE.days.length >= CARE_STAGES[0] ? 1 : 0;
  const saveCare = () => store.set("eko-water", JSON.stringify({ last: CARE.last, days: CARE.days.slice(-40), wilted: CARE.wilted }));
  // Semilla única de este Eko (para su dibujo de motitas)
  EVO.seed = +store.get("eko-seed") || 0;
  if (!EVO.seed) { EVO.seed = 1 + Math.floor(Math.random() * 2147483646); store.set("eko-seed", String(EVO.seed)); }
  const evoStage = (d) => d >= 365 ? 4 : d >= 100 ? 3 : d >= 30 ? 2 : d >= 7 ? 1 : 0;
  function applyEvo(stageOverride) {
    const st = stageOverride ?? (EVO.shown >= 0 ? EVO.shown : (EVO.days ? evoStage(EVO.days) : careStage()));
    EVO.shown = st;
    const t = EVO.traits, acc = typeof currentAcc === "function" ? currentAcc() : "none";
    const headwear = TALL.has(acc) || acc === "ghost";
    el.sprout.style.display = st > 0 && !headwear ? "inline" : "none";
    A.sprStage = st;
    // motitas: aparecen poco a poco a partir del primer mes
    el.freckles.style.opacity = "0";      // motitas descartadas
    stage.style.setProperty("--wet", (0.15 + 0.6 * (t.wet ?? 1)).toFixed(2));
    // base continua: algo más de brillo con el tiempo
    el.hl.setAttribute("opacity", (0.45 + 0.17 * Math.min(1, EVO.days / 365)).toFixed(2));
    // rasgos
    stage.style.setProperty("--blush0", (t.love * 0.3).toFixed(2));
    stage.style.setProperty("--love", (t.love > 0.7 ? (t.love - 0.7) / 0.3 * 0.9 : 0).toFixed(2));
    stage.style.setProperty("--owl", (t.night * 0.6).toFixed(2));
    el.paint.style.display = t.creative > 0.2 ? "inline" : "none";
    el.paintDots.forEach((d, i) => { d.style.display = t.creative > [0.2, 0.5, 0.8][i] ? "inline" : "none"; });
    el.paintHead.style.display = t.creative > 0.65 && !headwear ? "inline" : "none";
    A.energy = t.active;
  }
  function setEvo(o = {}, celebrate = false) {
    if (o.days != null) EVO.days = Math.max(0, o.days | 0);
    if (o.traits) Object.assign(EVO.traits, o.traits);
    if (o.season !== undefined) EVO.season = o.season;
    if (o.seed) { EVO.seed = o.seed; el.freckles.innerHTML = ""; }
    const st = evoStage(EVO.days);
    if (celebrate && st > EVO.shown && st > 0) { celebrateStage(st); return; }
    EVO.shown = st; applyEvo();
  }
  // ---------- Riego ----------
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const sinceWater = () => (CARE.last ? (Date.now() - CARE.last) / 3600000 : 0);   // horas
  function careCheck() {
    if (careStage() >= 1 && !CARE.wilted && sinceWater() > 48) { CARE.wilted = true; saveCare(); }
  }
  // Lo llama la regadera (menu.js) al terminar de regar
  function water() {
    const before = careStage(), wasWilted = CARE.wilted, today = dayKey();
    const first = !CARE.days.includes(today);
    if (first) CARE.days.push(today);
    CARE.last = Date.now(); CARE.wilted = false; saveCare();
    const st = careStage();
    if (st > before && EVO.shown < st) { setTimeout(() => celebrateStage(st), 900); return "grow"; }
    A.sprPop = 0.55; A.sprPopV = 0;
    if (wasWilted) { setTimeout(() => { fx("spark", 3); hop(-320); express("emocionado", 2.5); say(pick(TXT.careBack), 3200, true); }, 700); return "back"; }
    express("contento", 2.2); say(pick(!first ? TXT.wateredAgain : st === 0 ? TXT.seedWater : TXT.watered), 2600, true);
    return "ok";
  }
  careCheck();
  setInterval(() => {
    careCheck();
    // con sed (más de un día sin agua) lo pide, como mucho cada ~5 h
    if (careStage() >= 1 && sinceWater() > 24 && !S.sleeping && !A.hidden && !busy() && Date.now() - CARE.nag > 5 * 3600000 && Math.random() < 0.1) {
      CARE.nag = Date.now(); express(CARE.wilted ? "triste" : "esperanzado", 3); say(pick(CARE.wilted ? TXT.careLow : TXT.thirsty), 3200);
    }
  }, 60000);

  function celebrateStage(st) {
    act("evolve", { apply: () => { applyEvo(st); A.sprPop = 0; A.sprPopV = 0; fx("spark", 4); fx("heart", 1); Voice.chirp(); bump(-6); } });
    setTimeout(() => say(TXT.evolve[st - 1], 3200, true), 1400);
  }

  // ---------- Accesorios de un rato (según contexto) ----------
  // wear: se lleva puesto (cabeza/cara/cuello) · hand: en la mano derecha · two: con las dos manos delante
  const PROP_DEF = {
    headphones: { wear: "head" }, nightcap: { wear: "head" }, readglasses: { wear: "face" },
    mug: { hand: true }, camera: { two: true }, brush: { hand: true }, umbrella: { hand: true, walk: true },
    popcorn: { two: true, sit: true }, book: { two: true, glasses: true }, bowtie: { wear: "neck" },
  };
  const PROP = { cur: null, until: 0, t0: 0, cd: {}, shown: null };
  function useProp(name, secs = 120, cooldownMin = 20) {
    const d = PROP_DEF[name];
    if (!d || S.sleeping && name !== "nightcap") return false;
    if (PROP.cur === name && A.t < PROP.until) { PROP.until = Math.max(PROP.until, A.t + secs); return true; }
    if (PROP.extra === name && A.t < PROP.extraUntil) { PROP.extraUntil = Math.max(PROP.extraUntil, A.t + secs); return true; }
    if ((PROP.cd[name] || 0) > A.t && PROP.cur !== name) return false;
    if (d.wear === "head" && TALL.has(currentAcc())) return false;
    if (d.wear === "neck" && currentAcc() === "scarf") return false;
    if (currentAcc() === "ghost") return false;
    if (PROP.cur && PROP.cur !== name && PROP.until - A.t > 10 && !(PROP_DEF[PROP.cur].wear && !d.wear)) {
      // ya tiene algo en las manos: solo se pone una cosa de vestir a la vez que otra de mano
      if (PROP_DEF[PROP.cur].wear || d.wear) { PROP.extra = name; PROP.extraUntil = A.t + secs; PROP.cd[name] = A.t + secs + cooldownMin * 60; return true; }
      return false;
    }
    PROP.cur = name; PROP.t0 = A.t; PROP.until = A.t + secs; PROP.cd[name] = A.t + secs + cooldownMin * 60;
    if (d.sit && !busy()) { S.mode = "sit"; S.modeUntil = A.t + Math.min(secs, 90); }
    return true;
  }
  // De vez en cuando se pone pajarita porque sí (≈ una vez cada pocas horas de uso)
  function dressUp(force) {
    if (!force && (S.sleeping || A.hidden || PROP.cur || busy() || currentAcc() === "scarf" || currentAcc() === "ghost")) return false;
    if (!useProp("bowtie", force ? 600 : rnd(900, 1800), force ? 0 : 240)) return false;
    express("orgulloso", 2.5);
    setTimeout(() => say(pick(TXT.dapper), 3200, true), 500);
    return true;
  }
  setInterval(() => { if (Math.random() < 1 / 150) dressUp(false); }, 60000);
  function dropProp(name) { if (!name || PROP.cur === name) PROP.until = 0; if (!name || PROP.extra === name) PROP.extraUntil = 0; }
  // Qué se ve ahora mismo (se guardan las cosas de la mano al andar, volar o si lo coges)
  function propsVisible() {
    const out = new Set();
    for (const [n, until] of [[PROP.cur, PROP.until], [PROP.extra, PROP.extraUntil]]) {
      if (!n || A.t > until) continue;
      const d = PROP_DEF[n];
      const handsBusy = S.dragging || S.fly || S.airborne || (A.action && !["nod", "lookAround", "think", "wink", "yawn"].includes(A.action.name));
      if ((d.hand || d.two) && (handsBusy || (S.mode === "walk" && !d.walk) || S.sleeping)) continue;
      if (d.wear === "head" && TALL.has(currentAcc())) continue;
      out.add(n);
      if (d.glasses) out.add("readglasses");
    }
    if (PROP.cur && A.t > PROP.until) PROP.cur = null;
    if (PROP.extra && A.t > PROP.extraUntil) PROP.extra = null;
    return out;
  }
  function propPose(P, vis) {
    const t = A.t;
    // al llevarse algo a la boca gira la cara hacia la mano (la mano derecha llega a x≈-11 → giro ≈ -0.37)
    const toHand = (e) => { P.hturn += (-0.37 - A.turn - P.turn) * e; P.eyeX = -3 * e; };
    if (vis.has("popcorn")) {
      // una mano sujeta el cubo; la otra entra a por palomitas y se las lleva a la boca
      P.aL = -26; P.aR = 34; P.front = true;
      const k = (t % 4.6) / 4.6;
      if (k > 0.5 && k <= 0.66) P.aR = lerp(34, 56, Math.sin((k - 0.5) / 0.16 * Math.PI / 2));
      else if (k > 0.66 && k <= 0.86) { const e = Math.sin((k - 0.66) / 0.2 * Math.PI / 2); P.aR = lerp(56, 118, e); P.mouth = Math.max(P.mouth, 0.45 * e); toHand(e); }
      else if (k > 0.86) { const e = 1 - (k - 0.86) / 0.14; P.aR = lerp(34, 118, e); toHand(e); if (!P.eyes) P.eyes = "happy"; }
    }
    if (vis.has("book")) {
      P.aL = -24; P.aR = 24; P.front = true; P.nod += 4; P.eyeY = 3; P.eyeX = Math.sin(t * 0.9) * 3;
    }
    if (vis.has("mug")) {
      const k = (t % 6) / 6; P.aR = 62; P.front = true;
      if (k > 0.72) { const e = Math.sin((k - 0.72) / 0.28 * Math.PI); P.aR = lerp(62, 114, e); toHand(e); if (e > 0.5 && !P.eyes) P.eyes = "closed"; }
    }
    if (vis.has("camera")) {
      // cámara delante de la cara con las dos manos; un ojo cerrado y el otro mirando por el visor
      // la lleva a la altura del pecho y de vez en cuando la sube a la cara para hacer una foto
      const u = PROP.camUp || 0;
      P.aR = lerp(36, 162, u); P.aL = lerp(-36, -150, u); P.front = true;
      if (u > 0.6) { P.eyeX = -2; if (!P.eyes) P.eyes = "wink"; }
    }
    if (vis.has("brush")) {
      // quieto con el pincel; de vez en cuando da una pincelada
      const k = (t % 7) / 7; P.aR = -38; P.front = true;
      if (k > 0.86) P.aR += Math.sin((k - 0.86) / 0.14 * Math.PI) * -18;
    }
    if (vis.has("umbrella")) { P.aR = -132; P.front = true; }
    if (vis.has("headphones")) { P.nod += Math.sin(t * 7.5) * 2.2; P.tilt += Math.sin(t * 3.75) * 3; }
    if (vis.has("nightcap") && !S.sleeping && Math.sin(t * 0.4) > 0.97) P.mouth = Math.max(P.mouth, 0.5);
  }
  function renderProps(vis) {
    const key = [...vis].sort().join(",");
    if (key !== PROP.shown) {
      PROP.shown = key;
      for (const [n, list] of Object.entries(el.props)) for (const e of list) {
        const on = vis.has(n);
        if (on && e.style.display !== "inline") { e.style.display = "inline"; e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260 }); fx("spark", 1); }
        if (!on) e.style.display = "none";
      }
      stage.classList.toggle("has-readglasses", vis.has("readglasses"));
    }
  }

  // ---------- Volar ----------
  function setFlyGear(kind) {
    for (const e of el.flyEls) { if (e === el.cape) setCape(kind === "cape"); else e.style.display = e.dataset.fly === kind ? "inline" : "none"; }
  }
  function startFlight(kind) {
    if (S.sleeping || S.sulking || S.dragging || S.airborne || S.fly) return;
    kind = "cape";
    const span = world.width;
    let x1 = clamp(S.x + (Math.random() < 0.5 ? -1 : 1) * rnd(0.35, 0.7) * span, minX() + 40, maxX() - 40);
    if (Math.abs(x1 - S.x) < 250) x1 = clamp(S.x + (S.x < world.left + span / 2 ? 1 : -1) * 0.5 * span, minX() + 40, maxX() - 40);
    const h = clamp(rnd(180, 330), 120, world.height - 280);
    S.fly = { kind, t0: A.t, prep: 1.1, dur: clamp(Math.abs(x1 - S.x) / 260, 3.5, 7), x0: S.x, x1, h, dir: Math.sign(x1 - S.x) || 1 };
    S.mode = "fly"; A.action = null;
    setFlyGear(kind); fx("spark", 3); Voice.chirp();
    say(pick(TXT.fly), 2200, true);
  }
  function updateFlight(dt) {
    const f = S.fly, fy = floorY();
    const tt = A.t - f.t0;
    const base0 = f.y0 ?? fy;
    if (tt < f.prep) { S.y = base0; if (tt > f.prep - 0.35 && !f.crouched) { f.crouched = true; bump(4); } return; }
    const u = clamp((tt - f.prep) / f.dur, 0, 1);
    if (!f.launched) { f.launched = true; bump(-6); Voice.hop(); }
    const ease = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    S.x = lerp(f.x0, f.x1, ease);
    const base1 = f.y1 ?? fy;
    const k = f.y1 != null ? ease : f.y0 != null ? Math.pow(u, 1.4) : 0;
    S.y = lerp(base0, base1, k) - f.h * Math.pow(Math.sin(u * Math.PI), 0.75) - Math.sin(tt * 3) * 6 * Math.sin(u * Math.PI);
    S.facing = f.dir;
    if (u >= 1) {
      S.y = base1; S.fly = null; S.mode = "idle"; S.modeUntil = A.t + 3;
      if (f.perch) { S.perch = f.perch; S.y = groundY(); WIN.perchSince = A.t; }
      bump(7); Voice.thump(1);
      setTimeout(() => { if (!S.fly) setFlyGear(null); }, 2800);
      if (f.then) setTimeout(f.then, 350);
    }
  }

  function arrive() {
    const then = S.then;
    S.then = null;
    if (typeof then === "function") { S.mode = "idle"; S.modeUntil = A.t + 3; then(); return; }
    if (then === "peek") { S.mode = "peeking"; S.modeUntil = A.t + rnd(4, 7); S.facing = -S.peekSide; return; }
    if (then === "curious") { S.mode = "idle"; S.modeUntil = A.t + 3.5; act("curious", { dir: Math.sign(cursor.x - (S.x + W / 2)) || 1 }); return; }
    if (then === "hug") { S.mode = "idle"; S.modeUntil = A.t + 4; hop(-380); setTimeout(() => act("hug"), 450); return; }
    if (then === "climb") { climbJump(); return; }
    if (then === "hopdown") { hopDown(); return; }
    if (then === "stumble") { stumbleOff(); return; }
    if (then === "pounce") { pounce(); return; }
    S.mode = "idle"; S.modeUntil = A.t + rnd(2, 6); A.tiltTarget = 0;
  }

  // Salto con anticipación: primero se aplasta un instante y luego sale estirado
  function hop(v = -420, vx = 0, wind = 0.1) {
    if (S.dragging || S.sleeping || S.pendingHop) return;
    if (S.airborne) { S.vy = Math.min(S.vy, v * 0.6); return; }
    S.pendingHop = { v, vx, at: A.t + wind };
    bump(Math.min(5, -v / 110));
  }

  function goToSleep(talk = true) {
    if (S.sleeping) return;
    if (talk) { act("yawn"); say(pick(TXT.sleep), 2400, true); }
    setTimeout(() => { S.sleeping = true; S.mode = "sit"; setMood("sleep"); }, talk ? 1200 : 0);
  }
  function wakeUp(talk = true) {
    if (!S.sleeping) return;
    S.sleeping = false;
    setMood("normal");
    S.mode = "idle"; S.modeUntil = A.t + 3;
    bump(-2.5);
    act("stretch");
    if (talk) setTimeout(() => say(pick(TXT.wake), 2400, true), 900);
  }
  function missYou() {
    if (S.sleeping) wakeUp(false);
    S.mode = "walk"; S.speed = 150; S.targetX = clamp(centerX(), minX() + 40, maxX() - 40);
    S.then = "hug"; S.modeUntil = A.t + 20;
    setTimeout(() => say(pick(TXT.missed), 3000, true), 300);
  }
  function sulk(minutes = 2) {
    if (S.sleeping || S.sulking) return;
    S.sulking = true; S.mode = "sit"; S.modeUntil = A.t + minutes * 60;
    Voice.sigh();
    say(pick(TXT.sulk), 2000, true);
  }
  function endSulk(forgiven) {
    S.sulking = false; S.mode = "idle"; S.modeUntil = A.t + 3;
    if (forgiven) { setMood("happy", 2.5); blush(); fx("heart", 3); say(pick(TXT.forgiven), 2400, true); }
  }

  // Ganchos para módulos de travesuras (antics.js): pose, lógica y dibujo extra en cada fotograma
  const HOOKS = { pose: [], tick: [], draw: [] };

  // ---------- Física y lógica ----------
  function update(dt) {
    A.t += dt;
    for (const f of HOOKS.tick) f(dt);
    let fy = groundY();
    S.prevX = S.x; S.prevY = S.y;
    if (S.pendingHop && A.t >= S.pendingHop.at && !S.dragging) {
      S.airborne = true; S.vy = S.pendingHop.v; S.vx = S.pendingHop.vx || 0; S.pendingHop = null;
      bump(-7); Voice.hop();
    }

    if (S.dragging) {
      A.kick += dt * 18;
    } else if (S.fly) {
      updateFlight(dt);
    } else if (S.airborne) {
      S.vy += 2300 * dt;
      S.y += S.vy * dt;
      S.x += S.vx * dt;
      S.vx *= Math.pow(0.4, dt);
      // ¿Cae encima de la ventana activa? Entonces se queda ahí
      const wc = WIN.cur;
      if (!S.perch && S.vy > 0 && perchRoom(wc)) {
        const top = wc.y - H + PERCH_SINK, cx = S.x + W / 2;
        if (S.prevY <= top + 2 && S.y >= top && cx > wc.x + 30 && cx < wc.x + wc.w - 30) { S.perch = wc; fy = groundY(); WIN.perchSince = A.t; }
      }
      if (S.x < minX()) { A.sqxV += Math.min(9, Math.abs(S.vx) / 160); S.x = minX(); S.vx = Math.abs(S.vx) * 0.4; if (Math.abs(S.vx) > 120) Voice.thump(0.6); }
      if (S.x > maxX()) { A.sqxV += Math.min(9, Math.abs(S.vx) / 160); S.x = maxX(); S.vx = -Math.abs(S.vx) * 0.4; if (Math.abs(S.vx) > 120) Voice.thump(0.6); }
      if (S.y >= fy) {
        S.y = fy;
        const impact = S.vy;
        A.splat = Math.max(A.splat, Math.min(1, impact / 1400));
        if (impact > 420) {
          bump(Math.min(13, impact / 190));
          Voice.thump(Math.min(1.5, impact / 900));
          S.vy = -impact * 0.28;
          if (impact > 1350 && !(A.action && A.action.name === "dizzy")) {
            act("dizzy");
            setTimeout(() => say(pick(TXT.dizzy), 2400), 700);
          }
        } else {
          S.vy = 0; S.vx = 0; S.airborne = false;
          bump(Math.min(5, impact / 170));
          if (S.mode !== "walk") { S.mode = "idle"; S.modeUntil = Math.max(S.modeUntil, A.t + rnd(1.5, 3)); }
        }
      }
    } else {
      if (S.perch) {
        // la ventana se ha movido: Eko la sigue con suavidad (los datos llegan a saltos)
        const y0 = S.y;
        S.y += (fy - S.y) * Math.min(1, dt * 22);
        const mv = WIN.pendDx * Math.min(1, dt * 18); S.x += mv; WIN.pendDx -= mv;
        // Movimiento de la plataforma → aceleración que sienten sus pies
        const pvx = mv / dt, pvy = (S.y - y0) / dt;
        const sm = (WIN.stepDx || 0) * Math.min(1, dt * 20); S.x += sm; WIN.stepDx -= sm;
        const pax = (pvx - (WIN.pvx || 0)) / dt, pay = (pvy - (WIN.pvy || 0)) / dt;
        WIN.pvx = pvx; WIN.pvy = pvy;
        WIN.pax = (WIN.pax || 0) + (pax - (WIN.pax || 0)) * Math.min(1, dt * 10);
        WIN.pay = (WIN.pay || 0) + (pay - (WIN.pay || 0)) * Math.min(1, dt * 10);
        // subir de golpe le aplasta (pesa más), bajar de golpe le estira
        A.squashV += clamp(-WIN.pay * 0.006, -14, 14) * dt;
        if (S.x < S.perch.x + 20 - W / 2 || S.x > S.perch.x + S.perch.w - 20 - W / 2) fallOff(false);
      } else S.y = fy;
      if (A.t > S.modeUntil) {
        if (S.sulking) endSulk(false);
        else if (S.mode === "peeking") { S.mode = "walk"; S.targetX = clamp(S.x - S.peekSide * rnd(200, 400), minX() + 40, maxX() - 40); S.modeUntil = A.t + 30; }
        else decide();
      }
      if (S.mode === "walk") {
        const d = S.targetX - S.x;
        if (Math.abs(d) < 2) arrive();
        else {
          S.facing = Math.sign(d);
          const ready = clamp((A.turn * S.facing - 0.35) / 0.4, 0, 1);
          const v = Math.min(S.speed, Math.abs(d) * 4 + 10);
          S.x += S.facing * v * ready * dt;
          A.walkPhase += dt * (S.speed > 100 ? 16 : 8.5) * ready;
          A.tiltTarget = S.facing * (S.speed > 100 ? 6 : 3);
        }
      }
    }

    if (A.moodUntil && A.t > A.moodUntil) setMood(S.sleeping ? "sleep" : "normal");
    if (A.action && A.t - A.action.t0 > A.action.dur) A.action = null;

    // Hablar: pequeños rebotes y sílabas mientras sale el bocadillo
    if (A.t < A.talkUntil && A.t >= A.nextSyl && !S.sleeping) {
      A.nextSyl = A.t + rnd(0.11, 0.18);
      bump(-1.1);
      Voice.syllable();
    }

    // Muelles: aplastar/estirar y cabeza con inercia
    const k = 170, damp = 10;
    A.squashV += (-k * A.squash - damp * A.squashV) * dt;
    A.squash += A.squashV * dt;
    A.appear += ((A.hidden ? 0 : 1) - A.appear) * Math.min(1, dt * 7);
    const velX = (S.x - S.prevX) / Math.max(dt, 1e-3);
    const velY = (S.y - S.prevY) / Math.max(dt, 1e-3);
    const pvx = A.vx, pvy = A.vy;
    A.vx += (velX - A.vx) * Math.min(1, dt * 18);
    A.vy += (velY - A.vy) * Math.min(1, dt * 18);
    A.ax += (((A.vx - pvx) / Math.max(dt, 1e-3)) - A.ax) * Math.min(1, dt * 10);
    A.ay += (((A.vy - pvy) / Math.max(dt, 1e-3)) - A.ay) * Math.min(1, dt * 10);
    // Cabeza: se queda atrás al moverse (horizontal) y se hunde y rebota al frenar en vertical
    const lagTarget = clamp(-velX * 0.012, -8, 8);
    A.lagV += ((lagTarget - A.lag) * 120 - A.lagV * 9) * dt;
    A.lag += A.lagV * dt;
    A.hyV += (-A.hy * 220 - A.hyV * 11 + clamp(-A.ay * 0.004, -60, 60)) * dt;
    A.hy = clamp(A.hy + A.hyV * dt, -10, 12);
    // Aplastado lateral (choques con los bordes) y "splat" del aterrizaje
    A.sqxV += (-A.sqx * 170 - A.sqxV * 10) * dt;
    A.sqx += A.sqxV * dt;
    A.splat *= Math.pow(0.02, dt);
    // Piernas colgando como péndulo cuando está en el aire
    const legTarget = S.airborne || S.dragging || (S.fly && A.t - S.fly.t0 > S.fly.prep) ? clamp(-A.vx * 0.02, -35, 35) : 0;
    A.legSwingV += ((legTarget - A.legSwing) * 60 - A.legSwingV * 6) * dt;
    A.legSwing += A.legSwingV * dt;
    stepCape(dt);
    // Brote: muelle que se queda atrás al moverse y "pop" al crecer
    const sprT = clamp(-A.ax * 0.012, -30, 30) + clamp(-A.vx * 0.035, -18, 18) + clamp(A.hyV * 0.08, -12, 12) + Math.sin(A.t * 1.4) * 2.5;
    A.sprV = (A.sprV || 0) + ((sprT - (A.spr || 0)) * 90 - (A.sprV || 0) * 7) * dt;
    A.spr = (A.spr || 0) + A.sprV * dt;
    A.sprPopV = (A.sprPopV || 0) + ((1 - (A.sprPop ?? 1)) * 220 - (A.sprPopV || 0) * 9) * dt;
    A.sprPop = (A.sprPop ?? 1) + A.sprPopV * dt;
    // Mareo: se va pasando poco a poco (más rápido en el suelo)
    A.dizzy = Math.max(0, (A.dizzy || 0) - dt * (S.dragging ? 0.12 : 0.3));
    if (S.dragging && !DRAG.heldSaid && A.t - DRAG.t0 > 5 && A.dizzy < 0.3 && Math.hypot(S.vx, S.vy) < 200) { DRAG.heldSaid = true; if (Math.random() < 0.7) say(pickNew(TXT.held), 2600, true); }
    if (DRAG.dizzyLanding && !S.airborne && !S.dragging) {
      const lvl = DRAG.dizzyLanding; DRAG.dizzyLanding = 0;
      act("dizzy", { dur: 2.2 + lvl * 0.8 }); fx("spark", 3);
      A.woozyUntil = A.t + 3 + lvl * 2.5; A.woozyLen = 3 + lvl * 2.5;
      S.mode = lvl > 1.8 ? "sit" : "idle"; S.modeUntil = A.t + 3 + lvl * 2.5; S.then = null;
      setTimeout(() => say(pickNew(TXT.dizzy), 2800, true), 900);
      setTimeout(() => express("confundido", 3), (2.2 + lvl * 0.8) * 1000);
    }
    // Equilibrio: péndulo con los pies como pivote. La aceleración de la ventana le hace inclinarse al lado contrario
    // y él se recupera con un muelle amortiguado (varias oscilaciones). Si se pasa, da un pasito; si se pasa mucho, se cae.
    const onTop = S.perch && !S.airborne && !S.dragging;
    const balF = onTop ? clamp(-(WIN.pax || 0) * 0.36, -1400, 1400) : 0;
    A.balV = (A.balV || 0) + (balF - (A.bal || 0) * 50 - (A.balV || 0) * 4.2) * dt;
    A.bal = clamp((A.bal || 0) + A.balV * dt, -50, 50);
    if (onTop && Math.abs(A.bal) > 17 && A.t > (WIN.stepAt || 0)) {
      const sd = Math.sign(A.bal), st = sd * 24;
      WIN.stepDx = (WIN.stepDx || 0) + st; WIN.stepAt = A.t + 0.32; WIN.stepSide = sd; WIN.stepUntil = A.t + 0.22;
      A.bal *= 0.6; A.balV *= 0.45; bump(-2);
      if (Math.abs(A.bal) > 22 && cool("wobbleTalk", 60)) talk(TXT.ride, 0.4);
    }
    if (onTop && Math.abs(A.bal) > 40) {
      const sd = Math.sign(A.bal);
      fallOff(true); S.vx = (WIN.pvx || 0) * 0.6 + sd * 160; A.bal = 0; A.balV = 0;
    }
    if (!onTop) { WIN.pax = 0; WIN.pay = 0; WIN.pvx = 0; WIN.pvy = 0; }
    // la flor se cierra al dormir y se abre al despertar
    A.bloom = (A.bloom ?? 1) + ((S.sleeping ? 0.1 : 1) - (A.bloom ?? 1)) * Math.min(1, dt * 0.8);

    // Sentarse
    const sitGoal = (S.mode === "sit" || S.sleeping || S.sulking) && !S.airborne && !S.dragging ? 1 : 0;
    A.sit += (sitGoal - A.sit) * Math.min(1, dt * 5);

    // Inclinación, mirada y giro
    const tiltGoal = S.sleeping ? 11 : (A.dance || A.t < A.danceUntil) && S.mode !== "walk" && !S.airborne ? Math.sin(A.t * 3.2) * 7 : S.mode === "peeking" ? -S.peekSide * 14 : A.tiltTarget;
    A.tilt += (tiltGoal - A.tilt) * Math.min(1, dt * 5);

    const cx = S.x + W / 2, cy = S.y + H - 95;
    const dx = cursor.x - cx, dy = cursor.y - cy, dist = Math.hypot(dx, dy) || 1;
    const recent = A.t - cursor.lastMove < 4 && (!window.EkoSettings || window.EkoSettings.get().follow);
    if (S.dragging) { A.eyeTX = 0; A.eyeTY = -2; }
    else if (S.mode === "peeking") { A.eyeTX = -S.peekSide * 5; A.eyeTY = 0; }
    else if (dist < 1400 && recent) { A.eyeTX = (dx / dist) * 8; A.eyeTY = (dy / dist) * 9; }
    else { A.eyeTX = S.mode === "walk" ? S.facing * 2 : 0; A.eyeTY = 0; }
    A.eyeX += (A.eyeTX - A.eyeX) * Math.min(1, dt * 10);
    A.eyeY += (A.eyeTY - A.eyeY) * Math.min(1, dt * 10);

    let turnGoal = 0;
    if (S.mode === "walk" && !S.airborne && !S.dragging) turnGoal = S.facing * 0.85;
    else if (S.mode === "peeking") turnGoal = -S.peekSide * 0.5;
    else if (S.fly) turnGoal = S.fly.dir * 0.75;
    else if (!S.dragging && !S.sleeping && !S.sulking && dist < 1400 && recent) turnGoal = clamp(dx / 600, -0.5, 0.5);
    const gazeGoal = !S.dragging && !S.sleeping && !S.sulking && !S.fly && dist < 1400 && recent ? clamp(dy / 260, -1, 1) * 10 : 0;
    A.gNod += (gazeGoal - A.gNod) * Math.min(1, dt * 4);
    A.turn += (turnGoal - A.turn) * Math.min(1, dt * 5);

    if (A.t > A.nextBlink) { A.blinkEnd = A.t + 0.13; A.nextBlink = A.t + (Math.random() < 0.2 ? 0.25 : rnd(2, 6)); }
    A.blink = A.t < A.blinkEnd ? 0.1 : 1;

    if ((A.dance || A.t < A.danceUntil) && !S.sleeping) {
      const q = Math.floor(A.t * 1.9 / 4);
      if (q !== A.lastNote) { A.lastNote = q; fx("note"); }
    }

    const moving = !!S.fly || S.airborne || S.dragging || S.mode === "walk";
    if (moving !== A.moving) { A.moving = moving; stage.classList.toggle("moving", moving); }

    computePose(dt);
  }

  // ---------- Baile: coreografía a ~114 ppm, cambia de paso cada 8 tiempos ----------
  function dancePose(P) {
    const b = A.t * 1.9, bi = Math.floor(b), ph = b - bi;
    const phrase = Math.floor(bi / 8) % 4, pb = bi % 8;
    const beat = Math.sin(ph * Math.PI);
    const side = bi % 2 ? 1 : -1;
    P.bob = beat * 5;
    if (phrase === 0) {            // balanceo de lado a lado
      P.sway += side * 7 * beat; P.shift += side * 7 * beat; P.tilt += side * 8 * beat;
      P.aL = 45 + side * 28 * beat; P.aR = -45 + side * 28 * beat;
      if (side > 0) P.legR = -6 * beat; else P.legL = -6 * beat;
    } else if (phrase === 1) {     // brazos arriba
      P.aL = 112 + beat * 18; P.aR = -112 - beat * 18; P.front = true;
      P.eyes = "happy"; P.sy *= 1 + 0.05 * beat; P.legL = -4 * beat; P.legR = -4 * beat;
    } else if (phrase === 2) {     // pasos laterales girando
      const sw = Math.sin(b * Math.PI / 2);
      P.turn += sw * 0.6; P.shift += sw * 10; P.hturn += sw * 0.15;
      P.aL = 20 + Math.max(0, sw) * 70; P.aR = -20 - Math.max(0, -sw) * 70;
      if (sw > 0) P.legL = -6 * beat; else P.legR = -6 * beat;
    } else if (pb < 4) {           // vuelta
      P.turn += Math.sin((b % 4) / 4 * Math.PI * 2);
      P.aL = 60; P.aR = -60; P.eyes = "happy";
    } else if (pb < 6) {           // saltito con brazos arriba
      P.lift += beat * 14; P.aL = 120; P.aR = -120; P.front = true; P.eyes = "happy";
    } else {                       // pose final con guiño
      P.aR = -112; P.aL = 22; P.front = true; P.eyes = "wink"; P.tilt += 10;
    }
  }

  function flyPose(P) {
    const f = S.fly, d = f.dir, tt = A.t - f.t0;
    if (tt < f.prep) {             // se prepara: se agacha y mira arriba
      const c = clamp(tt / f.prep, 0, 1);
      P.sy *= 1 - 0.08 * c; P.sx *= 1 + 0.05 * c; P.eyeY = -4 * c; P.brows = "angry";
      P.aL = lerp(P.aL, 30, c); P.aR = lerp(P.aR, -30, c);
      return;
    }
    P.brows = "angry";
    // pose de superhéroe: un brazo adelante, el cuerpo inclinado en la dirección del vuelo
    P.sway += d * 22;
    if (d > 0) { P.aR = -118; P.aL = 28; } else { P.aL = 118; P.aR = -28; }
    P.front = true; P.legL = -4; P.legR = 2; P.eyeX = 5 * d;
  }

  // ---------- Pose ----------
  function computePose(dt) {
    const walking = S.mode === "walk" && !S.airborne && !S.dragging;
    const dancing = (A.dance || A.t < A.danceUntil) && !walking && !S.airborne && !S.dragging && !S.sleeping;
    const P = {
      aL: 0, aR: 0, front: false, nod: 0, tilt: 0, turn: 0, hturn: 0, sway: 0, shift: 0, sx: 1, sy: 1, lift: 0,
      legL: 0, legR: 0, bob: 0, box: null, spin: 0, snack: 0,
      mouth: 0, mouthShape: null, eyeX: null, eyeY: null, eyeScale: S.dragging ? 1.25 : 1, eyes: null, brows: "none",
    };
    const at = Math.abs(A.turn);
    if (walking) {
      // Brazos contrarios a las piernas y hacia delante en la dirección en la que anda
      const tw = clamp(A.turn, -1, 1), run = S.speed > 100 ? 1.6 : 1;
      P.aL = -Math.sin(A.walkPhase) * 22 * tw * run;
      P.aR = -Math.sin(A.walkPhase + Math.PI) * 22 * tw * run;
    } else if (S.dragging) {
      // Cuelga de donde lo coges: los brazos se agitan y todo el cuerpo se estira en la dirección del tirón
      P.aL = 70 + Math.sin(A.kick * 0.7) * 12; P.aR = -70 - Math.sin(A.kick * 0.7) * 12;
      const sp = Math.min(1, Math.hypot(A.vx, A.vy) / 1500);
      P.sy = 1.08 + 0.08 * sp; P.sx = 0.94 - 0.05 * sp; P.sway = clamp(S.vx * 0.012, -22, 22);
    } else if (S.airborne) {
      // En el aire: brazos arriba al caer, pegados al subir
      const fall = clamp(A.vy / 900, -1, 1);
      P.aL = 30 + 45 * Math.max(0, fall); P.aR = -P.aL;
    } else if (dancing) {
      dancePose(P);
    } else {
      P.aL = Math.sin(A.t * 2.2) * 2; P.aR = -P.aL;
    }

    // Rasgo "activo": de vez en cuando da saltitos de energía en el sitio
    if (A.energy > 0.3 && S.mode === "idle" && !A.action && !S.airborne && !S.dragging && Math.sin(A.t * 0.9) > 0.8) P.lift += Math.max(0, Math.sin(A.t * 9)) * 4 * A.energy;
    if (shownAcc === "ghost") { P.lift += 9 + Math.sin(A.t * 2.2) * 5; P.sway += Math.sin(A.t * 1.6) * 4; }
    P.nod += A.gNod;
    if (S.fly) flyPose(P);
    // Zarandeado: ojos en espiral y brazos sueltos; después, un rato tambaleándose
    if (S.dragging && A.dizzy > 0.5) { P.eyes = "spiral"; P.aL += Math.sin(A.t * 17) * 25; P.aR += Math.sin(A.t * 17 + 2) * 25; }
    if (A.woozyUntil > A.t) {
      const k = clamp((A.woozyUntil - A.t) / (A.woozyLen || 3), 0, 1);
      P.sway += Math.sin(A.t * 2.6) * 8 * k; P.tilt += Math.sin(A.t * 3.4 + 1) * 10 * k; P.shift += Math.sin(A.t * 1.9) * 4 * k;
      if (!P.eyes && k > 0.45) P.eyes = "spiral";
    }
    // Haciendo equilibrio: se inclina desde los pies, la cabeza compensa, brazos en cruz y molinillo si va muy justo
    const bal = A.bal || 0, abal = Math.abs(bal);
    if (abal > 0.5 && !S.airborne && !S.dragging) {
      const e = clamp((abal - 1.5) / 9, 0, 1), wm = clamp((abal - 10) / 14, 0, 1);
      P.sway += bal; P.tilt -= bal * 0.45;
      if (!A.action) {
        P.aL = lerp(P.aL, 82 + Math.sin(A.t * 15) * 40 * wm, e); P.aR = lerp(P.aR, -82 + Math.sin(A.t * 15 + 1.2) * 40 * wm, e);
        P.eyeScale = (P.eyeScale || 1) * (1 + 0.22 * wm);
        if (S.mode !== "walk") { if (bal > 0) P.legL = (P.legL || 0) - clamp(bal - 5, 0, 12) * 0.8; else P.legR = (P.legR || 0) - clamp(-bal - 5, 0, 12) * 0.8; }
      }
    }
    if (A.t < (WIN.stepUntil || 0) && S.mode !== "walk") { const k = WIN.stepSide > 0 ? "legR" : "legL"; P[k] = (P[k] || 0) - 7 * Math.sin((WIN.stepUntil - A.t) / 0.22 * Math.PI); }
    for (const f of HOOKS.pose) f(P, A.t);
    const propVis = propsVisible();
    if (propVis.size) propPose(P, propVis);
    A.propVis = propVis;
    // Al acecho del ratón: agachado, ojos entornados, brazos preparados
    if (S.sneak && S.mode === "walk" && !A.action) { P.sy *= 0.9; P.sx *= 1.05; if (!P.eyes) P.eyes = "squint"; P.tilt += 5 * S.facing; P.aL = lerp(P.aL, 34, 0.7); P.aR = lerp(P.aR, -34, 0.7); }
    // Abalanzándose: brazos arriba hacia delante
    if (A.pounceUntil > A.t && !A.action) { P.aL = 128; P.aR = -128; P.front = true; }
    if (A.menuPose && !A.action && !S.fly && !S.dragging && !S.airborne) {
      P.aR = 104 + Math.sin(A.t * 9) * 4; P.front = true; P.tilt -= 8;
    }
    const a = A.action;
    if (a) {
      const def = ACTIONS[a.name];
      const k = clamp((A.t - a.t0) / a.dur, 0, 1);
      def.f(P, k, env(k), a.opts);
      if (def.eyes && !P.eyes) P.eyes = def.eyes;
      if (def.brows && P.brows === "none") P.brows = def.brows;
    }

    // Expresión activa: completa lo que el gesto actual no haya decidido
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
    let eyes = P.eyes;
    if (!eyes) {
      if (S.sulking) eyes = "hidden";
      else if (A.mood === "sleep") eyes = "closed";
      else if (A.mood === "happy") eyes = "happy";
      else eyes = "open";
    }
    if (S.sulking && P.brows === "none") P.brows = "sad";
    setFace(eyes, P.brows, P.mouth > 0.12 ? "none" : (P.mouthShape || "none"));

    // Brazos de plastilina: muelle con un pelín de rebote y que se quedan atrás al acelerar
    const inertia = clamp(A.ax * 0.006, -28, 28) + clamp(-A.ay * 0.003, -20, 20) * 0;
    const tL = P.aL + inertia, tR = P.aR + inertia;
    A.aLv += ((tL - A.pose.aL) * 260 - A.aLv * 20) * dt;
    A.aRv += ((tR - A.pose.aR) * 260 - A.aRv * 20) * dt;
    A.pose.aL += A.aLv * dt;
    A.pose.aR += A.aRv * dt;
    A.pose.P = P;
  }

  // ---------- Dibujo ----------
  function render() {
    const P = A.pose.P;
    if (!P) return;
    const walking = S.mode === "walk" && !S.airborne && !S.dragging;
    const dancing = (A.dance || A.t < A.danceUntil) && !walking && !S.airborne && !S.dragging && !S.sleeping;
    const breathe = Math.sin(A.t * (S.sleeping ? 1.3 : 2.2)) * (S.sleeping ? 0.022 : 0.012);
    // Paso: abajo y aplastado cuando el pie toca el suelo, arriba y estirado al pasar la pierna
    const contact = walking ? Math.abs(Math.sin(A.walkPhase)) : 0;
    const bob = walking ? -(1 - contact) * 5 : dancing ? -P.bob : 0;
    const shiver = A.hot && !S.sleeping ? Math.sin(A.t * 55) * 0.9 : 0;
    const sq = clamp(A.squash * 0.075, -0.32, 0.42);
    // En caída rápida se estira en vertical
    const fallStretch = S.airborne && !S.fly ? clamp(Math.abs(A.vy) / 3200, 0, 0.16) : 0;
    let sy = (1 - sq + breathe - contact * 0.04 + fallStretch) * P.sy;
    // Volumen constante (plastilina): si se aplasta en vertical, se ensancha en horizontal y viceversa
    let sx = Math.pow(Math.max(0.5, sy / P.sy), -0.65) * P.sx;
    const sqx = clamp(A.sqx * 0.06, -0.3, 0.3);
    sx *= 1 - sqx; sy *= 1 + sqx * 0.6;
    sx *= A.appear; sy *= A.appear;

    const t = clamp(A.turn + P.turn, -1, 1), at = Math.abs(t);
    const th = clamp(t + P.hturn, -1, 1), ath = Math.abs(th);
    const lean = (walking ? t * (S.speed > 100 ? 9 : 5) : 0) + P.sway;
    el.pet.setAttribute("transform", `translate(${(shiver + P.shift).toFixed(2)} ${(bob - P.lift).toFixed(2)}) rotate(${P.spin.toFixed(1)} 0 80) rotate(${lean.toFixed(2)} 0 176) translate(0 176) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(0 -176)`);

    const lift = clamp((groundY() - S.y) / 300, 0, 1);
    const sh = (1 - lift * 0.7) * A.appear;
    el.shadow.setAttribute("transform", `translate(0 ${groundY() - S.y}) translate(0 176) scale(${sh} ${sh}) translate(0 -176)`);
    el.shadow.style.opacity = String(0.28 * (1 - lift * 0.6));

    // Piernas: pivotan en la cadera hacia donde camina; la que avanza se levanta
    let lL = 0, lR = 0, rL = 0, rR = 0;
    if (walking) {
      const run = S.speed > 100 ? 1.5 : 1;
      const phL = A.walkPhase, phR = A.walkPhase + Math.PI;
      rL = -Math.sin(phL) * 24 * t * run; rR = -Math.sin(phR) * 24 * t * run;
      lL = -Math.max(0, Math.cos(phL)) * 7 * run; lR = -Math.max(0, Math.cos(phR)) * 7 * run;
    } else if (S.dragging) { lL = Math.sin(A.kick) * 8; lR = Math.sin(A.kick + Math.PI) * 8; rL = rR = A.legSwing; }
    else { lL = P.legL; lR = P.legR; rL = rR = A.legSwing; }
    // Al aterrizar fuerte, los pies se abren un momento ("splat")
    const spread = A.splat * 9;
    const xL = 10 * at - spread, xR = -10 * at + spread;
    const sitDrop = 29 * A.sit;
    el.legs.setAttribute("transform", `translate(0 176) scale(1 ${(1 - 0.5 * A.sit).toFixed(3)}) translate(0 -176)`);
    el.legL.setAttribute("transform", `translate(${xL.toFixed(2)} ${lL.toFixed(2)}) rotate(${rL.toFixed(2)} -21 122)`);
    el.legR.setAttribute("transform", `translate(${xR.toFixed(2)} ${lR.toFixed(2)}) rotate(${rR.toFixed(2)} 21 122)`);
    // Profundidad: la pierna y el brazo del lado lejano, detrás y algo más oscuros
    const farLeft = t < -0.15, farRight = t > 0.15;   // al mirar a la derecha, el lado lejano es el derecho de la pantalla (su brazo izquierdo)
    if (farLeft !== A.farLeft || farRight !== A.farRight) {
      A.farLeft = farLeft; A.farRight = farRight;
      if (farLeft) el.legs.appendChild(el.legR); else el.legs.appendChild(el.legL);
      el.legL.style.filter = farLeft ? "brightness(.9)" : "";
      el.legR.style.filter = farRight ? "brightness(.9)" : "";
      el.armL.style.filter = farLeft ? "brightness(.9)" : "";
      el.armR.style.filter = farRight ? "brightness(.9)" : "";
    }
    el.upper.setAttribute("transform", `translate(0 ${sitDrop.toFixed(2)})`);

    // Orden de brazos: de frente, detrás del cuerpo; de lado, el brazo cercano por delante y el lejano por detrás
    const armKey = P.front ? "front" : farLeft ? "R" : farRight ? "L" : "back";
    if (armKey !== A.armsFront) {
      A.armsFront = armKey;
      el.pet.insertBefore(el.armL, el.upper); el.pet.insertBefore(el.armR, el.upper);
      if (armKey === "front") { el.pet.appendChild(el.armL); el.pet.appendChild(el.armR); }
      else if (armKey === "R") el.upper.after(el.armR);
      else if (armKey === "L") el.upper.after(el.armL);
      el.pet.appendChild(el.propFront); el.pet.appendChild(el.propHand); el.pet.appendChild(el.antic);
    }
    const dxL = t > 0 ? 16 * t : -22 * t;
    const dxR = t > 0 ? -22 * t : 16 * t;
    el.armL.setAttribute("transform", `translate(${dxL.toFixed(2)} ${sitDrop.toFixed(2)}) rotate(${A.pose.aL.toFixed(2)} -50 58)`);
    el.armR.setAttribute("transform", `translate(${dxR.toFixed(2)} ${sitDrop.toFixed(2)}) rotate(${A.pose.aR.toFixed(2)} 50 58)`);
    for (const f of HOOKS.draw) f();
    if (A.propVis) {
      renderProps(A.propVis);
      if (A.propVis.size) {
        // la mano derecha: punta del brazo girada con él; el objeto se mantiene derecho
        const r = A.pose.aR * Math.PI / 180, hx = dxR + 50 + 15 * Math.cos(r) - 60 * Math.sin(r), hy = sitDrop + 58 + 15 * Math.sin(r) + 60 * Math.cos(r);
        el.propHand.setAttribute("transform", `translate(${hx.toFixed(1)} ${hy.toFixed(1)})`);
        el.propFront.setAttribute("transform", `translate(0 ${sitDrop.toFixed(1)})`);
        if (A.propVis.has("camera")) {
          // ciclo de 10 s: 6 s con la cámara en el pecho, sube, ¡clic! y baja
          const k = ((A.t - PROP.t0) % 10) / 10;
          const up = k < 0.55 ? 0 : k < 0.65 ? (k - 0.55) / 0.1 : k < 0.88 ? 1 : 1 - (k - 0.88) / 0.12;
          PROP.camUp = up * up * (3 - 2 * up);
          const shot = k > 0.74 && k < 0.8 ? 1 - (k - 0.74) / 0.06 : 0;
          el.flash.setAttribute("opacity", shot.toFixed(2));
          el.flash.setAttribute("transform", `translate(38 -4) scale(${(0.6 + (1 - shot) * 0.6).toFixed(2)}) translate(-38 4)`);
          const cu = PROP.camUp, cx = lerp(-14, 0, cu), cy = lerp(82, 0, cu), sc = lerp(0.72, 1, cu);
          el.props.camera[0].setAttribute("transform", `translate(${cx.toFixed(1)} ${(cy - (shot > 0.8 ? 2 : 0)).toFixed(1)}) scale(${sc.toFixed(3)})`);
          if (shot > 0.9 && !PROP.flashed) { PROP.flashed = true; bump(-1.5); } else if (shot === 0) PROP.flashed = false;
        }
      }
    }
    el.body.setAttribute("transform", `translate(${(3 * t).toFixed(2)} 0) scale(${(1 - 0.12 * at).toFixed(4)} 1)`);
    el.bodyHl.setAttribute("transform", `translate(${(4 * t).toFixed(2)} 0)`);
    // Los complementos del cuerpo siguen al cuerpo; el cuello del vampiro y la capa, también a la cabeza y al sentarse
    const bodyT = `translate(${(3 * t).toFixed(2)} 0) scale(${(1 - 0.12 * at).toFixed(4)} 1)`;
    el.accBody.setAttribute("transform", bodyT);

    const headDrop = (S.sleeping ? 4 : 0) + P.nod + A.hy;
    el.accBack.setAttribute("transform", `translate(${(2 * th + A.lag * 0.6).toFixed(2)} ${(sitDrop + Math.min(0, headDrop) * 0.3).toFixed(2)}) scale(${(1 - 0.1 * at).toFixed(4)} 1)`);
    el.head.setAttribute("transform", `translate(${(4 * th + A.lag).toFixed(2)} ${headDrop.toFixed(2)}) rotate(${(A.tilt + P.tilt).toFixed(2)} 0 40) scale(${(1 - 0.05 * ath).toFixed(4)} 1)`);
    el.hl.setAttribute("transform", `translate(${(5 * th).toFixed(2)} ${(P.nod * 0.5).toFixed(2)})`);
    el.hat.setAttribute("transform", `translate(${(10 * th).toFixed(2)} 0)`);
    // Gorros con punta: la punta y el pompón quedan detrás, al lado contrario de hacia donde va Eko (se dan la vuelta con suavidad)
    A.capS = A.capS ?? 1;
    A.capS += ((S.facing > 0 ? -1 : 1) - A.capS) * 0.16;
    const capT = `scale(${(Math.abs(A.capS) < 0.04 ? 0.04 * Math.sign(A.capS || 1) : A.capS).toFixed(3)} 1)`;
    for (const g of el.tipHats) g.setAttribute("transform", capT);

    const ex = P.eyeX != null ? P.eyeX : A.eyeX;
    const ey = (P.eyeY != null ? P.eyeY : A.eyeY) + P.nod * 0.9;
    el.eyes.setAttribute("transform", `translate(${ex.toFixed(2)} ${ey.toFixed(2)})`);
    if (A.sprStage && el.sprout.style.display !== "none") {
      EkoArt.pose(el.sprout, { stage: A.sprStage, pop: A.sprPop ?? 1, sway: A.spr || 0, swayV: A.sprV || 0, bloom: A.bloom ?? 1, wilt: (A.wilt = (A.wilt ?? (CARE.wilted ? 1 : 0)) + ((CARE.wilted ? 1 : 0) - (A.wilt ?? 0)) * 0.03), season: EVO.season || EkoArt.seasonOf(), t: A.t });
    }
    const pos = [];
    el.eyeEls.forEach((e, i) => {
      const base = i === 0 ? -32 : 32;
      const far = Math.sign(base) !== Math.sign(th) && ath > 0.01;
      const x = base * (1 - 0.3 * ath) + th * 24;
      const esx = far ? 1 - 0.3 * ath : 1 - 0.04 * ath;
      pos.push([x, esx]);
      e.setAttribute("transform", `translate(${x.toFixed(2)} 20) scale(${esx.toFixed(3)} 1)`);
    });
    el.bridge.setAttribute("x1", (pos[0][0] + 12 * pos[0][1]).toFixed(2));
    el.bridge.setAttribute("x2", (pos[1][0] - 12 * pos[1][1]).toFixed(2));
    const es = P.eyeScale;
    for (const o of el.opens) o.setAttribute("transform", `scale(${es} ${A.blink * es})`);

    el.mouth.setAttribute("cx", (th * 30 + ex * 0.6).toFixed(2));
    el.mouth.setAttribute("cy", (40 + ey * 0.6).toFixed(2));
    el.mouthShapes.setAttribute("transform", `translate(${(th * 30 + ex * 0.6).toFixed(2)} ${(40 + ey * 0.6).toFixed(2)}) scale(${(1 - 0.3 * ath).toFixed(3)} 1)`);
    el.accFace.setAttribute("transform", `translate(${(th * 30 + ex * 0.6).toFixed(2)} ${(ey * 0.6).toFixed(2)}) scale(${(1 - 0.3 * ath).toFixed(3)} 1)`);
    if (shownAcc === "ghost") {
      el.ghostSheet.setAttribute("d", ghostPath(walking || S.fly ? t : 0));
      el.accFront.setAttribute("transform", `translate(0 ${(sitDrop * 0.4).toFixed(2)}) rotate(${((A.tilt + P.tilt) * 0.4).toFixed(2)} 0 40)`);
    }
    if (shownAcc === "pumpkin" && el.carveMouth) {
      el.carves.forEach((c, i) => c.setAttribute("transform", `translate(${(pos[i][0] * 1.15 + ex).toFixed(2)} ${(-4 + ey).toFixed(2)}) scale(${(pos[i][1] * 1.75).toFixed(3)} ${(A.blink < 1 ? 0.3 : 1.75)})`));
      el.carveMouth.setAttribute("transform", `translate(${(th * 26 + ex * 0.6).toFixed(2)} ${(-6 + ey * 0.6).toFixed(2)}) scale(${(1.35 * (1 - 0.3 * ath)).toFixed(3)} 1.35)`);
    }
    el.ghostEyes.forEach((g, i) => {
      g.setAttribute("cx", (pos[i][0] + ex + A.lag + 4 * th).toFixed(2));
      g.setAttribute("cy", (16 + ey + sitDrop * 0.4).toFixed(2));
      g.setAttribute("rx", (11 * pos[i][1]).toFixed(2));
      g.setAttribute("ry", (15 * (A.blink < 1 ? 0.15 : 1)).toFixed(2));
    });
    drawCape();
    if (P.box && P.box.vis) {
      el.heldBox.style.display = "inline";
      el.heldBox.setAttribute("transform", `translate(${P.box.x.toFixed(2)} ${(P.box.y + sitDrop).toFixed(2)}) scale(${P.box.s.toFixed(3)})`);
    } else el.heldBox.style.display = "none";
    el.mouth.setAttribute("ry", (P.mouth * 10).toFixed(2));
    el.mouth.setAttribute("rx", (5.5 + P.mouth * 3).toFixed(2));
    if (P.snack > 0) { el.snack.style.display = "inline"; el.snack.setAttribute("transform", `translate(${(th * 30).toFixed(2)} 54) scale(${(P.snack * 1.7).toFixed(2)})`); }
    else el.snack.style.display = "none";

    // Que el bocadillo no se salga de la pantalla aunque Eko esté pegado al borde
    if (bubble.classList.contains("show")) {
      const w = bubble.offsetWidth || 0;
      const cx = S.x + W / 2, half = w / 2 + 6;
      const shift = clamp(0, world.left + half - cx, world.left + world.width - half - cx);
      bubble.style.setProperty("--shift", shift.toFixed(0) + "px");
    }

    place();
  }

  // Sábana del fantasma: el bajo ondea y se arrastra hacia atrás al moverse
  function ghostPath(drift) {
    const tt = A.t, sw = Math.sin(tt * 1.7) * 6 - drift * 18;
    const n = 7, y0 = 162, x0 = 100 + sw, x1 = -100 + sw;
    let d = `M-106,10 C-106,-88 -54,-118 0,-118 C54,-118 106,-88 106,10 C112,62 ${(112 + sw * 0.6).toFixed(1)},118 ${x0.toFixed(1)},${y0}`;
    for (let i = 0; i < n; i++) {
      const xa = lerp(x0, x1, i / n), xb = lerp(x0, x1, (i + 1) / n);
      const yb = y0 + Math.sin(tt * 3.2 + (i + 1) * 1.3) * 5;
      const cy = y0 + 16 + Math.sin(tt * 3.2 + i * 1.3 + 0.6) * 6;
      d += ` Q${((xa + xb) / 2).toFixed(1)},${cy.toFixed(1)} ${xb.toFixed(1)},${yb.toFixed(1)}`;
    }
    d += ` C${(-112 + sw * 0.6).toFixed(1)},118 -112,62 -106,10Z`;
    return d;
  }

  // ---------- Capa: tela simulada (5 tiras de puntos con verlet) ----------
  // Se simula en el sistema de Eko: la gravedad tira hacia abajo y el "viento" es su propia velocidad al revés.
  // grow: 0 = recogida en el broche, 1 = desplegada. Se despliega al ponérsela y se recoge un rato después de aterrizar.
  const CAPE = { cols: [-40, -20, 0, 20, 40], seg: 6, len: 21, flare: 0.2, pts: null, grow: 0, target: 0 };
  const capeAnchor = (c) => ({ x: CAPE.cols[c], y: 52 - Math.pow(CAPE.cols[c] / 40, 2) * 5 });
  function capeReset() {
    CAPE.pts = CAPE.cols.map((x0, c) => Array.from({ length: CAPE.seg + 1 }, (_, i) => {
      const a = capeAnchor(c), x = x0 * (1 + i * CAPE.flare), y = a.y + i * CAPE.len * 0.97;
      return { x, y, px: x, py: y };
    }));
  }
  function setCape(on) {
    CAPE.target = on ? 1 : 0;
    if (on) { el.cape.style.display = "inline"; if (!CAPE.pts) { capeReset(); CAPE.grow = 0; } }
  }
  function stepCape(dt) {
    if (!el.cape || el.cape.style.display !== "inline") { CAPE.pts = null; CAPE.grow = 0; return; }
    if (!CAPE.pts) capeReset();
    CAPE.grow += (CAPE.target - CAPE.grow) * Math.min(1, dt * (CAPE.target ? 5 : 4));
    if (!CAPE.target && CAPE.grow < 0.04) { el.cape.style.display = "none"; CAPE.pts = null; CAPE.grow = 0; return; }
    const segLen = CAPE.len, n = CAPE.cols.length;
    const h = Math.min(dt, 1 / 30);
    const k = 2.18;                                    // px de pantalla → unidades del dibujo
    const lean = ((S.fly ? S.fly.dir * 22 : 0) + (A.pose.P ? A.pose.P.sway : 0)) * Math.PI / 180;
    const gx = Math.sin(-lean) * 900, gy = Math.cos(lean) * 900;
    const wx = -A.vx * k * 3.2, wy = -A.vy * k * 1.4;
    const sp = Math.min(1, Math.hypot(A.vx, A.vy) / 300);
    // brisa suave aunque esté quieto, para que la tela no parezca de cartón
    const breeze = Math.sin(A.t * 1.7) * 60 + Math.sin(A.t * 3.1) * 30;
    for (let c = 0; c < n; c++) {
      const col = CAPE.pts[c], side = (c - (n - 1) / 2) / ((n - 1) / 2);
      for (let i = 1; i < col.length; i++) {
        const p = col[i], u = i / CAPE.seg;
        // ondas que viajan hacia la punta (más fuertes al final) y bordes que se separan para que se vea ancha de lado
        const flutter = Math.sin(A.t * 14 - i * 1.15 + c * 1.3) * sp * 1000 * u;
        const spread = side * sp * 1900 * u;
        const fx = gx + wx * u + flutter * 0.25 + breeze * u;
        const fy = gy + wy * u + flutter + spread;
        const vx = (p.x - p.px) * 0.982, vy = (p.y - p.py) * 0.982;
        p.px = p.x; p.py = p.y;
        p.x += vx + fx * h * h; p.y += vy + fy * h * h;
      }
      const a = capeAnchor(c);
      col[0].x = col[0].px = a.x; col[0].y = col[0].py = a.y;
    }
    for (let it = 0; it < 5; it++) {
      // largo de cada tramo (la tela no se estira)
      for (let c = 0; c < n; c++) {
        const col = CAPE.pts[c];
        for (let i = 1; i < col.length; i++) {
          const a = col[i - 1], b = col[i];
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, diff = (d - segLen) / d;
          if (i === 1) { b.x -= dx * diff; b.y -= dy * diff; }
          else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
        }
      }
      // anchura: puede fruncirse (pliegues) pero no abrirse más que la tela
      for (let i = 1; i <= CAPE.seg; i++) {
        const want = 20 * (1 + i * CAPE.flare);
        for (let c = 0; c < n - 1; c++) {
          const a = CAPE.pts[c][i], b = CAPE.pts[c + 1][i];
          let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
          if (d < 0.01) { dx = 0.01; dy = 0; d = 0.01; }
          const lo = want * 0.3, hi = want * 1.05;
          if (d > hi || d < lo) {
            const diff = (d - (d > hi ? hi : lo)) / d;
            a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5;
          }
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
    if (!CAPE.pts) return;
    const P = CAPE.pts, n = P.length, last = CAPE.seg;
    const f = (p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    // curva suave por los puntos medios (las tiras vecinas comparten el mismo borde: sin huecos)
    const side = (pts) => {
      let d = ` L${f(pts[0])}`;
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
        d += ` Q${f(pts[i])} ${mx.toFixed(1)},${my.toFixed(1)}`;
      }
      return d + ` L${f(pts[pts.length - 1])}`;
    };
    // bajo ondulado: cada tramo del borde se curva un poco hacia fuera
    const hemSeg = (a, b, k) => {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y;
      return ` Q${(mx - dy * 0.18 * k).toFixed(1)},${(my + dx * 0.18 * k).toFixed(1)} ${f(b)}`;
    };
    // silueta completa = cara interior (más oscura), por si la tela se da la vuelta
    let out = `M${f(P[0][0])}` + side(P[0]).slice(2 + f(P[0][0]).length);
    for (let c = 0; c < n - 1; c++) out += hemSeg(P[c][last], P[c + 1][last], 1);
    out += side([...P[n - 1]].reverse()) + "Z";
    el.capeShape.setAttribute("d", out);
    // tiras sombreadas: si una tira se frunce (gira) se oscurece; alternas para marcar pliegues
    for (let c = 0; c < n - 1; c++) {
      const L = P[c], R = P[c + 1];
      let w = 0, want = 0;
      for (let i = 1; i <= last; i++) { w += Math.hypot(R[i].x - L[i].x, R[i].y - L[i].y); want += 20 * (1 + i * CAPE.flare); }
      const squeeze = 1 - clamp(w / want, 0, 1);
      const dark = squeeze * 0.9 + (c % 2 ? 0.12 : 0) + (c === 0 || c === n - 2 ? 0.06 : 0);
      let d = `M${f(L[0])}` + side(L).slice(2 + f(L[0]).length) + hemSeg(L[last], R[last], 1) + side([...R].reverse()) + "Z";
      const s = el.capeStrips[c];
      s.setAttribute("d", d); s.setAttribute("fill", capeColor(dark)); s.setAttribute("stroke", capeColor(dark)); s.setAttribute("stroke-width", "0.8");
    }
    // pliegues finos sobre las costuras interiores y brillo en el bajo
    let folds = "";
    for (let c = 1; c < n - 1; c += 2) folds += `M${f(P[c][1])}` + side(P[c].slice(1)).slice(2 + f(P[c][1]).length);
    el.capeFold.setAttribute("d", folds);
    let hem = `M${f(P[0][last])}`;
    for (let c = 0; c < n - 1; c++) hem += hemSeg(P[c][last], P[c + 1][last], 1);
    el.capeEdge.setAttribute("d", hem);
    // desplegar / recoger: la tela sale del broche (se estira hacia abajo y se abre)
    const gr = CAPE.grow, e = 1 - Math.pow(1 - gr, 3);
    el.cape.setAttribute("transform", gr > 0.995 ? "" : `translate(0 50) scale(${(0.35 + 0.65 * e).toFixed(3)} ${Math.max(0.02, e).toFixed(3)}) translate(0 -50)`);
  }

  // ---------- Bucle ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // ---------- Ratón: coger, lanzar, toquecito ----------
  let downX = 0, downY = 0, offX = 0, offY = 0, downT = 0, prevX = 0, prevY = 0, prevT = 0;

  hit.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    hit.setPointerCapture(e.pointerId);
    S.pressed = true;
    Voice.ensure();
    downX = e.screenX; downY = e.screenY; downT = performance.now();
    offX = e.screenX - S.x; offY = e.screenY - S.y;
    prevX = S.x; prevY = S.y; prevT = downT;
  });

  hit.addEventListener("pointermove", (e) => {
    if (!S.pressed) return;
    if (!S.dragging && Math.hypot(e.screenX - downX, e.screenY - downY) > 5) {
      S.dragging = true; S.airborne = false; S.mode = "drag"; A.action = null; S.perch = null; S.sneak = false; WIN.pendDx = 0;
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = 0; }
      if (window.EkoMenu) window.EkoMenu.close();
      if (S.fly) { S.fly = null; setTimeout(() => setFlyGear(null), 800); }
      hit.classList.add("dragging");
      invoke("set_dragging", { value: true });
      if (S.sleeping) { S.sleeping = false; setMood("normal"); }
      touched();
      bump(-3);
      fx("bang");
      DRAG.t0 = A.t; DRAG.heldSaid = false; DRAG.lastVx = 0; DRAG.lastVy = 0; DRAG.zoomAt = 0;
      if (Math.random() < 0.65 && A.t > DRAG.nextGrabLine) { DRAG.nextGrabLine = A.t + 6; setTimeout(() => { if (S.dragging && A.dizzy < 0.4) say(pickNew(TXT.grab), 2200, true); }, 250); }
    }
    if (S.dragging) {
      const now = performance.now();
      S.x = e.screenX - offX;
      S.y = Math.min(e.screenY - offY, floorY());
      const dtm = Math.max(1, now - prevT) / 1000;
      S.vx = S.vx * 0.5 + ((S.x - prevX) / dtm) * 0.5;
      S.vy = S.vy * 0.5 + ((S.y - prevY) / dtm) * 0.5;
      prevX = S.x; prevY = S.y; prevT = now;
      // Zarandeo: cada cambio brusco de sentido suma al mareo
      const flipX = Math.sign(S.vx) !== Math.sign(DRAG.lastVx) && Math.abs(S.vx - DRAG.lastVx) > 900;
      const flipY = Math.sign(S.vy) !== Math.sign(DRAG.lastVy) && Math.abs(S.vy - DRAG.lastVy) > 900;
      if (flipX || flipY) {
        const before = A.dizzy;
        A.dizzy = Math.min(3, A.dizzy + clamp((Math.abs(S.vx - DRAG.lastVx) + Math.abs(S.vy - DRAG.lastVy)) / 5000, 0.08, 0.35));
        bump(-1.5); A.sqxV += 3;
        if (before < 0.6 && A.dizzy >= 0.6) { say(pickNew(TXT.shake), 1800, true); Voice.chirp(); }
        else if (before < 1.6 && A.dizzy >= 1.6) { say(pickNew(TXT.shake), 1800, true); fx("spark", 2); }
      }
      DRAG.lastVx = S.vx; DRAG.lastVy = S.vy;
      if (Math.hypot(S.vx, S.vy) > 1700 && A.dizzy < 0.5 && A.t > DRAG.zoomAt) { DRAG.zoomAt = A.t + 8; if (Math.random() < 0.5) say(pickNew(TXT.zoom), 1600, true); }
    }
  });

  function release() {
    if (!S.pressed) return;
    S.pressed = false;
    if (S.dragging) {
      S.dragging = false;
      hit.classList.remove("dragging");
      invoke("set_dragging", { value: false });
      S.vx = clamp(S.vx, -1800, 1800);
      S.vy = clamp(S.vy, -1800, 1800);
      S.airborne = true; S.mode = "idle";
      if (A.dizzy > 0.8) {
        // Mareado: al tocar suelo, ojos en espiral, se tambalea un rato y quizá se sienta
        const lvl = A.dizzy;
        DRAG.dizzyLanding = lvl;
      } else setTimeout(() => { if (!S.airborne && !(A.action && A.action.name === "dizzy") && Math.random() < 0.5) say(pickNew(TXT.drop)); }, 900);
    } else if (performance.now() - downT < 350) {
      // Clic = menú; doble clic = saltito. Se espera un instante para distinguirlos.
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = 0; poke(); }
      else clickTimer = setTimeout(() => { clickTimer = 0; tap(); }, 260);
    }
  }
  hit.addEventListener("pointerup", release);
  hit.addEventListener("pointercancel", release);

  let clickTimer = 0;
  function tap() {
    if (A.hidden) return;              // durante el bautizo Eko aún no ha nacido
    if (window.EkoMenu && !S.sleeping) window.EkoMenu.toggle();
    else poke();
  }

  const pokes = [];
  function poke() {
    touched();
    if (S.sleeping) { wakeUp(); return; }
    const now = performance.now();
    pokes.push(now);
    while (pokes.length && now - pokes[0] > 20000) pokes.shift();
    if (pokes.length >= 4) {            // muchos toquecitos seguidos: se enfada un poco
      act("angry"); bump(3); Voice.sigh();
      say(pick(TXT.pokeAnnoyed), 2400, true);
      S.mode = "idle"; S.modeUntil = A.t + 4;
      return;
    }
    hop(-480);
    A.tiltTarget = rnd(-10, 10);
    S.mode = "idle"; S.modeUntil = A.t + 3;
    const r = Math.random();
    if (r < 0.25) setTimeout(() => act("shrug"), 350);
    else if (r < 0.45) setTimeout(() => act("wink"), 350);
    else if (r < 0.6) setTimeout(() => act("nod"), 350);
    express(pick(["curioso", "sorprendido", "divertido", "picaro"]), 2.2);
    if (Math.random() < 0.6) say(pick(TXT.poke));
  }

  // ---------- Caricias ----------
  function onCursor(p) {
    const moved = Math.hypot(p.x - cursor.lastX, p.y - cursor.lastY);
    if (moved > 0.5) cursor.lastMove = A.t;
    const nowMs = performance.now(), dts = Math.max(0.016, (nowMs - (cursor.lastT || nowMs - 40)) / 1000);
    cursor.lastT = nowMs;
    // Si pasa el ratón disparado justo a su lado, se asusta (de vez en cuando)
    const ecx = S.x + W / 2, ecy = S.y + H - 120;
    if (moved / dts > 2600 && Math.hypot(p.x - ecx, p.y - ecy) < 170 && !busy() && cool("startle", rnd(40, 90))) { act("surprise"); express("asustado", 1.6); bump(-4); Voice.chirp(); }
    if (WIN.hunt && Math.hypot(p.x - WIN.hunt.x, p.y - WIN.hunt.y) > 70) abortHunt(true);
    if (p.over && !S.pressed && moved > 0.5 && moved < 22) {
      cursor.pet += moved;
      if (cursor.pet > 260 && A.mood !== "happy") {
        cursor.pet = 0;
        touched();
        if (S.sleeping) { S.sleeping = false; setMood("normal"); }
        setMood("happy", 2.5);
        blush(2.8);
        fx("heart", 2);
        A.tiltTarget = rnd(-12, 12);
        bump(1.5);
        Voice.chirp();
        express("enamorado", 2.8);
        if (Math.random() < 0.5) say(pick(TXT.pet));
      }
    } else {
      cursor.pet *= 0.96;
    }
    cursor.x = p.x; cursor.y = p.y; cursor.over = p.over;
    cursor.lastX = p.x; cursor.lastY = p.y;
  }

  // ---------- API para otros módulos ----------
  window.Eko = {
    S, A, LANG, TXT, say, pick, rnd, setMood, bump, goToSleep, wakeUp, act, fx, blush, hop,
    missYou, sulk, addBox, Voice, forcePeek: startPeek,
    setDance(v) { A.dance = !!v; },
    setEvo, evo: EVO, celebrateStage, water, careCheck, careState: CARE, careStage, sprout: () => el.sprout, express, useProp, dropProp, dressUp, prop: PROP,
    ACTIONS, HOOKS, el, fxLayer, stage, startPeek, busy: () => busy(), perchRoom: (c) => perchRoom(c), setFlyGear: (k) => setFlyGear(k),
    onWin, onWinEv, win: WIN, climb: () => { WIN.nextBigAt = 0; if (perchRoom(WIN.cur) && !S.perch) { S.mode = "walk"; S.speed = 58; S.then = "climb"; S.modeUntil = A.t + 30; const c = WIN.cur; S.targetX = clamp(clamp(S.x + W / 2, c.x + 90, c.x + c.w - 90) - W / 2, minX() + 40, maxX() - 40); } }, hunt: startHunt, getDown: (style) => getDown(style), visitIcon,
    setHot(v) { A.hot = !!v; stage.classList.toggle("mood-hot", !!v); },
    setGlasses(v) { stage.classList.toggle("has-glasses", !!v); },
    setHat(mode) { accMode = mode; applyAcc(true); },
    fly: (k) => startFlight(k),
    quiet: false,
    setHidden(v) { A.hidden = !!v; },
    // La ventana de Eko no se activa sola: para escribir en una casilla hay que pedirle el foco a Windows
    focusInput(inp) {
      const go = () => { try { inp.focus(); } catch (_) {} };
      if (NATIVE) win.setFocus().then(() => setTimeout(go, 30)).catch(go); else go();
    },
    // Mete la ventana entera dentro de la pantalla (para menús y tarjetas); llama a done al llegar
    keepInside(done) {
      const lo = world.left, hi = world.left + world.width - W;
      const target = clamp(S.x, lo, hi);
      if (Math.abs(target - S.x) < 2 || S.airborne) { done && done(); return; }
      S.mode = "walk"; S.speed = 320; S.targetX = target; S.then = null; S.modeUntil = A.t + 10;
      const t0 = performance.now();
      const iv = setInterval(() => {
        if (Math.abs(S.x - target) < 3 || performance.now() - t0 > 2500) { clearInterval(iv); S.mode = "idle"; done && done(); }
      }, 50);
    },
    setMenuPose(v) { A.menuPose = !!v; },
    setHitFull(v) {
      hitFull = !!v;
      sendHitbox();
    },
    world, W, H, cursor, floorY, minX, maxX, clamp,
    walkTo(x, speed = 46, then = null) { S.mode = "walk"; S.speed = speed; S.targetX = clamp(x - W / 2, minX(), maxX()); S.then = then; S.modeUntil = A.t + 60; },
    hold(secs) { S.mode = "idle"; S.modeUntil = A.t + secs; },
    curious() { S.mode = "walk"; S.speed = 60; S.targetX = clamp(cursor.x - W / 2 + rnd(-40, 40), minX() + 40, maxX() - 40); S.then = "curious"; S.modeUntil = A.t + 30; },
    lastInteraction: () => lastInteraction,
    native: NATIVE, listen,
  };

  // ---------- Comportamiento de "app", no de página web ----------
  // Sin menú contextual del navegador (Inspeccionar, Recargar…) ni atajos que recarguen o impriman
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "f5" || k === "f7" || k === "f3" || (e.ctrlKey && ["r", "p", "f", "g", "j", "u", "s", "+", "-", "="].includes(k))) e.preventDefault();
  });
  document.addEventListener("dragstart", (e) => e.preventDefault());

  // ---------- Ajustes en vivo ----------
  const pod = $("#pod");
  // Única fuente de verdad de la zona clicable: o toda la ventana (menú, tarjetas, juegos) o solo Eko
  let hitFull = false;
  function sendHitbox() {
    if (hitFull) { invoke("set_hitbox", { x: 0, y: 0, w: W, h: H }); return; }
    const r = hit.getBoundingClientRect();
    invoke("set_hitbox", { x: r.left, y: r.top, w: r.width, h: r.height });
  }
  function applySettings(cfg) {
    pod.style.transform = cfg.size && cfg.size !== 1 ? `scale(${cfg.size})` : "";
    Voice.base = cfg.pitch || 560;
    Voice.on = !!cfg.voice;
    invoke("set_sound_menu", { value: Voice.on }).catch(() => {});
    invoke("set_discretion", { call: cfg.hideCall !== false, record: cfg.hideRecord !== false, fullscreen: cfg.hideFull !== false }).catch(() => {});
    if (NATIVE) setTimeout(sendHitbox, 50);
  }
  if (window.EkoSettings) window.EkoSettings.onChange(applySettings);

  // ---------- Arranque ----------
  async function start() {
    readBounds();
    if (!store.get("eko-born")) store.set("eko-born", new Date().toISOString());
    S.x = world.left + world.width * 0.72;
    S.y = floorY();
    S.modeUntil = 3;
    A.appear = 0.01;
    applyAcc(false);
    if (window.EkoSettings) applySettings(window.EkoSettings.get());
    const onboarding = !store.get("eko-onboarded");
    if (onboarding) { A.hidden = true; S.modeUntil = 1e9; }
    update(0.016);
    render();

    if (NATIVE) {
      sendHitbox();
      invoke("set_sound_menu", { value: Voice.on }).catch(() => {});
      listen("cursor", (e) => onCursor(e.payload));
      listen("win", (e) => onWin(e.payload));
      listen("winev", (e) => onWinEv(e.payload));
      listen("eko-reset", () => location.reload());
      listen("cmd", (e) => {
        const c = e.payload;
        if (c === "sleep") S.sleeping ? wakeUp() : goToSleep();
        if (c === "wake") lastPosKey = "";
        if (c === "updating") { act("bye"); say(pick(TXT.updating), 4000, true); }
        if (c === "sound-on") { Voice.setOn(true); Voice.chirp(); }
        if (c === "sound-off") Voice.setOn(false);
        if (c === "hat-cycle") {
          accMode = ACC_CYCLE[(ACC_CYCLE.indexOf(accMode) + 1) % ACC_CYCLE.length];
          applyAcc(false); hop(-360); fx("spark", 2);
          say(TXT.hats[accMode], 2000, true);
        }
      });
      await win.show();
    } else {
      addEventListener("mousemove", (e) => {
        const r = hit.getBoundingClientRect();
        onCursor({ x: e.clientX, y: e.clientY, over: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom });
      });
      addEventListener("resize", readBounds);
    }

    setInterval(() => { readBounds(); applyAcc(true); }, 5000);
    if (onboarding) { requestAnimationFrame(frame); return; }   // el bautizo se encarga del saludo
    bump(-4);

    let greeting = specialGreeting();
    let gesture = greeting ? "hug" : "wave";
    if (!greeting && NATIVE) {
      try {
        const v = await T.app.getVersion();
        const prev = store.get("eko-version");
        if (prev && prev !== v) { greeting = pick(TXT.updated); gesture = "surprise"; }
        store.set("eko-version", v);
      } catch (_) {}
    }
    const user = window.EkoSettings ? window.EkoSettings.get().userName : "";
    if (!greeting) greeting = isMonday() ? pick(TXT.monday) : user && Math.random() < 0.5 ? (LANG === "es" ? `¡Holi, ${user}!` : `Hi, ${user}!`) : pick(TXT.hello);
    if (isMonday() && gesture === "wave") gesture = "yawn";
    setTimeout(() => say(greeting, 3000, true, gesture), 700);
    requestAnimationFrame(frame);
  }

  start();
})();
