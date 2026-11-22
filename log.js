/* ============================================================
   Back Reset - Log tab: today's targets plus a compact diary,
   one row per day counted from Day 1 of the injury.
   ============================================================ */

const Log = (() => {
  const MAX_TARGET = 4;
  const SECS_PER_MIN = 60;
  const COLS = [
    { id: "release",  head: "Ph 1" },
    { id: "big3",     head: "Big 3" },
    { id: "flexion",  head: "Bend" },
    { id: "mobility", head: "Ph 2" },
  ];

  const $ = (id) => document.getElementById(id);
  const els = {
    day: $("logDay"), date: $("logDate"), targets: $("targetRow"), table: $("logTable"),
    steppers: $("targetSteppers"), dayOne: $("dayOneInput"), summary: $("targetSummary"),
  };

  const mins = (secs) => Math.round((secs || 0) / SECS_PER_MIN);
  const shortDate = (key) =>
    parseDay(key).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  function cell(n, target) {
    if (!n) return '<td class="none">–</td>';
    const cls = target > 0 ? (n >= target ? "met" : "part") : "";
    return `<td class="${cls}">${n}</td>`;
  }

  function painCell(key) {
    const max = Pain.maxForDay(key);
    if (max === null) return '<td class="none">–</td>';
    return `<td><span class="pain-dot" style="background-color:${Pain.levelColour(max)}">` +
           `${max}</span></td>`;
  }

  function deskCell(d) {
    const parts = [mins(d.stand), mins(d.sit), mins(d.move)];
    if (!parts.some(Boolean)) return '<td class="none desk">–</td>';
    return `<td class="desk">${parts.join(" / ")}</td>`;
  }

  // Every day from Day 1 (or the first recorded day, if earlier) up to today.
  function dayKeys() {
    const today = todayKey();
    const recorded = Object.keys(History.all()).sort();
    let start = Targets.dayOne();
    if (recorded.length && recorded[0] < start) start = recorded[0];
    const painDays = Store.get("pain", []).map((e) => dayKeyOf(new Date(e.t))).sort();
    if (painDays.length && painDays[0] < start) start = painDays[0];
    if (start > today) start = today;
    const keys = [];
    for (let d = parseDay(today); dayKeyOf(d) >= start; d.setDate(d.getDate() - 1)) {
      keys.push(dayKeyOf(d));
    }
    return keys;
  }

  function renderToday() {
    const n = Targets.dayNumber();
    els.day.textContent = n > 0 ? `Day ${n}` : "Today";
    els.date.textContent = new Date().toLocaleDateString("en-GB",
      { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const today = History.day();
    const targets = Targets.get();
    const chips = COLS.filter((c) => targets[c.id] > 0 || today[c.id]).map((c) => {
      const got = today[c.id] || 0;
      const want = targets[c.id];
      const cls = want > 0 && got >= want ? "met" : got ? "part" : "";
      const name = ROUTINES.find((r) => r.id === c.id).name;
      return `<div class="target ${cls}"><b>${want > 0 ? `${got}/${want}` : got}</b>` +
             `<span>${name}</span></div>`;
    });
    const deskMins = mins(today.stand) + mins(today.sit) + mins(today.move);
    if (deskMins) {
      chips.push(`<div class="target"><b>${mins(today.stand)} / ${mins(today.sit)} / ` +
                 `${mins(today.move)}</b><span>min stood / sat / moved</span></div>`);
    }
    els.targets.innerHTML = chips.join("");
  }

  function renderTable() {
    const targets = Targets.get();
    const all = History.all();
    const head = '<thead><tr><th>Day</th><th>Date</th>' +
      COLS.map((c) => `<th>${c.head}</th>`).join("") + "<th>Pain</th><th>Desk</th></tr></thead>";
    const rows = dayKeys().map((key) => {
      const d = all[key] || {};
      const n = daysBetween(Targets.dayOne(), key) + 1;
      const isToday = key === todayKey() ? ' class="today-row"' : "";
      return `<tr${isToday}><td class="num">${n > 0 ? n : "–"}</td><td>${shortDate(key)}</td>` +
        COLS.map((c) => cell(d[c.id] || 0, targets[c.id])).join("") + painCell(key) +
        deskCell(d) + "</tr>";
    });
    els.table.innerHTML = head + `<tbody>${rows.join("")}</tbody>`;
  }

  function renderSettings() {
    const targets = Targets.get();
    els.steppers.innerHTML = COLS.map((c) => {
      const name = ROUTINES.find((r) => r.id === c.id).name;
      return `
        <div class="stepper" data-id="${c.id}">
          <span class="stepper-name">${name}</span>
          <button data-step="-1" aria-label="Fewer ${name}">−</button>
          <span class="stepper-val">${targets[c.id]}<small>/day</small></span>
          <button data-step="1" aria-label="More ${name}">+</button>
        </div>`;
    }).join("");
    els.summary.textContent = COLS.map((c) => targets[c.id]).join(" / ");
    els.dayOne.value = Targets.dayOne();
    els.dayOne.max = todayKey();
  }

  function render() {
    renderToday();
    renderTable();
  }

  els.steppers.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-step]");
    if (!btn) return;
    const id = btn.closest(".stepper").dataset.id;
    const t = Targets.get();
    t[id] = Math.min(MAX_TARGET, Math.max(0, t[id] + Number(btn.dataset.step)));
    Targets.set(t);
    renderSettings();
    render();
    Stretch.renderPicker();
  });

  els.dayOne.addEventListener("change", () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(els.dayOne.value)) return;
    Targets.setDayOne(els.dayOne.value);
    render();
  });

  // Desk minutes tick up constantly, so only repaint while the tab is on screen.
  document.addEventListener("history:changed", () => {
    if ($("logView").classList.contains("visible")) render();
  });

  renderSettings();
  render();

  return { render };
})();
