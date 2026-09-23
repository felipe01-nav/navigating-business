/* 122-icon-plate.js — v4.75
   =====================================================================
   WHY THIS FILE EXISTS
   --------------------
   The icons are navy linework over pale fills. The dock rail is #20242c
   and the page behind it #15171c. That is a dark ground under dark ink,
   and the only thing separating the two is whatever pale fill each icon
   happens to contain. Icons with a generous fill (compass, house, bank)
   hold their own. Icons that are mostly line (chart, handshake) and the
   two that arrived as solid silhouettes (person, lock) do not.

   The fix is a backing plate: a small, light, rounded tile behind each
   icon, so every icon sits on the same ground regardless of how much
   fill its artwork carries. This is the same trick a physical sign uses
   — you do not brighten the letters, you put them on a placard.

   CHOOSING THE TONE
   -----------------
   The temptation is white. Resist it. On a #15171c page a white tile is
   a small headlight, and there are a dozen of them in the dock; the eye
   fatigues within a minute. What is wanted is the lightest tone that
   still clears the ink by a comfortable margin, and no lighter.

   Default 'slate' is #9FB0C4. Against the artwork's #1B2A41 ink that is
   about 6.9:1 — past WCAG AA for body text, never mind a 26 px glyph.
   Against the #20242c rail the plate reads at roughly 4.6:1, so the tile
   is unmistakably present without being bright. It is around 55% of the
   luminance of white, which is the difference between a lamp and a lit
   window.

   Tone is a matter of taste, so it is switchable at runtime rather than
   baked in. Try them on the live dock and keep whichever you like:

       NBIconPlate.set('slate')      cool blue-grey, the default
       NBIconPlate.set('warm')       parchment; easiest on the eye at night
       NBIconPlate.set('mist')       dimmer slate, for a quieter dock
       NBIconPlate.set('ghost')      a faint lift, barely a plate at all
       NBIconPlate.set('off')        no plate; bare icons as before

   The choice persists in localStorage, so a refresh keeps it. Also
   settable per-load with ?plate=warm, and disabled outright with
   ?noplate=1.

   Diagnostics: NBIconPlate.report()
   ===================================================================== */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](noplate|noicons|safe)=1/.test(q)) return;
  if (window.__nbIconPlate475) return;
  window.__nbIconPlate475 = true;

  var STORE = "nb.icoPlate";

  /* Each tone gives the tile colour, the hairline that sits just inside
     its edge, and the slightly lifted variant used on the active dock
     button so the current tab still reads as current. */
  var TONES = {
    slate: {
      label: "Cool blue-grey (default)",
      fill:  "#9FB0C4",
      edge:  "rgba(255,255,255,.14)",
      hot:   "#BACADC",
      note:  "~6.9:1 against the artwork ink; 55% of white's luminance."
    },
    warm: {
      label: "Parchment",
      fill:  "#C9BEA6",
      edge:  "rgba(255,255,255,.16)",
      hot:   "#DCD3BE",
      note:  "Warmer cast, less blue light; kindest of the set at night."
    },
    mist: {
      label: "Dim slate",
      fill:  "#8494A8",
      edge:  "rgba(255,255,255,.12)",
      hot:   "#9DADC0",
      note:  "A quieter dock. Ink still clears ~5.0:1."
    },
    ghost: {
      label: "Faint lift",
      fill:  "rgba(159,188,214,.16)",
      edge:  "rgba(255,255,255,.08)",
      hot:   "rgba(159,188,214,.26)",
      note:  "Barely a plate. Groups the icons without adding brightness."
    },
    off: {
      label: "No plate",
      fill:  "transparent",
      edge:  "transparent",
      hot:   "transparent",
      note:  "Bare icons, as before v4.75."
    }
  };

  function fromQuery() {
    var m = q.match(/[?&]plate=([a-z]+)/i);
    return m && TONES[m[1].toLowerCase()] ? m[1].toLowerCase() : null;
  }

  function stored() {
    try {
      var v = localStorage.getItem(STORE);
      return v && TONES[v] ? v : null;
    } catch (e) { return null; }
  }

  var current = fromQuery() || stored() || "slate";

  /* The icon rules elsewhere set explicit widths. Adding padding without
     border-box would shrink the artwork inside its own box, so the box
     is border-box and the sizes are nudged up by the padding, leaving
     the drawn glyph exactly as large as it was before the plate. */
  function css(name) {
    var t = TONES[name] || TONES.slate;
    return [
      /* The plate itself. Restricted to tagged icons, so nothing else
         in the game picks up a tile by accident. */
      'img[data-nb-ico]:not(.nb-ico-lg){',
        'background:' + t.fill + ';',
        'box-shadow:inset 0 0 0 1px ' + t.edge + ', 0 1px 2px rgba(0,0,0,.34);',
        'border-radius:7px;',
        'box-sizing:border-box;',
        'padding:2px;',
        'transition:background .12s ease;',
      '}',
      /* Size compensation: +4 on the dock, +3 in body buttons. */
      '#dock .dock-btn img[data-nb-ico]:not(.nb-ico-lg),',
      '.dock-btn img[data-nb-ico]:not(.nb-ico-lg){',
        'width:30px;height:30px;border-radius:8px;padding:2px;',
      '}',
      'button img[data-nb-ico]:not(.nb-ico-lg){',
        'width:20px;height:20px;border-radius:6px;padding:1.5px;',
        'vertical-align:-4px;',
      '}',
      /* Active tab lifts slightly, so "where am I" survives the plate. */
      '.dock-btn.active img[data-nb-ico]:not(.nb-ico-lg),',
      '.dock-btn[aria-selected="true"] img[data-nb-ico]:not(.nb-ico-lg),',
      '.subtab.active img[data-nb-ico]:not(.nb-ico-lg),',
      '.sub-tab.active img[data-nb-ico]:not(.nb-ico-lg){',
        'background:' + t.hot + ';',
      '}',
      '@media (max-width:780px){',
        '#dock .dock-btn img[data-nb-ico]:not(.nb-ico-lg),',
        '.dock-btn img[data-nb-ico]:not(.nb-ico-lg){',
          'width:28px;height:28px;',
        '}',
      '}',
      /* Someone running the OS at reduced motion does not want a fade. */
      '@media (prefers-reduced-motion:reduce){',
        'img[data-nb-ico]{transition:none;}',
      '}'
    ].join("");
  }

  var node = null;

  function paint() {
    try {
      if (!node) {
        node = document.getElementById("nb-ico-plate-css");
      }
      if (!node) {
        node = document.createElement("style");
        node.id = "nb-ico-plate-css";
        (document.head || document.documentElement).appendChild(node);
      }
      /* Appended last and re-appended on change, so it outranks the
         runtime <style> blocks injected by 113/120 regardless of the
         order in which those layers happened to run. */
      node.textContent = css(current);
      if (node.parentNode && node.parentNode.lastChild !== node) {
        node.parentNode.appendChild(node);
      }
    } catch (e) {}
  }

  paint();
  /* Later layers inject their own <style>; reassert a few times early on
     rather than holding an interval open for the life of the session. */
  setTimeout(paint, 500);
  setTimeout(paint, 1500);
  setTimeout(paint, 4000);

  window.NBIconPlate = {
    version: "4.75",
    set: function (name) {
      name = String(name || "").toLowerCase();
      if (!TONES[name]) {
        try {
          console.log("Unknown tone " + JSON.stringify(name) +
                      ". Try: " + Object.keys(TONES).join(", "));
        } catch (e) {}
        return null;
      }
      current = name;
      try { localStorage.setItem(STORE, name); } catch (e) {}
      paint();
      try { console.log("Icon plate: " + name + " — " + TONES[name].label); } catch (e) {}
      return name;
    },
    list: function () {
      var out = {};
      Object.keys(TONES).forEach(function (k) {
        out[k] = TONES[k].label + " — " + TONES[k].note;
      });
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) {}
      return out;
    },
    report: function () {
      var n = 0;
      try { n = document.querySelectorAll('img[data-nb-ico]').length; } catch (e) {}
      var out = {
        version: "4.75",
        tone: current,
        label: (TONES[current] || {}).label,
        fill: (TONES[current] || {}).fill,
        platedIconsOnScreen: n,
        styleInstalled: !!document.getElementById("nb-ico-plate-css"),
        change: "NBIconPlate.set('warm' | 'mist' | 'ghost' | 'slate' | 'off')"
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try {
    console.log("[v4.75] icon plate: " + current +
                ". NBIconPlate.list() to see the alternatives.");
  } catch (e) {}
})();
