/* ============================================================
   Back Reset - Pain tab: tap the body map to log where it hurts,
   how much (0-10) and what it feels like. Entries form a dated
   journal that copies as plain text (for a physio or an AI) and
   exports a numbered body-map image to go with it.
   ============================================================ */

const Pain = (() => {
  const VIEW_W       = 120;   // one body view, local units
  const VIEW_H       = 262;
  const VIEW_GAP     = 24;
  const MID_X        = VIEW_W / 2;
  const LIVE_DAYS    = 7;     // markers and list rows shown on the tab
  const EXPORT_SCALE = 3;
  const MAX_LEVEL    = 10;
  const MS_PER_MIN   = 60 * MS_PER_SEC;
  const KINDS = ["Ache", "Stiff", "Sharp", "Spasm / catch", "Tingling / numb", "Burning",
    "Shooting"];
  const NERVE_KINDS = ["Tingling / numb", "Shooting"];
  const COLOURS = { low: "#6E8B5A", mid: "#C8894A", high: "#B4533A" };

  /* ── Body drawing (one view; the right-hand side is mirrored) ── */
  const HALF = {
    arm:  "M31 52 Q20 55 18 78 L11 140 Q10 151 17 152 Q23 152 23 141 L29 94 L35 70 Z",
    leg:  "M35 136 L59 141 L58 200 L56 246 Q57 257 47 257 L39 257 Q35 252 39 245 L37 200 Z",
  };
  const BODY =
    '<ellipse cx="60" cy="21" rx="14" ry="17"/>' +
    '<rect x="53" y="35" width="14" height="14" rx="4"/>' +
    '<path d="M33 50 Q60 44 87 50 Q93 54 92 68 Q89 92 82 113 Q86 127 87 142 Q60 152 33 142 ' +
      'Q34 127 38 113 Q31 92 28 68 Q27 54 33 50 Z"/>' +
    `<path d="${HALF.arm}"/><path d="${HALF.leg}"/>` +
    `<g transform="translate(${VIEW_W} 0) scale(-1 1)"><path d="${HALF.arm}"/>` +
      `<path d="${HALF.leg}"/></g>`;
  const DETAIL = {
    front: '<path d="M60 56v60M47 62q13 6 26 0M58 106a2 2 0 1 0 4 0a2 2 0 1 0-4 0' +
           'M44 140q16 10 32 0"/>',
    back:  '<path d="M60 50v92M44 64q4 14 10 18M76 64q-4 14-10 18M60 142v14' +
           'M60 142q-14 14-24 6M60 142q14 14 24 6"/>',
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    map: $("bodyMap"), list: $("painList"), copy: $("painCopyBtn"), share: $("painShareBtn"),
    status: $("painStatus"), more: $("painMoreBtn"),
    overlay: $("painOverlay"), title: $("painTitle"), region: $("painRegion"),
    levels: $("painLevels"), kinds: $("painKinds"), when: $("painWhen"), note: $("painNote"),
    save: $("painSaveBtn"), del: $("painDeleteBtn"), flag: $("painFlag"),
  };

  let entries = Store.get("pain", []);
  let draft = null;
  let showAll = false;

  /* ── Helpers ───────────────────────────────────────────────── */
  const levelColour = (n) => (n <= 3 ? COLOURS.low : n <= 6 ? COLOURS.mid : COLOURS.high);
  const viewOffset = (view) => (view === "front" ? 0 : VIEW_W + VIEW_GAP);
  const sorted = () => [...entries].sort((a, b) => a.t - b.t);
  const numberOf = (e) => sorted().indexOf(e) + 1;
  const timeOf = (t) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateOf = (t) => new Date(t).toLocaleDateString("en-GB",
    { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const esc = (s) => String(s).replace(/[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function save() {
    Store.set("pain", entries);
    document.dispatchEvent(new CustomEvent("history:changed"));
  }

  // Name the spot from where it was tapped. Front view is mirrored: the person's right
  // is on the viewer's left.
  function regionAt(view, x, y) {
    const ad = Math.abs(x - MID_X);
    const back = view === "back";
    const viewerLeft = x < MID_X;
    const side = back === viewerLeft ? "left" : "right";
    const centre = ad < 7;
    const s = (name) => `${name}, ${side}`;

    if (y >= 48 && y <= 154 && ad > 30) return y < 72 ? s("Shoulder") : s("Arm");
    if (y < 36) return "Head";
    if (y < 50) return "Neck";
    if (y < 80) {
      if (back) return centre ? "Upper back, centre" : s("Upper back / shoulder blade");
      return s("Chest");
    }
    if (y < 108) return back ? (centre ? "Mid back, centre" : s("Mid back")) : s("Ribs / upper abdomen");
    if (y < 140) {
      if (back) {
        if (centre) return "Lower back, centre (spine)";
        return ad > 21 ? s("Waist / top of pelvis") : s("Lower back");
      }
      return ad > 21 ? s("Side of hip") : s("Lower abdomen");
    }
    if (y < 160) {
      if (back) return ad < 5 ? "Tailbone / sacrum" : ad < 14 ? s("SI joint area") : s("Buttock (glute)");
      return ad < 7 ? "Groin" : s("Front of hip / hip flexor");
    }
    if (y < 200) return back ? s("Back of thigh (hamstring)") : s("Front of thigh (quad)");
    if (y < 214) return back ? s("Back of knee") : s("Knee");
    if (y < 245) return back ? s("Calf") : s("Shin");
    return s("Ankle / foot");
  }

  /* ── Map ───────────────────────────────────────────────────── */
  function marker(e, r, withNumber, colours = true) {
    const cx = viewOffset(e.view) + e.x;
    const fill = colours ? levelColour(e.level) : "#000";
    const num = withNumber ?
      `<text x="${cx}" y="${e.y + 1.6}" text-anchor="middle" font-size="5" ` +
      `font-family="sans-serif" font-weight="700" fill="#fff">${numberOf(e)}</text>` : "";
    return `<circle cx="${cx}" cy="${e.y}" r="${r}" fill="${fill}" fill-opacity=".85" ` +
           `stroke="#fff" stroke-width=".8"/>${num}`;
  }

  function renderMap() {
    const cutoff = Date.now() - LIVE_DAYS * MS_PER_DAY;
    const recent = sorted().filter((e) => e.t >= cutoff);
    const marks = recent.map((e, i) => {
      const last = i === recent.length - 1;
      return `<g class="mark" style="opacity:${last ? 1 : 0.55}">${marker(e, last ? 5 : 3.6, false)}</g>`;
    }).join("");
    els.map.innerHTML =
      ["front", "back"].map((v) =>
        `<g class="body-view" data-view="${v}" transform="translate(${viewOffset(v)} 0)">` +
        `<g class="body">${BODY}</g><g class="detail">${DETAIL[v]}</g>` +
        `<text class="view-label" x="${MID_X}" y="${VIEW_H + 12}" text-anchor="middle">` +
        `${v === "front" ? "Front" : "Back"}</text></g>`).join("") + marks;
  }

  els.map.setAttribute("viewBox", `0 0 ${VIEW_W * 2 + VIEW_GAP} ${VIEW_H + 16}`);

  els.map.addEventListener("click", (ev) => {
    const g = ev.target.closest(".body-view");
    if (!g || !ev.target.closest(".body")) return;
    const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(g.getScreenCTM().inverse());
    const view = g.dataset.view;
    const x = Math.round(pt.x * 10) / 10;
    const y = Math.round(pt.y * 10) / 10;
    openEditor({ id: null, view, x, y, region: regionAt(view, x, y), level: null, kinds: [],
      note: "", t: Date.now() });
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
    els.note.value = draft.note;
    els.del.hidden = !entry.id;
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
      /thigh|knee|calf|shin|foot/i.test(els.region.value);
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
    draft.kinds = draft.kinds.includes(k) ? draft.kinds.filter((x) => x !== k) : [...draft.kinds, k];
    renderEditor();
  });
  els.region.addEventListener("input", renderEditor);

  function closeEditor() {
    els.overlay.classList.remove("visible");
    draft = null;
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
        `<li class="pain-day">${dateOf(e.t)} · Day ${Targets.dayNumber(day)}</li>` : "";
      lastDay = day;
      const kinds = e.kinds.length ? ` <span class="pain-kinds">${esc(e.kinds.join(", ").toLowerCase())}</span>` : "";
      const note = e.note ? `<span class="pain-note">${esc(e.note)}</span>` : "";
      return `${head}<li class="pain-row" data-id="${e.id}">` +
        `<span class="pain-lvl" style="background-color:${levelColour(e.level)}">${e.level}</span>` +
        `<span class="pain-text"><span class="pain-where"><b>#${numberOf(e)}</b> ${timeOf(e.t)} · ` +
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
    Object.entries(History.all()).forEach(([k, v]) => { if (Object.keys(v).length) days.add(k); });
    const now = Date.now();
    const lines = [
      "BACK PAIN JOURNAL",
      `Day 1 (back first locked up): ${dateOf(parseDay(Targets.dayOne()).getTime())}`,
      `Exported: ${dateOf(now)}, ${timeOf(now)}`,
      "Pain scale 0-10. #numbers match the numbered body map image (front and back views).",
      "",
    ];
    [...days].sort().forEach((key) => {
      lines.push(`${dateOf(parseDay(key).getTime())} - Day ${Targets.dayNumber(key)}`);
      const act = activityLine(key);
      if (act) lines.push(`  Activity: ${act}`);
      list.filter((e) => dayKeyOf(new Date(e.t)) === key).forEach((e) => {
        const kinds = e.kinds.length ? ` [${e.kinds.join(", ").toLowerCase()}]` : "";
        lines.push(`  #${numberOf(e)}  ${timeOf(e.t)}  Pain ${e.level}/10  ${e.region} ` +
                   `(${e.view} view)${kinds}`);
        if (e.note) lines.push(`      ${e.note}`);
      });
      lines.push("");
    });
    return lines.join("\n").trim() + "\n";
  }

  /* ── Export: numbered map image ────────────────────────────── */
  function mapSvg() {
    const w = VIEW_W * 2 + VIEW_GAP;
    const top = 22;
    const marks = sorted().map((e) => marker(e, 4.2, true)).join("");
    const views = ["front", "back"].map((v) =>
      `<g transform="translate(${viewOffset(v)} ${top})">` +
      `<g fill="#EFE6DA" stroke="#A08070" stroke-width="1">${BODY}</g>` +
      `<g fill="none" stroke="#C9B8A6" stroke-width=".8">${DETAIL[v]}</g>` +
      `<text x="${MID_X}" y="${VIEW_H + 12}" text-anchor="middle" font-size="8" ` +
      `font-family="sans-serif" fill="#6B5B4E">${v === "front" ? "Front" : "Back"}</text></g>`).join("");
    const legend = [["0-3", COLOURS.low], ["4-6", COLOURS.mid], ["7-10", COLOURS.high]]
      .map(([t, c], i) => `<circle cx="${w - 64 + i * 22}" cy="11" r="3.5" fill="${c}"/>` +
        `<text x="${w - 58 + i * 22}" y="13.5" font-size="6" font-family="sans-serif" ` +
        `fill="#6B5B4E">${t}</text>`).join("");
    const vw = w + 12;
    const vh = VIEW_H + top + 20;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 0 ${vw} ${vh}" ` +
      `width="${vw * EXPORT_SCALE}" height="${vh * EXPORT_SCALE}">` +
      `<rect x="-6" width="${w + 12}" height="${VIEW_H + top + 20}" fill="#FDFAF6"/>` +
      `<text x="0" y="13" font-size="8" font-family="sans-serif" fill="#2C2218">` +
      `Pain map · ${dateOf(Date.now())}</text>${legend}${views}` +
      `<g transform="translate(0 ${top})">${marks}</g></svg>`;
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

  render();

  return { render, maxForDay, levelColour, journalText, mapSvg };
})();
