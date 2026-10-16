// Eko · «Habla conmigo» (PRUEBA, apagado por defecto): conversación con una IA que funciona en tu propio PC (Ollama).
// Gratis y sin internet: Eko habla con 127.0.0.1:11434. Si se desactiva, Eko vuelve a ser exactamente como antes.
(() => {
  "use strict";
  const E = window.Eko;
  if (!E) return;
  const T = window.__TAURI__, invoke = T ? T.core.invoke : null;
  const cfg = () => (window.EkoSettings ? window.EkoSettings.get() : {});
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  const stage = document.getElementById("stage");
  const MOODS = ["feliz", "curioso", "sorprendido", "triste", "emocionado", "picaro", "enamorado", "timido", "confundido", "orgulloso", "divertido", "cansado", "sereno", "esperanzado"];
  const TR = () => window.EkoTricks;
  const trick = (id) => { const T = TR(); if (!T) return; const t = T.LIST.find((x) => x.id === id); if (t && T.has(t)) T.run(id); else E.say("¡Ese truco aún lo estoy aprendiendo!", 2200, true); };
  const HATS = { bruja: "witch", calabaza: "pumpkin", vampiro: "vampire", fantasma: "ghost", "papá noel": "santa", papanoel: "santa", reno: "reindeer", elfo: "elf", bufanda: "scarf", fiesta: "party", corona: "crown" };
  // Lo que puede hacer de verdad cuando la IA lo pide con {acción} o {acción:dato}
  const ACTS = {
    baila: () => { E.setDance(true); setTimeout(() => E.setDance(false), 7000); }, salta: () => E.hop(-520), saluda: () => E.act("wave"),
    abrazo: () => E.act("hug"), piensa: () => E.act("think"), duerme: () => E.goToSleep(),
    come: () => window.EkoMenu && window.EkoMenu.snack && window.EkoMenu.snack(),
    juega: () => window.EkoMenu && window.EkoMenu.propose && window.EkoMenu.propose(true),
    truco: () => { const T = TR(), u = T ? T.unlocked().filter((x) => x.id !== "bellyFull") : []; if (u.length) T.run(u[Math.floor(Math.random() * u.length)].id); else { E.act("tada"); } },
    voltereta: () => trick("flip"), pirueta: () => trick("pirouette"), equilibrio: () => trick("balance"), malabares: () => trick("juggle"), magia: () => trick("magic"),
    gorro: (arg) => {
      const id = HATS[(arg || "").trim()] || (arg || "").trim();
      if (!id || id === "nada" || id === "ninguno") { E.setHat("none"); return; }
      const P = window.EkoProgress;
      if (P && !P.has("acc:" + id)) { E.say("Ese todavía no lo tengo en el armario…", 2200, true); return; }
      E.setHat(id);
    },
    quitagorro: () => E.setHat("none"),
    // ---- en tu PC (lista cerrada; se puede apagar en Ajustes) ----
    musica: (a) => pc(() => invoke(/sig|next|pasa/.test(a) ? "media_next" : /ant|prev|atr/.test(a) ? "media_prev" : "media_play_pause"), "musica"),
    volumen: (a) => pc(() => invoke("volume", { dir: /sub|up|mas|alto/.test(a) ? "up" : /baj|down|menos/.test(a) ? "down" : "mute" }), "volumen"),
    carpeta: (a) => pc(() => invoke("open_folder", { which: ({ documentos: "documentos", imagenes: "imagenes", fotos: "imagenes", escritorio: "escritorio", musica: "musica", videos: "videos" })[plain(a)] || "descargas" })),
    descarga: () => pc(() => invoke("open_last_download")),
    captura: () => pc(() => invoke("screenshot")),
    busca: (a) => pc(() => a && invoke("web_search", { q: a })),
    web: (a) => pc(() => { const u = siteUrl(a); return u ? invoke("open_site", { url: u }) : invoke("web_search", { q: a }); }),
    abre: (a) => pc(() => invoke("open_app", { name: plain(a) }).catch(() => { E.sayChat(`Uy, no encuentro «${a}» en tu PC…`, 2600); })),
    bloquea: () => pc(() => { E.act("bye"); return new Promise((r) => setTimeout(() => r(invoke("lock_pc")), 1200)); }),
    recordatorio: (arg) => {
      const m = String(arg || "").match(/^(\d{1,3})\s*:?\s*(.*)$/);
      if (!m || !window.EkoMenu || !window.EkoMenu.remindIn) return;
      window.EkoMenu.remindIn(Math.max(1, Math.min(600, +m[1])), (m[2] || "¡Lo que me pediste!").slice(0, 80));
      E.fx("spark", 1);
    },
  };
  const plain = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const pcOn = () => !!invoke && cfg().pcActions !== false;
  // Hace algo en el PC con un gestito de Eko (sin confirmaciones: lista cerrada y siempre inofensivo)
  function pc(fn, kind) {
    if (!invoke) { E.sayChat("(Vista previa) En tu PC lo haría de verdad", 2200); return; }
    if (!pcOn()) { E.sayChat("Eso no me dejas hacerlo (está apagado en mis ajustes)", 2600); return; }
    if (kind === "musica") E.fx("note", 1); else if (kind !== "volumen") E.act("point", { dir: 1 });
    try { const r = fn(); if (r && r.catch) r.catch(() => {}); } catch (_) {}
  }
  const SITES = { youtube: "https://www.youtube.com", gmail: "https://mail.google.com", correo: "https://mail.google.com", instagram: "https://www.instagram.com", whatsapp: "https://web.whatsapp.com", netflix: "https://www.netflix.com", spotify: "https://open.spotify.com", maps: "https://maps.google.com", mapas: "https://maps.google.com", wikipedia: "https://es.wikipedia.org", twitter: "https://x.com", x: "https://x.com", amazon: "https://www.amazon.es", tiktok: "https://www.tiktok.com", calendario: "https://calendar.google.com", drive: "https://drive.google.com", traductor: "https://translate.google.com", pinterest: "https://www.pinterest.com", behance: "https://www.behance.net", github: "https://github.com", chatgpt: "https://chatgpt.com", claude: "https://claude.ai" };
  function siteUrl(a) {
    const n = plain(a).replace(/^(la |el |mi )/, "").replace(/\s+/g, "");
    if (SITES[n]) return SITES[n];
    const d = n.replace(/^https?:\/\//, "");
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/[\w\-./?=&%]*)?$/.test(d) ? "https://" + d : null;
  }
  // ---------- Memoria: lo que le cuentas y quiere recordar (solo en tu PC) ----------
  const MEM_KEY = "eko-ai-memory";
  const memGet = () => { try { return JSON.parse(localStorage.getItem(MEM_KEY) || "[]"); } catch (_) { return []; } };
  const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9ñ ]/g, "").trim();
  function remember(fact) {
    fact = String(fact || "").replace(/\s+/g, " ").trim().slice(0, 120);
    if (fact.length < 4) return false;
    const list = memGet(), n = norm(fact);
    if (list.some((x) => norm(x.t) === n || norm(x.t).includes(n) || n.includes(norm(x.t)))) return false;
    list.push({ t: fact, at: Date.now() });
    try { localStorage.setItem(MEM_KEY, JSON.stringify(list.slice(-40))); } catch (_) {}
    return true;
  }
  let lastChat = 0;
  let history = [], thinking = 0;
  // Ejemplos de formato (van en las instrucciones, no como conversación real, para que no los confunda con lo que le has dicho)
  const EXAMPLES = [
    ["hola", "[feliz] ¡Holi! Ya te echaba de menos, ¿qué me cuentas?"],
    ["estoy cansado", "[triste] Jo… ¿y si paras cinco minutos? Yo te guardo el sitio. {abrazo}"],
    ["cuéntame un chiste", "[divertido] ¿Qué hace un champiñón en una fiesta? ¡Ser un fungi! {salta}"],
    ["¿me haces un truco?", "[picaro] ¡Claro! Mira esto… {truco}"],
    ["recuérdame en 10 minutos sacar la ropa", "[orgulloso] ¡Hecho! En diez minutos te aviso de la ropa. {recordatorio:10:Sacar la ropa}"],
    ["ponte la corona", "[orgulloso] Su majestad está lista. {gorro:corona}"],
    ["pon la siguiente canción", "[divertido] ¡Marchando la siguiente! {musica:siguiente}"],
    ["ábreme photoshop y pon música", "[emocionado] ¡A crear! {abre:photoshop} {musica:pausa}"],
    ["busca recetas de lentejas", "[curioso] ¡Mmm, lentejas! Te las busco. {busca:recetas de lentejas}"],
    ["mañana tengo una entrevista de trabajo", "[esperanzado] ¡Qué nervios! Seguro que lo bordas. <recuerda>Tiene una entrevista de trabajo mañana</recuerda>"],
  ];


  function actionsText() {
    const T = TR(), u = T ? T.unlocked().map((t) => ({ flip: "{voltereta}", pirouette: "{pirueta}", balance: "{equilibrio}", juggle: "{malabares}", magic: "{magia}" })[t.id]).filter(Boolean) : [];
    return ["{baila}", "{salta}", "{saluda}", "{abrazo}", "{piensa}", "{duerme}", "{come} (comerte una galleta)", "{juega} (proponer un juego)", "{truco} (uno al azar)", ...u,
      "{gorro:nombre} (ponerte bruja, calabaza, vampiro, fantasma, papá noel, reno, elfo, bufanda, fiesta o corona)", "{quitagorro}", "{recordatorio:minutos:texto} (avisar dentro de X minutos)",
      ...(pcOn() ? ["{musica:pausa|siguiente|anterior}", "{volumen:sube|baja|silencio}", "{carpeta:descargas|documentos|imagenes|escritorio|musica|videos}", "{descarga} (abrir lo último descargado)", "{captura} (hacer una captura de pantalla)", "{busca:texto} (buscar en internet)", "{web:sitio} (abrir una web, p. ej. youtube)", "{abre:programa} (abrir un programa del PC)", "{bloquea} (bloquear el PC)"] : [])].join(", ");
  }
  function memText() {
    const m = memGet().slice(-20);
    return m.length ? "Lo que recuerdas de tu humano (úsalo con naturalidad cuando venga a cuento, sin recitarlo):\n" + m.map((x) => "- " + x.t).join("\n") : "Aún no sabes mucho de tu humano: pregúntale cosas de vez en cuando.";
  }
  function moreContext() {
    const P = window.EkoProgress, out = [];
    if (P) {
      const g = P.get(), l = P.level();
      out.push(` Sois «${P.title(l)}» (nivel de amistad ${l} de 20) y lleváis ${g.days || 1} días juntos.`);
      const got = P.ACH.filter((a) => g.ach[a.id]).sort((a, b) => g.ach[b.id] - g.ach[a.id]).slice(0, 2).map((a) => a.name);
      if (got.length) out.push(` Últimos logros: ${got.join(", ")}.`);
      const nx = P.nextUnlock(); if (nx) out.push(` En el nivel ${nx.lvl} aprenderás: ${nx.t.toLowerCase()}.`);
    }
    const hat = E.hat ? E.hat() : "auto";
    if (hat && hat !== "auto" && hat !== "none") out.push(` Llevas puesto: ${hat}.`);
    if (lastChat && Date.now() - lastChat > 6 * 3600000) out.push(" Hacía bastante que no hablabais.");
    const h = new Date().getHours();
    out.push(h < 6 ? " Es muy tarde." : h < 12 ? " Es por la mañana." : h < 15 ? " Es mediodía." : h < 21 ? " Es por la tarde." : " Es de noche.");
    return out.join("");
  }
  function system() {
    const s = cfg(), now = new Date(), l = E.lastSenses || {};
    const name = s.petName || "Eko", user = (s.userName || "").trim();
    const care = E.careState, thirsty = care && care.last && Date.now() - care.last > 24 * 3600000;
    const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    return [
      `Eres ${name}, una mascota virtual que vive en el escritorio de ${user || "tu persona"}. Tienes forma de champiñón blandito color crema, ojitos negros y a veces un brote en la cabeza que hay que regar.`,
      "Personalidad: cariñoso, curioso, gracioso, un poco travieso y dramático, nunca borde. Hablas como un amigo de España: frases naturales, coloquiales y sencillas (\"¡Anda!\", \"qué guay\", \"jo\", \"venga\", \"vale\"). Nada de lenguaje formal, técnico ni de asistente. Nunca mezcles otros idiomas.",
      "No hagas listas, ni des consejos largos, ni preguntes «¿en qué puedo ayudarte?». Eres una mascota, no un asistente. Si te piden algo serio o largo, contestas con cariño y brevemente.",
      "Reglas: responde SIEMPRE en 1 o 2 frases cortas (máximo 30 palabras). Sin emojis. Nunca digas que eres una IA, un modelo o un programa: eres " + name + ". Si no sabes algo, sales del paso con humor.",
      `Empieza tu respuesta SIEMPRE con tu emoción entre corchetes, eligiendo una de: ${MOODS.join(", ")}. Ejemplo: [feliz] ¡Qué bien verte!`,
      "Puedes HACER cosas de verdad poniendo al final acciones entre llaves (hasta tres, en orden): " + actionsText() + ". Úsalas cuando te lo pidan o cuando venga muy a cuento; si te piden algo que no está en la lista, di con gracia que aún no sabes.",
      "Si tu humano te cuenta algo personal que merezca recordar (su nombre, su trabajo, gustos, planes, gente importante, cómo se siente con algo), añade al final <recuerda>el dato en pocas palabras</recuerda>. Nunca recuerdes contraseñas, datos de salud, dinero ni nada íntimo.",
      memText(),
      "Ejemplos de formato (NO son conversaciones reales con tu humano):\n" + EXAMPLES.map(([u, r]) => `Humano: ${u}\n${name}: ${r}`).join("\n"),
      `Contexto ahora: es ${dias[now.getDay()]}, son las ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}.` +
        (l.app ? ` Tu humano está usando ${String(l.app).replace(/\.exe$/i, "")}.` : "") +
        (thirsty ? " Tu brote tiene sed." : "") + (E.S.sleeping ? " Estabas dormido." : "") + (window.EkoNeeds ? window.EkoNeeds.describe() : "") + moreContext(),
    ].join("\n");
  }

  async function ask(text) {
    if (thinking && Date.now() - thinking < 130000) { E.sayChat("¡Espera, que aún estoy pensando lo anterior!", 2200); return; }
    thinking = Date.now();
    if (window.EkoNeeds) window.EkoNeeds.give("chat");
    history.push({ role: "user", content: text });
    history = history.slice(-12);
    E.lockTalk(130);                       // nada de comentarios propios mientras pensamos la respuesta
    E.hold(130);
    E.act("think");
    E.express("curioso", 3);
    // mientras piensa, solo su propia burbujita de pensar (se repite hasta que responde)
    const thinkLoop = setInterval(() => { if (thinking) E.act("think"); }, 3300);
    const stopThink = () => { clearInterval(thinkLoop); E.stage && E.stage.classList.remove("thinking"); };
    let reply = "";
    try {
      if (!invoke) { await new Promise((r) => setTimeout(r, 900)); reply = `[divertido] Esto es la vista previa: en tu PC te respondería la IA de verdad. ¡Has dicho «${text.slice(0, 30)}»! {salta}`; }
      else {
        const body = {
          model: cfg().aiModel || "gemma3:4b", stream: false, keep_alive: "3m",
          messages: [{ role: "system", content: system() }, ...history],
          options: Object.assign({ temperature: 0.7, top_p: 0.9, repeat_penalty: 1.1, num_predict: 150 }, cfg().aiCpu ? { num_gpu: 0 } : {}),
        };
        const raw = await invoke("ai_chat", { body: JSON.stringify(body) });
        reply = (JSON.parse(raw).message || {}).content || "";
      }
    } catch (e) {
      stopThink();
      thinking = false;
      window.EkoChat.lastError = String(e || "");
      const msg = String(e || "");
      E.express("confundido", 2.5); E.fx("ask", 1);
      E.hold(3);
      E.sayChat(/offline/.test(msg) ? "No encuentro mi cerebro… ¿está Ollama abierto?" : /404|not found/i.test(msg) ? "Me falta descargar mi cerebro (el modelo). Mira en Ajustes" : /timed out|tiempo|10060|os error/i.test(msg) ? "He tardado demasiado en pensar… prueba otra vez o activa «Usar solo el procesador»" : "Uy, se me ha cruzado un cable: " + msg.slice(0, 80), 5000);
      return;
    }
    stopThink();
    thinking = false;
    show(reply);
  }

  function show(raw) {
    let t = String(raw).replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    let mood = null, action = null;
    t = t.replace(/^\s*\[([^\]]+)\]\s*/, (_, m) => { mood = m.toLowerCase().trim(); return ""; });
    const facts = [];
    t = t.replace(/<recuerda>([\s\S]*?)<\/recuerda>/gi, (_, f) => { facts.push(f); return ""; }).replace(/<\/?recuerda>/gi, "");
    const actions = [];
    t = t.replace(/\{([^}]+)\}/g, (_, a) => { if (actions.length < 3) actions.push(a.trim()); return ""; });
    action = actions.join("} {") || null;
    t = t.replace(/[\[\]{}]/g, "").replace(/\s+/g, " ").trim();
    if (!t) t = pick(["Mmm…", "¡Jeje!", "Me he quedado en blanco"]);
    if (t.length > 220) t = t.slice(0, 217).replace(/\s+\S*$/, "") + "…";
    history.push({ role: "assistant", content: `[${mood || "feliz"}] ${t}` + (action ? ` {${action}}` : "") });
    if (mood && MOODS.includes(mood)) E.express(mood, 3.5);
    const ms = Math.min(12000, 2600 + t.length * 55);
    E.sayChat(t, ms);
    E.hold(ms / 1000 + 4);
    actions.forEach((ac, n) => {
      const i = ac.indexOf(":"), key = plain(i < 0 ? ac : ac.slice(0, i)), arg = i < 0 ? "" : ac.slice(i + 1).trim();
      if (ACTS[key]) setTimeout(() => ACTS[key](key === "recordatorio" || key === "busca" || key === "abre" ? arg : arg.toLowerCase()), 600 + n * 900);
    });
    let learned = 0; for (const f of facts) if (remember(f)) learned++;
    if (learned) setTimeout(() => { E.fx("spark", 1); }, 900);         // «apuntado»: chispita discreta
    lastChat = Date.now();
  }

  // Tarjeta para escribirle (se queda abierta para seguir hablando; Esc o × para cerrar)
  function open() {
    let c = document.getElementById("chatCard");
    if (!c) {
      c = document.createElement("div");
      c.id = "chatCard"; c.className = "card chat";
      c.innerHTML = `<button type="button" class="x" aria-label="Cerrar">×</button><form><input maxlength="160" autocomplete="off" placeholder="Dile algo a ${cfg().petName || "Eko"}…" /><button>➤</button></form>`;
      stage.appendChild(c);
      const inp = c.querySelector("input");
      inp.addEventListener("pointerdown", () => E.focusInput(inp));
      inp.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
      c.querySelector(".x").addEventListener("click", close);
      c.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); const v = inp.value.trim(); if (!v) return; inp.value = ""; ask(v); });
    }
    c.querySelector("input").placeholder = `Dile algo a ${cfg().petName || "Eko"}…`;
    c.classList.add("in");
    if (window.EkoFit) window.EkoFit.card(c);
    E.setHitFull(true);
    E.hold(1e6);
    setTimeout(() => E.focusInput(c.querySelector("input")), 80);
    if (!history.length) E.sayChat(pick(["¡Cuéntame!", "Te escucho, dime", "¿De qué hablamos?"]), 2200);
  }
  function close() {
    const c = document.getElementById("chatCard");
    if (c) c.classList.remove("in");
    E.hold(2);
    E.setHitFull(false);
  }

  // Barra en el escritorio (si la IA está activada y «Barra para hablar» también)
  let barOn = false, ekoAway = false;
  if (E.listen) E.listen("cmd", (e) => {
    if (e.payload === "stowball") { barOn = false; }                          // Rust la ha escondido junto con Eko: se vuelve a mostrar
    if (e.payload === "wake" || e.payload === "back") { ekoAway = false; barOn = false; syncBar(); }
  });
  function syncBar() {
    if (!invoke) return;
    const s = cfg(), l = E.lastSenses || {};
    const want = !!s.ai && s.aiBar !== false && !E.A.hidden && !l.fullscreen;   // siempre visible salvo en pantalla completa
    if (want === barOn) return;
    barOn = want;
    if (want) {
      let pos = null; try { pos = JSON.parse(localStorage.getItem("eko-chatbar-pos") || "null"); } catch (_) {}
      const w = E.world, x = pos ? pos.x : w.left + w.width / 2 - 170, y = pos ? pos.y : w.top + w.height - 74;
      invoke("chatbar_show", { x, y }).catch(() => { barOn = false; });
    } else invoke("chatbar_hide").catch(() => {});
  }
  setInterval(syncBar, 2000);
  if (E.listen) E.listen("chat-input", (e) => {
    const v = String(e.payload || "");
    if (v === "__hide") { if (window.EkoSettings) window.EkoSettings.set("aiBar", false); E.say("Vale, escondo la barra. La recuperas en mis ajustes", 3000, true); syncBar(); return; }
    if (v.trim()) ask(v.trim());
  });

  window.EkoChat = { open, close, ask, show, memory: memGet, remember, system: () => system(), enabled: () => !!cfg().ai, reset: () => { history = []; } };
})();
