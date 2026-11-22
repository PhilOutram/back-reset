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
const MOVE_SECS     = 20;   // seconds for a change of position (floor <-> standing etc.)
const SWITCH_SECS   = 5;    // seconds to swap sides (an exercise can set switchSecs)
const RELAX_SECS    = 3;    // reset between two holds of the same set

const EXERCISES = {
  standingExt: {
    name: "Standing Back Extension",
    short: "Extension",
    pace: [["Lean back", 3], ["Upright", 2]],
    img: "poses/standing-extension.svg",
    tip: "Hands on the small of your back. Lean back gently for 2-3 s, then upright. 8-10 reps.",
    say: "Standing back extensions. Hands on the small of your back, lean gently backwards, " +
         "then come back up. Mild pressure only.",
  },
  sphinx: {
    name: "Sphinx Pose",
    short: "Sphinx",
    img: "poses/sphinx.webp",
    tip: "Forearms down, back and glutes slack, breathe into your belly. If easy, press up " +
         "onto straight arms and lower again.",
    say: "Sphinx pose. Lie on your stomach and prop yourself up on your forearms. " +
         "Let your lower back go completely slack.",
  },
  catCow: {
    name: "Mid-Range Cat-Cow",
    short: "Cat-Cow",
    pace: [["Gentle arch", 4], ["Flat back", 4]],
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
  gluteBridge: {
    name: "Glute Bridge",
    short: "Bridge",
    pace: [["Lift", 3], ["Lower", 3]],
    img: "poses/glute-bridge.svg",
    tip: "Knees bent. Squeeze your glutes and lift into a line from knees to shoulders. " +
         "10 slow reps.",
    say: "Glute bridge. On your back, knees bent. Squeeze your glutes and lift your hips, " +
         "then lower slowly.",
  },
  catCowFull: {
    name: "Full-Range Cat-Cow",
    short: "Cat-Cow",
    pace: [["Arch", 4], ["Round", 4]],
    img: "poses/cat-cow.webp",
    tip: "Now use more range: round up into the cat as far as is comfortable. Stop at mild " +
         "discomfort.",
    say: "Full range cat cow. On hands and knees, arch and then round your back further " +
         "than before, as far as feels comfortable.",
  },
  kneeHug: {
    name: "Knee Hug",
    short: "Knee hug",
    pace: [["Draw in", 3], ["Ease off", 3]],
    img: "poses/knee-hug.svg",
    tip: "On your back, gently draw both knees towards your chest, then ease off. Mild " +
         "stretch only.",
    say: "Knee hug. Lie on your back and gently draw both knees towards your chest, " +
         "easing in and out.",
  },
  rollDown: {
    name: "Standing Roll-Down",
    short: "Roll-down",
    pace: [["Roll down", 4], ["Roll up", 4]],
    img: "poses/roll-down.svg",
    tip: "Soft knees. Slowly roll down towards your shins, then roll back up. 6-8 reps.",
    say: "Standing roll down. Soft knees, slowly roll down towards your shins, then roll " +
         "back up. Stop at mild discomfort.",
  },
  splitSquat: {
    name: "Split Squat",
    short: "Split squat",
    pace: [["Lower", 3], ["Up", 2]],
    img: "poses/split-squat.svg",
    tip: "Chest tall, front shin upright. Lower the back knee towards the floor. 8 slow reps.",
    say: "Split squat. One foot forward, chest tall. Lower your back knee towards the " +
         "floor and drive back up.",
    sides: ["Left foot forward", "Right foot forward"],
  },
  wallSit: {
    name: "Wall Sit",
    short: "Wall sit",
    img: "poses/wall-sit.svg",
    tip: "Back flat on the wall, slide down until your thighs are nearly level. Breathe.",
    say: "Wall sit. Back flat against the wall, slide down until your thighs are nearly " +
         "level, and hold.",
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
    switchSecs: 8,
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
    pace: [["Knees left", 4], ["Knees right", 4]],
    img: "poses/hip-switch-9090.webp",
    tip: "Hands behind you, chest tall. Slowly windscreen-wipe both knees side to side.",
    say: "Ninety ninety hip switches. Sit tall with your hands behind you and slowly " +
         "swap your knees from side to side.",
  },
  openBook: {
    name: "Open-Book Rotation",
    short: "Open book",
    pace: [["Open", 3], ["Close", 3]],
    switchSecs: 8,
    img: "poses/open-book.webp",
    tip: "Knees stacked at 90 degrees so the lower back stays still. Open the top arm slowly.",
    say: "Open book. Lie on your side with your knees stacked, and slowly open your top " +
         "arm and chest toward the floor behind you.",
    sides: ["Lying on left side", "Lying on right side"],
  },
  hipHinge: {
    name: "Dowel Hip Hinge",
    short: "Hinge",
    pace: [["Hinge back", 3], ["Stand tall", 2]],
    img: "poses/hip-hinge.webp",
    tip: "Stick touching head, upper back and tailbone. Push hips back to 45 degrees. 8 reps.",
    say: "Hip hinge. Hold a stick along your spine, touching your head, upper back and " +
         "tailbone, and hinge back from the hips.",
  },
  pallof: {
    name: "Pallof Press",
    short: "Pallof",
    switchSecs: 8,
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

// The opening "get into position" segment for an exercise. `how` says how to get there
// from the previous position, so a relaxed back is never asked to heave you straight up.
function intro(ex, secs, side = null, how = null) {
  const e = EXERCISES[ex];
  const say = (how ? `${how} ` : "") + e.say + (side ? ` ${side}.` : "");
  return seg(ex, "ready", secs, { side, say, how, intro: true });
}

function switchSide(ex, side) {
  const secs = EXERCISES[ex].switchSecs || SWITCH_SECS;
  return seg(ex, "ready", secs, { side, say: `Switch sides. ${side}.` });
}

// A continuous exercise, on one side or both. opts: { label, how }.
function timed(ex, secs, leadIn, opts = {}) {
  const e = EXERCISES[ex];
  const label = opts.label || "";
  if (!e.sides) return [intro(ex, leadIn, null, opts.how), seg(ex, "timed", secs, { label })];
  return [
    intro(ex, leadIn, e.sides[0], opts.how),
    seg(ex, "timed", secs, { side: e.sides[0], label }),
    switchSide(ex, e.sides[1]),
    seg(ex, "timed", secs, { side: e.sides[1], label }),
  ];
}

// McGill "Russian pyramid": e.g. 3 holds, rest, 2 holds, rest, 1 hold - each side.
// An exercise with `halves` (the curl-up) swaps legs once, after the first set, so a 3-2-1
// pyramid comes out 3 reps each way.
function pyramid(ex, opts, leadIn, how = null) {
  const e = EXERCISES[ex];
  const sets = PYRAMIDS[opts.pyramid] || PYRAMIDS["3-2-1"];
  const sides = e.sides || [null];
  const out = [];
  sets.forEach((reps, setIdx) => {
    const half = e.halves ? e.halves[setIdx === 0 ? 0 : 1] : null;
    sides.forEach((s, sideIdx) => {
      const side = s || half;
      if (setIdx === 0 && sideIdx === 0) out.push(intro(ex, leadIn, side, how));
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
    blurb: "Standing extensions, mid-range cat-cow, Sphinx, hip rotation each side, glute " +
           "bridges, then 2 minutes of legs-up rest. Always moving downwards.",
    // Ordered standing -> hands and knees -> front -> back, so every change of position
    // is downhill and nothing asks a relaxed back to push you back up off the floor.
    build: () => [
      ...timed("standingExt", 40, LEAD_IN_FIRST, { how: "Stand tall, feet hip-width apart." }),
      ...timed("catCow", 64, MOVE_SECS, {
        how: "Get down the easy way. Hold something steady, step back into a half kneel, " +
             "lower the other knee, then put your hands down.",
      }),
      ...timed("sphinx", 90, LEAD_IN + 6, {
        how: "From hands and knees, walk your hands forward and let your hips lower until " +
             "you are lying on your front.",
      }),
      ...timed("hipRotation", 20, MOVE_SECS, {
        how: "Squeeze your glutes and brace lightly, then roll onto your side as one piece, " +
             "and on to your back with your knees bent.",
      }),
      ...timed("gluteBridge", 60, LEAD_IN),
      ...timed("legsUp", 120, LEAD_IN + 6, { how: "Shuffle up to the chair or sofa." }),
    ],
  },
  {
    id: "big3",
    name: "McGill Big 3",
    when: "Once a day, mid-day · not in the first hour after waking",
    blurb: "Short braced holds in a pyramid. Breathe behind the brace, stop if it pinches.",
    build: (opts) => [
      ...pyramid("curlUp", opts, MOVE_SECS, "Get down the easy way and lie on your back."),
      ...pyramid("sidePlank", opts, LEAD_IN + 6,
        "Roll onto your left side, elbow under your shoulder, knees bent."),
      ...pyramid("birdDog", opts, LEAD_IN + 6, "From your side, push up onto hands and knees."),
    ],
  },
  {
    id: "flexion",
    name: "Bending Return",
    when: "From about day 10 · stop at mild discomfort",
    blurb: "Gently brings forward bending back: full cat-cow, knee hugs and slow roll-downs, " +
           "finishing with extensions.",
    build: () => [
      ...timed("catCowFull", 64, MOVE_SECS, {
        how: "Get down the easy way: half kneel, lower the other knee, hands down.",
      }),
      ...timed("kneeHug", 48, LEAD_IN + 6, {
        how: "Lower onto your side, then roll onto your back.",
      }),
      ...timed("rollDown", 64, MOVE_SECS, {
        how: "Brace lightly, roll onto your side, push up onto hands and knees, then half " +
             "kneel and stand up.",
      }),
      ...timed("standingExt", 30, LEAD_IN),
    ],
  },
  {
    id: "mobility",
    name: "Hips & Mid-Back",
    when: "Phase 2 · from Tuesday, once the stiffness has eased",
    blurb: "Hip switches, open book, dowel hinge, Pallof press, split squats and a wall sit. " +
           "Needs a stick and a band.",
    build: () => [
      ...timed("hipSwitch", 64, MOVE_SECS, {
        how: "Sit on the floor, knees bent, hands on the floor behind you.",
      }),
      ...timed("openBook", 42, LEAD_IN + 6, {
        how: "Lie on your left side with your knees stacked at ninety degrees.",
      }),
      ...timed("hipHinge", 45, MOVE_SECS, {
        label: "Set 1 of 2",
        how: "Get up the easy way: hands and knees, half kneel, then stand. Pick up your stick.",
      }),
      seg("hipHinge", "rest", 20, { label: "Rest before set 2", say: "Rest." }),
      seg("hipHinge", "timed", 45, { label: "Set 2 of 2" }),
      ...timed("pallof", 40, LEAD_IN + 6, {
        how: "Hold the band, anchored at chest height, and step out sideways.",
      }),
      ...timed("splitSquat", 40, LEAD_IN, { how: "Step into a long split stance." }),
      ...timed("wallSit", 30, LEAD_IN + 4, {
        label: "Set 1 of 2",
        how: "Find a clear bit of wall.",
      }),
      seg("wallSit", "rest", 20, { label: "Rest before set 2", say: "Rest." }),
      seg("wallSit", "timed", 30, { label: "Set 2 of 2" }),
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
