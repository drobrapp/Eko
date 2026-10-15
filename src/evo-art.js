// Eko · arte de la evolución (brote, hojas, capullo, flor, motitas). Lo usan main.js y la lámina de detalle.
// Todo se dibuja en el sistema de la cabeza de Eko: la coronilla está en (0,-101).
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const STEM = ["", "M0,-101 C-0.6,-104 -0.8,-108 0,-112", "M0,-101 C-2.5,-108 -3,-117 1,-127", "M0,-101 C-3,-110 -4.5,-124 1,-139", "M0,-101 C-3,-110 -4.5,-124 1,-139"];
  const TOP = [0, -112, -127, -139, -139];
  const SCALE = [0, 0.8, 0.95, 1, 1.06];
  const seasonOf = (d = new Date()) => { const m = d.getMonth(); return m === 11 || m < 2 ? "winter" : m < 5 ? "spring" : m < 8 ? "summer" : "autumn"; };
  const cache = new WeakMap();

  // Pétalos: dos coronas (la de atrás algo más oscura), se crean una vez
  function build(root) {
    const front = root.querySelector(".spPetalsFront"), back = root.querySelector(".spPetalsBack");
    if (!front || front.childNodes.length) return;
    const mk = (parent, a, grad, s) => {
      const u = document.createElementNS(NS, "use");
      u.setAttribute("href", "#petalArt"); u.setAttribute("fill", `url(#${grad})`);
      u.setAttribute("class", "spPetal"); u.dataset.a = a; u.dataset.s = s;
      parent.appendChild(u);
    };
    for (let k = 0; k < 5; k++) mk(back, 36 + k * 72, "petalBack", 0.9);
    for (let k = 0; k < 5; k++) mk(front, k * 72, "petalFront", 1);
    const st = root.querySelector(".spStamens");
    let d = "", dots = "";
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + 0.2, r1 = 2.5, r2 = 8 + (k % 2) * 1.6;
      const x1 = Math.cos(a) * r1, y1 = Math.sin(a) * r1, x2 = Math.cos(a) * r2, y2 = Math.sin(a) * r2;
      d += `M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} `;
      dots += `<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="1.35" fill="#f0ad35"/><circle cx="${(x2 - 0.4).toFixed(1)}" cy="${(y2 - 0.4).toFixed(1)}" r=".5" fill="#fff4c9"/>`;
    }
    st.innerHTML = `<path d="${d}" stroke="#f6e6b5" stroke-width=".8" stroke-linecap="round"/>` + dots;
  }

  function parts(root) {
    let p = cache.get(root);
    if (!p) {
      build(root);
      const q = (s) => root.querySelector(s), qa = (s) => [...root.querySelectorAll(s)];
      p = { sway: q(".spSway"), stem: q(".spStem"), stemHl: q(".spStemHl"), coty: qa(".spCoty"), leaves: qa(".spLeaf"),
        bud: q(".spBud"), flower: q(".spFlower"), petals: qa(".spPetal"), center: q(".spCenter"), st: -1, season: "",
        img: q(".spImg"), i1: q(".spI1"), i2: q(".spI2"), i1w: q(".spI1w"), i2w: q(".spI2w") };
      cache.set(root, p);
    }
    return p;
  }

  // o: { stage 0..4, pop (0→1 al crecer, con rebote), sway (grados), swayV, bloom 0..1, season, t }
  function pose(root, o) {
    const p = parts(root), st = o.stage | 0;
    // Arte en imagen (mismo estilo que los accesorios): brotecito (1) y planta (2+; la flor está aparcada)
    if (p.img) {
      if (st !== p.st || o.season !== p.season) {
        p.st = st; p.season = o.season;
        [p.stem, p.stemHl, ...p.coty, ...p.leaves, p.bud, p.flower].forEach((n) => n && (n.style.display = "none"));
        p.i1.style.display = p.i1w.style.display = st === 1 ? "inline" : "none";
        p.i2.style.display = p.i2w.style.display = st >= 2 ? "inline" : "none";
        p.img.style.filter = { autumn: "hue-rotate(-48deg) saturate(1.25)", winter: "saturate(.55) brightness(1.12)", summer: "saturate(1.12) hue-rotate(-6deg)" }[o.season] || "";
      }
      // mustio ↔ sano: fundido suave entre las dos imágenes
      const w = Math.max(0, Math.min(1, o.wilt || 0));
      if (Math.abs(w - (p.w ?? -1)) > 0.004) {
        p.w = w;
        p.i1.style.opacity = p.i2.style.opacity = (1 - w).toFixed(3);
        p.i1w.style.opacity = p.i2w.style.opacity = w.toFixed(3);
      }
      const pop = Math.max(0, o.pop ?? 1), t = o.t || 0, sway = o.sway || 0;
      const sq = 1 + 0.03 * Math.sin(t * 2) + Math.max(0, Math.min(1, 1 - pop)) * 0.2;
      p.sway.setAttribute("transform", `translate(0 -101) rotate(${sway.toFixed(2)}) scale(${(pop / Math.sqrt(sq)).toFixed(3)} ${(pop * sq).toFixed(3)}) translate(0 101)`);
      return;
    }
    if (st !== p.st || o.season !== p.season) {
      p.st = st; p.season = o.season;
      p.stem.setAttribute("d", STEM[st]); p.stemHl.setAttribute("d", STEM[st]);
      p.coty.forEach((c) => { c.style.display = st >= 1 ? "inline" : "none"; c.setAttribute("fill", `url(#leaf-${o.season})`); });
      p.leaves.forEach((l) => { l.style.display = st >= 2 ? "inline" : "none"; l.setAttribute("fill", `url(#leaf-${o.season})`); });
      p.bud.style.display = st === 3 ? "inline" : "none";
      p.flower.style.display = st >= 4 ? "inline" : "none";
      root.style.setProperty("--frost", o.season === "winter" ? ".9" : "0");
    }
    const pop = Math.max(0, o.pop ?? 1), s = SCALE[st] * pop, t = o.t || 0;
    const sway = o.sway || 0, sv = Math.max(-12, Math.min(12, (o.swayV || 0) * 0.04));
    const unfold = Math.max(0, Math.min(1, 1 - pop)) * 60;
    p.sway.setAttribute("transform", `translate(0 -101) rotate(${sway.toFixed(2)}) scale(${s.toFixed(3)} ${(s * (1 + 0.03 * Math.sin(t * 2))).toFixed(3)}) translate(0 101)`);
    // cotiledones: arriba del todo de pequeño, luego se quedan abajo y algo caídos
    const cy = st === 1 ? TOP[1] : -112, droop = st >= 2 ? 16 : 0;
    p.coty[0].setAttribute("transform", `translate(0.4 ${cy}) rotate(${(-22 + droop - unfold + sv * 0.6).toFixed(1)})`);
    p.coty[1].setAttribute("transform", `translate(-0.4 ${cy}) scale(-1 1) rotate(${(-22 + droop - unfold - sv * 0.6).toFixed(1)})`);
    if (st >= 2) {
      p.leaves[0].setAttribute("transform", `translate(0.8 -123) rotate(${(-24 - unfold + sv + Math.sin(t * 1.9) * 2).toFixed(1)})`);
      p.leaves[1].setAttribute("transform", `translate(-0.6 -118) scale(-0.84 0.84) rotate(${(-16 - unfold - sv + Math.sin(t * 1.6 + 1) * 2).toFixed(1)})`);
    }
    if (st === 3) p.bud.setAttribute("transform", `translate(1 ${TOP[3]}) rotate(${(sway * 0.3).toFixed(1)}) scale(${(1 + 0.025 * Math.sin(t * 2.4)).toFixed(3)} 1)`);
    if (st >= 4) {
      const b = Math.max(0, Math.min(1, o.bloom ?? 1));
      p.flower.setAttribute("transform", `translate(1 ${TOP[4] - 1}) rotate(${(sway * 0.35).toFixed(1)}) scale(.84)`);
      for (const pt of p.petals) {
        const a = +pt.dataset.a, k = +pt.dataset.s, ang = a > 180 ? a - 360 : a;
        pt.setAttribute("transform", `rotate(${(ang * (0.18 + 0.82 * b)).toFixed(1)}) scale(${((0.5 + 0.5 * b) * k).toFixed(3)} ${((0.82 + 0.18 * b) * k).toFixed(3)})`);
      }
      p.center.setAttribute("transform", `scale(${(0.35 + 0.65 * b).toFixed(3)})`);
    }
  }

  // Motitas únicas para cada Eko (mismo número de semilla = mismo dibujo)
  function freckles(seed) {
    let s = (seed >>> 0) || 1;
    const r = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
    const n = 5 + Math.floor(r() * 5);
    let out = "";
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, cheek = r() < 0.75;
      const x = cheek ? side * (36 + r() * 26) : (r() - 0.5) * 70;
      const y = cheek ? 30 + r() * 14 - Math.abs(x) * 0.08 : -40 - r() * 30;
      const rad = cheek ? 1.7 + r() * 1.7 : 2 + r() * 2.4;
      out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(2)}"/>`;
    }
    return out;
  }

  window.EkoArt = { pose, build, freckles, seasonOf, SEASONS: ["spring", "summer", "autumn", "winter"] };
})();
