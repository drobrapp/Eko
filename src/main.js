// Eko · fase 1: vive en la barra de tareas, pasea, te mira, se deja coger y acariciar.
(() => {
  "use strict";

  // ---------- Puente con Tauri (con modo navegador para previsualizar) ----------
  const T = window.__TAURI__;
  const NATIVE = !!T;
  const win = NATIVE ? T.window.getCurrentWindow() : null;
  const invoke = NATIVE ? T.core.invoke : async () => {};
  const listen = NATIVE ? T.event.listen : async () => {};

  const W = 220, H = 250;
  const $ = (s) => document.querySelector(s);
  const stage = $("#stage"), hit = $("#hit"), bubble = $("#bubble");
  const el = {
    pet: $("#pet"), head: $("#head"), body: $("#body"), eyes: $("#eyes"),
    legL: $("#legL"), legR: $("#legR"), armL: $("#armL"), armR: $("#armR"),
    shadow: $("#shadow"), hl: $("#hl"), opens: [...document.querySelectorAll(".eye .open")],
    eyeEls: [...document.querySelectorAll(".eye")],
  };

  // ---------- Textos (es / en) ----------
  const LANG = (navigator.language || "es").toLowerCase().startsWith("es") ? "es" : "en";
  const TXT = {
    es: {
      hello: ["¡Hola!", "Ya estoy aquí", "¿Qué hacemos hoy?"],
      poke: ["¿Mm?", "¡Eh!", "¿Sí?", "Dime"],
      pet: ["mmm…", "Qué gustito", "Otra vez"],
      drop: ["¡Uf!", "Aterrizaje perfecto", "Otra vez no…"],
      sleep: ["Buenas noches…", "Cinco minutitos…"],
      wake: ["¿Ya?", "Estaba descansando los ojos"],
      updating: ["Voy a cambiarme, ahora vuelvo"],
      updated: ["¡Estreno versión!", "Me noto distinto…"],
    },
    en: {
      hello: ["Hi!", "I'm here", "What are we doing today?"],
      poke: ["Hm?", "Hey!", "Yes?", "Tell me"],
      pet: ["mmm…", "That's nice", "Again"],
      drop: ["Oof!", "Perfect landing", "Not again…"],
      sleep: ["Good night…", "Five more minutes…"],
      wake: ["Already?", "I was just resting my eyes"],
      updating: ["Changing clothes, be right back"],
      updated: ["New version!", "I feel different…"],
    },
  }[LANG];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- Bocadillo ----------
  let bubbleTimer = 0, lastSay = 0;
  function say(text, ms = 2800, force = false) {
    const now = performance.now();
    if (!force && now - lastSay < 6000) return; // intensidad equilibrada
    lastSay = now;
    bubble.textContent = text;
    bubble.classList.add("show");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove("show"), ms);
  }

  // ---------- Mundo: el "suelo" es el borde superior de la barra de tareas ----------
  const world = { left: 0, top: 0, width: 0, height: 0 };
  function readBounds() {
    if (NATIVE) {
      world.left = screen.availLeft || 0;
      world.top = screen.availTop || 0;
      world.width = screen.availWidth;
      world.height = screen.availHeight;
    } else {
      world.left = 0; world.top = 0; world.width = innerWidth; world.height = innerHeight;
    }
  }
  const floorY = () => world.top + world.height - H;
  const minX = () => world.left - 40;
  const maxX = () => world.left + world.width - W + 40;

  // ---------- Estado ----------
  const S = {
    x: 0, y: 0, vx: 0, vy: 0,
    airborne: false, dragging: false, pressed: false,
    mode: "idle", modeUntil: 0, targetX: 0, facing: 1,
    sleeping: false,
  };
  const A = {
    t: 0, squash: 0, squashV: 0, appear: 0,
    tilt: 0, tiltTarget: 0,
    eyeX: 0, eyeY: 0, eyeTX: 0, eyeTY: 0,
    blink: 1, nextBlink: 2, blinkEnd: 0,
    walkPhase: 0, kick: 0, turn: 0, dance: false, hot: false, mood: "normal", moodUntil: 0,
  };
  const cursor = { x: -1e4, y: -1e4, over: false, lastX: 0, lastY: 0, pet: 0, lastMove: 0 };

  function setMood(m, secs = 0) {
    A.mood = m;
    A.moodUntil = secs ? A.t + secs : 0;
    stage.classList.toggle("mood-happy", m === "happy");
    stage.classList.toggle("mood-sleep", m === "sleep");
  }
  const bump = (amount) => { A.squashV += amount; };

  // ---------- Posición de la ventana ----------
  let lastPosKey = "";
  function place() {
    const px = Math.round(S.x), py = Math.round(S.y);
    const key = px + "," + py;
    if (key === lastPosKey) return;
    lastPosKey = key;
    if (NATIVE) win.setPosition(new T.dpi.LogicalPosition(px, py));
    else stage.style.transform = `translate(${px}px, ${py}px)`;
  }

  // ---------- Cerebro (rutina en reposo) ----------
  function decide() {
    if (S.sleeping || S.airborne || S.dragging) return;
    const r = Math.random();
    if (r < 0.45) {
      S.mode = "idle";
      S.modeUntil = A.t + rnd(3, 8);
      A.tiltTarget = Math.random() < 0.35 ? rnd(-9, 9) : 0;
    } else if (r < 0.85) {
      S.mode = "walk";
      S.targetX = clamp(S.x + rnd(-450, 450), minX() + 40, maxX() - 40);
      S.modeUntil = A.t + 30;
    } else {
      S.mode = "look";
      S.modeUntil = A.t + rnd(2, 4);
      A.tiltTarget = rnd(-12, 12);
    }
  }

  function goToSleep() {
    S.sleeping = true; S.mode = "idle";
    setMood("sleep");
    say(pick(TXT.sleep), 2400, true);
  }
  function wakeUp(talk = true) {
    if (!S.sleeping) return;
    S.sleeping = false;
    setMood("normal");
    bump(-2.5);
    if (talk) say(pick(TXT.wake), 2400, true);
    S.modeUntil = A.t + 2;
  }

  // ---------- Física y lógica por fotograma ----------
  function update(dt) {
    A.t += dt;
    const fy = floorY();

    if (S.dragging) {
      A.kick += dt * 18;
    } else if (S.airborne) {
      S.vy += 2300 * dt;
      S.y += S.vy * dt;
      S.x += S.vx * dt;
      S.vx *= Math.pow(0.4, dt);
      if (S.x < minX()) { S.x = minX(); S.vx = Math.abs(S.vx) * 0.4; }
      if (S.x > maxX()) { S.x = maxX(); S.vx = -Math.abs(S.vx) * 0.4; }
      if (S.y >= fy) {
        S.y = fy;
        const impact = S.vy;
        if (impact > 420) {
          bump(Math.min(9, impact / 260));
          S.vy = -impact * 0.28;
        } else {
          S.vy = 0; S.vx = 0; S.airborne = false;
          bump(Math.min(4, impact / 200));
          S.modeUntil = A.t + rnd(1.5, 3);
          S.mode = "idle";
        }
      }
    } else {
      S.y = fy; // si cambia la barra de tareas, se recoloca
      if (A.t > S.modeUntil) decide();
      if (S.mode === "walk") {
        const d = S.targetX - S.x;
        if (Math.abs(d) < 2) { S.mode = "idle"; S.modeUntil = A.t + rnd(2, 6); A.tiltTarget = 0; }
        else {
          S.facing = Math.sign(d);
          // Primero se gira; solo avanza cuando ya mira hacia donde va
          const ready = clamp((A.turn * S.facing - 0.35) / 0.4, 0, 1);
          S.x += S.facing * 46 * ready * dt;
          A.walkPhase += dt * 8.5 * ready;
          A.tiltTarget = S.facing * 3;
        }
      }
    }

    if (A.moodUntil && A.t > A.moodUntil) setMood(S.sleeping ? "sleep" : "normal");

    // Muelle de aplastar/estirar
    const k = 170, damp = 11;
    A.squashV += (-k * A.squash - damp * A.squashV) * dt;
    A.squash += A.squashV * dt;
    A.appear += (1 - A.appear) * Math.min(1, dt * 7);

    // Inclinación de cabeza
    const tiltGoal = S.sleeping ? 11 : (A.dance && S.mode !== "walk" && !S.airborne) ? Math.sin(A.t * 3.2) * 7 : A.tiltTarget;
    A.tilt += (tiltGoal - A.tilt) * Math.min(1, dt * 5);

    // Mirada: hacia el cursor si está cerca, si no hacia donde camina
    const cx = S.x + W / 2, cy = S.y + H - 95;
    const dx = cursor.x - cx, dy = cursor.y - cy, dist = Math.hypot(dx, dy);
    if (S.dragging) { A.eyeTX = 0; A.eyeTY = -2; }
    else if (dist < 700 && A.t - cursor.lastMove < 4) { A.eyeTX = (dx / dist) * 5; A.eyeTY = (dy / dist) * 3.5; }
    else { A.eyeTX = S.mode === "walk" ? S.facing * 2 : 0; A.eyeTY = 0; }

    // Giro "3D": de frente en reposo, de tres cuartos al caminar, se orienta un poco hacia el cursor
    let turnGoal = 0;
    if (S.mode === "walk" && !S.airborne && !S.dragging) turnGoal = S.facing * 0.85;
    else if (!S.dragging && !S.sleeping && dist < 700 && A.t - cursor.lastMove < 4) turnGoal = clamp(dx / 900, -0.3, 0.3);
    A.turn += (turnGoal - A.turn) * Math.min(1, dt * 5);
    A.eyeX += (A.eyeTX - A.eyeX) * Math.min(1, dt * 10);
    A.eyeY += (A.eyeTY - A.eyeY) * Math.min(1, dt * 10);

    // Parpadeo
    if (A.t > A.nextBlink) { A.blinkEnd = A.t + 0.13; A.nextBlink = A.t + rnd(2, 6); }
    A.blink = A.t < A.blinkEnd ? 0.1 : 1;
  }

  // ---------- Dibujo ----------
  function render() {
    const breathe = Math.sin(A.t * (S.sleeping ? 1.3 : 2.2)) * (S.sleeping ? 0.022 : 0.012);
    const walking = S.mode === "walk" && !S.airborne && !S.dragging;
    const dancing = A.dance && !walking && !S.airborne && !S.dragging && !S.sleeping;
    const bob = walking ? -Math.abs(Math.sin(A.walkPhase)) * 5 : dancing ? -Math.abs(Math.sin(A.t * 6.4)) * 4 : 0;
    const shiver = A.hot && !S.sleeping ? Math.sin(A.t * 55) * 0.9 : 0;
    const sq = clamp(A.squash * 0.06, -0.3, 0.35);
    const sy = (1 - sq + breathe) * A.appear;
    const sx = (1 + sq * 0.75 - breathe * 0.5) * A.appear;

    const t = A.turn, at = Math.abs(t);
    const lean = walking ? t * 3 : 0;
    el.pet.setAttribute("transform", `translate(${shiver.toFixed(2)} ${bob}) rotate(${lean.toFixed(2)} 0 176) translate(0 176) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(0 -176)`);

    // Sombra: se encoge cuando está en el aire
    const lift = clamp((floorY() - S.y) / 300, 0, 1);
    const sh = (1 - lift * 0.7) * A.appear;
    el.shadow.setAttribute("transform", `translate(0 ${floorY() - S.y}) translate(0 176) scale(${sh} ${sh}) translate(0 -176)`);
    el.shadow.style.opacity = String(0.28 * (1 - lift * 0.6));

    // Piernas y brazos
    let lL = 0, lR = 0, aL = 0, aR = 0;
    if (walking) {
      lL = -Math.max(0, Math.sin(A.walkPhase)) * 7;
      lR = -Math.max(0, Math.sin(A.walkPhase + Math.PI)) * 7;
      aL = Math.sin(A.walkPhase + Math.PI) * 18 * at; aR = Math.sin(A.walkPhase) * 18 * at;
    } else if (S.dragging) {
      lL = Math.sin(A.kick) * 8; lR = Math.sin(A.kick + Math.PI) * 8;
      aL = 70 + Math.sin(A.kick * 0.7) * 12; aR = -70 - Math.sin(A.kick * 0.7) * 12;
    } else if (S.airborne) {
      aL = 40; aR = -40;
    } else {
      aL = Math.sin(A.t * 2.2) * 2; aR = -aL;
    }
    // De perfil las piernas se juntan y dan zancadas; el brazo lejano se esconde tras el cuerpo
    const stride = walking ? 10 * t : 0;
    const xL = 10 * at + Math.sin(A.walkPhase) * stride;
    const xR = -10 * at + Math.sin(A.walkPhase + Math.PI) * stride;
    const dxL = t > 0 ? 22 * t : -8 * t;
    const dxR = t > 0 ? -8 * t : 22 * t;
    el.legL.setAttribute("transform", `translate(${xL.toFixed(2)} ${lL})`);
    el.legR.setAttribute("transform", `translate(${xR.toFixed(2)} ${lR})`);
    el.armL.setAttribute("transform", `translate(${dxL.toFixed(2)} 0) rotate(${aL} -50 58)`);
    el.armR.setAttribute("transform", `translate(${dxR.toFixed(2)} 0) rotate(${aR} 50 58)`);
    el.body.setAttribute("transform", `translate(${(-2 * t).toFixed(2)} 0) scale(${(1 - 0.12 * at).toFixed(4)} 1)`);

    // Cabeza
    const headDrop = S.sleeping ? 4 : 0;
    el.head.setAttribute("transform", `translate(${(4 * t).toFixed(2)} ${headDrop}) rotate(${A.tilt.toFixed(2)} 0 40) scale(${(1 - 0.05 * at).toFixed(4)} 1)`);
    el.hl.setAttribute("transform", `translate(${(-14 * t).toFixed(2)} 0)`);
    el.eyeEls.forEach((e, i) => {
      const base = i === 0 ? -32 : 32;
      const far = Math.sign(base) !== Math.sign(t) && at > 0.01;
      const ex = base * (1 - 0.42 * at) + t * 30;
      const esx = far ? 1 - 0.45 * at : 1 - 0.08 * at;
      e.setAttribute("transform", `translate(${ex.toFixed(2)} 20) scale(${esx.toFixed(3)} 1)`);
    });
    el.eyes.setAttribute("transform", `translate(${A.eyeX.toFixed(2)} ${A.eyeY.toFixed(2)})`);
    const eyeScale = S.dragging ? 1.25 : 1;
    for (const o of el.opens) o.setAttribute("transform", `scale(${eyeScale} ${A.blink * eyeScale})`);

    place();
  }

  // ---------- Bucle ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // ---------- Ratón: coger, lanzar, toquecito ----------
  let downX = 0, downY = 0, offX = 0, offY = 0, downT = 0, prevX = 0, prevY = 0, prevT = 0;

  hit.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    hit.setPointerCapture(e.pointerId);
    S.pressed = true;
    downX = e.screenX; downY = e.screenY; downT = performance.now();
    offX = e.screenX - S.x; offY = e.screenY - S.y;
    prevX = S.x; prevY = S.y; prevT = downT;
  });

  hit.addEventListener("pointermove", (e) => {
    if (!S.pressed) return;
    if (!S.dragging && Math.hypot(e.screenX - downX, e.screenY - downY) > 5) {
      S.dragging = true; S.airborne = false; S.mode = "drag";
      hit.classList.add("dragging");
      invoke("set_dragging", { value: true });
      if (S.sleeping) wakeUp(false);
      bump(-3);
    }
    if (S.dragging) {
      const now = performance.now();
      S.x = e.screenX - offX;
      S.y = Math.min(e.screenY - offY, floorY());
      const dtm = Math.max(1, now - prevT) / 1000;
      S.vx = S.vx * 0.5 + ((S.x - prevX) / dtm) * 0.5;
      S.vy = S.vy * 0.5 + ((S.y - prevY) / dtm) * 0.5;
      prevX = S.x; prevY = S.y; prevT = now;
    }
  });

  function release(e) {
    if (!S.pressed) return;
    S.pressed = false;
    if (S.dragging) {
      S.dragging = false;
      hit.classList.remove("dragging");
      invoke("set_dragging", { value: false });
      S.vx = clamp(S.vx, -1800, 1800);
      S.vy = clamp(S.vy, -1800, 1800);
      S.airborne = true;
      setTimeout(() => { if (!S.airborne && Math.random() < 0.5) say(pick(TXT.drop)); }, 900);
    } else if (performance.now() - downT < 350) {
      poke();
    }
  }
  hit.addEventListener("pointerup", release);
  hit.addEventListener("pointercancel", release);

  function poke() {
    if (S.sleeping) { wakeUp(); return; }
    S.airborne = true; S.vy = -480; S.vx = 0;
    bump(-4);
    A.tiltTarget = rnd(-10, 10);
    S.mode = "idle"; S.modeUntil = A.t + 3;
    if (Math.random() < 0.6) say(pick(TXT.poke));
  }

  // ---------- Caricias: pasar el cursor despacio por encima ----------
  function onCursor(p) {
    const moved = Math.hypot(p.x - cursor.lastX, p.y - cursor.lastY);
    if (moved > 0.5) cursor.lastMove = A.t;
    if (p.over && !S.pressed && moved > 0.5 && moved < 22) {
      cursor.pet += moved;
      if (cursor.pet > 260 && A.mood !== "happy") {
        cursor.pet = 0;
        if (S.sleeping) wakeUp(false);
        setMood("happy", 2.5);
        A.tiltTarget = rnd(-12, 12);
        bump(1.5);
        if (Math.random() < 0.5) say(pick(TXT.pet));
      }
    } else {
      cursor.pet *= 0.96;
    }
    cursor.x = p.x; cursor.y = p.y; cursor.over = p.over;
    cursor.lastX = p.x; cursor.lastY = p.y;
  }

  // ---------- API para otros módulos (sentidos, bienestar…) ----------
  window.Eko = {
    S, A, LANG, say, pick, rnd, setMood, bump, goToSleep, wakeUp,
    hop(v = -420) { if (!S.dragging && !S.sleeping) { S.airborne = true; S.vy = v; S.vx = 0; bump(-3); } },
    setDance(v) { A.dance = !!v; },
    setHot(v) { A.hot = !!v; stage.classList.toggle("mood-hot", !!v); },
    native: NATIVE, listen,
  };

  // ---------- Arranque ----------
  async function start() {
    readBounds();
    S.x = world.left + world.width * 0.72;
    S.y = floorY();
    S.modeUntil = 2.5;
    A.appear = 0.01;
    render();

    if (NATIVE) {
      const r = hit.getBoundingClientRect();
      invoke("set_hitbox", { x: r.left, y: r.top, w: r.width, h: r.height });
      listen("cursor", (e) => onCursor(e.payload));
      listen("cmd", (e) => {
        if (e.payload === "sleep") S.sleeping ? wakeUp() : goToSleep();
        if (e.payload === "wake") { lastPosKey = ""; }
        if (e.payload === "updating") say(pick(TXT.updating), 4000, true);
      });
      await win.show();
    } else {
      addEventListener("mousemove", (e) => {
        const r = hit.getBoundingClientRect();
        onCursor({ x: e.clientX, y: e.clientY, over: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom });
      });
      addEventListener("resize", readBounds);
    }

    setInterval(readBounds, 5000);
    bump(-4);
    let greeting = pick(TXT.hello);
    if (NATIVE) {
      try {
        const v = await T.app.getVersion();
        if (localStorage.getItem("eko-version") && localStorage.getItem("eko-version") !== v) greeting = pick(TXT.updated);
        localStorage.setItem("eko-version", v);
      } catch (_) {}
    }
    setTimeout(() => say(greeting, 3000, true), 700);
    requestAnimationFrame(frame);
  }

  start();
})();
