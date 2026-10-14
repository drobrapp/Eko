// Eko · catálogo de expresiones (lo usan main.js y la lámina de expresiones)
// eyes: open · happy · closed · wink · x (> <) · half · flat · teary · spiral
// brows: none · up · sad · angry · worried · skeptic
// mouth: none · smile · grin · frown · wavy · flat · smirk · tongue · cat · o (boquita redonda)
(() => {
  "use strict";
  const E = {
    feliz:       { es: ["Feliz", "Tranquilo y contento"],       en: ["Happy", "Calm and content"],        eyes: "open",   brows: "none",    mouth: "smile" },
    curioso:     { es: ["Curioso", "Todo le interesa"],          en: ["Curious", "Everything's interesting"], eyes: "open", brows: "up",    mouth: "o",     o: 0.25, tilt: 10, eyeX: 3 },
    sorprendido: { es: ["Sorprendido", "¡Vaya!"],                en: ["Surprised", "Whoa!"],              eyes: "open",   brows: "up",      mouth: "o",     o: 0.7, scale: 1.3, fx: "bang" },
    triste:      { es: ["Triste", "Un poco apagado"],            en: ["Sad", "A bit down"],               eyes: "open",   brows: "sad",     mouth: "frown", eyeY: 2, nod: 4 },
    enfadado:    { es: ["Enfadado", "Se frustra fácil"],         en: ["Angry", "Easily frustrated"],      eyes: "open",   brows: "angry",   mouth: "frown", scale: 0.9 },
    cansado:     { es: ["Cansado", "Necesita un respiro"],       en: ["Tired", "Needs a break"],          eyes: "half",   brows: "sad",     mouth: "o",     o: 0.2, nod: 5 },
    emocionado:  { es: ["Emocionado", "¡Qué bien!"],             en: ["Excited", "Yay!"],                 eyes: "happy",  brows: "up",      mouth: "grin",  fx: "spark", blush: 1 },
    picaro:      { es: ["Pícaro", "Siempre tiene un plan"],      en: ["Mischievous", "Always has a plan"], eyes: "x",     brows: "none",    mouth: "cat" },
    enamorado:   { es: ["Enamorado", "Todo es mejor"],           en: ["In love", "Everything's better"],  eyes: "happy",  brows: "none",    mouth: "smile", blush: 1, fx: "heart" },
    ansioso:     { es: ["Ansioso", "Mil pensamientos"],          en: ["Anxious", "A thousand thoughts"],  eyes: "open",   brows: "worried", mouth: "wavy",  scale: 0.85, sweat: 1 },
    molesto:     { es: ["Molesto", "No le gusta esto"],          en: ["Annoyed", "Doesn't like this"],    eyes: "half",   brows: "angry",   mouth: "flat" },
    contento:    { es: ["Contento", "Todo fluye"],               en: ["Content", "All good"],             eyes: "happy",  brows: "none",    mouth: "smile" },
    timido:      { es: ["Tímido", "Se esconde un poco"],         en: ["Shy", "Hides a little"],           eyes: "half",   brows: "worried", mouth: "o",     o: 0.15, blush: 1, eyeY: 3, eyeX: -3 },
    avergonzado: { es: ["Avergonzado", "Le da vergüenza"],       en: ["Embarrassed", "So awkward"],       eyes: "open",   brows: "worried", mouth: "wavy",  blush: 1, sweat: 1 },
    confundido:  { es: ["Confundido", "¿Eh?"],                   en: ["Confused", "Huh?"],                eyes: "open",   brows: "skeptic", mouth: "flat",  tilt: -9, fx: "ask" },
    esperanzado: { es: ["Esperanzado", "Todo puede mejorar"],    en: ["Hopeful", "Things can get better"], eyes: "open",  brows: "worried", mouth: "smile", eyeY: -4, nod: -3 },
    sereno:      { es: ["Sereno", "En equilibrio"],              en: ["Serene", "Balanced"],              eyes: "closed", brows: "none",    mouth: "smile" },
    dolido:      { es: ["Dolido", "Le ha afectado"],             en: ["Hurt", "That stung"],              eyes: "teary",  brows: "sad",     mouth: "frown", nod: 3 },
    asustado:    { es: ["Asustado", "Mejor ir despacio"],        en: ["Scared", "Let's go slow"],         eyes: "open",   brows: "worried", mouth: "o",     o: 0.5, scale: 0.7, shiver: 1 },
    orgulloso:   { es: ["Orgulloso", "Está haciendo bien"],      en: ["Proud", "Doing great"],            eyes: "closed", brows: "up",      mouth: "smile", nod: -5, fx: "spark" },
    irritado:    { es: ["Irritado", "Algo no le cuadra"],        en: ["Irritated", "Something's off"],    eyes: "flat",   brows: "angry",   mouth: "wavy" },
    divertido:   { es: ["Divertido", "Le encanta el caos"],      en: ["Playful", "Loves chaos"],          eyes: "wink",   brows: "none",    mouth: "tongue" },
    canalla:     { es: ["Canalla", "Siempre un paso por delante"], en: ["Sly", "Always a step ahead"],    eyes: "half",   brows: "skeptic", mouth: "smirk", eyeX: 3, fx: "spark" },
    dormido:     { es: ["Dormido", "Modo ahorro activado"],      en: ["Asleep", "Power-saving mode"],     eyes: "closed", brows: "none",    mouth: "o",     o: 0.15, nod: 4 },
  };
  window.EkoExpr = { LIST: E, names: Object.keys(E) };
})();
