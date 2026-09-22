/* v4.28d central scheduler - must load before all other scripts.
   28 patches each registered their own setInterval keep-alive (~41 callbacks
   per second of full-DOM sweeps). This intercepts setInterval before they
   register and folds them into two groups:
     fast (<=500ms): cash/debt integrity guards - always run, every 500ms
     slow (>500ms):  UI mount sweeps - only run when the DOM may have changed
                     (after a click/input/render) or every 4th tick as a safety
   Identical callbacks are deduped. Everything pauses when the tab is hidden. */
(function(){
  if(window.__v428sched) return;
  window.__v428sched = true;
  var realSI = window.setInterval.bind(window);
  var fast = [], slow = [], seen = {};
  var dirty = true, idle = 0;
  var stats = { registered:0, deduped:0, passthrough:0, fastRuns:0, slowRuns:0, slowSkips:0, errors:0 };

  function markDirty(){ dirty = true; }
  window.__v428markDirty = markDirty;

  function run(rec){
    try{ rec.fn(); }
    catch(e){ stats.errors++; rec.err = (e && e.message) || String(e); }
  }

  realSI(function(){
    if(document.hidden) return;
    stats.fastRuns++;
    for(var i=0;i<fast.length;i++) run(fast[i]);
  }, 500);

  realSI(function(){
    if(document.hidden) return;
    idle++;
    if(!dirty && (idle % 4) !== 0){ stats.slowSkips++; return; }
    dirty = false;
    stats.slowRuns++;
    for(var i=0;i<slow.length;i++) run(slow[i]);
  }, 1000);

  ["click","input","change","keydown"].forEach(function(evt){
    document.addEventListener(evt, markDirty, true);
  });

  window.setInterval = function(fn, ms){
    try{
      if(typeof fn !== "function" || !(ms > 0) || ms >= 2500){
        stats.passthrough++;
        return realSI.apply(null, arguments);
      }
      var key = ms + "::" + String(fn);
      if(seen[key]){ stats.deduped++; return -1; }
      seen[key] = 1;
      stats.registered++;
      (ms <= 500 ? fast : slow).push({ fn: fn, ms: ms });
      return -1;
    }catch(e){
      stats.passthrough++;
      return realSI.apply(null, arguments);
    }
  };

  window.__v428schedApi = {
    stats: stats, fast: fast, slow: slow,
    markDirty: markDirty,
    idlePerSecond: function(){ return (fast.length * 2) + (slow.length / 4); },
    activePerSecond: function(){ return (fast.length * 2) + slow.length; }
  };
})();
