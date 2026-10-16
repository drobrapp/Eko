// Eko · juegos (fase 4): ¿Qué mano?, atrapa galletas, tócame donde brille y adivina qué pienso.
// Usa las capas y partículas de los trucos (EkoTricks.kit). Eko habla durante los juegos con frases
// variadas que no se repiten seguidas.
window.EkoGames = (() => {
  "use strict";
  const E = window.Eko, T = window.EkoTricks;
  if (!E || !T || !T.kit) return null;
  const { A, S } = E;
  const K = T.kit, { lerp, clamp, sm, back, ease, tone } = K;
  const NS = "http://www.w3.org/2000/svg";
  const TAU = Math.PI * 2;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
  };
  const invoke = window.__TAURI__ ? window.__TAURI__.core.invoke : null;
  const TEV = window.__TAURI__ ? window.__TAURI__.event : null;
  const M = () => window.EkoMenu;
  const PG = () => window.EkoProgress;
  const best = store.get("eko-game-best", {});
  const saveBest = () => store.set("eko-game-best", best);

  // ---------- Frases (muchas, para que no se repita) ----------
  const L = {
    // ¿Qué mano?
    handIntro: ["Tengo algo escondido en una mano…", "Mira, mira… ¿qué tendré aquí?", "Te he guardado una cosita. Pero ¿dónde?", "Cierra los ojos… ¡no, mejor no! Fíjate bien", "Un, dos, tres… ¡escondido!", "Esto lo he encontrado yo solito. ¿A que no adivinas dónde está?", "Truco de manos: atento, que voy rápido"],
    handAsk: ["¿En cuál está?", "¿Izquierda o derecha?", "¿Qué mano eliges?", "Elige bien, ¿eh?", "¿Dónde crees que está?", "Venga, ¿cuál?", "Tienes un cincuenta por ciento… ¿cuál?"],
    handWait: ["¿Te lo piensas mucho, eh?", "No hace falta mirarme tanto, no te voy a dar pistas", "Tic, tac…", "Me están sudando las manitas", "Te doy una pista: está en una de las dos", "¿Pito, pito, gorgorito?"],
    handYes: ["¡Bien visto!", "¡Ahí estaba!", "¡Ojo de halcón!", "¿Cómo lo has sabido? ¿Me has espiado?", "¡Correcto! Es para ti", "¡Toma ya!", "Vale, tienes buen ojo"],
    handNo: ["¡Puf! Nada por aquí…", "¡Fallaste! Estaba en la otra", "Jijiji, esa estaba vacía", "Nop. Mira, aquí estaba", "Esa no era, ¡te he engañado!", "Casi… era la otra"],
    handStreak: ["¡{n} seguidas! Tienes rayos X", "¡Llevas {n} de racha!", "{n} aciertos seguidos… ¿haces trampas?", "¡Racha de {n}! Estoy impresionado"],
    handAgain: ["¿Otra ronda?", "¿Repetimos?", "¿Te atreves con otra?", "¿La revancha?"],
    handBye: ["¡Qué bien me lo he pasado!", "Vale, guardo mis tesoros", "Cuando quieras jugamos otra vez", "Mis manos y yo nos retiramos"],
    // Atrapa galletas
    catchIntro: ["¡Llueven galletas! Cógeme y llévame debajo", "¡Cesta lista! Arrástrame para pillar las galletas", "Las buenas suman, las quemadas restan. ¡Muéveme!", "Hoy cenamos galletas. ¡Llévame de un lado a otro!"],
    catchGo: ["¡Ya!", "¡Allá van!", "¡Que empiece la lluvia!", "¡Atento!"],
    catchGood: ["¡Ñam!", "¡Dentro!", "¡Esa es mía!", "¡Bien!", "¡Pillada!", "¡A la cesta!", "Mmm, de chocolate", "¡Otra más!", "¡Qué rica!"],
    catchBurnt: ["¡Puaj, quemada!", "¡Esa no, que está carbonizada!", "Ugh, sabe a carbón", "¡Cuidado con las negras!", "¡Esa resta!", "¿Quién ha horneado esto?"],
    catchMiss: ["¡Se escapó!", "Uy, al suelo", "¡Por poco!", "Esa iba muy rápida"],
    catchFaster: ["¡Ahora caen más rápido!", "¡Se complica la cosa!", "¡Más galletas! ¡Más!", "¡Que no paran!", "Esto se pone serio"],
    catchMile: ["¡{n} galletas! La cesta pesa", "¡Ya van {n}!", "¡{n}! Esto es un festín", "¡{n} galletas y subiendo!"],
    catchEnd: ["¡Se acabó la lluvia!", "¡Tiempo!", "¡Fin! A ver qué tenemos", "¡Ya está! Uf, qué agujetas"],
    catchCount: ["A ver, a contar…", "Vamos a hacer recuento…", "Déjame contar…", "Una, dos, tres… a ver…"],
    medalGold: ["¡Medalla de ORO! Eres un crack", "¡ORO! Las galletas no tenían nada que hacer", "¡Oro! Te nombro maestro galletero"],
    medalSilver: ["¡Plata! Muy, muy bien", "¡Medalla de plata! Casi el oro", "¡Plata! La próxima va el oro"],
    medalBronze: ["¡Bronce! Algo es algo", "¡Medalla de bronce! Vamos mejorando", "¡Bronce! Y me he comido unas cuantas"],
    medalNone: ["Esta vez sin medalla… pero ha estado divertido", "Pocas galletas… ¡la próxima lo bordamos!", "Sin medalla, pero con la barriga contenta"],
    record: ["¡Y es récord!", "¡Nuevo récord!", "¡Récord personal!"],
    // Tócame donde brille
    glowIntro: ["¡Toca donde me brille! Rápido, que se apaga", "Se me va a encender una lucecita… ¡tócala!", "Juego de reflejos: toca el brillo antes de que se apague", "¿Tienes buenos reflejos? ¡Vamos a verlo!"],
    glowHit: ["¡Ahí!", "¡Bien!", "¡Rápido!", "¡Eso es!", "¡Jijiji!", "¡Me haces cosquillas!", "¡Zas!", "¡Qué reflejos!"],
    glowMiss: ["¡Se apagó!", "¡Uy, tarde!", "¡Ay, esa se escapó!", "Muy lento… ¡venga!", "¡Casi!"],
    glowFaster: ["¡Ahora más rápido!", "¡Acelero!", "¡Que no te pille!", "¡Esto va a toda pastilla!"],
    glowEnd: ["¡Se acabaron las luces!", "¡Fin del juego!", "¡Uf, me he quedado sin pilas!"],
    glowScore: ["¡{n} toques!", "Has pillado {n}", "{n} brillos atrapados", "Resultado: {n}"],
    // Adivina qué pienso
    guessIntro: ["Estoy pensando en algo…", "Mmm… ya lo tengo en la cabeza", "He pensado una cosa. ¡Adivínala!", "Tengo una idea… a ver si la pillas"],
    guessHint: ["Otra pista…", "Te ayudo un poco…", "Vale, más pistas…", "A ver esta…"],
    guessYes: ["¡Exacto!", "¡Me has leído la mente!", "¡Sí! ¿Cómo lo sabías?", "¡Correcto!", "¡Eso pensaba!"],
    guessNo: ["Nooo…", "Frío, frío", "No es eso", "¡Huy, no!", "Ni de lejos"],
    guessReveal: ["Era {x}", "¡Pensaba en {x}!", "La respuesta era {x}"],
    guessNext: ["Siguiente…", "Otra más…", "Vamos con otra…", "Ahora otra cosa…"],
    guessEnd: ["¡{n} puntos!", "Total: {n} puntos", "Has sacado {n} puntos"],
    guessGood: ["Me lees la mente", "Somos tal para cual", "¡Qué conexión!"],
    guessBad: ["Mi cabeza es un misterio", "Pienso cosas muy raras, lo sé", "La próxima te lo pongo más fácil"],
    start: ["¡A jugar!", "¡Bien!", "¡Vamos allá!"],
  };
  const lastIx = {};
  function line(key, vars) {
    const arr = L[key]; if (!arr) return key;
    let i = Math.floor(Math.random() * arr.length);
    if (arr.length > 2 && i === lastIx[key]) i = (i + 1 + Math.floor(Math.random() * (arr.length - 1))) % arr.length;
    lastIx[key] = i;
    let t = arr[i];
    if (vars) for (const k in vars) t = t.replace("{" + k + "}", vars[k]);
    return t;
  }
  // gesture: solo expresiones o efectos (nunca acciones, que cortarían la animación del juego)
  const say = (key, ms = 2200, expr, vars) => E.say(L[key] ? line(key, vars) : key, ms, true, expr || null);
  const later = (ms, fn) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  const timers = new Set();
  const clearTimers = () => { for (const t of timers) clearTimeout(t); timers.clear(); };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // Capa propia (no la borra el limpiado de los trucos)
  const gl = document.createElementNS(NS, "g"); gl.id = "gameLayer";
  E.el.pet.appendChild(gl);
  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML = `<radialGradient id="ekoGlowG"><stop offset="0" stop-color="#FFF6C8" stop-opacity="1"/><stop offset=".45" stop-color="#FFD86B" stop-opacity=".85"/><stop offset="1" stop-color="#FFB13B" stop-opacity="0"/></radialGradient>`;
  E.el.pet.ownerSVGElement.appendChild(defs);

  let game = null;                         // juego en marcha: { id, pose(P,t), draw(), end() }
  E.HOOKS.pose.push((P, t) => { if (game && game.pose) game.pose(P, t); });
  E.HOOKS.draw.push(() => {
    if (gl.nextSibling) E.el.pet.appendChild(gl);
    if (game && game.draw) game.draw();
  });
  E.HOOKS.tick.push(() => { if (game && (E.A.hidden || S.sleeping)) stop(true); });

  function begin(id, obj) {
    if (game) stop(true);
    if (M()) { M().close(); M().closeCard(); }
    if (S.sleeping) E.wakeUp(false);
    A.action = null;
    game = Object.assign({ id, t0: A.t }, obj);
    A.gameMode = id;
    E.hold(1e6);
  }
  function stop(quiet) {
    if (!game) return;
    const g = game; game = null; A.gameMode = null;
    clearTimers();
    try { g.end && g.end(quiet); } catch (_) {}
    gl.innerHTML = "";
    if (M()) M().closeCard();
    E.setHitFull(false);
    E.hold(2);
  }
  const card = (html) => M() && M().card(html);
  const closeCard = () => M() && M().closeCard();
  const chips = (q, opts) => `<p>${q}</p><div class="chips">${opts.map(([cls, txt, main]) => `<button type="button" class="chip ${main ? "main " : ""}${cls}">${txt}</button>`).join("")}</div>`;

  // =================================================================
  // 1) ¿Qué mano?
  const HAND_ITEMS = [["artCookie", 34, "una galleta"], ["artBall", 30, "mi pelota"], ["artJuggle", 26, "una bolita"], ["artHeart", 30, "un corazón"], ["artSpark", 32, "una estrella"], ["artCamera", 34, "una cámara"], ["artNote", 28, "una nota musical"], ["artSeed", 26, "una semilla"], ["artDrop", 24, "una gota"]];
  let handStreak = 0;
  function startHand() {
    begin("hand", {
      phase: "hide", ph0: A.t, side: "L", pick: null, item: null, el: null, puffed: false, shown: null, waitT: 0,
      pose(P, t) {
        const g = game, dt = t - g.ph0;
        P.front = true;
        if (g.phase === "hide") {                       // se cambia la cosa de mano a escondidas
          const sw = Math.sin(dt * 7);
          P.aL = lerp(P.aL, 14 + sw * 10, 0.6); P.aR = lerp(P.aR, -14 + sw * 10, 0.6);
          P.turn += Math.sin(dt * 3.5) * 0.25; P.eyes = P.eyes || (dt % 1.4 < 0.7 ? "squint" : null);
          P.eyeY = 5; P.eyeX = sw * 4; P.nod += Math.sin(dt * 7) * 1.5;
          P.mouth = Math.max(P.mouth, 0.12);
        } else if (g.phase === "wait") {                // puños delante, esperando
          const m = back(clamp(dt / 0.45, 0, 1));
          P.aL = lerp(P.aL, 46, m); P.aR = lerp(P.aR, -46, m);
          P.nod += Math.sin(dt * 2.6) * 2; P.tilt += Math.sin(dt * 1.7) * 3; P.brows = "up";
          P.eyeX = Math.sin(dt * 1.3) * 3;
        } else if (g.phase === "reveal") {              // abre la mano elegida (y si falló, enseña la otra)
          const raiseL = g.shown === "L" ? 1 : 0, raiseR = g.shown === "R" ? 1 : 0;
          const m = back(clamp((t - g.showT) / 0.35, 0, 1));
          P.aL = lerp(46, raiseL ? 100 : 30, raiseL ? m : 0.6); P.aR = lerp(-46, raiseR ? -100 : -30, raiseR ? m : 0.6);
          if (g.ok) { P.eyes = "happy"; P.mouth = Math.max(P.mouth, 0.35); P.tilt += 5 * (g.shown === "R" ? 1 : -1); }
          else if (!g.secondT || t < g.secondT) { P.brows = "up"; P.mouth = Math.max(P.mouth, 0.3); P.eyeX = g.shown === "R" ? 4 : -4; }
          else { P.eyes = "wink"; P.mouth = Math.max(P.mouth, 0.3); }
        } else {
          P.aL = lerp(P.aL, 10, 0.5); P.aR = lerp(P.aR, -10, 0.5);
        }
      },
      draw() {
        const g = game; if (!g.el) return;
        if (!g.shown || !g.itemSide) { g.el.setAttribute("opacity", "0"); return; }
        const H = K.hands()[g.itemSide];
        const s = back(clamp((A.t - g.itemT) / 0.4, 0, 1));
        K.place(g.el, H.x, H.y - 20 * s, Math.sin(A.t * 3) * 8, Math.max(0.01, s), 1);
      },
      end() { gl.innerHTML = ""; },
    });
    handRound(true);
  }
  function handRound(first) {
    const g = game; if (!g || g.id !== "hand") return;
    closeCard();
    gl.innerHTML = "";
    const it = pick(HAND_ITEMS);
    g.item = it; g.el = K.img(it[0], gl, it[1] * 1.3, it[1] * 1.3); g.el.setAttribute("opacity", "0");
    g.side = Math.random() < 0.5 ? "L" : "R";
    g.phase = "hide"; g.ph0 = A.t; g.shown = null; g.itemSide = null; g.ok = null; g.secondT = 0;
    say("handIntro", 2000, "picaro");
    tone("sine", 500, 700, 0.1, 0.02);
    later(1900, () => {
      if (!game || game.id !== "hand") return;
      g.phase = "wait"; g.ph0 = A.t;
      say("handAsk", 2400);
      const c = card(chips(line("handAsk"), [["l", "← Izquierda", true], ["r", "Derecha →", true]]));
      if (!c) return;
      c.querySelector(".l").addEventListener("click", () => handChoose("L"));
      c.querySelector(".r").addEventListener("click", () => handChoose("R"));
      g.nag = later(7000, () => { if (game && game.phase === "wait") say("handWait", 2400); });
      g.out = later(30000, () => { if (game && game.phase === "wait") { say("handBye", 2000); stop(); } });
    });
  }
  function handChoose(side) {
    const g = game; if (!g || g.phase !== "wait") return;
    closeCard();
    g.phase = "reveal"; g.ph0 = A.t; g.pickSide = side; g.ok = side === g.side;
    g.shown = side; g.showT = A.t;
    if (g.ok) {
      g.itemSide = side; g.itemT = A.t + 0.15;
      later(250, () => { const H = K.hands()[side]; K.sparkle(H.x, H.y - 20, 5, gl); tone("sine", 660, 990, 0.18, 0.03); E.Voice.chirp && E.Voice.chirp(); });
      handStreak++;
      if (PG()) PG().event("handStreak", handStreak);
      if (handStreak > (best.hand || 0)) { best.hand = handStreak; saveBest(); }
      later(500, () => say(handStreak >= 3 && Math.random() < 0.6 ? "handStreak" : "handYes", 2400, "emocionado", { n: handStreak }));
    } else {
      later(250, () => { const H = K.hands()[side]; K.smoke(H.x, H.y - 6, 6, gl, 34); tone("sawtooth", 700, 220, 0.2, 0.02, 1100); });
      handStreak = 0;
      later(450, () => say("handNo", 2400, "picaro"));
      g.secondT = A.t + 1.1;
      later(1100, () => { if (!game || game.id !== "hand") return; g.shown = g.side; g.showT = A.t; g.itemSide = g.side; g.itemT = A.t; });
    }
    later(g.ok ? 2600 : 3200, () => {
      if (!game || game.id !== "hand") return;
      const c = card(chips(line("handAgain"), [["y", "¡Otra!", true], ["n", "Ya está"]]));
      if (!c) return;
      c.querySelector(".y").addEventListener("click", () => handRound(false));
      c.querySelector(".n").addEventListener("click", () => { closeCard(); say("handBye", 2200, "feliz"); stop(); });
      later(20000, () => { if (game && game.id === "hand" && game.phase === "reveal") { closeCard(); stop(); } });
    });
  }

  // =================================================================
  // 2) Atrapa galletas (las galletas caen en una ventana transparente a pantalla completa)
  function startCatch() {
    if (!invoke || !TEV || !E.native) { E.say("Este juego solo funciona en el escritorio", 2600, true); return; }
    const w = E.world;
    begin("catch", {
      basket: K.img("artIcBasket", gl, 112, 112), score: 0, good: 0, burnt: 0, lvl: 0, acked: false, unl: [],
      pose(P) {
        P.front = true;
        P.aL = lerp(P.aL, 20, 0.85); P.aR = lerp(P.aR, -20, 0.85);
        if (game.happyT && A.t < game.happyT) { P.eyes = "happy"; P.mouth = Math.max(P.mouth, 0.3); }
        if (game.yuckT && A.t < game.yuckT) { P.eyes = "squint"; P.brows = "worried"; P.mouth = Math.max(P.mouth, 0.2); }
      },
      draw() {
        const H = K.hands();
        const x = (H.L.x + H.R.x) / 2, y = (H.L.y + H.R.y) / 2 + 14;
        const bob = game.bumpT && A.t < game.bumpT ? Math.sin((game.bumpT - A.t) * 30) * 3 : 0;
        K.place(game.basket, x, y + bob, (H.R.y - H.L.y) * 0.3, 1, 1);
      },
      end() {
        for (const u of game_unl) try { u(); } catch (_) {}
        game_unl.length = 0;
        clearInterval(sendT); clearInterval(startT);
        invoke("catch_hide").catch(() => {});
      },
    });
    const g = game;
    say("catchIntro", 3200, "emocionado");
    invoke("catch_show", { x: w.left, y: w.top, w: w.width, h: w.height }).catch(() => { say("Uy, no puedo abrir la lluvia de galletas", 2400); stop(true); });
    const payload = { left: w.left, top: w.top, dur: 45 };
    startT = setInterval(() => { if (!g.acked) TEV.emit("catch-start", payload); else clearInterval(startT); }, 300);
    sendT = setInterval(() => {
      if (game !== g) return;
      const r = g.basket.getBoundingClientRect();
      if (!r.width) return;
      TEV.emit("catch-basket", { x: S.x + r.left + r.width / 2, y: S.y + r.top + r.height * 0.32, w: r.width * 0.82 });
    }, 33);
    const on = (ev, fn) => TEV.listen(ev, (e) => { if (game === g) fn(e.payload || {}); }).then((u) => game_unl.push(u));
    on("catch-ack", () => { g.acked = true; later(900, () => say("catchGo", 1400, "emocionado")); });
    let lastTalk = 0;
    on("catch-hit", (p) => {
      g.score = p.score; g.good = p.good; g.burnt = p.burnt;
      g.bumpT = A.t + 0.25;
      const r = g.basket.getBoundingClientRect();
      if (p.kind === "good") {
        g.happyT = A.t + 0.5;
        K.sparkle(0, 120, 2, gl);
        tone("sine", 600 + Math.min(600, p.good * 12), 900 + Math.min(600, p.good * 12), 0.08, 0.025);
        if (p.good % 10 === 0) say("catchMile", 1800, "emocionado", { n: p.good });
        else if (A.t - lastTalk > 5 && Math.random() < 0.35) { lastTalk = A.t; say("catchGood", 1200); }
      } else {
        g.yuckT = A.t + 0.8;
        K.smoke(0, 110, 4, gl, 28);
        tone("sawtooth", 300, 140, 0.18, 0.02, 600);
        if (A.t - lastTalk > 2.5) { lastTalk = A.t; say("catchBurnt", 1500, "molesto"); }
      }
      void r;
    });
    on("catch-level", () => { if (A.t - lastTalk > 2) { lastTalk = A.t; say("catchFaster", 1600, "sorprendido"); } });
    on("catch-miss", () => { if (A.t - lastTalk > 7 && Math.random() < 0.3) { lastTalk = A.t; say("catchMiss", 1300); } });
    on("catch-end", (p) => {
      const sc = Math.max(0, p.score || 0);
      invoke("catch_hide").catch(() => {});
      g.over = true;
      say("catchEnd", 1800);
      later(1900, () => tally(sc, p.good || 0, p.burnt || 0));
    });
  }
  let sendT = 0, startT = 0;
  const game_unl = [];
  const MEDALS = { gold: ["Oro", "none", "medalGold"], silver: ["Plata", "grayscale(1) brightness(1.18) contrast(.95)", "medalSilver"], bronze: ["Bronce", "sepia(.55) saturate(1.5) hue-rotate(-18deg) brightness(.82)", "medalBronze"] };
  function tally(sc, good, burnt) {
    if (!game || game.id !== "catch") return;
    say("catchCount", 1600, "curioso");
    const medal = sc >= 30 ? "gold" : sc >= 18 ? "silver" : sc >= 8 ? "bronze" : null;
    const rec = sc > (best.catch || 0);
    if (rec) { best.catch = sc; saveBest(); }
    const c = card(`<p class="gcount"><b>0</b> puntos</p><p class="gsub">${good} buenas · ${burnt} quemadas</p>`);
    if (!c) { stop(); return; }
    const b = c.querySelector("b");
    let n = 0;
    const steps = Math.max(1, sc), stepMs = Math.max(45, Math.min(140, 1600 / steps));
    const tick = () => {
      if (!game || game.id !== "catch") return;
      if (n < sc) { n++; b.textContent = n; tone("sine", 500 + n * 9, 520 + n * 9, 0.05, 0.02); later(stepMs, tick); return; }
      later(500, () => {
        if (!game || game.id !== "catch") return;
        if (medal) {
          const [name, filter, key] = MEDALS[medal];
          const src = K.art("artMedal");
          const c2 = card(`<div class="gmedal"><img src="${src}" alt="" style="filter:${filter}"><div><b>Medalla de ${name.toLowerCase()}</b><span>${sc} puntos${rec ? " · ¡récord!" : ""}</span></div></div><div class="chips"><button type="button" class="chip main y">¡Otra vez!</button><button type="button" class="chip n">Ya está</button></div>`);
          E.fx("spark", 3); E.hop && E.hop(-360);
          tone("sine", 700, 1200, 0.25, 0.03);
          say(key, 3000, medal === "gold" ? "orgulloso" : "feliz");
          if (rec) later(3100, () => say("record", 1800, "emocionado"));
          wireAgain(c2, startCatch);
        } else {
          const c2 = card(`<p class="gcount"><b>${sc}</b> puntos</p><div class="chips"><button type="button" class="chip main y">¡Otra vez!</button><button type="button" class="chip n">Ya está</button></div>`);
          say("medalNone", 2800, "esperanzado");
          wireAgain(c2, startCatch);
        }
      });
    };
    later(700, tick);
  }
  function wireAgain(c, fn) {
    if (!c) { stop(); return; }
    c.querySelector(".y").addEventListener("click", () => { stop(true); setTimeout(fn, 200); });
    c.querySelector(".n").addEventListener("click", () => { stop(); });
    later(25000, () => stop());
  }

  // =================================================================
  // 3) Tócame donde brille
  const PARTS = ["head", "belly", "L", "R", "footL", "footR"];
  const ctmPoint = (el, x, y) => {
    const p = E.el.pet.ownerSVGElement.createSVGPoint(); p.x = x; p.y = y;
    return p.matrixTransform(gl.getScreenCTM().inverse().multiply(el.getScreenCTM()));
  };
  function spotOf(part) {
    try {
      if (part === "L" || part === "R") { const h = K.hands()[part]; return { x: h.x, y: h.y }; }
      if (part === "head") {
        const hp = E.el.head.querySelector(":scope > path") || E.el.head, b = hp.getBBox();
        return ctmPoint(hp, b.x + b.width / 2, b.y + b.height * 0.32);
      }
      const lg = E.el.legs, b = lg.getBBox();
      if (part === "footL") return ctmPoint(lg, b.x + b.width * 0.22, b.y + b.height - 8);
      if (part === "footR") return ctmPoint(lg, b.x + b.width * 0.78, b.y + b.height - 8);
      const top = ctmPoint(lg, b.x + b.width / 2, b.y);
      return { x: top.x, y: top.y - 30 };
    } catch (_) { return { x: 0, y: 60 }; }
  }
  function startGlow() {
    const tap = document.createElement("div");
    tap.className = "gametap";
    tap.innerHTML = `<div class="ghud"><img src="${K.art("artIcGlow")}" alt=""><b>0</b><span class="glives">●●●</span><button type="button" class="gx" aria-label="Salir">×</button></div>`;
    E.stage.appendChild(tap);
    const halo = document.createElementNS(NS, "circle"); halo.setAttribute("fill", "url(#ekoGlowG)");
    const ring = document.createElementNS(NS, "circle"); ring.setAttribute("fill", "none"); ring.setAttribute("stroke", "#FFC94D"); ring.setAttribute("stroke-width", "3"); ring.setAttribute("stroke-linecap", "round");
    begin("glow", {
      hits: 0, lives: 3, part: null, on: false, onT: 0, win: 1.8, react: null,
      pose(P, t) {
        const g = game;
        P.front = true;
        if (g.part && g.on) { const s = spotOf(g.part); P.eyeX = clamp(s.x / 12, -5, 5); P.eyeY = clamp((s.y - 20) / 18, -4, 6); }
        const r = g.react; if (!r) return;
        const k = (t - r.t0) / 0.55; if (k > 1) { g.react = null; return; }
        const w = Math.sin(Math.PI * k);
        if (r.part === "head") { P.eyes = "happy"; P.nod -= 6 * w; P.tilt += 8 * w; }
        else if (r.part === "belly") { P.eyes = "happy"; P.mouth = Math.max(P.mouth, 0.45 * w); P.sway += Math.sin(k * 20) * 5 * w; }
        else if (r.part === "L") { P.aL = lerp(P.aL, 120, w); P.eyes = "happy"; }
        else if (r.part === "R") { P.aR = lerp(P.aR, -120, w); P.eyes = "happy"; }
        else if (r.part === "footL") { P.legL = (P.legL || 0) - 16 * w; P.eyes = "happy"; P.lift += 4 * w; }
        else if (r.part === "footR") { P.legR = (P.legR || 0) - 16 * w; P.eyes = "happy"; P.lift += 4 * w; }
      },
      draw() {
        const g = game;
        if (!g.part || !g.on) { halo.setAttribute("opacity", "0"); ring.setAttribute("opacity", "0"); return; }
        const s = spotOf(g.part), k = clamp((A.t - g.onT) / g.win, 0, 1);
        const pulse = 1 + Math.sin(A.t * 14) * 0.08, inn = back(clamp((A.t - g.onT) / 0.18, 0, 1));
        halo.setAttribute("cx", s.x.toFixed(1)); halo.setAttribute("cy", s.y.toFixed(1)); halo.setAttribute("r", (26 * pulse * inn).toFixed(1)); halo.setAttribute("opacity", "1");
        const R = 24; ring.setAttribute("cx", s.x.toFixed(1)); ring.setAttribute("cy", s.y.toFixed(1)); ring.setAttribute("r", R);
        ring.setAttribute("stroke-dasharray", `${(TAU * R * (1 - k)).toFixed(1)} 999`); ring.setAttribute("transform", `rotate(-90 ${s.x.toFixed(1)} ${s.y.toFixed(1)})`); ring.setAttribute("opacity", (0.9 * inn).toFixed(2));
        if (k >= 1) glowMiss();
      },
      end() { tap.remove(); },
    });
    gl.appendChild(halo); gl.appendChild(ring);
    E.setHitFull(true);
    const g = game, hud = tap.querySelector(".ghud b"), lives = tap.querySelector(".glives");
    tap.querySelector(".gx").addEventListener("click", (e) => { e.stopPropagation(); say("glowEnd", 1800); glowFinish(); });
    tap.addEventListener("pointerdown", (e) => {
      if (!game || game !== g || !g.on || e.target.closest(".gx")) return;
      const p = E.el.pet.ownerSVGElement.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
      const q = p.matrixTransform(gl.getScreenCTM().inverse()), s = spotOf(g.part);
      if (Math.hypot(q.x - s.x, q.y - s.y) > 36) return;
      g.on = false; g.hits++; hud.textContent = g.hits;
      g.react = { part: g.part, t0: A.t };
      K.sparkle(s.x, s.y, 4, gl);
      tone("sine", 520 + g.hits * 30, 800 + g.hits * 30, 0.09, 0.03);
      if (g.hits % 6 === 0) say("glowFaster", 1500, "emocionado");
      else if (Math.random() < 0.3) say("glowHit", 1100);
      g.win = Math.max(0.6, 1.8 - g.hits * 0.07);
      later(Math.max(220, 520 - g.hits * 15), glowNext);
    });
    g.lifeEl = lives; g.tap = tap;
    say("glowIntro", 2600, "picaro");
    later(2400, glowNext);
  }
  function glowNext() {
    const g = game; if (!g || g.id !== "glow" || g.done) return;
    const opts = PARTS.filter((p) => p !== g.part);
    g.part = pick(opts); g.on = true; g.onT = A.t;
    tone("sine", 880, 880, 0.04, 0.015);
  }
  function glowMiss() {
    const g = game; if (!g || !g.on) return;
    g.on = false; g.lives--;
    g.lifeEl.textContent = "●".repeat(g.lives) + "○".repeat(3 - g.lives);
    tone("sawtooth", 400, 200, 0.15, 0.02, 700);
    if (g.lives <= 0) { say("glowEnd", 1800, "sorprendido"); later(1200, glowFinish); return; }
    say("glowMiss", 1300, "sorprendido");
    later(900, glowNext);
  }
  function glowFinish() {
    const g = game; if (!g || g.id !== "glow" || g.done) return;
    g.done = true; g.on = false;
    const n = g.hits, rec = n > (best.glow || 0);
    if (rec) { best.glow = n; saveBest(); }
    g.tap.style.pointerEvents = "none";
    const c = card(`<p class="gcount"><b>${n}</b> toques</p><p class="gsub">${rec ? "¡Nuevo récord!" : "Récord: " + (best.glow || 0)}</p><div class="chips"><button type="button" class="chip main y">¡Otra vez!</button><button type="button" class="chip n">Ya está</button></div>`);
    say("glowScore", 2200, n >= 15 ? "orgulloso" : "feliz", { n });
    if (rec && n > 3) later(2300, () => say("record", 1800, "emocionado"));
    wireAgain(c, startGlow);
  }

  // =================================================================
  // 4) Adivina qué pienso: 3 rondas, pistas de una en una (3, 2 o 1 punto)
  const THINGS = [
    ["una galleta", "Es redonda y crujiente", "Me la como en dos bocados", "A veces sale quemada"],
    ["una pelota", "Bota y rueda", "Me encanta que me la lances", "Es redonda pero no se come"],
    ["la luna", "Sale de noche", "A veces está entera y a veces a medias", "Brilla pero no da calor"],
    ["un paraguas", "Me salva de mojarme", "Se abre y se cierra", "Siempre te lo dejas en casa el día que llueve"],
    ["una cámara", "Hace clic", "Guarda recuerdos", "Tiene objetivo pero no tiene metas"],
    ["un café", "Huele de maravilla por la mañana", "Se toma en taza", "Te despierta"],
    ["un gato", "Tiene bigotes", "Duerme casi todo el día", "Hace miau"],
    ["una planta", "Necesita agua y sol", "Crece despacito", "Vive en una maceta"],
    ["una estrella", "Hay millones", "Brilla muy, muy lejos", "Se le piden deseos"],
    ["un tren", "Tiene vagones", "Va sobre raíles", "Hace chu-chú"],
    ["una pizza", "Lleva queso fundido", "Se corta en triángulos", "Viene de Italia"],
    ["un teclado", "Tiene muchas teclas", "Hace clac, clac", "Lo usas para escribir"],
    ["un reloj", "Tiene agujas pero no pincha", "Hace tic, tac", "Te dice cuándo llegas tarde"],
    ["una nube", "Flota en el cielo", "Es blanca y esponjosa", "A veces llueve de ella"],
    ["un helado", "Está muy frío", "Se derrite si no te das prisa", "Va en cucurucho"],
    ["un libro", "Tiene muchas páginas", "Cuenta historias", "Se lee"],
    ["una bici", "Tiene dos ruedas", "Lleva timbre", "Se pedalea"],
    ["una guitarra", "Tiene seis cuerdas", "Suena al rasgarla", "Ideal para cantar en una hoguera"],
    ["el sol", "Sale por la mañana", "Calienta muchísimo", "Mejor no mirarlo de frente"],
    ["un pingüino", "Vive donde hace mucho frío", "Va siempre de esmoquin", "Es un pájaro que no vuela"],
    ["un arcoíris", "Sale después de llover", "Tiene siete colores", "Dicen que al final hay un tesoro"],
    ["un cohete", "Hace un ruido tremendo", "Cuenta atrás: tres, dos, uno…", "Va al espacio"],
    ["una mariposa", "Antes era una oruga", "Revolotea entre las flores", "Tiene alas de colores"],
    ["un volcán", "Es una montaña con mal genio", "Mejor verlo de lejos", "Echa lava"],
    ["una almohada", "Es blandita", "Vive en la cama", "La abrazo para dormir"],
    ["un móvil", "Siempre lo llevas encima", "Tiene pantalla", "Vibra cuando te escriben"],
    ["una tortuga", "Va muy despacio", "Lleva su casa a cuestas", "Vive muchísimos años"],
    ["la nieve", "Es blanca y fría", "Cae en invierno", "Con ella se hacen muñecos"],
  ];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function startGuess() {
    begin("guess", { round: 0, pts: 0, used: [] });
    say("guessIntro", 2200, "picaro");
    later(400, () => guessRound());
  }
  function guessRound() {
    const g = game; if (!g || g.id !== "guess") return;
    g.round++;
    let th; do { th = pick(THINGS); } while (g.used.includes(th[0]));
    g.used.push(th[0]);
    const others = THINGS.filter((t) => t !== th).sort(() => Math.random() - 0.5).slice(0, 3).map((t) => t[0]);
    const opts = [th[0], ...others].sort(() => Math.random() - 0.5);
    g.th = th; g.clue = 1; g.opts = opts; g.out = new Set();
    E.act("think");
    if (g.round > 1) say("guessNext", 1600, "curioso");
    later(g.round > 1 ? 1200 : 1600, () => guessCard());
  }
  function guessCard() {
    const g = game; if (!g || g.id !== "guess") return;
    const clues = g.th.slice(1, 1 + g.clue).map((c, i) => `<li>${i + 1}. ${c}</li>`).join("");
    const c = card(`<p class="gsub">Ronda ${g.round} de 3 · ${g.pts} pts</p><ul class="gclues">${clues}</ul><div class="chips gopts">${g.opts.map((o, i) => `<button type="button" class="chip o" data-i="${i}"${g.out.has(o) ? " disabled" : ""}>${cap(o)}</button>`).join("")}</div>${g.clue < 3 ? `<div class="chips"><button type="button" class="chip h">Otra pista</button></div>` : ""}`);
    if (!c) { stop(); return; }
    // se redibuja después del clic (si no, el «clic fuera de la tarjeta» la cerraría)
    c.querySelectorAll(".o").forEach((b) => b.addEventListener("click", () => setTimeout(() => guessPick(g.opts[+b.dataset.i]), 0)));
    const h = c.querySelector(".h"); if (h) h.addEventListener("click", () => setTimeout(() => { g.clue++; say("guessHint", 1200, "curioso"); guessCard(); }, 0));
    clearTimeout(g.idle); g.idle = later(40000, () => { if (game === g) stop(); });
  }
  function guessPick(o) {
    const g = game; if (!g || g.id !== "guess") return;
    if (o === g.th[0]) {
      const p = 4 - g.clue; g.pts += p;
      say("guessYes", 2000, "emocionado"); E.fx("spark", 2);
      tone("sine", 660, 1000, 0.2, 0.03);
      closeCard();
      later(2100, guessAfter);
    } else {
      g.out.add(o);
      say("guessNo", 1300, "picaro");
      tone("sawtooth", 360, 220, 0.12, 0.02, 600);
      if (g.clue < 3) { g.clue++; guessCard(); }
      else if (g.out.size >= 3) { closeCard(); say("guessReveal", 2400, "picaro", { x: g.th[0] }); later(2500, guessAfter); }
      else guessCard();
    }
  }
  function guessAfter() {
    const g = game; if (!g || g.id !== "guess") return;
    if (g.round < 3) { guessRound(); return; }
    const rec = g.pts > (best.guess || 0);
    if (rec) { best.guess = g.pts; saveBest(); }
    const c = card(`<p class="gcount"><b>${g.pts}</b> / 9 puntos</p><p class="gsub">${rec ? "¡Nuevo récord!" : "Récord: " + (best.guess || 0)}</p><div class="chips"><button type="button" class="chip main y">¡Otra vez!</button><button type="button" class="chip n">Ya está</button></div>`);
    say("guessEnd", 2000, "feliz", { n: g.pts });
    later(2100, () => say(g.pts >= 6 ? "guessGood" : "guessBad", 2200, g.pts >= 6 ? "enamorado" : "timido"));
    wireAgain(c, startGuess);
  }

  // ---------- Entrada ----------
  const START = { hand: startHand, catch: startCatch, glow: startGlow, guess: startGuess };
  function start(id) {
    const f = START[id]; if (!f) return false;
    f();
    return true;
  }
  return { start, stop, active: () => (game ? game.id : null), best: () => ({ ...best }) };
})();
