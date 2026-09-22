/* ============================================================
   v4.33 - Fire anyone, not just C-suite.
   The firing path already existed (card -> employee modal -> Let Go)
   but was invisible: only the C-suite / new business director cards
   carried a real button. This layer puts a "Let go" button on every
   employee card in the roster, wired to the current global
   fireEmployee(), behind a confirm.
   Exports window.__v433api = { mount, errs, count }.
   ============================================================ */
(function(){
  "use strict";
  if (window.__v433on) return;
  window.__v433on = true;

  var ERR = [];
  function err(where, e){ if (ERR.length < 40) ERR.push(where + ": " + ((e && e.message) || e)); }

  /* ---------- styles ---------- */
  try {
    var st = document.createElement("style");
    st.textContent = ""
      + ".v433-fire{white-space:nowrap;}"
      + ".v22-mini .v433-fire{font-size:10px;padding:3px 7px;line-height:1.1;}"
      + ".emp-card .v433-fire{margin-left:6px;}";
    document.head.appendChild(st);
  } catch(e){ err("style", e); }

  function empById(id){
    try {
      if (typeof G === "undefined" || !G.company || !G.company.employees) return null;
      for (var i=0;i<G.company.employees.length;i++){
        if (G.company.employees[i].id === id) return G.company.employees[i];
      }
    } catch(e){ err("empById", e); }
    return null;
  }

  function makeBtn(id, extraClass){
    var b = document.createElement("button");
    b.className = "btn danger small v433-fire" + (extraClass ? " " + extraClass : "");
    b.setAttribute("data-v433fire", id);
    b.title = "Let this person go";
    b.textContent = "Let go";
    return b;
  }

  /* ---------- mount buttons onto every employee card ---------- */
  var mounted = 0;
  function mount(){
    try {
      if (typeof G === "undefined" || !G.company) return 0;
      var n = 0;

      /* compact roster rows + C-suite rows */
      var minis = document.querySelectorAll(".v22-mini[data-empcard]");
      for (var i=0;i<minis.length;i++){
        var c = minis[i];
        if (c.querySelector("[data-v433fire]")) continue;
        var id = c.getAttribute("data-empcard");
        if (!id || !empById(id)) continue;
        c.appendChild(makeBtn(id));
        n++;
      }

      /* large department-head cards */
      var tops = document.querySelectorAll(".emp-card .top[data-empcard]");
      for (var j=0;j<tops.length;j++){
        var card = tops[j].parentElement;
        if (!card || card.querySelector("[data-v433fire]")) continue;
        var hid = tops[j].getAttribute("data-empcard");
        if (!hid || !empById(hid)) continue;
        card.appendChild(makeBtn(hid, "mt8"));
        n++;
      }

      mounted = n;
      return n;
    } catch(e){ err("mount", e); return 0; }
  }

  /* ---------- delegated click, capture phase ----------
     Capture + stopPropagation so the card's own onclick
     (which opens the employee modal) does not also fire. */
  document.addEventListener("click", function(ev){
    try {
      var t = ev.target;
      if (!t || !t.closest) return;
      var btn = t.closest("[data-v433fire]");
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();

      var id = btn.getAttribute("data-v433fire");
      var e = empById(id);
      if (!e) return;

      var msg = "Let go of " + e.name + " (" + e.role + ")?"
        + "\n\nTheir " + (typeof fmt$ === "function" ? fmt$(e.salary) : "$" + e.salary)
        + "/mo salary comes off the books immediately. This cannot be undone.";
      if (!window.confirm(msg)) return;

      if (typeof window.fireEmployee === "function") window.fireEmployee(id);
      else if (typeof fireEmployee === "function") fireEmployee(id);

      try {
        var ov = document.getElementById("modalOverlay");
        if (ov) ov.classList.remove("show");
      } catch(e2){}

      if (typeof window.renderScreen === "function") window.renderScreen();
      else if (typeof renderScreen === "function") renderScreen();
      setTimeout(mount, 0);
    } catch(e3){ err("click", e3); }
  }, true);

  /* ---------- keep buttons present across repaints ---------- */
  try {
    if (typeof window.renderScreen === "function"){
      var prevRender = window.renderScreen;
      window.renderScreen = function(){
        var r = prevRender.apply(this, arguments);
        try { mount(); } catch(e){ err("wrapRender", e); }
        return r;
      };
    }
  } catch(e){ err("wrap", e); }

  try {
    var queued = false;
    var obs = new MutationObserver(function(){
      if (queued) return;
      queued = true;
      requestAnimationFrame(function(){ queued = false; try { mount(); } catch(e){ err("obs", e); } });
    });
    function attach(){
      var sc = document.getElementById("screen");
      if (sc){ obs.observe(sc, { childList:true, subtree:true }); return true; }
      return false;
    }
    if (!attach()){
      var tries = 0;
      var iv = setInterval(function(){
        tries++;
        if (attach() || tries > 40) clearInterval(iv);
      }, 250);
    }
  } catch(e){ err("observer", e); }

  setTimeout(mount, 400);
  setTimeout(mount, 1500);

  window.__v433api = {
    mount: mount,
    count: function(){ return document.querySelectorAll("[data-v433fire]").length; },
    errs: function(){ return ERR.slice(); }
  };
})();
/* ============================================================
   v4.34 - Delegate hiring recognises every real leader.

   Bug: v23DelegRow picked the department "head" by raw ladder
   index. Later versions appended specialist individual-contributor
   rungs to the END of two ladders, above the executives:
     operations: coo = 6, driver rungs run to v428_dirfleet = 13
     sales:      cro = 10, v428_*_rep run 11..13
   So a driver outranked the COO and a freight rep outranked the
   CRO, and those departments reported "hire a manager or an
   executive" while an executive was sitting right there.

   Second bug: CSUITE_RUNGS omitted "clo", so a Chief Legal
   Officer never counted as C-suite or as a leader anywhere.

   Fix: seniority-aware head selection (leaders outrank ICs no
   matter where they sit in the array), register "clo" as C-suite,
   and count "vp" as a leader.
   Exports window.__v434api = { head, errs, audit }.
   ============================================================ */
(function(){
  "use strict";
  if (window.__v434on) return;
  window.__v434on = true;

  var ERR = [];
  function err(w, e){ if (ERR.length < 40) ERR.push(w + ": " + ((e && e.message) || e)); }

  /* ---- 1. register clo as C-suite (array is mutable, and
          isLeader spreads CSUITE_RUNGS on every call) ---- */
  try {
    if (typeof CSUITE_RUNGS !== "undefined" && CSUITE_RUNGS.indexOf("clo") === -1) {
      CSUITE_RUNGS.push("clo");
    }
  } catch(e){ err("csuite", e); }

  /* ---- 2. a VP is an executive too ---- */
  var EXTRA_LEADER = ["vp"];
  try {
    if (typeof window.isLeader === "function") {
      var baseIsLeader = window.isLeader;
      window.isLeader = function(e){
        try {
          if (!e) return false;
          if (EXTRA_LEADER.indexOf(e.rung) !== -1) return true;
          return baseIsLeader.apply(this, arguments);
        } catch(x){ err("isLeader", x); return false; }
      };
    }
  } catch(e){ err("wrapLeader", e); }

  /* ---- 3. seniority-aware department head ----
     Tier beats ladder position: C-suite > other leaders > IC.
     Within a tier, fall back to the existing ladder index. */
  function tierOf(e){
    try {
      if (typeof isCSuite === "function" && isCSuite(e)) return 2;
      if (typeof window.isLeader === "function" && window.isLeader(e)) return 1;
    } catch(x){ err("tierOf", x); }
    return 0;
  }

  function headOf(dk){
    try {
      if (typeof deptEmployees !== "function") return null;
      var emps = deptEmployees(dk) || [];
      if (!emps.length) return null;
      var scored = emps.slice().map(function(e){
        var idx = 0;
        try { idx = (typeof rungIndex === "function") ? rungIndex(dk, e.rung) : 0; } catch(x){ idx = 0; }
        if (typeof idx !== "number" || idx < 0) idx = 0;
        return { e: e, score: tierOf(e) * 1000 + idx };
      });
      scored.sort(function(a,b){ return b.score - a.score; });
      return scored[0].e;
    } catch(x){ err("headOf", x); return null; }
  }

  /* ---- 4. rebuild the delegate row using that head ---- */
  try {
    if (typeof window.v23DelegRow === "function") {
      window.v23DelegRow = function(dk){
        try {
          var L = (typeof LADDERS !== "undefined") ? LADDERS[dk] : null;
          var label = L ? L.label : dk;
          var emps = (typeof deptEmployees === "function") ? (deptEmployees(dk) || []) : [];
          var head = headOf(dk);
          var canDelegate = !!(head && typeof window.isLeader === "function" && window.isLeader(head));
          if (!canDelegate) {
            return '<div class="v23-deleg"><span class="muted" style="font-size:12px;">'
              + 'Hire a manager or an executive in ' + label + ' to delegate mass hiring.</span></div>';
          }
          var cur = emps.length;
          var presets = [25,50,100,300,500].filter(function(n){ return n > cur; }).slice(0,4);
          return '<div class="v23-deleg">'
            + '<span>' + (head.icon || "\uD83D\uDC54") + '</span>'
            + '<span class="who">' + head.role + ' ' + head.name + '</span>'
            + '<span class="muted" style="font-size:11.5px;">grow ' + label + ' from ' + cur + ' to</span>'
            + '<input type="number" min="1" value="' + Math.max(cur + 5, 25) + '" data-v23staffin="' + dk + '" />'
            + '<button class="btn small" data-v23staffgo="' + dk + '">Delegate hiring</button>'
            + presets.map(function(n){
                return '<button class="btn secondary small" data-v23staffpre="' + dk + ':' + n + '">to ' + n + '</button>';
              }).join("")
            + '</div>';
        } catch(x){
          err("delegRow", x);
          return '<div class="v23-deleg"><span class="muted" style="font-size:12px;">Delegate row unavailable.</span></div>';
        }
      };
    }
  } catch(e){ err("wrapRow", e); }

  window.__v434api = {
    head: headOf,
    tierOf: tierOf,
    audit: function(){
      try {
        return DEPT_KEYS.map(function(dk){
          var h = headOf(dk);
          return { dept: dk, label: LADDERS[dk] ? LADDERS[dk].label : dk,
            head: h ? (h.role + " / " + h.rung) : null,
            delegates: !!(h && window.isLeader(h)) };
        });
      } catch(x){ return "ERR:" + x.message; }
    },
    errs: function(){ return ERR.slice(); }
  };
})();
/* ===== v4.35 - Sign all, collapsible fleet sections, large contracts ===== */
(function(){
"use strict";
if (window.__v435on) return;
window.__v435on = true;

var ERR = [];
function err(w, e){ if (ERR.length < 50) ERR.push(w + ": " + ((e && e.message) || e)); }
function A(){ return window.__v430api || null; }
function isTruck(){
  try { return typeof G !== "undefined" && G.company && G.company.industry === "trucking"; }
  catch(e){ return false; }
}
function num(x, d){ var n = Number(x); return isFinite(n) ? n : (d || 0); }
function money(n){
  try { if (typeof fmt$ === "function") return fmt$(n); } catch(e){}
  return "$" + Math.round(num(n)).toLocaleString();
}
function ri(a2, b2){ return a2 + Math.floor(Math.random() * (b2 - a2 + 1)); }
function uid435(){ return "v435_" + Math.random().toString(36).slice(2, 10); }

/* ---------- styles ---------- */
try {
  var st = document.createElement("style");
  st.textContent = ""
    + ".v435-head{cursor:pointer;user-select:none;display:flex;align-items:center;gap:8px;}"
    + ".v435-caret{display:inline-block;font-size:11px;opacity:.75;transition:transform .12s ease;}"
    + ".v435-caret.closed{transform:rotate(-90deg);}"
    + ".v435-count{font-size:11px;font-weight:600;opacity:.65;margin-left:auto;}"
    + ".v435-body.closed{display:none;}"
    + ".v435-bulk{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0;}"
    + ".v435-note{font-size:11.5px;opacity:.7;}"
    + ".v435-big{border-left:3px solid var(--accent);padding-left:8px;}";
  document.head.appendChild(st);
} catch(e){ err("style", e); }

/* ================= A. large contracts (5-20 trucks) ================= */
var BIG_SHIPPERS = ["Continental Foods Group","Meridian Retail Distribution","Atlas Industrial Supply",
  "Pacific Cold Chain","Ironline Steel Partners","Summit Grocery Network","Vantage Consumer Brands",
  "Redwood Building Products","Nationwide Paper Holdings","Brightwater Beverage Co",
  "Cardinal Pharma Logistics","Granite State Manufacturing"];
var BIG_FREIGHT = {
  dryvan: ["palletized retail freight","packaged consumer goods","paper and packaging"],
  reefer: ["temperature-controlled produce","frozen protein","dairy and chilled goods"],
  flatbed: ["structural steel","building materials","machinery and equipment"],
  daycab: ["regional drayage","short-haul retail replenishment","yard-to-DC shuttles"]
};

function salesTier(){
  try {
    if (typeof G === "undefined" || !G.company) return 0;
    var emps = G.company.employees || [];
    var best = 0;
    for (var i = 0; i < emps.length; i++){
      var e = emps[i];
      if (!e || e.dept !== "sales") continue;
      var r = e.rung;
      if (r === "cro" || r === "vp") best = Math.max(best, 3);
      else if (r === "director") best = Math.max(best, 2);
      else if (r === "manager") best = Math.max(best, 1);
    }
    return best;
  } catch(e){ err("salesTier", e); return 0; }
}

function bigSourcer(){
  try {
    var emps = (G.company.employees || []).filter(function(e){
      return e && e.dept === "sales" && ["manager","director","vp","cro"].indexOf(e.rung) !== -1;
    });
    if (emps.length) return emps[emps.length - 1].name;
  } catch(e){}
  return "your national accounts desk";
}

function makeBigOffer(fleetSize, tier){
  var a = A(); if (!a) return null;
  var keys = ["dryvan","reefer","flatbed","daycab"];
  var key = keys[ri(0, keys.length - 1)];
  var e = a.EQUIP[key]; if (!e) return null;
  /* never dangle a lane far beyond what the yard could ever seat */
  var ceiling = Math.max(5, Math.min(20, Math.ceil(fleetSize * 1.2) + tier));
  var trucks = Math.min(ceiling, ri(5, 20));
  var rate = Math.round((e.rate[0] + Math.random() * (e.rate[1] - e.rate[0])) * 100) / 100;
  var term = [12, 24, 24, 36][ri(0, 3)];
  /* volume buys a discount; long terms discount further */
  var vol = 1 - Math.min(0.10, 0.004 * trucks);
  var mult = (term >= 36 ? 0.90 : (term >= 24 ? 0.93 : 0.98)) * vol;
  var monthly = Math.round(trucks * e.miles * rate * mult / 50) * 50;
  var fr = BIG_FREIGHT[key] || BIG_FREIGHT.dryvan;
  return { id: uid435(), v430: true, v435big: true,
    shipper: BIG_SHIPPERS[ri(0, BIG_SHIPPERS.length - 1)], equip: key,
    commodity: fr[ri(0, fr.length - 1)], trucks: trucks, rate: rate, monthly: monthly,
    term: term, by: bigSourcer(), life: 3 };
}

function sourceBig(){
  try {
    if (!isTruck()) return 0;
    var a = A(); if (!a) return 0;
    var v = a.S(), s = a.S7();
    if (!v || !s || !v.offers) return 0;
    var fleetSize = s.trucks ? s.trucks.length : 0;
    var tier = salesTier();
    /* gate: you need a real yard and someone senior enough to be invited to bid */
    if (fleetSize < 4 || tier < 1) return 0;
    var chance = Math.min(0.55, 0.14 + 0.11 * tier + Math.min(0.15, fleetSize / 120));
    if (Math.random() > chance) return 0;
    var o = makeBigOffer(fleetSize, tier);
    if (!o) return 0;
    v.offers.push(o);
    try {
      if (typeof logHistory === "function") {
        logHistory("Fleet RFP: " + o.shipper + " put a " + o.trucks + "-truck lane out to bid at "
          + money(o.monthly) + "/mo for " + o.term + " months.");
      }
    } catch(e2){}
    return 1;
  } catch(e){ err("sourceBig", e); return 0; }
}

try {
  if (typeof window.advanceMonth === "function"){
    var prevAdv = window.advanceMonth;
    window.advanceMonth = function(){
      var r = prevAdv.apply(this, arguments);
      try { sourceBig(); } catch(e){ err("advWrap", e); }
      return r;
    };
  }
} catch(e){ err("wrapAdv", e); }

/* ================= B. bulk signing ================= */
function capacity(){
  var a = A(); if (!a) return { free: 0, seated: 0, committed: 0 };
  var v = a.S(), s = a.S7();
  if (!v || !s) return { free: 0, seated: 0, committed: 0 };
  var seated = (s.trucks || []).filter(function(t){
    try { return a.seated(t); } catch(e){ return false; }
  }).length;
  var committed = (v.contracts || []).reduce(function(x, k){ return x + num(k.trucks, 0); }, 0);
  return { free: seated - committed, seated: seated, committed: committed };
}

function coverablePlan(){
  var a = A(); if (!a) return [];
  var v = a.S(); if (!v || !v.offers) return [];
  var free = capacity().free;
  var sorted = v.offers.slice().sort(function(x, y){
    return (num(y.monthly) / Math.max(1, num(y.trucks, 1))) - (num(x.monthly) / Math.max(1, num(x.trucks, 1)));
  });
  var plan = [];
  for (var i = 0; i < sorted.length; i++){
    var o = sorted[i];
    var need = num(o.trucks, 1);
    if (need <= free){ plan.push(o.id); free -= need; }
  }
  return plan;
}

function signList(ids, label){
  var a = A(); if (!a) return;
  var v = a.S(); if (!v) return;
  var signed = 0, monthly = 0, trucks = 0;
  ids.forEach(function(id){
    var o = (v.offers || []).filter(function(x){ return x.id === id; })[0];
    if (!o) return;
    var m = num(o.monthly), t = num(o.trucks, 1);
    var ok = false;
    try { ok = a.sign(id, true); } catch(e){ err("sign", e); }
    if (ok){ signed++; monthly += m; trucks += t; }
  });
  try {
    if (signed && typeof logHistory === "function"){
      logHistory(label + ": signed " + signed + " contract(s) worth " + money(monthly)
        + "/mo, requiring " + trucks + " seated truck(s).");
    }
  } catch(e){}
  try {
    if (typeof toast === "function"){
      if (signed) toast("<b>" + signed + " contract(s) signed.</b> " + money(monthly) + "/mo added, " + trucks + " seated truck(s) required.", "good");
      else toast("<b>Nothing signed.</b> No offer fits your free seated capacity.", "warn");
    }
  } catch(e){}
  try { renderScreen(); } catch(e){}
}

function mountBulk(root){
  try {
    var a = A(); if (!a) return;
    var v = a.S(); if (!v) return;
    var offers = v.offers || [];
    var h3s = root.querySelectorAll("h3");
    var board = null, boardH3 = null;
    for (var i = 0; i < h3s.length; i++){
      if (/Contract board/i.test(h3s[i].textContent)){ boardH3 = h3s[i]; board = h3s[i].parentElement; break; }
    }
    if (!board) return;
    if (board.querySelector("[data-v435bulk]")) return;
    if (offers.length < 2) return;

    var cap = capacity();
    var plan = coverablePlan();
    var row = document.createElement("div");
    row.className = "v435-bulk";
    row.setAttribute("data-v435bulk", "1");
    var total = offers.reduce(function(x, o){ return x + num(o.monthly); }, 0);
    row.innerHTML = ""
      + '<button class="btn small" data-v435signfit="1"' + (plan.length ? "" : " disabled") + ">Sign all covered (" + plan.length + ")</button>"
      + '<button class="btn small ghost" data-v435signall="1">Sign every offer (' + offers.length + ")</button>"
      + '<span class="v435-note">' + cap.free + " seated truck(s) free of " + cap.seated
      + " \u00b7 board total " + money(total) + "/mo</span>";
    /* always sits directly under the header, outside the collapsible body */
    if (boardH3 && boardH3.nextSibling) board.insertBefore(row, boardH3.nextSibling);
    else board.appendChild(row);

    var fit = row.querySelector("[data-v435signfit]");
    if (fit) fit.onclick = function(){
      var ids = coverablePlan();
      if (!ids.length) return;
      signList(ids, "Bulk sign");
    };
    var all = row.querySelector("[data-v435signall]");
    if (all) all.onclick = function(){
      var v2 = a.S(); if (!v2) return;
      var ids = (v2.offers || []).map(function(o){ return o.id; });
      var needed = (v2.offers || []).reduce(function(x, o){ return x + num(o.trucks, 1); }, 0);
      var freeNow = capacity().free;
      var over = needed - freeNow;
      var msg = "Sign all " + ids.length + " offer(s)?";
      if (over > 0){
        msg += "\n\nThey need " + needed + " seated trucks and you have " + freeNow
          + " free. You will be " + over + " truck(s) short and will only be paid for the share you cover.";
      }
      if (!window.confirm(msg)) return;
      signList(ids, "Bulk sign (all)");
    };
  } catch(e){ err("mountBulk", e); }
}

/* ================= C. collapsible sections ================= */
function uiStore(){
  try {
    if (typeof G === "undefined" || !G.company) return null;
    if (!G.company.__v435) G.company.__v435 = { open: {} };
    if (!G.company.__v435.open) G.company.__v435.open = {};
    return G.company.__v435.open;
  } catch(e){ err("uiStore", e); return null; }
}

var BIG_DEFAULT = 12;

function sectionKey(text){ return text.replace(/[^a-z]/gi, "").slice(0, 24).toLowerCase(); }

function rowCount(body){
  try {
    var tr = body.querySelectorAll("tbody tr").length;
    if (tr) return tr;
    return body.querySelectorAll(".ladder-card").length;
  } catch(e){ return 0; }
}

function collapsify(root){
  try {
    var store = uiStore();
    var h3s = root.querySelectorAll("h3");
    for (var i = 0; i < h3s.length; i++){
      (function(h3){
        if (h3.getAttribute("data-v435c")) return;
        var card = h3.parentElement;
        if (!card) return;
        var title = h3.textContent.trim();
        if (/Dispatch/i.test(title)) return; /* keep the summary always visible */
        h3.setAttribute("data-v435c", "1");

        var body = document.createElement("div");
        body.className = "v435-body";
        var n = h3.nextSibling;
        while (n){
          var next = n.nextSibling;
          if (n.nodeType === 1 && n.getAttribute && n.getAttribute("data-v435bulk")){ n = next; continue; }
          body.appendChild(n);
          n = next;
        }
        card.appendChild(body);

        var key = sectionKey(title);
        var rows = rowCount(body);
        var open;
        if (store && Object.prototype.hasOwnProperty.call(store, key)) open = !!store[key];
        else open = rows <= BIG_DEFAULT;

        var caret = document.createElement("span");
        caret.className = "v435-caret" + (open ? "" : " closed");
        caret.textContent = "\u25BE";
        var count = document.createElement("span");
        count.className = "v435-count";
        count.textContent = rows ? (rows + " row" + (rows === 1 ? "" : "s")) : "";

        h3.classList.add("v435-head");
        h3.insertBefore(caret, h3.firstChild);
        h3.appendChild(count);
        if (!open) body.classList.add("closed");

        h3.onclick = function(){
          var nowOpen = body.classList.contains("closed");
          if (nowOpen) body.classList.remove("closed");
          else body.classList.add("closed");
          caret.className = "v435-caret" + (nowOpen ? "" : " closed");
          var s2 = uiStore();
          if (s2) s2[key] = nowOpen;
        };
      })(h3s[i]);
    }
  } catch(e){ err("collapsify", e); }
}

/* mark big offers on the board so they read as a different class of deal */
function markBig(root){
  try {
    var a = A(); if (!a) return;
    var v = a.S(); if (!v) return;
    var big = {};
    (v.offers || []).forEach(function(o){ if (o.v435big || num(o.trucks) >= 5) big[o.id] = num(o.trucks); });
    var btns = root.querySelectorAll("[data-v430sign]");
    for (var i = 0; i < btns.length; i++){
      var id = btns[i].getAttribute("data-v430sign");
      if (!big[id]) continue;
      var cardEl = btns[i].closest ? btns[i].closest(".ladder-card") : null;
      if (!cardEl || cardEl.getAttribute("data-v435marked")) continue;
      cardEl.setAttribute("data-v435marked", "1");
      cardEl.classList.add("v435-big");
      var t = cardEl.querySelector(".title");
      if (t) t.innerHTML = "\u2605 <b>Fleet contract</b> \u00b7 " + t.innerHTML;
    }
  } catch(e){ err("markBig", e); }
}

/* ---------- mount ---------- */
function mountAll(){
  try {
    var root = document.querySelector("[data-v430fleet]");
    if (!root) return;
    markBig(root);
    mountBulk(root);
    collapsify(root);
  } catch(e){ err("mountAll", e); }
}

try {
  if (typeof window.renderScreen === "function"){
    var prevR = window.renderScreen;
    window.renderScreen = function(){
      var r = prevR.apply(this, arguments);
      try { mountAll(); } catch(e){ err("renderWrap", e); }
      return r;
    };
  }
} catch(e){ err("wrapRender", e); }

try {
  var queued = false;
  var obs = new MutationObserver(function(){
    if (queued) return;
    queued = true;
    requestAnimationFrame(function(){ queued = false; try { mountAll(); } catch(e){ err("obs", e); } });
  });
  function attach(){
    var sc = document.getElementById("screen");
    if (sc){ obs.observe(sc, { childList: true, subtree: true }); return true; }
    return false;
  }
  if (!attach()){
    var tries = 0;
    var iv = setInterval(function(){ tries++; if (attach() || tries > 40) clearInterval(iv); }, 250);
  }
} catch(e){ err("observer", e); }

setTimeout(mountAll, 500);
setTimeout(mountAll, 1600);

window.__v435api = {
  sourceBig: sourceBig,
  makeBigOffer: makeBigOffer,
  capacity: capacity,
  plan: coverablePlan,
  mount: mountAll,
  errs: function(){ return ERR.slice(); }
};
})();
/* ===== v4.36 - Move company-scoped cards out of My Empire into HQ =====
   Empire is the cross-company personal screen. Cap table, equity grants,
   fundraising and liquidity are all single-company concerns, so they move to
   HQ > Finance. Workspace stage moves to HQ > Facilities. Reputation,
   Reputation recovery and Division P&L were already rendering on Finance as
   well as Empire - the Empire copies are simply removed.
   ===================================================================== */
(function v436(){
  "use strict";
  if(window.__v436on) return;
  window.__v436on = true;

  var errs = [];
  function err(w, e){ try{ errs.push(w + ": " + String((e && e.message) || e)); }catch(_){} }

  /* sections that belong to the active business, not the personal empire */
  var MOVE = /Cap Table|Grant Equity|Raise Capital|Liquidity/i;

  /* ---------- styles ---------- */
  try{
    if(!document.getElementById("v436css")){
      var css = document.createElement("style");
      css.id = "v436css";
      css.textContent =
        ".v436-note{font-size:11.5px;opacity:.72;margin:10px 0 2px;}"
      + ".v436-lead{margin-top:18px;}";
      document.head.appendChild(css);
    }
  }catch(e){ err("css", e); }

  /* ---------- group a container's children by section-divider ---------- */
  function sectionize(root){
    var groups = [], cur = null;
    var kids = [].slice.call(root.children);
    for(var i = 0; i < kids.length; i++){
      var n = kids[i];
      var isHead = n.tagName === "H3" && n.className && n.className.indexOf("section-divider") >= 0;
      if(isHead){
        cur = { title: (n.textContent || "").trim(), nodes: [n] };
        groups.push(cur);
      } else if(cur){
        cur.nodes.push(n);
      } else {
        groups.push({ title: "__pre__", nodes: [n] });
      }
    }
    return groups;
  }

  function dropGroup(g){
    for(var i = 0; i < g.nodes.length; i++){
      if(g.nodes[i] && g.nodes[i].parentNode) g.nodes[i].parentNode.removeChild(g.nodes[i]);
    }
  }

  /* ---------- Finance: the four ownership & capital sections ---------- */
  function financeBlock(){
    if(typeof window.renderEmpireBase !== "function") return null;
    var w = window.renderEmpireBase();
    if(!w) return null;
    var groups = sectionize(w);
    var kept = 0;
    for(var i = 0; i < groups.length; i++){
      if(MOVE.test(groups[i].title)) kept++;
      else dropGroup(groups[i]);
    }
    if(!kept) return null;
    w.setAttribute("data-v436fin", "1");
    var lead = document.createElement("h3");
    lead.className = "section-divider v436-lead";
    lead.textContent = "\u{1F4B0} Ownership & Capital";
    w.insertBefore(lead, w.firstChild);
    var note = document.createElement("div");
    note.className = "muted v436-note";
    note.textContent = "Cap table, grants, funding and liquidity for the business you are currently running.";
    w.insertBefore(note, lead.nextSibling);
    return w;
  }

  function mountFinance(host){
    try{
      if(host.querySelector("[data-v436fin]")) return;
      var w = financeBlock();
      if(w) host.appendChild(w);
    }catch(e){ err("mountFinance", e); }
  }

  /* ---------- Empire: strip everything that is company-scoped ---------- */
  function stripEmpire(host){
    try{
      /* duplicates that already render on Finance / Facilities */
      ["[data-v46rep]", "[data-v48rep]", "[data-v33divbox]", "[data-v410space]"].forEach(function(sel){
        var nodes = host.querySelectorAll(sel);
        for(var i = 0; i < nodes.length; i++){
          if(nodes[i].parentNode) nodes[i].parentNode.removeChild(nodes[i]);
        }
      });

      var head = host.querySelector("h3.section-divider");
      if(!head || !head.parentElement) return;
      var root = head.parentElement;
      var groups = sectionize(root);
      var moved = 0;
      for(var j = 0; j < groups.length; j++){
        if(MOVE.test(groups[j].title)){ dropGroup(groups[j]); moved++; }
      }
      if(moved && !root.querySelector("[data-v436ptr]")){
        var p = document.createElement("div");
        p.className = "muted v436-note";
        p.setAttribute("data-v436ptr", "1");
        p.innerHTML = "Cap table, equity grants, fundraising and liquidity are per-business \u2014 they now live in "
          + "<b>HQ \u203A Finance</b> for whichever company you have open. Workspace stage moved to <b>HQ \u203A Facilities</b>.";
        root.appendChild(p);
      }
    }catch(e){ err("stripEmpire", e); }
  }

  /* ---------- Facilities: workspace stage ladder ----------
     v4.10 allowlists facilities and hr, but a later renderScreen wrapper
     rebuilds those screens after it inserts, so the card only ever survived
     on Empire. Rebuilt here and mounted last so it sticks. */
  var WS_NAMES = ["Coworking", "Small Office", "Full Office", "HQ"];
  var WS_COSTS = [8000, 25000, 60000];

  function wsNames(){
    try{ if(typeof HQ_STAGE_NAMES !== "undefined" && HQ_STAGE_NAMES && HQ_STAGE_NAMES.length) return HQ_STAGE_NAMES; }catch(e){}
    return WS_NAMES;
  }
  function wsCaps(){
    try{ if(typeof HEADCOUNT_CAP !== "undefined" && HEADCOUNT_CAP) return HEADCOUNT_CAP; }catch(e){}
    return [];
  }
  function m$(n){
    try{ if(typeof fmt$ === "function") return fmt$(n); }catch(e){}
    return "$" + n;
  }

  function wsUpgrade(){
    try{
      var c = G.company, s = c.hqStage | 0;
      if(s >= 3) return;
      var cost = WS_COSTS[s];
      if(typeof affordOrAlert === "function" && !affordOrAlert(cost, "the workspace upgrade")) return;
      var names = wsNames();
      queueAdd({
        id: (typeof uid === "function" ? uid() : "v436" + Date.now()),
        label: "Upgrade workspace \u2014 " + names[s + 1],
        cost: cost,
        run: function(report){
          if(G.company.cash < cost){ report.push("Skipped workspace upgrade \u2014 insufficient cash."); return; }
          G.company.cash -= cost;
          G.company.hqStage++;
          (G.company.employees || []).forEach(function(e){
            e.morale = (typeof clamp === "function") ? clamp(e.morale + 5, 0, 100) : e.morale;
          });
          report.push("Moved into the " + wsNames()[G.company.hqStage] + " \u2014 morale improved.");
        }
      });
      try{ v30Toast("<b>Queued.</b> You move in when the month closes.", "good"); }catch(e){}
      try{ renderAll(); }catch(e){}
    }catch(e){ err("wsUpgrade", e); }
  }

  function wsCard(){
    var c = G.company;
    var s = Math.max(0, Math.min(3, c.hqStage | 0));
    var names = wsNames(), cap = wsCaps();
    var steps = names.map(function(nm, i){
      var cls = i < s ? "done" : (i === s ? "now" : "");
      return '<div class="v410-step ' + cls + '"><div class="n">' + (i < s ? "\u2713 " : "") + nm + '</div>'
        + '<div class="m">' + (cap[i] !== undefined ? ("seats " + cap[i]) : "")
        + (i === s ? " \u00b7 you are here" : "") + '</div></div>';
    }).join("");
    var next = s < 3
      ? '<div style="font-size:12px;margin-top:7px;">Next: <b>' + names[s + 1] + '</b> for <b>' + m$(WS_COSTS[s]) + '</b>'
          + (cap[s + 1] !== undefined ? ' \u2014 raises the headcount cap to ' + cap[s + 1] : '') + '.</div>'
          + '<button class="btn small" data-v436up style="margin-top:7px;">Queue the upgrade</button>'
          + '<div class="muted" style="font-size:11px;margin-top:6px;">Also available on Expansion &amp; Growth. Upgrades complete when the month closes.</div>'
      : '<div style="font-size:12px;margin-top:7px;">You are in the final workspace \u2014 buy facilities to keep raising capacity.</div>';
    var box = document.createElement("div");
    box.className = "card mt14";
    box.setAttribute("data-v436space", "1");
    box.innerHTML = '<h3>\u{1F3E2} Workspace stage</h3><div class="v410-ladder">' + steps + '</div>' + next;
    var b = box.querySelector("[data-v436up]");
    if(b) b.onclick = wsUpgrade;
    return box;
  }

  function mountWorkspace(host){
    try{
      if(host.querySelector("[data-v436space]") || host.querySelector("[data-v410space]")) return;
      host.appendChild(wsCard());
    }catch(e){ err("mountWorkspace", e); }
  }

  /* ---------- dispatch ---------- */
  function mountAll(){
    try{
      if(typeof G === "undefined" || !G || !G.ui || !G.company) return;
      var host = document.getElementById("screen");
      if(!host) return;
      var tab = G.ui.activeTab;
      if(tab === "empire") stripEmpire(host);
      else if(tab === "financials") mountFinance(host);
      /* the facilities tab normalises activeTab to "expansion"; both render the
         Facilities screen, so accept either */
      else if(tab === "facilities" || tab === "expansion") mountWorkspace(host);
    }catch(e){ err("mountAll", e); }
  }

  try{
    if(typeof window.renderScreen === "function"){
      var prevR = window.renderScreen;
      window.renderScreen = function(){
        var out = prevR.apply(this, arguments);
        try{ mountAll(); }catch(e){ err("renderWrap", e); }
        return out;
      };
    }
  }catch(e){ err("wrapRender", e); }

  try{
    var sc = document.getElementById("screen");
    if(sc && window.MutationObserver){
      var busy = false;
      new MutationObserver(function(){
        if(busy) return;
        busy = true;
        try{ mountAll(); }catch(e){ err("observer", e); }
        busy = false;
      }).observe(sc, { childList: true });
    }
  }catch(e){ err("observe", e); }

  setTimeout(mountAll, 400);
  setTimeout(mountAll, 1400);

  window.__v436api = {
    sectionize: sectionize,
    financeBlock: financeBlock,
    mount: mountAll,
    errs: function(){ return errs.slice(); }
  };
})();
/* ===== v4.37 - Team screen virtualisation =====
   renderTeam built a mini card for every employee in every department, even
   collapsed ones. At ~10 DOM nodes per head that is ~1M nodes and a multi
   second repaint for a six figure workforce, which froze the tab.

   Two fixes, both applied inside v22MiniCard so the four-deep renderTeam
   wrapper chain (v22 / v22exec / v23 delegation / v25) stays intact:
     1. collapsed departments render no cards at all
     2. the open department renders at most PAGE cards, with a show-more bar
   Only engages past THRESHOLD employees so normal games are untouched.
   ===================================================================== */
(function v437(){
  "use strict";
  if(window.__v437on) return;
  window.__v437on = true;

  var PAGE = 50;
  var THRESHOLD = 200;
  var errs = [];
  function err(w, e){ try{ errs.push(w + ": " + String((e && e.message) || e)); }catch(_){} }

  function total(){
    try{ return (G.company.employees || []).length; }catch(e){ return 0; }
  }
  function active(){ return total() >= THRESHOLD; }

  function store(){
    try{
      if(!G.ui.v437) G.ui.v437 = {};
      return G.ui.v437;
    }catch(e){ return {}; }
  }
  function limitFor(dk){
    var s = store();
    return s[dk] || PAGE;
  }
  function bump(dk){
    var s = store();
    s[dk] = limitFor(dk) + PAGE * 4;
  }
  function isOpen(dk){
    try{ return G.ui.openDept === "team_" + dk; }catch(e){ return false; }
  }

  /* counts of "rest" employees seen per department during one renderTeam */
  var seen = {};
  var inTeam = false;

  /* ---------- styles ---------- */
  try{
    if(!document.getElementById("v437css")){
      var css = document.createElement("style");
      css.id = "v437css";
      css.textContent =
        ".v437-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px;"
      + "padding:8px 10px;border:1px dashed var(--border,#293042);border-radius:9px;}"
      + ".v437-bar .t{font-size:11.5px;opacity:.75;}";
      document.head.appendChild(css);
    }
  }catch(e){ err("css", e); }

  /* ---------- cap card generation ---------- */
  try{
    if(typeof window.v22MiniCard === "function"){
      var prevMini = window.v22MiniCard;
      window.v22MiniCard = function(e){
        try{
          if(!inTeam || !active()) return prevMini.apply(this, arguments);
          var dk = e && e.dept;
          if(!dk) return prevMini.apply(this, arguments);
          seen[dk] = (seen[dk] || 0) + 1;
          /* collapsed department: body is hidden, so build nothing */
          if(!isOpen(dk)) return "";
          if(seen[dk] > limitFor(dk)) return "";
          return prevMini.apply(this, arguments);
        }catch(e2){
          err("miniCard", e2);
          try{ return prevMini.apply(this, arguments); }catch(e3){ return ""; }
        }
      };
    }
  }catch(e){ err("wrapMini", e); }

  /* ---------- show-more bar ---------- */
  function addBars(wrap){
    try{
      if(!active() || typeof DEPT_KEYS === "undefined") return;
      DEPT_KEYS.forEach(function(dk){
        var n = seen[dk] || 0;
        if(!n || !isOpen(dk)) return;
        var body = wrap.querySelector ? wrap.querySelector("#teambody_" + dk) : null;
        if(!body || body.querySelector("[data-v437bar]")) return;
        var lim = limitFor(dk);
        var shown = Math.min(n, lim);
        if(n <= lim) return;

        var bar = document.createElement("div");
        bar.className = "v437-bar";
        bar.setAttribute("data-v437bar", dk);
        bar.innerHTML = '<span class="t">Showing <b>' + (shown + 1) + '</b> of <b>'
          + (n + 1) + '</b> in this department \u2014 the rest are hidden to keep the screen fast.</span>';

        var more = document.createElement("button");
        more.className = "btn secondary small";
        more.setAttribute("data-v437more", dk);
        more.textContent = "Show " + Math.min(PAGE * 4, n - shown) + " more";
        more.onclick = function(ev){
          ev.stopPropagation();
          bump(dk);
          try{ renderScreen(); }catch(e){ err("more", e); }
        };
        bar.appendChild(more);

        if(lim > PAGE){
          var less = document.createElement("button");
          less.className = "btn secondary small";
          less.textContent = "Collapse back";
          less.onclick = function(ev){
            ev.stopPropagation();
            store()[dk] = PAGE;
            try{ renderScreen(); }catch(e){ err("less", e); }
          };
          bar.appendChild(less);
        }

        var grid = body.querySelector(".v22-minigrid");
        if(grid && grid.nextSibling) body.insertBefore(bar, grid.nextSibling);
        else if(grid) body.appendChild(bar);
        else body.appendChild(bar);
      });
    }catch(e){ err("addBars", e); }
  }

  /* ---------- wrap renderTeam (outermost) ---------- */
  try{
    if(typeof window.renderTeam === "function"){
      var prevTeam = window.renderTeam;
      window.renderTeam = function(){
        seen = {};
        inTeam = true;
        var wrap;
        try{
          wrap = prevTeam.apply(this, arguments);
        } finally {
          inTeam = false;
        }
        try{ if(wrap) addBars(wrap); }catch(e){ err("post", e); }
        return wrap;
      };
    }
  }catch(e){ err("wrapTeam", e); }

  window.__v437api = {
    page: function(){ return PAGE; },
    threshold: function(){ return THRESHOLD; },
    seen: function(){ return JSON.parse(JSON.stringify(seen)); },
    limits: function(){ return JSON.parse(JSON.stringify(store())); },
    errs: function(){ return errs.slice(); }
  };
})();
