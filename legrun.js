/* ================= LEGEND v2 in a run: a body with weight, hands that hold each gun, the head that leads =================
   1.9.993. The survivor seen from above is three frames now, not one: the legs, the upper body with the arms and the
   gun, and the head. Each turns on its own, the way a person turns, from the references (README > what was studied):
   - The head leads. The eyes and the head go first, the shoulders follow the head, the hips follow the shoulders,
     and the feet step round last (a body turns around a steady head). The torso can twist about 75 degrees over the
     hips before the feet have to move; standing still, they step round to catch up.
   - Legs go where you walk; the gun goes where you look. Walking forward the hips turn toward the walk and the torso
     twists to keep the gun on target; walking across the aim the feet sidestep ("big step, little step", never
     crossing); walking away from the aim he backs up, toe first.
   - Weight. The upper body is on a spring over the hips: it leans into a walk, carries on a little when he stops and
     swings back, and every shot pushes it back by the round's recoil (a 9 mm a little, 7.62 hard, buckshot harder).
   - Relaxed and focused. Relaxed, the gun rides at low ready, the shoulders are up and the head scans (left, right,
     the ground ahead); engaged, the gun comes up to the eye, the shoulders come forward, the knees soften, the head
     locks behind the sights.
   - Corners. Beside a wall with open ground ahead past its edge, he leans out from it with the gun canted toward the
     opening (slicing the pie), so he shows as little of himself as he can.
   - Hands on the gun. Every rebuilt gun has its own grips (leggun.js): the support hand where that gun's handguard
     is, the magazine riding in the hand at that gun's well. Reloads are choreographed beat by beat to match the ARMS
     engine's timing: the speed reload, the tactical reload (the magazine stowed in the dump pouch), the AK's hook and
     rock with the charging handle racked under the gun, the SCAR's left-side handle, the PP-19's helical magazine
     hooked at the front and rotated up, the shotgun's shell-by-shell load through the port underneath (and the combat
     load through the ejection port), the pistol's slide lock, the 1911's slide stop, the revolver's ejector and two
     half-moon clips. Sprinting, the long gun is carried across the body muzzle-down (a weapon grip for rapid
     movement) and a pistol held at Sul.
   - It learns. After each frame it checks its own work: a hand that missed its grip on a gun by more than a few
     millimetres moves that gun's posture in for the next frames (until it reaches); each walk is measured for how far
     a planted foot really travels in a cycle, and the steps are paced by that, so the feet do not slide. */
const LGV = { on: true, made: 0, ms: 0, miss: {}, fix: {}, tries: {}, stride: {}, learnt: 0, bodies: new WeakMap() };
// which bones each layer shows
const LGV_LEGS = ['root', 'pelvis', 'thighL', 'shinL', 'footL', 'toeL', 'thighR', 'shinR', 'footR', 'toeR'];
const LGV_HEAD = ['head', 'mBrow', 'mCheekL', 'mCheekR', 'mJawL', 'mJawR', 'mChin', 'mVisor'];
const LGV_PIST = ['pistol', 'slide', 'mag'];
function lgvMask(show) { const h = new Uint8Array(LG_NB_MAX).fill(1); for (const n of show) if (LGB[n] != null) h[LGB[n]] = 0; return h; }
const LGV_M = (() => {
  const all = LG_SKEL.map(b => b[0]), upper = all.filter(n => LGV_LEGS.indexOf(n) < 0 && LGV_HEAD.indexOf(n) < 0);
  return { legsH: lgvMask(LGV_LEGS.concat(LGV_PIST)), legs: lgvMask(LGV_LEGS), upper: lgvMask(upper), upperNoP: lgvMask(upper.filter(n => LGV_PIST.indexOf(n) < 0)), head: lgvMask(LGV_HEAD), all: lgvMask(all) };
})();

/* ---------- the hands: targets in the chest's space, gun-local points, blends ---------- */
const lgvE = k => k * k * (3 - 2 * k);
function lgvGunM(v) { return lgAimM(v[0], v[1], v[2], v[3], v[4], v[5]); }
// a hand target (position + rotation, chest space) at a point of a gun held in posture v; S a 4x4 in gun space
function lgvOnGun(v, S, dz) { let M = lgvGunM(v); if (dz) M = lgMul(lgM4(), M, lgTR(0, 0, dz, 0, 0, 0)); return S ? lgMul(lgM4(), M, S) : M; }
function lgvAt(p, rx, ry, rz) { const M = lgRot(lgM4(), rx || 0, ry || 0, rz || 0); M[12] = p[0]; M[13] = p[1]; M[14] = p[2]; return M; }
const LGV_Q = { a: [0, 0, 0, 1], b: [0, 0, 0, 1], o: [0, 0, 0, 1] };
function lgvMix(A, B, k) {
  if (k <= 0) return A; if (k >= 1) return B;
  const R9a = [A[0], A[1], A[2], A[4], A[5], A[6], A[8], A[9], A[10]], R9b = [B[0], B[1], B[2], B[4], B[5], B[6], B[8], B[9], B[10]];
  lgQ(R9a, 0, LGV_Q.a); lgQ(R9b, 0, LGV_Q.b); lgNlerp(LGV_Q.a, LGV_Q.b, k, LGV_Q.o); const r = new Float32Array(9); lgQM(LGV_Q.o, r, 0);
  const M = lgM4(); M[0] = r[0]; M[1] = r[1]; M[2] = r[2]; M[4] = r[3]; M[5] = r[4]; M[6] = r[5]; M[8] = r[6]; M[9] = r[7]; M[10] = r[8];
  M[12] = A[12] + (B[12] - A[12]) * k; M[13] = A[13] + (B[13] - A[13]) * k; M[14] = A[14] + (B[14] - A[14]) * k; return M;
}
// a timeline of hand targets: keys [[k, M], ...] with eased segments
function lgvTrack(k, keys) {
  if (k <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) { if (k > keys[i][0]) continue; const a = keys[i - 1], b = keys[i], u = (k - a[0]) / ((b[0] - a[0]) || 1); return lgvMix(a[1], b[1], lgvE(u)); }
  return keys[keys.length - 1][1];
}
function lgvHand(P, side, M, pole) { P.ik['hand' + side] = { sp: 'chest', p: [M[12], M[13], M[14]], M: M, pole: pole || (side === 'L' ? [-0.1, 0.6, -0.8] : [-0.2, -0.8, -0.6]) }; }
function lgvPost(a, b, k) { k = lgvE(clamp(k, 0, 1)); return a.map((x, i) => x + (b[i] - x) * k); }
// postures, chest space [x, y, z, yaw, pitch (+ muzzle down), cant (+ top right)]
const LGV_POST = {
  rReady: [0.41, -0.1, 0.32, 0.0, 0.0, 0.0], rLow: [0.36, -0.12, 0.14, 0.06, 0.6, 0.0], rSprint: [0.24, -0.02, 0.05, 0.78, 1.0, -0.3], rWork: [0.33, -0.05, 0.17, 0.3, 0.12, -0.72],
  rPort: [0.33, -0.05, 0.17, 0.2, 0.05, 0.55], rUp: [0.3, -0.04, 0.3, 0.15, -0.35, -0.2], rCheck: [0.35, -0.07, 0.2, 0.22, 0.1, -0.5], rSling: [0.12, 0.08, 0.36, 0.6, -1.15, 0.2],
  pReady: [0.53, -0.01, 0.32, 0.0, 0.0, 0.0], pLow: [0.4, -0.035, -0.08, 0.0, 0.55, 0.0], pSul: [0.15, -0.02, -0.04, 0.0, 1.38, 0.0], pWork: [0.27, -0.01, 0.12, 0.25, -0.15, -0.55],
  pHigh: [0.21, -0.035, 0.08, 0.0, 0.04, 0.0], pUp: [0.28, -0.02, 0.2, 0.15, -0.9, -0.4], pDown: [0.3, -0.01, 0.06, 0.1, 0.9, 0.2]
};
// where the support hand finds things on the kit (chest space) and how it is turned there
const LGV_KIT = {
  placard: () => lgvAt([0.2, 0.05, -0.12], 0, 0.2, -Math.PI / 2), dump: () => lgvAt([0.0, 0.21, -0.36], 0.35, 0.2, -Math.PI / 2),
  belt: () => lgvAt([0.1, 0.14, -0.34], 0, 0.15, -Math.PI / 2), shells: () => lgvAt([0.06, 0.17, -0.32], 0.2, 0.3, -Math.PI / 2), chest: () => lgvAt([0.13, 0.015, 0.02], 0, 0.0, 0.2)
};
// the posture fix this gun has learnt (moves its posture in when a hand could not reach)
function lgvFix(gun, v) { const f = LGV.fix[gun]; if (!f) return v; const o = v.slice(); o[0] += f[0]; o[1] += f[1]; o[2] += f[2]; return o; }

/* ---------- the upper body: one function per ARMS state; k is the progress (0..1) or the phase ---------- */
// the torso: relaxed (upright, shoulders up) to focused (forward, shoulders rolled in, chin down to the stock)
function lgvTorso(P, focus, t, fam) {
  lgPelvis(P, 0, 0, -0.04 - 0.03 * focus, 0, 0.03 + 0.05 * focus, 0);
  lgJ(P, 'spine', 0, 0.05 + 0.07 * focus, 0); lgJ(P, 'chest', 0, 0.03 + 0.06 * focus, 0); lgJ(P, 'neck', 0, -0.06 - 0.06 * focus, 0);
  lgShrug(P, 'L', -0.02 * focus, 0.06 * focus); lgShrug(P, 'R', -0.02 * focus, 0.06 * focus);
  lgArm(P, 'L', 0.06, 0.1, 0, 0.18, 0.05); lgArm(P, 'R', 0.06, 0.1, 0, 0.18, 0.05);
  lgBreath(P, t, 1 - focus * 0.6, 4);
}
function lgvC(ctx) { return ctx.fam === 'c'; }
// the long gun in a posture v with both hands on (the support hand blended to a free target by kL)
function lgvRifle(P, v, ctx, free, kL) {
  const g = ctx.gun || '', vv = lgvFix(g, v);
  P.carbine.at = 'aim'; P.carbine.sp = 'chest'; P.carbine.M = lgvGunM(vv);
  P.ik.handR = { on: 'carbine', pole: [-0.2, -0.8, -0.6] }; P.grip.R = ctx.trigger ? 'trigger' : 'pistol';
  if (free && kL > 0) { const on = lgvOnGun(vv, lgSockFor('carbine', 'gripL')); lgvHand(P, 'L', lgvMix(on, free, kL)); P.grip.L = kL > 0.6 ? (ctx.gripL || 'cup') : 'cup'; }
  else { P.ik.handL = { on: 'carbine', pole: [-0.1, 0.6, -0.8] }; P.grip.L = 'cup'; }
  if (ctx.fam === 'c') { P.pistol.at = 'holster'; }
  return vv;
}
function lgvPistol(P, v, ctx, free, kL) {
  const g = ctx.gun || '', vv = lgvFix(g, v);
  P.pistol.at = 'aim'; P.pistol.sp = 'chest'; P.pistol.M = lgvGunM(vv);
  P.ik.handR = { on: 'pistol', pole: LG_POLE.Rt }; P.grip.R = ctx.trigger ? 'trigger' : 'pistol';
  if (free && kL > 0) { const on = lgvOnGun(vv, lgSockFor('pistol', 'gripL')); lgvHand(P, 'L', lgvMix(on, free, kL), LG_POLE.Lt); P.grip.L = kL > 0.6 ? (ctx.gripL || 'cup') : 'support'; }
  else { P.ik.handL = { on: 'pistol', pole: LG_POLE.Lt }; P.grip.L = 'support'; }
  P.carbine.at = 'back';
  return vv;
}
function lgvHold(P, v, ctx, free, kL) { return lgvC(ctx) ? lgvRifle(P, v, ctx, free, kL) : lgvPistol(P, v, ctx, free, kL); }
const LGV_UP = {
  relaxed(P, k, ctx) { lgvTorso(P, 0.15, ctx.t, ctx.fam); const v = (lgvC(ctx) ? LGV_POST.rLow : LGV_POST.pLow).slice(); v[4] += Math.sin(ctx.t * TAU / 4) * 0.02; lgvHold(P, v, ctx); },
  ready(P, k, ctx) { lgvTorso(P, 1, ctx.t, ctx.fam); const v = (lgvC(ctx) ? LGV_POST.rReady : LGV_POST.pReady).slice(); v[3] += lgN1(ctx.t * 0.7, 1) * 0.006; v[4] += lgN1(ctx.t * 0.6, 2) * 0.006; ctx.trigger = true; lgvHold(P, v, ctx); },
  raise(P, k, ctx) { lgvTorso(P, k, ctx.t, ctx.fam); const c = lgvC(ctx); lgvHold(P, lgvPost(c ? LGV_POST.rLow : LGV_POST.pLow, c ? LGV_POST.rReady : LGV_POST.pReady, k), ctx); },
  sprint(P, k, ctx) {
    lgvTorso(P, 0.3, ctx.t, ctx.fam); lgJadd(P, 'spine', 0, 0.12, 0); lgJadd(P, 'chest', 0, 0.08, 0);
    const bob = Math.sin(k * TAU * 2) * 0.012;
    if (lgvC(ctx)) { const v = LGV_POST.rSprint.slice(); v[2] += bob; v[3] += Math.sin(k * TAU) * 0.06; lgvRifle(P, v, ctx); }
    else { const v = LGV_POST.pSul.slice(); v[2] += bob; lgvPistol(P, v, ctx, LGV_KIT.chest(), 1); P.grip.L = 'open'; }
  },
  sprintOut(P, k, ctx) { lgvTorso(P, k * 0.9, ctx.t, ctx.fam); const c = lgvC(ctx); lgvHold(P, lgvPost(c ? LGV_POST.rSprint : LGV_POST.pSul, c ? LGV_POST.rReady : LGV_POST.pReady, k), ctx, !c ? LGV_KIT.chest() : null, !c ? 1 - lgvE(clamp(k * 1.6, 0, 1)) : 0); },
  inspect(P, k, ctx) {
    // a press check: the gun turned in, the support hand eases the bolt (or the slide) back an inch, a look, home
    lgvTorso(P, 0.4, ctx.t, ctx.fam); const c = lgvC(ctx), D = LG_GUN_DEF[ctx.gun] || {};
    const v = lgvPost(c ? LGV_POST.rLow : LGV_POST.pLow, c ? LGV_POST.rCheck : LGV_POST.pWork, lgPulse(k, 0, 1) * 1.4);
    const at = c ? lgvOnGun(v, lgvAt(D.key === 'ak74m' || D.key === 'pp19' ? [0.17, -0.045, 0.0] : D.key === 'mk17' ? [0.15, 0.04, 0.01] : [-0.08, 0.0, 0.03], 0, 0, -Math.PI / 2)) : lgvOnGun(v, lgvAt([0.03, 0.0, 0.035], Math.PI / 2, 0, 0));
    const kl = lgPulse(k, 0.12, 0.9);
    lgvHold(P, v, ctx, at, clamp(kl * 1.5, 0, 1));
    if (!c) P.pistol.slide = lgPulse(k, 0.35, 0.65) * 0.25;
    ctx.look = lgPulse(k, 0.3, 0.75);
  },
  swapOut(P, k, ctx) {
    lgvTorso(P, 0.3, ctx.t, ctx.fam);
    if (lgvC(ctx)) {
      // the long gun up past the left shoulder and onto the sling across the back
      if (k < 0.62) { const v = lgvPost(LGV_POST.rLow, LGV_POST.rSling, k / 0.62); lgvRifle(P, v, ctx, LGV_KIT.chest(), lgvE(clamp(k / 0.35, 0, 1))); }
      else { P.carbine.at = 'back'; P.pistol.at = 'holster'; lgvHand(P, 'R', lgvMix(lgvOnGun(LGV_POST.rSling, lgSockFor('carbine', 'gripR')), lgvAt([0.06, -0.2, -0.3], 0, 0.3, 0), lgvE((k - 0.62) / 0.38))); P.grip.R = 'relax'; lgvHand(P, 'L', LGV_KIT.chest()); }
    } else {
      // the pistol back into the holster without looking: the hand finds home by feel
      if (k < 0.55) { const v = lgvPost(LGV_POST.pLow, LGV_POST.pHigh, k / 0.55); lgvPistol(P, v, ctx, LGV_KIT.chest(), 1); P.grip.L = 'open'; }
      else { P.pistol.at = 'handR'; const hol = lgMul(lgM4(), LG_SOCK.holster, lgSockFor('pistol', 'gripR')); const A = lgvOnGun(LGV_POST.pHigh, lgSockFor('pistol', 'gripR'));
        const u = lgvE((k - 0.55) / 0.45); if (u < 0.999) lgvHand(P, 'R', lgvMix(A, lgvAt([0.05, -0.2, -0.3], 0, 0.6, 0), u)); else { P.pistol.at = 'holster'; }
        if (u > 0.85) P.pistol.at = 'holster'; P.grip.R = 'pistol'; lgvHand(P, 'L', LGV_KIT.chest()); }
      P.carbine.at = 'back';
    }
  },
  swapIn(P, k, ctx) {
    lgvTorso(P, 0.4 + k * 0.4, ctx.t, ctx.fam);
    if (lgvC(ctx)) {
      // the long gun off the back: the right hand reaches over the shoulder, swings it round, the support hand meets it
      if (k < 0.32) { P.carbine.at = 'back'; P.pistol.at = 'holster'; lgvHand(P, 'R', lgvMix(lgvAt([0.06, -0.2, -0.3], 0, 0.3, 0), lgvOnGun(LGV_POST.rSling, lgSockFor('carbine', 'gripR')), lgvE(k / 0.32))); P.grip.R = 'pistol'; lgvHand(P, 'L', LGV_KIT.chest()); }
      else { const u = (k - 0.32) / 0.68, v = lgvPost(LGV_POST.rSling, LGV_POST.rLow, u); lgvRifle(P, v, ctx, LGV_KIT.chest(), 1 - lgvE(clamp(u * 1.5, 0, 1))); }
    } else {
      // the draw: grip in the holster, clear, rotate at the hip, meet the support hand at the chest, press out
      P.carbine.at = 'back';
      const G = lgSockFor('pistol', 'gripR');
      if (k < 0.3) { P.pistol.at = 'holster'; P.ik.handR = { sp: 'pelvis', p: [0, 0, 0], M: null, pole: LG_POLE.Rt }; const H = lgMul(lgM4(), LG_SOCK.holster, G); P.ik.handR.p = [H[12], H[13], H[14]]; P.ik.handR.M = H; P.grip.R = lgvE(k / 0.3) > 0.7 ? 'pistol' : 'relax'; lgvHand(P, 'L', LGV_KIT.chest()); }
      else if (k < 0.58) { P.pistol.at = 'handR'; P.grip.R = 'pistol'; lgvHand(P, 'R', lgvMix(lgvAt([0.1, -0.17, -0.12], 0, 0.9, 0.2), lgvOnGun(LGV_POST.pHigh, G), lgvE((k - 0.3) / 0.28))); lgvHand(P, 'L', LGV_KIT.chest()); P.grip.L = 'open'; }
      else { const u = (k - 0.58) / 0.42; lgvPistol(P, lgvPost(LGV_POST.pHigh, LGV_POST.pLow, u), ctx, LGV_KIT.chest(), 1 - lgvE(clamp(u * 1.6, 0, 1))); }
    }
  },
  reload(P, k, ctx) { lgvTorso(P, 0.55, ctx.t, ctx.fam); (LGV_RL[ctx.kind] || LGV_RL.pistol)(P, k, ctx); },
  dodge(P, k, ctx) { lgvRoll(P, k, ctx); }
};
// a magazine riding in the support hand at the gun's well, inserted ins (0 seated .. 1 a magazine's length out)
function lgvMagAt(v, ins, fam) { const dz = fam === 'c' ? -0.12 * ins : -0.09 * ins; return lgMul(lgM4(), lgvOnGun(v, null, dz), lgInv(lgM4(), lgSockFor(fam === 'c' ? 'carbine' : 'pistol', 'magHand'))); }
function lgvSetMag(P, fam, m, ctx) { if (fam === 'c') P.carbine.mag = m; else P.pistol.mag = m; }
// the reloads, beat for beat with ARMS (arms.js ARMS_BEATS)
const LGV_RL = {
  // the AR (and the SCAR): release, the empty falls (or is stripped and stowed), a fresh one from the placard, seated,
  // a tug, and on empty the palm on the bolt catch (the SCAR racks its left-side handle instead)
  ar(P, k, ctx) {
    const empty = ctx.rk === 'empty', keep = ctx.keep, W = LGV_POST.rWork, R = LGV_POST.rLow, scar = ctx.kind === 'scar';
    const v = k < 0.12 ? lgvPost(R, W, k / 0.12) : k > 0.86 ? lgvPost(W, R, (k - 0.86) / 0.14) : W;
    const seat = lgvMagAt(v, 0, 'c'), out = lgvMagAt(v, 1.1, 'c'), PL = LGV_KIT.placard(), DU = LGV_KIT.dump();
    let keys, mag;
    if (keep) {   // tactical: strip the magazine, stow it, a fresh one in
      keys = [[0.06, null], [0.12, seat], [0.2, out], [0.3, DU], [0.36, DU], [0.42, PL], [0.46, PL], [0.52, out], [0.55, seat], [0.62, seat], [0.72, null]];
      mag = k < 0.12 ? 'in' : k < 0.33 ? 'hand' : k < 0.42 ? 'out' : k < 0.55 ? 'hand' : 'in';
    } else {
      const bolt = scar ? lgvOnGun(v, lgvAt([0.15, 0.045, 0.012], 0.4, 0, -Math.PI / 2)) : lgvOnGun(v, lgvAt([0.03, 0.035, -0.012], Math.PI / 2, 0.3, 0));
      keys = [[0.04, null], [0.1, PL], [0.3, PL], [0.46, out], [0.5, seat], [0.58, seat], [0.66, empty ? bolt : null]];
      if (empty) keys.push([scar ? 0.8 : 0.8, scar ? lgMul(lgM4(), bolt, lgTR(-0.06, 0, 0, 0, 0, 0)) : bolt], [0.88, null]); else keys.push([0.74, null]);
      mag = k < 0.1 ? (ctx.run ? 'out' : { drop: k * 2.5 }) : k < 0.3 ? 'out' : k < 0.5 ? 'hand' : 'in';
    }
    lgvRelMag(P, v, keys, k, ctx, mag, 'c', k < 0.5 && k > 0.42 ? (0.5 - k) / 0.08 : 0);
    ctx.look = lgPulse(k, 0.05, 0.75);
  },
  scar(P, k, ctx) { LGV_RL.ar(P, k, ctx); },
  // the AK: the fresh magazine knocks the empty out, hooks at the front, rocks back into the well; on empty the support
  // hand reaches under the gun to rack the charging handle on the right
  ak(P, k, ctx) {
    const empty = ctx.rk === 'empty', W = LGV_POST.rWork, R = LGV_POST.rLow, v = k < 0.1 ? lgvPost(R, W, k / 0.1) : k > 0.86 ? lgvPost(W, R, (k - 0.86) / 0.14) : W;
    const seat = lgvMagAt(v, 0, 'c'), PL = LGV_KIT.placard(), hook = lgMul(lgM4(), seat, lgTR(0.02, 0, -0.03, 0, 0.5, 0)), ch = lgvOnGun(v, lgvAt([0.17, -0.05, -0.005], -Math.PI / 2, 0.4, 0));
    const keys = [[0.02, null], [0.08, PL], [0.24, PL], [0.36, hook], [0.44, hook], [0.52, seat], [0.6, empty ? ch : null]];
    if (empty) keys.push([0.7, lgMul(lgM4(), ch, lgTR(-0.07, 0, 0, 0, 0, 0))], [0.79, ch], [0.88, null]); else keys.push([0.68, null]);
    P.carbine.rock = k < 0.36 ? 0.5 : k < 0.52 ? 0.5 * (1 - lgvE((k - 0.36) / 0.16)) : 0; P.carbine.piv = [(LG_GUN_DEF[ctx.gun] || {}).mag ? LG_GUN_DEF[ctx.gun].mag[0] + 0.02 : 0.1, -0.045];
    const mag = k < 0.08 ? 'in' : k < 0.24 ? 'out' : k < 0.36 ? 'hand' : 'in';
    if (k < 0.36 && k >= 0.24) P.carbine.rock = 0;
    lgvRelMag(P, v, keys, k, ctx, mag, 'c', 0);
    if (k >= 0.24 && k < 0.36) P.carbine.mag = 'hand';
    ctx.look = lgPulse(k, 0.05, 0.6);
  },
  // the PP-19: the helical magazine unhooks at the back, swings down off its front hook; the new one hooks at the front,
  // rotates up and clicks; on empty the handle on the right
  helix(P, k, ctx) {
    const empty = ctx.rk === 'empty', W = LGV_POST.rWork, R = LGV_POST.rLow, v = k < 0.1 ? lgvPost(R, W, k / 0.1) : k > 0.88 ? lgvPost(W, R, (k - 0.88) / 0.12) : W;
    const seat = lgvMagAt(v, 0, 'c'), PL = LGV_KIT.dump(), ch = lgvOnGun(v, lgvAt([0.14, -0.045, -0.005], -Math.PI / 2, 0.4, 0));
    const keys = [[0.04, null], [0.1, seat], [0.16, seat], [0.26, PL], [0.32, PL], [0.42, seat], [0.6, seat], [0.66, empty ? ch : null]];
    if (empty) keys.push([0.8, lgMul(lgM4(), ch, lgTR(-0.06, 0, 0, 0, 0, 0))], [0.86, ch], [0.92, null]); else keys.push([0.72, null]);
    P.carbine.piv = [0.33, -0.03];
    P.carbine.rock = k < 0.1 ? 0 : k < 0.18 ? -0.45 * lgvE((k - 0.1) / 0.08) : k < 0.42 ? -0.45 : k < 0.55 ? -0.45 * (1 - lgvE((k - 0.42) / 0.13)) : 0;
    const mag = k < 0.18 ? 'in' : k < 0.26 ? (ctx.run ? 'out' : { drop: (k - 0.18) * 3 }) : k < 0.32 ? 'out' : 'in';
    lgvRelMag(P, v, keys, k, ctx, mag, 'c', 0, true);
    ctx.look = lgPulse(k, 0.05, 0.65);
  },
  // the M1014: the gun rolled to show the port underneath; a shell from the belt pushed in with the thumb (per shell);
  // on empty, rolled the other way, a shell dropped into the ejection port and the bolt release pressed
  tube(P, k, ctx) {
    const port = ctx.rk === 'empty' || ctx.rk === 'port', R = LGV_POST.rLow, W = port ? LGV_POST.rPort : [0.33, -0.05, 0.16, 0.18, 0.15, 0.62];
    const v = k < 0.15 ? lgvPost(R, W, k / 0.15) : k > 0.88 ? lgvPost(W, R, (k - 0.88) / 0.12) : W;
    const SH = LGV_KIT.shells(), at = port ? lgvOnGun(v, lgvAt([0.08, -0.03, 0.03], -Math.PI / 2, 0, 0)) : lgvOnGun(v, lgvAt([0.09, 0, -0.06], 0, 0, 0)), push = port ? at : lgMul(lgM4(), at, lgTR(0.04, 0, 0.015, 0, 0, 0));
    const rel = lgvOnGun(v, lgvAt([0.14, -0.02, -0.02], -Math.PI / 2, 0, 0));
    const keys = port ? [[0.05, null], [0.18, SH], [0.3, SH], [0.42, at], [0.5, at], [0.7, rel], [0.85, rel], [0.95, null]] : [[0.02, null], [0.15, SH], [0.3, SH], [0.55, at], [0.72, push], [0.86, null]];
    lgvRifle(P, v, ctx, lgvTrackN(k, keys, v), lgvKL(k, keys));
    // the shell rides the hand from the belt to the port (the magazine bone carries a shell on the shotgun)
    const hold = port ? k > 0.3 && k < 0.47 : k > 0.3 && k < 0.7;
    P.carbine.mag = hold ? 'hand' : 'out'; P.grip.L = hold ? 'claw' : P.grip.L;
    ctx.look = lgPulse(k, 0.1, 0.8);
  },
  // a pistol: the gun pulled into the workspace, the empty drops, a fresh one from the belt, seated with a slap, then
  // the slide released (or racked overhand) on empty
  pistol(P, k, ctx) {
    const empty = ctx.rk === 'empty', L = LGV_POST.pLow, W = LGV_POST.pWork, v = k < 0.12 ? lgvPost(L, W, k / 0.12) : k > 0.86 ? lgvPost(W, L, (k - 0.86) / 0.14) : W;
    const seat = lgvMagAt(v, 0, 'p'), out = lgvMagAt(v, 1.2, 'p'), BE = LGV_KIT.belt(), rack = lgvOnGun(v, lgvAt([0.03, 0.0, 0.035], Math.PI / 2, 0, 0)), rack2 = lgMul(lgM4(), rack, lgTR(-0.05, 0, 0, 0, 0, 0));
    const keys = [[0.05, null], [0.12, BE], [0.3, BE], [0.45, out], [0.5, seat], [0.58, seat], [0.64, empty ? rack : null]];
    if (empty) keys.push([0.72, rack2], [0.78, rack], [0.86, null]); else keys.push([0.68, null]);
    lgvRelMag(P, v, keys, k, ctx, k < 0.12 ? (ctx.run ? 'out' : { drop: k * 3 }) : k < 0.3 ? 'out' : k < 0.5 ? 'hand' : 'in', 'p', k > 0.45 && k < 0.5 ? (0.5 - k) / 0.05 : 0);
    P.pistol.slide = empty ? (k < 0.75 ? 1 : 0) : 0;
    ctx.look = lgPulse(k, 0.05, 0.7);
  },
  p1911(P, k, ctx) { LGV_RL.pistol(P, k, ctx); if (ctx.rk === 'empty') P.pistol.slide = k < 0.76 ? 1 : 0; },
  // the revolver: muzzle up, the cylinder out, the ejector slapped (two clips of empties fall), muzzle down, two
  // half-moon clips from the belt, one after the other, and the crane closed with the support hand
  moon(P, k, ctx) {
    const U = LGV_POST.pUp, D = LGV_POST.pDown, L = LGV_POST.pLow;
    const v = k < 0.12 ? lgvPost(L, U, k / 0.12) : k < 0.3 ? U : k < 0.38 ? lgvPost(U, D, (k - 0.3) / 0.08) : k < 0.86 ? D : lgvPost(D, L, (k - 0.86) / 0.14);
    const rod = lgvOnGun(v, lgvAt([0.12, 0.0, -0.03], 0, -Math.PI / 2, 0)), cyl = lgMul(lgM4(), lgvOnGun(v, null, 0), lgInv(lgM4(), lgSockFor('pistol', 'magHand'))), BE = LGV_KIT.belt();
    const keys = [[0.05, null], [0.16, rod], [0.24, rod], [0.32, BE], [0.42, BE], [0.5, cyl], [0.54, BE], [0.62, BE], [0.68, cyl], [0.8, cyl], [0.9, null]];
    lgvRelMag(P, v, keys, k, ctx, k < 0.22 ? 'in' : k < 0.3 ? (ctx.run ? 'out' : { drop: (k - 0.22) * 3 }) : k < 0.42 ? 'out' : k < 0.5 ? 'hand' : k < 0.62 ? 'hand' : k < 0.68 ? 'hand' : 'in', 'p', 0);
    ctx.look = lgPulse(k, 0.08, 0.85);
  }
};
// the support hand along a track of targets; null keys mean "on the gun"; mag: the magazine state; ins: insertion
function lgvTrackN(k, keys, v, fam) {
  const on = lgvOnGun(v, lgSockFor(fam === 'p' ? 'pistol' : 'carbine', 'gripL')), K = keys.map(x => [x[0], x[1] || on]);
  return lgvTrack(k, K);
}
function lgvKL(k, keys) {
  // how far off the gun the support hand is: 0 at the start and end keys that are null
  let a = keys[0], b = keys[keys.length - 1];
  if (k <= a[0] || k >= b[0]) return (k <= a[0] ? (a[1] ? 1 : 0) : (b[1] ? 1 : 0));
  return 1;
}
function lgvRelMag(P, v, keys, k, ctx, mag, fam, ins, helix) {
  const T = lgvTrackN(k, keys, v, fam), kl = lgvKL(k, keys);
  if (fam === 'c') lgvRifle(P, v, ctx, T, kl); else lgvPistol(P, v, ctx, T, kl);
  P.grip.L = kl > 0.5 ? (mag === 'hand' ? 'claw' : 'cup') : (fam === 'c' ? 'cup' : 'support');
  lgvSetMag(P, fam, ins > 0 && mag === 'hand' ? ins : mag, ctx);
  if (ins > 0 && mag === 'hand') { lgvHand(P, 'L', lgvMagAt(v, ins, fam)); }
}
// the dodge roll: down over the shoulder in a tuck, the gun held in tight, and up into a crouch facing the same way
function lgvRoll(P, k, ctx) {
  const pitch = k < 0.18 ? lgvE(k / 0.18) * 0.95 : k < 0.78 ? 0.95 + (TAU - 1.35) * lgvE((k - 0.18) / 0.6) : TAU - 0.4 + 0.4 * lgvE((k - 0.78) / 0.22);
  const z = k < 0.18 ? -0.3 * lgvE(k / 0.18) : k < 0.78 ? -0.58 : -0.58 + 0.46 * lgvE((k - 0.78) / 0.22);
  lgPelvis(P, 0, 0, z, 0.15 * Math.sin(k * Math.PI), pitch, 0);
  const tuck = k < 0.12 ? lgvE(k / 0.12) : k > 0.86 ? 1 - lgvE((k - 0.86) / 0.14) * 0.6 : 1;
  lgJ(P, 'spine', 0, 0.35 * tuck, 0); lgJ(P, 'chest', 0, 0.3 * tuck, 0); lgJ(P, 'neck', 0, 0.45 * tuck, 0); lgJ(P, 'head', 0, 0.2 * tuck, 0);
  for (const s of ['L', 'R']) { lgJ(P, 'thigh' + s, 0, -2.1 * tuck, s === 'L' ? 0.1 : -0.1); lgJ(P, 'shin' + s, 0, 2.2 * tuck, 0); lgJ(P, 'foot' + s, 0, -0.4 * tuck, 0); }
  if (lgvC(ctx)) lgvRifle(P, [0.2, 0.04, 0.0, 0.55, 1.15, -0.2], ctx); else { lgvPistol(P, LGV_POST.pSul, ctx, LGV_KIT.chest(), 1); P.grip.L = 'open'; }
}

/* ---------- the body: where each part is turned, and its weight ---------- */
const angD = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
function lgvBody(p) {
  let B = LGV.bodies.get(p);
  if (!B) { const a = p.aim || 0; B = { leg: a, chest: a, head: a, vL: 0, vC: 0, vH: 0, x: p.x, y: p.y, t: G.time || 0, vx: 0, vy: 0, lean: { x: 0, v: 0, y: 0, w: 0 }, kick: { x: 0, v: 0 }, cant: { x: 0, v: 0 }, ph: 0, clip: 'idle_ready', scan: 0, scanT: 0, shots: p.arm ? p.arm.kickN : 0, rel: 0, turnPh: 0, side: 0, probeT: 0 }; LGV.bodies.set(p, B); }
  return B;
}
// a critically damped spring on an angle: the part turns toward its target as a mass would
function lgvTurn(B, key, vkey, target, w, dt) { const x = angD(B[key], target), v = B[vkey]; const a = -w * w * x - 2 * w * v; B[vkey] = v + a * dt; B[key] += B[vkey] * dt; }
function lgvStep(p, B) {
  const now = G.time || 0, dt = clamp(now - B.t, 0, 0.1); if (dt <= 0) return B; B.t = now;
  const u = physU(), vx = (p.x - B.x) / dt, vy = (p.y - B.y) / dt, ax = vx - B.vx, ay = vy - B.vy; B.x = p.x; B.y = p.y;
  B.vx += (vx - B.vx) * Math.min(1, dt * 14); B.vy += (vy - B.vy) * Math.min(1, dt * 14);
  const sp = Math.hypot(B.vx, B.vy) / u, mv = sp > 0.35, head = Math.atan2(B.vy, B.vx), aim = p.aim || 0, a = p.arm || {}, st = a.st || 'relaxed', focus = a.focus || 0;
  const sprint = st === 'sprint', dodge = p.dashT > 0 && p.dashK === 'dodge';
  // the head: on the sights when engaged; relaxed it scans (and looks where it walks); sprinting, where it runs
  B.scanT -= dt; if (B.scanT <= 0) { B.scanT = 1.2 + Math.random() * 1.6; B.scan = (Math.random() - 0.5) * 1.2 * (1 - focus); if (Math.random() < 0.18) B.scan = 0; }
  let hT = aim + B.scan * (1 - focus);
  if (mv && focus < 0.4) hT = aim + angD(head, aim) * 0.35 * (1 - focus) + B.scan * 0.5;
  if (sprint || dodge) hT = head;
  lgvTurn(B, 'head', 'vH', hT, 24, dt);
  // the shoulders follow the head (and carry the gun to the aim); a long gun swings heavier than a pistol
  const heavy = p.weapon && p.weapon.slot === 'primary' ? 1 : 0.7, cT = sprint || dodge ? head : aim + angD(B.head, aim) * 0.25;
  lgvTurn(B, 'chest', 'vC', cT, (focus > 0.5 ? 15 : 10) / Math.sqrt(heavy), dt);
  // the legs: toward the walk, sidestepping across the aim, backing away from it; standing, they step round when the
  // torso has twisted too far over them
  let lT = B.leg, clip = 'idle_ready';
  if (dodge) { lT = Math.atan2(p.dashDy || 0, p.dashDx || 1); clip = 'dodge'; }
  else if (p.down) clip = 'down';
  else if (mv) {
    const rel = angD(head, B.chest);
    if (sprint) { lT = head; clip = 'sprint'; }
    else if (Math.abs(rel) < 1.0) { lT = head; clip = sp > 4 ? 'run' : 'walk_tac'; }
    else if (Math.abs(rel) > 2.25) { lT = head + Math.PI; clip = 'backpedal'; }
    else { lT = B.chest; clip = rel > 0 ? 'strafe_l' : 'strafe_r'; }
  } else {
    const tw = angD(B.chest, B.leg);
    if (Math.abs(tw) > 0.75 || B.turning) { B.turning = Math.abs(tw) > 0.12; lT = B.chest; if (B.turning) { clip = tw > 0 ? 'strafe_l' : 'strafe_r'; B.turnPh += dt * 1.6; } }
  }
  lgvTurn(B, 'leg', 'vL', lT, mv || B.turning ? 11 : 6, dt);
  // the twist never goes past what a spine can do: the hips are dragged round
  const tw = angD(B.chest, B.leg); if (Math.abs(tw) > 1.3) B.leg = B.chest - Math.sign(tw) * 1.3;
  // the feet keep pace with the ground (each walk's real stride, measured)
  const stride = LGV.stride[clip] || { walk_tac: 1.25, run: 2.6, sprint: 3.3, backpedal: 0.82, strafe_l: 0.72, strafe_r: 0.72 }[clip] || 1.3;
  if (mv) B.ph = (B.ph + sp * dt / stride) % 1; else if (B.turning) B.ph = B.turnPh % 1;
  B.clip = clip;
  // the upper body on its spring: it leans into the walk and swings on a stop; recoil pushes it back
  const lx = clamp(B.vx / u * 0.018, -0.07, 0.07), ly = clamp(B.vy / u * 0.018, -0.07, 0.07);
  physWobble(B.lean, lx + clamp(-ax / u * 0.0006, -0.03, 0.03), 90, 0.45, dt); { const s2 = { x: B.lean.y, v: B.lean.w }; physWobble(s2, ly + clamp(-ay / u * 0.0006, -0.03, 0.03), 90, 0.45, dt); B.lean.y = s2.x; B.lean.w = s2.v; }
  const kn = a.kickN || 0; if (kn !== B.shots) { const A = p.weapon && p.weapon.arms; B.kick.v -= (A ? A.kick * 2.2 + A.cam * 0.05 : 0.04) * Math.min(3, kn - B.shots || 1); B.shots = kn; }
  if (p.remote || !p.arm) { if (p.flashT > 0.04 && !B.fl) { const A = p.weapon && p.weapon.arms; B.kick.v -= A ? A.kick * 2.2 : 0.03; } B.fl = p.flashT > 0.04; }
  physWobble(B.kick, 0, 260, 0.55, dt);
  // corners: a wall right beside him and open ground past its edge ahead: lean out toward the opening
  B.probeT -= dt;
  if (B.probeT <= 0) {
    B.probeT = 0.15; let side = 0;
    if (focus > 0.5 && !mv && typeof pointInRect === 'function') {
      const c = B.chest, r = 0.55 * u, f = 1.2 * u, L = pointInRect(p.x + Math.cos(c + 1.5708) * r, p.y + Math.sin(c + 1.5708) * r), R = pointInRect(p.x + Math.cos(c - 1.5708) * r, p.y + Math.sin(c - 1.5708) * r);
      const dL = pointInRect(p.x + Math.cos(c + 0.5) * f, p.y + Math.sin(c + 0.5) * f), dR = pointInRect(p.x + Math.cos(c - 0.5) * f, p.y + Math.sin(c - 0.5) * f);
      if (L && !dL && !R) side = 1; else if (R && !dR && !L) side = -1;
    }
    B.side = side;
  }
  physWobble(B.cant, B.side, 40, 0.9, dt);
  return B;
}

/* ---------- frames: legs, upper body, head ---------- */
const LGV_LEGCLIP = { idle_ready: 'idle_ready', walk_tac: 'walk_tac', run: 'run', sprint: 'sprint', backpedal: 'backpedal', strafe_l: 'strafe_l', strafe_r: 'strafe_r' };
// each layer's frame: [left, right, top, bottom] in sprite units around its centre (forward is right; the gun reaches far)
const LGV_BOX = { legs: [-36, 36, -24, 24], up: [-30, 62, -34, 38], head: [-9, 9, -9, 9], full: [-52, 52, -52, 52] };
function lgvModelKey(p) {
  const cls = p === G.p ? (SET.legendClass || 'attack') : (p.lc || 'attack'), a = p.arm;
  let gp = 'm4a1', gs = 'm17';
  if (a && a.w) { const w0 = a.w[0], w1 = a.w[1]; if (w0 && w0.arms && w0.slot === 'primary') gp = w0.arms.key; if (w1 && w1.arms && w1.slot === 'secondary') gs = w1.arms.key; }
  if (p.weapon && p.weapon.arms) { if (p.weapon.slot === 'primary') gp = p.weapon.arms.key; else gs = p.weapon.arms.key; }
  return { cls: cls, gp: gp, gs: gs, k: cls + '|' + gp + '|' + gs };
}
// paint one layer of one pose: f(P) poses it; hide: which bones (or a function of the pose); box: the frame; centre: a bone
function lgvPaint(lgId, mk, f, hide, box, px, centre) {
  const t0 = performance.now(), m = lgModel(lgId, 2, mk.k); if (!m) return null;
  if (!LG_SPR.L) { LG_SPR.L = lgLocalNew(); LG_SPR.W = lgWorldNew(); }
  lgGunSet(mk.gp, mk.gs);
  const P = lgPose(); f(P); P.root[0] = P.root[1] = P.root[2] = P.root[3] = 0;
  const W = lgSolve(P, LG_SPR.L, LG_SPR.W, lgRootM(P)), hm = typeof hide === 'function' ? hide(P) : hide;
  const cx = centre != null ? W[centre * 16 + 12] : 0, cy = centre != null ? W[centre * 16 + 13] : 0, U = LG_UNIT;
  const bw = box[1] - box[0], bh = box[3] - box[2], w = Math.max(4, Math.ceil(bw * px)), h = Math.max(4, Math.ceil(bh * px)), ss = LG.lvl >= 2 ? (Math.max(w, h) < 48 ? 2 : 1.5) : 1, Sw = Math.ceil(w * ss), Sh = Math.ceil(h * ss);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const tc = LGV.tmp && LGV.tmp.width === Sw && LGV.tmp.height === Sh ? LGV.tmp : (LGV.tmp = (() => { const k = document.createElement('canvas'); k.width = Sw; k.height = Sh; return k; })());
  const g = tc.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Sw, Sh);
  // screen x = world x (forward), screen down = world right (-y)
  const VP = lgM4(); lgOrtho(VP, cx + box[0] * U, cx + box[1] * U, cy - box[3] * U, cy - box[2] * U, -5, 5);
  // the run's light on him (1.9.993, retuned): a brighter, warmer key from above-front, a cool rim that cuts his outline out of the street at night, a little more sky
  const Lg = { key: [-0.3, 0.3, 0.9, 1.38, 1.3, 1.18], rim: [-0.7, -0.45, 0.35, 0.5, 0.58, 0.72], sky: [0.4, 0.42, 0.5], gnd: [0.12, 0.11, 0.1], acc: lgHex((LG_CLASS_BY[mk.cls] || LG_CLASSES[0]).col), glow: 1.15, view: [0, 0, 1] };
  { const k = Lg.key, l = Math.hypot(k[0], k[1], k[2]); k[0] /= l; k[1] /= l; k[2] /= l; }
  lg2D(g, m, W, VP, Sw, Sh, Lg, { grow: 0.5 * ss, hide: hm });
  const out = c.getContext('2d'); out.imageSmoothingEnabled = true; if ('imageSmoothingQuality' in out) out.imageSmoothingQuality = 'high'; out.drawImage(tc, 0, 0, Sw, Sh, 0, 0, w, h);
  const o = { c: c, box: box, cx: cx / U, cy: -cy / U };
  const dt = performance.now() - t0; LGV.made++; LGV.ms += dt; LG.spriteMade++; LG.spriteMs += dt; coreCost('LEGEND', dt);
  return { o: o, W: W, P: P };
}
// one frame, any layer, cached; the key says everything it depends on
function lgvGet(key, make) {
  let s = LG.sprites.get(key);
  if (s) { LG.sprites.delete(key); LG.sprites.set(key, s); return s; }
  if (LG.spriteBudget <= 0) return undefined;
  LG.spriteBudget--;
  try { s = make(); } catch (e) { lgHurt(e); s = null; }
  if (s) { LG.sprites.set(key, s); const cap = [200, 260, 360, 480][LG.lvl | 0] || 360; while (LG.sprites.size > cap) LG.sprites.delete(LG.sprites.keys().next().value); }
  return s;
}
// the nearest frame already painted of a series (while a new one waits its turn)
function lgvNear(base, i, n) { for (let d = 1; d < n; d++) { const s = LG.sprites.get(base + ((i + d) % n)) || LG.sprites.get(base + ((i - d + n) % n)); if (s) return s; } return null; }
function lgvBase(kind, lgId, mk, a, px) { return lgId + '|v2|' + kind + '|' + mk.k + '|' + a + '|' + Math.round(px * 100) + '|' + (LG.atlas && LG.atlas.done ? 't' : 'f') + '|'; }
function lgvLayer(kind, lgId, mk, a, i, n, px, make) {
  const base = lgvBase(kind, lgId, mk, a, px);
  let s = lgvGet(base + i, make);
  if (s === undefined) s = lgvNear(base, i, n) || null;
  return s;
}
// the upper body's series for ARMS: which, how many frames, which frame
function lgvUpState(p, B) {
  const a = p.arm || { st: 'relaxed', t: 0, dur: 1 }, st = a.st, k = a.dur ? clamp(a.t / a.dur, 0, 0.999) : 0, w = p.weapon || {}, A = w.arms || {}, R = A.reload || {};
  const fam = w.slot === 'secondary' ? 'p' : 'c';
  const ctx = { run: true, fam: fam, gun: A.key, kind: R.kind || (fam === 'p' ? 'pistol' : 'ar'), rk: a.rk, keep: !!a.keep, t: 0 };
  if (p.dashT > 0 && p.dashK === 'dodge') return { st: 'dodge', n: 8, i: Math.floor(clamp(1 - p.dashT / (p.dashDur || 0.46), 0, 0.999) * 8), ctx: ctx, full: true };
  const breath = Math.floor(((G.time || 0) / 4 % 1) * 6);
  switch (st) {
    case 'ready': return { st: 'ready', n: 6, i: breath, ctx: ctx };
    case 'raise': return { st: 'raise', n: 4, i: Math.min(3, Math.floor(k * 4)), ctx: ctx };
    case 'lower': return { st: 'raise', n: 4, i: Math.min(3, Math.floor((1 - k) * 4)), ctx: ctx };
    case 'sprint': return { st: 'sprint', n: 8, i: Math.floor((B.ph % 1) * 8), ctx: ctx };
    case 'sprintOut': return { st: 'sprintOut', n: 4, i: Math.min(3, Math.floor(k * 4)), ctx: ctx };
    case 'reload': { const n = R.kind === 'tube' ? 10 : 20; return { st: 'reload', n: n, i: Math.floor(k * n), ctx: ctx, sub: (R.kind || '') + (a.rk || '') + (a.keep ? 'k' : '') }; }
    case 'swapOut': return { st: 'swapOut', n: 8, i: Math.floor(k * 8), ctx: ctx };
    case 'swapIn': return { st: 'swapIn', n: 8, i: Math.floor(k * 8), ctx: ctx };
    case 'inspect': return { st: 'inspect', n: 8, i: Math.floor(k * 8), ctx: ctx };
  }
  return { st: 'relaxed', n: 6, i: breath, ctx: ctx };
}
// what a frame's pose solved to: the muzzle and the head in sprite units; how far the hands were from their grips
function lgvMeasure(r, fam, gun) {
  const W = r.W, P = r.P, o = r.o;
  const mi = fam === 'p' ? LGB.pistol : LGB.carbine, mo = lgSockFor(fam === 'p' ? 'pistol' : 'carbine', 'muz'), MW = W.subarray(mi * 16, mi * 16 + 16), mz = lgPt(MW, mo[0], mo[1], mo[2]);
  o.mx = mz[0] / LG_UNIT; o.my = -mz[1] / LG_UNIT;
  const h = LGB.head * 16; o.hx = W[h + 12] / LG_UNIT; o.hy = -W[h + 13] / LG_UNIT;
  // learning: the support hand on the gun -- did it get there?
  if (gun && P.ik.handL && P.ik.handL.on) {
    const PM = W.subarray(LGB[P.ik.handL.on] * 16, LGB[P.ik.handL.on] * 16 + 16), S = lgSockFor(P.ik.handL.on, 'gripL'), Gm = lgMul(lgM4(), PM, S), hl = LGB.handL * 16;
    const miss = Math.hypot(W[hl + 12] - Gm[12], W[hl + 13] - Gm[13], W[hl + 14] - Gm[14]);
    LGV.miss[gun] = miss;
    if (miss > 0.006 && (LGV.tries[gun] || 0) < 6) {
      // bring that gun in toward the shoulder by most of the miss, and paint its frames again
      const f = LGV.fix[gun] || (LGV.fix[gun] = [0, 0, 0]); f[0] -= miss * 0.8; f[2] -= miss * 0.25; LGV.tries[gun] = (LGV.tries[gun] || 0) + 1; LGV.learnt++;
      for (const key of Array.from(LG.sprites.keys())) if (key.indexOf('|v2|up|') > 0 && key.indexOf('|' + gun) > 0) LG.sprites.delete(key);
    }
  }
  return o;
}
// each walk measured once: how far a planted foot travels in a cycle (so the steps are paced and the feet do not slide)
function lgvLearnStride(clip) {
  if (LGV.stride[clip] || !LG_ANIM_BY[clip]) return;
  LGV.stride[clip] = -1;
  try {
    const a = LG_ANIM_BY[clip], P = lgPose(), L = lgLocalNew(), Wd = lgWorldNew(), n = 24, xs = [], ys = [], zs = [];
    for (let i = 0; i < n; i++) { lgEvalClip(a, i / n * a.dur, P, { run: true, wc: 'r' }); const W2 = lgSolve(P, L, Wd, lgRootM(P)), f = LGB.footL * 16; xs.push(W2[f + 12]); ys.push(W2[f + 13]); zs.push(W2[f + 14]); }
    const zmin = Math.min(...zs), lat = clip === 'strafe_l' || clip === 'strafe_r', q = lat ? ys : xs;
    let lo = Infinity, hi = -Infinity, np = 0; for (let i = 0; i < n; i++) if (zs[i] < zmin + 0.012) { lo = Math.min(lo, q[i]); hi = Math.max(hi, q[i]); np++; }
    const st = np / n, s = st > 0.2 && hi > lo ? (hi - lo) / st : 0;
    if (s > 0.2 && s < 5) { LGV.stride[clip] = s; LGV.learnt++; }
  } catch (e) { lgHurt(e); }
}
function lgvMakeUp(lgId, mk, st, i, n, ctx0, px) {
  const ctx = Object.assign({}, ctx0), k = st === 'sprint' ? i / n : (i + 0.5) / n; ctx.t = st === 'relaxed' || st === 'ready' ? i / n * 4 : 0;
  const f = P => { (LGV_UP[st] || LGV_UP.relaxed)(P, k, ctx); P.mask = 1; };
  const r = lgvPaint(lgId, mk, f, P => P.pistol.at === 'holster' ? LGV_M.upperNoP : LGV_M.upper, LGV_BOX.up, px, null);
  if (!r) return null;
  const o = lgvMeasure(r, ctx.fam, ctx.gun); o.look = ctx.look || 0; return o;
}
/* ---------- drawing the survivor ---------- */
function lgvDraw(p, ctx2) {
  if (!LGV.on || !LG_ANIM_BY.idle_ready || !LG_MAKERS.operator || typeof lgSockFor !== 'function') return null;
  const lgId = p === G.p ? (SET.legend || 'operator') : (p.lg || 'operator'); if (lgId === 'none') return null;
  const B = lgvStep(p, lgvBody(p)), mk = lgvModelKey(p), px = SPR * PK * (LGV.pxMul || 1), aim = p.aim || 0, U = lgvUpState(p, B), fam = U.ctx.fam;
  const img = (s, b) => ctx2.drawImage(s.c, b[0], b[2], b[1] - b[0], b[3] - b[2]);
  // the dodge, and going down: one frame of the whole body
  if (U.full || p.down) {
    const clip = p.down ? 'down' : 'dodge', n = 8, i = p.down ? 7 : U.i;
    const s = lgvLayer('full', lgId, mk, clip + fam, i, n, px, () => {
      const r = lgvPaint(lgId, mk, P => { if (p.down) lgEvalClip(LG_ANIM_BY.down, LG_ANIM_BY.down.dur, P, { run: true, wc: fam === 'p' ? 'p' : 'r' }); else lgvRoll(P, (i + 0.5) / n, U.ctx); P.mask = 1; }, null, LGV_BOX.full, px, null);
      return r ? lgvMeasure(r, fam, null) : null;
    });
    if (!s) return null;
    const d = p.down ? 0 : angD(B.leg, aim);
    ctx2.save(); ctx2.rotate(d); img(s, s.box); ctx2.restore();
    const cr = Math.cos(d), sr = Math.sin(d); p.lgAim = aim + d; return { mx: s.mx * cr - s.my * sr, my: s.mx * sr + s.my * cr };
  }
  // legs (the holstered pistol on the hip goes with them while the long gun is out)
  const lc = LGV_LEGCLIP[B.clip] || 'idle_ready', la = LG_ANIM_BY[lc] || LG_ANIM_BY.idle_ready, nL = lc === 'idle_ready' ? 1 : 16, iL = lc === 'idle_ready' ? 0 : Math.floor(B.ph * nL) % nL;
  const holP = fam === 'c' ? 1 : 0;
  if (!LGV.stride[lc] && lc !== 'idle_ready') lgvLearnStride(lc);
  const legs = lgvLayer('legs' + holP, lgId, mk, lc, iL, nL, px, () => { const r = lgvPaint(lgId, mk, P => { lgEvalClip(la, lc === 'idle_ready' ? 0 : iL / nL * la.dur, P, { run: true, wc: 'r' }); P.pistol.at = 'holster'; }, holP ? LGV_M.legsH : LGV_M.legs, LGV_BOX.legs, px, null); return r ? r.o : null; });
  // the upper body: its ARMS series
  const up = lgvLayer('up', lgId, mk, U.st + fam + (U.ctx.gun || '') + (U.sub || ''), U.i, U.n, px, () => lgvMakeUp(lgId, mk, U.st, U.i, U.n, U.ctx, px));
  // the head: the mask on, level or looking down at the hands
  const look = up && up.look > 0.4 ? 1 : 0;
  const hd = lgvLayer('head', lgId, mk, 'h', look, 2, px, () => { const r = lgvPaint(lgId, mk, P => { lgBase(P, { crouch: 0.04, lean: 0.12 }); P.mask = 1; if (look) lgJadd(P, 'head', 0, 0.5, 0); }, LGV_M.head, LGV_BOX.head, px, LGB.head); return r ? r.o : null; });
  if (!legs || !up) return null;
  // together: each layer turned to its own heading (relative to the aim the canvas is turned to)
  const kick = B.kick.x / LG_UNIT, cant = B.cant.x, dC = angD(B.chest, aim), dH = angD(B.head, aim), dL = angD(B.leg, aim);
  const ca = Math.cos(-aim), sa = Math.sin(-aim), lx = (B.lean.x * ca - B.lean.y * sa) / LG_UNIT, ly = (B.lean.x * sa + B.lean.y * ca) / LG_UNIT;
  const cdx = Math.cos(dC), cdy = Math.sin(dC), sideX = cdy * cant * 7, sideY = -cdx * cant * 7;
  ctx2.save(); ctx2.rotate(dL); img(legs, legs.box); ctx2.restore();
  const ox = lx + sideX + cdx * kick, oy = ly + sideY + cdy * kick, rot = dC - cant * 0.1 + B.kick.x * 0.5;
  ctx2.save(); ctx2.translate(ox, oy); ctx2.rotate(rot); img(up, up.box); ctx2.restore();
  const cr = Math.cos(rot), sr = Math.sin(rot);
  if (hd) {
    const hx = ox + (up.hx * cr - up.hy * sr) + sideX * 0.3, hy = oy + (up.hx * sr + up.hy * cr) + sideY * 0.3;
    ctx2.save(); ctx2.translate(hx, hy); ctx2.rotate(dH - cant * 0.15); img(hd, hd.box); ctx2.restore();
  }
  // where the muzzle is (the flash and the smoke) and where the gun really points (the flashlight)
  const mxr = ox + up.mx * cr - up.my * sr, myr = oy + up.mx * sr + up.my * cr;
  p.lgAim = aim + rot; p.lgMx = mxr; p.lgMy = myr; p.lgFocus = p.arm ? p.arm.focus : 1;
  return { mx: mxr, my: myr };
}
// the run's frames painted ahead, a few at a time (the main menu, the loader): the loadout's relaxed, ready and walk
function lgvWarm(n) {
  if (!LGV.on || SET.legend === 'none' || !LG.atlas || !LG.atlas.done || typeof armsLoad !== 'function') return 0;
  const W0 = armsPrimary(), W1 = armsSecondary(), fake = { arm: { w: [W0, W1] }, weapon: W0 }, lgId = SET.legend || 'operator', mk = lgvModelKey(fake), px = SPR * PK;
  const ctx = { run: true, fam: 'c', gun: W0.arms.key, kind: W0.arms.reload.kind, rk: 'tac', keep: false, t: 0 };
  const jobs = [['up', 'relaxed', 6], ['up', 'ready', 6], ['up', 'raise', 4], ['legs1', 'idle_ready', 1], ['legs1', 'walk_tac', 16], ['head', 'h', 2]];
  let made = 0;
  for (const [kind, st, cnt] of jobs) for (let i = 0; i < cnt && made < n; i++) {
    const sk = kind === 'up' ? st + 'c' + W0.arms.key : st, base = lgvBase(kind, lgId, mk, sk, px); if (LG.sprites.has(base + i)) continue;
    LG.spriteBudget = 1;
    if (kind === 'up') lgvLayer('up', lgId, mk, sk, i, cnt, px, () => lgvMakeUp(lgId, mk, st, i, cnt, ctx, px));
    else if (kind === 'head') lgvLayer('head', lgId, mk, 'h', i, 2, px, () => { const r = lgvPaint(lgId, mk, P => { lgBase(P, { crouch: 0.04, lean: 0.12 }); P.mask = 1; if (i) lgJadd(P, 'head', 0, 0.5, 0); }, LGV_M.head, LGV_BOX.head, px, LGB.head); return r ? r.o : null; });
    else { const la = LG_ANIM_BY[st]; lgvLayer(kind, lgId, mk, st, i, cnt, px, () => { const r = lgvPaint(lgId, mk, P => { lgEvalClip(la, st === 'idle_ready' ? 0 : i / cnt * la.dur, P, { run: true, wc: 'r' }); P.pistol.at = 'holster'; }, LGV_M.legsH, LGV_BOX.legs, px, null); return r ? r.o : null; }); }
    made++;
  }
  return made;
}
