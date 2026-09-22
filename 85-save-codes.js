/* ============================================================
   v4.41 — Save codes. The missing half of the cloud system.

   70-cloud-saves.js and 80-account-gate.js both call
   window.v28ExportCode(state) and window.v28ApplyCode(text).
   Neither function has ever existed anywhere in this build, so
   every cloud path failed the same quiet way:

     • Gate → Continue  → "This build cannot apply save codes."
       (printed inside the gate card, never in the console)
     • Cloud autosave   → declined silently, so nothing was
                           ever written to Supabase
     • Saves tab        → "This build has no portable save codes."

   This file supplies both, on top of the v4.8 NBSave machinery.
   The gate neuters the browser slot functions but leaves
   window.nbLoadState intact, so that is what we apply through.

   It also rescues window.nbLoadKey. The start-screen save list
   still calls NBSave.load(), which the gate stubs to null, so
   every legacy Continue ended in "That save slot is empty."
   ============================================================ */
(function () {
  'use strict';
  if (window.__v441on) return;
  window.__v441on = true;

  var VER = 'v4.41';

  function isState(s) {
    return !!(s && typeof s === 'object' && (s.company || (s.companies && s.companies.length)));
  }

  /* Accepts: a state object, a wrapped {__nbsave,state}, a JSON string,
     a double-encoded JSON string, a one-row array, or base64 of any of
     those. Returns a bare state object, or null. */
  function parseAny(raw, depth) {
    depth = depth || 0;
    if (raw == null || depth > 5) return null;

    if (typeof raw === 'object') {
      if (isState(raw)) return raw;
      if (raw.state && isState(raw.state)) return raw.state;
      if (Array.isArray(raw) && raw.length) return parseAny(raw[0], depth + 1);
      if (raw.payload != null) return parseAny(raw.payload, depth + 1);
      if (raw.state != null) return parseAny(raw.state, depth + 1);
      return null;
    }

    var t = String(raw).trim();
    if (!t) return null;

    var head = t.charAt(0);
    if (head !== '{' && head !== '[' && head !== '"') {
      var dec = null;
      try { dec = decodeURIComponent(escape(atob(t))); } catch (e) { dec = null; }
      return dec ? parseAny(dec, depth + 1) : null;
    }

    var o = null;
    try { o = JSON.parse(t); } catch (e) { return null; }
    return parseAny(o, depth + 1);
  }

  function current(state) {
    if (isState(state)) return state;
    try { if (isState(window.G)) return window.G; } catch (e) {}
    return null;
  }

  /* ------------------------------------------------------- export */

  window.v28ExportCode = function (state) {
    var s = current(state);
    if (!s) throw new Error('There is no run to save yet.');
    try {
      s.meta = s.meta || {};
      s.meta.savedAt = Date.now();
      s.meta.gameVersion = VER;
    } catch (e) {}
    return JSON.stringify({ __nbsave: 1, version: VER, savedAt: Date.now(), state: s });
  };

  /* -------------------------------------------------------- apply */

  window.v28ApplyCode = function (payload) {
    var state = parseAny(payload, 0);
    if (!state) throw new Error('That save could not be read — nothing was changed.');

    if (typeof window.nbLoadState === 'function') {
      if (window.nbLoadState(state, 'cloud save') === false) {
        throw new Error('That save could not be opened.');
      }
      return true;
    }

    /* Fallback, should the v4.8 layer ever be absent. */
    try {
      if (typeof window.v471RepairState === 'function') window.v471RepairState(state);
      window.G = (typeof window.normalizeGame === 'function') ? window.normalizeGame(state) : state;
      if (typeof window.applyIndustryLabels === 'function') window.applyIndustryLabels();
      var ob = document.getElementById('onboard');
      if (ob) ob.style.display = 'none';
      if (typeof window.renderAll === 'function') window.renderAll();
      return true;
    } catch (e) {
      throw new Error('That save could not be opened: ' + ((e && e.message) || e));
    }
  };

  /* ------------------------------- rescue the start-screen loader */

  function rawLoad(key) {
    var out = null;
    try { if (window.NBSave && typeof window.NBSave.load === 'function') out = window.NBSave.load(key); } catch (e) {}
    if (out) return out;
    try { if (typeof window.__nbLegacyLoad === 'function') out = window.__nbLegacyLoad(key); } catch (e) {}
    if (out) return out;
    try {
      var raw = localStorage.getItem(key);
      if (raw) {
        var o = JSON.parse(raw);
        if (isState(o)) out = o;
        else if (o && isState(o.state)) out = o.state;
      }
    } catch (e) {}
    return out;
  }

  window.nbLoadKey = function (key) {
    var st = rawLoad(key);
    if (!st) {
      alert('That browser slot could not be read.\n\nBrowser saves are retired — your cloud saves are the ones that travel. '
          + 'Sign in and use Continue, or drop a .nbsave file on this screen.');
      return false;
    }
    var ok = (typeof window.nbLoadState === 'function')
      ? window.nbLoadState(st, 'browser save')
      : window.v28ApplyCode(JSON.stringify({ __nbsave: 1, state: st }));
    /* Lift it into the cloud so it stops being trapped in this browser. */
    if (ok !== false) { try { if (typeof window.saveToSlot === 'function') window.saveToSlot(); } catch (e) {} }
    return ok;
  };
  try { window.v471LoadKey = window.nbLoadKey; window.v27LoadKey = window.nbLoadKey; } catch (e) {}

  try { console.log('[' + VER + '] save codes ready — export/apply installed.'); } catch (e) {}
})();
