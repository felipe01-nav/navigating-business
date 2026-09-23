/* 106-industry-advice.js — v4.62
   Fixes the F.E.L.I.P.E advisor answering "How do I grow faster?" with the
   literal word "undefined" in trucking, nail salon and agency.

   Why it happens: art-core's assistantAnswer() builds the growth answer from a
   FUNCTION-LOCAL object literal (art-core.js:4776-4782) that covers only the
   five original industries. Any later-added industry indexes to undefined and
   the sentence renders "your fastest lever in undefined is to undefined."
   The literal is unreachable from outside the function, so recompiling or
   wrapping are the only options. Wrapping is far cheaper and cannot break the
   other nine answer branches.

   Strategy: let the original answer run, then detect its growth answer by its
   own signature phrase and rebuild it. Detecting the OUTPUT rather than the
   QUESTION means we inherit the original's branch precedence exactly — no risk
   of hijacking a funding or hiring question that happens to contain "revenue".

   Bonus fix: the original used industry().name, which is not a field on any
   INDUSTRIES entry (they carry .label). Every industry was therefore already
   saying "your fastest lever in undefined". This corrects all nine.

   Disable with ?noadvice=1
*/
(function () {
  "use strict";

  var ERR = [];
  var LAST = { patched: 0, undefinedSeen: 0, wrapped: false };

  /* Top-level const/let are lexical and NOT on window. Indirect eval reads
     them from the global lexical scope. This trap has silently disabled
     several earlier layers in this project; do not "simplify" it. */
  function glob(n) {
    try { return (0, eval)("typeof " + n + "!=='undefined'?" + n + ":null"); }
    catch (e) { return null; }
  }
  function flag(k) {
    try { return new URLSearchParams(location.search).has(k); } catch (e) { return false; }
  }

  if (flag("noadvice")) {
    window.NBAdvice = { disabled: true, report: function () { return { disabled: true }; } };
    return;
  }

  /* The five originals are reproduced verbatim so nothing regresses. */
  var PLAYS = {
    ai_saas: "pair a sales rung with a shipped feature \u2014 pipeline plus product beats either alone",
    retail: "open another store format and push the price tier up a notch once demand holds",
    restaurant: "add a location, but only after quality is above 60 \u2014 bad inspections are expensive",
    robotics: "finish the R&D program in flight, then add production capacity to clear backlog",
    finance: "raise deposits first, then lend up to ~80% of them at balanced underwriting",

    trucking: "seat every tractor you already own before buying another \u2014 an empty truck still costs you a payment and insurance \u2014 then court a direct shipper to lift your rate per mile",
    nail_salon: "fill the chairs you already have before adding more \u2014 call your regulars, then move the service menu up a tier once you are turning walk-ins away",
    agency: "turn your best result into a published case study, then pitch two accounts a tier above your current book \u2014 retainers compound, project work does not"
  };

  /* Anything added later still gets a sane sentence instead of "undefined". */
  var GENERIC = "put the next dollar behind whatever is already paying \u2014 add capacity where you are turning work away, and raise your price tier once demand holds";

  function money(n) {
    try { if (typeof fmt$ === "function") return fmt$(n); } catch (e) {}
    return "$" + Math.round(Number(n) || 0).toLocaleString();
  }

  function industryLabel(key) {
    try {
      var cfg = (typeof industry === "function") ? industry() : null;
      if (cfg && (cfg.label || cfg.name)) return cfg.label || cfg.name;
    } catch (e) {}
    var IND = glob("INDUSTRIES");
    if (IND && IND[key] && (IND[key].label || IND[key].name)) return IND[key].label || IND[key].name;
    return String(key || "your industry").replace(/_/g, " ");
  }

  function rebuild() {
    var G = glob("G");
    if (!G || !G.company) return null;
    var c = G.company;

    var rev = 0;
    try { if (typeof monthlyRevenue === "function") rev = monthlyRevenue(c) || 0; } catch (e) {}

    var ind = c.industry || "ai_saas";
    var play = PLAYS[ind] || GENERIC;
    var reinvest = (c.cash > rev * 4)
      ? "you're sitting on cash, deploy it"
      : "fund it with the credit line rather than stalling";

    return "At " + money(Math.round(rev)) + "/mo, your fastest lever in " +
      industryLabel(ind) + " is to " + play + ".<br>Then reinvest: " + reinvest + ".";
  }

  var prev = window.assistantAnswer;
  if (typeof prev !== "function") {
    ERR.push("assistantAnswer is not a global function \u2014 nothing wrapped");
  } else {
    window.assistantAnswer = function (question) {
      var out = prev.apply(this, arguments);
      try {
        if (typeof out === "string" && out.indexOf("fastest lever in") >= 0) {
          var fixed = rebuild();
          if (fixed) { LAST.patched++; return fixed; }
        }
        if (typeof out === "string" && out.indexOf("undefined") >= 0) {
          LAST.undefinedSeen++;
          ERR.push('answer still contains "undefined" for: ' + String(question).slice(0, 60));
        }
      } catch (e) {
        ERR.push("wrapper: " + (e && e.message));
      }
      return out;
    };
    LAST.wrapped = true;
  }

  window.NBAdvice = {
    version: "4.62",
    plays: PLAYS,
    /* Paste NBAdvice.report() into the console to see what this layer did. */
    report: function () {
      var G = glob("G");
      var ind = (G && G.company && G.company.industry) || null;
      return {
        wrapped: LAST.wrapped,
        industry: ind,
        industryLabel: industryLabel(ind),
        hasPlay: !!(ind && PLAYS[ind]),
        growthAnswer: rebuild(),
        answersPatched: LAST.patched,
        stillUndefined: LAST.undefinedSeen,
        errors: ERR.slice()
      };
    }
  };
})();
