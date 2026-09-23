/* 100-rnd.js — v4.55  "R&D moves into the Industry Ops slot"
   =====================================================================
   WHAT THIS DOES
   --------------
   Industry Ops only means anything for industries with an ops model
   (fleet, salon). For every other company — the AI SaaS run included —
   the tab was either dead weight or, when usesOps() misjudged it, an
   empty screen the player could still reach. This layer repurposes that
   dock slot as R&D.

     • no ops industry  -> the tab IS the R&D screen, labelled "R&D";
                           the legacy ops render is cleared on mount.
     • ops industry     -> the ops screen stays exactly as it is and the
                           R&D cards are appended underneath it.

   WHAT R&D BUYS (two tracks, sequential tiers, cash up front)
   -----------------------------------------------------------
     Shipping speed   — a compounding feature-velocity multiplier.
     Product quality  — a flat quality bonus.

   HONEST LIMIT: the month-close maths lives in art-core.js, which is
   2.7 MB and unreadable to tooling. So this layer (a) keeps its own
   authoritative state on G.company.rnd, (b) publishes it on
   window.NB_RND for the sim to read, and (c) best-effort nudges any
   matching numeric field it can actually find on G.company. What it
   found is printed on the screen itself, under "Under the hood" — no
   console required.

   PLUMBING NOTES
   --------------
   40-v428-trucking.js gateDock() hides the [data-tab="industry"] button
   and bounces activeTab to "hq" whenever usesOps() is false, and
   95-tidy.js withdraws the dock item on the same test. Rather than
   fight both on a timer, we replace the global usesOps() with one that
   returns true and keep the real answer as window.__nbUsesOpsReal(),
   which is what this file branches on. 95-tidy's ops rule also stops
   matching once the dock label is "R&D".

   Disabled by ?safe=1 or ?nornd=1. Diagnostics: NBRnd.report()
   ===================================================================== */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](safe|nornd)=1/.test(q)) {
    try { console.log("[v4.55] R&D layer disabled by flag."); } catch (e) {}
    return;
  }
  if (window.__nbRnd455) return;
  window.__nbRnd455 = true;

  var LOG = [];
  var msg = "";
  function note(s) { LOG.push(s); if (LOG.length > 120) LOG.shift(); }

  function co() { try { return (window.G && window.G.company) || null; } catch (e) { return null; } }
  function ui() { try { return (window.G && window.G.ui) || {}; } catch (e) { return {}; } }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function money(n) {
    try { return fmt$(n); } catch (e) {}
    try { return "$" + Math.round(Number(n) || 0).toLocaleString(); } catch (e) { return "$" + n; }
  }
  function repaint() {
    try { if (typeof window.redraw === "function") { window.redraw(); return; } } catch (e) {}
    try { if (typeof window.renderScreen === "function") window.renderScreen(); } catch (e) {}
  }

  /* ---------------------------------------------------------------
     0. Keep the real ops answer, then tell everyone else "yes"
     --------------------------------------------------------------- */
  var realUsesOps = null;
  try { if (typeof window.usesOps === "function") realUsesOps = window.usesOps; } catch (e) {}
  try { if (!realUsesOps && typeof window.__v426UsesOps === "function") realUsesOps = window.__v426UsesOps; } catch (e) {}

  function opsReal() {
    try { return realUsesOps ? !!realUsesOps() : false; } catch (e) { return false; }
  }
  window.__nbUsesOpsReal = opsReal;

  try {
    window.usesOps = function () { return true; };
    note("usesOps() overridden to true; real answer kept as __nbUsesOpsReal()");
  } catch (e) { note("could not override usesOps(): " + ((e && e.message) || e)); }

  /* ---------------------------------------------------------------
     1. State
     --------------------------------------------------------------- */
  function state() {
    var c = co();
    if (!c) return null;
    if (!c.rnd || typeof c.rnd !== "object") c.rnd = {};
    var st = c.rnd;
    if (typeof st.v !== "number") st.v = 1;
    if (!st.owned || typeof st.owned !== "object") st.owned = {};
    if (typeof st.spent !== "number" || !isFinite(st.spent)) st.spent = 0;
    if (!st.history || !st.history.length) st.history = st.history || [];
    return st;
  }

  var TRACKS = [
    {
      id: "velocity",
      icon: "\uD83D\uDE80",
      name: "Shipping speed",
      blurb: "Shortens the gap between deciding to build something and having it in front of customers.",
      unit: "velocity",
      tiers: [
        { key: "pipeline",  name: "Build & release pipeline", cost: 15000,  gain: 0.10, effect: "+10% feature velocity", line: "One command from commit to production. Releases stop being events." },
        { key: "autoqa",    name: "Automated test suite",     cost: 60000,  gain: 0.15, effect: "+15% feature velocity", line: "Regressions get caught by machines instead of customers." },
        { key: "platform",  name: "Platform re-architecture", cost: 200000, gain: 0.25, effect: "+25% feature velocity", line: "Expensive, disruptive, and the only way past the ceiling." }
      ]
    },
    {
      id: "quality",
      icon: "\uD83D\uDD2C",
      name: "Product quality",
      blurb: "Fewer defects, clearer product decisions, customers who stay longer.",
      unit: "quality",
      tiers: [
        { key: "research",    name: "Continuous user research", cost: 12000,  gain: 4, effect: "+4 product quality", line: "Stop guessing what to build. Ten interviews a month, every month." },
        { key: "reliability", name: "Reliability programme",    cost: 50000,  gain: 6, effect: "+6 product quality", line: "Error budgets, on-call, and a real incident review habit." },
        { key: "design",      name: "Design system",            cost: 180000, gain: 8, effect: "+8 product quality", line: "One vocabulary across the product. Consistency you can feel." }
      ]
    }
  ];

  function findTier(key) {
    for (var t = 0; t < TRACKS.length; t++) {
      for (var i = 0; i < TRACKS[t].tiers.length; i++) {
        if (TRACKS[t].tiers[i].key === key) return { track: TRACKS[t], tier: TRACKS[t].tiers[i], index: i };
      }
    }
    return null;
  }
  function owns(key) { var st = state(); return !!(st && st.owned && st.owned[key]); }
  function unlocked(track, i) { return i === 0 ? true : owns(track.tiers[i - 1].key); }

  function velocityMult() {
    var m = 1;
    var tr = TRACKS[0];
    for (var i = 0; i < tr.tiers.length; i++) if (owns(tr.tiers[i].key)) m *= (1 + tr.tiers[i].gain);
    return m;
  }
  function qualityBonus() {
    var n = 0;
    var tr = TRACKS[1];
    for (var i = 0; i < tr.tiers.length; i++) if (owns(tr.tiers[i].key)) n += tr.tiers[i].gain;
    return n;
  }

  /* ---------------------------------------------------------------
     2. Which fields on G.company we can actually touch
     --------------------------------------------------------------- */
  var CASH_FIELDS = ["cash", "cashOnHand", "money", "bank", "balance"];
  var QUAL_FIELDS = ["productQuality", "qualityScore", "prodQuality", "quality"];
  var VEL_FIELDS  = ["featureVelocity", "devSpeed", "buildSpeed", "velocity", "rndSpeed"];

  function numField(list) {
    var c = co();
    if (!c) return null;
    for (var i = 0; i < list.length; i++) {
      var v = c[list[i]];
      if (typeof v === "number" && isFinite(v)) return list[i];
    }
    return null;
  }
  function cashField() { return numField(CASH_FIELDS); }
  function cashNow() {
    var f = cashField(), c = co();
    return f && c ? c[f] : null;
  }

  /* Quality scales differ between builds (0-1, 0-10, 0-100). Match the
     one in use rather than assuming, and never write past its top. */
  function nudgeQuality(points) {
    var f = numField(QUAL_FIELDS), c = co();
    if (!f || !c) return null;
    var v = c[f], top = 100, add = points;
    if (v <= 1) { top = 1; add = points / 100; }
    else if (v <= 10) { top = 10; add = points / 10; }
    c[f] = Math.max(0, Math.min(top, v + add));
    return f;
  }
  function nudgeVelocity(gain) {
    var f = numField(VEL_FIELDS), c = co();
    if (!f || !c) return null;
    c[f] = c[f] * (1 + gain);
    return f;
  }

  /* ---------------------------------------------------------------
     3. Buying
     --------------------------------------------------------------- */
  function buy(key) {
    var c = co(), st = state();
    if (!c || !st) return;
    var hit = findTier(key);
    if (!hit) return;
    if (owns(key)) return;
    if (!unlocked(hit.track, hit.index)) { msg = "Fund " + hit.track.tiers[hit.index - 1].name + " first."; repaint(); return; }

    var f = cashField();
    if (f && (c[f] || 0) < hit.tier.cost) {
      msg = "Not enough cash for " + hit.tier.name + " — " + money(hit.tier.cost) + " needed, " + money(c[f]) + " on hand.";
      note("declined " + key + " (short on cash)");
      repaint(); mount();
      return;
    }

    if (f) c[f] = c[f] - hit.tier.cost;
    st.owned[key] = true;
    st.spent = (st.spent || 0) + hit.tier.cost;

    var touched = hit.track.id === "quality" ? nudgeQuality(hit.tier.gain) : nudgeVelocity(hit.tier.gain);
    st.history.push({ key: key, cost: hit.tier.cost, field: touched || null });
    if (st.history.length > 40) st.history.shift();

    msg = hit.tier.name + " funded \u2014 " + hit.tier.effect + ".";
    note("funded " + key + " for " + hit.tier.cost + (touched ? " (nudged " + touched + ")" : " (no core field to nudge)"));

    try { if (typeof window.__v428markDirty === "function") window.__v428markDirty(); } catch (e) {}
    repaint();
    mount();
  }

  try {
    document.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      var b = t.closest("[data-rnd-buy]");
      if (!b) return;
      if (b.getAttribute("disabled") !== null) { ev.preventDefault(); ev.stopPropagation(); return; }
      ev.preventDefault();
      ev.stopPropagation();
      buy(b.getAttribute("data-rnd-buy"));
    }, true);
  } catch (e) {}

  /* ---------------------------------------------------------------
     4. Styles
     --------------------------------------------------------------- */
  try {
    if (!document.getElementById("rnd-css")) {
      var css = document.createElement("style");
      css.id = "rnd-css";
      css.textContent =
        ".rnd-tier{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--border,#293042);}"
      + ".rnd-tier:first-of-type{border-top:0;}"
      + ".rnd-tier .num{flex:0 0 22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;"
      + "font-size:11px;font-weight:700;background:var(--border,#293042);margin-top:2px;}"
      + ".rnd-tier.done .num{background:#1f7a4d;color:#fff;}"
      + ".rnd-tier.open .num{background:var(--accent,#2a6df4);color:#fff;}"
      + ".rnd-tier .meat{flex:1;min-width:0;}"
      + ".rnd-tier h4{margin:0 0 2px;font-size:13.5px;}"
      + ".rnd-tier .line{font-size:11.5px;opacity:.75;line-height:1.45;}"
      + ".rnd-tier .eff{font-size:11.5px;font-weight:600;opacity:.9;margin-top:2px;}"
      + ".rnd-tier .buy{flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-end;gap:4px;}"
      + ".rnd-tier .cost{font-size:13px;font-weight:600;white-space:nowrap;}"
      + ".rnd-tier.locked{opacity:.55;}"
      + ".rnd-tier.done{opacity:.7;}"
      + ".rnd-stat{display:flex;gap:18px;flex-wrap:wrap;margin-top:8px;}"
      + ".rnd-stat div span{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;opacity:.6;}"
      + ".rnd-stat div b{font-size:17px;}"
      + ".rnd-msg{margin-top:8px;font-size:12px;padding:7px 10px;border-radius:8px;"
      + "background:var(--panel2,#0b1220);border:1px solid var(--border,#293042);}";
      document.head.appendChild(css);
    }
  } catch (e) {}

  /* ---------------------------------------------------------------
     5. The screen
     --------------------------------------------------------------- */
  function tierHtml(track, tier, i) {
    var done = owns(tier.key);
    var open = !done && unlocked(track, i);
    var cash = cashNow();
    var poor = open && cash !== null && cash < tier.cost;
    var cls = done ? "done" : (open ? "open" : "locked");

    var right;
    if (done) right = '<div class="cost" style="color:#4ec98a;">Funded</div>';
    else right = '<div class="cost">' + money(tier.cost) + '</div>'
      + (open
          ? '<button class="btn small" data-rnd-buy="' + esc(tier.key) + '"' + (poor ? ' disabled' : '') + '>'
            + (poor ? "Can\u2019t afford" : "Fund it") + '</button>'
          : '<div class="line">Locked</div>');

    return '<div class="rnd-tier ' + cls + '">'
      + '<div class="num">' + (done ? "\u2713" : (i + 1)) + '</div>'
      + '<div class="meat"><h4>' + esc(tier.name) + '</h4>'
      + '<div class="line">' + esc(tier.line) + '</div>'
      + '<div class="eff">' + esc(tier.effect) + '</div></div>'
      + '<div class="buy">' + right + '</div>'
      + '</div>';
  }

  function trackCard(track) {
    var rows = "";
    for (var i = 0; i < track.tiers.length; i++) rows += tierHtml(track, track.tiers[i], i);
    var d = document.createElement("div");
    d.className = "card mt14";
    d.innerHTML = '<h3>' + track.icon + ' ' + esc(track.name) + '</h3>'
      + '<div class="muted" style="font-size:12px;">' + esc(track.blurb) + '</div>'
      + '<div style="margin-top:8px;">' + rows + '</div>';
    return d;
  }

  function headCard() {
    var st = state() || {};
    var mult = velocityMult();
    var qual = qualityBonus();
    var funded = 0;
    for (var t = 0; t < TRACKS.length; t++) for (var i = 0; i < TRACKS[t].tiers.length; i++) if (owns(TRACKS[t].tiers[i].key)) funded++;

    var d = document.createElement("div");
    d.className = "card";
    d.setAttribute("data-rnd-head", "1");
    d.innerHTML = '<h3>\uD83E\uDDEA R&amp;D</h3>'
      + '<div class="muted" style="font-size:12px;">Money spent here does not come back as revenue next month. '
      + 'It buys two things: how fast you can ship, and how good what you ship is. Six investments, in order, '
      + 'cheapest first.</div>'
      + '<div class="rnd-stat">'
      +   '<div><span>Invested to date</span><b>' + money(st.spent || 0) + '</b></div>'
      +   '<div><span>Programmes funded</span><b>' + funded + ' / 6</b></div>'
      +   '<div><span>Feature velocity</span><b>\u00d7' + mult.toFixed(2) + '</b></div>'
      +   '<div><span>Quality bonus</span><b>' + (qual ? "+" + qual : "\u2014") + '</b></div>'
      + '</div>'
      + (msg ? '<div class="rnd-msg">' + esc(msg) + '</div>' : '');
    return d;
  }

  function underCard() {
    var cf = cashField();
    var qf = numField(QUAL_FIELDS);
    var vf = numField(VEL_FIELDS);
    var d = document.createElement("div");
    d.className = "card mt14";
    d.innerHTML = '<h3>\uD83D\uDD27 Under the hood</h3>'
      + '<div class="muted" style="font-size:11.5px;line-height:1.55;">'
      + 'R&amp;D state is saved on <code>company.rnd</code> and published at <code>window.NB_RND</code>, '
      + 'so the rest of the simulation can read it.<br>'
      + 'Cash taken from: <b>' + esc(cf || "no numeric cash field found \u2014 purchases are free") + '</b><br>'
      + 'Quality written to: <b>' + esc(qf || "no matching field \u2014 bonus held in this layer only") + '</b><br>'
      + 'Velocity written to: <b>' + esc(vf || "no matching field \u2014 multiplier held in this layer only") + '</b><br>'
      + 'Industry ops for this company: <b>' + (opsReal() ? "yes \u2014 ops screen kept above" : "no \u2014 this tab is R&amp;D") + '</b>'
      + '</div>';
    return d;
  }

  function buildNode() {
    if (!co()) return null;
    var wrap = document.createElement("div");
    wrap.setAttribute("data-nbrnd", "1");
    wrap.appendChild(headCard());
    for (var i = 0; i < TRACKS.length; i++) wrap.appendChild(trackCard(TRACKS[i]));
    wrap.appendChild(underCard());
    return wrap;
  }

  function stampOf() {
    var st = state() || {};
    var keys = [];
    for (var k in st.owned || {}) if (Object.prototype.hasOwnProperty.call(st.owned, k)) keys.push(k);
    keys.sort();
    var cash = cashNow();
    return keys.join(",") + "|" + (st.spent || 0) + "|" + (cash === null ? "-" : Math.round(cash / 500)) + "|" + (opsReal() ? 1 : 0) + "|" + msg;
  }

  function focusedInScreen() {
    try {
      var a = document.activeElement;
      if (!a) return false;
      if (!/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !a.isContentEditable) return false;
      var s = document.getElementById("screen");
      return !!(s && s.contains(a));
    } catch (e) { return false; }
  }

  function clearLegacy(s, mine) {
    var kids = Array.prototype.slice.call(s.children);
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k === mine) continue;
      if (k.getAttribute && k.getAttribute("data-nbrnd") === "1") continue;
      if (k.classList && k.classList.contains("window-title")) continue;
      try { if (k.contains && document.activeElement && k.contains(document.activeElement)) continue; } catch (e) {}
      try { s.removeChild(k); } catch (e) {}
    }
  }

  function retitle(s) {
    try {
      var t = s.querySelector(".window-title");
      if (!t) return;
      var h = t.querySelector("h1,h2,h3,.title");
      if (!h) return;
      var cur = (h.textContent || "").trim();
      if (!cur || cur.length > 40) return;
      if (/R&D/i.test(cur)) return;
      if (!/ops\b|industry/i.test(cur)) return;
      h.textContent = "R&D";
      note('window title "' + cur + '" -> "R&D"');
    } catch (e) {}
  }

  function mount() {
    var u = ui();
    if (u.activeTab !== "industry") return;
    if (!co()) return;
    if (document.getElementById("nbGate")) return;
    if (focusedInScreen()) return;
    var s = document.getElementById("screen");
    if (!s) return;

    var ops = opsReal();
    var mine = s.querySelector("[data-nbrnd]");
    if (!ops) { clearLegacy(s, mine); retitle(s); }

    var stamp = stampOf();
    if (mine && mine.parentNode === s && mine.getAttribute("data-nbrndstamp") === stamp) return;

    var node = buildNode();
    if (!node) return;
    node.setAttribute("data-nbrndstamp", stamp);
    if (mine && mine.parentNode) mine.parentNode.replaceChild(node, mine);
    else s.appendChild(node);
    note("R&D screen mounted (" + (ops ? "below ops" : "sole occupant") + ")");
  }

  /* ---------------------------------------------------------------
     6. Dock: keep the slot open and call it R&D
     --------------------------------------------------------------- */
  function dockFix() {
    if (!opsReal()) {
      try {
        var list = window.DOCK_ITEMS || null;
        if (list) {
          for (var i = 0; i < list.length; i++) {
            var d = list[i];
            if (!d) continue;
            if (String(d.id) === "industry" || /industry\s*ops/i.test(String(d.label || ""))) {
              if (d.label !== "R&D") { d.label = "R&D"; note("DOCK_ITEMS label -> R&D"); }
            }
          }
        }
      } catch (e) {}
    }

    var dock = document.getElementById("dock");
    if (!dock) return;
    var btn = dock.querySelector('[data-tab="industry"]');
    if (!btn) return;
    var holder = btn.parentNode || btn;
    try { if (holder.style && holder.style.display === "none") holder.style.display = ""; } catch (e) {}
    if (opsReal()) return;
    var lbl = (holder.querySelector && holder.querySelector(".dock-label")) ||
              (btn.querySelector && btn.querySelector(".dock-label"));
    if (lbl && (lbl.textContent || "").trim() !== "R&D") lbl.textContent = "R&D";
  }

  /* ---------------------------------------------------------------
     7. Hooks
     --------------------------------------------------------------- */
  var wrapped = false;
  function wrapRender() {
    if (wrapped) return;
    var prev;
    try { prev = window.renderScreen; } catch (e) { return; }
    if (typeof prev !== "function" || prev.__nbRnd) return;
    var fn = function () {
      var out = prev.apply(this, arguments);
      try { dockFix(); } catch (e) {}
      try { mount(); } catch (e) {}
      return out;
    };
    fn.__nbRnd = true;
    try { window.renderScreen = fn; wrapped = true; note("wrapped renderScreen"); } catch (e) {}
  }

  wrapRender();
  setTimeout(wrapRender, 0);
  setTimeout(wrapRender, 1500);
  try { document.addEventListener("DOMContentLoaded", wrapRender); } catch (e) {}

  /* Clicking the dock clears a stale message rather than leaving it to
     puzzle somebody three tabs later. */
  try {
    document.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      if (t.closest("[data-tab]") && msg) msg = "";
    }, true);
  } catch (e) {}

  setInterval(function () {
    try { wrapRender(); } catch (e) {}
    try { dockFix(); } catch (e) {}
    try { mount(); } catch (e) {}
  }, 1000);

  /* ---------------------------------------------------------------
     8. Public surface + diagnostics
     --------------------------------------------------------------- */
  window.NB_RND = {
    velocityMult: velocityMult,
    qualityBonus: qualityBonus,
    owns: owns,
    state: function () { return state(); }
  };

  window.NBRnd = {
    version: "4.55",
    mount: function () { return mount(); },
    buy: buy,
    log: function () { return LOG.slice(); },
    report: function () {
      var out = {
        version: "4.55",
        wrappedRenderScreen: wrapped,
        opsIndustry: opsReal(),
        activeTab: ui().activeTab,
        cashField: cashField(),
        qualityField: numField(QUAL_FIELDS),
        velocityField: numField(VEL_FIELDS),
        velocityMult: velocityMult(),
        qualityBonus: qualityBonus(),
        state: state(),
        onScreen: !!document.querySelector("[data-nbrnd]"),
        actions: LOG.slice(-30)
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try { console.log("[v4.55] R&D layer armed. NBRnd.report() for detail."); } catch (e) {}
})();
