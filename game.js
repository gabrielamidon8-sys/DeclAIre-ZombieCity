(function () {
'use strict';

/* ================= setup ================= */
const Z = ZC, MUTS = Z.buildMutations(), STRAINS = Z.STRAINS, ABILITIES = Z.ABILITIES, RARITY = Z.RARITY;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = (a, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const $ = (id) => document.getElementById(id);
const pad3 = (n) => String(n).padStart(3, '0');
const angLerp = (a, b, t) => { const d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * t; };
let RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);   // the Reduce motion setting can change it
const TOUCH = window.matchMedia && matchMedia('(pointer: coarse)').matches;
const IS_APP = !!window.ZC_APP;   // set by the Android app build
const ZC_VERSION = '1.9.995';

STRAINS.forEach(S => { S.gore = 'hsl(' + S.skin[0] + ',' + Math.min(80, S.skin[1] + 10) + '%,' + Math.max(12, S.skin[2] - 14) + '%)'; });

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
};

/* ---------- monthly season ---------- */
function seasonKey(d) { d = d || new Date(); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'); }
const SEASON = seasonKey();
const SEASON_NAME = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
function seasonLeft() {
  const d = new Date(), end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1), ms = end - Date.now();
  const dd = Math.floor(ms / 864e5), hh = Math.floor(ms % 864e5 / 36e5);
  return dd > 0 ? dd + 'd ' + hh + 'h' : hh + 'h ' + Math.floor(ms % 36e5 / 6e4) + 'm';
}

const found = new Set(store.get('zc_found', []));
function saveFound() { store.set('zc_found', Array.from(found)); }

/* ================= canvas ================= */
const cv = $('cv'), ctx = cv.getContext('2d');
let W = 1, H = 1, DPR = 1, ZOOM = 1, SPR = 1, vignette = null;
// shared with the crowd engine (swarm.js): vehicles the crowd has moved (the collision code finds them anywhere), how
// many zombie pictures are in use this frame (the sprite cache keeps at least that many), the last thing collide() hit
const SWDYN = new Map(), SWKEEP = { n: 0 }, COL = { r: null, nx: 0, ny: 0 };
const sprites = new Map();
function resize() {
  const r = cv.getBoundingClientRect();
  W = Math.max(1, r.width); H = Math.max(1, r.height);
  // render resolution comes from the quality governor: the device's pixel density, capped per tier, times a scale step
  DPR = Math.max(0.5, Math.min(window.devicePixelRatio || 1, Q.dpr) * (PERF.resLock || RES_STEPS[PERF.res]));
  const cw = Math.max(1, Math.round(W * DPR)), ch = Math.max(1, Math.round(H * DPR));
  if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  const nz = clamp(Math.min(W, H) / 480, 0.66, 1.2) * (typeof SET !== 'undefined' ? 100 / SET.zoom : 1), ns = DPR * nz * Q.spr;
  if (Math.abs(nz - ZOOM) > 0.001 || Math.abs(SPR - ns) > 0.001) { ZOOM = nz; SPR = ns; sprites.clear(); }
}
window.addEventListener('resize', resize);

function getSprite(m, r, plain) {
  const rq = Math.max(3, Math.round(r));
  const key = m.id + '|' + rq + '|' + (plain ? 1 : 0);
  let s = sprites.get(key);
  if (s) { sprites.delete(key); sprites.set(key, s); return s; }   // keep the map in least-recently-used order
  const half = rq * 2.4, size = Math.ceil(half * 2 * SPR);
  const c = texelZombie(m, rq, plain, half, size);   // drawn, textured and sized by the texture engine
  s = { c: c, half: half, rq: rq };
  sprites.set(key, s);
  if (sprites.size > Math.max(Q.sprCap, SWKEEP.n) * 1.25) sprites.delete(sprites.keys().next().value);
  return s;
}

/* ================= city ================= */
const CH = 640, ROAD = 112, BS = CH - ROAD;
/* ---------- real-world scale ----------
   32 units are one metre. A block is still laid out in the CH-wide units above, but with the world scale on it is
   played SCL times bigger: roads about 8 m, cars 4.5 m, a person 0.55 m across (PK), a normal zombie a little more
   (ZK), a big mutant 1 to 2 m, a boss 2 to 4 m. 'Classic' (SCL 1) is the old, compact city with the old sizes. */
const SCALE_REAL = 2.4;
let SCL = 1, CHS = CH, ROADS = ROAD, PK = 1, ZK = 1, ZP = 1, BOSSK = 1.9;
function setWorldScale(k) {
  if (k === SCL && chunks.size) return;
  const real = k > 1.2;
  SCL = k; CHS = CH * k; ROADS = ROAD * k;
  PK = real ? 0.75 : 1; ZK = real ? 0.72 : 1; ZP = real ? 1.9 : 1; BOSSK = real ? 4.6 : 1.9;
  FF_CS = real ? 40 : 32; FF_N = real ? 112 : 84;
  chunks.clear(); fieldsReset(); WLC = null;
}
// how big a zombie is, in units: a mutation's size grows faster than it did, so a colossal one towers
const zombieR = (size, sc) => { const r = 14 * ZK * Math.pow(size, ZP) * sc; return ZP > 1 && sc >= BOSSK ? Math.min(r, 84) : r; };
let citySeed = (Math.random() * 1e9) | 0;
const chunks = new Map();
const ROOFS = ['#353a42', '#3e3b36', '#363e3b', '#433d35', '#343846', '#404249', '#3a3530'];
const CARS = ['#7b2f2b', '#2f4f6b', '#6b6b6b', '#c9c3b5', '#2d3a2c', '#8a6a2a', '#22262b', '#5a3a5e'];
function chunkRng(cx, cy, salt) { return Z.mulberry32(Z.hash32((cx * 73856093) ^ (cy * 19349663) ^ citySeed ^ salt)); }
function getChunk(cx, cy) {
  const k = cx + ',' + cy; let c = chunks.get(k);
  if (!c) { c = genChunk(cx, cy); chunks.set(k, c); if (typeof swarmChunk === 'function') swarmChunk(c, k); }
  return c;
}
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function drawCar(g, r) {
  const horiz = r.w > r.h, L = Math.max(r.w, r.h), Wd = Math.min(r.w, r.h), h2 = Wd / 2, l2 = L / 2;
  g.save(); g.translate(r.x + r.w / 2, r.y + r.h / 2); if (!horiz) g.rotate(Math.PI / 2);
  g.fillStyle = 'rgba(0,0,0,0.42)'; rrect(g, -l2 + 4, -h2 + 5, L, Wd, 6); g.fill();
  // tyres peeking out under the body
  g.fillStyle = '#0b0b0c'; for (const x of [-L * 0.3, L * 0.3]) { g.fillRect(x - 5, -h2 - 1.5, 10, 3); g.fillRect(x - 5, h2 - 1.5, 10, 3); }
  if (r.burnt) {
    // a burned-out shell: charred paint, rust blooming through, the glass gone, embers still glowing
    g.fillStyle = r.rust ? '#5a3a26' : '#433b36'; rrect(g, -l2, -h2, L, Wd, 6); g.fill();
    g.fillStyle = 'rgba(126,66,32,0.6)'; g.fillRect(-l2 + 4, -h2 + 2, L * 0.22, Wd * 0.3); g.fillRect(L * 0.15, h2 - Wd * 0.34, L * 0.25, Wd * 0.3);
    const gr = g.createRadialGradient(0, 0, 2, 0, 0, l2); gr.addColorStop(0, 'rgba(6,5,4,0.75)'); gr.addColorStop(1, 'rgba(6,5,4,0.1)'); g.fillStyle = gr; rrect(g, -l2, -h2, L, Wd, 6); g.fill();
    g.fillStyle = '#090807'; g.fillRect(L * 0.08, -h2 + 3, L * 0.18, Wd - 6); g.fillRect(-L * 0.36, -h2 + 3, L * 0.13, Wd - 6);
    g.fillStyle = '#2c2522'; g.fillRect(-L * 0.2, -h2 + 4, L * 0.27, Wd - 8);
    g.strokeStyle = 'rgba(170,160,150,0.4)'; g.lineWidth = 1; rrect(g, -l2 + 0.5, -h2 + 0.5, L - 1, Wd - 1, 6); g.stroke();
    if (!r.rust) { g.fillStyle = '#ff7a1a'; for (let i = 0; i < 4; i++) g.fillRect(-l2 + ((i * 37) % L), -Wd / 4 + (i % 2) * Wd / 3, 2, 2); }
  } else {
    g.fillStyle = r.col; rrect(g, -l2, -h2, L, Wd, 6); g.fill();
    // light from above: a brighter roof and bonnet, a darker band along the sides
    g.fillStyle = 'rgba(255,255,255,0.1)'; rrect(g, -l2 + 3, -h2 + 3, L - 6, Wd - 6, 4); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(-l2 + 4, -h2, L - 8, 2.5); g.fillRect(-l2 + 4, h2 - 2.5, L - 8, 2.5);
    // windscreen (front), rear window, and the roof between them
    g.fillStyle = '#1b222a'; g.fillRect(L * 0.08, -h2 + 3, L * 0.18, Wd - 6); g.fillRect(-L * 0.36, -h2 + 3, L * 0.13, Wd - 6);
    g.fillStyle = 'rgba(160,200,230,0.22)'; g.fillRect(L * 0.1, -h2 + 4, L * 0.05, Wd - 8);
    g.fillStyle = 'rgba(255,255,255,0.09)'; g.fillRect(-L * 0.2, -h2 + 4, L * 0.27, Wd - 8);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(L * 0.3, -h2 + 4); g.lineTo(L * 0.3, h2 - 4); g.stroke();
    // mirrors, headlights at the front, tail lights at the back
    g.fillStyle = r.col; g.fillRect(L * 0.06, -h2 - 2.5, 4, 3); g.fillRect(L * 0.06, h2 - 0.5, 4, 3);
    g.fillStyle = '#f3e3a8'; g.fillRect(l2 - 3, -h2 + 3, 3, 4); g.fillRect(l2 - 3, h2 - 7, 3, 4);
    g.fillStyle = '#b8262a'; g.fillRect(-l2, -h2 + 3, 2.5, 4); g.fillRect(-l2, h2 - 7, 2.5, 4);
    if (r.police) { g.fillStyle = '#e8e6e0'; g.fillRect(-L * 0.05, -h2, L * 0.12, Wd); g.fillStyle = '#ff2d2d'; g.fillRect(-L * 0.12, -h2 + 3, 5, h2 - 3); g.fillStyle = '#2d6bff'; g.fillRect(-L * 0.12, 0, 5, h2 - 3); }
  }
  g.restore();
}
const tmpR = [];
// solid things near a point. Each chunk sorts its rectangles into 16 buckets, so a lookup only checks what is close by.
function rectsNear(x, y, rad) {
  tmpR.length = 0; const q = ++RQ;
  const x0 = Math.floor((x - rad) / CHS), x1 = Math.floor((x + rad) / CHS), y0 = Math.floor((y - rad) / CHS), y1 = Math.floor((y + rad) / CHS);
  for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) {
    const c = getChunk(i, j), bk = c.bk, bs = c.bs;
    const bx0 = clamp(Math.floor((x - rad - c.sx) / bs), 0, 3), bx1 = clamp(Math.floor((x + rad - c.sx) / bs), 0, 3);
    const by0 = clamp(Math.floor((y - rad - c.sy) / bs), 0, 3), by1 = clamp(Math.floor((y + rad - c.sy) / bs), 0, 3);
    for (let bi = bx0; bi <= bx1; bi++) for (let bj = by0; bj <= by1; bj++) {
      const rs = bk[bj * 4 + bi];
      for (let n = 0; n < rs.length; n++) { const r = rs[n]; if (r._q === q) continue; r._q = q; if (x + rad > r.x && x - rad < r.x + r.w && y + rad > r.y && y - rad < r.y + r.h) tmpR.push(r); }
    }
  }
  // vehicles the crowd has pushed can be anywhere, so they are checked wherever they ended up
  if (SWDYN.size) for (const r of SWDYN.values()) { if (r._q === q) continue; r._q = q; if (x + rad > r.x && x - rad < r.x + r.w && y + rad > r.y && y - rad < r.y + r.h) tmpR.push(r); }
  return tmpR;
}
function collide(e, r, big) {
  const rs = rectsNear(e.x, e.y, r); let hit = false; COL.r = null;
  for (let i = 0; i < rs.length; i++) {
    const b = rs[i]; if (big && !SOLID[b.k]) continue;
    const nx = clamp(e.x, b.x, b.x + b.w), ny = clamp(e.y, b.y, b.y + b.h);
    const dx = e.x - nx, dy = e.y - ny, d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      hit = true; COL.r = b;
      if (d2 > 1e-6) { const d = Math.sqrt(d2); COL.nx = dx / d; COL.ny = dy / d; e.x = nx + dx / d * r; e.y = ny + dy / d * r; }
      else {
        const l = e.x - b.x, rr = b.x + b.w - e.x, t = e.y - b.y, bt = b.y + b.h - e.y, m = Math.min(l, rr, t, bt);
        if (m === l) { e.x = b.x - r; COL.nx = -1; COL.ny = 0; } else if (m === rr) { e.x = b.x + b.w + r; COL.nx = 1; COL.ny = 0; } else if (m === t) { e.y = b.y - r; COL.nx = 0; COL.ny = -1; } else { e.y = b.y + b.h + r; COL.nx = 0; COL.ny = 1; }
      }
    }
  }
  return hit;
}
function blocked(x, y, r, big) {
  const rs = rectsNear(x, y, r);
  for (let i = 0; i < rs.length; i++) { const b = rs[i]; if (big && !SOLID[b.k]) continue; const nx = clamp(x, b.x, b.x + b.w), ny = clamp(y, b.y, b.y + b.h); if ((x - nx) * (x - nx) + (y - ny) * (y - ny) < r * r) return true; }
  return false;
}

/* ================= spatial grid ================= */
// the crowd engine keeps one flat grid of every zombie (swarm.js); this plain one covers for it if it is resting
const CELL = 64; const grid = new Map(); let gridSw = false;
const gk = (cx, cy) => (cx + 32768) * 65536 + (cy + 32768);
function buildGrid() {
  if (typeof swarmGrid === 'function' && swarmUp()) { try { swarmGrid(); gridSw = true; return; } catch (e) { swarmHurt(e, 'grid'); } }
  gridSw = false; grid.clear();
  for (const z of G.zs) { if (z.dead) continue; const k = gk(Math.floor(z.x / CELL), Math.floor(z.y / CELL)); let a = grid.get(k); if (!a) { a = []; grid.set(k, a); } a.push(z); }
}
function near(x, y, rad, fn) {
  if (gridSw) { swarmNear(x, y, rad, fn); return; }
  const x0 = Math.floor((x - rad) / CELL), x1 = Math.floor((x + rad) / CELL), y0 = Math.floor((y - rad) / CELL), y1 = Math.floor((y + rad) / CELL);
  for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) {
    const a = grid.get(gk(i, j)); if (!a) continue;
    for (let n = 0; n < a.length; n++) if (fn(a[n]) === false) return;
  }
}

/* ================= pathfinding: a flow field toward the player ================= */
// Every 0.35s a Dijkstra pass fills an 84x84 grid of 32px cells around the player with walking distance.
// Cells next to walls cost more, so zombies round corners instead of scraping along them.
// Zombies with a clear line of sight run straight at you; the rest follow the field around buildings.
// Three fields, one per size of walker: ordinary zombies (FF), big mutants that need wider gaps (FFB), and bosses,
// which only go around buildings and walls and shove straight through cars, fences and benches (FFS). The big ones are
// only built while something that big is chasing you. In the real-world city a cell is a metre and a quarter and the
// field reaches about 70 m around you; in the classic city it is the old 32-unit grid.
let FF_CS = 32, FF_N = 84;
const FF_MAXN = 112, FF_MAXLEN = FF_MAXN * FF_MAXN;
// what a boss cannot walk through: buildings, landmarks, rubble heaps, statues, tanks, big rocks
const SOLID = { b: 1, lm: 1, rub: 1, statue: 1, tank: 1, windmill: 1, rock: 1, pool: 1, pillar: 1, wreck: 1 };
function newField(rad, big, name) { return { name: name, rad: rad, big: big, ox: 0, oy: 0, pcx: 1e9, pcy: 1e9, t: -9, ready: false, cache: new Map(), dist: new Float32Array(FF_MAXLEN), cost: new Float32Array(FF_MAXLEN), open: new Uint8Array(FF_MAXLEN), n: FF_N, cs: FF_CS }; }
const FF = newField(15, false, 'small'), FFB = newField(30, false, 'big'), FFS = newField(56, true, 'boss');
// a big horde does not walk round parked cars: it goes straight through and shoves them (the crowd engine's push field)
const FFP = newField(15, true, 'push');
// 1.9.994: co-op: a field for each standing player (a zombie follows the field of the one it is after, so players far
// apart each have the whole field round them); and a coarse long-range field (four cells in one, about 130 m round each
// player) for the far ones the fine field does not reach: whatever happens they always know the way
const FFC = new Map(), FFL = new Map(), FL_K = 4, FL_N = 64;
const HI = new Int32Array(FF_MAXLEN * 8), HK = new Float32Array(FF_MAXLEN * 8), FD = [0, 0];
const blockCache = FF.cache;
function fieldsReset() { for (const F of [FF, FFB, FFS, FFP]) { F.ready = false; F.cache.clear(); } FFC.clear(); FFL.clear(); }
function cellBlockedF(F, cx, cy) {
  const k = (cx + 60000) * 120000 + (cy + 60000), C = F.cache;
  let v = C.get(k);
  if (v === undefined) { v = blocked(cx * FF_CS + FF_CS / 2, cy * FF_CS + FF_CS / 2, F.rad, F.big) ? 1 : 0; if (C.size > 150000) C.clear(); C.set(k, v); }
  return v;
}
function cellBlocked(cx, cy) { return cellBlockedF(FF, cx, cy); }
function buildField(F) {
  F = F || FF;
  const tb = performance.now();
  try { fieldBuild(F); } finally { const ms = performance.now() - tb; if (typeof coreCost === 'function') { coreCost('FLOW', ms); flowLearn(ms); } }
}
function fieldBuild(F) {
  let p = F.owner || G.p; const n = FF_N; F.n = n; F.cs = FF_CS;
  // co-op: the shared field is centred between the players and flows to whichever is nearest (a player's own field: to them)
  const srcs = !F.owner && NET.role === 'host' && NET.started ? netAlive() : null;
  if (srcs && srcs.length > 1) { let sx = 0, sy = 0; for (const q of srcs) { sx += q.x; sy += q.y; } p = { x: sx / srcs.length, y: sy / srcs.length }; }
  const pcx = Math.floor(p.x / FF_CS), pcy = Math.floor(p.y / FF_CS);
  F.ox = pcx - (n >> 1); F.oy = pcy - (n >> 1); F.pcx = pcx; F.pcy = pcy; F.t = G.time;
  const dist = F.dist, cost = F.cost, open = F.open;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) open[j * n + i] = cellBlockedF(F, F.ox + i, F.oy + j) ? 0 : 1;
  // where you stand is always open, so the field never comes out empty when you are pressed against a wall
  open[(n >> 1) * n + (n >> 1)] = 1;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const id = j * n + i; let c = 1;
    if (open[id]) for (let dj = -1; dj <= 1 && c === 1; dj++) for (let di = -1; di <= 1; di++) {
      const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < n && jj < n && !open[jj * n + ii]) { c = 2.2; break; }
    }
    if (open[id] && !F.big) { const w = waterAt((F.ox + i) * FF_CS + FF_CS / 2, (F.oy + j) * FF_CS + FF_CS / 2); if (w === 2) c *= 2.6; else if (w === 1) c *= 1.7; }
    cost[id] = c; dist[id] = 1e9;
  }
  let hs = 0;
  const push = (id, k) => { let i = hs++; HI[i] = id; HK[i] = k; while (i > 0) { const pa = (i - 1) >> 1; if (HK[pa] <= HK[i]) break; const ti = HI[pa], tk = HK[pa]; HI[pa] = HI[i]; HK[pa] = HK[i]; HI[i] = ti; HK[i] = tk; i = pa; } };
  if (srcs && srcs.length > 1) {
    for (const q of srcs) { const i = Math.floor(q.x / FF_CS) - F.ox, j = Math.floor(q.y / FF_CS) - F.oy; if (i >= 0 && j >= 0 && i < n && j < n) { const id = j * n + i; open[id] = 1; dist[id] = 0; push(id, 0); } }
  } else { const start = (n >> 1) * n + (n >> 1); dist[start] = 0; push(start, 0); }
  while (hs > 0) {
    const id = HI[0], k = HK[0];
    hs--; if (hs > 0) { HI[0] = HI[hs]; HK[0] = HK[hs]; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < hs && HK[l] < HK[m]) m = l; if (r < hs && HK[r] < HK[m]) m = r; if (m === i) break; const ti = HI[m], tk = HK[m]; HI[m] = HI[i]; HK[m] = HK[i]; HI[i] = ti; HK[i] = tk; i = m; } }
    if (k > dist[id]) continue;
    const ci = id % n, cj = (id / n) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ii = ci + di, jj = cj + dj; if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
      const nid = jj * n + ii; if (!open[nid]) continue;
      if (di && dj && (!open[cj * n + ii] || !open[jj * n + ci])) continue;
      const nd = k + (di && dj ? 1.414 : 1) * cost[nid];
      if (nd < dist[nid] && hs < HI.length) { dist[nid] = nd; push(nid, nd); }
    }
  }
  F.ready = true;
}
// which field a zombie follows: by how wide it is (and bosses in the real-world city shove through the small stuff)
function zBig(z) { return z.boss && ZP > 1; }
function fieldFor(z) {
  if (zBig(z)) return FFS; if (z.r >= 16) return FFB;
  if (z.hd && typeof swarmShoves === 'function' && swarmShoves(z) && FFP.ready) return FFP;
  if (FFC.size && z.tgtP) { const F = FFC.get(z.tgtP); if (F && F.ready) return F; }   // (co-op: the field of the one it is after)
  return FF;
}
// the coarse field toward a player: a cell is closed only when most of it is (a street narrower than a cell stays open)
function fieldLongFor(z) { const F = FFL.get((FFC.size && z.tgtP) || G.p) || FFL.get(G.p); return F && F.ready ? F : null; }
function cellBlockedL(F, cx, cy) {
  const k = (cx + 60000) * 120000 + (cy + 60000), C = F.cache; let v = C.get(k);
  if (v === undefined) {
    const cs = FF_CS * FL_K, x0 = cx * cs, y0 = cy * cs; let b = 0;
    for (const [u, w] of [[0.5, 0.5], [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8], [0.5, 0.15], [0.5, 0.85], [0.15, 0.5], [0.85, 0.5]]) if (blocked(x0 + u * cs, y0 + w * cs, 12, false)) b++;
    v = b >= 7 ? 1 : 0; if (C.size > 80000) C.clear(); C.set(k, v);
  }
  return v;
}
function fieldBuildLong(F) {
  const p = F.owner || G.p, n = FL_N, cs = FF_CS * FL_K; F.n = n; F.cs = cs;
  const pcx = Math.floor(p.x / cs), pcy = Math.floor(p.y / cs);
  F.ox = pcx - (n >> 1); F.oy = pcy - (n >> 1); F.pcx = pcx; F.pcy = pcy; F.t = G.time;
  const dist = F.dist, open = F.open;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const id = j * n + i; open[id] = cellBlockedL(F, F.ox + i, F.oy + j) ? 0 : 1; dist[id] = 1e9; }
  const start = (n >> 1) * n + (n >> 1); open[start] = 1; dist[start] = 0;
  let hs = 0; const push = (id, k) => { let i = hs++; HI[i] = id; HK[i] = k; while (i > 0) { const pa = (i - 1) >> 1; if (HK[pa] <= HK[i]) break; const ti = HI[pa], tk = HK[pa]; HI[pa] = HI[i]; HK[pa] = HK[i]; HI[i] = ti; HK[i] = tk; i = pa; } };
  push(start, 0);
  while (hs > 0) {
    const id = HI[0], k = HK[0]; hs--;
    if (hs > 0) { HI[0] = HI[hs]; HK[0] = HK[hs]; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let mm = i; if (l < hs && HK[l] < HK[mm]) mm = l; if (r < hs && HK[r] < HK[mm]) mm = r; if (mm === i) break; const ti = HI[mm], tk = HK[mm]; HI[mm] = HI[i]; HK[mm] = HK[i]; HI[i] = ti; HK[i] = tk; i = mm; } }
    if (k > dist[id]) continue;
    const ci = id % n, cj = (id / n) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const ii = ci + di, jj = cj + dj; if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
      const nid = jj * n + ii; if (!open[nid]) continue; if (di && dj && (!open[cj * n + ii] || !open[jj * n + ci])) continue;
      const nd = k + (di && dj ? 1.414 : 1); if (nd < dist[nid] && hs < HI.length) { dist[nid] = nd; push(nid, nd); }
    }
  }
  F.ready = true;
}
// the first look at a new area is spread over frames (a few hundred coarse cells a frame) so it never makes a hitch
function fieldWarmLong(F, pcx, pcy) {
  const n = FL_N, ox = pcx - (n >> 1), oy = pcy - (n >> 1), C = F.cache;
  if (F.wk !== ox + ',' + oy) { F.wk = ox + ',' + oy; F.wi = 0; }
  let left = 480;
  while (F.wi < n * n) {
    const i = F.wi % n, j = (F.wi / n) | 0, cx = ox + i, cy = oy + j;
    if (C.get((cx + 60000) * 120000 + (cy + 60000)) === undefined) { cellBlockedL(F, cx, cy); if (--left <= 0) { F.wi++; return false; } }
    F.wi++;
  }
  return true;
}
// keep the per-player and long-range fields up to date: at most one rebuilt a frame, the stalest first
function fieldsCoop() {
  const host = NET.role === 'host' && NET.started, P = host ? netAlive() : (G.p ? [G.p] : []);
  for (const M of [FFC, FFL]) for (const k of [...M.keys()]) if (P.indexOf(k) < 0) M.delete(k);
  let job = null, age = -1;
  if (host && P.length > 1) for (const p of P) {
    let F = FFC.get(p); if (!F) { F = newField(15, false, 'player'); F.owner = p; F.cache = FF.cache; FFC.set(p, F); }
    const pcx = Math.floor(p.x / FF_CS), pcy = Math.floor(p.y / FF_CS), st = !F.ready || F.n !== FF_N || Math.abs(pcx - F.pcx) + Math.abs(pcy - F.pcy) >= 2 ? 99 : G.time - F.t;
    if (st > flowIv() && st > age) { age = st; job = () => buildField(F); }
  } else FFC.clear();
  if (!job) for (const p of P) {
    let F = FFL.get(p); if (!F) { F = newField(15, false, 'long'); F.owner = p; FFL.set(p, F); }
    const cs = FF_CS * FL_K, pcx = Math.floor(p.x / cs), pcy = Math.floor(p.y / cs), st = !F.ready ? 99 : Math.abs(pcx - F.pcx) + Math.abs(pcy - F.pcy) >= 2 ? 50 : G.time - F.t;
    if (st > 1.6 && st > age) { age = st; job = () => { const tb = performance.now(); try { if (fieldWarmLong(F, pcx, pcy)) fieldBuildLong(F); } finally { if (typeof coreCost === 'function') coreCost('FLOW', performance.now() - tb); } }; }
  }
  if (job) job();
}
function flowDir(x, y, F) {
  F = F || FF;
  if (!F.ready) { if (F !== FF) return flowDir(x, y, FF); return null; }
  const n = F.n, cs = F.cs, i = Math.floor(x / cs) - F.ox, j = Math.floor(y / cs) - F.oy;
  if (i < 1 || j < 1 || i >= n - 1 || j >= n - 1) return null;
  const id = j * n + i; let best = F.open[id] ? F.dist[id] : 1e10, bi = -1, bj = -1;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    if (!di && !dj) continue; const nid = (j + dj) * n + (i + di);
    if (!F.open[nid]) continue;
    if (di && dj && (!F.open[j * n + i + di] || !F.open[(j + dj) * n + i])) continue;
    if (F.dist[nid] < best) { best = F.dist[nid]; bi = i + di; bj = j + dj; }
  }
  // a big zombie standing in a cell its own field calls closed (it squeezed in): fall back to the ordinary field
  if (bi < 0 || best >= 1e9) return F !== FF ? flowDir(x, y, FF) : null;
  const tx = (F.ox + bi + 0.5) * cs, ty = (F.oy + bj + 0.5) * cs, dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1;
  FD[0] = dx / d; FD[1] = dy / d; return FD;
}
function reachable(x, y) {
  if (!FF.ready) return true;
  const n = FF.n, i = Math.floor(x / FF.cs) - FF.ox, j = Math.floor(y / FF.cs) - FF.oy;
  if (i < 0 || j < 0 || i >= n || j >= n) return true;
  return FF.dist[j * n + i] < 1e9;
}
function hasLOS(x0, y0, x1, y1, F) {
  F = F || FF;
  const dx = x1 - x0, dy = y1 - y0, steps = Math.ceil(Math.hypot(dx, dy) / 20);
  for (let s = 1; s < steps; s++) { const t = s / steps; if (cellBlockedF(F, Math.floor((x0 + dx * t) / FF_CS), Math.floor((y0 + dy * t) / FF_CS))) return false; }
  return true;
}

/* ================= game state ================= */
const G = {
  mode: 'title', time: 0, wave: 0, score: 0, kills: 0, p: null, zs: [], bullets: [], eshots: [], haz: [], picks: [],
  parts: [], rings: [], texts: [], bolts: [], splats: [], spawnQ: 0, spawnTotal: 0, spawnT: 0, feat: [], pool: [],
  bossPending: false, boss: null, shake: 0, hurtFlash: 0, runFound: [], nFly: 0, upChoices: null, lastEntry: null, hintT: 0,
  chain: 0, lastKill: -9, bestChain: 0, picking: false, zsMul: 1, hordeMul: 1, customName: '',
  skullPending: false, skullChoices: null, slowT: 0, tierFlash: 0, cineT: 0, zhpMul: 0, bossHpMul: 0,
  blasts: [], quakes: [], jets: [], air: 0, cine: null, bossMusKey: '', roamAt: -1
};
const cam = { x: 56, y: 56 };
let frameNo = 0;

function newPlayer() {
  const p = {
    x: 56 * SCL, y: 56 * SCL, r: 12 * PK, hp: 100, maxHp: 100, speed: 172, regen: 0, killHeal: 0, dashCd: 2.4, dashCdT: 0, dashT: 0,
    dashDx: 1, dashDy: 0, iframe: 0, fireCd: 0, aim: 0, flashT: 0, slowT: 0, slowMul: 1, poisonT: 0, burnT: 0,
    jamT: 0, weakT: 0, frozenT: 0, rootT: 0, blindT: 0, bleedT: 0, kvx: 0, kvy: 0, extX: 0, extY: 0, ix: 0, iy: 0, walk: 0,
    shots: 0, queue: [], cards: {}, cs: newCardStats(), weapon: WEAPONS[loadoutId()], taken: 1, healMul: 1, scoreMul: 1, luck: 0, vision: 0,
    dashK: dashLoadout(), dashCdMax: 2.4, dashDur: 0.18, db: { rofT: 0, dmgT: 0, stealthT: 0, critNext: 0 }, ghosts: [], wk: 0, ivx: 0, ivy: 0
  };
  if (ARMS_ON) armsNew(p);   // 1.9.993: a primary and a secondary, rebuilt on real guns, and the dodge roll (arms.js)
  recalc(p);
  return p;
}

/* ================= input ================= */
// keyboard, mouse and controller input live in input.js; the touch joystick is here
const joy = { id: null, ox: 0, oy: 0, dx: 0, dy: 0, active: false, kx: 0, ky: 0 };
// App bridge: the Android app calls these for its back button and when it goes to the background.
window.zcBack = function () {
  if (typeof INTRO !== 'undefined' && INTRO.on) return introSkip();
  if (!$('engWarn').hidden) { closeEngineWarn(); return true; }
  if (!$('engRoom').hidden) { closeEngineRoom(); return true; }
  if (!$('settings').hidden) { closeSettings(); return true; }
  if (!$('radioPanel').hidden) { closeRadio(); return true; }
  if (legendCover()) { lgsBack(); return true; }
  if (!$('hudRadio').hidden) { toggleHudRadio(false); return true; }
  if (!$('blDetail').hidden) { $('blDetail').hidden = true; return true; }
  if (!$('bosslog').hidden) { closeBossLog(); return true; }
  if (G.mode === 'cine') return true;
  if (!$('arDetail').hidden) { $('arDetail').hidden = true; return true; }
  if (!$('armory').hidden) { closeArmory(); return true; }
  if (!$('cxDetail').hidden) { closeDetail(); return true; }
  if (!$('codex').hidden) { closeCodex(); return true; }
  if (!$('lb').hidden) { closeLB(); return true; }
  if (!$('coop').hidden) { closeCoop(); return true; }
  if (!$('acct').hidden) { closeAcct(); return true; }
  if (G.mode === 'play') { pauseGame(); return true; }
  if (G.mode === 'pause') { resumeGame(); return true; }
  if (G.mode === 'over') { toTitle(); return true; }
  return G.mode === 'upgrade' || G.mode === 'skull';
};
window.zcAppPause = function () { if (G.mode === 'play') pauseGame(); SFX.suspend(); };
window.zcAppResume = function () { SFX.resume(); };
function localXY(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
// the joystick: on the left (or the right, left-handed), floating where the thumb lands or fixed in the corner
const JR = () => 56 * SET.joySize / 100;
const moveSide = x => SET.lefty ? x > W * 0.4 : x < W * 0.6;
function joyHome() { return [SET.lefty ? W - 104 : 104, H - 128]; }
cv.addEventListener('pointerdown', e => {
  if (G.mode !== 'play' || G.grab || e.pointerType === 'mouse') return;   // a mouse aims and fires instead (input.js)
  const xy = localXY(e);
  if (joy.id === null && moveSide(xy[0])) {
    joy.id = e.pointerId; joy.dx = 0; joy.dy = 0; joy.kx = 0; joy.ky = 0; joy.active = true;
    if (SET.joy === 'fixed') { const h = joyHome(); joy.ox = h[0]; joy.oy = h[1]; joyMove(xy); } else { joy.ox = xy[0]; joy.oy = xy[1]; }
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  } else if (!moveSide(xy[0]) && SET.dashTap) tryDash();
  e.preventDefault();
});
cv.addEventListener('pointermove', e => { if (e.pointerId === joy.id) joyMove(localXY(e)); });
function joyMove(xy) {
  let dx = xy[0] - joy.ox, dy = xy[1] - joy.oy; const d = Math.hypot(dx, dy), R = JR();
  if (d > R) { if (SET.joy !== 'fixed') { joy.ox += dx / d * (d - R); joy.oy += dy / d * (d - R); } dx = dx / d * R; dy = dy / d * R; }
  joy.kx = dx; joy.ky = dy;
  const m = Math.hypot(dx, dy);
  if (m < 6) { joy.dx = 0; joy.dy = 0; } else { joy.dx = dx / R; joy.dy = dy / R; }
}
function endJoy(e) { if (e.pointerId === joy.id) { joy.id = null; joy.active = false; joy.dx = joy.dy = 0; } }
cv.addEventListener('pointerup', endJoy); cv.addEventListener('pointercancel', endJoy);
$('dashBtn').addEventListener('pointerdown', e => { e.preventDefault(); tryDash(); G.touchSprint = true; });   // tap: roll; hold: roll, then sprint
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) $('dashBtn').addEventListener(ev, () => { G.touchSprint = false; });
$('pauseBtn').addEventListener('click', () => pauseGame());
document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play') pauseGame(); });

function tryDash() {
  const p = G.p; if (G.mode !== 'play' || !p || p.dashCdT > 0 || p.frozenT > 0 || G.grab) return;
  if (p.arm) { armsDodge(p); return; }   // the dash button is the dodge roll now
  let dx = p.ix, dy = p.iy; if (Math.abs(dx) + Math.abs(dy) < 0.05) { dx = Math.cos(p.aim); dy = Math.sin(p.aim); }
  const l = Math.hypot(dx, dy) || 1; p.dashDx = dx / l; p.dashDy = dy / l;
  dashStart(p);
}

/* ================= fx helpers ================= */
// a particle glows (stays bright at night) when its colour is a hot one: sparks, flames, muzzle flashes, energy
const GLOWC = new Map();
function glowCol(col) {
  let v = GLOWC.get(col); if (v !== undefined) return v;
  v = false;
  if (typeof col === 'string' && col[0] === '#' && col.length >= 7) { const n = parseInt(col.slice(1, 7), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255; v = Math.max(r, gg, b) > 225 && (r + gg + b) > 420; }
  if (GLOWC.size < 400) GLOWC.set(col, v); return v;
}
function burst(x, y, n, col, spd, size, life) {
  n *= Q.burst; n = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
  const gl = glowCol(col);
  for (let i = 0; i < n; i++) {
    if (G.parts.length >= Q.parts) G.parts.shift();
    const a = rand(TAU), s = rand(spd * 0.25, spd);
    G.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(life * 0.5, life), max: life, c: col, s: rand(size * 0.5, size), glow: gl });
  }
}
function ring(x, y, r0, r1, life, c, w) { G.rings.push({ x: x, y: y, r0: r0, r1: r1, t: 0, life: life, c: c, w: w || 2 }); }
// a mark on the ground (explosions, dust): the blood engine draws it as a scorch that fades like the blood
function splat(x, y, r, c) { if (typeof goreScorch === 'function' && goreOk()) { goreScorch(x, y, r, c); return; } if (G.splats.length >= Q.splats) G.splats.shift(); G.splats.push({ k: 'old', x: x, y: y, r: r, c: c, rot: rand(TAU), sq: rand(0.5, 0.9) }); }
function shakeIt(v) { if (!RM && SET.shake) G.shake = Math.max(G.shake, v * SET.shake / 100); }
function bolt(x1, y1, x2, y2, c) {
  const pts = [x1, y1], n = 7;
  for (let i = 1; i < n; i++) { const t = i / n; pts.push(x1 + (x2 - x1) * t + rand(-12, 12), y1 + (y2 - y1) * t + rand(-12, 12)); }
  pts.push(x2, y2); G.bolts.push({ pts: pts, life: 0.18, c: c });
}

/* ================= zombies ================= */
function spawnZombie(m, x, y, o) {
  o = o || {}; const w = G.wave || 1;
  if (m && m.v2) mutaSeen(m);
  const sc = o.boss ? BOSSK : o.child ? 0.66 : o.minion ? 0.58 : 1;
  let hp = 30 * m.hp * (1 + 0.15 * (w - 1));
  if (o.boss) hp *= (9 + w * 0.7) * (1 + (G.bossHpMul || 0)); if (o.child) hp *= 0.4; if (o.minion) hp *= 0.3;
  if (G.mode === 'play') hp *= 1 + (G.zhpMul || 0);
  if (o.fly) hp = 4 + w * 0.4; if (o.illusion) hp = 1;
  const z = {
    m: m, x: x, y: y, vx: 0, vy: 0, kvx: 0, kvy: 0, r: o.fly ? 4.5 : zombieR(m.size, sc), hp: hp, maxHp: hp,
    speed: (o.fly ? 150 : 68 * m.spd * (o.boss ? 0.85 : 1) * (o.minion ? 1.25 : 1)) * Math.min(1.3, 1 + 0.012 * (w - 1)),
    dmg: o.illusion ? 0 : (o.fly ? 3 : 9 * m.dmg * (o.boss ? 1.5 : 1) * (o.minion ? 0.6 : 1) * (o.child ? 0.7 : 1)) * (1 + 0.05 * (w - 1)),
    ang: G.p ? Math.atan2(G.p.y - y, G.p.x - x) : rand(TAU), hitCd: 0.6, abs: [], st: {}, flash: 0, bob: rand(TAU), warn: 0,
    boss: !!o.boss, child: !!o.child, minion: !!o.minion, fly: !!o.fly, illusion: !!o.illusion, life: o.illusion ? 5 : 0,
    dr: m.S.p.dr || 0, dodge: m.S.p.dodge || 0, kb: m.S.p.kb == null ? 1 : m.S.p.kb, reach: m.S.p.reach || 0,
    slowT: 0, buffT: 0, stuckT: 0, detT: 0, detSide: 1, stun: 0, growth: 1, shield: 0, shieldMax: 0, shieldCd: 0, mulB: 1, dead: false
  };
  // 1.9.994: no two alike: each one a little bigger or smaller and its own pace (the bosses and the swarms of flyers as they are)
  if (!o.boss && !o.fly && !o.illusion && !(NET.role === 'client' && NET.spawning)) { z.vr = 0.93 + Math.random() * 0.14; z.r *= z.vr; z.speed *= 0.88 + Math.random() * 0.26; }   // (vr kept: ANIMA bakes the kind's size and scales it, so the cached frames are still shared)
  z.baseR = z.r;
  // the 2.0 zombies: how bullets treat them (helmets, armour, a shield, a low body) and limbs that can be crippled
  if (m.v2) { z.T = m.T; z.legK = 0; z.armK = 0; z.abMul = 1; if (o.emerge) z.emT = G.time; }
  if (!o.minion && !o.fly && !o.illusion) z.abs.push(m.A.key);
  if (o.second) z.abs.push(o.second);
  if (z.abs.indexOf('juggernaut') >= 0) { z.dr = 1 - (1 - z.dr) * 0.6; z.kb = 0; }
  if (o.boss) z.kb = 0;
  if (z.abs.indexOf('warden') >= 0) { z.shieldMax = z.maxHp * 0.5; z.shield = z.shieldMax; }
  z.nid = ++NET.zid;
  if (NET.role === 'client' && !NET.spawning) return z;   // in co-op only the host makes zombies; a teammate's game shows them
  G.zs.push(z);
  return z;
}
function heal(z, a) { z.hp = Math.min(z.maxHp, z.hp + a); }
// Just outside a random edge of the screen, so zombies walk in quickly but never pop in on camera.
function spawnPos() {
  const p = NET.role === 'host' ? netAnchor() : G.p, hw = W / ZOOM / 2, hh = H / ZOOM / 2;
  for (let i = 0; i < 20; i++) {
    const side = Math.floor(Math.random() * 4), off = rand(50, 130);
    let x, y;
    if (side === 0) { x = p.x - hw - off; y = p.y + rand(-hh, hh); }
    else if (side === 1) { x = p.x + hw + off; y = p.y + rand(-hh, hh); }
    else if (side === 2) { x = p.x + rand(-hw, hw); y = p.y - hh - off; }
    else { x = p.x + rand(-hw, hw); y = p.y + hh + off; }
    if (!blocked(x, y, 26) && waterAt(x, y) !== 2 && (i > 14 || reachable(x, y))) return { x: x, y: y };
  }
  return { x: p.x + hw + 80, y: p.y };
}

function shoot(x, y, a, spd, dmg, r, k) { G.eshots.push({ x: x, y: y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, dmg: dmg, r: r, k: k, life: k === 'bolt' ? 1.3 : k === 'wisp' ? 4.5 : 2.4 }); }

function bombBlast(z) {
  z.st.boomed = true; const R = 88 + z.r;
  if (G.mode === 'play') netEach(p => { if (Math.hypot(p.x - z.x, p.y - z.y) < R) hurtPlayer(z.dmg * 2.2); });
  near(z.x, z.y, R, o => { if (o !== z && !o.dead && !o.boss && Math.hypot(o.x - z.x, o.y - z.y) < R) hurtZombie(o, 22 + G.wave * 4, { src: 'blast' }); });
  burst(z.x, z.y, 26, '#ffb347', 340, 5, 0.55); burst(z.x, z.y, 14, '#5a1a10', 200, 7, 0.8); worldBlast(z.x, z.y, R * 1.3, null);
  ring(z.x, z.y, z.r, R, 0.35, '255,140,50', 4); shakeIt(9); splat(z.x, z.y, z.r * 2, 'rgba(20,10,6,0.6)'); SFX.boom(true);
}

// Ability behaviours. Each gets (zombie, dt, dx, dy, dist, control).
const ABIL = {
  lunger(z, dt, dx, dy, d, c) {
    const s = z.st;
    if (s.lt > 0) { s.lt -= dt; c.ov = true; c.vx = s.lx * z.speed * 4.2; c.vy = s.ly * z.speed * 4.2; c.face = Math.atan2(s.ly, s.lx); return; }
    if (s.lw > 0) { s.lw -= dt; c.move = 0.1; z.warn = s.lw; if (s.lw <= 0) { s.lt = 0.32; s.lx = dx / d; s.ly = dy / d; } return; }
    s.cd = (s.cd === undefined ? rand(1, 2.5) : s.cd) - dt;
    if (s.cd <= 0 && d < 210 && d > 40) { s.lw = 0.3; s.cd = 2.6; }
  },
  spitter(z, dt, dx, dy, d, c) {
    const s = z.st; if (d < 170) c.move = Math.min(c.move, 0.25);
    s.cd = (s.cd === undefined ? rand(1.5, 3) : s.cd) - dt;
    if (s.cd <= 0 && d < 400 && d > 60) { s.cd = rand(2.2, 3); const a = Math.atan2(dy, dx); shoot(z.x + Math.cos(a) * z.r, z.y + Math.sin(a) * z.r, a, 240, z.dmg * 0.9, 7, 'acid'); }
  },
  bomber(z, dt, dx, dy, d, c) {
    const s = z.st;
    if (s.fuse > 0) { s.fuse -= dt; c.move = 0.4; z.warn = s.fuse; if (s.fuse <= 0) { bombBlast(z); killZombie(z); } return; }
    if (G.p && d < z.r + G.p.r + 22) s.fuse = 0.55;
  },
  splitter() {},
  warden(z, dt) { if (z.shieldCd > 0) z.shieldCd -= dt; else if (z.shield < z.shieldMax) z.shield = Math.min(z.shieldMax, z.shield + z.shieldMax * 0.4 * dt); },
  regrower(z, dt) { heal(z, z.maxHp * 0.06 * dt); },
  blinker(z, dt, dx, dy, d, c) {
    const s = z.st;
    if (s.warp > 0) {
      s.warp -= dt; c.move = 0; z.warn = s.warp;
      if (s.warp <= 0) { burst(z.x, z.y, 12, '#b78bff', 160, 4, 0.4); z.x = s.tx; z.y = s.ty; z.vx = z.vy = 0; burst(z.x, z.y, 12, '#b78bff', 160, 4, 0.4); ring(z.x, z.y, 4, z.r * 2.2, 0.3, '183,139,255', 3); }
      return;
    }
    s.cd = (s.cd === undefined ? rand(2, 4) : s.cd) - dt;
    if (s.cd <= 0 && d > 150 && d < 560) {
      s.cd = rand(4, 5.5);
      for (let i = 0; i < 6; i++) {
        const a = rand(TAU), tx = G.p.x + Math.cos(a) * 110, ty = G.p.y + Math.sin(a) * 110;
        if (!blocked(tx, ty, z.r)) { s.tx = tx; s.ty = ty; s.warp = 0.5; ring(tx, ty, z.r * 2.4, z.r * 0.4, 0.5, '183,139,255', 2); break; }
      }
    }
  },
  caller(z, dt, dx, dy, d) {
    const s = z.st; s.cd = (s.cd === undefined ? rand(2, 4) : s.cd) - dt;
    if (s.cd <= 0 && d < 560 && G.zs.length < 140) {
      s.cd = rand(5, 6.5); const n = z.boss ? 4 : 2;
      for (let i = 0; i < n; i++) { const a = rand(TAU); spawnZombie(z.m, z.x + Math.cos(a) * z.r * 1.6, z.y + Math.sin(a) * z.r * 1.6, { minion: true }); }
      ring(z.x, z.y, z.r, z.r * 3, 0.5, '217,207,180', 2);
    }
  },
  screamer(z, dt, dx, dy, d) {
    const s = z.st; s.cd = (s.cd === undefined ? rand(2, 4) : s.cd) - dt;
    if (s.cd <= 0 && d < 440) {
      s.cd = rand(4.5, 5.5);
      near(z.x, z.y, 230, o => { if (!o.dead) o.buffT = 3; });
      ring(z.x, z.y, z.r, 230, 0.6, '255,110,80', 3); ring(z.x, z.y, z.r, 160, 0.45, '255,110,80', 2);
    }
  },
  leech() {},
  burrower(z, dt, dx, dy, d, c) {
    const s = z.st; s.t = (s.t === undefined ? rand(1, 2.5) : s.t) - dt;
    if (s.under) {
      c.move = 1.8;
      if (s.t <= 0 || d < z.r + 36) { s.under = false; s.t = rand(2, 3); burst(z.x, z.y, 16, '#6b5a45', 180, 5, 0.5); shakeIt(3); }
    } else if (s.t <= 0) {
      if (d > 130) { s.under = true; s.t = rand(1.3, 1.9); burst(z.x, z.y, 14, '#6b5a45', 150, 5, 0.5); } else s.t = 0.6;
    }
  },
  charger(z, dt, dx, dy, d, c) {
    const s = z.st;
    if (s.charge > 0) { s.charge -= dt; c.ov = true; c.vx = s.cx * z.speed * 4.2; c.vy = s.cy * z.speed * 4.2; c.face = Math.atan2(s.cy, s.cx); if (Math.random() < 0.5) burst(z.x, z.y, 1, 'rgba(140,130,110,0.7)', 40, 4, 0.4); return; }
    if (s.wind > 0) { s.wind -= dt; c.move = 0; z.warn = s.wind; c.face = Math.atan2(s.cy, s.cx); if (s.wind <= 0) s.charge = 0.75; return; }
    s.cd = (s.cd === undefined ? rand(1.5, 3) : s.cd) - dt;
    if (s.cd <= 0 && d < 420 && d > 80) { s.cd = 3.2; s.wind = 0.65; s.cx = dx / d; s.cy = dy / d; }
  },
  oozer(z, dt) {
    const s = z.st; s.cd = (s.cd === undefined ? 0.3 : s.cd) - dt;
    if (s.cd <= 0) { s.cd = 0.45; if (G.haz.length < 80) G.haz.push({ k: 'acid', x: z.x, y: z.y, r: z.r * 1.15, life: 4, max: 4, dps: 9 + G.wave * 0.6 }); }
  },
  chiller(z, dt, dx, dy, d) { if (d < 150 && G.mode === 'play') { const p = G.p; p.slowT = Math.max(p.slowT, 0.15); p.slowMul = Math.min(p.slowMul, 0.62); } },
  shocker(z, dt, dx, dy, d) {
    const s = z.st;
    if (s.zap > 0) {
      s.zap -= dt; z.warn = s.zap;
      if (s.zap <= 0) {
        if (d < 250) { hurtPlayer(z.dmg); bolt(z.x, z.y, G.p.x, G.p.y, '#fff36b'); }
        else bolt(z.x, z.y, z.x + dx / d * 200, z.y + dy / d * 200, '#fff36b');
      }
      return;
    }
    s.cd = (s.cd === undefined ? rand(1.5, 3) : s.cd) - dt;
    if (s.cd <= 0 && d < 210) { s.cd = rand(2.8, 3.5); s.zap = 0.5; }
  },
  phantom(z, dt) { const s = z.st; s.t = (s.t === undefined ? rand(0, 3) : s.t) + dt; s.phased = (s.t % 3.6) > 2.2; },
  spiker() {},
  medic(z, dt) {
    const s = z.st; s.cd = (s.cd === undefined ? 1 : s.cd) - dt;
    if (s.cd <= 0) {
      s.cd = 1; let any = false;
      near(z.x, z.y, 170, o => { if (o !== z && !o.dead && !o.illusion && o.hp < o.maxHp) { heal(o, o.maxHp * 0.08); any = true; } });
      if (any) ring(z.x, z.y, z.r, 170, 0.5, '110,230,120', 2);
    }
  },
  magnet(z, dt, dx, dy, d) {
    if (d < 290 && d > z.r + 20 && G.mode === 'play') { const p = G.p, f = (1 - d / 290) * 130 + 30; p.extX -= dx / d * f; p.extY -= dy / d * f; }
  },
  berserker() {}, juggernaut() {}, hive() {},
  trickster(z, dt, dx, dy, d) {
    const s = z.st; s.cd = (s.cd === undefined ? rand(2, 4) : s.cd) - dt;
    if (s.cd <= 0 && d < 460) {
      s.cd = rand(6, 7.5);
      for (let i = 0; i < 2; i++) { const a = rand(TAU); spawnZombie(z.m, z.x + Math.cos(a) * 34, z.y + Math.sin(a) * 34, { illusion: true }); }
      burst(z.x, z.y, 14, '#efe9dc', 140, 4, 0.4);
    }
  },
  voidheart() {},
  sniper(z, dt, dx, dy, d, c) {
    const s = z.st;
    if (d < 260) c.move = -0.7; else if (d < 380) c.move = 0;
    if (s.aim > 0) {
      s.aim -= dt; c.move = 0; z.warn = s.aim;
      if (s.aim <= 0) { const a = Math.atan2(dy, dx); shoot(z.x + Math.cos(a) * z.r * 1.4, z.y + Math.sin(a) * z.r * 1.4, a, 720, z.dmg * 1.8, 4, 'bolt'); }
      return;
    }
    s.cd = (s.cd === undefined ? rand(1.5, 3) : s.cd) - dt;
    if (s.cd <= 0 && d < 520) { s.cd = rand(3, 3.8); s.aim = 1.0; }
  }
};

const CTL = { move: 1, ov: false, vx: 0, vy: 0, face: null };
function updZ(z, dt) {
  const p = G.p;
  if (z.illusion) { z.life -= dt; if (z.life <= 0) { z.dead = true; burst(z.x, z.y, 10, '#efe9dc', 100, 4, 0.4); return; } }
  z.flash = Math.max(0, z.flash - dt); z.hitCd -= dt; z.warn = 0;
  if (z.st.down > 0) {
    z.st.down -= dt; z.vx = z.vy = 0;
    if (z.st.down <= 0) { z.hp = z.maxHp * 0.45; ring(z.x, z.y, z.r, z.r * 2.2, 0.4, '230,220,190', 3); burst(z.x, z.y, 10, '#e6dcc0', 120, 4, 0.4); }
    return;
  }
  if (z.slowT > 0) z.slowT -= dt; if (z.buffT > 0) z.buffT -= dt;
  if ((z.burnT > 0 || z.poisonT > 0) && dotZombie(z, dt)) return;
  const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy) || 1;
  const c = CTL; c.move = 1; c.ov = false; c.vx = 0; c.vy = 0; c.face = null;
  const sp = z.m.S.p;
  if (!z.fly && !z.illusion) {
    if (sp.regen) heal(z, z.maxHp * sp.regen * dt);
    if (sp.rad && d < 90 && G.mode === 'play') dotPlayer((2 + G.wave * 0.25) * dt);
    if (sp.stutter) { z.st.su = (z.st.su === undefined ? rand(0.5, 1.5) : z.st.su) - dt; if (z.st.su <= -0.3) z.st.su = rand(1, 1.8); }
    if (z.st.surgeT > 0) z.st.surgeT -= dt;
    if (sp.blink) {
      z.st.vb = (z.st.vb === undefined ? rand(2, 5) : z.st.vb) - dt;
      if (z.st.vb <= 0 && d < 520) {
        z.st.vb = rand(3.5, 6); const sd = Math.random() < 0.5 ? -1 : 1, nx = z.x - dy / d * 70 * sd, ny = z.y + dx / d * 70 * sd;
        if (!blocked(nx, ny, z.r)) { burst(z.x, z.y, 8, '#a66bff', 90, 3, 0.35); z.x = nx; z.y = ny; burst(z.x, z.y, 8, '#a66bff', 90, 3, 0.35); }
      }
    }
  }
  if (z.snatch) snatcherTick(z, dt, dx, dy, d, c);
  if (z.rb && !z.rb.ill) bossTick(z, dt, dx, dy, d, c);
  z.abMul = 1;
  for (let i = 0; i < z.abs.length; i++) { const f = ABIL[z.abs[i]]; if (f) f(z, dt, dx, dy, d, c); if (z.dead) return; }
  let mul = z.abMul || 1; if (z.abs.indexOf('berserker') >= 0) mul *= 1 + (1 - z.hp / z.maxHp) * 1.1;
  // a shot leg slows it to a limp, two to a crawl
  if (z.legK) mul *= z.legK >= 2 ? 0.32 : 0.58;
  if (sp.stutter && z.st.su < 0) mul *= 2.6;
  if (z.st.surgeT > 0) mul *= 1.5;
  z.mulB = mul;
  if (z.stun > 0) { z.stun -= dt; c.move = 0; if (z.stun <= 0) z.frozen = 0; }
  let tvx, tvy;
  if (c.ov) { tvx = c.vx; tvy = c.vy; z.vx = tvx; z.vy = tvy; }
  else {
    let ux = dx / d, uy = dy / d;
    const lure = G.mode === 'play' ? (dashLure(z, dt) || worldLure(z)) : null;
    if (lure) { const lx = lure[0] - z.x, ly = lure[1] - z.y, ll = Math.hypot(lx, ly) || 1; ux = lx / ll; uy = ly / ll; if (ll < 14) { ux *= 0.1; uy *= 0.1; } }
    else if (!z.fly && !z.st.under && G.mode === 'play') {
      z.losT = (z.losT || 0) - dt;
      // a clear line to you means running straight at you; a big zombie checks that the line is wide enough for it,
      // and one that keeps getting stuck stops trusting its eyes and follows the field for a while
      const ZF = fieldFor(z);
      if (z.losT <= 0) { z.losT = 0.2 + Math.random() * 0.15; z.los = d < 700 && !(z.noLosT > 0) && hasLOS(z.x, z.y, p.x, p.y, ZF); }
      if (z.noLosT > 0) z.noLosT -= dt;
      if (!z.los) { const f = flowDir(z.x, z.y, ZF) || (FFL.size ? flowDir(z.x, z.y, fieldLongFor(z)) : null); if (f) { ux = f[0]; uy = f[1]; } }
    }
    if (z.fly) { const a = Math.atan2(uy, ux) + Math.sin(G.time * 9 + z.bob) * 0.9; ux = Math.cos(a); uy = Math.sin(a); }
    if (z.detT > 0) { z.detT -= dt; const a = z.detSide * 1.25, co = Math.cos(a), si = Math.sin(a); const nx = ux * co - uy * si, ny = ux * si + uy * co; ux = nx; uy = ny; }
    const zw = z.fly ? 0 : waterAt(z.x, z.y); z.inW = isWater(zw);
    let spd = z.speed * c.move * mul * (z.slowT > 0 ? (z.slowMul || 0.65) : 1) * (z.buffT > 0 ? 1.45 : 1) * G.zsMul * (G.warpT > 0 && !z.boss ? 0.32 : 1) * (z.boss ? (1 + waterSlow(zw)) / 2 : waterSlow(zw)) * WX.slow;
    let sx = 0, sy = 0, pk = 0;
    if (z.swF === frameNo) {
      // the crowd engine has already worked out this zombie's neighbours: the shove of the bodies around it, and the
      // stream it is part of (falling in with their heading, and faster together)
      if (!z.fly && !z.st.under) { sx = z.sepX; sy = z.sepY; pk = z.pk; }
      if (!z.fly && !lure) { const S = swarmSteer(z, ux, uy, d); ux = S.ux; uy = S.uy; spd *= S.k; }
    } else if (!z.fly && !z.st.under) near(z.x, z.y, sp.pack ? 80 : z.r + 30, o => {
      if (o === z || o.dead || o.fly || o.st.under) return;
      const ex = z.x - o.x, ey = z.y - o.y, dd = ex * ex + ey * ey, rr = z.r + o.r;
      if (dd < 6400) pk++;
      if (dd < rr * rr && dd > 0.01) { const dl = Math.sqrt(dd), push = (rr - dl) / rr; sx += ex / dl * push; sy += ey / dl * push; }
    });
    if (sp.pack && pk >= 2) spd *= z.swF === frameNo ? 1.15 : 1.3;
    const sa = Math.abs(spd) + 40;
    tvx = ux * spd + sx * sa * 1.5; tvy = uy * spd + sy * sa * 1.5;
    const k = Math.min(1, dt * 9); z.vx += (tvx - z.vx) * k; z.vy += (tvy - z.vy) * k;
  }
  const px = z.x, py = z.y;
  z.x += (z.vx + z.kvx) * dt; z.y += (z.vy + z.kvy) * dt;
  // nothing stands inside the player: overlapping zombies sit behind the gun's muzzle where bullets can't reach them
  if (!z.st.under && !(z.snatch && z.snatch.state === 'holding') && !(z.rb && z.rb.state === 'holding')) {
    const ex = z.x - p.x, ey = z.y - p.y, dd = Math.hypot(ex, ey), mn = z.r + p.r * 0.85;
    if (dd < mn) { if (dd < 0.01) z.x += mn; else { z.x = p.x + ex / dd * mn; z.y = p.y + ey / dd * mn; } }
  }
  const dec = Math.exp(-9 * dt); z.kvx *= dec; z.kvy *= dec;
  if (!z.fly && !z.st.under) {
    const big = zBig(z), hit = collide(z, z.r * 0.9, big);
    // leaning into a parked car: part of the crowd's push on it (the crowd engine adds it up)
    if (hit && COL.r && COL.r.k === 'car' && typeof swarmPress === 'function') swarmPress(z, COL.r, COL.nx, COL.ny, tvx, tvy);
    if (big) bossTrample(z, dt);
    if (hit && c.ov && z.st.charge > 0) { z.st.charge = 0; z.stun = 1.0; shakeIt(4); burst(z.x, z.y, 12, '#8c8270', 160, 5, 0.5); }
    if (!c.ov && c.move > 0) {
      const want = Math.hypot(tvx, tvy) * dt, got = Math.hypot(z.x - px, z.y - py);
      if (want > 0.4 && got < want * 0.35) z.stuckT += dt; else z.stuckT = Math.max(0, z.stuckT - dt * 0.5);
      if (z.stuckT > 0.3 && typeof swarmPushing === 'function' && swarmPushing(z)) z.stuckT = 0;   // shoulder to shoulder with enough others to move it: keep pushing
      if (z.stuckT > 0.3 && z.detT <= 0) { z.detT = 1.1; z.detSide = Math.random() < 0.5 ? -1 : 1; z.stuckT = 0; z.stuckN = (z.stuckN || 0) + 1; if (z.stuckN >= 2) { z.noLosT = 3; z.los = false; z.stuckN = 0; } }
    }
  }
  const ta = c.face != null ? c.face : Math.atan2(dy, dx);
  z.ang = angLerp(z.ang, ta, Math.min(1, dt * 8));
  // the 2.0 zombies swing before they hit: a wind-up you can see (and step out of), then the blow lands with the swing
  if (z.m.v2 && !z.illusion && G.mode === 'play' && !z.st.under && !(z.frozen && z.stun > 0) && z.hitCd < 0.22 && !(z.atkW > G.time - 0.5) && d < z.r + p.r + z.reach + 20) { z.atkW = G.time; z.atkT = G.time; z.hitCd = 0.22; }
  if (!z.illusion && !z.st.under && !(z.frozen && z.stun > 0) && z.hitCd <= 0 && G.mode === 'play' && (!z.snatch || z.snatch.state === 'idle') && (!z.rb || z.rb.ill || (z.rb.state !== 'holding' && z.rb.mutT <= 0 && !z.rb.hide && !(z.rb.state === 'act' && z.rb.mv === 'charge'))) && d < z.r + p.r + z.reach + 3) {
    z.hitCd = sp.twin ? 0.45 : 0.85;
    if (z.m.v2 && !(z.atkW > G.time - 0.6)) { z.atkW = G.time; z.atkT = G.time; }
    // a shot arm hits weaker
    if (z.armK) mul *= z.armK === 3 ? 0.4 : 0.7;
    if (hurtPlayer(z.dmg * mul)) {
      onHitEffect(z);
      if (sp.lifesteal) heal(z, z.dmg * mul * 0.5);
      if (z.abs.indexOf('leech') >= 0) { heal(z, z.maxHp * 0.3); z.growth = Math.min(1.5, z.growth * 1.07); z.r = z.baseR * z.growth; ring(z.x, z.y, z.r, z.r * 1.8, 0.3, '200,30,50', 3); }
    }
  }
}
// a boss in the real-world city walks through cars, fences and benches rather than around them: they crunch under it,
// set off car alarms and slow it a little, but they never pin it in place
function bossTrample(z, dt) {
  z.trT = (z.trT || 0) - dt; if (z.trT > 0) return;
  z.trT = 0.22;
  const rr = z.r * 0.8, rs = rectsNear(z.x, z.y, rr);
  for (let i = 0; i < rs.length; i++) {
    const r = rs[i]; if (SOLID[r.k]) continue;
    const nx = clamp(z.x, r.x, r.x + r.w), ny = clamp(z.y, r.y, r.y + r.h), dx = z.x - nx, dy = z.y - ny;
    if (dx * dx + dy * dy > rr * rr) continue;
    if (r.k === 'car') { carHit(r); if (typeof swarmPress === 'function') { const dl = Math.hypot(dx, dy) || 1; swarmPress(z, r, dx / dl, dy / dl, z.vx, z.vy); } }
    burst(nx, ny, 6, r.k === 'car' ? '#9aa4ad' : r.k === 'fence' ? '#8a8f94' : '#6b5440', 150, 3, 0.45);
    const p = G.p; if (p && Math.hypot(p.x - z.x, p.y - z.y) < 700) shakeIt(1.2);
    z.vx *= 0.8; z.vy *= 0.8;
    break;
  }
}
function onHitEffect(z) {
  const p = G.p, k = z.m.S.p.onHit; if (!k || z.fly) return;
  if (k === 'poison') p.poisonT = Math.max(p.poisonT, 3);
  else if (k === 'chill') { p.slowT = Math.max(p.slowT, 1.5); p.slowMul = Math.min(p.slowMul, 0.6); }
  else if (k === 'burn') p.burnT = Math.max(p.burnT, 2.5);
  else if (k === 'jam') p.jamT = Math.max(p.jamT, 0.9);
  else if (k === 'weaken') p.weakT = Math.max(p.weakT, 3);
  else if (k === 'freeze') { p.frozenT = Math.max(p.frozenT, 0.6); burst(p.x, p.y, 10, '#d8f6ff', 90, 4, 0.4); }
  else if (k === 'knock') { const a = Math.atan2(p.y - z.y, p.x - z.x); p.kvx += Math.cos(a) * 430; p.kvy += Math.sin(a) * 430; }
  else if (k === 'blind') p.blindT = Math.max(p.blindT, 2.2);
  else if (k === 'bleed') p.bleedT = Math.max(p.bleedT, 3);
  else if (k === 'root') p.rootT = Math.max(p.rootT, 0.75);
}

function hurtZombie(z, dmg, o) {
  if (NET.role === 'client') { if (NET.cosmetic) return false; if (z.puppet) return netHit(z, dmg, o); }
  if (z.dead) return false;
  // 1.9.994: the knife's hit carries the death it chose ("k" + ANIMA's melee death), from here or from a teammate
  if (o && typeof o.src === 'string' && o.src.length === 3 && o.src[0] === 'k' && /^k\d\d$/.test(o.src)) { z.meleeCi = +o.src.slice(1); o.src = 'melee'; }
  if (z.st.under || z.st.down > 0) return 'pass';
  if (z.rb && !z.rb.ill) {
    if (z.rb.mutT > 0 || z.rb.hide) return 'pass';
    if (z.rb.shieldT > 0 && (o.src === 'bullet' || o.src === 'a10')) { if (Math.random() < 0.3) burst(z.x + rand(-z.r, z.r), z.y + rand(-z.r, z.r), 2, '#9fd3ff', 90, 3, 0.25); return 'pass'; }
  }
  const zp = z.m.S.p;
  if (o.src === 'bullet') {
    if (z.st.phased) return 'pass';
    if (zp.reflect && !z.illusion && G.p && Math.random() < zp.reflect) {
      const a = Math.atan2(G.p.y - z.y, G.p.x - z.x);
      shoot(z.x + Math.cos(a) * z.r, z.y + Math.sin(a) * z.r, a, 430, 5 + G.wave * 0.5, 4, 'shard');
      burst(z.x, z.y, 4, '#e8eef5', 90, 3, 0.25); return 'reflect';
    }
    if (z.dodge && Math.random() < z.dodge) { G.texts.push({ x: z.x, y: z.y - z.r, t: 0, life: 0.45, s: 'miss', c: '#8f959e' }); return 'pass'; }
  }
  if (z.illusion) { killZombie(z); return true; }
  // the 2.0 zombies: where it was hit (for the hit reaction, the death and a crippled limb), and a lethal hit is lethal
  if (z.m.v2) {
    // no region given (a dash, a homing round, a blast): a body blow, at most every 0.35 s for damage that keeps coming
    const reg = o.reg || ((o.src === 'blast' || o.src === 'a10' || o.src === 'dash' || o.src === 'bullet') && !(z.hitT > G.time - 0.35) ? 'torso' : null);
    if (reg) { z.hitReg = reg; z.hitT = G.time; z.hitP = o.P != null ? o.P : (o.src === 'blast' || o.src === 'a10' ? 2 : 0.6); if (o.kx || o.ky) z.hitA = Math.atan2(o.ky, o.kx); }
    z.lastSrc = o.src || 'bullet';
    if (o.cripple) {
      if (reg === 'legL' || reg === 'legR') { const bit = reg === 'legL' ? 1 : 2; if (!((z.legM || 0) & bit)) { z.legM = (z.legM || 0) | bit; z.legK = (z.legK || 0) + 1; } }
      else if (reg === 'armL' || reg === 'armR') {
        const bit = reg === 'armL' ? 1 : 2; z.armK |= bit;
        // a brittle body, or a round heavy enough, takes the arm clean off
        if (!((z.sever || 0) & bit) && ((z.T && z.T.brittle) || (o.P || 0) > 2.4)) {
          z.sever = (z.sever || 0) | bit;
          if (typeof goreGib === 'function') { const a = (z.hitA || 0) + (Math.random() - 0.5) * 0.8, sx = z.x - Math.sin(z.ang) * z.r * (bit === 1 ? -0.8 : 0.8), sy = z.y + Math.cos(z.ang) * z.r * (bit === 1 ? -0.8 : 0.8); goreGib(sx, sy, a, 160 * PK, 'flesh', [118, 22, 20], 4.5 * PK); goreGib(sx, sy, a + 0.3, 140 * PK, 'bone', null, 2.6 * PK); }
          burst(z.x, z.y, 8, z.m.S.gore, 160, 4, 0.5);
        }
      }
    }
    if (o.kill && !z.noKill) dmg = Math.max(dmg, z.hp + (z.shield || 0) + 1);   // (noKill: a test's stand-in that must not die)
  }
  dmg *= 1 - z.dr;
  if (z.shield > 0) { const a = Math.min(z.shield, dmg); z.shield -= a; dmg -= a; }
  if (z.shieldMax) z.shieldCd = 3;
  z.hp -= dmg; z.flash = 0.09;
  if ((o.src === 'blast' || o.src === 'a10') && typeof goreBlastHit === 'function') goreBlastHit(z, Math.atan2(o.ky || 0, o.kx || 0), dmg);   // burns, chunks
  if (o.kx) { z.kvx += o.kx * z.kb; z.kvy += o.ky * z.kb; }
  if (o.crit) G.texts.push({ x: z.x + rand(-6, 6), y: z.y - z.r, t: 0, life: 0.6, s: String(Math.round(dmg)), c: '#f2cc3a' });
  if (z.abs.indexOf('hive') >= 0 && Math.random() < 0.28 && G.nFly < 30) { spawnZombie(z.m, z.x, z.y, { fly: true }); G.nFly++; }
  if (zp.surge && !z.st.surged && z.hp > 0 && z.hp < z.maxHp * 0.5) { z.st.surged = true; z.st.surgeT = 4; ring(z.x, z.y, z.r, z.r * 2.4, 0.4, '122,240,255', 3); }
  if (z.hp <= 0 && zp.revive && !z.st.revived && !z.minion && !z.child && !z.fly && !z.boss && o.reg !== 'head') {
    z.st.revived = true; z.st.down = 1.4; z.hp = 0.01; z.kvx = z.kvy = 0; burst(z.x, z.y, 8, '#e6dcc0', 80, 4, 0.4); return true;
  }
  if (z.rb && !z.rb.ill) checkBossForm(z);
  if (z.hp <= 0) killZombie(z);
  return true;
}
function killZombie(z) {
  if (z.dead) return;
  if (NET.role === 'client') { if (z.puppet && !NET.cosmetic) netSend({ t: 'kz', z: z.nid }); return; }
  const dci = z.m.v2 && !z.fly && typeof animaDeath === 'function' ? animaDeath(z) : -1;   // it falls the way it was hit, and stays a while
  z.dead = true;
  if (NET.role === 'host') { NET.kills.push(dci >= 0 ? [z.nid, NET.lastHitBy, dci, Math.round((z.hitA || 0) * 100), Math.round(z.ang * 100)] : [z.nid, NET.lastHitBy]); NET.zmap.delete(z.nid); }
  const m = z.m, gore = m.S.gore, mine = NET.lastHitBy === 1;
  if (z.illusion) { burst(z.x, z.y, 10, '#efe9dc', 120, 4, 0.4); return; }
  if (!z.fly) {
    G.kills++; if (mine) dashOnKill();
    const cm = chainKill();
    const pts = Math.round(m.threat * 10 * (1 + G.wave * 0.1) * (z.boss ? 12 : (z.minion || z.child) ? 0.4 : 1) * cm * (G.p ? G.p.scoreMul : 1));
    G.score += pts;
    if (mine && G.p && G.p.killHeal && !G.p.remote) healPlayer(G.p.killHeal);
    if (!z.minion && !m.unique) discover(m);
    if (z.boss) G.texts.push({ x: z.x, y: z.y - z.r - 10, t: 0, life: 1.4, s: '+' + pts, c: '#f2cc3a', big: true });
  }
  if (!z.fly) near(z.x, z.y, 180, o => {
    if (o === z || o.dead || o.illusion) return; const op = o.m.S.p;
    if (op.feed) { heal(o, o.maxHp * 0.25); burst(o.x, o.y, 3, '#b0ff6a', 60, 3, 0.3); }
    if (op.enrage) o.buffT = 4;
  });
  burst(z.x, z.y, z.boss ? 40 : z.fly ? 3 : 10, gore, z.boss ? 260 : 150, z.fly ? 2 : 5, 0.6);
  if (!z.fly) { if (typeof goreKill === 'function' && goreOk()) goreKill(z); else splat(z.x, z.y, z.r * rand(0.9, 1.4), gore); }
  coreEmit('kill', { z: z, by: NET.lastHitBy });
  if (!z.fly && G.chain >= 25 && G.mode === 'play') burst(z.x, z.y, 6 + Math.min(14, Math.floor(G.chain / 25) * 3), chainColor(G.chain), 260, 3, 0.45);
  const dp = m.S.p.death;
  if (!z.fly && !z.minion) {
    if (dp === 'bile') { if (G.mode === 'play') netEach(p => { if (Math.hypot(p.x - z.x, p.y - z.y) < 70 + z.r) hurtPlayer(10 + G.wave); }); burst(z.x, z.y, 18, '#b7c25a', 220, 5, 0.5); ring(z.x, z.y, z.r, 70 + z.r, 0.3, '183,194,90', 3); }
    if (dp === 'sludge') G.haz.push({ k: 'sludge', x: z.x, y: z.y, r: z.r * 2.2, life: 5, max: 5 });
    if (dp === 'fire') G.haz.push({ k: 'fire', x: z.x, y: z.y, r: z.r * 1.8, life: 3.5, max: 3.5, dps: 10 + G.wave * 0.6 });
    if (dp === 'spores') G.haz.push({ k: 'spore', x: z.x, y: z.y, r: 72, life: 3.5, max: 3.5 });
    if (dp === 'brood') for (let i = 0; i < 3; i++) { const a = rand(TAU); spawnZombie(m, z.x + Math.cos(a) * 14, z.y + Math.sin(a) * 14, { minion: true }); }
    if (dp === 'carrier' && typeof ZR_BY !== 'undefined') { const cw = ZR_BY.get('crawler'); for (let i = 0; i < 3 && cw; i++) { const a = rand(TAU), q = spawnZombie(cw, z.x + Math.cos(a) * z.r, z.y + Math.sin(a) * z.r, { minion: true, emerge: true }); } burst(z.x, z.y, 16, '#8a6a5a', 200, 5, 0.6); }
    if (dp === 'wisp' && G.p) { const a = Math.atan2(G.p.y - z.y, G.p.x - z.x); shoot(z.x, z.y, a, 190, z.dmg * 1.2, 7, 'wisp'); }
    for (const ab of z.abs) {
      if (ab === 'bomber' && !z.st.boomed) bombBlast(z);
      if (ab === 'splitter' && !z.child) for (let i = 0; i < 2; i++) { const a = rand(TAU); spawnZombie(m, z.x + Math.cos(a) * z.r * 0.6, z.y + Math.sin(a) * z.r * 0.6, { child: true }); }
      if (ab === 'spiker') for (let i = 0; i < 10; i++) shoot(z.x, z.y, i / 10 * TAU + rand(0.2), 260, z.dmg * 0.7, 5, 'spike');
      if (ab === 'voidheart') { G.haz.push({ k: 'vortex', x: z.x, y: z.y, r: 190, life: 2.6, max: 2.6 }); shakeIt(6); }
    }
  }
  if (z.boss) {
    G.boss = null; shakeIt(14);
    if (G.grab && G.grab.z === z) endGrab(true);
    const ovl = z.rb && z.rb.def.overlord;
    if (G.p && !G.p.remote && !G.p.down) G.p.hp = ovl ? G.p.maxHp : Math.min(G.p.maxHp, G.p.hp + 30);
    if (NET.role === 'host') for (const pr of NET.peers.values()) if (pr.p && !pr.p.down) pr.p.out.heal += ovl ? pr.p.maxHp : 30;
    if (z.rb) { if (ovl) store.set('zc_overlord', store.get('zc_overlord', 0) + 1); else { bossKilled.add(z.rb.def.id); saveBosses(); } }
    if (ovl) { const bonus = 5000 * Math.max(1, G.wave); G.score += bonus; SFX.milestone(); shakeIt(22); banner('Overlord slain', 'Fully healed · +' + bonus.toLocaleString()); }
    else banner(z.rb ? z.rb.def.name + ' destroyed' : m.unique ? 'The Snatcher is down' : 'Alpha down', 'Healed 30');
    for (let i = 0; i < (ovl ? 5 : 2); i++) G.picks.push({ x: z.x + rand(-30, 30), y: z.y + rand(-30, 30), k: 'med', life: 16 });
  } else if (!z.fly && Math.random() < 0.035) G.picks.push({ x: z.x, y: z.y, k: 'med', life: 14 });
}

/* ================= The Snatcher (boss with grab) ================= */
// Attack pattern: hand slam (small circle, every 5-7s) and the grab: a big red circle zone follows you,
// locks, then the boss leaps in. Caught inside = grabbed, tap the circles on screen to break free. 36s cooldown.
const SNATCHER = {
  id: -1, num: 0, name: 'The Snatcher', unique: true, threat: 10, rarity: 4, hp: 2.4, spd: 0.95, dmg: 1.4, size: 1.35, hue: 0, seed: 7,
  S: { key: 'snatcher', name: 'Snatcher', p: { kb: 0 }, gore: '#4a1f24', trait: '' }, A: { key: 'none', name: '', desc: '' }
};
const GRAB_CD = 36, GRAB_TELE = 1.8, GRAB_LOCK = 0.6, GRAB_R = 125;
function spawnSnatcher() {
  const pos = spawnPos(), z = spawnZombie(SNATCHER, pos.x, pos.y, { boss: true });
  z.abs = []; z.snatch = { state: 'idle', t: 0, grabCd: 10, slamCd: 4, zx: 0, zy: 0, zr: 0, lx: 0, ly: 0 };
  G.boss = z; SFX.roar(); G.cineT = 2.4;
  banner('The Snatcher', 'Stay out of the red circle');
}
function snatcherTick(z, dt, dx, dy, d, c) {
  const s = z.snatch, p = G.p;
  if (s.grabCd > 0 && s.state !== 'holding') s.grabCd -= dt;
  if (s.slamCd > 0) s.slamCd -= dt;
  if (s.state === 'idle') {
    if (G.mode !== 'play') return;
    if (s.grabCd <= 0 && d < 560) { SFX.alarm(); s.state = 'grabTele'; s.t = GRAB_TELE; s.zx = p.x; s.zy = p.y; s.zr = GRAB_R; s.lx = z.x; s.ly = z.y; return; }
    if (s.slamCd <= 0 && d < 260) { const reach = Math.min(d, 140); s.state = 'slamTele'; s.t = 0.9; s.zx = z.x + dx / d * reach; s.zy = z.y + dy / d * reach; s.zr = 90; return; }
    return;
  }
  c.move = 0;
  if (s.state === 'grabTele') {
    s.t -= dt;
    if (s.t > GRAB_LOCK) {
      const k = Math.min(1, dt * 4); s.zx += (p.x - s.zx) * k; s.zy += (p.y - s.zy) * k;
      s.lx = z.x; s.ly = z.y; c.face = Math.atan2(s.zy - z.y, s.zx - z.x);
    } else {
      const f = 1 - Math.max(0, s.t) / GRAB_LOCK, ang = Math.atan2(s.zy - s.ly, s.zx - s.lx);
      const tx = s.zx - Math.cos(ang) * z.r * 0.6, ty = s.zy - Math.sin(ang) * z.r * 0.6;
      z.x = s.lx + (tx - s.lx) * f; z.y = s.ly + (ty - s.ly) * f; c.face = ang; c.ov = true; c.vx = 0; c.vy = 0;
    }
    if (s.t <= 0) {
      const inside = G.mode === 'play' && !G.grab && p.dashT <= 0 && Math.hypot(p.x - s.zx, p.y - s.zy) < s.zr;
      ring(s.zx, s.zy, 10, s.zr, 0.4, '229,72,77', 5); burst(s.zx, s.zy, 22, '#6b5a45', 260, 6, 0.6); shakeIt(10);
      s.grabCd = GRAB_CD;
      if (inside) startGrab(z);
      else { s.state = 'recover'; s.t = 1.4; G.texts.push({ x: z.x, y: z.y - z.r - 16, t: 0, life: 1, s: 'MISSED', c: '#f2cc3a', big: true }); }
    }
    return;
  }
  if (s.state === 'slamTele') {
    s.t -= dt; c.face = Math.atan2(s.zy - z.y, s.zx - z.x);
    if (s.t <= 0) {
      if (G.mode === 'play' && Math.hypot(p.x - s.zx, p.y - s.zy) < s.zr + p.r * 0.5) hurtPlayer(z.dmg * 1.3);
      ring(s.zx, s.zy, 8, s.zr, 0.35, '255,140,60', 4); burst(s.zx, s.zy, 14, '#6b5a45', 200, 5, 0.5); shakeIt(6); SFX.boom(false);
      s.state = 'recover'; s.t = 0.5; s.slamCd = rand(5, 7);
    }
    return;
  }
  if (s.state === 'holding') { c.face = z.ang; return; }
  s.t -= dt; if (s.t <= 0) s.state = 'idle';
}
function startGrab(z) {
  if (G.p && G.p.remote) { netHeavy(G.p, z); return; }   // a teammate can't be held from here: it lands as a heavy hit
  const p = G.p, ovl = !!(z.rb && z.rb.def.overlord), need = 5 + Math.floor(G.wave / 15) + (ovl ? 2 : 0), tt = ovl ? 3.4 : 4.6;
  G.grab = { z: z, need: need, got: 0, t: tt, max: tt, ql: 0, last: null, fast: ovl };
  if (z.snatch) z.snatch.state = 'holding'; else if (z.rb) z.rb.state = 'holding';
  $('qte').classList.toggle('fast', ovl); if (ovl) SFX.setQte(true);
  joy.active = false; joy.id = null; p.dashT = 0; p.kvx = p.kvy = 0;
  shakeIt(12); G.hurtFlash = 0.4; SFX.grab();
  $('qte').hidden = false; $('hud').classList.add('grabbed'); $('qteTime').style.width = '100%'; renderPips(); newQte();
}
function newQte() {
  const g = G.grab; if (!g) return;
  const btn = $('qteBtn'), pad = 60, top = Math.min(300, H * 0.4), bottom = Math.max(top + 40, H - 150);
  let x, y, tries = 0;
  do { x = rand(pad, Math.max(pad + 1, W - pad)); y = rand(top, bottom); tries++; } while (g.last && Math.hypot(x - g.last[0], y - g.last[1]) < 120 && tries < 12);
  g.last = [x, y]; g.ql = g.fast ? 0.78 : 1.15;
  btn.style.left = x + 'px'; btn.style.top = y + 'px';
  btn.classList.remove('go'); void btn.offsetWidth; btn.classList.add('go');
}
function renderPips() {
  const g = G.grab, el = $('qtePips'); el.textContent = ''; if (!g) return;
  for (let i = 0; i < g.need; i++) { const s = document.createElement('i'); if (i < g.got) s.className = 'on'; el.appendChild(s); }
}
function qteHit() {
  const g = G.grab; if (!g || G.mode !== 'play') return;
  g.got++; burst(G.p.x, G.p.y, 6, '#f2cc3a', 140, 4, 0.3); shakeIt(3); renderPips(); SFX.tap(g.got);
  if (g.got >= g.need) endGrab(true); else newQte();
}
function updGrab(dt) {
  const g = G.grab, z = g.z, p = G.p;
  if (z.dead) { endGrab(true); return; }
  p.x = z.x + Math.cos(z.ang) * (z.r + 8); p.y = z.y + Math.sin(z.ang) * (z.r + 8);
  dotPlayer((4 + G.wave * 0.35) * dt);
  if (!G.grab) return;
  g.t -= dt; g.ql -= dt;
  $('qteTime').style.width = (clamp(g.t / g.max, 0, 1) * 100).toFixed(1) + '%';
  if (g.t <= 0) { endGrab(false); return; }
  if (g.ql <= 0) newQte();
}
function endGrab(escaped) {
  const g = G.grab; if (!g) return;
  G.grab = null; $('qte').hidden = true; $('hud').classList.remove('grabbed'); SFX.setQte(false);
  const z = g.z, p = G.p, a = z.ang, S = z.snatch || z.rb, who = z.rb ? z.rb.def.forms[z.rb.form].name : 'The Snatcher';
  p.iframe = 1.1;
  if (escaped) {
    if (!z.dead && S) { S.state = 'stunned'; S.t = 2.5; }
    p.kvx = Math.cos(a) * 380; p.kvy = Math.sin(a) * 380;
    ring(p.x, p.y, 6, 60, 0.4, '242,204,58', 4); SFX.escape();
    banner('Broke free', z.dead ? '' : who + ' is stunned');
  } else {
    if (!z.dead && S) { S.state = 'recover'; S.t = 1.2; }
    const dmg = Math.round(p.maxHp * 0.35);
    p.kvx = Math.cos(a) * 560; p.kvy = Math.sin(a) * 560; shakeIt(16); G.hurtFlash = 0.6;
    G.texts.push({ x: p.x, y: p.y - 20, t: 0, life: 1.2, s: '-' + dmg, c: '#e5484d', big: true });
    banner('Crushed', 'Tap the circles faster'); SFX.crush();
    dotPlayer(dmg);
  }
}
$('qteBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); qteHit(); });

/* ================= player ================= */
function hurtPlayer(a) {
  const p = G.p; if (G.mode !== 'play' || !p) return false;
  if (p.remote) return netHurtProxy(p, a);
  if (p.down) return false;
  if (p.iframe > 0 || (p.dashT > 0 && !dashDef(p).quiet) || G.grab) return false;   // (a dodge roll is untouchable only for its first part)
  if (p.arm) armsEngage(p);
  if (dashDodge(p)) { p.iframe = 0.25; G.texts.push({ x: p.x, y: p.y - 26, t: 0, life: 0.6, s: 'dodge', c: dashDef(p).hex }); return false; }
  p.hp -= a * p.taken; p.iframe = 0.3; G.hurtFlash = 0.35; shakeIt(6); SFX.hurt(); buzz(22);
  burst(p.x, p.y, 8, '#9e1c22', 140, 4, 0.5);
  if (p.hp <= 0) die();
  return true;
}
function dotPlayer(a) { const p = G.p; if (G.mode !== 'play' || !p) return; if (p.remote) { netDotProxy(p, a); return; } if (p.down) return; p.hp -= a * p.taken; if (p.hp <= 0) die(); }

function updPlayer(dt) {
  const p = G.p;
  let [ix, iy] = moveInput();
  const l = Math.hypot(ix, iy); if (l > 1) { ix /= l; iy /= l; }
  p.ix = ix; p.iy = iy;
  if (p.slowT > 0) { p.slowT -= dt; if (p.slowT <= 0) p.slowMul = 1; }
  if (p.poisonT > 0) { p.poisonT -= dt; dotPlayer((3 + G.wave * 0.3) * dt); }
  if (p.burnT > 0) { p.burnT -= dt; dotPlayer((6 + G.wave * 0.4) * dt); if (Math.random() < 0.3) burst(p.x, p.y, 1, '#ff8a2a', 40, 3, 0.4); }
  if (p.jamT > 0) p.jamT -= dt;
  if (p.weakT > 0) p.weakT -= dt; if (p.frozenT > 0) p.frozenT -= dt; if (p.rootT > 0) p.rootT -= dt; if (p.blindT > 0) p.blindT -= dt;
  if (p.bleedT > 0) { p.bleedT -= dt; dotPlayer((5 + G.wave * 0.3) * dt); if (Math.random() < 0.2) burst(p.x, p.y, 1, '#b3121c', 30, 3, 0.5); }
  p.iframe -= dt; p.dashCdT -= dt; p.flashT -= dt;
  if (p.regen) healPlayer(p.regen * dt);
  if (p.selfDps && p.hp > 1) { p.hp = Math.max(1, p.hp - p.selfDps * dt); if (Math.random() < dt * 8) burst(p.x, p.y, 1, '#ff9a3a', 40, 3, 0.4); }
  if (p.queue.length) { for (const q of p.queue) q.t -= dt; const due = p.queue.filter(q => q.t <= 0); if (due.length) { p.queue = p.queue.filter(q => q.t > 0); if (p.jamT <= 0 && p.frozenT <= 0 && !G.grab) due.forEach(q => volley(p.aim, q.mul)); } }
  if (G.grab) { updGrab(dt); return; }
  if (p.down) { p.ix = p.iy = 0; p.kvx = p.kvy = 0; return; }   // co-op: down until a teammate revives you
  let vx, vy;
  if (p.dashT > 0) { const sp = dashVel(p, dt); p.dashT -= dt; vx = p.dashDx * sp; vy = p.dashDy * sp; if (p.dashT <= 0) dashEnd(p); }
  else if (p.frozenT > 0 || p.rootT > 0) { vx = 0; vy = 0; }
  else { const s = p.speed * (p.slowT > 0 ? p.slowMul : 1) * waterSlow(p.wk) * WX.slow * (p.arm ? armsSpeedMul(p) : 1); vx = ix * s; vy = iy * s; }
  // on ice your feet keep sliding the way you were going
  if (p.wk === 4 && p.dashT <= 0) { const k = Math.min(1, dt * 2.2); p.ivx += (vx - p.ivx) * k; p.ivy += (vy - p.ivy) * k; vx = p.ivx; vy = p.ivy; } else { p.ivx = vx; p.ivy = vy; }
  vx += p.extX + p.kvx; vy += p.extY + p.kvy; p.extX = 0; p.extY = 0;
  const kd = Math.exp(-7 * dt); p.kvx *= kd; p.kvy *= kd;
  p.x += vx * dt; p.y += vy * dt; collide(p, p.r); p.wk = waterAt(p.x, p.y);
  if (l > 0.1) p.walk += dt * 10 * (p.arm && p.arm.st === 'sprint' ? 1.3 : 1);
  if (p.arm) armsTick(p, dt, l > 0.1);   // ready up and down, sprint, reloads, swaps (arms.js)
  // Aiming. On a phone (and with Auto-aim on PC or a controller) the gun locks onto the nearest zombie and fires by
  // itself. With a mouse or a controller you aim yourself: the mouse, or the right stick, with an optional nudge
  // onto targets (assist), and you fire with the button, the stick or "on target".
  const am = aimMode();
  let best = null, bd = Infinity;
  if (am === 'auto' || (am === 'assist' && DEV.kind === 'pad')) {
    const vw = W / ZOOM / 2 + 10, vh = H / ZOOM / 2 + 10, rg = p.S.range * p.S.range;
    for (const z of G.zs) {
      if (z.dead || z.st.under) continue;
      const ex = z.x - p.x, ey = z.y - p.y; if (Math.abs(ex) > vw || Math.abs(ey) > vh) continue;
      let dd = ex * ex + ey * ey; if (dd > rg) continue;
      if (z.st.down > 0 || (z.m.S.p.camo && dd > 52900)) continue;
      if (z.st.phased) dd *= 4; if (z.fly) dd *= 1.5;
      if (dd < bd) { bd = dd; best = z; }
    }
  }
  p.fireCd -= dt;
  if (am === 'auto') {
    if (best) p.aim = angLerp(p.aim, Math.atan2(best.y - p.y, best.x - p.x), Math.min(1, dt * 18));
    else if (l > 0.1) p.aim = angLerp(p.aim, Math.atan2(iy, ix), Math.min(1, dt * 10));
    if (p.arm) { if (best) { armsEngage(p); if (p.arm.st !== 'sprint') armsFire(p, best, null, true); } }   // (sprinting: the gun stays down)
    else if (best && p.fireCd <= 0 && p.jamT <= 0 && p.frozenT <= 0) { fireWeapon(best); p.fireCd = 1 / (p.S.rof * dashRofMul(p)); }
    return;
  }
  let ang = aimInput(p);
  if (ang == null && DEV.kind === 'pad' && G.time - DEV.rsT > 0.45) {
    if (best) ang = Math.atan2(best.y - p.y, best.x - p.x);            // assist keeps tracking with the stick let go
    else if (l > 0.1) ang = Math.atan2(iy, ix);                         // otherwise face the way you walk
  }
  if (ang != null && am === 'assist') { const t = coneTarget(p, ang, 0.2); if (t) ang = angLerp(ang, Math.atan2(t.y - p.y, t.x - p.x), 0.6); }
  if (ang != null) p.aim = DEV.kind === 'kbm' && am === 'manual' ? ang : angLerp(p.aim, ang, Math.min(1, dt * (DEV.kind === 'kbm' ? 30 : 22)));
  if (p.arm) { if (wantFire(p)) armsFire(p, coneTarget(p, p.aim, 0.25), p.aim); }
  else if (p.fireCd <= 0 && p.jamT <= 0 && p.frozenT <= 0 && wantFire(p)) { fireWeapon(coneTarget(p, p.aim, 0.25), p.aim); p.fireCd = 1 / (p.S.rof * dashRofMul(p)); }
}
/* ================= projectiles, hazards ================= */
function pointInRect(x, y) { const rs = rectsNear(x, y, 0.5); for (let i = 0; i < rs.length; i++) { const r = rs[i]; if (!r.low && x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return r; } return null; }
function updEshots(dt) {
  const p = G.p;
  const shotCol = k => SHOT_COL[k] || '#d9cfb4';
  for (const s of G.eshots) {
    if (s.k === 'wisp' && G.mode === 'play') {
      const ta = Math.atan2(p.y - s.y, p.x - s.x), ca = Math.atan2(s.vy, s.vx), na = angLerp(ca, ta, Math.min(1, dt * 2.6)), sp = Math.hypot(s.vx, s.vy);
      s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; if (Math.random() < 0.5) burst(s.x, s.y, 1, '#ffb04a', 20, 3, 0.35);
    }
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (s.life <= 0) { s.dead = true; continue; }
    if (s.k !== 'wisp' && pointInRect(s.x, s.y)) { s.dead = true; burst(s.x, s.y, 4, shotCol(s.k), 80, 3, 0.25); continue; }
    if (G.mode === 'play' && Math.hypot(p.x - s.x, p.y - s.y) < s.r + p.r) {
      s.dead = true;
      if (hurtPlayer(s.dmg)) {
        if (s.k === 'acid') p.poisonT = Math.max(p.poisonT, 1.5);
        else if (s.k === 'fire') p.burnT = Math.max(p.burnT, 2);
        else if (s.k === 'ice') { p.slowT = Math.max(p.slowT, 1.5); p.slowMul = Math.min(p.slowMul, 0.6); }
        else if (s.k === 'void') p.weakT = Math.max(p.weakT, 2.5);
        else if (s.k === 'shock') p.jamT = Math.max(p.jamT, 0.5);
      }
      if (s.k === 'web' && !(p.dashT > 0)) p.rootT = Math.max(p.rootT, 1.1);
      burst(s.x, s.y, 5, shotCol(s.k), 100, 3, 0.3);
    }
  }
  G.eshots = G.eshots.filter(s => !s.dead);
}
function updHaz(dt) {
  const p = G.p;
  for (const h of G.haz) {
    h.life -= dt; if (h.life <= 0) { h.dead = true; continue; }
    const d = Math.hypot(p.x - h.x, p.y - h.y);
    if (h.k === 'acid' || h.k === 'fire') { if (d < h.r + p.r * 0.5) dotPlayer(h.dps * dt); }
    else if (h.k === 'sludge') { if (d < h.r) { p.slowT = Math.max(p.slowT, 0.2); p.slowMul = Math.min(p.slowMul, 0.55); } }
    else if (h.k === 'ice') { if (d < h.r) { p.slowT = Math.max(p.slowT, 0.25); p.slowMul = Math.min(p.slowMul, 0.42); dotPlayer(h.dps * 0.4 * dt); } }
    else if (h.k === 'spore') { if (d < h.r && G.mode === 'play') p.poisonT = Math.max(p.poisonT, 1.2); }
    else if (h.k === 'vortex') {
      if (d < h.r && G.mode === 'play') { const f = (1 - d / h.r) * 230 + 50; p.extX += (h.x - p.x) / (d || 1) * f; p.extY += (h.y - p.y) / (d || 1) * f; if (d < 36) dotPlayer(18 * dt); }
      near(h.x, h.y, h.r, o => {
        if (o.dead) return; const od = Math.hypot(o.x - h.x, o.y - h.y); if (od > h.r) return;
        o.kvx += (h.x - o.x) / (od || 1) * 600 * dt; o.kvy += (h.y - o.y) / (od || 1) * 600 * dt;
        if (od < 40 && !o.boss) { o.hp -= 30 * dt; if (o.hp <= 0) killZombie(o); }
      });
    }
  }
  G.haz = G.haz.filter(h => !h.dead);
}
function updPicks(dt) {
  const p = G.p;
  for (const k of G.picks) {
    k.life -= dt; if (k.life <= 0) { k.dead = true; continue; }
    if (Math.hypot(p.x - k.x, p.y - k.y) < p.r + 16) { k.dead = true; healPlayer(25); SFX.heal(); ring(k.x, k.y, 6, 40, 0.35, '110,230,120', 3); G.texts.push({ x: p.x, y: p.y - 20, t: 0, life: 0.8, s: '+25', c: '#7bd88a' }); }
  }
  G.picks = G.picks.filter(k => !k.dead);
}
function updFx(dt) {
  for (const q of G.parts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; const dr = Math.exp(-4 * dt); q.vx *= dr; q.vy *= dr; if (q.bl && q.life <= 0) goreLand(q); }
  if (typeof goreTick === 'function') goreTick(dt);
  if (typeof muzzleTick === 'function') muzzleTick(dt);
  if (typeof physStep === 'function') physStep(dt);   // brass and magazines in the street (PHYSICS)
  if (typeof tracerTick === 'function') tracerTick(dt);
  G.parts = G.parts.filter(q => q.life > 0);
  for (const r of G.rings) r.t += dt; G.rings = G.rings.filter(r => r.t < r.life);
  for (const t of G.texts) { t.t += dt; t.y -= 26 * dt; } G.texts = G.texts.filter(t => t.t < t.life);
  if (G.texts.length > Q.texts) G.texts.splice(0, G.texts.length - Q.texts);
  for (const b of G.bolts) b.life -= dt; G.bolts = G.bolts.filter(b => b.life > 0);
  G.shake = Math.max(0, G.shake - dt * 30); G.hurtFlash = Math.max(0, G.hurtFlash - dt);
}

/* ================= waves ================= */
/* Wave timers: every wave runs against a preset clock. When it runs out the next wave starts on the spot: whatever is
   left of this one stays on the street, and up to half a wave of the zombies that had not come in yet join the next.
   Clear the street before then and there are seven seconds to walk around (with a bonus for the time left) before the
   next wave starts on its own; no screen in between. The last five seconds of either clock glow red and count down
   out loud. A boss holds the clock while it lives. Settings > Gameplay > Wave timer sets the length (or turns it off). */
const WT_K = { short: 0.7, normal: 1, long: 1.5, off: 0 };
function waveTime(n) { const k = WT_K[SET.waveTimer] != null ? WT_K[SET.waveTimer] : 1; return k ? Math.round(Math.min(150, 40 + n * 4) * k) : 0; }
// how many zombies this wave still has: on the street, still to come, and in hordes on their way
function zLeft() {
  let n = 0; for (const z of G.zs) if (!z.dead && !z.illusion && !z.fly) n++;
  n += Math.max(0, G.spawnQ | 0);
  if (typeof SWARM !== 'undefined') { for (const p of SWARM.plan) n += p.n | 0; for (const H of SWARM.hordes) n += Math.max(0, H.queue | 0); }
  return n;
}
// the clock's last five seconds: a tick each second (the HUD glows red at the same time)
function waveCount(t0, t1) { const a = Math.ceil(t0), b = Math.ceil(t1); if (b < a && t1 > 0 && b >= 1 && b <= 5 && SFX.countTick) SFX.countTick(b); }
function waveTick(dt) {
  if (G.breakT > 0 || !(G.waveMax > 0) || !(G.waveT > 0)) return false;
  if (G.boss && !G.boss.dead) return false;   // a boss holds the clock
  const t0 = G.waveT; G.waveT = Math.max(0, G.waveT - dt); waveCount(t0, G.waveT);
  if (G.waveT > 0) return false;
  // time is up: the next wave, now, on top of whatever is still here
  if (SFX.timeUp) SFX.timeUp(); G.timeUps = (G.timeUps || 0) + 1;
  startWave(G.wave + 1, true);
  if (NET.role === 'host' && NET.started) hostSend('*', { t: 'go', w: G.wave, r: 0, up: 1 });
  coreEmit('waveTimeUp', { wave: G.wave });
  return true;
}
function startWave(n, carry) {
  G.wave = n; const cap = Z.threatCap(n);
  if (SET.season === 'cycle' && n > 1 && (n - 1) % 5 === 0) setSeason(WORLD.season + 1);
  // while 2.0 is built only the new roster comes (the old mutations are switched off until all 1,000 are rebuilt)
  G.pool = typeof ZR_ONLY !== 'undefined' && ZR_ONLY && ZR.length ? zrPool(n) : MUTS.filter(m => m.threat <= cap);
  const capT = Math.max.apply(null, G.pool.map(m => m.threat));
  const k = Math.min(14, 5 + Math.floor(n * 0.75)), cand = G.pool.slice(), feat = [];   // (1.9.994: more kinds in every wave)
  for (let i = 0; i < k && cand.length; i++) {
    let tot = 0; const ws = cand.map(m => { const w = (found.has(m.id) ? 1 : 3.2) * (m.threat >= capT - 1 ? 1.7 : 1); tot += w; return w; });
    let r = Math.random() * tot, idx = 0; while (idx < ws.length - 1 && r > ws[idx]) { r -= ws[idx]; idx++; }
    feat.push(cand[idx]); cand.splice(idx, 1);
  }
  G.feat = feat;
  { const base = Math.round((10 + n * 5) * (G.hordeMul || 1)), left = carry ? Math.min(Math.max(0, G.spawnQ | 0), Math.round(base * 0.5)) : 0;
    G.spawnTotal = G.spawnQ = base + left; G.spawnT = carry ? 0.6 : 1.4; }
  G.waveMax = G.waveT = waveTime(n); G.timeUp = !!carry; G.waveAt = G.time;
  // the bosses (the roster, the Snatcher, the Alphas, the roaming ones) are switched off until they are rebuilt too
  const bossOff = typeof ZR_BOSSES_OFF !== 'undefined' && ZR_BOSSES_OFF;
  G.roamAt = !bossOff && n >= 3 && n % 5 !== 0 && Math.random() < Math.min(0.6, 0.22 + n * 0.025) ? Math.round(G.spawnTotal * rand(0.3, 0.7)) : -1;
  G.bossPending = !bossOff && n % 5 === 0;
  G.breakT = 0;
  if (typeof swarmWave === 'function') swarmWave(n);   // the hordes that come on top of the trickle
  coreEmit('wave', { wave: n, n: Math.round((G.spawnQ | 0) * 0.5) });   // (CORE looks ahead: about half a wave is on the street at once)
  SFX.waveStart(G.bossPending);
  const unk = feat.filter(m => !found.has(m.id)).length;
  const still = carry ? G.zs.filter(z => !z.dead && !z.illusion).length : 0;
  banner('Wave ' + n, carry ? 'Time is up' + (still ? ' · ' + still + ' still on the street' : '') : G.bossPending ? (n % 10 === 5 ? 'The Snatcher is coming' : 'An Alpha is coming') : unk ? unk + ' unidentified zombie' + (unk > 1 ? 's' : '') + ' sighted' : 'Hold the line');
  G.mode = 'play';
  if (G.p) { const nc = NEON[(n - 1) % NEON.length]; ring(G.p.x, G.p.y, 20, 520, 0.9, rgbOf(nc), 5); ring(G.p.x, G.p.y, 10, 300, 0.7, rgbOf(nc), 3); }
}
function spawner(dt) {
  if (G.spawnQ <= 0 && !G.bossPending) return;
  G.spawnT -= dt; if (G.spawnT > 0) return;
  if (G.bossPending && G.spawnQ <= G.spawnTotal * 0.5 && !G.boss) { if (G.wave === 5 || G.wave % 25 === 0) spawnSnatcher(); else spawnRoster(pickRoster(G.wave, false), false); G.bossPending = false; G.spawnT = 1.5; return; }
  if (G.roamAt >= 0 && !G.boss && G.spawnQ <= G.roamAt) { G.roamAt = -1; spawnRoster(pickRoster(G.wave, true), true); G.spawnT = 1.2; return; }
  if (G.spawnQ <= 0) { G.spawnT = 0.3; return; }
  if (G.zs.length >= Math.min(typeof swarmCapLive === 'function' ? swarmCapLive() : 120, 24 + G.wave * 6)) { G.spawnT = 0.4; return; }
  const group = Math.min(G.spawnQ, 1 + Math.floor(Math.random() * Math.min(4, 1 + G.wave / 3)));
  const pos = spawnPos();
  let lastM = null;
  for (let i = 0; i < group; i++) {
    // a group is a mix of the wave's dead, never two of a kind side by side when it can help it
    let m = Math.random() < 0.62 ? pick(G.feat) : pick(G.pool); if (m === lastM) m = pick(G.pool.length > 1 ? G.pool : G.feat) || m; lastM = m;
    spawnZombie(m, pos.x + rand(-30, 30), pos.y + rand(-30, 30)); G.spawnQ--;
  }
  G.spawnT = Math.max(0.25, 1.4 - G.wave * 0.06) * rand(0.6, 1.4);
}
function spawnBoss() {
  const cap = Z.threatCap(G.wave);
  const pool = MUTS.filter(m => m.threat <= cap && m.threat >= Math.max(2, cap - 3) && m.A.key !== 'bomber');
  const m = pick(pool);
  let second; do { second = pick(ABILITIES).key; } while (second === m.A.key || second === 'bomber' || second === 'splitter');
  const pos = spawnPos(), z = spawnZombie(m, pos.x, pos.y, { boss: true, second: second });
  G.boss = z; SFX.roar(); G.cineT = 2.4;
  banner('Alpha ' + m.name, 'Extra mutation: ' + ABILITIES.find(a => a.key === second).name);
}
// the card rounds between waves are switched off while 2.0 is built: a short breather instead, then the next wave
const CARDS_OFF = true, BREAK_SECS = 7;
function waveCleared() {
  // a bonus for every second left on the clock
  G.clearBonus = G.waveMax > 0 && G.waveT > 0 ? Math.ceil(G.waveT) * 10 : 0; G.clearLeft = G.waveT || 0; if (G.waveMax > 0) G.onTime = (G.onTime || 0) + 1;
  G.score += G.wave * 100 + G.clearBonus; G.eshots = []; G.p.queue = []; G.blasts = []; G.quakes = []; G.jets = []; G.dfx = []; G.decoy = null; G.warpT = 0;
  SFX.waveClear();
  if (CARDS_OFF) { waveBreak(); return; }
  if (NET.role === 'host') netCardsOpen();
  openCards();
}
function waveBreak() {
  G.breakT = BREAK_SECS;
  // co-op: anyone down gets back up at half health (as the card round used to do)
  if (NET.role === 'host' && NET.started) {
    for (const peer of NET.peers.values()) if (peer.p && peer.p.down) netRevive(peer.p, 0.5);
    if (G.p.down) netRevive(G.p, 0.5);
    hostSend('*', { t: 'brk', w: G.wave, s: BREAK_SECS, b: G.clearBonus || 0, l: Math.ceil(G.clearLeft || 0) });
  }
  // no screen in between: the HUD's clock turns into the breather, and a short line says what the wave was worth
  clearPop(G.wave, G.wave * 100, G.clearBonus || 0, G.clearLeft || 0);
  coreEmit('waveBreak', { wave: G.wave });
}
// the breather counts down; then the next wave (a teammate's game hears 'go' as it did after the cards)
function breakTick(dt) {
  if (!(G.breakT > 0)) return false;
  const t0 = G.breakT; G.breakT -= dt; waveCount(t0, G.breakT);
  if (G.breakT <= 0) {
    G.breakT = 0; startWave(G.wave + 1);
    if (NET.role === 'host' && NET.started) hostSend('*', { t: 'go', w: G.wave, r: 0 });
  }
  return true;
}

/* ================= discovery / toasts / banner ================= */
function discover(m) {
  if (found.has(m.id)) return;
  found.add(m.id); G.runFound.push(m.id); saveFound();
  const r = RARITY[m.rarity]; SFX.discover(m.rarity);
  toast('New specimen #' + pad3(m.num) + ' · ' + r.name, m.name, r.color);
}
function toast(small, big, color) {
  const box = $('toasts'), el = document.createElement('div');
  el.className = 'toast'; el.style.setProperty('--rc', color);
  const s = document.createElement('small'); s.textContent = small; const b = document.createElement('b'); b.textContent = big;
  el.appendChild(s); el.appendChild(b); box.prepend(el);
  while (box.children.length > 3) box.lastChild.remove();
  setTimeout(() => el.classList.add('out'), 2600); setTimeout(() => el.remove(), 3100);
}
let bannerTimer = 0;
function banner(a, b, kind) {
  const el = $('banner'); el.textContent = '';
  // wave banners get the tape edges; "Time is up" is red
  kind = kind || (/^Wave \d+$/.test(a) ? (b && /^Time is up/.test(b) ? 'up' : 'wave') : '');
  el.className = kind ? 'bn-' + kind : '';
  const t = document.createElement('b'); t.textContent = a; el.appendChild(t);
  if (b) { const s = document.createElement('span'); s.textContent = b; el.appendChild(s); }
  el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

// a wave cleared: a short line under the clock (what it was worth), no screen in between
let clearTimer = 0;
function clearPop(w, pts, bonus, left) {
  const el = $('clearPop'); if (!el) return; el.textContent = '';
  const a = document.createElement('b'); a.textContent = 'Wave ' + w + ' cleared'; el.appendChild(a);
  const s = document.createElement('span'); s.textContent = '+' + Number(pts || 0).toLocaleString() + (bonus ? ' · +' + bonus + ' for ' + fmtClock(left) + ' left' : ''); el.appendChild(s);
  el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(clearTimer); clearTimer = setTimeout(() => { el.hidden = true; }, 2600);
}
function fmtClock(t) { t = Math.max(0, Math.ceil(t || 0)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }

/* ================= screens ================= */
const OVS = ['title', 'upgrade', 'pause', 'over'];
function showOv(id) { OVS.forEach(o => { $(o).hidden = o !== id; }); $('hud').hidden = !(G.mode === 'play' || G.mode === 'upgrade' || G.mode === 'pause' || G.mode === 'skull' || G.mode === 'cine'); }
function newRun(o) {
  o = o && !(o instanceof Event) ? o : {};
  if (typeof luxNewRun === 'function') luxNewRun();
  if (typeof coreEmit === 'function') coreEmit('run', {});   // every engine that keeps something per run clears it
  // shut for maintenance (or this version is too old): the maintenance screen instead of a run
  if (!o.client && typeof statusBlocked === 'function' && statusBlocked()) { statusApply(); return; }
  startWorld(false, o.world);
  $('skull').hidden = true;
  Object.assign(G, { dfx: [], decoy: null, warpT: 0, smoke: [], holes: [], flashA: 0, blasts: [], quakes: [], jets: [], air: 0, cine: null, bossMusKey: '', roamAt: -1, slowT: 0, tierFlash: 0, cineT: 0, skullPending: false, skullChoices: null, zhpMul: 0, bossHpMul: 0, breakT: 0, waveT: 0, waveMax: 0, timeUp: false, clearBonus: 0, heads: 0, hits: 0, rounds: 0, onTime: 0, timeUps: 0, time: 0, wave: 0, score: 0, kills: 0, zs: [], bullets: [], eshots: [], haz: [], picks: [], parts: [], rings: [], texts: [], bolts: [], splats: [], spawnQ: 0, spawnT: 0, bossPending: false, boss: null, shake: 0, hurtFlash: 0, runFound: [], upChoices: null, lastEntry: null, hintT: 6, grab: null, chain: 0, lastKill: -9, bestChain: 0, picking: false });
  $('qte').hidden = true; $('hud').classList.remove('grabbed');
  DEV.useT = { touch: 0, kbm: 0, pad: 0 }; DEV.fireOn = false; G.recorded = false;
  G.p = newPlayer(); G.p.x = WORLD.start.x; G.p.y = WORLD.start.y; cam.x = G.p.x; cam.y = G.p.y; updWeaponChip(); updDashBtn(); updAirBtn();
  GCAM.z.x = 1; GCAM.z.v = 0; GCAM.ox.x = GCAM.oy.x = GCAM.ox.v = GCAM.oy.v = 0; GCAM.k = GCAM.kv = 0; GCAM.lastK = 0;
  worldReset();
  $('toasts').textContent = '';
  wxReset();
  if (o.client) {
    // co-op: a teammate's game joins the host's run (same city, same wave), next to the host
    const a = (NET.slot || NET.me || 2) * 1.7, at = o.at || WORLD.start;
    for (let r = 46; r < 200; r += 30) { const x = at.x + Math.cos(a) * r, y = at.y + Math.sin(a) * r; if (!blocked(x, y, 14)) { G.p.x = x; G.p.y = y; break; } }
    cam.x = G.p.x; cam.y = G.p.y; G.wave = o.wave || 1;
  }
  // the loading screen: the streets around you are drawn before the run starts, so the first seconds never stutter;
  // a teammate also waits (briefly) for the host's first look at the street
  G.mode = 'loading'; showOv(null);
  const sx = G.p.x, sy = G.p.y, host = NET.role === 'host' && NET.started;
  const steps = [['Building the streets', () => chunkJobs(sx, sy)], ['Warming up the lights and sprites', () => warmJobs()]];
  if (o.client) steps.push(['Syncing with ' + (NET.hostName || 'the host'), () => loadUntil(() => NET.zmap.size > 0 || !NET.started || G.mode !== 'loading', 2500)]);
  else steps.push([host ? 'Sending the city to your team' : 'Rounding up the horde', () => { buildField(); }]);
  loadRun(o.client ? 'Joining ' + (NET.hostName || 'the game') : host ? 'Starting the co-op run' : 'Into the city', steps, { now: true, done: 'Go' }).then(() => {
    if (G.mode !== 'loading') return;   // co-op: the cards (or the end of the game) got here first
    G.mode = 'play'; showOv(null);
    if (!o.client) startWave(1);
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(() => {}); } catch (e) { /* not allowed */ }
  });
}
function pauseGame() {
  if (G.mode !== 'play') return; G.mode = 'pause'; $('pauseInfo').textContent = 'Wave ' + G.wave + ' · ' + (NET.role === 'client' ? 'co-op: the game keeps going while you are here' : NET.role === 'host' ? 'co-op: paused for everyone' : 'run in progress');
  renderPauseStats(true);
  toggleHudRadio(false); showOv('pause'); joy.active = false; joy.id = null; renderBuild(); renderAudio(); netPingBtn(); pzTab(PZ.tab);
  // in co-op the game keeps going behind the pause screen: its numbers, the clock and the map stay live
  clearInterval(PZ.iv); PZ.iv = setInterval(() => { if (G.mode !== 'pause') { clearInterval(PZ.iv); return; } renderPauseStats(); if (PZ.tab === 'map') drawPzMap(); }, 1000);
}
/* ---------- the pause screen: the run so far, the clock, and three tabs (your build, this wave's threats, a map) ---------- */
const PZ = { tab: 'build', iv: 0 };
function renderPauseStats(fresh) {
  const st = $('pauseStats'); if (!st) return;
  const tm = Math.floor(G.time || 0), acc = G.rounds ? Math.min(100, Math.round((G.hits || 0) / G.rounds * 100)) + '%' : '—';
  const left = NET.role === 'client' ? (G.zLeftN | 0) : zLeft();
  const rows = [['Wave', G.wave], ['Score', G.score.toLocaleString()], ['Kills', (G.kills || 0).toLocaleString()], ['Time', fmtClock(tm)],
   ['Best chain', G.bestChain ? 'x' + G.bestChain : '—'], ['Accuracy', acc], ['Head shots', (G.heads || 0).toLocaleString()], ['Zombies left', left.toLocaleString()]];
  // built once when the screen opens (the cells rise in), then only the numbers change
  if (fresh || st.children.length !== rows.length) {
    st.textContent = '';
    for (const [k, v] of rows) { const d = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = v; d.append(dt, dd); st.append(d); }
  } else rows.forEach(([k, v], i) => { const dd = st.children[i].lastChild; if (dd.textContent !== String(v)) dd.textContent = v; });
  const ck = $('pzClock'); if (!ck) return;
  const brk = G.breakT > 0, hold = NET.role === 'client' ? !!G.clockHold : !!(G.boss && !G.boss.dead), off = !brk && !(G.waveMax > 0), tl = brk ? G.breakT : G.waveT;
  ck.className = 'pz-clock ' + (brk ? 'brk' : off ? 'off' : hold ? 'hold' : tl <= 5 ? 'red' : 'run');
  ck.textContent = brk ? 'Breather · wave ' + (G.wave + 1) + ' starts in ' + fmtClock(tl) : off ? 'No wave timer · the wave lasts until the street is clear' : hold ? 'The boss holds the clock at ' + fmtClock(tl) : 'Wave ' + (G.wave + 1) + ' starts in ' + fmtClock(tl) + (NET.role === 'client' ? ' (co-op: the clock keeps running)' : ' · the clock is stopped while you are paused');
}
function pzTab(t) {
  PZ.tab = t;
  document.querySelectorAll('#pzTabs button').forEach(b => { const on = b.dataset.t === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  document.querySelectorAll('#pause .pz-pane').forEach(p => { p.hidden = p.dataset.p !== t; });
  if (t === 'threats') renderThreats(); else if (t === 'map') drawPzMap();
}
document.querySelectorAll('#pzTabs button').forEach(b => b.addEventListener('click', () => { SFX.click(); pzTab(b.dataset.t); }));
// this wave's zombies: who they are (if you have met them), how many are on the street, how dangerous
function renderThreats() {
  const box = $('pzThreats'); box.textContent = '';
  const pool = (G.feat && G.feat.length ? G.feat : G.pool || []).slice(0, 9), live = new Map();
  for (const z of G.zs) if (!z.dead && !z.illusion) live.set(z.m.id, (live.get(z.m.id) || 0) + 1);
  const head = el('p', 'pz-note', 'Wave ' + G.wave + ': ' + pool.length + ' kinds leading the horde' + (G.pool && G.pool.length > pool.length ? ', ' + G.pool.length + ' kinds in all' : '') + '. Kill one to identify it.');
  box.append(head);
  const grid = el('div', 'pz-th-grid');
  for (const m of pool) {
    const known = found.has(m.id), r = RARITY[m.rarity] || RARITY[0], card = el('div', 'pz-th' + (known ? '' : ' unknown')); card.style.setProperty('--rc', r.color);
    const c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true');
    const t = el('div', 'pz-th-t'); t.append(el('b', null, known ? m.name : 'Unidentified'), el('small', null, known ? r.name + ' · threat ' + m.threat : 'Seen from wave ' + (m.wave || G.wave)));
    const n = live.get(m.id) || 0; t.append(el('span', null, n ? n + ' on the street' : 'none on the street'));
    if (known && m.def && m.def.line) t.append(el('p', null, m.def.line));
    card.append(c, t); grid.append(card);
    try { if (typeof thumb2 === 'function' && m.v2) thumb2(c, m, 54, !known); else { c.width = c.height = 54; } } catch (e) { }
  }
  box.append(grid);
}
// a map of the streets around you: buildings and vehicles, water, every zombie, your team and you
function drawPzMap() {
  const cv2 = $('pzMap'); if (!cv2 || !G.p) return;
  const box = cv2.parentNode, w = Math.max(220, Math.min(460, box.clientWidth || 300)), h = Math.round(w * 0.72), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv2.width = Math.round(w * dpr); cv2.height = Math.round(h * dpr); cv2.style.width = w + 'px'; cv2.style.height = h + 'px';
  const g = cv2.getContext('2d'), R = 34 * 32 * SCL / 2.4, sc = Math.min(w, h) / 2 / R, cx = G.p.x, cy = G.p.y;
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#0b0e12'; g.fillRect(0, 0, w, h);
  const X = x => w / 2 + (x - cx) * sc, Y = y => h / 2 + (y - cy) * sc;
  // water
  const step = 9; g.fillStyle = 'rgba(40,90,140,0.55)';
  for (let py = 0; py < h; py += step) for (let px = 0; px < w; px += step) { const wx = cx + (px - w / 2) / sc, wy = cy + (py - h / 2) / sc; try { if (waterAt(wx, wy)) g.fillRect(px, py, step, step); } catch (e) { } }
  // buildings and vehicles
  try {
    const rs = rectsNear(cx, cy, Math.hypot(w, h) / 2 / sc).slice();
    for (const r of rs) { const veh = !!(r.vid || r.vt); g.fillStyle = veh ? 'rgba(160,170,185,0.55)' : 'rgba(235,229,214,0.13)'; g.fillRect(X(r.x), Y(r.y), Math.max(1, r.w * sc), Math.max(1, r.h * sc)); }
  } catch (e) { }
  // rings every 10 m
  g.strokeStyle = 'rgba(242,204,58,0.12)'; g.lineWidth = 1;
  for (let m = 10; m <= 40; m += 10) { g.beginPath(); g.arc(w / 2, h / 2, m * 32 * SCL / 2.4 * sc, 0, TAU); g.stroke(); }
  // zombies
  let n = 0;
  for (const z of G.zs) { if (z.dead || z.illusion) continue; const x = X(z.x), y = Y(z.y); if (x < -4 || y < -4 || x > w + 4 || y > h + 4) continue; n++; g.fillStyle = z.boss ? '#c86bff' : '#ff4a55'; g.beginPath(); g.arc(x, y, z.boss ? 4 : Math.max(1.6, Math.min(3.2, z.r * sc * 1.2)), 0, TAU); g.fill(); }
  // teammates and you
  if (typeof netPlayers === 'function' && NET.started) for (const q of netPlayers()) { if (q === G.p) continue; g.fillStyle = '#29e6ff'; g.beginPath(); g.arc(X(q.x), Y(q.y), 4, 0, TAU); g.fill(); }
  g.save(); g.translate(w / 2, h / 2); g.rotate(G.p.aim || 0); g.fillStyle = '#f2cc3a'; g.shadowColor = '#f2cc3a'; g.shadowBlur = 8;
  g.beginPath(); g.moveTo(8, 0); g.lineTo(-5, -5); g.lineTo(-2, 0); g.lineTo(-5, 5); g.closePath(); g.fill(); g.restore();
  const lg = $('pzLegend'); if (lg) lg.textContent = n + ' zombie' + (n === 1 ? '' : 's') + ' within about 34 m · rings every 10 m · north is up';
}
function resumeGame() { if (G.mode !== 'pause') return; G.mode = 'play'; showOv(null); }
function toTitle() {
  if (G.p && G.mode === 'pause' && G.time > 5) recordRun(); if (NET.role) netLeave();
  G.mode = 'title'; G.p = null; G.grab = null; $('qte').hidden = true; $('hud').classList.remove('grabbed');
  showOv(null);
  // back to the main menu: a new city for the title screen, drawn behind the loading screen (only shown if it takes a moment)
  loadRun('Back to the bunker', [['Waking the city', () => { initAttract(); return chunkJobs(cam.x, cam.y); }]]).then(() => { if (G.mode === 'title') { showOv('title'); refreshTitle(); } });
}
function die() {
  if (G.mode !== 'play') return;
  const p = G.p;
  if (NET.role && NET.started && !NET.finishing && !p.cs.phoenix) { netDown(); return; }
  if (p.cs.phoenix > 0) {
    p.cs.phoenix--; p.hp = p.maxHp * 0.5; p.iframe = 2.5; p.kvx = p.kvy = 0;
    if (G.grab) endGrab(true);
    ring(p.x, p.y, 8, 120, 0.6, '255,170,60', 5); burst(p.x, p.y, 40, '#ffb347', 260, 5, 0.8); SFX.escape();
    banner('Phoenix Feather', 'You rise again'); return;
  }
  if (G.grab) { G.grab = null; $('qte').hidden = true; $('hud').classList.remove('grabbed'); }
  p.hp = 0; G.mode = 'over'; joy.active = false; joy.id = null; SFX.death();
  burst(p.x, p.y, 40, '#9e1c22', 220, 6, 0.9); shakeIt(14);
  const entry = { tag: getTag(), score: G.score, wave: G.wave, kills: G.kills, at: Date.now(), dev: runDevice(), plat: PLATFORM };
  G.lastEntry = entry; saveLocal(entry); recordRun();
  $('ovEyebrow').textContent = 'Run over · ' + SEASON_NAME + ' season';
  $('ovScore').textContent = G.score.toLocaleString(); $('ovWave').textContent = G.wave;
  $('ovKills').textContent = G.kills; $('ovFound').textContent = G.runFound.length; $('ovChain').textContent = 'x' + G.bestChain;
  $('ovWeapon').textContent = p.weapon.name; $('ovWeapon').style.color = WRAR[p.weapon.rarity].color;
  $('ovTime').textContent = fmtClock(G.time); $('ovAcc').textContent = G.rounds ? Math.min(100, Math.round((G.hits || 0) / G.rounds * 100)) + '%' : '—'; $('ovHeads').textContent = (G.heads || 0).toLocaleString();
  { const done = (G.onTime || 0) + (G.timeUps || 0); $('ovClock').textContent = done ? (G.onTime || 0) + ' of ' + done + ' waves' : '—'; }
  $('callsign').value = entry.tag; $('postBtn').disabled = false; $('postBtn').textContent = 'Post score';
  $('postStatus').textContent = LB.src === 'wix' ? (ACCT.status === 'in' ? 'Saved on this device and to your account. Post it to the global board.' : 'Saved on this device. Log in to your free DeclAIre account (main menu) to post it to the global board.') : LB.db ? 'Saved on this device. Post it to the global board.' : 'Saved on this device.';
  setTimeout(() => { if (G.mode === 'over') showOv('over'); }, 700);
}
// the DeclAIre admin: only this account can carry the admin name, and it is drawn in its own style everywhere. Anyone
// else who types it (or any spelling of "admin" or "declaire") gets turned down by the name filter.
const ADMIN_ID = '8624cdfc-c3a3-46ea-bda7-552be319ee08', ADMIN_TAG = 'ADMIN|DECLAIRE';
const isAdmin = acct => !!acct && acct === ADMIN_ID;
const myAcct = () => (typeof ACCT !== 'undefined' && ACCT.member && (ACCT.status === 'in' || ACCT.status === 'locked')) ? ACCT.member.id : null;
const meAdmin = () => isAdmin(myAcct());
function getTag() { const t = store.get('zc_tag', ''); return t === ADMIN_TAG && !meAdmin() ? 'SURVIVOR' : t || 'SURVIVOR'; }
// a callsign as the game shows it: capitals, digits and a few marks, 14 at most, and never anything the name filter catches.
// acct is the account the name belongs to, when it is known for sure (the admin name only shows for the admin's account)
const TAG_OK = new Map();
function cleanTag(s, acct) {
  s = String(s || '').toUpperCase();
  if (s === ADMIN_TAG) return isAdmin(acct) ? s : 'SURVIVOR';
  s = s.replace(/[^A-Z0-9 _.\-]/g, '').trim().slice(0, 14);
  if (!s) return 'SURVIVOR';
  let ok = TAG_OK.get(s); if (ok === undefined) { ok = ZCF.safe(s) === s; if (TAG_OK.size > 500) TAG_OK.clear(); TAG_OK.set(s, ok); }
  return ok ? s : 'SURVIVOR';
}
function refreshTitle() {
  if ($('bossCount')) $('bossCount').textContent = bossSeen.size + '/' + ZB.ROSTER.length;
  $('seasonName').textContent = SEASON_NAME; $('seasonLeft').textContent = seasonLeft();
  $('foundCount').textContent = typeof ZR_ONLY !== 'undefined' && ZR_ONLY && ZR.length ? ZR.filter(m => found.has(m.id)).length + '/' + ZR.length : found.size + '/1000';
  $('gunCount').textContent = ARMS_ON ? '10 rebuilt' : guns.size + '/250';
  const lw = WEAPONS[loadoutId()], ll = $('loadLine'); ll.textContent = ''; const lb = document.createElement('b'); lb.textContent = lw.name; lb.style.color = WRAR[lw.rarity].color;
  if (ARMS_ON) { const sb = document.createElement('b'); sb.textContent = armsSecondary().name; sb.style.color = WRAR[armsSecondary().rarity].color; ll.append('Carrying: ', lb, ' and ', sb); }
  else ll.append('Starting weapon: ', lb);
  const loc = store.get('zc_lb_' + SEASON, []);
  const bl = $('bestLine'); bl.textContent = '';
  if (loc.length) { bl.append('Your best this season: '); const b = document.createElement('b'); b.textContent = loc[0].score.toLocaleString() + ' (wave ' + loc[0].wave + ')'; bl.append(b); }
  updNameUi(); updDevUi();
}
$('playBtn').addEventListener('click', newRun);
$('againBtn').addEventListener('click', () => { if (NET.role === 'host') netHostRun(); else if (NET.role === 'client') return; else newRun(); });
$('resumeBtn').addEventListener('click', resumeGame);
$('quitBtn').addEventListener('click', toTitle);
$('menuBtn').addEventListener('click', toTitle);

/* ================= leaderboard ================= */
function saveLocal(e) { const k = 'zc_lb_' + SEASON, a = store.get(k, []); a.push(e); a.sort((x, y) => y.score - x.score); store.set(k, a.slice(0, 25)); }
const LB = { db: null, uid: null, rows: [], status: 'loading', ro: false, tab: 'global', dev: 'all', src: null, at: 0 };
// Two boards: inside Claude the page has its own shared board; everywhere else (the website, the Android app, the
// Windows launcher) it is the DeclAIre board, which anyone can read and players with an account post to.
(async function initDb() {
  try {
    if (window.claude && typeof window.claude.use === 'function') {
      const db = await window.claude.use('db');
      if (db) {
        const user = await window.claude.use('user');
        LB.src = 'claude'; LB.uid = user ? await user.id() : null;
        LB.db = db; LB.status = 'live';
        db.collection('scores').where('season', '==', SEASON).orderBy('score', 'desc').limit(50).onSnapshot(s => {
          LB.rows = s.docs.map(d => Object.assign({ id: d.id }, d.data())); renderLB(); if (G.mode === 'title') renderTitlePanel();
        }, () => { LB.status = 'error'; renderLB(); });
        renderLB(); adoptOnlineName(); return;
      }
    }
  } catch (e) { /* use the DeclAIre board */ }
  LB.src = 'wix'; setTimeout(() => lbRefresh(true), 0);   // after the whole game has loaded (the apps plug in their network first)
})();
// the DeclAIre board, fetched when someone looks at it (at most every 30 seconds)
async function lbRefresh(force) {
  if (LB.src !== 'wix' || (!force && Date.now() - LB.at < 30000)) return;
  LB.at = Date.now();
  if (LB.status !== 'live') { LB.status = 'loading'; renderLB(); }
  try { LB.rows = await AcctCore.board(SEASON, 50); LB.status = 'live'; }
  catch (e) { if (LB.status !== 'live') LB.status = 'error'; }
  LB.uid = ACCT.member ? ACCT.member.id : null;
  renderLB(); if (G.mode === 'title') renderTitlePanel();
}
async function postGlobal(entry) {
  if (LB.src === 'wix') {
    if (ACCT.status !== 'in') return 'needacct';
    try { const r = await AcctCore.postScore(SEASON, ACCT.member.id, Object.assign({}, entry, { tag: cleanTag(ACCT.member.username, ACCT.member.id) })); lbRefresh(true); return r; }
    catch (e) { if (e && (e.status === 0 || !e.status)) { acctQueueScore(entry); return 'queued'; } return 'failed'; }
  }
  if (!LB.db || !LB.uid) return 'local';
  if (LB.ro) return 'readonly';
  try {
    const ref = LB.db.collection('scores').doc(LB.uid), cur = await ref.get(), d = cur.exists ? cur.data() : null;
    if (d && d.season === SEASON && d.score >= entry.score) return 'kept';
    await ref.set({ season: SEASON, tag: entry.tag, score: entry.score, wave: entry.wave, kills: entry.kills, at: Date.now(), dev: entry.dev || DEV.kind, plat: entry.plat || PLATFORM });
    return 'posted';
  } catch (e) { if (e && e.code === 'invalid_argument') { LB.ro = true; return 'readonly'; } return 'failed'; }
}
$('postForm').addEventListener('submit', async e => {
  e.preventDefault();
  const entry = G.lastEntry; if (!entry) return;
  const raw = $('callsign').value, chk = ZCF.check(raw);
  if (!chk.ok) { $('postStatus').textContent = chk.msg; $('callsign').focus(); return; }
  const tag = cleanTag(raw); $('callsign').value = tag; store.set('zc_tag', tag); updNameUi(); acctRename(tag);
  entry.tag = tag;
  const k = 'zc_lb_' + SEASON, a = store.get(k, []), mine = a.find(x => x.at === entry.at); if (mine) { mine.tag = tag; store.set(k, a); }
  $('postBtn').disabled = true; $('postBtn').textContent = 'Posting';
  const res = await postGlobal(entry);
  const msg = {
    posted: 'Posted to the global board for ' + SEASON_NAME + '.',
    kept: 'Saved. Your best on the global board this season is higher, so it stays.',
    local: PLATFORM !== 'web' ? 'Saved on this device.' : 'Saved on this device. The global board is not available on this page.',
    needacct: 'Saved on this device. Log in to your free DeclAIre account (main menu) to post to the global board.',
    readonly: 'Saved on this device. You can view the global board but not post to it.',
    failed: 'Could not reach the global board. Your score is saved on this device.',
    queued: 'Saved. No connection right now: it goes up on the global board by itself as soon as the cloud can be reached.'
  }[res];
  $('postStatus').textContent = msg;
  $('postBtn').textContent = res === 'posted' || res === 'kept' ? 'Posted' : 'Saved';
});
function openLB() { $('lb').hidden = false; LB.tab = LB.status === 'live' || LB.src === 'wix' ? LB.tab : 'local'; renderLB(); lbRefresh(); }
function closeLB() { $('lb').hidden = true; }
$('lbBtn').addEventListener('click', openLB); $('overLbBtn').addEventListener('click', openLB); $('lbClose').addEventListener('click', closeLB);
$('tabGlobal').addEventListener('click', () => { LB.tab = 'global'; renderLB(); });
$('tabLocal').addEventListener('click', () => { LB.tab = 'local'; renderLB(); });
document.querySelectorAll('#lbFilter button').forEach(b => b.addEventListener('click', () => { LB.dev = b.dataset.d; SFX.click(); renderLB(); }));
function renderLB() {
  if ($('lb').hidden) return;
  $('lbSeason').textContent = SEASON_NAME;
  $('lbReset').textContent = 'Every board wipes to zero on the 1st of each month (UTC). This season resets in ' + seasonLeft() + '.';
  $('tabGlobal').classList.toggle('on', LB.tab === 'global'); $('tabLocal').classList.toggle('on', LB.tab === 'local');
  $('tabGlobal').setAttribute('aria-selected', LB.tab === 'global'); $('tabLocal').setAttribute('aria-selected', LB.tab === 'local');
  const list = $('lbList'); list.textContent = '';
  let rows, note = '';
  if (LB.tab === 'global') {
    if (LB.status === 'live') { rows = LB.rows; note = 'One entry per player: your best run this season.' + (LB.src === 'wix' && ACCT.status !== 'in' ? ' Log in to your free DeclAIre account to post yours.' : ''); }
    else { rows = []; note = LB.status === 'loading' ? 'Connecting to the global board.' : LB.src === 'wix' ? 'Could not reach the global board. Check your internet connection. Your runs are on the This device tab.' : 'The global board is not available on this page. Your runs are on the This device tab.'; }
  } else { rows = store.get('zc_lb_' + SEASON, []); note = 'Runs played in this browser this season.'; }
  if (!rows.length || (LB.dev !== 'all' && !rows.some(r => r.dev === LB.dev))) {
    const li = document.createElement('li'); li.className = 'empty';
    li.textContent = LB.tab === 'global' && LB.status !== 'live' ? (LB.status === 'loading' ? 'Loading the board.' : 'No connection to the global board.') : LB.dev !== 'all' && rows.length ? 'No ' + DEV_SHORT[LB.dev].toLowerCase() + ' scores yet this season.' : 'No scores yet this season. Be the first.';
    list.appendChild(li);
  }
  if (LB.dev !== 'all') rows = rows.filter(r => r.dev === LB.dev);
  document.querySelectorAll('#lbFilter button').forEach(b => { const on = b.dataset.d === LB.dev; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  rows.slice(0, 50).forEach((r, i) => {
    const li = document.createElement('li'); li.className = 'lb-row' + (i < 3 ? ' top' : '') + (LB.tab === 'global' && r.id === LB.uid ? ' me' : '');
    const c1 = document.createElement('span'); c1.className = 'rk'; c1.textContent = '#' + (i + 1);
    const c2 = document.createElement('span'); c2.className = 'tg'; c2.append(nameEl(cleanTag(r.tag, r.id), r.id)); if (LB.tab === 'global' && r.id === LB.uid) c2.append(document.createTextNode(' (you)'));
    const c3 = document.createElement('span'); c3.className = 'sc'; c3.textContent = Number(r.score || 0).toLocaleString();
    const c4 = document.createElement('span'); c4.className = 'wv'; c4.textContent = 'W' + (r.wave || 0);
    const c5 = document.createElement('span'); c5.className = 'dv'; if (r.dev) { c5.append(devIcon(r.dev)); c5.title = DEV_SHORT[r.dev] || ''; }
    li.append(c1, c2, c3, c4, c5); list.appendChild(li);
  });
  $('lbNote').textContent = note;
}

/* ================= specimen log ================= */
let cxStrain = 0, cxSpoil = false, cxSeries = 0;
document.querySelectorAll('#cxSeries .tab').forEach(b => b.addEventListener('click', () => { cxSeries = +b.dataset.s; cxStrain = cxSeries * 20; renderCodex(); }));
const STAT_MAX = { hp: Math.max(...MUTS.map(m => m.hp)), spd: Math.max(...MUTS.map(m => m.spd)), dmg: Math.max(...MUTS.map(m => m.dmg)), size: Math.max(...MUTS.map(m => m.size)) };
function openCodex() { $('codex').hidden = false; $('codex').scrollTop = 0; renderCodex(); }
function closeCodex() { closeDetail(); $('codex').hidden = true; refreshTitle(); }
$('codexBtn').addEventListener('click', openCodex); $('overCodexBtn').addEventListener('click', openCodex); $('pauseCodexBtn').addEventListener('click', openCodex);
$('cxClose').addEventListener('click', closeCodex);
$('cxSpoil').addEventListener('change', e => { cxSpoil = e.target.checked; renderCodex(); });
function thumb(canvas, m, size, sil, rBase) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr);
  const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, size, size);
  g.translate(size / 2, size / 2 + size * 0.04); g.rotate(-Math.PI / 2);
  Z.drawMutation(g, m, rBase * clamp(m.size, 0.8, 1.35), { sil: sil });
}
function renderCodex() {
  if (typeof ZR_ONLY !== 'undefined' && ZR_ONLY && ZR.length) { renderCodex2(); return; }
  $('cxSeries').hidden = false; $('cxStrains').hidden = false; $('cxStrainNote').hidden = false; $('cxV2Note').hidden = true;
  $('cxCount').textContent = found.size + ' / 1000';
  const rs = $('cxRarity'); rs.textContent = '';
  RARITY.forEach((r, i) => {
    const tot = MUTS.filter(m => m.rarity === i).length, have = MUTS.filter(m => m.rarity === i && found.has(m.id)).length;
    const s = document.createElement('span'); s.style.setProperty('--rc', r.color); s.textContent = r.name + ' ' + have + '/' + tot; rs.appendChild(s);
  });
  document.querySelectorAll('#cxSeries .tab').forEach(b => {
    const sr = +b.dataset.s, on = sr === cxSeries; let n = 0;
    for (let id = sr * 500; id < sr * 500 + 500; id++) if (found.has(id)) n++;
    b.classList.toggle('on', on); b.setAttribute('aria-selected', on);
    b.querySelector('em').textContent = n + '/500';
  });
  const chips = $('cxStrains'); chips.textContent = '';
  STRAINS.forEach((S, i) => {
    if (i < cxSeries * 20 || i >= cxSeries * 20 + 20) return;
    let n = 0; for (let a = 0; a < 25; a++) if (found.has(i * 25 + a)) n++;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (i === cxStrain ? ' on' : ''); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', i === cxStrain);
    const s1 = document.createElement('span'); s1.textContent = S.name; const s2 = document.createElement('em'); s2.textContent = n + '/25';
    b.append(s1, s2); b.addEventListener('click', () => { cxStrain = i; renderCodex(); });
    chips.appendChild(b);
  });
  const on = chips.children[cxStrain - cxSeries * 20]; if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const S = STRAINS[cxStrain], note = $('cxStrainNote'); note.textContent = '';
  const nb = document.createElement('b'); nb.textContent = S.name + ' strain. '; note.append(nb, S.trait);
  const gridEl = $('cxGrid'); gridEl.textContent = '';
  for (let a = 0; a < 25; a++) {
    const m = MUTS[cxStrain * 25 + a], known = found.has(m.id), show = known || cxSpoil, r = RARITY[m.rarity];
    const b = document.createElement('button'); b.type = 'button'; b.className = 'card ' + (known ? 'known' : 'unknown'); b.style.setProperty('--rc', r.color);
    const c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true');
    const n1 = document.createElement('span'); n1.className = 'num'; n1.textContent = '#' + pad3(m.num);
    const n2 = document.createElement('span'); n2.className = 'nm'; n2.textContent = show ? m.name : 'Unidentified';
    const n3 = document.createElement('span'); n3.className = 'rar'; n3.textContent = show ? r.name : 'Wave ' + m.wave + '+';
    if (!show) n3.style.setProperty('--rc', '#8f959e');
    b.append(c, n1, n2, n3);
    b.addEventListener('click', () => openDetail(m));
    gridEl.appendChild(b);
    thumb(c, m, 88, !show, 19);
  }
}
function openDetail(m) {
  if (m.v2) { openDetail2(m); return; }
  $('dtArt').classList.remove('v2'); $('cxDetail').querySelector('.detail-in').classList.remove('v2'); $('dtAnims').hidden = true; $('dtBal').hidden = true;
  const known = found.has(m.id), show = known || cxSpoil, r = RARITY[m.rarity], el = $('cxDetail');
  el.style.setProperty('--rc', show ? r.color : '#8f959e');
  thumb($('dtArt'), m, 180, !show, 38);
  $('dtTag').textContent = '#' + pad3(m.num) + ' · ' + (show ? r.name + ' · Threat ' + m.threat + '/10' : 'Unidentified');
  $('dtName').textContent = show ? m.name : 'Unidentified specimen';
  const st = $('dtStrain'), ab = $('dtAbility'); st.textContent = ''; ab.textContent = '';
  if (show) {
    const b1 = document.createElement('b'); b1.textContent = m.S.name + ' strain: '; st.append(b1, m.S.trait);
    const b2 = document.createElement('b'); b2.textContent = m.A.name + ' mutation: '; ab.append(b2, m.A.desc);
  } else {
    const b1 = document.createElement('b'); b1.textContent = m.S.name + ' strain: '; st.append(b1, m.S.trait);
    ab.textContent = 'Its mutation is unknown. Kill one to log it.';
  }
  const bars = $('dtBars'); bars.textContent = '';
  const rows = [['Durability', m.hp / STAT_MAX.hp, Math.round(30 * m.hp) + ' HP'], ['Speed', m.spd / STAT_MAX.spd, Math.round(68 * m.spd) + ''], ['Damage', m.dmg / STAT_MAX.dmg, (9 * m.dmg).toFixed(1)], ['Size', m.size / STAT_MAX.size, m.size.toFixed(2) + 'x']];
  rows.forEach(rw => {
    const row = document.createElement('div'); row.className = 'bar-row';
    const l = document.createElement('span'); l.textContent = rw[0];
    const t = document.createElement('div'); t.className = 'track'; const f = document.createElement('i'); f.style.width = show ? Math.round(rw[1] * 100) + '%' : '0%'; t.appendChild(f);
    const v = document.createElement('em'); v.textContent = show ? rw[2] : '?';
    row.append(l, t, v); bars.appendChild(row);
  });
  $('dtWave').textContent = 'Can appear from wave ' + m.wave + '. Stats shown at wave 1; zombies get tougher every wave.';
  el.hidden = false; el.scrollTop = 0;
}
function closeDetail() { $('cxDetail').hidden = true; if (typeof animaPreviewStop === 'function') animaPreviewStop(); }
/* ---- the 2.0 roster in the log: the first 50 rebuilt zombies, each with its 50 animations to watch ---- */
// a 2.0 zombie standing (facing up the card), drawn by the look engine; a dark shape if it is not identified yet
function thumb2(canvas, m, size, sil) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr);
  const g = canvas.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
  const P = new Float32Array(AN); animaEval(P, m, AC.idle, 0, 1.2);
  const r = size * dpr / 7.2 * Math.pow(clamp(m.size, 0.8, 1.45), 0.4);
  g.setTransform(0, -r, r, 0, canvas.width / 2, canvas.height * 0.56); g.lineCap = 'round'; g.lineJoin = 'round';
  lookDraw(g, m, P, { lod: 0, t: 1.2, light: { x: -0.4, y: -0.7, c: '255,240,215', k: 0.5, rim: 0.4 }, glow: 1, preview: 1, noShadow: sil });
  if (sil) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#06080b'; g.fillRect(0, 0, canvas.width, canvas.height); g.globalCompositeOperation = 'source-over'; }
}
function renderCodex2() {
  const have = ZR.filter(m => found.has(m.id)).length;
  $('cxCount').textContent = have + ' / ' + ZR.length;
  $('cxSeries').hidden = true; $('cxStrains').hidden = true; $('cxStrainNote').hidden = true;
  const note = $('cxV2Note'); note.hidden = false;
  note.textContent = 'Zombie City 2.0: the first ' + ZR.length + ' of the 1,000 zombies, rebuilt from the ground up, each with its own look, behaviour and 60 animations. The old mutations and the bosses are switched off until the rest are rebuilt.';
  const rs = $('cxRarity'); rs.textContent = '';
  RARITY.forEach((r, i) => {
    const tot = ZR.filter(m => m.rarity === i).length; if (!tot) return; const h = ZR.filter(m => m.rarity === i && found.has(m.id)).length;
    const s = document.createElement('span'); s.style.setProperty('--rc', r.color); s.textContent = r.name + ' ' + h + '/' + tot; rs.appendChild(s);
  });
  const gridEl = $('cxGrid'); gridEl.textContent = '';
  for (const m of ZR) {
    const known = found.has(m.id), show = known || cxSpoil, r = RARITY[m.rarity];
    const b = document.createElement('button'); b.type = 'button'; b.className = 'card ' + (known ? 'known' : 'unknown'); b.style.setProperty('--rc', r.color);
    const c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true');
    const n1 = document.createElement('span'); n1.className = 'num'; n1.textContent = '#' + pad3(m.num);
    const n2 = document.createElement('span'); n2.className = 'nm'; n2.textContent = show ? m.name : 'Unidentified';
    const n3 = document.createElement('span'); n3.className = 'rar'; n3.textContent = show ? r.name + ' · T' + m.threat : 'Wave ' + m.wave + '+';
    if (!show) n3.style.setProperty('--rc', '#8f959e');
    b.append(c, n1, n2, n3); b.addEventListener('click', () => openDetail(m)); gridEl.appendChild(b);
    thumb2(c, m, 88, !show);
  }
}
// how bullets treat it, in words
function balWords(m) {
  const T = m.T || {}, d = m.def, a = [];
  if (T.shield) a.push('a shield stops what comes at its front (flank it, or use a rifle round heavy enough)');
  if (T.helmet) a.push('its helmet turns ' + Math.round(T.helmet * 100) + '% of light head shots');
  if (T.armor) a.push((d.feat.indexOf('plates') >= 0 || d.top === 'riot' || d.top === 'space' ? 'plates stop rifle rounds' : 'a vest stops pistol rounds') + ' to the chest ' + Math.round(T.armor * 100) + '% of the time');
  if (T.tough) a.push('shrugs off ' + Math.round(T.tough * 100) + '% of body shots that would kill another');
  if (T.low) a.push(T.low >= 1 ? 'low to the ground: no legs to hit, and its head is exposed' : 'runs low: fewer leg hits');
  if (T.brittle) a.push('brittle: limbs come off at a touch');
  return a.length ? a.join('; ') + '.' : 'No protection: a body shot kills it most of the time, a head shot almost always.';
}
function openDetail2(m) {
  const known = found.has(m.id), show = known || cxSpoil, r = RARITY[m.rarity], el = $('cxDetail');
  el.style.setProperty('--rc', show ? r.color : '#8f959e');
  const art = $('dtArt'); art.classList.add('v2'); el.querySelector('.detail-in').classList.add('v2');
  const dpr = Math.min(window.devicePixelRatio || 1, 2); art.width = Math.round(260 * dpr); art.height = Math.round(260 * dpr);
  $('dtTag').textContent = '#' + pad3(m.num) + ' · ' + (show ? r.name + ' · Threat ' + m.threat + '/10' : 'Unidentified');
  $('dtName').textContent = show ? m.name : 'Unidentified specimen';
  const st = $('dtStrain'), ab = $('dtAbility'); st.textContent = ''; ab.textContent = '';
  const b1 = document.createElement('b'); b1.textContent = show ? m.name + ': ' : 'Unknown: '; st.append(b1, show ? m.def.line : 'Kill one to log it.');
  if (show) { const b2 = document.createElement('b'); b2.textContent = (m.def.ab === 'none' ? 'Behaviour' : m.A.name) + ': '; ab.append(b2, m.A.desc || 'It just keeps coming.'); }
  const bars = $('dtBars'); bars.textContent = '';
  const mx = { hp: Math.max(...ZR.map(q => q.hp)), spd: Math.max(...ZR.map(q => q.spd)), dmg: Math.max(...ZR.map(q => q.dmg)), size: Math.max(...ZR.map(q => q.size)) };
  [['Durability', m.hp / mx.hp, Math.round(30 * m.hp) + ' HP'], ['Speed', m.spd / mx.spd, Math.round(68 * m.spd) + ''], ['Damage', m.dmg / mx.dmg, (9 * m.dmg).toFixed(1)], ['Size', m.size / mx.size, m.size.toFixed(2) + 'x']].forEach(rw => {
    const row = document.createElement('div'); row.className = 'bar-row';
    const l = document.createElement('span'); l.textContent = rw[0];
    const t = document.createElement('div'); t.className = 'track'; const f = document.createElement('i'); f.style.width = show ? Math.round(rw[1] * 100) + '%' : '0%'; t.appendChild(f);
    const v = document.createElement('em'); v.textContent = show ? rw[2] : '?'; row.append(l, t, v); bars.appendChild(row);
  });
  const bal = $('dtBal'); bal.textContent = ''; bal.hidden = !show;
  if (show) { const b3 = document.createElement('b'); b3.textContent = 'Taking a bullet: '; bal.append(b3, balWords(m)); }
  // its 60 animations: pick any to watch it (identified zombies only)
  const box = $('dtAnims'); box.textContent = ''; box.hidden = !show;
  if (show) {
    const top = document.createElement('div'); top.className = 'an-top'; const lab = document.createElement('span'); top.append(lab);
    const autoB = document.createElement('button'); autoB.type = 'button'; autoB.textContent = 'Play all'; top.append(autoB); box.append(top);
    const btns = []; let cur = 0, autoT = 0;
    const pick = ci => { cur = ci; btns.forEach((b, i) => b.classList.toggle('on', i === ci)); lab.textContent = (ci + 1) + ' / ' + AC_N + ' · ' + AC_GROUP[ci] + ': ' + m.anames[ci]; animaPreview(art, m, ci); };
    const groups = {};
    for (let ci = 0; ci < AC_N; ci++) {
      const gname = AC_GROUP[ci]; let G2 = groups[gname];
      if (!G2) { G2 = groups[gname] = document.createElement('div'); G2.className = 'ag'; const t = document.createElement('b'); t.textContent = gname; const row = document.createElement('div'); row.className = 'ab'; G2.append(t, row); box.append(G2); }
      const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = m.anames[ci]; bt.addEventListener('click', () => { clearInterval(autoT); autoT = 0; autoB.classList.remove('on'); pick(ci); });
      G2.querySelector('.ab').append(bt); btns.push(bt);
    }
    autoB.addEventListener('click', () => { if (autoT) { clearInterval(autoT); autoT = 0; autoB.classList.remove('on'); return; } autoB.classList.add('on'); pick(0); autoT = setInterval(() => { if ($('cxDetail').hidden) { clearInterval(autoT); autoT = 0; return; } pick((cur + 1) % AC_N); }, 2600); });
    pick(0);
  } else { animaPreviewStop(); thumb2(art, m, 260, true); }
  $('dtWave').textContent = 'Can appear from wave ' + m.wave + '. Stats shown at wave 1; zombies get tougher every wave.';
  el.hidden = false; el.scrollTop = 0;
}
$('dtClose').addEventListener('click', closeDetail);

/* ================= attract mode (title screen) ================= */
function initAttract() {
  startWorld(true); wxReset();
  Object.assign(G, { zs: [], bullets: [], eshots: [], haz: [], picks: [], parts: [], rings: [], texts: [], bolts: [], splats: [], wave: 1, boss: null });
  cam.x = WORLD.start.x; cam.y = WORLD.start.y;
  worldReset();
  for (let i = 0; i < 18; i++) spawnAttract(true);
}
function spawnAttract(anywhere) {
  const L = typeof ZR !== 'undefined' && ZR_ONLY && ZR.length ? ZR : MUTS, m = L[Math.floor(Math.random() * L.length)], hw = W / ZOOM / 2, hh = H / ZOOM / 2;
  for (let t = 0; t < 10; t++) {
    const x = anywhere ? cam.x + rand(-hw, hw) : cam.x + hw + rand(40, 160), y = cam.y + rand(-hh, hh);
    if (!blocked(x, y, 24)) { const z = spawnZombie(m, x, y); z.wx = x; z.wy = y; return true; }
  }
  return false;
}
function updAttract(dt) {
  cam.x += 26 * dt; cam.y += 8 * dt; gcamTick(dt, null);
  const hw = W / ZOOM / 2, hh = H / ZOOM / 2;
  for (const z of G.zs) {
    z.flash = Math.max(0, z.flash - dt);
    if (Math.hypot(z.wx - z.x, z.wy - z.y) < 16 || Math.random() < dt * 0.15) { z.wx = z.x + rand(-160, 160); z.wy = z.y + rand(-160, 160); }
    const dx = z.wx - z.x, dy = z.wy - z.y, d = Math.hypot(dx, dy) || 1, s = z.speed * 0.5;
    z.x += dx / d * s * dt; z.y += dy / d * s * dt; collide(z, z.r * 0.9);
    z.ang = angLerp(z.ang, Math.atan2(dy, dx), Math.min(1, dt * 4));
    if (z.x < cam.x - hw - 120) z.dead = true;
  }
  G.zs = G.zs.filter(z => !z.dead);
  // a few tries a frame, never a loop: at real-world scale one building can fill the whole strip past the edge of the screen
  for (let k = 0; k < 4 && G.zs.length < 18; k++) if (!spawnAttract(false)) break;
  updFx(dt);
}

/* ================= render ================= */
const LODQ = [];
function render() {
  const SH = gcamShake(LODQ.sh || (LODQ.sh = [0, 0])), shx = SH[0], shy = SH[1];   // (smooth, layered: no random jitter)
  const zm = gcamZoom(), s = DPR * zm, kcx = cam.x + GCAM.kx, kcy = cam.y + GCAM.ky;
  ctx.setTransform(s, 0, 0, s, DPR * (W / 2 + shx) - kcx * s, DPR * (H / 2 + shy) - kcy * s);
  const hw = W / 2 / zm, hh = H / 2 / zm, x0 = cam.x - hw, y0 = cam.y - hh, x1 = cam.x + hw, y1 = cam.y + hh, pad = 24 + G.shake;
  coreFrame(x0, y0, x1, y1, G.rdt || 0.016);   // the shared frame every engine reads from
  // the city tiles cover every pixel, so the frame is never cleared first (one less full-screen fill per frame)
  let rebuild = 1; WORLD.rf = 0; const twb = performance.now();
  for (let cx = Math.floor((x0 - pad) / CHS); cx <= Math.floor((x1 + pad) / CHS); cx++) for (let cy = Math.floor((y0 - pad) / CHS); cy <= Math.floor((y1 + pad) / CHS); cy++) {
    const c = getChunk(cx, cy);
    if (!c.can || ((c.sc !== Q.chunkScale || c.stale) && rebuild-- > 0)) { renderChunk(c); c.stale = 0; }
    c.seen = frameNo;
    ctx.drawImage(c.can, c.sx, c.sy, CHS + 0.6, CHS + 0.6);
  }
  if (!WORLD.rf) streamChunks(x0, y0, x1, y1);
  coreCost('WORLD', performance.now() - twb - (WORLD.rfMs || 0)); WORLD.rfMs = 0;
  const vis = (x, y, r) => x > x0 - r && x < x1 + r && y > y0 - r && y < y1 + r;
  let tw = performance.now();
  drawWeatherGround(x0 - pad, y0 - pad, x1 + pad, y1 + pad);
  PERF.sec.wx += performance.now() - tw;
  const vz = vzNow; if (vz) drawVizGround(vz, x0, y0, x1, y1);
  // floor stains
  // the blood engine draws the stains; if it is down the game covers for it with plain ones
  if (typeof goreDraw === 'function' && goreOk()) goreDraw(vis);
  else for (const p of G.splats) {
    if (!p.c || !vis(p.x, p.y, p.r * 2)) continue;
    ctx.globalAlpha = 0.42; ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * p.sq, p.rot, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (typeof muzzleWorld === 'function') muzzleWorld(vis, 'brass');
  if (typeof physDraw === 'function') physDraw(vis);
  drawHoles(vis);
  if (SWDYN.size && typeof swarmVehDraw === 'function') swarmVehDraw(vis);   // vehicles the crowd has moved
  let tl = performance.now(); drawWorldUnder(vis); PERF.sec.life += performance.now() - tl;
  drawWindDebris(vis);
  drawAtmosGround(vis);
  drawHazards(vis);
  drawDashZones(vis);
  drawBlasts();
  for (const k of G.picks) {
    if (!vis(k.x, k.y, 20)) continue;
    if (k.life < 3 && Math.floor(G.time * 8) % 2) continue;
    const pulse = 1 + Math.sin(G.time * 6) * 0.08;
    ctx.save(); ctx.translate(k.x, k.y); ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; rrect(ctx, -9, -7, 20, 18, 3); ctx.fill();
    ctx.fillStyle = '#e8e2d4'; rrect(ctx, -10, -10, 20, 18, 3); ctx.fill();
    ctx.fillStyle = '#c4262c'; ctx.fillRect(-2.5, -7, 5, 12); ctx.fillRect(-6, -3.5, 12, 5);
    ctx.restore();
  }
  // the dead, where they fell (under the living)
  if (typeof animaFrame === 'function') { animaFrame(G.rdt || 0.016); animaDrawCorpses(vis); }
  // zombie telegraphs under bodies
  const lowFx = Q.lod >= 2;
  for (const z of G.zs) {
    if (z.dead || !vis(z.x, z.y, 300)) continue;
    if (z.st.wind > 0) { ctx.strokeStyle = 'rgba(255,70,60,' + (0.25 + (0.65 - z.st.wind) * 0.8) + ')'; ctx.lineWidth = z.r * 1.2; ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(z.x + z.st.cx * 300, z.y + z.st.cy * 300); ctx.stroke(); }
    if (z.snatch) drawSnatchZone(z);
    if (z.rb) drawBossTele(z);
    // in a big crowd only the nearest two dozen show their danger auras (dozens of rings on top of each other say nothing)
    if (z.swRkF >= frameNo - 1 && z.swRk > 24 && G.zs.length > 80) continue;
    // danger auras: on Low the faint fill is skipped and only the outline is drawn
    if (z.m.S.p.rad && !z.st.under && !z.st.down) { ctx.fillStyle = 'rgba(200,255,60,0.06)'; ctx.beginPath(); ctx.arc(z.x, z.y, 90, 0, TAU); if (!lowFx) ctx.fill(); ctx.strokeStyle = 'rgba(200,255,60,' + (lowFx ? 0.32 : 0.2) + ')'; ctx.lineWidth = 1.5; ctx.stroke(); }
    if (z.abs.indexOf('chiller') >= 0 && !z.st.under) { ctx.fillStyle = 'rgba(170,220,255,0.07)'; ctx.beginPath(); ctx.arc(z.x, z.y, 150, 0, TAU); if (!lowFx) ctx.fill(); ctx.strokeStyle = 'rgba(190,230,255,' + (lowFx ? 0.34 : 0.22) + ')'; ctx.lineWidth = 1.5; ctx.stroke(); }
    if (z.abs.indexOf('magnet') >= 0 && G.p && Math.hypot(G.p.x - z.x, G.p.y - z.y) < 290) { ctx.strokeStyle = 'rgba(200,80,80,0.25)'; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -G.time * 40; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(G.p.x, G.p.y); ctx.stroke(); ctx.setLineDash([]); }
  }
  if (vz) drawVizMobs(vz, vis);
  // level of detail: zombies far from you, or part of a big crowd, skip their cosmetic overlays (the crowd engine draws
  // them; this is the plain way, if it is resting)
  let swd = false; if (typeof swarmDraw === 'function' && swarmUp()) { try { swarmDraw(vis, hw, hh); swd = true; } catch (e) { ctx.setTransform(s, 0, 0, s, DPR * (W / 2 + shx) - cam.x * s, DPR * (H / 2 + shy) - cam.y * s); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; swarmHurt(e, 'draw'); } }
  let nv = 0; if (!swd) for (const z of G.zs) if (!z.dead && !z.boss && vis(z.x, z.y, z.r * 2.6)) LODQ[nv++] = z;
  const fx = G.p && G.mode !== 'title' ? G.p.x : cam.x, fy = G.p && G.mode !== 'title' ? G.p.y : cam.y;
  const nr = Math.min(hw, hh) * 0.95, nr2 = nr * nr, crowd = nv > 70 ? 1 : 0, ln = PERF.lodN; if (!swd) ln[0] = ln[1] = ln[2] = ln[3] = 0;
  for (let i = 0; i < nv; i++) {
    const z = LODQ[i], dx = z.x - fx, dy = z.y - fy, far = dx * dx + dy * dy > nr2, lod = Math.min(3, Q.lod + (far ? 1 + crowd : 0));
    ln[lod]++; drawZ(z, lod, far);
  }
  LODQ.length = Math.min(LODQ.length, 256);
  for (const z of G.zs) if (!z.dead && z.boss) drawZ(z);
  if (G.p && G.mode !== 'title') { drawDashActors(G.p); if (!G.p.down) drawPlayer(G.p); if (NET.started) netDrawPlayers(); }
  if (typeof muzzleWorld === 'function') muzzleWorld(vis, 'smoke');
  // bullets: the bullet engine draws every round; if it is down the game draws plain tracers
  if (typeof tracerDraw === 'function' && tracerOn()) tracerDraw(vis);
  else {
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    for (const b of G.bullets) {
      if (b.kind !== 'flame') continue;
      const f = clamp(1 - b.life / b.max, 0, 1); ctx.globalAlpha = 0.7 * (1 - f);
      ctx.fillStyle = f < 0.3 ? '#ffe9a0' : f < 0.6 ? '#ff9a3a' : '#c2401a';
      ctx.beginPath(); ctx.arc(b.x, b.y, 4 + f * 13, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    for (const b of G.bullets) {
      if (b.kind === 'flame') continue;
      if (b.kind === 'grenade') {
        ctx.fillStyle = '#2a2d22'; ctx.beginPath(); ctx.arc(b.x, b.y, 5.5, 0, TAU); ctx.fill();
        ctx.fillStyle = Math.floor(G.time * 14) % 2 ? '#ff4a3a' : b.col; ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, TAU); ctx.fill(); continue;
      }
      // the tracer never reaches back past where the bullet left the muzzle
      const tl = Math.min(b.heavy ? 0.034 : b.shard ? 0.012 : 0.022, b.age || 0);
      ctx.strokeStyle = b.crit ? '#ffffff' : b.col; ctx.lineWidth = b.heavy ? 3.4 : b.shard ? 1.6 : b.crit ? 3 : 2.4;
      ctx.beginPath(); ctx.moveTo(b.x - b.vx * tl, b.y - b.vy * tl); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  if (vz) drawVizBullets(vz);
  for (const e of G.eshots) {
    if (e.k === 'acid') { ctx.fillStyle = 'rgba(165,212,58,0.35)'; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 1.8, 0, TAU); ctx.fill(); ctx.fillStyle = '#b8ec4a'; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.fill(); }
    else if (e.k === 'wrench') { ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(G.time * 14 + e.x * 0.01); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-7, -1, 14, 4); ctx.fillStyle = '#9aa0a6'; ctx.fillRect(-7, -1.6, 12, 3.2); ctx.beginPath(); ctx.arc(6, 0, 3.6, 0.8, TAU - 0.8); ctx.fill(); ctx.restore(); }
    else if (e.k === 'spike') { const a = Math.atan2(e.vy, e.vx); ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(a); ctx.fillStyle = '#d9cfb4'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -3.5); ctx.lineTo(-6, 3.5); ctx.closePath(); ctx.fill(); ctx.restore(); }
    else if (e.k === 'shard') { ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(Math.atan2(e.vy, e.vx)); ctx.fillStyle = '#e8eef5'; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(0, -3.5); ctx.lineTo(-7, 0); ctx.lineTo(0, 3.5); ctx.closePath(); ctx.fill(); ctx.restore(); }
    else if (e.k === 'wisp') { ctx.fillStyle = 'rgba(255,150,50,0.3)'; ctx.beginPath(); ctx.arc(e.x, e.y, 14, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffd38a'; ctx.beginPath(); ctx.arc(e.x, e.y, 6, 0, TAU); ctx.fill(); }
    else if (e.k === 'web') { ctx.strokeStyle = 'rgba(242,239,230,0.85)'; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4 + G.time * 3; ctx.beginPath(); ctx.moveTo(e.x - Math.cos(a) * 9, e.y - Math.sin(a) * 9); ctx.lineTo(e.x + Math.cos(a) * 9, e.y + Math.sin(a) * 9); ctx.stroke(); } ctx.beginPath(); ctx.arc(e.x, e.y, 5, 0, TAU); ctx.stroke(); }
    else if (SHOT_COL[e.k] && e.k !== 'bolt') { const col = SHOT_COL[e.k]; ctx.fillStyle = hexA(col, 0.3); ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 1.9, 0, TAU); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.fill(); }
    else { ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.x - e.vx * 0.03, e.y - e.vy * 0.03); ctx.lineTo(e.x, e.y); ctx.stroke(); }
  }
  // particles
  for (const q of G.parts) { ctx.globalAlpha = clamp(q.life / q.max, 0, 1); ctx.fillStyle = q.c; ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); }
  ctx.globalAlpha = 1;
  for (const r of G.rings) { const t = r.t / r.life; ctx.strokeStyle = 'rgba(' + r.c + ',' + (1 - t) * 0.8 + ')'; ctx.lineWidth = r.w; ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(0.5, r.r0 + (r.r1 - r.r0) * t), 0, TAU); ctx.stroke(); }
  if (typeof bladeDraw === 'function') bladeDraw(ctx);   // (the knife's cuts in the air)
  tl = performance.now(); drawWorldOver(vis); PERF.sec.life += performance.now() - tl;
  drawSmoke(vis);
  drawJets();
  drawCloudShadows(x0, y0, x1, y1);
  luxRun(x0, y0, x1, y1, shx, shy, Math.min(0.05, G.rdt || 0.016));
  drawEmissive(vis);
  mirrorRun(x0, y0, x1, y1);   // reflections (on the GPU the shader engine draws them from the map made here)
  try { skyDraw(x0, y0, x1, y1, Math.min(0.05, G.rdt || 0.016)); } catch (e) { coreHurt('SKYWAY', e); }   // the highways, over the street
  drawWeatherWorld();
  drawAtmosLit(vis);
  for (const b of G.bolts) { ctx.strokeStyle = b.c; ctx.globalAlpha = clamp(b.life / 0.18, 0, 1); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(b.pts[0], b.pts[1]); for (let i = 2; i < b.pts.length; i += 2) ctx.lineTo(b.pts[i], b.pts[i + 1]); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (SET.ftext) for (const t of G.texts) { ctx.globalAlpha = clamp(1 - t.t / t.life, 0, 1); ctx.font = (t.big ? '22px' : '13px') + " 'Share Tech Mono', monospace"; ctx.fillStyle = '#000'; ctx.fillText(t.s, t.x + 1, t.y + 1); ctx.fillStyle = t.c; ctx.fillText(t.s, t.x, t.y); }
  ctx.globalAlpha = 1;
  // screen space
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (SET.grade && !PRISM.vigGpu) ctx.drawImage(screenGrad('vig', 0.32, 0.62, '4,5,8', 0.74), 0, 0, W, H);   // (the shader engine draws its own on the GPU)
  if (vz) drawVizScreen(vz);
  tw = performance.now(); drawWeatherScreen(Math.min(0.05, (performance.now() - (render.lt || performance.now())) / 1000)); render.lt = performance.now(); PERF.sec.wx += performance.now() - tw;
  if (G.mode === 'play' || G.mode === 'pause' || G.mode === 'upgrade' || G.mode === 'over' || G.mode === 'skull' || G.mode === 'cine') {
    drawScreenFx(); drawDashScreen(); drawAim(); if (NET.started) netDrawPointers();
    if (G.flashA > 0) { ctx.globalAlpha = Math.min(0.5, G.flashA); ctx.drawImage(screenGrad('a10', 0.1, 0.8, '255,214,150', 1), 0, 0, W, H); ctx.globalAlpha = 1; }
  }
  prismFrame();   // the shader engine finishes the frame (GPU or CPU)
}
// after the lighting has darkened the night: what makes its own light is drawn again on top, so tracers, flames,
// sparks and glowing shots stay bright in the dark
function drawEmissive(vis) {
  if (!LUX.live) return;
  const a = 1 - (LUX.amb[0] + LUX.amb[1] + LUX.amb[2]) / 3; if (a < 0.08) return;
  if (typeof garageEmissive === 'function') garageEmissive(vis, a);
  if (typeof muzzleEmissive === 'function') muzzleEmissive(a);
  if (typeof goreEmissive === 'function') goreEmissive(a);
  if (typeof auraEmissive === 'function') auraEmissive(a);
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  if (!(typeof tracerEmissive === 'function' && tracerEmissive(a))) for (const b of G.bullets) {
    if (!vis(b.x, b.y, 30)) continue;
    if (b.kind === 'flame') { const f = clamp(1 - b.life / b.max, 0, 1); ctx.globalAlpha = 0.55 * (1 - f) * a; ctx.fillStyle = f < 0.3 ? '#ffe9a0' : f < 0.6 ? '#ff9a3a' : '#c2401a'; ctx.beginPath(); ctx.arc(b.x, b.y, 4 + f * 13, 0, TAU); ctx.fill(); continue; }
    if (b.kind === 'grenade') { ctx.globalAlpha = a; ctx.fillStyle = Math.floor(G.time * 14) % 2 ? '#ff4a3a' : b.col; ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, TAU); ctx.fill(); continue; }
    const tl = Math.min(b.heavy ? 0.034 : b.shard ? 0.012 : 0.022, b.age || 0);
    ctx.globalAlpha = Math.min(1, a * 1.15); ctx.strokeStyle = b.crit ? '#ffffff' : b.col; ctx.lineWidth = b.heavy ? 3.4 : b.shard ? 1.6 : b.crit ? 3 : 2.4;
    ctx.beginPath(); ctx.moveTo(b.x - b.vx * tl, b.y - b.vy * tl); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (const e of G.eshots) {
    if (!vis(e.x, e.y, 30)) continue;
    const col = e.k === 'acid' ? '#b8ec4a' : e.k === 'wisp' ? '#ffd38a' : SHOT_COL[e.k] && e.k !== 'bolt' ? SHOT_COL[e.k] : null; if (!col) continue;
    ctx.globalAlpha = a * 0.8; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(e.x, e.y, (e.r || 5) * 1.2, 0, TAU); ctx.fill();
  }
  for (const q of G.parts) { if (!q.glow) continue; ctx.globalAlpha = clamp(q.life / q.max, 0, 1) * a; ctx.fillStyle = q.c; ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawHazards(vis) {
  for (const h of G.haz) {
    if (!vis(h.x, h.y, h.r)) continue;
    const f = clamp(h.life / h.max * 2, 0, 1);
    if (h.k === 'acid') { ctx.fillStyle = 'rgba(140,220,60,' + 0.28 * f + ')'; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(200,255,120,' + 0.35 * f + ')'; ctx.beginPath(); ctx.arc(h.x + Math.sin(h.life * 5) * h.r * 0.3, h.y, h.r * 0.18, 0, TAU); ctx.fill(); }
    else if (h.k === 'fire') { const fl = 0.8 + Math.sin(G.time * 20 + h.x) * 0.2; ctx.fillStyle = 'rgba(255,110,30,' + 0.3 * f * fl + ')'; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,200,80,' + 0.35 * f + ')'; ctx.beginPath(); ctx.arc(h.x, h.y, h.r * 0.45 * fl, 0, TAU); ctx.fill(); }
    else if (h.k === 'spore') {
      for (let i = 0; i < 4; i++) { const a = i * 1.6 + G.time * 0.6; ctx.fillStyle = 'rgba(150,175,80,' + 0.18 * f + ')'; ctx.beginPath(); ctx.arc(h.x + Math.cos(a) * h.r * 0.35, h.y + Math.sin(a) * h.r * 0.35, h.r * 0.6, 0, TAU); ctx.fill(); }
    }
    else if (h.k === 'sludge') { ctx.fillStyle = 'rgba(80,62,34,' + 0.55 * f + ')'; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.8, 0.4, 0, TAU); ctx.fill(); }
    else if (h.k === 'ice') { ctx.fillStyle = 'rgba(180,235,255,' + 0.32 * f + ')'; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(230,250,255,' + 0.6 * f + ')'; ctx.lineWidth = 2; ctx.stroke(); }
    else if (h.k === 'vortex') {
      const gr = ctx.createRadialGradient(h.x, h.y, 4, h.x, h.y, h.r); gr.addColorStop(0, 'rgba(5,2,12,' + 0.95 * f + ')'); gr.addColorStop(0.25, 'rgba(70,30,120,' + 0.45 * f + ')'); gr.addColorStop(1, 'rgba(70,30,120,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(180,120,255,' + 0.6 * f + ')'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(h.x, h.y, h.r * (0.3 + i * 0.22), G.time * (3 - i) + i, G.time * (3 - i) + i + 2.2); ctx.stroke(); }
    }
  }
}
function drawSnatchZone(z) {
  const s = z.snatch;
  if (s.state === 'grabTele') {
    const f = clamp(1 - s.t / GRAB_TELE, 0, 1), locked = s.t <= GRAB_LOCK;
    ctx.fillStyle = 'rgba(229,72,77,' + (0.08 + f * 0.1) + ')'; ctx.beginPath(); ctx.arc(s.zx, s.zy, s.zr, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(229,72,77,0.22)'; ctx.beginPath(); ctx.arc(s.zx, s.zy, Math.max(1, s.zr * f), 0, TAU); ctx.fill();
    ctx.strokeStyle = locked ? 'rgba(255,90,80,0.95)' : 'rgba(255,90,80,0.6)'; ctx.lineWidth = locked ? 4 : 3;
    ctx.setLineDash(locked ? [] : [12, 9]); ctx.lineDashOffset = -G.time * 30;
    ctx.beginPath(); ctx.arc(s.zx, s.zy, s.zr, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,225,220,0.9)'; ctx.font = "bold 14px 'Share Tech Mono', monospace"; ctx.textAlign = 'center';
    ctx.fillText(locked ? 'DASH OUT!' : 'GRAB', s.zx, s.zy - s.zr - 10);
  } else if (s.state === 'slamTele') {
    const f = clamp(1 - s.t / 0.9, 0, 1);
    ctx.fillStyle = 'rgba(255,140,60,0.12)'; ctx.beginPath(); ctx.arc(s.zx, s.zy, s.zr, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,140,60,0.25)'; ctx.beginPath(); ctx.arc(s.zx, s.zy, Math.max(1, s.zr * f), 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,160,80,0.8)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(s.zx, s.zy, s.zr, 0, TAU); ctx.stroke();
  }
}
function drawSnatcher(z) {
  const s = z.snatch, r = z.r;
  let sc = 1, lift = 0;
  if (s.state === 'grabTele' && s.t < GRAB_LOCK) { const f = 1 - Math.max(0, s.t) / GRAB_LOCK; lift = Math.sin(f * Math.PI); sc = 1 + lift * 0.35; }
  ctx.save(); ctx.translate(z.x, z.y);
  ctx.fillStyle = 'rgba(0,0,0,' + (0.45 - lift * 0.2) + ')';
  ctx.beginPath(); ctx.ellipse(6 + lift * 14, 10 + lift * 24, r * 1.25 * (1 - lift * 0.25), r * 1.05 * (1 - lift * 0.25), 0, 0, TAU); ctx.fill();
  ctx.rotate(z.ang); ctx.scale(sc, sc);
  const tele = s.state === 'grabTele', hold = s.state === 'holding', slam = s.state === 'slamTele', hands = [];
  ctx.lineCap = 'round';
  for (let sd = -1; sd <= 1; sd += 2) {
    let hx2, hy2;
    if (tele) { hx2 = r * 0.5; hy2 = sd * r * 2.0; }
    else if (hold) { hx2 = r * 1.15; hy2 = sd * r * 0.42; }
    else if (slam) { hx2 = r * 1.55; hy2 = sd * r * 0.25; }
    else { const sw = Math.sin(G.time * 3 + sd) * r * 0.15; hx2 = r * 1.35 + sw; hy2 = sd * r * 0.95; }
    const shx = r * 0.05, shy = sd * r * 0.85, elx = (shx + hx2) / 2 - r * 0.25, ely = (shy + hy2) / 2 + sd * r * 0.45;
    ctx.strokeStyle = '#3e2a2f'; ctx.lineWidth = r * 0.36; ctx.beginPath(); ctx.moveTo(shx, shy); ctx.quadraticCurveTo(elx, ely, hx2, hy2); ctx.stroke();
    ctx.strokeStyle = '#5e4148'; ctx.lineWidth = r * 0.26; ctx.beginPath(); ctx.moveTo(shx, shy); ctx.quadraticCurveTo(elx, ely, hx2, hy2); ctx.stroke();
    hands.push([hx2, hy2, sd]);
  }
  ctx.fillStyle = '#3f262c'; ctx.beginPath(); ctx.ellipse(-r * 0.1, 0, r * 0.95, r * 1.08, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#56363d'; ctx.beginPath(); ctx.ellipse(-r * 0.2, 0, r * 0.7, r * 0.82, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#d6c7a8';
  for (let i = 0; i < 5; i++) { const px = -r * 0.85 + i * r * 0.3; ctx.beginPath(); ctx.moveTo(px - r * 0.1, 0); ctx.lineTo(px + r * 0.02, -r * 0.16); ctx.lineTo(px + r * 0.1, 0); ctx.lineTo(px + r * 0.02, r * 0.16); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = 'rgba(20,8,10,0.6)'; ctx.lineWidth = r * 0.04; ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.6); ctx.lineTo(r * 0.1, -r * 0.35); ctx.stroke();
  for (const h of hands) {
    ctx.fillStyle = '#6e4c53'; ctx.beginPath(); ctx.arc(h[0], h[1], r * 0.34, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8dcc0';
    for (let i = -1; i <= 1; i++) {
      const a = (tele ? h[2] * Math.PI / 2 : 0) + i * 0.45;
      ctx.beginPath(); ctx.moveTo(h[0] + Math.cos(a - 0.12) * r * 0.3, h[1] + Math.sin(a - 0.12) * r * 0.3); ctx.lineTo(h[0] + Math.cos(a) * r * 0.62, h[1] + Math.sin(a) * r * 0.62); ctx.lineTo(h[0] + Math.cos(a + 0.12) * r * 0.3, h[1] + Math.sin(a + 0.12) * r * 0.3); ctx.closePath(); ctx.fill();
    }
  }
  ctx.fillStyle = '#5e4148'; ctx.beginPath(); ctx.arc(r * 0.55, 0, r * 0.36, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,60,60,0.25)'; ctx.beginPath(); ctx.arc(r * 0.62, 0, r * 0.3, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ff3b3b';
  for (const e of [[0.68, -0.14], [0.68, 0.14], [0.52, -0.24], [0.52, 0.24]]) { ctx.beginPath(); ctx.arc(r * e[0], r * e[1], r * 0.06, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = '#1a0a0c'; ctx.lineWidth = r * 0.05; ctx.beginPath(); ctx.moveTo(r * 0.82, -r * 0.16); ctx.lineTo(r * 0.87, -r * 0.05); ctx.lineTo(r * 0.82, r * 0.05); ctx.lineTo(r * 0.87, r * 0.16); ctx.stroke();
  if (z.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.5, z.flash * 6) + ')'; ctx.beginPath(); ctx.ellipse(-r * 0.1, 0, r * 0.95, r * 1.08, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(229,72,77,' + (0.4 + Math.sin(G.time * 4) * 0.2) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(z.x, z.y, r * 1.45, 0, TAU); ctx.stroke();
  if (s.state === 'stunned') { ctx.fillStyle = '#f2cc3a'; for (let i = 0; i < 3; i++) { const a = G.time * 4 + i * TAU / 3; ctx.beginPath(); ctx.arc(z.x + Math.cos(a) * r * 0.7, z.y - r * 0.9 + Math.sin(a) * r * 0.25, 4, 0, TAU); ctx.fill(); } }
}
// lod 0: everything · 1: no cosmetic status rings · 2: also no burn glow, and health bars only near you · 3: sprite only
function drawZ(z, lod, far) {
  lod = lod || 0;
  if (z.rb) { drawRoster(z); return; }
  if (z.m.unique) { drawSnatcher(z); return; }
  if (z.m.v2 && !z.fly && !z.st.under && typeof animaDraw === 'function') {
    const T = ctx.getTransform();
    const ok = animaDraw(z, lod, z.swRkF === frameNo ? z.swRk : 0, T.a, T.e, T.f, swarmAlpha(z));
    ctx.setTransform(T.a, T.b, T.c, T.d, T.e, T.f); ctx.globalAlpha = 1;
    if (ok) { drawZOver(z, lod, far); return; }
  }
  if (z.st.down > 0) {
    const spr = getSprite(z.m, z.r / (z.vr || 1), z.minion), k = z.r / spr.rq, hs = spr.half * k;
    ctx.save(); ctx.translate(z.x, z.y); ctx.rotate(z.ang + 1.3); ctx.globalAlpha = 0.5; ctx.drawImage(spr.c, -hs, -hs, hs * 2, hs * 2); ctx.restore(); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(230,220,190,' + (0.3 + Math.sin(G.time * 10) * 0.2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (1.2 + (1.4 - z.st.down) * 0.4), 0, TAU); ctx.stroke();
    return;
  }
  if (z.st.under) {
    ctx.fillStyle = 'rgba(70,58,44,0.9)'; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r * 0.9, z.r * 0.6, z.ang, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(30,24,18,0.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(z.x - z.r * 0.5, z.y); ctx.lineTo(z.x + z.r * 0.4, z.y + z.r * 0.2); ctx.stroke();
    return;
  }
  if (z.fly) {
    ctx.fillStyle = 'rgba(220,220,230,0.35)'; const wf = Math.sin(G.time * 60 + z.bob) * 2;
    ctx.beginPath(); ctx.ellipse(z.x - 2, z.y - 3, 3, 1.5 + wf * 0.3, 0.5, 0, TAU); ctx.ellipse(z.x + 2, z.y - 3, 3, 1.5 - wf * 0.3, -0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#16120a'; ctx.beginPath(); ctx.arc(z.x, z.y, 3.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d69b2a'; ctx.fillRect(z.x - 1, z.y - 1, 2, 2);
    return;
  }
  const spr = getSprite(z.m, z.r / (z.vr || 1), z.minion), k = z.r / spr.rq, hs = spr.half * k;
  let a = 1; if (z.illusion) a = 0.62 * Math.min(1, z.life); if (z.m.S.p.ghost) a *= 0.88; if (z.st.phased) a *= 0.25;
  if (z.m.S.p.camo && G.p && G.mode !== 'title') a *= clamp((300 - Math.hypot(G.p.x - z.x, G.p.y - z.y)) / 140, 0.1, 1);
  ctx.save(); ctx.translate(z.x, z.y);
  if (z.warn > 0 || z.st.fuse > 0) ctx.translate(rand(-1.5, 1.5), rand(-1.5, 1.5));
  ctx.rotate(z.ang + Math.sin(G.time * 7 + z.bob) * 0.06);
  ctx.globalAlpha = a;
  ctx.drawImage(spr.c, -hs, -hs, hs * 2, hs * 2);
  if ((z.wnd || z.charK || z.frostK) && lod < 2 && typeof goreWounds === 'function') goreWounds(ctx, z, z.r);
  if (z.flash > 0 && lod < 3) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, z.flash * 9) * 0.55 * a; ctx.drawImage(spr.c, -hs, -hs, hs * 2, hs * 2); ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore(); ctx.globalAlpha = 1;
  drawZOver(z, lod, far);
}
// what is drawn over a zombie's body: shields, fuses, burns, frost, aim lines, warnings and the health bar
function drawZOver(z, lod, far) {
  if (lod >= 3) { if (z.st.fuse > 0 || z.warn > 0 || (z.frozen && z.stun > 0)) lod = 2; else if (!(z.shield > 1) && !(z.st.aim > 0)) return; }
  if (z.shield > 1) { ctx.strokeStyle = 'rgba(110,180,255,' + (0.25 + 0.6 * z.shield / z.shieldMax) + ')'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 1.35, 0, TAU); ctx.stroke(); }
  if (z.abs.indexOf('bomber') >= 0) { const pul = z.st.fuse > 0 ? 1 : 0.5 + Math.sin(G.time * 6 + z.bob) * 0.5; ctx.fillStyle = 'rgba(255,80,40,' + (0.15 + 0.3 * pul) + ')'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (0.6 + (z.st.fuse > 0 ? (0.55 - z.st.fuse) * 2 : 0)), 0, TAU); ctx.fill(); }
  if (z.buffT > 0 && lod < 1) { ctx.strokeStyle = 'rgba(255,110,80,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 1.2, 0, TAU); ctx.stroke(); }
  if (z.burnT > 0 && lod < 2) { ctx.fillStyle = 'rgba(255,120,40,' + (0.12 + Math.random() * 0.14) + ')'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 1.05, 0, TAU); ctx.fill(); }
  if (z.poisonT > 0 && lod < 1) { ctx.strokeStyle = 'rgba(155,226,58,0.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 1.18, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  if (z.frozen && z.stun > 0) { ctx.fillStyle = 'rgba(200,240,255,0.42)'; ctx.fillRect(z.x - z.r * 1.1, z.y - z.r * 1.1, z.r * 2.2, z.r * 2.2); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5; ctx.strokeRect(z.x - z.r * 1.1, z.y - z.r * 1.1, z.r * 2.2, z.r * 2.2); }
  if (z.st.surgeT > 0 && lod < 1) { ctx.strokeStyle = 'rgba(122,240,255,' + (0.4 + Math.random() * 0.4) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 1.3, 0, TAU); ctx.stroke(); }
  if (z.slowT > 0 && lod < 1) { ctx.strokeStyle = 'rgba(170,220,255,0.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 1.1, 0, TAU); ctx.stroke(); }
  if (z.st.aim > 0 && G.p) { ctx.strokeStyle = 'rgba(255,60,50,' + (0.2 + (1 - z.st.aim) * 0.7) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(G.p.x, G.p.y); ctx.stroke(); }
  if (z.st.zap > 0 && lod < 1 && G.p && Math.random() < 0.6) { ctx.strokeStyle = 'rgba(255,243,107,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 1.4 + rand(0, 6), 0, TAU); ctx.stroke(); }
  if (z.warn > 0 && !z.boss) { ctx.fillStyle = '#ff5a4a'; ctx.font = "bold 16px 'Share Tech Mono', monospace"; ctx.textAlign = 'center'; ctx.fillText('!', z.x, z.y - z.r - 10); }
  if (z.boss) {
    ctx.strokeStyle = 'rgba(229,72,77,' + (0.45 + Math.sin(G.time * 4) * 0.2) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 1.25, 0, TAU); ctx.stroke();
  } else if (z.hp < z.maxHp && !z.illusion && z.maxHp > 6 && (lod < 2 || !far)) {
    const w = Math.max(18, z.r * 1.6), f = clamp(z.hp / z.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(z.x - w / 2, z.y - z.r - 9, w, 4);
    ctx.fillStyle = RARITY[z.m.rarity].color; ctx.fillRect(z.x - w / 2, z.y - z.r - 9, w * f, 4);
  }
}
const GUN_LEN = { pistol: 16, smg: 20, rifle: 26, shotgun: 26, sniper: 34, revolver: 18, lmg: 28, burst: 24, launcher: 24, flamer: 26 };
const GUN_W = { shotgun: 6, lmg: 7, launcher: 9, flamer: 6 };
let flashGrad = null;   // the flashlight's gradient is built once and reused (it is drawn relative to the player)
function drawPlayer(p) {
  ctx.save(); ctx.translate(p.x, p.y);
  if (G.mode !== 'over' && !(LUX.live && LUX.day < 0.96)) {   // at night the lighting engine casts the real beam
    if (!flashGrad) { flashGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 300); flashGrad.addColorStop(0, 'rgba(255,236,180,0.17)'); flashGrad.addColorStop(1, 'rgba(255,236,180,0)'); }
    ctx.fillStyle = flashGrad; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 300, p.aim - 0.42, p.aim + 0.42); ctx.closePath(); ctx.fill();
  }
  ctx.scale(PK, PK);   // a person is smaller next to the real-scale city
  if (p.iframe > 0 && p.dashT <= 0 && Math.floor(G.time * 30) % 2) ctx.globalAlpha = 0.5;
  if ((p.db && p.db.stealthT > 0) || (p.dashT > 0 && p.dashK === 'phantom')) ctx.globalAlpha = 0.38;
  if (p.dashT > 0 && p.dashK === 'meteor') { const h = Math.sin((1 - p.dashT / p.dashDur) * Math.PI); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 6, 13, 10, 0, 0, TAU); ctx.fill(); ctx.translate(0, -h * 34); ctx.scale(1 + h * 0.5, 1 + h * 0.5); }
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(2, 4, 13, 12, 0, 0, TAU); ctx.fill();
  ctx.rotate(p.aim);
  // the survivor is one textured sprite per weapon and walking pose (made once by the texture engine), turned to the aim
  const fk = (p.weapon && p.weapon.F && p.weapon.F.key) || 'pistol', gl = GUN_LEN[fk] || 20;
  // recoil: the gun (and the shoulders behind it) kick back with each shot and settle
  if (p.kick > 0.01 && !(p.weapon && p.weapon.arms)) { ctx.translate(-p.kick * 3.2, 0); ctx.rotate(p.kick * 0.035 * ((p.shots & 1) ? 1 : -1)); }   // (LEGEND v2 kicks the upper body itself)
  // 1.9.992: the survivor is the chosen legend (a frame of his 3D rig, seen from above, doing what the player does);
  // the old textured survivor is the fallback
  const LS = legendDrawPlayer(p, ctx, fk, gl);
  if (!LS) { const PS = texelPlayer(p); ctx.drawImage(PS.c, -PS.half, -PS.half, PS.half * 2, PS.half * 2); }
  // the light that falls on the survivor: lit toward the lamp (or the sun), shaded away from it, a rim of its colour
  if (typeof lookShade === 'function' && typeof aLight === 'function' && LUX.live && Q.lod < 3) { const L = aLight({ x: p.x, y: p.y, ang: p.aim }); lookShade(ctx, L, 14, 15, 1); }
  if (typeof muzzleDraw === 'function') { try { if (LS) { ctx.save(); if (LS.v2) { ctx.translate(LS.mx, LS.my); ctx.rotate(LS.rot || 0); ctx.translate(-8 - gl, 0); } else ctx.translate(LS.mx - 8 - gl, LS.my); } muzzleDraw(ctx, p, fk, gl, 1); if (LS) ctx.restore(); } catch (e) { muzzleHurt(e); } }
  else if (p.flashT > 0 && fk !== 'flamer') { const mx = 8 + gl; ctx.fillStyle = p.weapon.M && p.weapon.M.key === 'standard' ? '#ffe9a0' : p.weapon.color; ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx + 12, -5); ctx.lineTo(mx + 16, 0); ctx.lineTo(mx + 12, 5); ctx.closePath(); ctx.fill(); }
  if (p.frozenT > 0) { ctx.fillStyle = 'rgba(200,240,255,0.55)'; ctx.fillRect(-15, -15, 30, 30); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5; ctx.strokeRect(-15, -15, 30, 30); }
  if (p.rootT > 0) { ctx.strokeStyle = '#4d5e22'; ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 18, Math.sin(a) * 18); ctx.quadraticCurveTo(Math.cos(a + 0.6) * 8, Math.sin(a + 0.6) * 8, Math.cos(a + 1.2) * 14, Math.sin(a + 1.2) * 14); ctx.stroke(); } }
  if (p.jamT > 0) { ctx.rotate(-p.aim); ctx.fillStyle = '#fff36b'; ctx.font = "bold 12px 'Share Tech Mono', monospace"; ctx.textAlign = 'center'; ctx.fillText('JAM', 0, -24); }
  ctx.restore(); ctx.globalAlpha = 1;
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
/* ================= music visualizer: the city glows to the song ================= */
const NEON = ['#ff3df2', '#29e6ff', '#7dff4a', '#ffb627', '#ff3b5c', '#9b5cff', '#2bff9e', '#ff7a2b'];
const VZ = { I: 0, col: NEON[1], col2: NEON[0], rgb: '41,230,255', css: '' };
let vzNow = null;
const VIZ_PAUSED = true;
const glowCache = new Map();
function glowSprite(col) {
  let c = glowCache.get(col); if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, hexA(col, 0.85)); gr.addColorStop(0.22, hexA(col, 0.38)); gr.addColorStop(0.6, hexA(col, 0.08)); gr.addColorStop(1, hexA(col, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); glowCache.set(col, c); return c;
}
// full-screen radial gradients (vignette, hurt flash, chain glow) are rendered once at half resolution and reused
const SG = new Map();
function screenGrad(key, r0f, r1f, rgb, a1) {
  const c = SG.get(key); if (c && c.w === W && c.h === H) return c.can;
  const sw = Math.max(1, Math.ceil(W / 2)), sh = Math.max(1, Math.ceil(H / 2)), can = document.createElement('canvas'); can.width = sw; can.height = sh;
  const g = can.getContext('2d'), gr = g.createRadialGradient(sw / 2, sh / 2, Math.min(sw, sh) * r0f, sw / 2, sh / 2, Math.hypot(sw, sh) * r1f);
  gr.addColorStop(0, 'rgba(' + rgb + ',0)'); gr.addColorStop(1, 'rgba(' + rgb + ',' + a1 + ')'); g.fillStyle = gr; g.fillRect(0, 0, sw, sh);
  if (SG.size > 12) SG.clear();
  SG.set(key, { can: can, w: W, h: H }); return can;
}
function rgbOf(hex) { const n = parseInt(hex.slice(1), 16); return (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255); }
function vizLevel() { return AUD.vis === 'off' ? 0 : AUD.vis === 'low' ? 0.45 : 1; }
function vizFrame() {
  const v = SFX.viz();
  let I;
  if (G.mode === 'title') I = 0.55;
  else if (G.mode === 'play') I = Math.min(1, 0.42 + G.wave * 0.04) * ((G.boss && !G.boss.dead) || G.chain >= 25 ? 1.25 : 1);
  else if (G.mode === 'upgrade' || G.mode === 'pause') I = 0.3;
  else I = 0.18;
  VZ.I = v.live ? I * vizLevel() : 0;
  const w = G.mode === 'title' ? 2 : Math.max(1, G.wave), col = NEON[(w - 1) % NEON.length];
  if (col !== VZ.col) { VZ.col = col; VZ.col2 = NEON[(w + 3) % NEON.length]; VZ.rgb = rgbOf(col); }
  // DOM: HUD numbers and buttons pulse on the beat
  const qb = Q.beat === 2 ? 100 : Q.beat === 1 ? 10 : 0, b = qb ? (Math.round(v.beat * VZ.I * qb) / qb).toFixed(2) : '0', css = b + VZ.col;
  if (css !== VZ.css) { VZ.css = css; const a = $('app'); a.style.setProperty('--beat', b); a.style.setProperty('--neon', VZ.col); }
  return v;
}
// Under everything: road markings light up in ripples on each beat, streetlights flash in club colors, rooftops get neon trim.
function drawVizGround(v, x0, y0, x1, y1) {
  const I = VZ.I; if (I < 0.01) return;
  const px = G.p && G.mode !== 'title' ? G.p.x : cam.x, py = G.p && G.mode !== 'title' ? G.p.y : cam.y;
  const rip = []; for (const bt of v.beats) { const age = v.now - bt; if (age >= 0 && age < 1.1) rip.push(age); }
  const base = 0.04 + v.bass * 0.3 + v.kick * 0.12;
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = VZ.col;
  const dash = (x, y, horiz) => {
    if (x < x0 - 20 || x > x1 + 20 || y < y0 - 20 || y > y1 + 20) return;
    const d = Math.hypot(x - px, y - py); let a = base;
    for (let i = 0; i < rip.length; i++) { const k = (d - rip[i] * 950) / 70; a += Math.exp(-k * k) * (1 - rip[i] / 1.1); }
    a = Math.min(1, a * I); if (a < (Q.viz ? 0.02 : 0.08)) return;
    if (Q.viz >= 2) { ctx.globalAlpha = a * 0.3; if (horiz) ctx.fillRect(x - 15, y - 6, 30, 12); else ctx.fillRect(x - 6, y - 15, 12, 30); }
    ctx.globalAlpha = a; if (horiz) ctx.fillRect(x - 11, y - 1.5, 22, 3); else ctx.fillRect(x - 1.5, y - 11, 3, 22);
  };
  const cx0 = Math.floor((x0 - 130) / CHS), cx1 = Math.floor((x1 + 130) / CHS), cy0 = Math.floor((y0 - 130) / CHS), cy1 = Math.floor((y1 + 130) / CHS);
  for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
    const ox = cx * CH, oy = cy * CH;
    for (let x = ox + ROAD + 30; x < ox + CH - 30; x += 40) dash((x + 11) * SCL, (oy + ROAD / 2) * SCL, true);
    for (let y = oy + ROAD + 30; y < oy + CH - 30; y += 40) dash((ox + ROAD / 2) * SCL, (y + 11) * SCL, false);
  }
  // rooftop neon trim rides the hi-hats and the high end
  const ra = I * (0.05 + v.hat * 0.32 + v.high * 0.6);
  if (ra > 0.03 && Q.viz >= 1) {
    ctx.strokeStyle = VZ.col2;
    for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
      const c = chunks.get(cx + ',' + cy); if (!c) continue;
      for (const r of c.rects) {
        if (r.k !== 'b' || r.x > x1 || r.y > y1 || r.x + r.w < x0 || r.y + r.h < y0) continue;
        if (Q.viz >= 2) { ctx.globalAlpha = Math.min(0.5, ra * 0.35); ctx.lineWidth = 8; ctx.strokeRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12); }
        ctx.globalAlpha = Math.min(1, ra); ctx.lineWidth = 2; ctx.strokeRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12);
      }
    }
  }
  // streetlights alternate between two neon colors on the beat
  const kr = 1 + v.kick * 0.14;
  let glows = Q.viz >= 2 ? 99 : Q.viz ? 6 : 0;
  if (AUD.vis === 'full' && glows) for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
    const c = getChunk(cx, cy); if (!c.lights) c.lights = lightsOf(cx, cy);
    for (let j = 0; j < c.lights.length; j++) {
      const L = c.lights[j], on = (j + cx + cy + v.beatN) % 2 === 0, r = 86 * kr;
      if (L.x + r < x0 || L.x - r > x1 || L.y + r < y0 || L.y - r > y1) continue;
      const la = Math.min(1, I * (0.12 + (on ? v.beat * 0.6 : v.beat * 0.08) + v.bass * 0.2)); if (la < 0.04) continue;
      if (glows-- <= 0) break;
      ctx.globalAlpha = la; ctx.drawImage(glowSprite(on ? VZ.col : VZ.col2), L.x - r, L.y - r, r * 2, r * 2);
    }
  }
  // the player stands on a pulsing ring; every bar sends a shockwave out from them, every drop a bigger one
  if (G.mode !== 'title' && G.p) {
    ctx.strokeStyle = VZ.col;
    ctx.globalAlpha = Math.min(1, I * (0.22 + v.kick * 0.55)); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(px, py, 21 + v.kick * 7, 0, TAU); ctx.stroke();
    if (v.tBar >= 0 && v.tBar < 0.8) { ctx.globalAlpha = I * 0.45 * (1 - v.tBar / 0.8); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, 24 + v.tBar * 520, 0, TAU); ctx.stroke(); }
    if (v.tImpact >= 0 && v.tImpact < 1.2) { ctx.globalAlpha = Math.min(1, I * 1.4) * (1 - v.tImpact / 1.2); ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(px, py, 30 + v.tImpact * 950, 0, TAU); ctx.stroke(); }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
// Zombies light up from underneath on every kick.
function drawVizMobs(v, vis) {
  const a = VZ.I * v.kick * 0.42, max = Q.viz >= 2 ? 45 : Q.viz ? 18 : 0; if (a < 0.02 || AUD.vis !== 'full' || !max) return;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a);
  const spr = glowSprite(VZ.col); let n = 0;
  for (const z of G.zs) { if (z.dead || z.fly || z.st.under || !vis(z.x, z.y, z.r * 2)) continue; const r = z.r * 1.75; ctx.drawImage(spr, z.x - r, z.y - r, r * 2, r * 2); if (++n >= max) break; }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
// Tracers flare on the beat.
function drawVizBullets(v) {
  const a = VZ.I * (0.18 + v.kick * 0.4); if (a < 0.02 || !G.bullets.length) return;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = VZ.col; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath();
  for (const b of G.bullets) { if (b.kind === 'flame' || b.kind === 'grenade') continue; const tl = Math.min(0.03, b.age || 0); ctx.moveTo(b.x - b.vx * tl, b.y - b.vy * tl); ctx.lineTo(b.x, b.y); }
  ctx.stroke(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
// Screen: a spectrum along the bottom and an edge glow that breathes with the bass.
const EDGE = { col: '', h: null, v: null, d: 64 };
function edgeStrips() {
  if (EDGE.col === VZ.col) return EDGE;
  EDGE.col = VZ.col;
  const mk = (w, h, horiz) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), gr = horiz ? g.createLinearGradient(0, 0, 0, h) : g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, hexA(VZ.col, 1)); gr.addColorStop(1, hexA(VZ.col, 0)); g.fillStyle = gr; g.fillRect(0, 0, w, h); return c; };
  EDGE.h = mk(8, 64, true); EDGE.v = mk(64, 8, false); return EDGE;
}
const SPEC_BINS = (() => { const out = [], n = 32, bw = 46.875; for (let i = 0; i < n; i++) { const f0 = 55 * Math.pow(220, i / n), f1 = 55 * Math.pow(220, (i + 1) / n); const lo = Math.max(1, Math.floor(f0 / bw)); out.push([lo, Math.max(lo + 1, Math.floor(f1 / bw))]); } return out; })();
function drawVizScreen(v) {
  const I = VZ.I; if (I < 0.01) return;
  ctx.globalCompositeOperation = 'lighter';
  const ea = Math.min(0.4, I * (0.05 + v.bass * 0.15 + v.bar * 0.07));
  if (ea > 0.01) {
    const e = edgeStrips(); ctx.globalAlpha = ea;
    ctx.drawImage(e.h, 0, 0, W, e.d); ctx.save(); ctx.translate(0, H); ctx.scale(1, -1); ctx.drawImage(e.h, 0, 0, W, e.d); ctx.restore();
    ctx.drawImage(e.v, 0, 0, e.d, H); ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.drawImage(e.v, 0, 0, e.d, H); ctx.restore();
    ctx.globalAlpha = 1;
  }
  const sp = v.spec;
  if (sp) {
    const n = SPEC_BINS.length, bw = W / n, maxH = Math.min(78, H * 0.1), gk = H + VZ.col + VZ.col2;
    if (!VZ.specGr || VZ.specKey !== gk) { VZ.specKey = gk; VZ.specGr = ctx.createLinearGradient(0, H - maxH, 0, H); VZ.specGr.addColorStop(0, hexA(VZ.col2, 0.9)); VZ.specGr.addColorStop(1, hexA(VZ.col, 0.15)); }
    ctx.fillStyle = VZ.specGr;
    for (let i = 0; i < n; i++) {
      const [lo, hi] = SPEC_BINS[i]; let s = 0; for (let k = lo; k < hi; k++) s += sp[k];
      const val = Math.pow(s / (hi - lo) / 255, 1.5), h = val * maxH; if (h < 1) continue;
      ctx.globalAlpha = Math.min(1, I * 0.5); ctx.fillRect(i * bw + 1, H - h, bw - 2, h);
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawScreenFx() {
  if (G.hurtFlash > 0) { ctx.globalAlpha = Math.min(1, G.hurtFlash * 1.4); ctx.drawImage(screenGrad('hurt', 0.3, 0.6, '160,20,25', 1), 0, 0, W, H); ctx.globalAlpha = 1; }
  const p = G.p;
  if (G.chain >= 25 && G.time - G.lastKill < CHAIN_WINDOW && (G.mode === 'play' || G.mode === 'skull')) {
    const a = Math.min(0.3, 0.12 + 0.05 * Math.sin(G.time * 6) + (G.chain - 25) * 0.0015), cc = chainColor(G.chain);
    ctx.globalAlpha = a; ctx.drawImage(screenGrad('chain' + cc, 0.38, 0.6, rgbOf(cc), 1), 0, 0, W, H); ctx.globalAlpha = 1;
  }
  if (G.tierFlash > 0) { ctx.fillStyle = hexA(chainColor(G.chain), G.tierFlash * 0.28); ctx.fillRect(0, 0, W, H); }
  if (G.cineT > 0) { const k = Math.min(1, Math.min(G.cineT, 2.4 - G.cineT) * 4), bh = 58 * k; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh); }
  if (p && p.vision > 0) {
    const v = Math.min(3, p.vision), g3 = ctx.createRadialGradient(W / 2, H / 2, 110 - v * 22, W / 2, H / 2, Math.max(W, H) * 0.5);
    g3.addColorStop(0, 'rgba(6,4,10,0)'); g3.addColorStop(0.35, 'rgba(6,4,10,' + (0.4 + v * 0.15) + ')'); g3.addColorStop(1, 'rgba(6,4,10,' + Math.min(0.97, 0.8 + v * 0.08) + ')');
    ctx.fillStyle = g3; ctx.fillRect(0, 0, W, H);
  }
  if (p && p.blindT > 0) {
    const g2 = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, Math.max(W, H) * 0.55);
    g2.addColorStop(0, 'rgba(10,10,10,0)'); g2.addColorStop(0.25, 'rgba(10,10,10,' + Math.min(0.85, p.blindT * 0.6) + ')'); g2.addColorStop(1, 'rgba(10,10,10,' + Math.min(0.95, p.blindT * 0.7) + ')');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  }
  if (p && p.hp < p.maxHp * 0.3 && G.mode === 'play') { ctx.fillStyle = 'rgba(150,15,20,' + (0.08 + Math.sin(G.time * 5) * 0.06) + ')'; ctx.fillRect(0, 0, W, H); }
  if (G.boss && !G.boss.dead && p) {
    const sx = (G.boss.x - cam.x) * gcamZoom() + W / 2, sy = (G.boss.y - cam.y) * gcamZoom() + H / 2;
    if (sx < 0 || sx > W || sy < 0 || sy > H) {
      const a = Math.atan2(sy - H / 2, sx - W / 2), ex = clamp(sx, 28, W - 28), ey = clamp(sy, 90, H - 110);
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  if (G.mode === 'play' && joy.active) drawJoy(joy.ox, joy.oy, JR(), joy.kx, joy.ky, 1);
  else if (G.mode === 'play' && DEV.kind === 'touch' && SET.joy === 'fixed') { const h = joyHome(); drawJoy(h[0], h[1], JR(), 0, 0, 0.45); }
  else if (G.mode === 'play' && DEV.kind === 'touch' && G.hintT > 0 && SET.hints) {
    const a = clamp(G.hintT, 0, 1), hx = SET.lefty ? W - 96 : 96;
    drawJoy(hx, H - 130, 56, Math.cos(G.time * 2.4) * 22, Math.sin(G.time * 2.4) * 22, a * 0.7);
    ctx.globalAlpha = a * 0.85; ctx.fillStyle = '#ebe5d6'; ctx.font = "11px 'Share Tech Mono', monospace"; ctx.textAlign = 'center'; ctx.fillText('DRAG TO MOVE', hx, H - 130 - 56 - 10);   // (above the ring: below it sits the weapon chip) ctx.globalAlpha = 1;
  }
}
// the touch joystick: a glass disc with a ticked rim, the push direction lit on the rim, and a glowing thumb knob
function drawJoy(ox, oy, R, kx, ky, a) {
  const k = SET.joySize / 100, m = Math.min(1, Math.hypot(kx, ky) / Math.max(1, R)), ang = Math.atan2(ky, kx);
  ctx.save(); ctx.globalAlpha = a;
  const g = ctx.createRadialGradient(ox, oy, R * 0.2, ox, oy, R);
  g.addColorStop(0, 'rgba(9,12,16,0.05)'); g.addColorStop(0.75, 'rgba(9,12,16,0.32)'); g.addColorStop(1, 'rgba(9,12,16,0.5)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox, oy, R, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(235,229,214,0.26)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ox, oy, R, 0, TAU); ctx.stroke();
  // ticks round the rim, longer at the four main directions
  ctx.strokeStyle = 'rgba(235,229,214,0.32)';
  for (let i = 0; i < 24; i++) { const t = i / 24 * TAU, main = i % 6 === 0, r0 = R - (main ? 10 : 5); ctx.lineWidth = main ? 2 : 1; ctx.beginPath(); ctx.moveTo(ox + Math.cos(t) * r0, oy + Math.sin(t) * r0); ctx.lineTo(ox + Math.cos(t) * (R - 1), oy + Math.sin(t) * (R - 1)); ctx.stroke(); }
  // the way you are pushing, lit on the rim
  if (m > 0.08) {
    ctx.strokeStyle = 'rgba(242,204,58,' + (0.35 + m * 0.6).toFixed(2) + ')'; ctx.lineWidth = 4; ctx.shadowColor = 'rgba(242,204,58,0.8)'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(ox, oy, R + 1, ang - 0.45 - m * 0.25, ang + 0.45 + m * 0.25); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(242,204,58,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + kx, oy + ky); ctx.stroke();
  }
  // the knob
  const kr = 22 * k, x = ox + kx, y = oy + ky, kg = ctx.createRadialGradient(x - kr * 0.3, y - kr * 0.35, 1, x, y, kr);
  kg.addColorStop(0, 'rgba(255,240,170,0.95)'); kg.addColorStop(0.45, 'rgba(242,204,58,0.75)'); kg.addColorStop(1, 'rgba(150,110,20,0.55)');
  ctx.shadowColor = 'rgba(242,204,58,0.6)'; ctx.shadowBlur = 16 * (0.4 + m);
  ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(x, y, kr, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(23,20,11,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, kr - 5, 0, TAU); ctx.stroke();
  ctx.restore();
}

/* ================= HUD ================= */
const hc = {};
// the wave clock at the top: wave number, time to the next wave, zombies left; red for the last five seconds
function updClock() {
  const brk = G.breakT > 0, hold = NET.role === 'client' ? !!G.clockHold : !!(G.boss && !G.boss.dead);
  const tm = brk ? BREAK_SECS : G.waveMax, tl = brk ? G.breakT : G.waveT, off = !brk && !(tm > 0);
  const red = !off && !hold && tl > 0 && tl <= 5, st = brk ? 'brk' : off ? 'off' : hold ? 'hold' : 'run';
  const box = $('waveBox');
  if (hc.cst !== st) { hc.cst = st; box.dataset.st = st; setTxt('waveCap', brk ? 'Cleared · next wave in' : off ? 'Clear the street' : hold ? 'The boss holds the clock' : 'Next wave in'); }
  if (hc.cred !== red) { hc.cred = red; box.classList.toggle('red', red); $('hud').classList.toggle('clock-red', red); }
  const sec = off ? -1 : Math.ceil(tl);
  if (hc.csec !== sec) {
    hc.csec = sec; setTxt('waveTime', off ? '--:--' : fmtClock(tl));
    if (red) { box.classList.remove('beat'); void box.offsetWidth; box.classList.add('beat'); }
  }
  const fw = off ? 1 : clamp(tl / Math.max(1, tm), 0, 1), fwk = Math.round(fw * 500);
  if (hc.cfw !== fwk) { hc.cfw = fwk; $('waveFill').style.width = (fw * 100).toFixed(1) + '%'; }
  const left = NET.role === 'client' ? (G.zLeftN | 0) : zLeft();
  setTxt('waveLeft', brk ? 'Street clear' : innerWidth < 420 ? left + ' left' : left === 1 ? '1 zombie left' : left + ' zombies left');
}
function setTxt(id, v) { if (hc[id] !== v) { hc[id] = v; $(id).textContent = v; } }
function updHud() {
  const p = G.p; if (!p) return;
  const f = clamp(p.hp / p.maxHp, 0, 1), fk = Math.round(f * 300);
  if (hc.hpw !== fk) { hc.hpw = fk; $('hpFill').style.width = (f * 100).toFixed(1) + '%'; $('hpBox').style.setProperty('--hp', f.toFixed(3)); }
  // the ghost: the health just lost hangs behind the bar for a moment, then drains away
  { const now = performance.now(), gdt = Math.min(0.1, (now - (hc.gt || now)) / 1000); hc.gt = now;
    if (hc.ghost == null || f >= hc.ghost) { hc.ghost = f; hc.gHold = 0; } else if (fk !== hc.gk) { hc.gHold = 0.45; }
    hc.gk = fk; if (hc.gHold > 0) hc.gHold -= gdt; else hc.ghost = Math.max(f, hc.ghost - gdt * 0.5);
    const gw = Math.round(hc.ghost * 400); if (hc.gw !== gw) { hc.gw = gw; $('hpGhost').style.width = (hc.ghost * 100).toFixed(1) + '%'; } }
  { const lv = f < 0.15 ? 2 : f < 0.3 ? 1 : 0; if (hc.lv !== lv) { hc.lv = lv; const hd = $('hud'); hd.classList.toggle('low', lv >= 1); hd.classList.toggle('crit', lv >= 2); } }
  updClock();
  setTxt('hpText', Math.ceil(Math.max(0, p.hp)) + ' / ' + Math.round(p.maxHp));
  setTxt('waveNum', String(G.wave)); setTxt('scoreNum', G.score.toLocaleString()); setTxt('killNum', G.kills === 1 ? '1 kill' : G.kills.toLocaleString() + ' kills');
  const fx = (p.poisonT > 0 ? 'P' : '') + (p.burnT > 0 ? 'B' : '') + (p.slowT > 0 ? 'C' : '') + (p.jamT > 0 ? 'J' : '') + (p.weakT > 0 ? 'W' : '') + (p.frozenT > 0 ? 'F' : '') + (p.rootT > 0 ? 'R' : '') + (p.blindT > 0 ? 'X' : '') + (p.bleedT > 0 ? 'L' : '');
  if (hc.fx !== fx) {
    hc.fx = fx; const box = $('fxChips'); box.textContent = '';
    const add = (t, c) => { const s = document.createElement('span'); s.className = 'fx-chip'; s.style.color = c; s.textContent = t; box.appendChild(s); };
    if (p.poisonT > 0) add('Poisoned', '#b8ec4a'); if (p.burnT > 0) add('Burning', '#ff8a2a'); if (p.slowT > 0) add('Slowed', '#9fd3ff'); if (p.jamT > 0) add('Jammed', '#fff36b');
    if (p.weakT > 0) add('Weakened', '#e6b3ff'); if (p.frozenT > 0) add('Frozen', '#9ff6ff'); if (p.rootT > 0) add('Rooted', '#b5d36a'); if (p.blindT > 0) add('Blinded', '#c9c9c9'); if (p.bleedT > 0) add('Bleeding', '#ff5a5a');
  }
  const b = G.boss && !G.boss.dead ? G.boss : null;
  if (!!b !== hc.boss) { hc.boss = !!b; $('bossBar').hidden = !b; $('hud').classList.toggle('has-boss', !!b); }
  if (b) {
    setTxt('bossName', b.rb ? b.rb.def.forms[b.rb.form].name : b.m.unique ? b.m.name : 'Alpha ' + b.m.name);
    let info = '';
    if (b.snatch) { const s = b.snatch; info = s.state === 'grabTele' ? 'Grab incoming. Get out of the circle!' : s.state === 'holding' ? 'Grabbed. Tap the circles!' : s.state === 'stunned' ? 'Stunned. Hit it now!' : s.grabCd > 0 ? 'Grab ready in ' + Math.ceil(s.grabCd) + 's' : 'Grab ready'; }
    else if (b.rb) { const r = b.rb, n = r.def.forms.length; info = r.mutT > 0 ? 'MUTATING' : r.state === 'holding' ? 'Grabbed. Tap the circles!' : r.state === 'stunned' ? 'Stunned. Hit it now!' : r.def.overlord ? (r.form ? 'Second health bar · it will not stop' : 'First health bar · ' + (n - r.form) + ' bars left') : (n > 1 ? 'Form ' + (r.form + 1) + ' of ' + n + (r.form < n - 1 ? ' · mutates when hurt' : ' · final form') : r.def.title) + (r.roam ? ' · roaming' : ''); }
    else if (b.abs[1]) { const ab = ABILITIES.find(a => a.key === b.abs[1]); info = 'Extra mutation: ' + (ab ? ab.name : ''); }
    setTxt('bossInfo', info);
    const two = !!(b.rb && b.rb.def.overlord), f = clamp(b.hp / b.maxHp, 0, 1), f1 = two ? clamp(f * 2 - 1, 0, 1) : f, f2 = two ? clamp(f * 2, 0, 1) : 0;
    if (hc.two !== two) { hc.two = two; $('bossBar').classList.toggle('two', two); }
    const bf = Math.round(f1 * 300) + Math.round(f2 * 300) * 1000; if (hc.bf !== bf) { hc.bf = bf; $('bossFill').style.width = (f1 * 100).toFixed(1) + '%'; $('bossFill2').style.width = (f2 * 100).toFixed(1) + '%'; } }
  const since = G.time - G.lastKill, live = G.chain >= 3 && since < CHAIN_WINDOW;
  if (hc.combo !== live) { hc.combo = live; $('combo').hidden = !live; }
  if (live) {
    if (hc.cn !== G.chain) { hc.cn = G.chain; $('comboN').textContent = 'x' + G.chain; $('combo').style.setProperty('--cc', chainColor(G.chain)); const cb = $('combo'); cb.classList.remove('pop'); void cb.offsetWidth; cb.classList.add('pop'); }
    $('comboBar').style.width = ((1 - since / CHAIN_WINDOW) * 100).toFixed(1) + '%';
  }
  const ak = (G.air || 0) + G.mode; if (hc.air !== ak) { hc.air = ak; updAirBtn(); }
  const cd = p.dashCdT > 0 ? 1 - p.dashCdT / (p.dashCdMax || p.dashCd) : 1, ck = Math.round(cd * 40);
  if (hc.cd !== ck) { hc.cd = ck; const db = $('dashBtn'); db.style.setProperty('--cd', cd.toFixed(3)); db.classList.toggle('cool', cd < 1); }
  if (p.arm) armsHud();   // the rounds in the gun, the reload, the other gun
}

// the height of the top bar, for what hangs under it (the radio, the boss bar, the song ticker)
try {
  const hxTop = document.querySelector('.hx-top');
  if (hxTop && window.ResizeObserver) new ResizeObserver(() => { const h = hxTop.getBoundingClientRect().height; if (h > 0) $('app').style.setProperty('--hx-top-h', Math.round(h + 8) + 'px'); }).observe(hxTop);
} catch (e) { /* older browsers keep the default */ }

/* ================= loop ================= */
function update(dt) {
  if (NET.role === 'client') { netClientUpdate(dt); return; }
  G.time += dt; if (G.hintT > 0) G.hintT -= dt;
  DEV.useT[DEV.kind] += dt;
  updPlayer(dt);
  if (typeof balSettle === 'function') balSettle(G.p, dt);
  const host = NET.role === 'host' && NET.started;
  if (host) netHostPre(dt);
  spawner(dt);
  buildGrid();
  if (typeof swarmTick === 'function') swarmTick(dt);   // hordes coming in, the crowd moving as one, who thinks how often
  { const pcx = Math.floor(G.p.x / FF_CS), pcy = Math.floor(G.p.y / FF_CS), stale = F => !F.ready || F.n !== FF_N || Math.abs(pcx - F.pcx) + Math.abs(pcy - F.pcy) >= 2;
    if (stale(FF) || G.time - FF.t > flowIv()) buildField(FF);   // (on Auto it follows what a field costs here; the engine room's Eco refreshes less often, Hard and Max more)
    // the wide fields only while something that big is chasing, and never both in the same frame
    else if (G.needFS && (stale(FFS) || G.time - FFS.t > 0.6)) buildField(FFS);
    else if (G.needFB && (stale(FFB) || G.time - FFB.t > 0.6)) buildField(FFB);
    else if (G.needFP && (stale(FFP) || G.time - FFP.t > 0.6)) buildField(FFP);
    else fieldsCoop();   // (1.9.994: each player's own field in co-op, and the long-range ones)
    let nb = 0, ns = 0, np = 0; for (const z of G.zs) { if (z.dead || z.fly) continue; if (zBig(z)) ns++; else if (z.r >= 16) nb++; else if (z.hd && z.pushOk && z.pkT > G.time) np++; } G.needFB = nb > 0; G.needFS = ns > 0; G.needFP = np > 0; }
  if (G.cineT > 0) G.cineT -= dt;
  let nf = 0; for (const z of G.zs) if (z.fly && !z.dead) nf++; G.nFly = nf;
  const fr = Math.max(W, H) / ZOOM * 0.75 + 220, far2 = fr * fr, px = G.p.x, py = G.p.y, me = G.p;
  for (let i = 0; i < G.zs.length; i++) {
    const z = G.zs[i]; if (z.dead) continue;
    if (host) G.p = netTarget(z);   // co-op: each zombie goes after the nearest standing player
    // the crowd engine's level of detail: off screen a zombie thinks every second, third or fourth frame
    if (z.swF === frameNo) {
      const sl = z.simL | 0;
      if (sl) { z.lodAcc = (z.lodAcc || 0) + dt; if (((frameNo + (z.nid | 0)) % (sl + 1)) !== 0 && z.lodAcc < 0.14) continue; const d = z.lodAcc; z.lodAcc = 0; updZ(z, d); continue; }
    } else if (Q.sim > 1 && !z.boss && !z.rb && !z.m.unique) {
      const dx = z.x - G.p.x, dy = z.y - G.p.y;
      if (dx * dx + dy * dy > far2) {
        z.lodAcc = (z.lodAcc || 0) + dt;
        if (((frameNo + ((z.bob * 1000) | 0)) % Q.sim) !== 0 && z.lodAcc < 0.12) continue;
        const d = z.lodAcc; z.lodAcc = 0; updZ(z, d); continue;
      }
    }
    if (z.lodAcc) { const d = Math.min(0.15, z.lodAcc + dt); z.lodAcc = 0; updZ(z, d); } else updZ(z, dt);
  }
  G.p = me;
  if (typeof swarmVehTick === 'function') swarmVehTick(dt);   // the crowd's push on parked vehicles
  updBullets(dt); updEshots(dt); updHaz(dt); updPicks(dt); updBlasts(dt); updJets(dt); updDash(dt); updAirFx(dt); updWorld(dt);
  catchUp(dt);
  if (host) netHostPost();
  G.zs = G.zs.filter(z => !z.dead);
  updFx(dt);
  if (G.boss && G.boss.dead) G.boss = null;
  const ct = host && G.p.down ? (netAlive()[0] || G.p) : G.p;   // down in co-op: the camera follows a teammate
  gcamTick(dt, ct === G.p ? G.p : null);   // MIMATIC directs the run's camera: lead room, focus, recoil (gamecam.js)
  const k = Math.min(1, dt * 7); cam.x += (ct.x + GCAM.ox.x - cam.x) * k; cam.y += (ct.y + GCAM.oy.x - cam.y) * k;
  if (G.skullPending && G.mode === 'play') { openSkull(); return; }
  if (G.mode === 'play' && breakTick(dt)) return;
  if (G.mode === 'play' && waveTick(dt)) return;
  if (G.mode === 'play' && G.spawnQ <= 0 && !G.bossPending && (typeof swarmDone !== 'function' || swarmDone()) && !G.zs.some(z => !z.illusion)) waveCleared();
}
// The city is big enough to explore now, so zombies left far behind (stuck around a block, or outrun) come back
// in again just off screen after a few seconds, instead of leaving a wave that never ends.
function catchUp(dt) {
  const p = G.p; if (!p || G.mode !== 'play') return;
  const far = Math.max(W, H) / ZOOM * 0.9 + 520, far2 = far * far;
  for (const z of G.zs) {
    if (z.dead || z.illusion || (z.snatch && z.snatch.state !== 'idle') || (z.rb && z.rb.state !== 'idle' && z.rb.state !== 'chase')) continue;
    const dx = z.x - p.x, dy = z.y - p.y;
    if ((NET.role === 'host' ? netNearD2(z.x, z.y) : dx * dx + dy * dy) < far2) { z.farT = 0; continue; }
    z.farT = (z.farT || 0) + dt;
    if (z.farT > (z.boss ? 2 : 3.5)) { const s = spawnPos(); z.x = s.x; z.y = s.y; z.vx = z.vy = z.kvx = z.kvy = 0; z.farT = 0; z.losT = 0; }
  }
}
let last = performance.now();
function frame(now) {
  if (now === PERF.lastNow) return;            // a duplicate loop (left over from a watchdog restart) ends here
  PERF.lastNow = now; PERF.lastFrame = performance.now();
  const rawIv = PERF.lastRaf ? now - PERF.lastRaf : 16.7; PERF.lastRaf = now; trackHz(rawIv);
  // frame-rate limit: on a 90/120 Hz screen the game still draws at 60 by default, which halves the work
  const cap = effCap();
  if (cap && cap < PERF.hz - 3 && now - PERF.lastDraw < 1000 / cap - 4) { requestAnimationFrame(frame); return; }
  const iv = PERF.lastDraw ? now - PERF.lastDraw : 16.7; PERF.lastDraw = now;
  const rdt = Math.min(0.05, (now - last) / 1000); last = now; frameNo++; G.rdt = rdt;
  let dt = rdt;
  if (G.slowT > 0) { G.slowT -= rdt; dt = rdt * 0.3; }
  if (G.tierFlash > 0) G.tierFlash = Math.max(0, G.tierFlash - rdt * 2.5);
  const t0 = performance.now();
  try {
    if (SFX.tick) SFX.tick();
    padPoll(rdt);
    netTick(rdt);
    // the music light show (the city pulsing to the radio, the bars along the bottom) is paused while 2.0 is built
    vzNow = VIZ_PAUSED ? null : vizFrame();
    if (G.mode === 'play') update(dt);
    else if (G.mode === 'cine') updCine(dt);
    else if (G.mode === 'title' && !legendCover()) { G.time += dt; updAttract(dt); updWorld(dt); legendIdleWarm(); }
    // the Legends screen covers the city: it is not simulated or drawn underneath, the cinematic gets the frame
    if ((G.mode === 'play' || G.mode === 'title' || G.mode === 'cine') && !(G.mode === 'title' && legendCover())) updWeather(dt, rdt);
    else if (G.mode === 'over') { G.time += dt; updFx(dt); }
    else if (G.mode === 'intro') introFrame(rdt);
    if (G.mode !== 'intro') { if (G.mode === 'title' && legendCover()) legendFrame(rdt); else render(); }
    if (INTRO.fading) introFadeFrame(rdt);
    if (G.mode === 'play' || G.mode === 'pause' || G.mode === 'upgrade' || G.mode === 'skull' || G.mode === 'cine') { updHud(); bossMusic(); updWhere(); }
    updFpsBox(now);
    SFX.setScene(G.mode === 'intro' ? 'intro' : G.mode === 'skull' ? 'skull' : G.mode === 'cine' ? 'cine' : G.mode === 'play' ? ((G.boss && !G.boss.dead) || G.chain >= 25 ? 'drop' : 'play') : G.mode === 'upgrade' ? 'break' : G.mode === 'pause' ? 'pause' : G.mode === 'over' ? 'over' : 'title', G.mode === 'title' ? 0 : G.wave);
    if (frameNo % 120 === 0 && G.mode === 'title') $('seasonLeft').textContent = seasonLeft();
  } catch (err) { perfError(err); }
  perfFrame(now, iv, performance.now() - t0);
  coreTick(performance.now());
  requestAnimationFrame(frame);
}

/*__ARSENAL__*/
resize();
applyDev();
// starting up, behind the loading screen that has been showing since the page opened: fonts, the city for the title
// screen, the menus. Then the studio intro (tests and ?nointro links go straight to the title).
G.attractReady = false;
loadRun('Starting Zombie City', [
  ['Loading the fonts', () => Promise.race([document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(), loadWait(1500)])],
  ['Waking the city', () => { initAttract(); G.attractReady = true; return chunkJobs(cam.x, cam.y); }],
  ['Warming up the lights and sprites', () => warmJobs()],
  ['Opening the bunker', () => { refreshTitle(); }]
], { now: true }).then(() => {
  // the studio intro is retired while 2.0 is built: the game opens on the title screen (add ?intro to the address to see the old one)
  if (/[?#&]intro\b/.test(location.href) && !window.ZC_NO_INTRO) startIntro(); else { $('intro').hidden = true; showOv('title'); }
});
requestAnimationFrame(frame);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { sprites.clear(); });
/*__TESTHOOK__*/
})();
