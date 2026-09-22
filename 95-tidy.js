/* 95-tidy.js  —  v4.43  "Right place, right company"
   =====================================================================
   A top layer that corrects PLACEMENT and RELEVANCE. It owns no game
   state, replaces no named function, and fails silently rather than
   breaking a render.

   THE BUG BEHIND THE MESS
   -----------------------
   40-v428-trucking.js mounts cards with:
       function tabNow(){ return G.ui.activeTab; }
       mount(["clients"].concat(GROWTH), "data-v426channels", channelCard);
       var GROWTH = ["growth","market","expansion","rivals"];
   The Expansion screen is ONE tab (activeTab === "expansion") with two
   sub-tabs held in G.ui.v417ExpSub ("growth" | "facilities"). mount()
   never consults the sub-tab, so every card aimed at "expansion"
   rendered on BOTH sub-tabs. That is why founder decisions, marketing
   channels, markets and rivals all turned up inside the HQ / Facilities
   screen, and why marketing appeared twice.

   WHAT THIS FILE DOES
   -------------------
   1. Sub-tab hygiene  — on Expansion > Facilities/HQ, hide cards that
      belong to the Growth sub-tab. HQ cards are protected explicitly.
   2. Dock hygiene     — each screen appears in exactly one group; the
      preferred home wins and duplicates elsewhere are dropped.
   3. Industry relevance — fleet-only hiring rungs (the v428_* keys) are
      hidden for companies that are not fleet businesses, and the
      Industry Ops dock entry is withdrawn when usesOps() is false,
      per company, restoring itself for fleet companies.
   4. window.NBTidy.report() — diagnostics to paste back to me.
   ===================================================================== */
(function () {
  "use strict";
  if (window.__v443) return;
  window.__v443 = true;

  var LOG = [];
  function note(s) { LOG.push(s); if (LOG.length > 240) LOG.shift(); }
  function gated() { return !!document.getElementById("nbGate"); }
  function screenEl() { return document.getElementById("screen"); }
  function ui() { try { return (window.G && window.G.ui) || {}; } catch (e) { return {}; } }
  function txt(n) { try { return (n && n.textContent ? n.textContent : "").replace(/\s+/g, " ").trim(); } catch (e) { return ""; } }

  /* ---------------------------------------------------------------
     0. Industry helpers
     --------------------------------------------------------------- */
  function industryKey() {
    try { if (typeof window.IND === "function") return window.IND(); } catch (e) {}
    try { return (window.G && window.G.company && window.G.company.industry) || ""; } catch (e) { return ""; }
  }
  function industryCfg() {
    try { return (window.INDUSTRIES || {})[industryKey()] || null; } catch (e) { return null; }
  }
  /* Fleet businesses are the only ones that should ever see driver,
     dispatcher, owner-operator or freight-desk hiring. */
  function isFleet() {
    try {
      var k = String(industryKey() || "");
      if (/truck|freight|fleet|haul|logis/i.test(k)) return true;
      var c = industryCfg();
      if (!c) return false;
      if (c.v45 === "fleet" || c.opsType === "fleet") return true;
      return /truck|freight|fleet|haul|logis/i.test(String(c.name || "") + " " + String(c.label || ""));
    } catch (e) { return false; }
  }
  function opsWanted() {
    try { if (typeof window.usesOps === "function") return !!window.usesOps(); } catch (e) {}
    var c = industryCfg();
    return !!(c && (c.opsType || c.v45 === "fleet" || c.v45 === "salon"));
  }

  /* ---------------------------------------------------------------
     1. Sub-tab hygiene on the Expansion screen
     --------------------------------------------------------------- */

  /* Cards that must never be touched on the HQ / Facilities sub-tab. */
  var KEEP_SEL = "[data-v442go],[data-v442],[data-v436up],.hq-photo,.fac-card,.v47-hqcard";
  var KEEP_TEXT = /\b(hq|headquarters?|facilit|workspace|office|move[- ]in|lease|square feet|seats?)\b/i;

  /* Headings that belong to Growth, Decisions or Market & Rivals. */
  var GROWTH_TEXT = new RegExp([
    "founder", "decision", "side hustle", "hustle",
    "marketing", "channel", "campaign",
    "market\\b", "markets", "territor",
    "rival", "competitor", "research",
    "pricing", "price tier", "assortment", "merchandis",
    "agency standing", "reputation"
  ].join("|"), "i");

  function cardHeading(card) {
    var h = card.querySelector("h1,h2,h3,h4");
    return h ? txt(h) : txt(card).slice(0, 80);
  }

  function tidySubTabs() {
    var s = screenEl(); if (!s) return;
    var u = ui();
    if (u.activeTab !== "expansion") return;
    if (u.v417ExpSub === "growth") return;      /* Growth sub-tab: leave alone. */

    var cards = s.querySelectorAll(".card");
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (c.getAttribute("data-v443hid") === "1") continue;
      if (c.querySelector(KEEP_SEL) || (c.matches && c.matches(KEEP_SEL))) continue;
      var head = cardHeading(c);
      if (!head) continue;
      if (KEEP_TEXT.test(head)) continue;
      if (!GROWTH_TEXT.test(head)) continue;
      c.style.display = "none";
      c.setAttribute("data-v443hid", "1");
      note("hid on HQ sub-tab: " + head);
    }
  }

  /* ---------------------------------------------------------------
     2. Dock hygiene — one home per screen
     --------------------------------------------------------------- */

  /* id or label pattern  ->  pattern identifying the group it belongs in.
     Felipe's ruling: marketing and markets live in Growth; HQ, facilities
     and expansion live in the HQ group. */
  var HOMES = [
    { item: /^(marketing|channels?|campaigns?)$/i, group: /growth/i },
    { item: /^(market|markets|rivals)$/i, group: /growth/i },
    { item: /^(expansion|facilities|hq)$/i, group: /^hq$|headquarter/i }
  ];

  function groups() { try { return window.DOCK_GROUPS || null; } catch (e) { return null; } }
  function items() { try { return window.DOCK_ITEMS || null; } catch (e) { return null; } }

  function labelFor(id) {
    var list = items(); if (!list) return "";
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return String(list[i].label || "");
    return "";
  }

  function findGroup(re) {
    var gs = groups(); if (!gs) return null;
    for (var i = 0; i < gs.length; i++) {
      var g = gs[i]; if (!g) continue;
      if (re.test(String(g.id || "")) || re.test(String(g.label || ""))) return g;
    }
    return null;
  }

  function tidyDock() {
    var gs = groups(); if (!gs) return;

    /* (a) route each ruled item to its single preferred home */
    for (var r = 0; r < HOMES.length; r++) {
      var rule = HOMES[r];
      var home = findGroup(rule.group);
      if (!home || !home.items) continue;

      /* collect every id that matches this rule, by id or by label */
      var ids = {};
      for (var i = 0; i < gs.length; i++) {
        var g = gs[i]; if (!g || !g.items) continue;
        for (var j = 0; j < g.items.length; j++) {
          var id = g.items[j];
          if (rule.item.test(String(id)) || rule.item.test(labelFor(id))) ids[id] = 1;
        }
      }

      for (var id2 in ids) {
        if (!Object.prototype.hasOwnProperty.call(ids, id2)) continue;
        for (var k = 0; k < gs.length; k++) {
          var gg = gs[k]; if (!gg || !gg.items || gg === home) continue;
          var at = gg.items.indexOf(id2);
          while (at >= 0) {
            gg.items.splice(at, 1);
            note("dock: removed \"" + id2 + "\" from group \"" + (gg.id || gg.label) + "\"");
            at = gg.items.indexOf(id2);
          }
        }
        if (home.items.indexOf(id2) < 0) {
          home.items.push(id2);
          note("dock: placed \"" + id2 + "\" in group \"" + (home.id || home.label) + "\"");
        }
      }
    }

    /* (b) global de-duplication: an id may appear once, in the first group
           that claims it */
    var seen = {};
    for (var a = 0; a < gs.length; a++) {
      var grp = gs[a]; if (!grp || !grp.items) continue;
      for (var b = grp.items.length - 1; b >= 0; b--) {
        var it = grp.items[b];
        if (seen[it]) { grp.items.splice(b, 1); note("dock: de-duped \"" + it + "\""); }
      }
      for (var c2 = 0; c2 < grp.items.length; c2++) seen[grp.items[c2]] = 1;
    }
  }

  /* ---------------------------------------------------------------
     3. Industry Ops — present only where the industry has ops
     --------------------------------------------------------------- */
  var opsHome = null;   /* { groupId, id, index } remembered on first sight */

  function opsItemId() {
    var list = items(); if (!list) return null;
    for (var i = 0; i < list.length; i++) {
      var d = list[i]; if (!d) continue;
      if (/industry\s*ops/i.test(String(d.label || "")) || /^ops$|industryops/i.test(String(d.id || ""))) return d.id;
    }
    return null;
  }

  function tidyOps() {
    var gs = groups(); if (!gs) return;
    var id = opsItemId(); if (!id) return;

    /* remember where it lives, so it can be restored for fleet companies */
    if (!opsHome) {
      for (var i = 0; i < gs.length; i++) {
        var g = gs[i]; if (!g || !g.items) continue;
        var at = g.items.indexOf(id);
        if (at >= 0) { opsHome = { groupId: g.id, id: id, index: at }; break; }
      }
    }

    var want = opsWanted();
    for (var k = 0; k < gs.length; k++) {
      var gg = gs[k]; if (!gg || !gg.items) continue;
      var pos = gg.items.indexOf(id);
      if (!want && pos >= 0) {
        gg.items.splice(pos, 1);
        note("ops: withdrew \"" + id + "\" (" + (industryKey() || "unknown industry") + " has no industry ops)");
      }
    }
    if (want && opsHome) {
      var host = null;
      for (var m = 0; m < gs.length; m++) if (gs[m] && gs[m].id === opsHome.groupId) host = gs[m];
      if (host && host.items && host.items.indexOf(id) < 0) {
        host.items.splice(Math.min(opsHome.index, host.items.length), 0, id);
        note("ops: restored \"" + id + "\"");
      }
    }

    /* if the player is standing on a withdrawn tab, move them off it */
    try {
      if (!want && window.G && window.G.ui && window.G.ui.activeTab === id) {
        window.G.ui.activeTab = "decisions";
      }
    } catch (e) {}
  }

  /* ---------------------------------------------------------------
     4. Hiring relevance — no drivers in a software company
     --------------------------------------------------------------- */

  /* Role words that only make sense inside a fleet business. The rung keys
     themselves are left untouched: promotion logic indexes into
     LADDERS[dept].rungs and 60-v433 already had to repair that ordering
     once. Hiding at the DOM layer is the change with no blast radius. */
  var FLEET_TEXT = /(owner[\u2011\u2013\u2014-]?operator|dry van|reefer|flatbed|day\s?cab|sleeper cab|lead driver|driver\s*\/?\s*trainer|\bdriver\b|\bdispatcher\b|fleet operations|safety\s*&?\s*compliance|freight)/i;
  var ROW_SEL = ".row,.hrow,.rung,.hire,.hire-row,li,tr";

  function hideRow(node, why) {
    var row = node;
    try { if (node.closest) row = node.closest(ROW_SEL) || node; } catch (e) {}
    if (!row || row.getAttribute("data-v443hid") === "1") return;
    /* never blank out a whole screen or a whole card */
    if (row.id === "screen" || (row.classList && row.classList.contains("card"))) row = node;
    row.style.display = "none";
    row.setAttribute("data-v443hid", "1");
    note("hiring: hid " + why);
  }

  function tidyHiring() {
    if (isFleet()) return;
    var s = screenEl(); if (!s) return;

    /* (a) anything carrying a v428_ rung key in an attribute */
    var all = s.getElementsByTagName("*");
    for (var i = 0; i < all.length; i++) {
      var n = all[i], at = n.attributes, hit = false;
      for (var j = 0; j < at.length; j++) {
        if (String(at[j].value).indexOf("v428_") >= 0) { hit = true; break; }
      }
      if (hit) hideRow(n, String(n.getAttribute("data-key") || "v428_ element"));
    }

    /* (b) rows that read as fleet roles and carry a hire//promote control */
    var rows = s.querySelectorAll(ROW_SEL);
    for (var k = 0; k < rows.length; k++) {
      var r = rows[k];
      if (r.getAttribute("data-v443hid") === "1") continue;
      var t = txt(r);
      if (!t || t.length > 260) continue;
      if (!FLEET_TEXT.test(t)) continue;
      if (!r.querySelector("button,.btn")) continue;
      r.style.display = "none";
      r.setAttribute("data-v443hid", "1");
      note("hiring: hid row \"" + t.slice(0, 60) + "\"");
    }
  }

  /* ---------------------------------------------------------------
     5. Sweep
     --------------------------------------------------------------- */
  var busy = false;
  function sweep() {
    if (busy || gated()) return;
    busy = true;
    try { tidyDock(); } catch (e) {}
    try { tidyOps(); } catch (e) {}
    try { tidySubTabs(); } catch (e) {}
    try { tidyHiring(); } catch (e) {}
    busy = false;
  }

  function start() {
    sweep();
    var app = document.getElementById("app") || document.body;
    try {
      var mo = new MutationObserver(function () {
        if (sweep.__q) return;
        sweep.__q = true;
        requestAnimationFrame(function () { sweep.__q = false; sweep(); });
      });
      mo.observe(app, { childList: true, subtree: true });
    } catch (e) {}
    setInterval(sweep, 900);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  /* ---------------------------------------------------------------
     6. Diagnostics
     --------------------------------------------------------------- */
  window.NBTidy = {
    version: "4.43",
    sweep: sweep,
    log: function () { return LOG.slice(); },
    report: function () {
      var out = { version: "4.43" };
      try { out.industry = industryKey(); } catch (e) {}
      try { out.isFleet = isFleet(); out.opsWanted = opsWanted(); out.opsItem = opsItemId(); } catch (e) {}
      try { out.activeTab = ui().activeTab; out.expSub = ui().v417ExpSub; } catch (e) {}
      try {
        out.dock = (groups() || []).map(function (g) {
          return { id: g.id, label: g.label, items: (g.items || []).slice() };
        });
      } catch (e) {}
      try { out.industries = Object.keys(window.INDUSTRIES || {}); } catch (e) {}
      try {
        out.ladders = {};
        var L = window.LADDERS || {};
        for (var d in L) if (L[d] && L[d].rungs) out.ladders[d] = L[d].rungs.map(function (x) { return x.key; });
      } catch (e) {}
      try {
        var s = screenEl();
        out.cardsOnScreen = s ? Array.prototype.map.call(s.querySelectorAll(".card"), cardHeading) : [];
      } catch (e) {}
      out.actions = LOG.slice(-40);
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };
})();
