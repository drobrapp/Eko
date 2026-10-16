// Eko · ventana de Ajustes
(() => {
  "use strict";
  const S = window.EkoSettings;
  const T = window.__TAURI__;
  const invoke = T ? T.core.invoke : null;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  let savedTimer = 0;
  const saved = () => { $("#saved").classList.add("show"); clearTimeout(savedTimer); savedTimer = setTimeout(() => $("#saved").classList.remove("show"), 1100); };

  // ---------- Eko te habla desde la cabecera ----------
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  let saysTimer = 0;
  function says(text) {
    const b = $("#says"), sv = $("header svg");
    if (!b) return;
    // si la cabecera no se ve, Eko asoma en la esquina
    const fl = $("#floatSay");
    if (fl && window.scrollY > 70) {
      if (!fl.querySelector("svg")) { const c = sv.cloneNode(true); c.removeAttribute("class"); c.querySelector("#mEyes") && c.querySelector("#mEyes").removeAttribute("id"); fl.appendChild(c); }
      $("#floatTxt").textContent = text;
      fl.classList.remove("in"); void fl.offsetWidth; fl.classList.add("in");
      clearTimeout(says.ft); says.ft = setTimeout(() => fl.classList.remove("in"), 4500);
      return;
    }
    b.classList.remove("in"); void b.offsetWidth;
    b.textContent = text; b.classList.add("in");
    sv.classList.remove("hop"); void sv.offsetWidth; sv.classList.add("hop");
    clearTimeout(saysTimer); saysTimer = setTimeout(() => b.classList.remove("in"), 6000);
  }
  const nm = () => (S.get().userName || "").trim();
  const HELLO = [
    () => "Aquí puedes cambiarme cosas. Con cariño, ¿eh?",
    () => nm() ? `¡Hola, ${nm()}! ¿Qué toca cambiar hoy?` : "¡Hola! ¿Qué toca cambiar hoy?",
    () => "No me quites la capa, porfa.",
    () => "Toca lo que quieras, yo miro.",
  ];
  const yes = (v) => v === true || v === "true";
  const REACT = {
    petName: (v) => `¿«${v}»? ¡Me gusta cómo suena!`,
    userName: (v) => v ? `¡Encantado, ${v}!` : "Vale, seguirás siendo un misterio",
    bedtime: () => "Apuntado. A esa hora te mandaré a dormir (con cariño)",
    menuAsk: (v) => yes(v) ? "¡Bien! Me encanta preguntarte cosas" : "Vale, nada de preguntas. Solo opciones",
    needs: (v) => yes(v) ? "¡Bien! Así sabrás cuándo me apetece algo" : "Vale, me apaño solito",
    needsMode: (v) => v === "relax" ? "Tranqui, soy de bajo mantenimiento" : v === "hard" ? "¡Prepárate, que soy muy demandante!" : "Ni mucho ni poco",
    voice: (v) => yes(v) ? "¡Bla, bla! ¿Me oyes?" : "Vale… seré un mimo",
    pitch: () => "¿Así sueno mejor?",
    walk: (v) => yes(v) ? "¡A pasear!" : "¿Quieto? Bueno, haré yoga",
    fly: (v) => yes(v) ? "¡Capa lista!" : "Guardo la capa… snif",
    follow: (v) => yes(v) ? "¡Te sigo con la mirada!" : "Vale, no te miro… (mucho)",
    ai: (v) => yes(v) ? "¡Voy a poder charlar contigo de verdad!" : "Vale, vuelvo a ser de pocas palabras",
    pcActions: (v) => yes(v) ? "¡Pídeme cosas! Pongo música, abro programas, busco…" : "Vale, no toco nada de tu PC",
    aiBar: (v) => yes(v) ? "¡Barrita fuera! Arrástrala adonde te venga bien" : "Vale, escondo la barra",
    aiCpu: (v) => yes(v) ? "Pensaré más despacio, pero sin forzar tu gráfica" : "¡A toda máquina!",
    listen: (v) => yes(v) ? "¡Te escucho! Llámame por mi nombre" : "Vale, me tapo las orejas",
    desktop: (v) => yes(v) ? "¡Bien! Me encanta curiosear. Prometo no abrir nada" : "Vale, no toco tu escritorio",
    hideCall: (v) => yes(v) ? "En llamadas, desaparezco" : "¿Puedo salir en tus llamadas? ¡Hola a todos!",
    hideRecord: (v) => yes(v) ? "Si grabas, me escondo" : "¡Voy a salir en tu vídeo!",
    hideFull: (v) => yes(v) ? "En pantalla completa no molesto" : "Vale, me quedo aunque veas una peli",
    breaks: (v) => yes(v) ? "Te avisaré para que descanses un poco" : "Vale… pero no te olvides de estirar",
    chatty: (v) => ["Me callo. Pero que conste que me cuesta", "Hablaré poquito", "Lo normal, como siempre", "¡Por fin! Tengo tanto que contarte"][+v] || "",
    size: (v) => (+v < 1 ? "¡Me he encogido!" : +v > 1 ? "¡Mírame, soy enorme!" : "Tamaño normal, como me gusta"),
    breakMinutes: () => "Vale, ese es el ritmo",
    scrollMinutes: (v) => (+v ? "Te avisaré si te enganchas a las redes" : "Vale, scroll libre… pero yo lo veo todo"),
    autostart: (v) => (yes(v) ? "¡Así nos vemos cada mañana!" : "¿Tendrás que despertarme tú? Vale"),
    birthday: () => "¡Apuntado! Ese día, fiesta",
  };
  const react = (k, v) => { const f = REACT[k]; if (f) { const t = f(v); if (t) says(t); } };
  setTimeout(() => says(pick(HELLO)()), 500);
  // Los ojos miran hacia donde está el ratón
  document.addEventListener("pointermove", (e) => {
    const r = $("header svg").getBoundingClientRect();
    const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 300)), dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 300));
    $("#mEyes").style.translate = `${(dx * 9).toFixed(1)}px ${(dy * 7).toFixed(1)}px`;
  });

  function fill() {
    const s = S.get();
    $("#title").textContent = `Ajustes de ${s.petName || "Eko"}`;
    $$("input[data-k]").forEach((el) => {
      const v = s[el.dataset.k];
      if (el.type === "checkbox") el.checked = !!v; else el.value = v;
    });
    $$(".seg[data-k]").forEach((seg) => seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", String(s[seg.dataset.k]) === b.dataset.v)));
    $$("textarea[data-app]").forEach((t) => { if (document.activeElement !== t) t.value = s.apps[t.dataset.app] || ""; });
    const [m, d] = (s.birthday || "-").split("-");
    $("#bday-d").value = d || ""; $("#bday-m").value = m || "";
  }

  // Cumpleaños: día y mes
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  $("#bday-d").innerHTML = '<option value="">Día</option>' + Array.from({ length: 31 }, (_, i) => `<option value="${String(i + 1).padStart(2, "0")}">${i + 1}</option>`).join("");
  $("#bday-m").innerHTML = '<option value="">Mes</option>' + meses.map((n, i) => `<option value="${String(i + 1).padStart(2, "0")}">${n}</option>`).join("");
  const saveBday = () => { const d = $("#bday-d").value, m = $("#bday-m").value; S.set("birthday", d && m ? `${m}-${d}` : ""); saved(); if (d && m) react("birthday"); };
  $("#bday-d").addEventListener("change", saveBday);
  $("#bday-m").addEventListener("change", saveBday);

  $$("input[data-k]").forEach((el) => {
    const ev = el.type === "text" ? "input" : "change";
    el.addEventListener(ev, () => {
      const k = el.dataset.k;
      const v = el.type === "checkbox" ? el.checked : el.type === "range" ? +el.value : el.value;
      if (k === "petName" && !String(v).trim()) return;
      S.set(k, v); saved();
      if (k === "petName") $("#title").textContent = `Ajustes de ${v}`;
      clearTimeout(el._rt); el._rt = setTimeout(() => react(k, v), el.type === "text" ? 900 : 0);
    });
  });
  $$(".seg[data-k]").forEach((seg) => seg.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const v = isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v;
    S.set(seg.dataset.k, v); fill(); saved(); react(seg.dataset.k, v);
  }));
  $$("textarea[data-app]").forEach((t) => t.addEventListener("change", () => { S.setApp(t.dataset.app, t.value); saved(); }));

  // Probar la voz con el tono elegido
  let ctx = null;
  $("#tryVoice").addEventListener("click", () => {
    try { ctx = ctx || new AudioContext(); } catch (_) { return; }
    const base = +$("#pitch").value;
    for (let i = 0; i < 6; i++) {
      const t = ctx.currentTime + i * 0.14, o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      const p = base * (0.85 + Math.random() * 0.5);
      o.type = "triangle"; o.frequency.setValueAtTime(p, t); o.frequency.exponentialRampToValueAtTime(p * (0.8 + Math.random() * 0.4), t + 0.09);
      f.type = "lowpass"; f.frequency.value = 2000;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(f).connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.12);
    }
  });

  // Sistema (solo en la app)
  if (invoke) {
    invoke("get_autostart").then((v) => { $("#autostart").checked = !!v; }).catch(() => {});
    invoke("app_version").then((v) => { $("#ver").textContent = `Versión ${v} · todo se guarda solo en tu PC`; }).catch(() => {});
  }
  $("#autostart").addEventListener("change", (e) => { react("autostart", e.target.checked); if (invoke) invoke("set_autostart", { value: e.target.checked }).then(saved); });
  $("#checkUpd").addEventListener("click", () => {
    $("#updState").textContent = "Buscando…";
    if (!invoke) { setTimeout(() => { $("#updState").textContent = "Solo funciona en la app"; }, 600); return; }
    invoke("check_update_now").then((r) => { $("#updState").textContent = r ? `Hay versión nueva (${r}). Eko se actualiza ahora.` : "Ya tienes la última versión"; })
      .catch(() => { $("#updState").textContent = "No se ha podido comprobar"; });
  });

  // Prueba del micrófono: muestra en vivo lo que oye Eko
  const VS = {
    speech: () => "🎙 Te oigo hablar",
    end: () => "· fin de la frase",
    cmd: (e) => `✅ Entendido: «${e.text}» (confianza ${["alta", "media", "baja", "muy baja"][e.conf] || "?"})`,
    unknown: (e) => `🤔 Ha oído «${e.text}» pero no es una orden`,
    nomatch: () => "❓ Te ha oído pero no ha entendido ninguna orden",
    "ignored-music": () => "⏸ Te oye, pero no hace caso: está sonando música",
    "ignored-call": (e) => { const apps = String(e.text || "").split("|")[1] || ""; return `⏸ Te oye, pero no hace caso: cree que estás en una llamada${apps ? ` (usa el micro: ${apps})` : ""}`; },
    "ignored-quiet": () => "⏸ Te oye, pero está en modo discreto",
    "ignored-hidden": () => "⏸ Te oye, pero está escondido",
    error: (e) => `⚠ Error: ${e.text || "no puede usar el micrófono"} — revisa Windows → Hora e idioma → Voz`,
  };
  let vlog = [];
  $("#voiceTest").addEventListener("click", () => {
    const pre = $("#voiceLog");
    pre.hidden = false;
    if (!S.get().listen) { S.set("listen", true); fill(); }
    vlog = ["Escuchando… di «" + (S.get().petName || "Eko") + ", ¿qué hora es?»"];
    pre.textContent = vlog.join("\n");
    says("¡Háblame! Te digo lo que oigo");
  });
  if (T && T.event) {
    const add = (line) => { const pre = $("#voiceLog"); if (pre.hidden) return; vlog.push(line); vlog = vlog.slice(-12); pre.textContent = vlog.join("\n"); pre.scrollTop = 1e6; };
    T.event.listen("voice-status", (e) => { const f = VS[e.payload.state]; if (f) add(f(e.payload)); });
  }

  // Comprobar la IA local (Ollama)
  $("#aiCheck").addEventListener("click", async () => {
    const st = $("#aiState");
    if (!invoke) { st.textContent = "Solo funciona en la app"; return; }
    st.textContent = "Comprobando…";
    try {
      const j = JSON.parse(await invoke("ai_status"));
      const names = (j.models || []).map((m) => m.name);
      const want = (S.get().aiModel || "gemma3:4b").trim();
      const has = names.some((n) => n === want || n === want + ":latest" || n.split(":")[0] === want);
      if (has) {
        st.textContent = `✅ Ollama funciona y tienes «${want}». Probando a hablar… (la primera vez puede tardar hasta un minuto)`;
        const t0 = Date.now();
        try {
          const body = { model: want, stream: false, messages: [{ role: "user", content: "Di solo: hola" }], options: Object.assign({ num_predict: 12 }, S.get().aiCpu ? { num_gpu: 0 } : {}) };
          const r = JSON.parse(await invoke("ai_chat", { body: JSON.stringify(body) }));
          const txt = ((r.message || {}).content || "").trim();
          st.textContent = `✅ Todo listo. Ha respondido «${txt.slice(0, 40)}» en ${((Date.now() - t0) / 1000).toFixed(1)} s`;
          says("¡Tengo cerebro! Háblame desde mi menú");
        } catch (e2) { st.textContent = `⚠ Ollama está, pero al hablar ha fallado: ${String(e2).slice(0, 120)}`; }
      }
      else st.textContent = `⚠ Ollama funciona, pero falta el modelo «${want}». Abre una terminal y escribe: ollama pull ${want}` + (names.length ? ` (tienes: ${names.join(", ")})` : "");
    } catch (_) { st.textContent = "❌ No encuentro Ollama. Instálalo desde ollama.com y ábrelo"; says("No encuentro mi cerebro… ¿has instalado Ollama?"); }
  });

  // Privacidad
  $("#wipe").addEventListener("mouseenter", () => says(pick(["No, no, no…", "Ese botón me da miedo", "¿Seguro que quieres tocar eso?"])));
  $("#showData").addEventListener("click", () => {
    says("Esto es todo lo que sé de ti. Nada sale de tu PC");
    const pre = $("#dataView");
    const out = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith("eko")) { try { out[k] = JSON.parse(localStorage.getItem(k)); } catch (_) { out[k] = localStorage.getItem(k); } } }
    pre.textContent = JSON.stringify(out, null, 2);
    pre.hidden = !pre.hidden;
  });
  let wipeArmed = false;
  $("#wipe").addEventListener("click", (e) => {
    if (!wipeArmed) { wipeArmed = true; e.target.textContent = "¿Seguro? Pulsa otra vez"; says("Espera, espera… ¿de verdad quieres que vuelva a ser una semilla?"); setTimeout(() => { wipeArmed = false; e.target.textContent = "Borrar"; }, 4000); return; }
    S.reset();
    if (T) T.event.emit("eko-reset");
    e.target.textContent = "Borrado";
    fill();
  });

  // Sin menú del navegador ni recargas accidentales (se permite en las casillas de texto)
  document.addEventListener("contextmenu", (e) => { if (!e.target.closest("input, textarea")) e.preventDefault(); });
  document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "f5" || k === "f7" || (e.ctrlKey && ["r", "p", "f", "g", "j", "u", "s"].includes(k))) e.preventDefault();
  });

  S.onChange(fill);
  fill();
  // Repetir las misiones de bienvenida (las arranca la ventana de Eko)
  const rm = $("#replayMissions");
  if (rm) rm.addEventListener("click", () => {
    try { window.__TAURI__ && window.__TAURI__.event.emit("cmd", "missions"); } catch (_) {}
    try { localStorage.setItem("eko-missions-replay", String(Date.now())); } catch (_) {}
    says && says("¡Vale! Mira, que te enseño");
  });
  // ---------- Páginas (una a la vista) y opciones que dependen de otras ----------
  const pages = $$("section[data-p]"), navB = $$("nav button[data-p]");
  function go(p) {
    pages.forEach((x) => x.classList.toggle("on", x.dataset.p === p));
    navB.forEach((b) => b.classList.toggle("on", b.dataset.p === p));
    try { localStorage.setItem("eko-settings-page", p); } catch (_) {}
    const m = $("main"); if (m) m.scrollTop = 0;
  }
  navB.forEach((b) => b.addEventListener("click", () => go(b.dataset.p)));
  let first = "you"; try { first = localStorage.getItem("eko-settings-page") || "you"; } catch (_) {}
  go(navB.some((b) => b.dataset.p === first) ? first : "you");
  // Lo que solo tiene sentido con otra opción encendida se esconde (menos ruido)
  function deps() { const s = S.get(); $$("[data-dep]").forEach((r) => { r.hidden = !s[r.dataset.dep]; }); }
  document.addEventListener("change", () => setTimeout(deps, 0));
  document.addEventListener("click", () => setTimeout(deps, 0));
  deps();
  // ---------- Lo que recuerda de ti (memoria de la IA) ----------
  const MEM = "eko-ai-memory";
  const memRead = () => { try { return JSON.parse(localStorage.getItem(MEM) || "[]"); } catch (_) { return []; } };
  const memWrite = (l) => { try { localStorage.setItem(MEM, JSON.stringify(l)); } catch (_) {} };
  function memPaint() {
    const ul = $("#memList"); if (!ul) return;
    const l = memRead();
    ul.innerHTML = l.map((m, i) => `<li><span></span><button type="button" data-i="${i}" title="Olvidar">×</button></li>`).join("");
    ul.querySelectorAll("li span").forEach((sp, i) => { sp.textContent = l[i].t; });
    $("#memRow").hidden = !l.length; $("#memEmpty").hidden = !!l.length;
  }
  const ml = $("#memList");
  if (ml) {
    ml.addEventListener("click", (e) => { const b = e.target.closest("button[data-i]"); if (!b) return; const l = memRead(); l.splice(+b.dataset.i, 1); memWrite(l); memPaint(); saved(); says("Vale, eso ya no lo recuerdo"); });
    $("#memClear").addEventListener("click", () => { memWrite([]); memPaint(); saved(); says("Borrón y cuenta nueva. ¿Quién eres? (es broma)"); });
    window.addEventListener("storage", (e) => { if (e.key === MEM) memPaint(); });
    window.addEventListener("focus", memPaint);
    memPaint();
  }
})();
