/* 111-expansion-scope.js — v4.65 "Expansion is not a second Decide screen"
   =====================================================================
   WHAT FELIPE FOUND (23 Sep)
   --------------------------
   Sitting on Expansion \u2192 Growth, he was looking at a near-copy of the
   Decide tab: the F.E.L.I.P.E assistant, the forecast strip (projected
   revenue / projected burn / queued this month / ending cash), Founder
   Hustle, this month's plan, last month's report \u2014 and, at the very
   bottom, the workspace-stage card that the HQ sub-tab already owns.

   WHY 99-v454-ui.js DID NOT CATCH IT
   ----------------------------------
   Three reasons, all verified:
     1. Its Felipe-AI regex is /felipe\s*a\.?i\.?\b/ \u2014 the card is headed
        "F.E.L.I.P.E", dotted, which that pattern cannot match.
     2. It only ever examined ".card" nodes. The forecast strip is a
        ".v44-strip" written by 10-core-v40-v46.js and is not a card.
     3. It only cleaned the HQ sub-tab. The Decide duplicates are on the
        Growth sub-tab, which it deliberately skipped.
   v454 is left in place; it is a subset of this file and does no harm.

   WHAT THIS FILE DOES
   -------------------
   On the Expansion screen only, and only when nothing is focused:

     Growth sub-tab \u2014 hides Decide duplicates (assistant, forecast
       strip, founder hustle, this month's plan, last month's report)
       and the workspace/HQ stage card. Marketing and Markets stay:
       that is where Felipe wants them.

     HQ sub-tab \u2014 hides the same Decide duplicates, plus marketing and
       markets cards, which belong in Growth.

   It never touches the sub-tab bar, the HQ hero, the stage rail or the
   "where you could move next" card.

   TWO SMALL LABEL/LAYOUT CORRECTIONS, SAME FILE
   ---------------------------------------------
   \u2022 The sub-tab still reads "Facilities" while the screen it opens is
     titled "HQ". 90-hq-stages.js does rename stray "Facilities" text,
     but the sub-tab bar is built by 30-v410-v427.js AFTER that sweep
     runs, so it survives. Renamed here, every pass.
   \u2022 The HQ hero photo is a full 16:9 and forces a scroll before you
     can read anything. Capped here to a letterbox strip.
   \u2022 "The HQ ladder" heading becomes "HQ expansion", as requested.

   Disable with ?safe=1 or ?noexpscope=1. Diagnostics: NBExpScope.report()
   ===================================================================== */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](safe|noexpscope)=1/.test(q)) return;
  if (window.__nbExpScope465) return;
  window.__nbExpScope465 = true;

  var LOG = [];
  function note(s) { LOG.push(s); if (LOG.length > 80) LOG.shift(); }
  function ui() { try { return (window.G && window.G.ui) || {}; } catch (e) { return {}; } }

  /* "F.E.L.I.P.E", "FELIPE AI", "Felipe A.I." \u2014 all of it. */
  var ASSISTANT = /f\W*e\W*l\W*i\W*p\W*e(\W*a\W*i)?\b/i;
  var DECIDE = /founder hustle|this month'?s plan|month'?s plan|last month'?s report|month'?s report|decision queue|queued this month/i;
  var HQ_STUFF = /workspace|headquarters?|\bhq\b|facilit|office stage|move[- ]in|\bseats?\b/i;
  var GROWTH_STUFF = /marketing|campaign|channel|\bmarkets?\b|territor|rival|competitor|price tier|assortment|merchandis/i;
  /* Ours, or structural. Never hide these. */
  var KEEP = "[data-v454rail],[data-v440hq],[data-v442next],[data-v417sub],[data-v442hqtab],.window-title";

  function txt(n) {
    try { return (n && n.textContent ? n.textContent : "").replace(/\s+/g, " ").trim(); }
    catch (e) { return ""; }
  }
  function heading(n) {
    var h = n.querySelector ? n.querySelector("h1,h2,h3,h4") : null;
    return h ? txt(h) : txt(n).slice(0, 90);
  }
  function focused() {
    try {
      var a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
      if (a && a.isContentEditable) return true;
    } catch (e) {}
    return false;
  }
  function handsOff() {
    try { if (document.getElementById("nbGate")) return true; } catch (e) {}
    try {
      var ob = document.getElementById("onboard");
      if (ob && ob.childNodes.length && ob.style.display !== "none" && ob.offsetParent !== null) return true;
    } catch (e) {}
    return false;
  }
  function hide(n, why) {
    if (n.getAttribute("data-nbexp") === "hid") return;
    n.style.display = "none";
    n.setAttribute("data-nbexp", "hid");
    note(why);
  }

  /* ---------------------------------------------------------------
     Cosmetics: hero size, sub-tab name, ladder heading
     --------------------------------------------------------------- */
  try {
    if (!document.getElementById("nb-exp-scope-css")) {
      var st = document.createElement("style");
      st.id = "nb-exp-scope-css";
      st.textContent =
        /* The hero was a full 16:9 and pushed everything below the fold. */
        ".hq-hero .hq-hero-img,.hq-hero .hq-pending{aspect-ratio:auto !important;"
      + "height:min(26vh,190px) !important;object-fit:cover;}"
      + ".hq-hero .hq-hero-body{padding:11px 14px 13px !important;}"
      + ".hq-hero .hq-hero-body h2{font-size:17px !important;}"
      + ".hq-hero .hq-hero-body .blurb{margin-bottom:9px !important;font-size:12px !important;}"
      + "@media(max-width:780px){.hq-hero .hq-hero-img,.hq-hero .hq-pending{height:min(22vh,150px) !important;}}";
      document.head.appendChild(st);
    }
  } catch (e) {}

  function relabel() {
    try {
      var b = document.querySelector('[data-v417exp="facilities"]');
      if (b && !/HQ/.test(b.textContent || "")) {
        b.textContent = "\uD83C\uDFE2 HQ";
        note("sub-tab relabelled Facilities \u2192 HQ");
      }
      var h = document.querySelector("[data-v454rail] h3");
      if (h && /ladder/i.test(h.textContent || "")) {
        h.textContent = "\uD83C\uDFE2 HQ expansion";
        note('rail heading renamed to "HQ expansion"');
      }
    } catch (e) {}
  }

  /* ---------------------------------------------------------------
     The sweep
     --------------------------------------------------------------- */
  function sweep() {
    if (handsOff() || focused()) return;
    var u = ui();
    if (u.activeTab !== "expansion") return;
    var screen = document.getElementById("screen");
    if (!screen) return;

    relabel();

    var onHq = u.v417ExpSub === "facilities";
    var nodes = screen.querySelectorAll(".card, .v44-strip");

    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.getAttribute("data-nbexp") === "hid") continue;
      try { if (n.matches && n.matches(KEEP)) continue; } catch (e) {}
      /* anything living inside our own HQ furniture is off limits */
      try { if (n.closest && n.closest("[data-v454rail],[data-v440hq],[data-v442next]")) continue; } catch (e) {}

      var head = heading(n);
      var body = txt(n).slice(0, 200);

      /* 1. The forecast strip \u2014 Decide's four-cell KPI row. */
      var isStrip = false;
      try { isStrip = (n.classList && n.classList.contains("v44-strip")) || !!n.querySelector(".v44-strip"); } catch (e) {}
      if (isStrip) { hide(n, "forecast strip (Decide): " + head.slice(0, 40)); continue; }

      /* 2. The assistant. It has its own dock tab. */
      if (ASSISTANT.test(head) || ASSISTANT.test(body)) {
        hide(n, "assistant card (has its own tab): " + head.slice(0, 40));
        continue;
      }

      /* 3. Founder hustle, this month's plan, last month's report. */
      if (DECIDE.test(head)) { hide(n, "Decide duplicate: " + head.slice(0, 40)); continue; }

      /* 4. Placement by sub-tab. */
      if (!onHq) {
        /* Growth: HQ/workspace material belongs on the HQ sub-tab. */
        if (HQ_STUFF.test(head)) { hide(n, "HQ material on Growth: " + head.slice(0, 40)); continue; }
      } else {
        /* HQ: marketing and markets belong in Growth. */
        if (GROWTH_STUFF.test(head) && !HQ_STUFF.test(head)) {
          hide(n, "Growth material on HQ: " + head.slice(0, 40));
          continue;
        }
      }
    }
  }

  function tick() { try { sweep(); } catch (e) {} }

  tick();
  setTimeout(tick, 0);
  setTimeout(tick, 600);
  try { document.addEventListener("DOMContentLoaded", tick); } catch (e) {}
  setInterval(tick, 800);

  /* Immediately after a repaint, so the duplicates never linger a whole tick. */
  try {
    if (typeof window.renderAll === "function" && !window.renderAll.__nbExpScope) {
      var prev = window.renderAll;
      var wrapped = function () {
        var r = prev.apply(this, arguments);
        try { tick(); } catch (e) {}
        return r;
      };
      wrapped.__nbExpScope = true;
      window.renderAll = wrapped;
    }
  } catch (e) {}

  window.NBExpScope = {
    version: "4.65",
    sweep: function () { tick(); return LOG.slice(-20); },
    /* Every card on the Expansion screen, kept or hidden, so a wrong
       call is visible in one line rather than guessed at. */
    report: function () {
      var u = ui();
      var screen = document.getElementById("screen");
      var rows = [];
      if (screen) {
        screen.querySelectorAll(".card, .v44-strip").forEach(function (n) {
          rows.push({
            heading: heading(n).slice(0, 60),
            hidden: n.getAttribute("data-nbexp") === "hid" || n.style.display === "none"
          });
        });
      }
      var out = {
        version: "4.65",
        activeTab: u.activeTab,
        subTab: u.v417ExpSub,
        cards: rows,
        actions: LOG.slice(-25)
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try { console.log("[v4.65] expansion scope armed \u2014 Decide copy off Expansion."); } catch (e) {}
})();
