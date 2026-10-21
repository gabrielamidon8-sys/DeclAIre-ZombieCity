/* ================= LEGEND v4: moving with things (1.9.995) =================
   Holding a thing is half of handling it; the other half is the movement round it. LEGEND learned these from the motor-
   control literature and does them on its own, from where the thing is and what it weighs:
   - Reaching to grasp (Jeannerod's two channels): the eyes go to the thing first and the head follows them; then the
     hand travels in one smooth bell of speed that peaks before the middle (about 42% of the way: the slow landing is
     longer than the launch), along a gentle curve that comes in from the side the palm faces. Meanwhile the hand opens
     wider than the thing (the widest at about 70% of the reach: 55 mm plus three quarters of the thing's width) and
     closes on it as it arrives. How long the reach takes follows Fitts's law: longer for farther, smaller targets.
   - The body helps: a reach beyond the comfortable length of the arm leans the trunk and bends the hips; anything low
     is reached by bending the knees; and the hips move back as the trunk leans forward so that the centre of mass stays
     over the feet. How far to move the hips for a given lean is a gain LEGEND learns over practice reaches.
   - Lifting and carrying: the thing becomes part of the body's mass; the body leans away from a load to keep the
     balance; a heavy box is lifted with the legs (knees and hips bend, the back stays long).
   - Handing over: the giver holds the thing out about halfway between the two; the receiver reaches for it; the giver
     lets go only when the receiver's hand closes, and the weight passes from one hand to the other over about 0.3 s.
   - Throwing (the kinetic chain): the stride foot lands, then the hips turn (peak speed at about 30% of the time from
     the foot landing to the release), then the trunk (about 50%), then the elbow straightens and the upper arm turns in
     at the very end, each part faster than the one before. The ball leaves with the speed of the hand. */
const LGM = { gain: 0.55, curve: [], made: 0, trials: 0 };
/* ---------- the set: a table ---------- */
const LGM_SET = { table: { name: 'Table', parts: [['box', [0, 0, 0.725], [0.45, 0.32, 0.018], 0.004], ['box', [0.4, 0.27, 0.355], [0.025, 0.025, 0.355], 0.003], ['box', [-0.4, 0.27, 0.355], [0.025, 0.025, 0.355], 0.003], ['box', [0.4, -0.27, 0.355], [0.025, 0.025, 0.355], 0.003], ['box', [-0.4, -0.27, 0.355], [0.025, 0.025, 0.355], 0.003]], col: '#5d4630', t: 'leather' } };
LG_MAKERS.set_table = (B) => { const o = LGM_SET.table; lgBone(B, 'root'); lgMat(B, lgMtl({ c: o.col, t: -1, r: 0.55, m: 0, k: 0.6 })); for (const q of o.parts) lgBox(B, q[1][0], q[1][1], q[1][2], q[2][0], q[2][1], q[2][2], q[3]); };
/* ---------- time shapes ---------- */
// the bell of speed: v(t) proportional to t^a (1-t)^b peaks at a/(a+b); its running integral is the distance covered
function lgmBell(a, b, n) { n = n || 200; const s = new Float32Array(n + 1); let acc = 0; for (let i = 1; i <= n; i++) { const t = (i - 0.5) / n; acc += Math.pow(t, a) * Math.pow(1 - t, b); s[i] = acc; } for (let i = 0; i <= n; i++) s[i] /= acc; return s; }
const LGM_BELL = lgmBell(2.1, 2.9), LGM_SYM = lgmBell(2.5, 2.5);
function lgmS(tab, t) { if (t <= 0) return 0; if (t >= 1) return 1; const n = tab.length - 1, x = t * n, i = Math.floor(x); return tab[i] + (tab[i + 1] - tab[i]) * (x - i); }
// Fitts's law for a reach: movement time from the distance and the size of the target (seconds)
function lgmFitts(D, W) { return 0.26 + 0.11 * Math.log2(2 * D / Math.max(W, 0.006)); }
// a quadratic curve that arrives along a direction
function lgmBez(p0, c, p1, s) { const a = (1 - s) * (1 - s), b = 2 * (1 - s) * s, d = s * s; return [p0[0] * a + c[0] * b + p1[0] * d, p0[1] * a + c[1] * b + p1[1] * d, p0[2] * a + c[2] * b + p1[2] * d]; }
// the curve measured along its length, so the hand's speed is the bell's and not the curve's own
function lgmArc(p0, c, p1, n) { n = n || 64; const L = new Float32Array(n + 1); let prev = p0; for (let i = 1; i <= n; i++) { const q = lgmBez(p0, c, p1, i / n); L[i] = L[i - 1] + curV3.len(curV3.sub(q, prev)); prev = q; } for (let i = 0; i <= n; i++) L[i] /= L[n] || 1; return L; }
function lgmArcU(L, s) { if (s <= 0) return 0; if (s >= 1) return 1; let lo = 0, hi = L.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] < s) lo = m; else hi = m; } return (lo + (s - L[lo]) / ((L[hi] - L[lo]) || 1e-9)) / (L.length - 1); }
// turning from one hand orientation to another (rotation parts of two 4x4s)
function lgmTurn(A, B, k) { const qa = lgQ(A, null, [0, 0, 0, 1]), qb = lgQ(B, null, [0, 0, 0, 1]), q = lgNlerp(qa, qb, k, [0, 0, 0, 1]), R = new Float32Array(9); lgQM(q, R, 0); const M = lgM4(); M[0] = R[0]; M[1] = R[1]; M[2] = R[2]; M[4] = R[3]; M[5] = R[4]; M[6] = R[5]; M[8] = R[6]; M[9] = R[7]; M[10] = R[8]; return M; }
/* ---------- grips while moving ---------- */
// the opening of a grip: the distance between the pads of the thumb and the index (hand space, metres)
function lgmAperture(g, ps) { const segs = lgoSegs(g, ps); let ti = null, ii = null; for (const q of segs) { if (q.k === 0 && q.j === 2) ii = curV3.lerp(q.A, q.B, 0.72); if (q.k === 4 && q.j === 2) ti = curV3.lerp(q.A, q.B, 0.72); } return curV3.len(curV3.sub(ti, ii)); }
const LGM_OPEN = { f: [[0.02, 0.06, 0.04], [0.02, 0.06, 0.04], [0.05, 0.08, 0.05], [0.08, 0.1, 0.06]], t: [-0.95, 0.05, 0.15, 0.05, 0.05], sp: 0.45 };
const LGM_RELAX = { f: [[0.35, 0.45, 0.3], [0.42, 0.55, 0.35], [0.5, 0.62, 0.4], [0.55, 0.7, 0.45]], t: [-0.35, 0.3, 0.35, 0.15, 0.1], sp: 0.1 };
function lgmMix(a, b, k) { return { f: a.f.map((c, i) => c.map((v, j) => v + (b.f[i][j] - v) * k)), t: a.t.map((v, i) => v + (b.t[i] - v) * k), sp: (a.sp || 0) + ((b.sp || 0) - (a.sp || 0)) * k }; }
// how far to open toward the open hand so the grip is as wide as wanted (the widest opening on the way to a thing)
function lgmOpenFor(g, want, ps) { let lo = 0, hi = 1; if (lgmAperture(lgmMix(g, LGM_OPEN, 1), ps) < want) return 1; for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (lgmAperture(lgmMix(g, LGM_OPEN, m), ps) < want) lo = m; else hi = m; } return (lo + hi) / 2; }
// the widest opening people use for a thing w wide (Jeannerod; Smeets & Brenner): about 55 mm plus 0.75 w
function lgmMGA(w) { return 0.055 + 0.75 * w; }
// the width the fingers have to get round (across the grasp)
function lgmWidth(key, type) { const o = LGO_OBJ[key], m = o.parts[0]; if (type === 'hook') return 0.03; if (m[0] === 'cyl') return m[2] * 2; if (m[0] === 'sph') return m[2] * 2; if (m[0] === 'box') { const h = m[2].slice().sort((a, b) => a - b); return h[1] * 2 > 0.09 ? h[0] * 2 : h[1] * 2; } return 0.03; }
/* ---------- the body round a reach ---------- */
function lgmSolve(P, W, L) { L = L || lgLocalNew(); W = W || lgWorldNew(); lgSolve(P, L, W, lgRootM(P)); return W; }
const LGM_ARM = 0.6;   // shoulder to the middle of the palm, metres
// lean and bend so the shoulder comes within reach of a point; then keep the centre of mass over the feet
// o: { side, target (world), lean0, extra: [{ p, pct }], gain }
function lgmBody(P, o) {
  const s = o.side || 'R', k = o.gain == null ? LGM.gain : o.gain; let lean = o.lean0 || 0, squat = 0, err = 0, shift = 0;
  const other = s === 'R' ? 'L' : 'R';
  // (the free arm hangs: a relaxed arm stays vertical as the trunk leans, it does not lean with it)
  const cr = o.crouch || 0, pose = () => { lgBase(P, { lean: 0.02, crouch: 0.03 + squat + cr }); P.t[LGB.pelvis * 3 + 2] = -0.03 - squat - cr; lgJadd(P, 'pelvis', 0, lean * 0.55, 0); lgJadd(P, 'spine', 0, lean * 0.25, 0); lgJadd(P, 'chest', 0, lean * 0.2, 0); lgJadd(P, 'neck', 0, -lean * 0.45, 0); if (!P.ik['hand' + other]) lgJadd(P, 'arm' + other, 0, -lean * 0.92, 0); };
  // the hips go back as the trunk goes forward (one step with the learned gain), so the centre of mass stays over the feet
  const balance = () => { const W = lgmSolve(P), e = lgmCOMerr(W, o.extra, P.root[3]); err = e.err; shift = -err * k * 2.2; P.t[LGB.pelvis * 3] += shift; return W; };
  if (o.target) squat = clamp((0.62 - o.target[2]) * 0.55, 0, 0.32);   // a low target bends the knees (below about 0.6 m the legs do the work)
  for (let it = 0; it < 9; it++) {
    pose(); balance(); if (!o.target) break;
    // then the trunk leans until the shoulder is within reach (checked after the hips have moved back)
    const W = lgmSolve(P), sh = lgaP(W, 'arm' + s), d = curV3.len(curV3.sub(o.target, sh)); if (d < LGM_ARM * 0.92 || lean > 1.2) break;
    lean += Math.min(0.22, (d - LGM_ARM * 0.9) * 1.3);
  }
  return { lean: lean, squat: squat, err: err, shift: shift };
}
// the balance error after a pose is solved (metres from the middle of the feet, along the facing; positive: forward)
function lgmCOMerr(W, extra, yaw) { const sup = lgaSupport(W, 0), c = lgaCOM(W, extra).c, n = Math.max(1, sup.length), cx = sup.reduce((a, q) => a + q[0], 0) / n, cy = sup.reduce((a, q) => a + q[1], 0) / n; return { err: (c[0] - cx) * Math.cos(yaw || 0) + (c[1] - cy) * Math.sin(yaw || 0), inside: lgaInside(sup, c[0], c[1]), c: c }; }
// practice: reaches to points near and far, low and high. Each try is posed twice, without the hips' correction and with
// the gain as it stands; how much the gain moved the error tells LEGEND what gain would have balanced that try exactly,
// and the gain moves halfway there. The error of each try (before it learns from it) is the learning curve.
function lgmLearnBalance(n, o) {
  o = o || {}; const rng = curRng(o.seed || 7), curve = []; let k = o.k0 == null ? 0 : o.k0;
  const tryAt = (tgt, gain) => { const P = lgPose(); lgPoseReset(P); P.root = [0, 0, 0, 0]; lgHandTo(P, 'R', 'root', tgt, [0, -1.2, 0]); lgmBody(P, { side: 'R', target: tgt, gain: gain }); return lgmCOMerr(lgmSolve(P), null, 0).err; };
  for (let i = 0; i < (n || 24); i++) {
    const tgt = [0.4 + rng() * 0.45, -0.28 + rng() * 0.14, 0.3 + rng() * 0.8], e0 = tryAt(tgt, 0), g = k || 0.5, e = tryAt(tgt, g);
    curve.push(Math.abs(k ? e : e0));
    const slope = (e - e0) / g; if (Math.abs(slope) > 1e-5 && Math.abs(e0) > 0.002) { const kStar = clamp(-e0 / slope, 0, 3); k = k + (kStar - k) * 0.5; }
  }
  LGM.gain = k; LGM.curve = curve; LGM.trials += n || 24; return { k: k, curve: curve };
}
/* ---------- a performance: actors, things, and a clock ---------- */
// A performance is evaluated at any time t: it poses its actors (poses to be solved), places the things, and says where
// the eyes look. Its beats name the moments (the reach starts, the hand closes, the release...).
function lgmPerf(o) { return Object.assign({ dur: 2, beats: [], actors: [], things: [], at: null }, o); }
function lgmThing(key, M) { return { key: key, M: M || lgM4() }; }
// the hand's world matrix for a grasp on a thing placed at OW
function lgmGraspM(OW, gr) { return lgMul(lgM4(), OW, gr.S); }
// the rest pose's hand (world) for an actor
function lgmRestHand(root, s) { const P = lgPose(); lgPoseReset(P); P.root = root.slice(); lgBase(P, {}); const W = lgmSolve(P); return W.subarray(LGB['hand' + s] * 16, LGB['hand' + s] * 16 + 16).slice(); }
// eyes and head toward a point: the eyes go first (the head follows 30 ms later and takes most of the turn)
function lgmLook(P, W, target, k, o2) {
  if (!W) return; const hd = lgaP(W, 'head'), d = curV3.sub(target, hd), yaw = Math.atan2(d[1], d[0]) - P.root[3], pit = Math.atan2(-d[2], Math.hypot(d[0], d[1]));
  const y = Math.atan2(Math.sin(yaw), Math.cos(yaw)); lgLookAt(P, clamp(y, -1.2, 1.2) * k, clamp(pit - (o2 || 0), -0.9, 1.1) * k, 0);
}
/* ---------- reach to grasp, lift, carry, set down ---------- */
// o: { key, at: [x, y, z] (where the thing stands), yaw, side, task, root: [x, y, z, yaw], lift: metres, carry: [x, y, z] (root space) }
function lgmReach(o) {
  const s = o.side || 'R', ps = s === 'R' ? 1 : -1, root = o.root || [0, 0, 0, 0], key = o.key, ob = LGO_OBJ[key];
  const OW = lgMul(lgM4(), lgTR(o.at[0], o.at[1], o.at[2]), lgRot(lgM4(), 0, 0, o.yaw || 0));
  // the approach: from the shoulder's side, in the thing's own space
  const sh = [root[0] + Math.cos(root[3]) * 0.0 - Math.sin(root[3]) * -0.19 * ps, root[1] + Math.sin(root[3]) * 0.0 + Math.cos(root[3]) * -0.19 * ps, 1.38], appW = curV3.norm([o.at[0] - sh[0], o.at[1] - sh[1], 0]);
  const OI = lgInv(lgM4(), OW), appO = lgDir(OI, appW[0], appW[1], 0);
  const gr = lgoGrasp(key, { side: s, task: o.task, app: [appO[0], appO[1], 0], type: o.type });
  const H1 = lgmGraspM(OW, gr), H0 = lgmRestHand(root, s), p0 = [H0[12], H0[13], H0[14]], p1 = [H1[12], H1[13], H1[14]];
  // (LEGEND v5: an effort quality changes the timing, the bell, the path and the body; neutral when not asked)
  const E = typeof lgqEffort === 'function' ? lgqEffort(o.effort || 'neutral') : { mtK: 1, bell: LGM_BELL, lat: 0.02, crouch: 0, secureK: 1, peak: 0.42 };
  const D = curV3.len(curV3.sub(p1, p0)), w = lgmWidth(key, gr.type), MT = (o.mt || lgmFitts(D, w)) * E.mtK, mga = lgmMGA(w), kOpen = lgmOpenFor(gr.g, mga, ps), BELL = E.bell;
  // the hand comes in along the direction the palm faces at the end (the last few centimetres straight onto the thing)
  const palmN = [H1[4] * ps, H1[5] * ps, H1[6] * ps], ctrl = curV3.sub(p1, curV3.mul(palmN, Math.min(0.14, D * 0.45))); ctrl[2] += 0.04;
  { const dir = curV3.norm(curV3.sub(p1, p0)), side = curV3.norm(curV3.cross(dir, [0, 0, 1])); for (let i = 0; i < 3; i++) ctrl[i] += side[i] * E.lat * ps * -1; }
  const arc = lgmArc(p0, ctrl, p1);
  const tEye = 0, tHand = 0.15, tTouch = tHand + MT, tSecure = tTouch + 0.12 * E.secureK, liftT = o.lift ? 0.55 + 0.4 * Math.min(1, ob.kg / 3) : 0, tLift = tSecure + 0.08, tUp = tLift + liftT;
  const carry = o.carry || null, carryT = carry ? 0.7 : 0, tCarry = tUp + carryT, dur = (o.hold || 0.5) + (carry ? tCarry : tUp);
  const pct = ob.kg / 80 * 100, beats = [{ t: tEye, name: 'eyes to the ' + ob.name.toLowerCase() }, { t: tHand, name: 'the reach starts' }, { t: tHand + MT * E.peak, name: 'peak speed' }, { t: tHand + MT * 0.7, name: 'widest opening' }, { t: tTouch, name: 'touch' }, { t: tSecure, name: 'the grip closes' }];
  if (o.lift) beats.push({ t: tLift, name: 'lift' }, { t: tUp, name: 'up' }); if (carry) beats.push({ t: tCarry, name: 'carried' });
  const upM = lgMul(lgM4(), lgTR(0, 0, o.lift || 0), H1);
  let carryM = null; if (carry) { const R = lgRootM({ root: root }), cp = lgPt(R, carry[0], carry[1] * ps, carry[2]); carryM = lgMul(lgM4(), lgTR(cp[0], cp[1], cp[2]), lgmTurn(H1, H1, 0)); carryM[12] = cp[0]; carryM[13] = cp[1]; carryM[14] = cp[2]; }
  let lastW = null;
  const handAt = t => {
    if (t <= tHand) return { M: H0, grip: LGM_RELAX, held: false, k: 0 };
    if (t <= tTouch) {
      const tau = (t - tHand) / MT, sp = lgmS(BELL, tau), u = lgmArcU(arc, sp), p = lgmBez(p0, ctrl, p1, u), M = lgmTurn(H0, H1, clamp(sp / 0.8, 0, 1));
      M[12] = p[0]; M[13] = p[1]; M[14] = p[2];
      // the grip: opening to its widest at 70% of the reach, closing onto the thing at the touch
      const pre = lgmMix(gr.g, LGM_OPEN, kOpen), g = tau < 0.7 ? lgmMix(LGM_RELAX, pre, lgSS(0, 0.7, tau)) : lgmMix(pre, lgmMix(gr.g, LGM_OPEN, kOpen * 0.18), lgSS(0.7, 1, tau));
      return { M: M, grip: g, held: false, k: tau };
    }
    const gClose = t < tSecure ? lgmMix(lgmMix(gr.g, LGM_OPEN, kOpen * 0.18), gr.g, lgSS(tTouch, tSecure, t)) : gr.g;
    if (!o.lift || t <= tLift) return { M: H1, grip: gClose, held: t >= tSecure, k: 1 };
    if (t <= tUp) { const k = lgmS(LGM_SYM, (t - tLift) / liftT), M = H1.slice(); M[14] = H1[14] + (o.lift || 0) * k; return { M: M, grip: gr.g, held: true, k: 1 }; }
    if (carry && t <= tCarry) { const k = lgmS(LGM_SYM, (t - tUp) / carryT), M = lgmTurn(upM, carryM, k), a = [upM[12], upM[13], upM[14]], b = [carryM[12], carryM[13], carryM[14]], c2 = curV3.lerp(a, b, 0.5); c2[2] += 0.05; const p = lgmBez(a, c2, b, k); M[12] = p[0]; M[13] = p[1]; M[14] = p[2]; return { M: M, grip: gr.g, held: true, k: 1 }; }
    return { M: carry ? carryM : upM, grip: gr.g, held: true, k: 1 };
  };
  const at = (t, W0) => {
    const P = lgPose(); lgPoseReset(P); P.root = root.slice(); const h = handAt(t), held = h.held;
    // the thing: where it stands until the grip closes, then in the hand
    const OWt = held ? lgMul(lgM4(), h.M, lgInv(lgM4(), gr.S)) : OW;
    const tgt = [h.M[12], h.M[13], h.M[14]], R = lgRootM(P), Ri = lgInv(lgM4(), R), tl = lgPt(Ri, tgt[0], tgt[1], tgt[2]);
    // the body leans in proportion to how far along the reach is
    const reachK = t <= tHand ? 0 : t <= tTouch ? lgmS(LGM_SYM, clamp((t - tHand) / MT / 0.8, 0, 1)) : 1;   // (the trunk finishes its lean a little before the hand arrives)
    P.ik['hand' + s] = { sp: 'world', p: tgt, M: h.M, pole: lgDir(R, -0.35, -0.75 * ps, -0.6) }; P.grip[s] = h.grip;
    const body = lgmBody(P, { side: s, target: lgPt(R, tl[0], tl[1], tl[2]), crouch: E.crouch, extra: held ? [{ p: [OWt[12], OWt[13], OWt[14]], pct: pct }] : null });
    // scale the lean by how far the reach has come (the body starts moving with the hand)
    if (reachK < 1) { const f = reachK; lgJadd(P, 'pelvis', 0, -body.lean * 0.55 * (1 - f), 0); lgJadd(P, 'spine', 0, -body.lean * 0.25 * (1 - f), 0); lgJadd(P, 'chest', 0, -body.lean * 0.2 * (1 - f), 0); P.t[LGB.pelvis * 3] *= f; P.t[LGB.pelvis * 3 + 2] = -0.03 - body.squat * f; }
    // a load leans the body away from it a little (a kilogram in the hand at arm's length moves the hips about a centimetre)
    if (held) { const lever = Math.max(0, tl[0] - 0.05); P.t[LGB.pelvis * 3] -= ob.kg * lever * 0.012; }
    if (W0) lgmLook(P, W0, t < tTouch + 0.2 ? [OW[12], OW[13], OW[14] + 0.05] : [tgt[0] + 1.5, tgt[1], 1.5], t < 0.03 ? t / 0.03 : 1);
    return { P: P, things: [{ key: key, M: OWt }], held: held, hand: h };
  };
  LGM.made++;
  return lgmPerf({ kind: 'reach', dur: dur, beats: beats, gr: gr, MT: MT, E: E, D: D, w: w, mga: mga, kOpen: kOpen, t: { hand: tHand, touch: tTouch, secure: tSecure, lift: tLift, up: tUp, carry: tCarry }, OW: OW, H0: H0, H1: H1, side: s, at: at, key: key, pct: pct });
}
/* ---------- two hands: a heavy box from the floor, lifted with the legs ---------- */
function lgmLiftBox(o) {
  const key = o.key || 'crate', ob = LGO_OBJ[key], root = o.root || [0, 0, 0, 0], at0 = o.at || [0.36, 0, 0], pct = ob.kg / 80 * 100;
  const OW0 = lgMul(lgM4(), lgTR(at0[0], at0[1], at0[2]), lgRot(lgM4(), 0, 0, root[3]));
  const gR = lgoGrasp(key, { side: 'R', type: 'twoHand' }), gL = lgoGrasp(key, { side: 'L', type: 'twoHand' });
  const tDown = 0.9, tGrip = tDown + 0.2, tUp = tGrip + 1.1, tHold = tUp + 0.6, upZ = o.upZ || 0.86;
  // how deep to squat and how far to lean to get both hands onto the box: the legs first (a long back), then the trunk
  const need = (() => {
    let squat = 0.3, lean = 0.35; const HR = lgmGraspM(OW0, gR), HL = lgmGraspM(OW0, gL);
    for (let it = 0; it < 14; it++) {
      const P = lgPose(); lgPoseReset(P); P.root = root.slice(); lgBase(P, { lean: 0.02, crouch: 0.03 + squat }); P.t[LGB.pelvis * 3 + 2] = -0.03 - squat; lgStance(P, 0.16, 0.0, 0.25);
      lgJadd(P, 'pelvis', 0, lean * 0.7, 0); lgJadd(P, 'spine', 0, lean * 0.18, 0); lgJadd(P, 'chest', 0, lean * 0.12, 0);
      const W = lgmSolve(P), dR = curV3.len(curV3.sub([HR[12], HR[13], HR[14]], lgaP(W, 'armR'))), dL = curV3.len(curV3.sub([HL[12], HL[13], HL[14]], lgaP(W, 'armL'))), d = Math.max(dR, dL);
      if (d < 0.535) break; if (squat < 0.46) squat += Math.min(0.06, (d - 0.52) * 0.5); else lean += Math.min(0.1, (d - 0.52) * 1.2);
      if (lean > 1.1) break;
    }
    return { squat: squat, lean: lean };
  })();
  const beats = [{ t: 0, name: 'eyes to the box' }, { t: 0.1, name: 'squat (knees and hips, the back long)' }, { t: tDown, name: 'hands on' }, { t: tGrip, name: 'grip' }, { t: tUp, name: 'standing with ' + ob.kg + ' kg' }];
  const at = (t, W0) => {
    const P = lgPose(); lgPoseReset(P); P.root = root.slice();
    const kd = lgmS(LGM_SYM, clamp(t / tDown, 0, 1)), ku = t > tGrip ? lgmS(LGM_SYM, clamp((t - tGrip) / (tUp - tGrip), 0, 1)) : 0, held = t >= tGrip;
    // the box: on the floor, then rising to the height of the hips, close to the body
    const OW = OW0.slice(); OW[12] = at0[0] + (0.27 - at0[0]) * ku; OW[14] = at0[2] + (upZ - 0.42 - at0[2]) * ku;
    const squat = need.squat * kd * (1 - ku), lean = need.lean * kd * (1 - ku);
    lgBase(P, { lean: 0.02, crouch: 0.03 + squat }); P.t[LGB.pelvis * 3 + 2] = -0.03 - squat; lgStance(P, 0.16, 0.0, 0.25);
    lgJadd(P, 'pelvis', 0, lean * 0.7, 0); lgJadd(P, 'spine', 0, lean * 0.18, 0); lgJadd(P, 'chest', 0, lean * 0.12, 0); lgJadd(P, 'neck', 0, -lean * 0.5, 0);
    const HR = lgmGraspM(OW, gR), HL = lgmGraspM(OW, gL), R = lgRootM(P);
    // before the grip the hands come down toward the box from the sides
    const toward = (H, side) => { if (t >= tDown) return H; const H0 = lgmRestHand(root, side), k = lgmS(LGM_BELL, clamp((t - 0.15) / (tDown - 0.15), 0, 1)), M = lgmTurn(H0, H, k), p = curV3.lerp([H0[12], H0[13], H0[14]], [H[12], H[13], H[14]], k); M[12] = p[0]; M[13] = p[1]; M[14] = p[2]; return M; };
    const MR = toward(HR, 'R'), ML = toward(HL, 'L');
    P.ik.handR = { sp: 'world', p: [MR[12], MR[13], MR[14]], M: MR, pole: lgDir(R, -0.3, -0.9, -0.3) }; P.ik.handL = { sp: 'world', p: [ML[12], ML[13], ML[14]], M: ML, pole: lgDir(R, -0.3, 0.9, -0.3) };
    P.grip.R = t < tDown ? LGM_OPEN : gR.g; P.grip.L = t < tDown ? LGM_OPEN : gL.g;
    // the hips go back with the lean (the learned gain), and the load adds its mass in front
    const W = lgmSolve(P), e = lgmCOMerr(W, held ? [{ p: [OW[12], OW[13], OW[14]], pct: pct }] : null, root[3]); P.t[LGB.pelvis * 3] -= e.err * LGM.gain * 2.2;
    if (W0) lgmLook(P, W0, ku < 0.6 ? [OW[12], OW[13], OW[14]] : [root[0] + 3, root[1], 1.5], 1);
    return { P: P, things: [{ key: key, M: OW }], held: held };
  };
  return lgmPerf({ kind: 'liftBox', dur: tHold, beats: beats, at: at, key: key, pct: pct, need: need, t: { down: tDown, grip: tGrip, up: tUp } });
}
/* ---------- handing over ---------- */
// giver at the origin facing +x holding a thing; receiver facing back from gap metres away
function lgmHandover(o) {
  o = o || {}; const key = o.key || 'bottle', ob = LGO_OBJ[key], gap = o.gap || 1.15, rootA = [0, 0, 0, 0], rootB = [gap, 0, 0, Math.PI];
  const gA = lgoGrasp(key, { side: 'R', app: [0, -1, 0] }), H = [gap / 2, 0.0, 1.02];
  // the giver's hand at the handover point, thumb up, the thing standing; the receiver takes it from the other side
  const OWh = lgMul(lgM4(), lgTR(H[0], H[1], H[2]), lgRot(lgM4(), 0, 0, 0)), HA = lgmGraspM(OWh, gA);
  const OI = lgInv(lgM4(), OWh), gB = lgoGrasp(key, { side: 'R', app: (() => { const a = lgDir(OI, -1, 0, 0); return [a[0], a[1], 0]; })() });
  // B grips higher on the thing so the hands do not meet (the receiver takes the free part)
  const shift = lgTR(0, 0, 0.065), HB = lgMul(lgM4(), lgMul(lgM4(), OWh, shift), gB.S);
  const A0 = lgmRestHand(rootA, 'R'), B0 = lgmRestHand(rootB, 'R');
  const tOffer = 0.75, tReach0 = 0.55, MTb = lgmFitts(curV3.len(curV3.sub([HB[12], HB[13], HB[14]], [B0[12], B0[13], B0[14]])), 0.07), tTouch = tReach0 + MTb + 0.05, tXfer = 0.3, tFree = tTouch + tXfer, tBack = tFree + 0.6, dur = tBack + 0.5;
  const beats = [{ t: 0, name: 'the giver offers' }, { t: tReach0, name: 'the receiver reaches' }, { t: tTouch, name: 'the receiver\'s hand closes' }, { t: tTouch, name: 'the giver starts to let go' }, { t: tFree, name: 'the weight has passed' }, { t: tBack, name: 'both hands home' }];
  // the share of the weight each hand carries
  const share = t => t < tTouch ? 0 : t > tFree ? 1 : lgSS(tTouch, tFree, t);
  const path = (H0, H1, k, palmDir) => { const M = lgmTurn(H0, H1, clamp(k / 0.85, 0, 1)), p0 = [H0[12], H0[13], H0[14]], p1 = [H1[12], H1[13], H1[14]], c = curV3.sub(p1, curV3.mul(palmDir, 0.1)); c[2] += 0.03; const p = lgmBez(p0, c, p1, k); M[12] = p[0]; M[13] = p[1]; M[14] = p[2]; return M; };
  const holdA0 = lgMul(lgM4(), lgTR(0.32 - H[0], -0.2 - H[1], 0.92 - H[2]), HA);   // the giver starts with it held at the side
  const at = (t, W0, who) => {
    const out = [];
    // giver
    { const P = lgPose(); lgPoseReset(P); P.root = rootA.slice(); lgBase(P, {});
      const kOff = lgmS(LGM_BELL, clamp(t / tOffer, 0, 1)), kBack = lgmS(LGM_SYM, clamp((t - tFree) / 0.6, 0, 1));
      let M = t < tFree ? path(holdA0, HA, kOff, [1, 0, 0]) : path(HA, A0, kBack, [-1, 0, 0]);
      P.ik.handR = { sp: 'world', p: [M[12], M[13], M[14]], M: M, pole: [-0.35, -0.75, -0.6] };
      const sh = share(t); P.grip.R = t < tTouch ? gA.g : t < tFree ? lgmMix(gA.g, lgmMix(gA.g, LGM_OPEN, 0.45), sh) : lgmMix(lgmMix(gA.g, LGM_OPEN, 0.45), LGM_RELAX, kBack);
      lgJadd(P, 'spine', 0, 0.06 * kOff * (1 - kBack), 0); out.push(P); }
    // receiver
    { const P = lgPose(); lgPoseReset(P); P.root = rootB.slice(); lgBase(P, {});
      const kR = lgmS(LGM_BELL, clamp((t - tReach0) / MTb, 0, 1)), kHome = lgmS(LGM_SYM, clamp((t - tFree) / 0.6, 0, 1));
      const homeB = (() => { const R = lgRootM(P), p = lgPt(R, 0.3, -0.18, 0.95), M = HB.slice(); M[12] = p[0]; M[13] = p[1]; M[14] = p[2]; return M; })();
      let M = t < tFree ? path(B0, HB, kR, [-1, 0, 0]) : path(HB, homeB, kHome, [1, 0, 0]);
      P.ik.handR = { sp: 'world', p: [M[12], M[13], M[14]], M: M, pole: lgDir(lgRootM(P), -0.35, -0.75, -0.6) };
      const tau = clamp((t - tReach0) / MTb, 0, 1), kO = lgmOpenFor(gB.g, lgmMGA(0.076), 1);
      P.grip.R = t < tReach0 ? LGM_RELAX : t < tTouch ? (tau < 0.7 ? lgmMix(LGM_RELAX, lgmMix(gB.g, LGM_OPEN, kO), lgSS(0, 0.7, tau)) : lgmMix(lgmMix(gB.g, LGM_OPEN, kO), gB.g, lgSS(0.7, 1, tau))) : gB.g;
      lgJadd(P, 'spine', 0, 0.05 * kR * (1 - kHome), 0); out.push(P); }
    // the thing: with the giver until the weight has passed, then with the receiver
    const giverM = out[0].ik.handR.M, recvM = out[1].ik.handR.M;
    const OWt = t < tFree ? lgMul(lgM4(), giverM, lgInv(lgM4(), gA.S)) : lgMul(lgM4(), lgMul(lgM4(), recvM, lgInv(lgM4(), gB.S)), lgInv(lgM4(), shift));
    return { Ps: out, things: [{ key: key, M: OWt }], share: share(t) };
  };
  return lgmPerf({ kind: 'handover', dur: dur, beats: beats, at: at, key: key, H: H, t: { touch: tTouch, free: tFree, reach: tReach0 }, gap: gap, actors: 2, share: share });
}
/* ---------- throwing ---------- */
// An overarm throw (right hand), timed from the literature on pitching: from the stride foot landing (FC) to the release
// (REL) takes about 0.14 s; the pelvis turns fastest at about 30% of it, the trunk at 50%, the elbow straightens fastest
// just before the release (with the elbow still bent about 25 degrees) and the upper arm turns in fastest at the release. The angles are driven by those speed peaks, so the chain
// comes out of the timing.
const LGM_THROW = { fc: 0.62, rel: 0.76, peaks: { pelvis: 0.30, trunk: 0.53, elbow: 0.97, ir: 1.0 }, speed: { pelvis: 620, trunk: 620, elbow: 2250, ir: 6600 }, turn: { pelvis: 1.2, trunk: 0.75, elbow: 1.2, ir: 2.3 }, erMax: 2.6 };
// (the trunk's own turn is added to the hips': its speed in the world, the one measured, comes to about 1150 degrees a second)
// a bump's width (seconds) for a turn made with a given peak speed (degrees a second): w = turn / (peak * sqrt(2 pi))
function lgmBumpW(n) { const T = LGM_THROW; return T.turn[n] / (T.speed[n] * Math.PI / 180 * Math.sqrt(TAU)); }
function lgmThrow(o) {
  o = o || {}; const key = o.key || 'ball', aim = o.aim != null ? o.aim : LGM.aim || 0, root0 = o.root || [0, 0, 0, 0], root = [root0[0], root0[1], root0[2], root0[3] + aim], gr = LGM.ballGrip || (LGM.ballGrip = lgoGrasp(key, { side: 'R', type: 'tripodBall' })), T = LGM_THROW, span = T.rel - T.fc;
  const relT = o.rel != null ? o.rel : LGM.relT != null ? LGM.relT : T.rel;   // the moment the fingers let the ball go (learned by practice)
  // each rotation as a bump of speed (a Gaussian in time) whose integral is the turn it makes
  const bump = (t, tp, wd, turn) => { const z = (t - tp) / wd; return turn * 0.5 * (1 + erfA(z / Math.SQRT2)); };
  const tp = n => T.fc + span * T.peaks[n];
  const dur = T.rel + 0.65, beats = [{ t: 0, name: 'set' }, { t: 0.25, name: 'the leg lifts' }, { t: T.fc, name: 'the stride foot lands' }, { t: tp('pelvis'), name: 'the hips turn fastest' }, { t: tp('trunk'), name: 'the trunk turns fastest' }, { t: tp('elbow'), name: 'the elbow straightens fastest' }, { t: relT, name: 'release' }, { t: T.rel + 0.4, name: 'follow-through' }];
  const angles = t => {
    const cock = lgSS(0.2, T.fc, t);                                      // the arm going back and up into the cocked position
    return {
      pelvis: -1.0 * lgSS(0.1, 0.5, t) + bump(t, tp('pelvis'), lgmBumpW('pelvis'), T.turn.pelvis),   // closed (turned away) in the wind-up, then open
      trunk: -0.55 * lgSS(0.15, 0.55, t) + bump(t, tp('trunk'), lgmBumpW('trunk'), T.turn.trunk),
      tilt: 0.35 * lgSS(T.fc, T.rel + 0.1, t),                              // the trunk bends forward over the front leg
      abd: 1.55 * cock - 0.25 * lgSS(T.rel, T.rel + 0.35, t),                 // the upper arm out to the side, at shoulder height
      ext: 0.45 * cock - bump(t, tp('trunk') + 0.01, 0.03, 0.6) + 0.4 * lgSS(T.rel, T.rel + 0.4, t), // horizontal: back, then across the body
      er: T.erMax * lgSS(0.3, T.fc + span * 0.75, t) - bump(t, tp('ir'), lgmBumpW('ir'), T.turn.ir),   // the forearm laid back (external turn), then turned in fast
      elbow: 1.65 * cock - bump(t, tp('elbow'), lgmBumpW('elbow'), T.turn.elbow) + 0.35 * lgSS(T.rel + 0.05, T.rel + 0.4, t),
      wrist: -0.6 * lgSS(T.fc, T.fc + span * 0.7, t) + bump(t, T.rel - 0.008, 0.012, 1.0)
    };
  };
  const at = (t, W0) => {
    const P = lgPose(); lgPoseReset(P); P.root = root.slice(); lgBase(P, { lean: 0.05 }); const a = angles(t);
    // the legs: the front (left) foot lifts and strides forward, landing at FC; the back foot pushes and drags
    const lift = lgPulse(t, 0.2, T.fc) * 0.28, stride = lgSS(0.38, T.fc, t), fwd = -0.05 + 0.75 * stride;
    lgFoot(P, 'L', fwd, 0.14, lift * (t < T.fc ? 1 : 0), -0.2 * lift, 0.1 + 0.5 * (1 - stride), 0); lgFoot(P, 'R', -0.25 + 0.12 * lgSS(T.rel, T.rel + 0.5, t), -0.12, 0.03 * lgSS(T.rel, T.rel + 0.4, t), 0.3 * lgSS(T.rel, T.rel + 0.4, t), -0.6 + 0.4 * stride, 0);
    // on one leg (the leg lift) the hips move over the back foot, so the centre of mass stays over it; then the stride drives them forward
    const single = lgSS(0.08, 0.26, t) * (1 - lgSS(0.42, T.fc, t));
    lgPelvis(P, -0.25 * single + 0.32 * stride + 0.1 * lgSS(T.rel, dur, t), -0.17 * single, -0.03 - 0.12 * stride + 0.04 * lgSS(T.rel, dur, t), 0, 0.04 + a.tilt * 0.4, a.pelvis);
    lgJadd(P, 'spine', 0, a.tilt * 0.35, a.trunk * 0.5); lgJadd(P, 'chest', -0.12 * lgSS(0.3, T.fc, t), a.tilt * 0.3, a.trunk * 0.5);
    lgJadd(P, 'neck', 0, -a.tilt * 0.4, -(a.pelvis + a.trunk) * 0.55);
    // the throwing arm (forward kinematics: abduction, horizontal extension, external turn, elbow) and the glove arm
    lgArm(P, 'R', a.ext * 0.9, a.abd, a.er, a.elbow, a.wrist, 0);
    lgArm(P, 'L', -1.2 * lgSS(0.3, T.fc, t) + 1.4 * lgSS(T.fc, T.rel + 0.2, t), 0.5 * lgSS(0.3, T.fc, t), 0, 1.2 - 0.6 * lgSS(T.fc, T.rel, t), 0, 0);
    P.grip.R = t < relT ? gr.g : lgmMix(gr.g, LGM_OPEN, lgSS(relT, relT + 0.06, t)); P.grip.L = 'fist';
    if (W0) lgmLook(P, W0, [root[0] + 18, root[1], 1.6], 1);
    return { P: P, things: [], held: t < relT, gr: gr };
  };
  return lgmPerf({ kind: 'throw', dur: dur, beats: beats, at: at, key: key, gr: gr, T: T, angles: angles, relT: relT, root: root });
}
// an approximation of the error function (Abramowitz and Stegun 7.1.26: within 1.5e-7)
function erfA(x) { const s = x < 0 ? -1 : 1; x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; }
/* ---------- running a performance (sampling it for checks and pictures) ---------- */
// every frame solved: world matrices per actor, the things, and the hand paths
function lgmRun(perf, fps) {
  fps = fps || 120; const n = Math.ceil(perf.dur * fps) + 1, frames = []; let Wprev = null;
  for (let i = 0; i < n; i++) {
    const t = i / fps, r = perf.at(t, Wprev && Wprev[0]), Ps = r.Ps || [r.P], Ws = Ps.map(P => lgmSolve(P));
    // a second pass so the look and the balance see the solved body
    const r2 = perf.at(t, Ws[0]), Ps2 = r2.Ps || [r2.P], Ws2 = Ps2.map(P => lgmSolve(P));
    frames.push({ t: t, W: Ws2, things: r2.things.map(x => ({ key: x.key, M: x.M.slice() })), r: r2 }); Wprev = Ws2;
  }
  return { fps: fps, frames: frames, perf: perf };
}
// a bone's path through a run (world points), and its speed (m/s)
function lgmPath(run, bone, actor) { return run.frames.map(f => lgaP(f.W[actor || 0], bone)); }
function lgmSpeed(pts, fps) { const v = [0]; for (let i = 1; i < pts.length; i++) v.push(curV3.len(curV3.sub(pts[i], pts[i - 1])) * fps); return v; }
/* ---------- measuring a reach (what the exams check) ---------- */
function lgmReachStats(run) {
  const pf = run.perf, s = pf.side, fps = run.fps, wr = lgmPath(run, 'hand' + s), v = lgmSpeed(wr, fps), t0 = pf.t.hand, t1 = pf.t.touch;
  let vmax = 0, tv = 0; run.frames.forEach((f, i) => { if (f.t >= t0 && f.t <= t1 && v[i] > vmax) { vmax = v[i]; tv = f.t; } });
  let amax = 0, ta = 0; const ap = run.frames.map(f => { const g = f.r.P.grip[s], a = typeof g === 'object' ? lgmAperture(g, s === 'R' ? 1 : -1) : 0; return a; });
  run.frames.forEach((f, i) => { if (f.t >= t0 && f.t <= t1 && ap[i] > amax) { amax = ap[i]; ta = f.t; } });
  // balance: the centre of mass over the feet in every frame
  let worst = 1e9; for (const f of run.frames) { const ex = f.r.held ? [{ p: [f.things[0].M[12], f.things[0].M[13], f.things[0].M[14]], pct: pf.pct }] : null, sup = lgaSupport(f.W[0], 0), c = lgaCOM(f.W[0], ex).c; worst = Math.min(worst, lgaInside(sup, c[0], c[1])); }
  // the hand on the thing at the touch: the hand's frame against the grasp's
  const iT = Math.round(t1 * fps), HW = run.frames[iT].W[0].subarray(LGB['hand' + s] * 16, LGB['hand' + s] * 16 + 16), err = curV3.len(curV3.sub([HW[12], HW[13], HW[14]], [pf.H1[12], pf.H1[13], pf.H1[14]]));
  return { mt: t1 - t0, peakFrac: (tv - t0) / (t1 - t0), vmax: vmax, mga: amax, mgaFrac: (ta - t0) / (t1 - t0), mgaWant: pf.mga, w: pf.w, comInside: worst, handErr: err, speed: v, aperture: ap };
}
/* ---------- measuring a throw ---------- */
// the turns of the chain, frame by frame: the hips' and the trunk's facing (world), the elbow's bend, and the upper arm's
// turn about its own length (the forearm's direction round the humerus); their speeds, and when each peaks
function lgmThrowStats(run) {
  const T = run.perf.T, fps = run.fps, n = run.frames.length, ang = { pelvis: [], trunk: [], elbow: [], ir: [] };
  const yawOf = (W, b) => { const M = W.subarray(LGB[b] * 16, LGB[b] * 16 + 16); return Math.atan2(M[1], M[0]); };
  for (const f of run.frames) {
    const W = f.W[0], sh = lgaP(W, 'armR'), el = lgaP(W, 'foreR'), wr = lgaP(W, 'handR'), u = curV3.norm(curV3.sub(el, sh)), fa = curV3.norm(curV3.sub(wr, el));
    ang.pelvis.push(yawOf(W, 'pelvis')); ang.trunk.push(yawOf(W, 'chest')); ang.elbow.push(Math.PI - curAng(curV3.sub(sh, el), curV3.sub(wr, el)));
    // the forearm round the humerus, against the chest's up direction (both squared to the humerus)
    const C = W.subarray(LGB.chest * 16, LGB.chest * 16 + 16), up = [C[8], C[9], C[10]], r0 = curV3.norm(curV3.sub(up, curV3.mul(u, curV3.dot(up, u)))), r1 = curV3.norm(curV3.sub(fa, curV3.mul(u, curV3.dot(fa, u))));
    ang.ir.push(Math.atan2(curV3.dot(curV3.cross(r0, r1), u), curV3.dot(r0, r1)));
  }
  const unwrap = a => { for (let i = 1; i < a.length; i++) { while (a[i] - a[i - 1] > Math.PI) a[i] -= TAU; while (a[i] - a[i - 1] < -Math.PI) a[i] += TAU; } return a; };
  const out = {}, span = T.rel - T.fc;
  for (const k in ang) {
    const a = unwrap(ang[k]), v = a.map((x, i) => i ? (x - a[i - 1]) * fps * 180 / Math.PI : 0);
    // the speed that matters: the hips and trunk turning toward the target, the elbow straightening, the arm turning in
    const sg = k === 'elbow' ? -1 : k === 'ir' ? (v.reduce((m, x, i) => run.frames[i].t > T.fc && run.frames[i].t < T.rel + 0.03 && Math.abs(x) > Math.abs(m) ? x : m, 0) < 0 ? -1 : 1) : 1;
    let best = 0, bi = 0; v.forEach((x, i) => { const t = run.frames[i].t; if (t > T.fc - 0.1 && t < T.rel + 0.05 && x * sg > best) { best = x * sg; bi = i; } });
    out[k] = { peak: best, t: run.frames[bi].t, frac: (run.frames[bi].t - T.fc) / span, v: v.map(x => x * sg) };
  }
  // the ball leaves with the speed of the palm at the release
  const rl = lgmRelease(run.perf, run.perf.relT); out.release = { v: rl.v, speed: curV3.len(rl.v), p: rl.p };
  // the centre of mass over the back foot while the front leg is up
  let worst = 1e9; for (const f of run.frames) if (f.t > 0.2 && f.t < 0.4) { const sup = lgaSupport(f.W[0], 0), c = lgaCOM(f.W[0]).c; worst = Math.min(worst, lgaInside(sup, c[0], c[1])); }
  out.single = worst;
  return out;
}
// a ball's flight from the release (gravity and air drag on a baseball: drag coefficient 0.35, 73 mm, 145 g, air 1.2 kg/m3)
function lgmFlight(p, v, o) {
  o = o || {}; const g = 9.81, k = 0.5 * 1.2 * 0.35 * Math.PI * 0.0365 * 0.0365 / 0.145, dt = 1 / 600, pts = [p.slice()]; let x = p.slice(), u = v.slice(), t = 0;
  while (x[2] > (o.ground || 0.0365) && t < 6) { const sp = curV3.len(u); u = [u[0] - k * sp * u[0] * dt, u[1] - k * sp * u[1] * dt, u[2] - (g + k * sp * u[2]) * dt]; x = curV3.add(x, curV3.mul(u, dt)); t += dt; if (pts.length < 4000) pts.push(x.slice()); }
  return { pts: pts, t: t, land: x, range: Math.hypot(x[0] - p[0], x[1] - p[1]) };
}
// the ball's release, alone: the palm's place and speed at a release moment (two solved poses 1 ms apart)
function lgmRelease(perf, t) { const palm = tt => { const W = lgmSolve(perf.at(tt, null).P); return lgPt(W.subarray(LGB.handR * 16, LGB.handR * 16 + 16), 0, 0.02, -0.075); }, a = palm(t - 0.0005), b = palm(t + 0.0005); return { p: curV3.lerp(a, b, 0.5), v: curV3.mul(curV3.sub(b, a), 1000) }; }
// practice: throws at a target distance. The arm's chain is the same every time; what LEGEND learns is the moment to let go
// (a few milliseconds early sends the ball high, late sends it into the ground). Each throw's miss teaches the next
// (the secant rule on the miss against the moment), and the misses are the learning curve.
function lgmLearnThrow(dist, n, o) {
  o = o || {}; const pf = lgmThrow({ rel: LGM_THROW.rel, aim: 0 }), curve = [], tries = [];
  const range = t => { const r = lgmRelease(pf, t), fl = lgmFlight(r.p, r.v); return { miss: fl.range - dist, r: r, fl: fl }; };
  let a = LGM_THROW.rel - 0.008, b = LGM_THROW.rel + 0.004, fa = range(a), fb = range(b); curve.push(Math.abs(fa.miss), Math.abs(fb.miss)); tries.push([a, fa.miss], [b, fb.miss]);
  for (let i = 0; i < (n || 10) && Math.abs(fb.miss) > 0.05; i++) {
    let c = b - fb.miss * (b - a) / ((fb.miss - fa.miss) || 1e-6); c = clamp(c, LGM_THROW.rel - 0.02, LGM_THROW.rel + 0.012);
    const fc = range(c); curve.push(Math.abs(fc.miss)); tries.push([c, fc.miss]); a = b; fa = fb; b = c; fb = fc;
  }
  // and the aim: the ball goes a little to the side of where the chest faces, so the body turns by that much
  const aim = -Math.atan2(fb.r.v[1], fb.r.v[0]);
  LGM.relT = b; LGM.aim = aim; LGM.throwCurve = curve; LGM.throwDist = dist;
  return { rel: b, aim: aim, curve: curve, tries: tries, last: fb };
}
