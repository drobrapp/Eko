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
  const PC_ACTIONS = new Set(["musica", "volumen", "carpeta", "descarga", "captura", "busca", "web", "abre", "bloquea"]);
  const TRICK_ACTIONS = { voltereta: "flip", pirueta: "pirouette", equilibrio: "balance", malabares: "juggle", magia: "magic" };
  const HATS = { bruja: "witch", calabaza: "pumpkin", vampiro: "vampire", fantasma: "ghost", "papá noel": "santa", papanoel: "santa", reno: "reindeer", elfo: "elf", bufanda: "scarf", fiesta: "party", corona: "crown" };
  // Lista cerrada de capacidades: el modelo solo puede proponerlas; Eko valida antes de ejecutarlas.
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
    // Cosas sobre el propio Eko
    casa: () => { const C = window.EkoCorner; if (!C || C.state() !== "built") { E.sayChat(C && C.state() === "build" ? "¡Primero tengo que construirla! Mira en el menú: Mi casa" : "Aún no tengo casa… llega en el nivel 6", 2600); return; } C.go(C.pending().map((k) => "deliver:" + k).concat(["frame"])); },
    cama: () => { const C = window.EkoCorner; if (C && C.state() === "built" && C.go(["bed"])) return; E.goToSleep(); },
    jugar: (a) => { const g = /galleta|atrapa|cesta/.test(a) ? "catch" : /mano/.test(a) ? "hand" : /brill|toca|reflej/.test(a) ? "glow" : /adivin|piens/.test(a) ? "guess" : /piedra|papel|tijera/.test(a) ? "rps" : /escond/.test(a) ? "hide" : /pelota/.test(a) ? "ball" : null;
      const P = window.EkoProgress; if (g && P && ["catch", "hand", "glow", "guess", "hide"].includes(g) && !P.has("game:" + g)) { E.sayChat("Ese juego aún no lo tengo desbloqueado", 2400); return; }
      if (g && window.EkoMenu) window.EkoMenu.startGame(g); else ACTS.juega(); },
    ponte: (a) => { const n = /gafa/.test(a) ? "readglasses" : /pajarita/.test(a) ? "bowtie" : /auricular|cascos/.test(a) ? "headphones" : null; if (!n) return; const P = window.EkoProgress; if (P && !P.has("acc:" + n)) { E.sayChat("Eso todavía no lo tengo en el armario", 2200); return; } E.setWear(n, true); },
    quita: (a) => { const n = /gafa/.test(a) ? "readglasses" : /pajarita/.test(a) ? "bowtie" : /auricular|cascos/.test(a) ? "headphones" : null; if (n) E.setWear(n, false); },
    actualiza: () => invoke && invoke("check_update_now").then((r) => E.sayChat(r ? `¡Hay versión nueva (${r})! Me actualizo enseguida` : "Ya estoy en la última versión", 2800)).catch(() => E.sayChat("No he podido mirar si hay actualizaciones", 2400)),
    libreta: () => window.EkoMenu && window.EkoMenu.openAt("notebook"),
    menu: () => window.EkoMenu && window.EkoMenu.openAt("home"),
    ajustes: () => invoke && invoke("open_settings"),
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
        actions: { type: "array", items: { type: "object", properties: {
          name: { type: "string", enum: allowedActions() }, argument: { type: "string" },
        }, required: ["name", "argument"], additionalProperties: false } },
        memories: { type: "array", items: { type: "string" } },
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
    const names = new Set(allowedActions());
    const actions = (Array.isArray(data.actions) ? data.actions : []).filter((a) => a && names.has(a.name))
      .slice(0, 3).map((a) => ({ name: a.name, argument: String(a.argument || "").trim().slice(0, 160) }));
    const memories = (Array.isArray(data.memories) ? data.memories : []).map((f) => String(f || "").trim().slice(0, 120)).filter((f) => f.length >= 4).slice(0, 3);
    return { text: data.text.trim(), mood: MOODS.includes(String(data.mood || "").toLowerCase()) ? String(data.mood).toLowerCase() : "feliz", actions, memories };
  }
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
  // Ejemplos del mismo formato estructurado que Eko valida y ejecuta.
  const EXAMPLES = [
    ["hola", { text: "¡Holi! Ya te echaba de menos, ¿qué me cuentas?", mood: "feliz", actions: [], memories: [] }],
    ["estoy cansado", { text: "Jo… ¿y si paras cinco minutos? Yo te guardo el sitio.", mood: "triste", actions: [{ name: "abrazo", argument: "" }], memories: [] }],
    ["cuéntame un chiste", { text: "¿Qué hace un champiñón en una fiesta? ¡Ser un fungi!", mood: "divertido", actions: [{ name: "salta", argument: "" }], memories: [] }],
    ["¿me haces un truco?", { text: "¡Claro! Mira esto…", mood: "picaro", actions: [{ name: "truco", argument: "" }], memories: [] }],
    ["recuérdame en 10 minutos sacar la ropa", { text: "¡Hecho! En diez minutos te aviso de la ropa.", mood: "orgulloso", actions: [{ name: "recordatorio", argument: "10:Sacar la ropa" }], memories: [] }],
    ["ponte la corona", { text: "Su majestad está lista.", mood: "orgulloso", actions: [{ name: "gorro", argument: "corona" }], memories: [] }],
    ["pon la siguiente canción", { text: "¡Marchando la siguiente!", mood: "divertido", actions: [{ name: "musica", argument: "siguiente" }], memories: [] }],
    ["ábreme photoshop y pon música", { text: "¡A crear!", mood: "emocionado", actions: [{ name: "abre", argument: "photoshop" }, { name: "musica", argument: "pausa" }], memories: [] }],
    ["busca recetas de lentejas", { text: "¡Mmm, lentejas! Te las busco.", mood: "curioso", actions: [{ name: "busca", argument: "recetas de lentejas" }], memories: [] }],
    ["mañana tengo una entrevista de trabajo", { text: "¡Qué nervios! Seguro que lo bordas.", mood: "esperanzado", actions: [], memories: ["Tiene una entrevista de trabajo mañana"] }],
  ];


  function actionsText() {
    const hints = {
      baila: "bailar", salta: "dar un salto", saluda: "saludar", abrazo: "dar un abrazo", piensa: "hacer como que piensa", duerme: "dormirse",
      come: "comer una galleta", juega: "proponer un juego", truco: "hacer un truco al azar", voltereta: "hacer una voltereta", pirueta: "hacer una pirueta",
      equilibrio: "hacer equilibrio", malabares: "hacer malabares", magia: "hacer magia", gorro: "ponerse un gorro (argumento: nombre)", quitagorro: "quitarse el gorro",
      casa: "ir a su casa", cama: "ir a su cama", jugar: "abrir un juego (argumento: nombre)", ponte: "ponerse gafas, pajarita o auriculares (argumento: accesorio)",
      quita: "quitarse gafas, pajarita o auriculares (argumento: accesorio)", actualiza: "buscar e instalar su actualización", libreta: "abrir la libreta", menu: "abrir el menú", ajustes: "abrir los ajustes",
      recordatorio: "crear un recordatorio (argumento: minutos y texto)", musica: "controlar la música (argumento: pausa, siguiente o anterior)",
      volumen: "cambiar el volumen (argumento: sube, baja o silencio)", carpeta: "abrir una carpeta (argumento: descargas, documentos, imágenes, escritorio, música o vídeos)",
      descarga: "abrir la última descarga", captura: "hacer una captura de pantalla", busca: "buscar en internet (argumento: consulta)",
      web: "abrir una web (argumento: sitio)", abre: "abrir un programa (argumento: nombre)", bloquea: "bloquear el PC",
    };
    return allowedActions().map((name) => `${name}: ${hints[name] || "acción disponible"}`).join("; ");
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
      `La respuesta debe usar los campos JSON del formato obligatorio: text es lo que dices, mood una emoción de esta lista: ${MOODS.join(", ")}; actions son acciones estructuradas; memories son recuerdos breves. No pongas acciones ni etiquetas dentro del texto.`,
      "Capacidades activas ahora: " + actionsText() + ". Elige solo nombres de acción de esta lista. Pon su nombre en actions[].name y el dato en actions[].argument; si no hace falta ejecutar nada, devuelve actions vacío. Máximo tres acciones, solo si las piden o vienen muy a cuento. Si no puedes hacerlo, explícalo en text y no inventes una acción.",
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
    let t = response.text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/[\[\]{}]/g, "").replace(/\s+/g, " ").trim();
    const mood = response.mood, actions = response.actions, facts = response.memories;
    if (!t) t = pick(["Mmm…", "¡Jeje!", "Me he quedado en blanco"]);
    if (t.length > 220) t = t.slice(0, 217).replace(/\s+\S*$/, "") + "…";
    history.push({ role: "assistant", content: JSON.stringify({ text: t, mood, actions, memories: [] }) });
    E.express(mood, 3.5);
    const ms = Math.min(12000, 2600 + t.length * 55);
    E.sayChat(t, ms);
    E.hold(ms / 1000 + 4);
    actions.forEach(({ name, argument }, n) => {
      const arg = ["recordatorio", "busca", "abre"].includes(name) ? argument : argument.toLowerCase();
      setTimeout(() => ACTS[name](arg), 600 + n * 900);
    });
    let learned = 0; for (const f of facts) if (remember(f)) learned++;
    if (learned) setTimeout(() => { E.fx("spark", 1); }, 900);         // «apuntado»: chispita discreta
    lastChat = Date.now();
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

  window.EkoChat = { open, close, ask, show, memory: memGet, remember, system: () => system(), enabled: () => !!cfg().ai, reset: () => { history = []; } };
})();
