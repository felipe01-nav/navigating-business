/* 103-rnd-mount.js — v4.58  "the R&D screen actually appears"
   =====================================================================
   4.55 renamed the tab (confirmed) but the body stayed as the legacy
   ops render. CI grep proved the two assumptions in 100-rnd.js are
   correct: state lives on G.ui.activeTab, the container is #screen.
   So mount() is being turned away by one of its OWN guards. The prime
   suspect is:

       if (document.getElementById("nbGate")) return;

   80-account-gate.js leaves #nbGate in the DOM after sign-in; it is
   merely hidden. That makes the guard permanently true and the R&D
   screen can never mount, which matches the symptom exactly.

   This file:
     1. hides #nbGate from that guard (temporary id swap) whenever the
        gate is not actually visible, then calls NBRnd.mount();
     2. if nothing mounted anyway, paints a small diagnostic strip on
        the R&D screen explaining why — no console required.

   Disabled by ?safe=1 or ?nornd=1. Diagnostics: NBRndMount.report()
   ===================================================================== */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](safe|nornd)=1/.test(q)) return;
  if (window.__nbRndMount458) return;
  window.__nbRndMount458 = true;

  var lastWhy = "not run yet";
  var lastErr = "";
  var mounts = 0;

  function tab() { try { return window.G && window.G.ui ? window.G.ui.activeTab : null; } catch (e) { return null; } }
  function co() { try { return (window.G && window.G.company) || null; } catch (e) { return null; } }
  function screenEl() { return document.getElementById("screen"); }
  function visible(el) {
    try {
      if (!el) return false;
      if (el.offsetParent !== null) return true;
      var cs = window.getComputedStyle(el);
      return !(cs.display === "none" || cs.visibility === "hidden");
    } catch (e) { return !!el; }
  }

  /* Call NBRnd.mount() with the dead gate temporarily invisible to
     getElementById. Restore the id no matter what happens. */
  function forceMount() {
    var gate = document.getElementById("nbGate");
    var swapped = false;
    if (gate && !visible(gate)) {
      try { gate.id = "nbGate__parked"; swapped = true; } catch (e) {}
    }
    try {
      if (window.NBRnd && typeof window.NBRnd.mount === "function") window.NBRnd.mount();
      lastErr = "";
    } catch (e) {
      lastErr = (e && e.message) || String(e);
    }
    if (swapped) { try { gate.id = "nbGate"; } catch (e) {} }
  }

  function diagHtml() {
    var gate = document.getElementById("nbGate") || document.getElementById("nbGate__parked");
    var a = null;
    try { a = document.activeElement; } catch (e) {}
    var rows = [
      ["activeTab", String(tab())],
      ["company loaded", co() ? "yes" : "no"],
      ["#screen present", screenEl() ? "yes" : "no"],
      ["#nbGate in DOM", gate ? (visible(gate) ? "yes, VISIBLE" : "yes, hidden (parked during mount)") : "no"],
      ["NBRnd loaded", window.NBRnd ? "yes (" + window.NBRnd.version + ")" : "NO — 100-rnd.js did not run"],
      ["NBRndPatch loaded", window.NBRndPatch ? "yes" : "no"],
      ["NBRndSpeed loaded", window.NBRndSpeed ? "yes" : "no"],
      ["focused element", a ? (a.tagName + (a.id ? "#" + a.id : "")) : "none"],
      ["mount() error", lastErr || "none"],
      ["forced mounts", String(mounts)]
    ];
    var body = rows.map(function (r) {
      return '<div style="display:flex;gap:10px;"><span style="flex:0 0 150px;opacity:.65;">'
        + r[0] + '</span><b style="font-weight:600;">' + String(r[1]).replace(/</g, "&lt;") + '</b></div>';
    }).join("");
    return '<h3>\uD83E\uDDEA R&amp;D — diagnostic</h3>'
      + '<div class="muted" style="font-size:12px;margin-bottom:8px;">The R&amp;D screen could not mount. '
      + 'This panel is here so the reason is visible without a console.</div>'
      + '<div style="font-size:11.5px;line-height:1.7;font-family:ui-monospace,Menlo,monospace;">' + body + '</div>';
  }

  function showDiag(s) {
    var d = s.querySelector("[data-nbrnd-diag]");
    if (!d) {
      d = document.createElement("div");
      d.className = "card mt14";
      d.setAttribute("data-nbrnd-diag", "1");
      s.appendChild(d);
    }
    d.innerHTML = diagHtml();
  }

  function clearDiag(s) {
    var d = s.querySelector("[data-nbrnd-diag]");
    if (d && d.parentNode) d.parentNode.removeChild(d);
  }

  function tick() {
    if (tab() !== "industry") { lastWhy = "tab is " + tab(); return; }
    var s = screenEl();
    if (!s) { lastWhy = "no #screen"; return; }
    if (!co()) { lastWhy = "no company yet"; return; }

    var gate = document.getElementById("nbGate");
    if (visible(gate)) { lastWhy = "account gate is on screen"; return; }

    if (!s.querySelector("[data-nbrnd]")) {
      mounts++;
      forceMount();
    }

    if (s.querySelector("[data-nbrnd]")) {
      lastWhy = "mounted";
      clearDiag(s);
    } else {
      lastWhy = "mount() produced nothing";
      showDiag(s);
    }
  }

  function safeTick() { try { tick(); } catch (e) { lastErr = (e && e.message) || String(e); } }

  /* Wrap renderScreen so we run right after every repaint, and keep a
     slow timer as the belt to that brace. */
  (function wrap() {
    try {
      var prev = window.renderScreen;
      if (typeof prev === "function" && !prev.__nbRndMount) {
        var fn = function () {
          var out = prev.apply(this, arguments);
          safeTick();
          return out;
        };
        fn.__nbRndMount = true;
        window.renderScreen = fn;
      }
    } catch (e) {}
  })();
  setTimeout(function () { try { arguments.callee; } catch (e) {} }, 0);
  setInterval(safeTick, 900);
  setTimeout(safeTick, 400);
  setTimeout(safeTick, 2000);

  window.NBRndMount = {
    version: "4.58",
    tick: safeTick,
    force: forceMount,
    report: function () {
      var out = {
        version: "4.58",
        activeTab: tab(),
        why: lastWhy,
        error: lastErr,
        forcedMounts: mounts,
        gateInDom: !!(document.getElementById("nbGate") || document.getElementById("nbGate__parked")),
        gateVisible: visible(document.getElementById("nbGate")),
        onScreen: !!document.querySelector("[data-nbrnd]")
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try { console.log("[v4.58] R&D mount enforcer armed. NBRndMount.report() for detail."); } catch (e) {}
})();
