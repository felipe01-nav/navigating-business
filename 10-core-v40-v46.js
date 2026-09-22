/* ================= v4.0 ================= */

/* ---------- 1. Legal department ---------- */
(function v40Legal(){
  try{
    if(typeof LADDERS === "undefined" || LADDERS.legal) return;
    var mk = function(){
      return { label:"Legal", icon:"\u2696\uFE0F", rungs:[
        { key:"rep", label:"Paralegal", salaryRange:[5000,6000], icon:"\u{1F4C4}" },
        { key:"coordinator", label:"Counsel", salaryRange:[9500,11000], icon:"\u{1F9ED}", under:"rep", per:10,
          desc:"Reviews contracts before they bite \u2014 reduces the odds of a legal event." },
        { key:"teamlead", label:"Senior Counsel", salaryRange:[12000,13500], icon:"\u{1F9D1}\u200D\u{1F3EB}", under:"coordinator", per:5,
          desc:"Handles disputes in-house instead of paying outside firms." },
        { key:"manager", label:"Legal Manager", salaryRange:[14500,16500], icon:"\u{1F4CB}", under:"teamlead", per:5,
          desc:"Keeps compliance current \u2014 softens regulatory penalties." },
        { key:"director", label:"Director of Legal", salaryRange:[17500,20000], icon:"\u{1F3AF}", under:"manager", per:5,
          desc:"Protects IP and clears the way for bigger deals." },
        { key:"clo", label:"Chief Legal Officer", salaryRange:[22000,27000], icon:"\u{1F451}", under:"director", per:2,
          desc:"Board-level cover. Materially cuts the cost of any legal event." }
      ]};
    };
    LADDERS.legal = mk();
    if(typeof BASE_LADDERS !== "undefined" && BASE_LADDERS && !BASE_LADDERS.legal) BASE_LADDERS.legal = mk();
    if(typeof ORDER_OPTIONS !== "undefined" && ORDER_OPTIONS && !ORDER_OPTIONS.legal){
      ORDER_OPTIONS.legal = [ {key:"shield",label:"Risk Shield"}, {key:"contracts",label:"Clear the Contract Backlog"} ];
    }
  }catch(e){}
})();

/* ---------- 2. Legal staffing actually does something ---------- */
(function v40LegalEffect(){
  try{
    if(typeof deptEmployees !== "function") return;
    window.v40LegalStrength = function(){
      try{
        var staff = deptEmployees("legal") || [];
        if(!staff.length) return 0;
        var senior = staff.filter(function(e){ return e.rung!=="rep"; }).length;
        return Math.min(0.6, staff.length*0.05 + senior*0.05);
      }catch(e){ return 0; }
    };
    if(typeof applyEvent === "function"){
      var prevApply = applyEvent;
      applyEvent = function(ev){
        try{
          var legalish = ev && /lawsuit|legal|complian|regulat|contract dispute|fine|penalt/i.test(
            String((ev.title||"") + " " + (ev.text||"") + " " + (ev.desc||"")));
          var s = window.v40LegalStrength();
          if(legalish && s > 0 && typeof ev.cash === "number" && ev.cash < 0){
            var saved = Math.round(Math.abs(ev.cash) * s);
            ev = Object.assign({}, ev, { cash: ev.cash + saved });
            if(typeof logHistory === "function")
              logHistory("Legal absorbed " + (typeof fmt$==="function"?fmt$(saved):saved) + " of the exposure in-house.");
          }
        }catch(e){}
        return prevApply.call(this, ev);
      };
    }
  }catch(e){}
})();

/* ---------- 3. Onboarding: founder name, company name and pitch required ---------- */
(function v40Onboard(){
  try{
    if(typeof renderOnboard !== "function") return;
    var css = document.createElement("style");
    css.textContent = ".v40-req{color:#e5534b;margin-left:3px;}"
      + ".v40-hint{font-size:11.5px;color:var(--muted);margin-top:6px;min-height:14px;}"
      + "#obStart[disabled]{opacity:.45;cursor:not-allowed;}"
      + ".v40-miss{border-color:#e5534b !important;}";
    (document.head||document.documentElement).appendChild(css);

    var prev = renderOnboard;
    renderOnboard = function(){
      prev.apply(this, arguments);
      try{
        var ob = document.getElementById("onboard");
        if(!ob) return;
        var btn = ob.querySelector("#obStart");
        if(!btn || btn.getAttribute("data-v40")) return;
        btn.setAttribute("data-v40","1");

        var fields = [["obPlayer","your name"],["obName","a company name"],["obIdea","a one-line pitch"]];

        fields.forEach(function(f){
          var input = ob.querySelector("#" + f[0]);
          if(!input) return;
          var lab = input.previousElementSibling;
          if(lab && lab.tagName === "LABEL" && !lab.querySelector(".v40-req")){
            var star = document.createElement("span");
            star.className = "v40-req"; star.textContent = "*";
            lab.appendChild(star);
          }
        });

        var hint = ob.querySelector(".v40-hint");
        if(!hint){
          hint = document.createElement("div");
          hint.className = "v40-hint";
          btn.parentNode.appendChild(hint);
        }

        var check = function(){
          var missing = [];
          fields.forEach(function(f){
            var input = ob.querySelector("#" + f[0]);
            var empty = !input || !String(input.value||"").trim();
            if(input) input.classList.toggle("v40-miss", empty && input.getAttribute("data-touched")==="1");
            if(empty) missing.push(f[1]);
          });
          btn.disabled = missing.length > 0;
          hint.textContent = missing.length
            ? "Still needed: " + missing.join(", ") + "."
            : "";
          return missing.length === 0;
        };

        fields.forEach(function(f){
          var input = ob.querySelector("#" + f[0]);
          if(!input) return;
          input.addEventListener("input", check);
          input.addEventListener("blur", function(){ input.setAttribute("data-touched","1"); check(); });
        });

        var inner = btn.onclick;
        btn.onclick = function(ev){
          fields.forEach(function(f){
            var input = ob.querySelector("#" + f[0]);
            if(input) input.setAttribute("data-touched","1");
          });
          if(!check()){
            if(typeof toast === "function") toast("Fill in your name, the company name and a one-line pitch.","bad");
            return;
          }
          if(typeof inner === "function") return inner.call(this, ev);
        };

        check();
      }catch(e){}
    };

    var ob = document.getElementById("onboard");
    if(ob && window.getComputedStyle(ob).display !== "none") renderOnboard();
  }catch(e){}
})();
/* ===================== v4.1: Rivalry restored to the sidebar + Research merged in ===================== */
(function v41Nav(){
  try{
    if(typeof DOCK_ITEMS !== "undefined" && !DOCK_ITEMS.some(function(d){return d.id==="rivals";})){
      DOCK_ITEMS.push({ id:"rivals", label:"Market & Rivals", icon:"\u2694\uFE0F" });
    }
    if(typeof DOCK_GROUPS === "undefined") return;
    /* Research now lives inside the Market & Rivals screen, so drop the standalone entry. */
    DOCK_GROUPS.forEach(function(g){
      if(!g || !g.items) return;
      var r = g.items.indexOf("research");
      if(r >= 0) g.items.splice(r, 1);
      var v = g.items.indexOf("rivals");
      if(v >= 0) g.items.splice(v, 1);
    });
    var hq = DOCK_GROUPS.filter(function(g){return g.id==="hq";})[0] || DOCK_GROUPS[0];
    if(hq && hq.items){
      var at = hq.items.indexOf("clients");
      if(at >= 0) hq.items.splice(at+1, 0, "rivals");
      else hq.items.push("rivals");
    }
  }catch(e){}
})();

(function v41RivalsMerge(){
  try{
    if(typeof v33RivalsScreen !== "function") return;
    var prev = v33RivalsScreen;
    v33RivalsScreen = function(){
      var wrap = prev.apply(this, arguments);
      try{
        if(typeof renderResearch === "function" && wrap && wrap.appendChild){
          var inner = renderResearch();
          var title = inner.querySelector(".window-title");
          if(title && title.parentNode) title.parentNode.removeChild(title);
          var box = document.createElement("div");
          box.className = "card mt14";
          box.setAttribute("data-v41research", "1");
          var h = document.createElement("h3");
          h.innerHTML = "\u{1F50D} Competitor research";
          box.appendChild(h);
          var sub = document.createElement("div");
          sub.className = "muted";
          sub.style.cssText = "font-size:11.5px;margin:-2px 0 8px;";
          sub.textContent = "Queue research from the Decide tab. Findings land here, next to the share fight they inform.";
          box.appendChild(sub);
          box.appendChild(inner);
          wrap.appendChild(box);
        }
      }catch(e){}
      return wrap;
    };
  }catch(e){}
})();

/* Anything still routing to the old Research tab lands on Market & Rivals instead. */
(function v41Redirect(){
  try{
    if(typeof setTab === "function"){
      var prevSet = setTab;
      setTab = function(id){
        if(id === "research") id = "rivals";
        return prevSet.call(this, id);
      };
    }
    if(typeof renderScreen === "function"){
      var prevRender = renderScreen;
      renderScreen = function(){
        try{ if(G && G.ui && G.ui.activeTab === "research") G.ui.activeTab = "rivals"; }catch(e){}
        return prevRender.apply(this, arguments);
      };
    }
  }catch(e){}
})();
/* ===================== v4.2: Market & Rivals becomes its own side-panel app ===================== */
(function v42RivalsApp(){
  try{
    if(typeof DOCK_ITEMS !== "undefined" && !DOCK_ITEMS.some(function(d){return d.id==="rivals";})){
      DOCK_ITEMS.push({ id:"rivals", label:"Market & Rivals", icon:"\u2694\uFE0F" });
    }
    if(typeof DOCK_GROUPS === "undefined") return;

    /* Pull rivals and the old standalone research entry out of every existing group. */
    DOCK_GROUPS.forEach(function(g){
      if(!g || !g.items) return;
      g.items = g.items.filter(function(i){ return i !== "rivals" && i !== "research"; });
    });

    /* Drop any empty groups left behind, and any earlier rivals group. */
    for(var i = DOCK_GROUPS.length - 1; i >= 0; i--){
      var g = DOCK_GROUPS[i];
      if(!g) continue;
      if(g.id === "rivals" || (g.items && g.items.length === 0)) DOCK_GROUPS.splice(i, 1);
    }

    /* Its own top-level app in the side panel, sitting right after HQ. */
    var app = { id:"rivals", icon:"\u2694\uFE0F", label:"Rivals", items:["rivals"] };
    var hqAt = -1;
    for(var j = 0; j < DOCK_GROUPS.length; j++){
      if(DOCK_GROUPS[j] && DOCK_GROUPS[j].id === "hq"){ hqAt = j; break; }
    }
    if(hqAt >= 0) DOCK_GROUPS.splice(hqAt + 1, 0, app);
    else DOCK_GROUPS.push(app);
  }catch(e){}
})();

/* Make sure tab -> group resolution knows where rivals lives. */
(function v42GroupOf(){
  try{
    if(typeof groupOfTab !== "function") return;
    var prev = groupOfTab;
    groupOfTab = function(tabId){
      if(tabId === "rivals" || tabId === "research"){
        var g = DOCK_GROUPS.filter(function(x){ return x && x.id === "rivals"; })[0];
        if(g) return g;
      }
      return prev.apply(this, arguments);
    };
  }catch(e){}
})();
/* ================= v4.3 ================= */
(function v43Css(){
  try{
    var s = document.createElement("style");
    s.textContent = `
    .v43-fac{background:var(--panel2);border:1px solid var(--border);border-radius:12px;overflow:hidden;width:212px;display:flex;flex-direction:column;}
    .v43-fac img{width:100%;aspect-ratio:7/4;height:auto;object-fit:cover;display:block;background:transparent;}
    .v43-fac .v43-txt{padding:8px 10px;font-size:12px;line-height:1.35;flex:1;}
    .v43-fac .v43-foot{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:8px 10px;border-top:1px solid var(--border);}
    .v43-own{font-size:11px;font-weight:700;opacity:.85;}
    .v43-arr{display:flex;flex-direction:column;gap:6px;}
    .v43-arr .row{display:flex;align-items:center;gap:8px;background:var(--panel2);border:1px solid var(--border);
      border-radius:10px;padding:8px 10px;cursor:grab;font-size:12.5px;}
    .v43-arr .row.drag{opacity:.45;}
    .v43-arr .row.over{border-color:var(--good);}
    .v43-grip{opacity:.6;}
    .v43-adv{font-size:11.5px;opacity:.7;cursor:pointer;text-decoration:underline;margin-top:6px;display:inline-block;}
    .v43-saves{margin:10px 0 4px;}
    .v43-hd{font-size:11px;text-transform:uppercase;letter-spacing:.05em;opacity:.7;margin-bottom:6px;}
    `;
    document.head.appendChild(s);
  }catch(e){}
})();

function v43Stamp(){ try{ return (G.company.year||1)+"-"+(G.company.month||1); }catch(e){ return "0-0"; } }

/* ---------- 1. Facilities: purchase button + owned counts ---------- */
(function v43Facilities(){
  try{
    if(typeof facilitiesSection !== "function") return;
    var prev = facilitiesSection;
    facilitiesSection = function(){
      var box = prev.apply(this, arguments);
      try{
        var owned = (G.company && G.company.facilities) || [];
        box.querySelectorAll("[data-v17fac]").forEach(function(b){
          if(b.getAttribute("data-v43done")==="1") return;
          var key = b.getAttribute("data-v17fac");
          var def = (typeof FACILITIES!=="undefined") ? FACILITIES.find(function(f){return f.key===key;}) : null;
          var count = owned.filter(function(f){ return f.key===key; }).length;
          var card = document.createElement("div");
          card.className = "v43-fac";
          card.setAttribute("data-v43fac", key);
          var img = b.querySelector("img");
          if(img) card.appendChild(img);
          var txt = document.createElement("div");
          txt.className = "v43-txt";
          txt.innerHTML = def
            ? "<b>"+(def.icon||"\uD83C\uDFE2")+" "+def.name+"</b><br>"+fmt$(def.cost)+" \u00b7 +"+def.cap.toLocaleString()+" seats \u00b7 "+fmt$(def.rent)+"/mo"
            : (b.textContent||"").trim();
          card.appendChild(txt);
          var foot = document.createElement("div");
          foot.className = "v43-foot";
          var own = document.createElement("span");
          own.className = "v43-own";
          own.textContent = count>0 ? ("\u2705 Owned \u00d7"+count) : "Not owned";
          var buy = document.createElement("button");
          buy.className = "btn small";
          buy.textContent = "Purchase";
          buy.onclick = function(ev){ ev.stopPropagation(); b.click(); };
          foot.appendChild(own); foot.appendChild(buy);
          card.appendChild(foot);
          if(b.parentNode) b.parentNode.replaceChild(card, b);
          b.setAttribute("data-v43done","1");
        });
        /* drop the old one-line-per-purchase pill list */
        var pill = box.querySelector(".pill.good");
        if(pill && pill.parentElement && pill.parentElement !== box) pill.parentElement.remove();
      }catch(e){}
      return box;
    };
  }catch(e){}
})();

/* ---------- 2. Founder hustle: once-a-month power plays ---------- */
var V43_POWER = [
  { key:"v43_keynote", label:"\uD83C\uDFA4 Headline a Conference", desc:"Once per month. Keynote a big industry event \u2014 strong shot at two clients at once plus reputation." },
  { key:"v43_enterprise", label:"\uD83C\uDFDB\uFE0F Door-Knock an Enterprise", desc:"Once per month. Chase one whale yourself. Rare, but a huge contract if it lands." },
  { key:"v43_roundup", label:"\uD83D\uDCB0 Collect on Old Invoices", desc:"Once per month. Spend a week chasing receivables \u2014 guaranteed lump of cash, small goodwill hit." }
];
function v43PowerUsed(key){
  try{ return (G.company.v43Once||{})[key] === v43Stamp(); }catch(e){ return false; }
}
function v43MarkPower(key){
  if(!G.company.v43Once) G.company.v43Once = {};
  G.company.v43Once[key] = v43Stamp();
}
function v43RunPower(key){
  var c = G.company;
  if(v43PowerUsed(key)) return;
  v43MarkPower(key);
  c.founderActionsLifetime = (c.founderActionsLifetime||0) + 1;
  var msg = "";
  if(key==="v43_keynote"){
    var landed = 0, total = 0;
    for(var i=0;i<2;i++){
      if(Math.random() < 0.55){
        var m = rand(450,1400);
        c.clients.push({ id:uid(), name:pick(["Vertex Partners","Solstice Group","Beacon Retail","Anchor Health","Trailhead Labs"]),
          mrr:m, health:rand(70,92), sinceMonth:c.month, sinceYear:c.year });
        landed++; total += m;
      }
    }
    c.successScore = clamp((c.successScore||50)+3,0,100);
    recomputeMRR();
    msg = landed ? ("Your keynote landed "+landed+" new client(s) worth "+fmt$(total)+" MRR, plus a reputation bump. \uD83C\uDFA4")
                 : "The keynote went well and the room liked you \u2014 no signatures yet, but the brand got a lift.";
  } else if(key==="v43_enterprise"){
    if(Math.random() < 0.3){
      var big = rand(2800,7500);
      c.clients.push({ id:uid(), name:pick(["Meridian Industries","Halcyon Federal","Continental Grid","Atlas Freight","Pinnacle Bank"]),
        mrr:big, health:rand(72,90), sinceMonth:c.month, sinceYear:c.year });
      recomputeMRR();
      msg = "You got past procurement yourself \u2014 enterprise contract signed at "+fmt$(big)+" MRR. \uD83C\uDFDB\uFE0F";
    } else {
      msg = "Three meetings, two committees, no signature. Enterprise takes time \u2014 try again next month.";
    }
  } else if(key==="v43_roundup"){
    var base = Math.max(1500, Math.round((c.mrr||0) * (rand(18,32)/100)));
    c.cash += base;
    c.clients.forEach(function(cl){ if(Math.random()<0.25) cl.health = clamp(cl.health-4,0,100); });
    msg = "You chased down "+fmt$(base)+" in overdue invoices. A few clients were not thrilled about the phone calls.";
  }
  G.ui.founderMsg = msg;
  logHistory(msg);
  renderScreen();
}
(function v43HustleUi(){
  try{
    if(typeof renderFounderBucket !== "function") return;
    var prev = renderFounderBucket;
    renderFounderBucket = function(){
      var html = prev.apply(this, arguments);
      try{
        var rows = V43_POWER.map(function(a){
          var used = v43PowerUsed(a.key);
          return '<button class="btn secondary small" data-v43hustle="'+a.key+'" '+(used?'disabled':'')+' title="'+a.desc+'">'+a.label+(used?' \u2014 used this month':'')+'</button>';
        }).join("");
        html += '<div class="card mb14" style="border:1px dashed var(--good);">'
          + '<h3>\u26A1 Power Plays <span class="muted" style="font-size:12px;font-weight:400;">\u2014 once each per month</span></h3>'
          + '<div class="muted mb8" style="font-size:12.5px;">Bigger swings than everyday hustle. Each one resets when the month rolls over, and they do not use your regular hustle slots.</div>'
          + '<div class="flexrow" style="gap:6px;flex-wrap:wrap;">'+rows+'</div></div>';
      }catch(e){}
      return html;
    };
    document.addEventListener("click", function(ev){
      var t = ev.target && ev.target.closest && ev.target.closest("[data-v43hustle]");
      if(!t || t.disabled) return;
      ev.preventDefault();
      v43RunPower(t.getAttribute("data-v43hustle"));
    }, true);
  }catch(e){}
})();

/* ---------- 3. Sales specialists by client size ---------- */
(function v43SalesSpecialists(){
  try{
    if(typeof LADDERS === "undefined" || !LADDERS.sales) return;
    var have = LADDERS.sales.rungs.some(function(r){ return r.key==="v43_smb"; });
    if(have) return;
    var extra = [
      { key:"v43_smb", label:"SMB Account Executive", salaryRange:[5400,6400], icon:"\uD83C\uDFA7",
        desc:"Specialist on Small clients \u2014 closes small accounts steadily every month." },
      { key:"v43_mm", label:"Mid-Market Account Executive", salaryRange:[9500,11500], icon:"\uD83C\uDFE2",
        desc:"Specialist on Mid-Market clients \u2014 fewer deals, meaningfully bigger." },
      { key:"v43_ent", label:"Enterprise Account Executive", salaryRange:[16000,20000], icon:"\uD83C\uDFDB\uFE0F",
        desc:"Specialist on Enterprise logos \u2014 rare wins, very large contracts." }
    ];
    var idx = LADDERS.sales.rungs.findIndex(function(r){ return r.key==="coordinator"; });
    if(idx < 0) idx = LADDERS.sales.rungs.length;
    LADDERS.sales.rungs.splice.apply(LADDERS.sales.rungs, [idx, 0].concat(extra));
    try{ if(typeof BASE_LADDERS !== "undefined" && BASE_LADDERS && BASE_LADDERS.sales){
      var i2 = BASE_LADDERS.sales.rungs.findIndex(function(r){ return r.key==="coordinator"; });
      if(i2 < 0) i2 = BASE_LADDERS.sales.rungs.length;
      if(!BASE_LADDERS.sales.rungs.some(function(r){return r.key==="v43_smb";}))
        BASE_LADDERS.sales.rungs.splice.apply(BASE_LADDERS.sales.rungs, [i2, 0].concat(JSON.parse(JSON.stringify(extra))));
    } }catch(e){}
  }catch(e){}
})();
var V43_SPEC = {
  v43_smb:  { odds:0.62, min:250,  max:700,  label:"Small",       pool:["Northgate Dental","Pine Street Cafe","Bright Path Tutoring","Rapid Auto Care","Willow Florals"] },
  v43_mm:   { odds:0.40, min:950,  max:2100, label:"Mid-Market",  pool:["Crestline Logistics","Fairview Medical Group","Lakeshore Manufacturing","Summit Property Mgmt"] },
  v43_ent:  { odds:0.22, min:2600, max:6800, label:"Enterprise",  pool:["Meridian Industries","Continental Grid","Atlas Freight","Pinnacle Bank","Halcyon Federal"] }
};
(function v43SpecTick(){
  try{
    if(typeof advanceMonth !== "function") return;
    var prev = advanceMonth;
    advanceMonth = function(){
      var out = prev.apply(this, arguments);
      try{
        var c = G.company;
        if(!c || !c.employees) return out;
        var closed = 0, mrrAdd = 0, lines = {};
        c.employees.forEach(function(e){
          var spec = V43_SPEC[e.rung];
          if(!spec || e.dept !== "sales") return;
          var perf = (e.performance||70)/100;
          if(Math.random() < spec.odds * (0.7 + perf*0.6)){
            var m = rand(spec.min, spec.max);
            c.clients.push({ id:uid(), name:pick(spec.pool), mrr:m, health:rand(68,90), sinceMonth:c.month, sinceYear:c.year });
            closed++; mrrAdd += m;
            lines[spec.label] = (lines[spec.label]||0) + 1;
            e.performance = clamp((e.performance||70) + rand(1,4), 0, 100);
          } else {
            e.performance = clamp((e.performance||70) + rand(-2,1), 0, 100);
          }
        });
        if(closed > 0){
          recomputeMRR();
          var detail = Object.keys(lines).map(function(k){ return lines[k]+" "+k; }).join(", ");
          logHistory("Sales specialists closed "+closed+" deal(s) ("+detail+") worth "+fmt$(mrrAdd)+" in new MRR.");
        }
      }catch(e){}
      return out;
    };
  }catch(e){}
})();

/* ---------- 4. Simpler saves screen ---------- */
(function v43SavesSimple(){
  try{
    if(typeof renderSaves !== "function") return;
    var prev = renderSaves;
    renderSaves = function(){
      var wrap = prev.apply(this, arguments);
      try{
        var compact = wrap.querySelector("[data-v341compact]");
        if(compact){
          var card = compact.closest(".card") || compact.parentElement;
          if(card) card.remove();
        }
        /* strip any leftover storage/quota readouts */
        wrap.querySelectorAll(".card").forEach(function(cd){
          var t = (cd.textContent||"").toLowerCase();
          if(t.indexOf("browser storage used")>=0 || t.indexOf("storage used")>=0 || t.indexOf("of your browser")>=0) cd.remove();
        });
        /* tuck save codes behind an Advanced toggle */
        var code = wrap.querySelector(".v28-codecard");
        if(code && !code.getAttribute("data-v43adv")){
          code.setAttribute("data-v43adv","1");
          code.style.display = "none";
          var link = document.createElement("span");
          link.className = "v43-adv";
          link.textContent = "Advanced \u2014 backup & transfer codes";
          link.onclick = function(){
            var show = code.style.display === "none";
            code.style.display = show ? "" : "none";
            link.textContent = show ? "Hide advanced options" : "Advanced \u2014 backup & transfer codes";
          };
          code.parentNode.insertBefore(link, code);
        }
      }catch(e){}
      return wrap;
    };
  }catch(e){}
})();

/* ---------- 5. Onboarding: always show saved games ---------- */
function v43BuildSaveBlock(slots){
  var wrap = document.createElement("div");
  wrap.className = "v43-saves";
  wrap.setAttribute("data-v43saves","1");
  var newest = slots[0];
  wrap.innerHTML = '<div class="v43-hd">\uD83D\uDCBE Saved games ('+slots.length+')</div>'
    + '<button class="btn" style="width:100%;margin-bottom:8px;" data-v43cont="'+newest.key+'">\u25B6 Continue \u2014 '
    + (newest.label||"Saved game") + ' \u00b7 Y'+(newest.year||1)+' M'+(newest.month||1)+'</button>'
    + '<div class="saveslot-list">' + slots.map(function(s){
        return '<div class="saveslot"><span>'+(s.label||"Saved game")+'<br><span class="meta">Y'+(s.year||1)+' M'+(s.month||1)
          + (typeof fmt$==="function" ? " \u00b7 "+fmt$(s.cash||0) : "")+'</span></span>'
          + '<span class="flexrow"><button class="btn secondary small" data-v43load="'+s.key+'">Load</button>'
          + '<button class="btn danger small" data-v43del="'+s.key+'">&times;</button></span></div>';
      }).join("") + '</div>';
  wrap.querySelectorAll("[data-v43cont],[data-v43load]").forEach(function(b){
    b.onclick = function(){
      var key = b.getAttribute("data-v43cont") || b.getAttribute("data-v43load");
      if(typeof v27LoadKey==="function") return v27LoadKey(key);
      try{
        var st = loadSlot(key);
        if(!st) return;
        G = normalizeGame(st);
        var ob = document.getElementById("onboard");
        if(ob) ob.style.display = "none";
        renderAll();
      }catch(e){}
    };
  });
  wrap.querySelectorAll("[data-v43del]").forEach(function(b){
    b.onclick = function(ev){
      ev.stopPropagation();
      var key = b.getAttribute("data-v43del");
      if(!confirm("Delete this save?")) return;
      try{ if(typeof deleteSlot==="function") deleteSlot(key); else localStorage.removeItem(key); }catch(e){}
      try{ renderOnboard(); }catch(e){}
    };
  });
  return wrap;
}
(function v43ObSaves(){
  try{
    if(typeof renderOnboard !== "function") return;
    var prev = renderOnboard;
    renderOnboard = function(){
      var out = prev.apply(this, arguments);
      try{
        var ob = document.getElementById("onboard");
        if(!ob) return out;
        try{ var vs0 = ob.querySelector("h1 .muted"); if(vs0) vs0.textContent = "v4.3"; }catch(e){}
        if(ob.querySelector("[data-v43saves]")) return out;
        var slots = [];
        try{ slots = (typeof listSlots==="function" ? (listSlots()||[]) : []); }catch(e){ slots = []; }
        if(!slots.length) return out;
        if(ob.querySelector("[data-v27cont]")) return out; /* v27 block already rendered */
        try{ var vs = ob.querySelector("h1 .muted"); if(vs) vs.textContent = "v4.3"; }catch(e){}
        var card = ob.querySelector(".ob-card") || ob.firstElementChild;
        if(!card) return out;
        var block = v43BuildSaveBlock(slots);
        var sub = card.querySelector("p.sub") || card.querySelector("h1");
        if(sub && sub.parentNode) sub.parentNode.insertBefore(block, sub.nextSibling);
        else card.insertBefore(block, card.firstChild);
      }catch(e){}
      return out;
    };
  }catch(e){}
})();

/* ---------- 6. Drag-and-drop company tiles with batch save ---------- */
function v43ArrangeCard(){
  var cos = (G.companies||[]).slice();
  var box = document.createElement("div");
  box.className = "card mb14";
  box.setAttribute("data-v43arrange","1");
  if(cos.length < 2){
    box.innerHTML = '<h3>\uD83D\uDD00 Arrange companies</h3><div class="muted" style="font-size:12.5px;">Found a second company and you will be able to drag your tiles into any order you like.</div>';
    return box;
  }
  if(!window.__v43arrange){
    box.innerHTML = '<h3>\uD83D\uDD00 Arrange companies</h3>'
      + '<div class="muted mb8" style="font-size:12.5px;">Drag your company tiles into the order you want. Nothing is saved until you hit Save, so you can move as many as you like first.</div>'
      + '<button class="btn secondary small" data-v43arrstart="1">\uD83D\uDD00 Rearrange tiles</button>';
    box.querySelector("[data-v43arrstart]").onclick = function(){
      window.__v43arrange = cos.map(function(c){ return c.id; });
      renderScreen();
    };
    return box;
  }
  var order = window.__v43arrange.filter(function(id){ return cos.some(function(c){ return c.id===id; }); });
  cos.forEach(function(c){ if(order.indexOf(c.id)<0) order.push(c.id); });
  window.__v43arrange = order;
  var list = document.createElement("div");
  list.className = "v43-arr";
  order.forEach(function(id){
    var c = cos.find(function(x){ return x.id===id; });
    if(!c) return;
    var row = document.createElement("div");
    row.className = "row";
    row.draggable = true;
    row.setAttribute("data-v43id", id);
    row.innerHTML = '<span class="v43-grip">\u2630</span><b>'+(c.name||"Company")+'</b>'
      + '<span class="muted" style="font-size:11.5px;margin-left:auto;">'
      + (typeof fmt$==="function" ? fmt$(c.mrr||0)+"/mo" : "") + '</span>';
    row.addEventListener("dragstart", function(ev){
      row.classList.add("drag");
      try{ ev.dataTransfer.setData("text/plain", id); ev.dataTransfer.effectAllowed = "move"; }catch(e){}
    });
    row.addEventListener("dragend", function(){ row.classList.remove("drag"); });
    row.addEventListener("dragover", function(ev){ ev.preventDefault(); row.classList.add("over"); });
    row.addEventListener("dragleave", function(){ row.classList.remove("over"); });
    row.addEventListener("drop", function(ev){
      ev.preventDefault();
      row.classList.remove("over");
      var src = "";
      try{ src = ev.dataTransfer.getData("text/plain"); }catch(e){}
      if(!src || src===id) return;
      var arr = window.__v43arrange.slice();
      arr.splice(arr.indexOf(src), 1);
      arr.splice(arr.indexOf(id), 0, src);
      window.__v43arrange = arr;
      v43RefreshArrange();
    });
    list.appendChild(row);
  });
  box.innerHTML = '<h3>\uD83D\uDD00 Arrange companies <span class="muted" style="font-size:12px;font-weight:400;">\u2014 editing</span></h3>'
    + '<div class="muted mb8" style="font-size:12.5px;">Drag as many tiles as you want. This stays open until you hit Save.</div>';
  box.appendChild(list);
  var foot = document.createElement("div");
  foot.className = "flexrow mt8";
  foot.innerHTML = '<button class="btn small" data-v43arrsave="1">\uD83D\uDCBE Save order</button>'
    + '<button class="btn secondary small" data-v43arrcancel="1">Cancel</button>';
  box.appendChild(foot);
  foot.querySelector("[data-v43arrsave]").onclick = function(){
    var arr = window.__v43arrange.slice();
    G.companies.sort(function(a,b){ return arr.indexOf(a.id) - arr.indexOf(b.id); });
    window.__v43arrange = null;
    if(typeof toast==="function") toast("<b>Order saved.</b> Your company tiles are in the new order.","good");
    renderScreen();
  };
  foot.querySelector("[data-v43arrcancel]").onclick = function(){
    window.__v43arrange = null;
    renderScreen();
  };
  return box;
}
function v43RefreshArrange(){
  try{
    var old = document.querySelector("[data-v43arrange]");
    if(!old) return renderScreen();
    var fresh = v43ArrangeCard();
    old.parentNode.replaceChild(fresh, old);
  }catch(e){ try{ renderScreen(); }catch(e2){} }
}
(function v43EmpireArrange(){
  try{
    if(typeof renderEmpire !== "function") return;
    var prev = renderEmpire;
    renderEmpire = function(){
      var wrap = prev.apply(this, arguments);
      try{
        if(wrap && !wrap.querySelector("[data-v43arrange]")){
          var card = v43ArrangeCard();
          var title = wrap.querySelector(".window-title");
          if(title && title.nextSibling) wrap.insertBefore(card, title.nextSibling);
          else wrap.appendChild(card);
        }
      }catch(e){}
      return wrap;
    };
  }catch(e){}
})();

try{ if(typeof GAME_VERSION !== "undefined"){ GAME_VERSION = "v4.3"; } }catch(e){}
try{ window.GAME_VERSION = "v4.3"; }catch(e){}

/* ---------- 7. Save index repair (root cause of the missing save list) ---------- */
(function v43SaveIndex(){
  try{
    var IDX = (typeof LS_SLOTS_INDEX !== "undefined") ? LS_SLOTS_INDEX : "besim2_slots_index";
    var MEM = {};
    function get(k){
      try{ var v = localStorage.getItem(k); if(v !== null) return v; }catch(e){}
      return Object.prototype.hasOwnProperty.call(MEM,k) ? MEM[k] : null;
    }
    function set(k,v){ MEM[k] = v; try{ localStorage.setItem(k, v); }catch(e){} }
    function readIdx(){
      try{ var a = JSON.parse(get(IDX) || "[]"); return Array.isArray(a) ? a : []; }catch(e){ return []; }
    }
    function writeIdx(a){ set(IDX, JSON.stringify(a)); }
    function stamp(key, state, label){
      var a = readIdx().filter(function(s){ return s && s.key !== key; });
      a.push({ key:key, label: label || (state && state.meta && state.meta.name) || "Saved game",
        savedAt: Date.now(),
        month: (state && state.company && state.company.month) || 1,
        year: (state && state.company && state.company.year) || 1,
        cash: (state && state.company && state.company.cash) || 0 });
      writeIdx(a);
    }
    /* rebuild the index from any saved state blobs that lost their entry */
    function rebuild(){
      var a = readIdx();
      var have = {};
      a.forEach(function(s){ if(s && s.key) have[s.key] = 1; });
      var keys = [];
      try{ keys = Object.keys(localStorage); }catch(e){ keys = []; }
      keys.concat(Object.keys(MEM)).forEach(function(k){
        if(k === IDX || have[k]) return;
        var raw = get(k);
        if(!raw || raw.charAt(0) !== "{" || raw.length < 200) return;
        var st = null;
        try{ st = JSON.parse(raw); }catch(e){ return; }
        if(!st || !st.company || !st.meta) return;
        have[k] = 1;
        a.push({ key:k, label:(st.meta.name || "Saved game") + (k.indexOf("auto")>=0 ? " (autosave)" : ""),
          savedAt: st.meta.savedAt || Date.now(), month: st.company.month||1,
          year: st.company.year||1, cash: st.company.cash||0 });
      });
      writeIdx(a);
      return a;
    }
    if(typeof saveToSlot === "function"){
      var prevSave = saveToSlot;
      saveToSlot = function(state, slotKey, label){
        var out;
        try{ out = prevSave.apply(this, arguments); }catch(e){}
        try{ if(get(slotKey) === null) set(slotKey, JSON.stringify(state)); }catch(e){}
        try{ stamp(slotKey, state, label); }catch(e){}
        return out;
      };
    }
    if(typeof listSlots === "function"){
      var prevList = listSlots;
      listSlots = function(){
        var a = [];
        try{ a = prevList.apply(this, arguments) || []; }catch(e){ a = []; }
        if(!a.length){ try{ a = rebuild(); }catch(e){ a = []; } }
        try{ a = a.slice().sort(function(x,y){ return (y.savedAt||0) - (x.savedAt||0); }); }catch(e){}
        return a;
      };
    }
    window.v43RebuildSaveIndex = rebuild;
  }catch(e){}
})();
/* ================= v4.4 ================= */
(function v44Css(){
  try{
    var s = document.createElement("style");
    s.textContent = `
    .v44-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0 12px;}
    .v44-cell{background:var(--panel2);border:1px solid var(--border);border-radius:10px;padding:8px 10px;}
    .v44-cell .l{font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;opacity:.65;}
    .v44-cell .v{font-size:15px;font-weight:800;margin-top:2px;}
    .v44-warn{border-color:var(--bad) !important;}
    .v44-banner{border:1px solid var(--bad);background:rgba(239,68,68,.08);border-radius:10px;padding:10px 12px;margin-bottom:10px;font-size:12.5px;}
    .v44-obj{border:1px solid var(--good);border-radius:12px;padding:12px;margin-bottom:12px;background:var(--panel2);}
    .v44-bar{height:7px;border-radius:6px;background:var(--border);overflow:hidden;margin-top:8px;}
    .v44-bar i{display:block;height:100%;background:var(--good);}
    .v44-tabs{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;}
    .v44-tab{padding:7px 14px;border-radius:9px;border:1px solid var(--border);background:var(--panel2);
      font-size:12.5px;font-weight:700;cursor:pointer;}
    .v44-tab.active{border-color:var(--good);background:rgba(34,197,94,.12);}
    .v44-tut{border:1px dashed var(--good);border-radius:12px;padding:12px;margin-bottom:12px;}
    .v44-tut .step{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;margin-top:6px;}
    .v44-scn{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:6px;}
    .v44-scn .tile{border:1px solid var(--border);border-radius:10px;padding:9px 10px;cursor:pointer;background:var(--panel2);}
    .v44-scn .tile.active{border-color:var(--good);background:rgba(34,197,94,.10);}
    .v44-scn .tile b{font-size:12.5px;} .v44-scn .tile .d{font-size:11px;opacity:.7;line-height:1.3;margin-top:2px;}
    .v44-over{position:fixed;inset:0;background:rgba(6,8,12,.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px;}
    .v44-over .box{max-width:520px;width:100%;background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:20px;}
    @media (max-width:760px){
      .v44-strip{grid-template-columns:repeat(2,1fr);}
      .v44-scn{grid-template-columns:1fr;}
      .grid, .cols-2, .cols-3, .cols-4, .v21-grid3, .v35-sq{grid-template-columns:1fr !important;}
      .folder-grid{grid-template-columns:repeat(2,1fr) !important;}
      .flexrow{flex-wrap:wrap;}
      .card{padding:12px !important;}
      .window-title h2{font-size:17px;}
      .v43-fac, .fac-card{width:100% !important;}
      table{display:block;overflow-x:auto;}
    }
    `;
    document.head.appendChild(s);
  }catch(e){}
})();

function v44S(){
  var c = G.company;
  if(!c.v44) c.v44 = { negMonths:0, objective:null, resigning:[], scenario:"bootstrapped", tutorial:false, tutDone:{}, dead:false };
  if(!Array.isArray(c.v44.resigning)) c.v44.resigning = [];
  if(!c.v44.tutDone) c.v44.tutDone = {};
  return c.v44;
}
function v44Burn(){
  try{
    var e = G.company.expensesBreakdown || {};
    var t = Object.keys(e).reduce(function(s,k){ var v = Number(e[k])||0; return s+v; }, 0);
    if(t > 0) return t;
  }catch(err){}
  try{
    var pay = (G.company.employees||[]).reduce(function(s,x){ return s + (x.salary||0); }, 0);
    return pay + (G.company.employees||[]).length * 40 + 500;
  }catch(err){ return 0; }
}
function v44Queued(){
  try{ return (G.ui.queue||[]).reduce(function(s,i){ return s + (Number(i.cost)||0); }, 0); }catch(e){ return 0; }
}
function v44Forecast(){
  var c = G.company;
  var rev = Math.max(0, c.mrr||0);
  var burn = v44Burn();
  var queued = v44Queued();
  var net = rev - burn;
  var ending = (c.cash||0) + net - queued;
  var runway = net < 0 ? ((c.cash||0) / Math.abs(net)) : Infinity;
  return { rev:rev, burn:burn, queued:queued, net:net, ending:ending, runway:runway };
}

/* ---------- 4. Cashflow forecast strip above Advance Month ---------- */
function v44StripNode(){
  var f = v44Forecast();
  var box = document.createElement("div");
  box.setAttribute("data-v44strip","1");
  var runTxt = (f.runway === Infinity) ? "Profitable" : (f.runway < 1 ? "< 1 month" : Math.floor(f.runway) + " month" + (Math.floor(f.runway)===1?"":"s"));
  var danger = (f.runway !== Infinity && f.runway <= 2) || f.ending < 0;
  var html = "";
  if(danger){
    html += '<div class="v44-banner"><b>\u26A0\uFE0F Cash warning.</b> '
      + (f.ending < 0
        ? "Closing this month as queued puts you at " + fmt$(Math.round(f.ending)) + ". Cut spend, raise cash in the Bank, or drop something from the queue."
        : "At this burn you have roughly " + runTxt + " of runway left.")
      + " Two months in the red and the board forces layoffs; three and the company folds.</div>";
  }
  html += '<div class="v44-strip">'
    + '<div class="v44-cell"><div class="l">Projected revenue</div><div class="v good">' + fmt$(Math.round(f.rev)) + '</div></div>'
    + '<div class="v44-cell"><div class="l">Projected burn</div><div class="v bad">' + fmt$(Math.round(f.burn)) + '</div></div>'
    + '<div class="v44-cell"><div class="l">Queued this month</div><div class="v">' + fmt$(Math.round(f.queued)) + '</div></div>'
    + '<div class="v44-cell' + (danger ? ' v44-warn' : '') + '"><div class="l">Ending cash \u00b7 runway</div><div class="v">'
      + fmt$(Math.round(f.ending)) + ' <span class="muted" style="font-size:11px;font-weight:600;">\u00b7 ' + runTxt + '</span></div></div>'
    + '</div>';
  box.innerHTML = html;
  return box;
}

/* ---------- 6. Resignations + counteroffers ---------- */
function v44ResignNode(){
  var st = v44S();
  var ids = {};
  (G.company.employees||[]).forEach(function(e){ ids[e.id] = 1; });
  st.resigning = st.resigning.filter(function(r){ return ids[r.id]; });
  if(!st.resigning.length) return null;
  var box = document.createElement("div");
  box.className = "card mb14";
  box.setAttribute("data-v44resign","1");
  box.innerHTML = '<h3>\uD83D\uDEAA Resignation notice</h3>'
    + '<div class="muted mb8" style="font-size:12.5px;">Morale bottomed out. You have one month to change their mind \u2014 do nothing and they walk at month close.</div>'
    + st.resigning.map(function(r){
        var e = (G.company.employees||[]).find(function(x){ return x.id===r.id; });
        if(!e) return "";
        return '<div class="flexrow" style="align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap;">'
          + '<span style="font-size:12.5px;"><b>' + e.name + '</b> \u00b7 ' + e.role + ' \u00b7 ' + fmt$(e.salary||0) + '/mo \u00b7 morale ' + Math.round(e.morale||0) + '</span>'
          + '<button class="btn small" data-v44keep="' + e.id + '">Counteroffer (+15% pay)</button>'
          + '<button class="btn secondary small" data-v44let="' + e.id + '">Let them go</button></div>';
      }).join("");
  box.querySelectorAll("[data-v44keep]").forEach(function(b){
    b.onclick = function(){
      var id = b.getAttribute("data-v44keep");
      var e = (G.company.employees||[]).find(function(x){ return x.id===id; });
      if(e){
        e.salary = Math.round((e.salary||0) * 1.15);
        e.morale = clamp((e.morale||0) + rand(25,40), 0, 100);
        logHistory("Counteroffered " + e.name + " \u2014 stayed on at " + fmt$(e.salary) + "/mo.");
      }
      v44S().resigning = v44S().resigning.filter(function(r){ return r.id!==id; });
      renderScreen();
    };
  });
  box.querySelectorAll("[data-v44let]").forEach(function(b){
    b.onclick = function(){
      var id = b.getAttribute("data-v44let");
      var e = (G.company.employees||[]).find(function(x){ return x.id===id; });
      if(e) logHistory(e.name + " resigned \u2014 you chose not to counter.");
      G.company.employees = (G.company.employees||[]).filter(function(x){ return x.id!==id; });
      v44S().resigning = v44S().resigning.filter(function(r){ return r.id!==id; });
      renderScreen();
    };
  });
  return box;
}

/* ---------- 5. Quarterly board objectives ---------- */
function v44NewObjective(){
  var c = G.company;
  var mrr = Math.max(200, c.mrr||0);
  var opts = [
    { type:"mrr",     label:"Grow recurring revenue 20%", target: Math.round(mrr*1.2), start: mrr,
      desc:"The board wants " + fmt$(Math.round(mrr*1.2)) + " in " + (typeof mrrWord==="function"?mrrWord():"MRR") + " by quarter end." },
    { type:"clients", label:"Add 3 new clients", target:(c.clients||[]).length + 3, start:(c.clients||[]).length,
      desc:"Logo count matters to them this quarter. Three net new." },
    { type:"cash",    label:"Finish the quarter above " + fmt$(Math.max(15000, Math.round((c.cash||0)*1.15))),
      target: Math.max(15000, Math.round((c.cash||0)*1.15)), start:(c.cash||0),
      desc:"They want the balance sheet stronger than it is today." },
    { type:"team",    label:"Grow the team by 2", target:(c.employees||[]).length + 2, start:(c.employees||[]).length,
      desc:"Capacity is the constraint. Two more bodies on payroll." }
  ];
  var o = pick(opts);
  o.reward = Math.max(10000, Math.round(mrr * 2));
  o.endMonth = ((c.month||1) + 2 - 1) % 12 + 1;
  o.setYear = c.year||1;
  o.setMonth = c.month||1;
  return o;
}
function v44ObjProgress(o){
  var c = G.company;
  var now = o.type==="mrr" ? (c.mrr||0)
    : o.type==="clients" ? (c.clients||[]).length
    : o.type==="cash" ? (c.cash||0)
    : (c.employees||[]).length;
  var span = Math.max(1, o.target - o.start);
  return { now:now, pct: clamp(Math.round(((now - o.start) / span) * 100), 0, 100), hit: now >= o.target };
}
function v44ObjNode(){
  var st = v44S();
  if(!st.objective) return null;
  var o = st.objective;
  var p = v44ObjProgress(o);
  var box = document.createElement("div");
  box.className = "v44-obj";
  box.setAttribute("data-v44obj","1");
  box.innerHTML = '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;opacity:.7;">\uD83C\uDFDB\uFE0F Board objective \u00b7 this quarter</div>'
    + '<div style="font-weight:800;font-size:14px;margin-top:3px;">' + o.label + '</div>'
    + '<div class="muted" style="font-size:12px;margin-top:2px;">' + o.desc + '</div>'
    + '<div class="v44-bar"><i style="width:' + p.pct + '%"></i></div>'
    + '<div class="muted" style="font-size:11.5px;margin-top:5px;">Progress ' + p.pct + '% \u00b7 bonus on delivery: <b>' + fmt$(o.reward) + '</b>'
    + ' \u00b7 miss it and the board loses confidence.</div>';
  return box;
}
function v44SettleObjective(){
  var st = v44S();
  var c = G.company;
  if(!st.objective){ st.objective = v44NewObjective(); logHistory("Board set a new quarterly objective: " + st.objective.label + "."); return; }
  var monthsIn = ((c.year - st.objective.setYear) * 12) + (c.month - st.objective.setMonth);
  if(monthsIn < 3) return;
  var p = v44ObjProgress(st.objective);
  if(p.hit){
    c.cash += st.objective.reward;
    c.successScore = clamp((c.successScore||50) + 6, 0, 100);
    logHistory("\u2705 Board objective delivered (" + st.objective.label + ") \u2014 " + fmt$(st.objective.reward) + " performance bonus released.");
    if(typeof toast==="function") toast("<b>Objective delivered.</b> The board released a " + fmt$(st.objective.reward) + " bonus.", "good");
  } else {
    c.successScore = clamp((c.successScore||50) - 6, 0, 100);
    logHistory("\u274C Board objective missed (" + st.objective.label + ") \u2014 confidence in management slipped.");
    if(typeof toast==="function") toast("<b>Objective missed.</b> The board is not impressed.", "bad");
  }
  st.objective = v44NewObjective();
  logHistory("Board set a new quarterly objective: " + st.objective.label + ".");
}

/* ---------- 3. Rivals that actually bite ---------- */
function v44RivalNames(){
  try{
    var live = (typeof v33LiveRivals==="function") ? v33LiveRivals() : [];
    if(live && live.length) return live.map(function(r){ return r.name; });
  }catch(e){}
  try{
    var cs = G.company.competitors || [];
    if(cs.length) return cs.map(function(x){ return x.name; });
  }catch(e){}
  return ["Northstar Systems"];
}
function v44RivalsAttack(){
  var c = G.company;
  var names = v44RivalNames();
  if(!names.length) return;
  var who = pick(names);
  var roll = Math.random();
  if(roll < 0.38){
    var weak = (c.clients||[]).filter(function(x){ return (x.health||100) < 62; });
    if(weak.length){
      var lost = pick(weak);
      c.clients = c.clients.filter(function(x){ return x.id !== lost.id; });
      if(typeof recomputeMRR==="function") recomputeMRR();
      logHistory("\u2694\uFE0F " + who + " poached " + lost.name + " \u2014 " + fmt$(lost.mrr||0) + " of " + (typeof mrrWord==="function"?mrrWord():"MRR") + " walked out the door. Their account health was already slipping.");
      return;
    }
  }
  if(roll < 0.62){
    var unhappy = (c.employees||[]).filter(function(e){ return (e.morale||100) < 52; });
    if(unhappy.length){
      var gone = pick(unhappy);
      try{ window.__v492exits = window.__v492exits || {}; window.__v492exits[gone.id] = 1; }catch(e){}
      c.employees = c.employees.filter(function(e){ return e.id !== gone.id; });
      logHistory("\u2694\uFE0F " + who + " poached " + gone.name + " (" + gone.role + "). Low morale made the recruiter's job easy.");
      return;
    }
  }
  if(roll < 0.85){
    var book = (c.clients||[]).filter(function(x){ return (x.mrr||0) > 200; });
    if(book.length){
      var hit = pick(book);
      var cut = Math.max(40, Math.round((hit.mrr||0) * (rand(5,11)/100)));
      hit.mrr = Math.max(50, (hit.mrr||0) - cut);
      hit.health = clamp((hit.health||70) - rand(2,6), 0, 100);
      if(typeof recomputeMRR==="function") recomputeMRR();
      logHistory("\u2694\uFE0F " + who + " undercut you on " + hit.name + "'s renewal \u2014 you held the logo but gave up " + fmt$(cut) + "/mo to keep it.");
      return;
    }
  }
  logHistory("\u2694\uFE0F " + who + " ran a campaign in your segment this month. No damage yet, but they are circling.");
}

/* ---------- 2. Bankruptcy cliff ---------- */
function v44GameOver(){
  var st = v44S();
  if(st.dead) return;
  st.dead = true;
  var c = G.company;
  var over = document.createElement("div");
  over.className = "v44-over";
  over.innerHTML = '<div class="box"><h2 style="margin:0 0 6px;">\uD83D\uDCC9 Insolvent</h2>'
    + '<div class="muted" style="font-size:12.5px;">Three straight months in the red. Payroll bounced, the bank called the line, and '
    + (c.name||"the company") + ' is done.</div>'
    + '<div class="v44-strip" style="grid-template-columns:repeat(2,1fr);">'
    + '<div class="v44-cell"><div class="l">Survived</div><div class="v">Y' + (c.year||1) + ' M' + (c.month||1) + '</div></div>'
    + '<div class="v44-cell"><div class="l">Peak ' + (typeof mrrWord==="function"?mrrWord():"MRR") + '</div><div class="v">' + fmt$(Math.round(c.peakMrr||c.mrr||0)) + '</div></div>'
    + '<div class="v44-cell"><div class="l">Clients served</div><div class="v">' + ((c.clients||[]).length) + '</div></div>'
    + '<div class="v44-cell"><div class="l">Final cash</div><div class="v bad">' + fmt$(Math.round(c.cash||0)) + '</div></div>'
    + '</div><div class="flexrow" style="margin-top:12px;"><button class="btn" id="v44Restart">Start a new venture</button>'
    + '<button class="btn secondary" id="v44Dismiss">Look at the wreckage</button></div></div>';
  document.body.appendChild(over);
  over.querySelector("#v44Restart").onclick = function(){ try{ location.reload(); }catch(e){} };
  over.querySelector("#v44Dismiss").onclick = function(){ over.remove(); };
}
function v44SolvencyCheck(){
  var c = G.company;
  var st = v44S();
  /* the engine zeroes negative cash via an emergency overdraft and counts it as a distress month */
  var d = c.distressMonths || 0;
  var red = d > 0 || (c.cash||0) < 0;
  if(!red){ st.negMonths = 0; st.laidOff = false; return; }
  st.negMonths = (st.negMonths||0) + 1;
  if(st.negMonths === 1){
    logHistory("\u26A0\uFE0F You closed the month with negative cash. One more and the board forces layoffs.");
    if(typeof toast==="function") toast("<b>You are out of cash.</b> Fix the burn now \u2014 layoffs are next.","bad");
  } else if(st.negMonths === 2 && !st.laidOff){
    st.laidOff = true;
    var emps = (c.employees||[]).slice().sort(function(a,b){ return (b.salary||0) - (a.salary||0); });
    var cut = [], need = Math.max(1, v44Burn() - Math.max(0, c.mrr||0)), saved = 0;
    for(var i=0;i<emps.length && saved < need && cut.length < Math.ceil(emps.length/2); i++){
      cut.push(emps[i]); saved += emps[i].salary||0;
    }
    if(cut.length){
      var ids = {};
      cut.forEach(function(e){ ids[e.id] = 1; });
      try{ window.__v492exits = window.__v492exits || {}; cut.forEach(function(e){ window.__v492exits[e.id] = 1; }); }catch(e){}
      c.employees = (c.employees||[]).filter(function(e){ return !ids[e.id]; });
      logHistory("\uD83D\uDD34 Forced layoffs \u2014 " + cut.length + " role(s) cut (" + cut.map(function(e){ return e.name; }).join(", ") + ") to stop the bleeding. Morale across the team took a hit.");
      (c.employees||[]).forEach(function(e){ e.morale = clamp((e.morale||70) - rand(8,18), 0, 100); });
      if(typeof toast==="function") toast("<b>Forced layoffs.</b> The board cut " + cut.length + " role(s). One more red month ends the run.","bad");
    }
  } else if(st.negMonths >= 3){
    v44GameOver();
  }
}

/* ---------- month hook ---------- */
(function v44MonthHook(){
  try{
    if(typeof advanceMonth !== "function") return;
    var prev = advanceMonth;
    advanceMonth = function(){
      var out = prev.apply(this, arguments);
      try{
        var c = G.company, st = v44S();
        c.peakMrr = Math.max(c.peakMrr||0, c.mrr||0);
        /* departures from last month's unanswered notices */
        if(st.resigning.length){
          st.resigning.slice().forEach(function(r){
            if(r.noticeStamp !== (c.year + "-" + c.month)){
              var e = (c.employees||[]).find(function(x){ return x.id===r.id; });
              if(e){
                c.employees = c.employees.filter(function(x){ return x.id!==r.id; });
                logHistory(e.name + " (" + e.role + ") left the company \u2014 the resignation notice went unanswered.");
              }
              st.resigning = st.resigning.filter(function(x){ return x.id!==r.id; });
            }
          });
        }
        /* new resignation notices */
        (c.employees||[]).forEach(function(e){
          if((e.morale||100) < 30 && Math.random() < 0.45 && !st.resigning.some(function(r){ return r.id===e.id; })){
            st.resigning.push({ id:e.id, noticeStamp: c.year + "-" + c.month });
            logHistory("\uD83D\uDEAA " + e.name + " (" + e.role + ") handed in notice \u2014 morale is at " + Math.round(e.morale) + ". You have one month to counter.");
          }
        });
        if(Math.random() < 0.55) v44RivalsAttack();
        v44SettleObjective();
        v44SolvencyCheck();
      }catch(e){}
      return out;
    };
  }catch(e){}
})();

/* ---------- 8. Optional guided start ---------- */
function v44TutorialNode(){
  var st = v44S();
  if(!st.tutorial) return null;
  var c = G.company;
  var steps = [
    { k:"hire", t:"Hire your first employee", d:"People tab \u2192 Sales Rep is the cheapest way to get pipeline moving.", done:(c.employees||[]).length > 0 },
    { k:"hustle", t:"Run a founder hustle", d:"Decide tab \u2192 Founder Hustle. Cold outreach costs nothing but your time.", done:(c.founderActionsLifetime||0) > 0 },
    { k:"client", t:"Land your first client", d:"Close one and recurring revenue starts flowing.", done:(c.clients||[]).length > 0 },
    { k:"month", t:"Close your first month", d:"Check the cashflow strip, then hit Advance Month.", done:((c.year||1) > 1 || (c.month||1) > 1) }
  ];
  var left = steps.filter(function(s){ return !s.done; }).length;
  if(!left){ st.tutorial = false; return null; }
  var box = document.createElement("div");
  box.className = "v44-tut";
  box.setAttribute("data-v44tut","1");
  box.innerHTML = '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">'
    + '<b style="font-size:13px;">\uD83C\uDF93 Guided start \u2014 ' + (steps.length - left) + '/' + steps.length + ' done</b>'
    + '<button class="btn secondary small" data-v44tutoff="1">Dismiss</button></div>'
    + steps.map(function(s){
        return '<div class="step"><span>' + (s.done ? "\u2705" : "\u2B1C") + '</span><span><b>' + s.t + '</b><br>'
          + '<span class="muted" style="font-size:11.5px;">' + s.d + '</span></span></div>';
      }).join("");
  box.querySelector("[data-v44tutoff]").onclick = function(){ v44S().tutorial = false; renderScreen(); };
  return box;
}

/* ---------- mount strip / objective / resignations / tutorial ---------- */
(function v44Mount(){
  try{
    if(typeof renderScreen !== "function") return;
    var prev = renderScreen;
    renderScreen = function(){
      var out = prev.apply(this, arguments);
      try{
        if(!G || !G.company) return out;
        var screen = document.getElementById("screen");
        if(!screen) return out;
        var tab = G.ui && G.ui.activeTab;
        /* forecast strip: right above whichever Advance Month button is on screen */
        var adv = document.querySelector("#advanceBtn");
        if(adv && !document.querySelector("[data-v44strip]")){
          var host = adv.closest(".card") || adv.parentElement;
          if(host && host.parentNode) host.parentNode.insertBefore(v44StripNode(), host);
        }
        if(!screen.querySelector("[data-v44strip]")){
          var sn = v44StripNode();
          var t0 = screen.querySelector(".window-title");
          if(t0 && t0.parentNode) t0.parentNode.insertBefore(sn, t0.nextSibling);
          else screen.insertBefore(sn, screen.firstChild);
        }
        try{
          if(!screen.querySelector("[data-v44resign]")){
            var rn = v44ResignNode();
            if(rn) screen.insertBefore(rn, screen.firstChild);
          }
        }catch(e){}
        try{
          if(!screen.querySelector("[data-v44tut]")){
            var tn = v44TutorialNode();
            if(tn) screen.insertBefore(tn, screen.firstChild);
          }
        }catch(e){}
        if((tab === "board2" || tab === "board" || tab === "hq" || tab === "run") && !screen.querySelector("[data-v44obj]")){
          var on = v44ObjNode();
          if(on){
            var title = screen.querySelector(".window-title");
            if(title && title.parentNode) title.parentNode.insertBefore(on, title.nextSibling);
            else screen.insertBefore(on, screen.firstChild);
          }
        }
      }catch(e){}
      return out;
    };
  }catch(e){}
})();

/* ---------- 7. Starting scenarios + tutorial opt-in on onboarding ---------- */
var V44_SCENARIOS = [
  { key:"bootstrapped", name:"\uD83C\uDF31 Bootstrapped", desc:"The standard run. Your savings, your rules.", cash:1, note:"" },
  { key:"funded", name:"\uD83D\uDCB0 VC-Funded", desc:"3\u00d7 the starting cash, but the board expects growth and watches you closely.", cash:3, note:"Investors are on the cap table from day one." },
  { key:"recession", name:"\uD83D\uDCC9 Recession Year", desc:"Half the cash, tighter clients, cheaper talent. Hard mode.", cash:0.5, note:"Buyers are slow and every deal is a fight." },
  { key:"turnaround", name:"\uD83D\uDD27 Turnaround", desc:"You inherit a business with revenue, staff, and a mess of problems.", cash:0.8, note:"Starts with clients and payroll already running." }
];
function v44ApplyScenario(key){
  var s = V44_SCENARIOS.find(function(x){ return x.key===key; }) || V44_SCENARIOS[0];
  var c = G.company;
  var st = v44S();
  st.scenario = s.key;
  if(s.key === "bootstrapped") return;
  c.cash = Math.round((c.cash||0) * s.cash);
  if(s.key === "funded"){
    c.successScore = clamp((c.successScore||50) + 5, 0, 100);
    logHistory("Scenario: VC-Funded \u2014 you closed a seed round before month one. More cash, more expectations.");
  } else if(s.key === "recession"){
    logHistory("Scenario: Recession Year \u2014 half the cash, slower buyers, cheaper hires. Good luck.");
  } else if(s.key === "turnaround"){
    for(var i=0;i<3;i++){
      c.clients.push({ id:uid(), name:pick(["Granite Supply","Oakfield Clinic","Delta Print Co","Harbor Freight Lines","Sunrise Staffing"]),
        mrr:rand(400,1100), health:rand(28,52), sinceMonth:c.month, sinceYear:c.year });
    }
    try{
      if(typeof hire === "function" && typeof LADDERS === "object"){
        Object.keys(LADDERS).slice(0,2).forEach(function(dk){
          var rungs = LADDERS[dk] && LADDERS[dk].rungs;
          if(rungs && rungs.length) hire(dk, rungs[0].key);
        });
      }
    }catch(e){}
    (c.employees||[]).forEach(function(e){ e.morale = rand(25,45); e.performance = rand(40,60); });
    if(typeof recomputeMRR==="function") recomputeMRR();
    logHistory("Scenario: Turnaround \u2014 you took over a business with revenue, unhappy staff, and unhappy customers.");
  }
}
(function v44Onboard(){
  try{
    if(typeof renderOnboard !== "function") return;
    var prev = renderOnboard;
    renderOnboard = function(){
      var out = prev.apply(this, arguments);
      try{
        var ob = document.getElementById("onboard");
        if(!ob || ob.querySelector("[data-v44scn]")) return out;
        var card = ob.querySelector(".ob-card");
        var actions = card && (card.querySelector(".ob-actions") || card.querySelector("#obStart"));
        if(!card || !actions) return out;
        if(!window.__v44scn) window.__v44scn = "bootstrapped";
        var block = document.createElement("div");
        block.setAttribute("data-v44scn","1");
        block.style.cssText = "border-top:1px solid var(--border);padding-top:10px;margin-top:12px;";
        block.innerHTML = '<div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Starting scenario</div>'
          + '<div class="v44-scn">' + V44_SCENARIOS.map(function(s){
              return '<div class="tile ' + (window.__v44scn===s.key?"active":"") + '" data-v44pick="' + s.key + '">'
                + '<b>' + s.name + '</b><div class="d">' + s.desc + '</div></div>';
            }).join("") + '</div>'
          + '<label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12.5px;">'
          + '<input type="checkbox" id="v44Tut" ' + (window.__v44tut ? "checked" : "") + ' style="width:auto;" />'
          + 'Show me a guided start (four quick steps \u2014 you can dismiss it anytime)</label>';
        var anchor = card.querySelector(".ob-actions") || actions;
        anchor.parentNode.insertBefore(block, anchor);
        block.querySelectorAll("[data-v44pick]").forEach(function(t){
          t.onclick = function(){
            window.__v44scn = t.getAttribute("data-v44pick");
            block.querySelectorAll("[data-v44pick]").forEach(function(x){ x.classList.toggle("active", x===t); });
          };
        });
        var cb = block.querySelector("#v44Tut");
        if(cb) cb.onchange = function(){ window.__v44tut = cb.checked; };
        var btn = card.querySelector("#obStart");
        if(btn && !btn.getAttribute("data-v44wrap")){
          btn.setAttribute("data-v44wrap","1");
          var orig = btn.onclick;
          btn.onclick = function(ev){
            var r = orig ? orig.call(this, ev) : undefined;
            try{
              if(G && G.company){
                var st = v44S();
                st.tutorial = !!window.__v44tut;
                v44ApplyScenario(window.__v44scn || "bootstrapped");
                st.objective = v44NewObjective();
                logHistory("Board set your first quarterly objective: " + st.objective.label + ".");
                renderAll();
              }
            }catch(e){}
            return r;
          };
        }
      }catch(e){}
      return out;
    };
  }catch(e){}
})();

/* ---------- Research becomes a tab inside Rivals ---------- */
(function v44RivalsTabs(){
  try{
    if(typeof v33RivalsScreen !== "function") return;
    var prev = v33RivalsScreen;
    v33RivalsScreen = function(){
      var wrap = prev.apply(this, arguments);
      try{
        var research = wrap.querySelector("[data-v41research]");
        if(!research) return wrap;
        if(!window.__v44rivTab) window.__v44rivTab = "market";
        var others = [];
        Array.prototype.forEach.call(wrap.children, function(ch){
          if(ch !== research && !ch.classList.contains("window-title")) others.push(ch);
        });
        var tabs = document.createElement("div");
        tabs.className = "v44-tabs";
        tabs.innerHTML = '<div class="v44-tab" data-v44riv="market">\u2694\uFE0F Market &amp; rivals</div>'
          + '<div class="v44-tab" data-v44riv="research">\uD83D\uDD0D Competitor research</div>';
        var title = wrap.querySelector(".window-title");
        if(title && title.nextSibling) wrap.insertBefore(tabs, title.nextSibling);
        else wrap.insertBefore(tabs, wrap.firstChild);
        var apply = function(){
          var m = window.__v44rivTab === "market";
          others.forEach(function(n){ n.style.display = m ? "" : "none"; });
          research.style.display = m ? "none" : "";
          research.style.marginTop = "0";
          tabs.querySelectorAll("[data-v44riv]").forEach(function(t){
            t.classList.toggle("active", t.getAttribute("data-v44riv") === window.__v44rivTab);
          });
        };
        tabs.querySelectorAll("[data-v44riv]").forEach(function(t){
          t.onclick = function(){ window.__v44rivTab = t.getAttribute("data-v44riv"); apply(); };
        });
        apply();
      }catch(e){}
      return wrap;
    };
  }catch(e){}
})();

/* ---------- one autosave slot, not two ---------- */
(function v44OneAutosave(){
  try{
    var prefix = (typeof LS_PREFIX === "string") ? LS_PREFIX : "besim2_";
    var CANON = prefix + "slot_auto";
    var LEGACY = prefix + "autosave";
    if(typeof saveToSlot === "function"){
      var prev = saveToSlot;
      saveToSlot = function(state, slotKey, label){
        if(slotKey === LEGACY || slotKey === CANON){
          slotKey = CANON;
          label = "\uD83D\uDD04 Autosave \u2014 " + ((state && state.meta && state.meta.name) || "current run");
        }
        return prev.call(this, state, slotKey, label);
      };
    }
    /* clear the orphaned legacy slot once */
    try{
      localStorage.removeItem(LEGACY);
      var IDX = (typeof LS_SLOTS_INDEX !== "undefined") ? LS_SLOTS_INDEX : prefix + "slots_index";
      var raw = localStorage.getItem(IDX);
      if(raw){
        var a = JSON.parse(raw) || [];
        var b = a.filter(function(s){ return s && s.key !== LEGACY; });
        if(b.length !== a.length) localStorage.setItem(IDX, JSON.stringify(b));
      }
    }catch(e){}
  }catch(e){}
})();

try{ window.GAME_VERSION = "v4.4"; }catch(e){}
(function v44VersionLabel(){
  try{
    if(typeof renderOnboard !== "function") return;
    var prev = renderOnboard;
    renderOnboard = function(){
      var out = prev.apply(this, arguments);
      try{
        var ob = document.getElementById("onboard");
        var vs = ob && ob.querySelector("h1 .muted");
        if(vs) vs.textContent = "v4.4";
      }catch(e){}
      return out;
    };
  }catch(e){}
})();

/* re-render the onboarding screen once so v4.4 additions appear on first paint */
(function v44ObBoot(){
  try{
    var run = function(){
      try{
        var ob = document.getElementById("onboard");
        if(ob && ob.querySelector(".ob-card") && !ob.querySelector("[data-v44scn]") && typeof renderOnboard === "function"){
          renderOnboard();
        }
      }catch(e){}
    };
    if(document.readyState === "complete" || document.readyState === "interactive") setTimeout(run, 0);
    else window.addEventListener("DOMContentLoaded", function(){ setTimeout(run, 0); });
    setTimeout(run, 400);
  }catch(e){}
})();
/* ================= v4.5 — SMB starter businesses ================= */
(function v45Css(){
  try{
    var s = document.createElement("style");
    s.textContent = `
    .v45-card{border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:12px;background:var(--panel2);}
    .v45-unit{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;
      border:1px solid var(--border);border-radius:10px;padding:8px 10px;margin-top:7px;background:var(--panel);}
    .v45-unit .nm{font-size:12.5px;font-weight:700;}
    .v45-unit .mt{font-size:11.5px;opacity:.72;}
    .v45-row{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px;}
    .v45-tier{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;}
    .v45-tier span{font-size:11px;padding:4px 9px;border-radius:999px;border:1px solid var(--border);opacity:.55;}
    .v45-tier span.on{opacity:1;border-color:var(--good);background:rgba(34,197,94,.12);font-weight:700;}
    @media (max-width:760px){ .v45-unit{flex-direction:column;align-items:flex-start;} }
    `;
    document.head.appendChild(s);
  }catch(e){}
})();

/* ---------------- industry definitions ---------------- */
(function v45Industries(){
  try{
    INDUSTRIES.nail_salon = {
      key:"nail_salon", label:"Nail Salon", icon:"\uD83D\uDC85", startCash:25000, opsType:null, v45:"salon",
      desc:"One chair, one technician, one strip-mall lease. Fill the books, add stations, then open a second location \u2014 and a tenth.",
      revenueLabel:"Salon Operations", accountLabel:"Standing Accounts",
      deptLabels:{ sales:"Front Desk & Bookings", marketing:"Local Marketing", product:"Services & Menu", support:"Guest Experience", operations:"Salon Operations" },
      accounts:{ Enterprise:["Hotel Spa Contract","Casino Resort Account","Regional Bridal Group"],
        "Mid-Market":["Country Club Standing Account","Dance Studio Partnership","Corporate Perk Program"],
        Small:["Bridal Party Package","Weekly Regulars Club","Salon Membership Group"] },
      roles:{
        sales:["Front Desk Host","Booking Coordinator","Front Desk Lead","Guest Services Manager","Director of Bookings","Chief Revenue Officer"],
        marketing:["Social Media Helper","Local Marketing Coordinator","Campaign Lead","Marketing Manager","Director of Marketing","Chief Marketing Officer"],
        product:["Nail Technician","Senior Nail Technician","Master Technician","Service Manager","Director of Services","Chief Creative Officer"],
        support:["Salon Assistant","Guest Experience Lead","Shift Lead","Salon Manager","Director of Guest Experience","Chief Customer Officer"],
        finance:["Bookkeeper","Finance Coordinator","Finance Team Lead","Finance Manager","Director of Finance","Chief Financial Officer"],
        operations:["Supply Runner","Inventory Coordinator","Operations Lead","Area Manager","Director of Operations","Chief Operating Officer"],
        hr:["Staffing Coordinator","People Coordinator","People Team Lead","HR Manager","Director of People","Chief People Officer"]
      }
    };
    INDUSTRIES.trucking = {
      key:"trucking", label:"Trucking Company", icon:"\uD83D\uDE9B", startCash:35000, opsType:null, v45:"fleet",
      desc:"You are the driver. One tractor and whatever loads you can book. Get out of the seat, add trucks, become a carrier.",
      revenueLabel:"Fleet Operations", accountLabel:"Shipper Contracts",
      deptLabels:{ sales:"Freight Sales", marketing:"Carrier Marketing", product:"Dispatch & Planning", support:"Driver Support", operations:"Maintenance & Compliance" },
      accounts:{ Enterprise:["National Grocery Dedicated Lane","Big Box Distribution Contract","Auto Plant Milk Run"],
        "Mid-Market":["Regional Beverage Distributor","Building Supply Chain","Cold Storage Partner"],
        Small:["Local Freight Broker","Furniture Wholesaler","Produce Hauler"] },
      roles:{
        sales:["Freight Agent","Senior Freight Agent","Lane Sales Lead","Sales Manager","Director of Freight Sales","Chief Revenue Officer"],
        marketing:["Marketing Assistant","Marketing Coordinator","Campaign Lead","Marketing Manager","Director of Marketing","Chief Marketing Officer"],
        product:["Dispatcher","Senior Dispatcher","Dispatch Lead","Dispatch Manager","Director of Planning","Chief Operating Officer"],
        support:["Driver Manager","Senior Driver Manager","Driver Support Lead","Driver Services Manager","Director of Driver Retention","Chief People Officer"],
        finance:["Billing Clerk","Finance Coordinator","Finance Team Lead","Finance Manager","Director of Finance","Chief Financial Officer"],
        operations:["Shop Technician","Maintenance Lead","Safety & Compliance Lead","Terminal Manager","Director of Operations","Chief Operating Officer"],
        hr:["Driver Recruiter","People Coordinator","People Team Lead","HR Manager","Director of People","Chief People Officer"]
      }
    };
    INDUSTRIES.agency = {
      key:"agency", label:"Marketing Agency", icon:"\uD83D\uDCE3", startCash:12000, opsType:null, v45:"agency",
      desc:"A laptop, a portfolio and one retainer. Win bigger accounts, staff up, and climb from freelancer to a Madison Avenue holding company.",
      revenueLabel:"Billings", accountLabel:"Accounts",
      deptLabels:{ sales:"New Business", marketing:"Agency Marketing", product:"Creative", support:"Account Management", operations:"Studio Operations" },
      accounts:{ Enterprise:["Global Beverage Brand","National Auto Group","Airline Rebrand","Telecom Holding Co"],
        "Mid-Market":["Regional Bank Campaign","Restaurant Franchise Group","Fashion Label Launch","Healthcare Network"],
        Small:["Local Dentist Office","Realtor Team","Gym Franchise Owner","Coffee Roaster","Landscaping Co"] },
      roles:{
        sales:["New Business Rep","New Business Lead","Pitch Director","New Business Manager","Director of New Business","Chief Growth Officer"],
        marketing:["Agency Marketer","Marketing Coordinator","Campaign Lead","Marketing Manager","Director of Marketing","Chief Marketing Officer"],
        product:["Junior Copywriter","Art Director","Senior Creative","Creative Director","Executive Creative Director","Chief Creative Officer"],
        support:["Account Coordinator","Account Executive","Account Supervisor","Account Director","Group Account Director","Chief Client Officer"],
        finance:["Billing Coordinator","Finance Coordinator","Finance Team Lead","Finance Manager","Director of Finance","Chief Financial Officer"],
        operations:["Studio Assistant","Traffic Coordinator","Studio Lead","Studio Manager","Director of Operations","Chief Operating Officer"],
        hr:["Talent Coordinator","People Coordinator","People Team Lead","HR Manager","Director of People","Chief People Officer"]
      }
    };
    ["agency","trucking","nail_salon"].forEach(function(k){
      if(INDUSTRY_KEYS.indexOf(k) < 0) INDUSTRY_KEYS.splice(1, 0, k);
      INDUSTRY_UNLOCK[k] = 0;
    });
  }catch(e){}
})();

function v45Kind(co){
  try{ var i = INDUSTRIES[((co||G.company).industry)]; return (i && i.v45) || null; }catch(e){ return null; }
}
function v45S(){
  var c = G.company;
  if(!c.v45) c.v45 = { units:[], tier:0, lastGross:0, lastNet:0, seeded:false, pitchStamp:"" };
  if(!Array.isArray(c.v45.units)) c.v45.units = [];
  return c.v45;
}
function v45Seed(){
  var kind = v45Kind();
  if(!kind) return;
  var st = v45S();
  if(st.seeded) return;
  st.seeded = true;
  if(kind === "salon"){
    st.units.push({ id:uid(), name:"First Salon", chairs:2, staffed:1, rent:2400 });
    logHistory("Signed a strip-mall lease with two stations. You are working one of them yourself.");
  } else if(kind === "fleet"){
    st.units.push({ id:uid(), name:"Truck 1", owner:true, condition:88, miles:0 });
    logHistory("You are the driver. One tractor, your own authority, and whatever loads you can book.");
  } else if(kind === "agency"){
    st.tier = 0;
    logHistory("One laptop, one portfolio, no employees. Everything billed is yours \u2014 so is every deadline.");
  }
}

/* ---------------- economics ---------------- */
var V45_SALON_CHAIR_COST = 6000;
var V45_SALON_COST = 28000;
var V45_TRUCK_COST = 42000;
var V45_DRIVER_PAY = 5200;
var V45_TIERS = [
  { key:"solo", name:"Freelancer", need:0, mult:1.00, note:"You are the agency." },
  { key:"boutique", name:"Boutique Shop", need:15000, mult:1.25, note:"A few creatives, a real address." },
  { key:"regional", name:"Regional Agency", need:60000, mult:1.6, note:"Pitching against real shops." },
  { key:"network", name:"Agency Network", need:180000, mult:2.1, note:"Multiple offices, national accounts." },
  { key:"madison", name:"Madison Avenue", need:500000, mult:2.8, note:"A holding company with a lobby people photograph." }
];
function v45AgencyBillings(){ return (G.company.mrr || 0); }
function v45TierIndex(){
  var b = v45AgencyBillings(), idx = 0;
  V45_TIERS.forEach(function(t, i){ if(b >= t.need) idx = i; });
  return idx;
}
function v45SalonMonth(){
  var st = v45S(), c = G.company;
  var techs = (c.employees||[]).filter(function(e){ return e.dept === "product"; }).length;
  var marketing = (typeof marketingBoost === "function") ? marketingBoost() : 0;
  var gross = 0, costs = 0;
  var pool = techs + 1; /* the founder still works a station */
  var first = true;
  st.units.forEach(function(u){
    u.staffed = Math.max(0, Math.min(u.chairs, pool));
    pool -= u.staffed;
    var util = clamp(0.6 + marketing + (Math.random() * 0.2 - 0.1), 0.3, 0.98);
    var perChair = Math.round(8200 * util);
    gross += perChair * u.staffed;
    /* techs take a cut on top of base pay; the founder's own chair costs nothing */
    var paidChairs = Math.max(0, u.staffed - (first ? 1 : 0));
    costs += Math.round(perChair * 0.22) * paidChairs + u.rent + 260 * u.chairs;
    first = false;
  });
  st.lastGross = Math.round(gross);
  st.lastNet = Math.round(gross - costs);
  c.cash += st.lastNet;
  if(st.units.length){
    logHistory("\uD83D\uDC85 Salon month: " + fmt$(st.lastGross) + " in services across " + st.units.length + " location(s), "
      + fmt$(Math.round(costs)) + " in supplies, commission and rent \u2014 net " + fmt$(st.lastNet) + ".");
  }
}
function v45FleetMonth(){
  var st = v45S(), c = G.company;
  var dispatchers = (c.employees||[]).filter(function(e){ return e.dept === "product"; }).length;
  var gross = 0, costs = 0, events = [];
  st.units.forEach(function(u){
    if(u.down){ u.down = false; events.push(u.name + " was down for repairs and ran no loads."); return; }
    if(!u.owner && !u.driver){ events.push(u.name + " sat empty \u2014 no driver assigned."); return; }
    var rate = 18500 + rand(-2500, 2600) + dispatchers * 900;
    gross += rate;
    costs += Math.round(rate * 0.58);
    if(!u.owner) costs += V45_DRIVER_PAY;
    u.condition = clamp((u.condition || 90) - rand(3, 8), 0, 100);
    u.miles = (u.miles || 0) + rand(8000, 11000);
    if(u.condition < 45 && Math.random() < 0.35){
      var bill = rand(2200, 7800);
      costs += bill;
      u.down = true;
      u.condition = clamp(u.condition + rand(25, 45), 0, 100);
      events.push(u.name + " broke down \u2014 " + fmt$(bill) + " in repairs, out of service next month.");
    }
  });
  st.lastGross = Math.round(gross);
  st.lastNet = Math.round(gross - costs);
  c.cash += st.lastNet;
  if(st.units.length){
    logHistory("\uD83D\uDE9B Fleet month: " + fmt$(st.lastGross) + " in freight across " + st.units.length + " truck(s), "
      + fmt$(Math.round(costs)) + " in fuel, maintenance and driver pay \u2014 net " + fmt$(st.lastNet) + ".");
  }
  events.forEach(function(t){ logHistory("\uD83D\uDD27 " + t); });
}
function v45AgencyMonth(){
  var st = v45S(), c = G.company;
  var was = st.tier || 0;
  st.tier = v45TierIndex();
  if(st.tier > was){
    var t = V45_TIERS[st.tier];
    c.successScore = clamp((c.successScore || 50) + 5, 0, 100);
    logHistory("\uD83C\uDFC6 The shop leveled up \u2014 you are now a " + t.name + ". " + t.note + " Bigger accounts will take your calls.");
    if(typeof toast === "function") toast("<b>" + t.name + ".</b> " + t.note, "good");
  }
  var creatives = (c.employees || []).filter(function(e){ return e.dept === "product"; }).length;
  if(creatives === 0){
    var hours = rand(2200, 5200);
    c.cash += hours;
    st.lastGross = hours; st.lastNet = hours;
    logHistory("\uD83D\uDCE3 You billed " + fmt$(hours) + " in freelance hours yourself this month. It does not scale, but it pays rent.");
  } else {
    st.lastGross = 0; st.lastNet = 0;
  }
}

/* ---------------- actions ---------------- */
function v45Spend(amount, label){
  if((G.company.cash || 0) < amount){
    if(typeof toast === "function") toast("Not enough cash for " + label + " (" + fmt$(amount) + ").", "bad");
    return false;
  }
  G.company.cash -= amount;
  logHistory(label + " \u2014 " + fmt$(amount) + " paid from company cash.");
  return true;
}
function v45AddSalon(){
  var st = v45S();
  if(!v45Spend(V45_SALON_COST, "Opened a new salon location")) return;
  st.units.push({ id:uid(), name:"Salon " + (st.units.length + 1), chairs:3, staffed:0, rent:2400 + rand(0, 900) });
  renderAll();
}
function v45AddChair(id){
  var st = v45S();
  var u = st.units.find(function(x){ return x.id === id; });
  if(!u) return;
  if(!v45Spend(V45_SALON_CHAIR_COST, "Added a station at " + u.name)) return;
  u.chairs += 1;
  renderAll();
}
function v45BuyTruck(){
  var st = v45S();
  if(!v45Spend(V45_TRUCK_COST, "Bought another tractor")) return;
  st.units.push({ id:uid(), name:"Truck " + (st.units.length + 1), owner:false, driver:false, condition:rand(70, 95), miles:rand(90000, 300000) });
  renderAll();
}
function v45HireDriver(id){
  var st = v45S();
  var u = st.units.find(function(x){ return x.id === id; });
  if(!u) return;
  u.driver = true;
  logHistory("Seated a company driver in " + u.name + " at " + fmt$(V45_DRIVER_PAY) + "/mo.");
  renderAll();
}
function v45Service(id){
  var st = v45S();
  var u = st.units.find(function(x){ return x.id === id; });
  if(!u) return;
  var bill = 1200 + Math.round((100 - (u.condition || 50)) * 45);
  if(!v45Spend(bill, "Serviced " + u.name)) return;
  u.condition = clamp((u.condition || 50) + rand(25, 40), 0, 100);
  renderAll();
}
function v45GetOffTruck(){
  var st = v45S();
  var mine = st.units.find(function(u){ return u.owner; });
  if(!mine) return;
  mine.owner = false; mine.driver = true;
  logHistory("You got out of the seat and into dispatch. A company driver took over " + mine.name + " at " + fmt$(V45_DRIVER_PAY) + "/mo \u2014 now you can actually sell freight.");
  renderAll();
}
function v45Pitch(){
  var st = v45S(), c = G.company;
  var stamp = c.year + "-" + c.month;
  if(st.pitchStamp === stamp){
    if(typeof toast === "function") toast("You have already pitched this month.", "bad");
    return;
  }
  st.pitchStamp = stamp;
  var idx = v45TierIndex();
  var tier = V45_TIERS[idx];
  var odds = 0.28 + idx * 0.07;
  if(Math.random() < odds){
    var mrr = Math.round((1800 + rand(0, 2600)) * tier.mult);
    c.clients.push({ id:uid(), name:pick(segmentNamePool(idx >= 3 ? "Enterprise" : idx >= 1 ? "Mid-Market" : "Small")),
      mrr:mrr, health:rand(62, 82), sinceMonth:c.month, sinceYear:c.year });
    if(typeof recomputeMRR === "function") recomputeMRR();
    logHistory("\uD83C\uDFAF Won the pitch \u2014 a " + fmt$(mrr) + "/mo retainer signed as a " + tier.name + ".");
    if(typeof toast === "function") toast("<b>Pitch won.</b> " + fmt$(mrr) + "/mo retainer.", "good");
  } else {
    logHistory("\uD83C\uDFAF Lost the pitch. Three weeks of spec work, no signature. That is the business.");
    if(typeof toast === "function") toast("Lost the pitch. They went with the incumbent.", "bad");
  }
  renderAll();
}

/* ---------------- UI ---------------- */
function v45Card(){
  var kind = v45Kind();
  if(!kind) return null;
  var st = v45S();
  var box = document.createElement("div");
  box.className = "v45-card";
  box.setAttribute("data-v45card", "1");
  var html = "";
  if(kind === "salon"){
    var chairs = st.units.reduce(function(s, u){ return s + u.chairs; }, 0);
    html += '<h3 style="margin:0 0 2px;">\uD83D\uDC85 Salons</h3>'
      + '<div class="muted" style="font-size:12px;">' + st.units.length + ' location(s) \u00b7 ' + chairs + ' station(s) \u00b7 last month net '
      + fmt$(st.lastNet || 0) + '. Stations only earn when a technician is in them \u2014 hire under <b>Services &amp; Menu</b>.</div>';
    html += st.units.map(function(u){
      return '<div class="v45-unit"><span><span class="nm">' + u.name + '</span><br><span class="mt">'
        + u.chairs + ' stations \u00b7 ' + (u.staffed || 0) + ' staffed \u00b7 rent ' + fmt$(u.rent) + '/mo</span></span>'
        + '<button class="btn secondary small" data-v45chair="' + u.id + '">Add station \u00b7 ' + fmt$(V45_SALON_CHAIR_COST) + '</button></div>';
    }).join("");
    html += '<div class="v45-row"><button class="btn" data-v45salon="1">Open another location \u00b7 ' + fmt$(V45_SALON_COST) + '</button></div>';
  } else if(kind === "fleet"){
    var driving = st.units.some(function(u){ return u.owner; });
    html += '<h3 style="margin:0 0 2px;">\uD83D\uDE9B Fleet</h3>'
      + '<div class="muted" style="font-size:12px;">' + st.units.length + ' truck(s) \u00b7 last month net ' + fmt$(st.lastNet || 0)
      + (driving ? ' \u00b7 <b>you are still driving.</b> Every hour in the seat is an hour not selling freight.' : ' \u00b7 you are in dispatch.') + '</div>';
    html += st.units.map(function(u){
      return '<div class="v45-unit"><span><span class="nm">' + u.name + '</span><br><span class="mt">'
        + (u.owner ? "driven by you" : (u.driver ? "company driver \u00b7 " + fmt$(V45_DRIVER_PAY) + "/mo" : "no driver"))
        + ' \u00b7 condition ' + Math.round(u.condition || 0) + '%' + (u.down ? ' \u00b7 in the shop' : '') + '</span></span>'
        + '<span class="flexrow" style="gap:6px;">'
        + (!u.owner && !u.driver ? '<button class="btn small" data-v45driver="' + u.id + '">Seat a driver</button>' : '')
        + '<button class="btn secondary small" data-v45service="' + u.id + '">Service</button></span></div>';
    }).join("");
    html += '<div class="v45-row"><button class="btn" data-v45truck="1">Buy a tractor \u00b7 ' + fmt$(V45_TRUCK_COST) + '</button>'
      + (driving ? '<button class="btn secondary" data-v45offtruck="1">Get off the truck \u00b7 hire a driver</button>' : '') + '</div>';
  } else if(kind === "agency"){
    var idx = v45TierIndex();
    var t = V45_TIERS[idx];
    var next = V45_TIERS[idx + 1];
    html += '<h3 style="margin:0 0 2px;">\uD83D\uDCE3 Agency standing</h3>'
      + '<div class="muted" style="font-size:12px;">You are a <b>' + t.name + '</b>. ' + t.note
      + (next ? ' Next: <b>' + next.name + '</b> at ' + fmt$(next.need) + ' in monthly billings (you are at ' + fmt$(Math.round(v45AgencyBillings())) + ').' : ' There is nothing above this.') + '</div>'
      + '<div class="v45-tier">' + V45_TIERS.map(function(x, i){ return '<span class="' + (i === idx ? "on" : "") + '">' + x.name + '</span>'; }).join("") + '</div>'
      + '<div class="v45-row"><button class="btn" data-v45pitch="1">Pitch a new account \u00b7 once a month</button></div>'
      + '<div class="muted" style="font-size:11.5px;margin-top:6px;">Retainer size scales with your standing \u2014 a ' + t.name
      + ' wins ' + t.mult.toFixed(2) + '\u00d7 what a freelancer does. Hire creatives to stop billing your own hours.</div>';
  }
  box.innerHTML = html;
  box.querySelectorAll("[data-v45chair]").forEach(function(b){ b.onclick = function(){ v45AddChair(b.getAttribute("data-v45chair")); }; });
  box.querySelectorAll("[data-v45salon]").forEach(function(b){ b.onclick = v45AddSalon; });
  box.querySelectorAll("[data-v45truck]").forEach(function(b){ b.onclick = v45BuyTruck; });
  box.querySelectorAll("[data-v45driver]").forEach(function(b){ b.onclick = function(){ v45HireDriver(b.getAttribute("data-v45driver")); }; });
  box.querySelectorAll("[data-v45service]").forEach(function(b){ b.onclick = function(){ v45Service(b.getAttribute("data-v45service")); }; });
  box.querySelectorAll("[data-v45offtruck]").forEach(function(b){ b.onclick = v45GetOffTruck; });
  box.querySelectorAll("[data-v45pitch]").forEach(function(b){ b.onclick = v45Pitch; });
  return box;
}
(function v45Mount(){
  try{
    if(typeof renderScreen !== "function") return;
    var prev = renderScreen;
    renderScreen = function(){
      var out = prev.apply(this, arguments);
      try{
        if(!G || !G.company || !v45Kind()) return out;
        v45Seed();
        var screen = document.getElementById("screen");
        if(!screen || screen.querySelector("[data-v45card]")) return out;
        var card = v45Card();
        if(!card) return out;
        var strip = screen.querySelector("[data-v44strip]");
        if(strip && strip.parentNode) strip.parentNode.insertBefore(card, strip.nextSibling);
        else screen.insertBefore(card, screen.firstChild);
      }catch(e){}
      return out;
    };
  }catch(e){}
})();

/* ---------------- monthly ---------------- */
(function v45MonthHook(){
  try{
    if(typeof advanceMonth !== "function") return;
    var prev = advanceMonth;
    advanceMonth = function(){
      var out = prev.apply(this, arguments);
      try{
        var kind = v45Kind();
        if(kind){
          v45Seed();
          if(kind === "salon") v45SalonMonth();
          else if(kind === "fleet") v45FleetMonth();
          else if(kind === "agency") v45AgencyMonth();
        }
      }catch(e){}
      return out;
    };
  }catch(e){}
})();

/* ------- honour the industry picked on the onboarding screen (it was hardcoded to SaaS) ------- */
(function v45PickIndustry(){
  try{
    if(typeof v44ApplyScenario !== "function") return;
    var prev = v44ApplyScenario;
    v44ApplyScenario = function(key){
      try{
        var want = window.__obIndustry;
        if(want && INDUSTRIES[want] && G && G.company && G.company.industry !== want){
          var c = G.company;
          c.industry = want;
          c.cash = INDUSTRIES[want].startCash;
          if(typeof opsInit === "function") c.ops = opsInit(want);
          c.v45 = null;
          if(typeof applyIndustryLabels === "function") applyIndustryLabels();
          if(G.playerMeta && G.playerMeta.unlockedIndustries && G.playerMeta.unlockedIndustries.indexOf(want) < 0){
            G.playerMeta.unlockedIndustries.push(want);
          }
          if(G.ui) G.ui.foundIndustry = want;
          logHistory("Founded as a " + INDUSTRIES[want].label + " with " + fmt$(INDUSTRIES[want].startCash) + " of your own savings.");
          v45Seed();
        }
      }catch(e){}
      return prev.apply(this, arguments);
    };
  }catch(e){}
})();

/* version chip */
(function v45Version(){
  try{
    if(typeof renderOnboard !== "function") return;
    var prev = renderOnboard;
    renderOnboard = function(){
      var out = prev.apply(this, arguments);
      try{
        var ob = document.getElementById("onboard");
        var vs = ob && ob.querySelector("h1 .muted");
        if(vs) vs.textContent = "v4.5";
      }catch(e){}
      return out;
    };
  }catch(e){}
})();
/* ================= v4.6 — client tiers, reputation, budgets, hustle ================= */
(function v46Css(){
  try{
    var s = document.createElement("style");
    s.textContent = `
    #dock{overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;}
    #dock::-webkit-scrollbar{width:6px;}
    #dock::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:3px;}
    .v46-rep{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-top:8px;}
    .v46-repcard{border:1px solid var(--border);border-radius:12px;padding:11px;background:var(--panel2);}
    .v46-repcard .lbl{font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;opacity:.65;}
    .v46-repcard .val{font-size:23px;font-weight:800;line-height:1.15;margin-top:2px;}
    .v46-repcard .tag{font-size:11.5px;font-weight:700;margin-top:1px;}
    .v46-repcard .sub{font-size:11px;opacity:.72;margin-top:4px;line-height:1.45;}
    .v46-bar{height:6px;border-radius:999px;background:rgba(255,255,255,.12);margin-top:7px;overflow:hidden;}
    .v46-bar i{display:block;height:100%;border-radius:999px;background:var(--good);}
    .v46-grp{border:1px solid var(--border);border-radius:11px;margin-top:9px;overflow:hidden;}
    .v46-grphead{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 11px;cursor:pointer;background:var(--panel2);flex-wrap:wrap;}
    .v46-grphead b{font-size:12.5px;}
    .v46-grphead .mt{font-size:11px;opacity:.7;}
    .v46-grpbody{padding:10px 11px;}
    .v46-powmsg{margin-top:9px;font-size:12.5px;color:var(--good);border-top:1px dashed var(--border);padding-top:8px;}
    `;
    document.head.appendChild(s);
  }catch(e){}
})();

/* ---------- 1. Four client tiers everywhere: Small / Mid-Market / Large / Enterprise ---------- */
var V46_TIERS = [
  { key:"Enterprise", min:9000 },
  { key:"Large",      min:2600 },
  { key:"Mid-Market", min:700 },
  { key:"Small",      min:0 }
];
try{
  clientSize = function(c){
    var m = (c && (c.mrr || c.monthlyValue || c.value)) || 0;
    for(var i=0;i<V46_TIERS.length;i++){ if(m >= V46_TIERS[i].min) return V46_TIERS[i].key; }
    return "Small";
  };
}catch(e){}
try{
  segmentMrrRange = function(segment){
    if(segment==="Enterprise") return [9000,22000];
    if(segment==="Large") return [2600,8500];
    if(segment==="Mid-Market") return [700,2400];
    return [250,650];
  };
  segmentNamePool = (function(prev){
    return function(segment){
      if(segment==="Large") return ["Crestline Logistics","Fairview Medical Group","Lakeshore Manufacturing","Summit Property Group","Redwood Industrial"];
      return prev.apply(this, arguments);
    };
  })(segmentNamePool);
  rollSegment = function(order){
    var r = Math.random();
    if(order==="enterprise") return r<0.34?"Enterprise":r<0.62?"Large":r<0.86?"Mid-Market":"Small";
    return r<0.48?"Small":r<0.78?"Mid-Market":r<0.94?"Large":"Enterprise";
  };
}catch(e){}
/* keep the v34 client book on the same thresholds so every screen agrees */
try{
  if(typeof V34_SEGMENTS !== "undefined"){
    V34_SEGMENTS.forEach(function(s){
      if(s.key==="enterprise"){ s.min = 9000; s.blurb = "Largest contracts, slowest to move"; }
      if(s.key==="large"){ s.min = 2600; s.blurb = "Big, but not household names"; }
      if(s.key==="midmarket"){ s.min = 700; s.blurb = "The volume engine"; }
      if(s.key==="small"){ s.min = 0; s.blurb = "High churn, low touch"; }
    });
  }
  if(typeof V32_SEGMENTS !== "undefined"){
    V32_SEGMENTS.forEach(function(s){
      if(s.key==="strategic"){ s.min = 9000; }
      if(s.key==="large"){ s.min = 2600; }
      if(s.key==="midmarket"){ s.min = 700; }
    });
  }
}catch(e){}

/* pricing now has a Large tier too */
function v46EnsurePricing(co){
  var c = co || G.company;
  if(!c) return;
  if(!c.pricing) c.pricing = {};
  ["Small","Mid-Market","Large","Enterprise"].forEach(function(k){
    if(typeof c.pricing[k] !== "number") c.pricing[k] = 1;
  });
}
try{
  renderPricingBucket = function(){
    var c = G.company;
    v46EnsurePricing(c);
    var segs = ["Small","Mid-Market","Large","Enterprise"];
    var notes = {
      "Small":"Hundreds of small logos. Price moves volume more than anything else.",
      "Mid-Market":"Your volume engine. Premium pricing here shows up fast in MRR and in churn.",
      "Large":"Real procurement, real contracts. Discounting wins the deal and haunts the renewal.",
      "Enterprise":"Committees, pilots and legal. Price is rarely why you lose \u2014 but premium sticks once signed."
    };
    var rows = segs.map(function(seg){
      var range = segmentMrrRange(seg);
      return '<div class="ladder-card"><div class="row"><div><div class="title">' + seg + ' pricing '
        + '<span class="muted" style="font-weight:400;font-size:11.5px;">' + fmt$(range[0]) + '\u2013' + fmt$(range[1]) + '/mo deals</span></div>'
        + '<div class="desc">' + notes[seg] + '</div></div>'
        + '<div class="radio-row">' + PRICE_TIERS.map(function(t){
            return '<span class="radio-chip ' + (Math.abs(c.pricing[seg]-t.key)<0.001?'sel':'') + '" data-price="' + seg + ':' + t.key + '">' + t.label + '</span>';
          }).join("") + '</div></div></div>';
    }).join("");
    return '<div class="dept-section"><div class="dept-header" data-toggledept="pricing"><b>\uD83D\uDCB2 Pricing Strategy</b><span class="muted">Set price posture per segment</span></div>'
      + '<div class="dept-body ' + (G.ui.openDept==='pricing'?'open':'') + '" id="deptbody_pricing">' + rows + '</div></div>';
  };
}catch(e){}

/* a Large Account Executive to sit between Mid-Market and Enterprise */
(function v46LargeAe(){
  try{
    if(typeof LADDERS === "undefined" || !LADDERS.sales) return;
    if(LADDERS.sales.rungs.some(function(r){ return r.key==="v46_large"; })) return;
    var rung = { key:"v46_large", label:"Large Account Executive", salaryRange:[12500,15500], icon:"\uD83C\uDFE2",
      desc:"Specialist on Large accounts \u2014 six-figure annual contracts, real procurement cycles." };
    function insert(ladder){
      if(!ladder || !ladder.sales) return;
      if(ladder.sales.rungs.some(function(r){ return r.key==="v46_large"; })) return;
      var i = ladder.sales.rungs.findIndex(function(r){ return r.key==="v43_ent"; });
      if(i < 0) i = ladder.sales.rungs.length;
      ladder.sales.rungs.splice(i, 0, JSON.parse(JSON.stringify(rung)));
    }
    insert(LADDERS);
    if(typeof BASE_LADDERS !== "undefined") insert(BASE_LADDERS);
    if(typeof V43_SPEC !== "undefined"){
      V43_SPEC.v46_large = { odds:0.30, min:2600, max:6400, label:"Large",
        pool:["Crestline Logistics","Redwood Industrial","Fairview Health Network","Summit Property Group"] };
      if(V43_SPEC.v43_ent){ V43_SPEC.v43_ent.odds = 0.16; V43_SPEC.v43_ent.min = 9000; V43_SPEC.v43_ent.max = 21000; }
      if(V43_SPEC.v43_mm){ V43_SPEC.v43_mm.max = 2400; }
    }
  }catch(e){}
})();

/* ---------- 2. Company and founder reputation ---------- */
function v46Rep(){
  var c = G.company;
  if(!c.v46rep) c.v46rep = { company:52, founder:48, lastCompany:52, lastFounder:48, notes:[] };
  return c.v46rep;
}
function v46RepBump(which, amount, why){
  try{
    var r = v46Rep();
    r[which] = clamp((r[which]||50) + amount, 0, 100);
    if(why) r.notes.push({ why:why, amount:amount, which:which });
    if(r.notes.length > 12) r.notes = r.notes.slice(-12);
  }catch(e){}
}
function v46RepTier(v){
  if(v >= 85) return { label:"Household name", color:"#22c55e" };
  if(v >= 70) return { label:"Well regarded", color:"#22c55e" };
  if(v >= 55) return { label:"Solid", color:"#eab308" };
  if(v >= 40) return { label:"Known, unproven", color:"#eab308" };
  if(v >= 22) return { label:"Shaky", color:"#f97316" };
  return { label:"Damaged", color:"#ef4444" };
}
function v46FounderTier(v){
  if(v >= 85) return { label:"Industry legend", color:"#22c55e" };
  if(v >= 70) return { label:"Sought-after operator", color:"#22c55e" };
  if(v >= 55) return { label:"Respected founder", color:"#eab308" };
  if(v >= 40) return { label:"Getting noticed", color:"#eab308" };
  if(v >= 22) return { label:"Unknown", color:"#f97316" };
  return { label:"Burned bridges", color:"#ef4444" };
}
function v46RepMonth(){
  var c = G.company, r = v46Rep();
  r.lastCompany = r.company; r.lastFounder = r.founder;
  var clients = c.clients || [];
  var health = clients.length ? clients.reduce(function(s,x){ return s + (x.health||60); }, 0) / clients.length : 60;
  var morale = (c.employees||[]).length ? (c.employees.reduce(function(s,e){ return s + (e.morale||70); }, 0) / c.employees.length) : 70;
  var scale = Math.min(18, Math.log10(Math.max(1, (c.mrr||0))) * 4);
  var target = clamp(health * 0.45 + morale * 0.2 + (c.successScore || 50) * 0.2 + scale, 0, 100);
  r.company = clamp(r.company + (target - r.company) * 0.25, 0, 100);
  var founderTarget = clamp(40 + Math.min(28, (c.founderActionsLifetime||0) * 0.8) + (r.company - 50) * 0.5
    + Math.min(20, ((c.valuation||0) / 5000000) * 10), 0, 100);
  r.founder = clamp(r.founder + (founderTarget - r.founder) * 0.2, 0, 100);
  var dc = Math.round(r.company - r.lastCompany);
  if(Math.abs(dc) >= 3){
    logHistory((dc > 0 ? "\u2B06\uFE0F" : "\u2B07\uFE0F") + " Company reputation " + (dc > 0 ? "rose" : "fell") + " to "
      + Math.round(r.company) + "/100 \u2014 " + v46RepTier(r.company).label.toLowerCase() + ".");
  }
}
function v46RepInboundBoost(){
  try{ return (v46Rep().company - 50) / 250; }catch(e){ return 0; }
}
function v46RepCard(){
  var r = v46Rep();
  var ct = v46RepTier(r.company), ft = v46FounderTier(r.founder);
  var box = el('<div class="card mt14" data-v46rep></div>');
  box.innerHTML = '<h3>\u2B50 Reputation</h3>'
    + '<div class="muted" style="font-size:11.5px;">Reputation moves slowly and follows client health, morale, profitability and scale. Company reputation lifts inbound demand; your personal reputation opens doors that the company has not earned yet.</div>'
    + '<div class="v46-rep">'
    + '<div class="v46-repcard"><div class="lbl">Company reputation</div><div class="val">' + Math.round(r.company) + '</div>'
      + '<div class="tag" style="color:' + ct.color + '">' + ct.label + '</div>'
      + '<div class="v46-bar"><i style="width:' + Math.round(r.company) + '%;background:' + ct.color + '"></i></div>'
      + '<div class="sub">Inbound demand ' + (v46RepInboundBoost() >= 0 ? "+" : "") + Math.round(v46RepInboundBoost()*100) + '% from reputation alone.</div></div>'
    + '<div class="v46-repcard"><div class="lbl">Your reputation</div><div class="val">' + Math.round(r.founder) + '</div>'
      + '<div class="tag" style="color:' + ft.color + '">' + ft.label + '</div>'
      + '<div class="v46-bar"><i style="width:' + Math.round(r.founder) + '%;background:' + ft.color + '"></i></div>'
      + '<div class="sub">Built by doing the work yourself \u2014 ' + ((G.company.founderActionsLifetime||0)) + ' founder move(s) so far.</div></div>'
    + '</div>';
  return box;
}

/* ---------- 3. Founder hustle that still matters at scale ---------- */
(function v46Hustle(){
  try{
    if(typeof v43RunPower !== "function" || typeof V43_POWER === "undefined") return;
    if(!V43_POWER.some(function(p){ return p.key === "v46_whale"; })){
      V43_POWER.push({ key:"v46_whale", label:"\uD83D\uDC0B Work a Strategic Account",
        desc:"Unlocks past $40k MRR. You personally run the executive relationship on a giant account \u2014 sized against how big you already are." });
    }
    var prev = v43RunPower;
    v43RunPower = function(key){
      var c = G.company;
      if(key === "v46_whale"){
        if(typeof v43PowerUsed === "function" && v43PowerUsed(key)) return;
        if((c.mrr||0) < 40000){
          if(typeof toast === "function") toast("Strategic accounts will not take your call until you are past $40k MRR.", "bad");
          return;
        }
        v43MarkPower(key);
        c.founderActionsLifetime = (c.founderActionsLifetime||0) + 1;
        var rep = v46Rep();
        var odds = clamp(0.26 + (rep.founder - 50) / 220 + (rep.company - 50) / 260, 0.12, 0.7);
        var msg;
        if(Math.random() < odds){
          var size = Math.round((c.mrr||0) * (rand(7, 14) / 100));
          c.clients.push({ id:uid(), name:pick(["Sovereign Holdings","Continental Grid","Meridian Industries","Atlas Freight","Halcyon Federal","Pinnacle Bank"]),
            mrr:size, health:rand(74, 92), sinceMonth:c.month, sinceYear:c.year });
          recomputeMRR();
          v46RepBump("founder", 3, "Closed a strategic account personally");
          v46RepBump("company", 2, "Strategic logo signed");
          c.successScore = clamp((c.successScore||50) + 2, 0, 100);
          msg = "You ran the relationship yourself all the way to signature \u2014 " + fmt$(size) + " MRR of strategic business. \uD83D\uDC0B";
        } else {
          v46RepBump("founder", 1, "Executive relationship built, no signature yet");
          msg = "Two dinners and a site visit. No signature yet, but you are now the founder they call directly.";
        }
        G.ui.v46PowerMsg = msg;
        logHistory(msg);
        if(typeof renderScreen === "function") renderScreen();
        return;
      }
      if(key === "v43_enterprise"){
        if(typeof v43PowerUsed === "function" && v43PowerUsed(key)) return;
        v43MarkPower(key);
        c.founderActionsLifetime = (c.founderActionsLifetime||0) + 1;
        var r2 = v46Rep();
        var odds2 = clamp(0.3 + (r2.founder - 50) / 250, 0.15, 0.62);
        var m2;
        if(Math.random() < odds2){
          /* scales with the company so door-knocking never becomes pointless */
          var big = Math.max(rand(2800, 7500), Math.round((c.mrr||0) * (rand(4, 9) / 100)));
          c.clients.push({ id:uid(), name:pick(["Meridian Industries","Halcyon Federal","Continental Grid","Atlas Freight","Pinnacle Bank"]),
            mrr:big, health:rand(72, 90), sinceMonth:c.month, sinceYear:c.year });
          recomputeMRR();
          v46RepBump("founder", 2, "Founder-led enterprise win");
          m2 = "You got past procurement yourself \u2014 enterprise contract signed at " + fmt$(big) + " MRR. \uD83C\uDFDB\uFE0F";
        } else {
          m2 = "Three meetings, two committees, no signature. Enterprise takes time \u2014 try again next month.";
        }
        G.ui.v46PowerMsg = m2;
        logHistory(m2);
        if(typeof renderScreen === "function") renderScreen();
        return;
      }
      var out = prev.apply(this, arguments);
      try{
        if(G.ui.founderMsg){
          G.ui.v46PowerMsg = G.ui.founderMsg;
          G.ui.founderMsg = null;
          if(key === "v43_keynote") v46RepBump("founder", 2, "Keynoted a conference");
          if(key === "v43_roundup"){ v46RepBump("company", -2, "Aggressive collections"); }
          if(typeof renderScreen === "function") renderScreen();
        }
      }catch(e){}
      return out;
    };
  }catch(e){}
})();

/* ---------- 4. Department budgets set by the department head ---------- */
function v46DeptBudgets(){
  var c = G.company;
  if(!c.v46budgets) c.v46budgets = {};
  return c.v46budgets;
}
function v46DeptHead(dept){
  var emps = (G.company.employees||[]).filter(function(e){ return e.dept === dept; });
  var order = ["cro","cmo","cpo","cfo","coo","chro","cco","vp","director","manager"];
  for(var i=0;i<order.length;i++){
    var hit = emps.find(function(e){ return e.rung === order[i]; });
    if(hit) return hit;
  }
  return null;
}
function v46DeptPayroll(dept){
  return (G.company.employees||[]).filter(function(e){ return e.dept === dept; })
    .reduce(function(s,e){ return s + (e.salary||0); }, 0);
}
function v46SetDeptBudget(dept){
  var head = v46DeptHead(dept);
  if(!head){
    if(typeof v30Toast === "function") v30Toast("Hire a manager or above in that department first \u2014 heads set their own budget.", "warn");
    return;
  }
  var spend = v46DeptPayroll(dept);
  var base = Math.max(5000, spend || 20000);
  var label = (typeof LADDERS !== "undefined" && LADDERS[dept] && LADDERS[dept].label) ? LADDERS[dept].label : dept;
  if(typeof v30AmountDialog !== "function") return;
  v30AmountDialog({
    title: "Budget \u2014 " + label,
    subtitle: head.name + " runs this department. Monthly payroll cap they are held to. Current spend " + fmt$(spend) + ".",
    presets:[
      { label:"Freeze at today", value:base },
      { label:"+10%", value:Math.round(base*1.1) },
      { label:"+25%", value:Math.round(base*1.25) },
      { label:"+50%", value:Math.round(base*1.5) },
      { label:"Cut 15%", value:Math.round(base*0.85) }
    ],
    suggested: v46DeptBudgets()[dept] || base,
    hint:"A department over its budget at month close gets flagged, and the head takes a performance hit.",
    onPick:function(amt){
      v46DeptBudgets()[dept] = Math.max(0, Math.round(amt));
      logHistory(head.name + " set the " + label + " budget at " + fmt$(Math.round(amt)) + "/mo.");
      if(typeof v30Toast === "function") v30Toast("<b>Budget set.</b> " + label + " capped at " + fmt$(Math.round(amt)) + "/mo.", "good");
      try{ renderAll(); }catch(e){}
    }
  });
}
function v46BudgetCheck(){
  try{
    var budgets = v46DeptBudgets();
    Object.keys(budgets).forEach(function(dept){
      var cap = budgets[dept];
      if(!cap) return;
      var spend = v46DeptPayroll(dept);
      if(spend > cap){
        var head = v46DeptHead(dept);
        var label = (typeof LADDERS !== "undefined" && LADDERS[dept] && LADDERS[dept].label) ? LADDERS[dept].label : dept;
        if(head) head.performance = clamp((head.performance||70) - rand(2,5), 0, 100);
        logHistory("\uD83D\uDCCB " + label + " closed the month " + fmt$(spend - cap) + " over budget"
          + (head ? " \u2014 " + head.name + " is on the hook for it." : "."));
      }
    });
  }catch(e){}
}

/* ---------- 5. Division P&L: collapsible, grouped by department ---------- */
function v46DivisionCard(){
  var rows = (typeof v33DivRows === "function") ? v33DivRows() : [];
  var box = el('<div class="card mt14" data-v33divbox data-v46divbox></div>');
  if(!G.ui.v46div) G.ui.v46div = { open:false, depts:{} };
  var st = G.ui.v46div;
  var totalRev = rows.reduce(function(s,r){ return s + r.rev; }, 0);
  var totalCost = rows.reduce(function(s,r){ return s + r.cost; }, 0);
  var byDept = {};
  rows.forEach(function(r){ (byDept[r.dept] = byDept[r.dept] || []).push(r); });
  var depts = Object.keys(byDept);
  var head = '<h3 class="clickable" data-v46divtoggle style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;">'
    + '<span>' + (st.open ? "\u25BE" : "\u25B8") + ' \uD83D\uDCCA Division P&amp;L</span>'
    + '<span class="muted" style="font-size:11.5px;font-weight:400;">' + fmt$(totalRev) + ' rev \u00b7 ' + fmt$(totalCost) + ' payroll \u00b7 net ' + fmt$(totalRev - totalCost) + '</span></h3>';
  if(!rows.length){
    box.innerHTML = head + (st.open ? '<div class="muted" style="font-size:12px;">Hire into a department to open its divisions. VPs get measured on the numbers below.</div>' : "");
  } else {
    var body = "";
    if(st.open){
      body += '<div class="muted" style="font-size:11.5px;margin-bottom:4px;">Revenue is attributed to sales, marketing and product by headcount and performance; everything else is a cost centre. Open a department to see its divisions.</div>';
      body += depts.map(function(dept){
        var list = byDept[dept];
        var dRev = list.reduce(function(s,r){ return s + r.rev; }, 0);
        var dCost = list.reduce(function(s,r){ return s + r.cost; }, 0);
        var dStaff = list.reduce(function(s,r){ return s + r.staff; }, 0);
        var label = (typeof LADDERS !== "undefined" && LADDERS[dept] && LADDERS[dept].label) ? LADDERS[dept].label : dept;
        var open = !!st.depts[dept];
        var cap = v46DeptBudgets()[dept] || 0;
        var over = cap > 0 && dCost > cap;
        var headEmp = v46DeptHead(dept);
        var inner = "";
        if(open){
          inner = '<div class="v46-grpbody">'
            + '<div class="v33-kv"><span class="muted">Department head</span><span>' + (headEmp ? headEmp.name : "\u2014 vacant") + '</span></div>'
            + '<div class="v33-kv"><span class="muted">Department budget</span><span style="color:' + (over ? "#ef4444" : "inherit") + '">' + (cap ? fmt$(cap) + "/mo" + (over ? " \u00b7 over" : "") : "none set") + '</span></div>'
            + '<div class="flexrow mt8" style="gap:6px;"><button class="btn secondary small" data-v46deptbudget="' + dept + '">'
              + (headEmp ? "Let " + headEmp.name.split(" ")[0] + " set the budget" : "Set department budget") + '</button></div>'
            + '<div class="v33-div" style="margin-top:10px;">'
            + list.map(function(r){
                return '<div class="v33-divcard">'
                  + '<div class="flexrow" style="justify-content:space-between;align-items:flex-start;"><h4>' + r.div + '</h4>'
                  + '<span class="v33-flag ' + (r.over ? "v33-over" : "v33-ok") + '">' + (r.over ? "Over budget" : "On budget") + '</span></div>'
                  + '<div class="muted" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;">' + r.staff + ' people</div>'
                  + '<div class="v33-kv"><span class="muted">VP</span><span>' + (r.vp ? r.vp.name : "\u2014 vacant") + '</span></div>'
                  + (r.revenueCentre ? '<div class="v33-kv"><span class="muted">Revenue</span><span>' + fmt$(r.rev) + '/mo</span></div>' : "")
                  + '<div class="v33-kv"><span class="muted">Payroll</span><span>' + fmt$(r.cost) + '/mo</span></div>'
                  + '<div class="v33-kv"><span class="muted">' + (r.revenueCentre ? "Margin" : "Net cost") + '</span><span style="color:' + (r.margin >= 0 ? "#22c55e" : "#ef4444") + ';font-weight:700;">' + fmt$(r.margin) + '/mo</span></div>'
                  + '<div class="v33-kv"><span class="muted">Division budget</span><span>' + (r.budget ? fmt$(r.budget) + "/mo" : "none set") + '</span></div>'
                  + '<div class="flexrow mt8" style="gap:6px;"><button class="btn secondary small" data-v33budget="' + r.dept + '|' + r.div + '">Set budget</button>'
                  + (r.vp ? '<button class="btn secondary small" data-v33firevp="' + r.dept + '|' + r.div + '">Replace VP</button>' : "")
                  + '</div></div>';
              }).join("")
            + '</div></div>';
        }
        return '<div class="v46-grp"><div class="v46-grphead" data-v46dept="' + dept + '">'
          + '<b>' + (open ? "\u25BE" : "\u25B8") + ' ' + label + '</b>'
          + '<span class="mt">' + list.length + ' division(s) \u00b7 ' + dStaff + ' people \u00b7 ' + (dRev ? fmt$(dRev) + " rev \u00b7 " : "") + fmt$(dCost) + ' payroll'
          + (over ? ' \u00b7 <b style="color:#ef4444;">over budget</b>' : (cap ? ' \u00b7 within budget' : '')) + '</span>'
          + '</div>' + inner + '</div>';
      }).join("");
    }
    box.innerHTML = head + body;
  }
  var tog = box.querySelector("[data-v46divtoggle]");
  if(tog) tog.onclick = function(){ st.open = !st.open; try{ renderScreen(); }catch(e){} };
  box.querySelectorAll("[data-v46dept]").forEach(function(b){
    b.onclick = function(){
      var d = b.getAttribute("data-v46dept");
      st.depts[d] = !st.depts[d];
      try{ renderScreen(); }catch(e){}
    };
  });
  box.querySelectorAll("[data-v46deptbudget]").forEach(function(b){
    b.onclick = function(){ v46SetDeptBudget(b.getAttribute("data-v46deptbudget")); };
  });
  box.querySelectorAll("[data-v33budget]").forEach(function(b){
    b.onclick = function(){
      var parts = (b.getAttribute("data-v33budget")||"").split("|");
      if(typeof v33SetBudget === "function") v33SetBudget(parts[0], parts[1]);
    };
  });
  box.querySelectorAll("[data-v33firevp]").forEach(function(b){
    b.onclick = function(){
      var parts = (b.getAttribute("data-v33firevp")||"").split("|");
      if(typeof v33FireVp === "function") v33FireVp(parts[0], parts[1]);
    };
  });
  return box;
}
try{ v33DivisionCard = v46DivisionCard; }catch(e){}

/* ---------- 6. Mounting ---------- */
(function v46Mount(){
  try{
    if(typeof renderScreen !== "function") return;
    var prev = renderScreen;
    renderScreen = function(){
      var out = prev.apply(this, arguments);
      try{
        v46EnsurePricing();
        var host = document.getElementById("screen");
        if(!host) return out;
        /* power play result line belongs inside the Power Plays card */
        var powBtn = host.querySelector("[data-v43hustle]");
        if(powBtn && G.ui.v46PowerMsg){
          var card = powBtn.closest(".card");
          if(card && !card.querySelector("[data-v46powmsg]")){
            var line = document.createElement("div");
            line.className = "v46-powmsg";
            line.setAttribute("data-v46powmsg", "1");
            line.innerHTML = G.ui.v46PowerMsg;
            card.appendChild(line);
          }
        }
        /* strategic account button stays disabled until it is real */
        host.querySelectorAll('[data-v43hustle="v46_whale"]').forEach(function(b){
          if((G.company.mrr||0) < 40000){
            b.disabled = true;
            if(b.textContent.indexOf("$40k") < 0) b.textContent = b.textContent + " \u2014 unlocks at $40k MRR";
          }
        });
        var tab = G.ui.activeTab;
        if((tab === "dashboard" || tab === "company" || tab === "financials" || tab === "empire") && !host.querySelector("[data-v46rep]")){
          host.appendChild(v46RepCard());
        }
      }catch(e){}
      return out;
    };
  }catch(e){}
})();

(function v46MonthHook(){
  try{
    if(typeof advanceMonth !== "function") return;
    var prev = advanceMonth;
    advanceMonth = function(){
      var out = prev.apply(this, arguments);
      try{
        v46RepMonth();
        v46BudgetCheck();
        G.ui.v46PowerMsg = null;
      }catch(e){}
      return out;
    };
  }catch(e){}
})();

/* reputation feeds inbound demand */
(function v46Inbound(){
  try{
    if(typeof marketingBoost !== "function") return;
    var prev = marketingBoost;
    marketingBoost = function(){
      var base = prev.apply(this, arguments) || 0;
      try{ return base + v46RepInboundBoost(); }catch(e){ return base; }
    };
  }catch(e){}
})();

(function v46Normalize(){
  try{
    if(typeof normalizeGame !== "function") return;
    var prev = normalizeGame;
    normalizeGame = function(state){
      var s = prev.apply(this, arguments) || state;
      try{
        var cos = (s && s.companies) ? Object.keys(s.companies).map(function(k){ return s.companies[k]; }) : [];
        cos.forEach(function(c){
          if(!c) return;
          if(!c.v46rep) c.v46rep = { company:52, founder:48, lastCompany:52, lastFounder:48, notes:[] };
          if(!c.v46budgets) c.v46budgets = {};
          if(!c.pricing) c.pricing = {};
          ["Small","Mid-Market","Large","Enterprise"].forEach(function(k){
            if(typeof c.pricing[k] !== "number") c.pricing[k] = 1;
          });
        });
      }catch(e){}
      return s;
    };
  }catch(e){}
})();

/* version chip */
(function v46Version(){
  try{
    if(typeof renderOnboard !== "function") return;
    var prev = renderOnboard;
    renderOnboard = function(){
      var out = prev.apply(this, arguments);
      try{
        var ob = document.getElementById("onboard");
        var vs = ob && ob.querySelector("h1 .muted");
        if(vs) vs.textContent = "v4.6";
      }catch(e){}
      return out;
    };
  }catch(e){}
})();
