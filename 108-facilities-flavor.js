/* 108-facilities-flavor.js — v4.62
   Industry-flavoured facilities.

   art-core's FACILITIES (art-core.js:8267) is industry-blind: every business
   from a nail salon to a freight carrier builds an "Office Annex", a
   "Corporate Campus" and a "Headquarters Tower". A trucking company does not
   build an office annex; it opens a yard.

   facilitiesSection() (:8291) maps FACILITIES at RENDER time and the buy
   handler keys off f.key, so renaming entries in place is safe and needs no
   changes to purchasing, rent, seats or saved data.

   Deliberately cosmetic: cost, rent, cap and key are untouched on every tier,
   so this is balance-neutral. Flavour first, economy later — retuning seat
   counts per industry is a separate decision.

   Disable with ?nofacflavor=1
*/
(function () {
  "use strict";

  var ERR = [];
  var BASE = null;          // original names, captured once
  var LAST = { applied: null, applies: 0 };

  function glob(n) {
    try { return (0, eval)("typeof " + n + "!=='undefined'?" + n + ":null"); }
    catch (e) { return null; }
  }
  function flag(k) {
    try { return new URLSearchParams(location.search).has(k); } catch (e) { return false; }
  }

  if (flag("nofacflavor")) {
    window.NBFacFlavor = { disabled: true, report: function () { return { disabled: true }; } };
    return;
  }

  /* Index order matches FACILITIES: annex, campus, tower, global. */
  var FLAVOR = {
    trucking: [
      { name: "Satellite Yard", icon: "\u{1F6E3}\uFE0F" },
      { name: "Regional Terminal", icon: "\u{1F69B}" },
      { name: "Fleet Headquarters", icon: "\u{1F3E2}" },
      { name: "National Terminal Network", icon: "\u{1F30D}" }
    ],
    nail_salon: [
      { name: "Second Studio", icon: "\u{1F485}" },
      { name: "Flagship Salon", icon: "\u2728" },
      { name: "Salon Group Head Office", icon: "\u{1F3E2}" },
      { name: "National Salon Network", icon: "\u{1F30D}" }
    ],
    agency: [
      { name: "Studio Annex", icon: "\u{1F3A8}" },
      { name: "Creative Campus", icon: "\u{1F3DB}\uFE0F" },
      { name: "Agency Tower", icon: "\u{1F3EC}" },
      { name: "Global Agency Network", icon: "\u{1F30D}" }
    ],
    retail: [
      { name: "Stockroom Annex", icon: "\u{1F4E6}" },
      { name: "Regional Distribution Center", icon: "\u{1F3EA}" },
      { name: "Retail Support Center", icon: "\u{1F3EC}" },
      { name: "National Logistics Network", icon: "\u{1F30D}" }
    ],
    restaurant: [
      { name: "Prep Kitchen", icon: "\u{1F373}" },
      { name: "Central Commissary", icon: "\u{1F35D}" },
      { name: "Restaurant Group Head Office", icon: "\u{1F3EC}" },
      { name: "Global Commissary Network", icon: "\u{1F30D}" }
    ],
    robotics: [
      { name: "Engineering Annex", icon: "\u{1F527}" },
      { name: "Manufacturing Campus", icon: "\u{1F3ED}" },
      { name: "Robotics Headquarters", icon: "\u{1F3EC}" },
      { name: "Global Plant Network", icon: "\u{1F30D}" }
    ],
    finance: [
      { name: "Branch Annex", icon: "\u{1F3E6}" },
      { name: "Operations Campus", icon: "\u{1F3DB}\uFE0F" },
      { name: "Headquarters Tower", icon: "\u{1F3EC}" },
      { name: "Global Branch Network", icon: "\u{1F30D}" }
    ]
    /* ai_saas intentionally absent — the original office names already fit. */
  };

  function co() { var G = glob("G"); return (G && G.company) || null; }

  function apply() {
    var F = glob("FACILITIES");
    if (!Array.isArray(F) || !F.length) { ERR.push("FACILITIES unreachable"); return false; }

    if (!BASE) {
      BASE = F.map(function (f) { return { name: f.name, icon: f.icon }; });
    }

    var c = co();
    var ind = (c && c.industry) || "ai_saas";
    var set = FLAVOR[ind];

    F.forEach(function (f, i) {
      var src = (set && set[i]) || BASE[i];
      if (!src) return;
      if (f.name !== src.name) f.name = src.name;
      if (f.icon !== src.icon) f.icon = src.icon;
    });

    LAST.applied = ind;
    LAST.applies++;
    return true;
  }

  var prevSection = window.facilitiesSection;
  if (typeof prevSection !== "function") {
    ERR.push("facilitiesSection is not a global function \u2014 nothing wrapped");
  } else {
    window.facilitiesSection = function () {
      try { apply(); } catch (e) { ERR.push("apply: " + (e && e.message)); }
      return prevSection.apply(this, arguments);
    };
  }

  /* The Facilities tab reads FACILITIES via facilitiesSection, but the HQ
     screen renders its own summary first; apply once at boot as well. */
  try { apply(); } catch (e) { ERR.push("boot apply: " + (e && e.message)); }

  window.NBFacFlavor = {
    version: "4.62",
    /* Paste NBFacFlavor.report() into the console. */
    report: function () {
      var F = glob("FACILITIES") || [];
      var c = co();
      return {
        wrapped: typeof prevSection === "function",
        industry: c && c.industry,
        flavoured: !!(c && FLAVOR[c.industry]),
        appliedFor: LAST.applied,
        applies: LAST.applies,
        tiers: F.map(function (f) {
          return { key: f.key, name: f.name, icon: f.icon, cost: f.cost, rent: f.rent, cap: f.cap };
        }),
        owned: ((c && c.facilities) || []).map(function (f) { return f.name; }),
        errors: ERR.slice()
      };
    }
  };
})();
