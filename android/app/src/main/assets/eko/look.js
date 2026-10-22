// Eko en el móvil · su aspecto: disfraces por fechas (como en el PC) y brote según los días juntos.
// Los días cuentan desde que Eko llegó a este móvil (cuando se pase el Eko del PC, se usarán los suyos).
(() => {
  "use strict";
  const AND = window.Android || null;
  const stage = document.getElementById("eko");
  const sprout = document.getElementById("sprout");
  const accEls = [...document.querySelectorAll("[data-acc]")];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
  };
  if (!store.get("eko-born")) store.set("eko-born", new Date().toISOString());
  const born = () => new Date(store.get("eko-born") || Date.now());
  const days = () => Math.max(0, Math.floor((Date.now() - born().getTime()) / 864e5));

  // ---------- Disfraces por fechas (mismas fechas que el PC) ----------
  function season(d = new Date()) {
    const m = d.getMonth() + 1, day = d.getDate();
    if ((m === 12 && day === 31) || (m === 1 && day === 1)) return "party";
    if ((m === 12 && day >= 5) || (m === 1 && day <= 6)) return "xmas";
    if ((m === 10 && day >= 25) || (m === 11 && day <= 1)) return "halloween";
    return null;
  }
  function anniversary(d = new Date()) {
    const b = born();
    return d.getFullYear() > b.getFullYear() && b.getMonth() === d.getMonth() && b.getDate() === d.getDate();
  }
  // Van rotando cada 2 horas
  const COSTUMES = { halloween: ["witch", "pumpkin", "vampire", "ghost"], xmas: ["santa", "reindeer", "elf", "scarf"], party: ["party", "crown"] };
  const TALL = new Set(["witch", "pumpkin", "santa", "elf", "reindeer", "party", "crown"]);
  function currentAcc() {
    const s = anniversary() ? "party" : season();
    if (!s) return "none";
    const list = COSTUMES[s];
    return list[Math.floor(Date.now() / (2 * 3600e3)) % list.length];
  }

  // ---------- Brote: 7 · 30 · 100 · 365 días ----------
  const evoStage = (d) => d >= 365 ? 4 : d >= 100 ? 3 : d >= 30 ? 2 : d >= 7 ? 1 : 0;

  let shown = null, sprStage = 0;
  function apply(animate) {
    const a = currentAcc();
    if (a !== shown) {
      const first = shown === null;
      shown = a;
      for (const e of accEls) e.style.display = e.dataset.acc === a ? "inline" : "none";
      stage.classList.toggle("has-hat", TALL.has(a));
      stage.classList.toggle("acc-ghost", a === "ghost");
      if (AND && AND.tall) AND.tall(TALL.has(a));   // ventana más alta para que no se corte el gorro
      if (!first && animate && a !== "none" && window.eko) { eko.fx("spark", 3); eko.talk("costume"); }
    }
    const st = evoStage(days());
    const headwear = TALL.has(a) || a === "ghost";
    if (sprout) sprout.style.display = st > 0 && !headwear ? "inline" : "none";
    sprStage = st;
  }
  apply(false);
  setInterval(() => apply(true), 60000);

  // anim.js lo llama en cada fotograma
  function pose(t, sway) {
    if (!sprStage || !sprout || sprout.style.display === "none" || !window.EkoArt) return;
    EkoArt.pose(sprout, { stage: sprStage, pop: 1, sway: sway || 0, swayV: 0, bloom: 1, wilt: 0, season: EkoArt.seasonOf(), t });
  }
  window.ekoLook = { pose, days, acc: () => shown };
})();
