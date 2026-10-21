// Eko · cuenta las novedades después de actualizarse, con sus palabras y solo si son importantes.
// Al publicar una versión con algo que merezca contarse, añade aquí su entrada (important: true).
window.EkoNews = (() => {
  "use strict";
  const E = window.Eko;
  if (!E) return null;
  const NOTES = {
    "0.31.0": { important: true, lines: ["¡Novedad! Cada domingo por la tarde te preparo un resumen de nuestra semana", "Y si no puedes esperar, míralo en mi libreta: «Nuestra semana»"] },
    "0.30.6": { important: true, lines: ["¡Mi casa del valle es nueva! Ahora tengo un saloncito con sillón, lamparita y ventana al valle", "Toca las cosas de casa: puedo encender las luces, sentarme en el sillón o enseñarte mis recuerdos"] },
    "0.30.3": { important: true, lines: ["Toca los arbustos del valle… y el árbol grande, tres veces seguidas", "¡Ojo con los pájaros y las malas hierbas del huerto!", "Y los premios de los encargos ya se ven en el valle"] },
    "0.30.2": { important: true, lines: ["¡Ahora puedes coger tú la regadera! Pásala por encima de una planta con sed para regarla, o por el pozo para llenarla", "Con el saquito de semillas, plantas donde lo sueltes. Yo me aparto y te animo"] },
    "0.30.1": { important: true, lines: ["En el huerto, toca la regadera o el saquito y lo hago yo. Si quieres elegir dónde, arrástralos"] },
    "0.30.0": { important: true, lines: ["Alguien está dejando notas con encargos clavadas en Don Paja… ¿Quién será?", "Si cumples los encargos, aparecen cosas nuevas en el valle", "Y ahora paso por debajo del arco al entrar al huerto"] },
    "0.29.19": { important: true, lines: ["En el huerto ya puedes soltar las semillas o la regadera en cualquier parte del bancal, ¡y voy yo solito!", "Si llegas al huerto por tu cuenta, te enseño a plantar ahí mismo", "Y si tenías un recordatorio mientras dormía, me despierto para avisarte"] },
    "0.29.18": { important: true, lines: ["Pídeme que abra o cierre un programa y lo hago al momento", "Si cierro algo con cambios sin guardar, el programa te preguntará antes, tranqui"] },
    "0.29.17": { important: true, lines: ["Ahora te entiendo lo mismo hablando que escribiendo", "Y si me duermo, despiértame con un clic. ¡Ya no me despierto con cualquier ruido!"] },
    "0.29.16": { important: true, lines: ["¡Ahora puedo regar mi brote o llevarte al valle si me lo pides!", "También pongo un Pomodoro, apunto notas y te enseño tus tareas", "Y si te apetece, te propongo un juego o te doy un abrazo"] },
    "0.29.15": { important: true, lines: ["Dime solo «Photoshop» y lo encuentro, no hace falta el nombre entero", "Y si me dices «vuela», ¡despego con mi capa!"] },
    "0.29.14": { important: true, lines: ["Antes de guardar algo que me cuentas, te pregunto si quieres que lo recuerde", "Y si no entiendo bien lo que me pides, te pregunto en vez de inventármelo"] },
    "0.29.13": { important: true, lines: ["¡Ahora te entiendo mucho mejor cuando hablamos!"] },
    "0.29.12": { important: true, lines: ["¡Piedra, papel o tijera tiene imágenes nuevas! Y ahora enseño en la mano lo que he elegido"] },
    "0.29.10": { important: true, lines: ["He ordenado mi habitación: los muebles y recuerdos se ven en su sitio, sin marcos duplicados", "Ahora mis plantas asoman desde la tierra y puedo pasar bajo el arco", "Por la ventana cambian el cielo, el sol y las hojas o la nieve según la hora y la estación"] },
    "0.29.6": { important: true, lines: ["¡La niebla se ha apartado! Al otro lado del valle hay un huerto entero: cruza el arco y conoce a Don Paja", "La regadera se vacía: rellénala en el pozo. Y lo que cosechéis va a la carretilla"] },
    "0.29.3": { important: true, lines: ["¡Ya tenemos huerto en el valle! Toca el bancal para plantar, la regadera para regar y las plantas para cosechar", "Las plantas crecen de verdad con el tiempo… si no se te olvida regarlas"] },
    "0.29.0": { important: true, lines: ["¡Ya puedes visitar mi valle! Entra en Mi casa y pulsa «Ir al Valle»", "Por ahora solo se puede ver mi casa por fuera y el camino… ¡pero más allá de la niebla hay más cosas esperando!"] },
    "0.28.0": { important: true, lines: ["¡Ahora puedes decorar mi casa! Mover los muebles, cambiarles el color y pintar las paredes", "Está en Mi casa → Decorar. Y en «Mis cosas» eliges qué cuadros cuelgo"] },
    "0.27.0": { important: true, lines: ["¡Me han llegado cosas para mi casa! Alfombra, cortinas y una lamparita que se enciende de noche"] },
    "0.26.0": { important: true, lines: ["¡Tengo una vitrina para mis recuerdos! Cada logro deja algo bonito dentro"] },
    "0.25.0": { important: true, lines: ["¡Ya cuelgo mis cuadros! Y puedo tener hasta tres en la pared"] },
    "0.24.0": { important: true, lines: ["¡Tengo cámara! Haré fotos de nuestros momentos importantes y las guardo en el álbum de mi libreta", "Y a veces me llegan cartas, te invito a una pausa en mi casa y guardo recuerdos en mi balda"] },
    "0.23.0": { important: true, lines: ["Ya puedes ponerme gafas, pajarita o auriculares desde el armario y me los dejo puestos", "Y en Ajustes puedes guardar una copia de mí, por si cambias de ordenador"] },
    "0.22.0": { important: true, lines: ["Mi casa tiene ahora su propio botón en el menú", "¡Y hay logros nuevos de la casa! Mira mi libreta"] },
    "0.21.0": { important: true, lines: ["Ahora puedes cogerme aunque esté en mi casa, y mis bocadillos se leen bien aunque sea pequeñito", "Y mi casa… ¡la construiré con magia cuando lleguemos al nivel 6!"] },
    "0.20.0": { important: true, lines: ["¡Mi casa ahora aparece entre nubes cuando voy! Búscala en Armario → Mi casa", "Y cuando gane algo nuevo, me llegará en un paquete. ¡Lo abriremos juntos!"] },
    "0.19.0": { important: true, lines: ["¡Ahora tengo mi propia habitación! Con ventana, cuadros que se van desbloqueando y todo", "Me hago pequeñito para entrar. ¡Ven a verme!"] },
    "0.18.0": { important: true, lines: ["¡He aprendido a hacerme pequeñito con mi varita! Así quepo en los iconos del escritorio"] },
    "0.17.0": { important: true, lines: ["¡Ya tengo mi rincón! Cama, maceta, cuadro y trofeo, que se desbloquean subiendo de nivel", "Lo encuentras en Armario → Mi rincón. Iré a dormir, regar y ordenar yo solito"] },
    "0.16.0": { important: true, lines: ["¡Tengo juegos nuevos! ¿Qué mano?, atrapa galletas, tócame donde brille y adivina qué pienso", "Se desbloquean subiendo de nivel. ¡Mira en Jugar!"] },
    "0.15.0": { important: true, lines: ["¡Me han actualizado! Ahora te cuento las novedades cuando aprendo algo nuevo, como ahora mismo"] },
    "0.14.0": { important: true, lines: ["Ahora reacciono distinto cada vez que me haces clic: prueba en la cabeza… o en la barriga", "Y ya no se me corta nada al hacer piruetas, ¡palabra!"] },
    "0.13.0": { important: true, lines: ["Si me lo pides en el chat, puedo poner música, abrir programas o buscarte cosas en internet"] },
    "0.12.0": { important: true, lines: ["He aprendido trucos nuevos y ahora me acuerdo de lo que me cuentas"] },
    "0.11.0": { important: true, lines: ["Tengo menú nuevo, niveles de amistad y logros. ¡Mira mi libreta!"] },
    "0.10.0": { important: true, lines: ["Ahora tengo necesidades: hambre, sueño, ganas de jugar y de mimos. Ya te iré diciendo"] },
  };
  const KEY = "eko-seen-version";
  const num = (v) => String(v || "0").split(".").map((x) => parseInt(x, 10) || 0).reduce((a, b) => a * 1000 + b, 0);
  const get = () => { try { return localStorage.getItem(KEY); } catch (_) { return null; } };
  const set = (v) => { try { localStorage.setItem(KEY, v); } catch (_) {} };

  // Lo importante entre la versión que tenía y la de ahora (lo más nuevo primero, como mucho 2 versiones y 3 frases)
  function pending(from, to) {
    const vs = Object.keys(NOTES).filter((v) => num(v) > num(from) && num(v) <= num(to) && NOTES[v].important).sort((a, b) => num(b) - num(a)).slice(0, 2);
    const lines = [];
    for (const v of vs) for (const l of NOTES[v].lines) if (lines.length < 3) lines.push(l);
    return lines;
  }
  function tell(lines) {
    if (!lines.length) return;
    E.act("tada"); E.fx("spark", 3); E.express("emocionado", 3);
    let t = 900;
    lines.forEach((l, i) => {
      const ms = Math.min(7000, 2600 + l.length * 45);
      setTimeout(() => { E.say(l, ms, true); if (i > 0) E.act(i % 2 ? "wink" : "nod"); }, t);
      t += ms + 500;
    });
  }
  function check(current) {
    let seen = get();
    if (!seen) {
      // instalación nueva: nada que contar. Si ya había un Eko de antes (versión sin este aviso), contamos lo de esta versión
      let old = false; try { old = !!localStorage.getItem("eko-onboarded") && !!localStorage.getItem("eko-progress"); } catch (_) {}
      if (!old) { set(current); return; }
      seen = "0.14.0";
    }
    if (num(current) <= num(seen)) return;
    const lines = pending(seen, current);
    set(current);
    if (!lines.length) return;
    // espera a que esté tranquilo (sin bautizo, sin llamadas ni pantalla completa, sin menú abierto)
    let tries = 0;
    const go = () => {
      const l = E.lastSenses || {};
      const menuOpen = window.EkoMenu && window.EkoMenu.isOpen && window.EkoMenu.isOpen();
      if ((E.A.hidden || E.busy() || l.fullscreen || l.in_call || menuOpen || E.S.sleeping) && tries++ < 40) { setTimeout(go, 15000); return; }
      tell(lines);
    };
    setTimeout(go, 9000);
  }
  const T = window.__TAURI__;
  if (T) T.core.invoke("app_version").then(check).catch(() => {});
  return { NOTES, pending, tell, check, simulate: (from = "0.13.0", to = "0.15.0") => tell(pending(from, to)) };
})();
