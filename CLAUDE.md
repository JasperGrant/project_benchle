# Plate Math: notes for Claude Code

Daily bench-press puzzle site with two timed games. Static only: no backend, no build step, no framework.

## Layout

- `public/index.html`: the entire app (markup, CSS and JS inline in one file). Loads Barlow / Barlow Condensed from Google Fonts with system fallbacks.
- `public/_headers`: Cloudflare headers (index is no-cache).
- `wrangler.jsonc`: assets-only Cloudflare Worker serving `./public`.
- `package.json`: `npm run dev` (wrangler dev, localhost:8787), `npm run deploy` (wrangler deploy).

## Games

- **Bar count** (`game === 'count'`): one side of a loaded bar is drawn as SVG (`barSVG`). Player types the total (bar + 2 × plates) on a keypad or keyboard. 8 rounds.
- **Work in** (`game === 'workin'`): player is on the bar at weight A; work-in partner needs lighter weight B. Pick the single plate to remove from each side ((A − B) / 2). Rounds 1–4 show both numbers; rounds 5–10 (`visual: i>=4`) show A's bar as a picture plus B as a number. Answers are plate-shaped buttons. 10 rounds.

## Mechanics

- Daily puzzles are deterministic: `buildRounds(game, sys, "YYYY-MM-DD|game|unit")` seeded with xmur3 + mulberry32. Local-date rollover. Puzzle #1 = `EPOCH` (2026-11-19). **Changing the generator, `SYS`, or round counts reshuffles every day's puzzles.**
- `genLoad(rng, sys, t, maxPlates)` makes realistic loads (heaviest plates nearest the collar), difficulty `t` from 0 to 1, capped at 8 plates and `MAX_SLEEVE` px of sleeve.
- Units: `SYS.lb` (45 lb bar; 45/35/25/10/5/2.5 iron plates) and `SYS.kg` (20 kg bar; 25/20/15/10/5/2.5/1.25 in IPF colors via `KG_LOOK`).
- Timer only accrues while `G.status === 'active'` (not during the overlay or between-round transitions). Mistake = +`PENALTY` (5000 ms). `MAX_TRIES` (3) mistakes on one round reveals the answer and marks it red.
- Marks per round: `g` first try, `y` correct after mistakes, `r` missed. These drive the progress pips and the 🟩🟨🟥 share text.
- Persistence: localStorage key `platemath:v1` → `{unit, days: {"date|game|unit": {...}}, stats: {count|workin: {played, streak, maxStreak, last, best: {lb, kg}}}}`. In-progress games save on each answer and resume via the Play button. All storage access is wrapped in try/catch.
- Share: native share sheet on touch devices (not in iframes), else clipboard, else a selectable textarea.

## Design

Safety-yellow "loading zone" palette (`--floor #F2C230`, `--iron #25282D`, `--chalk #FBFAF4`, `--hit/--near/--miss`). Hazard stripe at the top is the only decoration. Condensed type for numbers and headings. Mobile-first, max width 560 px. Respects `prefers-reduced-motion`.

## Testing

No test suite yet. What was verified before handoff:
- Generator sanity across 800 seeded days in both units: correct totals, ≤ 8 plates, unique answers per day, and Work in answers that are real plates equal to (A − B) / 2. To repeat this, copy the code between `function xmur3` and `/* ---------------- drawing` into a Node script.
- Full play-through of both games in headless Chrome (Playwright) at 390 px and 1280 px with no console errors.

## Ideas not built yet

Shared leaderboard (would need Workers + D1/KV), hard mode with unlabeled plates, add-a-plate work-ins (lighter lifter on the bar first), stats history chart.
