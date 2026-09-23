/* 114-retire-ultralight.js — v4.68

   Retires the Ultralight Aircraft outright. The entry lives inside
   art-core.js, which is too large to edit through the API, so it is
   spliced out of TOYS at load time instead. The dead TOY_ART.ultralight
   drawing stays in the bundle, unreferenced and harmless.

   Existing saves: any owned ultralight is dropped from the player's toy
   list so nothing renders against a catalogue entry that no longer
   exists. Its purchase price is not refunded — the asset simply leaves
   the books, the same as any other retired holding.

   Diagnostics: NBRetired.report(). Disable with ?keepultralight=1. */
(function () {
  "use strict";

  try {
    if (/[?&]keepultralight=1/.test(location.search)) return;
  } catch (e) {}

  var KEY = "ultralight";
  var state = { splicedFromCatalogue: false, removedFromSave: 0 };

  function splice() {
    if (typeof TOYS === "undefined" || !TOYS || !TOYS.length) return;
    for (var i = TOYS.length - 1; i >= 0; i--) {
      if (TOYS[i] && TOYS[i].key === KEY) {
        TOYS.splice(i, 1);
        state.splicedFromCatalogue = true;
      }
    }
  }

  function scrubSave() {
    try {
      if (typeof G === "undefined" || !G || !G.personal || !G.personal.assets) return;
      var owned = G.personal.assets.toys;
      if (!owned || !owned.length) return;
      for (var i = owned.length - 1; i >= 0; i--) {
        if (owned[i] && owned[i].key === KEY) {
          owned.splice(i, 1);
          state.removedFromSave++;
        }
      }
    } catch (e) {}
  }

  try { splice(); } catch (e) {
    try { console.warn("114-retire-ultralight: " + e.message); } catch (e2) {}
  }

  /* The save is loaded after the scripts run, so scrub again once the
     game is up, and on every focus in case a cloud save arrives late. */
  function later() { try { scrubSave(); } catch (e) {} }
  try {
    scrubSave();
    window.addEventListener("load", later);
    setTimeout(later, 1500);
    setTimeout(later, 5000);
  } catch (e) {}

  window.NBRetired = {
    version: "4.68",
    keys: [KEY],
    state: state,
    report: function () {
      try {
        console.log("114-retire-ultralight: catalogue spliced=" + state.splicedFromCatalogue +
                    ", owned copies removed=" + state.removedFromSave);
      } catch (e) {}
      return state;
    }
  };
})();
