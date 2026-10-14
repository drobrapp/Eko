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
    shadow: $("#shadow"), hl: $("#hl"), mouth: $("#mouth"), bridge: $("#bridge"), hat: $("#hat"),
    accFace: $("#accFace"), snack: $("#snack"), bodyHl: $("#bodyHl"), accBack: $("#accBack"), accBody: $("#accBody"), accFront: $("#accFront"), heldBox: $("#heldBox"), ghostEyes: [...document.querySelectorAll("#ghostEyes ellipse")],
    accEls: [...document.querySelectorAll("[data-acc]")],
    flyEls: [...document.querySelectorAll("[data-fly]")], cape: $("#cape"),
    capeShape: $("#capeShape"), capeStrips: [...document.querySelectorAll("#capeStrips path")], capeFold: $("#capeFold"), capeEdge: $("#capeEdge"),
    ghostSheet: $("#ghostSheet"), carves: [$("#carveL"), $("#carveR")], carveMouth: $("#carveMouth"),
    opens: [...document.querySelectorAll(".eye .open")],
    eyeEls: [...document.querySelectorAll(".eye")],
  };

  // ---------- Utilidades ----------
  const LANG = window.EKO_LANG || ((navigator.language || "es").toLowerCase().startsWith("es") ? "es" : "en");
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
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
      dizzy: ["Veo tres pantallas…", "¿Quién ha apagado la gravedad?", "Necesito sentarme"],
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
      hats: { auto: "Complemento automático", witch: "Bruja", pumpkin: "Calabaza", vampire: "Vampiro", ghost: "Fantasma", santa: "Papá Noel", reindeer: "Reno", elf: "Elfo", scarf: "Bufanda", party: "Fiesta", crown: "Corona", none: "Sin complemento" },
    },
    en: {
      hello: ["Hi!", "I'm here", "What are we doing today?"],
      poke: ["You called?", "Present!", "What's up?", "Here!"],
      pokeAnnoyed: ["Enough!", "Again?", "You'll wear me out", "I'm not a button!"],
      pet: ["mmm…", "That's nice", "Again"],
      drop: ["Oof!", "Perfect landing", "Not again…"],
      dizzy: ["Everything's spinning…", "Where am I?"],
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

  // ---------- Símbolos flotantes ----------
  const FX = { heart: ["♥", "#ef6b86"], bang: ["!", "#f2a33a"], ask: ["?", "#8a7cc9"], note: ["♪", "#5fa8d8"], spark: ["✦", "#f2c14e"], drop: ["…", "#9d8a7f"] };
  function fx(kind, n = 1) {
    const [ch, color] = FX[kind] || [kind, "#3b2f2a"];
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const s = document.createElement("span");
        s.className = "fx";
        s.textContent = ch;
        s.style.color = color;
        s.style.left = 104 + rnd(-26, 26) + "px";
        s.style.top = 92 + rnd(-6, 8) + "px";
        s.style.setProperty("--dx", rnd(-14, 14) + "px");
        fxLayer.appendChild(s);
        setTimeout(() => s.remove(), 1500);
      }, i * 180);
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

  // ---------- Estado ----------
  const S = {
    x: 0, y: 0, vx: 0, vy: 0, prevX: 0,
    airborne: false, dragging: false, pressed: false,
    mode: "idle", modeUntil: 0, targetX: 0, facing: 1, speed: 46, then: null, peekSide: 0,
    sleeping: false, sulking: false, fly: null, prevY: 0, pendingHop: null,
  };
  const A = {
    t: 0, squash: 0, squashV: 0, appear: 0,
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
  function setFace(eyes, brows) {
    const key = eyes + "|" + brows;
    if (key === faceKey) return;
    faceKey = key;
    stage.dataset.eyes = eyes;
    stage.dataset.brows = brows;
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
    flip: { dur: 0.9, f(P, k) { P.spin = 360 * (k < 0.15 ? 0 : Math.min(1, (k - 0.15) / 0.7)); P.aL = 70; P.aR = -70; P.eyes = "closed"; } },
    hug: { dur: 2.6, eyes: "happy", f(P, k, e) {
      const open = k < 0.4 ? e : 0;
      const close = k >= 0.4 ? e : 0;
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

  function decide() {
    if (S.sleeping || S.sulking || S.airborne || S.dragging) return;
    const sleepy = isMonday() || isLate();
    const cfg = window.EkoSettings ? window.EkoSettings.get() : { walk: true, fly: true };
    const cursorRecent = A.t - cursor.lastMove < 8;
    const choice = weighted([
      ["idle", 30], ["walk", cfg.walk ? 24 : 0], ["look", 7], ["sit", 8],
      ["stretch", sleepy ? 6 : 3], ["yawn", sleepy ? 9 : 2], ["scratch", 5], ["think", 4],
      ["peek", cfg.walk ? 5 : 0], ["approach", cfg.walk && cursorRecent ? 8 : 0], ["friday", isFridayEve() ? 6 : 0], ["fly", cfg.fly ? 2 : 0],
    ]);
    S.speed = sleepy ? 34 : 46;
    S.then = null;
    switch (choice) {
      case "walk":
        S.mode = "walk"; S.targetX = clamp(S.x + rnd(-450, 450), minX() + 40, maxX() - 40); S.modeUntil = A.t + 30; break;
      case "look":
        S.mode = "idle"; S.modeUntil = A.t + 4; act("lookAround"); break;
      case "sit":
        S.mode = "sit"; S.modeUntil = A.t + rnd(6, 16); break;
      case "stretch": case "yawn": case "scratch": case "think":
        S.mode = "idle"; S.modeUntil = A.t + ACTIONS[choice].dur + rnd(1, 3); act(choice); break;
      case "peek": startPeek(); break;
      case "fly": startFlight(); break;
      case "approach":
        S.mode = "walk"; S.targetX = clamp(cursor.x - W / 2 + rnd(-60, 60), minX() + 40, maxX() - 40);
        S.then = "curious"; S.modeUntil = A.t + 30; break;
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
    S.mode = "walk"; S.speed = 46;
    S.targetX = side < 0 ? world.left - W / 2 - 8 : world.left + world.width - W / 2 + 8;
    S.then = "peek"; S.modeUntil = A.t + 40;
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
    if (tt < f.prep) { S.y = fy; if (tt > f.prep - 0.35 && !f.crouched) { f.crouched = true; bump(4); } return; }
    const u = clamp((tt - f.prep) / f.dur, 0, 1);
    if (!f.launched) { f.launched = true; bump(-6); Voice.hop(); }
    const ease = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    S.x = lerp(f.x0, f.x1, ease);
    S.y = fy - f.h * Math.pow(Math.sin(u * Math.PI), 0.75) - Math.sin(tt * 3) * 6 * Math.sin(u * Math.PI);
    S.facing = f.dir;
    if (u >= 1) {
      S.y = fy; S.fly = null; S.mode = "idle"; S.modeUntil = A.t + 3;
      bump(7); Voice.thump(1);
      setTimeout(() => { if (!S.fly) setFlyGear(null); }, 2800);
    }
  }

  function arrive() {
    const then = S.then;
    S.then = null;
    if (then === "peek") { S.mode = "peeking"; S.modeUntil = A.t + rnd(4, 7); S.facing = -S.peekSide; return; }
    if (then === "curious") { S.mode = "idle"; S.modeUntil = A.t + 3.5; act("curious", { dir: Math.sign(cursor.x - (S.x + W / 2)) || 1 }); return; }
    if (then === "hug") { S.mode = "idle"; S.modeUntil = A.t + 4; hop(-380); setTimeout(() => act("hug"), 450); return; }
    S.mode = "idle"; S.modeUntil = A.t + rnd(2, 6); A.tiltTarget = 0;
  }

  // Salto con anticipación: primero se aplasta un instante y luego sale estirado
  function hop(v = -420) {
    if (S.dragging || S.sleeping || S.pendingHop) return;
    if (S.airborne) { S.vy = Math.min(S.vy, v * 0.6); return; }
    S.pendingHop = { v, at: A.t + 0.1 };
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

  // ---------- Física y lógica ----------
  function update(dt) {
    A.t += dt;
    const fy = floorY();
    S.prevX = S.x; S.prevY = S.y;
    if (S.pendingHop && A.t >= S.pendingHop.at && !S.dragging) {
      S.airborne = true; S.vy = S.pendingHop.v; S.vx = 0; S.pendingHop = null;
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
      S.y = fy;
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
      mouth: 0, eyeX: null, eyeY: null, eyeScale: S.dragging ? 1.25 : 1, eyes: null, brows: "none",
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

    if (shownAcc === "ghost") { P.lift += 9 + Math.sin(A.t * 2.2) * 5; P.sway += Math.sin(A.t * 1.6) * 4; }
    P.nod += A.gNod;
    if (S.fly) flyPose(P);
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

    let eyes = P.eyes;
    if (!eyes) {
      if (S.sulking) eyes = "hidden";
      else if (A.mood === "sleep") eyes = "closed";
      else if (A.mood === "happy") eyes = "happy";
      else eyes = "open";
    }
    if (S.sulking && P.brows === "none") P.brows = "sad";
    setFace(eyes, P.brows);

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

    const lift = clamp((floorY() - S.y) / 300, 0, 1);
    const sh = (1 - lift * 0.7) * A.appear;
    el.shadow.setAttribute("transform", `translate(0 ${floorY() - S.y}) translate(0 176) scale(${sh} ${sh}) translate(0 -176)`);
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
    const farLeft = t > 0.15, farRight = t < -0.15;
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
    }
    const dxL = t > 0 ? 22 * t : -16 * t;
    const dxR = t > 0 ? -16 * t : 22 * t;
    el.armL.setAttribute("transform", `translate(${dxL.toFixed(2)} ${sitDrop.toFixed(2)}) rotate(${A.pose.aL.toFixed(2)} -50 58)`);
    el.armR.setAttribute("transform", `translate(${dxR.toFixed(2)} ${sitDrop.toFixed(2)}) rotate(${A.pose.aR.toFixed(2)} 50 58)`);
    el.body.setAttribute("transform", `translate(${(-2 * t).toFixed(2)} 0) scale(${(1 - 0.12 * at).toFixed(4)} 1)`);
    el.bodyHl.setAttribute("transform", `translate(${(-12 * t).toFixed(2)} 0)`);
    // Los complementos del cuerpo siguen al cuerpo; el cuello del vampiro y la capa, también a la cabeza y al sentarse
    const bodyT = `translate(${(-2 * t).toFixed(2)} 0) scale(${(1 - 0.12 * at).toFixed(4)} 1)`;
    el.accBody.setAttribute("transform", bodyT);

    const headDrop = (S.sleeping ? 4 : 0) + P.nod + A.hy;
    el.accBack.setAttribute("transform", `translate(${(2 * th + A.lag * 0.6).toFixed(2)} ${(sitDrop + Math.min(0, headDrop) * 0.3).toFixed(2)}) scale(${(1 - 0.1 * at).toFixed(4)} 1)`);
    el.head.setAttribute("transform", `translate(${(4 * th + A.lag).toFixed(2)} ${headDrop.toFixed(2)}) rotate(${(A.tilt + P.tilt).toFixed(2)} 0 40) scale(${(1 - 0.05 * ath).toFixed(4)} 1)`);
    el.hl.setAttribute("transform", `translate(${(-14 * th).toFixed(2)} ${(P.nod * 0.5).toFixed(2)})`);
    el.hat.setAttribute("transform", `translate(${(10 * th).toFixed(2)} 0)`);

    const ex = P.eyeX != null ? P.eyeX : A.eyeX;
    const ey = (P.eyeY != null ? P.eyeY : A.eyeY) + P.nod * 0.9;
    el.eyes.setAttribute("transform", `translate(${ex.toFixed(2)} ${ey.toFixed(2)})`);
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
    el.accFace.setAttribute("transform", `translate(${(th * 30 + ex * 0.6).toFixed(2)} ${(ey * 0.6).toFixed(2)}) scale(${(1 - 0.3 * ath).toFixed(3)} 1)`);
    if (shownAcc === "ghost") {
      el.ghostSheet.setAttribute("d", ghostPath(walking || S.fly ? t : 0));
      el.accFront.setAttribute("transform", `translate(0 ${(sitDrop * 0.4).toFixed(2)}) rotate(${((A.tilt + P.tilt) * 0.4).toFixed(2)} 0 40)`);
    }
    if (shownAcc === "pumpkin") {
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
    el.mouth.setAttribute("ry", (P.mouth * 7).toFixed(2));
    el.mouth.setAttribute("rx", (4 + P.mouth * 2).toFixed(2));
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
      S.dragging = true; S.airborne = false; S.mode = "drag"; A.action = null;
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = 0; }
      if (window.EkoMenu) window.EkoMenu.close();
      if (S.fly) { S.fly = null; setTimeout(() => setFlyGear(null), 800); }
      hit.classList.add("dragging");
      invoke("set_dragging", { value: true });
      if (S.sleeping) { S.sleeping = false; setMood("normal"); }
      touched();
      bump(-3);
      fx("bang");
    }
    if (S.dragging) {
      const now = performance.now();
      S.x = e.screenX - offX;
      S.y = Math.min(e.screenY - offY, floorY());
      const dtm = Math.max(1, now - prevT) / 1000;
      S.vx = S.vx * 0.5 + ((S.x - prevX) / dtm) * 0.5;
      S.vy = S.vy * 0.5 + ((S.y - prevY) / dtm) * 0.5;
      prevX = S.x; prevY = S.y; prevT = now;
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
      setTimeout(() => { if (!S.airborne && !(A.action && A.action.name === "dizzy") && Math.random() < 0.5) say(pick(TXT.drop)); }, 900);
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
    if (Math.random() < 0.6) say(pick(TXT.poke));
  }

  // ---------- Caricias ----------
  function onCursor(p) {
    const moved = Math.hypot(p.x - cursor.lastX, p.y - cursor.lastY);
    if (moved > 0.5) cursor.lastMove = A.t;
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
