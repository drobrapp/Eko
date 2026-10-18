// Eko · fase 2: reacciona a lo que pasa en el PC.
// Recibe "senses" cada 2 s desde Rust, más "drive" y "download".
(() => {
  "use strict";
  const E = window.Eko;
  if (!E || !E.native) return;

  const ES = E.LANG === "es";
  const T = ES ? {
    morning: ["¡Buenos días! ¿Café o té?", "Arriba, que hay mucho que hacer"],
    afternoon: ["¡Buenas tardes!", "¿Qué tal la mañana?"],
    night: ["¿Turno de noche?", "Buenas noches, búho"],
    back: ["¡Has vuelto!", "Te echaba de menos", "Ya era hora"],
    late: ["¿Qué horas son estas?", "Mañana tendrás ojeras… ¡Y yo también!"],
    creative: ["¿Editando? Te hago compañía", "Qué colores", "Modo artista"],
    code: ["Modo programador", "Mucho texto raro…"],
    office: ["Papeleo… ánimo", "Hoja de cálculo, mi favorita"],
    video: ["¿Vemos algo?", "Me pido sitio"],
    social: ["Llevas un rato de scroll…", "¿Seguimos deslizando?", "Ese scroll no se acaba nunca"],
    github: ["¿Subiendo una versión mía?", "Que no se rompa nada…"],
    hot: ["¡Me derrito!", "Esto es un horno", "¿Quién ha encendido la calefacción?"],
    ram: ["Tengo la cabeza a reventar"],
    battery: (n) => `Me quedo sin pilas (${n}%)`,
    offline: ["¡Socorro, sin internet!"],
    online: ["Ya hay WiFi, falsa alarma"],
    disk: (n) => `El disco está a reventar (${n}% libre)`,
    card: (n) => n > 0 ? `¡Tarjeta nueva! ¡${n.toLocaleString("es")} fotos! ¿Buena sesión?` : "¡Tarjeta nueva! Está vacía",
    usb: () => "¡Un USB! ¿Qué traes?",
    download: (n) => `¡Paquete para ti: ${n}!`,
    song: (t) => `Suena: ${t}`,
    longApp: (n) => `${n} y tú ya sois inseparables. ¿Estiramos?`,
    lunch: ["Me ruge la barriga… ¿y a ti?"],
    dinner: ["¿Qué hay de cena? Yo me pido postre"],
  } : {
    morning: ["Good morning", "Morning! Coffee?"],
    afternoon: ["Good afternoon", "Hi again!"],
    night: ["Good evening", "Night shift?"],
    back: ["You're back!", "I missed you", "About time"],
    late: ["It's late…", "Shouldn't we sleep?", "Screens at this hour…"],
    creative: ["Editing? I'll keep you company", "Nice colours", "Artist mode"],
    code: ["Coder mode", "So much weird text…"],
    office: ["Paperwork… hang in there", "Spreadsheets, my favourite"],
    video: ["Watching something?", "Save me a seat"],
    social: ["That's a lot of scrolling…", "Still scrolling?", "That feed never ends"],
    github: ["Shipping a new version of me?", "Don't break anything…"],
    hot: ["Phew, it's hot", "The PC is maxed out", "I'm sweating"],
    ram: ["My head is full", "Memory almost full"],
    battery: (n) => `Battery at ${n}%`,
    offline: ["I lost the internet", "Where did the connection go?"],
    online: ["Internet is back"],
    disk: (n) => `Disk almost full (${n}% free)`,
    card: (n) => n > 0 ? `A card! I see ${n.toLocaleString("en")} photos` : "A card! It's empty",
    usb: (name) => `A USB arrived${name ? ": " + name : ""}`,
    download: (n) => `Arrived: ${n}`,
    song: (t) => `Now playing: ${t}`,
    longApp: (n) => `You've been on ${n} for a while. Stretch?`,
    lunch: ["Lunch time?", "My tummy's rumbling… yours?"],
    dinner: ["What's for dinner?", "It's getting late…"],
  };

  // ---------- Categorías de apps (más adelante, editables en ajustes) ----------
  const CATS = {
    creative: ["lightroom", "photoshop", "illustrator", "afterfx", "premiere", "captureone", "capture one", "figma", "affinity", "darktable", "ansel", "gimp", "resolve", "blender", "krita", "inkscape", "bridge", "indesign", "rawtherapee"],
    code: ["code", "cursor", "devenv", "windowsterminal", "powershell", "cmd", "idea64", "pycharm64", "sublime_text", "notepad++", "webstorm64"],
    office: ["winword", "excel", "powerpnt", "outlook", "olk", "onenote", "notion", "acrobat", "acrord32", "thunderbird"],
    browser: ["chrome", "msedge", "firefox", "opera", "brave", "arc", "vivaldi"],
    media: ["spotify", "vlc", "applemusic", "music", "netflix"],
    github: ["githubdesktop"],
  };
  const SOCIAL = ["instagram", "tiktok", "facebook", "twitter", " / x", "reddit", "threads", "pinterest"];
  const VIDEO = ["youtube", "netflix", "twitch", "prime video", "disney+", "filmin"];

  const cfg = () => (window.EkoSettings ? window.EkoSettings.get() : { chatty: 2, breaks: true, breakMinutes: 90, scrollMinutes: 20, bedtime: "00:30" });
  // Las listas de apps editables en Ajustes sustituyen a las de serie
  function syncCats() {
    const S = window.EkoSettings; if (!S) return;
    for (const k of ["creative", "code", "office", "browser", "media"]) { const l = S.list(k); if (l.length) CATS[k] = l; }
  }
  syncCats();
  if (window.EkoSettings) window.EkoSettings.onChange(syncCats);
  const ignored = (app) => !!window.EkoSettings && window.EkoSettings.list("ignore").includes(app);
  // ¿Es más tarde que tu hora de dormir? (hasta las 5:00)
  function pastBedtime(d) {
    const bt = cfg().bedtime; if (!bt) return false;
    const [bh, bm] = bt.split(":").map(Number);
    const mins = d.getHours() * 60 + d.getMinutes(), bed = bh * 60 + bm;
    if (bed >= 12 * 60) return mins >= bed || mins < 5 * 60;
    return mins >= bed && mins < 5 * 60;
  }

  function categorize(app, title) {
    const t = (title || "").toLowerCase();
    for (const [cat, list] of Object.entries(CATS)) {
      if (list.some((k) => app === k || app.startsWith(k))) {
        if (cat === "browser") {
          if (SOCIAL.some((k) => t.includes(k))) return "social";
          if (VIDEO.some((k) => t.includes(k))) return "video";
        }
        return cat;
      }
    }
    return "other";
  }

  // ---------- Utilidades ----------
  const cooldowns = {};
  function once(key, minutes) {
    const now = Date.now();
    if (cooldowns[key] && now - cooldowns[key] < minutes * 60000) return false;
    cooldowns[key] = now;
    return true;
  }
  const short = (s, n = 24) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

  // ---------- Estado de los sentidos ----------
  let first = true;
  let lastCat = "", catSince = Date.now();
  let autoSlept = false, longestIdle = 0;
  let hotCount = 0, ramCount = 0, offlineCount = 0, wasOffline = false;
  let batteryWarned = false, lastSong = "", glasses = false;
  let lastKey = "", lastApp = "", appSince = Date.now();

  // ---------- Programas que se abren ----------
  const SKIP_APPS = new Set(["eko", "explorer", "searchhost", "startmenuexperiencehost", "shellexperiencehost", "lockapp", "textinputhost", "applicationframehost", "systemsettingsbroker", "rundll32", "dwm", ""]);
  const startedAt = {}, announced = {};
  let propSrc = null;   // qué app sacó el accesorio actual (para guardarlo cuando se cierre)
  E.listen("procs", (ev) => {
    const now = Date.now();
    if (propSrc && (ev.payload.stopped || []).includes(propSrc.app)) { E.dropProp(propSrc.name); propSrc = null; }
    for (const n of ev.payload.started || []) { startedAt[n] = now; announced[n] = false; }
    for (const n of ev.payload.stopped || []) { delete startedAt[n]; delete announced[n]; }
  });
  // Lo que ya ha comentado hoy (se guarda, así sobrevive a reinicios de Eko)
  function seenToday() {
    try {
      const v = JSON.parse(localStorage.getItem("eko-seen-today") || "{}");
      return v.day === new Date().toDateString() ? v.ids : [];
    } catch (_) { return []; }
  }
  function markSeen(id) {
    const ids = seenToday();
    if (!ids.includes(id)) ids.push(id);
    try { localStorage.setItem("eko-seen-today", JSON.stringify({ day: new Date().toDateString(), ids })); } catch (_) {}
  }
  // Si se abren varias cosas seguidas, los comentarios salen uno detrás de otro
  const sayQueue = [];
  let sayBusy = false;
  function queueSay(c) {
    sayQueue.push(c);
    if (sayQueue.length > 4) sayQueue.shift();
    if (!sayBusy) nextSay();
  }
  function nextSay() {
    const c = sayQueue.shift();
    if (!c) { sayBusy = false; return; }
    sayBusy = true;
    setTimeout(() => { if (!E.quiet && !E.A.hidden && !E.S.sleeping) E.say(c.text, 3200, true, c.gesture); setTimeout(nextSay, 3600); }, 900);
  }

  function greetingByHour() {
    const h = new Date().getHours();
    return h >= 6 && h < 13 ? T.morning : h >= 13 && h < 21 ? T.afternoon : T.night;
  }

  E.listen("senses", (ev) => {
    const s = ev.payload;
    E.lastSenses = s;
    const cat = categorize(s.app || "", s.title || "");

    // Inactividad: se duerme si te vas, te recibe al volver
    if (s.idle >= 180 && !E.S.sleeping) { E.goToSleep(); autoSlept = true; }
    if (s.idle > longestIdle) longestIdle = s.idle;
    if (s.idle < 5 && autoSlept) {
      autoSlept = false;
      const gone = longestIdle;
      longestIdle = 0;
      if (!E.S.sleeping) {
        E.hop(-380);
        if (gone > 2 * 3600) E.missYou();
        else setTimeout(() => E.say(E.pick(gone > 4 * 3600 ? greetingByHour() : T.back), 2800, true, "wave"), 400);
      }
      return;
    }
    if (s.idle < 5) longestIdle = 0;
    if (E.S.sleeping) return;

    // Saludo según la hora en el primer contacto
    if (first) { first = false; lastCat = cat; return; }

    // Trasnochar (00:30–5:00), una vez por noche
    const now = new Date(), h = now.getHours(), m = now.getMinutes();
    if (pastBedtime(now) && s.idle < 60 && once("late", 240)) {
      E.say(E.pick(T.late), 3200, false, "yawn");
    }

    // Cambio de actividad
    if (cat !== lastCat) { lastCat = cat; catSince = Date.now(); }
    // Comentarios según la app o la web concreta (ver comments.js)
    const key = (s.app || "") + "|" + (s.title || "").slice(0, 60);
    if (key !== lastKey) {
      lastKey = key;
      const app = s.app || "", C = window.EkoComments;
      const isBrowser = CATS.browser.some((k) => app.startsWith(k));
      const chatty = cfg().chatty, prob = [0, 0.3, 0.6, 0.85][chatty] ?? 0.6;
      if (C) C.setGap([99, 6, 3, 1.5][chatty] ?? 3);
      // Accesorios de un rato según lo que abres (no depende de lo charlatán que sea)
      if (C && app && !ignored(app) && !SKIP_APPS.has(app)) {
        const pid = C.ruleId(app, s.title, isBrowser), tl = (s.title || "").toLowerCase();
        const P = { youtube: ["popcorn", 180, 20], netflix: ["popcorn", 180, 20], player: ["popcorn", 180, 20], twitch: ["popcorn", 150, 20],
          photoedit: ["camera", 90, 30], export: ["camera", 60, 30], photos: ["camera", 60, 30], camera: ["camera", 60, 30],
          design: ["brush", 90, 30], paint: ["brush", 90, 30], pdf: ["book", 150, 30], reading: ["book", 150, 30], news: ["book", 120, 30], wiki: ["book", 120, 30] }[pid];
        if (P && Math.random() < 0.8 && E.useProp(P[0], P[1], P[2])) propSrc = { name: P[0], app, rid: pid, browser: isBrowser };
        // Si en ese mismo navegador cambias a otra web (o cierras la pestaña), lo guarda
        else if (propSrc && propSrc.browser && app === propSrc.app && pid !== propSrc.rid) { E.dropProp(propSrc.name); propSrc = null; }
        if (pid === "weather" && /lluvi|llover|rain|tormenta|chubasco/.test(tl) && E.useProp("umbrella", 60, 60)) propSrc = { name: "umbrella", app, rid: pid, browser: isBrowser };
      }
      if (C && app && !ignored(app) && !SKIP_APPS.has(app) && chatty > 0) {
        // Seguro: cada vez que se abre un programa, y la primera vez en el día de cada app o web
        const rid = C.ruleId(app, s.title, isBrowser) || "app:" + app;
        const justOpened = startedAt[app] && Date.now() - startedAt[app] < 90000 && !announced[app];
        const firstToday = !seenToday().includes(rid);
        if (justOpened || firstToday) {
          announced[app] = true;
          markSeen(rid);
          const ctx = { hour: new Date().getHours(), again: justOpened && !firstToday, name: (cfg().userName || "").trim() };
          const c = C.find(app, s.title || "", isBrowser, ES, true, ctx) || (isBrowser && !justOpened ? null : C.generic(app, s.title, ES, ctx));
          if (c) queueSay(c);
        } else if (Math.random() < prob) {
          const c = C.find(app, s.title || "", isBrowser, ES);
          if (c) setTimeout(() => E.say(c.text, 3200, false, c.gesture), 1200);
        }
      }
    }
    // Mucho rato seguido en la misma app: propone una pausa
    if (s.app !== lastApp) { lastApp = s.app; appSince = Date.now(); }
    if (cfg().breaks && s.app && !ignored(s.app) && Date.now() - appSince > cfg().breakMinutes * 60000 && s.idle < 60 && once("long-" + s.app, cfg().breakMinutes)) {
      const name = s.app.charAt(0).toUpperCase() + s.app.slice(1);
      E.say(T.longApp(name), 3500, false, "stretch");
    }
    // Horas de comer, una vez al día
    if (h === 14 && s.idle < 60 && once("lunch", 20 * 60)) E.say(E.pick(T.lunch), 3000, false, "think");
    if (h === 21 && s.idle < 60 && once("dinner", 20 * 60)) E.say(E.pick(T.dinner), 3000, false, "think");
    // Gafitas para "leer" cuando llevas un rato trabajando con texto o imagen
    const reading = (cat === "code" || cat === "office" || cat === "creative") && Date.now() - catSince > 2 * 60000;
    if (reading !== glasses) { glasses = reading; E.setGlasses(reading); }

    // Si llevas horas activo sin hacerle ni caso, se enfurruña un rato
    if (s.idle < 60 && Date.now() - E.lastInteraction() > 3 * 3600000 && once("sulk", 180)) E.sulk(2);
    // Scroll infinito: aviso cada 20 min seguidos en redes
    const sm = cfg().scrollMinutes;
    if (sm > 0 && cat === "social" && Date.now() - catSince > sm * 60000 && once("social", sm)) {
      E.say(E.pick(T.social), 3500, true, "shake");
    }

    // CPU / RAM al límite
    hotCount = s.cpu > 90 ? hotCount + 1 : 0;
    ramCount = s.ram > 92 ? ramCount + 1 : 0;
    const hot = hotCount >= 3 || ramCount >= 3;
    if (hot !== E.A.hot) E.setHot(hot);
    if (hotCount === 3 && once("hot", 10)) E.say(E.pick(T.hot), 2800, false, "drop");
    else if (ramCount === 3 && once("ram", 15)) E.say(E.pick(T.ram));
    if (s.cpu < 70 && s.ram < 88 && E.A.hot) E.setHot(false);

    // Batería
    if (s.battery != null) {
      if (s.battery <= 20 && !s.charging && !batteryWarned) { batteryWarned = true; E.say(T.battery(s.battery), 3500, true); }
      if (s.charging || s.battery > 25) batteryWarned = false;
    }

    // Conexión
    offlineCount = s.online ? 0 : offlineCount + 1;
    if (offlineCount === 2) { wasOffline = true; E.say(E.pick(T.offline), 3000, true, "shrug"); }
    if (s.online && wasOffline) { wasOffline = false; E.say(E.pick(T.online), 2800, false, "nod"); }

    // Disco casi lleno, una vez al día
    if (s.disk_free > 0 && s.disk_free < 10 && once("disk", 24 * 60)) {
      E.say(T.disk(Math.round(s.disk_free)), 3500, false, "sad");
    }

    // Accesorios por el momento: café por la mañana y gorro de dormir
    {
      const now = new Date(), h = now.getHours();
      if (h >= 6 && h < 11 && s.idle < 60 && once("coffee-" + now.toDateString(), 24 * 60)) E.useProp("mug", 150, 180);
      const bt = cfg().bedtime;
      if (bt) {
        const [bh, bm] = bt.split(":").map(Number), mins = h * 60 + now.getMinutes(), bed = bh * 60 + bm;
        const near = pastBedtime(now) || ((bed - mins + 1440) % 1440) <= 30;
        if (near) E.useProp("nightcap", 60, 0);
      }
    }
    // Música: baila mientras suena (y se pone los auriculares)
    const playing = !!(s.music && s.music.playing);
    if (playing) E.useProp("headphones", 20, 0); else if (E.prop.cur === "headphones" || E.prop.extra === "headphones") E.dropProp("headphones");
    if (playing !== E.A.dance) E.setDance(playing);
    if (playing && s.music.title && s.music.title !== lastSong) {
      lastSong = s.music.title;
      E.fx("note", 2);
      if (Math.random() < 0.35 && once("song", 10)) E.say(T.song(short(s.music.title, 26)), 3000);
    }
  });

  // Tarjeta de memoria o USB
  E.listen("drive", (ev) => {
    const d = ev.payload;
    if (E.S.sleeping) return;
    E.hop(-520);
    E.act("surprise");
    E.fx("spark", 3);
    const looksLikeCard = d.photos > 0 || /dcim|eos|nikon|sony|fuji|canon|sd/i.test(d.name || "");
    E.say(looksLikeCard ? T.card(d.photos) : T.usb(d.name), 4000, true);
  });

  // Descarga terminada
  E.listen("download", (ev) => {
    if (E.S.sleeping) return;
    E.act("showBox");
    E.say(T.download(short(ev.payload.name)), 3000, true);
  });
})();
