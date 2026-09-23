/* 121-icons-sheet2.js — v4.74
   =====================================================================
   The seven genuinely new icons from sheet 2: chat, camera, star, medal,
   globe, person, lock. (Sheet 2 also repeated house, robot, save, bank
   and handshake in a lighter treatment; those were set aside rather than
   overwriting sheet 1.)

   Unlike 120, this layer PROBES art/<key>.webp before mapping anything.
   The files arrive by hand upload, so a build may ship before they do,
   and a confident <img> pointing at a missing file is worse than the
   emoji it replaced. No file, no mapping, no broken image.

   Off with ?noicons3=1, ?noicons=1 or ?safe=1.
   Diagnostics: NBIcons3.report()
   ===================================================================== */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](noicons3|noicons|safe)=1/.test(q)) return;
  if (window.__nbIcons474) return;
  window.__nbIcons474 = true;

  var BASE = "art/";

  var GLYPHS = {
    chat:   ["\uD83D\uDCAC", "\uD83D\uDDE8\uFE0F", "\uD83D\uDDE8"],
    camera: ["\uD83C\uDFA5", "\uD83D\uDCF9", "\uD83D\uDCF7"],
    star:   ["\uD83C\uDF1F", "\u2B50\uFE0F", "\u2B50", "\u2728"],
    medal:  ["\uD83C\uDFC5", "\uD83E\uDD47", "\uD83C\uDF96\uFE0F"],
    globe:  ["\uD83C\uDF0D", "\uD83C\uDF0E", "\uD83C\uDF0F", "\uD83C\uDF10"],
    person: ["\uD83D\uDC64", "\uD83E\uDDD1"],
    lock:   ["\uD83D\uDD12", "\uD83D\uDD10", "\uD83D\uDD13"]
  };

  /* Dock slots that carry no useful emoji at all. */
  var DOCK_ITEM_ICON = {
    slack: "chat", chat: "chat", messages: "chat",
    zoom: "camera", meetings: "camera", calls: "camera",
    life: "star", lifestyle: "star",
    milestones: "medal", achievements: "medal",
    world: "globe", markets: "globe", territories: "globe",
    profile: "person", account: "person", founder: "person"
  };

  var have = {};       /* key -> path, once probed successfully */
  var pendingProbes = 0;
  var placed = {}, swept = 0;

  function probe(key, done) {
    var url = BASE + key + ".webp";
    var img = new Image();
    img.onload = function () { if (img.naturalWidth > 0) have[key] = url; done(); };
    img.onerror = function () { done(); };
    img.src = url;
  }

  function tag(key) {
    placed[key] = (placed[key] || 0) + 1;
    return '<img class="nb-ico" data-nb-ico="' + key + '" src="' + have[key] + '" alt="" />';
  }

  /* ---- glyph matching, built only from keys whose file exists -------- */
  var BY_GLYPH = null, GLYPH_RE = null;

  function buildMatcher() {
    var pairs = [];
    Object.keys(GLYPHS).forEach(function (key) {
      if (!have[key]) return;
      GLYPHS[key].forEach(function (g) { pairs.push({ g: g, key: key }); });
    });
    if (!pairs.length) return false;
    pairs.sort(function (a, b) { return b.g.length - a.g.length; });
    BY_GLYPH = {};
    GLYPH_RE = new RegExp(pairs.map(function (p) {
      BY_GLYPH[p.g] = p.key;
      return p.g.split("").map(function (c) {
        return "\\u" + ("000" + c.charCodeAt(0).toString(16)).slice(-4);
      }).join("");
    }).join("|"), "g");
    return true;
  }

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, CODE: 1, PRE: 1 };

  function sweep(root) {
    if (!root || !GLYPH_RE || !document.createTreeWalker) return 0;
    var walker, node, jobs = [], n = 0;
    try { walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false); }
    catch (e) { return 0; }
    while ((node = walker.nextNode())) {
      var t = node.nodeValue;
      if (!t || t.length > 4000) continue;
      var p = node.parentNode;
      if (!p || SKIP[p.nodeName] || p.isContentEditable) continue;
      if (p.hasAttribute && p.hasAttribute("data-nb-noico")) continue;
      if (!/[^\x00-\x7F]/.test(t)) continue;
      jobs.push(node);
    }
    for (var j = 0; j < jobs.length; j++) {
      var nd = jobs[j];
      GLYPH_RE.lastIndex = 0;
      if (!GLYPH_RE.test(nd.nodeValue)) continue;
      GLYPH_RE.lastIndex = 0;
      var html = esc(nd.nodeValue).replace(GLYPH_RE, function (m) { return tag(BY_GLYPH[m]); });
      var span = document.createElement("span");
      span.className = "nb-ico-wrap";
      span.innerHTML = html;
      try { nd.parentNode.replaceChild(span, nd); n++; } catch (e) {}
    }
    swept += n;
    return n;
  }

  function lex(name) {
    try { return (0, eval)("typeof " + name + " !== 'undefined' ? " + name + " : null"); }
    catch (e) { return null; }
  }

  function isTagged(s) {
    return typeof s === "string" && s.indexOf("data-nb-ico=") !== -1;
  }

  function applyDock() {
    var items = lex("DOCK_ITEMS"), n = 0;
    if (!items || Object.prototype.toString.call(items) !== "[object Array]") return 0;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || !it.id || isTagged(it.icon)) continue;
      var key = DOCK_ITEM_ICON[String(it.id).toLowerCase()];
      if (!key || !have[key]) continue;
      it.icon = tag(key);
      n++;
    }
    if (n) { try { if (typeof window.renderDock === "function") window.renderDock(); } catch (e) {} }
    return n;
  }

  var busy = false, pending = null;
  function run() {
    if (busy) return 0;
    busy = true;
    var n = 0;
    try {
      n += applyDock();
      n += sweep(document.getElementById("app") || document.body);
      var ov = document.getElementById("modalOverlay");
      if (ov) n += sweep(ov);
    } catch (e) { try { console.warn("[icons3]", e); } catch (e2) {} }
    busy = false;
    return n;
  }

  function schedule() {
    if (pending) return;
    pending = setTimeout(function () { pending = null; run(); }, 140);
  }

  function start() {
    var any = buildMatcher();
    var keys = Object.keys(have);
    if (!keys.length) {
      try {
        console.log("[v4.74] sheet 2 idle: no art/ files yet for " +
                    Object.keys(GLYPHS).join(", ") + ". Upload them and reload.");
      } catch (e) {}
      return;
    }
    run();
    setTimeout(run, 500);
    setTimeout(run, 1500);
    if (window.MutationObserver) {
      var target = document.getElementById("app") || document.body;
      if (target) {
        var mo = new MutationObserver(function () { schedule(); });
        mo.observe(target, { childList: true, subtree: true, characterData: true });
        window.__nbIcons3Observer = mo;
      }
    } else {
      setInterval(run, 1500);
    }
    try {
      console.log("[v4.74] sheet 2 live: " + keys.join(", ") +
                  (any ? "" : " (dock only)") + ". NBIcons3.report()");
    } catch (e) {}
  }

  var all = Object.keys(GLYPHS);
  pendingProbes = all.length;
  all.forEach(function (k) {
    probe(k, function () { if (--pendingProbes === 0) start(); });
  });

  window.NBIcons3 = {
    version: "4.74",
    keys: all,
    apply: run,
    report: function () {
      var out = {
        version: "4.74",
        filesFound: Object.keys(have),
        filesMissing: all.filter(function (k) { return !have[k]; }),
        placed: placed,
        nodesReplaced: swept
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };
})();
