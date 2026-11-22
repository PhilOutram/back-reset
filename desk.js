/* ============================================================
   Back Reset - desk timer (stand / sit / move rotation)
   ------------------------------------------------------------
   Built to beep while the phone is asleep, without holding the
   screen on:
     1. deadlines are absolute (`endsAt`); the 1 s interval only
        checks them and repaints, so a throttled page fires late,
        never not at all, and catches up on return;
     2. a near-silent audio loop runs while the timer runs, which
        exempts the page from Chrome's background freezing;
     3. when the page is hidden, the change is also posted as a
        notification through the service worker.
   The state is saved, so a reload carries on where it was.
   ============================================================ */

const Desk = (() => {
  const TICK_MS       = 1000;
  const SAVE_EVERY_MS = 15000;
  const MS_PER_MIN    = 60 * MS_PER_SEC;
  const ALERT_VOL     = 0.3;
  const NUDGE_VOL     = 0.12;
  const NUDGE_FREQ    = 660;
  const VIBRATE       = [120, 80, 120];

  const FIGURES = {
    stand: '<circle cx="32" cy="10" r="5"/><path d="M32 16v20M32 22l-8 9M32 22l8 9' +
           'M32 36l-6 18M32 36l6 12h7"/><path d="M40 50h10v4H40z" class="prop"/>',
    sit:   '<circle cx="27" cy="13" r="5"/><path d="M27 19l2 17h13v16M28 25l9 5"/>' +
           '<path d="M19 22v32M19 38h19M36 38v16" class="prop"/>',
    move:  '<circle cx="35" cy="10" r="5"/><path d="M34 16l-3 20M33 22l-9 7M33 22l8 6' +
           'M31 36l-8 18M31 36l9 16"/>',
  };

  const PHASES = [
    {
      id: "stand", name: "Stand", verb: "stand",
      tones: [[523, 0], [784, 0.2]],
      tip: "One foot up on a low box (4-6 in) and swap feet every 5-10 min. Soft knees; " +
           "lean on the desk edge when your core tires.",
      body: "Back on your feet - one foot up on the box.",
    },
    {
      id: "sit", name: "Sit", verb: "sit",
      tones: [[784, 0], [523, 0.2]],
      tip: "Perch with hips higher than knees, or sit right back with a towel roll behind " +
           "your belt line. Never more than 20 minutes.",
      body: "Hips higher than knees, towel roll behind your belt line.",
    },
    {
      id: "move", name: "Move", verb: "move",
      tones: [[659, 0], [659, 0.18], [880, 0.36]],
      tip: "Get up the careful way: scoot forward, 5 tiny pelvic tilts, squeeze your glutes, " +
           "push up with your arms. Then walk, take the stairs, or lie 90/90 legs-up.",
      body: "Scoot forward, pelvic tilts, glute squeeze - then walk or lie legs-up.",
    },
  ];

  const PRESETS = [
    { name: "Rain-day", stand: 25, sit: 15, move: 5 },
    { name: "Tired evening", stand: 15, sit: 15, move: 5 },
    { name: "Standing day", stand: 40, sit: 0, move: 5 },
  ];

  const LIMITS = {
    stand: { min: 5, max: 60, step: 5 },
    sit:   { min: 0, max: 30, step: 5 },
    move:  { min: 0, max: 15, step: 1 },
  };

  const DEFAULT_CFG = { stand: 25, sit: 15, move: 5, nudge: 8, notify: true };

  const $ = (id) => document.getElementById(id);
  const els = {
    card: $("deskCard"), strip: $("phaseStrip"), figure: $("deskFigure"),
    phase: $("deskPhase"), time: $("deskTime"), next: $("deskNext"), tip: $("deskTip"),
    banner: $("deskBanner"), start: $("deskStartBtn"), stop: $("deskStopBtn"),
    skip: $("deskSkipBtn"), presets: $("presetRow"), steppers: $("stepperList"),
    nudge: $("nudgeSel"), notify: $("notifyChk"), summary: $("deskSummary"),
    today: $("deskToday"), dot: $("deskDot"),
  };

  let cfg      = { ...DEFAULT_CFG, ...Store.get("deskCfg", {}) };
  let st       = Store.get("deskState", null) || { running: false };
  let totals   = loadTotals();
  let lastTick = null;
  let lastSave = 0;
  let needsRearm = false;
  let stripKey = "";

  /* ── Persistence ───────────────────────────────────────────── */
  function loadTotals() {
    const t = Store.get("deskToday", null);
    return t && t.date === todayKey() ? t : { date: todayKey(), stand: 0, sit: 0, move: 0 };
  }
  function save() {
    Store.set("deskState", st);
    Store.set("deskToday", totals);
    lastSave = Date.now();
  }
  function saveCfg() { Store.set("deskCfg", cfg); }

  /* ── Phase maths ───────────────────────────────────────────── */
  const durMs = (i) => cfg[PHASES[i].id] * MS_PER_MIN;
  function nextIdx(i) {
    for (let k = 1; k <= PHASES.length; k++) {
      const j = (i + k) % PHASES.length;
      if (cfg[PHASES[j].id] > 0) return j;
    }
    return i;
  }
  const firstIdx = () => (cfg.stand > 0 ? 0 : nextIdx(0));
  const clockAt = (ms) =>
    new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  function resetNudge(now = Date.now()) {
    st.nextNudgeAt = cfg.nudge > 0 ? now + cfg.nudge * MS_PER_MIN : 0;
  }

  /* ── Alerts ────────────────────────────────────────────────── */
  function alertPhase(i) {
    const p = PHASES[i];
    Sound.seq(p.tones, ALERT_VOL);
    // Chrome blocks vibrate (with a console error) until the page has had a real tap.
    if (navigator.userActivation?.hasBeenActive) {
      try { navigator.vibrate?.(VIBRATE); } catch (e) {}
    }
    if (cfg.notify && document.visibilityState !== "visible") {
      Notify.show(`Time to ${p.verb} · ${cfg[p.id]} min`, p.body);
    }
    els.card.classList.remove("flash");
    void els.card.offsetWidth;
    els.card.classList.add("flash");
  }

  /* ── Controls ──────────────────────────────────────────────── */
  function begin(i) {
    const now = Date.now();
    st = { running: true, paused: false, phase: i, endsAt: now + durMs(i) };
    resetNudge(now);
    lastTick = now;
  }

  function armAudio() {
    Sound.get();
    if (st.running && !st.paused) Sound.keepAliveOn();
    needsRearm = false;
  }

  function onStart() {
    if (cfg.notify) Notify.ask().then(syncNotifyBox);
    if (!st.running) {
      begin(firstIdx());
      Sound.seq(PHASES[st.phase].tones, ALERT_VOL);
    } else if (st.paused) {
      st.paused = false;
      st.endsAt = Date.now() + st.remainMs;
      lastTick = Date.now();
    } else {
      st.remainMs = Math.max(0, st.endsAt - Date.now());
      st.paused = true;
    }
    armAudio();
    if (st.paused) Sound.keepAliveOff();
    save();
    render();
  }

  function onStop() {
    st = { running: false };
    Sound.keepAliveOff();
    needsRearm = false;
    save();
    render();
  }

  function goTo(i) {
    if (!st.running) {
      begin(i);
    } else {
      st.phase = i;
      st.paused = false;
      st.endsAt = Date.now() + durMs(i);
      resetNudge();
      lastTick = Date.now();
    }
    armAudio();
    alertPhase(i);
    save();
    render();
  }

  /* ── Ticker ────────────────────────────────────────────────── */
  function advance(now, silent) {
    let moved = false;
    while (now >= st.endsAt) {
      st.phase = nextIdx(st.phase);
      st.endsAt += durMs(st.phase);
      moved = true;
    }
    if (!moved) return;
    resetNudge(now);
    if (!silent) alertPhase(st.phase);
    save();
  }

  function tick() {
    const now = Date.now();
    if (totals.date !== todayKey()) totals = loadTotals();
    if (st.running && !st.paused) {
      if (lastTick) totals[PHASES[st.phase].id] += (now - lastTick) / MS_PER_SEC;
      lastTick = now;
      if (PHASES[st.phase].id === "stand" && st.nextNudgeAt && now >= st.nextNudgeAt) {
        Sound.pip(NUDGE_FREQ, NUDGE_VOL);
        while (st.nextNudgeAt <= now) st.nextNudgeAt += cfg.nudge * MS_PER_MIN;
      }
      advance(now, false);
      if (now - lastSave > SAVE_EVERY_MS) save();
    }
    if (document.visibilityState === "visible") render();
  }

  /* ── Rendering ─────────────────────────────────────────────── */
  function renderStrip(active) {
    const key = `${cfg.stand}/${cfg.sit}/${cfg.move}/${active}`;
    if (key === stripKey) return;
    stripKey = key;
    els.strip.innerHTML = PHASES.map((p, i) => {
      if (cfg[p.id] <= 0) return "";
      const cls = i === active ? "chip active" : "chip";
      return `<button class="${cls}" data-i="${i}" data-phase="${p.id}">` +
             `${p.name}<b>${cfg[p.id]}</b></button>`;
    }).join('<span class="chip-arrow">›</span>');
  }

  function figure(id) {
    return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" ` +
           `stroke-linecap="round" stroke-linejoin="round">${FIGURES[id]}</svg>`;
  }

  function renderToday() {
    const parts = [];
    if (totals.stand >= 60) parts.push(`stood ${fmtMins(totals.stand)}`);
    if (totals.sit >= 60) parts.push(`sat ${fmtMins(totals.sit)}`);
    if (totals.move >= 60) parts.push(`moved ${fmtMins(totals.move)}`);
    els.today.textContent = parts.length ? `Today: ${parts.join(" · ")}` : "";
  }

  function render() {
    const running = st.running;
    const i = running ? st.phase : firstIdx();
    const p = PHASES[i];
    els.card.dataset.phase = running ? p.id : "idle";
    els.card.classList.toggle("paused", running && st.paused);
    renderStrip(running ? i : -1);
    els.figure.innerHTML = figure(p.id);

    if (running) {
      const leftMs = st.paused ? st.remainMs : Math.max(0, st.endsAt - Date.now());
      const n = PHASES[nextIdx(i)];
      els.phase.textContent = st.paused ? `${p.name} · paused` : p.name;
      els.time.textContent = fmtClock(Math.ceil(leftMs / MS_PER_SEC));
      els.next.textContent = st.paused ? `Then ${n.name.toLowerCase()}` :
        `${n.name} at ${clockAt(st.endsAt)}`;
      els.tip.textContent = p.tip;
    } else {
      els.phase.textContent = "Ready";
      els.time.textContent = fmtClock(durMs(i) / MS_PER_SEC);
      els.next.textContent = `Starts with ${p.name.toLowerCase()}`;
      els.tip.textContent = "Leave this page open and let the phone sleep - it will beep " +
        "beep when it's time to change position.";
    }

    els.start.textContent = !running ? "Start" : st.paused ? "Resume" : "Pause";
    els.stop.disabled = !running;
    els.skip.disabled = !running;
    els.banner.hidden = !needsRearm;
    els.dot.classList.toggle("on", running && !st.paused);
    renderToday();
  }

  function renderSettings() {
    const match = PRESETS.find((p) =>
      p.stand === cfg.stand && p.sit === cfg.sit && p.move === cfg.move);
    els.presets.innerHTML = PRESETS.map((p) =>
      `<button class="preset ${p === match ? "active" : ""}" data-preset="${p.name}">` +
      `${p.name}<small>${p.stand} / ${p.sit} / ${p.move}</small></button>`).join("");
    els.steppers.innerHTML = PHASES.map((p) => `
      <div class="stepper" data-phase="${p.id}">
        <span class="stepper-name">${p.name}</span>
        <button data-step="-1" aria-label="Less ${p.name}">−</button>
        <span class="stepper-val">${cfg[p.id]}<small> min</small></span>
        <button data-step="1" aria-label="More ${p.name}">+</button>
      </div>`).join("");
    els.nudge.value = String(cfg.nudge);
    els.summary.textContent = `${cfg.stand} / ${cfg.sit} / ${cfg.move}`;
    syncNotifyBox();
    stripKey = "";
    render();
  }

  function syncNotifyBox() {
    const denied = Notify.supported && Notification.permission === "denied";
    els.notify.checked = cfg.notify && Notify.supported && !denied;
    els.notify.disabled = !Notify.supported || denied;
  }

  /* ── Events ────────────────────────────────────────────────── */
  els.start.addEventListener("click", onStart);
  els.stop.addEventListener("click", onStop);
  els.skip.addEventListener("click", () => st.running && goTo(nextIdx(st.phase)));
  els.banner.addEventListener("click", () => { armAudio(); render(); });
  els.strip.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) goTo(Number(chip.dataset.i));
  });

  els.presets.addEventListener("click", (e) => {
    const btn = e.target.closest(".preset");
    if (!btn) return;
    const p = PRESETS.find((x) => x.name === btn.dataset.preset);
    Object.assign(cfg, { stand: p.stand, sit: p.sit, move: p.move });
    saveCfg();
    renderSettings();
  });

  els.steppers.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-step]");
    if (!btn) return;
    const id = btn.closest(".stepper").dataset.phase;
    const lim = LIMITS[id];
    const val = cfg[id] + Number(btn.dataset.step) * lim.step;
    cfg[id] = Math.min(lim.max, Math.max(lim.min, val));
    saveCfg();
    renderSettings();
  });

  els.nudge.addEventListener("change", () => {
    cfg.nudge = Number(els.nudge.value);
    saveCfg();
    if (st.running) { resetNudge(); save(); }
  });

  els.notify.addEventListener("change", async () => {
    cfg.notify = els.notify.checked;
    saveCfg();
    if (cfg.notify) {
      const perm = await Notify.ask();
      if (perm !== "granted") { cfg.notify = false; saveCfg(); }
      syncNotifyBox();
    }
  });

  // Any tap re-arms the audio after a reload (browsers need a gesture to start it).
  document.addEventListener("pointerdown", () => { if (needsRearm) { armAudio(); render(); } });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") { Sound.get(); tick(); }
    else save();
  });
  window.addEventListener("pagehide", save);

  /* ── Boot: carry on after a reload ─────────────────────────── */
  if (st.running && !st.paused) {
    advance(Date.now(), true);
    needsRearm = true;
  }
  renderSettings();
  setInterval(tick, TICK_MS);

  return { render };
})();
