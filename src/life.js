// Eko · pequeñas cosas de su vida: álbum de fotos de momentos importantes, cartas que le llegan,
// invitaciones a una pausa en su casa y la hora de dormir. Todo con motivo, nada «porque sí».
window.EkoLife = (() => {
  "use strict";
  const E = window.Eko;
  if (!E) return null;
  const { A, S } = E;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
  };
  const L = Object.assign({ lvl: 0, ach: null, built: false, album: [], letters: [], letterAt: 0, active: 0, activeDay: "", inviteAt: 0, bedAt: "" }, store.get("eko-life", {}));
  const save = () => store.set("eko-life", L);
  const PG = () => window.EkoProgress, HOME = () => window.EkoCorner, M = () => window.EkoMenu;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const tone = (...a) => { try { E.Voice.tone && E.Voice.tone(...a); } catch (_) {} };
  const free = () => !E.busy() && !S.sleeping && !E.A.hidden && !A.gameMode && !(HOME() && HOME().inside()) && !(M() && M().isOpen && M().isOpen());
  const quietNow = () => { const l = E.lastSenses || {}; return l.fullscreen || l.in_call || E.quiet; };

  // =============== Álbum de fotos ===============
  // Cuando pasa algo importante, Eko saca su cámara y hace una foto (que guarda en su libreta)
  const queue = [];
  function photo(kind, img, caption) {
    queue.push({ kind, img, caption });
  }
  function shoot() {
    if (!queue.length || !free() || quietNow()) return;
    const p = queue.shift();
    E.useProp && E.useProp("camera", 6, 0);
    E.say(pick(["¡Esto hay que recordarlo! Foto…", "Quieto, que te hago una foto", "¡Patata!", "Para mi álbum…"]), 1800, true);
    setTimeout(() => {
      const f = document.createElement("div"); f.className = "flash"; E.stage.appendChild(f); setTimeout(() => f.remove(), 450);
      tone("square", 1800, 900, 0.06, 0.02);
      L.album.unshift({ at: Date.now(), kind: p.kind, img: p.img, cap: p.caption });
      L.album = L.album.slice(0, 80); save();
      setTimeout(() => E.say(pick(["¡Salió genial!", "La guardo en mi libreta", "¡Al álbum!"]), 1800, true), 700);
    }, 1700);
  }
  setInterval(shoot, 15000);
  // Momentos que merecen foto
  setInterval(() => {
    const P = PG(); if (!P) return;
    const g = P.get(), lvl = P.level(), ach = Object.keys(g.ach || {});
    if (L.ach == null) { L.lvl = lvl; L.ach = ach; L.built = !!(HOME() && HOME().state() === "built"); save(); return; }   // primera vez: sin fotos de lo viejo
    if (lvl > L.lvl) { for (let n = L.lvl + 1; n <= lvl; n++) if (n % 5 === 0 || n === 2) photo("level", "artSpark", `¡Nivel ${n} juntos!`); L.lvl = lvl; }
    for (const id of ach) if (!L.ach.includes(id)) { const a = P.ACH.find((x) => x.id === id); if (a) photo("ach", a.ic, `Logro: ${a.name}`); L.ach.push(id); }
    const built = !!(HOME() && HOME().state() === "built");
    if (built && !L.built) { photo("home", "artRoom", "Mi casa nueva"); L.built = true; }
    save();
  }, 10000);
  function album() { return L.album; }

  // =============== Cartas ===============
  const LETTERS = [
    { from: "la abuela Mochi", text: "Querido Eko: me cuentan que tienes un humano estupendo. Pórtate bien, come galletas (pero no muchas) y abrígate, que ya refresca. Un achuchón de plastilina." },
    { from: "tu primo Toffi", text: "¡Eko! Aquí en mi escritorio hay un fondo de pantalla de montañas y me paso el día escalando. ¿Tu humano te deja subirte a las ventanas? ¡Cuéntamelo todo!" },
    { from: "el Club de Mascotas de Escritorio", text: "Estimado socio: le recordamos que la siesta de las cuatro sigue siendo obligatoria. Atentamente, la Junta Directiva (que también está echando la siesta)." },
    { from: "la abuela Mochi", text: "Eko, cariño: te he tejido una bufanda imaginaria. Póntela en los días fríos. Y dale las gracias a tu humano por cuidarte tanto, que eso no se ve todos los días." },
    { from: "una nube", text: "Hola, Eko. Te vi el otro día por la ventana de tu casa. Saludaste muy bonito. Volveré a pasar. — Una nube (la esponjosa)" },
    { from: "tu primo Toffi", text: "He aprendido a hacer malabares con tres uvas. Bueno, con dos. Bueno, me las he comido. ¿Tú qué trucos sabes ya?" },
    { from: "el cartero", text: "Señor Eko: este mes ha recibido usted más paquetes que nadie del barrio. ¿Podría pedirle a su humano que deje de mimarle tanto? Es broma. Siga así." },
    { from: "la abuela Mochi", text: "Recuerda: un buen amigo es el que se queda aunque el ordenador vaya lento. Me alegra que tengas uno así. Besitos." },
    { from: "un admirador secreto", text: "Tu forma de saltar es la más bonita del escritorio. Firmado: alguien que también es redondito." },
    { from: "el Club de Mascotas de Escritorio", text: "¡Felicidades! Ha sido elegido «Mascota más achuchable» del trimestre. Su premio: más achuchones. Reclámelo a su humano." },
  ];
  function letterDue() { return Date.now() - L.letterAt > (3 + Math.random() * 2) * 86400000; }
  function readLetter() {
    const unread = LETTERS.map((l, i) => i).filter((i) => !L.letters.includes(i));
    const pool = unread.length ? unread : LETTERS.map((l, i) => i);
    const i = pick(pool), l = LETTERS[i];
    if (!L.letters.includes(i)) L.letters.push(i);
    L.letterAt = Date.now(); save();
    E.say(`¡Me ha llegado una carta de ${l.from}!`, 2400, true, "emocionado");
    tone("sine", 900, 1200, 0.15, 0.02);
    setTimeout(() => {
      const c = M() && M().card(`<div class="letter"><small>De ${l.from}</small><p>${l.text}</p></div><div class="chips"><button type="button" class="chip main y">¡Qué bonito!</button></div>`);
      if (!c) return;
      E.act && E.act("think");
      const t = setTimeout(() => M().closeCard(), 30000);
      c.querySelector(".y").addEventListener("click", () => { clearTimeout(t); M().closeCard(); E.express && E.express("enamorado", 2); });
    }, 2600);
  }
  setInterval(() => { if (L.letterAt === 0) { L.letterAt = Date.now() - 2 * 86400000; save(); return; } if (letterDue() && free() && !quietNow() && Math.random() < 0.2) readLetter(); }, 60000);

  // =============== Pausas y hora de dormir ===============
  // Cuenta el tiempo que llevas activo seguido; si es mucho, te invita a una pausa en su casa
  let streak = 0;
  setInterval(() => {
    const l = E.lastSenses || {};
    if (l.idle != null && l.idle > 300) streak = 0; else streak++;               // minutos activos seguidos
    if (streak >= 100 && Date.now() - L.inviteAt > 3 * 3600000 && free() && !quietNow() && HOME() && HOME().state() === "built") {
      L.inviteAt = Date.now(); save();
      E.say(pick(["Llevas un buen rato sin parar…", "Uf, ¡cuánto trabajas hoy!"]), 2400, true, "esperanzado");
      setTimeout(() => {
        const c = M() && M().card(`<p>¿Te vienes a mi casa a tomar algo? Cinco minutitos de pausa.</p><div class="chips"><button type="button" class="chip main y">¡Vale!</button><button type="button" class="chip n">Ahora no</button></div>`);
        if (!c) return;
        const t = setTimeout(() => M().closeCard(), 20000);
        c.querySelector(".y").addEventListener("click", () => { clearTimeout(t); M().closeCard(); streak = 0; HOME().go(["tea"]); });
        c.querySelector(".n").addEventListener("click", () => { clearTimeout(t); M().closeCard(); E.say("Vale, pero luego estira un poco, ¿eh?", 2200, true); });
      }, 2600);
    }
    // Hora de dormir: pasadas las 23:30, si sigues aquí, te lo recuerda y se va a su cama
    const d = new Date(), today = d.toDateString();
    if (d.getHours() === 23 && d.getMinutes() >= 30 && L.bedAt !== today && (l.idle == null || l.idle < 120) && free() && !quietNow()) {
      L.bedAt = today; save();
      E.say(pick(["Es tardísimo… yo me voy a mi camita. ¿Tú también?", "Hora de dormir. ¡Mañana más!", "Bostezo oficial: me voy a la cama. Descansa tú también"]), 3200, true, "cansado");
      setTimeout(() => { if (HOME() && HOME().state() === "built") HOME().go(["bed"]); else E.goToSleep(); }, 3400);
    }
  }, 60000);

  return { album, photo, readLetter };
})();
