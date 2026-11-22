/* ============================================================
   Back Reset - stretch routine player
   ------------------------------------------------------------
   Steps through the flat segment list from routines.js against an
   absolute `endsAt`, so a busy main thread can never drift the
   clock. Holds the screen wake lock while a routine runs.
   ============================================================ */

const Stretch = (() => {
  const TICK_MS      = 200;
  const BACK_GRACE   = 3;     // seconds into an exercise before "back" restarts it
  const RING_CIRC    = 2 * Math.PI * 52;
  const COUNT_IN     = [3, 2, 1];
  const PHASE_TEXT   = {
    ready: "Get ready",
    timed: "Breathe",
    hold:  "Hold",
    relax: "Relax",
    switch: "Switch",
    rest:  "Rest",
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    pick: $("pickScreen"), play: $("playArea"), done: $("doneScreen"),
    list: $("routineList"), begin: $("beginBtn"),
    exCount: $("exCount"), poseImg: $("poseImg"), pose: $("pose"),
    ring: $("timerRing"), num: $("timerNum"), pill: $("phasePill"),
    name: $("exName"), side: $("exSide"), label: $("exLabel"), tip: $("exTip"),
    fill: $("sessionFill"), next: $("nextLabel"), left: $("sessionLeft"),
    pause: $("pauseBtn"), prev: $("prevBtn"), skip: $("nextBtn"), stop: $("stopBtn"),
    voice: $("voiceBtn"), doneText: $("doneText"), doneCount: $("doneCount"),
    again: $("againBtn"),
  };

  let selected = Store.get("routine", "release");
  let plan     = null;
  let idx      = 0;
  let endsAt   = 0;
  let remainMs = 0;
  let paused   = false;
  let ticker   = null;
  let lastWhole = null;
  let paceKey  = null;

  els.ring.style.strokeDasharray = RING_CIRC;

  /* ── Today's tally (recorded in History, shown in the Log tab) ─ */
  function bumpTally(id) {
    History.add(id, 1);
    History.save();
    return History.day()[id];
  }

  // Routines meant for later in recovery say how far off that is.
  function dayHint(r) {
    if (!r.fromDay) return "";
    const left = r.fromDay - Targets.dayNumber();
    if (left <= 0) return "";
    return ` <span class="day-hint">· ${left} day${left === 1 ? "" : "s"} to go</span>`;
  }

  function badgeFor(n, target) {
    if (target > 0) {
      const met = n >= target ? " met" : "";
      return `<span class="done-badge${met}">${n} of ${target} today</span>`;
    }
    return n ? `<span class="done-badge">${n}× today</span>` : "";
  }

  /* ── Routine picker ────────────────────────────────────────── */
  function renderPicker() {
    const today = History.day();
    const targets = Targets.get();
    const opts = Store.get("big3", {});
    els.list.innerHTML = ROUTINES.map((r) => {
      const mins = Math.round(buildRoutine(r.id, opts).total / 60);
      const badge = badgeFor(today[r.id] || 0, targets[r.id] || 0);
      return `
        <button class="routine ${r.id === selected ? "selected" : ""}" data-id="${r.id}">
          <span class="routine-head"><span class="routine-name">${r.name}</span>
            <span class="routine-mins">${mins} min</span></span>
          <span class="routine-when">${r.when}${dayHint(r)}</span>
          <span class="routine-blurb">${r.blurb}</span>
          ${badge}
        </button>`;
    }).join("");
  }

  els.list.addEventListener("click", (e) => {
    const btn = e.target.closest(".routine");
    if (!btn) return;
    selected = btn.dataset.id;
    Store.set("routine", selected);
    renderPicker();
  });

  /* ── Pose images ───────────────────────────────────────────── */
  const preloaded = {};
  function preload() {
    Object.values(EXERCISES).forEach((e) => {
      if (preloaded[e.img]) return;
      const img = new Image();
      img.src = e.img;
      preloaded[e.img] = img;
    });
  }

  function showPose(src) {
    if (els.poseImg.getAttribute("src") === src) return;
    els.poseImg.src = src;
    els.pose.classList.remove("animate-in");
    void els.pose.offsetWidth;
    els.pose.classList.add("animate-in");
  }

  /* ── Rendering ─────────────────────────────────────────────── */
  function setRing(fraction) {
    els.ring.style.strokeDashoffset = RING_CIRC * (1 - fraction);
  }

  function nextExerciseName() {
    const cur = plan.segments[idx];
    const nxt = plan.segments.find((s, i) => i > idx && s.exIdx !== cur.exIdx);
    return nxt ? `Next: ${EXERCISES[nxt.ex].name}` : "Last one";
  }

  function renderSegment() {
    const s = plan.segments[idx];
    const e = EXERCISES[s.ex];
    showPose(e.img);
    els.exCount.textContent = `${s.exIdx + 1} of ${plan.exCount} · ${plan.routine.name}`;
    els.name.textContent = e.name;
    els.side.textContent = s.side || "";
    els.label.textContent = s.label || "";
    els.tip.textContent = s.kind === "ready" && s.how ? s.how : e.tip;
    els.pill.textContent = PHASE_TEXT[s.kind];
    els.play.dataset.kind = s.kind;
    els.next.textContent = nextExerciseName();
  }

  function renderClock() {
    const s = plan.segments[idx];
    const leftMs = paused ? remainMs : Math.max(0, endsAt - Date.now());
    const left = Math.ceil(leftMs / MS_PER_SEC);
    els.num.textContent = left >= 60 ? fmtClock(left) : String(left);
    els.num.classList.toggle("long", left >= 60);
    setRing(leftMs / (s.secs * MS_PER_SEC));
    const before = plan.segments.slice(0, idx).reduce((sum, x) => sum + x.secs, 0);
    const done = before + (s.secs - leftMs / MS_PER_SEC);
    els.fill.style.width = `${Math.min(100, (done / plan.total) * 100)}%`;
    els.left.textContent = `${fmtClock(plan.total - done)} left`;
    return left;
  }

  /* ── Cues ──────────────────────────────────────────────────── */
  function cueEnter(s) {
    switch (s.kind) {
      case "ready":
        Voice.speak(s.say);
        break;
      case "timed":
        if (!EXERCISES[s.ex].pace) Sound.seq([[880, 0]], 0.22);
        break;
      case "hold":
        Sound.seq([[880, 0]], 0.22);
        Voice.speak("Hold");
        break;
      case "relax":
        Sound.seq([[523, 0]], 0.16);
        Voice.speak("Relax");
        break;
      case "switch":
        Sound.seq([[523, 0]], 0.16);
        Voice.speak(s.say || "Switch");
        break;
      case "rest":
        Sound.seq([[523, 0], [440, 0.2]], 0.16);
        Voice.speak(s.say || "Rest");
        break;
    }
  }

  // Count-in pips for the segments that lead into effort.
  function cueTick(s, left) {
    if (!COUNT_IN.includes(left)) return;
    if (["ready", "rest", "relax", "switch"].includes(s.kind)) {
      Sound.pip(left === 1 ? 740 : 600, 0.13);
    }
  }

  /* ── Pacing ──────────────────────────────────────────────────
     Moving exercises (cat-cow, bridges, roll-downs...) carry a `pace` such as
     [["Arch", 4], ["Round", 4]]: each half gets a soft pip, the word on screen and,
     with voice on, the word spoken - so you move with the rhythm instead of holding. */
  const PACE_FREQS = [660, 520];
  const PACE_VOL   = 0.12;
  const RHYTHM_WORD_VOL = 0.2;   // the in-between words are spoken quietly
  const PACE_TAIL_MS = 1200;   // no new cue this close to the end of the exercise

  function paceAt(pace, t) {
    const cycle = pace.reduce((sum, [, d]) => sum + d, 0);
    const rep = Math.floor(t / cycle);
    let r = t - rep * cycle;
    let i = 0;
    while (i < pace.length - 1 && r >= pace[i][1]) { r -= pace[i][1]; i++; }
    return { rep, i };
  }

  function paceTick() {
    const s = plan.segments[idx];
    const pace = EXERCISES[s.ex].pace;
    if (s.kind !== "timed" || !pace) return;
    const leftMs = Math.max(0, endsAt - Date.now());
    const { rep, i } = paceAt(pace, s.secs - leftMs / MS_PER_SEC);
    const key = `${idx}:${rep}:${i}`;
    if (key === paceKey) return;
    paceKey = key;
    els.pill.textContent = pace[i][0];
    els.label.textContent = (s.label ? `${s.label} · ` : "") + `Rep ${rep + 1}`;
    if (leftMs < PACE_TAIL_MS) return;
    Sound.pip(PACE_FREQS[i % PACE_FREQS.length], PACE_VOL);
    if (Store.get("rhythm", "quiet") === "quiet") Voice.speak(pace[i][0], RHYTHM_WORD_VOL);
  }

  /* ── Engine ────────────────────────────────────────────────── */
  function enter(i, announce = true) {
    idx = i;
    const s = plan.segments[idx];
    endsAt = Date.now() + s.secs * MS_PER_SEC;
    remainMs = s.secs * MS_PER_SEC;
    lastWhole = null;
    paceKey = null;
    renderSegment();
    renderClock();
    if (announce && !paused) {
      cueEnter(s);
      paceTick();
    }
  }

  function tick() {
    if (!plan || paused) return;
    // Step over any segments that ended (a throttled tab can miss several ticks).
    while (Date.now() >= endsAt) {
      if (idx + 1 >= plan.segments.length) { finish(); return; }
      const carry = endsAt;
      enter(idx + 1);
      endsAt = carry + plan.segments[idx].secs * MS_PER_SEC;
    }
    const left = renderClock();
    paceTick();
    if (left !== lastWhole) {
      lastWhole = left;
      cueTick(plan.segments[idx], left);
    }
  }

  function start() {
    Sound.get();   // unlock audio inside the tap
    plan = buildRoutine(selected, Store.get("big3", {}));
    paused = false;
    els.pause.textContent = "Pause";
    els.pick.classList.remove("visible");
    els.done.classList.remove("visible");
    els.play.classList.add("visible");
    enter(0);
    clearInterval(ticker);
    ticker = setInterval(tick, TICK_MS);
    Wake.on("stretch");
    document.dispatchEvent(new CustomEvent("stretch:state", { detail: true }));
  }

  function togglePause() {
    if (!plan) return;
    if (paused) {
      paused = false;
      endsAt = Date.now() + remainMs;
      els.pause.textContent = "Pause";
    } else {
      remainMs = Math.max(0, endsAt - Date.now());
      paused = true;
      els.pause.textContent = "Resume";
      Voice.stop();
    }
  }

  function firstOfExercise(exIdx) {
    return plan.segments.findIndex((s) => s.exIdx === exIdx);
  }

  function skip() {
    if (!plan) return;
    const cur = plan.segments[idx].exIdx;
    const nxt = plan.segments.findIndex((s) => s.exIdx > cur);
    if (nxt < 0) { finish(); return; }
    enter(nxt);
  }

  function back() {
    if (!plan) return;
    const cur = plan.segments[idx].exIdx;
    const first = firstOfExercise(cur);
    const elapsed = plan.segments[idx].secs - (endsAt - Date.now()) / MS_PER_SEC;
    const restart = idx !== first || elapsed > BACK_GRACE || cur === 0;
    enter(restart ? first : firstOfExercise(cur - 1));
  }

  function teardown() {
    clearInterval(ticker);
    ticker = null;
    Voice.stop();
    Wake.off("stretch");
    els.play.classList.remove("visible");
    document.dispatchEvent(new CustomEvent("stretch:state", { detail: false }));
  }

  function finish() {
    const name = plan.routine.name;
    const id = plan.routine.id;
    const n = bumpTally(id);
    teardown();
    plan = null;
    els.doneText.textContent = `${name} complete. Getting up: brace lightly, roll onto ` +
      "your side as one piece, push up to hands and knees, then half-kneel and stand.";
    const target = Targets.get()[id] || 0;
    const day = `Day ${Targets.dayNumber()}`;
    els.doneCount.textContent = target > 0 ?
      `${day}: ${n} of ${target}${n >= target ? " - target met" : ""}.` :
      `${day}: ${n}× so far.`;
    els.done.classList.add("visible");
    Sound.seq([[523, 0], [659, 0.18], [784, 0.36]], 0.18);
    Voice.speak(`${name} complete. Nicely done.`);
  }

  function stop() {
    teardown();
    plan = null;
    showPicker();
  }

  function showPicker() {
    els.done.classList.remove("visible");
    els.play.classList.remove("visible");
    els.pick.classList.add("visible");
    renderPicker();
  }

  function renderVoice() {
    els.voice.classList.toggle("muted", !Voice.isOn());
  }

  els.begin.addEventListener("click", start);
  els.pause.addEventListener("click", togglePause);
  els.skip.addEventListener("click", skip);
  els.prev.addEventListener("click", back);
  els.stop.addEventListener("click", stop);
  els.again.addEventListener("click", showPicker);
  els.voice.addEventListener("click", () => { Voice.toggle(); renderVoice(); });

  // Catch up straight away when the page comes back (screen was off, app switch).
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tick();
  });

  document.addEventListener("day:changed", renderPicker);
  renderPicker();
  renderVoice();
  preload();

  return { renderPicker, isActive: () => !!plan };
})();
