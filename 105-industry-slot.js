/* 105-industry-slot.js — v4.61  "one slot, two tenants, by industry"
   =====================================================================
   FELIPE'S RULING (22 Sep 2026)
     trucking, nail salon, restaurant, robotics, finance → Industry Ops
     ai_saas                                            → R&D

   THE CONFLICT THIS RESOLVES
   --------------------------
   100/101/103 put R&D into the "industry" slot for EVERY industry:
   103-rnd-mount.js ticks on activeTab === "industry" alone and forces
   NBRnd.mount() regardless of what business is being run, and
   101-rnd-patch.js labels the item "R&D", or "Ops & R&D" where
   __nbUsesOpsReal() is true. So a trucking company got R&D — or a
   double-barrelled label — where it should simply have Industry Ops.

   POLICY
   ------
   An explicit per-industry map, because the brief is an explicit list
   and should not be re-derived from a helper that may drift:

     ai_saas     → rnd
     trucking    → ops      nail_salon → ops
     restaurant  → ops      robotics   → ops
     finance     → ops
     retail      → ops      agency     → ops   (judgement — see below)

   retail and agency were not named in the ruling. Both are
   delivery-led businesses with no research programme to speak of, so
   they follow the majority and take Industry Ops. Unknown or future
   industries fall back to __nbUsesOpsReal(): ops if the game says the
   industry genuinely has operations, R&D otherwise. Flagged for
   Felipe's review.

   HOW THE SUPPRESSION WORKS
   -------------------------
   In ops mode we wrap NBRnd.mount() to a no-op. 103-rnd-mount.js then
   finds no [data-nbrnd] node and would paint its "could not mount"
   diagnostic strip at the player, which would be worse than the
   disease — so we leave a hidden sentinel <div data-nbrnd="suppressed">
   in #screen. 103 reads that as a successful mount, clears its
   diagnostic and holds its peace. Any R&D panel that slips through by
   another path is removed on the same pass.

   The label is re-asserted every tick. 101 sets its label once and
   latches (LABEL_DONE), so there is no tug-of-war.

   CONSEQUENCE WORTH KNOWING
   -------------------------
   In an ops industry the R&D screen becomes unreachable. Any tier
   already bought in such a save stays bought — c.rnd is untouched and
   101's reconcile still applies its effects — but no further purchase
   can be made there. If R&D should remain available to ops industries
   as a second sub-tab, that is a separate build.

   Disable with ?safe=1 or ?noslot=1. Diagnostics: NBSlot.report()
   ===================================================================== */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](safe|noslot)=1/.test(q)) return;
  if (window.__nbSlot461) return;
  window.__nbSlot461 = true;

  var POLICY = {
    ai_saas: "rnd",
    trucking: "ops",
    nail_salon: "ops",
    restaurant: "ops",
    robotics: "ops",
    finance: "ops",
    retail: "ops",
    agency: "ops"
  };

  var LABELS = { ops: "Industry Ops", rnd: "R&D" };
  var ICONS  = { ops: "\uD83C\uDFED", rnd: "\uD83E\uDDEA" };

  var LOG = [];
  function note(s) { LOG.push(s); if (LOG.length > 60) LOG.shift(); }

  function lex(name) {
    try {
      var w = window[name];
      if (w !== undefined && w !== null) return w;
    } catch (e) {}
    try { return (0, eval)("typeof " + name + " !== 'undefined' ? " + name + " : null"); }
    catch (e) { return null; }
  }

  function co() { try { var g = lex("G"); return (g && g.company) || null; } catch (e) { return null; } }
  function tab() { try { var g = lex("G"); return (g && g.ui) ? g.ui.activeTab : null; } catch (e) { return null; } }
  function screenEl() { return document.getElementById("screen"); }

  function industryKey() {
    var c = co();
    return (c && c.industry) ? String(c.industry) : "";
  }

  function mode() {
    var k = industryKey();
    if (!k) return null;                       /* no company yet: decide nothing */
    if (POLICY[k]) return POLICY[k];
    /* Unknown industry: trust the game's own ops test. */
    try {
      if (typeof window.__nbUsesOpsReal === "function") return window.__nbUsesOpsReal() ? "ops" : "rnd";
    } catch (e) {}
    return "ops";
  }

  /* ---------------------------------------------------------------
     1. Label the slot for the industry being played
     --------------------------------------------------------------- */
  var lastLabel = "";

  function relabel(m) {
    var items = lex("DOCK_ITEMS");
    if (!items || !items.length) return;
    var want = LABELS[m];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || it.id !== "industry") continue;
      if (it.label !== want) {
        it.label = want;
        it.icon = ICONS[m];
        lastLabel = want;
        note("slot labelled " + want + " for " + (industryKey() || "?"));
        try { if (typeof window.renderDock === "function") window.renderDock(); } catch (e) {}
      }
      return;
    }
  }

  /* ---------------------------------------------------------------
     2. Keep R&D out of an ops industry, quietly
     --------------------------------------------------------------- */
  var wrapped = false;
  var suppressions = 0;

  function wrapMount() {
    if (wrapped) return;
    try {
      var rnd = window.NBRnd;
      if (!rnd || typeof rnd.mount !== "function" || rnd.mount.__nbSlot461) return;
      var prev = rnd.mount;
      var fn = function () {
        if (mode() === "ops") { suppressions++; return undefined; }
        return prev.apply(this, arguments);
      };
      fn.__nbSlot461 = true;
      rnd.mount = fn;
      wrapped = true;
      note("NBRnd.mount wrapped");
    } catch (e) {}
  }

  function sentinel(s) {
    var el = s.querySelector('[data-nbrnd="suppressed"]');
    if (el) return;
    try {
      el = document.createElement("div");
      el.setAttribute("data-nbrnd", "suppressed");
      el.style.display = "none";
      s.appendChild(el);
    } catch (e) {}
  }

  function stripRnd(s) {
    /* Anything the R&D layers painted here by another route. */
    var nodes = s.querySelectorAll('[data-nbrnd]:not([data-nbrnd="suppressed"]),[data-nbrnd-diag]');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      try { if (n.parentNode) { n.parentNode.removeChild(n); note("removed an R&D panel from an ops industry"); } } catch (e) {}
    }
  }

  function tick() {
    var m = mode();
    if (!m) return;
    wrapMount();
    relabel(m);

    if (m !== "ops") return;
    if (tab() !== "industry") return;
    var s = screenEl();
    if (!s) return;
    stripRnd(s);
    sentinel(s);
  }

  function safeTick() { try { tick(); } catch (e) {} }

  /* Run straight after every repaint, with a slow timer as the brace. */
  (function wrapRender() {
    try {
      var prev = window.renderScreen;
      if (typeof prev === "function" && !prev.__nbSlot461) {
        var fn = function () {
          var out = prev.apply(this, arguments);
          safeTick();
          return out;
        };
        fn.__nbSlot461 = true;
        window.renderScreen = fn;
      }
    } catch (e) {}
  })();

  safeTick();
  setTimeout(safeTick, 0);
  setTimeout(safeTick, 600);
  setTimeout(safeTick, 2000);
  setInterval(safeTick, 900);

  window.NBSlot = {
    version: "4.61",
    policy: POLICY,
    mode: mode,
    report: function () {
      var items = lex("DOCK_ITEMS") || [];
      var ind = null;
      for (var i = 0; i < items.length; i++) if (items[i] && items[i].id === "industry") ind = items[i];
      var out = {
        version: "4.61",
        industry: industryKey(),
        mode: mode(),
        fromPolicyTable: !!POLICY[industryKey()],
        slotItem: ind,
        mountWrapped: wrapped,
        mountsSuppressed: suppressions,
        activeTab: tab(),
        rndOnScreen: !!document.querySelector('[data-nbrnd]:not([data-nbrnd="suppressed"])'),
        actions: LOG.slice(-25)
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try { console.log("[v4.61] industry slot policy armed — NBSlot.report() for detail."); } catch (e) {}
})();
