# Benchle: notes for Claude Code

Daily bench-press puzzle site with two timed games, live at https://benchle.win. The site was first called Plate Math; the Worker is still named `plate-math` on purpose (renaming it would create a new Worker and break the deploy). Static only: no backend, no build step, no framework.

## Layout

- `public/index.html`: the app (markup, CSS and UI JS inline). Loads Barlow / Barlow Condensed from Google Fonts with system fallbacks.
- `public/gen.js`: the puzzle generator (`window.BenchleGen`), shared by the page and the build script: equipment (`SYS`), themes, `buildRounds`, `buildDay`, the compact encoding, and `dayFor(n)`.
- `public/puzzles.js`: frozen puzzles, one line per day (`window.BENCHLE_PUZZLES`). Generated; don't edit by hand.
- `scripts/make-puzzles.mjs`: `npm run puzzles [N]` makes sure days 1..N (default 500) exist, keeps every day already in the file, and checks every round. Fails loudly on any bad puzzle.
- `public/_headers`: Cloudflare headers (index is no-cache).
- `wrangler.jsonc`: assets-only Cloudflare Worker serving `./public`.
- `package.json`: `npm run dev` (wrangler dev, localhost:8787), `npm run deploy` (wrangler deploy), `npm run puzzles`.

## Games

- **Bar count** (`game === 'count'`): one side of a loaded bar is drawn as SVG (`barSVG`). Player types the total (bar + 2 × plates) on a keypad or keyboard. 8 rounds.
- **Work in** (`game === 'workin'`): player is on the bar (`r.bar`, weight A); work-in partner needs B. Pick the single plate to remove from each side ((A − B) / 2), or on swap days (`r.add`) the plate to add. Early rounds show both numbers; later ones (`r.visual`, from round 4–6 depending on theme and day) show A's bar as a picture plus B as a number. Answers are plate-shaped buttons. 10 rounds.

## Mechanics

- Puzzle n's games come from `dayFor(n)`: the frozen day in `puzzles.js` if there is one (days 1–500, through 2028-04-01), otherwise `buildDay(n)` from the generator, which is deterministic (xmur3 + mulberry32 seeded by date, game, unit and theme). Local-date rollover. Puzzle #1 = `EPOCH` (2026-11-19). Changing `gen.js` only affects practice and days past the end of `puzzles.js`; extend the file with `npm run puzzles -- 1000` well before it runs out. Only use `--rebuild` if no one has played yet.
- Themes: one per day from `THEMES` (regular, change plates, messy rack, heavy day, milestones, odd plates, swap day). The seven are shuffled afresh each week, never the same two days running. Difficulty follows the weekday (`WEEKDAY_LEVEL`: easy Monday, hardest Saturday). Totals are capped at `maxTotal` (585 lb / 265 kg).
- `genLoad(rng, sys, t, maxPlates)` makes realistic loads (heaviest plates nearest the collar), difficulty `t` from 0 to 1, capped at 8 plates and `MAX_SLEEVE` px of sleeve.
- Units: `SYS.lb` (45 lb bar; 45/35/25/10/5/2.5 iron plates) and `SYS.kg` (20 kg bar; 25/20/15/10/5/2.5/1.25 in IPF colors via `KG_LOOK`).
- Timer only accrues while `G.status === 'active'` (not during the overlay or between-round transitions). Mistake = +`PENALTY` (5000 ms). `MAX_TRIES` (3) mistakes on one round reveals the answer and marks it red.
- Marks per round: `g` first try, `y` correct after mistakes, `r` missed. These drive the progress pips and the 🟩🟨🟥 share text.
- Archive: `#archive` section, a month calendar (newest first) from puzzle 1 to today, like King Grid's. Each day has two marks (Bar count, Work in) for the current unit: green done, amber in progress. Tapping a day sets `viewKey` (null = today) and shows that puzzle on the home screen with the player's time per game. `?puzzle=N` links to a past puzzle; `syncUrl()` keeps the URL and title in step, and drops back to today when the viewed day is today or later.
- Stats: `played` counts each date once per game (even if finished in both units). Streaks only count puzzles finished on their own date; archive plays count toward `best` but not the streak. A streak whose `last` day is before yesterday shows as 0.
- Persistence: localStorage key `benchle:v1` → `{unit, days: {"date|game|unit": {...}}, stats: {count|workin: {played, streak, maxStreak, last, best: {lb, kg}}}}`. In-progress games save on each answer and resume via the Play button. All storage access is wrapped in try/catch.
- Share: native share sheet on touch devices (not in iframes), else clipboard, else a selectable textarea.

## Design

Safety-yellow "loading zone" palette (`--floor #F2C230`, `--iron #25282D`, `--chalk #FBFAF4`, `--hit/--near/--miss`). Hazard stripe at the top is the only decoration. Condensed type for numbers and headings. Mobile-first, max width 560 px. Respects `prefers-reduced-motion`.

## Testing

No test suite yet. What was verified before handoff:
- `npm run puzzles` checks every frozen day: correct totals, ≤ 8 plates and fits the sleeve, under `maxTotal`, unique answers per game, Work in answers are real plates equal to |A − B| / 2 in the right direction, theme rules (messy bars out of order with mixed plates, milestone totals, add rounds only on swap days), no theme two days running, and encode/decode round-trips. The generator also passes these checks through day 2000.
- Full play-through of both games in headless Chrome (Playwright) at 390 px and 1280 px with no console errors.

## Ideas not built yet

Shared leaderboard (would need Workers + D1/KV), hard mode with unlabeled plates, two-plate work-ins, stats history chart.
