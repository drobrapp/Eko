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
    play: "Jugar", util: "Útil", wardrobe: "Armario", rest: "Descanso", settings: "Ajustes",
    ball: "Pelota", snack: "Snack", games: "Juegos", trick: "Truco",
    rps: "Piedra, papel…", hand: "¿Qué mano?", hide: "Escondite",
    rock: "Piedra", paper: "Papel", scissors: "Tijera", lefth: "Izquierda", righth: "Derecha",
    remind: "Recordatorio", pomo: "Pomodoro", note: "Nota", tasks: "Tareas", shortcuts: "Atajos",
    lastdl: "Última descarga", dlfolder: "Descargas", shot: "Captura", playpause: "Pausar", nexttrack: "Siguiente",
    sleep: "Dormir", mute: "Silencio 1 h", discreet: "Discreto", back: "Volver",
    auto: "Automático", none: "Ninguno",
    remindAsk: "¿Qué te recuerdo?", noteAsk: "Apunta una tarea o nota", ok: "Vale",
    stopPomo: "Parar pomodoro",
    soon: "Ajustes: nombre, cumpleaños, sonido, apps por categoría… ¡muy pronto!",
    onlyApp: "Eso solo funciona en la app",
  } : {
    play: "Play", util: "Useful", wardrobe: "Wardrobe", rest: "Rest", settings: "Settings",
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
    hide: ["¡A que no me encuentras!"], found: ["¡Me has pillado!", "¡Jo, qué rápido!"], ball: ["¡Lánzamela!", "¡Otra vez!"], fetch: ["¡Aquí tienes!", "¡Otra, otra!"],
    remindSet: (m) => `Vale, te aviso en ${m}`, pomoStart: ["¡A concentrarse! 25 minutos"], pomoBreak: ["¡Descanso! 5 minutos para estirarte"], pomoEnd: ["¡Otra ronda cuando quieras!"],
    noted: ["Apuntado", "Lo guardo"], done: ["¡Una menos!", "¡Bien hecho!"], empty: ["No tienes tareas pendientes"], muted: ["Me callo una horita"], discreetOn: ["Modo discreto"], discreetOff: ["Vuelvo a hablar"],
  } : {
    snack: ["Yum!", "Delicious", "Is there more?"], win: ["I win!", "Yes!"], lose: ["Fine, you win", "Rematch!"], tie: ["Tie!"],
    rpsPick: ["Rock, paper, scissors!"], handAsk: ["Which hand is it in?"], handYes: ["Well spotted!", "Correct!"], handNo: ["Nope!", "It was the other one"],
    hide: ["Bet you can't find me!"], found: ["You found me!", "That was fast!"], ball: ["Throw it!", "Again!"], fetch: ["Here you go!", "Again, again!"],
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
      { id: "play", icon: "play", label: L.play, go: "play" },
      { id: "util", icon: "util", label: L.util, go: "util" },
      { id: "wardrobe", icon: "hanger", label: L.wardrobe, go: "wardrobe" },
      { id: "rest", icon: "moon", label: L.rest, go: "rest" },
      { id: "settings", icon: "sliders", label: L.settings, run: openSettings },
    ],
    play: [
      { icon: "ball", label: L.ball, run: startBall },
      { icon: "cookie", label: L.snack, run: giveSnack },
      { icon: "dice", label: L.games, go: "games" },
      { icon: "star", label: L.trick, run: trick },
    ],
    games: [
      { icon: "rock", label: L.rps, go: "rps", enter: () => { E.say(pick(SAY.rpsPick), 2000, true); } },
      { text: "?", label: L.hand, go: "hand", enter: startHand },
      { icon: "hide", label: L.hide, run: startHide },
    ],
    rps: [
      { icon: "rock", label: L.rock, run: () => playRps(0) },
      { icon: "paper", label: L.paper, run: () => playRps(1) },
      { icon: "scissors", label: L.scissors, run: () => playRps(2) },
    ],
    hand: [
      { icon: "left", label: L.lefth, run: () => guessHand(-1) },
      { icon: "right", label: L.righth, run: () => guessHand(1) },
    ],
    util: [
      { icon: "bell", label: L.remind, go: "remind" },
      { icon: "timer", label: L.pomo, run: () => (pomo ? stopPomo() : startPomo()), dyn: () => (pomo ? L.stopPomo : L.pomo) },
      { icon: "pencil", label: L.note, run: askNote },
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
      { icon: "moon", label: L.sleep, run: () => E.goToSleep() },
      { icon: "mute", label: L.mute, run: muteHour },
      { icon: "feather", label: L.discreet, run: toggleDiscreet, dyn: () => (E.quiet ? L.discreet + " ✓" : L.discreet) },
    ],
  };

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
    const radius = n <= 4 ? 122 : 138;  // arco por encima de la cabeza
    for (let i = 0; i < n; i++) {
      const a = (n === 1 ? 270 : 200 + 140 * (i / (n - 1))) * Math.PI / 180;
      out.push({ x: HEAD.x + Math.cos(a) * radius, y: HEAD.y + Math.sin(a) * radius });
    }
    return out;
  }

  function render(levelId) {
    level = levelId;
    menu.innerHTML = "";
    const items = TREE[levelId];
    const pos = layout(items.length);
    const all = [...items];
    if (levelId !== "root") { all.unshift({ icon: "back", label: L.back, back: true }); pos.unshift({ x: HEAD.x - 158, y: HEAD.y + 34 }); }
    all.forEach((it, i) => {
      const b = document.createElement("button");
      b.className = "blob" + (it.back ? " back" : "") + (it.text ? " txt" : "") + (pos[i].small ? " small" : "");
      b.style.setProperty("--x", pos[i].x + "px");
      b.style.setProperty("--y", pos[i].y + "px");
      b.style.setProperty("--d", i * 45 + "ms");
      b.style.setProperty("--r", Math.random() * 2 + "s");
      const label = it.dyn ? it.dyn() : it.label;
      b.innerHTML = (it.text ? `<b>${it.text}</b>` : svg(it.icon, it.color)) + (label ? `<span>${label}</span>` : "");
      b.addEventListener("click", (ev) => { ev.stopPropagation(); choose(it); });
      b.addEventListener("mouseenter", () => E.Voice && E.Voice.tone && E.Voice.tone("sine", 900 + i * 80, 1000 + i * 80, 0.05, 0.015));
      menu.appendChild(b);
      requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add("in")));
    });
  }

  function choose(it) {
    E.Voice.ensure && E.Voice.ensure();
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
    E.keepInside(() => { if (open) render("root"); });
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
    const t = pick(["dance", "fly", "flip", "flip", "dance"]);
    if (t === "dance") { E.setDance(true); setTimeout(() => E.setDance(false), 8500); }
    else if (t === "fly") E.fly();
    else { E.hop(-700); setTimeout(() => E.act("flip"), 80); }
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

  // ---------- ¿En qué mano está? ----------
  let handSecret = 1;
  function startHand() {
    handSecret = Math.random() < 0.5 ? -1 : 1;
    E.act("fists", { dur: 30 });
    E.say(pick(SAY.handAsk), 2400, true);
  }
  function guessHand(dir) {
    E.act("reveal", { dir: handSecret });
    E.fx("spark", 2);
    setTimeout(() => {
      if (dir === handSecret) { E.say(pick(SAY.handYes), 2400, true); E.hop(-360); }
      else E.say(pick(SAY.handNo), 2400, true, "wink");
    }, 600);
  }

  // ---------- Escondite ----------
  let hideGame = false;
  function startHide() {
    hideGame = true;
    E.say(pick(SAY.hide), 2200, true, "wink");
    setTimeout(() => E.forcePeek(), 900);
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

  // ---------- Pelota ----------
  let ball = null;
  const ballEl = document.createElement("div");
  ballEl.id = "ball";
  ballEl.innerHTML = '<svg viewBox="-12 -12 24 24"><circle r="11" fill="#f05d5e"/><path d="M-11,-2 C-4,2 4,2 11,-2" stroke="#fff" stroke-width="2.4" fill="none"/><circle cx="-4" cy="-5" r="3" fill="#fff" opacity=".5"/></svg>';
  stage.appendChild(ballEl);

  function startBall() {
    const cx = E.S.x + E.W / 2;
    ball = { x: cx + 60, y: E.S.y + 200, vx: 0, vy: 0, held: false, grabbed: false, rot: 0, chasing: false, idleSince: performance.now() };
    ballEl.classList.add("in");
    E.setHitFull(true);
    E.say(pick(SAY.ball), 2400, true);
  }
  function endBall() {
    ball = null;
    ballEl.classList.remove("in");
    if (!open) E.setHitFull(false);
  }
  let drag = null;
  ballEl.addEventListener("pointerdown", (e) => {
    if (!ball) return;
    ballEl.setPointerCapture(e.pointerId);
    drag = { px: e.screenX, py: e.screenY, t: performance.now(), vx: 0, vy: 0 };
    ball.grabbed = true; ball.held = false; ball.chasing = false;
  });
  ballEl.addEventListener("pointermove", (e) => {
    if (!drag || !ball) return;
    const now = performance.now(), dt = Math.max(1, now - drag.t) / 1000;
    const dx = e.screenX - drag.px, dy = e.screenY - drag.py;
    ball.x += dx; ball.y += dy;
    drag.vx = drag.vx * 0.4 + (dx / dt) * 0.6; drag.vy = drag.vy * 0.4 + (dy / dt) * 0.6;
    drag.px = e.screenX; drag.py = e.screenY; drag.t = now;
  });
  ballEl.addEventListener("pointerup", () => {
    if (!drag || !ball) return;
    ball.grabbed = false;
    ball.vx = E.clamp(drag.vx, -1600, 1600); ball.vy = E.clamp(drag.vy, -1600, 900);
    if (Math.hypot(ball.vx, ball.vy) < 60) { ball.vx = (Math.random() < 0.5 ? -1 : 1) * 500; ball.vy = -500; }
    drag = null;
    ball.idleSince = performance.now();
    E.act("surprise");
  });

  function ballStep(dt) {
    if (!ball) return;
    const S = E.S, W = E.W, H = E.H;
    const floor = S.y + H - 14;
    const pet = S.x + W / 2;
    if (ball.held) {
      ball.x = pet + 34; ball.y = S.y + H - 70;
    } else if (!ball.grabbed) {
      ball.vy += 1800 * dt;
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      ball.rot += ball.vx * dt * 2;
      // paredes: la ventana de Eko (la pelota no se pierde de vista)
      const lo = S.x + 16, hi = S.x + W - 16;
      if (ball.x < lo) { ball.x = lo; ball.vx = Math.abs(ball.vx) * 0.6; }
      if (ball.x > hi) { ball.x = hi; ball.vx = -Math.abs(ball.vx) * 0.6; }
      if (ball.y > floor) { ball.y = floor; ball.vy = -Math.abs(ball.vy) * 0.55; ball.vx *= 0.82; if (Math.abs(ball.vy) < 60) ball.vy = 0; }
      const resting = ball.vy === 0 && Math.abs(ball.vx) < 20 && ball.y >= floor - 1;
      // Eko va a por ella
      if (Math.abs(ball.x - pet) > 26 && !S.airborne && !S.dragging) {
        E.walkTo(ball.x, 150);
        ball.chasing = true;
      } else if (resting && ball.chasing) {
        ball.chasing = false; ball.held = true;
        E.hold(2.5);
        setTimeout(() => {           // te la devuelve: salto y la suelta delante
          if (!ball) return;
          ball.held = false; ball.vx = (Math.random() < 0.5 ? -1 : 1) * 140; ball.vy = -420;
          E.hop(-360);
          E.say(pick(SAY.fetch), 2200);
          ball.idleSince = performance.now();
        }, 900);
      }
    }
    ballEl.style.transform = `translate(${(ball.x - S.x - 13).toFixed(1)}px, ${(ball.y - S.y - 13).toFixed(1)}px) rotate(${ball.rot.toFixed(0)}deg)`;
    if (performance.now() - ball.idleSince > 45000 && !ball.held) endBall();
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

  // ---------- Bucle ----------
  let last = performance.now();
  (function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ballStep(dt);
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
      const wasHiding = hideGame;
      document.dispatchEvent(new Event("eko-tap"));
      if (wasHiding) return;
      open ? close() : openMenu();
    },
    close,
    isOpen: () => open,
  };
})();
