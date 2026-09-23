/* 112-kpi-scope.js — v4.66 "Company KPIs belong on company screens"
   =====================================================================
   THE COMPLAINT
   -------------
   Felipe, on Personal \u2192 Market vs Owned (the personal catalogue of homes,
   cars, aircraft and so on): the screen was topped by the quarterly-tax
   banner, the cash warning, and the four-cell company forecast strip
   (projected revenue / projected burn / queued this month / ending cash
   \u00b7 runway / taxes in burn). None of it has anything to do with buying a
   house with personal money.

   WHERE IT COMES FROM
   -------------------
   \u2022 10-core-v40-v46.js builds the forecast box: ".v44-banner" for each
     warning and ".v44-strip" for the four cells.
   \u2022 40-v428-trucking.js finds that strip and appends a "Taxes in burn"
     cell plus the quarterly-tax banner above it.
   Neither asks which screen it is on, so the box rides along everywhere.

   THE RULE THIS FILE IMPOSES
   --------------------------
   The forecast box appears on the company screens where it is actually
   actionable \u2014 Decide and Financials \u2014 and nowhere else. Personal, My
   Life, Empire, Board, Market vs Owned, Bank, Log, Milestones,
   Leaderboard and System are all left clean.

   It hides rather than removes, so nothing downstream that expects to
   find the node (40-v428 appends to it) can throw.

   To widen or narrow the rule, edit ALLOW below \u2014 it is the only
   decision in the file.

   Disable with ?safe=1 or ?nokpiscope=1. Diagnostics: NBKpiScope.report()
   ===================================================================== */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](safe|nokpiscope)=1/.test(q)) return;
  if (window.__nbKpiScope466) return;
  window.__nbKpiScope466 = true;

  /* The only screens where a company cash forecast is useful. */
  var ALLOW = { decisions: 1, decide: 1, run: 1, dashboard: 1, financials: 1 };

  var SEL = ".v44-banner, .v44-strip";
  var LOG = [];
  function note(s) { LOG.push(s); if (LOG.length > 60) LOG.shift(); }
  function ui() { try { return (window.G && window.G.ui) || {}; } catch (e) { return {}; } }
  function tab() { return String(ui().activeTab || ""); }

  function handsOff() {
    try { if (document.getElementById("nbGate")) return true; } catch (e) {}
    try {
      var ob = document.getElementById("onboard");
      if (ob && ob.childNodes.length && ob.style.display !== "none" && ob.offsetParent !== null) return true;
    } catch (e) {}
    return false;
  }

  function sweep() {
    if (handsOff()) return;
    var screen = document.getElementById("screen");
    if (!screen) return;
    var t = tab();
    var allowed = !!ALLOW[t];

    var nodes = screen.querySelectorAll(SEL);
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (allowed) {
        /* Only ever un-hide what we hid ourselves. */
        if (n.getAttribute("data-nbkpi") === "hid") {
          n.style.display = "";
          n.removeAttribute("data-nbkpi");
        }
      } else if (n.getAttribute("data-nbkpi") !== "hid") {
        n.style.display = "none";
        n.setAttribute("data-nbkpi", "hid");
        note("hid " + (n.className || "?") + ' on tab "' + t + '"');
      }
    }
  }

  function tick() { try { sweep(); } catch (e) {} }

  tick();
  setTimeout(tick, 0);
  setTimeout(tick, 500);
  try { document.addEventListener("DOMContentLoaded", tick); } catch (e) {}
  setInterval(tick, 700);

  /* Straight after a repaint, so the strip never flashes on a personal screen. */
  try {
    if (typeof window.renderAll === "function" && !window.renderAll.__nbKpiScope) {
      var prev = window.renderAll;
      var wrapped = function () {
        var r = prev.apply(this, arguments);
        try { tick(); } catch (e) {}
        return r;
      };
      wrapped.__nbKpiScope = true;
      window.renderAll = wrapped;
    }
  } catch (e) {}

  window.NBKpiScope = {
    version: "4.66",
    allowedTabs: Object.keys(ALLOW),
    sweep: function () { tick(); return LOG.slice(-15); },
    report: function () {
      var screen = document.getElementById("screen");
      var nodes = screen ? screen.querySelectorAll(SEL) : [];
      var out = {
        version: "4.66",
        activeTab: tab(),
        allowedHere: !!ALLOW[tab()],
        forecastNodesOnScreen: nodes.length,
        hidden: Array.prototype.filter.call(nodes, function (n) {
          return n.getAttribute("data-nbkpi") === "hid";
        }).length,
        actions: LOG.slice(-20)
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try { console.log("[v4.66] KPI scope armed \u2014 forecast box limited to Decide and Financials."); } catch (e) {}
})();
