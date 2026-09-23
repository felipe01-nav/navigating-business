/* 123-icon-plate-auto.js — v4.77
   =====================================================================
   WHY THIS FILE EXISTS
   --------------------
   v4.75 gave every icon the same backing plate, which only works if
   every icon carries the same tonal weight. Ours do not: compass, house
   and bank have large pale fills, while person and lock are near-black
   silhouettes. So the plate must be chosen per icon.

   v4.76 did that, by measuring each icon and splitting on a threshold.
   It was still wrong, and the live measurements proved it. The light
   plate was #9FB0C4, whose own luminance is 0.424. The compass measures
   0.405. Clipboard 0.434. Target 0.435. Those icons were being placed on
   a plate the same brightness as themselves — a contrast ratio of about
   1.04:1, which is to say none. The frosted compass was handed a frosted
   background.

   The threshold was not the problem. Sorted, the 36 measured icons show
   their widest mid-range gap between 0.435 and 0.510, so 0.45 sat in the
   natural valley. The problem was that the "light" member was not light.

   HOW IT WORKS NOW
   ----------------
   Each distinct icon source is drawn once into an offscreen canvas and
   its pixels read back. We take the mean relative luminance of every
   pixel above alpha 32 — transparent margin ignored, so crop tightness
   cannot skew the score. Luminance uses the sRGB coefficients (0.2126 R,
   0.7152 G, 0.0722 B) on linearised channels, not a naive channel
   average, which would rate saturated blue and saturated yellow as
   equally bright. They are not remotely.

   Then, instead of a threshold, the plate is chosen by arithmetic. Each
   family offers two members of known luminance, and we compute the WCAG
   contrast ratio of the icon against each:

       ratio = (lighter + 0.05) / (darker + 0.05)

   The winner is whichever ratio is larger. No dividing line to tune, and
   an icon can never again be placed on a plate of its own brightness:
   that outcome scores 1.0 and always loses.

   The light member is now #C6D2DF (luminance 0.63) rather than 0.42, so
   it is genuinely light. Still short of white — white is 1.00, and a
   dozen white tiles on a #15171c page is a dozen small headlights, which
   was the thing to avoid in the first place. The deep member is a tile
   raised slightly off the #20242c rail with a faint hairline, not an
   absence of plate, so the dock keeps one shape language throughout.

   On these measurements the crossover lands near luminance 0.19, so the
   genuinely dark artwork — crane, camera, chat, bank, factory, chart —
   takes the light plate, and everything mid or pale takes the deep one.
   That is the correct answer even though it looks lopsided: a pale icon
   needs a dark ground, and most of these icons are pale.

   CONSOLE
   -------
       NBIconPlateAuto.report()          every icon, its luminance, both
                                         candidate ratios, and the winner
       NBIconPlateAuto.setKey('compass','light')   pin one icon
       NBIconPlateAuto.setKey('compass','auto')    release it
       NBIconPlateAuto.threshold(0.45)   revert to fixed-threshold mode
       NBIconPlateAuto.contrast()        back to automatic
       NBIconPlateAuto.recompute()       remeasure from scratch
       NBIconPlateAuto.off()             uniform v4.75 plate again

   Measurements cache in localStorage. Off with ?noplateauto=1.
   ===================================================================== */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](noplateauto|noplate|noicons|safe)=1/.test(q)) return;
  if (window.__nbPlateAuto476) return;
  window.__nbPlateAuto476 = true;

  var CACHE = "nb.icoLum.v1";
  var PREFS = "nb.icoPlateAuto.v2";   /* v2: v4.76's threshold pref is retired */

  /* Two members per family, each with its measured luminance recorded
     alongside, so the contrast arithmetic never has to parse a colour
     string at runtime — and so a translucent member can declare its
     effective value over the #20242c rail rather than pretend to be
     opaque. RAIL itself is 0.0175. */
  var FAMILY = {
    slate: {
      light: { css: "#C6D2DF", lum: 0.634, edge: "rgba(255,255,255,.16)" },
      deep:  { css: "#2B323E", lum: 0.031, edge: "rgba(255,255,255,.10)" }
    },
    warm: {
      light: { css: "#E0D7C4", lum: 0.684, edge: "rgba(255,255,255,.18)" },
      deep:  { css: "#37322A", lum: 0.033, edge: "rgba(255,235,200,.10)" }
    },
    mist: {
      light: { css: "#BDC8D4", lum: 0.569, edge: "rgba(255,255,255,.14)" },
      deep:  { css: "#262C35", lum: 0.026, edge: "rgba(255,255,255,.08)" }
    },
    ghost: {
      light: { css: "rgba(159,188,214,.35)", lum: 0.180, edge: "rgba(255,255,255,.08)" },
      deep:  { css: "rgba(0,0,0,.35)",       lum: 0.011, edge: "rgba(255,255,255,.05)" }
    },
    off: null
  };

  function familyName() {
    try {
      var v = localStorage.getItem("nb.icoPlate");
      if (v && (FAMILY[v] || v === "off")) return v;
    } catch (e) {}
    return "slate";
  }

  var prefs = { mode: "contrast", threshold: 0.45, forced: {}, enabled: true };
  try {
    var raw = localStorage.getItem(PREFS);
    if (raw) {
      var p = JSON.parse(raw);
      if (p && typeof p === "object") {
        if (p.mode === "contrast" || p.mode === "threshold") prefs.mode = p.mode;
        if (typeof p.threshold === "number") prefs.threshold = p.threshold;
        if (p.forced && typeof p.forced === "object") prefs.forced = p.forced;
        if (typeof p.enabled === "boolean") prefs.enabled = p.enabled;
      }
    }
  } catch (e) {}

  function savePrefs() {
    try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch (e) {}
  }

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

  /* WCAG contrast ratio between two relative luminances. */
  function ratio(a, b) {
    var hi = a > b ? a : b, lo = a > b ? b : a;
    return (hi + 0.05) / (lo + 0.05);
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

  /* Returns { band, lightRatio, deepRatio } or null. */
  function decide(key) {
    var fam = FAMILY[familyName()];
    if (!fam) return null;                       /* family 'off' */

    var forced = prefs.forced[key];
    var m = measured[key];
    if (!m || typeof m.lum !== "number") {
      return forced ? { band: forced, lightRatio: null, deepRatio: null } : null;
    }

    var lr = ratio(m.lum, fam.light.lum);
    var dr = ratio(m.lum, fam.deep.lum);

    var band;
    if (forced === "light" || forced === "deep") band = forced;
    else if (prefs.mode === "threshold") band = m.lum < prefs.threshold ? "light" : "deep";
    else band = lr >= dr ? "light" : "deep";

    return {
      band: band,
      lightRatio: Math.round(lr * 100) / 100,
      deepRatio: Math.round(dr * 100) / 100
    };
  }

  /* Inline styles, deliberately. 122's plate rules live in a stylesheet
     and carry no !important, so an inline background simply wins, and
     122 keeps supplying the geometry — radius, padding, size, shadow. */
  function dress(el) {
    var key = el.getAttribute("data-nb-ico");
    if (!key) return false;
    var src = el.getAttribute("src") || "";
    if (!src) return false;

    if (!prefs.enabled || !FAMILY[familyName()]) {
      if (el.style.background) { el.style.background = ""; el.style.boxShadow = ""; }
      el.__nbPlateBand = null;
      return false;
    }

    if (!measured[key] || measured[key].src !== src) {
      measure(key, src, applySoon);
      return false;
    }

    var d = decide(key);
    if (!d) return false;

    if (el.__nbPlateBand === d.band && el.style.background) return false;

    var member = FAMILY[familyName()][d.band];
    el.style.background = member.css;
    el.style.boxShadow = "inset 0 0 0 1px " + member.edge + ", 0 1px 2px rgba(0,0,0,.34)";
    el.__nbPlateBand = d.band;
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

  function repaint() {
    var list = document.querySelectorAll("img[data-nb-ico]");
    for (var i = 0; i < list.length; i++) { list[i].__nbPlateBand = null; }
    return apply();
  }

  window.NBIconPlateAuto = {
    version: "4.77",
    refresh: repaint,
    contrast: function () {
      prefs.mode = "contrast"; savePrefs(); repaint();
      try { console.log("Plate chosen by measured contrast."); } catch (e) {}
      return "contrast";
    },
    threshold: function (v) {
      if (typeof v !== "number" || v <= 0 || v >= 1) {
        try {
          console.log("Mode is '" + prefs.mode + "'. Pass a number between 0 and 1 " +
                      "to switch to fixed-threshold mode, or call .contrast().");
        } catch (e) {}
        return prefs.threshold;
      }
      prefs.mode = "threshold"; prefs.threshold = v; savePrefs(); repaint();
      try { console.log("Fixed threshold " + v + " — darker than this gets a light plate."); } catch (e) {}
      return v;
    },
    setKey: function (key, band) {
      if (band === "auto" || band === null) { delete prefs.forced[key]; }
      else if (band === "light" || band === "deep") { prefs.forced[key] = band; }
      else {
        try { console.log("Band must be 'light', 'deep' or 'auto'."); } catch (e) {}
        return null;
      }
      savePrefs(); repaint();
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
    on: function () { prefs.enabled = true; savePrefs(); return repaint(); },
    recompute: function () { measured = {}; saveCache(); return repaint(); },
    report: function () {
      var fam = FAMILY[familyName()];
      var rows = [], light = 0, deep = 0, weak = [];
      Object.keys(measured).sort().forEach(function (k) {
        var d = decide(k) || {};
        if (d.band === "light") light++; else if (d.band === "deep") deep++;
        var won = d.band === "light" ? d.lightRatio : d.deepRatio;
        if (typeof won === "number" && won < 2.0) weak.push(k + " (" + won + ":1)");
        rows.push({
          icon: k,
          luminance: measured[k].lum,
          onLight: d.lightRatio,
          onDeep: d.deepRatio,
          plate: d.band || null,
          forced: prefs.forced[k] ? true : false
        });
      });
      var out = {
        version: "4.77",
        enabled: prefs.enabled,
        mode: prefs.mode,
        family: familyName(),
        plateLuminance: fam ? { light: fam.light.lum, deep: fam.deep.lum } : null,
        measuredIcons: rows.length,
        onLightPlate: light,
        onDeepPlate: deep,
        belowComfortable: weak.length ? weak : "none — every icon clears 2:1",
        icons: rows,
        tip: "onLight and onDeep are the contrast ratios the icon would achieve " +
             "on each plate; the larger one wins. Pin an exception with " +
             "NBIconPlateAuto.setKey('compass','deep')."
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try {
    console.log("[v4.77] plates chosen by measured contrast. NBIconPlateAuto.report()");
  } catch (e) {}
})();
