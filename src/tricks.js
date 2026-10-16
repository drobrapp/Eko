// Eko · trucos (fase 3): voltereta, pirueta, equilibrio, malabares, magia y barriga llena.
// Animación por fases sobre el muñeco de verdad (brazos con muelle, patitas, giro del cuerpo, 3/4, cara)
// y objetos dibujados en SVG que siguen a las manos.
window.EkoTricks = (() => {
  "use strict";
  const E = window.Eko;
  if (!E || !E.ACTIONS) return null;
  const { A, S } = E;
  const NS = "http://www.w3.org/2000/svg";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = (a, b, k) => clamp((k - a) / (b - a), 0, 1);            // tramo 0..1 dentro de [a, b]
  const ease = (x) => x * x * (3 - 2 * x);
  const easeOut = (x) => 1 - (1 - x) * (1 - x);
  const back = (x) => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };   // con rebote
  const once = (o, key, fn) => { if (!o[key]) { o[key] = 1; fn(); } };
  const V = E.Voice;
  const tone = (...a) => { try { V.tone && V.tone(...a); } catch (_) {} };
  const art = (id) => { const n = document.getElementById(id); return n ? n.getAttribute("href") : ""; };

  // ---------- Capas de dibujo ----------
  // «hand»: dentro del muñeco (se mueve con él) · «ground»: en el suelo, fuera del muñeco (no se balancea)
  const svgRoot = E.el.pet.ownerSVGElement;
  const layer = document.createElementNS(NS, "g"); layer.id = "trickLayer";
  const ground = document.createElementNS(NS, "g"); ground.id = "trickGround";
  const behind = document.createElementNS(NS, "g"); behind.id = "trickBehind";
  E.el.pet.appendChild(layer); svgRoot.appendChild(ground); svgRoot.insertBefore(behind, E.el.pet);
  function img(id, parent, w, h) {
    const e = document.createElementNS(NS, "image");
    e.setAttribute("href", art(id)); e.setAttribute("width", w); e.setAttribute("height", h);
    e.setAttribute("x", -w / 2); e.setAttribute("y", -h / 2); e.setAttribute("preserveAspectRatio", "xMidYMid meet");
    parent.appendChild(e);
    return e;
  }
  const place = (e, x, y, rot = 0, sc = 1, op = 1) => {
    e.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${sc.toFixed(3)})`);
    e.setAttribute("opacity", op.toFixed(2));
  };
  const clear = () => { layer.innerHTML = ""; ground.innerHTML = ""; behind.innerHTML = ""; parts.length = 0; };
  // Punta de cada mano en coordenadas del muñeco (misma cuenta que usa main.js para lo que lleva en la mano)
  function hands() {
    const P = A.pose.P || {};
    const t = clamp((A.turn || 0) + (P.turn || 0), -1, 1);
    const dxL = t > 0 ? 16 * t : -22 * t, dxR = t > 0 ? -22 * t : 16 * t;
    const sit = 29 * (A.sit || 0);
    const rl = A.pose.aL * Math.PI / 180, rr = A.pose.aR * Math.PI / 180;
    return {
      L: { x: dxL - 50 - 15 * Math.cos(rl) - 60 * Math.sin(rl), y: sit + 58 - 15 * Math.sin(rl) + 60 * Math.cos(rl), a: A.pose.aL },
      R: { x: dxR + 50 + 15 * Math.cos(rr) - 60 * Math.sin(rr), y: sit + 58 + 15 * Math.sin(rr) + 60 * Math.cos(rr), a: A.pose.aR },
    };
  }
  // Partículas sencillas (chispas, humo) que viven en una capa y se apagan solas
  const parts = [];
  function particle(id, parent, x, y, o = {}) {
    const w = o.w || 16, e = img(id, parent, w, w);
    parts.push({ e, x, y, vx: o.vx || 0, vy: o.vy || -30, g: o.g || 0, life: o.life || 0.9, t: 0, r: o.r || 0, vr: o.vr || 0, s0: o.s0 || 0.4, s1: o.s1 || 1 });
  }
  E.HOOKS.draw.push(() => {
    if (layer.nextSibling) E.el.pet.appendChild(layer);           // siempre por delante de los brazos
    const dt = 1 / 60;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) { p.e.remove(); parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      place(p.e, p.x, p.y, p.r, lerp(p.s0, p.s1, easeOut(Math.min(1, k * 2))), k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4);
    }
    if (cur && cur.draw) cur.draw();
  });
  let cur = null;                      // truco con dibujo propio en marcha
  const sparkle = (x, y, n = 3, parent = layer) => { for (let i = 0; i < n; i++) particle("artSpark", parent, x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 16, { w: 12 + Math.random() * 10, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 60, life: 0.7 + Math.random() * 0.4, vr: (Math.random() - 0.5) * 300 }); };
  const smoke = (x, y, n = 6, parent = ground, size = 46) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; particle("artPuff", parent, x + Math.cos(a) * 10, y + Math.sin(a) * 6, { w: size * (0.7 + Math.random() * 0.5), vx: Math.cos(a) * 70, vy: Math.sin(a) * 40 - 30, life: 0.75, s0: 0.5, s1: 1.25, vr: (Math.random() - 0.5) * 60 }); } };

  // ================================================================
  // 1) Voltereta hacia atrás: se agacha, salta, gira encogido y aterriza con los brazos arriba
  E.ACTIONS.flip = { dur: 2.4, f(P, k, e, o) {
    const d = o.d || (o.d = -(S.facing || 1));
    P.front = true;
    if (k < 0.2) {                                                   // coge impulso
      const m = ease(sm(0, 0.2, k));
      P.sy *= 1 - 0.17 * m; P.sx *= 1 + 0.1 * m; P.nod += 7 * m;
      P.aL = lerp(P.aL, -28, m); P.aR = lerp(P.aR, 28, m);
      P.eyes = "squint"; P.brows = "angry";
      return;
    }
    once(o, "jump", () => { E.hop(-800, 0, 0.01); tone("sine", 380, 900, 0.32, 0.04); });
    const air = sm(0.21, 0.56, k), tuck = Math.sin(Math.PI * air);
    P.spin += d * 360 * ease(sm(0.23, 0.53, k));
    if (air > 0 && air < 1) {
      P.sy *= 1 - 0.13 * tuck; P.sx *= 1 + 0.03 * tuck;
      P.aL = lerp(70, -75, tuck); P.aR = -P.aL;                    // brazos pegados en lo alto del giro
      P.eyes = tuck > 0.35 ? "closed" : null;
      P.legL = -10 * tuck; P.legR = -10 * tuck;
    }
    if (k >= 0.56) {                                                 // aterriza y presume
      const m = back(sm(0.56, 0.7, k));
      once(o, "land", () => { sparkle(0, -60, 5); V.chirp && V.chirp(); });
      const w = Math.sin((k - 0.56) * 26) * (1 - sm(0.56, 1, k)) * 6;
      P.aL = lerp(P.aL, 150, m) + w; P.aR = lerp(P.aR, -150, m) + w;
      P.eyes = "happy"; P.brows = "up"; P.mouth = Math.max(P.mouth, 0.4 * m); P.tilt += w;
    }
  } };

  // 2) Pirueta: de puntillas, brazos abiertos que se cierran al coger velocidad y pose final con guiño
  E.ACTIONS.pirouette = { dur: 2.9, start(o) {
    clear();
    o.orb = [0, 1, 2, 3].map(() => img("artSpark", behind, 16, 16));
    cur = { draw() {
      if (!A.action || A.action.name !== "pirouette") { cur = null; clear(); return; }
      const spd = o.spd || 0;
      o.orb.forEach((e, i) => {
        const a = (o.phi || 0) * 1.15 + i * Math.PI / 2, z = Math.cos(a);
        const par = z > 0 ? layer : behind; if (e.parentNode !== par) par.appendChild(e);
        place(e, Math.sin(a) * 96, 118 + i * 8 - z * 10, a * 60, 0.6 + 0.4 * (z + 1) / 2, spd * (0.45 + 0.55 * (z + 1) / 2));
      });
    } };
  }, f(P, k, e, o) {
    P.front = true;
    const pre = ease(sm(0, 0.14, k)), run = sm(0.14, 0.8, k);
    const spd = Math.sin(Math.PI * run);                            // velocidad (máxima a mitad)
    const phi = Math.PI * 2 * 3.25 * (run < 0.5 ? 2 * run * run : 1 - Math.pow(-2 * run + 2, 2) / 2);
    P.lift += 6 * pre * (1 - sm(0.8, 0.88, k));                     // de puntillas
    if (k < 0.8) {
      P.turn += Math.sin(phi) * (run > 0 ? 1 : 0);
      P.hturn += Math.sin(phi + 0.5) * 0.3 * spd;
      P.sx *= 1 - 0.2 * Math.abs(Math.sin(phi)) * spd;            // al ponerse de perfil se ve más estrecho
      o.phi = phi; o.spd = spd;
      const open = lerp(95, 18, spd);
      P.aL = lerp(P.aL, open, pre); P.aR = lerp(P.aR, -open, pre);
      P.eyes = spd > 0.55 ? "closed" : "happy";
      P.sway += Math.sin(phi * 0.5) * 2 * spd;
      if (run > 0 && Math.floor(phi / Math.PI) !== o.half) { o.half = Math.floor(phi / Math.PI); tone("sine", 520 + spd * 500, 640 + spd * 520, 0.08, 0.02); }
    } else {                                                         // frena con un pequeño rebote y posa
      o.spd = 0;
      const m = back(sm(0.8, 0.92, k));
      const over = Math.sin((k - 0.8) * 30) * (1 - sm(0.8, 1, k)) * 0.35;
      P.turn += over;
      P.aR = lerp(-20, -125, m); P.aL = lerp(20, -30, m);           // un brazo arriba, el otro a la cadera
      P.tilt += 9 * m; P.eyes = k > 0.84 ? "wink" : "happy"; P.mouth = Math.max(P.mouth, 0.3 * m);
      once(o, "end", () => { E.fx("note", 2); V.chirp && V.chirp(); });
    }
  } };

  // 3) Equilibrio a la pata coja: se tambalea cada vez más; aguanta (¡ta-chán!) o se cae de culo
  E.ACTIONS.balance = { dur: 4.6, f(P, k, e, o) {
    if (o.win == null) { o.win = Math.random() < 0.6; o.side = Math.random() < 0.5 ? -1 : 1; }
    P.front = true;
    const up = ease(sm(0, 0.12, k));
    let amp = 3 + 14 * sm(0.12, 0.68, k);
    if (o.win) amp *= 1 - ease(sm(0.68, 0.78, k));
    let w = (Math.sin(A.t * 5.3) + 0.45 * Math.sin(A.t * 2.1 + 1)) * amp * up;
    if (!o.win && k > 0.68) w = o.side * (amp + 14 * ease(sm(0.68, 0.72, k)));
    P.sway += w;
    P.tilt -= w * 0.55;                                              // la cabeza compensa
    P.legR = lerp(0, -34, up) + Math.sin(A.t * 9) * 4 * up;         // pata levantada que se mueve sola
    const flail = !o.win && k > 0.68 && k < 0.82 ? Math.sin(A.t * 24) * 32 : 0;
    P.aL = lerp(P.aL, 92 - w * 2.6 + flail, up); P.aR = lerp(P.aR, -92 - w * 2.6 - flail, up);
    if (k < 0.68 || (!o.win && k < 0.8)) { P.eyes = "squint"; P.brows = "worried"; P.mouth = Math.max(P.mouth, 0.12); }
    once(o, "sweat", () => {}); if (k > 0.45) once(o, "drop", () => E.fx("drop", 1));
    if (o.win && k > 0.78) {
      const m = back(sm(0.78, 0.9, k));
      P.legR = lerp(P.legR, 0, ease(sm(0.85, 0.95, k)));
      P.aL = lerp(P.aL, 150, m); P.aR = lerp(P.aR, -150, m);
      P.eyes = "happy"; P.brows = "up"; P.mouth = Math.max(P.mouth, 0.35 * m);
      once(o, "ok", () => { sparkle(0, -70, 5); V.chirp && V.chirp(); });
    }
    if (!o.win && k > 0.72) once(o, "fall", () => setTimeout(() => play("tumble", { kind: "sit", dir: o.side, from: o.side * 30 }), 0));
  } };

  // 4) Malabares con tres pelotas (cascada); a veces una le da en la cabeza y se le caen todas
  E.ACTIONS.juggle = { dur: 6, f(P, k, e, o) {
    P.front = true;
    const J = o.J;
    const up = ease(sm(0, 0.08, k));
    P.aL = lerp(P.aL, 38, up); P.aR = lerp(P.aR, -38, up);
    if (J && J.state === "juggle") {
      // la mano que va a lanzar baja un poco y sube con el tiro
      const ph = (J.tau / J.b) * Math.PI;
      P.aR += Math.sin(ph) * 13; P.aL += Math.sin(ph + Math.PI) * 13;
      P.eyeY = -3.5; P.eyeX = clamp(J.lookX / 22, -5, 5); P.nod += Math.sin(ph * 2) * 1.2;
      P.brows = "up";
    }
    if (J && J.state === "bonk") { P.eyes = J.bt < 0.5 ? "x" : null; P.nod += 6 * (1 - Math.min(1, J.bt * 2)); if (J.bt > 0.6) { P.aR = lerp(P.aR, -150, 0.8); P.brows = "worried"; } }
    if (J && J.state === "done") { const m = ease(sm(0.88, 0.96, k)); P.nod += 13 * m * (1 - sm(0.96, 1, k)); P.eyes = "happy"; }
  }, start(o) {
    clear();
    const b = 0.32;                                                  // ritmo: un lanzamiento cada 0,27 s
    const J = o.J = { b, tau: -0.55, state: "juggle", fail: Math.random() < 0.35, balls: [], lookX: 0, t0: A.t, bt: 0, throwsEnd: 15, failAt: 8 + Math.floor(Math.random() * 3) };
    for (let i = 0; i < 3; i++) { const el = img("artJuggle", layer, 32, 32); J.balls.push({ el, loose: false, x: 0, y: 0, vx: 0, vy: 0, r: 0 }); }
    cur = { draw() { drawJuggle(o); } };
    setTimeout(() => sparkle(0, 120, 2), 150);
  } };
  function drawJuggle(o) {
    const J = o.J; if (!J || !A.action || A.action.name !== "juggle") { cur = null; clear(); return; }
    const dt = 1 / 60; J.tau += dt;
    const H = hands(), b = J.b, k = (A.t - A.action.t0) / A.action.dur;
    const handPt = (h, inner) => ({ x: H[h].x + (inner ? (h === "R" ? -9 : 9) : (h === "R" ? 10 : -10)), y: H[h].y - 10 });
    let top = null;
    J.balls.forEach((B, i) => {
      if (B.loose) {                                                  // se cae al suelo y rebota
        B.vy += 1500 * dt; B.x += B.vx * dt; B.y += B.vy * dt; B.r += B.vx * dt * 3;
        if (B.y > 162) { B.y = 162; B.vy *= -0.42; B.vx *= 0.7; if (Math.abs(B.vy) > 60) tone("sine", 300, 200, 0.05, 0.015); }
        place(B.el, B.x, B.y, B.r, 1, 1 - sm(0.93, 1, k));
        return;
      }
      const tau = J.tau;
      // antes de empezar: dos pelotas en la derecha y una en la izquierda
      if (tau < i * b || (J.state === "done" && B.held)) {
        const h = B.held || (i === 1 ? "L" : "R"), p = handPt(h, false);
        B.x = p.x + (i === 2 ? -6 : 0); B.y = p.y - (i === 2 ? 14 : 0);
        place(B.el, B.x, B.y, 0, 1, J.state === "done" ? 1 - sm(0.95, 1, k) : ease(Math.min(1, (tau + 0.55) / 0.3)));
        return;
      }
      const j = i + 3 * Math.floor((tau / b - i) / 3);
      const from = j % 2 === 0 ? "R" : "L", to = from === "R" ? "L" : "R";
      const u = (tau - j * b) / b;
      const isFail = J.fail && j === J.failAt;
      if (j >= J.throwsEnd && J.state === "juggle") { J.state = "done"; }
      if (u < 2 || isFail) {
        const p0 = handPt(from, true), p1 = isFail ? { x: 0, y: -118 } : handPt(to, false);
        const uu = isFail ? u / 2.3 : u / 2;
        const Hh = isFail ? 300 : 250;
        B.x = lerp(p0.x, p1.x, uu); B.y = lerp(p0.y, p1.y, uu) - Hh * 4 * uu * (1 - uu); B.r += 9;
        if (isFail && uu >= 1 && J.state !== "bonk") {           // ¡cloc! en la cabeza
          J.state = "bonk"; J.bonkAt = A.t;
          B.loose = true; B.vx = (Math.random() < 0.5 ? -1 : 1) * 140; B.vy = -320;
          J.balls.forEach((C) => { if (!C.loose) { C.loose = true; C.vx = (C.x > 0 ? 1 : -1) * (40 + Math.random() * 60); C.vy = -60; } });
          E.fx("bang", 1); tone("triangle", 520, 180, 0.14, 0.05); E.bump && E.bump(-2);
          setTimeout(() => { E.express("avergonzado", 2.2); E.say(Math.random() < 0.5 ? "Eso no ha pasado" : "Ups… casi", 1800, false); }, 700);
        }
        if (!top || B.y < top.y) top = B;
        if (!isFail && u < 0.05 && !B.snd) { B.snd = 1; tone("sine", 700, 820, 0.04, 0.012); } else if (u >= 0.05) B.snd = 0;
      } else {
        if (J.state === "done" && j + 3 >= J.throwsEnd) B.held = to;          // ya no se vuelve a lanzar: se queda en la mano
        const p = (u - 2), a = handPt(to, false), c = handPt(to, true);
        B.x = lerp(a.x, c.x, p); B.y = lerp(a.y, c.y, p) + Math.sin(Math.PI * p) * 7;
      }
      place(B.el, B.x, B.y, B.r, 1, 1);
    });
    if (J.state === "bonk") J.bt = A.t - J.bonkAt;
    J.lookX = top ? top.x : 0;
    if (J.state === "done" && !J.bowed && k > 0.88) { J.bowed = 1; sparkle(0, -60, 4); V.chirp && V.chirp(); }
  }

  // 5) Magia: varita, caja que tiembla, ¡puf! y sale una sorpresa
  const SURPRISES = [["artHeart", 34], ["artCookie", 34], ["artBall", 30], ["artNotes", 34], ["artBowtie", 40], ["artSpark", 34]];
  E.ACTIONS.magic = { dur: 6.2, f(P, k, e, o) {
    const M = o.M; if (!M) return;
    const side = M.side;
    P.front = true;
    if (k < 0.12) { const m = ease(sm(0, 0.12, k)); P.aR = lerp(P.aR, -60 * side, m); P.eyes = "happy"; }
    else if (k < 0.42) {                                            // conjuro: círculos con la varita sobre la caja
      const m = ease(sm(0.12, 0.18, k));
      P.turn += 0.22 * side * m; P.eyeX = 4 * side; P.eyeY = 2; P.brows = "up";
      P.aR = lerp(P.aR, -82 + Math.sin(A.t * 9) * 18, m); P.aL = lerp(P.aL, 30 + Math.sin(A.t * 9 + 1) * 8, m);
      P.mouth = Math.max(P.mouth, Math.abs(Math.sin(A.t * 11)) * 0.35);
      P.nod += Math.sin(A.t * 9) * 1.5;
    } else if (k < 0.5) {                                           // ¡toque!
      const m = sm(0.42, 0.46, k);
      P.turn += 0.22 * side; P.aR = lerp(-130, -35, ease(m)); P.eyeX = 4 * side; P.brows = "up";
    } else if (k < 0.62) {                                          // ¡oh!
      P.eyeScale = 1.3; P.brows = "up"; P.mouth = Math.max(P.mouth, 0.5); P.lift += 3 * Math.sin(Math.PI * sm(0.5, 0.56, k));
      P.eyeX = 3 * side; P.eyeY = -4;
    } else {                                                         // ¡ta-chán!
      const m = back(sm(0.62, 0.74, k));
      P.aR = lerp(P.aR, -128, m); P.aL = lerp(P.aL, 70, m); P.eyes = "happy"; P.brows = "up"; P.tilt += 6 * m;
      P.mouth = Math.max(P.mouth, 0.35 * m);
    }
  }, start(o) {
    clear();
    const side = 1;                                                  // caja a su derecha
    const pick = SURPRISES[Math.floor(Math.random() * SURPRISES.length)];
    const M = o.M = { side, box: img("artBox", ground, 92, 84), wand: img("artWand", layer, 18, 66), item: img(pick[0], ground, pick[1] * 1.35, pick[1] * 1.35), pick: pick[0], bx: 158, by: 134, t0: A.t };
    cur = { draw() { drawMagic(o); } };
    setTimeout(() => E.say(Math.random() < 0.5 ? "Abracadabra…" : "Y ahora… ¡atención!", 1800, false), 700);
  } };
  function drawMagic(o) {
    const M = o.M; if (!M || !A.action || A.action.name !== "magic") { cur = null; clear(); return; }
    const k = (A.t - A.action.t0) / A.action.dur, H = hands();
    // varita en la mano derecha, apuntando hacia fuera del brazo
    const wIn = back(sm(0, 0.08, k)), wOut = 1 - sm(0.9, 0.97, k);
    // hacia dónde apunta: al principio y al final hacia arriba; durante el conjuro, a la caja (con remolino)
    let ang;
    if (k > 0.12 && k < 0.5) {
      const tx = M.bx + Math.cos(A.t * 9) * 22, ty = M.by - 30 + Math.sin(A.t * 9) * 12;
      ang = Math.atan2(tx - H.R.x, -(ty - H.R.y)) * 180 / Math.PI;
    } else ang = k >= 0.62 ? 18 : 35;
    M.wAng = M.wAng == null ? ang : M.wAng + (ang - M.wAng) * 0.25;
    const rad = (M.wAng - 90) * Math.PI / 180;                       // centro de la varita, un poco más allá de la mano
    place(M.wand, H.R.x + Math.cos(rad) * 22, H.R.y + Math.sin(rad) * 22, M.wAng, wIn * wOut, wOut);
    const tip = { x: H.R.x + Math.cos(rad) * 52, y: H.R.y + Math.sin(rad) * 52 };
    if (k > 0.12 && k < 0.42 && Math.random() < 0.18) sparkle(tip.x, tip.y, 1);
    // caja: aparece, tiembla cada vez más, se aplasta con el toque
    const bIn = back(sm(0.02, 0.12, k)), bOut = 1 - ease(sm(0.86, 0.95, k));
    const shake = k > 0.15 && k < 0.46 ? Math.sin(A.t * 34) * 9 * sm(0.15, 0.42, k) : 0;
    const squash = k > 0.44 && k < 0.52 ? Math.sin(Math.PI * sm(0.44, 0.52, k)) : 0;
    M.box.setAttribute("transform", `translate(${M.bx} ${M.by + 42}) rotate(${shake.toFixed(1)}) scale(${(bIn * bOut * (1 + squash * 0.18)).toFixed(3)} ${(bIn * bOut * (1 - squash * 0.25)).toFixed(3)}) translate(0 -42)`);
    M.box.setAttribute("opacity", bOut.toFixed(2));
    if (k > 0.12) once(M, "popIn", () => { tone("sine", 300, 600, 0.12, 0.03); });
    if (k > 0.45) once(M, "puf", () => { smoke(M.bx, M.by - 6, 7); tone("sawtooth", 900, 200, 0.22, 0.02, 1200); E.bump && E.bump(-2); });
    // la sorpresa sale de la caja, flota y se va
    const iu = sm(0.48, 0.62, k), iout = sm(0.86, 1, k);
    const iy = M.by - 10 - 84 * back(iu) - 26 * iout + Math.sin(A.t * 3) * 4 * (iu >= 1 ? 1 : 0);
    place(M.item, M.bx, iy, Math.sin(A.t * 2.4) * 10, Math.max(0.01, back(iu)) * (1 + 0.15 * iout), iu > 0 ? 1 - iout : 0);
    if (k > 0.5) once(M, "reveal", () => {
      sparkle(M.bx, M.by - 70, 5, ground); V.chirp && V.chirp();
      if (M.pick === "artHeart") { E.blush && E.blush(2.5); E.fx("heart", 2); }
      setTimeout(() => E.say({ artHeart: "¡Un corazón para ti!", artCookie: "¡Una galleta! (es mía)", artBall: "¡Una pelota!", artNotes: "¡Música, maestro!", artBowtie: "¡Mi pajarita!", artSpark: "¡Polvo de estrellas!" }[M.pick] || "¡Ta-chán!", 2200, false), 900);
    });
  }

  // 6) Barriga llena: palmaditas, eructito, vergüenza y risa
  // ================================================================
  // Caídas (sirven para el equilibrio, tropiezos y cualquier traspié):
  //  · «sit»: pierde el equilibrio, aspavientos, cae de culo con polvo, ve las estrellitas y se recompone
  //  · «face»: tropieza andando, cae de bruces (¡plaf!), patalea, se levanta, se sacude y disimula
  const dust = (x, y, n = 5, w = 30) => { for (let i = 0; i < n; i++) { const d = i % 2 ? 1 : -1; particle("artPuff", ground, x + d * (6 + Math.random() * 16), y - Math.random() * 6, { w: w * (0.7 + Math.random() * 0.5), vx: d * (60 + Math.random() * 70), vy: -20 - Math.random() * 30, g: 40, life: 0.8, s0: 0.4, s1: 1.1, vr: d * 80 }); } };
  function stars(o, on) {
    if (on && !o.stars) o.stars = [0, 1, 2].map(() => img("artSpark", layer, 18, 18));
    if (!o.stars) return;
    o.stars.forEach((e, i) => {
      const a = A.t * 5 + i * 2.1, z = (Math.sin(a) + 1) / 2;
      place(e, Math.cos(a) * 62, -112 + Math.sin(a) * 14, a * 50, 0.55 + 0.45 * z, on ? 0.35 + 0.65 * z : 0);
    });
  }
  E.ACTIONS.tumble = { dur: 3.6, start(o) {
    if (cur) clear();
    o.kind = o.kind || "sit"; o.dir = o.dir || (Math.random() < 0.5 ? -1 : 1); o.from = o.from || 0;
    cur = { draw() { if (!A.action || A.action.name !== "tumble") { cur = null; clear(); return; } stars(o, !!o.starsOn); } };
    tone("sine", 700, 1100, 0.1, 0.03);
  }, f(P, k, e, o) {
    const d = o.dir || 1;
    P.front = o.kind !== "face";
    if (o.kind !== "face") {
      if (k < 0.18) {                                                 // ¡que me caigo!
        const m = ease(sm(0, 0.18, k));
        P.sway += lerp(o.from, d * 24, m) + Math.sin(A.t * 16) * 3;
        P.aL = 120 + Math.sin(A.t * 22) * 40; P.aR = -120 + Math.sin(A.t * 22 + 1.5) * 40;
        P.legR = -20 * m; P.eyeScale = 1.35; P.brows = "up"; P.mouth = Math.max(P.mouth, 0.45);
        once(o, "ay", () => E.fx("drop", 1));
      } else if (k < 0.3) {                                          // cae
        const m = sm(0.18, 0.3, k), fall = m * m;
        P.sway += lerp(d * 24, -d * 6, fall); P.lift -= 24 * fall;
        P.legL = -30 * fall; P.legR = -30 * fall;
        P.aL = 150; P.aR = -150; P.eyes = "closed"; P.brows = "up";
      } else {
        once(o, "thud", () => {
          S.mode = "sit"; S.modeUntil = A.t + (1 - k) * A.action.dur + 0.4;
          E.bump && E.bump(-7); dust(0, 172, 6); tone("triangle", 160, 70, 0.2, 0.06); E.fx("bang", 1);
        });
        const imp = 1 - ease(sm(0.3, 0.38, k));
        P.sy *= 1 - 0.16 * imp; P.sx *= 1 + 0.1 * imp; P.sway += -d * 6 * imp;
        if (k < 0.62) {                                               // ve las estrellitas
          o.starsOn = k > 0.33;
          P.eyes = "x"; P.hturn += Math.sin(A.t * 5) * 0.25; P.tilt += Math.cos(A.t * 5) * 6;
          P.aL = lerp(P.aL, 30, 0.2); P.aR = lerp(P.aR, -30, 0.2); P.nod += 3;
        } else {                                                      // sacude la cabeza, se rasca y se pone colorado
          o.starsOn = false;
          const m = ease(sm(0.62, 0.7, k));
          P.hturn += Math.sin(A.t * 22) * 0.4 * (1 - sm(0.62, 0.74, k));
          P.aR = lerp(P.aR, -150 + Math.sin(A.t * 14) * 10 * sm(0.72, 0.76, k), m); P.aL = lerp(P.aL, 20, m);
          P.eyes = "squint"; P.brows = "worried"; P.tilt += 8 * m;
          once(o, "blush", () => { E.blush && E.blush(2.4); });
          if (k > 0.86) once(o, "up", () => { S.mode = "idle"; S.modeUntil = A.t + 1.5; E.hop && E.hop(-260); });
        }
      }
    } else {
      const f = d;                                                    // cae hacia donde iba
      if (k < 0.1) {                                                  // el pie se engancha
        const m = ease(sm(0, 0.1, k));
        P.sway += f * 14 * m; P.aL = lerp(P.aL, 90, m); P.aR = lerp(P.aR, -90, m);
        P.eyeScale = 1.4; P.brows = "up"; P.mouth = Math.max(P.mouth, 0.5); P.legL = f > 0 ? 0 : -14 * m; P.legR = f > 0 ? -14 * m : 0;
      } else if (k < 0.22) {                                         // ¡plaf!
        const m = sm(0.1, 0.22, k);
        P.sway += f * lerp(14, 80, m * m); P.aL = 140; P.aR = -140; P.eyes = "closed";
      } else if (k < 0.52) {                                         // en el suelo, pataleta
        once(o, "plaf", () => { E.bump && E.bump(-5); dust(f * 170, 150, 6, 34); tone("triangle", 180, 60, 0.22, 0.06); });
        const b = Math.sin(Math.PI * sm(0.22, 0.28, k)) * 4;
        P.sway += f * (80 - b); P.eyes = "x";
        P.legL = Math.sin(A.t * 18) * 10; P.legR = Math.sin(A.t * 18 + Math.PI) * 10;
        P.aL = 150 + Math.sin(A.t * 10) * 10; P.aR = -150 - Math.sin(A.t * 10) * 10;
      } else if (k < 0.72) {                                         // se levanta con rebote
        const m = back(sm(0.52, 0.72, k));
        P.sway += f * 80 * (1 - m); P.aL = lerp(150, 30, m); P.aR = lerp(-150, -30, m); P.eyes = "squint";
      } else {                                                        // se sacude el polvo y disimula
        once(o, "brush", () => { dust(0, 150, 3, 22); });
        o.starsOn = k < 0.84;
        const pat = Math.sin(A.t * 16);
        P.aL = 10 + pat * 18; P.aR = -10 + pat * 18; P.nod += 3;
        P.hturn += Math.sin(A.t * 20) * 0.3 * (1 - sm(0.72, 0.82, k));
        P.eyes = k > 0.86 ? "happy" : "squint";
        once(o, "ok", () => { E.blush && E.blush(2); setTimeout(() => E.say(Math.random() < 0.5 ? "¡Estoy bien! Lo he hecho a propósito" : "Nadie ha visto nada…", 2200, false), 500); });
      }
    }
  } };
  function play(name, opts = {}) {
    if (cur) { cur = null; clear(); }
    if (A.action) A.action = null;
    S.mode = "idle"; S.vx = 0; S.modeUntil = A.t + E.ACTIONS[name].dur + 0.8;
    E.act(name, opts);
    const o = A.action && A.action.opts;
    if (o && E.ACTIONS[name].start) E.ACTIONS[name].start(o);
  }
  // Tropiezos de vez en cuando al ir corriendo (como mucho uno cada 25 min)
  let nextTrip = A.t + 600;
  E.HOOKS.tick.push(() => {
    if (A.t < nextTrip || S.mode !== "walk" || S.speed < 120 || S.airborne || S.dragging || A.action || E.busy()) return;
    if (Math.random() < 0.0025) { nextTrip = A.t + 1500 + Math.random() * 900; S.facing = S.targetX > S.x ? 1 : -1; play("tumble", { kind: "face", dir: S.facing }); }
  });

  // 6) Barriga llena: se hincha, anda como un pato, se deja caer sentado, eructito y siesta de satisfacción
  E.ACTIONS.bellyFull = { dur: 5.2, f(P, k, e, o) {
    P.front = true;
    const full = ease(sm(0, 0.12, k)) * (1 - ease(sm(0.9, 1, k)) * 0.6);
    P.sx *= 1 + 0.15 * full; P.sy *= 1 - 0.07 * full;              // redondito
    if (k < 0.12) {                                                  // ¡bloop! se hincha
      once(o, "bloop", () => tone("sine", 260, 520, 0.28, 0.035));
      P.eyeScale = 1 + 0.3 * Math.sin(Math.PI * sm(0, 0.12, k)); P.brows = "up";
      P.aL = lerp(P.aL, 40, full); P.aR = lerp(P.aR, -40, full);
    } else if (k < 0.42) {                                          // anda como un pato, frotándose la tripa
      const st = Math.sin(A.t * 6);
      P.sway += st * 6; P.tilt -= st * 3;
      P.legL = Math.max(0, st) * -10; P.legR = Math.max(0, -st) * -10;
      const r = Math.sin(A.t * 5);
      P.aL = lerp(P.aL, -38 + r * 10, 0.4); P.aR = lerp(P.aR, 38 + r * 10, 0.4);
      P.eyes = "happy"; P.mouth = Math.max(P.mouth, 0.15); P.nod += 2;
      if (Math.floor(A.t * 1.6) !== o.step) { o.step = Math.floor(A.t * 1.6); tone("sine", 160, 130, 0.07, 0.02); }
    } else if (k < 0.5) {                                           // se deja caer sentado: ¡pof!
      once(o, "pof", () => { S.mode = "sit"; S.modeUntil = A.t + (1 - k) * A.action.dur + 0.3; E.bump && E.bump(-5); dust(0, 172, 4, 26); tone("triangle", 140, 80, 0.16, 0.04); });
      P.aL = lerp(P.aL, -40, 0.3); P.aR = lerp(P.aR, 40, 0.3); P.eyes = "closed"; P.sy *= 1 - 0.06 * Math.sin(Math.PI * sm(0.42, 0.5, k));
    } else if (k < 0.58) {                                          // eructito
      const m = Math.sin(Math.PI * sm(0.5, 0.58, k));
      P.mouth = Math.max(P.mouth, 0.75 * m); P.lift += 4 * m; P.sx *= 1 + 0.06 * m; P.eyeScale = 1 + 0.25 * m; P.brows = "up";
      once(o, "burp", () => { tone("square", 150, 85, 0.24, 0.035, 600); smoke(28, 44, 3, layer, 34); });
    } else if (k < 0.7) {                                           // se tapa la boca, colorado
      const m = ease(sm(0.58, 0.63, k));
      P.aR = lerp(P.aR, 104, m); P.eyes = "squint"; P.tilt += 7 * m;
      once(o, "blush", () => { E.blush && E.blush(2.4); });
    } else {                                                         // respira hondo, satisfecho, y palmadita final
      const br = Math.sin(A.t * 2.6);
      P.sx *= 1 + 0.04 * br; P.sy *= 1 - 0.02 * br;
      P.eyes = "closed"; P.mouth = Math.max(P.mouth, 0.12); P.tilt -= 5;
      const pat = k > 0.82 ? Math.max(0, Math.sin(A.t * 9)) : 0;
      P.aL = lerp(P.aL, -40 + pat * 10, 0.3); P.aR = lerp(P.aR, 40 - pat * 10, 0.3);
      once(o, "ahh", () => { tone("sine", 520, 330, 0.5, 0.025); setTimeout(() => E.fx("heart", 1), 300); setTimeout(() => E.say(Math.random() < 0.5 ? "Qué a gustito…" : "No me cabe ni una miga más", 2200, false), 500); });
    }
  } };

  // ---------- Lanzar trucos ----------
  const LIST = [
    { id: "flip", lock: "trick:flip", name: "Voltereta", say: ["¡Mira, mira!", "¡Allá voy!"] },
    { id: "pirouette", lock: "trick:spin", name: "Pirueta", say: ["Con estilo…", "¡Atención!"] },
    { id: "balance", lock: "trick:balance", name: "Equilibrio", say: ["A la pata coja…", "Concentración…"] },
    { id: "juggle", lock: "trick:juggle", name: "Malabares", say: ["¡Tres pelotas!", "Esto es difícil, ¿eh?"] },
    { id: "magic", lock: "trick:magic", name: "Magia", say: [] },
    { id: "bellyFull", lock: "trick:belly", name: "Barriga llena", say: [] },
  ];
  const has = (t) => !window.EkoProgress || window.EkoProgress.has(t.lock);
  function run(id, force) {
    const t = LIST.find((x) => x.id === id); if (!t) return false;
    if (!force && !has(t)) return false;
    if (S.sleeping) E.wakeUp(false);
    if (A.action) A.action = null;
    S.mode = "idle"; S.modeUntil = A.t + E.ACTIONS[id].dur + 0.8; S.vx = 0;
    if (cur) { cur = null; clear(); }
    E.act(id);
    const o = A.action && A.action.opts;
    if (o && E.ACTIONS[id].start) E.ACTIONS[id].start(o);
    if (t.say.length && Math.random() < 0.6) E.say(t.say[Math.floor(Math.random() * t.say.length)], 1500, false);
    if (window.EkoNeeds) window.EkoNeeds.give("fetch");
    return true;
  }
  const unlocked = () => LIST.filter(has);
  // De vez en cuando, si está contento, hace un truco por su cuenta
  setInterval(() => {
    if (E.busy() || S.sleeping || E.A.hidden || Math.random() > 0.12) return;
    const N = window.EkoNeeds && window.EkoNeeds.on() ? window.EkoNeeds.get() : null;
    if (N && (N.energy < 40 || N.fun < 30)) return;
    const u = unlocked().filter((t) => t.id !== "bellyFull");
    if (u.length) run(u[Math.floor(Math.random() * u.length)].id);
  }, 9 * 60000);

  return { run, LIST, has, unlocked, tumble: (kind = "sit", dir) => play("tumble", { kind, dir }) };
})();
