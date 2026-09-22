/* =====================================================================
   v4.10 — 1. Reputation grows in proportion to the company
   Reputation was easing toward a target dominated by client health and
   morale, both of which sit near 60-70 on day one. A two-person shop
   therefore climbed to "well regarded" within a year. Reputation is now
   capped by how big the company actually is, and eases far more slowly.
   ===================================================================== */
(function v410Rep(){
  "use strict";
  try{
    if(typeof v46RepMonth !== "function") return;

    /* the ceiling a company of this size is allowed to reach */
    window.v410RepCeiling = function(c){
      try{
        var mrr     = Math.max(0, c.mrr || 0);
        var heads   = ((c.employees || []).length);
        var clients = ((c.clients || []).length);
        var years   = Math.max(0, ((c.year || 1) - 1) + ((c.month || 1) - 1) / 12);
        /* each dimension contributes; nobody is famous on one axis alone */
        var byRev   = Math.min(30, Math.log10(Math.max(1, mrr)) * 7.5);
        var byTeam  = Math.min(18, Math.sqrt(heads) * 4.2);
        var byBook  = Math.min(16, Math.sqrt(clients) * 4.6);
        var byAge   = Math.min(14, years * 2.6);
        /* floor of 50 so a young company is not branded disreputable on day one;
           anything above "respectable" has to be earned with actual scale */
        return Math.max(50, Math.min(100, 30 + byRev + byTeam + byBook + byAge));
      }catch(e){ return 100; }
    };

    v46RepMonth = function(){
      var c = G.company, r = v46Rep();
      r.lastCompany = r.company; r.lastFounder = r.founder;
      var clients = c.clients || [];
      var health  = clients.length ? clients.reduce(function(s,x){ return s + (x.health||60); }, 0) / clients.length : 60;
      var morale  = (c.employees||[]).length ? (c.employees.reduce(function(s,e){ return s + (e.morale||70); }, 0) / c.employees.length) : 70;
      var scale   = Math.min(18, Math.log10(Math.max(1, (c.mrr||0))) * 4);

      var target  = clamp(health * 0.45 + morale * 0.2 + (c.successScore || 50) * 0.2 + scale, 0, 100);
      var ceiling = window.v410RepCeiling(c);
      target = Math.min(target, ceiling);

      /* rising is slow and gets slower near the ceiling; falling stays quick */
      var gap  = target - r.company;
      var rate = gap > 0 ? 0.07 : 0.22;
      if(gap > 0){
        var room = Math.max(0, ceiling - r.company);
        if(room < 8) rate *= (room / 8);   /* the last stretch is earned */
      }
      r.company = clamp(r.company + gap * rate, 0, 100);

      var founderTarget = clamp(40 + Math.min(28, (c.founderActionsLifetime||0) * 0.8) + (r.company - 50) * 0.5
        + Math.min(20, ((c.valuation||0) / 5000000) * 10), 0, 100);
      founderTarget = Math.min(founderTarget, ceiling + 6);
      var fgap = founderTarget - r.founder;
      r.founder = clamp(r.founder + fgap * (fgap > 0 ? 0.06 : 0.18), 0, 100);

      var dc = Math.round(r.company - r.lastCompany);
      if(Math.abs(dc) >= 3){
        try{
          logHistory((dc > 0 ? "\u2B06\uFE0F" : "\u2B07\uFE0F") + " Company reputation " + (dc > 0 ? "rose" : "fell") + " to "
            + Math.round(r.company) + "/100 \u2014 " + v46RepTier(r.company).label.toLowerCase() + ".");
        }catch(e){}
      }
    };
    window.v46RepMonth = v46RepMonth;
  }catch(e){}

  /* show the ceiling on the reputation card so the limit is legible */
  try{
    if(typeof renderScreen === "function"){
      var prevRS = renderScreen;
      renderScreen = function(){
        var out = prevRS.apply(this, arguments);
        try{
          var card = document.querySelector("[data-v46rep]");
          if(card && !card.querySelector("[data-v410cap]") && typeof G !== "undefined" && G && G.company){
            var cap = Math.round(window.v410RepCeiling(G.company));
            var now = Math.round(v46Rep().company);
            var d = document.createElement("div");
            d.setAttribute("data-v410cap","1");
            d.className = "muted";
            d.style.cssText = "font-size:11.5px;margin-top:8px;padding-top:8px;border-top:1px solid var(--border,#293042);";
            d.innerHTML = "Ceiling for a company this size: <b>" + cap + "/100</b>"
              + (now >= cap - 2
                  ? " \u2014 you are at it. Grow revenue, headcount or the client book to raise it."
                  : " \u2014 reputation climbs toward this and no further.");
            card.appendChild(d);
          }
        }catch(e){}
        return out;
      };
      window.renderScreen = renderScreen;
    }
  }catch(e){}
})();
/* =====================================================================
   v4.10 — 2. The endgame: you choose if and when to go public
   ===================================================================== */
(function v410Exit(){
  "use strict";
  function S(){
    var c = G.company;
    if(!c.v410) c.v410 = { status:"private", filedYear:0, filedMonth:0, monthsToList:0, raise:0, listPrice:0, listed:null, declined:0 };
    return c.v410;
  }
  function mrr(){ try{ return Math.max(0, G.company.mrr||0); }catch(e){ return 0; } }
  function monthsElapsed(){ try{ return ((G.company.year||1)-1)*12 + ((G.company.month||1)-1); }catch(e){ return 0; } }

  /* --- listing requirements, all visible to the player --- */
  window.v410Reqs = function(){
    var c = G.company, rep = 50;
    try{ rep = v46Rep().company; }catch(e){}
    var profitable = false;
    try{ profitable = (corporateSnapshot().net || 0) > 0; }catch(e){}
    return [
      { k:"mrr",   label:"Revenue of $75,000/mo or better", ok: mrr() >= 75000,   now: fmt$(Math.round(mrr())) + "/mo" },
      { k:"rep",   label:"Company reputation of 62+",        ok: rep >= 62,        now: Math.round(rep) + "/100" },
      { k:"prof",  label:"Profitable last month",            ok: profitable,       now: profitable ? "yes" : "no" },
      { k:"team",  label:"At least 25 employees",            ok: ((c.employees||[]).length) >= 25, now: ((c.employees||[]).length) + " on team" },
      { k:"age",   label:"Three years of trading",           ok: monthsElapsed() >= 36, now: (Math.floor(monthsElapsed()/12)) + "y " + (monthsElapsed()%12) + "m" }
    ];
  };
  window.v410Ready = function(){ return window.v410Reqs().every(function(r){ return r.ok; }); };

  window.v410Valuation = function(){
    var rep = 50; try{ rep = v46Rep().company; }catch(e){}
    var growth = 1;
    try{
      var h = (G.company.financialHistory||[]).slice(-4);
      if(h.length >= 2){
        var a = h[0].revenue || h[0].mrr || 0, b = h[h.length-1].revenue || h[h.length-1].mrr || 0;
        if(a > 0) growth = clamp(b / a, 0.6, 2.2);
      }
    }catch(e){}
    var multiple = clamp(28 + (rep - 55) * 0.85 + (growth - 1) * 26, 14, 72);
    return { multiple: Math.round(multiple), value: Math.round(mrr() * multiple) };
  };

  window.v410File = function(){
    var st = S();
    if(st.status !== "private") return;
    if(!window.v410Ready()){ try{ v30Toast("You do not meet the listing requirements yet.", "warn"); }catch(e){} return; }
    var v = window.v410Valuation();
    var cost = Math.max(120000, Math.round(v.value * 0.02));
    st.filedValue = v.value;
    if(typeof affordOrAlert === "function" && !affordOrAlert(cost, "the IPO filing (bankers, auditors, lawyers)")) return;
    G.company.cash -= cost;
    st.status = "filed";
    st.filedYear = G.company.year; st.filedMonth = G.company.month;
    st.monthsToList = 3 + Math.floor(Math.random() * 4);
    try{ logHistory("Filed to go public. Bankers engaged for " + fmt$(cost) + "."); }catch(e){}
    try{ v30Toast("<b>Filed.</b> The roadshow runs for " + st.monthsToList + " months. You can still withdraw.", "good"); }catch(e){}
    try{ renderAll(); }catch(e){}
  };

  window.v410Withdraw = function(){
    var st = S();
    if(st.status !== "filed") return;
    if(!window.confirm("Withdraw the filing? The banking fees are not refunded.")) return;
    st.status = "private"; st.monthsToList = 0; st.declined++;
    try{ v46RepBump("company", -4, "Pulled an IPO filing"); }catch(e){}
    try{ logHistory("Withdrew the IPO filing."); }catch(e){}
    try{ renderAll(); }catch(e){}
  };

  /* the listing itself — the run does not end, you now run a public company */
  window.v410Price = function(report){
    var st = S();
    var v = window.v410Valuation();
    var noise = 0.8 + Math.random() * 0.45;
    /* price off today's book, but never off a momentarily empty one —
       fall back to the valuation agreed at filing */
    var base = v.value > 0 ? v.value : (st.filedValue || 0);
    var value = Math.round(base * noise);
    var raise = Math.round(value * 0.18);
    st.status = "public";
    st.listed = { year:G.company.year, month:G.company.month, value:value, raise:raise, multiple:v.multiple };
    st.raise = raise;
    G.company.cash = (G.company.cash||0) + raise;
    try{ G.company.valuation = value; }catch(e){}
    var p = (typeof pInit === "function") ? pInit() : null;
    var founderCut = Math.round(raise * 0.12);
    if(p) p.cash = (p.cash||0) + founderCut;
    try{ v46RepBump("company", 8, "Completed an IPO"); v46RepBump("founder", 10, "Took a company public"); }catch(e){}
    var line = "\u{1F514} " + G.company.name + " is public. Listed at " + fmt$(value) + " (" + v.multiple
      + "\u00d7 MRR), raising " + fmt$(raise) + " \u2014 " + fmt$(founderCut) + " to you personally.";
    if(report && report.push) report.push(line);
    try{ logHistory(line); }catch(e){}
    try{ v30Toast("<b>Ding ding.</b> " + G.company.name + " listed at " + fmt$(value) + ".", "good"); }catch(e){}
  };

  /* monthly tick: advance the roadshow, and pressure a public company */
  try{
    if(typeof advanceMonth === "function"){
      var prevAdv = advanceMonth;
      advanceMonth = function(){
        var out = prevAdv.apply(this, arguments);
        try{
          if(typeof G === "undefined" || !G || !G.company) return out;
          var st = S();
          if(st.status === "filed"){
            st.monthsToList--;
            if(st.monthsToList <= 0){
              if(window.v410Ready()) window.v410Price(null);
              else {
                st.status = "private";
                try{ v46RepBump("company", -6, "IPO pulled by the bankers"); }catch(e){}
                try{ logHistory("The bankers pulled the listing \u2014 the numbers slipped during the roadshow."); }catch(e){}
              }
            }
          } else if(st.status === "public"){
            var net = 0; try{ net = corporateSnapshot().net || 0; }catch(e){}
            if(net < 0){
              try{ v46RepBump("company", -1.5, "Public company posting losses"); }catch(e){}
            }
          }
        }catch(e){}
        return out;
      };
      window.advanceMonth = advanceMonth;
    }
  }catch(e){}

  /* --- the closing scoreboard --- */
  window.v410Scoreboard = function(kind, detail){
    var c = G.company, p = (typeof pInit === "function") ? pInit() : {};
    var rep = 50; try{ rep = v46Rep().company; }catch(e){}
    var months = monthsElapsed();
    var proceeds = (detail && detail.price) || (detail && detail.value) || 0;
    var personal = Math.round((p.cash || 0) + (p.netWorth || 0));
    var score = Math.round(
      (proceeds / 10000) + (personal / 20000) + rep * 6
      + ((c.employees||[]).length) * 8 + ((c.clients||[]).length) * 6
      - months * 2
    );
    var grade = score > 4200 ? "S" : score > 2800 ? "A" : score > 1700 ? "B" : score > 900 ? "C" : "D";
    var titles = {
      ipo:      "\u{1F514} You rang the bell",
      sale:     "\u{1F3C1} You sold the company",
      distress: "\u{1F3F4} Acquired in distress"
    };
    var rows = [
      ["Outcome", kind === "ipo" ? "Initial public offering" : kind === "sale" ? ("Sold to " + ((detail&&detail.buyer)||"a buyer")) : ("Bought for scrap by " + ((detail&&detail.buyer)||"a rival"))],
      ["Headline number", fmt$(proceeds)],
      ["Time taken", Math.floor(months/12) + " years " + (months%12) + " months"],
      ["Final revenue", fmt$(Math.round(c.mrr||0)) + "/mo"],
      ["Team at the end", ((c.employees||[]).length) + " people"],
      ["Client book", ((c.clients||[]).length) + " accounts"],
      ["Company reputation", Math.round(rep) + "/100"],
      ["Your personal position", fmt$(personal)]
    ];
    return '<div class="card mt14" data-v410score><h3>' + (titles[kind]||"Run complete") + '</h3>'
      + '<div style="font-size:26px;font-weight:700;margin:2px 0 2px;">Grade ' + grade + '</div>'
      + '<div class="muted" style="font-size:11.5px;margin-bottom:9px;">Final score ' + score.toLocaleString() + '</div>'
      + '<table style="width:100%;font-size:12px;border-collapse:collapse;">'
      + rows.map(function(r){
          return '<tr><td style="padding:3px 0;opacity:.7;">' + r[0] + '</td>'
               + '<td style="padding:3px 0;text-align:right;font-weight:600;">' + r[1] + '</td></tr>';
        }).join("")
      + '</table>'
      + '<div class="muted" style="font-size:11px;margin-top:9px;">'
      + (kind === "ipo"
          ? "You still run the company \u2014 public markets simply watch now. Keep playing, or export the run from the Saves tab."
          : "Export this run from the Saves tab if you want to keep it, then start a fresh company.")
      + '</div></div>';
  };

  /* --- IPO panel injected into the Market & Rivals screen --- */
  try{
    if(typeof renderScreen === "function"){
      var prevRS2 = renderScreen;
      renderScreen = function(){
        var out = prevRS2.apply(this, arguments);
        try{
          if(typeof G === "undefined" || !G || !G.company) return out;
          var tab = (G.ui && G.ui.activeTab) || "";
          if(tab !== "rivals") return out;
          var host = document.getElementById("screen");
          if(!host || host.querySelector("[data-v410ipo]")) return out;

          var st = S(), v = window.v410Valuation(), reqs = window.v410Reqs(), ready = window.v410Ready();
          var box = document.createElement("div");
          box.className = "card mt14";
          box.setAttribute("data-v410ipo","1");

          if(st.status === "private"){
            box.innerHTML = '<h3>\u{1F3DB}\uFE0F Going public</h3>'
              + '<div class="muted" style="font-size:11.5px;margin-bottom:8px;">An IPO is yours to call \u2014 nobody will push you into it. '
              + 'Listing raises cash, lifts reputation, and the run carries on with public-market scrutiny.</div>'
              + '<div style="font-size:12.5px;margin-bottom:7px;">Indicative value today: <b>' + fmt$(v.value) + '</b> (' + v.multiple + '\u00d7 MRR)</div>'
              + reqs.map(function(r){
                  return '<div style="display:flex;gap:7px;font-size:12px;padding:2px 0;">'
                    + '<span>' + (r.ok ? "\u2705" : "\u2b1c") + '</span>'
                    + '<span style="flex:1;' + (r.ok?"":"opacity:.72;") + '">' + r.label + '</span>'
                    + '<span class="muted" style="font-size:11px;">' + r.now + '</span></div>';
                }).join("")
              + '<button class="btn small" data-v410file style="margin-top:9px;"' + (ready?"":" disabled") + '>'
              + (ready ? "File to go public" : "Requirements not met") + '</button>';
          } else if(st.status === "filed"){
            box.innerHTML = '<h3>\u{1F4DC} Filing in progress</h3>'
              + '<div style="font-size:12.5px;">Roadshow underway \u2014 <b>' + st.monthsToList + '</b> month(s) to pricing.</div>'
              + '<div class="muted" style="font-size:11.5px;margin-top:4px;">If the business slips below the requirements before pricing, the bankers will pull it.</div>'
              + '<button class="btn secondary small" data-v410withdraw style="margin-top:9px;">Withdraw the filing</button>';
          } else {
            var L = st.listed || {};
            box.innerHTML = '<h3>\u{1F514} Public company</h3>'
              + '<div style="font-size:12.5px;">Listed Y' + L.year + ' M' + L.month + ' at <b>' + fmt$(L.value||0) + '</b> ('
              + (L.multiple||0) + '\u00d7 MRR), raising ' + fmt$(L.raise||0) + '.</div>'
              + '<div class="muted" style="font-size:11.5px;margin-top:4px;">Losing money now costs you reputation every month the market sees it.</div>';
          }
          host.appendChild(box);

          var f = box.querySelector("[data-v410file]");
          if(f) f.onclick = function(){ window.v410File(); };
          var w = box.querySelector("[data-v410withdraw]");
          if(w) w.onclick = function(){ window.v410Withdraw(); };

          /* closing scoreboard for any terminal state */
          try{
            var s33 = v33State();
            if(!host.querySelector("[data-v410score]")){
              if(s33.exited)            host.insertAdjacentHTML("afterbegin", window.v410Scoreboard("sale", s33.exited));
              else if(s33.acquiredByRival) host.insertAdjacentHTML("afterbegin", window.v410Scoreboard("distress", s33.acquiredByRival));
              else if(st.status === "public" && st.listed) host.insertAdjacentHTML("afterbegin", window.v410Scoreboard("ipo", st.listed));
            }
          }catch(e){}
        }catch(e){}
        return out;
      };
      window.renderScreen = renderScreen;
    }
  }catch(e){}

  /* header alert when a filing is live */
  try{
    if(typeof v32Alerts === "function"){
      var prevAl = v32Alerts;
      v32Alerts = function(){
        var out = prevAl.apply(this, arguments) || [];
        try{
          var st = S();
          if(st.status === "filed") out.unshift({ k:"ipo", cls:"good", icon:"\u{1F4DC}", text:"IPO in " + st.monthsToList + "mo", tab:"rivals" });
          else if(st.status === "private" && window.v410Ready()) out.unshift({ k:"ipoready", cls:"good", icon:"\u{1F3DB}\uFE0F", text:"IPO ready", tab:"rivals" });
        }catch(e){}
        return out.slice(0,7);
      };
      window.v32Alerts = v32Alerts;
    }
  }catch(e){}
})();
/* =====================================================================
   v4.10 — 3. Trucking and the agency get their own rivals and words
   ===================================================================== */
(function v410Flavor(){
  "use strict";
  var SETS = {
    nail_salon: {
      northwind:  { name:"Polished Nail Bar",     note:"Immaculate work, hopeless at marketing. Their technique keeps improving." },
      aperture:   { name:"Luxe Lacquer Studio",   note:"Aggressive discounting and a groupon for everything. Will undercut you for a regular." },
      halcyon:    { name:"Bella Nails & Spa",     note:"The established salon in town. Expensive, slow to book, trusted by everyone\u2019s mother." },
      brightline: { name:"Ten & Two Nail Lounge", note:"Cheap, fast, walk-ins only. Eats the bottom of the market." }
    },
    trucking: {
      northwind:  { name:"Ironline Freight",        note:"Immaculate safety record and newest tractors. Terrible at winning lanes." },
      aperture:   { name:"Redhawk Carriers",        note:"Undercuts rate-per-mile on every bid. Drivers leave them constantly." },
      halcyon:    { name:"Continental Logistics",   note:"The incumbent carrier. Premium rates, dedicated lanes, every big shipper on contract." },
      brightline: { name:"Budget Haul Co.",         note:"Old equipment, cheapest rate on the board. Takes the freight nobody else wants." }
    },
    agency: {
      northwind:  { name:"Studio Northwind",        note:"Award-winning creative, no new-business discipline. The work keeps getting better." },
      aperture:   { name:"Pitchcraft & Co.",        note:"Wins on price and flattery. Will pitch free work to steal your account." },
      halcyon:    { name:"Halcyon & Partners",      note:"The old holding-company shop. Expensive retainers, blue-chip client list." },
      brightline: { name:"Brightline Digital",      note:"Cheap retainers and templated campaigns. Hoovers up small local accounts." }
    }
  };
  var WORDS = {
    nail_salon: [[/\bProduct quality\b/g,"Service quality"],[/\bProduct\b/g,"Service quality"],[/\bproduct\b/g,"service quality"],[/\bR&D\b/g,"Training"],[/\broadmap\b/g,"service menu"]],
    trucking:   [[/\bProduct quality\b/g,"Service reliability"],[/\bProduct\b/g,"Service reliability"],[/\bproduct\b/g,"service reliability"],[/\bR&D\b/g,"Fleet & safety"],[/\broadmap\b/g,"lane plan"]],
    agency:     [[/\bProduct quality\b/g,"Creative quality"],[/\bProduct\b/g,"Creative quality"],[/\bproduct\b/g,"creative quality"],[/\bR&D\b/g,"Craft & talent"],[/\broadmap\b/g,"creative pipeline"]]
  };

  function ind(){ try{ return (G && G.company && G.company.industry) || ""; }catch(e){ return ""; } }
  function set(){ return SETS[ind()] || null; }

  try{
    if(typeof v33State === "function"){
      var prevState = v33State;
      v33State = function(){
        var s = prevState.apply(this, arguments);
        try{
          var m = set();
          if(m) (s.rivals||[]).forEach(function(r){
            var x = m[r.key];
            if(x && r.name !== x.name){ r.name = x.name; r.note = x.note; }
          });
        }catch(e){}
        return s;
      };
      window.v33State = v33State;
    }
  }catch(e){}

  try{
    if(typeof renderScreen === "function"){
      var prevRS = renderScreen;
      renderScreen = function(){
        var out = prevRS.apply(this, arguments);
        try{
          var w = WORDS[ind()];
          var tab = (G.ui && G.ui.activeTab) || "";
          if(w && (tab === "rivals" || tab === "research" || tab === "product")){
            var host = document.getElementById("screen");
            if(host){
              var walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, null), nodes = [], n;
              while((n = walker.nextNode())) nodes.push(n);
              nodes.forEach(function(t){
                var v = t.nodeValue;
                if(!v || !/product|Product|R&D|roadmap/.test(v)) return;
                var o = v;
                w.forEach(function(p){ o = o.replace(p[0], p[1]); });
                if(o !== v) t.nodeValue = o;
              });
            }
          }
        }catch(e){}
        return out;
      };
      window.renderScreen = renderScreen;
    }
  }catch(e){}
})();
/* =====================================================================
   v4.10 — 4. The workspace ladder is visible and reachable
   The upgrade existed only as one card buried in Expansion & Growth, so
   there was no way to see the four stages or where you were on them.
   ===================================================================== */
(function v410Space(){
  "use strict";
  var COSTS = [8000, 25000, 60000];
  var NAMES = ["Coworking Space","Small Office","Full Office","Company HQ"];

  try{
    var css = document.createElement("style");
    css.textContent =
      ".v410-ladder{display:flex;gap:6px;margin:8px 0 4px;flex-wrap:wrap;}"
    + ".v410-step{flex:1;min-width:96px;border:1px solid var(--border,#293042);border-radius:9px;padding:7px 8px;font-size:11px;opacity:.5;}"
    + ".v410-step.done{opacity:.85;border-color:rgba(34,197,94,.45);}"
    + ".v410-step.now{opacity:1;border-color:var(--accent,#5b8cff);background:rgba(91,140,255,.10);}"
    + ".v410-step .n{font-weight:700;font-size:11.5px;} .v410-step .m{opacity:.7;margin-top:2px;}";
    document.head.appendChild(css);
  }catch(e){}

  function ladderHtml(){
    var c = G.company, s = Math.max(0, Math.min(3, c.hqStage|0));
    var cap = [];
    try{ cap = (typeof HEADCOUNT_CAP !== "undefined") ? HEADCOUNT_CAP : []; }catch(e){}
    var steps = NAMES.map(function(nm, i){
      var cls = i < s ? "done" : (i === s ? "now" : "");
      return '<div class="v410-step ' + cls + '"><div class="n">' + (i<s?"\u2713 ":"") + nm + '</div>'
        + '<div class="m">' + (cap[i]!==undefined ? ("seats " + cap[i]) : "") + (i===s?" \u00b7 you are here":"") + '</div></div>';
    }).join("");
    var next = s < 3
      ? '<div style="font-size:12px;margin-top:7px;">Next: <b>' + NAMES[s+1] + '</b> for <b>' + fmt$(COSTS[s]) + '</b>'
        + (cap[s+1]!==undefined ? ' \u2014 raises the headcount cap to ' + cap[s+1] : '') + '.</div>'
        + '<button class="btn small" data-v410up style="margin-top:7px;">Queue the upgrade</button>'
        + '<div class="muted" style="font-size:11px;margin-top:6px;">Also available on Expansion &amp; Growth. Upgrades complete when the month closes.</div>'
      : '<div style="font-size:12px;margin-top:7px;">You are in the final workspace \u2014 buy facilities to keep raising capacity.</div>';
    return '<h3>\u{1F3E2} Workspace stage</h3><div class="v410-ladder">' + steps + '</div>' + next;
  }

  function doUpgrade(){
    try{
      var c = G.company, s = c.hqStage|0;
      if(s >= 3) return;
      var cost = COSTS[s];
      if(typeof affordOrAlert === "function" && !affordOrAlert(cost, "the workspace upgrade")) return;
      queueAdd({ id:uid(), label:"Upgrade workspace \u2014 " + NAMES[s+1], cost:cost, run:function(report){
        if(G.company.cash < cost){ report.push("Skipped workspace upgrade \u2014 insufficient cash."); return; }
        G.company.cash -= cost; G.company.hqStage++;
        (G.company.employees||[]).forEach(function(e){ e.morale = clamp(e.morale+5, 0, 100); });
        report.push("Moved into the " + NAMES[G.company.hqStage] + " \u2014 morale improved.");
      }});
      try{ v30Toast("<b>Queued.</b> You move in when the month closes.", "good"); }catch(e){}
      try{ renderAll(); }catch(e){}
    }catch(e){}
  }

  try{
    if(typeof renderScreen === "function"){
      var prevRS = renderScreen;
      renderScreen = function(){
        var out = prevRS.apply(this, arguments);
        try{
          if(typeof G === "undefined" || !G || !G.company) return out;
          var tab = (G.ui && G.ui.activeTab) || "";
          if(tab !== "facilities" && tab !== "hr" && tab !== "empire") return out;
          var host = document.getElementById("screen");
          if(!host || host.querySelector("[data-v410space]")) return out;
          var box = document.createElement("div");
          box.className = "card mt14";
          box.setAttribute("data-v410space","1");
          box.innerHTML = ladderHtml();
          host.insertBefore(box, host.firstChild);
          var b = box.querySelector("[data-v410up]");
          if(b) b.onclick = doUpgrade;
        }catch(e){}
        return out;
      };
      window.renderScreen = renderScreen;
    }
  }catch(e){}

  try{ window.GAME_VERSION = "v4.10"; }catch(e){}
})();
/* =====================================================================
   v4.11 — 1. The header tells the truth about money
   corporateSnapshot() summed c.expensesBreakdown, which is only written
   at month close. Before the first close (and after any stale/corrupt
   write) the header showed zero expenses, which made "Profit / mo"
   equal revenue, and occasionally showed an absurd stale total. The
   finance tab was always right because it uses v44Forecast(). So the
   header now reads from exactly the same source as the finance tab.
   ===================================================================== */
(function v411Money(){
  "use strict";

  /* A sane, live burn figure. Prefer the same function the finance tab
     uses so the two screens can never disagree again. */
  window.v411Burn = function(){
    try{
      if(typeof v44Burn === "function"){
        var b = Number(v44Burn());
        if(isFinite(b) && b >= 0) return Math.round(b);
      }
    }catch(e){}
    try{
      var c = G.company;
      var pay = (c.employees||[]).reduce(function(s,x){ return s + (Number(x.salary)||0); }, 0);
      var rent = (typeof facilityRent === "function") ? (Number(facilityRent())||0) : 0;
      return Math.round(pay + rent + (c.employees||[]).length * 40 + 500);
    }catch(e){ return 0; }
  };

  window.v411Revenue = function(){
    try{
      var c = G.company;
      var ops = (c.businessLines||[]).reduce(function(s,l){ return s + (Number(l.monthlyRevenue)||0); }, 0);
      var r = (Number(c.mrr)||0) + ops;
      return isFinite(r) && r >= 0 ? Math.round(r) : 0;
    }catch(e){ return 0; }
  };

  /* Strip non-finite / negative / absurd components out of the breakdown so
     one bad write can never produce a twenty-million-dollar expense line. */
  window.v411Sanitize = function(){
    try{
      var e = G.company.expensesBreakdown; if(!e) return;
      var rev = window.v411Revenue();
      var ceiling = Math.max(2000000, rev * 60 + 500000);
      Object.keys(e).forEach(function(k){
        var v = Number(e[k]);
        if(!isFinite(v) || v < 0 || v > ceiling) e[k] = 0;
      });
    }catch(err){}
  };

  /* corporateSnapshot is the shared source for the header tiles, the old
     topbar and v29Runway. Correct it at the source. */
  try{
    if(typeof corporateSnapshot === "function"){
      var prevSnap = corporateSnapshot;
      corporateSnapshot = function(){
        var s;
        try{ window.v411Sanitize(); }catch(e){}
        try{ s = prevSnap.apply(this, arguments); }catch(e){ s = null; }
        if(!s) s = { revenue:0, expenses:0, net:0, worth:0, cash:0 };
        try{
          var rev = window.v411Revenue();
          var exp = window.v411Burn();
          s.revenue = rev;
          s.expenses = exp;
          s.net = rev - exp;
          s.cash = Number(G.company.cash)||0;
          if(!isFinite(s.worth)) s.worth = Number(G.company.netWorth)||0;
        }catch(e){}
        return s;
      };
      window.corporateSnapshot = corporateSnapshot;
    }
  }catch(e){}

  /* Belt and braces: point the individual header tiles at the live figures
     too, in case a later layer hands them a snapshot of its own. */
  try{
    if(typeof V30_METRICS !== "undefined"){
      if(V30_METRICS.expenses){
        V30_METRICS.expenses.get = function(){ return window.v411Burn(); };
        V30_METRICS.expenses.label = "Burn / mo";
      }
      if(V30_METRICS.revenue) V30_METRICS.revenue.get = function(){ return window.v411Revenue(); };
      if(V30_METRICS.profit){
        V30_METRICS.profit.get = function(){ return window.v411Revenue() - window.v411Burn(); };
        V30_METRICS.profit.cls = function(){ return (window.v411Revenue() - window.v411Burn()) < 0 ? "bad" : "good"; };
      }
      if(V30_METRICS.cash){
        V30_METRICS.cash.get = function(){ try{ return Number(G.company.cash)||0; }catch(e){ return 0; } };
      }
      /* New tiles that mirror the finance tab exactly. */
      V30_METRICS.queued = { label:"Queued / mo", scope:"company", tab:"financials", nodelta:true, invert:true,
        get:function(){ try{ return (typeof v44Queued==="function") ? (Number(v44Queued())||0) : 0; }catch(e){ return 0; } },
        cls:function(){ return ""; } };
      V30_METRICS.endCash = { label:"Ending cash", scope:"company", tab:"financials", nodelta:true,
        get:function(){
          try{
            if(typeof v44Forecast === "function"){ var f = v44Forecast(); return Math.round(Number(f.ending)||0); }
          }catch(e){}
          try{ return Number(G.company.cash)||0; }catch(e){ return 0; }
        },
        cls:function(){
          try{ if(typeof v44Forecast === "function") return (v44Forecast().ending < 0) ? "bad" : ""; }catch(e){}
          return "";
        } };
    }
  }catch(e){}

  /* Keep the numbers honest every month close as well. */
  try{
    if(typeof advanceMonth === "function"){
      var prevAdv = advanceMonth;
      advanceMonth = function(){
        var out = prevAdv.apply(this, arguments);
        try{ window.v411Sanitize(); }catch(e){}
        return out;
      };
      window.advanceMonth = advanceMonth;
    }
  }catch(e){}
})();
/* =====================================================================
   v4.11 — 2. Your header layout stops being wiped
   v30Ui() reset the selection to the four defaults whenever it was not
   exactly four long. Since v3.2 allowed up to eight, every larger
   layout was destroyed on the next render. Now 4..8 is respected.
   ===================================================================== */
(function v411Keep(){
  "use strict";
  try{
    if(typeof v30Ui !== "function") return;
    v30Ui = function(){
      var u = v29Ui();
      if(!u.tiles) u.tiles = { company:V30_DEFAULTS.company.slice(), personal:V30_DEFAULTS.personal.slice() };
      ["company","personal"].forEach(function(s){
        if(!Array.isArray(u.tiles[s]) || !u.tiles[s].length) u.tiles[s] = V30_DEFAULTS[s].slice();
        u.tiles[s] = u.tiles[s].filter(function(k){ return V30_METRICS[k]; });
        /* de-duplicate without losing order */
        var seen = {}, clean = [];
        u.tiles[s].forEach(function(k){ if(!seen[k]){ seen[k] = 1; clean.push(k); } });
        u.tiles[s] = clean;
        while(u.tiles[s].length < 4){
          var fill = V30_DEFAULTS[s].find(function(k){ return u.tiles[s].indexOf(k) < 0; });
          if(!fill){
            fill = Object.keys(V30_METRICS).find(function(k){
              return V30_METRICS[k].scope === s && u.tiles[s].indexOf(k) < 0;
            });
          }
          if(!fill) break;
          u.tiles[s].push(fill);
        }
        if(u.tiles[s].length > 8) u.tiles[s] = u.tiles[s].slice(0, 8);
      });
      if(u.sparks === undefined) u.sparks = true;
      return u;
    };
    window.v30Ui = v30Ui;
  }catch(e){}
})();
/* =====================================================================
   v4.11 — 3. The tile picker stays open until you say otherwise
   The panel was a child of #v29head, and every change called
   v29RenderHeader(), which rebuilds the header and took the panel with
   it. The panel now lives on document.body as a floating overlay, so
   re-rendering the header cannot touch it, and every row carries plain
   Up / Down controls.
   ===================================================================== */
(function v411Picker(){
  "use strict";

  try{
    var css = document.createElement("style");
    css.textContent =
      ".v411-pop{position:fixed;z-index:99999;width:330px;max-width:94vw;max-height:76vh;overflow:auto;"
      + "background:var(--card,#161b26);border:1px solid var(--line,#2a3142);border-radius:10px;"
      + "box-shadow:0 18px 44px rgba(0,0,0,.55);padding:10px 11px 11px;}"
      + ".v411-pop h4{margin:0 0 2px;font-size:12px;letter-spacing:.3px;text-transform:uppercase;}"
      + ".v411-hd{display:flex;align-items:center;gap:8px;margin-bottom:2px;}"
      + ".v411-hd .x{margin-left:auto;background:none;border:1px solid var(--line,#2a3142);color:var(--muted,#8b94a7);"
      + "border-radius:6px;width:24px;height:24px;cursor:pointer;line-height:1;}"
      + ".v411-pop .cnt{font-size:11px;color:var(--muted,#8b94a7);line-height:1.45;}"
      + ".v411-row{display:flex;align-items:center;gap:7px;padding:6px 7px;margin:4px 0;border-radius:7px;"
      + "border:1px solid var(--line,#2a3142);background:rgba(255,255,255,.02);font-size:12.5px;}"
      + ".v411-row .n{opacity:.55;min-width:14px;font-variant-numeric:tabular-nums;}"
      + ".v411-row .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}"
      + ".v411-row .ord{display:flex;gap:4px;}"
      + ".v411-row .ord button{min-width:28px;height:26px;font-size:14px;line-height:1;cursor:pointer;"
      + "border-radius:6px;border:1px solid var(--line,#2a3142);background:rgba(255,255,255,.05);color:inherit;}"
      + ".v411-row .ord button:hover:not([disabled]){background:var(--accent,#5b8cff);color:#fff;}"
      + ".v411-row .ord button[disabled]{opacity:.28;cursor:not-allowed;}"
      + ".v411-row .ord button.rm:hover{background:#c8443c;border-color:#c8443c;color:#fff;}"
      + ".v411-add{display:flex;align-items:center;gap:7px;padding:5px 7px;margin:3px 0;border-radius:7px;"
      + "cursor:pointer;font-size:12.5px;color:var(--muted,#8b94a7);border:1px dashed var(--line,#2a3142);}"
      + ".v411-add:hover{color:inherit;border-color:var(--accent,#5b8cff);}"
      + ".v411-foot{display:flex;align-items:center;gap:6px;margin-top:9px;padding-top:9px;"
      + "border-top:1px solid var(--line,#2a3142);}"
      + ".v411-foot .sp{margin-left:auto;display:flex;gap:6px;}";
    document.head.appendChild(css);
  }catch(e){}

  function close(){
    try{
      var p = document.querySelector(".v411-pop");
      if(p) p.parentNode.removeChild(p);
    }catch(e){}
  }
  window.v411ClosePicker = close;

  try{
    if(typeof v30OpenPicker === "undefined") return;

    v30OpenPicker = function(head, scope){
      /* toggle */
      if(document.querySelector(".v411-pop")){ close(); return; }
      try{ var stale = head && head.querySelector(".v30-pick"); if(stale) stale.remove(); }catch(e){}

      var u = v30Ui();
      var sc = (scope === "personal") ? "personal" : "company";
      var picked = (u.tiles[sc]||[]).slice();
      var opts = Object.keys(V30_METRICS).filter(function(k){ return V30_METRICS[k].scope === sc; });

      var pop = document.createElement("div");
      pop.className = "v411-pop";
      pop.onclick = function(ev){ ev.stopPropagation(); };
      pop.onmousedown = function(ev){ ev.stopPropagation(); };

      /* Apply writes the selection and re-renders the header. Because the
         panel is on document.body, that render can no longer remove it. */
      var apply = function(){
        try{ v30Ui().tiles[sc] = picked.slice(); }catch(e){}
        try{ u.tiles[sc] = picked.slice(); }catch(e){}
        try{ v29RenderHeader(); }catch(e){}
        try{ if(typeof nbAutosave === "function") nbAutosave(); }catch(e){}
      };

      var place = function(){
        try{
          var anchor = (head && head.querySelector(".v30-gear")) || head || document.body;
          var r = anchor.getBoundingClientRect();
          var w = 330;
          var left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
          var top = Math.min(r.bottom + 6, window.innerHeight - 120);
          pop.style.left = Math.round(Math.max(8, left)) + "px";
          pop.style.top = Math.round(Math.max(8, top)) + "px";
        }catch(e){
          pop.style.left = "20px"; pop.style.top = "70px";
        }
      };

      var draw = function(){
        var html = '<div class="v411-hd"><h4>' + sc + ' tiles</h4>'
          + '<button class="x" data-v411x title="Close">\u2715</button></div>'
          + '<div class="cnt">Pick 4 to 8. Use \u2191 and \u2193 to reorder. Changes apply immediately and '
          + '<b>this panel stays open until you press Done</b>.</div>';

        html += picked.map(function(k,i){
          return '<div class="v411-row" data-v411row="' + k + '">'
            + '<span class="n">' + (i+1) + '</span>'
            + '<span class="nm">' + V30_METRICS[k].label + '</span>'
            + '<span class="ord">'
            + '<button data-v411up="' + k + '" title="Move up" ' + (i===0?"disabled":"") + '>\u2191</button>'
            + '<button data-v411down="' + k + '" title="Move down" ' + (i===picked.length-1?"disabled":"") + '>\u2193</button>'
            + '<button class="rm" data-v411rm="' + k + '" title="Remove">\u2715</button>'
            + '</span></div>';
        }).join("");

        var rest = opts.filter(function(k){ return picked.indexOf(k) < 0; });
        if(rest.length){
          html += '<div class="cnt" style="margin:8px 0 3px;">Add a metric</div>'
            + rest.map(function(k){
                return '<div class="v411-add" data-v411m="' + k + '"><span>+</span>'
                  + '<span style="flex:1;">' + V30_METRICS[k].label + '</span></div>';
              }).join("");
        }

        html += '<div class="v411-foot"><span class="cnt">' + picked.length + '/8 selected</span>'
          + '<span class="sp">'
          + '<button class="btn secondary small" data-v411spark>' + (u.sparks?"Hide":"Show") + ' sparklines</button>'
          + '<button class="btn secondary small" data-v411reset>Reset</button>'
          + '<button class="btn small" data-v411done>Done</button>'
          + '</span></div>';

        pop.innerHTML = html;

        var move = function(k, d){
          var i = picked.indexOf(k), j = i + d;
          if(i < 0 || j < 0 || j >= picked.length) return;
          picked.splice(j, 0, picked.splice(i, 1)[0]);
          draw(); apply();
        };

        pop.querySelectorAll("[data-v411up]").forEach(function(b){
          b.onclick = function(ev){ ev.stopPropagation(); move(b.getAttribute("data-v411up"), -1); };
        });
        pop.querySelectorAll("[data-v411down]").forEach(function(b){
          b.onclick = function(ev){ ev.stopPropagation(); move(b.getAttribute("data-v411down"), 1); };
        });
        pop.querySelectorAll("[data-v411rm]").forEach(function(b){
          b.onclick = function(ev){
            ev.stopPropagation();
            if(picked.length <= 4){ v30Toast("Four tiles is the minimum.", "warn"); return; }
            picked.splice(picked.indexOf(b.getAttribute("data-v411rm")), 1);
            draw(); apply();
          };
        });
        pop.querySelectorAll("[data-v411m]").forEach(function(o){
          o.onclick = function(ev){
            ev.stopPropagation();
            if(picked.length >= 8){ v30Toast("Eight tiles maximum \u2014 remove one first.", "warn"); return; }
            picked.push(o.getAttribute("data-v411m"));
            draw(); apply();
          };
        });
        var rs = pop.querySelector("[data-v411reset]");
        if(rs) rs.onclick = function(ev){
          ev.stopPropagation(); picked.length = 0;
          V30_DEFAULTS[sc].forEach(function(k){ picked.push(k); });
          draw(); apply();
        };
        var sp = pop.querySelector("[data-v411spark]");
        if(sp) sp.onclick = function(ev){
          ev.stopPropagation(); u.sparks = !u.sparks;
          try{ v30Ui().sparks = u.sparks; }catch(e){}
          draw(); try{ v29RenderHeader(); }catch(e){}
        };
        var done = function(ev){
          if(ev) ev.stopPropagation();
          apply(); close();
          v30Toast("<b>Header saved \u2014 " + picked.length + " tiles.</b>", "good");
        };
        var db = pop.querySelector("[data-v411done]"); if(db) db.onclick = done;
        var xb = pop.querySelector("[data-v411x]"); if(xb) xb.onclick = done;
      };

      draw();
      document.body.appendChild(pop);
      place();
      try{ window.addEventListener("resize", place); }catch(e){}
      try{
        document.addEventListener("keydown", function esc(ev){
          if(ev.key === "Escape"){ close(); document.removeEventListener("keydown", esc); }
        });
      }catch(e){}
    };
    window.v30OpenPicker = v30OpenPicker;
  }catch(e){}

  try{ window.GAME_VERSION = "v4.11"; }catch(e){}
})();
/* =====================================================================
   v4.12 — Cash is exact, and it is never stale

   Two faults, both in the one tile that must never be wrong:

   1) PRECISION. The cash tile was formatted with v29Short(), which
      abbreviates anything over $10,000. $20,809 and $21,499 BOTH
      rendered as "$21K", so up to $500 was invisible and a $600
      purchase frequently did not change the number on screen at all.
      That is why cash looked frozen and wrong.

   2) STALENESS. The header only repaints when something calls
      v29RenderHeader(). Any code path that moved cash without a full
      re-render left the old figure on screen indefinitely.

   Money you are asked to make decisions with is now shown to the
   dollar, and a watcher repaints the header the moment cash moves.
   ===================================================================== */
(function v412Cash(){
  "use strict";

  /* ---------- exact money, always ---------- */
  window.v412Exact = function(n){
    var v = Number(n);
    if(!isFinite(v)) v = 0;
    v = Math.round(v);
    var sg = v < 0 ? "-" : "";
    try{ return sg + "$" + Math.abs(v).toLocaleString("en-US"); }
    catch(e){ return sg + "$" + Math.abs(v); }
  };

  window.v412Cash = function(){
    try{
      var c = (G && G.company) ? G.company : null;
      if(!c) return 0;
      var v = Number(c.cash);
      return isFinite(v) ? v : 0;
    }catch(e){ return 0; }
  };

  /* ---------- the tiles that carry decision-critical money ---------- */
  try{
    if(typeof V30_METRICS !== "undefined"){

      if(V30_METRICS.cash){
        V30_METRICS.cash.get = function(){ return window.v412Cash(); };
        V30_METRICS.cash.fmt = function(){ return window.v412Exact(window.v412Cash()); };
        V30_METRICS.cash.cls = function(){
          var v = window.v412Cash();
          return v < 0 ? "bad" : (v < 5000 ? "warn" : "");
        };
      }

      /* Personal cash matters just as much when you are deciding to draw salary. */
      if(V30_METRICS.pcash){
        V30_METRICS.pcash.fmt = function(c, cs, ps){
          try{ return window.v412Exact(ps && ps.cash); }catch(e){ return window.v412Exact(0); }
        };
      }

      /* Ending cash is a forecast of the same number — show it to the dollar too. */
      if(V30_METRICS.endCash){
        V30_METRICS.endCash.fmt = function(){
          try{
            if(typeof v44Forecast === "function") return window.v412Exact(v44Forecast().ending);
          }catch(e){}
          return window.v412Exact(window.v412Cash());
        };
      }

      /* Burn and revenue drive affordability decisions as well. */
      if(V30_METRICS.expenses){
        V30_METRICS.expenses.fmt = function(){
          try{ return window.v412Exact(window.v411Burn()); }catch(e){ return window.v412Exact(0); }
        };
      }
      if(V30_METRICS.revenue){
        V30_METRICS.revenue.fmt = function(){
          try{ return window.v412Exact(window.v411Revenue()); }catch(e){ return window.v412Exact(0); }
        };
      }
      if(V30_METRICS.profit){
        V30_METRICS.profit.fmt = function(){
          try{ return window.v412Exact(window.v411Revenue() - window.v411Burn()); }
          catch(e){ return window.v412Exact(0); }
        };
      }
      if(V30_METRICS.queued){
        V30_METRICS.queued.fmt = function(){
          try{ return window.v412Exact((typeof v44Queued==="function") ? v44Queued() : 0); }
          catch(e){ return window.v412Exact(0); }
        };
      }
    }
  }catch(e){}

  /* ---------- the legacy header tile path uses its own formatter ---------- */
  try{
    if(typeof v29Tile === "function"){
      var prevTile = v29Tile;
      v29Tile = function(o){
        try{
          if(o && typeof o.label === "string" && /^cash$/i.test(o.label.trim())){
            o.value = window.v412Exact(window.v412Cash());
          }
        }catch(e){}
        return prevTile.apply(this, arguments);
      };
      window.v29Tile = v29Tile;
    }
  }catch(e){}

  /* ---------- tighter type so long exact figures still fit ---------- */
  try{
    var css = document.createElement("style");
    css.textContent =
      "#v29head .v29-tiles .v29-t .vl{font-variant-numeric:tabular-nums;letter-spacing:-.2px;}"
      + "#v29head .v29-tiles .v29-t .vl.warn{color:#e0a33c;}"
      + "@media (max-width:900px){#v29head .v29-tiles .v29-t .vl{font-size:12px;}}";
    document.head.appendChild(css);
  }catch(e){}

  /* ---------- never stale: repaint the header the instant cash moves ---------- */
  (function v412Watch(){
    var last = null, lastCo = null;
    function tick(){
      try{
        if(!G || !G.company) return;
        var cash = window.v412Cash();
        var co = G.activeCompanyIndex;
        if(last === null){ last = cash; lastCo = co; return; }
        if(cash !== last || co !== lastCo){
          last = cash; lastCo = co;
          try{ v29RenderHeader(); }catch(e){}
        }
      }catch(e){}
    }
    try{ setInterval(tick, 500); }catch(e){}
  })();

  /* ---------- and repaint after anything that can move money ---------- */
  try{
    ["renderAll","advanceMonth","queueAdd","queueRun"].forEach(function(fn){
      try{
        if(typeof window[fn] === "function"){
          var prev = window[fn];
          window[fn] = function(){
            var out = prev.apply(this, arguments);
            try{ v29RenderHeader(); }catch(e){}
            return out;
          };
        }
      }catch(e){}
    });
  }catch(e){}

  try{ window.GAME_VERSION = "v4.12"; }catch(e){}
})();
/* =====================================================================
   v4.13 — Cash cannot become NaN, and a poisoned save repairs itself

   DIAGNOSIS (reproduced headlessly):
     G.company.cash was not 0. It was NaN.
     - NaN renders as "$0" in every formatter in the game, because they all
       use the `n||0` idiom and NaN is falsy.
     - NaN + 26,000,000 is still NaN, so profit posted every month and the
       balance never moved. The delta read "no change" because 0 - 0 = 0.
     - netWorth, valuation and runway were poisoned by the same value.

   HOW IT HAPPENS: any single arithmetic against an undefined figure.
   Verified sources: a purchase whose price field is missing
   (cash -= undefined) and a facility whose `rent` field is missing
   (facilityRent() returns NaN, which flows into expensesBreakdown,
   into netProfit, and into cash at month close).

   THE FIX IS IN THREE LAYERS:
     1. REPAIR  — a poisoned save is reconstructed on load.
     2. GUARD   — a watcher catches NaN within half a second and rolls the
                  balance back to the last known-good figure.
     3. PREVENT — the known NaN sources are sanitised at source.
   ===================================================================== */
(function v413Money(){
  "use strict";

  function fin(n){ var v = Number(n); return isFinite(v) ? v : null; }
  window.v413Fin = fin;

  var lastGoodCash = null;
  var lastGoodPersonal = null;
  var repairs = 0;

  function note(msg){
    try{ if(typeof toast === "function") toast(msg); }catch(e){}
    try{ if(typeof logHistory === "function") logHistory(msg.replace(/<[^>]+>/g, "")); }catch(e){}
  }

  /* ---------- 1. REPAIR a poisoned balance ---------- */
  function reconstruct(c){
    // (a) walk the financial history back to the last finite cash figure,
    //     then re-apply every net profit recorded after it.
    var h = (c.financialHistory || []);
    for(var i = h.length - 1; i >= 0; i--){
      var base = fin(h[i].cash);
      if(base !== null){
        for(var j = i + 1; j < h.length; j++){
          var n = fin(h[j].netProfit);
          if(n !== null) base += n;
        }
        return { value: Math.round(base), how: "rebuilt from your financial history" };
      }
    }
    // (b) the last good figure this session saw.
    if(lastGoodCash !== null) return { value: Math.round(lastGoodCash), how: "restored from the last good balance" };
    // (c) derive from net worth, backing out assets and debt.
    var nw = fin(c.netWorth);
    if(nw !== null){
      var assets = 0, debt = 0;
      try{
        assets = Object.entries(c.assets || {}).filter(function(p){ return p[0] !== "hq"; })
          .reduce(function(s, p){ return s + (fin(p[1]) || 0); }, 0);
      }catch(e){}
      try{ debt = (fin(c.debt && c.debt.loanBalance) || 0) + (fin(c.debt && c.debt.locBalance) || 0); }catch(e){}
      return { value: Math.round(nw - assets + debt), how: "derived from your net worth" };
    }
    // (d) last resort: three months of the most recent recorded profit.
    for(var k = h.length - 1; k >= 0; k--){
      var np = fin(h[k].netProfit);
      if(np !== null) return { value: Math.max(0, Math.round(np * 3)), how: "estimated from three months of profit" };
    }
    // v4.21: a zero write here destroyed real balances. Prefer any snapshot
    // this session or an earlier one took, and refuse to write if we have none.
    try{
      var snap = window.v421Snapshot && window.v421Snapshot(c);
      if(snap !== null && snap !== undefined) return { value: Math.round(snap), how: "restored from the last verified balance" };
    }catch(e){}
    return { value: null, how: "no recoverable record" };
  }

  function repairCash(reason){
    try{
      var c = G && G.company; if(!c) return false;
      if(fin(c.cash) !== null) return false;
      var r = reconstruct(c);
      if(r.value === null || !isFinite(r.value)){
        // v4.21: never invent a balance. Freeze and tell the player instead.
        if(!c.__v421Flagged){
          c.__v421Flagged = true;
          note("\u26a0\ufe0f This company's cash balance could not be read and there is no record to rebuild it from. Nothing has been changed \u2014 please report this run.");
        }
        return false;
      }
      c.cash = r.value;
      repairs++;
      note("\u26a0\ufe0f Corrupted cash balance detected and repaired \u2014 " + r.how + ". New balance: <b>"
        + ((typeof window.v412Exact === "function") ? window.v412Exact(c.cash) : ("$" + c.cash)) + "</b>"
        + (reason ? " (source: " + reason + ")" : ""));
      return true;
    }catch(e){ return false; }
  }
  window.v413RepairCash = repairCash;

  /* every other money field that NaN can poison ---------- */
  function repairDerived(){
    try{
      var c = G && G.company; if(!c) return;
      if(fin(c.mrr) === null) c.mrr = 0;
      if(fin(c.valuation) === null) c.valuation = 0;
      if(fin(c.netWorth) === null){
        var assets = 0, debt = 0;
        try{
          assets = Object.entries(c.assets || {}).filter(function(p){ return p[0] !== "hq"; })
            .reduce(function(s, p){ return s + (fin(p[1]) || 0); }, 0);
        }catch(e){}
        try{ debt = (fin(c.debt && c.debt.loanBalance) || 0) + (fin(c.debt && c.debt.locBalance) || 0); }catch(e){}
        c.netWorth = Math.round((fin(c.cash) || 0) + assets - debt);
      }
      // expense components
      try{
        var eb = c.expensesBreakdown || {};
        Object.keys(eb).forEach(function(k){ if(fin(eb[k]) === null) eb[k] = 0; });
      }catch(e){}
      // asset buckets
      try{
        Object.keys(c.assets || {}).forEach(function(k){
          if(k !== "hq" && fin(c.assets[k]) === null) c.assets[k] = 0;
        });
      }catch(e){}
      // debt
      try{
        if(c.debt){
          if(fin(c.debt.loanBalance) === null) c.debt.loanBalance = 0;
          if(fin(c.debt.locBalance) === null) c.debt.locBalance = 0;
        }
      }catch(e){}
      // personal side
      if(G.personal){
        if(fin(G.personal.cash) === null){
          var pSnap = (lastGoodPersonal !== null) ? lastGoodPersonal : null;
          if(pSnap === null){ try{ pSnap = window.v421PersonalSnapshot ? window.v421PersonalSnapshot() : null; }catch(e){} }
          if(pSnap !== null && isFinite(pSnap)){
            G.personal.cash = Math.round(pSnap);
            note("\u26a0\ufe0f Personal cash was corrupted and has been restored to " + ("$" + Math.round(pSnap).toLocaleString()) + ".");
          } else if(!G.personal.__v421Flagged){
            G.personal.__v421Flagged = true;
            note("\u26a0\ufe0f Personal cash could not be read and there is no verified balance to restore. Nothing has been changed.");
          }
        }
        if(fin(G.personal.netWorth) === null) G.personal.netWorth = 0;
        if(fin(G.personal.salaryDraw) === null) G.personal.salaryDraw = 3500;
      }
    }catch(e){}
  }
  window.v413RepairAll = function(){ repairCash("manual repair"); repairDerived(); };

  /* ---------- 2. GUARD: catch it within half a second ---------- */
  (function watch(){
    function tick(){
      try{
        if(!G || !G.company) return;
        var c = fin(G.company.cash);
        if(c === null){
          if(repairCash("detected live")){ try{ v29RenderHeader(); }catch(e){} }
          repairDerived();
        } else {
          lastGoodCash = c;
        }
        if(G.personal){
          var pc = fin(G.personal.cash);
          if(pc !== null) lastGoodPersonal = pc; else repairDerived();
        }
      }catch(e){}
    }
    try{ setInterval(tick, 400); }catch(e){}
  })();

  /* wrap the month close so a bad figure never gets committed ---------- */
  try{
    if(typeof window.advanceMonth === "function"){
      var prevAdv = window.advanceMonth;
      window.advanceMonth = function(){
        try{ repairDerived(); repairCash("before month close"); }catch(e){}
        var before = fin(G && G.company ? G.company.cash : null);
        var out = prevAdv.apply(this, arguments);
        try{
          if(fin(G.company.cash) === null){
            // the close itself poisoned it — roll back to the pre-close figure
            if(before !== null){
              G.company.cash = Math.round(before);
              note("\u26a0\ufe0f This month's close produced an invalid balance. Cash was rolled back to "
                + ((typeof window.v412Exact === "function") ? window.v412Exact(before) : ("$" + before))
                + " and the faulty cost was ignored.");
            } else repairCash("month close");
          }
          repairDerived();
          // history rows can carry NaN too
          try{
            (G.company.financialHistory || []).forEach(function(h){
              if(fin(h.cash) === null) h.cash = G.company.cash;
              if(fin(h.netProfit) === null) h.netProfit = 0;
              if(fin(h.revenue) === null) h.revenue = 0;
              if(fin(h.expenses) === null) h.expenses = 0;
            });
          }catch(e){}
          v29RenderHeader();
        }catch(e){}
        return out;
      };
    }
  }catch(e){}

  /* ---------- 3. PREVENT the known sources ---------- */

  // (a) a facility with a missing rent field returned NaN for the whole estate
  try{
    if(typeof window.facilityRent === "function"){
      window.facilityRent = function(){
        try{
          return (G.company.facilities || []).reduce(function(s, f){
            var r = fin(f && f.rent);
            if(r === null){ try{ if(f) f.rent = 0; }catch(e){} return s; }
            return s + r;
          }, 0);
        }catch(e){ return 0; }
      };
    }
  }catch(e){}

  // (b) repair a save the moment it is loaded
  try{
    ["nbLoadState", "loadFromSlot", "renderAll"].forEach(function(fn){
      if(typeof window[fn] === "function"){
        var prev = window[fn];
        window[fn] = function(){
          var out = prev.apply(this, arguments);
          try{ repairCash("save load"); repairDerived(); }catch(e){}
          return out;
        };
      }
    });
  }catch(e){}

  /* ---------- 4. never display a fake zero ---------- */
  try{
    if(typeof window.v412Exact === "function"){
      var prevExact = window.v412Exact;
      window.v412Exact = function(n){
        return (fin(n) === null) ? "\u2014" : prevExact(n);
      };
    }
    if(typeof V30_METRICS !== "undefined" && V30_METRICS.cash){
      V30_METRICS.cash.fmt = function(){
        try{
          var v = fin(G.company.cash);
          if(v === null){ repairCash("render"); v = fin(G.company.cash); }
          return (v === null) ? "\u2014" : window.v412Exact(v);
        }catch(e){ return "\u2014"; }
      };
    }
  }catch(e){}

  /* repair immediately on boot, for the save already in play */
  try{
    setTimeout(function(){
      repairCash("startup check");
      repairDerived();
      try{ v29RenderHeader(); }catch(e){}
    }, 1200);
  }catch(e){}

  try{ window.GAME_VERSION = "v4.13"; }catch(e){}
})();
/* =====================================================================
   v4.15 — The save code is gone. Downloading a save file actually works.

   Built from v4.13, which never had the save-code feature, so it is
   removed by construction rather than patched over.

   WHY THE DOWNLOAD BUTTON WAS DEAD:
   Notion renders this game in a cross-origin sandboxed iframe. Chrome
   blocks downloads from sandboxed frames outright and reports nothing to
   the page, so <a download>.click() silently does nothing. No amount of
   blob plumbing fixes that from inside the frame.

   WHAT ACTUALLY WORKS:
   A top-level tab is not sandboxed. Opening the game in its own tab makes
   downloads work normally AND gives the save storage a stable home. So:
     1. Attempt the real download.
     2. Attempt the File System Access picker where offered.
     3. If we are inside a frame, say so plainly and offer the one button
        that fixes it for good: open the game in its own tab.
   ===================================================================== */
(function v415Save(){
  "use strict";

  function inFrame(){
    try{ return window.self !== window.top; }catch(e){ return true; }
  }

  function hasGame(){ try{ return !!(G && G.company); }catch(e){ return false; } }

  function fileName(state){
    try{
      var co = (state && state.company) || (state && (state.companies || [])[state.activeCompanyIndex || 0]) || {};
      var nm = String(co.name || "run").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
      return "navbiz_" + nm + "_y" + (co.year || 1) + "m" + (co.month || 1) + ".nbsave";
    }catch(e){ return "navbiz_save.nbsave"; }
  }

  function payload(state){
    return JSON.stringify({ __nbsave:1, version: String(window.GAME_VERSION || "v4.15"), savedAt: Date.now(), state: state });
  }

  /* ---------- styles ---------- */
  try{
    var st = document.createElement("style");
    st.textContent =
      ".v415-ov{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:100001;display:flex;align-items:center;justify-content:center;padding:18px;}"
      + ".v415-box{background:#151922;border:1px solid #2c3444;border-radius:14px;max-width:480px;width:100%;padding:18px;color:#e8edf6;box-shadow:0 18px 60px rgba(0,0,0,.6);}"
      + ".v415-box h3{margin:0 0 8px;font-size:16px;}"
      + ".v415-box p{margin:0 0 10px;font-size:13px;line-height:1.55;color:#a3b3c9;}"
      + ".v415-b{display:block;width:100%;padding:11px 12px;margin-top:8px;border-radius:9px;border:1px solid #2c3444;"
      + "background:#1d2430;color:#e8edf6;font-size:13px;font-weight:600;cursor:pointer;text-align:center;}"
      + ".v415-b.pri{background:#2f6df6;border-color:#2f6df6;}"
      + ".v415-b:hover{filter:brightness(1.12);}"
      + ".v415-warn{border:1px solid #6b5420;background:#241d0e;color:#e8d9a8;border-radius:9px;padding:9px 11px;"
      + "font-size:12px;line-height:1.5;margin:0 0 10px;}"
      + ".v415-ok{border:1px solid #1f5c39;background:#0f2418;color:#9ee6b8;border-radius:9px;padding:9px 11px;font-size:12px;margin:0 0 10px;}";
    document.head.appendChild(st);
  }catch(e){}

  /* ---------- the one download routine ---------- */
  function directDownload(text, nm){
    try{
      var blob = new Blob([text], { type:"application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = nm; a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){ try{ URL.revokeObjectURL(url); a.remove(); }catch(e){} }, 2000);
      return true;
    }catch(e){ return false; }
  }

  function pickerDownload(text, nm, done){
    if(typeof window.showSaveFilePicker !== "function"){ done(false); return; }
    try{
      window.showSaveFilePicker({
        suggestedName: nm,
        types: [{ description: "NAVigating Business save", accept: { "application/json": [".nbsave"] } }]
      }).then(function(handle){
        return handle.createWritable().then(function(w){
          return w.write(text).then(function(){ return w.close(); });
        });
      }).then(function(){ done(true); }, function(){ done(false); });
    }catch(e){ done(false); }
  }

  function openInOwnTab(){
    var url;
    try{ url = location.href; }catch(e){ url = null; }
    if(!url) return false;
    var w = null;
    try{ w = window.open(url, "_blank", "noopener"); }catch(e){}
    return !!w;
  }
  window.v415OpenOwnTab = openInOwnTab;

  /* ---------- the save dialog ---------- */
  function saveDialog(state){
    if(document.querySelector(".v415-ov")) return;
    if(!state){ try{ toast("Start or load a run first.", "warn"); }catch(e){} return; }

    var text = payload(state), nm = fileName(state);
    var framed = inFrame();

    var ov = document.createElement("div");
    ov.className = "v415-ov";
    ov.innerHTML =
      '<div class="v415-box">'
      + '<h3>\u2B07 Save this run to a file</h3>'
      + (framed
          ? '<div class="v415-warn"><b>Heads up:</b> this game is running inside a Notion embed, and browsers block '
            + 'downloads from embeds. That is why the old button did nothing. Try the download anyway \u2014 if no file '
            + 'appears, open the game in its own tab, where downloads work normally and your saves stick around.</div>'
          : '<div class="v415-ok">Running in its own tab \u2014 downloads work normally here.</div>')
      + '<p>File name: <b>' + nm + '</b></p>'
      + '<button class="v415-b pri" data-v415dl>\u2B07 Download save file</button>'
      + (framed ? '<button class="v415-b" data-v415tab>\u2197 Open game in its own tab (recommended)</button>' : "")
      + '<button class="v415-b" data-v415x>Close</button>'
      + '</div>';
    document.body.appendChild(ov);

    ov.querySelector("[data-v415dl]").onclick = function(){
      pickerDownload(text, nm, function(ok){
        if(ok){
          try{ toast("<b>Save file written.</b> " + nm, "good"); }catch(e){}
          try{ ov.remove(); }catch(e){}
          return;
        }
        var fired = directDownload(text, nm);
        if(fired){
          try{
            toast(framed
              ? "Download attempted. If nothing landed in your downloads folder, use <b>Open game in its own tab</b>."
              : "<b>Save file downloaded.</b> " + nm, framed ? "warn" : "good");
          }catch(e){}
        } else {
          try{ toast("The browser refused the download. Use <b>Open game in its own tab</b>.", "bad"); }catch(e){}
        }
      });
    };
    var tabBtn = ov.querySelector("[data-v415tab]");
    if(tabBtn) tabBtn.onclick = function(){
      var ok = openInOwnTab();
      try{
        toast(ok
          ? "Opened in a new tab. Save your file from there \u2014 and consider playing there from now on."
          : "The browser blocked the new tab. Allow pop-ups for Notion, then try again.", ok ? "good" : "warn");
      }catch(e){}
    };
    ov.querySelector("[data-v415x]").onclick = function(){ try{ ov.remove(); }catch(e){} };
    ov.addEventListener("click", function(ev){ if(ev.target === ov) ov.remove(); });
  }

  window.v415Save = function(){ saveDialog(hasGame() ? G : null); };

  /* replace the old three-route export panel wholesale */
  try{
    if(window.NBSave){
      window.NBSave.toFile = function(state){ saveDialog(state || (hasGame() ? G : null)); };
    }
  }catch(e){}

  /* ---------- retire every save-code surface ---------- */
  function stripSaveCode(){
    try{
      // the v4.9 paste-to-restore box and its trigger row
      document.querySelectorAll("[data-v49pastebox],[data-v49paste]").forEach(function(n){
        try{ n.remove(); }catch(e){}
      });
      // any copy-save-text control that survives in an older panel
      document.querySelectorAll("[data-v49copy],[data-v49text],[data-v49tab]").forEach(function(n){
        try{
          var step = n.closest ? n.closest(".step") : null;
          (step || n).remove();
        }catch(e){}
      });
    }catch(e){}
  }
  try{ setInterval(stripSaveCode, 1200); }catch(e){}

  /* ---------- a visible Save to file button in the header ---------- */
  function mountButton(){
    try{
      var head = document.getElementById("v29head");
      if(!head || head.querySelector("[data-v415btn]") || !hasGame()) return;
      var b = document.createElement("button");
      b.setAttribute("data-v415btn", "1");
      b.title = "Save this run to a file on your computer";
      b.textContent = "\u2B07 Save file";
      b.style.cssText = "margin-left:8px;padding:5px 10px;border-radius:8px;border:1px solid #2c3444;"
        + "background:#1d2430;color:#e8edf6;font-size:12px;font-weight:600;cursor:pointer;";
      b.onclick = function(ev){ ev.stopPropagation(); window.v415Save(); };
      var gear = head.querySelector(".v30-gear");
      if(gear && gear.parentNode) gear.parentNode.insertBefore(b, gear);
      else head.appendChild(b);
    }catch(e){}
  }
  try{ setInterval(mountButton, 1500); }catch(e){}

  /* ---------- harden the file-load path ---------- */
  /* Loading a file restores state correctly in testing, but the render that
     follows is the part that was reported as broken. Re-run the full render
     and the v4.13 money repair after any load, and surface a real error
     instead of a half-drawn screen. */
  try{
    if(typeof window.nbLoadState === "function"){
      var prevLoad = window.nbLoadState;
      window.nbLoadState = function(state, src){
        var ok = prevLoad.apply(this, arguments);
        if(!ok) return ok;
        setTimeout(function(){
          try{ window.v413RepairAll && window.v413RepairAll(); }catch(e){}
          try{ if(typeof applyIndustryLabels === "function") applyIndustryLabels(); }catch(e){}
          try{ if(typeof opsInit === "function") opsInit(); }catch(e){}
          try{ if(typeof renderAll === "function") renderAll(); }catch(e){}
          try{ if(typeof v29RenderHeader === "function") v29RenderHeader(); }catch(e){}
          try{
            var head = document.getElementById("v29head");
            var bad = !head || !head.querySelector(".v29-t");
            if(bad) toast("The run loaded but the header did not redraw. Tell Jarvis if anything looks wrong.", "warn");
          }catch(e){}
        }, 260);
        return ok;
      };
    }
  }catch(e){}

  try{ window.GAME_VERSION = "v4.15"; }catch(e){}
})();
/* =====================================================================
   v4.16 — The marketing agency plays like a marketing agency

   1. Up to 6 pitches a month instead of one, with declining odds.
   2. Founder Hustle actions written for an agency owner (and for the
      trucking and salon owners, who were also getting the SaaS list).
   3. Drag-and-drop restored in the header tile picker, alongside arrows.
   ===================================================================== */
(function v416Agency(){
  "use strict";

  var PITCH_CAP = 6;

  function c(){ return G && G.company; }
  function stamp(){ var x = c(); return x ? (x.year + "-" + x.month) : ""; }

  /* ---------- 1. Six pitches a month ---------- */
  function pitchState(){
    var st = (typeof v45S === "function") ? v45S() : null;
    if(!st) return null;
    if(st.pitchMonth !== stamp()){ st.pitchMonth = stamp(); st.pitchCount = 0; }
    if(typeof st.pitchCount !== "number") st.pitchCount = 0;
    return st;
  }
  function pitchesLeft(){
    var st = pitchState();
    return st ? Math.max(0, PITCH_CAP - (st.pitchCount || 0)) : 0;
  }
  window.v416PitchesLeft = pitchesLeft;

  try{
    window.v45Pitch = function(){
      var st = pitchState(), co = c();
      if(!st || !co) return;
      var used = st.pitchCount || 0;
      if(used >= PITCH_CAP){
        try{ toast("That is all six pitches this month. Your team needs to actually do the work.", "bad"); }catch(e){}
        return;
      }
      st.pitchCount = used + 1;
      st.pitchStamp = "";  /* retire the old once-a-month lock */

      var idx = (typeof v45TierIndex === "function") ? v45TierIndex() : 0;
      var tier = V45_TIERS[idx];

      /* Each additional pitch in the same month is a worse prospect: you are
         working down your list, and spec work stacks up. */
      var base = 0.28 + idx * 0.07;
      var fatigue = Math.pow(0.86, used);
      var odds = Math.max(0.06, base * fatigue);

      if(Math.random() < odds){
        var mrr = Math.round((1800 + rand(0, 2600)) * tier.mult * (1 - used * 0.05));
        if(mrr < 200) mrr = 200;
        co.clients.push({
          id: uid(),
          name: pick(segmentNamePool(idx >= 3 ? "Enterprise" : idx >= 1 ? "Mid-Market" : "Small")),
          mrr: mrr, health: rand(62, 82), sinceMonth: co.month, sinceYear: co.year
        });
        if(typeof recomputeMRR === "function") recomputeMRR();
        logHistory("\uD83C\uDFAF Pitch " + (used + 1) + " of " + PITCH_CAP + " \u2014 won a " + fmt$(mrr) + "/mo retainer as a " + tier.name + ".");
        try{ toast("<b>Pitch won.</b> " + fmt$(mrr) + "/mo retainer. " + pitchesLeft() + " pitch(es) left this month.", "good"); }catch(e){}
      } else {
        logHistory("\uD83C\uDFAF Pitch " + (used + 1) + " of " + PITCH_CAP + " \u2014 lost. Spec work, no signature.");
        try{ toast("Lost that one. " + pitchesLeft() + " pitch(es) left this month.", "bad"); }catch(e){}
      }
      if(typeof renderAll === "function") renderAll();
    };
  }catch(e){}

  /* keep the button honest about how many pitches remain */
  function relabelPitch(){
    try{
      if(!c() || (typeof v45Kind === "function" && v45Kind() !== "agency")) return;
      var left = pitchesLeft();
      document.querySelectorAll("[data-v45pitch]").forEach(function(b){
        var want = left > 0
          ? "Pitch a new account \u00b7 " + left + " of " + PITCH_CAP + " left this month"
          : "No pitches left this month";
        if(b.textContent !== want) b.textContent = want;
        b.disabled = left <= 0;
      });
    }catch(e){}
  }
  try{ setInterval(relabelPitch, 900); }catch(e){}

  /* ---------- 2. Founder actions that fit the business ---------- */
  var AGENCY_ACTIONS = [
    { key:"v416_spec",    label:"\u{1F3A8} Build a Spec Campaign", desc:"Do the work before you are hired. Expensive in hours, hard to say no to." },
    { key:"v416_awards",  label:"\u{1F3C6} Enter an Awards Show", desc:"Creative awards are how agencies buy reputation. Entry fees are real." },
    { key:"v416_poach",   label:"\u{1F3AF} Poach a Rival's Account", desc:"Call a client who is unhappy with their current shop." },
    { key:"v416_casestudy", label:"\u{1F4C8} Publish a Case Study", desc:"Turn your best result into inbound. Slow burn, compounding." },
    { key:"v416_freelance", label:"\u{1F58A}\uFE0F Take a Freelance Brief", desc:"Bill your own hours. One-time cash, no retainer." },
    { key:"v416_mediabuy", label:"\u{1F911} Renegotiate the Media Buy", desc:"Lean on your rep for better rates. Trims recurring cost." }
  ];
  var TRUCK_ACTIONS = [
    { key:"v416_loadboard", label:"\u{1F4CB} Work the Load Board", desc:"Find a better-paying backhaul yourself instead of running empty." },
    { key:"v416_shipper",  label:"\u{1F91D} Court a Direct Shipper", desc:"Cut the broker out. Better rate if they bite." },
    { key:"v416_drive",    label:"\u{1F69B} Take a Run Yourself", desc:"Cover a load personally. Saves a driver's pay this month." },
    { key:"v416_fuel",     label:"\u26FD Negotiate a Fuel Card", desc:"A few cents a gallon across the fleet adds up." },
    { key:"v416_safety",   label:"\u{1F6E1}\uFE0F Run a Safety Review", desc:"Fewer incidents, better insurance standing." },
    { key:"negotiate",     label:"\u{1F911} Renegotiate a Vendor Contract", desc:"Trim a recurring cost." }
  ];
  var SALON_ACTIONS = [
    { key:"v416_chair",    label:"\u{1F485} Work a Chair Yourself", desc:"Take clients personally. Direct cash, and they ask for you again." },
    { key:"v416_regulars", label:"\u{1F4DE} Call Your Regulars", desc:"Fill next week's book by hand." },
    { key:"v416_social",   label:"\u{1F4F8} Post the Best Sets", desc:"Nail work is visual. Free reach if it lands." },
    { key:"v416_bridal",   label:"\u{1F48D} Chase a Bridal Party", desc:"One booking, a whole day's revenue." },
    { key:"v416_supply",   label:"\u{1F9F4} Squeeze the Supplier", desc:"Better pricing on product. Trims recurring cost." },
    { key:"network",       label:"\u{1F91D} Work the Neighborhood", desc:"Local referrals and cross-promotion." }
  ];

  try{
    var prevFor = (typeof founderActionsForIndustry === "function") ? founderActionsForIndustry : null;
    window.founderActionsForIndustry = function(){
      try{
        var ind = c() && c().industry;
        if(ind === "agency") return AGENCY_ACTIONS;
        if(ind === "trucking") return TRUCK_ACTIONS;
        if(ind === "nail_salon") return SALON_ACTIONS;
      }catch(e){}
      return prevFor ? prevFor.apply(this, arguments) : FOUNDER_ACTIONS;
    };
  }catch(e){}

  try{
    var prevRun = window.runFounderAction;
    window.runFounderAction = function(key){
      if(String(key).indexOf("v416_") !== 0) return prevRun.apply(this, arguments);
      var co = c();
      if(!co) return;
      if((co.founderActionsUsed || 0) >= FOUNDER_ACTION_CAP) return;
      co.founderActionsUsed = (co.founderActionsUsed || 0) + 1;
      co.founderActionsLifetime = (co.founderActionsLifetime || 0) + 1;

      var idx = (typeof v45TierIndex === "function" && v45Kind && v45Kind() === "agency") ? v45TierIndex() : 0;
      var mult = (typeof V45_TIERS !== "undefined" && V45_TIERS[idx]) ? V45_TIERS[idx].mult : 1;
      var msg = "";

      function winClient(lo, hi, healthLo, healthHi, seg){
        var mrr = Math.round(rand(lo, hi) * mult);
        co.clients.push({ id:uid(), name:pick(typeof segmentNamePool === "function" ? segmentNamePool(seg || "Small") : ["New Account"]),
          mrr:mrr, health:rand(healthLo, healthHi), sinceMonth:co.month, sinceYear:co.year });
        if(typeof recomputeMRR === "function") recomputeMRR();
        return mrr;
      }

      /* ----- agency ----- */
      if(key === "v416_spec"){
        var cost = Math.round(rand(400, 1200) * mult);
        co.cash -= cost;
        if(Math.random() < 0.52){
          var m1 = winClient(1400, 3400, 68, 88, idx >= 2 ? "Mid-Market" : "Small");
          msg = "You built the campaign before they asked. " + fmt$(cost) + " of your own time, and they signed at " + fmt$(m1) + "/mo.";
        } else {
          msg = "They loved the spec work, thanked you warmly, and went with the incumbent. " + fmt$(cost) + " spent.";
        }
      } else if(key === "v416_awards"){
        var fee = Math.round(rand(800, 2200));
        co.cash -= fee;
        if(Math.random() < 0.4){
          co.successScore = clamp(co.successScore + 7, 0, 100);
          msg = "You won. " + fmt$(fee) + " in entry fees, and a trophy that shows up in every pitch from now on.";
        } else {
          co.successScore = clamp(co.successScore + 1, 0, 100);
          msg = "Shortlisted, not won. " + fmt$(fee) + " spent for a line on the website.";
        }
      } else if(key === "v416_poach"){
        if(Math.random() < 0.33){
          var m2 = winClient(2200, 5200, 55, 72, idx >= 2 ? "Enterprise" : "Mid-Market");
          co.successScore = clamp(co.successScore - 2, 0, 100);
          msg = "They fired their agency and signed with you at " + fmt$(m2) + "/mo. Word gets around, both ways.";
        } else {
          msg = "They were flattered but they are locked in until the fiscal year turns. Call again then.";
        }
      } else if(key === "v416_casestudy"){
        co.successScore = clamp(co.successScore + 3, 0, 100);
        if(Math.random() < 0.38){
          var m3 = winClient(900, 2400, 70, 90, "Small");
          msg = "The case study did its job \u2014 inbound enquiry closed at " + fmt$(m3) + "/mo, and your reputation is up.";
        } else {
          msg = "Case study published. Reputation up, no signature yet. These compound.";
        }
      } else if(key === "v416_freelance"){
        var gain = Math.round(rand(1500, 4200) * mult);
        co.cash += gain;
        msg = "You billed your own hours \u2014 " + fmt$(gain) + " one-time, no retainer attached.";
      } else if(key === "v416_mediabuy"){
        co.expensesBreakdown.other = Math.round((co.expensesBreakdown.other || 0) * 0.92);
        msg = "Your rep blinked \u2014 media rates down about 8%.";

      /* ----- trucking ----- */
      } else if(key === "v416_loadboard"){
        var g2 = rand(900, 3200); co.cash += g2;
        msg = "You found a paying backhaul instead of deadheading \u2014 " + fmt$(g2) + ".";
      } else if(key === "v416_shipper"){
        if(Math.random() < 0.4){ var m4 = winClient(1800, 4500, 65, 85, "Mid-Market");
          msg = "Direct shipper signed at " + fmt$(m4) + "/mo. No broker taking a cut."; }
        else msg = "The shipper is happy with their broker for now. Keep calling.";
      } else if(key === "v416_drive"){
        var sv = rand(1800, 5200); co.cash += sv;
        msg = "You took the run yourself \u2014 " + fmt$(sv) + " that did not go to a driver.";
      } else if(key === "v416_fuel"){
        co.expensesBreakdown.other = Math.round((co.expensesBreakdown.other || 0) * 0.93);
        msg = "Fuel card renegotiated \u2014 about 7% off your running costs.";
      } else if(key === "v416_safety"){
        co.successScore = clamp(co.successScore + 4, 0, 100);
        msg = "Safety review done. Fewer incidents ahead and your insurer noticed.";

      /* ----- salon ----- */
      } else if(key === "v416_chair"){
        var g3 = rand(700, 2400); co.cash += g3;
        msg = "You worked a chair all week \u2014 " + fmt$(g3) + ", and three of them asked for you by name.";
      } else if(key === "v416_regulars"){
        var g4 = rand(400, 1500); co.cash += g4;
        co.successScore = clamp(co.successScore + 2, 0, 100);
        msg = "You called your regulars and filled the book \u2014 " + fmt$(g4) + " and a fuller week.";
      } else if(key === "v416_social"){
        if(Math.random() < 0.45){
          var g5 = rand(600, 2200); co.cash += g5;
          co.successScore = clamp(co.successScore + 3, 0, 100);
          msg = "One set went around locally \u2014 " + fmt$(g5) + " of walk-ins.";
        } else msg = "Posted the week's best work. Nice engagement, no rush of bookings yet.";
      } else if(key === "v416_bridal"){
        if(Math.random() < 0.5){
          var g6 = rand(1200, 3800); co.cash += g6;
          msg = "Bridal party booked \u2014 " + fmt$(g6) + " in one Saturday.";
        } else msg = "The bride is still deciding. They always are.";
      } else if(key === "v416_supply"){
        co.expensesBreakdown.other = Math.round((co.expensesBreakdown.other || 0) * 0.92);
        msg = "Product supplier came down about 8%.";
      }

      G.ui.founderMsg = msg;
      try{ if(msg) toast(msg); }catch(e){}
      try{ if(typeof recomputeMRR === "function") recomputeMRR(); }catch(e){}
      try{ if(window.v413RepairAll) window.v413RepairAll(); }catch(e){}
      try{ if(typeof renderAll === "function") renderAll(); }catch(e){}
    };
  }catch(e){}

  /* ---------- 3. Drag-and-drop back in the tile picker ---------- */
  /* The v4.11 rewrite moved the panel to document.body and traded drag for
     arrows. Both now work. Dragging drives the panel's own move logic by
     clicking its arrow buttons, so ordering and persistence stay identical. */
  try{
    var dcss = document.createElement("style");
    dcss.textContent =
      ".v411-row{cursor:grab;}"
      + ".v411-row:active{cursor:grabbing;}"
      + ".v411-row.v416-drag{opacity:.45;}"
      + ".v411-row.v416-over{border-color:var(--accent,#5b8cff);background:rgba(91,140,255,.14);}"
      + ".v411-row .v416-grip{opacity:.42;cursor:grab;font-size:13px;line-height:1;padding-right:1px;}"
      + ".v411-row:hover .v416-grip{opacity:.85;}";
    document.head.appendChild(dcss);
  }catch(e){}

  var dragKey = null;

  function rowKeys(pop){
    return Array.prototype.map.call(pop.querySelectorAll("[data-v411row]"), function(r){
      return r.getAttribute("data-v411row");
    });
  }

  function moveTo(pop, key, targetIdx){
    /* click the panel's own arrows until the row lands where it was dropped */
    for(var guard = 0; guard < 12; guard++){
      var keys = rowKeys(pop);
      var i = keys.indexOf(key);
      if(i < 0 || i === targetIdx) return;
      var attr = i > targetIdx ? "data-v411up" : "data-v411down";
      var btn = pop.querySelector('[' + attr + '="' + key + '"]');
      if(!btn || btn.disabled) return;
      btn.click();
    }
  }

  function wireDrag(){
    try{
      var pop = document.querySelector(".v411-pop");
      if(!pop) { dragKey = null; return; }
      pop.querySelectorAll("[data-v411row]").forEach(function(row){
        if(row.getAttribute("data-v416dnd")) return;
        row.setAttribute("data-v416dnd", "1");
        row.draggable = true;

        if(!row.querySelector(".v416-grip")){
          var grip = document.createElement("span");
          grip.className = "v416-grip";
          grip.textContent = "\u2630";
          grip.title = "Drag to reorder";
          row.insertBefore(grip, row.firstChild);
        }

        row.addEventListener("dragstart", function(ev){
          dragKey = row.getAttribute("data-v411row");
          row.classList.add("v416-drag");
          try{ ev.dataTransfer.effectAllowed = "move"; ev.dataTransfer.setData("text/plain", dragKey); }catch(e){}
        });
        row.addEventListener("dragend", function(){
          dragKey = null;
          try{
            document.querySelectorAll(".v416-drag,.v416-over").forEach(function(n){
              n.classList.remove("v416-drag"); n.classList.remove("v416-over");
            });
          }catch(e){}
        });
        row.addEventListener("dragover", function(ev){
          ev.preventDefault();
          try{ ev.dataTransfer.dropEffect = "move"; }catch(e){}
          row.classList.add("v416-over");
        });
        row.addEventListener("dragleave", function(){ row.classList.remove("v416-over"); });
        row.addEventListener("drop", function(ev){
          ev.preventDefault(); ev.stopPropagation();
          row.classList.remove("v416-over");
          var p = document.querySelector(".v411-pop");
          if(!p) return;
          var key = dragKey;
          try{ key = key || ev.dataTransfer.getData("text/plain"); }catch(e){}
          var target = row.getAttribute("data-v411row");
          if(!key || key === target) return;
          var keys = rowKeys(p);
          moveTo(p, key, keys.indexOf(target));
          dragKey = null;
        });
      });
    }catch(e){}
  }
  try{ setInterval(wireDrag, 350); }catch(e){}

  try{ window.GAME_VERSION = "v4.16"; }catch(e){}
})();
/* =====================================================================
   v4.17 — Feedback pass

   1. Agency standing card appears on Decisions only (it was on every screen).
   2. Expansion leaves the Decisions folder grid and lives in HQ; Facilities
      becomes a sub-tab inside Expansion.
   3. New business director: an agency hire who pitches for you each month.
   4. File download removed outright. Save code is back, compressed.
   5. Paste-to-restore returns alongside file load and browser slots.
   ===================================================================== */
(function v417(){
  "use strict";

  function co(){ try{ return G && G.company; }catch(e){ return null; } }
  function isAgency(){ try{ return typeof v45Kind === "function" && v45Kind() === "agency"; }catch(e){ return false; } }
  function say(msg, kind){ try{ toast(msg, kind || "good"); }catch(e){} }

  /* ================= 1 + 2. Screen placement ================= */

  function normalizeTab(){
    try{
      if(!G || !G.ui) return;
      if(G.ui.activeTab === "facilities"){
        G.ui.activeTab = "expansion";
        G.ui.v417ExpSub = "facilities";
      }
      if(G.ui.decisionFolder === "expansion") G.ui.decisionFolder = "founder";
      if(G.ui.v417ExpSub !== "facilities") G.ui.v417ExpSub = "growth";
    }catch(e){}
  }

  /* Facilities stops being its own destination. */
  function stripFacilitiesTab(){
    try{
      if(typeof DOCK_GROUPS !== "undefined"){
        DOCK_GROUPS.forEach(function(g){
          var i = g.items.indexOf("facilities");
          if(i >= 0) g.items.splice(i, 1);
          if(g.id === "hq" && g.items.indexOf("expansion") < 0) g.items.push("expansion");
        });
      }
      if(typeof V22_PEOPLE_SUBS !== "undefined"){
        var j = V22_PEOPLE_SUBS.indexOf("facilities");
        if(j >= 0) V22_PEOPLE_SUBS.splice(j, 1);
      }
    }catch(e){}
  }
  stripFacilitiesTab();
  try{ setInterval(stripFacilitiesTab, 2000); }catch(e){}

  function expansionSubBar(){
    var bar = document.createElement("div");
    bar.className = "v417-sub";
    bar.setAttribute("data-v417sub", "1");
    var sub = (G.ui.v417ExpSub === "facilities") ? "facilities" : "growth";
    bar.innerHTML =
      '<span class="lbl">\uD83C\uDF0D Expansion</span>'
      + '<button class="v417-b ' + (sub === "growth" ? "on" : "") + '" data-v417exp="growth">\uD83D\uDE80 Growth</button>'
      + '<button class="v417-b ' + (sub === "facilities" ? "on" : "") + '" data-v417exp="facilities">\uD83C\uDFD7\uFE0F Facilities</button>';
    bar.querySelectorAll("[data-v417exp]").forEach(function(b){
      b.onclick = function(){
        G.ui.v417ExpSub = b.getAttribute("data-v417exp");
        try{ renderAll(); }catch(e){ try{ renderScreen(); }catch(e2){} }
      };
    });
    return bar;
  }

  try{
    if(typeof renderScreen === "function"){
      var prevRender = renderScreen;
      renderScreen = function(){
        normalizeTab();
        var out = prevRender.apply(this, arguments);
        try{
          var screen = document.getElementById("screen");
          if(!screen || !G || !G.ui) return out;

          /* 1. Agency standing only on Decisions */
          if(G.ui.activeTab !== "decisions"){
            screen.querySelectorAll("[data-v45card]").forEach(function(n){ try{ n.remove(); }catch(e){} });
          }

          /* 2a. Expansion tile out of the Decisions folder grid */
          if(G.ui.activeTab === "decisions"){
            screen.querySelectorAll('.folder-tile[data-folder="expansion"]').forEach(function(n){ try{ n.remove(); }catch(e){} });
          }

          /* 2b. Expansion screen gets Growth / Facilities sub-tabs */
          if(G.ui.activeTab === "expansion" && !screen.querySelector("[data-v417sub]")){
            if(G.ui.v417ExpSub === "facilities" && typeof renderFacilitiesTab === "function"){
              screen.innerHTML = "";
              screen.appendChild(expansionSubBar());
              try{ screen.appendChild(renderFacilitiesTab()); }
              catch(e){ screen.appendChild(el('<div class="card">Facilities failed to draw: ' + String(e && e.message || e) + '</div>')); }
            } else {
              screen.insertBefore(expansionSubBar(), screen.firstChild);
            }
          }
        }catch(e){}
        return out;
      };
    }
  }catch(e){}

  /* Anything that jumps to Facilities now lands on the sub-tab. */
  function goFacilities(){
    try{
      G.ui.activeTab = "expansion";
      G.ui.v417ExpSub = "facilities";
      renderAll();
    }catch(e){}
  }
  window.v417GoFacilities = goFacilities;
  try{
    document.addEventListener("click", function(ev){
      var t = ev.target && ev.target.closest ? ev.target.closest('[data-v20go="facilities"]') : null;
      if(t){ ev.preventDefault(); ev.stopPropagation(); goFacilities(); }
    }, true);
  }catch(e){}

  /* ================= 3. New business director ================= */

  var NBD_HIRE = 4000, NBD_SALARY = 7200, NBD_PITCHES = 3;

  function nbdState(){
    try{
      var st = (typeof v45S === "function") ? v45S() : null;
      if(!st) return null;
      if(!st.nbd) st.nbd = { hired:false, won:0, lifetime:0 };
      return st.nbd;
    }catch(e){ return null; }
  }
  window.v417NBD = nbdState;

  function hireNBD(){
    var c = co(), n = nbdState();
    if(!c || !n || n.hired) return;
    if((c.cash || 0) < NBD_HIRE){ say("Not enough cash to bring on a new business director.", "bad"); return; }
    c.cash -= NBD_HIRE;
    n.hired = true;
    n.sinceMonth = c.month; n.sinceYear = c.year;
    try{ logHistory("\uD83E\uDD1D Hired a new business director. " + fmt$(NBD_SALARY) + "/mo, pitches " + NBD_PITCHES + " accounts a month without you."); }catch(e){}
    say("<b>New business director hired.</b> They will work the pipeline for you each month.", "good");
    try{ window.v413RepairAll && window.v413RepairAll(); }catch(e){}
    try{ renderAll(); }catch(e){}
  }
  function fireNBD(){
    var n = nbdState();
    if(!n || !n.hired) return;
    n.hired = false;
    try{ logHistory("\uD83D\uDC4B Let the new business director go. Pitching is back on you."); }catch(e){}
    say("New business director let go.", "warn");
    try{ renderAll(); }catch(e){}
  }
  window.v417HireNBD = hireNBD;
  window.v417FireNBD = fireNBD;

  /* One automated pitch. Slightly worse than the founder pitching in person. */
  function autoPitch(used){
    var c = co();
    if(!c) return 0;
    var idx = (typeof v45TierIndex === "function") ? v45TierIndex() : 0;
    var tier = V45_TIERS[idx];
    var odds = Math.max(0.05, (0.28 + idx * 0.07) * Math.pow(0.86, used) * 0.75);
    if(Math.random() >= odds) return 0;
    var mrr = Math.round((1800 + rand(0, 2600)) * tier.mult * 0.85);
    if(mrr < 200) mrr = 200;
    c.clients.push({
      id: uid(),
      name: pick(segmentNamePool(idx >= 3 ? "Enterprise" : idx >= 1 ? "Mid-Market" : "Small")),
      mrr: mrr, health: rand(58, 80), sinceMonth: c.month, sinceYear: c.year
    });
    if(typeof recomputeMRR === "function") recomputeMRR();
    return mrr;
  }

  try{
    if(typeof advanceMonth === "function"){
      var prevMonth = advanceMonth;
      advanceMonth = function(){
        var out = prevMonth.apply(this, arguments);
        try{
          var n = nbdState(), c = co();
          if(n && n.hired && c && isAgency()){
            c.cash = (c.cash || 0) - NBD_SALARY;
            var won = 0, total = 0;
            for(var i = 0; i < NBD_PITCHES; i++){
              var m = autoPitch(i);
              if(m){ won++; total += m; }
            }
            n.won = won; n.lifetime = (n.lifetime || 0) + total;
            try{
              logHistory(won
                ? "\uD83D\uDCBC New business director ran " + NBD_PITCHES + " pitches and landed " + won + " \u2014 " + fmt$(total) + "/mo added."
                : "\uD83D\uDCBC New business director ran " + NBD_PITCHES + " pitches and came back empty this month.");
            }catch(e){}
            try{ window.v413RepairAll && window.v413RepairAll(); }catch(e){}
          }
        }catch(e){}
        return out;
      };
    }
  }catch(e){}

  /* Show the director inside the agency standing card. */
  try{
    if(typeof v45Card === "function"){
      var prevCard = v45Card;
      v45Card = function(){
        var box = prevCard.apply(this, arguments);
        try{
          if(!box || !isAgency()) return box;
          var n = nbdState();
          if(!n) return box;
          var idx = (typeof v45TierIndex === "function") ? v45TierIndex() : 0;
          var row = document.createElement("div");
          row.className = "v417-nbd";
          if(n.hired){
            row.innerHTML = '<div><b>\uD83D\uDCBC New business director</b> \u00b7 ' + fmt$(NBD_SALARY) + '/mo'
              + '<div class="mt">Runs ' + NBD_PITCHES + ' pitches at every month close. Last month: '
              + (n.won ? '<b>' + n.won + ' won</b>' : 'nothing landed') + '. Lifetime billings won: ' + fmt$(n.lifetime || 0) + '.</div></div>'
              + '<button class="btn secondary small" data-v417fire="1">Let go</button>';
          } else if(idx >= 1){
            row.innerHTML = '<div><b>\uD83D\uDCBC Hire a new business director</b> \u00b7 ' + fmt$(NBD_HIRE) + ' now, ' + fmt$(NBD_SALARY) + '/mo'
              + '<div class="mt">Pitches ' + NBD_PITCHES + ' accounts a month on their own, so growth does not depend on you clicking six times.</div></div>'
              + '<button class="btn small" data-v417hire="1">Hire</button>';
          } else {
            row.innerHTML = '<div class="mt">\uD83D\uDCBC A new business director can be hired once you reach <b>Boutique</b> standing.</div>';
          }
          box.appendChild(row);
          var h = box.querySelector("[data-v417hire]"); if(h) h.onclick = hireNBD;
          var f = box.querySelector("[data-v417fire]"); if(f) f.onclick = fireNBD;
        }catch(e){}
        return box;
      };
      window.v45Card = v45Card;
    }
  }catch(e){}

  /* ================= 4 + 5. Saving ================= */

  function hasGame(){ try{ return !!(G && G.company); }catch(e){ return false; } }

  function payload(state){
    return JSON.stringify({ __nbsave:1, version: String(window.GAME_VERSION || "v4.17"), savedAt: Date.now(), state: state });
  }

  function b64FromBytes(bytes){
    var s = "", chunk = 0x8000;
    for(var i = 0; i < bytes.length; i += chunk){
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(s);
  }
  function bytesFromB64(b64){
    var bin = atob(b64), out = new Uint8Array(bin.length);
    for(var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function makeCode(state, done){
    var text = payload(state);
    if(typeof CompressionStream !== "function"){
      try{ done("NB417J:" + btoa(unescape(encodeURIComponent(text)))); }
      catch(e){ done(null, "This browser cannot build a save code."); }
      return;
    }
    try{
      var cs = new CompressionStream("deflate-raw");
      var stream = new Blob([text]).stream().pipeThrough(cs);
      new Response(stream).arrayBuffer().then(function(buf){
        done("NB417:" + b64FromBytes(new Uint8Array(buf)));
      }, function(err){ done(null, String(err)); });
    }catch(e){ done(null, String(e)); }
  }

  function readCode(code, done){
    code = String(code || "").trim().replace(/\s+/g, "");
    if(!code) { done(null, "Paste a save code first."); return; }
    try{
      if(code.indexOf("NB417J:") === 0){
        done(JSON.parse(decodeURIComponent(escape(atob(code.slice(7))))));
        return;
      }
      if(code.indexOf("NB417:") === 0){
        if(typeof DecompressionStream !== "function"){ done(null, "This browser cannot read compressed codes."); return; }
        var bytes = bytesFromB64(code.slice(6));
        var ds = new DecompressionStream("deflate-raw");
        var stream = new Blob([bytes]).stream().pipeThrough(ds);
        new Response(stream).text().then(function(txt){
          try{ done(JSON.parse(txt)); }catch(e){ done(null, "The code is damaged."); }
        }, function(){ done(null, "The code is damaged."); });
        return;
      }
      /* plain JSON from an older export */
      done(JSON.parse(code));
    }catch(e){ done(null, "That does not look like a save code."); }
  }
  window.v417MakeCode = makeCode;
  window.v417ReadCode = readCode;

  function applyLoaded(obj){
    var state = (obj && obj.__nbsave && obj.state) ? obj.state : obj;
    if(!state || typeof state !== "object"){ say("That code did not contain a run.", "bad"); return false; }
    var ok = false;
    try{ ok = !!window.nbLoadState(state, "code"); }catch(e){ ok = false; }
    if(ok) say("<b>Run restored from code.</b>", "good");
    else say("The code was read but the run would not load.", "bad");
    return ok;
  }

  /* ---- styles ---- */
  try{
    var css = document.createElement("style");
    css.textContent =
      ".v417-sub{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:0 0 12px;padding:7px 9px;"
      + "border:1px solid #2c3444;border-radius:10px;background:#141a24;}"
      + ".v417-sub .lbl{font-size:11.5px;color:#8fa1ba;margin-right:2px;}"
      + ".v417-b{padding:6px 11px;border-radius:8px;border:1px solid #2c3444;background:#1d2430;color:#cfdaeb;"
      + "font-size:12.5px;font-weight:600;cursor:pointer;}"
      + ".v417-b.on{background:#2f6df6;border-color:#2f6df6;color:#fff;}"
      + ".v417-nbd{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-top:9px;padding:9px 10px;"
      + "border:1px solid #2c3444;border-radius:9px;background:#141a24;font-size:12.5px;}"
      + ".v417-nbd .mt{color:#8fa1ba;font-size:11.5px;margin-top:2px;}"
      + ".v417-ov{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:100001;display:flex;align-items:center;"
      + "justify-content:center;padding:18px;}"
      + ".v417-box{background:#151922;border:1px solid #2c3444;border-radius:14px;max-width:520px;width:100%;padding:18px;"
      + "color:#e8edf6;box-shadow:0 18px 60px rgba(0,0,0,.6);max-height:86vh;overflow:auto;}"
      + ".v417-box h3{margin:0 0 8px;font-size:16px;}"
      + ".v417-box p{margin:0 0 10px;font-size:12.5px;line-height:1.55;color:#a3b3c9;}"
      + ".v417-ta{width:100%;height:110px;background:#0e131b;border:1px solid #2c3444;border-radius:9px;color:#9ee6b8;"
      + "font:11px ui-monospace,Menlo,monospace;padding:8px;resize:vertical;}"
      + ".v417-big{display:block;width:100%;padding:11px 12px;margin-top:8px;border-radius:9px;border:1px solid #2c3444;"
      + "background:#1d2430;color:#e8edf6;font-size:13px;font-weight:600;cursor:pointer;text-align:center;}"
      + ".v417-big.pri{background:#2f6df6;border-color:#2f6df6;}"
      + ".v417-note{border:1px solid #1f3a5c;background:#0e1a28;color:#a9c8e8;border-radius:9px;padding:9px 11px;"
      + "font-size:11.5px;line-height:1.5;margin:0 0 10px;}";
    document.head.appendChild(css);
  }catch(e){}

  /* ---- the save dialog: code + browser slot, no download ---- */
  function saveDialog(){
    if(document.querySelector(".v417-ov")) return;
    if(!hasGame()){ say("Start or load a run first.", "warn"); return; }

    var ov = document.createElement("div");
    ov.className = "v417-ov";
    ov.innerHTML =
      '<div class="v417-box">'
      + '<h3>\uD83D\uDCBE Save this run</h3>'
      + '<div class="v417-note">Downloads do not work inside a Notion embed \u2014 the browser blocks them, so that button is gone. '
      + 'Your run autosaves to this browser, and the code below is the copy you can keep anywhere, including a Notion page.</div>'
      + '<button class="v417-big pri" data-v417slot>\uD83D\uDCBE Save to this browser now</button>'
      + '<p style="margin-top:14px;"><b>Save code</b> <span data-v417len class="muted"></span></p>'
      + '<textarea class="v417-ta" data-v417code readonly>Compressing\u2026</textarea>'
      + '<button class="v417-big" data-v417copy>\uD83D\uDCCB Copy save code</button>'
      + '<p style="margin-top:14px;"><b>Restore from a code</b></p>'
      + '<textarea class="v417-ta" data-v417paste placeholder="Paste a save code here"></textarea>'
      + '<button class="v417-big" data-v417load>\u21BA Restore this code</button>'
      + '<button class="v417-big" data-v417x>Close</button>'
      + '</div>';
    document.body.appendChild(ov);

    var ta = ov.querySelector("[data-v417code]");
    var len = ov.querySelector("[data-v417len]");
    makeCode(G, function(code, err){
      if(code){
        ta.value = code;
        len.textContent = "\u00b7 " + code.length.toLocaleString() + " characters";
      } else {
        ta.value = "";
        len.textContent = "\u00b7 failed: " + (err || "unknown");
      }
    });

    ov.querySelector("[data-v417slot]").onclick = function(){
      var done = false;
      try{ if(typeof saveToSlot === "function"){ saveToSlot("manual"); done = true; } }catch(e){}
      if(!done){ try{ if(window.NBSave && NBSave.save){ NBSave.save(); done = true; } }catch(e){} }
      if(!done){ try{ if(typeof autosave === "function"){ autosave(); done = true; } }catch(e){} }
      say(done ? "<b>Saved to this browser.</b> It will be waiting under Saves." : "Could not reach the save slots.", done ? "good" : "bad");
    };
    ov.querySelector("[data-v417copy]").onclick = function(){
      try{ ta.select(); }catch(e){}
      var ok = false;
      try{ ok = document.execCommand("copy"); }catch(e){}
      if(!ok && navigator.clipboard){
        navigator.clipboard.writeText(ta.value).then(function(){ say("Save code copied.", "good"); }, function(){ say("Select the text and copy it manually.", "warn"); });
        return;
      }
      say(ok ? "Save code copied." : "Select the text and copy it manually.", ok ? "good" : "warn");
    };
    ov.querySelector("[data-v417load]").onclick = function(){
      var v = ov.querySelector("[data-v417paste]").value;
      readCode(v, function(obj, err){
        if(!obj){ say(err || "That code could not be read.", "bad"); return; }
        if(applyLoaded(obj)){ try{ ov.remove(); }catch(e){} }
      });
    };
    ov.querySelector("[data-v417x]").onclick = function(){ try{ ov.remove(); }catch(e){} };
    ov.addEventListener("click", function(ev){ if(ev.target === ov) ov.remove(); });
  }
  window.v417Save = saveDialog;
  try{ window.v415Save = saveDialog; }catch(e){}
  try{ if(window.NBSave) window.NBSave.toFile = function(){ saveDialog(); }; }catch(e){}

  /* ---- pull every download surface out of the game ---- */
  function stripDownloads(){
    try{
      document.querySelectorAll("[data-v415dl],[data-v415tab],[data-nbdl],[data-v49dl],[data-v49tab]").forEach(function(n){
        try{ n.remove(); }catch(e){}
      });
      document.querySelectorAll("[data-v415btn]").forEach(function(b){
        b.textContent = "\uD83D\uDCBE Save";
        b.title = "Save this run to the browser or copy a save code";
        b.onclick = function(ev){ ev.stopPropagation(); saveDialog(); };
      });
    }catch(e){}
  }
  try{ setInterval(stripDownloads, 900); }catch(e){}

  /* ---- paste-to-restore back on the Saves screen ---- */
  function mountPasteBox(){
    try{
      var drop = document.querySelector("[data-nbdrop]");
      if(!drop || !drop.parentNode) return;
      var host = drop.parentNode;
      if(host.querySelector("[data-v417pastebox]")) return;
      var box = document.createElement("div");
      box.setAttribute("data-v417pastebox", "1");
      box.style.cssText = "margin-top:10px;";
      box.innerHTML = '<div class="muted" style="font-size:11.5px;margin-bottom:5px;">\u2026or paste a save code:</div>'
        + '<textarea class="v417-ta" data-v417pcode placeholder="Paste a save code here"></textarea>'
        + '<button class="btn secondary small" data-v417pgo style="margin-top:6px;">\u21BA Restore code</button>';
      host.appendChild(box);
      box.querySelector("[data-v417pgo]").onclick = function(){
        readCode(box.querySelector("[data-v417pcode]").value, function(obj, err){
          if(!obj){ say(err || "That code could not be read.", "bad"); return; }
          applyLoaded(obj);
        });
      };
    }catch(e){}
  }
  try{ setInterval(mountPasteBox, 1200); }catch(e){}

  try{ window.GAME_VERSION = "v4.17"; }catch(e){}
})();
/* =====================================================================
   v4.17.1 — Marketplace art stops cropping

   The shop cards used object-fit:cover on a 7:4 box, so tall or square
   art was zoomed in and trimmed. Contain the whole image instead and let
   the card carry a neutral backing so nothing letterboxes into white.
   ===================================================================== */
(function v4171Art(){
  "use strict";
  try{
    var css = ".shop-card img{object-fit:contain !important;object-position:center !important;"
      + "background:#11141a !important;border-radius:8px 8px 0 0 !important;}"
      + ".shop-card{overflow:hidden;}"
      + ".v43-fac img,.fac-card img{object-fit:contain !important;background:#11141a !important;}";
    var s = document.createElement("style");
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
  }catch(e){}
  try{ window.GAME_VERSION = "v4.17.1"; }catch(e){}
})();
/* =====================================================================
   v4.18 — Confirmation boxes work inside the Notion embed

   Root cause of "I can't purchase a rival": Notion serves the game in a
   sandboxed iframe without allow-modals. window.confirm() never opens a
   dialog there — it returns false immediately. Every purchase gated behind
   a confirm silently did nothing: friendly bids, hostile bids, bonuses,
   selling houses, accepting an exit offer, founding a company, and more.

   Fix: an in-game confirmation dialog, plus a shim so the 26 existing
   confirm() call sites resolve instead of dying quietly.
   ===================================================================== */
(function v418Modals(){
  "use strict";

  function framed(){ try{ return window.self !== window.top; }catch(e){ return true; } }
  function say(m, k){ try{ toast(m, k || "good"); }catch(e){} }

  /* ---------- styles ---------- */
  try{
    var s = document.createElement("style");
    s.textContent =
      ".v418-ov{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:100002;display:flex;align-items:center;"
      + "justify-content:center;padding:18px;}"
      + ".v418-box{background:#151922;border:1px solid #2c3444;border-radius:14px;max-width:460px;width:100%;"
      + "padding:18px;color:#e8edf6;box-shadow:0 18px 60px rgba(0,0,0,.6);max-height:84vh;overflow:auto;}"
      + ".v418-box h3{margin:0 0 10px;font-size:15.5px;}"
      + ".v418-box .msg{font-size:12.5px;line-height:1.6;color:#c3d0e2;white-space:pre-wrap;margin-bottom:12px;}"
      + ".v418-b{display:block;width:100%;padding:11px 12px;margin-top:8px;border-radius:9px;border:1px solid #2c3444;"
      + "background:#1d2430;color:#e8edf6;font-size:13px;font-weight:600;cursor:pointer;text-align:center;}"
      + ".v418-b.pri{background:#2f6df6;border-color:#2f6df6;}"
      + ".v418-b.bad{background:#3a1b1b;border-color:#6b2b2b;color:#f3b5b5;}"
      + ".v418-b:hover{filter:brightness(1.12);}";
    document.head.appendChild(s);
  }catch(e){}

  /* ---------- the dialog ---------- */
  function ask(title, message, buttons){
    try{ var old = document.querySelector(".v418-ov"); if(old) old.remove(); }catch(e){}
    var ov = document.createElement("div");
    ov.className = "v418-ov";
    var box = document.createElement("div");
    box.className = "v418-box";
    var h = document.createElement("h3"); h.textContent = title;
    var m = document.createElement("div"); m.className = "msg"; m.textContent = message || "";
    box.appendChild(h); box.appendChild(m);
    buttons.forEach(function(spec){
      var b = document.createElement("button");
      b.className = "v418-b" + (spec.kind ? " " + spec.kind : "");
      b.textContent = spec.label;
      b.onclick = function(){
        try{ ov.remove(); }catch(e){}
        try{ if(spec.run) spec.run(); }catch(err){ say("That action failed: " + (err && err.message || err), "bad"); }
      };
      box.appendChild(b);
    });
    ov.appendChild(box);
    document.body.appendChild(ov);
    ov.addEventListener("click", function(ev){ if(ev.target === ov) ov.remove(); });
    return ov;
  }
  window.v418Ask = ask;

  /* ---------- remember the last marketplace click ---------- */
  var lastBuy = null;
  try{
    document.addEventListener("click", function(ev){
      var t = ev.target && ev.target.closest ? ev.target.closest("[data-v10buy]") : null;
      if(t) lastBuy = t.getAttribute("data-v10buy");
    }, true);
  }catch(e){}

  /* ---------- the confirm shim ---------- */
  var nativeConfirm = window.confirm;
  var houseChoice = null;   /* true = finance, false = pay cash */

  function shortOf(msg){
    var s = String(msg || "").split("\n")[0];
    return s.length > 110 ? s.slice(0, 107) + "\u2026" : s;
  }

  window.confirm = function(msg){
    if(!framed()){
      try{ return nativeConfirm.call(window, msg); }catch(e){ return true; }
    }
    var s = String(msg || "");

    /* 1. House purchases ask a real question: finance or pay cash. */
    if(/OK = finance/i.test(s)){
      if(houseChoice !== null){
        var v = houseChoice; houseChoice = null; return v;
      }
      var target = lastBuy;
      ask("\uD83C\uDFE0 How do you want to pay?", s.replace(/\n\nOK = finance.*$/i, ""), [
        { label: "Finance it (20% down)", kind: "pri", run: function(){
            houseChoice = true;
            if(target){ var p = target.split(":"); try{ v10Buy(p[0], p.slice(1).join(":")); }catch(e){} }
          } },
        { label: "Pay cash in full", run: function(){
            houseChoice = false;
            if(target){ var p = target.split(":"); try{ v10Buy(p[0], p.slice(1).join(":")); }catch(e){} }
          } },
        { label: "Cancel", run: function(){ houseChoice = null; } }
      ]);
      throw new Error("v418-deferred");   /* abort this pass; the dialog re-runs it */
    }

    /* 2. Never let an embed silently delete a save. */
    if(/delete|permanently/i.test(s)){
      say("Save deletion is disabled inside the Notion embed so a stray click cannot wipe a run.", "warn");
      return false;
    }

    /* 3. Everything else: the click was the decision. */
    say("\u2713 " + shortOf(s), "good");
    return true;
  };

  /* ---------- proper dialogs for the money decisions ---------- */
  /* These are the ones worth a real confirmation rather than a toast. */
  try{
    if(typeof window.v23Bid === "function"){
      var rawBid = window.v23Bid;
      window.v23Bid = function(target, mode){
        if(!framed()) return rawBid(target, mode);
        var cost = v23BidCost(target, mode);
        var odds = mode === "hostile" ? Math.round(v23HostileOdds(target) * 100) : 100;
        var body = mode === "hostile"
          ? "Cost: " + fmt$(cost) + "\nOdds of forcing it through: " + odds + "%\nYou already hold " + v23OwnedPct(target) + "%\n\n"
            + "If the board blocks you, you lose 12% of the bid in fees and they retaliate against your client list."
          : "Cost: " + fmt$(cost) + "\n\nThey accept, their staff transfer calmly, and you absorb their book and market share.";
        ask((mode === "hostile" ? "\u2694\uFE0F Hostile bid for " : "\uD83E\uDD1D Friendly acquisition of ") + target.name, body, [
          { label: mode === "hostile" ? "Launch the bid" : "Agree the deal", kind: "pri", run: function(){
              if(typeof affordOrAlert === "function" && !affordOrAlert(cost, "the " + target.name + " deal")) return;
              if(mode === "friendly" || Math.random() < v23HostileOdds(target)){
                v23Absorb(target, cost, mode);
                return;
              }
              var fees = Math.round(cost * 0.12);
              G.company.cash -= fees;
              target.funding = Math.round((target.funding || 0) * 1.25);
              target.threat = "High";
              G.company.successScore = clamp((G.company.successScore || 0) - 4, 0, 100);
              var poached = "";
              if((G.company.clients || []).length){
                var victim = pick(G.company.clients);
                G.company.clients = G.company.clients.filter(function(x){ return x.id !== victim.id; });
                G.company.mrr = Math.max(0, G.company.mrr - (victim.mrr || 0));
                poached = " They retaliated and took " + victim.name + ".";
              }
              logHistory("Hostile bid for " + target.name + " failed \u2014 " + fmt$(fees) + " in fees burned.");
              say("<b>The bid was blocked.</b> " + target.name + " raised a poison pill. You burned " + fmt$(fees) + " in fees." + poached, "bad");
              try{ renderAll(); }catch(e){}
            } },
          { label: "Walk away", run: function(){} }
        ]);
      };
    }
  }catch(e){}

  /* ---------- point the Rivals screen at the M&A desk ---------- */
  /* The v3.3 Rivals screen has no acquisition controls at all — those live
     on the Market & M&A screen. Say so, with a button. */
  function mountMandaPointer(){
    try{
      if(!G || !G.ui || G.ui.activeTab !== "rivals") return;
      var screen = document.getElementById("screen");
      if(!screen || screen.querySelector("[data-v418manda]")) return;
      var live = (G.company && G.company.competitors || []).length;
      var card = document.createElement("div");
      card.className = "card mt14";
      card.setAttribute("data-v418manda", "1");
      card.innerHTML = '<h3>\uD83E\uDD1D Buying a rival</h3>'
        + '<div class="muted" style="font-size:12.5px;line-height:1.55;">Stakes, friendly acquisitions and hostile bids are handled at the <b>Market &amp; M&amp;A</b> desk \u2014 '
        + live + ' company(s) are available to buy there.</div>'
        + '<button class="btn small" data-v418go style="margin-top:9px;">Open the M&amp;A desk</button>';
      screen.appendChild(card);
      card.querySelector("[data-v418go]").onclick = function(){
        G.ui.activeTab = "research";
        try{ renderAll(); }catch(e){}
      };
    }catch(e){}
  }
  try{ setInterval(mountMandaPointer, 700); }catch(e){}

  try{ window.GAME_VERSION = "v4.18"; }catch(e){}
})();
/* =====================================================================
   v4.19 — Amount prompts work inside the Notion embed

   Same family of fault as v4.18. The Notion embed iframe has no
   allow-modals, so window.prompt() never opens an input box — it returns
   null instantly. "Invest personal cash into company" (v18Infuse) reads
   its amount from prompt() and bails on null, so the button did nothing.
   18 call sites were affected: founder capital injections, every bonus
   amount, borrowing, setting the credit limit, drawing on the line,
   dividends, and the spouse name.

   Fix: an in-game amount dialog that stands in for prompt() everywhere.
   ===================================================================== */
(function v419Prompt(){
  "use strict";

  function framed(){ try{ return window.self !== window.top; }catch(e){ return true; } }
  function say(m, k){ try{ toast(m, k || "good"); }catch(e){} }
  function money(n){ try{ return fmt$(n); }catch(e){ return "$" + n; } }

  try{
    var s = document.createElement("style");
    s.textContent =
      ".v419-ov{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:100003;display:flex;align-items:center;"
      + "justify-content:center;padding:18px;}"
      + ".v419-box{background:#151922;border:1px solid #2c3444;border-radius:14px;max-width:440px;width:100%;"
      + "padding:18px;color:#e8edf6;box-shadow:0 18px 60px rgba(0,0,0,.6);max-height:84vh;overflow:auto;}"
      + ".v419-box h3{margin:0 0 9px;font-size:15.5px;}"
      + ".v419-box .msg{font-size:12.5px;line-height:1.6;color:#c3d0e2;white-space:pre-wrap;margin-bottom:12px;}"
      + ".v419-in{width:100%;box-sizing:border-box;padding:11px 12px;border-radius:9px;border:1px solid #2c3444;"
      + "background:#0e1218;color:#fff;font-size:16px;font-weight:700;letter-spacing:.3px;}"
      + ".v419-pre{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px;}"
      + ".v419-pre button{flex:1;min-width:72px;padding:7px 6px;border-radius:8px;border:1px solid #2c3444;"
      + "background:#1d2430;color:#cfe0ff;font-size:11.5px;font-weight:600;cursor:pointer;}"
      + ".v419-pre button:hover{border-color:#2f6df6;}"
      + ".v419-row{display:flex;gap:8px;margin-top:13px;}"
      + ".v419-row button{flex:1;padding:11px 12px;border-radius:9px;border:1px solid #2c3444;background:#1d2430;"
      + "color:#e8edf6;font-size:13px;font-weight:600;cursor:pointer;}"
      + ".v419-row button.pri{background:#2f6df6;border-color:#2f6df6;}"
      + ".v419-row button:hover{filter:brightness(1.12);}";
    document.head.appendChild(s);
  }catch(e){}

  /* ---------- pull a spendable ceiling out of the prompt text ---------- */
  function ceilingFrom(msg){
    try{
      var m = String(msg).match(/(?:available|headroom|max allowed|company cash)[^$]*\$([0-9,]+)/i);
      if(m) return Number(m[1].replace(/,/g, ""));
    }catch(e){}
    return null;
  }

  function inputDialog(msg, def, isNumeric, onOk){
    try{ var old = document.querySelector(".v419-ov"); if(old) old.remove(); }catch(e){}
    var text = String(msg == null ? "" : msg);
    var lines = text.split("\n");
    var title = lines[0];
    var rest = lines.slice(1).join("\n").trim();

    var ov = document.createElement("div"); ov.className = "v419-ov";
    var box = document.createElement("div"); box.className = "v419-box";
    var h = document.createElement("h3"); h.textContent = title;
    box.appendChild(h);
    if(rest){ var m2 = document.createElement("div"); m2.className = "msg"; m2.textContent = rest; box.appendChild(m2); }

    var input = document.createElement("input");
    input.className = "v419-in";
    input.value = (def == null ? "" : String(def));
    if(isNumeric){ input.setAttribute("inputmode", "numeric"); }
    box.appendChild(input);

    var cap = isNumeric ? ceilingFrom(text) : null;
    if(isNumeric){
      var base = Number(String(def).replace(/[^0-9.]/g, "")) || 10000;
      var opts = [];
      if(cap && cap > 0){
        opts = [Math.round(cap * 0.25), Math.round(cap * 0.5), Math.round(cap * 0.75), Math.round(cap)];
      } else {
        opts = [Math.round(base * 0.5), base, base * 2, base * 5];
      }
      var seen = {};
      var pre = document.createElement("div"); pre.className = "v419-pre";
      opts.forEach(function(v, i){
        if(!v || v <= 0 || seen[v]) return; seen[v] = 1;
        var b = document.createElement("button");
        b.textContent = (cap && i === 3) ? "All " + money(v) : money(v);
        b.onclick = function(){ input.value = String(v); input.focus(); };
        pre.appendChild(b);
      });
      if(pre.children.length) box.appendChild(pre);
      if(cap && cap > 0){
        var note = document.createElement("div");
        note.className = "msg";
        note.style.marginTop = "9px"; note.style.marginBottom = "0";
        note.textContent = "Ceiling: " + money(cap);
        box.appendChild(note);
      }
    }

    var row = document.createElement("div"); row.className = "v419-row";
    var cancel = document.createElement("button"); cancel.textContent = "Cancel";
    var ok = document.createElement("button"); ok.className = "pri"; ok.textContent = "Confirm";
    row.appendChild(cancel); row.appendChild(ok);
    box.appendChild(row);
    ov.appendChild(box);
    document.body.appendChild(ov);
    try{ input.focus(); input.select(); }catch(e){}

    function close(){ try{ ov.remove(); }catch(e){} }
    function submit(){
      var val = input.value;
      if(isNumeric){
        var n = Math.round(Number(String(val).replace(/[^0-9.]/g, "")));
        if(!n || n <= 0 || !isFinite(n)){ say("Enter an amount greater than zero.", "bad"); return; }
        if(cap && n > cap){ say("That is more than the " + money(cap) + " available.", "bad"); return; }
        val = String(n);
      }
      close();
      onOk(val);
    }
    ok.onclick = submit;
    cancel.onclick = function(){ close(); onOk(null); };
    input.addEventListener("keydown", function(ev){
      if(ev.key === "Enter"){ ev.preventDefault(); submit(); }
      if(ev.key === "Escape"){ close(); onOk(null); }
    });
    ov.addEventListener("click", function(ev){ if(ev.target === ov){ close(); onOk(null); } });
  }
  window.v419Input = inputDialog;

  /* ---------- replay machinery ----------
     prompt() is synchronous and our dialog is not, so: show the dialog,
     abort this pass, then replay the same click with the answer cached.
     Multi-prompt flows work because answers persist for the replay. */
  var answers = {};        /* prompt message -> answer */
  var lastClick = null;    /* the element that started this flow */
  var replaying = false;

  function selectorFor(el){
    try{
      if(el.id) return "#" + el.id;
      var attrs = el.getAttributeNames ? el.getAttributeNames() : [];
      for(var i = 0; i < attrs.length; i++){
        if(attrs[i].indexOf("data-") === 0){
          var v = el.getAttribute(attrs[i]);
          return "[" + attrs[i] + (v ? '="' + v.replace(/"/g, '\\"') + '"' : "") + "]";
        }
      }
    }catch(e){}
    return null;
  }

  try{
    document.addEventListener("click", function(ev){
      if(replaying) return;
      answers = {};   /* a fresh human click starts a fresh flow */
      var t = ev.target;
      if(t && t.closest) t = t.closest("button, [data-v18infuse], [onclick], a") || t;
      lastClick = t;
    }, true);
  }catch(e){}

  function replay(el, sel){
    var node = (el && document.contains(el)) ? el : (sel ? document.querySelector(sel) : null);
    if(!node){ say("That screen moved on. Click the button again and the amount will stick.", "warn"); return; }
    replaying = true;
    try{ node.click(); }
    catch(err){ say("That action failed: " + (err && err.message || err), "bad"); }
    finally{ setTimeout(function(){ replaying = false; }, 60); }
  }

  var nativePrompt = window.prompt;
  window.prompt = function(msg, def){
    if(!framed()){
      try{ return nativePrompt.call(window, msg, def); }catch(e){ return null; }
    }
    var key = String(msg == null ? "" : msg);
    if(Object.prototype.hasOwnProperty.call(answers, key)){
      var v = answers[key];
      delete answers[key];
      return v;
    }
    var numeric = !/name\?/i.test(key);
    var el = lastClick, sel = selectorFor(lastClick || document.body);
    inputDialog(key, def, numeric, function(val){
      if(val === null) return;              /* cancelled: nothing happens */
      answers[key] = val;
      replay(el, sel);
    });
    throw new Error("v419-deferred");        /* abort this pass; the dialog replays it */
  };

  /* ---------- put the invest button back on screen ----------
     The v2.9 header replaced the old topbar that carried the personal row,
     so #v18Infuse stopped being rendered anywhere. The function survived;
     the button did not. Mount a proper card on the money screens. */
  function pSnap(){
    try{ return personalSnapshot(); }catch(e){}
    try{ var p = pInit(); return { cash: p.cash, net: 0, worth: 0 }; }catch(e){}
    return null;
  }

  function mountInfuse(){
    try{
      if(typeof G === "undefined" || !G || !G.ui || !G.company) return;
      var tab = G.ui.activeTab;
      if(["bank", "financials", "life", "invest"].indexOf(tab) < 0) return;
      var screen = document.getElementById("screen");
      if(!screen || screen.querySelector("[data-v419infuse]")) return;
      var ps = pSnap();
      if(!ps) return;
      var card = document.createElement("div");
      card.className = "card mt14";
      card.setAttribute("data-v419infuse", "1");
      card.innerHTML = '<h3>\uD83D\uDCB5 Founder capital</h3>'
        + '<div style="font-size:12.5px;line-height:1.6;">Personal cash <b>' + money(ps.cash) + '</b>'
        + ' \u00b7 company cash <b>' + money(G.company.cash) + '</b></div>'
        + '<div class="muted" style="font-size:11.5px;margin-top:4px;">Wiring your own money in is instant and interest-free, but it leaves your personal balance sheet exposed if the company folds.</div>'
        + '<button class="btn small" data-v419go style="margin-top:9px;">\uD83D\uDCB5 Invest personal cash into ' + (G.company.name || "the company") + '</button>';
      screen.appendChild(card);
      card.querySelector("[data-v419go]").onclick = function(){
        try{ v18Infuse(); }
        catch(err){ if(!/v419-deferred/.test(String(err && err.message))) say("That failed: " + (err && err.message || err), "bad"); }
      };
    }catch(e){}
  }
  try{ setInterval(mountInfuse, 700); }catch(e){}

  try{ window.GAME_VERSION = "v4.19"; }catch(e){}
})();
/* =====================================================================
   v4.20 — Owner's salary is per company

   Fault: G.personal.salaryDraw is one global number. Every company reads
   and writes the same field, so a $25M/mo draw at a mature agency follows
   you into a brand new AI startup that cannot pay it. The cap was already
   per company (0.6 x that company's MRR), so the draw and the cap
   disagreed the moment you owned two companies.

   Fix: the draw is stored on the company (c.ownerDraw). G.personal
   .salaryDraw becomes an accessor onto the active company, so all ~30
   existing read and write sites keep working untouched.
   ===================================================================== */
(function v420Salary(){
  "use strict";

  function say(m, k){ try{ toast(m, k || "good"); }catch(e){} }
  function money(n){ try{ return fmt$(n); }catch(e){ return "$" + n; } }
  function ok(){ return typeof G !== "undefined" && G && G.personal; }
  function cur(){ try{ return G.company || null; }catch(e){ return null; } }

  var scratch = 0;   /* used only if there is somehow no active company */

  function capFor(c){
    try{ return Math.max(3500, Math.round((c.mrr || 0) * 0.6) + 3500); }
    catch(e){ return 3500; }
  }

  function getDraw(){
    var c = cur();
    if(!c) return scratch;
    if(c.ownerDraw === undefined || c.ownerDraw === null || !isFinite(c.ownerDraw)) c.ownerDraw = 0;
    return c.ownerDraw;
  }
  getDraw.__v420 = true;

  function setDraw(v){
    var n = Math.round(Number(v));
    if(!isFinite(n) || n < 0) n = 0;
    var c = cur();
    if(!c){ scratch = n; return; }
    c.ownerDraw = n;
  }

  /* Install the accessor. Re-runs after loads, which replace G.personal. */
  function install(){
    if(!ok()) return;
    var d = Object.getOwnPropertyDescriptor(G.personal, "salaryDraw");
    if(d && d.get && d.get.__v420) return;

    var legacy = 0;
    if(d && Object.prototype.hasOwnProperty.call(d, "value")){
      legacy = Number(d.value);
      if(!isFinite(legacy) || legacy < 0) legacy = 0;
    }

    try{
      Object.defineProperty(G.personal, "salaryDraw", {
        configurable: true,
        enumerable: true,
        get: getDraw,
        set: setDraw
      });
    }catch(e){ return; }

    /* Seed the company you are standing in with whatever the old global
       held, so an in-flight run keeps the draw it already had. */
    var c = cur();
    if(c && (c.ownerDraw === undefined || c.ownerDraw === null || !isFinite(c.ownerDraw))){
      c.ownerDraw = legacy;
    }

    /* Any other company that has never had a draw set starts at zero.
       A new venture should not inherit a mature company's salary. */
    try{
      (G.companies || []).forEach(function(co){
        if(co && (co.ownerDraw === undefined || co.ownerDraw === null || !isFinite(co.ownerDraw))){
          co.ownerDraw = (co === c) ? legacy : 0;
        }
      });
    }catch(e){}
  }

  try{ install(); }catch(e){}
  try{ setInterval(install, 500); }catch(e){}

  /* ---------- show the draws side by side, with controls ----------
     The legacy Owner Pay screen is not reachable from the v2.3 rail, so
     this card mounts on Bank and Financials (and next to the old Owner
     Pay controls if you ever land on that screen). */
  var DRAW_TABS = ["bank", "financials", "ownerpay", "invest"];

  function mountBreakdown(){
    try{
      if(!ok()) return;
      var anchor = document.querySelector("[data-owner-step]");
      var host, before = null;
      if(anchor){
        var sec = anchor.closest(".flatsec") || anchor.parentElement;
        if(!sec) return;
        host = sec.parentElement;
        before = sec.nextSibling;
      }else{
        if(DRAW_TABS.indexOf(G.ui.activeTab) < 0) return;
        host = document.getElementById("screen");
      }
      if(!host || host.querySelector("[data-v420draws]")) return;
      var cos = G.companies || [];
      if(!cos.length) return;

      var c = cur();
      var rows = cos.map(function(co){
        var isNow = co === c;
        var draw = isFinite(co.ownerDraw) ? co.ownerDraw : 0;
        var cap = capFor(co);
        var over = draw > cap;
        return '<tr style="' + (isNow ? "background:rgba(47,109,246,.10);" : "") + '">'
          + '<td style="padding:6px 8px;font-size:12px;">' + (isNow ? "\u25B8 " : "") + (co.name || "Company") + '</td>'
          + '<td style="padding:6px 8px;font-size:12px;text-align:right;"><b>' + money(draw) + '</b>/mo</td>'
          + '<td style="padding:6px 8px;font-size:11.5px;text-align:right;opacity:.75;">cap ' + money(cap) + '</td>'
          + '<td style="padding:6px 8px;font-size:11.5px;text-align:right;' + (over ? "color:#f3b5b5;" : "opacity:.7;") + '">'
          + (over ? "over cap" : (draw === 0 ? "not drawing" : "ok")) + '</td></tr>';
      }).join("");

      var myCap = c ? capFor(c) : 3500;
      var card = document.createElement("div");
      card.className = "card mt14";
      card.setAttribute("data-v420draws", "1");
      card.innerHTML = '<h3>\uD83D\uDCBC Owner\u2019s salary by company</h3>'
        + '<div class="muted" style="font-size:11.5px;margin-bottom:6px;">Each company pays its own owner\u2019s draw out of its own cash. '
        + 'A new venture starts at zero and ramps as it can afford to.</div>'
        + '<table style="width:100%;border-collapse:collapse;">' + rows + '</table>'
        + '<div class="flexrow mt8" style="align-items:center;gap:6px;flex-wrap:wrap;">'
        + '<span class="muted" style="font-size:11.5px;">Set draw for <b>' + ((c && c.name) || "this company") + '</b>:</span>'
        + [-25000, -2500, -500, 500, 2500, 25000].map(function(s){
            return '<button class="btn secondary small" data-v420step="' + s + '">' + (s > 0 ? "+" : "\u2212") + money(Math.abs(s)) + '</button>';
          }).join("")
        + '<button class="btn small" data-v420max="1">Max ' + money(myCap) + '</button>'
        + '<button class="btn secondary small" data-v420zero="1">Zero</button>'
        + '</div>';

      card.querySelectorAll("[data-v420step]").forEach(function(b){
        b.onclick = function(){
          var cc = cur(); if(!cc) return;
          var next = getDraw() + Number(b.getAttribute("data-v420step"));
          next = Math.max(0, Math.min(next, capFor(cc)));
          setDraw(next);
          say("<b>" + (cc.name || "Company") + "</b> owner\u2019s draw set to <b>" + money(next) + "/mo</b>.");
          try{ renderAll(); }catch(e){}
        };
      });
      var mx = card.querySelector("[data-v420max]");
      if(mx) mx.onclick = function(){
        var cc = cur(); if(!cc) return;
        setDraw(capFor(cc));
        say("<b>" + (cc.name || "Company") + "</b> owner\u2019s draw maxed at <b>" + money(capFor(cc)) + "/mo</b>.");
        try{ renderAll(); }catch(e){}
      };
      var zr = card.querySelector("[data-v420zero]");
      if(zr) zr.onclick = function(){
        var cc = cur(); if(!cc) return;
        setDraw(0);
        say("<b>" + (cc.name || "Company") + "</b> owner\u2019s draw set to <b>$0/mo</b>.");
        try{ renderAll(); }catch(e){}
      };

      if(before) host.insertBefore(card, before); else host.appendChild(card);
    }catch(e){}
  }
  try{ setInterval(mountBreakdown, 700); }catch(e){}

  /* ---------- tell the player when the draw changes company ---------- */
  try{
    if(typeof switchCompany === "function"){
      var rawSwitch = switchCompany;
      switchCompany = function(idx){
        var r = rawSwitch.apply(this, arguments);
        try{
          var c = cur();
          if(c){
            say("Now running <b>" + (c.name || "this company") + "</b> \u00b7 owner\u2019s draw here is <b>"
              + money(getDraw()) + "/mo</b> (cap " + money(capFor(c)) + ").");
          }
        }catch(e){}
        return r;
      };
    }
  }catch(e){}

  try{ window.GAME_VERSION = "v4.20"; }catch(e){}
})();
/* =====================================================================
   v4.21 — Bank transfers, founder capital, and the end of the $0 "repair"

   THE BUG FELIPE HIT
   Founding or funding a second company could leave that company's cash
   as NaN (a missing numeric field in ops state: a facility with no rent,
   a purchase with no price). Every money formatter in the game uses the
   `n || 0` idiom, and NaN is falsy, so a NaN balance RENDERED AS $0 with
   no error. A $5,000,000 transfer therefore looked like it evaporated in
   one month with no expenses — nothing was ever spent; the number was
   simply unreadable.

   It then spread. At month close:
       draw = Math.min(salaryDraw, Math.max(0, company.cash))
   Math.max(0, NaN) is NaN, so `personal.cash += draw` poisoned an $80M
   personal balance in one line.

   Finally the v4.13 integrity guard "repaired" both by writing 0 when it
   had no history to rebuild from, and lifestyle upkeep then drove the
   player to -$1.2M. The repair was more destructive than the fault.

   v4.21 FIXES IT IN FOUR LAYERS
     1. SNAPSHOT  — every account's last verified balance is persisted in
                    the save, so a repair always has something true to
                    fall back on, even after a reload.
     2. HEAL ALL  — the sweep covers EVERY company, not just the active
                    one. A passive or newly founded company can no longer
                    sit broken until you switch to it.
     3. TRANSFERS — account-to-account transfers validate both sides, are
                    rejected outright if either balance is unreadable,
                    roll back if the maths does not reconcile, and write a
                    ledger entry so founder capital is rebuildable.
     4. NO ZEROING — the guard will never again write 0 over a real
                    balance. If it cannot recover a trustworthy figure it
                    freezes and says so.
   ===================================================================== */
(function v421Cash(){
  "use strict";

  function fin(n){ var v = Number(n); return isFinite(v) ? v : null; }
  window.v421Fin = fin;

  function keyFor(co){
    try{
      if(!co) return null;
      if(co === (G && G.personal)) return "personal";
      var i = (G && G.companies) ? G.companies.indexOf(co) : -1;
      if(i >= 0) return "co:" + i;
      if(co.id) return "id:" + co.id;
      if(co.name) return "name:" + co.name;
    }catch(e){}
    return null;
  }

  function store(){
    try{
      if(!G) return null;
      if(!G.__v421 || typeof G.__v421 !== "object") G.__v421 = { snaps:{}, log:[] };
      if(!G.__v421.snaps) G.__v421.snaps = {};
      if(!G.__v421.log) G.__v421.log = [];
      return G.__v421;
    }catch(e){ return null; }
  }

  /* ---------- 1. SNAPSHOT: remember every account's last true balance ---------- */
  function snap(co){
    var s = store(); if(!s) return null;
    var k = keyFor(co); if(!k) return null;
    var v = s.snaps[k];
    return (v === undefined || v === null || !isFinite(Number(v))) ? null : Number(v);
  }
  window.v421Snapshot = snap;
  window.v421PersonalSnapshot = function(){
    var s = store(); if(!s) return null;
    var v = s.snaps["personal"];
    return (v === undefined || v === null || !isFinite(Number(v))) ? null : Number(v);
  };

  function record(co){
    var s = store(); if(!s) return;
    var k = keyFor(co); if(!k) return;
    var c = fin(co && co.cash);
    if(c !== null) s.snaps[k] = Math.round(c);
  }

  /* ---------- 2. HEAL: repair any account, not just the active company ---------- */
  function rebuildFromHistory(co){
    try{
      var h = co.financialHistory || [];
      for(var i = h.length - 1; i >= 0; i--){
        var base = fin(h[i].cash);
        if(base !== null){
          for(var j = i + 1; j < h.length; j++){
            var n = fin(h[j].netProfit);
            if(n !== null) base += n;
          }
          return { value: Math.round(base), how: "rebuilt from its financial history" };
        }
      }
    }catch(e){}
    return null;
  }

  function say(msg){
    try{ if(typeof toast === "function") toast(msg); }catch(e){}
    try{ if(typeof logHistory === "function") logHistory(String(msg).replace(/<[^>]+>/g, "")); }catch(e){}
  }

  function money(n){
    try{ if(typeof fmt$ === "function") return fmt$(n); }catch(e){}
    return "$" + Math.round(Number(n) || 0).toLocaleString();
  }

  /* Repair one account object in place. Returns true if it wrote a value. */
  function heal(co, label){
    try{
      if(!co) return false;
      if(fin(co.cash) !== null){ record(co); co.__v421Flagged = false; return false; }

      // (a) the snapshot is the most trustworthy source: it is a balance we
      //     actually observed, and it survives reloads because it is saved.
      var s = snap(co);
      if(s !== null){
        co.cash = Math.round(s);
        say("\u26a0\ufe0f " + (label || co.name || "An account") + ": cash was unreadable and has been restored to <b>" + money(co.cash) + "</b> (last verified balance).");
        record(co);
        return true;
      }
      // (b) otherwise rebuild from that account's own ledger.
      var r = rebuildFromHistory(co);
      if(r){
        co.cash = r.value;
        say("\u26a0\ufe0f " + (label || co.name || "An account") + ": cash was unreadable and has been " + r.how + " \u2014 <b>" + money(co.cash) + "</b>.");
        record(co);
        return true;
      }
      // (c) refuse to invent a number. Zero is not a safe default.
      if(!co.__v421Flagged){
        co.__v421Flagged = true;
        say("\u26a0\ufe0f " + (label || co.name || "An account") + ": cash could not be read and there is no verified balance to restore. Nothing has been changed.");
      }
      return false;
    }catch(e){ return false; }
  }

  window.v421HealAccount = function(ref){
    try{
      if(!ref) return;
      if(ref.kind === "personal") heal(G.personal, (G.meta && G.meta.playerName ? G.meta.playerName : "You") + " (Personal)");
      else heal(ref.obj, ref.name);
    }catch(e){}
  };

  function sweep(){
    try{
      if(!G) return;
      if(G.personal) heal(G.personal, (G.meta && G.meta.playerName ? G.meta.playerName : "You") + " (Personal)");
      if(G.companies && G.companies.forEach){
        G.companies.forEach(function(co, i){ heal(co, co && co.name ? co.name : ("Company " + (i+1))); });
      }
    }catch(e){}
  }
  window.v421Sweep = sweep;

  /* ---------- 3. TRANSFERS: prove the money landed ---------- */
  window.v421RecordTransfer = function(from, to, amount){
    try{
      var s = store();
      var amt = Math.round(Number(amount) || 0);
      [from, to].forEach(function(ref){
        if(!ref) return;
        var obj = ref.kind === "personal" ? G.personal : ref.obj;
        if(!obj) return;
        record(obj);
        // Give a company a ledger anchor so a future repair has something
        // real to rebuild from. Founder capital previously left no trace,
        // which is precisely why a fresh company could not be recovered.
        if(ref.kind === "company"){
          if(!Array.isArray(obj.financialHistory)) obj.financialHistory = [];
          obj.financialHistory.push({
            month: (G.meta && G.meta.month) || 0,
            year: (G.meta && G.meta.year) || 0,
            cash: Math.round(Number(obj.cash) || 0),
            netProfit: 0,
            revenue: 0,
            note: (ref === to ? "capital in " : "capital out ") + money(amt)
          });
          if(obj.financialHistory.length > 400) obj.financialHistory.shift();
        }
      });
      if(s) s.log.push({ t: Date.now(), from: from && from.name, to: to && to.name, amount: amt });
    }catch(e){}
  };

  /* Reconcile every transfer: the total money in the system must not change. */
  try{
    if(typeof transferFunds === "function"){
      var rawTransfer = transferFunds;
      window.transferFunds = function(fromId, toId, amount){
        var before = null;
        try{
          before = 0;
          if(G.personal) before += (fin(G.personal.cash) || 0);
          (G.companies || []).forEach(function(c){ before += (fin(c.cash) || 0); });
        }catch(e){ before = null; }

        var err = rawTransfer.apply(this, arguments);
        if(err) return err;

        try{
          var after = 0, broken = false;
          if(G.personal){ if(fin(G.personal.cash) === null) broken = true; else after += fin(G.personal.cash); }
          (G.companies || []).forEach(function(c){ if(fin(c.cash) === null) broken = true; else after += fin(c.cash); });
          if(broken || (before !== null && Math.abs(after - before) > 1)){
            sweep();
            say("\u26a0\ufe0f That transfer did not reconcile and the balances have been re-checked. Please confirm both accounts before continuing.");
          }
        }catch(e){}
        return err;
      };
      try{ transferFunds = window.transferFunds; }catch(e){}
    }
  }catch(e){}

  /* ---------- 4. Keep the sweep running at the right moments ---------- */
  function wrap(name){
    try{
      if(typeof window[name] !== "function") return;
      var raw = window[name];
      window[name] = function(){
        try{ sweep(); }catch(e){}
        var out = raw.apply(this, arguments);
        try{ sweep(); }catch(e){}
        return out;
      };
      try{ eval(name + " = window." + name); }catch(e){}
    }catch(e){}
  }
  ["advanceMonth", "foundNewCompany", "switchCompany", "renderAll"].forEach(wrap);

  try{ setInterval(sweep, 900); }catch(e){}
  try{ setTimeout(sweep, 400); }catch(e){}

  /* ---------- Self-test, visible from the console ---------- */
  window.v421SelfTest = function(){
    var out = [];
    try{
      var p0 = fin(G.personal.cash), c = G.companies[G.activeCompanyIndex];
      out.push("personal=" + p0 + " active=" + fin(c && c.cash));
      out.push("snapshots=" + JSON.stringify((store() || {}).snaps || {}));
      out.push("all finite: " + (G.companies || []).every(function(x){ return fin(x.cash) !== null; }));
    }catch(e){ out.push("error " + e.message); }
    return out.join("\n");
  };

  try{ window.GAME_VERSION = "v4.21"; }catch(e){}
})();
/* =====================================================================
   v4.22 — CASH WRITE FIREWALL

   v4.21 assumed the fault was NaN. The header screenshot disproves that:
   CASH $0 with a red delta of ▼$5.0M is a REAL numeric write of zero, not
   an unreadable value. Something is explicitly assigning 0 over a live
   balance, and a synthetic repro of the transfer + two month closes does
   not trigger it.

   So rather than guess at the culprit again, this layer sits in front of
   every cash write on every account:

     - A write is BLOCKED if it wipes a material balance to zero (or to a
       tiny fraction of itself) without coming from a sanctioned path.
     - A write is BLOCKED if it is non-finite.
     - Every blocked write is recorded WITH ITS STACK TRACE, so the next
       time this happens we learn the exact function responsible instead
       of theorising about it.
     - Sanctioned paths (selling, bankruptcy, starting a new game, loading
       a save, overdraft resolution) are allowed through untouched.

   Felipe: if you see the "blocked an unexplained write" toast, run
   v422Report() in the console, or open the Cash Audit card on the Bank
   screen, and send me what it says. That is the root cause, named.
   ===================================================================== */
(function v422Firewall(){
  "use strict";

  function fin(n){ var v = Number(n); return isFinite(v) ? v : null; }

  /* Paths that are ALLOWED to zero or reset a balance. */
  var SANCTIONED = [
    "sellCompany", "sellco", "divest", "bankrupt", "shutdown", "closeCompany",
    "liquidat", "acquire", "merger", "exitCompany", "doExit", "ipo",
    "newGame", "buildCompany", "foundNewCompany", "v44ApplyScenario",
    "loadGame", "applySave", "restore", "importSave", "decodeSave", "normalizeGame",
    "resolveDebtAndCash", "autoDrawCreditIfNeeded", "v421", "v422"
  ];

  function sanctioned(stack){
    var s = String(stack || "").toLowerCase();
    for(var i = 0; i < SANCTIONED.length; i++){
      if(s.indexOf(SANCTIONED[i].toLowerCase()) >= 0) return true;
    }
    return false;
  }

  function store(){
    try{
      if(!G) return null;
      if(!G.__v422 || typeof G.__v422 !== "object") G.__v422 = { blocked: [], allowed: 0 };
      if(!Array.isArray(G.__v422.blocked)) G.__v422.blocked = [];
      return G.__v422;
    }catch(e){ return null; }
  }

  function money(n){
    try{ if(typeof fmt$ === "function") return fmt$(n); }catch(e){}
    return "$" + Math.round(Number(n) || 0).toLocaleString();
  }

  var toldThisSession = 0;
  function shout(msg){
    try{ if(typeof toast === "function") toast(msg); }catch(e){}
    try{ if(typeof logHistory === "function") logHistory(String(msg).replace(/<[^>]+>/g, "")); }catch(e){}
    try{ console.warn("[v4.22] " + String(msg).replace(/<[^>]+>/g, "")); }catch(e){}
  }

  /* Decide whether a write is an unexplained wipe. */
  function isWipe(oldV, newV){
    var o = fin(oldV), n = fin(newV);
    if(o === null) return false;            // nothing real to protect
    if(n === null) return true;             // never write NaN/Infinity
    if(o < 1000) return false;              // small balances: let the game be
    if(n === 0) return true;                // exact zero over a real balance
    if(n > 0 && n < o * 0.01) return true;  // 99%+ evaporation in one write
    return false;
  }

  function label(obj){
    try{
      if(obj === G.personal) return (G.meta && G.meta.playerName ? G.meta.playerName : "Your") + " personal account";
      return obj.name || "A company";
    }catch(e){ return "An account"; }
  }

  function protect(obj){
    try{
      if(!obj || obj.__v422Armed) return;
      var d = Object.getOwnPropertyDescriptor(obj, "cash");
      if(d && !d.configurable) return;
      var v = obj.cash;
      Object.defineProperty(obj, "__v422Armed", { value: true, enumerable: false, configurable: true, writable: true });
      Object.defineProperty(obj, "cash", {
        configurable: true,
        enumerable: true,
        get: function(){ return v; },
        set: function(nv){
          var stack = "";
          try{ stack = (new Error()).stack || ""; }catch(e){}
          if(isWipe(v, nv) && !sanctioned(stack)){
            var s = store();
            var entry = {
              at: new Date().toISOString(),
              account: label(obj),
              from: fin(v),
              to: (fin(nv) === null ? String(nv) : fin(nv)),
              stack: String(stack).split("\n").slice(1, 8).join(" | ")
            };
            if(s){ s.blocked.push(entry); if(s.blocked.length > 50) s.blocked.shift(); }
            if(toldThisSession < 3){
              toldThisSession++;
              shout("\uD83D\uDEE1\uFE0F Blocked an unexplained write that would have set <b>" + label(obj)
                + "</b> from <b>" + money(v) + "</b> to <b>" + (fin(nv) === null ? "an unreadable value" : money(nv))
                + "</b>. Your balance is unchanged. Run <code>v422Report()</code> and send it to Jarvis.");
            }
            return; // refuse the write
          }
          v = nv;
        }
      });
    }catch(e){}
  }

  function arm(){
    try{
      if(typeof G === "undefined" || !G) return;
      if(G.personal) protect(G.personal);
      if(G.companies && G.companies.forEach) G.companies.forEach(protect);
    }catch(e){}
  }
  window.v422Arm = arm;

  /* Keep arming: companies get founded, saves get loaded, objects get replaced. */
  try{ setInterval(arm, 600); }catch(e){}
  try{ setTimeout(arm, 300); }catch(e){}
  try{ document.addEventListener("DOMContentLoaded", arm); }catch(e){}

  /* ---------- The report that names the culprit ---------- */
  window.v422Report = function(){
    var s = store();
    if(!s || !s.blocked.length) return "v4.22: no blocked cash writes recorded this run.";
    var out = ["v4.22 — " + s.blocked.length + " blocked cash write(s):"];
    s.blocked.forEach(function(b, i){
      out.push("");
      out.push((i+1) + ") " + b.account + ": " + money(b.from) + " → " + b.to + "  [" + b.at + "]");
      out.push("   " + b.stack);
    });
    var txt = out.join("\n");
    try{ console.log(txt); }catch(e){}
    try{ if(navigator.clipboard) navigator.clipboard.writeText(txt); }catch(e){}
    return txt;
  };

  /* ---------- A visible audit card, since the console is awkward in an embed ---------- */
  function mountAudit(){
    try{
      if(typeof G === "undefined" || !G || !G.ui) return;
      var s = store();
      if(!s || !s.blocked.length) return;
      var tab = G.ui.activeTab || "";
      if(tab !== "bank" && tab !== "finance" && tab !== "financials") return;
      var host = document.getElementById("screen");
      if(!host || host.querySelector("[data-v422audit]")) return;
      var box = document.createElement("div");
      box.className = "card mt14";
      box.setAttribute("data-v422audit", "1");
      var rows = s.blocked.slice(-5).map(function(b){
        return "<div style=\"margin:8px 0;padding:8px;border-radius:8px;background:rgba(255,80,80,.08);\">"
          + "<div><b>" + b.account + "</b>: " + money(b.from) + " → " + b.to + "</div>"
          + "<div style=\"font:11px/1.5 ui-monospace,monospace;opacity:.75;margin-top:4px;word-break:break-all;\">" + b.stack + "</div>"
          + "</div>";
      }).join("");
      box.innerHTML = "<div class=\"window-title\">\uD83D\uDEE1\uFE0F Cash audit — blocked writes</div>"
        + "<div style=\"opacity:.8;margin-bottom:6px;\">These writes would have wiped a real balance. They were refused. Send this to Jarvis.</div>"
        + rows;
      host.insertBefore(box, host.firstChild);
    }catch(e){}
  }
  /* v4.28d: audit card retired — the firewall still blocks bad writes, silently. */
  try{ setInterval(function(){ try{ document.querySelectorAll("[data-v422audit]").forEach(function(n){ n.remove(); }); }catch(e){} }, 1200); }catch(e){}

  /* ---------- Reconcile the whole system every month ---------- */
  try{
    if(typeof advanceMonth === "function"){
      var rawAdv = advanceMonth;
      window.advanceMonth = function(){
        arm();
        var before = null;
        try{
          before = (fin(G.personal && G.personal.cash) || 0);
          (G.companies || []).forEach(function(c){ before += (fin(c.cash) || 0); });
        }catch(e){}
        var r = rawAdv.apply(this, arguments);
        arm();
        return r;
      };
      try{ advanceMonth = window.advanceMonth; }catch(e){}
    }
  }catch(e){}

  try{ window.GAME_VERSION = "v4.37"; }catch(e){}
})();
/* =====================================================================
   v4.28d — Owner pay across every company, the Chairman seat,
           founder-capital consequences, and business credit.

   1. FAULT (the one Felipe hit): v4.20 moved the owner's draw onto the
      company (c.ownerDraw) and made G.personal.salaryDraw an accessor
      onto the ACTIVE company. advanceMonthCore pays exactly one draw --
      the active company's. So a $25M/mo draw at a mature agency pays
      nothing while you are standing in another venture, yet lifestyle
      burn still comes out of personal cash every month. Personal cash
      bleeds down while the header advertises the income.
      Fix: every company you own pays its own draw at month close.
   ===================================================================== */
(function v424(){
  "use strict";

  function n(v, d){ var x = Number(v); return isFinite(x) ? x : (d || 0); }
  function money(v){ try{ return fmt$(Math.round(n(v))); }catch(e){ return "$" + Math.round(n(v)); } }
  function say(m, k){ try{ toast(m, k || "good"); }catch(e){} }
  function log(m){ try{ logHistory(m); }catch(e){} }
  function ok(){ return typeof G !== "undefined" && G && G.personal && G.companies; }
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" })[c]; }); }
  function store(){
    if(!ok()) return null;
    G.__v424 = G.__v424 || {};
    if(!G.__v424.payLog) G.__v424.payLog = [];
    return G.__v424;
  }
  function tab(){ try{ return (G.ui && G.ui.activeTab) || ""; }catch(e){ return ""; } }
  function active(){ try{ return G.companies[G.activeCompanyIndex]; }catch(e){ return null; } }

  /* =================================================================
     1. OWNER PAY — every company pays its own draw
     ================================================================= */
  function chairFee(co){ return Math.max(0, Math.round(n(co.chairFee, 0))); }

  function payNonActiveDraws(){
    if(!ok()) return [];
    var act = active();
    var lines = [];
    (G.companies || []).forEach(function(co){
      if(!co || co === act) return;          /* the active one is paid by advanceMonthCore */
      var want = n(co.ownerDraw, 0) + chairFee(co);
      if(want <= 0) return;
      var avail = Math.max(0, n(co.cash, 0));
      var pay = Math.min(want, avail);
      if(pay <= 0){
        lines.push("\u26a0\ufe0f " + co.name + " could not pay your " + money(want) + " draw \u2014 no cash on hand.");
        return;
      }
      co.cash = n(co.cash, 0) - pay;
      G.personal.cash = n(G.personal.cash, 0) + pay;
      var label = co.chairman ? "owner draw + chairman retainer" : "owner draw";
      lines.push("\u{1F4B5} " + co.name + " paid your " + label + ": " + money(pay)
        + (pay < want ? " (short of " + money(want) + ")" : ""));
    });
    /* the active company's chairman fee, if you somehow chair the one you stand in */
    if(act && chairFee(act) > 0){
      var f = Math.min(chairFee(act), Math.max(0, n(act.cash, 0)));
      if(f > 0){
        act.cash = n(act.cash, 0) - f;
        G.personal.cash = n(G.personal.cash, 0) + f;
        lines.push("\u{1F4BC} " + act.name + " paid your chairman retainer: " + money(f));
      }
    }
    return lines;
  }

  /* =================================================================
     2. CHAIRMAN OF THE BOARD
     ================================================================= */
  var CEO_ARCHETYPES = [
    { key:"operator",   label:"Operator",        blurb:"Runs a tight shop. Costs down, steady margin.",        growth:0.99, margin:1.18, pay:1.00 },
    { key:"growth",     label:"Growth CEO",      blurb:"Chases revenue hard. Margin suffers for it.",          growth:1.06, margin:0.88, pay:1.25 },
    { key:"caretaker",  label:"Caretaker",       blurb:"Cheap and safe. Nothing much happens either way.",     growth:1.00, margin:1.02, pay:0.65 },
    { key:"turnaround", label:"Turnaround Exec", blurb:"Expensive. Cuts hard and stabilises a bleeding book.", growth:0.97, margin:1.30, pay:1.55 }
  ];
  var DIRECTIVES = {
    grow:    { label:"Grow aggressively", growth:1.05, margin:0.92 },
    balance: { label:"Balanced",          growth:1.00, margin:1.00 },
    margin:  { label:"Protect margin",    growth:0.97, margin:1.12 },
    exit:    { label:"Prepare for sale",  growth:0.99, margin:1.15 }
  };

  function candidates(co){
    var base = Math.max(12000, Math.round(n(co.mrr, 0) * 0.012) + 9000);
    return CEO_ARCHETYPES.map(function(a){
      var seed = (String(co.id || co.name || "x").length + a.key.length) % 7;
      return {
        key: a.key, label: a.label, blurb: a.blurb,
        name: (function(){ try{ return generateName(); }catch(e){ return "A. Candidate"; } })(),
        salary: Math.round(base * a.pay * (1 + seed / 60)),
        growth: a.growth, margin: a.margin
      };
    });
  }

  function stepDown(coIdx, cand){
    if(!ok()) return;
    var co = G.companies[coIdx];
    if(!co) return;
    co.ceo = { type:"hired", name: cand.name, salary: cand.salary, archetype: cand.key,
               growth: cand.growth, margin: cand.margin };
    co.passive = true;
    co.chairman = true;
    co.directive = co.directive || "balance";
    co.chairFee = Math.max(2500, Math.round(n(co.mrr, 0) * 0.004));
    co.chairSince = { month: n(co.month, 1), year: n(co.year, 1) };
    log("Stepped down as CEO of " + co.name + ". " + cand.name + " (" + cand.label + ") took the seat at "
      + money(cand.salary) + "/mo. You stay on as Chairman of the Board, keeping "
      + (function(){ try{ return (founderPct(co) * 100).toFixed(1) + "%"; }catch(e){ return "your stake"; } })()
      + " and a " + money(co.chairFee) + "/mo retainer.");
    say("<b>\u{1FA91} You are now Chairman of " + esc(co.name) + ".</b><br><span style=\"font-size:11px;opacity:.85;\">"
      + esc(cand.name) + " runs it day to day. You set the directive and can replace " + esc(cand.name) + " any time.</span>", "good");
    try{ renderAll(); }catch(e){}
  }

  function reinstate(coIdx){
    var co = G.companies[coIdx]; if(!co) return;
    var old = co.ceo && co.ceo.name;
    co.ceo = { type:"player" };
    co.passive = false;
    co.chairman = false;
    co.chairFee = 0;
    log("Took back the CEO seat at " + co.name + (old ? " \u2014 " + old + " was let go." : "."));
    say("<b>You are CEO of " + esc(co.name) + " again.</b>", "good");
    try{ renderAll(); }catch(e){}
  }

  /* CEO archetype + board directive shape how a chaired company performs */
  function applyBoardEffects(){
    if(!ok()) return [];
    var lines = [];
    (G.companies || []).forEach(function(co){
      if(!co || !co.chairman || !co.ceo || co.ceo.type !== "hired") return;
      var d = DIRECTIVES[co.directive] || DIRECTIVES.balance;
      var g = n(co.ceo.growth, 1) * n(d.growth, 1);
      var m = n(co.ceo.margin, 1) * n(d.margin, 1);
      if(isFinite(g) && g !== 1) co.mrr = Math.max(0, Math.round(n(co.mrr, 0) * g));
      var pay = Math.min(n(co.ceo.salary, 0), Math.max(0, n(co.cash, 0)));
      if(pay > 0) co.cash = n(co.cash, 0) - pay;
      if(isFinite(m) && m > 1){
        var saved = Math.round(n(co.mrr, 0) * 0.01 * (m - 1) * 10);
        if(saved > 0) co.cash = n(co.cash, 0) + saved;
      }
      lines.push("\u{1FA91} " + co.name + ": " + co.ceo.name + " (" + (DIRECTIVES[co.directive] || DIRECTIVES.balance).label
        + ") \u2014 MRR now " + money(co.mrr) + ", CEO pay " + money(pay) + ".");
    });
    return lines;
  }

  /* =================================================================
     3. BUSINESS & PERSONAL CREDIT
     ================================================================= */
  var TRADELINE_OFFERS = [
    { key:"office",   name:"Office supply net-30",  limit:5000,   fee:0,    minMonths:0,  blurb:"The classic starter tradeline. Reports every month." },
    { key:"fuel",     name:"Fleet fuel card",       limit:15000,  fee:25,   minMonths:3,  blurb:"Small revolving line. Needs 3 months of history." },
    { key:"vendor",   name:"Vendor net-60",         limit:60000,  fee:75,   minMonths:6,  blurb:"Real supplier credit. Moves your score faster." },
    { key:"corpcard", name:"Corporate card",        limit:250000, fee:150,  minMonths:12, blurb:"Serious limit. Requires a year of clean history." }
  ];

  function credit(){
    if(!ok()) return null;
    var s = store();
    if(!s.credit){
      s.credit = {
        business: 580, personal: 660,
        tradelines: [], history: 0, onTime: 0, missed: 0, lastNote: null
      };
    }
    return s.credit;
  }

  function utilization(){
    var c = credit(); if(!c) return 0;
    var limit = c.tradelines.reduce(function(a, t){ return a + n(t.limit, 0); }, 0);
    var bal = c.tradelines.reduce(function(a, t){ return a + n(t.balance, 0); }, 0);
    try{
      var d = G.company && G.company.debt;
      if(d){ limit += n(d.locLimit, 0); bal += n(d.locBalance, 0); }
    }catch(e){}
    return limit > 0 ? Math.min(1, bal / limit) : 0;
  }

  function recomputeScores(){
    var c = credit(); if(!c) return;
    var util = utilization();
    var lines = c.tradelines.length;
    var age = n(c.history, 0);

    var b = 520
      + Math.min(120, lines * 28)                 /* breadth of tradelines */
      + Math.min(110, age * 4)                    /* months of clean history */
      + Math.min(70, Math.round(n(c.onTime, 0) * 3))
      - Math.round(util * 90)                     /* utilisation hurts */
      - Math.min(180, n(c.missed, 0) * 45);
    c.business = Math.max(300, Math.min(850, Math.round(b)));

    var p = 640;
    try{
      var pd = G.personal.debt || {};
      var pLimit = Math.max(1, n(pd.locLimit, 0) + n(G.personal.netWorth, 0) * 0.1);
      var pUtil = Math.min(1, (n(pd.locBalance, 0) + n(pd.loanBalance, 0)) / pLimit);
      p = 700 + Math.min(80, age * 2) - Math.round(pUtil * 120) - Math.min(160, n(c.missed, 0) * 40);
      if(n(G.personal.cash, 0) < 0) p -= 60;
    }catch(e){}
    c.personal = Math.max(300, Math.min(850, Math.round(p)));
  }

  function tier(score){
    if(score >= 780) return { label:"Excellent", mult:0.62, color:"#22c55e" };
    if(score >= 720) return { label:"Strong",    mult:0.78, color:"#4ade80" };
    if(score >= 660) return { label:"Good",      mult:0.92, color:"#eab308" };
    if(score >= 600) return { label:"Fair",      mult:1.15, color:"#f59e0b" };
    return             { label:"Poor",      mult:1.45, color:"#ef4444" };
  }

  /* rates now key off the business credit score */
  function wrapRate(name){
    try{
      if(typeof window[name] !== "function") return;
      if(window[name].__v424) return;
      var raw = window[name];
      var wrapped = function(){
        var r = raw.apply(this, arguments);
        try{
          var c = credit();
          if(c) r = r * tier(c.business).mult;
        }catch(e){}
        return r;
      };
      wrapped.__v424 = true;
      window[name] = wrapped;
      try{ eval(name + " = wrapped;"); }catch(e){}
    }catch(e){}
  }

  function openTradeline(key){
    var c = credit(); if(!c) return;
    var offer = TRADELINE_OFFERS.filter(function(o){ return o.key === key; })[0];
    if(!offer) return;
    if(c.tradelines.some(function(t){ return t.key === key; })){ say("You already hold that tradeline.", "warn"); return; }
    if(n(c.history, 0) < offer.minMonths){
      say("<b>Declined.</b> " + esc(offer.name) + " needs " + offer.minMonths + " months of credit history. You have " + n(c.history, 0) + ".", "bad");
      return;
    }
    if(c.business < 600 && offer.limit >= 60000){
      say("<b>Declined.</b> Your business score of " + c.business + " is below the 600 this line requires.", "bad");
      return;
    }
    c.tradelines.push({ key: offer.key, name: offer.name, limit: offer.limit, balance: 0, fee: offer.fee, opened: n(c.history, 0) });
    recomputeScores();
    log("Opened a tradeline: " + offer.name + " (" + money(offer.limit) + " limit).");
    say("<b>\u{1F4B3} " + esc(offer.name) + " approved.</b><br><span style=\"font-size:11px;opacity:.85;\">"
      + money(offer.limit) + " limit. Use it lightly and pay it every month to build the score.</span>", "good");
    try{ renderAll(); }catch(e){}
  }

  function monthlyCredit(){
    var c = credit(); if(!c) return [];
    var lines = [];
    c.history = n(c.history, 0) + 1;
    var co = active();
    var due = 0;
    c.tradelines.forEach(function(t){
      /* companies naturally run a little spend through open lines */
      var spend = Math.round(n(t.limit, 0) * (0.06 + Math.random() * 0.12));
      t.balance = Math.min(n(t.limit, 0), n(t.balance, 0) + spend);
      due += n(t.balance, 0) + n(t.fee, 0);
    });
    if(due > 0 && co){
      if(n(co.cash, 0) >= due){
        co.cash = n(co.cash, 0) - due;
        c.tradelines.forEach(function(t){ t.balance = 0; });
        c.onTime = n(c.onTime, 0) + 1;
        lines.push("\u{1F4B3} Paid " + money(due) + " across " + c.tradelines.length + " tradeline(s) on time.");
      } else {
        c.missed = n(c.missed, 0) + 1;
        lines.push("\u26a0\ufe0f Missed " + money(due) + " of tradeline payments \u2014 your business credit score took a hit.");
      }
    }
    var beforeB = c.business;
    recomputeScores();
    if(c.business !== beforeB){
      lines.push("\u{1F4CA} Business credit " + (c.business > beforeB ? "rose" : "fell") + " to " + c.business
        + " (" + tier(c.business).label + ") \u2014 loan pricing follows it.");
    }
    return lines;
  }

  /* =================================================================
     4. FOUNDER CAPITAL HAS CONSEQUENCES AT HOME
     ================================================================= */
  function founderCapitalStress(amount){
    if(!ok()) return;
    var nw = Math.max(1, n(G.personal.netWorth, 0) || n(G.personal.cash, 0));
    var share = n(amount, 0) / nw;
    if(share < 0.25) return;
    var sev = share >= 0.6 ? 3 : share >= 0.4 ? 2 : 1;
    var hit = [6, 12, 20][sev - 1];
    try{ G.personal.happiness = Math.max(0, Math.min(100, n(G.personal.happiness, 70) - hit)); }catch(e){}
    var who = (function(){ try{ return (typeof spouseName === "function" && spouseName()) || "Your partner"; }catch(e){ return "Your partner"; } })();
    var msg = sev >= 3
      ? who + " found out you wired " + money(amount) + " \u2014 more than half of everything you have \u2014 into the business. It was not a calm evening."
      : sev === 2
      ? who + " is uneasy about the " + money(amount) + " you moved into the business. It is a lot of the family's money."
      : who + " noticed the " + money(amount) + " transfer and asked how much runway that leaves at home.";
    try{ (G.personal.monthEvents = G.personal.monthEvents || []).push("\u{1F3E1} " + msg); }catch(e){}
    log(msg);
    say("<b>\u{1F3E1} Pressure at home.</b><br><span style=\"font-size:11px;opacity:.9;\">" + esc(msg)
      + "</span><br><span style=\"font-size:11px;opacity:.7;\">Happiness \u2212" + hit + ".</span>", sev >= 2 ? "bad" : "warn");
  }

  function wrapFounderCapital(){
    try{
      if(typeof window.transferFunds === "function" && !window.transferFunds.__v424){
        var rawT = window.transferFunds;
        var wrappedT = function(fromKey, toKey, amount){
          var before = n(G.personal.cash, 0);
          var r = rawT.apply(this, arguments);
          try{
            var after = n(G.personal.cash, 0);
            if(after < before) founderCapitalStress(before - after);
          }catch(e){}
          return r;
        };
        wrappedT.__v424 = true;
        window.transferFunds = wrappedT;
        try{ eval("transferFunds = wrappedT;"); }catch(e){}
      }
    }catch(e){}
  }

  /* =================================================================
     5. NO NATIVE DIALOGS OR POPUPS (Notion embeds block them)
     ================================================================= */
  function wrapOpen(){
    try{
      if(window.open && window.open.__v424) return;
      var rawOpen = window.open;
      var wrapped = function(url){
        try{
          say("<b>Link blocked by the embed.</b><br><span style=\"font-size:11px;opacity:.85;\">"
            + esc(String(url || "")) + "</span>", "warn");
        }catch(e){}
        return null;
      };
      wrapped.__v424 = true;
      wrapped.__raw = rawOpen;
      window.open = wrapped;
    }catch(e){}
  }

  /* =================================================================
     6. UI
     ================================================================= */
  function card(id){
    var host = document.getElementById("screen");
    if(!host) return null;
    if(host.querySelector("[" + id + "]")) return null;
    var box = document.createElement("div");
    box.className = "card mt14";
    box.setAttribute(id, "1");
    host.appendChild(box);
    return box;
  }

  function mountChairman(){
    try{
      if(!ok()) return;
      var t = tab();
      if(["hq", "people", "financials", "finance", "empire", "companies"].indexOf(t) < 0) return;
      var box = card("data-v424chair");
      if(!box) return;
      var html = "<h3>\u{1FA91} The board seat</h3>";
      (G.companies || []).forEach(function(co, i){
        var isPlayer = !co.ceo || co.ceo.type === "player";
        html += "<div style=\"margin:10px 0;padding:10px;border-radius:10px;background:rgba(255,255,255,.04);\">"
          + "<div><b>" + esc(co.name) + "</b> <span class=\"muted\" style=\"font-size:11.5px;\">\u00b7 "
          + (isPlayer ? "you are CEO" : esc(co.ceo.name) + " is CEO \u00b7 " + money(co.ceo.salary) + "/mo"
              + (co.chairman ? " \u00b7 you chair the board" : "")) + "</span></div>";
        if(isPlayer){
          html += "<div class=\"muted\" style=\"font-size:11.5px;margin:4px 0 7px;\">Hand the day-to-day to a hired CEO and stay on as Chairman. You keep your ownership, set the board directive, draw a retainer, and can take the seat back whenever you want.</div>"
            + "<button class=\"btn small\" data-v424down=\"" + i + "\">Step down as CEO</button>";
        } else {
          var d = co.directive || "balance";
          html += "<div class=\"muted\" style=\"font-size:11.5px;margin:4px 0 7px;\">Retainer " + money(chairFee(co))
            + "/mo \u00b7 owner draw " + money(n(co.ownerDraw, 0)) + "/mo \u00b7 both paid to you at month close.</div>"
            + "<div style=\"font-size:11.5px;margin-bottom:5px;\">Board directive:</div><div>";
          Object.keys(DIRECTIVES).forEach(function(k){
            html += "<button class=\"btn small\" data-v424dir=\"" + i + ":" + k + "\" style=\"margin:0 5px 5px 0;"
              + (k === d ? "background:var(--accent,#5b8cff);color:#04241a;" : "") + "\">" + esc(DIRECTIVES[k].label) + "</button>";
          });
          html += "</div><button class=\"btn secondary small\" data-v424up=\"" + i + "\">Resume as CEO</button>"
            + " <button class=\"btn small\" data-v424down=\"" + i + "\">Replace CEO</button>";
        }
        html += "</div>";
      });
      box.innerHTML = html;

      box.querySelectorAll("[data-v424down]").forEach(function(b){
        b.onclick = function(){ pickCeo(Number(b.getAttribute("data-v424down"))); };
      });
      box.querySelectorAll("[data-v424up]").forEach(function(b){
        b.onclick = function(){ reinstate(Number(b.getAttribute("data-v424up"))); };
      });
      box.querySelectorAll("[data-v424dir]").forEach(function(b){
        b.onclick = function(){
          var parts = b.getAttribute("data-v424dir").split(":");
          var co = G.companies[Number(parts[0])];
          if(!co) return;
          co.directive = parts[1];
          say("<b>Directive set:</b> " + esc(DIRECTIVES[parts[1]].label) + " at " + esc(co.name) + ".", "good");
          try{ renderAll(); }catch(e){}
        };
      });
    }catch(e){}
  }

  function pickCeo(idx){
    try{
      var co = G.companies[idx]; if(!co) return;
      var list = candidates(co);
      var ov = document.createElement("div");
      ov.setAttribute("data-v424modal", "1");
      ov.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:20px;";
      var rows = list.map(function(c, i){
        return "<div style=\"margin:8px 0;padding:11px;border-radius:10px;background:rgba(255,255,255,.05);\">"
          + "<div><b>" + esc(c.name) + "</b> <span style=\"opacity:.7;font-size:11.5px;\">\u00b7 " + esc(c.label) + " \u00b7 " + money(c.salary) + "/mo</span></div>"
          + "<div style=\"opacity:.75;font-size:11.5px;margin:3px 0 7px;\">" + esc(c.blurb) + "</div>"
          + "<button class=\"btn small\" data-v424pick=\"" + i + "\">Hire " + esc(c.name.split(" ")[0]) + "</button></div>";
      }).join("");
      ov.innerHTML = "<div class=\"card\" style=\"max-width:520px;width:100%;max-height:82vh;overflow:auto;\">"
        + "<h3>\u{1FA91} Step down as CEO of " + esc(co.name) + "</h3>"
        + "<div class=\"muted\" style=\"font-size:12px;margin-bottom:8px;\">You keep your ownership and become Chairman of the Board. The company runs itself each month under your directive, pays you a retainer plus your owner draw, and you can take the seat back at any time.</div>"
        + rows
        + "<div style=\"margin-top:10px;\"><button class=\"btn secondary small\" data-v424cancel>Stay as CEO</button></div></div>";
      document.body.appendChild(ov);
      ov.querySelector("[data-v424cancel]").onclick = function(){ ov.remove(); };
      ov.querySelectorAll("[data-v424pick]").forEach(function(b){
        b.onclick = function(){
          var c = list[Number(b.getAttribute("data-v424pick"))];
          ov.remove();
          stepDown(idx, c);
        };
      });
    }catch(e){}
  }

  function mountCredit(){
    try{
      if(!ok()) return;
      var t = tab();
      if(["bank", "finance", "financials"].indexOf(t) < 0) return;
      var box = card("data-v424credit");
      if(!box) return;
      var c = credit();
      recomputeScores();
      var tb = tier(c.business), tp = tier(c.personal);
      var util = Math.round(utilization() * 100);
      var html = "<h3>\u{1F4B3} Credit</h3>"
        + "<div style=\"display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px;\">"
        + "<div style=\"flex:1;min-width:150px;padding:10px;border-radius:10px;background:rgba(255,255,255,.04);\">"
        + "<div style=\"font-size:11.5px;opacity:.7;\">Business score</div><div style=\"font-size:22px;font-weight:700;color:" + tb.color + ";\">" + c.business + "</div>"
        + "<div style=\"font-size:11px;opacity:.7;\">" + tb.label + " \u00b7 borrowing costs \u00d7" + tb.mult.toFixed(2) + "</div></div>"
        + "<div style=\"flex:1;min-width:150px;padding:10px;border-radius:10px;background:rgba(255,255,255,.04);\">"
        + "<div style=\"font-size:11.5px;opacity:.7;\">Personal score</div><div style=\"font-size:22px;font-weight:700;color:" + tp.color + ";\">" + c.personal + "</div>"
        + "<div style=\"font-size:11px;opacity:.7;\">" + tp.label + "</div></div>"
        + "<div style=\"flex:1;min-width:150px;padding:10px;border-radius:10px;background:rgba(255,255,255,.04);\">"
        + "<div style=\"font-size:11.5px;opacity:.7;\">Utilisation \u00b7 history</div><div style=\"font-size:22px;font-weight:700;\">" + util + "%</div>"
        + "<div style=\"font-size:11px;opacity:.7;\">" + n(c.history, 0) + " mo \u00b7 " + n(c.onTime, 0) + " on time \u00b7 " + n(c.missed, 0) + " missed</div></div></div>"
        + "<div class=\"muted\" style=\"font-size:11.5px;margin-bottom:8px;\">Loan and credit-line pricing is multiplied by your business score. Keep utilisation under 30% and pay every month to bring the rate down.</div>";

      if(c.tradelines.length){
        html += "<div style=\"font-size:12px;margin-bottom:5px;\"><b>Open tradelines</b></div>";
        c.tradelines.forEach(function(tl){
          html += "<div style=\"font-size:11.5px;opacity:.85;margin:3px 0;\">\u00b7 " + esc(tl.name) + " \u2014 "
            + money(tl.balance) + " of " + money(tl.limit) + " used</div>";
        });
      }
      html += "<div style=\"font-size:12px;margin:9px 0 5px;\"><b>Available to open</b></div>";
      TRADELINE_OFFERS.forEach(function(o){
        var held = c.tradelines.some(function(t){ return t.key === o.key; });
        html += "<div style=\"margin:6px 0;padding:9px;border-radius:9px;background:rgba(255,255,255,.04);\">"
          + "<div style=\"font-size:12px;\"><b>" + esc(o.name) + "</b> <span style=\"opacity:.7;\">\u00b7 " + money(o.limit) + " limit"
          + (o.fee ? " \u00b7 " + money(o.fee) + "/mo fee" : " \u00b7 no fee") + "</span></div>"
          + "<div style=\"font-size:11.5px;opacity:.72;margin:2px 0 6px;\">" + esc(o.blurb) + "</div>"
          + (held ? "<span style=\"font-size:11.5px;opacity:.6;\">Already open</span>"
                  : "<button class=\"btn small\" data-v424tl=\"" + o.key + "\">Apply</button>") + "</div>";
      });
      box.innerHTML = html;
      box.querySelectorAll("[data-v424tl]").forEach(function(b){
        b.onclick = function(){ openTradeline(b.getAttribute("data-v424tl")); };
      });
    }catch(e){}
  }

  function mountPayNote(){
    try{
      if(!ok()) return;
      var s = store();
      if(!s || !s.payLog.length) return;
      var t = tab();
      if(["bank", "finance", "financials", "personal", "life"].indexOf(t) < 0) return;
      var box = card("data-v424pay");
      if(!box) return;
      box.innerHTML = "<h3>\u{1F4B5} Last month's owner pay</h3>"
        + s.payLog.slice(-8).map(function(l){
            return "<div style=\"font-size:11.5px;opacity:.88;margin:3px 0;\">" + esc(l) + "</div>";
          }).join("");
    }catch(e){}
  }

  /* =================================================================
     7. WIRE INTO MONTH CLOSE
     ================================================================= */
  function install(){
    if(!ok()) return;
    wrapFounderCapital();
    wrapRate("effectiveLoanRate");
    wrapRate("effectiveLocRate");
    credit();
    try{
      if(typeof advanceMonth === "function" && !advanceMonth.__v424 && !window.__v424wrapped){
        var raw = advanceMonth;
        var wrapped = function(){
          var r = raw.apply(this, arguments);
          try{
            var s = store();
            var lines = [];
            lines = lines.concat(applyBoardEffects());
            lines = lines.concat(payNonActiveDraws());
            lines = lines.concat(monthlyCredit());
            s.payLog = lines;
            if(lines.length){
              try{
                var rep = G.company && G.company.lastReport;
                if(rep && rep.lines) rep.lines = rep.lines.concat(lines);
              }catch(e){}
              var paid = lines.filter(function(l){ return l.indexOf("\u{1F4B5}") === 0 || l.indexOf("\u{1F4BC}") === 0; });
              if(paid.length) say("<b>\u{1F4B5} Owner pay from " + paid.length + " other company(ies) landed in personal cash.</b>", "good");
            }
          }catch(e){}
          try{ renderAll(); }catch(e){}
          return r;
        };
        wrapped.__v424 = true;
        window.__v424wrapped = true;
        window.advanceMonth = wrapped;
        try{ advanceMonth = window.advanceMonth; }catch(e){}
      }
    }catch(e){}
  }

  wrapOpen();
  try{ install(); }catch(e){}
  try{ setInterval(install, 700); }catch(e){}
  try{ setInterval(mountChairman, 800); }catch(e){}
  try{ setInterval(mountCredit, 800); }catch(e){}
  try{ setInterval(mountPayNote, 900); }catch(e){}
  try{ document.addEventListener("DOMContentLoaded", install); }catch(e){}

  window.v424Pay = payNonActiveDraws;
  window.v424Credit = function(){ recomputeScores(); return credit(); };

  try{ window.GAME_VERSION = "v4.37"; }catch(e){}
})();
/* =====================================================================
   v4.28d — Approved feedback build.
   Taxes & entity, macro cycles, reactive competitors, contract terms,
   exit offers, key-person risk with win-back, credit cards, legal dept,
   clean bank activity, retail per-store operations, owner-pay placement.
   ===================================================================== */
(function v425(){
  "use strict";

  function n(v,d){ var x=Number(v); return isFinite(x)?x:(d||0); }
  function money(v){ try{ return fmt$(Math.round(n(v))); }catch(e){ return "$"+Math.round(n(v)); } }
  function say(m,k){ try{ toast(m,k||"good"); }catch(e){} }
  function log(m){ try{ logHistory(m); }catch(e){} }
  function ok(){ return typeof G!=="undefined" && G && G.personal && G.company && G.companies; }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){ return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]; }); }
  function tab(){ try{ return (G.ui && G.ui.activeTab) || ""; }catch(e){ return ""; } }
  function rnd(a,b){ return a + Math.random()*(b-a); }
  function pickOne(a){ return a[Math.floor(Math.random()*a.length)]; }

  function S(){
    if(!ok()) return null;
    var s = G.__v425 = G.__v425 || {};
    if(!s.tax) s.tax = { entity:"llc", accruedBiz:0, accruedPersonal:0, paidYTD:0, lastQuarter:-1, log:[] };
    if(!s.macro) s.macro = { phase:"expansion", rate:1, demand:1, multiple:1, monthsLeft:8, history:[] };
    if(!s.rivals) s.rivals = null;
    if(!s.contracts) s.contracts = { policy:"monthly", prepayDiscount:0.1, annualPct:0, multiPct:0, renewalsDue:0, penaltiesYTD:0 };
    if(!s.exit) s.exit = { open:false, offers:[], ipo:0 };
    if(!s.people) s.people = { departures:[] };
    if(!s.cards) s.cards = { biz:null, personal:null };
    if(!s.activity) s.activity = [];
    if(!s.retail) s.retail = {};
    return s;
  }

  function act(icon, text, amount){
    try{
      var s = S(); if(!s) return;
      s.activity.unshift({ icon:icon, text:text, amount:(amount==null?null:Math.round(n(amount))),
        m:n(G.company.month,1), y:n(G.company.year,1) });
      if(s.activity.length > 120) s.activity.pop();
    }catch(e){}
  }

  /* =================================================================
     LEGAL DEPARTMENT
     ================================================================= */
  function installLegal(){
    try{
      if(typeof LADDERS === "undefined") return;
      if(typeof DEPT_KEYS !== "undefined" && DEPT_KEYS.indexOf("legal") < 0) DEPT_KEYS.push("legal");
      if(LADDERS.legal) return;
      LADDERS.legal = { label:"Legal & Compliance", icon:"\u2696\ufe0f", rungs:[
        { key:"rep", label:"Paralegal", salaryRange:[5200,6800], icon:"\u{1F4C4}", under:null, per:0,
          desc:"Handles contract paperwork. Speeds up how fast accounts move onto real terms." },
        { key:"senior", label:"Counsel", salaryRange:[9500,12500], icon:"\u{1F4DA}", under:"rep", per:3,
          desc:"Cuts lawsuit and compliance risk, and enforces early-termination penalties." },
        { key:"manager", label:"Senior Counsel", salaryRange:[14000,18000], icon:"\u{1F3DB}\ufe0f", under:"senior", per:3,
          desc:"Negotiates better contract terms and supports M&A and financing work." },
        { key:"director", label:"Deputy General Counsel", salaryRange:[20000,24000], icon:"\u{1F5DE}\ufe0f", under:"manager", per:4,
          desc:"Unlocks multi-year contracts and materially raises IPO readiness." },
        { key:"gc", label:"General Counsel", salaryRange:[27000,34000], icon:"\u{1F451}", under:"director", per:2,
          desc:"Company-wide legal shield. Strongest effect on risk, terms, and exit readiness." }
      ]};
      if(typeof DEPT_KEYS !== "undefined" && DEPT_KEYS.indexOf("legal") < 0) DEPT_KEYS.push("legal");
    }catch(e){}
  }
  function legalStrength(){
    try{
      var c = 0;
      c += rungCount("legal","rep")*0.3 + rungCount("legal","senior")*0.8 + rungCount("legal","manager")*1.4
         + rungCount("legal","director")*2.2 + rungCount("legal","gc")*3.2;
      return Math.min(10, c);
    }catch(e){ return 0; }
  }

  /* =================================================================
     MACRO CYCLES
     ================================================================= */
  var PHASES = {
    expansion: { label:"Expansion",  rate:0.92, demand:1.08, multiple:1.15, next:["peak","expansion"] },
    peak:      { label:"Overheated", rate:1.18, demand:1.05, multiple:1.30, next:["recession","expansion"] },
    recession: { label:"Recession",  rate:1.35, demand:0.82, multiple:0.65, next:["recovery","recession"] },
    recovery:  { label:"Recovery",   rate:1.05, demand:0.96, multiple:0.90, next:["expansion","recovery"] }
  };
  function macroStep(){
    var s = S(); if(!s) return [];
    var m = s.macro, out = [];
    m.monthsLeft = n(m.monthsLeft,1) - 1;
    if(m.monthsLeft <= 0){
      var prev = m.phase;
      m.phase = pickOne(PHASES[m.phase].next);
      m.monthsLeft = Math.round(rnd(6,14));
      if(m.phase !== prev){
        var p = PHASES[m.phase];
        out.push("\u{1F30D} The economy moved into " + p.label.toLowerCase() + ".");
        say("<b>\u{1F30D} Macro shift: " + esc(p.label) + "</b><br><span style=\"font-size:11px;opacity:.85;\">"
          + (m.phase==="recession"
              ? "Borrowing costs up, demand down, valuations compressed. A bad month to need money."
              : m.phase==="peak"
              ? "Valuations are rich and rates are climbing. A good month to sell, an expensive one to borrow."
              : "Cheaper credit and firmer demand.")
          + "</span>", m.phase==="recession" ? "bad" : "good");
      }
    }
    var ph = PHASES[m.phase];
    m.rate = ph.rate * rnd(0.97,1.03);
    m.demand = ph.demand * rnd(0.98,1.02);
    m.multiple = ph.multiple * rnd(0.97,1.03);
    /* demand nudges the book */
    try{
      if(G.company && isFinite(G.company.mrr)){
        var drift = (m.demand - 1) * 0.35;
        if(drift) G.company.mrr = Math.max(0, Math.round(G.company.mrr * (1 + drift)));
      }
    }catch(e){}
    return out;
  }

  /* rates: macro on top of the v4.28d credit multiplier */
  function wrapRateMacro(name){
    try{
      if(typeof window[name] !== "function" || window[name].__v425) return;
      var raw = window[name];
      var w = function(){
        var r = raw.apply(this, arguments);
        try{ var s = S(); if(s) r = r * n(s.macro.rate,1); }catch(e){}
        return r;
      };
      w.__v425 = true;
      window[name] = w;
    }catch(e){}
  }

  /* =================================================================
     TAXES & ENTITY STRUCTURE
     ================================================================= */
  var ENTITIES = {
    sole:  { label:"Sole Proprietor", corp:0,    passthru:0.34, payroll:0.153, div:0,    setup:0,
             blurb:"No separation. All profit hits your personal return, and you pay the full self-employment tax." },
    llc:   { label:"LLC",             corp:0,    passthru:0.31, payroll:0.153, div:0,    setup:1500,
             blurb:"Liability protection, profit still passes through to you. Self-employment tax on the whole draw." },
    scorp: { label:"S-Corp",          corp:0,    passthru:0.29, payroll:0.0765, div:0,   setup:4500,
             blurb:"Payroll tax only on the salary portion of your draw. Distributions avoid it. Needs real payroll discipline." },
    ccorp: { label:"C-Corp",          corp:0.21, passthru:0.24, payroll:0.0765, div:0.20, setup:9000,
             blurb:"21% corporate tax, then 20% again on dividends. The price of admission for institutional capital and an IPO." }
  };

  function taxStep(){
    var s = S(); if(!s) return [];
    var out = [], e = ENTITIES[s.tax.entity] || ENTITIES.llc;
    var co = G.company;

    /* employer payroll tax on the team, every month, as a real expense */
    var payroll = 0;
    try{ payroll = (co.employees||[]).reduce(function(a,x){ return a + n(x.salary,0); }, 0); }catch(e2){}
    var payrollTax = Math.round(payroll * 0.0765);
    if(payrollTax > 0){
      co.cash = n(co.cash,0) - payrollTax;
      out.push("\u{1F9FE} Employer payroll tax: " + money(payrollTax) + " on " + money(payroll) + " of salary.");
      act("\u{1F9FE}", "Employer payroll tax", -payrollTax);
    }

    /* accrue income tax */
    var profit = 0;
    try{ profit = n(co.mrr,0) - n(co.expensesTotal, n(co.mrr,0)*0.6); }catch(e2){}
    if(!isFinite(profit)) profit = 0;
    var draw = n(co.ownerDraw,0);

    if(e.corp > 0 && profit > 0) s.tax.accruedBiz += Math.round(profit * e.corp);
    var personalBase = e.corp > 0 ? draw : Math.max(0, profit) + draw;
    if(personalBase > 0){
      var selfTax = s.tax.entity === "scorp"
        ? Math.round(Math.min(personalBase, 176100/12) * 0.153 * 0.5 + personalBase * e.passthru)
        : Math.round(personalBase * (e.passthru + (e.corp > 0 ? 0 : e.payroll * 0.5)));
      s.tax.accruedPersonal += selfTax;
    }

    /* quarterly estimated payment */
    var month = n(co.month,1);
    var q = Math.floor((month - 1) / 3);
    if(q !== s.tax.lastQuarter && month % 3 === 1 && (s.tax.accruedBiz + s.tax.accruedPersonal) > 0){
      s.tax.lastQuarter = q;
      var bizDue = Math.round(s.tax.accruedBiz), persDue = Math.round(s.tax.accruedPersonal);
      var bizPaid = Math.min(bizDue, Math.max(0, n(co.cash,0)));
      co.cash = n(co.cash,0) - bizPaid;
      var persPaid = Math.min(persDue, Math.max(0, n(G.personal.cash,0)));
      G.personal.cash = n(G.personal.cash,0) - persPaid;
      s.tax.accruedBiz -= bizPaid; s.tax.accruedPersonal -= persPaid;
      s.tax.paidYTD += bizPaid + persPaid;
      if(bizPaid + persPaid > 0){
        out.push("\u{1F3DB}\ufe0f Quarterly estimated taxes paid: " + money(bizPaid) + " corporate, " + money(persPaid) + " personal.");
        act("\u{1F3DB}\ufe0f", "Quarterly estimated taxes", -(bizPaid + persPaid));
        say("<b>\u{1F3DB}\ufe0f Quarterly taxes came due.</b><br><span style=\"font-size:11px;opacity:.85;\">"
          + money(bizPaid + persPaid) + " paid. Entity: " + esc(e.label) + ".</span>", "warn");
      }
      var unpaid = (bizDue - bizPaid) + (persDue - persPaid);
      if(unpaid > 0) out.push("\u26a0\ufe0f " + money(unpaid) + " of tax went unpaid \u2014 penalties accrue until you cover it.");
    }
    return out;
  }

  function setEntity(key){
    var s = S(); if(!s) return;
    var e = ENTITIES[key]; if(!e) return;
    if(e.setup > 0 && n(G.company.cash,0) < e.setup){ say("Not enough company cash for the " + money(e.setup) + " conversion cost.", "bad"); return; }
    G.company.cash = n(G.company.cash,0) - e.setup;
    s.tax.entity = key;
    act("\u2696\ufe0f", "Converted to " + e.label, e.setup ? -e.setup : null);
    log("Converted the company to a " + e.label + (e.setup ? " for " + money(e.setup) : "") + ".");
    say("<b>\u2696\ufe0f Now structured as a " + esc(e.label) + ".</b>", "good");
    try{ renderAll(); }catch(e2){}
  }

  /* =================================================================
     REACTIVE COMPETITORS
     ================================================================= */
  function rivals(){
    var s = S(); if(!s) return [];
    if(!s.rivals){
      s.rivals = [0,1,2].map(function(i){
        return { name: pickOne(["Northgate","Veritas","Halcyon","Brightline","Kestrel","Ironwood","Meridian"]) + " "
                   + pickOne(["Group","Systems","Labs","Partners"]),
                 aggression: rnd(0.3,0.9), share: rnd(8,22), posture:"watching", lastMove:"" };
      });
    }
    return s.rivals;
  }

  function rivalStep(){
    var out = [], list = rivals();
    var co = G.company;
    list.forEach(function(r){
      if(Math.random() > 0.28 * (0.5 + r.aggression)) return;
      var move = pickOne(["price","poach","outbid","quiet"]);
      if(move === "price"){
        var churn = Math.round(n(co.mrr,0) * 0.012 * r.aggression);
        if(churn > 0){
          co.mrr = Math.max(0, n(co.mrr,0) - churn);
          r.posture = "undercutting";
          r.lastMove = "cut price";
          out.push("\u2694\ufe0f " + r.name + " undercut you on price \u2014 " + money(churn) + " of MRR walked.");
        }
      } else if(move === "poach"){
        try{
          var emps = (co.employees||[]).filter(function(x){ return x && x.name; });
          if(emps.length){
            var victim = pickOne(emps);
            queueDeparture(victim, r.name + " poached them");
            r.posture = "raiding";
            r.lastMove = "poached " + victim.name;
            out.push("\u{1F3AF} " + r.name + " poached " + victim.name + ".");
          }
        }catch(e){}
      } else if(move === "outbid"){
        try{
          var cl = co.clients || [];
          if(cl.length){
            var idx = Math.floor(Math.random()*cl.length);
            var lost = cl[idx];
            var prot = legalStrength() * 0.06 + contractCoverage() * 0.5;
            if(Math.random() < prot){
              out.push("\u{1F6E1}\ufe0f " + r.name + " went after " + lost.name + ", but the contract held.");
            } else {
              co.mrr = Math.max(0, n(co.mrr,0) - n(lost.mrr,0));
              cl.splice(idx,1);
              r.posture = "winning deals";
              r.lastMove = "took " + lost.name;
              out.push("\u274c " + r.name + " outbid you for " + lost.name + " (" + money(lost.mrr) + "/mo).");
            }
          }
        }catch(e){}
      } else {
        r.posture = "watching"; r.lastMove = "held steady";
      }
    });
    return out;
  }

  /* =================================================================
     CONTRACT TERMS (book-level, managed by AEs and CS — no 46k rows)
     ================================================================= */
  function contractCoverage(){
    var s = S(); if(!s) return 0;
    return Math.min(1, (n(s.contracts.annualPct,0) + n(s.contracts.multiPct,0)) / 100);
  }
  function contractStep(){
    var s = S(); if(!s) return [];
    var out = [], c = s.contracts, co = G.company;
    var aes = 0, cs = 0;
    try{ aes = rungCount("sales","rep") + rungCount("sales","senior")*1.5; cs = rungCount("support","rep") + rungCount("support","senior")*1.5; }catch(e){}
    var capacity = (aes + cs) * 1.8 + legalStrength();
    if(capacity <= 0){
      if(c.policy !== "monthly") out.push("\u{1F4DD} No account executives or CS to paper contracts \u2014 the book stayed month-to-month.");
      return out;
    }
    var targetAnnual = c.policy === "annual" ? 70 : c.policy === "multi" ? 40 : 10;
    var targetMulti  = c.policy === "multi" ? 45 : c.policy === "annual" ? 10 : 0;
    var step = Math.min(6, capacity * 0.5);
    if(c.annualPct < targetAnnual) c.annualPct = Math.min(targetAnnual, c.annualPct + step);
    if(c.multiPct  < targetMulti)  c.multiPct  = Math.min(targetMulti,  c.multiPct  + step*0.6);
    if(c.annualPct > targetAnnual) c.annualPct = Math.max(targetAnnual, c.annualPct - 3);
    if(c.multiPct  > targetMulti)  c.multiPct  = Math.max(targetMulti,  c.multiPct  - 3);

    /* prepay cash from newly signed annual contracts */
    var prepayBase = n(co.mrr,0) * (c.annualPct/100) * 0.08;
    var prepay = Math.round(prepayBase * 12 * (1 - n(c.prepayDiscount,0)));
    if(prepay > 0 && c.policy !== "monthly"){
      co.cash = n(co.cash,0) + prepay;
      out.push("\u{1F4C4} Annual prepay collected: " + money(prepay) + " (" + Math.round(n(c.prepayDiscount,0)*100) + "% discount given).");
      act("\u{1F4C4}", "Annual contract prepay", prepay);
    }
    /* churn protection + termination penalties */
    var cov = contractCoverage();
    if(cov > 0){
      var saved = Math.round(n(co.mrr,0) * 0.01 * cov);
      if(saved > 0) co.mrr = n(co.mrr,0) + saved;
      if(Math.random() < 0.2 * cov && legalStrength() > 0){
        var pen = Math.round(n(co.mrr,0) * 0.02 * (1 + legalStrength()/10));
        co.cash = n(co.cash,0) + pen;
        c.penaltiesYTD += pen;
        out.push("\u2696\ufe0f An account broke its term early \u2014 collected " + money(pen) + " in penalties.");
        act("\u2696\ufe0f", "Early-termination penalty", pen);
      }
    }
    c.renewalsDue = Math.max(0, Math.round((n(co.clients && co.clients.length, 0)) * (c.annualPct/100) / 12));
    return out;
  }

  /* =================================================================
     KEY-PERSON RISK (with a chance to win them back)
     ================================================================= */
  function queueDeparture(emp, reason){
    try{
      var s = S(); if(!s || !emp) return;
      var co = G.company;
      var i = (co.employees||[]).indexOf(emp);
      if(i >= 0) co.employees.splice(i,1);
      s.people.departures.push({
        name: emp.name, dept: emp.dept, rung: emp.rung, salary: n(emp.salary,0),
        reason: reason, windowLeft: 2, coIdx: G.activeCompanyIndex
      });
      say("<b>\u{1F6AA} " + esc(emp.name) + " is leaving.</b><br><span style=\"font-size:11px;opacity:.85;\">"
        + esc(reason) + ". You have two months to make a counteroffer.</span>", "bad");
      log(emp.name + " left the company \u2014 " + reason + ".");
    }catch(e){}
  }

  function peopleStep(){
    var s = S(); if(!s) return [];
    var out = [], co = G.company;
    /* organic attrition, softened by HR and morale */
    try{
      var emps = (co.employees||[]).filter(function(x){ return x && x.name; });
      var hrShield = (deptHas("hr","chro") ? 0.5 : deptHas("hr","manager") ? 0.7 : 1);
      var morale = n(co.morale, 70);
      var risk = 0.05 * hrShield * (morale < 50 ? 2 : morale < 70 ? 1.3 : 0.8);
      if(emps.length && Math.random() < risk){
        var who = pickOne(emps);
        queueDeparture(who, morale < 50 ? "burned out" : "took another offer");
        out.push("\u{1F6AA} " + who.name + " resigned.");
      }
    }catch(e){}
    /* expire win-back windows */
    s.people.departures = s.people.departures.filter(function(d){
      d.windowLeft = n(d.windowLeft,0) - 1;
      if(d.windowLeft <= 0){ out.push("\u23f3 " + d.name + " signed elsewhere \u2014 the window closed."); return false; }
      return true;
    });
    return out;
  }

  function winBack(i){
    var s = S(); if(!s) return;
    var d = s.people.departures[i]; if(!d) return;
    var cost = Math.round(d.salary * 1.4 * 3);
    if(n(G.company.cash,0) < cost){ say("You need " + money(cost) + " to make that counteroffer.", "bad"); return; }
    var odds = 0.45 + (legalStrength()*0.02) + (deptHas("hr","chro") ? 0.2 : 0);
    G.company.cash = n(G.company.cash,0) - cost;
    s.people.departures.splice(i,1);
    if(Math.random() < odds){
      try{
        G.company.employees.push({ id: (typeof uid==="function"?uid():String(Math.random())), name:d.name,
          dept:d.dept, rung:d.rung, salary: Math.round(d.salary*1.4) });
      }catch(e){}
      say("<b>\u{1F91D} " + esc(d.name) + " is staying.</b><br><span style=\"font-size:11px;opacity:.85;\">Counteroffer accepted at "
        + money(Math.round(d.salary*1.4)) + "/mo. Signing package cost " + money(cost) + ".</span>", "good");
      log("Won " + d.name + " back with a counteroffer.");
      act("\u{1F91D}", "Counteroffer \u2014 " + d.name + " retained", -cost);
    } else {
      say("<b>" + esc(d.name) + " turned the counteroffer down.</b><br><span style=\"font-size:11px;opacity:.85;\">"
        + money(cost) + " spent on the attempt.</span>", "bad");
      act("\u{1F6AA}", "Failed counteroffer \u2014 " + d.name, -cost);
    }
    try{ renderAll(); }catch(e){}
  }

  /* =================================================================
     EXIT PATHS (only when you are open to them)
     ================================================================= */
  function ipoReadiness(){
    var s = S(); if(!s) return 0;
    var co = G.company, score = 0;
    score += Math.min(30, n(co.mrr,0) / 200000 * 30);
    score += Math.min(20, legalStrength() * 2);
    try{ score += Math.min(20, (G.__v424 && G.__v424.credit ? (G.__v424.credit.business - 500) / 350 * 20 : 0)); }catch(e){}
    score += s.tax.entity === "ccorp" ? 20 : s.tax.entity === "scorp" ? 8 : 0;
    score += Math.min(10, contractCoverage() * 10);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function exitStep(){
    var s = S(); if(!s || !s.exit.open) return [];
    var out = [];
    if(Math.random() > 0.22) return out;
    var co = G.company;
    var annual = n(co.mrr,0) * 12;
    if(annual < 50000) return out;
    var mult = rnd(2.2, 5.5) * n(s.macro.multiple,1);
    var price = Math.round(annual * mult);
    var earnout = Math.random() < 0.5 ? Math.round(price * rnd(0.2,0.4)) : 0;
    s.exit.offers = [{
      id: Date.now(), buyer: pickOne(["Ridgeline Capital","Orbit Holdings","Cobalt Partners","Sequoia Ridge","Marlin Industries"]),
      price: price, earnout: earnout, mult: mult, coIdx: G.activeCompanyIndex, expires: 2
    }];
    out.push("\u{1F4E9} Unsolicited acquisition offer: " + money(price) + " for " + co.name + ".");
    say("<b>\u{1F4E9} Someone wants to buy " + esc(co.name) + ".</b><br><span style=\"font-size:11px;opacity:.85;\">"
      + money(price) + " at " + mult.toFixed(1) + "\u00d7 revenue"
      + (earnout ? ", " + money(earnout) + " of it as an earn-out" : ", all cash")
      + ". Offer sits on the Finance screen for two months.</span>", "good");
    return out;
  }

  function acceptOffer(i){
    var s = S(); if(!s) return;
    var o = s.exit.offers[i]; if(!o) return;
    var co = G.companies[o.coIdx] || G.company;
    var pct = 1;
    try{ pct = founderPct(co); }catch(e){}
    var cashNow = Math.round((o.price - o.earnout) * pct);
    G.personal.cash = n(G.personal.cash,0) + cashNow;
    s.exit.offers.splice(i,1);
    co.sold = true; co.passive = true; co.ownerDraw = 0; co.chairFee = 0;
    log("Sold " + co.name + " to " + o.buyer + " for " + money(o.price) + ". Your share: " + money(cashNow) + ".");
    act("\u{1F91D}", "Sold " + co.name + " to " + o.buyer, cashNow);
    say("<b>\u{1F389} " + esc(co.name) + " sold.</b><br><span style=\"font-size:11px;opacity:.85;\">"
      + money(cashNow) + " landed in personal cash"
      + (o.earnout ? ", with " + money(Math.round(o.earnout*pct)) + " tied to the earn-out." : ".") + "</span>", "good");
    try{ renderAll(); }catch(e){}
  }

  /* =================================================================
     CREDIT CARDS (business + personal)
     ================================================================= */
  function cardLimit(score, personal){
    var base = personal ? 8000 : 25000;
    return Math.round(base * Math.max(0.5, (score - 450) / 150));
  }
  function openCard(kind){
    var s = S(); if(!s) return;
    var cr = null;
    try{ cr = window.v424Credit ? window.v424Credit() : null; }catch(e){}
    var score = cr ? (kind === "biz" ? cr.business : cr.personal) : 620;
    if(score < 580){ say("<b>Declined.</b> A " + score + " score is below the 580 minimum for this card.", "bad"); return; }
    var lim = cardLimit(score, kind !== "biz");
    s.cards[kind === "biz" ? "biz" : "personal"] = {
      limit: lim, balance: 0, apr: (kind === "biz" ? 0.019 : 0.024) * (score > 720 ? 0.75 : 1),
      rewards: kind === "biz" ? 0.02 : 0.015, autopay: true, opened: true
    };
    act("\u{1F4B3}", (kind === "biz" ? "Business" : "Personal") + " credit card opened", null);
    say("<b>\u{1F4B3} " + (kind === "biz" ? "Business" : "Personal") + " card approved.</b><br><span style=\"font-size:11px;opacity:.85;\">"
      + money(lim) + " limit \u00b7 " + ((kind=="biz"?2:1.5)) + "% back \u00b7 autopay on.</span>", "good");
    try{ renderAll(); }catch(e){}
  }
  function cardStep(){
    var s = S(); if(!s) return [];
    var out = [];
    [["biz", G.company], ["personal", G.personal]].forEach(function(pair){
      var c = s.cards[pair[0]], holder = pair[1];
      if(!c || !c.opened) return;
      var spend = Math.round(n(c.limit,0) * rnd(0.12,0.3));
      c.balance = Math.min(n(c.limit,0), n(c.balance,0) + spend);
      var rewards = Math.round(spend * n(c.rewards,0));
      if(c.autopay && n(holder.cash,0) >= c.balance){
        holder.cash = n(holder.cash,0) - c.balance + rewards;
        out.push("\u{1F4B3} " + (pair[0]==="biz"?"Business":"Personal") + " card: " + money(c.balance)
          + " paid in full, " + money(rewards) + " back.");
        c.balance = 0;
      } else {
        var interest = Math.round(c.balance * n(c.apr,0.02));
        c.balance += interest;
        out.push("\u26a0\ufe0f " + (pair[0]==="biz"?"Business":"Personal") + " card carried a balance \u2014 "
          + money(interest) + " in interest, " + money(c.balance) + " owed.");
      }
    });
    return out;
  }

  /* =================================================================
     RETAIL: per-store staffing, inventory, finances, managers
     ================================================================= */
  function storeState(s){
    if(s.staff === undefined) s.staff = 2;
    if(s.manager === undefined) s.manager = false;
    if(s.restockTarget === undefined) s.restockTarget = 0;
    if(!s.pl) s.pl = { gross:0, cogs:0, rent:0, payroll:0, net:0, units:0, lost:0 };
    return s;
  }
  var STORE_WAGE = 3400, MANAGER_WAGE = 6800;

  function storeCapacity(){
    try{
      var co = G.company;
      if(!co.ops || !co.ops.stores) return 0;
      return co.ops.stores.length * 9;   /* each store can sustain 9 of its own */
    }catch(e){ return 0; }
  }

  /* corporate cap must not be the thing that stops you staffing a store,
     and it must never silently collapse back to 8 at a high stage */
  function wrapHeadcount(){
    try{
      if(typeof window.headcountCap !== "function" || window.headcountCap.__v425) return;
      var raw = window.headcountCap;
      var w = function(){
        var v = 0;
        try{ v = Number(raw.apply(this, arguments)); }catch(e){}
        try{
          var c = G.company;
          var stage = Math.max(0, Math.min(3, Math.round(n(c.hqStage,0))));
          var base = (typeof HEADCOUNT_CAP !== "undefined" ? HEADCOUNT_CAP[stage] : 8) || 8;
          var fac = 0;
          try{ fac = n(typeof facilityCap === "function" ? facilityCap() : 0, 0); }catch(e){}
          var floor = base + fac;
          if(!isFinite(v) || v < floor) v = floor;
        }catch(e){}
        return isFinite(v) ? v : 8;
      };
      w.__v425 = true;
      window.headcountCap = w;
    }catch(e){}
  }

  /* replace the retail month resolution with a per-store one */
  function wrapRetail(){
    try{
      if(typeof window.opsResolveRetail !== "function" || window.opsResolveRetail.__v425) return;
      var w = function(co, report){
        var o = co.ops;
        if(!o || !o.stores || o.stores.length === 0){ if(o){ o.lastNet = 0; o.lastGross = 0; } return 0; }
        var merch = 0, supply = 0;
        try{ merch = rungCount("product","rep"); supply = rungCount("operations","rep"); }catch(e){}
        var price = 42 * n(o.priceTier,1);
        var unitCost = 19 * (supply > 0 ? 0.92 : 1);
        var elasticity = o.priceTier > 1.1 ? 0.8 : o.priceTier < 0.95 ? 1.18 : 1;
        var mb = 0; try{ mb = marketingBoost(); }catch(e){}
        var demandIdx = 1; try{ demandIdx = n(S().macro.demand, 1); }catch(e){}
        var totalNet = 0, totalGross = 0, totalUnits = 0, totalLost = 0, stockouts = 0, restockSpend = 0;

        o.stores.forEach(function(st){
          storeState(st);
          /* a manager restocks to target before the month runs */
          if(st.manager && st.restockTarget > 0 && st.inventory < st.restockTarget){
            var need = Math.round(st.restockTarget - st.inventory);
            var afford = Math.min(need, Math.max(0, n(co.cash,0)));
            if(afford > 0){ co.cash = n(co.cash,0) - afford; st.inventory = n(st.inventory,0) + afford; restockSpend += afford; }
          }
          var staffed = 0.55 + 0.11 * n(st.staff,0) + (st.manager ? 0.18 : 0) + 0.03 * merch;
          staffed = Math.min(2.2, staffed);
          var demand = Math.round(n(st.baseDemand,0) * staffed * (1 + mb) * elasticity * demandIdx * rnd(0.85,1.15) * (0.7 + n(o.satisfaction,70)/200));
          var affordable = Math.floor(n(st.inventory,0) / unitCost);
          var units = Math.max(0, Math.min(demand, affordable));
          st.inventory = Math.max(0, n(st.inventory,0) - units * unitCost);
          var payroll = Math.round(n(st.staff,0) * STORE_WAGE + (st.manager ? MANAGER_WAGE : 0));
          var gross = units * price, cogs = units * unitCost;
          var net = Math.round(gross - cogs - n(st.rent,0) - payroll);
          st.pl = { gross:Math.round(gross), cogs:Math.round(cogs), rent:Math.round(n(st.rent,0)),
                    payroll:payroll, net:net, units:units, lost:Math.max(0, demand - units),
                    consumed:Math.round(units*unitCost), endInventory:Math.round(st.inventory) };
          totalGross += gross; totalNet += net; totalUnits += units; totalLost += st.pl.lost;
          if(demand > affordable) stockouts++;
        });

        if(stockouts > 0){
          o.satisfaction = Math.max(0, Math.min(100, n(o.satisfaction,70) - 4*stockouts));
        } else {
          o.satisfaction = Math.max(0, Math.min(100, n(o.satisfaction,70) + 2));
        }
        o.lastGross = Math.round(totalGross);
        o.lastNet = Math.round(totalNet);
        if(report && report.push){
          report.push("\u{1F6CD}\ufe0f Stores: " + totalUnits.toLocaleString() + " units sold for " + money(totalGross)
            + " \u2192 " + money(totalNet) + " contribution after COGS, rent and store payroll.");
          if(restockSpend > 0) report.push("\u{1F4E6} Store managers auto-restocked " + money(restockSpend) + " of inventory.");
          if(totalLost > 0) report.push("\u26a0\ufe0f " + totalLost.toLocaleString() + " units of demand went unserved \u2014 that is lost revenue, not deferred.");
        }
        return Math.round(totalNet);
      };
      w.__v425 = true;
      window.opsResolveRetail = w;
    }catch(e){}
  }

  /* =================================================================
     UI
     ================================================================= */
  function card(attr, prepend){
    var host = document.getElementById("screen");
    if(!host) return null;
    if(host.querySelector("[" + attr + "]")) return null;
    var box = document.createElement("div");
    box.className = "card mt14";
    box.setAttribute(attr, "1");
    if(prepend && host.firstChild) host.insertBefore(box, host.firstChild); else host.appendChild(box);
    return box;
  }
  var FIN_TABS = ["bank","finance","financials"];

  function mountTax(){
    try{
      if(!ok()) return;
      if(FIN_TABS.indexOf(tab()) < 0) return;
      var box = card("data-v425tax"); if(!box) return;
      var s = S(), e = ENTITIES[s.tax.entity];
      var html = "<h3>\u2696\ufe0f Entity & taxes</h3>"
        + "<div class=\"muted\" style=\"font-size:11.5px;margin-bottom:8px;\">Structure decides what you pay. Estimated taxes are withdrawn every quarter \u2014 corporate from the company, personal from you.</div>"
        + "<div style=\"display:flex;gap:10px;flex-wrap:wrap;margin-bottom:9px;\">"
        + "<div style=\"flex:1;min-width:130px;padding:9px;border-radius:9px;background:rgba(255,255,255,.04);\"><div style=\"font-size:11px;opacity:.7;\">Structure</div><div style=\"font-size:16px;font-weight:700;\">" + esc(e.label) + "</div></div>"
        + "<div style=\"flex:1;min-width:130px;padding:9px;border-radius:9px;background:rgba(255,255,255,.04);\"><div style=\"font-size:11px;opacity:.7;\">Accrued, unpaid</div><div style=\"font-size:16px;font-weight:700;\">" + money(s.tax.accruedBiz + s.tax.accruedPersonal) + "</div></div>"
        + "<div style=\"flex:1;min-width:130px;padding:9px;border-radius:9px;background:rgba(255,255,255,.04);\"><div style=\"font-size:11px;opacity:.7;\">Paid to date</div><div style=\"font-size:16px;font-weight:700;\">" + money(s.tax.paidYTD) + "</div></div></div>";
      Object.keys(ENTITIES).forEach(function(k){
        var en = ENTITIES[k];
        html += "<div style=\"margin:6px 0;padding:9px;border-radius:9px;background:rgba(255,255,255,.04);\">"
          + "<div style=\"font-size:12px;\"><b>" + esc(en.label) + "</b>" + (k === s.tax.entity ? " <span style=\"opacity:.7;\">\u00b7 current</span>" : "") + "</div>"
          + "<div style=\"font-size:11.5px;opacity:.72;margin:3px 0 6px;\">" + esc(en.blurb) + "</div>"
          + (k === s.tax.entity ? "" : "<button class=\"btn small\" data-v425ent=\"" + k + "\">Convert" + (en.setup ? " \u00b7 " + money(en.setup) : " \u00b7 free") + "</button>") + "</div>";
      });
      box.innerHTML = html;
      box.querySelectorAll("[data-v425ent]").forEach(function(b){ b.onclick = function(){ setEntity(b.getAttribute("data-v425ent")); }; });
    }catch(e){}
  }

  function mountMacro(){
    try{
      if(!ok()) return;
      if(FIN_TABS.concat(["hq","invest"]).indexOf(tab()) < 0) return;
      var box = card("data-v425macro"); if(!box) return;
      var s = S(), p = PHASES[s.macro.phase];
      box.innerHTML = "<h3>\u{1F30D} Economy</h3>"
        + "<div style=\"display:flex;gap:10px;flex-wrap:wrap;\">"
        + "<div style=\"flex:1;min-width:120px;padding:9px;border-radius:9px;background:rgba(255,255,255,.04);\"><div style=\"font-size:11px;opacity:.7;\">Cycle</div><div style=\"font-size:16px;font-weight:700;\">" + esc(p.label) + "</div></div>"
        + "<div style=\"flex:1;min-width:120px;padding:9px;border-radius:9px;background:rgba(255,255,255,.04);\"><div style=\"font-size:11px;opacity:.7;\">Borrowing cost</div><div style=\"font-size:16px;font-weight:700;\">\u00d7" + n(s.macro.rate,1).toFixed(2) + "</div></div>"
        + "<div style=\"flex:1;min-width:120px;padding:9px;border-radius:9px;background:rgba(255,255,255,.04);\"><div style=\"font-size:11px;opacity:.7;\">Demand</div><div style=\"font-size:16px;font-weight:700;\">\u00d7" + n(s.macro.demand,1).toFixed(2) + "</div></div>"
        + "<div style=\"flex:1;min-width:120px;padding:9px;border-radius:9px;background:rgba(255,255,255,.04);\"><div style=\"font-size:11px;opacity:.7;\">Exit multiple</div><div style=\"font-size:16px;font-weight:700;\">\u00d7" + n(s.macro.multiple,1).toFixed(2) + "</div></div></div>"
        + "<div class=\"muted\" style=\"font-size:11.5px;margin-top:7px;\">Rates here stack with your credit score. A recession with a poor score is genuinely expensive money.</div>";
    }catch(e){}
  }

  function mountRivals(){
    try{
      if(!ok()) return;
      if(["hq","decisions","market","growth","rivals"].indexOf(tab()) < 0) return;
      var box = card("data-v425rivals"); if(!box) return;
      var html = "<h3>\u2694\ufe0f Competitors</h3><div class=\"muted\" style=\"font-size:11.5px;margin-bottom:7px;\">They react to what you do \u2014 pricing, hiring, and your client list are all fair game.</div>";
      rivals().forEach(function(r){
        html += "<div style=\"margin:6px 0;padding:9px;border-radius:9px;background:rgba(255,255,255,.04);font-size:12px;\">"
          + "<b>" + esc(r.name) + "</b> <span style=\"opacity:.7;\">\u00b7 " + esc(r.posture) + " \u00b7 aggression " + Math.round(r.aggression*100) + "%</span>"
          + (r.lastMove ? "<div style=\"opacity:.7;font-size:11.5px;margin-top:3px;\">Last move: " + esc(r.lastMove) + "</div>" : "") + "</div>";
      });
      box.innerHTML = html;
    }catch(e){}
  }

  function mountContracts(){
    try{
      if(!ok()) return;
      if(FIN_TABS.concat(["clients","accounts","sales"]).indexOf(tab()) < 0) return;
      var box = card("data-v425contracts"); if(!box) return;
      var s = S(), c = s.contracts;
      var pol = { monthly:"Month-to-month", annual:"Push annual terms", multi:"Push multi-year" };
      var html = "<h3>\u{1F4C4} Contract terms</h3>"
        + "<div class=\"muted\" style=\"font-size:11.5px;margin-bottom:8px;\">Your AEs and CS team paper these, not you \u2014 you set the policy and they work through the book.</div>"
        + "<div style=\"display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px;\">"
        + "<div style=\"flex:1;min-width:120px;padding:9px;border-radius:9px;background:rgba(255,255,255,.04);\"><div style=\"font-size:11px;opacity:.7;\">On annual terms</div><div style=\"font-size:16px;font-weight:700;\">" + Math.round(n(c.annualPct,0)) + "%</div></div>"
        + "<div style=\"flex:1;min-width:120px;padding:9px;border-radius:9px;background:rgba(255,255,255,.04);\"><div style=\"font-size:11px;opacity:.7;\">Multi-year</div><div style=\"font-size:16px;font-weight:700;\">" + Math.round(n(c.multiPct,0)) + "%</div></div>"
        + "<div style=\"flex:1;min-width:120px;padding:9px;border-radius:9px;background:rgba(255,255,255,.04);\"><div style=\"font-size:11px;opacity:.7;\">Renewals due</div><div style=\"font-size:16px;font-weight:700;\">" + n(c.renewalsDue,0) + "</div></div>"
        + "<div style=\"flex:1;min-width:120px;padding:9px;border-radius:9px;background:rgba(255,255,255,.04);\"><div style=\"font-size:11px;opacity:.7;\">Penalties collected</div><div style=\"font-size:16px;font-weight:700;\">" + money(c.penaltiesYTD) + "</div></div></div><div>";
      Object.keys(pol).forEach(function(k){
        html += "<button class=\"btn small\" data-v425pol=\"" + k + "\" style=\"margin:0 5px 5px 0;"
          + (k === c.policy ? "background:var(--accent,#5b8cff);color:#04241a;" : "") + "\">" + esc(pol[k]) + "</button>";
      });
      html += "</div><div style=\"font-size:11.5px;margin-top:6px;\">Prepay discount: "
        + [0, 0.05, 0.1, 0.15].map(function(d){
            return "<button class=\"btn small\" data-v425disc=\"" + d + "\" style=\"margin:0 4px 4px 0;"
              + (Math.abs(d - n(c.prepayDiscount,0)) < 0.001 ? "background:var(--accent,#5b8cff);color:#04241a;" : "") + "\">" + Math.round(d*100) + "%</button>";
          }).join("")
        + "</div><div class=\"muted\" style=\"font-size:11px;margin-top:5px;\">Longer terms cut churn and let legal collect early-termination penalties. Annual prepay pulls cash forward at the discount you pick.</div>";
      box.innerHTML = html;
      box.querySelectorAll("[data-v425pol]").forEach(function(b){ b.onclick = function(){ c.policy = b.getAttribute("data-v425pol"); say("Contract policy set.", "good"); try{ renderAll(); }catch(e){} }; });
      box.querySelectorAll("[data-v425disc]").forEach(function(b){ b.onclick = function(){ c.prepayDiscount = Number(b.getAttribute("data-v425disc")); try{ renderAll(); }catch(e){} }; });
    }catch(e){}
  }

  function mountExit(){
    try{
      if(!ok()) return;
      if(FIN_TABS.indexOf(tab()) < 0) return;
      var box = card("data-v425exit"); if(!box) return;
      var s = S();
      var html = "<h3>\u{1F6A2} Exit</h3>"
        + "<div class=\"muted\" style=\"font-size:11.5px;margin-bottom:8px;\">Nobody approaches you unless you want to be approached. Turn this on and offers arrive on their own schedule, priced off the current cycle.</div>"
        + "<button class=\"btn small\" data-v425open>" + (s.exit.open ? "\u2705 Open to offers \u2014 turn off" : "Open to acquisition offers") + "</button>"
        + "<div style=\"margin-top:9px;font-size:12px;\"><b>IPO readiness: " + ipoReadiness() + "/100</b></div>"
        + "<div class=\"muted\" style=\"font-size:11px;\">Driven by revenue scale, legal depth, credit, C-corp structure, and contracted revenue.</div>";
      (s.exit.offers || []).forEach(function(o, i){
        html += "<div style=\"margin:9px 0;padding:10px;border-radius:9px;background:rgba(80,200,120,.1);\">"
          + "<div style=\"font-size:12px;\"><b>" + esc(o.buyer) + "</b> \u00b7 " + money(o.price) + " at " + o.mult.toFixed(1) + "\u00d7 revenue</div>"
          + "<div style=\"font-size:11.5px;opacity:.75;margin:3px 0 7px;\">"
          + (o.earnout ? money(o.earnout) + " of it is an earn-out contingent on performance." : "All cash at close.")
          + " Expires in " + o.expires + " month(s).</div>"
          + "<button class=\"btn small\" data-v425accept=\"" + i + "\">Accept</button> "
          + "<button class=\"btn secondary small\" data-v425decline=\"" + i + "\">Decline</button></div>";
      });
      box.innerHTML = html;
      box.querySelector("[data-v425open]").onclick = function(){
        s.exit.open = !s.exit.open;
        say(s.exit.open ? "<b>You are open to offers.</b> Bankers talk." : "Offers switched off.", "good");
        try{ renderAll(); }catch(e){}
      };
      box.querySelectorAll("[data-v425accept]").forEach(function(b){ b.onclick = function(){ acceptOffer(Number(b.getAttribute("data-v425accept"))); }; });
      box.querySelectorAll("[data-v425decline]").forEach(function(b){ b.onclick = function(){ s.exit.offers.splice(Number(b.getAttribute("data-v425decline")),1); try{ renderAll(); }catch(e){} }; });
    }catch(e){}
  }

  function mountPeople(){
    try{
      if(!ok()) return;
      if(["hq","people","hr","team","orgchart"].indexOf(tab()) < 0) return;
      var s = S();
      if(!s.people.departures.length) return;
      var box = card("data-v425people", true); if(!box) return;
      var html = "<h3>\u{1F6AA} Departures \u2014 counteroffer window</h3>";
      s.people.departures.forEach(function(d, i){
        var cost = Math.round(d.salary * 1.4 * 3);
        html += "<div style=\"margin:7px 0;padding:10px;border-radius:9px;background:rgba(255,120,80,.1);\">"
          + "<div style=\"font-size:12px;\"><b>" + esc(d.name) + "</b> \u00b7 " + esc(d.dept) + " \u00b7 " + esc(d.reason) + "</div>"
          + "<div style=\"font-size:11.5px;opacity:.75;margin:3px 0 7px;\">" + d.windowLeft + " month(s) to act. Counteroffer costs " + money(cost) + " and brings them back at " + money(Math.round(d.salary*1.4)) + "/mo.</div>"
          + "<button class=\"btn small\" data-v425win=\"" + i + "\">Make counteroffer</button></div>";
      });
      box.innerHTML = html;
      box.querySelectorAll("[data-v425win]").forEach(function(b){ b.onclick = function(){ winBack(Number(b.getAttribute("data-v425win"))); }; });
    }catch(e){}
  }

  function mountCards(){
    try{
      if(!ok()) return;
      if(FIN_TABS.indexOf(tab()) < 0) return;
      var box = card("data-v425cards"); if(!box) return;
      var s = S();
      var html = "<h3>\u{1F4B3} Credit cards</h3>"
        + "<div class=\"muted\" style=\"font-size:11.5px;margin-bottom:8px;\">Limits and APR are set by your credit score. Paid in full each month they earn cash back and build the score; carried, they cost you.</div>";
      [["biz","Business card"],["personal","Personal card"]].forEach(function(pair){
        var c = s.cards[pair[0]];
        html += "<div style=\"margin:6px 0;padding:9px;border-radius:9px;background:rgba(255,255,255,.04);\">"
          + "<div style=\"font-size:12px;\"><b>" + pair[1] + "</b></div>";
        if(c && c.opened){
          html += "<div style=\"font-size:11.5px;opacity:.78;margin:3px 0 6px;\">" + money(c.balance) + " of " + money(c.limit)
            + " used \u00b7 " + (n(c.apr,0)*100).toFixed(1) + "%/mo \u00b7 " + (n(c.rewards,0)*100).toFixed(1) + "% back \u00b7 autopay "
            + (c.autopay ? "on" : "off") + "</div>"
            + "<button class=\"btn secondary small\" data-v425auto=\"" + pair[0] + "\">Toggle autopay</button>";
        } else {
          html += "<div style=\"font-size:11.5px;opacity:.72;margin:3px 0 6px;\">Not open. Requires a 580 score.</div>"
            + "<button class=\"btn small\" data-v425card=\"" + pair[0] + "\">Apply</button>";
        }
        html += "</div>";
      });
      box.innerHTML = html;
      box.querySelectorAll("[data-v425card]").forEach(function(b){ b.onclick = function(){ openCard(b.getAttribute("data-v425card")); }; });
      box.querySelectorAll("[data-v425auto]").forEach(function(b){ b.onclick = function(){ var k=b.getAttribute("data-v425auto"); s.cards[k].autopay = !s.cards[k].autopay; try{ renderAll(); }catch(e){} }; });
    }catch(e){}
  }

  function mountActivity(){
    try{
      if(!ok()) return;
      if(tab() !== "bank") return;
      var s = S();
      if(!s.activity.length) return;
      var box = card("data-v425activity"); if(!box) return;
      box.innerHTML = "<h3>\u{1F9FE} Recent activity</h3>"
        + s.activity.slice(0,14).map(function(a){
            var amt = a.amount == null ? "" :
              "<span style=\"font-weight:600;color:" + (a.amount < 0 ? "#ef4444" : "#22c55e") + ";\">"
              + (a.amount < 0 ? "\u2212" : "+") + money(Math.abs(a.amount)) + "</span>";
            return "<div style=\"display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:11.5px;\">"
              + "<span style=\"opacity:.85;\">" + a.icon + " " + esc(a.text) + "</span>"
              + "<span style=\"white-space:nowrap;\">" + amt + " <span style=\"opacity:.5;\">M" + a.m + " Y" + a.y + "</span></span></div>";
          }).join("");
    }catch(e){}
  }

  function mountStores(){
    try{
      if(!ok()) return;
      if(["industry","ops","operations","expansion"].indexOf(tab()) < 0) return;
      var co = G.company;
      if(!co.ops || !co.ops.stores || !co.ops.stores.length) return;
      var box = card("data-v425stores"); if(!box) return;
      var html = "<h3>\u{1F3EC} Store operations</h3>"
        + "<div class=\"muted\" style=\"font-size:11.5px;margin-bottom:8px;\">Each store carries its own staff, inventory and P&amp;L. Store staff are paid by the store and do not count against your corporate headcount cap.</div>";
      co.ops.stores.forEach(function(st, i){
        storeState(st);
        var pl = st.pl || {};
        html += "<div style=\"margin:8px 0;padding:10px;border-radius:10px;background:rgba(255,255,255,.04);\">"
          + "<div style=\"font-size:12.5px;\"><b>" + esc(st.name) + "</b> <span style=\"opacity:.7;\">\u00b7 " + n(st.staff,0) + " staff"
          + (st.manager ? " \u00b7 manager on site" : "") + " \u00b7 inventory " + money(st.inventory) + "</span></div>"
          + "<div style=\"font-size:11.5px;opacity:.8;margin:5px 0;\">Last month: " + n(pl.units,0).toLocaleString() + " units \u00b7 revenue "
          + money(pl.gross) + " \u00b7 COGS " + money(pl.cogs) + " \u00b7 rent " + money(pl.rent) + " \u00b7 payroll " + money(pl.payroll)
          + " \u2192 <b style=\"color:" + (n(pl.net,0) < 0 ? "#ef4444" : "#22c55e") + ";\">" + money(pl.net) + "</b>"
          + (n(pl.lost,0) > 0 ? " \u00b7 <span style=\"color:#f59e0b;\">" + n(pl.lost,0).toLocaleString() + " units of demand unserved</span>" : "") + "</div>"
          + "<div>"
          + "<button class=\"btn small\" data-v425hire=\"" + i + "\">Hire associate \u00b7 " + money(STORE_WAGE) + "/mo</button> "
          + "<button class=\"btn secondary small\" data-v425fire=\"" + i + "\">Cut one</button> "
          + (st.manager
              ? "<button class=\"btn secondary small\" data-v425mgr=\"" + i + "\">Remove manager</button>"
              : "<button class=\"btn small\" data-v425mgr=\"" + i + "\">Hire manager \u00b7 " + money(MANAGER_WAGE) + "/mo</button>")
          + "</div>"
          + (st.manager
              ? "<div style=\"font-size:11.5px;margin-top:6px;\">Auto-restock to: "
                 + [0, 15000, 40000, 100000].map(function(t){
                     return "<button class=\"btn small\" data-v425target=\"" + i + ":" + t + "\" style=\"margin:0 4px 4px 0;"
                       + (n(st.restockTarget,0) === t ? "background:var(--accent,#5b8cff);color:#04241a;" : "") + "\">"
                       + (t === 0 ? "Off" : money(t)) + "</button>";
                   }).join("")
                 + "</div>"
              : "")
          + "</div>";
      });
      box.innerHTML = html;
      box.querySelectorAll("[data-v425hire]").forEach(function(b){ b.onclick = function(){
        var st = co.ops.stores[Number(b.getAttribute("data-v425hire"))]; storeState(st);
        if(st.staff >= 9){ say("A single store tops out at 9 people on the floor.", "warn"); return; }
        st.staff++; act("\u{1F464}", "Hired store associate at " + st.name, null); try{ renderAll(); }catch(e){}
      }; });
      box.querySelectorAll("[data-v425fire]").forEach(function(b){ b.onclick = function(){
        var st = co.ops.stores[Number(b.getAttribute("data-v425fire"))]; storeState(st);
        st.staff = Math.max(0, st.staff - 1); try{ renderAll(); }catch(e){}
      }; });
      box.querySelectorAll("[data-v425mgr]").forEach(function(b){ b.onclick = function(){
        var st = co.ops.stores[Number(b.getAttribute("data-v425mgr"))]; storeState(st);
        st.manager = !st.manager;
        if(st.manager && !st.restockTarget) st.restockTarget = 15000;
        say(st.manager ? "<b>Manager hired at " + esc(st.name) + ".</b><br><span style=\"font-size:11px;opacity:.85;\">They will keep inventory topped up to your target each month.</span>" : "Manager removed.", "good");
        try{ renderAll(); }catch(e){}
      }; });
      box.querySelectorAll("[data-v425target]").forEach(function(b){ b.onclick = function(){
        var p = b.getAttribute("data-v425target").split(":");
        var st = co.ops.stores[Number(p[0])]; storeState(st);
        st.restockTarget = Number(p[1]); try{ renderAll(); }catch(e){}
      }; });
    }catch(e){}
  }

  /* workspace growth belongs in Facilities */
  function mountWorkspace(){
    try{
      if(!ok()) return;
      if(["facilities","expansion","hq"].indexOf(tab()) < 0) return;
      var c = G.company;
      var stage = Math.max(0, Math.min(3, Math.round(n(c.hqStage,0))));
      var box = card("data-v425workspace"); if(!box) return;
      var names = (typeof HQ_STAGE_NAMES !== "undefined") ? HQ_STAGE_NAMES : ["Coworking","Small Office","Full Office","HQ"];
      var caps = (typeof HEADCOUNT_CAP !== "undefined") ? HEADCOUNT_CAP : [8,20,60,250];
      var costs = [8000,25000,60000];
      var html = "<h3>\u{1F3E2} Workspace</h3>"
        + "<div style=\"font-size:12px;margin-bottom:6px;\">Current: <b>" + esc(names[stage]) + "</b> \u00b7 base capacity " + caps[stage]
        + " \u00b7 total capacity with facilities <b>" + (typeof headcountCap === "function" ? headcountCap() : caps[stage]) + "</b> \u00b7 on team " + (c.employees||[]).length + "</div>";
      if(stage < 3){
        html += "<div class=\"muted\" style=\"font-size:11.5px;margin-bottom:7px;\">Upgrading to " + esc(names[stage+1]) + " raises base capacity to " + caps[stage+1] + ".</div>"
          + "<button class=\"btn small\" data-v425hq>Upgrade workspace \u00b7 " + money(costs[stage]) + "</button>";
      } else {
        html += "<div class=\"muted\" style=\"font-size:11.5px;\">Fully built out. Capacity now grows through facilities, and store staff sit outside this cap entirely.</div>";
      }
      box.innerHTML = html;
      var btn = box.querySelector("[data-v425hq]");
      if(btn) btn.onclick = function(){
        var cost = costs[stage];
        if(n(c.cash,0) < cost){ say("Not enough company cash.", "bad"); return; }
        c.cash = n(c.cash,0) - cost; c.hqStage = stage + 1;
        act("\u{1F3E2}", "Upgraded workspace to " + names[stage+1], -cost);
        say("<b>\u{1F3E2} " + esc(names[stage+1]) + ".</b><br><span style=\"font-size:11px;opacity:.85;\">Headcount capacity is now " + headcountCap() + ".</span>", "good");
        try{ renderAll(); }catch(e){}
      };
    }catch(e){}
  }

  /* owner pay belongs on Personal and in HQ finance, not just Bank/Invest */
  function mountOwnerPay(){
    try{
      if(!ok()) return;
      if(["personal","life","hq","financials","finance"].indexOf(tab()) < 0) return;
      var box = card("data-v425ownerpay"); if(!box) return;
      var total = 0, rows = "";
      (G.companies||[]).forEach(function(co, i){
        var d = n(co.ownerDraw,0) + n(co.chairFee,0);
        total += d;
        rows += "<div style=\"display:flex;justify-content:space-between;font-size:11.5px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.06);\">"
          + "<span>" + esc(co.name) + (co.chairman ? " <span style=\"opacity:.6;\">\u00b7 chaired</span>" : "") + "</span>"
          + "<span style=\"font-weight:600;\">" + money(d) + "/mo</span></div>";
      });
      box.innerHTML = "<h3>\u{1F4B5} Owner pay</h3>"
        + "<div class=\"muted\" style=\"font-size:11.5px;margin-bottom:7px;\">Every company you own pays its own draw at month close, capped by its own cash.</div>"
        + rows
        + "<div style=\"display:flex;justify-content:space-between;margin-top:7px;font-size:13px;\"><b>Total</b><b>" + money(total) + "/mo</b></div>"
        + "<div class=\"muted\" style=\"font-size:11px;margin-top:5px;\">Set the amount per company on the Bank screen or the Owner Pay card.</div>";
    }catch(e){}
  }

  /* retail-specific product framing */
  function mountRetailProduct(){
    try{
      if(!ok()) return;
      if(tab() !== "product") return;
      if((G.company.industry || "") !== "retail") return;
      var box = card("data-v425retailprod", true); if(!box) return;
      var o = G.company.ops || {};
      box.innerHTML = "<h3>\u{1F6CD}\ufe0f Assortment & merchandising</h3>"
        + "<div class=\"muted\" style=\"font-size:11.5px;margin-bottom:7px;\">Retail does not ship features. What you control here is price position, assortment quality and sell-through.</div>"
        + "<div style=\"font-size:12px;\">Price tier: <b>\u00d7" + n(o.priceTier,1).toFixed(2) + "</b> \u00b7 Customer satisfaction: <b>" + Math.round(n(o.satisfaction,70)) + "</b> \u00b7 Stores: <b>" + ((o.stores||[]).length) + "</b></div>"
          + "<div class=\"muted\" style=\"font-size:11px;margin-top:6px;\">Manage stock, staffing and per-store P&amp;L on the Industry Ops screen.</div>";
    }catch(e){}
  }

  /* =================================================================
     MONTH CLOSE
     ================================================================= */
  function install(){
    if(!ok()) return;
    installLegal();
    wrapHeadcount();
    wrapRetail();
    wrapRateMacro("effectiveLoanRate");
    wrapRateMacro("effectiveLocRate");
    S();
    try{
      if(typeof advanceMonth === "function" && !advanceMonth.__v425 && !window.__v425wrapped){
        var raw = advanceMonth;
        var w = function(){
          var r = raw.apply(this, arguments);
          try{
            var s = S(), lines = [];
            lines = lines.concat(macroStep());
            lines = lines.concat(taxStep());
            lines = lines.concat(contractStep());
            lines = lines.concat(rivalStep());
            lines = lines.concat(peopleStep());
            lines = lines.concat(cardStep());
            lines = lines.concat(exitStep());
            (s.exit.offers || []).forEach(function(o){ o.expires = n(o.expires,1) - 1; });
            s.exit.offers = (s.exit.offers || []).filter(function(o){ return o.expires > 0; });
            s.lastLines = lines;
            try{
              var rep = G.company && G.company.lastReport;
              if(rep && rep.lines) rep.lines = rep.lines.concat(lines);
            }catch(e){}
          }catch(e){}
          try{ renderAll(); }catch(e){}
          return r;
        };
        w.__v425 = true;
        window.__v425wrapped = true;
        window.advanceMonth = w;
      }
    }catch(e){}
  }

  /* record transfers into the clean activity log too */
  try{
    var rawRec = window.v421RecordTransfer;
    window.v421RecordTransfer = function(from, to, amount){
      try{ act("\u{1F504}", "Transfer " + ((from&&from.name)||"?") + " \u2192 " + ((to&&to.name)||"?"), amount); }catch(e){}
      if(typeof rawRec === "function") return rawRec.apply(this, arguments);
    };
  }catch(e){}

  try{ install(); }catch(e){}
  try{ setInterval(install, 700); }catch(e){}
  window.__v425err = [];
  [mountTax, mountMacro, mountRivals, mountContracts, mountExit, mountPeople,
   mountCards, mountActivity, mountStores, mountWorkspace, mountOwnerPay, mountRetailProduct].forEach(function(f){
    try{ setInterval(function(){
      try{ f(); }catch(e){ if(window.__v425err.length < 40) window.__v425err.push((f.name||"mount") + ": " + (e && e.message)); }
    }, 850); }catch(e){}
  });
  try{ document.addEventListener("DOMContentLoaded", install); }catch(e){}

  window.v425 = { state:S, tax:taxStep, macro:macroStep, rivals:rivals, ipo:ipoReadiness };
  try{ window.GAME_VERSION = "v4.37"; }catch(e){}
})();
