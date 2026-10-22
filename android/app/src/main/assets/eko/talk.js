// Eko en el móvil · lo que dice. Las frases de reacción vienen del Eko de escritorio (main.js) y se suman las del móvil.
// Kotlin avisa de lo que pasa con eko.talk("evento"); aquí se elige la frase (sin repetir las últimas) y se pide el bocadillo con Android.say().
(() => {
  "use strict";
  const T = {
    costume: ["¿Qué tal me queda?", "¡Cambio de look!", "¿A que estoy guapo?"],
    noteHi: ["¡Me has leído!", "¡Has venido!", "Sabía que vendrías", "¡Hola, hola!"],
    // Apps («{app}» = su nombre). Solo sabe qué app es, nunca lo que hay dentro
    app_social: ["¿Qué se cuenta por {app}?", "Saluda a todos de mi parte", "Yo también quiero salir en las historias", "Un ratito de {app} y seguimos, ¿vale?"],
    app_chat: ["¿Con quién hablas? No me lo digas, no miro", "Mándales un saludo mío", "Escribe, escribe, yo espero"],
    app_camera: ["¡Sácame en la foto!", "¿Qué fotografiamos hoy?", "Busca buena luz, que salgo pálido", "Yo poso, tú disparas"],
    app_gallery: ["¿Me enseñas las fotos?", "Esa me gusta. Bueno, todas", "¿Salgo yo en alguna?"],
    app_edit: ["¡Hora de editar! Un poquito más de luz…", "Qué bien te quedan las fotos", "Si quieres, te digo qué filtro me favorece"],
    app_music: ["¡Música! Pon algo que se pueda bailar", "¿Qué suena hoy?", "Mis piececitos ya se mueven"],
    app_video: ["¿Palomitas?", "Me quedo quietecito mientras lo ves", "¿De qué va? No, no me lo cuentes"],
    app_game: ["¿Echamos una partida? Yo animo", "¡Tú puedes!", "Si pierdes, no se lo digo a nadie"],
    app_maps: ["¿A dónde vamos?", "Llévame contigo", "Yo me sé el camino. Mentira"],
    app_mail: ["¿Muchos correos? Ánimo", "Que sean todos buenas noticias"],
    app_shop: ["¿Me compras algo?", "Yo quiero un gorro nuevo", "Mira bien los precios, ¿eh?"],
    app_settings: ["¿Tocando ajustes? Cuidado conmigo", "No me desactives, ¿vale?"],
    app_calendar: ["¿Mucho lío esta semana?", "Apúntame en algún hueco"],
    app_web: ["¿Qué buscas?", "Si encuentras algo de galletas, avísame"],
    scroll: ["Llevas un buen rato en {app}… ¿estiramos un poco?", "¿Otro ratito en {app}? Yo me estoy aburriendo", "Pausa: mira lejos 20 segundos. Yo cuento"],
    silent: ["Shhh… modo silencio. Yo también me callo un poco", "Silencio activado. Seré un ninja"],
    vibrate: ["Modo vibración: bzzz", "Bzzz bzzz. Ya estoy en modo vibración yo también"],
    ringOn: ["¡Ya vuelve a sonar todo!", "Volumen de vuelta"],
    netLost: ["¡Uy! Nos hemos quedado sin internet", "Sin conexión… ¿jugamos mientras?"],
    netBack: ["¡Internet de vuelta!", "Ya hay conexión otra vez"],
    batteryFull: ["¡Batería llena! Ya puedes desenchufar", "Cargado al cien. Igual que yo de energía"],
    lateNight: ["¿Qué haces despierto a estas horas?", "Es muy tarde… ¿seguro que no quieres dormir?", "Yo estaba soñando con galletas…"],
    keyboard: ["¡Subo, que vas a escribir!", "¡Hop! Desde aquí se ve mejor", "Escribe, escribe, que no miro", "Me pongo encima, que abajo no se ve nada"],
    kbGone: ["¡Eh, que me quitas el suelo!", "¡Aaay!", "Bajandooo…", "Avisa antes de cerrar el teclado"],
    hello: ["¡Holi!", "¡Ya estoy aquí!", "¿Qué hacemos hoy?", "¡Qué grande es tu pantalla!", "¡Allá voy!", "¿Me has echado de menos? Yo a ti sí"],
    poke: ["¿Me llamabas?", "¡Presente!", "¿Qué pasa?", "¡Aquí!", "¡Hop!", "¡Cosquillas no!", "¿Jugamos?", "¡Boing!", "Mantenme pulsado y te enseño mis cosas", "¡Jiji!", "Me gusta tu móvil", "¿Eso era un toque o un mimo?"],
    pokeAnnoyed: ["¡Vale ya!", "¿Otra vez?", "Me vas a gastar", "¡Que no soy un botón!", "Como sigas, me escondo", "Uf… ¿no tienes nada mejor que hacer?"],
    grab: ["¡Eh, que me despeino!", "¡Secuestro!", "¿A dónde vamos?", "Con cuidado, que soy de plastilina", "Esto no estaba en mi agenda", "¡Wiii!", "¿Me llevas de paseo?"],
    held: ["¿Me vas a tener aquí todo el día?", "Se me están quedando los pies fríos", "Vale, ya puedes soltarme", "Desde aquí se ve toda tu pantalla", "¿Hemos llegado ya?"],
    drop: ["¡Mis piernitas!", "Diez de diez en el aterrizaje", "Avisa la próxima vez", "¿Eso es todo?", "Ni un rasguño", "Otra, otra", "¡Uy, qué vértigo!"],
    shake: ["¡Para, paraaa!", "¡Que no soy una maraca!", "¡Me vas a dejar hecho una bola!", "Mis ojitooos…", "¡Esto es un terremoto!", "¡Socorrooo!"],
    dizzy: ["Veo tres pantallas…", "¿Quién ha apagado la gravedad?", "Necesito sentarme", "¿Dónde está el suelo? Había uno por aquí", "Todo da vueltas…"],
    sleep: ["Me echo una siestecita", "Despiértame si me necesitas", "Zzz… digo, buenas noches", "Cinco minutitos nada más…"],
    wake: ["¡No estaba dormido!", "¿Qué hora es?", "Soñaba con una pelota gigante", "Mmm… ¿ya es mañana?", "¡Ya estoy despierto!"],
    faceDown: ["Qué oscurito… me echo una siesta", "¿Se ha hecho de noche de repente?", "Aquí abajo se está calentito"],
    missed: ["¡Te echaba de menos!", "¡Por fin!", "¡Has vuelto!", "Te estaba esperando", "¡Hola otra vez!", "¿Dónde estabas? Me aburría un montón"],
    charge: ["¡Comida eléctrica! Ñam", "¡Recargando! Qué gustito", "Gracias, ya me notaba flojito", "Ooooh, cosquillas de energía"],
    lowBattery: ["Estoy cansadito… ¿me cargas el móvil?", "Me quedan pocas pilas… y a ti también", "Si se apaga el móvil, me quedo a oscuras…"],
    music: ["¡Cascos puestos! ¿Qué escuchamos?", "¡Música! Yo también me los pongo", "Pon algo que se pueda bailar", "Si es reguetón, bailo; si es balada, lloro"],
    musicOff: ["¿Se acabó la música?", "Me había quedado con ganas de bailar"],
    eat: ["¡Ñam! Gracias", "¡Qué rica!", "Mmm… ¡otra!", "La mejor galleta del mundo", "Crunch, crunch… perdón, con la boca llena no se habla"],
    play: ["¡Voltereta!", "¿Has visto eso?", "¡Otra vez, otra vez!", "¡Tachán!", "Diez puntos para mí"],
    jump: ["¡Mira qué salto!", "¡Hoooop!", "¡Casi toco el techo!"],
    dance: ["Me ha entrado el baile", "¡Un, dos, tres!", "Esto lo he aprendido mirándote", "Tengo ritmo, ¿eh?"],
    peek: ["¿Qué habrá por aquí?", "Cucú…", "Voy a investigar"],
    peekBack: ["¡Ya estoy!", "Por ahí no hay nada interesante", "Me he asomado y… nada, una esquina"],
  };
  // Lo que suelta por su cuenta, según la hora, el día y lo que pasa
  const CHAT = {
    morning: ["¡Buenos días! ¿Has desayunado?", "Hoy va a ser un buen día, lo noto en mi brote", "Mañanita… ¿café o colacao?", "¡Arriba esos ánimos!"],
    noon: ["¿Qué hay de comer?", "Huele a comida… ¿o soy yo?", "Hora de la siesta… para mí, digo"],
    afternoon: ["¿Qué tal va la tarde?", "Un poquito más y terminamos, ¿no?", "Me apetece un paseo"],
    evening: ["¿Qué tal el día?", "¿Peli esta noche?", "La mejor hora: el sofá"],
    night: ["¿Aún despierto? El móvil también necesita dormir", "Las pantallas de noche dan sueño… o eso dicen", "Yo ya bostezo… ¿y tú?", "Mañana más, ¿vale?"],
    monday: ["Lunes… ánimo, que tú puedes", "¿Ya es lunes otra vez?"],
    friday: ["¡Viernes! ¿Planes?", "Huele a finde"],
    weekend: ["¡Fin de semana! ¿Qué plan hay?", "Hoy nada de prisas", "Domingo de mantita, ¿sí o sí?"],
    any: [
      "¿Sabías que los champiñones son más primos nuestros que de las plantas?",
      "He contado tus apps. Me perdí en la doce",
      "Me encanta pasear por tu pantalla",
      "Si me pierdes, mira abajo: siempre ando por aquí",
      "¿Me haces una foto algún día?",
      "Estoy pensando… nada, se me ha olvidado",
      "Una pregunta: ¿los iconos muerden?",
      "Hoy me siento especialmente redondito",
      "Me gustaría tener una mascota. ¿Un píxel, quizá?",
      "Si fuera un emoji, sería el de la galleta",
      "A veces practico caras en el reflejo de la pantalla",
      "¿Tú también hablas solo a veces? Yo sí. Ahora mismo, por ejemplo",
      "Creo que tu móvil me cae bien",
      "Mi plan para hoy: estar contigo y comer galletas",
      "He oído que en el ordenador tengo un huerto… ¡qué envidia de mí mismo!",
      "¿Te he dicho hoy que me alegro de verte? Pues eso",
    ],
  };
  const last = {};
  function pick(key, list) {
    const recent = last[key] || (last[key] = []);
    const pool = list.filter((x) => !recent.includes(x));
    const s = (pool.length ? pool : list)[Math.floor(Math.random() * (pool.length || list.length))];
    recent.push(s); if (recent.length > Math.min(4, list.length - 1)) recent.shift();
    return s;
  }
  function say(text, ms) {
    ms = ms || Math.min(5200, 2000 + text.length * 45);
    if (window.Android && Android.say) Android.say(text, ms);
  }
  let pokes = [];
  // Cara que pone con cada cosa (catálogo expr.js del PC)
  const EXPR = {
    hello: "emocionado", noteHi: "enamorado", poke: "contento", pokeAnnoyed: "molesto", grab: "sorprendido", held: "irritado",
    drop: "orgulloso", shake: "asustado", dizzy: "confundido", wake: "cansado", hunger: "cansado",
    keyboard: "curioso", kbGone: "sorprendido", costume: "canalla", music: "emocionado", musicOff: "triste",
    lowBattery: "ansioso", charge: "contento", missed: "esperanzado", eat: "enamorado", play: "divertido",
    app_camera: "emocionado", app_gallery: "curioso", app_edit: "orgulloso", app_music: "emocionado", app_game: "emocionado",
    app_shop: "picaro", app_settings: "ansioso", app_chat: "timido", scroll: "esperanzado", silent: "timido",
    netLost: "asustado", netBack: "contento", batteryFull: "orgulloso", lateNight: "cansado",
  };
  function talk(ev, chance = 1, arg = "") {
    if (Math.random() > chance) return;
    if (ev === "poke") {
      const now = Date.now(); pokes = pokes.filter((t) => now - t < 10000); pokes.push(now);
      if (pokes.length >= 6) { say(pick("pokeAnnoyed", T.pokeAnnoyed)); if (window.eko && eko.express) eko.express("molesto"); return; }
    }
    const list = T[ev]; if (list) { say(pick(ev, list).replace(/\{app\}/g, arg || "esa app")); if (EXPR[ev] && window.eko && eko.express) eko.express(EXPR[ev]); }
  }
  function special(d) {
    const m = d.getMonth() + 1, day = d.getDate();
    if (m === 10 && day === 31) return "¡Buuu! ¿Te he asustado? ¡Feliz Halloween!";
    if (m === 12 && (day === 24 || day === 25)) return "¡Feliz Navidad!";
    if (m === 1 && day === 1) return "¡Feliz año nuevo!";
    if (m === 12 && day === 31) return "¡Último día del año! ¿Uvas preparadas?";
    return null;
  }
  // Charla espontánea: Kotlin la pide cuando Eko está tranquilo y despierto
  function chatter() {
    const d = new Date(), h = d.getHours(), wd = d.getDay();
    const sp = special(d); if (sp && Math.random() < 0.3) { say(sp); return; }
    const r = Math.random();
    let key;
    if (r < 0.35) key = h >= 6 && h < 12 ? "morning" : h < 16 ? "noon" : h < 20 ? "afternoon" : h < 23 ? "evening" : "night";
    else if (r < 0.5) key = wd === 1 ? "monday" : wd === 5 ? "friday" : (wd === 0 || wd === 6) ? "weekend" : "any";
    else key = "any";
    if (h >= 1 && h < 6) key = "night";
    say(pick("c" + key, CHAT[key]));
  }
  window.ekoTalk = { talk, chatter };
})();
