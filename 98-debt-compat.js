/* 98-debt-compat.js — v4.54
   Fixes: "c.debt.reduce is not a function" on HQ ▸ Finances ▸ Asset management.

   WHY IT HAPPENS
   --------------
   Early builds stored liabilities as an ARRAY of loan objects. Since v4.10
   c.debt is an OBJECT — { loanBalance, locBalance, loanRate, locRate } — and
   every current layer reads it that way (30-v410-v427.js reconstruct(),
   40-v428-trucking.js baseRate()). The asset statement renderer still lives
   in the original monolith and still treats c.debt as a list, so it calls
   .reduce() on a plain object and throws. The tab's error boundary in
   20-v47-v49.js catches it and prints "switch tabs and try again", which
   never helps, because the shape never changes.

   THE FIX
   -------
   Teach the debt OBJECT to behave like the LIST it used to be, without
   changing what gets saved. We install NON-ENUMERABLE array methods that
   iterate derived line items — one per outstanding balance. Non-enumerable
   means JSON.stringify, Object.keys and for..in see exactly what they saw
   before, so save files are byte-identical.

   Each line item answers to every field name the old code might plausibly
   have used (balance / amount / value / principal / owed / remaining /
   total / outstanding) and coerces to its balance as a number, so even a
   blunt list.reduce(function(s,d){ return s + d; }, 0) returns the right
   figure rather than "[object Object]".

   Installed through an accessor on G.company.debt, so it survives a save
   load, plus a 500ms poll in case the whole company object is swapped out.
   00-scheduler.js folds intervals of 500ms or less into its fast
   cash/debt integrity group, which is exactly what this is.

   Disabled by ?safe=1 or ?nodebtfix=1.
   Diagnostics: NBDebtCompat.report()
*/
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](safe|nodebtfix)=1/.test(q)) {
    try { console.log("[v4.54] debt compatibility layer disabled by flag."); } catch (e) {}
    return;
  }

  if (window.__nbDebtCompat454) return;
  window.__nbDebtCompat454 = true;

  var LABELS = { loan: "Term loan", loc: "Line of credit" };
  var installs = 0;

  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }

  /* One line item, wearing every name the legacy statement might ask for. */
  function makeItem(key, label, balance, rate) {
    var o = {
      id: key, key: key, type: key, kind: key,
      name: label, label: label, title: label,
      balance: balance, amount: balance, value: balance, principal: balance,
      owed: balance, remaining: balance, total: balance, outstanding: balance,
      rate: rate, apr: rate, interestRate: rate,
      monthlyInterest: Math.round(balance * rate)
    };
    try {
      Object.defineProperty(o, "valueOf", { value: function () { return balance; }, enumerable: false });
      Object.defineProperty(o, "toString", { value: function () { return String(balance); }, enumerable: false });
    } catch (e) {}
    return o;
  }

  /* Derive the list. Only balances above zero appear, which is what the old
     array held — a settled loan was spliced out, not kept at zero. */
  function lines(d) {
    var out = [];
    if (!d || typeof d !== "object") return out;

    function add(key, bal, rate) {
      bal = num(bal);
      if (bal <= 0) return;
      out.push(makeItem(key, LABELS[key] || key, bal, num(rate)));
    }

    add("loan", d.loanBalance, d.loanRate);
    add("loc", d.locBalance, d.locRate);

    /* Anything a later layer parks here, e.g. equipmentBalance/equipmentRate. */
    try {
      Object.keys(d).forEach(function (k) {
        if (k === "loanBalance" || k === "locBalance") return;
        var m = /^(.*)Balance$/.exec(k);
        if (!m || !m[1]) return;
        add(m[1], d[k], d[m[1] + "Rate"]);
      });
    } catch (e) {}

    return out;
  }

  function totalOf(d) {
    return lines(d).reduce(function (s, x) { return s + num(x.balance); }, 0);
  }

  var METHODS = [
    "reduce", "reduceRight", "forEach", "map", "filter", "some", "every",
    "find", "findIndex", "indexOf", "lastIndexOf", "includes",
    "slice", "concat", "join", "sort", "reverse", "flat", "flatMap"
  ];

  function shim(d) {
    if (!d || typeof d !== "object") return d;
    if (Array.isArray(d)) return d;            /* a genuinely old save: already a list */
    if (d.__nbDebtCompat) return d;

    try {
      Object.defineProperty(d, "__nbDebtCompat", { value: true, enumerable: false, configurable: true });

      METHODS.forEach(function (m) {
        if (typeof d[m] === "function") return;   /* never shadow something real */
        Object.defineProperty(d, m, {
          enumerable: false, configurable: true, writable: true,
          value: function () {
            var arr = lines(this);
            var r = Array.prototype[m].apply(arr, arguments);
            /* A sum that reached for a field we do not carry would come back
               NaN. Print the real total rather than NaN across a statement. */
            if (m === "reduce" && arguments.length > 1 &&
                typeof arguments[1] === "number" &&
                (typeof r !== "number" || !isFinite(r))) {
              return totalOf(this);
            }
            return r;
          }
        });
      });

      if (!("length" in d)) {
        Object.defineProperty(d, "length", {
          enumerable: false, configurable: true,
          get: function () { return lines(this).length; }
        });
      }

      Object.defineProperty(d, "toArray", {
        enumerable: false, configurable: true,
        value: function () { return lines(this); }
      });

      try {
        if (typeof Symbol !== "undefined" && Symbol.iterator && !d[Symbol.iterator]) {
          Object.defineProperty(d, Symbol.iterator, {
            enumerable: false, configurable: true,
            value: function () { return lines(this)[Symbol.iterator](); }
          });
        }
      } catch (e) {}

      installs++;
    } catch (e) {}

    return d;
  }

  /* Re-shim automatically whenever the company's debt object is replaced,
     which is what a save load does. The property stays enumerable so it is
     still written out by JSON.stringify. */
  function guard(c) {
    if (!c || typeof c !== "object") return;
    if (c.__nbDebtGuard) { shim(c.debt); return; }

    var desc = null;
    try { desc = Object.getOwnPropertyDescriptor(c, "debt"); } catch (e) { return; }
    if (desc && desc.configurable === false) { shim(c.debt); return; }

    var store = shim(c.debt);
    try {
      Object.defineProperty(c, "debt", {
        enumerable: true, configurable: true,
        get: function () { return store; },
        set: function (v) { store = shim(v); }
      });
      Object.defineProperty(c, "__nbDebtGuard", { value: true, enumerable: false, configurable: true });
    } catch (e) {
      shim(c.debt);
    }
  }

  var lastCo = null;
  function tick() {
    try {
      var c = (window.G && window.G.company) || null;
      if (!c) return;
      if (c !== lastCo) { lastCo = c; guard(c); }
      else if (c.debt && typeof c.debt === "object" && !c.debt.__nbDebtCompat) shim(c.debt);
    } catch (e) {}
  }

  tick();
  try { document.addEventListener("DOMContentLoaded", tick); } catch (e) {}
  setTimeout(tick, 0);
  setInterval(function () { try { tick(); } catch (e) {} }, 500);

  window.NBDebtCompat = {
    version: "4.54",
    lines: function () { try { return lines(window.G && window.G.company && window.G.company.debt); } catch (e) { return []; } },
    report: function () {
      var c = null;
      try { c = (window.G && window.G.company) || null; } catch (e) {}
      var d = c && c.debt;
      var out = {
        version: "4.54",
        shimInstalls: installs,
        debtType: Array.isArray(d) ? "array (legacy save, left alone)"
                : (d && typeof d === "object" ? "object (shimmed)" : typeof d),
        shimmed: !!(d && d.__nbDebtCompat),
        guarded: !!(c && c.__nbDebtGuard),
        lines: d ? lines(d).map(function (x) { return { id: x.id, name: x.name, balance: x.balance, rate: x.rate }; }) : [],
        total: d ? totalOf(d) : 0
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try { console.log("[v4.54] debt compatibility layer armed. NBDebtCompat.report() for detail."); } catch (e) {}
})();
