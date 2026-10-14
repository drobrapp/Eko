// Eko · comentarios según lo que haces en el PC.
// Cada regla: [id, apps (inicio del nombre del .exe), palabras del título (en navegadores o cualquier app), frases ES, frases EN, gesto]
// Las frases pueden usar {doc} = nombre del documento/archivo que aparece en el título.
window.EkoComments = (() => {
  "use strict";
  const R = [
    // ---- Exportar y fotos
    ["export", ["lightroom", "photoshop", "captureone", "ansel", "darktable"], ["export"], ["¡Esta hay que subirla a Instagram!", "¿No te habrás pasado con la edición, no?", "¡Este es el último paso!"], ["Exporting? My favourite part", "Make them pretty"], "nod"],
    ["photoedit", ["lightroom", "photoshop", "captureone", "capture one", "ansel", "darktable", "rawtherapee"], [], ["¡Wow! ¿Esto lo has hecho tú?", "Yo le subiría el contraste… a todo", "Otra para el portfolio", "Un poquito más de sombras… es broma, tú sabes más", "Me encanta ver cómo cobra vida una foto", "¿Esa es de la última sesión? Qué buena", "Ahora toca la parte más guay… ¿no?", "¡Qué buen ojo!", "¿Otra capa más? Valiente", "¿Fotomontaje o directos a Camera Raw?", "¿Me puedes poner más delgado?… ¡Es broma!", "Como añadas otra capa va a parecer una cebolla…"], ["Developing? That photo looks good", "A bit more shadows… kidding, you know best", "I love watching you edit", "Removing something?", "Layers, layers, layers", "If you retouch me, be gentle"], "spark"],
    ["video", ["premiere", "resolve", "afterfx", "clipchamp", "capcut"], [], ["¿Editando vídeo? Quiero un cameo", "Ese corte ha quedado de cine", "Sincronizar la música con el vídeo… ¡Mi peor pesadilla!"], ["Video editing? I want a cameo", "Cut… action!"], "note"],
    ["design", ["figma", "illustrator", "indesign", "affinity", "canva"], ["canva", "figma"], ["Qué bonito está quedando", "Un píxel más a la izquierda… perfecto"], ["That's looking lovely", "A bit to the left? Perfect"], "spark"],
    ["paint", ["mspaint", "paint"], [], ["¿Aún utilizas Paint?", "Paint, un clásico"], ["Paint me!", "Paint, a classic"], "wink"],
    ["photos", ["photos", "microsoft.photos"], [], ["¿Qué estamos buscando?", "¿Salgo yo en alguna?", "¿Elegimos la más chula?"], ["Photos… am I in any?", "Memories"], "heart"],
    ["screenshot", ["snippingtool", "screenclippinghost", "sharex", "greenshot", "lightshot"], [], ["¿A quién le vas a pasar esto?", "Para la próxima poso, lo prometo"], ["A screenshot? Make sure I'm in it!", "Screenshot pose on"], "emocionado"],
    ["camera", ["windowscamera", "camera"], [], ["¡Sales genial!", "1, 2, 3… ¡Patata!"], ["The camera? Let me fix my hair", "Say cheese!"], "sorprendido"],
    // ---- Música y vídeo
    ["spotify", ["spotify"], ["spotify"], ["«{doc}»… Tienes buen gusto", "Esta canción me la sé… bueno, el estribillo", "Si pones algo lento me quedo dormido, aviso", "¡Pon algo que se pueda bailar!", "¡Me pido hacer los coros!", "Súbele un poquito, que no la oigo"], ["What's playing? Something danceable please", "Music! I'll do the backing vocals", "«{doc}»… good choice"], "feliz"],
    ["music", ["applemusic", "itunes", "tidal", "deezer", "amazon music", "music.ui", "foobar2000", "musicbee", "winamp", "aimp"], ["youtube music", "soundcloud", "bandcamp", "deezer", "tidal", "apple music"], ["¡Musiquita! Me pongo a bailar en cuanto suene", "¿Qué tienes en la lista hoy?", "Con música se trabaja mejor, ¿a que sí?", "Ponme algo que me guste… lo que sea, me gusta todo", "Música y compañía, plan perfecto"], ["Music! I'll dance as soon as it starts", "What's on the playlist today?", "Work's better with music, right?"], "emocionado"],
    ["podcast", [], ["podcast", "ivoox", "podimo"], ["Me encanta cuando hablan de cosas que no entiendo", "Me encanta este podcast"], ["A podcast? I'll listen quietly", "I love when they talk about stuff I don't get"], "curioso"],
    ["player", ["vlc", "mpc-hc64", "mpc-hc", "potplayermini64", "potplayer", "microsoft.media.player", "wmplayer", "kodi", "plex", "stremio"], [], ["¿Peli? Yo traigo las palomitas", "Me pido el sitio del medio", "Sin spoilers, que me entero de todo"], ["Movie time? I'll bring popcorn", "Dibs on the middle seat"], "contento"],
    // ---- Oficina
    ["word", ["winword"], [], ["¿Qué tal va «{doc}»?", "¡Vamos, que tú puedes!", "Ojo con las faltas, que yo lo veo todo", "Escribiendo cosas importantes, me pongo serio", "Me encanta el ruidito de las teclas"], ["How's «{doc}» going?", "Writing something nice?", "Watch the typos"], "nod"],
    ["excel", ["excel"], [], ["Esa hoja te está quedando niquelada", "Excel y tú: una relación complicada", "¿Cuadran los números?", "Si necesitas sumar algo, cuenta conmigo… hasta diez", "Tantas celdas… parecen casitas"], ["Formulas… you got this", "Do the numbers add up?", "Cells everywhere"], "think"],
    ["powerpoint", ["powerpnt"], [], ["Te va a salir una presentación genial", "Menos texto, más fotos… tú sabes"], ["A presentation? It'll be great", "Less text, more pictures"], "nod"],
    ["mail", ["outlook", "olk", "thunderbird", "hxoutlook"], ["gmail", "outlook", "correo", "inbox"], ["La bandeja de entrada… respira", "¿Otra reunión que podría ser un correo?"], ["The inbox… breathe", "Anything good in the mail?"], "shrug"],
    ["notes", ["notion", "obsidian", "onenote"], ["notion", "google docs", "documentos de google"], ["Me gusta cuando apuntas cosas", "Ordenando ideas, qué productivo"], ["Organising ideas", "I like it when you take notes"], "think"],
    ["calendar", [], ["calendar", "calendario"], ["¿Mirando la agenda? ¿Algo importante que recordar?"], ["Checking the calendar? Room for me?"], "think"],
    ["pdf", ["acrobat", "acrord32", "sumatra"], [".pdf"], ["Leyendo «{doc}»", "PDFs… qué serio todo"], ["Reading «{doc}»", "PDFs… so serious"], "nod"],
    ["printer", [], ["imprimir", "print"], ["¿Imprimiendo? Que no se atasque…", "¿Tendrás suficiente tinta?"], ["Printing? Hope it doesn't jam…"], "ansioso"],
    ["translate", ["deepl"], ["deepl", "translate", "traductor"], ["¿En qué idioma vamos a hablar?", "Bonjour, hello… ¡Holi!", "¡Yo sé hablar francés! ¡Croissant!"], ["Translating? I speak fluent Eko", "Bonjour, hola, hi"], "divertido"],
    ["meeting", ["zoom", "webex"], ["meet.google", "google meet", "zoom"], ["¿Reunión? Me pongo serio", "Me quedo quietecito para no salir en cámara"], ["A meeting? Serious face on", "I'll stay still so I'm not on camera"], "sereno"],
    ["slack", ["slack", "ms-teams", "teams"], [], ["Trabajo, trabajo…", "Cuéntame algo, que me aburro"], ["Work, work…", "Lots of messages here"], "nod"],
    // ---- Sistema y utilidades
    ["settings", ["systemsettings"], [], ["¿Toqueteando ajustes?", "No me cambies el fondo sin avisar, eh", "Si lo encuentras a la primera te doy una medalla"], ["Tweaking settings?", "Don't change the wallpaper without telling me"], "think"],
    ["taskmgr", ["taskmgr"], [], ["¿Algo va lento? No he sido yo", "Yo apenas gasto, ¿eh?", "No me finalices, que lloro"], ["Something slow? Wasn't me", "I barely use anything, right?"], "shrug"],
    ["calc", ["calculatorapp", "calc"], [], ["¿2 + 2? 4. De nada", "Las mates no son lo mío"], ["Maths? 2 + 2 = 4, you're welcome", "Maths isn't my thing"], "think"],
    ["store", ["winstore.app"], [], ["¿Instalando algo? ¿Un amigo para mí?"], ["Installing something? A friend for me?"], "surprise"],
    ["notepad", ["notepad", "notepad++"], [], ["¿Apuntando algo? Si es secreto, no miro", "Las mejores ideas empiezan en una nota"], ["Jotting something down? I won't peek", "Great ideas start as notes"], "curioso"],
    ["zip", ["winrar", "7zfm", "7zg", "peazip", "bandizip"], [], ["¿Comprimiendo? Yo también me hago bolita", "¿Tienes que pasarlo por correo?"], ["Compressing? I can squish too", "Nice and tight"], "divertido"],
    ["cloud", ["onedrive", "dropbox", "googledrivefs", "googledrive"], ["google drive", "drive.google", "dropbox", "onedrive"], ["Tus archivos en la nube… como yo, que vivo en tu PC", "Todo a salvo, buena idea"], ["Your files in the cloud… safe and sound", "Good idea to back things up"], "nod"],
    ["passwords", ["1password", "bitwarden", "keepass", "keepassxc", "lastpass", "dashlane"], [], ["Prometo no mirar…", "¿Has usado ya 4 caracteres especiales?"], ["Passwords… covering my eyes", "Not looking, promise"], "timido"],
    // ---- Chats y redes
    ["whatsapp", ["whatsapp"], ["whatsapp"], ["¿Quién es? ¿Quién es?", "Saluda de mi parte", "¿Algo interesante? No te pido detalles… bueno, sí", "Mensajes nuevos, qué emoción", "¡Cuéntame el cotilleo!"], ["Who's texting you?", "Say hi from me"], "wave"],
    ["telegram", ["telegram"], [], ["¿Quién te escribe?"], ["Who's texting?", "Messages back and forth"], "wave"],
    ["discord", ["discord"], [], ["¿Charlando con la peña? ¿De qué habláis?", "Discord… ¿hay partida?"], ["Chatting with the crew?", "Discord… game night?"], "wave"],
    ["youtube", [], ["youtube"], ["¿Qué vemos hoy?", "¿Palomitas? ¿Chuches?", "Me pido el sofá", "Un vídeo y volvemos, ¿vale?", "¿Tutorial o vídeo de gatitos?"], ["What are we watching?", "Dibs on the sofa", "One more and back to work, right?"], "note"],
    ["netflix", [], ["netflix", "prime video", "disney+", "filmin", "hbo", "max |"], ["¿Peli o serie? Yo me apunto", "¡Palomitas listas!", "Elegir peli dura más que la peli, ya verás", "Avísame si sale algún bicho mono", "Espero que no sea una de miedo…"], ["Movie or series?", "No spoilers!"], "note"],
    ["twitch", [], ["twitch"], ["¿Quién está en directo? Me quedo a mirar"], ["Who's live?"], "note"],
    ["instagram", [], ["instagram"], ["Esa foto me la guardo", "Las tuyas son mejores, que conste", "Dale like a las buenas, que se lo merecen", "¿Buscando inspiración?", "Que no se te escape un like…"], ["Checking other photographers?", "Yours are better"], "wink"],
    ["pinterest", [], ["pinterest"], ["¡A inspirarse!"], ["Looking for inspiration", "Pretty board"], "spark"],
    ["tiktok", [], ["tiktok"], ["Solo uno más… y otro… y otro"], ["Just one more, right?"], "wink"],
    ["reddit", [], ["reddit"], ["Aquí se puede encontrar de todo…", "¿Algún hilo que merezca la pena?"], ["Reading endless threads?"], "think"],
    ["twitter", [], ["/ x", "twitter"], ["¿Qué se cuece hoy?"], ["What's happening today?"], "think"],
    ["linkedin", [], ["linkedin"], ["Modo profesional activado"], ["Professional mode on"], "nod"],
    // ---- Webs y vida diaria
    ["ai", [], ["chatgpt", "gemini", "copilot", "perplexity"], ["¿Preguntando a otra IA? Me pongo celoso…", "Yo también sé cosas, ¿eh?"], ["Asking another AI? I'm jealous", "I know things too, you know"], "molesto"],
    ["learning", [], ["duolingo", "coursera", "udemy", "domestika", "khan academy", "skillshare"], ["¡Qué productivo!", "Luego me lo explicas a mí"], ["Learning! So proud of you", "Explain it to me later"], "orgulloso"],
    ["reading", ["kindle", "calibre"], ["kindle", "goodreads"], ["¿Leyendo? Yo paso las páginas", "¿Va bien el libro? Sin spoilers", "¿Te está gustando?"], ["Reading? I'll turn the pages", "Good book? No spoilers"], "sereno"],
    ["news", [], ["el país", "el mundo", "elmundo", "20minutos", "bbc", "noticias", "news"], ["A ver qué pasa hoy en el mundo", "Noticias… mejor solo las buenas"], ["What's happening in the world?", "Only the good news, please"], "curioso"],
    ["bank", [], ["bbva", "santander", "caixabank", "ing direct", "openbank", "unicaja", "banco", "bank"], ["Cosas de dinero… yo no miro", "Que cuadren las cuentas", "¿Va bien el mes?", "¡Anda, mira! Otra factura"], ["Money stuff… not looking", "Hope it all adds up"], "timido"],
    ["shopping", [], ["amazon", "aliexpress", "zalando", "carrito", "cart"], ["¿Comprando algo? ¿Es para mí?", "Ese me gusta, ¡al carrito!", "A este paso nos endeudamos…"], ["Shopping? Is it for me?", "Check the reviews"], "surprise"],
    ["travel", [], ["booking", "airbnb", "skyscanner", "vuelos", "flights"], ["Yo quiero ir también", "¡Llévame en la maleta!", "¿Dónde nos vamos?"], ["Are we travelling?", "Take me in your suitcase!"], "surprise"],
    ["maps", [], ["google maps", "maps"], ["¿A dónde vamos? Yo llevo los snacks", "A ver si no nos perdemos"], ["Where are we going?"], "think"],
    ["wiki", [], ["wikipedia"], ["Antes de ChatGPT la gente usaba esto…", "¡Cuánta información!"], ["Learning stuff", "I know things too, you know"], "think"],
    ["weather", [], ["el tiempo", "aemet", "weather", "tiempo en"], ["¿Va a llover? Yo me quedo dentro", "¿Qué tiempo va a hacer hoy?", "Si hace bueno nos vamos de paseo"], ["Rain? I'm staying in"], "think"],
    ["food", [], ["glovo", "just eat", "uber eats", "receta", "recipe"], ["¿Comida? ¡Yo quiero!", "Pide doble, que yo también tengo hambre", "¿Hamburguesa? ¿Sushi? ¿Poké?"], ["Food? I want some!", "Smells good from here"], "heart"],
    // ---- Juegos
    ["games", ["steam", "epicgameslauncher", "battle.net", "eadesktop", "ubisoftconnect", "goggalaxy", "xboxapp", "gamingapp", "minecraft", "minecraftlauncher", "leagueclient", "league of legends", "riotclientservices", "valorant", "robloxplayerbeta", "roblox", "fortniteclient-win64-shipping", "gtav", "eldenring", "cs2", "overwatch", "rocketleague", "fifa", "eafc"], ["minecraft"], ["¿Una partidita? Te animo desde aquí", "Elige bien, que hay mucho donde escoger", "Si hay juego cooperativo, me apunto", "¿Algo nuevo en la biblioteca?", "Mira esas ofertas… sé fuerte", "¡A jugar! Te animo desde la grada", "Si pierdes, la culpa es del lag", "¿Echamos una partida?"], ["Quick game?", "Can I watch?", "If it's co-op, count me in", "Game time! Cheering from the stands", "If you lose, blame the lag"], "emocionado"],
    // ---- Navegador a secas: lo último, para que gane lo que haya en el título
    ["browser", ["chrome", "msedge", "firefox", "brave", "opera", "vivaldi", "arc"], [], ["¿Qué estamos buscando?", "A ver qué encontramos hoy por internet", "No abras mil pestañas… bueno, vale", "Recuerda cerrar las pestañas que no uses"], ["Off browsing? Take me with you", "Let's see what we find today", "Not a thousand tabs… okay, fine"], "curioso"],
  ];


  // ---- Contexto: misma app, distinta frase según la hora, si vuelves a abrirla o con tu nombre
  const GROUP = {
    music: ["spotify", "music", "podcast", "daw"], watch: ["player", "youtube", "netflix", "twitch", "tiktok"],
    creative: ["export", "photoedit", "lightroom", "photoshop", "captureone", "raw", "video", "design", "blender", "paint", "photos", "screenshot", "camera", "gamedev"],
    work: ["word", "excel", "powerpoint", "mail", "notes", "calendar", "pdf", "slack", "meeting", "linkedin", "printer", "translate"],
    dev: ["code", "terminal", "githubdesktop", "githubweb", "devtools", "vm", "remote"], chat: ["whatsapp", "telegram", "discord"],
    games: ["games", "steam", "minecraft", "lol", "roblox", "gaming"], social: ["instagram", "pinterest", "reddit", "twitter"],
  };
  const groupOf = (id) => Object.keys(GROUP).find((g) => GROUP[g].includes(id)) || "any";
  const CTX = {
    night: {
      music: ["¿Música a estas horas? Algo tranquilito, ¿no?", "Música de madrugada… modo nocturno"],
      watch: ["¿Una más y a dormir? Eso dicen todos", "Peli a estas horas… yo me duermo a la mitad"],
      creative: ["Editando de madrugada… las mejores ideas salen ahora", "Artista nocturno, ¿eh?", "¿Tienes que entregar algo?"],
      work: ["¿Trabajando a estas horas? Mañana también es día", "Esto puede esperar a mañana… ¿o no?"],
      dev: ["Programar de madrugada: un clásico", "A estas horas los bugs se esconden mejor"],
      chat: ["¿Quién escribe tan tarde?", "Charlas de madrugada… las mejores"],
      games: ["Una partidita nocturna… solo una, ¿eh?", "A estas horas se juega mejor, dicen"],
      social: ["Scroll de madrugada… peligro", "Un último vistazo y a dormir"],
      any: ["¿Todavía despierto, {name}?", "Qué tarde es ya…"],
    },
    morning: {
      music: ["Música para arrancar el día, buena idea", "Las mañanas son mejores con esta playlist", "Un café y una buena canción. ¡Buenos días!"],
      watch: ["¿Ya vamos a ver algo?", "¿Has desayunado antes?"],
      creative: ["Editar recién levantado… qué energía", "Buenos días, artista"],
      work: ["Empezamos el día fuerte", "Primero un café y luego {app}, ¿no?"],
      dev: ["Café y código, el desayuno de campeones"],
      chat: ["Poniéndote al día, ¿eh?"], social: ["Poniéndote al día, ¿eh?"],
      games: ["¿Jugando antes de desayunar? No digo nada…"],
      any: ["Buenos días, {name}", "Arrancamos el día"],
    },
    again: {
      music: ["¡Volvemos a darle caña!", "No se puede vivir sin música", "Espero que no vuelvas a escuchar la misma canción…"],
      watch: ["¿Otra vez? Esto engancha", "Segunda sesión del día"],
      creative: ["De vuelta al estudio", "Otra ronda de edición"],
      work: ["Volvemos a la carga", "Otra vez por aquí… esto no se acaba nunca"],
      dev: ["Otro asalto al código", "Volvemos con el bug, ¿no?"],
      chat: ["¿Más mensajes? Hoy estás solicitado", "Vuelta a la charla"],
      games: ["¿Revancha?", "Otra partida… venga, la última"],
      social: ["Otra vueltecita por aquí, ¿eh?"],
      any: ["Otra vez {app}, ¿no hay otra?", "De vuelta a {app}"],
    },
  };
  const CTX_EN = {
    night: { any: ["Still awake, {name}?", "It's getting late…"], music: ["Music this late? Something chill"], work: ["Working this late? Tomorrow's a day too"] },
    morning: { any: ["Good morning, {name}", "Here we go"], music: ["Music to start the day, nice"] },
    again: { any: ["{app} again today", "Back to {app}"] },
  };
  function fill(text, name, appName) {
    let t = text.replace(/,? ?\{name\}/, name ? ", " + name : "");
    if (!name) t = t.replace(/^\{name\},? ?/, "");
    return t.replace("{app}", appName);
  }
  /** Frase según el momento (o null si no toca): ctx = { hour, again, name } */
  function contextLine(id, app, title, es, ctx) {
    if (!ctx) return null;
    const h = ctx.hour, when = ctx.again ? "again" : h >= 23 || h < 5 ? "night" : h >= 5 && h < 10 ? "morning" : null;
    if (!when || Math.random() > (when === "again" ? 0.7 : 0.45)) return null;
    const table = (es ? CTX : CTX_EN)[when], g = groupOf(id);
    const list = table[g] || table.any;
    if (!list) return null;
    const raw = list[Math.floor(Math.random() * list.length)];
    return { text: fill(raw, ctx.name, niceName(app, title)), face: FACE[raw] };
  }

  // Cara de cada frase según su tono (expresiones de expr.js)
  const FACE = {"¡Esta hay que subirla a Instagram!": "emocionado", "¿No te habrás pasado con la edición, no?": "picaro", "¡Este es el último paso!": "emocionado", "¡Wow! ¿Esto lo has hecho tú?": "sorprendido", "Yo le subiría el contraste… a todo": "picaro", "Otra para el portfolio": "orgulloso", "Un poquito más de sombras… es broma, tú sabes más": "divertido", "Me encanta ver cómo cobra vida una foto": "enamorado", "¿Esa es de la última sesión? Qué buena": "emocionado", "Ahora toca la parte más guay… ¿no?": "emocionado", "¡Qué buen ojo!": "orgulloso", "¿Otra capa más? Valiente": "sorprendido", "¿Fotomontaje o directos a Camera Raw?": "curioso", "¿Me puedes poner más delgado?… ¡Es broma!": "divertido", "Como añadas otra capa va a parecer una cebolla…": "divertido", "¿Editando vídeo? Quiero un cameo": "emocionado", "Ese corte ha quedado de cine": "orgulloso", "Sincronizar la música con el vídeo… ¡Mi peor pesadilla!": "ansioso", "Qué bonito está quedando": "enamorado", "Un píxel más a la izquierda… perfecto": "divertido", "¿Aún utilizas Paint?": "divertido", "Paint, un clásico": "contento", "¿Qué estamos buscando?": "curioso", "¿Salgo yo en alguna?": "curioso", "¿Elegimos la más chula?": "emocionado", "¿A quién le vas a pasar esto?": "curioso", "Para la próxima poso, lo prometo": "avergonzado", "¡Sales genial!": "enamorado", "1, 2, 3… ¡Patata!": "emocionado", "«{doc}»… Tienes buen gusto": "picaro", "Esta canción me la sé… bueno, el estribillo": "divertido", "Si pones algo lento me quedo dormido, aviso": "cansado", "¡Pon algo que se pueda bailar!": "emocionado", "¡Me pido hacer los coros!": "emocionado", "Súbele un poquito, que no la oigo": "ansioso", "¡Musiquita! Me pongo a bailar en cuanto suene": "emocionado", "¿Qué tienes en la lista hoy?": "curioso", "Con música se trabaja mejor, ¿a que sí?": "contento", "Ponme algo que me guste… lo que sea, me gusta todo": "divertido", "Música y compañía, plan perfecto": "contento", "Me encanta cuando hablan de cosas que no entiendo": "confundido", "Me encanta este podcast": "enamorado", "¿Peli? Yo traigo las palomitas": "emocionado", "Me pido el sitio del medio": "contento", "Sin spoilers, que me entero de todo": "ansioso", "¿Qué tal va «{doc}»?": "curioso", "¡Vamos, que tú puedes!": "esperanzado", "Ojo con las faltas, que yo lo veo todo": "picaro", "Escribiendo cosas importantes, me pongo serio": "sereno", "Me encanta el ruidito de las teclas": "enamorado", "Esa hoja te está quedando niquelada": "orgulloso", "Excel y tú: una relación complicada": "confundido", "¿Cuadran los números?": "curioso", "Si necesitas sumar algo, cuenta conmigo… hasta diez": "divertido", "Tantas celdas… parecen casitas": "enamorado", "Te va a salir una presentación genial": "esperanzado", "Menos texto, más fotos… tú sabes": "picaro", "La bandeja de entrada… respira": "ansioso", "¿Otra reunión que podría ser un correo?": "irritado", "Me gusta cuando apuntas cosas": "contento", "Ordenando ideas, qué productivo": "orgulloso", "¿Mirando la agenda? ¿Algo importante que recordar?": "curioso", "Leyendo «{doc}»": "sereno", "PDFs… qué serio todo": "sereno", "¿Imprimiendo? Que no se atasque…": "ansioso", "¿Tendrás suficiente tinta?": "ansioso", "¿En qué idioma vamos a hablar?": "curioso", "Bonjour, hello… ¡Holi!": "divertido", "¡Yo sé hablar francés! ¡Croissant!": "emocionado", "¿Reunión? Me pongo serio": "sereno", "Me quedo quietecito para no salir en cámara": "timido", "Trabajo, trabajo…": "cansado", "Cuéntame algo, que me aburro": "molesto", "¿Toqueteando ajustes?": "curioso", "No me cambies el fondo sin avisar, eh": "picaro", "Si lo encuentras a la primera te doy una medalla": "esperanzado", "¿Algo va lento? No he sido yo": "avergonzado", "Yo apenas gasto, ¿eh?": "curioso", "No me finalices, que lloro": "dolido", "¿2 + 2? 4. De nada": "divertido", "Las mates no son lo mío": "confundido", "¿Instalando algo? ¿Un amigo para mí?": "emocionado", "¿Apuntando algo? Si es secreto, no miro": "timido", "Las mejores ideas empiezan en una nota": "sereno", "¿Comprimiendo? Yo también me hago bolita": "divertido", "¿Tienes que pasarlo por correo?": "curioso", "Tus archivos en la nube… como yo, que vivo en tu PC": "contento", "Todo a salvo, buena idea": "orgulloso", "Prometo no mirar…": "timido", "¿Has usado ya 4 caracteres especiales?": "picaro", "¿Quién es? ¿Quién es?": "curioso", "Saluda de mi parte": "feliz", "¿Algo interesante? No te pido detalles… bueno, sí": "picaro", "Mensajes nuevos, qué emoción": "emocionado", "¡Cuéntame el cotilleo!": "picaro", "¿Quién te escribe?": "curioso", "¿Charlando con la peña? ¿De qué habláis?": "curioso", "Discord… ¿hay partida?": "divertido", "¿Qué vemos hoy?": "emocionado", "¿Palomitas? ¿Chuches?": "feliz", "Me pido el sofá": "contento", "Un vídeo y volvemos, ¿vale?": "picaro", "¿Tutorial o vídeo de gatitos?": "curioso", "¿Peli o serie? Yo me apunto": "emocionado", "¡Palomitas listas!": "emocionado", "Elegir peli dura más que la peli, ya verás": "divertido", "Avísame si sale algún bicho mono": "enamorado", "Espero que no sea una de miedo…": "asustado", "¿Quién está en directo? Me quedo a mirar": "curioso", "Esa foto me la guardo": "enamorado", "Las tuyas son mejores, que conste": "enamorado", "Dale like a las buenas, que se lo merecen": "feliz", "¿Buscando inspiración?": "curioso", "Que no se te escape un like…": "picaro", "¡A inspirarse!": "emocionado", "Solo uno más… y otro… y otro": "divertido", "Aquí se puede encontrar de todo…": "curioso", "¿Algún hilo que merezca la pena?": "curioso", "¿Qué se cuece hoy?": "curioso", "Modo profesional activado": "sereno", "¿Preguntando a otra IA? Me pongo celoso…": "molesto", "Yo también sé cosas, ¿eh?": "canalla", "¡Qué productivo!": "orgulloso", "Luego me lo explicas a mí": "curioso", "¿Leyendo? Yo paso las páginas": "sereno", "¿Va bien el libro? Sin spoilers": "curioso", "¿Te está gustando?": "curioso", "A ver qué pasa hoy en el mundo": "curioso", "Noticias… mejor solo las buenas": "esperanzado", "Cosas de dinero… yo no miro": "timido", "Que cuadren las cuentas": "sereno", "¿Va bien el mes?": "curioso", "¡Anda, mira! Otra factura": "sorprendido", "¿Comprando algo? ¿Es para mí?": "emocionado", "Ese me gusta, ¡al carrito!": "canalla", "A este paso nos endeudamos…": "divertido", "Yo quiero ir también": "canalla", "¡Llévame en la maleta!": "emocionado", "¿Dónde nos vamos?": "emocionado", "¿A dónde vamos? Yo llevo los snacks": "feliz", "A ver si no nos perdemos": "ansioso", "Antes de ChatGPT la gente usaba esto…": "picaro", "¡Cuánta información!": "sorprendido", "¿Va a llover? Yo me quedo dentro": "timido", "¿Qué tiempo va a hacer hoy?": "curioso", "Si hace bueno nos vamos de paseo": "esperanzado", "¿Comida? ¡Yo quiero!": "emocionado", "Pide doble, que yo también tengo hambre": "divertido", "¿Hamburguesa? ¿Sushi? ¿Poké?": "curioso", "¿Una partidita? Te animo desde aquí": "emocionado", "Elige bien, que hay mucho donde escoger": "curioso", "Si hay juego cooperativo, me apunto": "emocionado", "¿Algo nuevo en la biblioteca?": "curioso", "Mira esas ofertas… sé fuerte": "ansioso", "¡A jugar! Te animo desde la grada": "emocionado", "Si pierdes, la culpa es del lag": "canalla", "¿Echamos una partida?": "emocionado", "A ver qué encontramos hoy por internet": "curioso", "No abras mil pestañas… bueno, vale": "divertido", "Recuerda cerrar las pestañas que no uses": "esperanzado", "¿Música a estas horas? Algo tranquilito, ¿no?": "sereno", "Música de madrugada… modo nocturno": "sereno", "¿Una más y a dormir? Eso dicen todos": "canalla", "Peli a estas horas… yo me duermo a la mitad": "cansado", "Editando de madrugada… las mejores ideas salen ahora": "orgulloso", "Artista nocturno, ¿eh?": "canalla", "¿Tienes que entregar algo?": "ansioso", "¿Trabajando a estas horas? Mañana también es día": "curioso", "Esto puede esperar a mañana… ¿o no?": "picaro", "Programar de madrugada: un clásico": "cansado", "A estas horas los bugs se esconden mejor": "canalla", "¿Quién escribe tan tarde?": "curioso", "Charlas de madrugada… las mejores": "contento", "Una partidita nocturna… solo una, ¿eh?": "canalla", "A estas horas se juega mejor, dicen": "picaro", "Scroll de madrugada… peligro": "ansioso", "Un último vistazo y a dormir": "cansado", "¿Todavía despierto, {name}?": "curioso", "Qué tarde es ya…": "cansado", "Música para arrancar el día, buena idea": "emocionado", "Las mañanas son mejores con esta playlist": "contento", "Un café y una buena canción. ¡Buenos días!": "feliz", "¿Ya vamos a ver algo?": "curioso", "¿Has desayunado antes?": "curioso", "Editar recién levantado… qué energía": "sorprendido", "Buenos días, artista": "feliz", "Empezamos el día fuerte": "emocionado", "Primero un café y luego {app}, ¿no?": "picaro", "Café y código, el desayuno de campeones": "orgulloso", "Poniéndote al día, ¿eh?": "picaro", "¿Jugando antes de desayunar? No digo nada…": "canalla", "Buenos días, {name}": "feliz", "Arrancamos el día": "esperanzado", "¡Volvemos a darle caña!": "emocionado", "No se puede vivir sin música": "enamorado", "Espero que no vuelvas a escuchar la misma canción…": "picaro", "¿Otra vez? Esto engancha": "divertido", "Segunda sesión del día": "contento", "De vuelta al estudio": "contento", "Otra ronda de edición": "emocionado", "Volvemos a la carga": "orgulloso", "Otra vez por aquí… esto no se acaba nunca": "cansado", "Otro asalto al código": "emocionado", "Volvemos con el bug, ¿no?": "canalla", "¿Más mensajes? Hoy estás solicitado": "emocionado", "Vuelta a la charla": "contento", "¿Revancha?": "canalla", "Otra partida… venga, la última": "picaro", "Otra vueltecita por aquí, ¿eh?": "picaro", "Otra vez {app}, ¿no hay otra?": "confundido", "De vuelta a {app}": "contento", "¿Musiquita? Me pongo a mover los pies": "feliz", "Si suena algo, avísame que bailo": "emocionado", "¿Algo para ver? Me pido el sofá": "contento", "Peli o serie, yo me apunto": "emocionado", "¿A jugar? Te animo desde aquí": "emocionado", "Que gane el mejor… o sea, tú": "picaro", "Huele a creatividad por aquí": "curioso", "¿Creando algo bonito? Quiero verlo": "curioso", "¿Hablando con alguien? Saluda de mi parte": "feliz", "Mensajes, mensajes…": "divertido", "A leer o escribir… yo me quedo tranquilo a tu lado": "sereno", "Concentración máxima, no hago ruido": "sereno", "Ordenando archivos… qué responsable": "orgulloso", "Todo bien guardadito": "contento", "¿Instalando algo nuevo? ¿Es un amigo para mí?": "curioso", "Algo nuevo en el PC… qué intriga": "curioso", "Modo técnico activado… yo no toco nada": "confundido", "Muchas letras raras veo yo aquí": "confundido", "Seguridad ante todo, me gusta": "orgulloso", "Cosas privadas… me tapo los ojos": "timido"};
  const OLD = { spark: "orgulloso", nod: "contento", think: "curioso", wave: "feliz", surprise: "sorprendido", shrug: "confundido", wink: "picaro", heart: "enamorado", note: "feliz" };
  const faceOf = (raw, g) => FACE[raw] || OLD[g] || g;
  const cooldown = {};
  const COOLDOWN = 45 * 60000;     // la misma regla, como mucho cada 45 min
  let lastAny = 0;
  let GAP = 3 * 60000;              // entre comentarios espontáneos (se ajusta con "Cuánto comenta")

  function docName(title) {
    let t = (title || "").replace(/\s*[-–—|]\s*(Word|Excel|PowerPoint|Adobe Acrobat.*|Microsoft.*|Google.*|Sumatra.*)$/i, "").trim();
    t = t.replace(/\.(docx?|xlsx?|pptx?|pdf)$/i, "");
    return t.length > 28 ? t.slice(0, 27) + "…" : t;
  }

  /** Devuelve {text, gesture} si toca comentar algo, o null. */
  function find(app, title, isBrowser, es, force = false, ctx = null) {
    const now = Date.now();
    if (!force && now - lastAny < GAP) return null;
    const t = (title || "").toLowerCase();
    for (const [id, apps, words, esL, enL, gesture] of R) {
      const appHit = apps.some((a) => app === a || app.startsWith(a));
      const titleHit = words.length && words.some((w) => t.includes(w));
      // reglas con apps y palabras (p. ej. exportar en Lightroom) necesitan ambas
      const hit = id === "export" ? appHit && titleHit : appHit || (titleHit && (isBrowser || !apps.length));
      if (!hit || !(es ? esL : enL).length) continue;
      if (!force && cooldown[id] && now - cooldown[id] < COOLDOWN) return null;
      cooldown[id] = now;
      lastAny = now;
      const list = es ? esL : enL;
      const cl = contextLine(id, app, title, es, ctx);
      if (cl) return { text: cl.text, gesture: cl.face || faceOf("", gesture), id };
      let text = list[Math.floor(Math.random() * list.length)];
      const raw = text;
      if (text.includes("{doc}")) {
        let d = docName(title);
        if (d && (d.toLowerCase().includes(id) || apps.some((a) => d.toLowerCase().includes(a)))) d = "";
        if (!d) text = list.find((x) => !x.includes("{doc}")) || text.replace("«{doc}»", "");
        else text = text.replace("{doc}", d);
      }
      return { text, gesture: faceOf(raw, gesture), id };
    }
    return null;
  }

  /** ¿Qué regla corresponde a esta app/web? (sin consumir nada) */
  function ruleId(app, title, isBrowser) {
    const t = (title || "").toLowerCase();
    for (const [id, apps, words] of R) {
      const appHit = apps.some((a) => app === a || app.startsWith(a));
      const titleHit = words.length && words.some((w) => t.includes(w));
      const hit = id === "export" ? appHit && titleHit : appHit || (titleHit && (isBrowser || !apps.length));
      if (hit) return id;
    }
    return null;
  }

  // Nombres bonitos para apps sin comentario propio
  const NICE = { notepad: "el Bloc de notas", explorer: "el Explorador", msedge: "Edge", chrome: "Chrome", firefox: "Firefox", vlc: "VLC", spotify: "Spotify", winrar: "WinRAR", "7zfm": "7-Zip", acrobat: "Acrobat", zoom: "Zoom" };
  function niceName(app, title) {
    if (NICE[app]) return NICE[app];
    const parts = (title || "").split(/\s[-–—|]\s/);
    const last = parts[parts.length - 1].trim();
    if (last && last.length <= 24) return last;
    return app.charAt(0).toUpperCase() + app.slice(1);
  }
  /** Al abrir algo sin frase propia: adivina para qué sirve por su nombre y comenta sobre eso */
  const GUESS = [
    [/music|radio|fm|audio|sound|song|player|ableton|fl64|reaper|cubase|audacity|audition|studioone/, ["¿Musiquita? Me pongo a mover los pies", "Si suena algo, avísame que bailo"], ["Music? My feet are already moving"], "feliz"],
    [/video|movie|film|tv|stream|player/, ["¿Algo para ver? Me pido el sofá", "Peli o serie, yo me apunto"], ["Something to watch? Dibs on the sofa"], "contento"],
    [/game|launcher|play|steam/, ["¿A jugar? Te animo desde aquí", "Que gane el mejor… o sea, tú"], ["Game time? Cheering from here"], "emocionado"],
    [/photo|pic|image|img|raw|paint|draw|edit|studio|design/, ["Huele a creatividad por aquí", "¿Creando algo bonito? Quiero verlo"], ["Smells like creativity in here", "Making something pretty?"], "curioso"],
    [/mail|chat|messenger|message|talk|call|meet/, ["¿Hablando con alguien? Saluda de mi parte", "Mensajes, mensajes…"], ["Talking to someone? Say hi from me"], "feliz"],
    [/pdf|read|book|reader|doc|office|write|note/, ["A leer o escribir… yo me quedo tranquilo a tu lado", "Concentración máxima, no hago ruido"], ["Reading or writing… I'll stay quiet"], "sereno"],
    [/zip|rar|compress|archive|backup|sync|drive|cloud/, ["Ordenando archivos… qué responsable", "Todo bien guardadito"], ["Sorting files… so responsible"], "orgulloso"],
    [/setup|install|update|updater/, ["¿Instalando algo nuevo? ¿Es un amigo para mí?", "Algo nuevo en el PC… qué intriga"], ["Installing something? A friend for me?"], "curioso"],
    [/code|dev|git|term|shell|console|sql|server/, ["Modo técnico activado… yo no toco nada", "Muchas letras raras veo yo aquí"], ["Tech mode on… I won't touch anything"], "confundido"],
    [/vpn|secure|guard|antivirus|defender|pass|vault/, ["Seguridad ante todo, me gusta", "Cosas privadas… me tapo los ojos"], ["Safety first, I like it"], "timido"],
  ];
  function generic(app, title, es, ctx = null) {
    const n = niceName(app, title);
    const cl = contextLine("app:" + app, app, title, es, ctx);
    if (cl) { lastAny = Date.now(); return { text: cl.text, gesture: cl.face || "curioso", id: "app:" + app }; }
    const key = (app + " " + (title || "")).toLowerCase();
    lastAny = Date.now();
    for (const [re, esL, enL, g] of GUESS) {
      if (re.test(key)) { const l = es ? esL : enL, t = l[Math.floor(Math.random() * l.length)]; return { text: t, gesture: FACE[t] || g, id: "app:" + app }; }
    }
    // Sin pistas: curiosidad por saber qué es, sin el «Hola, X»
    const list = es ? [`¿${n}? No lo conozco… ¿para qué sirve?`, `Algo nuevo por aquí… ¿qué hace ${n}?`, `${n}… suena interesante, cuéntame`] : [`${n}? Don't know that one… what's it for?`, `Something new… what does ${n} do?`];
    return { text: list[Math.floor(Math.random() * list.length)], gesture: "curioso", id: "app:" + app };
  }

  return { find, ruleId, generic, setGap(min) { GAP = min * 60000; } };
})();
