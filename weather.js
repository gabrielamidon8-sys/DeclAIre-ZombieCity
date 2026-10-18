/* ================= weather =================
   The sky changes during a run: clear spells, overcast, rain, thunderstorms with lightning that strikes the street
   (and the zombies), fog, snow and blizzards, and sandstorms out in the desert. What you see depends on where you
   stand as well: rain turns to snow up north and in winter, to blowing sand in the desert; ash falls in the ash
   districts and embers drift through the burning ones; leaves blow around in fall and petals in spring.
   Everything eases in and out, so walking from one district into the next blends the weather smoothly.
   With "weather affects gameplay" on, fog, sand and blizzards shorten how far you can see, blizzards slow everyone
   down, wind pushes you, and lightning hits whatever is under it (water carries the shock).
   The wind is part of the weather: a breeze on a calm day, stronger in rain and overcast, a gale in storms, blizzards
   and sandstorms. Its direction wanders, and gusts roll across the city as a wave you can watch moving through the
   trees and the grass before it reaches you; litter, leaves, sand and snow skitter along the ground in front of it. */
const WXK = {
  clear: 'Clear', overcast: 'Overcast', rain: 'Rain', storm: 'Thunderstorm', fog: 'Fog', snow: 'Snow', blizzard: 'Blizzard', sand: 'Sandstorm', haze: 'Dust haze', ash: 'Ashfall', embers: 'Embers'
};
const WX = {
  kind: 'clear', local: 'clear', t: 30, rain: 0, snow: 0, sand: 0, ash: 0, fog: 0, storm: 0, leaves: 0, embers: 0, petals: 0, dark: 0,
  wind: 0.15, wbase: 0.15, wdir: 0.35, wx: 0.15, wy: 0.05, gust: 0, gA: 0, gf: 0, gT: 4, wet: 0, cover: 0, flash: 0, vis: 1, slow: 1, next: 4, strikes: [], bolts: [], label: 'Clear',
  gr: [0, 0, 0, 0], grT: [0, 0, 0, 0], sampleT: 0, river: 0, fireLv: 0, lastCam: null, splash: []
};
const WX_SEASON = [
  [['clear', 3], ['overcast', 2], ['rain', 3], ['storm', 1.3], ['fog', 1.2]],
  [['clear', 4], ['overcast', 1.5], ['rain', 1.4], ['storm', 2.4], ['fog', 0.5], ['sand', 0.8]],
  [['clear', 2.5], ['overcast', 2.5], ['rain', 3], ['storm', 1.4], ['fog', 2.2]],
  [['clear', 2.5], ['overcast', 2], ['snow', 3.5], ['blizzard', 1.5], ['fog', 1.3]]
];
function wxLevel() { return SET.weather === 'off' ? 0 : SET.weather === 'low' ? 0.45 : SET.weather === 'full' ? 1 : Q.wx * PERF.wxScale; }
function wxReset() {
  WX.kind = 'clear'; WX.t = 25 + Math.random() * 20; WX.strikes = []; WX.bolts = []; WX.flash = 0; WX.next = 5; WX.cover = 0; WX.splash = [];
  WX.rain = WX.snow = WX.sand = WX.ash = WX.fog = WX.storm = WX.leaves = WX.embers = WX.petals = WX.dark = WX.wet = 0;
  WX.gA = WX.gust = 0; WX.gT = 3; WXD.length = 0;
  if (SET.wxMode && SET.wxMode !== 'dynamic') WX.kind = SET.wxMode;
  else if (Math.random() < 0.35) WX.kind = 'overcast';
}
function wxNext() {
  if (SET.wxMode && SET.wxMode !== 'dynamic') { WX.kind = SET.wxMode; WX.t = 60; return; }
  const W8 = WX_SEASON[WORLD.season]; let tot = 0; for (const w of W8) if (w[0] !== WX.kind) tot += w[1];
  let r = Math.random() * tot, k = W8[0][0];
  for (const w of W8) { if (w[0] === WX.kind) continue; if (r < w[1]) { k = w[0]; break; } r -= w[1]; }
  WX.kind = k; WX.t = 45 + Math.random() * 60;
}
// the global weather as it looks where you are standing
function wxLocal(kind, bio, sea) {
  let k = kind;
  if (bio === 'desert') k = k === 'rain' || k === 'storm' ? 'sand' : k === 'snow' || k === 'blizzard' ? (sea === 3 ? 'snow' : 'sand') : k === 'fog' ? 'haze' : k;
  else if (bio === 'snow') k = k === 'rain' ? 'snow' : k === 'storm' || k === 'sand' ? 'blizzard' : k;
  else {
    if (sea === 3) k = k === 'rain' ? 'snow' : k === 'storm' ? 'blizzard' : k;
    else k = k === 'snow' ? 'rain' : k === 'blizzard' ? 'storm' : k;
    if (k === 'sand') k = 'haze';
  }
  return k;
}
function wxTargets(k, bio, sea) {
  const T = { rain: 0, snow: 0, sand: 0, ash: 0, fog: 0, storm: 0, leaves: 0, embers: 0, petals: 0, wind: 0.15, dark: 0 };
  switch (k) {
    case 'rain': T.rain = 0.75; T.wind = 0.35; T.dark = 0.22; T.fog = 0.08; break;
    case 'storm': T.rain = 1; T.storm = 1; T.wind = 0.8; T.dark = 0.42; break;
    case 'fog': T.fog = 0.85; T.wind = 0.06; T.dark = 0.1; break;
    case 'clear': T.wind = bio === 'desert' ? 0.24 : bio === 'snow' ? 0.22 : bio === 'city' || bio === 'chaos' ? 0.19 : 0.16; break;   // never quite still: a breeze
    case 'snow': T.snow = 0.7; T.wind = 0.25; T.dark = 0.1; break;
    case 'blizzard': T.snow = 1; T.wind = 1; T.fog = 0.55; T.dark = 0.22; break;
    case 'sand': T.sand = 1; T.wind = 1; T.dark = 0.15; break;
    case 'haze': T.sand = 0.28; T.wind = 0.45; break;
    case 'overcast': T.dark = 0.16; T.wind = 0.28; break;
  }
  if (bio === 'ash') { T.ash = 0.85; T.dark += 0.06; }
  if (bio === 'burning') T.embers = 1;
  if (sea === 2 && (bio === 'suburb' || bio === 'city' || bio === 'chaos' || bio === 'ruins')) T.leaves = 0.45 + T.wind * 0.5;
  if (sea === 0 && (bio === 'suburb' || bio === 'city')) T.petals = 0.4;
  if (bio === 'snow' && k === 'clear') T.snow = 0.12;
  return T;
}
const WX_LABEL = (k, bio) => bio === 'ash' && (k === 'clear' || k === 'overcast') ? WXK.ash : bio === 'burning' && k === 'clear' ? 'Smoke' : WXK[k] || 'Clear';

/* ---------- update ---------- */
function updWeather(dt, rdt) {
  const lv = wxLevel(), play = G.mode === 'play';
  WX.t -= dt; if (WX.t <= 0) wxNext();
  const x = G.p && G.mode !== 'title' ? G.p.x : cam.x, y = G.p && G.mode !== 'title' ? G.p.y : cam.y;
  const bio = bioAt(x, y), sea = WORLD.season, k = wxLocal(WX.kind, bio, sea);
  WX.local = k; WX.label = WX_LABEL(k, bio);
  const T = wxTargets(k, bio, sea), e = Math.min(1, rdt * 0.35);
  for (const key of ['rain', 'snow', 'sand', 'ash', 'fog', 'storm', 'leaves', 'embers', 'petals', 'dark']) WX[key] += (T[key] - WX[key]) * e;
  updWind(rdt, T.wind);
  WX.wet = clamp(WX.wet + (WX.rain > 0.3 ? rdt * 0.05 : -rdt * 0.02), 0, 1);
  const snowCity = WX.snow > 0.45 && bio !== 'snow' && !(sea === 3 && TEMPERATE[bio]);
  WX.cover = clamp(WX.cover + (snowCity ? rdt * 0.02 : -rdt * 0.03), 0, 0.8);
  // what the weather does to the game
  const gp = SET.wxPlay && lv > 0;
  WX.vis = gp ? 1 - Math.min(0.55, WX.fog * 0.42 + WX.sand * 0.4 + (WX.snow > 0.8 ? (WX.snow - 0.8) * WX.wbase * 1.5 : 0)) : 1;
  WX.slow = gp && WX.snow > 0.75 && WX.wbase > 0.7 ? 0.88 : 1;
  if (gp && play && G.p && (WX.sand > 0.5 || (WX.snow > 0.7 && WX.wbase > 0.7))) { G.p.extX += Math.cos(WX.wdir) * WX.wbase * 30; G.p.extY += Math.sin(WX.wdir) * WX.wbase * 30; }
  // lightning
  if (WX.flash > 0) WX.flash = Math.max(0, WX.flash - rdt * 3.2);
  if (WX.storm > 0.55 && lv > 0) { WX.next -= dt; if (WX.next <= 0) { WX.next = (3.5 + Math.random() * 6) / WX.storm; lightning(gp && play); } }
  for (const s of WX.strikes) { s.t -= dt; if (s.t <= 0 && !s.done) { s.done = true; strike(s); } }
  WX.strikes = WX.strikes.filter(s => !s.done);
  for (const b of WX.bolts) b.life -= rdt; WX.bolts = WX.bolts.filter(b => b.life > 0);
  // ambience: listen for nearby water and fire twice a second
  WX.sampleT -= rdt;
  if (WX.sampleT <= 0) {
    WX.sampleT = 0.5;
    let wn = 0; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; if (isWater(waterAt(x + Math.cos(a) * 140, y + Math.sin(a) * 140))) wn++; if (isWater(waterAt(x + Math.cos(a) * 280, y + Math.sin(a) * 280))) wn += 0.5; }
    WX.river = Math.min(1, wn / 7);
    let fd = 1e9; for (const f of WD.fires) { const d = Math.hypot(f.x - x, f.y - y); if (d < fd) fd = d; }
    WX.fireLv = fd < 600 ? (1 - fd / 600) : 0;
    SFX.setEnv(bio);
  }
  if (lv > 0) {
    const bio2 = WORLD.cur ? WORLD.cur.bio : 'city', town = bio2 === 'city' || bio2 === 'chaos' || bio2 === 'burning' || bio2 === 'ruins' || bio2 === 'ash';
    SFX.amb({
      rain: WX.rain, river: WX.river, fire: WX.fireLv, ash: WX.ash * 0.4,
      // a breeze is a soft hush; gusts swell it, storms and blizzards roar
      wind: clamp(0.1 + WX.wbase * 0.45 + WX.gust * 0.75 + WX.sand * 0.3 + WX.snow * WX.wbase * 0.3 + WX.storm * 0.2, 0, 1),
      windPitch: clamp(WX.wind, 0, 1.4),
      // wind whistling between buildings once it picks up
      whistle: town ? clamp((WX.wind - 0.45) * 1.4, 0, 1) : clamp((WX.wind - 0.7) * 0.8, 0, 0.5),
      hum: town && bio2 !== 'ruins' ? (bio2 === 'city' ? 0.5 : 0.3) : 0,
      bugs: (bio2 === 'suburb' || bio2 === 'desert') && WORLD.season !== 3 && WX.rain < 0.2 && WX.wind < 0.6 ? (bio2 === 'desert' ? 0.6 : 0.4) : 0
    });
  } else SFX.amb(null);
  // the far-off sounds of the world play whatever the weather setting
  ambienceTick(rdt, WORLD.cur ? WORLD.cur.bio : 'city');
}
/* ---------- ambience ---------- */
// Every few seconds something happens somewhere out of sight: a siren across downtown, a dog in the suburbs, crows
// over the ruins, a coyote in the desert, wolves and cracking ice up north. Each district has its own list, the
// weather and season trim it (no birdsong in a storm, frogs only by a river in spring and summer), and each sound
// comes from a random side at its own distance. Gusts bring their own: leaves rushing through nearby trees, a loose
// sign rattling in town, sand or snow hissing past.
const AMBI = { t: 3, gust: 0 };
const AMB_LIST = {
  city: [['siren', 3], ['horn', 2], ['heli', 1], ['gunfar', 2], ['eas', 1], ['glass', 2], ['dog', 1], ['moan', 2], ['bird', 1.5], ['creak', 1]],
  chaos: [['siren', 4], ['gunfar', 4], ['heli', 2], ['boomfar', 2], ['horn', 2], ['glass', 2], ['eas', 1], ['moan', 2]],
  burning: [['creak', 3], ['collapse', 2], ['glass', 2], ['boomfar', 2], ['siren', 1], ['moan', 1]],
  ruins: [['crow', 3], ['metal', 3], ['bellfar', 1], ['collapse', 1], ['creak', 2], ['moan', 2], ['dog', 1]],
  ash: [['crow', 2], ['metal', 2], ['creak', 1], ['moan', 1], ['bellfar', 1]],
  suburb: [['dog', 4], ['bird', 4], ['chime', 2], ['crow', 1], ['branch', 1], ['siren', 1], ['moan', 1], ['frog', 2]],
  desert: [['coyote', 3], ['hawk', 3], ['rattle', 1], ['gunfar', 1], ['dog', 0.5], ['metal', 1]],
  snow: [['wolf', 3], ['ice', 2], ['branch', 3], ['crow', 2], ['creak', 1]]
};
function ambOk(k, bio) {
  const sea = WORLD.season, wet = WX.rain > 0.3 || WX.storm > 0.3 || WX.snow > 0.6 || WX.sand > 0.4;
  switch (k) {
    case 'bird': return !wet && WX.wbase < 0.6 && sea !== 3;
    case 'frog': return WX.river > 0.05 && (sea === 0 || sea === 1) && WX.snow < 0.2;
    case 'chime': return WX.wind > 0.12;
    case 'crow': return bio !== 'suburb' || sea >= 2;
    case 'branch': return bio === 'snow' || sea === 3;
    case 'rattle': return sea === 1 || sea === 0;
    case 'metal': return bio !== 'desert' || WX.wind > 0.3;   // out in the desert it's the windmill turning
    case 'coyote': case 'wolf': case 'hawk': return WX.storm < 0.5 && WX.sand < 0.6 && WX.snow < 0.85;
  }
  return true;
}
function ambienceTick(rdt, bio) {
  if (!SFX.ambEvent || G.mode === 'intro') return;
  // gusts: when one reaches you
  const g = WX.gust, thr = 0.1 + WX.wbase * 0.3;
  if (g > thr && AMBI.gust <= thr) {
    const ca = Math.cos(WX.wdir), pan = clamp(-ca * 0.8, -0.9, 0.9);
    if (bio === 'desert') SFX.ambEvent('sandgust', pan, 0.4 + g * 0.6, 0.2, true);
    else if (bio === 'snow' || WX.snow > 0.3) SFX.ambEvent('snowgust', pan, 0.4 + g * 0.6, 0.2, true);
    else {
      let trees = 0; for (const d of WD.act) if ((d.k === 'tree' || d.k === 'bush') && Math.abs(d.x - cam.x) < 380 && Math.abs(d.y - cam.y) < 300) trees++;
      if (trees > 2 && !(WORLD.season === 3 && TEMPERATE[bio])) SFX.ambEvent('leaves', pan, Math.min(0.8, 0.2 + trees * 0.03 + g * 0.5), 0.1, true);
      else if (bio !== 'suburb' && Math.random() < 0.6) SFX.ambEvent('clatter', rand(-0.8, 0.8), 0.35 + g * 0.4, 0.3);
      if (bio === 'suburb' && Math.random() < 0.3) setTimeout(() => SFX.ambEvent('chime', rand(-0.7, 0.7), 0.4 + g * 0.4, 0.15), 400);
    }
  }
  AMBI.gust = g;
  AMBI.t -= rdt; if (AMBI.t > 0) return;
  // busier downtown and in the chaos, quieter out in the snow; a storm drowns most of it out
  const busy = bio === 'chaos' ? 0.55 : bio === 'city' ? 0.75 : bio === 'snow' || bio === 'ash' ? 1.3 : 1;
  AMBI.t = (4 + Math.random() * 7) * busy * (1 + WX.storm * 0.8 + WX.sand * 0.6);
  const L = (AMB_LIST[bio] || AMB_LIST.city).filter(e => ambOk(e[0], bio)); if (!L.length) return;
  let tot = 0; for (const e of L) tot += e[1];
  let r = Math.random() * tot, k = L[0][0]; for (const e of L) { r -= e[1]; if (r <= 0) { k = e[0]; break; } }
  const far = k === 'rattle' || k === 'branch' || k === 'chime' ? rand(0, 0.3) : rand(0.25, 0.85), vol = (1 - far * 0.55) * rand(0.5, 0.9);
  SFX.ambEvent(k, rand(-0.85, 0.85), vol, far, k === 'heli');
}
/* ---------- wind ---------- */
// WX.wbase is how hard the weather blows (eased in and out); WX.wind is that plus the gust passing over you right now.
// A gust is a band of stronger wind that sweeps along the wind's direction at a few hundred pixels a second.
function updWind(rdt, target) {
  WX.wbase += (target - WX.wbase) * Math.min(1, rdt * 0.35);
  const ca = Math.cos(WX.wdir), sa = Math.sin(WX.wdir), camS = cam.x * ca + cam.y * sa;
  WX.gT -= rdt;
  if (WX.gT <= 0) {
    // the next gust: stronger and more often when it is already windy
    WX.gA = (0.3 + Math.random() * 0.7) * (0.12 + WX.wbase * 0.75);
    WX.gf = camS - 1300 - Math.random() * 500;
    WX.gT = (4 + Math.random() * 10) / (0.6 + WX.wbase);
  }
  WX.gf += (300 + WX.wbase * 320) * rdt;
  const dc = camS - WX.gf;
  WX.gust = WX.gA * Math.exp(-dc * dc / (2 * 360 * 360));
  if (-dc > 1800) WX.gA = 0;
  // the wind itself breathes a little, and swings round slowly (a touch faster in a storm)
  WX.wind = WX.wbase * (0.86 + 0.14 * Math.sin(G.time * 0.7) * Math.sin(G.time * 1.9 + 1)) + WX.gust * 0.9;
  WX.wdir += (Math.sin(G.time * 0.031) * 0.012 + Math.sin(G.time * 0.17 + 2) * 0.006 * (1 + WX.storm * 2)) * rdt;
  WX.wx = Math.cos(WX.wdir) * WX.wind; WX.wy = Math.sin(WX.wdir) * WX.wind;
  updWindDebris(rdt);
}
// how strongly the wind moves something standing at (x, y) right now (0 calm, about 1 a strong wind, more in a gust):
// the steady wind ripples through in waves, and a gust is a brighter band moving along with it
function windAt(x, y) {
  const s = x * Math.cos(WX.wdir) + y * Math.sin(WX.wdir), ripple = 0.5 + 0.5 * Math.sin(G.time * 1.8 - s * 0.0105);
  let k = WX.wbase * (0.5 + 0.5 * ripple);
  if (WX.gA > 0.01) { const d = s - WX.gf; if (d > -1100 && d < 1100) k += WX.gA * Math.exp(-d * d / (2 * 360 * 360)) * 1.3; }
  return k;
}
function windWord(w) { return w < 0.1 ? 'Calm' : w < 0.32 ? 'Breeze' : w < 0.58 ? 'Windy' : w < 0.85 ? 'Strong wind' : 'Gale'; }
// things the wind pushes along the ground near you: paper and plastic bags in town, leaves in the suburbs and in fall,
// tumbleweeds and sand puffs in the desert, snow snakes up north, swirls of ash. Purely for looks, and local.
const WXD = [];
function updWindDebris(rdt) {
  const lv = wxLevel(); if (!lv || G.mode === 'intro') { WXD.length = 0; return; }
  const bio = WORLD.cur ? WORLD.cur.bio : 'city', sea = WORLD.season, max = Math.round((SET.life === false ? 0 : 26) * Math.min(1, lv + 0.2));
  const ca = Math.cos(WX.wdir), sa = Math.sin(WX.wdir), hw = W / ZOOM / 2 + 80, hh = H / ZOOM / 2 + 80;
  // new pieces come in from the upwind edge of the view, more of them the harder it blows
  if (WXD.length < max && Math.random() < rdt * (0.4 + WX.wind * 6)) {
    const kind = bio === 'desert' ? (Math.random() < 0.12 ? 'weed' : 'puff') : bio === 'snow' || (sea === 3 && TEMPERATE[bio]) ? 'snake' : bio === 'ash' ? 'ashw' : bio === 'suburb' || sea === 2 ? (Math.random() < 0.8 ? 'leaf' : 'paper') : bio === 'burning' ? (Math.random() < 0.5 ? 'ashw' : 'paper') : (Math.random() < 0.75 ? 'paper' : 'bag');
    const side = (Math.random() - 0.5) * 2;
    const x = cam.x - ca * hw * 1.05 - sa * side * hh, y = cam.y - sa * hh * 1.05 + ca * side * hw;
    WXD.push({ k: kind, x: x, y: y, vx: 0, vy: 0, a: Math.random() * TAU, va: 0, t: 0, s: 0.7 + Math.random() * 0.6, ph: Math.random() * 10, c: Math.floor(Math.random() * 4) });
  }
  // on a calm hot day out in the desert, now and then a dust devil wanders across
  if (bio === 'desert' && WX.sand < 0.4 && WX.rain < 0.1 && WX.wbase < 0.45 && Math.random() < rdt * 0.03 && !WXD.some(d => d.k === 'devil')) {
    const a = Math.random() * TAU; WXD.push({ k: 'devil', x: cam.x + Math.cos(a) * hw * 0.7, y: cam.y + Math.sin(a) * hh * 0.7, vx: 0, vy: 0, a: 0, va: 0, t: 0, s: 0.8 + Math.random() * 0.5, ph: 0, c: 0, life: 9 + Math.random() * 6 });
  }
  for (let i = WXD.length - 1; i >= 0; i--) {
    const d = WXD[i];
    if (d.k === 'devil') { d.t += rdt; d.ph += rdt; d.x += (ca * 30 + Math.sin(d.t * 0.7) * 22) * rdt; d.y += (sa * 30 + Math.cos(d.t * 0.5) * 22) * rdt; if (d.t > d.life) WXD.splice(i, 1); continue; }
    const w = windAt(d.x, d.y), sp = (d.k === 'weed' ? 150 : d.k === 'snake' || d.k === 'puff' ? 230 : 120) * w * d.s;
    d.t += rdt; d.ph += rdt * (2 + w * 4);
    // carried along in skips and tumbles, with a little wobble across the wind
    const hop = d.k === 'paper' || d.k === 'leaf' || d.k === 'bag' ? 0.55 + 0.45 * Math.max(0, Math.sin(d.ph * 1.7)) : 1;
    d.vx += (ca * sp * hop - d.vx) * Math.min(1, rdt * 3) + (-sa) * Math.sin(d.ph * 0.9) * 18 * rdt;
    d.vy += (sa * sp * hop - d.vy) * Math.min(1, rdt * 3) + ca * Math.sin(d.ph * 0.9) * 18 * rdt;
    d.x += d.vx * rdt; d.y += d.vy * rdt; d.a += (d.k === 'weed' ? sp / 14 : sp / 40 * Math.sin(d.ph)) * rdt;
    if (blocked(d.x, d.y, 4)) { d.vx *= -0.3; d.vy *= -0.3; d.x += d.vx * rdt * 2; d.y += d.vy * rdt * 2; }
    if (Math.abs(d.x - cam.x) > hw * 1.3 || Math.abs(d.y - cam.y) > hh * 1.3 || d.t > 30) WXD.splice(i, 1);
  }
}
function drawWindDebris(vis) {
  if (!WXD.length) return;
  for (const d of WXD) {
    if (!vis(d.x, d.y, 20)) continue;
    const sh = SET.life === false ? 0 : 1; if (!sh) continue;
    switch (d.k) {
      case 'paper': ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a); ctx.scale(1, 0.4 + 0.6 * Math.abs(Math.sin(d.ph))); ctx.fillStyle = ['#d9d4c6', '#e8e2d4', '#c9c0a8', '#b8c4cc'][d.c]; ctx.fillRect(-4, -3, 8, 6); ctx.restore(); break;
      case 'bag': ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a); ctx.globalAlpha = 0.8; ctx.fillStyle = ['#e8e8e8', '#d8d0c0', '#c03a2e', '#3a3a3a'][d.c]; ctx.beginPath(); ctx.ellipse(0, 0, 6, 4 + 2 * Math.sin(d.ph * 3), 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.restore(); break;
      case 'leaf': ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a); ctx.fillStyle = WORLD.season === 2 ? ['#c9762a', '#a8442a', '#e0a83a', '#8a5a2a'][d.c] : ['#4f7a34', '#6a8a3a', '#8a7a34', '#3a5a2a'][d.c]; ctx.beginPath(); ctx.ellipse(0, 0, 3.6, 1.2 + 1.6 * Math.abs(Math.sin(d.ph * 2)), 0, 0, TAU); ctx.fill(); ctx.restore(); break;
      case 'weed': {
        ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a); ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 1.2; const r = 11 * d.s;
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(4, 6, r, r * 0.6, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a + 0.8) * r * 0.6, Math.sin(a + 0.8) * r * 0.6, Math.cos(a) * r, Math.sin(a) * r); } ctx.arc(0, 0, r * 0.85, 0, TAU); ctx.stroke(); ctx.restore(); break;
      }
      case 'puff': { const r = 14 + d.t * 10, a = Math.max(0, 0.22 - d.t * 0.07); if (a <= 0) break; ctx.globalAlpha = a; ctx.drawImage(glowSprite('#c79a5a'), d.x - r, d.y - r * 0.6, r * 2, r * 1.2); ctx.globalAlpha = 1; break; }
      case 'snake': { const l = 26 * d.s, ca = Math.cos(WX.wdir), sa = Math.sin(WX.wdir), a = Math.min(1, d.t * 2) * 0.5; ctx.strokeStyle = 'rgba(245,250,255,' + a.toFixed(2) + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(d.x - ca * l, d.y - sa * l); ctx.quadraticCurveTo(d.x - sa * 4 * Math.sin(d.ph * 3), d.y + ca * 4 * Math.sin(d.ph * 3), d.x, d.y); ctx.stroke(); ctx.lineCap = 'butt'; break; }
      case 'devil': {
        const f = Math.min(1, d.t / 2, (d.life - d.t) / 2); if (f <= 0) break;
        ctx.fillStyle = 'rgba(0,0,0,' + (0.12 * f).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(d.x + 6, d.y + 8, 22 * d.s, 10 * d.s, 0, 0, TAU); ctx.fill();
        for (let k = 0; k < 16; k++) { const a = d.ph * (7 - k * 0.25) + k * 0.8, r = (3 + k * 1.7) * d.s, h = k * 2.6 * d.s, pr = (6 + k * 0.9) * d.s; ctx.globalAlpha = f * (0.38 - k * 0.016); ctx.drawImage(glowSprite('#efdcb4'), d.x + Math.cos(a) * r - pr, d.y + Math.sin(a) * r * 0.5 - h - pr * 0.7, pr * 2, pr * 1.4); }
        // a thin spiral of grit so it reads as turning
        ctx.globalAlpha = f * 0.45; ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 1; ctx.beginPath();
        for (let k = 0; k < 24; k++) { const a = d.ph * 6 + k * 0.55, r = (2 + k * 1.1) * d.s, px = d.x + Math.cos(a) * r, py = d.y + Math.sin(a) * r * 0.5 - k * 1.7 * d.s; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke(); ctx.globalAlpha = 1; break;
      }
      case 'ashw': { ctx.fillStyle = 'rgba(150,150,154,0.5)'; for (let k = 0; k < 4; k++) { const a = d.ph * 2 + k * 1.6, r = 4 + k * 2; ctx.fillRect(d.x + Math.cos(a) * r, d.y + Math.sin(a) * r * 0.6, 2, 2); } break; }
    }
  }
}
// fast faint streaks across the screen when the wind is strong
function drawWindStreaks(rdt, mx, my) {
  if (WX.wind < 0.45 || wxLevel() < 0.4) return;
  const P = pool('streak', 18), k = Math.min(1, (WX.wind - 0.45) * 1.6), n = Math.floor(P.max * k), ca = Math.cos(WX.wdir), sa = Math.sin(WX.wdir), sc = Math.min(W, H) / 480, sp = (600 + WX.wind * 700) * sc;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    P.x[i] += ca * sp * P.z[i] * rdt - mx; P.y[i] += sa * sp * P.z[i] * rdt - my; P.r[i] += rdt;
    if (P.x[i] < -200 || P.x[i] > W + 200 || P.y[i] < -200 || P.y[i] > H + 200 || P.r[i] > 2.2) { P.r[i] = 0; P.x[i] = ca > 0 ? -150 - Math.random() * 100 : W + 150 + Math.random() * 100; P.y[i] = Math.random() * H; if (Math.abs(sa) > 0.7) { P.x[i] = Math.random() * W; P.y[i] = sa > 0 ? -150 : H + 150; } }
    const l = (36 + 60 * P.z[i]) * sc, a = 0.12 * k * Math.sin(Math.min(1, P.r[i] / 2.2) * Math.PI);
    ctx.strokeStyle = 'rgba(230,236,242,' + a.toFixed(3) + ')'; ctx.lineWidth = 1 + P.z[i];
    ctx.beginPath(); ctx.moveTo(P.x[i], P.y[i]); ctx.quadraticCurveTo(P.x[i] - ca * l * 0.5 - sa * 3, P.y[i] - sa * l * 0.5 + ca * 3, P.x[i] - ca * l, P.y[i] - sa * l); ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
function lightning(canStrike) {
  const rf = SET.flash;   // reduce flashing
  WX.flash = rf ? 0.28 : 1;
  const strikeIt = canStrike && Math.random() < 0.6;
  if (!strikeIt) { SFX.thunder(0.7 + Math.random() * 1.8, false); WX.bolts.push(skyBolt()); return; }
  // pick a spot: usually a zombie on screen, never right on top of the player
  const p = G.p, hw = W / ZOOM / 2, hh = H / ZOOM / 2;
  let tx = 0, ty = 0, ok = false;
  const vis = G.zs.filter(z => !z.dead && !z.fly && Math.abs(z.x - cam.x) < hw && Math.abs(z.y - cam.y) < hh && Math.hypot(z.x - p.x, z.y - p.y) > 110);
  if (vis.length && Math.random() < 0.75) { const z = pick(vis); tx = z.x; ty = z.y; ok = true; }
  for (let i = 0; i < 8 && !ok; i++) { tx = cam.x + rand(-hw, hw) * 0.9; ty = cam.y + rand(-hh, hh) * 0.9; if (Math.hypot(tx - p.x, ty - p.y) > 140) ok = true; }
  if (!ok) return;
  WX.strikes.push({ x: tx, y: ty, t: 0.75, max: 0.75 });
  SFX.static();
}
function strike(s) {
  const x = s.x, y = s.y, R = 78, p = G.p;
  WX.flash = SET.flash ? 0.3 : 1; WX.bolts.push(groundBolt(x, y));
  SFX.thunder(0.05, true); shakeIt(12); buzz(60);
  burst(x, y, 22, '#dff0ff', 320, 3, 0.4); burst(x, y, 10, '#ffffff', 200, 2, 0.25);
  ring(x, y, 6, R, 0.35, '210,230,255', 5); ring(x, y, 4, R * 1.8, 0.6, '160,200,255', 2);
  splat(x, y, 26, 'rgba(10,10,14,0.65)');
  near(x, y, R + 20, z => { if (z.dead) return; const d = Math.hypot(z.x - x, z.y - y); if (d < R + z.r) { hurtZombie(z, (85 + G.wave * 12) * (z.boss ? 0.4 : 1), { src: 'blast' }); if (!z.dead && !z.boss) { z.stun = Math.max(z.stun, 0.6); z.burnT = 2; z.burnDps = Math.max(z.burnDps || 0, 6 + G.wave); } } });
  if (p && G.mode === 'play' && Math.hypot(p.x - x, p.y - y) < 62) hurtPlayer(14);
  // water carries the shock
  if (isWater(waterAt(x, y))) {
    ring(x, y, 10, 240, 0.5, '140,200,255', 3);
    near(x, y, 250, z => { if (!z.dead && z.inW && Math.hypot(z.x - x, z.y - y) < 250) { hurtZombie(z, (50 + G.wave * 6) * (z.boss ? 0.4 : 1), { src: 'blast' }); if (!z.dead) z.stun = Math.max(z.stun, 0.8); bolt(x, y, z.x, z.y, '#bfe0ff'); } });
    if (p && G.mode === 'play' && isWater(waterAt(p.x, p.y)) && Math.hypot(p.x - x, p.y - y) < 250) { hurtPlayer(10); bolt(x, y, p.x, p.y, '#bfe0ff'); }
  }
  worldBlast(x, y, R * 1.4, null);
}
function jag(x0, y0, x1, y1, n, amp) {
  const pts = [x0, y0];
  for (let i = 1; i < n; i++) { const t = i / n; pts.push(x0 + (x1 - x0) * t + rand(-amp, amp), y0 + (y1 - y0) * t + rand(-amp, amp) * 0.4); }
  pts.push(x1, y1); return pts;
}
function groundBolt(x, y) {
  const top = cam.y - H / ZOOM / 2 - 60, main = jag(x + rand(-80, 80), top, x, y, 12, 26), br = [];
  for (let i = 0; i < 3; i++) { const k = 2 + Math.floor(Math.random() * 7) * 2, bx = main[k], by = main[k + 1]; br.push(jag(bx, by, bx + rand(-90, 90), by + rand(30, 120), 5, 14)); }
  return { main: main, br: br, life: 0.32, max: 0.32, gx: x, gy: y };
}
function skyBolt() {
  // a flash far off: a thin bolt in the distance at the top of the screen
  const x = cam.x + rand(-W / ZOOM / 2, W / ZOOM / 2), top = cam.y - H / ZOOM / 2 - 20;
  return { main: jag(x, top, x + rand(-60, 60), top + rand(80, 180), 8, 18), br: [], life: 0.2, max: 0.2, far: true };
}

/* ---------- drawing ---------- */
// on the ground, before anything stands on it: wet streets, a dusting of snow, warning circles for strikes
let SNOWPAT = null, FOGTEX = null;
function snowPattern() {
  if (SNOWPAT) return SNOWPAT;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  for (let i = 0; i < 220; i++) { g.fillStyle = 'rgba(235,242,248,' + (0.2 + Math.random() * 0.5) + ')'; g.beginPath(); g.ellipse(Math.random() * 256, Math.random() * 256, 4 + Math.random() * 18, 3 + Math.random() * 10, Math.random() * 3, 0, TAU); g.fill(); }
  SNOWPAT = ctx.createPattern(c, 'repeat'); return SNOWPAT;
}
function drawWeatherGround(x0, y0, x1, y1) {
  const lv = wxLevel(); if (!lv) return;
  if (WX.wet > 0.02) { ctx.fillStyle = 'rgba(16,26,40,' + (WX.wet * 0.22).toFixed(3) + ')'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); }
  if (WX.cover > 0.02 && lv > 0.4) { ctx.globalAlpha = WX.cover * 0.75; ctx.fillStyle = snowPattern(); ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.globalAlpha = 1; }
  for (const s of WX.strikes) {
    const f = 1 - s.t / s.max, a = 0.25 + f * 0.6;
    ctx.strokeStyle = 'rgba(190,220,255,' + a + ')'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -G.time * 60;
    ctx.beginPath(); ctx.arc(s.x, s.y, 78 * (1.2 - f * 0.2), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(190,220,255,' + (0.06 + f * 0.12) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, 78, 0, TAU); ctx.fill();
    if (Math.random() < 0.4) bolt(s.x + rand(-40, 40), s.y + rand(-40, 40), s.x + rand(-40, 40), s.y + rand(-40, 40), '#cfe4ff');
  }
}
// lightning bolts in the world
function drawWeatherWorld() {
  if (!WX.bolts.length) return;
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const b of WX.bolts) {
    const a = clamp(b.life / b.max, 0, 1), fl = Math.random() < 0.3 ? 0.5 : 1;
    const line = (pts, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
    ctx.globalAlpha = a * fl * (b.far ? 0.5 : 1);
    line(b.main, b.far ? 4 : 10, 'rgba(120,160,255,0.35)'); line(b.main, b.far ? 1.5 : 3.5, '#eef4ff');
    for (const br of b.br) { line(br, 4, 'rgba(120,160,255,0.3)'); line(br, 1.4, '#dfe9ff'); }
    if (b.gx != null) { const r = 90; ctx.drawImage(glowSprite('#bcd6ff'), b.gx - r, b.gy - r, r * 2, r * 2); }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.lineJoin = 'miter';
}
// screen-space particles: rain, snow, sand, ash, leaves, petals and embers
const WXP = {};
function pool(name, max) {
  let P = WXP[name];
  if (!P) { P = WXP[name] = { x: new Float32Array(max), y: new Float32Array(max), z: new Float32Array(max), r: new Float32Array(max), n: 0, max: max }; for (let i = 0; i < max; i++) { P.x[i] = Math.random() * W; P.y[i] = Math.random() * H; P.z[i] = 0.4 + Math.random() * 0.6; P.r[i] = Math.random() * TAU; } }
  return P;
}
function drawWeatherScreen(rdt) {
  const lv = wxLevel();
  const lc = WX.lastCam || (WX.lastCam = { x: cam.x, y: cam.y }), mx = (cam.x - lc.x) * ZOOM, my = (cam.y - lc.y) * ZOOM; lc.x = cam.x; lc.y = cam.y;
  const jump = Math.abs(mx) > W || Math.abs(my) > H;
  const dt = Math.min(0.05, rdt);
  if (lv > 0) {
    const sc = Math.min(W, H) / 480;
    // rain
    if (WX.rain > 0.02) {
      const P = pool('rain', 520), n = Math.floor(P.max * WX.rain * lv), wx = WX.wx * 260, vy = 900 * sc;
      for (let i = 0; i < n; i++) {
        P.x[i] += (wx * P.z[i]) * dt - mx * P.z[i]; P.y[i] += vy * P.z[i] * dt - my * P.z[i];
        if (P.y[i] > H + 30 || jump) { P.y[i] = -30 - Math.random() * 60; P.x[i] = Math.random() * (W + 200) - 100; }
        if (P.x[i] < -100) P.x[i] += W + 200; else if (P.x[i] > W + 100) P.x[i] -= W + 200;
      }
      const ln = 0.024;
      for (const pass of [0, 1]) {
        ctx.strokeStyle = pass ? 'rgba(200,215,235,0.42)' : 'rgba(170,190,215,0.22)'; ctx.lineWidth = pass ? 1.5 : 1; ctx.beginPath();
        for (let i = 0; i < n; i++) { if ((P.z[i] > 0.7) !== !!pass) continue; const z = P.z[i]; ctx.moveTo(P.x[i], P.y[i]); ctx.lineTo(P.x[i] - wx * z * ln, P.y[i] - vy * z * ln); }
        ctx.stroke();
      }
      // splashes on the ground
      const S = WX.splash;
      for (let k = Math.random() < WX.rain * lv * 0.9 ? 2 : 0; k > 0; k--) if (S.length < 50) S.push({ x: Math.random() * W, y: Math.random() * H, t: 0 });
      ctx.strokeStyle = 'rgba(190,210,230,0.35)'; ctx.lineWidth = 1; ctx.beginPath();
      for (const s of S) { s.t += dt; s.x -= mx; s.y -= my; const r = 1 + s.t * 18; ctx.moveTo(s.x + r, s.y); ctx.ellipse(s.x, s.y, r, r * 0.5, 0, 0, TAU); }
      ctx.stroke();
      WX.splash = S.filter(s => s.t < 0.3);
    }
    // snow
    if (WX.snow > 0.02) {
      const P = pool('snow', 420), n = Math.floor(P.max * WX.snow * lv), wx = WX.wx * 220, vy = 70 * sc + WX.wind * 60;
      for (let i = 0; i < n; i++) {
        P.r[i] += dt * (0.8 + P.z[i]);
        P.x[i] += (wx * P.z[i] + Math.sin(P.r[i]) * 18) * dt - mx * P.z[i]; P.y[i] += vy * P.z[i] * dt - my * P.z[i];
        if (P.y[i] > H + 10 || jump) { P.y[i] = -10 - Math.random() * 40; P.x[i] = Math.random() * W; }
        if (P.y[i] < -60) P.y[i] += H + 70;
        if (P.x[i] < -20) P.x[i] += W + 40; else if (P.x[i] > W + 20) P.x[i] -= W + 40;
      }
      for (const pass of [0, 1]) {
        ctx.fillStyle = pass ? 'rgba(245,250,255,0.85)' : 'rgba(225,235,245,0.45)'; ctx.beginPath();
        for (let i = 0; i < n; i++) { if ((P.z[i] > 0.72) !== !!pass) continue; const s = (pass ? 2.6 : 1.6) * P.z[i] * sc + 0.6; ctx.rect(P.x[i], P.y[i], s, s); }
        ctx.fill();
      }
    }
    // sand and dust
    if (WX.sand > 0.02) {
      const P = pool('sand', 300), n = Math.floor(P.max * WX.sand * lv), sp = 700 * sc * (0.4 + WX.wind), dx = Math.cos(WX.wdir), dy = Math.sin(WX.wdir) * 0.35;
      for (let i = 0; i < n; i++) {
        P.x[i] += dx * sp * P.z[i] * dt - mx * P.z[i]; P.y[i] += dy * sp * P.z[i] * dt - my * P.z[i];
        if (P.x[i] > W + 60) { P.x[i] = -60; P.y[i] = Math.random() * H; } else if (P.x[i] < -60) { P.x[i] = W + 60; P.y[i] = Math.random() * H; }
        if (P.y[i] > H + 20) P.y[i] -= H + 40; else if (P.y[i] < -20) P.y[i] += H + 40;
      }
      ctx.strokeStyle = 'rgba(225,190,130,0.4)'; ctx.lineWidth = 1.3; ctx.beginPath();
      for (let i = 0; i < n; i++) { const l = 18 * P.z[i] * (0.5 + WX.wind); ctx.moveTo(P.x[i], P.y[i]); ctx.lineTo(P.x[i] - dx * l, P.y[i] - dy * l); }
      ctx.stroke();
      // big dust clouds rolling through
      const C = pool('dust', 10), nc = Math.floor(10 * WX.sand * Math.min(1, lv + 0.3)), spr = glowSprite('#c79a5a');
      for (let i = 0; i < nc; i++) {
        C.x[i] += dx * sp * 0.5 * C.z[i] * dt - mx * 0.6; C.y[i] += dy * sp * 0.4 * dt - my * 0.6;
        if (C.x[i] > W + 300) { C.x[i] = -300; C.y[i] = Math.random() * H; } else if (C.x[i] < -300) { C.x[i] = W + 300; C.y[i] = Math.random() * H; }
        const r = 180 * C.z[i] * sc + 80; ctx.globalAlpha = 0.2 * WX.sand; ctx.drawImage(spr, C.x[i] - r, C.y[i] - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    }
    // falling ash
    if (WX.ash > 0.02) {
      const P = pool('ash', 260), n = Math.floor(P.max * WX.ash * lv), wx = WX.wx * 90;
      for (let i = 0; i < n; i++) {
        P.r[i] += dt * 1.3;
        P.x[i] += (wx + Math.sin(P.r[i]) * 22) * P.z[i] * dt - mx * P.z[i]; P.y[i] += 40 * sc * P.z[i] * dt - my * P.z[i];
        if (P.y[i] > H + 10 || jump) { P.y[i] = -10; P.x[i] = Math.random() * W; } if (P.y[i] < -60) P.y[i] += H + 70;
        if (P.x[i] < -20) P.x[i] += W + 40; else if (P.x[i] > W + 20) P.x[i] -= W + 40;
      }
      ctx.fillStyle = 'rgba(190,190,196,0.6)'; ctx.beginPath();
      for (let i = 0; i < n; i++) { const s = 2.6 * P.z[i] * sc; ctx.rect(P.x[i], P.y[i], s, s * 0.7); }
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,140,60,0.8)'; ctx.beginPath();
      for (let i = 0; i < n; i += 9) { if (Math.sin(P.r[i] * 3) > 0.3) ctx.rect(P.x[i], P.y[i], 2, 2); }
      ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    }
    // embers drifting up through the burning districts
    if (WX.embers > 0.02) {
      const P = pool('emb', 90), n = Math.floor(P.max * WX.embers * lv);
      for (let i = 0; i < n; i++) {
        P.r[i] += dt * 3;
        P.x[i] += (WX.wx * 120 + Math.sin(P.r[i]) * 30) * dt - mx * P.z[i]; P.y[i] += -60 * P.z[i] * dt - my * P.z[i];
        if (P.y[i] < -10 || jump) { P.y[i] = H + Math.random() * 40; P.x[i] = Math.random() * W; }
        if (P.y[i] > H + 60) P.y[i] -= H + 70;
        if (P.x[i] < -20) P.x[i] += W + 40; else if (P.x[i] > W + 20) P.x[i] -= W + 40;
      }
      ctx.globalCompositeOperation = 'lighter'; ctx.beginPath();
      for (let i = 0; i < n; i++) { const s = (1.4 + P.z[i] * 1.6) * (0.6 + 0.4 * Math.sin(P.r[i] * 2)); ctx.rect(P.x[i], P.y[i], s, s); }
      ctx.fillStyle = 'rgba(255,150,60,0.9)'; ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    }
    // leaves and petals tumbling across
    for (const kind of ['leaves', 'petals']) {
      const v = WX[kind]; if (v < 0.02) continue;
      const P = pool(kind, 60), n = Math.floor(P.max * v * lv), sp = 60 + WX.wind * 260;
      const cols = kind === 'leaves' ? ['#c9762a', '#a8442a', '#e0a83a', '#8a5a2a'] : ['#ffc0dc', '#ffe0ee', '#f7a8cc'];
      for (let i = 0; i < n; i++) {
        P.r[i] += dt * (2 + P.z[i] * 3);
        P.x[i] += (Math.cos(WX.wdir) * sp * P.z[i] + Math.sin(P.r[i]) * 30) * dt - mx * P.z[i]; P.y[i] += (Math.sin(WX.wdir) * sp * 0.4 + 30 + Math.cos(P.r[i] * 0.7) * 20) * P.z[i] * dt - my * P.z[i];
        if (P.x[i] > W + 20) { P.x[i] = -20; P.y[i] = Math.random() * H; } else if (P.x[i] < -20) { P.x[i] = W + 20; P.y[i] = Math.random() * H; }
        if (P.y[i] > H + 20) { P.y[i] = -20; P.x[i] = Math.random() * W; } else if (P.y[i] < -20) P.y[i] = H + 20;
        ctx.fillStyle = cols[i % cols.length];
        const s = (kind === 'leaves' ? 3.6 : 2.6) * (0.6 + P.z[i] * 0.6) * sc;
        ctx.beginPath(); ctx.ellipse(P.x[i], P.y[i], s, s * Math.abs(Math.sin(P.r[i])) * 0.6 + 0.6, P.r[i], 0, TAU); ctx.fill();
      }
    }
    drawWindStreaks(dt, mx, my);
    // fog: two layers of soft cloud drifting with the wind
    const fogOn = SET.fog === 'auto' ? Q.fog : SET.fog === 'on';
    if (WX.fog > 0.03 && fogOn) {
      const T = fogTex(), ts = 520 * sc;
      for (let L = 0; L < (lv > 0.5 ? 2 : 1); L++) {
        const k = L ? 1.35 : 1, ox = ((-(cam.x * ZOOM) * (L ? 0.9 : 1) - G.time * 14 * WX.wx * (L + 1) * 10) % (ts * k) + ts * k) % (ts * k), oy = ((-(cam.y * ZOOM) * (L ? 0.9 : 1) - G.time * 6 * (L + 1)) % (ts * k) + ts * k) % (ts * k);
        ctx.globalAlpha = Math.min(0.85, WX.fog * (L ? 0.38 : 0.5) * Math.min(1, lv + 0.3));
        for (let x = ox - ts * k; x < W; x += ts * k) for (let y = oy - ts * k; y < H; y += ts * k) ctx.drawImage(T, x, y, ts * k, ts * k);
      }
      ctx.globalAlpha = 1;
    }
  }
  // the sky over everything: storm darkness, the place's color, blowing sand and snow, folded into one fill
  const grade = SET.grade !== false, L = [];
  if (WX.dark > 0.02 && lv > 0) L.push([8, 12, 22, WX.dark * 0.55]);
  if (grade) {
    const bio = WORLD.cur ? WORLD.cur.bio : 'city', g = GRADE[bio] || GRADE.city, gr = WX.gr;
    const e = Math.min(1, rdt * 0.8); for (let i = 0; i < 4; i++) gr[i] += (g[i] - gr[i]) * e;
    if (gr[3] > 0.005) L.push([gr[0], gr[1], gr[2], gr[3]]);
    if (lv > 0 && WX.sand > 0.05) L.push([160, 112, 58, WX.sand * 0.16]);
    if (lv > 0 && WX.snow > 0.6 && WX.wind > 0.6) L.push([220, 230, 240, (WX.snow - 0.6) * WX.wind * 0.35]);
  }
  if (L.length) {
    let r = 0, gg = 0, bb = 0, keep = 1;
    for (const c of L) { const a = Math.min(1, c[3]); r = r * (1 - a) + c[0] * a; gg = gg * (1 - a) + c[1] * a; bb = bb * (1 - a) + c[2] * a; keep *= 1 - a; }
    const A = 1 - keep;
    if (A > 0.004) { ctx.fillStyle = 'rgba(' + Math.round(r / A) + ',' + Math.round(gg / A) + ',' + Math.round(bb / A) + ',' + A.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
  }
  // how far you can see in fog, sand and blizzards
  if (WX.vis < 0.98) {
    const k = 1 - WX.vis, col = WX.sand > WX.fog ? '120,84,44' : WX.snow > 0.5 ? '200,210,222' : '60,68,80';
    ctx.globalAlpha = Math.min(1, k * 1.5); ctx.drawImage(screenGrad('wxv' + col, 0.12, 0.5, col, 0.92), 0, 0, W, H); ctx.globalAlpha = 1;
  }
  // lightning lights up the whole screen
  if (WX.flash > 0.01) { ctx.fillStyle = 'rgba(225,235,255,' + (WX.flash * (Math.random() < 0.25 ? 0.25 : 0.55)).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
}
const GRADE = { city: [0, 0, 0, 0], burning: [255, 96, 30, 0.07], chaos: [255, 180, 60, 0.03], ruins: [120, 100, 80, 0.05], ash: [150, 150, 156, 0.13], suburb: [60, 120, 40, 0.025], desert: [255, 170, 80, 0.07], snow: [170, 205, 255, 0.07] };
function fogTex() {
  if (FOGTEX) return FOGTEX;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, r = 30 + Math.random() * 70;
    for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, 'rgba(200,208,218,0.22)'); gr.addColorStop(1, 'rgba(200,208,218,0)');
      g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
  FOGTEX = c; return c;
}
// the HUD line under the wave number: where you are and what the sky is doing
const WXH = { key: '' };
function updWhere() {
  const D = WORLD.cur; if (!D) return;
  const ww = windWord(WX.wbase), key = D.name + '|' + WX.label + '|' + WORLD.season + '|' + ww;
  if (key !== WXH.key) {
    WXH.key = key;
    const el = $('whereChip'); if (!el) return;
    el.textContent = '';
    const a = document.createElement('b'); a.textContent = D.name; a.style.color = BIO[D.bio].col;
    const b = document.createElement('span'); b.textContent = WX.label + ' · ';
    const ar = document.createElement('i'); ar.className = 'windArrow'; ar.textContent = '\u27a4'; ar.setAttribute('aria-hidden', 'true');
    const c = document.createElement('span'); c.textContent = ww + ' · ' + SEASONS[WORLD.season];
    b.append(ar, c); el.append(a, b); WXH.ar = ar; WXH.ang = null;
  }
  // the arrow turns with the wind
  if (WXH.ar && (WXH.ang == null || Math.abs(WX.wdir - WXH.ang) > 0.03)) { WXH.ang = WX.wdir; WXH.ar.style.transform = 'rotate(' + WX.wdir.toFixed(2) + 'rad)'; }
}
