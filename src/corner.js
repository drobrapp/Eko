// Eko · su casa. Una habitación de muñecas que Eko invoca entre nubes cuando la necesita (o desde el menú
// «Mi casa»). Dentro hay perspectiva: al ir al fondo se da la vuelta, se aleja y se hace pequeño; los muebles
// que quedan delante le tapan. Los objetos nuevos llegan en un paquete con globo: Eko lo abre, saca el objeto
// en pequeño, lo lleva a su sitio y ¡puf!, aparece a tamaño real.
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
  const C = Object.assign({ off: {}, side: "left", tilt: 4, tiltAt: Date.now(), water: 0, polish: 0, pic: null, picAt: 0, got: null }, store.get("eko-corner", {}));
  const save = () => store.set("eko-corner", C);
  const PG = () => window.EkoProgress;
  const ev = (k, v) => { try { PG() && PG().event(k, v); } catch (_) {} };
  const lvl = () => (PG() ? PG().level() : 20);
  const testAll = () => { try { return !!(window.EkoSettings && window.EkoSettings.get().testAll); } catch (_) { return false; } };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- Geometría (px dentro de la ventana de la casa) ----------
  const TOP = 60, RW = 380, RH = 205, WH = RH + TOP;        // hueco arriba para el globo y las nubes
  const FRONT = TOP + 184, BACKY = TOP + 146;               // pies de Eko delante (z = 0) y al fondo (z = 1)
  const footY = (z) => lerp(FRONT, BACKY, z);
  const GLASS = { x: 261, y: TOP + 40, w: 46, h: 44 };
  const MINI = 0.62, FAR = 0.72;                           // tamaño en casa (delante) y cuánto encoge al fondo
  const DOOR = { x: 200, z: 0 };
  const DECO = [
    { id: "bed", lock: "deco:bed", name: "Camita", src: "art/deco-bed.webp", x: 44, w: 122, h: 82, bottom: 170, z: 0.5, spot: { x: 105, z: 0.5 } },
    { id: "pot", lock: "deco:pot", name: "Maceta", src: "art/deco-pot.webp", x: 296, w: 50, h: 53, bottom: 186, z: 0.02, spot: { x: 262, z: 0.14 } },
    { id: "frame", lock: null, name: "Cuadro", src: null, x: 176, w: 54, h: 68, top: 24, z: 1, wall: true, spot: { x: 203, z: 0.95 } },
    { id: "trophy", lock: "deco:trophy", name: "Trofeo", src: "art/deco-trophy.webp", x: 303, w: 40, h: 38, bottom: 104, z: 1, wall: true, spot: { x: 300, z: 0.95 } },
  ];
  const SHELF = { src: "art/shelf.webp", x: 250, y: TOP + 102, w: 114, h: 20 };
  // Recuerdos: cada logro especial deja un objetito en la balda (llega en paquete, como todo)
  const achGot = (id) => { try { return !!(PG() && PG().get().ach[id]); } catch (_) { return false; } };
  const SOUV = [
    { id: "catch", name: "la medalla de atrapa galletas", src: "art/medal.webp", ok: () => ((window.EkoGames && window.EkoGames.best().catch) || 0) >= 30 },
    { id: "glutton", name: "una galleta de recuerdo", src: "art/cookie.webp", ok: () => achGot("glutton") },
    { id: "gardener", name: "mi regadera de jardinero", src: "art/watering-can.webp", ok: () => achGot("gardener") },
    { id: "rps", name: "una bolita de campeón", src: "art/juggle-ball.webp", ok: () => achGot("rps") },
    { id: "loyal", name: "un corazón de 30 días juntos", src: "art/fx-heart.webp", ok: () => achGot("loyal") },
  ];
  const SLOTS = [{ x: 258, w: 20 }, { x: 282, w: 20 }];                 // a la izquierda del trofeo
  // Temporada: calabaza en Halloween (llega en paquete y se va al acabar)
  const season = () => { const d = new Date(), m = d.getMonth() + 1, day = d.getDate(); return (m === 10 && day >= 20) || (m === 11 && day <= 2) ? "pumpkin" : null; };
  const seasonKey = () => season() ? "season:" + season() + ":" + new Date().getFullYear() : null;
  const PARCEL = { x: 178, w: 44, h: 40, z: 0.42 };
  const PICS = [
    { id: "portrait", name: "Retrato", src: "art/pic-portrait.webp", lv: 6, ar: 212 / 240 },
    { id: "sprout", name: "El brote", src: "art/pic-sprout.webp", lv: 7, ar: 195 / 240 },
    { id: "cookies", name: "Bodegón de galletas", src: "art/pic-cookies.webp", lv: 9, ar: 192 / 240 },
    { id: "sleep", name: "Eko dormilón", src: "art/pic-sleep.webp", lv: 16, ar: 192 / 240 },
    { id: "astro", name: "Eko astronauta", src: "art/pic-astro.webp", lv: 19, ar: 211 / 240 },
  ];
  // Lo desbloqueado (por nivel) y lo que ya le ha llegado a casa (C.got). Lo pendiente llega en paquete.
  const unlockedDeco = (d) => !PG() || PG().has(d.lock);
  const unlockedPics = () => PICS.filter((p) => testAll() || lvl() >= p.lv);
  if (!C.got) { C.got = [...DECO.filter((d) => d.lock && unlockedDeco(d)).map((d) => d.id), ...unlockedPics().map((p) => "pic:" + p.id)]; save(); }   // quien ya tenía cosas no recibe paquetes de lo viejo
  const got = (k) => C.got.includes(k);
  const pending = () => [...DECO.filter((d) => d.lock && unlockedDeco(d) && !got(d.id)).map((d) => d.id), ...unlockedPics().filter((p) => !got("pic:" + p.id)).map((p) => "pic:" + p.id),
    ...SOUV.filter((v) => v.ok() && !got("sv:" + v.id)).map((v) => "sv:" + v.id), ...(seasonKey() && !got(seasonKey()) ? [seasonKey()] : [])];
  const picsHave = () => PICS.filter((p) => got("pic:" + p.id));
  setTimeout(() => { try { const c = (PG() && PG().get && (PG().get().cnt || {}).pics) || 0; for (let i = c; i < picsHave().length; i++) ev("pics"); } catch (_) {} }, 6000);   // cuadros que ya tenía
  const picNow = () => { const u = picsHave(); return u.find((p) => p.id === C.pic) || u[u.length - 1] || null; };
  const present = (d) => (d.id === "frame" ? !!picNow() && !C.off.frame : got(d.id) && !C.off[d.id]);
  const hidden = new Set();                                 // ocultos un momento (mientras Eko los coloca)

  let lay = null, parcel = null, building = false;                            // parcel: { id, state: "drop"|"floor"|"open" }
  function layout() {
    const w = E.world; if (!w.width) return null;
    const x0 = C.side === "right" ? w.left + w.width - 24 - RW : w.left + 24;
    const y0 = w.top + w.height - WH;
    const items = DECO.filter((d) => !building && present(d) && !hidden.has(d.id)).map((d) => {
      let { x, w: iw, h } = d, src = d.src;
      if (d.id === "frame") { const p = picNow(); src = p.src; iw = Math.round(h * p.ar); x = d.x + (d.w - iw) / 2; }
      const y = TOP + (d.top != null ? d.top : d.bottom - h);
      return { id: d.id, src, x, y, w: iw, h, z: d.z };
    });
    if (!building) {
      SOUV.filter((v) => got("sv:" + v.id) && !hidden.has("sv:" + v.id)).slice(-2).forEach((v, i) => items.push({ id: "sv:" + v.id, src: v.src, x: SLOTS[i].x, y: TOP + 103 - SLOTS[i].w, w: SLOTS[i].w, h: SLOTS[i].w, z: 1 }));
      const sk = seasonKey();
      if (sk && got(sk) && !hidden.has("season")) items.push({ id: "season", src: "art/hat-pumpkin.webp", x: 70, y: TOP + 188 - 34, w: 36, h: 34, z: 0.03 });
    }
    return { x0, y0, items, shelf: items.some((i) => i.id === "trophy" || i.id.startsWith("sv:")) ? SHELF : null };
  }
  const sx = (x) => lay.x0 + x, sy = (y) => lay.y0 + y;    // ventana de la casa → pantalla

  // ---------- Abrir y cerrar la casa ----------
  let open = false, closeT = 0;
  function sky() { const h = new Date().getHours() + new Date().getMinutes() / 60; return h >= 21.5 || h < 6.5 ? "night" : h >= 19.5 ? "dusk" : h < 8 ? "dawn" : "day"; }
  function send() {
    if (!TEV || !lay) return;
    const mo = new Date().getMonth() + 1;
    TEV.emit("corner-layout", { weather: mo === 12 || mo <= 2 ? "snow" : mo === 10 || mo === 11 ? "leaves" : "", top: TOP, room: "art/room.webp", glass: GLASS, shelf: lay.shelf, sky: sky(), tilt: C.tilt, items: lay.items,
      parcel: parcel ? { x: PARCEL.x, y: TOP + lerp(184, 146, PARCEL.z) - PARCEL.h, w: PARCEL.w, h: PARCEL.h, state: parcel.state } : null });
  }
  const fx = (id, kind, extra) => TEV && TEV.emit("corner-fx", Object.assign({ id, kind }, extra || {}));
  async function openHome() {
    clearTimeout(closeT);
    lay = layout(); if (!lay) return false;
    if (open) { send(); return true; }
    if (!invoke || !E.native) return false;
    open = true;
    await invoke("corner_show", { x: lay.x0, y: lay.y0, w: RW, h: WH }).catch(() => { open = false; });
    if (!open) return false;
    for (let i = 0; i < 4; i++) { await wait(120); send(); }
    fx("room", "appear");
    tone("sine", 420, 840, 0.3, 0.02);
    await wait(700);
    return true;
  }
  function closeHome(delay = 3500) {
    clearTimeout(closeT);
    closeT = setTimeout(() => {
      if (R || trip) return;
      fx("room", "vanish");
      setTimeout(() => { if (!R && !trip) { open = false; invoke && invoke("corner_hide").catch(() => {}); } }, 750);
    }, delay);
  }
  setInterval(() => {
    if (!open) return;
    const l = E.lastSenses || {};
    if (E.A.hidden || l.fullscreen) { abort(); open = false; invoke && invoke("corner_hide").catch(() => {}); return; }
    lay = layout(); send();
  }, 1500);
  setInterval(() => {                                      // el cuadro se tuerce poco a poco
    const hrs = (Date.now() - C.tiltAt) / 3600000;
    if (hrs >= 1.2 && Math.abs(C.tilt) < 12) { C.tilt = (C.tilt >= 0 ? 1 : -1) * Math.min(12, Math.abs(C.tilt) + 1); C.tiltAt = Date.now(); save(); }
  }, 60000);

  // ---------- Frases ----------
  const L = {
    summon: ["¡Casita, aparece!", "Voy a casa un momento", "Hogar, dulce hogar", "Abracadabra… ¡casa!"],
    bed: ["Uaaah… me voy a mi camita", "Hora de la siesta", "Mi camita me llama…", "Me voy a acurrucar un ratito"],
    bedWake: ["¡Qué bien se duerme en mi camita!", "He soñado con galletas", "Uf, qué siesta más buena", "Como nuevo"],
    water: ["A regar la plantita…", "Toma, agüita fresca", "Crece, crece…", "Las plantas también tienen sed"],
    waterEnd: ["¡Listo! Ya está contenta", "Creo que me ha sonreído", "Así crecerá fuerte"],
    frame: ["Este cuadro se tuerce solo…", "Uy, qué torcido está", "Esto no está recto…"],
    frameEnd: ["¡Ahora sí!", "Recto como una regla", "Mucho mejor"],
    swap: ["Voy a cambiar de cuadro", "Hoy toca otro cuadro", "¡Redecoración!"],
    swapEnd: ["¿Qué te parece?", "Me encanta este", "Queda precioso"],
    trophy: ["Le voy a sacar brillo a mi trofeo", "Mi trofeo, mi tesoro", "Tiene que relucir"],
    trophyEnd: ["¡Reluciente!", "Mira cómo brilla", "Me lo gané contigo"],
    parcel: ["¡Me ha llegado un paquete!", "¡Correo! ¡Un paquete para mí!", "¡Un paquete! ¿Qué será?"],
    parcelAsk: ["¿Vamos a casa a abrirlo?", "¿Me acompañas a abrirlo?", "¿Lo abrimos ya?"],
    parcelLater: ["Vale, luego lo abro. ¡Qué intriga!", "Me espera en casa", "Lo guardo para después"],
    opening: ["A ver, a ver…", "¿Qué habrá dentro?", "Qué nervios…"],
    placing: ["Lo pongo aquí…", "Aquí quedará genial", "Justo aquí"],
    placed: ["¡Tachán!", "¡Perfecto!", "¡Me encanta!", "¡Ya es parte de mi casa!"],
    stow: ["Lo guardo un tiempo", "Al bolsillo", "Hasta luego"],
    leave: ["¡Ya vuelvo!", "Bueno, de vuelta al escritorio", "Me voy, que tú también me necesitas"],
  };
  const NAMES = { bed: "una camita", pot: "una maceta", trophy: "el trofeo de mejores amigos" };
  const lastIx = {};
  const line = (k) => { const a = L[k]; let i = Math.floor(Math.random() * a.length); if (a.length > 2 && i === lastIx[k]) i = (i + 1) % a.length; lastIx[k] = i; return a[i]; };
  const say = (k, ms = 2200, g = null) => E.say(L[k] ? line(k) : k, ms, true, g);

  // ---------- Eko dentro: posición, perspectiva, de espaldas, oclusión ----------
  const gl = document.createElementNS(NS, "g"); gl.id = "cornerLayer";
  E.el.pet.appendChild(gl);
  const svg = E.el.pet.ownerSVGElement;
  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML = `<filter id="ekoBlk"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/></filter><mask id="ekoOcc" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="4000" height="4000"><rect x="-2000" y="-2000" width="4000" height="4000" fill="#fff"/><g id="ekoOccG" filter="url(#ekoBlk)"></g></mask>`;
  svg.appendChild(defs);
  const occG = defs.querySelector("#ekoOccG");
  const scale = () => { try { return gl.getScreenCTM().a || 0.46; } catch (_) { return 0.46; } };
  function toPet(px, py) {
    const p = svg.createSVGPoint(); p.x = px - S.x; p.y = py - S.y;
    try { return p.matrixTransform(gl.getScreenCTM().inverse()); } catch (_) { return { x: 0, y: 0 }; }
  }
  const FACE = ["eyes", "mouth", "freckles", "accFace", "propFace", "readGlasses", "mouthShapes", "snack", "bridge", "hl"].map((id) => document.getElementById(id)).filter(Boolean);
  let backOn = false;
  function setBack(on) { if (on === backOn) return; backOn = on; for (const e of FACE) e.style.opacity = on ? "0" : ""; }

  let R = null;          // en casa: { x, z, tw, extra, hopT, hop:{from,to}, walkPh, back, held }
  const baseMini = () => MINI / ((window.EkoSettings && window.EkoSettings.get().size) || 1);
  E.HOOKS.tick.push((dt) => {
    if (!R) return;
    if (S.dragging || S.fly) { abort(); return; }
    const tw = R.tw;
    if (tw) {
      const k = clamp((A.t - tw.t0) / tw.dur, 0, 1), e = k;           // paso constante
      R.x = lerp(tw.x0, tw.x1, e); R.z = lerp(tw.z0, tw.z1, e);
      if (k >= 1) { R.tw = null; tw.done(); }
    }
    S.x = sx(R.x) - E.W / 2;
    if (!S.sleeping) { S.mode = R.sit ? "sit" : "idle"; S.modeUntil = A.t + 5; }
    const m = baseMini() * lerp(1, FAR, R.z);
    if (Math.abs((A.mini || 1) - m) > 0.002) E.setMini(m, true);
    E.stage.classList.add("inhome");                                   // sus bocadillos, encima de la casa y a buen tamaño
    E.stage.style.setProperty("--homeB", ((WH + 12) / (m * ((window.EkoSettings && window.EkoSettings.get().size) || 1))).toFixed(1) + "px");
  });
  E.HOOKS.pose.push((P) => {
    if (!R || !lay) return;
    const floorTop = E.world.top + E.world.height;
    let up = floorTop - sy(footY(R.z)) + (R.extra || 0);
    if (R.hop) { const k = clamp((A.t - R.hop.t0) / 0.6, 0, 1); up = lerp(R.hop.from, R.hop.to, ease(k)) + 26 * Math.sin(Math.PI * k); if (k >= 1) R.hop = null; }
    A.roomLiftPx = up;
    P.lift += up / scale();
    if (R.tw) {                                                      // andando por casa (también hacia el fondo)
      R.walkPh = (R.walkPh || 0) + 0.16;
      const s = Math.sin(R.walkPh);
      P.legL = (P.legL || 0) + s * 9; P.legR = (P.legR || 0) - s * 9; P.lift += Math.abs(s) * 3;
      if (!R.held) { P.aL = lerp(P.aL, 12 + s * 14, 0.6); P.aR = lerp(P.aR, -12 + s * 14, 0.6); }
    }
    if (R.held) { P.aL = lerp(P.aL, R.held.up ? 140 : 32, 0.5); P.aR = lerp(P.aR, R.held.up ? -140 : -32, 0.5); }
    if (backOn) { P.turn = 0; P.hturn = 0; P.eyes = null; }
    else if (R.tw) P.turn += clamp((R.tw.x1 - R.tw.x0) / 120, -0.6, 0.6);
  });
  // Dibujo: lo que lleva en las manos y la máscara de lo que le tapa
  let heldImg = null;
  E.HOOKS.draw.push(() => {
    if (gl.nextSibling) E.el.pet.appendChild(gl);
    if (cur && cur.draw) cur.draw();
    if (R && R.held) {
      if (!heldImg) { heldImg = document.createElementNS(NS, "image"); heldImg.setAttribute("preserveAspectRatio", "xMidYMid meet"); gl.appendChild(heldImg); }
      if (heldImg.getAttribute("href") !== R.held.src) heldImg.setAttribute("href", R.held.src);
      const H = K.hands(), w = R.held.size || 70, s = back(clamp((A.t - R.held.t0) / 0.35, 0, 1)) * (R.held.out ? 1 - clamp((A.t - R.held.out) / 0.3, 0, 1) : 1);
      const x = (H.L.x + H.R.x) / 2, y = (H.L.y + H.R.y) / 2 - (R.held.up ? 34 : 10);
      heldImg.setAttribute("width", w); heldImg.setAttribute("height", w); heldImg.setAttribute("x", -w / 2); heldImg.setAttribute("y", -w / 2);
      K.place(heldImg, x, y, Math.sin(A.t * 3) * 4, Math.max(0.01, s), 1);
    } else if (heldImg) { heldImg.remove(); heldImg = null; }
    // oclusión: muebles del suelo que están más cerca de ti que Eko
    occG.innerHTML = "";
    let any = false;
    if (R && lay) {
      const list = lay.items.filter((i) => !DECO.find((d) => d.id === i.id).wall && i.z < R.z - 0.06);
      if (parcel && PARCEL.z < R.z - 0.06) list.push({ src: "art/parcel.webp", x: PARCEL.x, y: TOP + lerp(184, 146, PARCEL.z) - PARCEL.h, w: PARCEL.w, h: PARCEL.h });
      for (const it of list) {
        const a = toPet(sx(it.x), sy(it.y)), b = toPet(sx(it.x + it.w), sy(it.y + it.h));
        const im = document.createElementNS(NS, "image");
        im.setAttribute("href", it.src); im.setAttribute("x", a.x); im.setAttribute("y", a.y); im.setAttribute("width", b.x - a.x); im.setAttribute("height", b.y - a.y);
        im.setAttribute("preserveAspectRatio", "none");
        occG.appendChild(im); any = true;
      }
    }
    if (any) E.el.pet.setAttribute("mask", "url(#ekoOcc)"); else E.el.pet.removeAttribute("mask");
  });
  let cur = null;

  // Moverse dentro de casa (a velocidad de paseo, en x y en profundidad a la vez)
  function walkIn(x, z) {
    return new Promise((res) => {
      if (!R) return res(false);
      const dist = Math.hypot(x - R.x, (z - R.z) * 90);
      if (dist < 2) { R.x = x; R.z = z; return res(true); }
      setBack(z > R.z + 0.05);                                          // hacia el fondo: de espaldas
      R.tw = { x0: R.x, z0: R.z, x1: x, z1: z, t0: A.t, dur: clamp(dist / 55, 0.4, 3.5), done: () => res(true) };
      if (Math.abs(x - R.x) > 4) S.facing = Math.sign(x - R.x);
    });
  }
  const faceYou = async () => { setBack(false); await wait(250); };
  function hop(from, to) { if (R) R.hop = { from, to, t0: A.t }; tone("sine", 360, 620, 0.15, 0.02); return wait(620); }

  // Entrar y salir
  let trip = null;
  async function goIn() {
    lay = layout();
    const doorX = sx(DOOR.x);
    await new Promise((res) => { E.walkTo(doorX, Math.abs(doorX - (S.x + E.W / 2)) > 500 ? 95 : 60, () => res()); setTimeout(res, 25000); });
    if (!trip) return false;
    const target = baseMini();
    A.inRoom = true;
    if (window.EkoMini && Math.abs((A.mini || 1) - target) > 0.05) {
      const ok = await new Promise((res) => { if (!window.EkoMini.shrink(target, res)) res(true); });
      if (!ok || !trip) { A.inRoom = false; return false; }
    }
    E.hold(1e6);
    R = { x: DOOR.x, z: 0, extra: 0 };
    const floorTop = E.world.top + E.world.height;
    await hop(0, floorTop - sy(footY(0)));
    return !!R;
  }
  async function goOut() {
    if (!R) return;
    await walkIn(DOOR.x, 0); await faceYou();
    if (!R) return;
    if (Math.random() < 0.5) say("leave", 1600);
    const floorTop = E.world.top + E.world.height;
    await hop(floorTop - sy(footY(0)), 0);
    exitRoom();
  }
  function homeOff() { A.roomLiftPx = 0; E.stage.classList.remove("inhome"); }
  function exitRoom() {
    homeOff();
    R = null; setBack(false); E.el.pet.removeAttribute("mask");
    A.inRoom = false;                                                  // el vigilante de tamaño le devuelve su tamaño con la varita
    E.hold(2);
    trip = null;
    closeHome(3500);
  }
  function abort() {
    if (!R && !trip) return;
    homeOff();
    R = null; trip = null; setBack(false); E.el.pet.removeAttribute("mask"); A.inRoom = false;
    hidden.clear(); cur = null;
    closeHome(1500);
  }

  // ---------- Cosas que hace en casa ----------
  async function doBed() {
    const it = DECO[0];
    await walkIn(it.spot.x, it.spot.z); await faceYou();
    if (!R) return "stay";
    const floorTop = E.world.top + E.world.height;
    const bedTop = floorTop - sy(TOP + it.bottom - it.h * 0.5);
    const base = floorTop - sy(footY(R.z));
    await hop(base, bedTop); if (!R) return "stay";
    R.extra = bedTop - base;
    E.goToSleep(false); ev("bedNap");
    return "sleep";
  }
  async function doWater() {
    const it = DECO[1];
    say("water", 2000);
    await walkIn(it.spot.x, it.spot.z); await faceYou(); if (!R) return;
    S.facing = 1;
    E.act("decoWater", { dir: 1 });
    const can = K.img("artCan", gl, 70, 70);
    cur = { draw() {
      const a = A.action; if (!a || a.name !== "decoWater") { can.remove(); cur = null; return; }
      const k = (A.t - a.t0) / a.dur, H = K.hands().R;
      const show = back(sm(0.06, 0.16, k)) * (1 - ease(sm(0.86, 0.94, k)));
      const pour = ease(sm(0.22, 0.32, k)) * (1 - ease(sm(0.78, 0.86, k)));
      K.place(can, H.x + 22, H.y - 12, -6 + 46 * pour, Math.max(0.01, show), show > 0.02 ? 1 : 0);
      if (pour > 0.6 && Math.random() < 0.55) K.particle("artDrop", gl, H.x + 50, H.y - 4, { vx: 20 + Math.random() * 30, vy: 30, g: 950, life: 0.55, w: 9, s0: 1, s1: 0.8 });
    } };
    setTimeout(() => { fx("pot", "water"); tone("sine", 900, 700, 0.3, 0.012); }, 1500);
    await wait(3600);
    fx("pot", "happy"); say("waterEnd", 2200, "contento"); C.water = Date.now(); save(); ev("potWater");
    if (window.EkoNeeds) window.EkoNeeds.give("pet");
    await wait(1200);
  }
  async function doWall(id) {                                          // enderezar el cuadro o sacar brillo al trofeo
    const it = DECO.find((d) => d.id === id);
    say(id === "frame" ? "frame" : "trophy", 2000);
    await walkIn(it.spot.x, it.spot.z); if (!R) return;
    // de espaldas, estirándose hacia la pared
    R.held = null;
    E.act(id === "frame" ? "decoFix" : "decoPolish", { dir: 1 });
    if (id === "frame") {
      await wait(1630); fx("frame", "fix"); C.tilt = 0; C.tiltAt = Date.now(); save(); ev("frameFix"); tone("sine", 500, 800, 0.12, 0.03);
      await wait(1100); await faceYou(); say("frameEnd", 2000, "orgulloso"); C.tilt = Math.random() < 0.5 ? 0.5 : -0.5; save();
    } else {
      await wait(1200); fx("trophy", "shine"); await wait(2200); fx("trophy", "shine");
      await faceYou(); say("trophyEnd", 2200, "orgulloso"); C.polish = Date.now(); save(); ev("polish");
    }
    await wait(1200);
  }
  E.ACTIONS.decoWater = { dur: 4.4, f(P, k) {
    P.front = true; P.turn += 0.3 * ease(sm(0, 0.1, k)); P.eyeX = 4; P.eyeY = 3;
    P.aR = lerp(P.aR, -72, ease(sm(0, 0.14, k)) * (1 - ease(sm(0.88, 1, k))));
    if (k > 0.85) { P.eyes = "happy"; P.mouth = Math.max(P.mouth, 0.3); }
  } };
  E.ACTIONS.decoPolish = { dur: 3.6, f(P, k) {
    const on = ease(sm(0, 0.12, k)) * (1 - ease(sm(0.8, 0.92, k)));
    P.aR = lerp(P.aR, -(150 + Math.sin(A.t * 17) * 14), on); P.aL = lerp(P.aL, 30, on);
    P.sway += Math.sin(A.t * 17) * 2 * on; P.lift += 4 * on;
  } };
  E.ACTIONS.decoFix = { dur: 2.8, f(P, k) {
    if (k < 0.4) P.tilt += 9 * Math.sign(C.tilt || 1) * ease(sm(0, 0.3, k));
    const reach = ease(sm(0.3, 0.5, k)) * (1 - ease(sm(0.7, 0.85, k)));
    P.aR = lerp(P.aR, -160, reach); P.aL = lerp(P.aL, 160, reach * 0.7);
    if (k > 0.5 && k < 0.65) P.lift += 10 * Math.sin(Math.PI * sm(0.5, 0.65, k));
  } };
  E.ACTIONS.parcelOpen = { dur: 1.6, f(P, k) {
    const d = ease(sm(0, 0.3, k)) * (1 - ease(sm(0.75, 1, k)));
    P.nod += 10 * d; P.aL = lerp(P.aL, 50, d); P.aR = lerp(P.aR, -50, d);
    if (k > 0.45 && k < 0.6) { P.aL += 30 * Math.sin(Math.PI * sm(0.45, 0.6, k)); P.aR -= 30 * Math.sin(Math.PI * sm(0.45, 0.6, k)); }
  } };

  // Paquete: baja con globo (si llega ahora) o espera en el suelo; lo abre y coloca lo de dentro
  const srcOf = (key) => key.startsWith("pic:") ? PICS.find((p) => "pic:" + p.id === key).src : key.startsWith("sv:") ? SOUV.find((v) => "sv:" + v.id === key).src : key.startsWith("season:") ? "art/hat-pumpkin.webp" : DECO.find((d) => d.id === key).src;
  async function deliver(key) {
    const fresh = !parcel;
    parcel = { id: key, state: fresh ? "drop" : "floor" };
    send();
    if (fresh) { tone("sine", 700, 500, 0.6, 0.015); await wait(2300); parcel.state = "floor"; send(); fx("parcel", "land"); }
    // va hasta el paquete (de espaldas) y lo abre
    say("opening", 1800, "curioso");
    await walkIn(PARCEL.x + PARCEL.w / 2, PARCEL.z - 0.22); if (!R) return;
    E.act("parcelOpen");
    await wait(800); parcel.state = "open"; send(); fx("parcel", "open"); tone("sine", 600, 1100, 0.2, 0.03);
    await wait(500);
    await faceYou(); if (!R) return;
    R.held = { src: srcOf(key), t0: A.t, size: 64 };
    parcel = null; send(); fx("parcel", "gone");
    E.express && E.express("emocionado", 2);
    E.say(key.startsWith("pic:") ? "¡Un cuadro nuevo: " + PICS.find((p) => "pic:" + p.id === key).name.toLowerCase() + "!" : key.startsWith("sv:") ? "¡Es " + SOUV.find((v) => "sv:" + v.id === key).name + "! Para mi balda de recuerdos" : key.startsWith("season:") ? "¡Una calabaza! ¡Ya es Halloween!" : "¡Es " + NAMES[key] + "!", 2200, true);
    await wait(1600);
    // lo lleva a su sitio
    const d = key.startsWith("pic:") ? DECO.find((x) => x.id === "frame") : key.startsWith("sv:") ? { id: key, spot: { x: 268, z: 0.95 } } : key.startsWith("season:") ? { id: "season", spot: { x: 104, z: 0.08 } } : DECO.find((x) => x.id === key);
    say("placing", 1600);
    await walkIn(d.spot.x, d.spot.z); if (!R) return;
    R.held.up = true;
    await wait(700);
    R.held.out = A.t;
    if (key.startsWith("pic:")) { C.pic = key.slice(4); C.picAt = Date.now(); C.tilt = 0; }
    C.got.push(key); hidden.delete(d.id); save();
    ev("parcel"); if (key.startsWith("pic:")) ev("pics");
    lay = layout(); send();
    fx(d.id, "appear");
    tone("sawtooth", 900, 300, 0.2, 0.02, 1200); setTimeout(() => tone("sine", 700, 1200, 0.15, 0.025), 120);
    await wait(400); R && (R.held = null);
    await faceYou(); say("placed", 2000, "orgulloso"); E.fx && E.fx("spark", 2);
    await wait(1400);
  }
  // Guardar (o volver a sacar) un mueble desde el menú
  async function stow(id) {
    const d = DECO.find((x) => x.id === id);
    await walkIn(d.spot.x, d.spot.z); if (!R) return;
    E.act("parcelOpen");
    await wait(700);
    const it = lay.items.find((i) => i.id === id);
    fx(id, "vanish"); C.off[id] = true; save();
    await wait(300); lay = layout(); send();
    await faceYou();
    if (it) { R.held = { src: it.src, t0: A.t, size: 54 }; await wait(900); R.held.out = A.t; await wait(350); R.held = null; }
    say("stow", 1600);
    await wait(1000);
  }
  async function unstow(id) {
    const d = DECO.find((x) => x.id === id);
    await walkIn(d.spot.x, d.spot.z); await faceYou(); if (!R) return;
    R.held = { src: d.src || picNow().src, t0: A.t, size: 54, up: true };
    await wait(800); R.held.out = A.t;
    C.off[id] = false; save(); lay = layout(); send(); fx(id, "appear");
    tone("sawtooth", 900, 300, 0.2, 0.02, 1200);
    await wait(400); R.held = null; say("placed", 1800, "feliz"); await wait(1000);
  }
  async function swapPic() {
    const u = picsHave(); if (u.length < 2) return;
    const i = u.findIndex((p) => p.id === (picNow() || {}).id), next = u[(i + 1) % u.length];
    say("swap", 1800);
    const d = DECO.find((x) => x.id === "frame");
    await walkIn(d.spot.x, d.spot.z); if (!R) return;
    E.act("decoFix", { dir: 1 }); await wait(1300);
    fx("frame", "vanish"); await wait(350);
    C.pic = next.id; C.picAt = Date.now(); C.tilt = 0; save(); lay = layout(); send(); fx("frame", "appear");
    tone("sine", 600, 1000, 0.2, 0.03);
    await wait(900); await faceYou(); say("swapEnd", 2200, "orgulloso"); await wait(1200);
  }

  // Un viaje a casa: aparece la casa, entra, hace las tareas y sale (o se queda dormido)
  async function go(tasks, why) {
    if (trip || R || !C.built) return false;
    if (S.sleeping) E.wakeUp(false);
    trip = { tasks };
    if (why) say(why, 2000);
    if (!(await openHome())) { trip = null; return false; }
    if (!(await goIn())) { abort(); return false; }
    for (const t of tasks) {
      if (!R) return false;
      if (t === "bed") { const r = await doBed(); if (r === "sleep") { trip = null; return true; } }
      else if (t === "pot") await doWater();
      else if (t === "frame" || t === "trophy") await doWall(t);
      else if (t === "swap") await swapPic();
      else if (t === "look") await lookAround();
      else if (t === "tea") await teaBreak();
      else if (t.startsWith("deliver:")) await deliver(t.slice(8));
      else if (t.startsWith("stow:")) await stow(t.slice(5));
      else if (t.startsWith("unstow:")) await unstow(t.slice(7));
    }
    await goOut();
    return true;
  }
  // Al despertar en la camita: baja y sale de casa
  E.HOOKS.tick.push(() => {
    if (R && R.extra && !S.sleeping && !R.hop && !trip) {
      trip = { tasks: [] };
      const r = R, floorTop = E.world.top + E.world.height, base = floorTop - sy(footY(r.z));
      setTimeout(() => say("bedWake", 2400, "feliz"), 600);
      hop(base + r.extra, base).then(() => { if (R === r) { r.extra = 0; goOut(); } });
    }
  });

  // ---------- Cuándo va a casa ----------
  const free = () => !trip && !R && !E.busy() && !S.sleeping && !S.perch && !E.A.hidden && !A.gameMode && !(window.EkoMenu && window.EkoMenu.isOpen && window.EkoMenu.isOpen());
  const withParcels = (tasks) => [...pending().map((k) => "deliver:" + k), ...tasks];
  setInterval(() => {
    if (!free() || !E.native || !C.built) return;
    const l = E.lastSenses || {};
    if (l.fullscreen || l.in_call) return;
    const h = new Date().getHours(), night = h >= 23 || h < 7;
    const N = window.EkoNeeds && window.EkoNeeds.on() ? window.EkoNeeds.get() : null;
    if (got("bed") && !C.off.bed && ((N && N.energy < 22) || (night && Math.random() < 0.15))) { go(withParcels(["bed"]), "bed"); return; }
    if (Math.random() > 0.12) return;
    const t = [];
    if (got("pot") && !C.off.pot && Date.now() - C.water > 5 * 3600000) t.push("pot");
    if (picNow() && !C.off.frame && Math.abs(C.tilt) >= 5) t.push("frame");
    if (picsHave().length > 1 && Date.now() - C.picAt > 2 * 86400000) t.push("swap");
    if (got("trophy") && !C.off.trophy && Date.now() - C.polish > 4 * 3600000) t.push("trophy");
    if (t.length) go(withParcels([t[Math.floor(Math.random() * t.length)]]), "summon");
  }, 60000);
  // Paquete nuevo: lo anuncia y pregunta si vais a abrirlo
  let asked = "";
  setInterval(() => {
    if (!C.built) { if (houseOpen() && free() && E.native && !asked) { asked = "build"; offerBuild(); } return; }
    const p = pending(); if (!p.length || !free() || !E.native) return;
    const key = p.join();
    if (asked === key) return;
    asked = key;
    E.say(line("parcel"), 2400, true, "emocionado");
    setTimeout(() => {
      const M = window.EkoMenu; if (!M || !free()) return;
      const c = M.card(`<p>${line("parcelAsk")}</p><div class="chips"><button type="button" class="chip main y">¡Vamos!</button><button type="button" class="chip n">Luego</button></div>`);
      if (!c) return;
      const t = setTimeout(() => M.closeCard(), 20000);
      c.querySelector(".y").addEventListener("click", () => { clearTimeout(t); M.closeCard(); go(withParcels([])); });
      c.querySelector(".n").addEventListener("click", () => { clearTimeout(t); M.closeCard(); say("parcelLater", 2000); });
    }, 2600);
  }, 20000);

  // ---------- Desbloquear la casa: una pequeña ceremonia ----------
  const houseOpen = () => testAll() || !PG() || PG().has("deco:bed");
  function offerBuild() {
    E.say("¡Tengo una sorpresa enorme! ¿Me acompañas?", 2800, true, "emocionado");
    setTimeout(() => {
      const M = window.EkoMenu; if (!M || !free()) { asked = ""; return; }
      const c = M.card(`<p>He ahorrado magia para algo muy especial…</p><div class="chips"><button type="button" class="chip main y">¡A ver!</button><button type="button" class="chip n">Luego</button></div>`);
      if (!c) return;
      const t = setTimeout(() => { M.closeCard(); asked = ""; }, 25000);
      c.querySelector(".y").addEventListener("click", () => { clearTimeout(t); M.closeCard(); build(); });
      c.querySelector(".n").addEventListener("click", () => { clearTimeout(t); M.closeCard(); E.say("Vale… ¡pero no tardes, que me muero de ganas!", 2400, true); setTimeout(() => { asked = ""; }, 30 * 60000); });
    }, 2900);
  }
  async function build() {
    if (trip || R || C.built || !invoke || !E.native) return;
    trip = { tasks: [] };
    if (S.sleeping) E.wakeUp(false);
    lay = layout(); if (!lay) { trip = null; return; }
    E.say("Llevo mucho tiempo practicando este hechizo…", 2400, true, "picaro");
    const doorX = sx(DOOR.x);
    await new Promise((res) => { E.walkTo(doorX, 90, () => res()); setTimeout(res, 25000); });
    S.mode = "idle"; S.modeUntil = A.t + 8;
    await wait(400);
    E.act("miniMagic"); await wait(500);
    E.say("¡Casa… CASITA… aparece!", 2200, true);
    await wait(500);
    building = true; lay = layout();
    open = true;
    await invoke("corner_show", { x: lay.x0, y: lay.y0, w: RW, h: WH }).catch(() => { open = false; });
    if (!open) { building = false; trip = null; return; }
    for (let i = 0; i < 3; i++) { await wait(100); send(); }
    fx("room", "build");
    tone("sine", 300, 900, 1.2, 0.025); setTimeout(() => tone("sine", 600, 1200, 0.4, 0.03), 1300);
    await wait(1700);
    building = false; lay = layout(); send();
    lay.items.forEach((it, i) => setTimeout(() => fx(it.id, "appear"), i * 220));
    E.fx && E.fx("heart", 3); E.express && E.express("emocionado", 3); E.hop && E.hop(-420);
    await wait(600);
    E.say("¡Mi propia casa! ¡Gracias por cuidarme tanto!", 3200, true);
    C.built = true; save();
    ev("house");
    await wait(3300);
    trip = null;
    go(["look", ...pending().map((k) => "deliver:" + k)]);
  }
  async function teaBreak() {
    if (!R) return;
    await walkIn(200, 0.3); await faceYou(); if (!R) return;
    R.sit = true; E.useProp && E.useProp("mug", 24, 0);
    E.say(pick(["Siéntate un ratito conmigo", "Respira hondo… así", "Un sorbito de chocolate caliente"]), 2600, true, "sereno");
    await wait(9000); if (!R) return;
    E.say(pick(["¿A que sienta bien parar?", "Mira por la ventana un momento, descansa la vista", "Estira los brazos… ¡arriba!"]), 3000, true);
    await wait(10000); if (!R) return;
    R.sit = false;
    E.say(pick(["¡Listo! Ahora, a seguir con energía", "Gracias por la pausa", "Me ha encantado tu visita"]), 2400, true, "feliz");
    await wait(1600);
  }
  async function lookAround() {
    if (!R) return;
    await walkIn(205, 0.55); if (!R) return;
    E.say(pick(["Ooooh…", "Qué bonita…", "¡Y tiene ventana!"]), 1800, true);
    await wait(1400);
    await walkIn(150, 0.3); await faceYou(); if (!R) return;
    E.express && E.express("enamorado", 2.5);
    E.say(pick(["¡Es perfecta!", "Aquí voy a ser muy feliz", "¡Hogar, dulce hogar!"]), 2200, true);
    await wait(2000);
  }
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ---------- Menú «Mi casa» ----------
  function menuItems() {
    if (!houseOpen()) return [{ id: "home-locked", img: "artDecoBed", label: "Mi casa", locked: true, lockText: "Nivel 6", run: () => {} }];
    if (!C.built) return [{ id: "home-build", react: "emocionado", img: "artDecoBed", label: "¡Construir mi casa!", run: () => build() }];
    const out = [{ id: "home-go", react: "emocionado", img: "artDecoBed", label: "Ir a casa", run: () => {
      const t = withParcels([]);
      if (!t.length) { const opts = []; if (got("pot") && !C.off.pot) opts.push("pot"); if (picNow()) opts.push("frame"); if (got("trophy") && !C.off.trophy) opts.push("trophy"); t.push(opts.length ? opts[Math.floor(Math.random() * opts.length)] : "frame"); }
      go(t, "summon");
    } }];
    out.push({ id: "home-bed", react: "cansado", img: "artNightcap", label: "A la cama", run: () => { if (!got("bed")) { E.say("Aún no tengo camita… llega en el nivel 6", 2400, true); return; } if (C.off.bed) C.off.bed = false; go(withParcels(["bed"]), "bed"); } });
    for (const d of DECO.filter((x) => x.lock)) {
      const it = { id: "deco-" + d.id, img: "artDeco" + d.id[0].toUpperCase() + d.id.slice(1), label: d.name, keep: true, on: () => got(d.id) && !C.off[d.id], run: () => {
        if (!got(d.id)) { go(withParcels([])); return; }
        go([C.off[d.id] ? "unstow:" + d.id : "stow:" + d.id]);
      } };
      if (!unlockedDeco(d)) { it.locked = true; const n = PG() ? Object.entries(PG().LEVELS).find(([, v]) => v.id === d.lock) : null; it.lockText = n ? "Nivel " + n[0] : ""; }
      out.push(it);
    }
    out.push({ id: "home-pic", img: "artDecoFrame", label: "Cambiar cuadro", dyn: () => (picNow() ? picNow().name : "Cuadro"), run: () => {
      if (picsHave().length < 2) { E.say(`Solo tengo un cuadro. El siguiente llega en el nivel ${(PICS.find((p) => lvl() < p.lv) || {}).lv || "…"}`, 2800, true); return; }
      go(["swap"]);
    } });
    out.push({ id: "home-side", icon: "right", label: "Cambiar de lado", dyn: () => (C.side === "left" ? "Casa a la derecha" : "Casa a la izquierda"), keep: true, run: () => { if (open || R) { E.say("Espera a que salga de casa", 1800, true); return; } C.side = C.side === "left" ? "right" : "left"; save(); E.say(C.side === "left" ? "Mi casa irá a la izquierda" : "Mi casa irá a la derecha", 1800, true); } });
    return out;
  }

  return { go, menuItems, pending, inside: () => !!R, state: () => (!houseOpen() ? "locked" : !C.built ? "build" : "built") };
})();
