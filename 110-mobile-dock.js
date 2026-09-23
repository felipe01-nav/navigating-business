/* 110-mobile-dock.js — v4.64
   Makes the side panel scroll when it stacks on top on a phone.

   THE BUG, WHICH IS A CASCADE CONFLICT, NOT A MISSING RULE
   --------------------------------------------------------
   base.css already does the right thing at <=780px: #main becomes a column,
   so the dock sits on top, and #dock gets flex-direction:row with
   overflow-x:auto. Two later rules undo it:

     1. art-core.js:5717 (v12Styles)
          @media (max-width:820px){ #dock{width:64px;} }
        Same specificity as base.css's #dock{width:100%}, but injected at
        runtime as a <style>, so it lands LATER in the cascade and wins.
        The horizontal bar is therefore 64px wide and clips every button
        after the first.

     2. 10-core-v40-v46.js:1839 (v46Css)
          #dock{overflow-y:auto; overflow-x:hidden;}
        Written for the VERTICAL desktop dock, where it is correct. It is the
        last dock rule injected, so it beats base.css's overflow-x:auto and
        explicitly forbids the horizontal scrolling the mobile layout needs.

   A <link> stylesheet cannot fix this: every <link> in index.html is parsed
   before any script runs, so runtime <style> blocks always outrank it. The
   fix must itself be injected at runtime, from a file that loads last. Hence
   a JS layer for what is purely a CSS problem.

   Scope: <=780px only — exactly the breakpoint where base.css turns #main
   into a column. Between 781px and 820px the dock is still a vertical rail
   and v46Css's overflow-y:auto is the correct behaviour, so we leave it be.

   Also handles the v22 dock-width modes (icons/medium/full), which carry
   higher specificity via #dock.v22-dock-*, and repositions the attention
   dots, which sit at top:-3px and would be clipped by overflow-x:auto.

   Disable with ?nomobiledock=1
*/
(function () {
  "use strict";

  var ERR = [];
  var STYLE = null;

  function flag(k) {
    try { return new URLSearchParams(location.search).has(k); } catch (e) { return false; }
  }

  if (flag("nomobiledock")) {
    window.NBMobileDock = { disabled: true, report: function () { return { disabled: true }; } };
    return;
  }

  var CSS = [
    "@media (max-width: 780px){",

    "  #main{flex-direction:column !important;}",

    /* Beat #dock.v22-dock-* (0,1,1) as well as plain #dock (0,1,0). */
    "  #dock,",
    "  #dock.v22-dock-icons,",
    "  #dock.v22-dock-medium,",
    "  #dock.v22-dock-full{",
    "    width:100% !important;",
    "    max-width:100% !important;",
    "    height:auto !important;",
    "    flex:0 0 auto !important;",
    "    flex-direction:row !important;",
    "    flex-wrap:nowrap !important;",
    "    align-items:center !important;",
    "    justify-content:flex-start !important;",
    "    gap:6px !important;",
    "    padding:7px 8px 5px !important;",
    "    overflow-x:auto !important;",
    "    overflow-y:hidden !important;",
    "    -webkit-overflow-scrolling:touch;",
    "    overscroll-behavior-x:contain;",
    "    border-right:none !important;",
    "    border-bottom:1px solid var(--border) !important;",
    "    scrollbar-width:thin;",
    "  }",

    /* A visible hint that there is more to the right. */
    "  #dock::-webkit-scrollbar{height:3px !important;width:auto !important;}",
    "  #dock::-webkit-scrollbar-thumb{background:rgba(255,255,255,.22);border-radius:3px;}",

    "  #dock > *{flex:0 0 auto !important;}",

    /* Auto width so the label is never truncated; fixed height keeps the
       bar shallow. Overrides the v22 mode widths too. */
    "  #dock .dock-btn,",
    "  #dock.v22-dock-icons .dock-btn,",
    "  #dock.v22-dock-medium .dock-btn,",
    "  #dock.v22-dock-full .dock-btn{",
    "    width:auto !important;",
    "    min-width:46px;",
    "    height:46px !important;",
    "    flex-direction:column !important;",
    "    align-items:center !important;",
    "    justify-content:center !important;",
    "    gap:2px !important;",
    "    padding:0 9px !important;",
    "    font-size:17px !important;",
    "  }",
    "  #dock .dock-btn .dock-in{font-size:7.5px !important;white-space:nowrap;}",

    /* top:-3px would be cut off by overflow-x:auto. */
    "  #dock .dock-btn .dot{top:0 !important;right:0 !important;}",

    /* The width toggle has nothing to do in a bar forced to 100%, but it
       still switches labels on and off, so it stays — just tidied. */
    "  #dock .v22-dockwidth{margin:0 0 0 2px !important;padding:0 !important;",
    "    flex-direction:row !important;align-items:center !important;}",
    "  #dock .v24-advwrap{margin:0 !important;}",

    "  #screen{min-height:0;}",
    "}"
  ].join("\n");

  /* Appending moves the node to the end of <head>, which is how we stay
     ahead of anything injected before us. Called again once the page has
     settled, in case a later layer injects dock CSS of its own. */
  function install() {
    try {
      if (!STYLE) {
        STYLE = document.createElement("style");
        STYLE.id = "nb-mobile-dock";
        STYLE.textContent = CSS;
      }
      (document.head || document.documentElement).appendChild(STYLE);
      return true;
    } catch (e) {
      ERR.push("install: " + (e && e.message));
      return false;
    }
  }

  install();
  try { document.addEventListener("DOMContentLoaded", install); } catch (e) {}
  setTimeout(install, 1500);

  window.NBMobileDock = {
    version: "4.64",
    reinstall: install,
    report: function () {
      var dock = null, cs = null;
      try { dock = document.getElementById("dock"); } catch (e) {}
      try { if (dock) cs = window.getComputedStyle(dock); } catch (e) {}
      var out = {
        installed: !!(STYLE && STYLE.parentNode),
        styleIsLastInHead: !!(STYLE && document.head && document.head.lastElementChild === STYLE),
        viewportWidth: window.innerWidth,
        mobileBreakpointActive: window.innerWidth <= 780,
        dockFound: !!dock,
        dockClasses: dock ? dock.className : null,
        computed: cs ? {
          width: cs.width,
          height: cs.height,
          flexDirection: cs.flexDirection,
          overflowX: cs.overflowX,
          overflowY: cs.overflowY
        } : null,
        scrollable: dock ? (dock.scrollWidth > dock.clientWidth + 1) : null,
        scrollWidth: dock ? dock.scrollWidth : null,
        clientWidth: dock ? dock.clientWidth : null,
        buttons: dock ? dock.querySelectorAll("[data-group]").length : null,
        errors: ERR.slice()
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };
})();
