/* ============================================================
   Back Reset - exercise catalogue and routine builders
   ------------------------------------------------------------
   Everything here comes from the recovery plan: flexion-intolerant
   lower back, right-sided irritation, "calm the alarm" first.
   A routine is built into a flat list of SEGMENTS that the stretch
   player steps through. Segment kinds:
     ready - get into position (announces the exercise or side)
     timed - one continuous hold / movement
     hold  - a McGill-style short hold (8-10 s)
     relax - the brief reset between holds
     rest  - the longer rest between pyramid sets
   ============================================================ */

const LEAD_IN_FIRST = 10;   // seconds to get down to the floor for the first exercise
const LEAD_IN       = 6;    // seconds between exercises
const SWITCH_SECS   = 5;    // seconds to swap sides
const RELAX_SECS    = 3;    // reset between two holds of the same set

const EXERCISES = {
  sphinx: {
    name: "Sphinx Pose",
    short: "Sphinx",
    img: "poses/sphinx.webp",
    tip: "Forearms down, lower back and glutes completely slack. Breathe into your belly.",
    say: "Sphinx pose. Lie on your stomach and prop yourself up on your forearms. " +
         "Let your lower back go completely slack.",
  },
  catCow: {
    name: "Mid-Range Cat-Cow",
    short: "Cat-Cow",
    img: "poses/cat-cow.webp",
    tip: "About 8 slow reps between a gentle arch and a flat back. No deep rounding.",
    say: "Mid range cat cow. On hands and knees, move slowly between a gentle arch " +
         "and a flat back. Stay in the pain free middle.",
  },
  hipRotation: {
    name: "Supine Hip Rotation",
    short: "Hip",
    img: "poses/hip-rotation.webp",
    tip: "Ankle on the opposite knee, gently press the knee away. Never pull it to your chest.",
    say: "Hip rotation. Lie on your back, rest one ankle across the other knee, and " +
         "gently press the knee away.",
    sides: ["Right ankle across", "Left ankle across"],
  },
  legsUp: {
    name: "90/90 Legs-Up Rest",
    short: "Legs-up",
    img: "poses/legs-up-9090.webp",
    tip: "Calves on a chair or sofa. Let everything switch off. Log-roll to your side to get up.",
    say: "Ninety ninety legs up. Lie on your back with your calves resting on a chair. " +
         "Let your back muscles switch off completely.",
  },
  curlUp: {
    name: "Modified Curl-Up",
    short: "Curl-up",
    img: "poses/curl-up.webp",
    tip: "One knee bent, hands under your arch. Lift head and shoulders 1-2 inches only.",
    say: "Modified curl up. Lie on your back, one knee bent, hands under your lower back. " +
         "Brace lightly and lift just your head and shoulders.",
    // Not left/right sides but a leg swap halfway: first set one way, the rest the other.
    halves: ["Right knee bent", "Left knee bent"],
  },
  sidePlank: {
    name: "Side Plank",
    short: "Side plank",
    img: "poses/side-plank.webp",
    tip: "Elbow under shoulder, knees bent to start. Hips forward and up, top hip stacked.",
    say: "Side plank. Elbow under your shoulder, knees bent. Push your hips forward and up.",
    sides: ["Left side down", "Right side down"],
  },
  birdDog: {
    name: "Bird-Dog",
    short: "Bird-dog",
    img: "poses/bird-dog.webp",
    tip: "Flat back. Reach long, push through the heel, make a fist. Lengthen, don't lift high.",
    say: "Bird dog. On hands and knees with a flat back, reach one arm forward and the " +
         "opposite leg back.",
    sides: ["Right arm, left leg", "Left arm, right leg"],
  },
  hipSwitch: {
    name: "90/90 Hip Switches",
    short: "Hip switch",
    img: "poses/hip-switch-9090.webp",
    tip: "Hands behind you, chest tall. Slowly windscreen-wipe both knees side to side.",
    say: "Ninety ninety hip switches. Sit tall with your hands behind you and slowly " +
         "swap your knees from side to side.",
  },
  openBook: {
    name: "Open-Book Rotation",
    short: "Open book",
    img: "poses/open-book.webp",
    tip: "Knees stacked at 90 degrees so the lower back stays still. Open the top arm slowly.",
    say: "Open book. Lie on your side with your knees stacked, and slowly open your top " +
         "arm and chest toward the floor behind you.",
    sides: ["Lying on left side", "Lying on right side"],
  },
  hipHinge: {
    name: "Dowel Hip Hinge",
    short: "Hinge",
    img: "poses/hip-hinge.webp",
    tip: "Stick touching head, upper back and tailbone. Push hips back to 45 degrees. 8 reps.",
    say: "Hip hinge. Hold a stick along your spine, touching your head, upper back and " +
         "tailbone, and hinge back from the hips.",
  },
  pallof: {
    name: "Pallof Press",
    short: "Pallof",
    img: "poses/pallof-press.webp",
    tip: "Band at chest height. Brace and press straight out - don't let it twist you.",
    say: "Pallof press. Band anchored at chest height. Brace and press your hands " +
         "straight out, resisting the twist.",
    sides: ["Band on your right", "Band on your left"],
  },
};

const PYRAMIDS = {
  "3-2-1": [3, 2, 1],
  "5-3-1": [5, 3, 1],
};

const DEFAULT_OPTIONS = {
  pyramid: "3-2-1",
  holdSecs: 8,
  restSecs: 20,
};

/* ── Segment helpers ─────────────────────────────────────────── */
function seg(ex, kind, secs, extra = {}) {
  return { ex, kind, secs, label: "", side: null, say: null, ...extra };
}

// The opening "get into position" segment for an exercise.
function intro(ex, secs, side = null) {
  const e = EXERCISES[ex];
  return seg(ex, "ready", secs, { side, say: e.say + (side ? ` ${side}.` : ""), intro: true });
}

function switchSide(ex, side) {
  return seg(ex, "ready", SWITCH_SECS, { side, say: `Switch sides. ${side}.` });
}

// A single continuous hold, on one side or both.
function timed(ex, secs, leadIn, label = "") {
  const e = EXERCISES[ex];
  if (!e.sides) return [intro(ex, leadIn), seg(ex, "timed", secs, { label })];
  return [
    intro(ex, leadIn, e.sides[0]),
    seg(ex, "timed", secs, { side: e.sides[0], label }),
    switchSide(ex, e.sides[1]),
    seg(ex, "timed", secs, { side: e.sides[1], label }),
  ];
}

// McGill "Russian pyramid": e.g. 3 holds, rest, 2 holds, rest, 1 hold - each side.
// An exercise with `halves` (the curl-up) swaps legs once, after the first set, so a 3-2-1
// pyramid comes out 3 reps each way.
function pyramid(ex, opts, leadIn) {
  const e = EXERCISES[ex];
  const sets = PYRAMIDS[opts.pyramid] || PYRAMIDS["3-2-1"];
  const sides = e.sides || [null];
  const out = [];
  sets.forEach((reps, setIdx) => {
    const half = e.halves ? e.halves[setIdx === 0 ? 0 : 1] : null;
    sides.forEach((s, sideIdx) => {
      const side = s || half;
      if (setIdx === 0 && sideIdx === 0) out.push(intro(ex, leadIn, side));
      else if (sideIdx > 0) out.push(switchSide(ex, side));
      for (let r = 1; r <= reps; r++) {
        const label = `Set ${setIdx + 1} of ${sets.length} · Rep ${r} of ${reps}`;
        out.push(seg(ex, "hold", opts.holdSecs, { side, label }));
        if (r < reps) out.push(seg(ex, "relax", RELAX_SECS, { side, label }));
      }
    });
    if (setIdx < sets.length - 1) {
      const nextHalf = e.halves ? e.halves[1] : null;
      const nextSide = sides[0] || nextHalf;
      const swap = e.halves && setIdx === 0 ? " Swap legs." : "";
      out.push(seg(ex, "rest", opts.restSecs, {
        side: nextSide,
        label: `Rest before set ${setIdx + 2}`,
        say: `Rest.${swap}` + (nextSide ? ` Next: ${nextSide}.` : ""),
      }));
    }
  });
  return out;
}

/* ── Routines ────────────────────────────────────────────────── */
const ROUTINES = [
  {
    id: "release",
    name: "Back Release",
    when: "Twice a day, once warmed up · and before bed",
    blurb: "Sphinx, mid-range cat-cow, hip rotation each side, then 5 minutes of legs-up rest.",
    build: () => [
      ...timed("sphinx", 90, LEAD_IN_FIRST),
      ...timed("catCow", 60, LEAD_IN),
      ...timed("hipRotation", 20, LEAD_IN),
      ...timed("legsUp", 300, LEAD_IN),
    ],
  },
  {
    id: "big3",
    name: "McGill Big 3",
    when: "Once a day, mid-day · not in the first hour after waking",
    blurb: "Short braced holds in a pyramid. Breathe behind the brace, stop if it pinches.",
    build: (opts) => [
      ...pyramid("curlUp", opts, LEAD_IN_FIRST),
      ...pyramid("sidePlank", opts, LEAD_IN),
      ...pyramid("birdDog", opts, LEAD_IN),
    ],
  },
  {
    id: "mobility",
    name: "Hips & Mid-Back",
    when: "Phase 2 · from Tuesday, once the stiffness has eased",
    blurb: "Hip switches, open book, dowel hinge and Pallof press. Needs a stick and a band.",
    build: () => [
      ...timed("hipSwitch", 60, LEAD_IN_FIRST),
      ...timed("openBook", 40, LEAD_IN),
      ...timed("hipHinge", 45, LEAD_IN, "Set 1 of 2"),
      seg("hipHinge", "rest", 20, { label: "Rest before set 2", say: "Rest." }),
      seg("hipHinge", "timed", 45, { label: "Set 2 of 2" }),
      ...timed("pallof", 40, LEAD_IN),
    ],
  },
];

function buildRoutine(id, opts) {
  const routine = ROUTINES.find((r) => r.id === id) || ROUTINES[0];
  const segments = routine.build({ ...DEFAULT_OPTIONS, ...opts });
  // Number the exercises so the player can skip and show "2 of 4".
  let exIdx = -1;
  let prevEx = null;
  segments.forEach((s) => {
    if (s.ex !== prevEx) { exIdx++; prevEx = s.ex; }
    s.exIdx = exIdx;
  });
  const total = segments.reduce((sum, s) => sum + s.secs, 0);
  return { routine, segments, exCount: exIdx + 1, total };
}
