/* 104-dock-shape.js — v4.60 "A Growth group that actually exists"
   =====================================================================
   WHAT THE v4.59 DIAGNOSTIC REVEALED
   ----------------------------------
   With 95-tidy.js finally able to see the lexical globals, a live
   trucking save reported the real dock:

     run      Decide      [decisions]
     hq       HQ          [financials, taxes, industry, product,
                           expansion, clients, people]
     rivals   Rivals      [rivals]
     bank     Bank        [bank]
     invest   Invest      [invest]
     log      Log         [log]
     life     Personal    [personal, life, empire, board, market]
     jarvis   F.E.L.I.P.E [assistant]
     miles    Milestones  [milestones]
     board2   Leaderboard [leaderboard]
     system   System      [saves]

   Two things follow immediately:

     1. There is NO group matching /growth/i. 95-tidy's first two dock
        rules both look for one, so even a working tidy layer could
        never have placed anything "in Growth". The brief's rule
        "markets in Growth ONLY" had no destination.
     2. "market" is sitting in the Personal group, between board and
        the life/empire entries — a market screen filed under the
        founder's private life.

   WHAT THIS FILE DOES
   -------------------
   Renames the existing "rivals" group to Growth and moves "market"
   into it, so market and rivals share one commercial home and Personal
   returns to personal matters.

   WHY THE GROUP ID STAYS "rivals"
   -------------------------------
   groupOfTab() is already wrapped by a later override that
   special-cases the rivals tab by id. Minting a fresh group id and
   deleting the old one would strand that override and break the dock
   highlight. Relabelling in place is the reversible choice: the id is
   an internal key, the label is what the player reads. Noted here
   loudly so the mismatch is never mistaken for an accident.

   WHAT THIS FILE DELIBERATELY DOES NOT DO
   ---------------------------------------
   It does not touch the "industry" item. Per 101-rnd-patch.js that
   slot is now the R&D screen — relabelled "R&D", or "Ops & R&D" where
   __nbUsesOpsReal() is true — so the old plan of making Industry Ops
   vanish in non-ops industries would now delete R&D from every
   software company. That rule needs Felipe's decision before anyone
   acts on it.

   Data only: no DOM is read or written, so none of the v4.43 flicker
   risk applies. Idempotent, and re-checks periodically so a new game
   in a different industry is shaped too.

   Disable with ?safe=1 or ?nodockshape=1. Diagnostics: NBDockShape.report()
   ===================================================================== */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](safe|nodockshape)=1/.test(q)) return;
  if (window.__nbDockShape460) return;
  window.__nbDockShape460 = true;

  var LOG = [];
  function note(s) { LOG.push(s); if (LOG.length > 60) LOG.shift(); }

  /* Top-level const/let bindings are not on window; indirect eval sees them. */
  function lex(name) {
    try {
      var w = window[name];
      if (w !== undefined && w !== null) return w;
    } catch (e) {}
    try { return (0, eval)("typeof " + name + " !== 'undefined' ? " + name + " : null"); }
    catch (e) { return null; }
  }

  function groups() { var g = lex("DOCK_GROUPS"); return (g && g.length) ? g : null; }
  function byId(id) {
    var gs = groups(); if (!gs) return null;
    for (var i = 0; i < gs.length; i++) if (gs[i] && gs[i].id === id) return gs[i];
    return null;
  }

  var LABEL = "Growth";
  var lastSig = "";

  function sig() {
    var gs = groups(); if (!gs) return "";
    var out = [];
    for (var i = 0; i < gs.length; i++) {
      if (!gs[i]) continue;
      out.push(gs[i].id + "=" + (gs[i].label || "") + ":" + (gs[i].items || []).join(","));
    }
    return out.join("|");
  }

  function apply() {
    var gs = groups(); if (!gs) return false;
    var now = sig();
    if (now === lastSig) return false;   /* nothing has moved since last pass */

    var changed = false;
    var growth = byId("rivals");
    var life = byId("life");

    if (growth) {
      if (growth.label !== LABEL) {
        growth.label = LABEL;
        changed = true;
        note('group "rivals" relabelled to ' + LABEL);
      }
      if (!growth.items) growth.items = [];
      if (growth.items.indexOf("market") < 0) {
        /* market first: the wider view before the head-to-head one */
        growth.items.unshift("market");
        changed = true;
        note('"market" placed in ' + LABEL);
      }
    }

    if (life && life.items) {
      var at = life.items.indexOf("market");
      while (at >= 0) {
        life.items.splice(at, 1);
        changed = true;
        note('"market" removed from Personal');
        at = life.items.indexOf("market");
      }
    }

    /* No item should appear in two groups. */
    var seen = {};
    for (var i = 0; i < gs.length; i++) {
      var g = gs[i]; if (!g || !g.items) continue;
      for (var j = g.items.length - 1; j >= 0; j--) {
        if (seen[g.items[j]]) {
          note('de-duped "' + g.items[j] + '" from "' + (g.id || g.label) + '"');
          g.items.splice(j, 1);
          changed = true;
        }
      }
      for (var k = 0; k < g.items.length; k++) seen[g.items[k]] = 1;
    }

    lastSig = sig();

    if (changed) {
      try { if (typeof window.renderDock === "function") window.renderDock(); } catch (e) {}
      try { if (typeof window.renderScreen === "function") window.renderScreen(); } catch (e) {}
    }
    return changed;
  }

  function tick() { try { apply(); } catch (e) {} }

  tick();
  setTimeout(tick, 0);
  setTimeout(tick, 1200);
  try { document.addEventListener("DOMContentLoaded", tick); } catch (e) {}
  setInterval(tick, 1000);

  window.NBDockShape = {
    version: "4.60",
    apply: function () { lastSig = ""; return apply(); },
    report: function () {
      var gs = groups() || [];
      var out = {
        version: "4.60",
        dockReachable: !!gs.length,
        dock: gs.map(function (g) {
          return { id: g.id, label: g.label, items: (g.items || []).slice() };
        }),
        actions: LOG.slice(-25)
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try { console.log("[v4.60] dock shape armed — Growth group, market rehoused."); } catch (e) {}
})();
