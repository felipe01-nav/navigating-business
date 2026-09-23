/* 115-icons-apply.js — v4.71
   =====================================================================
   WHY THIS FILE EXISTS
   --------------------
   113-icons.js shipped the icon payload correctly and then failed to
   install a single glyph, because it assumed DOCK_GROUPS and DOCK_ITEMS
   were objects keyed by id:

       Object.keys(groups).forEach(k => ... GROUP_ICON[k] ...)

   They are not. Both are ARRAYS of objects carrying an .id field — as
   104-dock-shape.js and 101-rnd-patch.js both demonstrate. Every lookup
   therefore missed, apply() returned 0, and the dock kept its emoji
   without complaint.

   This layer redoes the application against the real shape, reusing the
   payload and mappings already exposed on window.NBIcons. It tolerates
   either shape, so it will survive if art-core is ever refactored.

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
  function note(s) { LOG.push(s); if (LOG.length > 60) LOG.shift(); }

  function lex(name) {
    try { return (0, eval)("typeof " + name + " !== 'undefined' ? " + name + " : null"); }
    catch (e) { return null; }
  }

  function api() { return window.NBIcons || null; }

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
    if (!A || !A.data) return 0;

    var groups = lex("DOCK_GROUPS");
    var items  = lex("DOCK_ITEMS");
    var n = 0;

    each(groups, function (id, g) {
      var key = A.groupMap && A.groupMap[id];
      if (!key || !A.data[key] || isTagged(g.icon)) return;
      if (!(id in orig.groups)) orig.groups[id] = g.icon;
      g.icon = A.tag(key, true);
      n++;
      note("group " + id + " -> " + key);
    });

    each(items, function (id, it) {
      var key = A.itemMap && A.itemMap[id];
      if (!key || !A.data[key] || isTagged(it.icon)) return;
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
    apply: function () { return apply(); },
    revert: revert,
    report: function () {
      var A = api();
      var groups = lex("DOCK_GROUPS"), items = lex("DOCK_ITEMS");
      var gShape = Object.prototype.toString.call(groups);
      var out = {
        version: "4.71",
        payloadPresent: !!(A && A.data),
        icons: A && A.data ? Object.keys(A.data).length : 0,
        groupsShape: gShape,
        groupIds: [], itemIds: [],
        installed: applied,
        actions: LOG.slice(-25)
      };
      each(groups, function (id, g) { out.groupIds.push(id + (isTagged(g.icon) ? "*" : "")); });
      each(items,  function (id, it) { out.itemIds.push(id + (isTagged(it.icon) ? "*" : "")); });
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try { console.log("[v4.71] icon application corrected — array-shaped dock (* = icon installed)."); } catch (e) {}
})();
