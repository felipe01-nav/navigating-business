/* 117-icons-sheet1-files.js — v4.73
   =====================================================================
   WHY THIS FILE EXISTS
   --------------------
   Sheet 1 (compass, people, box, crane, house, robot, save, bank, chart,
   bag, factory, handshake) was inlined into 113-icons.js as base64, back
   when binaries could not be pushed through the file API. Two mistakes
   were baked into that payload:

     1. The ink was recoloured #1B2A41 -> #9FBCD6 so it would read on the
        dark rail. That is right for an icon drawn as bare linework, and
        quite wrong for one with a large pale fill: on the compass it
        turned navy tick marks into pale blue ON a near-white dial, and
        the detail collapsed. Measured on the shipped art, the dial's
        internal contrast spans about 46 levels of luminance where the
        original spans roughly 215. It reads as frosted over, because in
        effect it is.
     2. It was encoded at 48 px, quality 58, to keep the base64 small.

   Sheets 3-6 went in as plain art/*.webp files with no recolour at all,
   and those are the ones that look right. This layer lets sheet 1 follow
   them: for each of the twelve keys it probes art/<key>.webp (then .png),
   and where a file exists it is used in preference to the base64. No file,
   no change — the old payload simply stays. So the twelve images can be
   dropped into art/ whenever convenient, with no further code.

   Off with ?nosheet1files=1, ?noicons=1 or ?safe=1.
   Diagnostics: NBIcons1Files.report()
   ===================================================================== */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](nosheet1files|noicons|safe)=1/.test(q)) return;
  if (window.__nbSheet1Files473) return;
  window.__nbSheet1Files473 = true;

  var KEYS = ["compass", "people", "box", "crane", "house", "robot",
              "save", "bank", "chart", "bag", "factory", "handshake"];
  var EXT = [".webp", ".png"];

  /* key -> resolved file path, once a probe has succeeded. */
  var found = {};
  var probed = 0, swaps = 0;

  function probe(key, i) {
    if (i >= EXT.length) { probed++; return; }
    var url = "art/" + key + EXT[i];
    var img = new Image();
    img.onload = function () {
      if (img.naturalWidth > 0) { found[key] = url; probed++; sweepSoon(); }
      else probe(key, i + 1);
    };
    img.onerror = function () { probe(key, i + 1); };
    img.src = url;
  }

  /* Rewrite any already-rendered <img data-nb-ico="key"> that is still
     pointing at a data: URI. Cheap: one querySelectorAll, no parsing. */
  function sweep() {
    var n = 0, list;
    try { list = document.querySelectorAll('img[data-nb-ico]'); }
    catch (e) { return 0; }
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      var key = el.getAttribute("data-nb-ico");
      var file = found[key];
      if (!file) continue;
      var src = el.getAttribute("src") || "";
      if (src === file) continue;
      if (src.indexOf("data:") !== 0) continue;   /* leave art/ files alone */
      el.setAttribute("src", file);
      n++;
    }
    swaps += n;
    return n;
  }

  /* And rewrite the dock arrays at source, so a re-render does not undo
     the swap. The icon strings are HTML written by NBIcons.tag(). */
  function lex(name) {
    try { return (0, eval)("typeof " + name + " !== 'undefined' ? " + name + " : null"); }
    catch (e) { return null; }
  }

  function retagString(s) {
    if (typeof s !== "string" || s.indexOf("data-nb-ico=") === -1) return null;
    if (s.indexOf("src=\"data:") === -1 && s.indexOf("src='data:") === -1) return null;
    var m = s.match(/data-nb-ico="([^"]+)"/);
    if (!m || !found[m[1]]) return null;
    return s.replace(/src="data:[^"]*"/, 'src="' + found[m[1]] + '"')
            .replace(/src='data:[^']*'/, "src='" + found[m[1]] + "'");
  }

  function retagArrays() {
    var n = 0;
    ["DOCK_GROUPS", "DOCK_ITEMS"].forEach(function (name) {
      var coll = lex(name);
      if (!coll || Object.prototype.toString.call(coll) !== "[object Array]") return;
      for (var i = 0; i < coll.length; i++) {
        var e = coll[i];
        if (!e) continue;
        var next = retagString(e.icon);
        if (next) { e.icon = next; n++; }
      }
    });
    if (n) {
      try { if (typeof window.renderDock === "function") window.renderDock(); } catch (e) {}
    }
    return n;
  }

  var pending = null;
  function sweepSoon() {
    if (pending) return;
    pending = setTimeout(function () { pending = null; run(); }, 100);
  }

  function run() {
    var n = 0;
    try { n += retagArrays(); n += sweep(); } catch (e) {}
    return n;
  }

  KEYS.forEach(function (k) { probe(k, 0); });

  setTimeout(run, 600);
  setTimeout(run, 2000);
  /* Other layers repaint the dock on their own timers; keep pace cheaply. */
  setInterval(run, 1500);

  window.NBIcons1Files = {
    version: "4.73",
    keys: KEYS,
    apply: run,
    report: function () {
      var have = [], missing = [];
      KEYS.forEach(function (k) { (found[k] ? have : missing).push(k); });
      var out = {
        version: "4.73",
        probesFinished: probed,
        usingFiles: have,
        stillBase64: missing,
        imgSrcSwaps: swaps,
        hint: "Drop <key>.webp into art/ to replace a base64 icon. " +
              "Original colours, no recolour — the dark rail wants the " +
              "artwork's own light fills, not pale-blue linework."
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try {
    console.log("[v4.73] sheet-1 icons will prefer art/ files where present. NBIcons1Files.report()");
  } catch (e) {}
})();
