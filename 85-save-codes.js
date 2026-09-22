/* ============================================================
   v4.41 — Save codes. The missing half of the cloud system.
   v4.45 — Payload normalisation and honest diagnostics.

   70-cloud-saves.js and 80-account-gate.js both call
   window.v28ExportCode(state) and window.v28ApplyCode(text).
   Neither function had ever existed in this build (v4.41 supplied
   them), and the gate was separately destroying its own cloud
   loader (v4.44).

   v4.45 fixes the third link in the chain. The gate applies a save
   with:
       window.v28ApplyCode(String(payload))
   If the nb_get_save RPC resolves to a ROW — {slot, payload, …} —
   or to an array of rows, String() renders it as the literal text
   "[object Object]", which no parser on earth can read. Rather
   than rewrite the gate, this layer wraps NBCloud.rpc and
   normalises nb_get_save results down to the payload string
   before the gate ever sees them.

   The parser also accepts more envelope shapes, and a failure now
   reports WHAT arrived, so the next diagnosis takes seconds.
   ============================================================ */
(function () {
  'use strict';
  if (window.__v441on) return;
  window.__v441on = true;

  var VER = 'v4.45';
  var lastSeen = null;      /* whatever v28ApplyCode was last handed */

  function isState(s) {
    return !!(s && typeof s === 'object' && (s.company || (s.companies && s.companies.length)));
  }

  /* Keys a database row might hide the save payload under. */
  var PAYLOAD_KEYS = ['payload', 'p_payload', 'state', 'data', 'save', 'save_data',
                      'json', 'blob', 'content', 'code', 'value'];

  /* Accepts: a state object, a wrapped {__nbsave,state}, a database row,
     an array of rows, a JSON string, a double-encoded JSON string, or
     base64 of any of those. Returns a bare state object, or null. */
  function parseAny(raw, depth) {
    depth = depth || 0;
    if (raw == null || depth > 8) return null;

    if (typeof raw === 'object') {
      if (isState(raw)) return raw;
      if (raw.state && isState(raw.state)) return raw.state;
      if (Array.isArray(raw)) {
        for (var i = 0; i < raw.length; i++) {
          var hit = parseAny(raw[i], depth + 1);
          if (hit) return hit;
        }
        return null;
      }
      for (var k = 0; k < PAYLOAD_KEYS.length; k++) {
        var v = raw[PAYLOAD_KEYS[k]];
        if (v != null) {
          var got = parseAny(v, depth + 1);
          if (got) return got;
        }
      }
      return null;
    }

    var t = String(raw).trim();
    if (!t || t === '[object Object]') return null;

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

  /* A short, safe description of a value, for error messages. */
  function describe(x) {
    try {
      if (x == null) return 'nothing (' + String(x) + ')';
      if (typeof x === 'string') {
        return 'a ' + x.length + '-character string starting "' + x.slice(0, 60) + '"';
      }
      if (Array.isArray(x)) return 'an array of ' + x.length;
      if (typeof x === 'object') return 'an object with keys: ' + Object.keys(x).slice(0, 12).join(', ');
      return typeof x;
    } catch (e) { return 'an unreadable value'; }
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
    lastSeen = payload;
    var state = parseAny(payload, 0);
    if (!state) {
      try { console.error('[' + VER + '] unreadable save payload:', payload); } catch (e) {}
      throw new Error('That save could not be read \u2014 nothing was changed. '
        + 'The cloud returned ' + describe(payload) + '. Run NBSaveCodes.last() for the full value.');
    }

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

  /* ------------------- normalise what the cloud hands to the gate */

  /* The gate calls v28ApplyCode(String(payload)). If nb_get_save
     resolves to a row or an array of rows, String() destroys it. We
     intercept the RPC and hand the gate a clean payload string. */
  function pullPayload(res) {
    if (res == null) return res;
    if (typeof res === 'string') return res;
    var st = parseAny(res, 0);
    if (st) return JSON.stringify({ __nbsave: 1, version: VER, state: st });
    return res;
  }

  function wrapRpc() {
    try {
      var C = window.NBCloud;
      if (!C || typeof C.rpc !== 'function' || C.__v445wrapped) return false;
      var orig = C.rpc;
      C.rpc = function (fn, args) {
        var p = orig.apply(this, arguments);
        if (fn !== 'nb_get_save' || !p || typeof p.then !== 'function') return p;
        return p.then(function (res) {
          try {
            var out = pullPayload(res);
            if (out !== res) console.log('[' + VER + '] normalised nb_get_save result:', describe(res));
            return out;
          } catch (e) { return res; }
        });
      };
      C.__v445wrapped = true;
      return true;
    } catch (e) { return false; }
  }
  if (!wrapRpc()) {
    /* NBCloud may not be up yet; try again shortly, then give up quietly. */
    var tries = 0;
    var iv = setInterval(function () { if (wrapRpc() || ++tries > 40) clearInterval(iv); }, 150);
  }

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
      alert('That browser slot could not be read.\n\nBrowser saves are retired \u2014 your cloud saves are the ones that travel. '
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

  /* ---------------------------------------------------- diagnostics */

  window.NBSaveCodes = {
    version: VER,
    parse: function (x) { return parseAny(x, 0); },
    describe: describe,
    last: function () { try { console.log(lastSeen); } catch (e) {} return lastSeen; },
    /* Fetch a slot raw, bypassing the gate, and report its true shape. */
    peek: function (slot) {
      var tok = null;
      try { tok = localStorage.getItem('besim2_cloud_token'); } catch (e) {}
      if (!window.NBCloud || !window.NBCloud.rpc) return Promise.reject(new Error('Cloud module missing.'));
      return window.NBCloud.rpc('nb_get_save', { p_token: tok, p_slot: slot || 'auto' })
        .then(function (res) {
          var report = { shape: describe(res), readable: !!parseAny(res, 0), raw: res };
          try { console.log('[' + VER + '] peek(' + (slot || 'auto') + '):', report.shape,
                            report.readable ? '\u2014 readable' : '\u2014 NOT readable', res); } catch (e) {}
          return report;
        });
    }
  };

  try { console.log('[' + VER + '] save codes ready \u2014 export/apply installed, nb_get_save normalised.'); } catch (e) {}
})();
