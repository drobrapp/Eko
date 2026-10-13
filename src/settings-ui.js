// Eko · ventana de Ajustes
(() => {
  "use strict";
  const S = window.EkoSettings;
  const T = window.__TAURI__;
  const invoke = T ? T.core.invoke : null;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  let savedTimer = 0;
  const saved = () => { $("#saved").classList.add("show"); clearTimeout(savedTimer); savedTimer = setTimeout(() => $("#saved").classList.remove("show"), 1100); };

  function fill() {
    const s = S.get();
    $("#title").textContent = `Ajustes de ${s.petName || "Eko"}`;
    $$("input[data-k]").forEach((el) => {
      const v = s[el.dataset.k];
      if (el.type === "checkbox") el.checked = !!v; else el.value = v;
    });
    $$(".seg[data-k]").forEach((seg) => seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", String(s[seg.dataset.k]) === b.dataset.v)));
    $$("textarea[data-app]").forEach((t) => { if (document.activeElement !== t) t.value = s.apps[t.dataset.app] || ""; });
    const [m, d] = (s.birthday || "-").split("-");
    $("#bday-d").value = d || ""; $("#bday-m").value = m || "";
  }

  // Cumpleaños: día y mes
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  $("#bday-d").innerHTML = '<option value="">Día</option>' + Array.from({ length: 31 }, (_, i) => `<option value="${String(i + 1).padStart(2, "0")}">${i + 1}</option>`).join("");
  $("#bday-m").innerHTML = '<option value="">Mes</option>' + meses.map((n, i) => `<option value="${String(i + 1).padStart(2, "0")}">${n}</option>`).join("");
  const saveBday = () => { const d = $("#bday-d").value, m = $("#bday-m").value; S.set("birthday", d && m ? `${m}-${d}` : ""); saved(); };
  $("#bday-d").addEventListener("change", saveBday);
  $("#bday-m").addEventListener("change", saveBday);

  $$("input[data-k]").forEach((el) => {
    const ev = el.type === "text" ? "input" : "change";
    el.addEventListener(ev, () => {
      const k = el.dataset.k;
      const v = el.type === "checkbox" ? el.checked : el.type === "range" ? +el.value : el.value;
      if (k === "petName" && !String(v).trim()) return;
      S.set(k, v); saved();
      if (k === "petName") $("#title").textContent = `Ajustes de ${v}`;
    });
  });
  $$(".seg[data-k]").forEach((seg) => seg.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const v = isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v;
    S.set(seg.dataset.k, v); fill(); saved();
  }));
  $$("textarea[data-app]").forEach((t) => t.addEventListener("change", () => { S.setApp(t.dataset.app, t.value); saved(); }));

  // Probar la voz con el tono elegido
  let ctx = null;
  $("#tryVoice").addEventListener("click", () => {
    try { ctx = ctx || new AudioContext(); } catch (_) { return; }
    const base = +$("#pitch").value;
    for (let i = 0; i < 6; i++) {
      const t = ctx.currentTime + i * 0.14, o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      const p = base * (0.85 + Math.random() * 0.5);
      o.type = "triangle"; o.frequency.setValueAtTime(p, t); o.frequency.exponentialRampToValueAtTime(p * (0.8 + Math.random() * 0.4), t + 0.09);
      f.type = "lowpass"; f.frequency.value = 2000;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(f).connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.12);
    }
  });

  // Sistema (solo en la app)
  if (invoke) {
    invoke("get_autostart").then((v) => { $("#autostart").checked = !!v; }).catch(() => {});
    invoke("app_version").then((v) => { $("#ver").textContent = `Versión ${v} · todo se guarda solo en tu PC`; }).catch(() => {});
  }
  $("#autostart").addEventListener("change", (e) => { if (invoke) invoke("set_autostart", { value: e.target.checked }).then(saved); });
  $("#checkUpd").addEventListener("click", () => {
    $("#updState").textContent = "Buscando…";
    if (!invoke) { setTimeout(() => { $("#updState").textContent = "Solo funciona en la app"; }, 600); return; }
    invoke("check_update_now").then((r) => { $("#updState").textContent = r ? `Hay versión nueva (${r}). Eko se actualiza ahora.` : "Ya tienes la última versión"; })
      .catch(() => { $("#updState").textContent = "No se ha podido comprobar"; });
  });

  // Privacidad
  $("#showData").addEventListener("click", () => {
    const pre = $("#dataView");
    const out = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith("eko")) { try { out[k] = JSON.parse(localStorage.getItem(k)); } catch (_) { out[k] = localStorage.getItem(k); } } }
    pre.textContent = JSON.stringify(out, null, 2);
    pre.hidden = !pre.hidden;
  });
  let wipeArmed = false;
  $("#wipe").addEventListener("click", (e) => {
    if (!wipeArmed) { wipeArmed = true; e.target.textContent = "¿Seguro? Pulsa otra vez"; setTimeout(() => { wipeArmed = false; e.target.textContent = "Borrar"; }, 4000); return; }
    S.reset();
    if (T) T.event.emit("eko-reset");
    e.target.textContent = "Borrado";
    fill();
  });

  // Sin menú del navegador ni recargas accidentales (se permite en las casillas de texto)
  document.addEventListener("contextmenu", (e) => { if (!e.target.closest("input, textarea")) e.preventDefault(); });
  document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "f5" || k === "f7" || (e.ctrlKey && ["r", "p", "f", "g", "j", "u", "s"].includes(k))) e.preventDefault();
  });

  S.onChange(fill);
  fill();
})();
