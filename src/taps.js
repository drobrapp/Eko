// Eko · qué hace cuando le haces clic: nunca lo mismo dos veces seguidas.
// Depende de dónde le tocas (cabeza = caricia, barriga = cosquillas), de cuántos clics seguidos llevas,
// de cómo está (hambre, sueño, cariño) y de lo que ya sabe hacer (trucos desbloqueados).
window.EkoTaps = (() => {
  "use strict";
  const E = window.Eko;
  if (!E || !E.ACTIONS) return null;
  const { A, S } = E;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = (a, b, k) => clamp((k - a) / (b - a), 0, 1);
  const ease = (x) => x * x * (3 - 2 * x);
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  const tone = (...a) => { try { E.Voice.tone && E.Voice.tone(...a); } catch (_) {} };
  const say = (l, ms = 2200) => E.say(pick(l), ms, true);

  // ---------- Gestos nuevos ----------
  // Cosquillas: se retuerce riéndose, con las manos en la tripa
  E.ACTIONS.giggle = { dur: 2.2, f(P, k, e, o) {
    const m = e;
    P.front = true;
    P.aL = lerp(P.aL, -52 + Math.sin(A.t * 20) * 10, m); P.aR = lerp(P.aR, 52 + Math.sin(A.t * 20 + 1) * 10, m);
    P.sx *= 1 + 0.05 * Math.sin(A.t * 28) * m; P.sy *= 1 - 0.04 * Math.sin(A.t * 28) * m;
    P.sway += Math.sin(A.t * 17) * 5 * m; P.lift += Math.abs(Math.sin(A.t * 13)) * 4 * m;
    P.eyes = "happy"; P.mouth = Math.max(P.mouth, (0.35 + 0.2 * Math.sin(A.t * 26)) * m); P.brows = "up";
    const step = Math.floor(A.t * 7);
    if (step !== o.s && k < 0.8) { o.s = step; tone("sine", 700 + (step % 3) * 140, 900 + (step % 3) * 160, 0.07, 0.02); }
  } };
  // Caricia en la cabeza: cierra los ojos, se apoya en tu mano y se pone colorado
  E.ACTIONS.headPat = { dur: 2.6, f(P, k, e, o) {
    const m = ease(sm(0, 0.25, k)) * (1 - ease(sm(0.85, 1, k)));
    P.front = true;
    P.eyes = "happy"; P.tilt += 11 * m + Math.sin(A.t * 3) * 2 * m; P.nod += 4 * m;
    P.sy *= 1 - 0.035 * m * (0.6 + 0.4 * Math.sin(A.t * 7));              // se aplasta un poquito bajo la mano
    P.aL = lerp(P.aL, 18, m); P.aR = lerp(P.aR, -18, m); P.sway += Math.sin(A.t * 2.5) * 2 * m;
    if (k > 0.3 && !o.h) { o.h = 1; E.blush && E.blush(2.2); E.fx("heart", 1); tone("sine", 300, 260, 0.6, 0.02); }
  } };
  // Vergüenza: se tapa la cara con las manos y asoma un ojo
  E.ACTIONS.shyHide = { dur: 2.6, f(P, k, e, o) {
    const m = ease(sm(0, 0.18, k)) * (1 - ease(sm(0.88, 1, k)));
    P.front = true;
    P.aL = lerp(P.aL, -128, m); P.aR = lerp(P.aR, 128, m);
    if (k > 0.55 && k < 0.82) { P.aR = lerp(P.aR, 70, ease(sm(0.55, 0.62, k))); P.eyes = "wink"; } else P.eyes = "closed";
    P.nod += 6 * m; P.sy *= 1 - 0.03 * m; P.sway += Math.sin(A.t * 4) * 2 * m;
    if (!o.b) { o.b = 1; E.blush && E.blush(2.6); }
  } };
  // Enfurruñado: brazos cruzados, se hincha y da un pisotón
  E.ACTIONS.grumpy = { dur: 2.2, f(P, k, e, o) {
    const m = ease(sm(0, 0.15, k)) * (1 - ease(sm(0.88, 1, k)));
    P.front = true;
    P.aL = lerp(P.aL, -62, m); P.aR = lerp(P.aR, 62, m);                    // brazos cruzados
    P.brows = "angry"; P.sx *= 1 + 0.06 * m; P.sy *= 1 - 0.03 * m;
    P.hturn += 0.35 * m * (k > 0.5 ? 1 : 0);                                // gira la cara: «hmpf»
    P.eyes = k > 0.5 ? "squint" : null;
    const st = sm(0.25, 0.4, k);
    if (st > 0 && st < 1) { P.legR = -16 * Math.sin(Math.PI * st); }
    if (k > 0.4 && !o.st) { o.st = 1; E.bump && E.bump(-3); tone("triangle", 150, 90, 0.12, 0.05); E.fx("bang", 1); }
  } };

  // ---------- Elegir reacción ----------
  const LINES = {
    hop: ["¿Me llamabas?", "¡Presente!", "¿Qué pasa?", "¡Boing!", "¡Hola, hola!", "¿Necesitas algo?", "¡Sorpresa!", "¡Aquí estoy!"],
    tickle: ["¡Jijiji, cosquillas no!", "¡Ahí no, que tengo cosquillas!", "¡Jajaja, para, para!", "¡Mi barriga es sagrada!"],
    pat: ["Mmm… qué gustito", "Más, más…", "Eso, eso, ahí", "Me encantan los mimos"],
    shy: ["Ay, que me pongo colorado", "No me mires así…", "¡Qué vergüenza!"],
    grumpy: ["¡Eh! Que estaba concentrado", "Hmpf.", "¿Otra vez? Estoy ocupado", "¡Que me despeinas!"],
    scare: ["¡Ay, qué susto!", "¡Uy! No te había visto", "¡Me has asustado!"],
    trick: ["¡Mira esto!", "¡Hop!", "¿A que no sabías que hacía esto?"],
    fall: ["¡Me has tirado!", "¡Ay, mi culete!"],
    dance: ["¡Música, maestro!", "¡Me ha dado por bailar!"],
    hungry: ["¿Me traes una galletita?", "Mi tripa dice hola…"],
    sleepy: ["Déjame dormir un poquito…", "Cinco minutitos más…"],
    play: ["¿Jugamos a algo?", "¡Me aburro! ¿Jugamos?"],
  };
  const hist = [];
  function react(zone, clicks, sinceLast) {
    if (A.action || S.airborne || S.fly) return false;
    const N = window.EkoNeeds && window.EkoNeeds.on() ? window.EkoNeeds.get() : null;
    const T = window.EkoTricks, tricks = T ? T.unlocked().filter((t) => ["flip", "pirouette"].includes(t.id)) : [];
    const idleLong = (A.idleBeforePoke || 0) > 120000;
    // muchos clics seguidos: primero se ríe más, luego se enfada
    if (clicks >= 6) return run("grumpy", true);
    const head = zone === "head";
    const w = {
      hop: 26,
      tickle: head ? 4 : 22 + (clicks >= 2 ? 20 : 0),
      pat: head ? 26 : 3,
      shy: N && N.love > 75 ? 9 : 4,
      grumpy: clicks >= 4 ? 30 : 4,
      scare: idleLong ? 40 : 3,
      trick: tricks.length ? 7 : 0,
      tada: tricks.length ? 0 : 5,
      fall: 2,
      dance: 4,
      hungry: N && N.hunger < 35 ? 18 : 0,
      sleepy: N && N.energy < 25 ? 18 : 0,
      play: N && N.fun < 35 ? 14 : 0,
    };
    // no repetir lo último y castigar lo reciente
    for (const [i, k] of hist.entries()) if (w[k]) w[k] *= i === hist.length - 1 ? 0 : 0.35;
    const tot = Object.values(w).reduce((a, b) => a + b, 0);
    let r = Math.random() * tot, choice = "hop";
    for (const k in w) { r -= w[k]; if (r <= 0) { choice = k; break; } }
    return run(choice, false, tricks);
  }
  function run(k, forced, tricks = []) {
    hist.push(k); if (hist.length > 3) hist.shift();
    S.mode = "idle"; S.modeUntil = A.t + 3.5;
    switch (k) {
      case "tickle": E.act("giggle"); say(LINES.tickle); break;
      case "pat": E.act("headPat"); setTimeout(() => say(LINES.pat), 500); break;
      case "shy": E.act("shyHide"); setTimeout(() => say(LINES.shy), 400); break;
      case "grumpy": E.act("grumpy"); E.express("enfadado", 2.4); setTimeout(() => say(LINES.grumpy), 500); if (forced) S.modeUntil = A.t + 5; break;
      case "scare": E.hop(-560); E.act("surprise"); E.fx("bang", 1); tone("sine", 900, 1500, 0.12, 0.03); setTimeout(() => say(LINES.scare), 300); break;
      case "trick": { const t = pick(tricks); say(LINES.trick, 1500); setTimeout(() => T().run(t.id), 500); break; }
      case "tada": E.act("tada"); E.express("emocionado", 2.2); setTimeout(() => E.say("¡Ta-chán!", 1600, true), 700); break;
      case "fall": if (window.EkoTricks) { window.EkoTricks.tumble("sit", Math.random() < 0.5 ? -1 : 1); setTimeout(() => say(LINES.fall), 1400); } else E.hop(-480); break;
      case "dance": E.setDance(true); setTimeout(() => E.setDance(false), 3200); E.fx("note", 2); say(LINES.dance); break;
      case "hungry": E.act("rubBelly") ; say(LINES.hungry); break;
      case "sleepy": E.act("yawn"); setTimeout(() => say(LINES.sleepy), 600); break;
      case "play": E.hop(-420); say(LINES.play); setTimeout(() => window.EkoMenu && window.EkoMenu.propose && window.EkoMenu.propose(true), 1400); break;
      default: {
        E.hop(-480); A.tiltTarget = (Math.random() - 0.5) * 20;
        const r = Math.random();
        setTimeout(() => E.act(r < 0.3 ? "shrug" : r < 0.55 ? "wink" : r < 0.75 ? "nod" : "wave"), 350);
        E.express(pick(["curioso", "sorprendido", "divertido", "picaro"]), 2.2);
        if (Math.random() < 0.8) say(LINES.hop);
      }
    }
    return true;
  }
  const T = () => window.EkoTricks;
  return { react, run };
})();
