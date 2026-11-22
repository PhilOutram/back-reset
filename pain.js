/* ============================================================
   Back Reset - Pain tab: tap the map of the back to log where it
   hurts, how much (0-10) and what it feels like. Entries form a
   dated journal that copies as plain text (for a physio or an AI)
   and exports a numbered map image to go with it.
   ============================================================ */

const Pain = (() => {
  const VIEW_W        = 200;   // the back seen from behind, lowest ribs to just below the knees
  const VIEW_H        = 290;   // the body ends at about 285
  const MID_X         = VIEW_W / 2;
  const IMG_SRC       = "poses/back-map.webp";
  const IMG_H         = 298.1; // the 848 x 1264 illustration scaled to VIEW_W
  const LABEL_INSET   = 4;     // LEFT / RIGHT in the empty top corners
  const LABEL_Y       = 7;
  const MAP_VERSION   = 3;     // v0.16 illustrated map; v0.08-v0.15 used a drawn outline
  const PREVIEW_MS    = 1000;  // the tapped spot shows this long before the form opens
  const LIVE_DAYS     = 7;     // markers and list rows shown on the tab
  const EXPORT_SCALE  = 4;     // matches the illustration's own resolution
  const MAX_LEVEL     = 10;
  const MARK_R        = 4.4;
  const MARK_R_LAST   = 6;
  const MARK_R_EXPORT = 5;
  const MARK_R_MINI   = 14;
  const OUTER_THIGH   = 0.75;  // fraction of the way across a leg that counts as the outer side
  const DAY_HEAD      = { weekday: "short", day: "numeric", month: "short", year: "numeric" };
  const MS_PER_MIN    = 60 * MS_PER_SEC;
  const KINDS = ["Ache", "Stiff", "Sharp", "Spasm / catch", "Tingling / numb", "Burning",
    "Shooting"];
  const NERVE_KINDS = ["Tingling / numb", "Shooting"];
  const COLOURS = { low: "#6E8B5A", mid: "#C8894A", high: "#B4533A" };

  /* ── The back: landmarks measured from the illustration ────── */
  // Heights on the map (0 = top of the picture).
  const Y = {
    RIBS: 38.9, CREST: 84, PELVIS: 96, GLUTE_MED: 125, SACRUM: 127, SIT_BONE: 140,
    CROTCH: 147.4, FOLD: 158, THIGH_MID: 200, KNEE: 236,
  };
  // Widths: distance from the spine where one region gives way to the next.
  const X = {
    SPINE: 8, SI: 20, GLUTE_MED: 24, SIT_BONE: 24, ERECTOR: 29, TROCHANTER: 49,
  };
  const VERTEBRAE = [["T11", 35], ["T12", 42.5], ["L1", 51.4], ["L2", 62.5], ["L3", 73.3],
    ["L4", 80.9], ["L5", 87.7]];
  // Body edges as [distance from the spine, height], measured from the picture.
  const SIDE = [[49, 11.3], [48.8, 23.6], [49.8, 33], [51.4, 42.5], [45, 47], [43.2, 51.9],
    [42.5, 61.3], [44.8, 70.8], [47.9, 80.2], [49.5, 89.6], [51.7, 99.1], [53.5, 108.5],
    [54.5, 117.9], [55.4, 127.4], [56.6, 136.8], [56.6, 146.2], [56.4, 155.7], [55.7, 165.1],
    [55, 174.5], [53.8, 184], [52.4, 193.4], [50.9, 202.8], [49.1, 212.3], [47.2, 221.7],
    [45.8, 231.1], [44.8, 240.6], [44.6, 250], [45.3, 259.4], [46.9, 268.9], [47.9, 278.3],
    [48, 285.3]];
  const INNER = [[0, Y.CROTCH], [2.4, 149.7], [2.4, 161.5], [3.3, 173.3], [5.4, 185.1],
    [7.5, 196.9], [9, 208.7], [9.4, 220.5], [9.7, 232.3], [10.6, 244], [13.2, 255.8],
    [15.8, 267.6], [14.9, 279.4], [15, 285.3]];

  const fmt = (p) => `${+p[0].toFixed(1)} ${+p[1].toFixed(1)}`;
  const place = (sign, pts) => pts.map(([dx, y]) => [MID_X + sign * dx, y]);
  const poly = (pts) => pts.map((p) => `L${fmt(p)}`).join(" ");

  // The tap area: the body outline, closed across the top and along the bottom crop.
  const L_SIDE = place(-1, SIDE);
  const R_SIDE = place(1, SIDE);
  const L_IN = place(-1, INNER);
  const R_IN = place(1, INNER);
  const BODY_PATH = `M${fmt(L_SIDE[0])} ${poly(L_SIDE.slice(1))} ` +
    `${poly([...L_IN].reverse())} ${poly(R_IN.slice(1))} ${poly([...R_SIDE].reverse())} Z`;

  // Labels for talking it through with a physio. [text, x, y, size, rotate].
  const LABEL_SIZE = 5.6;
  const SMALL_SIZE = 4.4;
  const LABELS = [
    ["lowest ribs", 138, 36, SMALL_SIZE], ["Erector", 72, 56, LABEL_SIZE],
    ["spinae", 72, 62, LABEL_SIZE], ["QL", 59, 76, LABEL_SIZE],
    ["Erector spinae", 128, 66, SMALL_SIZE], ["QL", 141, 76, LABEL_SIZE],
    ["Iliac crest", 138, 86, SMALL_SIZE], ["Iliac crest", 62, 86, SMALL_SIZE],
    ["Glute", 59, 104, LABEL_SIZE], ["medius", 59, 110, LABEL_SIZE],
    ["SI", 118.5, 104, SMALL_SIZE], ["SI", 81.5, 104, SMALL_SIZE],
    ["Sacrum", 100, 110, SMALL_SIZE], ["Glute", 136, 128, LABEL_SIZE],
    ["maximus", 136, 134, LABEL_SIZE], ["Tailbone", 100, 139, SMALL_SIZE],
    ["Sit bone", 114, 148, SMALL_SIZE], ["Hamstrings", 72, 200, LABEL_SIZE],
    ["Hamstrings", 128, 200, LABEL_SIZE], ["IT band", 152, 205, SMALL_SIZE, 90],
    ["IT band", 48, 205, SMALL_SIZE, -90], ["Back of knee", 128, 247, SMALL_SIZE],
    ...VERTEBRAE.slice(2).map(([v, y]) => [v, MID_X, y + 1.5, SMALL_SIZE]),
  ];
  const LABEL_LAYER =
    `<g class="map-labels" font-family="sans-serif" font-weight="500" fill="#5A4636" ` +
    `text-anchor="middle" stroke="#FDFAF6" stroke-width="1.4" stroke-linejoin="round" ` +
    `paint-order="stroke">` + LABELS.map(([t, x, y, size, rot]) =>
      `<text x="${x}" y="${y}" font-size="${size}"` +
      `${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ""}>${t}</text>`).join("") + "</g>";

  // One figure for the tab, the form's thumbnail and the exported image. The body path is
  // invisible: it is only there to catch taps.
  const figure = (href = IMG_SRC, labels = false) =>
    `<image href="${href}" x="0" y="0" width="${VIEW_W}" height="${IMG_H}" ` +
    `preserveAspectRatio="none"/>` +
    `<path class="body" d="${BODY_PATH}" fill="#000" fill-opacity="0"/>` +
    (labels ? LABEL_LAYER : "");
  const SIDE_LABELS =
    `<g class="side-label" font-size="6" font-family="sans-serif" fill="#8A7868" ` +
    `letter-spacing=".8"><text x="${LABEL_INSET}" y="${LABEL_Y}">LEFT</text>` +
    `<text x="${VIEW_W - LABEL_INSET}" y="${LABEL_Y}" text-anchor="end">RIGHT</text></g>`;

  const $ = (id) => document.getElementById(id);
  const els = {
    map: $("bodyMap"), hint: $("painHint"), list: $("painList"), copy: $("painCopyBtn"),
    share: $("painShareBtn"), status: $("painStatus"), more: $("painMoreBtn"),
    overlay: $("painOverlay"), title: $("painTitle"), region: $("painRegion"),
    levels: $("painLevels"), kinds: $("painKinds"), when: $("painWhen"), note: $("painNote"),
    save: $("painSaveBtn"), del: $("painDeleteBtn"), flag: $("painFlag"),
    whenDay: $("painWhenDay"), mini: $("painMini"), labelsBtn: $("painLabelsBtn"),
  };
  const HINT = els.hint.textContent;
  let showLabels = Store.get("painLabels", false);

  /* ── Entries placed on earlier maps ────────────────────────── */
  // Straight-line lookup in a table of [from, to] pairs sorted by "from".
  function lerpTable(table, v) {
    for (let i = 1; i < table.length; i++) {
      const [a0, b0] = table[i - 1];
      const [a1, b1] = table[i];
      if (v <= a1) return b0 + (b1 - b0) * (v - a0) / (a1 - a0);
    }
    return table.at(-1)[1];
  }
  // Distance of a body edge from the spine at height y.
  const edgeAt = (pts, y) => lerpTable(pts.map(([dx, py]) => [py, dx]), y);
  const round1 = (v) => Math.round(v * 10) / 10;

  // v0.01-v0.07: a small front-and-back figure. Back-view spots inside the frame came
  // across to the v0.08 drawing; the rest keep their text but stay off the map.
  const V1_MID_X   = 60;
  const V1_X_SCALE = 2.2;
  const V1_Y = [[66, 0], [80, 14], [108, 56], [140, 110], [160, 172], [200, 276], [214, 300]];
  // v0.08-v0.15: the drawn back. Landmark heights then -> now, and its outline, so a spot
  // keeps the same place relative to the landmarks and the body's edge.
  const V2_MID_X = 100;
  const V2_Y = [[0, 11.3], [56, Y.RIBS], [98, 87.7], [110, Y.PELVIS], [140, Y.SACRUM],
    [172, Y.FOLD], [276, Y.KNEE + 4], [300, 285.3]];
  const V2_SIDE = [[64, 0], [63, 30], [57, 58], [50, 82], [52, 95], [58, 108], [64, 128],
    [65, 150], [64, 170], [60, 200], [55, 235], [49, 270], [46, 300]];

  function migrate(e) {
    let m = e;
    if (!m.map) {
      const inFrame = m.view === "back" && m.y >= V1_Y[0][0] && m.y <= V1_Y.at(-1)[0];
      if (!inFrame) return { ...m, map: 1 };
      m = { ...m, map: 2, x: V2_MID_X + (m.x - V1_MID_X) * V1_X_SCALE, y: lerpTable(V1_Y, m.y) };
    }
    if (m.map === 2) {
      const y = lerpTable(V2_Y, m.y);
      const scale = edgeAt(SIDE, y) / edgeAt(V2_SIDE, m.y);
      m = { ...m, map: MAP_VERSION, x: round1(MID_X + (m.x - V2_MID_X) * scale), y: round1(y) };
    }
    return m;
  }

  let entries = Store.get("pain", []);
  if (entries.some((e) => !e.map || e.map === 2)) {
    entries = entries.map(migrate);
    Store.set("pain", entries);
  }
  let draft = null;
  let pending = null;       // the spot just tapped, shown before the form opens
  let pendingTimer = 0;
  let showAll = false;

  /* ── Helpers ───────────────────────────────────────────────── */
  const levelColour = (n) => (n <= 3 ? COLOURS.low : n <= 6 ? COLOURS.mid : COLOURS.high);
  const onMap = (e) => e.map === MAP_VERSION;
  const sorted = () => [...entries].sort((a, b) => a.t - b.t);
  const numberOf = (e) => sorted().indexOf(e) + 1;
  const timeOf = (t) =>
    new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateOf = (t) => new Date(t).toLocaleDateString("en-GB",
    { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const esc = (s) => String(s).replace(/[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function save() {
    Store.set("pain", entries);
    document.dispatchEvent(new CustomEvent("history:changed"));
  }

  function vertebraAt(y) {
    return VERTEBRAE.reduce((best, v) =>
      (Math.abs(v[1] - y) < Math.abs(best[1] - y) ? v : best))[0];
  }

  // Name the spot from where it was tapped. Seen from behind, so the person's left is on
  // the viewer's left.
  function regionAt(x, y) {
    const ad = Math.abs(x - MID_X);
    const s = (name) => `${name}, ${x < MID_X ? "left" : "right"}`;

    if (ad < X.SPINE && y < Y.CROTCH) {
      if (y < Y.PELVIS) return `Spine, centre (around ${vertebraAt(y)})`;
      return y < Y.SACRUM ? "Sacrum, centre" : "Tailbone (coccyx)";
    }
    if (y < Y.RIBS) {
      return ad < X.ERECTOR ? s("Mid back, beside the spine") : s("Side of the lower ribs");
    }
    if (y < Y.CREST) {
      return ad < X.ERECTOR ? s("Lower back muscle beside the spine (erector spinae)") :
        s("Lower back, outer (QL)");
    }
    if (y < Y.PELVIS) {
      return ad < X.SI ? s("Lower back muscle beside the spine (erector spinae)") :
        s("Top of the hip bone (iliac crest)");
    }
    if (y < Y.FOLD) {
      if (y < Y.SACRUM && ad < X.SI) return s("SI joint");
      if (ad >= X.TROCHANTER && y >= Y.GLUTE_MED) return s("Outer hip (greater trochanter)");
      if (y < Y.GLUTE_MED && ad >= X.GLUTE_MED) return s("Upper outer buttock (glute medius)");
      if (y > Y.SIT_BONE && ad < X.SIT_BONE) return s("Sit bone (bottom of the buttock)");
      return s("Buttock (glute maximus)");
    }
    if (y >= Y.KNEE) return s("Back of the knee");
    const inner = edgeAt(INNER, y);
    const across = (ad - inner) / (edgeAt(SIDE, y) - inner);
    if (across > OUTER_THIGH) return s("Outer thigh (IT band)");
    return y < Y.THIGH_MID ? s("Back of thigh, upper (hamstring)") :
      s("Back of thigh, lower (hamstring)");
  }

  /* ── Map ───────────────────────────────────────────────────── */
  function marker(e, r, withNumber) {
    const num = withNumber ?
      `<text x="${e.x}" y="${e.y + r * 0.38}" text-anchor="middle" font-size="${r * 1.2}" ` +
      `font-family="sans-serif" font-weight="700" fill="#fff">${numberOf(e)}</text>` : "";
    return `<circle cx="${e.x}" cy="${e.y}" r="${r}" fill="${levelColour(e.level)}" ` +
           `fill-opacity=".85" stroke="#fff" stroke-width=".8"/>${num}`;
  }

  // The spot just tapped: a pulsing ring, so you can see where it landed.
  function pendingMarker(p, r) {
    return `<g class="pending"><circle class="pending-ring" cx="${p.x}" cy="${p.y}" ` +
      `r="${r}" fill="none" stroke="#C8894A" stroke-width="1.6"/>` +
      `<circle cx="${p.x}" cy="${p.y}" r="${r * 0.35}" fill="#C8894A"/></g>`;
  }

  function renderMap() {
    const cutoff = Date.now() - LIVE_DAYS * MS_PER_DAY;
    const recent = sorted().filter((e) => onMap(e) && e.t >= cutoff);
    const marks = recent.map((e, i) => {
      const last = i === recent.length - 1;
      const dot = marker(e, last ? MARK_R_LAST : MARK_R, false);
      return `<g class="mark" style="opacity:${last ? 1 : 0.55}">${dot}</g>`;
    }).join("");
    els.map.innerHTML = figure(IMG_SRC, showLabels) + SIDE_LABELS + marks +
      (pending ? pendingMarker(pending, MARK_R_LAST) : "");
    els.labelsBtn.classList.toggle("on", showLabels);
    els.labelsBtn.setAttribute("aria-pressed", String(showLabels));
  }

  els.labelsBtn.addEventListener("click", () => {
    showLabels = !showLabels;
    Store.set("painLabels", showLabels);
    renderMap();
  });

  function renderHint() {
    els.hint.textContent = pending ? pending.region : HINT;
    els.hint.classList.toggle("picked", !!pending);
  }

  function clearPending() {
    clearTimeout(pendingTimer);
    pending = null;
    renderMap();
    renderHint();
  }

  els.map.setAttribute("viewBox", `0 0 ${VIEW_W} ${VIEW_H}`);
  els.mini.setAttribute("viewBox", `0 0 ${VIEW_W} ${VIEW_H}`);

  // Tap: show the spot for a moment, then open the form. Tapping again moves the spot;
  // closing the form throws it away.
  els.map.addEventListener("click", (ev) => {
    if (!ev.target.closest(".body")) return;
    const pt = new DOMPoint(ev.clientX, ev.clientY)
      .matrixTransform(els.map.getScreenCTM().inverse());
    const x = Math.round(pt.x * 10) / 10;
    const y = Math.round(pt.y * 10) / 10;
    pending = { x, y, region: regionAt(x, y) };
    renderMap();
    renderHint();
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      openEditor({ id: null, map: MAP_VERSION, view: "back", x, y, region: pending.region,
        level: null, kinds: [], note: "", t: Date.now() });
    }, PREVIEW_MS);
  });

  /* ── Editor ────────────────────────────────────────────────── */
  function localInputValue(t) {
    const d = new Date(t - new Date(t).getTimezoneOffset() * MS_PER_MIN);
    return d.toISOString().slice(0, 16);
  }

  function openEditor(entry) {
    draft = { ...entry, kinds: [...entry.kinds] };
    els.title.textContent = entry.id ? "Edit pain entry" : "Log pain";
    els.region.value = draft.region;
    els.when.value = localInputValue(draft.t);
    renderWhenDay();
    els.note.value = draft.note;
    els.del.hidden = !entry.id;
    els.mini.hidden = !onMap(draft);
    if (onMap(draft)) els.mini.innerHTML = figure() + pendingMarker(draft, MARK_R_MINI);
    renderEditor();
    els.overlay.classList.add("visible");
    BackNav.open("painEditor", () => closeEditor(true));
  }
  function renderEditor() {
    els.levels.innerHTML = Array.from({ length: MAX_LEVEL + 1 }, (_, n) =>
      `<button data-level="${n}" class="${draft.level === n ? "active" : ""}" ` +
      `style="--lvl:${levelColour(n)}">${n}</button>`).join("");
    els.kinds.innerHTML = KINDS.map((k) =>
      `<button data-kind="${k}" class="${draft.kinds.includes(k) ? "active" : ""}">${k}</button>`
    ).join("");
    const nerve = draft.kinds.some((k) => NERVE_KINDS.includes(k)) ||
      /thigh|knee|calf|shin|foot|sit bone/i.test(els.region.value);
    els.flag.hidden = !nerve;
    els.save.disabled = draft.level === null;
  }

  els.levels.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    draft.level = Number(b.dataset.level);
    renderEditor();
  });
  els.kinds.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const k = b.dataset.kind;
    const has = draft.kinds.includes(k);
    draft.kinds = has ? draft.kinds.filter((x) => x !== k) : [...draft.kinds, k];
    renderEditor();
  });
  els.region.addEventListener("input", renderEditor);

  // The form shows which day the chosen time falls on.
  function renderWhenDay() {
    const t = els.when.value ? new Date(els.when.value).getTime() : Date.now();
    const n = Number.isFinite(t) ? Targets.dayNumber(dayKeyOf(new Date(t))) : 0;
    els.whenDay.textContent = n > 0 ? `· Day ${n}` : "";
  }
  els.when.addEventListener("input", renderWhenDay);

  // fromBack: the back gesture already used up the history entry.
  function closeEditor(fromBack = false) {
    els.overlay.classList.remove("visible");
    draft = null;
    clearPending();
    if (!fromBack) BackNav.closed("painEditor");
  }

  els.save.addEventListener("click", () => {
    if (!draft || draft.level === null) return;
    const t = els.when.value ? new Date(els.when.value).getTime() : Date.now();
    const entry = {
      ...draft,
      id: draft.id || `p${Date.now().toString(36)}`,
      region: els.region.value.trim() || draft.region,
      note: els.note.value.trim(),
      t: Number.isFinite(t) ? t : Date.now(),
    };
    entries = entries.filter((e) => e.id !== entry.id).concat(entry);
    save();
    closeEditor();
    render();
  });

  els.del.addEventListener("click", () => {
    if (!draft?.id || !confirm("Delete this pain entry? This can't be undone.")) return;
    entries = entries.filter((e) => e.id !== draft.id);
    save();
    closeEditor();
    render();
  });

  els.overlay.addEventListener("click", (e) => {
    if (e.target === els.overlay || e.target.closest("[data-close]")) closeEditor();
  });

  /* ── Journal list ──────────────────────────────────────────── */
  function renderList() {
    const all = sorted().reverse();
    const cutoff = Date.now() - LIVE_DAYS * MS_PER_DAY;
    const shown = showAll ? all : all.filter((e) => e.t >= cutoff);
    const hidden = all.length - shown.length;
    let lastDay = "";
    els.list.innerHTML = shown.map((e) => {
      const day = dayKeyOf(new Date(e.t));
      const head = day !== lastDay ?
        `<li class="pain-day">${Targets.label(day, DAY_HEAD)}</li>` : "";
      lastDay = day;
      const kindText = esc(e.kinds.join(", ").toLowerCase());
      const kinds = e.kinds.length ? ` <span class="pain-kinds">${kindText}</span>` : "";
      const note = e.note ? `<span class="pain-note">${esc(e.note)}</span>` : "";
      return `${head}<li class="pain-row" data-id="${e.id}">` +
        `<span class="pain-lvl" style="background-color:${levelColour(e.level)}">` +
        `${e.level}</span><span class="pain-text"><span class="pain-where">` +
        `<b>#${numberOf(e)}</b> ${timeOf(e.t)} · ` +
        `${esc(e.region)}${kinds}</span>${note}</span></li>`;
    }).join("") || '<li class="pain-empty">Nothing logged yet. Tap the body where it hurts.</li>';
    els.more.hidden = hidden <= 0 && !showAll;
    els.more.textContent = showAll ? "Show last 7 days only" : `Show all (${hidden} older)`;
  }

  els.list.addEventListener("click", (e) => {
    const row = e.target.closest(".pain-row");
    if (!row) return;
    const entry = entries.find((x) => x.id === row.dataset.id);
    if (entry) openEditor(entry);
  });
  els.more.addEventListener("click", () => { showAll = !showAll; renderList(); });

  /* ── Export: text journal ──────────────────────────────────── */
  function activityLine(key) {
    const d = History.all()[key] || {};
    const parts = ROUTINES.filter((r) => d[r.id]).map((r) => `${r.name} x${d[r.id]}`);
    const m = (k) => Math.round((d[k] || 0) / 60);
    if (m("stand") + m("sit") + m("move")) {
      parts.push(`desk ${m("stand")} min standing / ${m("sit")} sitting / ${m("move")} moving`);
    }
    return parts.length ? parts.join("; ") : "";
  }

  function journalText() {
    const list = sorted();
    const days = new Set(list.map((e) => dayKeyOf(new Date(e.t))));
    Object.entries(History.all()).forEach(([k, v]) => {
      if (Object.keys(v).some((f) => !PHASE_KEYS.includes(f))) days.add(k);
    });
    const now = Date.now();
    const lines = [
      "BACK PAIN JOURNAL",
      `Day 1 (back first locked up): ${dateOf(parseDay(Targets.dayOne()).getTime())}`,
      `Exported: ${dateOf(now)}, ${timeOf(now)}`,
      "Pain scale 0-10. #numbers match the numbered map of the back (seen from behind, " +
        "lowest ribs to knees).",
      "",
    ];
    [...days].sort().forEach((key) => {
      lines.push(`${Targets.label(key, DAY_HEAD)} · Phase ${Phase.of(key)}`);
      const act = activityLine(key);
      if (act) lines.push(`  Activity: ${act}`);
      list.filter((e) => dayKeyOf(new Date(e.t)) === key).forEach((e) => {
        const kinds = e.kinds.length ? ` [${e.kinds.join(", ").toLowerCase()}]` : "";
        const where = onMap(e) ? "" : e.view === "front" ? " (front, not on map)" :
          " (not on map)";
        lines.push(`  #${numberOf(e)}  ${timeOf(e.t)}  Pain ${e.level}/10  ${e.region}` +
                   `${where}${kinds}`);
        if (e.note) lines.push(`      ${e.note}`);
      });
      lines.push("");
    });
    return lines.join("\n").trim() + "\n";
  }

  /* ── Export: numbered map image ────────────────────────────── */
  // The exported image draws the illustration from a data URL: an SVG rendered as an image
  // can't load files of its own. Labels follow the on-screen switch.
  function mapSvg(href = IMG_SRC) {
    const w = VIEW_W;
    const top = 30;                       // title and subtitle
    const marks = sorted().filter(onMap).map((e) => marker(e, MARK_R_EXPORT, true)).join("");
    const legend = [["0-3", COLOURS.low], ["4-6", COLOURS.mid], ["7-10", COLOURS.high]]
      .map(([t, c], i) => `<circle cx="${w - 64 + i * 22}" cy="22" r="3.5" fill="${c}"/>` +
        `<text x="${w - 58 + i * 22}" y="24.5" font-size="6" font-family="sans-serif" ` +
        `fill="#6B5B4E">${t}</text>`).join("");
    const vw = w + 12;
    const vh = VIEW_H + top + 4;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 0 ${vw} ${vh}" ` +
      `width="${vw * EXPORT_SCALE}" height="${vh * EXPORT_SCALE}">` +
      `<rect x="-6" width="${vw}" height="${vh}" fill="#FDFAF6"/>` +
      `<text x="0" y="12" font-size="8" font-family="sans-serif" fill="#2C2218">` +
      `Pain map · ${Targets.label(todayKey(), DAY_HEAD)}</text>` +
      `<text x="0" y="24" font-size="6" font-family="sans-serif" fill="#6B5B4E">` +
      `The back, seen from behind</text>${legend}` +
      `<g transform="translate(0 ${top})"><svg width="${w}" height="${VIEW_H}" ` +
      `viewBox="0 0 ${w} ${VIEW_H}">${figure(href, showLabels)}${SIDE_LABELS}${marks}</svg>` +
      `</g></svg>`;
  }

  async function imageDataUrl(src) {
    const blob = await (await fetch(src)).blob();
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  async function mapPng() {
    const svg = mapSvg(await imageDataUrl(IMG_SRC));
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error("no image"))), "image/png");
      };
      img.onerror = reject;
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }

  function flash(msg) {
    els.status.textContent = msg;
    clearTimeout(flash.t);
    flash.t = setTimeout(() => { els.status.textContent = ""; }, 4000);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    }
  }

  els.copy.addEventListener("click", async () => {
    flash(await copyText(journalText()) ? "Journal copied - paste it into an email or chat." :
      "Couldn't copy - try Share instead.");
  });

  els.share.addEventListener("click", async () => {
    const text = journalText();
    const name = `pain-map-${todayKey()}.png`;
    let blob = null;
    try { blob = await mapPng(); } catch (e) {}
    const file = blob ? new File([blob], name, { type: "image/png" }) : null;
    const data = { title: "Back pain journal", text };
    if (file && navigator.canShare?.({ files: [file] })) data.files = [file];
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (e) {
        if (e.name === "AbortError") return;
      }
    }
    // No share sheet (desktop): save the image and copy the text.
    if (blob) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
    await copyText(text);
    flash("Map image saved and journal text copied.");
  });

  /* ── Daily summary for the Log tab ─────────────────────────── */
  function maxForDay(key) {
    const levels = entries.filter((e) => dayKeyOf(new Date(e.t)) === key).map((e) => e.level);
    return levels.length ? Math.max(...levels) : null;
  }

  function render() {
    renderMap();
    renderList();
  }

  document.addEventListener("day:changed", render);
  render();

  return { render, maxForDay, levelColour, journalText, mapSvg, mapPng, regionAt };
})();
