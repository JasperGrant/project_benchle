// Renders the link-preview image and the iOS icon into public/:
//   card.html -> public/og.png (1200x630), icon.html -> public/apple-touch-icon.png (180x180)
// Needs Playwright with Chromium: node scripts/og/render.js
const {chromium} = require('playwright');
const path = require('path');
const here = __dirname, outDir = path.join(__dirname, '../../public');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({viewport: {width: 1200, height: 630}, deviceScaleFactor: 1});
  await p.goto('file://' + path.join(here, 'card.html'));
  await p.evaluate(() => document.fonts.ready);
  const fonts = await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight));
  console.log('fonts:', fonts.join(', '));
  await p.screenshot({path: path.join(outDir, 'og.png')});
  const q = await b.newPage({viewport: {width: 180, height: 180}, deviceScaleFactor: 1});
  await q.goto('file://' + path.join(here, 'icon.html'));
  await q.screenshot({path: path.join(outDir, 'apple-touch-icon.png')});
  await b.close();
})();
