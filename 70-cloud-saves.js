/* 70-cloud-saves.js — NAVigating Business: cloud accounts, saves, leaderboard.
 *
 * Talks to Supabase RPC endpoints defined in supabase-schema.sql.
 * No dependencies: plain fetch. Loads last so all game globals exist.
 *
 * Keys below are the PUBLIC anon key. Never put a service_role key here.
 */
(function () {
  'use strict';

  var BASE = 'https://pzgrxfyogymctiumbszb.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Z3J4ZnlvZ3ltY3RpdW1ic3piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwOTE4ODUsImV4cCI6MjEwNTY2Nzg4NX0.V35JeWqwuWS7wQwbMwD63HMziizCZS46DpROB0lB7pk';

  var K_TOKEN = 'besim2_cloud_token';
  var K_CODE  = 'besim2_cloud_code';
  var K_AUTO  = 'besim2_cloud_autosync';
  var K_PING  = 'besim2_cloud_lastping';

  /* ------------------------------------------------------------ storage */

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

  function token() { return get(K_TOKEN); }
  function code()  { return get(K_CODE); }

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
          var err = new Error(String(m));
          err.status = r.status;
          throw err;
        }
        return d;
      });
    });
  }

  /* -------------------------------------------------------- game bridge */

  function state() {
    try { if (typeof G !== 'undefined' && G) return G; } catch (e) {}
    return window.G || null;
  }

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function meta() {
    var g = state() || {};
    var m = { company: null, month: null, year: null, cash: null };
    try {
      var c = g.companyName || g.company || (g.co && g.co.name) || null;
      if (c && typeof c === 'object') c = c.name || null;
      m.company = (typeof c === 'string' && c) ? c.slice(0, 80) : null;
      m.month = num(g.month);
      m.year  = num(g.year);
      m.cash  = num(g.cash != null ? g.cash : (g.finance && g.finance.cash));
    } catch (e) {}
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

  /* ----------------------------------------------------------- styling */

  var CSS = ''
    + '#nbCloudBtn{position:fixed;right:14px;bottom:14px;z-index:99998;border:1px solid #3a4150;'
    + 'background:#1b1f27;color:#e8ecf3;font:600 13px/1 system-ui,-apple-system,sans-serif;'
    + 'padding:10px 13px;border-radius:999px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.4)}'
    + '#nbCloudBtn:hover{background:#242a35}'
    + '#nbCloudWrap{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;'
    + 'align-items:center;justify-content:center;padding:16px}'
    + '#nbCloudPanel{width:min(520px,100%);max-height:86vh;overflow:auto;background:#15171c;color:#e8ecf3;'
    + 'border:1px solid #333a47;border-radius:14px;padding:18px;'
    + 'font:14px/1.45 system-ui,-apple-system,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.6)}'
    + '#nbCloudPanel h2{margin:0 0 4px;font-size:17px}'
    + '#nbCloudPanel h3{margin:18px 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#93a0b4}'
    + '#nbCloudPanel .nb-sub{color:#93a0b4;font-size:12px;margin:0 0 12px}'
    + '#nbCloudPanel input{width:100%;box-sizing:border-box;background:#0f1116;color:#e8ecf3;'
    + 'border:1px solid #333a47;border-radius:8px;padding:9px 10px;margin:4px 0 10px;font-size:14px}'
    + '#nbCloudPanel button{background:#2a6df4;color:#fff;border:0;border-radius:8px;padding:9px 13px;'
    + 'font:600 13px system-ui,sans-serif;cursor:pointer;margin:0 6px 6px 0}'
    + '#nbCloudPanel button.nb-ghost{background:#242a35;color:#cfd6e2;border:1px solid #333a47}'
    + '#nbCloudPanel button.nb-danger{background:#7a2230}'
    + '#nbCloudPanel button:disabled{opacity:.5;cursor:default}'
    + '#nbCloudPanel .nb-row{display:flex;gap:10px;align-items:center;justify-content:space-between;'
    + 'border:1px solid #2a3140;border-radius:10px;padding:9px 11px;margin-bottom:7px}'
    + '#nbCloudPanel .nb-row div{min-width:0}'
    + '#nbCloudPanel .nb-row b{display:block;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '#nbCloudPanel .nb-row small{color:#8e9bb0;font-size:11px}'
    + '#nbCloudPanel .nb-msg{border-radius:8px;padding:9px 11px;margin:10px 0;font-size:13px;display:none}'
    + '#nbCloudPanel .nb-msg.ok{display:block;background:#12301f;color:#9be3b6}'
    + '#nbCloudPanel .nb-msg.err{display:block;background:#33161c;color:#f0a3ae}'
    + '#nbCloudPanel .nb-msg.info{display:block;background:#1a2432;color:#a9c3e6}'
    + '#nbCloudPanel label.nb-check{display:flex;gap:8px;align-items:center;color:#93a0b4;font-size:12px;margin-top:10px}'
    + '#nbCloudPanel label.nb-check input{width:auto;margin:0}'
    + '#nbCloudPanel .nb-close{float:right;background:none;border:0;color:#93a0b4;font-size:20px;'
    + 'cursor:pointer;padding:0 4px;margin:0}';

  function injectCss() {
    if (document.getElementById('nbCloudCss')) return;
    var s = document.createElement('style');
    s.id = 'nbCloudCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* -------------------------------------------------------------- panel */

  var wrap = null, panel = null, busy = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function when(ts) {
    if (!ts) return '';
    try { return new Date(ts).toLocaleString(); } catch (e) { return String(ts); }
  }

  function money(v) {
    if (v == null) return '';
    var n = Number(v);
    if (!isFinite(n)) return '';
    return '$' + Math.round(n).toLocaleString();
  }

  function msg(text, kind) {
    var el = panel && panel.querySelector('.nb-msg');
    if (!el) return;
    el.className = 'nb-msg ' + (kind || 'info');
    el.textContent = text;
    if (!text) el.className = 'nb-msg';
  }

  function setBusy(b) {
    busy = b;
    if (!panel) return;
    var bs = panel.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) {
      if (!bs[i].classList.contains('nb-close')) bs[i].disabled = b;
    }
  }

  function fail(e) {
    setBusy(false);
    var m = (e && e.message) ? e.message : 'Something went wrong.';
    if (/Session expired/i.test(m)) { set(K_TOKEN, null); render(); }
    msg(m, 'err');
  }

  function open() {
    injectCss();
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'nbCloudWrap';
      wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
      panel = document.createElement('div');
      panel.id = 'nbCloudPanel';
      wrap.appendChild(panel);
      document.body.appendChild(wrap);
    }
    wrap.style.display = 'flex';
    render();
  }

  function close() { if (wrap) wrap.style.display = 'none'; }

  function header(title, sub) {
    return '<button class="nb-close" data-act="close">&times;</button>'
         + '<h2>' + esc(title) + '</h2>'
         + '<p class="nb-sub">' + esc(sub) + '</p>'
         + '<div class="nb-msg"></div>';
  }

  function render() {
    if (!panel) return;
    panel.innerHTML = token() ? viewAccount() : viewSignIn();
    panel.addEventListener('click', onClick);
    if (token()) { refreshSaves(); }
  }

  function viewSignIn() {
    return header('Cloud saves',
      'Pick a player code and a PIN. No email, no password. Your code is how your saves find you on any device.')
      + '<h3>Sign in</h3>'
      + '<input id="nbCode" placeholder="Player code (e.g. FG01)" maxlength="12" autocapitalize="characters" />'
      + '<input id="nbPin" placeholder="PIN (4-8 digits)" inputmode="numeric" maxlength="8" type="password" />'
      + '<button data-act="login">Sign in</button>'
      + '<h3>New player</h3>'
      + '<input id="nbName" placeholder="Display name for the leaderboard (optional)" maxlength="40" />'
      + '<button class="nb-ghost" data-act="register">Create my code</button>';
  }

  function viewAccount() {
    var auto = get(K_AUTO) === '1';
    return header('Cloud saves', 'Signed in as ' + code() + '.')
      + '<button data-act="save">Save this game to the cloud</button>'
      + '<button class="nb-ghost" data-act="score">Submit score</button>'
      + '<button class="nb-ghost" data-act="board">Leaderboard</button>'
      + '<button class="nb-ghost" data-act="logout">Sign out</button>'
      + '<label class="nb-check"><input type="checkbox" data-act="auto"' + (auto ? ' checked' : '') + ' />'
      + 'Auto-sync every 5 minutes to a slot called "autosync"</label>'
      + '<h3>My cloud saves</h3>'
      + '<div id="nbSaves"><small style="color:#8e9bb0">Loading…</small></div>';
  }

  /* ------------------------------------------------------------ actions */

  function onClick(e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var act = el.getAttribute('data-act');

    if (act === 'close') return close();
    if (act === 'auto') { set(K_AUTO, el.checked ? '1' : null); return; }
    if (busy) return;

    if (act === 'login' || act === 'register') {
      var c = (panel.querySelector('#nbCode') || {}).value || '';
      var p = (panel.querySelector('#nbPin') || {}).value || '';
      var n = (panel.querySelector('#nbName') || {}).value || '';
      c = c.trim().toUpperCase();
      if (!/^[A-Z0-9]{2,12}$/.test(c)) return msg('Player code must be 2-12 letters or numbers.', 'err');
      if (!/^[0-9]{4,8}$/.test(p)) return msg('PIN must be 4-8 digits.', 'err');
      setBusy(true); msg('Working…', 'info');
      var call = act === 'login'
        ? rpc('nb_login', { p_code: c, p_pin: p })
        : rpc('nb_register', { p_code: c, p_pin: p, p_name: n });
      return call.then(function (tok) {
        set(K_TOKEN, tok); set(K_CODE, c);
        setBusy(false); render(); msg('Signed in as ' + c + '.', 'ok');
      }).catch(fail);
    }

    if (act === 'logout') { set(K_TOKEN, null); render(); return msg('Signed out. Your saves stay in the cloud.', 'ok'); }

    if (act === 'save') {
      var label = window.prompt('Name this save:', defaultLabel());
      if (label === null) return;
      setBusy(true); msg('Packing your game…', 'info');
      return exportCode().then(function (payload) {
        var m = meta();
        return rpc('nb_put_save', {
          p_token: token(),
          p_slot: 'c' + Date.now().toString(36),
          p_label: String(label).slice(0, 80) || defaultLabel(),
          p_payload: String(payload),
          p_company: m.company, p_month: m.month, p_year: m.year, p_cash: m.cash
        });
      }).then(function () {
        setBusy(false); msg('Saved to the cloud.', 'ok'); refreshSaves();
      }).catch(fail);
    }

    if (act === 'load' || act === 'delete') {
      var slot = el.getAttribute('data-slot');
      if (act === 'delete') {
        if (!window.confirm('Delete this cloud save? This cannot be undone.')) return;
        setBusy(true);
        return rpc('nb_delete_save', { p_token: token(), p_slot: slot }).then(function () {
          setBusy(false); msg('Deleted.', 'ok'); refreshSaves();
        }).catch(fail);
      }
      if (!window.confirm('Load this save? Your current unsaved progress will be replaced.')) return;
      setBusy(true); msg('Loading…', 'info');
      return rpc('nb_get_save', { p_token: token(), p_slot: slot })
        .then(function (payload) { return applyCode(String(payload)); })
        .then(function () { setBusy(false); msg('Loaded.', 'ok'); close(); })
        .catch(fail);
    }

    if (act === 'score') {
      var m2 = meta();
      var sc = m2.cash;
      if (sc == null) return msg('No score to submit yet — start a game first.', 'err');
      setBusy(true);
      return rpc('nb_submit_score', {
        p_token: token(), p_score: sc, p_company: m2.company, p_month: m2.month, p_year: m2.year
      }).then(function () {
        setBusy(false); msg('Score submitted: ' + money(sc) + '. Only your best is kept.', 'ok');
      }).catch(fail);
    }

    if (act === 'board') {
      setBusy(true); msg('Fetching…', 'info');
      return rpc('nb_leaderboard', {}).then(function (rows) {
        setBusy(false); msg('', '');
        var host = panel.querySelector('#nbSaves');
        if (!host) return;
        panel.querySelector('h3').textContent = 'Leaderboard';
        host.innerHTML = (!rows || !rows.length)
          ? '<small style="color:#8e9bb0">Nobody has posted a score yet.</small>'
          : rows.map(function (r, i) {
              return '<div class="nb-row"><div><b>' + (i + 1) + '. ' + esc(r.display_name || '—') + '</b>'
                + '<small>' + esc(r.company || '') + '</small></div>'
                + '<div style="text-align:right"><b>' + money(r.score) + '</b>'
                + '<small>' + when(r.updated_at) + '</small></div></div>';
            }).join('') + '<button class="nb-ghost" data-act="mysaves" style="margin-top:10px">Back to my saves</button>';
      }).catch(fail);
    }

    if (act === 'mysaves') {
      panel.querySelector('h3').textContent = 'My cloud saves';
      return refreshSaves();
    }
  }

  function defaultLabel() {
    var m = meta();
    var bits = [];
    if (m.company) bits.push(m.company);
    if (m.month && m.year) bits.push('M' + m.month + ' Y' + m.year);
    return bits.length ? bits.join(' — ') : 'Save ' + new Date().toLocaleDateString();
  }

  function refreshSaves() {
    var host = panel && panel.querySelector('#nbSaves');
    if (!host || !token()) return;
    return rpc('nb_list_saves', { p_token: token() }).then(function (rows) {
      if (!rows || !rows.length) {
        host.innerHTML = '<small style="color:#8e9bb0">No cloud saves yet.</small>';
        return;
      }
      host.innerHTML = rows.map(function (r) {
        var line2 = [r.company, (r.month && r.year) ? ('M' + r.month + ' Y' + r.year) : '', money(r.cash), when(r.updated_at)]
          .filter(Boolean).join(' · ');
        return '<div class="nb-row"><div><b>' + esc(r.label || r.slot) + '</b><small>' + esc(line2) + '</small></div>'
          + '<div style="white-space:nowrap">'
          + '<button data-act="load" data-slot="' + esc(r.slot) + '">Load</button>'
          + '<button class="nb-danger" data-act="delete" data-slot="' + esc(r.slot) + '">Delete</button>'
          + '</div></div>';
      }).join('');
    }).catch(function (e) {
      host.innerHTML = '<small style="color:#f0a3ae">' + esc(e.message || 'Could not load saves.') + '</small>';
      if (/Session expired/i.test(e.message || '')) { set(K_TOKEN, null); render(); }
    });
  }

  /* ------------------------------------------------------- auto-sync */

  setInterval(function () {
    if (!token() || get(K_AUTO) !== '1' || !state()) return;
    exportCode().then(function (payload) {
      var m = meta();
      return rpc('nb_put_save', {
        p_token: token(), p_slot: 'autosync', p_label: 'Auto-sync',
        p_payload: String(payload),
        p_company: m.company, p_month: m.month, p_year: m.year, p_cash: m.cash
      });
    }).catch(function () { /* silent: never interrupt play */ });
  }, 5 * 60 * 1000);

  /* -------------------------------------------------------- keep-alive */

  function keepAlive() {
    var last = Number(get(K_PING) || 0);
    if (Date.now() - last < 12 * 60 * 60 * 1000) return;
    rpc('nb_ping', {}).then(function () { set(K_PING, String(Date.now())); }).catch(function () {});
  }

  /* -------------------------------------------------------------- boot */

  function boot() {
    injectCss();
    if (!document.getElementById('nbCloudBtn')) {
      var b = document.createElement('button');
      b.id = 'nbCloudBtn';
      b.type = 'button';
      b.textContent = '\u2601 Cloud';
      b.title = 'Cloud saves and leaderboard';
      b.addEventListener('click', open);
      document.body.appendChild(b);
    }
    keepAlive();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.NBCloud = { open: open, close: close, rpc: rpc, signedInAs: code };
})();
