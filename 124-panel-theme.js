/* 124-panel-theme.js — v4.78
   =====================================================================
   WHY THIS FILE EXISTS
   --------------------
   v4.75 through v4.77 solved the wrong problem with increasing
   precision. The premise was that the icons must sit on a dark rail, so
   each icon was given its own small light placard. Three releases of
   tuning later the placards were correct and still wrong: a grid of
   little tiles behind a set of glyphs reads as clutter, and the tiles
   fight the panel they sit on.

   The correct move is the one Felipe asked for: stop patching behind
   each icon and change the surface. If the artwork is to be dark ink,
   the panel must be light. So this layer does two things:

     1. Retires the plate. 122's tone goes to 'off' and 123's per-icon
        inline colouring is switched off, while 122's geometry (the size
        and padding compensation) is left in place.

     2. Repaints the entire application light — background, panels,
        rails, borders, text, and the two dozen hard-coded dark values
        scattered through base.css that no CSS variable governs.

   THE AWKWARD INTERVAL
   --------------------
   Every icon in art/ today was recoloured for a dark rail: pale fills,
   light linework. Put them on a white panel and they vanish. Until the
   dark-ink set exists they are carried by a stopgap: each icon's mean
   luminance is measured off a canvas, and anything paler than the
   threshold is flipped with filter:invert(1) hue-rotate(180deg), which
   inverts lightness while returning the hue to roughly where it began.
   On near-monochrome navy-and-cream linework the result is a credible
   dark icon. It is a stopgap and it looks like one on the busier
   glyphs. It exists so the light panel can be judged today rather than
   after a re-generation.

   When the dark-ink sheet lands, turn it off once and for all:

       NBTheme.invert(false)

   CONSOLE
   -------
       NBTheme.light()            repaint light (default from v4.78)
       NBTheme.dark()             back to the original dark surface
       NBTheme.toggle()
       NBTheme.invert(true|false) the pale-icon stopgap
       NBTheme.threshold(0.38)    luminance above which an icon flips
       NBTheme.plate(true)        bring the backing plates back
       NBTheme.report()

   Persists in localStorage. Per-load override: ?theme=light,
   ?theme=dark. Disabled outright with ?notheme=1.
   ===================================================================== */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](notheme|safe)=1/.test(q)) return;
  if (window.__nbPanelTheme478) return;
  window.__nbPanelTheme478 = true;

  var STORE     = "nb.theme";
  var STORE_INV = "nb.themeInvert";
  var STORE_THR = "nb.themeInvertThreshold";
  var LUMCACHE  = "nb.panelLum.v1";

  /* ------------------------------------------------------------------
     Palette
     -------
     base.css is itself the dark theme, so 'dark' is the absence of an
     override rather than a second palette. Only the light surface is
     declared here.

     The panel is not pure white. #ffffff against a #eceff4 page gives
     no separation at all between card and background, and a full-screen
     white is as fatiguing as a full-screen black. The panel is white,
     the page beneath it is a cool near-white, and the recessed surface
     (--panel2) sits a step below both.
  ------------------------------------------------------------------ */
  var LIGHT = {
    bg:      "#e9edf3",
    panel:   "#ffffff",
    panel2:  "#f2f5f9",
    border:  "#d2d9e3",
    text:    "#151c27",
    muted:   "#5b6675",
    accent:  "#2f6fd0",
    good:    "#0e8f69",
    warn:    "#9a6207",
    bad:     "#c2413a",
    purple:  "#6a4ead",
    /* Neutral tracks and rails that base.css hard-codes. */
    track:   "#dde3ec",
    hairline:"#e3e8ef",
    thumb:   "#bcc5d3",
    themeColor: "#e9edf3"
  };

  function lightCss() {
    var L = LIGHT;
    return [
      ":root{",
        "--bg:" + L.bg + ";",
        "--panel:" + L.panel + ";",
        "--panel2:" + L.panel2 + ";",
        "--border:" + L.border + ";",
        "--text:" + L.text + ";",
        "--muted:" + L.muted + ";",
        "--accent:" + L.accent + ";",
        "--good:" + L.good + ";",
        "--warn:" + L.warn + ";",
        "--bad:" + L.bad + ";",
        "--purple:" + L.purple + ";",
      "}",

      /* --- Solid-fill controls. base.css assumes a dark ink on a pale
         accent; the light accent is dark, so the ink must go white. --- */
      ".btn{color:#fff;}",
      ".btn.secondary{background:" + L.panel2 + ";color:" + L.text + ";}",
      ".btn.ghost{color:" + L.muted + ";}",
      ".btn.danger{color:#fff;}",
      "#advanceBtn{color:#fff;}",
      ".dock-btn.active{color:#fff;}",
      ".msg.me{color:#fff;}",
      ".radio-chip.sel{color:#fff;}",
      ".slack-item .av{color:#fff;}",
      ".emp-av{color:#fff;}",

      /* --- Gradients and hard-coded darks, in base.css order. --- */
      "#onboard{background:radial-gradient(circle at 30% 20%,#ffffff," + L.bg + " 70%);}",
      ".ob-card{box-shadow:0 18px 44px rgba(20,30,50,.14);}",
      "#topbar{background:linear-gradient(180deg,#ffffff," + L.panel2 + ");}",
      "td{border-bottom:1px solid " + L.hairline + ";}",
      ".slack-item{border-bottom:1px solid " + L.hairline + ";}",
      ".perf-bar{background:" + L.track + ";}",
      ".barrow .track{background:" + L.track + ";}",
      ".progress-track{background:" + L.track + ";}",
      "::-webkit-scrollbar-thumb{background:" + L.thumb + ";}",
      ".event-banner{background:linear-gradient(90deg,#fff7e8,#f6effa);}",
      ".locked-badge{background:rgba(21,28,39,.08);color:" + L.muted + ";}",
      ".folder-panel{box-shadow:0 8px 24px rgba(20,30,50,.10);}",
      ".card{box-shadow:0 1px 2px rgba(20,30,50,.05);}",
      "#modalOverlay{background:rgba(21,28,39,.34);}",
      "#modalBox{box-shadow:0 24px 64px rgba(20,30,50,.20);}",

      /* --- The illustrations are full-colour scenes with their own
         grounds and are deliberately left alone. --- */
      ".shop-card img{background:" + L.panel2 + ";}"
    ].join("");
  }

  /* The plate is retired in CSS as well as through 122/123's own APIs.
     123 writes inline styles, which outrank an ordinary stylesheet, so
     these two declarations carry !important — the only two in the file.
     122's padding and width compensation is deliberately not touched:
     the geometry was correct, only the tile was wrong. */
  function plateOffCss() {
    return [
      "img[data-nb-ico]{",
        "background:transparent !important;",
        "box-shadow:none !important;",
      "}"
    ].join("");
  }

  function invertCss() {
    return [
      "img[data-nb-ico].nb-inv{",
        "filter:invert(1) hue-rotate(180deg) saturate(.9);",
      "}"
    ].join("");
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
    var m = q.match(/[?&]theme=(light|dark)/i);
    return m ? m[1].toLowerCase() : null;
  }

  /* v4.78 makes light the default. A user who has already chosen dark
     keeps dark; a user with no stored preference gets the new surface. */
  var theme     = fromQuery() || readStore(STORE, "light");
  if (theme !== "light" && theme !== "dark") theme = "light";
  var doInvert  = readStore(STORE_INV, "1") !== "0";
  var threshold = parseFloat(readStore(STORE_THR, "0.38"));
  if (!isFinite(threshold) || threshold <= 0 || threshold >= 1) threshold = 0.38;

  /* ---------------- luminance measurement (stopgap) ---------------- */

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
      /* The surviving base64 icons have no filename to key on; the icon
         key plus payload length is stable enough for a cache. */
      var k = "";
      try { k = img.getAttribute("data-nb-ico") || ""; } catch (e) {}
      return "inline:" + k + ":" + s.length;
    }
    return s.split("?")[0].replace(/^.*\//, "");
  }

  /* Mean sRGB relative luminance over the pixels that are actually
     drawn. Transparent margin is skipped, or every icon would report
     the luminance of its own padding. */
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
    /* Re-appended on every paint so this layer outranks the runtime
       <style> blocks injected by 110, 113, 120 and 122. */
    if (n.parentNode && n.parentNode.lastChild !== n) n.parentNode.appendChild(n);
    return n;
  }

  function setThemeColorMeta(colour) {
    try {
      var m = document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute("content", colour);
    } catch (e) {}
  }

  function retirePlate(on) {
    /* on === true means "plates off". */
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

  var platesRetired = true;

  function paint() {
    try {
      var theme_node = styleNode("nb-panel-theme-css");
      theme_node.textContent = (theme === "light" ? lightCss() : "");

      var plate_node = styleNode("nb-plate-off-css");
      plate_node.textContent = platesRetired ? plateOffCss() : "";

      var inv_node = styleNode("nb-invert-css");
      inv_node.textContent = invertCss();

      try {
        document.documentElement.setAttribute("data-nb-theme", theme);
      } catch (e) {}
      setThemeColorMeta(theme === "light" ? LIGHT.themeColor : "#15171c");
      sweep();
    } catch (e) {}
  }

  retirePlate(true);
  paint();
  /* 122 reasserts its own stylesheet at 500/1500/4000 ms; follow each
     of those with a repaint so the plate stays retired. */
  setTimeout(function () { retirePlate(platesRetired); paint(); }, 600);
  setTimeout(function () { retirePlate(platesRetired); paint(); }, 1600);
  setTimeout(function () { retirePlate(platesRetired); paint(); }, 4100);

  /* Screens re-render wholesale, so new icons arrive constantly. */
  try {
    if (window.MutationObserver) {
      var mo = new MutationObserver(function () { sweep(); });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    }
  } catch (e) {}

  /* ---------------- console API ---------------- */

  function setTheme(next) {
    theme = (next === "dark") ? "dark" : "light";
    writeStore(STORE, theme);
    paint();
    try {
      console.log("Theme: " + theme +
        (theme === "light" && doInvert
          ? " (pale-icon invert stopgap ON — NBTheme.invert(false) once the dark-ink set lands)"
          : ""));
    } catch (e) {}
    return theme;
  }

  window.NBTheme = {
    version: "4.78",
    light: function () { return setTheme("light"); },
    dark:  function () { return setTheme("dark"); },
    toggle: function () { return setTheme(theme === "light" ? "dark" : "light"); },
    invert: function (on) {
      if (on === undefined) return doInvert;
      doInvert = !!on;
      writeStore(STORE_INV, doInvert ? "1" : "0");
      paint();
      try { console.log("Pale-icon invert stopgap: " + (doInvert ? "on" : "off")); } catch (e) {}
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
      try { console.log("Luminance cache cleared; re-measuring."); } catch (e) {}
      return true;
    },
    report: function () {
      var seen = {}, flipped = [], kept = [], unmeasured = [];
      var list = [];
      try { list = document.querySelectorAll("img[data-nb-ico]"); } catch (e) {}
      for (var i = 0; i < list.length; i++) {
        var img = list[i];
        var name = "";
        try { name = img.getAttribute("data-nb-ico") || keyFor(img) || "?"; } catch (e) { name = "?"; }
        if (seen[name]) continue;
        seen[name] = true;
        var k = keyFor(img);
        var v = (k && typeof lum[k] === "number") ? lum[k] : null;
        if (v === null) unmeasured.push(name);
        else if (v > threshold) flipped.push(name + " " + v);
        else kept.push(name + " " + v);
      }
      flipped.sort(); kept.sort(); unmeasured.sort();
      var out = {
        version: "4.78",
        theme: theme,
        platesRetired: platesRetired,
        invertStopgap: doInvert,
        threshold: threshold,
        iconsOnScreen: list.length,
        distinctIcons: Object.keys(seen).length,
        flippedCount: flipped.length,
        flipped: flipped,
        keptAsDrawnCount: kept.length,
        keptAsDrawn: kept,
        unmeasured: unmeasured,
        change: "NBTheme.dark() | NBTheme.invert(false) | NBTheme.threshold(0.5) | NBTheme.plate(true)"
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try {
    console.log("[v4.78] panel theme: " + theme +
                "; backing plates retired. NBTheme.report() for detail, " +
                "NBTheme.dark() to go back.");
  } catch (e) {}
})();
