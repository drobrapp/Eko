# Eko

Mascota de escritorio para Windows que vive en tu barra de tareas y reacciona a lo que pasa en el ordenador.

## Fase 1 (esqueleto)
- Eko aparece sobre la barra de tareas, pasea, parpadea y te sigue con la mirada.
- Cógelo y arrástralo; si lo lanzas, cae y rebota.
- Un clic: da un saltito. Pasa el cursor despacio por encima: le gustan las caricias.
- Icono en la bandeja: dormir/despertar, ocultar/mostrar, arrancar con Windows, salir.
- Atajo de pánico: **Ctrl+Alt+E** lo oculta o lo muestra.
- Arranca con Windows por defecto (desactivable desde la bandeja).

## Cómo se compila
Cada vez que se sube un cambio a `main`, GitHub Actions genera el instalador de Windows.
Lo encontrarás en la pestaña **Actions** → última ejecución → **Artifacts** → `Eko-instalador-windows`.
