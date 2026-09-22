/* 99-v454-ui.js — v4.54
   =====================================================================
   Two placement corrections, both layered on top rather than surgery on
   the files that own the renders.

   1. THE HQ LADDER IS ONE THING, NOT TWO
      90-hq-stages.js renders "Where you could move next" (three cards)
      and then "The whole ladder" (ten text rows) — the same information
      twice, in two shapes. This replaces both with a single horizontally
      scrolling rail showing all ten stages with their art, and parks the
      "Queue this move" button on the one stage you can actually buy.
      The rail scrolls itself to where you are when the tab opens.

   2. EXPANSION IS FOR EXPANSION
      Felipe AI has its own dock tab and does not belong on the Expansion
      screen at all. Marketing and Markets belong in Growth; 95-tidy.js
      already pins their DOCK entries there, but its card sweep skips any
      card containing a form control — and marketing cards are all
      sliders and selects, which is exactly why they kept showing up on
      the HQ sub-tab. We hide them there too, and only while nothing is
      focused, so nobody loses a field mid-edit.

   Disabled by ?safe=1 or ?nov454=1. Diagnostics: NBv454.report()
   ===================================================================== */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](safe|nov454)=1/.test(q)) {
    try { console.log("[v4.54] UI layer disabled by flag."); } catch (e) {}
    return;
  }
  if (window.__v454ui) return;
  window.__v454ui = true;

  var LOG = [];
  function note(s) { LOG.push(s); if (LOG.length > 120) LOG.shift(); }

  function stages() { try { return window.HQ_STAGES || []; } catch (e) { return []; } }
  function co() { try { return (window.G && window.G.company) || null; } catch (e) { return null; } }
  function ui() { try { return (window.G && window.G.ui) || {}; } catch (e) { return {}; } }
  function money(n) {
    try { return fmt$(n); } catch (e) {}
    try { return "$" + Math.round(Number(n) || 0).toLocaleString(); } catch (e) { return "$" + n; }
  }
  function artFor(key) {
    try { if (typeof window.v442Art === "function") return window.v442Art(key); } catch (e) {}
    try { var h = (window.HQ_IMG || {})[key]; if (typeof h === "string" && h) return h; } catch (e) {}
    return null;
  }
  function cur() {
    var L = stages(); if (!L.length) return 0;
    var c = co();
    return Math.max(0, Math.min(L.length - 1, (c && c.hqStage) | 0));
  }
  function moveQueued() {
    try {
      return ((co() || {}).queue || []).some(function (x) { return x && /Move HQ/.test(x.label || ""); });
    } catch (e) { return false; }
  }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* ---------------------------------------------------------------
     Styles
     --------------------------------------------------------------- */
  try {
    if (!document.getElementById("v454-css")) {
      var css = document.createElement("style");
      css.id = "v454-css";
      css.textContent =
        ".hq-rail{display:flex;gap:12px;overflow-x:auto;overflow-y:hidden;padding:6px 2px 12px;"
      + "scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;scrollbar-width:thin;}"
      + ".hq-rail::-webkit-scrollbar{height:8px;}"
      + ".hq-rail::-webkit-scrollbar-thumb{background:var(--border,#293042);border-radius:4px;}"
      + ".hq-rung{flex:0 0 236px;scroll-snap-align:center;border:1px solid var(--border,#293042);"
      + "border-radius:12px;overflow:hidden;display:flex;flex-direction:column;background:var(--panel2,#0b1220);}"
      + ".hq-rung img,.hq-rung .hq-pending{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:#11141a;}"
      + ".hq-rung .hq-pending{display:flex;align-items:center;justify-content:center;text-align:center;"
      + "font-size:11px;opacity:.5;border-bottom:1px dashed var(--border,#293042);}"
      + ".hq-rung .body{padding:10px 12px 12px;display:flex;flex-direction:column;gap:6px;flex:1;}"
      + ".hq-rung .step{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;opacity:.6;}"
      + ".hq-rung h4{margin:0;font-size:14px;line-height:1.3;}"
      + ".hq-rung .line{font-size:11.5px;opacity:.75;line-height:1.45;}"
      + ".hq-rung .price{font-size:15px;font-weight:600;margin-top:2px;}"
      + ".hq-rung .btn{margin-top:auto;}"
      + ".hq-rung.done{opacity:.55;}"
      + ".hq-rung.done img{filter:grayscale(.55);}"
      + ".hq-rung.now{border-color:var(--accent,#2a6df4);box-shadow:0 0 0 1px var(--accent,#2a6df4) inset;}"
      + ".hq-rung.locked{opacity:.6;}"
      + ".hq-rung .tag{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.05em;"
      + "text-transform:uppercase;padding:2px 6px;border-radius:5px;align-self:flex-start;}"
      + ".hq-rung .tag.here{background:var(--accent,#2a6df4);color:#fff;}"
      + ".hq-rung .tag.owned{background:var(--border,#293042);opacity:.85;}"
      + ".hq-rung .tag.next{background:#1f7a4d;color:#fff;}";
      document.head.appendChild(css);
    }
  } catch (e) {}

  /* ---------------------------------------------------------------
     1. The rail
     --------------------------------------------------------------- */
  function rungHtml(st, i, s) {
    var cls = i < s ? "done" : (i === s ? "now" : (i === s + 1 ? "next" : "locked"));
    var src = artFor(st.key);
    var shot = src
      ? '<img src="' + src + '" alt="' + esc(st.name) + '">'
      : '<div class="hq-pending"><span>Art pending<br><code>' + esc(st.key) + '</code></span></div>';

    var tag = i < s ? '<span class="tag owned">Outgrown</span>'
            : i === s ? '<span class="tag here">You are here</span>'
            : i === s + 1 ? '<span class="tag next">Next move</span>' : "";

    var foot;
    if (i <= s) {
      foot = '<div class="line">' + (i === s ? "Rent " + money(st.rent) + "/mo." : "Behind you.") + '</div>';
    } else if (i === s + 1) {
      foot = '<div class="price">' + money(st.cost) + '</div>'
           + (moveQueued()
                ? '<div class="line"><b>Move already queued</b> \u2014 it completes at month close.</div>'
                : '<button class="btn small" data-v440up="1">Queue this move</button>');
    } else {
      foot = '<div class="price" style="opacity:.7;">' + money(st.cost) + '</div>'
           + '<div class="line">Unlocks after the moves before it.</div>';
    }

    return '<div class="hq-rung ' + cls + '" data-v454rung="' + i + '">' + shot +
      '<div class="body">' +
        '<div class="step">Stage ' + (i + 1) + ' of ' + stages().length + '</div>' +
        tag +
        '<h4>' + esc(st.name) + '</h4>' +
        '<div class="line">' + esc(st.blurb || "") + '</div>' +
        '<div class="line"><b>' + (st.cap || 0).toLocaleString() + '</b> seats \u00b7 ' +
          money(st.rent) + '/mo</div>' +
        foot +
      '</div></div>';
  }

  function railEl() {
    var L = stages();
    if (!L.length) return null;
    var s = cur();
    var rungs = "";
    for (var i = 0; i < L.length; i++) rungs += rungHtml(L[i], i, s);

    var d = document.createElement("div");
    d.className = "card mt14";
    d.setAttribute("data-v454rail", "1");
    d.innerHTML = '<h3>\uD83C\uDFE2 The HQ ladder</h3>' +
      '<div class="muted" style="font-size:12px;">All ten stages, garage to global campus \u2014 scroll sideways. ' +
      'One move at a time; it completes when the month closes and lifts morale by 5.</div>' +
      '<div class="hq-rail">' + rungs + '</div>';
    return d;
  }

  function centreRail() {
    try {
      var rail = document.querySelector('[data-v454rail] .hq-rail');
      if (!rail) return;
      var now = rail.querySelector('.hq-rung.now');
      if (!now) return;
      /* setting scrollLeft directly, so the page itself never jumps */
      rail.scrollLeft = Math.max(0, now.offsetLeft - rail.clientWidth / 2 + now.clientWidth / 2);
    } catch (e) {}
  }

  function decorate(out) {
    if (!out || !out.querySelectorAll) return out;
    var killed = 0;
    try {
      out.querySelectorAll('[data-v442next],[data-v440ladder]').forEach(function (n) {
        n.remove(); killed++;
      });
    } catch (e) {}
    var rail = railEl();
    if (rail) {
      out.appendChild(rail);
      note("rail mounted, replaced " + killed + " legacy card(s)");
      setTimeout(centreRail, 0);
    }
    return out;
  }

  var wrapped = false;
  function wrapTab() {
    if (wrapped) return;
    var prev;
    try { prev = window.renderFacilitiesTab; } catch (e) { return; }
    if (typeof prev !== "function" || prev.__v454) return;
    var fn = function () {
      var out = prev.apply(this, arguments);
      try { decorate(out); } catch (e) {}
      return out;
    };
    fn.__v454 = true;
    try { window.renderFacilitiesTab = fn; wrapped = true; note("wrapped renderFacilitiesTab"); } catch (e) {}
  }

  wrapTab();
  setTimeout(wrapTab, 0);
  try { document.addEventListener("DOMContentLoaded", wrapTab); } catch (e) {}

  /* ---------------------------------------------------------------
     2. Expansion placement
     --------------------------------------------------------------- */
  var FELIPE_AI = /felipe\s*a\.?i\.?\b|\bfelipe\s*ai\b/i;
  var GROWTH_ONLY = /(marketing|campaign|channel|\bmarkets?\b|territor|rival|competitor|price tier|assortment|merchandis)/i;
  var HQ_WORDS = /\b(hq|headquarters?|facilit|workspace|office|move[- ]in|lease|square feet|seats?)\b/i;

  function txt(n) {
    try { return (n && n.textContent ? n.textContent : "").replace(/\s+/g, " ").trim(); } catch (e) { return ""; }
  }
  function heading(card) {
    var h = card.querySelector("h1,h2,h3,h4");
    return h ? txt(h) : txt(card).slice(0, 80);
  }
  function somethingFocused() {
    try {
      var a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
      if (a && a.isContentEditable) return true;
    } catch (e) {}
    return false;
  }
  function hide(card, why) {
    if (card.getAttribute("data-v454hid") === "1") return;
    card.style.display = "none";
    card.setAttribute("data-v454hid", "1");
    note("hid on " + why);
  }

  function tidyExpansion() {
    if (somethingFocused()) return;
    if (document.getElementById("nbGate")) return;
    var u = ui();
    if (u.activeTab !== "expansion") return;
    var s = document.getElementById("screen");
    if (!s) return;

    var onHqSub = u.v417ExpSub !== "growth";
    var cards = s.querySelectorAll(".card");
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (c.getAttribute("data-v454hid") === "1") continue;
      var head = heading(c);
      if (!head) continue;

      /* Felipe AI has its own dock tab. It is never an Expansion card. */
      if (FELIPE_AI.test(head) || FELIPE_AI.test(txt(c).slice(0, 160))) {
        hide(c, "Expansion (Felipe AI has its own tab): " + head);
        continue;
      }

      /* Growth material has no business on the HQ sub-tab — including the
         form-bearing cards 95-tidy.js deliberately leaves alone. */
      if (onHqSub && GROWTH_ONLY.test(head) && !HQ_WORDS.test(head)) {
        hide(c, "HQ sub-tab (belongs in Growth): " + head);
      }
    }
  }

  setInterval(function () { try { tidyExpansion(); } catch (e) {} }, 1100);

  /* ---------------------------------------------------------------
     Diagnostics
     --------------------------------------------------------------- */
  window.NBv454 = {
    version: "4.54",
    railMounted: function () { return !!document.querySelector("[data-v454rail]"); },
    log: function () { return LOG.slice(); },
    report: function () {
      var out = {
        version: "4.54",
        wrappedRenderFacilitiesTab: wrapped,
        stagesKnown: stages().length,
        currentStage: cur(),
        railOnScreen: !!document.querySelector("[data-v454rail]"),
        artPresent: stages().map(function (st) { return st.key + ": " + (artFor(st.key) ? "yes" : "MISSING"); }),
        activeTab: ui().activeTab,
        expSub: ui().v417ExpSub,
        actions: LOG.slice(-30)
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try { console.log("[v4.54] HQ rail + Expansion placement layer armed. NBv454.report() for detail."); } catch (e) {}
})();
