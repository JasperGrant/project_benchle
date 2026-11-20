/* Benchle puzzle generator.
 *
 * Shared by the page (practice games, and any day past the end of puzzles.js)
 * and by scripts/make-puzzles.mjs, which freezes days into public/puzzles.js so
 * that later changes here never reshuffle puzzles people have already seen.
 *
 * Everything is deterministic: the same puzzle number always gives the same day.
 */
(function (root) {
'use strict';

/* ---------------- seeded randomness ---------------- */
function xmur3(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}return()=>{h=Math.imul(h^(h>>>16),2246822507);h=Math.imul(h^(h>>>13),3266489909);return(h^=h>>>16)>>>0;};}
function mulberry32(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rngFor = s => mulberry32(xmur3(s)());
const pick = (rng, arr) => arr[Math.floor(rng()*arr.length)];
function shuffle(rng, arr){ const a = arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

/* ---------------- dates ---------------- */
const pad = n => String(n).padStart(2,'0');
const dateKey = (d=new Date()) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const EPOCH = new Date(2026,10,19); // puzzle no. 1
function puzzleNo(key){const [y,m,d]=key.split('-').map(Number);return Math.round((new Date(y,m-1,d)-EPOCH)/864e5)+1;}
const keyForPuzzle = n => dateKey(new Date(EPOCH.getFullYear(),EPOCH.getMonth(),EPOCH.getDate()+n-1));

/* ---------------- equipment ---------------- */
const KG_LOOK = {
  25:{fill:'#C2302A',edge:'#9E231E',ink:'#FFFFFF'},
  20:{fill:'#1F5BA8',edge:'#17457F',ink:'#FFFFFF'},
  15:{fill:'#E9B71C',edge:'#BF9411',ink:'#25282D'},
  10:{fill:'#2C8A4C',edge:'#1F6838',ink:'#FFFFFF'},
  5:{fill:'#F2F1EC',edge:'#C9C7BE',ink:'#25282D'},
  2.5:{fill:'#C2302A',edge:'#9E231E',ink:'#FFFFFF'},
  1.25:{fill:'#CDD2D7',edge:'#A3AAB1',ink:'#25282D'}
};
const IRON = {fill:'#2C3036',edge:'#4A5058',ink:'#EDE8DA'};
// main: the plate most lifters load first. odd: plates people forget about. small: change plates.
const SYS = {
  lb:{id:'lb',bar:45,plates:[45,35,25,10,5,2.5],
      w:{45:44,35:40,25:35,10:29,5:25,2.5:24},
      h:{45:250,35:222,25:188,10:142,5:118,2.5:98},
      main:[45], odd:[35,2.5], small:[10,5,2.5], maxTotal:585,
      milestones:[95,115,135,155,185,205,225,245,275,295,315,335,365,385,405,425,455,475,495,545],
      look:()=>IRON},
  kg:{id:'kg',bar:20,plates:[25,20,15,10,5,2.5,1.25],
      w:{25:44,20:41,15:37,10:32,5:27,2.5:24,1.25:24},
      h:{25:250,20:250,15:226,10:192,5:142,2.5:116,1.25:98},
      main:[20,25], odd:[15,1.25], small:[5,2.5,1.25], maxTotal:265,
      milestones:[40,50,60,70,80,90,100,110,120,125,130,140,150,160,170,180,190,200,220,250],
      look:d=>KG_LOOK[d]}
};
const MAX_PLATES = 8, MAX_SLEEVE = 340;
const fmtW = n => String(+(+n).toFixed(2));
const sum = pl => pl.reduce((s,d)=>s+d,0);
const total = (sys,pl) => +(sys.bar + 2*sum(pl)).toFixed(2);
const sleeveWidth = (sys,pl) => pl.reduce((s,d)=>s+sys.w[d],0);
const fits = (sys,pl) => pl.length>0 && pl.length<=MAX_PLATES && sleeveWidth(sys,pl)<=MAX_SLEEVE;
const sortDesc = pl => pl.slice().sort((a,b)=>b-a);
const isSorted = pl => pl.every((d,i)=>i===0 || pl[i-1]>=d);

/* ---------------- themes ---------------- */
// One theme per day. The seven rotate in a fresh shuffled order every week.
const THEMES = {
  regular:   {name:'Regular session', blurb:'A normal day at the gym.'},
  change:    {name:'Change plates',   blurb:'Lots of little plates. Count carefully.'},
  messy:     {name:'Messy rack',      blurb:'Someone loaded these in a hurry, so the plates are out of order.'},
  heavy:     {name:'Heavy day',       blurb:'Big plates and big numbers.'},
  milestone: {name:'Milestones',      blurb:'Every target is a number lifters chase, like 225 or 100 kg.'},
  odd:       {name:'Odd plates',      blurb:'The plates nobody reaches for first.'},
  swap:      {name:'Swap day',        blurb:'Some work-ins lift heavier than you, so a plate goes on instead of coming off.'}
};
const THEME_IDS = Object.keys(THEMES);

function themeForPuzzle(n){
  const week = Math.floor((n-1)/7), pos = (n-1)%7;
  const order = w => {
    const o = shuffle(rngFor('themes|'+w), THEME_IDS);
    // Never the same theme two days running across a week boundary.
    if(w>0){ const prev = order(w-1); if(o[0]===prev[6]) [o[0],o[1]] = [o[1],o[0]]; }
    return o;
  };
  return order(week)[pos];
}
// Weekly rhythm by calendar day: easy Monday, hardest Saturday.
const WEEKDAY_LEVEL = [0.6, 0.15, 0.35, 0.5, 0.65, 0.8, 1]; // Sun..Sat
function levelForPuzzle(n){
  const d = new Date(EPOCH.getFullYear(),EPOCH.getMonth(),EPOCH.getDate()+n-1);
  return WEEKDAY_LEVEL[d.getDay()];
}

/* ---------------- loads ---------------- */
// One side of a bar. t: 0 (easy) .. 1 (messy). Heaviest plates sit closest to the collar.
function genLoad(rng, sys, t, style){
  const P = sys.plates;
  for(let tries=0; tries<120; tries++){
    const out = [];
    let start;   // index of the first (heaviest) plate type used
    if(style==='heavy'){
      const big = sys.id==='kg' && rng()<0.5 ? 25 : sys.main[0];
      const n = 2 + Math.floor(rng()*(2 + Math.round(t*2)));
      for(let i=0;i<n;i++) out.push(big);
      start = P.indexOf(big);
    } else if(style==='change'){
      const nBig = rng() < 0.3 + 0.5*t ? 1 + (rng()<t*0.5 ? 1 : 0) : 0;
      const big = pick(rng, sys.main);
      for(let i=0;i<nBig;i++) out.push(big);
      start = nBig ? P.indexOf(big) : P.indexOf(sys.small[0]) - 1;
    } else {
      let base = 0;
      if(sys.id==='kg' && rng()<0.35) base = 1;           // 20s are common in kg gyms
      if(rng()<0.12) base = sys.id==='lb' ? 2 : 3;        // the occasional light warm-up bar
      let maxBase = base>=2 ? 2 : 1 + Math.round(t*3);
      if(base<2 && t>0.6 && rng()<0.3) maxBase++;
      const nBase = 1 + Math.floor(rng()*maxBase);
      for(let i=0;i<nBase;i++) out.push(P[base]);
      start = base;
    }
    const maxExtras = style==='change' ? 2 + Math.round(t*4) : style==='heavy' ? 1 + Math.round(t*2) : 1 + Math.round(t*3);
    let extras = 0;
    for(let i=start+1; i<P.length && extras<maxExtras; i++){
      const d = P[i];
      let p = 0.18 + 0.42*t;
      if(style==='change') p = sys.small.includes(d) ? 0.55 + 0.35*t : 0.15;
      if(style==='odd') p = sys.odd.includes(d) ? 0.85 : p*0.6;
      else if(sys.odd.includes(d)) p *= 0.5;
      if(rng()<p){
        const c = rng() < (style==='change' ? 0.25+0.35*t : 0.22*t) ? 2 + (style==='change' && rng()<t*0.4 ? 1 : 0) : 1;
        for(let k=0;k<c && extras<maxExtras;k++){ out.push(d); extras++; }
      }
    }
    if(style==='odd' && !out.some(d=>sys.odd.includes(d))) continue;
    if(style==='change' && out.filter(d=>sys.small.includes(d)).length < 2) continue;
    if(!fits(sys,out)) continue;
    return sortDesc(out);
  }
  return [sys.main[0]];
}

// A realistic way to load `side` per side: greedy, then a few swaps a real gym forces on you.
function decompose(rng, sys, side, t){
  const P = sys.plates, out = [];
  let left = side;
  for(const d of P){ while(left >= d - 1e-9){ out.push(d); left = +(left-d).toFixed(2); } }
  if(left > 1e-9) return null;
  const swaps = sys.id==='lb'
    ? [[45,[35,10]],[45,[25,10,10]],[25,[10,10,5]],[35,[25,10]],[10,[5,5]],[5,[2.5,2.5]]]
    : [[25,[20,5]],[20,[15,5]],[20,[10,10]],[15,[10,5]],[10,[5,5]],[5,[2.5,2.5]]];
  let pl = out;
  const nSwaps = Math.floor(rng()*(1 + t*3));
  for(let i=0;i<nSwaps;i++){
    const [from, to] = pick(rng, swaps), at = pl.indexOf(from);
    if(at<0) continue;
    const next = sortDesc([...pl.slice(0,at), ...pl.slice(at+1), ...to]);
    if(fits(sys,next)) pl = next;
  }
  return fits(sys,pl) ? sortDesc(pl) : null;
}
function milestoneLoad(rng, sys, t){
  const M = sys.milestones;
  // Easier rounds pick from the lighter end of the list.
  const lo = Math.floor(t*0.5*(M.length-1)), hi = Math.min(M.length-1, Math.floor((0.35+0.65*t)*(M.length-1)));
  for(let k=0;k<40;k++){
    const T = M[lo + Math.floor(rng()*(hi-lo+1))];
    const pl = decompose(rng, sys, (T - sys.bar)/2, t);
    if(pl) return pl;
  }
  return null;
}
// Out of order, but never accidentally sorted.
function messUp(rng, pl){
  if(new Set(pl).size < 2) return pl;
  for(let k=0;k<20;k++){ const s = shuffle(rng, pl); if(!isSorted(s)) return s; }
  return pl.slice().reverse();
}

/* ---------------- rounds ---------------- */
const GAMES = {
  count:{name:'Bar count', rounds:4},
  workin:{name:'Work in', rounds:4}
};

// level: 0 (Monday-easy) .. 1 (Saturday-hard). Returns plain round objects.
function buildRounds(game, sys, seed, theme='regular', level=0.5){
  const rng = rngFor(seed);
  const N = GAMES[game].rounds, out = [], seen = new Set();
  const lo = 0.05 + 0.2*level, hi = 0.55 + 0.45*level;
  const loadStyle = theme==='heavy' || theme==='change' || theme==='odd' ? theme : 'std';
  for(let i=0;i<N;i++){
    const t = lo + (hi-lo)*(N>1 ? i/(N-1) : 0);
    let round = null;
    for(let k=0;k<300 && !round;k++){
      if(game==='count'){
        let plates = theme==='milestone' ? milestoneLoad(rng, sys, t) : genLoad(rng, sys, t, loadStyle);
        if(!plates || total(sys,plates) > sys.maxTotal) continue;
        if(theme==='messy' && i >= 1 && new Set(plates).size < 2) continue;
        // Messy rack: the first bar is tidy, the rest are a mess.
        if(theme==='messy' && i >= 1) plates = messUp(rng, plates);
        const answer = total(sys, plates);
        if(seen.has(answer) && k<299) continue;
        seen.add(answer); round = {plates, answer};
      } else {
        // Swap day: after the first round, about half the work-ins are heavier than you,
        // and the last one is if none were before it.
        const add = theme==='swap' && i>=1 && (rng() < 0.5 || (i===N-1 && !out.some(r=>r.add)));
        let light, plate;
        if(theme==='milestone'){
          // The weight your partner wants is a milestone.
          const target = milestoneLoad(rng, sys, t*0.9);
          if(!target) continue;
          if(add){ plate = pick(rng, target); const at = target.indexOf(plate); light = [...target.slice(0,at), ...target.slice(at+1)]; if(!light.length) continue; }
          else { light = target; plate = pick(rng, sys.plates); }
        } else {
          light = genLoad(rng, sys, t*0.9, loadStyle);
          const pool = theme==='change' ? sys.small : theme==='odd' && rng()<0.6 ? sys.odd : theme==='heavy' && rng()<0.5 ? sys.plates.slice(0,3) : sys.plates;
          plate = pick(rng, pool);
        }
        let heavy = sortDesc([...light, plate]);
        if(!fits(sys,heavy) || total(sys,heavy) > sys.maxTotal) continue;
        if(theme==='messy' && i >= 2 && new Set(add ? light : heavy).size < 2) continue;
        // You're on the heavy bar when a plate comes off, the light one when it goes on.
        let bar = add ? light.slice() : heavy;
        if(theme==='messy' && i >= 2) bar = messUp(rng, bar);
        const A = total(sys, bar), B = total(sys, add ? heavy : light), key = A+'/'+B;
        if(seen.has(key) && k<299) continue;
        seen.add(key);
        // Picture rounds (count your own bar first): the last two, or just the last on easy days.
        const visFrom = level < 0.3 ? N-1 : N-2;
        round = {bar, A, B, answer:plate, add, visual: i>=visFrom};
      }
    }
    out.push(round);
  }
  return out;
}

// Everything for one puzzle number: the theme and all four games.
function buildDay(n){
  const key = keyForPuzzle(n), theme = themeForPuzzle(n), level = levelForPuzzle(n);
  const day = {theme, level};
  for(const unit of Object.keys(SYS)){
    day[unit] = {};
    for(const game of Object.keys(GAMES)) day[unit][game] = buildRounds(game, SYS[unit], `${key}|${game}|${unit}|${theme}`, theme, level);
  }
  return day;
}

/* ---------------- compact encoding for puzzles.js ---------------- */
// Plates are letters by position in SYS[unit].plates (a = heaviest).
// Bar count round: "aabd". Work in round: "aabd-c" or "aab+c", with a trailing "*" for picture rounds.
const enc = (sys,pl) => pl.map(d=>String.fromCharCode(97+sys.plates.indexOf(d))).join('');
const dec = (sys,s) => [...s].map(c=>sys.plates[c.charCodeAt(0)-97]);
function encodeRound(game, sys, r){
  return game==='count' ? enc(sys,r.plates) : `${enc(sys,r.bar)}${r.add?'+':'-'}${enc(sys,[r.answer])}${r.visual?'*':''}`;
}
function decodeRound(game, sys, s){
  if(game==='count'){ const plates = dec(sys,s); return {plates, answer: total(sys,plates)}; }
  const m = /^([a-g]+)([+-])([a-g])(\*?)$/.exec(s);
  if(!m) throw new Error('bad round '+s);
  const bar = dec(sys,m[1]), answer = dec(sys,m[3])[0], add = m[2]==='+';
  const A = total(sys,bar), B = +(A + (add?2:-2)*answer).toFixed(2);
  return {bar, A, B, answer, add, visual: m[4]==='*'};
}
function encodeDay(day){
  const out = {t: day.theme, l: day.level};
  for(const unit of Object.keys(SYS)){
    out[unit] = {};
    for(const game of Object.keys(GAMES)) out[unit][game] = day[unit][game].map(r=>encodeRound(game, SYS[unit], r)).join(' ');
  }
  return out;
}
function decodeDay(raw){
  const day = {theme: raw.t, level: raw.l};
  for(const unit of Object.keys(SYS)){
    day[unit] = {};
    for(const game of Object.keys(GAMES)) day[unit][game] = raw[unit][game].split(' ').map(s=>decodeRound(game, SYS[unit], s));
  }
  return day;
}

/* ---------------- lookup ---------------- */
// Frozen days from puzzles.js when present, generated ones after that.
const cache = new Map();
function dayFor(n){
  if(!cache.has(n)){
    const frozen = root.BENCHLE_PUZZLES && root.BENCHLE_PUZZLES[n-1];
    let day = null;
    if(frozen){ try{ day = decodeDay(frozen); }catch(e){ day = null; } }
    cache.set(n, day || buildDay(n));
  }
  return cache.get(n);
}

root.BenchleGen = {
  rngFor, pad, dateKey, EPOCH, puzzleNo, keyForPuzzle,
  SYS, KG_LOOK, IRON, MAX_PLATES, MAX_SLEEVE, fmtW, total, sleeveWidth, fits, isSorted,
  THEMES, THEME_IDS, themeForPuzzle, levelForPuzzle, GAMES,
  buildRounds, buildDay, encodeDay, decodeDay, dayFor
};
})(typeof window !== 'undefined' ? window : globalThis);
