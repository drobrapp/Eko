// Eko · su habitación: una casita de muñecas apoyada en la barra de tareas (ventana propia que deja pasar
// los clics). Cuadro en la pared (se van desbloqueando), camita, maceta y trofeo en su balda.
// Eko entra haciéndose pequeñito con la varita: duerme, riega, endereza el cuadro y saca brillo al trofeo.
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
  const C = Object.assign({ off: {}, side: "left", tilt: 4, tiltAt: Date.now(), water: 0, polish: 0, seen: {}, pic: null, picAt: 0 }, store.get("eko-corner", {}));
  const save = () => store.set("eko-corner", C);
  const PG = () => window.EkoProgress;
  const lvl = () => (PG() ? PG().level() : 20);
  const testAll = () => { try { return !!(window.EkoSettings && window.EkoSettings.get().testAll); } catch (_) { return false; } };

  // ---------- La habitación (coordenadas dentro de su ventana, en px) ----------
  const RW = 380, RH = 205;                        // room.webp (521×281) a escala 0,73
  const FLOOR_BACK = 142, FLOOR_FRONT = 186;       // suelo: del fondo al borde delantero
  const GLASS = { x: 261, y: 40, w: 46, h: 44 };   // cristal de la ventana
  const MINI = 0.62;                               // tamaño de Eko dentro de su casa
  const DECO = [
    { id: "bed", lock: "deco:bed", name: "Camita", src: "art/deco-bed.webp", x: 44, w: 122, h: 82, bottom: 170, z: 2 },
    { id: "pot", lock: "deco:pot", name: "Maceta", src: "art/deco-pot.webp", x: 296, w: 50, h: 53, bottom: 186, z: 4 },
    { id: "frame", lock: null, name: "Cuadro", src: null, x: 176, w: 54, h: 68, top: 24, z: 1, wall: true },
    { id: "trophy", lock: "deco:trophy", name: "Trofeo", src: "art/deco-trophy.webp", x: 303, w: 40, h: 38, bottom: 104, z: 1, wall: true },
  ];
  const SHELF = { src: "art/shelf.webp", x: 286, y: 102, w: 76, h: 18 };
  // Cuadros (se desbloquean con el nivel de amistad)
  const PICS = [
    { id: "portrait", name: "Retrato", src: "art/pic-portrait.webp", lv: 1, ar: 212 / 240 },
    { id: "sprout", name: "El brote", src: "art/pic-sprout.webp", lv: 3, ar: 195 / 240 },
    { id: "cookies", name: "Bodegón de galletas", src: "art/pic-cookies.webp", lv: 8, ar: 192 / 240 },
    { id: "sleep", name: "Eko dormilón", src: "art/pic-sleep.webp", lv: 16, ar: 192 / 240 },
    { id: "astro", name: "Eko astronauta", src: "art/pic-astro.webp", lv: 19, ar: 211 / 240 },
  ];
  const picsUnlocked = () => PICS.filter((p) => testAll() || lvl() >= p.lv);
  const picNow = () => { const u = picsUnlocked(); return u.find((p) => p.id === C.pic) || u[u.length - 1] || null; };
  const has = (d) => (d.id === "frame" ? !!picNow() : !PG() || PG().has(d.lock));
  const placed = () => DECO.filter((d) => has(d) && !C.off[d.id]);

  let lay = null;
  function layout() {
    const w = E.world, list = placed();
    if (!list.length || !w.width) return null;
    const x0 = C.side === "right" ? w.left + w.width - 24 - RW : w.left + 24;
    const y0 = w.top + w.height - RH;
    const items = list.map((d) => {
      let { x, w: iw, h } = d, src = d.src;
      if (d.id === "frame") { const p = picNow(); src = p.src; iw = Math.round(h * p.ar); x = d.x + (d.w - iw) / 2; }
      const y = d.top != null ? d.top : d.bottom - h;
      return { id: d.id, src, x, y, w: iw, h, z: d.z, cx: x0 + x + iw / 2, top: y0 + y, bottom: y0 + y + h };
    });
    const shelf = items.some((i) => i.id === "trophy") ? SHELF : null;
    return { x0, y0, w: RW, h: RH, items, shelf, key: [x0, y0, items.map((i) => i.id + i.src).join()].join("|") };
  }
  const item = (id) => lay && lay.items.find((i) => i.id === id);

  // ---------- Ventana de la habitación ----------
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
      lastSend = 0;
    }
    if (performance.now() - lastSend > 1500) send();
  }
  // momento del día para la ventana y la luz
  function sky() {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    return h >= 21.5 || h < 6.5 ? "night" : h >= 19.5 ? "dusk" : h < 8 ? "dawn" : "day";
  }
  function send() {
    if (!lay || !TEV) return;
    lastSend = performance.now();
    TEV.emit("corner-layout", { room: "art/room.webp", glass: GLASS, shelf: lay.shelf, sky: sky(), sleeping: !!(room && room.bed && S.sleeping),
      items: lay.items.map(({ id, src, x, y, w, h, z }) => ({ id, src, x, y, w, h, z })), tilt: C.tilt });
  }
  const fx = (id, kind) => TEV && TEV.emit("corner-fx", { id, kind });
  setInterval(sync, 1000);
  setTimeout(sync, 1500);

  // El cuadro se tuerce poco a poco; y cada par de días Eko cambia de cuadro
  setInterval(() => {
    const hrs = (Date.now() - C.tiltAt) / 3600000;
    if (hrs >= 1.2 && Math.abs(C.tilt) < 12) { C.tilt = (C.tilt >= 0 ? 1 : -1) * Math.min(12, Math.abs(C.tilt) + 1); C.tiltAt = Date.now(); save(); send(); }
  }, 60000);

  // ---------- Frases ----------
  const L = {
    home: ["Me voy un ratito a mi casa", "Voy a mi habitación", "Hogar, dulce hogar", "Un momento, que voy a casa"],
    bedGo: ["Uaaah… me voy a mi camita", "Hora de la siesta. ¡A la cama!", "Mi camita me llama…", "Me voy a acurrucar un ratito"],
    bedWake: ["¡Qué bien se duerme en mi camita!", "He soñado con galletas", "Uf, qué siesta más buena", "Como nuevo"],
    water: ["A regar la plantita…", "Toma, agüita fresca", "Crece, crece…", "Las plantas también tienen sed", "Riego, riego, riego…"],
    waterEnd: ["¡Listo! Ya está contenta", "Creo que me ha sonreído", "Mañana más", "Así crecerá fuerte"],
    frame: ["Este cuadro se tuerce solo…", "Uy, qué torcido está", "Un momento, que esto no está recto", "Así no se puede vivir"],
    frameEnd: ["¡Ahora sí!", "Perfecto. Recto como una regla", "Mucho mejor", "Ya me quedo tranquilo"],
    swap: ["Voy a cambiar de cuadro, que me aburro", "Hoy toca otro cuadro", "¡Redecoración!"],
    swapEnd: ["¿Qué te parece? ¿Mejor así?", "Me encanta este", "Queda precioso"],
    newPic: ["¡Tengo un cuadro nuevo! Lo cuelgo ahora mismo", "¡Un cuadro nuevo para mi pared!", "¡Mira qué cuadro me he ganado!"],
    trophy: ["Le voy a sacar brillo a mi trofeo", "Mi trofeo, mi tesoro", "Tiene que relucir", "Un poquito de brillo…"],
    trophyEnd: ["¡Reluciente!", "Mira cómo brilla", "Mejores amigos, ¿eh?", "Me lo gané contigo"],
    leave: ["¡Ya vuelvo!", "Bueno, de vuelta al escritorio", "Me voy, que tú también me necesitas"],
    unlocked: { bed: "¡Tengo camita nueva! La he puesto en mi habitación", pot: "¡Una maceta! La cuidaré mucho", trophy: "¡El trofeo de mejores amigos! Lo pongo en mi balda" },
  };
  const lastIx = {};
  const line = (k) => { const a = L[k]; let i = Math.floor(Math.random() * a.length); if (a.length > 2 && i === lastIx[k]) i = (i + 1) % a.length; lastIx[k] = i; return a[i]; };
  const say = (k, ms = 2200, g = null) => E.say(L[k] ? line(k) : k, ms, true, g);

  // ---------- Capa de dibujo propia ----------
  const gl = document.createElementNS(NS, "g"); gl.id = "cornerLayer";
  E.el.pet.appendChild(gl);
  let cur = null;
  E.HOOKS.draw.push(() => { if (gl.nextSibling) E.el.pet.appendChild(gl); if (cur && cur.draw) cur.draw(); });
  const scale = () => { try { return gl.getScreenCTM().a || 0.46; } catch (_) { return 0.46; } };
  function toPet(sx, sy) {
    const p = E.el.pet.ownerSVGElement.createSVGPoint(); p.x = sx - S.x; p.y = sy - S.y;
    try { return p.matrixTransform(gl.getScreenCTM().inverse()); } catch (_) { return { x: 0, y: 0 }; }
  }
  const handKey = (dir) => (dir > 0 ? "R" : "L");
  const armKey = (dir) => (dir > 0 ? "aR" : "aL");

  // ---------- Animaciones ----------
  E.ACTIONS.decoWater = { dur: 4.4, f(P, k, e, o) {
    const d = o.dir || 1, a = armKey(d);
    P.front = true; P.turn += 0.3 * d * ease(sm(0, 0.1, k)); P.eyeX = 4 * d; P.eyeY = 3;
    P[a] = lerp(P[a], -d * 72, ease(sm(0, 0.14, k)) * (1 - ease(sm(0.88, 1, k))));
    if (k > 0.85) { P.eyes = "happy"; P.mouth = Math.max(P.mouth, 0.3); }
  } };
  E.ACTIONS.decoPolish = { dur: 4.2, f(P, k, e, o) {
    const d = o.dir || 1, a = armKey(d);
    P.front = true; P.eyeY = -4;
    const on = ease(sm(0, 0.12, k)) * (1 - ease(sm(0.78, 0.9, k)));
    P[a] = lerp(P[a], -d * (128 + Math.sin(A.t * 17) * 14), on);
    P.sway += Math.sin(A.t * 17) * 2 * on;
    if (k > 0.86) { P.eyes = "happy"; P.tilt += 6 * d; }
  } };
  E.ACTIONS.decoFix = { dur: 3.4, f(P, k, e, o) {
    const d = o.dir || 1, a = armKey(d);
    P.front = true; P.eyeY = -5;
    if (k < 0.4) { P.brows = "worried"; P.tilt += 9 * Math.sign(C.tilt || 1) * ease(sm(0, 0.3, k)); }
    const reach = ease(sm(0.35, 0.48, k)) * (1 - ease(sm(0.62, 0.74, k)));
    P[a] = lerp(P[a], -d * 150, reach);
    if (k > 0.48 && k < 0.6) P.lift += 10 * Math.sin(Math.PI * sm(0.48, 0.6, k));
    if (k > 0.74) { P.eyes = "happy"; P.nod += 4 * Math.sin(Math.PI * sm(0.74, 0.9, k)); }
  } };
  E.ACTIONS.decoSwap = { dur: 3.6, f(P, k) {
    P.front = true; P.eyeY = -5;
    const up = ease(sm(0.1, 0.25, k)) * (1 - ease(sm(0.7, 0.85, k)));
    P.aL = lerp(P.aL, 150, up); P.aR = lerp(P.aR, -150, up);
    if (k > 0.3 && k < 0.6) P.lift += 6 * Math.abs(Math.sin(A.t * 8));
    if (k > 0.85) { P.eyes = "happy"; P.mouth = Math.max(P.mouth, 0.3); }
  } };
  // Saltito (para entrar en la habitación, subirse a la cama o bajar)
  E.ACTIONS.roomHop = { dur: 0.7, f(P, k, e, o) {
    P.front = true;
    P.lift += (o.from || 0) + ((o.to || 0) - (o.from || 0)) * ease(k) + 30 * Math.sin(Math.PI * k);
    P.aL = lerp(P.aL, 70, Math.sin(Math.PI * k)); P.aR = lerp(P.aR, -70, Math.sin(Math.PI * k));
  } };

  // Dentro de casa: el cuerpo se sube hasta el suelo (o la cama) de la habitación
  let room = null;                         // { lift, bed, downT }
  E.HOOKS.pose.push((P) => {
    if (!room) return;
    if (S.dragging || S.airborne || S.fly) { leaveNow(); return; }
    if (A.action && A.action.name === "roomHop") return;            // el saltito ya lleva su altura
    if (room.downT) {
      const k = clamp((A.t - room.downT) / 0.55, 0, 1);
      P.lift += room.lift * (1 - ease(k)) + 24 * Math.sin(Math.PI * k);
      if (k >= 1) { room = null; A.inRoom = false; }
      return;
    }
    P.lift += room.lift;
  });
  E.HOOKS.tick.push(() => {
    if (room && room.bed && !room.downT && !S.sleeping && !(A.action && A.action.name === "roomHop")) {
      setTimeout(() => say("bedWake", 2400, "feliz"), 700);
      leave();
    }
    if (cur && (!A.action || A.action.name !== cur.name)) { cur = null; gl.innerHTML = ""; }
  });
  function leaveNow() { room = null; A.inRoom = false; }
  function leave() { if (!room || room.downT) return; room.downT = A.t; tone("sine", 600, 360, 0.15, 0.02); }

  // ---------- Visitas ----------
  let visiting = null;
  const free = () => !visiting && !room && !E.busy() && !S.sleeping && !S.perch && !E.A.hidden && !A.gameMode && !(window.EkoMenu && window.EkoMenu.isOpen && window.EkoMenu.isOpen());
  // dónde se pone Eko para cada cosa (x en pantalla; y del suelo dentro de la habitación)
  function spot(id) {
    const it = item(id); if (!it) return null;
    if (id === "bed") return { x: it.cx, floor: lay.y0 + 158, dir: 1 };
    if (id === "pot") return { x: it.cx - 34, floor: lay.y0 + 176, dir: 1 };
    if (id === "frame") return { x: it.cx + 2, floor: lay.y0 + FLOOR_BACK + 8, dir: 1 };
    if (id === "trophy") return { x: it.cx - 26, floor: lay.y0 + FLOOR_BACK + 8, dir: 1 };
    return null;
  }
  function visit(id, force, opt = {}) {
    lay = layout();
    const sp = spot(id); if (!sp) return false;
    if (!force && !free()) return false;
    if (S.sleeping) E.wakeUp(false);
    visiting = id;
    say(id === "bed" ? "bedGo" : opt.swap ? "swap" : opt.newPic ? "newPic" : id === "pot" ? "water" : id === "frame" ? (opt.say || "frame") : id === "trophy" ? "trophy" : "home", 2200, id === "bed" ? "cansado" : null);
    const ekoC = S.x + E.W / 2;
    E.walkTo(sp.x, Math.abs(sp.x - ekoC) > 500 ? 95 : 60, () => {
      const go = () => enter(id, opt);
      // dentro de casa es pequeñito: varita primero (si ya lo es, entra directo)
      const target = MINI / ((window.EkoSettings && window.EkoSettings.get().size) || 1);
      if (window.EkoMini && Math.abs((A.mini || 1) - target) > 0.05) {
        A.inRoom = true;                                              // que no vuelva a crecer mientras tanto
        if (!window.EkoMini.shrink(target, (ok) => { if (ok) go(); else { A.inRoom = false; visiting = null; } })) go();
      } else go();
    });
    setTimeout(() => { if (visiting === id && S.mode !== "walk" && !room) { visiting = null; A.inRoom = false; } }, 50000);
    return true;
  }
  function enter(id, opt) {
    lay = layout();
    const sp = spot(id); if (!sp) { visiting = null; A.inRoom = false; return; }
    const floorTop = E.world.top + E.world.height;                        // donde pisa normalmente (la barra de tareas)
    const lift = Math.max(0, floorTop - sp.floor) / scale();
    A.inRoom = true;
    S.mode = "idle"; S.modeUntil = A.t + 30; S.facing = sp.dir;
    E.act("roomHop", { from: 0, to: lift });
    tone("sine", 360, 620, 0.15, 0.02);
    setTimeout(() => { visiting = null; room = { lift, bed: false, downT: 0 }; doThing(id, opt); }, 720);
  }
  const done = (secs) => setTimeout(() => { if (room && !room.bed) { if (Math.random() < 0.5) say("leave", 1600); leave(); E.hold(2); } }, secs * 1000);
  function doThing(id, opt) {
    const it = item(id); if (!it || !room) return;
    if (id === "bed") {
      const bedTop = (E.world.top + E.world.height - (it.bottom - it.h * 0.48)) / scale();
      E.act("roomHop", { from: room.lift, to: bedTop });
      room.lift = bedTop; room.bed = true;
      setTimeout(() => { E.goToSleep(false); send(); }, 720);
      return;
    }
    if (id === "pot") {
      const dir = 1;
      E.act("decoWater", { dir });
      const can = K.img("artCan", gl, 70, 70);
      cur = { name: "decoWater", draw() {
        const a = A.action; if (!a || a.name !== "decoWater") return;
        const k = (A.t - a.t0) / a.dur, H = K.hands()[handKey(dir)];
        const show = back(sm(0.06, 0.16, k)) * (1 - ease(sm(0.86, 0.94, k)));
        const pour = ease(sm(0.22, 0.32, k)) * (1 - ease(sm(0.78, 0.86, k)));
        const ang = dir * (-6 + 46 * pour);
        K.place(can, H.x + dir * 22, H.y - 12, ang, Math.max(0.01, show), show > 0.02 ? 1 : 0);
        if (pour > 0.6 && Math.random() < 0.55) K.particle("artDrop", gl, H.x + dir * 50, H.y - 4, { vx: dir * (20 + Math.random() * 30), vy: 30, g: 950, life: 0.55, w: 9, s0: 1, s1: 0.8 });
      } };
      setTimeout(() => { fx("pot", "water"); tone("sine", 900, 700, 0.3, 0.012); }, 1500);
      setTimeout(() => { fx("pot", "happy"); say("waterEnd", 2200, "contento"); C.water = Date.now(); save(); if (window.EkoNeeds) window.EkoNeeds.give("pet"); }, 3600);
      done(5.4);
      return;
    }
    if (id === "frame" && (opt.swap || opt.newPic)) {
      E.act("decoSwap");
      setTimeout(() => { fx("frame", "out"); }, 900);
      setTimeout(() => { C.pic = opt.pic || nextPic(); C.picAt = Date.now(); C.tilt = 0; save(); lay = layout(); send(); fx("frame", "in"); tone("sine", 600, 1000, 0.2, 0.03); }, 1700);
      setTimeout(() => say(opt.newPic ? "swapEnd" : "swapEnd", 2400, "orgulloso"), 2900);
      done(5.6);
      return;
    }
    if (id === "frame") {
      E.act("decoFix", { dir: 1 });
      setTimeout(() => { fx("frame", "fix"); C.tilt = 0; C.tiltAt = Date.now(); save(); send(); tone("sine", 500, 800, 0.12, 0.03); }, 3.4 * 0.48 * 1000);
      setTimeout(() => { say("frameEnd", 2000, "orgulloso"); C.tilt = Math.random() < 0.5 ? 0.5 : -0.5; save(); }, 2700);
      done(4.6);
      return;
    }
    if (id === "trophy") {
      E.act("decoPolish", { dir: 1 });
      const p = toPet(it.cx, it.top + it.h * 0.35);
      cur = { name: "decoPolish", draw() {
        const a = A.action; if (!a || a.name !== "decoPolish") return;
        const k = (A.t - a.t0) / a.dur;
        if (k > 0.15 && k < 0.8 && Math.random() < 0.08) K.sparkle(p.x + (Math.random() - 0.5) * 40, p.y + (Math.random() - 0.3) * 40, 1, gl);
      } };
      setTimeout(() => fx("trophy", "shine"), 1200);
      setTimeout(() => { fx("trophy", "shine"); say("trophyEnd", 2200, "orgulloso"); C.polish = Date.now(); save(); }, 3400);
      done(5.4);
    }
  }
  function nextPic() {
    const u = picsUnlocked(); if (!u.length) return null;
    const i = u.findIndex((p) => p.id === (picNow() || {}).id);
    return u[(i + 1) % u.length].id;
  }

  // ¿Le apetece ir a su casa? (cada minuto, solo si está libre)
  setInterval(() => {
    lay = layout();
    if (!free() || !lay) return;
    const l = E.lastSenses || {};
    if (l.fullscreen || l.in_call) return;
    const h = new Date().getHours(), night = h >= 23 || h < 7;
    const N = window.EkoNeeds && window.EkoNeeds.on() ? window.EkoNeeds.get() : null;
    if (item("bed") && ((N && N.energy < 22) || (night && Math.random() < 0.15))) { visit("bed"); return; }
    if (Math.random() > 0.12) return;
    const opts = [];
    if (item("pot") && Date.now() - C.water > 5 * 3600000) opts.push(["pot"]);
    if (item("frame") && Math.abs(C.tilt) >= 5) opts.push(["frame"]);
    if (item("frame") && picsUnlocked().length > 1 && Date.now() - C.picAt > 2 * 86400000) opts.push(["frame", { swap: true }]);
    if (item("trophy") && Date.now() - C.polish > 4 * 3600000) opts.push(["trophy"]);
    if (opts.length) { const o = opts[Math.floor(Math.random() * opts.length)]; visit(o[0], false, o[1]); }
  }, 60000);

  // Al desbloquear algo nuevo: lo anuncia y va a verlo (o a colgar el cuadro)
  setInterval(() => {
    if (!free()) return;
    for (const d of DECO) if (d.lock && has(d) && !C.seen[d.id]) {
      C.seen[d.id] = 1; save();
      E.say(L.unlocked[d.id], 3200, true, "emocionado");
      if (d.id !== "bed") setTimeout(() => visit(d.id), 3400);
      return;
    }
    const u = picsUnlocked();
    if (!C.seen.pics) { C.seen.pics = u.map((p) => p.id); save(); return; }
    const fresh = u.find((p) => !C.seen.pics.includes(p.id));
    if (fresh) { C.seen.pics.push(fresh.id); save(); visit("frame", false, { newPic: true, pic: fresh.id }); }
  }, 20000);

  // ---------- Menú: «Mi habitación» ----------
  function menuItems() {
    const out = DECO.filter((d) => d.id !== "frame").map((d) => {
      const it = { id: "deco-" + d.id, img: "artDeco" + d.id[0].toUpperCase() + d.id.slice(1), label: d.name, keep: true, on: () => has(d) && !C.off[d.id], run: () => toggle(d.id) };
      if (!has(d)) { it.locked = true; const n = PG() ? Object.entries(PG().LEVELS).find(([, v]) => v.id === d.lock) : null; it.lockText = n ? "Nivel " + n[0] : ""; }
      return it;
    });
    const pics = picsUnlocked();
    out.push({ id: "deco-pic", img: "artDecoFrame", label: "Cambiar cuadro", dyn: () => (picNow() ? picNow().name : "Cuadro"), run: () => {
      if (pics.length < 2) { E.say(`Solo tengo un cuadro. El siguiente llega en el nivel ${(PICS.find((p) => lvl() < p.lv) || {}).lv || "…"}`, 2800, true); return; }
      if (!visit("frame", true, { swap: true })) { C.pic = nextPic(); save(); sync(); send(); }
    } });
    out.push({ id: "corner-go", react: "emocionado", img: "artIcSurprise", label: "¡Ve a tu casa!", run: () => {
      lay = layout(); const p = lay ? lay.items.map((i) => i.id).filter((x) => x !== "bed") : [];
      if (!p.length) { E.say("Aún no tengo nada en casa…", 2400, true); return; }
      visit(p[Math.floor(Math.random() * p.length)], true);
    } });
    out.push({ id: "corner-bed", react: "cansado", img: "artNightcap", label: "A la cama", run: () => { lay = layout(); if (!item("bed")) { E.say("Aún no tengo camita… llega en el nivel 6", 2400, true); return; } visit("bed", true); } });
    out.push({ id: "corner-side", icon: "right", label: "Cambiar de lado", dyn: () => (C.side === "left" ? "Casa a la derecha" : "Casa a la izquierda"), keep: true, run: () => { C.side = C.side === "left" ? "right" : "left"; save(); sync(); } });
    return out;
  }
  function toggle(id) {
    C.off[id] = !C.off[id]; save(); sync();
    if (!C.off[id]) E.say("¡Ahí queda bonito!", 1800, true);
  }

  return { visit, menuItems, layout: () => layout(), toggle, pics: () => picsUnlocked().map((p) => p.id) };
})();
