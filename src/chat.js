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
  const ACTS = { baila: () => { E.setDance(true); setTimeout(() => E.setDance(false), 7000); }, salta: () => E.hop(-520), saluda: () => E.act("wave"), abrazo: () => E.act("hug"), piensa: () => E.act("think"), duerme: () => E.goToSleep() };
  let history = [], thinking = 0;
  // Ejemplos de cómo habla (le enseñan el tono mejor que mil reglas)
  const EXAMPLES = [
    { role: "user", content: "hola" },
    { role: "assistant", content: "[feliz] ¡Holi! Ya te echaba de menos, ¿qué me cuentas?" },
    { role: "user", content: "estoy cansado" },
    { role: "assistant", content: "[triste] Jo… ¿y si paras cinco minutos? Yo te guardo el sitio. {abrazo}" },
    { role: "user", content: "¿qué haces?" },
    { role: "assistant", content: "[picaro] Vigilar tu escritorio. Hay una carpeta sospechosa por ahí…" },
    { role: "user", content: "cuéntame un chiste" },
    { role: "assistant", content: "[divertido] ¿Qué hace un champiñón en una fiesta? ¡Ser un fungi! Vale, me lo he currado poco. {salta}" },
  ];

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
      `Si te apetece hacer algo, termina con una acción entre llaves: {baila}, {salta}, {saluda}, {abrazo}, {piensa} o {duerme}. Úsalo poco.`,
      `Contexto ahora: es ${dias[now.getDay()]}, son las ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}.` +
        (l.app ? ` Tu humano está usando ${String(l.app).replace(/\.exe$/i, "")}.` : "") +
        (thirsty ? " Tu brote tiene sed." : "") + (E.S.sleeping ? " Estabas dormido." : "") + (window.EkoNeeds ? window.EkoNeeds.describe() : ""),
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
          messages: [{ role: "system", content: system() }, ...EXAMPLES, ...history],
          options: Object.assign({ temperature: 0.7, top_p: 0.9, repeat_penalty: 1.1, num_predict: 110 }, cfg().aiCpu ? { num_gpu: 0 } : {}),
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
    t = t.replace(/\s*\{([^}]+)\}\s*$/, (_, a) => { action = a.toLowerCase().trim(); return ""; });
    t = t.replace(/[\[\]{}]/g, "").replace(/\s+/g, " ").trim();
    if (!t) t = pick(["Mmm…", "¡Jeje!", "Me he quedado en blanco"]);
    if (t.length > 220) t = t.slice(0, 217).replace(/\s+\S*$/, "") + "…";
    history.push({ role: "assistant", content: `[${mood || "feliz"}] ${t}` });
    if (mood && MOODS.includes(mood)) E.express(mood, 3.5);
    const ms = Math.min(12000, 2600 + t.length * 55);
    E.sayChat(t, ms);
    E.hold(ms / 1000 + 4);
    if (action && ACTS[action]) setTimeout(ACTS[action], 600);
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

  window.EkoChat = { open, close, ask, enabled: () => !!cfg().ai, reset: () => { history = []; } };
})();
