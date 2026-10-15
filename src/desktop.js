// Eko · curiosea el escritorio (solo si se activa en Ajustes; apagado por defecto)
// Lee nombres, posiciones y recuentos de los iconos (desktop.rs). Nunca abre archivos.
(() => {
  "use strict";
  const E = window.Eko;
  if (!E) return;
  const invoke = window.__TAURI__ ? window.__TAURI__.core.invoke : null;
  const cfg = () => (window.EkoSettings ? window.EkoSettings.get() : {});
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (_) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} } };

  const T = {
    folder: [
      (i) => `¿«${i.name}»? ¿Qué guardas aquí?`,
      (i) => i.count === 0 ? `«${i.name}» está vacía… ¿para qué la quieres?` : `«${i.name}»… ¡${i.count} cosas dentro! Qué misterio`,
      (i) => i.images > 20 ? `¡«${i.name}» tiene ${i.images} fotos! ¿Me enseñas alguna?` : i.images > 0 ? `En «${i.name}» hay ${i.images} fotos. Seguro que son bonitas` : `Toc, toc… ¿hay alguien en «${i.name}»?`,
    ],
    pdf: [(i) => `Un PDF… «${i.name}». ¿Deberes? ¿Facturas? Mejor no pregunto`],
    doc: [(i) => `«${i.name}»… ¿estás escribiendo algo importante?`],
    sheet: [(i) => `Una hoja de cálculo… números, números. Me mareo solo de mirarla`],
    image: [(i) => `¡Una foto! «${i.name}». ¿La has hecho tú?`, (i) => `Esta imagen tiene buena pinta. Ojo de fotógrafo, ¿eh?`],
    video: [(i) => `¿Un vídeo? ¡Palomitas!`],
    audio: [(i) => `Música… ¿«${i.name}» es para bailar?`],
    zip: [(i) => `Un archivo comprimido. Todo apretujado ahí dentro, pobrecito`],
    exe: [(i) => `«${i.name}»… un instalador. ¿Qué vas a instalar?`],
    shortcut: [(i) => `¡«${i.name}»! Esa la usas, ¿eh?`, (i) => `Un atajo a «${i.name}». Práctico`],
    web: [(i) => `Un enlace a internet. ¿Adónde llevará?`],
    file: [(i) => `«${i.name}»… ¿y esto qué es?`, (i) => `Hmm, «${i.name}». Curioso`],
    system: [(i) => `«${i.name}»… esto es cosa de Windows, ¿no?`],
    isNew: [(i) => `¡Eh, «${i.name}» antes no estaba!`, (i) => `¡Algo nuevo! «${i.name}». ¿Qué es?`],
    bin: ["¡Puaj! La papelera huele un poquito…", "La papelera está a reventar. ¿La vaciamos algún día?", "Uf… ¿cuánto tiempo lleva eso ahí?"],
    messy: (n) => pick([`¡${n} iconos en el escritorio! Esto parece mi cuarto`, `Con tantos iconos no encuentro ni mi brote`]),
  };
  const EXT = {
    pdf: "pdf", doc: "doc", docx: "doc", odt: "doc", txt: "doc", md: "doc", rtf: "doc", pages: "doc",
    xls: "sheet", xlsx: "sheet", csv: "sheet", ods: "sheet", numbers: "sheet",
    jpg: "image", jpeg: "image", png: "image", gif: "image", webp: "image", heic: "image", psd: "image", tif: "image", tiff: "image", cr2: "image", cr3: "image", nef: "image", arw: "image",
    mp4: "video", mov: "video", mkv: "video", avi: "video",
    mp3: "audio", wav: "audio", flac: "audio", m4a: "audio",
    zip: "zip", rar: "zip", "7z": "zip",
    exe: "exe", msi: "exe",
  };
  const kindOf = (i) => (i.kind === "file" ? EXT[i.ext] || "file" : i.kind);
  const shortName = (n) => (n.length > 26 ? n.slice(0, 24) + "…" : n);

  let known = store.get("eko-desk-known");            // nombres vistos la última vez
  const said = store.get("eko-desk-said") || {};       // cuándo dijo cada cosa
  const cool = (k, h) => { const t = said[k] || 0; if (Date.now() - t < h * 3600000) return false; said[k] = Date.now(); store.set("eko-desk-said", said); return true; };
  let nextAt = Date.now() + rnd(2, 5) * 60000, busyVisit = false;

  async function scan() {
    if (window.EKO_FAKE_DESK) return window.EKO_FAKE_DESK();
    if (!invoke) return null;
    try { return await invoke("desktop_scan"); } catch (_) { return null; }
  }
  const free = () => !E.busy() && !E.S.perch && !E.S.fly && !E.A.hidden && !E.quiet && !(window.EkoAntics && window.EkoAntics.current);
  const onScreen = (i) => i.visible !== false && i.w > 10 && i.y > E.world.top + 20 && i.x > E.world.left - 10 && i.x < E.world.left + E.world.width;

  // Va hasta el icono, se posa encima, comenta y se queda sentado un rato
  function visit(icon, line, extra) {
    if (!E.visitIcon(icon, () => {
      const sit = rnd(7, 12);
      if (E.S.perch) E.S.perch.until = E.A.t + sit;
      E.S.mode = "sit"; E.S.modeUntil = E.A.t + 2;
      E.act("curious", { dir: 1 });
      if (extra) extra();
      else E.express(pick(["curioso", "curioso", "emocionado"]), 2.5);
      setTimeout(() => E.say(line, 3600, true), 500);
      busyVisit = false;
    })) { busyVisit = false; return false; }
    busyVisit = true;
    return true;
  }

  async function tick() {
    if (!cfg().desktop || busyVisit || Date.now() < nextAt || !free()) return;
    const gap = [[40, 70], [25, 45], [15, 30], [10, 20]][Math.max(0, Math.min(3, cfg().chatty ?? 2))] || [15, 30];
    nextAt = Date.now() + rnd(gap[0], gap[1]) * 60000;
    const d = await scan();
    if (!d || !d.icons) return;
    const icons = d.icons.filter(onScreen);
    const names = d.icons.map((i) => i.name);
    const fresh = known ? icons.filter((i) => !known.includes(i.name) && i.kind !== "system") : [];
    known = names; store.set("eko-desk-known", known);
    if (!free()) return;

    // 1. Algo nuevo en el escritorio
    if (fresh.length) { const i = fresh[0]; visit(i, pick(T.isNew)({ ...i, name: shortName(i.name) })); return; }
    // 2. Papelera llena (una vez al día)
    const bin = icons.find((i) => i.kind === "recycle");
    if (bin && (d.bin_items >= 40 || d.bin_bytes > 1.5e9) && cool("bin", 24)) {
      visit(bin, pick(T.bin), () => { E.act("pinchNose"); E.express("molesto", 3); });
      return;
    }
    // 3. Escritorio muy lleno (una vez por semana, sin moverse)
    if (icons.length > 40 && cool("messy", 24 * 7)) { E.act("lookAround"); E.express("sorprendido", 2.5); setTimeout(() => E.say(T.messy(icons.length), 3400, true), 600); return; }
    // 4. Curiosea un icono al azar (sin repetir el mismo en un día)
    const pool = icons.filter((i) => i.kind !== "recycle" && Date.now() - (said["i:" + i.name] || 0) > 24 * 3600000);
    if (!pool.length) return;
    const i = pick(pool), list = T[kindOf(i)] || T.file;
    cool("i:" + i.name, 24);
    visit(i, pick(list)({ ...i, name: shortName(i.name) }));
  }
  setInterval(tick, 30000);

  // Para el escondite: un icono donde esconderse (o null)
  async function hideSpot() {
    if (!cfg().desktop) return null;
    const d = await scan();
    if (!d || !d.icons) return null;
    const icons = d.icons.filter(onScreen).filter((i) => i.kind !== "recycle");
    return icons.length ? pick(icons) : null;
  }
  window.EkoDesktop = { tick, scan, hideSpot, visit, forceNext: () => { nextAt = 0; } };
})();
