/* ===== v4.40/v4.42 — Ten HQ stages, facilities retired =====
   Replaces the four-stage workspace ladder plus stackable facilities with a
   single ten-stage HQ progression. Stages 0-3 keep their legacy seats, rent
   and upgrade costs so existing saves and older code paths stay consistent.

   v4.42: the HQ tab is now a showroom, not a line item. A large hero shot of
   the current HQ with what was paid for it, and large cards for what comes
   next. Art slots are drawn at full size even before the images exist, so
   the layout does not jump around when they land. */
(function(){
  "use strict";

  var STAGES = [
    { key:"hq_0", name:"Garage & Home Office",      cap:8,     rent:0,       cost:0,         blurb:"A desk in the garage and a lot of ambition. No rent, no privacy, a hard cap on seats." },
    { key:"hq_1", name:"Coworking Space",           cap:20,    rent:600,     cost:8000,      blurb:"Hot desks, cold brew and somebody else's wifi. Cheap, loud, good enough." },
    { key:"hq_2", name:"Your Own Leased Floor",     cap:60,    rent:1800,    cost:25000,     blurb:"One floor, your name on the door, and a spare room you do not need yet." },
    { key:"hq_3", name:"Small Office Building",     cap:250,   rent:4500,    cost:60000,     blurb:"Three floors of your own. Reception, meeting rooms and a real front door." },
    { key:"hq_4", name:"Mid-Rise Office Building",  cap:800,   rent:16000,   cost:400000,    blurb:"Eight floors, two lifts and a lobby that closes candidates for you." },
    { key:"hq_5", name:"Corporate Tower Floors",    cap:2500,  rent:55000,   cost:1800000,   blurb:"Twelve leased floors downtown, with your logo near the top of the tower." },
    { key:"hq_6", name:"Full Corporate Tower",      cap:6000,  rent:140000,  cost:6000000,   blurb:"The whole tower. Sky lobby, staff canteen, and parking three levels down." },
    { key:"hq_7", name:"Regional Campus",           cap:12000, rent:320000,  cost:18000000,  blurb:"Four buildings around a green, a shuttle loop, and a gym nobody uses twice." },
    { key:"hq_8", name:"Twin-Tower Headquarters",   cap:22000, rent:700000,  cost:55000000,  blurb:"Two towers joined by a sky bridge. An address people recognise on sight." },
    { key:"hq_9", name:"Global Flagship Campus",    cap:50000, rent:1600000, cost:150000000, blurb:"A city within a city: twelve buildings, 50,000 seats and its own transit spur." }
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

  /* ---- 0. find whichever global holds the art, without guessing its name ---- */
  var artBag = null, artFn = null, artScanned = false;
  function looksLikeArt(v){
    return typeof v === "string" && (v.indexOf("data:image") === 0 || /\.(webp|png|jpg|jpeg|svg)(\?|$)/i.test(v));
  }
  function scanForArt(){
    if(artScanned) return;
    artScanned = true;
    var fns = ["artFor", "getArt", "artUrl", "imgFor", "v47Art", "v47Img", "hqArtFor"];
    for(var f = 0; f < fns.length; f++){
      try{ if(typeof window[fns[f]] === "function"){ artFn = window[fns[f]]; break; } }catch(e){}
    }
    var probes = ["hq_0", "hq_1", "starter", "sedan"];
    var named = ["HQ_IMG", "ART", "ARTS", "ART_IMG", "IMAGES", "IMG", "ART47", "ART_V47", "ARTMAP"];
    var i, k;
    for(i = 0; i < named.length; i++){
      try{
        var o = window[named[i]];
        if(o && typeof o === "object"){
          for(k = 0; k < probes.length; k++){ if(looksLikeArt(o[probes[k]])){ artBag = o; return; } }
        }
      }catch(e){}
    }
    try{
      var keys = Object.keys(window);
      for(i = 0; i < keys.length; i++){
        var v;
        try{ v = window[keys[i]]; }catch(e){ continue; }
        if(!v || typeof v !== "object") continue;
        for(k = 0; k < probes.length; k++){
          try{ if(looksLikeArt(v[probes[k]])){ artBag = v; return; } }catch(e){}
        }
      }
    }catch(e){}
  }
  function art(key){
    scanForArt();
    var src = null;
    try{ if(artBag && looksLikeArt(artBag[key])) src = artBag[key]; }catch(e){}
    if(!src && artFn){ try{ var r = artFn(key); if(looksLikeArt(r)) src = r; }catch(e){} }
    if(!src){ try{ var h = (window.HQ_IMG || {})[key]; if(looksLikeArt(h)) src = h; }catch(e){} }
    return src;
  }
  function shot(key, cls, label){
    var src = art(key);
    if(src) return '<img class="' + cls + '" src="' + src + '" alt="' + label + '">';
    return '<div class="' + cls + ' hq-pending"><span>Art pending<br><code>' + key + '</code></span></div>';
  }
  window.v442Art = art;

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
    var label = "Move HQ — " + STAGES[s + 1].name;
    try{
      queueAdd({
        id: (typeof uid === "function" ? uid() : "v440" + Date.now()),
        label: label,
        cost: cost,
        run: function(report){
          var cc = co(); if(!cc) return;
          if(cc.cash < cost){ report.push("Skipped the HQ move — insufficient cash."); return; }
          cc.cash -= cost;
          cc.hqStage = Math.min(MAX, (cc.hqStage | 0) + 1);
          /* remember what this HQ cost and when it was bought */
          cc.hqPaid = cost;
          cc.hqPaidTotal = (Number(cc.hqPaidTotal) || 0) + cost;
          cc.hqBought = { month: cc.month || 1, year: cc.year || 1, price: cost };
          (cc.employees || []).forEach(function(e){
            try{ e.morale = clamp(e.morale + 5, 0, 100); }catch(err){}
          });
          report.push("🏢 Moved into the " + STAGES[cc.hqStage].name +
            " — " + STAGES[cc.hqStage].cap.toLocaleString() + " seats, " +
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

  function queued(){
    try{
      return (G.company.queue || []).some(function(q){ return q && /Move HQ/.test(q.label || ""); });
    }catch(e){ return false; }
  }

  /* ---- 5. styles for the showroom ---- */
  try{
    if(!document.getElementById("v442-css")){
      var css = document.createElement("style");
      css.id = "v442-css";
      css.textContent =
        ".hq-hero{padding:0;overflow:hidden;}"
      + ".hq-hero-img,.hq-hero .hq-pending{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:#11141a;}"
      + ".hq-hero-body{padding:14px 16px 16px;}"
      + ".hq-hero-body h2{margin:0 0 2px;font-size:19px;}"
      + ".hq-hero-body .blurb{font-size:12.5px;opacity:.8;line-height:1.5;margin-bottom:12px;}"
      + ".hq-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;}"
      + ".hq-fact{border:1px solid var(--border,#293042);border-radius:10px;padding:8px 10px;}"
      + ".hq-fact .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;opacity:.6;display:block;}"
      + ".hq-fact .v{font-size:15px;font-weight:600;}"
      + ".hq-fact .v.bad{color:#f3a2ae;}"
      + ".hq-next-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin-top:10px;}"
      + ".hq-opt{border:1px solid var(--border,#293042);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;background:var(--panel2,#0b1220);}"
      + ".hq-opt img,.hq-opt .hq-pending{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:#11141a;}"
      + ".hq-opt .body{padding:10px 12px 12px;display:flex;flex-direction:column;gap:6px;flex:1;}"
      + ".hq-opt h4{margin:0;font-size:14px;}"
      + ".hq-opt .line{font-size:11.5px;opacity:.75;line-height:1.45;}"
      + ".hq-opt .price{font-size:15px;font-weight:600;}"
      + ".hq-opt.locked{opacity:.62;}"
      + ".hq-opt .btn{margin-top:auto;}"
      + ".hq-pending{display:flex;align-items:center;justify-content:center;text-align:center;font-size:11px;opacity:.5;"
      + "border-bottom:1px dashed var(--border,#293042);}"
      + ".hq-pending code{font-size:10.5px;}";
      document.head.appendChild(css);
    }
  }catch(e){}

  /* ---- 6. the HQ showroom ---- */
  function heroHtml(){
    var c = co(); if(!c) return "";
    var s = stage(), st = STAGES[s];
    var seats = (c.employees || []).length;
    var cap = headcountCap();
    var paid = (c.hqBought && c.hqBought.price != null) ? c.hqBought.price : (s === 0 ? 0 : null);
    var bought = c.hqBought ? ("Y" + c.hqBought.year + " M" + c.hqBought.month) : null;
    return '<div class="card hq-hero" data-v440hq="' + s + '">' +
      shot(st.key, "hq-hero-img", st.name) +
      '<div class="hq-hero-body">' +
        '<div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;">Stage ' + (s + 1) + ' of ' + STAGES.length + '</div>' +
        '<h2>🏢 ' + st.name + '</h2>' +
        '<div class="blurb">' + st.blurb + '</div>' +
        '<div class="hq-facts">' +
          '<div class="hq-fact"><span class="k">Seats</span><span class="v' + (seats >= cap ? " bad" : "") + '">' +
            seats.toLocaleString() + ' / ' + cap.toLocaleString() + '</span></div>' +
          '<div class="hq-fact"><span class="k">Rent</span><span class="v bad">' + money(st.rent) + '<span style="font-size:11px;font-weight:400;opacity:.7;">/mo</span></span></div>' +
          '<div class="hq-fact"><span class="k">Paid for this HQ</span><span class="v">' +
            (paid === 0 ? "Nothing — it is your garage" : (paid == null ? "—" : money(paid))) + '</span>' +
            (bought ? '<span class="k" style="margin-top:2px;">Moved in ' + bought + '</span>' : '') + '</div>' +
          '<div class="hq-fact"><span class="k">Invested in HQ to date</span><span class="v">' + money(Number(c.hqPaidTotal) || 0) + '</span></div>' +
        '</div>' +
      '</div></div>';
  }

  function optionHtml(i, immediate){
    var st = STAGES[i], s = stage();
    var here = STAGES[s];
    var deltaSeats = st.cap - here.cap;
    var deltaRent = st.rent - here.rent;
    return '<div class="hq-opt' + (immediate ? "" : " locked") + '" data-v442opt="' + i + '">' +
      shot(st.key, "", st.name) +
      '<div class="body">' +
        '<div class="muted" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;">Stage ' + (i + 1) + '</div>' +
        '<h4>' + st.name + '</h4>' +
        '<div class="line">' + st.blurb + '</div>' +
        '<div class="line"><b>' + st.cap.toLocaleString() + '</b> seats (+' + deltaSeats.toLocaleString() + ') · rent ' +
          money(st.rent) + '/mo (+' + money(deltaRent) + ')</div>' +
        '<div class="price">' + money(st.cost) + '</div>' +
        (immediate
          ? (queued()
              ? '<div class="line"><b>Move already queued</b> — it completes at month close.</div>'
              : '<button class="btn small" data-v440up="1">Queue this move</button>')
          : '<div class="line">Unlocks after the moves before it.</div>') +
      '</div></div>';
  }

  function nextHtml(){
    var s = stage();
    if(s >= MAX){
      return '<div class="card mt14"><h3>🏁 Final stage</h3><div class="muted" style="font-size:12px;">' +
        'Fifty thousand seats and nowhere left to grow. Everything from here is people, not property.</div></div>';
    }
    var out = "";
    for(var i = s + 1; i <= Math.min(MAX, s + 3); i++) out += optionHtml(i, i === s + 1);
    return '<div class="card mt14" data-v442next="1"><h3>📦 Where you could move next</h3>' +
      '<div class="muted" style="font-size:12px;">One HQ at a time, one step at a time. Moves complete when the month closes and lift morale by 5.</div>' +
      '<div class="hq-next-grid">' + out + '</div></div>';
  }

  function ladderHtml(){
    var s = stage();
    var steps = STAGES.map(function(st, i){
      var cls = i < s ? "done" : (i === s ? "now" : "");
      return '<div class="v410-step ' + cls + '"><div class="n">' + (i < s ? "✓ " : "") + (i + 1) + ". " + st.name + '</div>' +
        '<div class="m">seats ' + st.cap.toLocaleString() + " · " + money(st.rent) + "/mo" +
        (i === s ? " · you are here" : (i > s ? " · move-in " + money(st.cost) : "")) + '</div></div>';
    }).join("");
    return '<div class="card mt14" data-v440ladder="1"><h3>🏢 The whole ladder</h3>' +
      '<div class="v410-ladder">' + steps + '</div></div>';
  }

  /* compact card for other screens (HR, Empire) */
  function hqCardHtml(){
    var c = co(); if(!c) return "";
    var s = stage(), st = STAGES[s];
    var seats = (c.employees || []).length;
    var cap = headcountCap();
    var nxt = s < MAX ? STAGES[s + 1] : null;
    var src = art(st.key);
    return '<div class="card v47-hqcard" data-v440hq="' + s + '">' +
      (src ? '<span class="v47-hqshot"><img class="hq-photo" src="' + src + '" alt=""></span>' : "") +
      '<div><h3 style="margin:0 0 2px;">🏢 ' + st.name + '</h3>' +
      '<div class="muted" style="font-size:11.5px;">' + seats.toLocaleString() + ' of ' + cap.toLocaleString() +
        ' seats · ' + money(st.rent) + '/mo' + (nxt ? ' · next: ' + nxt.name + ' for ' + money(nxt.cost) : '') + '</div>' +
      '<button class="btn secondary small" data-v442go="1" style="margin-top:7px;">Open HQ</button></div>' +
    '</div>';
  }

  window.facilitiesSection = function(){
    migrate();
    var box = node('<div data-v440section="1"></div>');
    box.innerHTML = hqCardHtml();
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
    var box = node('<div class="v18-banner"><span>🏢 You are at <b>' + used.toLocaleString() + "/" + cap.toLocaleString() +
      '</b> seats. The next HQ (<b>' + nxt.name + '</b>) holds ' + nxt.cap.toLocaleString() + ' for ' + money(nxt.cost) + '.</span>' +
      '<button class="btn small" data-v442go="1">Open HQ</button></div>');
    return box;
  };

  window.renderFacilitiesTab = function(){
    migrate();
    var wrap = node('<div data-v442hqtab="1">' +
      '<div class="window-title"><h2>🏢 HQ</h2><span class="sub">One headquarters, ten stages, from the garage to a global campus</span></div>' +
      '</div>');
    try{ var b = facilitiesBanner(); if(b) wrap.appendChild(b); }catch(e){}
    var body = document.createElement("div");
    body.innerHTML = heroHtml() + nextHtml() + ladderHtml();
    while(body.firstChild) wrap.appendChild(body.firstChild);
    return wrap;
  };

  /* ---- 7. expansion bucket: our compact card replaces the old one ---- */
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

  /* ---- 8. sweep the retired UI out of whatever rendered it ---- */
  function sweep(){
    try{
      if(document.getElementById("nbGate")) return;   /* never touch the gate */
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
    var t = ev.target && ev.target.closest ? ev.target.closest("[data-v440up],[data-v442go]") : null;
    if(!t) return;
    if(document.getElementById("nbGate")) return;
    ev.preventDefault();
    if(t.hasAttribute("data-v442go")){
      try{ G.ui.activeTab = "facilities"; renderAll(); }catch(e){}
      return;
    }
    queueUpgrade();
  });

  /* ---- 9. dock label ---- */
  try{
    if(typeof DOCK_ITEMS !== "undefined" && DOCK_ITEMS){
      DOCK_ITEMS.forEach(function(d){
        if(d && d.id === "facilities"){ d.label = "HQ"; d.icon = "🏢"; }
      });
    }
  }catch(e){}

  /* ---- 10. run the migration on load and after loads/saves ---- */
  try{ migrate(); }catch(e){}
  document.addEventListener("DOMContentLoaded", function(){ try{ migrate(); sweep(); }catch(e){} });
  setTimeout(function(){ try{ migrate(); sweep(); }catch(e){} }, 0);

  window.v440Version = "v4.42";
})();
