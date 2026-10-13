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
      setTimeout(() => inp.focus(), 80);
      c.querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => { inp.value = b.textContent; inp.focus(); E.bump(-1.5); }));
      c.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); const v = inp.value.trim(); if (v) { hideCard(); resolve(v); } else { E.act("shake"); } });
      const sk = c.querySelector(".link"); if (sk) sk.addEventListener("click", () => { hideCard(); resolve(""); });
      inp.addEventListener("input", () => { if (Math.random() < 0.5) E.Voice.syllable && E.Voice.syllable(); });
    });
  }
  function askChips(q, options) {
    return new Promise((resolve) => {
      const c = card(`<p>${q}</p><div class="chips">${options.map(([v, l]) => `<button type="button" class="chip" data-v="${v}">${l}</button>`).join("")}</div>`);
      c.querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => { hideCard(); resolve(b.dataset.v); }));
    });
  }
  function askBday() {
    return new Promise((resolve) => {
      const days = Array.from({ length: 31 }, (_, i) => `<option value="${String(i + 1).padStart(2, "0")}">${i + 1}</option>`).join("");
      const months = TX.months.map((m, i) => `<option value="${String(i + 1).padStart(2, "0")}">${m}</option>`).join("");
      const c = card(`<p>${TX.askBday}</p><form><select class="d">${days}</select><select class="m">${months}</select><button>${TX.ok}</button></form><button type="button" class="link">${TX.skip}</button>`);
      c.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); hideCard(); resolve(`${c.querySelector(".m").value}-${c.querySelector(".d").value}`); });
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
        <path d="M0,-34 C20,-34 30,-8 30,6 C30,22 16,28 0,28 C-16,28 -30,22 -30,6 C-30,-8 -20,-34 0,-34Z" fill="url(#sg)"/>
        <path class="crack c1" d="M-6,-30 L-1,-20 L-8,-12" /><path class="crack c2" d="M-8,-12 L2,-4 L-4,6" /><path class="crack c3" d="M8,-26 L4,-14 L12,-6" />
        <path d="M0,-34 C-2,-44 4,-52 12,-54 C12,-46 8,-40 0,-34Z" fill="#7cc48a"/></svg>`;
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

    const bed = await askChips(TX.askBed, [["22:30", "22:30"], ["23:30", "23:30"], ["00:30", "00:30"], ["01:30", "01:30"], ["", TX.varies]]);
    S.set("bedtime", bed || "01:30");
    E.say(TX.bedOk, 2600, true, "yawn");
    await wait(2700);

    E.act("think");
    await info(TX.privacy, TX.gotIt);

    try { localStorage.setItem("eko-onboarded", new Date().toISOString()); } catch (_) {}
    E.setHitFull(false);
    E.hold(4);
    E.act("hug");
    E.say(TX.end(S.get().userName), 3200, true);
  }

  window.EkoOnboarding = { run, pending: () => !done() };
  if (!done()) setTimeout(run, 300);
})();
