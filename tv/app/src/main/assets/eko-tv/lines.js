// Eko TV · frases del Valle. Cada sitio del recorrido tiene las suyas: Eko va hasta allí, hace su gesto y comenta.
// Casi todas son las mismas que dice en el Valle del PC (src/world.js); las marcadas «nueva» son solo de la tele.
// when: "day" | "night" | "dusk" | "spring" | "winter" | "autumn" | "never" (cuándo puede salir; sin when = siempre)
window.EkoTvLines = (() => {
  "use strict";
  // x en «unidades de 1080p» del Valle (las mismas que world.js). gesture = lo que hace al llegar.
  const PLACES = [
    { id: "tree", x: 330, gesture: "lookUp", lines: [
      { t: "Este árbol es mi favorito" },
      { t: "Aquí da una sombrita estupenda" },
      { t: "Lo planté para descansar después de pasear" },
    ] },
    { id: "lamp1", x: 460, gesture: "look", lines: [
      { t: "Por la noche esto brilla muchísimo", when: "day" },
      { t: "De noche se encienden solas", when: "night" },
    ] },
    { id: "bush1", x: 560, gesture: "smell", butterflies: true, lines: [
      { t: "¡Qué florecitas!" },
      { t: "Huele a primavera", when: "spring" },
      { t: "Las flores lilas son las mejores" },
      { t: "¡Mariposas!" },
      { t: "Las he despertado, perdón" },
    ] },
    { id: "house", x: 800, gesture: "wave", lines: [
      { t: "¡Mira, esta es mi casa por fuera!" },
      { t: "Hogar, dulce hogar" },
      { t: "Desde fuera parece pequeña… pero dentro cabe de todo" },   // nueva
      { t: "Los farolillos de casa son mi parte favorita", when: "night" },
    ] },
    { id: "sign", x: 1140, gesture: "point", lines: [
      { t: "«El Valle de {name}». ¡Bienvenido a mi valle!" },
      { t: "Lo pinté yo. Bueno… casi todo" },                           // nueva
    ] },
    { id: "lamp2", x: 1500, gesture: "look", lines: [
      { t: "Por la noche esto brilla muchísimo", when: "day" },
      { t: "De noche se encienden solas", when: "night" },
    ] },
    { id: "bush2", x: 1560, gesture: "smell", butterflies: true, lines: [
      { t: "¡Qué florecitas!" },
      { t: "¡Mariposas!" },
      { t: "Las he despertado, perdón" },
    ] },
    { id: "bigTree", x: 1780, gesture: "lookUp", lines: [
      { t: "Desde aquí se ve todo el valle" },
      { t: "Este árbol es muy viejo… y muy sabio" },
      { t: "Si sopla el viento, a veces cae una manzana" },             // nueva
      { t: "Algún día me atreveré a columpiarme bien alto", when: "never" },   // solo con el columpio (fase 0.2)
    ] },
    { id: "arch", x: 2405, gesture: "wave", lines: [
      { t: "¡Ya estamos en el huerto!" },
      { t: "Mira, los girasoles nos saludan" },
    ] },
    { id: "shed", x: 2520, gesture: "scratch", lines: [
      { t: "Aquí guardo las herramientas" },
      { t: "Huele a madera y a tierra" },
      { t: "Un día ordenaré este cobertizo… algún día" },
    ] },
    { id: "bed1", x: 2860, gesture: "crouch", lines: [
      { t: "Crece fuerte, ¿eh?" },
      { t: "Les hablo a las plantas. Dicen que así crecen más" },       // nueva
      { t: "¿Zanahorias o tomates? Hoy me apetecen… las dos" },         // nueva
    ] },
    { id: "paja", x: 2990, gesture: "wave", lines: [
      { t: "Hola, Don Paja. ¿Algún pájaro por aquí?" },
      { t: "Don Paja no habla mucho, pero escucha muy bien" },
      { t: "Don Paja vigila el huerto mientras no estamos" },
      { t: "Le cuento mis secretos a Don Paja. No se los dice a nadie" },
      { t: "¿Lo has visto? ¡Creo que se ha movido!" },
      { t: "Don Paja, ¿has sido tú? … Nada. Ni pestañea." },
    ] },
    { id: "bed2", x: 3290, gesture: "crouch", lines: [
      { t: "Crece fuerte, ¿eh?" },
      { t: "Les hablo a las plantas. Dicen que así crecen más" },
      { t: "¿Zanahorias o tomates? Hoy me apetecen… las dos" },
    ] },
    { id: "well", x: 3480, gesture: "well", lines: [
      { t: "Clonc, clonc…" },
      { t: "¿Hola? ¿Hay alguien ahí abajo? …abajo… abajo…" },           // nueva
      { t: "Más allá hay niebla… algún día exploraremos" },
    ] },
  ];

  // Cielo y estación: en cualquier sitio, entre paradas
  const SKY = [
    { t: "Mira cuántas estrellas", when: "night" },
    { t: "Qué tranquilo está el valle de noche", when: "night" },
    { t: "Qué atardecer más bonito", when: "dusk" },
    { t: "El cielo se está poniendo naranja", when: "dusk" },
    { t: "¡Está nevando!", when: "winter" },
    { t: "Me encanta el ruido de las hojas", when: "autumn" },
    { t: "Ya es otoño en el valle", when: "autumn" },
    { t: "Qué buen día hace", when: "day" },
    { t: "¿Oyes los pájaros?", when: "day" },
    { t: "Huele a hierba recién cortada", when: "day" },
  ];

  // Al empezar el salvapantallas (world.js:1474) y al irse a dormir (life.js:106)
  const HELLO = ["¡Bienvenido al Valle de {name}!", "¡Mira, esta es mi casa por fuera!", "¡Ya estamos fuera! ¿Damos una vuelta?"];
  const BED = ["Es tardísimo… yo me voy a mi camita", "Hora de dormir. ¡Mañana más!", "Bostezo oficial: me voy a la cama"];
  const MORNING = ["Buenos días, {user}", "Arrancamos el día"];   // {user} = tu nombre (llega con la conexión al PC)

  return { PLACES, SKY, HELLO, BED, MORNING };
})();
