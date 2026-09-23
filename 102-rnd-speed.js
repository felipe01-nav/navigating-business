/* 102-rnd-speed.js — v4.57
   =====================================================================
   Makes the R&D "Shipping speed" track do something real.

   HOW FEATURES ACTUALLY BUILD (art-core.js:8320-8362, found by CI grep)
   ---------------------------------------------------------------------
   G.company.product.active is a list of { key, monthsLeft }. Every
   month close, resolvePlannedFeature(report) walks it, checks the
   project is staffed against rungCount("product","rep") and team
   leads, decrements monthsLeft by exactly one, and ships the feature
   when it reaches zero — applying maturity, client health and pricing
   power at that moment. There is no speed variable to multiply.

   THE HOOK
   --------
   So speed is bought as extra decrements. Each month we bank
   (multiplier - 1) months of progress; whenever the bank reaches a
   whole month, one active project gets an extra monthsLeft--. We do
   this BEFORE calling the original function, and never take a project
   below 1, so the core still performs the final decrement and all the
   shipping side effects exactly as it normally would. Nothing is
   duplicated and no reward is granted by this file.

     pipeline  ×1.10   -> a month of extra progress every 10 months
     + autoqa  ×1.265  -> roughly one every 4
     + platform ×1.58  -> roughly one every 2

   The bank persists on company.rnd.progressBank, so part-months are
   not lost across saves.

   Disabled by ?safe=1 or ?nornd=1. Diagnostics: NBRndSpeed.report()
   ===================================================================== */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](safe|nornd)=1/.test(q)) return;
  if (window.__nbRndSpeed457) return;
  window.__nbRndSpeed457 = true;

  var LOG = [];
  function note(s) { LOG.push(s); if (LOG.length > 60) LOG.shift(); }
  function co() { try { return (window.G && window.G.company) || null; } catch (e) { return null; } }

  var SPEED_GAIN = { pipeline: 0.10, autoqa: 0.15, platform: 0.25 };

  function multiplier() {
    var c = co();
    if (!c || !c.rnd || !c.rnd.owned) return 1;
    var m = 1;
    for (var k in SPEED_GAIN) {
      if (!Object.prototype.hasOwnProperty.call(SPEED_GAIN, k)) continue;
      if (c.rnd.owned[k]) m *= (1 + SPEED_GAIN[k]);
    }
    return m;
  }

  /* Projects nearest completion first: finishing something beats
     spreading a part-month across everything in flight. */
  function candidates() {
    var c = co();
    var p = c && c.product;
    var list = (p && p.active) || [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      if (a && typeof a.monthsLeft === "number" && a.monthsLeft > 1) out.push(a);
    }
    out.sort(function (x, y) { return x.monthsLeft - y.monthsLeft; });
    return out;
  }

  function nameOf(key) {
    try {
      var defs = (0, eval)("typeof FEATURE_DEFS !== 'undefined' ? FEATURE_DEFS : null");
      if (defs) {
        for (var i = 0; i < defs.length; i++) if (defs[i] && defs[i].key === key) return defs[i].name;
      }
    } catch (e) {}
    return key;
  }

  function spendBank(report) {
    var c = co();
    if (!c) return;
    var m = multiplier();
    if (m <= 1) return;
    if (!c.rnd || typeof c.rnd !== "object") return;

    var bank = Number(c.rnd.progressBank);
    if (!isFinite(bank) || bank < 0) bank = 0;
    bank += (m - 1);

    var guard = 0;
    while (bank >= 1 && guard < 10) {
      guard++;
      var list = candidates();
      if (!list.length) break;
      var a = list[0];
      a.monthsLeft -= 1;
      bank -= 1;
      var line = "\uD83E\uDDEA R&D pulled " + nameOf(a.key) + " forward a month \u2014 " +
                 a.monthsLeft + " month(s) left.";
      note(line);
      try { if (report && report.push) report.push(line); } catch (e) {}
    }

    /* Don't let an unspendable bank grow without limit while nothing
       is in flight; two months of credit is plenty to carry. */
    c.rnd.progressBank = Math.min(bank, 2);
  }

  var wrapped = false;
  function wrap() {
    if (wrapped) return;
    var prev;
    try { prev = window.resolvePlannedFeature; } catch (e) { return; }
    if (typeof prev !== "function" || prev.__nbSpeed) return;
    var fn = function (report) {
      try { spendBank(report); } catch (e) {}
      return prev.apply(this, arguments);
    };
    fn.__nbSpeed = true;
    try { window.resolvePlannedFeature = fn; wrapped = true; note("wrapped resolvePlannedFeature"); } catch (e) {}
  }

  wrap();
  setTimeout(wrap, 0);
  setTimeout(wrap, 1500);
  try { document.addEventListener("DOMContentLoaded", wrap); } catch (e) {}
  setInterval(wrap, 2000);

  window.NBRndSpeed = {
    version: "4.57",
    multiplier: multiplier,
    report: function () {
      var c = co();
      var out = {
        version: "4.57",
        wrappedResolvePlannedFeature: wrapped,
        multiplier: multiplier(),
        progressBank: c && c.rnd ? c.rnd.progressBank : null,
        active: c && c.product ? c.product.active : null,
        actions: LOG.slice(-20)
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try { console.log("[v4.57] R&D speed track wired into the feature build loop."); } catch (e) {}
})();
