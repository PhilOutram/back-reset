// Back Reset - version and changelog.
// Bump VERSION and prepend an entry on EVERY publish, and change the ?v= stamps in
// index.html and the CACHE name in sw.js to match. Dates are YYYY-MM-DD.
const VERSION = "v0.17";

// Newest first.
const CHANGELOG = [
  {
    version: "v0.17",
    date: "2026-11-22",
    notes: [
      "The note under the routines fits on one line.",
    ],
  },
  {
    version: "v0.16",
    date: "2026-11-22",
    notes: [
      "The pain map is now a proper anatomy illustration of the back, from the lowest " +
        "ribs to the knees, with spot names matched to it.",
      "New Labels switch names the muscles and bones (erector spinae, QL, glutes, SI " +
        "joints, L1-L5) for talking it through with a physio - also on the shared map.",
    ],
  },
  {
    version: "v0.15",
    date: "2026-11-22",
    notes: [
      "Phase 2 routines are faded while you're still in Phase 1 (they still start if you " +
        "tap them).",
    ],
  },
  {
    version: "v0.14",
    date: "2026-11-22",
    notes: [
      "Each phase is its own pill at the top of the Stretches tab - filled for the phase " +
        "you're in, outlined for the other. Tap one to see its plan; the other phase's " +
        "plan holds the switch.",
      "Tap a routine's card to start it - no more Begin button.",
    ],
  },
  {
    version: "v0.13",
    date: "2026-11-22",
    notes: [
      "The Big 3 pyramid follows the phase: 3-2-1 in Phase 1, 5-3-1 in Phase 2. Each can " +
        "be changed in Settings.",
      "Tighter routine cards and a collapsed plan, so all four routines and Begin fit on a " +
        "phone screen.",
    ],
  },
  {
    version: "v0.12",
    date: "2026-11-22",
    notes: [
      "Today's phase switch at the bottom of the Stretches tab: it moves to Phase 2 by " +
        "itself on Day 10, says what Phase 2 depends on, and can be switched back.",
      "Each day remembers its phase, and daily targets are set per phase - Phase 2 adds " +
        "Bending Return and Hips & Mid-Back once a day.",
    ],
  },
  {
    version: "v0.11",
    date: "2026-11-22",
    notes: [
      "The plan is spelled out above the routines: Phase 1 (Day 1-9) and Phase 2 (Day 10 " +
        "on), with where you are now.",
      "Each card says which phase it belongs to and when it starts; the Log uses the same " +
        "routine names, with a heading for each phase.",
    ],
  },
  {
    version: "v0.10",
    date: "2026-11-22",
    notes: [
      "New illustrations for standing extensions, glute bridges, roll-downs and split squats.",
    ],
  },
  {
    version: "v0.09",
    date: "2026-11-22",
    notes: [
      "Big 3: curl-ups and bird-dogs now alternate sides on every hold (R L R L R L), so " +
        "each side rests while the other works; side planks stay in blocks so you roll " +
        "over once per set.",
      "Curl-up gets the full pyramid on each leg, like the other two. Rests shrink as the " +
        "sets get smaller: 20 s, then 15 s.",
    ],
  },
  {
    version: "v0.08",
    date: "2026-11-22",
    notes: [
      "Pain map is now just the back, from chest to knees, so you can place a spot more " +
        "precisely - with the spine levels, SI joints and hip bones marked.",
      "Tapping shows the spot and its name for a second before the form opens, and the " +
        "form shows a thumbnail of where you tapped. Wrong spot? Close it and tap again.",
    ],
  },
  {
    version: "v0.07",
    date: "2026-11-22",
    notes: [
      "Day number at the top - tap it to set the day or start again from Day 1.",
      "Every log carries the day number with the date: pain entries, the journal, desk " +
        "totals and routine counts.",
    ],
  },
  {
    version: "v0.06",
    date: "2026-11-22",
    notes: [
      "Rhythm words (Gentle arch, Flat back...) are spoken at 20% volume.",
      "New setting: quiet words or pips only.",
    ],
  },
  {
    version: "v0.05",
    date: "2026-11-22",
    notes: [
      "Back Release now always moves downhill (standing, hands and knees, front, back), " +
        "so you never push up off your front onto all fours.",
      "Each exercise says how to get into position the easy way, with more time for " +
        "changes of position.",
      "Moving exercises are paced: cat-cow, bridges, roll-downs and more show Arch / Round " +
        "style cues with a soft pip.",
    ],
  },
  {
    version: "v0.04",
    date: "2026-11-22",
    notes: [
      "New Pain tab: tap a body map to log where it hurts (0-10, type, notes); copy the " +
        "dated journal or share it with a numbered map for your physio or an AI.",
      "Routines updated after a second opinion: Back Release gains standing extensions " +
        "and glute bridges, with a 2-minute legs-up; new Bending Return routine; split " +
        "squats and wall sits in Hips & Mid-Back.",
      "Desk: Rebuild sitting preset (15/30/5), sitting up to 45 min, extensions at Move " +
        "breaks. Log shows the worst pain each day.",
    ],
  },
  {
    version: "v0.03",
    date: "2026-11-22",
    notes: [
      "Curl-up swaps legs once, after the first set, so both legs get the same reps.",
      "Back Release card now says the hip rotation is done on each side.",
    ],
  },
  {
    version: "v0.02",
    date: "2026-11-22",
    notes: [
      "New Log tab: daily targets and a compact day-by-day diary from Day 1, recorded " +
        "automatically.",
      "iPhone warning, plus a Keep screen on option for the desk timer.",
    ],
  },
  {
    version: "v0.01",
    date: "2026-11-22",
    notes: [
      "Guided stretch routines (Back Release, McGill Big 3, Hips & Mid-Back) with " +
        "timers, voice and illustrations.",
      "Desk timer for the stand / sit / move rotation that beeps even with the " +
        "screen off.",
    ],
  },
];
