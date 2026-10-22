/* ================= LEGEND v3: anatomy (1.9.995) =================
   The body has to be right before it can act. LEGEND measures its own body the way an anatomist and an animator would,
   on the solved skeleton (never on the numbers a clip typed in, so a pose made by reach is checked like any other):
   - Proportion: the figure in head units against the canon artists draw from and against measured adults (segment
     lengths as fractions of stature), landmark by landmark.
   - Range of motion: every joint's angles read from the bones themselves (flexion, extension, abduction, rotation,
     deviation), against clinical ranges; a pose outside them is a pose no person can make.
   - Mass and balance: the body as segments with their own mass and centre of mass, the whole-body centre of mass, and
     the base of support under the planted feet; standing, the centre of mass has to fall inside it.
   It also corrects: a joint past its range is brought back inside it (the least change that does it), and a standing
   pose off balance moves its hips over its feet, learning on the device how far to move them for a given error. */
const LGA = { learn: null, fixes: 0, checks: 0 };
// a bone's world position and axes
function lgaP(W, b) { const i = LGB[b] * 16; return [W[i + 12], W[i + 13], W[i + 14]]; }
function lgaAx(W, b, c) { const i = LGB[b] * 16 + c * 4; return [W[i], W[i + 1], W[i + 2]]; }
// a world vector in a bone's frame
function lgaIn(W, b, v) { const i = LGB[b] * 16; return [W[i] * v[0] + W[i + 1] * v[1] + W[i + 2] * v[2], W[i + 4] * v[0] + W[i + 5] * v[1] + W[i + 6] * v[2], W[i + 8] * v[0] + W[i + 9] * v[1] + W[i + 10] * v[2]]; }
const lgaDown = (W, b) => { const z = lgaAx(W, b, 2); return [-z[0], -z[1], -z[2]]; };
const lgaDeg = r => r * 180 / Math.PI;
// the twist of bone c about its own long axis relative to bone p (degrees), from the two x axes
function lgaTwist(W, p, c) {
  const a = curV3.norm(lgaAx(W, c, 2)), xp = lgaAx(W, p, 0), xc = lgaAx(W, c, 0);
  const pr = v => { const d = curV3.dot(v, a); return curV3.norm([v[0] - a[0] * d, v[1] - a[1] * d, v[2] - a[2] * d]); };
  const u = pr(xp), w = pr(xc); return lgaDeg(Math.atan2(curV3.dot(curV3.cross(u, w), a), curV3.dot(u, w)));
}
/* ---------- the joints, measured ---------- */
// every joint's anatomical angles (degrees) for one side or the trunk
function lgaJoints(W) {
  const J = {};
  for (const s of ['L', 'R']) {
    const out = s === 'L' ? 1 : -1, ps = s === 'R' ? 1 : -1;
    // shoulder: the upper arm's direction in the collarbone's frame (the shoulder blade follows the collarbone forward,
    // and the arm's range goes with it: scapulohumeral rhythm)
    const d = curV3.norm(lgaIn(W, 'clav' + s, lgaDown(W, 'arm' + s))), dyo = d[1] * out;
    J['shoulderElev' + s] = lgaDeg(Math.acos(clamp(-d[2], -1, 1)));
    J['shoulderExt' + s] = d[0] < 0 && d[2] < 0 && dyo <= 0.6 ? lgaDeg(Math.atan2(-d[0], -d[2])) : 0;   // (behind and above the shoulder is elevation, not extension)
    // (an arm raised out to the side goes back by horizontal extension instead, to about 45 degrees behind the shoulders' line)
    J['shoulderHExt' + s] = d[0] < 0 && dyo > 0.6 ? lgaDeg(Math.atan2(-d[0], dyo)) : 0;
    J['shoulderCross' + s] = dyo < 0 ? lgaDeg(Math.atan2(-dyo, Math.hypot(d[0], d[2]))) : 0;
    // elbow: the forearm in the upper arm's frame (a hinge; flexion forward of the arm's -z)
    const f = curV3.norm(lgaIn(W, 'arm' + s, lgaDown(W, 'fore' + s)));
    J['elbowFlex' + s] = lgaDeg(Math.atan2(f[0], -f[2]));
    J['elbowSide' + s] = lgaDeg(Math.abs(Math.asin(clamp(f[1], -1, 1))));
    // forearm rotation: the hand's twist on the forearm (0 = thumb forward, the arm's own neutral)
    J['forearmRot' + s] = lgaTwist(W, 'fore' + s, 'hand' + s) * ps;
    // wrist: the forearm's axis seen from the hand (flexion toward the palm, deviation toward the thumb)
    const c = curV3.norm(lgaIn(W, 'hand' + s, lgaAx(W, 'fore' + s, 2)));
    J['wristFlex' + s] = lgaDeg(Math.atan2(c[1] * ps, c[2]));   // + toward the palm
    J['wristDev' + s] = lgaDeg(Math.asin(clamp(c[0], -1, 1)));   // + toward the thumb (radial), - ulnar (out of the flexion plane)
    // fingers: each joint's flexion toward the palm
    for (const fg of ['idx', 'fin', 'rng', 'pnk']) {
      const chain = [['hand', fg], [fg, fg + '2'], [fg + '2', fg + '3']], names = ['MCP', 'PIP', 'DIP'];
      chain.forEach((q, k) => { const p = q[0] === 'hand' ? 'hand' + s : q[0] + s, dd = curV3.norm(lgaIn(W, p, lgaDown(W, q[1] + s))); J[fg + names[k] + s] = lgaDeg(Math.atan2(dd[1] * ps, -dd[2])); });
    }
    for (const [p, q, n] of [['thb', 'thb2', 'thumbMCP'], ['thb2', 'thb3', 'thumbIP']]) J[n + s] = lgaDeg(curAng(lgaDown(W, p + s), lgaDown(W, q + s)));
    // hip: the thigh in the pelvis's frame
    const h = curV3.norm(lgaIn(W, 'pelvis', lgaDown(W, 'thigh' + s))), hyo = h[1] * out;
    J['hipFlex' + s] = h[0] > 0 ? lgaDeg(Math.atan2(h[0], -h[2])) : 0;
    J['hipExt' + s] = h[0] < 0 && h[2] < 0 ? lgaDeg(Math.atan2(-h[0], -h[2])) : 0;
    J['hipAbd' + s] = hyo > 0 ? lgaDeg(Math.atan2(hyo, Math.hypot(h[0], h[2]))) : 0;
    J['hipAdd' + s] = hyo < 0 ? lgaDeg(Math.atan2(-hyo, Math.hypot(h[0], h[2]))) : 0;
    // knee: the shin in the thigh's frame (flexion behind the thigh's -z)
    const k = curV3.norm(lgaIn(W, 'thigh' + s, lgaDown(W, 'shin' + s)));
    J['kneeFlex' + s] = lgaDeg(Math.atan2(-k[0], -k[2]));
    J['kneeSide' + s] = lgaDeg(Math.abs(Math.asin(clamp(k[1], -1, 1))));
    // ankle: the foot's forward axis against the shin (0 = square; + toes up, - toes down)
    const fx = curV3.norm(lgaIn(W, 'shin' + s, lgaAx(W, 'foot' + s, 0)));
    J['ankleDorsi' + s] = lgaDeg(Math.atan2(fx[2], Math.hypot(fx[0], fx[1])));
    const fy = curV3.norm(lgaIn(W, 'shin' + s, lgaAx(W, 'foot' + s, 1)));
    J['ankleInv' + s] = -lgaDeg(Math.asin(clamp(fy[2], -1, 1))) * out;   // + the sole turned in, - turned out
    J['ankleLoad' + s] = lgaP(W, 'foot' + s)[2] - W[LGB.root * 16 + 14] < 0.11 ? 1 : 0;
  }
  // the spine: the chest against the pelvis
  const u = curV3.norm(lgaIn(W, 'pelvis', lgaAx(W, 'chest', 2)));
  J.spineFlex = lgaDeg(Math.atan2(u[0], u[2])); J.spineLat = lgaDeg(Math.atan2(u[1], u[2]));
  const cx = lgaIn(W, 'pelvis', lgaAx(W, 'chest', 0)); J.spineRot = lgaDeg(Math.atan2(cx[1], cx[0]));
  // the neck: the head against the chest
  const n = curV3.norm(lgaIn(W, 'chest', lgaAx(W, 'head', 2)));
  J.neckFlex = lgaDeg(Math.atan2(n[0], n[2])); J.neckLat = lgaDeg(Math.atan2(n[1], n[2]));
  const hx = lgaIn(W, 'chest', lgaAx(W, 'head', 0)); J.neckRot = lgaDeg(Math.atan2(hx[1], hx[0]));
  return J;
}

/* ---------- the ranges ---------- */
// [min, max] degrees for each measured angle (active range, with the passive end where a body's weight can take a joint
// further: a knee in a kneel, a hip in a deep squat). Sources: AAOS / Norkin and White clinical tables (see the course).
const LGA_ROM = {
  shoulderElev: [0, 180], shoulderExt: [0, 60], shoulderHExt: [0, 45], shoulderCross: [0, 55],
  elbowFlex: [-5, 150], elbowSide: [0, 8], forearmRot: [-90, 90],
  wristFlex: [-70, 80], wristDev: [-30, 20],
  MCP: [-30, 90], PIP: [-2, 110], DIP: [-5, 90], thumbMCP: [0, 60], thumbIP: [0, 80],
  hipFlex: [0, 125], hipFlexKnee: 140, hipExt: [0, 30], hipAbd: [0, 45], hipAdd: [0, 30],
  kneeFlex: [-5, 155], kneeSide: [0, 8], ankleDorsi: [-50, 25], ankleInv: [-20, 35],
  spineFlex: [-30, 85], spineLat: [-35, 35], spineRot: [-45, 45],
  neckFlex: [-60, 50], neckLat: [-45, 45], neckRot: [-80, 80]
};
// hip abduction with the hip flexed: 45 degrees in neutral, opening to about 70 by 90 degrees of flexion (FABER)
function lgaHipAbdMax(flex) { return LGA_ROM.hipAbd[1] + clamp(flex || 0, 0, 90) / 90 * 25; }
// the range for a measured name (fingers and sides share theirs)
function lgaRange(n) { const b = n.replace(/[LR]$/, ''); if (LGA_ROM[b]) return LGA_ROM[b]; const f = /^(idx|fin|rng|pnk)(MCP|PIP|DIP)$/.exec(b); return f ? LGA_ROM[f[2]] : null; }
// what is out of range in a set of measured angles: [[name, value, range], ...] (tol: degrees allowed past the end)
function lgaOut(J, tol) {
  const o = []; tol = tol || 0;
  for (const n in J) {
    let r = lgaRange(n); const v = J[n]; if (!r || !isFinite(v)) continue;
    if (/^ankleDorsi/.test(n) && J['ankleLoad' + n.slice(-1)]) r = [r[0], LGA_ANK.dorsiLoad];   // (under the body's weight)
    if (/^hipFlex/.test(n) && J['kneeFlex' + n.slice(-1)] > 90) r = [r[0], LGA_ROM.hipFlexKnee];   // (the hamstrings let go with the knee bent)
    if (/^hipAbd/.test(n)) r = [r[0], lgaHipAbdMax(J['hipFlex' + n.slice(-1)])];   // (a flexed hip opens further: the figure-4)
    if (v < r[0] - tol || v > r[1] + tol) o.push([n, +v.toFixed(1), r]);
  }
  return o;
}
/* ---------- the anatomist's sketch: the skeleton drawn flat, every joint green or red ---------- */
// o: { view: 'side' | 'front' | 'top', x, y, s (pixels per metre), bad: { jointName: true }, labels, col }
const LGA_LINKS = [['pelvis', 'spine'], ['spine', 'chest'], ['chest', 'neck'], ['neck', 'head'], ['chest', 'clavL'], ['clavL', 'armL'], ['armL', 'foreL'], ['foreL', 'handL'], ['chest', 'clavR'], ['clavR', 'armR'], ['armR', 'foreR'], ['foreR', 'handR'],
  ['pelvis', 'thighL'], ['thighL', 'shinL'], ['shinL', 'footL'], ['footL', 'toeL'], ['pelvis', 'thighR'], ['thighR', 'shinR'], ['shinR', 'footR'], ['footR', 'toeR']];
const LGA_JOINT_OF = { shoulder: 'arm', elbow: 'fore', forearm: 'hand', wrist: 'hand', hip: 'thigh', knee: 'shin', ankle: 'foot', spine: 'chest', neck: 'head' };
function lgaProj(p, o) { const v = o.view || 'side'; return v === 'front' ? [o.x - p[1] * o.s, o.y - p[2] * o.s] : v === 'top' ? [o.x - p[1] * o.s, o.y - p[0] * o.s] : [o.x + p[0] * o.s, o.y - p[2] * o.s]; }
function lgaSketch(g, W, o) {
  o = Object.assign({ view: 'side', x: 100, y: 200, s: 100, bad: {}, col: '#d8d2c2', lw: 2 }, o);
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  const P = n => lgaProj(lgaP(W, n), o);
  // fingers first (thin), then the body
  for (const s of ['L', 'R']) for (const f of ['idx', 'fin', 'rng', 'pnk', 'thb']) {
    const ch = ['hand' + s, f + s, f + '2' + s, f + '3' + s]; g.strokeStyle = o.col; g.globalAlpha = 0.7; g.lineWidth = 1; g.beginPath();
    ch.forEach((n, i) => { const q = P(n); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); });
    const tip = lgPt(W.subarray(LGB[f + '3' + s] * 16, LGB[f + '3' + s] * 16 + 16), 0, 0, -0.022), tq = lgaProj(tip, o); g.lineTo(tq[0], tq[1]); g.stroke();
  }
  g.globalAlpha = 1;
  for (const [a, b] of LGA_LINKS) { const p = P(a), q = P(b); g.strokeStyle = o.bad[b] ? '#ff4b3e' : o.col; g.lineWidth = o.lw * (o.bad[b] ? 1.6 : 1); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); }
  for (const n of ['head', 'neck', 'chest', 'armL', 'armR', 'foreL', 'foreR', 'handL', 'handR', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR']) { const p = P(n); g.fillStyle = o.bad[n] ? '#ff4b3e' : '#6fd08c'; g.beginPath(); g.arc(p[0], p[1], o.bad[n] ? 4.5 : 3, 0, Math.PI * 2); g.fill(); }
  // the head as a circle round its centre
  const hc = lgaProj(lgPt(W.subarray(LGB.head * 16, LGB.head * 16 + 16), 0.02, 0, 0.1), o); g.strokeStyle = o.bad.head ? '#ff4b3e' : o.col; g.lineWidth = o.lw; g.beginPath(); g.arc(hc[0], hc[1], 0.105 * o.s, 0, Math.PI * 2); g.stroke();
  g.restore();
}
// the bones a list of out-of-range angles points at
function lgaBadBones(out) { const bad = {}; for (const [n] of out) { const base = n.replace(/[LR]$/, ''), s = /[LR]$/.test(n) ? n.slice(-1) : ''; for (const k in LGA_JOINT_OF) if (base.indexOf(k) === 0) bad[LGA_JOINT_OF[k] + s] = true; if (/^(idx|fin|rng|pnk|thumb)/.test(base)) bad['hand' + s] = true; } return bad; }
/* ---------- the anatomical arm ---------- */
// For a hand that must be at a place and turned a way (holding a grip), the elbow can sit anywhere on a circle round the
// line from the shoulder to the wrist. A person picks, without thinking, the place where the wrist is not bent past its
// range, the forearm is not turned past its range, the shoulder is comfortable and the elbow hangs: LEGEND searches the
// circle for that place (staying near where the clip asked for it) and moves the elbow's pole there. A free hand (not
// holding anything) is also turned back inside the wrist's range if the clip asked too much of it.
LGA.on = true; LGA.armMs = 0; LGA.armN = 0; LGA.freeFix = 0; LGA.body = true;
// the closest distance between two segments (defined here for the arm search; LEGEND v5's checks use the same rule)
function lgqSegDistA(p1, q1, p2, q2) { return lgqSegDist(p1, q1, p2, q2); }
const LGA_WR = { flex: [-70, 80], dev: [-30, 20], pro: [-85, 85] };
function lgaExc(v, lo, hi) { return v < lo ? lo - v : v > hi ? v - hi : 0; }
function lgaArmPole(W, L, ia, ib, ic, T, ps, rootM, P, ch) {
  if (!LGA.on || !T.hasR) return;
  const t0 = performance.now(), ik = P && ch ? P.ik[ch] : null, hand = ch;
  // what the hand is doing: free (nothing in it, or a knife that goes where the hand goes), on a handguard it may roll
  // round (the support hand on a long gun), or on a grip that fixes it (the firing hand)
  const onProp = ik && ik.on, free = !onProp && !(ik && ik.fixed);   // (a pistol or a knife riding in the hand goes where the hand goes; a hand closing on a thing is held by it)
  const roll = onProp === 'carbine' && ps < 0 ? 0.7 : onProp === 'pistol' && ps < 0 ? 0.26 : 0;
  const r0 = lgaArmSearch(W, L, ia, ib, ic, T, ps, rootM, free);
  let best = r0;
  if (best.exc > 0.5 && roll) {
    // roll the hand round the gun's long axis (it stays on the handguard), looking for a turn the wrist can take
    const pi = LGB[onProp], PM = W.subarray(pi * 16, pi * 16 + 16), ax = curV3.norm([PM[0], PM[1], PM[2]]), Sk = lgSockFor(onProp, 'gripL');
    const A = Sk ? lgPt(PM, Sk[12], 0, onProp === 'carbine' ? -0.012 : Sk[14]) : [PM[12], PM[13], PM[14]];
    const p0 = T.p.slice(), R0 = T.R.slice();
    let bestRho = 0;
    for (let i = -6; i <= 6; i++) {
      if (!i) continue; const rho = roll * i / 6; lgaRollTarget(T, p0, R0, A, ax, rho);
      const r = lgaArmSearch(W, L, ia, ib, ic, T, ps, rootM); if (r.cost + Math.abs(rho) * 0.4 < best.cost + Math.abs(bestRho) * 0.4) { best = r; bestRho = rho; }
    }
    lgaRollTarget(T, p0, R0, A, ax, bestRho); if (bestRho) best = lgaArmSearch(W, L, ia, ib, ic, T, ps, rootM);
    LGA.rolled = (LGA.rolled || 0) + (bestRho ? 1 : 0);
  }
  T.pole[0] = best.p[0]; T.pole[1] = best.p[1]; T.pole[2] = best.p[2];
  // a free hand the clip turned past the wrist's range is turned back inside it
  if (free && best.wex > 0.5) { lgaWristClamp(T, best, ps); LGA.freeFix++; }
  // a gun held in one hand goes where that hand can take it: the hand is turned back inside its range and the gun turns
  // with it about the grip (the hand leads the object, not the other way round)
  else if (!free && best.wex > 0.5 && P) {
    const other = ch === 'handR' ? 'handL' : 'handR', st = P[onProp];
    if ((!P.ik[other] || P.ik[other].on !== onProp) && st && st.at === 'aim' && st.M) {
      const H0 = T.R.slice(); H0[12] = T.p[0]; H0[13] = T.p[1]; H0[14] = T.p[2]; H0[15] = 1;
      lgaWristClamp(T, best, ps);
      const H1 = T.R.slice(); H1[12] = T.p[0]; H1[13] = T.p[1]; H1[14] = T.p[2]; H1[15] = 1;
      const pi = LGB[onProp], M0 = W.slice(pi * 16, pi * 16 + 16), M1 = lgMul(lgM4(), lgMul(lgM4(), H1, lgInv(lgM4(), H0)), M0);
      W.set(M1, pi * 16); const sp = st.sp || 'chest', B = sp === 'root' ? rootM : W.subarray(LGB[sp] * 16, LGB[sp] * 16 + 16);
      st.M = lgMul(lgM4(), lgInv(lgM4(), B), M1); LGA.propFix = (LGA.propFix || 0) + 1;
    }
  }
  LGA.armN++; LGA.armMs += performance.now() - t0;
  return best;
}
// a target turned by rho about the line through A along ax
function lgaRollTarget(T, p0, R0, A, ax, rho) {
  const c = Math.cos(rho), s = Math.sin(rho), t = 1 - c, [x, y, z] = ax;
  const M = [t * x * x + c, t * x * y + s * z, t * x * z - s * y, t * x * y - s * z, t * y * y + c, t * y * z + s * x, t * x * z + s * y, t * y * z - s * x, t * z * z + c];   // columns
  const rv = v => [M[0] * v[0] + M[3] * v[1] + M[6] * v[2], M[1] * v[0] + M[4] * v[1] + M[7] * v[2], M[2] * v[0] + M[5] * v[1] + M[8] * v[2]];
  const q = rv(curV3.sub(p0, A)); T.p[0] = A[0] + q[0]; T.p[1] = A[1] + q[1]; T.p[2] = A[2] + q[2];
  for (let col = 0; col < 3; col++) { const v = rv([R0[col * 4], R0[col * 4 + 1], R0[col * 4 + 2]]); T.R[col * 4] = v[0]; T.R[col * 4 + 1] = v[1]; T.R[col * 4 + 2] = v[2]; }
}
// the free hand turned back into range: the hand's turn relative to the forearm as twist, flexion and deviation, each
// held inside its range (2 degrees in), then put back together
function lgaWristClamp(T, r, ps) {
  const F = r.F, R = T.R, H = [[R[0], R[1], R[2]], [R[4], R[5], R[6]], [R[8], R[9], R[10]]];
  // H in the forearm's frame: rel[c] = F^T * H[c]
  const rel = H.map(v => [curV3.dot(F[0], v), curV3.dot(F[1], v), curV3.dot(F[2], v)]);
  const cvec = [rel[0][2], rel[1][2], rel[2][2]];   // the forearm's z seen from the hand: rows of rel, column z
  const al = Math.asin(clamp(cvec[1], -1, 1)), be = Math.atan2(-cvec[0], cvec[2]);
  // twist: rel * Ry(-be) * Rx(-al) = Rz(tau)
  const m3 = (A, B) => [0, 1, 2].map(c => [0, 1, 2].map(rr => A[0][rr] * B[c][0] + A[1][rr] * B[c][1] + A[2][rr] * B[c][2]));
  const Rx = a => [[1, 0, 0], [0, Math.cos(a), Math.sin(a)], [0, -Math.sin(a), Math.cos(a)]], Ry = a => [[Math.cos(a), 0, -Math.sin(a)], [0, 1, 0], [Math.sin(a), 0, Math.cos(a)]], Rz = a => [[Math.cos(a), Math.sin(a), 0], [-Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
  const Z = m3(m3(rel, Ry(-be)), Rx(-al)), tau = Math.atan2(Z[0][1], Z[0][0]);
  const lim = (v, lo, hi) => clamp(v, lo + 2, hi - 2);
  const al2 = ps * lim(al * ps * CUR_DEG, LGA_WR.flex[0], LGA_WR.flex[1]) / CUR_DEG, be2 = -lim(-be * CUR_DEG, LGA_WR.dev[0], LGA_WR.dev[1]) / CUR_DEG, ta2 = ps * lim(tau * ps * CUR_DEG, LGA_WR.pro[0], LGA_WR.pro[1]) / CUR_DEG;
  const rel2 = m3(m3(Rz(ta2), Rx(al2)), Ry(be2));
  for (let c = 0; c < 3; c++) { const v = curV3.add(curV3.add(curV3.mul(F[0], rel2[c][0]), curV3.mul(F[1], rel2[c][1])), curV3.mul(F[2], rel2[c][2])); T.R[c * 4] = v[0]; T.R[c * 4 + 1] = v[1]; T.R[c * 4 + 2] = v[2]; }
}
// the search round the elbow's circle for one target (returns the best place, its cost and the forearm's frame there)
function lgaArmSearch(W, L, ia, ib, ic, T, ps, rootM, free) {
  const pa = LG_PAR[ia], PW = pa < 0 ? rootM : W.subarray(pa * 16, pa * 16 + 16);
  const S = lgPt(PW, LG_OFF[ia * 3] + L.T[ia * 3], LG_OFF[ia * 3 + 1] + L.T[ia * 3 + 1], LG_OFF[ia * 3 + 2] + L.T[ia * 3 + 2]);
  const a = Math.hypot(LG_OFF[ib * 3], LG_OFF[ib * 3 + 1], LG_OFF[ib * 3 + 2]), b = Math.hypot(LG_OFF[ic * 3], LG_OFF[ic * 3 + 1], LG_OFF[ic * 3 + 2]);
  let d = curV3.sub(T.p, S); const dl = curV3.len(d) || 1e-6; d = curV3.mul(d, 1 / dl);
  const minA = Math.PI - LG_IK_ARM.maxFlex, dmin = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(minA)), dd = clamp(dl, dmin, a + b - 1e-4);
  const ca = clamp((a * a + dd * dd - b * b) / (2 * a * dd), -1, 1), sa = Math.sqrt(1 - ca * ca);
  let p0 = T.pole.slice(); const pd = curV3.dot(p0, d); p0 = curV3.sub(p0, curV3.mul(d, pd)); if (curV3.len(p0) < 1e-5) p0 = [-d[1], d[0], 0]; p0 = curV3.norm(p0);
  const q0 = curV3.cross(d, p0), R = T.R, hx = [R[0], R[1], R[2]], hy = [R[4], R[5], R[6]], hz = [R[8], R[9], R[10]];
  const C = PW, cx = [C[0], C[1], C[2]], cy = [C[4], C[5], C[6]], cz = [C[8], C[9], C[10]];   // (the collarbone's frame: the arm's parent)
  const tp = curV3.add(S, curV3.mul(d, dd)), out = ps > 0 ? -1 : 1;
  // (LEGEND v5: the arm stays out of the body: the torso as a capsule from the pelvis to the neck, 12.5 cm thick, and the
  // elbow end of the upper arm and the forearm 4 cm; the part of the upper arm by the shoulder lies against the side)
  const inBody = (e) => { const m = curV3.lerp(S, e, 0.5); return Math.max(0, lgaTrunkPen(W, m, e, 0.05), lgaTrunkPen(W, e, tp, 0.042)); };
  const ev = (phi) => {
    const p = curV3.add(curV3.mul(p0, Math.cos(phi)), curV3.mul(q0, Math.sin(phi))), e = curV3.add(S, curV3.add(curV3.mul(d, a * ca), curV3.mul(p, a * sa)));
    const f = curV3.norm(curV3.sub(tp, e)), nf = [-f[0], -f[1], -f[2]], u = curV3.norm(curV3.sub(e, S));
    const c = [curV3.dot(hx, nf), curV3.dot(hy, nf), curV3.dot(hz, nf)], flex = Math.atan2(c[1] * ps, c[2]) * CUR_DEG, dev = Math.asin(clamp(c[0], -1, 1)) * CUR_DEG;
    let xf = curV3.sub(p, curV3.mul(f, curV3.dot(p, f))); xf = curV3.mul(curV3.norm(xf), -1);
    let w = curV3.sub(hx, curV3.mul(f, curV3.dot(hx, f))); const wl = curV3.len(w); w = wl > 1e-5 ? curV3.mul(w, 1 / wl) : xf;
    const pro = Math.atan2(curV3.dot(curV3.cross(xf, w), nf), curV3.dot(xf, w)) * CUR_DEG * ps;
    const du = [curV3.dot(u, cx), curV3.dot(u, cy), curV3.dot(u, cz)], dyo = du[1] * out, ext = du[0] < 0 && du[2] < 0 && dyo <= 0.6 ? Math.atan2(-du[0], -du[2]) * CUR_DEG : du[0] < 0 && dyo > 0.6 ? Math.atan2(-du[0], dyo) * CUR_DEG * 60 / 45 : 0, cross = dyo < 0 ? Math.atan2(-dyo, Math.hypot(du[0], du[2])) * CUR_DEG : 0;
    // (a free hand's wrist is turned back into range afterwards, so for it the arm only has to suit the shoulder)
    const wex = lgaExc(flex, LGA_WR.flex[0], LGA_WR.flex[1]) + lgaExc(dev, LGA_WR.dev[0], LGA_WR.dev[1]) + lgaExc(pro, LGA_WR.pro[0], LGA_WR.pro[1]), sex = lgaExc(ext, 0, 60) + lgaExc(cross, 0, 55);
    const exc = (free ? wex * 0.15 : wex) + sex * 1.5;
    // (1.9.997: the elbow hangs. Gravity and the shoulder's own comfort keep an elbow low and near the ribs: a term on how
    // high the elbow sits on its circle, not only on whether it is above the shoulder; an elbow out wide at shoulder
    // height is the pose the old cost chose for every hold)
    const hang = (e[2] - S[2]) / a;
    // the author's pole is the default (a strong pull toward it); the wrist's comfort and gravity move it only as far as they must
    const comfort = (flex / 80) * (flex / 80) * 0.35 + (dev / 25) * (dev / 25) * 0.35 + (pro / 90) * (pro / 90) * 0.3 + Math.max(0, hang) * 1.4 + (hang + 1) * 0.7 + (phi / Math.PI) * (phi / Math.PI) * 2.4;
    const body = LGA.body ? inBody(e) : 0;
    // (1.9.997: the body's cost saturates: an arm the clip put against the chest keeps its natural elbow, it is not thrown
    // out wide to clear a wall that is not there)
    return { cost: exc * exc * 0.05 + exc * 0.5 + (exc > 1.5 ? 20 : 0) + comfort + 2.5 * (1 - Math.exp(-body / 0.02)), exc: exc, wex: wex, flex: flex, dev: dev, pro: pro, p: p, F: [xf, curV3.cross(nf, xf), nf], body: body };
  };
  let best = ev(0), bphi = 0;
  if (LGA.trace) { for (let i = -12; i <= 12; i++) { const phi = i * Math.PI / 13, r = ev(phi), e = curV3.add(S, curV3.add(curV3.mul(d, a * ca), curV3.mul(r.p, a * sa))); LGA.trace.push({ phi: +phi.toFixed(2), cost: +r.cost.toFixed(2), exc: +r.exc.toFixed(1), flex: Math.round(r.flex), dev: Math.round(r.dev), pro: Math.round(r.pro), body: +r.body.toFixed(3), ez: +(e[2] - S[2]).toFixed(2), ey: +(e[1] - S[1]).toFixed(2) }); } }
  for (let i = -12; i <= 12; i++) { if (!i) continue; const phi = i * Math.PI / 13, r = ev(phi); if (r.cost < best.cost) { best = r; bphi = phi; } }
  for (let step = Math.PI / 26; step > 0.004; step *= 0.5) for (const s of [-1, 1]) { const r = ev(bphi + s * step); if (r.cost < best.cost) { best = r; bphi += s * step; } }
  best.phi = bphi; return best;
}
/* ---------- the anatomical ankle ---------- */
// After the leg reaches, a foot turned past the ankle's range is brought back: a foot in the air turns at the ankle; a
// planted foot whose shin has gone too far over it lifts its heel and rolls onto the ball of the foot, the way a body does.
const LGA_ANK = { dorsi: [-50, 25], dorsiLoad: 45, inv: [-20, 35] };   // (a planted foot under the body's weight bends further: the weight-bearing lunge)
function lgaAnkle(W, L, ia, ib, ic, ps, rootM) {
  if (!LGA.on) return;
  lgWorldOne(W, L, ic, rootM);
  const Sh = W.subarray(ib * 16, ib * 16 + 16), out = ps > 0 ? -1 : 1;
  const inS = v => [Sh[0] * v[0] + Sh[1] * v[1] + Sh[2] * v[2], Sh[4] * v[0] + Sh[5] * v[1] + Sh[6] * v[2], Sh[8] * v[0] + Sh[9] * v[1] + Sh[10] * v[2]];
  let fixed = false;
  for (let it = 0; it < 4; it++) {
    const F = W.subarray(ic * 16, ic * 16 + 16), planted = F[14] - rootM[14] < 0.11;
    const fx = curV3.norm(inS([F[0], F[1], F[2]])), fy = curV3.norm(inS([F[4], F[5], F[6]]));
    const dorsi = Math.atan2(fx[2], Math.hypot(fx[0], fx[1])) * CUR_DEG, inv = -Math.asin(clamp(fy[2], -1, 1)) * CUR_DEG * out;
    const dHi = planted ? LGA_ANK.dorsiLoad : LGA_ANK.dorsi[1], ed = dorsi > dHi ? dorsi - dHi + 0.5 : dorsi < LGA_ANK.dorsi[0] ? dorsi - LGA_ANK.dorsi[0] - 0.5 : 0;
    const ei = inv > LGA_ANK.inv[1] ? inv - LGA_ANK.inv[1] + 0.5 : inv < LGA_ANK.inv[0] ? inv - LGA_ANK.inv[0] - 0.5 : 0;
    if (!ed && !ei) break;
    // turn the foot in its own frame: about its y axis (toes down for too much dorsiflexion), about its x for the roll
    const k = ic * 9, Rl = L.R, loc = Rl.slice(k, k + 9), rot = lgM4(); lgRot(rot, ei * out / CUR_DEG, ed / CUR_DEG, 0);
    for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) Rl[k + c * 3 + r] = loc[r] * rot[c * 4] + loc[3 + r] * rot[c * 4 + 1] + loc[6 + r] * rot[c * 4 + 2];
    lgWorldOne(W, L, ic, rootM); fixed = true;
  }
  if (fixed) LGA.fixes++;
}
/* ---------- learning the support grips ---------- */
// A support hand can sit on a handguard or over the firing hand at many turns; the hand-made sockets bent wrists past
// their range in a third of the clips. LEGEND practises: for each support grip it turns the socket a little (rolling it
// round the gun's long axis, tipping it, turning it), re-solves every clip that uses that grip, counts how far past
// their ranges the wrists and shoulders went, keeps the change if the count fell, and halves its steps when nothing
// helps. The learned turn is kept (and the hand fits are made again for it). The curve of that count is the evidence.
// learned turns [roll about the gun's long axis, tip about its side axis, turn about its up axis] (radians)
// (keys: 'pistol|L' the support hand on a pistol, 'carbine|L' the support hand on a long gun's handguard, 'pistol|R' and
// 'carbine|R' the firing hand on the grip, which may only turn a little before the trigger finger leaves the trigger)
// (what LEGEND learned in practice on 1.9.995's clips, from all zeros: the support hand on a pistol rolled 14 degrees,
// tipped 19 and turned 7; on a handguard turned 15; the firing hands only 4 to 5. They start here; a practice run on a
// device learns them again from zero and must arrive at the same place.)
const LGA_GRIP0 = { 'pistol|L': [-0.24, -0.34, 0.12], 'carbine|L': [-0.02, -0.02, 0.26], 'pistol|R': [0, -0.07, 0], 'carbine|R': [0, 0.01, 0.08] };
LGA.grip = {}; for (const k in LGA_GRIP0) LGA.grip[k] = LGA_GRIP0[k].slice();
const LGA_GRIP_MAX = { 'pistol|L': 0.6, 'carbine|L': 0.7, 'pistol|R': 0.17, 'carbine|R': 0.17 };
function lgaSockAdj(key, S) {
  const o = LGA.grip && LGA.grip[key]; if (!o || (!o[0] && !o[1] && !o[2])) return S;
  // about the socket's own point, in the gun's frame: roll (x), tip (y), turn (z)
  const R = lgRot(lgM4(), o[0], o[1], o[2]), p = [S[12], S[13], S[14]], c = key === 'carbine|L' ? [p[0], 0, -0.012] : p;
  const T1 = lgTR(c[0], c[1], c[2], 0, 0, 0), T2 = lgTR(-c[0], -c[1], -c[2], 0, 0, 0);
  return lgMul(lgM4(), lgMul(lgM4(), lgMul(lgM4(), T1, R), T2), S);
}
// how far past their ranges the wrists and shoulders go over a set of clip samples (degrees, summed)
function lgaGripCost(samples, key) {
  const [prop, s] = key.split('|'), P = lgPose(), L = lgLocalNew(), W = lgWorldNew(); let tot = 0, n = 0;
  for (const [id, t] of samples) {
    const a = LG_ANIM_BY[id]; lgEvalClip(a, t, P, {}); const ik = P.ik['hand' + s]; if (!ik || ik.on !== prop) continue;
    lgSolve(P, L, W, lgRootM(P)); const J = lgaJoints(W);
    for (const k of ['wristFlex', 'wristDev', 'forearmRot', 'shoulderCross', 'shoulderExt']) { const r = lgaRange(k + s), v = J[k + s]; tot += lgaExc(v, r[0], r[1]); }
    n++;
  }
  // (the least turn that does it: each degree of turn counts a little, so a grip is not turned further than it must be)
  const g = LGA.grip[key]; tot += (Math.abs(g[0]) + Math.abs(g[1]) + Math.abs(g[2])) * CUR_DEG * (s === 'R' ? 0.6 : 0.25);
  return { cost: tot, n: n };
}
// the clip samples where that hand is on this prop
function lgaGripSamples(key, per) {
  const [prop, s] = key.split('|'), out = [], P = lgPose();
  for (const a of LG_ANIMS) { if (a.cat === 'Actors') continue; for (let k = 0; k <= per; k++) { const t = a.dur * k / per; lgEvalClip(a, t, P, {}); const ik = P.ik['hand' + s]; if (ik && ik.on === prop) out.push([a.id, t]); } }
  return out;
}
// practise one grip: coordinate descent on the three turns (each kept within what that grip allows); returns the curve
function lgaLearnGrip(key, o) {
  o = o || {}; const fitsWere = LGH.on; LGH.on = false;   // (the fingers do not move the wrist: no need to refit them while practising)
  const samples = o.samples || lgaGripSamples(key, o.per || 6), g = LGA.grip[key], lim = LGA_GRIP_MAX[key] || 0.5; let best = lgaGripCost(samples, key).cost;
  const curve = [best]; let step = o.step || 0.08;
  try {
    for (let round = 0; round < (o.rounds || 14) && step > 0.008; round++) {
      let improved = false;
      for (let i = 0; i < 3; i++) for (const s of [1, -1]) {
        if (Math.abs(g[i] + s * step) > lim) continue;
        g[i] += s * step; const c = lgaGripCost(samples, key).cost;
        if (c < best - 1e-6) { best = c; improved = true; } else g[i] -= s * step;
      }
      curve.push(best); if (!improved) step *= 0.5;
    }
  } finally { LGH.on = fitsWere; if (typeof lghReset === 'function') lghReset(); }
  return { curve: curve, grip: g.slice(), samples: samples.length };
}
/* ---------- joints a clip turns by hand (no reach): brought back inside their ranges ---------- */
// For limbs a clip poses joint by joint (falls, slides, sprints) and for the spine, LEGEND measures the solved pose and,
// where a joint went past its range, takes the excess back out of the clip's own angle for that joint and solves again
// (once). Joints that reach for something were already settled by the anatomical arm and ankle.
LGA.fk = true; LGA.fkFix = 0;
function lgaPostFix(P, L, W, rootM) {
  if (!LGA.on || !LGA.fk || (LGA.inFix || 0) >= 2) return false;
  const r = P.r, J = {}; let any = false;
  const add = (b, ax, v) => { r[LGB[b] * 3 + ax] += v; any = true; };
  const D = Math.PI / 180;
  // the spine: rotation shared between the lower and the upper back
  const u = curV3.norm(lgaIn(W, 'pelvis', lgaAx(W, 'chest', 2))), cx = lgaIn(W, 'pelvis', lgaAx(W, 'chest', 0)), rot = Math.atan2(cx[1], cx[0]) * CUR_DEG, flex = Math.atan2(u[0], u[2]) * CUR_DEG, lat = Math.atan2(u[1], u[2]) * CUR_DEG;
  const er = lgaExc(rot, LGA_ROM.spineRot[0], LGA_ROM.spineRot[1]) * Math.sign(rot), ef = lgaExc(flex, LGA_ROM.spineFlex[0], LGA_ROM.spineFlex[1]) * Math.sign(flex), el = lgaExc(lat, LGA_ROM.spineLat[0], LGA_ROM.spineLat[1]) * Math.sign(lat);
  if (er) { add('spine', 2, -er * D * 0.45); add('chest', 2, -er * D * 0.55); }
  if (ef) { add('spine', 1, -ef * D * 0.45); add('chest', 1, -ef * D * 0.55); }
  if (el) { add('spine', 0, el * D * 0.45); add('chest', 0, el * D * 0.55); }
  for (const s of ['L', 'R']) {
    const out = s === 'L' ? 1 : -1;
    if (!P.ik['foot' + s]) {
      const h = curV3.norm(lgaIn(W, 'pelvis', lgaDown(W, 'thigh' + s))), hyo = h[1] * out, kd = curV3.norm(lgaIn(W, 'thigh' + s, lgaDown(W, 'shin' + s)));
      const knee = Math.atan2(-kd[0], -kd[2]) * CUR_DEG, hf = h[0] > 0 ? Math.atan2(h[0], -h[2]) * CUR_DEG : 0, he = h[0] < 0 && h[2] < 0 ? Math.atan2(-h[0], -h[2]) * CUR_DEG : 0, ha = hyo > 0 ? Math.atan2(hyo, Math.hypot(h[0], h[2])) * CUR_DEG : 0;
      const hfMax = knee > 90 ? LGA_ROM.hipFlexKnee : LGA_ROM.hipFlex[1];
      if (hf > hfMax) add('thigh' + s, 1, (hf - hfMax) * D);
      if (he > LGA_ROM.hipExt[1]) add('thigh' + s, 1, -(he - LGA_ROM.hipExt[1]) * D);
      if (ha > lgaHipAbdMax(hf)) add('thigh' + s, 0, -(ha - lgaHipAbdMax(hf)) * D * out);
      if (knee > LGA_ROM.kneeFlex[1]) add('shin' + s, 1, -(knee - LGA_ROM.kneeFlex[1]) * D);
      // the ankle of a foot posed by hand
      const fx = curV3.norm(lgaIn(W, 'shin' + s, lgaAx(W, 'foot' + s, 0))), fy = curV3.norm(lgaIn(W, 'shin' + s, lgaAx(W, 'foot' + s, 1)));
      const dorsi = Math.atan2(fx[2], Math.hypot(fx[0], fx[1])) * CUR_DEG, inv = -Math.asin(clamp(fy[2], -1, 1)) * CUR_DEG * out;
      const ed = lgaExc(dorsi, LGA_ANK.dorsi[0], LGA_ANK.dorsi[1]) * Math.sign(dorsi), ei = lgaExc(inv, LGA_ANK.inv[0], LGA_ANK.inv[1]) * Math.sign(inv);
      if (ed) add('foot' + s, 1, ed * D);
      if (ei) add('foot' + s, 0, ei * D * out * 1.15);
    } else {
      // a leg that reaches for a foothold: a hip past its range moves the foothold (in toward the body, or under it)
      const ik = P.ik['foot' + s]; if (ik.sp && ik.sp !== 'root') continue;
      const h = curV3.norm(lgaIn(W, 'pelvis', lgaDown(W, 'thigh' + s))), hyo = h[1] * out, kd = curV3.norm(lgaIn(W, 'thigh' + s, lgaDown(W, 'shin' + s))), knee = Math.atan2(-kd[0], -kd[2]) * CUR_DEG;
      const he = h[0] < 0 && h[2] < 0 ? Math.atan2(-h[0], -h[2]) * CUR_DEG : 0, ha = hyo > 0 ? Math.atan2(hyo, Math.hypot(h[0], h[2])) * CUR_DEG : 0, hf = h[0] > 0 ? Math.atan2(h[0], -h[2]) * CUR_DEG : 0, hfMax = knee > 90 ? LGA_ROM.hipFlexKnee : LGA_ROM.hipFlex[1];
      const p = ik.p.slice(); let moved = false;
      if (ha > lgaHipAbdMax(hf)) { const sy = lgaIn(W, 'root', lgaAx(W, 'pelvis', 1)), k = (ha - lgaHipAbdMax(hf) + 1) * D * 0.9 * out; p[0] -= sy[0] * k; p[1] -= sy[1] * k; p[2] -= sy[2] * k * 0.5; moved = true; }
      if (he > LGA_ROM.hipExt[1]) { p[0] += (he - LGA_ROM.hipExt[1]) * D * 0.86; moved = true; }
      if (hf > hfMax) { p[0] -= (hf - hfMax) * D * 0.45; moved = true; }
      if (moved) { P.ik['foot' + s] = Object.assign({}, ik, { p: p }); any = true; }
    }
  }
  // (LEGEND v5) an arm posed by hand that goes into the body (the trunk or the head) is turned out at the shoulder,
  // a few degrees at a time, the way that frees it soonest
  if (LGA.body) for (const s of ['L', 'R']) if (!P.ik['hand' + s] && lgaArmOut(P, L, W, rootM, s)) any = true;
  if (!any) return false;
  LGA.inFix = (LGA.inFix || 0) + 1; try { lgSolve(P, L, W, rootM); } finally { LGA.inFix--; }
  LGA.fkFix++; return true;
}
// 1.9.997: how far an arm segment goes into the trunk or the head, measured against the body as modelled: the trunk's
// section is an ellipse (14 cm deep, 18.5 cm wide at the chest, narrower at the hips), in the chest's own frame, with
// the arm's radius and 1.5 cm of cloth and give allowed; the head an ellipsoid. The old test was a 16.5 cm circle,
// fatter in front than the chest is, so an elbow or forearm in its natural place in front of the chest counted as
// inside the body and the search drove the elbow out wide (the "chicken wing" on every gun hold).
const LGA_TRUNK = { dx: 0.14, dy: 0.185, hipDx: 0.12, hipDy: 0.165, give: 0.015 };
function lgaTrunkPen(W, a, b, armR) {
  const tA = lgaP(W, 'pelvis'), tN = lgaP(W, 'neck'), tB = curV3.lerp(tA, tN, 0.82);
  const fx = lgaAx(W, 'chest', 0), fy = lgaAx(W, 'chest', 1);
  // the closest approach of the segment to the trunk's axis, sampled along the segment
  let worst = 0;
  for (let i = 0; i <= 6; i++) {
    const p = curV3.lerp(a, b, i / 6), ax = curV3.sub(tB, tA), al = curV3.len(ax) || 1e-6, u = clamp(curV3.dot(curV3.sub(p, tA), ax) / (al * al), 0, 1), q = curV3.add(tA, curV3.mul(ax, u)), d = curV3.sub(p, q);
    const ex = curV3.dot(d, fx), ey = curV3.dot(d, fy), hz = curV3.dot(d, curV3.norm(ax));
    const t = u, DX = lgLerp(LGA_TRUNK.hipDx, LGA_TRUNK.dx, t), DY = lgLerp(LGA_TRUNK.hipDy, LGA_TRUNK.dy, t);
    // the ellipse radius along this direction, and how far the arm's centre sits inside it
    const r = Math.hypot(ex, ey) || 1e-6, rE = DX * DY / (Math.hypot(DY * ex, DX * ey) / r || 1e-6);
    const pen = rE + armR * 0.7 - LGA_TRUNK.give - Math.hypot(r, hz * 0);
    if (pen > worst) worst = pen;
  }
  // the head: an ellipsoid 10 cm half-deep, 8 cm half-wide, 11 cm half-tall about its centre
  const hc = lgaMark(W, 'headCenter'), hx = lgaAx(W, 'head', 0), hy = lgaAx(W, 'head', 1), hzz = lgaAx(W, 'head', 2);
  for (let i = 0; i <= 6; i++) {
    const p = curV3.lerp(a, b, i / 6), d = curV3.sub(p, hc), ex = curV3.dot(d, hx) / 0.1, ey = curV3.dot(d, hy) / 0.08, ez = curV3.dot(d, hzz) / 0.11, n = Math.hypot(ex, ey, ez) || 1e-6;
    const pen = (1 - n) * 0.09 + armR * 0.7 - LGA_TRUNK.give; if (pen > worst) worst = pen;
  }
  return worst;
}
function lgaArmPen(W, s) {
  const S = lgaP(W, 'arm' + s), E = lgaP(W, 'fore' + s), H = lgaP(W, 'hand' + s), m = curV3.lerp(S, E, 0.5);
  return Math.max(0, lgaTrunkPen(W, m, E, 0.05), lgaTrunkPen(W, E, H, 0.042));
}
function lgaArmOut(P, L, W, rootM, s) {
  const ia = LGB['arm' + s], chain = [ia, LGB['fore' + s], LGB['hand' + s]], re = () => { for (const i of chain) { lgR9(L.R, i * 9, P.r[i * 3], P.r[i * 3 + 1], P.r[i * 3 + 2]); lgWorldOne(W, L, i, rootM); } };
  let pen = lgaArmPen(W, s); if (pen < 0.015) return false;
  // (1.9.997: the shoulder is turned out or forward by a few degrees at a time, never twisted, and at most 14 degrees in
  // all: an arm an author put through the body is eased out, not thrown wide)
  const st = 0.035, moves = [[0, st], [0, -st], [1, st], [1, -st]]; let changed = false;
  for (let it = 0; it < 7 && pen > 0.01; it++) {
    let best = null, bp = pen;
    for (const [ax, v] of moves) { P.r[ia * 3 + ax] += v; re(); const q = lgaArmPen(W, s); if (q < bp - 1e-4) { bp = q; best = [ax, v]; } P.r[ia * 3 + ax] -= v; }
    if (!best) break; P.r[ia * 3 + best[0]] += best[1]; pen = bp; changed = true;
  }
  re(); if (changed) LGA.armOut = (LGA.armOut || 0) + 1; return changed;
}
/* ---------- mass and balance ---------- */
// The body as segments, each with its share of the body's mass and where along it its centre of mass lies (de Leva 1996,
// adjusting Zatsiorsky-Seluyanov's measurements to joint centres; the adult male values). [name, from, to, mass %, COM % from 'from']
const LGA_SEG = [
  ['head', 'neck', 'headTop', 6.94, 0.50], ['upper trunk', 'chest', 'neck', 15.96, 0.50], ['middle trunk', 'spine', 'chest', 16.33, 0.45], ['lower trunk', 'hips', 'spine', 11.17, 0.39],
  ['upper arm L', 'armL', 'foreL', 2.71, 0.5772], ['forearm L', 'foreL', 'handL', 1.62, 0.4574], ['hand L', 'handL', 'knuckleL', 0.61, 0.79],
  ['upper arm R', 'armR', 'foreR', 2.71, 0.5772], ['forearm R', 'foreR', 'handR', 1.62, 0.4574], ['hand R', 'handR', 'knuckleR', 0.61, 0.79],
  ['thigh L', 'thighL', 'shinL', 14.16, 0.4095], ['shank L', 'shinL', 'footL', 4.33, 0.4459], ['foot L', 'heelL', 'tipL', 1.37, 0.4415],
  ['thigh R', 'thighR', 'shinR', 14.16, 0.4095], ['shank R', 'shinR', 'footR', 4.33, 0.4459], ['foot R', 'heelR', 'tipR', 1.37, 0.4415]
];
// a named landmark's world position (joints, and a few points on bones: the top of the head, knuckles, heels, toe tips)
function lgaMark(W, n) {
  const at = (b, x, y, z) => lgPt(W.subarray(LGB[b] * 16, LGB[b] * 16 + 16), x, y, z);
  switch (n) {
    case 'headTop': return at('head', 0.01, 0, 0.19);
    case 'headCenter': return at('head', 0.015, 0, 0.09);
    case 'hips': { const a = lgaP(W, 'thighL'), b = lgaP(W, 'thighR'); return curV3.lerp(a, b, 0.5); }
    case 'chestTop': return curV3.lerp(lgaP(W, 'pelvis'), lgaP(W, 'neck'), 0.8);   // the top of the ribcage (the trunk narrows into the neck above it)
    case 'knuckleL': return at('handL', 0, 0, -0.092); case 'knuckleR': return at('handR', 0, 0, -0.092);
    case 'heelL': return at('footL', -0.06, 0, -0.07); case 'heelR': return at('footR', -0.06, 0, -0.07);
    case 'tipL': return at('toeL', 0.075, 0, -0.015); case 'tipR': return at('toeR', 0.075, 0, -0.015);
    default: return lgaP(W, n);
  }
}
// the whole body's centre of mass (world), and each segment's
function lgaCOM(W, extra) {
  let m = 0; const c = [0, 0, 0], segs = [];
  for (const [name, a, b, pct, f] of LGA_SEG) { const p = curV3.lerp(lgaMark(W, a), lgaMark(W, b), f); segs.push([name, p, pct]); c[0] += p[0] * pct; c[1] += p[1] * pct; c[2] += p[2] * pct; m += pct; }
  // something carried: { p: world point, pct: its mass as a percentage of the body's }
  if (extra) for (const e of extra) { c[0] += e.p[0] * e.pct; c[1] += e.p[1] * e.pct; c[2] += e.p[2] * e.pct; m += e.pct; }
  return { c: [c[0] / m, c[1] / m, c[2] / m], segs: segs, m: m };
}
// the base of support: the soles of the planted feet (a foot is planted when its sole is on the ground), as a hull
function lgaSupport(W, ground) {
  ground = ground == null ? 0 : ground; const pts = [];
  for (const s of ['L', 'R']) {
    const F = W.subarray(LGB['foot' + s] * 16, LGB['foot' + s] * 16 + 16), T = W.subarray(LGB['toe' + s] * 16, LGB['toe' + s] * 16 + 16);
    const corners = [lgPt(F, -0.065, 0.042, -0.075), lgPt(F, -0.065, -0.042, -0.075), lgPt(T, 0.075, 0.045, -0.02), lgPt(T, 0.075, -0.045, -0.02), lgPt(F, 0.07, 0.048, -0.08), lgPt(F, 0.07, -0.048, -0.08)];
    for (const q of corners) if (q[2] - ground < 0.035) pts.push([q[0], q[1]]);
  }
  return lgaHull(pts);
}
function lgaHull(pts) {
  if (pts.length < 3) return pts.slice();
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop(); return lo.concat(up);
}
// signed distance from a point to a convex hull's edge (positive inside), metres
function lgaInside(h, x, y) {
  if (h.length < 3) return -1; let d = 1e9;
  for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length], ex = b[0] - a[0], ey = b[1] - a[1], l = Math.hypot(ex, ey) || 1e-9; d = Math.min(d, ((x - a[0]) * ey - (y - a[1]) * ex) / l * -1); }
  return d;
}
