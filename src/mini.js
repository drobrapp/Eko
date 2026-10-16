// Eko · tamaño mágico: se encoge con la varita para subirse (o esconderse) en un icono del escritorio
// y recupera su tamaño al bajar. A veces el hechizo sale regular… y lo arregla con otro toque.
window.EkoMini = (() => {
  "use strict";
  const E = window.Eko, T = window.EkoTricks;
  if (!E || !T || !T.kit || !E.setMini) return null;
  const { A, S } = E;
  const K = T.kit, { lerp, clamp, sm, ease, back, tone } = K;
  const NS = "http://www.w3.org/2000/svg";
  const size = () => { try { return (window.EkoSettings && window.EkoSettings.get().size) || 1; } catch (_) { return 1; } };

  // Tamaño para que quede proporcionado al icono (la imagen del icono es ~60 % del ancho de su celda)
  function sizeFor(ic) {
    const iconPx = clamp((ic.w || 76) * 0.62, 26, 120);
    return clamp((iconPx * 1.3) / (125 * size()), 0.28, 0.9);
  }

  const L = {
    pre: ["Mmm… soy demasiado grande para esto", "No quepo… ¡pero tengo un truco!", "Un momento, que me hago pequeñito", "Esto requiere magia", "Si fuera más pequeño…"],
    post: ["¡Mírame qué mini!", "¡Tamaño bolsillo!", "Ahora sí quepo", "¡Chiquitín!"],
    fail: ["¡Uy! ¡Demasiado pequeño!", "¡Ay, me he pasado!", "¡Socorro, soy una miga!"],
    fix: ["Vale, así mejor", "Un poquito más… ¡ahí!", "Perfecto, ejem"],
    grow: ["¡Y vuelvo a mi tamaño!", "¡Boing!", "Ah, mucho mejor", "Ser grande también mola"],
  };
  const last = {};
  const line = (k) => { const a = L[k]; let i = Math.floor(Math.random() * a.length); if (a.length > 2 && i === last[k]) i = (i + 1) % a.length; last[k] = i; return a[i]; };

  // Capa propia para la varita
  const gl = document.createElementNS(NS, "g"); gl.id = "miniLayer";
  E.el.pet.appendChild(gl);
  let wand = null;
  E.HOOKS.draw.push(() => {
    if (gl.nextSibling) E.el.pet.appendChild(gl);
    const a = A.action;
    if (!a || a.name !== "miniMagic") { if (wand) { wand.remove(); wand = null; } return; }
    if (!wand) wand = K.img("artWand", gl, 18, 66);
    const k = (A.t - a.t0) / a.dur, H = K.hands().R;
    const show = back(sm(0, 0.15, k)) * (1 - ease(sm(0.85, 0.97, k)));
    // apunta a su propia cabeza y da el toque
    const ang = k < 0.3 ? 30 : k < 0.5 ? lerp(-40, -75, ease(sm(0.3, 0.5, k))) : 25;
    const rad = (ang - 90) * Math.PI / 180;
    K.place(wand, H.x + Math.cos(rad) * 22, H.y + Math.sin(rad) * 22, ang, Math.max(0.01, show), show > 0.02 ? 1 : 0);
    if (k > 0.3 && k < 0.5 && Math.random() < 0.25) K.sparkle(H.x + Math.cos(rad) * 52, H.y + Math.sin(rad) * 52, 1, gl);
  });
  E.ACTIONS.miniMagic = { dur: 1.6, f(P, k) {
    P.front = true;
    const up = ease(sm(0, 0.18, k)) * (1 - ease(sm(0.85, 1, k)));
    P.aR = lerp(P.aR, k < 0.3 ? -60 : -150 + Math.sin(A.t * 10) * 10, up);
    P.eyeY = -4; P.eyeX = 2; P.brows = "up";
    if (k > 0.45 && k < 0.6) { P.eyes = "closed"; P.sy *= 1 - 0.08 * Math.sin(Math.PI * sm(0.45, 0.6, k)); }
    if (k > 0.7) { P.eyes = "happy"; P.mouth = Math.max(P.mouth, 0.3); }
  } };

  function poof() {
    K.smoke(0, 120, 8, K.ground, 58);
    K.sparkle(0, 40, 6, K.ground);
    tone("sawtooth", 900, 250, 0.22, 0.02, 1300);
    setTimeout(() => tone("sine", 700, 1100, 0.12, 0.025), 120);
  }
  // Varita → ¡puf! → nuevo tamaño (with: frase antes; after: al terminar)
  function cast(target, before, done) {
    if (S.sleeping) E.wakeUp(false);
    S.mode = "idle"; S.modeUntil = A.t + 2.4; S.vx = 0;
    A.action = null;
    if (before) E.say(before, 1600, true);
    setTimeout(() => {
      if (S.dragging || S.fly) { done && done(false); return; }
      E.act("miniMagic");
      setTimeout(() => { poof(); E.setMini(target); }, 800);
      setTimeout(() => done && done(true), 1650);
    }, before ? 900 : 100);
  }
  let busy = false;
  function shrink(target, done) {
    if (busy) return false;
    busy = true;
    const fail = Math.random() < 0.12;
    cast(fail ? target * 0.55 : target, line("pre"), (ok) => {
      if (!ok) { busy = false; E.setMini(1); done && done(false); return; }
      if (fail) {
        E.express && E.express("asustado", 1.6);
        E.say(line("fail"), 1600, true);
        setTimeout(() => cast(target, null, (ok2) => { if (ok2) E.say(line("fix"), 1600, true); busy = false; done && done(ok2); }), 1400);
        return;
      }
      if (Math.random() < 0.6) E.say(line("post"), 1500, true);
      busy = false;
      done && done(true);
    });
    return true;
  }
  function grow(done) {
    if (busy) return;
    busy = true;
    cast(1, null, () => { if (Math.random() < 0.7) E.say(line("grow"), 1500, true); busy = false; done && done(); });
  }

  // Cuando ya no está en un icono (ha bajado, lo has cogido, se ha caído…) recupera su tamaño
  let offSince = 0;
  E.HOOKS.tick.push(() => {
    const m = A.mini || 1;
    if (m >= 0.99 || busy) { offSince = 0; return; }
    const onIcon = S.perch && S.perch.icon;
    const travelling = S.fly || (S.mode === "fly");
    if (onIcon || travelling || S.airborne || S.dragging || A.gameMode) { offSince = 0; return; }
    if (!offSince) offSince = A.t;
    if (A.t - offSince > 0.6 && !E.busy() && !A.action) { offSince = 0; grow(); }
    else if (A.t - offSince > 6) { offSince = 0; E.setMini(1); }           // por si acaso: nunca se queda pequeño
  });

  return { sizeFor, shrink, grow };
})();
