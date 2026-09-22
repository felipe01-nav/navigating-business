/* =================================================================
   85-art-override.js — external art override + coverage audit
   -----------------------------------------------------------------
   The game ships its art as base64 data URIs inside art-core.js,
   art-merge.js and art-v47.js. This layer lets a plain WebP file on
   disk take precedence over the embedded copy, without touching the
   multi-megabyte art bundles.

   art/manifest.json is the single source of truth. To ship a new
   asset, add it to that file — no JavaScript change required.

   Lookup order per key:
     1. art/<file>      — the intended home
     2. <file>          — repo root, legacy location
     3. embedded base64 — untouched fallback if neither file exists

   A key is only overridden once its image has actually decoded, so a
   404 or a corrupt file can never blank out working art.

   On boot this logs a coverage report. The important line is
   "in manifest but not a real art key" — that means a filename in the
   manifest does not match any key the game actually uses, which would
   otherwise fail silently.
   ================================================================= */
(function () {
  "use strict";

  var MANIFEST = "art/manifest.json";
  var BASES = ["art/", ""];

  /* Every global the art bundles are known to publish. 90-hq-stages.js
     probes a similar list; keep them in sync if a new map appears. */
  var MAP_NAMES = ["ART_IMG", "FAC_IMG", "ART", "ARTS", "IMAGES", "IMG",
                   "ART47", "ART_V47", "ARTMAP", "HQ_IMG"];

  function maps() {
    var out = [];
    for (var i = 0; i < MAP_NAMES.length; i++) {
      try {
        var m = window[MAP_NAMES[i]];
        if (m && typeof m === "object") out.push({ name: MAP_NAMES[i], map: m });
      } catch (e) { /* undefined; ignore */ }
    }
    return out;
  }

  /* Union of every art key the game actually knows about. */
  function allGameKeys() {
    var seen = {};
    var found = maps();
    for (var i = 0; i < found.length; i++) {
      for (var k in found[i].map) {
        if (Object.prototype.hasOwnProperty.call(found[i].map, k)) seen[k] = true;
      }
    }
    return seen;
  }

  var applied = [];   /* key -> url, actually swapped in */
  var missing = [];   /* manifest entry with no file at any base path */
  var unknown = [];   /* file exists, but the key is not a real art key */

  function place(key, url) {
    var hit = false;
    var found = maps();
    for (var i = 0; i < found.length; i++) {
      if (Object.prototype.hasOwnProperty.call(found[i].map, key)) {
        try { found[i].map[key] = url; hit = true; } catch (e) {}
      }
    }
    if (hit) {
      applied.push(key);
      try {
        window.dispatchEvent(new CustomEvent("nb:art-override", {
          detail: { key: key, url: url }
        }));
      } catch (e) {}
    } else {
      unknown.push(key);
    }
  }

  /* Try each base path in order; first one that decodes wins. */
  function resolve(key, file, index, done) {
    if (index >= BASES.length) {
      missing.push(key + " (" + file + ")");
      done();
      return;
    }
    var url = BASES[index] + file;
    var probe = new Image();
    probe.onload = function () {
      if (probe.naturalWidth > 0) { place(key, url); done(); }
      else resolve(key, file, index + 1, done);
    };
    probe.onerror = function () { resolve(key, file, index + 1, done); };
    probe.src = url;
  }

  function report(manifest, total) {
    var gameKeys = allGameKeys();
    var overridden = {};
    for (var i = 0; i < applied.length; i++) overridden[applied[i]] = true;

    var embedded = [];
    for (var k in gameKeys) {
      if (Object.prototype.hasOwnProperty.call(gameKeys, k) && !overridden[k]) embedded.push(k);
    }
    embedded.sort();

    var held = manifest.held ? Object.keys(manifest.held) : [];

    try {
      console.groupCollapsed("[art-override] " + applied.length + "/" + total +
                             " manifest assets live — " + embedded.length +
                             " game keys still embedded");
      console.log("overridden:", applied.slice().sort());
      if (missing.length) console.warn("in manifest but no file found:", missing);
      if (unknown.length) console.error("in manifest but NOT a real art key (check the filename):", unknown);
      if (held.length)    console.log("held back by review:", held);
      console.log("still using embedded base64:", embedded);
      console.groupEnd();
    } catch (e) {}

    /* Expose for ad-hoc inspection: NB_ART_COVERAGE in the console. */
    try {
      window.NB_ART_COVERAGE = {
        applied: applied.slice().sort(),
        missing: missing.slice(),
        unknown: unknown.slice(),
        held: held,
        embedded: embedded
      };
    } catch (e) {}
  }

  function apply(manifest) {
    var assets = (manifest && manifest.assets) || {};
    var keys = Object.keys(assets);
    var total = keys.length;
    if (!total) { report(manifest, 0); return; }

    var remaining = total;
    function done() {
      remaining -= 1;
      if (remaining === 0) report(manifest, total);
    }
    for (var i = 0; i < total; i++) resolve(keys[i], assets[keys[i]], 0, done);
  }

  function run() {
    var url = MANIFEST + "?v=" + (window.NB_BUILD || Date.now());
    fetch(url, { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(apply)
      .catch(function (err) {
        try { console.warn("[art-override] could not load " + MANIFEST + ":", err.message,
                           "— the game will run on embedded art."); } catch (e) {}
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
