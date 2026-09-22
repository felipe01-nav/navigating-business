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

   ---- finding a map -------------------------------------------------
   ART_IMG and IMG are declared with const at the top level of their
   bundle. A top-level const is a global LEXICAL binding: it is visible
   to any code that names it, but it is NOT a property of window. Every
   earlier version of this file probed window[name] only, so the 78-key
   ART_IMG — which is to say very nearly all of the game's art — was
   invisible, and its keys were reported as though they did not exist.
   maps() therefore tries window first and falls back to an indirect
   Function lookup, which resolves against the global declarative
   record. Mutating the object works normally; we are changing a
   property of the object, not rebinding the const.

   ---- one key, one map ----------------------------------------------
   The same name can appear in more than one map: 'tower' is a mansion
   in ART_IMG and a retired facility in FAC_IMG. Writing to both put a
   luxury high-rise into the facilities UI. A key is applied to the
   first map in MAP_NAMES order that owns it, and any further owners are
   reported as shadowed.

   ---- aliases --------------------------------------------------------
   Bundles disagree about names. ART_IMG has 'starter'; the older IMG
   bundle calls the same house 'house_starter', and likewise
   house_family, house_mansion, car_sedan, car_sports, car_suv.
   Overriding one and not the other leaves half the UI on old art with
   nothing logged anywhere. After a key is applied, any map key matching
   /(^|_)key$/ that the manifest does not claim for itself receives the
   same file and is reported under aliased. Exact manifest entries
   always win; this only fills gaps.

   ---- declared keys --------------------------------------------------
   hq_0..hq_9 are published by 90-hq-stages.js and have no embedded art
   to override. Keys listed in window.HQ_STAGES are created in
   window.HQ_IMG, which that layer already reads as its last resort.

   On boot this logs a coverage report. The important line is
   "in manifest but not a real art key" — a filename matching neither a
   map key nor a declared key, which would otherwise fail silently.
   ================================================================= */
(function () {
  "use strict";

  var MANIFEST = "art/manifest.json";
  var BASES = ["art/", ""];

  /* Priority order. The first map owning a key is the one that gets it. */
  var MAP_NAMES = ["ART_IMG", "ART47", "ART_V47", "ARTMAP", "ART", "ARTS",
                   "IMAGES", "IMG", "FAC_IMG", "HQ_IMG"];

  /* Resolve a global lexical binding (top-level const/let), which never
     appears on window. Returns null for anything undeclared. */
  function lexical(name) {
    try {
      return (new Function("try { return " + name + "; } catch (e) { return null; }"))();
    } catch (e) { return null; }
  }

  function maps() {
    var out = [];
    for (var i = 0; i < MAP_NAMES.length; i++) {
      var m = null;
      try { m = window[MAP_NAMES[i]]; } catch (e) { m = null; }
      if (!m || typeof m !== "object") m = lexical(MAP_NAMES[i]);
      if (m && typeof m === "object") {
        out.push({ name: MAP_NAMES[i], map: m, onWindow: window[MAP_NAMES[i]] === m });
      }
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

  /* Keys a layer has declared but shipped no embedded art for. */
  var declaredCache = null;
  function declared() {
    if (declaredCache) return declaredCache;
    var out = {};
    try {
      var stages = window.HQ_STAGES || lexical("HQ_STAGES") || [];
      for (var i = 0; i < stages.length; i++) {
        if (stages[i] && stages[i].key) out[stages[i].key] = true;
      }
    } catch (e) {}
    declaredCache = out;
    return out;
  }

  var claimed = {};    /* every key the manifest names, for alias safety */
  var applied = [];    /* key -> url, actually swapped in */
  var aliased = [];    /* prefixed variant of an applied key, filled in */
  var created = [];    /* declared key, published into HQ_IMG */
  var shadowed = [];   /* key also present in a lower-priority map, left alone */
  var missing = [];    /* manifest entry with no file at any base path */
  var unknown = [];    /* file exists, but the key is not a real art key */

  function announce(key, url, where) {
    try {
      window.dispatchEvent(new CustomEvent("nb:art-override", {
        detail: { key: key, url: url, map: where }
      }));
    } catch (e) {}
  }

  /* Fill in bundle-specific spellings of a key we just applied. */
  function applyAliases(key, url) {
    var suffix = new RegExp("(^|_)" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$");
    var found = maps();
    for (var i = 0; i < found.length; i++) {
      for (var k in found[i].map) {
        if (!Object.prototype.hasOwnProperty.call(found[i].map, k)) continue;
        if (k === key || claimed[k]) continue;      /* exact entries win */
        if (!suffix.test(k)) continue;
        try {
          found[i].map[k] = url;
          aliased.push(k + " ← " + key + " (" + found[i].name + ")");
          announce(k, url, found[i].name + " (alias of " + key + ")");
        } catch (e) {}
      }
    }
  }

  function place(key, url) {
    var found = maps();
    var owners = [];
    for (var i = 0; i < found.length; i++) {
      if (Object.prototype.hasOwnProperty.call(found[i].map, key)) owners.push(found[i]);
    }

    if (owners.length) {
      var target = owners[0];
      try { target.map[key] = url; } catch (e) {
        unknown.push(key + " (" + target.name + " not writable)");
        return;
      }
      applied.push(key);
      for (var j = 1; j < owners.length; j++) {
        shadowed.push(key + ": applied to " + target.name + ", also present in " + owners[j].name);
      }
      announce(key, url, target.name);
      applyAliases(key, url);
      return;
    }

    if (declared()[key]) {
      try {
        if (!window.HQ_IMG || typeof window.HQ_IMG !== "object") window.HQ_IMG = {};
        window.HQ_IMG[key] = url;
        applied.push(key);
        created.push(key);
        announce(key, url, "HQ_IMG (created)");
        return;
      } catch (e) { /* fall through to unknown */ }
    }

    unknown.push(key);
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

  /* A layer that rendered before the manifest resolved is showing stale
     or placeholder art. Nudge one repaint, but never while the sign-in
     gate or the onboarding form owns the screen. */
  function repaint() {
    try {
      if (document.getElementById("nbGate")) return;
      var ob = document.getElementById("onboard");
      if (ob && ob.childNodes.length && ob.style.display !== "none" && ob.offsetParent !== null) return;
      if (typeof window.renderAll === "function") window.renderAll();
    } catch (e) {}
  }

  function report(manifest, total) {
    var gameKeys = allGameKeys();
    var overridden = {};
    var i;
    for (i = 0; i < applied.length; i++) overridden[applied[i]] = true;
    for (i = 0; i < aliased.length; i++) overridden[aliased[i].split(" ")[0]] = true;

    var embedded = [];
    for (var k in gameKeys) {
      if (Object.prototype.hasOwnProperty.call(gameKeys, k) && !overridden[k]) embedded.push(k);
    }
    embedded.sort();

    var held = manifest.held ? Object.keys(manifest.held) : [];
    var defects = manifest.accepted_with_defects
      ? Object.keys(manifest.accepted_with_defects).filter(function (n) { return n !== "_comment"; })
      : [];
    var where = maps().map(function (m) {
      return m.name + " (" + Object.keys(m.map).length + " keys, " +
             (m.onWindow ? "window" : "lexical") + ")";
    });

    try {
      console.groupCollapsed("[art-override] " + applied.length + "/" + total +
                             " manifest assets live, " + aliased.length + " aliased — " +
                             embedded.length + " game keys still embedded");
      console.log("maps found:", where);
      console.log("overridden:", applied.slice().sort());
      if (aliased.length)  console.log("alias spellings also filled:", aliased.slice().sort());
      if (created.length)  console.log("published for layer-declared keys (no embedded art):", created.slice().sort());
      if (shadowed.length) console.log("name collisions, lower-priority map left untouched:", shadowed);
      if (missing.length)  console.warn("in manifest but no file found:", missing);
      if (unknown.length)  console.error("in manifest but NOT a real art key (check the filename):", unknown);
      if (defects.length)  console.warn("shipped with known prompt violations:", defects);
      if (held.length)     console.log("held back by review:", held);
      console.log("still using embedded base64:", embedded);
      console.groupEnd();
    } catch (e) {}

    /* Expose for ad-hoc inspection: NB_ART_COVERAGE in the console. */
    try {
      window.NB_ART_COVERAGE = {
        maps: where,
        applied: applied.slice().sort(),
        aliased: aliased.slice().sort(),
        created: created.slice().sort(),
        shadowed: shadowed.slice(),
        missing: missing.slice(),
        unknown: unknown.slice(),
        acceptedWithDefects: defects,
        held: held,
        embedded: embedded
      };
    } catch (e) {}

    if (applied.length || aliased.length) repaint();
  }

  function apply(manifest) {
    var assets = (manifest && manifest.assets) || {};
    var keys = Object.keys(assets);
    var total = keys.length;
    var i;
    for (i = 0; i < total; i++) claimed[keys[i]] = true;
    if (!total) { report(manifest, 0); return; }

    var remaining = total;
    function done() {
      remaining -= 1;
      if (remaining === 0) report(manifest, total);
    }
    for (i = 0; i < total; i++) resolve(keys[i], assets[keys[i]], 0, done);
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
