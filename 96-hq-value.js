/* 96-hq-value.js — v4.51 (v4.54 hardening)
   Values HQ on the real ten-stage ladder.

   The bug: v23AssetStatement contains a function-local constant

     const hqValue = [0,8000,33000,93000][Math.min(3, c.hqStage||0)] || 0;

   which is the cumulative cost of the retired three-step workspace ladder
   (8k / 25k / 60k). The HQ ladder has had ten stages since v4.40, so
   anything above stage 3 was booked at a flat $93,000 no matter what was
   actually paid — millions short at the top of the ladder.

   Because the constant is function-local it is invisible to code search,
   and the host function is a large template-literal renderer that is not
   worth retyping. So this layer rewrites the expression in place: it scans
   global functions for that exact table indexed by hqStage and recompiles
   each match with a call to NBHQValue.

   v4.54 — the recompile is no longer a one-way door. new Function() builds
   in global scope, so a rewritten function loses any closure it relied on,
   and that failure surfaces when the function is CALLED, not when it is
   rewritten — which means `failures` stayed empty while a tab died. We now
   keep the original and install a wrapper that falls back to it if the
   rebuilt version throws. Worst case the figure is the old one; the screen
   still renders.

   Disabled by ?safe=1 or ?nohqvalue=1. */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](safe|nohqvalue)=1/.test(q)) {
    try { console.log("[v4.51] HQ valuation layer disabled by flag."); } catch (e) {}
    return;
  }

  /* Cost to move INTO each stage, used if HQ_STAGES is unavailable.
     Index 0 is the garage and is free. */
  var LEGACY_COSTS = [0, 8000, 25000, 60000];

  function ladder() {
    try {
      if (typeof HQ_STAGES !== "undefined" && HQ_STAGES && HQ_STAGES.length) return HQ_STAGES;
    } catch (e) {}
    return null;
  }

  /* Everything paid to reach the current stage. Cumulative, because each
     move is a fresh purchase rather than a trade-in. */
  function cumulativeCost(stage) {
    var s = Math.max(0, stage | 0);
    var L = ladder();
    var total = 0;
    var i;
    if (L) {
      for (i = 1; i <= Math.min(s, L.length - 1); i++) {
        total += Number(L[i] && L[i].cost) || 0;
      }
      return total;
    }
    for (i = 1; i <= Math.min(s, LEGACY_COSTS.length - 1); i++) {
      total += LEGACY_COSTS[i];
    }
    return total;
  }

  function company(c) {
    if (c && typeof c === "object") return c;
    try { return (window.G && G.company) || {}; } catch (e) { return {}; }
  }

  /* The greater of what the ladder says it costs and whatever the game has
     actually recorded as invested.

     v4.54: 90-hq-stages.js records the move-in price as hqPaidTotal (running
     total) and hqPaid (the last move). The original list here — hqInvested,
     hqTotalInvested, hqSpend, hq.invested — matched nothing this build ever
     writes, so the recorded branch was dead and every save fell through to
     the ladder sum. That over-bills any save where migrate() folded old
     facilities into a higher stage without a payment ever happening, so the
     recorded figure now wins outright when one exists. */
  function hqValue(c) {
    c = company(c);
    var recorded = 0;
    try {
      recorded = Number(c.hqPaidTotal || c.hqInvested || c.hqTotalInvested || c.hqSpend ||
                        (c.hq && (c.hq.invested || c.hq.totalInvested))) || 0;
    } catch (e) { recorded = 0; }
    if (recorded > 0) return Math.max(0, Math.round(recorded));
    return Math.max(0, Math.round(cumulativeCost(c.hqStage | 0)));
  }

  window.NBHQValue = hqValue;

  /* ---- rewrite the legacy table wherever it appears ---- */

  /* Matches [0,8000,33000,93000][Math.min(3, <ident>.hqStage||0)] with any
     amount of whitespace, capturing the company identifier. */
  var PATTERN = /\[\s*0\s*,\s*8000\s*,\s*33000\s*,\s*93000\s*\]\s*\[\s*Math\.min\(\s*3\s*,\s*([A-Za-z_$][\w$]*)\.hqStage\s*\|\|\s*0\s*\)\s*\]/g;

  var patched = [];
  var failed = [];
  var fellBack = [];

  function attempt(name) {
    var fn;
    try { fn = window[name]; } catch (e) { return; }
    if (typeof fn !== "function") return;

    var src;
    try { src = Function.prototype.toString.call(fn); } catch (e) { return; }
    if (!src || src.indexOf("33000") === -1) return;

    PATTERN.lastIndex = 0;
    if (!PATTERN.test(src)) return;
    PATTERN.lastIndex = 0;

    var rewritten = src.replace(PATTERN, "window.NBHQValue($1)");

    var rebuilt;
    try {
      /* Wrapped in parentheses so a declaration is read as an expression.
         If it does not parse, we keep the original and say so. */
      rebuilt = (new Function("return (" + rewritten + ");"))();
    } catch (e) {
      failed.push(name + " (" + (e && e.message ? e.message : "parse error") + ")");
      return;
    }

    if (typeof rebuilt !== "function") {
      failed.push(name + " (rewrite did not produce a function)");
      return;
    }

    /* The safety net. A recompiled function runs in global scope, so any
       closure the original captured is gone — and that only shows up when
       it runs. If it throws, use the original and carry on. */
    var safe = function () {
      try {
        return rebuilt.apply(this, arguments);
      } catch (err) {
        if (fellBack.indexOf(name) < 0) {
          fellBack.push(name);
          try {
            console.warn("[v4.54] " + name + " threw after the HQ value rewrite (" +
                         ((err && err.message) || err) + "). Using the original.");
          } catch (e2) {}
        }
        return fn.apply(this, arguments);
      }
    };
    try { safe.toString = function () { return rewritten; }; } catch (e) {}

    try {
      window[name] = safe;
      patched.push(name);
    } catch (e) {
      failed.push(name + " (not writable)");
    }
  }

  function sweep() {
    var names;
    try { names = Object.getOwnPropertyNames(window); } catch (e) { return; }
    for (var i = 0; i < names.length; i++) {
      var n = names[i];
      /* Skip the obvious host objects; we only want game code. */
      if (n === "window" || n === "self" || n === "top" || n === "parent" || n === "frames") continue;
      attempt(n);
    }
  }

  sweep();

  window.NBHQValue.report = function () {
    var c = company(null);
    var L = ladder();
    return {
      version: "4.54",
      patchedFunctions: patched,
      fellBackToOriginal: fellBack,
      failures: failed,
      ladderStages: L ? L.length : "HQ_STAGES unavailable (legacy fallback in use)",
      currentStage: (c && (c.hqStage | 0)) || 0,
      recordedSpend: Number(c && c.hqPaidTotal) || 0,
      ladderWouldSay: cumulativeCost((c && c.hqStage) | 0),
      currentHqValue: hqValue(c),
      legacyWouldHaveSaid: [0, 8000, 33000, 93000][Math.min(3, (c && c.hqStage) | 0)] || 0
    };
  };

  try {
    if (patched.length) {
      console.log("[v4.54] HQ valuation corrected in: " + patched.join(", ") +
                  ". NBHQValue.report() for detail.");
    } else {
      console.log("[v4.54] HQ valuation layer found no legacy table to rewrite. " +
                  "NBHQValue(company) is available regardless.");
    }
    if (failed.length) console.warn("[v4.54] HQ valuation rewrite skipped: " + failed.join("; "));
  } catch (e) {}
})();
