// Eko · menú en burbujas: un clic en Eko lo abre, él se pone a pensar y salen las opciones.
(() => {
  "use strict";
  const E = window.Eko;
  if (!E) return;
  const ES = E.LANG === "es";
  const $ = (s) => document.querySelector(s);
  const stage = $("#stage"), menu = $("#menu");
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
  };
  const invoke = window.__TAURI__ ? window.__TAURI__.core.invoke : null;

  // ---------- Iconos (trazos simples) ----------
  const I = {
    play: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.3" fill="currentColor"/><circle cx="15" cy="15" r="1.3" fill="currentColor"/><circle cx="15" cy="9" r="1.3" fill="currentColor"/><circle cx="9" cy="15" r="1.3" fill="currentColor"/>',
    util: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5M3.5 18l1.5 1.5 2.5-2.5"/>',
    hanger: '<path d="M10 6.5a2 2 0 1 1 2.6 1.9c-.4.1-.6.5-.6.9V10"/><path d="M12 10L3.5 16.5c-.8.6-.4 1.5.5 1.5h16c.9 0 1.3-.9.5-1.5L12 10Z"/>',
    moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    ball: '<circle cx="12" cy="12" r="8.5"/><path d="M4 10c5 2 11 2 16 0M8.5 4.5c-2 5-2 10 0 15"/>',
    cookie: '<circle cx="12" cy="12" r="8.5"/><circle cx="9" cy="9.5" r="1.2" fill="currentColor"/><circle cx="14.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10.5" cy="15" r="1.2" fill="currentColor"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/>',
    star: '<path d="M12 3.5l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6L12 15.9l-5 2.8 1.2-5.6L4 9.3l5.6-.6L12 3.5Z"/>',
    rock: '<path d="M5 15c-1-3 1-7 4-8 3-1.5 7 0 9 3 1.5 2.5.5 6-2.5 7-3 1-9 1-10.5-2Z"/>',
    paper: '<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4"/>',
    scissors: '<circle cx="6.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M8.5 16L17 5M15.5 16L7 5"/>',
    left: '<path d="M14.5 6l-6 6 6 6"/>',
    right: '<path d="M9.5 6l6 6-6 6"/>',
    hide: '<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"/><path d="M4 4l16 16"/>',
    bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 13V9M10 3h4"/>',
    pencil: '<path d="M4 20l1-4L16 5l3 3L8 19l-4 1Z"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/>',
    bolt: '<path d="M13 3L5 13.5h6L10 21l8-11h-6L13 3Z"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/>',
    folder: '<path d="M3.5 7.5a2 2 0 0 1 2-2H10l2 2h6.5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10Z"/>',
    camera: '<rect x="3.5" y="7" width="17" height="12" rx="2.5"/><circle cx="12" cy="13" r="3.5"/><path d="M8.5 7l1.5-2.5h4L15.5 7"/>',
    pause: '<path d="M6 5.5l7 6.5-7 6.5z" /><path d="M16 6v12M19.5 6v12"/>',
    next: '<path d="M5 5.5l9 6.5-9 6.5z"/><path d="M18.5 6v12"/>',
    mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    feather: '<path d="M20 4c-7 0-13 5-13 12v4M7 16h7M10 12h7"/>',
    sparkle: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>',
    back: '<path d="M14.5 6l-6 6 6 6"/>',
    swatch: '<circle cx="12" cy="12" r="7" fill="currentColor" stroke="none"/>',
    none: '<circle cx="12" cy="12" r="7.5"/><path d="M6.7 17.3L17.3 6.7"/>',
  };
  const svg = (k, color) => `<svg viewBox="0 0 24 24" ${color ? `style="color:${color}"` : ""}>${I[k] || ""}</svg>`;

  const L = ES ? {
    letsPlay: "¡Juguemos!", other: "Otra cosa…", water: "Riégame", waterTip: "¡Arrastra la regadera sobre mi cabeza!", stowBall: "Guardar pelota", ballTip: "(Doble clic en la pelota para guardarla)", treats: "Cuídame", play: "Jugar", util: "Te ayudo", wardrobe: "Ponme guapo", rest: "A descansar", settings: "Mis ajustes",
    ball: "Pelota", snack: "¡Comida!", games: "Juegos", trick: "Mira esto",
    rps: "Piedra, papel…", hand: "¿Qué mano?", hide: "Escondite",
    rock: "Piedra", paper: "Papel", scissors: "Tijera", lefth: "Izquierda", righth: "Derecha",
    remind: "Recuérdame", pomo: "Concentración", note: "Apunta algo", tasks: "Tus tareas", shortcuts: "Atajos",
    lastdl: "Última descarga", dlfolder: "Descargas", shot: "Captura", playpause: "Pausar", nexttrack: "Siguiente",
    sleep: "A dormir", mute: "Silencio 1 h", discreet: "Modo discreto", back: "Volver",
    auto: "Automático", none: "Ninguno",
    remindAsk: "¿Qué te recuerdo?", noteAsk: "Apunta una tarea o nota", ok: "Vale",
    stopPomo: "Parar pomodoro",
    soon: "Ajustes: nombre, cumpleaños, sonido, apps por categoría… ¡muy pronto!",
    onlyApp: "Eso solo funciona en la app",
  } : {
    letsPlay: "Let's play!", other: "Something else…", water: "Water me", waterTip: "Drag the watering can over my head!", stowBall: "Put ball away", ballTip: "(Double-click the ball to put it away)", treats: "Treats", play: "Play", util: "Useful", wardrobe: "Wardrobe", rest: "Rest", settings: "Settings",
    ball: "Ball", snack: "Snack", games: "Games", trick: "Trick",
    rps: "Rock, paper…", hand: "Which hand?", hide: "Hide & seek",
    rock: "Rock", paper: "Paper", scissors: "Scissors", lefth: "Left", righth: "Right",
    remind: "Reminder", pomo: "Pomodoro", note: "Note", tasks: "Tasks", shortcuts: "Shortcuts",
    lastdl: "Last download", dlfolder: "Downloads", shot: "Screenshot", playpause: "Pause", nexttrack: "Next",
    sleep: "Sleep", mute: "Mute 1 h", discreet: "Discreet", back: "Back",
    auto: "Automatic", none: "None",
    remindAsk: "What should I remind you?", noteAsk: "Write a task or note", ok: "OK",
    stopPomo: "Stop pomodoro",
    soon: "Settings: name, birthday, sound, app categories… coming soon!",
    onlyApp: "That only works in the app",
  };
  const SAY = ES ? {
    snack: ["¡Ñam!", "Qué rico", "¿Hay más?"], win: ["¡Gané!", "¡Toma ya!"], lose: ["Vaaale, has ganado", "¡Revancha!"], tie: ["¡Empate!"],
    rpsPick: ["¡Piedra, papel o tijera!"], handAsk: ["¿En qué mano está?"], handYes: ["¡Bien visto!", "¡Correcto!"], handNo: ["¡Nop!", "Era la otra"],
    hide: ["¡A que no me encuentras!"], found: ["¡Me has pillado!", "¡Jo, qué rápido!"], ball: ["¡Lánzamela!", "¡Otra vez!"], fetch: ["¡Aquí tienes!", "¡Otra, otra!"], stow: ["¡Vale, la guardo!", "¡A su sitio!"],
    remindSet: (m) => `Vale, te aviso en ${m}`, pomoStart: ["¡A concentrarse! 25 minutos"], pomoBreak: ["¡Descanso! 5 minutos para estirarte"], pomoEnd: ["¡Otra ronda cuando quieras!"],
    noted: ["Apuntado", "Lo guardo"], done: ["¡Una menos!", "¡Bien hecho!"], empty: ["No tienes tareas pendientes"], muted: ["Me callo una horita"], discreetOn: ["Modo discreto"], discreetOff: ["Vuelvo a hablar"],
  } : {
    snack: ["Yum!", "Delicious", "Is there more?"], win: ["I win!", "Yes!"], lose: ["Fine, you win", "Rematch!"], tie: ["Tie!"],
    rpsPick: ["Rock, paper, scissors!"], handAsk: ["Which hand is it in?"], handYes: ["Well spotted!", "Correct!"], handNo: ["Nope!", "It was the other one"],
    hide: ["Bet you can't find me!"], found: ["You found me!", "That was fast!"], ball: ["Throw it!", "Again!"], fetch: ["Here you go!", "Again, again!"], stow: ["Okay, putting it away!", "Back it goes!"],
    remindSet: (m) => `OK, I'll remind you in ${m}`, pomoStart: ["Focus time! 25 minutes"], pomoBreak: ["Break! 5 minutes to stretch"], pomoEnd: ["Another round whenever you want!"],
    noted: ["Noted", "Saved"], done: ["One less!", "Well done!"], empty: ["No pending tasks"], muted: ["I'll be quiet for an hour"], discreetOn: ["Discreet mode"], discreetOff: ["I'll talk again"],
  };
  const pick = E.pick;

  // ---------- Árbol del menú ----------
  const COSTUMES = [
    ["auto", L.auto, "sparkle"], ["witch", "Bruja", "swatch", "#4a3863"], ["pumpkin", "Calabaza", "swatch", "#ec7a1a"], ["vampire", "Vampiro", "swatch", "#a3203a"],
    ["ghost", "Fantasma", "swatch", "#c9cedb"], ["santa", "Papá Noel", "swatch", "#d93d3d"], ["reindeer", "Reno", "swatch", "#8a5a36"], ["elf", "Elfo", "swatch", "#37ad62"],
    ["scarf", "Bufanda", "swatch", "#c33434"], ["party", "Fiesta", "swatch", "#5fb3e8"], ["crown", "Corona", "swatch", "#e2a52a"], ["none", L.none, "none"],
  ];
  const TREE = {
    root: [
      { id: "letsplay", react: "emocionado", icon: "play", label: L.letsPlay, run: () => (ball ? stowBall() : propose(true)), dyn: () => (ball ? L.stowBall : L.letsPlay) },
      { id: "treats", react: "esperanzado", icon: "cookie", label: L.treats, go: "treats" },
      { id: "util", react: "curioso", icon: "util", label: L.util, go: "util" },
      { id: "wardrobe", react: "orgulloso", icon: "hanger", label: L.wardrobe, go: "wardrobe" },
      { id: "rest", react: "yawn", icon: "moon", label: L.rest, go: "rest" },
      { id: "settings", react: "settings", icon: "sliders", label: L.settings, run: openSettings },
    ],
    treats: [
      { id: "snack", react: "divertido", icon: "cookie", label: L.snack, run: giveSnack },
      { id: "trick", react: "picaro", icon: "star", label: L.trick, run: trick },
      { id: "water", react: "esperanzado", img: "artCan", label: L.water, run: () => startWater() },
    ],
    rps: [
      { icon: "rock", label: L.rock, run: () => playRps(0) },
      { icon: "paper", label: L.paper, run: () => playRps(1) },
      { icon: "scissors", label: L.scissors, run: () => playRps(2) },
    ],
    util: [
      { id: "remind", react: "curioso", icon: "bell", label: L.remind, go: "remind" },
      { id: "pomo", react: "orgulloso", icon: "timer", label: L.pomo, run: () => (pomo ? stopPomo() : startPomo()), dyn: () => (pomo ? L.stopPomo : L.pomo) },
      { id: "note", react: "curioso", icon: "pencil", label: L.note, run: askNote },
      { icon: "list", label: L.tasks, run: showTasks },
      { icon: "bolt", label: L.shortcuts, go: "shortcuts" },
    ],
    remind: [["5 min", 5], ["15 min", 15], ["30 min", 30], ["1 h", 60], ["2 h", 120]].map(([lab, m]) => ({ text: lab, label: "", run: () => askReminder(m, lab) })),
    shortcuts: [
      { icon: "download", label: L.lastdl, run: () => native("open_last_download") },
      { icon: "folder", label: L.dlfolder, run: () => native("open_downloads") },
      { icon: "camera", label: L.shot, run: () => native("screenshot") },
      { icon: "pause", label: L.playpause, run: () => native("media_play_pause") },
      { icon: "next", label: L.nexttrack, run: () => native("media_next") },
    ],
    wardrobe: COSTUMES.map(([id, lab, ic, col]) => ({ icon: ic, color: col, label: lab, run: () => { E.setHat(id); }, keep: true })),
    rest: [
      { id: "sleep", react: "yawn", icon: "moon", label: L.sleep, run: () => E.goToSleep() },
      { icon: "mute", label: L.mute, run: muteHour },
      { icon: "feather", label: L.discreet, run: toggleDiscreet, dyn: () => (E.quiet ? L.discreet + " ✓" : L.discreet) },
    ],
  };

  // ---------- Actualizaciones: Eko lo anuncia y se actualiza con un clic en él ----------
  const UPD = { v: null, snooze: 0 };
  const updBadge = document.createElement("img");
  updBadge.id = "updBadge"; updBadge.alt = "";
  updBadge.src = (document.getElementById("artBang") || {}).getAttribute?.("href") || "";
  (document.getElementById("pod") || stage).appendChild(updBadge);
  const updPending = () => !!UPD.v && Date.now() > UPD.snooze;
  const showBadge = () => updBadge.classList.toggle("in", updPending());
  function announceUpdate(v) {
    if (!v) return;
    const fresh = UPD.v !== v; UPD.v = v;
    if (Date.now() < UPD.snooze && !fresh) return;
    UPD.snooze = 0; showBadge();
    E.express && E.express("emocionado", 2.5); E.fx && E.fx("spark", 2);
    E.say(ES ? `¡Hay una versión nueva de mí! Haz clic en mí para actualizarme` : "There's a new version of me! Click me to update", 4200, true);
  }
  if (E.listen) E.listen("update-available", (e) => announceUpdate(e.payload));
  function installUpdate() {
    updBadge.classList.remove("in");
    if (invoke) invoke("install_update").catch(() => { E.say(ES ? "Uy, no he podido actualizarme. Lo intento más tarde" : "Couldn't update, I'll try later", 3000, true); showBadge(); });
    else { E.act("bye"); E.say(ES ? "Me voy a la peluquería, ahora vuelvo (vista previa)" : "Off to the hairdresser (preview)", 3000, true); UPD.v = null; }
  }
  function snoozeUpdate() {
    UPD.snooze = Date.now() + 3 * 3600000; showBadge();
    E.say(ES ? "Vale, te lo recuerdo luego" : "OK, I'll remind you later", 2200, true, "nod");
    setTimeout(() => { if (updPending()) announceUpdate(UPD.v); }, 3 * 3600000 + 1000);
  }

  // ---------- Menú con personalidad ----------
  const USE = store.get("eko-menu-use") || {};
  const hr = () => new Date().getHours();
  const GREET = () => ES ? [
    () => "¿Qué hacemos?", () => "¡Dime, dime!", () => "¿Me necesitas?", () => "Te escucho",
    () => (hr() < 12 ? "¡Buenos días! ¿Qué te apetece?" : hr() < 20 ? "¿Qué te apetece?" : "¿Algo antes de dormir?"),
  ] : [() => "What shall we do?", () => "Tell me!", () => "Need me?"];
  // Sugerencias según el momento (y lo que más usas)
  function buildSmart() {
    const c = [];
    const add = (score, item) => c.push({ score: score + Math.log(1 + (USE[item.id] || 0)) * 1.2 + Math.random() * 1.4, item });
    const care = E.careState, thirsty = care && E.careStage && E.careStage() >= 1 && care.last && Date.now() - care.last > 20 * 3600000;
    const music = !!(E.lastSenses && E.lastSenses.music && E.lastSenses.music.playing);
    const h = hr(), wd = new Date().getDay(), work = wd >= 1 && wd <= 5 && h >= 9 && h < 19;
    if (ball) add(30, { id: "stowball", react: "contento", icon: "ball", label: L.stowBall, run: stowBall });
    if (pomo) add(25, { id: "pomo", react: "orgulloso", icon: "timer", label: L.stopPomo, run: stopPomo });
    add(thirsty ? 12 : (care && care.days && care.days.length < 3 ? 4 : 0.5), { id: "water", react: "esperanzado", img: "artCan", label: ES ? (thirsty ? "¿Me riegas?" : "Riégame") : "Water me", run: () => startWater() });
    if (music) add(9, { id: "dance", react: "emocionado", icon: "play", label: ES ? "¿Bailamos?" : "Dance?", run: () => { E.setDance(true); setTimeout(() => E.setDance(false), 9000); } });
    if (h >= 23 || h < 6) add(9, { id: "sleep", react: "yawn", icon: "moon", label: ES ? "¿A dormir?" : "Bedtime?", run: () => E.goToSleep() });
    add(3.5, { id: "letsplay", react: "emocionado", icon: "play", label: L.letsPlay, run: () => propose(true) });
    add((h >= 13 && h < 15) || (h >= 20 && h < 22) ? 5 : 2, { id: "snack", react: "divertido", icon: "cookie", label: ES ? "¡Tengo hambre!" : "I'm hungry!", run: giveSnack });
    if (work && !pomo) add(3, { id: "pomo", react: "orgulloso", icon: "timer", label: ES ? "Concéntrate, yo vigilo" : "Focus, I'll watch", run: startPomo });
    if (h >= 7 && h < 12) add(2.5, { id: "remind", react: "curioso", icon: "bell", label: L.remind, go: "remind" });
    const m = new Date().getMonth();
    add(m === 9 || m === 11 ? 4 : 1, { id: "wardrobe", react: "orgulloso", icon: "hanger", label: L.wardrobe, go: "wardrobe" });
    add(1.5, { id: "trick", react: "picaro", icon: "star", label: L.trick, run: trick });
    add(1, { id: "note", react: "curioso", icon: "pencil", label: L.note, run: askNote });
    c.sort((a, b) => b.score - a.score);
    const out = [], seen = new Set();
    for (const { item } of c) { if (seen.has(item.id)) continue; seen.add(item.id); out.push(item); if (out.length === 2) break; }
    out.push({ icon: "sparkle", label: L.other, go: "root", react: "curioso" });
    return out;
  }
  // Preguntas (como mucho una al día): Eko pregunta y reacciona a tu respuesta
  const QUESTIONS = ES ? [
    { q: "¿Qué tal el día?", a: [
      ["¡Genial!", () => { E.express("emocionado", 3); E.fx("spark", 3); E.hop(-380); E.say("¡Así me gusta! Contágiame un poco", 2800, true); }],
      ["Regular", () => { E.express("esperanzado", 3); E.say("Venga, que tú puedes. ¿Una pausa cortita luego?", 3000, true); }],
      ["Agotado", () => { E.express("triste", 2); E.act("hug"); E.fx("heart", 2); E.say("Ven aquí… Respira un poco. Yo te acompaño", 3200, true); }]] },
    { q: "¿Has bebido agua hoy?", a: [
      ["¡Sí!", () => { E.express("orgulloso", 2.5); E.say("¡Bien! Hidratación de campeón", 2600, true); }],
      ["Todavía no", () => { E.express("sorprendido", 2.5); E.fx("bang", 1); E.say("¡Ve a por un vaso! Yo te espero aquí", 2800, true); }]] },
    { q: "¿Café o té?", a: [
      ["Café", () => { E.express("emocionado", 2.5); E.useProp && E.useProp("mug", 90, 0); E.say("¡Café! Yo también quiero", 2400, true); }],
      ["Té", () => { E.express("sereno", 2.5); E.useProp && E.useProp("mug", 90, 0); E.say("Té… qué elegante", 2400, true); }],
      ["Ninguno", () => { E.express("confundido", 2.5); E.say("¿Agua entonces? Muy sano", 2400, true); }]] },
    { q: "¿En qué andas ahora?", a: [
      ["Trabajando", () => { E.express("orgulloso", 2.5); E.say("¡Ánimo! Si quieres, te pongo un modo concentración", 3000, true); }],
      ["Creando algo", () => { E.express("emocionado", 2.5); E.fx("spark", 2); E.say("¡Me encanta! Luego me lo enseñas", 2600, true); }],
      ["Nada", () => { E.express("picaro", 2.5); E.say("¿Nada? Entonces… ¿jugamos?", 2400, true); setTimeout(() => propose(true), 2600); }]] },
  ] : [
    { q: "How's your day?", a: [["Great!", () => { E.express("emocionado", 3); E.say("Love it!", 2400, true); }], ["Meh", () => { E.express("esperanzado", 3); E.say("You've got this", 2400, true); }], ["Tired", () => { E.act("hug"); E.say("Come here… take a breath", 2800, true); }]] },
  ];
  function buildUpdate() {
    capText = ES ? `¡Versión nueva (${UPD.v})! ¿Me actualizo?` : `New version (${UPD.v})! Update me?`;
    E.express("emocionado", 2.5);
    return [{ text: ES ? "¡Sí, ahora!" : "Yes, now!", chip: true, label: "", run: installUpdate }, { text: ES ? "Luego" : "Later", chip: true, label: "", run: snoozeUpdate }];
  }
  function buildAsk() {
    const q = pick(QUESTIONS);
    capText = q.q;
    E.express("curioso", 3);
    return q.a.map(([t, f]) => ({ text: t, chip: true, label: "", run: f }));
  }
  let hoverAt = 0;
  function hoverReact(it) {
    const now = performance.now();
    if (!it.react || now - hoverAt < 500) return;
    hoverAt = now;
    if (it.react === "yawn") E.act("yawn");
    else if (it.react === "settings") { if (Math.random() < 0.5) E.say(pick(ES ? ["¿Me vas a cambiar? Snif", "Con cuidadito, ¿eh?", "Ahí guardo mis secretos"] : ["Gonna change me?"]), 1600, true); E.express("timido", 1.5); }
    else E.express(it.react, 1.4);
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) close(); });

  // ---------- Dibujo del menú ----------
  const HEAD = { x: 210, y: 282 };          // centro de la cabeza dentro de la ventana
  let open = false, level = null;

  function layout(n) {
    const out = [];
    if (n > 6) {                      // muchas opciones (armario): rejilla encima de la cabeza
      const cols = 4, rows = Math.ceil(n / cols);
      for (let i = 0; i < n; i++) {
        const r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, n - r * cols);
        out.push({ x: HEAD.x + (c - (inRow - 1) / 2) * 78, y: HEAD.y - 104 - (rows - 1 - r) * 68, small: true });
      }
      return out;
    }
    const radius = n <= 4 ? 122 : n <= 5 ? 138 : 150;  // arco por encima de la cabeza
    for (let i = 0; i < n; i++) {
      const a = (n === 1 ? 270 : 200 + 140 * (i / (n - 1))) * Math.PI / 180;
      out.push({ x: HEAD.x + Math.cos(a) * radius, y: HEAD.y + Math.sin(a) * radius });
    }
    return out;
  }

  // Lo que dice Eko encima de las burbujas en cada nivel
  let capText = "", greetNext = false;
  const CAP = ES ? {
    root: ["¿Qué más te apetece?", "Todo lo que sé hacer"], treats: ["Mmm, ¿qué me das?", "¡Mímame!"], util: ["¿En qué te ayudo?"], wardrobe: ["¿Qué me pongo?", "¡Desfile!"],
    rest: ["¿Descansamos?"], remind: ["¿Cuándo te aviso?"], shortcuts: ["Atajos rápidos"], rps: ["¡Elige! Sin trampas"],
  } : { root: ["What else?"], treats: ["What do I get?"], util: ["How can I help?"], wardrobe: ["What should I wear?"], rest: ["Rest?"], remind: ["When?"], shortcuts: ["Shortcuts"], rps: ["Pick one!"] };
  function render(levelId) {
    level = levelId;
    menu.innerHTML = "";
    capText = "";
    const items = levelId === "smart" ? buildSmart() : levelId === "ask" ? buildAsk() : levelId === "update" ? buildUpdate() : TREE[levelId];
    if (!capText) capText = (levelId === "smart" || (levelId === "root" && greetNext)) ? pick(GREET())() : CAP[levelId] ? pick(CAP[levelId]) : "";
    greetNext = false;
    const pos = layout(items.length);
    const all = [...items];
    if (levelId !== "root" && levelId !== "smart" && levelId !== "ask" && levelId !== "update") { all.unshift({ icon: "back", label: L.back, back: true }); pos.unshift({ x: HEAD.x - 158, y: HEAD.y + 34 }); }
    all.forEach((it, i) => {
      const b = document.createElement("button");
      b.className = "blob" + (it.back ? " back" : "") + (it.text ? " txt" : "") + (it.chip ? " chip" : "") + (pos[i].small ? " small" : "");
      b.style.setProperty("--x", pos[i].x + "px");
      b.style.setProperty("--y", pos[i].y + "px");
      b.style.setProperty("--d", i * 45 + "ms");
      b.style.setProperty("--r", Math.random() * 2 + "s");
      const label = it.dyn ? it.dyn() : it.label;
      b.innerHTML = (it.text ? `<b>${it.text}</b>` : it.img ? `<img class="ic" src="${artSrc(it.img)}" alt="">` : svg(it.icon, it.color)) + (label ? `<span>${label}</span>` : "");
      b.addEventListener("click", (ev) => { ev.stopPropagation(); choose(it); });
      b.addEventListener("mouseenter", () => { E.Voice && E.Voice.tone && E.Voice.tone("sine", 900 + i * 80, 1000 + i * 80, 0.05, 0.015); hoverReact(it); });
      menu.appendChild(b);
      requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add("in")));
    });
    if (capText) {
      const top = Math.min(...pos.map((q) => q.y)) - 62;
      const c = document.createElement("div");
      c.className = "mcap"; c.textContent = capText;
      c.style.setProperty("--y", Math.max(6, top) + "px");
      menu.appendChild(c);
      requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add("in")));
      E.talk && E.talk(capText);
    }
  }

  function choose(it) {
    E.Voice.ensure && E.Voice.ensure();
    if (it.id) { USE[it.id] = (USE[it.id] || 0) + 1; store.set("eko-menu-use", USE); }
    if (it.back) { render(parentOf(level)); return; }
    if (it.go) { if (it.enter) it.enter(); render(it.go); return; }
    if (it.run) {
      if (!it.keep) close();
      it.run();
    }
  }
  function parentOf(lv) {
    for (const [k, items] of Object.entries(TREE)) if (items.some((i) => i.go === lv)) return k;
    return "root";
  }

  function openMenu() {
    if (open) return;
    open = true;
    lastUse = performance.now();
    stage.classList.add("menu-open");
    E.setMenuPose(true);
    E.hold(1e6);
    E.setHitFull(true);
    E.Voice.tone && E.Voice.tone("sine", 520, 780, 0.12, 0.03);
    // Eko habla primero: a veces una pregunta, normalmente 2 sugerencias + «Otra cosa…»
    const cfgS = window.EkoSettings ? window.EkoSettings.get() : {};
    const today = new Date().toDateString();
    const askNow = cfgS.menuAsk !== false && store.get("eko-menu-asked") !== today && Math.random() < 0.35;
    if (askNow) store.set("eko-menu-asked", today);
    greetNext = true;
    E.keepInside(() => { if (open) render(askNow ? "ask" : "root"); });
  }
  function openAt(levelId) {
    if (!open) {
      open = true;
      stage.classList.add("menu-open");
      E.setMenuPose(true); E.hold(1e6); E.setHitFull(true);
      lastUse = performance.now();
    }
    E.keepInside(() => { if (open) render(levelId); });
  }
  function close() {
    if (!open) return;
    open = false;
    stage.classList.remove("menu-open");
    E.setMenuPose(false);
    E.hold(2);
    for (const b of menu.children) b.classList.remove("in");
    setTimeout(() => { if (!open) menu.innerHTML = ""; }, 260);
    if (!ball && !hideGame) E.setHitFull(false);
  }
  // Clic fuera de las burbujas: cerrar
  stage.addEventListener("click", (e) => {
    if (e.target.closest(".card") || e.target.closest("#hit")) return;
    if (open && !e.target.closest(".blob")) close();
    const c = $("#card");
    if (c && c.classList.contains("in")) closeCard();
  });

  // ---------- Tarjeta (texto, formularios, listas) ----------
  let cardTimer = 0;
  function card(html, autoClose = 0) {
    let c = $("#card");
    if (!c) { c = document.createElement("div"); c.id = "card"; c.className = "card"; stage.appendChild(c); }
    c.innerHTML = html;
    c.classList.add("in");
    E.setHitFull(true);
    clearTimeout(cardTimer);
    if (autoClose) cardTimer = setTimeout(closeCard, autoClose);
    return c;
  }
  function closeCard() {
    const c = $("#card");
    if (c) c.classList.remove("in");
    if (!open && !ball && !hideGame) E.setHitFull(false);
  }
  function ask(question, onOk) {
    const c = card(`<p>${question}</p><form><input maxlength="80" autocomplete="off" /><button>${L.ok}</button></form>`);
    const inp = c.querySelector("input");
    setTimeout(() => E.focusInput(inp), 50);
    inp.addEventListener("pointerdown", () => E.focusInput(inp));
    c.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = inp.value.trim();
      closeCard();
      if (v) onOk(v);
    });
    inp.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCard(); });
  }

  // ---------- Jugar: snack, truco ----------
  function giveSnack() {
    E.act("eat");
    setTimeout(() => E.say(pick(SAY.snack), 2400, true), 2900);
  }
  function trick() {
    const t = pick(["dance", "fly", "tada", "tada", "dance"]);
    if (t === "dance") { E.setDance(true); setTimeout(() => E.setDance(false), 8500); }
    else if (t === "fly") E.fly();
    else { E.act("tada"); E.express && E.express("emocionado", 2.2); setTimeout(() => E.say("¡Ta-chán!", 1600, true), 700); }
  }

  // ---------- Piedra, papel o tijera ----------
  function playRps(you) {
    E.act("rps");
    setTimeout(() => {
      const me = Math.floor(Math.random() * 3);
      const names = [L.rock, L.paper, L.scissors];
      const res = (me - you + 3) % 3; // 0 empate, 1 gana Eko, 2 ganas tú
      const tail = res === 0 ? pick(SAY.tie) : res === 1 ? pick(SAY.win) : pick(SAY.lose);
      E.say(`${names[me]}… ${tail}`, 3000, true, res === 1 ? "wink" : res === 2 ? "sad" : "shrug");
      if (res === 1) { E.hop(-380); E.fx("spark", 2); }
    }, 1500);
  }

  // ---------- Escondite ----------
  let hideGame = false;
  async function startHide() {
    hideGame = true;
    E.say(pick(SAY.hide), 2200, true, "wink");
    // ¿Dónde se esconde? Borde de la pantalla, detrás de la ventana activa o detrás de un icono del escritorio
    const spots = ["edge"];
    if (E.perchRoom(E.win.cur)) spots.push("window", "window");
    const icon = window.EkoDesktop ? await window.EkoDesktop.hideSpot() : null;
    if (icon) spots.push("icon", "icon");
    const where = pick(spots);
    const hide = () => { if (hideGame && window.EkoAntics) window.EkoAntics.run("hideBehind"); };
    if (where === "window") {
      setTimeout(() => {
        E.climb();
        let n = 0;
        const wait = setInterval(() => { n++; if (E.S.perch && !E.S.airborne) { clearInterval(wait); setTimeout(hide, 400); } else if (n > 40) { clearInterval(wait); E.forcePeek(); } }, 200);
      }, 900);
    } else if (where === "icon") {
      setTimeout(() => { if (!E.visitIcon(icon, () => setTimeout(hide, 300))) E.forcePeek(); }, 900);
    } else setTimeout(() => E.forcePeek(), 900);
    // Si lo encuentras (clic en él mientras se esconde) se ríe
    const onFound = () => {
      if (!hideGame) return;
      hideGame = false;
      E.say(pick(SAY.found), 2600, true, "heart");
      E.hop(-420);
      document.removeEventListener("eko-tap", onFound);
    };
    document.addEventListener("eko-tap", onFound);
    setTimeout(() => { hideGame = false; document.removeEventListener("eko-tap", onFound); }, 40000);
  }

  // ---------- Eko propone jugar ----------
  const P_TX = ES ? {
    ball: ["¿Me lanzas la pelota?", "¡Tengo una pelota! ¿Jugamos?"],
    rps: ["¿Echamos un piedra, papel o tijera?", "Te reto a piedra, papel o tijera"],
    hide: ["¿Jugamos al escondite? ¡Yo me escondo!", "¿Me buscas? ¡Escondite!"],
    bored: ["Me aburro… ", "Oye… "],
    yes: "¡Vamos!", no: "Ahora no",
    accepted: ["¡Bieeen!", "¡Sí!"], declined: ["Vale… otro día", "Jo. Bueno"], timeout: ["Otra vez será"],
    rpsGo: ["¡Elige!"],
  } : {
    ball: ["Throw me the ball?", "I've got a ball! Play?"],
    rps: ["Rock, paper, scissors?", "I challenge you: rock, paper, scissors"],
    hide: ["Hide and seek? I'll hide!", "Come find me? Hide and seek!"],
    bored: ["I'm bored… ", "Hey… "],
    yes: "Let's go!", no: "Not now",
    accepted: ["Yay!", "Yes!"], declined: ["OK… another day", "Aw. Fine"], timeout: ["Maybe later"],
    rpsGo: ["Pick one!"],
  };
  const GAMES = ["ball", "rps", "hide"];
  const today = () => new Date().toDateString();
  let gs = store.get("eko-games", {});
  if (gs.day !== today()) gs = { day: today(), count: 0, last: 0, declines: 0, snooze: 0 };
  let proposing = false, proposeTimer = 0;

  function canPropose() {
    const S = E.S, s = E.lastSenses || {};
    if (gs.day !== today()) gs = { day: today(), count: 0, last: 0, declines: 0, snooze: 0 };
    if (proposing || open || ball || hideGame || E.quiet) return false;
    if (S.sleeping || S.sulking || S.fly || S.dragging || S.airborne || E.A.hidden) return false;
    if (s.fullscreen || s.in_call) return false;
    if (pomo && pomo.phase === "focus") return false;
    if (s.idle !== undefined && (s.idle < 3 || s.idle > 120)) return false;   // ni tecleando a tope ni ausente
    if (gs.count >= 3 || gs.declines >= 2) return false;
    if (Date.now() - gs.last < 2 * 3600000 || Date.now() < gs.snooze) return false;
    return true;
  }

  function propose(force = false, reason = "") {
    if (!force && !canPropose()) return;
    if (force && (open || ball || hideGame)) close();
    const game = GAMES[Math.floor(Math.random() * GAMES.length)];
    proposing = true;
    if (!force) { gs.count++; gs.last = Date.now(); store.set("eko-games", gs); }
    E.keepInside(() => {
      E.hop(-380);
      E.act(game === "rps" ? "rps" : game === "ball" ? "wave" : "wink");
      const q = (reason === "bored" ? pick(P_TX.bored) : "") + pick(P_TX[game]);
      const c = card(`<p>${q}</p><div class="chips"><button type="button" class="chip main yes">${P_TX.yes}</button><button type="button" class="chip no">${P_TX.no}</button></div>`);
      E.Voice.syllable && [0, 1, 2].forEach((i) => setTimeout(() => E.Voice.syllable(), i * 140));
      const finish = () => { proposing = false; clearTimeout(proposeTimer); closeCard(); };
      c.querySelector(".yes").addEventListener("click", () => {
        finish();
        E.say(pick(P_TX.accepted), 1600, true, "heart");
        setTimeout(() => startGame(game), 700);
      });
      c.querySelector(".no").addEventListener("click", () => {
        finish();
        if (!force) { gs.declines++; gs.snooze = Date.now() + 3600000; store.set("eko-games", gs); }
        E.say(pick(P_TX.declined), 2200, true, "sad");
      });
      proposeTimer = setTimeout(() => { if (proposing) { finish(); E.say(pick(P_TX.timeout), 2000, true, "shrug"); } }, 20000);
    });
  }

  function startGame(game) {
    if (game === "ball") startBall();
    else if (game === "hide") startHide();
    else { openAt("rps"); E.say(pick(P_TX.rpsGo), 1800, true); }
  }

  // Comprueba cada medio minuto si es buen momento para proponer algo
  setInterval(() => {
    if (!canPropose()) return;
    const ignoredMin = (Date.now() - E.lastInteraction()) / 60000;
    const h = new Date().getHours(), friday = new Date().getDay() === 5 && h >= 16;
    if (ignoredMin > 120) propose(false, "bored");
    else if (ignoredMin > 45 && Math.random() < (friday ? 0.12 : 0.04)) propose(false);
  }, 30000);

  // ---------- Pelota ----------
  // En la app la pelota tiene su propia ventanita (puede llegar a los bordes de la pantalla);
  // en la vista previa se dibuja dentro del escenario.
  const BALLWIN = !!(invoke && E.native);
  let ball = null, ballTips = 0;
  const ballEl = document.createElement("div");
  ballEl.id = "ball";
  ballEl.innerHTML = `<img src="${(document.getElementById("artBall") || {}).getAttribute?.("href") || "art/ball.webp"}" alt="" draggable="false">`;
  stage.appendChild(ballEl);
  const R = 13; // radio de la pelota

  function startBall() {
    const cx = E.S.x + E.W / 2;
    ball = { x: cx + 60, y: E.S.y + 200, vx: 0, vy: 0, held: false, grabbed: false, rot: 0, chasing: false, idleSince: performance.now(), wx: NaN, wy: NaN };
    if (BALLWIN) invoke("ball_show", { x: ball.x - 20, y: ball.y - 20 }).catch(() => {});
    else ballEl.classList.add("in");
    E.setHitFull(true);
    E.say(pick(SAY.ball), 2400, true);
    if (ballTips < 2) { ballTips++; setTimeout(() => ball && E.say(L.ballTip, 3200, true), 2800); }
  }
  function endBall() {
    ball = null; drag = null;
    if (BALLWIN) invoke("ball_hide").catch(() => {});
    ballEl.classList.remove("in");
    if (!open) E.setHitFull(false);
  }
  // Guardarla: Eko va a por ella, la coge y desaparece en un «pop»
  function stowBall() {
    if (!ball || ball.stowing) return;
    ball.stowing = true; ball.grabbed = false; drag = null;
    E.say(pick(SAY.stow), 2000, true);
    const fin = () => { if (!ball) return; E.act("nod"); E.express && E.express("contento", 2); endBall(); };
    if (Math.abs(ball.x - (E.S.x + E.W / 2)) < 120 || E.S.airborne) setTimeout(fin, 500);
    else ball.stowAt = performance.now();
  }
  let drag = null;
  function ballDown(sx, sy) {
    if (!ball || ball.stowing) return;
    drag = { px: sx, py: sy, t: performance.now(), vx: 0, vy: 0 };
    ball.grabbed = true; ball.held = false; ball.chasing = false;
  }
  function ballMove(sx, sy) {
    if (!drag || !ball) return;
    const now = performance.now(), dt = Math.max(1, now - drag.t) / 1000;
    const dx = sx - drag.px, dy = sy - drag.py;
    ball.x += dx; ball.y += dy;
    drag.vx = drag.vx * 0.4 + (dx / dt) * 0.6; drag.vy = drag.vy * 0.4 + (dy / dt) * 0.6;
    drag.px = sx; drag.py = sy; drag.t = now;
  }
  function ballUp() {
    if (!drag || !ball) return;
    ball.grabbed = false;
    ball.vx = E.clamp(drag.vx, -2200, 2200); ball.vy = E.clamp(drag.vy, -1800, 1000);
    if (Math.hypot(ball.vx, ball.vy) < 60) { ball.vx = (Math.random() < 0.5 ? -1 : 1) * 500; ball.vy = -500; }
    drag = null;
    ball.idleSince = performance.now();
    E.act("surprise");
  }
  ballEl.addEventListener("pointerdown", (e) => { if (e.button) return; ballEl.setPointerCapture(e.pointerId); ballDown(e.screenX, e.screenY); });
  ballEl.addEventListener("pointermove", (e) => ballMove(e.screenX, e.screenY));
  ballEl.addEventListener("pointerup", ballUp);
  ballEl.addEventListener("dblclick", stowBall);
  ballEl.addEventListener("contextmenu", (e) => { e.preventDefault(); stowBall(); });
  if (BALLWIN) E.listen("ball-in", (e) => {
    const p = e.payload || {};
    if (p.t === "down") ballDown(p.x, p.y);
    else if (p.t === "move") ballMove(p.x, p.y);
    else if (p.t === "up") ballUp();
    else if (p.t === "stow") stowBall();
  });
  if (BALLWIN) E.listen("cmd", (e) => { if (e.payload === "stowball" && ball) endBall(); });

  function ballStep(dt) {
    if (!ball) return;
    const S = E.S, W = E.W, H = E.H, wd = E.world;
    // límites: la pantalla entera (en la vista previa, el escenario)
    const lo = wd.left + R, hi = wd.left + wd.width - R, top = wd.top + R;
    const floor = Math.max(S.y + H - 14, top + 40);
    const pet = S.x + W / 2;
    if (ball.held) {
      ball.x = pet + 34; ball.y = S.y + H - 70;
    } else if (!ball.grabbed) {
      ball.vy += 1800 * dt;
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      ball.rot += ball.vx * dt * 4.4;
      if (ball.x < lo) { ball.x = lo; ball.vx = Math.abs(ball.vx) * 0.6; }
      if (ball.x > hi) { ball.x = hi; ball.vx = -Math.abs(ball.vx) * 0.6; }
      if (ball.y < top) { ball.y = top; ball.vy = Math.abs(ball.vy) * 0.5; }
      if (ball.y > floor) { ball.y = floor; ball.vy = -Math.abs(ball.vy) * 0.55; ball.vx *= 0.82; if (Math.abs(ball.vy) < 60) ball.vy = 0; }
      const resting = ball.vy === 0 && Math.abs(ball.vx) < 20 && ball.y >= floor - 1;
      const d = Math.abs(ball.x - pet);
      // ¿la alcanza? (cerca, o pegada a un borde donde Eko ya no puede avanzar más)
      const reach = d < 26 || (d < 110 && (S.x <= E.minX() + 2 || S.x >= E.maxX() - 2));
      if (!reach && !S.airborne && !S.dragging) {
        E.walkTo(ball.x, ball.stowing ? 190 : 150);
        ball.chasing = true;
      } else if (reach && (resting || ball.stowing) && (ball.chasing || ball.stowing)) {
        if (ball.stowing) { E.act("nod"); endBall(); return; }
        ball.chasing = false; ball.held = true;
        E.hold(2.5);
        setTimeout(() => {           // te la devuelve: salto y la lanza hacia el centro
          if (!ball || !ball.held) return;
          const toMid = ball.x < wd.left + wd.width / 2 ? 1 : -1;
          ball.held = false; ball.vx = toMid * (140 + Math.random() * 120); ball.vy = -420;
          E.hop(-360);
          E.say(pick(SAY.fetch), 2200);
          ball.idleSince = performance.now();
        }, 900);
      }
    }
    if (BALLWIN) {
      const wx = Math.round(ball.x - 20), wy = Math.round(ball.y - 20);
      if (wx !== ball.wx || wy !== ball.wy) { ball.wx = wx; ball.wy = wy; invoke("ball_pos", { x: wx, y: wy }).catch(() => {}); }
    } else {
      ballEl.style.transform = `translate(${(ball.x - S.x - R).toFixed(1)}px, ${(ball.y - S.y - R).toFixed(1)}px) rotate(${ball.rot.toFixed(0)}deg)`;
    }
    if (ball && performance.now() - ball.idleSince > 45000 && !ball.held && !ball.stowing) stowBall();
  }

  // ---------- Recordatorios ----------
  let reminders = store.get("eko-reminders", []);
  function askReminder(min, label) {
    ask(L.remindAsk, (text) => {
      reminders.push({ at: Date.now() + min * 60000, text });
      store.set("eko-reminders", reminders);
      E.say(SAY.remindSet(label), 2600, true, "nod");
    });
  }
  function checkReminders() {
    const now = Date.now();
    const due = reminders.filter((r) => r.at <= now);
    if (!due.length) return;
    reminders = reminders.filter((r) => r.at > now);
    store.set("eko-reminders", reminders);
    const r = due[0];
    if (E.S.sleeping) E.wakeUp(false);
    E.hop(-460);
    E.act("surprise");
    E.fx("bang", 2);
    E.Voice.chirp(); setTimeout(() => E.Voice.chirp(), 300);
    E.say(r.text, 9000, true);
  }

  // ---------- Pomodoro ----------
  const badge = $("#badge");
  let pomo = null;
  function startPomo() {
    pomo = { phase: "focus", end: Date.now() + 25 * 60000 };
    E.say(pick(SAY.pomoStart), 2600, true, "nod");
    badge.classList.add("in");
  }
  function stopPomo() { pomo = null; badge.classList.remove("in"); }
  function tickPomo() {
    if (!pomo) return;
    const left = Math.max(0, pomo.end - Date.now());
    const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
    badge.textContent = `${pomo.phase === "focus" ? "●" : "~"} ${m}:${String(s).padStart(2, "0")}`;
    badge.classList.toggle("break", pomo.phase === "break");
    if (left > 0) return;
    if (pomo.phase === "focus") {
      pomo = { phase: "break", end: Date.now() + 5 * 60000 };
      E.setDance(true); setTimeout(() => E.setDance(false), 4500);
      E.say(pick(SAY.pomoBreak), 4000, true);
      setTimeout(() => { if (Math.random() < 0.5) propose(false); }, 9000);
      setTimeout(() => E.act("stretch"), 4800);
    } else {
      stopPomo();
      E.say(pick(SAY.pomoEnd), 3000, true, "wave");
    }
  }

  // ---------- Notas y tareas ----------
  let tasks = store.get("eko-tasks", []);
  function askNote() {
    ask(L.noteAsk, (text) => {
      tasks.push({ text, done: false, at: Date.now() });
      store.set("eko-tasks", tasks);
      E.say(pick(SAY.noted), 2200, true, "nod");
    });
  }
  function showTasks() {
    const pending = tasks.filter((t) => !t.done);
    if (!pending.length) { E.say(pick(SAY.empty), 2400, true, "shrug"); return; }
    const c = card(`<ul>${pending.map((t, i) => `<li data-i="${tasks.indexOf(t)}"><i></i>${t.text.replace(/</g, "&lt;")}</li>`).join("")}</ul>`);
    c.querySelectorAll("li").forEach((li) => li.addEventListener("click", () => {
      const t = tasks[+li.dataset.i]; if (!t) return;
      t.done = true; store.set("eko-tasks", tasks);
      li.classList.add("done");
      E.say(pick(SAY.done), 2200, true); E.hop(-360); E.fx("spark", 2);
      setTimeout(() => { if (!tasks.some((x) => !x.done)) closeCard(); }, 900);
    }));
    setTimeout(() => document.addEventListener("click", function off(e) { if (!e.target.closest(".card")) { closeCard(); document.removeEventListener("click", off); } }), 50);
  }

  // ---------- Descanso ----------
  function muteHour() {
    E.say(pick(SAY.muted), 2400, true, "nod");
    setTimeout(() => {
      E.Voice.setOn(false);
      setTimeout(() => E.Voice.setOn(true), 3600000);
    }, 2600);
  }
  function toggleDiscreet() {
    E.quiet = !E.quiet;
    E.say(pick(E.quiet ? SAY.discreetOn : SAY.discreetOff), 2000, true);
  }

  function openSettings() {
    if (invoke) invoke("open_settings").catch(() => {});
    else window.open("settings.html", "eko-settings", "width=540,height=700");
    E.act("nod");
  }

  // ---------- Atajos del PC (solo en la app) ----------
  function native(cmd) {
    if (!invoke) { E.say(L.onlyApp, 2400, true, "shrug"); return; }
    E.act("point", { dir: 1 });
    invoke(cmd).catch(() => E.say(L.onlyApp, 2400, true, "shrug"));
  }

  // ---------- Regar el brote ----------
  // Sale una regadera; la arrastras sobre la cabeza de Eko, se inclina sola y caen gotas.
  const artSrc = (id) => { const n = document.getElementById(id); return n ? n.getAttribute("href") : ""; };
  const CAN_W = 92, CAN_H = Math.round(92 * 143 / 200), TIP = { x: 198 / 200 * CAN_W, y: 49 / 143 * CAN_H };
  let can = null;
  const canEl = document.createElement("div");
  canEl.id = "can";
  canEl.innerHTML = `<img src="${artSrc("artCan")}" alt="" draggable="false">`;
  stage.appendChild(canEl);
  const dropsEl = document.createElement("div");
  dropsEl.id = "drops";
  stage.appendChild(dropsEl);
  function waterTarget() {
    const sb = stage.getBoundingClientRect();
    const sp = E.sprout && E.sprout();
    const r = sp && sp.style.display !== "none" ? sp.getBoundingClientRect() : document.getElementById("mochi").getBoundingClientRect();
    const mo = document.getElementById("mochi").getBoundingClientRect();
    return { x: mo.left + mo.width / 2 - sb.left, y: Math.min(r.top + r.height * 0.5, mo.top + 8) - sb.top };
  }
  function startWater() {
    if (can) return;
    if (open) close();
    const t = waterTarget();
    can = { x: t.x - 150, y: Math.max(8, t.y - 120), tilt: 0, poured: 0, drag: null, dropT: 0, drops: [], until: performance.now() + 30000, done: false };
    canEl.classList.add("in");
    E.setHitFull(true);
    E.hold && E.hold(30);
    E.say(L.waterTip, 2600, true);
    E.express && E.express("esperanzado", 2.5);
  }
  function endWater() {
    can = null;
    canEl.classList.remove("in");
    dropsEl.innerHTML = "";
    if (!open && !ball && !hideGame) E.setHitFull(false);
  }
  canEl.addEventListener("pointerdown", (e) => {
    if (!can || can.done) return;
    canEl.setPointerCapture(e.pointerId);
    can.drag = { x: e.clientX, y: e.clientY };
    can.until = performance.now() + 30000;
  });
  canEl.addEventListener("pointermove", (e) => {
    if (!can || !can.drag) return;
    can.x += e.clientX - can.drag.x; can.y += e.clientY - can.drag.y;
    can.x = E.clamp(can.x, -CAN_W * 0.3, innerWidth - CAN_W * 0.7); can.y = E.clamp(can.y, -10, innerHeight - CAN_H);
    can.drag = { x: e.clientX, y: e.clientY };
  });
  canEl.addEventListener("pointerup", () => { if (can) can.drag = null; });
  function canStep(dt) {
    if (!can) return;
    const t = waterTarget();
    const tipX = can.x + TIP.x, tipY = can.y + TIP.y;
    const over = !can.done && Math.abs(tipX - t.x) < 48 && tipY < t.y - 6 && tipY > t.y - 170;
    can.tilt += ((over ? 38 : 0) - can.tilt) * Math.min(1, dt * 8);
    // punta del pitorro una vez inclinada (gira sobre el centro de la regadera)
    const a = can.tilt * Math.PI / 180, cx = can.x + CAN_W / 2, cy = can.y + CAN_H / 2;
    const tx = cx + (TIP.x - CAN_W / 2) * Math.cos(a) - (TIP.y - CAN_H / 2) * Math.sin(a);
    const ty = cy + (TIP.x - CAN_W / 2) * Math.sin(a) + (TIP.y - CAN_H / 2) * Math.cos(a);
    if (over && can.tilt > 25) {
      can.poured += dt;
      can.dropT -= dt;
      if (can.dropT <= 0) {
        can.dropT = 0.07 + Math.random() * 0.05;
        const s = 7 + Math.random() * 5;
        const d = document.createElement("img");
        d.src = artSrc("artDrop"); d.alt = ""; d.className = "drop";
        d.style.width = s + "px";
        dropsEl.appendChild(d);
        can.drops.push({ el: d, x: tx + (Math.random() - 0.5) * 8, y: ty, vx: 30 + Math.random() * 40, vy: 20 + Math.random() * 30, s, floor: t.y + Math.random() * 10 });
      }
      if (can.poured > 1.8 && !can.done) {
        can.done = true;
        const res = E.water ? E.water() : "ok";
        setTimeout(() => canEl.classList.add("bye"), 700);
        setTimeout(() => { canEl.classList.remove("bye"); endWater(); }, 1300);
        if (res !== "grow") E.act && E.act("nod");
      }
    }
    for (const d of can.drops) {
      d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.y >= d.floor) { d.el.remove(); d.dead = true; continue; }
      d.el.style.transform = `translate(${(d.x - d.s / 2).toFixed(1)}px, ${(d.y - d.s * 0.7).toFixed(1)}px)`;
    }
    can.drops = can.drops.filter((d) => !d.dead);
    canEl.style.transform = `translate(${can.x.toFixed(1)}px, ${can.y.toFixed(1)}px) rotate(${can.tilt.toFixed(1)}deg)`;
    if (!can.done && performance.now() > can.until) endWater();
  }

  // ---------- Bucle ----------
  let last = performance.now();
  (function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ballStep(dt);
    if (can) canStep(dt);
    requestAnimationFrame(loop);
  })(last);
  setInterval(() => { checkReminders(); tickPomo(); }, 1000);

  // Cerrar el menú si el ratón se va lejos de Eko o si no se usa en un rato
  let awaySince = 0, openedAt = 0;
  setInterval(() => {
    if (!open) { awaySince = 0; return; }
    if (!openedAt) openedAt = performance.now();
    const c = E.cursor, S = E.S;
    const inside = c.x >= S.x && c.x <= S.x + E.W && c.y >= S.y && c.y <= S.y + E.H;
    if (inside) awaySince = 0; else if (!awaySince) awaySince = performance.now();
    if ((awaySince && performance.now() - awaySince > 1200) || performance.now() - lastUse > 20000) close();
  }, 200);
  let lastUse = performance.now();
  menu.addEventListener("pointermove", () => { lastUse = performance.now(); });

  window.EkoMenu = {
    toggle() {
      if (window.EkoAntics && window.EkoAntics.tap && window.EkoAntics.tap()) { hideGame = false; return; }   // estaba escondido y lo has pillado
      if (!open && updPending() && !hideGame) { openAt("update"); return; }                                   // actualización pendiente: un clic y listo
      const wasHiding = hideGame;
      document.dispatchEvent(new Event("eko-tap"));
      if (wasHiding) return;
      open ? close() : openMenu();
    },
    close,
    propose: (force) => propose(force),
    tapClick: () => {
      if (hideGame) { document.dispatchEvent(new Event("eko-tap")); return true; }
      if (!open && updPending()) { openAt("update"); return true; }
      return false;
    },
    announceUpdate, muteHour: () => muteHour(), remindIn: (min, text) => { reminders.push({ at: Date.now() + min * 60000, text }); store.set("eko-reminders", reminders); }, startGame: (g) => startGame(g), startWater: () => startWater(), stowBall: () => stowBall(), get ball() { return ball; },
    isOpen: () => open,
  };
})();
