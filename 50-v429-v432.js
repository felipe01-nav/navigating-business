/* ============ v4.29d — Phase 2: real expense total, honest burn ============
   1. advanceMonthCore now publishes G.company.expensesTotal (source edit above).
      The v4.25 tax engine read c.expensesTotal, which never existed, and fell
      back to "profit = mrr * 0.4" — so a company with no revenue and no profit
      still accrued income tax on a phantom margin, and a heavy-cost company
      was under-taxed.
   2. v44Burn() counted only the company expense ledger. Owner draw and chair
      fees leave company cash every month and were invisible to burn, runway,
      the cashflow strip and the solvency check — a solo founder drawing $3,500
      saw a burn of $500.
============================================================================ */
(function v491(){
"use strict";
if(window.__v491) return;
window.__v491 = true;

function n(v, d){ var x = Number(v); return isFinite(x) ? x : (d || 0); }

function drawCost(){
  try{
    var c = G.company; if(!c) return 0;
    if(c.sold || c.passive) return 0;
    return Math.max(0, n(c.ownerDraw, 0)) + Math.max(0, n(c.chairFee, 0));
  }catch(e){ return 0; }
}

try{
  if(typeof v44Burn === "function" && !v44Burn.__v491){
    var rawBurn = v44Burn;
    var wrapped = function(){
      var base = 0;
      try{ base = n(rawBurn.apply(this, arguments), 0); }catch(e){}
      return base + drawCost();
    };
    wrapped.__v491 = true;
    window.v44Burn = wrapped;
    try{ v44Burn = window.v44Burn; }catch(e){}
  }
}catch(e){}

window.__v491api = {
  draw: drawCost,
  burn: function(){ try{ return v44Burn(); }catch(e){ return null; } },
  expensesTotal: function(){ try{ return G.company.expensesTotal; }catch(e){ return null; } }
};

try{ window.GAME_VERSION = "v4.37"; }catch(e){}
})();
/* v4.29d — phase 3: run the insolvency ladder at the TRUE end of month.
   The v4.25 layer wraps advanceMonth OUTSIDE the v44 month hook, so taxStep,
   macroStep, contractStep, rivalStep, peopleStep, cardStep and exitStep all
   write cash AFTER both the overdraft rescue and v44SolvencyCheck have run.
   A month could therefore end deeply negative with distressMonths 0 and
   negMonths 0, and the ladder never escalated. This defers the solvency
   check to after the whole chain, and re-runs the (now finite) overdraft
   facility on whatever the late steps did. */
(function(){
  if(window.__v492) return; window.__v492 = true;
  var realSolv = null;
  try{ realSolv = (typeof window.v44SolvencyCheck === "function") ? window.v44SolvencyCheck : (typeof v44SolvencyCheck === "function" ? v44SolvencyCheck : null); }catch(e){}
  if(!realSolv) return;
  var deferring = false;
  var stats = { deferred: 0, finals: 0, lateRescues: 0 };
  window.v44SolvencyCheck = function(){
    if(deferring){ stats.deferred++; return; }
    return realSolv.apply(this, arguments);
  };
  function settle(){
    var lines = [];
    try{
      var cash = Number(G.company.cash);
      if(!isFinite(cash)) cash = 0;
      if(cash < 0 && typeof autoDrawCreditIfNeeded === "function"){
        autoDrawCreditIfNeeded(lines);
        stats.lateRescues++;
      }
    }catch(e){}
    try{ G.company.__odPenalizedThisClose = false; }catch(e){}
    if(lines.length){
      try{
        var rep = G.company && G.company.lastReport;
        if(rep && rep.lines) rep.lines = rep.lines.concat(lines);
      }catch(e){}
      try{ lines.forEach(function(l){ logHistory(l); }); }catch(e){}
    }
    return lines;
  }
  function installOuter(){
    try{
      if(!window.__v425wrapped) return;
      var cur = window.advanceMonth;
      if(typeof cur !== "function" || cur.__v492) return;
      var w = function(){
        var out;
        deferring = true;
        try{ out = cur.apply(this, arguments); } finally { deferring = false; }
        try{ settle(); stats.finals++; realSolv(); }catch(e){}
        /* the core engine autosaves BEFORE the late steps and before the ladder,
           so forced layoffs and the final cash position were being written over
           by that stale snapshot. Re-save once the close is genuinely finished. */
        try{ saveToSlot(G, LS_AUTOSAVE, G.meta.name + " (autosave)"); }catch(e){}
        try{ renderAll(); }catch(e){}
        return out;
      };
      w.__v492 = true;
      window.advanceMonth = w;
    }catch(e){}
  }
  try{ installOuter(); }catch(e){}
  try{ setInterval(installOuter, 700); }catch(e){}
  window.__v492api = { stats: stats, settle: settle, solv: function(){ return realSolv(); } };
})();
/* ============ v4.29d — trucking: one fleet, real owner-operator start, no phantom MRR ============ */
(function v4294(){
"use strict";
if(window.__v4294) return; window.__v4294 = true;
var ERR = window.__v4294err = window.__v4294err || [];
function T(l,f){ try{ return f(); }catch(e){ ERR.push(l+": "+((e&&e.message)||e)); } }
function C(){ try{ return (typeof G!=="undefined" && G && G.company) || null; }catch(e){ return null; } }
function isTruck(){ var c=C(); return !!(c && c.industry === "trucking"); }
function S(){ try{ return (window.v427 && window.v427.state && window.v427.state()) || null; }catch(e){ return null; } }
function num(v,d){ v=Number(v); return isFinite(v)?v:d; }
function ri(a,b){ return Math.floor(a + Math.random()*(b-a+1)); }
function rnd(a,b){ return a + Math.random()*(b-a); }
function log(t){ try{ logHistory(t); }catch(e){} }
function uid2(){ try{ return uid(); }catch(e){ return "x"+Math.random().toString(36).slice(2); } }

/* ---------- 1. one fleet: hide the retired v4.5 card for carriers ---------- */
T("legacy-card", function(){
  if(typeof window.v45Card !== "function") return;
  var prev = window.v45Card;
  window.v45Card = function(){ if(isTruck()) return null; return prev.apply(this, arguments); };
  try{ v45Card = window.v45Card; }catch(e){}
});
/* and sweep any copy already in the DOM */
T("legacy-sweep", function(){
  if(typeof window.renderScreen !== "function") return;
  var prev = window.renderScreen;
  window.renderScreen = function(){
    var out = prev.apply(this, arguments);
    try{
      if(isTruck()){
        var sc = document.getElementById("screen");
        if(sc){
          var olds = sc.querySelectorAll("[data-v45card]");
          for(var i=0;i<olds.length;i++){ if(olds[i].parentNode) olds[i].parentNode.removeChild(olds[i]); }
        }
      }
    }catch(e){}
    return out;
  };
});

/* ---------- 2. the truck you start with is a real truck ---------- */
var EQUIP_MILES = { dryvan:11000, reefer:10500, flatbed:9500, daycab:7000 };
function migrate(){
  if(!isTruck()) return;
  var c = C(), s = S(); if(!c || !s) return;
  if(c.__v4294seeded) return;
  c.__v4294seeded = true;
  var cond = 92;
  try{ if(c.v45 && c.v45.units && c.v45.units[0]) cond = num(c.v45.units[0].condition, 92); }catch(e){}
  if(!s.trucks.length){
    var tid = uid2();
    s.trucks.push({ id:tid, type:"dryvan", name:"Truck 1", driver:"owner", condition:cond, odo:0, down:false,
      lifetimeLoads:0, lifetimeGross:0, last:null });
    if(!s.drivers.filter(function(d){ return d.id === "owner"; }).length){
      s.drivers.push({ id:"owner", name:"You (owner-operator)", pay:0, endorse:"dryvan", truck:tid,
        lifetimeLoads:0, lifetimeMiles:0, lifetimeGross:0, owner:true });
    }
    log("\u{1F69B} You start in the seat of Truck 1, a dry van tractor. No driver pay \u2014 you are the driver.");
  }
  /* the retired v4.5 fleet keeps no units of its own */
  try{ if(c.v45) c.v45.units = []; }catch(e){}
  if(!s.offers.length){ inbound(2); inbound(0); }
}

/* ---------- 3. an owner-operator can find his own freight ---------- */
var SHIPPERS2 = ["Midland Foods","Crestline Steel","Harbor Paper Co","Vale Produce","Northgate Retail",
  "Apex Building Supply","Bluewater Beverage","Copper Ridge Lumber","Fairview Grocers","Lakeshore Distribution",
  "Pinnacle 3PL","Redstone Logistics"];
var FREIGHT2 = {
  dryvan:["palletized retail goods","packaged food","paper products","bottled beverages"],
  reefer:["fresh produce","frozen food","dairy"],
  flatbed:["structural steel","lumber bundles","pipe"],
  daycab:["store replenishment","regional distribution","parts runs"]
};
/* size the load to equipment the player actually owns, and to one truck */
function ownEquip(){
  var s = S(); if(!s || !s.trucks.length) return "dryvan";
  var t = s.trucks[ri(0, s.trucks.length-1)];
  return t && EQUIP_MILES[t.type] ? t.type : "dryvan";
}
function inbound(n){
  var s = S(); if(!s) return 0;
  n = num(n, 1); var made = 0;
  for(var i=0;i<=n;i++){
    var equip = ownEquip();
    var cap = EQUIP_MILES[equip] || 11000;
    var miles = equip === "daycab" ? ri(180, 480) : (equip === "reefer" ? ri(650, 1200) : ri(350, 900));
    var baseRate = { dryvan:2.65, reefer:3.00, flatbed:3.25, daycab:2.80 }[equip];
    var rate = Math.round((baseRate + rnd(-0.25, 0.30)) * 100) / 100;
    var perTruck = Math.max(1, Math.floor(cap / miles));
    var loads = Math.max(1, Math.round(perTruck * rnd(0.35, 0.85)));
    s.offers.push({ id:uid2(), shipper:SHIPPERS2[ri(0, SHIPPERS2.length-1)], equip:equip,
      commodity:FREIGHT2[equip][ri(0, FREIGHT2[equip].length-1)], loads:loads, miles:miles, rate:rate,
      term:ri(2, 6), trucksNeeded:Math.max(1, Math.ceil(loads / perTruck)), by:"your own phone", life:2 });
    made++;
  }
  return made;
}

/* ---------- 4. a carrier earns freight money, not subscription money ---------- */
function scrubMrr(){
  if(!isTruck()) return;
  var c = C(); if(!c) return;
  c.baseMrr = 0;
  try{
    if(typeof recomputeMRR === "function") recomputeMRR();
    else c.mrr = Math.round((c.clients||[]).reduce(function(a,x){ return a + num(x && x.mrr, 0); }, 0));
  }catch(e){ c.mrr = 0; }
}

/* ---------- month wrapper: outermost, so it runs last ---------- */
T("month", function(){
  if(typeof advanceMonth !== "function") return;
  var prev = advanceMonth;
  window.advanceMonth = function(){
    var truck = isTruck();
    if(truck){ T("pre", function(){ migrate(); scrubMrr(); }); }
    var out = prev.apply(this, arguments);
    if(truck){
      T("post", function(){
        scrubMrr();
        var s = S();
        if(s && !s.reps.length && s.offers.length < 3 && Math.random() < 0.8){
          var n = inbound(0);
          if(n) log("\u{1F4DE} You worked the phones yourself and turned up " + n + " load offer(s). Hire a freight sales rep and this stops being your job.");
        }
      });
    }
    return out;
  };
  try{ advanceMonth = window.advanceMonth; }catch(e){}
});

/* run the migration as soon as a carrier exists, not only at month end */
T("boot", function(){
  var tries = 0;
  var iv = setInterval(function(){
    tries++;
    try{ if(isTruck() && S()){ migrate(); scrubMrr(); } }catch(e){}
    if(tries > 40) clearInterval(iv);
  }, 500);
});

window.__v4294api = { migrate:migrate, inbound:inbound, scrubMrr:scrubMrr, errs:function(){ return ERR; } };
})();
/* ================= v4.30 - trucking: one hiring structure, monthly contracts, real P&L ================= */
(function v430(){
"use strict";
if(window.__v430) return; window.__v430 = true;
var ERR = window.__v430err = window.__v430err || [];
function T(l,f){ try{ return f(); }catch(e){ if(ERR.length<80) ERR.push(l+": "+((e&&e.message)||e)); } }
function C(){ try{ return (typeof G!=="undefined" && G && G.company) || null; }catch(e){ return null; } }
function isTruck(){ var c=C(); return !!(c && c.industry === "trucking"); }
function num(v,d){ v=Number(v); return isFinite(v)?v:(d||0); }
function ri(a,b){ return Math.floor(a + Math.random()*(b-a+1)); }
function money(n){ try{ return fmt$(Math.round(n)); }catch(e){ return "$"+Math.round(n); } }
function uid2(){ try{ return uid(); }catch(e){ return "x"+Math.random().toString(36).slice(2); } }
function log(t){ try{ logHistory(t); }catch(e){} }
function say(t,k){ try{ toast(t,k||"good"); }catch(e){} }
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function rerender(){ try{ renderScreen(); }catch(e){} }

var EQUIP = {
  dryvan:  { key:"dryvan",  name:"Dry Van",      cost:42000, miles:11000, rate:[2.00,2.45] },
  reefer:  { key:"reefer",  name:"Refrigerated", cost:68000, miles:10500, rate:[2.55,3.05] },
  flatbed: { key:"flatbed", name:"Flatbed",      cost:55000, miles:9500,  rate:[2.45,2.95] },
  daycab:  { key:"daycab",  name:"Day Cab",      cost:38000, miles:7000,  rate:[2.30,2.80] }
};
var EQ_ORDER = ["dryvan","reefer","flatbed","daycab"];
var VAR_MILE = 0.81;
var PER_TRUCK = 1400;
var SPAN = 5;

var SHIP = ["Midland Foods","Crestline Steel","Harbor Paper Co","Vale Produce","Northgate Retail","Apex Building Supply","Bluewater Beverage","Sterling Pharma","Copper Ridge Lumber","Fairview Grocers","Granite Works","Lakeshore Distribution","Pinnacle 3PL","Redstone Logistics","Summit Cold Storage"];
var FREIGHT = {
  dryvan:["palletized retail goods","packaged food","paper products","bottled beverages"],
  reefer:["fresh produce","frozen food","dairy","pharmaceuticals"],
  flatbed:["structural steel","lumber bundles","construction machinery","pipe"],
  daycab:["store replenishment","regional distribution","drayage containers","parts runs"]
};
var SEAT = { v428_day:"daycab", v428_dry:"dryvan", v428_reefer:"reefer", v428_flat:"flatbed", v428_trainer:"dryvan" };
var MGR_RUNG = { manager:1, director:1, vp:1, cro:1, v428_safety:1, v428_dirfleet:1 };
var MGR_DEPT = { sales:1, operations:1, support:1, product:1 };

function S7(){
  var c = C(); if(!c) return null;
  if(!c.__v427) c.__v427 = { trucks:[], drivers:[], reps:[], offers:[], contracts:[], lastGross:0, lastCosts:0, lastNet:0, rows:[], hist:[], stamp:"" };
  var s = c.__v427;
  ["trucks","drivers","reps","offers","contracts","rows","hist"].forEach(function(k){ if(!Array.isArray(s[k])) s[k] = []; });
  return s;
}
function S(){
  var c = C(); if(!c) return null;
  if(!c.__v430) c.__v430 = { offers:[], contracts:[], hist:[], lastRev:0, lastCosts:0, lastNet:0, auto:true, seeded:false };
  var v = c.__v430;
  ["offers","contracts","hist"].forEach(function(k){ if(!Array.isArray(v[k])) v[k] = []; });
  if(v.auto !== false) v.auto = true;
  return v;
}

/* ===== 1. drivers and the freight desk join the normal ladder ===== */
T("merge-ladder", function(){
  if(typeof LADDERS === "undefined" || !LADDERS || !LADDERS.operations) return;
  var src = (LADDERS.drivers && Array.isArray(LADDERS.drivers.rungs)) ? LADDERS.drivers.rungs : null;
  var ops = LADDERS.operations.rungs;
  var already = ops.some(function(r){ return r.key === "v428_dry"; });
  if(src && !already){
    Array.prototype.push.apply(ops, clone(src));
    if(typeof BASE_LADDERS !== "undefined" && BASE_LADDERS && BASE_LADDERS.operations){
      var bsrc = (BASE_LADDERS.drivers && Array.isArray(BASE_LADDERS.drivers.rungs)) ? BASE_LADDERS.drivers.rungs : src;
      Array.prototype.push.apply(BASE_LADDERS.operations.rungs, clone(bsrc));
    }
  }
  try{ delete LADDERS.drivers; }catch(e){}
  try{ if(typeof BASE_LADDERS !== "undefined" && BASE_LADDERS) delete BASE_LADDERS.drivers; }catch(e){}
  if(typeof DEPT_KEYS !== "undefined" && DEPT_KEYS){
    var i = DEPT_KEYS.indexOf("drivers");
    if(i >= 0) DEPT_KEYS.splice(i, 1);
  }
  if(typeof ORDER_OPTIONS !== "undefined" && ORDER_OPTIONS){ try{ delete ORDER_OPTIONS.drivers; }catch(e){} }
  if(typeof INDUSTRIES !== "undefined" && INDUSTRIES && INDUSTRIES.trucking){
    INDUSTRIES.trucking.deptLabels = INDUSTRIES.trucking.deptLabels || {};
    INDUSTRIES.trucking.deptLabels.operations = "Fleet, Drivers & Maintenance";
    INDUSTRIES.trucking.deptLabels.sales = "Freight Sales";
    try{ delete INDUSTRIES.trucking.deptLabels.drivers; }catch(e){}
    try{ delete INDUSTRIES.trucking.roles.drivers; }catch(e){}
    var LBL = {
      sales: { rep:"Freight Agent", v43_smb:"Spot Market Agent", v43_mm:"Mid-Market Freight Agent",
        v46_large:"Key Account Freight Agent", v43_ent:"Enterprise Lane Agent", coordinator:"Dispatch Coordinator",
        teamlead:"Freight Desk Lead", manager:"Freight Sales Manager", director:"Director of Freight Sales",
        vp:"VP, Freight Sales", cro:"Chief Revenue Officer", v428_reefer_rep:"Reefer Freight Rep",
        v428_flat_rep:"Flatbed Freight Rep", v428_ded_rep:"Dedicated Lanes Rep" },
      operations: { rep:"Shop Technician", coordinator:"Maintenance Lead", teamlead:"Safety & Compliance Lead",
        manager:"Terminal Manager", director:"Director of Operations", vp:"VP, Fleet Operations",
        coo:"Chief Operating Officer", v428_day:"Day Cab / Regional Driver", v428_dry:"Dry Van Driver",
        v428_reefer:"Reefer Driver", v428_flat:"Flatbed Driver", v428_trainer:"Lead Driver / Trainer",
        v428_safety:"Safety & Compliance Manager", v428_dirfleet:"Director of Fleet Operations" }
    };
    Object.keys(LBL).forEach(function(dk){
      if(!LADDERS[dk] || !Array.isArray(LADDERS[dk].rungs)) return;
      var old = (INDUSTRIES.trucking.roles && INDUSTRIES.trucking.roles[dk]) || [];
      INDUSTRIES.trucking.roles[dk] = LADDERS[dk].rungs.map(function(r, i){
        return LBL[dk][r.key] || old[i] ||
          ((typeof BASE_LADDERS !== "undefined" && BASE_LADDERS[dk] && BASE_LADDERS[dk].rungs[i]) ? BASE_LADDERS[dk].rungs[i].label : r.label);
      });
    });
  }
  if(typeof window.applyIndustryLabels === "function") T("relabel", function(){ window.applyIndustryLabels(); });
});

function migrate(){
  var c = C(); if(!c || !Array.isArray(c.employees)) return 0;
  var n = 0;
  c.employees.forEach(function(e){ if(e && e.dept === "drivers"){ e.dept = "operations"; n++; } });
  return n;
}

T("css", function(){
  if(document.getElementById("v430-css")) return;
  var s = document.createElement("style");
  s.id = "v430-css";
  s.textContent = '#screen[data-v427truck] [data-v426dept="sales"]{display:inline-block !important;}'
    + '#screen [data-v430keep]{display:block !important;}';
  (document.head || document.documentElement).appendChild(s);
});

/* ===== 2. seats: employees become drivers, no parallel payroll ===== */
function seated(t){ return !!(t && t.driver && !t.down); }
function sync(){
  var c = C(), s = S7(); if(!c || !s) return;
  c.employees = c.employees || [];
  c.employees.forEach(function(e){
    if(!e || !SEAT[e.rung]) return;
    if(!s.drivers.some(function(d){ return d.empId === e.id; })){
      s.drivers.push({ id:"d"+e.id, empId:e.id, name:e.name, endorse:SEAT[e.rung], type:SEAT[e.rung], truck:null, pay:0 });
    }
  });
  var live = {};
  c.employees.forEach(function(e){ if(e) live[e.id] = true; });
  s.drivers = s.drivers.filter(function(d){ return d && (!d.empId || live[d.empId] || d.id === "owner"); });
  s.drivers.forEach(function(d){ d.pay = 0; });
  s.reps.forEach(function(r){ r.pay = 0; });
  var taken = {};
  s.trucks.forEach(function(t){
    if(t.driver && s.drivers.some(function(d){ return d.id === t.driver; })) taken[t.driver] = true;
    else t.driver = null;
  });
  s.trucks.forEach(function(t){
    if(t.driver) return;
    var free = s.drivers.filter(function(d){ return !taken[d.id]; });
    var m = null;
    for(var i=0;i<free.length;i++){ if((free[i].endorse || free[i].type) === t.type){ m = free[i]; break; } }
    if(!m) m = free[0];
    if(m){ t.driver = m.id; m.truck = t.id; taken[m.id] = true; }
  });
  s.drivers.forEach(function(d){
    if(!s.trucks.some(function(t){ return t.driver === d.id; })) d.truck = null;
  });
}
function driverName(id){
  var s = S7(); if(!s) return "\u2014";
  if(id === "owner") return "You";
  var d = s.drivers.filter(function(x){ return x.id === id; })[0];
  return d ? (d.name || "Driver") : "\u2014";
}
function driverCount(){ var s = S7(); return s ? s.drivers.length : 0; }
function repCount(){
  var c = C(); if(!c) return 0;
  return (c.employees||[]).filter(function(e){ return e && e.dept === "sales"; }).length;
}

/* ===== 3. contracts measured in months ===== */
function makeOffer(equip, by, maxTrucks){
  var e = EQUIP[equip] || EQUIP.dryvan;
  var trucks = Math.max(1, Math.min(maxTrucks || 3, ri(1,3)));
  var rate = Math.round((e.rate[0] + Math.random()*(e.rate[1]-e.rate[0])) * 100) / 100;
  var term = [6,6,12,12,24][ri(0,4)];
  var mult = term >= 24 ? 0.93 : (term >= 12 ? 0.98 : 1.05);
  var monthly = Math.round(trucks * e.miles * rate * mult / 50) * 50;
  var fr = FREIGHT[e.key] || FREIGHT.dryvan;
  return { id:uid2(), v430:true, shipper:SHIP[ri(0,SHIP.length-1)], equip:e.key,
    commodity:fr[ri(0,fr.length-1)], trucks:trucks, rate:rate, monthly:monthly,
    term:term, by:by || "inbound call", life:2 };
}
function repYield(e){
  var idx = { rep:1, v428_reefer_rep:1.1, v428_flat_rep:1.05, v428_ded_rep:1.15,
    coordinator:1.3, teamlead:1.5, manager:1.8, director:2.1, vp:2.3, cro:2.5 };
  return idx[e.rung] || 1;
}
var REP_EQUIP = { v428_reefer_rep:["reefer"], v428_flat_rep:["flatbed"], v428_ded_rep:["daycab","dryvan"] };
function sourceOffers(){
  var c = C(), v = S(), s = S7(); if(!c || !v || !s || !isTruck()) return 0;
  var reps = (c.employees||[]).filter(function(e){ return e && e.dept === "sales"; });
  var fleetSize = Math.max(1, s.trucks.length);
  var made = 0;
  if(!reps.length){
    if(Math.random() < 0.85){
      var eq = s.trucks.length ? s.trucks[ri(0, s.trucks.length-1)].type : "dryvan";
      v.offers.push(makeOffer(eq, "your own phone calls", 1));
      made++;
    }
    return made;
  }
  reps.forEach(function(e){
    var y = repYield(e);
    var morale = num(e.morale, 70) || 70;
    var chance = Math.min(0.92, 0.5 * y * (morale / 70));
    if(Math.random() > chance) return;
    var pool = REP_EQUIP[e.rung] || EQ_ORDER;
    var equip = pool[ri(0, pool.length-1)];
    v.offers.push(makeOffer(equip, e.name, Math.max(1, Math.min(3, Math.ceil(fleetSize/2) + 1))));
    made++;
  });
  if(made > 0) log("\u{1F4DE} Your freight desk sourced " + made + " new contract offer(s) \u2014 see Fleet Ops.");
  return made;
}
function coverOf(k){
  var s = S7(); if(!s || !k) return 0;
  var ready = (k.fleet||[]).filter(function(id){
    var t = s.trucks.filter(function(x){ return x.id === id; })[0];
    return t && seated(t);
  }).length;
  return Math.max(0, Math.min(1, ready / Math.max(1, num(k.trucks,1))));
}
function readyTrucks(k){
  var s = S7(); if(!s || !k) return [];
  return (k.fleet||[]).map(function(id){ return s.trucks.filter(function(x){ return x.id === id; })[0]; })
    .filter(function(t){ return t && seated(t); });
}
function assignAll(){
  var v = S(), s = S7(); if(!v || !s) return;
  var used = {};
  v.contracts.forEach(function(k){
    k.fleet = (k.fleet || []).filter(function(id){
      var t = s.trucks.filter(function(x){ return x.id === id; })[0];
      if(!t || t.type !== k.equip || used[id]) return false;
      used[id] = true; return true;
    });
  });
  v.contracts.forEach(function(k){
    if(k.fleet.length >= num(k.trucks,1)) return;
    var pool = s.trucks.filter(function(t){ return t.type === k.equip && !used[t.id]; });
    pool.sort(function(a,b){ return (seated(b)?1:0) - (seated(a)?1:0); });
    while(k.fleet.length < num(k.trucks,1) && pool.length){
      var t = pool.shift(); k.fleet.push(t.id); used[t.id] = true;
    }
  });
  s.trucks.forEach(function(t){ t.job = null; });
  v.contracts.forEach(function(k){
    (k.fleet||[]).forEach(function(id){
      var t = s.trucks.filter(function(x){ return x.id === id; })[0];
      if(t) t.job = k.id;
    });
  });
}
function coveredRevenue(){
  var v = S(); if(!v) return 0;
  var total = 0;
  v.contracts.forEach(function(k){ total += Math.round(num(k.monthly) * coverOf(k)); });
  return Math.round(total);
}
function pushLine(){
  var c = C(), v = S(); if(!c || !v) return;
  c.businessLines = (c.businessLines || []).filter(function(l){ return l && l.id !== "v430_freight"; });
  if(!isTruck()) return;
  var rev = coveredRevenue();
  if(rev > 0) c.businessLines.push({ id:"v430_freight", name:"Freight Contracts", monthlyRevenue: rev });
}
function sign(id, quiet){
  var v = S(), s = S7(); if(!v || !s) return false;
  var o = v.offers.filter(function(x){ return x.id === id; })[0]; if(!o) return false;
  v.offers = v.offers.filter(function(x){ return x.id !== id; });
  v.contracts.push({ id:o.id, shipper:o.shipper, equip:o.equip, commodity:o.commodity,
    trucks:o.trucks, rate:o.rate, monthly:o.monthly, term:o.term, monthsLeft:o.term,
    short:0, months:0, earned:0, lastRev:0, fleet:[], by:o.by });
  assignAll(); pushLine();
  if(!quiet){
    log("\u{1F91D} Signed " + o.shipper + " \u2014 " + money(o.monthly) + "/mo for " + o.term +
      " months, " + o.trucks + " seated " + EQUIP[o.equip].name.toLowerCase() + " truck(s) required.");
    say("<b>" + o.shipper + "</b>: " + money(o.monthly) + "/mo for " + o.term + " months.");
    rerender();
  }
  return true;
}
function pass(id){
  var v = S(); if(!v) return;
  v.offers = v.offers.filter(function(x){ return x.id !== id; });
  rerender();
}
function buyTruck(equipKey){
  var s = S7(), c = C(), def = EQUIP[equipKey]; if(!s || !c || !def) return;
  if(num(c.cash) < def.cost){ say("A " + def.name.toLowerCase() + " tractor costs " + money(def.cost) + ". You have " + money(c.cash) + ".", "warn"); return; }
  c.cash = num(c.cash) - def.cost;
  var n = s.trucks.filter(function(t){ return t.type === equipKey; }).length + 1;
  s.trucks.push({ id:uid2(), type:equipKey, name:def.name + " #" + n, driver:null, condition:96,
    odo:0, down:false, job:null, lifetimeGross:0, last:null });
  sync(); assignAll(); pushLine();
  log("\u{1F69B} Bought a " + def.name.toLowerCase() + " tractor for " + money(def.cost) + ".");
  say("<b>" + def.name + " #" + n + "</b> is in the yard.");
  rerender();
}
function service(truckId){
  var s = S7(), c = C(); if(!s || !c) return;
  var t = s.trucks.filter(function(x){ return x.id === truckId; })[0]; if(!t) return;
  var bill = Math.round(900 + (100 - num(t.condition,90)) * 62);
  if(num(c.cash) < bill){ say("Service on " + t.name + " runs " + money(bill) + ".", "warn"); return; }
  c.cash = num(c.cash) - bill; t.condition = 98; t.down = false;
  log("\u{1F527} Serviced " + t.name + " for " + money(bill) + ".");
  rerender();
}
function sellTruck(truckId){
  var s = S7(), c = C(), v = S(); if(!s || !c || !v) return;
  var t = s.trucks.filter(function(x){ return x.id === truckId; })[0]; if(!t) return;
  var value = Math.round(EQUIP[t.type].cost * 0.45 * (num(t.condition,90)/100));
  c.cash = num(c.cash) + value;
  s.trucks = s.trucks.filter(function(x){ return x.id !== truckId; });
  v.contracts.forEach(function(k){ k.fleet = (k.fleet||[]).filter(function(id){ return id !== truckId; }); });
  sync(); assignAll(); pushLine();
  log("\u{1F4B0} Sold " + t.name + " for " + money(value) + ".");
  rerender();
}
function drop(id){
  var v = S(), c = C(); if(!v) return;
  var k = v.contracts.filter(function(x){ return x.id === id; })[0]; if(!k) return;
  var fee = Math.round(num(k.monthly) * 0.5);
  if(c) c.cash = num(c.cash) - fee;
  v.contracts = v.contracts.filter(function(x){ return x.id !== id; });
  assignAll(); pushLine();
  log("\u{1F6AA} Terminated the " + k.shipper + " contract early \u2014 " + money(fee) + " break fee.");
  try{ if(typeof v46RepBump === "function") v46RepBump("company", -2, "Walked away from a signed contract"); }catch(e){}
  rerender();
}
function toggleAuto(){
  var v = S(); if(!v) return;
  v.auto = v.auto === false;
  say(v.auto ? "Auto-dispatch on." : "Auto-dispatch off \u2014 you sign and seat contracts yourself.", v.auto ? "good" : "warn");
  rerender();
}

/* ===== 4. managers dispatch for you ===== */
function managerList(){
  var c = C(); if(!c) return [];
  return (c.employees||[]).filter(function(e){ return e && MGR_RUNG[e.rung] && MGR_DEPT[e.dept]; });
}
function span(){ return managerList().length * SPAN; }
function unitsRun(){
  var s = S7(), v = S();
  return Math.max(s ? s.trucks.length : 0, v ? v.contracts.length : 0);
}
function dispatch(){
  var v = S(), s = S7(); if(!v || !s || !isTruck()) return;
  var mgrs = managerList();
  if(!mgrs.length || v.auto === false) return;
  var cap = span();
  var idle = s.trucks.filter(function(t){ return seated(t) && !t.job; }).length;
  var signed = [];
  v.offers.slice().sort(function(a,b){ return (b.monthly/b.trucks) - (a.monthly/a.trucks); }).forEach(function(o){
    if(o.trucks > idle) return;
    if(unitsRun() >= cap) return;
    var have = s.trucks.filter(function(t){ return t.type === o.equip && seated(t) && !t.job; }).length;
    if(have < o.trucks) return;
    if(sign(o.id, true)){ idle -= o.trucks; signed.push(o.shipper + " (" + o.term + " mo, " + money(o.monthly) + "/mo)"); }
  });
  if(signed.length){
    log("\u{1F9D1}\u200D\u2708\uFE0F Dispatch signed " + signed.join(", ") + " and seated the trucks. " +
      mgrs.length + " manager(s) covering " + cap + " unit(s).");
  }
}
function advise(){
  var v = S(), s = S7(); if(!v || !s || !isTruck()) return;
  var u = unitsRun(), cap = span(), m = managerList().length;
  if(u > cap){
    var need = Math.ceil((u - cap) / SPAN);
    log("\u{1F9ED} " + (m ? m + " manager(s) dispatch " + cap + " unit(s); you are running " + u + "."
      : "Nobody is dispatching your " + u + " unit(s).") + " Hire " + need + " more manager" + (need>1?"s":"") +
      " (Freight Sales or Fleet \u2192 Manager) and they will sign and cover contracts for you.");
  }
  var short = v.contracts.filter(function(k){ return coverOf(k) < 1; });
  if(short.length){
    log("\u26A0\uFE0F " + short.length + " contract(s) short of seated trucks \u2014 you are only paid for the share you cover. " +
      "Three short months and the shipper walks.");
  }
}

/* ===== 5. the month ===== */
var stash = null;
function preMonth(){
  var c = C(), v = S(), s = S7(); if(!c || !v || !s || !isTruck()) return;
  migrate(); sync(); assignAll();
  var rev = 0, costs = 0, miles = 0;
  v.contracts.forEach(function(k){
    var cov = coverOf(k);
    var amount = Math.round(num(k.monthly) * cov);
    rev += amount;
    k.lastRev = amount;
    k.earned = num(k.earned) + amount;
    k.months = num(k.months) + 1;
    var crew = readyTrucks(k);
    var perTruck = Math.round(amount / Math.max(1, crew.length));
    crew.forEach(function(t){
      var mi = EQUIP[t.type].miles;
      miles += mi;
      t.odo = num(t.odo) + mi;
      t.condition = Math.max(0, num(t.condition,95) - Math.round(mi/1400));
      t.lifetimeGross = num(t.lifetimeGross) + perTruck;
      t.last = { miles:mi, gross:perTruck, work:k.shipper + " (" + k.commodity + ")" };
    });
    if(cov < 1) k.short = num(k.short) + 1; else k.short = 0;
  });
  costs += Math.round(miles * VAR_MILE);
  costs += s.trucks.length * PER_TRUCK;
  s.trucks.forEach(function(t){
    if(t.down){ t.down = false; return; }
    if(!t.job || !t.driver) t.last = null;
    if(num(t.condition,95) < 42 && Math.random() < 0.25){
      var bill = ri(1800, 5200);
      costs += bill; t.down = true;
      t.condition = Math.min(95, num(t.condition,40) + ri(25,45));
      log("\u{1F6E0}\uFE0F " + t.name + " broke down \u2014 " + money(bill) + " in repairs, out of service next month.");
    }
  });
  v.lastRev = Math.round(rev);
  v.lastCosts = Math.round(costs);
  v.lastNet = v.lastRev - v.lastCosts;
  pushLine();
  c.expensesBreakdown = c.expensesBreakdown || {};
  c.expensesBreakdown.freight = v.lastCosts;
  stash = { contracts:s.contracts, offers:s.offers, trucks:s.trucks, drivers:s.drivers, reps:s.reps };
  s.contracts = []; s.offers = []; s.trucks = []; s.drivers = []; s.reps = [];
}
function mergeById(base, extra){
  var out = (base||[]).slice(), have = {};
  out.forEach(function(x){ if(x && x.id) have[x.id] = true; });
  (extra||[]).forEach(function(x){ if(x && x.id && !have[x.id]){ out.push(x); have[x.id] = true; } });
  return out;
}
function postMonth(){
  var c = C(), v = S(), s = S7(); if(!c || !s) return;
  if(stash){
    s.trucks = mergeById(stash.trucks, s.trucks);
    s.drivers = mergeById(stash.drivers, s.drivers);
    s.contracts = stash.contracts;
    s.reps = stash.reps;
    s.offers = stash.offers;
    stash = null;
  }
  if(!v || !isTruck()) return;
  s.lastGross = 0; s.lastCosts = 0; s.lastNet = 0;
  if(s.hist.length && s.hist[0] && !num(s.hist[0].gross) && !num(s.hist[0].net)) s.hist.shift();
  s.offers = [];
  s.contracts = [];
  if(v.contracts.length || s.trucks.length){
    log("\u{1F69B} Freight month: " + money(v.lastRev) + " billed on " + v.contracts.length +
      " contract(s), " + money(v.lastCosts) + " in fuel, maintenance and plates. Driver and desk pay runs through payroll.");
  }
  v.contracts.forEach(function(k){ k.monthsLeft = num(k.monthsLeft) - 1; });
  v.contracts.filter(function(k){ return num(k.short) >= 3; }).forEach(function(k){
    log("\u274C " + k.shipper + " cancelled \u2014 three straight months without the trucks to cover the lane.");
    try{ if(typeof v46RepBump === "function") v46RepBump("company", -4, "Lost a contract for non-performance"); }catch(e){}
  });
  v.contracts.filter(function(k){ return num(k.monthsLeft) <= 0 && num(k.short) < 3; }).forEach(function(k){
    log("\u{1F4C4} The " + k.shipper + " contract ran its " + num(k.term) + "-month term and expired \u2014 " +
      money(num(k.earned)) + " earned. Your desk can chase a renewal.");
  });
  v.contracts = v.contracts.filter(function(k){ return num(k.monthsLeft) > 0 && num(k.short) < 3; });
  v.offers.forEach(function(o){ o.life = num(o.life) - 1; });
  v.offers = v.offers.filter(function(o){ return num(o.life) > 0; });
  sourceOffers();
  sync(); assignAll();
  dispatch();
  advise();
  assignAll();
  pushLine();
  v.hist.unshift({ y:c.year, m:c.month, rev:v.lastRev, costs:v.lastCosts, net:v.lastNet, n:v.contracts.length });
  if(v.hist.length > 12) v.hist.length = 12;
}
T("month-hook", function(){
  if(typeof window.advanceMonth !== "function") return;
  var prev = window.advanceMonth;
  window.advanceMonth = function(){
    T("pre", preMonth);
    var out;
    try{ out = prev.apply(this, arguments); }
    finally{ T("post", postMonth); }
    return out;
  };
});

function seed(){
  var v = S(), s = S7(); if(!v || !s || !isTruck() || v.seeded) return;
  v.seeded = true;
  migrate(); sync();
  var eq = s.trucks.length ? s.trucks[0].type : "dryvan";
  v.offers.push(makeOffer(eq, "your own phone calls", 1));
  v.offers.push(makeOffer(eq, "your own phone calls", 1));
  v.offers.forEach(function(o){ o.life = 3; });
  assignAll(); pushLine();
}

setInterval(function(){
  if(!isTruck()) return;
  T("keepalive", function(){ seed(); migrate(); sync(); assignAll(); pushLine(); });
}, 1500);

window.__v430api = {
  S:S, S7:S7, EQUIP:EQUIP, seated:seated, sync:sync, seed:seed,
  sign:sign, pass:pass, drop:drop, buyTruck:buyTruck, service:service, sellTruck:sellTruck,
  toggleAuto:toggleAuto, coverOf:coverOf, coveredRevenue:coveredRevenue, pushLine:pushLine,
  managerList:managerList, span:span, unitsRun:unitsRun, dispatch:dispatch,
  driverName:driverName, driverCount:driverCount, repCount:repCount,
  preMonth:preMonth, postMonth:postMonth, migrate:migrate, errs:function(){ return ERR; }
};
})();
/* ================= v4.30 UI - months-based fleet ops screen ================= */
(function v430ui(){
"use strict";
if(window.__v430uiOn) return; window.__v430uiOn = true;
var ERR = window.__v430err = window.__v430err || [];
function T(l,f){ try{ return f(); }catch(e){ if(ERR.length<80) ERR.push("ui-"+l+": "+((e&&e.message)||e)); } }
function A(){ return window.__v430api || null; }
function C(){ try{ return (typeof G!=="undefined" && G && G.company) || null; }catch(e){ return null; } }
function isTruck(){ var c=C(); return !!(c && c.industry === "trucking"); }
function num(v,d){ v=Number(v); return isFinite(v)?v:(d||0); }
function money(n){ try{ return fmt$(Math.round(n)); }catch(e){ return "$"+Math.round(n); } }
function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(m){ return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[m]; }); }
function tabNow(){ try{ return (G.ui && G.ui.activeTab) || ""; }catch(e){ return ""; } }
var DEAD_CARD = /Capacity vs commitments|Buy equipment|Your trucks|Active contracts|Contract board|Fleet history/;

function card(html){
  var d = document.createElement("div");
  d.className = "card mt14";
  d.setAttribute("data-v430keep", "1");
  d.innerHTML = html;
  return d;
}
function fleetNode(){
  var a = A(); if(!a) return null;
  var c = C(), v = a.S(), s = a.S7(); if(!c || !v || !s) return null;
  var wrap = document.createElement("div");
  wrap.setAttribute("data-v430fleet", "1");
  wrap.setAttribute("data-v430keep", "1");
  var mgr = a.managerList().length, cap = a.span(), units = a.unitsRun();
  var seatedCount = s.trucks.filter(function(t){ return a.seated(t); }).length;
  var committed = v.contracts.reduce(function(x,k){ return x + num(k.monthly); }, 0);
  var booked = a.coveredRevenue();

  wrap.innerHTML = '<div class="window-title"><h2>\u{1F69B} Fleet Operations</h2>'
    + '<span class="sub">' + money(booked) + '/mo under contract and covered \u00b7 '
    + s.trucks.length + ' truck(s), ' + seatedCount + ' seated \u00b7 '
    + v.contracts.length + ' active contract(s)</span></div>';

  var advice;
  if(units > cap){
    var need = Math.ceil((units - cap) / 5);
    advice = '<div class="desc bad">You are running ' + units + ' unit(s) and your managers cover ' + cap
      + '. Hire ' + need + ' more manager' + (need>1?'s':'') + ' on the Hiring screen (Freight Sales or Fleet, Drivers &amp; Maintenance \u2192 Manager) '
      + 'and they will sign contracts and seat trucks for you automatically.</div>';
  } else if(mgr){
    advice = '<div class="desc good">Your managers cover ' + cap + ' unit(s) and you are running ' + units
      + '. Dispatch signs and seats contracts for you each month.</div>';
  } else {
    advice = '<div class="desc">No managers on staff, so you are dispatching by hand. Any Manager-rung hire in Freight Sales, '
      + 'Fleet, Drivers &amp; Maintenance or Driver Support dispatches 5 trucks and contracts automatically.</div>';
  }
  wrap.appendChild(card('<h3>\u{1F9ED} Dispatch &amp; coverage</h3>'
    + '<table><thead><tr><th>Managers</th><th>Units covered</th><th>Trucks</th><th>Contracts</th><th>Auto-dispatch</th></tr></thead><tbody>'
    + '<tr><td>' + mgr + '</td><td>' + cap + '</td><td>' + s.trucks.length + '</td><td>' + v.contracts.length + '</td>'
    + '<td class="' + (v.auto === false ? 'bad' : 'good') + '">' + (v.auto === false ? 'off' : (mgr ? 'on' : 'needs a manager')) + '</td></tr>'
    + '</tbody></table>' + advice
    + '<div class="row mt8"><button class="btn small" data-v430auto="1">'
    + (v.auto === false ? 'Turn auto-dispatch on' : 'Turn auto-dispatch off') + '</button></div>'));

  var off = '<h3>\u{1F4DE} Contract board</h3>'
    + '<div class="muted mb8" style="font-size:12px;">Contracts pay a flat amount every month for their whole term. '
    + 'You are paid for the share of the lane your seated trucks cover, so keep a truck and a driver on every contract you sign.</div>';
  if(!v.offers.length){
    off += '<div class="desc">Nothing on the board. '
      + (a.repCount() ? 'Your freight desk will bring in offers next month.'
        : 'Hire a Freight Agent under Freight Sales and offers start arriving; until then you find about one a month yourself.') + '</div>';
  } else {
    off += v.offers.map(function(o){
      var eq = a.EQUIP[o.equip];
      return '<div class="ladder-card"><div class="row"><div>'
        + '<div class="title">' + esc(o.shipper) + ' \u2014 ' + money(o.monthly) + '/mo for ' + o.term + ' months</div>'
        + '<div class="desc">' + esc(o.commodity) + ' on ' + eq.name.toLowerCase() + ' equipment \u00b7 needs ' + o.trucks
        + ' seated truck(s) \u00b7 $' + o.rate.toFixed(2) + '/mi basis</div>'
        + '<div class="desc">Total value ' + money(o.monthly * o.term) + ' \u00b7 sourced by ' + esc(o.by)
        + ' \u00b7 expires in ' + num(o.life) + ' month(s)</div></div>'
        + '<div><button class="btn small" data-v430sign="' + o.id + '">Sign</button> '
        + '<button class="btn small ghost" data-v430pass="' + o.id + '">Pass</button></div></div></div>';
    }).join("");
  }
  wrap.appendChild(card(off));

  var act = '<h3>\u{1F4C4} Active contracts</h3>';
  if(!v.contracts.length){
    act += '<div class="desc">No contracts. A truck with no contract earns nothing and still costs you plates and insurance.</div>';
  } else {
    act += '<table><thead><tr><th>Shipper</th><th>Equipment</th><th>Pays</th><th>Term left</th><th>Trucks</th><th>Covered</th><th>Paid last month</th><th></th></tr></thead><tbody>'
      + v.contracts.map(function(k){
          var pct = Math.round(a.coverOf(k) * 100);
          return '<tr><td>' + esc(k.shipper) + '</td><td>' + a.EQUIP[k.equip].name + '</td>'
            + '<td>' + money(k.monthly) + '/mo</td>'
            + '<td>' + num(k.monthsLeft) + ' of ' + num(k.term) + ' mo</td>'
            + '<td>' + (k.fleet||[]).length + ' / ' + num(k.trucks) + '</td>'
            + '<td class="' + (pct >= 100 ? 'good' : 'bad') + '">' + pct + '%'
            + (num(k.short) ? ' (' + num(k.short) + ' short month' + (num(k.short)>1?'s':'') + ')' : '') + '</td>'
            + '<td>' + money(num(k.lastRev)) + '</td>'
            + '<td><button class="btn small ghost" data-v430drop="' + k.id + '">Terminate</button></td></tr>';
        }).join("")
      + '</tbody></table>'
      + '<div class="desc">Committed revenue: ' + money(committed) + '/mo \u00b7 currently covered: ' + money(booked) + '/mo</div>';
  }
  wrap.appendChild(card(act));

  var fl = '<h3>\u{1F69B} Your fleet</h3>';
  if(!s.trucks.length){
    fl += '<div class="desc">No tractors. Buy one below.</div>';
  } else {
    fl += '<table><thead><tr><th>Truck</th><th>Driver</th><th>Hauling</th><th>Condition</th><th>Odometer</th><th>Last month</th><th></th></tr></thead><tbody>'
      + s.trucks.map(function(t){
          var k = v.contracts.filter(function(x){ return x.id === t.job; })[0];
          var cond = num(t.condition,95);
          return '<tr><td>' + esc(t.name) + '</td>'
            + '<td class="' + (t.driver ? '' : 'bad') + '">' + (t.driver ? esc(a.driverName(t.driver)) : 'no driver') + '</td>'
            + '<td>' + (t.down ? '<span class="bad">in the shop</span>' : (k ? esc(k.shipper) : '<span class="bad">idle</span>')) + '</td>'
            + '<td class="' + (cond < 45 ? 'bad' : '') + '">' + cond + '%</td>'
            + '<td>' + num(t.odo).toLocaleString() + ' mi</td>'
            + '<td>' + (t.last ? money(num(t.last.gross)) : '\u2014') + '</td>'
            + '<td><button class="btn small" data-v430service="' + t.id + '">Service</button> '
            + '<button class="btn small ghost" data-v430sell="' + t.id + '">Sell</button></td></tr>';
        }).join("")
      + '</tbody></table>';
  }
  fl += '<h4 class="mt14">Buy equipment</h4>'
    + '<div class="muted mb8" style="font-size:12px;">A tractor needs a driver to earn. Drivers are hired on the Hiring screen under Fleet, Drivers &amp; Maintenance.</div>'
    + ["dryvan","reefer","flatbed","daycab"].map(function(kk){
        var e = a.EQUIP[kk];
        var mid = Math.round(e.miles * (e.rate[0] + e.rate[1]) / 2);
        return '<div class="ladder-card"><div class="row"><div>'
          + '<div class="title">' + e.name + ' \u2014 ' + money(e.cost) + '</div>'
          + '<div class="desc">Runs ' + e.miles.toLocaleString() + ' miles a month \u00b7 a lane on this equipment pays about '
          + money(mid) + '/mo per truck</div></div>'
          + '<button class="btn small" data-v430buy="' + kk + '">Buy</button></div></div>';
      }).join("");
  wrap.appendChild(card(fl));

  wrap.appendChild(card('<h3>\u{1F465} Crew</h3>'
    + '<table><thead><tr><th>Role</th><th>On staff</th><th>Hired where</th></tr></thead><tbody>'
    + '<tr><td>Drivers</td><td>' + a.driverCount() + '</td><td>Hiring \u2192 Fleet, Drivers &amp; Maintenance</td></tr>'
    + '<tr><td>Freight desk</td><td>' + a.repCount() + '</td><td>Hiring \u2192 Freight Sales</td></tr>'
    + '<tr><td>Dispatch managers</td><td>' + mgr + '</td><td>Any Manager rung in those departments</td></tr>'
    + '</tbody></table>'
    + '<div class="desc">Drivers and freight agents are ordinary employees on the ordinary ladder \u2014 their pay runs through payroll '
    + 'with everyone else, and promotions work the same way.</div>'));

  if(v.hist.length){
    wrap.appendChild(card('<h3>Freight history</h3>'
      + '<table><thead><tr><th>Month</th><th>Contracts</th><th>Billed</th><th>Fuel, maint, plates</th><th>Contribution</th></tr></thead><tbody>'
      + v.hist.map(function(h){
          return '<tr><td>' + num(h.m) + '/' + num(h.y) + '</td><td>' + num(h.n) + '</td><td>' + money(num(h.rev))
            + '</td><td>' + money(num(h.costs)) + '</td><td class="' + (num(h.net) >= 0 ? 'good' : 'bad') + '">'
            + money(num(h.net)) + '</td></tr>';
        }).join("")
      + '</tbody></table>'));
  }
  return wrap;
}

function wire(root){
  var a = A(); if(!a) return;
  function on(sel, fn){
    var n = root.querySelectorAll(sel);
    for(var i=0;i<n.length;i++){
      (function(el){
        if(el.__v430wired) return;
        el.__v430wired = true;
        el.onclick = function(){ fn(el); };
      })(n[i]);
    }
  }
  on("[data-v430sign]", function(el){ a.sign(el.getAttribute("data-v430sign")); });
  on("[data-v430pass]", function(el){ a.pass(el.getAttribute("data-v430pass")); });
  on("[data-v430drop]", function(el){ a.drop(el.getAttribute("data-v430drop")); });
  on("[data-v430buy]", function(el){ a.buyTruck(el.getAttribute("data-v430buy")); });
  on("[data-v430service]", function(el){ a.service(el.getAttribute("data-v430service")); });
  on("[data-v430sell]", function(el){ a.sellTruck(el.getAttribute("data-v430sell")); });
  on("[data-v430auto]", function(){ a.toggleAuto(); });
}

function stampOf(){
  var a = A(); if(!a) return "";
  var v = a.S(), s = a.S7(), c = C();
  if(!v || !s || !c) return "";
  return [s.trucks.length, v.contracts.length, v.offers.length, v.hist.length, Math.round(num(c.cash)),
    (c.employees||[]).length, v.auto === false ? 0 : 1,
    s.trucks.map(function(t){ return (t.driver||"-") + (t.job||"-") + num(t.condition); }).join("|"),
    v.contracts.map(function(k){ return num(k.monthsLeft) + ":" + (k.fleet||[]).length; }).join("|")].join(",");
}

function sweep(){
  var a = A(); if(!a) return;
  var screen = document.getElementById("screen");
  if(!screen) return;
  ["[data-v427drivers]","[data-v427sales]"].forEach(function(sel){
    var n = screen.querySelector(sel);
    if(n && n.parentNode) n.parentNode.removeChild(n);
  });
  if(!isTruck()) return;
  var sels = screen.querySelectorAll("select");
  for(var i=0;i<sels.length;i++){
    var sel = sels[i];
    if(sel.hasAttribute("data-v427assign")) continue;
    var hasDept = false, hasSales = false;
    for(var o=0;o<sel.options.length;o++){
      var val = sel.options[o].value;
      if(val === "operations" || val === "finance" || val === "hr") hasDept = true;
      if(val === "sales") hasSales = true;
    }
    if(hasDept && !hasSales){
      var opt = document.createElement("option");
      opt.value = "sales";
      try{ opt.textContent = (LADDERS.sales && LADDERS.sales.label) || "Freight Sales"; }catch(e){ opt.textContent = "Freight Sales"; }
      sel.insertBefore(opt, sel.firstChild);
    }
  }
  if(tabNow() !== "industry") return;
  a.seed();
  var cards = screen.querySelectorAll(".card");
  for(var k=0;k<cards.length;k++){
    if(cards[k].hasAttribute("data-v430keep")) continue;
    var h = cards[k].querySelector("h3");
    if(h && DEAD_CARD.test((h.textContent||"").trim()) && cards[k].parentNode){
      cards[k].parentNode.removeChild(cards[k]);
    }
  }
  var mine = screen.querySelector("[data-v430fleet]");
  var stamp = stampOf();
  if(mine && mine.getAttribute("data-v430stamp") === stamp){ wire(mine); return; }
  var node = null;
  T("build", function(){ node = fleetNode(); });
  if(!node) return;
  node.setAttribute("data-v430stamp", stamp);
  if(mine && mine.parentNode) mine.parentNode.replaceChild(node, mine);
  else {
    var title = screen.querySelector(".window-title");
    if(title && title.parentNode === screen) screen.insertBefore(node, title.nextSibling);
    else screen.appendChild(node);
    var mineTitle = node.querySelector(".window-title");
    if(title && mineTitle && mineTitle.parentNode === node){
      var sub = title.querySelector(".sub");
      var mysub = mineTitle.querySelector(".sub");
      if(sub && mysub) sub.textContent = mysub.textContent;
      node.removeChild(mineTitle);
    }
  }
  wire(node);
}

T("render-hook", function(){
  if(typeof window.renderScreen !== "function") return;
  var prev = window.renderScreen;
  window.renderScreen = function(){
    var out = prev.apply(this, arguments);
    T("sweep", sweep);
    return out;
  };
});
setInterval(function(){ T("tick", sweep); }, 900);
window.__v430ui = { sweep:sweep, build:fleetNode };
})();
/* ===== v4.31 — supplier contracts gated to unit-buying industries ===== */
(function(){
  window.__v431err = window.__v431err || [];
  function T(tag, fn){ try{ return fn(); }catch(e){ window.__v431err.push(tag + ": " + (e && e.message)); } }
  function C(){ try{ return (typeof G !== "undefined" && G && G.company) || null; }catch(e){ return null; } }

  /* An industry "buys units" only if it has a real ops layer. retail, restaurant,
     robotics and finance do. SaaS, salon, trucking and agency do not. */
  function unitOps(){
    try{
      var cfg = (typeof industry === "function") ? industry() : null;
      if(cfg && cfg.opsType) return true;
      var c = C(), o = c && c.ops;
      if(o && (typeof o.unitCost === "number" || typeof o.inventory === "number" || Array.isArray(o.stores))) return true;
      return false;
    }catch(e){ return false; }
  }

  /* Force the contract back to spot buying. Tier 1 makes every downstream hook
     inert: no discount to apply, no minimum to miss, no penalty to charge. */
  function clear(){
    var c = C(); if(!c) return false;
    var s = c.supplyContract;
    var live = !!(s && (s.tier > 1 || s.monthsLeft > 0 || s.committed > 0));
    c.supplyContract = { tier:1, monthsLeft:0, committed:0, shortfalls:0 };
    return live;
  }

  var announced = false;
  function enforce(){
    if(unitOps()) return;
    var had = clear();
    if(had && !announced){
      announced = true;
      T("log", function(){
        if(typeof logHistory === "function")
          logHistory("\uD83D\uDCE6 Supplier volume contract cancelled at no charge — this business does not buy units, so the commitment was costing you a monthly shortfall penalty for nothing.");
      });
    }
    T("sweep", function(){
      var n = document.querySelectorAll("[data-v32supplybox]");
      for(var i = 0; i < n.length; i++) n[i].remove();
    });
  }

  /* 1. Month close: never charge a shortfall to a business with no units. */
  T("month", function(){
    if(typeof window.v32SupplyMonthly !== "function") return;
    var prev = window.v32SupplyMonthly;
    window.v32SupplyMonthly = function(report){
      if(!unitOps()){ enforce(); return; }
      return prev.apply(this, arguments);
    };
  });

  /* 2. Signing: refuse outright rather than take a commitment that cannot pay off. */
  T("sign", function(){
    if(typeof window.v32SignSupply !== "function") return;
    var prev = window.v32SignSupply;
    window.v32SignSupply = function(tier){
      if(!unitOps()){
        enforce();
        T("toast", function(){
          if(typeof v30Toast === "function")
            v30Toast("<b>Not applicable here.</b> Volume supplier contracts discount goods you purchase by the unit. This business does not buy units.", "warn");
        });
        return;
      }
      return prev.apply(this, arguments);
    };
  });

  /* 3. Card: strip it on every render and on a slow tick, since the mount that
        adds it wraps renderScreen further up the chain. */
  T("render", function(){
    if(typeof window.renderScreen !== "function") return;
    var prev = window.renderScreen;
    window.renderScreen = function(){
      var out = prev.apply(this, arguments);
      enforce();
      return out;
    };
  });

  setInterval(enforce, 1500);
  T("boot", enforce);

  window.__v431api = { unitOps:unitOps, clear:clear, enforce:enforce };
})();
/* ===== v4.32 - standing delegation: fleet ops and freight sales leaders run themselves ===== */
(function(){
if(window.__v432on) return; window.__v432on = true;
var ERR = window.__v432err = window.__v432err || [];
function T(tag, fn){ try{ return fn(); }catch(e){ if(ERR.length<120) ERR.push(tag + ": " + ((e && e.message) || e)); } }
function A(){ return window.__v430api || null; }
function C(){ try{ return (typeof G !== "undefined" && G && G.company) || null; }catch(e){ return null; } }
function isTruck(){ var c = C(); return !!(c && c.industry === "trucking"); }
function num(v,d){ v = Number(v); return isFinite(v) ? v : (d||0); }
function money(n){ try{ return fmt$(Math.round(n)); }catch(e){ return "$" + Math.round(n); } }
function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g, function(m){ return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[m]; }); }
function hist(t){ try{ logHistory(t); }catch(e){} }

var DRIVER_RUNG = { dryvan:"v428_dry", reefer:"v428_reefer", flatbed:"v428_flat", daycab:"v428_day" };
var MGRK = { manager:1, director:1, vp:1, cro:1, coo:1, v428_safety:1, v428_dirfleet:1 };
var MODES = {
  careful: { k:2,   label:"Careful",  desc:"keeps two months of burn in the bank" },
  balanced:{ k:1,   label:"Balanced", desc:"keeps one month of burn in the bank" },
  bold:    { k:0.5, label:"Bold",     desc:"keeps half a month of burn in the bank" }
};
var OPS_AUTH = [ null,
  { grow:0,    seatAll:false, mgrs:0, sign:"seated", who:"Terminal / Safety Manager" },
  { grow:0.34, seatAll:true,  mgrs:1, sign:"buy",    who:"Director of Operations / Fleet" },
  { grow:0.60, seatAll:true,  mgrs:2, sign:"buy",    who:"VP, Fleet Operations / COO" } ];
var SALES_AUTH = [ null,
  { agents:2, mgrs:0, desk:0,   who:"Freight Sales Manager" },
  { agents:4, mgrs:1, desk:1,   who:"Director of Freight Sales" },
  { agents:6, mgrs:2, desk:1.5, who:"VP, Freight Sales / CRO" } ];
/* equipment authority scales with the fleet: a VP running 20 trucks can add 12 in a month */
function truckAuthority(tier, fleet){
  if(tier <= 1) return 0;
  return Math.max(tier >= 3 ? 4 : 2, Math.ceil(fleet * OPS_AUTH[tier].grow));
}
function deskTarget(tier, fleet){
  if(tier <= 1) return 2;
  return Math.max(tier >= 3 ? 3 : 2, Math.ceil(fleet * SALES_AUTH[tier].desk));
}

function store(){
  var c = C(); if(!c) return null;
  if(!c.__v432 || typeof c.__v432 !== "object") c.__v432 = {};
  var d = c.__v432;
  if(typeof d.ops !== "boolean") d.ops = true;
  if(typeof d.sales !== "boolean") d.sales = true;
  if(!MODES[d.mode]) d.mode = "balanced";
  if(!d.last || typeof d.last !== "object") d.last = null;
  return d;
}
function rungLabel(dept, rung){
  try{
    var r = LADDERS[dept].rungs.filter(function(x){ return x.key === rung; })[0];
    return (r && r.label) || rung;
  }catch(e){ return rung; }
}
function midSal(dept, rung){
  try{
    var r = LADDERS[dept].rungs.filter(function(x){ return x.key === rung; })[0];
    return r ? Math.round((r.salaryRange[0] + r.salaryRange[1]) / 2) : 6000;
  }catch(e){ return 6000; }
}
function tierOf(dept){
  var c = C(); if(!c) return 0;
  var top = 0;
  (c.employees||[]).forEach(function(e){
    if(!e || e.dept !== dept) return;
    var t = 0;
    if(dept === "operations"){
      if(e.rung === "manager" || e.rung === "v428_safety") t = 1;
      else if(e.rung === "director" || e.rung === "v428_dirfleet") t = 2;
      else if(e.rung === "vp" || e.rung === "coo") t = 3;
    } else {
      if(e.rung === "manager") t = 1;
      else if(e.rung === "director") t = 2;
      else if(e.rung === "vp" || e.rung === "cro") t = 3;
    }
    if(t > top) top = t;
  });
  return top;
}
function leadersOf(dept){
  var c = C(); if(!c) return [];
  return (c.employees||[]).filter(function(e){ return e && e.dept === dept && MGRK[e.rung]; });
}
function burn(){
  var c = C(), a = A(); if(!c) return 0;
  var pay = (c.employees||[]).reduce(function(x,e){ return x + num(e && e.salary); }, 0);
  var s = a ? a.S7() : null;
  var trucks = s ? s.trucks.length : 0;
  return pay + 1400 * trucks + 3500;
}
function reserve(){ var d = store(); return Math.max(20000, Math.round(burn() * MODES[d.mode].k)); }
function spendable(){ var c = C(); return c ? Math.max(0, num(c.cash) - reserve()) : 0; }
function headroom(){
  var c = C(); if(!c) return 0;
  var cap = 250;
  try{ cap = headcountCap(); }catch(e){}
  var q = 0;
  try{ q = (G.ui.queue||[]).reduce(function(s,x){ return s + (x.hireDept ? (x.hireQty||1) : 0); }, 0); }catch(e){}
  return Math.max(0, cap - (c.employees||[]).length - q);
}
function canAfford(dept, rung){
  return spendable() >= midSal(dept, rung) * 2;
}
function take(dept, rung){
  if(headroom() <= 0) return null;
  if(!canAfford(dept, rung)) return null;
  var e = null;
  T("hire", function(){ e = hire(dept, rung); });
  return e;
}

/* replicate assignAll (not exported by the v4.30 layer) */
function assign(){
  var a = A(); if(!a) return;
  var v = a.S(), s = a.S7(); if(!v || !s) return;
  var used = {};
  v.contracts.forEach(function(k){
    k.fleet = (k.fleet || []).filter(function(id){
      var t = s.trucks.filter(function(x){ return x.id === id; })[0];
      if(!t || t.type !== k.equip || used[id]) return false;
      used[id] = true; return true;
    });
  });
  v.contracts.forEach(function(k){
    if(k.fleet.length >= num(k.trucks,1)) return;
    var pool = s.trucks.filter(function(t){ return t.type === k.equip && !used[t.id]; });
    pool.sort(function(x,y){ return (a.seated(y)?1:0) - (a.seated(x)?1:0); });
    while(k.fleet.length < num(k.trucks,1) && pool.length){
      var t = pool.shift(); k.fleet.push(t.id); used[t.id] = true;
    }
  });
  s.trucks.forEach(function(t){ t.job = null; });
  v.contracts.forEach(function(k){
    (k.fleet||[]).forEach(function(id){
      var t = s.trucks.filter(function(x){ return x.id === id; })[0];
      if(t) t.job = k.id;
    });
  });
}
function settle(){ var a = A(); if(!a) return; T("settle", function(){ a.sync(); assign(); a.pushLine(); }); }

function freeTrucks(equip){
  var a = A(), s = a && a.S7(); if(!s) return [];
  return s.trucks.filter(function(t){ return t.type === equip && !t.job; });
}
function deficitByEquip(){
  var a = A(), v = a && a.S(); var out = {};
  if(!v) return out;
  v.contracts.forEach(function(k){
    var short = Math.max(0, num(k.trucks,1) - (k.fleet||[]).length);
    if(short > 0) out[k.equip] = (out[k.equip]||0) + short;
  });
  return out;
}

/* ===== the monthly delegation pass ===== */
function runDelegation(){
  if(!isTruck()) return;
  var a = A(), c = C(), d = store();
  if(!a || !c || !d) return;
  var v = a.S(), s = a.S7(); if(!v || !s) return;
  var opsTier = d.ops ? tierOf("operations") : 0;
  var salesTier = d.sales ? tierOf("sales") : 0;
  if(!opsTier && !salesTier) return;

  var rep = { hiredAgents:0, hiredDrivers:0, hiredMgrs:0, bought:[], signed:[], blocked:[] };
  settle();

  /* --- 1. Freight Sales builds the desk --- */
  if(salesTier){
    var sb = SALES_AUTH[salesTier];
    var trucksNow = s.trucks.length;
    var target = deskTarget(salesTier, trucksNow);
    var agents = (c.employees||[]).filter(function(e){ return e && e.dept === "sales" && !MGRK[e.rung]; }).length;
    var want = Math.max(0, target - agents);
    for(var i=0; i<sb.agents && want > 0; i++){
      if(headroom() <= 0){ rep.blocked.push("headcount cap reached before the freight desk was fully staffed"); break; }
      if(!canAfford("sales","rep")){ rep.blocked.push("cash reserve blocked further freight-desk hiring"); break; }
      if(take("sales","rep")){ rep.hiredAgents++; want--; } else break;
    }
  }

  /* --- 2. managers to widen dispatch span --- */
  function backfillManagers(limit){
    var made = 0;
    while(made < limit && a.unitsRun() >= a.span()){
      var dept = (tierOf("operations") >= 2 && d.ops) ? "operations" : ((tierOf("sales") >= 2 && d.sales) ? "sales" : null);
      if(!dept) break;
      if(headroom() <= 0){ rep.blocked.push("headcount cap blocked a manager hire"); break; }
      if(!canAfford(dept, "manager")){ rep.blocked.push("cash reserve blocked a manager hire"); break; }
      if(!take(dept, "manager")) break;
      rep.hiredMgrs++; made++;
    }
    return made;
  }
  var mgrBudget = (opsTier ? OPS_AUTH[opsTier].mgrs : 0) + (salesTier ? SALES_AUTH[salesTier].mgrs : 0);
  if(mgrBudget > 0) backfillManagers(mgrBudget);

  /* --- 3. Fleet Ops signs every offer it can stand behind --- */
  var truckBudget = opsTier ? truckAuthority(opsTier, s.trucks.length) : 0;
  var driverBudget = opsTier ? (OPS_AUTH[opsTier].seatAll ? 999 : 3) : 0;

  /* an empty seat earns nothing, so crew the trucks you already own before buying more */
  function seatFleet(){
    if(!opsTier) return;
    var open = s.trucks.filter(function(t){ return !t.driver; });
    for(var u=0; u<open.length; u++){
      if(driverBudget <= 0) break;
      var rung = DRIVER_RUNG[open[u].type] || "v428_dry";
      if(headroom() <= 0){ rep.blocked.push("headcount cap left " + (open.length - u) + " truck(s) without drivers"); break; }
      if(!canAfford("operations", rung)){ rep.blocked.push("cash reserve left " + (open.length - u) + " truck(s) without drivers"); break; }
      if(!take("operations", rung)) break;
      rep.hiredDrivers++; driverBudget--;
    }
    settle();
  }
  seatFleet();

  if(opsTier){
    var auth = OPS_AUTH[opsTier];
    var offers = v.offers.slice().sort(function(x,y){
      return (num(y.monthly)/Math.max(1,num(y.trucks,1))) - (num(x.monthly)/Math.max(1,num(x.trucks,1)));
    });
    offers.forEach(function(o){
      if(a.unitsRun() >= a.span()){
        if(!backfillManagers(1)){ rep.blocked.push("no dispatch span left for more contracts"); return; }
      }
      var need = num(o.trucks,1);
      var free = freeTrucks(o.equip).length;
      var short = Math.max(0, need - free);
      if(short > 0){
        if(auth.sign !== "buy"){ rep.blocked.push("a manager passed on " + o.shipper + " (needs " + short + " more truck(s) - director authority required)"); return; }
        if(short > truckBudget){ rep.blocked.push("held off on " + o.shipper + " (" + short + " trucks needed, " + truckBudget + " left in this month's equipment authority)"); return; }
        if(headroom() < short){ rep.blocked.push("held off on " + o.shipper + " (no headcount room for " + short + " more driver(s))"); return; }
        var def = a.EQUIP[o.equip];
        var bill = short * num(def && def.cost, 45000);
        if(bill > spendable()){ rep.blocked.push("held off on " + o.shipper + " (" + money(bill) + " of trucks exceeds the cash reserve)"); return; }
      }
      if(!a.sign(o.id, true)) return;
      rep.signed.push(o.shipper + " - " + money(o.monthly) + "/mo x " + o.term + " mo");
      for(var b=0; b<short; b++){
        if(truckBudget <= 0) break;
        var before = s.trucks.length;
        T("buy", function(){ a.buyTruck(o.equip); });
        if(s.trucks.length > before){ truckBudget--; rep.bought.push((a.EQUIP[o.equip]||{}).name || o.equip); }
        else break;
      }
      settle();
    });

    /* --- 4. cover any contract still short of equipment --- */
    var gap = deficitByEquip();
    Object.keys(gap).forEach(function(eq){
      for(var b=0; b<gap[eq]; b++){
        if(truckBudget <= 0) return;
        var def = a.EQUIP[eq];
        if(num(def && def.cost, 45000) > spendable()){ rep.blocked.push("cash reserve blocked buying a " + ((def&&def.name)||eq) + " tractor"); return; }
        var before = s.trucks.length;
        T("buy2", function(){ a.buyTruck(eq); });
        if(s.trucks.length > before){ truckBudget--; rep.bought.push((def&&def.name)||eq); } else return;
      }
    });
    settle();

    /* --- 5. crew everything bought this month --- */
    seatFleet();
  }

  /* --- 6. residual auto-dispatch, then report --- */
  T("dispatch", function(){ a.dispatch(); });
  settle();

  var lines = [];
  if(rep.signed.length) lines.push("signed " + rep.signed.length + " contract(s): " + rep.signed.join("; "));
  if(rep.bought.length) lines.push("bought " + rep.bought.length + " tractor(s): " + rep.bought.join(", "));
  if(rep.hiredDrivers) lines.push("hired " + rep.hiredDrivers + " driver(s)");
  if(rep.hiredAgents) lines.push("hired " + rep.hiredAgents + " freight agent(s)");
  if(rep.hiredMgrs) lines.push("hired " + rep.hiredMgrs + " manager(s) to widen dispatch");
  rep.blocked = rep.blocked.filter(function(x,i,arr){ return arr.indexOf(x) === i; }).slice(0,4);
  d.last = { month:c.month, year:c.year, lines:lines, blocked:rep.blocked,
    ops:opsTier, sales:salesTier, reserve:reserve() };
  if(lines.length){
    hist("\u{1F5C2}\uFE0F Your leadership team ran the business: " + lines.join("; ") + ".");
  }
}

/* ===== month hook ===== */
T("month-hook", function(){
  if(typeof window.advanceMonth !== "function") return;
  var prev = window.advanceMonth;
  window.advanceMonth = function(){
    var out = prev.apply(this, arguments);
    T("run", runDelegation);
    return out;
  };
});

/* ===== UI: authority card inside the v4.30 Fleet Operations screen ===== */
function stamp(){
  var c = C(), a = A(), d = store(); if(!c || !a || !d) return "x";
  var s = a.S7(), v = a.S();
  return [c.month, c.year, d.ops?1:0, d.sales?1:0, d.mode, tierOf("operations"), tierOf("sales"),
    s?s.trucks.length:0, v?v.contracts.length:0, (c.employees||[]).length].join("|");
}
function row(dept, tier, auth){
  var leaders = leadersOf(dept);
  var name = dept === "operations" ? "Fleet Operations" : "Freight Sales";
  var who = leaders.length
    ? leaders.map(function(e){ return esc(e.name) + " <span class=\"muted\">(" + esc(rungLabel(dept, e.rung)) + ")</span>"; }).join("<br>")
    : '<span class="muted">no leader appointed</span>';
  var can;
  if(!tier){
    can = '<span class="muted">Hire a Manager, Director or VP in ' + esc(name) + ' to delegate.</span>';
  } else if(dept === "operations"){
    var a2 = A(), fleet = (a2 && a2.S7()) ? a2.S7().trucks.length : 0;
    can = (auth.sign === "buy"
      ? "Signs inbound contracts and buys the tractors to cover them (up to " + truckAuthority(tier, fleet) + " this month, scaling with the fleet), "
      : "Signs contracts already coverable by idle trucks, ")
      + (auth.seatAll ? "hires a driver for every empty seat" : "seats up to 3 driver(s)/mo")
      + (auth.mgrs ? ", and hires up to " + auth.mgrs + " manager(s)/mo to widen dispatch." : ".");
  } else {
    var a3 = A(), fl = (a3 && a3.S7()) ? a3.S7().trucks.length : 0;
    can = "Grows the freight desk toward " + deskTarget(tier, fl) + " agent(s), up to " + auth.agents + " hire(s)/mo"
      + (auth.mgrs ? ", and hires up to " + auth.mgrs + " manager(s)/mo." : ".")
      + " More agents means more inbound contracts.";
  }
  var tierName = tier ? ["", "Manager", "Director", "VP / C-suite"][tier] : "\u2014";
  return '<tr><td><b>' + esc(name) + '</b></td><td>' + who + '</td><td>' + esc(tierName) + '</td><td>' + can + '</td></tr>';
}
function buildCard(){
  var c = C(), a = A(), d = store(); if(!c || !a || !d) return null;
  var opsTier = tierOf("operations"), salesTier = tierOf("sales");
  var wrap = document.createElement("div");
  wrap.className = "card mt14";
  wrap.setAttribute("data-v432card", "1");
  wrap.setAttribute("data-v430keep", "1");

  var modeBtns = Object.keys(MODES).map(function(k){
    return '<button class="btn small' + (d.mode === k ? " primary" : "") + '" data-v432mode="' + k + '">' + MODES[k].label + '</button>';
  }).join(" ");

  var last;
  if(d.last && (d.last.lines.length || d.last.blocked.length)){
    last = '<div class="desc" style="margin-top:8px"><b>Last month (M' + d.last.month + '/Y' + d.last.year + '):</b> '
      + (d.last.lines.length ? esc(d.last.lines.join("; ")) + "." : "nothing needed doing.")
      + (d.last.blocked.length ? ' <span class="bad">Held back: ' + esc(d.last.blocked.join("; ")) + '.</span>' : "")
      + '</div>';
  } else {
    last = '<div class="desc muted" style="margin-top:8px">No delegated actions yet \u2014 advance a month.</div>';
  }

  wrap.innerHTML = '<h3>\u{1F5C2}\uFE0F Standing delegation</h3>'
    + '<div class="desc">Your leaders act on their own every month so you do not have to buy trucks and hire crews by hand. '
    + 'Authority grows with rank.</div>'
    + '<table><thead><tr><th>Function</th><th>Leadership</th><th>Authority</th><th>What they do each month</th></tr></thead><tbody>'
    + row("operations", opsTier, OPS_AUTH[opsTier] || {})
    + row("sales", salesTier, SALES_AUTH[salesTier] || {})
    + '</tbody></table>'
    + '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
    + '<button class="btn small' + (d.ops ? " primary" : "") + '" data-v432t="ops">Fleet Ops delegation: ' + (d.ops ? "ON" : "OFF") + '</button>'
    + '<button class="btn small' + (d.sales ? " primary" : "") + '" data-v432t="sales">Freight Sales delegation: ' + (d.sales ? "ON" : "OFF") + '</button>'
    + '<span class="muted">Spending style:</span> ' + modeBtns
    + '</div>'
    + '<div class="desc muted" style="margin-top:6px">' + esc(MODES[d.mode].label) + " \u2014 " + esc(MODES[d.mode].desc)
    + '. Right now they will not let company cash fall below <b>' + money(reserve()) + '</b>. '
    + 'Headroom under the office cap: ' + headroom() + ' more hire(s).</div>'
    + last;
  return wrap;
}
function mount(){
  if(!isTruck()) return;
  var screen = document.getElementById("screen"); if(!screen) return;
  var host = screen.querySelector("[data-v430fleet]"); if(!host) return;
  var mine = host.querySelector("[data-v432card]");
  var st = stamp();
  if(mine && mine.getAttribute("data-v432stamp") === st) return;
  var node = null;
  T("build", function(){ node = buildCard(); });
  if(!node) return;
  node.setAttribute("data-v432stamp", st);
  if(mine && mine.parentNode) mine.parentNode.replaceChild(node, mine);
  else host.appendChild(node);
}
T("render-hook2", function(){
  if(typeof window.renderScreen !== "function") return;
  var prev = window.renderScreen;
  window.renderScreen = function(){
    var out = prev.apply(this, arguments);
    T("mount", mount);
    return out;
  };
});
T("observer", function(){
  var screen = document.getElementById("screen"); if(!screen || !window.MutationObserver) return;
  var pending = false;
  new MutationObserver(function(){
    if(pending) return;
    pending = true;
    setTimeout(function(){ pending = false; T("mount-obs", mount); }, 60);
  }).observe(screen, { childList:true, subtree:true });
});
document.addEventListener("click", function(ev){
  var t = ev.target && ev.target.closest && ev.target.closest("[data-v432t],[data-v432mode]");
  if(!t) return;
  if(!isTruck()) return;
  var d = store(); if(!d) return;
  ev.preventDefault(); ev.stopPropagation();
  var k = t.getAttribute("data-v432t");
  if(k){ d[k] = !d[k]; }
  else { d.mode = t.getAttribute("data-v432mode") || "balanced"; }
  T("click-render", function(){ if(typeof renderScreen === "function") renderScreen(); });
  T("click-mount", mount);
}, true);

window.__v432api = { run:runDelegation, store:store, tierOf:tierOf, reserve:reserve,
  headroom:headroom, mount:mount, assign:assign, errs:function(){ return ERR; } };
})();
