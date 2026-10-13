// Eko · ajustes compartidos entre la ventana de Eko y la de Ajustes (mismo origen → mismo localStorage).
window.EkoSettings = (() => {
  "use strict";
  const KEY = "eko-settings";
  const DEFAULTS = {
    petName: "Eko",
    userName: "",
    birthday: "",            // "MM-DD"
    bedtime: "00:30",        // a partir de cuándo te avisa de que es tarde ("" = no avisar)
    chatty: 2,               // 0 nada, 1 poco, 2 normal, 3 mucho
    voice: true,
    pitch: 560,
    walk: true,
    fly: true,
    follow: true,
    size: 1,                 // 0.8 pequeño, 1 normal, 1.2 grande
    breaks: true,
    breakMinutes: 90,
    scrollMinutes: 20,
    apps: {
      creative: "lightroom, photoshop, illustrator, afterfx, premiere, captureone, figma, affinity, darktable, ansel, gimp, resolve, blender, krita, inkscape, bridge, indesign, rawtherapee",
      code: "code, cursor, devenv, windowsterminal, powershell, cmd, idea64, pycharm64, sublime_text, webstorm64",
      office: "winword, excel, powerpnt, outlook, olk, onenote, notion, acrobat, acrord32, thunderbird",
      browser: "chrome, msedge, firefox, opera, brave, arc, vivaldi",
      media: "spotify, vlc, applemusic, music",
      ignore: "",
    },
  };
  const read = () => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch (_) { return { ...DEFAULTS }; }
  };
  let cache = read();
  const listeners = [];
  const T = window.__TAURI__;

  function notify() { cache = read(); listeners.forEach((f) => f(cache)); }
  // Otra ventana cambió algo
  window.addEventListener("storage", (e) => { if (e.key === KEY) notify(); });
  if (T) T.event.listen("settings-changed", notify);

  return {
    DEFAULTS,
    get: () => cache,
    set(k, v) {
      const s = read();
      s[k] = v;
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {}
      cache = s;
      if (T) T.event.emit("settings-changed", k);
      listeners.forEach((f) => f(cache));
    },
    setApp(cat, v) { const a = { ...read().apps, [cat]: v }; this.set("apps", a); },
    list(cat) { return (cache.apps[cat] || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean); },
    onChange(f) { listeners.push(f); },
    reset() { try { localStorage.clear(); } catch (_) {} notify(); },
  };
})();
