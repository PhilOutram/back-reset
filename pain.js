/* ============================================================
   Back Reset - Pain tab: tap the map of the back to log where it
   hurts, how much (0-10) and what it feels like. Entries form a
   dated journal that copies as plain text (for a physio or an AI)
   and exports a numbered map image to go with it.
   ============================================================ */

const Pain = (() => {
  const VIEW_W        = 200;   // the back seen from behind, nipple line to just below the knees
  const VIEW_H        = 300;
  const MID_X         = VIEW_W / 2;
  const LABEL_INSET   = 12;    // LEFT / RIGHT labels above the map
  const LABEL_Y       = -6;
  const TOP_PAD       = 14;
  const MAP_VERSION   = 2;     // v0.08 back-only map; earlier entries used a front+back figure
  const PREVIEW_MS    = 1000;  // the tapped spot shows this long before the form opens
  const LIVE_DAYS     = 7;     // markers and list rows shown on the tab
  const EXPORT_SCALE  = 3;
  const MAX_LEVEL     = 10;
  const MARK_R        = 4.4;
  const MARK_R_LAST   = 6;
  const MARK_R_EXPORT = 5;
  const MARK_R_MINI   = 14;
  const SPINE_HALF    = 6;     // half-width of the "on the spine" strip
  const OUTER_THIGH   = 0.72;  // fraction of the way across a leg that counts as the outer side
  const DAY_HEAD      = { weekday: "short", day: "numeric", month: "short", year: "numeric" };
  const MS_PER_MIN    = 60 * MS_PER_SEC;
  const KINDS = ["Ache", "Stiff", "Sharp", "Spasm / catch", "Tingling / numb", "Burning",
    "Shooting"];
  const NERVE_KINDS = ["Tingling / numb", "Shooting"];
  const COLOURS = { low: "#6E8B5A", mid: "#C8894A", high: "#B4533A" };

  /* ── The back: landmarks, outline and detail ───────────────── */
  // Heights on the map: 0 is the nipple line, VIEW_H just below the knee creases.
  const Y = {
    SCAPULA: 14, RIBS: 56, CREST: 98, PELVIS: 110, SACRUM: 140, SIT_BONE: 158, FOLD: 172,
    CROTCH: 178, THIGH_MID: 228, KNEE: 276,
  };
  // Widths: distance from the spine where one region gives way to the next.
  const X = {
    NEAR_SPINE: 20, SI: 22, SIT_BONE: 28, QL: 42, MID_BACK: 46, BUTTOCK: 50, TROCHANTER: 52,
    SCAPULA_INNER: 28,
  };
  const VERTEBRAE = [["T7", 6], ["T8", 15], ["T9", 24], ["T10", 33], ["T11", 42], ["T12", 51],
    ["L1", 62], ["L2", 73], ["L3", 84], ["L4", 95], ["L5", 106]];
  // Body edges as [distance from the spine, height], top to bottom.
  const SIDE = [[64, 0], [63, 30], [57, 58], [50, 82], [52, 95], [58, 108], [64, 128],
    [65, 150], [64, 170], [60, 200], [55, 235], [49, 270], [46, 300]];
  const INNER = [[2, Y.CROTCH], [4, 190], [6, 220], [9, 260], [11, 300]];
  const VERT_W = 5;
  const VERT_H = 4;

  const fmt = (p) => `${+p[0].toFixed(1)} ${+p[1].toFixed(1)}`;
  const place = (sign, pts) => pts.map(([dx, y]) => [MID_X + sign * dx, y]);

  // A smooth curve through the points (Catmull-Rom as cubic Beziers).
  function smooth(pts) {
    let d = "";
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${fmt(c1)} ${fmt(c2)} ${fmt(p2)}`;
    }
    return d;
  }

  const L_SIDE = place(-1, SIDE);
  const R_SIDE = place(1, SIDE);
  const L_IN = place(-1, INNER);
  const R_IN = place(1, INNER);
  const CROTCH_CURVE = ` Q${MID_X} ${Y.CROTCH - 6} ${fmt(R_IN[0])}`;
  const INNER_LINE = `M${fmt(L_IN.at(-1))}${smooth([...L_IN].reverse())}${CROTCH_CURVE}` +
    smooth(R_IN);
  // The fill is closed along the crop lines; only the real edges are stroked.
  const BODY_PATH = `M${fmt(L_SIDE[0])}${smooth(L_SIDE)} L${fmt(L_IN.at(-1))}` +
    `${smooth([...L_IN].reverse())}${CROTCH_CURVE}${smooth(R_IN)} L${fmt(R_SIDE.at(-1))}` +
    `${smooth([...R_SIDE].reverse())} Z`;
  const OUTLINE = `M${fmt(L_SIDE[0])}${smooth(L_SIDE)}M${fmt(R_SIDE[0])}${smooth(R_SIDE)}` +
    INNER_LINE;

  // Right half (drawn again mirrored): shoulder-blade tip, lowest rib, top of the hip
  // bone, SI dimple, buttock crease, knee crease.
  const HALF_DETAIL = "M130 0 Q138 9 144 11 Q150 6 157 0 M106 50 Q128 58 150 72 " +
    "M112 106 Q128 94 156 104 M110 113a2 2 0 1 0 4 0a2 2 0 1 0-4 0 " +
    "M102 177 Q128 180 160 168 M118 284 Q128 287 140 284";
  // Sacrum as a soft shield (not a hard triangle), then the cleft between the buttocks.
  const SACRUM = `M91 ${Y.PELVIS} Q100 107 109 ${Y.PELVIS} Q107 132 100 144 ` +
    `Q93 132 91 ${Y.PELVIS} Z M100 150 L100 ${Y.CROTCH - 3}`;
  const BONES = VERTEBRAE.map(([, y]) =>
    `<rect x="${MID_X - VERT_W / 2}" y="${y - VERT_H / 2}" width="${VERT_W}" ` +
    `height="${VERT_H}" rx="1.5"/>`).join("");

  // One figure for the tab, the form's thumbnail and the exported image. The attributes
  // style the exports; the tab's CSS overrides them.
  const FIGURE =
    `<path class="body" d="${BODY_PATH}" fill="#F1E7DB"/>` +
    `<g class="detail" fill="none" stroke="#C9B8A6" stroke-width=".8">` +
    `<path d="${HALF_DETAIL}"/><path d="${HALF_DETAIL}" ` +
    `transform="translate(${VIEW_W} 0) scale(-1 1)"/><path d="${SACRUM}"/></g>` +
    `<g class="bones" fill="#DCCBB8">${BONES}</g>` +
    `<path class="outline" d="${OUTLINE}" fill="none" stroke="#A08070" stroke-width="1"/>`;
  const SIDE_LABELS =
    `<g class="side-label" font-size="7" font-family="sans-serif" fill="#8A7868" ` +
    `letter-spacing=".8"><text x="${LABEL_INSET}" y="${LABEL_Y}">LEFT</text>` +
    `<text x="${VIEW_W - LABEL_INSET}" y="${LABEL_Y}" text-anchor="end">RIGHT</text></g>`;

  const $ = (id) => document.getElementById(id);
  const els = {
    map: $("bodyMap"), hint: $("painHint"), list: $("painList"), copy: $("painCopyBtn"),
    share: $("painShareBtn"), status: $("painStatus"), more: $("painMoreBtn"),
    overlay: $("painOverlay"), title: $("painTitle"), region: $("painRegion"),
    levels: $("painLevels"), kinds: $("painKinds"), when: $("painWhen"), note: $("painNote"),
    save: $("painSaveBtn"), del: $("painDeleteBtn"), flag: $("painFlag"),
    whenDay: $("painWhenDay"), mini: $("painMini"),
  };
  const HINT = els.hint.textContent;

  /* ── Entries from before the back-only map ─────────────────── */
  // They were placed on a small front-and-back figure. Back-view spots that fall inside
  // the new frame are moved across; the rest keep their text but leave the map.
  const OLD_MID_X   = 60;
  const OLD_X_SCALE = 2.2;
  const OLD_Y = [[66, 0], [80, Y.SCAPULA], [108, Y.RIBS], [140, Y.PELVIS], [160, Y.FOLD],
    [200, Y.KNEE], [214, VIEW_H]];

  // Straight-line lookup in a table of [from, to] pairs sorted by "from".
  function lerpTable(table, v) {
    for (let i = 1; i < table.length; i++) {
      const [a0, b0] = table[i - 1];
      const [a1, b1] = table[i];
      if (v <= a1) return b0 + (b1 - b0) * (v - a0) / (a1 - a0);
    }
    return table.at(-1)[1];
  }

  function migrate(e) {
    if (e.map) return e;
    const inFrame = e.view === "back" && e.y >= OLD_Y[0][0] && e.y <= OLD_Y.at(-1)[0];
    if (!inFrame) return { ...e, map: 1 };
    const x = MID_X + (e.x - OLD_MID_X) * OLD_X_SCALE;
    const y = lerpTable(OLD_Y, e.y);
    return { ...e, map: MAP_VERSION, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  }

  let entries = Store.get("pain", []);
  if (entries.some((e) => !e.map)) {
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

  // Distance of a body edge from the spine at height y.
  const edgeAt = (pts, y) => lerpTable(pts.map(([dx, py]) => [py, dx]), y);

  function vertebraAt(y) {
    return VERTEBRAE.reduce((best, v) =>
      (Math.abs(v[1] - y) < Math.abs(best[1] - y) ? v : best))[0];
  }

  // Name the spot from where it was tapped. Seen from behind, so the person's left is on
  // the viewer's left.
  function regionAt(x, y) {
    const ad = Math.abs(x - MID_X);
    const s = (name) => `${name}, ${x < MID_X ? "left" : "right"}`;

    if (ad < SPINE_HALF && y < Y.CROTCH) {
      if (y < Y.PELVIS) return `Spine, centre (around ${vertebraAt(y)})`;
      return y < Y.SACRUM ? "Sacrum, centre" : "Tailbone (coccyx)";
    }
    if (y < Y.RIBS) {
      if (ad < X.NEAR_SPINE) return s("Mid back, beside the spine");
      const onBlade = y < Y.SCAPULA && ad >= X.SCAPULA_INNER;
      if (onBlade) return s("Bottom of the shoulder blade");
      return ad < X.MID_BACK ? s("Mid back") : s("Side of the ribs");
    }
    if (y < Y.CREST) {
      if (ad < X.NEAR_SPINE) return s("Lower back, beside the spine");
      return ad < X.QL ? s("Lower back, outer (QL area)") : s("Flank (side of the waist)");
    }
    if (y < Y.PELVIS) {
      return ad < X.NEAR_SPINE ? s("Lower back, beside the spine") :
        s("Top of the hip bone (iliac crest)");
    }
    if (y < Y.SACRUM) {
      if (ad < X.SI) return s("SI joint area");
      return ad < X.BUTTOCK ? s("Top of the buttock") : s("Outer hip");
    }
    if (y < Y.CROTCH) {
      if (ad >= X.TROCHANTER) return s("Outer hip (greater trochanter)");
      if (y > Y.SIT_BONE && ad < X.SIT_BONE) return s("Sit bone (bottom of the buttock)");
      return s("Buttock (glute)");
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
    els.map.innerHTML = SIDE_LABELS + FIGURE + marks +
      (pending ? pendingMarker(pending, MARK_R_LAST) : "");
  }

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

  const MAP_BOX = `0 ${LABEL_Y - TOP_PAD / 2} ${VIEW_W} ${VIEW_H - LABEL_Y + TOP_PAD / 2}`;
  els.map.setAttribute("viewBox", MAP_BOX);
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
    if (onMap(draft)) els.mini.innerHTML = FIGURE + pendingMarker(draft, MARK_R_MINI);
    renderEditor();
    els.overlay.classList.add("visible");
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

  function closeEditor() {
    els.overlay.classList.remove("visible");
    draft = null;
    clearPending();
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
      if (Object.keys(v).length) days.add(k);
    });
    const now = Date.now();
    const lines = [
      "BACK PAIN JOURNAL",
      `Day 1 (back first locked up): ${dateOf(parseDay(Targets.dayOne()).getTime())}`,
      `Exported: ${dateOf(now)}, ${timeOf(now)}`,
      "Pain scale 0-10. #numbers match the numbered map of the back (seen from behind, " +
        "nipple line to knees).",
      "",
    ];
    [...days].sort().forEach((key) => {
      lines.push(Targets.label(key, DAY_HEAD));
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
  function mapSvg() {
    const w = VIEW_W;
    const top = 46;                       // title, subtitle and LEFT / RIGHT
    const marks = sorted().filter(onMap).map((e) => marker(e, MARK_R_EXPORT, true)).join("");
    const legend = [["0-3", COLOURS.low], ["4-6", COLOURS.mid], ["7-10", COLOURS.high]]
      .map(([t, c], i) => `<circle cx="${w - 64 + i * 22}" cy="22" r="3.5" fill="${c}"/>` +
        `<text x="${w - 58 + i * 22}" y="24.5" font-size="6" font-family="sans-serif" ` +
        `fill="#6B5B4E">${t}</text>`).join("");
    const vw = w + 12;
    const vh = VIEW_H + top + 8;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 0 ${vw} ${vh}" ` +
      `width="${vw * EXPORT_SCALE}" height="${vh * EXPORT_SCALE}">` +
      `<rect x="-6" width="${vw}" height="${vh}" fill="#FDFAF6"/>` +
      `<text x="0" y="12" font-size="8" font-family="sans-serif" fill="#2C2218">` +
      `Pain map · ${Targets.label(todayKey(), DAY_HEAD)}</text>` +
      `<text x="0" y="24" font-size="6" font-family="sans-serif" fill="#6B5B4E">` +
      `The back, seen from behind</text>${legend}` +
      `<g transform="translate(0 ${top})">${SIDE_LABELS}${FIGURE}${marks}</g></svg>`;
  }

  function mapPng() {
    return new Promise((resolve, reject) => {
      const svg = mapSvg();
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

  return { render, maxForDay, levelColour, journalText, mapSvg, regionAt };
})();
