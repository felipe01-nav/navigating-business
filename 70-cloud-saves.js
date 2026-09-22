/* ============================================================
   v4.38 — Cloud saves replace the browser save system.

   The Saves tab is rebuilt entirely: renderSaves() is overridden
   so the tab renders sign-in, cloud slots, autosave-to-cloud and
   the leaderboard. Browser localStorage slots are no longer the
   save system — they appear only as a one-time "import to cloud"
   list so nobody loses an existing run.

   The engine's internal autosave (saveToSlot) is left alone on
   purpose: it is now a crash buffer, not a user-facing feature.
   Every month close also pushes a cloud autosave when signed in.

   Talks to the Supabase RPCs in supabase-schema.sql.
   The key below is the PUBLIC anon key. Never put a secret here.
   Exports window.NBCloud.
   ============================================================ */
(function () {
  'use strict';
  if (window.__v438on) return;
  window.__v438on = true;

  var BASE = 'https://pzgrxfyogymctiumbszb.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Z3J4ZnlvZ3ltY3RpdW1ic3piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwOTE4ODUsImV4cCI6MjEwNTY2Nzg4NX0.V35JeWqwuWS7wQwbMwD63HMziizCZS46DpROB0lB7pk';

  var K_TOKEN = 'besim2_cloud_token';
  var K_CODE  = 'besim2_cloud_code';
  var K_AUTO  = 'besim2_cloud_autosync';
  var K_PING  = 'besim2_cloud_lastping';

  var ERR = [];
  function err(w, e) { if (ERR.length < 50) ERR.push(w + ': ' + ((e && e.message) || e)); }

  /* ------------------------------------------------------------ storage */

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function token() { return get(K_TOKEN); }
  function code() { return get(K_CODE); }
  function autoOn() { return get(K_AUTO) !== '0'; }   /* default ON */

  /* ---------------------------------------------------------------- rpc */

  function rpc(fn, args) {
    return fetch(BASE + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: {
        'apikey': ANON,
        'Authorization': 'Bearer ' + ANON,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(args || {})
    }).then(function (r) {
      return r.text().then(function (t) {
        var d = null;
        try { d = t ? JSON.parse(t) : null; } catch (e) { d = t; }
        if (!r.ok) {
          var m = (d && (d.message || d.hint || d.details)) || ('Request failed (' + r.status + ')');
          var e2 = new Error(String(m));
          e2.status = r.status;
          throw e2;
        }
        return d;
      });
    });
  }

  function expired(e) {
    if (e && /Session expired/i.test(e.message || '')) { set(K_TOKEN, null); return true; }
    return false;
  }

  /* -------------------------------------------------------- game bridge */

  function state() {
    try { if (typeof G !== 'undefined' && G) return G; } catch (e) {}
    return window.G || null;
  }
  function hasGame() {
    var g = state();
    return !!(g && g.company);
  }
  function num(v) { var n = Number(v); return isFinite(n) ? n : null; }
  function money(n) {
    if (n == null) return '';
    try { if (typeof fmt$ === 'function') return fmt$(n); } catch (e) {}
    var x = Number(n);
    return isFinite(x) ? '$' + Math.round(x).toLocaleString() : '';
  }

  function meta() {
    var g = state() || {}, m = { company: null, month: null, year: null, cash: null };
    try {
      var c = g.company || {};
      var nm = (g.meta && g.meta.name) || c.name || null;
      m.company = (typeof nm === 'string' && nm) ? nm.slice(0, 80) : null;
      m.month = num(g.month != null ? g.month : c.month);
      m.year  = num(g.year != null ? g.year : c.year);
      m.cash  = num(c.cash != null ? c.cash : g.cash);
    } catch (e) { err('meta', e); }
    return m;
  }

  function exportCode() {
    var g = state();
    if (!g) return Promise.reject(new Error('No game in progress yet.'));
    if (typeof window.v28ExportCode !== 'function') {
      return Promise.reject(new Error('This build has no portable save codes.'));
    }
    return Promise.resolve(window.v28ExportCode(g));
  }
  function applyCode(payload) {
    if (typeof window.v28ApplyCode !== 'function') {
      return Promise.reject(new Error('This build cannot apply save codes.'));
    }
    return Promise.resolve(window.v28ApplyCode(payload));
  }

  /* legacy browser slots — import only */
  function localSlots() {
    try {
      if (typeof window.listSlots !== 'function') return [];
      return (window.listSlots() || []).filter(Boolean);
    } catch (e) { err('localSlots', e); return []; }
  }

  /* ------------------------------------------------------------- styles */

  var CSS = ''
    + '.nbc-msg{border-radius:9px;padding:9px 11px;margin:10px 0;font-size:12.5px;display:none;}'
    + '.nbc-msg.show{display:block;}'
    + '.nbc-msg.ok{background:rgba(40,170,100,.14);color:#7fe0a8;}'
    + '.nbc-msg.err{background:rgba(220,70,90,.14);color:#f3a2ae;}'
    + '.nbc-msg.info{background:rgba(90,140,220,.14);color:#a9c6ef;}'
    + '.nbc-row{display:flex;gap:10px;align-items:center;justify-content:space-between;'
    + 'border:1px solid var(--border,#293042);border-radius:10px;padding:9px 11px;margin-bottom:7px;}'
    + '.nbc-row .who{min-width:0;}'
    + '.nbc-row .who b{display:block;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
    + '.nbc-row .who span{font-size:11px;opacity:.7;}'
    + '.nbc-row .act{white-space:nowrap;}'
    + '.nbc-in{background:rgba(0,0,0,.25);color:inherit;border:1px solid var(--border,#293042);'
    + 'border-radius:8px;padding:9px 10px;margin:4px 0 10px;font-size:14px;width:100%;box-sizing:border-box;}'
    + '.nbc-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 12px;}'
    + '@media(max-width:560px){.nbc-grid{grid-template-columns:1fr;}}'
    + '.nbc-who{font-size:12px;opacity:.75;margin-bottom:8px;}'
    + '.nbc-bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:4px 0 2px;}'
    + '.nbc-chk{display:flex;gap:8px;align-items:center;font-size:12px;opacity:.85;margin-top:10px;}'
    + '.nbc-chk input{width:auto;margin:0;}';

  try {
    if (!document.getElementById('nbc-css')) {
      var st = document.createElement('style');
      st.id = 'nbc-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
  } catch (e) { err('css', e); }

  /* -------------------------------------------------------------- utils */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function when(ts) {
    if (!ts) return '';
    try { return new Date(ts).toLocaleString(); } catch (e) { return String(ts); }
  }
  function say(text, kind) {
    var el = document.querySelector('.nbc-msg');
    if (!el) return;
    el.className = 'nbc-msg show ' + (kind || 'info');
    el.textContent = text;
  }
  function repaint() {
    try { if (typeof renderScreen === 'function') renderScreen(); } catch (e) { err('repaint', e); }
  }

  /* -------------------------------------------------------- saves screen */

  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return d.firstElementChild;
  }

  function signInCard() {
    return ''
      + '<div class="card" data-nbc="1">'
      + '<h3>\u2601\uFE0F Your saves live in the cloud</h3>'
      + '<div class="muted" style="font-size:12px;margin-bottom:10px;">'
      + 'Pick a player code and a PIN. No email, no password. Your code is how your saves find you '
      + 'on any computer, browser or phone.</div>'
      + '<div class="nbc-msg"></div>'
      + '<div class="nbc-grid">'
      +   '<div><label class="muted" style="font-size:11px;">Player code</label>'
      +   '<input class="nbc-in" id="nbcCode" placeholder="e.g. FG01" maxlength="12" autocapitalize="characters" /></div>'
      +   '<div><label class="muted" style="font-size:11px;">PIN (4\u20138 digits)</label>'
      +   '<input class="nbc-in" id="nbcPin" type="password" inputmode="numeric" maxlength="8" placeholder="\u2022\u2022\u2022\u2022" /></div>'
      + '</div>'
      + '<div class="nbc-bar"><button class="btn small" data-nbc-act="login">Sign in</button></div>'
      + '<h3 style="margin-top:16px;">New player</h3>'
      + '<label class="muted" style="font-size:11px;">Display name for the leaderboard (optional)</label>'
      + '<input class="nbc-in" id="nbcName" maxlength="40" placeholder="Your name" />'
      + '<div class="nbc-bar"><button class="btn secondary small" data-nbc-act="register">Create my code</button></div>'
      + '<div class="muted" style="font-size:11px;margin-top:8px;">'
      + 'A PIN keeps other players out of your slots. It is not bank security \u2014 do not reuse a real password.</div>'
      + '</div>';
  }

  function accountCard() {
    return ''
      + '<div class="card" data-nbc="1">'
      + '<h3>\u2601\uFE0F Cloud saves</h3>'
      + '<div class="nbc-who">Signed in as <b>' + esc(code()) + '</b> \u00b7 saves follow this code on any device.</div>'
      + '<div class="nbc-msg"></div>'
      + '<div class="nbc-bar">'
      +   '<button class="btn small" data-nbc-act="save"' + (hasGame() ? '' : ' disabled') + '>Save this game</button>'
      +   '<button class="btn secondary small" data-nbc-act="refresh">Refresh</button>'
      +   '<button class="btn secondary small" data-nbc-act="score"' + (hasGame() ? '' : ' disabled') + '>Submit score</button>'
      +   '<button class="btn secondary small" data-nbc-act="logout">Sign out</button>'
      + '</div>'
      + '<label class="nbc-chk"><input type="checkbox" data-nbc-act="auto"' + (autoOn() ? ' checked' : '') + ' />'
      + 'Autosave to the cloud every month close</label>'
      + '<h3 style="margin-top:16px;">My saves</h3>'
      + '<div id="nbcList"><div class="muted" style="font-size:12px;">Loading\u2026</div></div>'
      + '</div>';
  }

  function legacyCard() {
    var slots = localSlots();
    if (!slots.length) return '';
    var rows = slots.map(function (s) {
      var key = s.key || s.slot || s.id || '';
      var label = s.label || s.name || key;
      var sub = [s.company, when(s.when || s.ts || s.updated)].filter(Boolean).join(' \u00b7 ');
      return '<div class="nbc-row"><div class="who"><b>' + esc(label) + '</b><span>' + esc(sub) + '</span></div>'
        + '<div class="act"><button class="btn secondary small" data-nbc-act="import" data-nbc-key="' + esc(key) + '">'
        + 'Move to cloud</button></div></div>';
    }).join('');
    return ''
      + '<div class="card mt14" data-nbc="1">'
      + '<h3>\u{1F4E6} Old browser saves</h3>'
      + '<div class="muted" style="font-size:12px;margin-bottom:10px;">'
      + 'These are trapped in this browser and will vanish if site data is cleared. '
      + 'Move them to the cloud once, then forget they existed.</div>'
      + rows
      + '</div>';
  }

  function leaderboardCard() {
    return ''
      + '<div class="card mt14" data-nbc="1">'
      + '<h3>\u{1F3C6} Leaderboard</h3>'
      + '<div id="nbcBoard"><button class="btn secondary small" data-nbc-act="board">Show top 50</button></div>'
      + '</div>';
  }

  function buildSaves() {
    var wrap = document.createElement('div');
    wrap.setAttribute('data-nbc-root', '1');
    wrap.innerHTML = (token() ? accountCard() : signInCard()) + legacyCard() + leaderboardCard();
    if (token()) setTimeout(refreshList, 0);
    return wrap;
  }

  /* ------------------------------------------------------------ actions */

  function refreshList() {
    var host = document.getElementById('nbcList');
    if (!host || !token()) return;
    return rpc('nb_list_saves', { p_token: token() }).then(function (rows) {
      if (!rows || !rows.length) {
        host.innerHTML = '<div class="muted" style="font-size:12px;">No cloud saves yet. '
          + 'Press <b>Save this game</b> above.</div>';
        return;
      }
      host.innerHTML = rows.map(function (r) {
        var sub = [r.company, (r.month && r.year) ? ('Month ' + r.month + ', Year ' + r.year) : '',
                   money(r.cash), when(r.updated_at)].filter(Boolean).join(' \u00b7 ');
        return '<div class="nbc-row"><div class="who"><b>' + esc(r.label || r.slot) + '</b>'
          + '<span>' + esc(sub) + '</span></div><div class="act">'
          + '<button class="btn small" data-nbc-act="load" data-nbc-slot="' + esc(r.slot) + '">Load</button> '
          + '<button class="btn danger small" data-nbc-act="del" data-nbc-slot="' + esc(r.slot) + '">Delete</button>'
          + '</div></div>';
      }).join('');
    }).catch(function (e) {
      if (expired(e)) { repaint(); return; }
      host.innerHTML = '<div class="muted" style="font-size:12px;">' + esc(e.message) + '</div>';
    });
  }

  function defaultLabel() {
    var m = meta(), bits = [];
    if (m.company) bits.push(m.company);
    if (m.month && m.year) bits.push('M' + m.month + ' Y' + m.year);
    return bits.length ? bits.join(' \u2014 ') : 'Save ' + new Date().toLocaleDateString();
  }

  function putSave(slot, label, payload) {
    var m = meta();
    return rpc('nb_put_save', {
      p_token: token(), p_slot: slot, p_label: label, p_payload: String(payload),
      p_company: m.company, p_month: m.month, p_year: m.year, p_cash: m.cash
    });
  }

  function doSave() {
    var label = window.prompt('Name this save:', defaultLabel());
    if (label === null) return;
    say('Packing your game\u2026', 'info');
    exportCode().then(function (payload) {
      return putSave('c' + Date.now().toString(36), String(label).slice(0, 80) || defaultLabel(), payload);
    }).then(function () {
      say('Saved to the cloud.', 'ok');
      refreshList();
    }).catch(function (e) {
      if (expired(e)) { repaint(); return; }
      say(e.message, 'err');
    });
  }

  function doImport(key) {
    if (!token()) return say('Sign in first, then move your old saves across.', 'err');
    if (typeof window.loadSlot !== 'function') return say('Cannot read that browser slot.', 'err');
    say('Reading the old save\u2026', 'info');
    Promise.resolve().then(function () {
      var st = window.loadSlot(key);
      if (!st) throw new Error('That browser slot is empty.');
      if (typeof window.v28ExportCode !== 'function') throw new Error('No export path in this build.');
      return window.v28ExportCode(st);
    }).then(function (payload) {
      return rpc('nb_put_save', {
        p_token: token(), p_slot: 'imp' + Date.now().toString(36),
        p_label: 'Imported \u2014 ' + String(key).slice(-12), p_payload: String(payload),
        p_company: null, p_month: null, p_year: null, p_cash: null
      });
    }).then(function () {
      say('Moved to the cloud.', 'ok');
      refreshList();
    }).catch(function (e) {
      if (expired(e)) { repaint(); return; }
      say(e.message, 'err');
    });
  }

  function doLoad(slot) {
    if (!window.confirm('Load this save? Anything unsaved in the current run is replaced.')) return;
    say('Loading\u2026', 'info');
    rpc('nb_get_save', { p_token: token(), p_slot: slot })
      .then(function (payload) { return applyCode(String(payload)); })
      .then(function () { say('Loaded.', 'ok'); repaint(); })
      .catch(function (e) { if (!expired(e)) say(e.message, 'err'); else repaint(); });
  }

  function doDelete(slot) {
    if (!window.confirm('Delete this cloud save? This cannot be undone.')) return;
    rpc('nb_delete_save', { p_token: token(), p_slot: slot })
      .then(function () { say('Deleted.', 'ok'); refreshList(); })
      .catch(function (e) { if (!expired(e)) say(e.message, 'err'); else repaint(); });
  }

  function doAuth(kind) {
    var c = (document.getElementById('nbcCode') || {}).value || '';
    var p = (document.getElementById('nbcPin') || {}).value || '';
    var n = (document.getElementById('nbcName') || {}).value || '';
    c = c.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,12}$/.test(c)) return say('Player code must be 2\u201312 letters or numbers.', 'err');
    if (!/^[0-9]{4,8}$/.test(p)) return say('PIN must be 4\u20138 digits.', 'err');
    say('Working\u2026', 'info');
    var call = kind === 'login'
      ? rpc('nb_login', { p_code: c, p_pin: p })
      : rpc('nb_register', { p_code: c, p_pin: p, p_name: n });
    call.then(function (tok) {
      set(K_TOKEN, tok); set(K_CODE, c);
      repaint();
      setTimeout(function () { say('Signed in as ' + c + '.', 'ok'); }, 30);
    }).catch(function (e) { say(e.message, 'err'); });
  }

  function doScore() {
    var m = meta();
    if (m.cash == null) return say('No score to submit yet.', 'err');
    rpc('nb_submit_score', {
      p_token: token(), p_score: m.cash, p_company: m.company, p_month: m.month, p_year: m.year
    }).then(function () {
      say('Score submitted: ' + money(m.cash) + '. Only your best is kept.', 'ok');
    }).catch(function (e) { if (!expired(e)) say(e.message, 'err'); else repaint(); });
  }

  function doBoard() {
    var host = document.getElementById('nbcBoard');
    if (!host) return;
    host.innerHTML = '<div class="muted" style="font-size:12px;">Loading\u2026</div>';
    rpc('nb_leaderboard', {}).then(function (rows) {
      host.innerHTML = (!rows || !rows.length)
        ? '<div class="muted" style="font-size:12px;">Nobody has posted a score yet.</div>'
        : rows.map(function (r, i) {
            return '<div class="nbc-row"><div class="who"><b>' + (i + 1) + '. ' + esc(r.display_name || '\u2014')
              + '</b><span>' + esc(r.company || '') + '</span></div>'
              + '<div class="act"><b>' + money(r.score) + '</b></div></div>';
          }).join('');
    }).catch(function (e) {
      host.innerHTML = '<div class="muted" style="font-size:12px;">' + esc(e.message) + '</div>';
    });
  }

  /* ------------------------------------------------- delegated handlers */

  document.addEventListener('click', function (ev) {
    try {
      var t = ev.target;
      if (!t || !t.closest) return;
      var b = t.closest('[data-nbc-act]');
      if (!b) return;
      var act = b.getAttribute('data-nbc-act');
      if (act === 'auto') return;   /* handled on change */
      ev.preventDefault();
      ev.stopPropagation();

      if (act === 'login' || act === 'register') return doAuth(act);
      if (act === 'logout') {
        set(K_TOKEN, null);
        repaint();
        return setTimeout(function () { say('Signed out. Your saves stay in the cloud.', 'ok'); }, 30);
      }
      if (act === 'save')    return doSave();
      if (act === 'refresh') return refreshList();
      if (act === 'score')   return doScore();
      if (act === 'board')   return doBoard();
      if (act === 'load')    return doLoad(b.getAttribute('data-nbc-slot'));
      if (act === 'del')     return doDelete(b.getAttribute('data-nbc-slot'));
      if (act === 'import')  return doImport(b.getAttribute('data-nbc-key'));
    } catch (e) { err('click', e); }
  }, true);

  document.addEventListener('change', function (ev) {
    try {
      var t = ev.target;
      if (!t || !t.getAttribute || t.getAttribute('data-nbc-act') !== 'auto') return;
      set(K_AUTO, t.checked ? '1' : '0');
      say(t.checked ? 'Cloud autosave on.' : 'Cloud autosave off.', 'ok');
    } catch (e) { err('change', e); }
  }, true);

  /* ------------------------------------------ take over the Saves tab */

  function install() {
    try {
      if (typeof window.renderSaves === 'function') {
        window.renderSaves = buildSaves;
        return true;
      }
      if (typeof renderSaves === 'function') {   /* bare global */
        renderSaves = buildSaves;
        window.renderSaves = buildSaves;
        return true;
      }
    } catch (e) { err('install', e); }
    return false;
  }

  var installed = install();
  if (!installed) {
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (install() || tries > 40) clearInterval(iv);
    }, 250);
  }

  /* fallback: if the Saves tab never appears, give a corner button */
  setTimeout(function () {
    try {
      if (window.renderSaves === buildSaves) return;
      if (document.getElementById('nbCloudBtn')) return;
      var b = document.createElement('button');
      b.id = 'nbCloudBtn';
      b.type = 'button';
      b.textContent = '\u2601 Cloud saves';
      b.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:99998;border:1px solid #3a4150;'
        + 'background:#1b1f27;color:#e8ecf3;font:600 13px system-ui,sans-serif;padding:10px 13px;'
        + 'border-radius:999px;cursor:pointer;';
      b.onclick = function () {
        var host = document.getElementById('screen') || document.body;
        var old = host.querySelector('[data-nbc-root]');
        if (old) { old.parentNode.removeChild(old); return; }
        host.insertBefore(buildSaves(), host.firstChild);
      };
      document.body.appendChild(b);
    } catch (e) { err('fallback', e); }
  }, 3000);

  /* --------------------------------------------- autosave on month close */

  try {
    if (typeof window.advanceMonth === 'function') {
      var prevAdv = window.advanceMonth;
      window.advanceMonth = function () {
        var out = prevAdv.apply(this, arguments);
        try {
          if (token() && autoOn() && hasGame()) {
            exportCode().then(function (payload) {
              return putSave('auto', 'Autosave \u2014 ' + defaultLabel(), payload);
            }).catch(function () { /* silent: never interrupt play */ });
          }
        } catch (e) { err('autosave', e); }
        return out;
      };
    }
  } catch (e) { err('wrapAdvance', e); }

  /* -------------------------------------------------------- keep-alive */

  try {
    var last = Number(get(K_PING) || 0);
    if (Date.now() - last > 12 * 60 * 60 * 1000) {
      rpc('nb_ping', {}).then(function () { set(K_PING, String(Date.now())); }).catch(function () {});
    }
  } catch (e) { err('ping', e); }

  /* -------------------------------------------------------------- api */

  window.NBCloud = {
    rpc: rpc,
    signedInAs: code,
    build: buildSaves,
    refresh: refreshList,
    errs: function () { return ERR.slice(); }
  };
})();
