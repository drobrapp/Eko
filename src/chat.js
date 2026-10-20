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
  const trick = (id) => { const T = TR(); if (!T) return false; const t = T.LIST.find((x) => x.id === id); if (t && T.has(t)) return T.run(id) !== false; E.say("¡Ese truco aún lo estoy aprendiendo!", 2200, true); return false; };
  const PC_ACTIONS = new Set(["musica", "volumen", "carpeta", "descarga", "captura", "busca", "web", "abre", "cierra", "bloquea"]);
  const TRICK_ACTIONS = { voltereta: "flip", pirueta: "pirouette", equilibrio: "balance", malabares: "juggle", magia: "magic" };
  const HATS = { bruja: "witch", calabaza: "pumpkin", vampiro: "vampire", fantasma: "ghost", "papá noel": "santa", papanoel: "santa", reno: "reindeer", elfo: "elf", bufanda: "scarf", fiesta: "party", corona: "crown" };
  // Lista cerrada de capacidades: el modelo solo puede proponerlas; Eko valida antes de ejecutarlas.
  const ACTS = {
    volar: () => E.fly ? E.fly("cape") : false,
    baila: () => { E.setDance(true); setTimeout(() => E.setDance(false), 7000); return true; }, salta: () => E.hop(-520), saluda: () => { E.act("wave"); return true; }, ven: () => { E.walkTo(E.cursor.x, 170); return true; },
    abrazo: () => window.EkoMenu && window.EkoMenu.hug ? window.EkoMenu.hug() : (E.act("hug"), true), piensa: () => { E.act("think"); return true; }, duerme: () => { if (E.S.sleeping) return { message: "Ya estaba dormido; solo me despierta un clic izquierdo." }; E.goToSleep(); return true; },
    come: () => window.EkoMenu && window.EkoMenu.snack ? window.EkoMenu.snack() : false,
    regar: () => window.EkoMenu && window.EkoMenu.startWater ? window.EkoMenu.startWater() : false,
    juega: () => window.EkoMenu && window.EkoMenu.propose ? window.EkoMenu.propose(true) : false,
    truco: () => { const T = TR(), u = T ? T.unlocked().filter((x) => x.id !== "bellyFull") : []; if (u.length) return T.run(u[Math.floor(Math.random() * u.length)].id) !== false; E.act("tada"); return true; },
    voltereta: () => trick("flip"), pirueta: () => trick("pirouette"), equilibrio: () => trick("balance"), malabares: () => trick("juggle"), magia: () => trick("magic"),
    gorro: (arg) => {
      const id = HATS[(arg || "").trim()] || (arg || "").trim();
      if (!id || id === "none" || id === "nada" || id === "ninguno") { E.setHat("none"); return true; }
      const P = window.EkoProgress;
      if (P && !P.has("acc:" + id)) return { ok: false, message: "Ese todavía no lo tengo desbloqueado." };
      E.setHat(id); return true;
    },
    quitagorro: () => { E.setHat("none"); return true; },
    // Cosas sobre el propio Eko
    casa: () => { const C = window.EkoCorner; if (!C || C.state() !== "built") return { ok: false, message: C && C.state() === "build" ? "Primero tengo que construirla. Mira en el menú: Mi casa." : "Aún no tengo casa; llega en el nivel 6." }; return C.go(C.pending().map((k) => "deliver:" + k).concat(["frame"])); },
    valle: () => { const C = window.EkoCorner; if (!C || C.state() !== "built") return { ok: false, message: "Primero necesito tener mi casa. Mira en el menú: Mi casa." }; return C.go(["valley"], "summon"); },
    cama: () => { const C = window.EkoCorner; if (C && C.state() === "built" && C.go(["bed"])) return true; E.goToSleep(); return true; },
    jugar: (g) => { const P = window.EkoProgress;
      if (["catch", "hand", "glow", "guess", "hide"].includes(g) && P && !P.has("game:" + g)) return { ok: false, message: "Ese juego aún no lo tengo desbloqueado." };
      if (g === "catch" && !E.native) return { ok: false, message: "Ese juego solo funciona en la aplicación de escritorio." };
      if (!window.EkoMenu) return false; window.EkoMenu.startGame(g); return true; },
    ponte: (a) => { const n = /gafa/.test(a) ? "readglasses" : /pajarita/.test(a) ? "bowtie" : /auricular|cascos/.test(a) ? "headphones" : null; if (!n) return false; const P = window.EkoProgress; if (P && !P.has("acc:" + n)) return { ok: false, message: "Ese accesorio aún no lo tengo desbloqueado." }; E.setWear(n, true); return true; },
    quita: (a) => { const n = /gafa/.test(a) ? "readglasses" : /pajarita/.test(a) ? "bowtie" : /auricular|cascos/.test(a) ? "headphones" : null; if (!n) return false; E.setWear(n, false); return true; },
    actualiza: () => invoke ? invoke("check_update_now").then((r) => ({ message: r ? `He encontrado la versión ${r}; ya se está descargando para instalarse.` : "He comprobado que ya estoy en la última versión." })) : false,
    libreta: () => { if (!window.EkoMenu) return false; window.EkoMenu.openAt("notebook"); return true; },
    menu: () => { if (!window.EkoMenu) return false; window.EkoMenu.openAt("home"); return true; },
    utilidades: () => { if (!window.EkoMenu) return false; window.EkoMenu.openAt("util"); return true; },
    pomodoro: (a) => { const M = window.EkoMenu; if (!M || !M.pomodoro) return false; const ok = M.pomodoro(a); return ok ? { message: a === "iniciar" ? "He iniciado el Pomodoro de 25 minutos." : "He parado el Pomodoro." } : { ok: false, message: "No había un Pomodoro activo que parar." }; },
    nota: () => window.EkoMenu && window.EkoMenu.askNote && window.EkoMenu.askNote(),
    tareas: () => window.EkoMenu && window.EkoMenu.showTasks && window.EkoMenu.showTasks(),
    silencio: () => window.EkoMenu && window.EkoMenu.muteHour && window.EkoMenu.muteHour(true),
    discrecion: (a) => { const M = window.EkoMenu, on = a === "activar"; if (!M || !M.setDiscreet) return false; if (E.quiet === on) return { message: on ? "El modo discreto ya estaba activado." : "El modo discreto ya estaba desactivado." }; return M.setDiscreet(on, true); },
    pelota: () => { const M = window.EkoMenu; if (!M) return false; return M.ball ? M.stowBall() : M.startGame("ball"); },
    ajustes: () => invoke && invoke("open_settings"),
    // ---- en tu PC (lista cerrada; se puede apagar en Ajustes) ----
    musica: (a) => pc(() => invoke(a === "siguiente" ? "media_next" : a === "anterior" ? "media_prev" : "media_play_pause"), "musica"),
    volumen: (a) => pc(() => invoke("volume", { dir: ({ sube: "up", baja: "down", silencio: "mute" })[a] })),
    carpeta: (a) => pc(() => invoke("open_folder", { which: a })),
    descarga: () => {}, // requiere aprobación tras mostrar primero el nombre del archivo
    captura: () => pc(() => invoke("screenshot")),
    busca: (a) => pc(() => invoke("web_search", { q: a })),
    web: (a) => pc(() => invoke("open_site", { url: siteUrl(a) })),
    abre: () => {}, // se resuelve por nombre y se abre directamente
    cierra: () => {}, // se resuelve contra los programas abiertos y se envía WM_CLOSE directamente
    bloquea: () => pc(() => { E.act("bye"); return new Promise((r) => setTimeout(() => r(invoke("lock_pc")), 1200)); }),
    recordatorio: (arg) => {
      const m = String(arg || "").match(/^(\d{1,3}):(.+)$/);
      if (!m || !window.EkoMenu || !window.EkoMenu.remindIn) return;
      window.EkoMenu.remindIn(+m[1], m[2].trim().slice(0, 80));
      E.fx("spark", 1);
      return true;
    },
  };
  // Catálogo único: la IA publica todas las acciones y la voz usa las mismas
  // claves y funciones; las frases de voz son solo accesos directos a ese catálogo.
  const VOICE_ACTIONS = {
    baila: ["baila", "a bailar", "ponte a bailar"], duerme: ["a dormir", "duérmete", "vete a dormir", "buenas noches"],
    ven: ["ven", "ven aquí", "acércate"], salta: ["salta", "da un salto"], truco: ["haz un truco", "un truco", "enséñame un truco"],
    volar: ["vuela", "a volar"], saluda: ["saluda", "di hola"], jugar: { phrases: ["escóndete", "al escondite", "jugamos al escondite"], argument: "escondite" },
    juega: ["juguemos", "vamos a jugar", "jugamos"], menu: ["abre el menú", "menú"], silencio: ["silencio", "calla", "cállate"],
    abrazo: ["me quieres", "te quiero"],
    recordatorio: [
      { phrase: "recuérdame en cinco minutos", argument: "5:Lo que me pediste hace cinco minutos" },
      { phrase: "recuérdame en diez minutos", argument: "10:Lo que me pediste hace diez minutos" },
      { phrase: "recuérdame en quince minutos", argument: "15:Lo que me pediste hace quince minutos" },
      { phrase: "recuérdame en media hora", argument: "30:Lo que me pediste hace media hora" },
      { phrase: "recuérdame en una hora", argument: "60:Lo que me pediste hace una hora" },
    ],
  };
  const ACTION_RESULTS = {
    volar: "¡He empezado a volar!", baila: "¡Ya estoy bailando!", salta: "¡Ahí va ese salto!", saluda: "¡Holi!", ven: "Voy hacia donde está el cursor.",
    abrazo: "¡Te mando un abrazo!", piensa: "Me he puesto a pensar.", duerme: "Me voy a dormir.", come: "¡Me he comido una galleta!",
    regar: "He sacado la regadera; arrástrala hasta mi brote para regarme.", juega: "¡Te propongo un juego!", truco: "¡Ahí va mi truco!",
    voltereta: "¡Voltereta hecha!", pirueta: "¡Pirueta hecha!", equilibrio: "¡Lo he intentado!", malabares: "¡Ahí van mis malabares!", magia: "¡Magia!",
    gorro: "Ya me he cambiado el gorro.", quitagorro: "Ya me he quitado el gorro.", casa: "He empezado a entrar en casa.", valle: "He abierto el valle.",
    cama: "Voy a mi cama.", jugar: "He abierto el juego.", ponte: "Ya llevo ese accesorio.", quita: "Ya me lo he quitado.", libreta: "He abierto la libreta.",
    menu: "He abierto el menú.", utilidades: "He abierto las utilidades.", ajustes: "He abierto los ajustes.", pomodoro: "He actualizado el Pomodoro.",
    nota: "Vamos a apuntarlo.", tareas: "Aquí tienes tus tareas.",
    silencio: "He silenciado mis sonidos durante una hora.", discrecion: "He cambiado el modo discreto.", pelota: "He empezado a sacar o guardar la pelota.", musica: "He enviado la orden a la música.", volumen: "He cambiado el volumen.", carpeta: "He abierto esa carpeta.",
    captura: "He abierto la herramienta de captura.", busca: "He abierto la búsqueda.", web: "He abierto la página.", bloquea: "He enviado la orden de bloqueo.",
    recordatorio: "He guardado el recordatorio.",
  };
  function voiceCommands() {
    const allowed = new Set(allowedActions());
    return Object.entries(VOICE_ACTIONS).filter(([name]) => allowed.has(name)).flatMap(([name, spec]) => {
      if (Array.isArray(spec) && spec.every((entry) => typeof entry === "object")) return spec.map((item) => ({ phrase: item.phrase, name, argument: item.argument || "" }));
      const item = Array.isArray(spec) ? { phrases: spec, argument: "" } : spec;
      return item.phrases.map((phrase) => ({ phrase, name, argument: item.argument || "" }));
    });
  }
  const plain = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const pcOn = () => !!invoke && cfg().pcActions !== false;
  function allowedActions() {
    return Object.keys(ACTS).filter((name) => {
      if (PC_ACTIONS.has(name) && !pcOn()) return false;
      const trickId = TRICK_ACTIONS[name];
      return !trickId || (TR() && TR().has(trickId));
    });
  }
  function responseFormat() {
    return {
      type: "object",
      properties: {
        text: { type: "string" },
        mood: { type: "string", enum: MOODS },
        actions: { type: "array", maxItems: 1, items: { type: "object", properties: {
          name: { type: "string", enum: allowedActions() }, argument: { type: "string" },
        }, required: ["name", "argument"], additionalProperties: false } },
        memories: { type: "array", maxItems: 1, items: { type: "string" } },
      },
      required: ["text", "mood", "actions", "memories"],
      additionalProperties: false,
    };
  }
  function normalizeResponse(raw) {
    let data = raw;
    if (typeof data === "string") {
      const clean = data.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      data = JSON.parse(clean);
    }
    if (!data || typeof data !== "object" || Array.isArray(data) || typeof data.text !== "string") throw new Error("respuesta estructurada inválida");
    const names = new Set(allowedActions()), proposed = Array.isArray(data.actions) ? data.actions : [];
    const memoryItems = Array.isArray(data.memories) ? data.memories : [];
    let actionError = proposed.length > 1 ? "Solo puedo hacer una cosa cada vez. Dime cuál prefieres." : "";
    const candidate = proposed.length === 1 ? proposed[0] : null;
    if (!actionError && candidate && !names.has(candidate.name)) actionError = "No tengo esa acción disponible ahora mismo.";
    if (!actionError && memoryItems.length > 1) actionError = "Solo puedo guardar un recuerdo cada vez. Dime cuál quieres que recuerde.";
    const actions = candidate && names.has(candidate.name) ? [{ name: candidate.name, argument: String(candidate.argument || "").trim().slice(0, 160) }] : [];
    const memories = memoryItems.length > 1 ? [] : memoryItems.map((f) => String(f || "").trim().slice(0, 120)).filter((f) => f.length >= 4).slice(0, 1);
    return { text: data.text.trim(), mood: MOODS.includes(String(data.mood || "").toLowerCase()) ? String(data.mood).toLowerCase() : "feliz", actions, memories, actionError };
  }
  function validateAction(action) {
    const name = action.name, raw = String(action.argument || "").trim(), value = plain(raw).replace(/\s+/g, " ");
    const fail = (message) => ({ error: message });
    if (["musica", "volumen", "carpeta", "ponte", "quita", "gorro", "jugar", "recordatorio", "busca", "web", "abre", "cierra", "pomodoro", "discrecion"].includes(name) && !raw) return fail("Dime un poco más para hacerlo.");
    if (name === "musica") {
      const map = { pausa: "pausa", pausar: "pausa", reproducir: "pausa", play: "pausa", pause: "pausa", siguiente: "siguiente", next: "siguiente", anterior: "anterior", previous: "anterior", prev: "anterior" };
      if (!map[value]) return fail("Para la música dime «pausa», «siguiente» o «anterior».");
      action.argument = map[value];
    } else if (name === "volumen") {
      const map = { sube: "sube", subir: "sube", baja: "baja", bajar: "baja", silencio: "silencio", silenciar: "silencio", mute: "silencio" };
      if (!map[value]) return fail("Para el volumen dime «sube», «baja» o «silencio».");
      action.argument = map[value];
    } else if (name === "carpeta") {
      const map = { descargas: "descargas", descarga: "descargas", downloads: "descargas", documentos: "documentos", documents: "documentos", imagenes: "imagenes", imagen: "imagenes", fotos: "imagenes", pictures: "imagenes", escritorio: "escritorio", desktop: "escritorio", musica: "musica", audio: "musica", videos: "videos", video: "videos" };
      if (!map[value]) return fail("No reconozco esa carpeta. Puedo abrir Descargas, Documentos, Imágenes, Escritorio, Música o Vídeos.");
      action.argument = map[value];
    } else if (name === "jugar") {
      const games = [["rps", /piedra|papel|tijera|rps/], ["catch", /galleta|atrapa|cesta/], ["hand", /que mano|una mano|adivina.*mano|mano escondida/], ["glow", /donde brille|donde brilla|tocar el brillo|toca el brillo|reflej/], ["guess", /adivin|que pienso/], ["hide", /escond/], ["ball", /pelota|bola/]];
      const game = games.find(([, rx]) => rx.test(value));
      if (!game) return fail("No reconozco ese juego. Dime pelota, piedra papel tijera, escondite, qué mano, atrapa galletas, tócame donde brille o adivina qué pienso.");
      action.argument = game[0];
    } else if (name === "pomodoro") {
      const map = { iniciar: "iniciar", empieza: "iniciar", empezar: "iniciar", comenzar: "iniciar", parar: "parar", detener: "parar", cancelar: "parar" };
      if (!map[value]) return fail("Dime si quieres iniciar o parar el Pomodoro.");
      action.argument = map[value];
    } else if (name === "discrecion") {
      const map = { activar: "activar", activa: "activar", discreto: "activar", desactivar: "desactivar", desactiva: "desactivar", normal: "desactivar" };
      if (!map[value]) return fail("Dime si quieres activar o desactivar el modo discreto.");
      action.argument = map[value];
    } else if (name === "gorro") {
      const id = HATS[value] || HATS[value.replace(/\s/g, "")] || (Object.values(HATS).includes(value) ? value : null);
      if (!id && !["none", "nada", "ninguno"].includes(value)) return fail("No reconozco ese gorro. Dime cuál quieres y compruebo si lo tienes desbloqueado.");
      action.argument = id || "none";
    } else if (name === "ponte" || name === "quita") {
      const map = { gafas: "gafas", "gafas de lectura": "gafas", pajarita: "pajarita", auriculares: "auriculares", cascos: "auriculares" };
      if (!map[value]) return fail("Solo puedo cambiarme las gafas, la pajarita o los auriculares.");
      action.argument = map[value];
    } else if (name === "recordatorio") {
      const m = raw.match(/^(\d{1,3}):\s*(.{1,80})$/);
      if (!m || +m[1] < 1 || +m[1] > 600 || !m[2].trim()) return fail("Dime cuántos minutos y qué debo recordarte; puedo programarlo entre 1 y 600 minutos.");
      action.argument = `${+m[1]}:${m[2].trim()}`;
    } else if (name === "busca") {
      if (raw.length > 200) return fail("La búsqueda es demasiado larga; resúmela un poquito.");
      action.argument = raw;
    } else if (name === "web") {
      if (!siteUrl(raw)) return fail("No reconozco esa web. Dime el nombre de una página o una dirección HTTPS.");
      action.argument = raw;
    } else if (name === "abre" || name === "cierra") {
      if (raw.length < 2 || raw.length > 40) return fail("Dime el nombre del programa, entre 2 y 40 caracteres.");
      action.argument = raw;
    }
    return { action };
  }
  // Ejecuta acciones permitidas en el PC; las sensibles requieren aprobación en una tarjeta de Eko.
  function pc(fn, kind) {
    if (!invoke) return Promise.reject(new Error("Esta acción solo está disponible en la aplicación de escritorio."));
    if (!pcOn()) return Promise.reject(new Error("Las acciones del PC están desactivadas en Ajustes."));
    if (kind === "musica") E.fx("note", 1); else if (kind !== "volumen") E.act("point", { dir: 1 });
    return fn();
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
  function actionOutcome(text, ms = 2600, record = true, speak = true) {
    if (record) {
      history.push({ role: "assistant", content: JSON.stringify({ text, mood: "sereno", actions: [], memories: [] }) });
      history = history.slice(-12);
    }
    if (speak) E.sayChat(text, ms);
  }
  // Ejemplos del mismo formato estructurado que Eko valida y ejecuta.
  const EXAMPLES = [
    ["hola", { text: "¡Holi! Ya te echaba de menos, ¿qué me cuentas?", mood: "feliz", actions: [], memories: [] }],
    ["vuela un poco", { text: "¡Despegando!", mood: "emocionado", actions: [{ name: "volar", argument: "" }], memories: [] }],
    ["riega tu brote", { text: "¿Me ayudas con la regadera?", mood: "esperanzado", actions: [{ name: "regar", argument: "" }], memories: [] }],
    ["inicia un pomodoro", { text: "¡Vamos a concentrarnos 25 minutos!", mood: "orgulloso", actions: [{ name: "pomodoro", argument: "iniciar" }], memories: [] }],
    ["estoy cansado", { text: "Jo… ¿y si paras cinco minutos? Yo te guardo el sitio.", mood: "triste", actions: [{ name: "abrazo", argument: "" }], memories: [] }],
    ["cuéntame un chiste", { text: "¿Qué hace un champiñón en una fiesta? ¡Ser un fungi!", mood: "divertido", actions: [{ name: "salta", argument: "" }], memories: [] }],
    ["¿me haces un truco?", { text: "¡Claro! Mira esto…", mood: "picaro", actions: [{ name: "truco", argument: "" }], memories: [] }],
    ["recuérdame en 10 minutos sacar la ropa", { text: "¡Hecho! En diez minutos te aviso de la ropa.", mood: "orgulloso", actions: [{ name: "recordatorio", argument: "10:Sacar la ropa" }], memories: [] }],
    ["ponte la corona", { text: "Su majestad está lista.", mood: "orgulloso", actions: [{ name: "gorro", argument: "corona" }], memories: [] }],
    ["pon la siguiente canción", { text: "¡Marchando la siguiente!", mood: "divertido", actions: [{ name: "musica", argument: "siguiente" }], memories: [] }],
    ["ábreme photoshop", { text: "Voy a buscar Photoshop en tus programas.", mood: "emocionado", actions: [{ name: "abre", argument: "photoshop" }], memories: [] }],
    ["cierra photoshop", { text: "Voy a buscar Photoshop entre los programas abiertos.", mood: "sereno", actions: [{ name: "cierra", argument: "photoshop" }], memories: [] }],
    ["busca recetas de lentejas", { text: "¡Mmm, lentejas! Te las busco.", mood: "curioso", actions: [{ name: "busca", argument: "recetas de lentejas" }], memories: [] }],
    ["mañana tengo una entrevista de trabajo", { text: "¡Qué nervios! Seguro que lo bordas.", mood: "esperanzado", actions: [], memories: ["Tiene una entrevista de trabajo mañana"] }],
  ];


  const ACTION_HINTS = {
      baila: "bailar", volar: "volar con la capa", salta: "dar un salto", saluda: "saludar", ven: "caminar hasta el cursor", abrazo: "dar un abrazo y aumentar el cariño", piensa: "hacer como que piensa", duerme: "dormirse",
      come: "comer una galleta", regar: "sacar la regadera para que el usuario riegue el brote", juega: "proponer un juego", truco: "hacer un truco al azar", voltereta: "hacer una voltereta", pirueta: "hacer una pirueta",
      equilibrio: "hacer equilibrio", malabares: "hacer malabares", magia: "hacer magia", gorro: "ponerse un gorro (argumento: nombre)", quitagorro: "quitarse el gorro",
      casa: "ir a su casa", valle: "salir a visitar el valle", cama: "ir a su cama", jugar: "abrir un juego (argumento: nombre)", pelota: "sacar o guardar la pelota", ponte: "ponerse gafas, pajarita o auriculares (argumento: accesorio)",
      quita: "quitarse gafas, pajarita o auriculares (argumento: accesorio)", actualiza: "buscar e instalar su actualización", libreta: "abrir la libreta", menu: "abrir el menú", utilidades: "abrir las herramientas y utilidades", ajustes: "abrir los ajustes",
      pomodoro: "iniciar o parar un temporizador de concentración de 25 minutos (argumento: iniciar o parar)", nota: "pedir una nota y guardarla en la lista de tareas", tareas: "mostrar y completar tareas guardadas", discrecion: "activar o desactivar el modo discreto (argumento: activar o desactivar)",
      silencio: "silenciar los sonidos durante una hora y restaurarlos después si estaban activos",
      recordatorio: "crear un recordatorio (argumento: minutos y texto)", musica: "controlar la música (argumento: pausa, siguiente o anterior)",
      volumen: "cambiar el volumen (argumento: sube, baja o silencio)", carpeta: "abrir una carpeta (argumento: descargas, documentos, imágenes, escritorio, música o vídeos)",
      descarga: "mostrar y pedir permiso antes de abrir la última descarga", captura: "abrir Recortes para hacer una captura de pantalla", busca: "pedir permiso y buscar en Google (argumento: consulta)",
      web: "abrir una web (argumento: sitio)", abre: "buscar y abrir directamente un programa por su nombre habitual (puede ser parcial, por ejemplo Photoshop)", cierra: "buscar y cerrar directamente un programa abierto (nombre parcial, por ejemplo Photoshop)", bloquea: "bloquear el PC",
    };
  function actionsText() { return allowedActions().map((name) => `${name}: ${ACTION_HINTS[name] || "acción disponible"}`).join("; "); }
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
      `La respuesta debe usar los campos JSON del formato obligatorio: text es lo que dices, mood una emoción de esta lista: ${MOODS.join(", ")}; actions son acciones estructuradas; memories son recuerdos breves. No pongas acciones ni etiquetas dentro del texto.`,
      "Capacidades activas ahora: " + actionsText() + ". Elige solo nombres de acción de esta lista. Pon su nombre en actions[].name y el dato en actions[].argument; si no hace falta ejecutar nada, devuelve actions vacío. Devuelve como máximo una acción por respuesta y solo si te la piden o viene muy a cuento. Cuando pidas una acción, habla en futuro; la aplicación confirmará después si se completó. No afirmes que ya la hiciste. Las acciones sensibles pedirán aprobación. Abrir y cerrar programas no requieren una tarjeta de confirmación; cuando haya varias coincidencias se usará la primera, la más cercana. Si no puedes hacerlo, explícalo en text y no inventes una acción.",
      "Si tu humano cuenta algo personal que pueda ser útil recordar (su nombre, trabajo, gustos, planes o gente importante), puedes proponerlo en memories como una frase breve. Nunca guardes contraseñas, datos de salud, dinero ni nada íntimo.",
      memText(),
      "Ejemplos del formato (NO son conversaciones reales con tu humano):\n" + EXAMPLES.filter(([, r]) => r.actions.every((a) => allowedActions().includes(a.name))).map(([u, r]) => `Humano: ${u}\n${name}: ${JSON.stringify(r)}`).join("\n"),
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
    let reply;
    try {
      if (!invoke) { await new Promise((r) => setTimeout(r, 900)); reply = normalizeResponse({ text: `Esto es la vista previa: en tu PC te respondería la IA de verdad. ¡Has dicho «${text.slice(0, 30)}»!`, mood: "divertido", actions: [{ name: "salta", argument: "" }], memories: [] }); }
      else {
        const body = {
          model: cfg().aiModel || "gemma3:4b", stream: false, keep_alive: "3m",
          format: responseFormat(),
          messages: [{ role: "system", content: system() }, ...history],
          options: Object.assign({ temperature: 0.7, top_p: 0.9, repeat_penalty: 1.1, num_predict: 150 }, cfg().aiCpu ? { num_gpu: 0 } : {}),
        };
        const raw = await invoke("ai_chat", { body: JSON.stringify(body) });
        reply = normalizeResponse((JSON.parse(raw).message || {}).content || "");
      }
    } catch (e) {
      stopThink();
      thinking = false;
      window.EkoChat.lastError = String(e || "");
      const msg = String(e || "");
      E.express("confundido", 2.5); E.fx("ask", 1);
      E.hold(3);
      E.sayChat(/offline/.test(msg) ? "No encuentro mi cerebro… ¿está Ollama abierto?" : /404|not found/i.test(msg) ? "Me falta descargar mi cerebro (el modelo). Mira en Ajustes" : /timed out|tiempo|10060|os error/i.test(msg) ? "He tardado demasiado en pensar… prueba otra vez o activa «Usar solo el procesador»" : /respuesta estructurada inválida|json/i.test(msg) ? "Me he liado al ordenar mis ideas… ¿me lo dices de otra forma?" : "Uy, se me ha cruzado un cable: " + msg.slice(0, 80), 5000);
      return;
    }
    stopThink();
    thinking = false;
    show(reply);
  }

  function show(raw) {
    const response = normalizeResponse(raw);
    const mood = response.mood, actions = response.actionError ? [] : response.actions, facts = response.actionError ? [] : response.memories;
    // El texto del modelo no puede afirmar que una acción ya se completó antes de ejecutarla.
    let t = (response.actionError || (actions[0] ? "Voy a intentarlo." : facts[0] ? "Te pregunto antes de guardarlo." : response.text)).replace(/<think>[\s\S]*?<\/think>/g, "").replace(/[\[\]{}]/g, "").replace(/\s+/g, " ").trim();
    if (!t) t = pick(["Mmm…", "¡Jeje!", "Me he quedado en blanco"]);
    if (t.length > 220) t = t.slice(0, 217).replace(/\s+\S*$/, "") + "…";
    history.push({ role: "assistant", content: JSON.stringify({ text: t, mood, actions, memories: [] }) });
    E.express(mood, 3.5);
    const ms = Math.min(12000, 2600 + t.length * 55);
    E.sayChat(t, ms);
    E.hold(ms / 1000 + 4);
    const queue = [];
    if (actions[0]) queue.push((next) => runAction(actions[0], next));
    if (facts[0]) queue.push((next) => approveMemory(facts[0], next));
    const next = () => { const task = queue.shift(); if (task) task(next); };
    if (queue.length) setTimeout(next, 600);
    lastChat = Date.now();
  }

  function approvalCard(title, detail, onYes, done, successText) {
    const M = window.EkoMenu;
    if (!M || !M.confirmAction || E.A.hidden) {
      E.sayChat("No he hecho nada ni he guardado el recuerdo: necesito que Eko esté visible para pedirte permiso.", 4200);
      done && done();
      return;
    }
    M.confirmAction(title, detail, async () => {
      try {
        const result = await onYes();
        if (result !== false && successText) actionOutcome(typeof result === "object" && result.message ? result.message : successText);
        else if (result === false) actionOutcome("No he podido completar esa acción.");
      } catch (_) { actionOutcome("No he podido completar esa acción; la operación ha fallado.", 2800); }
      done && done();
    }, () => { actionOutcome("Vale, no lo he hecho.", 1800); done && done(); });
  }

  function approveMemory(fact, done) {
    approvalCard("¿Quieres que recuerde esto?", fact, () => {
      if (remember(fact)) { E.fx("spark", 1); E.sayChat("Vale, me lo apunto", 1800); }
      else E.sayChat("Eso ya lo tenía apuntado", 1800);
    }, done);
  }

  async function performAction(name, argument = "", fromVoice = false) {
    if (!allowedActions().includes(name) || !ACTS[name]) return false;
    if (fromVoice && PC_ACTIONS.has(name)) return false;
    if (PC_ACTIONS.has(name) && !pcOn()) return false;
    const checked = validateAction({ name, argument });
    if (checked.error) { E.sayChat(checked.error, 3600); return false; }
    try {
      const result = await ACTS[name](checked.action.argument);
      if (result === false) { actionOutcome("Ahora mismo no he podido hacerlo.", 2400, !fromVoice); return false; }
      if (result && result.ok === false) { actionOutcome(result.message || "Ahora mismo no puedo hacerlo.", 2800, !fromVoice); return false; }
      const message = result && typeof result === "object" && result.message ? result.message : ACTION_RESULTS[name];
      if (message) actionOutcome(message, 2600, !fromVoice, name !== "duerme");
      return true;
    } catch (_) {
      actionOutcome("No he podido completar esa acción; la operación ha fallado.", 2800, !fromVoice);
      return false;
    }
  }

  function runAction(proposed, done) {
    const valid = validateAction(proposed);
    if (valid.error) { E.sayChat(valid.error, 4200); done(); return; }
    const { name, argument } = valid.action;
    if (PC_ACTIONS.has(name) && !pcOn()) { E.sayChat("Tengo desactivadas las acciones del PC", 2500); done(); return; }
    if (name === "busca") {
      approvalCard("¿Busco esto en Google?", argument, () => ACTS.busca(argument), done, "He abierto la búsqueda.");
      return;
    }
    if (name === "web") {
      const url = siteUrl(argument);
      approvalCard("¿Abro esta página?", url, () => invoke("open_site", { url }), done, "He abierto la página.");
      return;
    }
    if (name === "bloquea") {
      approvalCard("¿Bloqueo ahora el PC?", "Se bloqueará tu sesión de Windows.", () => ACTS.bloquea(), done, "He enviado la orden de bloqueo.");
      return;
    }
    if (name === "abre") {
      invoke("find_apps", { name: plain(argument) }).then((matches) => {
        const list = Array.isArray(matches) ? matches : [];
        if (!list.length) { E.sayChat(`No encuentro «${argument}» en el menú Inicio.`, 3000); done(); return; }
        const selected = list[0];
        invoke("open_app", { name: selected }).then(() => {
          const detail = list.length > 1 ? `He elegido la coincidencia más cercana, ${selected}, y he enviado la orden para abrirla.` : `He enviado la orden para abrir ${selected}.`;
          actionOutcome(detail, 3600);
        }).catch(() => actionOutcome(`No he podido abrir ${selected}.`, 2800)).finally(done);
      }).catch(() => { E.sayChat("No he podido buscar ese programa", 2600); done(); });
      return;
    }
    if (name === "cierra") {
      invoke("find_running_apps", { name: plain(argument) }).then((matches) => {
        const list = Array.isArray(matches) ? matches : [];
        if (!list.length) { E.sayChat(`No encuentro «${argument}» entre los programas abiertos.`, 3200); done(); return; }
        const selected = list[0];
        invoke("close_app", { name: selected }).then(() => {
          const detail = list.length > 1 ? `He elegido la coincidencia más cercana, ${selected}, y he enviado la petición para cerrarla. Si tiene cambios sin guardar, puede pedirte que los guardes.` : `He enviado la petición para cerrar ${selected}. Si tiene cambios sin guardar, puede pedirte que los guardes.`;
          actionOutcome(detail, 4200);
        }).catch(() => actionOutcome(`No he podido cerrar ${selected}.`, 2800)).finally(done);
      }).catch(() => { E.sayChat("No he podido consultar los programas abiertos", 2600); done(); });
      return;
    }
    if (name === "descarga") {
      invoke("latest_download").then((filename) => {
        if (!filename) { E.sayChat("No encuentro archivos en Descargas", 2400); done(); return; }
        approvalCard("¿Abro este archivo?", filename, () => invoke("open_download_named", { name: filename }), done, `He enviado la orden para abrir ${filename}.`);
      }).catch(() => { E.sayChat("No he podido mirar tus Descargas", 2600); done(); });
      return;
    }
    performAction(name, argument).finally(() => done());
  }

  // Tarjeta para escribirle (se queda abierta para seguir hablando; Esc o × para cerrar)
  function open() {
    // En el escritorio: la barra propia (se puede mover y no persigue a Eko)
    if (invoke) {
      barTemp = cfg().aiBar === false; barOn = true;
      let pos = null; try { pos = JSON.parse(localStorage.getItem("eko-chatbar-pos") || "null"); } catch (_) {}
      const x = pos ? pos.x : window.screenX + 40, y = pos ? pos.y : window.screenY + 150;
      invoke("chatbar_show", { x, y, focus: true }).catch(() => { barOn = false; barTemp = false; });
      if (!history.length) E.sayChat(pick(["¡Cuéntame!", "Te escucho, dime", "¿De qué hablamos?"]), 2200);
      return;
    }
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
  let barOn = false, barTemp = false, ekoAway = false;
  if (E.listen) E.listen("cmd", (e) => {
    if (e.payload === "stowball") { barOn = false; }                          // Rust la ha escondido junto con Eko: se vuelve a mostrar
    if (e.payload === "wake" || e.payload === "back") { ekoAway = false; barOn = false; syncBar(); }
  });
  function syncBar() {
    if (!invoke) return;
    const s = cfg(), l = E.lastSenses || {};
    const want = (barTemp || (!!s.ai && s.aiBar !== false)) && !E.A.hidden && !l.fullscreen;   // siempre visible salvo en pantalla completa
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
    if (v === "__hide" && barTemp) { barTemp = false; syncBar(); return; }   // abierta desde «Hablar conmigo»: solo se cierra
    if (v === "__hide") { if (window.EkoSettings) window.EkoSettings.set("aiBar", false); E.say("Vale, escondo la barra. La recuperas en mis ajustes", 3000, true); syncBar(); return; }
    if (v.trim()) ask(v.trim());
  });

  function voiceHelp() {
    const samples = new Map();
    for (const item of voiceCommands()) if (!samples.has(item.name)) samples.set(item.name, item.phrase);
    const phrases = [...samples.values()];
    const prefix = cfg().petName || "Eko";
    return phrases.length ? `Dime «${prefix}» y luego: ${phrases.join(", ")}. Si estoy dormido, solo me despierta un clic izquierdo.` : "Ahora mismo no tengo órdenes de voz disponibles.";
  }
  window.EkoChat = {
    open, close, ask, show, memory: memGet, remember, system: () => system(), enabled: () => !!cfg().ai,
    capabilities: () => allowedActions().map((name) => ({ name, description: ACTION_HINTS[name] || "Acción disponible" })),
    voiceCommands, voiceHelp, runVoiceAction: (name, argument) => performAction(name, argument, true),
    reset: () => { history = []; },
  };
})();
