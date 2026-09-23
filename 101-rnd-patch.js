/* 101-rnd-patch.js — v4.56
   =====================================================================
   Two corrections to 100-rnd.js, both found by grepping art-core.js in
   CI (see .github/workflows/introspect.yml) rather than by guessing.

   1. THE LABEL NEVER CHANGED, AND COULDN'T HAVE
      100-rnd.js looked for a dock button [data-tab="industry"] and for
      window.DOCK_ITEMS. Neither exists in the live build:

        • the current renderDock() (art-core.js:5950) paints one button
          per DOCK_GROUP with data-group, not one per tab. The old
          per-tab dock at :1489 is dead code — which also means
          gateDock() in 40-v428-trucking.js has been a no-op for
          several versions, and 95-tidy.js's dock/ops rules with it.
        • "Industry Ops" is painted by subTabBar() (:5976) from
          DOCK_ITEMS — declared `const DOCK_ITEMS = [...]` at :1466.
          A top-level const is a lexical binding, NOT a property of
          window. Same trap that hid ART_IMG from 85-art-override.js.

      Indirect eval runs in global scope and can see those bindings, so
      that is how we reach the array and rename the item in place.

   2. THE EFFECTS POINTED AT FIELDS THAT DON'T EXIST
      There is no velocity field anywhere in the game. Product quality
      is c.product.maturity (0-100, art-core.js:8278) and, for market
      standing, c.v33.product (1-100, :16410). This reconciles every
      funded tier against those real fields, once each, and records
      what it did so a reload can't double-apply.

   Disabled by ?safe=1 or ?nornd=1. Diagnostics: NBRndPatch.report()
   ===================================================================== */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](safe|nornd)=1/.test(q)) return;
  if (window.__nbRndPatch456) return;
  window.__nbRndPatch456 = true;

  var LOG = [];
  function note(s) { LOG.push(s); if (LOG.length > 80) LOG.shift(); }
  function co() { try { return (window.G && window.G.company) || null; } catch (e) { return null; } }

  /* Reach a top-level const/let. Indirect eval evaluates in global
     scope, where the script-level lexical bindings live. */
  function lex(name) {
    try { return (0, eval)("typeof " + name + " !== 'undefined' ? " + name + " : null"); }
    catch (e) { return null; }
  }

  /* ---------------------------------------------------------------
     1. Rename the tab wherever the game actually reads the name
     --------------------------------------------------------------- */
  var LABEL_DONE = false;

  function opsReal() {
    try { if (typeof window.__nbUsesOpsReal === "function") return !!window.__nbUsesOpsReal(); } catch (e) {}
    return false;
  }

  function relabel() {
    if (LABEL_DONE) return;
    var items = lex("DOCK_ITEMS");
    if (!items || !items.length) return;
    var want = opsReal() ? "Ops & R&D" : "R&D";
    var hit = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i] && items[i].id === "industry") { hit = items[i]; break; }
    }
    if (!hit) return;
    if (hit.label !== want) {
      hit.label = want;
      if (!opsReal()) hit.icon = "\uD83E\uDDEA";
      note('DOCK_ITEMS "industry" relabelled to ' + want);
    }
    LABEL_DONE = true;
    /* repaint once so the sub-tab bar picks the new name up immediately */
    try { if (typeof window.renderDock === "function") window.renderDock(); } catch (e) {}
    try { if (typeof window.renderScreen === "function") window.renderScreen(); } catch (e) {}
  }

  /* ---------------------------------------------------------------
     2. Apply funded tiers to the fields that genuinely exist
     --------------------------------------------------------------- */
  var QUALITY_POINTS = { research: 4, reliability: 6, design: 8 };
  var SPEED_GAIN     = { pipeline: 0.10, autoqa: 0.15, platform: 0.25 };

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function reconcile() {
    var c = co();
    if (!c || !c.rnd || !c.rnd.owned) return;
    var st = c.rnd;
    if (!st.applied456 || typeof st.applied456 !== "object") st.applied456 = {};

    for (var key in st.owned) {
      if (!Object.prototype.hasOwnProperty.call(st.owned, key)) continue;
      if (!st.owned[key] || st.applied456[key]) continue;

      var did = [];

      if (QUALITY_POINTS[key] != null) {
        var pts = QUALITY_POINTS[key];
        try {
          if (!c.product || typeof c.product !== "object") c.product = { maturity: 5, features: [], inProgress: null, shipped: [] };
          if (typeof c.product.maturity === "number") {
            c.product.maturity = clamp(c.product.maturity + pts, 0, 100);
            did.push("product.maturity +" + pts);
          }
        } catch (e) {}
        try {
          if (c.v33 && typeof c.v33.product === "number") {
            c.v33.product = clamp(c.v33.product + Math.round(pts * 0.75), 1, 100);
            did.push("v33.product +" + Math.round(pts * 0.75));
          }
        } catch (e) {}
      }

      if (SPEED_GAIN[key] != null) {
        /* No velocity field exists in the build. What does exist is an
           in-progress feature; shorten whatever counts it down. */
        st.speed = (st.speed || 1) * (1 + SPEED_GAIN[key]);
        did.push("rnd.speed \u00d7" + (1 + SPEED_GAIN[key]).toFixed(2));
        try {
          var ip = c.product && c.product.inProgress;
          if (ip && typeof ip === "object") {
            var fields = ["monthsLeft", "remaining", "monthsRemaining", "months", "left"];
            for (var f = 0; f < fields.length; f++) {
              if (typeof ip[fields[f]] === "number" && ip[fields[f]] > 1) {
                ip[fields[f]] = ip[fields[f]] - 1;
                did.push("inProgress." + fields[f] + " -1");
                break;
              }
            }
          }
        } catch (e) {}
      }

      st.applied456[key] = did.length ? did.join(", ") : "no matching field";
      note("applied " + key + ": " + st.applied456[key]);
    }
  }

  /* ---------------------------------------------------------------
     3. Run
     --------------------------------------------------------------- */
  function tick() {
    try { relabel(); } catch (e) {}
    try { reconcile(); } catch (e) {}
  }

  tick();
  setTimeout(tick, 0);
  setTimeout(tick, 1200);
  try { document.addEventListener("DOMContentLoaded", tick); } catch (e) {}
  setInterval(tick, 1000);

  window.NBRndPatch = {
    version: "4.56",
    relabel: function () { LABEL_DONE = false; relabel(); return lex("DOCK_ITEMS"); },
    report: function () {
      var c = co();
      var items = lex("DOCK_ITEMS") || [];
      var ind = null;
      for (var i = 0; i < items.length; i++) if (items[i] && items[i].id === "industry") ind = items[i];
      var out = {
        version: "4.56",
        dockItemsReachable: !!items.length,
        industryItem: ind,
        maturity: c && c.product ? c.product.maturity : null,
        v33product: c && c.v33 ? c.v33.product : null,
        rnd: c ? c.rnd : null,
        actions: LOG.slice(-25)
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try { console.log("[v4.56] R&D patch armed — lexical DOCK_ITEMS relabel + real quality hooks."); } catch (e) {}
})();
