// Eko · travesuras para cuando no está haciendo nada (se esconde, tropieza, juega solo…)
// Cada travesura: { when() → ¿se puede ahora?, start(c), pose(P, t, c), tick(dt, t, c), draw(t, c), end(c), dur }
// t = segundos desde que empezó. Usa los ganchos de main.js (Eko.HOOKS) para mover el cuerpo.
(() => {
  "use strict";
  const E = window.Eko;
  if (!E || !E.HOOKS) return;
  const S = E.S, A = E.A, V = E.Voice, NS = "http://www.w3.org/2000/svg";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => k * k * (3 - 2 * k);
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  const ES = E.LANG !== "en";
  const T = (es, en) => (ES ? es : en);
  const say = (es, en, ms = 2200) => E.say(T(es, en), ms, true);
  const floorY = () => E.floorY();
  const centerX = () => S.x + E.W / 2;
  const cfg = () => (window.EkoSettings ? window.EkoSettings.get() : { walk: true });

  // ---------- Dibujo auxiliar ----------
  const front = E.el.antic;
  let back = document.getElementById("anticBack");
  if (!back) { back = document.createElementNS(NS, "g"); back.id = "anticBack"; E.el.accBack.prepend(back); }
  function svg(tag, attrs, parent = front) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }
  // Coordenadas del dibujo de Eko → píxeles dentro de su caja (para efectos HTML)
  const pod = (x, y) => ({ x: 55 + (x + 120) * 0.458, y: 108 + (y + 125) * 0.458 });
  function sprite(html, x, y, cls = "", life = 1600) {
    const d = document.createElement("div");
    d.className = "antic-sprite " + cls;
    d.innerHTML = html;
    d.style.left = x + "px"; d.style.top = y + "px";
    E.fxLayer.appendChild(d);
    if (life) setTimeout(() => d.remove(), life);
    return d;
  }
  // Nube de humo que TAPA a Eko: crece, se queda un instante cubriéndolo y se disipa hacia fuera.
  // Cuando está tapado (≈ 230 ms) es cuando Eko desaparece o aparece debajo.
  function puff(x, y, n = 9) {
    const src = (document.getElementById("artPuff") || {}).getAttribute?.("href") || "";
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
      const rr = i === 0 ? 0 : 0.45 + Math.random() * 0.55;
      const cx = x + Math.cos(a) * 40 * rr, cy = y + Math.sin(a) * 62 * rr;
      const w = i === 0 ? 92 : 56 + Math.random() * 28;
      const s = sprite(`<img src="${src}" alt="">`, cx - w / 2, cy - w * 0.37, "puff", 1150);
      s.style.width = w.toFixed(1) + "px";
      s.style.animationDelay = (Math.random() * 60).toFixed(0) + "ms";
      s.style.setProperty("--r", (Math.random() * 40 - 20).toFixed(0) + "deg");
      s.style.setProperty("--dx", (Math.cos(a) * (18 + Math.random() * 16)).toFixed(1) + "px");
      s.style.setProperty("--dy", (Math.sin(a) * (14 + Math.random() * 12) - 10).toFixed(1) + "px");
    }
  }

  const clipGround = (on) => { E.el.pet.ownerSVGElement.style.clipPath = on ? "inset(-400px -400px 4px -400px)" : ""; };

  // Mover a Eko a otro sitio del suelo, lejos de donde está
  function farX() {
    const lo = E.minX() + 40, hi = E.maxX() - 40;
    for (let i = 0; i < 8; i++) { const x = lerp(lo, hi, Math.random()); if (Math.abs(x - S.x) > 380) return x; }
    return S.x < (lo + hi) / 2 ? hi : lo;
  }
  const onFloor = () => !S.perch && !S.airborne && !S.fly && !S.dragging;
  const free = () => !S.sleeping && !S.sulking && !S.dragging && !S.fly && !S.airborne && !S.pendingHop && !E.A.action;

  // ---------- Motor ----------
  let cur = null;
  const hist = [];
  function stop(ok = true) {
    const c = cur; if (!c) return;
    cur = null;
    try { c.end && c.end(c, ok); } catch (_) {}
    clipGround(false);
    if (A.hidden && !c.keepHidden) E.setHidden(false);
    while (front.firstChild) front.firstChild.remove();
    while (back.firstChild) back.firstChild.remove();
  }
  E.HOOKS.tick.push((dt) => {
    if (!cur) return;
    const t = A.t - cur.t0;
    if (S.dragging && !cur.hang) { stop(false); return; }
    if (S.sleeping && !cur.sleepy) { stop(false); return; }
    try { cur.tick && cur.tick(dt, t, cur); } catch (e) { stop(false); return; }
    if (cur && t > cur.dur) stop(true);
  });
  E.HOOKS.pose.push((P) => { if (cur && cur.pose) cur.pose(P, A.t - cur.t0, cur); });
  E.HOOKS.draw.push(() => { if (cur && cur.draw) cur.draw(A.t - cur.t0, cur); });

  function run(name) {
    const d = DEF[name];
    if (!d) return false;
    if (cur) stop(false);
    cur = Object.assign(Object.create(d), { name, t0: A.t, dur: d.dur || 6, dir: S.facing || 1 });
    S.then = null;
    try { d.start && d.start(cur); } catch (e) { stop(false); return false; }
    hist.push(name); if (hist.length > 8) hist.shift();
    return true;
  }
  function random() {
    if (cur || !free()) return false;
    const opts = Object.keys(DEF).filter((n) => !hist.slice(-6).includes(n) && (!DEF[n].when || DEF[n].when()));
    if (!opts.length) return false;
    // un poco más de peso a las favoritas
    const fav = ["teleport", "wrap", "peekaboo", "spider", "bored"];
    const pool = opts.flatMap((n) => (fav.includes(n) ? [n, n] : [n]));
    return run(pick(pool));
  }

  // Se hunde detrás de la ventana / el icono en el que está y asoma los ojos. Clic → sale de un salto.
  function behind(dur) {
    const hold = dur - 1.5;
    return {
      dur, when: () => free() && !!S.perch && !S.perch.icon,
      start(c) { c.depth = 0; },
      tick(dt, t, c) {
        if (t > 0.2 && !c.clip) { c.clip = 1; clipGround(true); }
        if (c.found) {
          const k = seg(t, c.ft, c.ft + 0.22);
          c.depth = c.d0 * (1 - k);
          if (k >= 1 && !c.out) { c.out = 1; clipGround(false); E.hop(-520); E.fx("bang", 1); E.express("divertido", 2.5); say(pick(["¡Me has pillado!", "¡Jo, qué rápido!", "¡Aquí estoy!"]), "You found me!", 1800); V.chirp(); setTimeout(() => stop(true), 900); }
          return;
        }
        c.depth = t < 1 ? ease(seg(t, 0.2, 1)) * 150 : t < hold ? 150 : (1 - ease(seg(t, hold, hold + 1))) * 150;
        if (t > hold + 1.05 && !c.out) { c.out = 1; clipGround(false); if (dur > 10) say("¡Aquí estaba! ¿No me veías?", "I was right here!", 2200); }
      },
      tap(t, c) { if (c.found || t < 0.3 || t > hold + 0.8) return false; c.found = 1; c.ft = t; c.d0 = c.depth; return true; },
      pose(P, t, c) { P.lift -= c.depth; if (t > 1 && t < hold) { P.eyeX = Math.sin(t * 1.6) * 6; P.eyes = (t % 2.5) < 0.2 ? "closed" : null; } },
    };
  }

  // ---------- Travesuras ----------
  const DEF = {
    // 1. Se encoge con un «pop» y aparece en otro sitio
    teleport: {
      dur: 2.6, when: () => onFloor() && cfg().walk !== false,
      start(c) { c.x0 = S.x; E.express("picaro", 1); },
      pose(P, t) { const k = seg(t, 0, 0.35); P.sy *= 1 - 0.12 * Math.sin(k * Math.PI); P.sx *= 1 + 0.08 * Math.sin(k * Math.PI); },
      tick(dt, t, c) {
        if (t > 0.35 && !c.a) { c.a = 1; const p = pod(0, 20); puff(p.x, p.y, 11); V.chirp(); setTimeout(() => E.setHidden(true), 230); }
        if (t > 1.05 && !c.b) { c.b = 1; S.x = farX(); S.facing = S.x > c.x0 ? -1 : 1; const p = pod(0, 20); setTimeout(() => puff(p.x, p.y, 11), 30); setTimeout(() => { E.setHidden(false); E.bump(-6); }, 260); }
        if (t > 1.6 && !c.c) { c.c = 1; E.express(pick(["divertido", "picaro"]), 2); if (Math.random() < 0.4) say("¡Tachán!", "Ta-da!"); }
      },
      end() { E.setHidden(false); },
    },
    // 2. Se va por un lado de la pantalla y entra por el otro
    wrap: {
      dur: 40, when: () => onFloor() && cfg().walk !== false,
      start(c) {
        const w = E.world, right = (S.facing || 1) > 0;
        S.mode = "walk"; S.speed = 150; S.modeUntil = A.t + 40;
        S.targetX = right ? w.left + w.width - E.W / 2 + 140 : w.left - E.W / 2 - 140;
        S.then = () => {
          S.x = right ? w.left - E.W / 2 - 140 : w.left + w.width - E.W / 2 + 140;
          S.mode = "walk"; S.speed = 120; S.modeUntil = A.t + 30;
          S.targetX = right ? w.left + 160 : w.left + w.width - E.W - 160 + E.W / 2 - 50;
          S.then = () => { E.express("contento", 2); if (Math.random() < 0.5) say("¡He dado la vuelta al mundo!", "Went all the way around!"); stop(true); };
        };
      },
    },
    // 3. Se esconde en el borde y te da un susto si acercas el ratón
    peekaboo: {
      dur: 16, when: () => onFloor() && cfg().walk !== false,
      start() { E.startPeek(); },
      tick(dt, t, c) {
        if (S.mode !== "peeking") return;
        const cx = centerX(), cy = S.y + E.H - 120;
        if (!c.boo && Math.hypot(E.cursor.x - cx, E.cursor.y - cy) < 190) {
          c.boo = 1; S.mode = "idle"; S.modeUntil = A.t + 3; S.facing = Math.sign(E.cursor.x - cx) || 1;
          E.hop(-460); E.fx("bang", 2); E.express("divertido", 2.5); say("¡Bu!", "Boo!", 1600); V.chirp();
          setTimeout(() => stop(true), 1600);
        }
      },
      tap(t, c) {
        if (S.mode !== "peeking" || c.boo) return false;
        c.boo = 1; S.mode = "idle"; S.modeUntil = A.t + 3;
        E.hop(-460); E.fx("bang", 2); E.express("divertido", 2.5); say(pick(["¡Me has pillado!", "¡Bu! Ay, no, me has visto tú"]), "You got me!", 1600); V.chirp();
        setTimeout(() => stop(true), 1600);
        return true;
      },
      end(c) { if (!c.boo) E.express("divertido", 2); },
    },
    // 4. Baja desde arriba colgado de un hilo, como una araña, y se suelta
    spider: {
      dur: 9, hang: true, when: () => onFloor() && cfg().walk !== false,
      start(c) { E.setHidden(true); c.x = farX(); },
      tick(dt, t, c) {
        const w = E.world;
        if (t > 0.3 && !c.placed) { c.placed = 1; S.x = c.x; S.perch = null; S.airborne = true; S.vx = 0; S.y = w.top - E.H; E.setHidden(false); }
        if (!c.placed) return;
        const goal = w.top - 120;
        if (t < 4.6) {
          c.y = t < 2.6 ? lerp(w.top - E.H, goal, ease(seg(t, 0.3, 2.6))) : goal + Math.sin(t * 2.4) * 6;
          S.y = c.y; S.vy = -2300 * dt; S.vx = 0;
          if (t > 2.8 && !c.hi) { c.hi = 1; E.express("feliz", 2); if (Math.random() < 0.6) say("¡Hola desde arriba!", "Hi from up here!"); }
        } else if (!c.cut) { c.cut = 1; S.vy = 60; E.express("asustado", 1.5); V.chirp(); }
        if (c.cut && !S.airborne && !c.landed) { c.landed = 1; E.express(pick(["dolido", "divertido"]), 2.5); c.dur = t + 1.6; }
      },
      pose(P, t, c) { if (!c.cut || S.airborne) { P.aL = 168; P.aR = -168; P.front = false; P.sway += Math.sin(t * 2.4) * 3; } },
      draw(t, c) {
        if (!c.line) c.line = svg("line", { x1: 0, y1: -1400, x2: 0, y2: -104, stroke: "#e9e3dc", "stroke-width": 1.6, opacity: 0.85 });
        const snap = c.cut ? seg(t, 4.6, 5.0) : 0;
        c.line.setAttribute("y2", String(lerp(-104, -900, snap)));
        c.line.setAttribute("opacity", String(c.placed ? 0.85 * (1 - snap) : 0));
      },
    },
    // 16. Dibuja en el aire un corazón o una estrella que se queda flotando un momento
    drawAir: {
      dur: 4.6, when: () => free(),
      start(c) {
        c.shape = Math.random() < 0.6 ? "M0,10 C-30,-14 -22,-38 0,-24 C22,-38 30,-14 0,10Z" : "M0,-30 L8,-9 L30,-9 L12,4 L19,26 L0,13 L-19,26 L-12,4 L-30,-9 L-8,-9Z";
        const p = pod(70, -40);
        c.el = sprite(`<svg width="80" height="80" viewBox="-40 -40 80 80"><path d="${c.shape}" fill="none" stroke="#ffd36e" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg>`, p.x - 40, p.y - 40, "airdraw", 4600);
        c.path = c.el.querySelector("path");
      },
      tick(dt, t, c) { c.path.setAttribute("stroke-dashoffset", String(100 - 100 * seg(t, 0.3, 2.2))); if (t > 2.2 && !c.done) { c.done = 1; c.el.classList.add("float"); E.express("enamorado", 2); } },
      pose(P, t) { if (t < 2.3) { P.aR = -110 + Math.sin(t * 5) * 30; P.front = true; P.eyeX = 4; P.eyeY = -4; } },
    },
    // 18. Se esconde detrás de la ventana y asoma solo la cabeza
    behindWindow: behind(6.5),
    // Escondite: se esconde detrás de una ventana o un icono hasta que le encuentras (clic)
    hideBehind: Object.assign(behind(30), { when: () => false }),
    // 25. Habla solo y se ríe
    mumble: {
      dur: 4.5, when: () => free(),
      start() { say(pick(["Mmm… sí, sí… jeje", "Y entonces le dije… jajaja", "Hmm… ¿dónde lo dejé?"]), pick(["Mmm… yes, yes… hehe", "And then I said… haha"]), 3000); },
      pose(P, t) { P.eyeX = -4; P.tilt += Math.sin(t * 2) * 5; if (t > 3) { P.eyes = "happy"; P.lift += Math.abs(Math.sin(t * 14)) * 2; } },
    },
    // 30. Se aburre: suspira, se sienta con la cara apoyada en las manos y tamborilea con los pies
    bored: {
      dur: 8, when: () => onFloor(),
      start() { E.express("triste", 2.5); E.Voice.sigh && E.Voice.sigh(); say("Me abuuurro…", "So booored…", 1800); },
      pose(P, t) {
        if (t < 1.6) { const k = ease(seg(t, 0, 1.6)); P.nod += 6 * k; P.sy *= 1 - 0.05 * k; P.eyeY = 2 * k; return; }
        const k = ease(seg(t, 1.6, 2.3)) * (1 - ease(seg(t, 7.2, 8)));
        // apoyo: brazos hacia la cara, cuerpo algo hundido, se balancea despacio
        P.sy *= 1 - 0.1 * k; P.sx *= 1 + 0.05 * k; P.lift -= 6 * k;
        P.aR = lerp(P.aR, 62, k); P.aL = lerp(P.aL, -62, k); P.front = true;
        P.nod += 7 * k; P.eyes = "half"; P.brows = "sad";
        P.sway += Math.sin(t * 1.6) * 4 * k; P.eyeX = Math.sin(t * 0.8) * 4 * k;
        if (t > 4.5 && t < 6.5) P.lift += Math.abs(Math.sin(t * 9)) * 1.5 * k;   // tamborileo
      },
    },
    // 31. Pide atención: golpea el «cristal» de la pantalla y saluda
    knock: {
      dur: 5, when: () => free() && A.t - E.cursor.lastMove > 25,
      tick(dt, t, c) {
        const k = Math.floor((t - 0.4) / 0.35);
        if (t > 0.4 && t < 2.2 && k !== c.k) { c.k = k; const p = pod(10, 60); sprite("", p.x - 12, p.y - 12, "ring", 600); V.thump(0.25); }
        if (t > 2.4 && !c.w) { c.w = 1; E.act("wave"); say("¡Eh! ¿Hay alguien?", "Hey! Anyone there?"); E.express("feliz", 2.5); }
      },
      pose(P, t) { if (t < 2.3) { const k = (t - 0.4) % 0.35 / 0.35; P.aR = 70 + Math.sin(k * Math.PI) * 18; P.front = true; P.lift += 2; P.eyeScale *= 1.1; } },
    },
  };

  // Clic sobre Eko mientras se esconde: lo encuentras (devuelve true si la travesura lo ha usado)
  function tap() { return !!(cur && cur.tap && cur.tap(A.t - cur.t0, cur)); }
  window.EkoAntics = { run, random, stop, tap, list: Object.keys(DEF), get current() { return cur && cur.name; } };
})();
