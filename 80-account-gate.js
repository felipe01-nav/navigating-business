/* ============================================================
   v4.39 — Account gate.   (v4.44: Continue fix, see below)

   Nothing is playable until a player signs in. After sign-in the
   gate offers Continue (most recent cloud save), Load (pick a
   save) or Start a new company (hands over to the game's own
   onboarding). Sign out drops the player straight back here.

   This layer also retires the browser save system: saveToSlot /
   listSlots / loadSlot / deleteSlot become no-ops, and the
   engine's autosave is redirected into a debounced cloud save.
   The originals are captured first so existing browser runs can
   still be imported once from the Saves tab.

   v4.44 — THE CONTINUE BUG.
   This file declared a module-local `function loadSlot(slot)` for
   the cloud load, and then, while retiring the browser system, ran
   `loadSlot = window.loadSlot;`. Inside this IIFE that bare name
   resolves to the LOCAL function, not the global, so the gate
   overwrote its own cloud loader with the no-op stub that returns
   null. Continue therefore did nothing at all — no error, no log,
   no network call. The local function is now named loadCloudSlot,
   and the bare re-assignments are gone; window.* assignment is
   sufficient for classic-script globals in any case.

   Escape hatches, should anything go wrong:
     ?nogate=1  — skip the gate entirely
     ?legacy=1  — keep the old browser save functions alive
   ============================================================ */
(function () {
  'use strict';
  if (window.__v439on) return;
  window.__v439on = true;

  var Q = (function () {
    try { return new URLSearchParams(location.search); } catch (e) { return { get: function () { return null; } }; }
  })();
  var NOGATE = Q.get('nogate') === '1';
  var KEEPLOCAL = Q.get('legacy') === '1';

  var K_TOKEN = 'besim2_cloud_token';
  var K_CODE  = 'besim2_cloud_code';
  var K_AUTO  = 'besim2_cloud_autosync';
  var S_NEW   = 'nbgate_newgame';

  var ERR = [];
  function err(w, e) { if (ERR.length < 50) ERR.push(w + ': ' + ((e && e.message) || e)); }

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function token() { return get(K_TOKEN); }
  function code() { return get(K_CODE); }
  function autoOn() { return get(K_AUTO) !== '0'; }

  function rpc(fn, args) {
    if (window.NBCloud && window.NBCloud.rpc) return window.NBCloud.rpc(fn, args);
    return Promise.reject(new Error('Cloud module missing.'));
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function when(ts) { try { return new Date(ts).toLocaleString(); } catch (e) { return ''; } }
  function money(n) {
    if (n == null) return '';
    try { if (typeof fmt$ === 'function') return fmt$(n); } catch (e) {}
    var x = Number(n);
    return isFinite(x) ? '$' + Math.round(x).toLocaleString() : '';
  }
  function hasGame() {
    try { return !!(window.G && window.G.company); } catch (e) { return false; }
  }

  /* ----------------------------------------- capture the legacy system */

  var legacy = {
    list: (typeof window.listSlots === 'function') ? window.listSlots : null,
    load: (typeof window.loadSlot === 'function') ? window.loadSlot : null
  };
  window.__nbLegacyList = function () {
    try { return legacy.list ? (legacy.list() || []) : []; } catch (e) { err('legacyList', e); return []; }
  };
  window.__nbLegacyLoad = function (k) {
    try { return legacy.load ? legacy.load(k) : null; } catch (e) { err('legacyLoad', e); return null; }
  };

  function clearLocalRuns() {
    try {
      var kill = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('besim2_') === 0 && k.indexOf('besim2_cloud') !== 0) kill.push(k);
      }
      kill.forEach(function (k) { set(k, null); });
    } catch (e) { err('clearLocal', e); }
  }

  /* ------------------------------------------------------------ styles */

  var CSS = ''
    + '#nbGate{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;'
    + 'background:radial-gradient(circle at 30% 20%,#1d2230,#101217 70%);padding:16px;'
    + 'font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#e8ecf3;overflow:auto;}'
    + '#nbGate .gcard{background:#171a21;border:1px solid #2a3140;border-radius:16px;padding:28px;'
    + 'width:min(520px,100%);box-shadow:0 20px 60px rgba(0,0,0,.5);max-height:90vh;overflow:auto;}'
    + '#nbGate h1{font-size:21px;margin:0 0 6px;}'
    + '#nbGate p.sub{color:#8e9bb0;font-size:13px;margin:0 0 18px;}'
    + '#nbGate label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#8e9bb0;margin-top:10px;}'
    + '#nbGate input{width:100%;box-sizing:border-box;background:#0f1116;color:#e8ecf3;border:1px solid #2a3140;'
    + 'border-radius:9px;padding:10px 11px;margin-top:5px;font-size:15px;}'
    + '#nbGate .gbtn{display:block;width:100%;box-sizing:border-box;text-align:left;background:#2a6df4;color:#fff;'
    + 'border:0;border-radius:10px;padding:12px 14px;font:600 14px system-ui,sans-serif;cursor:pointer;margin-top:10px;}'
    + '#nbGate .gbtn.sec{background:#222833;color:#dbe3ef;border:1px solid #2f3747;}'
    + '#nbGate .gbtn small{display:block;font-weight:400;font-size:11.5px;opacity:.75;margin-top:2px;}'
    + '#nbGate .gbtn:disabled{opacity:.45;cursor:default;}'
    + '#nbGate .grow{display:flex;gap:10px;align-items:center;justify-content:space-between;'
    + 'border:1px solid #2a3140;border-radius:10px;padding:10px 12px;margin-top:8px;}'
    + '#nbGate .grow b{display:block;font-size:13px;}'
    + '#nbGate .grow span{font-size:11px;color:#8e9bb0;}'
    + '#nbGate .grow button{background:#2a6df4;color:#fff;border:0;border-radius:8px;padding:8px 12px;'
    + 'font:600 12px system-ui,sans-serif;cursor:pointer;}'
    + '#nbGate .gmsg{border-radius:9px;padding:9px 11px;margin-top:12px;font-size:12.5px;display:none;}'
    + '#nbGate .gmsg.show{display:block;}'
    + '#nbGate .gmsg.err{background:rgba(220,70,90,.16);color:#f3a2ae;}'
    + '#nbGate .gmsg.ok{background:rgba(40,170,100,.16);color:#7fe0a8;}'
    + '#nbGate .gmsg.info{background:rgba(90,140,220,.16);color:#a9c6ef;}'
    + '#nbGate .glink{background:none;border:0;color:#8e9bb0;font-size:12px;cursor:pointer;'
    + 'text-decoration:underline;padding:0;margin-top:14px;}';

  try {
    var st = document.createElement('style');
    st.id = 'nb-gate-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  } catch (e) { err('css', e); }

  /* -------------------------------------------------------------- gate */

  var gate = null;
  var saves = [];

  function msg(text, kind) {
    var m = gate && gate.querySelector('.gmsg');
    if (!m) return;
    m.className = 'gmsg show ' + (kind || 'info');
    m.textContent = text;
  }

  function ensure() {
    if (gate) return gate;
    gate = document.createElement('div');
    gate.id = 'nbGate';
    gate.innerHTML = '<div class="gcard"></div>';
    (document.body || document.documentElement).appendChild(gate);
    return gate;
  }

  function card() { return gate.querySelector('.gcard'); }

  function down() {
    try {
      if (gate && gate.parentNode) gate.parentNode.removeChild(gate);
      gate = null;
    } catch (e) { err('down', e); }
  }

  /* ---------- step 1: sign in ---------- */

  function viewSignIn() {
    ensure();
    card().innerHTML = ''
      + '<h1>NAVigating Business</h1>'
      + '<p class="sub">Sign in with your player code. Your companies are stored in the cloud, '
      + 'so they follow you to any computer or phone.</p>'
      + '<label>Player code</label>'
      + '<input id="gCode" maxlength="12" autocapitalize="characters" placeholder="e.g. FG01" />'
      + '<label>PIN</label>'
      + '<input id="gPin" type="password" inputmode="numeric" maxlength="8" placeholder="4\u20138 digits" />'
      + '<button class="gbtn" data-g="login">Sign in</button>'
      + '<button class="gbtn sec" data-g="toreg">I am new here<small>Create a player code</small></button>'
      + '<div class="gmsg"></div>';
    focus('gCode');
  }

  function viewRegister() {
    ensure();
    card().innerHTML = ''
      + '<h1>Create your player code</h1>'
      + '<p class="sub">Pick something short you will remember. No email, no password \u2014 the PIN just '
      + 'keeps other players out of your saves.</p>'
      + '<label>Player code</label>'
      + '<input id="gCode" maxlength="12" autocapitalize="characters" placeholder="2\u201312 letters or numbers" />'
      + '<label>PIN</label>'
      + '<input id="gPin" type="password" inputmode="numeric" maxlength="8" placeholder="4\u20138 digits" />'
      + '<label>Display name (optional)</label>'
      + '<input id="gName" maxlength="40" placeholder="Shown on the leaderboard" />'
      + '<button class="gbtn" data-g="register">Create and sign in</button>'
      + '<button class="glink" data-g="tologin">I already have a code</button>'
      + '<div class="gmsg"></div>';
    focus('gCode');
  }

  function focus(id) {
    setTimeout(function () { try { document.getElementById(id).focus(); } catch (e) {} }, 40);
  }

  function auth(kind) {
    var c = (document.getElementById('gCode') || {}).value || '';
    var p = (document.getElementById('gPin') || {}).value || '';
    var n = (document.getElementById('gName') || {}).value || '';
    c = c.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,12}$/.test(c)) return msg('Player code must be 2\u201312 letters or numbers.', 'err');
    if (!/^[0-9]{4,8}$/.test(p)) return msg('PIN must be 4\u20138 digits.', 'err');
    msg('Signing in\u2026', 'info');
    var call = kind === 'login'
      ? rpc('nb_login', { p_code: c, p_pin: p })
      : rpc('nb_register', { p_code: c, p_pin: p, p_name: n });
    call.then(function (tok) {
      set(K_TOKEN, tok);
      set(K_CODE, c);
      viewChoose();
    }).catch(function (e) { msg(e.message, 'err'); });
  }

  /* ---------- step 2: continue / load / new ---------- */

  function viewChoose() {
    ensure();
    card().innerHTML = ''
      + '<h1>Welcome back, ' + esc(code()) + '</h1>'
      + '<p class="sub">Loading your saves\u2026</p>'
      + '<div class="gmsg"></div>';
    rpc('nb_list_saves', { p_token: token() }).then(function (rows) {
      saves = rows || [];
      paintChoose();
    }).catch(function (e) {
      if (/Session expired/i.test(e.message || '')) {
        set(K_TOKEN, null);
        viewSignIn();
        return msg('Your session expired. Sign in again.', 'err');
      }
      saves = [];
      paintChoose();
      msg('Could not reach the cloud: ' + e.message, 'err');
    });
  }

  function paintChoose() {
    var top = saves[0];
    var sub = top ? [top.company, (top.month && top.year) ? ('Month ' + top.month + ', Year ' + top.year) : '',
                     money(top.cash)].filter(Boolean).join(' \u00b7 ') : '';
    card().innerHTML = ''
      + '<h1>Welcome back, ' + esc(code()) + '</h1>'
      + '<p class="sub">' + (saves.length
          ? 'You have ' + saves.length + ' saved compan' + (saves.length === 1 ? 'y' : 'ies') + '.'
          : 'No saved companies yet \u2014 time to start one.') + '</p>'
      + (top
          ? '<button class="gbtn" data-g="continue">Continue<small>' + esc(top.label || top.slot)
            + (sub ? ' \u00b7 ' + esc(sub) : '') + '</small></button>'
          : '')
      + (saves.length > 1
          ? '<button class="gbtn sec" data-g="toload">Load a different save<small>'
            + saves.length + ' available</small></button>'
          : '')
      + '<button class="gbtn' + (top ? ' sec' : '') + '" data-g="new">Start a new company'
      + '<small>Takes you through setting up a fresh business</small></button>'
      + '<button class="glink" data-g="signout">Sign out</button>'
      + '<div class="gmsg"></div>';
  }

  function viewLoad() {
    ensure();
    card().innerHTML = ''
      + '<h1>Load a save</h1>'
      + '<p class="sub">Most recent first.</p>'
      + saves.map(function (s) {
          var sub = [s.company, (s.month && s.year) ? ('Month ' + s.month + ', Year ' + s.year) : '',
                     money(s.cash), when(s.updated_at)].filter(Boolean).join(' \u00b7 ');
          return '<div class="grow"><div><b>' + esc(s.label || s.slot) + '</b><span>' + esc(sub) + '</span></div>'
            + '<button data-g="pick" data-slot="' + esc(s.slot) + '">Load</button></div>';
        }).join('')
      + '<button class="glink" data-g="back">Back</button>'
      + '<div class="gmsg"></div>';
  }

  /* ---------- loading a save ----------
     NOTE: deliberately NOT called loadSlot. See the v4.44 note at the
     top of this file — that name collides with the browser-save stub
     installed further down, which silently killed Continue. */

  function loadCloudSlot(slot) {
    msg('Loading\u2026', 'info');
    rpc('nb_get_save', { p_token: token(), p_slot: slot }).then(function (payload) {
      if (payload == null || String(payload) === '') throw new Error('That save came back empty.');
      if (typeof window.v28ApplyCode !== 'function') throw new Error('This build cannot apply save codes.');
      return window.v28ApplyCode(String(payload));
    }).then(function () {
      try {
        var ob = document.getElementById('onboard');
        if (ob) ob.style.display = 'none';
      } catch (e) {}
      down();
      try { if (typeof renderScreen === 'function') renderScreen(); } catch (e) {}
      try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
    }).catch(function (e) {
      err('loadCloudSlot', e);
      try { console.error('[gate] Continue failed:', e); } catch (x) {}
      msg((e && e.message) || 'Could not load that save.', 'err');
    });
  }

  /* ---------- starting fresh / signing out ---------- */

  function pushThenReload(flagNew) {
    function go() {
      try { clearLocalRuns(); } catch (e) {}
      try { if (flagNew) sessionStorage.setItem(S_NEW, '1'); } catch (e) {}
      location.reload();
    }
    /* never discard an unsaved run: push it to the cloud first */
    if (token() && autoOn() && hasGame() && typeof window.v28ExportCode === 'function') {
      msg('Saving your current run to the cloud first\u2026', 'info');
      Promise.resolve(window.v28ExportCode(window.G)).then(function (payload) {
        var g = window.G || {}, c = g.company || {};
        return rpc('nb_put_save', {
          p_token: token(), p_slot: 'auto', p_label: 'Autosave \u2014 ' + ((g.meta && g.meta.name) || c.name || 'run'),
          p_payload: String(payload), p_company: (g.meta && g.meta.name) || c.name || null,
          p_month: g.month || null, p_year: g.year || null, p_cash: (c.cash != null ? c.cash : null)
        });
      }).then(go).catch(go);
    } else { go(); }
  }

  function newGame() { pushThenReload(true); }

  function signOut() {
    set(K_TOKEN, null);
    try { sessionStorage.removeItem(S_NEW); } catch (e) {}
    pushThenReload(false);
  }

  /* ---------------------------------------------------------- handlers */

  document.addEventListener('click', function (ev) {
    try {
      var t = ev.target;
      if (!t || !t.closest) return;
      var b = t.closest('#nbGate [data-g]');
      if (!b) return;
      ev.preventDefault();
      ev.stopPropagation();
      var a = b.getAttribute('data-g');
      if (a === 'login') return auth('login');
      if (a === 'register') return auth('register');
      if (a === 'toreg') return viewRegister();
      if (a === 'tologin') return viewSignIn();
      if (a === 'continue') {
        if (!saves.length || !saves[0]) return msg('There is no save to continue.', 'err');
        return loadCloudSlot(saves[0].slot);
      }
      if (a === 'toload') return viewLoad();
      if (a === 'back') return paintChoose();
      if (a === 'pick') return loadCloudSlot(b.getAttribute('data-slot'));
      if (a === 'new') return newGame();
      if (a === 'signout') { set(K_TOKEN, null); return viewSignIn(); }
    } catch (e) { err('click', e); try { console.error('[gate] click', e); } catch (x) {} }
  }, true);

  document.addEventListener('keydown', function (ev) {
    try {
      if (ev.key !== 'Enter' || !gate) return;
      var t = ev.target;
      if (!t || t.tagName !== 'INPUT' || !gate.contains(t)) return;
      ev.preventDefault();
      var reg = !!document.getElementById('gName');
      auth(reg ? 'register' : 'login');
    } catch (e) { err('key', e); }
  }, true);

  /* ------------------------------------------------------------- boot */

  function boot() {
    if (NOGATE) return;

    var wantedNew = false;
    try {
      wantedNew = sessionStorage.getItem(S_NEW) === '1';
      if (wantedNew) sessionStorage.removeItem(S_NEW);
    } catch (e) {}

    if (wantedNew) return;                 /* let the game's onboarding run */
    if (token()) viewChoose();
    else viewSignIn();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* --------------------------------- retire the browser save system */

  var pending = null;
  function cloudAutosave() {
    if (!token() || !autoOn() || !hasGame()) return;
    if (typeof window.v28ExportCode !== 'function') return;
    if (pending) clearTimeout(pending);
    pending = setTimeout(function () {
      pending = null;
      Promise.resolve(window.v28ExportCode(window.G)).then(function (payload) {
        var g = window.G || {}, c = g.company || {};
        return rpc('nb_put_save', {
          p_token: token(), p_slot: 'auto',
          p_label: 'Autosave \u2014 ' + ((g.meta && g.meta.name) || c.name || 'run'),
          p_payload: String(payload), p_company: (g.meta && g.meta.name) || c.name || null,
          p_month: g.month || null, p_year: g.year || null, p_cash: (c.cash != null ? c.cash : null)
        });
      }).catch(function () { /* silent */ });
    }, 2500);
  }

  if (!KEEPLOCAL) {
    try {
      /* window.* assignment is enough for classic-script globals. The bare
         re-assignments that used to live here (saveToSlot = window.saveToSlot,
         and so on) resolved to this IIFE's own locals and destroyed the
         cloud loader. They are gone for good. */
      window.saveToSlot = function () { cloudAutosave(); return true; };
      window.listSlots  = function () { return []; };
      window.loadSlot   = function () { return null; };
      window.deleteSlot = function () { return true; };
      if (window.NBSave) {
        window.NBSave.save = function () { cloudAutosave(); return true; };
        window.NBSave.list = function () { return []; };
        window.NBSave.load = function () { return null; };
        window.NBSave.remove = function () { return true; };
      }
    } catch (e) { err('retire', e); }
  }

  window.NBGate = {
    signOut: signOut,
    newGame: newGame,
    open: function () { if (token()) viewChoose(); else viewSignIn(); },
    load: function (slot) { return loadCloudSlot(slot || (saves[0] && saves[0].slot)); },
    saves: function () { return saves.slice(); },
    legacy: function () { return window.__nbLegacyList(); },
    errs: function () { return ERR.slice(); }
  };
})();
