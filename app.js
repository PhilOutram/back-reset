/* ============================================================
   Back Reset - app shell: tabs, modals, Big 3 options,
   version badge and service worker.
   ============================================================ */

(() => {
  const $ = (id) => document.getElementById(id);

  /* ── Tabs ──────────────────────────────────────────────────── */
  const tabs = document.querySelectorAll(".tab");
  const views = {
    stretch: $("stretchView"), desk: $("deskView"), log: $("logView"), pain: $("painView"),
  };

  function showView(name) {
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.view === name));
    Object.entries(views).forEach(([k, v]) => v.classList.toggle("visible", k === name));
    Store.set("view", name);
    if (name === "desk") Desk.render();
    if (name === "log") Log.render();
    if (name === "pain") Pain.render();
  }
  tabs.forEach((t) => t.addEventListener("click", () => showView(t.dataset.view)));
  showView(Store.get("view", "stretch"));

  /* ── Modals ────────────────────────────────────────────────── */
  function openModal(id) { $(id).classList.add("visible"); }
  function closeModals() {
    document.querySelectorAll(".overlay.visible").forEach((o) => o.classList.remove("visible"));
  }
  document.querySelectorAll(".overlay").forEach((o) => {
    o.addEventListener("click", (e) => {
      if (e.target === o || e.target.closest("[data-close]")) closeModals();
    });
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModals(); });
  $("helpBtn").addEventListener("click", () => openModal("helpOverlay"));
  $("settingsBtn").addEventListener("click", () => {
    renderBig3();
    openModal("settingsOverlay");
  });

  /* ── Day number ────────────────────────────────────────────── */
  const MAX_DAY = 365;

  function renderDay() {
    $("dayBtn").textContent = Targets.label();
    const n = Targets.dayNumber();
    $("dayVal").innerHTML = `Day ${n}`;
    $("dayOneInput").value = Targets.dayOne();
    $("dayOneInput").max = todayKey();
  }

  // Everything that shows a day number repaints when it changes.
  function dayChanged() {
    renderDay();
    document.dispatchEvent(new CustomEvent("day:changed"));
  }

  function stepDay(delta) {
    const n = Math.min(MAX_DAY, Math.max(1, Targets.dayNumber() + delta));
    Targets.setDayNumber(n);
    dayChanged();
  }

  $("dayBtn").addEventListener("click", () => { renderDay(); openModal("dayOverlay"); });
  $("dayMinus").addEventListener("click", () => stepDay(-1));
  $("dayPlus").addEventListener("click", () => stepDay(1));
  $("dayOneInput").addEventListener("change", () => {
    const v = $("dayOneInput").value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v > todayKey()) return;
    Targets.setDayOne(v);
    dayChanged();
  });
  $("dayResetBtn").addEventListener("click", () => {
    if (!confirm("Make today Day 1? Earlier entries keep their dates; their day numbers " +
                 "will count from the new Day 1.")) return;
    Targets.setDayOne(todayKey());
    dayChanged();
  });

  // Roll over at midnight without a reload.
  let shownDay = todayKey();
  setInterval(() => {
    if (todayKey() !== shownDay) { shownDay = todayKey(); dayChanged(); }
  }, 60 * MS_PER_SEC);
  renderDay();

  /* ── Big 3 options ─────────────────────────────────────────── */
  function big3Opts() { return { ...DEFAULT_OPTIONS, ...Store.get("big3", {}) }; }

  function renderBig3() {
    const opts = big3Opts();
    document.querySelectorAll(".choice-group").forEach((g) => {
      const current = g.dataset.store ? Store.get(g.dataset.store, "quiet") : opts[g.dataset.opt];
      g.querySelectorAll("button").forEach((b) => {
        b.classList.toggle("active", String(current) === b.dataset.val);
      });
    });
    const mins = Math.round(buildRoutine("big3", opts).total / 60);
    $("big3Summary").textContent = `About ${mins} minutes with these settings.`;
  }

  document.querySelectorAll(".choice-group").forEach((g) => {
    g.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (g.dataset.store) {
        Store.set(g.dataset.store, b.dataset.val);
        renderBig3();
        return;
      }
      const opts = Store.get("big3", {});
      const key = g.dataset.opt;
      opts[key] = key === "pyramid" ? b.dataset.val : Number(b.dataset.val);
      Store.set("big3", opts);
      renderBig3();
      Stretch.renderPicker();
    });
  });

  /* ── Version badge ─────────────────────────────────────────── */
  const badge = document.createElement("button");
  badge.className = "version-badge";
  badge.textContent = VERSION;
  badge.title = "Changelog";
  badge.addEventListener("click", () => {
    const overlay = document.createElement("div");
    overlay.className = "overlay visible";
    overlay.innerHTML =
      '<div class="modal"><div class="modal-head"><h2>Changelog</h2>' +
      '<button class="modal-close" data-close>&times;</button></div><div class="modal-body">' +
      CHANGELOG.map((c) =>
        `<h3>${c.version} <span class="muted">${c.date}</span></h3>` +
        `<ul>${c.notes.map((n) => `<li>${n}</li>`).join("")}</ul>`).join("") +
      "</div></div>";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.closest("[data-close]")) overlay.remove();
    });
    document.body.appendChild(overlay);
  });
  document.body.appendChild(badge);

  /* ── Service worker (offline + notifications) ─────────────── */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
    });
  }
})();
