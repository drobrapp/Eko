// Eko · lo que pasa cada día (solo números, en tu PC) para el resumen semanal «Nuestra semana».
// Cada día guarda: minutos juntos, a qué horas, y cuántas veces pasó cada cosa (caricias, galletas, juegos, huerto…).
window.EkoStats = (() => {
  "use strict";
  const E = window.Eko;
  const KEY = "eko-stats", SEEN = "eko-wrapped-seen";
  const T = window.__TAURI__, invoke = T ? T.core.invoke : null;
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (_) { return {}; } };
  function add(k, n = 1) {
    const s = load(), d = dayKey(), day = s[d] || (s[d] = {});
    day[k] = (day[k] || 0) + n;
    // solo se guardan las últimas 3 semanas
    const keys = Object.keys(s).sort(); while (keys.length > 21) delete s[keys.shift()];
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {}
  }
  // Un minuto juntos = Eko visible y tú usando el PC (sin más de 3 min quieto)
  setInterval(() => {
    if (!E || E.A.hidden) return;
    const l = E.lastSenses || {};
    if (l.idle != null && l.idle > 180) return;
    add("min"); add("h" + new Date().getHours());
  }, 60000);

  // Semana (lunes a domingo) a la que pertenece una fecha
  const monday = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const weekId = (d = new Date()) => dayKey(monday(d));
  function open(which) {
    try { localStorage.setItem("eko-wrapped-week", which || weekId()); } catch (_) {}
    if (invoke) invoke("wrapped_show").catch(() => {});
    else window.open("wrapped.html", "_blank");
  }
  // El domingo por la tarde (o el lunes, si no estuviste) Eko te avisa de que tiene el resumen preparado
  function check() {
    const now = new Date(), dow = now.getDay(), h = now.getHours();
    const target = dow === 0 && h >= 18 ? weekId(now) : dow === 1 ? weekId(new Date(now.getTime() - 86400000)) : null;
    if (!target) return;
    let seen = ""; try { seen = localStorage.getItem(SEEN) || ""; } catch (_) {}
    if (seen === target) return;
    const s = load(), mon = new Date(target + "T00:00:00");
    let days = 0;
    for (let i = 0; i < 7; i++) { const d = new Date(mon); d.setDate(d.getDate() + i); const v = s[dayKey(d)]; if (v && (v.min || 0) >= 5) days++; }
    if (days < 2) return;
    if (!E || E.A.hidden || E.S.sleeping || !window.EkoMenu || (E.busy && E.busy())) return;
    try { localStorage.setItem(SEEN, target); } catch (_) {}
    E.act("tada"); E.fx("spark", 3); E.express("emocionado", 3);
    setTimeout(() => {
      const c = window.EkoMenu.card(`<p>¡He preparado un resumen de nuestra semana! ¿Lo vemos?</p><div class="chips"><button type="button" class="chip main y">¡Sí!</button><button type="button" class="chip n">Luego</button></div>`);
      if (!c) return;
      c.querySelector(".y").addEventListener("click", () => { window.EkoMenu.closeCard(); open(target); });
      c.querySelector(".n").addEventListener("click", () => { window.EkoMenu.closeCard(); E.say("Vale. Está en mi libreta cuando quieras", 2400, true); });
    }, 1200);
  }
  setInterval(check, 5 * 60000); setTimeout(check, 90000);
  return { add, open, weekId, dayKey };
})();
