// Eko en el móvil · lo que dice. Las frases de reacción vienen del Eko de escritorio (main.js) y se suman las del móvil.
// Kotlin avisa de lo que pasa con eko.talk("evento"); aquí se elige la frase (sin repetir las últimas) y se pide el bocadillo con Android.say().
(() => {
  "use strict";
  const T = {
    followed: ["¡Te he seguido! El PC se había quedado solo", "Te vi irte del PC… ¡y aquí estoy!", "¿Me dejabas solo en el PC? Ni hablar", "¡Contigo a todas partes!"],
    // Teclado: antes de desaparecer con magia, y al volver
    kb_magic: ["¡Vas a escribir! Me esfumo para no molestar", "Tú escribe tranquilo, yo desaparezco un ratito", "Abracadabra… ¡te dejo sitio!", "Me voy de paseo mientras escribes", "¡Modo invisible! Vuelvo cuando termines", "Hago magia y te dejo la pantalla para ti"],
    kbBack: ["¡Ya estoy aquí! ¿Has terminado?", "¡Hola otra vez!", "¿Ya? Qué rápido escribes", "¡He vuelto! ¿Me echabas de menos?", "Listo, ya puedo volver, ¿no?"],
    kbBackLong: ["¡Cuánto has escrito!", "Pensé que no acababas nunca", "Menuda novela, ¿eh?", "He dado una vuelta enorme mientras escribías"],
    kbSouvenir: ["Mientras escribías he ido a por una galleta", "Te traigo una galleta. Bueno, me la traigo a mí", "He encontrado esto por ahí. ¡Ñam!"],
    kbFlower: ["Te he traído un poquito de cariño", "¡He vuelto con regalo: mimos!"],
    toPc: ["¡Me llaman del PC! Ahora vuelvo", "¡Me voy al ordenador contigo!", "¡Hasta luego! Nos vemos en el PC"],
    fromPc: ["¡Ya estoy aquí!", "¡He vuelto del PC!", "¡Hola otra vez! Vengo del ordenador"],
    pcArrived: ["¡Hola! Soy {app}, el del PC. Ahora también vivo aquí", "¡Ya estoy en tu móvil! Soy {app}, ¿me reconoces?", "¡Mudanza completada! {app} ya está en tu bolsillo"],
    // Con el teclado abierto: se quita de en medio y lo cuenta
    kb_side: ["Me escondo aquí al ladito, tú escribe", "Yo me aparto, que tienes cosas que contar", "Desde aquí te espío… es broma, no miro", "Me hago pequeñito para no estorbar", "Aquí en el borde no molesto, ¿verdad?", "Escribe tranquilo, yo me asomo de vez en cuando", "Me quito de en medio. Tú a lo tuyo"],
    kb_behind: ["Me meto detrás del teclado, que hay sitio", "Solo asomo la cabecita, prometido", "Aquí abajo se está calentito", "Tú escribe, yo me agacho", "Escondido entre las teclas… ¡no me pulses!", "Me agacho para que veas bien lo que escribes", "Modo ninja: solo se me ven los ojos"],
    kb_corner: ["Me siento aquí en la esquina mientras escribes", "Yo me quedo en mi rinconcito", "Desde aquí te animo a escribir", "Esquina reservada para mí. Tú escribe", "Me aparto a un ladito, que necesitas espacio", "Aquí sentadito no estorbo"],
    kbLong: ["¿Todavía escribiendo? Qué inspiración", "Cuánto tienes que contar…", "Yo sigo aquí escondido, sin molestar", "Me encanta el sonido de las teclas. Bueno, me lo imagino", "No te preocupes por mí, estoy bien aquí", "¿Es una carta de amor? No, no me lo digas", "Escribes más rápido que yo ando"],
    albumAsk: ["¿Me das tus favoritas para mi álbum? Tócame", "Tócame y elige las mejores fotos del paseo", "¡Quiero ver las fotos! Tócame y me das alguna"],
    photoGift: ["¡Gracias! Ya tengo {app} fotos nuevas en mi álbum", "¡Qué bonitas! Las guardo con cariño", "Mi álbum está cada vez más chulo"],
    diaryAsk: ["¿Me cuentas qué tal el día? Tócame", "Es hora del diario. Tócame y me lo cuentas", "¿Qué tal hoy? Tócame, que tengo la libreta preparada"],
    stepsGoal: ["¡Meta cumplida: {app} pasos! Qué piernas tenemos", "¡Ya llevamos {app} pasos! Me he ganado un premio, ¿no?", "{app} pasos… ¡meta conseguida!", "¡Toma ya, {app} pasos! Meta del día hecha"],
    goalStreak: ["¡Meta cumplida! Llevamos {app} días seguidos", "¡{app} días seguidos cumpliendo! Somos imparables", "Racha de {app} días. ¡No la rompamos!", "¡Otro día más! Ya van {app}"],
    stepsHalf: ["¡Ya vamos por la mitad! {app} pasos", "Medio camino hecho: {app} pasos", "{app} pasos. ¡Vamos, que se puede!"],
    stepsBeyond: ["¡{app} pasos! Esto ya es de campeones", "Hemos superado la meta de largo: {app} pasos", "¡{app}! Mis piernecitas no se lo creen"],
    find: ["¡Mira lo que he encontrado: {app}!", "Por el camino me he encontrado {app}. Lo guardo en mi colección", "¡Ooh! {app}. Para mi colección", "Me lo quedo: {app}"],
    findMany: ["¡Cuántas cosas he encontrado! {app}", "Paseo productivo, he encontrado {app}"],
    longWalk: ["¡Qué paseo más largo! Estoy cansado… pero feliz", "Uf, menuda caminata. Me voy a echar una siestecita", "Me duelen los piececitos. ¡Ha merecido la pena!"],
    streakLost: ["Ayer no salimos… Adiós a nuestra racha de {app} días. Bueno, ¡empezamos otra!", "Se nos rompió la racha de {app} días. Snif. Hoy volvemos a la carga", "Racha de {app} días… perdida. Yo ya la echo de menos"],
    lazy: ["Llevamos dos días casi sin salir. ¿Hoy damos una vuelta?", "Me estoy aburriendo de mirar la pared… ¿salimos hoy?", "¿Y si hoy salimos aunque sea un ratito?"],
    sedentary: ["Llevamos mucho rato quietos. ¿Damos una vuelta?", "¿Un paseo corto? Aunque sea a por agua", "Mis piernas se están durmiendo. ¿Y las tuyas?", "Cinco minutos andando y volvemos, ¿trato?"],
    photoWalkStart: ["¡Paseo de fotos! Te iré poniendo retos", "¡Vamos a hacer fotos! Yo te digo qué buscar", "Modo cazador de fotos: ¡activado!"],
    photoWalkEnd: ["Fin del paseo de fotos. ¿Has cazado alguna buena?", "¡Qué buen paseo de fotos! Me lo he pasado genial", "Paseo terminado. Ya me enseñarás las fotos"],
    challenge: ["Reto: algo rojo", "Reto: una sombra curiosa", "Reto: un reflejo", "Reto: algo redondo", "Reto: una textura bonita", "Reto: algo que parezca una cara", "Reto: líneas que lleven la mirada", "Reto: algo muy pequeño, de cerca", "Reto: una ventana", "Reto: algo amarillo", "Reto: una escalera", "Reto: un contraluz", "Reto: algo que se mueva", "Reto: una puerta bonita", "Reto: el cielo de ahora mismo", "Reto: una planta en un sitio raro", "Reto: algo simétrico", "Reto: tres cosas iguales", "Reto: un detalle que nadie mira", "Reto: una letra escondida en la calle", "Reto: algo viejo y bonito", "Reto: un color que combine con otro", "Reto: un charco o algo que brille", "Reto: una foto desde muy abajo", "Reto: una foto desde muy arriba", "Reto: algo azul", "Reto: un gato. Si lo encuentras, me lo presentas", "Reto: algo que te haga gracia"],
    golden: ["¡Se acerca la hora dorada! ¿Salimos a hacer fotos?", "La luz se va a poner preciosa dentro de nada", "Hora dorada a la vista. ¡Coge la cámara!"],
    walking: ["¡Vamos de paseo!", "¿A dónde vamos? Yo voy contigo", "Un, dos, un, dos…", "Me encanta pasear contigo", "¡Qué bien se está andando!", "No corras, que tengo las piernas cortas"],
    costume: ["¿Qué tal me queda?", "¡Cambio de look!", "¿A que estoy guapo?"],
    noteHi: ["¡Me has leído!", "¡Has venido!", "Sabía que vendrías", "¡Hola, hola!"],
    // Apps («{app}» = su nombre). Solo sabe qué app es, nunca lo que hay dentro. Se mezclan con las de cada app concreta (APP) y las de la hora (appTime)
    app_social: ["¿Qué se cuenta por {app}?", "Saluda a todos de mi parte", "Yo también quiero salir en las historias", "Un ratito de {app} y seguimos, ¿vale?", "Si ves algo gracioso, me lo cuentas", "¿Cuántos «me gusta» llevamos hoy?", "Dale like a algo bonito por mí", "Yo sería un influencer buenísimo. De plastilina", "Cotilleo rapidito y volvemos, ¿no?"],
    app_chat: ["¿Con quién hablas? No me lo digas, no miro", "Mándales un saludo mío", "Escribe, escribe, yo espero", "Pon un emoji de los míos", "¿Buenas noticias?", "Yo me quedo aquí calladito", "Diles que tienes una mascota genial", "Si es para quedar, apúntame"],
    app_camera: ["¡Sácame en la foto!", "¿Qué fotografiamos hoy?", "Busca buena luz, que salgo pálido", "Yo poso, tú disparas", "¡Patata!", "Encuadra bien, que te conozco", "Cuidado con el contraluz", "Hoy tengo mi lado bueno a la izquierda", "¿Ráfaga? ¡Ráfaga!"],
    app_gallery: ["¿Me enseñas las fotos?", "Esa me gusta. Bueno, todas", "¿Salgo yo en alguna?", "Cuántos recuerdos aquí guardados", "Esa tiene buena luz", "¿Borramos las movidas?", "Yo elegiría esa para enmarcar"],
    app_edit: ["¡Hora de editar! Un poquito más de luz…", "Qué bien te quedan las fotos", "Si quieres, te digo qué filtro me favorece", "Un pelín de calidez y lista", "No te pases con la saturación, ¿eh?", "Yo de mayor quiero ser preset", "Esa va a quedar preciosa", "Edita tranquilo, yo no toco nada"],
    app_music: ["¡Música! Pon algo que se pueda bailar", "¿Qué suena hoy?", "Mis piececitos ya se mueven", "Sube un poquito, que no oigo", "Pon la mía. Bueno, no tengo", "¿Hacemos un concierto?", "Yo hago los coros"],
    app_video: ["¿Palomitas?", "Me quedo quietecito mientras lo ves", "¿De qué va? No, no me lo cuentes", "Uno y a dormir, ¿eh?", "Avísame si sale un perrito", "Yo me pido el sitio del sofá", "Sin spoilers, por favor"],
    app_game: ["¿Echamos una partida? Yo animo", "¡Tú puedes!", "Si pierdes, no se lo digo a nadie", "Modo concentración activado", "¿Puedo ser el jefe final?", "Yo te guardo las vidas", "¡A por el récord!"],
    app_maps: ["¿A dónde vamos?", "Llévame contigo", "Yo me sé el camino. Mentira", "¿Hay galletas en el destino?", "Gira a la izquierda. O a la derecha. No sé", "Me apunto a la excursión"],
    app_mail: ["¿Muchos correos? Ánimo", "Que sean todos buenas noticias", "Bandeja de entrada a cero. Tú puedes", "Si hay alguno aburrido, lo leo yo. Es broma", "Respira hondo antes de abrirlos"],
    app_shop: ["¿Me compras algo?", "Yo quiero un gorro nuevo", "Mira bien los precios, ¿eh?", "¿Eso lo necesitas o lo quieres?", "Añade galletas al carrito", "Yo solo miro"],
    app_settings: ["¿Tocando ajustes? Cuidado conmigo", "No me desactives, ¿vale?", "Pon el modo oscuro, que me favorece", "¿Qué estamos arreglando?"],
    app_calendar: ["¿Mucho lío esta semana?", "Apúntame en algún hueco", "¿Algún cumpleaños pronto?", "Deja un hueco para descansar"],
    app_web: ["¿Qué buscas?", "Si encuentras algo de galletas, avísame", "¿Investigando?", "Busca «mascotas adorables». Saldré yo", "Una pestaña más y ya, ¿eh?"],
    app_other: ["¡Anda, {app}!", "¿Qué hacemos en {app}?", "{app}… interesante", "Yo también quiero probar {app}", "¿Para qué sirve {app}? Me lo enseñas luego", "Vale, {app}. Yo te espero aquí", "Uy, {app}. Esto no lo había visto"],
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
    hello: "emocionado", noteHi: "enamorado", followed: "emocionado", kb_magic: "picaro", kbBack: "contento", kbBackLong: "sorprendido", kbSouvenir: "divertido", kbFlower: "enamorado", pcArrived: "emocionado", toPc: "contento", fromPc: "emocionado", kb_side: "timido", kb_behind: "picaro", kb_corner: "contento", kbLong: "curioso", poke: "contento", pokeAnnoyed: "molesto", grab: "sorprendido", held: "irritado",
    drop: "orgulloso", shake: "asustado", dizzy: "confundido", wake: "cansado", hunger: "cansado",
    keyboard: "curioso", kbGone: "sorprendido", costume: "canalla", music: "emocionado", musicOff: "triste",
    lowBattery: "ansioso", charge: "contento", missed: "esperanzado", eat: "enamorado", play: "divertido",
    app_camera: "emocionado", app_gallery: "curioso", app_edit: "orgulloso", app_music: "emocionado", app_game: "emocionado",
    app_shop: "picaro", app_settings: "ansioso", app_chat: "timido", scroll: "esperanzado", silent: "timido",
    netLost: "asustado", netBack: "contento", batteryFull: "orgulloso", lateNight: "cansado", stepsGoal: "orgulloso", walking: "emocionado",
    goalStreak: "orgulloso", stepsHalf: "contento", stepsBeyond: "emocionado", find: "sorprendido", findMany: "emocionado", longWalk: "cansado",
    streakLost: "triste", lazy: "esperanzado", sedentary: "esperanzado", photoWalkStart: "emocionado", photoWalkEnd: "contento", challenge: "curioso", golden: "emocionado",
    albumAsk: "esperanzado", photoGift: "enamorado", diaryAsk: "curioso",
  };
  // Frases para apps concretas (se mezclan con las de su tipo)
  const APP = {
    "com.instagram.android": ["¿Subimos una foto tuya buena? Tienes muchas", "Mira cómo va tu Instagram de fotos", "Algún día seré tu modelo en Instagram", "Historias, reels… yo prefiero galletas"],
    "com.whatsapp": ["¿Muchos grupos hoy?", "Ese audio de 4 minutos… escúchalo a 2x", "Mándale un sticker mío a alguien"],
    "com.google.android.youtube": ["Un vídeo y volvemos, ¿trato hecho?", "Busca vídeos de gatitos. Por investigar", "¿Tutoriales de fotografía hoy?"],
    "com.spotify.music": ["¿Lista para bailar o para pensar?", "Ponme la de siempre", "Spotify y yo, mejores amigos"],
    "com.adobe.lrmobile": ["¡Lightroom! Aquí es donde haces magia", "Curvas, tonos… yo solo entiendo de galletas", "Esa foto va a quedar de portada"],
    "com.google.android.apps.maps": ["¿Hay aventura hoy?", "Busca un sitio bonito para hacer fotos"],
    "com.google.android.GoogleCamera": ["Mira qué luz hay hoy", "Tú a la foto, yo al bocadillo"],
    "com.google.android.apps.photos": ["¿Repasamos fotos antiguas?", "Seguro que hay alguna de comida"],
    "com.zhiliaoapp.musically": ["TikTok… cuidado, que engancha", "Uno más y ya. Bueno, dos"],
    "com.netflix.mediaclient": ["¿Serie nueva o la de siempre?", "Un capítulo. Solo uno"],
  };
  // Según la hora (sirven para cualquier app)
  function appTime() {
    const h = new Date().getHours();
    if (h < 10) return ["¿{app} nada más despertar?", "Buenos días a ti y a {app}"];
    if (h >= 23 || h < 5) return ["¿{app} a estas horas?", "Un ratito de {app} y a dormir, ¿vale?"];
    if (h >= 14 && h < 16) return ["{app} para la sobremesa, buena idea"];
    return [];
  }
  function talk(ev, chance = 1, arg = "", pkg = "") {
    if (Math.random() > chance) return;
    if (ev === "poke") {
      const now = Date.now(); pokes = pokes.filter((t) => now - t < 10000); pokes.push(now);
      if (pokes.length >= 6) { say(pick("pokeAnnoyed", T.pokeAnnoyed)); if (window.eko && eko.express) eko.express("molesto"); return; }
    }
    let list = T[ev];
    const exprKey = ev;
    if (ev.startsWith("app_")) {
      const own = APP[pkg] || [];
      // Si la app tiene frases propias, la mitad de las veces sale una de ellas
      list = own.length && Math.random() < 0.5 ? own : [...(list || []), ...appTime()];
      if (own.length && list === own) ev = "p:" + pkg;
    }
    if (list) { say(pick(ev, list).replace(/\{app\}/g, arg || "esa app")); const e = EXPR[exprKey]; if (e && window.eko && eko.express) eko.express(e); }
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
