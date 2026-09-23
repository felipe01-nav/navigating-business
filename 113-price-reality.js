/* 113-price-reality.js — v4.67

   Two jobs:

   1. PRICES. Every car, boat and aircraft in the catalogue was checked
      against real 2026 market asking prices. Only the entries that were
      materially wrong are listed below; anything absent was already
      defensible and is deliberately left alone.

   2. UNLOCK RULES (stated policy, enforced programmatically so future
      catalogue additions cannot quietly violate them):
        - any car over $100,000        -> $1,000,000 net worth
        - any boat/aircraft over $1M   -> $10,000,000 net worth
        - any boat/aircraft over $500k -> $1,000,000 net worth
      The rules only ever RAISE a gate, never lower one, so hand-tuned
      higher gates at the top of each ladder survive.

   Mutates the catalogue objects in place. Loads last, after every layer
   that could touch CARS/TOYS/HOUSES. Diagnostics: NBPrices.report().
   Disable with ?noprice=1. */
(function () {
  "use strict";

  try {
    if (/[?&]noprice=1/.test(location.search)) return;
  } catch (e) {}

  /* key -> { price, note } . Sources are 2026 asking prices. */
  var PRICES = {
    /* --- cars --- */
    hatch:      { price: 25000,     note: "new compact hatchback, ~$24-26k" },
    pickup:     { price: 42000,     note: "new half-ton work trim, ~$40-45k" },
    ev:         { price: 48000,     note: "mainstream long-range EV sedan" },
    gt:         { price: 265000,    note: "Aston DB12 / Bentley Continental GT Speed" },
    chauffeur:  { price: 1500000,   note: "factory-armored S680 Guard, ~$1.5M" },
    rv:         { price: 2200000,   note: "Prevost H3-45 luxury conversion, $2-3M" },

    /* --- watercraft --- */
    bassboat:   { price: 75000,     note: "new rigged Skeeter/Ranger, $50-130k" },
    sailboat:   { price: 380000,    note: "40ft cruiser, $251k base + offshore kit" },
    sportfish:  { price: 4200000,   note: "2026 Viking 54 Convertible, $4.2M" },
    catamaran:  { price: 4800000,   note: "crewed 60-70ft charter cat" },
    yacht:      { price: 24000000,  note: "150-ft displacement yacht, brokerage" },
    superyacht: { price: 150000000, note: "250-ft new build; Feadship 250ft asks $186M" },

    /* --- aircraft --- */
    cessna:     { price: 520000,    note: "new Cessna 172S, ~$500k" },
    twin:       { price: 6500000,   note: "King Air 260, $6.5-7M new" },
    heli:       { price: 6800000,   note: "twin-engine executive light helicopter" },
    lightjet:   { price: 7000000,   note: "HondaJet Elite II ~$7.4M, Phenom 100EX ~$5.5M" },
    heavyjet:   { price: 78000000,  note: "Gulfstream G700 list ~$78-79M" },

    /* --- collectibles --- */
    vault:      { price: 900000,    note: "800-bottle cellar build + inventory" }
  };

  var CAR_GATE      = 100000,   CAR_NET   = 1000000;
  var CRAFT_HI_GATE = 1000000,  CRAFT_HI  = 10000000;
  var CRAFT_LO_GATE = 500000,   CRAFT_LO  = 1000000;

  /* The legacy "Private Jet" entry lives in CARS but is an aircraft. */
  var AIRCRAFT_IN_CARS = { jet: true };

  var applied = [], gated = [];

  function n(v) { return typeof v === "number" && isFinite(v) ? v : 0; }

  function reprice(list, label) {
    if (!list || !list.length) return;
    list.forEach(function (item) {
      if (!item || !item.key) return;
      var row = PRICES[item.key];
      if (row && n(item.price) !== row.price) {
        applied.push({ list: label, key: item.key, from: item.price, to: row.price, why: row.note });
        item.price = row.price;
      }
    });
  }

  function raise(item, floor, label, rule) {
    if (n(item.minNetWorth) >= floor) return;
    gated.push({ list: label, key: item.key, from: n(item.minNetWorth), to: floor, rule: rule });
    item.minNetWorth = floor;
  }

  function gateCars(list) {
    if (!list || !list.length) return;
    list.forEach(function (item) {
      if (!item || !item.key) return;
      if (typeof item.minNetWorth !== "number") item.minNetWorth = 0;
      if (AIRCRAFT_IN_CARS[item.key]) {
        if (n(item.price) > CRAFT_HI_GATE) raise(item, CRAFT_HI, "CARS", "aircraft > $1M");
        else if (n(item.price) > CRAFT_LO_GATE) raise(item, CRAFT_LO, "CARS", "aircraft > $500k");
        return;
      }
      if (n(item.price) > CAR_GATE) raise(item, CAR_NET, "CARS", "car > $100k");
    });
  }

  function gateCraft(list) {
    if (!list || !list.length) return;
    list.forEach(function (item) {
      if (!item || !item.key) return;
      if (item.cls !== "sea" && item.cls !== "air") return;
      if (typeof item.minNetWorth !== "number") item.minNetWorth = 0;
      if (n(item.price) > CRAFT_HI_GATE) raise(item, CRAFT_HI, "TOYS", "boat/aircraft > $1M");
      else if (n(item.price) > CRAFT_LO_GATE) raise(item, CRAFT_LO, "TOYS", "boat/aircraft > $500k");
    });
  }

  function run() {
    var cars = (typeof CARS  !== "undefined") ? CARS  : null;
    var toys = (typeof TOYS  !== "undefined") ? TOYS  : null;

    /* The legacy "yacht" entry predates cls and would otherwise escape
       the watercraft rules entirely. */
    if (toys) toys.forEach(function (t) { if (t && t.key === "yacht" && !t.cls) t.cls = "sea"; });

    reprice(cars, "CARS");
    reprice(toys, "TOYS");
    gateCars(cars);
    gateCraft(toys);
  }

  try { run(); } catch (e) {
    try { console.warn("113-price-reality: " + e.message); } catch (e2) {}
  }

  window.NBPrices = {
    version: "4.67",
    repriced: applied,
    gated: gated,
    report: function () {
      try {
        console.log("113-price-reality: " + applied.length + " repriced, " + gated.length + " gates raised");
        if (console.table) { console.table(applied); console.table(gated); }
      } catch (e) {}
      return { repriced: applied, gated: gated };
    }
  };
})();
