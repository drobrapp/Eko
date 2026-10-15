// Eko · te escucha (solo si lo activas en Ajustes; apagado por defecto)
// Usa el reconocimiento de voz de Windows en tu PC, con una lista cerrada de frases. Solo reacciona a voz, no a ruidos.
// No graba ni guarda nada. Mientras estás en una llamada o suena música, deja de escuchar.
(() => {
  "use strict";
  const E = window.Eko;
  if (!E) return;
  const T = window.__TAURI__, invoke = T ? T.core.invoke : null;
  const cfg = () => (window.EkoSettings ? window.EkoSettings.get() : {});
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  const M = () => window.EkoMenu || {};
  const name = () => (cfg().petName || "Eko").trim();

  // Órdenes: frases que entiende (con su nombre delante) → qué hace
  const CMDS = [
    { p: ["baila", "a bailar", "ponte a bailar"], run: () => { E.say(pick(["¡Allá voy!", "¡Música, maestro!"]), 1800, true); E.setDance(true); setTimeout(() => E.setDance(false), 9000); } },
    { p: ["a dormir", "duérmete", "vete a dormir", "buenas noches"], run: () => { E.setDance(false); E.goToSleep(); } },
    { p: ["despierta", "arriba", "buenos días"], run: () => (E.S.sleeping ? E.wakeUp() : (E.act("wave"), E.say(pick(["¡Ya estoy despierto!", "¡Buenos días!"]), 2000, true))) },
    { p: ["ven", "ven aquí", "acércate"], run: () => { E.say(pick(["¡Voy!", "¡Ahí voy!"]), 1400, true); E.walkTo(E.cursor.x, 170); } },
    { p: ["salta", "da un salto"], run: () => E.hop(-560) },
    { p: ["vuela", "a volar"], run: () => E.fly() },
    { p: ["saluda", "di hola"], run: () => { E.act("wave"); E.say("¡Holi!", 1600, true); } },
    { p: ["qué hora es", "dime la hora"], run: () => { const d = new Date(); E.act("point", { dir: 1 }); E.say(`Son las ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`, 2800, true); } },
    { p: ["escóndete", "al escondite", "jugamos al escondite"], run: () => M().startGame && M().startGame("hide") },
    { p: ["juguemos", "vamos a jugar", "jugamos"], run: () => M().propose && M().propose(true) },
    { p: ["abre el menú", "menú"], run: () => M().toggle && M().toggle() },
    { p: ["silencio", "calla", "cállate"], run: () => M().muteHour && M().muteHour() },
    { p: ["me quieres", "te quiero"], run: () => { E.act("hug"); E.blush(2.5); E.fx("heart", 3); E.say(pick(["¡Muchísimo!", "¡Más que a mi brote!"]), 2400, true); } },
    { p: ["qué sabes hacer", "qué puedes hacer", "ayuda"], run: () => { E.act("point", { dir: 1 }); E.say(`Dime «${name()}» y luego: baila, salta, vuela, ven aquí, a dormir, ¿qué hora es?, recuérdame en diez minutos, juguemos, escóndete, cuéntame algo…`, 7000, true); } },
    { p: ["cuéntame algo", "dime algo"], run: () => E.say(pick(["¿Sabías que los champiñones son primos de los humanos? Más que de las plantas", "Hoy he contado los píxeles de tu pantalla. Me perdí en el 3", "Si me riegas, crezco. Si no, me pongo mustio. Así de simple"]), 4200, true) },
    { p: ["recuérdame en cinco minutos"], run: () => remind(5, "cinco minutos") },
    { p: ["recuérdame en diez minutos"], run: () => remind(10, "diez minutos") },
    { p: ["recuérdame en quince minutos"], run: () => remind(15, "quince minutos") },
    { p: ["recuérdame en media hora"], run: () => remind(30, "media hora") },
    { p: ["recuérdame en una hora"], run: () => remind(60, "una hora") },
  ];
  function remind(min, label) {
    M().remindIn && M().remindIn(min, "Lo que me pediste hace " + label);
    E.act("nod"); E.say(`¡Vale! Te aviso en ${label}`, 2400, true);
  }
  // Frases sueltas sin orden (también con su nombre)
  const EXTRA = [
    { p: (n) => [`gracias ${n}`, `muchas gracias ${n}`], run: () => { E.blush(2.5); E.express("timido", 2.5); E.say(pick(["¡De nada!", "Para eso estoy"]), 2000, true); } },
    { p: (n) => [`hola ${n}`, `buenas ${n}`], run: () => { E.act("wave"); E.express("feliz", 2); E.say(pick(["¡Holi!", "¡Hola, hola!"]), 1800, true); } },
    { p: (n) => [n, `oye ${n}`], run: () => { E.express("curioso", 2.5); E.act("curious", { dir: 1 }); E.say(pick(["¿Sí?", "¿Me llamabas?", "¡Dime!"]), 1800, true); } },
  ];
  // Variantes de cómo suena el nombre (en español «Eko» se oye como «eco»)
  const variants = (n) => { const v = new Set([n]); v.add(n.replace(/k/g, "c")); v.add(n.replace(/c(?=[aou])/g, "k")); return [...v]; };
  function phrases() {
    const map = new Map();
    // Responde a su nombre (el que le pusiste) y también a «Eko»
    const names = new Set([...variants(name().toLowerCase()), ...variants("eko")]);
    for (const n of names) {
      for (const c of CMDS) for (const p of c.p) { map.set(`${n} ${p}`, c.run); map.set(`oye ${n} ${p}`, c.run); }
      for (const x of EXTRA) for (const p of x.p(n)) map.set(p, x.run);
    }
    return map;
  }
  let MAP = phrases(), on = false, paused = false, lastLook = 0, lastCmd = 0;

  // Diagnóstico: lo que oye y por qué reacciona o no (lo muestra Ajustes → «Probar»)
  const status = (state, text = "", conf = -1) => { try { T && T.event.emit("voice-status", { state, text, conf, t: Date.now() }); } catch (_) {} };
  const why = () => { const s = E.lastSenses || {}; return s.in_call ? "call" : (s.music && s.music.playing) ? "music" : E.quiet ? "quiet" : E.A.hidden ? "hidden" : ""; };
  const norm = (t) => String(t || "").toLowerCase().replace(/[¿?¡!.]/g, "").replace(/\s+/g, " ").trim();
  function onVoice(ev) {
    const v = ev || {};
    if (!on) return;
    const w = why();
    if (v.kind === "error") status("error", v.text);
    else if (w) { status("ignored-" + w, v.text, v.conf); return; }
    else status(v.kind, v.text, v.conf);
    if (v.kind === "speech") {
      // Te oye hablar: te mira, sin interrumpir lo que hace (como mucho cada 10 s)
      const now = performance.now();
      if (now - lastLook > 8000 && now - lastCmd > 4000 && !E.S.sleeping && !E.S.dragging) { lastLook = now; E.express("curioso", 1.6); E.act("curious", { dir: 1 }); }
    } else if (v.kind === "nomatch") {
      // te ha oído pero no ha entendido: pone cara de duda (sin agobiar)
      const now = performance.now();
      if (now - lastLook > 6000 && !E.S.sleeping) { lastLook = now; E.fx("ask", 1); E.express("confundido", 1.6); if (Math.random() < 0.3) E.say(pick(["¿Cómo?", "¿Eh? No te he pillado", "Repite, porfa"]), 1600, true); }
    } else if (v.kind === "cmd" && v.conf <= 2) {
      const fn = MAP.get(norm(v.text).replace(/,/g, ""));
      if (!fn) { status("unknown", v.text, v.conf); return; }
      lastCmd = performance.now();
      if (window.EkoNeeds) window.EkoNeeds.give("voice");
      if (E.S.sleeping && !/despierta|arriba|buenos días/.test(norm(v.text))) { E.wakeUp(); setTimeout(fn, 1600); return; }
      fn();
    } else if (v.kind === "error" && !onVoice.warned) {
      onVoice.warned = true;
      E.say("No consigo oírte… revisa que Windows tenga el reconocimiento de voz en español", 4200, true, "shrug");
    }
  }
  function start() { if (on || !invoke) return; on = true; const keys = [...MAP.keys()]; invoke("voice_start", { phrases: keys }).catch(() => { on = false; }); }
  function stop() { if (!on) return; on = false; if (invoke) invoke("voice_stop").catch(() => {}); }
  if (E.listen) E.listen("voice", (e) => onVoice(e.payload));

  // Encendido según Ajustes. Mientras hay llamada o música sigue escuchando pero no hace caso
  // (antes se paraba y arrancaba cada vez, y en ese hueco no oía nada)
  function sync() {
    const want = !!cfg().listen;
    const newMap = phrases();
    if (want) {
      if (on && [...newMap.keys()].join() !== [...MAP.keys()].join()) { stop(); MAP = newMap; }
      MAP = newMap; start();
    } else stop();
  }
  setInterval(sync, 3000);
  if (window.EkoSettings && window.EkoSettings.onChange) window.EkoSettings.onChange(sync);
  window.EkoVoice = { simulate: (text) => { const was = on; on = true; onVoice({ kind: "cmd", text, conf: 0 }); on = was; }, hear: () => { const was = on; on = true; onVoice({ kind: "speech" }); on = was; }, phrases: () => [...MAP.keys()] };
})();
