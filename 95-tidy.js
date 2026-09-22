/* 95-tidy.js  —  v4.43 "Right place, right company"  (v4.46 hardening)
   =====================================================================
   A top layer that corrects PLACEMENT and RELEVANCE. It owns no game
   state, replaces no named function, and fails silently rather than
   breaking a render.

   THE BUG BEHIND THE MESS (v4.43)
   -------------------------------
   40-v428-trucking.js mounts cards against G.ui.activeTab only, but
   the Expansion screen is ONE tab with two sub-tabs held in
   G.ui.v417ExpSub ("growth" | "facilities"). Every card aimed at
   "expansion" therefore rendered on BOTH sub-tabs — hence founder
   decisions in Facilities, and marketing in two places at once.

   v4.46 — WHY THIS FILE WAS MISBEHAVING
   -------------------------------------
   The first cut observed #app with a MutationObserver and swept every
   900 ms. Its own DOM edits re-triggered the observer, and the dock
   edits provoked re-renders elsewhere, producing a visible flicker and
   making form fields impossible to focus — they were being replaced
   underneath the cursor. This version:

     • has NO MutationObserver;
     • sweeps on a slow timer, and only when the screen signature has
       actually changed since the last sweep;
     • does nothing at all while the account gate or the onboarding
       overlay is up, or while any field has focus;
     • touches the dock only when the dock is genuinely untidy;
     • never re-points activeTab more than once;
     • can be switched off entirely with ?notidy=1.
   ===================================================================== */
(function () {
  "use strict";
  if (window.__v443) return;
  window.__v443 = true;

  var OFF = false;
  try { OFF = new URLSearchParams(location.search).get("notidy") === "1"; } catch (e) {}
  if (OFF) { try { console.log("[v4.46] tidy layer disabled by ?notidy=1"); } catch (e) {} return; }

  var LOG = [];
  function note(s) { LOG.push(s); if (LOG.length > 240) LOG.shift(); }
  function screenEl() { return document.getElementById("screen"); }
  function ui() { try { return (window.G && window.G.ui) || {}; } catch (e) { return {}; } }
  function txt(n) { try { return (n && n.textContent ? n.textContent : "").replace(/\s+/g, " ").trim(); } catch (e) { return ""; } }

  /* ---------------------------------------------------------------
     0. When to keep our hands entirely to ourselves
     --------------------------------------------------------------- */
  function busyElsewhere() {
    /* the sign-in gate is mounted */
    if (document.getElementById("nbGate")) return true;
    /* onboarding / new-company flow is visible */
    try {
      var ob = document.getElementById("onboard");
      if (ob && ob.style.display !== "none" && ob.offsetParent !== null && ob.childNodes.length) return true;
    } catch (e) {}
    /* a modal is open */
    try {
      var mo = document.getElementById("modalOverlay");
      if (mo && mo.offsetParent !== null && txt(mo)) return true;
    } catch (e) {}
    /* the player is typing or has something focused */
    try {
      var a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
      if (a && a.isContentEditable) return true;
    } catch (e) {}
    /* no game yet — nothing to tidy */
    try { if (!window.G || !window.G.company) return true; } catch (e) { return true; }
    return false;
  }

  /* ---------------------------------------------------------------
     1. Industry helpers
     --------------------------------------------------------------- */
  function industryKey() {
    try { if (typeof window.IND === "function") return window.IND(); } catch (e) {}
    try { return (window.G && window.G.company && window.G.company.industry) || ""; } catch (e) { return ""; }
  }
  function industryCfg() {
    try { return (window.INDUSTRIES || {})[industryKey()] || null; } catch (e) { return null; }
  }
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
     2. Sub-tab hygiene on the Expansion screen
     --------------------------------------------------------------- */
  var KEEP_SEL = "[data-v442go],[data-v442],[data-v436up],.hq-photo,.fac-card,.v47-hqcard";
  var KEEP_TEXT = /\b(hq|headquarters?|facilit|workspace|office|move[- ]in|lease|square feet|seats?)\b/i;
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
    if (u.v417ExpSub === "growth") return;

    var cards = s.querySelectorAll(".card");
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (c.getAttribute("data-v443hid") === "1") continue;
      if (c.querySelector("input,textarea,select")) continue;    /* never hide a form */
      if (c.querySelector(KEEP_SEL)) continue;
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
     3. Dock hygiene — one home per screen (only when untidy)
     --------------------------------------------------------------- */
  var HOMES = [
    { item: /^(marketing|channels?|campaigns?)$/i, group: /growth/i },
    { item: /^(market|markets|rivals)$/i, group: /growth/i },
    { item: /^(expansion|facilities|hq)$/i, group: /^hq$|headquarter/i }
  ];

  function groups() { try { return window.DOCK_GROUPS || null; } catch (e) { return null; } }
  function items() { try { return window.DOCK_ITEMS || null; } catch (e) { return null; } }

  function dockSig() {
    var gs = groups(); if (!gs) return "";
    var out = [];
    for (var i = 0; i < gs.length; i++) if (gs[i]) out.push((gs[i].id || "") + ":" + (gs[i].items || []).join(","));
    return out.join("|");
  }

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

  var lastDockSig = null;

  function tidyDock() {
    var gs = groups(); if (!gs) return;
    var sig = dockSig();
    if (sig === lastDockSig) return;        /* already tidy, or unchanged */

    for (var r = 0; r < HOMES.length; r++) {
      var rule = HOMES[r];
      var home = findGroup(rule.group);
      if (!home || !home.items) continue;

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
            note("dock: removed \"" + id2 + "\" from \"" + (gg.id || gg.label) + "\"");
            at = gg.items.indexOf(id2);
          }
        }
        if (home.items.indexOf(id2) < 0) {
          home.items.push(id2);
          note("dock: placed \"" + id2 + "\" in \"" + (home.id || home.label) + "\"");
        }
      }
    }

    var seen = {};
    for (var a = 0; a < gs.length; a++) {
      var grp = gs[a]; if (!grp || !grp.items) continue;
      for (var b = grp.items.length - 1; b >= 0; b--) {
        if (seen[grp.items[b]]) { note("dock: de-duped \"" + grp.items[b] + "\""); grp.items.splice(b, 1); }
      }
      for (var c2 = 0; c2 < grp.items.length; c2++) seen[grp.items[c2]] = 1;
    }

    lastDockSig = dockSig();
  }

  /* ---------------------------------------------------------------
     4. Industry Ops — present only where the industry has ops
     --------------------------------------------------------------- */
  var opsHome = null;
  var bouncedOnce = false;

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
        lastDockSig = null;
        note("ops: withdrew \"" + id + "\" (" + (industryKey() || "unknown") + " has no industry ops)");
      }
    }
    if (want && opsHome) {
      var host = null;
      for (var m = 0; m < gs.length; m++) if (gs[m] && gs[m].id === opsHome.groupId) host = gs[m];
      if (host && host.items && host.items.indexOf(id) < 0) {
        host.items.splice(Math.min(opsHome.index, host.items.length), 0, id);
        lastDockSig = null;
        note("ops: restored \"" + id + "\"");
      }
    }

    /* move the player off a withdrawn tab — once only, never in a loop */
    try {
      if (!want && !bouncedOnce && window.G && window.G.ui && window.G.ui.activeTab === id) {
        bouncedOnce = true;
        window.G.ui.activeTab = "decisions";
      }
    } catch (e) {}
  }

  /* ---------------------------------------------------------------
     5. Hiring relevance — no drivers in a software company
     --------------------------------------------------------------- */
  var FLEET_TEXT = /(owner[\u2011\u2013\u2014-]?operator|dry van|reefer|flatbed|day\s?cab|sleeper cab|lead driver|driver\s*\/?\s*trainer|\bdriver\b|\bdispatcher\b|fleet operations|safety\s*&?\s*compliance|freight)/i;
  var ROW_SEL = ".row,.hrow,.rung,.hire,.hire-row,li,tr";

  function hideRow(node, why) {
    var row = node;
    try { if (node.closest) row = node.closest(ROW_SEL) || node; } catch (e) {}
    if (!row || row.getAttribute("data-v443hid") === "1") return;
    if (row.id === "screen" || (row.classList && row.classList.contains("card"))) row = node;
    if (row.querySelector && row.querySelector("input,textarea,select")) return;
    row.style.display = "none";
    row.setAttribute("data-v443hid", "1");
    note("hiring: hid " + why);
  }

  function tidyHiring() {
    if (isFleet()) return;
    var s = screenEl(); if (!s) return;

    var flagged = s.querySelectorAll("[data-key],[data-rung],[data-hire],[data-role],[data-promote]");
    for (var i = 0; i < flagged.length; i++) {
      var n = flagged[i], at = n.attributes, hit = false;
      for (var j = 0; j < at.length; j++) {
        if (String(at[j].value).indexOf("v428_") >= 0) { hit = true; break; }
      }
      if (hit) hideRow(n, String(n.getAttribute("data-key") || "v428_ element"));
    }

    var rows = s.querySelectorAll(ROW_SEL);
    for (var k = 0; k < rows.length; k++) {
      var r = rows[k];
      if (r.getAttribute("data-v443hid") === "1") continue;
      if (r.querySelector("input,textarea,select")) continue;
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
     6. Sweep — slow, idle-only, and change-driven
     --------------------------------------------------------------- */
  var busy = false;
  var lastSig = "";

  function screenSig() {
    var s = screenEl();
    var u = ui();
    return (u.activeTab || "") + "/" + (u.v417ExpSub || "") + "/" + (s ? s.childNodes.length : -1)
         + "/" + (s ? (s.firstElementChild ? txt(s.firstElementChild).slice(0, 40) : "") : "");
  }

  function sweep(force) {
    if (busy) return;
    if (busyElsewhere()) return;
    var sig = screenSig();
    if (!force && sig === lastSig) return;
    lastSig = sig;
    busy = true;
    try { tidyDock(); } catch (e) {}
    try { tidyOps(); } catch (e) {}
    try { tidySubTabs(); } catch (e) {}
    try { tidyHiring(); } catch (e) {}
    busy = false;
  }

  setInterval(function () { try { sweep(false); } catch (e) {} }, 1200);

  /* ---------------------------------------------------------------
     7. Diagnostics
     --------------------------------------------------------------- */
  window.NBTidy = {
    version: "4.46",
    sweep: function () { return sweep(true); },
    log: function () { return LOG.slice(); },
    report: function () {
      var out = { version: "4.46" };
      try { out.industry = industryKey(); } catch (e) {}
      try { out.isFleet = isFleet(); out.opsWanted = opsWanted(); out.opsItem = opsItemId(); } catch (e) {}
      try { out.activeTab = ui().activeTab; out.expSub = ui().v417ExpSub; } catch (e) {}
      try { out.holdingOff = busyElsewhere(); } catch (e) {}
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
