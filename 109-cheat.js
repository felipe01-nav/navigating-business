/* 109-cheat.js — v4.63
   Typed cheat codes. No input box, no console: just type the word anywhere
   in the game and it fires. Built for testing — chiefly so a new company can
   be founded on demand without grinding for the seed capital.

   CODES
     navcash   → +$10,000,000,000 personal cash
     navmega   → +$100,000,000,000 personal cash (for the very impatient)
     navpoor   → reset personal cash to $6,000 (the starting figure)
     navhelp   → toast listing every code

   Collision safety: art-core's own key handler (art-core.js:13117) consumes
   Space, Escape and the digits 1-9. Every code here is letters only, so the
   two cannot fight. We never call preventDefault and we never stopPropagation,
   so art-core still sees every keystroke exactly as before.

   Typing guard: ignored while focus sits in an input, textarea or
   contenteditable, so naming a save "navcash" does not hand you ten billion.

   Disable with ?nocheat=1
*/
(function () {
  "use strict";

  var ERR = [];
  var LAST = { fired: null, firedAt: null, count: 0 };
  var BUF = "";
  var BUF_AT = 0;
  var GAP_MS = 2500;   // pause longer than this and the buffer resets
  var MAXLEN = 16;

  function glob(n) {
    try { return (0, eval)("typeof " + n + "!=='undefined'?" + n + ":null"); }
    catch (e) { return null; }
  }
  function flag(k) {
    try { return new URLSearchParams(location.search).has(k); } catch (e) { return false; }
  }

  if (flag("nocheat")) {
    window.NBCheat = { disabled: true, report: function () { return { disabled: true }; } };
    return;
  }

  function G() { return glob("G"); }
  function P() { var g = G(); return (g && g.personal) || null; }

  function money(n) {
    try { if (typeof fmt$ === "function") return fmt$(n); } catch (e) {}
    return "$" + Math.round(Number(n) || 0).toLocaleString();
  }

  function say(msg, kind) {
    try { if (typeof toast === "function") { toast(msg, kind || "good"); return; } } catch (e) {}
    try { console.log("[cheat] " + msg.replace(/<[^>]+>/g, "")); } catch (e) {}
  }

  function repaint() {
    try { if (typeof empireNetWorthTick === "function") empireNetWorthTick(); }
    catch (e) { ERR.push("netWorthTick: " + (e && e.message)); }
    try { if (typeof renderAll === "function") renderAll(); }
    catch (e) { ERR.push("renderAll: " + (e && e.message)); }
  }

  /* Personal cash feeds netWorth, which feeds totalNetWorth via
     empireNetWorthTick(). Move all three so no screen disagrees. */
  function give(amount) {
    var p = P();
    if (!p) { say("No game loaded yet \u2014 start or load a run first.", "bad"); return false; }
    var n = Number(amount) || 0;
    p.cash = Math.round((Number(p.cash) || 0) + n);
    if (typeof p.netWorth === "number") p.netWorth = Math.round(p.netWorth + n);
    repaint();
    try { if (typeof logHistory === "function") logHistory("\u{1F9EA} Test funds: " + money(n) + " added to personal cash."); } catch (e) {}
    say("\u{1F9EA} " + money(n) + " added. Personal cash is now " + money(p.cash) + ".", "good");
    return true;
  }

  function reset() {
    var p = P();
    if (!p) { say("No game loaded yet.", "bad"); return false; }
    var before = Number(p.cash) || 0;
    var delta = 6000 - before;
    p.cash = 6000;
    if (typeof p.netWorth === "number") p.netWorth = Math.round(p.netWorth + delta);
    repaint();
    say("\u{1F9F9} Personal cash reset to " + money(6000) + ".", "good");
    return true;
  }

  var CODES = {
    navcash: { desc: "+$10B personal cash", run: function () { return give(1e10); } },
    navmega: { desc: "+$100B personal cash", run: function () { return give(1e11); } },
    navpoor: { desc: "reset personal cash to $6,000", run: function () { return reset(); } },
    navhelp: {
      desc: "list the codes",
      run: function () {
        say("Codes: " + Object.keys(CODES).join(" \u00b7 "), "good");
        try { console.log("[cheat] codes:", Object.keys(CODES).map(function (k) { return k + " \u2014 " + CODES[k].desc; })); } catch (e) {}
        return true;
      }
    }
  };

  function typingInField(t) {
    if (!t) return false;
    var tag = (t.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (t.isContentEditable) return true;
    return false;
  }

  try {
    document.addEventListener("keydown", function (ev) {
      try {
        if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
        if (typingInField(ev.target)) return;

        var k = ev.key;
        if (typeof k !== "string" || k.length !== 1) return;
        if (!/[a-zA-Z]/.test(k)) return;

        var now = Date.now();
        if (now - BUF_AT > GAP_MS) BUF = "";
        BUF_AT = now;

        BUF = (BUF + k.toLowerCase()).slice(-MAXLEN);

        for (var code in CODES) {
          if (!Object.prototype.hasOwnProperty.call(CODES, code)) continue;
          if (BUF.length >= code.length && BUF.slice(-code.length) === code) {
            BUF = "";
            LAST.fired = code;
            LAST.firedAt = new Date().toISOString();
            LAST.count++;
            try { CODES[code].run(); }
            catch (e) { ERR.push(code + ": " + (e && e.message)); }
            return;   /* no preventDefault — art-core keeps its own handling */
          }
        }
      } catch (e) {
        ERR.push("keydown: " + (e && e.message));
      }
    }, true);   /* capture: runs before art-core's listener, but consumes nothing */
  } catch (e) {
    ERR.push("listener: " + (e && e.message));
  }

  window.NBCheat = {
    version: "4.63",
    codes: Object.keys(CODES),
    /* Console fallbacks, if the keyboard route ever misbehaves. */
    give: give,
    reset: reset,
    fire: function (code) {
      var c = CODES[String(code || "").toLowerCase()];
      if (!c) { say("Unknown code.", "bad"); return false; }
      return c.run();
    },
    report: function () {
      var p = P();
      return {
        listening: true,
        codes: Object.keys(CODES).map(function (k) { return k + " \u2014 " + CODES[k].desc; }),
        buffer: BUF,
        lastFired: LAST.fired,
        lastFiredAt: LAST.firedAt,
        timesFired: LAST.count,
        personalCash: p ? p.cash : null,
        personalNetWorth: p ? p.netWorth : null,
        totalNetWorth: p ? p.totalNetWorth : null,
        errors: ERR.slice()
      };
    }
  };

  try { console.log("%c[cheat] codes armed: " + Object.keys(CODES).join(" \u00b7 "), "color:#8a8f98;"); } catch (e) {}
})();
