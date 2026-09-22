/* ===== v4.40 — Ten HQ stages, facilities retired =====
   Replaces the four-stage workspace ladder plus stackable facilities with a
   single ten-stage HQ progression. Stages 0-3 keep their legacy seats, rent
   and upgrade costs so existing saves and older code paths stay consistent.
   Owned facilities are folded into an equivalent stage on load. */
(function(){
  "use strict";

  var STAGES = [
    { name:"Garage & Home Office",      cap:8,     rent:0,       cost:0,         blurb:"A desk in the garage and a lot of ambition. No rent, no privacy, a hard cap on seats." },
    { name:"Coworking Space",           cap:20,    rent:600,     cost:8000,      blurb:"Hot desks, cold brew and somebody else's wifi. Cheap, loud, good enough." },
    { name:"Your Own Leased Floor",     cap:60,    rent:1800,    cost:25000,     blurb:"One floor, your name on the door, and a spare room you do not need yet." },
    { name:"Small Office Building",     cap:250,   rent:4500,    cost:60000,     blurb:"Three floors of your own. Reception, meeting rooms and a real front door." },
    { name:"Mid-Rise Office Building",  cap:800,   rent:16000,   cost:400000,    blurb:"Eight floors, two lifts and a lobby that closes candidates for you." },
    { name:"Corporate Tower Floors",    cap:2500,  rent:55000,   cost:1800000,   blurb:"Twelve leased floors downtown, with your logo near the top of the tower." },
    { name:"Full Corporate Tower",      cap:6000,  rent:140000,  cost:6000000,   blurb:"The whole tower. Sky lobby, staff canteen, and parking three levels down." },
    { name:"Regional Campus",           cap:12000, rent:320000,  cost:18000000,  blurb:"Four buildings around a green, a shuttle loop, and a gym nobody uses twice." },
    { name:"Twin-Tower Headquarters",   cap:22000, rent:700000,  cost:55000000,  blurb:"Two towers joined by a sky bridge. An address people recognise on sight." },
    { name:"Global Flagship Campus",    cap:50000, rent:1600000, cost:150000000, blurb:"A city within a city: twelve buildings, 50,000 seats and its own transit spur." }
  ];
  var MAX = STAGES.length - 1;
  var LEGACY_RENT = [0, 600, 1800, 4500];

  window.HQ_STAGES = STAGES;

  function G_(){ try{ return G; }catch(e){ return null; } }
  function co(){ var g = G_(); return g && g.company ? g.company : null; }
  function stage(){ var c = co(); return Math.max(0, Math.min(MAX, (c && c.hqStage) | 0)); }
  function money(n){ try{ return fmt$(n); }catch(e){ return "$" + Math.round(n).toLocaleString(); } }
  function node(html){
    try{ return el(html); }catch(e){}
    var d = document.createElement("div"); d.innerHTML = html; return d.firstElementChild || d;
  }

  /* ---- 1. widen the legacy arrays in place ---- */
  try{
    if(typeof HQ_STAGE_NAMES !== "undefined" && HQ_STAGE_NAMES){
      HQ_STAGE_NAMES.length = 0;
      STAGES.forEach(function(s){ HQ_STAGE_NAMES.push(s.name); });
    }
  }catch(e){}
  try{
    if(typeof HEADCOUNT_CAP !== "undefined" && HEADCOUNT_CAP){
      HEADCOUNT_CAP.length = 0;
      STAGES.forEach(function(s){ HEADCOUNT_CAP.push(s.cap); });
    }
  }catch(e){}
  try{
    if(typeof EXPENSE_LABELS === "object" && EXPENSE_LABELS) EXPENSE_LABELS.facilities = "HQ rent (above base)";
  }catch(e){}

  /* ---- 2. fold any owned facilities into an equivalent stage ---- */
  function migrate(){
    var c = co(); if(!c) return;
    var owned = c.facilities || [];
    if(!owned.length){ c.facilities = []; return; }
    var extra = owned.reduce(function(s, f){ return s + (Number(f && f.cap) || 0); }, 0);
    var target = Math.max(0, Math.min(MAX, (c.hqStage | 0)));
    var want = (STAGES[target].cap || 8) + extra;
    for(var j = 0; j <= MAX; j++){ if(STAGES[j].cap >= want){ target = Math.max(target, j); break; } }
    c.hqStage = Math.min(MAX, target);
    c.facilities = [];
    c.v440Migrated = true;
  }

  /* ---- 3. core numbers ---- */
  window.headcountCap = function(){
    var cap = STAGES[stage()].cap;
    try{
      if(deptHas("operations", "manager")) cap += 5;
      if(deptHas("operations", "coo")) cap += 15;
    }catch(e){}
    return cap;
  };
  window.facilityCap = function(){ return 0; };
  window.facilityRent = function(){
    var s = stage();
    var legacy = LEGACY_RENT[Math.min(3, s)] || 0;
    return Math.max(0, STAGES[s].rent - legacy);
  };
  window.hqStageRent = function(){ return STAGES[stage()].rent; };

  /* ---- 4. upgrading ---- */
  function queueUpgrade(){
    var c = co(); if(!c) return;
    var s = stage();
    if(s >= MAX){ toast("You are already in the final HQ. There is nothing bigger to buy."); return; }
    var cost = STAGES[s + 1].cost;
    try{ if(typeof affordOrAlert === "function" && !affordOrAlert(cost, "the HQ upgrade")) return; }catch(e){}
    var label = "Move HQ \u2014 " + STAGES[s + 1].name;
    try{
      queueAdd({
        id: (typeof uid === "function" ? uid() : "v440" + Date.now()),
        label: label,
        cost: cost,
        run: function(report){
          var cc = co(); if(!cc) return;
          if(cc.cash < cost){ report.push("Skipped the HQ move \u2014 insufficient cash."); return; }
          cc.cash -= cost;
          cc.hqStage = Math.min(MAX, (cc.hqStage | 0) + 1);
          (cc.employees || []).forEach(function(e){
            try{ e.morale = clamp(e.morale + 5, 0, 100); }catch(err){}
          });
          report.push("\uD83C\uDFE2 Moved into the " + STAGES[cc.hqStage].name +
            " \u2014 " + STAGES[cc.hqStage].cap.toLocaleString() + " seats, " +
            money(STAGES[cc.hqStage].rent) + "/mo rent. Morale improved.");
        }
      });
      toast("<b>Queued.</b> You move in when the month closes.");
      if(typeof renderAll === "function") renderAll();
    }catch(e){}
  }
  function toast(msg){
    try{ v30Toast(msg, "good"); return; }catch(e){}
    try{ alertBox(msg); }catch(e){}
  }
  window.v440QueueHqUpgrade = queueUpgrade;

  /* ---- 5. the HQ card and ladder ---- */
  function hqArt(){
    var s = stage();
    var src = (window.HQ_IMG || {})[s];
    return src ? '<span class="v47-hqshot"><img class="hq-photo" src="' + src + '" alt=""></span>' : "";
  }

  function hqCardHtml(){
    var c = co(); if(!c) return "";
    var s = stage(), st = STAGES[s];
    var seats = (c.employees || []).length;
    var cap = headcountCap();
    var nxt = s < MAX ? STAGES[s + 1] : null;
    return '<div class="card v47-hqcard" data-v440hq="' + s + '">' +
      hqArt() +
      '<h3 style="margin:0 0 2px;">\uD83C\uDFE2 ' + st.name + '</h3>' +
      '<div class="muted" style="font-size:12px;">' + st.blurb + '</div>' +
      '<div class="muted" style="font-size:11.5px;margin-top:6px;">Stage ' + (s + 1) + ' of ' + STAGES.length +
        ' \u00b7 ' + seats.toLocaleString() + ' of ' + cap.toLocaleString() + ' seats used \u00b7 ' +
        money(st.rent) + '/mo rent</div>' +
      (nxt
        ? '<div style="font-size:12px;margin-top:8px;">Next: <b>' + nxt.name + '</b> for <b>' + money(nxt.cost) +
            '</b> \u2014 ' + nxt.cap.toLocaleString() + ' seats at ' + money(nxt.rent) + '/mo.</div>' +
          '<button class="btn small" data-v440up="1" style="margin-top:7px;">Queue the move</button>' +
          '<div class="muted" style="font-size:11px;margin-top:6px;">Moves complete when the month closes.</div>'
        : '<div style="font-size:12px;margin-top:8px;">Final stage. Fifty thousand seats and nowhere left to grow.</div>') +
    '</div>';
  }

  function ladderHtml(){
    var s = stage();
    var steps = STAGES.map(function(st, i){
      var cls = i < s ? "done" : (i === s ? "now" : "");
      return '<div class="v410-step ' + cls + '"><div class="n">' + (i < s ? "\u2713 " : "") + (i + 1) + ". " + st.name + '</div>' +
        '<div class="m">seats ' + st.cap.toLocaleString() + " \u00b7 " + money(st.rent) + "/mo" +
        (i === s ? " \u00b7 you are here" : (i > s ? " \u00b7 move-in " + money(st.cost) : "")) + '</div></div>';
    }).join("");
    return '<div class="card mt14" data-v440ladder="1"><h3>\uD83C\uDFE2 HQ stages</h3>' +
      '<div class="v410-ladder">' + steps + '</div>' +
      '<div class="muted" style="font-size:11px;margin-top:8px;">One HQ at a time. Each move raises the seat cap and the rent; there are no separate facilities to buy.</div></div>';
  }

  /* facilitiesSection is still called by HR, Empire and the HQ tab */
  window.facilitiesSection = function(){
    migrate();
    var box = node('<div data-v440section="1"></div>');
    box.innerHTML = hqCardHtml() + ladderHtml();
    return box;
  };

  window.facilitiesBanner = function(){
    var c = co(); if(!c) return null;
    var cap = headcountCap();
    var used = (c.employees || []).length;
    if(used < cap * 0.8) return null;
    var s = stage();
    if(s >= MAX) return null;
    var nxt = STAGES[s + 1];
    var box = node('<div class="v18-banner"><span>\uD83C\uDFE2 You are at <b>' + used.toLocaleString() + "/" + cap.toLocaleString() +
      '</b> seats. The next HQ (<b>' + nxt.name + '</b>) holds ' + nxt.cap.toLocaleString() + ' for ' + money(nxt.cost) + '.</span>' +
      '<button class="btn small" data-v440go="1">Open HQ</button></div>');
    try{
      box.querySelectorAll("[data-v440go]").forEach(function(b){
        b.onclick = function(){ G.ui.activeTab = "facilities"; renderAll(); };
      });
    }catch(e){}
    return box;
  };

  window.renderFacilitiesTab = function(){
    migrate();
    var c = co();
    var s = stage(), st = STAGES[s];
    var cap = headcountCap();
    var seats = (c.employees || []).length;
    var wrap = node('<div>' +
      '<div class="window-title"><h2>\uD83C\uDFE2 HQ</h2><span class="sub">One headquarters, ten stages, from the garage to a global campus</span></div>' +
      '<div class="grid3 mb14">' +
        '<div class="card"><h3>Seats Used</h3><div class="big ' + (seats >= cap ? "bad" : "") + '">' + seats.toLocaleString() + " / " + cap.toLocaleString() +
          '</div><div class="muted" style="font-size:11px;">HQ stage ' + (s + 1) + " of " + STAGES.length + '</div></div>' +
        '<div class="card"><h3>HQ Rent</h3><div class="big bad">' + money(st.rent) + '/mo</div><div class="muted" style="font-size:11px;">Charged at every month close</div></div>' +
        '<div class="card"><h3>Next Move</h3><div class="big">' + (s < MAX ? money(STAGES[s + 1].cost) : "\u2014") +
          '</div><div class="muted" style="font-size:11px;">' + (s < MAX ? STAGES[s + 1].name : "Final stage reached") + '</div></div>' +
      '</div></div>');
    try{
      var banner = facilitiesBanner();
      if(banner) wrap.appendChild(banner);
    }catch(e){}
    wrap.appendChild(facilitiesSection());
    return wrap;
  };

  /* ---- 6. expansion bucket: our card replaces the old one ---- */
  try{
    if(typeof renderExpansionBucket === "function"){
      var prevExp = renderExpansionBucket;
      window.renderExpansionBucket = function(){
        var html = prevExp.apply(this, arguments);
        try{
          html = String(html).replace(/<div class="card v47-hqcard"[\s\S]*?<\/div>\s*<\/div>/, "");
          return hqCardHtml() + html;
        }catch(e){ return html; }
      };
    }
  }catch(e){}

  /* ---- 7. sweep the retired UI out of whatever rendered it ---- */
  function sweep(){
    try{
      document.querySelectorAll("[data-v436space]").forEach(function(n){ n.remove(); });
      document.querySelectorAll("[data-v47hq]").forEach(function(n){ n.remove(); });
      document.querySelectorAll(".ladder-card").forEach(function(n){
        if((n.textContent || "").indexOf("Upgrade workspace") >= 0) n.remove();
      });
      document.querySelectorAll("[data-v17fac]").forEach(function(n){ n.remove(); });
      document.querySelectorAll("button, .dock-item, .menu-item, a").forEach(function(n){
        if(n.childElementCount === 0 && /Facilities/.test(n.textContent || "")){
          n.textContent = n.textContent.replace(/Facilities/g, "HQ");
        }
      });
    }catch(e){}
  }

  try{
    if(typeof renderAll === "function"){
      var prevRender = renderAll;
      window.renderAll = function(){
        var r = prevRender.apply(this, arguments);
        try{ sweep(); }catch(e){}
        return r;
      };
    }
  }catch(e){}

  document.addEventListener("click", function(ev){
    var t = ev.target && ev.target.closest ? ev.target.closest("[data-v440up]") : null;
    if(!t) return;
    ev.preventDefault();
    queueUpgrade();
  }, true);

  /* ---- 8. dock label ---- */
  try{
    if(typeof DOCK_ITEMS !== "undefined" && DOCK_ITEMS){
      DOCK_ITEMS.forEach(function(d){
        if(d && d.id === "facilities"){ d.label = "HQ"; d.icon = "\uD83C\uDFE2"; }
      });
    }
  }catch(e){}

  /* ---- 9. run the migration on load and after loads/saves ---- */
  try{ migrate(); }catch(e){}
  document.addEventListener("DOMContentLoaded", function(){ try{ migrate(); sweep(); }catch(e){} });
  setTimeout(function(){ try{ migrate(); sweep(); }catch(e){} }, 0);

  window.v440Version = "v4.40";
})();
