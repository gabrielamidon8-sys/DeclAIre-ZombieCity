/* ================= SWARM: the crowd engine =================
   Zombies by the hundred, moving as one, and heavy enough to shove a car out of the way.
   - One spatial grid for every zombie, rebuilt each frame with a counting sort into flat typed arrays (no garbage), that
     every other part of the game asks "who is near here?" through (bullets, blasts, abilities, the lights).
   - One crowd pass over every pair of neighbours, each pair once: bodies push each other apart by weight (a brute
     shoulders a small one aside), zombies heading the same way fall in step and speed up together (up to about a
     third faster in a dense stream), and a zombie leaning into another passes its push on down the line.
   - Hordes: from wave 3 the trickle of zombies is joined by packs, hordes and, later, droves of a hundred or more, mostly
     of one kind, that gather out of sight on one side, march in formation at one pace and surge when they see you.
     How many can be alive at once follows the device (500 and more on most, up to about 840 on fast ones, more in
     co-op) and steps down on its own if the frame cannot keep up.
   - Levels of detail: zombies off screen think every second, third or fourth frame; on screen the nearest get their
     full textured picture and every effect, the rest a small picture cropped tight to the body, drawn in one pass
     without saving and restoring the canvas for each one; new pictures are made a few per frame, nearest first,
     with a stand-in until theirs is ready.
   - Physics: every parked vehicle has a real weight and grip. A zombie pushes with about 220 newtons (more if it is
     bigger); the zombies pressed up behind it push through it. When the crowd's push beats the grip the vehicle slides,
     slows on its own friction, scrapes along walls and shoves the next car. A parked sedan takes about 50 zombies to
     move sideways (30 lengthwise, where its free wheels roll), an SUV about 70, a city bus about 360 and a semi about
     460; burned-out wrecks on their rims go easier. Moved vehicles stay where the crowd left them, in co-op too.
   - It looks after itself: it watches its own cost, checks its grid, its hordes and its vehicles, repairs what is
     broken, rests a part that keeps failing, and the plain crowd code covers for it if it ever has to stop. */
const SW_TIER_CAP = [500, 560, 680, 840];
const SW_SIZE = { auto: 1, small: 0.45, big: 1.6, huge: 2.6 };
const SW_F0 = 220, SW_G = 9.81;
// vehicles: weight in kilograms (empty, as left in the street)
const SW_VM = { hatch: 1150, sedan: 1450, wagon: 1550, coupe: 1400, suv: 2100, pickup: 2250, van: 2500, minivan: 2000, taxi: 1550, police: 1800, ambulance: 4500, fire: 17000, box: 7500, bus: 12500, school: 11000, semi: 16000, garbage: 15000, humvee: 2700, apc: 14000, moto: 220, camper: 5500, icecream: 4200 };
const SW_HEAVY = { ambulance: 1, fire: 1, box: 1, bus: 1, school: 1, semi: 1, garbage: 1, apc: 1, camper: 1, icecream: 1 };
const SW_DIRS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
const SWARM = {
  offUntil: 0, errT: [], partOff: {}, adapt: 0, bad: 0, badWhy: '',
  cap: 560, capLive: 560, capT: 0, usT: 2,
  // the grid
  cs: 64, gx0: 0, gy0: 0, gw: 0, gh: 0, cnt: new Int32Array(4096), cur: new Int32Array(4096), ord: new Int32Array(1024), zc: new Int32Array(1024), L: [], big: [], n: 0, gridF: -1, bigR: 24,
  A: null, cap2: 0, PV: [],   // the crowd pass works on flat arrays (positions, sizes, speeds, results), not on the zombie objects
  // hordes
  hordes: [], hb: new Map(), hid: 0, plan: [], planT: 0, pending: 0,
  // vehicles (the moving ones live in SWDYN, which the collision code reads too)
  moved: new Map(), act: new Set(), ext: new Set(), vDirty: new Set(), scrapeT: 0,
  // drawing
  vis: [], visF: -1, fl: [], flS: [], ov: [], ovL: [], lo: new Map(), imp: new Map(), keys: new Set(), budF: 0, budL: 0,
  lodN: [0, 0, 0, 0], simN: [0, 0, 0, 0],
  // what it costs
  ms: 0, msAvg: 0, msDraw: 0, msDrawAvg: 0, good: 0, watchT: 0,
  stats: { hordes: 0, droves: 0, peak: 0, cars: 0, made: 0, lo: 0, stand: 0 }
};
const SW_ST = { ux: 0, uy: 0, k: 1 };
const SW_SP = { c: null, sx: 0, sy: 0, sw: 1, sh: 1, ox: 0, oy: 0, w: 1, h: 1 };

/* ---------- switches ---------- */
function swarmUp() { return !(SWARM.offUntil && performance.now() < SWARM.offUntil); }
function swarmOn(part) { if (!swarmUp()) return false; const t = SWARM.partOff[part]; return !(t && performance.now() < t); }
function swarmSizeK() { return SW_SIZE[SET.swarm] || 1; }
function swarmPushOn() { return SET.swarmPush !== false && swarmOn('push'); }
function swarmCoopK() { return NET.role === 'host' && NET.started ? Math.min(1.9, 1 + 0.3 * (netPlayers().length - 1)) : 1; }
// how many can be alive at once: the device's tier, the Horde size setting, co-op, and what the frame can take
function swarmCaps() {
  const base = SW_TIER_CAP[clamp(PERF.tier | 0, 0, 3)];
  const k = SET.swarm === 'small' ? 0.45 : SET.swarm === 'huge' ? 1.35 : 1;
  SWARM.cap = Math.round(clamp(base * k * swarmCoopK(), 120, 1400));
  SWARM.capLive = clamp(SWARM.capLive || SWARM.cap, Math.round(SWARM.cap * 0.4), SWARM.cap);
}
function swarmCapLive() { return swarmUp() ? SWARM.capLive : 120; }

/* ---------- the grid ---------- */
// every live zombie into cells of a flat grid over the box they stand in (a counting sort: no arrays per cell)
function swarmGrid() {
  const zs = G.zs, L = SWARM.L; L.length = 0;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < zs.length; i++) {
    const z = zs[i]; if (z.dead) continue;
    if (!(z.x === z.x && z.y === z.y) || Math.abs(z.x) > 1e8 || Math.abs(z.y) > 1e8) { z.dead = true; SWARM.bad++; SWARM.badWhy = 'a zombie with a broken position'; continue; }
    L.push(z); if (z.x < x0) x0 = z.x; if (z.x > x1) x1 = z.x; if (z.y < y0) y0 = z.y; if (z.y > y1) y1 = z.y;
  }
  const n = L.length; SWARM.n = n; SWARM.gridF = frameNo;
  if (!n) { SWARM.gw = SWARM.gh = 0; return; }
  let cs = 64; while ((Math.floor((x1 - x0) / cs) + 1) * (Math.floor((y1 - y0) / cs) + 1) > 65536) cs *= 2;
  const gw = Math.floor((x1 - x0) / cs) + 1, gh = Math.floor((y1 - y0) / cs) + 1, cells = gw * gh;
  if (SWARM.cnt.length < cells + 1) { SWARM.cnt = new Int32Array(cells + 1024); SWARM.cur = new Int32Array(cells + 1024); }
  if (SWARM.ord.length < n) { SWARM.ord = new Int32Array(n * 2); SWARM.zc = new Int32Array(n * 2); }
  const cnt = SWARM.cnt, cur = SWARM.cur, ord = SWARM.ord, zc = SWARM.zc; cnt.fill(0, 0, cells + 1);
  for (let i = 0; i < n; i++) { const z = L[i], c = Math.floor((z.y - y0) / cs) * gw + Math.floor((z.x - x0) / cs); zc[i] = c; cnt[c + 1]++; z.swI = i; }
  for (let c = 0; c < cells; c++) cnt[c + 1] += cnt[c];
  cur.set(cnt.subarray(0, cells));
  for (let i = 0; i < n; i++) ord[cur[zc[i]]++] = i;
  SWARM.cs = cs; SWARM.gx0 = x0; SWARM.gy0 = y0; SWARM.gw = gw; SWARM.gh = gh;
}
// every zombie whose cell touches the circle (the caller checks the distance); stop early by returning false
function swarmNear(x, y, rad, fn) {
  const gw = SWARM.gw; if (!gw) return;
  const cs = SWARM.cs, x0 = SWARM.gx0, y0 = SWARM.gy0, cnt = SWARM.cnt, ord = SWARM.ord, L = SWARM.L;
  const i0 = Math.max(0, Math.floor((x - rad - x0) / cs)), i1 = Math.min(gw - 1, Math.floor((x + rad - x0) / cs));
  const j0 = Math.max(0, Math.floor((y - rad - y0) / cs)), j1 = Math.min(SWARM.gh - 1, Math.floor((y + rad - y0) / cs));
  for (let j = j0; j <= j1; j++) { const row = j * gw; for (let i = i0; i <= i1; i++) { const c = row + i, e = cnt[c + 1]; for (let k = cnt[c]; k < e; k++) if (fn(L[ord[k]]) === false) return; } }
}

/* ---------- the crowd pass ---------- */
// the flat arrays the pass reads and writes (grown as the crowd grows)
function swarmArrays(n) {
  if (SWARM.A && SWARM.cap2 >= n) return SWARM.A;
  const m = Math.max(1024, n * 2), F = () => new Float32Array(m);
  SWARM.A = { X: F(), Y: F(), R: F(), VX: F(), VY: F(), SX: F(), SY: F(), AVX: F(), AVY: F(), PT: F(), PNX: F(), PNY: F(), FL: new Uint8Array(m), NB: new Uint16Array(m), AL: new Uint16Array(m), PK: new Uint16Array(m), PD: new Uint8Array(m) };
  SWARM.cap2 = m; return SWARM.A;
}
// one pair of neighbours: weight-shared push apart, falling in step, and passing a push along
function swarmPair(i, j, A) {
  const X = A.X, Y = A.Y, ex = X[i] - X[j], ey = Y[i] - Y[j], d2 = ex * ex + ey * ey;
  if (d2 < 4096) { A.PK[i]++; A.PK[j]++; }
  const ra = A.R[i], rb = A.R[j], rr = ra + rb, Rf = rr * 2.2; if (d2 > Rf * Rf) return;
  const d = Math.sqrt(d2) || 0.01, nx = ex / d, ny = ey / d;
  if (d < rr) { const push = (rr - d) / rr, ma = ra * ra, mb = rb * rb, wa = 2 * mb / (ma + mb), wb = 2 * ma / (ma + mb); A.SX[i] += nx * push * wa; A.SY[i] += ny * push * wa; A.SX[j] -= nx * push * wb; A.SY[j] -= ny * push * wb; }
  A.NB[i]++; A.NB[j]++;
  const avx = A.VX[i], avy = A.VY[i], bvx = A.VX[j], bvy = A.VY[j], av = avx * avx + avy * avy, bv = bvx * bvx + bvy * bvy;
  if (av > 64 && bv > 64) {
    const dot = avx * bvx + avy * bvy;
    if (dot > 0.72 * Math.sqrt(av * bv)) { A.AL[i]++; A.AL[j]++; A.AVX[i] += bvx; A.AVY[i] += bvy; A.AVX[j] += avx; A.AVY[j] += avy; }
  }
  // pressed together: the one leaning into the other takes up its push on a vehicle
  if (d < rr + 3 && (A.PT[i] > 0 || A.PT[j] > 0)) {
    const PT = A.PT, PD = A.PD;
    if (PT[j] > 0 && PD[j] < 16 && (!(PT[i] > 0) || PD[j] + 1 < PD[i]) && -(avx * nx + avy * ny) > 0.45 * Math.sqrt(av)) { SWARM.PV[i] = SWARM.PV[j]; PD[i] = PD[j] + 1; PT[i] = 0.3; A.PNX[i] = A.PNX[j]; A.PNY[i] = A.PNY[j]; }
    else if (PT[i] > 0 && PD[i] < 16 && (!(PT[j] > 0) || PD[i] + 1 < PD[j]) && (bvx * nx + bvy * ny) > 0.45 * Math.sqrt(bv)) { SWARM.PV[j] = SWARM.PV[i]; PD[j] = PD[i] + 1; PT[j] = 0.3; A.PNX[j] = A.PNX[i]; A.PNY[j] = A.PNY[i]; }
  }
}
const swSkip = z => z.fly || z.st.under || z.illusion;
function swarmCrowd(dt) {
  const L = SWARM.L, n = L.length, gw = SWARM.gw, gh = SWARM.gh, cnt = SWARM.cnt, ord = SWARM.ord, fr = frameNo;
  const bigR = SWARM.bigR = SWARM.cs * 0.38, big = SWARM.big; big.length = 0; let maxR = 0;
  const A = swarmArrays(n), X = A.X, Y = A.Y, R = A.R, FL = A.FL, PV = SWARM.PV; PV.length = n;
  A.SX.fill(0, 0, n); A.SY.fill(0, 0, n); A.AVX.fill(0, 0, n); A.AVY.fill(0, 0, n); A.NB.fill(0, 0, n); A.AL.fill(0, 0, n); A.PK.fill(0, 0, n);
  for (let i = 0; i < n; i++) {
    const z = L[i], sk = swSkip(z);
    X[i] = z.x; Y[i] = z.y; R[i] = z.r; A.VX[i] = z.vx || 0; A.VY[i] = z.vy || 0;
    const pt = z.pt > 0 ? z.pt - dt : 0; A.PT[i] = pt; A.PD[i] = pt > 0 ? z.pd | 0 : 0; PV[i] = pt > 0 ? z.pv : null; A.PNX[i] = z.pnx || 0; A.PNY[i] = z.pny || 0;
    FL[i] = sk || z.r > bigR ? 1 : 0;   // left out of the cell pass: flying, underground, illusions, the big ones
    if (!sk && z.r > bigR) { big.push(z); if (z.r > maxR) maxR = z.r; }
  }
  if (gw) {
    const cells = gw * gh;
    for (let c = 0; c < cells; c++) {
      const s = cnt[c], e = cnt[c + 1]; if (s === e) continue;
      const ci = c % gw, cj = (c - ci) / gw, right = ci + 1 < gw, down = cj + 1 < gh;
      for (let p = s; p < e; p++) {
        const i = ord[p]; if (FL[i]) continue;
        const rc = (R[i] + bigR) * 2.2, rc2 = rc * rc, ax = X[i], ay = Y[i];
        for (let q = p + 1; q < e; q++) { const j = ord[q]; if (FL[j]) continue; const ex = ax - X[j], ey = ay - Y[j]; if (ex * ex + ey * ey < rc2) swarmPair(i, j, A); }
        if (right) swarmCell(i, c + 1, rc2, A);
        if (down) { if (ci > 0) swarmCell(i, c + gw - 1, rc2, A); swarmCell(i, c + gw, rc2, A); if (right) swarmCell(i, c + gw + 1, rc2, A); }
      }
    }
    // the big ones (brutes, colossi, bosses) against everyone in reach, each pair once (two big ones: from the older's side)
    for (const a of big) { const i = a.swI; swarmNear(a.x, a.y, a.r + maxR + 8, b => { if (b === a || swSkip(b) || (b.r > bigR && (b.nid | 0) <= (a.nid | 0))) return; swarmPair(i, b.swI, A); }); }
  }
  for (let i = 0; i < n; i++) {
    const z = L[i]; z.swF = fr; z.sepX = A.SX[i]; z.sepY = A.SY[i]; z.nbN = A.NB[i]; z.alN = A.AL[i]; z.avX = A.AVX[i]; z.avY = A.AVY[i]; z.pk = A.PK[i];
    z.pt = A.PT[i]; if (z.pt > 0) { z.pd = A.PD[i]; z.pv = PV[i]; z.pnx = A.PNX[i]; z.pny = A.PNY[i]; } else z.pv = null;
  }
}
function swarmCell(i, c, rc2, A) {
  const cnt = SWARM.cnt, ord = SWARM.ord, X = A.X, Y = A.Y, FL = A.FL, e = cnt[c + 1], ax = X[i], ay = Y[i];
  for (let k = cnt[c]; k < e; k++) { const j = ord[k]; if (FL[j]) continue; const ex = ax - X[j], ey = ay - Y[j]; if (ex * ex + ey * ey < rc2) swarmPair(i, j, A); }
}
// how often each zombie thinks: every frame near the players, less often the further off screen it is
function swarmSimLod() {
  const L = SWARM.L, sn = SWARM.simN, host = NET.role === 'host' && NET.started, p = G.p; sn[0] = sn[1] = sn[2] = sn[3] = 0;
  if (!p) return;
  const hw = W / ZOOM / 2, hh = H / ZOOM / 2, s2 = hw * hw + hh * hh, heavy = SWARM.adapt <= -2 && L.length > 350;
  for (let i = 0; i < L.length; i++) {
    const z = L[i]; let lv = 0;
    if (!z.boss && !z.rb && !z.m.unique) {
      const d2 = host ? netNearD2(z.x, z.y) : (z.x - p.x) * (z.x - p.x) + (z.y - p.y) * (z.y - p.y);
      lv = d2 < s2 * 1.25 ? (heavy && d2 > s2 * 0.5 ? 1 : 0) : d2 < s2 * 3.2 ? 1 : (SWARM.adapt <= -1 || L.length > 300 ? 3 : 2);
    }
    z.simL = lv; sn[lv]++;
  }
}
// what the crowd does to one zombie's heading and pace (called from its own update)
function swarmSteer(z, ux, uy, d) {
  let k = 1;
  if (z.alN > 0 && !z.boss && swarmOn('flock')) {
    // moving together: each one heading the same way within arm's reach adds a little pace
    k += Math.min(0.32, 0.03 * z.alN);
    if (d > 140) { const l = Math.hypot(z.avX, z.avY) || 1, w = Math.min(0.35, 0.07 * z.alN); ux = ux * (1 - w) + z.avX / l * w; uy = uy * (1 - w) + z.avY / l * w; const m = Math.hypot(ux, uy) || 1; ux /= m; uy /= m; }
  }
  const H = z.hd ? SWARM.hb.get(z.hd) : null;
  if (H) {
    if (H.state === 'march') {
      // a horde on the march keeps together and keeps one pace
      const cx = H.cx - z.x, cy = H.cy - z.y, cd = Math.hypot(cx, cy) || 1, pull = clamp((cd - H.rad) / H.rad, 0, 1) * 0.6;
      ux = ux * (1 - pull) + cx / cd * pull; uy = uy * (1 - pull) + cy / cd * pull; const m = Math.hypot(ux, uy) || 1; ux /= m; uy /= m;
      k = clamp(H.pace / Math.max(20, z.speed), 0.6, 1.35) * (1 + Math.min(0.2, 0.02 * z.alN));
    } else if (H.surgeT > 0) k *= 1.22;
    // surrounding you: a horde that is close fans out to either side (each member keeps its own side), so it closes in
    // as a ring rather than a queue; it converges again for the last few metres
    if (H.state !== 'march' && H.k >= 12 && z.los && swarmOn('flock')) {
      const u = 32 * SCL / SCALE_REAL, near = 3 * u, far = 13 * u;
      if (d > near && d < far) {
        if (z.encS === undefined) z.encS = (Math.random() * 2 - 1);
        const f = Math.sin(clamp((d - near) / (far - near), 0, 1) * Math.PI), a = z.encS * 0.95 * f, c = Math.cos(a), sn = Math.sin(a);
        const nx = ux * c - uy * sn, ny = ux * sn + uy * c; ux = nx; uy = ny; k *= 1 + 0.08 * Math.abs(z.encS) * f;
      }
    }
  }
  z.swk = k; SW_ST.ux = ux; SW_ST.uy = uy; SW_ST.k = k; return SW_ST;
}

/* ---------- hordes ---------- */
// the wave's hordes: how many zombies come in groups on top of the trickle, and in how many groups
function swarmWave(n) {
  SWARM.plan.length = 0; SWARM.pending = 0;
  if (!swarmOn('hordes') || NET.role === 'client') return;
  let budget = n < 3 ? 0 : Math.round(6 * (n - 2) * (1 + n / 15) * swarmSizeK() * (G.hordeMul || 1) * swarmCoopK());
  if (n % 5 === 0) budget = Math.round(budget * 0.6);   // a boss wave keeps its eyes on the boss
  if (budget < 8) return;
  const parts = [];
  if (budget >= 110 && n >= 12) { const main = Math.round(budget * 0.62); parts.push(main); let rest = budget - main; while (rest > 0) { let s = Math.min(rest, Math.max(24, Math.round(rest * 0.6))); if (rest - s < 12) s = rest; parts.push(s); rest -= s; } }
  else if (budget >= 40) { const a = Math.round(budget * 0.6); parts.push(a, budget - a); }
  else parts.push(budget);
  for (let i = parts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = parts[i]; parts[i] = parts[j]; parts[j] = t; }
  SWARM.plan = parts.map((s, i) => ({ n: s, at: i === 0 ? rand(7, 13) : rand(14, 24) }));
  SWARM.planT = SWARM.plan[0].at; SWARM.pending = budget;
}
function swarmDone() { return !swarmUp() || (!SWARM.plan.length && !SWARM.hordes.some(H => H.queue > 0)); }
// a spot just out of everyone's sight, with open street, from which the whole map can be walked to the players
function swarmEdge(tgt, ang, n) {
  const hw = W / ZOOM / 2, hh = H / ZOOM / 2, far = Math.hypot(hw, hh) + 170 + Math.sqrt(n) * 9;
  for (let t = 0; t < 14; t++) {
    const a = ang == null || t > 5 ? rand(TAU) : ang + rand(-0.5, 0.5), x = tgt.x + Math.cos(a) * far, y = tgt.y + Math.sin(a) * far;
    if (swarmSeen(x, y, 40)) continue;
    if (!blocked(x, y, 30) && waterAt(x, y) !== 2 && reachable(x, y)) return { a: a, x: x, y: y };
  }
  const s = spawnPos(); return { a: Math.atan2(s.y - tgt.y, s.x - tgt.x), x: s.x, y: s.y };
}
// is a point on any player's screen?
function swarmSeen(x, y, m) {
  const hw = W / ZOOM / 2 + m, hh = H / ZOOM / 2 + m, P = NET.role === 'host' && NET.started ? netPlayers() : (G.p ? [G.p] : []);
  for (const p of P) if (Math.abs(x - p.x) < hw && Math.abs(y - p.y) < hh) return true;
  return false;
}
function swarmLaunch(n) {
  const tgt = NET.role === 'host' && NET.started ? netAnchor() : G.p; if (!tgt || !G.pool.length) return null;
  const at = swarmEdge(tgt, null, n), kind = n >= 100 ? 'drove' : n >= 25 ? 'horde' : 'pack';
  // mostly one mutation, some more of its strain, a few strays
  const okM = m => m.A.key !== 'splitter' && !m.unique, okLead = m => okM(m) && m.A.key !== 'bomber' && m.A.key !== 'hive';
  const fl = (G.feat.length ? G.feat : G.pool).filter(okLead), lead = pick(fl.length ? fl : G.pool.filter(okLead)) || G.pool[0];
  const kin = G.pool.filter(m => okM(m) && m.S.key === lead.S.key);
  const H = { id: ++SWARM.hid, kind: kind, n: n, queue: n, alive: 0, sp: 0, x: at.x, y: at.y, ang: at.a, cx: at.x, cy: at.y, state: 'march', surgeT: 0, pace: 60, lead: lead, kin: kin.length ? kin : [lead], t: 0, hit: false, rad: Math.max(60, Math.sqrt(n) * 15 * Math.max(1, SCL * 0.6)) };
  SWARM.hordes.push(H); SWARM.hb.set(H.id, H); SWARM.pending = Math.max(0, SWARM.pending - n);
  SWARM.stats.hordes++; if (kind === 'drove') SWARM.stats.droves++;
  swarmAnnounce(n, kind, at.a, tgt);
  if (NET.role === 'host' && NET.started) NET.evs.push(['horde', n, kind === 'drove' ? 2 : kind === 'horde' ? 1 : 0, Math.round(at.a * 100)]);
  coreEmit('horde', { n: n, kind: kind, ang: at.a, id: H.id });
  return H;
}
// the warning: where it is coming from and how many, with the sound of it from that side
function swarmAnnounce(n, kind, ang, tgt) {
  const dir = SW_DIRS[((Math.round(ang / (TAU / 8)) % 8) + 8) % 8], pan = clamp(Math.cos(ang), -1, 1);
  if (kind === 'drove') { banner('A drove is coming', n + ' of them, from the ' + dir); shakeIt(3); }
  else toast(kind === 'horde' ? 'Horde' : 'Pack', (kind === 'horde' ? 'A horde of ' : 'A pack of ') + n + ' from the ' + dir, kind === 'horde' ? '#ff8a5a' : '#ffb84a');
  if (SFX.horde) SFX.horde(pan, n);
  void tgt;
}
function swarmMember(H) {
  const r = H.rad;
  let x = H.x, y = H.y;
  // somewhere in the gathering, on open street that leads to the players (never inside a fenced yard it cannot leave)
  for (let t = 0; t < 5; t++) { const a = rand(TAU), d = Math.sqrt(Math.random()) * r, px = H.x + Math.cos(a) * d, py = H.y + Math.sin(a) * d; if (!blocked(px, py, 14) && waterAt(px, py) !== 2 && reachable(px, py)) { x = px; y = py; break; } }
  // 1.9.994: a horde is a mix: the leader's kind, its strain, and the rest of the wave's dead (a handful of kinds chosen
  // when it set out), so a crowd is never a wall of the same face
  if (!H.mix) { const P = (G.pool || []).filter(q => q !== H.lead && q.A && q.A.key !== 'splitter' && !q.unique); H.mix = []; for (let i = 0; i < 6 && P.length; i++) H.mix.push(P.splice((Math.random() * P.length) | 0, 1)[0]); }
  const u = Math.random(), m = u < 0.36 ? H.lead : u < 0.56 ? pick(H.kin) : (H.mix.length ? pick(H.mix) : pick(G.pool));
  const z = spawnZombie(m || H.lead, x, y); if (!z) return;
  // one of many: a little weaker on its own, dangerous together
  z.hd = H.id; z.hp *= 0.8; z.maxHp *= 0.8; z.dmg *= 0.85; z.ang = H.ang + Math.PI;
  H.alive++; H.sp++;
}
function swarmSpawnTick(dt) {
  if (G.mode !== 'play' || NET.role === 'client') return;
  if (SWARM.plan.length && !(G.cineT > 0)) { SWARM.planT -= dt; if (SWARM.planT <= 0) { const P = SWARM.plan.shift(); swarmLaunch(P.n); SWARM.planT = SWARM.plan.length ? SWARM.plan[0].at : 0; } }
  let room = Math.min(28, SWARM.capLive - G.zs.length);
  for (const hd of SWARM.hordes) {
    if (room <= 0) break;
    if (hd.queue > 0) {
      // the gathering point is never on anyone's screen: if a player walked up to it, the rest gather elsewhere
      if (hd.sp % 20 === 0 && swarmSeen(hd.x, hd.y, 60)) { const p = NET.role === 'host' && NET.started ? netAnchor() : G.p; const e = swarmEdge(p, hd.ang, hd.queue); hd.x = e.x; hd.y = e.y; }
      while (hd.queue > 0 && room > 0) { swarmMember(hd); hd.queue--; room--; }
    }
  }
}
// every two seconds: a zombie off screen that has not got anywhere for eight seconds (wedged in a corner, a yard it
// cannot leave) is brought back in from the edge of the screen, so no wave is ever held up by one that is stuck
function swarmUnstick() {
  if (G.mode !== 'play' || NET.role === 'client') return;
  for (const z of SWARM.L) {
    if (z.dead || z.boss || z.rb || z.fly || z.illusion || z.m.unique || z.st.under) continue;
    if (z.swPx === undefined) { z.swPx = z.x; z.swPy = z.y; z.swStill = 0; continue; }
    const moved = Math.hypot(z.x - z.swPx, z.y - z.swPy); z.swPx = z.x; z.swPy = z.y;
    if (moved > 20 || swarmSeen(z.x, z.y, 80)) { z.swStill = 0; continue; }
    if (++z.swStill >= 4) { const s = spawnPos(); z.x = s.x; z.y = s.y; z.vx = z.vy = z.kvx = z.kvy = 0; z.swStill = 0; z.swPx = z.x; z.swPy = z.y; SWARM.stats.unstuck = (SWARM.stats.unstuck || 0) + 1; }
  }
}
// gunfire is loud: a marching horde within earshot of a shot turns and surges toward it (a pistol carries about 60
// metres, a rifle 90, a sniper rifle 120; a flamethrower hardly at all)
const SW_EAR = { pistol: 60, smg: 55, rifle: 90, shotgun: 80, sniper: 120, revolver: 75, lmg: 95, burst: 90, launcher: 110, flamer: 25 };
function swarmHear(x, y, fk) {
  if (!swarmUp() || NET.role === 'client' || !SWARM.hordes.length) return;
  const R = (SW_EAR[fk] || 60) * 32 * SCL / SCALE_REAL;
  for (const Hd of SWARM.hordes) if (Hd.state === 'march' && Hd.k && Math.hypot(Hd.cx - x, Hd.cy - y) < R) { Hd.state = 'surge'; Hd.surgeT = 3; Hd.heard = 1; SWARM.stats.heard = (SWARM.stats.heard || 0) + 1; }
}
// each horde: where its middle is, how fast it goes, and when it stops marching and charges
function swarmHordes(dt) {
  if (!SWARM.hordes.length) return;
  for (const hd of SWARM.hordes) { hd.sx = 0; hd.sy = 0; hd.k = 0; hd.spd = []; }
  for (const z of SWARM.L) {
    if (!z.hd) continue; const hd = SWARM.hb.get(z.hd); if (!hd) { z.hd = 0; continue; }
    hd.sx += z.x; hd.sy += z.y; hd.k++; if (hd.spd.length < 31) hd.spd.push(z.speed);
    if (z.flash > 0.05 && hd.state === 'march') hd.hit = true;
  }
  const P = NET.role === 'host' && NET.started ? netAlive() : (G.p ? [G.p] : []);
  const sight = Math.hypot(W / ZOOM / 2, H / ZOOM / 2) * 0.62;
  for (let i = SWARM.hordes.length - 1; i >= 0; i--) {
    const Hd = SWARM.hordes[i]; Hd.t += dt; Hd.alive = Hd.k;
    if (!Hd.k && Hd.queue <= 0) { SWARM.hordes.splice(i, 1); SWARM.hb.delete(Hd.id); continue; }
    if (Hd.k) { Hd.cx = Hd.sx / Hd.k; Hd.cy = Hd.sy / Hd.k; }
    if (Hd.spd.length) { Hd.spd.sort((a, b) => a - b); Hd.pace = Hd.spd[Hd.spd.length >> 1] * 0.95; }
    if (Hd.surgeT > 0) Hd.surgeT -= dt;
    if (Hd.state === 'march') {
      let near = Infinity; for (const p of P) near = Math.min(near, Math.hypot(p.x - Hd.cx, p.y - Hd.cy));
      // it sees you (or you shot at it, or it has been marching long enough): it surges
      if (near < sight || Hd.hit || Hd.t > 14) { Hd.state = 'surge'; Hd.surgeT = 3; if (near < sight * 1.6 && SFX.roar) SFX.roar(); }   // (1.9.994: it comes for you sooner: 14 s of marching at most)
    }
  }
}

/* ---------- vehicles ---------- */
// When a crowd pushes a vehicle, and when it goes round. All of these must hold for a zombie to put its shoulder to a car:
//  · it is one of a horde of at least SW_PUSH_N (enough bodies to matter),
//  · the player it is after is within SW_PUSH_D metres of it,
//  · a vehicle stands in the straight line between them (it is in the way, not off to one side),
//  · and that vehicle is within SW_PUSH_R metres of the player (the player is at the car, hiding behind it or beside it).
// Otherwise a car is just an obstacle: the horde walks round it like anyone else, however many of them there are.
const SW_PUSH_N = 30, SW_PUSH_D = 18, SW_PUSH_R = 9;
// is there a vehicle on the straight line between two points? (the nearest one, or null)
function swarmCarBetween(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy); if (len < 1) return null;
  const rs = rectsNear((x0 + x1) / 2, (y0 + y1) / 2, len / 2 + 4); let best = null, bt = 2;
  for (let i = 0; i < rs.length; i++) {
    const r = rs[i]; if (r.k !== 'car') continue;
    let tn = 0, tf = 1;
    if (Math.abs(dx) < 1e-9) { if (x0 < r.x || x0 > r.x + r.w) continue; } else { const a = (r.x - x0) / dx, b = (r.x + r.w - x0) / dx; tn = Math.max(tn, Math.min(a, b)); tf = Math.min(tf, Math.max(a, b)); }
    if (Math.abs(dy) < 1e-9) { if (y0 < r.y || y0 > r.y + r.h) continue; } else { const a = (r.y - y0) / dy, b = (r.y + r.h - y0) / dy; tn = Math.max(tn, Math.min(a, b)); tf = Math.min(tf, Math.max(a, b)); }
    if (tn <= tf && tn < bt) { bt = tn; best = r; }
  }
  return best;
}
// may this zombie push a vehicle right now? (worked out a few times a second, against the player it is after)
function swarmPushOk(z) {
  if (z.pkT > G.time) return !!z.pushOk;
  z.pkT = G.time + 0.3 + Math.random() * 0.2; z.pushOk = false; z.pushR = null;
  const hd = z.hd ? SWARM.hb.get(z.hd) : null, p = G.p;
  if (!hd || !p || hd.k < SW_PUSH_N || !swarmPushOn() || NET.role === 'client') return false;
  const u = 32 * SCL / SCALE_REAL, d = Math.hypot(p.x - z.x, p.y - z.y);
  if (d > SW_PUSH_D * u) return false;
  const r = swarmCarBetween(z.x, z.y, p.x, p.y); if (!r) return false;
  const cx = clamp(p.x, r.x, r.x + r.w), cy = clamp(p.y, r.y, r.y + r.h);
  if (Math.hypot(p.x - cx, p.y - cy) > SW_PUSH_R * u) return false;
  z.pushOk = true; z.pushR = r; SWARM.stats.pushOk = (SWARM.stats.pushOk || 0) + 1;
  return true;
}
// members of a horde big enough to move a car go straight through a parked car in their way, when you are at it
function swarmShoves(z) { return !!z.hd && swarmPushOk(z); }
// pressed against a vehicle that is moving, nearly moving, or with enough of the horde behind it: no going round
function swarmPushing(z) {
  if (!(z.pt > 0) || !z.pv || !z.pv.ph || !z.pushOk) return false;
  const P = z.pv.ph, S = P.S; if (P.vx || P.vy) return true;
  const need = S.mu * S.along * S.M * SW_G;
  if (P.F > need * 0.45) return true;
  const hd = z.hd ? SWARM.hb.get(z.hd) : null; return !!hd && hd.k * SW_F0 >= need * 0.8;
}
// the weight and grip of a vehicle, and how many ordinary zombies it takes to move it
function swarmVehSpec(r) {
  const M0 = SW_VM[r.vt] || 1450, heavy = !!SW_HEAVY[r.vt];
  return { M: M0 * (r.burnt ? 0.78 : 1), mu: r.flip ? 0.45 : r.burnt ? 0.5 : heavy ? 0.65 : 0.75, along: r.flip || r.burnt ? 1 : heavy ? 0.75 : 0.6 };
}
function swarmNeed(vt, state) {
  const S = swarmVehSpec({ vt: vt, burnt: state === 'burnt', flip: state === 'flip' }), N = S.M * SW_G;
  return { kg: Math.round(S.M), side: Math.ceil(S.mu * N / SW_F0), along: Math.ceil(S.mu * S.along * N / SW_F0) };
}
// what one zombie pushes with: an ordinary one about 220 N, more the heavier it is (bosses shove cars on their own)
function swarmZF(z) {
  const r0 = zombieR(1, 1), k = (z.r / r0) * (z.r / r0);
  return SW_F0 * Math.min(120, k) * (z.kb === 0 ? 1.5 : 1) * clamp(z.mulB || 1, 1, 2);
}
// a zombie walked into a vehicle: if it is leaning into it, it is pushing
function swarmPress(z, r, nx, ny, vx, vy) {
  if (!swarmPushOn() || z.fly || z.illusion || NET.role === 'client') return;
  // only a zombie allowed to push (see above) leans in; a boss always does
  if (!z.boss && !z.pushOk) return;
  const v = Math.hypot(vx, vy); if (v < 5) return;
  if (-(vx * nx + vy * ny) / v < 0.3) return;
  z.pv = r; z.pd = 0; z.pt = 0.3; z.pnx = -nx; z.pny = -ny;
}
// any other push on a vehicle (a blast, a boss, a test): newtons, added to this frame's crowd push
function swarmVehForce(r, fx, fy) { if (!r || r.k !== 'car' || !r.vid || !NUM(fx) || !NUM(fy)) return; const P = r.ph || swarmVehInit(r); P.fx += fx; P.fy += fy; SWARM.ext.add(r); }
// an explosion shoves the vehicles near it (an impulse: a big blast slides a car a little and rocks a truck)
function swarmVehBlast(x, y, R) {
  if (!swarmPushOn() || NET.role === 'client' || !(R > 0)) return;
  const rs = rectsNear(x, y, R), cars = []; for (let i = 0; i < rs.length; i++) if (rs[i].k === 'car' && rs[i].vid) cars.push(rs[i]);
  const dt = Math.max(0.008, G.rdt || 0.016);
  for (const r of cars) {
    const nx = clamp(x, r.x, r.x + r.w), ny = clamp(y, r.y, r.y + r.h), d = Math.hypot(nx - x, ny - y); if (d > R) continue;
    const J = 2600 * (1 - d / R) * clamp(R / 120, 0.5, 2.5), cx = r.x + r.w / 2 - x, cy = r.y + r.h / 2 - y, l = Math.hypot(cx, cy) || 1;
    swarmVehForce(r, cx / l * J / dt, cy / l * J / dt);
  }
}
function swarmVehInit(r) { r.ph = { S: swarmVehSpec(r), fx: 0, fy: 0, n: 0, vx: 0, vy: 0, lfx: 0, lfy: 0, F: 0, cnt: 0 }; return r.ph; }
// everything pushing this frame adds up on each vehicle; then each one either holds or slides
function swarmVehTick(dt) {
  if (!swarmPushOn() || NET.role === 'client') return;
  const L = SWARM.L, act = SWARM.act; act.clear();
  for (let i = 0; i < L.length; i++) {
    const z = L[i]; if (z.dead || !(z.pt > 0) || !z.pv) continue;
    const r = z.pv; if (r.k !== 'car') { z.pt = 0; continue; }
    const f = swarmZF(z) * Math.pow(0.95, z.pd), P = r.ph || swarmVehInit(r);
    P.fx += z.pnx * f; P.fy += z.pny * f; P.n++; act.add(r);
  }
  for (const r of SWDYN.values()) if (r.ph && (r.ph.vx || r.ph.vy || r.ph.fx || r.ph.fy)) act.add(r);
  for (const r of SWARM.ext) act.add(r); SWARM.ext.clear();
  for (const r of act) swarmVehStep(r, dt);
  SWARM.scrapeT -= dt;
}
function swarmVehStep(r, dt) {
  const P = r.ph, S = P.S, horiz = r.w >= r.h, UPM = 32 * SCL / SCALE_REAL;
  const fa = horiz ? P.fx : P.fy, fs = horiz ? P.fy : P.fx, N = S.M * SW_G, Ra = S.mu * S.along * N, Rs = S.mu * N;
  P.F = Math.hypot(P.fx, P.fy); P.cnt = P.n; P.lfx = P.fx; P.lfy = P.fy; P.fx = P.fy = 0; P.n = 0;
  let va = horiz ? P.vx : P.vy, vs = horiz ? P.vy : P.vx;
  const vm = Math.hypot(va, vs);
  // standing still, the grip holds until the push beats it (pushing at an angle mixes the two directions)
  if (vm < 0.005 && (fa / Ra) * (fa / Ra) + (fs / Rs) * (fs / Rs) <= 1) { P.vx = P.vy = 0; return; }
  // sliding: friction a little under the grip, against the motion
  const kf = 0.8 * S.mu * SW_G;
  let aa = fa / S.M, as = fs / S.M;
  if (vm >= 0.005) { aa -= kf * S.along * va / vm; as -= kf * vs / vm; }
  else { const fm = Math.hypot(fa, fs) || 1; aa -= kf * S.along * fa / fm; as -= kf * fs / fm; }
  let na = va + aa * dt, ns = vs + as * dt;
  if ((vm >= 0.005 && na * va < 0) || (vm < 0.005 && na * fa < 0)) na = 0;
  if ((vm >= 0.005 && ns * vs < 0) || (vm < 0.005 && ns * fs < 0)) ns = 0;
  const sp = Math.hypot(na, ns); if (sp > 2.2) { na *= 2.2 / sp; ns *= 2.2 / sp; }
  P.vx = horiz ? na : ns; P.vy = horiz ? ns : na;
  if (!(P.vx === P.vx && P.vy === P.vy)) { P.vx = P.vy = 0; SWARM.bad++; SWARM.badWhy = 'a vehicle with a broken speed'; return; }
  swarmVehMove(r, P.vx * UPM * dt, P.vy * UPM * dt);
}
function swarmVehMove(r, dx, dy) {
  if (!dx && !dy) return;
  if (!r.dyn) swarmVehWake(r);
  // one axis at a time, so it scrapes along a wall instead of sticking
  if (dx) { if (swarmVehFree(r, r.x + dx, r.y)) r.x += dx; else { swarmVehBump(r, Math.sign(dx), 0); r.ph.vx = 0; } }
  if (dy) { if (swarmVehFree(r, r.x, r.y + dy)) r.y += dy; else { swarmVehBump(r, 0, Math.sign(dy)); r.ph.vy = 0; } }
  SWARM.moved.set(r.vid, [r.x, r.y]); SWARM.vDirty.add(r.vid); r.mvT = G.time;
  if (SWARM.scrapeT <= 0 && SFX.scrape && G.p) { SWARM.scrapeT = 0.35; const d = Math.hypot(G.p.x - r.x, G.p.y - r.y); if (d < 900) SFX.scrape(Math.max(0.1, 1 - d / 900) * Math.min(1, Math.hypot(r.ph.vx, r.ph.vy) + 0.3), clamp((r.x - cam.x) / (W / ZOOM / 2), -1, 1)); }
}
// can the vehicle stand here? walls, other vehicles and deep water stop it; a player in the way is shoved if there is room
function swarmVehFree(r, x, y) {
  const cx = x + r.w / 2, cy = y + r.h / 2, rs = rectsNear(cx, cy, Math.max(r.w, r.h) / 2 + 4);
  for (let i = 0; i < rs.length; i++) { const b = rs[i]; if (b === r) continue; if (x < b.x + b.w && x + r.w > b.x && y < b.y + b.h && y + r.h > b.y) { SWARM.hitR = b; return false; } }
  SWARM.hitR = null;
  if (waterAt(cx, cy) === 2) return false;
  const P = NET.role === 'host' && NET.started ? netPlayers() : (G.p ? [G.p] : []);
  for (const p of P) {
    const nx = clamp(p.x, x, x + r.w), ny = clamp(p.y, y, y + r.h), ex = p.x - nx, ey = p.y - ny, d = Math.hypot(ex, ey), pr = p.r || 12;
    if (d >= pr) continue;
    if (p.remote || p.down) return false;
    const ux = d > 0.01 ? ex / d : (cx < p.x ? 1 : -1), uy = d > 0.01 ? ey / d : 0, mx = p.x + ux * (pr - d + 0.6), my = p.y + uy * (pr - d + 0.6);
    if (blocked(mx, my, pr)) return false;
    p.x = mx; p.y = my;
  }
  return true;
}
// blocked by another car: the push carries on into it
function swarmVehBump(r, sx, sy) {
  const b = SWARM.hitR, P = r.ph; if (!b || b.k !== 'car' || !P) return;
  const Q = b.ph || swarmVehInit(b);
  if (sx) Q.fx += Math.abs(P.lfx) * sx * 0.85; if (sy) Q.fy += Math.abs(P.lfy) * sy * 0.85;
  SWARM.ext.add(b);   // it feels it next frame
}
// the first time a vehicle moves: it leaves the block's picture and is drawn live; the alarm goes off
function swarmVehWake(r) {
  r.dyn = 1; if (r.ox0 === undefined) { r.ox0 = r.x; r.oy0 = r.y; }
  SWDYN.set(r.vid, r);
  const c = chunks.get(r.ck); if (c) c.stale = 1;
  if (typeof carHit === 'function') carHit(r);
  SWARM.stats.cars++; coreEmit('vehicle', { r: r });
}
// a moved vehicle that has stopped, far from the camera and still inside its own block, goes back into the block's
// picture and its lookup buckets (so the live list stays short however many the hordes have shoved over a run)
function swarmVehPark() {
  for (const [vid, r] of Array.from(SWDYN.entries())) {
    if ((r.ph && (r.ph.vx || r.ph.vy)) || (r.tx !== undefined && Math.hypot(r.tx - r.x, r.ty - r.y) > 0.5)) continue;
    const c = chunks.get(r.ck); if (!c) continue;
    if (Math.hypot(r.x + r.w / 2 - cam.x, r.y + r.h / 2 - cam.y) < CHS * 2.5) continue;
    if (r.x < c.sx || r.y < c.sy || r.x + r.w > c.sx + CHS || r.y + r.h > c.sy + CHS) continue;
    r.dyn = 0; r.spr = null; SWDYN.delete(vid); bucketRects(c); c.stale = 1;
  }
}
// each block's vehicles get a name both players agree on; ones moved earlier are put back where the crowd left them
function swarmChunk(c, key) {
  for (let i = 0; i < c.rects.length; i++) {
    const r = c.rects[i]; if (r.k !== 'car') continue;
    r.vid = key + ':' + i; r.ck = key;
    const m = SWARM.moved.get(r.vid);
    if (m) { r.ox0 = r.x; r.oy0 = r.y; r.x = m[0]; r.y = m[1]; r.dyn = 1; SWDYN.set(r.vid, r); }
  }
}
function swarmVehFind(vid) {
  const r0 = SWDYN.get(vid); if (r0) return r0;
  const m = /^(-?\d+),(-?\d+):(\d+)$/.exec(String(vid)); if (!m) return null;
  const c = getChunk(+m[1], +m[2]), r = c.rects[+m[3]];
  return r && r.vid === vid ? r : null;
}
// co-op: the host says where a moved vehicle is
function swarmVehNet(vid, x, y) {
  if (!NUM(x) || !NUM(y)) return;
  const r = swarmVehFind(vid); if (!r) return;
  if (!r.dyn) { r.dyn = 1; r.ox0 = r.x; r.oy0 = r.y; SWDYN.set(r.vid, r); const c = chunks.get(r.ck); if (c) c.stale = 1; if (typeof carHit === 'function') carHit(r); r.x = x; r.y = y; }
  r.tx = x; r.ty = y; SWARM.moved.set(vid, [x, y]);
}
function swarmClient(dt) {
  SWARM.usT -= dt; if (SWARM.usT <= 0) { SWARM.usT = 2; if (SWDYN.size) swarmVehPark(); }
  const k = Math.min(1, dt * 10);
  for (const r of SWDYN.values()) if (r.tx !== undefined) { r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k; }
}
// what the host sends: the vehicles that moved since the last snapshot (all of them now and then)
function swarmNetVeh(all) {
  const out = []; const src = all ? SWARM.moved.keys() : SWARM.vDirty.values();
  for (const vid of src) { const p = SWARM.moved.get(vid); if (p) out.push(vid, Math.round(p[0]), Math.round(p[1])); if (out.length > 240) break; }
  SWARM.vDirty.clear(); return out;
}
// moved vehicles are drawn live (a picture made once, the same as the block draws it)
function swarmVehDraw(vis) {
  for (const r of SWDYN.values()) {
    if (!vis(r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h))) continue;
    let s = r.spr; if (!s || s.sc !== Q.chunkScale) { try { s = swarmVehSprite(r); } catch (e) { swarmHurt(e, 'vehicles'); continue; } }
    if (!s) continue;
    const j = r.mvT && G.time - r.mvT < 0.15 ? 0.6 : 0, ox = j ? rand(-j, j) : 0, oy = j ? rand(-j, j) : 0;
    ctx.drawImage(s.c, r.x - s.pad + ox, r.y - s.pad + oy, s.w, s.h);
  }
}
function swarmVehSprite(r) {
  const c = chunks.get(r.ck); if (!c) return null;
  const k = c.k, px = Math.min(Q.chunkScale * k, 2048 / CH), pad = 10, aw = r.w / k, ah = r.h / k;
  const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil((aw + pad * 2) * px)); cv.height = Math.max(1, Math.ceil((ah + pad * 2) * px));
  const g = cv.getContext('2d'); g.scale(px, px); g.translate(pad, pad);
  drawRectArt(g, Object.assign({}, r, { x: 0, y: 0, w: aw, h: ah, dyn: 0 }), c, BIO[c.bio], winterOn(c));
  r.spr = { c: cv, sc: Q.chunkScale, pad: pad * k, w: cv.width / px * k, h: cv.height / px * k };
  return r.spr;
}

/* ---------- drawing the crowd ---------- */
// the crowd picture of a mutation: small, cropped to the body, made from its full picture when there is one
function swarmLo(key, z, full) {
  const rq = Math.max(3, Math.round(z.r)), half = rq * 2.4, kp = clamp(DPR * ZOOM * 0.62, 0.7, 2.2), S = Math.max(8, Math.ceil(half * 2 * kp));
  const t = document.createElement('canvas'); t.width = t.height = S;
  const g = t.getContext('2d', { willReadFrequently: true }); if (!g) return null;
  if (full && full.c) g.drawImage(full.c, 0, 0, S, S);
  else { g.setTransform(kp, 0, 0, kp, half * kp, half * kp); Z.drawMutation(g, z.m, rq, { noAbility: z.minion }); g.setTransform(1, 0, 0, 1, 0, 0); }
  // tight bounds from the alpha (one read of a tiny canvas)
  const d = g.getImageData(0, 0, S, S).data; let x0 = S, y0 = S, x1 = -1, y1 = -1;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (d[(y * S + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) { x0 = y0 = 0; x1 = y1 = S - 1; }
  x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(S - 1, x1 + 1); y1 = Math.min(S - 1, y1 + 1);
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, c = document.createElement('canvas'); c.width = bw; c.height = bh;
  c.getContext('2d').drawImage(t, x0, y0, bw, bh, 0, 0, bw, bh);
  const u = half * 2 / S, lo = { c: c, rq: rq, half: half, lx: -half + x0 * u, ly: -half + y0 * u, lw: bw * u, lh: bh * u };
  SWARM.lo.set(key, lo); SWARM.stats.lo++;
  if (SWARM.lo.size > 1400) SWARM.lo.delete(SWARM.lo.keys().next().value);
  return lo;
}
// a stand-in for a zombie whose picture is not made yet: its strain's colours in a plain body shape
function swarmImp(z) {
  const rq = Math.max(3, Math.round(z.r / 2) * 2), key = z.m.S.key + '|' + rq; let s = SWARM.imp.get(key);
  if (!s) {
    const kp = clamp(DPR * ZOOM * 0.6, 0.7, 2), half = rq * 1.4, S = Math.max(6, Math.ceil(half * 2 * kp)), c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), sk = z.m.S.skin || [120, 130, 110], cl = z.m.S.cloth || [60, 60, 60];
    g.setTransform(kp, 0, 0, kp, S / 2, S / 2);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(1.5, 2, rq * 0.95, rq * 0.75, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgb(' + cl[0] + ',' + cl[1] + ',' + cl[2] + ')'; g.beginPath(); g.ellipse(0, 0, rq * 0.62, rq * 0.9, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgb(' + sk[0] + ',' + sk[1] + ',' + sk[2] + ')'; g.beginPath(); g.arc(rq * 0.15, 0, rq * 0.42, 0, TAU); g.fill();
    g.fillRect(rq * 0.2, -rq * 0.85, rq * 0.75, rq * 0.22); g.fillRect(rq * 0.2, rq * 0.63, rq * 0.75, rq * 0.22);
    s = { c: c, rq: rq, lx: -half, ly: -half, lw: half * 2, lh: half * 2 }; SWARM.imp.set(key, s);
    if (SWARM.imp.size > 160) SWARM.imp.delete(SWARM.imp.keys().next().value);
  }
  SWARM.stats.stand++;
  const kz = z.r / s.rq; SW_SP.c = s.c; SW_SP.sx = 0; SW_SP.sy = 0; SW_SP.sw = s.c.width; SW_SP.sh = s.c.height; SW_SP.ox = s.lx * kz; SW_SP.oy = s.ly * kz; SW_SP.w = s.lw * kz; SW_SP.h = s.lh * kz;
  return SW_SP;
}
// which picture a zombie is drawn with: its full one near you (made a few per frame, nearest first), the crowd one
// further out, a stand-in until either is ready; always cropped to the body
function swarmSpr(z, tier) {
  const rq = Math.max(3, Math.round(z.r)), key = z.m.id + '|' + rq + '|' + (z.minion ? 1 : 0);
  if (z.swK !== key) { z.swK = key; z.sw0 = null; z.sw1 = null; }
  let lo = z.sw1 || (z.sw1 = SWARM.lo.get(key) || null);
  const kz = z.r / rq;
  if (tier === 0 && swarmOn('full')) {
    let full = z.sw0;
    if (!full) { full = sprites.get(key) || null; if (!full && SWARM.budF > 0) { SWARM.budF--; full = getSprite(z.m, z.r, z.minion); SWARM.stats.made++; } if (full) z.sw0 = full; }
    if (full) {
      SWARM.keys.add(key);
      if (!lo && SWARM.budL > 0) { SWARM.budL--; lo = z.sw1 = swarmLo(key, z, full); }
      const ppu = full.c.width / (2 * full.half); SW_SP.c = full.c;
      if (lo) { SW_SP.sx = (lo.lx + full.half) * ppu; SW_SP.sy = (lo.ly + full.half) * ppu; SW_SP.sw = lo.lw * ppu; SW_SP.sh = lo.lh * ppu; SW_SP.ox = lo.lx * kz; SW_SP.oy = lo.ly * kz; SW_SP.w = lo.lw * kz; SW_SP.h = lo.lh * kz; }
      else { SW_SP.sx = 0; SW_SP.sy = 0; SW_SP.sw = full.c.width; SW_SP.sh = full.c.height; SW_SP.ox = -full.half * kz; SW_SP.oy = -full.half * kz; SW_SP.w = full.half * 2 * kz; SW_SP.h = full.half * 2 * kz; }
      return SW_SP;
    }
  }
  if (!lo && SWARM.budL > 0) { SWARM.budL--; lo = z.sw1 = swarmLo(key, z, sprites.get(key)); }
  if (lo) { SW_SP.c = lo.c; SW_SP.sx = 0; SW_SP.sy = 0; SW_SP.sw = lo.c.width; SW_SP.sh = lo.c.height; SW_SP.ox = lo.lx * kz; SW_SP.oy = lo.ly * kz; SW_SP.w = lo.lw * kz; SW_SP.h = lo.lh * kz; return SW_SP; }
  return swarmImp(z);
}
function swarmAlpha(z) {
  let a = 1; if (z.illusion) a = 0.62 * Math.min(1, z.life); if (z.m.S.p.ghost) a *= 0.88; if (z.st.phased) a *= 0.25;
  if (z.m.S.p.camo && G.p && G.mode !== 'title') a *= clamp((300 - Math.hypot(G.p.x - z.x, G.p.y - z.y)) / 140, 0.1, 1);
  return a;
}
// every zombie on screen but the bosses: nearest first, bodies in one pass, then the hit flashes, then the overlays
function swarmDraw(vis, hw, hh) {
  const t0 = performance.now(), V = SWARM.vis; V.length = 0;
  const fx = G.p && G.mode !== 'title' ? G.p.x : cam.x, fy = G.p && G.mode !== 'title' ? G.p.y : cam.y;
  for (const z of G.zs) { if (z.dead || z.boss || !vis(z.x, z.y, z.r * 2.6)) continue; z.swD = (z.x - fx) * (z.x - fx) + (z.y - fy) * (z.y - fy); V.push(z); }
  V.sort((a, b) => a.swD - b.swD); SWARM.visF = frameNo;
  const nv = V.length, nr = Math.min(hw, hh) * 0.95, nr2 = nr * nr, ln = PERF.lodN; ln[0] = ln[1] = ln[2] = ln[3] = 0;
  const crowd = nv > 70 ? 1 : 0, mob = nv > 220 ? 1 : 0, strain = -SWARM.adapt, hi = SET.crowd === 'high' || TUNE.SWARM > 0, low = SET.crowd === 'low' || TUNE.SWARM < 0;
  const tier = clamp(PERF.tier | 0, 0, 3); SWARM.budF = [2, 3, 5, 8][tier] + (strain ? 0 : 1); SWARM.budL = [6, 10, 16, 24][tier]; SWARM.keys.clear();
  const T = ctx.getTransform(), s = T.a, e = T.e, f = T.f, setT = () => ctx.setTransform(T.a, T.b, T.c, T.d, T.e, T.f), FL = SWARM.fl, FS = SWARM.flS, OV = SWARM.ov, OL = SWARM.ovL; FL.length = 0; FS.length = 0; OV.length = 0; OL.length = 0;
  for (let i = 0; i < nv; i++) {
    const z = V[i], far = z.swD > nr2; z.swRk = i; z.swRkF = frameNo;
    let lod = Q.lod + (far ? 1 + crowd : 0);
    if (!hi) { if (mob && i > 60) lod++; if (strain >= 2 && i > 30) lod++; if (low) lod++; }
    lod = Math.min(3, lod); ln[lod]++;
    // the 2.0 zombies: the animation engine draws them (live joints near you, cached frames further out)
    if (z.m.v2 && !z.fly && !z.st.under) {
      const a = swarmAlpha(z);
      if (animaDraw(z, lod, i, s, e, f, a)) {
        if (lod < 2 && (z.wnd || z.charK || z.frostK) && typeof goreWounds === 'function') { ctx.setTransform(Math.cos(z.ang) * s, Math.sin(z.ang) * s, -Math.sin(z.ang) * s, Math.cos(z.ang) * s, e + z.x * s, f + z.y * s); goreWounds(ctx, z, z.r); }
        if (lod < 3 || z.st.fuse > 0 || z.warn > 0 || (z.frozen && z.stun > 0) || z.shield > 1 || z.st.aim > 0) { OV.push(z); OL.push(lod, far ? 1 : 0); }
        continue;
      }
      // no frame yet: a plain stand-in for a moment (never the old mutation art)
      const sp = swarmImp(z), an = z.ang; ctx.setTransform(Math.cos(an) * s, Math.sin(an) * s, -Math.sin(an) * s, Math.cos(an) * s, e + z.x * s, f + z.y * s); ctx.globalAlpha = a;
      ctx.drawImage(sp.c, sp.sx, sp.sy, sp.sw, sp.sh, sp.ox, sp.oy, sp.w, sp.h); OV.push(z); OL.push(lod, far ? 1 : 0); continue;
    }
    if (z.rb || z.m.unique || z.st.down > 0 || z.st.under || z.fly) { setT(); drawZ(z, lod, far); continue; }
    const sp = swarmSpr(z, lod <= 1 ? 0 : 1), a = swarmAlpha(z);
    const an = z.ang + (lod < 3 ? Math.sin(G.time * 7 + z.bob) * 0.06 : 0), co = Math.cos(an) * s, si = Math.sin(an) * s;
    let x = z.x, y = z.y; if (z.warn > 0 || z.st.fuse > 0) { x += rand(-1.5, 1.5); y += rand(-1.5, 1.5); }
    ctx.setTransform(co, si, -si, co, e + x * s, f + y * s); ctx.globalAlpha = a;
    ctx.drawImage(sp.c, sp.sx, sp.sy, sp.sw, sp.sh, sp.ox, sp.oy, sp.w, sp.h);
    if (lod < 2 && (z.wnd || z.charK || z.frostK) && typeof goreWounds === 'function') goreWounds(ctx, z, z.r);
    if (z.flash > 0 && lod < 3) { FL.push(z); FS.push(sp.c, sp.sx, sp.sy, sp.sw, sp.sh, sp.ox, sp.oy, sp.w, sp.h, an, a); }
    if (lod < 3 || z.st.fuse > 0 || z.warn > 0 || (z.frozen && z.stun > 0) || z.shield > 1 || z.st.aim > 0) { OV.push(z); OL.push(lod, far ? 1 : 0); }
  }
  if (FL.length) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < FL.length; i++) {
      const z = FL[i], o = i * 11, an = FS[o + 9], co = Math.cos(an) * s, si = Math.sin(an) * s;
      ctx.setTransform(co, si, -si, co, e + z.x * s, f + z.y * s); ctx.globalAlpha = Math.min(1, z.flash * 9) * 0.55 * FS[o + 10];
      ctx.drawImage(FS[o], FS[o + 1], FS[o + 2], FS[o + 3], FS[o + 4], FS[o + 5], FS[o + 6], FS[o + 7], FS[o + 8]);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = 1; setT();
  for (let i = 0; i < OV.length; i++) drawZOver(OV[i], OL[i * 2], !!OL[i * 2 + 1]);
  SWKEEP.n = SWARM.keys.size;
  SWARM.msDraw = performance.now() - t0; SWARM.msDrawAvg = SWARM.msDrawAvg * 0.9 + SWARM.msDraw * 0.1;
  coreCost('SWARM', SWARM.msDraw);
  if (typeof animaWatch === 'function') { coreCost('ANIMA', SWARM.msDraw * 0.5); animaWatch(SWARM.msDraw); }
}
// the zombies closest to the camera, for the shadows (the lighting engine casts the nearest ones first)
function swarmBodies() { return SWARM.visF === frameNo && swarmUp() ? SWARM.vis : null; }

/* ---------- each frame ---------- */
function swarmTick(dt) {
  if (!swarmUp()) return;
  const t0 = performance.now();
  try {
    SWARM.capT -= dt; if (SWARM.capT <= 0) { SWARM.capT = 1; swarmCaps(); }
    if (NET.role !== 'client') { swarmSpawnTick(dt); swarmHordes(dt); SWARM.usT -= dt; if (SWARM.usT <= 0) { SWARM.usT = 2; swarmUnstick(); if (SWDYN.size) swarmVehPark(); } }
    swarmCrowd(dt); swarmSimLod();
    if (G.zs.length > SWARM.stats.peak) SWARM.stats.peak = G.zs.length;
  } catch (e) { swarmHurt(e, 'crowd'); }
  SWARM.ms = performance.now() - t0; coreCost('SWARM', SWARM.ms);
  swarmWatch();
}
// keeping its own cost in check: crowd detail steps down (and then fewer alive at once) when the frame runs late
function swarmWatch() {
  SWARM.msAvg = SWARM.msAvg * 0.9 + SWARM.ms * 0.1;
  const now = performance.now(); if (now < SWARM.watchT) return; SWARM.watchT = now + 500;
  const budget = 1000 / targetFps() * 0.3, cost = SWARM.msAvg + SWARM.msDrawAvg, slow = PERF.fps && PERF.fps < targetFps() * 0.9;
  if (cost > budget && slow) {
    SWARM.good = 0;
    if (SWARM.adapt > -3) SWARM.adapt--;
    else SWARM.capLive = Math.max(Math.round(SWARM.cap * 0.4), Math.round(SWARM.capLive * 0.92));
  } else if (cost < budget * 0.45 && !slow) {
    if (++SWARM.good >= 6 && coreRise('SWARM')) { SWARM.good = 0; if (SWARM.capLive < SWARM.cap) SWARM.capLive = Math.min(SWARM.cap, Math.round(SWARM.capLive * 1.06) + 4); else if (SWARM.adapt < 0) SWARM.adapt++; }
  } else SWARM.good = 0;
}

/* ---------- looking after itself ---------- */
function swarmCheck() {
  if (SWARM.bad) { const w = SWARM.badWhy + (SWARM.bad > 1 ? ' (' + SWARM.bad + ')' : ''); SWARM.bad = 0; return w; }
  for (const r of SWDYN.values()) if (!(r.x === r.x && r.y === r.y)) return 'a vehicle lost its place';
  for (const H of SWARM.hordes) if (!(H.cx === H.cx) || H.queue < 0) return 'a horde lost count';
  if (SWARM.lo.size > 1500 || SWARM.imp.size > 200) return 'too many crowd pictures';
  if (SWARM.n && SWARM.gw * SWARM.gh > 70000) return 'the crowd grid is too big';
  return '';
}
function swarmNotes() {
  const off = Object.keys(SWARM.partOff).filter(k => SWARM.partOff[k] > performance.now());
  const a = []; if (off.length) a.push('resting: ' + off.join(', ')); if (SWARM.capLive < SWARM.cap) a.push('holding ' + SWARM.capLive + ' of ' + SWARM.cap);
  return a.join('; ');
}
function swarmRepair() {
  for (const z of G.zs) if (!(z.x === z.x && z.y === z.y)) z.dead = true;
  for (const [vid, r] of Array.from(SWDYN.entries())) if (!(r.x === r.x && r.y === r.y)) { if (r.ox0 !== undefined) { r.x = r.ox0; r.y = r.oy0; } r.ph = null; SWARM.moved.delete(vid); }
  for (const H of SWARM.hordes) { if (!(H.cx === H.cx)) { H.cx = H.x; H.cy = H.y; } H.queue = Math.max(0, H.queue | 0); }
  swarmForget(); SWARM.cnt = new Int32Array(4096); SWARM.cur = new Int32Array(4096); SWARM.ord = new Int32Array(1024); SWARM.zc = new Int32Array(1024);
  SWARM.errT.length = 0; SWARM.partOff = {}; SWARM.bad = 0;
}
// let go of every crowd picture (a memory squeeze, a repair)
function swarmForget() { SWARM.lo.clear(); SWARM.imp.clear(); for (const z of G.zs) { z.sw0 = z.sw1 = null; z.swK = ''; } for (const r of SWDYN.values()) r.spr = null; }
function swarmHurt(e, part) {
  const now = performance.now(); coreHurt('SWARM', e); try { console.error(e); } catch (x) { }
  SWARM.errT.push(now); while (SWARM.errT.length && now - SWARM.errT[0] > 10000) SWARM.errT.shift();
  if (SWARM.errT.length >= 6) { SWARM.offUntil = now + 60000; SWARM.errT.length = 0; coreRepaired('SWARM', 'Crowd engine paused for a minute after errors (the plain crowd code covers)'); }
  else if (part && SWARM.errT.length >= 2) { SWARM.partOff[part] = now + 60000; coreRepaired('SWARM', 'Crowd: ' + part + ' switched off for a minute'); }
}
// a new run: no hordes, and every vehicle back where it was parked
function swarmReset() {
  SWARM.hordes.length = 0; SWARM.hb.clear(); SWARM.plan.length = 0; SWARM.pending = 0; SWARM.vDirty.clear();
  for (const r of SWDYN.values()) { if (r.ox0 !== undefined) { r.x = r.ox0; r.y = r.oy0; } r.dyn = 0; r.ph = null; r.spr = null; r.tx = undefined; const c = chunks.get(r.ck); if (c) c.stale = 1; }
  for (const vid of SWARM.moved.keys()) {
    const m = /^(-?\d+),(-?\d+):(\d+)$/.exec(vid), c = m && chunks.get(m[1] + ',' + m[2]), r = c && c.rects[+m[3]];
    if (r && r.vid === vid && r.ox0 !== undefined) { r.x = r.ox0; r.y = r.oy0; r.dyn = 0; r.ph = null; r.spr = null; bucketRects(c); c.stale = 1; }
  }
  SWDYN.clear(); SWARM.moved.clear(); SWARM.capLive = SWARM.cap;
  SWARM.stats.hordes = SWARM.stats.droves = SWARM.stats.cars = 0; SWARM.stats.peak = 0;
}
// co-op: a horde the host announced
function swarmHordeFx(n, k, ang) { swarmAnnounce(n | 0, k === 2 ? 'drove' : k === 1 ? 'horde' : 'pack', (+ang || 0) / 100, G.p); }
coreAdd({
  name: 'SWARM', kind: 'sim', ver: 1, needs: ['FLOW', 'PERF', 'TEXEL'], provides: ['crowd', 'hordes', 'zombieLod', 'vehiclePhysics'],
  does: 'Crowd engine: hordes and droves of hundreds that gather out of sight, march together at one pace and surge when they see you; zombies moving the same way fall in step and go faster together; bodies push each other by weight and a crowd pushing through each other can shove a car (about 50 zombies) or a semi (about 460), but only when 30 or more are after you within 18 m and the vehicle stands between you and them within 9 m of you, otherwise they go round it; hordes spread out to surround you and come to gunfire they hear; zombie levels of detail so 500 and more can be on screen; one shared grid that the whole game finds zombies with.',
  state: () => swarmUp() ? (SWARM.hordes.length ? 'hordes' : 'on') : 'off',
  level: () => SWARM.n + ' zombies (cap ' + SWARM.capLive + '/' + SWARM.cap + '), ' + SWARM.hordes.length + ' hordes, ' + SWDYN.size + ' vehicles moved' + (SWARM.adapt ? ', detail ' + SWARM.adapt : '') + ', drawn ' + PERF.lodN.join('/'),
  canTrim: () => SWARM.adapt > -3, trim: () => { if (SWARM.adapt <= -3) return false; SWARM.adapt--; return true; }, boost: () => { if (SWARM.adapt >= 0) return false; SWARM.adapt++; return true; },
  check: swarmCheck, notes: swarmNotes, repair: swarmRepair, isolate: () => { SWARM.offUntil = performance.now() + 60000; }, restore: () => { SWARM.offUntil = 0; },
  save: () => ({ a: SWARM.adapt, c: SWARM.cap ? Math.round(SWARM.capLive / SWARM.cap * 100) : 100 }),
  load: v => { if (v) { SWARM.adapt = clamp(v.a | 0, -3, 0); SWARM.capLive = Math.round(SWARM.cap * clamp((v.c | 0) || 100, 40, 100) / 100); } },
  on: { run: () => swarmReset(), quality: () => { swarmCaps(); SWARM.good = 0; }, lowMemory: () => swarmForget() }
});
// what it does for the others: frees its hold on the zombie pictures when the texture engine needs to start over, and
// draws only crowd pictures while the texture engine rests
coreMeta('SWARM', { helps: { TEXEL: () => swarmForget() } });
coreOn('engineDown', 'SWARM', d => { if (d && d.name === 'TEXEL') SWARM.partOff.full = performance.now() + 60000; });
// CORE v3: the crowd's cost by how many are alive; CORE looks ahead when a horde sets off (zload: each zombie adds one)
coreMeta('SWARM', { ver: 2, trimAny: true, lv: () => SWARM.adapt + 3, adaptGet: () => SWARM.adapt * 10000 + (SWARM.capLive | 0), loadNow: () => G.zs.length, loadName: 'zombies', zload: 1,
  alive: () => G.mode === 'play' && swarmUp() && G.zs.length > 0, stallS: 4,
  reset: () => { swarmForget(); SWARM.good = 0; SWARM.adapt = clamp(SWARM.adapt | 0, -3, 0); swarmCaps(); } });
