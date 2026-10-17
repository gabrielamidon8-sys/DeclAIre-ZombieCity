/* ================= the world: districts, biomes, rivers, bridges and seasons =================
   The city never ends and is generated from a seed. It is split into districts a few blocks wide, each with its own
   name and character: downtown, burning, riot zones, destroyed, ash, suburbs, desert and the frozen north. The climate
   drifts slowly across the map, so deserts and snow sit in their own regions. Rivers wind through everything; roads
   cross them on bridges, and wading through the water slows you down (in the desert they are dry washes, in the north
   they are frozen). Anything you can bump into is identical on every device so the game plays the same everywhere;
   purely decorative detail scales with the device. */
const WM = 80, WC = 8, WF = WM + 1;                    // water mask: 80 x 80 cells of 8px per chunk, field on the corners
const DS = 4;                                          // district size, in chunks
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];
const WORLD = { seed: 0, dist: new Map(), dc: new Map(), season: 2, mix: 'mixed', start: null, cur: null, curT: 0, bannerT: -99, seen: new Set() };
const TEMPERATE = { city: 1, burning: 1, chaos: 1, ruins: 1, ash: 1, suburb: 1 };
const BIO = {
  city:    { name: 'City', road: '#17191d', walk: '#292c32', lot: '#222529', edge: '#3a3e45', col: '#29e6ff', roofs: ['#353a42', '#3e3b36', '#363e3b', '#433d35', '#343846', '#404249', '#3a3530'], water: ['#123039', '#0b2129', 'rgba(170,220,235,0.4)'], bank: '#2a2a24' },
  burning: { name: 'Burning city', road: '#1b1715', walk: '#2e2521', lot: '#261f1b', edge: '#4c3527', col: '#ff7a2b', roofs: ['#2a201b', '#33251e', '#3b2a20', '#2c2420', '#3e2c22', '#30241f'], water: ['#1d2a2a', '#121c1d', 'rgba(255,170,110,0.35)'], bank: '#2c221c' },
  chaos:   { name: 'Riot zone', road: '#18191c', walk: '#2b2c30', lot: '#232427', edge: '#3d3f44', col: '#ffb627', roofs: ['#353a42', '#3e3b36', '#433d35', '#343846', '#3d3a44', '#3a3530'], water: ['#132e36', '#0c2027', 'rgba(170,220,235,0.4)'], bank: '#2a2a24' },
  ruins:   { name: 'Destroyed city', road: '#1d1c1b', walk: '#2c2a27', lot: '#262420', edge: '#3d3933', col: '#c9b18a', roofs: ['#3a3631', '#413b33', '#36332f', '#4a4239', '#3c3934'], water: ['#1a2a2c', '#11201f', 'rgba(190,210,200,0.35)'], bank: '#2d2a24' },
  ash:     { name: 'Ash city', road: '#29292b', walk: '#3a3a3d', lot: '#333336', edge: '#4a4a4e', col: '#b9bcc2', roofs: ['#3d3d40', '#46464a', '#38383b', '#4d4d50', '#424245'], water: ['#25292b', '#1a1d1f', 'rgba(210,210,215,0.3)'], bank: '#3a3a3a' },
  suburb:  { name: 'Suburbs', road: '#1c1e21', walk: '#3a3d40', lot: '#24361f', edge: '#4a4d50', col: '#7dff4a', roofs: ['#5a2f2a', '#3d4a5a', '#4a4a3a', '#5b4636', '#33433a', '#6b5a45', '#4f3b3b'], water: ['#163a3c', '#0d2a2d', 'rgba(180,235,230,0.4)'], bank: '#33301f' },
  desert:  { name: 'Desert', road: '#3a3229', walk: '#5c4a33', lot: '#68543a', edge: '#7a6447', col: '#f2b45a', roofs: ['#8a6a48', '#7a5f42', '#9a7a55', '#6e5a44', '#85704f'], water: ['#1f4a48', '#153936', 'rgba(200,240,220,0.45)'], bank: '#4f4030' },
  snow:    { name: 'Frozen north', road: '#2c3137', walk: '#8e9aa4', lot: '#a2adb6', edge: '#b5c0c8', col: '#bfe6ff', roofs: ['#4a3a2e', '#3e4650', '#5a4535', '#38404a', '#4b3f36'], water: ['#9cc0d2', '#86aec3', 'rgba(255,255,255,0.6)'], bank: '#b9c5cd' }
};
const DNAMES = {
  city: [['Iron', 'Grand', 'Neon', 'Harbor', 'Union', 'Copper', 'Signal', 'Midtown', 'Crown', 'Liberty', 'Central', 'Steel', 'Echo', 'Granite'], ['Heights', 'Row', 'Square', 'District', 'Mile', 'Plaza', 'Quarter', 'Junction', 'Park', 'Avenue', 'Center', 'Terrace']],
  burning: [['Cinder', 'Blaze', 'Ember', 'Scorch', 'Inferno', 'Flare', 'Kindle', 'Furnace', 'Pyre', 'Smolder', 'Bonfire'], ['Row', 'Heights', 'Quarter', 'Yards', 'Point', 'Street', 'Block', 'Court', 'Ward']],
  chaos: [['Riot', 'Barricade', 'Checkpoint', 'Siren', 'Breakdown', 'Lockdown', 'Panic', 'Mayhem', 'Curfew', 'Uprising'], ['Square', 'Blocks', 'Street', 'Strip', 'Market', 'Crossing', 'Zone', 'Lane']],
  ruins: [['Fallen', 'Broken', 'Shattered', 'Crater', 'Hollow', 'Rubble', 'Collapse', 'Splinter', 'Wreck'], ['Spires', 'Ward', 'Blocks', 'Heights', 'Reach', 'Field', 'Gate', 'Point']],
  ash: [['Ash', 'Grey', 'Soot', 'Cinder', 'Pale', 'Dust', 'Smoke', 'Gloam', 'Wither'], ['fall', 'haven', 'Hollow', 'Vale', 'Town', 'Reach', 'End', 'Mire']],
  suburb: [['Maple', 'Oak', 'Willow', 'Cedar', 'Birch', 'Elm', 'Aspen', 'Pine', 'Sycamore', 'Juniper', 'Linden'], ['Grove', 'Hills', 'Park', 'Lane', 'Gardens', 'Meadows', 'Court', 'Hollow', 'Ridge']],
  desert: [['Dust', 'Red', 'Sun', 'Bone', 'Mirage', 'Rattler', 'Dry', 'Scorpion', 'Copper', 'Buzzard', 'Sidewinder'], ['Gulch', 'Mesa', 'Flats', 'Canyon', 'Wash', 'Springs', 'Ridge', 'Basin', 'Bluff']],
  snow: [['Frost', 'White', 'Glacier', 'Ice', 'Winter', 'North', 'Snow', 'Polar', 'Rime', 'Hoar'], ['mere', 'Pines', 'Bay', 'Ridge', 'Peak', 'Hollow', 'Falls', 'Point', 'Hold']]
};

/* ---------- seeded gradient noise ---------- */
const NP = new Uint8Array(512), NGX = [1, -1, 1, -1, 1.41, -1.41, 0, 0], NGY = [1, 1, -1, -1, 0, 0, 1.41, -1.41];
function noiseSeed(s) {
  const r = Z.mulberry32(Z.hash32(s ^ 0x2545f491)), p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)), t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) NP[i] = p[i & 255];
}
function perlin(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
  const a = NP[NP[X] + Y] & 7, b = NP[NP[X + 1] + Y] & 7, c = NP[NP[X] + Y + 1] & 7, d = NP[NP[X + 1] + Y + 1] & 7;
  const n00 = NGX[a] * xf + NGY[a] * yf, n10 = NGX[b] * (xf - 1) + NGY[b] * yf, n01 = NGX[c] * xf + NGY[c] * (yf - 1), n11 = NGX[d] * (xf - 1) + NGY[d] * (yf - 1);
  const x1 = n00 + u * (n10 - n00), x2 = n01 + u * (n11 - n01);
  return (x1 + v * (x2 - x1)) * 0.75;
}
function dHash(i, j) { return Z.hash32((i * 73856093) ^ (j * 19349663) ^ WORLD.seed ^ 0x6a09e667); }

/* ---------- seeds and seasons ---------- */
function worldSeed(s) {
  WORLD.seed = s | 0; citySeed = s | 0; noiseSeed(s);
  WORLD.dist.clear(); WORLD.dc.clear(); WORLD.cur = null; WORLD.seen.clear();
  chunks.clear(); blockCache.clear(); FF.ready = false;
  if (typeof WCACHE !== 'undefined') WCACHE.clear();
}
function realSeason(d) { const m = (d || new Date()).getMonth(); return m >= 2 && m <= 4 ? 0 : m <= 7 ? 1 : m <= 10 ? 2 : 3; }
function seasonIdx() { return WORLD.season; }
function setSeason(i, quiet) {
  i = ((i | 0) % 4 + 4) % 4; if (i === WORLD.season) return;
  WORLD.season = i;
  // the city's art is redrawn for the new season, one block per frame so nothing stutters
  for (const c of chunks.values()) { c.stale = 1; c.wcan = null; }
  if (typeof WSPR !== 'undefined') WSPR.clear();
  if (!quiet && G.mode !== 'title') toast('The season turns', SEASONS[i], ['#ffa8e0', '#7dff4a', '#ff9a3a', '#bfe6ff'][i]);
}
function seasonFromSetting() {
  const s = SET.season;
  return s === 'spring' ? 0 : s === 'summer' ? 1 : s === 'fall' ? 2 : s === 'winter' ? 3 : realSeason();
}
// a fresh world for a run (or the title screen): a new seed unless the player fixed one, the season, a start point
function startWorld(title) {
  WORLD.mix = SET.world || 'mixed';
  const seed = SET.seedMode === 'fixed' && SET.seed ? (SET.seed | 0) : (Math.random() * 1e9) | 0;
  worldSeed(seed); WORLD.lastSeed = seed;
  WORLD.season = seasonFromSetting();
  WORLD.start = pickStart(Z.mulberry32(seed ^ (title ? 0x7171 : 0x51a7)));
}

/* ---------- districts and climate ---------- */
function climate(x, y) { return perlin(x / 26 + 101.3, y / 26 - 33.7) * 0.85 + perlin(x / 7 + 7.1, y / 7 + 3.3) * 0.15; }
function district(i, j) {
  const k = i * 100003 + j; let d = WORLD.dist.get(k); if (d) return d;
  const h = dHash(i, j), R = Z.mulberry32(h ^ 0x5bd1e995);
  const px = (i + 0.2 + (h & 1023) / 1023 * 0.6) * DS, py = (j + 0.2 + ((h >>> 10) & 1023) / 1023 * 0.6) * DS;
  const t = climate(px, py), mix = WORLD.mix;
  const hot = mix === 'wild' ? 0.1 : 0.2, cold = mix === 'wild' ? -0.1 : -0.2;
  let bio;
  if (mix !== 'city' && t > hot) bio = 'desert';
  else if (mix !== 'city' && t < cold) bio = 'snow';
  else {
    const W = mix === 'wild' ? [['city', 8], ['suburb', 30], ['burning', 12], ['chaos', 8], ['ruins', 22], ['ash', 20]] : [['city', 26], ['suburb', 17], ['burning', 15], ['chaos', 14], ['ruins', 14], ['ash', 14]];
    let tot = 0; for (const w of W) tot += w[1];
    let r = R() * tot; bio = W[0][0]; for (const w of W) { if (r < w[1]) { bio = w[0]; break; } r -= w[1]; }
  }
  const nm = DNAMES[bio], a = nm[0][Math.floor(R() * nm[0].length)], b = nm[1][Math.floor(R() * nm[1].length)];
  const name = b[0] === b[0].toLowerCase() ? a + b : a + ' ' + b;
  d = { i: i, j: j, id: k, bio: bio, name: name, lx: Math.floor(px), ly: Math.floor(py), pal: Math.floor(R() * 1e6), dense: 0.55 + R() * 0.45, warm: R() };
  WORLD.dist.set(k, d);
  if (WORLD.dist.size > 3000) WORLD.dist.clear();
  return d;
}
// which district a chunk belongs to: the nearest district seed, with the borders warped so they wander
function distAt(cx, cy) {
  const key = cx * 100003 + cy; let d = WORLD.dc.get(key); if (d) return d;
  const wx = cx + 0.5 + perlin(cx * 0.19 + 3.1, cy * 0.19 + 7.7) * 1.7, wy = cy + 0.5 + perlin(cx * 0.19 + 19.3, cy * 0.19 - 4.1) * 1.7;
  const gi = Math.floor(wx / DS), gj = Math.floor(wy / DS);
  let best = 1e9, bi = 0, bj = 0;
  for (let i = gi - 1; i <= gi + 1; i++) for (let j = gj - 1; j <= gj + 1; j++) {
    const h = dHash(i, j), px = (i + 0.2 + (h & 1023) / 1023 * 0.6) * DS, py = (j + 0.2 + ((h >>> 10) & 1023) / 1023 * 0.6) * DS;
    const e = (px - wx) * (px - wx) + (py - wy) * (py - wy); if (e < best) { best = e; bi = i; bj = j; }
  }
  d = district(bi, bj);
  if (WORLD.dc.size > 20000) WORLD.dc.clear();
  WORLD.dc.set(key, d);
  return d;
}
function bioAt(x, y) { return distAt(Math.floor(x / CH), Math.floor(y / CH)).bio; }

/* ---------- rivers and ponds ---------- */
// a ridge of noise: zero along the river's centre line. Negative values are water, below -1.15 is deep.
// The noise is divided by its own slope, so the value is close to a distance in pixels from the centre line:
// rivers keep an even width instead of swelling into blobs where the noise flattens out.
// Rivers never just stop: they run on, wider in some places and narrower in others.
function riverV(x, y) {
  const s = 1 / 4600, wx = (x + perlin(x * s * 0.6 + 5.2, y * s * 0.6 + 1.3) * 1300) * s, wy = (y + perlin(x * s * 0.6 - 8.1, y * s * 0.6 + 9.9) * 1300) * s;
  const n = perlin(wx, wy);
  if (Math.abs(n) > 0.2) return 9;   // far from any river: skip the rest
  const e = 0.004, gx = (perlin(wx + e, wy) - n) / e, gy = (perlin(wx, wy + e) - n) / e;
  const d = Math.abs(n) / (Math.max(0.35, Math.hypot(gx, gy)) * s);   // roughly pixels from the centre line
  const half = 78 + 30 * perlin(x / 2600 + 41.7, y / 2600 - 13.2);
  return (d - half) / 52;
}
function pondV(x, y) { return (0.42 - perlin(x / 430 + 77.7, y / 430 + 31.3)) / 0.05; }
// fills the chunk's water field and mask: 0 dry, 1 shallow, 2 deep, 3 bridge deck, 4 ice, 5 dry wash, 6 river bank
function waterField(c) {
  const ox = c.ox, oy = c.oy, bio = c.bio, ponds = bio === 'suburb' || bio === 'snow' || (bio === 'desert' && c.D.warm > 0.8);
  // a coarse look first: most chunks have no water anywhere near them
  let near = false;
  for (let j = 0; j <= 4 && !near; j++) for (let i = 0; i <= 4; i++) { const x = ox + i * 160, y = oy + j * 160; if (riverV(x, y) < 6 || (ponds && pondV(x, y) < 6)) { near = true; break; } }
  if (!near) return;
  const f = new Float32Array(WF * WF);
  let any = false;
  for (let j = 0; j < WF; j++) for (let i = 0; i < WF; i++) {
    const x = ox + i * WC, y = oy + j * WC;
    let v = riverV(x, y);
    if (ponds) { const e = Math.min(i * WC - ROAD, j * WC - ROAD, CH - i * WC, CH - j * WC); if (e > 0) v = Math.min(v, pondV(x, y) + Math.max(0, (70 - e) / 9)); }
    f[j * WF + i] = v; if (v < 1) any = true;
  }
  if (!any) return;
  const wm = new Uint8Array(WM * WM), dry = bio === 'desert', ice = bio === 'snow';
  for (let j = 0; j < WM; j++) for (let i = 0; i < WM; i++) {
    const v = (f[j * WF + i] + f[j * WF + i + 1] + f[(j + 1) * WF + i] + f[(j + 1) * WF + i + 1]) * 0.25;
    wm[j * WM + i] = v < -1.15 ? (dry ? 5 : ice ? 4 : 2) : v < 0 ? (dry ? 5 : ice ? 4 : 1) : v < 0.9 ? 6 : 0;
  }
  // bridges: every stretch of road that crosses water (or the bank right next to it) becomes a deck the full width of the road
  const nR = ROAD / WC;   // 14 cells
  c.decks = [];
  const deckRuns = (horiz) => {
    let run = -1;
    const n = horiz ? WM : WM - nR;
    for (let k = 0; k <= n; k++) {
      let wet = false;
      if (k < n) for (let q = 0; q < nR && !wet; q++) { const i = horiz ? k : q, j = horiz ? q : k + nR, v = wm[j * WM + i]; if (v === 1 || v === 2 || v === 4) wet = true; }
      if (wet && run < 0) run = k;
      if (!wet && run >= 0) {
        const a = Math.max(0, run - 2), b = Math.min(n, k + 2);   // a little past the water at each end
        for (let kk = a; kk < b; kk++) for (let q = 0; q < nR; q++) { const i = horiz ? kk : q, j = horiz ? q : kk + nR; wm[j * WM + i] = 3; }
        c.decks.push(horiz ? { x: ox + a * WC, y: oy, w: (b - a) * WC, h: ROAD, horiz: true } : { x: ox, y: oy + (a + nR) * WC, w: ROAD, h: (b - a) * WC, horiz: false });
        run = -1;
      }
    }
  };
  deckRuns(true); deckRuns(false);
  // nothing else on a road is ever water
  for (let j = 0; j < WM; j++) for (let i = 0; i < WM; i++) if ((i < nR || j < nR) && wm[j * WM + i] !== 3) wm[j * WM + i] = 0;
  c.fv = f; c.wm = wm; c.wet = true;
}
function waterAtC(c, x, y) {
  if (!c || !c.wm) return 0;
  const i = Math.floor((x - c.ox) / WC), j = Math.floor((y - c.oy) / WC);
  if (i < 0 || j < 0 || i >= WM || j >= WM) return 0;
  return c.wm[j * WM + i];
}
let WLC = null;   // the last chunk looked up, since most lookups land in the same one
function waterAt(x, y) {
  const cx = Math.floor(x / CH), cy = Math.floor(y / CH);
  let c = WLC;
  if (!c || c.cx !== cx || c.cy !== cy) { c = chunks.get(cx + ',' + cy); if (!c) return 0; WLC = c; }
  return waterAtC(c, x, y);
}
// how much water slows something down: 1 is not at all
function waterSlow(w) { return w === 1 ? 0.7 : w === 2 ? 0.5 : 1; }
function isWater(w) { return w === 1 || w === 2; }

/* ---------- chunk generation ---------- */
let RQ = 1;
function bucketRects(c) {
  const bk = []; for (let i = 0; i < 16; i++) bk.push([]);
  for (const r of c.rects) {
    const x0 = clamp(Math.floor((r.x - c.ox) / 160), 0, 3), x1 = clamp(Math.floor((r.x + r.w - c.ox) / 160), 0, 3);
    const y0 = clamp(Math.floor((r.y - c.oy) / 160), 0, 3), y1 = clamp(Math.floor((r.y + r.h - c.oy) / 160), 0, 3);
    for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) bk[j * 4 + i].push(r);
  }
  c.bk = bk;
}
function genChunk(cx, cy) {
  const R = chunkRng(cx, cy, 0), D = distAt(cx, cy), bio = D.bio;
  const ox = cx * CH, oy = cy * CH;
  const c = { cx: cx, cy: cy, ox: ox, oy: oy, type: '', rects: [], can: null, seen: 0, bio: bio, D: D, wm: null, fv: null, wet: false, decks: [],
    deco: [], props: [], fires: [], birds: [], puddles: [], decals: [], lights: null, lm: cx === D.lx && cy === D.ly };
  waterField(c);
  const B = BIO[bio], k = BIOGEN[bio] || BIOGEN.city;
  k(c, R, B);
  roadside(c, R);
  railings(c);
  // cosmetic details use their own random stream, so a device drawing more or fewer of them never changes the map
  decorate(c, chunkRng(cx, cy, 0x77d1));
  bucketRects(c);
  return c;
}
// is this rectangle on dry land, inside the chunk's block, clear of everything solid?
function freeAt(c, x, y, w, h, pad) {
  pad = pad || 0;
  if (c.wm) {
    // every water cell the rectangle touches (cells are 8px, so step by cell rather than by pixel)
    const i0 = Math.max(0, Math.floor((x - pad - c.ox) / WC)), i1 = Math.min(WM - 1, Math.floor((x + w + pad - c.ox) / WC));
    const j0 = Math.max(0, Math.floor((y - pad - c.oy) / WC)), j1 = Math.min(WM - 1, Math.floor((y + h + pad - c.oy) / WC));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const v = c.wm[j * WM + i]; if (v && v !== 6 && v !== 5) return false; }
  }
  for (const r of c.rects) if (x - pad < r.x + r.w && x + w + pad > r.x && y - pad < r.y + r.h && y + h + pad > r.y) return false;
  return true;
}
function addB(c, R, B, x, y, w, h, st) {
  if (!freeAt(c, x, y, w, h, 2)) {
    // a building that would stand in the river is pulled back from the water, or left out
    let ok = false;
    for (let s = 0.85; s >= 0.45 && !ok; s -= 0.2) { const nw = w * s, nh = h * s, nx = x + (w - nw) / 2, ny = y + (h - nh) / 2; if (freeAt(c, nx, ny, nw, nh, 2)) { x = nx; y = ny; w = nw; h = nh; ok = true; } }
    if (!ok) return null;
  }
  const pal = B.roofs, r = { x: x, y: y, w: w, h: h, k: 'b', st: st || 'block', roof: pal[(c.D.pal + Math.floor(R() * pal.length)) % pal.length], s: (R() * 1e9) | 0 };
  c.rects.push(r); return r;
}
function addCar(c, R, x, y, w, h, o) {
  if (!freeAt(c, x, y, w, h, 2)) return null;
  const r = Object.assign({ x: x, y: y, w: w, h: h, k: 'car', col: CARS[Math.floor(R() * CARS.length)], burnt: R() < 0.22 }, o || {});
  c.rects.push(r); return r;
}
function addRock(c, R, x, y, w, h, k) { if (!freeAt(c, x, y, w, h, 3)) return null; const r = { x: x, y: y, w: w, h: h, k: k || 'rock', s: (R() * 1e9) | 0 }; c.rects.push(r); return r; }
function addTrunk(c, R, x, y, kind, rr) {
  const t = 14; if (!freeAt(c, x - t / 2, y - t / 2, t, t, 4)) return null;
  const r = { x: x - t / 2, y: y - t / 2, w: t, h: t, k: 'trunk' }; c.rects.push(r);
  const tr = { k: 'tree', x: x, y: y, r: rr || 30 + R() * 14, v: kind, sh: 0, sa: 0, ph: R() * TAU, s: (R() * 1e9) | 0 };
  c.deco.push(tr); return tr;
}
function addProp(c, k, x, y, R) {
  if (!freeAt(c, x - 8, y - 8, 16, 16, 2)) return null;
  const P = PROPS[k], p = { k: k, x: x, y: y, vx: 0, vy: 0, r: P.r, a: R() * TAU, va: 0, hp: P.hp, dead: false, down: k === 'can' && R() < 0.3 };
  c.props.push(p); return p;
}
function addFire(c, x, y, r, hz) { c.fires.push({ x: x, y: y, r: r, hz: !!hz, ph: Math.random() * 10, lit: 1 }); }
const PROPS = { barrel: { r: 11, hp: 26, m: 3 }, cone: { r: 7, hp: 1e9, m: 0.6 }, can: { r: 9, hp: 1e9, m: 1.2 }, tire: { r: 10, hp: 1e9, m: 1.6 }, crate: { r: 11, hp: 1e9, m: 2.2 } };

// the usual city block layouts, shared by downtown, burning, riot and ash districts
function urbanBlock(c, R, B, opts) {
  const ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD, M = 16, IN = BS - 2 * M;
  const T = opts.types, type = c.lm ? 'plaza' : T[Math.floor(R() * T.length)];
  c.type = type;
  if (type === 'big') addB(c, R, B, bx + M, by + M, IN, IN);
  else if (type === 'two') {
    const al = 64 + R() * 30, f = 0.35 + R() * 0.3;
    if (R() < 0.5) { const w1 = (IN - al) * f; addB(c, R, B, bx + M, by + M, w1, IN); addB(c, R, B, bx + M + w1 + al, by + M, IN - w1 - al, IN); }
    else { const h1 = (IN - al) * f; addB(c, R, B, bx + M, by + M, IN, h1); addB(c, R, B, bx + M, by + M + h1 + al, IN, IN - h1 - al); }
  } else if (type === 'four') {
    const al = 60 + R() * 20, s1 = (IN - al) * (0.4 + R() * 0.2), s2 = (IN - al) * (0.4 + R() * 0.2);
    const xs = [bx + M, bx + M + s1 + al], ws = [s1, IN - s1 - al], ys = [by + M, by + M + s2 + al], hs = [s2, IN - s2 - al];
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if (R() < 0.88) addB(c, R, B, xs[i], ys[j], ws[i], hs[j]);
  } else if (type === 'lot') {
    for (let row = 0; row < 3; row++) for (let i = 0; i < 7; i++) if (R() < 0.5) addCar(c, R, bx + 44 + i * 64, by + 60 + row * 150, 30, 52, opts.burnt ? { burnt: R() < opts.burnt } : null);
    addB(c, R, B, bx + BS - 96, by + BS - 92, 54, 50);
  } else if (type === 'plaza') {
    const q = [[0.22, 0.22], [0.78, 0.22], [0.22, 0.78], [0.78, 0.78]];
    for (const p of q) if (freeAt(c, bx + BS * p[0] - 22, by + BS * p[1] - 22, 44, 44, 2)) c.rects.push({ x: bx + BS * p[0] - 22, y: by + BS * p[1] - 22, w: 44, h: 44, k: 'planter' });
    if (c.lm) { const m = opts.landmark || 'fountain', cxp = bx + BS / 2, cyp = by + BS / 2; if (freeAt(c, cxp - 34, cyp - 34, 68, 68, 2)) c.rects.push({ x: cxp - 30, y: cyp - 30, w: 60, h: 60, k: 'lm', lm: m }); }
  }
}
const BIOGEN = {
  city(c, R, B) {
    urbanBlock(c, R, B, { types: c.D.dense > 0.8 ? ['big', 'four', 'big', 'two', 'four', 'plaza', 'lot'] : ['two', 'four', 'four', 'big', 'plaza', 'lot', 'two', 'four', 'big'], landmark: 'fountain' });
    const bx = c.ox + ROAD, by = c.oy + ROAD;
    if (R() < 0.35) addProp(c, 'barrel', bx + 4 + R() * 8, by + 20 + R() * (BS - 40), R);
  },
  burning(c, R, B) {
    urbanBlock(c, R, B, { types: ['two', 'four', 'four', 'big', 'lot', 'two', 'plaza'], burnt: 0.7, landmark: 'tanker' });
    for (const r of c.rects) {
      if (r.k === 'car' && R() < 0.4) addFire(c, r.x + r.w / 2, r.y + r.h / 2, 14, false);
      if (r.k === 'b' && R() < 0.75) { const n = 1 + Math.floor(R() * Math.min(4, r.w * r.h / 9000)); for (let i = 0; i < n; i++) addFire(c, r.x + 14 + R() * (r.w - 28), r.y + 14 + R() * (r.h - 28), 16 + R() * 16, false); r.burn = 1; }
    }
    // fires burning in the street: these hurt
    const ox = c.ox, oy = c.oy, n = R() < 0.75 ? 1 + Math.floor(R() * 3) : 0;
    for (let i = 0; i < n; i++) {
      const onRoad = R() < 0.5, x = onRoad ? ox + 24 + R() * (ROAD - 48) : ox + ROAD + 30 + R() * (BS - 60), y = onRoad ? oy + ROAD + 30 + R() * (BS - 60) : oy + 24 + R() * (ROAD - 48);
      if (freeAt(c, x - 20, y - 20, 40, 40, 4) && waterAtC(c, x, y) !== 3) addFire(c, x, y, 22 + R() * 10, true);
    }
    for (let i = 0; i < 2; i++) if (R() < 0.6) addProp(c, 'barrel', ox + ROAD + 6 + R() * 10, oy + ROAD + 20 + R() * (BS - 40), R);
  },
  chaos(c, R, B) {
    urbanBlock(c, R, B, { types: ['two', 'four', 'lot', 'plaza', 'four', 'two', 'lot'], burnt: 0.4, landmark: 'checkpoint' });
    const ox = c.ox, oy = c.oy;
    // concrete barricades across the streets, always with a gap to slip through
    if (R() < 0.7) {
      const horiz = R() < 0.5, at = (horiz ? ox : oy) + ROAD + 40 + R() * (BS - 160), gap = Math.floor(R() * 3);
      for (let k = 0; k < 3; k++) {
        if (k === gap) continue;
        if (horiz) { const y = oy + 6 + k * 36; if (waterAtC(c, at, y) !== 3) c.rects.push({ x: at, y: y, w: 14, h: 30, k: 'barrier' }); }
        else { const x = ox + 6 + k * 36; if (waterAtC(c, x, at) !== 3) c.rects.push({ x: x, y: at, w: 30, h: 14, k: 'barrier' }); }
      }
    }
    if (R() < 0.6) { const x = ox + ROAD + 40 + R() * (BS - 140), y = oy + 30 + R() * 30; addCar(c, R, x, y, 58, 28, { police: true, col: '#1b2a4a', burnt: false }); }
    // cars flipped over and left across the road
    if (R() < 0.6) { const horiz = R() < 0.5, x = horiz ? ox + ROAD + 30 + R() * (BS - 120) : ox + 30 + R() * 30, y = horiz ? oy + 30 + R() * 30 : oy + ROAD + 30 + R() * (BS - 120); addCar(c, R, x, y, horiz ? 58 : 28, horiz ? 28 : 58, { flip: true, burnt: R() < 0.4 }); }
    // a burning trash barrel on a corner
    if (R() < 0.55) { const x = ox + ROAD + 6 + R() * 10, y = oy + ROAD + 6 + R() * 10; addFire(c, x, y, 9, false); const p = addProp(c, 'can', x, y, R); if (p) p.fire = 1; }
    const nc = 4 + Math.floor(R() * 5);
    for (let i = 0; i < nc; i++) addProp(c, R() < 0.5 ? 'cone' : 'can', ox + 14 + R() * (CH - 28), oy + 14 + R() * (ROAD - 28), R);
    for (let i = 0; i < 2; i++) if (R() < 0.5) addProp(c, 'barrel', ox + ROAD + 8 + R() * (BS - 16), oy + ROAD + 4 + R() * 8, R);
    if (R() < 0.5) addProp(c, 'tire', ox + 20 + R() * (ROAD - 40), oy + ROAD + 20 + R() * (BS - 40), R);
    if (R() < 0.35) addFire(c, ox + ROAD + 10 + R() * 20, oy + ROAD + 10 + R() * 20, 10, false);
  },
  ash(c, R, B) {
    urbanBlock(c, R, B, { types: ['two', 'four', 'big', 'lot', 'plaza', 'four'], burnt: 0.85, landmark: 'deadtree' });
    for (const r of c.rects) if (r.k === 'car') r.burnt = R() < 0.85;
    const bx = c.ox + ROAD, by = c.oy + ROAD;
    for (let i = 0; i < 3; i++) { const x = bx + 10 + R() * 4, y = by + 30 + R() * (BS - 60); if (R() < 0.6) addTrunk(c, R, x, y, 'dead', 22 + R() * 10); }
  },
  ruins(c, R, B) {
    const ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD, M = 16, IN = BS - 2 * M;
    c.type = 'ruins';
    // what is left of the buildings: broken walls and heaps of rubble
    const lots = [];
    const t = R();
    if (t < 0.3) lots.push([bx + M, by + M, IN, IN]);
    else if (t < 0.65) { const al = 70 + R() * 30, s = (IN - al) * (0.4 + R() * 0.2); lots.push([bx + M, by + M, s, IN], [bx + M + s + al, by + M, IN - s - al, IN]); }
    else { const al = 64, s1 = (IN - al) * 0.5, s2 = (IN - al) * (0.4 + R() * 0.2); for (const xx of [bx + M, bx + M + s1 + al]) for (const [yy, hh] of [[by + M, s2], [by + M + s2 + al, IN - s2 - al]]) lots.push([xx, yy, s1, hh]); }
    for (const L of lots) {
      if (R() < 0.18 && !c.lm) { addB(c, R, B, L[0], L[1], L[2], L[3], 'ruin'); continue; }   // one still standing, gutted
      const n = 2 + Math.floor(R() * 4);
      for (let i = 0; i < n; i++) {
        const w = Math.max(20, L[2] * (0.18 + R() * 0.35)), h = Math.max(20, L[3] * (0.18 + R() * 0.35));
        const x = L[0] + R() * (L[2] - w), y = L[1] + R() * (L[3] - h);
        if (freeAt(c, x, y, w, h, 10)) c.rects.push({ x: x, y: y, w: w, h: h, k: 'rub', s: (R() * 1e9) | 0, roof: B.roofs[Math.floor(R() * B.roofs.length)] });
      }
      c.decals.push({ k: 'rubble', x: L[0], y: L[1], w: L[2], h: L[3], s: (R() * 1e9) | 0 });
    }
    if (c.lm && freeAt(c, bx + BS / 2 - 90, by + BS / 2 - 24, 180, 48, 4)) c.rects.push({ x: bx + BS / 2 - 90, y: by + BS / 2 - 22, w: 180, h: 44, k: 'lm', lm: 'plane' });
    // craters in the road
    const ncr = R() < 0.6 ? 1 + Math.floor(R() * 2) : 0;
    for (let i = 0; i < ncr; i++) c.decals.push({ k: 'crater', x: ox + 30 + R() * (CH - 60), y: oy + 20 + R() * (ROAD - 40), r: 18 + R() * 22, s: (R() * 1e9) | 0 });
    for (let i = 0; i < 2; i++) if (R() < 0.5) addProp(c, R() < 0.5 ? 'barrel' : 'crate', bx + 20 + R() * (BS - 40), by + 20 + R() * (BS - 40), R);
    if (R() < 0.25) addFire(c, bx + 30 + R() * (BS - 60), by + 30 + R() * (BS - 60), 12, false);
  },
  suburb(c, R, B) {
    const ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD;
    c.type = c.lm ? 'park' : 'houses';
    if (c.lm) {
      // a park: trees, a pond and a playground
      for (let i = 0; i < 9; i++) addTrunk(c, R, bx + 40 + R() * (BS - 80), by + 40 + R() * (BS - 80), R() < 0.2 ? 'blossom' : 'oak');
      if (freeAt(c, bx + BS / 2 - 40, by + BS / 2 - 30, 80, 60, 4)) c.rects.push({ x: bx + BS / 2 - 36, y: by + BS / 2 - 26, w: 72, h: 52, k: 'lm', lm: 'playground' });
      return;
    }
    // four houses with yards, fences between some of them
    const half = BS / 2;
    for (let qx = 0; qx < 2; qx++) for (let qy = 0; qy < 2; qy++) {
      const lx = bx + qx * half, ly = by + qy * half;
      if (R() < 0.12) continue;
      const w = 96 + R() * 46, h = 84 + R() * 40, x = lx + 30 + R() * (half - w - 60), y = ly + 30 + R() * (half - h - 60);
      const hs = addB(c, R, B, x, y, w, h, 'house');
      if (hs && R() < 0.4) addCar(c, R, qx ? x - 40 : x + w + 10, y + h - 54, 28, 52);
      // trees and fences
      const nt = 1 + Math.floor(R() * 2);
      for (let i = 0; i < nt; i++) addTrunk(c, R, lx + 26 + R() * (half - 52), ly + 26 + R() * (half - 52), R() < 0.15 ? 'blossom' : R() < 0.25 ? 'pine' : 'oak');
    }
    if (R() < 0.7) { const y = by + half - 2, g0 = R() * (BS - 80); if (freeAt(c, bx + 16, y, g0, 4, 0)) c.rects.push({ x: bx + 16, y: y, w: Math.max(0, g0 - 16), h: 4, k: 'fence', low: true }); const x1 = bx + g0 + 60; if (freeAt(c, x1, y, bx + BS - 16 - x1, 4, 0)) c.rects.push({ x: x1, y: y, w: Math.max(0, bx + BS - 16 - x1), h: 4, k: 'fence', low: true }); }
    if (R() < 0.7) { const x = bx + half - 2, g0 = R() * (BS - 80); if (freeAt(c, x, by + 16, 4, g0, 0)) c.rects.push({ x: x, y: by + 16, w: 4, h: Math.max(0, g0 - 16), k: 'fence', low: true }); const y1 = by + g0 + 60; if (freeAt(c, x, y1, 4, by + BS - 16 - y1, 0)) c.rects.push({ x: x, y: y1, w: 4, h: Math.max(0, by + BS - 16 - y1), k: 'fence', low: true }); }
    for (let i = 0; i < 2; i++) if (R() < 0.6) addProp(c, 'can', bx + 8 + R() * 6, by + 30 + R() * (BS - 60), R);
  },
  desert(c, R, B) {
    const ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD;
    c.type = 'open';
    if (c.lm) { if (freeAt(c, bx + BS / 2 - 40, by + BS / 2 - 40, 80, 80, 4)) c.rects.push({ x: bx + BS / 2 - 36, y: by + BS / 2 - 36, w: 72, h: 72, k: 'lm', lm: 'tower' }); }
    else if (R() < 0.35) {
      // a little adobe town or a gas station on the highway
      if (R() < 0.5) { const w = 70 + R() * 50, h = 60 + R() * 40; addB(c, R, B, bx + 40 + R() * (BS - w - 80), by + 40 + R() * (BS - h - 80), w, h, 'adobe'); if (R() < 0.6) { const w2 = 50 + R() * 30; addB(c, R, B, bx + 50 + R() * (BS - w2 - 100), by + 50 + R() * (BS - w2 - 100), w2, w2 * 0.9, 'adobe'); } }
      else { addB(c, R, B, bx + 30, by + 40, 110, 70, 'adobe'); c.rects.push({ x: bx + 190, y: by + 60, w: 18, h: 18, k: 'pump' }); c.rects.push({ x: bx + 250, y: by + 60, w: 18, h: 18, k: 'pump' }); c.decals.push({ k: 'canopy', x: bx + 160, y: by + 30, w: 140, h: 80 }); addProp(c, 'barrel', bx + 160 + R() * 120, by + 130 + R() * 30, R); }
    }
    // a mesa: a cluster of big rocks
    if (R() < 0.18) { const mx = bx + 120 + R() * (BS - 240), my = by + 120 + R() * (BS - 240); for (let i = 0; i < 5; i++) addRock(c, R, mx + (R() - 0.5) * 140, my + (R() - 0.5) * 140, 40 + R() * 50, 36 + R() * 44, 'mesa'); }
    const nr = 2 + Math.floor(R() * 4);
    for (let i = 0; i < nr; i++) { const s = 16 + R() * 26; addRock(c, R, bx + 20 + R() * (BS - 40 - s), by + 20 + R() * (BS - 40 - s), s, s * (0.7 + R() * 0.4)); }
    const nc = 3 + Math.floor(R() * 5);
    for (let i = 0; i < nc; i++) { const x = bx + 20 + R() * (BS - 40), y = by + 20 + R() * (BS - 40); if (freeAt(c, x - 7, y - 7, 14, 14, 6)) c.rects.push({ x: x - 6, y: y - 6, w: 12, h: 12, k: 'cactus', low: true, s: (R() * 1e9) | 0 }); }
  },
  snow(c, R, B) {
    const ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD;
    c.type = 'woods';
    if (c.lm) { if (freeAt(c, bx + BS / 2 - 30, by + BS / 2 - 30, 60, 60, 4)) c.rects.push({ x: bx + BS / 2 - 26, y: by + BS / 2 - 26, w: 52, h: 52, k: 'lm', lm: 'mast' }); }
    const nb = R() < 0.55 ? 1 + Math.floor(R() * 2) : 0;
    for (let i = 0; i < nb; i++) { const w = 70 + R() * 50, h = 60 + R() * 40; addB(c, R, B, bx + 30 + R() * (BS - w - 60), by + 30 + R() * (BS - h - 60), w, h, 'cabin'); }
    const np = 5 + Math.floor(R() * 7);
    for (let i = 0; i < np; i++) addTrunk(c, R, bx + 24 + R() * (BS - 48), by + 24 + R() * (BS - 48), 'pine', 26 + R() * 14);
    const nr = Math.floor(R() * 3);
    for (let i = 0; i < nr; i++) { const s = 18 + R() * 24; addRock(c, R, bx + 20 + R() * (BS - 40 - s), by + 20 + R() * (BS - 40 - s), s, s * 0.8); }
    if (R() < 0.4) addProp(c, R() < 0.5 ? 'crate' : 'barrel', bx + 20 + R() * (BS - 40), by + 20 + R() * (BS - 40), R);
  }
};
// cars along the streets
function roadside(c, R) {
  const ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD, bio = c.bio;
  const p = bio === 'desert' ? 0.22 : bio === 'snow' ? 0.3 : bio === 'suburb' ? 0.35 : bio === 'chaos' ? 0.75 : 0.5;
  const burnt = bio === 'burning' ? 0.7 : bio === 'ash' ? 0.85 : bio === 'ruins' ? 0.5 : 0.22;
  const deck = (x, y, w, h) => c.wm && (waterAtC(c, x, y) === 3 || waterAtC(c, x + w, y + h) === 3 || waterAtC(c, x + w / 2, y + h / 2) === 3);
  if (R() < p) { const x = bx + 30 + R() * (BS - 130), y = R() < 0.5 ? oy + 18 : oy + ROAD - 46; if (!deck(x, y, 58, 28)) addCar(c, R, x, y, 58, 28, { burnt: R() < burnt }); }
  if (R() < p) { const y = by + 30 + R() * (BS - 130), x = R() < 0.5 ? ox + 18 : ox + ROAD - 46; if (!deck(x, y, 28, 58)) addCar(c, R, x, y, 28, 58, { burnt: R() < burnt }); }
}
// railings along the sides of a bridge, where the water below is deep enough to matter. Bullets fly over them.
function railings(c) {
  if (!c.decks.length) return;
  const ox = c.ox, oy = c.oy;
  const deepOut = (x, y) => riverV(x, y) < -0.25;
  const run = (horiz, fixed, a0, a1, side) => {
    let s = -1;
    for (let a = a0; a <= a1; a += WC) {
      const x = horiz ? a + WC / 2 : fixed, y = horiz ? fixed : a + WC / 2;
      const on = a < a1 && deepOut(horiz ? x : fixed + side * 10, horiz ? fixed + side * 10 : y);
      if (on && s < 0) s = a;
      if (!on && s >= 0) {
        if (horiz) c.rects.push({ x: s, y: side < 0 ? fixed : fixed - 5, w: a - s, h: 5, k: 'rail', low: true });
        else c.rects.push({ x: side < 0 ? fixed : fixed - 5, y: s, w: 5, h: a - s, k: 'rail', low: true });
        s = -1;
      }
    }
  };
  for (const d of c.decks) {
    if (d.horiz) {
      const a0 = Math.max(d.x, ox + ROAD), a1 = d.x + d.w;
      if (a1 > a0) { run(true, oy, a0, a1, -1); run(true, oy + ROAD, a0, a1, 1); }
    } else { run(false, ox, d.y, d.y + d.h, -1); run(false, ox + ROAD, d.y, d.y + d.h, 1); }
  }
}
// bushes, grass, birds and the like: purely cosmetic amounts scale with the device (Q.deco)
function decorate(c, R) {
  const bio = c.bio, ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD, dm = Q.deco || 1;
  const n = (k) => Math.floor(k * dm + R());
  const spot = (pad, road) => {
    for (let t = 0; t < 6; t++) {
      const x = road ? ox + 10 + R() * (CH - 20) : bx + 12 + R() * (BS - 24), y = road ? oy + 10 + R() * (ROAD - 20) : by + 12 + R() * (BS - 24);
      if (freeAt(c, x - pad, y - pad, pad * 2, pad * 2, 2)) return [x, y];
    }
    return null;
  };
  const bush = (cnt, v) => { for (let i = 0; i < cnt; i++) { const s = spot(14); if (s) c.deco.push({ k: 'bush', x: s[0], y: s[1], r: 11 + R() * 9, v: v, sh: 0, sa: 0, ph: R() * TAU, s: (R() * 1e9) | 0 }); } };
  const grass = (cnt, v) => { for (let i = 0; i < cnt; i++) { const s = spot(8); if (s) c.deco.push({ k: 'grass', x: s[0], y: s[1], r: 9 + R() * 6, v: v, bend: 0, ba: 0, ph: R() * TAU, s: (R() * 1e9) | 0 }); } };
  const birds = (p, kind, max) => {
    if (R() > p) return;
    const s = spot(30); if (!s) return;
    const k = 2 + Math.floor(R() * (max - 1));
    for (let i = 0; i < k; i++) c.birds.push({ x: s[0] + (R() - 0.5) * 60, y: s[1] + (R() - 0.5) * 50, st: 0, vx: 0, vy: 0, t: 0, ph: R() * 10, a: R() * TAU, kind: kind });
  };
  const puddles = (cnt) => { for (let i = 0; i < cnt; i++) { const onH = R() < 0.5; c.puddles.push({ x: onH ? ox + ROAD + R() * BS : ox + 14 + R() * (ROAD - 28), y: onH ? oy + 14 + R() * (ROAD - 28) : oy + ROAD + R() * BS, rx: 10 + R() * 18, ry: 6 + R() * 9, a: onH ? 0 : Math.PI / 2 }); } };
  switch (bio) {
    case 'city': if (c.type === 'plaza') { bush(n(4), 'round'); birds(0.7, 'pigeon', 7); } else birds(0.15, 'pigeon', 5); puddles(n(3)); break;
    case 'burning': puddles(n(1)); break;
    case 'chaos': puddles(n(2)); birds(0.25, 'crow', 5); for (let i = 0; i < n(5); i++) c.decals.push({ k: 'litter', x: ox + R() * CH, y: oy + R() * CH, s: (R() * 1e9) | 0 }); break;
    case 'ruins': bush(n(2), 'weed'); grass(n(5), 'weed'); birds(0.35, 'crow', 6); puddles(n(2)); break;
    case 'ash': birds(0.4, 'crow', 6); for (let i = 0; i < n(4); i++) c.decals.push({ k: 'drift', x: ox + R() * CH, y: oy + R() * CH, r: 20 + R() * 40, s: (R() * 1e9) | 0 }); break;
    case 'suburb': bush(n(8), 'round'); grass(n(10), 'lawn'); birds(0.3, 'pigeon', 5); puddles(n(2)); break;
    case 'desert': bush(n(4), 'dry'); grass(n(4), 'dry'); birds(0.25, 'vulture', 4); for (let i = 0; i < n(3); i++) c.decals.push({ k: 'dune', x: bx + R() * BS, y: by + R() * BS, r: 40 + R() * 60, a: R() * 0.6 - 0.3 }); if (R() < 0.3 * dm) c.decals.push({ k: 'bones', x: bx + 30 + R() * (BS - 60), y: by + 30 + R() * (BS - 60), a: R() * TAU }); break;
    case 'snow': bush(n(3), 'snowy'); birds(0.15, 'crow', 4); for (let i = 0; i < n(4); i++) c.decals.push({ k: 'drift', x: bx + R() * BS, y: by + R() * BS, r: 24 + R() * 40, s: (R() * 1e9) | 0 }); break;
  }
  // reeds along river banks
  if (c.wm && bio !== 'desert' && bio !== 'snow') {
    let tries = n(10);
    for (let t = 0; t < tries * 4 && tries > 0; t++) {
      const x = bx + R() * BS, y = by + R() * BS;
      if (waterAtC(c, x, y) === 6) { c.deco.push({ k: 'grass', x: x, y: y, r: 9 + R() * 5, v: 'reed', bend: 0, ba: 0, ph: R() * TAU, s: (R() * 1e9) | 0 }); tries--; }
    }
  }
}

/* ---------- where the run starts ---------- */
// somewhere new every run: a road crossing that is dry, open, and (for a fair start) not in the middle of a fire
function pickStart(R) {
  for (let t = 0; t < 80; t++) {
    const cx = Math.floor((R() - 0.5) * 60), cy = Math.floor((R() - 0.5) * 60), D = distAt(cx, cy);
    if (WORLD.mix === 'city' && !TEMPERATE[D.bio]) continue;
    const c = getChunk(cx, cy), x = cx * CH + 56, y = cy * CH + 56;
    if (waterAtC(c, x, y) || blocked(x, y, 30)) continue;
    let fire = false; for (const f of c.fires) if (f.hz && Math.hypot(f.x - x, f.y - y) < 200) fire = true;
    if (fire) continue;
    return { x: x, y: y };
  }
  return { x: 56, y: 56 };
}
// the district under the camera; a new one is announced
function trackDistrict(x, y) {
  const D = distAt(Math.floor(x / CH), Math.floor(y / CH));
  if (D === WORLD.cur) return D;
  const prev = WORLD.cur; WORLD.cur = D;
  if (prev && G.mode === 'play' && SET.districts && G.time - WORLD.bannerT > 6) {
    WORLD.bannerT = G.time;
    toast((WORLD.seen.has(D.id) ? 'Back in · ' : 'Entering · ') + BIO[D.bio].name, D.name, BIO[D.bio].col);
  }
  WORLD.seen.add(D.id);
  return D;
}

/* ---------- drawing a chunk ---------- */
function speckle(g, R, x, y, w, h, n, a, b) {
  for (const col of [a, b]) { g.fillStyle = col; g.beginPath(); for (let i = 0; i < n / 2; i++) g.rect(x + R() * w, y + R() * h, 1 + R() * 3, 1 + R() * 3); g.fill(); }
}
// fills the region of the field below level L (marching squares on the 8px grid); returns the edge segments too.
// Only the box of cells that has any water in it is visited, and nothing is allocated per cell.
const ISO = { cx: new Float32Array(4), cy: new Float32Array(4), cv: new Float32Array(4), ci: new Uint8Array(4), P: new Float32Array(8) };
function isoFill(g, f, ox, oy, L, segs, box) {
  g.beginPath();
  const S = WC, cx = ISO.cx, cy = ISO.cy, cv = ISO.cv, ci = ISO.ci, P = ISO.P;
  const i0 = box ? box[0] : 0, i1 = box ? box[1] : WM - 1, j0 = box ? box[2] : 0, j1 = box ? box[3] : WM - 1;
  for (let j = j0; j <= j1; j++) {
   let run = -1;   // full cells are merged into one rectangle per stretch of the row
   for (let i = i0; i <= i1 + 1; i++) {
    let a = 0, b = 0, c = 0, d = 0, ia = 0, ib = 0, ic = 0, id = 0, n = 0;
    if (i <= i1) { a = f[j * WF + i]; b = f[j * WF + i + 1]; c = f[(j + 1) * WF + i + 1]; d = f[(j + 1) * WF + i]; ia = a < L ? 1 : 0; ib = b < L ? 1 : 0; ic = c < L ? 1 : 0; id = d < L ? 1 : 0; n = ia + ib + ic + id; }
    if (n === 4) { if (run < 0) run = i; continue; }
    if (run >= 0) { g.rect(ox + run * S, oy + j * S, (i - run) * S, S); run = -1; }
    if (!n) continue;
    const x = ox + i * S, y = oy + j * S;
    cx[0] = x; cx[1] = x + S; cx[2] = x + S; cx[3] = x; cy[0] = y; cy[1] = y; cy[2] = y + S; cy[3] = y + S;
    cv[0] = a; cv[1] = b; cv[2] = c; cv[3] = d; ci[0] = ia; ci[1] = ib; ci[2] = ic; ci[3] = id;
    let first = true, np = 0;
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) & 3;
      if (ci[k]) { if (first) { g.moveTo(cx[k], cy[k]); first = false; } else g.lineTo(cx[k], cy[k]); }
      if (ci[k] !== ci[k2]) {
        const t = (L - cv[k]) / (cv[k2] - cv[k]), ex = cx[k] + (cx[k2] - cx[k]) * t, ey = cy[k] + (cy[k2] - cy[k]) * t;
        if (first) { g.moveTo(ex, ey); first = false; } else g.lineTo(ex, ey);
        P[np++] = ex; P[np++] = ey;
      }
    }
    g.closePath();
    if (segs) {
      if (np === 4) segs.push(P[0], P[1], P[2], P[3]);
      else if (np === 8) { if (ia) segs.push(P[6], P[7], P[0], P[1], P[2], P[3], P[4], P[5]); else segs.push(P[0], P[1], P[2], P[3], P[4], P[5], P[6], P[7]); }
    }
   }
  }
  g.fill();
}
// the box of cells (within the block) where the field dips below level L
function isoBox(f, L) {
  let i0 = WM, i1 = -1, j0 = WM, j1 = -1;
  for (let j = 0; j < WF; j++) for (let i = 0; i < WF; i++) if (f[j * WF + i] < L) { if (i < i0) i0 = i; if (i > i1) i1 = i; if (j < j0) j0 = j; if (j > j1) j1 = j; }
  if (i1 < 0) return null;
  return [Math.max(0, i0 - 1), Math.min(WM - 1, i1), Math.max(0, j0 - 1), Math.min(WM - 1, j1)];
}
function strokeSegs(g, s) { g.beginPath(); for (let i = 0; i < s.length; i += 4) { g.moveTo(s[i], s[i + 1]); g.lineTo(s[i + 2], s[i + 3]); } g.stroke(); }
function winterOn(c) { return WORLD.season === 3 && TEMPERATE[c.bio]; }
function renderChunk(c) {
  const sc = Q.chunkScale, can = document.createElement('canvas'); can.width = can.height = Math.round(CH * sc);
  const g = can.getContext('2d'); g.scale(sc, sc); c.sc = sc;
  const R = chunkRng(c.cx, c.cy, 0xabc123), B = BIO[c.bio], ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD, win = winterOn(c), dm = Q.deco || 1, sea = WORLD.season;
  g.translate(-ox, -oy);
  const RT = WORLD.rt || (WORLD.rt = { road: 0, block: 0, water: 0, decal: 0, rects: 0, light: 0 }); let t0 = performance.now(), t1;
  // the road
  g.fillStyle = B.road; g.fillRect(ox, oy, CH, CH);
  speckle(g, R, ox, oy, CH, CH, Math.floor(260 * dm), 'rgba(255,255,255,0.03)', 'rgba(0,0,0,0.16)');
  drawRoadMarks(g, c, B, R);
  t1 = performance.now(); RT.road += t1 - t0; t0 = t1;
  // the block
  drawBlock(g, c, B, R, win, sea);
  t1 = performance.now(); RT.block += t1 - t0; t0 = t1;
  // rivers, ponds and bridges
  if (c.fv) drawWaterArt(g, c, B);
  t1 = performance.now(); RT.water += t1 - t0; t0 = t1;
  drawDecals(g, c, B, R, win, sea);
  // the city's bloodstains
  for (let i = 0; i < 3; i++) { g.fillStyle = c.bio === 'snow' ? 'rgba(90,10,10,0.35)' : 'rgba(40,10,10,0.35)'; g.beginPath(); g.ellipse(ox + R() * CH, oy + R() * CH, 10 + R() * 20, 6 + R() * 12, R() * 3, 0, TAU); g.fill(); }
  t1 = performance.now(); RT.decal += t1 - t0; t0 = t1;
  for (const r of c.rects) drawRectArt(g, r, c, B, win);
  if (win || c.bio === 'snow') snowCaps(g, c);
  t1 = performance.now(); RT.rects += t1 - t0; t0 = t1;
  if (c.fires.length) {
    g.globalCompositeOperation = 'lighter';
    for (const f of c.fires) { const r = f.r * 3.2, gr = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, r); gr.addColorStop(0, 'rgba(255,120,40,0.32)'); gr.addColorStop(0.5, 'rgba(255,90,30,0.1)'); gr.addColorStop(1, 'rgba(255,90,30,0)'); g.fillStyle = gr; g.fillRect(f.x - r, f.y - r, r * 2, r * 2); }
    g.globalCompositeOperation = 'source-over';
    for (const f of c.fires) soot(g, f.x, f.y + f.r * 0.3, f.r * 1.3, 0.45);
  }
  bakeLights(g, c);
  RT.light += performance.now() - t0;
  c.can = can;
  c.wcan = null;
  WORLD.rf = (WORLD.rf || 0) + 1;
}
// on a frame that drew no new blocks, build one just off screen in the direction the camera is heading,
// so walking into new streets never stalls on drawing them
const STREAM = { lx: 0, ly: 0, vx: 0, vy: 0 };
function streamChunks(x0, y0, x1, y1) {
  STREAM.vx = STREAM.vx * 0.9 + (cam.x - STREAM.lx) * 0.1; STREAM.vy = STREAM.vy * 0.9 + (cam.y - STREAM.ly) * 0.1; STREAM.lx = cam.x; STREAM.ly = cam.y;
  if (PERF.workMs > 1000 / targetFps() * 0.7) return;
  const pad = 200 + Math.min(400, Math.hypot(STREAM.vx, STREAM.vy) * 40);
  const ax = STREAM.vx >= 0 ? 1 : -1, ay = STREAM.vy >= 0 ? 1 : -1, ex = ax > 0 ? x1 + pad : x0 - pad, ey = ay > 0 ? y1 + pad : y0 - pad;
  const cand = [[ex, (y0 + y1) / 2], [(x0 + x1) / 2, ey], [ex, ey], [ex, ay > 0 ? y0 : y1], [ax > 0 ? x0 : x1, ey]];
  for (const [x, y] of cand) {
    const c = getChunk(Math.floor(x / CH), Math.floor(y / CH));
    if (!c.can) { renderChunk(c); c.seen = frameNo; return; }
  }
}
function drawRoadMarks(g, c, B, R) {
  const ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD, bio = c.bio;
  const lane = bio === 'desert' ? 'rgba(220,190,120,0.28)' : bio === 'snow' ? 'rgba(214,180,80,0.18)' : bio === 'ash' ? 'rgba(200,200,190,0.18)' : 'rgba(214,180,80,0.34)';
  g.strokeStyle = lane; g.lineWidth = 3; g.setLineDash([22, 18]);
  g.beginPath(); g.moveTo(bx + 30, oy + ROAD / 2); g.lineTo(ox + CH - 30, oy + ROAD / 2); g.moveTo(ox + ROAD / 2, by + 30); g.lineTo(ox + ROAD / 2, oy + CH - 30); g.stroke(); g.setLineDash([]);
  if (bio !== 'desert' && bio !== 'snow') {
    g.fillStyle = bio === 'ash' ? 'rgba(220,220,214,0.1)' : 'rgba(230,226,214,0.15)';
    for (let i = 0; i < 6; i++) { g.fillRect(bx + 4, oy + 9 + i * 16, 18, 9); g.fillRect(ox + CH - 22, oy + 9 + i * 16, 18, 9); g.fillRect(ox + 9 + i * 16, by + 4, 9, 18); g.fillRect(ox + 9 + i * 16, oy + CH - 22, 9, 18); }
  }
  // cracks in damaged districts
  if (bio === 'ruins' || bio === 'ash' || bio === 'burning' || bio === 'desert') {
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.2;
    const n = bio === 'ruins' ? 7 : 3;
    for (let i = 0; i < n; i++) {
      let x = ox + R() * CH, y = oy + R() * ROAD; if (R() < 0.5) { const t = x; x = ox + R() * ROAD; y = oy + ROAD + R() * BS; void t; }
      g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (R() - 0.5) * 30; y += (R() - 0.5) * 30; g.lineTo(x, y); } g.stroke();
    }
  }
  // sand or snow drifting in from the sides of the road
  if (bio === 'desert' || bio === 'snow') {
    g.fillStyle = bio === 'desert' ? 'rgba(120,96,62,0.55)' : 'rgba(190,200,210,0.5)';
    for (let i = 0; i < 14; i++) { const t = R(), horiz = R() < 0.5, edge = R() < 0.5; const x = horiz ? ox + t * CH : ox + (edge ? 2 : ROAD - 2), y = horiz ? oy + (edge ? 2 : ROAD - 2) : oy + t * CH; g.beginPath(); g.ellipse(x, y, horiz ? 30 + R() * 30 : 8 + R() * 10, horiz ? 8 + R() * 10 : 30 + R() * 30, 0, 0, TAU); g.fill(); }
    if (bio === 'snow') { g.strokeStyle = 'rgba(20,24,30,0.35)'; g.lineWidth = 5; g.beginPath(); g.moveTo(bx, oy + ROAD / 2 - 18); g.lineTo(ox + CH, oy + ROAD / 2 - 18); g.moveTo(bx, oy + ROAD / 2 + 18); g.lineTo(ox + CH, oy + ROAD / 2 + 18); g.moveTo(ox + ROAD / 2 - 18, by); g.lineTo(ox + ROAD / 2 - 18, oy + CH); g.moveTo(ox + ROAD / 2 + 18, by); g.lineTo(ox + ROAD / 2 + 18, oy + CH); g.stroke(); }
  }
}
function drawBlock(g, c, B, R, win, sea) {
  const ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD, bio = c.bio, dm = Q.deco || 1;
  const grass = sea === 0 ? '#29421f' : sea === 1 ? '#233c1d' : sea === 2 ? '#3a3520' : '#2f3a2a';
  if (bio === 'desert') {
    g.fillStyle = B.lot; g.fillRect(bx, by, BS, BS);
    speckle(g, R, bx, by, BS, BS, Math.floor(420 * dm), 'rgba(255,230,180,0.06)', 'rgba(60,40,20,0.12)');
    g.fillStyle = B.walk; g.fillRect(bx, by, BS, 6); g.fillRect(bx, by, 6, BS);
    return;
  }
  if (bio === 'snow') {
    g.fillStyle = B.lot; g.fillRect(bx, by, BS, BS);
    speckle(g, R, bx, by, BS, BS, Math.floor(300 * dm), 'rgba(255,255,255,0.12)', 'rgba(60,80,100,0.08)');
    g.fillStyle = 'rgba(70,90,110,0.18)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(bx + R() * BS, by + R() * BS, 30 + R() * 50, 12 + R() * 20, R() * 3, 0, TAU); g.fill(); }
    return;
  }
  // sidewalk around the block
  g.fillStyle = win ? '#7d8890' : B.walk; g.fillRect(bx, by, BS, BS);
  g.strokeStyle = win ? '#9aa5ad' : B.edge; g.lineWidth = 2; g.strokeRect(bx + 1, by + 1, BS - 2, BS - 2);
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
  for (let i = bx + 24; i < bx + BS; i += 24) { g.beginPath(); g.moveTo(i, by); g.lineTo(i, by + 14); g.moveTo(i, by + BS - 14); g.lineTo(i, by + BS); g.stroke(); }
  const inner = (col) => { g.fillStyle = col; g.fillRect(bx + 16, by + 16, BS - 32, BS - 32); };
  if (bio === 'suburb') {
    inner(win ? '#8d99a3' : grass);
    speckle(g, R, bx + 16, by + 16, BS - 32, BS - 32, Math.floor(380 * dm), win ? 'rgba(255,255,255,0.12)' : 'rgba(120,170,90,0.10)', win ? 'rgba(60,80,100,0.1)' : 'rgba(0,0,0,0.14)');
    if (c.type === 'houses') { g.fillStyle = win ? '#a2adb6' : '#45484b'; g.fillRect(bx + BS / 2 - 14, by + 16, 28, BS - 32); }   // a path through the middle
    return;
  }
  if (c.type === 'plaza') {
    inner(win ? '#8a959e' : bio === 'ash' ? '#3d3e40' : '#1c2520');
    g.fillStyle = win ? '#9aa5ad' : bio === 'ash' ? '#47474a' : '#2a2e2b'; g.fillRect(bx + 16, by + BS / 2 - 22, BS - 32, 44); g.fillRect(bx + BS / 2 - 22, by + 16, 44, BS - 32);
    g.fillStyle = win ? '#8d99a3' : '#20292a'; g.beginPath(); g.arc(bx + BS / 2, by + BS / 2, 46, 0, TAU); g.fill();
    g.strokeStyle = '#3c4a4c'; g.lineWidth = 4; g.stroke();
  } else if (c.type === 'lot') {
    inner(win ? '#838e96' : bio === 'ash' ? '#2f2f31' : '#1b1d21');
    g.strokeStyle = 'rgba(230,226,214,0.22)'; g.lineWidth = 2;
    for (let row = 0; row < 3; row++) for (let i = 0; i <= 7; i++) { const x = bx + 37 + i * 64, y = by + 52 + row * 150; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 68); g.stroke(); }
  } else if (c.type === 'ruins') {
    inner(win ? '#7f8a92' : '#24221f');
    speckle(g, R, bx + 16, by + 16, BS - 32, BS - 32, Math.floor(500 * dm), 'rgba(200,190,170,0.06)', 'rgba(0,0,0,0.2)');
  } else inner(win ? '#7d8890' : B.lot);
  if (bio === 'burning') { g.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(bx + R() * BS, by + R() * BS, 20 + R() * 40, 14 + R() * 24, R() * 3, 0, TAU); g.fill(); } }
  if (sea === 2 && !win && (bio === 'city' || bio === 'chaos')) speckle(g, R, bx, by, BS, BS, Math.floor(60 * dm), 'rgba(200,110,40,0.35)', 'rgba(160,70,30,0.3)');
}
function drawWaterArt(g, c, B) {
  const f = c.fv, ox = c.ox, oy = c.oy, bio = c.bio, win = winterOn(c);
  // the water only shows in the block: on the roads it runs under the bridge decks
  g.save(); g.beginPath(); g.rect(ox + ROAD, oy + ROAD, BS, BS); g.clip();
  drawWaterBody(g, c, B, f, ox, oy, bio, win);
  g.restore();
  drawDecks(g, c, bio);
}
function drawWaterBody(g, c, B, f, ox, oy, bio, win) {
  const bx = c.wbox || (c.wbox = isoBox(f, 0.9)); if (!bx) return;
  if (bio === 'desert') {
    // a dry wash: a sunken bed of cracked mud, and the odd oasis
    g.fillStyle = 'rgba(70,52,34,0.75)'; isoFill(g, f, ox, oy, 0.6, null, bx);
    g.fillStyle = 'rgba(50,36,24,0.6)'; isoFill(g, f, ox, oy, -0.6, null, bx);
    if (c.D.warm > 0.8) { g.fillStyle = B.water[0]; isoFill(g, f, ox, oy, -1.4, null, bx); }
  } else {
    const ice = bio === 'snow' || (win && c.D.warm < 0.5);
    g.fillStyle = ice ? '#b3c2cc' : B.bank; isoFill(g, f, ox, oy, 0.9, null, bx);
    const shore = [];
    g.fillStyle = ice ? '#98bdd0' : B.water[0]; isoFill(g, f, ox, oy, 0, shore, bx);
    g.fillStyle = ice ? '#86afc4' : B.water[1]; isoFill(g, f, ox, oy, -1.15, null, bx);
    g.strokeStyle = ice ? 'rgba(255,255,255,0.55)' : B.water[2]; g.lineWidth = 2.5; strokeSegs(g, shore);
    if (ice) {
      // cracks across the ice
      const R = chunkRng(c.cx, c.cy, 0x1ce); g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1;
      for (let i = 0; i < 26; i++) { let x = ox + R() * CH, y = oy + R() * CH; if (waterAtC(c, x, y) !== 4) continue; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 3; k++) { x += (R() - 0.5) * 40; y += (R() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
    }
  }
}
// bridge decks over the water
function drawDecks(g, c, bio) {
  for (const d of c.decks) {
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(d.x + 6, d.y + 10, d.w, d.h);   // the bridge's shadow on the water
    g.fillStyle = bio === 'snow' ? '#5a646e' : bio === 'desert' ? '#5a4d3c' : '#33363b'; g.fillRect(d.x, d.y, d.w, d.h);
    g.fillStyle = 'rgba(255,255,255,0.05)'; if (d.horiz) { g.fillRect(d.x, d.y + 4, d.w, 6); g.fillRect(d.x, d.y + d.h - 10, d.w, 6); } else { g.fillRect(d.x + 4, d.y, 6, d.h); g.fillRect(d.x + d.w - 10, d.y, 6, d.h); }
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.5;
    g.beginPath();
    if (d.horiz) for (let x = d.x + 40; x < d.x + d.w; x += 40) { g.moveTo(x, d.y); g.lineTo(x, d.y + d.h); }
    else for (let y = d.y + 40; y < d.y + d.h; y += 40) { g.moveTo(d.x, y); g.lineTo(d.x + d.w, y); }
    g.stroke();
    g.strokeStyle = 'rgba(214,180,80,0.34)'; g.lineWidth = 3; g.setLineDash([22, 18]); g.beginPath();
    if (d.horiz) { g.moveTo(d.x, d.y + d.h / 2); g.lineTo(d.x + d.w, d.y + d.h / 2); } else { g.moveTo(d.x + d.w / 2, d.y); g.lineTo(d.x + d.w / 2, d.y + d.h); }
    g.stroke(); g.setLineDash([]);
  }
}
function drawDecals(g, c, B, R, win, sea) {
  for (const d of c.decals) {
    const Rd = Z.mulberry32(d.s || 7);
    switch (d.k) {
      case 'crater':
        g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.ellipse(d.x, d.y, d.r, d.r * 0.85, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(120,108,92,0.45)'; g.lineWidth = 4; g.beginPath(); g.ellipse(d.x, d.y, d.r * 1.15, d.r, 0, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(90,80,70,0.5)'; for (let i = 0; i < 10; i++) { const a = Rd() * TAU, r = d.r * (1.1 + Rd() * 0.6); g.fillRect(d.x + Math.cos(a) * r, d.y + Math.sin(a) * r, 2 + Rd() * 4, 2 + Rd() * 4); }
        break;
      case 'rubble':
        g.fillStyle = 'rgba(70,64,56,0.55)'; for (let i = 0; i < 26; i++) { const x = d.x + Rd() * d.w, y = d.y + Rd() * d.h, s = 3 + Rd() * 9; g.fillRect(x, y, s, s * (0.5 + Rd())); }
        g.fillStyle = 'rgba(30,26,22,0.5)'; for (let i = 0; i < 12; i++) { g.fillRect(d.x + Rd() * d.w, d.y + Rd() * d.h, 2 + Rd() * 5, 2 + Rd() * 5); }
        break;
      case 'litter':
        g.fillStyle = Rd() < 0.5 ? 'rgba(230,226,214,0.4)' : 'rgba(200,60,50,0.35)'; g.save(); g.translate(d.x, d.y); g.rotate(Rd() * 3); g.fillRect(-4, -3, 8, 6); g.restore();
        break;
      case 'drift': {
        // a soft heap of ash or snow, darker on one side
        const col = c.bio === 'snow' ? '235,240,245' : '150,150,154', rr = d.r * 0.7, gr = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, rr);
        gr.addColorStop(0, 'rgba(' + col + ',0.3)'); gr.addColorStop(1, 'rgba(' + col + ',0)');
        g.save(); g.translate(d.x, d.y); g.scale(1, 0.55); g.rotate(Rd() * 3); g.translate(-d.x, -d.y); g.fillStyle = gr; g.fillRect(d.x - rr, d.y - rr, rr * 2, rr * 2); g.restore();
        break;
      }
      case 'dune':
        g.strokeStyle = 'rgba(40,28,16,0.25)'; g.lineWidth = 3; g.beginPath(); g.ellipse(d.x, d.y, d.r, d.r * 0.35, d.a, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
        g.strokeStyle = 'rgba(255,230,180,0.08)'; g.lineWidth = 6; g.beginPath(); g.ellipse(d.x, d.y - 4, d.r, d.r * 0.35, d.a, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
        break;
      case 'bones':
        g.save(); g.translate(d.x, d.y); g.rotate(d.a); g.fillStyle = 'rgba(225,215,190,0.7)'; g.beginPath(); g.ellipse(0, 0, 9, 7, 0, 0, TAU); g.fill();
        g.fillRect(8, -1.5, 26, 3); for (let i = 0; i < 4; i++) { g.fillRect(12 + i * 5, -8, 2, 16); } g.fillStyle = 'rgba(30,20,10,0.7)'; g.fillRect(-4, -3, 3, 3); g.fillRect(1, -3, 3, 3); g.restore();
        break;
      case 'canopy':
        g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(d.x + 8, d.y + 10, d.w, d.h);
        g.fillStyle = '#7a3a2e'; g.fillRect(d.x, d.y, d.w, d.h); g.fillStyle = '#e8e2d4'; g.fillRect(d.x, d.y + d.h / 2 - 4, d.w, 8);
        g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2; g.strokeRect(d.x + 1, d.y + 1, d.w - 2, d.h - 2);
        break;
    }
  }
  // fall leaves and spring petals on the ground in green places
  if ((sea === 2 || sea === 0) && !win && (c.bio === 'suburb' || c.type === 'plaza' || c.type === 'park')) {
    const cols = sea === 2 ? ['rgba(214,110,40,0.7)', 'rgba(190,60,40,0.65)', 'rgba(230,170,50,0.7)'] : ['rgba(255,190,220,0.6)', 'rgba(255,230,240,0.55)'];
    for (let i = 0; i < Math.floor(160 * (Q.deco || 1)); i++) { g.fillStyle = cols[Math.floor(R() * cols.length)]; g.fillRect(c.ox + R() * CH, c.oy + R() * CH, 2 + R() * 3, 2 + R() * 2); }
  }
  // puddles show when the ground is wet (drawn live), but a faint stain always marks them
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (const p of c.puddles) { g.beginPath(); g.ellipse(p.x, p.y, p.rx, p.ry, p.a, 0, TAU); g.fill(); }
}
function drawRectArt(g, r, c, B, win) {
  const Rb = Z.mulberry32(r.s || 1);
  switch (r.k) {
    case 'b': drawBuilding(g, r, c, B, win, Rb); break;
    case 'car': if (r.flip) drawFlipped(g, r); else drawCar(g, r); if (win || c.bio === 'snow') { g.fillStyle = 'rgba(230,236,242,0.75)'; rrect(g, r.x + 3, r.y + 3, r.w - 6, r.h - 6, 5); g.fill(); } else if (c.bio === 'desert' || c.bio === 'ash') { g.fillStyle = c.bio === 'ash' ? 'rgba(150,150,154,0.35)' : 'rgba(140,110,70,0.3)'; rrect(g, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 5); g.fill(); } break;
    case 'planter':
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(r.x + 5, r.y + 7, r.w, r.h);
      g.fillStyle = '#4a4741'; g.fillRect(r.x, r.y, r.w, r.h);
      g.fillStyle = c.bio === 'ash' ? '#2b2b2b' : win ? '#c9d3da' : '#1f3524'; g.beginPath(); g.arc(r.x + r.w / 2, r.y + r.h / 2, 26, 0, TAU); g.fill();
      g.fillStyle = c.bio === 'ash' ? '#3a3a3a' : win ? '#e6ecf0' : '#28452f'; g.beginPath(); g.arc(r.x + r.w / 2 - 6, r.y + r.h / 2 - 6, 15, 0, TAU); g.fill();
      break;
    case 'rub': drawRubble(g, r, Rb); break;
    case 'barrier':
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(r.x + 3, r.y + 4, r.w, r.h);
      g.fillStyle = '#9a968c'; g.fillRect(r.x, r.y, r.w, r.h); g.fillStyle = '#b8b3a8'; if (r.w > r.h) g.fillRect(r.x, r.y + r.h / 2 - 2, r.w, 4); else g.fillRect(r.x + r.w / 2 - 2, r.y, 4, r.h);
      g.fillStyle = '#c9402e'; if (r.w > r.h) { g.fillRect(r.x + 3, r.y + 2, 6, r.h - 4); g.fillRect(r.x + r.w - 9, r.y + 2, 6, r.h - 4); } else { g.fillRect(r.x + 2, r.y + 3, r.w - 4, 6); g.fillRect(r.x + 2, r.y + r.h - 9, r.w - 4, 6); }
      break;
    case 'rail':
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(r.x + 3, r.y + 5, r.w, r.h);
      g.fillStyle = c.bio === 'snow' ? '#c8d2da' : '#6b6f75'; g.fillRect(r.x, r.y, r.w, r.h);
      g.fillStyle = '#2a2d31'; if (r.w > r.h) for (let x = r.x; x < r.x + r.w; x += 16) g.fillRect(x, r.y - 1, 3, r.h + 2); else for (let y = r.y; y < r.y + r.h; y += 16) g.fillRect(r.x - 1, y, r.w + 2, 3);
      break;
    case 'fence':
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(r.x + 2, r.y + 3, r.w, r.h);
      g.fillStyle = win ? '#d9dfe3' : '#8a6a48'; g.fillRect(r.x, r.y, r.w, r.h);
      g.fillStyle = win ? '#aab3b9' : '#5e4630'; if (r.w > r.h) for (let x = r.x; x < r.x + r.w; x += 12) g.fillRect(x, r.y - 2, 3, r.h + 4); else for (let y = r.y; y < r.y + r.h; y += 12) g.fillRect(r.x - 2, y, r.w + 4, 3);
      break;
    case 'rock': case 'mesa': {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2, desert = c.bio === 'desert';
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(cx + 5, cy + 7, r.w / 2 + 2, r.h / 2 + 2, 0, 0, TAU); g.fill();
      g.fillStyle = desert ? (r.k === 'mesa' ? '#7a4e35' : '#6e5a48') : c.bio === 'snow' ? '#5d666e' : '#4d4a46';
      g.beginPath(); const n = 8; for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 0.82 + Rb() * 0.25, x = cx + Math.cos(a) * r.w / 2 * k * 1.08, y = cy + Math.sin(a) * r.h / 2 * k * 1.08; if (!i) g.moveTo(x, y); else g.lineTo(x, y); } g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.ellipse(cx - r.w * 0.12, cy - r.h * 0.15, r.w * 0.28, r.h * 0.22, -0.4, 0, TAU); g.fill();
      if (r.k === 'mesa') {
        // a flat-topped butte: a lighter top terrace and striped sides
        g.fillStyle = '#8f5f40'; g.beginPath(); const m = 9; for (let i = 0; i < m; i++) { const a = i / m * TAU, k = 0.55 + Rb() * 0.12; const x = cx - r.w * 0.06 + Math.cos(a) * r.w / 2 * k, y = cy - r.h * 0.08 + Math.sin(a) * r.h / 2 * k; if (!i) g.moveTo(x, y); else g.lineTo(x, y); } g.closePath(); g.fill();
        g.strokeStyle = 'rgba(60,30,16,0.35)'; g.lineWidth = 1.2; for (let i = 0; i < 4; i++) { const a = Math.PI * (0.15 + i * 0.2); g.beginPath(); g.moveTo(cx + Math.cos(a) * r.w * 0.3, cy + Math.sin(a) * r.h * 0.28); g.lineTo(cx + Math.cos(a) * r.w * 0.5, cy + Math.sin(a) * r.h * 0.5); g.stroke(); }
      }
      if (c.bio === 'snow' || win) { g.fillStyle = 'rgba(235,240,245,0.8)'; g.beginPath(); g.ellipse(cx - r.w * 0.05, cy - r.h * 0.1, r.w * 0.36, r.h * 0.26, 0, 0, TAU); g.fill(); }
      break;
    }
    case 'cactus': {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(cx + 4, cy + 5, 9, 0, TAU); g.fill();
      g.fillStyle = '#3f6a3a'; g.beginPath(); g.arc(cx, cy, 8, 0, TAU); g.fill();
      g.fillRect(cx - 15, cy - 3, 9, 6); g.fillRect(cx + 6, cy - 2, 9, 5); g.beginPath(); g.arc(cx - 15, cy - 5, 3.5, 0, TAU); g.arc(cx + 15, cy - 4, 3, 0, TAU); g.fill();
      g.fillStyle = '#5e9152'; g.beginPath(); g.arc(cx - 2, cy - 2, 4, 0, TAU); g.fill();
      if (Rb() < 0.35) { g.fillStyle = '#ff6fa8'; g.beginPath(); g.arc(cx + 1, cy - 1, 2.2, 0, TAU); g.fill(); }
      break;
    }
    case 'pump':
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(r.x + 3, r.y + 4, r.w, r.h); g.fillStyle = '#b03a2e'; g.fillRect(r.x, r.y, r.w, r.h); g.fillStyle = '#e8e2d4'; g.fillRect(r.x + 3, r.y + 3, r.w - 6, 5);
      break;
    case 'trunk': break;   // trees are drawn live, on top
    case 'lm': drawLandmark(g, r, c, B, win, Rb); break;
  }
}
function drawBuilding(g, r, c, B, win, Rb) {
  const st = r.st || 'block';
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(r.x + 10, r.y + 12, r.w, r.h);
  if (st === 'house') {
    // a pitched roof: two halves and a ridge
    const horiz = r.w >= r.h, sh = win ? '#d8dfe4' : r.roof;
    g.fillStyle = sh; g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = 'rgba(0,0,0,0.22)'; if (horiz) g.fillRect(r.x, r.y + r.h / 2, r.w, r.h / 2); else g.fillRect(r.x + r.w / 2, r.y, r.w / 2, r.h);
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 3; g.beginPath(); if (horiz) { g.moveTo(r.x + 4, r.y + r.h / 2); g.lineTo(r.x + r.w - 4, r.y + r.h / 2); } else { g.moveTo(r.x + r.w / 2, r.y + 4); g.lineTo(r.x + r.w / 2, r.y + r.h - 4); } g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 1; g.beginPath();
    if (horiz) for (let y = r.y + 6; y < r.y + r.h; y += 7) { g.moveTo(r.x, y); g.lineTo(r.x + r.w, y); } else for (let x = r.x + 6; x < r.x + r.w; x += 7) { g.moveTo(x, r.y); g.lineTo(x, r.y + r.h); }
    g.stroke();
    g.fillStyle = '#5a4a40'; g.fillRect(r.x + r.w * (0.2 + Rb() * 0.5), r.y + r.h * 0.2, 10, 10);   // chimney
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2; g.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    return;
  }
  if (st === 'adobe') {
    g.fillStyle = r.roof; g.fillRect(r.x, r.y, r.w, r.h);
    g.strokeStyle = 'rgba(255,230,190,0.18)'; g.lineWidth = 5; g.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
    g.fillStyle = 'rgba(60,40,24,0.45)'; for (let i = 0; i < 4; i++) g.fillRect(r.x + 8 + i * (r.w - 20) / 3, r.y - 2, 4, 5);   // roof beams sticking out
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(r.x + r.w * 0.3, r.y + r.h * 0.3, r.w * 0.25, r.h * 0.25);
    return;
  }
  if (st === 'cabin') {
    const horiz = r.w >= r.h;
    g.fillStyle = '#4a3528'; g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = '#e6ecf0'; if (horiz) { g.fillRect(r.x, r.y, r.w, r.h / 2 - 2); g.fillStyle = '#cdd6dc'; g.fillRect(r.x, r.y + r.h / 2 + 2, r.w, r.h / 2 - 2); } else { g.fillRect(r.x, r.y, r.w / 2 - 2, r.h); g.fillStyle = '#cdd6dc'; g.fillRect(r.x + r.w / 2 + 2, r.y, r.w / 2 - 2, r.h); }
    g.fillStyle = '#6a4a38'; g.fillRect(r.x + r.w * 0.7, r.y + r.h * 0.15, 9, 9);
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2; g.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    return;
  }
  // a flat roof with vents, skylights and water tanks
  const burnt = r.burn || c.bio === 'ash';
  g.fillStyle = r.roof; g.fillRect(r.x, r.y, r.w, r.h);
  if (win) {
    // a blanket of snow, thinner in patches so the roof shows through
    g.fillStyle = 'rgba(196,206,214,0.82)'; g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = 'rgba(120,132,142,0.35)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(r.x + Rb() * r.w, r.y + Rb() * r.h, r.w * (0.08 + Rb() * 0.12), r.h * (0.05 + Rb() * 0.08), Rb() * 3, 0, TAU); g.fill(); }
  }
  g.strokeStyle = 'rgba(255,255,255,0.09)'; g.lineWidth = 4; g.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; g.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  const n = 1 + Math.floor(Rb() * Math.min(5, r.w * r.h / 9000));
  for (let i = 0; i < n; i++) {
    const w = 18 + Rb() * 26, h = 14 + Rb() * 20, x = r.x + 12 + Rb() * Math.max(1, r.w - w - 24), y = r.y + 12 + Rb() * Math.max(1, r.h - h - 24), t = Rb();
    if (w + 24 > r.w || h + 24 > r.h) continue;
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 3, y + 4, w, h);
    if (t < 0.45) { g.fillStyle = '#50555d'; g.fillRect(x, y, w, h); g.strokeStyle = '#2e3237'; g.lineWidth = 1; g.beginPath(); g.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.32, 0, TAU); g.stroke(); }
    else if (t < 0.7) { g.fillStyle = '#25303a'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(160,200,230,0.18)'; g.strokeRect(x + 2, y + 2, w - 4, h - 4); }
    else if (t < 0.85) { g.fillStyle = '#4a4339'; g.beginPath(); g.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.55, 0, TAU); g.fill(); g.strokeStyle = '#2b2620'; g.lineWidth = 2; g.stroke(); }
    else { g.fillStyle = '#3d3b37'; g.fillRect(x, y, w, h); g.fillStyle = '#2a2826'; g.fillRect(x + 3, y + 3, w * 0.4, h - 6); }
  }
  if (st === 'ruin') {
    // gutted: a jagged hole through the roof, beams across it and debris around the edges
    const hx = r.x + r.w * (0.3 + Rb() * 0.4), hy = r.y + r.h * (0.3 + Rb() * 0.4), hr = Math.min(r.w, r.h) * (0.16 + Rb() * 0.08);
    soot(g, hx, hy, hr * 2.2, 0.5);
    g.fillStyle = '#0d0b09'; g.beginPath();
    for (let i = 0; i < 11; i++) { const a = i / 11 * TAU, k = hr * (0.6 + Rb() * 0.6); if (!i) g.moveTo(hx + Math.cos(a) * k, hy + Math.sin(a) * k); else g.lineTo(hx + Math.cos(a) * k, hy + Math.sin(a) * k); }
    g.closePath(); g.fill();
    g.strokeStyle = '#3a2e24'; g.lineWidth = 4; for (let i = 0; i < 2; i++) { const a = Rb() * Math.PI; g.beginPath(); g.moveTo(hx - Math.cos(a) * hr, hy - Math.sin(a) * hr); g.lineTo(hx + Math.cos(a) * hr, hy + Math.sin(a) * hr); g.stroke(); }
    g.fillStyle = 'rgba(120,110,96,0.7)'; for (let i = 0; i < 14; i++) { const a = Rb() * TAU, k = hr * (1 + Rb() * 0.6); g.fillRect(hx + Math.cos(a) * k, hy + Math.sin(a) * k, 2 + Rb() * 5, 2 + Rb() * 4); }
  }
  if (burnt) {
    g.save(); g.beginPath(); g.rect(r.x, r.y, r.w, r.h); g.clip();
    for (let i = 0; i < 4; i++) soot(g, r.x + Rb() * r.w, r.y + Rb() * r.h, Math.min(r.w, r.h) * (0.18 + Rb() * 0.22), 0.55);
    if (r.burn) {
      // glowing cracks where the fire is eating through the roof
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,120,40,0.55)'; g.lineWidth = 2; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) { let x = r.x + 12 + Rb() * (r.w - 24), y = r.y + 12 + Rb() * (r.h - 24); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Rb() - 0.5) * 28; y += (Rb() - 0.5) * 28; g.lineTo(x, y); } g.stroke(); }
      g.globalCompositeOperation = 'source-over'; g.lineCap = 'butt';
    }
    g.restore();
    if (c.bio === 'ash') { g.fillStyle = 'rgba(190,190,195,0.16)'; g.fillRect(r.x, r.y, r.w, r.h); }
  }
  if (c.bio === 'chaos' && Rb() < 0.5) { g.fillStyle = ['rgba(255,61,242,0.4)', 'rgba(125,255,74,0.35)', 'rgba(41,230,255,0.35)'][Math.floor(Rb() * 3)]; g.font = 'bold 18px sans-serif'; g.save(); g.translate(r.x + r.w * 0.5, r.y + r.h * 0.5); g.rotate(Rb() - 0.5); g.fillText(['RUN', 'HELP', 'NO WAY OUT', 'REPENT', 'GO WEST', 'X'][Math.floor(Rb() * 6)], -20, 6); g.restore(); }
  if (Rb() < 0.25 && r.w > 120 && r.h > 120 && !burnt && !win && st === 'block' && c.bio !== 'ruins') {
    g.save(); g.translate(r.x + r.w / 2, r.y + r.h / 2); g.rotate(-0.12);
    g.fillStyle = 'rgba(242,204,58,0.75)'; g.fillRect(-r.w * 0.36, -5, r.w * 0.72, 10); g.rotate(0.24); g.fillRect(-r.w * 0.36, -5, r.w * 0.72, 10);
    g.restore();
  }
}
// a car on its roof: the underside, axles and wheels showing
function drawFlipped(g, r) {
  const horiz = r.w > r.h, L = Math.max(r.w, r.h), Wd = Math.min(r.w, r.h);
  g.save(); g.translate(r.x + r.w / 2, r.y + r.h / 2); if (!horiz) g.rotate(Math.PI / 2);
  g.fillStyle = 'rgba(0,0,0,0.45)'; rrect(g, -L / 2 + 4, -Wd / 2 + 5, L, Wd, 6); g.fill();
  g.fillStyle = r.burnt ? '#1c1a19' : '#2b2c2e'; rrect(g, -L / 2, -Wd / 2, L, Wd, 6); g.fill();
  g.fillStyle = '#161616'; for (const x of [-L * 0.32, L * 0.32]) for (const y of [-Wd / 2 - 2, Wd / 2 - 5]) g.fillRect(x - 6, y, 12, 7);
  g.strokeStyle = '#454545'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-L * 0.32, -Wd / 2 + 4); g.lineTo(-L * 0.32, Wd / 2 - 4); g.moveTo(L * 0.32, -Wd / 2 + 4); g.lineTo(L * 0.32, Wd / 2 - 4); g.moveTo(-L * 0.4, 0); g.lineTo(L * 0.4, 0); g.stroke();
  g.fillStyle = '#3a3836'; g.fillRect(-L * 0.12, -Wd * 0.22, L * 0.24, Wd * 0.44);
  if (r.burnt) { g.fillStyle = '#ff7a1a'; g.fillRect(-4, -3, 2, 2); g.fillRect(6, 3, 2, 2); }
  g.restore();
}
// a soft round smudge of soot
function soot(g, x, y, r, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(8,6,5,' + a + ')'); gr.addColorStop(0.6, 'rgba(8,6,5,' + a * 0.45 + ')'); gr.addColorStop(1, 'rgba(8,6,5,0)');
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
function drawRubble(g, r, Rb) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(cx + 6, cy + 8, r.w / 2, r.h / 2, 0, 0, TAU); g.fill();
  const n = 5 + Math.floor(r.w * r.h / 900);
  for (let i = 0; i < Math.min(n, 14); i++) {
    // each slab a tilted four-sided chunk; the ones nearer the middle sit higher (lighter)
    const sx = r.x + Rb() * r.w, sy = r.y + Rb() * r.h, s = Math.min(r.w, r.h) * (0.2 + Rb() * 0.3), a = Rb() * Math.PI;
    const dm = 1 - Math.min(1, Math.hypot(sx - cx, sy - cy) / (Math.max(r.w, r.h) * 0.6)), sh = 0.75 + dm * 0.35;
    const base = parseInt(r.roof.slice(1), 16), cr = Math.min(255, ((base >> 16) * sh) | 0), cg = Math.min(255, (((base >> 8) & 255) * sh) | 0), cb = Math.min(255, ((base & 255) * sh) | 0);
    g.fillStyle = 'rgb(' + cr + ',' + cg + ',' + cb + ')'; g.beginPath();
    for (let k = 0; k < 4; k++) { const aa = a + k * Math.PI / 2 + (Rb() - 0.5) * 0.5, rr = s * (0.5 + Rb() * 0.3); const x = clamp(sx + Math.cos(aa) * rr, r.x, r.x + r.w), y = clamp(sy + Math.sin(aa) * rr, r.y, r.y + r.h); if (!k) g.moveTo(x, y); else g.lineTo(x, y); }
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1; g.stroke();
  }
  g.fillStyle = 'rgba(170,160,145,0.4)'; for (let i = 0; i < 12; i++) g.fillRect(r.x + Rb() * r.w, r.y + Rb() * r.h, 1.5 + Rb() * 4, 1.5 + Rb() * 3);
  g.strokeStyle = 'rgba(140,80,56,0.75)'; g.lineWidth = 1.2; for (let i = 0; i < 3; i++) { const x = r.x + Rb() * r.w, y = r.y + Rb() * r.h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Rb() - 0.5) * 24, y + (Rb() - 0.5) * 24); g.stroke(); }   // rebar
}
function drawLandmark(g, r, c, B, win, Rb) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(cx + 6, cy + 8, r.w / 2 + 4, r.h / 2 + 4, 0, 0, TAU); g.fill();
  switch (r.lm) {
    case 'fountain':
      g.fillStyle = '#6b6f75'; g.beginPath(); g.arc(cx, cy, r.w / 2, 0, TAU); g.fill();
      g.fillStyle = win ? '#b6cbd6' : '#1f4a56'; g.beginPath(); g.arc(cx, cy, r.w / 2 - 6, 0, TAU); g.fill();
      g.fillStyle = '#8a8f96'; g.beginPath(); g.arc(cx, cy, 9, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(200,235,245,0.4)'; g.lineWidth = 1.5; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(cx, cy, 14 + i * 5, 0, TAU); g.stroke(); }
      break;
    case 'tanker':
      g.save(); g.translate(cx, cy); g.rotate(0.5); g.fillStyle = '#1c1a19'; rrect(g, -40, -14, 80, 28, 10); g.fill(); g.fillStyle = '#2a2522'; g.fillRect(-26, -10, 48, 20); g.fillStyle = '#ff7a1a'; g.fillRect(-30, -2, 3, 3); g.fillRect(10, 4, 3, 3); g.restore();
      break;
    case 'checkpoint':
      g.fillStyle = '#6b6248'; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; g.beginPath(); g.ellipse(cx + Math.cos(a) * 24, cy + Math.sin(a) * 24, 9, 6, a, 0, TAU); g.fill(); }   // sandbags
      g.fillStyle = '#3e4a3a'; g.fillRect(cx - 12, cy - 12, 24, 24); g.fillStyle = '#f2cc3a'; g.fillRect(cx - 2, cy - 12, 4, 24);
      break;
    case 'deadtree':
      g.strokeStyle = '#1e1c1b'; g.lineCap = 'round';
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + Rb() * 0.3; g.lineWidth = 5 - i * 0.3; g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(cx + Math.cos(a + 0.4) * 22, cy + Math.sin(a + 0.4) * 22, cx + Math.cos(a) * 34, cy + Math.sin(a) * 34); g.stroke(); }
      g.fillStyle = '#2a2726'; g.beginPath(); g.arc(cx, cy, 9, 0, TAU); g.fill(); g.lineCap = 'butt';
      break;
    case 'plane':
      g.save(); g.translate(cx, cy); g.rotate(-0.15);
      g.fillStyle = '#9a9ea4'; rrect(g, -90, -14, 180, 28, 13); g.fill(); g.fillStyle = '#7a7e84'; g.beginPath(); g.moveTo(-20, -12); g.lineTo(-50, -60); g.lineTo(-30, -60); g.lineTo(10, -12); g.fill();
      g.fillStyle = '#1a1816'; g.beginPath(); g.ellipse(30, 0, 30, 15, 0, 0, TAU); g.fill();   // the break in the fuselage
      g.fillStyle = '#2a3a4a'; for (let i = 0; i < 8; i++) g.fillRect(-80 + i * 12, -5, 6, 4);
      g.restore();
      break;
    case 'playground':
      g.fillStyle = '#8a6a48'; g.fillRect(r.x, r.y, r.w, r.h); g.fillStyle = '#c9402e'; g.fillRect(r.x + 6, r.y + 6, 22, 40); g.fillStyle = '#2f6fb0'; g.fillRect(r.x + 36, r.y + 10, 30, 8); g.fillRect(r.x + 36, r.y + 30, 30, 8);
      g.strokeStyle = '#f2cc3a'; g.lineWidth = 3; g.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
      break;
    case 'tower':
      g.fillStyle = '#5a4d3c'; for (const [dx, dy] of [[-22, -22], [22, -22], [-22, 22], [22, 22]]) g.fillRect(cx + dx - 3, cy + dy - 3, 6, 6);
      g.fillStyle = '#8a8f96'; g.beginPath(); g.arc(cx, cy, 30, 0, TAU); g.fill(); g.fillStyle = '#6b6f75'; g.beginPath(); g.arc(cx, cy, 22, 0, TAU); g.fill();
      g.fillStyle = 'rgba(220,60,40,0.8)'; g.font = 'bold 11px sans-serif'; g.fillText('H2O', cx - 11, cy + 4);
      break;
    case 'mast':
      g.strokeStyle = '#8a8f96'; g.lineWidth = 3; g.strokeRect(r.x + 10, r.y + 10, r.w - 20, r.h - 20); g.beginPath(); g.moveTo(r.x + 10, r.y + 10); g.lineTo(r.x + r.w - 10, r.y + r.h - 10); g.moveTo(r.x + r.w - 10, r.y + 10); g.lineTo(r.x + 10, r.y + r.h - 10); g.stroke();
      g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(cx, cy, 4, 0, TAU); g.fill();
      break;
  }
}
// snow on the edges of roofs and cars in winter and up north
function snowCaps(g, c) {
  g.fillStyle = 'rgba(236,241,245,0.85)';
  for (const r of c.rects) {
    if (r.k === 'b' && r.st !== 'house' && r.st !== 'cabin') { g.fillRect(r.x + 2, r.y + 2, r.w - 4, 6); g.fillRect(r.x + 2, r.y + 2, 6, r.h - 4); }
    else if (r.k === 'barrier' || r.k === 'rail') g.fillRect(r.x, r.y, r.w, Math.min(r.h, 3));
  }
}
// streetlights for a chunk; how many work depends on the district
function lightsOf(cx, cy) {
  const R = chunkRng(cx, cy, 0x51f15e), ox = cx * CH, oy = cy * CH, L = [], b = distAt(cx, cy).bio;
  const p = { city: 0.85, burning: 0.45, chaos: 0.7, ruins: 0.35, ash: 0.35, suburb: 0.8, desert: 0.25, snow: 0.55 }[b] || 0.8;
  const cold = b === 'ash' || b === 'snow' ? 0.7 : 0.15;
  if (R() < p) L.push({ x: ox + ROAD + 10, y: oy + ROAD + 10, cold: R() < cold, broken: (b === 'ruins' || b === 'chaos') && R() < 0.45 });
  if (R() < p * 0.6) L.push({ x: ox + ROAD + BS * 0.5, y: oy + ROAD + 9, cold: false, broken: b === 'ruins' && R() < 0.4 });
  if (R() < p * 0.6) L.push({ x: ox + ROAD + 9, y: oy + ROAD + BS * 0.5, cold: false, broken: b === 'ruins' && R() < 0.4 });
  return L;
}
function bakeLights(g, c) {
  const ox = c.ox, oy = c.oy;
  g.globalCompositeOperation = 'lighter';
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    for (const L of lightsOf(c.cx + dx, c.cy + dy)) {
      if (L.broken || L.x < ox - 190 || L.x > ox + CH + 190 || L.y < oy - 190 || L.y > oy + CH + 190) continue;
      const gr = g.createRadialGradient(L.x, L.y, 4, L.x, L.y, 185);
      if (L.cold) { gr.addColorStop(0, 'rgba(150,190,255,0.24)'); gr.addColorStop(1, 'rgba(150,190,255,0)'); }
      else { gr.addColorStop(0, 'rgba(255,186,90,0.26)'); gr.addColorStop(0.5, 'rgba(255,170,70,0.08)'); gr.addColorStop(1, 'rgba(255,170,70,0)'); }
      g.fillStyle = gr; g.fillRect(L.x - 185, L.y - 185, 370, 370);
    }
  }
  g.globalCompositeOperation = 'source-over';
  for (const L of lightsOf(c.cx, c.cy)) { g.fillStyle = '#111'; g.beginPath(); g.arc(L.x, L.y, 4, 0, TAU); g.fill(); g.fillStyle = L.broken ? '#444' : L.cold ? '#d6e6ff' : '#ffe2a6'; g.beginPath(); g.arc(L.x, L.y, 2.5, 0, TAU); g.fill(); }
}
// the moving glints on a river, drawn once per chunk and slid back and forth while you play
function waterLayer(c) {
  if (c.wcan !== null && c.wcan !== undefined) return c.wcan;
  if (!c.fv || c.bio === 'desert' || c.bio === 'snow' || winterOn(c)) { c.wcan = false; return false; }
  const sc = Math.min(0.5, Q.chunkScale), can = document.createElement('canvas'); can.width = can.height = Math.round(CH * sc);
  const g = can.getContext('2d'); g.scale(sc, sc); g.translate(-c.ox, -c.oy);
  g.beginPath(); g.rect(c.ox + ROAD, c.oy + ROAD, BS, BS); g.clip();
  const bx = c.wbox || (c.wbox = isoBox(c.fv, 0.9)); if (!bx) { c.wcan = false; return false; }
  g.fillStyle = '#000'; isoFill(g, c.fv, c.ox, c.oy, -0.15, null, bx);
  g.globalCompositeOperation = 'source-in';
  const R = chunkRng(c.cx, c.cy, 0x9a7e);
  g.strokeStyle = 'rgba(190,230,240,0.5)'; g.lineWidth = 1.6; g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < 160; i++) { const x = c.ox + R() * CH, y = c.oy + R() * CH, l = 6 + R() * 16; g.moveTo(x, y); g.lineTo(x + l, y + l * 0.2); }
  g.stroke();
  c.wcan = can; c.wsc = sc;
  return can;
}
