/* 123-icon-plate-auto.js — v4.76
   =====================================================================
   WHY THIS FILE EXISTS
   --------------------
   v4.75 gave every icon the same backing plate. That was wrong, and the
   error was one of assumption: a single plate colour only works if every
   icon carries roughly the same tonal weight. Ours do not.

     - compass, house, bank, factory: large pale fills. Already bright.
       Put them on a light plate and the artwork dissolves into it.
     - person, lock: solid dark silhouettes. On the dark rail they are
       nearly invisible, and a light plate rescues them completely.
     - chart, handshake, crane: mostly line. Somewhere in between.

   So the plate cannot be a global setting. It has to be chosen per icon,
   and the only honest way to choose is to look at the icon.

   HOW IT WORKS
   ------------
   Each distinct icon source is drawn once into an offscreen canvas and
   its pixels read back. We take the mean relative luminance of every
   pixel with meaningful alpha — transparent margin is ignored, or a
   tightly-cropped icon and a loosely-cropped one would score
   differently for no reason that matters visually.

   Relative luminance uses the sRGB coefficients (0.2126 R, 0.7152 G,
   0.0722 B) on linearised channels, the same maths WCAG contrast uses,
   rather than a naive (R+G+B)/3 — which would rate a saturated blue and
   a saturated yellow as equally bright, and they are not remotely.

   Then, simply:

     mean luminance BELOW the threshold -> the icon is dark   -> LIGHT plate
     mean luminance ABOVE the threshold -> the icon is light  -> DEEP plate

   A deep plate is not "no plate". It is a tile slightly raised from the
   #20242c rail with a faint light hairline, so a pale icon still sits on
   a defined placard and the dock keeps one consistent shape language.
   Every icon gets a tile; only the tile's lightness varies.

   COLOUR FAMILY
   -------------
   The light and deep members are drawn from whichever family you chose
   in v4.75 (NBIconPlate), so your taste in hue is preserved and only the
   lightness is decided automatically. Change family and both members
   move together:

       NBIconPlate.set('warm')     then reload, or
       NBIconPlateAuto.refresh()

   CONSOLE
   -------
       NBIconPlateAuto.report()            what each icon measured, and
                                           which plate it was given
       NBIconPlateAuto.setKey('compass','light')   force one icon
       NBIconPlateAuto.threshold(0.5)      move the dividing line
       NBIconPlateAuto.off()               back to the uniform v4.75 plate

   Measurements are cached in localStorage, so this costs nothing after
   the first load. Off with ?noplateauto=1.
   ===================================================================== */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](noplateauto|noplate|noicons|safe)=1/.test(q)) return;
  if (window.__nbPlateAuto476) return;
  window.__nbPlateAuto476 = true;

  var CACHE = "nb.icoLum.v1";
  var PREFS = "nb.icoPlateAuto.v1";

  /* Light and deep members of each family. The light member is the one
     shipped in v4.75; the deep member is its counterpart, lifted just
     far enough off the #20242c rail to read as a tile. */
  var FAMILY = {
    slate: { light: "#9FB0C4", deep: "#2B323E",
             lightEdge: "rgba(255,255,255,.14)", deepEdge: "rgba(255,255,255,.10)" },
    warm:  { light: "#C9BEA6", deep: "#37322A",
             lightEdge: "rgba(255,255,255,.16)", deepEdge: "rgba(255,235,200,.10)" },
    mist:  { light: "#8494A8", deep: "#262C35",
             lightEdge: "rgba(255,255,255,.12)", deepEdge: "rgba(255,255,255,.08)" },
    ghost: { light: "rgba(159,188,214,.18)", deep: "rgba(0,0,0,.26)",
             lightEdge: "rgba(255,255,255,.08)", deepEdge: "rgba(255,255,255,.05)" },
    off:   { light: "transparent", deep: "transparent",
             lightEdge: "transparent", deepEdge: "transparent" }
  };

  function familyName() {
    try {
      var v = localStorage.getItem("nb.icoPlate");
      if (v && FAMILY[v]) return v;
    } catch (e) {}
    return "slate";
  }

  var prefs = { threshold: 0.45, forced: {}, enabled: true };
  try {
    var raw = localStorage.getItem(PREFS);
    if (raw) {
      var p = JSON.parse(raw);
      if (p && typeof p === "object") {
        if (typeof p.threshold === "number") prefs.threshold = p.threshold;
        if (p.forced && typeof p.forced === "object") prefs.forced = p.forced;
        if (typeof p.enabled === "boolean") prefs.enabled = p.enabled;
      }
    }
  } catch (e) {}

  function savePrefs() {
    try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch (e) {}
  }

  /* key -> { lum, band, src }. Loaded from cache, filled in by measure(). */
  var measured = {};
  try {
    var c = localStorage.getItem(CACHE);
    if (c) {
      var parsed = JSON.parse(c);
      if (parsed && typeof parsed === "object") measured = parsed;
    }
  } catch (e) {}

  function saveCache() {
    try { localStorage.setItem(CACHE, JSON.stringify(measured)); } catch (e) {}
  }

  /* sRGB channel -> linear. The gamma curve is the whole point: a
     mid-grey pixel is not half as bright as white. */
  function lin(v) {
    v = v / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }

  var canvas = null, ctx = null;
  function scratch() {
    if (ctx) return ctx;
    try {
      canvas = document.createElement("canvas");
      canvas.width = 32; canvas.height = 32;
      ctx = canvas.getContext("2d", { willReadFrequently: true });
    } catch (e) { ctx = null; }
    return ctx;
  }

  var pending = {};

  function measure(key, src, done) {
    if (measured[key] && measured[key].src === src) { done && done(); return; }
    if (pending[key]) return;
    pending[key] = true;

    var img = new Image();
    /* Same-origin on Pages, and data: URIs are same-origin by nature,
       so the canvas stays untainted and getImageData is permitted. */
    img.onload = function () {
      var g = scratch();
      if (!g) { delete pending[key]; return; }
      var lum = null;
      try {
        g.clearRect(0, 0, 32, 32);
        g.drawImage(img, 0, 0, 32, 32);
        var d = g.getImageData(0, 0, 32, 32).data;
        var sum = 0, n = 0;
        for (var i = 0; i < d.length; i += 4) {
          var a = d[i + 3];
          if (a < 32) continue;              /* ignore the transparent margin */
          sum += 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
          n++;
        }
        if (n > 0) lum = sum / n;
      } catch (e) { lum = null; }
      delete pending[key];
      if (lum === null) return;
      measured[key] = { lum: Math.round(lum * 1000) / 1000, src: src };
      saveCache();
      done && done();
    };
    img.onerror = function () { delete pending[key]; };
    img.src = src;
  }

  function bandFor(key) {
    if (prefs.forced[key] === "light" || prefs.forced[key] === "deep") {
      return prefs.forced[key];
    }
    var m = measured[key];
    if (!m || typeof m.lum !== "number") return null;
    return m.lum < prefs.threshold ? "light" : "deep";
  }

  /* Inline styles, deliberately. 122's plate rules live in a stylesheet
     and carry no !important, so an inline background simply wins, and
     122 keeps supplying the geometry — radius, padding, size, shadow. */
  function dress(el) {
    var key = el.getAttribute("data-nb-ico");
    if (!key) return false;
    var src = el.getAttribute("src") || "";
    if (!src) return false;

    if (!prefs.enabled) {
      el.style.background = "";
      el.style.boxShadow = "";
      return false;
    }

    if (!measured[key] || measured[key].src !== src) {
      measure(key, src, applySoon);
      return false;
    }

    var band = bandFor(key);
    if (!band) return false;

    var f = FAMILY[familyName()] || FAMILY.slate;
    var fill = band === "light" ? f.light : f.deep;
    var edge = band === "light" ? f.lightEdge : f.deepEdge;

    var want = fill;
    if (el.__nbPlateBand === band && el.style.background) return false;
    el.style.background = want;
    el.style.boxShadow = "inset 0 0 0 1px " + edge + ", 0 1px 2px rgba(0,0,0,.34)";
    el.__nbPlateBand = band;
    return true;
  }

  function apply() {
    var n = 0, list;
    try { list = document.querySelectorAll("img[data-nb-ico]"); }
    catch (e) { return 0; }
    for (var i = 0; i < list.length; i++) {
      try { if (dress(list[i])) n++; } catch (e) {}
    }
    return n;
  }

  var timer = null;
  function applySoon() {
    if (timer) return;
    timer = setTimeout(function () { timer = null; apply(); }, 80);
  }

  /* The dock is repainted by several layers on their own timers, and
     art-core writes icons inline all over the place, so watch rather
     than poll forever. */
  function watch() {
    try {
      var mo = new MutationObserver(applySoon);
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {
      setInterval(apply, 1500);
    }
  }

  function boot() {
    apply();
    watch();
    setTimeout(apply, 600);
    setTimeout(apply, 2000);
    setTimeout(apply, 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.NBIconPlateAuto = {
    version: "4.76",
    refresh: function () {
      var list = document.querySelectorAll("img[data-nb-ico]");
      for (var i = 0; i < list.length; i++) { list[i].__nbPlateBand = null; }
      return apply();
    },
    threshold: function (v) {
      if (typeof v !== "number" || v <= 0 || v >= 1) {
        try { console.log("Threshold is " + prefs.threshold + ". Pass a number between 0 and 1."); } catch (e) {}
        return prefs.threshold;
      }
      prefs.threshold = v;
      savePrefs();
      this.refresh();
      try { console.log("Threshold " + v + " — icons darker than this get a light plate."); } catch (e) {}
      return v;
    },
    setKey: function (key, band) {
      if (band === "auto" || band === null) { delete prefs.forced[key]; }
      else if (band === "light" || band === "deep") { prefs.forced[key] = band; }
      else {
        try { console.log("Band must be 'light', 'deep' or 'auto'."); } catch (e) {}
        return null;
      }
      savePrefs();
      this.refresh();
      return band;
    },
    off: function () {
      prefs.enabled = false; savePrefs();
      var list = document.querySelectorAll("img[data-nb-ico]");
      for (var i = 0; i < list.length; i++) {
        list[i].style.background = "";
        list[i].style.boxShadow = "";
        list[i].__nbPlateBand = null;
      }
      try { console.log("Per-icon plates off; the uniform v4.75 plate applies again."); } catch (e) {}
      return false;
    },
    on: function () {
      prefs.enabled = true; savePrefs();
      return this.refresh();
    },
    recompute: function () {
      measured = {}; saveCache();
      return this.refresh();
    },
    report: function () {
      var rows = [];
      Object.keys(measured).sort().forEach(function (k) {
        rows.push({
          icon: k,
          luminance: measured[k].lum,
          plate: bandFor(k),
          forced: prefs.forced[k] ? true : false
        });
      });
      var out = {
        version: "4.76",
        enabled: prefs.enabled,
        family: familyName(),
        threshold: prefs.threshold,
        measuredIcons: rows.length,
        icons: rows,
        tip: "Darker than the threshold gets a LIGHT plate; lighter gets a DEEP one. " +
             "Override one with NBIconPlateAuto.setKey('compass','deep')."
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try {
    console.log("[v4.76] per-icon plates active. NBIconPlateAuto.report()");
  } catch (e) {}
})();
