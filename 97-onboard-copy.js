/* 97-onboard-copy.js — v4.52
   Retires the pre-account recovery instructions.

   Two messages in 20-v47-v49.js still tell the player to "open the copy you
   were playing, go to Save Games -> Copy save code". That was correct when
   saves lived in browser storage and every embed was its own island. Since
   the account gate and Continue were repaired (v4.44, v4.45, v4.46) the
   right instruction is: sign in with the same player code and press
   Continue. The save code remains, but as a fallback.

   Route 1 rewrites the source of any global function carrying the stale
   sentences. Route 2 is a narrow DOM fallback for renderers hidden inside a
   closure. Route 2 is deliberately timid — v4.43 taught us what an eager
   DOM layer does to this game.

   Disabled by ?safe=1 or ?nocopyfix=1. */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](safe|nocopyfix)=1/.test(q)) {
    try { console.log("[v4.52] Onboarding copy layer disabled by flag."); } catch (e) {}
    return;
  }

  var NEW_PRIMARY =
    "Sign in with the same player code you used before and press " +
    "<b>Continue</b> \u2014 your runs live on your account, not in this browser. " +
    "If you no longer have that code, paste a save code below instead.";

  /* Each rule: a pattern that matches the stale sentence inside a single
     string literal, and its replacement. Kept loose in the middle so the
     escape style used in the source does not matter. */
  var RULES = [
    {
      name: "open-that-copy",
      re: /Open that copy, use[\s\S]{0,120}?then paste the code here\./,
      to: NEW_PRIMARY
    },
    {
      name: "bring-a-run-over",
      re: /To bring a run over, open the copy you were playing, go to[\s\S]{0,140}?then paste that code below\./,
      to: NEW_PRIMARY
    }
  ];

  /* ---- Route 1: rewrite global functions ---- */

  var patched = [];
  var failed = [];

  function looksStale(src) {
    return src.indexOf("Copy save code") !== -1 &&
           (src.indexOf("Open that copy") !== -1 || src.indexOf("To bring a run over") !== -1);
  }

  function attempt(name) {
    var fn;
    try { fn = window[name]; } catch (e) { return; }
    if (typeof fn !== "function") return;

    var src;
    try { src = Function.prototype.toString.call(fn); } catch (e) { return; }
    if (!src || !looksStale(src)) return;

    var out = src;
    var hits = [];
    for (var i = 0; i < RULES.length; i++) {
      if (RULES[i].re.test(out)) {
        out = out.replace(RULES[i].re, RULES[i].to);
        hits.push(RULES[i].name);
      }
    }
    if (!hits.length) return;

    var rebuilt;
    try {
      rebuilt = (new Function("return (" + out + ");"))();
    } catch (e) {
      failed.push(name + " (" + (e && e.message ? e.message : "parse error") + ")");
      return;
    }
    if (typeof rebuilt !== "function") {
      failed.push(name + " (rewrite did not produce a function)");
      return;
    }
    try {
      window[name] = rebuilt;
      patched.push(name + " [" + hits.join(",") + "]");
    } catch (e) {
      failed.push(name + " (not writable)");
    }
  }

  try {
    var names = Object.getOwnPropertyNames(window);
    for (var i = 0; i < names.length; i++) {
      var n = names[i];
      if (n === "window" || n === "self" || n === "top" || n === "parent" || n === "frames") continue;
      attempt(n);
    }
  } catch (e) {}

  /* ---- Route 2: narrow DOM fallback ---- */

  /* Plain-text forms, as they appear once rendered. */
  var DOM_RULES = [
    /Open that copy, use\s*Save Games\s*\u2192?\s*Copy save code\s*,?\s*then paste the code here\./i,
    /To bring a run over, open the copy you were playing, go to\s*Save Games\s*\u2192?\s*Copy save code\s*,?\s*then paste that code below\./i
  ];

  var DOM_HTML_RULES = [
    /Open that copy, use[\s\S]{0,160}?then paste the code here\./i,
    /To bring a run over, open the copy you were playing, go to[\s\S]{0,180}?then paste that code below\./i
  ];

  var domFixes = 0;

  function gateOrStartVisible() {
    try {
      if (document.getElementById("nbGate")) return true;
      var ob = document.getElementById("onboard");
      if (ob && ob.innerHTML && ob.innerHTML.length) return true;
    } catch (e) {}
    return false;
  }

  function domPass() {
    if (!gateOrStartVisible()) return;
    var nodes;
    try { nodes = document.querySelectorAll("#nbGate div, #onboard div, #app div"); }
    catch (e) { return; }

    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      /* Leaf-ish only: never rewrite a container holding form fields. */
      if (el.querySelector && el.querySelector("input, textarea, select, button")) continue;
      var txt = el.textContent || "";
      if (txt.indexOf("Copy save code") === -1) continue;

      var matched = false;
      for (var r = 0; r < DOM_RULES.length; r++) {
        if (DOM_RULES[r].test(txt)) { matched = true; break; }
      }
      if (!matched) continue;

      var html = el.innerHTML;
      var out = html;
      for (var h = 0; h < DOM_HTML_RULES.length; h++) {
        out = out.replace(DOM_HTML_RULES[h], NEW_PRIMARY);
      }
      if (out !== html) {
        el.innerHTML = out;
        domFixes++;
      }
    }
  }

  /* On boot, once again after the gate has had time to render, and on click.
     No observer, no interval. */
  function safePass() { try { domPass(); } catch (e) {} }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safePass);
  } else {
    safePass();
  }
  setTimeout(safePass, 1200);
  setTimeout(safePass, 3000);
  try { document.addEventListener("click", function () { setTimeout(safePass, 120); }, true); } catch (e) {}

  window.NBCopyFix = {
    report: function () {
      return {
        version: "4.52",
        patchedFunctions: patched,
        failures: failed,
        domRewrites: domFixes,
        newText: NEW_PRIMARY
      };
    },
    run: function () { safePass(); return domFixes; }
  };

  try {
    if (patched.length) {
      console.log("[v4.52] Onboarding copy updated in: " + patched.join(", ") + ".");
    } else {
      console.log("[v4.52] Onboarding copy: no global function carried the stale text; " +
                  "DOM fallback is armed. NBCopyFix.report() for detail.");
    }
    if (failed.length) console.warn("[v4.52] Onboarding copy rewrite skipped: " + failed.join("; "));
  } catch (e) {}
})();
