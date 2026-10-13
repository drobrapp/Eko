// Eko · comentarios según lo que haces en el PC.
// Cada regla: [id, apps (inicio del nombre del .exe), palabras del título (en navegadores o cualquier app), frases ES, frases EN, gesto]
// Las frases pueden usar {doc} = nombre del documento/archivo que aparece en el título.
window.EkoComments = (() => {
  "use strict";
  const R = [
    ["export", ["lightroom", "photoshop", "captureone", "ansel", "darktable"], ["export"], ["¿Exportando? Mi parte favorita", "Que salgan bonitas… bueno, ya lo son"], ["Exporting? My favourite part", "Make them pretty"], "nod"],
    // ---- Fotografía y diseño
    ["lightroom", ["lightroom"], [], ["Esa luz es de premio", "Yo le subiría el contraste… a todo", "Otra para el portfolio", "Un poquito más de sombras… es broma, tú sabes más"], ["Developing? That photo looks good", "A bit more shadows… kidding, you know best", "I love watching you edit"], "spark"],
    ["photoshop", ["photoshop"], [], ["Qué ojo tienes", "¿Otra capa más? Valiente", "Si me retocas a mí, que sea con cariño"], ["Removing something?", "Layers, layers, layers", "If you retouch me, be gentle"], "spark"],
    ["captureone", ["captureone", "capture one"], [], ["Capture One… modo profesional", "¿Sesión nueva? Qué ganas de verla"], ["Capture One… pro mode", "New session?"], "spark"],
    ["raw", ["ansel", "darktable", "rawtherapee"], [], ["Esos RAW tienen pinta de portada", "¿Otro preset vintage? Vale, vale"], ["Open-source developing? Fancy", "Those RAWs look nice"], "spark"],
    ["video", ["premiere", "resolve", "afterfx", "clipchamp", "capcut"], [], ["¿Editando vídeo? Quiero un cameo", "Ese corte ha quedado de cine"], ["Video editing? I want a cameo", "Cut… action!"], "note"],
    ["design", ["figma", "illustrator", "indesign", "affinity", "canva"], ["canva", "figma"], ["Qué bonito está quedando", "Un píxel más a la izquierda… perfecto"], ["That's looking lovely", "A bit to the left? Perfect"], "spark"],
    ["blender", ["blender"], [], ["¿Me vas a hacer en 3D?", "Muchos polígonos por aquí"], ["Making me in 3D?", "So many polygons"], "surprise"],
    ["obs", ["obs64", "obs"], [], ["¿Vas a grabar? ¡Quiero salir!", "Me peino un momento"], ["Recording? I want to be in it!", "Let me fix my hair"], "wave"],
    ["paint", ["mspaint", "paint"], [], ["¡Píntame a mí!", "Paint, un clásico"], ["Paint me!", "Paint, a classic"], "wink"],
    ["photos", ["photos", "microsoft.photos"], [], ["Qué recuerdos", "¿Salgo yo en alguna?"], ["Photos… am I in any?", "Memories"], "heart"],

    // ---- Oficina y escritura
    ["word", ["winword"], [], ["¿Qué tal va «{doc}»?", "¡Vamos, que tú puedes!", "Ojo con las faltas, que yo lo veo todo"], ["How's «{doc}» going?", "Writing something nice?", "Watch the typos"], "nod"],
    ["excel", ["excel"], [], ["Esa hoja te está quedando niquelada", "Excel y tú: una relación complicada", "¿Cuadran los números?"], ["Formulas… you got this", "Do the numbers add up?", "Cells everywhere"], "think"],
    ["powerpoint", ["powerpnt"], [], ["Te va a salir una presentación genial", "Menos texto, más fotos… tú sabes"], ["A presentation? It'll be great", "Less text, more pictures"], "nod"],
    ["mail", ["outlook", "olk", "thunderbird", "hxoutlook"], ["gmail", "outlook", "correo", "inbox"], ["La bandeja de entrada… respira", "¿Otra reunión que podría ser un correo?"], ["The inbox… breathe", "Anything good in the mail?"], "shrug"],
    ["notes", ["notion", "obsidian", "onenote"], ["notion", "google docs", "documentos de google"], ["Me gusta cuando apuntas cosas", "Ordenando ideas, qué productivo"], ["Organising ideas", "I like it when you take notes"], "think"],
    ["calendar", [], ["calendar", "calendario"], ["¿Mirando la agenda? ¿Hay hueco para mí?"], ["Checking the calendar? Room for me?"], "think"],
    ["pdf", ["acrobat", "acrord32", "sumatra"], [".pdf"], ["Leyendo «{doc}»", "PDFs… qué serio todo"], ["Reading «{doc}»", "PDFs… so serious"], "nod"],

    // ---- Programación y sistema
    ["code", ["code", "cursor", "devenv", "idea64", "pycharm64", "webstorm64", "sublime_text"], [], ["Modo programador", "Ese bug no se arregla mirándolo", "Que compile a la primera"], ["Coder mode", "So much colourful weird text", "May it compile first time"], "think"],
    ["terminal", ["windowsterminal", "powershell", "cmd", "wt"], [], ["Teclas mágicas", "rm -rf… ¡es broma!"], ["Magic keys", "Careful what you delete"], "surprise"],
    ["githubdesktop", ["githubdesktop"], [], ["¿Estás subiendo una versión mía?", "Que no se rompa nada…", "¡Me voy a actualizar!"], ["Shipping a new version of me?", "Don't break anything…", "I'm getting an update!"], "surprise"],
    ["githubweb", [], ["github"], ["¿Mirando mi código?", "Ahí vivo yo"], ["Looking at my code?", "That's where I live"], "wink"],
    ["claude", ["claude"], ["claude"], ["¿Hablando con Claude? Dale recuerdos", "Ese me hizo a mí"], ["Talking to Claude? Say hi from me", "That one made me"], "heart"],
    ["taskmgr", ["taskmgr"], [], ["¿Algo va lento? No he sido yo", "Yo apenas gasto, ¿eh?"], ["Something slow? Wasn't me", "I barely use anything, right?"], "shrug"],
    ["settings", ["systemsettings"], [], ["¿Toqueteando ajustes?", "No me cambies el fondo sin avisar"], ["Tweaking settings?", "Don't change the wallpaper without telling me"], "think"],
    ["calc", ["calculatorapp", "calc"], [], ["¿Cuentas? 2 + 2 = 4, de nada", "Las mates no son lo mío"], ["Maths? 2 + 2 = 4, you're welcome", "Maths isn't my thing"], "think"],
    ["store", ["winstore.app"], [], ["¿Instalando algo? ¿Un amigo para mí?"], ["Installing something? A friend for me?"], "surprise"],

    // ---- Comunicación
    ["whatsapp", ["whatsapp"], ["whatsapp"], ["¿Quién es? ¿Quién es?", "Saluda de mi parte"], ["Who's texting you?", "Say hi from me"], "wave"],
    ["telegram", ["telegram"], [], ["¿Quién te escribe? Cuéntame algo"], ["Who's texting?", "Messages back and forth"], "wave"],
    ["discord", ["discord"], [], ["¿Charlando con la peña? ¿De qué habláis?", "Discord… ¿hay partida?"], ["Chatting with the crew?", "Discord… game night?"], "wave"],
    ["slack", ["slack", "ms-teams", "teams"], [], ["Trabajo, trabajo…", "Cuéntame algo, que me aburro"], ["Work, work…", "Lots of messages here"], "nod"],

    // ---- Ocio en el navegador
    ["youtube", [], ["youtube"], ["¿Qué vemos?", "¿Palomitas?", "Me pido el sofá"], ["What are we watching?", "Dibs on the sofa", "One more and back to work, right?"], "note"],
    ["netflix", [], ["netflix", "prime video", "disney+", "filmin", "hbo", "max |"], ["¿Peli o serie? Yo me apunto", "¡Palomitas listas!"], ["Movie or series?", "No spoilers!"], "note"],
    ["twitch", [], ["twitch"], ["¿Quién está en directo? Me quedo a mirar"], ["Who's live?"], "note"],
    ["instagram", [], ["instagram"], ["Esa foto me la guardo", "Las tuyas son mejores, que conste"], ["Checking other photographers?", "Yours are better"], "wink"],
    ["pinterest", [], ["pinterest"], ["Buscando inspiración… esa me la apunto"], ["Looking for inspiration", "Pretty board"], "spark"],
    ["tiktok", [], ["tiktok"], ["Solo uno más… y otro… y otro"], ["Just one more, right?"], "wink"],
    ["reddit", [], ["reddit"], ["¿Algún hilo bueno? Cuéntame"], ["Reading endless threads?"], "think"],
    ["twitter", [], ["/ x", "twitter"], ["¿Qué se cuece hoy?"], ["What's happening today?"], "think"],
    ["linkedin", [], ["linkedin"], ["Modo profesional activado"], ["Professional mode on"], "nod"],
    ["shopping", [], ["amazon", "aliexpress", "zalando", "carrito", "cart"], ["¿Comprando algo? ¿Es para mí?", "Ese me gusta, ¡al carrito!"], ["Shopping? Is it for me?", "Check the reviews"], "surprise"],
    ["travel", [], ["booking", "airbnb", "skyscanner", "vuelos", "flights"], ["¡Ese viaje me lo pido!", "¡Llévame en la maleta!"], ["Are we travelling?", "Take me in your suitcase!"], "surprise"],
    ["maps", [], ["google maps", "maps"], ["¿A dónde vamos? Yo llevo los snacks"], ["Where are we going?"], "think"],
    ["wiki", [], ["wikipedia"], ["Aprendiendo cosas juntos"], ["Learning stuff", "I know things too, you know"], "think"],
    ["weather", [], ["el tiempo", "aemet", "weather", "tiempo en"], ["¿Va a llover? Yo me quedo dentro"], ["Rain? I'm staying in"], "think"],
    ["food", [], ["glovo", "just eat", "uber eats", "receta", "recipe"], ["¿Comida? ¡Yo quiero!", "Pide doble, que yo también como"], ["Food? I want some!", "Smells good from here"], "heart"],
    ["steam", ["steam", "epicgameslauncher", "battle.net"], [], ["¿Una partidita? Te animo desde aquí"], ["Quick game?", "Can I watch?"], "surprise"],
  ];

  const cooldown = {};
  const COOLDOWN = 45 * 60000;     // la misma regla, como mucho cada 45 min
  let lastAny = 0;
  const GAP = 3 * 60000;            // entre comentarios espontáneos, mínimo 3 min

  function docName(title) {
    let t = (title || "").replace(/\s*[-–—|]\s*(Word|Excel|PowerPoint|Adobe Acrobat.*|Microsoft.*|Google.*|Sumatra.*)$/i, "").trim();
    t = t.replace(/\.(docx?|xlsx?|pptx?|pdf)$/i, "");
    return t.length > 28 ? t.slice(0, 27) + "…" : t;
  }

  /** Devuelve {text, gesture} si toca comentar algo, o null. */
  function find(app, title, isBrowser, es) {
    const now = Date.now();
    if (now - lastAny < GAP) return null;
    const t = (title || "").toLowerCase();
    for (const [id, apps, words, esL, enL, gesture] of R) {
      const appHit = apps.some((a) => app === a || app.startsWith(a));
      const titleHit = words.length && words.some((w) => t.includes(w));
      // reglas con apps y palabras (p. ej. exportar en Lightroom) necesitan ambas
      const hit = apps.length && words.length ? appHit && titleHit : appHit || (titleHit && (isBrowser || !apps.length));
      if (!hit) continue;
      if (cooldown[id] && now - cooldown[id] < COOLDOWN) return null;
      cooldown[id] = now;
      lastAny = now;
      const list = es ? esL : enL;
      let text = list[Math.floor(Math.random() * list.length)];
      if (text.includes("{doc}")) {
        const d = docName(title);
        if (!d) text = list.find((x) => !x.includes("{doc}")) || text.replace("«{doc}»", "");
        else text = text.replace("{doc}", d);
      }
      return { text, gesture };
    }
    return null;
  }

  return { find };
})();
