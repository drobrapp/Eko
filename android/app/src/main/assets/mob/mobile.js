// Eko en el móvil · lo que Eko nota del teléfono (Android avisa con EkoMobile.on("evento")) y cómo reacciona el Eko de escritorio.
window.EkoMobile = (() => {
  "use strict";
  const T = {
    charge: ["¡Comida eléctrica! Ñam", "¡Recargando! Qué gustito", "Gracias, ya me notaba flojito", "Ooooh, cosquillas de energía"],
    lowBattery: ["Estoy cansadito… ¿me cargas el móvil?", "Me quedan pocas pilas… y a ti también", "Si se apaga el móvil, me quedo a oscuras…"],
    music: ["¡Cascos puestos! ¿Qué escuchamos?", "¡Música! Yo también me los pongo", "Pon algo que se pueda bailar", "Si es reguetón, bailo; si es balada, lloro"],
    musicOff: ["¿Se acabó la música?", "Me había quedado con ganas de bailar"],
    shake: ["¡Para, paraaa!", "¡Que no soy una maraca!", "¡Me vas a dejar hecho una bola!", "Mis ojitooos…", "¡Esto es un terremoto!", "¡Socorrooo!"],
    faceDown: ["Qué oscurito… me echo una siesta", "¿Se ha hecho de noche de repente?", "Aquí abajo se está calentito"],
    missed: ["¡Te echaba de menos!", "¡Por fin!", "¡Has vuelto!", "Te estaba esperando", "¿Dónde estabas? Me aburría un montón"],
  };
  const last = {};
  const pick = (k) => { const l = T[k], p = l.filter((x) => x !== last[k]); return (last[k] = p[Math.floor(Math.random() * p.length)]); };
  let danceT = 0;
  function on(ev) {
    const E = window.Eko;
    if (!E || E.A.hidden) return;
    const asleep = E.S.sleeping;
    const wake = () => { if (E.S.sleeping) E.wakeUp(false, true); };
    const say = (k, ms) => setTimeout(() => E.say(pick(k), ms || 2800, true), asleep ? 1400 : 200);
    switch (ev) {
      case "charge": wake(); E.act("tada"); E.fx("heart", 2); say("charge"); break;
      case "lowBattery": if (!asleep) { E.act("yawn"); say("lowBattery", 3400); } break;
      case "shake":
        wake(); E.act("dizzy", { dur: 2.8 }); E.fx("spark", 3); say("shake", 2200);
        break;
      case "faceDown": if (!asleep) { say("faceDown"); setTimeout(() => E.goToSleep(false), 1800); } break;
      case "missed": if (!asleep) { E.act("wave"); E.fx("heart", 3); say("missed"); } break;
      case "music":
        if (asleep) return;
        E.fx("note", 2); say("music");
        E.setDance(true); clearTimeout(danceT); danceT = setTimeout(() => E.setDance(false), 15000);
        break;
      case "musicOff": E.setDance(false); if (!asleep) say("musicOff"); break;
    }
  }
  return { on };
})();
