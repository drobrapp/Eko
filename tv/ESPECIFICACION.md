# Eko TV · especificación (borrador v0.1)

Versión de Eko para Google TV (probada en TCL 65C6K, Android 14 / API 34) que funciona como **salvapantallas** del sistema.
Es un **Eko simplificado**: conserva su cuerpo, su personalidad y su forma de hablar, pero los gestos, la escena y las
interacciones están pensados para una tele vista desde el sofá.

Estado: borrador para revisar. Nada de esto está programado todavía.

---

## 1. Principios

1. **Es Eko, no un clon.** Mismo cuerpo de plastilina, mismas caras, mismo tono. Si alguien que conoce al Eko del PC
   lo ve en la tele, tiene que reconocerlo al instante.
2. **Se mira, no se usa.** Es un salvapantallas: nada pide atención ni respuesta. Eko vive a su aire y comenta de vez en cuando.
3. **Legible a 3 metros.** Movimientos amplios y lentos, bocadillos grandes que duran lo suficiente para leerlos.
4. **No molesta.** Sin sonido, brillo moderado de noche, nada fijo en pantalla durante horas.
5. **Código propio.** Vive en `tv/`, aparte de `src/` (PC) y `android/` (móvil). Comparte arte y motor copiándolos al
   compilar, igual que ya hace Android (`android/app/build.gradle.kts`, tareas `pcAssets`/`pcRes`). No se toca el
   código del PC ni del móvil, salvo lo imprescindible para la conexión (ver §8).

---

## 2. Escena

- **El Valle a pantalla completa, en 16:9.** El Valle ya está pensado en «unidades de 1080p» (`src/world.js:15-24`), con
  cielo según la hora real (`world.js:27-52`): amanecer, día, atardecer y noche, sol y luna moviéndose, estrellas, nubes,
  nieve en invierno y hojas en otoño.
- **Solo la zona principal y el huerto** (decidido el 31-10-2026). El estanque no está acabado y no se enseña.
  - **Recorrido** (unidades de 1080p, `world.js:88-153`):
    - Zona principal: árbol pequeño (280), farolillo (420), arbusto (560), casa (900), cartel (1180), valla (1300),
      farolillo (1460), arbusto (1560), árbol grande (1820).
    - Huerto: arco del huerto (2260), cobertizo (2520), bancales (2860 y 3290), Don Paja (3075), pozo (3560).
  - **Límite derecho:** el pozo. A partir de ahí la niebla tapa el arroyo y el estanque.
- Se usa **solo el decorado**. Las mecánicas del Valle (regar, plantar, encargos de Don Paja) **no** entran.
- **Paseo con intención:**
  1. Eko elige un sitio del recorrido y va andando despacio.
  2. Al llegar hace un gesto acorde: huele las flores, mira hacia arriba en el árbol grande, saluda a Don Paja, se agacha
     en los bancales…
  3. Más o menos en una de cada dos paradas dice una frase de ese sitio (§5.1).
- **La cámara se mueve muy despacio** siguiendo a Eko. Así el fondo nunca está quieto horas en el mismo sitio.
- **Tamaño de Eko:** unas 4 veces el del escritorio. Orientativo: el cuerpo ocupa alrededor del 20–25 % del alto de la
  pantalla.
- **Margen de seguridad:** nada importante a menos del 5 % del borde. Algunas teles recortan los bordes (overscan).
- **De noche** (`phase() === "night"`), farolillos y luciérnagas como en el Valle, y el brillo general baja.

---

## 3. Un día de Eko en la tele

El horario sigue las fases del Valle (`world.js:28`) y la hora de dormir del PC (`src/life.js:102-108`).

| Franja | Qué hace |
|---|---|
| Amanecer (6:30–8:00) | Se despereza (`stretch`, `yawn`), poco movimiento, saludo de buenos días. |
| Día (8:00–19:30) | Pasea por el Valle, se para a mirar cosas (`lookAround`, `curious`), gestos sueltos, algún baile si está contento. |
| Atardecer (19:30–21:30) | Más tranquilo: se sienta o se queda quieto mirando el cielo, menos paseos. |
| Noche (21:30–23:30) | Gorro de dormir, bostezos, cabezadas (`nodOff`). Comentarios de «qué tarde es ya». |
| Dormir (23:30–6:30) | Duerme en el camino, junto a la casa. Respiración lenta y alguna «z». Sin bocadillos. Brillo mínimo. |

En las fechas especiales se pone el disfraz de temporada, que rota cada 2 horas. Las temporadas son Halloween, Navidad y
Nochevieja, más el cumpleaños del usuario y el aniversario de Eko (`src/main.js:547-606`). Hoy, 31-10, le toca Halloween.

---

## 4. Gestos

Se reutiliza el motor de Android (`android/app/src/main/assets/eko/anim.js`), que ya es una «copia adaptada» del PC y
solo dibuja; el movimiento lo decide quien lo aloja.

**Entran (tranquilos y legibles):** andar, quieto con parpadeo y respiración, `wave`, `nod`, `stretch`, `yawn`,
`scratch`, `think`, `lookAround`, `curious`, `wink`, `shrug`, `surprise`, dormir,
`sigh`, `rubBelly` y `nodOff` (estos tres no están en `anim.js`; se traen de `src/needs.js:137-161`),
baile (`dancePose`), expresiones de `src/expr.js`, efectos que salen de la cabeza (corazones, chispas, notas), objetos
de un rato (taza, libro, gorro de dormir, palomitas, cámara), «toc, toc» a la pantalla (`anim.js:377`), dibujar un
corazón en el aire (`anim.js:386`), hablar solo y reírse (`anim.js:394`), aburrirse apoyado (`anim.js:401`).

**Se adaptan:**
- Todo más lento, en torno a ×1,3 de duración, con pausas más largas entre gestos.
- Volteretas y piruetas (`anim.js:452`, `:484`): como mucho una cada pocas horas, de premio, porque a pantalla grande marean.

**No entran:** ser cogido o arrastrado, lanzarlo, volar con capa, subirse a ventanas, la magia de la mudanza
(salvo para la llegada/partida descrita en §9), minijuegos, `angry`, `dizzy`.

**Ritmo:** un gesto «con intención» cada 30–90 s; entre medias, vida en reposo (`idleLife`, `anim.js:787`).

---

## 5. Comentarios

### 5.1 Qué dice
Reutiliza **frases existentes** siempre que tengan sentido sin PC:

- **Necesidades:** `src/needs.js:95-117` (`hunger`, `energy`, `fun`, `love`, `happy`, `nap`).
- **Momento del día:** `src/comments.js:93-103`, grupo `any` de `night` y `morning`, como «¿Todavía despierto, {name}?»,
  «Buenos días, {name}» o «Arrancamos el día».
- **Hora de dormir:** `src/life.js:106`.
- **Fechas especiales y disfraces:** `TXT.birthday`, `TXT.anniversary`, `TXT.xmas`, `TXT.newyear`, `TXT.halloween` y
  `TXT.costume` de `src/main.js`.
- **Cartas** (`life.js:54-65`): en la tele no hay tarjeta para leerla. Se queda en el bocadillo «¡Me ha llegado una carta
  de la abuela Mochi!», con una frase resumida.

**No entran:** los comentarios sobre apps, webs y documentos (`comments.js:6-70`, `GUESS`), porque la tele no sabe qué haces.

**Frases de sitio** (aprobadas el 31-10-2026, las 47 propuestas):
- Cada sitio del recorrido tiene sus frases, que Eko dice al llegar allí.
- La mayoría ya las dice en el Valle del PC (`world.js:112-153`, `GL.paja`, `GL.hello`, `HINT` y las de cielo de
  `world.js:1162`).
- Hay unas pocas nuevas. Lista completa en `tv/app/assets/eko-tv/lines.js`.
- Algunas dependen de la hora o la estación: farolillos de día o de noche, flores que no huelen a primavera en invierno.
- La del columpio solo sale si el columpio está ganado (fase 0.2).

**No entran:**
- Las frases que dan instrucciones («arrastra el saquito», «coge la regadera»).
- Las que dependen de las plantas reales del huerto; esas llegan en la fase 0.2, con la conexión.

### 5.2 Cómo lo dice
- **Ritmo:** un bocadillo cada 4–8 minutos como mucho. Ninguna frase se repite en el mismo día. De 23:30 a 6:30, nada.
- **Tamaño:** 40 px de alto de letra a 1080p como mínimo, con un máximo de unos 45 caracteres por línea y dos líneas.
- **Duración en pantalla:** 2,5 s + 70 ms por carácter, entre 4 y 9 s.
- **Cara:** cada frase sale con su expresión (`FACE` de `comments.js:140`), igual que en el PC.
- **Idioma:** el del Eko del PC (`Eko.LANG`). Si no hay conexión, español.

---

## 6. Necesidades

La tele es un **espejo**: muestra cómo está Eko, pero **no puede cubrir necesidades**, porque no hay forma de darle de comer
desde el sofá.

- **Punto de partida:** los valores de `eko-needs` que llegan del PC (§8).
- **Mientras no llega nada nuevo:** la tele estima la caída con las mismas reglas que el PC (`needs.js:20` y el cálculo
  «fuera» de `needs.js:31-40`). Solo lo muestra; no lo guarda ni lo devuelve.
- **Se le nota** igual que en el PC (`needs.js:163-176`): ojos a media asta con poca energía, más lento si tiene hambre.
- **Avisos más suaves:** como mucho uno cada 30 min, sin el dibujo del deseo insistente. Frase sugerida: «Cuando vuelvas al
  PC, ¿me das una galletita?». El gesto es el mismo (`rubBelly`, `yawn`, `sigh`).
- **Si todo está por encima de 75:** baile o corazón, como en el PC (`needs.js:186-193`).

---

## 7. Mando

- **Cualquier botón despierta la tele y cierra el salvapantallas.** Es lo normal en Android
  (`setInteractive(false)`) y lo que espera cualquiera.
- No hay más interacción en esta versión.
- **Para el futuro (no en v1):** que OK lo salude antes de cerrar, con la tecla Atrás para salir. Se decidirá después de
  probar la v1.

---

## 8. Conexión con el Eko del PC

### 8.1 Lo que hay hoy
Las piezas implicadas son estas:
- **Servidor:** el PC levanta un servidor HTTP en la red de casa (`src-tauri/src/sync.rs`, puerto 47913).
- **Estado:** el PC prepara cada 20 s un volcado del estado de Eko, el mismo que la copia de seguridad, cifrado con
  AES-GCM y la clave del QR del móvil (`src/sync.js:27-49`).
- **Identificación:** el servidor solo admite **un** dispositivo (`St.token`). Cada vez que ese dispositivo pregunta,
  el servidor apunta que «el móvil está vivo» (`St.seen`, `sync.rs:116`).
- **Uso de esa señal:** el PC decide si Eko vuelve del móvil según `seen` (`sync.js:177-219`).

### 8.2 Por qué la tele no puede usar la llave del móvil
Si la tele reutilizara la clave y el token del móvil, cada consulta de la tele contaría como «el móvil está vivo».
Eko podría quedarse «atrapado» en el móvil aunque el móvil estuviera apagado, porque la vuelta automática al PC depende
de esa señal. Por eso **la tele necesita su propia llave**.

### 8.3 Propuesta: la tele como «visita de solo lectura»
Hace falta un cambio pequeño en el PC (`src-tauri/src/sync.rs` y `src/sync.js`), que se haría en una rama aparte:

1. **Segundo emparejamiento**, independiente del móvil, con su propia clave y su propio token (`tv_token`).
2. **Instantánea aparte:** el PC cifra con la clave de la tele una segunda instantánea solo con lo que la tele necesita:
   - `eko-settings`: nombre, idioma y cumpleaños
   - `eko-born`
   - `eko-needs`
   - `eko-wear` y los complementos
   - `eko-progress`: nivel y evolución
   - `eko-where`

   **No incluye** recordatorios, estadísticas, álbum ni nada privado.
3. **Ruta nueva `GET /tv/state`:**
   - solo acepta el token de la tele;
   - no toca `seen` ni `where`;
   - no puede llevarse a Eko ni devolverlo.
4. **En la tele:** al empezar el salvapantallas pide `/tv/state`. Si el PC no responde en 3 s, usa la última copia
   guardada en la tele. Mientras el salvapantallas sigue, repite cada 5 min.

**Emparejamiento.** La tele no tiene cámara, así que no hay QR. Se proponen dos fases:

- **v1 (rápida):** se hace por ADB al instalar. El PC enseña los datos en *Ajustes → Conectar con la tele*, y un script
  `tv/tools/emparejar.ps1` los pasa a la app de la tele.
- **v2 (cómoda):** en la app de configuración de la tele (§11), «Conectar con el PC» enseña un código de 6 cifras.
  Tú lo escribes en *Ajustes → Conectar con la tele* del PC, y la tele encuentra el PC buscando `/hello` en la red de casa.

**Sin PC.** Si nunca se ha emparejado, aparece un Eko «genérico»:
- nombre «Eko», necesidades a 75 y sin evolución;
- con todo lo demás: Valle, horario y disfraces de temporada.

---

## 9. ¿Dónde está Eko?

El principio de «Eko está en un solo sitio a la vez» se respeta así:

- **Si Eko está en el PC:** la tele es una **ventana a su Valle** y Eko aparece paseando. No se considera estar «en dos
  sitios», porque la tele no puede cambiar nada de él.
- **Si Eko está en el móvil** (`where === "phone"`): el Valle aparece vacío. De vez en cuando sale un letrero de madera:
  «Eko ha salido de paseo contigo».
- **Si cambia mientras el salvapantallas está puesto** (aviso en la siguiente consulta): Eko llega o se va con la nube de
  la magia de mudanza (`anim.js:373-375`).

Hay que confirmarlo (decisión abierta 2).

---

## 10. Cuidar la pantalla y la tele

- **Nada fijo:** la cámara siempre deriva despacio y el letrero de §9 cambia de sitio cada vez.
- **Brillo:** de noche y durmiendo, la escena baja a un 40 % de brillo con un velo oscuro.
- **Rendimiento:**
  - La tele ya va bastante cargada; vimos una carga media de 16 recién encendida.
  - Animación limitada a 30 fotogramas por segundo.
  - Arte reescalado a 1080p como máximo; el panel es 4K, pero el sistema dibuja a 1080p.
  - Nada se ejecuta fuera del salvapantallas.
- **Red:** solo la Wi-Fi de casa, como el resto de Eko. Sin internet ni cuentas.

---

## 11. Arquitectura técnica

```
tv/
  ESPECIFICACION.md        este documento
  settings.gradle.kts      proyecto Gradle propio (no depende de android/)
  app/
    build.gradle.kts       app.drobr.eko.tv · minSdk 26 · targetSdk 34 · copia arte y motor al compilar
    src/main/
      AndroidManifest.xml  DreamService + actividad de configuración (Leanback)
      java/app/drobr/eko/tv/
        EkoDream.kt        DreamService: aloja la WebView a pantalla completa, sin interacción
        TvLink.kt          consulta /tv/state, descifra y guarda la última copia
        SetupActivity.kt   pantalla de configuración (estado de conexión, emparejar, vista previa)
      assets/eko-tv/
        tv.html            escena: Valle + Eko
        tv.js              «cerebro» de la tele: horario, paseos, gestos, comentarios, necesidades (espejo)
        lines.js           frases de tele (§5.1)
  tools/
    instalar.ps1           instalar el APK y configurar la tele (§12)
    restaurar.ps1          dejar la tele como estaba
```

- **Por qué una WebView con el cerebro en JavaScript.** El cuerpo de Eko es un SVG animado con JS, y sus frases y reglas
  (necesidades, comentarios, temporadas) también son JS en el PC. Si el cerebro de la tele es JS, se pueden copiar o
  importar esas piezas en vez de reescribirlas en Kotlin, como pasó en Android. Kotlin solo aloja la WebView y hace la red.
- **Lo que se copia al compilar:**
  - de `src/`: `expr.js`, `evo-art.js`, gorros y disfraces de temporada, `src/art/valley/*` (solo el decorado);
  - de `android/app/src/main/assets/eko/`: `anim.js` y la parte del SVG de `overlay.html`.

  El puente `AND` de `anim.js` (`say`, `hop`, `hold`) lo implementa `tv.js`.
- **La app de configuración** aparece en la fila de apps de Google TV con un banner. Permite:
  - ver si está conectada al PC y desde cuándo;
  - emparejar (v2);
  - ver una vista previa del salvapantallas;
  - abrir el ajuste del salvapantallas.
- **Firma:** keystore propio en `tv/`, para poder actualizar sin desinstalar, como hace Android.
- **Compilación:** Gradle con el JDK 17 ya instalado (`C:\Users\Aitor\Desktop\EkoTV\tools\jdk17`) o con CI en GitHub
  Actions, en un `tv.yml` aparte.

---

## 12. Instalación en la tele (comprobado el 31-10-2026)

1. **Instalar el APK:**
   `adb install eko-tv.apk`
2. **Dar permiso de arranque.** El gestor de arranque de TCL (`TclAppBoot`) bloquea los salvapantallas de terceros que
   no lo tienen:
   `adb shell appops set app.drobr.eko.tv AUTO_START allow`
3. **Fijarlo como salvapantallas.** El menú de Google TV no lo ofrece, así que se fija por ADB:
   `adb shell settings put secure screensaver_components app.drobr.eko.tv/.EkoDream`

**Qué aguanta y qué no:**
- Los ajustes aguantan reinicios.
- El puerto de depuración inalámbrica cambia en cada reinicio, pero eso solo afecta a cuando hay que conectar desde el PC.
- Una actualización de TCL podría quitar el `AUTO_START`. En ese caso se repite el paso 2.
- Elegir otro salvapantallas desde el menú deshace el paso 3.

**Restaurar el original:**
`adb shell settings delete secure screensaver_components` y `adb uninstall app.drobr.eko.tv`.

La copia de los ajustes originales está en `C:\Users\Aitor\Desktop\EkoTV\tv-backup\`.

---

## 13. Fases

| Fase | Contenido | Necesita PC |
|---|---|---|
| **0.1** | Valle + Eko genérico, horario del día, gestos, frases de tele y de temporada. Instalación por ADB. | No |
| **0.2** | Conexión de solo lectura con el PC (§8): su nombre, aspecto, evolución, necesidades e idioma. Emparejamiento por ADB. | Sí, con cambio pequeño en `sync.rs` y `sync.js` |
| **0.3** | «¿Dónde está Eko?» (§9), app de configuración con vista previa, emparejamiento con código. | Sí |
| Después | Interacción mínima con OK, si la 0.x convence. | — |

---

## 14. Decisiones abiertas

1. **Frases de tele (§5.1).** ¿Te gustan las de ejemplo? Lo ideal es que las escribas o retoques tú, porque el tono de Eko es tuyo.
2. **Eko en el móvil (§9).** ¿Valle vacío con letrero, o que la tele siga mostrándolo?
3. **Cambio en el PC (§8.3).** ¿Te parece bien tocar `sync.rs` y `sync.js` para la llave de la tele? Sin esto, la tele
   solo puede mostrar el Eko genérico.
4. **Avisos de necesidades en la tele (§6).** ¿Los quieres, o en la tele Eko siempre está «bien»?
5. **Escena.** ¿Solo el Valle, o también la casa (habría que rehacerla en horizontal)?
