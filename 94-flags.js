/* 94-flags.js — v4.47
   One place for the diagnostic URL flags, loaded before the layers
   they switch off. Setting __v443 makes 95-tidy.js return at once.

     ?notidy=1  — disable the tidy layer (95)
     ?nohq=1    — disable the HQ stage layer (90)
     ?safe=1    — disable both
     ?nogate=1  — skip the sign-in gate (80, pre-existing)
     ?legacy=1  — keep the old browser saves alive (80, pre-existing)
*/
(function () {
  "use strict";
  try {
    var q = new URLSearchParams(location.search);
    var safe = q.get("safe") === "1";
    if (safe || q.get("notidy") === "1") {
      window.__v443 = true;
      console.log("[v4.47] tidy layer (95) disabled by URL flag");
    }
    if (safe) console.log("[v4.47] SAFE MODE \u2014 layers 90 and 95 are both off");
    window.NBFlags = {
      safe: safe,
      notidy: safe || q.get("notidy") === "1",
      nohq: safe || q.get("nohq") === "1",
      nogate: q.get("nogate") === "1"
    };
  } catch (e) {}
})();
