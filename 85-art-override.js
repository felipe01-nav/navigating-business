/* =================================================================
   85-art-override.js — external art override
   -----------------------------------------------------------------
   The game ships its art as base64 data URIs inside art-core.js,
   art-merge.js and art-v47.js. This layer lets a plain WebP file on
   disk take precedence over the embedded copy, without touching the
   multi-megabyte art bundles.

   Lookup order per key:
     1. art/<file>      — the intended home
     2. <file>          — repo root, where the first batch was uploaded
     3. embedded base64 — untouched fallback if neither file exists

   A key is only overridden once its image has actually decoded, so a
   404 or a corrupt file can never blank out working art.

   To enable a new asset: add it to OVERRIDES. Do not add an asset that
   has not passed prompt review.
   ================================================================= */
(function () {
  "use strict";

  /* art key -> filename. Keys must match the keys already present in the
     embedded art maps; anything unrecognised is reported and skipped. */
  var OVERRIDES = {
    chateau:   "chateau.webp",
    family:    "family.webp",
    lakehouse: "lakehouse.webp",
    loft:      "loft.webp",
    mansion:   "mansion.webp",
    ranch:     "ranch.webp",
    suburban:  "suburban.webp"

    /* Held back pending regeneration — these fail their own prompt's
       STRICT EXCLUSIONS and must not ship:
         brownstone.webp — legible street signage, pedestrians, a taxi
         ski.webp        — translucent inset border
         studio.webp     — isometric cutaway on a flat background
    */
  };

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
      } catch (e) { /* cross-origin or undefined; ignore */ }
    }
    return out;
  }

  var applied = [];
  var missing = [];
  var unknown = [];

  function place(key, url) {
    var hit = false;
    var found = maps();
    for (var i = 0; i < found.length; i++) {
      if (Object.prototype.hasOwnProperty.call(found[i].map, key)) {
        try { found[i].map[key] = url; hit = true; } catch (e) {}
      }
    }
    if (hit) {
      applied.push(key + " -> " + url);
      /* Anything already painted needs a nudge; listeners are optional. */
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
  function resolve(key, file, index) {
    if (index >= BASES.length) {
      missing.push(file);
      return;
    }
    var url = BASES[index] + file;
    var probe = new Image();
    probe.onload = function () {
      if (probe.naturalWidth > 0) place(key, url);
      else resolve(key, file, index + 1);
    };
    probe.onerror = function () { resolve(key, file, index + 1); };
    probe.src = url;
  }

  function run() {
    var keys = Object.keys(OVERRIDES);
    for (var i = 0; i < keys.length; i++) resolve(keys[i], OVERRIDES[keys[i]], 0);

    /* Report once the probes have had time to settle. */
    setTimeout(function () {
      try {
        if (applied.length) console.log("[art-override] applied " + applied.length + "/" + keys.length + ":", applied);
        if (missing.length) console.warn("[art-override] no file found for:", missing);
        if (unknown.length) console.warn("[art-override] file loaded but key not present in any art map:", unknown);
        if (!applied.length && !missing.length && !unknown.length) console.log("[art-override] nothing to do");
      } catch (e) {}
    }, 3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
