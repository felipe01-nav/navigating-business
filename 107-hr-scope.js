/* 107-hr-scope.js — v4.62
   Stops trucking-specific staff appearing in companies that own no trucks.

   The cause (40-v428-trucking.js:1942-1954) runs unconditionally for EVERY
   industry, not just trucking. It:
     - creates a whole LADDERS.drivers department ("Drivers & Fleet"),
     - mirrors it into BASE_LADDERS.drivers,
     - splices "drivers" into DEPT_KEYS,
   and elsewhere pushes the v428_* sales and operations rungs into both
   LADDERS and BASE_LADDERS. So an AI SaaS founder is offered Reefer Reps and
   Yard Trainers.

   IMPORTANT — why this is a display-time fix and not a data fix:
   applyIndustryLabels() indexes BASE_LADDERS and INDUSTRIES[*].roles
   POSITIONALLY. Splicing anything out of LADDERS shifts every role title after
   it and silently mislabels the entire org. So we never mutate the data. We
   swap in a filtered rungs array for the duration of one synchronous render
   call and restore the original in a finally block.

   Existing staff are never hidden: a v428_ rung with anyone actually in it
   stays visible, as does the Drivers department if it has employees. A save
   that already carries trucking staff therefore loses nothing.

   Disable with ?nohrscope=1
*/
(function () {
  "use strict";

  var ERR = [];
  var LAST = { hiddenByDept: {}, deptSuppressed: false, renders: 0 };

  function glob(n) {
    try { return (0, eval)("typeof " + n + "!=='undefined'?" + n + ":null"); }
    catch (e) { return null; }
  }
  function flag(k) {
    try { return new URLSearchParams(location.search).has(k); } catch (e) { return false; }
  }

  if (flag("nohrscope")) {
    window.NBHRScope = { disabled: true, report: function () { return { disabled: true }; } };
    return;
  }

  function co() { var G = glob("G"); return (G && G.company) || null; }

  /* Prefer the trucking bundle's own predicate so we can never disagree
     with it; fall back to the INDUSTRIES flag, then to the raw key. */
  function isFleet() {
    try { if (typeof window.__v426IsFleet === "function") return !!window.__v426IsFleet(); } catch (e) {}
    try {
      var c = co();
      var key = c && c.industry;
      if (!key) return false;
      var IND = glob("INDUSTRIES");
      if (IND && IND[key] && IND[key].v45 === "fleet") return true;
      return key === "trucking";
    } catch (e) { ERR.push("isFleet: " + (e && e.message)); return false; }
  }

  function staffIn(deptKey) {
    try {
      if (typeof deptEmployees === "function") return (deptEmployees(deptKey) || []).length;
      var c = co();
      if (!c || !c.employees) return 0;
      return c.employees.filter(function (e) { return e && e.dept === deptKey; }).length;
    } catch (e) { return 0; }
  }

  function heldBy(deptKey, rungKey) {
    try { if (typeof rungCount === "function") return rungCount(deptKey, rungKey) || 0; }
    catch (e) {}
    return 0;
  }

  function isFleetRung(r) {
    return !!(r && typeof r.key === "string" && r.key.indexOf("v428_") === 0);
  }

  var prev = window.renderLadderBucket;

  if (typeof prev !== "function") {
    ERR.push("renderLadderBucket is not a global function \u2014 nothing wrapped");
  } else {
    window.renderLadderBucket = function (deptKey) {
      try {
        if (isFleet()) return prev.apply(this, arguments);

        /* Whole department: hide only while it is genuinely empty. */
        if (deptKey === "drivers") {
          if (staffIn("drivers") === 0) {
            LAST.deptSuppressed = true;
            LAST.renders++;
            return "";
          }
          LAST.deptSuppressed = false;
        }

        var L = glob("LADDERS");
        var d = L && L[deptKey];
        if (!d || !Array.isArray(d.rungs)) return prev.apply(this, arguments);

        var full = d.rungs;
        var keep = full.filter(function (r) {
          if (!isFleetRung(r)) return true;
          return heldBy(deptKey, r.key) > 0; // someone is in it — never hide a real person
        });

        LAST.hiddenByDept[deptKey] = full.length - keep.length;
        if (keep.length === full.length) return prev.apply(this, arguments);

        /* Swap, render, restore. Synchronous: nothing else can observe it. */
        d.rungs = keep;
        try {
          LAST.renders++;
          return prev.apply(this, arguments);
        } finally {
          d.rungs = full;
        }
      } catch (e) {
        ERR.push("bucket " + deptKey + ": " + (e && e.message));
      }
      return prev.apply(this, arguments);
    };
  }

  window.NBHRScope = {
    version: "4.62",
    /* Paste NBHRScope.report() into the console. */
    report: function () {
      var c = co();
      var L = glob("LADDERS") || {};
      var counts = {};
      Object.keys(L).forEach(function (k) {
        var rs = (L[k] && L[k].rungs) || [];
        var n = rs.filter(isFleetRung).length;
        if (n) counts[k] = n;
      });
      return {
        wrapped: typeof prev === "function",
        industry: c && c.industry,
        isFleet: isFleet(),
        driversDeptExists: !!L.drivers,
        driversDeptStaff: staffIn("drivers"),
        driversDeptSuppressed: LAST.deptSuppressed,
        v428RungsInData: counts,
        hiddenAtLastRender: LAST.hiddenByDept,
        renders: LAST.renders,
        errors: ERR.slice()
      };
    }
  };
})();
