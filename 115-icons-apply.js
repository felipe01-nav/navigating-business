/* 115-icons-apply.js — v4.71
   =====================================================================
   WHY THIS FILE EXISTS
   --------------------
   113-icons.js shipped the icon payload correctly and then installed
   nothing, because it assumed DOCK_GROUPS and DOCK_ITEMS were objects
   keyed by id:

       Object.keys(groups).forEach(k => ... GROUP_ICON[k] ...)

   They are not. Both are ARRAYS of objects carrying an .id field — as
   104-dock-shape.js and 101-rnd-patch.js both demonstrate. Every lookup
   missed, apply() returned 0, and the dock kept its emoji in silence.

   This layer redoes the application against the real shape, reusing the
   payload and mappings already exposed on window.NBIcons. Resolution is
   attempted three ways — exact id, alias, then lowercased label — so a
   group id that differs from expectation (the Growth group's id is
   still "rivals", for instance) is still served.

   Loads after 113-icons.js. Disabled by ?noicons=1 or ?safe=1.
   Diagnostics: NBIconsApply.report()
   ===================================================================== */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](noicons|safe)=1/.test(q)) return;
  if (window.__nbIconsApply471) return;
  window.__nbIconsApply471 = true;

  var LOG = [];
  function note(s) { LOG.push(s); if (LOG.length > 80) LOG.shift(); }

  function lex(name) {
    try { return (0, eval)("typeof " + name + " !== 'undefined' ? " + name + " : null"); }
    catch (e) { return null; }
  }

  function api() { return window.NBIcons || null; }

  /* Synonyms for whatever the dock happens to call a slot. Only the
     twelve icons of sheet 1 appear here; later sheets extend the maps
     on NBIcons and are picked up automatically. */
  var GROUP_ALIAS = {
    run: "compass", ops: "compass", operate: "compass", decide: "compass",
    people: "people", team: "people", hr: "people",
    market: "box", product: "box", rivals: "box", growth: "box",
    empire: "crane", build: "crane", expansion: "crane",
    life: "house", personal: "house", home: "house",
    jarvis: "robot", ai: "robot", assistant: "robot", felipe: "robot",
    system: "save", saves: "save", settings: "save"
  };

  var ITEM_ALIAS = {
    bank: "bank", finance: "chart", financials: "chart",
    decisions: "compass", decide: "compass",
    team: "people", clients: "handshake", customers: "handshake",
    product: "box", personal: "house", market: "bag", shop: "bag",
    assistant: "robot", saves: "save", industry: "factory", empire: "crane"
  };

  function resolve(id, entry, primary, alias) {
    var A = api(); if (!A || !A.data) return null;
    var key = primary && primary[id];
    if (!key) key = alias[id];
    if (!key && entry && entry.label) {
      key = alias[String(entry.label).toLowerCase().replace(/[^a-z]/g, "")];
    }
    return (key && A.data[key]) ? key : null;
  }

  function isTagged(s) {
    return typeof s === "string" && s.indexOf("data-nb-ico=") !== -1;
  }

  /* Walk either an array of {id,...} or an object keyed by id. */
  function each(coll, fn) {
    if (!coll) return;
    if (Object.prototype.toString.call(coll) === "[object Array]") {
      for (var i = 0; i < coll.length; i++) {
        var e = coll[i];
        if (e && e.id) fn(String(e.id), e);
      }
    } else {
      for (var k in coll) {
        if (!Object.prototype.hasOwnProperty.call(coll, k)) continue;
        if (coll[k] && typeof coll[k] === "object") fn(String(coll[k].id || k), coll[k]);
      }
    }
  }

  var orig = { groups: {}, items: {} };
  var applied = 0;

  function apply() {
    var A = api();
    if (!A || !A.data || !A.tag) return 0;

    var groups = lex("DOCK_GROUPS");
    var items  = lex("DOCK_ITEMS");
    var n = 0;

    each(groups, function (id, g) {
      if (isTagged(g.icon)) return;
      var key = resolve(id, g, A.groupMap, GROUP_ALIAS);
      if (!key) return;
      if (!(id in orig.groups)) orig.groups[id] = g.icon;
      g.icon = A.tag(key, true);
      n++;
      note("group " + id + " -> " + key);
    });

    each(items, function (id, it) {
      if (isTagged(it.icon)) return;
      var key = resolve(id, it, A.itemMap, ITEM_ALIAS);
      if (!key) return;
      if (!(id in orig.items)) orig.items[id] = it.icon;
      it.icon = A.tag(key, false);
      n++;
      note("item " + id + " -> " + key);
    });

    if (n) {
      applied += n;
      try { if (typeof window.renderDock === "function") window.renderDock(); } catch (e) {}
      try { if (typeof window.renderScreen === "function") window.renderScreen(); } catch (e) {}
    }
    return n;
  }

  function revert() {
    var groups = lex("DOCK_GROUPS"), items = lex("DOCK_ITEMS");
    each(groups, function (id, g) { if (id in orig.groups) g.icon = orig.groups[id]; });
    each(items,  function (id, it) { if (id in orig.items)  it.icon = orig.items[id]; });
    try { if (typeof window.renderDock === "function") window.renderDock(); } catch (e) {}
    try { if (typeof window.renderScreen === "function") window.renderScreen(); } catch (e) {}
  }

  function tick() { try { apply(); } catch (e) {} }

  tick();
  setTimeout(tick, 0);
  setTimeout(tick, 400);
  setTimeout(tick, 1200);
  try { document.addEventListener("DOMContentLoaded", tick); } catch (e) {}
  /* Other layers rewrite these arrays on a timer; keep pace, cheaply. */
  setInterval(tick, 1000);

  window.NBIconsApply = {
    version: "4.71",
    apply: apply,
    revert: revert,
    report: function () {
      var A = api();
      var groups = lex("DOCK_GROUPS"), items = lex("DOCK_ITEMS");
      var out = {
        version: "4.71",
        payloadPresent: !!(A && A.data),
        icons: A && A.data ? Object.keys(A.data).length : 0,
        groupsShape: Object.prototype.toString.call(groups),
        groups: [], items: [],
        installed: applied,
        actions: LOG.slice(-25)
      };
      each(groups, function (id, g) { out.groups.push(id + (isTagged(g.icon) ? " *" : " \u2014")); });
      each(items,  function (id, it) { out.items.push(id + (isTagged(it.icon) ? " *" : " \u2014")); });
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try { console.log("[v4.71] icon application corrected — array-shaped dock (* = icon installed)."); } catch (e) {}
})();
