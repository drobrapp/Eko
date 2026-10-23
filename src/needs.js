// Eko · necesidades (modo tamagotchi): hambre, energía, diversión y cariño, de 0 a 100.
// Bajan poco a poco, se cubren interactuando y se notan en cómo se mueve y lo que dice.
// Nunca enferma ni muere: lo peor es estar mustio, y se recupera enseguida.
window.EkoNeeds = (() => {
  "use strict";
  const E = window.Eko;
  if (!E) return null;
  const { S, A } = E;
  const ES = E.LANG === "es";
  const KEY = "eko-needs";
  const cfg = () => (window.EkoSettings ? window.EkoSettings.get() : {});
  const on = () => cfg().needs !== false;
  const decayMult = () => ({ relax: 0.55, normal: 1, hard: 1.5 })[cfg().needsMode] || 1;
  const recoveryMult = () => ({ relax: 1.7, normal: 1, hard: 0.8 })[cfg().needsMode] || 1;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  const KINDS = ["hunger", "energy", "fun", "love"];
  // Puntos que pierde por hora despierto (modo normal)
  const RATE = { hunger: 5.5, energy: 4.5, fun: 7, love: 6 };
  // Lo que pide cuando le falta cada cosa (el dibujo que aparece en su bocadillo)
  const WISH = { hunger: "artCookie", energy: "artNightcap", fun: "artBall", love: "artHeart" };

  let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (_) {}
  const N = Object.assign({ hunger: 75, energy: 85, fun: 70, love: 70, t: Date.now(), hintAt: 0, happyAt: 0, log: [] }, saved || {});
  let napping = false;                                     // siesta por cansancio: termina sola al recargar
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(N)); } catch (_) {} };

  // ---------- Lo que ha pasado con el PC apagado o Eko cerrado ----------
  // Baja muy poco (un tercio y como mucho 12 h) y con suelo: al volver, como mucho tiene hambre y ganas de verte
  (function offline() {
    const h = (Date.now() - (N.t || Date.now())) / 3600000;
    if (h < 0.1) return;
    const k = Math.min(h, 12) * decayMult() / 3;
    N.hunger = Math.max(Math.min(N.hunger, 30), N.hunger - RATE.hunger * k);
    N.fun = Math.max(Math.min(N.fun, 40), N.fun - RATE.fun * k);
    N.love = Math.max(Math.min(N.love, 30), N.love - RATE.love * k);
    N.energy = clamp(N.energy + h * 12 * recoveryMult(), 0, 100); // apagado = ha dormido
    N.t = Date.now(); save();
  })();

  // ---------- Paso del tiempo ----------
  setInterval(() => {
    const now = Date.now(), h = Math.min((now - N.t) / 3600000, 0.05);
    N.t = now;
    if (!on() || E.A.hidden) return;
    const quiet = E.lastSenses && (E.lastSenses.fullscreen || E.lastSenses.in_call);
    const m = decayMult() * (quiet ? 0.5 : 1);            // si estás a lo tuyo, no te lo pone difícil
    if (S.sleeping) {
      N.energy = clamp(N.energy + 30 * h * recoveryMult(), 0, 100); // dormir recarga energía
      N.hunger = clamp(N.hunger - RATE.hunger * 0.4 * h * m, 0, 100);
      if (napping && N.energy >= 96) { napping = false; E.wakeUp(true, true); }
    } else {
      napping = false;
      for (const k of KINDS) N[k] = clamp(N[k] - RATE[k] * h * m, 0, 100);
    }
    save();
  }, 10000);

  // ---------- Cubrir necesidades ----------
  // Rendimiento decreciente: repetir lo mismo muchas veces seguidas cuenta cada vez menos
  const GIVE = {
    feed:  { hunger: 34, love: 3 },
    play:  { fun: 22, love: 4, energy: -4 },
    fetch: { fun: 5, energy: -1 },
    pet:   { love: 6, fun: 2 },
    voice: { love: 5 },
    chat:  { love: 4, fun: 3 },
    water: { love: 4 },
    hug:   { love: 12 },
  };
  function give(src) {
    if (window.EkoStats) window.EkoStats.add(src);
    if (window.EkoProgress) window.EkoProgress.earn(src);
    const g = GIVE[src]; if (!g || !on()) return;
    const now = Date.now();
    N.log = (N.log || []).filter((x) => now - x.t < 1800000);
    const reps = N.log.filter((x) => x.s === src).length;
    const f = recoveryMult() / (1 + reps / 3);
    N.log.push({ s: src, t: now });
    const before = { ...N };
    for (const k in g) N[k] = clamp(N[k] + (g[k] > 0 ? g[k] * f : g[k]), 0, 100);
    save();
    // Si lo necesitaba de verdad, se nota el alivio
    if (src === "feed" && before.hunger < 30) later(3200, () => say(L.fedLow, 2600, "heart"));
    if ((src === "pet" || src === "hug" || src === "voice") && before.love < 30 && N.love >= 30) later(900, () => { E.express("emocionado", 2.5); E.fx("heart", 2); say(L.lovedLow, 2600); });
    if (src === "play" && before.fun < 30) later(800, () => E.express("emocionado", 2.5));
    if (window.EkoNeeds && EkoNeeds.onChange) EkoNeeds.onChange();
  }
  const later = (ms, f) => setTimeout(f, ms);
  const say = (list, ms = 2600, fx) => E.say(pick(list), ms, false, fx);
  const full = () => on() && N.hunger > 92;

  // ---------- Textos ----------
  const L = ES ? {
    hunger: [["Me suenan las tripas…", "¿Hay algo de picar por aquí?", "Me comería una galletita…"], ["*Grrr*… perdón, era mi tripa", "Me comería una galleta entera. O dos.", "Tengo un hambre que me muero (un poco)"]],
    energy: [["Uaaah… qué sueño", "Se me cierran los ojitos…"], ["Necesito una siestecita…", "No puedo más… zzz… ¡estoy despierto!"]],
    fun: [["Me aburrooo…", "Qué día más soso…"], ["¿Jugamos a algo? Porfa, porfa", "Me aburro muchísimo…"]],
    love: [["¿Me haces un poquito de caso?", "Hola… sigo aquí"], ["Nadie me hace caso hoy…", "¿Te has olvidado de mí?"]],
    nap: ["Me echo un ratito, ¿vale?", "Siestecita… solo cinco minutos"],
    fedLow: ["¡Ahora sí! Qué falta me hacía", "¡Ñam! Me has salvado"],
    lovedLow: ["¡Por fin! Te echaba de menos", "¡Hola, hola! ¡Qué ilusión!"],
    happy: ["¡Qué bien estoy contigo!", "Hoy estoy de lujo", "¡Me siento genial!"],
    full: ["¡Estoy llenísimo!", "No me cabe nada más…", "Luego, que voy a explotar"],
    tired: ["Juego… pero con sueño", "Vale… *bostezo*… juego"],
  } : {
    hunger: [["My tummy is rumbling…", "Any snacks around here?", "I could go for a cookie…"], ["*Grrr*… sorry, that was my tummy", "I could eat a whole cookie. Or two.", "I'm starving (a little)"]],
    energy: [["Yaaawn… so sleepy", "My eyes keep closing…"], ["I need a little nap…", "Can't… zzz… I'm awake!"]],
    fun: [["I'm so booored…", "Such a dull day…"], ["Shall we play? Pretty please", "I'm sooo bored…"]],
    love: [["Pay me a little attention?", "Hi… I'm still here"], ["Nobody's paying attention to me today…", "Did you forget about me?"]],
    nap: ["I'll lie down for a bit, okay?", "Little nap… just five minutes"],
    fedLow: ["Now we're talking! I needed that", "Yum! You saved me"],
    lovedLow: ["Finally! I missed you", "Hi, hi! Yay!"],
    happy: ["I love being with you!", "Feeling great today", "I feel awesome!"],
    full: ["I'm stuffed!", "I can't fit anything else…", "Later, or I'll pop"],
    tired: ["I'll play… sleepily", "Okay… *yawn*… let's play"],
  };

  // ---------- Bocadillo con lo que quiere ----------
  const stage = E.stage;
  let wishEl = document.getElementById("wish");
  if (!wishEl) { wishEl = document.createElement("div"); wishEl.id = "wish"; wishEl.innerHTML = "<img alt=\"\">"; stage.appendChild(wishEl); }
  const artSrc = (id) => { const n = document.getElementById(id); return n ? (n.getAttribute("href") || n.getAttribute("xlink:href") || "") : ""; };
  let wishT = 0;
  function wish(kind, secs = 4) {
    if (A.hidden) return;                                   // escondido (o en el móvil): no pide nada aquí
    const src = artSrc(WISH[kind]); if (!src) return;
    wishEl.querySelector("img").src = src;
    wishEl.dataset.k = kind;
    stage.classList.add("wishing");
    clearTimeout(wishT); wishT = setTimeout(() => stage.classList.remove("wishing"), secs * 1000);
  }

  // ---------- Gestos propios ----------
  const lerp = (a, b, t) => a + (b - a) * t;
  // Se frota la barriga mirándosela, con cara de pena; al final te mira de reojo
  E.ACTIONS.rubBelly = { dur: 3.4, f(P, k, e) {
    const r = Math.sin(A.t * 7.5);
    P.front = true;
    P.aL = lerp(P.aL, -48 + r * 5, e); P.aR = lerp(P.aR, 52 - r * 9, e);
    P.brows = "worried";
    if (k < 0.7) { P.nod += 5 * e; P.eyeY = 3.5 * e; P.eyeX = 0; P.sway += r * 1.2 * e; }
    else { P.eyeX = 4 * e; P.eyeY = 0; P.tilt += 6 * e; }
    P.sy *= 1 - 0.02 * e;
  } };
  // Suspiro de aburrimiento: coge aire (se hincha), lo suelta despacio (se desinfla) y se queda mustio
  E.ACTIONS.sigh = { dur: 3.0, f(P, k, e) {
    const inhale = k < 0.3 ? k / 0.3 : 0, exhale = k >= 0.3 ? Math.min((k - 0.3) / 0.45, 1) : 0;
    const s = inhale - exhale * 1.6;
    P.sy *= 1 + 0.05 * s * e; P.sx *= 1 - 0.03 * s * e;
    P.eyes = k > 0.3 ? "half" : null; P.eyeY = 2 * exhale * e;
    P.aL = lerp(P.aL, 6 * exhale, e); P.aR = lerp(P.aR, -6 * exhale, e);
    P.nod += 4 * exhale * e; P.brows = "sad";
  } };
  // Cabezada de sueño: se le cae la cabeza, se despierta de golpe
  E.ACTIONS.nodOff = { dur: 2.6, f(P, k, e) {
    const drop = k < 0.65 ? Math.pow(k / 0.65, 2) : 0;
    P.eyes = k < 0.65 ? (k > 0.25 ? "closed" : "half") : "open";
    P.nod += 10 * drop * e; P.tilt += 7 * drop * e;
    if (k >= 0.65 && k < 0.8) { P.eyeScale = 1.25; P.lift += 4 * Math.sin((k - 0.65) / 0.15 * Math.PI); }
  } };

  // ---------- Cómo se le nota ----------
  const low = () => KINDS.reduce((a, k) => (N[k] < N[a] ? k : a), KINDS[0]);
  E.HOOKS.pose.push((P) => {
    if (!on() || S.sleeping || A.action) return;
    if (N.energy < 20 && !P.eyes) P.eyes = "half";
    const worst = N[low()];
    if (worst < 20) { P.sy *= 0.985; P.nod += 2; }
  });
  E.HOOKS.tick.push(() => {
    // el bocadillo de deseo se quita si abres su menú o se duerme
    if (stage.classList.contains("wishing") && (S.sleeping || (window.EkoMenu && window.EkoMenu.isOpen && window.EkoMenu.isOpen()))) stage.classList.remove("wishing");
    if (!on() || S.mode !== "walk" || S.speed > 50) return;
    if (N.energy < 25 || N.hunger < 20) S.speed = 30;       // con sueño o hambre anda más despacio
  });

  // Cada medio minuto mira si le falta algo. Avisa como mucho cada 6-12 min, y nunca si estás a lo tuyo.
  setInterval(() => {
    if (!on() || E.A.hidden || S.sleeping || S.dragging || E.busy()) return;
    if (window.EkoMenu && window.EkoMenu.isOpen && window.EkoMenu.isOpen()) return;
    const now = Date.now(), k = low(), v = N[k];
    const idleMin = (now - E.lastInteraction()) / 60000;
    // Siesta sola si está agotado y no le estás haciendo caso
    if (k === "energy" && v < 12 && idleMin > 2) { say(L.nap, 2400); setTimeout(() => { E.goToSleep(false); napping = true; }, 1800); return; }
    if (v >= 40) {
      // Todo bien: de vez en cuando lo celebra
      if (KINDS.every((x) => N[x] >= 75) && now > N.happyAt) {
        N.happyAt = now + (20 + Math.random() * 25) * 60000; save();
        if (Math.random() < 0.5) { E.setDance(true); setTimeout(() => E.setDance(false), 4500); } else { E.express("feliz", 3); E.fx("heart", 1); }
        if (Math.random() < 0.5) say(L.happy, 2400);
      }
      return;
    }
    if (now < N.hintAt) return;
    const sev = v < 20 ? 1 : 0;
    N.hintAt = now + (sev ? 6 : 12) * 60000 * (0.85 + Math.random() * 0.3); save();
    hint(k, sev);
  }, 30000);

  function hint(k, sev) {
    if (A.hidden) return;
    wish(k, 4.2);
    if (k === "hunger") { E.act("rubBelly"); later(600, () => say(L.hunger[sev], 2600)); }
    else if (k === "energy") { E.act(sev ? "nodOff" : "yawn"); later(sev ? 1900 : 900, () => say(L.energy[sev], 2400)); }
    else if (k === "fun") {
      E.act("sigh"); later(1300, () => say(L.fun[sev], 2400));
      if (sev && window.EkoMenu && window.EkoMenu.propose) later(4500, () => window.EkoMenu.propose());
    } else {
      // Se acerca a tu ratón y te saluda tímido
      E.curious(); later(2600, () => { E.act("wave"); E.express("esperanzado", 2.5); say(L.love[sev], 2600); });
    }
  }

  // ---------- Para la libreta y la IA ----------
  const WORDS = ES
    ? { hunger: ["Muerto de hambre", "Con hambre", "Bien", "Lleno"], energy: ["Agotado", "Cansado", "Bien", "A tope"], fun: ["Aburridísimo", "Aburrido", "Bien", "Feliz"], love: ["Solito", "Echándote de menos", "Bien", "Muy querido"] }
    : { hunger: ["Starving", "Hungry", "Fine", "Full"], energy: ["Exhausted", "Tired", "Fine", "Full of beans"], fun: ["Super bored", "Bored", "Fine", "Happy"], love: ["Lonely", "Missing you", "Fine", "Very loved"] };
  const level = (v) => (v < 20 ? 0 : v < 40 ? 1 : v < 75 ? 2 : 3);
  const word = (k) => WORDS[k][level(N[k])];
  function describe() {
    if (!on()) return "";
    const p = [];
    if (N.hunger < 40) p.push(N.hunger < 20 ? "tienes muchísima hambre" : "tienes hambre");
    if (N.energy < 40) p.push(N.energy < 20 ? "estás agotado" : "tienes sueño");
    if (N.fun < 40) p.push(N.fun < 20 ? "te aburres muchísimo" : "estás algo aburrido");
    if (N.love < 40) p.push(N.love < 20 ? "te sientes solo y con ganas de mimos" : "tienes ganas de que te hagan caso");
    if (!p.length) return KINDS.every((x) => N[x] >= 75) ? " Estás de muy buen humor." : "";
    return " Cómo te sientes: " + p.join(", ") + " (se te puede notar un poco, sin quejarte en cada frase).";
  }

  return { get: () => ({ ...N }), set: (k, v) => { N[k] = v; save(); }, hint, give, full, describe, word, level, wish, KINDS, WISH, on, L, onChange: null };
})();
