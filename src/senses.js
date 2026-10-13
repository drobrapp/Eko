// Eko · fase 2: reacciona a lo que pasa en el PC.
// Recibe "senses" cada 2 s desde Rust, más "drive" y "download".
(() => {
  "use strict";
  const E = window.Eko;
  if (!E || !E.native) return;

  const ES = E.LANG === "es";
  const T = ES ? {
    morning: ["Buenos días", "¡Buenos días! ¿Café?"],
    afternoon: ["Buenas tardes", "¡Hola de nuevo!"],
    night: ["Buenas noches", "¿Turno de noche?"],
    back: ["¡Has vuelto!", "Te echaba de menos", "Ya era hora"],
    late: ["Es tarde…", "¿No deberíamos dormir?", "Las pantallas a estas horas…"],
    creative: ["¿Editando? Te hago compañía", "Qué colores", "Modo artista"],
    code: ["Modo programador", "Mucho texto raro…"],
    office: ["Papeleo… ánimo", "Hoja de cálculo, mi favorita"],
    video: ["¿Vemos algo?", "Me pido sitio"],
    social: ["Llevas un rato de scroll…", "¿Seguimos deslizando?", "Ese scroll no se acaba nunca"],
    github: ["¿Subiendo una versión mía?", "Que no se rompa nada…"],
    hot: ["Uf, qué calor", "El PC va a tope", "Estoy sudando"],
    ram: ["Me falta sitio en la cabeza", "Memoria casi llena"],
    battery: (n) => `Batería al ${n}%`,
    offline: ["Me he quedado sin internet", "¿Y la conexión?"],
    online: ["Vuelve a haber internet"],
    disk: (n) => `El disco está casi lleno (${n}% libre)`,
    card: (n) => n > 0 ? `¡Una tarjeta! Veo ${n.toLocaleString("es")} fotos` : "¡Una tarjeta! Está vacía",
    usb: (name) => `Ha llegado un USB${name ? ": " + name : ""}`,
    download: (n) => `Ha llegado: ${n}`,
    song: (t) => `Suena: ${t}`,
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

  function greetingByHour() {
    const h = new Date().getHours();
    return h >= 6 && h < 13 ? T.morning : h >= 13 && h < 21 ? T.afternoon : T.night;
  }

  E.listen("senses", (ev) => {
    const s = ev.payload;
    const cat = categorize(s.app || "", s.title || "");

    // Inactividad: se duerme si te vas, te recibe al volver
    if (s.idle >= 180 && !E.S.sleeping) { E.goToSleep(); autoSlept = true; }
    if (s.idle > longestIdle) longestIdle = s.idle;
    if (s.idle < 5 && autoSlept) {
      autoSlept = false;
      E.wakeUp(false);
      E.hop(-380);
      const gone = longestIdle;
      longestIdle = 0;
      if (gone > 2 * 3600) E.missYou();
      else setTimeout(() => E.say(E.pick(gone > 4 * 3600 ? greetingByHour() : T.back), 2800, true, "wave"), 400);
      return;
    }
    if (s.idle < 5) longestIdle = 0;
    if (E.S.sleeping) return;

    // Saludo según la hora en el primer contacto
    if (first) { first = false; lastCat = cat; return; }

    // Trasnochar (00:30–5:00), una vez por noche
    const now = new Date(), h = now.getHours(), m = now.getMinutes();
    if (((h === 0 && m >= 30) || (h >= 1 && h < 5)) && s.idle < 60 && once("late", 240)) {
      E.say(E.pick(T.late), 3200, false, "yawn");
    }

    // Cambio de actividad
    if (cat !== lastCat) {
      lastCat = cat;
      catSince = Date.now();
      if (T[cat] && Array.isArray(T[cat]) && cat !== "social" && Math.random() < 0.5 && once("cat-" + cat, 30)) {
        const g = { creative: "spark", code: "think", office: "nod", video: "note", github: "surprise" }[cat];
        setTimeout(() => E.say(E.pick(T[cat]), 2800, false, g), 1500);
      }
    }
    // Gafitas para "leer" cuando llevas un rato trabajando con texto o imagen
    const reading = (cat === "code" || cat === "office" || cat === "creative") && Date.now() - catSince > 2 * 60000;
    if (reading !== glasses) { glasses = reading; E.setGlasses(reading); }

    // Si llevas horas activo sin hacerle ni caso, se enfurruña un rato
    if (s.idle < 60 && Date.now() - E.lastInteraction() > 3 * 3600000 && once("sulk", 180)) E.sulk(2);
    // Scroll infinito: aviso cada 20 min seguidos en redes
    if (cat === "social" && Date.now() - catSince > 20 * 60000 && once("social", 20)) {
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

    // Música: baila mientras suena
    const playing = !!(s.music && s.music.playing);
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
    if (E.S.sleeping) E.wakeUp(false);
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
