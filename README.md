# Eko

Mascota de escritorio para Windows que vive en tu barra de tareas y reacciona a lo que pasa en el ordenador.

*Eko is a free, open-source desktop pet for Windows. A small animated character lives on the taskbar, walks around, reacts to what happens on the computer, plays mini-games and has simple Tamagotchi-style needs.*

## Descarga
Última versión en **[Releases](https://github.com/drobrapp/eko/releases)**. Eko se actualiza solo desde la propia app.

## Qué hace
- Pasea por la barra de tareas, te sigue con la mirada y reacciona a clics, caricias y lanzamientos.
- Necesidades (hambre, energía, diversión, cariño), niveles, logros, misiones y trucos desbloqueables.
- Chat y voz opcionales con un modelo de IA **local** (Ollama). Nada sale de tu ordenador.
- Icono en la bandeja: dormir/despertar, ocultar/mostrar, arrancar con Windows, ajustes, salir.
- Atajo de pánico: **Ctrl+Alt+E** lo oculta o lo muestra.

## Privacidad
Eko no envía datos a ningún servidor. Memoria, ajustes y conversaciones se guardan solo en tu equipo.

## Firma de código / Code signing
Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by [SignPath Foundation](https://signpath.org).

Los instaladores de Windows se compilan con GitHub Actions directamente desde este repositorio y se firman a través de SignPath Foundation.

- Committers y revisores: [@drobrapp](https://github.com/drobrapp)
- Aprobación de firmas: [@drobrapp](https://github.com/drobrapp)

## Cómo se compila
Cada vez que se sube un cambio a `main`, GitHub Actions genera el instalador de Windows.
Lo encontrarás en la pestaña **Actions** → última ejecución → **Artifacts** → `Eko-instalador-windows`.

## Licencia
[MIT](LICENSE) © 2026 Aitor García
