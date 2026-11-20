// Freezes Benchle puzzles into public/puzzles.js and checks every one.
//
//   npm run puzzles            # make sure days 1..500 exist
//   npm run puzzles -- 1000    # extend to 1000 days
//
// Days already in puzzles.js are kept exactly as they are, so extending the
// file (or changing gen.js) never changes a puzzle someone may have played.
// Pass --rebuild to regenerate every day from scratch (only before launch!).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const genFile = path.join(root, 'public/gen.js');
const outFile = path.join(root, 'public/puzzles.js');

const args = process.argv.slice(2);
const rebuild = args.includes('--rebuild');
const want = Number(args.find(a => /^\d+$/.test(a)) ?? 500);

// Load gen.js the way the browser does.
const ctx = {};
ctx.globalThis = ctx;
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(genFile, 'utf8'), ctx, {filename: genFile});
const G = ctx.BenchleGen;

let existing = [];
if (!rebuild && fs.existsSync(outFile)) {
  vm.runInContext(fs.readFileSync(outFile, 'utf8'), ctx, {filename: outFile});
  existing = ctx.BENCHLE_PUZZLES || [];
}

const days = existing.slice(0, Math.max(want, existing.length));
for (let n = days.length + 1; n <= want; n++) days.push(G.encodeDay(G.buildDay(n)));

/* ---------------- checks ---------------- */
const problems = [];
const fail = (n, msg) => problems.push(`puzzle ${n}: ${msg}`);
const stats = {themes: {}, add: 0, rounds: 0, totals: {lb: [Infinity, 0], kg: [Infinity, 0]}};

days.forEach((raw, i) => {
  const n = i + 1;
  if (!G.THEMES[raw.t]) fail(n, `unknown theme ${raw.t}`);
  stats.themes[raw.t] = (stats.themes[raw.t] || 0) + 1;
  if (i > 0 && days[i - 1].t === raw.t) fail(n, `same theme as the day before (${raw.t})`);
  const day = G.decodeDay(raw);
  const again = G.encodeDay(day);
  if (JSON.stringify(again) !== JSON.stringify(raw)) fail(n, 'does not round-trip through encode/decode');

  for (const unit of Object.keys(G.SYS)) {
    const sys = G.SYS[unit];
    const count = day[unit].count, workin = day[unit].workin;
    if (count.length !== G.GAMES.count.rounds) fail(n, `${unit} count has ${count.length} rounds`);
    if (workin.length !== G.GAMES.workin.rounds) fail(n, `${unit} workin has ${workin.length} rounds`);

    const answers = new Set();
    count.forEach((r, k) => {
      if (!G.fits(sys, r.plates)) fail(n, `${unit} count ${k + 1}: load does not fit (${r.plates})`);
      if (r.answer !== G.total(sys, r.plates)) fail(n, `${unit} count ${k + 1}: wrong total`);
      if (answers.has(r.answer)) fail(n, `${unit} count ${k + 1}: repeated total ${r.answer}`);
      answers.add(r.answer);
      if (r.answer > sys.maxTotal) fail(n, `${unit} count ${k + 1}: ${r.answer} is heavier than ${sys.maxTotal}`);
      const mixed = new Set(r.plates).size > 1;
      if (raw.t === 'messy' && k >= 1 && !mixed) fail(n, `${unit} count ${k + 1}: messy rack bar has only one kind of plate`);
      if (raw.t === 'messy' && k >= 1 && mixed && G.isSorted(r.plates)) fail(n, `${unit} count ${k + 1}: messy rack bar is tidy`);
      if (raw.t !== 'messy' && !G.isSorted(r.plates)) fail(n, `${unit} count ${k + 1}: plates out of order`);
      if (raw.t === 'milestone' && !sys.milestones.includes(r.answer)) fail(n, `${unit} count ${k + 1}: ${r.answer} is not a milestone`);
      const tt = stats.totals[unit];
      tt[0] = Math.min(tt[0], r.answer); tt[1] = Math.max(tt[1], r.answer);
    });

    const pairs = new Set();
    workin.forEach((r, k) => {
      stats.rounds++;
      if (r.add) stats.add++;
      if (!G.fits(sys, r.bar)) fail(n, `${unit} workin ${k + 1}: your bar does not fit`);
      if (!sys.plates.includes(r.answer)) fail(n, `${unit} workin ${k + 1}: ${r.answer} is not a plate`);
      if (Math.abs(Math.abs(r.A - r.B) - 2 * r.answer) > 1e-9) fail(n, `${unit} workin ${k + 1}: A and B don't differ by two plates`);
      if (r.add !== (r.B > r.A)) fail(n, `${unit} workin ${k + 1}: direction is wrong`);
      if (r.add && raw.t !== 'swap') fail(n, `${unit} workin ${k + 1}: add round outside swap day`);
      if (!r.add && !r.bar.includes(r.answer)) fail(n, `${unit} workin ${k + 1}: the answer plate is not on the bar`);
      if (r.B <= sys.bar) fail(n, `${unit} workin ${k + 1}: partner's weight is an empty bar`);
      if (r.add && !G.fits(sys, [...r.bar, r.answer])) fail(n, `${unit} workin ${k + 1}: added plate does not fit`);
      if (Math.max(r.A, r.B) > sys.maxTotal) fail(n, `${unit} workin ${k + 1}: heavier than ${sys.maxTotal}`);
      if (raw.t === 'milestone' && !sys.milestones.includes(r.B)) fail(n, `${unit} workin ${k + 1}: ${r.B} is not a milestone`);
      const key = r.A + '/' + r.B;
      if (pairs.has(key)) fail(n, `${unit} workin ${k + 1}: repeated work-in ${key}`);
      pairs.add(key);
    });
    if (!workin.some(r => r.visual)) fail(n, `${unit} workin has no picture round`);
    if (workin[0].visual || workin[0].add) fail(n, `${unit} workin round 1 should be a plain take-off with both numbers`);
    if (raw.t === 'swap' && !workin.some(r => r.add)) fail(n, `${unit} swap day has no heavier work-ins`);
  }
});

if (problems.length) {
  console.error(`${problems.length} problem(s):\n` + problems.slice(0, 40).join('\n'));
  process.exit(1);
}

const body = days.map(d => JSON.stringify(d)).join(',\n');
fs.writeFileSync(outFile,
  `// Generated by scripts/make-puzzles.mjs. Do not edit by hand.\n` +
  `// One line per day; line 1 is puzzle No. 1 (${G.keyForPuzzle(1)}).\n` +
  `// Last day: No. ${days.length} (${G.keyForPuzzle(days.length)}).\n` +
  `window.BENCHLE_PUZZLES = [\n${body}\n];\n`);

const kept = rebuild ? 0 : Math.min(existing.length, days.length);
console.log(`Wrote ${days.length} days to public/puzzles.js (${kept} kept, ${days.length - kept} new), through ${G.keyForPuzzle(days.length)}.`);
console.log('Themes:', stats.themes);
console.log(`Heavier work-ins: ${stats.add} of ${stats.rounds} rounds.`);
console.log('Bar count totals: lb', stats.totals.lb.join('–'), '| kg', stats.totals.kg.join('–'));
console.log(`File size: ${(fs.statSync(outFile).size / 1024).toFixed(0)} KB`);
