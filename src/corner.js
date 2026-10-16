// Eko · fase 5: su rincón. Camita, maceta, cuadro y trofeo en una esquina de la barra de tareas
// (ventana transparente propia que deja pasar los clics). Eko los visita: duerme en la cama,
// riega la maceta, endereza el cuadro y le saca brillo al trofeo.
window.EkoCorner = (() => {
  "use strict";
  const E = window.Eko, T = window.EkoTricks;
  if (!E || !T || !T.kit) return null;
  const { A, S } = E;
  const K = T.kit, { lerp, clamp, sm, ease, back, tone } = K;
  const NS = "http://www.w3.org/2000/svg";
  const invoke = window.__TAURI__ ? window.__TAURI__.core.invoke : null;
  const TEV = window.__TAURI__ ? window.__TAURI__.event : null;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
  };
  const C = Object.assign({ off: {}, side: "left", tilt: 4, tiltAt: Date.now(), water: 0, polish: 0, seen: {} }, store.get("eko-corner", {}));
  const save = () => store.set("eko-corner", C);
  const PG = () => window.EkoProgress;

  // Muebles (alto en px de pantalla; ancho según la imagen recortada)
  const DECO = [
    { id: "bed", lock: "deco:bed", name: "Camita", src: "art/deco-bed.webp", h: 88, ar: 320 / 215, off: 0 },
    { id: "pot", lock: "deco:pot", name: "Maceta", src: "art/deco-pot.webp", h: 74, ar: 208 / 220, off: 58 },
    { id: "frame", lock: "deco:frame", name: "Cuadro", src: "art/deco-frame.webp", h: 84, ar: 174 / 220, off: 52 },
    { id: "trophy", lock: "deco:trophy", name: "Trofeo", src: "art/deco-trophy.webp", h: 66, ar: 220 / 208, off: 54 },
  ];
  const has = (d) => !PG() || PG().has(d.lock);
  const placed = () => DECO.filter((d) => has(d) && !C.off[d.id]);
  const CH = 140, PAD = 14, GAP = 16, MARGIN = 26;

  // Distribución: posiciones en la ventana del rincón y en la pantalla
  let lay = null;
  function layout() {
    const w = E.world, list = placed();
    if (!list.length || !w.width) return null;
    let x = PAD;
    const items = list.map((d) => { const iw = Math.round(d.h * d.ar), it = { id: d.id, src: d.src, x, y: CH - d.h - 2, w: iw, h: d.h }; x += iw + GAP; return it; });
    const cw = x - GAP + PAD;
    const x0 = C.side === "right" ? w.left + w.width - MARGIN - cw : w.left + MARGIN;
    const y0 = w.top + w.height - CH;
    for (const it of items) { it.cx = x0 + it.x + it.w / 2; it.top = y0 + it.y; }
    return { x0, y0, w: cw, h: CH, items, key: [x0, y0, cw, items.map((i) => i.id).join()].join("|") };
  }
  const item = (id) => lay && lay.items.find((i) => i.id === id);

  // ---------- Ventana del rincón ----------
  let shown = false, lastKey = "", lastSend = 0;
  function sync() {
    if (!invoke || !TEV || !E.native) return;
    const l = E.lastSenses || {};
    lay = layout();
    const want = !!lay && !E.A.hidden && !l.fullscreen;
    if (!want) { if (shown) { shown = false; invoke("corner_hide").catch(() => {}); } lastKey = ""; return; }
    if (!shown || lay.key !== lastKey) {
      shown = true; lastKey = lay.key;
      invoke("corner_show", { x: lay.x0, y: lay.y0, w: lay.w, h: lay.h }).catch(() => { shown = false; });
    }
    if (performance.now() - lastSend > 1500) send();
  }
  function send() {
    if (!lay || !TEV) return;
    lastSend = performance.now();
    TEV.emit("corner-layout", { items: lay.items.map(({ id, src, x, y, w, h }) => ({ id, src, x, y, w, h })), tilt: C.tilt });
  }
  const fx = (id, kind) => TEV && TEV.emit("corner-fx", { id, kind });
  setInterval(sync, 1000);
  setTimeout(sync, 1500);

  // El cuadro se tuerce poco a poco (un grado cada hora y pico, hasta 12)
  setInterval(() => {
    const hrs = (Date.now() - C.tiltAt) / 3600000;
    if (hrs >= 1.2 && Math.abs(C.tilt) < 12) { C.tilt = (C.tilt >= 0 ? 1 : -1) * Math.min(12, Math.abs(C.tilt) + 1); C.tiltAt = Date.now(); save(); send(); }
  }, 60000);

  // ---------- Frases ----------
  const L = {
    bedGo: ["Uaaah… me voy a mi camita", "Hora de la siesta. ¡A la cama!", "Mi camita me llama…", "Me voy a acurrucar un ratito"],
    bedWake: ["¡Qué bien se duerme en mi camita!", "He soñado con galletas", "Uf, qué siesta más buena", "Como nuevo"],
    water: ["A regar la plantita…", "Toma, agüita fresca", "Crece, crece…", "Las plantas también tienen sed", "Riego, riego, riego…"],
    waterEnd: ["¡Listo! Ya está contenta", "Creo que me ha sonreído", "Mañana más", "Así crecerá fuerte"],
    frame: ["Este cuadro se tuerce solo…", "Uy, qué torcido está", "Un momento, que esto no está recto", "Así no se puede vivir"],
    frameEnd: ["¡Ahora sí!", "Perfecto. Recto como una regla", "Mucho mejor", "Ya me quedo tranquilo"],
    trophy: ["Le voy a sacar brillo a mi trofeo", "Mi trofeo, mi tesoro", "Tiene que relucir", "Un poquito de brillo…"],
    trophyEnd: ["¡Reluciente!", "Mira cómo brilla", "Mejores amigos, ¿eh?", "Me lo gané contigo"],
    unlocked: { bed: "¡Tengo camita nueva! La he puesto en mi rincón", pot: "¡Una maceta! La cuidaré mucho", frame: "¡Un cuadro para mi rincón!", trophy: "¡El trofeo de mejores amigos! Lo pongo en mi rincón" },
  };
  const lastIx = {};
  const line = (k) => { const a = L[k]; let i = Math.floor(Math.random() * a.length); if (a.length > 2 && i === lastIx[k]) i = (i + 1) % a.length; lastIx[k] = i; return a[i]; };
  const say = (k, ms = 2200, g = null) => E.say(L[k] ? line(k) : k, ms, true, g);

  // ---------- Capa de dibujo propia ----------
  const gl = document.createElementNS(NS, "g"); gl.id = "cornerLayer";
  E.el.pet.appendChild(gl);
  E.HOOKS.draw.push(() => { if (gl.nextSibling) E.el.pet.appendChild(gl); if (cur && cur.draw) cur.draw(); });
  let cur = null;
  const scale = () => { try { return gl.getScreenCTM().a || 0.46; } catch (_) { return 0.46; } };
  // punto de la pantalla → coordenadas del muñeco
  function toPet(sx, sy) {
    const p = E.el.pet.ownerSVGElement.createSVGPoint(); p.x = sx - S.x; p.y = sy - S.y;
    try { return p.matrixTransform(gl.getScreenCTM().inverse()); } catch (_) { return { x: 0, y: 0 }; }
  }
  const handKey = (dir) => (dir > 0 ? "R" : "L");
  const armKey = (dir) => (dir > 0 ? "aR" : "aL");

  // Regar la maceta
  E.ACTIONS.decoWater = { dur: 4.4, f(P, k, e, o) {
    const d = o.dir || 1, a = armKey(d);
    P.front = true; P.turn += 0.3 * d * ease(sm(0, 0.1, k)); P.eyeX = 4 * d; P.eyeY = 3;
    const up = ease(sm(0, 0.14, k)) * (1 - ease(sm(0.88, 1, k)));
    P[a] = lerp(P[a], -d * 72, up);
    if (k > 0.85) { P.eyes = "happy"; P.mouth = Math.max(P.mouth, 0.3); }
  } };
  // Sacar brillo al trofeo
  E.ACTIONS.decoPolish = { dur: 4.2, f(P, k, e, o) {
    const d = o.dir || 1, a = armKey(d);
    P.front = true; P.turn += 0.3 * d * ease(sm(0, 0.1, k)); P.eyeX = 4 * d; P.eyeY = 2;
    const on = ease(sm(0, 0.12, k)) * (1 - ease(sm(0.78, 0.9, k)));
    P[a] = lerp(P[a], -d * (52 + Math.sin(A.t * 17) * 16), on);
    P.sway += Math.sin(A.t * 17) * 2 * on;
    if (k > 0.86) { P.eyes = "happy"; P.tilt += 6 * d; P.aL = lerp(P.aL, 40, sm(0.86, 0.95, k)); P.aR = lerp(P.aR, -40, sm(0.86, 0.95, k)); }
  } };
  // Enderezar el cuadro
  E.ACTIONS.decoFix = { dur: 3.4, f(P, k, e, o) {
    const d = o.dir || 1, a = armKey(d);
    P.front = true; P.turn += 0.3 * d * ease(sm(0, 0.1, k));
    if (k < 0.4) { P.eyeX = 4 * d; P.eyeY = -1; P.brows = "worried"; P.tilt += 8 * d * ease(sm(0, 0.3, k)); }      // lo mira de lado
    const reach = ease(sm(0.35, 0.48, k)) * (1 - ease(sm(0.62, 0.74, k)));
    P[a] = lerp(P[a], -d * 105, reach);
    if (k > 0.48 && k < 0.6) P.lift += 6 * Math.sin(Math.PI * sm(0.48, 0.6, k));
    if (k > 0.74) { P.eyes = "happy"; P.nod += 4 * Math.sin(Math.PI * sm(0.74, 0.9, k)); }
  } };
  // Saltito a la cama
  E.ACTIONS.decoBedHop = { dur: 0.75, f(P, k, e, o) {
    P.front = true;
    const L0 = o.lift || 0;
    P.lift += L0 * ease(k) + 34 * Math.sin(Math.PI * k);
    P.aL = lerp(P.aL, 70, Math.sin(Math.PI * k)); P.aR = lerp(P.aR, -70, Math.sin(Math.PI * k));
  } };

  // En la cama: sube el cuerpo mientras duerme; al despertar, salta al suelo
  let bed = null;                         // { lift (unidades del muñeco), downT }
  E.HOOKS.pose.push((P) => {
    if (!bed) return;
    if (S.dragging || S.airborne) { bed = null; return; }
    if (bed.downT) {
      const k = clamp((A.t - bed.downT) / 0.55, 0, 1);
      P.lift += bed.lift * (1 - ease(k)) + 26 * Math.sin(Math.PI * k);
      if (k >= 1) bed = null;
      return;
    }
    P.lift += bed.lift;
  });
  E.HOOKS.tick.push(() => {
    if (bed && !bed.downT && !S.sleeping && !(A.action && A.action.name === "decoBedHop")) {
      bed.downT = A.t; tone("sine", 600, 360, 0.15, 0.02);
      setTimeout(() => say("bedWake", 2400, "feliz"), 900);
    }
    if (cur && (!A.action || A.action.name !== cur.name)) { cur = null; gl.innerHTML = ""; }
  });

  // ---------- Visitas ----------
  let visiting = null;
  const free = () => !visiting && !E.busy() && !S.sleeping && !S.perch && !E.A.hidden && !A.gameMode && !(window.EkoMenu && window.EkoMenu.isOpen && window.EkoMenu.isOpen());
  function visit(id, force) {
    lay = layout();
    const it = item(id); if (!it) return false;
    if (!force && !free()) return false;
    if (S.sleeping) E.wakeUp(false);
    const d0 = DECO.find((x) => x.id === id);
    const ekoC = S.x + E.W / 2;
    const dir = it.cx >= ekoC ? 1 : -1;
    const stand = it.cx - dir * d0.off;
    visiting = id;
    if (id === "bed") say("bedGo", 2200, "cansado");
    else if (id === "pot") say("water", 2000);
    else if (id === "frame") say("frame", 2200, "confundido");
    else say("trophy", 2000, "orgulloso");
    E.walkTo(stand, Math.abs(stand - ekoC) > 500 ? 90 : 60, () => arrive(id, id === "bed" ? 1 : dir));
    setTimeout(() => { if (visiting === id && S.mode !== "walk") visiting = null; }, 45000);
    return true;
  }
  function arrive(id, dir) {
    visiting = null;
    S.facing = dir;
    lay = layout();
    const it = item(id); if (!it) return;
    if (id === "bed") {
      const lift = (it.h * 0.42) / scale();
      E.act("decoBedHop", { lift });
      tone("sine", 360, 620, 0.15, 0.02);
      setTimeout(() => { bed = { lift, downT: 0 }; E.goToSleep(false); }, 760);
      return;
    }
    if (id === "pot") {
      E.act("decoWater", { dir });
      const can = K.img("artCan", gl, 70, 70);
      cur = { name: "decoWater", draw() {
        const a = A.action; if (!a || a.name !== "decoWater") return;
        const k = (A.t - a.t0) / a.dur, H = K.hands()[handKey(dir)];
        const show = back(sm(0.06, 0.16, k)) * (1 - ease(sm(0.86, 0.94, k)));
        const pour = ease(sm(0.22, 0.32, k)) * (1 - ease(sm(0.78, 0.86, k)));
        const ang = dir * (-6 + 46 * pour);
        K.place(can, H.x + dir * 22, H.y - 12, ang, Math.max(0.01, show), show > 0.02 ? 1 : 0);
        if (pour > 0.6 && Math.random() < 0.55) {
          const sx = H.x + dir * 50, sy = H.y - 4;
          K.particle("artDrop", gl, sx, sy, { vx: dir * (20 + Math.random() * 30), vy: 30, g: 950, life: 0.55, w: 9, s0: 1, s1: 0.8 });
        }
      } };
      setTimeout(() => { fx("pot", "water"); tone("sine", 900, 700, 0.3, 0.012); }, 1500);
      setTimeout(() => { fx("pot", "happy"); say("waterEnd", 2200, "contento"); C.water = Date.now(); save(); if (window.EkoNeeds) window.EkoNeeds.give("pet"); }, 3600);
      return;
    }
    if (id === "frame") {
      E.act("decoFix", { dir });
      setTimeout(() => { fx("frame", "fix"); C.tilt = 0; C.tiltAt = Date.now(); save(); send(); tone("sine", 500, 800, 0.12, 0.03); }, 3.4 * 0.48 * 1000);
      setTimeout(() => { say("frameEnd", 2000, "orgulloso"); C.tilt = Math.random() < 0.5 ? 0.5 : -0.5; save(); }, 2700);
      return;
    }
    if (id === "trophy") {
      E.act("decoPolish", { dir });
      const p = toPet(it.cx, it.top + it.h * 0.3);
      cur = { name: "decoPolish", draw() {
        const a = A.action; if (!a || a.name !== "decoPolish") return;
        const k = (A.t - a.t0) / a.dur;
        if (k > 0.15 && k < 0.8 && Math.random() < 0.08) K.sparkle(p.x + (Math.random() - 0.5) * 40, p.y + (Math.random() - 0.3) * 40, 1, gl);
      } };
      setTimeout(() => fx("trophy", "shine"), 1200);
      setTimeout(() => { fx("trophy", "shine"); say("trophyEnd", 2200, "orgulloso"); C.polish = Date.now(); save(); }, 3400);
    }
  }

  // ¿Le apetece ir a su rincón? (cada minuto, solo si está libre)
  setInterval(() => {
    if (!free() || !lay) return;
    const l = E.lastSenses || {};
    if (l.fullscreen || l.in_call) return;
    const h = new Date().getHours(), night = h >= 23 || h < 7;
    const N = window.EkoNeeds && window.EkoNeeds.on() ? window.EkoNeeds.get() : null;
    if (item("bed") && ((N && N.energy < 22) || (night && Math.random() < 0.15))) { visit("bed"); return; }
    if (Math.random() > 0.12) return;
    const opts = [];
    if (item("pot") && Date.now() - C.water > 5 * 3600000) opts.push("pot");
    if (item("frame") && Math.abs(C.tilt) >= 5) opts.push("frame");
    if (item("trophy") && Date.now() - C.polish > 4 * 3600000) opts.push("trophy");
    if (opts.length) visit(opts[Math.floor(Math.random() * opts.length)]);
  }, 60000);

  // Al desbloquear un mueble nuevo: lo anuncia y va a verlo
  setInterval(() => {
    for (const d of DECO) if (has(d) && !C.seen[d.id]) {
      C.seen[d.id] = 1; save();
      setTimeout(() => { E.say(L.unlocked[d.id], 3200, true, "emocionado"); if (d.id !== "bed") setTimeout(() => visit(d.id), 3400); }, 8000);
      break;
    }
  }, 20000);

  // ---------- Menú: «Mi rincón» ----------
  function menuItems() {
    const out = DECO.map((d) => {
      const it = { id: "deco-" + d.id, img: "artDeco" + d.id[0].toUpperCase() + d.id.slice(1), label: d.name, keep: true, on: () => has(d) && !C.off[d.id], run: () => toggle(d.id) };
      if (!has(d)) { it.locked = true; const n = window.EkoProgress ? Object.entries(window.EkoProgress.LEVELS).find(([, v]) => v.id === d.lock) : null; it.lockText = n ? "Nivel " + n[0] : ""; }
      return it;
    });
    out.push({ id: "corner-go", react: "emocionado", img: "artIcSurprise", label: "¡Ve a tu rincón!", run: () => { const p = placed(); if (!p.length) { E.say("Aún no tengo muebles… ¡sube de nivel conmigo!", 2600, true); return; } const ids = p.map((x) => x.id).filter((x) => x !== "bed"); visit(ids.length ? ids[Math.floor(Math.random() * ids.length)] : "bed", true); } });
    out.push({ id: "corner-bed", react: "cansado", img: "artNightcap", label: "A la cama", run: () => { if (!item("bed") && !(lay = layout(), item("bed"))) { E.say("Aún no tengo camita…", 2200, true); return; } visit("bed", true); } });
    out.push({ id: "corner-side", icon: "right", label: C.side === "left" ? "Rincón a la derecha" : "Rincón a la izquierda", dyn: () => (C.side === "left" ? "Rincón a la derecha" : "Rincón a la izquierda"), keep: true, run: () => { C.side = C.side === "left" ? "right" : "left"; save(); sync(); } });
    return out;
  }
  function toggle(id) {
    C.off[id] = !C.off[id]; save(); sync();
    if (!C.off[id]) E.say("¡Ahí queda bonito!", 1800, true);
  }

  return { visit, menuItems, layout: () => layout(), toggle };
})();
