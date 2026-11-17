/*
  ROCCO'S SIGNAGE PLAYER (shared by every board)
  ------------------------------------------------------------------
  - Prices come from the command center feed (the same one the website
    reads) by Sheet ID, R001 to R148. Never type prices into a board.
  - The last good feed is kept on the TV, so a Wi-Fi drop never blanks
    the screen. Refreshes every 2 minutes.
  - Scales the 1920x1080 stage to any screen, drifts a few pixels every
    10 minutes (burn-in), reloads at 4 am to pick up changes.
*/
(function () {
  "use strict";

  const FEED_URL = "https://script.google.com/macros/s/AKfycbzkbxqELRFK9v2PrBRJ0OOehKyHh74gEq3z_cOJWy4HQID9cyS9oWAMzPuflg4UCVkU/exec?feed=1";
  const STORE_KEY = "roccos_signage_feed_v1";
  const TZ = "America/New_York";

  // Fallback prices: only for the very first load with no internet.
  const FALLBACK = {
    R001:"$9.50",R002:"$9.50",R003:"$10.95",R004:"$10.95",R005:"$25.99",R006:"$26.99",R007:"$16.50",
    R008:"$13.95",R009:"$15.95",R010:"Med $2.00 / Large $2.50",R011:"$19.95",R012:"$4.00 each",R017:"$10.95",
    R018:"$16.95",R019:"$18.95",R020:"$15.95",R021:"$18.95",R023:"$15.95",R024:"$19.00",R025:"$19.95",
    R026:"$18.95",R027:"$16.95",R028:"Med $17.75 / Large $19.75 / Sicilian $22.75",R029:"$18.95",
    R031:"$15.50",R032:"$23.00",R033:"S $10.00 / M $16.00 / L $19.95",R034:"S $10.00 / M $16.00 / L $19.95",
    R035:"S $10.00 / M $16.00 / L $19.95",R036:"S $10.00 / M $16.00 / L $19.95",R037:"S $10.00 / M $16.00 / L $19.95",
    R038:"S $10.00 / M $16.00 / L $19.95",R039:"S $10.00 / M $16.00 / L $19.95",R040:"S $10.00 / M $16.00 / L $19.95",
    R042:"$11.25",R043:"$12.95",R044:"$12.99",R045:"$12.25",R046:"$13.95",R047:"$13.25",R048:"$13.95",
    R049:"$12.99",R050:"$12.99",R051:"$11.95",R052:"$12.99",R053:"$12.99",R054:"$9.95",R055:"$12.99",
    R056:"$12.25",R057:"$12.99",R060:"$10.95",R061:"$12.25",R062:"$12.95",R063:"$13.95",R065:"$9.95",
    R067:"$12.95",R068:"$12.95",R069:"$11.95",R070:"$11.95",R071:"$11.95",R072:"$12.95",R073:"$10.95",
    R074:"$10.95",R075:"$11.95",R076:"$11.95",R077:"$11.95",R078:"$0.75 each",R079:"$6.50",R080:"$5.25",
    R081:"$6.99",R082:"$6.99",R083:"$3.00",R084:"$3.00",R085:"$3.75",R086:"$6.99",R087:"$7.99",R088:"$14.99",
    R089:"$14.95",R090:"$9.25",R091:"$4.50",R092:"$14.95",R093:"$14.95",R094:"$14.95",R096:"$16.95",
    R099:"$5.00",R100:"$11.95",R101:"$12.95",R102:"$7.50",R103:"$8.95",R104:"$9.50",R105:"$9.50",R106:"$9.95",
    R107:"$10.25",R108:"$10.95",R109:"$18.95",R110:"$19.95",R111:"$18.95",R112:"$18.95",R113:"$19.95",
    R114:"$18.95",R115:"$17.95",R116:"$17.95",R117:"$17.95",R123:"$15.95",R124:"$15.95",R125:"$11.95",
    R126:"$15.95",R127:"$14.95",R128:"$16.95",R129:"$17.95",R130:"$15.95",R131:"$16.95",R132:"$15.95",
    R133:"$16.95",R134:"$15.95",R135:"$15.95",R136:"$16.95",R137:"$16.95",R138:"$15.95",R139:"$18.95",
    R140:"$18.95",R141:"$4.95",R142:"$6.95",R143:"$7.95",R144:"$11.95",R145:"$4.75",R146:"$7.95",R015:"$2.50",R016:"$3.25",R022:"$18.95",R013:"$4.00 extra"
  };

  const RS = window.RS = {
    prices: Object.assign({}, FALLBACK),
    settings: { soup: "", banner: "", soupList: [] },
    TZ: TZ
  };

  RS.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  };

  /** "$16.95" -> 16<sup>95</sup> ; "$19.00" -> 19 (works inside longer text). */
  RS.money = function (str) {
    return RS.esc(str).replace(/\$?(\d+)\.(\d{2})/g, (m, d, c) => c === "00" ? d : d + "<sup>" + c + "</sup>");
  };
  RS.price = function (id) { return RS.prices[id] || ""; };
  RS.p = function (id) { return RS.money(RS.price(id)); };

  /** Pull one size out of a multi-size price: RS.size("R028", "Large"). */
  RS.size = function (id, label) {
    const part = RS.price(id).split("/").map(s => s.trim()).find(s => s.toLowerCase().indexOf(label.toLowerCase()) === 0);
    return part ? part.replace(/^[A-Za-z]+\s+/, "") : "";
  };

  /** 1 = Monday ... 7 = Sunday, in the shop's time zone. */
  RS.weekday = function () {
    const d = new Date().toLocaleDateString("en-US", { timeZone: TZ, weekday: "short" });
    return { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[d] || 1;
  };
  RS.today = function () { // yyyy-mm-dd in the shop's time zone
    return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  };

  /* ---------- stage ---------- */
  function scale() {
    const st = document.querySelector(".stage");
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    st.style.transform = "translate(-50%, -50%) scale(" + s + ")";
  }
  let drift = 0;
  function nudge() {
    const offs = [[0,0],[3,2],[-3,2],[3,-2],[-3,-2],[0,3]];
    drift = (drift + 1) % offs.length;
    const st = document.querySelector(".stage");
    st.style.marginLeft = offs[drift][0] + "px";
    st.style.marginTop = offs[drift][1] + "px";
  }

  /* ---------- feed ---------- */
  function apply(feed) {
    if (!feed || !Array.isArray(feed.items)) return false;
    const next = Object.assign({}, FALLBACK);
    feed.items.forEach(it => { if (it && it.id && it.price) next[it.id] = String(it.price).trim(); });
    RS.prices = next;
    RS.settings = Object.assign({ soup: "", banner: "", soupList: [] }, feed.settings || {});
    return true;
  }

  /**
   * RS.start(render): render() draws the board. It runs once right away
   * (last good prices), again whenever fresh prices arrive.
   */
  RS.start = function (render) {
    scale();
    window.addEventListener("resize", scale);
    try { apply(JSON.parse(localStorage.getItem(STORE_KEY) || "null")); } catch (e) {}
    render();
    const load = () => fetch(FEED_URL, { cache: "no-store" })
      .then(r => r.json())
      .then(feed => {
        if (!apply(feed)) return;
        try { localStorage.setItem(STORE_KEY, JSON.stringify(feed)); } catch (e) {}
        render();
      })
      .catch(() => { /* keep the last good prices */ });
    load();
    setInterval(load, 2 * 60 * 1000);
    setInterval(nudge, 10 * 60 * 1000);
    setInterval(() => {
      const h = Number(new Date().toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hour12: false }));
      if (h === 4 && performance.now() > 2 * 3600 * 1000) location.reload();
    }, 30 * 60 * 1000);
  };
})();
