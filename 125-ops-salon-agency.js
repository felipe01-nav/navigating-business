/* 125-ops-salon-agency.js — v4.81
   =====================================================================
   THE PROBLEM
   -----------
   v4.61 pointed nail_salon and agency at the "Industry Ops" slot, but
   neither industry has an ops model in art-core, so the tab rendered
   art-core's empty state: a heading and nothing to do. Two industries
   with a dead tab.

   THE ANSWER
   ----------
   Two bespoke screens, each modelling what the business actually runs
   on, each with levers that cost money and change a monthly number.

   THE FLOOR (nail salon) — a salon is chairs x tickets.
     Stations      capacity. Each one needs a technician and pays rent.
     Booking       paper diary -> online booking -> deposits. Fewer
                   no-shows, better chair utilisation.
     Service menu  gel, acrylics, spa pedicure, nail art. Each raises
                   the average ticket.
     Retail shelf  product sales on top of every visit.

   THE STUDIO (marketing agency) — an agency is retainers x rate.
     Positioning   generalist -> specialist -> category leader. Rate.
     Capabilities  paid media, brand, content, measurement. Each makes
                   a retainer worth more and a pitch easier to win.
     New business  pitch for a retainer. Costs money, odds are shown,
                   and it can be lost — that is the point of a pitch.
     Accounts      account management cuts monthly churn.

   MONEY
   -----
   art-core owns month close and cannot be read by tooling, so this
   layer settles its own books: it watches for the month to change and
   credits (or debits) the net figure shown on the screen, once per
   month, to whichever cash field the company actually has. Turn that
   off with NBOps.autoPay(false) if the economy starts to look silly.

   The dock label stays "Industry Ops" — 105-industry-slot.js re-asserts
   it on a 900 ms timer and a tug-of-war would repaint the dock forever.
   The screen names itself instead.

   Disable with ?safe=1 or ?noops=1. Diagnostics: NBOps.report()
   ===================================================================== */
(function () {
  "use strict";

  var q = "";
  try { q = String(location.search || ""); } catch (e) {}
  if (/[?&](safe|noops)=1/.test(q)) return;
  if (window.__nbOps481) return;
  window.__nbOps481 = true;

  var LOG = [];
  var msg = "";
  function note(s) { LOG.push(s); if (LOG.length > 80) LOG.shift(); }

  function co() { try { return (window.G && window.G.company) || null; } catch (e) { return null; } }
  function ui() { try { return (window.G && window.G.ui) || {}; } catch (e) { return {}; } }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function money(n) {
    try { return fmt$(n); } catch (e) {}
    try { return "$" + Math.round(Number(n) || 0).toLocaleString(); } catch (e) { return "$" + n; }
  }
  function pct(n) { return Math.round(n * 100) + "%"; }
  function repaint() {
    try { if (typeof window.redraw === "function") { window.redraw(); return; } } catch (e) {}
    try { if (typeof window.renderScreen === "function") window.renderScreen(); } catch (e) {}
  }

  function industry() { var c = co(); return (c && c.industry) ? String(c.industry) : ""; }
  function isSalon()  { return industry() === "nail_salon"; }
  function isAgency() { return industry() === "agency"; }
  function ours()     { return isSalon() || isAgency(); }

  /* ---------------- cash ---------------- */

  var CASH_FIELDS = ["cash", "cashOnHand", "money", "bank", "balance"];
  function cashField() {
    var c = co();
    if (!c) return null;
    for (var i = 0; i < CASH_FIELDS.length; i++) {
      var v = c[CASH_FIELDS[i]];
      if (typeof v === "number" && isFinite(v)) return CASH_FIELDS[i];
    }
    return null;
  }
  function cashNow() { var f = cashField(), c = co(); return (f && c) ? c[f] : null; }
  function spend(n) {
    var f = cashField(), c = co();
    if (!f || !c) return true;            /* no cash field: never block play */
    if (c[f] < n) return false;
    c[f] = c[f] - n;
    return true;
  }
  function credit(n) {
    var f = cashField(), c = co();
    if (!f || !c) return false;
    c[f] = c[f] + n;
    return true;
  }

  /* ---------------- state ---------------- */

  function state() {
    var c = co();
    if (!c) return null;
    if (!c.ops || typeof c.ops !== "object") c.ops = {};
    var s = c.ops;
    if (typeof s.v !== "number") s.v = 1;

    if (!s.salon || typeof s.salon !== "object") s.salon = {};
    if (typeof s.salon.stations !== "number") s.salon.stations = 3;
    if (typeof s.salon.booking !== "number") s.salon.booking = 0;
    if (typeof s.salon.retail !== "number") s.salon.retail = 0;
    if (!s.salon.menu || typeof s.salon.menu !== "object") s.salon.menu = {};

    if (!s.agency || typeof s.agency !== "object") s.agency = {};
    if (typeof s.agency.retainers !== "number") s.agency.retainers = 1;
    if (typeof s.agency.tier !== "number") s.agency.tier = 0;
    if (!s.agency.caps || typeof s.agency.caps !== "object") s.agency.caps = {};
    if (typeof s.agency.accounts !== "boolean") s.agency.accounts = false;
    if (typeof s.agency.pitches !== "number") s.agency.pitches = 0;
    if (typeof s.agency.wins !== "number") s.agency.wins = 0;

    if (!s.books || typeof s.books !== "object") s.books = {};
    if (typeof s.books.months !== "number") s.books.months = 0;
    if (typeof s.books.total !== "number") s.books.total = 0;
    if (typeof s.books.lastKey !== "string") s.books.lastKey = "";
    if (typeof s.books.autoPay !== "boolean") s.books.autoPay = true;
    return s;
  }

  /* =================================================================
     THE FLOOR — nail salon
     ================================================================= */

  var STATION_BASE   = 8000;    /* cost of the next chair, compounding */
  var STATION_GROWTH = 1.35;
  var STATION_SEATS  = 120;     /* appointment slots per chair per month */
  var STATION_RENT   = 900;
  var TECH_WAGE      = 2600;
  var BASE_TICKET    = 32;
  var BASE_UTIL      = 0.62;

  var BOOKING = [
    { name: "Paper diary",            cost: 0,     monthly: 0,   noShow: 0.18, util: 0,    line: "A book on the counter and a good memory." },
    { name: "Online booking",         cost: 6000,  monthly: 150, noShow: 0.12, util: 0.05, line: "Clients book themselves, at midnight, without ringing." },
    { name: "Deposits & reminders",   cost: 18000, monthly: 400, noShow: 0.06, util: 0.09, line: "A card on file and a text the day before. No-shows collapse." }
  ];

  var RETAIL = [
    { name: "No retail",        cost: 0,     add: 0, line: "Clients leave with nothing but their hands." },
    { name: "Basic care shelf", cost: 3000,  add: 3, line: "Files, oils, topcoat. Small money, every visit." },
    { name: "Curated brand wall", cost: 14000, add: 7, line: "A proper retail wall. People buy what they were just given." }
  ];

  var MENU = [
    { key: "gel",     name: "Gel manicure",        cost: 4000,  add: 8,  line: "Two weeks of wear. The default upgrade." },
    { key: "acrylic", name: "Acrylics & extensions", cost: 12000, add: 14, line: "Longer appointments, far bigger tickets, skilled hands needed." },
    { key: "pedi",    name: "Spa pedicure",        cost: 9000,  add: 11, line: "Chairs, basins, plumbing. Pairs with everything else." },
    { key: "art",     name: "Nail art studio",     cost: 25000, add: 18, line: "The work people photograph. It fills the chairs by itself." }
  ];

  function salonUtil() {
    var s = state().salon;
    var u = BASE_UTIL + BOOKING[s.booking].util;
    var extras = 0;
    for (var i = 0; i < MENU.length; i++) if (s.menu[MENU[i].key]) extras++;
    u += extras * 0.025;                 /* a fuller menu keeps chairs busy */
    return Math.max(0.2, Math.min(0.95, u));
  }
  function salonTicket() {
    var s = state().salon;
    var t = BASE_TICKET;
    for (var i = 0; i < MENU.length; i++) if (s.menu[MENU[i].key]) t += MENU[i].add;
    return t;
  }
  function salonClients() {
    var s = state().salon;
    return Math.round(s.stations * STATION_SEATS * salonUtil() * (1 - BOOKING[s.booking].noShow));
  }
  function salonMonth() {
    var s = state().salon;
    var clients = salonClients();
    var service = clients * salonTicket();
    var retail = clients * RETAIL[s.retail].add;
    var wages = s.stations * TECH_WAGE;
    var rent = s.stations * STATION_RENT;
    var tech = BOOKING[s.booking].monthly;
    return {
      clients: clients,
      service: service,
      retail: retail,
      revenue: service + retail,
      wages: wages,
      rent: rent,
      tech: tech,
      costs: wages + rent + tech,
      net: service + retail - wages - rent - tech
    };
  }
  function stationCost() {
    var s = state().salon;
    var extra = Math.max(0, s.stations - 3);
    return Math.round(STATION_BASE * Math.pow(STATION_GROWTH, extra) / 100) * 100;
  }

  /* =================================================================
     THE STUDIO — marketing agency
     ================================================================= */

  var HOURS_PER_RETAINER = 40;   /* billable hours per retainer per month */
  var DELIVERY_COST      = 1400; /* what servicing one retainer costs */
  var PITCH_COST         = 2500;
  var MAX_RETAINERS      = 12;

  var POSITION = [
    { name: "Generalist shop",  cost: 0,     rate: 95,  odds: 0,    line: "You will do anything for anyone. So will everyone else." },
    { name: "Specialist",       cost: 20000, rate: 140, odds: 0.10, line: "One industry, known work, a point of view. Rates follow." },
    { name: "Category leader",  cost: 75000, rate: 210, odds: 0.18, line: "Clients arrive already sold. You quote and they agree." }
  ];

  var CAPS = [
    { key: "paid",    name: "Paid media",        cost: 8000,  line: "Budget you place is budget you bill against." },
    { key: "brand",   name: "Brand & design",    cost: 12000, line: "The work that wins the room in the first ten minutes." },
    { key: "content", name: "Content studio",    cost: 10000, line: "Always-on output. Retainers renew on rhythm, not brilliance." },
    { key: "data",    name: "Measurement & analytics", cost: 16000, line: "Proof. The single best defence against a budget review." }
  ];

  var ACCOUNTS_COST = 22000;

  function capCount() {
    var a = state().agency, n = 0;
    for (var i = 0; i < CAPS.length; i++) if (a.caps[CAPS[i].key]) n++;
    return n;
  }
  function agencyRate() {
    var a = state().agency;
    return POSITION[a.tier].rate;
  }
  function retainerFee() {
    /* Each capability makes the retainer 12% larger — more of the
       client's problem is yours to solve. */
    return Math.round(HOURS_PER_RETAINER * agencyRate() * (1 + 0.12 * capCount()));
  }
  function pitchOdds() {
    var a = state().agency;
    var p = 0.45 + POSITION[a.tier].odds + 0.08 * capCount();
    return Math.max(0.15, Math.min(0.85, p));
  }
  function churnRate() {
    var a = state().agency;
    return a.accounts ? 0.02 : 0.05;
  }
  function agencyMonth() {
    var a = state().agency;
    var fees = a.retainers * retainerFee();
    var delivery = a.retainers * DELIVERY_COST;
    var overhead = a.accounts ? 3200 : 0;
    return {
      retainers: a.retainers,
      fee: retainerFee(),
      fees: fees,
      delivery: delivery,
      overhead: overhead,
      costs: delivery + overhead,
      net: fees - delivery - overhead,
      hours: a.retainers * HOURS_PER_RETAINER
    };
  }

  function monthNet() {
    if (isSalon()) return salonMonth().net;
    if (isAgency()) return agencyMonth().net;
    return 0;
  }

  /* =================================================================
     Actions
     ================================================================= */

  function act(what) {
    var s = state();
    if (!s) return;

    if (what === "salon.station") {
      var c1 = stationCost();
      if (!spend(c1)) { msg = "Not enough cash \u2014 a new station is " + money(c1) + "."; return done(); }
      s.salon.stations++;
      msg = "Station " + s.salon.stations + " fitted. A technician goes on the payroll at " + money(TECH_WAGE) + " a month.";
      return done();
    }
    if (what === "salon.booking") {
      var nb = s.salon.booking + 1;
      if (nb >= BOOKING.length) return;
      if (!spend(BOOKING[nb].cost)) { msg = "Not enough cash \u2014 " + BOOKING[nb].name + " is " + money(BOOKING[nb].cost) + "."; return done(); }
      s.salon.booking = nb;
      msg = BOOKING[nb].name + " is live. No-shows fall to " + pct(BOOKING[nb].noShow) + ".";
      return done();
    }
    if (what === "salon.retail") {
      var nr = s.salon.retail + 1;
      if (nr >= RETAIL.length) return;
      if (!spend(RETAIL[nr].cost)) { msg = "Not enough cash \u2014 " + RETAIL[nr].name + " is " + money(RETAIL[nr].cost) + "."; return done(); }
      s.salon.retail = nr;
      msg = RETAIL[nr].name + " stocked. " + money(RETAIL[nr].add) + " more per visit.";
      return done();
    }
    if (what.indexOf("salon.menu.") === 0) {
      var mk = what.slice(11);
      for (var i = 0; i < MENU.length; i++) {
        if (MENU[i].key !== mk) continue;
        if (s.salon.menu[mk]) return;
        if (!spend(MENU[i].cost)) { msg = "Not enough cash \u2014 " + MENU[i].name + " is " + money(MENU[i].cost) + "."; return done(); }
        s.salon.menu[mk] = true;
        msg = MENU[i].name + " added to the menu. Average ticket up " + money(MENU[i].add) + ".";
        return done();
      }
      return;
    }

    if (what === "agency.position") {
      var nt = s.agency.tier + 1;
      if (nt >= POSITION.length) return;
      if (!spend(POSITION[nt].cost)) { msg = "Not enough cash \u2014 " + POSITION[nt].name + " is " + money(POSITION[nt].cost) + "."; return done(); }
      s.agency.tier = nt;
      msg = "Repositioned as " + POSITION[nt].name + ". Blended rate now " + money(POSITION[nt].rate) + " an hour.";
      return done();
    }
    if (what.indexOf("agency.cap.") === 0) {
      var ck = what.slice(11);
      for (var j = 0; j < CAPS.length; j++) {
        if (CAPS[j].key !== ck) continue;
        if (s.agency.caps[ck]) return;
        if (!spend(CAPS[j].cost)) { msg = "Not enough cash \u2014 " + CAPS[j].name + " is " + money(CAPS[j].cost) + "."; return done(); }
        s.agency.caps[ck] = true;
        msg = CAPS[j].name + " is now a service line. Every retainer is worth more.";
        return done();
      }
      return;
    }
    if (what === "agency.accounts") {
      if (s.agency.accounts) return;
      if (!spend(ACCOUNTS_COST)) { msg = "Not enough cash \u2014 account management is " + money(ACCOUNTS_COST) + "."; return done(); }
      s.agency.accounts = true;
      msg = "Account management in place. Churn drops to " + pct(0.02) + " a month.";
      return done();
    }
    if (what === "agency.pitch") {
      if (s.agency.retainers >= MAX_RETAINERS) { msg = "The studio is full. Twelve retainers is all the team can carry."; return done(); }
      if (!spend(PITCH_COST)) { msg = "Not enough cash \u2014 a pitch costs " + money(PITCH_COST) + " in unbilled time."; return done(); }
      s.agency.pitches++;
      var odds = pitchOdds();
      if (Math.random() < odds) {
        s.agency.retainers++;
        s.agency.wins++;
        msg = "Won it. " + s.agency.retainers + " retainers now, worth " + money(retainerFee()) + " a month each.";
        note("pitch won at " + pct(odds));
      } else {
        msg = "Lost it. They went with the incumbent. " + money(PITCH_COST) + " of time, gone.";
        note("pitch lost at " + pct(odds));
      }
      return done();
    }
  }

  function done() {
    try { if (typeof window.__v428markDirty === "function") window.__v428markDirty(); } catch (e) {}
    repaint();
    mount(true);
  }

  try {
    document.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      var b = t.closest("[data-ops]");
      if (!b) return;
      if (b.getAttribute("disabled") !== null) { ev.preventDefault(); ev.stopPropagation(); return; }
      ev.preventDefault();
      ev.stopPropagation();
      act(b.getAttribute("data-ops"));
    }, true);
  } catch (e) {}

  /* Clicking away clears a stale message. */
  try {
    document.addEventListener("click", function (ev) {
      var t = ev.target;
      if (t && t.closest && t.closest("[data-tab]") && msg) msg = "";
    }, true);
  } catch (e) {}

  /* =================================================================
     Monthly settlement
     ================================================================= */

  function monthKey() {
    var g = window.G || {};
    var c = co() || {};
    var cands = [g.month, g.turn, g.monthIndex, c.month, c.turn, g.date, g.time];
    for (var i = 0; i < cands.length; i++) {
      var v = cands[i];
      if (typeof v === "number" && isFinite(v)) return i + ":" + v;
      if (typeof v === "string" && v) return i + ":" + v;
    }
    return "";
  }

  function settle() {
    var s = state();
    if (!s || !ours()) return;
    var k = monthKey();
    if (!k) return;
    if (!s.books.lastKey) { s.books.lastKey = k; return; }
    if (k === s.books.lastKey) return;
    s.books.lastKey = k;

    /* Agency clients leave from time to time. Roll before paying, so a
       lost account shows up in the same month it happened. */
    if (isAgency() && s.agency.retainers > 0) {
      var lost = 0;
      for (var i = 0; i < s.agency.retainers; i++) if (Math.random() < churnRate()) lost++;
      if (lost) {
        s.agency.retainers = Math.max(0, s.agency.retainers - lost);
        msg = lost === 1 ? "A retainer did not renew this month."
                         : lost + " retainers did not renew this month.";
        note("churn: lost " + lost);
      }
    }

    if (!s.books.autoPay) return;
    var net = monthNet();
    if (!isFinite(net) || !net) return;
    if (credit(net)) {
      s.books.months++;
      s.books.total += net;
      note("settled month: " + Math.round(net));
    }
  }

  /* =================================================================
     Styles
     ================================================================= */

  try {
    if (!document.getElementById("ops-css")) {
      var css = document.createElement("style");
      css.id = "ops-css";
      css.textContent =
        ".ops-row{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--border,#293042);}"
      + ".ops-row:first-of-type{border-top:0;}"
      + ".ops-row .meat{flex:1;min-width:0;}"
      + ".ops-row h4{margin:0 0 2px;font-size:13.5px;}"
      + ".ops-row .line{font-size:11.5px;opacity:.75;line-height:1.45;}"
      + ".ops-row .eff{font-size:11.5px;font-weight:600;opacity:.9;margin-top:2px;}"
      + ".ops-row .buy{flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-end;gap:4px;}"
      + ".ops-row .cost{font-size:13px;font-weight:600;white-space:nowrap;}"
      + ".ops-row.done{opacity:.7;}"
      + ".ops-stat{display:flex;gap:18px;flex-wrap:wrap;margin-top:8px;}"
      + ".ops-stat div span{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;opacity:.6;}"
      + ".ops-stat div b{font-size:17px;}"
      + ".ops-msg{margin-top:8px;font-size:12px;padding:7px 10px;border-radius:8px;"
      + "background:var(--panel2,#0b1220);border:1px solid var(--border,#293042);}"
      + ".ops-pl{margin-top:6px;font-size:12.5px;}"
      + ".ops-pl .l{display:flex;justify-content:space-between;padding:4px 0;border-top:1px solid var(--border,#293042);}"
      + ".ops-pl .l:first-child{border-top:0;}"
      + ".ops-pl .l.tot{font-weight:700;font-size:13.5px;}"
      + ".ops-pl .l.tot .v.up{color:var(--good,#4fd1a5);}"
      + ".ops-pl .l.tot .v.dn{color:var(--bad,#f2716a);}";
      document.head.appendChild(css);
    }
  } catch (e) {}

  /* =================================================================
     Rendering
     ================================================================= */

  function card(html, attr) {
    var d = document.createElement("div");
    d.className = "card mt14";
    if (attr) d.setAttribute(attr, "1");
    d.innerHTML = html;
    return d;
  }

  function buyBtn(action, cost, label, owned) {
    if (owned) return '<div class="cost" style="color:var(--good,#4fd1a5);">In place</div>';
    var cash = cashNow();
    var poor = cash !== null && cash < cost;
    return '<div class="cost">' + money(cost) + '</div>'
      + '<button class="btn small" data-ops="' + esc(action) + '"' + (poor ? ' disabled' : '') + '>'
      + (poor ? "Can\u2019t afford" : esc(label)) + '</button>';
  }

  function row(title, line, right, cls) {
    return '<div class="ops-row ' + (cls || "") + '">'
      + '<div class="meat"><h4>' + esc(title) + '</h4><div class="line">' + esc(line) + '</div></div>'
      + '<div class="buy">' + right + '</div></div>';
  }

  function plLine(label, value, cls) {
    return '<div class="l ' + (cls || "") + '"><span>' + esc(label) + '</span>'
      + '<span class="v ' + (cls === "tot" ? (value >= 0 ? "up" : "dn") : "") + '">'
      + (value < 0 ? "\u2212" + money(-value) : money(value)) + '</span></div>';
  }

  /* ---------------- salon ---------------- */

  function salonNode() {
    var s = state().salon;
    var m = salonMonth();
    var wrap = document.createElement("div");
    wrap.setAttribute("data-nbops", "1");

    var head = document.createElement("div");
    head.className = "card";
    head.innerHTML = '<h3>\uD83D\uDC85 The Floor</h3>'
      + '<div class="muted" style="font-size:12px;">A salon is chairs multiplied by tickets. Add chairs and you add '
      + 'capacity and payroll. Improve the booking and the menu and you fill the chairs you already have, which is '
      + 'nearly always the cheaper move.</div>'
      + '<div class="ops-stat">'
      +   '<div><span>Stations</span><b>' + s.stations + '</b></div>'
      +   '<div><span>Chair utilisation</span><b>' + pct(salonUtil()) + '</b></div>'
      +   '<div><span>No-shows</span><b>' + pct(BOOKING[s.booking].noShow) + '</b></div>'
      +   '<div><span>Average ticket</span><b>' + money(salonTicket() + RETAIL[s.retail].add) + '</b></div>'
      +   '<div><span>Clients / month</span><b>' + m.clients + '</b></div>'
      + '</div>'
      + (msg ? '<div class="ops-msg">' + esc(msg) + '</div>' : '');
    wrap.appendChild(head);

    /* Stations */
    wrap.appendChild(card(
      '<h3>\uD83E\uDE91 Stations</h3>'
      + '<div class="muted" style="font-size:12px;">Each station seats ' + STATION_SEATS + ' appointments a month, '
      + 'pays ' + money(STATION_RENT) + ' in rent and needs a technician at ' + money(TECH_WAGE) + '. An empty chair '
      + 'is the most expensive thing in the room.</div>'
      + '<div style="margin-top:8px;">'
      + row("Fit another station",
            "Takes you to " + (s.stations + 1) + " chairs and " + ((s.stations + 1) * STATION_SEATS) + " appointment slots a month.",
            buyBtn("salon.station", stationCost(), "Fit it", false))
      + '</div>'
    ));

    /* Booking */
    var bHtml = "";
    for (var i = 1; i < BOOKING.length; i++) {
      var owned = s.booking >= i;
      var nextUp = s.booking === i - 1;
      bHtml += row(BOOKING[i].name, BOOKING[i].line,
        owned ? '<div class="cost" style="color:var(--good,#4fd1a5);">In place</div>'
              : (nextUp ? buyBtn("salon.booking", BOOKING[i].cost, "Install", false)
                        : '<div class="cost">' + money(BOOKING[i].cost) + '</div><div class="line">Locked</div>'),
        owned ? "done" : "");
    }
    wrap.appendChild(card(
      '<h3>\uD83D\uDCC5 Booking</h3>'
      + '<div class="muted" style="font-size:12px;">Currently: <b>' + esc(BOOKING[s.booking].name) + '</b>. '
      + 'Every no-show is a chair sitting empty while a technician is being paid.</div>'
      + '<div style="margin-top:8px;">' + bHtml + '</div>'
    ));

    /* Menu */
    var mHtml = "";
    for (var j = 0; j < MENU.length; j++) {
      var has = !!s.menu[MENU[j].key];
      mHtml += row(MENU[j].name, MENU[j].line,
        buyBtn("salon.menu." + MENU[j].key, MENU[j].cost, "Add it", has)
        + (has ? '' : '<div class="eff">+' + money(MENU[j].add) + ' a ticket</div>'),
        has ? "done" : "");
    }
    wrap.appendChild(card(
      '<h3>\u2728 Service menu</h3>'
      + '<div class="muted" style="font-size:12px;">Base manicure is ' + money(BASE_TICKET) + '. Each service you add '
      + 'raises the average ticket and, quietly, keeps the chairs busier.</div>'
      + '<div style="margin-top:8px;">' + mHtml + '</div>'
    ));

    /* Retail */
    var rHtml = "";
    for (var k = 1; k < RETAIL.length; k++) {
      var rOwned = s.retail >= k;
      var rNext = s.retail === k - 1;
      rHtml += row(RETAIL[k].name, RETAIL[k].line,
        rOwned ? '<div class="cost" style="color:var(--good,#4fd1a5);">In place</div>'
               : (rNext ? buyBtn("salon.retail", RETAIL[k].cost, "Stock it", false)
                        : '<div class="cost">' + money(RETAIL[k].cost) + '</div><div class="line">Locked</div>'),
        rOwned ? "done" : "");
    }
    wrap.appendChild(card(
      '<h3>\uD83D\uDECD\uFE0F Retail shelf</h3>'
      + '<div class="muted" style="font-size:12px;">Product sold on the way out, on top of every single visit. '
      + 'Currently adding ' + money(RETAIL[s.retail].add) + ' per client.</div>'
      + '<div style="margin-top:8px;">' + rHtml + '</div>'
    ));

    /* P&L */
    wrap.appendChild(card(
      '<h3>\uD83D\uDCCA This month, as it stands</h3>'
      + '<div class="ops-pl">'
      + plLine("Services (" + m.clients + " clients)", m.service)
      + plLine("Retail", m.retail)
      + plLine("Technicians", -m.wages)
      + plLine("Rent & upkeep", -m.rent)
      + plLine("Booking system", -m.tech)
      + plLine("Salon profit", m.net, "tot")
      + '</div>'
    ));

    return wrap;
  }

  /* ---------------- agency ---------------- */

  function agencyNode() {
    var a = state().agency;
    var m = agencyMonth();
    var wrap = document.createElement("div");
    wrap.setAttribute("data-nbops", "1");

    var head = document.createElement("div");
    head.className = "card";
    head.innerHTML = '<h3>\uD83C\uDFAF The Studio</h3>'
      + '<div class="muted" style="font-size:12px;">An agency is retainers multiplied by rate. Winning work is the '
      + 'noisy part; being worth more per hour is the part that compounds.</div>'
      + '<div class="ops-stat">'
      +   '<div><span>Retainers</span><b>' + a.retainers + ' / ' + MAX_RETAINERS + '</b></div>'
      +   '<div><span>Blended rate</span><b>' + money(agencyRate()) + '/hr</b></div>'
      +   '<div><span>Each worth</span><b>' + money(retainerFee()) + '/mo</b></div>'
      +   '<div><span>Billable hours</span><b>' + m.hours + '</b></div>'
      +   '<div><span>Monthly churn</span><b>' + pct(churnRate()) + '</b></div>'
      + '</div>'
      + (msg ? '<div class="ops-msg">' + esc(msg) + '</div>' : '');
    wrap.appendChild(head);

    /* New business */
    wrap.appendChild(card(
      '<h3>\uD83D\uDCE3 New business</h3>'
      + '<div class="muted" style="font-size:12px;">A pitch costs real time whether you win or lose. Your odds today '
      + 'are <b>' + pct(pitchOdds()) + '</b> \u2014 better positioning and more capabilities both move that number.</div>'
      + '<div style="margin-top:8px;">'
      + row("Pitch for a retainer",
            "Win and you add a client worth " + money(retainerFee()) + " a month. Lose and you have bought experience.",
            (a.retainers >= MAX_RETAINERS
              ? '<div class="cost">Studio full</div>'
              : buyBtn("agency.pitch", PITCH_COST, "Pitch (" + pct(pitchOdds()) + ")", false)))
      + '</div>'
      + '<div class="line" style="margin-top:6px;opacity:.65;font-size:11.5px;">Record so far: '
      + a.wins + ' won of ' + a.pitches + ' pitched.</div>'
    ));

    /* Positioning */
    var pHtml = "";
    for (var i = 1; i < POSITION.length; i++) {
      var owned = a.tier >= i;
      var nextUp = a.tier === i - 1;
      pHtml += row(POSITION[i].name, POSITION[i].line,
        owned ? '<div class="cost" style="color:var(--good,#4fd1a5);">In place</div>'
              : (nextUp ? buyBtn("agency.position", POSITION[i].cost, "Reposition", false)
                        : '<div class="cost">' + money(POSITION[i].cost) + '</div><div class="line">Locked</div>')
        + (owned ? '' : '<div class="eff">' + money(POSITION[i].rate) + '/hr</div>'),
        owned ? "done" : "");
    }
    wrap.appendChild(card(
      '<h3>\uD83E\uDDED Positioning</h3>'
      + '<div class="muted" style="font-size:12px;">Currently: <b>' + esc(POSITION[a.tier].name) + '</b> at '
      + money(agencyRate()) + ' an hour. This applies to every retainer you have and every one you win.</div>'
      + '<div style="margin-top:8px;">' + pHtml + '</div>'
    ));

    /* Capabilities */
    var cHtml = "";
    for (var j = 0; j < CAPS.length; j++) {
      var has = !!a.caps[CAPS[j].key];
      cHtml += row(CAPS[j].name, CAPS[j].line,
        buyBtn("agency.cap." + CAPS[j].key, CAPS[j].cost, "Build it", has)
        + (has ? '' : '<div class="eff">+12% per retainer</div>'),
        has ? "done" : "");
    }
    wrap.appendChild(card(
      '<h3>\uD83E\uDDF0 Capabilities</h3>'
      + '<div class="muted" style="font-size:12px;">' + capCount() + ' of ' + CAPS.length + ' built. Each one takes on '
      + 'more of the client\u2019s problem, so each retainer is worth more \u2014 and each pitch is easier to win.</div>'
      + '<div style="margin-top:8px;">' + cHtml + '</div>'
    ));

    /* Accounts */
    wrap.appendChild(card(
      '<h3>\uD83E\uDD1D Keeping them</h3>'
      + '<div class="muted" style="font-size:12px;">Clients leave quietly, usually at budget time. Every month each '
      + 'retainer has a ' + pct(churnRate()) + ' chance of not renewing.</div>'
      + '<div style="margin-top:8px;">'
      + row("Account management",
            "A named lead on every client, running the relationship rather than the work. Costs " + money(3200) + " a month to keep.",
            buyBtn("agency.accounts", ACCOUNTS_COST, "Hire in", a.accounts)
            + (a.accounts ? '' : '<div class="eff">churn 5% \u2192 2%</div>'),
            a.accounts ? "done" : "")
      + '</div>'
    ));

    /* P&L */
    wrap.appendChild(card(
      '<h3>\uD83D\uDCCA This month, as it stands</h3>'
      + '<div class="ops-pl">'
      + plLine("Retainer fees (" + a.retainers + ")", m.fees)
      + plLine("Delivery team", -m.delivery)
      + plLine("Account management", -m.overhead)
      + plLine("Studio profit", m.net, "tot")
      + '</div>'
    ));

    return wrap;
  }

  /* ---------------- mounting ---------------- */

  function stamp() {
    var s = state();
    if (!s) return "";
    var cash = cashNow();
    var base = industry() + "|" + (cash === null ? "-" : Math.round(cash / 250)) + "|" + msg;
    if (isSalon()) {
      var keys = [];
      for (var k in s.salon.menu) if (Object.prototype.hasOwnProperty.call(s.salon.menu, k)) keys.push(k);
      keys.sort();
      return base + "|" + s.salon.stations + "," + s.salon.booking + "," + s.salon.retail + "," + keys.join(".");
    }
    var ck = [];
    for (var k2 in s.agency.caps) if (Object.prototype.hasOwnProperty.call(s.agency.caps, k2)) ck.push(k2);
    ck.sort();
    return base + "|" + s.agency.retainers + "," + s.agency.tier + "," + (s.agency.accounts ? 1 : 0)
         + "," + ck.join(".") + "," + s.agency.pitches;
  }

  function focusedInScreen() {
    try {
      var a = document.activeElement;
      if (!a) return false;
      if (!/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !a.isContentEditable) return false;
      var s = document.getElementById("screen");
      return !!(s && s.contains(a));
    } catch (e) { return false; }
  }

  /* Clear art-core's empty ops state, but never touch 105's hidden
     sentinel — 103-rnd-mount.js reads it and will paint a diagnostic
     strip at the player if it goes missing. */
  function clearLegacy(s, keep) {
    var kids = Array.prototype.slice.call(s.children);
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k === keep) continue;
      if (k.getAttribute && k.getAttribute("data-nbops") === "1") continue;
      if (k.hasAttribute && k.hasAttribute("data-nbrnd")) continue;
      if (k.classList && k.classList.contains("window-title")) continue;
      try { if (k.contains && document.activeElement && k.contains(document.activeElement)) continue; } catch (e) {}
      try { s.removeChild(k); } catch (e) {}
    }
  }

  function retitle(s) {
    try {
      var t = s.querySelector(".window-title");
      if (!t) return;
      var h = t.querySelector("h1,h2,h3,.title");
      if (!h) return;
      var want = isSalon() ? "The Floor" : "The Studio";
      var cur = (h.textContent || "").trim();
      if (cur === want) return;
      if (!cur || cur.length > 40) return;
      if (!/ops\b|industry|r&d/i.test(cur)) return;
      h.textContent = want;
    } catch (e) {}
  }

  function mount(force) {
    if (!ours()) return;
    if (ui().activeTab !== "industry") return;
    if (!co()) return;
    if (document.getElementById("nbGate")) return;
    if (!force && focusedInScreen()) return;
    var s = document.getElementById("screen");
    if (!s) return;

    var existing = s.querySelector('[data-nbops="1"]');
    clearLegacy(s, existing);
    retitle(s);

    var st = stamp();
    if (existing && existing.parentNode === s && existing.getAttribute("data-opsstamp") === st) return;

    var node = isSalon() ? salonNode() : agencyNode();
    if (!node) return;
    node.setAttribute("data-opsstamp", st);
    if (existing && existing.parentNode) existing.parentNode.replaceChild(node, existing);
    else s.appendChild(node);
    note("ops screen mounted for " + industry());
  }

  /* ---------------- hooks ---------------- */

  var wrapped = false;
  function wrapRender() {
    if (wrapped) return;
    var prev;
    try { prev = window.renderScreen; } catch (e) { return; }
    if (typeof prev !== "function" || prev.__nbOps481) return;
    var fn = function () {
      var out = prev.apply(this, arguments);
      try { mount(false); } catch (e) {}
      return out;
    };
    fn.__nbOps481 = true;
    try { window.renderScreen = fn; wrapped = true; note("wrapped renderScreen"); } catch (e) {}
  }

  wrapRender();
  setTimeout(wrapRender, 0);
  setTimeout(wrapRender, 1500);
  try { document.addEventListener("DOMContentLoaded", wrapRender); } catch (e) {}

  setInterval(function () {
    try { wrapRender(); } catch (e) {}
    try { settle(); } catch (e) {}
    try { mount(false); } catch (e) {}
  }, 1000);

  /* ---------------- public surface ---------------- */

  window.NB_OPS = {
    industry: industry,
    monthly: function () {
      if (isSalon()) return salonMonth();
      if (isAgency()) return agencyMonth();
      return null;
    }
  };

  window.NBOps = {
    version: "4.81",
    mount: function () { return mount(true); },
    do: act,
    autoPay: function (on) {
      var s = state();
      if (!s) return null;
      if (on === undefined) return s.books.autoPay;
      s.books.autoPay = !!on;
      try { console.log("Monthly settlement: " + (s.books.autoPay ? "on" : "off")); } catch (e) {}
      return s.books.autoPay;
    },
    report: function () {
      var s = state();
      var out = {
        version: "4.81",
        industry: industry(),
        handled: ours(),
        activeTab: ui().activeTab,
        cashField: cashField(),
        monthKey: monthKey(),
        monthsSettled: s ? s.books.months : null,
        settledTotal: s ? s.books.total : null,
        autoPay: s ? s.books.autoPay : null,
        monthly: window.NB_OPS.monthly(),
        state: s ? (isSalon() ? s.salon : s.agency) : null,
        onScreen: !!document.querySelector('[data-nbops="1"]'),
        actions: LOG.slice(-25)
      };
      try { console.log(JSON.stringify(out, null, 2)); } catch (e) { console.log(out); }
      return out;
    }
  };

  try { console.log("[v4.81] salon and agency ops screens armed. NBOps.report() for detail."); } catch (e) {}
})();
