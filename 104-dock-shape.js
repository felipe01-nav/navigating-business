/* 104-dock-shape.js — v4.64 "Growth stays, market goes home"
   =====================================================================
   HISTORY, HONESTLY RECORDED
   --------------------------
   v4.60 did two things at once: it relabelled the "rivals" group to
   Growth, and it moved the "market" item out of Personal and into that
   group, on the reasoning that a market screen is commercial, not
   private.

   Felipe played it on 23 Sep and ruled against the second half:
   market belongs under Personal. The label change stands; the move is
   reverted. The original argument is left summarised above rather than
   quietly deleted, so nobody re-derives it in three months and moves
   the item back.

   WHAT THIS FILE NOW DOES
   -----------------------
     1. Relabels the existing group id "rivals" to "Growth".
     2. Ensures "market" sits in the "life" (Personal) group, and is
        NOT in the Growth group.
     3. De-dupes: no item may appear in two groups.

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
   It does not touch the "industry" item; 105-industry-slot.js owns
   that decision.

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

    /* 1. Label only. */
    if (growth && growth.label !== LABEL) {
      growth.label = LABEL;
      changed = true;
      note('group "rivals" relabelled to ' + LABEL);
    }

    /* 2. market out of Growth... */
    if (growth && growth.items) {
      var g_at = growth.items.indexOf("market");
      while (g_at >= 0) {
        growth.items.splice(g_at, 1);
        changed = true;
        note('"market" removed from ' + LABEL);
        g_at = growth.items.indexOf("market");
      }
    }

    /* ...and back into Personal, after "board" if that exists so the
       order reads personal -> life -> empire -> board -> market. */
    if (life) {
      if (!life.items) life.items = [];
      if (life.items.indexOf("market") < 0) {
        life.items.push("market");
        changed = true;
        note('"market" placed in Personal');
      }
    }

    /* 3. No item should appear in two groups. */
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
    version: "4.64",
    apply: function () { lastSig = ""; return apply(); },
    report: function () {
      var gs = groups() || [];
      var out = {
        version: "4.64",
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

  try { console.log("[v4.64] dock shape armed — Growth label kept, market back under Personal."); } catch (e) {}
})();
