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
const LGV = { on: true, made: 0, ms: 0, miss: {}, fix: {}, tries: {}, first: {}, stuck: {}, stride: {}, learnt: 0, bodies: new WeakMap() };
// which bones each layer shows
const LGV_LEGS = ['root', 'pelvis', 'thighL', 'shinL', 'footL', 'toeL', 'thighR', 'shinR', 'footR', 'toeR', 'dump'];
const LGV_HEAD = ['head', 'mBrow', 'mCheekL', 'mCheekR', 'mJawL', 'mJawR', 'mChin', 'mVisor'];
const LGV_PIST = LG_PBONES;
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
function lgvHand(P, side, M, pole) { P.ik['hand' + side] = { sp: 'chest', p: [M[12], M[13], M[14]], M: M, pole: pole || (side === 'L' ? LG_POLE.Lc : LG_POLE.Rc) }; }
function lgvPost(a, b, k) { k = lgvE(clamp(k, 0, 1)); return a.map((x, i) => x + (b[i] - x) * k); }
// postures, chest space [x, y, z, yaw, pitch (+ muzzle down), cant (+ top right)]
const LGV_POST = {
  rReady: [0.376, -0.14, 0.25, 0.0, 0.0, 0.0], rLow: [0.31, -0.14, 0.05, 0.06, 0.6, 0.0], rSprint: [0.24, -0.02, 0.05, 0.78, 1.0, -0.3], rWork: [0.33, -0.05, 0.17, 0.3, 0.12, -0.72],
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
  const g = ctx.fk || ctx.gun || '', vv = lgvFix(g, v);
  P.carbine.at = 'aim'; P.carbine.sp = 'chest'; P.carbine.M = lgvGunM(vv);
  P.ik.handR = { on: 'carbine', pole: LG_POLE.Rc }; P.grip.R = ctx.trigger ? 'trigger' : 'pistol';
  if (free && kL > 0) { const on = lgvOnGun(vv, lgSockFor('carbine', 'gripL')); lgvHand(P, 'L', lgvMix(on, free, kL)); P.grip.L = kL > 0.6 ? (ctx.gripL || 'cup') : 'cup'; }
  else { P.ik.handL = { on: 'carbine', pole: LG_POLE.Lc }; P.grip.L = 'cup'; }
  if (ctx.fam === 'c') { P.pistol.at = 'holster'; }
  return vv;
}
function lgvPistol(P, v, ctx, free, kL) {
  const g = ctx.fk || ctx.gun || '', vv = lgvFix(g, v);
  P.pistol.at = 'aim'; P.pistol.sp = 'chest'; P.pistol.M = lgvGunM(vv);
  P.ik.handR = { on: 'pistol', pole: LG_POLE.Rt }; P.grip.R = ctx.trigger ? 'trigger' : 'pistol';
  if (free && kL > 0) { const on = lgvOnGun(vv, lgSockFor('pistol', 'gripL')); lgvHand(P, 'L', lgvMix(on, free, kL), LG_POLE.Lt); P.grip.L = kL > 0.6 ? (ctx.gripL || 'cup') : 'support'; }
  else { P.ik.handL = { on: 'pistol', pole: LG_POLE.Lt }; P.grip.L = 'support'; }
  P.carbine.at = 'back';
  return vv;
}
function lgvHold(P, v, ctx, free, kL) { return lgvC(ctx) ? lgvRifle(P, v, ctx, free, kL) : lgvPistol(P, v, ctx, free, kL); }
// 1.9.997: empty, a gun that locks open stays open (the slide or the bolt back) until it is reloaded
function lgvHoldOpen(P, ctx) { if (!ctx.hold) return; if (lgvC(ctx)) P.carbine.bolt = 1; else { P.pistol.slide = 1; P.pistol.hammer = 1; } }
const LGV_SHOT_T = 0.12;
const LGV_UP = {
  relaxed(P, k, ctx) { lgvTorso(P, 0.15, ctx.t, ctx.fam); const v = (lgvC(ctx) ? LGV_POST.rLow : LGV_POST.pLow).slice(); v[4] += Math.sin(ctx.t * TAU / 4) * 0.02; lgvHold(P, v, ctx); lgvHoldOpen(P, ctx); },
  ready(P, k, ctx) { lgvTorso(P, 1, ctx.t, ctx.fam); const v = (lgvC(ctx) ? LGV_POST.rReady : LGV_POST.pReady).slice(); v[3] += lgN1(ctx.t * 0.7, 1) * 0.006; v[4] += lgN1(ctx.t * 0.6, 2) * 0.006; ctx.trigger = true; lgvHold(P, v, ctx); lgvHoldOpen(P, ctx); },
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
  // 1.9.997: the shot: the gun's own action cycles and its round drives it back and up by its impulse (legfire.js); the
  // frames cover the first 120 ms after the trigger breaks
  shot(P, k, ctx) { lgvTorso(P, 1, ctx.t, ctx.fam); const v = (lgvC(ctx) ? LGV_POST.rReady : LGV_POST.pReady).slice(); ctx.trigger = true; lgfShots(P, v, ctx.gun, [0], k * LGV_SHOT_T, { fam: ctx.fam, hold: ctx.hold }); lgvHold(P, v, ctx); },
  dodge(P, k, ctx) { lgvRoll(P, k, ctx); },
  // 1.9.994: the knife (BLADE, knife.js): the blade in the left hand in a reverse grip, the sidearm in the right; each
  // move its own path for the blade (and for the gun on the shots and the whip), the hips and the chest behind it
  knife(P, k, ctx) { lgvKnife(P, k, ctx.km || 'stab', ctx); }
};
// the knife's moves, chest space: [x forward, y left, z up]; the guard is the left fist by the chin, the blade down the forearm
const LGV_KG = [0.26, 0.07, 0.24], LGV_KR = [0.2, -1.3, 0.4];
function lgvKnife(P, k, mv, ctx) {
  lgvTorso(P, 0.75, ctx.t || 0, 'p');
  const K = (keys) => lgK(k, keys), G = LGV_KG, R = LGV_KR;
  let hp = G, hr = R, yaw = 0, lean = 0, gun = [0.22, -0.13, 0.0, 0.25, 0.55, 0], one = true, rec = 0, whip = 0;
  switch (mv) {
    case 'stab': case 'lunge': {   // a short thrust out from the guard at the belly (the lunge: the whole body behind it)
      const s = K([[0, 0], [0.32, 1, 'o3'], [0.6, 0.9], [1, 0, 'io']]), L = mv === 'lunge' ? 1.25 : 1;
      hp = [lgLerp(G[0], 0.5 * L, s), lgLerp(G[1], 0.02, s), lgLerp(G[2], 0.06, s)]; hr = [lgLerp(R[0], 0.05, s), lgLerp(R[1], -0.55, s), lgLerp(R[2], 0.15, s)];
      lean = 0.18 * s * L; yaw = -0.25 * s; break;
    }
    case 'neck': case 'hammer': {   // the hammer: up, then down at the neck (the collar for the hammer, from higher)
      const hi = mv === 'hammer' ? 0.55 : 0.46, lo = mv === 'hammer' ? 0.04 : 0.2;
      const z = K([[0, G[2]], [0.3, hi, 'o'], [0.38, hi], [0.52, lo, 'i3'], [0.64, lo - 0.02], [1, G[2], 'io']]), x = K([[0, G[0]], [0.3, 0.16], [0.52, 0.44, 'i3'], [1, G[0]]]);
      hp = [x, K([[0, G[1]], [0.3, 0.12], [0.52, 0.02], [1, G[1]]]), z]; hr = [K([[0, 0.2], [0.3, 0.05], [0.52, -0.1], [1, 0.2]]), K([[0, -1.3], [0.3, -1.6], [0.52, -0.6, 'i3'], [1, -1.3]]), K([[0, 0.4], [0.3, 0.05], [1, 0.4]])];
      lean = K([[0, 0], [0.3, -0.06], [0.52, 0.3, 'i3'], [1, 0]]); break;
    }
    case 'slash': case 'reaper': {   // edge out, across: the hips do the work (the reaper turns him right round)
      const y = K([[0, G[1]], [0.25, 0.26, 'o'], [0.45, -0.24, 'i3'], [0.6, -0.28, 'o'], [1, G[1], 'io']]);
      hp = [K([[0, G[0]], [0.25, 0.2], [0.45, 0.46, 'i3'], [0.6, 0.36], [1, G[0]]]), y, K([[0, G[2]], [0.25, 0.2], [0.45, 0.16], [1, G[2]]])];
      hr = [0.2, K([[0, -1.3], [0.45, -0.4], [1, -1.3]]), K([[0, 0.4], [0.25, 1.2], [0.45, -0.6], [1, 0.4]])];
      yaw = mv === 'reaper' ? K([[0, 0.5], [0.45, -1.0, 'i3'], [0.7, -1.2], [1, 0, 'io']]) : K([[0, 0], [0.25, 0.45, 'o'], [0.45, -0.55, 'i3'], [1, 0, 'io']]); break;
    }
    case 'jaw': {   // up from low under the jaw
      const s = K([[0, 0], [0.25, -0.4, 'o'], [0.45, 1, 'o3'], [0.6, 0.95], [1, 0, 'io']]), sp = Math.max(0, s), sn = Math.max(0, -s);
      hp = [lgLerp(G[0], 0.44, sp) - 0.06 * sn, G[1] - 0.04 * sp, lgLerp(G[2], 0.4, sp) - 0.22 * sn]; hr = [0.15, lgLerp(-1.3, -2.0, sp), lgLerp(0.4, 0.1, sp)]; lean = 0.12 * sp - 0.05 * sn; break;
    }
    case 'pb': case 'pair': {   // the knife back to the guard, the pistol punched out past it, one round (two for the pair)
      const o = K([[0, 0], [0.18, 1, 'o3'], [0.8, 1], [1, 0.4]]);
      gun = [lgLerp(0.22, 0.47, o), lgLerp(-0.13, -0.05, o), lgLerp(0.0, 0.28, o), lgLerp(0.25, -0.06, o), lgLerp(0.55, 0.0, o), 0];
      rec = lgRecoil(k * 0.3, 0.06) + (mv === 'pair' ? lgRecoil(k * 0.36, 0.17) : 0); hp = [0.2, 0.12, 0.2]; ctx.trigger = o > 0.8; yaw = -0.08 * o; break;
    }
    case 'whip': {   // the frame of the empty pistol in a short arc to the temple
      const s = K([[0, 0], [0.22, -0.3, 'o'], [0.42, 1, 'i3'], [0.55, 0.9], [1, 0]]), sp = Math.max(0, s);
      gun = [lgLerp(0.25, 0.42, Math.abs(s)), lgLerp(-0.1, 0.06, sp), lgLerp(0.18, 0.3 - sp * 0.1, Math.abs(s)), lgLerp(0, 0.8, sp), lgLerp(0.0, 0.6, sp), lgLerp(0, 1.2, sp)];
      yaw = -0.3 * sp + 0.15 * Math.max(0, -s); whip = 1; hp = [0.22, 0.1, 0.22]; break;
    }
  }
  lgJadd(P, 'spine', 0, lean * 0.6, yaw * 0.5); lgJadd(P, 'chest', 0, lean * 0.4, yaw * 0.5); lgJadd(P, 'neck', 0, -lean * 0.5, -yaw * 0.6);
  const v = lgvFix(ctx.fk || ctx.gun || '', gun.slice()); v[4] -= rec * 0.28; v[0] -= rec * 0.05;
  P.pistol.at = 'aim'; P.pistol.sp = 'chest'; P.pistol.M = lgvGunM(v); P.ik.handR = { on: 'pistol', pole: whip ? [-0.4, -0.8, 0.1] : LG_POLE.Rt }; P.grip.R = ctx.trigger ? 'trigger' : 'pistol';
  P.knife.at = 'handL'; P.grip.L = 'knife'; lgvHand(P, 'L', lgvAt(hp, hr[0], hr[1], hr[2]), [-0.4, 0.8, -0.2]);
  P.carbine.at = 'back';
}
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
    // 1.9.997: the bolt locked back on empty until the catch is slapped (the AR) or the handle pulled and let go (the SCAR)
    if (empty && !keep) P.carbine.bolt = scar ? (k < 0.8 ? 1 : k < 0.84 ? 1 - lgvE((k - 0.8) / 0.04) : 0) : (k < 0.68 ? 1 : k < 0.71 ? 1 - lgvE((k - 0.68) / 0.03) : 0);
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
    if (empty) P.carbine.bolt = 0.54 * (k < 0.6 ? 0 : k < 0.7 ? lgvE((k - 0.6) / 0.1) : k < 0.79 ? 1 - lgvE((k - 0.7) / 0.09) : 0);   // (1.9.997: the handle goes back with the hand and runs home)
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
    if (empty) P.carbine.bolt = 0.6 * (k < 0.66 ? 0 : k < 0.8 ? lgvE((k - 0.66) / 0.14) : k < 0.86 ? 1 - lgvE((k - 0.8) / 0.06) : 0);
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
    if (port) P.carbine.bolt = k < 0.78 ? 1 : k < 0.82 ? 1 - lgvE((k - 0.78) / 0.04) : 0;   // (1.9.997: locked open until the release is pressed)
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
    P.pistol.slide = empty ? (k < 0.75 ? 1 : 0) : 0; if (empty) P.pistol.hammer = 1;
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
    // 1.9.997: the cylinder swings out on its crane (the clips in it go with it) and is closed by the support hand
    P.pistol.cylOut = k < 0.1 ? 0 : k < 0.16 ? lgvE((k - 0.1) / 0.06) : k < 0.8 ? 1 : k < 0.86 ? 1 - lgvE((k - 0.8) / 0.06) : 0;
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
function lgvKickOf(p) { const A = p.weapon && p.weapon.arms, D = A && LG_GUN_DEF[A.key]; if (D && D.act && D.act.imp) return 0.0105 * D.act.imp + 0.01; return A ? A.kick * 2.2 + A.cam * 0.05 : 0.04; }
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
  // (1.9.996: the gun stays on the aim; the eyes scanning no longer drag the chest, the gun and its light round with them)
  const heavy = p.weapon && p.weapon.slot === 'primary' ? 1 : 0.7, cT = sprint || dodge ? head : aim + angD(B.head, aim) * 0.05;
  lgvTurn(B, 'chest', 'vC', cT, (focus > 0.5 ? 15 : 10) / Math.sqrt(heavy), dt);
  // 1.9.996: the legs on LOCO, the gait engine. The hips turn toward the way he moves (at most 45 degrees off the chest,
  // which stays on the aim), the steps go the rest of the way; past 100 degrees from the aim he moves backwards. The
  // speed picks the gait (a walk, a run, a sprint) at the real cadence, and the phase advances by the ground covered, so a
  // planted foot does not slide. Standing, the feet stay put until the chest has turned too far over them, then step round.
  let clip = 'idle_ready';
  const L = B.loco || (B.loco = { hip: 0, vh: 0, back: false, dir: 0, v: 0, turn: 0 });
  if (dodge) { B.leg = Math.atan2(p.dashDy || 0, p.dashDx || 1); L.hip = angD(B.leg, B.chest); L.vh = 0; clip = 'dodge'; }
  else if (p.down) clip = 'down';
  else {
    L.v += (sp - L.v) * Math.min(1, dt * 8);
    let tgt = L.hip;
    if (mv) {
      const rel = angD(head, B.chest);
      if (L.back && Math.abs(rel) < 1.6) L.back = false; else if (!L.back && Math.abs(rel) > 1.85) L.back = true;
      const r2 = L.back ? angD(rel, Math.PI) : rel; tgt = clamp(r2, -0.78, 0.78);
      L.dir = angD(r2, tgt); L.turn = 0; clip = 'loco';
    } else if (B.stopPh != null || (B.clip === 'loco' && !L.turn)) {
      // 1.9.996: a stop: the step under way is finished, quickly, and the foot planted (the next heel strike) before he
      // settles into his stance, instead of the legs melting from mid-stride into the stand
      if (B.stopPh == null) B.stopPh = B.ph < 0.5 ? 0.5 : 1;
      clip = 'loco'; L.dir = L.dir || 0;
    } else {
      // standing: the hips hold until the chest is more than about 45 degrees round, then the feet step round under it
      if (Math.abs(L.hip) > 0.8 || L.turn) { L.turn = Math.abs(L.hip) > 0.1 ? 1 : 0; tgt = 0; if (L.turn) { clip = 'turn'; B.turnPh += dt * 1.7; } }
      L.dir = L.turn ? (L.hip > 0 ? -0.78 : 0.78) : 0;
    }
    // the hips as a mass on a spring (relative to the chest); the chest's own turn drags them while the feet are planted
    const w = mv || L.turn ? 11 : 6, x = L.hip - tgt; L.vh += (-w * w * x - 2 * w * L.vh) * dt; L.hip += L.vh * dt;
    if (!mv && !L.turn) L.hip -= angD(B.chest, B.chestWas == null ? B.chest : B.chestWas);
    L.hip = clamp(L.hip, -0.95, 0.95); B.leg = B.chest + L.hip;
    // (the painted gait changes bucket only once the new speed has held for a moment: a start or a stop passes through
    // the slow buckets in a fifth of a second, and painting whole series for that cost the frame rate, most in co-op;
    // the phase still advances by the real speed over the shown gait's stride, so the feet keep the ground)
    if (mv) { B.stopPh = null; const vt = lgvVB(L.v); if (B.vb == null || vt === B.vb) { B.vbC = vt; B.vbT = 0; } else { if (B.vbC !== vt) { B.vbC = vt; B.vbT = 0; } B.vbT += dt; if (B.vbT > 0.22) B.vb = vt; } if (B.vb == null) B.vb = vt;
      const G = locoParams(B.vb, { back: L.back, load: 0.3 }); B.ph = (B.ph + (G.stride > 0 ? sp / G.stride : 0) * dt) % 1; }
    else if (B.stopPh != null) { const rem = B.stopPh - B.ph; if (rem <= 0.004 || rem > 0.6) { B.ph = B.stopPh % 1; B.stopPh = null; B.clip = clip = 'idle_ready'; } else B.ph += Math.min(rem, dt * Math.max(2.2, rem / 0.13)); }
    else if (L.turn) { B.ph = B.turnPh % 1; }
    else { const near = Math.round(B.ph * 2) / 2; B.ph += (near - B.ph) * Math.min(1, dt * 3); }
  }
  B.chestWas = B.chest;
  B.clip = clip;
  // the upper body on its spring: it leans into the walk and swings on a stop; recoil pushes it back
  const lx = clamp(B.vx / u * 0.018, -0.07, 0.07), ly = clamp(B.vy / u * 0.018, -0.07, 0.07);
  physWobble(B.lean, lx + clamp(-ax / u * 0.0006, -0.03, 0.03), 90, 0.45, dt); { const s2 = { x: B.lean.y, v: B.lean.w }; physWobble(s2, ly + clamp(-ay / u * 0.0006, -0.03, 0.03), 90, 0.45, dt); B.lean.y = s2.x; B.lean.w = s2.v; }
  // (1.9.997: by the round's impulse into the gun, so a 12 gauge shoves him and a 9 mm barely moves him)
  const kn = a.kickN || 0; if (kn !== B.shots) { B.kick.v -= lgvKickOf(p) * Math.min(3, kn - B.shots || 1); B.shots = kn; }
  if (p.remote || !p.arm) { if (p.flashT > 0.04 && !B.fl) B.kick.v -= lgvKickOf(p); B.fl = p.flashT > 0.04; }
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
// 1.9.996: the speeds the legs are painted at (m/s): a walk, a fast walk, a jog, a run, a fast run, a sprint; the game's own
// speeds fall into a few of them (the run's 4.6 to 5.4 into 4.8, the sprint into 7.8), so few frames are needed
// leg frames painted per gait cycle (12: about 18 a second at a run's cadence, plenty for legs seen from above)
const LGV_LEGN = 12;
const LGV_VB = [1.3, 2.4, 3.6, 4.8, 6.2, 7.8];
function lgvVB(v) { let b = LGV_VB[0], d = Infinity; for (const x of LGV_VB) { const e = Math.abs(x - v); if (e < d) { d = e; b = x; } } return b; }
// each layer's frame: [left, right, top, bottom] in sprite units around its centre (forward is right; the gun reaches far)
const LGV_BOX = { legs: [-38, 38, -30, 30], up: [-30, 62, -34, 38], head: [-11, 14, -11, 11], full: [-52, 52, -52, 52] };   // (1.9.994: the head's frame has room for the mask's front)
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
  const W = lgSolve(P, LG_SPR.L, LG_SPR.W, lgRootM(P)), hm = typeof hide === 'function' ? hide(P) : hide; lgGunSet(null, null);   // (back to the generic guns for everyone else)
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
  return { o: o, W: W, P: P, gp: mk.gp, gs: mk.gs };
}
// one frame, any layer, cached; the key says everything it depends on (1.9.996: room for each teammate's frames too, so
// three legends in co-op do not push each other's frames out and repaint them every few seconds)
function lgvGet(key, make) {
  let s = LG.sprites.get(key);
  if (s) { LG.sprites.delete(key); LG.sprites.set(key, s); return s; }
  if (LG.spriteBudget <= 0) return undefined;
  LG.spriteBudget--;
  try { s = make(); } catch (e) { lgHurt(e); s = null; }
  if (s) { LG.sprites.set(key, s); const mates = typeof NET !== 'undefined' && NET.started ? (NET.role === 'host' ? NET.peers.size : NET.others.size) : 0, cap = Math.min(640, Math.round(([200, 260, 360, 480][LG.lvl | 0] || 360) * (1 + 0.3 * Math.min(3, mates)))); while (LG.sprites.size > cap) LG.sprites.delete(LG.sprites.keys().next().value); }
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
  // 1.9.997: a gun that locks open is drawn open while it is empty; the shot's own frames right after the trigger breaks
  const GD = LG_GUN_DEF[A.key], lock = GD && GD.act && GD.act.lock, empty = lock && a.mag && a.mag[a.slot] <= 0 && st !== 'reload';
  ctx.hold = !!empty; const sub = empty ? 'e' : '';
  const u = a.fireT == null ? 9 : (G.time || 0) - a.fireT;
  if (st === 'ready' && u >= 0 && u < LGV_SHOT_T) return { st: 'shot', n: 5, i: Math.min(4, Math.floor(u / LGV_SHOT_T * 5)), ctx: ctx, sub: sub };
  switch (st) {
    case 'ready': return { st: 'ready', n: 6, i: breath, ctx: ctx, sub: sub };
    case 'raise': return { st: 'raise', n: 4, i: Math.min(3, Math.floor(k * 4)), ctx: ctx };
    case 'lower': return { st: 'raise', n: 4, i: Math.min(3, Math.floor((1 - k) * 4)), ctx: ctx };
    case 'sprint': return { st: 'sprint', n: 8, i: Math.floor((B.ph % 1) * 8), ctx: ctx };
    case 'sprintOut': return { st: 'sprintOut', n: 4, i: Math.min(3, Math.floor(k * 4)), ctx: ctx };
    case 'reload': { const n = R.kind === 'tube' ? 10 : 20; return { st: 'reload', n: n, i: Math.floor(k * n), ctx: ctx, sub: (R.kind || '') + (a.rk || '') + (a.keep ? 'k' : '') }; }
    case 'swapOut': return { st: 'swapOut', n: 8, i: Math.floor(k * 8), ctx: ctx };
    case 'swapIn': return { st: 'swapIn', n: 8, i: Math.floor(k * 8), ctx: ctx };
    case 'inspect': return { st: 'inspect', n: 8, i: Math.floor(k * 8), ctx: ctx };
    case 'knife': { ctx.km = a.km || 'stab'; ctx.fam = 'p'; return { st: 'knife', n: 6, i: Math.floor(k * 6), ctx: ctx, sub: ctx.km }; }   // (1.9.994: the knife's moves)
  }
  return { st: 'relaxed', n: 6, i: breath, ctx: ctx, sub: sub };
}
// what a frame's pose solved to: the muzzle and the head in sprite units; how far the hands were from their grips
function lgvMeasure(r, fam, gun) {
  lgGunSet(r.gp, r.gs); try { return lgvMeasure1(r, fam, gun); } finally { lgGunSet(null, null); }   // (this frame's guns and their sockets, then back)
}
function lgvMeasure1(r, fam, gun) {
  const W = r.W, P = r.P, o = r.o;
  const mi = fam === 'p' ? LGB.pistol : LGB.carbine, mo = lgSockFor(fam === 'p' ? 'pistol' : 'carbine', 'muz'), MW = W.subarray(mi * 16, mi * 16 + 16), mz = lgPt(MW, mo[0], mo[1], mo[2]);
  o.mx = mz[0] / LG_UNIT; o.my = -mz[1] / LG_UNIT;
  const h = LGB.head * 16; o.hx = W[h + 12] / LG_UNIT; o.hy = -W[h + 13] / LG_UNIT;
  // 1.9.996: the weapon light: where its lens is and which way the barrel really points, seen from above (the beam starts
  // at the light and goes along the bore, whatever the head is doing); a gun without a light throws it from the muzzle
  { const gk = fam === 'p' ? r.gs : r.gp, D = gk && LG_GUN_DEF[gk], lp = D && D.light ? D.light : null, lz = lp ? lgPt(MW, lp[0], lp[1], lp[2]) : mz;
    o.lx = lz[0] / LG_UNIT; o.ly = -lz[1] / LG_UNIT;
    const x0 = (lp ? lp[0] : mo[0]), f = lgPt(MW, x0, 0, 0), b = lgPt(MW, x0 - 0.3, 0, 0), dx = f[0] - b[0], dy = f[1] - b[1];
    o.ba = Math.hypot(dx, dy) > 0.02 ? Math.atan2(-dy, dx) : 0; o.bd = clamp(Math.hypot(dx, dy) / 0.3, 0, 1); }
  // learning: the support hand on the gun -- did it get there? (gun is 'm4a1:ready': each gun in each posture)
  if (gun && P.ik.handL && P.ik.handL.on) {
    const PM = W.subarray(LGB[P.ik.handL.on] * 16, LGB[P.ik.handL.on] * 16 + 16), S = lgSockFor(P.ik.handL.on, 'gripL'), Gm = lgMul(lgM4(), PM, S), hl = LGB.handL * 16;
    const miss = Math.hypot(W[hl + 12] - Gm[12], W[hl + 13] - Gm[13], W[hl + 14] - Gm[14]);
    LGV.miss[gun] = miss;
    const tries = LGV.tries[gun] || 0;
    if (miss > 0.006 && tries < 5 && !LGV.stuck[gun]) {
      if (!tries) LGV.first[gun] = miss;
      const parts = gun.split(':'), drop = () => { for (const key of Array.from(LG.sprites.keys())) if (key.indexOf('|v2|up|') > 0 && key.indexOf('|' + parts[1] + fam + parts[0]) > 0) LG.sprites.delete(key); };
      if (tries >= 2 && miss > LGV.first[gun] * 0.7) {
        // it tried and the hand is no closer: that posture's miss is not about where the gun sits; put it back as it was
        delete LGV.fix[gun]; LGV.stuck[gun] = 1; drop();
      } else {
        // bring that gun in toward the shoulder by most of the miss, and paint that posture again
        const f = LGV.fix[gun] || (LGV.fix[gun] = [0, 0, 0]); f[0] -= miss * 0.8; f[2] -= miss * 0.25; LGV.tries[gun] = tries + 1; LGV.learnt++; drop();
      }
      lgvFixSave();
    }
  }
  return o;
}
// what it learnt about the grips is kept on the device (a new version of the gun models starts it over)
const LGV_FIXV = 1;
function lgvFixLoad() {
  if (LGV.loaded) return; LGV.loaded = 1;
  try { const s = typeof store !== 'undefined' ? store.get('zc_lgvFix', null) : null; if (s && s.v === LGV_FIXV) { Object.assign(LGV.fix, s.fix || {}); Object.assign(LGV.stuck, s.stuck || {}); Object.assign(LGV.tries, s.tries || {}); } } catch (x) { }
}
function lgvFixSave() { clearTimeout(LGV.saveT); LGV.saveT = setTimeout(() => { try { store.set('zc_lgvFix', { v: LGV_FIXV, fix: LGV.fix, stuck: LGV.stuck, tries: LGV.tries }); } catch (x) { } }, 2000); }
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
  if (ctx.gun) ctx.fk = ctx.gun + ':' + st;
  const f = P => { (LGV_UP[st] || LGV_UP.relaxed)(P, k, ctx); P.mask = 1; };
  const r = lgvPaint(lgId, mk, f, P => P.pistol.at === 'holster' ? LGV_M.upperNoP : LGV_M.upper, LGV_BOX.up, px, null);
  if (!r) return null;
  const o = lgvMeasure(r, ctx.fam, ctx.fk || ''); o.look = ctx.look || 0; return o;
}
/* ---------- drawing the survivor ---------- */
function lgvDraw(p, ctx2) {
  if (!LGV.on || !LG_ANIM_BY.idle_ready || !LG_MAKERS.operator || typeof lgSockFor !== 'function') return null;
  if (!LGV.loaded) lgvFixLoad();
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
  // legs (the holstered pistol on the hip goes with them while the long gun is out): 1.9.996, LOCO's gait at the speed's
  // bucket, the steps' direction (straight, or 45 degrees to either side of the hips) and forward or back; a change of
  // gait cross-fades over a few frames instead of jumping
  const holP = fam === 'c' ? 1 : 0, Lo = B.loco || {};
  if (!B.legs) B.legs = { key: '', prev: '', fade: 0, t: G.time || 0 };
  // (the steps' direction with a little hysteresis, so sweeping the aim while moving does not flicker between series)
  const moving = B.clip === 'loco' || B.clip === 'turn', vb = moving ? (B.clip === 'turn' ? 1.3 : (B.vb || 1.3)) : 0, ad = Math.abs(Lo.dir || 0);
  if (!moving) B.dirB = 0; else if (ad > 0.45) B.dirB = Lo.dir > 0 ? 1 : -1; else if (ad < 0.33) B.dirB = 0;
  const dirB = moving ? (B.dirB || 0) : 0, bk = moving && Lo.back ? 1 : 0;
  const nL = moving ? LGV_LEGN : 1, iL = moving ? Math.floor(B.ph * nL) % nL : 0, lkey = moving ? 'loco|' + vb + '|' + dirB + '|' + bk : 'stand';
  const LS = B.legs, now = G.time || 0, ldt = clamp(now - LS.t, 0, 0.1); LS.t = now;
  if (lkey !== LS.key) { LS.prev = LS.key; LS.fade = LS.key ? 1 : 0; LS.key = lkey; }
  LS.fade = Math.max(0, LS.fade - ldt / 0.16);
  const legLayer = (key, i, n) => lgvLayer('legs' + holP, lgId, mk, key, i, n, px, () => {
    const parts = key.split('|'), r = lgvPaint(lgId, mk, P => {
      if (parts[0] === 'loco') locoPose(P, i / n, { v: +parts[1], dir: +parts[2] * 0.785, back: parts[3] === '1', load: 0.3, arms: 'hold' });
      else { lgEvalClip(LG_ANIM_BY.idle_ready, 0, P, { run: true, wc: 'r' }); }
      P.pistol.at = 'holster';
    }, holP ? LGV_M.legsH : LGV_M.legs, LGV_BOX.legs, px, null);
    return r ? r.o : null;
  });
  const legs = legLayer(lkey, iL, nL), legsPrev = LS.fade > 0 && LS.prev ? legLayer(LS.prev, LS.prev === 'stand' ? 0 : Math.floor(B.ph * LGV_LEGN) % LGV_LEGN, LS.prev === 'stand' ? 1 : LGV_LEGN) : null;
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
  ctx2.save(); ctx2.rotate(dL); if (legsPrev) { img(legsPrev, legsPrev.box); ctx2.globalAlpha = 1 - LS.fade; } img(legs, legs.box); ctx2.globalAlpha = 1; ctx2.restore();
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
  if (up.lx != null) { p.lgLx = ox + up.lx * cr - up.ly * sr; p.lgLy = oy + up.lx * sr + up.ly * cr; p.lgBeam = aim + rot + (up.ba || 0); p.lgBeamD = up.bd == null ? 1 : up.bd; }
  return { mx: mxr, my: myr };
}
// the run's frames painted ahead, a few at a time (the main menu, the loader): the loadout's relaxed, ready and walk
function lgvWarm(n) {
  if (!LGV.on || SET.legend === 'none' || !LG.atlas || !LG.atlas.done || typeof armsLoad !== 'function') return 0;
  const W0 = armsPrimary(), W1 = armsSecondary(), fake = { arm: { w: [W0, W1] }, weapon: W0, lc: SET.legendClass || 'attack' }, lgId = SET.legend || 'operator', mk = lgvModelKey(fake), px = SPR * PK;
  const ctx = { run: true, fam: 'c', gun: W0.arms.key, kind: W0.arms.reload.kind, rk: 'tac', keep: false, t: 0 };
  const jobs = [['up', 'relaxed', 6], ['up', 'ready', 6], ['up', 'raise', 4], ['legs1', 'stand', 1], ['legs1', 'loco|4.8|0|0', LGV_LEGN], ['head', 'h', 2]];
  let made = 0;
  for (const [kind, st, cnt] of jobs) for (let i = 0; i < cnt && made < n; i++) {
    const sk = kind === 'up' ? st + 'c' + W0.arms.key : st, base = lgvBase(kind, lgId, mk, sk, px); if (LG.sprites.has(base + i)) continue;
    LG.spriteBudget = 1;
    if (kind === 'up') lgvLayer('up', lgId, mk, sk, i, cnt, px, () => lgvMakeUp(lgId, mk, st, i, cnt, ctx, px));
    else if (kind === 'head') lgvLayer('head', lgId, mk, 'h', i, 2, px, () => { const r = lgvPaint(lgId, mk, P => { lgBase(P, { crouch: 0.04, lean: 0.12 }); P.mask = 1; if (i) lgJadd(P, 'head', 0, 0.5, 0); }, LGV_M.head, LGV_BOX.head, px, LGB.head); return r ? r.o : null; });
    else { const parts = st.split('|'); lgvLayer(kind, lgId, mk, st, i, cnt, px, () => { const r = lgvPaint(lgId, mk, P => { if (parts[0] === 'loco') locoPose(P, i / cnt, { v: +parts[1], dir: +parts[2] * 0.785, back: parts[3] === '1', load: 0.3, arms: 'hold' }); else lgEvalClip(LG_ANIM_BY.idle_ready, 0, P, { run: true, wc: 'r' }); P.pistol.at = 'holster'; }, LGV_M.legsH, LGV_BOX.legs, px, null); return r ? r.o : null; }); }
    made++;
  }
  // 1.9.994: the knife's first moves with the sidearm (stick, two-step, the point-blank shot), so the first chain is not
  // drawn from the nearest frame while its own are painted
  const kc = { run: true, fam: 'p', gun: W1.arms.key, kind: W1.arms.reload.kind, rk: 'tac', keep: false, t: 0 };
  for (const km of ['stab', 'neck', 'pb']) for (let i = 0; i < 6 && made < n; i++) {
    const sk = 'knife' + 'p' + W1.arms.key + km, base = lgvBase('up', lgId, mk, sk, px); if (LG.sprites.has(base + i)) continue;
    LG.spriteBudget = 1; const c2 = Object.assign({}, kc, { km: km });
    lgvLayer('up', lgId, mk, sk, i, 6, px, () => lgvMakeUp(lgId, mk, 'knife', i, 6, c2, px)); made++;
  }
  return made;
}

/* ---------- the ARMS moves in the Legends viewer (category Arms): the same choreography, standing in the studio ---------- */
// (with the studio's generic carbine and pistol; in a run each gun has its own model and grips)
function lgvClip(id, name, dur, loop, desc, st, ctx0, legs) {
  lgClip(id, name, 'Arms', dur, loop, 'ARMS handling references (README > what was studied)', desc, (P, t, ctx, a) => {
    const c = Object.assign({ run: false, fam: 'c', gun: null, kind: 'ar', rk: 'tac', keep: false, t: t }, ctx0);
    // (1.9.994: in the studio, with the guns he carries: their own postures and fitted grips; the armory's special
    // reload takes the technique and the time from the gun itself)
    let gd = dur;
    if (ctx0.slot) {
      c.fam = ctx0.slot; const g = ctx && (c.fam === 'p' ? ctx.gs : (ctx.gp || ctx.gun)), A = g && typeof ARMS_BY !== 'undefined' && ARMS_BY[g] ? ARMS_BY[g].arms : null;
      if (A && LG_GUN_DEF[g] && LG_GUN_DEF[g].fam === c.fam) { c.gun = g; c.kind = A.reload.kind; gd = A.reload.empty; } else { c.kind = c.fam === 'p' ? 'pistol' : 'ar'; gd = c.fam === 'p' ? 1.85 : 2.55; }
    } else if (ctx) { const g = c.fam === 'p' ? ctx.gs : (ctx.gp || ctx.gun); if (g && LG_GUN_DEF[g] && LG_GUN_DEF[g].fam === c.fam) c.gun = g; }
    const k = loop ? (t / dur) % 1 : clamp(t / gd, 0, 1);
    if (st === 'dodge') { lgvRoll(P, k, c); return; }
    (LGV_UP[st] || LGV_UP.relaxed)(P, k, c);
    if (legs === 'run') lgGait(P, k, { stride: 2.9, st: 0.38, lift: 0.22, crouch: 0.08, bob: 0.05, lean: 0.25, heel: 1, run: true });
    else lgStance(P, 0.13, 0.12, 0.14);
    P.mask = 1; P.glow = 1;
  });
}
lgvClip('ar_relaxed', 'Low ready', 4, true, 'Relaxed: stock in the shoulder pocket, the muzzle down and forward, the shoulders up, breathing; the eyes do the work.', 'relaxed', {});
lgvClip('ar_raise', 'Ready up', 0.5, false, 'The gun comes up from low ready to the eye in its ready time; the shoulders roll forward, the knees soften: the focused posture.', 'raise', {});
lgvClip('ar_ready', 'On target', 3, true, 'Shouldered, cheek on the stock, elbows down, the weight forward; the muzzle barely moves with the breath.', 'ready', { trigger: true });
lgvClip('ar_sprint', 'Sprint carry', 0.56, true, 'Sprinting with a long gun: off target, carried across the body muzzle-down with both hands; it cannot fire until it comes back up.', 'sprint', {}, 'run');
lgvClip('ar_speed', 'Speed reload', 2.55, false, 'On empty: the magazine falls free as the hand goes to the placard, the fresh one seated with a tug, the palm slaps the bolt catch.', 'reload', { rk: 'empty' });
lgvClip('ar_tac', 'Tactical reload', 2.05, false, 'With nothing close and rounds left: the partial magazine stripped and stowed in the dump pouch, a fresh one in; thirty plus one.', 'reload', { keep: true });
lgvClip('ak_rock', 'AK hook and rock', 2.85, false, 'The fresh magazine knocks the empty out, hooks at the front lip and rocks back until it clicks; on empty, the hand under the gun racks the handle.', 'reload', { kind: 'ak', rk: 'empty' });
lgvClip('scar_rack', 'Side-handle reload', 3.0, false, 'A battle rifle on empty: magazine out, fresh one in, then the support hand finds the reciprocating handle on the left and runs it.', 'reload', { kind: 'scar', rk: 'empty' });
lgvClip('p_reload', 'Pistol slide-lock reload', 1.85, false, 'The pistol pulled into the workspace, the empty drops, a fresh one from the belt seated with a slap, the slide released overhand.', 'reload', { fam: 'p', kind: 'pistol', rk: 'empty' });
lgvClip('p_draw', 'Draw', 0.62, false, 'From the holster: grip, clear, rotate at the hip, meet the support hand at the chest, press out.', 'swapIn', { fam: 'p' });
lgvClip('ar_sling', 'Long gun to the sling', 0.5, false, 'The carbine up past the left shoulder and onto the sling across the back, the hands free for the pistol.', 'swapOut', {});
lgvClip('ar_check', 'Press check', 1.3, false, 'A full gun and nobody close: the support hand eases the handle back an inch, a look at the brass, home.', 'inspect', {});
// 1.9.994: the knife's ten combos (BLADE), as he does them in a run: the blade in the left hand, the sidearm in the right
lgvClip('kn_stick', 'Knife: Stick', 0.62, false, 'Combo 1 (knife): a short thrust from the guard into the gut, the hips behind it.', 'knife', { km: 'stab', fam: 'p' });
lgvClip('kn_two', 'Knife: Two-Step', 0.62, false, 'Combo 2 (knife, knife): the second one high, a hammer stab at the neck.', 'knife', { km: 'neck', fam: 'p' });
lgvClip('kn_kks', 'Knife: Knife, Knife, Shot', 0.55, false, 'Combo 3: the knife back to the guard and the pistol punched out past it, one round point blank.', 'knife', { km: 'pb', fam: 'p' });
lgvClip('kn_throat', 'Knife: Throat Line', 0.7, false, 'Combo 4 (after the shot, the knife): edge out, a cut across the throat, the hips doing the work.', 'knife', { km: 'slash', fam: 'p' });
lgvClip('kn_hammer', 'Knife: Hammer Down', 0.72, false, 'Combo 5: the overhand stab from high at the collar.', 'knife', { km: 'hammer', fam: 'p' });
lgvClip('kn_pair', 'Knife: Second Pair', 0.62, false, 'Combo 6: two rounds point blank into the chest.', 'knife', { km: 'pair', fam: 'p' });
lgvClip('kn_whip', 'Knife: Pistol Whip', 0.68, false, 'Combo 7 (the pistol dry): the frame of the gun in a short arc to the temple.', 'knife', { km: 'whip', fam: 'p' });
lgvClip('kn_jaw', 'Knife: Whip and Stick', 0.7, false, 'Combo 8 (after the whip, the knife): up from low under the jaw.', 'knife', { km: 'jaw', fam: 'p' });
lgvClip('kn_lunge', 'Knife: Lunge', 0.72, false, 'Combo 9: a long dash into a thrust, the whole body behind the blade.', 'knife', { km: 'lunge', fam: 'p' });
lgvClip('kn_reaper', 'Knife: Reaper', 0.85, false, 'Combo 10 (three of the dead, knife each): a spinning backhand cut that takes everything in reach.', 'knife', { km: 'reaper', fam: 'p' });
// (the legend page's armory: the special reload of whichever gun he carries; not in the list of fifty)
lgvClip('arm_special_c', 'Special reload', 3.2, false, 'The carried long gun\'s own reload, from empty.', 'reload', { slot: 'c', rk: 'empty' });
lgvClip('arm_special_p', 'Special reload (sidearm)', 3.2, false, 'The carried sidearm\'s own reload, from empty.', 'reload', { slot: 'p', rk: 'empty' });
LG_ANIM_BY.arm_special_c.hidden = true; LG_ANIM_BY.arm_special_p.hidden = true;
lgvClip('dodge_roll', 'Dodge roll', 0.46, false, 'Down over the shoulder in a tuck with the gun held in tight, and up into a crouch facing the same way; untouchable for its first part.', 'dodge', {});
