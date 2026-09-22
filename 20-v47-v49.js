/* ============ v4.7 — save recovery + storage diagnostics ============ */
(function v472Recover(){
  try{
    var PREFIX = (typeof LS_PREFIX === "string") ? LS_PREFIX : "besim2_";
    var IDX = (typeof LS_SLOTS_INDEX === "string") ? LS_SLOTS_INDEX : PREFIX + "slots_index";

    function storageOk(){
      try{ localStorage.setItem(PREFIX+"__t","1"); localStorage.removeItem(PREFIX+"__t"); return true; }
      catch(e){ return false; }
    }
    window.v472StorageOk = storageOk;

    /* Every key that looks like a saved run, whether or not the index knows about it. */
    function rawSlotKeys(){
      var out = [];
      try{
        for(var i=0;i<localStorage.length;i++){
          var k = localStorage.key(i);
          if(!k) continue;
          if(k === IDX) continue;
          if(k.indexOf("slot") === -1 && k.indexOf("autosave") === -1) continue;
          var raw = localStorage.getItem(k);
          if(!raw || raw.charAt(0) !== "{") continue;
          var st = null;
          try{ st = JSON.parse(raw); }catch(e){ continue; }
          var co = st && (st.company || (st.companies && st.companies[0]));
          if(!st || (!co && !st.meta)) continue;
          out.push({ key:k, state:st, co:co||{} });
        }
      }catch(e){}
      return out;
    }
    window.v472RawSlotKeys = rawSlotKeys;

    /* Rebuild the slot index from whatever is actually in storage. */
    window.v472Rescan = function(){
      var found = rawSlotKeys();
      var idx = [];
      try{ idx = JSON.parse(localStorage.getItem(IDX) || "[]") || []; }catch(e){ idx = []; }
      var known = {};
      idx.forEach(function(s){ if(s && s.key) known[s.key] = true; });
      var added = 0;
      found.forEach(function(f){
        if(known[f.key]) return;
        var nm = (f.co && f.co.name) || (f.state.meta && f.state.meta.name) || "Recovered run";
        idx.push({ key:f.key, label:nm, savedAt: (f.state.savedAt || Date.now()),
          month: f.co.month || 1, year: f.co.year || 1, cash: f.co.cash || 0 });
        added++;
      });
      /* drop index entries whose data is missing */
      var before = idx.length;
      idx = idx.filter(function(s){ try{ return s && s.key && localStorage.getItem(s.key); }catch(e){ return false; } });
      var pruned = before - idx.length;
      try{ localStorage.setItem(IDX, JSON.stringify(idx)); }catch(e){}
      return { found: found.length, added: added, pruned: pruned, total: idx.length };
    };

    /* Run the rescan once at boot, before the start screen paints. */
    try{ window.__v472boot = window.v472Rescan(); }catch(e){}

    /* ---- Start screen: never show nothing. Explain what storage sees. ---- */
    try{
      var css = document.createElement("style");
      css.textContent = ".v472-diag{border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin:0 0 14px;"
        + "background:var(--panel2);font-size:12px;line-height:1.5;}"
        + ".v472-diag .hd{font-size:11px;text-transform:uppercase;letter-spacing:.05em;opacity:.7;margin-bottom:4px;}"
        + ".v472-diag .row{opacity:.8;}"
        + ".v472-diag button{margin-top:8px;width:100%;}";
      document.head.appendChild(css);
    }catch(e){}

    if(typeof renderOnboard === "function"){
      var prev = renderOnboard;
      renderOnboard = function(){
        var out = prev.apply(this, arguments);
        try{
          var ob = document.getElementById("onboard");
          var card = ob && ob.querySelector(".ob-card");
          if(!card) return out;
          if(card.querySelector(".v472-diag")) return out;
          /* only when the save block did not render */
          if(card.querySelector(".v27-resume") || card.querySelector("[data-v43saves]")) return out;

          var ok = storageOk();
          var raw = ok ? rawSlotKeys() : [];
          var box = document.createElement("div");
          box.className = "v472-diag";
          var body;
          if(!ok){
            body = '<div class="hd">\u26A0\uFE0F Browser storage is blocked here</div>'
              + '<div class="row">This embed cannot read or write saved games, so nothing can be listed. '
              + 'Your old runs are not deleted \u2014 they belong to whichever browser and embed you played in. '
              + 'Open that copy, use <b>Save Games \u2192 Copy save code</b>, then paste the code here.</div>';
          } else if(raw.length){
            body = '<div class="hd">\uD83D\uDCBE ' + raw.length + ' save(s) recovered</div>'
              + '<div class="row">Saved runs were found in storage but were missing from the save list. '
              + 'Reopening the start screen now.</div>';
          } else {
            body = '<div class="hd">\uD83D\uDCBE No saved games in this copy</div>'
              + '<div class="row">This build\u2019s browser storage is working, but it is empty \u2014 so there is nothing to Continue or Load. '
              + 'Saves live in the browser, per copy of the game, so a freshly uploaded build starts with an empty list. '
              + '<b>Nothing was deleted.</b> To bring a run over, open the copy you were playing, go to '
              + '<b>Save Games \u2192 Copy save code</b>, then paste that code below.</div>'
              + '<button class="btn secondary small" data-v472scan="1">Scan storage again</button>';
          }
          box.innerHTML = body;

          var sub = card.querySelector("p.sub") || card.querySelector("h1");
          if(sub && sub.parentNode) sub.parentNode.insertBefore(box, sub.nextSibling);
          else card.insertBefore(box, card.firstChild);

          var btn = box.querySelector("[data-v472scan]");
          if(btn) btn.onclick = function(){
            var r = window.v472Rescan();
            if(r.found){ renderOnboard(); }
            else alert("Scanned this browser's storage for this game: no saved runs found.\n\n"
              + "Saves are stored per copy of the game, so a newly uploaded build starts empty. "
              + "Open the copy you were playing and use Save Games \u2192 Copy save code, then paste it here.");
          };

          if(raw.length){ setTimeout(function(){ try{ window.v472Rescan(); renderOnboard(); }catch(e){} }, 0); }
        }catch(e){}
        return out;
      };
      try{ window.renderOnboard = renderOnboard; }catch(e){}
    }
  }catch(e){}
})();
/* =====================================================================
   v4.8 — THE SAVE SYSTEM, REBUILT
   Why saves kept vanishing:
   1. Seven patches each wrapped saveToSlot/listSlots/loadSlot, and three
      kept their OWN private in-memory fallback. A write could land in one
      and a read look in another. Race to the Harbor has ONE key and ONE
      save()/load() pair - that is the whole difference.
   2. Saves are keyed to the exact embed URL. Every upload of a new build
      gets a NEW address = a NEW, EMPTY bucket. That is why the save is
      gone the morning after every version ships.
   Fix: ONE manager (NBSave); an IndexedDB mirror; and save FILES, which
   do not depend on the browser and survive every future upload.
   ===================================================================== */
(function NBSaveSystem(){
  "use strict";
  var NS = "nbsave1_", IDX = NS + "index", AUTO = NS + "slot_auto", LEGACY_P = "besim2_";
  var MEM = {}, MODE = "unknown";

  function hasGame(){ try{ return typeof G !== "undefined" && !!G && !!G.company; }catch(e){ return false; } }
  function diskOk(){ try{ localStorage.setItem(NS+"__p","1"); localStorage.removeItem(NS+"__p"); return true; }catch(e){ return false; } }
  MODE = diskOk() ? "disk" : "memory";

  function rawGet(k){
    if(MODE === "disk"){ try{ var v = localStorage.getItem(k); if(v !== null) return v; }catch(e){} }
    return Object.prototype.hasOwnProperty.call(MEM,k) ? MEM[k] : null;
  }
  function rawSet(k,v){
    MEM[k] = v;
    if(MODE === "disk"){
      try{ localStorage.setItem(k,v); }
      catch(e){ MODE = "memory"; nbToast("Browser storage is full or blocked. This run is in memory only \u2014 use <b>Download save file</b> before closing the tab.", "bad"); }
    }
  }
  function rawDel(k){ delete MEM[k]; try{ localStorage.removeItem(k); }catch(e){} }
  function rawKeys(){
    var out = Object.keys(MEM);
    try{ for(var i=0;i<localStorage.length;i++){ var k = localStorage.key(i); if(k && out.indexOf(k) < 0) out.push(k); } }catch(e){}
    return out;
  }

  var IDB = null;
  try{
    var req = indexedDB.open("navigating_business", 1);
    req.onupgradeneeded = function(ev){ var db = ev.target.result; if(!db.objectStoreNames.contains("saves")) db.createObjectStore("saves"); };
    req.onsuccess = function(ev){ IDB = ev.target.result; idbSweep(); };
  }catch(e){}
  function idbPut(k,t){ if(!IDB) return; try{ IDB.transaction("saves","readwrite").objectStore("saves").put(t,k); }catch(e){} }
  function idbDel(k){ if(!IDB) return; try{ IDB.transaction("saves","readwrite").objectStore("saves").delete(k); }catch(e){} }
  function idbSweep(){
    if(!IDB) return;
    try{
      var st = IDB.transaction("saves","readonly").objectStore("saves");
      if(!st.getAllKeys) return;
      var kr = st.getAllKeys();
      kr.onsuccess = function(){
        var keys = kr.result || [], pending = keys.length, rec = 0;
        if(!pending) return;
        keys.forEach(function(k){
          var g = IDB.transaction("saves","readonly").objectStore("saves").get(k);
          g.onsuccess = function(){
            if(g.result && rawGet(k) === null){ rawSet(k, g.result); rec++; }
            if(--pending === 0 && rec){
              rebuildIndex();
              try{ var ob = document.getElementById("onboard");
                   if(ob && ob.style.display !== "none" && typeof renderOnboard === "function") renderOnboard(); }catch(e){}
            }
          };
          g.onerror = function(){ if(--pending === 0 && rec) rebuildIndex(); };
        });
      };
    }catch(e){}
  }

  function readIdx(){ try{ var a = JSON.parse(rawGet(IDX) || "[]"); return Array.isArray(a) ? a : []; }catch(e){ return []; } }
  function writeIdx(a){ rawSet(IDX, JSON.stringify(a)); }
  function describe(key, state, label){
    var co = (state && (state.company || (state.companies && state.companies[0]))) || {};
    return { key:key, label: label || co.name || "Saved game", savedAt: Date.now(), month: co.month || 1, year: co.year || 1, cash: co.cash || 0 };
  }
  function looksLikeSave(raw){
    if(!raw || raw.charAt(0) !== "{" || raw.length < 120) return null;
    var st = null;
    try{ st = JSON.parse(raw); }catch(e){ return null; }
    if(!st || typeof st !== "object") return null;
    if(!st.company && !(st.companies && st.companies.length)) return null;
    return st;
  }
  function rebuildIndex(){
    var idx = readIdx(), known = {}, added = 0;
    idx.forEach(function(s){ if(s && s.key) known[s.key] = true; });
    rawKeys().forEach(function(k){
      if(k === IDX || known[k]) return;
      var st = looksLikeSave(rawGet(k));
      if(!st) return;
      var e2 = describe(k, st, null);
      if(k.indexOf("auto") >= 0) e2.label = "\uD83D\uDD04 " + e2.label + " (autosave)";
      else if(k.indexOf(LEGACY_P) === 0) e2.label = e2.label + " \u2014 recovered";
      try{ if(st.meta && st.meta.savedAt) e2.savedAt = st.meta.savedAt; }catch(e){}
      idx.push(e2); known[k] = true; added++;
    });
    idx = idx.filter(function(s){ return s && s.key && rawGet(s.key) !== null; });
    writeIdx(idx);
    return { added: added, total: idx.length };
  }

  var NBSave = {
    mode: function(){ return MODE; },
    list: function(){ return readIdx().slice().sort(function(a,b){ return (b.savedAt||0) - (a.savedAt||0); }); },
    save: function(state, key, label){
      if(!state) return false;
      key = key || (NS + "slot_" + Date.now());
      try{ state.meta = state.meta || {}; state.meta.savedAt = Date.now(); state.meta.gameVersion = "v4.8"; }catch(e){}
      var text;
      try{ text = JSON.stringify(state); }catch(e){ nbToast("This run could not be written to a save. Nothing lost \u2014 keep playing.", "bad"); return false; }
      rawSet(key, text); idbPut(key, text);
      var idx = readIdx().filter(function(s){ return s && s.key !== key; });
      idx.push(describe(key, state, label)); writeIdx(idx);
      if(rawGet(key) === null){ nbToast("Save failed to write. Use <b>Download save file</b> \u2014 that always works.", "bad"); return false; }
      return true;
    },
    load: function(key){ var r = rawGet(key); if(r === null) return null; try{ return JSON.parse(r); }catch(e){ return null; } },
    remove: function(key){ rawDel(key); idbDel(key); writeIdx(readIdx().filter(function(s){ return s && s.key !== key; })); },
    autoKey: function(){ return AUTO; },
    rescan: rebuildIndex,
    toFile: function(state){
      var co = (state && state.company) || {};
      var name = (co.name || "run").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
      var blob = new Blob([JSON.stringify({ __nbsave:1, version:"v4.8", savedAt:Date.now(), state:state })], { type:"application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "navbiz_" + name + "_y" + (co.year||1) + "m" + (co.month||1) + ".nbsave";
      document.body.appendChild(a); a.click();
      setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    },
    fromFile: function(file, done){
      var r = new FileReader();
      r.onload = function(){
        var parsed = null;
        try{ parsed = JSON.parse(r.result); }catch(e){}
        if(!parsed){ done(null, "That file is not readable as a save."); return; }
        var state = parsed.__nbsave ? parsed.state : parsed;
        if(!state || (!state.company && !state.companies)){ done(null, "That file does not contain a saved run."); return; }
        done(state, null);
      };
      r.onerror = function(){ done(null, "The file could not be read."); };
      r.readAsText(file);
    }
  };
  window.NBSave = NBSave;

  function nbToast(msg, kind){
    try{ if(typeof toast === "function") return toast(msg, kind || ""); }catch(e){}
    try{ console.log("[v4.8]", msg); }catch(e){}
  }

  try{ saveToSlot = function(s,k,l){ return NBSave.save(s,k,l); }; window.saveToSlot = saveToSlot; }catch(e){}
  try{ listSlots  = function(){ return NBSave.list(); };  window.listSlots  = listSlots; }catch(e){}
  try{ loadSlot   = function(k){ return NBSave.load(k); }; window.loadSlot   = loadSlot; }catch(e){}
  try{ deleteSlot = function(k){ return NBSave.remove(k); }; window.deleteSlot = deleteSlot; }catch(e){}
  try{ if(typeof v27AutosaveKey !== "undefined") v27AutosaveKey = function(){ return AUTO; }; }catch(e){}
  try{ window.v472Rescan = function(){ var r = rebuildIndex(); return { found:r.total, added:r.added, pruned:0, total:r.total }; }; }catch(e){}

  function applyState(state, src){
    try{
      if(typeof window.v471RepairState === "function") window.v471RepairState(state);
      G = (typeof normalizeGame === "function") ? normalizeGame(state) : state;
      if(typeof applyIndustryLabels === "function") applyIndustryLabels();
      var ob = document.getElementById("onboard");
      if(ob) ob.style.display = "none";
      if(typeof renderAll === "function") renderAll();
      nbToast("Loaded \u2014 " + (src || "saved game") + ".", "good");
      return true;
    }catch(err){
      try{ console.error("[v4.8] load failed", err); }catch(e){}
      alert("That save could not be opened.\n\n" + ((err && err.message) || err) + "\n\nNothing was deleted.");
      return false;
    }
  }
  window.nbLoadState = applyState;
  window.nbLoadKey = function(key){
    var st = NBSave.load(key);
    if(!st){ alert("That save slot is empty.\n\nIf you have a .nbsave file, use Restore instead."); NBSave.rescan(); return false; }
    return applyState(st, "saved game");
  };
  try{ window.v471LoadKey = window.nbLoadKey; window.v27LoadKey = window.nbLoadKey; }catch(e){}

  try{ window.__nbBoot = rebuildIndex(); }catch(e){}

  function autosave(){
    try{ if(!hasGame()) return; NBSave.save(G, AUTO, "\uD83D\uDD04 Autosave \u2014 " + (G.company.name || "current run")); }catch(e){}
  }
  window.nbAutosave = autosave;
  try{ if(typeof advanceMonth === "function"){ var pa = advanceMonth; advanceMonth = function(){ var r = pa.apply(this, arguments); autosave(); return r; }; } }catch(e){}
  window.addEventListener("pagehide", autosave);
  document.addEventListener("visibilitychange", function(){ if(document.visibilityState === "hidden") autosave(); });

  try{
    var css = document.createElement("style");
    css.textContent =
      ".nb-saves{border:1px solid var(--border);border-radius:12px;padding:12px;margin:0 0 14px;background:var(--panel2);}"
    + ".nb-saves .hd{font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.7;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:8px;}"
    + ".nb-saves .mode{font-weight:600;} .nb-saves .mode.ok{color:#22c55e;} .nb-saves .mode.warn{color:#f97316;}"
    + ".nb-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 0;border-top:1px solid var(--border);}"
    + ".nb-row .meta{font-size:11px;opacity:.65;display:block;}"
    + ".nb-saves .tools{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;}"
    + ".nb-note{font-size:11.5px;line-height:1.5;opacity:.85;margin-top:8px;}"
    + ".nb-drop{border:1px dashed var(--border);border-radius:10px;padding:10px;text-align:center;font-size:12px;opacity:.75;margin-top:8px;}"
    + ".nb-drop.over{border-color:#22c55e;opacity:1;}";
    document.head.appendChild(css);
  }catch(e){}

  function fmtCash(n){ try{ return typeof fmt$ === "function" ? fmt$(n||0) : ("$" + Math.round(n||0).toLocaleString()); }catch(e){ return ""; } }

  function buildSaveBlock(){
    var slots = NBSave.list();
    var box = document.createElement("div");
    box.className = "nb-saves"; box.setAttribute("data-nbsaves","1");
    var modeTxt = MODE === "disk" ? '<span class="mode ok">Storage OK</span>' : '<span class="mode warn">Storage blocked here</span>';
    var html = '<div class="hd"><span>\uD83D\uDCBE Saved games (' + slots.length + ')</span>' + modeTxt + '</div>';
    if(slots.length){
      var n0 = slots[0];
      html += '<button class="btn" style="width:100%;margin-bottom:8px;" data-nbcont="' + n0.key + '">\u25B6 Continue \u2014 ' + n0.label + ' \u00b7 Y' + n0.year + ' M' + n0.month + '</button>';
      html += slots.map(function(s){
        return '<div class="nb-row"><span>' + s.label + '<span class="meta">Y' + s.year + ' M' + s.month + ' \u00b7 ' + fmtCash(s.cash) + '</span></span>'
             + '<span class="flexrow"><button class="btn secondary small" data-nbload="' + s.key + '">Load</button>'
             + '<button class="btn secondary small" data-nbfile="' + s.key + '" title="Download this run as a file">\u2B07</button>'
             + '<button class="btn danger small" data-nbdel="' + s.key + '">&times;</button></span></div>';
      }).join("");
    } else {
      html += '<div class="nb-note"><b>No saved runs in this copy.</b> Saves live in the browser and are tied to this exact copy of the game, '
            + 'so a freshly uploaded build always starts with an empty list. <b>Nothing was deleted.</b> '
            + 'If you have a <code>.nbsave</code> file from an earlier run, drop it below and you are straight back in.</div>';
    }
    if(MODE !== "disk"){
      html += '<div class="nb-note">\u26A0\uFE0F This embed cannot write to browser storage, so autosave will not survive a reload. '
            + 'Use <b>Download save file</b> at the end of a session \u2014 that path always works.</div>';
    }
    html += '<div class="nb-drop" data-nbdrop="1">Drop a <b>.nbsave</b> file here, or <u data-nbpick="1" style="cursor:pointer;">choose a file</u></div>'
          + '<input type="file" accept=".nbsave,.json,application/json" data-nbinput="1" style="display:none;">'
          + '<div class="tools"><button class="btn secondary small" data-nbscan="1">Scan storage again</button></div>';
    box.innerHTML = html;

    box.querySelectorAll("[data-nbcont],[data-nbload]").forEach(function(b){
      b.onclick = function(){ window.nbLoadKey(b.getAttribute("data-nbcont") || b.getAttribute("data-nbload")); };
    });
    box.querySelectorAll("[data-nbfile]").forEach(function(b){
      b.onclick = function(ev){ ev.stopPropagation(); var st = NBSave.load(b.getAttribute("data-nbfile")); if(st) NBSave.toFile(st); else alert("That slot is empty."); };
    });
    box.querySelectorAll("[data-nbdel]").forEach(function(b){
      b.onclick = function(ev){ ev.stopPropagation(); if(!confirm("Delete this save permanently?")) return;
        NBSave.remove(b.getAttribute("data-nbdel")); if(typeof renderOnboard === "function") renderOnboard(); };
    });
    var scan = box.querySelector("[data-nbscan]");
    if(scan) scan.onclick = function(){
      var r = NBSave.rescan();
      if(r.added){ if(typeof renderOnboard === "function") renderOnboard(); }
      else alert("Scanned this browser for saved runs: nothing new found.\n\nSaves are tied to each copy of the game. Drop a .nbsave file here to bring a run across.");
    };
    var input = box.querySelector("[data-nbinput]"), pick = box.querySelector("[data-nbpick]"), drop = box.querySelector("[data-nbdrop]");
    function ingest(file){
      if(!file) return;
      NBSave.fromFile(file, function(state, err){
        if(err){ alert(err); return; }
        var co = state.company || {};
        NBSave.save(state, NS + "slot_imported_" + Date.now(), "\uD83D\uDCE5 " + (co.name || "Imported run"));
        window.nbLoadState(state, "imported save file");
      });
    }
    if(pick && input){ pick.onclick = function(){ input.click(); }; input.onchange = function(){ ingest(input.files && input.files[0]); }; }
    if(drop){
      drop.addEventListener("dragover", function(e){ e.preventDefault(); drop.classList.add("over"); });
      drop.addEventListener("dragleave", function(){ drop.classList.remove("over"); });
      drop.addEventListener("drop", function(e){ e.preventDefault(); drop.classList.remove("over"); ingest(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
    }
    return box;
  }

  try{
    if(typeof renderOnboard === "function"){
      var pOb = renderOnboard;
      renderOnboard = function(){
        var out = pOb.apply(this, arguments);
        try{
          var ob = document.getElementById("onboard");
          if(!ob) return out;
          ob.querySelectorAll(".v27-resume,[data-v43saves],.v472-diag,[data-nbsaves]").forEach(function(n){ n.remove(); });
          ob.querySelectorAll("[data-load]").forEach(function(b){ var bx = b.closest(".mt14"); if(bx) bx.remove(); });
          var card = ob.querySelector(".ob-card") || ob.firstElementChild;
          if(!card) return out;
          var block = buildSaveBlock();
          var anchor = card.querySelector("p.sub") || card.querySelector("h1");
          if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(block, anchor.nextSibling);
          else card.insertBefore(block, card.firstChild);
        }catch(e){}
        return out;
      };
      window.renderOnboard = renderOnboard;
    }
  }catch(e){}

  try{
    if(typeof renderScreen === "function"){
      var pS = renderScreen;
      renderScreen = function(){
        var out = pS.apply(this, arguments);
        try{
          if(hasGame() && G.ui && G.ui.activeTab === "saves"){
            var host = document.getElementById("screen");
            if(host && !host.querySelector("[data-nbfiletools]")){
              var card = document.createElement("div");
              card.className = "card mt14"; card.setAttribute("data-nbfiletools","1");
              card.innerHTML = '<h3>\uD83D\uDCBE Save file \u2014 the one that always works</h3>'
                + '<div class="muted" style="font-size:12px;line-height:1.55;">Browser saves are tied to this exact copy of the game, so they do not follow you to a new build. '
                + 'A save file does. Download one at the end of a session and drop it on the start screen of any future version.'
                + '<br><br>Storage right now: <b>' + (MODE === "disk" ? "working normally" : "blocked \u2014 download a file before you close this tab") + '</b>.</div>'
                + '<div class="flexrow" style="margin-top:10px;gap:8px;flex-wrap:wrap;">'
                + '<button class="btn" data-nbdl="1">\u2B07 Download save file</button>'
                + '<button class="btn secondary" data-nbsavenow="1">Save to this browser</button></div>';
              host.appendChild(card);
              var dl = card.querySelector("[data-nbdl]");
              if(dl) dl.onclick = function(){ if(!hasGame()){ alert("Start or load a run first."); return; } NBSave.toFile(G); nbToast("Save file downloaded. It works in every future version.", "good"); };
              var sv = card.querySelector("[data-nbsavenow]");
              if(sv) sv.onclick = function(){ if(!hasGame()){ alert("Start or load a run first."); return; }
                if(NBSave.save(G, NS + "slot_" + Date.now(), G.company.name || "Saved game")) nbToast("Saved.", "good");
                if(typeof renderAll === "function") renderAll(); };
            }
          }
        }catch(e){}
        return out;
      };
      window.renderScreen = renderScreen;
    }
  }catch(e){}

  document.addEventListener("keydown", function(e){
    if((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")){
      if(!hasGame()) return;
      e.preventDefault(); autosave(); nbToast("Saved.", "good");
    }
  });
  try{ console.log("[v4.8] NBSave ready \u2014 mode:", MODE, "slots:", NBSave.list().length); }catch(e){}
})();
/* v4.8 — the industry you pick is the one you get */
(function v48IndustryPick(){
  "use strict";
  try{
    if(typeof renderOnboard !== "function") return;
    var prev = renderOnboard;
    renderOnboard = function(){
      var out = prev.apply(this, arguments);
      try{
        var ob = document.getElementById("onboard");
        if(!ob) return out;
        var tiles = ob.querySelectorAll("[data-ind]");
        if(!tiles.length) return out;
        if(!window.__obIndustry) window.__obIndustry = "ai_saas";

        function paint(){
          tiles.forEach(function(t){ t.classList.toggle("active", t.getAttribute("data-ind") === window.__obIndustry); });
          try{
            var cfg = INDUSTRIES[window.__obIndustry];
            if(cfg){
              ob.querySelectorAll("[data-v48inddesc]").forEach(function(n){ n.textContent = cfg.desc || ""; });
              ob.querySelectorAll("[data-v48indcash]").forEach(function(n){
                n.innerHTML = "Starting cash: <b>" + (typeof fmt$ === "function" ? fmt$(cfg.startCash) : cfg.startCash) + "</b>";
              });
            }
          }catch(e){}
        }

        var start = ob.querySelector("#obStart");
        if(start && !ob.querySelector("[data-v48indbox]")){
          var box = document.createElement("div");
          box.setAttribute("data-v48indbox","1");
          box.style.cssText = "font-size:11.5px;margin:6px 0 2px;line-height:1.5;";
          box.innerHTML = '<span class="muted" data-v48inddesc="1"></span><br><span class="muted" data-v48indcash="1"></span>';
          if(start.parentNode) start.parentNode.insertBefore(box, start);
        }

        tiles.forEach(function(t){
          t.addEventListener("click", function(){ window.__obIndustry = t.getAttribute("data-ind"); paint(); });
        });
        paint();

        if(start && !start.getAttribute("data-v48ind")){
          start.setAttribute("data-v48ind","1");
          var orig = start.onclick;
          start.onclick = function(ev){
            var r = orig ? orig.call(this, ev) : undefined;
            try{
              var want = window.__obIndustry || "ai_saas";
              if(typeof G !== "undefined" && G && G.company && want !== "ai_saas" && typeof INDUSTRIES !== "undefined" && INDUSTRIES[want]){
                var cfg = INDUSTRIES[want];
                G.company.industry = want;
                if(typeof opsInit === "function") G.company.ops = opsInit(want);
                if(typeof cfg.startCash === "number") G.company.cash = cfg.startCash;
                G.playerMeta = G.playerMeta || {};
                var un = G.playerMeta.unlockedIndustries || [];
                if(un.indexOf(want) < 0) un.push(want);
                G.playerMeta.unlockedIndustries = un;
                if(typeof applyIndustryLabels === "function") applyIndustryLabels();
                if(typeof logHistory === "function") logHistory("Industry set to " + (cfg.name || want) + ".");
                if(typeof renderAll === "function") renderAll();
              }
            }catch(e){}
            return r;
          };
        }
      }catch(e){}
      return out;
    };
    window.renderOnboard = renderOnboard;
  }catch(e){}
})();
/* v4.8 — reputation has a downside */
(function v48RepDamage(){
  "use strict";
  if(typeof v46Rep !== "function") return;
  function rep(){ try{ return v46Rep(); }catch(e){ return null; } }
  function cl(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function state(){ var c = G.company; if(!c.v48rep) c.v48rep = { scars:[], prHire:null, winStreak:0 }; return c.v48rep; }

  window.v48Scar = function(kind, sev, why){
    try{
      var s = state(), r = rep();
      if(!r) return;
      s.scars.push({ kind:kind, severity:sev, why:why, age:0 });
      if(s.scars.length > 10) s.scars = s.scars.slice(-10);
      r.company = cl(r.company - sev, 0, 100);
      r.founder = cl(r.founder - sev * 0.6, 0, 100);
      if(typeof logHistory === "function") logHistory("\u2B07\uFE0F Reputation hit \u2014 " + why + " (\u2212" + sev + ").");
      if(typeof toast === "function") toast("<b>Reputation hit.</b> " + why + " \u2014 \u2212" + sev + ". This will take months to work off.", "bad");
    }catch(e){}
  };
  window.v48RepDrag = function(){
    try{ var s = state(), d = 0; s.scars.forEach(function(sc){ if(sc.age < 12) d += sc.severity * (1 - sc.age / 12); }); return d; }catch(e){ return 0; }
  };

  var snap = null;
  function takeSnap(){
    try{
      var c = G.company;
      snap = { heads:(c.employees||[]).length,
               clients:(c.clients||[]).map(function(x){ return { id:x.id, name:x.name, mrr:x.mrr||0 }; }),
               cash:c.cash || 0 };
    }catch(e){ snap = null; }
  }
  function scoreMonth(){
    try{
      if(typeof G === "undefined" || !G || !G.company || !snap) return;
      var c = G.company, s = state();
      var cut = snap.heads - (c.employees||[]).length;
      if(cut >= 2) window.v48Scar("layoff", Math.min(14, Math.round(3 + (cut / Math.max(1, snap.heads)) * 30)), cut + " people laid off");
      if((c.cash || 0) < 0 && snap.cash >= 0) window.v48Scar("payroll", 16, "Payroll missed \u2014 the team and the market both noticed");
      var here = {};
      (c.clients||[]).forEach(function(x){ here[x.id] = true; });
      var lostBig = snap.clients.filter(function(x){ return !here[x.id] && x.mrr >= Math.max(3000, (c.mrr||0) * 0.12); });
      lostBig.forEach(function(x){ window.v48Scar("churn", Math.min(12, 4 + Math.round(x.mrr / 2500)), x.name + " churned \u2014 a reference account walked"); });
      s.scars.forEach(function(sc){ sc.age = (sc.age || 0) + 1; });
      s.scars = s.scars.filter(function(sc){ return sc.age < 18; });
      s.winStreak = (cut < 2 && (c.cash||0) >= 0 && !lostBig.length) ? (s.winStreak || 0) + 1 : 0;
      if(s.prHire){
        s.prHire.months = (s.prHire.months || 0) + 1;
        var r = rep(); if(r) r.company = cl(r.company + 1.2, 0, 100);
        s.scars.forEach(function(sc){ sc.age += 1; });
        c.expensesBreakdown = c.expensesBreakdown || {};
        c.expensesBreakdown.pr = s.prHire.cost;
        c.cash -= s.prHire.cost;
        if(s.prHire.months >= 12){ s.prHire = null; delete c.expensesBreakdown.pr;
          if(typeof logHistory === "function") logHistory("\uD83D\uDCF0 The PR retainer ended."); }
      }
      if(s.winStreak >= 3){ var r2 = rep(); if(r2) r2.company = cl(r2.company + 0.8, 0, 100); }
    }catch(e){}
    takeSnap();
  }
  try{ if(typeof advanceMonth === "function"){ var pv = advanceMonth; advanceMonth = function(){ takeSnap(); var o = pv.apply(this, arguments); scoreMonth(); return o; }; } }catch(e){}

  try{
    if(typeof v46RepMonth === "function"){
      var pRM = v46RepMonth;
      v46RepMonth = function(){
        var before = 0;
        try{ before = v46Rep().company; }catch(e){}
        var out = pRM.apply(this, arguments);
        try{ var r = v46Rep(), d = window.v48RepDrag();
             if(d > 0 && r.company > before) r.company = before + (r.company - before) * Math.max(0.15, 1 - d / 25); }catch(e){}
        return out;
      };
    }
  }catch(e){}

  try{
    if(typeof logHistory === "function"){
      var pL = logHistory;
      logHistory = function(msg){
        try{
          var t = String(msg || "").toLowerCase();
          if(t.indexOf("lawsuit") >= 0 && (t.indexOf("lost") >= 0 || t.indexOf("verdict") >= 0 || t.indexOf("damages") >= 0) && !window.__v48suit){
            window.__v48suit = 1;
            setTimeout(function(){ window.__v48suit = 0; }, 50);
            window.v48Scar("legal", 11, "Lost in court \u2014 the verdict made the trade press");
          }
        }catch(e){}
        return pL.apply(this, arguments);
      };
    }
  }catch(e){}

  function recoveryCard(){
    var s = state(), r = rep();
    if(!r) return null;
    var fresh = s.scars.filter(function(sc){ return sc.age < 12; });
    var cost = Math.max(4000, Math.round((G.company.mrr || 10000) * 0.06));
    var box = document.createElement("div");
    box.className = "card mt14"; box.setAttribute("data-v48rep","1");
    var html = '<h3>\uD83E\uDE79 Reputation recovery</h3>';
    if(!fresh.length && !s.prHire){
      html += '<div class="muted" style="font-size:12px;">No open reputation damage. Keep payroll met and keep your big logos, and it stays that way.</div>';
    } else {
      if(fresh.length){
        html += '<div class="muted" style="font-size:12px;margin-bottom:8px;">Open damage is holding recovery back by <b>' + window.v48RepDrag().toFixed(1) + ' points a month</b>.</div>'
          + fresh.map(function(sc){
              return '<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-top:1px solid var(--border);font-size:12px;">'
                   + '<span>' + sc.why + '</span><span class="muted">' + Math.max(1, 12 - sc.age) + ' mo left</span></div>';
            }).join("");
      }
      if(s.prHire) html += '<div class="muted" style="font-size:12px;margin-top:8px;">\uD83D\uDCF0 PR retainer active \u2014 month ' + s.prHire.months + ' of 12.</div>';
    }
    if(!s.prHire){
      html += '<button class="btn secondary small" data-v48pr="1" style="margin-top:10px;width:100%;">Hire a PR firm \u2014 '
            + (typeof fmt$ === "function" ? fmt$(cost) : "$" + cost) + '/mo for 12 months</button>';
    }
    box.innerHTML = html;
    var btn = box.querySelector("[data-v48pr]");
    if(btn) btn.onclick = function(){
      if((G.company.cash || 0) < cost * 2){ if(typeof toast === "function") toast("Not enough cash to retain a PR firm right now.", "bad"); return; }
      s.prHire = { cost: cost, months: 0 };
      if(typeof logHistory === "function") logHistory("\uD83D\uDCF0 Retained a PR firm to repair reputation.");
      if(typeof renderAll === "function") renderAll();
    };
    return box;
  }

  try{
    if(typeof renderScreen === "function"){
      var pS2 = renderScreen;
      renderScreen = function(){
        var out = pS2.apply(this, arguments);
        try{
          var host = document.getElementById("screen");
          if(host && host.querySelector("[data-v46rep]") && !host.querySelector("[data-v48rep]")){
            var c = recoveryCard(); if(c) host.appendChild(c);
          }
        }catch(e){}
        return out;
      };
      window.renderScreen = renderScreen;
    }
  }catch(e){}
})();
/* v4.8 — named account plan */
(function v48Accounts(){
  "use strict";
  var LOGOS = ["Cordell Freight","Harbourline Foods","Ashmont Dental Group","Ballard Trucking","Rivet & Co.",
    "Pelham Medical","Grantwood Logistics","Stillwater Salons","Marchetti Build","Norfolk Dental",
    "Kessler Retail","Aubrey Transport","Wexler Agency","Tandem Creative","Bright Harbor Care",
    "Lockridge Manufacturing","Verity Insurance","Cobalt Staffing","Meridian Legal","Sagebrook Hotels"];

  function st(){ var c = G.company; if(!c.v48acct) c.v48acct = { quarter:0, targets:[], history:[] }; return c.v48acct; }
  function curQ(){ var c = G.company; return ((c.year||1) - 1) * 4 + Math.ceil((c.month||1) / 3); }
  function pick(n, ex){
    var pool = LOGOS.filter(function(l){ return ex.indexOf(l) < 0; }), out = [];
    while(out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out;
  }
  function sizeFor(){ return Math.round(Math.max(1500, (G.company.mrr || 8000) * 0.22) * (0.6 + Math.random() * 1.1) / 100) * 100; }
  function refresh(){
    var s = st(), q = curQ();
    if(s.quarter === q && s.targets.length) return;
    if(s.targets.length){
      s.history.push({ quarter:s.quarter, won:s.targets.filter(function(t){ return t.status === "won"; }).length, of:s.targets.length });
      if(s.history.length > 8) s.history = s.history.slice(-8);
    }
    var used = s.targets.map(function(t){ return t.name; });
    s.quarter = q;
    s.targets = pick(3, used).map(function(n){ return { name:n, mrr:sizeFor(), progress:0, ae:null, vp:null, status:"open", touches:0, note:"Not yet approached." }; });
  }
  function staff(){
    var emp = (G.company.employees) || [];
    return { aes: emp.filter(function(e){ return /sales|account/i.test((e.role||"") + " " + (e.dept||"")); }),
             vps: emp.filter(function(e){ return /vp|chief|head|director/i.test(e.role||""); }) };
  }
  function pursue(){
    try{
      if(typeof G === "undefined" || !G || !G.company) return;
      var s = st(), c = G.company;
      refresh();
      s.targets.forEach(function(t){
        if(t.status !== "open") return;
        if(!t.ae){ t.note = "Unassigned \u2014 nobody is working this account."; return; }
        t.touches++;
        var gain = 14 + Math.random() * 12;
        if(t.vp) gain += 9;
        try{ gain += (v46Rep().company - 50) * 0.18; }catch(e){}
        t.progress = Math.min(100, t.progress + Math.max(3, gain));
        if(t.progress >= 100){
          t.status = "won"; t.note = "Signed.";
          try{
            c.clients = c.clients || [];
            c.clients.push({ id:(typeof uid === "function" ? uid() : "a" + Date.now()), name:t.name, mrr:t.mrr, health:76, tier:"named" });
            c.mrr = (c.mrr || 0) + t.mrr;
          }catch(e){}
          if(typeof logHistory === "function") logHistory("\uD83C\uDFAF Named account won \u2014 " + t.name + ".");
          try{ v46RepBump("company", 2, "Named logo signed"); }catch(e){}
        } else if(t.touches >= 6){
          t.status = "lost"; t.note = "Went quiet after six months of pursuit.";
          if(typeof logHistory === "function") logHistory("\u274C Named account lost \u2014 " + t.name + ".");
        } else {
          t.note = t.vp ? "Executive sponsor engaged. Moving." : "AE is working it. An exec sponsor would speed this up.";
        }
      });
    }catch(e){}
  }
  try{ if(typeof advanceMonth === "function"){ var pv = advanceMonth; advanceMonth = function(){ var o = pv.apply(this, arguments); pursue(); return o; }; } }catch(e){}

  function card(){
    refresh();
    var s = st(), ppl = staff();
    var box = document.createElement("div");
    box.className = "card mt14"; box.setAttribute("data-v48acct","1");
    var head = '<h3>\uD83C\uDFAF Named account plan \u2014 Q' + (((s.quarter - 1) % 4) + 1) + '</h3>'
      + '<div class="muted" style="font-size:12px;">Three target logos a quarter. Assign an AE to work it and a VP to sponsor it. '
      + 'Progress is earned month over month \u2014 unassigned accounts go nowhere.</div>';
    var rows = s.targets.map(function(t, i){
      var pct = Math.round(t.progress);
      var col = t.status === "won" ? "#22c55e" : t.status === "lost" ? "#ef4444" : "#5b8cff";
      var body = '<div style="padding:10px 0;border-top:1px solid var(--border);">'
        + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;"><b>' + t.name + '</b>'
        + '<span class="muted" style="font-size:12px;">' + (typeof fmt$ === "function" ? fmt$(t.mrr) : "$" + t.mrr) + '/mo</span></div>'
        + '<div style="height:6px;border-radius:4px;background:var(--panel2);margin:6px 0;overflow:hidden;">'
        + '<div style="height:100%;width:' + pct + '%;background:' + col + ';"></div></div>'
        + '<div class="muted" style="font-size:11.5px;">' + pct + '% \u00b7 ' + t.note + '</div>';
      if(t.status === "open"){
        body += '<div class="flexrow" style="gap:6px;margin-top:7px;flex-wrap:wrap;">'
          + '<select data-v48ae="' + i + '" style="flex:1 1 130px;"><option value="">AE \u2014 unassigned</option>'
          + ppl.aes.map(function(e){ return '<option value="' + e.id + '"' + (t.ae === e.id ? " selected" : "") + '>' + (e.name || e.role) + '</option>'; }).join("")
          + '</select><select data-v48vp="' + i + '" style="flex:1 1 130px;"><option value="">VP sponsor \u2014 none</option>'
          + ppl.vps.map(function(e){ return '<option value="' + e.id + '"' + (t.vp === e.id ? " selected" : "") + '>' + (e.name || e.role) + '</option>'; }).join("")
          + '</select></div>';
      }
      return body + '</div>';
    }).join("");
    var foot = s.history.length
      ? '<div class="muted" style="font-size:11.5px;margin-top:10px;border-top:1px solid var(--border);padding-top:8px;">Prior quarters: '
        + s.history.slice(-4).map(function(h){ return h.won + "/" + h.of; }).join(" \u00b7 ") + '</div>' : '';
    if(!ppl.aes.length) foot = '<div class="muted" style="font-size:11.5px;margin-top:10px;">\u26A0\uFE0F You have no account executives. Hire in Sales before any of these move.</div>' + foot;
    box.innerHTML = head + rows + foot;
    box.querySelectorAll("[data-v48ae]").forEach(function(sel){ sel.onchange = function(){ s.targets[+sel.getAttribute("data-v48ae")].ae = sel.value || null; }; });
    box.querySelectorAll("[data-v48vp]").forEach(function(sel){ sel.onchange = function(){ s.targets[+sel.getAttribute("data-v48vp")].vp = sel.value || null; }; });
    return box;
  }

  try{
    if(typeof renderScreen === "function"){
      var pS3 = renderScreen;
      renderScreen = function(){
        var out = pS3.apply(this, arguments);
        try{
          if(typeof G !== "undefined" && G && G.company && G.ui){
            var tab = G.ui.activeTab;
            if((tab === "clients" || tab === "decisions") && !document.querySelector("[data-v48acct]")){
              var host = document.getElementById("screen");
              if(host) host.appendChild(card());
            }
          }
        }catch(e){}
        return out;
      };
      window.renderScreen = renderScreen;
    }
  }catch(e){}
})();
/* v4.8 — UI cleanup: facilities off Hiring, smaller HQ tile, cash flow guard */
(function v48Cleanup(){
  "use strict";
  try{
    if(typeof renderHR === "function"){
      var pHR = renderHR;
      renderHR = function(){
        var wrap = pHR.apply(this, arguments);
        try{
          var heads = wrap.querySelectorAll("h3");
          for(var i = 0; i < heads.length; i++){
            var txt = heads[i].textContent || "";
            if(txt.indexOf("Facilities") >= 0 || txt.indexOf("Campus") >= 0){
              var c = heads[i].closest(".card"); if(c) c.remove();
            }
          }
          wrap.querySelectorAll("[data-v47hq],.v47-hqcard").forEach(function(n){ var c2 = n.closest(".card") || n; c2.remove(); });
          if(!wrap.querySelector("[data-v48facptr]")){
            var ptr = document.createElement("div");
            ptr.className = "card mt14"; ptr.setAttribute("data-v48facptr","1");
            ptr.innerHTML = '<div class="muted" style="font-size:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;">'
              + '<span>\uD83C\uDFD7\uFE0F Seats, buildings and your HQ live on the <b>Facilities</b> tab.</span>'
              + '<button class="btn secondary small" data-v48gofac="1">Open Facilities</button></div>';
            wrap.appendChild(ptr);
            var b = ptr.querySelector("[data-v48gofac]");
            if(b) b.onclick = function(){ G.ui.activeTab = "facilities"; if(typeof renderAll === "function") renderAll(); };
          }
        }catch(e){}
        return wrap;
      };
      window.renderHR = renderHR;
    }
  }catch(e){}

  try{
    var css = document.createElement("style");
    css.textContent =
      ".v47-hqcard{display:flex;align-items:center;gap:12px;padding:10px 12px;}"
    + ".v47-hqcard .v47-hqshot{flex:0 0 96px;width:96px;height:64px;display:block;border-radius:8px;overflow:hidden;}"
    + ".v47-hqcard .hq-photo{width:96px;height:64px;object-fit:cover;display:block;border-radius:8px;}"
    + ".v47-hqcard h3{font-size:14px;margin:0 0 2px;}"
    + ".v47-hqcard .muted{font-size:11.5px;}"
    + "@media (max-width:520px){.v47-hqcard .v47-hqshot,.v47-hqcard .hq-photo{flex-basis:72px;width:72px;height:48px;}}";
    document.head.appendChild(css);
  }catch(e){}

  try{
    if(typeof renderScreen === "function"){
      var pS4 = renderScreen;
      renderScreen = function(){
        var isCash = false;
        try{ isCash = typeof G !== "undefined" && G && G.ui && G.ui.activeTab === "financials" && G.ui.finTab === "cashflow"; }catch(e){}
        if(!isCash) return pS4.apply(this, arguments);
        try{
          var c = G.company;
          c.financialHistory = Array.isArray(c.financialHistory) ? c.financialHistory : [];
          c.expensesBreakdown = c.expensesBreakdown || {};
          c.financialHistory.forEach(function(h){
            if(!h || typeof h !== "object") return;
            ["mrr","revenue","expenses","net","cash"].forEach(function(k){ if(typeof h[k] !== "number" || !isFinite(h[k])) h[k] = 0; });
          });
          Object.keys(c.expensesBreakdown).forEach(function(k){
            var v = c.expensesBreakdown[k];
            if(typeof v !== "number" || !isFinite(v)) c.expensesBreakdown[k] = 0;
          });
          return pS4.apply(this, arguments);
        }catch(err){
          try{ console.error("[v4.8] Cash Flow render failed", err); }catch(e){}
          var host = document.getElementById("screen");
          if(host){
            host.innerHTML = '<div class="card"><h3>\uD83D\uDCB8 Cash Flow</h3>'
              + '<div class="muted" style="font-size:12.5px;line-height:1.6;">This tab hit an error and stopped rendering. '
              + 'Your run is fine and nothing was lost \u2014 switch tabs and carry on.<br><br>'
              + '<b>Send this line to Jarvis:</b><br><code style="font-size:11px;">'
              + String((err && err.message) || err).replace(/[<>]/g, "") + '</code></div></div>';
          }
          return null;
        }
      };
      window.renderScreen = renderScreen;
    }
  }catch(e){}

  try{ window.GAME_VERSION = "v4.8"; }catch(e){}
})();
/* =====================================================================
   v4.9 — export that actually works inside a locked-down embed
   Notion serves the game in a sandboxed iframe WITHOUT allow-downloads.
   An <a download>.click() is silently swallowed: no file, no error, no
   clue. So export is no longer a single button that may quietly fail -
   it is a panel offering three independent escape routes, at least one
   of which always works.
   ===================================================================== */
(function v49Export(){
  "use strict";
  function hasGame(){ try{ return typeof G !== "undefined" && !!G && !!G.company; }catch(e){ return false; } }
  function toast(m,k){ try{ if(typeof window.toast === "function") window.toast(m,k); }catch(e){} }

  function payload(state){
    return JSON.stringify({ __nbsave:1, version:"v4.9", savedAt:Date.now(), state:state });
  }
  function fileName(state){
    var co = (state && state.company) || {};
    return "navbiz_" + (co.name || "run").replace(/[^a-z0-9]+/gi,"_").toLowerCase()
         + "_y" + (co.year||1) + "m" + (co.month||1) + ".nbsave";
  }

  try{
    var css = document.createElement("style");
    css.textContent =
      ".v49-ov{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:18px;}"
    + ".v49-box{background:var(--panel,#111827);border:1px solid var(--border,#293042);border-radius:14px;max-width:560px;width:100%;padding:16px 16px 14px;max-height:88vh;overflow:auto;}"
    + ".v49-box h3{margin:0 0 4px;font-size:15px;} .v49-box .sub{font-size:12px;opacity:.75;line-height:1.55;margin-bottom:10px;}"
    + ".v49-box .step{border-top:1px solid var(--border,#293042);padding:10px 0 2px;}"
    + ".v49-box .step b{font-size:12.5px;} .v49-box .step .hint{font-size:11px;opacity:.65;display:block;margin:2px 0 7px;line-height:1.45;}"
    + ".v49-ta{width:100%;height:90px;font-family:ui-monospace,Menlo,monospace;font-size:10px;border-radius:8px;"
    + "border:1px solid var(--border,#293042);background:var(--panel2,#0b1220);color:inherit;padding:7px;resize:vertical;}"
    + ".v49-close{display:block;width:100%;margin-top:12px;}";
    document.head.appendChild(css);
  }catch(e){}

  function panel(state){
    var text = payload(state), nm = fileName(state);
    var ov = document.createElement("div");
    ov.className = "v49-ov";
    ov.innerHTML = '<div class="v49-box">'
      + '<h3>\uD83D\uDCBE Export this run</h3>'
      + '<div class="sub">This game runs inside a locked-down frame, and some browsers block downloads from it outright \u2014 which is why the button looked dead. '
      + 'Three routes below. <b>Try them in order; the first one that works is the one to use from now on.</b></div>'
      + '<div class="step"><b>1 \u00b7 Save as a file</b><span class="hint">The normal route. If nothing lands in your downloads, move to 2.</span>'
      + '<button class="btn" data-v49dl style="width:100%;">\u2B07 Download ' + nm + '</button></div>'
      + '<div class="step"><b>2 \u00b7 Open in a new tab</b><span class="hint">Opens the save as plain text outside the frame. Then use your browser\u2019s File \u203A Save Page As.</span>'
      + '<button class="btn secondary" data-v49tab style="width:100%;">\u2197 Open save in a new tab</button></div>'
      + '<div class="step"><b>3 \u00b7 Copy the text</b><span class="hint">Always works, even when everything else is blocked. Paste it into a Notion page or a note, and paste it back on the start screen to restore.</span>'
      + '<button class="btn secondary" data-v49copy style="width:100%;margin-bottom:7px;">\uD83D\uDCCB Copy save text</button>'
      + '<textarea class="v49-ta" data-v49text readonly></textarea></div>'
      + '<button class="btn secondary v49-close" data-v49x>Close</button></div>';
    document.body.appendChild(ov);

    var ta = ov.querySelector("[data-v49text]");
    ta.value = text;

    ov.querySelector("[data-v49dl]").onclick = function(){
      try{
        var blob = new Blob([text], { type:"application/octet-stream" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = nm; a.rel = "noopener";
        document.body.appendChild(a); a.click();
        setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 1500);
        toast("If no file appeared, downloads are blocked here \u2014 use route 2 or 3.", "warn");
      }catch(err){ toast("Download blocked by the browser. Use route 2 or 3.", "bad"); }
    };
    ov.querySelector("[data-v49tab]").onclick = function(){
      var w = null;
      try{ w = window.open("", "_blank"); }catch(e){}
      if(w && w.document){
        try{
          w.document.open();
          w.document.write("<title>" + nm + "</title><pre style='white-space:pre-wrap;word-break:break-all;font:11px ui-monospace,Menlo,monospace;padding:12px;'>"
            + text.replace(/&/g,"&amp;").replace(/</g,"&lt;") + "</pre>");
          w.document.close();
          toast("Opened in a new tab. Use File \u203A Save Page As.", "good");
          return;
        }catch(e){}
      }
      toast("The browser blocked the new tab. Use route 3 \u2014 copy the text.", "warn");
    };
    ov.querySelector("[data-v49copy]").onclick = function(){
      var done = function(){ toast("<b>Save text copied.</b> Paste it somewhere safe \u2014 it restores in any future version.", "good"); };
      try{
        if(navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(text).then(done, function(){ ta.select(); document.execCommand("copy"); done(); });
          return;
        }
      }catch(e){}
      try{ ta.select(); document.execCommand("copy"); done(); }
      catch(e){ toast("Select the text in the box and copy it manually.", "warn"); }
    };
    ov.querySelector("[data-v49x]").onclick = function(){ ov.remove(); };
    ov.onclick = function(ev){ if(ev.target === ov) ov.remove(); };
  }

  try{
    if(window.NBSave){
      window.NBSave.toFile = function(state){ if(state) panel(state); };
      window.NBSave.fromText = function(text, done){
        var parsed = null;
        try{ parsed = JSON.parse(String(text||"").trim()); }catch(e){}
        if(!parsed){ done(null, "That text is not a readable save."); return; }
        var st = parsed.__nbsave ? parsed.state : parsed;
        if(!st || (!st.company && !st.companies)){ done(null, "That text does not contain a saved run."); return; }
        done(st, null);
      };
    }
  }catch(e){}

  /* paste-to-restore on the start screen */
  try{
    if(typeof renderOnboard === "function"){
      var prevOb = renderOnboard;
      renderOnboard = function(){
        var out = prevOb.apply(this, arguments);
        try{
          var drop = document.querySelector("[data-nbdrop]");
          if(drop && !document.querySelector("[data-v49paste]")){
            var row = document.createElement("div");
            row.setAttribute("data-v49paste","1");
            row.style.cssText = "margin-top:7px;font-size:11.5px;text-align:center;opacity:.8;";
            row.innerHTML = 'or <u style="cursor:pointer;" data-v49open>paste save text</u> instead';
            drop.parentNode.insertBefore(row, drop.nextSibling);
            row.querySelector("[data-v49open]").onclick = function(){
              if(document.querySelector("[data-v49pastebox]")) return;
              var box = document.createElement("div");
              box.setAttribute("data-v49pastebox","1");
              box.style.cssText = "margin-top:7px;";
              box.innerHTML = '<textarea class="v49-ta" data-v49in placeholder="Paste the save text here"></textarea>'
                + '<button class="btn secondary small" data-v49go style="width:100%;margin-top:6px;">Restore from text</button>';
              row.parentNode.insertBefore(box, row.nextSibling);
              box.querySelector("[data-v49go]").onclick = function(){
                var raw = box.querySelector("[data-v49in]").value;
                window.NBSave.fromText(raw, function(state, err){
                  if(err){ alert(err); return; }
                  try{ window.NBSave.save(state, "nbsave1_slot_pasted_" + Date.now(), "\uD83D\uDCE5 " + ((state.company&&state.company.name)||"Restored run")); }catch(e){}
                  window.nbLoadState(state, "pasted save");
                });
              };
            };
          }
        }catch(e){}
        return out;
      };
      window.renderOnboard = renderOnboard;
    }
  }catch(e){}

  /* relabel the Saves-tab button so it stops promising a silent download */
  try{
    if(typeof renderScreen === "function"){
      var prevRS = renderScreen;
      renderScreen = function(){
        var out = prevRS.apply(this, arguments);
        try{
          var b = document.querySelector("[data-nbdl]");
          if(b && !b.getAttribute("data-v49")){
            b.setAttribute("data-v49","1");
            b.textContent = "\uD83D\uDCBE Export this run\u2026";
            b.onclick = function(){ if(!hasGame()){ alert("Start or load a run first."); return; } panel(G); };
          }
        }catch(e){}
        return out;
      };
      window.renderScreen = renderScreen;
    }
  }catch(e){}
})();
/* v4.9 — header tile picker: stays open, drag to reorder */
(function v49TilePicker(){
  "use strict";
  try{
    var css = document.createElement("style");
    css.textContent =
      ".v30-pick{max-height:72vh;overflow:auto;}"
    + ".v30-pick .hd49{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 4px;}"
    + ".v30-pick .hd49 h4{margin:0;}"
    + ".v30-pick .x49{background:transparent;border:0;color:inherit;font-size:15px;line-height:1;cursor:pointer;opacity:.7;padding:2px 4px;}"
    + ".v30-pick .x49:hover{opacity:1;}"
    + ".v30-pick .opt.drag{cursor:grab;}"
    + ".v30-pick .opt.drag:active{cursor:grabbing;}"
    + ".v30-pick .opt.dragging{opacity:.4;}"
    + ".v30-pick .opt.over{border:1px dashed var(--accent,#5b8cff);}"
    + ".v30-pick .grip{opacity:.5;font-size:12px;letter-spacing:-1px;}";
    document.head.appendChild(css);
  }catch(e){}

  try{
    if(typeof v30OpenPicker === "undefined") return;
    v30OpenPicker = function(head, scope){
      var old = head.querySelector(".v30-pick");
      if(old){ old.remove(); return; }
      var u = v30Ui();
      var picked = (u.tiles[scope]||[]).slice();
      var opts = Object.keys(V30_METRICS).filter(function(k){ return V30_METRICS[k].scope === scope; });
      var pop = document.createElement("div");
      pop.className = "v30-pick";
      pop.onclick = function(ev){ ev.stopPropagation(); };
      pop.onmousedown = function(ev){ ev.stopPropagation(); };

      var apply = function(){ u.tiles[scope] = picked.slice(); try{ v29RenderHeader(); }catch(e){} };
      var dragKey = null;

      var draw = function(){
        pop.innerHTML = '<div class="hd49"><h4>' + scope + ' tiles \u2014 4 to 8</h4><button class="x49" data-v49x title="Close">\u2715</button></div>'
          + '<div class="cnt" style="margin-bottom:6px;">Drag a row to reorder. Changes apply live and this panel stays open until you close it.</div>'
          + picked.map(function(k,i){
              return '<div class="opt on drag" draggable="true" data-v49row="' + k + '">'
                + '<span class="grip">\u2059</span><span style="opacity:.6;">' + (i+1) + '</span>'
                + '<span style="flex:1;">' + V30_METRICS[k].label + '</span>'
                + '<span class="ord"><button data-v32up="' + k + '" ' + (i===0?"disabled":"") + '>\u2191</button>'
                + '<button data-v32down="' + k + '" ' + (i===picked.length-1?"disabled":"") + '>\u2193</button>'
                + '<button data-v32rm="' + k + '">\u2715</button></span></div>';
            }).join("")
          + '<div class="cnt" style="margin:6px 0 3px;">Add a metric</div>'
          + opts.filter(function(k){ return picked.indexOf(k) < 0; }).map(function(k){
              return '<div class="opt" data-v30m="' + k + '"><span>\u00b7</span><span style="flex:1;">' + V30_METRICS[k].label + '</span></div>';
            }).join("")
          + '<div class="foot"><span class="muted">' + picked.length + '/8 selected</span>'
          + '<span><button class="btn secondary small" data-v30spark>' + (u.sparks?"Hide":"Show") + ' sparklines</button>'
          + '<button class="btn secondary small" data-v30reset>Reset</button>'
          + '<button class="btn small" data-v49done>Done</button></span></div>';

        var move = function(k,d){
          var i = picked.indexOf(k), j = i + d;
          if(i < 0 || j < 0 || j >= picked.length) return;
          picked.splice(j, 0, picked.splice(i,1)[0]); draw(); apply();
        };

        pop.querySelectorAll("[data-v49row]").forEach(function(rowEl){
          rowEl.addEventListener("dragstart", function(ev){
            dragKey = rowEl.getAttribute("data-v49row");
            rowEl.classList.add("dragging");
            try{ ev.dataTransfer.effectAllowed = "move"; ev.dataTransfer.setData("text/plain", dragKey); }catch(e){}
          });
          rowEl.addEventListener("dragend", function(){ dragKey = null; rowEl.classList.remove("dragging"); });
          rowEl.addEventListener("dragover", function(ev){
            ev.preventDefault();
            try{ ev.dataTransfer.dropEffect = "move"; }catch(e){}
            rowEl.classList.add("over");
          });
          rowEl.addEventListener("dragleave", function(){ rowEl.classList.remove("over"); });
          rowEl.addEventListener("drop", function(ev){
            ev.preventDefault(); ev.stopPropagation();
            rowEl.classList.remove("over");
            var src = dragKey;
            try{ src = src || ev.dataTransfer.getData("text/plain"); }catch(e){}
            var dst = rowEl.getAttribute("data-v49row");
            if(!src || src === dst) return;
            var from = picked.indexOf(src), to = picked.indexOf(dst);
            if(from < 0 || to < 0) return;
            picked.splice(to, 0, picked.splice(from,1)[0]);
            draw(); apply();
          });
        });

        pop.querySelectorAll("[data-v32up]").forEach(function(b){ b.onclick = function(ev){ ev.stopPropagation(); move(b.getAttribute("data-v32up"), -1); }; });
        pop.querySelectorAll("[data-v32down]").forEach(function(b){ b.onclick = function(ev){ ev.stopPropagation(); move(b.getAttribute("data-v32down"), 1); }; });
        pop.querySelectorAll("[data-v32rm]").forEach(function(b){ b.onclick = function(ev){
          ev.stopPropagation();
          if(picked.length <= 4){ v30Toast("Four tiles is the minimum.", "warn"); return; }
          picked.splice(picked.indexOf(b.getAttribute("data-v32rm")), 1); draw(); apply();
        }; });
        pop.querySelectorAll("[data-v30m]").forEach(function(o){ o.onclick = function(ev){
          ev.stopPropagation();
          if(picked.length >= 8){ v30Toast("Eight tiles max \u2014 remove one first.", "warn"); return; }
          picked.push(o.getAttribute("data-v30m")); draw(); apply();
        }; });
        pop.querySelector("[data-v30reset]").onclick = function(ev){
          ev.stopPropagation(); picked.length = 0;
          V30_DEFAULTS[scope].forEach(function(k){ picked.push(k); }); draw(); apply();
        };
        pop.querySelector("[data-v30spark]").onclick = function(ev){
          ev.stopPropagation(); u.sparks = !u.sparks; draw(); try{ v29RenderHeader(); }catch(e){}
        };
        var close = function(ev){
          if(ev) ev.stopPropagation();
          apply();
          var p2 = head.querySelector(".v30-pick"); if(p2) p2.remove();
          v30Toast("<b>Header saved \u2014 " + picked.length + " tiles.</b>", "good");
        };
        pop.querySelector("[data-v49done]").onclick = close;
        pop.querySelector("[data-v49x]").onclick = close;
      };
      draw();
      head.appendChild(pop);
    };
    window.v30OpenPicker = v30OpenPicker;
  }catch(e){}
})();
/* v4.9 — Accounts is a count, not money */
(function v49AccountsTile(){
  "use strict";
  try{
    if(typeof V30_METRICS === "undefined" || !V30_METRICS.clients) return;
    V30_METRICS.clients.fmt = function(c){ return String(((c && c.clients) || []).length); };
    V30_METRICS.clients.raw = true;
  }catch(e){}
})();
/* v4.9 — nail salon gets its own rivals and its own vocabulary */
(function v49SalonFlavor(){
  "use strict";
  var SALON_RIVALS = {
    northwind:  { name:"Polished Nail Bar",      note:"Immaculate work, hopeless at marketing. Their technique keeps improving." },
    aperture:   { name:"Luxe Lacquer Studio",    note:"Aggressive discounting and a groupon for everything. Will undercut you for a regular." },
    halcyon:    { name:"Bella Nails & Spa",      note:"The established salon in town. Expensive, slow to book, trusted by everyone\u2019s mother." },
    brightline: { name:"Ten & Two Nail Lounge",  note:"Cheap, fast, walk-ins only. Eats the bottom of the market." }
  };
  var WORDS = [
    [/\bProduct quality\b/g, "Service quality"],
    [/\bProduct\b/g,         "Service quality"],
    [/\bproduct\b/g,         "service quality"],
    [/\bR&D\b/g,             "Training"],
    [/\broadmap\b/g,         "service menu"]
  ];

  function isSalon(){
    try{ return G && G.company && G.company.industry === "nail_salon"; }catch(e){ return false; }
  }
  function rename(){
    try{
      if(!isSalon() || typeof v33State !== "function") return;
      var s = v33State();
      (s.rivals||[]).forEach(function(r){
        var m = SALON_RIVALS[r.key];
        if(m && r.name !== m.name){ r.name = m.name; r.note = m.note; }
      });
    }catch(e){}
  }
  try{
    if(typeof v33State === "function"){
      var prevState = v33State;
      v33State = function(){
        var s = prevState.apply(this, arguments);
        try{
          if(isSalon()){
            (s.rivals||[]).forEach(function(r){
              var m = SALON_RIVALS[r.key];
              if(m && r.name !== m.name){ r.name = m.name; r.note = m.note; }
            });
          }
        }catch(e){}
        return s;
      };
      window.v33State = v33State;
    }
  }catch(e){}

  function relabel(root){
    try{
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      var nodes = [], n;
      while((n = walker.nextNode())) nodes.push(n);
      nodes.forEach(function(t){
        var v = t.nodeValue;
        if(!v || !/product|Product|R&D|roadmap/.test(v)) return;
        var out = v;
        WORDS.forEach(function(p){ out = out.replace(p[0], p[1]); });
        if(out !== v) t.nodeValue = out;
      });
    }catch(e){}
  }

  try{
    if(typeof renderScreen === "function"){
      var prevRS = renderScreen;
      renderScreen = function(){
        var out = prevRS.apply(this, arguments);
        try{
          if(isSalon()){
            rename();
            var tab = (G.ui && G.ui.activeTab) || "";
            if(tab === "rivals" || tab === "research" || tab === "product"){
              var host = document.getElementById("screen");
              if(host) relabel(host);
            }
          }
        }catch(e){}
        return out;
      };
      window.renderScreen = renderScreen;
    }
  }catch(e){}

  try{ window.GAME_VERSION = "v4.9"; }catch(e){}
})();
