# Benchle

Two daily bench-press puzzles, timed, with mistakes counted.

- **Bar count:** you see one side of a loaded bar and enter the total weight, bar included. 4 bars a day, getting harder as you go.
- **Work in:** you're on the bar and someone works in at a lighter weight. Pick the one plate that comes off each side (or goes on, on swap days). 4 rounds a day; in the last two you have to count your own bar from the picture first (just the last one on easy days).

Everyone gets the same puzzles on the same date. They're generated in the browser from the date, so there's no backend or database. Each mistake adds 5 seconds. Three mistakes on one bar shows the answer and moves on. Results, streaks and best times are saved in the player's browser (localStorage). Unfinished games resume where you left off. Every past puzzle is playable from the Archive calendar, and `?puzzle=N` links straight to one. Both games work in lb (45 lb bar) or kg (20 kg bar), and there's an unlimited practice mode.

## Deploy to Cloudflare

You need Node 18+ and a Cloudflare account.

```bash
npm install
npx wrangler login        # opens a browser once to authorize
npm run deploy            # publishes to https://plate-math.<your-subdomain>.workers.dev
```

Run `npm run dev` to try it locally at http://localhost:8787.

### Or deploy from GitHub (auto-deploy on every push)

1. Push this folder to a GitHub repo.
2. In the Cloudflare dashboard go to **Workers & Pages → Create → Import a repository** and pick the repo.
3. Leave the build command empty. Set the deploy command to `npx wrangler deploy`.

### Or Cloudflare Pages drag-and-drop

The site is entirely static, so you can also go to **Workers & Pages → Create → Pages → Upload assets** and drop in the `public` folder.

### Custom domain

`wrangler.jsonc` attaches `benchle.win` and `www.benchle.win` to the Worker as custom domains on every deploy. Cloudflare creates the DNS records and TLS certificates itself. For this to work, the `benchle.win` zone must be in the same Cloudflare account, and it must not have any other A, AAAA or CNAME records for `benchle.win` or `www`; delete those first if a deploy reports a conflict.

## Puzzles

Each day has a theme (Regular session, Change plates, Messy rack, Heavy day, Milestones, Odd plates, Swap day), shuffled weekly, and the difficulty follows the weekday: easy Monday, hardest Saturday.

The first 500 days (through April 1, 2028) are frozen in `public/puzzles.js`. After that the same generator in `public/gen.js` keeps making days, so the site never runs out. To freeze more days, run `npm run puzzles -- 1000`. It keeps every existing day and checks every new puzzle.

## Tweaking

Useful knobs (in `public/gen.js` unless noted):

| What | Where |
| --- | --- |
| Puzzle #1 date | `const EPOCH = new Date(2026,10,19)` (month is 0-based) |
| Themes and their wording | `THEMES` |
| Difficulty by weekday | `WEEKDAY_LEVEL` |
| Rounds per game | `GAMES.count.rounds`, `GAMES.workin.rounds` |
| Time penalty per mistake | `PENALTY` (ms, in `index.html`) |
| Mistakes allowed per bar | `MAX_TRIES` (in `index.html`) |
| Plates, bar weight, plate colors | `SYS` and `KG_LOOK` |
| When Work in switches to the picture rounds | `visFrom` in `buildRounds` |

Changing `gen.js` doesn't touch the frozen days, only practice and days after the end of `puzzles.js`.
