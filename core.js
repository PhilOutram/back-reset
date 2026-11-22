/* ============================================================
   Back Reset - shared helpers: storage, sound, voice,
   notifications and the screen wake lock.
   ============================================================ */

const MS_PER_SEC     = 1000;
const STORE_PREFIX   = "backReset.";
const KEEPALIVE_AMP  = 0.0005;  // about -66 dBFS: counts as playback, inaudible
const KEEPALIVE_SECS = 2;       // length of the looped keep-alive buffer
const PIP_SECS       = 0.18;

/* ── Storage ─────────────────────────────────────────────────── */
const Store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(STORE_PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value)); } catch (e) {}
  },
};

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-` +
         String(d.getDate()).padStart(2, "0");
}

function fmtClock(secs) {
  const s = Math.max(0, Math.round(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fmtMins(secs) {
  const m = Math.round(secs / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

/* ── Sound ───────────────────────────────────────────────────────
   One AudioContext for the whole app, created on the first tap (browsers refuse to
   start audio without a gesture). The keep-alive loop is very quiet noise rather
   than digital silence: Chrome only exempts a page from background freezing when
   it is genuinely "playing audio", and that is what lets the desk timer beep while
   the phone is asleep. */
const Sound = (() => {
  let ctx = null;
  let keepAliveNode = null;

  function get() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  function pip(freq, vol = 0.18, delay = 0, dur = PIP_SECS) {
    try {
      const c = get();
      if (!c) return;
      const t = c.currentTime + delay;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(c.destination);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (e) {}
  }

  // notes: [[freq, delaySecs], ...]
  function seq(notes, vol) {
    notes.forEach(([freq, delay]) => pip(freq, vol, delay));
  }

  function keepAliveOn() {
    const c = get();
    if (!c || keepAliveNode) return;
    try {
      const frames = Math.floor(c.sampleRate * KEEPALIVE_SECS);
      const buf = c.createBuffer(1, frames, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * KEEPALIVE_AMP;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(c.destination);
      src.start();
      keepAliveNode = src;
    } catch (e) {}
  }

  function keepAliveOff() {
    if (!keepAliveNode) return;
    try { keepAliveNode.stop(); } catch (e) {}
    keepAliveNode = null;
  }

  function isRunning() {
    return !!ctx && ctx.state === "running";
  }

  return { get, pip, seq, keepAliveOn, keepAliveOff, isRunning };
})();

/* ── Voice ───────────────────────────────────────────────────── */
const Voice = (() => {
  let enabled = Store.get("voice", true);

  function speak(text) {
    if (!enabled || !text || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92;
    u.pitch = 0.95;
    const pref = window.speechSynthesis.getVoices()
      .find((v) => /en-GB/i.test(v.lang) && /natural|google|female|male/i.test(v.name)) ||
      window.speechSynthesis.getVoices().find((v) => /en-GB|en-AU/i.test(v.lang));
    if (pref) u.voice = pref;
    window.speechSynthesis.speak(u);
  }

  function stop() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function toggle() {
    enabled = !enabled;
    Store.set("voice", enabled);
    if (!enabled) stop();
    return enabled;
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }

  return { speak, stop, toggle, isOn: () => enabled };
})();

/* ── Notifications ───────────────────────────────────────────────
   Android Chrome refuses `new Notification()` from a page, so they go through the
   service worker registration. Only used when the page is hidden - on screen, the
   beep is enough. */
const Notify = {
  supported: "Notification" in window && "serviceWorker" in navigator,

  async ask() {
    if (!this.supported) return "unsupported";
    if (Notification.permission === "default") {
      try { return await Notification.requestPermission(); } catch (e) {}
    }
    return Notification.permission;
  },

  async show(title, body) {
    if (!this.supported || Notification.permission !== "granted") return;
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        tag: "back-reset-desk",
        renotify: true,
        icon: "icon-192.png",
        badge: "icon-192.png",
        vibrate: [150, 100, 150],
      });
    } catch (e) {}
  },
};

/* ── Screen wake lock (stretch routines only) ────────────────── */
const Wake = (() => {
  let lock = null;
  let wanted = false;

  async function on() {
    wanted = true;
    if (!("wakeLock" in navigator) || (lock && !lock.released)) return;
    try { lock = await navigator.wakeLock.request("screen"); } catch (e) {}
  }

  async function off() {
    wanted = false;
    try { await lock?.release(); } catch (e) {}
    lock = null;
  }

  // The OS drops the lock whenever the page is hidden; take it back on return.
  document.addEventListener("visibilitychange", () => {
    if (wanted && document.visibilityState === "visible") on();
  });

  return { on, off };
})();
