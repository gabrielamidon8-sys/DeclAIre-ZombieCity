/* ================= LOCO: LEGEND's gait engine, from measured human gait (1.9.996) =================
   The legs no longer swing on sine waves. Every walk, run and sprint is built from how people really move, as gait labs
   measure it (joint angles over the gait cycle, by speed), and then fitted to the ground:
   - The hip, knee and ankle follow measured curves, in two parts: the stance (the foot on the ground, from the heel's
     strike to the toe's push-off) and the swing (the foot in the air). Walking: Perry and the AAPMR / Kaiser gait tables
     (the knee 15 to 18 degrees as the weight comes on, straight at midstance, 35 to 40 at toe-off, 60 at the peak of the
     swing; the hip 25 to 30 flexed at the strike, 10 to 20 extended at push-off). Running and sprinting: Fukuchi et al.
     2017 (PeerJ) at 2.5, 3.5 and 4.5 m/s (the hip's peak flexion 44, 53 and 61 degrees, the knee's swing peak 94, 109
     and 119), and sprinters at 9.9 m/s (Frontiers 2019: the thigh lifted 70 degrees, the knee folded to about 148).
   - Speed sets everything else the way it does in people: the cadence (110 steps a minute walking at 1.33 m/s, 162 /
     171 / 183 running at 2.5 / 3.5 / 4.5 m/s), the stride (the speed over the cadence), and the share of the cycle a foot
     is down (60 percent walking, 36 running at 3.5 m/s, 26 sprinting). Walking turns into running between 1.9 and 2.6
     m/s, as it does in people, and the curves blend event by event (strike with strike, push-off with push-off).
   - The feet are planted: a foot on the ground does not slide. It lands on the heel and rolls over it, lies flat, then
     peels up over the ball of the foot with the toes staying flat on the ground (the three rockers of the foot); in the
     air the knee folds and the foot swings through on the curves' path, from wherever it left the ground to where the
     next step lands.
   - The body's height comes from the legs: the hips ride as high as the standing leg, bent as the curves bend it, holds
     them, so walking rises over each step and dips at each strike (about 5 cm, twice a stride) and running sinks into
     each landing and flies between steps, with nothing to tune by hand.
   - Around it: the pelvis turns with the swinging leg and drops on its side, the trunk turns against it and leans with
     the speed (and with the kit's weight: Harman 2000, about 11 degrees under 20 to 40 percent of the body's weight), the
     head stays level, the arms swing against the legs (28 degrees walking, the elbows bent near 90 running).
   - Any direction: the hips turn up to 45 degrees toward the way he moves while the chest stays on the aim (orientation
     warping, as Unreal and most shooters do it), the steps go the rest of the way, and moving away from the aim he walks
     or runs backwards (backward gait is close to forward gait run in reverse: shorter, slower, the toe first).
   locoPose(P, ph, o) poses a body; locoAgent() drives one over time (speed, turning, starts and stops). */

const LOCO = { Lt: 0.43, Ls: 0.42, ankZ: LG_FOOT_Z, heel: [-0.06, 0.085], ball: [0.135, 0.085], cache: new Map(), made: 0, armSign: -1 };
const LOCO_D = Math.PI / 180;
// a smooth curve through [x, y] keys (x rising from 0 to 1): Catmull-Rom with the ends held flat
function locoK(keys, x) {
  const n = keys.length; if (x <= keys[0][0]) return keys[0][1]; if (x >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0; while (i < n - 2 && keys[i + 1][0] < x) i++;
  const p0 = keys[Math.max(0, i - 1)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(n - 1, i + 2)];
  const t = (x - p1[0]) / ((p2[0] - p1[0]) || 1), t2 = t * t, t3 = t2 * t;
  // tangents scaled to the segment so uneven keys do not overshoot
  const m1 = i === 0 ? 0 : (p2[1] - p0[1]) / ((p2[0] - p0[0]) || 1) * (p2[0] - p1[0]), m2 = i + 2 >= n ? 0 : (p3[1] - p1[1]) / ((p3[0] - p1[0]) || 1) * (p2[0] - p1[0]);
  return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2;
}
// the measured curves, in degrees, split at push-off: s (stance, strike to push-off) and w (swing, push-off to strike)
const LOCO_CURVES = {
  walk: {   // ~1.35 m/s
    hip: { s: [[0, 28], [0.17, 26], [0.5, 8], [0.83, -10], [1, -2]], w: [[0, -2], [0.33, 19], [0.67, 29], [0.86, 29], [1, 28]] },
    knee: { s: [[0, 4], [0.17, 17], [0.5, 5], [0.75, 4], [0.88, 12], [1, 38]], w: [[0, 38], [0.3, 61], [0.55, 44], [0.8, 12], [0.95, 4], [1, 4]] },
    ank: { s: [[0, 0], [0.12, -8], [0.3, 0], [0.75, 10], [0.88, 4], [1, -18]], w: [[0, -18], [0.25, -10], [0.55, -1], [0.8, 1], [1, 0]] }
  },
  run: {   // ~3.5 m/s
    hip: { s: [[0, 38], [0.5, 14], [1, -8]], w: [[0, -8], [0.2, -3], [0.5, 30], [0.8, 52], [0.92, 50], [1, 38]] },
    knee: { s: [[0, 14], [0.4, 45], [0.8, 26], [1, 18]], w: [[0, 18], [0.25, 60], [0.5, 105], [0.6, 108], [0.8, 55], [0.93, 18], [1, 20]] },
    ank: { s: [[0, 6], [0.4, 26], [0.75, 12], [1, -20]], w: [[0, -20], [0.2, -18], [0.55, 0], [0.8, 10], [1, 6]] }
  }
};
const locoL = (a, b, k) => a + (b - a) * k;
const locoTab = (tab, v) => { if (v <= tab[0][0]) return tab[0][1]; for (let i = 1; i < tab.length; i++) if (v <= tab[i][0]) { const a = tab[i - 1], b = tab[i]; return locoL(a[1], b[1], (v - a[0]) / (b[0] - a[0])); } return tab[tab.length - 1][1]; };
const locoSS = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// everything a gait needs at a speed (m/s): cadence (cycles a second), stride, stance share, the run blend, the curves'
// scales, the pelvis, trunk and arms. o.back: backwards; o.load: the kit's weight as a share of the body's (0..0.5)
function locoParams(v, o) {
  o = o || {}; const back = !!o.back, load = o.load == null ? 0.3 : o.load;
  const va = Math.max(0, v);
  const wr = back ? locoSS(1.6, 2.4, va) : locoSS(1.9, 2.6, va), sp = locoSS(5.2, 7.5, va);
  const cadW = 0.55 + 0.27 * va, cadR = locoTab([[2.5, 1.35], [3.5, 1.43], [4.5, 1.52], [5.5, 1.6], [6.5, 1.7], [7.5, 1.8], [9.9, 2.3]], va);
  let cad = locoL(cadW, cadR, wr); if (back) cad *= 1.06;
  const stW = clamp(0.66 - 0.045 * va, 0.55, 0.68), stR = locoTab([[2.5, 0.4], [3.5, 0.36], [4.5, 0.32], [5.5, 0.28], [7, 0.25], [9.9, 0.24]], va);
  const st = locoL(stW, stR, wr) + load * 0.03;
  // the curves' ranges by speed: walking grows with speed; running per Fukuchi (2.5 / 3.5 / 4.5 m/s) on to sprinting
  const fW = clamp(0.5 + 0.37 * va, 0.45, 1.2), fKW = clamp(0.82 + 0.14 * va, 0.8, 1.05);
  const fH = locoTab([[2.5, 43.8 / 52.8], [3.5, 1], [4.5, 60.5 / 52.8], [7, 70 / 52.8], [9.9, 72 / 52.8]], va), fE = locoTab([[2.5, 3.6 / 8], [3.5, 1], [4.5, 11.8 / 8], [7, 16 / 8]], va), fK = locoTab([[2.5, 93.5 / 108.7], [3.5, 1], [4.5, 119.1 / 108.7], [7, 1.26], [9.9, 1.36]], va);
  const walkK = back ? 0.85 : 1;
  return {
    v: va, back: back, wr: wr, sp: sp, cad: cad, stride: va > 0.02 ? va / cad : 0, st: st, load: load,
    fW: fW * walkK, fKW: fKW, fH: fH, fE: fE, fK: fK,
    tilt: locoL(8, 13, wr) + sp * 3,   // the pelvis's forward tilt (thigh angles are the hip's minus it)
    width: locoL(0.105, 0.05, wr) - sp * 0.02, toeOut: locoL(0.1, 0.05, wr),
    pRot: locoL(4.5, 8, wr) * LOCO_D * clamp(va / 1.3, 0.3, 1.2), pObl: locoL(4, 6.5, wr) * LOCO_D * clamp(va / 1.3, 0.3, 1), pSway: locoL(0.028, 0.012, wr) * clamp(va / 1.2, 0.2, 1),
    tRot: locoL(6, 11, wr) * LOCO_D, lean: (locoL(2.5, 8, wr) + sp * 6 + load * 18 + (back ? -4 : 0)) * LOCO_D,
    // 1.9.997: the swing is centred forward of the hang (the hand comes up to the chin in front and only to the hip behind),
    // and a sprint drives harder; the elbow bends more as the arm comes forward
    armA: locoL(14, 36, wr) + sp * 22, armO: locoL(3, 10, wr) + sp * 4, elbB: locoL(24, 86, wr) + sp * 8, elbA: locoL(9, 16, wr) + sp * 6
  };
}
// a curve at a point of the cycle: f (0..1 from this foot's strike), st (stance share)
function locoCurve(c, f, st) { return f < st ? locoK(c.s, f / st) : locoK(c.w, (f - st) / (1 - st)); }
// the hip, knee and ankle angles (degrees) of one leg at f, blended walk to run by the gait's parameters
function locoAngles(G, f) {
  const W = LOCO_CURVES.walk, R = LOCO_CURVES.run, st = G.st, stance = f < st;
  let hw = locoCurve(W.hip, f, st), kw = locoCurve(W.knee, f, st), aw = locoCurve(W.ank, f, st);
  let hr = locoCurve(R.hip, f, st), kr = locoCurve(R.knee, f, st), ar = locoCurve(R.ank, f, st);
  // walking ranges scale about a mid-hip of 9 degrees; the knee's swing peak a little with speed
  hw = 9 + (hw - 9) * G.fW; if (!stance) kw = 4 + (kw - 4) * G.fKW;
  // running: flexion by fH, extension by fE, the knee's swing above its push-off by fK
  hr = hr >= 0 ? hr * G.fH : hr * G.fE; if (!stance) { const kTO = 18; kr = kr > kTO ? kTO + (kr - kTO) * G.fK : kr; }
  const k = G.wr;
  return [locoL(hw, hr, k), locoL(kw, kr, k) + G.load * (stance ? 6 : 0), locoL(aw, ar, k)];
}
// forward kinematics in the leg's sagittal plane (x forward, z up) from the hip: knee, ankle, and the sole's angle
function locoFK(G, f) {
  const a = locoAngles(G, f), th = (a[0] - G.tilt) * LOCO_D * (G.hk || 1), ph = th - a[1] * LOCO_D;
  const kx = LOCO.Lt * Math.sin(th), kz = -LOCO.Lt * Math.cos(th), ax = kx + LOCO.Ls * Math.sin(ph), az = kz - LOCO.Ls * Math.cos(ph);
  return { ax: ax, az: az, sole: a[2] * LOCO_D + ph, knee: a[1], hip: a[0], ank: a[2] };
}
// the ankle from a contact point on the ground and the sole's angle: over the heel (toe up), over the ball (heel up)
function locoAnkleAt(cx, sole) {
  const c = Math.cos(sole), s = Math.sin(sole);
  if (sole >= 0) { const hx = -LOCO.heel[0], hz = LOCO.heel[1]; return [cx + hx * c - hz * s, hx * s + hz * c]; }
  const bx = -LOCO.ball[0], bz = LOCO.ball[1]; return [cx + bx * c - bz * s, bx * s + bz * c];
}
// one gait, solved once over the cycle and kept: each foot's ankle (x, z), sole angle and toe bend in the gait's frame,
// and the hips' height, at n points. The stance foot is planted; the swing foot travels the curves' path between where it
// left the ground and where it next lands; the hips ride on the standing leg.
function locoCycle(G) {
  const key = [G.v.toFixed(2), G.back ? 1 : 0, G.load.toFixed(2)].join('|');
  let C = LOCO.cache.get(key); if (C) return C;
  const n = 96, st = G.st, T = G.stride;
  // stride warping: the thigh's swing scaled so the leg's own reach over a stance matches the ground it covers at this
  // speed (people with these legs at this speed reach this far), solved in a few passes
  G.hk = 1;
  for (let it = 0; it < 4 && T > 0.05; it++) {
    const a = locoFK(G, 0), b = locoFK(G, st - 1e-4), hx = a.ax + LOCO.heel[0] * Math.cos(a.sole) + LOCO.heel[1] * Math.sin(a.sole);
    const A2 = locoAnkleAt(hx - T * st + (LOCO.ball[0] - LOCO.heel[0]), b.sole), want = a.ax - A2[0], have = a.ax - b.ax;
    if (have > 0.05) G.hk = clamp(G.hk * want / have, 0.7, 1.45);
  }
  // (running keeps the measured thigh angles: the planted foot and the hips' height take up the difference)
  G.hk = locoL(G.hk, 1, G.wr);
  // the foot's contact on the ground over the stance: at the strike, the heel lands where the curves put it (relative to
  // the hip, which moves forward at the speed); then the planted contact moves back past the hip, a stride's stance long
  const fk0 = locoFK(G, 0), fkTO = locoFK(G, st - 1e-4);
  // in the gait's frame the hip is fixed and the ground moves back at the speed: contact x(f) = x0 - T * f (for f < st)
  // the heel's point on the ground at the strike: under the ankle, turned by the sole's angle
  const heelX0 = fk0.ax + LOCO.heel[0] * Math.cos(fk0.sole) + LOCO.heel[1] * Math.sin(fk0.sole);
  const S = [];
  for (let i = 0; i < n; i++) {
    const f = i / n, fk = locoFK(G, f);
    let ax, az, sole = fk.sole, toe = 0, contact = f < st;
    if (contact) {
      const cx0 = heelX0 - T * f;   // the heel's ground point if the foot were flat
      // the sole's angle in stance: as the curves give it, but never toe-down past what the ball allows
      const c = sole >= 0 ? cx0 : cx0 + (LOCO.ball[0] - LOCO.heel[0]);
      const A = locoAnkleAt(c, sole); ax = A[0]; az = A[1]; if (sole < 0) toe = Math.min(-sole, 55 * LOCO_D);
    } else { ax = fk.ax; az = fk.az; }   // relative to the hip; fixed up below
    S.push({ f: f, ax: ax, az: az, sole: sole, toe: toe, contact: contact, fk: fk });
  }
  // the hips' height: for each sample, the height the standing leg(s) hold the hip joint at with the curves' knee bend
  // (law of cosines on the actual reach), the lower of two when both are down; in the air, a ballistic flight between
  const legLen = k => Math.sqrt(LOCO.Lt * LOCO.Lt + LOCO.Ls * LOCO.Ls + 2 * LOCO.Lt * LOCO.Ls * Math.cos(k * LOCO_D));
  const hz = new Float32Array(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    // with both feet down the leg taking the weight (the newer stance) holds the hips; the other is unloading, its heel
    // up and its knee folding into the swing, and only keeps its toes on the ground
    let best = Infinity, bu = 2;
    for (const off of [0, 0.5]) {
      const j = Math.round(((i / n + off) % 1) * n) % n, s = S[j]; if (!s.contact) continue;
      const u = s.f / st; if (u > bu) continue;
      const l = legLen(s.fk.knee), dx = s.ax, h = Math.sqrt(Math.max(0.01, l * l - dx * dx)) + s.az; best = h; bu = u;
    }
    if (best < Infinity) hz[i] = best;
  }
  // flight (or a gap): a parabola under gravity joining the takeoff and the landing, matching their heights
  for (let i = 0; i < n; i++) {
    if (!isNaN(hz[i])) continue;
    let a = i; while (isNaN(hz[(a - 1 + n) % n])) a = (a - 1 + n) % n; let b = i; while (isNaN(hz[(b + 1) % n])) b = (b + 1) % n;
    const ia = (a - 1 + n) % n, ib = (b + 1) % n, len = ((ib - ia + n) % n) || 1, dtc = 1 / (n * G.cad), Tf = len * dtc, za = hz[ia], zb = hz[ib];
    const vz0 = (zb - za) / Tf + 0.5 * 9.81 * Tf; let k = (i - ia + n) % n; const t = k * dtc;
    hz[i] = za + vz0 * t - 0.5 * 9.81 * t * t;
  }
  // running: the body is a mass bouncing on springy legs; it sinks to its lowest at midstance (the knee near 43 degrees)
  // and rises to its highest in the middle of the flight, about 7 cm between (less as the speed climbs), and no higher
  // than the standing leg can reach
  if (G.wr > 0) {
    const A = locoTab([[2.5, 0.075], [3.5, 0.07], [4.5, 0.06], [7, 0.05], [9.9, 0.045]], G.v), lo = legLen(43) + LOCO.ankZ, half = 0.5;
    const fMin = 0.45 * st, fMax = (st + half) / 2;
    for (let i = 0; i < n; i++) {
      // u: 0 at the lowest (midstance), 0.5 at the highest (mid-flight), round through the strike back to the next lowest
      const f = (i / n) % half, down = half - fMax + fMin, u = f < fMin ? 0.5 + 0.5 * (f + half - fMax) / down : f < fMax ? (f - fMin) / (fMax - fMin) * 0.5 : 0.5 + 0.5 * (f - fMax) / down;
      const z = lo + A * (0.5 - 0.5 * Math.cos(TAU * u));
      // the reach of every foot that is down
      let reach = Infinity;
      for (const off of [0, 0.5]) { const j = Math.round(((i / n + off) % 1) * n) % n, sj = S[j]; if (!sj.contact) continue; const l = legLen(5), dx = sj.ax; reach = Math.min(reach, Math.sqrt(Math.max(0.01, l * l - dx * dx)) + sj.az - 0.004); }
      hz[i] = locoL(hz[i], Math.min(z, reach), G.wr);
    }
  }
  // smooth it round the cycle (the body is a mass on springy legs: no corners)
  const hs = new Float32Array(n); for (let pass = 0; pass < 2; pass++) { for (let i = 0; i < n; i++) { let s = 0, w = 0; for (let d = -3; d <= 3; d++) { const k = 1 - Math.abs(d) / 4; s += hz[(i + d + n) % n] * k; w += k; } hs[i] = s / w; } hz.set(hs); }
  // the swing foot: the curves' path relative to the hip, shifted at its ends to meet where the foot left the ground and
  // where it lands (so nothing jumps), and never through the ground
  const iTO = Math.ceil(st * n) % n, iIC = 0, toS = S[(iTO - 1 + n) % n], icS = S[0];
  const leftX = toS.ax, leftZ = toS.az - hz[(iTO - 1 + n) % n], landX = icS.ax, landZ = icS.az - hz[0];
  const fkA = locoFK(G, st + 1e-4), fkB = locoFK(G, 1 - 1e-4);
  for (let i = 0; i < n; i++) {
    const s = S[i]; if (s.contact) { s.z = s.az; s.x = s.ax; continue; }
    const w = (s.f - st) / (1 - st), e = w * w * (3 - 2 * w);
    const dx = locoL(leftX - fkA.ax, landX - fkB.ax, e), dz = locoL(leftZ - fkA.az, landZ - fkB.az, e);
    s.x = s.fk.ax + dx; s.z = s.fk.az + dz + hz[i];
    // the sole: from the push-off angle easing to the strike's
    s.sole = s.fk.sole; s.toe = toS.toe * Math.max(0, 1 - w * 6);
    const lowest = s.z - LOCO.ankZ + Math.min(0, Math.sin(s.sole) * 0.135, -Math.sin(s.sole) * 0.06);
    if (lowest < 0.008) s.z += 0.008 - lowest;
  }
  for (let i = 0; i < n; i++) { const s = S[i]; if (s.contact) { s.x = s.ax; s.z = s.az; } }
  C = { n: n, S: S, hz: hz, G: G, key: key }; LOCO.cache.set(key, C); LOCO.made++;
  if (LOCO.cache.size > 64) LOCO.cache.delete(LOCO.cache.keys().next().value);
  return C;
}
// a sample of a cycle at f, interpolated
function locoAt(C, f) {
  const n = C.n, x = ((f % 1) + 1) % 1 * n, i = Math.floor(x) % n, j = (i + 1) % n, k = x - Math.floor(x), a = C.S[i], b = C.S[j];
  const ang = (p, q) => p + (q - p) * k;
  return { x: ang(a.x, b.x), z: ang(a.z, b.z), sole: ang(a.sole, b.sole), toe: ang(a.toe, b.toe), contact: k < 0.5 ? a.contact : b.contact, hz: ang(C.hz[i], C.hz[j]), knee: ang(a.fk.knee, b.fk.knee) };
}
/* ---------- the pose ---------- */
// o: v (m/s), dir (the steps' direction relative to the hips, radians), back, load, arms ('free' | 'hold' | 'none'),
// yaw (the hips turned from the root's forward, radians: warping), chest (the chest's turn back toward the aim),
// lean (extra forward lean, radians: acceleration), crouch (m), idle (0..1 back toward standing)
function locoPose(P, ph, o) {
  o = o || {}; const G = locoParams(o.v || 0, o), C = locoCycle(G), mv = locoSS(0.04, 0.45, G.v) * (1 - (o.idle || 0));
  const dir = o.dir || 0, cd = Math.cos(dir), sd = Math.sin(dir), back = G.back, yaw = o.yaw || 0;
  const hip0 = 0.935, standH = LOCO.Lt + LOCO.Ls + LOCO.ankZ;
  const out = { contactL: false, contactR: false, hz: 0 };
  // where the hips ride: the cycle's height (the hip joints over the ground) minus a standing height, blended in by speed;
  // backwards is the same gait run in reverse (each foot's cycle read from the end)
  const fL = ((ph % 1) + 1) % 1, fR = (fL + 0.5) % 1, eL = back ? 1 - fL : fL, eR = back ? (1 - fR + 1) % 1 : fR;
  const sL = locoAt(C, eL), sR = locoAt(C, eR);
  const hz = locoAt(C, eL).hz, drop = (hz - standH - 0.006) * mv - (o.crouch || 0) - 0.03 * (1 - mv);
  out.hz = hz;
  // the pelvis: the forward leg's side forward (turned toward the other side), the swing side dropped as the weight
  // comes onto the standing leg, a sway over the standing foot; tilted forward with the lean
  const c2 = Math.cos(TAU * eL);
  const pRot = -G.pRot * c2 * mv, pObl = G.pObl * Math.sin(TAU * (eL + 0.1)) * mv;
  const sway = G.pSway * Math.sin(TAU * (eL - 0.12)) * mv;
  const lean = G.lean * (0.35 + 0.65 * mv) + (o.lean || 0), px = -lean * 0.06;
  lgPelvis(P, px, sway, drop, pObl, lean * 0.35, yaw + pRot);
  // the legs: each foot's ankle in the gait's frame, turned to the steps' direction; lateral spacing kept square to the hips
  const width = G.width, legs = [['L', 1, sL], ['R', -1, sR]];
  for (const [side, sg, s] of legs) {
    // standing still the feet come back under the hips, a hand's width apart
    const idleX = side === 'L' ? 0.04 : -0.04, ax = locoL(idleX, s.x, mv), lat = sg * locoL(0.125, (o.width != null ? o.width : width) / 2 + 0.01, mv);
    let x = ax * cd + px, y = lat + ax * sd;
    // diagonal steps must not cross: keep each foot on its own side
    const minY = 0.035; if (sg > 0 && y < minY) y = minY + (y - minY) * 0.25; if (sg < 0 && y > -minY) y = -minY + (y + minY) * 0.25;
    // the root's frame: the hips' yaw turns the steps
    const cy = Math.cos(yaw), sy = Math.sin(yaw), X = x * cy - y * sy, Y = x * sy + y * cy;
    // (o.drag: one foot that barely leaves the ground, scuffing: the dead's limp)
    const lift = (s.z - LOCO.ankZ) * mv * (side === 'R' && o.drag ? 1 - o.drag : 1), sole = s.sole * mv * (side === 'R' && o.drag ? 1 - o.drag * 0.7 : 1), toe = s.toe * mv;
    // the foot points along the hips (turned out a little), partly toward diagonal steps
    const fy = yaw + sg * G.toeOut + clamp(dir, -0.8, 0.8) * 0.3 * mv;
    lgFoot(P, side, X, Y, lift, -sole, fy, -toe * 0.9);
    P.ik['foot' + side].pole = [Math.cos(fy + dir * 0.25), Math.sin(fy + dir * 0.25), 0.12];
    if (side === 'L') out.contactL = s.contact; else out.contactR = s.contact;
  }
  // the kit swinging with the steps: the antenna whips with each footfall, the dump pouch and the strap tails swing with the
  // stride and trail when he leans into speed
  const gv = mv * clamp(G.v / 3.5, 0.15, 1.4), e2 = TAU * 2 * eL, ln = (o.lean || 0);
  lgJ(P, 'antenna', 0.05 * gv * Math.sin(TAU * eL + 0.6), 0.11 * gv * Math.sin(e2 - 1.1) - 0.05 * gv - ln * 0.6, 0);
  lgJ(P, 'dump', 0.12 * gv * Math.sin(TAU * eL + 0.4), 0.15 * gv * Math.sin(e2 - 0.9) + ln * 0.5, 0);
  lgJ(P, 'tailL', 0.22 * gv * Math.sin(TAU * eL + 0.3), 0.2 * gv * Math.sin(e2 - 0.8) + 0.12 * gv + ln * 0.8, 0);
  lgJ(P, 'tailR', 0.22 * gv * Math.sin(TAU * eL + 2.1), 0.2 * gv * Math.sin(e2 - 0.5) + 0.12 * gv + ln * 0.8, 0);
  // the trunk: free arms turn the chest against the pelvis; holding a gun the chest stays on the aim (o.chest, the chest's
  // world turn from the root's forward), the lumbar spine taking the hips' turn; leaning with speed, bent sideways against
  // the pelvis's drop
  const free = o.arms === 'free', cW = (o.chest || 0) + (free ? G.tRot * c2 * mv : G.tRot * 0.12 * c2 * mv), rel = cW - (yaw + pRot);
  lgJ(P, 'spine', -pObl * 0.6, lean * 0.3, rel * 0.5);
  lgJ(P, 'chest', -pObl * 0.3, lean * 0.3, rel * 0.5);
  // the head level and steady (the eyes ride a gimbal): it takes back most of the lean
  lgJ(P, 'neck', -pObl * 0.05, -lean * 0.55, 0); lgJ(P, 'head', -pObl * 0.05, -lean * 0.3, 0);
  // free arms swing against the legs: forward with the other side's leg; the elbow bends more as the arm comes forward
  if (free) {
    for (const [side, e] of [['L', eL], ['R', eR]]) {
      const sw = -Math.cos(TAU * (e - 0.04));
      const sh = (G.armO + G.armA * sw * mv) * LOCO_D, el = (G.elbB + G.elbA * Math.max(0, sw) * mv) * LOCO_D * (0.4 + 0.6 * mv) + 0.18 * (1 - mv);
      lgArm(P, side, LOCO.armSign * sh, 0.1 + G.wr * 0.05, -0.25 * G.wr * mv, el, 0.05, 0.0);   // (1.9.997: turned in a little, so the forearms swing across toward the midline, not splayed)
    }
  }
  out.lean = lean; out.G = G;
  return out;
}
/* ---------- driving a body over time ---------- */
// a walker: give it a velocity (root space, m/s) and a facing (the aim) each step; it keeps the phase, turns the hips
// toward the motion (with a switch to walking backwards past 100 degrees), leans into speeding up, eases into stops
function locoAgent(o) { o = o || {}; return { ph: 0, v: 0, dir: 0, yaw: 0, vy: 0, back: false, lean: 0, lv: 0, accel: 0, load: o.load == null ? 0.3 : o.load, t: 0 }; }
function locoStep(A, dt, vx, vy, face) {
  const sp = Math.hypot(vx, vy), prev = A.v;
  A.v += (sp - A.v) * Math.min(1, dt * 7); A.accel += (((A.v - prev) / Math.max(dt, 1e-3)) - A.accel) * Math.min(1, dt * 6);
  if (A.v > 0.05) {
    const md = Math.atan2(vy, vx), rel = locoAng(md - face);
    // forward or backward, with a margin so it does not flip back and forth at the edge
    if (A.back && Math.abs(rel) < 1.6) A.back = false; else if (!A.back && Math.abs(rel) > 1.85) A.back = true;
    const tgtYaw = A.back ? clamp(locoAng(rel - Math.PI), -0.78, 0.78) : clamp(rel, -0.78, 0.78);
    // the hips turn as a mass on a spring (a little quicker than the chest)
    const w = 12, x = locoAng(A.yaw - tgtYaw); A.vy += (-w * w * x - 2 * w * A.vy) * dt; A.yaw += A.vy * dt;
    A.dir = A.back ? locoAng(rel - Math.PI - A.yaw) : locoAng(rel - A.yaw);
  } else { const w = 6, x = A.yaw; A.vy += (-w * w * x - 2 * w * A.vy) * dt; A.yaw += A.vy * dt; }
  const G = locoParams(A.v, { back: A.back, load: A.load });
  A.ph = (A.ph + (G.stride > 0 ? A.v / G.stride : 0) * dt) % 1;
  if (A.v < 0.05) { const near = Math.round(A.ph * 2) / 2; A.ph += (near - A.ph) * Math.min(1, dt * 3); }   // stopping: settle on a double stance
  // leaning into acceleration (and back on a stop), on a spring
  const lt = clamp(A.accel * 0.035, -0.12, 0.2), w2 = 9; A.lv += (-w2 * w2 * (A.lean - lt) - 2 * 0.7 * w2 * A.lv) * dt; A.lean += A.lv * dt;
  A.t += dt; return A;
}
function locoApply(A, P, o) { return locoPose(P, A.ph, Object.assign({ v: A.v, dir: A.dir, back: A.back, yaw: A.yaw, lean: A.lean, load: A.load }, o || {})); }
const locoAng = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
/* ---------- the moving clips, rebuilt on the gait engine ---------- */
// each keeps its name, its place in the fifty and what his hands do; the legs, hips, trunk and timing now come from the
// engine at that clip's speed, and a cycle lasts exactly one stride at that speed (so it loops without a seam)
(function locoClips() {
  const def = (id, v, o, upper, desc) => {
    const a = LG_ANIM_BY[id]; if (!a) return;
    const G = locoParams(v, o), st = G.st; a.dur = +(1 / G.cad).toFixed(4); a.loco = Object.assign({ v: v }, o); if (desc) a.desc = desc;
    a.fn = (P, t, ctx, A) => {
      const free = upper === 'free' && !ctx.run, r = locoPose(P, t / A.dur, Object.assign({ v: v, arms: free ? 'free' : 'hold' }, o));
      if (ctx.run) { lgRunAim(P, ctx, t, v > 3 ? 1.6 : 1); return; }
      if (typeof upper === 'function') upper(P, t, ctx, A, r);
    };
    // the footfalls (for the sounds): each foot's strike; backwards the toe lands where the push-off was
    const fL = o.back ? (1 - st) % 1 : 0, fR = (fL + 0.5) % 1;
    a.ev = [[+(fL * a.dur).toFixed(4), 'stepL'], [+(fR * a.dur).toFixed(4), 'stepR']].sort((x, y) => x[0] - y[0]);
  };
  const low = (P, t, ctx, A) => { const v = LG_POST.low.slice(); v[4] -= 0.05; lgPistolAt(P, v, { poleR: LG_POLE.Rt, poleL: LG_POLE.Lt }); lgLookAt(P, Math.sin(t / A.dur * Math.PI) * 0.3 - 0.15, 0.04); };
  const high = (P) => lgPistolAt(P, LG_POST.high, { poleR: LG_POLE.Rt, poleL: LG_POLE.Lt });
  const iso = (P) => lgPistolAt(P, LG_POST.iso);
  def('walk_tac', 1.1, { load: 0.3, crouch: 0.03 }, low, 'Heel first, rolling to the toe at a careful 1.1 m/s (about 100 steps a minute), knees soft and the weight a little forward under the kit, so the pistol stays level at low ready. The eyes keep working the alley.');
  def('patrol', 1.45, { load: 0.3 }, (P, t, ctx, A) => {
    P.pistol.at = 'handR'; P.grip.R = 'pistol'; const sw = Math.sin(TAU * t / A.dur); lgArm(P, 'R', 0.12 + sw * 0.1, 0.12, -0.25, 0.28, -0.35);
    lgSpine(P, -0.04, 0, 0); lgLookAt(P, Math.sin(t * 0.9) * 0.2, -0.06);
  }, 'The mercenary in him at 1.45 m/s: pistol hanging easy in one hand, the other arm swinging against the legs, shoulders loose and chin up. Confident, not careless.');
  // (the patrol's free left arm swings with the gait; the right holds the pistol)
  { const a = LG_ANIM_BY.patrol; if (a) { const f0 = a.fn; a.fn = (P, t, ctx, A) => { if (ctx.run) return f0(P, t, ctx, A); locoPose(P, t / A.dur, { v: 1.45, load: 0.3, arms: 'free' }); P.pistol.at = 'handR'; P.grip.R = 'pistol'; const sw = Math.sin(TAU * t / A.dur); lgArm(P, 'R', 0.12 + sw * 0.1, 0.12, -0.25, 0.28, -0.35); lgLookAt(P, Math.sin(t * 0.9) * 0.2, -0.06); }; } }
  def('jog', 2.8, { load: 0.3 }, high, 'A measured jog at 2.8 m/s and compressed high ready: the gun tucked to the chest, muzzle level; both feet leave the ground between steps.');
  def('run', 4.0, { load: 0.3 }, (P) => { lgPistolAt(P, LG_POST.sul, { one: true, poleR: LG_POLE.Rt }); lgHandTo(P, 'L', 'chest', [0.13, 0.015, 0.02], [0, 0.0, 0.2], LG_POLE.Lt); P.grip.L = 'open'; }, 'Running at 4 m/s at Sul: support palm flat on the chest, the pistol above it pointing down, so nothing in front of him is ever covered by the muzzle. The heel kicks up behind and the knee drives through, as measured runners do.');
  def('sprint', 6.5, { load: 0.3 }, 'free', 'Gun holstered to run: a 6.5 m/s sprint (about 200 steps a minute), elbows near 90 degrees driving from the hip to the chest, the thigh lifted high, the body pitched into it.');
  def('crouch_walk', 0.9, { load: 0.3, crouch: 0.26 }, (P, t) => { high(P); lgLookAt(P, Math.sin(t * 1.1) * 0.18, -0.12); }, 'Low and smooth under a window line: knees deep, short heel-to-toe steps at 0.9 m/s, the pistol at compressed high ready.');
  def('strafe_l', 1.4, { load: 0.3, dir: 0.785, yaw: 0.785 }, iso, 'Moving left with the sights on the target: the hips turn 45 degrees toward the way he goes while the chest stays square to the target, and the steps carry him the rest of the way, the feet kept on their own sides.');
  def('strafe_r', 1.4, { load: 0.3, dir: -0.785, yaw: -0.785 }, iso, 'The same to the right: the hips turn toward the step, the chest and the isosceles stay on the target.');
  def('backpedal', 1.0, { load: 0.3, back: true }, iso, 'Retreat only with a reason, and slowly (1 m/s): backward walking is forward walking run in reverse, so the toe touches first and feels for what is behind him, the heel follows; eyes and muzzle on the threat.');
})();
