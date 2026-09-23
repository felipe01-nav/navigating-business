/* 124-panel-theme.js — v4.79
   =====================================================================
   HISTORY, BRIEFLY
   ----------------
   v4.75-v4.77 put a light placard behind every icon. v4.78 threw the
   placards away and repainted the application light instead. Felipe's
   verdict on the light surface: tolerable, not wanted — and the side
   panel still looked layered.

   He was right about the layering, and the plate was never the whole
   of it. The dock is built as a stack of three surfaces: the rail
   (#dock, var(--panel)), a rounded 44 px tile per button (.dock-btn,
   var(--panel2) with a 1 px border), and then the icon on top. Removing
   the plate in v4.78 left two of those three still stacked, which is
   exactly the "layered images" complaint. A dock should be glyphs on a
   rail, not glyphs on tiles on a rail.

   WHAT THIS VERSION DOES
   ----------------------
     1. Flattens the dock in every theme. The per-button tile and its
        border go transparent; the rail loses its own fill and sits on
        the page colour; the current tab is marked by a short accent
        bar at the edge rather than by a filled box. Hover gets a faint
        wash so the buttons still feel like buttons.

     2. Keeps the plates retired. 122 goes to 'off', 123's inline
        colouring is switched off, and 122's leftover padding and
        corner radius on the icon itself are zeroed — that padding was
        compensation for a tile that no longer exists.

     3. Restores dark as the default and adds a darker one. Three
        surfaces now:

            NBTheme.dark()   base.css as shipped        #15171c
            NBTheme.deep()   a genuinely darker room    #0c0e12
            NBTheme.light()  v4.78's white panel        #e9edf3

        'deep' also drops the panel and rail nearer the page, so the
        flattened dock reads as one continuous dark edge.

     4. The pale-icon invert stopgap now applies only in 'light'. On a
        dark surface today's pale artwork is correct as drawn and is
        left alone.

   CONSOLE
   -------
       NBTheme.dark() / .deep() / .light() / .cycle()
       NBTheme.flat(false)        put the dock tiles back
       NBTheme.plate(true)        put the icon placards back
       NBTheme.invert(true|false) pale-icon stopgap, light theme only
       NBTheme.threshold(0.38)
       NBTheme.report()

   Persists in localStorage. Per-load: ?theme=dark|deep|light.
   Disabled outright with ?notheme=1.
   ===================================================================== */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](notheme|safe)=1/.test(q)) return;
  if (window.__nbPanelTheme478) return;
  window.__nbPanelTheme478 = true;

  var STORE      = "nb.theme";
  var STORE_INV  = "nb.themeInvert";
  var STORE_THR  = "nb.themeInvertThreshold";
  var STORE_FLAT = "nb.dockFlat";
  var LUMCACHE   = "nb.panelLum.v1";

  /* ------------------------------------------------------------------
     Palettes
     --------
     'dark' is base.css itself, so it declares no overrides. 'deep' and
     'light' are full declarations.

     On 'deep' the point is not merely a lower number. The page, the
     panel and the rail are pulled close together (#0c0e12 / #12151b /
     #171b22) so that with the dock flattened there is no visible seam
     between rail and page — one dark edge, glyphs sitting on it. The
     border lightens slightly rather than darkening, because at this
     depth a dark border is invisible and cards lose their shape.
  ------------------------------------------------------------------ */
  var PALETTES = {
    dark: null,
    deep: {
      bg: "#0c0e12", panel: "#12151b", panel2: "#171b22", border: "#252b36",
      text: "#e9ebf0", muted: "#8f98a8", accent: "#7db0ff",
      good: "#4fd1a5", warn: "#f5b95d", bad: "#f2716a", purple: "#b39ddb",
      track: "#1c212a", hairline: "#1d222b", thumb: "#2c333f",
      onInk: "#07090c", themeColor: "#0c0e12",
      topbar: "linear-gradient(180deg,#13161d,#0f1216)",
      onboard: "radial-gradient(circle at 30% 20%,#161b26,#0a0c10 70%)",
      banner: "linear-gradient(90deg,#221a0c,#1d1523)",
      badge: "rgba(0,0,0,.55)",
      scrim: "rgba(0,0,0,.62)",
      shadow: "0 20px 60px rgba(0,0,0,.6)"
    },
    light: {
      bg: "#e9edf3", panel: "#ffffff", panel2: "#f2f5f9", border: "#d2d9e3",
      text: "#151c27", muted: "#5b6675", accent: "#2f6fd0",
      good: "#0e8f69", warn: "#9a6207", bad: "#c2413a", purple: "#6a4ead",
      track: "#dde3ec", hairline: "#e3e8ef", thumb: "#bcc5d3",
      onInk: "#ffffff", themeColor: "#e9edf3",
      topbar: "linear-gradient(180deg,#ffffff,#f2f5f9)",
      onboard: "radial-gradient(circle at 30% 20%,#ffffff,#e9edf3 70%)",
      banner: "linear-gradient(90deg,#fff7e8,#f6effa)",
      badge: "rgba(21,28,39,.08)",
      scrim: "rgba(21,28,39,.34)",
      shadow: "0 18px 44px rgba(20,30,50,.14)"
    }
  };

  function paletteCss(name) {
    var P = PALETTES[name];
    if (!P) return "";
    return [
      ":root{",
        "--bg:" + P.bg + ";",
        "--panel:" + P.panel + ";",
        "--panel2:" + P.panel2 + ";",
        "--border:" + P.border + ";",
        "--text:" + P.text + ";",
        "--muted:" + P.muted + ";",
        "--accent:" + P.accent + ";",
        "--good:" + P.good + ";",
        "--warn:" + P.warn + ";",
        "--bad:" + P.bad + ";",
        "--purple:" + P.purple + ";",
      "}",

      /* Solid-fill controls: base.css hard-codes a near-black ink that
         only suits a pale accent. Each palette states its own. */
      ".btn{color:" + P.onInk + ";}",
      ".btn.secondary{background:" + P.panel2 + ";color:" + P.text + ";}",
      ".btn.ghost{color:" + P.muted + ";}",
      ".btn.danger{color:" + P.onInk + ";}",
      "#advanceBtn{color:" + P.onInk + ";}",
      ".msg.me{color:" + P.onInk + ";}",
      ".radio-chip.sel{color:" + P.onInk + ";}",
      ".slack-item .av{color:" + P.onInk + ";}",
      ".emp-av{color:" + P.onInk + ";}",

      /* The hard-coded darks in base.css, in source order. */
      "#onboard{background:" + P.onboard + ";}",
      ".ob-card{box-shadow:" + P.shadow + ";}",
      "#topbar{background:" + P.topbar + ";}",
      "td{border-bottom:1px solid " + P.hairline + ";}",
      ".slack-item{border-bottom:1px solid " + P.hairline + ";}",
      ".perf-bar{background:" + P.track + ";}",
      ".barrow .track{background:" + P.track + ";}",
      ".progress-track{background:" + P.track + ";}",
      "::-webkit-scrollbar-thumb{background:" + P.thumb + ";}",
      ".event-banner{background:" + P.banner + ";}",
      ".locked-badge{background:" + P.badge + ";color:" + P.muted + ";}",
      "#modalOverlay{background:" + P.scrim + ";}",
      ".shop-card img{background:" + P.panel2 + ";}"
    ].join("");
  }

  /* ------------------------------------------------------------------
     The dock, flattened
     -------------------
     Theme-independent: the layering was wrong on the dark surface too,
     it was simply less obvious there. The active marker is a 3 px
     accent bar on the inside edge of the rail — on desktop at the left,
     on the mobile horizontal dock along the bottom.
  ------------------------------------------------------------------ */
  function flatDockCss() {
    return [
      "#dock{background:transparent;}",
      ".dock-btn{",
        "background:transparent;",
        "border-color:transparent;",
        "box-shadow:none;",
        "transition:color .12s ease, background .12s ease;",
      "}",
      ".dock-btn:hover{background:var(--panel2);border-color:transparent;}",
      ".dock-btn.active,",
      ".dock-btn[aria-selected=\"true\"]{",
        "background:transparent;",
        "border-color:transparent;",
        "color:var(--accent);",
      "}",
      ".dock-btn.active::after,",
      ".dock-btn[aria-selected=\"true\"]::after{",
        "content:\"\";",
        "position:absolute;",
        "left:-8px;top:50%;",
        "transform:translateY(-50%);",
        "width:3px;height:20px;",
        "border-radius:0 2px 2px 0;",
        "background:var(--accent);",
      "}",
      /* The tile is gone, so the padding that compensated for it must
         go too, or every icon carries 2 px of dead margin. */
      "img[data-nb-ico]:not(.nb-ico-lg){",
        "padding:0 !important;",
        "border-radius:0 !important;",
      "}",
      "#dock .dock-btn img[data-nb-ico]:not(.nb-ico-lg),",
      ".dock-btn img[data-nb-ico]:not(.nb-ico-lg){",
        "width:27px !important;height:27px !important;",
      "}",
      "button img[data-nb-ico]:not(.nb-ico-lg){",
        "width:18px !important;height:18px !important;",
      "}",
      "@media (max-width:780px){",
        ".dock-btn.active::after,",
        ".dock-btn[aria-selected=\"true\"]::after{",
          "left:50%;top:auto;bottom:-5px;",
          "transform:translateX(-50%);",
          "width:18px;height:3px;",
          "border-radius:2px 2px 0 0;",
        "}",
        "#dock .dock-btn img[data-nb-ico]:not(.nb-ico-lg),",
        ".dock-btn img[data-nb-ico]:not(.nb-ico-lg){",
          "width:24px !important;height:24px !important;",
        "}",
      "}"
    ].join("");
  }

  /* 123 writes inline styles, which outrank an ordinary stylesheet, so
     these two carry !important. */
  function plateOffCss() {
    return "img[data-nb-ico]{background:transparent !important;box-shadow:none !important;}";
  }

  function invertCss() {
    return "img[data-nb-ico].nb-inv{filter:invert(1) hue-rotate(180deg) saturate(.9);}";
  }

  /* ------------------------------------------------------------------ */

  function readStore(k, fallback) {
    try {
      var v = localStorage.getItem(k);
      return v === null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function writeStore(k, v) {
    try { localStorage.setItem(k, String(v)); } catch (e) {}
  }

  function fromQuery() {
    var m = q.match(/[?&]theme=(light|dark|deep)/i);
    return m ? m[1].toLowerCase() : null;
  }

  /* v4.78 briefly defaulted to light and wrote that choice to storage
     for anyone who loaded it. That is not a decision the user made, so
     it is discarded once; a deliberate choice made from v4.79 onward
     carries a marker and is respected. */
  (function migrate() {
    try {
      if (readStore("nb.themeChosen", "") !== "1" && readStore(STORE, "") === "light") {
        localStorage.removeItem(STORE);
      }
    } catch (e) {}
  })();

  var theme = fromQuery() || readStore(STORE, "dark");
  if (!(theme in PALETTES)) theme = "dark";

  var doFlat   = readStore(STORE_FLAT, "1") !== "0";
  var doInvert = readStore(STORE_INV, "1") !== "0";
  var threshold = parseFloat(readStore(STORE_THR, "0.38"));
  if (!isFinite(threshold) || threshold <= 0 || threshold >= 1) threshold = 0.38;

  /* ---------------- luminance measurement (light theme only) ------- */

  var lum = {};
  try { lum = JSON.parse(readStore(LUMCACHE, "{}")) || {}; } catch (e) { lum = {}; }
  var inFlight = {};

  function srgb(c) {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function keyFor(img) {
    var s = "";
    try { s = img.currentSrc || img.getAttribute("src") || ""; } catch (e) {}
    if (!s) return null;
    if (/^data:/.test(s)) {
      var k = "";
      try { k = img.getAttribute("data-nb-ico") || ""; } catch (e) {}
      return "inline:" + k + ":" + s.length;
    }
    return s.split("?")[0].replace(/^.*\//, "");
  }

  function measure(src, done) {
    var im = new Image();
    im.onload = function () {
      try {
        var c = document.createElement("canvas");
        c.width = 32; c.height = 32;
        var x = c.getContext("2d");
        x.clearRect(0, 0, 32, 32);
        x.drawImage(im, 0, 0, 32, 32);
        var d = x.getImageData(0, 0, 32, 32).data;
        var sum = 0, n = 0;
        for (var i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 32) continue;
          sum += 0.2126 * srgb(d[i] / 255) +
                 0.7152 * srgb(d[i + 1] / 255) +
                 0.0722 * srgb(d[i + 2] / 255);
          n++;
        }
        done(n ? sum / n : null);
      } catch (e) { done(null); }
    };
    im.onerror = function () { done(null); };
    try { im.src = src; } catch (e) { done(null); }
  }

  function persistLum() {
    try { localStorage.setItem(LUMCACHE, JSON.stringify(lum)); } catch (e) {}
  }

  function applyTo(img) {
    /* Only the light surface needs the stopgap. On dark, the artwork is
       correct as drawn. */
    if (theme !== "light" || !doInvert) {
      try { img.classList.remove("nb-inv"); } catch (e) {}
      return;
    }
    var k = keyFor(img);
    if (!k) return;
    if (typeof lum[k] === "number") {
      try {
        if (lum[k] > threshold) img.classList.add("nb-inv");
        else img.classList.remove("nb-inv");
      } catch (e) {}
      return;
    }
    if (inFlight[k]) return;
    inFlight[k] = true;
    var src = "";
    try { src = img.currentSrc || img.getAttribute("src") || ""; } catch (e) {}
    if (!src) { inFlight[k] = false; return; }
    measure(src, function (v) {
      inFlight[k] = false;
      if (typeof v !== "number") return;
      lum[k] = Math.round(v * 1000) / 1000;
      persistLum();
      sweep();
    });
  }

  function sweep() {
    var list = [];
    try { list = document.querySelectorAll("img[data-nb-ico]"); } catch (e) { return; }
    for (var i = 0; i < list.length; i++) applyTo(list[i]);
  }

  /* ---------------- style plumbing ---------------- */

  function styleNode(id) {
    var n = document.getElementById(id);
    if (!n) {
      n = document.createElement("style");
      n.id = id;
      (document.head || document.documentElement).appendChild(n);
    }
    if (n.parentNode && n.parentNode.lastChild !== n) n.parentNode.appendChild(n);
    return n;
  }

  function setThemeColorMeta() {
    try {
      var m = document.querySelector('meta[name="theme-color"]');
      if (!m) return;
      var P = PALETTES[theme];
      m.setAttribute("content", P ? P.themeColor : "#15171c");
    } catch (e) {}
  }

  var platesRetired = true;

  function retirePlate(on) {
    try {
      if (on) {
        if (window.NBIconPlateAuto && window.NBIconPlateAuto.off) window.NBIconPlateAuto.off();
        if (window.NBIconPlate && window.NBIconPlate.set) window.NBIconPlate.set("off");
      } else {
        if (window.NBIconPlate && window.NBIconPlate.set) window.NBIconPlate.set("slate");
        if (window.NBIconPlateAuto && window.NBIconPlateAuto.on) window.NBIconPlateAuto.on();
      }
    } catch (e) {}
  }

  function paint() {
    try {
      styleNode("nb-panel-theme-css").textContent = paletteCss(theme);
      styleNode("nb-plate-off-css").textContent   = platesRetired ? plateOffCss() : "";
      styleNode("nb-dock-flat-css").textContent   = doFlat ? flatDockCss() : "";
      styleNode("nb-invert-css").textContent      = invertCss();
      try { document.documentElement.setAttribute("data-nb-theme", theme); } catch (e) {}
      setThemeColorMeta();
      sweep();
    } catch (e) {}
  }

  retirePlate(true);
  paint();
  /* 122 reasserts its stylesheet at 500/1500/4000 ms; follow each. */
  setTimeout(function () { retirePlate(platesRetired); paint(); }, 600);
  setTimeout(function () { retirePlate(platesRetired); paint(); }, 1600);
  setTimeout(function () { retirePlate(platesRetired); paint(); }, 4100);

  try {
    if (window.MutationObserver) {
      new MutationObserver(function () { sweep(); })
        .observe(document.documentElement, { childList: true, subtree: true });
    }
  } catch (e) {}

  /* ---------------- console API ---------------- */

  var ORDER = ["dark", "deep", "light"];

  function setTheme(next) {
    theme = (next in PALETTES) ? next : "dark";
    writeStore(STORE, theme);
    writeStore("nb.themeChosen", "1");
    paint();
    try {
      console.log("Theme: " + theme +
        (theme === "light" && doInvert ? " (pale-icon invert stopgap on)" : ""));
    } catch (e) {}
    return theme;
  }

  window.NBTheme = {
    version: "4.79",
    dark:  function () { return setTheme("dark"); },
    deep:  function () { return setTheme("deep"); },
    light: function () { return setTheme("light"); },
    set:   function (n) { return setTheme(String(n || "").toLowerCase()); },
    cycle: function () {
      return setTheme(ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]);
    },
    toggle: function () { return this.cycle(); },
    flat: function (on) {
      if (on === undefined) return doFlat;
      doFlat = !!on;
      writeStore(STORE_FLAT, doFlat ? "1" : "0");
      paint();
      try { console.log("Dock: " + (doFlat ? "flat" : "tiled (base.css original)")); } catch (e) {}
      return doFlat;
    },
    invert: function (on) {
      if (on === undefined) return doInvert;
      doInvert = !!on;
      writeStore(STORE_INV, doInvert ? "1" : "0");
      paint();
      try { console.log("Pale-icon invert stopgap: " + (doInvert ? "on" : "off") +
                        " (light theme only)"); } catch (e) {}
      return doInvert;
    },
    threshold: function (n) {
      n = parseFloat(n);
      if (!isFinite(n) || n <= 0 || n >= 1) {
        try { console.log("Threshold must be between 0 and 1. Current: " + threshold); } catch (e) {}
        return threshold;
      }
      threshold = n;
      writeStore(STORE_THR, String(n));
      paint();
      try { console.log("Invert threshold: " + threshold); } catch (e) {}
      return threshold;
    },
    plate: function (on) {
      platesRetired = !on;
      retirePlate(platesRetired);
      paint();
      try { console.log("Backing plates: " + (on ? "restored" : "retired")); } catch (e) {}
      return !platesRetired;
    },
    recompute: function () {
      lum = {};
      persistLum();
      sweep();
      return true;
    },
    report: function () {
      var list = [];
      try { list = document.querySelectorAll("img[data-nb-ico]"); } catch (e) {}
      var seen = {}, inverted = [];
      for (var i = 0; i < list.length; i++) {
        var name = "";
        try { name = list[i].getAttribute("data-nb-ico") || keyFor(list[i]) || "?"; } catch (e) {}
        if (!seen[name]) {
          seen[name] = true;
          try { if (list[i].classList.contains("nb-inv")) inverted.push(name); } catch (e) {}
        }
      }
      var P = PALETTES[theme];
      var out = {
        version: "4.79",
        theme: theme,
        surface: P ? { bg: P.bg, panel: P.panel, panel2: P.panel2, border: P.border }
                   : { bg: "#15171c", panel: "#1b1e25", panel2: "#20242c", border: "#2a2f3a" },
        dockFlat: doFlat,
        platesRetired: platesRetired,
        invertActive: (theme === "light" && doInvert),
        iconsOnScreen: list.length,
        distinctIcons: Object.keys(seen).length,
        invertedNow: inverted.sort(),
        change: "NBTheme.dark() | .deep() | .light() | .flat(false) | .plate(true)"
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try {
    console.log("[v4.79] theme: " + theme + "; dock flattened; plates retired. " +
                "NBTheme.deep() for a darker room, NBTheme.report() for detail.");
  } catch (e) {}
})();
