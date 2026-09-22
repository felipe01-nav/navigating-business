/* ============ v4.28d — A: core, rep zero, decisions cleanup, tab moves, LENDING FIX ============ */
(function v426a(){
"use strict";
if(window.__v426) return; window.__v426 = true;
var ERR = window.__v426err = window.__v426err || [];
function T(l,f){ try{ return f(); }catch(e){ ERR.push(l+": "+((e&&e.message)||e)); } }
function C(){ try{ return (typeof G!=="undefined" && G && G.company) || null; }catch(e){ return null; } }
function IND(){ var c=C(); return (c&&c.industry)||"ai_saas"; }
function money(n){ try{ return fmt$(Math.round(n)); }catch(e){ return "$"+Math.round(n); } }
function cl(v,a,b){ return Math.max(a, Math.min(b, v)); }
function num(v,d){ v = Number(v); return isFinite(v) ? v : d; }
function log(t){ try{ logHistory(t); }catch(e){} }
function say(t,k){ try{ toast(t,k||"good"); }catch(e){} }
function redraw(){ try{ renderAll(); }catch(e){} }
function card(html){
  var d = document.createElement("div");
  d.className = "card";
  d.innerHTML = html;
  return d;
}
window.__v426card = card;
function st(){
  var c = C(); if(!c) return null;
  if(!c.__v426) c.__v426 = {
    attention:{ left:10, max:10, stamp:"" },
    ins:{ policies:{}, claims:[], lifetimePrem:0, lifetimeLoss:0 },
    reqs:[], hires:[],
    chan:{ alloc:{paid:0,content:0,outbound:0,partners:0,referral:0}, sat:{}, last:null },
    rounds:{ closed:[] },
    markets:{ entered:["home"] },
    fleet:{ months:[] },
    debtSnap:0
  };
  return c.__v426;
}
window.v426 = { state: st, errs: function(){ return ERR; } };

/* ---------- 1. reputation starts at zero ---------- */
function zeroRep(){
  var c = C(); if(!c || c.__v426repZeroed) return;
  var r = c.v46rep;
  if(!r) return;
  if(r.company === 52 && r.founder === 48){
    r.company = 0; r.founder = 0; r.lastCompany = 0; r.lastFounder = 0;
  }
  c.__v426repZeroed = true;
}
window.__v426ZeroRep = zeroRep;
T("rep-boost", function(){
  if(typeof v46RepInboundBoost !== "function") return;
  window.v46RepInboundBoost = function(){
    var c = C(); if(!c || !c.v46rep) return 0;
    return Math.max(0, (num(c.v46rep.company,0) - 50) / 250);
  };
});

/* ---------- 2. LENDING FIX: stop the runaway rate wrappers ---------- */
/* v4.24 re-wrapped effectiveLoanRate/effectiveLocRate every 700ms because v4.28d
   replaced window[name] with a wrapper that lacked the __v424 guard. Each layer
   multiplied the rate by the credit-tier multiplier, so the rate compounded
   without bound. We install one canonical, clamped rate function and flag it
   with BOTH guards so neither installer ever wraps it again. */
var RATE_MIN = 0.002, RATE_MAX = 0.06;
function creditMult(){
  var score = 580;
  try{ var c = window.v424Credit ? window.v424Credit() : null; if(c) score = num(c.business, 580); }catch(e){}
  if(score >= 780) return 0.62;
  if(score >= 720) return 0.78;
  if(score >= 660) return 0.92;
  if(score >= 600) return 1.15;
  return 1.45;
}
function baseRate(kind){
  var c = C(); if(!c || !c.debt) return 0.008;
  var r = num(c.debt[kind === "loc" ? "locRate" : "loanRate"], kind === "loc" ? 0.012 : 0.008);
  if(r < RATE_MIN || r > RATE_MAX){
    r = kind === "loc" ? 0.012 : 0.008;
    c.debt[kind === "loc" ? "locRate" : "loanRate"] = r;
  }
  return r;
}
function mkRate(kind){
  var f = function(){
    var r = baseRate(kind);
    try{
      if(typeof deptHas === "function" && deptHas("finance","cfo")) r *= 0.6;
      if(typeof hasBoardSeat === "function" && hasBoardSeat("finance")) r *= 0.85;
    }catch(e){}
    r *= creditMult();
    return cl(r, RATE_MIN, RATE_MAX);
  };
  f.__v424 = true;
  f.__v425 = true;
  f.__v426 = true;
  return f;
}
function installRates(){
  if(!window.effectiveLoanRate || !window.effectiveLoanRate.__v426) window.effectiveLoanRate = mkRate("loan");
  if(!window.effectiveLocRate || !window.effectiveLocRate.__v426) window.effectiveLocRate = mkRate("loc");
}
installRates();
setInterval(installRates, 500);

/* debt repair: undo balances already corrupted by the old compounding rate */
function sane(v){ return isFinite(v) && v >= 0 && v < 1e12; }
function repairDebt(){
  var c = C(); if(!c || !c.debt) return;
  var d = c.debt, s = st(), fixed = false;
  var cap = 1e9;
  try{ cap = Math.max(1e7, debtCapacity() * 25); }catch(e){}
  ["loanBalance","locBalance","locLimit","loanMonthlyPayment"].forEach(function(k){
    if(!sane(d[k])){ d[k] = 0; fixed = true; }
  });
  if(d.loanBalance > cap){
    d.loanBalance = Math.min(num(s && s.debtSnap, 0) || 0, cap);
    fixed = true;
  }
  if(d.locBalance > cap){ d.locBalance = Math.min(d.locLimit || 0, cap); fixed = true; }
  if(d.loanBalance > 0){
    var want = Math.round((d.loanBalance * (1 + window.effectiveLoanRate() * 24)) / 24);
    if(!sane(d.loanMonthlyPayment) || d.loanMonthlyPayment > d.loanBalance * 0.5 || d.loanMonthlyPayment <= 0){
      d.loanMonthlyPayment = want; fixed = true;
    }
  } else { d.loanMonthlyPayment = 0; d.loanMonthsLeft = 0; }
  // v4.29d: sane() rejects negatives, which is right for debt balances but was
  // catastrophic for cash: every negative balance was silently rewritten to 0
  // twice per month close, from outside every other layer. That was unlimited
  // free money and it made insolvency impossible. Cash may legitimately be
  // negative now (see the finite emergency overdraft); only repair unreadable values.
  if(!isFinite(Number(c.cash))) { c.cash = 0; fixed = true; }
  if(fixed){
    log("\u{1F527} Loan ledger repaired \u2014 an interest-rate defect had inflated your balance. Balance is now " + money(d.loanBalance) + " at " + (window.effectiveLoanRate()*100).toFixed(2) + "%/mo.");
  }
  if(s && sane(d.loanBalance)) s.debtSnap = d.loanBalance;
}
window.__v426RepairDebt = repairDebt;
T("debt-month", function(){
  if(typeof advanceMonth !== "function") return;
  var prev = advanceMonth;
  window.advanceMonth = function(){
    try{ repairDebt(); }catch(e){}
    var out = prev.apply(this, arguments);
    try{ repairDebt(); }catch(e){}
    return out;
  };
});

/* ---------- 3. Decisions tab: founder decisions + queue only ---------- */
T("decisions", function(){
  if(typeof renderDecisionsBase !== "function") return;
  var prev = renderDecisionsBase;
  window.renderDecisionsBase = function(){
    try{ if(G && G.ui) G.ui.decisionFolder = "founder"; }catch(e){}
    var out = prev.apply(this, arguments);
    try{
      var screen = document.getElementById("screen");
      if(screen){
        var g = screen.querySelectorAll(".folder-grid");
        for(var i=0;i<g.length;i++) if(g[i].parentNode) g[i].parentNode.removeChild(g[i]);
      }
    }catch(e){}
    return out;
  };
});

/* ---------- 4. Culture & morale card (People) ---------- */
function cultureCard(){
  var c = C(); if(!c) return null;
  var n = (c.employees||[]).length;
  if(typeof renderCultureBucket !== "function") return null;
  var box = card("<h3>\u{1F389} Culture &amp; morale</h3>");
  var holder = document.createElement("div");
  try{ holder.innerHTML = renderCultureBucket(); }catch(e){ return null; }
  var grid = holder.querySelector(".folder-grid");
  if(grid && grid.parentNode) grid.parentNode.removeChild(grid);
  box.appendChild(holder);
  box.querySelectorAll("[data-culture]").forEach(function(b){
    b.onclick = function(){
      var k = b.getAttribute("data-culture");
      var cost = k === "retreat" ? 400*n : 150*n;
      try{ if(!affordOrAlert(cost)) return; }catch(e){}
      try{
        queueAdd({ id:"v426cult_"+k+"_"+Date.now(), label:(k==="retreat"?"Team retreat":"Team lunch")+" · "+n+" people", cost:cost,
          run:function(report){
            (C().employees||[]).forEach(function(e){
              e.morale = cl(num(e.morale,70) + (k==="retreat"?20:8), 0, 100);
              if(k==="retreat") e.performance = cl(num(e.performance,70)+3, 0, 100);
            });
            report.push((k==="retreat"?"\u{1F3D5}\uFE0F Team retreat":"\u{1F35D} Team lunch")+" — morale up across "+n+" people.");
          } });
        say("<b>Queued.</b> "+(k==="retreat"?"Retreat":"Team lunch")+" for "+money(cost)+".");
        redraw();
      }catch(e){ ERR.push("culture-click: "+((e&&e.message)||e)); }
    };
  });
  return box;
}
window.__v426CultureCard = cultureCard;

/* ---------- 5. Pricing / named account plan (Clients) ---------- */
function pricingCard(){
  if(typeof renderPricingBucket !== "function") return null;
  var box = card("<h3>\u{1F4B0} Pricing &amp; account plans</h3>");
  var holder = document.createElement("div");
  try{ holder.innerHTML = renderPricingBucket(); }catch(e){ return null; }
  var grid = holder.querySelector(".folder-grid");
  if(grid && grid.parentNode) grid.parentNode.removeChild(grid);
  box.appendChild(holder);
  return box;
}
window.__v426PricingCard = pricingCard;

/* ---------- 6. Industry Ops tab only where it applies ---------- */
function usesOps(){
  try{
    var cfg = INDUSTRIES[IND()];
    return !!(cfg && (cfg.opsType || cfg.v45 === "fleet" || cfg.v45 === "salon"));
  }catch(e){ return false; }
}
window.__v426UsesOps = usesOps;
function gateDock(){
  var dock = document.getElementById("dock"); if(!dock) return;
  var btn = dock.querySelector('[data-tab="industry"]'); if(!btn) return;
  var holder = btn.parentNode || btn;
  var show = usesOps();
  holder.style.display = show ? "" : "none";
  try{ if(!show && G && G.ui && G.ui.activeTab === "industry"){ G.ui.activeTab = "hq"; redraw(); } }catch(e){}
  if(show){
    try{
      var cfg = INDUSTRIES[IND()];
      var lbl = holder.querySelector(".dock-label");
      if(lbl && cfg && cfg.v45 === "fleet") lbl.textContent = "Fleet Ops";
      else if(lbl && cfg && cfg.v45 === "salon") lbl.textContent = "Salon Ops";
    }catch(e){}
  }
}
window.__v426GateDock = gateDock;
})();
/* ============ v4.28d — B: trucking depth + industry-matched Product ============ */
(function v426b(){
"use strict";
if(window.__v426b) return; window.__v426b = true;
var ERR = window.__v426err = window.__v426err || [];
function T(l,f){ try{ return f(); }catch(e){ ERR.push(l+": "+((e&&e.message)||e)); } }
function C(){ try{ return (typeof G!=="undefined" && G && G.company) || null; }catch(e){ return null; } }
function IND(){ var c=C(); return (c&&c.industry)||"ai_saas"; }
function money(n){ try{ return fmt$(Math.round(n)); }catch(e){ return "$"+Math.round(n); } }
function rnd(a,b){ return a + Math.random()*(b-a); }
function ri(a,b){ return Math.floor(rnd(a,b+1)); }
function cl(v,a,b){ return Math.max(a,Math.min(b,v)); }
function log(t){ try{ logHistory(t); }catch(e){} }
function say(t,k){ try{ toast(t,k||"good"); }catch(e){} }
function redraw(){ try{ renderAll(); }catch(e){} }
function card(h){ return window.__v426card(h); }
function S(){ return window.v426 ? window.v426.state() : null; }
function isFleet(){ try{ return INDUSTRIES[IND()].v45 === "fleet"; }catch(e){ return false; } }
window.__v426IsFleet = isFleet;
function fs(){ try{ return v45S(); }catch(e){ return null; } }

var LANES = {
  regional:  { name:"Regional dry van", miles:420,  rpm:2.95, loads:[7,11], goods:["palletized retail goods","packaged food","paper products","bottled beverages"] },
  midwest:   { name:"Midwest long haul", miles:980, rpm:2.55, loads:[3,5],  goods:["auto parts","appliances","grain bags","building supplies"] },
  reefer:    { name:"Refrigerated", miles:1450, rpm:3.10, loads:[2,4],  goods:["frozen poultry","dairy","produce","ice cream"] },
  flatbed:   { name:"Flatbed", miles:760, rpm:3.35, loads:[4,7],  goods:["steel coil","lumber","pipe","roofing bundles"] },
  dedicated: { name:"Dedicated contract", miles:540, rpm:2.80, loads:[8,12], goods:["grocery DC freight","store replenishment","beverage routes"] }
};
var LANE_KEYS = Object.keys(LANES);
var FUEL = 0.62, MAINT = 0.19;
var DRIVER_NAMES = ["Ray Whitaker","Dee Molina","Cal Jennings","Sam Ortiz","Vic Brennan","Jo Hartley","Lee Castillo","Pat Donnelly","Rem Vasquez","Kit Alvarez","Marty Boone","Sid Rasmussen"];
function driverName(){ return DRIVER_NAMES[ri(0, DRIVER_NAMES.length-1)] + " " + (ri(10,99)); }
function prep(u, i){
  if(!u.lane) u.lane = "regional";
  if(u.lifetimeGross == null){ u.lifetimeGross = 0; u.lifetimeNet = 0; u.lifetimeLoads = 0; }
  if(u.driver && !u.driverName) u.driverName = driverName();
  if(!u.name) u.name = "Truck " + (i+1);
  return u;
}

/* ---- replacement month engine: per-truck loads, freight, cost ---- */
T("fleet-month", function(){
  if(typeof v45FleetMonth !== "function") return;
  window.v45FleetMonth = function(){
    var out = [];
    try{
      var s = fs(), c = C(), v = S(); if(!s || !c) return out;
      var units = (s.units || []);
      var gross = 0, net = 0, loadsTot = 0, rows = [];
      units.forEach(function(u, i){
        prep(u, i);
        if(!u.driver){ u.last = { loads:0, gross:0, net:0, commodity:"parked \u2014 no driver", miles:0 }; return; }
        var L = LANES[u.lane] || LANES.regional;
        var loads = ri(L.loads[0], L.loads[1]);
        if(u.service === false) loads = Math.max(1, loads - 1);
        var miles = Math.round(loads * L.miles * rnd(0.94, 1.08));
        var rpm = L.rpm * rnd(0.93, 1.07) * (v && v.fleetSafety ? 1.03 : 1);
        var rev = Math.round(miles * rpm);
        var fuelRate = FUEL * (v && v.fuelDiscount ? (1 - v.fuelDiscount) : 1);
        var fuel = Math.round(miles * fuelRate);
        var maint = Math.round(miles * MAINT);
        var pay = Math.round((typeof V45_DRIVER_PAY !== "undefined" ? V45_DRIVER_PAY : 5200));
        var profit = rev - fuel - maint - pay;
        u.last = { loads:loads, miles:miles, rpm:rpm, gross:rev, fuel:fuel, maint:maint, pay:pay, net:profit,
          commodity: L.goods[ri(0, L.goods.length-1)], lane:L.name };
        u.lifetimeGross += rev; u.lifetimeNet += profit; u.lifetimeLoads += loads;
        gross += rev; net += profit; loadsTot += loads;
        rows.push({ truck:u.name, driver:u.driverName, lane:L.name, commodity:u.last.commodity, loads:loads, miles:miles, gross:rev, net:profit });
      });
      s.lastGross = gross; s.lastNet = net; s.lastLoads = loadsTot;
      c.cash += net;
      if(v){ v.fleet.months.unshift({ y:c.year, m:c.month, gross:gross, net:net, loads:loadsTot, rows:rows }); if(v.fleet.months.length > 12) v.fleet.months.length = 12; }
      if(units.length){
        out.push("\u{1F69B} Fleet hauled " + loadsTot + " load(s) for " + money(gross) + " in freight revenue, " + money(net) + " after fuel, maintenance and driver pay.");
      }
    }catch(e){ ERR.push("fleet-month: "+((e&&e.message)||e)); }
    return out;
  };
});

/* ---- driver hiring belongs in the Hiring tab ---- */
function driverCard(){
  if(!isFleet()) return null;
  var s = fs(), c = C(); if(!s || !c) return null;
  var units = (s.units||[]).map(prep);
  var open = units.filter(function(u){ return !u.driver; });
  var pay = (typeof V45_DRIVER_PAY !== "undefined" ? V45_DRIVER_PAY : 5200);
  var html = "<h3>\u{1F454} Driver hiring</h3>"
    + '<div class="muted mb8" style="font-size:12px;">Drivers are hired here, not on the Decisions screen. '
    + units.length + " tractor(s) in the fleet, " + open.length + " without a driver. Pay is " + money(pay) + "/mo per seated driver.</div>";
  if(!units.length) html += '<div class="muted">Buy a tractor on the Fleet Ops screen first.</div>';
  html += units.map(function(u){
    return '<div class="ladder-card"><div class="row"><div><div class="title">' + u.name + (u.driver ? " \u2014 " + u.driverName : " \u2014 no driver") + '</div>'
      + '<div class="desc">Lane: ' + ((LANES[u.lane]||LANES.regional).name) + ' \u00b7 lifetime ' + u.lifetimeLoads + ' load(s), ' + money(u.lifetimeGross) + ' hauled, ' + money(u.lifetimeNet) + ' net</div>'
      + (u.last && u.last.loads ? '<div class="desc">Last month: ' + u.last.loads + ' load(s) of ' + u.last.commodity + ' \u00b7 ' + money(u.last.gross) + '</div>' : "")
      + '</div>'
      + (u.driver ? '<button class="btn danger small" data-v426off="' + u.name + '">Let go</button>'
                  : '<button class="btn small" data-v426hire="' + u.name + '">Hire driver</button>')
      + '</div></div>';
  }).join("");
  var box = card(html);
  box.querySelectorAll("[data-v426hire]").forEach(function(b){
    b.onclick = function(){
      var nm = b.getAttribute("data-v426hire");
      var u = (fs().units||[]).filter(function(x){ return x.name === nm; })[0];
      if(!u || u.driver) return;
      u.driver = true; u.driverName = driverName();
      log("\u{1F454} Hired " + u.driverName + " to run " + u.name + " (" + money(pay) + "/mo).");
      say("<b>" + u.driverName + " hired</b> for " + nm + ".");
      redraw();
    };
  });
  box.querySelectorAll("[data-v426off]").forEach(function(b){
    b.onclick = function(){
      var nm = b.getAttribute("data-v426off");
      var u = (fs().units||[]).filter(function(x){ return x.name === nm; })[0];
      if(!u) return;
      log("\u{1F44B} " + (u.driverName||"Driver") + " left " + u.name + ". The tractor is parked until you seat someone.");
      u.driver = false; u.driverName = null;
      redraw();
    };
  });
  return box;
}
window.__v426DriverCard = driverCard;

/* ---- Fleet Ops screen: buy trucks, assign lanes, see hauling + earnings ---- */
function fleetOps(){
  var s = fs(), c = C(), v = S(); if(!s || !c) return null;
  var units = (s.units||[]).map(prep);
  var cost = (typeof V45_TRUCK_COST !== "undefined" ? V45_TRUCK_COST : 42000);
  var html = "<h3>\u{1F69B} Fleet Operations</h3>"
    + '<div class="muted mb8" style="font-size:12px;">Buy equipment here, hire drivers on the Hiring screen. '
    + 'Each tractor runs a lane with its own miles, rate per mile and freight mix.</div>'
    + '<div class="flexrow mb8" style="gap:6px;flex-wrap:wrap;">'
    + '<button class="btn small" data-v426buy="1">Buy a tractor \u00b7 ' + money(cost) + '</button>'
    + '<span class="muted" style="font-size:12px;align-self:center;">Fleet: ' + units.length + ' \u00b7 seated: ' + units.filter(function(u){return u.driver;}).length + '</span></div>';
  if(!units.length) html += '<div class="muted">No equipment yet.</div>';
  html += units.map(function(u){
    var L = LANES[u.lane] || LANES.regional;
    return '<div class="ladder-card"><div class="title">' + u.name + ' \u2014 ' + (u.driver ? u.driverName : "parked, no driver") + '</div>'
      + '<div class="desc">Lane: <b>' + L.name + '</b> \u00b7 ' + L.miles + ' mi avg \u00b7 ' + L.rpm.toFixed(2) + '/mi target \u00b7 fuel ' + FUEL.toFixed(2) + '/mi \u00b7 maint ' + MAINT.toFixed(2) + '/mi</div>'
      + (u.last && u.last.loads
          ? '<div class="desc">Last month: ' + u.last.loads + ' load(s) of ' + u.last.commodity + ' over ' + u.last.miles + ' mi \u2014 ' + money(u.last.gross) + ' gross, ' + money(u.last.net) + ' net</div>'
          : '<div class="desc">No miles logged yet.</div>')
      + '<div class="desc">Lifetime: ' + u.lifetimeLoads + ' load(s) \u00b7 ' + money(u.lifetimeGross) + ' hauled \u00b7 ' + money(u.lifetimeNet) + ' net</div>'
      + '<div class="radio-row mt8">' + LANE_KEYS.map(function(k){
          return '<span class="radio-chip ' + (u.lane === k ? "sel" : "") + '" data-v426lane="' + u.name + '|' + k + '">' + LANES[k].name + '</span>';
        }).join("") + '</div></div>';
  }).join("");
  if(units.some(function(u){ return u.last && u.last.loads; })){
    html += "<h3 class=\"mt8\">Last month by truck</h3><table><thead><tr><th>Truck</th><th>Driver</th><th>Hauling</th><th>Loads</th><th>Miles</th><th>Revenue</th><th>Net</th></tr></thead><tbody>"
      + units.filter(function(u){ return u.last && u.last.loads; }).map(function(u){
          return "<tr><td>"+u.name+"</td><td>"+(u.driverName||"\u2014")+"</td><td>"+u.last.commodity+"</td><td>"+u.last.loads+"</td><td>"+u.last.miles+"</td><td>"+money(u.last.gross)+"</td><td>"+money(u.last.net)+"</td></tr>";
        }).join("") + "</tbody></table>";
  }
  if(v && v.fleet.months.length){
    html += "<h3 class=\"mt8\">Fleet history</h3><table><thead><tr><th>Month</th><th>Loads</th><th>Freight revenue</th><th>Net</th></tr></thead><tbody>"
      + v.fleet.months.map(function(m){ return "<tr><td>Y"+m.y+" M"+m.m+"</td><td>"+m.loads+"</td><td>"+money(m.gross)+"</td><td>"+money(m.net)+"</td></tr>"; }).join("")
      + "</tbody></table>";
  }
  var box = card(html);
  box.querySelectorAll("[data-v426buy]").forEach(function(b){
    b.onclick = function(){
      try{ v45BuyTruck(); }catch(e){ ERR.push("buy: "+((e&&e.message)||e)); }
      try{ (fs().units||[]).map(prep); }catch(e){}
      redraw();
    };
  });
  box.querySelectorAll("[data-v426lane]").forEach(function(chip){
    chip.onclick = function(){
      var parts = chip.getAttribute("data-v426lane").split("|");
      var u = (fs().units||[]).filter(function(x){ return x.name === parts[0]; })[0];
      if(!u) return;
      u.lane = parts[1];
      log("\u{1F6E3}\uFE0F " + u.name + " moved to the " + LANES[parts[1]].name + " lane.");
      redraw();
    };
  });
  return box;
}
window.__v426FleetOps = fleetOps;
/* ops routing handled by the DOM router in chunk C */

/* ---- carrier-specific power plays ---- */
var TRUCK_POWER = [
  { key:"v426_ratecon", name:"Renegotiate rate confirmations", cost:4000, desc:"Push your brokers for better per-mile rates on every lane.",
    run:function(){ var s=fs(); (s.units||[]).forEach(function(u){ u.rateBump = 1; }); return "Rates renegotiated \u2014 brokers agreed to firmer per-mile pricing."; } },
  { key:"v426_dedicated", name:"Win a dedicated contract", cost:12000, desc:"Lock one shipper into steady weekly volume.",
    run:function(){ var s=fs(); var u=(s.units||[]).filter(function(x){return x.driver;})[0]; if(u){ u.lane="dedicated"; return u.name + " moved onto a dedicated contract lane."; } return "No seated truck to assign."; } },
  { key:"v426_fuel", name:"Negotiate a fuel card discount", cost:6500, desc:"Cut fuel cost per mile fleet-wide.",
    run:function(){ var v=S(); v.fuelDiscount = Math.min(0.18, (v.fuelDiscount||0) + 0.07); return "Fuel discount now " + Math.round(v.fuelDiscount*100) + "% per mile."; } },
  { key:"v426_safety", name:"Run a safety and CSA audit", cost:8000, desc:"Clean scores earn better freight and fewer claims.",
    run:function(){ var v=S(); v.fleetSafety = true; return "CSA scores cleaned up \u2014 shippers are offering better freight."; } },
  { key:"v426_backhaul", name:"Build a backhaul network", cost:5000, desc:"Stop running empty on the return leg.",
    run:function(){ var s=fs(); (s.units||[]).forEach(function(u){ u.service = true; }); return "Backhaul partners lined up \u2014 fewer empty miles."; } }
];
function runTruckPower(key){
  var def = TRUCK_POWER.filter(function(p){ return p.key === key; })[0];
  var c = C(); if(!def || !c) return;
  if(c.cash < def.cost){ say("Not enough cash for that play (" + money(def.cost) + ").", "warn"); return; }
  c.cash -= def.cost;
  var msg = "";
  try{ msg = def.run() || ""; }catch(e){ ERR.push("power: "+((e&&e.message)||e)); }
  log("\u26A1 " + def.name + " \u2014 " + money(def.cost) + ". " + msg);
  say("<b>" + def.name + ".</b> " + msg);
  redraw();
}
window.__v426RunTruckPower = runTruckPower;
window.__v426TruckPower = TRUCK_POWER;
function powerCard(){
  if(!isFleet()) return null;
  var html = "<h3>\u26A1 Carrier power plays</h3>"
    + '<div class="muted mb8" style="font-size:12px;">Conference keynotes do not move freight. These do.</div>'
    + TRUCK_POWER.map(function(p){
        return '<div class="ladder-card"><div class="row"><div><div class="title">' + p.name + '</div><div class="desc">' + p.desc + '</div></div>'
          + '<button class="btn small" data-v426power="' + p.key + '">' + money(p.cost) + '</button></div></div>';
      }).join("");
  var box = card(html);
  box.querySelectorAll("[data-v426power]").forEach(function(b){
    b.onclick = function(){ runTruckPower(b.getAttribute("data-v426power")); };
  });
  return box;
}
window.__v426PowerCard = powerCard;

/* ---- Product tab matches the business ---- */
var PROGRAMS = {
  retail: { title:"Assortment & merchandising", unit:"Assortment strength", blurb:"Retail does not ship features. You buy, price and present product.",
    items:[ {key:"r1",name:"Rework the assortment",cost:18000,months:2,mat:8,note:"Drop dead SKUs, widen what sells."},
            {key:"r2",name:"Launch a private label line",cost:45000,months:3,mat:12,margin:0.04,note:"Higher margin than branded goods."},
            {key:"r3",name:"Planogram and store flow reset",cost:12000,months:1,mat:5,note:"Better adjacency, higher basket size."},
            {key:"r4",name:"Land an exclusive brand",cost:70000,months:4,mat:16,note:"Traffic nobody else in town can offer."} ] },
  restaurant: { title:"Menu development", unit:"Menu strength", blurb:"Your product is the menu, the kitchen and the ticket time.",
    items:[ {key:"f1",name:"Menu engineering pass",cost:9000,months:1,mat:7,note:"Reprice and rebalance the food cost."},
            {key:"f2",name:"Signature dish development",cost:16000,months:2,mat:11,note:"The thing people drive across town for."},
            {key:"f3",name:"Add a brunch service",cost:24000,months:2,mat:9,note:"New daypart, same rent."},
            {key:"f4",name:"Kitchen line rebuild",cost:60000,months:3,mat:15,note:"Cuts ticket times at peak."} ] },
  robotics: { title:"Hardware program", unit:"Platform maturity", blurb:"Hardware ships in revisions, not sprints. Tooling and certification gate everything.",
    items:[ {key:"h1",name:"Prototype revision",cost:55000,months:2,mat:10,note:"Iterate the mechanical design."},
            {key:"h2",name:"Design for manufacturing",cost:120000,months:4,mat:16,note:"Cut unit cost before you scale."},
            {key:"h3",name:"Safety certification",cost:85000,months:3,mat:12,note:"Required before enterprise deployment."},
            {key:"h4",name:"Pilot deployment program",cost:40000,months:2,mat:9,note:"Paid pilots with real customers."} ] },
  finance: { title:"Product & compliance", unit:"Product readiness", blurb:"In financial services, compliance is the product.",
    items:[ {key:"c1",name:"Underwriting model rebuild",cost:48000,months:3,mat:13,note:"Better risk selection, lower losses."},
            {key:"c2",name:"Regulatory audit readiness",cost:65000,months:3,mat:11,note:"Pass an exam without a consent order."},
            {key:"c3",name:"Client portal build",cost:32000,months:2,mat:9,note:"Self-service reporting for clients."},
            {key:"c4",name:"New product filing",cost:90000,months:4,mat:17,note:"Open an entirely new revenue line."} ] },
  trucking: { title:"Service & lane development", unit:"Service quality", blurb:"Carriers sell reliability: on-time service, claims-free freight, the right lanes.",
    items:[ {key:"t1",name:"On-time performance program",cost:14000,months:2,mat:10,note:"Shippers pay for 98% on-time."},
            {key:"t2",name:"Add reefer capability",cost:52000,months:2,mat:12,note:"Opens temperature-controlled freight."},
            {key:"t3",name:"Telematics and ELD upgrade",cost:19000,months:1,mat:8,note:"Fuel, routing and hours visibility."},
            {key:"t4",name:"Shipper-direct sales program",cost:30000,months:3,mat:14,note:"Cut the broker out of your margin."} ] },
  nail_salon: { title:"Service menu", unit:"Service menu strength", blurb:"Your product is the service list, the techs and the client experience.",
    items:[ {key:"s1",name:"Add gel and dip services",cost:7000,months:1,mat:8,note:"Higher ticket per chair."},
            {key:"s2",name:"Luxury pedicure package",cost:15000,months:2,mat:11,note:"Premium tier with premium pricing."},
            {key:"s3",name:"Technician certification program",cost:11000,months:2,mat:9,note:"Consistency across chairs."},
            {key:"s4",name:"Retail product line",cost:9000,months:1,mat:6,margin:0.03,note:"Sell what clients take home."} ] },
  agency: { title:"Service offerings", unit:"Offering depth", blurb:"Agencies productize services: packaged offerings with a repeatable playbook.",
    items:[ {key:"a1",name:"Package a retainer offering",cost:12000,months:1,mat:9,note:"Predictable monthly revenue."},
            {key:"a2",name:"Build a proprietary playbook",cost:26000,months:3,mat:13,note:"Deliver senior work with junior hours."},
            {key:"a3",name:"Add a strategy practice",cost:38000,months:3,mat:14,note:"Higher rates, earlier in the funnel."},
            {key:"a4",name:"Case study and referral engine",cost:8000,months:1,mat:6,note:"Proof sells the next deal."} ] }
};
window.__v426Programs = PROGRAMS;
function pstate(){
  var c = C(); if(!c) return null;
  if(!c.__v426prod) c.__v426prod = { active:null, done:[], margin:0 };
  return c.__v426prod;
}
function productScreen(){
  var c = C(), p = pstate(), def = PROGRAMS[IND()];
  if(!c || !def) return null;
  var mat = Math.round((c.product && c.product.maturity) || 0);
  var html = "<h3>" + def.title + "</h3>"
    + '<div class="muted mb8" style="font-size:12px;">' + def.blurb + '</div>'
    + '<div style="font-size:12px;margin-bottom:4px;">' + def.unit + ': <b>' + mat + '/100</b></div>'
    + '<div class="progress-track"><div class="progress-fill" style="width:' + Math.min(100, mat) + '%;"></div></div>';
  if(p.active){
    var a = p.active;
    html += '<div class="ladder-card mt8"><div class="title">In progress: ' + a.name + '</div>'
      + '<div class="desc">' + a.monthsLeft + ' month(s) remaining \u00b7 ' + money(a.cost) + ' committed</div>'
      + '<button class="btn danger small mt8" data-v426pcancel="1">Cancel program</button></div>';
  } else {
    html += '<div class="muted mt8" style="font-size:12px;">Start one program at a time.</div>'
      + def.items.map(function(it){
          return '<div class="ladder-card"><div class="row"><div><div class="title">' + it.name + '</div>'
            + '<div class="desc">' + it.note + '</div>'
            + '<div class="desc">' + money(it.cost) + ' \u00b7 ' + it.months + ' month(s) \u00b7 +' + it.mat + ' ' + def.unit.toLowerCase() + '</div></div>'
            + '<button class="btn small" data-v426pstart="' + it.key + '">Start</button></div></div>';
        }).join("");
  }
  if(p.done.length){
    html += "<h3 class=\"mt8\">Delivered</h3><table><thead><tr><th>Program</th><th>Finished</th></tr></thead><tbody>"
      + p.done.slice(0,8).map(function(d){ return "<tr><td>"+d.name+"</td><td>Y"+d.y+" M"+d.m+"</td></tr>"; }).join("") + "</tbody></table>";
  }
  var box = card(html);
  box.querySelectorAll("[data-v426pstart]").forEach(function(b){
    b.onclick = function(){
      var it = def.items.filter(function(x){ return x.key === b.getAttribute("data-v426pstart"); })[0];
      var co = C(); if(!it) return;
      if(co.cash < it.cost){ say("Not enough cash for " + it.name + " (" + money(it.cost) + ").", "warn"); return; }
      co.cash -= it.cost;
      pstate().active = { key:it.key, name:it.name, cost:it.cost, months:it.months, monthsLeft:it.months, mat:it.mat, margin:it.margin||0 };
      log("\u{1F3D7}\uFE0F Started " + it.name + " \u2014 " + money(it.cost) + ", " + it.months + " month(s).");
      say("<b>" + it.name + "</b> underway.");
      redraw();
    };
  });
  box.querySelectorAll("[data-v426pcancel]").forEach(function(b){
    b.onclick = function(){ pstate().active = null; log("\u274C Cancelled the in-flight program. The spend is gone."); redraw(); };
  });
  return box;
}
window.__v426ProductScreen = productScreen;
/* product routing handled by the DOM router in chunk C */
T("product-month", function(){
  if(typeof advanceMonth !== "function") return;
  var prev = advanceMonth;
  window.advanceMonth = function(){
    var out = prev.apply(this, arguments);
    try{
      var c = C(), p = pstate();
      if(c && p && p.active){
        p.active.monthsLeft -= 1;
        if(p.active.monthsLeft <= 0){
          if(c.product) c.product.maturity = Math.min(100, (c.product.maturity||0) + p.active.mat);
          if(p.active.margin) p.margin += p.active.margin;
          (c.clients||[]).forEach(function(cl2){ cl2.health = Math.min(100, (cl2.health||70) + 3); });
          p.done.unshift({ name:p.active.name, y:c.year, m:c.month });
          log("\u2705 Delivered: " + p.active.name + ".");
          say("<b>Delivered:</b> " + p.active.name + ".");
          p.active = null;
        }
      }
    }catch(e){ ERR.push("product-month: "+((e&&e.message)||e)); }
    return out;
  };
});
})();
/* ============ v4.28d — C: approved feedback systems + mount dispatcher ============ */
(function v426c(){
"use strict";
if(window.__v426c) return; window.__v426c = true;
var ERR = window.__v426err = window.__v426err || [];
function T(l,f){ try{ return f(); }catch(e){ ERR.push(l+": "+((e&&e.message)||e)); } }
function C(){ try{ return (typeof G!=="undefined" && G && G.company) || null; }catch(e){ return null; } }
function IND(){ var c=C(); return (c&&c.industry)||"ai_saas"; }
function money(n){ try{ return fmt$(Math.round(n)); }catch(e){ return "$"+Math.round(n); } }
function rnd(a,b){ return a + Math.random()*(b-a); }
function ri(a,b){ return Math.floor(rnd(a,b+1)); }
function cl(v,a,b){ return Math.max(a,Math.min(b,v)); }
function num(v,d){ v=Number(v); return isFinite(v)?v:d; }
function log(t){ try{ logHistory(t); }catch(e){} }
function say(t,k){ try{ toast(t,k||"good"); }catch(e){} }
function redraw(){ try{ renderAll(); }catch(e){} }
function card(h){ return window.__v426card(h); }
function S(){ return window.v426 ? window.v426.state() : null; }
function uid2(){ try{ return uid(); }catch(e){ return "x"+Math.random().toString(36).slice(2); } }
function stamp(){ var c=C(); return c ? (c.year+"-"+c.month) : ""; }

/* ---------- 1. Time as a resource: founder attention ---------- */
function att(){
  var s = S(); if(!s) return null;
  var a = s.attention;
  if(a.stamp !== stamp()){ a.stamp = stamp(); a.max = 10; a.left = 10; }
  return a;
}
function spend(n, label){
  var a = att(); if(!a) return true;
  if(a.left < n){ say("<b>Out of hours.</b> "+label+" needs "+n+" attention point(s); "+a.left+" left this month.", "warn"); return false; }
  a.left -= n; return true;
}
T("attention-hooks", function(){
  if(typeof runFounderAction === "function"){
    var f = runFounderAction;
    window.runFounderAction = function(){ if(!spend(2, "That founder action")) return; return f.apply(this, arguments); };
  }
  if(typeof v43RunPower === "function"){
    var p = v43RunPower;
    window.v43RunPower = function(){ if(!spend(3, "That power play")) return; return p.apply(this, arguments); };
  }
  if(typeof window.__v426RunTruckPower === "function"){
    var t = window.__v426RunTruckPower;
    window.__v426RunTruckPower = function(){ if(!spend(3, "That power play")) return; return t.apply(this, arguments); };
  }
});
function attentionCard(){
  var a = att(); if(!a) return null;
  return card('<h3>\u23F1\uFE0F Your month \u2014 ' + a.left + ' of ' + a.max + ' attention points</h3>'
    + '<div class="progress-track"><div class="progress-fill" style="width:' + Math.round(100*a.left/Math.max(1,a.max)) + '%;"></div></div>'
    + '<div class="muted mt8" style="font-size:12px;">Founder actions cost 2, power plays cost 3. You cannot personally do everything in a month \u2014 that is what hiring is for. Resets when you advance.</div>');
}

/* ---------- 2. Insurance and liability ---------- */
var POLICIES = [
  { key:"gl", name:"General liability", base:340, per:18, cover:0.85, deduct:5000, desc:"Slips, property damage, third-party injury." },
  { key:"cyber", name:"Cyber & data breach", base:520, per:26, cover:0.80, deduct:15000, desc:"Breach response, notification, downtime." },
  { key:"wc", name:"Workers compensation", base:0, per:62, cover:0.90, deduct:2500, desc:"Employee injury coverage." },
  { key:"auto", name:"Commercial auto & cargo", base:1400, per:0, perTruck:820, cover:0.88, deduct:10000, desc:"Accidents, cargo claims, roadside liability.", only:["trucking"] },
  { key:"eo", name:"Errors & omissions", base:410, per:14, cover:0.80, deduct:7500, desc:"Clients claiming your work cost them money.", only:["agency","ai_saas","finance"] }
];
var INCIDENTS = {
  gl:{ text:"A customer slipped and is claiming injury.", lo:12000, hi:90000 },
  cyber:{ text:"An employee laptop was compromised and customer data leaked.", lo:20000, hi:180000 },
  wc:{ text:"An employee was hurt on the job and is out for weeks.", lo:8000, hi:70000 },
  auto:{ text:"A tractor was in an at-fault accident and the load was destroyed.", lo:25000, hi:210000 },
  eo:{ text:"A client sent a demand letter over work that cost them revenue.", lo:15000, hi:120000 }
};
function avail(){ return POLICIES.filter(function(p){ return !p.only || p.only.indexOf(IND()) >= 0; }); }
function premium(p){
  var c = C(); if(!c) return 0;
  var heads = (c.employees||[]).length, trucks = 0;
  try{ if(p.perTruck && window.__v426IsFleet && window.__v426IsFleet()) trucks = (v45S().units||[]).length; }catch(e){}
  return Math.round(p.base + heads*(p.per||0) + trucks*(p.perTruck||0));
}
T("insurance-month", function(){
  if(typeof advanceMonth !== "function") return;
  var prev = advanceMonth;
  window.advanceMonth = function(){
    var out = prev.apply(this, arguments);
    try{
      var c = C(), s = S(); if(!c || !s) return out;
      var held = avail().filter(function(p){ return s.ins.policies[p.key]; });
      var total = held.reduce(function(a,p){ return a + premium(p); }, 0);
      if(total > 0){ c.cash -= total; s.ins.lifetimePrem += total;
        log("\u{1F6E1}\uFE0F Insurance premiums: " + money(total) + " across " + held.length + " polic(ies)."); }
      var pool = avail();
      if(pool.length && Math.random() < 0.09 + Math.min(0.12, (c.employees||[]).length*0.004)){
        var pdef = pool[ri(0, pool.length-1)], inc = INCIDENTS[pdef.key];
        if(inc){
          var loss = ri(inc.lo, inc.hi), covered = !!s.ins.policies[pdef.key];
          var paid = covered ? Math.min(loss, pdef.deduct + Math.round(loss*(1-pdef.cover))) : loss;
          c.cash -= paid; s.ins.lifetimeLoss += paid;
          s.ins.claims.unshift({ y:c.year, m:c.month, text:inc.text, loss:loss, paid:paid, covered:covered });
          if(s.ins.claims.length > 10) s.ins.claims.length = 10;
          log((covered?"\u{1F6E1}\uFE0F ":"\u26A0\uFE0F ") + inc.text + " Loss " + money(loss) + " \u2014 you paid " + money(paid) + (covered?" after deductible and coverage.":". Uninsured."));
          say((covered?"<b>Claim filed.</b> ":"<b>Uninsured loss.</b> ") + money(paid) + " out of pocket.", covered?"warn":"bad");
        }
      }
    }catch(e){ ERR.push("insurance-month: "+((e&&e.message)||e)); }
    return out;
  };
});
function insuranceCard(){
  var s = S(); if(!s) return null;
  var list = avail();
  var total = list.filter(function(p){ return s.ins.policies[p.key]; }).reduce(function(a,p){ return a+premium(p); },0);
  var html = "<h3>\u{1F6E1}\uFE0F Insurance &amp; liability</h3>"
    + '<div class="muted mb8" style="font-size:12px;">Premiums bill monthly and scale with headcount and equipment. Uninsured incidents come straight out of cash. Current load: <b>' + money(total) + '/mo</b>.</div>'
    + list.map(function(p){
        var on = !!s.ins.policies[p.key];
        return '<div class="ladder-card"><div class="row"><div><div class="title">' + p.name + (on?" \u2014 active":"") + '</div>'
          + '<div class="desc">' + p.desc + '</div>'
          + '<div class="desc">' + money(premium(p)) + '/mo \u00b7 covers ' + Math.round(p.cover*100) + '% above a ' + money(p.deduct) + ' deductible</div></div>'
          + '<button class="btn ' + (on?"danger ":"") + 'small" data-v426ins="' + p.key + '">' + (on?"Cancel":"Bind policy") + '</button></div></div>';
      }).join("");
  if(s.ins.claims.length){
    html += "<h3 class=\"mt8\">Claim history</h3><table><thead><tr><th>When</th><th>Event</th><th>Loss</th><th>You paid</th></tr></thead><tbody>"
      + s.ins.claims.map(function(c2){ return "<tr><td>Y"+c2.y+" M"+c2.m+"</td><td>"+c2.text+"</td><td>"+money(c2.loss)+"</td><td>"+money(c2.paid)+"</td></tr>"; }).join("")
      + "</tbody></table>";
  }
  var box = card(html);
  box.querySelectorAll("[data-v426ins]").forEach(function(b){
    b.onclick = function(){
      var k = b.getAttribute("data-v426ins"), s2 = S();
      s2.ins.policies[k] = !s2.ins.policies[k];
      var def = POLICIES.filter(function(p){ return p.key === k; })[0];
      log((s2.ins.policies[k]?"\u{1F6E1}\uFE0F Bound ":"\u274C Cancelled ") + def.name + " (" + money(premium(def)) + "/mo).");
      redraw();
    };
  });
  return box;
}

/* ---------- 3. Hiring pipeline ---------- */
var BANDS = [
  { key:"budget", name:"Budget", mult:0.85, perf:[45,65], speed:1, odds:0.90 },
  { key:"market", name:"Market", mult:1.00, perf:[60,80], speed:2, odds:0.80 },
  { key:"top", name:"Top of market", mult:1.25, perf:[78,95], speed:3, odds:0.62 }
];
T("pipeline-month", function(){
  if(typeof advanceMonth !== "function") return;
  var prev = advanceMonth;
  window.advanceMonth = function(){
    var out = prev.apply(this, arguments);
    try{
      var s = S(), c = C(); if(!s || !c) return out;
      var keep = [];
      s.reqs.forEach(function(q){
        q.monthsLeft -= 1;
        if(q.monthsLeft > 0){ keep.push(q); return; }
        var band = BANDS.filter(function(b){ return b.key === q.band; })[0] || BANDS[1];
        if(Math.random() > band.odds){
          q.monthsLeft = 1; q.note = "Finalist took a competing offer \u2014 search reopened.";
          log("\u26A0\uFE0F " + q.role + " search: your finalist took another offer.");
          keep.push(q); return;
        }
        var emp = null;
        try{ emp = hire(q.dept, q.rung); }catch(e){ ERR.push("hire: "+((e&&e.message)||e)); }
        if(emp && typeof emp === "object"){
          if(emp.salary) emp.salary = Math.round(emp.salary * band.mult);
          emp.performance = ri(band.perf[0], band.perf[1]);
          emp.ramp = 2;
          s.hires.unshift({ y:c.year, m:c.month, name:emp.name, role:emp.role, band:band.name });
          if(s.hires.length > 12) s.hires.length = 12;
          log("\u2705 Requisition filled: " + emp.name + " starts as " + emp.role + " (" + band.name + " band). Two-month ramp.");
        } else {
          log("\u2705 Requisition for " + q.role + " closed out.");
        }
      });
      s.reqs = keep;
      (c.employees||[]).forEach(function(e){ if(e.ramp){ e.ramp -= 1; if(e.ramp <= 0) delete e.ramp; } });
    }catch(e){ ERR.push("pipeline-month: "+((e&&e.message)||e)); }
    return out;
  };
});
function pipelineCard(){
  var s = S(), c = C(); if(!s || !c) return null;
  var depts = [];
  try{ depts = DEPT_KEYS.slice(); }catch(e){ try{ depts = Object.keys(LADDERS); }catch(e2){ depts = []; } }
  if(!depts.length) return null;
  var dept = s.uiDept && depts.indexOf(s.uiDept) >= 0 ? s.uiDept : depts[0];
  var rungs = [];
  try{ rungs = LADDERS[dept].rungs; }catch(e){ return null; }
  var html = "<h3>\u{1F4CB} Hiring pipeline</h3>"
    + '<div class="muted mb8" style="font-size:12px;">Open a requisition rather than conjuring a hire. Sourcing costs money up front, roles take time to fill, better candidates cost more and take longer, and finalists sometimes walk. New hires ramp for two months.</div>'
    + '<div class="radio-row mb8">' + depts.map(function(d){ return '<span class="radio-chip ' + (d===dept?"sel":"") + '" data-v426dept="'+d+'">'+d+'</span>'; }).join("") + '</div>'
    + '<div class="flexrow mb8" style="gap:6px;flex-wrap:wrap;">'
    + '<select data-v426rung>' + rungs.map(function(r){ return '<option value="'+r.key+'">'+r.label+' \u00b7 '+money((r.salaryRange[0]+r.salaryRange[1])/2)+'/mo</option>'; }).join("") + '</select>'
    + '<select data-v426band>' + BANDS.map(function(b){ return '<option value="'+b.key+'">'+b.name+' \u00b7 ~'+b.speed+' mo \u00b7 '+Math.round(b.odds*100)+'% close rate</option>'; }).join("") + '</select>'
    + '<button class="btn small" data-v426req="1">Open requisition</button></div>';
  html += s.reqs.length
    ? "<table><thead><tr><th>Role</th><th>Band</th><th>Status</th></tr></thead><tbody>"
      + s.reqs.map(function(q){ return "<tr><td>"+q.role+"</td><td>"+q.band+"</td><td>"+(q.note||(q.monthsLeft+" month(s) to fill"))+"</td></tr>"; }).join("") + "</tbody></table>"
    : '<div class="muted">No open requisitions.</div>';
  var box = card(html);
  box.querySelectorAll("[data-v426dept]").forEach(function(chip){
    chip.onclick = function(){ S().uiDept = chip.getAttribute("data-v426dept"); redraw(); };
  });
  box.querySelectorAll("[data-v426req]").forEach(function(b){
    b.onclick = function(){
      var rung = box.querySelector("[data-v426rung]").value, bandKey = box.querySelector("[data-v426band]").value;
      var band = BANDS.filter(function(x){ return x.key === bandKey; })[0] || BANDS[1];
      var r = rungs.filter(function(x){ return x.key === rung; })[0];
      var co = C(), s2 = S(); if(!r) return;
      var fee = Math.round(((r.salaryRange[0]+r.salaryRange[1])/2) * 0.12);
      if(co.cash < fee){ say("Not enough cash for the sourcing spend ("+money(fee)+").", "warn"); return; }
      co.cash -= fee;
      s2.reqs.push({ id:uid2(), dept:dept, rung:rung, role:r.label, band:band.key, monthsLeft:band.speed, fee:fee });
      log("\u{1F4CB} Opened a requisition for " + r.label + " (" + band.name + " band) \u2014 " + money(fee) + " in sourcing spend, ~" + band.speed + " month(s) to fill.");
      redraw();
    };
  });
  return box;
}

/* ---------- 4. Channel-level marketing ---------- */
var CHANNELS = [
  { key:"paid", name:"Paid acquisition", cac:900, payback:4, sat:22000, desc:"Instant volume, saturates fast, stops when you stop paying." },
  { key:"content", name:"Content & SEO", cac:520, payback:9, sat:14000, desc:"Slow to compound, cheap once it does." },
  { key:"outbound", name:"Outbound", cac:1250, payback:6, sat:30000, desc:"Scales with reps, not spend." },
  { key:"partners", name:"Partnerships", cac:700, payback:7, sat:18000, desc:"Someone else's audience, at a revenue share." },
  { key:"referral", name:"Referral program", cac:380, payback:3, sat:9000, desc:"Your cheapest channel, capped by how happy customers are." }
];
T("channel-month", function(){
  if(typeof advanceMonth !== "function") return;
  var prev = advanceMonth;
  window.advanceMonth = function(){
    var out = prev.apply(this, arguments);
    try{
      var s = S(), c = C(); if(!s || !c) return out;
      var spendTotal = 0, won = 0, wonMrr = 0, lines = [];
      CHANNELS.forEach(function(ch){
        var sp = Math.max(0, Math.round(num(s.chan.alloc[ch.key], 0)));
        if(!sp) return;
        spendTotal += sp;
        var eff = 1 / (1 + cl(sp/ch.sat, 0, 3) * 0.65);
        if(ch.key === "referral"){
          var cls = c.clients || [];
          var h = cls.length ? cls.reduce(function(a,x){ return a + num(x.health,70); },0)/cls.length : 60;
          eff *= cl(h/70, 0.3, 1.4);
        }
        if(ch.key === "outbound"){
          var reps = (c.employees||[]).filter(function(e){ return e.dept === "sales"; }).length;
          eff *= cl(0.35 + reps*0.22, 0.35, 1.5);
        }
        if(ch.key === "content"){
          s.chan.sat[ch.key] = num(s.chan.sat[ch.key],0) + 1;
          eff *= cl(0.5 + s.chan.sat[ch.key]*0.08, 0.5, 1.6);
        }
        var cac = Math.round(ch.cac / Math.max(0.15, eff));
        var n = Math.floor(sp / cac);
        for(var i=0;i<n;i++){
          var mrr = Math.max(50, Math.round(cac / ch.payback));
          (c.clients = c.clients || []).push({ id:uid2(), name:"New Account " + ri(100,999), mrr:mrr, health:ri(62,84), sinceMonth:c.month, sinceYear:c.year });
          won++; wonMrr += mrr;
        }
        lines.push(ch.name + ": " + money(sp) + " at " + money(cac) + " CAC \u2192 " + n + " customer(s)");
      });
      if(spendTotal){
        c.cash -= spendTotal;
        try{ recomputeMRR(); }catch(e){}
        s.chan.last = { spend:spendTotal, won:won, mrr:wonMrr, lines:lines, y:c.year, m:c.month };
        log("\u{1F4E3} Marketing: " + money(spendTotal) + " across channels \u2192 " + won + " new customer(s) worth " + money(wonMrr) + "/mo.");
      }
    }catch(e){ ERR.push("channel-month: "+((e&&e.message)||e)); }
    return out;
  };
});
function channelCard(){
  var s = S(); if(!s) return null;
  var total = CHANNELS.reduce(function(a,ch){ return a + num(s.chan.alloc[ch.key],0); },0);
  var html = "<h3>\u{1F4E3} Marketing channels \u2014 " + money(total) + "/mo allocated</h3>"
    + '<div class="muted mb8" style="font-size:12px;">Each channel has its own CAC, payback and saturation curve. Doubling spend in one channel does not double customers \u2014 allocation is the game.</div>'
    + CHANNELS.map(function(ch){
        var v = Math.round(num(s.chan.alloc[ch.key],0));
        return '<div class="ladder-card"><div class="row"><div style="flex:1;"><div class="title">' + ch.name + '</div>'
          + '<div class="desc">' + ch.desc + '</div>'
          + '<div class="desc">Base CAC ' + money(ch.cac) + ' \u00b7 payback ' + ch.payback + ' mo \u00b7 saturates past ' + money(ch.sat) + '/mo</div></div>'
          + '<div style="display:flex;align-items:center;gap:6px;">'
          + '<button class="btn secondary small" data-v426chan="'+ch.key+'" data-delta="-1000">\u2212</button>'
          + '<b style="min-width:82px;text-align:center;display:inline-block;">' + money(v) + '</b>'
          + '<button class="btn secondary small" data-v426chan="'+ch.key+'" data-delta="1000">+</button>'
          + '</div></div></div>';
      }).join("");
  if(s.chan.last){
    html += '<div class="muted mt8" style="font-size:12px;">Last month (Y'+s.chan.last.y+' M'+s.chan.last.m+'): '+money(s.chan.last.spend)+' spent, '+s.chan.last.won+' customer(s), '+money(s.chan.last.mrr)+'/mo added.<br>'+s.chan.last.lines.join("<br>")+'</div>';
  }
  var box = card(html);
  box.querySelectorAll("[data-v426chan]").forEach(function(b){
    b.onclick = function(){
      var k = b.getAttribute("data-v426chan"), d = Number(b.getAttribute("data-delta")), s2 = S();
      s2.chan.alloc[k] = Math.max(0, num(s2.chan.alloc[k],0) + d);
      redraw();
    };
  });
  return box;
}

/* ---------- 5. Priced funding rounds ---------- */
var ROUNDS = [
  { key:"seed", name:"Seed", minMrr:8000, mult:9.5, raisePct:0.18, pool:0.10 },
  { key:"a", name:"Series A", minMrr:80000, mult:11, raisePct:0.20, pool:0.08 },
  { key:"b", name:"Series B", minMrr:400000, mult:12.5, raisePct:0.16, pool:0.05 },
  { key:"c", name:"Series C", minMrr:1200000, mult:14, raisePct:0.12, pool:0.04 }
];
function terms(r){
  var c = C(), pre = Math.round(num(c && c.mrr, 0) * 12 * r.mult);
  var raise = Math.round(pre * r.raisePct), post = pre + raise;
  return { pre:pre, raise:raise, post:post, dilution: post ? raise/post : 0 };
}
function fundingCard(){
  var s = S(), c = C(); if(!s || !c) return null;
  var next = ROUNDS.filter(function(r){ return s.rounds.closed.indexOf(r.key) < 0; })[0];
  var pct = 0;
  try{ pct = founderPct(c) * 100; }catch(e){}
  var html = "<h3>\u{1F4B8} Priced rounds</h3>"
    + '<div class="muted mb8" style="font-size:12px;">Real terms: a pre-money valuation off your ARR, a raise, an option pool carved out before close, and a 1x liquidation preference. You hold <b>' + pct.toFixed(1) + '%</b> on ' + money(num(c.mrr,0)*12) + ' ARR.</div>';
  if(!next) html += '<div class="muted">Every priced round is closed. From here it is debt, profit or an exit.</div>';
  else if(num(c.mrr,0) < next.minMrr)
    html += '<div class="muted">Next is <b>' + next.name + '</b>. Investors want ' + money(next.minMrr) + '/mo of revenue; you are at ' + money(num(c.mrr,0)) + '/mo.</div>';
  else {
    var t = terms(next);
    html += '<div class="ladder-card"><div class="title">' + next.name + ' term sheet</div>'
      + '<div class="desc">Pre-money <b>' + money(t.pre) + '</b> (' + next.mult + 'x ARR) \u00b7 raise <b>' + money(t.raise) + '</b> \u00b7 post ' + money(t.post) + '</div>'
      + '<div class="desc">Investor takes ' + Math.round(t.dilution*100) + '% \u00b7 option pool ' + Math.round(next.pool*100) + '% carved from existing holders \u00b7 1x non-participating preference</div>'
      + '<div class="desc">Your stake: ' + pct.toFixed(1) + '% \u2192 ~' + (pct*(1-t.dilution)*(1-next.pool)).toFixed(1) + '%</div>'
      + '<button class="btn small mt8" data-v426round="' + next.key + '">Sign the term sheet</button></div>';
  }
  if(s.rounds.closed.length) html += '<div class="muted mt8" style="font-size:12px;">Closed: ' + s.rounds.closed.join(", ").toUpperCase() + '.</div>';
  var box = card(html);
  box.querySelectorAll("[data-v426round]").forEach(function(b){
    b.onclick = function(){
      var r = ROUNDS.filter(function(x){ return x.key === b.getAttribute("data-v426round"); })[0];
      if(!r) return;
      var co = C(), s2 = S(), t = terms(r);
      try{
        var e = eq(co);
        var inv = Math.round(e.totalShares * t.dilution / Math.max(0.0001, 1 - t.dilution));
        var poolShares = Math.round(e.totalShares * r.pool);
        e.founder = Math.max(0, Math.round(e.founder * (1 - t.dilution) * (1 - r.pool)));
        e.pool = num(e.pool,0) + poolShares;
        e.totalShares = e.totalShares + inv;
        e.investors = e.investors || [];
        e.investors.push({ name:r.name + " lead", shares:inv, invested:t.raise, pref:t.raise, round:r.name });
      }catch(err){ ERR.push("round-eq: "+((err&&err.message)||err)); }
      co.cash += t.raise;
      co.valuation = t.post;
      s2.rounds.closed.push(r.key);
      log("\u{1F4B8} Closed " + r.name + ": " + money(t.raise) + " at a " + money(t.pre) + " pre-money, " + Math.round(r.pool*100) + "% pool refresh, 1x preference.");
      say("<b>" + r.name + " closed.</b> " + money(t.raise) + " in the bank.");
      redraw();
    };
  });
  return box;
}

/* ---------- 6. Compensation bands & equity refresh ---------- */
function bandOf(e){
  try{
    var r = LADDERS[e.dept].rungs.filter(function(x){ return x.key === e.rung; })[0];
    if(!r) return null;
    return { mid:(r.salaryRange[0]+r.salaryRange[1])/2 };
  }catch(err){ return null; }
}
function drift(){ var c = C(); return 1 + Math.min(0.35, (num(c && c.year,1) - 1) * 0.045); }
function below(){
  var c = C(); if(!c) return [];
  return (c.employees||[]).filter(function(e){
    var b = bandOf(e);
    return b && num(e.salary,0) < b.mid * drift() * 0.92;
  });
}
T("comp-month", function(){
  if(typeof advanceMonth !== "function") return;
  var prev = advanceMonth;
  window.advanceMonth = function(){
    var out = prev.apply(this, arguments);
    try{
      below().forEach(function(e){
        e.morale = cl(num(e.morale,70) - 2, 0, 100);
        if(e.morale < 40 && Math.random() < 0.08) log("\u26A0\uFE0F " + e.name + " is well below market pay and is interviewing elsewhere.");
      });
    }catch(e){ ERR.push("comp-month: "+((e&&e.message)||e)); }
    return out;
  };
});
function compCard(){
  var c = C(); if(!c) return null;
  var list = below();
  var cost = list.reduce(function(a,e){ var b = bandOf(e); return a + Math.max(0, Math.round(b.mid*drift()) - num(e.salary,0)); },0);
  var html = "<h3>\u{1F4B5} Compensation bands</h3>"
    + '<div class="muted mb8" style="font-size:12px;">Market pay drifts up about 4.5% a year; salaries set at hire do not. <b>' + list.length + '</b> of ' + (c.employees||[]).length + ' people are below band and lose morale every month until you fix it.</div>';
  if(list.length){
    html += "<table><thead><tr><th>Name</th><th>Role</th><th>Pay</th><th>Band mid</th><th>Gap</th></tr></thead><tbody>"
      + list.slice(0,10).map(function(e){
          var mid = Math.round(bandOf(e).mid*drift());
          return "<tr><td>"+e.name+"</td><td>"+(e.role||"")+"</td><td>"+money(num(e.salary,0))+"</td><td>"+money(mid)+"</td><td>"+money(mid-num(e.salary,0))+"</td></tr>";
        }).join("") + "</tbody></table>"
      + '<button class="btn small mt8" data-v426raise="1">Run a raise cycle \u00b7 +' + money(cost) + '/mo payroll</button>';
  } else html += '<div class="muted">Everyone is inside band.</div>';
  html += '<div class="muted mt8" style="font-size:12px;">Equity refresh tops up grants for people past two years of tenure.</div>'
    + '<button class="btn secondary small mt8" data-v426refresh="1">Refresh equity for tenured staff</button>';
  var box = card(html);
  box.querySelectorAll("[data-v426raise]").forEach(function(b){
    b.onclick = function(){
      var list2 = below();
      list2.forEach(function(e){ e.salary = Math.round(bandOf(e).mid * drift()); e.morale = cl(num(e.morale,70)+10,0,100); });
      log("\u{1F4B5} Raise cycle: " + list2.length + " people brought to band. Payroll up " + money(cost) + "/mo.");
      say("<b>Raise cycle done.</b> " + list2.length + " adjustments.");
      redraw();
    };
  });
  box.querySelectorAll("[data-v426refresh]").forEach(function(b){
    b.onclick = function(){
      var co = C(), n = 0;
      (co.employees||[]).forEach(function(e){
        var months = ((co.year - num(e.hiredYear, co.year)) * 12) + (co.month - num(e.hiredMonth, co.month));
        if(months >= 24){ try{ if(!grantEquity(e.id, 0.05, 48)) n++; }catch(x){} }
      });
      if(n){ log("\u{1F381} Equity refresh: " + n + " tenured employee(s) received new 0.05% grants."); say("<b>Equity refreshed</b> for " + n + " people."); }
      else say("Nobody is past two years of tenure yet, or the pool is empty.", "warn");
      redraw();
    };
  });
  return box;
}

/* ---------- 7. Multi-market expansion ---------- */
var MARKETS = [
  { key:"home", name:"Home market", entry:0, demand:1.00, wage:1.00, rent:1.00, rivals:"moderate" },
  { key:"metro", name:"Major metro", entry:85000, demand:1.45, wage:1.28, rent:1.60, rivals:"heavy" },
  { key:"sunbelt", name:"Sunbelt growth city", entry:52000, demand:1.22, wage:1.05, rent:1.10, rivals:"light" },
  { key:"rural", name:"Secondary / rural", entry:24000, demand:0.78, wage:0.85, rent:0.60, rivals:"none" },
  { key:"intl", name:"International", entry:180000, demand:1.35, wage:0.92, rent:1.15, rivals:"unknown" }
];
function marketCard(){
  var s = S(), c = C(); if(!s || !c) return null;
  var html = "<h3>\u{1F5FA}\uFE0F Markets</h3>"
    + '<div class="muted mb8" style="font-size:12px;">Every market has its own demand, wage floor, rent and competitive density. Entering costs money and permanently changes the economics of what you build there.</div>'
    + MARKETS.map(function(m){
        var inIt = s.markets.entered.indexOf(m.key) >= 0;
        return '<div class="ladder-card"><div class="row"><div><div class="title">' + m.name + (inIt?" \u2014 active":"") + '</div>'
          + '<div class="desc">Demand ' + Math.round(m.demand*100) + '% \u00b7 wages ' + Math.round(m.wage*100) + '% \u00b7 rent ' + Math.round(m.rent*100) + '% \u00b7 competition ' + m.rivals + '</div>'
          + (m.entry ? '<div class="desc">Entry cost ' + money(m.entry) + '</div>' : '<div class="desc">Where you started.</div>') + '</div>'
          + (inIt ? "" : '<button class="btn small" data-v426mkt="'+m.key+'">Enter</button>') + '</div></div>';
      }).join("");
  var blend = s.markets.entered.reduce(function(a,k){
    var m = MARKETS.filter(function(x){ return x.key === k; })[0];
    return a + (m ? m.demand : 0);
  },0) / Math.max(1, s.markets.entered.length);
  html += '<div class="muted mt8" style="font-size:12px;">Blended demand across your markets: <b>' + blend.toFixed(2) + 'x</b>.</div>';
  var box = card(html);
  box.querySelectorAll("[data-v426mkt]").forEach(function(b){
    b.onclick = function(){
      var m = MARKETS.filter(function(x){ return x.key === b.getAttribute("data-v426mkt"); })[0];
      var co = C(), s2 = S(); if(!m) return;
      if(co.cash < m.entry){ say("Not enough cash to enter " + m.name + " (" + money(m.entry) + ").", "warn"); return; }
      co.cash -= m.entry;
      s2.markets.entered.push(m.key);
      log("\u{1F5FA}\uFE0F Entered the " + m.name + " market \u2014 " + money(m.entry) + " in setup, demand " + Math.round(m.demand*100) + "% of home.");
      say("<b>" + m.name + " opened.</b>");
      redraw();
    };
  });
  return box;
}
T("market-demand", function(){
  if(typeof monthlyRevenue !== "function") return;
  var prev = monthlyRevenue;
  window.monthlyRevenue = function(co){
    var base = prev.apply(this, arguments);
    try{
      if(co && C() && co !== C()) return base;
      var s = S(); if(!s) return base;
      var lift = s.markets.entered.filter(function(k){ return k !== "home"; }).reduce(function(a,k){
        var m = MARKETS.filter(function(x){ return x.key === k; })[0];
        return a + (m ? (m.demand - 1) * 0.35 : 0);
      },0);
      if(lift > 0 && isFinite(base)) return Math.round(base * (1 + lift));
    }catch(e){}
    return base;
  };
});

/* ---------- 8. Mount dispatcher ---------- */
var PEOPLE = ["hr","people","team","orgchart"];
var FIN = ["bank","finance","financials"];
var GROWTH = ["growth","market","expansion","rivals"];
function mount(tabs, attr, builder){
  var screen = document.getElementById("screen");
  if(!screen || !C()) return;
  var tab = ""; try{ tab = (G.ui && G.ui.activeTab) || ""; }catch(e){}
  var found = screen.querySelector("["+attr+"]");
  if(tabs.indexOf(tab) < 0){ if(found && found.parentNode) found.parentNode.removeChild(found); return; }
  if(found) return;
  var node = null;
  try{ node = builder(); }catch(e){ if(ERR.length < 60) ERR.push(attr+": "+((e&&e.message)||e)); }
  if(!node) return;
  node.setAttribute(attr, "1");
  screen.appendChild(node);
}
function decCss(){
  if(document.getElementById("v426dec-css")) return;
  var s = document.createElement("style");
  s.id = "v426dec-css";
  s.textContent = '#screen[data-v426dec] [data-v425rivals],#screen[data-v426dec] [data-v48acct],'
    + '#screen[data-v426dec] [data-v425contracts],#screen[data-v426dec] [data-v425stores],'
    + '#screen[data-v426dec] [data-v425retailprod],#screen[data-v426dec] [data-v45card],'
    + '#screen[data-v426dec] .folder-grid{display:none !important;}';
  (document.head || document.documentElement).appendChild(s);
}
function stripDecisions(){
  decCss();
  var tab = ""; try{ tab = (G.ui && G.ui.activeTab) || ""; }catch(e){}
  var sc = document.getElementById("screen");
  if(sc){ if(tab === "decisions") sc.setAttribute("data-v426dec", "1"); else sc.removeAttribute("data-v426dec"); }
  if(tab !== "decisions") return;
  var screen = document.getElementById("screen"); if(!screen) return;
  ["[data-v425rivals]","[data-v48acct]","[data-v425contracts]","[data-v425stores]",".folder-grid"].forEach(function(sel){
    var n = screen.querySelectorAll(sel);
    for(var i=0;i<n.length;i++) if(n[i].parentNode) n[i].parentNode.removeChild(n[i]);
  });
}
function swapScreen(kind, builder, head){
  var screen = document.getElementById("screen"); if(!screen) return;
  if(screen.getAttribute("data-v426screen") === kind) return;
  var node = null;
  try{ node = builder(); }catch(e){ if(ERR.length < 60) ERR.push(kind + "-screen: " + ((e && e.message) || e)); }
  if(!node) return;
  screen.innerHTML = "";
  var title = document.createElement("div");
  title.className = "window-title";
  title.innerHTML = "<h2>" + head + "</h2>";
  screen.appendChild(title);
  screen.appendChild(node);
  screen.setAttribute("data-v426screen", kind);
}
function routeScreens(){
  var screen = document.getElementById("screen"); if(!screen) return;
  var tab = ""; try{ tab = (G.ui && G.ui.activeTab) || ""; }catch(e){}
  var ind = IND();
  var progs = window.__v426Programs || {};
  if(tab === "product" && progs[ind] && window.__v426ProductScreen){
    swapScreen("product:" + ind, window.__v426ProductScreen, "\\u{1F4E6} " + progs[ind].title);
    return;
  }
  if(tab === "industry" && window.__v426IsFleet && window.__v426IsFleet() && window.__v426FleetOps){
    swapScreen("fleet", window.__v426FleetOps, "\\u{1F69B} Fleet Operations");
    return;
  }
  if(screen.getAttribute("data-v426screen")) screen.removeAttribute("data-v426screen");
}
function after(){
  if(!C()) return;
  routeScreens();
  try{ if(window.__v426ZeroRep) window.__v426ZeroRep(); }catch(e){}
  try{ if(window.__v426GateDock) window.__v426GateDock(); }catch(e){}
  stripDecisions();
  mount(["decisions"], "data-v426attention", attentionCard);
  if(window.__v426PowerCard) mount(["decisions"], "data-v426power", window.__v426PowerCard);
  if(window.__v426CultureCard) mount(PEOPLE, "data-v426culture", window.__v426CultureCard);
  if(window.__v426DriverCard) mount(PEOPLE, "data-v426drivers", window.__v426DriverCard);
  mount(PEOPLE, "data-v426pipeline", pipelineCard);
  mount(PEOPLE, "data-v426comp", compCard);
  if(window.__v426PricingCard) mount(["clients"], "data-v426pricing", window.__v426PricingCard);
  mount(["clients"].concat(GROWTH), "data-v426channels", channelCard);
  mount(GROWTH, "data-v426markets", marketCard);
  mount(FIN, "data-v426insurance", insuranceCard);
  mount(FIN, "data-v426funding", fundingCard);
}
window.__v426After = after;
T("hook-render", function(){
  if(typeof renderScreen !== "function") return;
  var prev = renderScreen;
  window.renderScreen = function(){
    var out = prev.apply(this, arguments);
    try{ after(); }catch(e){}
    return out;
  };
});
setInterval(function(){ try{ after(); }catch(e){} }, 900);
setInterval(function(){ try{ stripDecisions(); }catch(e){} }, 250);
window.__v426Cards = { attention:attentionCard, insurance:insuranceCard, pipeline:pipelineCard, channels:channelCard, funding:fundingCard, comp:compCard, markets:marketCard };
})();
/* ================= v4.28d — trucking rebuilt: freight sales, contracts, fleet ================= */
(function v427(){
"use strict";
if(window.__v427) return; window.__v427 = true;
var ERR = window.__v427err = window.__v427err || [];
function T(l,f){ try{ return f(); }catch(e){ ERR.push(l+": "+((e&&e.message)||e)); } }
function C(){ try{ return (typeof G!=="undefined" && G && G.company) || null; }catch(e){ return null; } }
function isTruck(){ var c=C(); return !!(c && c.industry === "trucking"); }
function money(n){ try{ return fmt$(Math.round(n)); }catch(e){ return "$"+Math.round(n); } }
function rnd(a,b){ return a + Math.random()*(b-a); }
function ri(a,b){ return Math.floor(rnd(a,b+1)); }
function num(v,d){ v=Number(v); return isFinite(v)?v:d; }
function uid2(){ try{ return uid(); }catch(e){ return "x"+Math.random().toString(36).slice(2); } }
function log(t){ try{ logHistory(t); }catch(e){} }
function say(t,k){ try{ toast(t,k||"good"); }catch(e){} }
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(m){ return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[m]; }); }

var FUEL = 0.62, MAINT = 0.19;

var TRUCKS = {
  dryvan:    { key:"dryvan",    name:"Dry Van",            cost:42000, miles:11000, pay:5200, desc:"Boxed freight, pallets, general retail. The workhorse." },
  reefer:    { key:"reefer",    name:"Refrigerated",       cost:68000, miles:10500, pay:5800, desc:"Temperature-controlled. Food and pharma pay more and tolerate less." },
  flatbed:   { key:"flatbed",   name:"Flatbed",            cost:55000, miles:9500,  pay:5900, desc:"Steel, lumber, machinery. Best rate per mile, hardest work." },
  daycab:    { key:"daycab",    name:"Day Cab",            cost:38000, miles:7000,  pay:4900, desc:"Regional and dedicated runs. Home every night, fewer miles." }
};
var TRUCK_ORDER = ["dryvan","reefer","flatbed","daycab"];

var REPS = {
  dry:       { key:"dry",       name:"Dry Van Freight Rep",     pay:4200, equip:["dryvan"],           desc:"Cold-calls shippers and 3PLs for general freight." },
  reefer:    { key:"reefer",    name:"Refrigerated Sales Rep",  pay:5000, equip:["reefer"],           desc:"Works grocery, produce and pharma accounts." },
  flatbed:   { key:"flatbed",   name:"Flatbed / Heavy Haul Rep",pay:4800, equip:["flatbed"],          desc:"Works steel yards, lumber and construction." },
  dedicated: { key:"dedicated", name:"Dedicated Contracts Rep", pay:5600, equip:["daycab","dryvan"],  desc:"Chases long-term dedicated lanes. Slower, stickier revenue." }
};
var REP_ORDER = ["dry","reefer","flatbed","dedicated"];

var SHIPPERS = ["Midland Foods","Crestline Steel","Harbor Paper Co","Vale Produce","Northgate Retail","Apex Building Supply","Bluewater Beverage","Sterling Pharma","Copper Ridge Lumber","Fairview Grocers","Granite Works","Lakeshore Distribution","Pinnacle 3PL","Redstone Logistics","Summit Cold Storage"];
var FREIGHT = {
  dryvan:["palletized retail goods","packaged food","paper products","consumer electronics","bottled beverages"],
  reefer:["fresh produce","frozen food","dairy","pharmaceuticals","meat and poultry"],
  flatbed:["structural steel","lumber bundles","construction machinery","pipe","roofing material"],
  daycab:["store replenishment","regional distribution","drayage containers","parts runs","beverage delivery"]
};

function S(){
  var c = C(); if(!c) return null;
  if(!c.__v427) c.__v427 = { trucks:[], drivers:[], reps:[], offers:[], contracts:[], lastGross:0, lastCosts:0, lastNet:0, rows:[], hist:[], stamp:"" };
  var s = c.__v427;
  ["trucks","drivers","reps","offers","contracts","rows","hist"].forEach(function(k){ if(!Array.isArray(s[k])) s[k] = []; });
  return s;
}
window.v427 = { state:S, errs:function(){ return ERR; } };

/* ---------- retire the old fleet code so nothing double-counts ---------- */
T("retire-old", function(){
  if(typeof v45FleetMonth === "function"){
    window.v45FleetMonth = function(){ if(isTruck()) return; };
  }
  window.__v426IsFleet = function(){ return false; };
});

/* ---------- names ---------- */
var FIRST = ["Dale","Marty","Rosa","Big Ed","Tina","Junior","Luis","Shelby","Ray","Deb","Curtis","Vern","Nadia","Otis","Hank","Pam","Cleo","Dusty"];
var LAST = ["Whitaker","Pruitt","Delgado","Coleman","Ferris","Nakamura","Boone","Ramirez","Stokes","Kowalski","Abbott","Vance","Okafor","Beaumont"];
function personName(){ return FIRST[ri(0,FIRST.length-1)] + " " + LAST[ri(0,LAST.length-1)]; }

/* ---------- offers ---------- */
function makeOffer(equipKey, repName){
  var t = TRUCKS[equipKey];
  var miles = equipKey === "daycab" ? ri(180, 520) : (equipKey === "reefer" ? ri(700, 1500) : ri(380, 1100));
  var baseRate = { dryvan:2.75, reefer:3.10, flatbed:3.35, daycab:2.90 }[equipKey];
  var rate = Math.round((baseRate + rnd(-0.30, 0.45)) * 100) / 100;
  var perTruck = Math.max(1, Math.floor(t.miles / miles));
  var loads = Math.max(2, Math.round(perTruck * rnd(0.55, 1.9)));
  return {
    id: uid2(),
    shipper: SHIPPERS[ri(0, SHIPPERS.length-1)],
    equip: equipKey,
    commodity: FREIGHT[equipKey][ri(0, FREIGHT[equipKey].length-1)],
    loads: loads,
    miles: miles,
    rate: rate,
    term: ri(3, 12),
    trucksNeeded: Math.max(1, Math.ceil(loads / perTruck)),
    by: repName || "inbound call",
    life: 2
  };
}
function prospect(rep, immediate){
  var s = S(); if(!s) return 0;
  var n = immediate ? 1 : (Math.random() < 0.72 ? 1 : 0) + (Math.random() < 0.28 ? 1 : 0);
  var made = 0;
  for(var i=0;i<n;i++){
    var equip = rep.equip[ri(0, rep.equip.length-1)];
    s.offers.push(makeOffer(equip, rep.name));
    made++;
  }
  return made;
}

/* ---------- hiring / buying ---------- */
function hireRep(typeKey){
  var s = S(), c = C(), def = REPS[typeKey]; if(!s || !c || !def) return;
  var fee = Math.round(def.pay * 0.5);
  if(c.cash < fee){ say("Not enough cash for the " + def.name + " sign-on (" + money(fee) + ").", "warn"); return; }
  c.cash -= fee;
  var rep = { id:uid2(), type:typeKey, name:personName(), pay:def.pay, equip:def.equip.slice(), booked:0, sinceY:c.year, sinceM:c.month };
  s.reps.push(rep);
  var made = prospect(rep, true);
  log("\u{1F4DE} Hired " + rep.name + " as a " + def.name + " at " + money(def.pay) + "/mo. " + (made ? "They already have " + made + " load offer(s) on the board." : "They start dialing this month."));
  say("<b>" + rep.name + "</b> is on the phones. Check the contract board.");
  refresh();
}
function hireDriver(equipKey){
  var s = S(), c = C(), def = TRUCKS[equipKey]; if(!s || !c || !def) return;
  var d = { id:uid2(), name:personName(), pay:def.pay, endorse:equipKey, truck:null, lifetimeLoads:0, lifetimeMiles:0, lifetimeGross:0 };
  s.drivers.push(d);
  log("\u{1F464} Hired " + d.name + ", qualified on " + def.name.toLowerCase() + " equipment, at " + money(def.pay) + "/mo.");
  say("<b>" + d.name + "</b> hired. Assign them a truck in Fleet Ops.");
  refresh();
}
function fireDriver(id){
  var s = S(); if(!s) return;
  var d = s.drivers.filter(function(x){ return x.id === id; })[0]; if(!d) return;
  s.trucks.forEach(function(t){ if(t.driver === id) t.driver = null; });
  s.drivers = s.drivers.filter(function(x){ return x.id !== id; });
  log("\u{1F44B} " + d.name + " is off the payroll.");
  refresh();
}
function fireRep(id){
  var s = S(); if(!s) return;
  var r = s.reps.filter(function(x){ return x.id === id; })[0]; if(!r) return;
  s.reps = s.reps.filter(function(x){ return x.id !== id; });
  log("\u{1F44B} " + r.name + " is off the sales desk.");
  refresh();
}
function buyTruck(equipKey){
  var s = S(), c = C(), def = TRUCKS[equipKey]; if(!s || !c || !def) return;
  if(c.cash < def.cost){ say("A " + def.name.toLowerCase() + " tractor costs " + money(def.cost) + ". You have " + money(c.cash) + ".", "warn"); return; }
  c.cash -= def.cost;
  var unit = { id:uid2(), type:equipKey, name:def.name + " #" + (s.trucks.filter(function(t){ return t.type === equipKey; }).length + 1),
    driver:null, condition:96, odo:0, down:false, lifetimeLoads:0, lifetimeGross:0, last:null };
  s.trucks.push(unit);
  log("\u{1F69B} Bought a " + def.name.toLowerCase() + " tractor for " + money(def.cost) + " \u2014 " + unit.name + ".");
  say("<b>" + unit.name + "</b> is in the yard. It earns nothing until a driver is in it.");
  refresh();
}
function assign(truckId, driverId){
  var s = S(); if(!s) return;
  var t = s.trucks.filter(function(x){ return x.id === truckId; })[0]; if(!t) return;
  s.drivers.forEach(function(d){ if(d.truck === truckId) d.truck = null; });
  if(!driverId){ t.driver = null; refresh(); return; }
  var d = s.drivers.filter(function(x){ return x.id === driverId; })[0]; if(!d) return;
  if(d.truck){ var old = s.trucks.filter(function(x){ return x.id === d.truck; })[0]; if(old) old.driver = null; }
  d.truck = truckId; t.driver = driverId;
  log("\u{1F511} " + d.name + " is now driving " + t.name + ".");
  refresh();
}
function takeContract(offerId){
  var s = S(), c = C(); if(!s) return;
  var o = s.offers.filter(function(x){ return x.id === offerId; })[0]; if(!o) return;
  s.offers = s.offers.filter(function(x){ return x.id !== offerId; });
  s.contracts.push({ id:o.id, shipper:o.shipper, equip:o.equip, commodity:o.commodity, loads:o.loads, miles:o.miles,
    rate:o.rate, monthsLeft:o.term, term:o.term, missed:0, hauledLoads:0, lifetimeGross:0 });
  log("\u{1F91D} Signed " + o.shipper + ": " + o.loads + " " + TRUCKS[o.equip].name.toLowerCase() + " loads/mo of " + o.commodity + " at $" + o.rate.toFixed(2) + "/mi over " + o.miles + " miles, " + o.term + " month term.");
  say("<b>" + o.shipper + " signed.</b> You need " + o.trucksNeeded + " seated " + TRUCKS[o.equip].name.toLowerCase() + " truck(s) to cover it.");
  refresh();
}
function dropOffer(offerId){
  var s = S(); if(!s) return;
  s.offers = s.offers.filter(function(x){ return x.id !== offerId; });
  refresh();
}
function serviceTruck(truckId){
  var s = S(), c = C(); if(!s || !c) return;
  var t = s.trucks.filter(function(x){ return x.id === truckId; })[0]; if(!t) return;
  var bill = Math.round(900 + (100 - num(t.condition,90)) * 62);
  if(c.cash < bill){ say("Service on " + t.name + " runs " + money(bill) + ".", "warn"); return; }
  c.cash -= bill; t.condition = 98; t.down = false;
  log("\u{1F527} Serviced " + t.name + " for " + money(bill) + ".");
  refresh();
}

/* ---------- the month ---------- */
function capacityOf(t){
  if(!t.driver || t.down) return 0;
  return TRUCKS[t.type].miles;
}
function runMonth(){
  var s = S(), c = C(); if(!s || !c || !isTruck()) return;
  var gross = 0, costs = 0, rows = [], shortfalls = [];
  var budget = {};
  s.trucks.forEach(function(t){ budget[t.id] = capacityOf(t); t.last = null; });

  s.contracts.forEach(function(k){
    var need = k.loads, hauled = 0, milesRun = 0;
    s.trucks.forEach(function(t){
      if(need <= 0 || t.type !== k.equip) return;
      var canMiles = budget[t.id] || 0;
      if(canMiles < k.miles) return;
      var can = Math.min(need, Math.floor(canMiles / k.miles));
      if(can <= 0) return;
      var m = can * k.miles, rev = Math.round(m * k.rate);
      budget[t.id] = canMiles - m;
      need -= can; hauled += can; milesRun += m; gross += rev;
      t.odo = num(t.odo,0) + m;
      t.lifetimeLoads = num(t.lifetimeLoads,0) + can;
      t.lifetimeGross = num(t.lifetimeGross,0) + rev;
      t.condition = Math.max(0, num(t.condition,95) - Math.round(m / 1400));
      t.last = t.last || { loads:0, miles:0, gross:0, work:[] };
      t.last.loads += can; t.last.miles += m; t.last.gross += rev;
      if(t.last.work.indexOf(k.shipper) < 0) t.last.work.push(k.shipper + " (" + k.commodity + ")");
      var drv = s.drivers.filter(function(d){ return d.id === t.driver; })[0];
      if(drv){ drv.lifetimeLoads = num(drv.lifetimeLoads,0) + can; drv.lifetimeMiles = num(drv.lifetimeMiles,0) + m; drv.lifetimeGross = num(drv.lifetimeGross,0) + rev; }
    });
    k.hauledLoads = hauled;
    k.lifetimeGross = num(k.lifetimeGross,0) + Math.round(milesRun * k.rate);
    costs += Math.round(milesRun * (FUEL + MAINT));
    if(need > 0){
      var pen = Math.round(need * k.miles * k.rate * 0.08);
      costs += pen; k.missed += 1;
      shortfalls.push({ k:k, need:need, pen:pen });
    } else if(k.missed > 0) k.missed -= 1;
  });

  s.trucks.forEach(function(t){
    if(t.down){ log("\u{1F527} " + t.name + " was in the shop all month."); t.down = false; return; }
    if(!t.driver){ log("\u{1F6AB} " + t.name + " sat in the yard \u2014 no driver assigned."); return; }
    if(!t.last) log("\u{1F4C9} " + t.name + " had no freight to run \u2014 you need contracts for " + TRUCKS[t.type].name.toLowerCase() + " equipment.");
    if(num(t.condition,95) < 42 && Math.random() < 0.3){
      var bill = ri(2200, 7400);
      costs += bill; t.down = true; t.condition = Math.min(95, num(t.condition,40) + ri(25,45));
      log("\u{1F6E0}\uFE0F " + t.name + " broke down \u2014 " + money(bill) + " in repairs, out of service next month.");
    }
  });

  var payroll = 0;
  s.drivers.forEach(function(d){ payroll += d.pay; });
  s.reps.forEach(function(r){ payroll += r.pay; });
  costs += payroll;

  shortfalls.forEach(function(sf){
    log("\u26A0\uFE0F " + sf.k.shipper + ": " + sf.need + " load(s) went uncovered \u2014 " + money(sf.pen) + " in penalties. You need more seated " + TRUCKS[sf.k.equip].name.toLowerCase() + " trucks.");
    if(sf.k.missed >= 3){
      sf.k.monthsLeft = 0;
      log("\u274C " + sf.k.shipper + " cancelled the contract after three months of missed freight.");
      try{ if(typeof v46RepBump === "function") v46RepBump("company", -4, "Lost a contract for non-performance"); }catch(e){}
    }
  });

  s.contracts.forEach(function(k){ k.monthsLeft -= 1; });
  var expired = s.contracts.filter(function(k){ return k.monthsLeft <= 0; });
  expired.forEach(function(k){ if(k.missed < 3) log("\u{1F4C4} The " + k.shipper + " contract ran its term and expired. Your reps can chase a renewal."); });
  s.contracts = s.contracts.filter(function(k){ return k.monthsLeft > 0; });

  s.reps.forEach(function(r){ var n = prospect(r, false); r.booked += n; });
  s.offers.forEach(function(o){ o.life -= 1; });
  s.offers = s.offers.filter(function(o){ return o.life > 0; });

  s.lastGross = Math.round(gross);
  s.lastCosts = Math.round(costs);
  s.lastNet = Math.round(gross - costs);
  s.rows = s.trucks.map(function(t){
    return { name:t.name, type:TRUCKS[t.type].name, driver:(s.drivers.filter(function(d){ return d.id === t.driver; })[0]||{}).name || "—",
      loads:t.last ? t.last.loads : 0, miles:t.last ? t.last.miles : 0, gross:t.last ? t.last.gross : 0,
      work:t.last ? t.last.work.join(", ") : "idle" };
  });
  s.hist.unshift({ y:c.year, m:c.month, gross:s.lastGross, net:s.lastNet, loads:s.rows.reduce(function(a,r){ return a+r.loads; },0) });
  if(s.hist.length > 12) s.hist.length = 12;

  c.cash += s.lastNet;
  try{
    c.expensesBreakdown = c.expensesBreakdown || {};
    c.expensesBreakdown.other = num(c.expensesBreakdown.other,0) + s.lastCosts;
  }catch(e){}

  if(s.trucks.length || s.reps.length){
    log("\u{1F69B} Freight month: " + money(s.lastGross) + " hauled, " + money(s.lastCosts) + " in fuel, maintenance, drivers and sales \u2014 net " + money(s.lastNet) + ".");
  }
  if(!s.reps.length) log("\u{1F4DE} No freight sales reps on staff \u2014 nobody is finding you loads.");
}
T("month-hook", function(){
  if(typeof advanceMonth !== "function") return;
  var prev = advanceMonth;
  window.advanceMonth = function(){
    var out = prev.apply(this, arguments);
    try{ runMonth(); }catch(e){ ERR.push("runMonth: "+((e&&e.message)||e)); }
    return out;
  };
});
T("revenue-hook", function(){
  if(typeof monthlyRevenue !== "function") return;
  var prev = monthlyRevenue;
  window.monthlyRevenue = function(co){
    var base = prev.apply(this, arguments);
    try{
      var c = C();
      if(c && (!co || co === c) && c.industry === "trucking" && c.__v427) base += num(c.__v427.lastGross, 0);
    }catch(e){}
    return base;
  };
});

/* ---------- UI ---------- */
function box(html){
  var d = document.createElement("div");
  d.className = "card mt14";
  d.innerHTML = html;
  return d;
}
function seatedBy(type){
  var s = S(); if(!s) return 0;
  return s.trucks.filter(function(t){ return t.type === type && t.driver && !t.down; }).length;
}
function fleetScreen(){
  var s = S(), c = C(); if(!s || !c) return null;
  var wrap = document.createElement("div");
  var committed = {}, capacity = {};
  TRUCK_ORDER.forEach(function(k){ committed[k] = 0; capacity[k] = 0; });
  s.contracts.forEach(function(k){ committed[k.equip] += k.loads * k.miles; });
  s.trucks.forEach(function(t){ if(t.driver && !t.down) capacity[t.type] += TRUCKS[t.type].miles; });

  var head = '<div class="window-title"><h2>\u{1F69B} Fleet Operations</h2>'
    + '<span class="sub">Last month: ' + money(s.lastGross) + ' hauled \u00b7 net ' + money(s.lastNet) + ' \u00b7 ' + s.trucks.length + ' truck(s), ' + s.drivers.filter(function(d){ return d.truck; }).length + ' seated</span></div>';
  wrap.innerHTML = head;

  /* capacity */
  var cap = '<h3>Capacity vs commitments</h3><table><thead><tr><th>Equipment</th><th>Trucks seated</th><th>Monthly miles available</th><th>Miles committed</th><th>Status</th></tr></thead><tbody>'
    + TRUCK_ORDER.map(function(k){
        var ok = capacity[k] >= committed[k];
        return "<tr><td>" + TRUCKS[k].name + "</td><td>" + seatedBy(k) + "</td><td>" + capacity[k].toLocaleString() + "</td><td>" + committed[k].toLocaleString() + "</td><td class=\"" + (ok?"good":"bad") + "\">" + (committed[k] === 0 ? "no freight" : (ok ? "covered" : "short")) + "</td></tr>";
      }).join("") + "</tbody></table>";
  wrap.appendChild(box(cap));

  /* buy */
  var buy = "<h3>Buy equipment</h3><div class=\"muted mb8\" style=\"font-size:12px;\">Each tractor can run a fixed number of miles a month. A truck with no driver earns nothing, and freight only moves on matching equipment.</div>"
    + TRUCK_ORDER.map(function(k){
        var t = TRUCKS[k];
        return '<div class="ladder-card"><div class="row"><div><div class="title">' + t.name + ' \u2014 ' + money(t.cost) + '</div>'
          + '<div class="desc">' + t.desc + '</div>'
          + '<div class="desc">' + t.miles.toLocaleString() + ' miles/mo capacity \u00b7 driver pay ' + money(t.pay) + '/mo</div></div>'
          + '<button class="btn small" data-v427buy="' + k + '">Buy</button></div></div>';
      }).join("");
  wrap.appendChild(box(buy));

  /* trucks */
  var free = s.drivers.filter(function(d){ return !d.truck; });
  var fleet = "<h3>Your trucks</h3>";
  if(!s.trucks.length) fleet += '<div class="muted">No tractors yet. Buy one above.</div>';
  else {
    fleet += '<table><thead><tr><th>Truck</th><th>Type</th><th>Driver</th><th>Condition</th><th>Last month</th><th>Hauling for</th><th>Lifetime</th><th></th></tr></thead><tbody>'
      + s.trucks.map(function(t){
          var d = s.drivers.filter(function(x){ return x.id === t.driver; })[0];
          var opts = '<option value="">\u2014 unassigned \u2014</option>'
            + (d ? '<option value="' + d.id + '" selected>' + esc(d.name) + '</option>' : "")
            + free.filter(function(x){ return x.endorse === t.type || x.endorse === "dryvan" && t.type === "daycab"; })
                  .map(function(x){ return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join("");
          return "<tr><td><b>" + esc(t.name) + "</b></td><td>" + TRUCKS[t.type].name + "</td>"
            + '<td><select data-v427assign="' + t.id + '">' + opts + "</select></td>"
            + "<td>" + Math.round(num(t.condition,95)) + "%" + (t.down ? " \u00b7 <span class='bad'>in shop</span>" : "") + "</td>"
            + "<td>" + (t.last ? t.last.loads + " loads \u00b7 " + money(t.last.gross) : "—") + "</td>"
            + "<td>" + esc(t.last ? t.last.work.join(", ") : "idle") + "</td>"
            + "<td>" + num(t.lifetimeLoads,0) + " loads \u00b7 " + money(num(t.lifetimeGross,0)) + "</td>"
            + '<td><button class="btn secondary small" data-v427service="' + t.id + '">Service</button></td></tr>';
        }).join("") + "</tbody></table>";
    if(free.length) fleet += '<div class="muted mt8" style="font-size:12px;">' + free.length + ' driver(s) hired but not seated. Assign them above \u2014 they are paid either way.</div>';
  }
  wrap.appendChild(box(fleet));

  /* contracts */
  var act = "<h3>Active contracts</h3>";
  if(!s.contracts.length) act += '<div class="muted">No freight under contract. Your sales desk finds it \u2014 hire reps in HR &amp; Hiring.</div>';
  else act += '<table><thead><tr><th>Shipper</th><th>Equipment</th><th>Freight</th><th>Loads/mo</th><th>Miles</th><th>Rate</th><th>Value/mo</th><th>Term left</th><th>Coverage</th></tr></thead><tbody>'
    + s.contracts.map(function(k){
        var covered = k.hauledLoads >= k.loads;
        return "<tr><td><b>" + esc(k.shipper) + "</b></td><td>" + TRUCKS[k.equip].name + "</td><td>" + esc(k.commodity) + "</td><td>" + k.loads + "</td><td>" + k.miles.toLocaleString() + "</td><td>$" + k.rate.toFixed(2) + "</td><td>" + money(k.loads * k.miles * k.rate) + "</td><td>" + k.monthsLeft + " mo</td>"
          + '<td class="' + (covered ? "good" : "bad") + '">' + (k.hauledLoads ? k.hauledLoads + " of " + k.loads : "uncovered") + "</td></tr>";
      }).join("") + "</tbody></table>";
  wrap.appendChild(box(act));

  /* offers */
  var off = "<h3>\u{1F4DE} Contract board</h3>";
  if(!s.reps.length) off += '<div class="muted">Nobody is selling. Hire a freight sales rep in HR &amp; Hiring and offers will start landing here.</div>';
  else if(!s.offers.length) off += '<div class="muted">Your reps are dialing. New offers land each month.</div>';
  else off += s.offers.map(function(o){
      var need = o.trucksNeeded, have = seatedBy(o.equip);
      return '<div class="ladder-card"><div class="row"><div><div class="title">' + esc(o.shipper) + ' \u2014 ' + money(o.loads * o.miles * o.rate) + '/mo</div>'
        + '<div class="desc">' + o.loads + ' loads/mo of ' + esc(o.commodity) + ' \u00b7 ' + TRUCKS[o.equip].name + ' \u00b7 ' + o.miles.toLocaleString() + ' mi/load at $' + o.rate.toFixed(2) + '/mi \u00b7 ' + o.term + ' month term</div>'
        + '<div class="desc ' + (have >= need ? "good" : "bad") + '">Needs ' + need + ' seated ' + TRUCKS[o.equip].name.toLowerCase() + ' truck(s); you have ' + have + '</div>'
        + '<div class="desc">Sourced by ' + esc(o.by) + '</div></div>'
        + '<div style="display:flex;gap:6px;"><button class="btn small" data-v427take="' + o.id + '">Sign</button>'
        + '<button class="btn secondary small" data-v427drop="' + o.id + '">Pass</button></div></div></div>';
    }).join("");
  wrap.appendChild(box(off));

  if(s.hist.length){
    wrap.appendChild(box("<h3>Fleet history</h3><table><thead><tr><th>Month</th><th>Loads</th><th>Hauled</th><th>Net</th></tr></thead><tbody>"
      + s.hist.map(function(h){ return "<tr><td>Y" + h.y + " M" + h.m + "</td><td>" + h.loads + "</td><td>" + money(h.gross) + "</td><td class=\"" + (h.net >= 0 ? "good" : "bad") + "\">" + money(h.net) + "</td></tr>"; }).join("")
      + "</tbody></table>"));
  }
  return wrap;
}
function driversCard(){
  var s = S(); if(!s) return null;
  var html = "<h3>\u{1F464} Drivers</h3>"
    + '<div class="muted mb8" style="font-size:12px;">Drivers are hired here and seated in Fleet Ops. Each one is qualified on a class of equipment and is paid whether or not you put them in a truck.</div>'
    + '<div class="flexrow mb8" style="gap:6px;flex-wrap:wrap;">'
    + TRUCK_ORDER.map(function(k){ return '<button class="btn small" data-v427hire="' + k + '">Hire ' + TRUCKS[k].name.toLowerCase() + ' driver \u00b7 ' + money(TRUCKS[k].pay) + '/mo</button>'; }).join("")
    + "</div>";
  if(!s.drivers.length) html += '<div class="muted">No drivers on payroll.</div>';
  else html += '<table><thead><tr><th>Name</th><th>Qualified on</th><th>Pay</th><th>Truck</th><th>Lifetime</th><th></th></tr></thead><tbody>'
    + s.drivers.map(function(d){
        var t = s.trucks.filter(function(x){ return x.id === d.truck; })[0];
        return "<tr><td>" + esc(d.name) + "</td><td>" + TRUCKS[d.endorse].name + "</td><td>" + money(d.pay) + "</td><td>" + (t ? esc(t.name) : "<span class='bad'>unseated</span>") + "</td><td>" + num(d.lifetimeLoads,0) + " loads \u00b7 " + money(num(d.lifetimeGross,0)) + "</td>"
          + '<td><button class="btn danger small" data-v427fired="' + d.id + '">Let go</button></td></tr>';
      }).join("") + "</tbody></table>";
  return box(html);
}
function salesCard(){
  var s = S(); if(!s) return null;
  var html = "<h3>\u{1F4DE} Freight sales desk</h3>"
    + '<div class="muted mb8" style="font-size:12px;">Reps cold-call shippers and 3PLs. Each type works a different kind of freight, and the contracts they land can only be hauled on matching equipment.</div>'
    + REP_ORDER.map(function(k){
        var r = REPS[k];
        return '<div class="ladder-card"><div class="row"><div><div class="title">' + r.name + ' \u2014 ' + money(r.pay) + '/mo</div>'
          + '<div class="desc">' + r.desc + '</div>'
          + '<div class="desc">Books freight for: ' + r.equip.map(function(e){ return TRUCKS[e].name; }).join(", ") + '</div></div>'
          + '<button class="btn small" data-v427rep="' + k + '">Hire</button></div></div>';
      }).join("");
  if(s.reps.length){
    html += '<table class="mt8"><thead><tr><th>Name</th><th>Desk</th><th>Pay</th><th>Offers sourced</th><th></th></tr></thead><tbody>'
      + s.reps.map(function(r){ return "<tr><td>" + esc(r.name) + "</td><td>" + REPS[r.type].name + "</td><td>" + money(r.pay) + "</td><td>" + num(r.booked,0) + "</td>"
        + '<td><button class="btn danger small" data-v427firer="' + r.id + '">Let go</button></td></tr>'; }).join("") + "</tbody></table>";
  }
  return box(html);
}
function starterCard(){
  var s = S(); if(!s) return null;
  if(s.contracts.length && s.trucks.filter(function(t){ return t.driver; }).length) return null;
  var steps = [
    { done: s.reps.length > 0, text:"Hire one freight sales rep in HR &amp; Hiring \u2014 they find the loads." },
    { done: s.trucks.length > 0, text:"Buy one tractor in Fleet Ops that matches the freight your rep sells." },
    { done: s.drivers.length > 0, text:"Hire one driver in HR &amp; Hiring qualified on that equipment." },
    { done: s.trucks.filter(function(t){ return t.driver; }).length > 0, text:"Seat the driver in the truck on Fleet Ops." },
    { done: s.contracts.length > 0, text:"Sign a contract off the contract board." }
  ];
  return box("<h3>\u{1F3C1} Getting your first load moving</h3>"
    + '<div class="muted mb8" style="font-size:12px;">All five in your first month and you bill freight at the next month-end.</div>'
    + "<ul style='margin:0;padding-left:18px;'>" + steps.map(function(st){ return "<li style='opacity:" + (st.done ? "0.5" : "1") + "'>" + (st.done ? "\u2705 " : "\u2b1c ") + st.text + "</li>"; }).join("") + "</ul>");
}

/* ---------- dead departments ---------- */
var DEAD_FOR_TRUCK = ["Product & Engineering", "Marketing", "Customer Support"];
function hideDeadDepts(){
  if(!isTruck()) return;
  var screen = document.getElementById("screen"); if(!screen) return;
  var nodes = screen.querySelectorAll(".ladder-dept, .dept-card, .card");
  for(var i=0;i<nodes.length;i++){
    var h = nodes[i].querySelector("h3, .title");
    if(!h) continue;
    var txt = h.textContent || "";
    for(var j=0;j<DEAD_FOR_TRUCK.length;j++){
      if(txt.indexOf(DEAD_FOR_TRUCK[j]) >= 0 && !nodes[i].hasAttribute("data-v427keep")) nodes[i].style.display = "none";
    }
  }
}

/* ---------- mounting ---------- */
var PEOPLE = ["hr","people","team","orgchart"];
function tabNow(){ try{ return (G.ui && G.ui.activeTab) || ""; }catch(e){ return ""; } }
function mount(tabs, attr, builder){
  var screen = document.getElementById("screen"); if(!screen) return;
  var found = screen.querySelector("[" + attr + "]");
  if(tabs.indexOf(tabNow()) < 0 || !isTruck()){ if(found && found.parentNode) found.parentNode.removeChild(found); return; }
  if(found) return;
  var node = null;
  try{ node = builder(); }catch(e){ if(ERR.length < 60) ERR.push(attr + ": " + ((e&&e.message)||e)); }
  if(!node) return;
  node.setAttribute(attr, "1");
  node.setAttribute("data-v427keep", "1");
  screen.appendChild(node);
}
var dirty = false;
function refresh(){ dirty = true; try{ paint(); }catch(e){} }
function paint(){
  if(!C()) return;
  var screen = document.getElementById("screen"); if(!screen) return;
  var tab = tabNow();
  if(isTruck() && tab === "industry"){
    if(dirty || screen.getAttribute("data-v427screen") !== "fleet"){
      var node = null;
      try{ node = fleetScreen(); }catch(e){ ERR.push("fleetScreen: " + ((e&&e.message)||e)); }
      if(node){
        screen.innerHTML = "";
        screen.appendChild(node);
        var st = starterCard();
        if(st) screen.appendChild(st);
        screen.setAttribute("data-v427screen", "fleet");
        dirty = false;
        wire(screen);
      }
    }
    return;
  }
  if(screen.getAttribute("data-v427screen")) screen.removeAttribute("data-v427screen");
  if(isTruck() && PEOPLE.indexOf(tab) >= 0 && dirty){
    ["[data-v427drivers]","[data-v427sales]"].forEach(function(sel){
      var n = screen.querySelector(sel); if(n && n.parentNode) n.parentNode.removeChild(n);
    });
    dirty = false;
  }
  mount(PEOPLE, "data-v427drivers", driversCard);
  mount(PEOPLE, "data-v427sales", salesCard);
  mount(PEOPLE, "data-v427start", starterCard);
  hideDeadDepts();
  wire(screen);
}
function wire(root){
  function on(sel, fn){
    var n = root.querySelectorAll(sel);
    for(var i=0;i<n.length;i++){
      (function(el){
        if(el.__v427wired) return;
        el.__v427wired = true;
        if(el.tagName === "SELECT") el.onchange = function(){ fn(el); };
        else el.onclick = function(){ fn(el); };
      })(n[i]);
    }
  }
  on("[data-v427buy]", function(el){ buyTruck(el.getAttribute("data-v427buy")); });
  on("[data-v427hire]", function(el){ hireDriver(el.getAttribute("data-v427hire")); });
  on("[data-v427rep]", function(el){ hireRep(el.getAttribute("data-v427rep")); });
  on("[data-v427take]", function(el){ takeContract(el.getAttribute("data-v427take")); });
  on("[data-v427drop]", function(el){ dropOffer(el.getAttribute("data-v427drop")); });
  on("[data-v427service]", function(el){ serviceTruck(el.getAttribute("data-v427service")); });
  on("[data-v427fired]", function(el){ fireDriver(el.getAttribute("data-v427fired")); });
  on("[data-v427firer]", function(el){ fireRep(el.getAttribute("data-v427firer")); });
  on("[data-v427assign]", function(el){ assign(el.getAttribute("data-v427assign"), el.value); });
}
T("render-hook", function(){
  if(typeof renderScreen !== "function") return;
  var prev = renderScreen;
  window.renderScreen = function(){
    var out = prev.apply(this, arguments);
    dirty = true;
    try{ paint(); }catch(e){}
    return out;
  };
});
setInterval(function(){ try{ paint(); }catch(e){} }, 700);
window.__v427 = { fleetScreen:fleetScreen, drivers:driversCard, sales:salesCard, runMonth:runMonth, paint:paint };
})();
/* ============ v4.28dd — strip dead trucking departments, retire old driver card ============ */
(function v427d(){
"use strict";
if(window.__v427d) return; window.__v427d = true;
var DEAD = ["sales","marketing","product","support"];
var DEAD_LABEL = /Product & Engineering|^Marketing|Customer Support|^Sales\b/;
function c(){ try{ return (typeof G!=="undefined" && G && G.company) || null; }catch(e){ return null; } }
function isTruck(){ var x=c(); return !!(x && x.industry === "trucking"); }
function css(){
  if(document.getElementById("v427d-css")) return;
  var s = document.createElement("style");
  s.id = "v427d-css";
  s.textContent = "#screen[data-v427truck] [data-v426drivers]{display:none !important;}"
    + DEAD.map(function(d){ return '#screen[data-v427truck] [data-v426dept="' + d + '"]{display:none !important;}'; }).join("")
    + "#screen[data-v427truck] [data-v427hidden]{display:none !important;}";
  (document.head || document.documentElement).appendChild(s);
}
function sweep(){
  try{
    css();
    var screen = document.getElementById("screen");
    if(!screen) return;
    if(!isTruck()){ screen.removeAttribute("data-v427truck"); return; }
    screen.setAttribute("data-v427truck", "1");
    /* department ladder sections that do nothing for a carrier */
    var cards = screen.querySelectorAll(".card, .ladder-card, .dept-card");
    for(var i=0;i<cards.length;i++){
      if(cards[i].hasAttribute("data-v427keep")) continue;
      var h = cards[i].querySelector("h3, h4, .title");
      if(h && DEAD_LABEL.test((h.textContent||"").trim())) cards[i].setAttribute("data-v427hidden", "1");
    }
    /* hiring dropdowns: drop dead departments and their rungs */
    var sels = screen.querySelectorAll("select");
    for(var k=0;k<sels.length;k++){
      var sel = sels[k];
      if(sel.hasAttribute("data-v427assign")) continue;
      for(var o=sel.options.length-1;o>=0;o--){
        var opt = sel.options[o];
        if(DEAD.indexOf(opt.value) >= 0 || DEAD_LABEL.test((opt.textContent||"").trim())) opt.remove();
      }
    }
    /* if the pipeline is pointed at a dead department, move it to operations */
    try{
      var st = c() && c().__v426;
      if(st && DEAD.indexOf(st.uiDept) >= 0) st.uiDept = "operations";
    }catch(e){}
  }catch(e){}
}
setInterval(sweep, 600);
sweep();
window.__v427d = { sweep:sweep, dead:DEAD };
})();
/* ===== v4.28d Phase 1 — accounts stop resetting, revenue tile counts freight ===== */
(function(){
if(window.__v428p1) return;
window.__v428p1 = true;
var ERR = [];
function T(tag, fn){ try{ return fn(); }catch(e){ ERR.push(tag + ": " + (e && e.message)); } }
function C(){ try{ return G && G.company; }catch(e){ return null; } }
function num(v){ v = Number(v); return isFinite(v) ? v : 0; }

/* ---- 1. Revenue tile: freight gross was never in the snapshot, so it read $0 ---- */
T("revfix", function(){
  if(typeof window.corporateSnapshot !== "function") return;
  var prev = window.corporateSnapshot;
  window.corporateSnapshot = function(){
    var s = prev.apply(this, arguments);
    try{
      var c = C();
      if(!c || !s) return s;
      var S = c.__v427;
      if(!S) return s;
      var g = num(S.lastGross);
      if(g > 0) c.__v428rev = g;
      else g = num(c.__v428rev);
      if(g > 0){
        s.revenue = num(s.revenue) + g;
        s.expenses = num(s.expenses) + num(S.lastCosts);
        s.net = num(s.revenue) - num(s.expenses);
      }
    }catch(e){ ERR.push("revfix: " + (e && e.message)); }
    return s;
  };
});

/* ---- 2. Accounts: cap how much of the book any single month may destroy ---- */
/* Churn, rival poaching, macro shocks and event handlers each filter c.clients
   independently. Stacked in one month they can empty the book. A month may now
   lose at most 20% of the book (minimum one account, and never the last two). */
function snapshotClients(c){
  return (c && c.clients) ? c.clients.slice() : [];
}
function restoreClients(c, before){
  if(!c || !before.length) return 0;
  var after = c.clients || [];
  var lost = before.length - after.length;
  if(lost <= 0) return 0;
  var allowed = Math.max(1, Math.floor(before.length * 0.10));
  if(before.length <= 3) allowed = 0;
  if(lost <= allowed) return 0;
  var have = {};
  after.forEach(function(x){ if(x && x.id != null) have[x.id] = true; });
  var missing = before.filter(function(x){ return x && x.id != null && !have[x.id]; });
  var giveBack = missing.slice(allowed);
  giveBack.forEach(function(x){ c.clients.push(x); });
  if(typeof recomputeMRR === "function") T("recompute", recomputeMRR);
  return giveBack.length;
}

/* ---- accounts you actually win: the sales ladder books new business ---- */
function winAccounts(c){
  if(!c) return 0;
  var sales = (c.employees || []).filter(function(e){ return e.dept === "sales"; });
  if(!sales.length) return 0;
  c.clients = c.clients || [];
  var won = 0;
  sales.forEach(function(e){
    var morale = num(e.morale) || 70;
    var chance = 0.28 * (morale / 70);
    if(Math.random() < Math.min(0.6, chance)){
      var base = Math.max(1200, Math.round((num(c.mrr) / Math.max(1, c.clients.length)) || 3500));
      c.clients.push({
        id: "v428w" + Date.now() + "_" + Math.floor(Math.random() * 9999),
        name: "New Account " + (100 + Math.floor(Math.random() * 899)),
        mrr: Math.round(base * (0.7 + Math.random() * 0.8)),
        health: 68 + Math.floor(Math.random() * 16),
        sinceMonth: c.month, sinceYear: c.year
      });
      won++;
    }
  });
  if(won > 0 && typeof recomputeMRR === "function") T("recompute-win", recomputeMRR);
  if(won > 0 && typeof logHistory === "function"){
    T("log-win", function(){
      logHistory("\u{1F91D} Your sales team booked " + won + " new account(s) this month.");
    });
  }
  return won;
}

T("clientguard", function(){
  if(typeof window.advanceMonth !== "function") return;
  var prev = window.advanceMonth;
  window.advanceMonth = function(){
    var c = C();
    var before = snapshotClients(c);
    var out = prev.apply(this, arguments);
    /* late removals: some event handlers filter c.clients after the month returns */
    setTimeout(function(){ T("clientguard-late", function(){
      var cc = C();
      if(cc) restoreClients(cc, before);
    }); }, 1400);
    T("clientguard-post", function(){
      var cc = C();
      if(!cc) return;
      winAccounts(cc);
      var kept = restoreClients(cc, before);
      if(kept > 0){
        cc.__v428kept = (cc.__v428kept || 0) + kept;
        if(typeof logHistory === "function"){
          T("log", function(){
            logHistory("\u{1F6E1}\uFE0F Account churn was capped this month \u2014 " + kept +
              " account(s) that would have been wiped by stacked market effects stayed on the books.");
          });
        }
      }
    });
    return out;
  };
});

/* ---- 3. Dial the macro layer back so it nudges instead of dictating ---- */
T("macro", function(){
  if(typeof window.churnMultiplier === "function"){
    var pc = window.churnMultiplier;
    window.churnMultiplier = function(){
      var v = num(pc.apply(this, arguments)) || 1;
      return Math.max(0.7, Math.min(1.35, v));
    };
  }
});

window.__v428p1api = { restoreClients: restoreClients, errs: function(){ return ERR; } };
})();
/* ===== v4.28d Phase 2 — Drivers become a real hiring department; freight sales bite ===== */
(function(){
if(window.__v428p2) return;
window.__v428p2 = true;
var ERR = [];
function T(tag, fn){ try{ return fn(); }catch(e){ ERR.push(tag + ": " + (e && e.message)); } }
function C(){ try{ return G && G.company; }catch(e){ return null; } }
function num(v){ v = Number(v); return isFinite(v) ? v : 0; }
function isTruck(){ var c = C(); return !!c && c.industry === "trucking"; }
function S(){ var c = C(); return (c && c.__v427) ? c.__v427 : null; }
function ri(a, b){ return Math.floor(Math.random() * (b - a + 1)) + a; }
function clone(o){ return JSON.parse(JSON.stringify(o)); }

/* ---------- 1. Drivers & Fleet: a real department in the hiring ladder ---------- */
var DRIVER_RUNGS = [
  { key:"v428_day",   label:"Day Cab / Regional Driver", salaryRange:[4500,5100], icon:"\u{1F69B}",
    desc:"Runs short regional lanes and gets home nightly." },
  { key:"v428_dry",   label:"Dry Van Driver", salaryRange:[4900,5500], icon:"\u{1F4E6}",
    desc:"Your bread-and-butter over-the-road seat." },
  { key:"v428_reefer",label:"Reefer Driver", salaryRange:[5400,6100], icon:"\u{1F9CA}",
    desc:"Runs temperature-controlled freight at premium rates." },
  { key:"v428_flat",  label:"Flatbed Driver", salaryRange:[5500,6300], icon:"\u{1F517}",
    desc:"Hauls steel and building materials. Securement pays." },
  { key:"v428_trainer",label:"Lead Driver / Trainer", salaryRange:[6800,7600], icon:"\u{1F393}",
    under:"v428_dry", per:6, desc:"Coaches the seats below \u2014 +5% freight revenue each, cap +10%." },
  { key:"v428_safety",label:"Safety & Compliance Manager", salaryRange:[8200,9200], icon:"\u{1F6E1}\uFE0F",
    under:"v428_trainer", per:4, desc:"Cuts maintenance and claims costs. Keeps your authority clean." },
  { key:"v428_dirfleet",label:"Director of Fleet Operations", salaryRange:[12000,14000], icon:"\u{1F454}",
    under:"v428_safety", per:3, desc:"Better dispatch \u2014 company-wide freight revenue boost." }
];
var SALES_SPECIALISTS = [
  { key:"v428_reefer_rep", label:"Reefer Freight Rep",  salaryRange:[5200,5900], icon:"\u{1F9CA}",
    desc:"Sources temperature-controlled contracts." },
  { key:"v428_flat_rep",   label:"Flatbed Freight Rep", salaryRange:[5000,5700], icon:"\u{1F517}",
    desc:"Sources steel, lumber and machinery lanes." },
  { key:"v428_ded_rep",    label:"Dedicated Lanes Rep", salaryRange:[5600,6400], icon:"\u{1F4CD}",
    desc:"Lands recurring dedicated contracts \u2014 the steadiest freight there is." }
];
var SALES_EQUIP = { rep:["dryvan"], v428_reefer_rep:["reefer"], v428_flat_rep:["flatbed"], v428_ded_rep:["daycab","dryvan"] };
var SEATABLE = { v428_day:"daycab", v428_dry:"dryvan", v428_reefer:"reefer", v428_flat:"flatbed", v428_trainer:"dryvan" };
var REP_TYPE = { reefer:"reefer", flatbed:"flatbed", daycab:"dedicated", dryvan:"dry" };

T("ladder", function(){
  if(typeof LADDERS === "undefined" || !LADDERS || !LADDERS.sales) return;

  if(!LADDERS.drivers){
    LADDERS.drivers = { label:"Drivers & Fleet", icon:"\u{1F69B}", rungs: clone(DRIVER_RUNGS) };
  }
  if(typeof BASE_LADDERS !== "undefined" && BASE_LADDERS && !BASE_LADDERS.drivers){
    BASE_LADDERS.drivers = { label:"Drivers & Fleet", icon:"\u{1F69B}", rungs: clone(DRIVER_RUNGS) };
  }
  if(typeof DEPT_KEYS !== "undefined" && DEPT_KEYS && DEPT_KEYS.indexOf("drivers") < 0){
    var at = DEPT_KEYS.indexOf("operations");
    DEPT_KEYS.splice(at < 0 ? DEPT_KEYS.length : at, 0, "drivers");
  }
  if(typeof ORDER_OPTIONS !== "undefined" && ORDER_OPTIONS && !ORDER_OPTIONS.drivers){
    ORDER_OPTIONS.drivers = [
      { key:"miles",  label:"Run More Miles" },
      { key:"safety", label:"Safety First" },
      { key:"retain", label:"Keep the Drivers" }
    ];
  }

  /* applyIndustryLabels() indexes BASE_LADDERS and INDUSTRIES[*].roles positionally,
     so any splice into LADDERS.sales must be mirrored into both. */
  var rungs = LADDERS.sales.rungs;
  if(!rungs.some(function(r){ return r.key === "v428_reefer_rep"; })){
    Array.prototype.push.apply(rungs, clone(SALES_SPECIALISTS));
    if(typeof BASE_LADDERS !== "undefined" && BASE_LADDERS && BASE_LADDERS.sales){
      Array.prototype.push.apply(BASE_LADDERS.sales.rungs, clone(SALES_SPECIALISTS));
    }
  }

  if(typeof INDUSTRIES !== "undefined" && INDUSTRIES && INDUSTRIES.trucking){
    INDUSTRIES.trucking.deptLabels = INDUSTRIES.trucking.deptLabels || {};
    INDUSTRIES.trucking.deptLabels.drivers = "Drivers & Fleet";
    INDUSTRIES.trucking.deptLabels.sales = INDUSTRIES.trucking.deptLabels.sales || "Freight Sales";
  }
});

T("labelwrap", function(){
  if(typeof window.applyIndustryLabels !== "function") return;
  window.applyIndustryLabels = function(){
    try{
      var cfg = (typeof industry === "function") ? industry() : null;
      DEPT_KEYS.forEach(function(dk){
        var L = LADDERS[dk], B = (typeof BASE_LADDERS !== "undefined" && BASE_LADDERS[dk]) || null;
        if(!L) return;
        L.label = (cfg && cfg.deptLabels && cfg.deptLabels[dk]) || (B && B.label) || L.label;
        (L.rungs || []).forEach(function(r, i){
          var names = cfg && cfg.roles && cfg.roles[dk];
          var base = B && B.rungs && B.rungs[i];
          r.label = (names && names[i]) || (base && base.label) || r.label;
        });
      });
    }catch(e){ ERR.push("labels: " + (e && e.message)); }
  };
  window.applyIndustryLabels();
});

/* ---------- 2. Hired drivers/reps show up in the fleet ledger ---------- */
function salesEquipFor(rungKey){ return SALES_EQUIP[rungKey] || SALES_EQUIP.rep; }

function sync(){
  var c = C(), st = S();
  if(!c || !st) return;
  c.employees = c.employees || [];
  st.drivers = st.drivers || [];
  st.reps = st.reps || [];
  st.trucks = st.trucks || [];

  c.employees.forEach(function(e){
    if(e.dept === "drivers" && SEATABLE[e.rung]){
      if(!st.drivers.some(function(d){ return d.empId === e.id; })){
        st.drivers.push({ id:"d" + e.id, empId:e.id, name:e.name, type:SEATABLE[e.rung],
          truckId:null, pay:0, __v428loads:0, __v428miles:0, __v428gross:0 });
      }
    }
    if(e.dept === "sales"){
      if(!st.reps.some(function(r){ return r.empId === e.id; })){
        var eq = salesEquipFor(e.rung);
        st.reps.push({ id:"r" + e.id, empId:e.id, name:e.name,
          type: REP_TYPE[eq[0]] || "dry", equip:eq, pay:0, __v428booked:0 });
      }
    }
  });

  var live = {};
  c.employees.forEach(function(e){ live[e.id] = true; });
  st.drivers = st.drivers.filter(function(d){ return !d.empId || live[d.empId]; });
  st.reps = st.reps.filter(function(r){ return !r.empId || live[r.empId]; });

  st.trucks.forEach(function(t){
    if(t.driverId && st.drivers.some(function(d){ return d.id === t.driverId; })) return;
    var taken = {};
    st.trucks.forEach(function(x){ if(x.driverId) taken[x.driverId] = true; });
    var free = st.drivers.filter(function(d){ return !taken[d.id]; });
    var match = null;
    for(var i = 0; i < free.length; i++){ if(free[i].type === t.type){ match = free[i]; break; } }
    if(!match) match = free[0];
    t.driverId = match ? match.id : null;
  });
}

/* ---------- 3. Freight sales actually source contracts ---------- */
var SHIPPERS = ["Cargill","Tyson Foods","Home Depot","PepsiCo","Dollar General",
  "US Steel","Kroger","Nucor","Sysco","Lowe's"];
var COMMODITY = { dryvan:"palletized goods", reefer:"temperature-controlled freight",
  flatbed:"steel and building materials", daycab:"regional dedicated runs" };
var BASE_RATE = { dryvan:2.75, reefer:3.35, flatbed:3.10, daycab:2.90 };

function repYield(e){
  var idx = { rep:1, v428_reefer_rep:1.1, v428_flat_rep:1.05, v428_ded_rep:1.15,
    coordinator:1.25, teamlead:1.5, manager:1.8, director:2.1, vp:2.3, cro:2.5 };
  return idx[e.rung] || 1;
}

function sourceOffers(){
  var c = C(), st = S();
  if(!c || !st || !isTruck()) return 0;
  st.offers = st.offers || [];
  var reps = (c.employees || []).filter(function(e){ return e.dept === "sales"; });
  if(!reps.length) return 0;
  var made = 0;
  reps.forEach(function(e){
    var y = repYield(e);
    var morale = num(e.morale) || 70;
    var chance = Math.min(0.9, 0.45 * y * (morale / 70));
    if(Math.random() > chance) return;
    var eq = salesEquipFor(e.rung);
    var equip = eq[Math.floor(Math.random() * eq.length)];
    var loads = ri(6, 14);
    var miles = ri(400, 1400);
    var rate = +(BASE_RATE[equip] * (0.92 + Math.random() * 0.22)).toFixed(2);
    st.offers.push({
      id: "o428_" + Date.now() + "_" + ri(100, 999),
      shipper: SHIPPERS[Math.floor(Math.random() * SHIPPERS.length)],
      equip: equip,
      commodity: COMMODITY[equip] || "general freight",
      loads: loads, miles: miles, rate: rate,
      term: ri(3, 12),
      trucksNeeded: Math.max(1, Math.round(loads / 6)),
      by: e.name, life: 2
    });
    e.__v428booked = num(e.__v428booked) + 1;
    made++;
  });
  if(made > 0 && typeof logHistory === "function"){
    T("log", function(){
      logHistory("\u{1F4DE} Your freight sales desk sourced " + made +
        " new contract offer(s). Review them in Industry Ops.");
    });
  }
  return made;
}

/* ---------- 4. Department effects: the ladder has to be worth climbing ---------- */
function countRung(key){
  var c = C();
  return c ? (c.employees || []).filter(function(e){ return e.rung === key; }).length : 0;
}
var LIFTS = {};
function computeLifts(){
  LIFTS = {
    dispatch: Math.min(0.12, 0.015 * countRung("v428_dirfleet") + 0.015 * countRung("v428_safety")),
    maint:    Math.min(0.40, 0.06 * countRung("v428_safety")),
    trainer:  Math.min(0.10, 0.05 * countRung("v428_trainer"))
  };
  return LIFTS;
}

T("month", function(){
  if(typeof window.advanceMonth !== "function") return;
  var prev = window.advanceMonth;
  window.advanceMonth = function(){
    var c = C();
    var cashBefore = c ? num(c.cash) : 0;
    T("pre", function(){ if(isTruck()) sync(); });
    var out = prev.apply(this, arguments);
    T("post", function(){
      var cc = C(), st = S();
      if(!cc || !st || !isTruck()) return;
      computeLifts();
      var gross = num(st.lastGross);
      if(gross > 0){
        var lift = LIFTS.dispatch + LIFTS.trainer;
        if(lift > 0){
          var bonus = Math.round(gross * lift);
          st.lastGross = gross + bonus;
          if(isFinite(cc.cash)) cc.cash = num(cc.cash) + bonus;
        }
      }
      if(LIFTS.maint > 0 && num(st.lastCosts) > 0){
        var saved = Math.round(num(st.lastCosts) * LIFTS.maint * 0.25);
        st.lastCosts = Math.max(0, num(st.lastCosts) - saved);
        if(isFinite(cc.cash)) cc.cash = num(cc.cash) + saved;
      }
      st.lastNet = num(st.lastGross) - num(st.lastCosts);
      if(!isFinite(cc.cash)) cc.cash = cashBefore;
      sourceOffers();
      sync();
    });
    return out;
  };
});

/* ---------- 5. Staff stop evaporating: capped, visible attrition ---------- */
T("attrition", function(){
  if(typeof window.advanceMonth !== "function") return;
  var prev = window.advanceMonth;
  window.advanceMonth = function(){
    var c = C();
    var before = (c && c.employees) ? c.employees.slice() : null;
    var out = prev.apply(this, arguments);
    var check = function(){
      var cc = C();
      if(!cc || !before) return;
      var now = cc.employees || [];
      var liveIds = {};
      now.forEach(function(e){ liveIds[e.id] = true; });
      // v4.29d: this cap exists to stop unexplained resignations, but it was also
      // reversing DELIBERATE departures — board-forced layoffs from the solvency
      // ladder and rival poaching — which made the middle rung of the insolvency
      // ladder a no-op. Departures the game announced on purpose are exempt.
      var __intentional = window.__v492exits || {};
      var gone = before.filter(function(e){ return !liveIds[e.id] && !__intentional[e.id]; });
      if(!gone.length){ before = now.slice(); return; }
      var allowed = before.length <= 4 ? 0 : Math.max(1, Math.floor(before.length * 0.08));
      if(gone.length > allowed){
        var give = gone.slice(allowed);
        give.forEach(function(e){ now.push(e); });
        cc.employees = now;
        cc.__v428kepts = num(cc.__v428kepts) + give.length;
        if(typeof logHistory === "function"){
          T("attr-log", function(){
            logHistory("\u{1F6E1}\uFE0F Staff turnover was capped this month \u2014 " + give.length +
              " resignation(s) reversed. Keep morale up or they will not stay.");
          });
        }
        gone = gone.slice(0, allowed);
      }
      if(gone.length && typeof logHistory === "function"){
        T("attr-log2", function(){
          gone.forEach(function(e){
            logHistory("\u{1F6AA} " + e.name + " (" + (e.role || e.rung) + ") resigned at month close.");
          });
        });
      }
    };
    T("attr-post", check);
    setTimeout(function(){ T("attr-late", check); }, 900);
    setTimeout(function(){ T("attr-late2", check); }, 1800);
    return out;
  };
});


/* ---------- 6. Trucking-only: no dead departments on other business types ---------- */
T("gate", function(){
  if(typeof window.renderHR !== "function") return;
  var prev = window.renderHR;
  window.renderHR = function(){
    if(isTruck()) return prev.apply(this, arguments);
    var di = (typeof DEPT_KEYS !== "undefined") ? DEPT_KEYS.indexOf("drivers") : -1;
    var pulledDept = false, pulledRungs = [];
    try{
      if(di >= 0){ DEPT_KEYS.splice(di, 1); pulledDept = true; }
      if(typeof LADDERS !== "undefined" && LADDERS.sales){
        var r = LADDERS.sales.rungs;
        for(var i = r.length - 1; i >= 0; i--){
          if(/^v428_/.test(r[i].key)){ pulledRungs.unshift([i, r[i]]); r.splice(i, 1); }
        }
      }
      return prev.apply(this, arguments);
    } finally {
      if(pulledDept && di >= 0) DEPT_KEYS.splice(di, 0, "drivers");
      if(pulledRungs.length && LADDERS.sales){
        pulledRungs.forEach(function(pair){ LADDERS.sales.rungs.splice(pair[0], 0, pair[1]); });
      }
    }
  };
});

setInterval(function(){ T("sync", function(){ if(isTruck()) sync(); }); }, 1000);

window.__v428p2api = { sync:sync, sourceOffers:sourceOffers, lifts:computeLifts,
  errs:function(){ return ERR; } };
})();
/* ============ NAVigating Business v4.28d — Phase C ============
   Bank hiring fix · hiring pipeline removed · founder options unified with no
   points · notification archive · event list collapsed · contribution tiers. */
(function(){
  if(window.__v428c) return;
  window.__v428c = true;
  var ERR = [];
  function T(tag, fn){ try{ fn(); }catch(e){ ERR.push(tag+": "+((e&&e.message)||e)); } }
  function C(){ try{ return (typeof G!=="undefined" && G && G.company) ? G.company : null; }catch(e){ return null; } }
  function num(v,d){ v = Number(v); return isFinite(v) ? v : (d||0); }
  function log(t){ try{ if(typeof logHistory==="function") logHistory(t); }catch(e){} }
  function money(v){ try{ return fmt$(v); }catch(e){ return "$"+Math.round(num(v)).toLocaleString(); } }
  function stamp(){ var c=C(); return c ? (c.year+"-"+c.month) : "0-0"; }

  /* ---------- 1. BANK HIRE FIX ----------
     applyIndustryLabels() reads BASE_LADDERS[dk].rungs[i].label positionally.
     BASE_LADDERS was snapshotted before later patches appended rungs to
     LADDERS, so any rung past the snapshot threw and killed the HR render. */
  function padBase(){
    if(typeof LADDERS==="undefined" || typeof BASE_LADDERS==="undefined") return;
    Object.keys(LADDERS).forEach(function(dk){
      var live = LADDERS[dk]; if(!live || !live.rungs) return;
      if(!BASE_LADDERS[dk]) BASE_LADDERS[dk] = { label: live.label, rungs: [] };
      var base = BASE_LADDERS[dk];
      if(!base.rungs) base.rungs = [];
      for(var i=0;i<live.rungs.length;i++){
        var lr = live.rungs[i];
        if(!base.rungs[i]) base.rungs[i] = { key: lr.key, label: lr.label };
        else if(!base.rungs[i].label) base.rungs[i].label = lr.label || lr.key;
      }
    });
  }
  T("padbase", padBase);
  T("labelwrap", function(){
    if(typeof window.applyIndustryLabels !== "function" || window.applyIndustryLabels.__v428c) return;
    var raw = window.applyIndustryLabels;
    var w = function(){ try{ padBase(); }catch(e){} return raw.apply(this, arguments); };
    w.__v428c = true;
    window.applyIndustryLabels = w;
  });

  /* ---------- 2. FOUNDER OPTIONS: ONE SECTION, NO POINTS ---------- */
  function foundUsed(key){ var c=C(); if(!c) return false; return (c.__v428once||{})[key] === stamp(); }
  function foundMark(key){ var c=C(); if(!c) return; if(!c.__v428once) c.__v428once = {}; c.__v428once[key] = stamp(); }
  T("nopoints", function(){
    if(typeof window.runFounderAction !== "function" || window.runFounderAction.__v428c) return;
    var raw = window.runFounderAction;
    var w = function(key){
      var c = C();
      if(c && foundUsed(key)) return;
      if(c) c.founderActionsUsed = 0;
      var out;
      try{ out = raw.apply(this, arguments); }
      finally{ if(c){ c.founderActionsUsed = 0; foundMark(key); } }
      return out;
    };
    w.__v428c = true;
    window.runFounderAction = w;
  });
  T("nopoints-power", function(){
    if(typeof window.v43RunPower !== "function" || window.v43RunPower.__v428c) return;
    var raw = window.v43RunPower;
    var w = function(key){
      var c = C(); if(c) c.founderActionsUsed = 0;
      var out = raw.apply(this, arguments);
      if(c) c.founderActionsUsed = 0;
      return out;
    };
    w.__v428c = true;
    window.v43RunPower = w;
  });

  /* ---------- 3. NOTIFICATION ARCHIVE ---------- */
  function inbox(){
    var c = C(); if(!c) return [];
    if(!Array.isArray(c.__v428inbox)) c.__v428inbox = [];
    return c.__v428inbox;
  }
  T("toastwrap", function(){
    if(typeof window.toast !== "function" || window.toast.__v428c) return;
    var raw = window.toast;
    var w = function(msg, kind){
      try{
        var c = C();
        if(c && msg){
          var box = inbox();
          box.unshift({ y:c.year, m:c.month, kind:kind||"", text:String(msg), at:Date.now() });
          if(box.length > 300) box.length = 300;
        }
      }catch(e){}
      return raw.apply(this, arguments);
    };
    w.__v428c = true;
    window.toast = w;
  });

  /* ---------- 4. CONTRIBUTION TIERS + REPUTATION ---------- */
  var TIERS = [1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000];
  function repFor(amount){
    var a = Math.max(0, num(amount));
    if(a < 1000) return 0;
    return Math.max(1, Math.round(Math.log(a/1000)/Math.log(10) * 4) + 1);
  }
  function giveNow(cause, amount){
    var c = C(); if(!c) return;
    amount = num(amount);
    if(num(c.cash) < amount){
      try{ window.toast("Not enough cash for a "+money(amount)+" gift.", "bad"); }catch(e){}
      return;
    }
    c.cash = num(c.cash) - amount;
    if(!c.charity) c.charity = { totalContributed:0, causes:{}, scope:"Local" };
    if(!c.charity.causes) c.charity.causes = {};
    c.charity.totalContributed = num(c.charity.totalContributed) + amount;
    c.charity.causes[cause] = num(c.charity.causes[cause]) + amount;
    var rep = repFor(amount);
    c.charity.reputation = num(c.charity.reputation) + rep;
    try{ c.successScore = clamp(num(c.successScore,50) + rep, 0, 100); }
    catch(e){ c.successScore = Math.min(100, num(c.successScore,50) + rep); }
    try{ (c.employees||[]).forEach(function(e){ e.morale = Math.min(100, num(e.morale,70) + Math.min(6, rep)); }); }catch(e){}
    var line = "\u2764\uFE0F The " + ((typeof G!=="undefined" && G.meta && G.meta.name) || "Foundation")
      + " gave " + money(amount) + " to " + cause + " \u2014 reputation +" + rep + ".";
    log(line);
    try{ window.toast(line, "good"); }catch(e){}
    try{ renderScreen(); }catch(e){}
  }
  window.__v428give = giveNow;

  /* ---------- 5. DOM PASSES ---------- */
  function stripPipeline(root){
    Array.prototype.forEach.call(root.querySelectorAll("h3"), function(h){
      if(/Hiring pipeline/i.test(h.textContent||"")){
        var card = h.closest(".card") || h.parentElement;
        if(card && card.parentElement) card.parentElement.removeChild(card);
      }
    });
  }

  function mergeFounder(root){
    var cards = Array.prototype.slice.call(root.querySelectorAll(".card"));
    var host = null, power = null;
    cards.forEach(function(cd){
      var h = cd.querySelector("h3"); if(!h) return;
      var t = h.textContent || "";
      if(/Founder Hustle/i.test(t)) host = cd;
      else if(/Power Plays/i.test(t)) power = cd;
    });
    if(host){
      var h3 = host.querySelector("h3");
      if(h3){
        var sp = h3.querySelector(".muted");
        if(sp) sp.textContent = "\u2014 each action once per month, no points, no cost";
        else h3.innerHTML = h3.innerHTML.replace(/[0-9]+\s*\/\s*[0-9]+\s*left this month/i, "once per month each");
      }
      var blurb = host.querySelector(".muted.mb8");
      if(blurb && !blurb.__v428){
        blurb.__v428 = true;
        blurb.innerHTML = "Things you can personally do with no staff and no budget. "
          + "Each one can be used <b>once per month</b> \u2014 no shared pool of points, and none of them cost cash. "
          + "This is how a founder makes money before they can afford to hire someone to do it for them.";
      }
    }
    if(power && host){
      var row = host.querySelector(".flexrow");
      var btns = Array.prototype.slice.call(power.querySelectorAll("[data-v43hustle]"));
      if(row && btns.length) btns.forEach(function(b){ row.appendChild(b); });
      if(power.parentElement) power.parentElement.removeChild(power);
    }
    if(host){
      Array.prototype.forEach.call(host.querySelectorAll("[data-founder]"), function(b){
        var k = b.getAttribute("data-founder");
        if(foundUsed(k)){
          b.disabled = true;
          if(!/used this month/.test(b.textContent)) b.textContent = b.textContent + " \u2014 used this month";
        } else b.disabled = false;
      });
    }
  }

  function collapseEvents(root){
    var groups = [];
    Array.prototype.forEach.call(root.querySelectorAll(".logrow"), function(r){
      var p = r.parentElement;
      if(p && groups.indexOf(p) < 0) groups.push(p);
    });
    groups.forEach(function(p){
      var rows = Array.prototype.filter.call(p.children, function(ch){
        return ch.classList && ch.classList.contains("logrow");
      });
      if(rows.length <= 8 || p.__v428open) return;
      rows.forEach(function(r,i){ r.style.display = i < 8 ? "" : "none"; });
      if(p.querySelector("[data-v428more]")) return;
      var b = document.createElement("button");
      b.className = "btn secondary small";
      b.setAttribute("data-v428more","1");
      b.style.marginTop = "8px";
      b.textContent = "Show all " + rows.length + " events";
      b.onclick = function(){
        p.__v428open = true;
        rows.forEach(function(r){ r.style.display = ""; });
        if(b.parentElement) b.parentElement.removeChild(b);
      };
      p.appendChild(b);
    });
  }

  function inboxCard(root){
    if(root.querySelector("[data-v428inbox]")) return;
    var heads = Array.prototype.slice.call(root.querySelectorAll("h3"));
    var onLog = heads.some(function(h){ return /History|Event Log|Activity/i.test(h.textContent||""); });
    if(!onLog) return;
    var box = inbox();
    var wrap = document.createElement("div");
    wrap.className = "card mt14";
    wrap.setAttribute("data-v428inbox","1");
    var rows = box.slice(0, 40).map(function(n){
      return '<div class="logrow"><span class="when">Y'+n.y+' M'+n.m+'</span><span>'+n.text+'</span></div>';
    }).join("");
    wrap.innerHTML = '<h3>\u{1F514} Notifications <span class="muted" style="font-size:12px;font-weight:400;">\u2014 every pop-up is saved here</span></h3>'
      + '<div class="muted mb8" style="font-size:12px;">The last '+box.length+' notification(s). Pop-ups vanish after a few seconds \u2014 this is the permanent copy.</div>'
      + (rows || '<div class="muted">No notifications yet.</div>');
    var first = root.querySelector(".card");
    if(first && first.parentElement) first.parentElement.insertBefore(wrap, first);
    else root.appendChild(wrap);
  }

  function charityTiers(root){
    Array.prototype.forEach.call(root.querySelectorAll(".ladder-card .title"), function(t){
      if(!/Total Contributed/i.test(t.textContent||"")) return;
      var card = t.closest(".ladder-card"); if(!card || card.__v428tiers) return;
      card.__v428tiers = true;
      var c = C(); if(!c) return;
      var rep = num(c.charity && c.charity.reputation);
      var cash = num(c.cash);
      Array.prototype.forEach.call(card.querySelectorAll("[data-charity-give]"), function(b){
        var cause = b.getAttribute("data-charity-give");
        var holder = b.parentElement;
        if(holder) holder.removeChild(b);
        var opts = TIERS.filter(function(a, i){ return i === 0 || a <= Math.max(cash, 1000) * 10; });
        var frag = document.createElement("span");
        frag.className = "flexrow";
        frag.style.gap = "4px";
        frag.style.flexWrap = "wrap";
        frag.innerHTML = opts.map(function(a){
          return '<button class="btn secondary small" data-v428tier="'+cause+':'+a+'"'
            + (cash < a ? ' disabled' : '')
            + ' title="Reputation +'+repFor(a)+'">'+money(a)+' \u00b7 +'+repFor(a)+' rep</button>';
        }).join("");
        if(holder) holder.appendChild(frag);
      });
      var note = document.createElement("div");
      note.className = "desc mt8";
      note.innerHTML = "Giving scales with the empire \u2014 tiers unlock as your cash grows, all the way to a billion. "
        + "Bigger gifts move reputation harder. <b>Foundation reputation earned: +" + rep + "</b>.";
      card.appendChild(note);
    });
  }

  function paint(){
    var root = document.body || document.getElementById("screen");
    if(!root) return;
    T("strip", function(){ stripPipeline(root); });
    T("founder", function(){ mergeFounder(root); });
    T("charity", function(){ charityTiers(root); });
    T("inbox", function(){ inboxCard(root); });
    T("events", function(){ collapseEvents(root); });
  }
  window.__v428paintC = paint;

  document.addEventListener("click", function(ev){
    var t = ev.target && ev.target.closest && ev.target.closest("[data-v428tier]");
    if(!t || t.disabled) return;
    ev.preventDefault();
    ev.stopPropagation();
    var parts = (t.getAttribute("data-v428tier")||"").split(":");
    giveNow(parts[0], Number(parts[1]));
  }, true);

  T("renderwrap", function(){
    if(typeof window.renderScreen !== "function" || window.renderScreen.__v428c) return;
    var raw = window.renderScreen;
    var w = function(){
      var out = raw.apply(this, arguments);
      try{ paint(); }catch(e){ ERR.push("paint: "+((e&&e.message)||e)); }
      return out;
    };
    w.__v428c = true;
    window.renderScreen = w;
  });

  setInterval(function(){
    T("keepalive", function(){
      padBase();
      var c = C();
      if(c && num(c.founderActionsUsed) > 0) c.founderActionsUsed = 0;
      paint();
    });
  }, 1200);

  window.__v428capi = { padBase: padBase, paint: paint, give: giveNow, repFor: repFor, inbox: inbox, errs: ERR };
})();
(function v428e(){
  if(window.__v428e) return; window.__v428e = true;
  var ERR = [];
  function err(w,e){ if(ERR.length<80) ERR.push(w+": "+((e&&e.message)||e)); }
  var PEOPLE_TABS = ["team","hr","csuite","orgchart","culture","comp","slack","zoom"];
  function tabNow(){ try{ return (G.ui && G.ui.activeTab) || ""; }catch(e){ return ""; } }

  /* ---- 1. new dock items ---- */
  try{
    var need = [
      {id:"culture", icon:"\u{1F389}", label:"Culture"},
      {id:"comp",    icon:"\u{1F4B5}", label:"Compensation"},
      {id:"board",   icon:"\u{1F3DB}\uFE0F", label:"Board"}
    ];
    for(var i=0;i<need.length;i++){
      var n = need[i], have = false;
      for(var j=0;j<DOCK_ITEMS.length;j++){ if(DOCK_ITEMS[j].id===n.id){ have = true; DOCK_ITEMS[j].icon=n.icon; DOCK_ITEMS[j].label=n.label; } }
      if(!have) DOCK_ITEMS.push(n);
    }
  }catch(e){ err("dockitems", e); }

  /* ---- 2. People sub-tabs: +culture +comp, -board ---- */
  var WANT = ["team","hr","csuite","orgchart","culture","comp","slack","zoom"];
  function fixSubs(){
    try{
      var A = V22_PEOPLE_SUBS;
      var b = A.indexOf("board"); if(b>=0) A.splice(b,1);
      if(A.indexOf("culture")<0) A.push("culture");
      if(A.indexOf("comp")<0) A.push("comp");
      A.sort(function(x,y){
        var ix = WANT.indexOf(x), iy = WANT.indexOf(y);
        return (ix<0?99:ix) - (iy<0?99:iy);
      });
    }catch(e){ err("subs", e); }
  }
  fixSubs();

  /* ---- 3. Board of Directors moves to My Empire ---- */
  function fixGroups(){
    try{
      var life = null;
      for(var i=0;i<DOCK_GROUPS.length;i++){
        var g = DOCK_GROUPS[i];
        if(g.items.indexOf("empire")>=0) life = g;
      }
      for(var k=0;k<DOCK_GROUPS.length;k++){
        var gg = DOCK_GROUPS[k];
        if(gg === life) continue;
        var bi = gg.items.indexOf("board");
        if(bi>=0) gg.items.splice(bi,1);
      }
      if(life && life.items.indexOf("board")<0){
        life.items.splice(life.items.indexOf("empire")+1, 0, "board");
      }
    }catch(e){ err("groups", e); }
  }
  fixGroups();

  /* ---- 4. harvesting live, already-wired DOM out of HR / Decisions ---- */
  function harvestHR(){
    var out = { benefits:null, board:null };
    try{
      var wrap = renderHR();
      var secs = wrap.querySelectorAll(".dept-section");
      for(var i=0;i<secs.length;i++){
        if(secs[i].querySelector("#deptbody_benefits")) out.benefits = secs[i];
      }
      var cards = wrap.querySelectorAll(".card");
      for(var j=0;j<cards.length;j++){
        var h = cards[j].querySelector("h3");
        if(h && /Board of Directors/i.test(h.textContent||"")) out.board = cards[j];
      }
      if(out.benefits){
        var bb = out.benefits.querySelector("#deptbody_benefits");
        if(bb) bb.classList.add("open");
      }
    }catch(e){ err("harvestHR", e); }
    return out;
  }

  function harvestCulture(){
    var node = null;
    try{
      var prev = G.ui.decisionFolder;
      G.ui.decisionFolder = "culture";
      var wrap = renderDecisions();
      G.ui.decisionFolder = prev;
      var body = wrap.querySelector("#deptbody_culture");
      if(body){
        body.classList.add("open");
        node = body.closest(".dept-section") || body.parentNode;
      }
    }catch(e){ err("harvestCulture", e); }
    return node;
  }

  function div(cls, html){
    var d = document.createElement("div");
    if(cls) d.className = cls;
    if(html) d.innerHTML = html;
    return d;
  }

  /* ---- 5. the three new screens ---- */
  function screenCulture(){
    var root = div("", '<div class="window-title"><h2>\u{1F389} Culture &amp; Morale</h2>'
      + '<span class="sub">Team events, morale, and engagement programs</span></div>');
    var n = harvestCulture();
    if(n) root.appendChild(n);
    try{ if(window.__v426CultureCard){ var cc = window.__v426CultureCard(); if(cc) root.appendChild(cc); } }catch(e){ err("cultureCard", e); }
    if(!root.querySelector(".dept-section") && !root.querySelector(".card")){
      root.appendChild(div("card muted", "Nothing to run yet \u2014 hire someone first."));
    }
    addQueue(root, "commitBtnCulture");
    return root;
  }

  function screenComp(){
    var root = div("", '<div class="window-title"><h2>\u{1F4B5} Compensation &amp; Benefits</h2>'
      + '<span class="sub">Benefit tiers, perks, and pay pressure</span></div>');
    var h = harvestHR();
    if(h.benefits) root.appendChild(h.benefits);
    try{
      var cards = window.__v426Cards || {};
      if(cards.comp){ var cc = cards.comp(); if(cc) root.appendChild(cc); }
    }catch(e){ err("compCard", e); }
    if(!root.querySelector(".dept-section") && !root.querySelector(".card")){
      root.appendChild(div("card muted", "Benefit tiers unlock once you have an HR department."));
    }
    addQueue(root, "commitBtnComp");
    return root;
  }

  function screenBoard(){
    var root = div("", '<div class="window-title"><h2>\u{1F3DB}\uFE0F Board of Directors</h2>'
      + '<span class="sub">Advisors, not employees \u2014 no headcount cap applies</span></div>');
    var h = harvestHR();
    if(h.board){
      /* v4.29d: the harvested card carries its own "Board of Directors" heading,
         which duplicates the window title on this screen. Drop the inner one. */
      try{
        var hs = h.board.querySelectorAll("h1,h2,h3,h4");
        for(var bi=0; bi<hs.length; bi++){
          if(/Board of Directors/i.test(hs[bi].textContent||"")){
            if(hs[bi].parentNode) hs[bi].parentNode.removeChild(hs[bi]);
            break;
          }
        }
      }catch(e){ err("boardDedupe", e); }
      root.appendChild(h.board);
    }
    if(!root.querySelector(".card")){
      root.appendChild(div("card muted", "No board seats available yet."));
    }
    addQueue(root, "commitBtnBoard");
    return root;
  }

  /* queue panel so anything queued from the new screens can be reviewed + committed */
  function addQueue(root, id){
    try{
      if(typeof renderQueuePanel !== "function") return;
      var holder = div("", renderQueuePanel(id));
      while(holder.firstChild) root.appendChild(holder.firstChild);
      var rm = root.querySelectorAll("[data-qremove]");
      for(var i=0;i<rm.length;i++){
        (function(btn){
          btn.onclick = function(){ queueRemove(btn.getAttribute("data-qremove")); renderScreen(); };
        })(rm[i]);
      }
      var commit = root.querySelector("#" + id);
      if(commit) commit.onclick = function(){ confirmAndAdvance(); };
    }catch(e){ err("queue:"+id, e); }
  }

  var SCREENS = { culture:screenCulture, comp:screenComp, board:screenBoard };

  /* ---- 6. route the new tabs ---- */
  (function(){
    var orig = window.renderScreen;
    if(typeof orig !== "function"){ err("route", {message:"renderScreen missing"}); return; }
    window.renderScreen = function(){
      var tab = tabNow();
      var r;
      try{ r = orig.apply(this, arguments); }catch(e){ err("origRender", e); }
      if(SCREENS[tab]){
        try{
          var sc = document.getElementById("screen");
          if(sc){
            var bar = sc.querySelector(".v21-subbar");
            while(sc.firstChild) sc.removeChild(sc.firstChild);
            if(bar) sc.appendChild(bar);
            var node = SCREENS[tab]();
            node.setAttribute("data-v428screen", tab);
            sc.appendChild(node);
            try{ if(typeof wireBucketButtons === "function") wireBucketButtons(sc); }catch(e2){ err("wire", e2); }
          }
        }catch(e3){ err("screen:"+tab, e3); }
      }
      try{ sweep(); }catch(e4){ err("sweepInline", e4); }
      return r;
    };
  })();

  /* ---- 7. strip the relocated sections back out of HR / People / Decisions ---- */
  function drop(node){ if(node && node.parentNode) node.parentNode.removeChild(node); }

  function killAll(root, sel, lift){
    var guard = 0;
    var n = root.querySelector(sel);
    while(n && guard++ < 40){
      var target = lift ? (n.closest(lift) || n) : n;
      drop(target);
      if(root.querySelector(sel) === n) break;
      n = root.querySelector(sel);
    }
  }

  var HR_DIVIDER = /Benefits|Board of Directors|Culture|Morale|Team Event|Compensation|Facilities|Workspace stage/i;
  var HR_CARD = /Board of Directors|Facilities|Workspace stage|Team Event/i;

  function stripHR(sc){
    var divs = sc.querySelectorAll(".section-divider");
    for(var i=0;i<divs.length;i++){
      var t = divs[i].textContent || "";
      if(!HR_DIVIDER.test(t)) continue;
      var nx = divs[i].nextElementSibling;
      drop(divs[i]);
      if(nx && (nx.className||"").indexOf("dept-section")>=0) drop(nx);
      else if(nx && (nx.className||"").indexOf("card")>=0) drop(nx);
    }
    killAll(sc, "#deptbody_benefits", ".dept-section");
    killAll(sc, "#deptbody_culture", ".dept-section");
    killAll(sc, "[data-v426comp]", null);
    killAll(sc, "[data-v426culture]", null);
    var cards = sc.querySelectorAll(".card");
    for(var j=0;j<cards.length;j++){
      var h3 = cards[j].querySelector("h3");
      if(h3 && HR_CARD.test(h3.textContent||"")) drop(cards[j]);
    }
    if(!sc.querySelector("[data-v428hrnote]")){
      var note = div("card muted mb8",
        "\u{1F9ED} Culture &amp; morale and Compensation &amp; benefits are now their own People tabs. "
        + "The Board of Directors moved to <b>My Empire</b>.");
      note.setAttribute("data-v428hrnote","1");
      sc.insertBefore(note, sc.firstChild);
    }
  }

  function sweep(){
    var sc = document.getElementById("screen"); if(!sc) return;
    var tab = tabNow();
    if(PEOPLE_TABS.indexOf(tab) >= 0){
      killAll(sc, "[data-v427start]", null);
      if(tab !== "culture") killAll(sc, "[data-v426culture]", null);
      if(tab !== "comp") killAll(sc, "[data-v426comp]", null);
      if(tab !== "culture") killAll(sc, "#deptbody_culture", ".dept-section");
    }
    if(tab === "hr") stripHR(sc);
    if(tab === "decisions"){
      killAll(sc, '[data-folder="culture"]', null);
      try{
        if(G.ui.decisionFolder === "culture"){
          G.ui.decisionFolder = "founder";
          if(!sweep.__bounce){ sweep.__bounce = true; renderScreen(); sweep.__bounce = false; }
        }
      }catch(e){ err("folderFix", e); }
    }
  }

  setInterval(sweep, 700);

  window.__v428eapi = {
    errs: function(){ return ERR.slice(); },
    subs: function(){ return V22_PEOPLE_SUBS.slice(); },
    groups: function(){ return DOCK_GROUPS.map(function(g){ return g.id+":"+g.items.join(","); }); },
    sweep: sweep,
    screens: SCREENS
  };
})();
(function v428f(){
  if(window.__v428f) return; window.__v428f = true;
  var stats = { rsCalls:0, rsRuns:0, rsDropped:0, rdCalls:0, rdRuns:0, rdDropped:0, nested:0, errors:0 };

  function coalesce(name, key){
    var orig = window[name];
    if(typeof orig !== "function") return false;
    var ranThisTask = false;
    var pending = false;
    var scheduled = false;
    var inside = false;
    var lastArgs = [];

    function run(){
      inside = true;
      stats[key+"Runs"]++;
      try{ return orig.apply(window, lastArgs); }
      catch(e){ stats.errors++; }
      finally{ inside = false; }
    }

    function flush(){
      scheduled = false;
      ranThisTask = false;
      if(pending){ pending = false; run(); }
    }

    window[name] = function(){
      stats[key+"Calls"]++;
      lastArgs = Array.prototype.slice.call(arguments);
      /* a render triggered from inside a render is always redundant — the
         outer pass has not finished writing the DOM yet */
      if(inside){ stats.nested++; return; }
      var out;
      if(!ranThisTask){
        ranThisTask = true;
        out = run();
      } else {
        pending = true;
        stats[key+"Dropped"]++;
      }
      if(!scheduled){
        scheduled = true;
        Promise.resolve().then(flush);
      }
      return out;
    };
    return true;
  }

  var okScreen = coalesce("renderScreen","rs");
  var okDock = coalesce("renderDock","rd");

  window.__v428fapi = {
    stats: function(){ return JSON.parse(JSON.stringify(stats)); },
    reset: function(){ for(var k in stats) stats[k] = 0; },
    wrapped: { renderScreen: okScreen, renderDock: okDock }
  };
})();
/* v4.28g - taxes visible in burn, quarterly heads-up, Finance tax subtab */
(function v428g(){
  "use strict";
  if(window.__v428g) return; window.__v428g = true;
  var errs = [];
  function err(w,e){ errs.push({ where:w, message:(e && e.message) || String(e) }); }
  function n(v,d){ var x = Number(v); return isFinite(x) ? x : (d || 0); }
  function money(v){ try{ return fmt$(Math.round(n(v))); }catch(e){ return "$" + Math.round(n(v)); } }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g, function(c){ return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]; }); }
  function C(){ try{ return G.company; }catch(e){ return null; } }
  function TS(){ try{ var s = G.__v425; return (s && s.tax) ? s.tax : null; }catch(e){ return null; } }

  /* same table the v4.25 tax engine uses */
  var ENTITIES = {
    sole:  { label:"Sole Proprietor", corp:0,    passthru:0.34, payroll:0.153,  setup:0,
             blurb:"No separation. All profit hits your personal return, and you pay the full self-employment tax." },
    llc:   { label:"LLC",             corp:0,    passthru:0.31, payroll:0.153,  setup:1500,
             blurb:"Liability protection, profit still passes through to you. Self-employment tax on the whole draw." },
    scorp: { label:"S-Corp",          corp:0,    passthru:0.29, payroll:0.0765, setup:4500,
             blurb:"Payroll tax only on the salary portion of your draw. Distributions avoid it. Needs real payroll discipline." },
    ccorp: { label:"C-Corp",          corp:0.21, passthru:0.24, payroll:0.0765, setup:9000,
             blurb:"21% corporate tax, then 20% again on dividends. The price of admission for institutional capital and an IPO." }
  };

  /* ---- 1. estimator: mirrors taxStep() arithmetic, mutates nothing ---- */
  function taxEstimate(){
    var out = { entity:"llc", label:"LLC", payroll:0, payrollTax:0, corp:0, personal:0, company:0, profit:0, draw:0 };
    try{
      var c = C(); if(!c) return out;
      var t = TS();
      var key = (t && t.entity) || "llc";
      var ent = ENTITIES[key] || ENTITIES.llc;
      out.entity = key; out.label = ent.label;
      var payroll = 0;
      try{ payroll = (c.employees||[]).reduce(function(a,x){ return a + n(x.salary,0); }, 0); }catch(e1){}
      out.payroll = payroll;
      out.payrollTax = Math.round(payroll * 0.0765);
      var profit = n(c.mrr,0) - n(c.expensesTotal, n(c.mrr,0) * 0.6);
      if(!isFinite(profit)) profit = 0;
      out.profit = profit;
      var draw = n(c.ownerDraw,0);
      out.draw = draw;
      if(ent.corp > 0 && profit > 0) out.corp = Math.round(profit * ent.corp);
      var base = ent.corp > 0 ? draw : Math.max(0, profit) + draw;
      if(base > 0){
        out.personal = key === "scorp"
          ? Math.round(Math.min(base, 176100/12) * 0.153 * 0.5 + base * ent.passthru)
          : Math.round(base * (ent.passthru + (ent.corp > 0 ? 0 : ent.payroll * 0.5)));
      }
      out.company = out.payrollTax + out.corp;
    }catch(e){ err("estimate", e); }
    return out;
  }

  /* ---- 2. when the next quarterly withdrawal lands ---- */
  var PAY_MONTHS = [1,4,7,10];
  function nextPay(){
    var res = { month:1, away:0 };
    try{
      var c = C(); var t = TS();
      var m = n(c && c.month, 1);
      var due = null, wrapped = false;
      for(var i=0;i<PAY_MONTHS.length;i++){ if(PAY_MONTHS[i] >= m){ due = PAY_MONTHS[i]; break; } }
      if(due === null){ due = 1; wrapped = true; }
      if(!wrapped && due === m){
        var q = Math.floor((m - 1) / 3);
        if(t && t.lastQuarter === q){
          var idx = PAY_MONTHS.indexOf(m);
          if(idx === PAY_MONTHS.length - 1){ due = 1; wrapped = true; }
          else due = PAY_MONTHS[idx + 1];
        }
      }
      res.month = due;
      res.away = wrapped ? (12 - m + due) : (due - m);
    }catch(e){ err("nextPay", e); }
    return res;
  }

  function dueAtNextPay(){
    var est = taxEstimate(), np = nextPay(), t = TS();
    var biz = (t ? n(t.accruedBiz,0) : 0) + np.away * est.corp;
    var per = (t ? n(t.accruedPersonal,0) : 0) + np.away * est.personal;
    return { biz:Math.round(biz), personal:Math.round(per), total:Math.round(biz + per), away:np.away, month:np.month };
  }

  /* ---- 3. taxes enter the burn number everyone reads ---- */
  (function(){
    var orig = window.v44Burn;
    if(typeof orig !== "function"){ err("wrapBurn", { message:"v44Burn missing" }); return; }
    window.v44Burn = function(){
      var base = 0;
      try{ base = Number(orig.apply(this, arguments)) || 0; }catch(e){ err("origBurn", e); }
      var t = 0;
      try{ t = taxEstimate().company; }catch(e2){ err("burnTax", e2); }
      return base + (isFinite(t) ? t : 0);
    };
  })();

  (function(){
    var orig = window.cashRunway;
    if(typeof orig !== "function") return;
    window.cashRunway = function(){
      try{
        var c = C();
        var exp = Object.keys(c.expensesBreakdown||{}).reduce(function(a,k){ return a + n(c.expensesBreakdown[k],0); }, 0) + taxEstimate().company;
        var rev = (typeof monthlyRevenue === "function") ? n(monthlyRevenue(c),0) : n(c.mrr,0);
        var burn = exp - rev;
        if(burn <= 0) return Infinity;
        return Math.max(0, Math.floor(n(c.cash,0) / burn));
      }catch(e){ err("runway", e); return orig.apply(this, arguments); }
    };
  })();

  /* ---- 4. forecast strip: a tax cell and a heads-up before the quarter ---- */
  (function(){
    var orig = window.v44StripNode;
    if(typeof orig !== "function"){ err("wrapStrip", { message:"v44StripNode missing" }); return; }
    window.v44StripNode = function(){
      var box = null;
      try{ box = orig.apply(this, arguments); }catch(e){ err("origStrip", e); }
      try{
        if(box && box.querySelector){
          var est = taxEstimate();
          var strip = box.querySelector(".v44-strip");
          if(strip && (est.company + est.personal) > 0){
            var cell = document.createElement("div");
            cell.className = "v44-cell";
            cell.setAttribute("data-v428gtax", "1");
            cell.innerHTML = '<div class="l">Taxes in burn</div><div class="v bad">' + money(est.company)
              + (est.personal > 0 ? ' <span class="muted" style="font-size:11px;font-weight:600;">\u00b7 ' + money(est.personal) + ' personal</span>' : '')
              + '</div>';
            strip.appendChild(cell);
            strip.style.gridTemplateColumns = "repeat(5,1fr)";
          }
          var due = dueAtNextPay();
          if(due.away <= 1 && due.total > 0){
            var b = document.createElement("div");
            b.className = "v44-banner";
            b.setAttribute("data-v428gdue", "1");
            b.style.borderColor = "var(--warn, #f59e0b)";
            b.style.background = "rgba(245,158,11,.08)";
            b.innerHTML = "<b>\u{1F9FE} Quarterly taxes " + (due.away === 0 ? "come out at this close." : "land next month.")
              + "</b> About " + money(due.total) + " \u2014 " + money(due.biz) + " from the company, " + money(due.personal)
              + " from your personal cash. Hold it or the shortfall accrues penalties.";
            box.insertBefore(b, box.firstChild);
          }
        }
      }catch(e3){ err("strip", e3); }
      return box;
    };
  })();

  /* ---- 5. one toast per month when the payment is imminent ---- */
  (function(){
    var orig = window.advanceMonth;
    if(typeof orig !== "function"){ err("wrapAdvance", { message:"advanceMonth missing" }); return; }
    window.advanceMonth = function(){
      var r = orig.apply(this, arguments);
      try{
        var c = C(); if(!c) return r;
        var due = dueAtNextPay();
        if(due.away <= 1 && due.total > 0){
          var key = n(c.year,1) + ":" + n(c.month,1);
          if(!c.__v428gnotice) c.__v428gnotice = {};
          if(!c.__v428gnotice[key]){
            c.__v428gnotice[key] = 1;
            if(typeof toast === "function"){
              toast("<b>\u{1F9FE} Quarterly taxes " + (due.away === 0 ? "are due at this close" : "land next month") + ".</b><br>"
                + "<span style=\"font-size:11px;opacity:.85;\">About " + money(due.total) + " \u00b7 " + money(due.biz)
                + " company, " + money(due.personal) + " personal.</span>", "warn");
            }
          }
        }
      }catch(e){ err("advanceNotice", e); }
      return r;
    };
  })();

  /* ---- 6. conversion (setEntity lives inside the v4.25 closure) ---- */
  function convert(key){
    try{
      var ent = ENTITIES[key], c = C(), t = TS();
      if(!ent || !c || !t || key === t.entity) return;
      if(ent.setup > 0 && n(c.cash,0) < ent.setup){
        if(typeof toast === "function") toast("Not enough company cash for the " + money(ent.setup) + " conversion cost.", "bad");
        return;
      }
      c.cash = n(c.cash,0) - ent.setup;
      t.entity = key;
      try{
        var s = G.__v425;
        if(s && Array.isArray(s.activity)){
          s.activity.unshift({ icon:"\u2696\uFE0F", text:"Converted to " + ent.label, amount: ent.setup ? -ent.setup : null, m:n(c.month,1), y:n(c.year,1) });
          if(s.activity.length > 120) s.activity.pop();
        }
      }catch(e1){}
      try{ logHistory("Converted the company to a " + ent.label + (ent.setup ? " for " + money(ent.setup) : "") + "."); }catch(e2){}
      if(typeof toast === "function") toast("<b>\u2696\uFE0F Now structured as a " + esc(ent.label) + ".</b>", "good");
      try{ renderAll(); }catch(e3){ try{ renderScreen(); }catch(e4){} }
    }catch(e){ err("convert", e); }
  }

  /* ---- 7. the Taxes screen ---- */
  function tile(label, value, cls){
    return '<div style="flex:1;min-width:140px;padding:9px;border-radius:9px;background:rgba(255,255,255,.04);">'
      + '<div style="font-size:11px;opacity:.7;">' + esc(label) + '</div>'
      + '<div style="font-size:16px;font-weight:700;' + (cls === "bad" ? "color:var(--bad);" : cls === "good" ? "color:var(--good);" : "") + '">' + value + '</div></div>';
  }
  function row(label, value, note){
    return '<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);font-size:12.5px;">'
      + '<div>' + esc(label) + (note ? '<div class="muted" style="font-size:11px;">' + esc(note) + '</div>' : '') + '</div>'
      + '<div style="font-weight:700;white-space:nowrap;">' + value + '</div></div>';
  }

  function screenTaxes(){
    var root = document.createElement("div");
    root.setAttribute("data-v428gtaxes", "1");
    try{
      var est = taxEstimate(), due = dueAtNextPay(), t = TS() || { accruedBiz:0, accruedPersonal:0, paidYTD:0 };
      var monthly = est.payrollTax + est.corp + est.personal;
      var ent = ENTITIES[est.entity] || ENTITIES.llc;
      var isCorp = ent.corp > 0;

      var head = document.createElement("div");
      head.className = "card";
      head.innerHTML = "<h3>\u{1F9FE} Taxes</h3>"
        + '<div class="muted" style="font-size:11.5px;margin-bottom:8px;">Payroll tax leaves every month. Income tax accrues monthly and is withdrawn every quarter \u2014 corporate from the company, personal from you.</div>'
        + '<div style="display:flex;gap:10px;flex-wrap:wrap;">'
        + tile("Structure", esc(est.label))
        + tile("In this month's burn", money(est.company), "bad")
        + tile("Accrued, unpaid", money(n(t.accruedBiz,0) + n(t.accruedPersonal,0)))
        + tile("Paid to date", money(n(t.paidYTD,0)))
        + '</div>';
      root.appendChild(head);

      var next = document.createElement("div");
      next.className = "card mt14";
      var when = due.away === 0 ? "at this month's close" : due.away === 1 ? "next month" : "in " + due.away + " months";
      next.innerHTML = "<h3>\u{1F4C5} Next quarterly payment</h3>"
        + '<div style="font-size:12.5px;margin-bottom:8px;">Month ' + due.month + ' \u2014 <b>' + when + '</b>.</div>'
        + '<div style="display:flex;gap:10px;flex-wrap:wrap;">'
        + tile("Projected total", money(due.total), due.away <= 1 ? "bad" : "")
        + tile("From company cash", money(due.biz))
        + tile("From personal cash", money(due.personal))
        + '</div>'
        + '<div class="muted" style="font-size:11.5px;margin-top:7px;">Anything you cannot cover stays owed and keeps accruing penalties.</div>';
      root.appendChild(next);

      var br = document.createElement("div");
      br.className = "card mt14";
      br.innerHTML = "<h3>\u{1F4CA} This month</h3>"
        + row("Employer payroll tax", money(est.payrollTax), "7.65% on " + money(est.payroll) + " of salary \u00b7 paid in cash this month")
        + row("Corporate income accrual", money(est.corp), isCorp
            ? Math.round(ent.corp*100) + "% of " + money(Math.max(0, est.profit)) + " operating profit"
            : "Pass-through structure \u2014 no corporate layer")
        + row("Personal income accrual", money(est.personal), isCorp
            ? "On " + money(est.draw) + " of owner draw"
            : "On " + money(Math.max(0, est.profit) + est.draw) + " of pass-through profit and owner draw")
        + row("Total tax cost", money(monthly), "Company burn carries " + money(est.company) + " of it");
      root.appendChild(br);

      var ents = document.createElement("div");
      ents.className = "card mt14";
      var html = "<h3>\u2696\uFE0F Entity structure</h3>"
        + '<div class="muted" style="font-size:11.5px;margin-bottom:8px;">Structure decides what you pay. Converting costs cash and takes effect immediately.</div>';
      Object.keys(ENTITIES).forEach(function(k){
        var en = ENTITIES[k];
        html += '<div style="margin:6px 0;padding:9px;border-radius:9px;background:rgba(255,255,255,.04);">'
          + '<div style="font-size:12px;"><b>' + esc(en.label) + '</b>'
          + (k === est.entity ? ' <span style="opacity:.7;">\u00b7 current</span>' : '')
          + ' <span style="opacity:.6;font-size:11px;">\u00b7 corp ' + Math.round(en.corp*100) + '% \u00b7 pass-through ' + Math.round(en.passthru*100) + '%</span></div>'
          + '<div style="font-size:11.5px;opacity:.72;margin:3px 0 6px;">' + esc(en.blurb) + '</div>'
          + (k === est.entity ? '' : '<button class="btn small" data-v428gent="' + k + '">Convert' + (en.setup ? ' \u00b7 ' + money(en.setup) : ' \u00b7 free') + '</button>')
          + '</div>';
      });
      ents.innerHTML = html;
      ents.querySelectorAll("[data-v428gent]").forEach(function(b){
        b.onclick = function(){ convert(b.getAttribute("data-v428gent")); };
      });
      root.appendChild(ents);
    }catch(e){
      err("screen", e);
      root.innerHTML = '<div class="card"><h3>\u{1F9FE} Taxes</h3><div class="muted">Tax data unavailable.</div></div>';
    }
    return root;
  }

  /* ---- 8. dock entry next to Financials, routed through the v4.28e registry ---- */
  try{
    var have = false;
    for(var i=0;i<DOCK_ITEMS.length;i++){
      if(DOCK_ITEMS[i].id === "taxes"){ have = true; DOCK_ITEMS[i].icon = "\u{1F9FE}"; DOCK_ITEMS[i].label = "Taxes"; }
    }
    if(!have) DOCK_ITEMS.push({ id:"taxes", icon:"\u{1F9FE}", label:"Taxes" });
  }catch(e){ err("dockItem", e); }

  function fixGroups(){
    try{
      for(var k=0;k<DOCK_GROUPS.length;k++){
        var g = DOCK_GROUPS[k];
        var fi = g.items.indexOf("financials");
        var ti = g.items.indexOf("taxes");
        if(fi >= 0 && ti < 0) g.items.splice(fi + 1, 0, "taxes");
        else if(fi < 0 && ti >= 0) g.items.splice(ti, 1);
      }
    }catch(e){ err("dockGroup", e); }
  }
  fixGroups();

  try{
    if(window.__v428eapi && window.__v428eapi.screens){ window.__v428eapi.screens.taxes = screenTaxes; }
    else err("register", { message:"__v428eapi.screens missing" });
  }catch(e){ err("register", e); }

  window.__v428gapi = {
    errs: errs,
    estimate: taxEstimate,
    next: dueAtNextPay,
    screen: screenTaxes,
    entities: ENTITIES,
    fixGroups: fixGroups
  };
})();
