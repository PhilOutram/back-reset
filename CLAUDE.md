# CLAUDE.md

Back Reset: a phone-first PWA with two parts, built from a lower-back recovery plan (a
Gemini chat, Nov 2026).

1. **Stretches** - guided routines with a timer ring, voice, pips and illustrations, in the
   style of the `yoga` (Morning Stretch) app. Holds the screen wake lock while running.
2. **Desk timer** - a stand / sit / move rotation (default 25 / 15 / 5) that beep-beeps at
   each change. It must keep working with the screen OFF, without holding the screen on.

Plain HTML/CSS/vanilla JS, no build step. Classic scripts loaded in order from
`index.html`: `version.js`, `core.js`, `routines.js`, `stretch.js`, `desk.js`, `app.js`.
Served on GitHub Pages at https://philoutram.github.io/back-reset/.

## Files

- `core.js` - `Store` (localStorage, `backReset.` prefix), `Sound` (one AudioContext, pips,
  the keep-alive loop), `Voice`, `Notify` (via the SW registration), `Wake` (wake lock).
- `routines.js` - `EXERCISES` catalogue and `ROUTINES`, each built into a flat list of
  segments (`ready` / `timed` / `hold` / `relax` / `rest`). McGill Big 3 uses a pyramid
  (3-2-1 or 5-3-1) set in the settings modal.
- `stretch.js` - the player. Ticks against an absolute `endsAt`.
- `desk.js` - the rotation. State is saved, so a reload carries on (and shows a "tap to
  switch the beeps back on" banner, because audio needs a gesture).
- `poses/*.webp` - illustrations generated in the Gemini chat.

## Why the desk timer works with the screen off (do not undo)

- Deadlines are absolute `endsAt` values; the 1 s interval only checks and repaints.
- While it runs, `Sound.keepAliveOn()` loops very quiet NOISE (not digital silence) - that
  is what exempts the page from Chrome's background freezing on Android.
- When the page is hidden, each change is also posted as a notification through the
  service worker (`new Notification()` is refused on Android).
- Limits: the tab must stay open (not swiped away). iOS suspends audio when locked, so on an
  iPhone only the installed-PWA notification path can work, and only partly.

## Releasing

Bump `VERSION` + prepend a `CHANGELOG` entry in `version.js`, change every `?v=` stamp in
`index.html` and the `CACHE` name in `sw.js` to match, then run the publish script from the
`new-mini-app` skill. New files the app needs offline go in `ASSETS` in `sw.js`.
