/* 120-icons-glyphs.js — v4.74
   =====================================================================
   Sheets 1 and 3-6 of the custom icon set, applied by GLYPH rather than
   by key.

   WHY BY GLYPH
   ------------
   113-icons.js and 115-icons-apply.js reach the dock, because the dock is
   a pair of arrays this code can see. Everything else — industry cards,
   facility rows, HR tabs, ladder rungs, advisor alerts, the sixteen
   personal-life activities — has its emoji written inline at the call
   site inside art-core.js, which is 2.7 MB and cannot be edited through
   the file API. Chasing each of those structures would mean a patch layer
   per bundle. Matching the rendered glyph instead costs one sweep and
   reaches all of them at once, including any a later layer adds.

   NEW IN 4.74 — NO MORE FLICKER
   -----------------------------
   Reported: "the icons switch between different versions when I click on
   the page." They were not switching between versions; they were
   alternating between the emoji and the icon. Every click re-renders a
   screen, art-core rebuilds the HTML with its inline emoji, and this
   layer only found out afterwards — via a MutationObserver debounced by
   120 ms. That gap is long enough to see, and 115 (1 s interval) and 117
   (1.5 s interval) each added their own beat on the dock.

   The fix is to stop reacting after the fact. renderScreen, renderDock,
   renderAll and render are wrapped, so the sweep runs synchronously at
   the end of the render that produced the emoji, before the browser gets
   a chance to paint. The emoji therefore never reach the screen.

   The observer stays as a backstop for DOM written outside those four
   functions, but its debounce is now a requestAnimationFrame rather than
   120 ms. Other layers wrap the same render functions on their own
   schedule and sometimes replace them outright, so the hooks are
   re-checked every 2 s and re-applied if lost.

   Sheet 1 keys resolve through NBIcons.uri(); sheets 3-6 resolve to files
   in art/. If sheet 1 is absent or disabled, its glyphs are left alone
   rather than rendered broken.

   Off with ?noicons2=1, ?noicons=1 or ?safe=1.
   Diagnostics: NBIcons2.report() / .apply() / .revert()
   ===================================================================== */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](noicons2|noicons|safe)=1/.test(q)) {
    try { console.log("[icons2] disabled by query flag"); } catch (e) {}
    return;
  }
  if (window.__nbIcons472) return;
  window.__nbIcons472 = true;

  var BASE = "art/";

  /* Sheet 1, inline base64 on window.NBIcons. Keys confirmed against
     113-icons.js: compass, people, box, crane, house, robot, save, bank,
     chart, handshake, bag, factory. "robot" is not listed here — sheet 5's
     robotarm already answers \uD83E\uDD16 and reads better at 21px. */
  var SHEET1 = {
    compass:   ["\uD83E\uDDED"],
    people:    ["\uD83D\uDC65"],
    handshake: ["\uD83E\uDD1D"],
    save:      ["\uD83D\uDCBE"],
    bank:      ["\uD83C\uDFE6"],
    chart:     ["\uD83D\uDCC8", "\uD83D\uDCB9"],
    crane:     ["\uD83C\uDFD7\uFE0F", "\uD83C\uDFD7"],
    house:     ["\uD83C\uDFE0", "\uD83C\uDFE1"],
    factory:   ["\uD83C\uDFED"],
    box:       ["\uD83D\uDCE6"],
    bag:       ["\uD83D\uDECD\uFE0F", "\uD83D\uDECD", "\uD83D\uDED2"]
  };

  /* key -> one or more glyphs. Longest match wins, so ZWJ sequences are
     listed before the bare figure they are built from. "tower" is absent
     on purpose: art/tower.webp is the property-ladder house. */
  var MAP = {
    /* sheet 3 */
    scales:    ["\u2696\uFE0F", "\u2696"],
    shield:    ["\uD83D\uDEE1\uFE0F", "\uD83D\uDEE1"],
    clipboard: ["\uD83D\uDCCB"],
    target:    ["\uD83C\uDFAF"],
    crown:     ["\uD83D\uDC51"],
    necktie:   ["\uD83D\uDC54"],
    document:  ["\uD83D\uDCC4", "\uD83D\uDCC3"],
    scroll:    ["\uD83D\uDCDC"],
    siren:     ["\uD83D\uDEA8"],
    warning:   ["\u26A0\uFE0F", "\u26A0"],
    bolt:      ["\u26A1\uFE0F", "\u26A1"],
    swords:    ["\u2694\uFE0F", "\u2694"],
    /* sheet 4 */
    headset:   ["\uD83C\uDFA7", "\u260E\uFE0F"],
    megaphone: ["\uD83D\uDCE3", "\uD83D\uDCE2"],
    newspaper: ["\uD83D\uDCF0", "\uD83D\uDDDE\uFE0F"],
    books:     ["\uD83D\uDCDA", "\uD83D\uDCD6", "\uD83D\uDCD8"],
    receipt:   ["\uD83E\uDDFE"],
    banknote:  ["\uD83D\uDCB5", "\uD83D\uDCB4", "\uD83D\uDCB6", "\uD83D\uDCB7", "\uD83D\uDCB0"],
    building:  ["\uD83C\uDFE2", "\uD83C\uDFEC", "\uD83C\uDFDB\uFE0F", "\uD83C\uDFDB"],
    truck:     ["\uD83D\uDE9A", "\uD83D\uDE9B"],
    pin:       ["\uD83D\uDCCD", "\uD83D\uDCCC"],
    chain:     ["\uD83D\uDD17", "\u26D3\uFE0F"],
    frost:     ["\u2744\uFE0F", "\u2744", "\uD83E\uDD76"],
    /* sheet 5 */
    dining:    ["\uD83C\uDF7D\uFE0F", "\uD83C\uDF7D", "\uD83C\uDF74"],
    robotarm:  ["\uD83E\uDDBE", "\uD83E\uDD16"],
    salon:     ["\uD83D\uDC85", "\uD83D\uDC87"],
    party:     ["\uD83C\uDF89", "\uD83C\uDF8A"],
    graduate:  ["\uD83C\uDF93", "\uD83C\uDFEB"],
    dumbbell:  ["\uD83C\uDFCB\uFE0F\u200D\u2642\uFE0F", "\uD83C\uDFCB\uFE0F", "\uD83C\uDFCB", "\uD83D\uDCAA"],
    runner:    ["\uD83C\uDFC3\u200D\u2642\uFE0F", "\uD83C\uDFC3\u200D\u2640\uFE0F", "\uD83C\uDFC3"],
    brain:     ["\uD83E\uDDE0"],
    lotus:     ["\uD83E\uDDD8\u200D\u2642\uFE0F", "\uD83E\uDDD8\u200D\u2640\uFE0F", "\uD83E\uDDD8"],
    skillet:   ["\uD83C\uDF73", "\uD83C\uDF5B"],
    boot:      ["\uD83E\uDD7E", "\uD83D\uDC62"],
    guitar:    ["\uD83C\uDFB8", "\uD83C\uDFB5"],
    /* sheet 6 */
    picture:   ["\uD83D\uDDBC\uFE0F", "\uD83D\uDDBC", "\uD83C\uDFA8"],
    golf:      ["\u26F3", "\uD83C\uDFCC\uFE0F"],
    spa:       ["\uD83D\uDC86", "\uD83E\uDDD6", "\u2668\uFE0F"],
    phoneoff:  ["\uD83D\uDCF5", "\uD83D\uDD15"],
    wine:      ["\uD83C\uDF77", "\uD83C\uDF7E"],
    watch:     ["\u231A", "\u23F1\uFE0F"],
    flag:      ["\uD83C\uDFC1", "\uD83D\uDEA9"],
    fish:      ["\uD83D\uDC1F", "\uD83C\uDFA3"],
    wave:      ["\uD83C\uDF0A"],
    sailboat:  ["\u26F5"],
    arrowup:   ["\u2B06\uFE0F", "\u2B06", "\uD83D\uDD3C"],
    arrowdown: ["\u2B07\uFE0F", "\u2B07", "\uD83D\uDD3D", "\uD83D\uDCC9"]
  };

  /* Merge sheet 1 in, remembering which side each key came from. */
  var FROM_SHEET1 = {};
  Object.keys(SHEET1).forEach(function (k) {
    FROM_SHEET1[k] = true;
    MAP[k] = SHEET1[k];
  });

  /* Flattened, longest first, so "runner + ZWJ + male sign" is consumed
     whole instead of leaving an orphan gender sign behind. */
  var PAIRS = [];
  Object.keys(MAP).forEach(function (key) {
    MAP[key].forEach(function (g) { PAIRS.push({ g: g, key: key }); });
  });
  PAIRS.sort(function (a, b) { return b.g.length - a.g.length; });

  var BY_GLYPH = {};
  var RE_SRC = PAIRS.map(function (p) {
    BY_GLYPH[p.g] = p.key;
    return p.g.split("").map(function (c) {
      return "\\u" + ("000" + c.charCodeAt(0).toString(16)).slice(-4);
    }).join("");
  }).join("|");
  var GLYPH_RE = new RegExp(RE_SRC, "g");

  var loaded = {};
  var deferred = {};

  function src(key) {
    if (!FROM_SHEET1[key]) return BASE + key + ".webp";
    var A = window.NBIcons;
    if (!A || typeof A.uri !== "function") return "";
    try { return A.uri(key) || ""; } catch (e) { return ""; }
  }

  /* Returns "" when a sheet 1 icon is not available yet; the caller then
     leaves the original glyph in place and tries again on a later pass. */
  function tag(key) {
    var u = src(key);
    if (!u) { deferred[key] = (deferred[key] || 0) + 1; return ""; }
    loaded[key] = (loaded[key] || 0) + 1;
    return '<img class="nb-ico" data-nb-ico="' + key + '" src="' + u + '" alt="" />';
  }

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* 113-icons.js injects .nb-ico sizing. Repeat it under our own id so
     this layer still looks right if sheet 1 is ever pulled. */
  function css() {
    if (document.getElementById("nb-icons-css")) return;
    if (document.getElementById("nb-icons2-css")) return;
    var s = document.createElement("style");
    s.id = "nb-icons2-css";
    s.textContent =
      ".nb-ico{width:21px;height:21px;vertical-align:-4px;display:inline-block;" +
      "image-rendering:auto;flex:0 0 auto}" +
      ".nb-ico-lg,.dock-btn .nb-ico{width:26px;height:26px;vertical-align:-6px}" +
      "button .nb-ico{width:17px;height:17px;vertical-align:-3px}" +
      "@media (max-width:780px){.dock-btn .nb-ico{width:24px;height:24px}}";
    (document.body || document.documentElement).appendChild(s);
  }

  /* ------------------------------------------------------------------
     1. Dock data: the entries sheet 1 had no icon for.
     ------------------------------------------------------------------ */
  var DOCK_ITEM_ICON = {
    rivals: "swords", competitors: "swords",
    taxes: "receipt", board: "necktie", log: "scroll",
    leaderboard: "crown", facilities: "building", legal: "scales"
  };

  function ev(name) {
    try { return (0, eval)("typeof " + name + " !== 'undefined' ? " + name + " : null"); }
    catch (e) { return null; }
  }

  function isTagged(s) {
    return typeof s === "string" && s.indexOf("data-nb-ico=") !== -1;
  }

  var origItems = {};
  var dockDirty = false;

  /* Mutates the dock arrays only. Never calls renderDock itself: when
     this runs inside a wrapped render, the caller is already painting,
     and a nested render would be both wasted work and a recursion risk.
     The flag is drained by run() once the sweep is finished. */
  function applyDock() {
    var items = ev("DOCK_ITEMS"), n = 0;
    if (!items || Object.prototype.toString.call(items) !== "[object Array]") return 0;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || !it.id) continue;
      var key = DOCK_ITEM_ICON[String(it.id)];
      if (!key || isTagged(it.icon)) continue;
      var t = tag(key);
      if (!t) continue;
      if (!(it.id in origItems)) origItems[it.id] = it.icon;
      it.icon = t;
      n++;
    }
    if (n) dockDirty = true;
    return n;
  }

  /* ------------------------------------------------------------------
     2. Rendered text: everything art-core writes inline.
     ------------------------------------------------------------------ */
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, CODE: 1, PRE: 1 };

  /* Leftovers, for the next sheet's shopping list. */
  var UNMAPPED_RE = /[\u2600-\u27BF\uFE0F]|[\uD83C-\uD83E][\uDC00-\uDFFF]/g;
  var unmapped = {};
  var swept = 0;

  function convert(text) {
    GLYPH_RE.lastIndex = 0;
    if (!GLYPH_RE.test(text)) return null;
    GLYPH_RE.lastIndex = 0;
    var any = false;
    var html = esc(text).replace(GLYPH_RE, function (m) {
      var t = tag(BY_GLYPH[m]);
      if (!t) return esc(m);
      any = true;
      return t;
    });
    return any ? html : null;
  }

  function sweep(root) {
    if (!root || !document.createTreeWalker) return 0;
    var walker, node, jobs = [], n = 0;
    try {
      walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    } catch (e) { return 0; }
    while ((node = walker.nextNode())) {
      var t = node.nodeValue;
      if (!t || t.length > 4000) continue;
      var parent = node.parentNode;
      if (!parent || SKIP[parent.nodeName]) continue;
      if (parent.isContentEditable) continue;
      if (parent.hasAttribute && parent.hasAttribute("data-nb-noico")) continue;
      /* Cheap pre-filter: pure ASCII cannot contain an emoji. */
      if (!/[^\x00-\x7F]/.test(t)) continue;
      jobs.push(node);
    }
    for (var j = 0; j < jobs.length; j++) {
      var nd = jobs[j], html = convert(nd.nodeValue);
      if (html === null) {
        var left = nd.nodeValue.match(UNMAPPED_RE);
        if (left) for (var k = 0; k < left.length; k++) {
          if (left[k] === "\uFE0F") continue;
          unmapped[left[k]] = (unmapped[left[k]] || 0) + 1;
        }
        continue;
      }
      var span = document.createElement("span");
      span.className = "nb-ico-wrap";
      span.innerHTML = html;
      try { nd.parentNode.replaceChild(span, nd); n++; } catch (e) {}
    }
    swept += n;
    return n;
  }

  /* ------------------------------------------------------------------
     3. Running the sweep.
     ------------------------------------------------------------------ */
  var busy = false, rafId = null, runs = 0;

  function run() {
    if (busy) return 0;
    busy = true;
    runs++;
    var n = 0;
    try {
      css();
      n += applyDock();
      n += sweep(document.getElementById("app") || document.body);
      var ov = document.getElementById("modalOverlay");
      if (ov) n += sweep(ov);
      var ob = document.getElementById("onboard");
      if (ob) n += sweep(ob);
    } catch (e) {
      try { console.warn("[icons2]", e); } catch (e2) {}
    }
    busy = false;

    /* Drained outside the guard, so the resulting render re-enters
       cleanly and picks the new dock strings up. */
    if (dockDirty) {
      dockDirty = false;
      try { if (typeof window.renderDock === "function") window.renderDock(); } catch (e) {}
    }
    return n;
  }

  function schedule() {
    if (rafId !== null) return;
    var raf = window.requestAnimationFrame;
    if (typeof raf !== "function") {
      rafId = setTimeout(function () { rafId = null; run(); }, 16);
      return;
    }
    rafId = raf(function () { rafId = null; run(); });
  }

  /* ------------------------------------------------------------------
     4. Render hooks — the actual flicker fix.

     The emoji are written by these functions. Sweeping at the end of the
     same call means the replacement happens before the browser paints,
     so the raw emoji is never visible. Other layers wrap the same names
     and occasionally replace them outright, so the hooks are re-checked
     periodically and re-applied when lost.
     ------------------------------------------------------------------ */
  var HOOKS = ["renderScreen", "renderDock", "renderAll", "render"];
  var hooked = {};

  function hook() {
    for (var i = 0; i < HOOKS.length; i++) {
      var name = HOOKS[i];
      var fn = window[name];
      if (typeof fn !== "function" || fn.__nbIcons2) continue;
      window[name] = (function (inner) {
        function wrapped() {
          var out = inner.apply(this, arguments);
          try { run(); } catch (e) {}
          return out;
        }
        wrapped.__nbIcons2 = true;
        wrapped.__nbInner = inner;
        return wrapped;
      })(fn);
      hooked[name] = (hooked[name] || 0) + 1;
    }
  }

  function unhook() {
    for (var i = 0; i < HOOKS.length; i++) {
      var name = HOOKS[i], fn = window[name];
      if (fn && fn.__nbIcons2 && typeof fn.__nbInner === "function") window[name] = fn.__nbInner;
    }
  }

  function observe() {
    if (window.__nbIcons2Observer) return;
    if (!window.MutationObserver) { setInterval(run, 1500); return; }
    var target = document.getElementById("app") || document.body;
    if (!target) { setTimeout(observe, 200); return; }
    var mo = new MutationObserver(function () { schedule(); });
    mo.observe(target, { childList: true, subtree: true, characterData: true });
    var ov = document.getElementById("modalOverlay");
    if (ov) mo.observe(ov, { childList: true, subtree: true, characterData: true });
    window.__nbIcons2Observer = mo;
  }

  hook();
  run();
  setTimeout(function () { hook(); run(); }, 0);
  setTimeout(function () { hook(); run(); }, 500);
  setTimeout(function () { hook(); run(); }, 1500);
  /* Cheap: four typeof checks. Catches any later layer that replaces a
     render function rather than wrapping it. */
  setInterval(hook, 2000);
  try { document.addEventListener("DOMContentLoaded", function () { hook(); run(); observe(); }); } catch (e) {}
  if (document.readyState === "complete" || document.readyState === "interactive") observe();

  function revert() {
    unhook();
    var items = ev("DOCK_ITEMS");
    if (items && items.length) {
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it && it.id && (it.id in origItems)) it.icon = origItems[it.id];
      }
    }
    try { if (window.__nbIcons2Observer) window.__nbIcons2Observer.disconnect(); } catch (e) {}
    window.__nbIcons2Observer = null;
    try { if (typeof window.renderDock === "function") window.renderDock(); } catch (e) {}
    try { if (typeof window.renderAll === "function") window.renderAll(); } catch (e) {}
  }

  window.NBIcons2 = {
    version: "4.74",
    keys: Object.keys(MAP),
    sheet1: Object.keys(SHEET1),
    apply: run,
    revert: revert,
    sweep: sweep,
    hook: hook,
    report: function () {
      var placed = [], zero = [];
      Object.keys(MAP).forEach(function (k) {
        var label = k + (FROM_SHEET1[k] ? " [s1]" : "");
        (loaded[k] ? placed : zero).push(label + (loaded[k] ? " x" + loaded[k] : ""));
      });
      var rest = Object.keys(unmapped).map(function (g) {
        return g + " x" + unmapped[g] + " (" + g.split("").map(function (c) {
          return "\\u" + c.charCodeAt(0).toString(16).toUpperCase();
        }).join("") + ")";
      });
      var live = [];
      HOOKS.forEach(function (nm) {
        var f = window[nm];
        if (typeof f === "function") live.push(nm + (f.__nbIcons2 ? " *" : " \u2014"));
      });
      var out = {
        version: "4.74",
        files: BASE,
        mapped: Object.keys(MAP).length,
        nodesReplaced: swept,
        sweeps: runs,
        renderHooks: live,
        hookInstalls: hooked,
        placed: placed,
        neverSeen: zero,
        unresolvedSheet1: Object.keys(deferred),
        unmappedGlyphs: rest
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try { console.log("[v4.74] icons applied inside render — no emoji flash. NBIcons2.report()"); } catch (e) {}
})();
