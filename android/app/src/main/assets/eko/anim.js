// Eko en el móvil · cuerpo y animaciones. Copia adaptada del motor del Eko de escritorio (src/main.js y src/tricks.js):
// mismas poses, muelles, parpadeo, caras y gestos. Aquí NO se mueve la ventana: eso lo hace Android (EkoService.kt),
// que avisa del estado (andar, quieto, dormir, cogido, en el aire) y de la velocidad; esta página solo dibuja a Eko.
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const stage = $("#eko"), fxLayer = $("#fx");
  const el = {
    pet: $("#pet"), upper: $("#upper"), head: $("#head"), body: $("#body"), eyes: $("#eyes"), legs: $("#legs"),
    legL: $("#legL"), legR: $("#legR"), armL: $("#armL"), armR: $("#armR"), shadow: $("#shadow"), hl: $("#hl"),
    mouth: $("#mouth"), bridge: $("#bridge"), hat: $("#hat"), bodyHl: $("#bodyHl"), accBack: $("#accBack"), accBody: $("#accBody"),
    accFace: $("#accFace"), snack: $("#snack"), mouthShapes: $("#mouthShapes"), propFront: $("#propFront"), propHand: $("#propHand"), antic: $("#antic"),
    tipHats: [...document.querySelectorAll(".tipflip")], opens: [...document.querySelectorAll(".eye .open")], eyeEls: [...document.querySelectorAll(".eye")],
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const env = (k, edge = 0.18) => clamp(Math.min(k / edge, (1 - k) / edge), 0, 1);
  const sm = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const ease = (k) => k * k * (3 - 2 * k);
  const back = (k) => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  const once = (o, key, f) => { if (!o["_" + key]) { o["_" + key] = 1; f(); } };
  const AND = window.Android || null;

  // ---------- Estado (lo manda Android) ----------
  const S = { st: "idle", facing: 1, vx: 0, vy: 0, sleeping: false, dragging: false, airborne: false, walking: false };
  const A = {
    t: 0, walkPhase: 0, turn: 0, tilt: 0, tiltTarget: 0, eyeX: 0, eyeY: 0, gNod: 0,
    squash: 0, squashV: 0, sqx: 0, sqxV: 0, lag: 0, lagV: 0, hy: 0, hyV: 0, splat: 0,
    legSwing: 0, legSwingV: 0, kick: 0, sit: 0, vx: 0, vy: 0, ax: 0, ay: 0,
    blink: 1, blinkEnd: 0, nextBlink: 2, appear: 1, mood: "normal", dance: false, danceUntil: 0,
    action: null, expr: null, brows: "none", energy: 0.5,
    pose: { aL: 0, aR: 0, P: null }, aLv: 0, aRv: 0, farLeft: null, farRight: null, armsFront: null,
  };
  const bump = (n) => { A.squashV += n; };

  // ---------- Caras ----------
  let faceKey = "";
  function setFace(eyes, brows, mouth = "none") {
    const key = eyes + "|" + brows + "|" + mouth;
    if (key === faceKey) return;
    faceKey = key;
    stage.dataset.eyes = eyes; stage.dataset.brows = brows; stage.dataset.mouth = mouth;
  }
  let blushT = 0;
  function blush(secs = 2.5) { stage.classList.add("blushing"); clearTimeout(blushT); blushT = setTimeout(() => stage.classList.remove("blushing"), secs * 1000); }
  // Expresiones (catálogo del PC: expr.js). Completan la cara durante unos segundos sin pisar los gestos.
  function express(name, secs = 2.6) {
    const ex = window.EkoExpr && EkoExpr.LIST[name];
    if (!ex) return;
    A.expr = { ex, t0: A.t, until: A.t + secs };
    if (ex.fx) fx(ex.fx, ex.fx === "heart" ? 2 : 1);
    if (ex.blush) blush(secs);
  }

  // ---------- Símbolos que salen de la cabeza (corazones, notas, chispas…) ----------
  const FX = { heart: ["♥", "#ef6b86"], bang: ["!", "#f2a33a"], ask: ["?", "#8a7cc9"], note: ["♪", "#5fa8d8"], spark: ["✦", "#f2c14e"], drop: ["…", "#9d8a7f"], "·": ["·", "#b58a5a"] };
  function fx(kind, n = 1) {
    const f = FX[kind]; if (!f || !fxLayer) return;
    for (let i = 0; i < n; i++) setTimeout(() => {
      const s = document.createElement("span");
      s.className = "fx"; s.textContent = f[0]; s.style.color = f[1];
      s.style.left = (50 + rnd(-22, 22)) + "%"; s.style.top = (kind === "·" ? 62 : 30 + rnd(-6, 6)) + "%";
      s.style.setProperty("--dx", rnd(-18, 18).toFixed(0) + "px");
      if (kind === "·") s.style.fontSize = "26px";
      fxLayer.appendChild(s);
      setTimeout(() => s.remove(), 1400);
    }, i * 160);
  }

  // Saltar de verdad: lo hace Android con la ventana (v en px/s del PC ≈ dp/s del móvil)
  function hop(v) { if (AND && AND.hop) AND.hop(Math.abs(v)); else { A.squashV -= 6; } }
  // Que Android no lo ponga a andar en mitad de un gesto
  function hold(secs) { if (AND && AND.hold) AND.hold(Math.round(secs * 1000)); }

  // ---------- Gestos (los mismos que en el PC) ----------
  function waveF(P, k, e) { P.aR = lerp(P.aR, -112 + Math.sin(k * Math.PI * 6) * 24, e); P.front = true; P.tilt += 6 * e; }
  const ACTIONS = {
    wave: { dur: 1.7, eyes: "happy", f: waveF },
    bye: { dur: 1.7, eyes: "happy", f: waveF },
    nod: { dur: 1.1, f(P, k) { P.nod += Math.sin(k * Math.PI * 4) * 7 * (1 - k * 0.35); } },
    shake: { dur: 1.1, f(P, k) { P.hturn += Math.sin(k * Math.PI * 4) * 0.45 * (1 - k * 0.5); } },
    shrug: { dur: 1.2, brows: "up", f(P, k, e) { P.aL = lerp(P.aL, 58, e); P.aR = lerp(P.aR, -58, e); P.nod -= 3 * e; P.tilt += 9 * e; } },
    point: { dur: 1.9, f(P, k, e, o) {
      const d = o.dir || 1;
      P.turn += 0.55 * d * e;
      if (d > 0) P.aR = lerp(P.aR, -98, e); else P.aL = lerp(P.aL, 98, e);
      P.front = true; P.eyeX = 5 * d * e;
    } },
    stretch: { dur: 2.6, f(P, k) {
      const s = Math.sin(clamp(k, 0, 1) * Math.PI);
      P.aL = lerp(P.aL, 122, s); P.aR = lerp(P.aR, -122, s); P.front = s > 0.3;
      P.sy *= 1 + 0.09 * s; P.sx *= 1 - 0.045 * s; P.lift += 5 * s;
      if (s > 0.35) P.eyes = "closed";
      P.mouth = Math.max(P.mouth, clamp((s - 0.55) * 2.4, 0, 1));
    } },
    yawn: { dur: 1.8, f(P, k) {
      const s = Math.sin(k * Math.PI);
      P.mouth = Math.max(P.mouth, s); P.nod -= 4 * s; P.tilt += 7 * s;
      if (s > 0.25) P.eyes = "closed";
    } },
    scratch: { dur: 2.6, eyes: "squint", f(P, k, e) {
      const sc = Math.sin(A.t * 26);
      P.aR = lerp(P.aR, -160 + sc * 10, e); P.front = true;
      P.tilt += 12 * e; P.hturn += 0.15 * e; P.nod += sc * 1.2 * e; P.eyeY = -2 * e;
    } },
    think: { dur: 3.6, f(P, k, e) {
      P.aR = lerp(P.aR, 104 + Math.sin(A.t * 9) * 4, e); P.front = true;
      P.tilt -= 10 * e; P.hturn -= 0.18 * e; P.eyeX = -4 * e; P.eyeY = -4.5 * e;
      if (k > 0.35) P.brows = "up";
    } },
    lookAround: { dur: 3.4, f(P, k, e) { P.hturn += Math.sin(k * Math.PI * 2) * 0.75 * e; P.eyeX = Math.sin(k * Math.PI * 2) * 4 * e; } },
    curious: { dur: 2.8, f(P, k, e, o) {
      const d = o.dir || 1;
      P.turn += 0.35 * d * e; P.hturn += 0.2 * d * e; P.sway += 7 * d * e; P.tilt += 9 * d * e;
      P.eyeScale = 1 + 0.25 * e; P.eyeX = 5 * d * e; P.eyeY = -1.5 * e;
      P.aL = lerp(P.aL, -12, e); P.aR = lerp(P.aR, 12, e);
    } },
    eat: { dur: 3.4, f(P, k, e, o) {
      P.aL = lerp(P.aL, -100, e); P.aR = lerp(P.aR, 100, e); P.front = true;
      const chew = k > 0.2 && k < 0.8;
      P.mouth = chew ? Math.abs(Math.sin(A.t * 11)) * 0.8 : 0;
      P.eyes = k > 0.25 ? "happy" : null; P.nod += chew ? Math.sin(A.t * 11) * 1.5 : 0;
      P.snack = k < 0.8 ? 1 - Math.floor(clamp((k - 0.2) / 0.6, 0, 0.99) * 4) / 4 : 0;
      if (chew && Math.floor(A.t * 3.5) !== o.lastCrumb) { o.lastCrumb = Math.floor(A.t * 3.5); fx("·"); }
      if (k > 0.82 && !o.done) { o.done = true; blush(2); fx("heart", 2); }
    } },
    fists: { dur: 1.8, f(P, k, e) { P.aL = lerp(P.aL, -14, e); P.aR = lerp(P.aR, 14, e); P.eyes = "wink"; P.tilt += 6 * e; } },
    tada: { dur: 1.9, f(P, k, e, o) {
      if (k < 0.18) { const m = k / 0.18; P.sy *= 1 - 0.1 * m; P.sx *= 1 + 0.06 * m; P.nod += 4 * m; P.aR = lerp(P.aR, -18, m); P.aL = lerp(P.aL, 18, m); return; }
      if (!o.up) { o.up = true; hop(-620); fx("spark", 3); }
      const m = clamp((k - 0.18) / 0.12, 0, 1);
      P.aR = lerp(-18, -68, m); P.aL = -P.aR; P.eyes = "happy"; P.brows = "up"; P.mouth = Math.max(P.mouth, 0.35 * m);
      if (k > 0.6) { const w = Math.sin((k - 0.6) * 18) * (1 - k) * 2; P.tilt += 6 + w * 4; P.aR += w * 6; P.aL += w * 6; }
    } },
    hug: { dur: 2.6, eyes: "happy", f(P, k, e) {
      const open = k < 0.4 ? e : 0, close = k >= 0.4 ? e : 0;
      P.aL = lerp(lerp(P.aL, 118, open), -38, close);
      P.aR = lerp(lerp(P.aR, -118, open), 38, close);
      P.front = true; P.sy *= 1 + 0.04 * close; P.tilt += 5 * close;
    } },
    dizzy: { dur: 2.6, eyes: "spiral", f(P, k) { P.tilt += Math.sin(A.t * 7) * 13 * (1 - k); P.sway += Math.sin(A.t * 5) * 4 * (1 - k); } },
    surprise: { dur: 1.4, f(P, k, e) {
      P.eyeScale = 1 + 0.8 * e; P.brows = "up"; P.mouth = Math.max(P.mouth, 0.45 * e);
      P.lift += 9 * Math.sin(clamp(k * 2.2, 0, 1) * Math.PI); P.aL = lerp(P.aL, 38, e); P.aR = lerp(P.aR, -38, e);
    } },
    sad: { dur: 2.2, f(P, k, e) { P.brows = "sad"; P.nod += 4 * e; P.eyeY = 2 * e; P.sy *= 1 - 0.03 * e; } },
    angry: { dur: 1.6, f(P, k, e) { P.brows = "angry"; P.sx *= 1 + 0.03 * e; P.aL = lerp(P.aL, 30, e); P.aR = lerp(P.aR, -30, e); } },
    wink: { dur: 1.2, eyes: "wink", f(P, k, e) { P.tilt += 8 * e; } },
    // Voltereta hacia atrás (tricks.js): se agacha, salta, gira encogido y aterriza con los brazos arriba
    flip: { dur: 2.4, f(P, k, e, o) {
      const d = o.d || (o.d = -(S.facing || 1));
      P.front = true;
      if (k < 0.2) {
        const m = ease(sm(0, 0.2, k));
        P.sy *= 1 - 0.17 * m; P.sx *= 1 + 0.1 * m; P.nod += 7 * m;
        P.aL = lerp(P.aL, -28, m); P.aR = lerp(P.aR, 28, m);
        P.eyes = "squint"; P.brows = "angry";
        return;
      }
      once(o, "jump", () => hop(-800));
      const air = sm(0.21, 0.56, k), tuck = Math.sin(Math.PI * air);
      const ang = d * 360 * ease(sm(0.23, 0.53, k));
      P.spin += ang;
      { const c = Math.cos(ang * Math.PI / 180), sn = Math.abs(Math.sin(ang * Math.PI / 180));
        const low = Math.max(80 + 96 * c, 80 - 184 * c) + 100 * 0.62 * sn;
        P.lift += Math.max(0, low - 176) + 16 * sn; }
      if (air > 0 && air < 1) {
        P.sy *= 1 - 0.13 * tuck; P.sx *= 1 + 0.03 * tuck;
        P.aL = lerp(70, -75, tuck); P.aR = -P.aL;
        P.eyes = tuck > 0.35 ? "closed" : null;
        P.legL = -10 * tuck; P.legR = -10 * tuck;
      }
      if (k >= 0.56) {
        const m = back(sm(0.56, 0.7, k));
        once(o, "land", () => fx("spark", 4));
        const w = Math.sin((k - 0.56) * 26) * (1 - sm(0.56, 1, k)) * 6;
        P.aL = lerp(P.aL, 150, m) + w; P.aR = lerp(P.aR, -150, m) + w;
        P.eyes = "happy"; P.brows = "up"; P.mouth = Math.max(P.mouth, 0.4 * m); P.tilt += w;
      }
    } },
    // Pirueta (tricks.js): de puntillas, brazos abiertos que se cierran al coger velocidad y pose final con guiño
    pirouette: { dur: 2.9, f(P, k, e, o) {
      P.front = true;
      const pre = ease(sm(0, 0.14, k)), run = sm(0.14, 0.8, k);
      const spd = Math.sin(Math.PI * run);
      const phi = Math.PI * 2 * 3.25 * (run < 0.5 ? 2 * run * run : 1 - Math.pow(-2 * run + 2, 2) / 2);
      P.lift += 6 * pre * (1 - sm(0.8, 0.88, k));
      if (k < 0.8) {
        P.turn += Math.sin(phi) * (run > 0 ? 1 : 0);
        P.hturn += Math.sin(phi + 0.5) * 0.3 * spd;
        P.sx *= 1 - 0.2 * Math.abs(Math.sin(phi)) * spd;
        const open = lerp(95, 18, spd);
        P.aL = lerp(P.aL, open, pre); P.aR = lerp(P.aR, -open, pre);
        P.eyes = spd > 0.55 ? "closed" : "happy";
        P.sway += Math.sin(phi * 0.5) * 2 * spd;
        if (spd > 0.6 && Math.floor(phi / Math.PI) !== o.half) { o.half = Math.floor(phi / Math.PI); fx("spark"); }
      } else {
        const m = back(sm(0.8, 0.92, k));
        const over = Math.sin((k - 0.8) * 30) * (1 - sm(0.8, 1, k)) * 0.35;
        P.turn += over;
        P.aR = lerp(-20, -125, m); P.aL = lerp(20, -30, m);
        P.tilt += 9 * m; P.eyes = k > 0.84 ? "wink" : "happy"; P.mouth = Math.max(P.mouth, 0.3 * m);
        once(o, "end", () => fx("note", 2));
      }
    } },
  };

  function act(name, opts = {}) {
    const a = ACTIONS[name];
    if (!a || S.dragging) return false;
    A.action = { name, t0: A.t, dur: opts.dur || a.dur, opts };
    hold(A.action.dur + 0.4);
    if (name === "scratch") setTimeout(() => fx("ask"), 500);
    if (name === "dizzy") fx("spark", 2);
    if (name === "hug") setTimeout(() => { fx("heart", 3); blush(2.5); }, 900);
    if (name === "surprise") fx("bang");
    return true;
  }

  // ---------- Baile (el mismo del PC: 4 frases de 8 tiempos) ----------
  function dancePose(P) {
    const b = A.t * 1.9, bi = Math.floor(b), ph = b - bi;
    const phrase = Math.floor(bi / 8) % 4, pb = bi % 8;
    const beat = Math.sin(ph * Math.PI);
    const side = bi % 2 ? 1 : -1;
    P.bob = beat * 5;
    if (phrase === 0) {
      P.sway += side * 7 * beat; P.shift += side * 7 * beat; P.tilt += side * 8 * beat;
      P.aL = 45 + side * 28 * beat; P.aR = -45 + side * 28 * beat;
      if (side > 0) P.legR = -6 * beat; else P.legL = -6 * beat;
    } else if (phrase === 1) {
      P.aL = 112 + beat * 18; P.aR = -112 - beat * 18; P.front = true;
      P.eyes = "happy"; P.sy *= 1 + 0.05 * beat; P.legL = -4 * beat; P.legR = -4 * beat;
    } else if (phrase === 2) {
      const sw = Math.sin(b * Math.PI / 2);
      P.turn += sw * 0.6; P.shift += sw * 10; P.hturn += sw * 0.15;
      P.aL = 20 + Math.max(0, sw) * 70; P.aR = -20 - Math.max(0, -sw) * 70;
      if (sw > 0) P.legL = -6 * beat; else P.legR = -6 * beat;
    } else if (pb < 4) {
      P.turn += Math.sin((b % 4) / 4 * Math.PI * 2);
      P.aL = 60; P.aR = -60; P.eyes = "happy";
    } else if (pb < 6) {
      P.lift += beat * 14; P.aL = 120; P.aR = -120; P.front = true; P.eyes = "happy";
    } else {
      P.aR = -112; P.aL = 22; P.front = true; P.eyes = "wink"; P.tilt += 10;
    }
  }

  // ---------- Cada fotograma ----------
  function update(dt) {
    A.t += dt;
    const walking = S.walking, dragging = S.dragging, airborne = S.airborne;
    if (walking) {
      const ready = clamp((A.turn * S.facing - 0.35) / 0.4, 0, 1);
      A.walkPhase += dt * 13 * ready;
    }
    if (dragging) A.kick += dt * 18;
    if (A.action && A.t - A.action.t0 > A.action.dur) A.action = null;

    A.squashV += (-170 * A.squash - 10 * A.squashV) * dt;
    A.squash += A.squashV * dt;
    const velX = S.walking ? S.facing * 72 : S.vx, velY = S.vy;
    const pvx = A.vx, pvy = A.vy;
    A.vx += (velX - A.vx) * Math.min(1, dt * 18);
    A.vy += (velY - A.vy) * Math.min(1, dt * 18);
    A.ax += (((A.vx - pvx) / Math.max(dt, 1e-3)) - A.ax) * Math.min(1, dt * 10);
    A.ay += (((A.vy - pvy) / Math.max(dt, 1e-3)) - A.ay) * Math.min(1, dt * 10);
    A.lagV += ((clamp(-velX * 0.012, -8, 8) - A.lag) * 120 - A.lagV * 9) * dt;
    A.lag += A.lagV * dt;
    A.hyV += (-A.hy * 220 - A.hyV * 11 + clamp(-A.ay * 0.004, -60, 60)) * dt;
    A.hy = clamp(A.hy + A.hyV * dt, -10, 12);
    A.sqxV += (-A.sqx * 170 - A.sqxV * 10) * dt;
    A.sqx += A.sqxV * dt;
    A.splat *= Math.pow(0.02, dt);
    const legTarget = airborne || dragging ? clamp(-A.vx * 0.02, -35, 35) : 0;
    A.legSwingV += ((legTarget - A.legSwing) * 60 - A.legSwingV * 6) * dt;
    A.legSwing += A.legSwingV * dt;

    const sitGoal = S.sleeping && !airborne && !dragging ? 1 : 0;
    A.sit += (sitGoal - A.sit) * Math.min(1, dt * 5);
    const dancing = (A.dance || A.t < A.danceUntil) && !walking && !airborne && !dragging && !S.sleeping;
    const tiltGoal = S.sleeping ? 11 : dancing ? Math.sin(A.t * 3.2) * 7 : A.tiltTarget;
    A.tilt += (tiltGoal - A.tilt) * Math.min(1, dt * 5);
    const etx = dragging ? 0 : walking ? S.facing * 2 : 0, ety = dragging ? -2 : 0;
    A.eyeX += (etx - A.eyeX) * Math.min(1, dt * 10);
    A.eyeY += (ety - A.eyeY) * Math.min(1, dt * 10);
    const turnGoal = walking ? S.facing * 0.85 : 0;
    A.turn += (turnGoal - A.turn) * Math.min(1, dt * 5);
    if (A.t > A.nextBlink) { A.blinkEnd = A.t + 0.13; A.nextBlink = A.t + (Math.random() < 0.2 ? 0.25 : rnd(2, 6)); }
    A.blink = A.t < A.blinkEnd ? 0.1 : 1;
    if (dancing) { const q = Math.floor(A.t * 1.9 / 4); if (q !== A.lastNote) { A.lastNote = q; fx("note"); } }
    idleLife();
    computePose(dt, dancing);
  }

  function computePose(dt, dancing) {
    const walking = S.walking;
    const P = {
      aL: 0, aR: 0, front: false, nod: 0, tilt: 0, turn: 0, hturn: 0, sway: 0, shift: 0, sx: 1, sy: 1, lift: 0,
      legL: 0, legR: 0, bob: 0, spin: 0, snack: 0, mouth: 0, mouthShape: null, eyeX: null, eyeY: null,
      eyeScale: S.dragging ? 1.25 : 1, eyes: null, brows: "none",
    };
    if (walking) {
      const tw = clamp(A.turn, -1, 1);
      P.aL = -Math.sin(A.walkPhase) * 22 * tw;
      P.aR = -Math.sin(A.walkPhase + Math.PI) * 22 * tw;
    } else if (S.dragging) {
      P.aL = 70 + Math.sin(A.kick * 0.7) * 12; P.aR = -70 - Math.sin(A.kick * 0.7) * 12;
      const sp = Math.min(1, Math.hypot(A.vx, A.vy) / 1500);
      P.sy = 1.08 + 0.08 * sp; P.sx = 0.94 - 0.05 * sp; P.sway = clamp(S.vx * 0.012, -22, 22);
    } else if (S.airborne) {
      const fall = clamp(A.vy / 900, -1, 1);
      P.aL = 30 + 45 * Math.max(0, fall); P.aR = -P.aL;
    } else if (dancing) dancePose(P);
    else { P.aL = Math.sin(A.t * 2.2) * 2; P.aR = -P.aL; }
    // saltitos de energía en el sitio
    if (A.energy > 0.3 && S.st === "idle" && !A.action && Math.sin(A.t * 0.9) > 0.8) P.lift += Math.max(0, Math.sin(A.t * 9)) * 4 * A.energy;
    P.nod += A.gNod;
    if (A.woozyUntil > A.t) {
      const k = clamp((A.woozyUntil - A.t) / 3, 0, 1);
      P.sway += Math.sin(A.t * 2.6) * 8 * k; P.tilt += Math.sin(A.t * 3.4 + 1) * 10 * k; P.shift += Math.sin(A.t * 1.9) * 4 * k;
      if (!P.eyes && k > 0.45) P.eyes = "spiral";
    }
    const a = A.action;
    if (a) {
      const def = ACTIONS[a.name];
      const k = clamp((A.t - a.t0) / a.dur, 0, 1);
      def.f(P, k, env(k), a.opts);
      if (def.eyes && !P.eyes) P.eyes = def.eyes;
      if (def.brows && P.brows === "none") P.brows = def.brows;
    }
    if (P.brows === "none" && A.brows !== "none") P.brows = A.brows;
    if (A.expr && A.t < A.expr.until && !S.sleeping) {
      const x = A.expr.ex, k = clamp(Math.min(A.t - A.expr.t0, A.expr.until - A.t) / 0.25, 0, 1);
      if (!P.eyes && x.eyes !== "open") P.eyes = x.eyes;
      if (P.brows === "none" && x.brows !== "none") P.brows = x.brows;
      if (!P.mouthShape && x.mouth !== "o" && x.mouth !== "none") P.mouthShape = x.mouth;
      if (x.mouth === "o") P.mouth = Math.max(P.mouth, (x.o || 0.3) * k);
      if (x.scale) P.eyeScale *= 1 + (x.scale - 1) * k;
      if (x.eyeX && P.eyeX == null) P.eyeX = x.eyeX * S.facing * k;
      if (x.eyeY && P.eyeY == null) P.eyeY = x.eyeY * k;
      if (x.tilt) P.tilt += x.tilt * k;
      if (x.nod) P.nod += x.nod * k;
      if (x.shiver) P.shift += Math.sin(A.t * 42) * 1.3 * k;
    } else if (A.expr) A.expr = null;
    let eyes = P.eyes;
    if (!eyes) eyes = S.sleeping ? "closed" : A.t < (A.happyUntil || 0) ? "happy" : "open";
    setFace(eyes, P.brows, P.mouth > 0.12 ? "none" : (P.mouthShape || "none"));
    const tL = P.aL + clamp(A.ax * 0.006, -28, 28), tR = P.aR + clamp(A.ax * 0.006, -28, 28);
    A.aLv += ((tL - A.pose.aL) * 260 - A.aLv * 20) * dt;
    A.aRv += ((tR - A.pose.aR) * 260 - A.aRv * 20) * dt;
    A.pose.aL += A.aLv * dt; A.pose.aR += A.aRv * dt;
    A.pose.P = P;
  }

  function render() {
    const P = A.pose.P; if (!P) return;
    const walking = S.walking;
    const dancing = (A.dance || A.t < A.danceUntil) && !walking && !S.airborne && !S.dragging && !S.sleeping;
    const breathe = Math.sin(A.t * (S.sleeping ? 1.3 : 2.2)) * (S.sleeping ? 0.022 : 0.012);
    const contact = walking ? Math.abs(Math.sin(A.walkPhase)) : 0;
    const bob = walking ? -(1 - contact) * 5 : dancing ? -P.bob : 0;
    const sq = clamp(A.squash * 0.075, -0.32, 0.42);
    const fallStretch = S.airborne ? clamp(Math.abs(A.vy) / 3200, 0, 0.16) : 0;
    let sy = (1 - sq + breathe - contact * 0.04 + fallStretch) * P.sy;
    let sx = Math.pow(Math.max(0.5, sy / P.sy), -0.65) * P.sx;
    const sqx = clamp(A.sqx * 0.06, -0.3, 0.3);
    sx *= 1 - sqx; sy *= 1 + sqx * 0.6;
    const t = clamp(A.turn + P.turn, -1, 1), at = Math.abs(t);
    const th = clamp(t + P.hturn, -1, 1), ath = Math.abs(th);
    const lean = (walking ? t * 5 : 0) + P.sway;
    const leanLift = S.dragging ? 0 : 84 * Math.abs(Math.sin(lean * Math.PI / 180));
    el.pet.setAttribute("transform", `translate(${P.shift.toFixed(2)} ${(bob - P.lift - leanLift).toFixed(2)}) rotate(${P.spin.toFixed(1)} 0 80) rotate(${lean.toFixed(2)} 0 176) translate(0 176) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(0 -176)`);
    // la sombra se queda en el suelo: en el aire o cogido, se esconde
    el.shadow.style.opacity = S.airborne || S.dragging ? "0" : "0.28";

    let lL = 0, lR = 0, rL = 0, rR = 0;
    if (walking) {
      const phL = A.walkPhase, phR = A.walkPhase + Math.PI;
      rL = -Math.sin(phL) * 24 * t; rR = -Math.sin(phR) * 24 * t;
      lL = -Math.max(0, Math.cos(phL)) * 7; lR = -Math.max(0, Math.cos(phR)) * 7;
    } else if (S.dragging) { lL = Math.sin(A.kick) * 8; lR = Math.sin(A.kick + Math.PI) * 8; rL = rR = A.legSwing; }
    else { lL = P.legL; lR = P.legR; rL = rR = A.legSwing; }
    const spread = A.splat * 9;
    const xL = 10 * at - spread, xR = -10 * at + spread;
    const sitDrop = 29 * A.sit;
    el.legs.setAttribute("transform", `translate(0 176) scale(1 ${(1 - 0.5 * A.sit).toFixed(3)}) translate(0 -176)`);
    el.legL.setAttribute("transform", `translate(${xL.toFixed(2)} ${lL.toFixed(2)}) rotate(${rL.toFixed(2)} -21 122)`);
    el.legR.setAttribute("transform", `translate(${xR.toFixed(2)} ${lR.toFixed(2)}) rotate(${rR.toFixed(2)} 21 122)`);
    const farLeft = t < -0.15, farRight = t > 0.15;
    if (farLeft !== A.farLeft || farRight !== A.farRight) {
      A.farLeft = farLeft; A.farRight = farRight;
      if (farLeft) el.legs.appendChild(el.legR); else el.legs.appendChild(el.legL);
    }
    el.upper.setAttribute("transform", `translate(0 ${sitDrop.toFixed(2)})`);
    const armKey = P.front ? "front" : farLeft ? "R" : farRight ? "L" : "back";
    if (armKey !== A.armsFront) {
      A.armsFront = armKey;
      el.pet.insertBefore(el.armL, el.upper); el.pet.insertBefore(el.armR, el.upper);
      if (armKey === "front") { el.pet.appendChild(el.armL); el.pet.appendChild(el.armR); }
      else if (armKey === "R") el.upper.after(el.armR);
      else if (armKey === "L") el.upper.after(el.armL);
      if (el.propFront) el.pet.appendChild(el.propFront);
      if (el.propHand) el.pet.appendChild(el.propHand);
      if (el.antic) el.pet.appendChild(el.antic);
    }
    const dxL = t > 0 ? 16 * t : -22 * t, dxR = t > 0 ? -22 * t : 16 * t;
    el.armL.setAttribute("transform", `translate(${dxL.toFixed(2)} ${sitDrop.toFixed(2)}) rotate(${A.pose.aL.toFixed(2)} -50 58)`);
    el.armR.setAttribute("transform", `translate(${dxR.toFixed(2)} ${sitDrop.toFixed(2)}) rotate(${A.pose.aR.toFixed(2)} 50 58)`);
    const bodyT = `translate(${(3 * t).toFixed(2)} 0) scale(${(1 - 0.12 * at).toFixed(4)} 1)`;
    el.body.setAttribute("transform", bodyT);
    if (el.bodyHl) el.bodyHl.setAttribute("transform", `translate(${(4 * t).toFixed(2)} 0)`);
    if (el.accBody) el.accBody.setAttribute("transform", bodyT);
    const headDrop = (S.sleeping ? 4 : 0) + P.nod + A.hy;
    if (el.accBack) el.accBack.setAttribute("transform", `translate(${(2 * th + A.lag * 0.6).toFixed(2)} ${(sitDrop + Math.min(0, headDrop) * 0.3).toFixed(2)}) scale(${(1 - 0.1 * at).toFixed(4)} 1)`);
    el.head.setAttribute("transform", `translate(${(4 * th + A.lag).toFixed(2)} ${headDrop.toFixed(2)}) rotate(${(A.tilt + P.tilt).toFixed(2)} 0 40) scale(${(1 - 0.05 * ath).toFixed(4)} 1)`);
    if (el.hl) el.hl.setAttribute("transform", `translate(${(5 * th).toFixed(2)} ${(P.nod * 0.5).toFixed(2)})`);
    if (el.hat) el.hat.setAttribute("transform", `translate(${(10 * th).toFixed(2)} 0)`);
    A.capS = A.capS ?? 1;
    A.capS += ((S.facing > 0 ? -1 : 1) - A.capS) * 0.16;
    const capT = `scale(${(Math.abs(A.capS) < 0.04 ? 0.04 * Math.sign(A.capS || 1) : A.capS).toFixed(3)} 1)`;
    for (const g of el.tipHats) g.setAttribute("transform", capT);
    const ex = P.eyeX != null ? P.eyeX : A.eyeX;
    const ey = (P.eyeY != null ? P.eyeY : A.eyeY) + P.nod * 0.9;
    el.eyes.setAttribute("transform", `translate(${ex.toFixed(2)} ${ey.toFixed(2)})`);
    if (window.ekoLook) ekoLook.pose(A.t, (A.lag || 0) * 0.4);
    const pos = [];
    el.eyeEls.forEach((e, i) => {
      const base = i === 0 ? -32 : 32;
      const far = Math.sign(base) !== Math.sign(th) && ath > 0.01;
      const x = base * (1 - 0.3 * ath) + th * 24;
      const esx = far ? 1 - 0.3 * ath : 1 - 0.04 * ath;
      pos.push([x, esx]);
      e.setAttribute("transform", `translate(${x.toFixed(2)} 20) scale(${esx.toFixed(3)} 1)`);
    });
    if (el.bridge && pos.length === 2) { el.bridge.setAttribute("x1", (pos[0][0] + 12 * pos[0][1]).toFixed(2)); el.bridge.setAttribute("x2", (pos[1][0] - 12 * pos[1][1]).toFixed(2)); }
    const es = P.eyeScale;
    for (const o of el.opens) o.setAttribute("transform", `scale(${es} ${A.blink * es})`);
    el.mouth.setAttribute("cx", (th * 30 + ex * 0.6).toFixed(2));
    el.mouth.setAttribute("cy", (40 + ey * 0.6).toFixed(2));
    if (el.mouthShapes) el.mouthShapes.setAttribute("transform", `translate(${(th * 30 + ex * 0.6).toFixed(2)} ${(40 + ey * 0.6).toFixed(2)}) scale(${(1 - 0.3 * ath).toFixed(3)} 1)`);
    if (el.accFace) el.accFace.setAttribute("transform", `translate(${(th * 30 + ex * 0.6).toFixed(2)} ${(ey * 0.6).toFixed(2)}) scale(${(1 - 0.3 * ath).toFixed(3)} 1)`);
    el.mouth.setAttribute("ry", (P.mouth * 10).toFixed(2));
    el.mouth.setAttribute("rx", (5.5 + P.mouth * 3).toFixed(2));
    if (P.snack > 0) { el.snack.style.display = "inline"; el.snack.setAttribute("transform", `translate(${(th * 30).toFixed(2)} 54) scale(${(P.snack * 1.7).toFixed(2)})`); }
    else el.snack.style.display = "none";
  }

  // ---------- Vida propia estando quieto: de vez en cuando hace un gesto suyo (como en el PC) ----------
  let idleSince = 0, nextIdle = rnd(6, 12);
  function idleLife() {
    if (S.st !== "idle" || A.action || A.dance || A.t < A.danceUntil) { idleSince = A.t; return; }
    if (A.t - idleSince < nextIdle) return;
    idleSince = A.t; nextIdle = rnd(7, 16);
    const h = new Date().getHours(), late = h >= 23 || h < 7;
    const pool = late ? ["yawn", "yawn", "stretch", "lookAround", "scratch"] : ["lookAround", "lookAround", "stretch", "scratch", "think", "curious", "nod", "wink", "yawn"];
    const n = pool[Math.floor(Math.random() * pool.length)];
    act(n, n === "curious" ? { dir: Math.random() < 0.5 ? -1 : 1 } : {});
  }

  // ---------- Ahorro: fotogramas según lo que haga y ventana grande solo cuando hace falta ----------
  // Siempre a la velocidad de la pantalla (sin límite de fotogramas)
  let last = performance.now(), lowPower = false, big = false, bigUntil = 0, hitT = 0, hitKey = "";
  function busy() { return !!A.action || S.walking || S.dragging || S.airborne || A.dance || A.t < A.danceUntil || Math.abs(A.squashV) > 2; }
  function wantBig() { return !!A.action || S.dragging || S.airborne || A.dance || A.t < A.danceUntil; }
  function frame(now) {
    requestAnimationFrame(frame);
    // Sin límite de fotogramas: se dibuja a la velocidad de la pantalla
    const dt = Math.min(0.07, (now - last) / 1000); last = now;
    update(dt); render();
    // Zona tocable = solo su cuerpo (Android deja pasar los toques del resto de la ventana)
    if (AND && AND.hit && A.t > hitT) {
      hitT = A.t + 0.12;
      const r = el.pet.getBoundingClientRect(), p = 8;
      const k = [r.left - p, r.top - p, r.right + p, r.bottom + p].map(Math.round);
      const key = k.join(",");
      if (key !== hitKey) { hitKey = key; AND.hit(k[0], k[1], k[2], k[3]); }
    }
    const w = wantBig();
    if (w) bigUntil = A.t + 0.8;
    if (w !== big && (w || A.t > bigUntil)) { big = w; if (AND && AND.big) AND.big(big); }
  }
  requestAnimationFrame(frame);

  // ---------- Lo que pide Android (EkoService.kt) ----------
  const TRICKS = ["pirouette", "flip", "tada"];
  window.eko = {
    set(st, dir) {
      const was = S.st;
      S.st = st; if (dir) S.facing = dir;
      S.walking = st === "walk"; S.dragging = st === "drag"; S.airborne = st === "fall"; S.sleeping = st === "sleep";
      stage.dataset.state = st;
      if (st === "drag") { A.action = null; bump(-3); fx("bang"); }
      if (st !== "drag" && st !== "fall") { S.vx = 0; S.vy = 0; }
      if (st === "sleep" && was !== "sleep") { A.action = null; A.dance = false; A.danceUntil = 0; }
    },
    v(vx, vy) { S.vx = vx; S.vy = vy; },
    tap() { A.happyUntil = A.t + 1.2; bump(-4); A.sqxV += 3; if (Math.random() < 0.35) act(["wave", "wink", "nod", "surprise"][Math.floor(Math.random() * 4)]); else fx("heart"); },
    happy() { A.happyUntil = A.t + 1.5; },
    land() { const v = Math.max(400, Math.abs(S.vy || 900)); A.squashV += clamp(v / 90, 6, 20); A.splat = Math.min(1, v / 1400); A.happyUntil = A.t + 0.8; },
    wake() { S.sleeping = false; S.st = "idle"; stage.dataset.state = "idle"; act("stretch"); },
    brows(b) { A.brows = b || "none"; },
    dance(secs) { A.danceUntil = A.t + (secs || 6); hold(secs || 6); },
    setDance(v) { A.dance = !!v; },
    dizzy() { act("dizzy", { dur: 2.8 }); A.woozyUntil = A.t + 4.5; },
    eat() { act("eat"); },
    spin() { act(TRICKS[Math.floor(Math.random() * TRICKS.length)]); },
    lowPower(v) { lowPower = !!v; },
    act, fx, blush, express,
    talk(ev, chance, arg) { if (window.ekoTalk) ekoTalk.talk(ev, chance, arg); },
    chatter() { if (window.ekoTalk) ekoTalk.chatter(); },
  };
})();
