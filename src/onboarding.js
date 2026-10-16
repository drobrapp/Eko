// Eko · primer arranque: nace de una semilla y se presenta.
(() => {
  "use strict";
  const E = window.Eko, S = window.EkoSettings;
  if (!E || !S) return;
  const $ = (s) => document.querySelector(s);
  const stage = $("#stage"), pod = $("#pod");
  const done = () => { try { return !!localStorage.getItem("eko-onboarded"); } catch (_) { return true; } };
  const ES = E.LANG === "es";

  const TX = ES ? {
    hint: "Algo se mueve… acarícialo",
    hello: "¡Hola! ¿Eres tú quien me va a cuidar?",
    askName: "¿Cómo me llamo?", nameOk: (n) => `¡Me encanta! Soy ${n}`,
    askUser: "¿Y tú cómo te llamas?", userOk: (n) => `Encantado, ${n}`, skip: "Prefiero no decirlo",
    askBday: "¿Cuándo es tu cumple?", bdayOk: "¡Apuntado! Ese día habrá fiesta",
    askBed: "¿A qué hora sueles irte a dormir?", bedOk: "Te avisaré si se hace tarde", varies: "Varía",
    youDecide: "Tú decides", skipAll: "Saltar todo", setupIntro: "¡Ahora unas preguntitas para conocernos!", setupEnd: "¡Listo! Si cambias de idea, está todo en mis ajustes",
    privacy: "Para hacerte compañía miro qué programa usas, los títulos de las ventanas, cómo va el PC, tus descargas y lo que suena. Todo se queda en tu ordenador; no envío nada a ningún sitio. Puedes cambiarlo en Ajustes.",
    gotIt: "Entendido",
    end: (u) => `¡Vamos a llevarnos genial${u ? ", " + u : ""}!`,
    ok: "Vale", months: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  } : {
    hint: "Something's moving… pet it",
    hello: "Hi! Are you the one who'll look after me?",
    askName: "What's my name?", nameOk: (n) => `I love it! I'm ${n}`,
    askUser: "And what's your name?", userOk: (n) => `Nice to meet you, ${n}`, skip: "I'd rather not say",
    askBday: "When's your birthday?", bdayOk: "Noted! There'll be a party that day",
    askBed: "What time do you usually go to bed?", bedOk: "I'll tell you if it gets late", varies: "It varies",
    youDecide: "You decide", skipAll: "Skip all", setupIntro: "Now a few questions to get to know each other!", setupEnd: "Done! If you change your mind, it's all in my settings",
    privacy: "To keep you company I look at which app you use, window titles, how the PC is doing, your downloads and what's playing. Everything stays on your computer; I don't send anything anywhere. You can change it in Settings.",
    gotIt: "Got it",
    end: (u) => `We're going to get along great${u ? ", " + u : ""}!`,
    ok: "OK", months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  };

  // ---------- Tarjetas ----------
  function card(html) {
    let c = $("#obCard");
    if (!c) { c = document.createElement("div"); c.id = "obCard"; c.className = "card ob"; stage.appendChild(c); }
    c.classList.remove("in");
    c.innerHTML = html;
    requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add("in")));
    return c;
  }
  const hideCard = () => { const c = $("#obCard"); if (c) c.classList.remove("in"); };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function askText(q, chips, maxlen = 20, skip = null) {
    return new Promise((resolve) => {
      const c = card(`<p>${q}</p>${chips.length ? `<div class="chips">${chips.map((x) => `<button type="button" class="chip">${x}</button>`).join("")}</div>` : ""}
        <form><input maxlength="${maxlen}" autocomplete="off" /><button>${TX.ok}</button></form>${skip ? `<button type="button" class="link">${skip}</button>` : ""}`);
      const inp = c.querySelector("input");
      setTimeout(() => E.focusInput(inp), 80);
      inp.addEventListener("pointerdown", () => E.focusInput(inp));
      c.querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => { inp.value = b.textContent; inp.focus(); E.bump(-1.5); }));
      c.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); const v = inp.value.trim(); if (v) { hideCard(); resolve(v); } else { E.act("shake"); } });
      const sk = c.querySelector(".link"); if (sk) sk.addEventListener("click", () => { hideCard(); resolve(""); });
      inp.addEventListener("keydown", (e) => { if (e.key === "Escape" && skip) { hideCard(); resolve(""); } });
      inp.addEventListener("input", () => { if (Math.random() < 0.5) E.Voice.syllable && E.Voice.syllable(); });
    });
  }
  function askChips(q, options) {
    return new Promise((resolve) => {
      const c = card(`<p>${q}</p><div class="chips">${options.map(([v, l]) => `<button type="button" class="chip" data-v="${v}">${l}</button>`).join("")}</div>`);
      c.querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => { hideCard(); resolve(b.dataset.v); }));
    });
  }
  // Pregunta de configuración con barrita de progreso y «Saltar todo»
  function askQ(q, options, i, n) {
    return new Promise((resolve) => {
      const dots = Array.from({ length: n }, (_, k) => `<i class="${k < i ? "done" : k === i ? "on" : ""}"></i>`).join("");
      const c = card(`<div class="obdots">${dots}</div><p>${q}</p><div class="chips">${options.map(([v, l], k) => `<button type="button" class="chip${k === 0 ? " main" : ""}" data-k="${k}">${l}</button>`).join("")}<button type="button" class="chip soft" data-k="-1">${TX.youDecide}</button></div><button type="button" class="link skipall">${TX.skipAll}</button>`);
      c.querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => { hideCard(); const k = +b.dataset.k; resolve(k < 0 ? null : options[k][0]); }));
      c.querySelector(".skipall").addEventListener("click", () => { hideCard(); resolve("__skip"); });
    });
  }
  // Cumpleaños con selectores propios: los desplegables nativos no funcionan en la ventana transparente de Eko
  function askBday() {
    return new Promise((resolve) => {
      let d = 1, m = 1;
      const picker = (cls) => `<div class="picker ${cls}"><button type="button" class="pk-prev">‹</button><span class="pk-val"></span><button type="button" class="pk-next">›</button></div>`;
      const c = card(`<p>${TX.askBday}</p><div class="pickers">${picker("pd")}${picker("pm")}</div>
        <div class="chips"><button type="button" class="chip main ok">${TX.ok}</button><button type="button" class="link">${TX.skip}</button></div>`);
      const days = (mm) => [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mm - 1];
      const show = () => {
        if (d > days(m)) d = days(m);
        c.querySelector(".pd .pk-val").textContent = d;
        c.querySelector(".pm .pk-val").textContent = TX.months[m - 1];
      };
      const step = (which, delta) => {
        if (which === "pd") d = ((d - 1 + delta + days(m)) % days(m)) + 1;
        else m = ((m - 1 + delta + 12) % 12) + 1;
        show(); E.Voice.tone && E.Voice.tone("sine", 700, 760, 0.04, 0.02);
      };
      for (const which of ["pd", "pm"]) {
        const el = c.querySelector("." + which);
        el.querySelector(".pk-prev").addEventListener("click", () => step(which, -1));
        el.querySelector(".pk-next").addEventListener("click", () => step(which, 1));
        el.addEventListener("wheel", (e) => { e.preventDefault(); step(which, e.deltaY > 0 ? 1 : -1); }, { passive: false });
      }
      show();
      c.querySelector(".ok").addEventListener("click", () => { hideCard(); resolve(`${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`); });
      c.querySelector(".link").addEventListener("click", () => { hideCard(); resolve(""); });
    });
  }

  function info(text, btn) {
    return new Promise((resolve) => {
      const c = card(`<p class="small">${text}</p><div class="chips"><button type="button" class="chip main">${btn}</button></div>`);
      c.querySelector(".chip").addEventListener("click", () => { hideCard(); resolve(); });
    });
  }

  // ---------- La semilla ----------
  function hatch() {
    return new Promise((resolve) => {
      const seed = document.createElement("div");
      seed.id = "seed";
      seed.innerHTML = `<svg viewBox="-40 -60 80 90"><defs><radialGradient id="sg" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fffaf5"/><stop offset=".6" stop-color="#efe2d8"/><stop offset="1" stop-color="#c7b0a2"/></radialGradient></defs>
        <ellipse cx="0" cy="26" rx="26" ry="5" fill="#2a1a12" opacity=".25"/>
        <image href="${(document.getElementById("artSeed") || {}).getAttribute?.("href") || ""}" x="-26" y="-40" width="52" height="66" preserveAspectRatio="none"/>
        <path class="crack c1" d="M-6,-30 L-1,-20 L-8,-12" /><path class="crack c2" d="M-8,-12 L2,-4 L-4,6" /><path class="crack c3" d="M8,-26 L4,-14 L12,-6" />
</svg>`;
      pod.appendChild(seed);
      E.setHitFull(true);
      card(`<p>${TX.hint}</p>`);
      let energy = 0, stagePhase = 0;
      const crack = () => {
        stagePhase++;
        seed.classList.add("c" + stagePhase);
        seed.classList.remove("jolt"); void seed.offsetWidth; seed.classList.add("jolt");
        E.Voice.tone && E.Voice.tone("triangle", 600 + stagePhase * 120, 900 + stagePhase * 120, 0.08, 0.04);
        if (stagePhase >= 3) {
          hideCard();
          seed.classList.add("burst");
          E.fx("spark", 4);
          setTimeout(() => { seed.remove(); E.setHidden(false); E.bump(-6); E.Voice.chirp(); setTimeout(() => E.act("stretch"), 300); }, 380);
          setTimeout(resolve, 2400);
        }
      };
      seed.addEventListener("click", () => { energy = 0; crack(); });
      let lx = 0, ly = 0;
      seed.addEventListener("pointermove", (e) => {
        const d = Math.hypot(e.clientX - lx, e.clientY - ly); lx = e.clientX; ly = e.clientY;
        if (d < 25) { energy += d; if (energy > 220) { energy = 0; crack(); } }
      });
    });
  }

  // ---------- Secuencia ----------
  // ---------- Preguntas que configuran lo básico ----------
  const invoke = window.__TAURI__ ? window.__TAURI__.core.invoke : null;
  const yes = (v) => v === "1";
  const QS = ES ? [
    { q: "¿Cuánto quieres que hable?", o: [["3", "¡Mucho!"], ["2", "Lo normal"], ["1", "Poquito"]],
      set: (v) => S.set("chatty", +v), say: { 3: ["¡Por fin alguien que me entiende!", "spark"], 2: ["Ni mucho ni poco. Perfecto", "nod"], 1: ["Vale, seré de pocas palabras", "nod"] } },
    { q: "¿Me dejas pasear por tu pantalla?", o: [["all", "¡Libre!"], ["walk", "Solo andar"], ["none", "Mejor quieto"]],
      set: (v) => { S.set("walk", v !== "none"); S.set("fly", v === "all"); }, say: { all: ["¡Bieeen! Con capa y todo", "spark"], walk: ["Vale, con los pies en el suelo", "nod"], none: ["Vale, seré una estatua muy mona", "shrug"] } },
    { q: "¿Quieres oír mi voz?", o: [["1", "¡Sí!"], ["0", "Mejor en silencio"]],
      set: (v) => S.set("voice", yes(v)), say: { 1: ["¡Bla, bla, blu! Hola", "note"], 0: ["Vale… seré un mimo", "shrug"] } },
    { q: "¿A qué hora te sueles ir a dormir?", o: [["23:30", "Antes de las 12"], ["01:00", "Sobre la 1"], ["02:30", "Más tarde"], ["", "No me avises"]],
      set: (v) => S.set("bedtime", v), say: { "23:30": ["¡Qué sano! Te avisaré si se hace tarde", "yawn"], "01:00": ["Te avisaré si se hace tarde", "yawn"], "02:30": ["Uy, noctámbulo… te vigilaré", "ask"], "": ["Vale, nada de sermones", "nod"] } },
    { q: "Si llevas mucho rato sin parar, ¿te aviso para descansar?", o: [["60", "Cada hora"], ["120", "Cada 2 horas"], ["0", "No hace falta"]],
      set: (v) => { S.set("breaks", v !== "0"); if (v !== "0") S.set("breakMinutes", +v); }, say: { 60: ["Te cuidaré, prometido", "heart"], 120: ["Vale, cada dos horitas", "nod"], 0: ["Vale, pero estira de vez en cuando", "shrug"] } },
    { q: "Cuando estés en una llamada o grabando la pantalla, ¿me escondo?", o: [["all", "Siempre"], ["call", "Solo en llamadas"], ["none", "No hace falta"]],
      set: (v) => { S.set("hideCall", v !== "none"); S.set("hideRecord", v === "all"); S.set("hideFull", v === "all"); }, say: { all: ["Discreción total. Desapareceré", "nod"], call: ["En llamadas me escondo, prometido", "nod"], none: ["¡Voy a salir en todas tus llamadas!", "spark"] } },
    { q: "¿Me dejas curiosear tu escritorio? Solo miro los nombres de los iconos, nunca abro nada", o: [["1", "Vale"], ["0", "Mejor no"]],
      set: (v) => S.set("desktop", yes(v)), say: { 1: ["¡Gracias! Seré muy cotilla (pero respetuoso)", "spark"], 0: ["Entendido, tu escritorio es sagrado", "nod"] } },
    { q: "¿Arranco contigo cada mañana?", o: [["1", "¡Sí!"], ["0", "No"]],
      set: (v) => { if (invoke) invoke("set_autostart", { value: yes(v) }).catch(() => {}); }, say: { 1: ["¡Así nos vemos cada día!", "heart"], 0: ["Vale, ya me despertarás tú", "nod"] } },
    { q: "¿Te pregunto qué tal estás de vez en cuando?", o: [["1", "¡Claro!"], ["0", "Mejor no"]],
      set: (v) => S.set("menuAsk", yes(v)), say: { 1: ["¡Bien! Me encanta saber de ti", "heart"], 0: ["Vale, nada de preguntas", "nod"] } },
  ] : [
    { q: "How much should I talk?", o: [["3", "A lot!"], ["2", "Normal"], ["1", "A little"]], set: (v) => S.set("chatty", +v), say: {} },
    { q: "Can I roam around your screen?", o: [["all", "Freely!"], ["walk", "Just walk"], ["none", "Stay still"]], set: (v) => { S.set("walk", v !== "none"); S.set("fly", v === "all"); }, say: {} },
    { q: "Want to hear my voice?", o: [["1", "Yes!"], ["0", "Silence"]], set: (v) => S.set("voice", yes(v)), say: {} },
    { q: "What time do you go to bed?", o: [["23:30", "Before 12"], ["01:00", "Around 1"], ["02:30", "Later"], ["", "Don't remind me"]], set: (v) => S.set("bedtime", v), say: {} },
    { q: "Should I remind you to take breaks?", o: [["60", "Every hour"], ["120", "Every 2 h"], ["0", "No need"]], set: (v) => { S.set("breaks", v !== "0"); if (v !== "0") S.set("breakMinutes", +v); }, say: {} },
    { q: "Should I hide during calls or screen recording?", o: [["all", "Always"], ["call", "Only calls"], ["none", "No need"]], set: (v) => { S.set("hideCall", v !== "none"); S.set("hideRecord", v === "all"); S.set("hideFull", v === "all"); }, say: {} },
    { q: "Can I peek at your desktop? I only look at icon names", o: [["1", "OK"], ["0", "Rather not"]], set: (v) => S.set("desktop", yes(v)), say: {} },
    { q: "Should I start with Windows?", o: [["1", "Yes!"], ["0", "No"]], set: (v) => { if (invoke) invoke("set_autostart", { value: yes(v) }).catch(() => {}); }, say: {} },
    { q: "Can I ask how you're doing now and then?", o: [["1", "Sure!"], ["0", "Rather not"]], set: (v) => S.set("menuAsk", yes(v)), say: {} },
  ];
  async function setup() {
    E.say(TX.setupIntro, 2400, true, "spark");
    await wait(2500);
    for (let i = 0; i < QS.length; i++) {
      const Q = QS[i];
      E.act("curious", { dir: 1 });
      const v = await askQ(Q.q, Q.o, i, QS.length);
      if (v === "__skip") break;
      if (v === null) { E.act("nod"); await wait(500); continue; }       // «Tú decides»: se queda como está
      Q.set(v);
      const r = Q.say[v];
      if (r) { E.say(r[0], 2200, true, r[1]); await wait(2300); } else await wait(400);
    }
    E.say(TX.setupEnd, 2600, true, "nod");
    await wait(2700);
  }

  async function run() {
    E.setHidden(true);
    E.S.x = Math.min(Math.max(E.S.x, E.world.left), E.world.left + E.world.width - E.W);   // ventana entera en pantalla
    E.hold(1e6);
    await wait(600);
    await hatch();
    E.say(TX.hello, 3200, true, "wave");
    await wait(3300);

    const name = await askText(TX.askName, ES ? ["Eko", "Mochi", "Bolo", "Nube"] : ["Eko", "Mochi", "Bobo", "Cloud"]);
    S.set("petName", name);
    E.hop(-420); E.fx("heart", 3); E.blush(2.5);
    E.say(TX.nameOk(name), 2800, true);
    await wait(2900);

    const user = await askText(TX.askUser, [], 24, TX.skip);
    if (user) { S.set("userName", user); E.say(TX.userOk(user), 2600, true, "nod"); await wait(2700); }

    const bday = await askBday();
    if (bday) { S.set("birthday", bday); E.say(TX.bdayOk, 2600, true, "spark"); await wait(2700); }

    await setup();

    E.act("think");
    await info(TX.privacy, TX.gotIt);

    try { localStorage.setItem("eko-onboarded", new Date().toISOString()); } catch (_) {}
    E.setHitFull(false);
    E.hold(4);
    E.act("hug");
    E.say(TX.end(S.get().userName), 3200, true);
    setTimeout(() => window.EkoProgress && window.EkoProgress.startMissions(), 5000);
  }

  window.EkoOnboarding = { run, pending: () => !done() };
  if (!done()) setTimeout(run, 300);
})();
