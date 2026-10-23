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
  chunks.clear(); fieldsReset(); if (typeof skyReset === 'function') skyReset();
  if (typeof WCACHE !== 'undefined') WCACHE.clear();
}
function realSeason(d) { const m = (d || new Date()).getMonth(); return m >= 2 && m <= 4 ? 0 : m <= 7 ? 1 : m <= 10 ? 2 : 3; }
function seasonIdx() { return WORLD.season; }
function setSeason(i, quiet) {
  i = ((i | 0) % 4 + 4) % 4; if (i === WORLD.season) return;
  WORLD.season = i;
  // the city's art is redrawn for the new season, one block per frame so nothing stutters
  for (const c of chunks.values()) { c.stale = 1; c.wcan = null; c.skyStale = true; c.bf = undefined; }
  if (typeof WSPR !== 'undefined') WSPR.clear();
  if (!quiet && G.mode !== 'title') toast('The season turns', SEASONS[i], ['#ffa8e0', '#7dff4a', '#ff9a3a', '#bfe6ff'][i]);
}
function seasonFromSetting() {
  const s = SET.season;
  return s === 'spring' ? 0 : s === 'summer' ? 1 : s === 'fall' ? 2 : s === 'winter' ? 3 : realSeason();
}
// a fresh world for a run (or the title screen): a new seed unless the player fixed one, the season, a start point
function startWorld(title, o) {
  // o (co-op): the host's seed, map type, season and world scale, so every player walks the same city
  setWorldScale(o && o.scale != null ? o.scale : SET.scale === 'classic' ? 1 : SCALE_REAL);
  WORLD.mix = (o && o.mix) || SET.world || 'mixed';
  const seed = o && o.seed != null ? (o.seed | 0) : SET.seedMode === 'fixed' && SET.seed ? (SET.seed | 0) : (Math.random() * 1e9) | 0;
  worldSeed(seed); WORLD.lastSeed = seed;
  WORLD.season = o && o.season != null ? o.season : seasonFromSetting();
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
function bioAt(x, y) { return distAt(Math.floor(x / CHS), Math.floor(y / CHS)).bio; }
// the share of district b round the camera (0..1); without a mix yet, all or nothing by the current district
function bioK(b) { const m = WORLD.mixv; if (m && m[b] != null) return m[b]; return WORLD.cur ? (WORLD.cur.bio === b ? 1 : 0) : (b === 'city' ? 1 : 0); }
// a table of per-district numbers (or arrays of numbers) mixed by the share of each district round the camera
function bioBlend(T, out) {
  const m = WORLD.mixv, def = T.city; let s = 0;
  if (!m) { const v = T[WORLD.cur ? WORLD.cur.bio : 'city'] || def; return out && Array.isArray(v) ? (out.length = 0, out.push(...v), out) : v; }
  if (Array.isArray(def)) { out = out || []; out.length = def.length; out.fill(0); for (const b in m) { const w = m[b], v = T[b] || def; if (!w) continue; for (let i = 0; i < v.length; i++) out[i] += v[i] * w; s += w; } if (s > 0 && s !== 1) for (let i = 0; i < out.length; i++) out[i] /= s; return out; }
  let v = 0; for (const b in m) { const w = m[b]; if (!w) continue; v += (T[b] != null ? T[b] : def) * w; s += w; } return s > 0 ? v / s : def;
}

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
  x /= SCL; y /= SCL;
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
  const bk = [], b = c.k * 160; for (let i = 0; i < 16; i++) bk.push([]);
  for (const r of c.rects) {
    const x0 = clamp(Math.floor((r.x - c.sx) / b), 0, 3), x1 = clamp(Math.floor((r.x + r.w - c.sx) / b), 0, 3);
    const y0 = clamp(Math.floor((r.y - c.sy) / b), 0, 3), y1 = clamp(Math.floor((r.y + r.h - c.sy) / b), 0, 3);
    for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) bk[j * 4 + i].push(r);
  }
  c.bk = bk; c.bs = b;
}
function genChunk(cx, cy) {
  const R = chunkRng(cx, cy, 0), D = distAt(cx, cy), bio = D.bio;
  const ox = cx * CH, oy = cy * CH;
  const c = { cx: cx, cy: cy, ox: ox, oy: oy, sx: ox * SCL, sy: oy * SCL, k: SCL, type: '', rects: [], can: null, seen: 0, bio: bio, D: D, wm: null, fv: null, wet: false, decks: [],
    deco: [], props: [], fires: [], birds: [], puddles: [], decals: [], lights: null, lm: cx === D.lx && cy === D.ly };
  waterField(c);
  const B = BIO[bio], k = BIOGEN[bio] || BIOGEN.city;
  // a highway overhead keeps its strip of the block clear (SKYWAY); now and then the block is where an airliner came down
  if (typeof skyKeep === 'function') skyKeep(c);
  const Rw = chunkRng(cx, cy, 0x3ec4), crashP = { desert: 0.03, snow: 0.025, ruins: 0.03, ash: 0.02, burning: 0.012, chaos: 0.012, suburb: 0.008, city: 0.006 }[bio] || 0.01;
  if (!c.lm && !c.wm && Rw() < crashP) crashSite(c, R); else k(c, R, B);
  if (typeof skyPillars === 'function') skyPillars(c, R);
  roadside(c, R);
  streetLife(c, chunkRng(cx, cy, 0x51fe));
  railings(c);
  const heliP = bio === 'chaos' ? 0.05 : bio === 'city' || bio === 'burning' ? 0.02 : 0.014, planeP = bio === 'desert' ? 0.03 : bio === 'snow' ? 0.02 : bio === 'suburb' ? 0.012 : 0.006;
  if (c.type !== 'crash') { if (Rw() < heliP) smallWreck(c, Rw, 'heli'); else if (Rw() < planeP) smallWreck(c, Rw, 'cessna'); }
  // cosmetic details use their own random stream, so a device drawing more or fewer of them never changes the map
  decorate(c, chunkRng(cx, cy, 0x77d1));
  scaleChunk(c);
  return c;
}
/* ---------- real-world scale ----------
   A block is generated and drawn in its own units (CH = 640 wide, the numbers every drawing routine below uses). The
   game itself runs in simulation units, which are SCL times bigger: with the world scale on, a road is about 8 m wide,
   a car 4.5 m long and a person well under a metre across (32 units to the metre). So once a block has been laid out,
   everything the game touches (walls, trees, props, fires, birds, puddles) is moved into simulation units here, and
   renderChunk looks at the walls and fires through artView() so the drawing code keeps working in its own units. */
function scaleChunk(c) {
  const k = c.k;
  if (k !== 1) {
    for (const r of c.rects) { r.x *= k; r.y *= k; r.w *= k; r.h *= k; }
    for (const d of c.deco) { d.x *= k; d.y *= k; d.r *= d.k === 'tree' ? k * 1.25 : k; }
    for (const p of c.props) { p.x *= k; p.y *= k; }
    for (const f of c.fires) { f.x *= k; f.y *= k; f.r *= k; }
    for (const b of c.birds) { b.x *= k; b.y *= k; }
    for (const p of c.puddles) { p.x *= k; p.y *= k; p.rx *= k; p.ry *= k; }
  }
  bucketRects(c);
}
// the walls, fires and puddles in the drawing code's own units, while a block is being painted
function artView(c) {
  if (c.k === 1) return null;
  const q = 1 / c.k, keep = { rects: c.rects, fires: c.fires, puddles: c.puddles };
  c.rects = keep.rects.map(r => Object.assign({}, r, { x: r.x * q, y: r.y * q, w: r.w * q, h: r.h * q }));
  c.fires = keep.fires.map(f => Object.assign({}, f, { x: f.x * q, y: f.y * q, r: f.r * q }));
  c.puddles = keep.puddles.map(p => Object.assign({}, p, { x: p.x * q, y: p.y * q, rx: p.rx * q, ry: p.ry * q }));
  return keep;
}
function artDone(c, keep) { if (keep) { c.rects = keep.rects; c.fires = keep.fires; c.puddles = keep.puddles; } }
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
  if (c.nb) for (const r of c.nb) if (x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y) return false;
  return true;
}
// a driveway, a plowed lane or a market aisle: nothing solid is put on it afterwards
function keepClear(c, x, y, w, h) { (c.nb || (c.nb = [])).push({ x: x, y: y, w: w, h: h }); }
// a solid thing that is not a building (benches, stalls, dumpsters, wood piles...)
function addThing(c, k, x, y, w, h, o, pad) {
  if (!freeAt(c, x, y, w, h, pad == null ? 2 : pad)) return null;
  const r = Object.assign({ x: x, y: y, w: w, h: h, k: k }, o || {}); c.rects.push(r); return r;
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
  const r = Object.assign({ x: x, y: y, w: w, h: h, k: 'car', vt: 'sedan', fd: 1, col: CARS[Math.floor(R() * CARS.length)], burnt: R() < 0.22, s: (R() * 1e9) | 0 }, o || {});
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
const PROPS = { barrel: { r: 11, hp: 26, m: 3 }, cone: { r: 7, hp: 1e9, m: 0.6 }, can: { r: 9, hp: 1e9, m: 1.2 }, tire: { r: 10, hp: 1e9, m: 1.6 }, crate: { r: 11, hp: 1e9, m: 2.2 },
  // 1.9.998: a wheelie bin (0.58 by 0.74 m), a shopping cart (1.06 by 0.58 m), a bicycle on its side (1.75 m)
  bin: { r: 10, hp: 1e9, m: 1.8 }, cart: { r: 12, hp: 1e9, m: 1.4 }, bike: { r: 13, hp: 1e9, m: 1.0 } };

// the usual city block layouts, shared by downtown, burning, riot and ash districts
function urbanBlock(c, R, B, opts) {
  const ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD, M = 16, IN = BS - 2 * M;
  const T = opts.types, type = c.lm ? 'plaza' : T[Math.floor(R() * T.length)];
  c.type = type;
  if (type === 'big') addB(c, R, B, bx + M, by + M, IN, IN);
  else if (type === 'two') {
    const al = 64 + R() * 30, f = 0.35 + R() * 0.3;
    if (R() < 0.5) { const w1 = (IN - al) * f; addB(c, R, B, bx + M, by + M, w1, IN); addB(c, R, B, bx + M + w1 + al, by + M, IN - w1 - al, IN); alleyProps(c, R, bx + M + w1, by + M, al, IN, true, opts); }
    else { const h1 = (IN - al) * f; addB(c, R, B, bx + M, by + M, IN, h1); addB(c, R, B, bx + M, by + M + h1 + al, IN, IN - h1 - al); alleyProps(c, R, bx + M, by + M + h1, IN, al, false, opts); }
  } else if (type === 'four') {
    const al = 60 + R() * 20, s1 = (IN - al) * (0.4 + R() * 0.2), s2 = (IN - al) * (0.4 + R() * 0.2);
    const xs = [bx + M, bx + M + s1 + al], ws = [s1, IN - s1 - al], ys = [by + M, by + M + s2 + al], hs = [s2, IN - s2 - al];
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if (R() < 0.88) addB(c, R, B, xs[i], ys[j], ws[i], hs[j]);
    if (R() < 0.7) alleyProps(c, R, bx + M + s1, by + M, al, IN, true, opts); else alleyProps(c, R, bx + M, by + M + s2, IN, al, false, opts);
  } else if (type === 'lot') {
    // 1.9.998: real stalls (2.7 by 5.5 m) in four rows, two of them back to back, with 7 m aisles; cars nose in or back in
    addB(c, R, B, bx + BS - 96, by + BS - 92, 54, 50);
    for (const ry of LOT_ROWS) for (let i = 0; i < 13; i++) if (R() < 0.5) { const vt = vehPick(R, 'lot', 72, 30), V = VEH[vt]; placeVeh(c, R, 'lot', bx + 20 + i * 36 + (36 - V.W) / 2, by + ry + (73 - V.L) / 2, false, R() < 0.5 ? 1 : -1, { vt: vt, burnt: opts.burnt ? R() < opts.burnt : R() < 0.15 }); }
  } else if (type === 'plaza') {
    const q = [[0.22, 0.22], [0.78, 0.22], [0.22, 0.78], [0.78, 0.78]], cxp = bx + BS / 2, cyp = by + BS / 2;
    // the landmark square keeps its fountain (or tanker, checkpoint...); the others are one of four kinds of square
    const pv = c.lm ? 'landmark' : ['garden', 'square', 'market', 'court'][Math.floor(R() * 4)];
    c.pv = pv;
    if (pv === 'landmark' || pv === 'square') for (const p of q) addThing(c, 'planter', bx + BS * p[0] - 22, by + BS * p[1] - 22, 44, 44);
    if (pv === 'landmark') { const m = opts.landmark || 'fountain'; if (freeAt(c, cxp - 34, cyp - 34, 68, 68, 2)) c.rects.push({ x: cxp - 30, y: cyp - 30, w: 60, h: 60, k: 'lm', lm: m }); }
    else if (pv === 'garden') {
      // a small park: rows of trees in planters, benches along the paths, flower beds
      for (const fx of [0.18, 0.5, 0.82]) for (const fy of [0.2, 0.8]) addThing(c, 'planter', bx + BS * fx - 22, by + BS * fy - 22, 44, 44);
      for (const [x, y, w, h] of [[cxp - 80, cyp - 34, 34, 12], [cxp + 46, cyp - 34, 34, 12], [cxp - 80, cyp + 22, 34, 12], [cxp + 46, cyp + 22, 34, 12]]) addThing(c, 'bench', x, y, w, h, { low: true });
      c.decals.push({ k: 'beds', x: bx + 16, y: by + 16, w: BS - 32, h: BS - 32, s: (R() * 1e9) | 0 });
    } else if (pv === 'square') {
      // a paved square: a statue in the middle, benches facing it, a news kiosk
      addThing(c, 'statue', cxp - 18, cyp - 18, 36, 36, { s: (R() * 1e9) | 0 });
      for (const [x, y, w, h] of [[cxp - 17, cyp - 70, 34, 12], [cxp - 17, cyp + 58, 34, 12], [cxp - 70, cyp - 17, 12, 34], [cxp + 58, cyp - 17, 12, 34]]) addThing(c, 'bench', x, y, w, h, { low: true });
      const kx = R() < 0.5 ? bx + 70 : bx + BS - 104, ky = R() < 0.5 ? by + BS / 2 - 90 : by + BS / 2 + 60;
      addThing(c, 'kiosk', kx, ky, 34, 26, { s: (R() * 1e9) | 0 });
    } else if (pv === 'market') {
      // market stalls in two rows with an aisle between them
      keepClear(c, bx + 24, cyp - 26, BS - 48, 52);
      for (const row of [-1, 1]) for (let i = 0; i < 4; i++) if (R() < 0.85) addThing(c, 'stall', bx + 46 + i * ((BS - 92 - 54) / 3), cyp + (row < 0 ? -96 : 44), 54, 52, { s: (R() * 1e9) | 0, burnt: !!opts.burnt && R() < opts.burnt });
      for (let i = 0; i < 3; i++) addProp(c, 'crate', bx + 50 + R() * (BS - 100), cyp + (R() < 0.5 ? -130 : 112), R);
    } else {
      // a basketball court, fenced in, with a hoop at each end
      const cw = 300, chh = 170, x0 = cxp - cw / 2, y0 = cyp - chh / 2;
      c.court = { x: x0, y: y0, w: cw, h: chh };
      addThing(c, 'hoop', x0 + 6, cyp - 6, 12, 12, null, 0); addThing(c, 'hoop', x0 + cw - 18, cyp - 6, 12, 12, null, 0);
      const fz = 18;
      for (const side of [-1, 1]) { const y = side < 0 ? y0 - fz : y0 + chh + fz - 4, gap = cxp - 30 + (R() - 0.5) * 100; addThing(c, 'fence', x0 - fz, y, gap - (x0 - fz), 4, { low: true, wire: true }, 0); addThing(c, 'fence', gap + 60, y, x0 + cw + fz - gap - 60, 4, { low: true, wire: true }, 0); }
      for (const side of [-1, 1]) { const x = side < 0 ? x0 - fz : x0 + cw + fz - 4; addThing(c, 'fence', x, y0 - fz + 4, 4, chh + fz * 2 - 8, { low: true, wire: true }, 0); }
    }
  }
}
const LOT_ROWS = [28, 194, 267, 433];   // the stall rows of a parking lot (top edges, block units below the block's corner)
// what fills an alley between two buildings: a dumpster or two against the wall, bags of trash, the odd crate
function alleyProps(c, R, x, y, w, h, vert, opts) {
  const n = R() < 0.75 ? 1 + (R() < 0.35 ? 1 : 0) : 0;
  for (let i = 0; i < n; i++) {
    const wall = R() < 0.5, burnt = !!opts.burnt && R() < opts.burnt;
    // (1.9.998: real front-load dumpsters, 1.83 m wide against the wall and 2, 4, 6 or 8 yards deep; bags piled beside)
    const yd = Math.floor(R() * 4), dp = [12, 18, 22, 24][yd], ht = [1.0, 1.2, 1.5, 1.85][yd], L = 24.4;
    const d = vert ? addThing(c, 'dumpster', wall ? x + 3 : x + w - 3 - dp, y + 40 + R() * (h - 110), dp, L, { col: R(), burnt: burnt, ht: ht, yd: yd })
      : addThing(c, 'dumpster', x + 40 + R() * (w - 110), wall ? y + 3 : y + h - 3 - dp, L, dp, { col: R(), burnt: burnt, ht: ht, yd: yd });
    if (d && R() < 0.65) { const bw = 14 + R() * 6, bh = 10 + R() * 4; if (vert) addThing(c, 'bags', wall ? x + 3 : x + w - 3 - bh, d.y + d.h + 2, bh, bw, { low: true, s: (R() * 1e9) | 0 }, 1); else addThing(c, 'bags', d.x + d.w + 2, wall ? y + 3 : y + h - 3 - bh, bw, bh, { low: true, s: (R() * 1e9) | 0 }, 1); }
  }
  c.decals.push({ k: 'alley', x: x, y: y, w: w, h: h, v: vert, s: (R() * 1e9) | 0 });
  if (R() < 0.4) addProp(c, R() < 0.5 ? 'can' : 'crate', vert ? x + w / 2 : x + 40 + R() * (w - 80), vert ? y + 40 + R() * (h - 80) : y + h / 2, R);
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
        // (1.9.998: real jersey barriers, 3.05 m long and 0.61 m thick, two across the road and a gap to squeeze through)
        const o = gap === 0 ? [28, 68][k - 1] : gap === 1 ? [4, 68][k === 0 ? 0 : 1] : [4, 44][k];
        if (horiz) { const y = oy + o; if (waterAtC(c, at, y) !== 3) c.rects.push({ x: at, y: y, w: 8, h: 40, k: 'barrier' }); }
        else { const x = ox + o; if (waterAtC(c, x, at) !== 3) c.rects.push({ x: x, y: at, w: 40, h: 8, k: 'barrier' }); }
      }
    }
    if (R() < 0.6) { const x = ox + ROAD + 40 + R() * (BS - 140), y = oy + 30 + R() * 30; placeVeh(c, R, 'chaos', x, y, true, R() < 0.5 ? 1 : -1, { vt: R() < 0.75 ? 'police' : R() < 0.5 ? 'humvee' : 'ambulance', burnt: false }); }
    // cars flipped over and left across the road
    if (R() < 0.6) { const horiz = R() < 0.5, x = horiz ? ox + ROAD + 30 + R() * (BS - 120) : ox + 30 + R() * 30, y = horiz ? oy + 30 + R() * 30 : oy + ROAD + 30 + R() * (BS - 120); placeVeh(c, R, 'chaos', x, y, horiz, R() < 0.5 ? 1 : -1, { flip: true, burnt: R() < 0.4, maxL: 70, maxW: 31 }); }
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
    // four houses with yards: a driveway out to the street (often with the car on it), sometimes a pool or a shed
    // out back, trees, and fences between some of the yards
    const half = BS / 2;
    for (let qx = 0; qx < 2; qx++) for (let qy = 0; qy < 2; qy++) {
      const lx = bx + qx * half, ly = by + qy * half;
      if (R() < 0.12) continue;
      const w = 96 + R() * 46, h = 84 + R() * 40, x = lx + 30 + R() * (half - w - 60), y = ly + 30 + R() * (half - h - 60);
      const hs = addB(c, R, B, x, y, w, h, 'house');
      if (!hs) continue;
      // the driveway runs beside the house to the nearer street (the top one for the top yards, the bottom one for the others)
      const dx = qx ? hs.x - 44 : hs.x + hs.w + 8, d0 = qy ? hs.y + 8 : by + 2, d1 = qy ? by + BS - 2 : hs.y + hs.h - 8;
      if (dx > lx + 4 && dx + 36 < lx + half - 4 && freeAt(c, dx, d0, 36, d1 - d0, 0)) {
        c.decals.push({ k: 'drive', x: dx, y: d0, w: 36, h: d1 - d0, top: !qy, s: (R() * 1e9) | 0 });
        keepClear(c, dx, d0, 36, d1 - d0);
        if (R() < 0.55) { c.nb.pop(); const vt = vehPick(R, 'drive', 72, 30), V = VEH[vt]; placeVeh(c, R, 'drive', dx + (36 - V.W) / 2, qy ? by + BS - 18 - V.L : by + 16, false, qy ? 1 : -1, { vt: vt, burnt: false }); keepClear(c, dx, d0, 36, d1 - d0); }
      }
      const back = qy ? -1 : 1;   // the side of the house away from the street
      if (R() < 0.24) { const pw = 58 + R() * 20, ph = 34 + R() * 10, px = hs.x + (hs.w - pw) * R(), py = back > 0 ? hs.y + hs.h + 18 : hs.y - ph - 18; addThing(c, 'pool', px, py, pw, ph, { low: true, s: (R() * 1e9) | 0 }, 6); }
      else if (R() < 0.3) { const sx = qx ? lx + half - 60 : lx + 26, sy = back > 0 ? ly + half - 56 : ly + 26; addB(c, R, B, sx, sy, 30 + R() * 8, 26 + R() * 6, 'shed'); }
      // trees
      const nt = 1 + Math.floor(R() * 2);
      for (let i = 0; i < nt; i++) addTrunk(c, R, lx + 26 + R() * (half - 52), ly + 26 + R() * (half - 52), R() < 0.15 ? 'blossom' : R() < 0.25 ? 'pine' : 'oak');
      c.decals.push({ k: 'flowers', x: hs.x, y: qy ? hs.y + hs.h + 2 : hs.y - 10, w: hs.w, h: 8, s: (R() * 1e9) | 0 });
    }
    if (R() < 0.7) { const y = by + half - 2, g0 = R() * (BS - 80); if (freeAt(c, bx + 16, y, g0, 4, 0)) c.rects.push({ x: bx + 16, y: y, w: Math.max(0, g0 - 16), h: 4, k: 'fence', low: true }); const x1 = bx + g0 + 60; if (freeAt(c, x1, y, bx + BS - 16 - x1, 4, 0)) c.rects.push({ x: x1, y: y, w: Math.max(0, bx + BS - 16 - x1), h: 4, k: 'fence', low: true }); }
    if (R() < 0.7) { const x = bx + half - 2, g0 = R() * (BS - 80); if (freeAt(c, x, by + 16, 4, g0, 0)) c.rects.push({ x: x, y: by + 16, w: 4, h: Math.max(0, g0 - 16), k: 'fence', low: true }); const y1 = by + g0 + 60; if (freeAt(c, x, y1, 4, by + BS - 16 - y1, 0)) c.rects.push({ x: x, y: y1, w: 4, h: Math.max(0, by + BS - 16 - y1), k: 'fence', low: true }); }
    for (let i = 0; i < 2; i++) if (R() < 0.6) addProp(c, 'can', bx + 8 + R() * 6, by + 30 + R() * (BS - 60), R);
  },
  desert(c, R, B) {
    const ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD;
    c.type = 'open';
    if (c.lm) { if (freeAt(c, bx + BS / 2 - 40, by + BS / 2 - 40, 80, 80, 4)) c.rects.push({ x: bx + BS / 2 - 36, y: by + BS / 2 - 36, w: 72, h: 72, k: 'lm', lm: 'tower' }); }
    else {
      const t = R();
      // a little adobe town, a gas station on the highway, a ranch, a few tin shacks, a trailer, or a wind pump
      if (t < 0.17) { const w = 70 + R() * 50, h = 60 + R() * 40; addB(c, R, B, bx + 40 + R() * (BS - w - 80), by + 40 + R() * (BS - h - 80), w, h, 'adobe'); if (R() < 0.6) { const w2 = 50 + R() * 30; addB(c, R, B, bx + 50 + R() * (BS - w2 - 100), by + 50 + R() * (BS - w2 - 100), w2, w2 * 0.9, 'adobe'); } }
      else if (t < 0.29) { addB(c, R, B, bx + 30, by + 40, 110, 70, 'adobe'); addThing(c, 'pump', bx + 190, by + 60, 18, 18); addThing(c, 'pump', bx + 250, by + 60, 18, 18); c.decals.push({ k: 'canopy', x: bx + 160, y: by + 30, w: 140, h: 80 }); addProp(c, 'barrel', bx + 160 + R() * 120, by + 130 + R() * 30, R); }
      else if (t < 0.41) {
        // a ranch: a barn and a corral fence with a gate, a water trough
        const rx = bx + 50 + R() * 60, ry = by + 50 + R() * 60, rw = 230 + R() * 60, rh = 170 + R() * 50, gate = R();
        addB(c, R, B, rx + rw + 26 > bx + BS - 40 ? rx : rx + rw + 26, rx + rw + 26 > bx + BS - 40 ? ry + rh + 26 : ry, 96, 70, 'barn');
        const fx = (x, y, w, h) => addThing(c, 'fence', x, y, w, h, { low: true, ranch: true }, 0);
        fx(rx, ry, rw, 4); fx(rx, ry, 4, rh); fx(rx + rw - 4, ry, 4, rh);
        const gx = rx + rw * (0.2 + gate * 0.5); fx(rx, ry + rh - 4, gx - rx, 4); fx(gx + 56, ry + rh - 4, rx + rw - gx - 56, 4);
        addThing(c, 'trough', rx + 30 + R() * (rw - 100), ry + 30 + R() * (rh - 80), 40, 14);
      } else if (t < 0.51) {
        // tin shacks, a junked car and some barrels
        const n = 1 + (R() < 0.6 ? 1 : 0);
        for (let i = 0; i < n; i++) { const w = 54 + R() * 30, h = 44 + R() * 20; addB(c, R, B, bx + 40 + R() * (BS - w - 80), by + 40 + R() * (BS - h - 80), w, h, 'shack'); }
        placeVeh(c, R, 'desert', bx + 60 + R() * (BS - 180), by + 60 + R() * (BS - 140), R() < 0.5, 1, { burnt: true, rust: true, maxL: 70 });
        for (let i = 0; i < 3; i++) addProp(c, 'barrel', bx + 40 + R() * (BS - 80), by + 40 + R() * (BS - 80), R);
      } else if (t < 0.59) {
        // a trailer home with an awning and a couple of chairs out front
        const tx = bx + 60 + R() * (BS - 220), ty = by + 70 + R() * (BS - 180), tr = addB(c, R, B, tx, ty, 108, 38, 'trailer');
        if (tr) c.decals.push({ k: 'awning', x: tr.x + 14, y: tr.y + tr.h, w: 64, h: 34, s: (R() * 1e9) | 0 });
        addProp(c, 'barrel', tx + 120, ty + 10, R);
      } else if (t < 0.66) {
        // a wind pump over a well, and the water tank it fills
        const wx = bx + 100 + R() * (BS - 240), wy = by + 100 + R() * (BS - 240);
        addThing(c, 'windmill', wx, wy, 24, 24, { s: (R() * 1e9) | 0 }); addThing(c, 'tank', wx + 50, wy - 6, 36, 36);
      }
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
    const t = c.lm ? 1 : R();
    let np;
    if (t < 0.4) {
      // a hamlet: a plowed lane in from the road with cabins along it, each with its wood pile, the odd shed and fence
      c.type = 'hamlet';
      const vert = R() < 0.5, at = (vert ? bx : by) + 130 + R() * (BS - 260), len = BS * (0.55 + R() * 0.35);
      const lane = vert ? { x: at - 18, y: by, w: 36, h: len } : { x: bx, y: at - 18, w: len, h: 36 };
      c.decals.push(Object.assign({ k: 'plow', v: vert, s: (R() * 1e9) | 0 }, lane)); keepClear(c, lane.x, lane.y, lane.w, lane.h);
      const n = 2 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1, along = 40 + (i / n) * (len - 120) + R() * 30, w = 62 + R() * 30, h = 52 + R() * 24;
        const x = vert ? (side < 0 ? at - 30 - w : at + 30) : bx + along, y = vert ? by + along : (side < 0 ? at - 30 - h : at + 30);
        const cb = addB(c, R, B, x, y, w, h, 'cabin');
        if (!cb) continue;
        // the wood pile against the wall, and a path to the door
        if (vert) addThing(c, 'wood', side < 0 ? cb.x + cb.w * 0.2 : cb.x + cb.w * 0.4, cb.y + cb.h + 6, 30, 12, { low: true });
        else addThing(c, 'wood', cb.x + cb.w + 6, cb.y + cb.h * 0.3, 12, 30, { low: true });
        if (R() < 0.3) addB(c, R, B, vert ? (side < 0 ? cb.x - 40 : cb.x + cb.w + 14) : cb.x + 10, vert ? cb.y + 10 : (side < 0 ? cb.y - 40 : cb.y + cb.h + 14), 28, 24, 'shed');
        if (R() < 0.35) { const fy = vert ? cb.y - 14 : (side < 0 ? cb.y - 16 : cb.y + cb.h + 12); addThing(c, 'fence', cb.x - 6, fy, cb.w + 12, 4, { low: true }, 0); }
      }
      np = 3 + Math.floor(R() * 4);
    } else if (t < 0.52) {
      // a ski lodge: one big timber building, cars out front under the snow
      c.type = 'lodge';
      const lx = bx + 60 + R() * (BS - 300), ly = by + 70 + R() * (BS - 280), lg = addB(c, R, B, lx, ly, 170 + R() * 40, 104 + R() * 20, 'lodge');
      if (lg) { for (let i = 0; i < 3; i++) if (R() < 0.7) placeVeh(c, R, 'snow', lg.x + 10 + i * 46, lg.y + lg.h + 26, false, -1, { burnt: false, maxL: 66, maxW: 31 }); addThing(c, 'wood', lg.x + lg.w + 10, lg.y + 20, 14, 40, { low: true }); }
      np = 4 + Math.floor(R() * 4);
    } else {
      // the woods: pines, a cabin or two, fallen logs
      const nb = R() < 0.55 ? 1 + Math.floor(R() * 2) : 0;
      for (let i = 0; i < nb; i++) { const w = 70 + R() * 50, h = 60 + R() * 40; const cb = addB(c, R, B, bx + 30 + R() * (BS - w - 60), by + 30 + R() * (BS - h - 60), w, h, 'cabin'); if (cb && R() < 0.7) addThing(c, 'wood', cb.x + cb.w + 6, cb.y + 8, 12, 28, { low: true }); }
      for (let i = 0; i < 2; i++) if (R() < 0.5) { const v = R() < 0.5; addThing(c, 'log', bx + 30 + R() * (BS - 100), by + 30 + R() * (BS - 100), v ? 11 : 52, v ? 52 : 11, { low: true }); }
      np = 6 + Math.floor(R() * 8);
    }
    // pines, often in little stands of three or four
    for (let i = 0; i < np; i++) {
      const x = bx + 24 + R() * (BS - 48), y = by + 24 + R() * (BS - 48);
      addTrunk(c, R, x, y, 'pine', 26 + R() * 14);
      if (R() < 0.35) for (let k = 0; k < 2; k++) addTrunk(c, R, x + (R() - 0.5) * 90, y + (R() - 0.5) * 90, 'pine', 20 + R() * 12);
    }
    const nr = Math.floor(R() * 3);
    for (let i = 0; i < nr; i++) { const s = 18 + R() * 24; addRock(c, R, bx + 20 + R() * (BS - 40 - s), by + 20 + R() * (BS - 40 - s), s, s * 0.8); }
    if (R() < 0.4) addProp(c, R() < 0.5 ? 'crate' : 'barrel', bx + 20 + R() * (BS - 40), by + 20 + R() * (BS - 40), R);
  }
};
// vehicles along the streets: up to two on each road of the block, at the curbs, facing the way traffic went
function roadside(c, R) {
  const ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD, bio = c.bio;
  const p = bio === 'desert' ? 0.22 : bio === 'snow' ? 0.3 : bio === 'suburb' ? 0.35 : bio === 'chaos' ? 0.75 : 0.5;
  const burnt = bio === 'burning' ? 0.7 : bio === 'ash' ? 0.85 : bio === 'ruins' ? 0.5 : 0.22, mix = VMIX[bio] ? bio : 'city';
  const deck = (x, y, w, h) => c.wm && (waterAtC(c, x, y) === 3 || waterAtC(c, x + w, y + h) === 3 || waterAtC(c, x + w / 2, y + h / 2) === 3);
  for (let k = 0; k < 2; k++) {
    if (R() < p * (k ? 0.5 : 1)) {
      const top = R() < 0.5, vt = vehPick(R, mix, BS - 90), V = VEH[vt], x = bx + 30 + R() * Math.max(1, BS - 60 - V.L), y = top ? oy + 16 : oy + ROAD - 16 - V.W;
      if (!deck(x, y, V.L, V.W)) placeVeh(c, R, mix, x, y, true, top ? -1 : 1, { vt: vt, burnt: R() < burnt });
    }
    if (R() < p * (k ? 0.5 : 1)) {
      const left = R() < 0.5, vt = vehPick(R, mix, BS - 90), V = VEH[vt], y = by + 30 + R() * Math.max(1, BS - 60 - V.L), x = left ? ox + 16 : ox + ROAD - 16 - V.W;
      if (!deck(x, y, V.W, V.L)) placeVeh(c, R, mix, x, y, false, left ? 1 : -1, { vt: vt, burnt: R() < burnt });
    }
  }
}
// 1.9.998: the small things of a street, at their real sizes and from their own random stream (so adding them moves
// nothing else): wheelie bins out on the sidewalks and at the ends of driveways, shopping carts left in the lots and
// the streets, bicycles dropped on their side, pallets stacked in the alleys and among the ruins, bags of trash, and
// roll-off containers (6.7 by 2.4 m) of rubble at the curb where a building was being cleared
function streetLife(c, R) {
  const bio = c.bio, ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD, urban = bio === 'city' || bio === 'chaos' || bio === 'burning' || bio === 'ash' || bio === 'ruins';
  if (bio === 'desert' || bio === 'snow') { if (R() < 0.25) addThing(c, 'pallets', bx + 20 + R() * (BS - 60), by + 20 + R() * (BS - 60), 16, 13, { low: true, n: 1 + Math.floor(R() * 3), s: (R() * 1e9) | 0 }, 2); return; }
  // bins on the sidewalk ring, by the buildings
  const nb = urban ? Math.floor(R() * 4) : 0;
  for (let i = 0; i < nb; i++) { const e = Math.floor(R() * 2), t = 30 + R() * (BS - 60); addProp(c, 'bin', e ? bx + 8 : bx + t, e ? by + t : by + 8, R); }
  // the suburbs put their bins out at the end of the driveway
  if (bio === 'suburb') for (const d of c.decals) if (d.k === 'drive' && R() < 0.6) { const yy = d.top ? d.y + 10 : d.y + d.h - 10; addProp(c, 'bin', d.x + d.w + 8, yy, R); if (R() < 0.5) addProp(c, 'bin', d.x + d.w + 8, yy + (d.top ? 16 : -16), R); if (R() < 0.18) addProp(c, 'bike', d.x + d.w / 2, d.top ? d.y + 70 : d.y + d.h - 70, R); }
  // carts: in the parking lots, and pushed out into the street
  if (c.type === 'lot') for (let i = 0; i < 1 + Math.floor(R() * 3); i++) addProp(c, 'cart', bx + 30 + R() * (BS - 60), by + 120 + R() * 60 + (R() < 0.5 ? 0 : 240), R);
  if (urban && R() < 0.3) addProp(c, 'cart', ox + 20 + R() * (CH - 40), oy + 20 + R() * (ROAD - 40), R);
  if ((urban || bio === 'suburb') && R() < 0.2) addProp(c, 'bike', bx + 8 + R() * 4, by + 40 + R() * (BS - 80), R);
  // pallets in the ruins and the lots
  if ((bio === 'ruins' || c.type === 'lot' || bio === 'burning') && R() < 0.5) addThing(c, 'pallets', bx + 24 + R() * (BS - 70), by + 24 + R() * (BS - 70), 16, 13, { low: true, n: 1 + Math.floor(R() * 4), s: (R() * 1e9) | 0 }, 2);
  // a roll-off at the curb
  if ((bio === 'ruins' || bio === 'burning' || bio === 'city') && R() < (bio === 'city' ? 0.12 : 0.3)) {
    const top = R() < 0.5, x = bx + 40 + R() * (BS - 160); addThing(c, 'rolloff', x, top ? oy + 14 : oy + ROAD - 14 - 33, 89, 33, { ht: 1.22, col: R(), s: (R() * 1e9) | 0, burnt: bio === 'burning' && R() < 0.6 }, 3);
  }
  // bags of trash dumped along the curb when the collections stopped
  if (urban && R() < 0.45) { const n = 1 + Math.floor(R() * 3), x0 = bx + 20 + R() * (BS - 120); for (let i = 0; i < n; i++) addThing(c, 'bags', x0 + i * 18, by + 2, 15, 10, { low: true, s: (R() * 1e9) | 0 }, 0); }
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
  const bio = c.bio, ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD, dm = (Q.deco || 1) * (c.k > 1.2 ? 1.9 : 1);
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
    case 'city': if (c.type === 'plaza') { bush(n(4), 'round'); birds(0.7, 'pigeon', 7); } else birds(0.15, 'pigeon', 5); puddles(n(3)); if (c.k > 1.2) for (let i = 0; i < n(6); i++) c.decals.push({ k: 'litter', x: ox + R() * CH, y: oy + R() * CH, s: (R() * 1e9) | 0 }); break;
    case 'burning': puddles(n(1)); break;
    case 'chaos': puddles(n(2)); birds(0.25, 'crow', 5); for (let i = 0; i < n(5); i++) c.decals.push({ k: 'litter', x: ox + R() * CH, y: oy + R() * CH, s: (R() * 1e9) | 0 }); break;
    case 'ruins': bush(n(2), 'weed'); grass(n(5), 'weed'); birds(0.35, 'crow', 6); puddles(n(2)); if (c.k > 1.2) for (let i = 0; i < n(8); i++) c.decals.push({ k: 'litter', x: ox + R() * CH, y: oy + R() * CH, s: (R() * 1e9) | 0 }); break;
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
    const c = getChunk(cx, cy), x = cx * CH + 56, y = cy * CH + 56, sx = x * SCL, sy = y * SCL;
    if (waterAtC(c, x, y) || blocked(sx, sy, 30)) continue;
    let fire = false; for (const f of c.fires) if (f.hz && Math.hypot(f.x - sx, f.y - sy) < 200 * SCL) fire = true;
    if (fire) continue;
    return { x: sx, y: sy };
  }
  return { x: 56 * SCL, y: 56 * SCL };
}
// the district under the camera; a new one is announced
function trackDistrict(x, y) {
  const D = distAt(Math.floor(x / CHS), Math.floor(y / CHS));
  // 1.9.998: how much of each district is round the camera (the same falloff as the ground blend), so the colour grade
  // and the shaders shade from one district into the next over a block instead of switching at a line
  if (typeof bioMix === 'function') WORLD.mixv = bioMix(x, y, WORLD.mixv || {});
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
function isoFill(g, f, ox, oy, L, segs, box, noFill) {
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
  if (!noFill) g.fill();
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
  const tc = performance.now();
  try { chunkPaint(c); } finally { const ms = performance.now() - tc; coreCost('WORLD', ms); WORLD.rfMs = (WORLD.rfMs || 0) + ms; worldLearn(ms); }
}
function chunkPaint(c) {
  // the picture is sharp at the scale it is shown at: SCL times the block's drawing units (kept under 2048 pixels)
  const sc = Q.chunkScale, px = Math.min(sc * c.k, 2048 / CH), can = document.createElement('canvas'); can.width = can.height = Math.round(CH * px);
  const g = can.getContext('2d'); g.scale(px, px); c.sc = sc; c.px = px;
  const keep = artView(c);
  try {
  const R = chunkRng(c.cx, c.cy, 0xabc123), B = BIO[c.bio], ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD, win = winterOn(c), dm = Q.deco || 1, sea = WORLD.season;
  g.translate(-ox, -oy);
  const RT = WORLD.rt || (WORLD.rt = { road: 0, block: 0, water: 0, decal: 0, rects: 0, light: 0 }); let t0 = performance.now(), t1;
  // the road
  g.fillStyle = B.road; g.fillRect(ox, oy, CH, CH);
  speckle(g, R, ox, oy, CH, CH, Math.floor(260 * dm), 'rgba(255,255,255,0.03)', 'rgba(0,0,0,0.16)');
  // where another paved district owns some of this road, its asphalt (before the lines go on: TEXEL's district blend)
  if (typeof texelBlend === 'function') texelBlend(g, c, 0);
  drawRoadMarks(g, c, B, R);
  roadDetail(g, c, B, win, sea);
  t1 = performance.now(); RT.road += t1 - t0; t0 = t1;
  // the block
  drawBlock(g, c, B, R, win, sea);
  walkDetail(g, c, B, win, sea);
  drawStreetFurniture(g, c, B, Z.mulberry32(Z.hash32(c.cx * 7919 + c.cy * 104729 + 0x5f)), win);
  // the surface of the street (the texture engine): aggregate in the asphalt, concrete, grass, sand, snow, wear
  if (typeof texelGround === 'function') texelGround(g, c, win);
  if (typeof texelSplats === 'function') texelSplats(g, c, win);   // one material growing into another
  if (typeof texelBlend === 'function') texelBlend(g, c, 1);       // the neighbouring districts' ground, wherever the blend field gives it to them
  t1 = performance.now(); RT.block += t1 - t0; t0 = t1;
  // rivers, ponds and bridges
  if (c.fv) drawWaterArt(g, c, B);
  t1 = performance.now(); RT.water += t1 - t0; t0 = t1;
  drawDecals(g, c, B, R, win, sea);
  // the city's bloodstains: a splash with droplets thrown off one side
  for (let i = 0; i < 3; i++) bloodSplat(g, ox + R() * CH, oy + R() * CH, 6 + R() * 10, R, c.bio === 'snow' || win ? 'rgba(120,14,14,0.42)' : 'rgba(46,10,10,0.42)');
  t1 = performance.now(); RT.decal += t1 - t0; t0 = t1;
  drawWrecks(g, c);
  for (const r of c.rects) if (!r.dyn) drawRectArt(g, r, c, B, win);   // (vehicles the crowd moved are drawn live)
  if (win || c.bio === 'snow') snowCaps(g, c);
  if (typeof skyUnder === 'function') skyUnder(g, c);
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
  } finally { artDone(c, keep); }
}
// on a frame that drew no new blocks, build one just off screen in the direction the camera is heading,
// so walking into new streets never stalls on drawing them
const STREAM = { lx: 0, ly: 0, vx: 0, vy: 0 };
function streamChunks(x0, y0, x1, y1) {
  STREAM.vx = STREAM.vx * 0.9 + (cam.x - STREAM.lx) * 0.1; STREAM.vy = STREAM.vy * 0.9 + (cam.y - STREAM.ly) * 0.1; STREAM.lx = cam.x; STREAM.ly = cam.y;
  if (PERF.workMs > 1000 / targetFps() * 0.7) return;
  // (CORE v3: a block is only drawn ahead when what a block costs here fits the time the frame has left; with plenty
  // to spare, two blocks)
  const need = worldChunkMs(), free = learnFree(), many = free > need * 3 ? 2 : 1;
  if (need && free < need * 1.1 && PERF.fps && PERF.fps < targetFps() * 0.97) return;
  let built = 0;
  const pad = 200 + Math.min(400, Math.hypot(STREAM.vx, STREAM.vy) * 40);
  const ax = STREAM.vx >= 0 ? 1 : -1, ay = STREAM.vy >= 0 ? 1 : -1, ex = ax > 0 ? x1 + pad : x0 - pad, ey = ay > 0 ? y1 + pad : y0 - pad;
  const cand = [[ex, (y0 + y1) / 2], [(x0 + x1) / 2, ey], [ex, ey], [ex, ay > 0 ? y0 : y1], [ax > 0 ? x0 : x1, ey]];
  for (const [x, y] of cand) {
    const c = getChunk(Math.floor(x / CHS), Math.floor(y / CHS));
    if (!c.can) { renderChunk(c); c.seen = frameNo; if (++built >= many) return; }
  }
}
// a soft-edged oval of colour (snow and sand drifts, shading): a radial gradient squeezed into shape
function softBlob(g, x, y, rx, ry, rot, rgb, a) {
  const r = Math.max(rx, ry); if (r < 1) return;
  g.save(); g.translate(x, y); if (rot) g.rotate(rot); g.scale(rx / r, ry / r);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); gr.addColorStop(0.55, 'rgba(' + rgb + ',' + a * 0.55 + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
  g.fillStyle = gr; g.fillRect(-r, -r, r * 2, r * 2); g.restore();
}
// the direction the wind usually blows in a district: snow drifts and sand ripples in the art all lie along it
function windAngle(c) { return ((WORLD.seed >>> 3) % 628) / 100 + (c.D.warm - 0.5) * 0.8; }
function bloodSplat(g, x, y, r, R, col) {
  g.fillStyle = col; g.beginPath(); g.ellipse(x, y, r, r * (0.6 + R() * 0.3), R() * 3, 0, TAU); g.fill();
  const a = R() * TAU; for (let i = 0; i < 6; i++) { const d = r * (1 + R() * 1.6), s = r * (0.12 + R() * 0.22), aa = a + (R() - 0.5) * 1.2; g.beginPath(); g.arc(x + Math.cos(aa) * d, y + Math.sin(aa) * d, s, 0, TAU); g.fill(); }
}
// on the sidewalks: fire hydrants, traffic signals at the corner, a bus stop, newspaper boxes; and on the road:
// stop lines, manholes, storm drains, skid marks and oil stains. All of it is paint on the ground, nothing to bump into.
function drawStreetFurniture(g, c, B, R, win) {
  const bio = c.bio, ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD, urban = bio === 'city' || bio === 'chaos' || bio === 'burning' || bio === 'ruins' || bio === 'ash';
  if (bio === 'desert' || bio === 'snow') return;
  const dm = Q.deco || 1;
  // road: stop lines on the lanes coming into the crossing (traffic keeps right)
  if (bio !== 'ruins') {
    g.fillStyle = bio === 'ash' ? 'rgba(220,220,214,0.12)' : 'rgba(230,226,214,0.2)';
    g.fillRect(bx + 26, oy + 8, 4, ROAD / 2 - 12); g.fillRect(ox + CH - 30, oy + ROAD / 2 + 4, 4, ROAD / 2 - 12);
    g.fillRect(ox + ROAD / 2 + 4, by + 26, ROAD / 2 - 12, 4); g.fillRect(ox + 8, oy + CH - 30, ROAD / 2 - 12, 4);
  }
  // a manhole or two, and storm drains at the curb
  const nm = 1 + (R() < 0.5 ? 1 : 0);
  for (let i = 0; i < nm; i++) {
    const onH = R() < 0.5, x = onH ? bx + 60 + R() * (BS - 120) : ox + 30 + R() * (ROAD - 60), y = onH ? oy + 30 + R() * (ROAD - 60) : by + 60 + R() * (BS - 120);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(x + 1, y + 1.5, 9, 0, TAU); g.fill();
    g.fillStyle = '#2c2d30'; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x + 6, y); g.moveTo(x, y - 6); g.lineTo(x, y + 6); g.stroke();
    if (!c.ventsSeen && typeof pulseVent === 'function' && urban) pulseVent(c, x, y);   // (1.9.998.2: some of them steam)
  }
  c.ventsSeen = 1;
  for (const [x, y, w, h] of [[bx + 40 + R() * (BS - 100), by - 7, 18, 6], [bx - 7, by + 40 + R() * (BS - 100), 6, 18]]) { g.fillStyle = '#121315'; g.fillRect(x, y, w, h); g.fillStyle = '#3a3c40'; if (w > h) for (let k = 2; k < w; k += 4) g.fillRect(x + k, y + 1, 1.5, h - 2); else for (let k = 2; k < h; k += 4) g.fillRect(x + 1, y + k, w - 2, 1.5); }
  // skid marks and oil stains, more of them where the city went wrong
  const ns = bio === 'chaos' || bio === 'ruins' ? 2 : R() < 0.4 ? 1 : 0;
  for (let i = 0; i < ns; i++) {
    const onH = R() < 0.5, x = onH ? bx + R() * (BS - 140) : ox + 24 + R() * (ROAD - 60), y = onH ? oy + 24 + R() * (ROAD - 60) : by + R() * (BS - 140), l = 60 + R() * 80, bend = (R() - 0.5) * 40;
    g.strokeStyle = 'rgba(8,8,8,0.35)'; g.lineWidth = 3;
    for (const off of [0, 9]) { g.beginPath(); if (onH) { g.moveTo(x, y + off); g.quadraticCurveTo(x + l / 2, y + off + bend, x + l, y + off + bend * 1.4); } else { g.moveTo(x + off, y); g.quadraticCurveTo(x + off + bend, y + l / 2, x + off + bend * 1.4, y + l); } g.stroke(); }
  }
  for (let i = 0; i < Math.floor(2 * dm + R()); i++) softBlob(g, ox + 20 + R() * (CH - 40), oy + 20 + R() * (ROAD - 40), 10 + R() * 12, 6 + R() * 8, R() * 3, '6,6,8', 0.45);
  if (!urban && bio !== 'suburb') return;
  // sidewalk: a fire hydrant near the corner
  if (R() < 0.8) { const onTop = R() < 0.5, x = onTop ? bx + 30 + R() * 40 : bx + 8, y = onTop ? by + 8 : by + 30 + R() * 40; g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(x + 1.5, y + 2, 4.5, 0, TAU); g.fill(); g.fillStyle = bio === 'ash' ? '#6a6a6c' : '#c03a2e'; g.beginPath(); g.arc(x, y, 4.5, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x - 1, y - 1, 2, 2); }
  if (bio === 'suburb') {
    // mailboxes at the end of each driveway
    for (const d of c.decals) if (d.k === 'drive') { const mx = d.x + d.w + 4, my = d.top ? d.y + 4 : d.y + d.h - 10; g.fillStyle = '#3a2a1e'; g.fillRect(mx + 2, my + 2, 3, 3); g.fillStyle = win ? '#c9d3da' : ['#2f4f6b', '#7b2f2b', '#22262b'][d.s % 3]; g.fillRect(mx - 2, my - 3, 9, 6); g.fillStyle = '#c9402e'; g.fillRect(mx + 6, my - 5, 1.5, 4); }
    return;
  }
  // a traffic signal at the corner, its arm reaching out over the crossing
  if (bio !== 'ruins' || R() < 0.4) {
    const px = bx + 7, py = by + 7, broken = bio === 'ruins' || (bio === 'chaos' && R() < 0.3);
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 3; g.beginPath(); g.moveTo(px + 3, py + 4); g.lineTo(px - 34 + 3, py - 30 + 4); g.stroke();
    g.strokeStyle = '#3a3d42'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(px, py); g.lineTo(px - 34, py - 30); g.stroke();
    g.fillStyle = '#26282c'; g.beginPath(); g.arc(px, py, 3.5, 0, TAU); g.fill();
    g.fillStyle = '#1a1b1e'; g.fillRect(px - 42, py - 38, 12, 6);
    if (!broken) { const lit = ['#ff3b30', '#ffcc00', '#34c759'][Math.floor(R() * 3)]; g.fillStyle = lit; g.beginPath(); g.arc(px - 36, py - 35, 2, 0, TAU); g.fill(); }
  }
  // a bus stop on the top sidewalk now and then, with its shelter and sign
  if (bio === 'city' && R() < 0.3) {
    const x = bx + 110 + R() * (BS - 260), y = by + 2;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 3, y + 3, 52, 11); g.fillStyle = 'rgba(150,200,230,0.28)'; g.fillRect(x, y, 52, 11);
    g.strokeStyle = '#4a4d52'; g.lineWidth = 1.5; g.strokeRect(x, y, 52, 11); g.fillStyle = '#4a4d52'; g.fillRect(x + 4, y + 6, 44, 3);
    g.fillStyle = '#2f6fb0'; g.fillRect(x + 60, y + 2, 7, 7); g.fillStyle = '#e8e2d4'; g.fillRect(x + 62, y + 4, 3, 3);
  }
  // newspaper boxes in a row by the corner
  if ((bio === 'city' || bio === 'chaos') && R() < 0.5) { const x = bx + 2, y = by + BS - 60 - R() * 120; for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 2, y + i * 10 + 2, 9, 8); g.fillStyle = ['#2f6fb0', '#c9402e', '#f2cc3a', '#3d8a4a'][Math.floor(R() * 4)]; g.fillRect(x, y + i * 10, 9, 8); } }
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
    // drifts that the wind has piled against the curbs: long, soft-edged, thicker in places
    const rgb = bio === 'desert' ? '150,120,80' : '214,222,230';
    for (let i = 0; i < 16; i++) {
      const t = R(), horiz = R() < 0.5, edge = R() < 0.5, l = 40 + R() * 70, d = 10 + R() * 12;
      const x = horiz ? ox + t * CH : ox + (edge ? d * 0.35 : ROAD - d * 0.35), y = horiz ? oy + (edge ? d * 0.35 : ROAD - d * 0.35) : oy + t * CH;
      softBlob(g, x, y, horiz ? l : d, horiz ? d : l, 0, rgb, bio === 'desert' ? 0.45 : 0.6);
    }
    // power lines along the highway: poles on the shoulder and the wires sagging between them
    for (const horiz of [true, false]) {
      const fixed = horiz ? oy + 7 : ox + 7;
      g.strokeStyle = 'rgba(15,14,12,0.55)'; g.lineWidth = 1;
      for (const off of [-3, 3]) { g.beginPath(); for (let k = 0; k <= 4; k++) { const a = k * 160, px = horiz ? ox + a : fixed + off, py = horiz ? fixed + off : oy + a; if (!k) g.moveTo(px, py); else g.quadraticCurveTo(horiz ? px - 80 : px + 5, horiz ? py + 5 : py - 80, px, py); } g.stroke(); }
      for (let k = 0; k < 4; k++) { const a = k * 160 + (k ? 0 : 0), px = horiz ? ox + a : fixed, py = horiz ? fixed : oy + a; if (k === 0) continue; g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(px + 2, py + 3, 5, 5); g.fillStyle = '#4a3d30'; g.fillRect(px - 2.5, py - 2.5, 5, 5); g.fillStyle = '#2a241e'; if (horiz) g.fillRect(px - 1, py - 6, 2, 12); else g.fillRect(px - 6, py - 1, 12, 2); }
    }
    if (bio === 'snow') { g.strokeStyle = 'rgba(20,24,30,0.35)'; g.lineWidth = 5; g.beginPath(); g.moveTo(bx, oy + ROAD / 2 - 18); g.lineTo(ox + CH, oy + ROAD / 2 - 18); g.moveTo(bx, oy + ROAD / 2 + 18); g.lineTo(ox + CH, oy + ROAD / 2 + 18); g.moveTo(ox + ROAD / 2 - 18, by); g.lineTo(ox + ROAD / 2 - 18, oy + CH); g.moveTo(ox + ROAD / 2 + 18, by); g.lineTo(ox + ROAD / 2 + 18, oy + CH); g.stroke(); }
  }
}
/* ---------- fine detail: the things you only notice at real-world scale ----------
   Asphalt grain, wheel ruts and oil down the lanes, patched and sealed cracks, concrete gutters, painted arrows,
   sidewalk slabs, gum and utility covers, and what each season leaves on the street: fallen leaves in the gutters,
   blossom on the sidewalks, plowed snow banks with slushy tyre tracks. Drawn into the block's picture, so it costs
   nothing once drawn. Each block has its own random stream for this, so the rest of the art is unchanged. */
function grainCanvas() { return texelCanvas('grain'); }   // the texture engine's asphalt grain
function grainFill(g, x, y, w, h, scale, alpha) {
  if (w <= 0 || h <= 0) return;
  const pat = g.createPattern(grainCanvas(), 'repeat'); if (!pat) return;
  if (pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix([scale, 0, 0, scale, 0, 0]));
  g.save(); g.globalAlpha = alpha; g.fillStyle = pat; g.fillRect(x, y, w, h); g.restore();
}
// a soft band across a road: a wheel rut, an oil line, a wet track in the snow
function band(g, horiz, at, from, len, wid, rgb, a, R) {
  const gr = horiz ? g.createLinearGradient(0, at - wid, 0, at + wid) : g.createLinearGradient(at - wid, 0, at + wid, 0);
  gr.addColorStop(0, 'rgba(' + rgb + ',0)'); gr.addColorStop(0.5, 'rgba(' + rgb + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
  g.fillStyle = gr;
  // in pieces of different strength, so it reads as wear and not as paint
  for (let s = 0; s < len;) {
    const l = Math.min(len - s, 30 + R() * 70); g.globalAlpha = 0.55 + R() * 0.6;
    if (horiz) g.fillRect(from + s, at - wid, l, wid * 2); else g.fillRect(at - wid, from + s, wid * 2, l);
    s += l;
  }
  g.globalAlpha = 1;
}
function crackLine(g, R, x, y, ang, steps, step) {
  g.beginPath(); g.moveTo(x, y);
  for (let k = 0; k < steps; k++) { ang += (R() - 0.5) * 0.9; x += Math.cos(ang) * step; y += Math.sin(ang) * step; g.lineTo(x, y); }
  g.stroke();
}
function roadDetail(g, c, B, win, sea) {
  const ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD, bio = c.bio, real = c.k > 1.2, dm = Q.deco || 1;
  const R = Z.mulberry32(Z.hash32(c.cx * 31337 + c.cy * 7331 + 0xde7a));
  const paved = bio !== 'desert' && bio !== 'snow', urban = bio === 'city' || bio === 'chaos' || bio === 'suburb' || bio === 'burning' || bio === 'ruins' || bio === 'ash';
  if (real) { grainFill(g, ox, oy, CH, ROAD, 0.5, 1); grainFill(g, ox, by, ROAD, BS, 0.5, 1); }
  if (!paved) return;
  const lanes = [ROAD * 0.25, ROAD * 0.75];
  if (win) {
    // a snowy road: plowed into banks at the curbs, packed snow on the lanes and dark wet tracks where the wheels went,
    // each track a little wavy, a few cars' worth on top of each other
    g.fillStyle = 'rgba(206,214,222,0.5)'; g.fillRect(ox, oy, CH, ROAD); g.fillRect(ox, by, ROAD, BS);
    for (let i = 0; i < Math.floor(26 * dm); i++) softBlob(g, ox + R() * CH, oy + R() * ROAD, 10 + R() * 26, 6 + R() * 12, R() * 3, '236,240,244', 0.3);
    for (let i = 0; i < Math.floor(20 * dm); i++) softBlob(g, ox + R() * ROAD, by + R() * BS, 6 + R() * 12, 10 + R() * 26, R() * 3, '236,240,244', 0.3);
    g.lineCap = 'round';
    const track = (horiz, at, from, len) => {
      for (let pass = 0; pass < 2; pass++) {
        const o = (R() - 0.5) * 5, ph = R() * 6, amp = 1 + R() * 2.2;
        g.strokeStyle = pass ? 'rgba(24,28,34,0.3)' : 'rgba(40,46,54,0.22)'; g.lineWidth = pass ? 2.6 : 5;
        g.beginPath();
        for (let s = 0; s <= len; s += 16) { const q = at + o + Math.sin(s / 70 + ph) * amp; if (horiz) { if (!s) g.moveTo(from + s, q); else g.lineTo(from + s, q); } else { if (!s) g.moveTo(q, from + s); else g.lineTo(q, from + s); } }
        g.stroke();
      }
    };
    for (const lc of lanes) for (const off of [-10.5, 10.5]) { track(true, oy + lc + off, ox, CH); track(false, ox + lc + off, by, BS); }
    g.lineCap = 'butt';
    for (let i = 0; i < Math.floor(22 * dm); i++) {
      const e = i % 4, t = R();
      if (e === 0) softBlob(g, bx + t * BS, oy + 3 + R() * 3, 14 + R() * 18, 5 + R() * 3, 0, '240,244,248', 0.75);
      else if (e === 1) softBlob(g, bx + t * BS, oy + ROAD - 3 - R() * 3, 14 + R() * 18, 5 + R() * 3, 0, '240,244,248', 0.75);
      else if (e === 2) softBlob(g, ox + 3 + R() * 3, by + t * BS, 5 + R() * 3, 14 + R() * 18, 0, '240,244,248', 0.75);
      else softBlob(g, ox + ROAD - 3 - R() * 3, by + t * BS, 5 + R() * 3, 14 + R() * 18, 0, '240,244,248', 0.75);
    }
    return;
  }
  // wheel ruts and the oil line down the middle of each lane
  for (const lc of lanes) {
    for (const off of [-10.5, 10.5]) { band(g, true, oy + lc + off, bx, BS, 2.6, '0,0,0', 0.1, R); band(g, false, ox + lc + off, by, BS, 2.6, '0,0,0', 0.1, R); }
    band(g, true, oy + lc, bx, BS, 3.2, '0,0,0', 0.08, R); band(g, false, ox + lc, by, BS, 3.2, '0,0,0', 0.08, R);
  }
  if (!urban) return;
  // concrete gutters along the curbs, with joints every few metres
  g.fillStyle = bio === 'ash' ? 'rgba(170,170,170,0.08)' : 'rgba(170,166,156,0.13)';
  g.fillRect(bx, oy, BS, 5); g.fillRect(bx, oy + ROAD - 5, BS, 5); g.fillRect(ox, by, 5, BS); g.fillRect(ox + ROAD - 5, by, 5, BS);
  g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.8; g.beginPath();
  g.moveTo(bx, oy + 5); g.lineTo(bx + BS, oy + 5); g.moveTo(bx, oy + ROAD - 5); g.lineTo(bx + BS, oy + ROAD - 5);
  g.moveTo(ox + 5, by); g.lineTo(ox + 5, by + BS); g.moveTo(ox + ROAD - 5, by); g.lineTo(ox + ROAD - 5, by + BS);
  for (let s = 40; s < BS; s += 40) { g.moveTo(bx + s, oy); g.lineTo(bx + s, oy + 5); g.moveTo(bx + s, oy + ROAD - 5); g.lineTo(bx + s, oy + ROAD); g.moveTo(ox, by + s); g.lineTo(ox + 5, by + s); g.moveTo(ox + ROAD - 5, by + s); g.lineTo(ox + ROAD, by + s); }
  g.stroke();
  if (!real) return;
  // patches where the road was dug up and filled again
  const np = bio === 'ruins' || bio === 'chaos' ? 3 : 1 + (R() < 0.5 ? 1 : 0);
  for (let i = 0; i < np; i++) {
    const hz = R() < 0.5, w = 18 + R() * 46, h = 12 + R() * 30;
    // never across the crossings: those were repainted
    const x = hz ? bx + 34 + R() * (BS - w - 68) : ox + 6 + R() * (ROAD - w - 12), y = hz ? oy + 6 + R() * (ROAD - h - 12) : by + 34 + R() * (BS - h - 68);
    if (w > ROAD - 12 && !hz) continue;
    g.fillStyle = R() < 0.6 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.03)'; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(6,6,8,0.24)'; g.lineWidth = 0.8; g.strokeRect(x, y, w, h);
  }
  // cracks, sealed with shiny black tar
  g.strokeStyle = 'rgba(10,10,12,0.5)'; g.lineWidth = 0.9; g.lineJoin = 'round';
  const nc = Math.floor((bio === 'ruins' || bio === 'ash' ? 8 : 4) * dm + R() * 2);
  for (let i = 0; i < nc; i++) {
    const hz = R() < 0.5;
    if (hz) crackLine(g, R, bx + R() * BS, oy + 8 + R() * (ROAD - 16), R() < 0.6 ? 0 : R() * TAU, 6 + Math.floor(R() * 6), 5 + R() * 4);
    else crackLine(g, R, ox + 8 + R() * (ROAD - 16), by + R() * BS, R() < 0.6 ? Math.PI / 2 : R() * TAU, 6 + Math.floor(R() * 6), 5 + R() * 4);
  }
  g.lineJoin = 'miter';
  // arrows on the lanes coming up to the crossing (traffic keeps right)
  if (bio === 'city' || bio === 'chaos' || bio === 'suburb') {
    g.fillStyle = bio === 'chaos' ? 'rgba(230,226,214,0.08)' : 'rgba(230,226,214,0.12)';
    const arrow = (x, y, a) => { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(-26, -1.3); g.lineTo(8, -1.3); g.lineTo(8, -4.5); g.lineTo(20, 0); g.lineTo(8, 4.5); g.lineTo(8, 1.3); g.lineTo(-26, 1.3); g.closePath(); g.fill(); g.restore(); };
    arrow(bx + 74, oy + ROAD * 0.25, Math.PI); arrow(ox + CH - 78, oy + ROAD * 0.75, 0); arrow(ox + ROAD * 0.75, by + 74, -Math.PI / 2); arrow(ox + ROAD * 0.25, oy + CH - 78, Math.PI / 2);
  }
  // what the season leaves in the gutters
  const gut = (n, cols, s0, s1, a) => {
    for (let i = 0; i < n; i++) {
      const e = Math.floor(R() * 4), t = R(), d = 1 + R() * 6;
      const x = e === 0 || e === 1 ? bx + t * BS : e === 2 ? ox + d : ox + ROAD - d, y = e === 0 ? oy + d : e === 1 ? oy + ROAD - d : by + t * BS;
      g.fillStyle = cols[Math.floor(R() * cols.length)]; g.globalAlpha = a; g.beginPath(); g.ellipse(x, y, s0 + R() * (s1 - s0), (s0 + R() * (s1 - s0)) * 0.6, R() * 3, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  };
  if (sea === 2 && bio !== 'ash' && bio !== 'burning') gut(Math.floor(70 * dm), ['#c9762a', '#a8442a', '#e0a83a', '#8a5a2a', '#6a3a1e'], 1.2, 2.8, 0.85);
  else if (sea === 0 && (bio === 'city' || bio === 'suburb')) gut(Math.floor(30 * dm), ['#ffd0e4', '#f7b8d4', '#fff0f6'], 0.8, 1.6, 0.8);
  else if (bio !== 'ash') gut(Math.floor(12 * dm), ['#6a5a40', '#4a4a44', '#8a8270'], 0.8, 1.8, 0.5);   // grit and the odd scrap
}
function walkDetail(g, c, B, win, sea) {
  const bio = c.bio; if (bio === 'desert' || bio === 'snow') return;
  const ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD, real = c.k > 1.2, dm = Q.deco || 1;
  const R = Z.mulberry32(Z.hash32(c.cx * 4271 + c.cy * 9157 + 0x3a1c));
  // joints down the left and right sidewalks as well (the top and bottom have theirs)
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; g.beginPath();
  for (let j = by + 24; j < by + BS; j += 24) { g.moveTo(bx, j); g.lineTo(bx + 14, j); g.moveTo(bx + BS - 14, j); g.lineTo(bx + BS, j); }
  g.stroke();
  if (!real) return;
  const strips = [[bx, by, BS, 14, true], [bx, by + BS - 14, BS, 14, true], [bx, by + 14, 14, BS - 28, false], [bx + BS - 14, by + 14, 14, BS - 28, false]];
  for (const [x, y, w, h] of strips) grainFill(g, x, y, w, h, 0.5, 0.55);
  // every slab a shade of its own, a few cracked across
  g.lineWidth = 0.7;
  for (const [x, y, w, h, hz] of strips) {
    const L = hz ? w : h;
    for (let s = 0; s < L; s += 24) {
      const sx = hz ? x + s : x, sy = hz ? y : y + s, sw = hz ? Math.min(24, w - s) : w, sh = hz ? h : Math.min(24, h - s);
      if (R() < 0.45) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.045)'; g.fillRect(sx, sy, sw, sh); }
      if (R() < 0.07) { g.strokeStyle = 'rgba(0,0,0,0.35)'; crackLine(g, R, sx + R() * sw, sy + R() * sh, R() * TAU, 3, 4); }
    }
  }
  // the curb's top edge catches the light
  g.strokeStyle = win ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.1)'; g.lineWidth = 0.8; g.strokeRect(bx + 2.6, by + 2.6, BS - 5.2, BS - 5.2);
  // utility covers, and gum trodden flat
  for (let i = 0; i < 2 + Math.floor(R() * 3); i++) {
    const S = strips[Math.floor(R() * 4)], x = S[0] + 3 + R() * (S[2] - 10), y = S[1] + 3 + R() * (S[3] - 10);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 0.6, y + 0.8, 6, 6); g.fillStyle = win ? '#9aa4ab' : '#3c3d40'; g.fillRect(x, y, 6, 6);
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.strokeRect(x + 0.8, y + 0.8, 4.4, 4.4);
  }
  if (bio === 'city' || bio === 'chaos') {
    g.fillStyle = 'rgba(20,20,22,0.28)';
    for (let i = 0; i < Math.floor(40 * dm); i++) { const S = strips[Math.floor(R() * 4)]; g.beginPath(); g.arc(S[0] + R() * S[2], S[1] + R() * S[3], 0.5 + R() * 0.6, 0, TAU); g.fill(); }
  }
  // leaves blown against the buildings in the fall, blossom in the spring
  if (!win && (sea === 2 || sea === 0) && bio !== 'ash' && bio !== 'burning') {
    const cols = sea === 2 ? ['#c9762a', '#a8442a', '#e0a83a', '#8a5a2a'] : ['#ffd0e4', '#f7b8d4', '#fff0f6'], n = Math.floor((sea === 2 ? 50 : 24) * dm);
    for (let i = 0; i < n; i++) {
      const S = strips[Math.floor(R() * 4)], x = S[0] + R() * S[2], y = S[1] + R() * S[3];
      g.fillStyle = cols[Math.floor(R() * cols.length)]; g.globalAlpha = 0.8; g.beginPath(); g.ellipse(x, y, 1 + R() * 1.6, 0.7 + R() * 0.8, R() * 3, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  }
}
// a flat roof up close: the parapet's shadow, membrane seams, drains with their water stains, vent pipes, a dish or a mast
function roofFine(g, r, c, win, burnt) {
  const R = Z.mulberry32(Z.hash32(Math.round(r.x * 131 + r.y * 977) | 0)), area = r.w * r.h;
  if (r.w < 30 || r.h < 30) return;
  g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(r.x + 4, r.y + 4, r.w - 8, 3.5); g.fillRect(r.x + 4, r.y + 7.5, 3.5, r.h - 11.5);
  g.fillStyle = 'rgba(255,255,255,0.045)'; g.fillRect(r.x + 4, r.y + r.h - 7, r.w - 8, 3); g.fillRect(r.x + r.w - 7, r.y + 4, 3, r.h - 11);
  grainFill(g, r.x + 4, r.y + 4, r.w - 8, r.h - 8, 0.5, win ? 0.25 : 0.6);
  if (!win) {
    g.strokeStyle = 'rgba(0,0,0,0.06)'; g.lineWidth = 0.7; g.beginPath();
    if (r.w > r.h) for (let y = r.y + 13; y < r.y + r.h - 7; y += 13) { g.moveTo(r.x + 7, y); g.lineTo(r.x + r.w - 7, y); }
    else for (let x = r.x + 13; x < r.x + r.w - 7; x += 13) { g.moveTo(x, r.y + 7); g.lineTo(x, r.y + r.h - 7); }
    g.stroke();
  }
  const nd = Math.min(5, 1 + Math.floor(area / 30000));
  for (let i = 0; i < nd; i++) {
    const x = r.x + 14 + R() * (r.w - 28), y = r.y + 14 + R() * (r.h - 28);
    softBlob(g, x, y, 10, 7, R() * 3, '0,0,0', 0.12);
    g.fillStyle = '#1b1c1e'; g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); g.strokeStyle = 'rgba(170,170,170,0.28)'; g.lineWidth = 0.6; g.stroke();
  }
  if (burnt) return;
  const nv = 2 + Math.floor(R() * Math.min(8, area / 8000));
  for (let i = 0; i < nv; i++) {
    const x = r.x + 10 + R() * (r.w - 20), y = r.y + 10 + R() * (r.h - 20), rr = 1.3 + R() * 1.4;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(x + rr * 0.9, y + rr * 1.1, rr, 0, TAU); g.fill();
    g.fillStyle = win ? '#dfe5ea' : '#6d7075'; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
    g.fillStyle = '#26272a'; g.beginPath(); g.arc(x, y, rr * 0.5, 0, TAU); g.fill();
  }
  if (R() < 0.3) {
    const x = r.x + 16 + R() * (r.w - 32), y = r.y + 16 + R() * (r.h - 32), a = R() * TAU;
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x + 4, y + 5, 6, 4.5, a, 0, TAU); g.fill();
    g.fillStyle = win ? '#eef2f5' : '#c5c9ce'; g.beginPath(); g.ellipse(x, y, 6, 4.5, a, 0, TAU); g.fill();
    g.strokeStyle = '#3a3c40'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); g.stroke();
  }
  if (R() < 0.22 && area > 20000) {
    const x = r.x + 20 + R() * (r.w - 40), y = r.y + 20 + R() * (r.h - 40);
    g.strokeStyle = 'rgba(0,0,0,0.32)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20, y + 24); g.stroke();
    g.strokeStyle = '#7a7d82'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + 4, y); g.moveTo(x, y - 4); g.lineTo(x, y + 4); g.stroke();
    g.fillStyle = '#55585e'; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill();
  }
  if (R() < 0.45) {
    g.strokeStyle = 'rgba(28,28,30,0.55)'; g.lineWidth = 0.9; g.beginPath();
    let x = r.x + 6, y = r.y + 10 + R() * (r.h - 20); g.moveTo(x, y);
    for (let k = 0; k < 3; k++) { x += R() * (r.w - 12) / 3; g.lineTo(x, y); y += (R() - 0.5) * 30; y = clamp(y, r.y + 8, r.y + r.h - 8); g.lineTo(x, y); }
    g.stroke();
  }
}
// a pitched roof up close: gutters on the eaves, a ridge cap, vents, and a skylight or solar panels on the sunny side
function houseFine(g, r, win) {
  const R = Z.mulberry32(Z.hash32(Math.round(r.x * 71 + r.y * 313) | 0)), horiz = r.w >= r.h;
  g.strokeStyle = win ? 'rgba(255,255,255,0.35)' : 'rgba(190,190,186,0.4)'; g.lineWidth = 1.3; g.beginPath();
  if (horiz) { g.moveTo(r.x + 1, r.y + 1.2); g.lineTo(r.x + r.w - 1, r.y + 1.2); g.moveTo(r.x + 1, r.y + r.h - 1.2); g.lineTo(r.x + r.w - 1, r.y + r.h - 1.2); }
  else { g.moveTo(r.x + 1.2, r.y + 1); g.lineTo(r.x + 1.2, r.y + r.h - 1); g.moveTo(r.x + r.w - 1.2, r.y + 1); g.lineTo(r.x + r.w - 1.2, r.y + r.h - 1); }
  g.stroke();
  grainFill(g, r.x, r.y, r.w, r.h, 0.5, 0.45);
  for (let i = 0; i < 2 + Math.floor(R() * 2); i++) {
    const x = r.x + 6 + R() * (r.w - 12), y = r.y + 6 + R() * (r.h - 12);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 0.8, y + 1, 3, 3); g.fillStyle = win ? '#e3e8ec' : '#4a4644'; g.fillRect(x, y, 3, 3);
  }
  if (!win && R() < 0.35) {
    const pw = horiz ? Math.min(r.w * 0.5, 40) : r.w * 0.36, ph = horiz ? r.h * 0.34 : Math.min(r.h * 0.5, 40);
    const x = horiz ? r.x + (r.w - pw) * (0.2 + R() * 0.6) : r.x + r.w / 2 + 2, y = horiz ? r.y + r.h / 2 + 2 : r.y + (r.h - ph) * (0.2 + R() * 0.6);
    g.fillStyle = '#1d2b45'; g.fillRect(x, y, pw, ph); g.strokeStyle = 'rgba(120,160,220,0.35)'; g.lineWidth = 0.6; g.beginPath();
    for (let k = 6; k < pw; k += 6) { g.moveTo(x + k, y); g.lineTo(x + k, y + ph); } for (let k = 6; k < ph; k += 6) { g.moveTo(x, y + k); g.lineTo(x + pw, y + k); } g.stroke();
  } else if (R() < 0.4) {
    const x = r.x + r.w * (0.25 + R() * 0.4), y = r.y + r.h * (0.25 + R() * 0.4);
    g.fillStyle = win ? 'rgba(200,214,226,0.8)' : '#2a3a48'; g.fillRect(x, y, 7, 9); g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 0.6; g.strokeRect(x + 0.5, y + 0.5, 6, 8);
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
    // drifts, shaded blue on the lee side, all lying along the prevailing wind; and fine ripples the wind carved
    const wa = windAngle(c);
    for (let i = 0; i < 7; i++) { const x = bx + R() * BS, y = by + R() * BS, l = 40 + R() * 60; softBlob(g, x + Math.cos(wa + 1.57) * 6, y + Math.sin(wa + 1.57) * 6, l, 10 + R() * 8, wa, '110,135,165', 0.16); softBlob(g, x, y, l, 9 + R() * 7, wa, '250,252,255', 0.5); }
    g.lineWidth = 1.2; g.lineCap = 'round';
    for (let i = 0; i < Math.floor(16 * dm); i++) {
      const x = bx + 10 + R() * (BS - 20), y = by + 10 + R() * (BS - 20), l = 10 + R() * 22, ca = Math.cos(wa), sa = Math.sin(wa);
      g.strokeStyle = i % 2 ? 'rgba(255,255,255,0.28)' : 'rgba(110,135,160,0.12)';
      g.beginPath(); g.moveTo(x - ca * l, y - sa * l); g.quadraticCurveTo(x - sa * 3, y + ca * 3, x + ca * l, y + sa * l); g.stroke();
    }
    g.lineCap = 'butt';
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
    const pv = c.pv || 'landmark', burnt = bio === 'burning', cxp = bx + BS / 2, cyp = by + BS / 2;
    if (pv === 'landmark' || pv === 'garden') {
      inner(win ? '#8a959e' : bio === 'ash' ? '#3d3e40' : burnt ? '#26211c' : '#1c2520');
      if (!win && !burnt && bio !== 'ash') speckle(g, R, bx + 16, by + 16, BS - 32, BS - 32, Math.floor(260 * dm), 'rgba(120,170,90,0.08)', 'rgba(0,0,0,0.14)');
      g.fillStyle = win ? '#9aa5ad' : bio === 'ash' ? '#47474a' : '#2a2e2b'; g.fillRect(bx + 16, cyp - 22, BS - 32, 44); g.fillRect(cxp - 22, by + 16, 44, BS - 32);
      if (pv === 'landmark') { g.fillStyle = win ? '#8d99a3' : '#20292a'; g.beginPath(); g.arc(cxp, cyp, 46, 0, TAU); g.fill(); g.strokeStyle = '#3c4a4c'; g.lineWidth = 4; g.stroke(); }
    } else {
      // paving stones
      inner(win ? '#8a959e' : bio === 'ash' ? '#3f4043' : pv === 'court' ? '#25272b' : '#34363a');
      g.strokeStyle = win ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.22)'; g.lineWidth = 1; g.beginPath();
      for (let x = bx + 16; x < bx + BS - 16; x += 24) { g.moveTo(x, by + 16); g.lineTo(x, by + BS - 16); }
      for (let y = by + 16; y < by + BS - 16; y += 24) { g.moveTo(bx + 16, y); g.lineTo(bx + BS - 16, y); }
      g.stroke();
      if (pv === 'square') { g.strokeStyle = win ? 'rgba(255,255,255,0.18)' : 'rgba(200,190,170,0.16)'; g.lineWidth = 6; for (const rr of [62, 104]) { g.beginPath(); g.arc(cxp, cyp, rr, 0, TAU); g.stroke(); } }
      if (pv === 'market') { g.fillStyle = 'rgba(242,204,58,0.16)'; g.fillRect(bx + 24, cyp - 2, BS - 48, 4); }
      if (pv === 'court' && c.court) {
        const K = c.court; g.fillStyle = win ? '#9aa8b4' : burnt ? '#2e2a26' : '#2c4a5e'; g.fillRect(K.x, K.y, K.w, K.h);
        g.strokeStyle = win ? 'rgba(255,255,255,0.4)' : 'rgba(235,235,225,0.7)'; g.lineWidth = 2;
        g.strokeRect(K.x + 4, K.y + 4, K.w - 8, K.h - 8); g.beginPath(); g.moveTo(K.x + K.w / 2, K.y + 4); g.lineTo(K.x + K.w / 2, K.y + K.h - 4); g.stroke();
        g.beginPath(); g.arc(K.x + K.w / 2, K.y + K.h / 2, 22, 0, TAU); g.stroke();
        for (const e of [0, 1]) { const x = e ? K.x + K.w - 4 : K.x + 4, a0 = e ? Math.PI - 1.15 : -1.15; g.strokeRect(e ? x - 58 : x, K.y + K.h / 2 - 22, 58, 44); g.beginPath(); g.arc(x, K.y + K.h / 2, 72, a0, a0 + 2.3); g.stroke(); }
        g.fillStyle = 'rgba(224,96,46,0.35)'; for (const e of [0, 1]) g.fillRect(e ? K.x + K.w - 62 : K.x + 4, K.y + K.h / 2 - 22, 58, 44);
      }
    }
    if (burnt) { for (let i = 0; i < 5; i++) soot(g, bx + 30 + R() * (BS - 60), by + 30 + R() * (BS - 60), 40 + R() * 50, 0.42); g.fillStyle = 'rgba(160,150,140,0.06)'; g.fillRect(bx + 16, by + 16, BS - 32, BS - 32); }
  } else if (c.type === 'lot') {
    inner(win ? '#838e96' : bio === 'ash' ? '#2f2f31' : '#1b1d21');
    g.strokeStyle = 'rgba(230,226,214,0.22)'; g.lineWidth = 2;
    for (const ry of LOT_ROWS) { g.beginPath(); for (let i = 0; i <= 13; i++) { const x = bx + 20 + i * 36; g.moveTo(x, by + ry); g.lineTo(x, by + ry + 73); } g.stroke(); }
    // the arrows painted in the aisles and the wheel stops
    g.fillStyle = 'rgba(230,226,214,0.16)'; for (const ay of [101 + 47, 340 + 47]) for (let i = 0; i < 3; i++) { const x = bx + 90 + i * 150, y = by + ay - 47; g.beginPath(); g.moveTo(x + 18, y); g.lineTo(x + 6, y - 7); g.lineTo(x + 6, y - 3); g.lineTo(x - 14, y - 3); g.lineTo(x - 14, y + 3); g.lineTo(x + 6, y + 3); g.lineTo(x + 6, y + 7); g.closePath(); g.fill(); }
    g.fillStyle = 'rgba(200,196,186,0.35)'; for (const [ry, top] of [[28, 1], [194, 0], [267, 1], [433, 0]]) for (let i = 0; i < 13; i++) g.fillRect(bx + 26 + i * 36, by + ry + (top ? 4 : 66), 24, 3);
  } else if (c.type === 'ruins') {
    inner(win ? '#7f8a92' : '#24221f');
    speckle(g, R, bx + 16, by + 16, BS - 32, BS - 32, Math.floor(500 * dm), 'rgba(200,190,170,0.06)', 'rgba(0,0,0,0.2)');
  } else inner(win ? '#7d8890' : B.lot);
  if (bio === 'burning' && c.type !== 'plaza') for (let i = 0; i < 5; i++) soot(g, bx + R() * BS, by + R() * BS, 24 + R() * 40, 0.32);
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
    if (!ice) {
      // deeper towards the middle: two more steps, darker and bluer, each softened into the last
      g.globalAlpha = 0.45; g.fillStyle = B.water[1]; isoFill(g, f, ox, oy, -1.8, null, bx);
      g.globalAlpha = 0.35; g.fillStyle = '#0c1a26'; isoFill(g, f, ox, oy, -2.5, null, bx); isoFill(g, f, ox, oy, -3.2, null, bx);
      g.globalAlpha = 1;
      // light dancing on the bottom of the shallows (caustics), fading out with depth
      if (typeof texelGroundPat === 'function' && texelLevel() >= 1) {
        const pat = texelGroundPat(g, 'caustic', 0.22);
        if (pat) { g.globalCompositeOperation = 'lighter'; g.fillStyle = pat; g.globalAlpha = 0.07; isoFill(g, f, ox, oy, -0.1, null, bx); g.globalAlpha = 0.05; isoFill(g, f, ox, oy, -0.8, null, bx); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
      }
    }
    g.strokeStyle = ice ? 'rgba(255,255,255,0.55)' : B.water[2]; g.lineWidth = 2.5; strokeSegs(g, shore);
    if (!ice) {
      // foam lapping at the bank: broken white lines just off the shore
      g.strokeStyle = 'rgba(236,246,250,0.22)'; g.lineWidth = 0.9; g.setLineDash([3, 5, 1, 7, 6, 4, 2, 9]); g.lineCap = 'round';
      const off = []; isoFill(g, f, ox, oy, -0.14, off, bx, true); if (off.length) strokeSegs(g, off);
      g.setLineDash([]); g.lineCap = 'butt';
    }
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
      case 'litter': {
        // a scrap of paper, a crushed can, a bottle, a plastic bag or a coffee cup
        const t = Rd(); g.save(); g.translate(d.x, d.y); g.rotate(Rd() * TAU);
        if (t < 0.35) { g.fillStyle = 'rgba(232,228,216,0.55)'; g.fillRect(-4, -3, 8, 6); g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(-4, 0); g.lineTo(4, 0.6); g.stroke(); }
        else if (t < 0.55) { g.fillStyle = ['#b8322a', '#2f5fb0', '#c9ccd0', '#2f8a4a'][Math.floor(Rd() * 4)]; g.fillRect(-1.6, -1, 3.2, 2); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-1.6, -1, 3.2, 0.6); }
        else if (t < 0.7) { g.fillStyle = Rd() < 0.5 ? 'rgba(60,120,60,0.75)' : 'rgba(120,70,30,0.75)'; g.fillRect(-3, -1, 5, 2); g.fillRect(2, -0.5, 1.6, 1); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(-2.6, -0.8, 4, 0.5); }
        else if (t < 0.85) { g.fillStyle = 'rgba(235,238,240,0.32)'; g.beginPath(); g.ellipse(0, 0, 5, 3.4, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 0.5; g.stroke(); }
        else { g.fillStyle = '#e6dccb'; g.beginPath(); g.arc(0, 0, 1.8, 0, TAU); g.fill(); g.fillStyle = '#6a4a30'; g.beginPath(); g.arc(0, 0, 1.1, 0, TAU); g.fill(); }
        g.restore();
        break;
      }
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
      case 'drive': {
        // a concrete driveway with expansion joints and an oil stain where the car usually stands
        g.fillStyle = win ? '#aab4bc' : '#55585b'; g.fillRect(d.x, d.y, d.w, d.h);
        g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(d.x + 2, d.y, 3, d.h); g.fillRect(d.x + d.w - 5, d.y, 3, d.h);
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; g.beginPath(); for (let y = d.y + 30; y < d.y + d.h; y += 30) { g.moveTo(d.x, y); g.lineTo(d.x + d.w, y); } g.stroke();
        if (!win) softBlob(g, d.x + d.w / 2, d.top ? d.y + 40 : d.y + d.h - 40, 8, 12, 0, '10,10,12', 0.35);
        break;
      }
      case 'flowers': {
        if (win || c.bio !== 'suburb') break;
        const cols = sea === 0 ? ['#ff9fc4', '#fff0a8', '#c8a8ff', '#ff7a7a'] : sea === 1 ? ['#ff5a5a', '#ffd23a', '#ffffff', '#ff8ad8'] : sea === 2 ? ['#d8782a', '#a8442a', '#e0a83a'] : ['#6a5a4a'];
        g.fillStyle = '#3b2a1c'; g.fillRect(d.x + 4, d.y + 1, d.w - 8, d.h - 2);
        for (let i = 0; i < Math.floor(d.w / 5); i++) { g.fillStyle = cols[Math.floor(Rd() * cols.length)]; g.beginPath(); g.arc(d.x + 6 + Rd() * (d.w - 12), d.y + 2 + Rd() * (d.h - 4), 1.6, 0, TAU); g.fill(); }
        break;
      }
      case 'beds': {
        // flower beds in the corners of a garden square (none left in the burned and ash districts)
        if (win || c.bio === 'burning' || c.bio === 'ash') break;
        const cols = sea === 2 ? ['#d8782a', '#a8442a', '#e0a83a'] : ['#ff5a8a', '#ffd23a', '#ffffff', '#c8a8ff'];
        for (const [fx, fy] of [[0.08, 0.38], [0.92, 0.38], [0.08, 0.62], [0.92, 0.62]]) {
          const x = d.x + d.w * fx, y = d.y + d.h * fy; g.fillStyle = '#3b2a1c'; g.beginPath(); g.ellipse(x, y, 16, 26, 0, 0, TAU); g.fill();
          for (let i = 0; i < 22; i++) { g.fillStyle = cols[Math.floor(Rd() * cols.length)]; const a = Rd() * TAU, rr = Rd(); g.beginPath(); g.arc(x + Math.cos(a) * 13 * rr, y + Math.sin(a) * 22 * rr, 1.8, 0, TAU); g.fill(); }
        }
        break;
      }
      case 'alley': {
        // a darker strip of old asphalt, stains, and bags of trash piled against the walls
        g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(d.x, d.y, d.w, d.h);
        for (let i = 0; i < 3; i++) softBlob(g, d.x + Rd() * d.w, d.y + Rd() * d.h, 10 + Rd() * 14, 6 + Rd() * 8, Rd() * 3, '8,8,10', 0.4);
        const nb = 2 + Math.floor(Rd() * 4);
        for (let i = 0; i < nb; i++) { const x = d.v ? (Rd() < 0.5 ? d.x + 8 : d.x + d.w - 8) : d.x + 20 + Rd() * (d.w - 40), y = d.v ? d.y + 20 + Rd() * (d.h - 40) : (Rd() < 0.5 ? d.y + 8 : d.y + d.h - 8); g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(x + 1.5, y + 2, 6, 0, TAU); g.fill(); g.fillStyle = win ? '#c9d3da' : ['#1c1d20', '#2a2c30', '#3a3a2a'][Math.floor(Rd() * 3)]; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(x - 2, y - 2, 2, 0, TAU); g.fill(); }
        break;
      }
      case 'plow': {
        // a lane the plough cleared: packed grey snow, tyre ruts, and the banks thrown up along both sides
        g.fillStyle = '#8f9aa4'; g.fillRect(d.x, d.y, d.w, d.h);
        g.strokeStyle = 'rgba(40,50,60,0.3)'; g.lineWidth = 4; g.beginPath();
        if (d.v) { g.moveTo(d.x + 10, d.y); g.lineTo(d.x + 10, d.y + d.h); g.moveTo(d.x + d.w - 10, d.y); g.lineTo(d.x + d.w - 10, d.y + d.h); } else { g.moveTo(d.x, d.y + 10); g.lineTo(d.x + d.w, d.y + 10); g.moveTo(d.x, d.y + d.h - 10); g.lineTo(d.x + d.w, d.y + d.h - 10); }
        g.stroke();
        for (let i = 0; i < 10; i++) { const t = Rd(); for (const side of [0, 1]) { const x = d.v ? (side ? d.x + d.w + 4 : d.x - 4) : d.x + t * d.w, y = d.v ? d.y + t * d.h : (side ? d.y + d.h + 4 : d.y - 4); softBlob(g, x, y, d.v ? 9 : 26, d.v ? 26 : 9, 0, '250,252,255', 0.8); } }
        break;
      }
      case 'awning': {
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(d.x + 4, d.y + 4, d.w, d.h);
        for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#e8e2d4' : '#2f6f8a'; g.fillRect(d.x + i * d.w / 8, d.y, d.w / 8 + 0.5, d.h); }
        g.fillStyle = '#8a5a2a'; g.fillRect(d.x + d.w + 8, d.y + 8, 8, 8); g.fillRect(d.x + d.w + 20, d.y + 14, 8, 8);
        break;
      }
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
    case 'car': {
      vehDraw(g, r);
      // snow piled on the roof and bonnet (the paint still shows round the edges), or a film of dust or ash
      const horiz = r.w > r.h, L = Math.max(r.w, r.h);
      if (win || c.bio === 'snow') {
        g.fillStyle = 'rgba(238,242,246,0.92)';
        const roof = (a, b) => { if (horiz) { rrect(g, r.x + r.w * a, r.y + 4, r.w * (b - a), r.h - 8, 4); } else { rrect(g, r.x + 4, r.y + r.h * a, r.w - 8, r.h * (b - a), 4); } g.fill(); };
        roof(0.3, 0.57); roof(0.79, 0.96); void L;
      } else if (c.bio === 'desert' || c.bio === 'ash') { g.fillStyle = c.bio === 'ash' ? 'rgba(150,150,154,0.3)' : 'rgba(140,110,70,0.26)'; rrect(g, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 5); g.fill(); }
      break;
    }
    case 'planter':
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(r.x + 5, r.y + 7, r.w, r.h);
      g.fillStyle = '#4a4741'; g.fillRect(r.x, r.y, r.w, r.h);
      if (c.bio === 'burning') {
        // the tree burned down to a black trunk with a few bare limbs
        g.fillStyle = '#2a2520'; g.fillRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8); soot(g, r.x + r.w / 2, r.y + r.h / 2, 30, 0.5);
        g.strokeStyle = '#141110'; g.lineCap = 'round'; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.4; g.lineWidth = 3 - i * 0.3; g.beginPath(); g.moveTo(r.x + r.w / 2, r.y + r.h / 2); g.lineTo(r.x + r.w / 2 + Math.cos(a) * 20, r.y + r.h / 2 + Math.sin(a) * 20); g.stroke(); } g.lineCap = 'butt';
        g.fillStyle = '#1a1714'; g.beginPath(); g.arc(r.x + r.w / 2, r.y + r.h / 2, 5, 0, TAU); g.fill();
        break;
      }
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
      if (r.wire) { g.strokeStyle = 'rgba(160,166,172,0.75)'; g.lineWidth = 1; g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); g.fillStyle = '#5a5e64'; if (r.w > r.h) for (let x = r.x; x < r.x + r.w; x += 24) g.fillRect(x, r.y - 1, 3, r.h + 2); else for (let y = r.y; y < r.y + r.h; y += 24) g.fillRect(r.x - 1, y, r.w + 2, 3); break; }
      if (r.ranch) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(r.x + 2, r.y + 3, r.w, r.h); g.fillStyle = '#7a5a3a'; if (r.w > r.h) { g.fillRect(r.x, r.y, r.w, 1.6); g.fillRect(r.x, r.y + r.h - 1.6, r.w, 1.6); for (let x = r.x; x < r.x + r.w; x += 30) g.fillRect(x, r.y - 2, 4, r.h + 4); } else { g.fillRect(r.x, r.y, 1.6, r.h); g.fillRect(r.x + r.w - 1.6, r.y, 1.6, r.h); for (let y = r.y; y < r.y + r.h; y += 30) g.fillRect(r.x - 2, y, r.w + 4, 4); } break; }
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
    case 'trunk': case 'wreck': break;   // trees are drawn live, on top; wrecks are drawn whole by the vehicle engine
    case 'lm': drawLandmark(g, r, c, B, win, Rb); break;
    default: drawThing(g, r, c, B, win, Rb);
  }
}
function drawBuilding(g, r, c, B, win, Rb) {
  const st = r.st || 'block';
  // with the lighting engine's sun on, the real shadow moves with the time of day: only a soft contact shadow is painted
  if (luxSunShadowsOn()) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(r.x + 1.5, r.y + 2, r.w, r.h); }
  else { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(r.x + 10, r.y + 12, r.w, r.h); }
  if (st === 'house') {
    // a pitched roof: two halves and a ridge
    const horiz = r.w >= r.h, sh = win ? '#d8dfe4' : r.roof;
    g.fillStyle = sh; g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = 'rgba(0,0,0,0.22)'; if (horiz) g.fillRect(r.x, r.y + r.h / 2, r.w, r.h / 2); else g.fillRect(r.x + r.w / 2, r.y, r.w / 2, r.h);
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 3; g.beginPath(); if (horiz) { g.moveTo(r.x + 4, r.y + r.h / 2); g.lineTo(r.x + r.w - 4, r.y + r.h / 2); } else { g.moveTo(r.x + r.w / 2, r.y + 4); g.lineTo(r.x + r.w / 2, r.y + r.h - 4); } g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 1; g.beginPath();
    if (horiz) for (let y = r.y + 6; y < r.y + r.h; y += 7) { g.moveTo(r.x, y); g.lineTo(r.x + r.w, y); } else for (let x = r.x + 6; x < r.x + r.w; x += 7) { g.moveTo(x, r.y); g.lineTo(x, r.y + r.h); }
    g.stroke();
    if (c.k > 1.2) houseFine(g, r, win);
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
  if (st === 'lodge' || st === 'shed' || st === 'barn' || st === 'shack' || st === 'trailer') { drawSmallBuilding(g, r, c, B, win, Rb, st); return; }
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
  if (c.k > 1.2 && st !== 'ruin') roofFine(g, r, c, win, burnt);
  if (st === 'block') roofDetail(g, r, c, Rb, win, burnt);
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
}
// what is up on a big flat roof: gravel, a taller tower set back from the edge, the stair hatch, a water tower on
// legs, rows of solar panels, a rooftop garden, ducts running between the units
function roofDetail(g, r, c, Rb, win, burnt) {
  const area = r.w * r.h, dm = Q.deco || 1;
  speckle(g, Rb, r.x + 4, r.y + 4, r.w - 8, r.h - 8, Math.floor(Math.min(220, area / 400) * dm), 'rgba(255,255,255,0.035)', 'rgba(0,0,0,0.09)');
  // a setback: the middle of a big building rises higher, so its own shadow falls on the lower roof
  if (area > 90000 && Rb() < 0.6) {
    const k = 0.5 + Rb() * 0.2, w = r.w * k, h = r.h * k, x = r.x + (r.w - w) * (0.3 + Rb() * 0.4), y = r.y + (r.h - h) * (0.3 + Rb() * 0.4);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 12, y + 14, w, h);
    g.fillStyle = r.roof; g.fillRect(x, y, w, h); g.fillStyle = win ? 'rgba(206,214,220,0.85)' : 'rgba(255,255,255,0.06)'; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 3; g.strokeRect(x + 2, y + 2, w - 4, h - 4); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }
  if (area < 12000) return;
  // the stair hatch: a little box with a door on one side
  if (Rb() < 0.7) { const x = r.x + 16 + Rb() * (r.w - 60), y = r.y + 16 + Rb() * (r.h - 56); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x + 6, y + 7, 30, 26); g.fillStyle = '#4a4c50'; g.fillRect(x, y, 30, 26); g.fillStyle = '#5a5c61'; g.fillRect(x + 2, y + 2, 26, 10); g.fillStyle = '#2a2b2e'; g.fillRect(x + 9, y + 22, 12, 4); if (win) { g.fillStyle = 'rgba(236,241,245,0.8)'; g.fillRect(x, y, 30, 8); } }
  // ducts: a run of pipe along the roof
  if (Rb() < 0.5 && !burnt) { const y = r.y + 20 + Rb() * (r.h - 40), x0 = r.x + 20 + Rb() * r.w * 0.3, x1 = r.x + r.w - 20 - Rb() * r.w * 0.3; g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 6; g.beginPath(); g.moveTo(x0 + 2, y + 3); g.lineTo(x1 + 2, y + 3); g.stroke(); g.strokeStyle = '#6a6d72'; g.lineWidth = 5; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.15)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y - 1.5); g.lineTo(x1, y - 1.5); g.stroke(); }
  const t = Rb();
  if (t < 0.22 && (c.bio === 'city' || c.bio === 'chaos' || c.bio === 'ruins')) {
    // an old wooden water tower on four legs
    const x = r.x + 30 + Rb() * (r.w - 60), y = r.y + 30 + Rb() * (r.h - 60), R0 = 17;
    g.fillStyle = 'rgba(0,0,0,0.38)'; g.beginPath(); g.ellipse(x + 14, y + 16, R0 + 2, R0, 0, 0, TAU); g.fill();
    g.strokeStyle = '#2a2622'; g.lineWidth = 2.5; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.moveTo(x + dx * 13, y + dy * 13); g.lineTo(x + dx * 15 + 6, y + dy * 15 + 8); g.stroke(); }
    g.fillStyle = '#6b4a2e'; g.beginPath(); g.arc(x, y, R0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * R0, y + Math.sin(a) * R0); g.stroke(); }
    g.fillStyle = win ? '#dfe6eb' : '#4a4d52'; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill();
  } else if (t < 0.38 && !burnt) {
    // rows of solar panels
    const rows = 2 + Math.floor(Rb() * 3), pw = Math.min(140, r.w * 0.5), x = r.x + 20 + Rb() * (r.w - pw - 40), y = r.y + 20 + Rb() * Math.max(1, r.h - rows * 22 - 40);
    for (let i = 0; i < rows; i++) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 3, y + i * 22 + 4, pw, 14); g.fillStyle = win ? '#c5d0d8' : '#1d2b45'; g.fillRect(x, y + i * 22, pw, 14); if (!win) { g.strokeStyle = 'rgba(120,160,220,0.35)'; g.lineWidth = 1; g.beginPath(); for (let k = 12; k < pw; k += 12) { g.moveTo(x + k, y + i * 22); g.lineTo(x + k, y + i * 22 + 14); } g.moveTo(x, y + i * 22 + 7); g.lineTo(x + pw, y + i * 22 + 7); g.stroke(); } }
  } else if (t < 0.46 && !burnt && !win && c.bio === 'city') {
    // a rooftop garden: planted beds and a deck
    const w = Math.min(160, r.w * 0.5), h = Math.min(120, r.h * 0.45), x = r.x + 20 + Rb() * (r.w - w - 40), y = r.y + 20 + Rb() * (r.h - h - 40);
    g.fillStyle = '#6b5440'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1; g.beginPath(); for (let k = 6; k < w; k += 6) { g.moveTo(x + k, y); g.lineTo(x + k, y + h); } g.stroke();
    for (let i = 0; i < 4; i++) { g.fillStyle = '#2f5a2a'; g.fillRect(x + 6 + (i % 2) * (w / 2), y + 6 + Math.floor(i / 2) * (h / 2), w / 2 - 12, h / 2 - 12); g.fillStyle = '#3d7a34'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x + 10 + (i % 2) * (w / 2) + Rb() * (w / 2 - 20), y + 10 + Math.floor(i / 2) * (h / 2) + Rb() * (h / 2 - 20), 4 + Rb() * 3, 0, TAU); g.fill(); } }
  }
}
// lodges, sheds, barns, tin shacks and trailers
function drawSmallBuilding(g, r, c, B, win, Rb, st) {
  const horiz = r.w >= r.h, snowy = win || c.bio === 'snow';
  const half = (col1, col2) => { g.fillStyle = col1; g.fillRect(r.x, r.y, r.w, r.h); g.fillStyle = col2; if (horiz) g.fillRect(r.x, r.y + r.h / 2, r.w, r.h / 2); else g.fillRect(r.x + r.w / 2, r.y, r.w / 2, r.h); };
  const ridge = (col) => { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); if (horiz) { g.moveTo(r.x + 3, r.y + r.h / 2); g.lineTo(r.x + r.w - 3, r.y + r.h / 2); } else { g.moveTo(r.x + r.w / 2, r.y + 3); g.lineTo(r.x + r.w / 2, r.y + r.h - 3); } g.stroke(); };
  const lines = (col, step) => { g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); if (horiz) for (let x = r.x + step; x < r.x + r.w; x += step) { g.moveTo(x, r.y); g.lineTo(x, r.y + r.h); } else for (let y = r.y + step; y < r.y + r.h; y += step) { g.moveTo(r.x, y); g.lineTo(r.x + r.w, y); } g.stroke(); };
  if (st === 'lodge') {
    // a big timber lodge: a dark roof under heavy snow, a stone chimney at each end, a porch roof along the front
    half(snowy ? '#e9eef2' : '#4a3a2e', snowy ? '#cfd8de' : '#3a2d23'); ridge(snowy ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.15)');
    g.fillStyle = '#6f6a64'; g.fillRect(r.x + 10, r.y + r.h * 0.25, 14, 14); g.fillRect(r.x + r.w - 24, r.y + r.h * 0.25, 14, 14);
    g.fillStyle = snowy ? '#bcc6cd' : '#2e241c'; g.fillRect(r.x + r.w * 0.25, r.y + r.h - 2, r.w * 0.5, 12);
    g.fillStyle = 'rgba(255,214,140,0.5)'; for (let i = 0; i < 4; i++) g.fillRect(r.x + r.w * (0.28 + i * 0.13), r.y + r.h + 8, 8, 3);
  } else if (st === 'shed') {
    half(snowy ? '#e2e8ec' : '#6b5440', snowy ? '#c8d1d7' : '#584432'); lines('rgba(0,0,0,0.18)', 5);
  } else if (st === 'barn') {
    // a red barn with a grey roof, a hayloft door and hay spilling out front
    half('#7a2e26', '#66261f'); ridge('rgba(255,255,255,0.18)'); lines('rgba(0,0,0,0.15)', 8);
    g.fillStyle = '#c9b06a'; g.beginPath(); g.ellipse(r.x + r.w / 2, r.y + r.h + 8, 18, 6, 0, 0, TAU); g.fill();
  } else if (st === 'shack') {
    // corrugated tin, patched and rusting
    g.fillStyle = '#7d7a72'; g.fillRect(r.x, r.y, r.w, r.h); lines('rgba(0,0,0,0.25)', 4);
    g.fillStyle = 'rgba(140,72,34,0.55)'; for (let i = 0; i < 3; i++) g.fillRect(r.x + Rb() * (r.w - 18), r.y + Rb() * (r.h - 14), 12 + Rb() * 10, 8 + Rb() * 8);
    g.fillStyle = '#5c5a54'; g.fillRect(r.x + r.w * 0.55, r.y + r.h * 0.2, r.w * 0.3, r.h * 0.35);
  } else {
    // a trailer home: a long white box with a stripe and a little roof vent
    g.fillStyle = '#d9d5c9'; rrect(g, r.x, r.y, r.w, r.h, 6); g.fill();
    g.fillStyle = '#5b7c8a'; g.fillRect(r.x + 4, r.y + r.h / 2 - 3, r.w - 8, 6);
    g.fillStyle = '#9b978d'; g.fillRect(r.x + r.w * 0.3, r.y + 6, 12, 8); g.fillRect(r.x + r.w * 0.7, r.y + 6, 10, 8);
    g.fillStyle = 'rgba(140,72,34,0.35)'; g.fillRect(r.x + 2, r.y + r.h - 6, r.w - 4, 4);
  }
  if (st === 'shed' || st === 'shack') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(r.x + r.w * 0.15, r.y + r.h - 3, r.w * 0.3, 3); }
  g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 2; g.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
}
// benches, statues, kiosks, market stalls, hoops, dumpsters, pools, wood piles, logs, wind pumps and tanks
function drawThing(g, r, c, B, win, Rb) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2, snowy = win || c.bio === 'snow', ash = c.bio === 'ash';
  const shadow = (dx, dy, a) => { g.fillStyle = 'rgba(0,0,0,' + (a || 0.4) + ')'; g.fillRect(r.x + (dx || 3), r.y + (dy || 4), r.w, r.h); };
  switch (r.k) {
    case 'pillar': {
      // a concrete pier holding up the highway: a square column with its cap, stained at the foot
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(r.x + 2, r.y + 3, r.w, r.h);
      g.fillStyle = '#7d8086'; g.fillRect(r.x, r.y, r.w, r.h); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(r.x, r.y, r.w, r.h * 0.3); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(r.x, r.y + r.h * 0.7, r.w, r.h * 0.3);
      g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1; g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      if (c.bio === 'chaos' || c.bio === 'ruins') { g.fillStyle = ['rgba(255,61,242,0.45)', 'rgba(125,255,74,0.4)', 'rgba(41,230,255,0.4)'][Math.floor(Rb() * 3)]; g.fillRect(r.x + 2, r.y + r.h * 0.4, r.w - 4, 3); }
      break;
    }
    case 'bench': {
      shadow(2, 3, 0.35); const horiz = r.w > r.h;
      g.fillStyle = ash ? '#4a4a4c' : '#6b4a2e'; g.fillRect(r.x, r.y, r.w, r.h);
      g.fillStyle = ash ? '#5a5a5d' : '#8a6440'; if (horiz) for (let i = 0; i < 3; i++) g.fillRect(r.x + 1, r.y + 1 + i * 4, r.w - 2, 2.4); else for (let i = 0; i < 3; i++) g.fillRect(r.x + 1 + i * 4, r.y + 1, 2.4, r.h - 2);
      g.fillStyle = '#2a2a2c'; if (horiz) { g.fillRect(r.x + 3, r.y - 1, 3, r.h + 2); g.fillRect(r.x + r.w - 6, r.y - 1, 3, r.h + 2); } else { g.fillRect(r.x - 1, r.y + 3, r.w + 2, 3); g.fillRect(r.x - 1, r.y + r.h - 6, r.w + 2, 3); }
      if (snowy) { g.fillStyle = 'rgba(236,241,245,0.8)'; g.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2); }
      break;
    }
    case 'statue': {
      g.fillStyle = 'rgba(0,0,0,0.42)'; g.beginPath(); g.ellipse(cx + 6, cy + 8, r.w * 0.62, r.h * 0.55, 0, 0, TAU); g.fill();
      g.fillStyle = '#6e6a63'; g.fillRect(r.x, r.y, r.w, r.h); g.fillStyle = '#85807a'; g.fillRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
      // a figure on a horse, seen from above, in old bronze
      g.fillStyle = ash ? '#56585a' : '#3f5a4c'; g.beginPath(); g.ellipse(cx, cy + 2, 6, 12, Rb() - 0.5, 0, TAU); g.fill();
      g.beginPath(); g.arc(cx, cy - 4, 4.5, 0, TAU); g.fill();
      g.strokeStyle = ash ? '#56585a' : '#3f5a4c'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx, cy - 4); g.lineTo(cx + 9, cy - 11); g.stroke();
      if (snowy) { g.fillStyle = 'rgba(236,241,245,0.85)'; g.beginPath(); g.arc(cx, cy - 5, 3, 0, TAU); g.fill(); g.fillRect(r.x, r.y, r.w, 4); }
      break;
    }
    case 'kiosk': {
      shadow(5, 6); g.fillStyle = '#2f4f3a'; g.fillRect(r.x, r.y, r.w, r.h); g.fillStyle = '#3d6a4c'; g.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
      g.fillStyle = ['#d8452e', '#f2cc3a', '#3a7dd8'][Math.floor(Rb() * 3)]; for (let i = 0; i < 4; i++) g.fillRect(r.x + 4 + i * 7, r.y + r.h - 7, 5, 4);
      if (snowy) { g.fillStyle = 'rgba(236,241,245,0.8)'; g.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h * 0.5); }
      break;
    }
    case 'stall': {
      shadow(5, 7, 0.38);
      const cols = [['#c9402e', '#e8e2d4'], ['#2f6fb0', '#e8e2d4'], ['#3d8a4a', '#f2e6c4'], ['#d89a2e', '#5a3a1e']], cc = cols[Math.floor(Rb() * cols.length)];
      if (r.burnt) { g.fillStyle = '#2a2420'; g.fillRect(r.x, r.y, r.w, r.h); g.strokeStyle = '#141110'; g.lineWidth = 2; for (let x = r.x + 6; x < r.x + r.w; x += 10) { g.beginPath(); g.moveTo(x, r.y); g.lineTo(x + (Rb() - 0.5) * 6, r.y + r.h); g.stroke(); } soot(g, cx, cy, r.w * 0.6, 0.5); break; }
      // a striped canvas awning over the counter, and crates of goods along the front
      for (let i = 0; i < 6; i++) { g.fillStyle = cc[i % 2]; g.fillRect(r.x + i * r.w / 6, r.y, r.w / 6 + 0.5, r.h * 0.72); }
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(r.x, r.y + r.h * 0.36, r.w, r.h * 0.36);
      g.fillStyle = '#6b4a2e'; g.fillRect(r.x, r.y + r.h * 0.72, r.w, r.h * 0.28);
      for (let i = 0; i < 4; i++) { g.fillStyle = ['#c9402e', '#e0a83a', '#7db84a', '#e8e2d4'][Math.floor(Rb() * 4)]; g.fillRect(r.x + 4 + i * (r.w - 8) / 4, r.y + r.h * 0.76, (r.w - 8) / 4 - 3, r.h * 0.18); }
      if (snowy) { g.fillStyle = 'rgba(236,241,245,0.75)'; g.fillRect(r.x, r.y, r.w, r.h * 0.5); }
      break;
    }
    case 'hoop':
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(r.x + 3, r.y + 4, r.w, r.h);
      g.fillStyle = '#d9d5c9'; g.fillRect(r.x, r.y, r.w, r.h); g.strokeStyle = '#e0602e'; g.lineWidth = 2; g.beginPath(); g.arc(cx + (r.x < c.ox + CH / 2 ? 9 : -9), cy, 5, 0, TAU); g.stroke();
      break;
    case 'bags': {
      // black and green bin bags, knotted, one split open
      const R = Z.mulberry32(r.s || 9), n = 3 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) { const x = r.x + 4 + R() * (r.w - 8), y = r.y + 3 + R() * (r.h - 6), rr = 3.6 + R() * 2.2, col = R() < 0.7 ? '#141516' : R() < 0.5 ? '#2a3a26' : '#3a3d42';
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x + 1.5, y + 2, rr, rr * 0.85, 0, 0, TAU); g.fill();
        g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rr, rr * 0.85, R(), 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(x - rr * 0.3, y - rr * 0.3, rr * 0.35, rr * 0.2, -0.6, 0, TAU); g.fill();
        g.fillStyle = '#0a0a0a'; g.beginPath(); g.arc(x + rr * 0.6, y - rr * 0.5, 1, 0, TAU); g.fill(); }
      if (R() < 0.5) { g.fillStyle = 'rgba(120,100,70,0.7)'; for (let i = 0; i < 6; i++) g.fillRect(r.x + r.w * R(), r.y + r.h + R() * 6, 1.6 + R() * 2, 1.2 + R() * 1.6); }
      if (snowy) { g.fillStyle = 'rgba(236,241,245,0.6)'; g.fillRect(r.x + 2, r.y + 1, r.w - 4, r.h * 0.4); }
      break;
    }
    case 'pallets': {
      // a stack of wooden pallets (1.2 by 1.0 m), deck boards across the stringers
      const R = Z.mulberry32(r.s || 4), n = r.n || 1; shadow(2 + n, 3 + n, 0.35);
      g.fillStyle = '#6a4a2a'; g.fillRect(r.x, r.y, r.w, r.h);
      g.fillStyle = '#a07a4a'; for (let i = 0; i < 5; i++) g.fillRect(r.x + 0.5, r.y + 0.5 + i * (r.h - 1) / 4.5, r.w - 1, 1.8);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(r.x + 1, r.y, 1.4, r.h); g.fillRect(r.x + r.w / 2 - 0.7, r.y, 1.4, r.h); g.fillRect(r.x + r.w - 2.4, r.y, 1.4, r.h);
      if (n > 1) { g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.8; g.strokeRect(r.x + 0.5 + R(), r.y + 0.5, r.w - 1, r.h - 1); }
      if (snowy) { g.fillStyle = 'rgba(236,241,245,0.75)'; g.fillRect(r.x, r.y, r.w, r.h * 0.6); }
      break;
    }
    case 'rolloff': {
      // a roll-off container: steel walls with ribs, the rails it slides on, rubble and junk heaped inside
      const R = Z.mulberry32(r.s || 6), horiz = r.w > r.h, col = r.burnt ? '#2e2a26' : ['#2f5f8a', '#c25a1e', '#3d6a3a', '#6b6f75'][Math.floor((r.col || 0) * 4)];
      shadow(4, 6, 0.45); g.fillStyle = col; g.fillRect(r.x, r.y, r.w, r.h);
      g.fillStyle = 'rgba(0,0,0,0.25)'; if (horiz) for (let x = r.x + 6; x < r.x + r.w - 2; x += 9) { g.fillRect(x, r.y, 1.6, 2.4); g.fillRect(x, r.y + r.h - 2.4, 1.6, 2.4); } else for (let y = r.y + 6; y < r.y + r.h - 2; y += 9) { g.fillRect(r.x, y, 2.4, 1.6); g.fillRect(r.x + r.w - 2.4, y, 2.4, 1.6); }
      g.fillStyle = '#2a2622'; g.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
      for (let i = 0; i < 26; i++) { const s = 2 + R() * 6; g.fillStyle = ['#8a8478', '#6b5a48', '#4a4a4e', '#a39a88', '#5a3d26', '#2f2f33'][Math.floor(R() * 6)]; g.save(); g.translate(r.x + 5 + R() * (r.w - 10), r.y + 5 + R() * (r.h - 10)); g.rotate(R() * 3); g.fillRect(-s / 2, -s / 3, s, s * 0.66); g.restore(); }
      g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1; g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      if (r.burnt) soot(g, cx, cy, Math.max(r.w, r.h) * 0.5, 0.5);
      if (snowy) { g.fillStyle = 'rgba(236,241,245,0.7)'; g.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6); }
      break;
    }
    case 'dumpster': {
      shadow(4, 5, 0.45); const horiz = r.w > r.h;
      g.fillStyle = r.burnt ? '#2a2724' : ['#2f5a3a', '#2f4a6a', '#5a4a2a'][Math.floor((r.col || 0) * 3)]; g.fillRect(r.x, r.y, r.w, r.h);
      g.fillStyle = 'rgba(0,0,0,0.28)'; if (horiz) g.fillRect(r.x + r.w / 2 - 1, r.y, 2, r.h); else g.fillRect(r.x, r.y + r.h / 2 - 1, r.w, 2);
      g.fillStyle = 'rgba(255,255,255,0.1)'; if (horiz) g.fillRect(r.x, r.y, r.w, 3); else g.fillRect(r.x, r.y, 3, r.h);
      if (r.burnt) soot(g, cx, cy, Math.max(r.w, r.h) * 0.6, 0.45);
      if (snowy) { g.fillStyle = 'rgba(236,241,245,0.8)'; g.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2); }
      break;
    }
    case 'pool': {
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(r.x + 3, r.y + 4, r.w, r.h);
      g.fillStyle = '#c9c3b5'; rrect(g, r.x - 4, r.y - 4, r.w + 8, r.h + 8, 5); g.fill();
      if (win) { g.fillStyle = '#3d5a7a'; rrect(g, r.x, r.y, r.w, r.h, 4); g.fill(); g.fillStyle = 'rgba(236,241,245,0.8)'; rrect(g, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 3); g.fill(); break; }
      g.fillStyle = c.bio === 'suburb' ? '#2a8aa8' : '#2a6a78'; rrect(g, r.x, r.y, r.w, r.h, 4); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.18)'; rrect(g, r.x + 2, r.y + 2, r.w - 4, 6, 3); g.fill();
      g.strokeStyle = 'rgba(200,245,255,0.35)'; g.lineWidth = 1.2; g.beginPath(); for (let i = 0; i < 5; i++) { const x = r.x + 6 + Rb() * (r.w - 18), y = r.y + 8 + Rb() * (r.h - 14); g.moveTo(x, y); g.quadraticCurveTo(x + 5, y - 3, x + 10, y); } g.stroke();
      g.fillStyle = '#e8e2d4'; g.fillRect(r.x + r.w - 10, r.y - 6, 3, 10); g.fillRect(r.x + r.w - 5, r.y - 6, 3, 10);
      break;
    }
    case 'wood': {
      shadow(2, 3, 0.35); const horiz = r.w > r.h, n = Math.floor((horiz ? r.w : r.h) / 6);
      g.fillStyle = '#5a3d26'; g.fillRect(r.x, r.y, r.w, r.h);
      for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { const x = horiz ? r.x + 3 + i * 6 : r.x + 3 + j * 6, y = horiz ? r.y + 3 + j * 6 : r.y + 3 + i * 6; g.fillStyle = '#8a6440'; g.beginPath(); g.arc(x, y, 2.6, 0, TAU); g.fill(); g.fillStyle = '#c49a68'; g.beginPath(); g.arc(x, y, 1.2, 0, TAU); g.fill(); }
      if (snowy) { g.fillStyle = 'rgba(236,241,245,0.85)'; if (horiz) g.fillRect(r.x, r.y, r.w, 3); else g.fillRect(r.x, r.y, 3, r.h); }
      break;
    }
    case 'log': {
      const horiz = r.w > r.h; g.fillStyle = 'rgba(0,0,0,0.3)'; rrect(g, r.x + 3, r.y + 4, r.w, r.h, 4); g.fill();
      g.fillStyle = '#4a3424'; rrect(g, r.x, r.y, r.w, r.h, 4); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); if (horiz) { g.moveTo(r.x + 4, cy - 1); g.lineTo(r.x + r.w - 4, cy - 1); } else { g.moveTo(cx - 1, r.y + 4); g.lineTo(cx - 1, r.y + r.h - 4); } g.stroke();
      g.fillStyle = '#9a7650'; g.beginPath(); if (horiz) g.ellipse(r.x + r.w - 2, cy, 2.5, r.h / 2 - 1, 0, 0, TAU); else g.ellipse(cx, r.y + r.h - 2, r.w / 2 - 1, 2.5, 0, 0, TAU); g.fill();
      if (snowy) { g.fillStyle = 'rgba(236,241,245,0.85)'; if (horiz) g.fillRect(r.x + 3, r.y, r.w - 6, r.h * 0.45); else g.fillRect(r.x, r.y + 3, r.w * 0.45, r.h - 6); }
      break;
    }
    case 'trough': shadow(2, 3, 0.35); g.fillStyle = '#6e6a63'; g.fillRect(r.x, r.y, r.w, r.h); g.fillStyle = c.D.warm > 0.5 ? '#3a6a6a' : '#5a4a36'; g.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6); break;
    case 'windmill': {
      // the tower's legs, then the wheel of blades seen from above and the tail vane
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(cx + 10, cy + 12, 22, 9, 0.5, 0, TAU); g.fill();
      g.strokeStyle = '#4a4440'; g.lineWidth = 2; g.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4); g.beginPath(); g.moveTo(r.x + 2, r.y + 2); g.lineTo(r.x + r.w - 2, r.y + r.h - 2); g.moveTo(r.x + r.w - 2, r.y + 2); g.lineTo(r.x + 2, r.y + r.h - 2); g.stroke();
      const a = Rb() * TAU; g.strokeStyle = '#8a8f96'; g.lineWidth = 1.6; g.beginPath();
      for (let i = 0; i < 12; i++) { const b = a + i / 12 * TAU; g.moveTo(cx + Math.cos(b) * 4, cy + Math.sin(b) * 4); g.lineTo(cx + Math.cos(b) * 17, cy + Math.sin(b) * 17); } g.stroke();
      g.fillStyle = '#b03a2e'; g.save(); g.translate(cx, cy); g.rotate(a); g.fillRect(4, -2, 22, 4); g.fillRect(22, -7, 6, 14); g.restore();
      break;
    }
    case 'tank': {
      g.fillStyle = 'rgba(0,0,0,0.38)'; g.beginPath(); g.ellipse(cx + 5, cy + 7, r.w / 2, r.h / 2, 0, 0, TAU); g.fill();
      g.fillStyle = '#6e7276'; g.beginPath(); g.arc(cx, cy, r.w / 2, 0, TAU); g.fill(); g.fillStyle = '#7f8388'; g.beginPath(); g.arc(cx - 2, cy - 2, r.w / 2 - 5, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; for (let i = 1; i < 3; i++) { g.beginPath(); g.arc(cx, cy, r.w / 2 - i * 5, 0, TAU); g.stroke(); }
      break;
    }
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
  g.fillStyle = 'rgba(0,0,0,0.26)'; g.beginPath(); g.ellipse(cx + 4, cy + 5, r.w * 0.44, r.h * 0.42, 0, 0, TAU); g.fill();
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
function lightsOf0(cx, cy) {
  const R = chunkRng(cx, cy, 0x51f15e), ox = cx * CH, oy = cy * CH, L = [], b = distAt(cx, cy).bio;
  const p = { city: 0.85, burning: 0.45, chaos: 0.7, ruins: 0.35, ash: 0.35, suburb: 0.8, desert: 0.25, snow: 0.55 }[b] || 0.8;
  const cold = b === 'ash' || b === 'snow' ? 0.7 : 0.15;
  if (R() < p) L.push({ x: ox + ROAD + 10, y: oy + ROAD + 10, cold: R() < cold, broken: (b === 'ruins' || b === 'chaos') && R() < 0.45 });
  if (R() < p * 0.6) L.push({ x: ox + ROAD + BS * 0.5, y: oy + ROAD + 9, cold: false, broken: b === 'ruins' && R() < 0.4 });
  if (R() < p * 0.6) L.push({ x: ox + ROAD + 9, y: oy + ROAD + BS * 0.5, cold: false, broken: b === 'ruins' && R() < 0.4 });
  // each lamp's type (the colour of its light) and where its head hangs: the arm reaches out over the road
  for (const l of L) { const t = R(); l.type = l.cold ? 'led' : b === 'city' ? (t < 0.45 ? 'led' : t < 0.65 ? 'halide' : 'sodium') : b === 'suburb' ? (t < 0.35 ? 'led' : 'sodium') : b === 'chaos' ? (t < 0.2 ? 'halide' : 'sodium') : 'sodium'; l.hx = l.x - (l.x === ox + ROAD + 9 || l.x === ox + ROAD + 10 ? 24 : 0); l.hy = l.y - (l.y === oy + ROAD + 9 || l.y === oy + ROAD + 10 ? 24 : 0); }
  if (typeof skyLamps === 'function') skyLamps(cx, cy, L);
  return L;
}
// the street lamps of a block, in simulation units (the pole is a pole: only its position scales)
function lightsOf(cx, cy) { const L = lightsOf0(cx, cy); for (const l of L) { l.x *= SCL; l.y *= SCL; l.hx = (l.hx == null ? l.x / SCL : l.hx) * SCL; l.hy = (l.hy == null ? l.y / SCL : l.hy) * SCL; } return L; }
function bakeLights(g, c) {
  const ox = c.ox, oy = c.oy;
  g.globalCompositeOperation = 'lighter';
  // with the lighting engine on, the lamps light the street for real (and only after dark): no painted-on pools
  if (SET.lux !== 'off') { g.globalCompositeOperation = 'source-over'; for (const L of lightsOf0(c.cx, c.cy)) lampPost(g, L); return; }
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    for (const L of lightsOf0(c.cx + dx, c.cy + dy)) {
      if (L.broken || L.x < ox - 190 || L.x > ox + CH + 190 || L.y < oy - 190 || L.y > oy + CH + 190) continue;
      const gr = g.createRadialGradient(L.x, L.y, 4, L.x, L.y, 185);
      if (L.cold) { gr.addColorStop(0, 'rgba(150,190,255,0.24)'); gr.addColorStop(1, 'rgba(150,190,255,0)'); }
      else { gr.addColorStop(0, 'rgba(255,186,90,0.26)'); gr.addColorStop(0.5, 'rgba(255,170,70,0.08)'); gr.addColorStop(1, 'rgba(255,170,70,0)'); }
      g.fillStyle = gr; g.fillRect(L.x - 185, L.y - 185, 370, 370);
    }
  }
  g.globalCompositeOperation = 'source-over';
  for (const L of lightsOf0(c.cx, c.cy)) lampPost(g, L);
}
// a street lamp from above: the pole's foot, the arm out over the road, and the head with its lens
function lampPost(g, L) {
  if (L.hw) return;
  const hx = L.hx == null ? L.x : L.hx, hy = L.hy == null ? L.y : L.hy;
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(L.x + 1.5, L.y + 2); g.lineTo(hx + 1.5, hy + 2); g.stroke();
  g.strokeStyle = '#3a3d42'; g.lineWidth = 2; g.beginPath(); g.moveTo(L.x, L.y); g.lineTo(hx, hy); g.stroke();
  g.fillStyle = '#1a1b1d'; g.beginPath(); g.arc(L.x, L.y, 3.6, 0, TAU); g.fill();
  g.fillStyle = '#2a2c30'; g.save(); g.translate(hx, hy); g.rotate(Math.atan2(hy - L.y, hx - L.x) || 0); g.fillRect(-4, -3, 8, 6); g.restore();
  g.fillStyle = L.broken ? '#444' : L.type === 'led' ? '#e6eeff' : L.type === 'halide' ? '#fff4e0' : '#ffd38a'; g.beginPath(); g.arc(hx, hy, 2.2, 0, TAU); g.fill();
}
// the moving glints on a river, drawn once per chunk and slid back and forth while you play
function waterLayer(c) {
  if (c.wcan !== null && c.wcan !== undefined) return c.wcan;
  if (!c.fv || c.bio === 'desert' || c.bio === 'snow' || winterOn(c)) { c.wcan = false; return false; }
  const sc = Math.min(0.5, Q.chunkScale) * Math.min(c.k, 1.5), can = document.createElement('canvas'); can.width = can.height = Math.round(CH * sc);
  const g = can.getContext('2d'); g.scale(sc, sc); g.translate(-c.ox, -c.oy);
  g.beginPath(); g.rect(c.ox + ROAD, c.oy + ROAD, BS, BS); g.clip();
  const bx = c.wbox || (c.wbox = isoBox(c.fv, 0.9)); if (!bx) { c.wcan = false; return false; }
  const R = chunkRng(c.cx, c.cy, 0x9a7e);
  // a moving web of light (caustics) and glints on the surface, then cut to the water
  const cp = typeof texelGroundPat === 'function' && texelLevel() >= 1 ? texelGroundPat(g, 'caustic', 0.3) : null;
  if (cp) { g.globalAlpha = 0.22; g.fillStyle = cp; g.fillRect(c.ox, c.oy, CH, CH); g.globalAlpha = 1; }
  g.strokeStyle = 'rgba(190,230,240,0.5)'; g.lineWidth = 1.6; g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < 160; i++) { const x = c.ox + R() * CH, y = c.oy + R() * CH, l = 6 + R() * 16; g.moveTo(x, y); g.lineTo(x + l, y + l * 0.2); }
  g.stroke();
  g.globalCompositeOperation = 'destination-in'; g.fillStyle = '#000'; isoFill(g, c.fv, c.ox, c.oy, -0.15, null, bx);
  c.wcan = can; c.wsc = sc;
  return can;
}
/* CORE v3: what the city generator learns and checks. It times every block it draws, so streaming ahead only builds
   a block when one fits in the frame (and two when there is plenty of room); it checks that its block cache stays
   bounded and every block it drew has a picture; and at start it builds the same far-away block twice from the seed
   and checks both come out the same (the city must be identical on every device and for everyone in co-op). */
function worldLearn(ms) {
  if (typeof LEARN === 'undefined' || !LEARN.ready || !CORE.by.WORLD) return;
  const o = learnOwn('WORLD'), k = 'c' + Math.round((Q.chunkScale || 1) * 4);
  o[k] = o[k] ? o[k] * 0.85 + ms * 0.15 : ms; o.n = (o.n | 0) + 1; if (o.n % 20 === 0) learnDirty();
}
function worldChunkMs() { if (typeof LEARN === 'undefined' || !LEARN.ready || !CORE.by.WORLD) return 0; const o = learnOwn('WORLD'); return o['c' + Math.round((Q.chunkScale || 1) * 4)] || 0; }
function worldSig(c) { let h = c.rects.length * 31 + (c.bio ? c.bio.length : 0); for (const r of c.rects) h = (h * 33 + Math.round(r.x) * 7 + Math.round(r.y) * 13 + Math.round(r.w) + Math.round(r.h) * 3 + (r.k ? r.k.length : 0)) | 0; return h; }
coreMeta('WORLD', { ver: 2, adapts: 'block sharpness by tier; streams ahead only what fits the frame', provides: ['city', 'water', 'districts'], lv: () => Math.round((Q.chunkScale || 1) * 4), loadNow: () => WORLD.rf | 0, loadName: 'blocks drawn a frame',
  check: () => chunks.size > 600 ? 'its block cache overflowed (' + chunks.size + ')' : '',
  repair: () => { trimCaches(0); }, reset: () => { trimCaches(2); },
  learned: () => { const ms = worldChunkMs(); return ms ? ['Drawing a block takes about ' + ms.toFixed(1) + ' ms here at this sharpness; it streams one ahead only when that fits the frame' + (learnFree() > ms * 3 ? ', and two at a time right now.' : '.')] : []; },
  selfTest: () => {
    const gw = GARAGE.wrecks, cx = 9001 + (WORLD.seed & 63), cy = -7003;
    try { const a = worldSig(genChunk(cx, cy)), b = worldSig(genChunk(cx, cy)); GARAGE.wrecks = gw; return { ok: a === b, n: 1, pass: a === b ? 1 : 0, why: a === b ? '' : 'the same block came out two different ways from one seed' }; }
    catch (x) { GARAGE.wrecks = gw; return { ok: false, n: 1, pass: 0, why: String(x && x.message || x).slice(0, 60) }; }
  } });
