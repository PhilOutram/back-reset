// Back Reset - version and changelog.
// Bump VERSION and prepend an entry on EVERY publish, and change the ?v= stamps in
// index.html and the CACHE name in sw.js to match. Dates are YYYY-MM-DD.
const VERSION = "v0.08";

// Newest first.
const CHANGELOG = [
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
