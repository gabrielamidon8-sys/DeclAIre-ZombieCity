/* ================= LEGEND animations: the Operator's fifty =================
   Every clip is a small program over time that poses the rig: keyframes for the moments that matter, a gait engine
   for the feet, weapon postures that the hands follow by reach (IK), breathing and weight shifts underneath.
   They are written from references, not copied from any one source:
   - The tactical walk (American Rifleman, "Moving with a carbine"): knees soft, the upper body leaning a little
     forward, feet a body-width apart, heel first then toe so the sights stay level; sideways it is "big step, little
     step" and the legs never cross; backing up goes toe first, then heel, slowly.
   - Turning (Primary & Secondary, "Movement with a pistol"): the weapon turns first, then the body. Holster to run;
     redraw as you slow.
   - Slicing the pie (SOFREP): stand off the wall, small side steps, weapon a touch low for a full view, never faster
     than you can see and stop.
   - Scanning (Sniper Central): the eyes lead and the head follows; pause often; glance down before a step; check the
     rear.
   - Isosceles (Wikipedia): feet shoulder-width, support foot a little forward, knees bent, shoulders ahead of the
     hips, arms extended but not locked, the support hand wrapped over the firing hand, thumbs forward.
   - Ready positions (GunMag Warehouse): low ready (arms extended, muzzle down and forward), compressed high ready
     (gun at the chest, elbows tucked, muzzle on the threat), Sul (support palm flat on the chest, the gun above it,
     muzzle down).
   - Center Axis Relock (Pew Pew Tactical): bladed stance, gun close, canted.
   - The reverse grip (Personal Defense Network): the tip out of the little-finger side, edge out; strong downward
     hammer-fist stabs, slashes across with the hips behind them.
   - Throws (O-soto-gari, O-goshi): pull them off balance, turn the hips in under theirs, lift with the hips while
     bending forward, and they land at your feet.
   The Operator's personality runs through all of it: brave (he steps toward a threat, chin level), methodical (he
   presses the chamber, tugs the glove tight, checks six), calm (slow breathing, no wasted movement). */

/* ---------- keyframes and easing ---------- */
const lgE = {
  l: k => k, io: k => k * k * (3 - 2 * k), i: k => k * k, o: k => 1 - (1 - k) * (1 - k), i3: k => k * k * k, o3: k => 1 - Math.pow(1 - k, 3),
  b: k => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }, e: k => k >= 1 ? 1 : 1 - Math.pow(2, -10 * k), s: k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
};
// keys: [[t, value, ease], ...] (value a number or an array); ease shapes the segment arriving at that key
function lgK(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i]; if (t > b[0]) continue;
    const a = keys[i - 1], k = (t - a[0]) / ((b[0] - a[0]) || 1), e = (lgE[b[2] || 'io'] || lgE.io)(k);
    if (typeof a[1] === 'number') return a[1] + (b[1] - a[1]) * e;
    const o = new Array(a[1].length); for (let j = 0; j < a[1].length; j++) o[j] = a[1][j] + (b[1][j] - a[1][j]) * e; return o;
  }
  return keys[keys.length - 1][1];
}
const lgW = (t, a, b) => clamp((t - a) / (b - a), 0, 1);           // a window 0..1 between a and b
const lgPulse = (t, a, b) => { const k = lgW(t, a, b); return Math.sin(k * Math.PI); };
const lgN1 = (t, s) => Math.sin(t * 1.7 + s) * 0.55 + Math.sin(t * 2.9 + s * 1.3) * 0.3 + Math.sin(t * 5.3 + s * 2.1) * 0.15;   // a smooth wander

/* ---------- body helpers ---------- */
function lgLookAt(P, yaw, pitch, roll) { lgJadd(P, 'neck', (roll || 0) * 0.4, (pitch || 0) * 0.4, yaw * 0.4); lgJadd(P, 'head', (roll || 0) * 0.6, (pitch || 0) * 0.6, yaw * 0.6); }
function lgPelvis(P, x, y, z, rx, ry, rz) { const i = LGB.pelvis; P.t[i * 3] = x || 0; P.t[i * 3 + 1] = y || 0; P.t[i * 3 + 2] = z || 0; lgJ(P, 'pelvis', rx || 0, ry || 0, rz || 0); }
function lgSpine(P, ry, rz, rx, k) { k = k || [0.35, 0.4, 0.25]; lgJadd(P, 'spine', (rx || 0) * k[0], ry * k[0], (rz || 0) * k[0]); lgJadd(P, 'chest', (rx || 0) * k[1], ry * k[1], (rz || 0) * k[1]); lgJadd(P, 'neck', -(rx || 0) * k[2] * 0.5, -ry * k[2], -(rz || 0) * k[2] * 0.4); }
// a free arm: pitch (negative raises it forward), out (abduction), twist, elbow flex, wrist pitch
function lgArm(P, side, pitch, out, twist, elbow, wp, wr) { lgJm(P, side, 'arm', out, pitch, twist); lgJ(P, 'fore' + side, 0, -(elbow || 0), 0); lgJm(P, side, 'hand', wr || 0, wp || 0, 0); }
function lgShrug(P, side, k, fwd) { lgJm(P, side, 'clav', k, 0, fwd || 0); }
const LG_FOOT_Z = 0.085;
// a foot by reach: position (root space; z is the lift above standing), pitch (+ toes down), yaw, toe bend
function lgFoot(P, side, x, y, lift, pitch, yaw, toe) {
  const M = lgM4(), R = lgM4(); lgRot(M, 0, 0, yaw || 0); lgRot(R, 0, pitch || 0, 0); lgMul(M, M, R);
  P.ik['foot' + side] = { sp: 'root', p: [x, y, LG_FOOT_Z + (lift || 0)], M: M, pole: [Math.cos(yaw || 0), Math.sin(yaw || 0), 0.15] };
  lgJ(P, 'toe' + side, 0, toe || 0, 0);
}
// standing feet: width, the left foot forward by fwd, turned out by out
function lgStance(P, w, fwd, out, o) { o = o || {}; w = w || 0.12; lgFoot(P, 'L', (fwd || 0) * 0.5 + (o.xl || 0), w, 0, 0, out == null ? 0.1 : out, 0); lgFoot(P, 'R', -(fwd || 0) * 0.5 + (o.xr || 0), -w, 0, 0, -(out == null ? 0.1 : out), 0); }
// breathing: chest and shoulders rise, a slow pelvis drift
function lgBreath(P, t, k, rate) { const b = Math.sin(t * TAU / (rate || 4)) * (k == null ? 1 : k); lgJadd(P, 'chest', 0, -0.012 * b, 0); lgJadd(P, 'spine', 0, -0.006 * b, 0); lgShrug(P, 'L', 0.012 * b); lgShrug(P, 'R', 0.012 * b); }
// a weapon pose in the chest's space: position, yaw, pitch (+ muzzle down), cant (+ top to the right)
function lgAimM(x, y, z, yaw, pitch, cant) { const M = lgRot(lgM4(), 0, 0, yaw || 0), Rp = lgRot(lgM4(), 0, pitch || 0, 0), Rc = lgRot(lgM4(), cant || 0, 0, 0); lgMul(M, M, Rp); lgMul(M, M, Rc); M[12] = x; M[13] = y; M[14] = z; return M; }
// named postures: [x, y, z, yaw, pitch, cant]; and elbow poles (root space)
const LG_POST = {
  low: [0.4, -0.035, -0.14, 0.0, 0.62, 0], high: [0.21, -0.035, 0.08, 0.0, 0.04, 0], sul: [0.15, -0.02, -0.04, 0.0, 1.38, 0.0], iso: [0.53, -0.01, 0.32, 0.0, 0.0, 0.0],
  car: [0.3, 0.0, 0.22, 0.0, 0.0, -0.75], cmp: [0.36, -0.035, 0.2, 0.0, 0.0, 0.0], hip: [0.27, -0.14, -0.04, 0.04, 0.05, 0.0], workspace: [0.27, -0.01, 0.1, 0.25, -0.15, -0.55],
  rlow: [0.36, -0.135, 0.16, 0.0, 0.55, 0.0], raim: [0.41, -0.125, 0.32, 0.0, 0.0, 0.0], rwork: [0.35, -0.06, 0.18, 0.3, 0.1, -0.7]
};
const LG_POLE = { R: [-0.35, -0.75, -0.6], L: [-0.35, 0.75, -0.6], Rt: [-0.1, -0.35, -1], Lt: [-0.1, 0.35, -1], Rw: [0.05, -0.85, -0.5], Lw: [0.05, 0.85, -0.5] };
function lgPost(name) { return LG_POST[name]; }
function lgPostMix(a, b, k) { const A = typeof a === 'string' ? LG_POST[a] : a, Bq = typeof b === 'string' ? LG_POST[b] : b; return A.map((v, i) => v + (Bq[i] - v) * k); }
// hold the pistol in a posture (both hands, or one): v = [x, y, z, yaw, pitch, cant]
function lgPistolAt(P, v, o) {
  o = o || {}; P.pistol.at = 'aim'; P.pistol.sp = 'chest'; P.pistol.M = lgAimM(v[0], v[1], v[2], v[3], v[4], v[5]);
  P.ik.handR = { on: 'pistol', pole: o.poleR || LG_POLE.R }; P.grip.R = o.trigger ? 'trigger' : 'pistol';
  if (!o.one) { P.ik.handL = { on: 'pistol', pole: o.poleL || LG_POLE.L }; P.grip.L = 'support'; }
}
function lgCarbineAt(P, v, o) {
  o = o || {}; P.carbine.at = 'aim'; P.carbine.sp = 'chest'; P.carbine.M = lgAimM(v[0], v[1], v[2], v[3], v[4], v[5]);
  P.ik.handR = { on: 'carbine', pole: o.poleR || [-0.2, -0.8, -0.6] }; P.grip.R = o.trigger ? 'trigger' : 'pistol';
  if (!o.one) { P.ik.handL = { on: 'carbine', pole: o.poleL || [-0.1, 0.6, -0.8] }; P.grip.L = 'cup'; }
}
// a hand to a point in the space of a bone (chest, pelvis, root...), palm turned by a rotation
function lgHandTo(P, side, sp, p, rot, pole) { const M = rot ? lgRot(lgM4(), rot[0], rot[1], rot[2]) : null; P.ik['hand' + side] = { sp: sp, p: p, M: M, pole: pole || (side === 'L' ? LG_POLE.L : LG_POLE.R) }; }
// the base pose: soft knees, a forward lean, head level, relaxed hands
function lgBase(P, o) {
  o = o || {}; lgPelvis(P, 0, 0, -(o.crouch == null ? 0.03 : o.crouch), 0, o.lean == null ? 0.02 : o.lean * 0.3, 0);
  lgJ(P, 'spine', 0, o.lean == null ? 0.05 : o.lean * 0.4, 0); lgJ(P, 'chest', 0, o.lean == null ? 0.04 : o.lean * 0.4, 0); lgJ(P, 'neck', 0, -(o.lean == null ? 0.07 : o.lean * 0.6), 0); lgJ(P, 'head', 0, -0.02, 0);
  if (o.stance !== false) lgStance(P, 0.125, 0.04, 0.12);
  lgArm(P, 'L', 0.06, 0.1, 0, 0.18, 0.05); lgArm(P, 'R', 0.06, 0.1, 0, 0.18, 0.05);
}
// the gait engine: feet by reach along the stride, heel-to-toe roll, pelvis bob, sway and counter-rotation
// o: stride (m per cycle), dir (0 forward, pi back, +pi/2 left), st (stance fraction), lift, crouch, bob, lean, w, sway, yaw, heel (+1 heel first, -1 toe first), arms (swing), run
function lgGait(P, ph, o) {
  const st = o.st || 0.62, dir = o.dir || 0, cd = Math.cos(dir), sd = Math.sin(dir), half = (o.stride || 1.3) * st / 2, lift = o.lift == null ? 0.08 : o.lift, heel = o.heel == null ? 1 : o.heel, w = o.w || 0.11;
  const lat = Math.abs(sd) > 0.7;   // strafing: the feet must not cross
  for (const [side, off, sg] of [['L', 0, 1], ['R', 0.5, -1]]) {
    const f = ((ph + off) % 1 + 1) % 1; let along, up = 0, pitch = 0, toe = 0;
    if (f < st) {
      const u = f / st; along = half - u * 2 * half;
      if (heel > 0) { pitch = u < 0.16 ? -0.24 * (1 - u / 0.16) : u > 0.7 ? (u - 0.7) / 0.3 * 0.5 : 0; toe = u > 0.7 ? -(u - 0.7) / 0.3 * 0.55 : 0; }
      else { pitch = u < 0.16 ? 0.28 * (1 - u / 0.16) : u > 0.75 ? -(u - 0.75) / 0.25 * 0.18 : 0; }
    } else {
      const u = (f - st) / (1 - st), s = u * u * (3 - 2 * u); along = -half + s * 2 * half; up = Math.sin(u * Math.PI) * lift * (o.run ? 1.3 : 1);
      pitch = heel > 0 ? lgLerp(0.42, -0.2, s) : lgLerp(-0.15, 0.2, s); toe = heel > 0 ? lgLerp(-0.3, 0, s) : 0;
    }
    let x = along * cd, y = sg * w + along * sd;
    if (lat) y = sg * (w + 0.02) + along * sd * 0.8 + (sd * sg > 0 ? 0.02 : -0.01);
    lgFoot(P, side, x + (o.fwd || 0), y, up, pitch, sg * (o.out == null ? 0.08 : o.out), toe);
  }
  // the body: lowest just after each heel strikes, highest over the standing leg
  const bob = o.bob == null ? 0.02 : o.bob, sway = o.sway == null ? 0.015 : o.sway, yw = o.yaw == null ? 0.06 : o.yaw;
  const z = -(o.crouch || 0.04) - bob * Math.cos(4 * Math.PI * (ph - 0.06)) - bob, y = sway * Math.sin(TAU * ph), py = yw * Math.sin(TAU * (ph + 0.25)) * (lat ? 0.3 : 1) * Math.cos(dir);
  lgPelvis(P, (o.lean || 0) * 0.05, y, z, -y * 1.2, (o.lean || 0) * 0.3, py);
  lgJ(P, 'spine', 0, (o.lean || 0) * 0.35, -py * 0.5); lgJ(P, 'chest', 0, (o.lean || 0) * 0.35, -py * 0.55); lgJ(P, 'neck', 0, -(o.lean || 0) * 0.55, 0); lgJ(P, 'head', 0, -(o.lean || 0) * 0.2, 0);
  if (o.arms) { const a = o.arms, s = Math.sin(TAU * ph); lgArm(P, 'L', a * s * (o.run ? 1 : 0.6) - (o.run ? 0.2 : 0), 0.12, 0, (o.run ? 1.2 : 0.25) + (o.run ? 0.3 * s : 0.1), 0.1); lgArm(P, 'R', -a * s * (o.run ? 1 : 0.6) - (o.run ? 0.2 : 0), 0.12, 0, (o.run ? 1.2 : 0.25) - (o.run ? 0.3 * s : 0.1), 0.1); }
  return { bobZ: z, py: py };
}
// the weapon a clip uses when it is drawn in a run (top-down, aiming where the player aims): pistol or long gun
function lgRunAim(P, ctx, t, sway) {
  const s = sway == null ? 1 : sway, v = (ctx.wc === 'r' ? LG_POST.raim : LG_POST.cmp).slice(); v[3] += lgN1(t * 0.7, 1) * 0.01 * s; v[4] += lgN1(t * 0.6, 2) * 0.01 * s;
  if (ctx.wc === 'r') lgCarbineAt(P, v); else lgPistolAt(P, v);
}
function lgClip(id, name, cat, dur, loop, ref, desc, fn, ev, o) { lgAnimDef(Object.assign({ id: id, name: name, cat: cat, dur: dur, loop: loop, ref: ref, desc: desc, fn: fn, ev: ev || [] }, o || {})); }
const LG_SRC = {
  walk: 'American Rifleman: Moving with a carbine', pistol: 'Primary & Secondary: Movement with a pistol', pie: 'SOFREP: How to slice the pie', scan: 'Sniper Central: Scanning while stalking',
  iso: 'Isosceles stance (Wikipedia)', ready: 'GunMag Warehouse: Ready positions', car: 'Pew Pew Tactical: Center Axis Relock', knife: 'Personal Defense Network: knife grips',
  osoto: 'O-soto-gari (Wikipedia)', ogoshi: 'O-goshi (Wikipedia)', merc: 'Plate carrier and mercenary kit references'
};

/* ---------- 1-10: moving ---------- */
lgClip('walk_tac', 'Tactical walk', 'Moving', 1.15, true, LG_SRC.walk, 'Heel first, then toe; knees soft and shoulders over the toes so the pistol stays level at low ready. The eyes keep working the alley.', (P, t, ctx, a) => {
  const ph = t / a.dur; lgGait(P, ph, { stride: 1.25, st: 0.63, lift: 0.075, crouch: 0.055, bob: 0.008, lean: 0.14, sway: 0.012, yaw: 0.045, heel: 1 });
  if (ctx.run) lgRunAim(P, ctx, t); else { const v = LG_POST.low.slice(); v[4] -= 0.05; lgPistolAt(P, v, { poleR: LG_POLE.Rt, poleL: LG_POLE.Lt }); lgLookAt(P, Math.sin(t / a.dur * Math.PI) * 0.3 - 0.15, 0.04); }
}, [[0.0, 'stepL'], [0.575, 'stepR']]);
lgClip('patrol', 'Patrol saunter', 'Moving', 1.25, true, LG_SRC.merc, 'The mercenary in him: pistol hanging easy in one hand, the other arm swinging, shoulders loose and chin up. Confident, not careless.', (P, t, ctx, a) => {
  const ph = t / a.dur; lgGait(P, ph, { stride: 1.45, st: 0.62, lift: 0.08, crouch: 0.02, bob: 0.024, lean: 0.03, sway: 0.022, yaw: 0.12, heel: 1, arms: 0.35 });
  if (ctx.run) { lgRunAim(P, ctx, t); return; }
  P.pistol.at = 'handR'; P.grip.R = 'pistol'; lgArm(P, 'R', 0.12 + Math.sin(TAU * ph) * 0.12, 0.12, -0.25, 0.25, -0.35);
  lgSpine(P, -0.04, 0, 0); lgLookAt(P, Math.sin(t * 0.9) * 0.2, -0.06);
}, [[0.0, 'stepL'], [0.625, 'stepR']]);
lgClip('jog', 'Jog', 'Moving', 0.78, true, LG_SRC.ready, 'A measured jog at compressed high ready: the gun tucked to the chest, muzzle level, ready to punch out.', (P, t, ctx, a) => {
  const ph = t / a.dur; lgGait(P, ph, { stride: 1.95, st: 0.46, lift: 0.13, crouch: 0.06, bob: 0.03, lean: 0.17, sway: 0.016, yaw: 0.08, heel: 1, run: true });
  if (ctx.run) lgRunAim(P, ctx, t); else { lgPistolAt(P, LG_POST.high, { poleR: LG_POLE.Rt, poleL: LG_POLE.Lt }); }
}, [[0.0, 'stepL'], [0.39, 'stepR']]);
lgClip('run', 'Run', 'Moving', 0.68, true, LG_SRC.ready, 'Running at Sul: support palm flat on the chest, the pistol above it pointing down, so nothing in front of him is ever covered by the muzzle.', (P, t, ctx, a) => {
  const ph = t / a.dur; lgGait(P, ph, { stride: 2.65, st: 0.4, lift: 0.19, crouch: 0.07, bob: 0.045, lean: 0.23, sway: 0.016, yaw: 0.11, heel: 1, run: true });
  if (ctx.run) { lgRunAim(P, ctx, t, 2); return; }
  lgPistolAt(P, LG_POST.sul, { one: true, poleR: LG_POLE.Rt }); lgHandTo(P, 'L', 'chest', [0.13, 0.015, 0.02], [0, 0.0, 0.2], LG_POLE.Lt); P.grip.L = 'open';
}, [[0.0, 'stepL'], [0.34, 'stepR']]);
lgClip('sprint', 'Sprint', 'Moving', 0.56, true, LG_SRC.pistol, 'Gun holstered to run, as the references teach: full arm drive, long stride, body pitched into it.', (P, t, ctx, a) => {
  const ph = t / a.dur; lgGait(P, ph, { stride: 3.4, st: 0.34, lift: 0.27, crouch: 0.08, bob: 0.055, lean: 0.33, sway: 0.012, yaw: 0.14, heel: 1, run: true, arms: 0.9 });
  lgLookAt(P, 0, -0.12);
}, [[0.0, 'stepL'], [0.28, 'stepR']]);
lgClip('crouch_walk', 'Crouch walk', 'Moving', 1.35, true, LG_SRC.walk, 'Low and smooth under a window line: knees deep, short heel-to-toe steps, the pistol at compressed high ready.', (P, t, ctx, a) => {
  const ph = t / a.dur; lgGait(P, ph, { stride: 0.95, st: 0.66, lift: 0.07, crouch: 0.3, bob: 0.008, lean: 0.36, sway: 0.02, yaw: 0.05, heel: 1, w: 0.14 });
  if (ctx.run) lgRunAim(P, ctx, t); else lgPistolAt(P, LG_POST.high, { poleR: LG_POLE.Rt, poleL: LG_POLE.Lt });
  lgLookAt(P, Math.sin(t * 1.1) * 0.18, -0.12);
}, [[0.0, 'stepL'], [0.675, 'stepR']]);
lgClip('strafe_l', 'Strafe left', 'Moving', 1.0, true, LG_SRC.walk, 'Big step, little step: the left foot leads, the right follows half a step, the legs never cross and the sights never leave the target.', (P, t, ctx, a) => {
  const ph = t / a.dur; lgGait(P, ph, { stride: 0.72, st: 0.6, lift: 0.06, crouch: 0.07, bob: 0.008, lean: 0.12, dir: Math.PI / 2, w: 0.13, out: 0.12 });
  if (ctx.run) lgRunAim(P, ctx, t); else lgPistolAt(P, LG_POST.iso);
}, [[0.0, 'stepL'], [0.5, 'stepR']]);
lgClip('strafe_r', 'Strafe right', 'Moving', 1.0, true, LG_SRC.walk, 'The same to the right: the right foot leads, the left closes, hips stay square and the isosceles holds.', (P, t, ctx, a) => {
  const ph = t / a.dur; lgGait(P, ph, { stride: 0.72, st: 0.6, lift: 0.06, crouch: 0.07, bob: 0.008, lean: 0.12, dir: -Math.PI / 2, w: 0.13, out: 0.12 });
  if (ctx.run) lgRunAim(P, ctx, t); else lgPistolAt(P, LG_POST.iso);
}, [[0.0, 'stepR'], [0.5, 'stepL']]);
lgClip('backpedal', 'Backing up', 'Moving', 1.25, true, LG_SRC.walk, 'Retreat only with a reason, and slowly: toe first so it can feel for what is behind him, then the heel, eyes and muzzle on the threat.', (P, t, ctx, a) => {
  const ph = t / a.dur; lgGait(P, ph, { stride: 0.82, st: 0.66, lift: 0.055, crouch: 0.07, bob: 0.006, lean: 0.16, dir: Math.PI, heel: -1, sway: 0.012, yaw: 0.04 });
  if (ctx.run) lgRunAim(P, ctx, t); else lgPistolAt(P, LG_POST.iso);
}, [[0.0, 'stepL'], [0.625, 'stepR']]);
lgClip('pie', 'Slice the pie', 'Moving', 3.2, true, LG_SRC.pie, 'Working a corner a slice at a time: off the wall, little side steps, the muzzle a touch low for a full view, the upper body pivoting around the apex.', (P, t, ctx, a) => {
  const u = t / a.dur, sweep = Math.sin(u * TAU - Math.PI / 2) * 0.5 + 0.5;
  lgGait(P, (t * 1.6) % 1, { stride: 0.28, st: 0.62, lift: 0.035, crouch: 0.08, bob: 0.004, lean: 0.12, dir: Math.PI / 2 * (u < 0.5 ? 1 : -1), w: 0.13, out: 0.14, sway: 0.006 });
  const v = LG_POST.iso.slice(); v[4] = 0.12; lgPistolAt(P, v);
  lgSpine(P, 0, lgLerp(-0.15, 0.55, sweep) * 0.7, 0); lgPelvis(P, 0, 0, -0.08, 0, 0.05, lgLerp(-0.15, 0.55, sweep) * 0.3); lgLookAt(P, lgLerp(-0.05, 0.12, sweep), 0.05);
}, [[0.0, 'stepL'], [0.31, 'stepR'], [0.62, 'stepL'], [0.93, 'stepR']]);

/* ---------- 11-18: standing ---------- */
lgClip('idle_ready', 'Ready stance', 'Standing', 4.0, true, LG_SRC.ready, 'Compressed high ready and slow breathing: four seconds a breath, weight drifting from foot to foot, the eyes never still.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.04, lean: 0.12, stance: false }); lgStance(P, 0.13, 0.12, 0.14);
  const sh = Math.sin(t * TAU / a.dur) * 0.012; lgPelvis(P, 0, sh, -0.04 - Math.abs(sh) * 0.3, -sh * 1.5, 0.04, 0.02);
  lgBreath(P, t, 1, a.dur);
  if (ctx.run) lgRunAim(P, ctx, t, 0.6); else { const v = LG_POST.high.slice(); v[4] += Math.sin(t * TAU / a.dur) * 0.015; lgPistolAt(P, v, { poleR: LG_POLE.Rt, poleL: LG_POLE.Lt }); }
  lgLookAt(P, lgN1(t * 0.35, 3) * 0.18, lgN1(t * 0.3, 7) * 0.04);
});
lgClip('idle_scan', 'Scan', 'Standing', 6.0, true, LG_SRC.scan, 'Sectors, left to right and back: the eyes lead, the head follows and pauses, a glance down at the ground before a step, then the rear.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.045, lean: 0.12, stance: false }); lgStance(P, 0.13, 0.1, 0.12); lgBreath(P, t, 0.8, 3.6);
  const yaw = lgK(t, [[0, 0], [0.5, -0.55, 'o'], [1.2, -0.55], [1.6, -0.18, 'o'], [2.2, -0.18], [2.6, 0.32, 'o'], [3.2, 0.32], [3.6, 0.72, 'o'], [4.3, 0.72], [4.7, 0.05, 'io'], [5.3, 0.05], [6, 0]]);
  const pit = lgK(t, [[0, 0], [4.7, 0], [4.9, 0.32, 'o'], [5.3, 0.32], [5.6, 0, 'io']]);
  lgSpine(P, 0, yaw * 0.25, 0); lgLookAt(P, yaw * 0.75, pit);
  const v = LG_POST.low.slice(); v[3] = yaw * 0.25; lgPistolAt(P, v, { poleR: LG_POLE.Rt, poleL: LG_POLE.Lt });
});
lgClip('check_six', 'Check six', 'Standing', 2.6, false, LG_SRC.scan, 'A look over the right shoulder at what is behind: hips, spine and head turn together while the pistol stays tucked at Sul.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.05, lean: 0.08, stance: false }); lgStance(P, 0.14, 0.06, 0.15);
  const k = lgK(t, [[0, 0], [0.55, 1, 'o3'], [1.65, 1], [2.3, 0, 'io']]);
  lgPelvis(P, 0, 0, -0.05, 0, 0.02, -0.25 * k); lgSpine(P, 0.02, -0.65 * k, 0.05 * k); lgLookAt(P, -1.1 * k, 0.05 * k, 0.08 * k);
  lgPistolAt(P, LG_POST.sul, { one: true, poleR: LG_POLE.Rt }); lgHandTo(P, 'L', 'chest', [0.13, 0.015, 0.02], [0, 0, 0.2], LG_POLE.Lt); P.grip.L = 'open';
}, [[0.15, 'cloth'], [1.75, 'cloth']]);
lgClip('glove_tug', 'Glove tug', 'Standing', 2.6, false, LG_SRC.merc, 'Pistol holstered, he pulls the right glove tight at the cuff, flexes the fingers once and settles it. Methodical, every time.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.035, lean: 0.06, stance: false }); lgStance(P, 0.13, 0.04, 0.12); lgBreath(P, t, 0.7, 3);
  const up = lgK(t, [[0, 0], [0.45, 1, 'o3'], [1.9, 1], [2.5, 0, 'io']]), tug = lgPulse(t, 0.95, 1.25) - lgPulse(t, 1.25, 1.4) * 0.3;
  if (up > 0.01) {
    lgHandTo(P, 'R', 'chest', [lgLerp(0.02, 0.33, up), lgLerp(-0.22, -0.06, up), lgLerp(-0.52, -0.12, up)], [lgLerp(0, 1.5, up), lgLerp(0, 0.2, up), 0], LG_POLE.Rt);
    lgHandTo(P, 'L', 'chest', [lgLerp(0.02, 0.27 - tug * 0.04, up), lgLerp(0.22, -0.035, up), lgLerp(-0.52, -0.13, up)], [lgLerp(0, -1.4, up), 0.3 * up, 0.4 * up], LG_POLE.Lt);
  }
  P.grip.L = up > 0.5 ? 'fist' : 'relax'; P.grip.R = t > 1.45 && t < 1.85 ? (t < 1.65 ? 'open' : 'fist') : 'relax';
  lgLookAt(P, -0.15 * up, 0.42 * up);
}, [[0.4, 'cloth'], [1.0, 'tug'], [1.7, 'cloth']]);
lgClip('press_check', 'Press check', 'Standing', 2.3, false, LG_SRC.ready, 'He eases the slide back a few millimetres, tips his head to see brass in the chamber, lets it go and taps it home.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.04, lean: 0.1, stance: false }); lgStance(P, 0.13, 0.1, 0.13); lgBreath(P, t, 0.6, 3);
  const k = lgK(t, [[0, 0], [0.4, 1, 'o3'], [1.9, 1], [2.3, 0, 'io']]);
  const v = lgPostMix('high', 'workspace', k); lgPistolAt(P, v, { one: true, poleR: LG_POLE.Rt });
  P.pistol.slide = lgK(t, [[0, 0], [0.75, 0], [0.95, 0.28, 'o'], [1.35, 0.28], [1.45, 0, 'i']]);
  if (k > 0.05) { lgHandTo(P, 'L', 'pistol', [0.13, 0.0, 0.03], [0.0, 1.2, -0.3], LG_POLE.Lt); P.grip.L = 'cup'; } else { P.ik.handL = { on: 'pistol', pole: LG_POLE.Lt }; P.grip.L = 'support'; }
  lgLookAt(P, 0.15 * k, 0.35 * k, -0.2 * lgPulse(t, 0.85, 1.45));
}, [[0.9, 'slideBack'], [1.45, 'slideHome'], [1.6, 'tap']]);
lgClip('neck_roll', 'Neck roll', 'Standing', 3.0, false, LG_SRC.merc, 'Loosening up before going in: the head rolls round, the shoulders roll back once. Easy, unhurried, brave.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.03, lean: 0.04, stance: false }); lgStance(P, 0.14, 0.02, 0.14);
  const r = lgW(t, 0.2, 2.4), ang = r * TAU, amp = Math.sin(r * Math.PI);
  lgLookAt(P, Math.sin(ang) * 0.25 * amp, -Math.cos(ang) * 0.3 * amp + 0.05, Math.sin(ang) * 0.35 * amp);
  const sh = lgPulse(t, 1.6, 2.6); lgShrug(P, 'L', 0.12 * sh, -0.1 * sh); lgShrug(P, 'R', 0.12 * sh, -0.1 * sh);
  lgPistolAt(P, LG_POST.sul, { one: true, poleR: LG_POLE.Rt }); lgArm(P, 'L', 0.05, 0.1, 0, 0.2, 0.05);
}, [[0.5, 'cloth'], [1.8, 'cloth']]);
lgClip('rain_gaze', 'Rain gaze', 'Standing', 3.8, false, LG_SRC.merc, 'He tips his head back into the rain, lets it hit the mask, breathes in deep, and comes back down ready.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.03, lean: 0.06, stance: false }); lgStance(P, 0.13, 0.06, 0.12);
  const up = lgK(t, [[0, 0], [1.0, 1, 's'], [2.4, 1], [3.5, 0, 's']]), br = lgPulse(t, 0.6, 3.0);
  lgLookAt(P, 0.05, -0.75 * up, 0.05 * up); lgSpine(P, -0.12 * up, 0, 0); lgJadd(P, 'chest', 0, -0.03 * br, 0); lgShrug(P, 'L', 0.05 * br); lgShrug(P, 'R', 0.05 * br);
  const v = LG_POST.low.slice(); v[4] += 0.12 * up; lgPistolAt(P, v, { poleR: LG_POLE.Rt, poleL: LG_POLE.Lt });
}, [[0.5, 'breathIn'], [2.6, 'breathOut']]);
lgClip('mask_tap', 'Mask on', 'Standing', 2.5, false, LG_SRC.merc, 'Two fingers to the side of the helmet: the jaw plates rise, the chin and cheeks swing in, the brow and visor drop and lock with a click, and the slit lights up.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.035, lean: 0.07, stance: false }); lgStance(P, 0.13, 0.06, 0.13); lgBreath(P, t, 0.6, 3);
  const k = lgK(t, [[0, 0], [0.45, 1, 'o3'], [0.85, 1], [1.4, 0, 'io']]);
  lgPistolAt(P, LG_POST.sul, { one: true, poleR: LG_POLE.Rt });
  // (1.9.996: the wrist comes up beside the ear cup and the two fingers go up onto the helmet's rail, the hand carried
  // on from the forearm; the elbow forward and out at shoulder height, as a man reaches for his night-vision mount, not
  // winged out level with his head. Placed by its elbow (a pole), so the comfort search does not swing it out.)
  lgHandTo(P, 'L', 'head', [lgLerp(-0.12, 0.05, k), lgLerp(0.26, 0.165, k), lgLerp(-0.68, 0.02, k)], null, [1, 0.6, -0.6]); lgJm(P, 'L', 'hand', 0, -0.35 * k, 0); P.grip.L = k > 0.5 ? 'point' : 'relax';
  P.mask = lgK(t, [[0, 0], [0.55, 0], [1.6, 1, 'l']]); P.glow = lgK(t, [[0, 0], [1.4, 0], [1.7, 1.6, 'o'], [2.2, 1]]);
  lgLookAt(P, 0.08 * k, lgPulse(t, 1.5, 1.85) * 0.12, -0.12 * k);
}, [[0.5, 'tap'], [0.6, 'mask'], [1.62, 'maskLock']]);

/* ---------- 19-26: pistol ---------- */
// the holster's grip, as seen from the chest when standing straight (for the draw and holster)
const LG_HOL_CH = [0.005, -0.192, -0.265, 0, Math.PI / 2 + 0.12, 0];
lgClip('draw', 'Draw', 'Pistol', 1.3, false, LG_SRC.pistol, 'From the holster: grip, clear, rock the muzzle forward at the hip, meet the support hand at the chest and press out to isosceles.', (P, t, ctx, a) => {
  lgBase(P, { crouch: lgK(t, [[0, 0.03], [1.0, 0.07]]), lean: lgK(t, [[0, 0.06], [1.0, 0.14]]), stance: false }); lgStance(P, 0.13, lgK(t, [[0, 0.04], [0.9, 0.12]]), 0.13);
  const g = lgK(t, [[0, LG_HOL_CH], [0.36, LG_HOL_CH], [0.48, [0.02, -0.2, -0.12, 0, 1.3, 0], 'o'], [0.62, [0.12, -0.14, -0.05, 0, 0.12, 0], 'io'], [0.78, [0.21, -0.035, 0.08, 0, 0.04, 0], 'io'], [1.05, LG_POST.iso, 'o3'], [1.18, [0.575, -0.035, 0.335, 0, 0.01, 0], 'io'], [1.3, LG_POST.iso]]);
  lgPistolAt(P, g, { one: t < 0.76, poleR: LG_POLE.Rt, poleL: LG_POLE.L });
  if (t < 0.3) { const k = lgW(t, 0, 0.3); P.ik.handR = null; lgArm(P, 'R', lgLerp(0.06, 0.02, k), lgLerp(0.1, 0.22, k), lgLerp(0, -0.4, k), lgLerp(0.18, 0.75, k), lgLerp(0.05, -0.2, k)); P.grip.R = 'open'; }
  if (t < 0.76) { const k = lgPulse(t, 0.3, 0.76); lgHandTo(P, 'L', 'chest', [0.12 + 0.03 * k, 0.04, -0.02 + 0.03 * k], [0, 0, 0.2], LG_POLE.Lt); P.grip.L = 'open'; if (t < 0.3) { P.ik.handL = null; lgArm(P, 'L', 0.06, 0.1, 0, 0.18, 0.05); P.grip.L = 'relax'; } }
  lgLookAt(P, 0, lgK(t, [[0, 0], [1.05, 0.1]]));
}, [[0.36, 'draw'], [0.8, 'grip']]);
lgClip('aim_iso', 'Aim (isosceles)', 'Pistol', 3.0, true, LG_SRC.iso, 'Arms extended but never locked, a triangle from above, shoulders ahead of the hips; the breath pauses and the sights barely move.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.075, lean: 0.17, stance: false }); lgStance(P, 0.14, 0.13, 0.12);
  const v = LG_POST.iso.slice(); v[3] += lgN1(t * 0.8, 1) * 0.006; v[4] += lgN1(t * 0.9, 4) * 0.006 + Math.sin(t * TAU / a.dur) * 0.004;
  lgPistolAt(P, v); lgBreath(P, t, 0.3, a.dur); lgLookAt(P, 0, 0.1);
});
const lgRecoil = (t, t0) => { const d = t - t0; if (d < 0 || d > 0.32) return 0; return d < 0.03 ? d / 0.03 : Math.exp(-(d - 0.03) * 14) * Math.cos((d - 0.03) * 22) * (1 - (d - 0.03) / 0.29); };
function lgIsoFire(P, t, shots, o) {
  o = o || {}; lgBase(P, { crouch: 0.075, lean: 0.17, stance: false }); lgStance(P, 0.14, 0.13, 0.12);
  let r = 0, sl = 0; for (const s of shots) { r += lgRecoil(t, s); const d = t - s; if (d >= 0 && d < 0.09) sl = Math.max(sl, d < 0.025 ? d / 0.025 : 1 - (d - 0.025) / 0.065); }
  const v = (o.post || LG_POST.iso).slice(); v[4] -= r * 0.2; v[0] -= r * 0.035; v[2] += r * 0.012;
  lgPistolAt(P, v, { trigger: true, poleR: o.poleR, poleL: o.poleL, one: o.one }); P.pistol.slide = sl;
  lgJadd(P, 'chest', 0, -r * 0.03, 0); lgJadd(P, 'head', 0, -r * 0.02, 0); lgLookAt(P, 0, 0.1);
}
lgClip('fire', 'Fire', 'Pistol', 0.5, false, LG_SRC.iso, 'One deliberate shot: the muzzle rises, the slide cycles, the shoulders soak it up and the sights settle back on target.', (P, t) => lgIsoFire(P, t, [0.03]), [[0.03, 'shot']]);
lgClip('double_tap', 'Double tap', 'Pistol', 0.68, false, LG_SRC.iso, 'A controlled pair: the second shot breaks as the sights come back down from the first.', (P, t) => lgIsoFire(P, t, [0.03, 0.2]), [[0.03, 'shot'], [0.2, 'shot']]);
lgClip('reload', 'Reload', 'Pistol', 2.4, false, LG_SRC.ready, 'In the workspace at chest height: the empty drops free, a fresh one from the belt, index finger along it, seated with a slap, slide racked overhand.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.05, lean: 0.12, stance: false }); lgStance(P, 0.13, 0.1, 0.13); lgBreath(P, t, 0.5, 3);
  const k = lgK(t, [[0, 0], [0.25, 1, 'o3'], [2.0, 1], [2.4, 0, 'io']]);
  lgPistolAt(P, lgPostMix('high', 'workspace', k), { one: true, poleR: LG_POLE.Rt });
  P.pistol.mag = t < 0.28 ? 'in' : t < 0.36 ? lgW(t, 0.28, 0.36) : t < 0.95 ? { drop: t - 0.36 } : t < 1.12 ? 'hand' : t < 1.28 ? 1 - lgW(t, 1.12, 1.28) : 'in';
  const reach = lgK(t, [[0, 0], [0.3, 0], [0.6, 1, 'io'], [0.7, 1], [1.05, 0, 'io']]);
  if (t < 1.3) { lgHandTo(P, 'L', 'pelvis', [lgLerp(0.16, 0.085, reach), lgLerp(0.04, 0.115, reach), lgLerp(0.1, 0.03, reach)], [0, 0.2, 0.3], LG_POLE.L); if (t > 0.95) { const q = lgW(t, 0.95, 1.12); P.ik.handL = { on: 'pistol', pole: LG_POLE.Lt }; } P.grip.L = reach > 0.8 ? 'cup' : 'fist'; }
  else if (t < 1.42) { P.ik.handL = { on: 'pistol', pole: LG_POLE.Lt }; P.grip.L = 'open'; }
  else if (t < 1.85) { lgHandTo(P, 'L', 'pistol', [lgLerp(0.01, -0.06, lgW(t, 1.5, 1.62)), 0.0, 0.035], [0.0, 1.3, 0.0], LG_POLE.Lt); P.grip.L = 'cup'; }
  else { P.ik.handL = { on: 'pistol', pole: LG_POLE.Lt }; P.grip.L = 'support'; }
  P.pistol.slide = lgK(t, [[0, 0], [1.5, 0], [1.6, 1, 'o'], [1.64, 1], [1.7, 0, 'i']]);
  lgLookAt(P, 0.1 * k, 0.32 * k - 0.15 * reach);
}, [[0.3, 'magOut'], [0.62, 'pouch'], [1.28, 'magIn'], [1.66, 'slideHome']]);
lgClip('holster', 'Holster', 'Pistol', 1.5, false, LG_SRC.pistol, 'Back into the holster without looking at it: the eyes stay up and keep scanning while the hand finds home by feel.', (P, t, ctx, a) => {
  lgBase(P, { crouch: lgK(t, [[0, 0.07], [1.2, 0.03]]), lean: lgK(t, [[0, 0.14], [1.2, 0.06]]), stance: false }); lgStance(P, 0.13, lgK(t, [[0, 0.12], [1.0, 0.04]]), 0.13);
  const g = lgK(t, [[0, LG_POST.iso], [0.3, LG_POST.high, 'io'], [0.6, [0.12, -0.14, -0.05, 0, 0.3, 0], 'io'], [0.82, [0.02, -0.2, -0.12, 0, 1.35, 0], 'io'], [1.0, LG_HOL_CH, 'o']]);
  if (t < 1.02) lgPistolAt(P, g, { one: t > 0.32, poleR: LG_POLE.Rt, poleL: LG_POLE.L });
  else { P.pistol.at = 'holster'; const k = lgW(t, 1.02, 1.4); lgArm(P, 'R', lgLerp(0.02, 0.06, k), lgLerp(0.22, 0.1, k), lgLerp(-0.4, 0, k), lgLerp(0.75, 0.18, k), lgLerp(-0.2, 0.05, k)); P.grip.R = 'relax'; }
  if (t > 0.32) { const k = lgW(t, 0.32, 0.7); lgArm(P, 'L', lgLerp(-0.6, 0.06, k), 0.12, 0, lgLerp(1.2, 0.18, k), 0.05); P.ik.handL = null; P.grip.L = 'relax'; }
  lgLookAt(P, lgK(t, [[0, 0], [0.7, -0.35], [1.2, 0.3], [1.5, 0]]), 0.04);
}, [[1.0, 'holster']]);
lgClip('car_fire', 'CAR fire', 'Pistol', 1.05, false, LG_SRC.car, 'Close quarters, Center Axis Relock: bladed to the target, the pistol close and canted, two shots without extending the arms.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.08, lean: 0.12, stance: false }); lgFoot(P, 'L', 0.12, 0.1, 0, 0, 0.55, 0); lgFoot(P, 'R', -0.12, -0.15, 0, 0, -0.1, 0);
  lgPelvis(P, 0, 0, -0.08, 0, 0.04, 0.5); lgSpine(P, 0.1, -0.42, 0);
  let r = 0; for (const s of [0.3, 0.52]) r += lgRecoil(t, s);
  const v = LG_POST.car.slice(); v[4] -= r * 0.18; v[0] -= r * 0.03; lgPistolAt(P, v, { trigger: true, poleR: [-0.2, -0.9, 0.1], poleL: [-0.2, 0.9, 0.1] });
  P.pistol.slide = Math.max(0, 1 - Math.abs(t - 0.33) / 0.05) * (t > 0.3 ? 1 : 0) + Math.max(0, 1 - Math.abs(t - 0.55) / 0.05) * (t > 0.52 ? 1 : 0);
  lgLookAt(P, -0.1, 0.06);
}, [[0.3, 'shot'], [0.52, 'shot']]);
lgClip('point_shoot', 'Point shooting', 'Pistol', 0.95, false, LG_SRC.car, 'From retention at the hip, one-handed and fast, the support hand up guarding the face. For when it is already too close.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.1, lean: 0.14, stance: false }); lgFoot(P, 'L', 0.13, 0.12, 0, 0, 0.3, 0); lgFoot(P, 'R', -0.1, -0.15, 0, 0, -0.05, 0);
  lgPelvis(P, 0, 0, -0.1, 0, 0.05, 0.25); lgSpine(P, 0.08, -0.2, 0);
  let r = 0; for (const s of [0.25, 0.45]) r += lgRecoil(t, s);
  const v = LG_POST.hip.slice(); v[4] -= r * 0.25; lgPistolAt(P, v, { one: true, trigger: true, poleR: [-0.5, -0.6, -0.3] });
  P.pistol.slide = (t > 0.25 && t < 0.31 ? 1 : 0) + (t > 0.45 && t < 0.51 ? 1 : 0);
  lgHandTo(P, 'L', 'chest', [0.24, 0.05, 0.26], [0.2, -1.2, 0.3], [-0.4, 0.8, -0.2]); P.grip.L = 'fist';
  lgLookAt(P, -0.1, 0.0);
}, [[0.25, 'shot'], [0.45, 'shot']]);

/* ---------- 27-30: long gun ---------- */
lgClip('rifle_low', 'Carbine low ready', 'Long gun', 3.0, true, LG_SRC.ready, 'The carbine off the back: stock in the shoulder, muzzle down and forward, both eyes open over the optic.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.05, lean: 0.12, stance: false }); lgStance(P, 0.14, 0.14, 0.13); lgBreath(P, t, 0.8, a.dur);
  const v = LG_POST.rlow.slice(); v[4] += Math.sin(t * TAU / a.dur) * 0.01; lgCarbineAt(P, v); lgLookAt(P, lgN1(t * 0.4, 2) * 0.15, 0.04);
});
lgClip('rifle_aim', 'Carbine aim', 'Long gun', 2.5, true, LG_SRC.walk, 'Shouldered with a cheek weld: the head comes to the stock, never the stock to the head; elbows down, weight forward.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.07, lean: 0.18, stance: false }); lgStance(P, 0.15, 0.18, 0.15);
  const v = LG_POST.raim.slice(); v[3] += lgN1(t * 0.7, 3) * 0.004; v[4] += lgN1(t * 0.8, 6) * 0.004; lgCarbineAt(P, v, { trigger: true }); lgBreath(P, t, 0.25, a.dur);
  lgLookAt(P, -0.08, 0.16, 0.18);
});
lgClip('rifle_burst', 'Carbine burst', 'Long gun', 0.75, false, LG_SRC.walk, 'Three rounds into the shoulder: each push is soaked up by the lean, the muzzle climbs a little and comes back.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.07, lean: 0.18, stance: false }); lgStance(P, 0.15, 0.18, 0.15);
  let r = 0; for (const s of [0.02, 0.1, 0.18]) r += lgRecoil(t, s) * 0.7;
  const v = LG_POST.raim.slice(); v[0] -= r * 0.03; v[4] -= r * 0.06; lgCarbineAt(P, v, { trigger: true }); lgJadd(P, 'chest', 0, -r * 0.035, 0);
  lgLookAt(P, -0.08, 0.16, 0.18);
}, [[0.02, 'rshot'], [0.1, 'rshot'], [0.18, 'rshot']]);
lgClip('rifle_reload', 'Carbine reload', 'Long gun', 2.7, false, LG_SRC.walk, 'Carbine turned in to see the magazine well, the empty stripped out, a fresh one from the placard, a tug to check it seated, the bolt release slapped.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.06, lean: 0.14, stance: false }); lgStance(P, 0.15, 0.16, 0.14);
  const k = lgK(t, [[0, 0], [0.3, 1, 'o3'], [2.2, 1], [2.7, 0, 'io']]);
  lgCarbineAt(P, lgPostMix('raim', 'rwork', k), { one: true });
  P.carbine.mag = t < 0.38 ? 'in' : t < 0.5 ? lgW(t, 0.38, 0.5) : t < 1.05 ? { drop: t - 0.5 } : t < 1.25 ? 'hand' : t < 1.42 ? 1 - lgW(t, 1.25, 1.42) : 'in';
  const reach = lgK(t, [[0, 0], [0.4, 0], [0.75, 1, 'io'], [0.85, 1], [1.2, 0, 'io']]);
  if (t < 1.42) { lgHandTo(P, 'L', 'chest', [lgLerp(0.3, 0.215, reach), lgLerp(0.02, 0.0, reach), lgLerp(0.05, 0.0, reach)], [0, 0.4, 0.2], LG_POLE.L); P.grip.L = reach > 0.8 ? 'cup' : 'fist'; }
  else if (t < 1.8) { lgHandTo(P, 'L', 'carbine', [0.02, 0.025, -0.01], [1.4, 0, 0], LG_POLE.L); P.grip.L = 'open'; }
  else { P.ik.handL = { on: 'carbine', pole: [-0.1, 0.6, -0.8] }; P.grip.L = 'cup'; }
  lgLookAt(P, 0.15 * k, 0.3 * k - 0.2 * reach);
}, [[0.4, 'magOut'], [0.78, 'pouch'], [1.42, 'magIn'], [1.62, 'tug'], [1.78, 'boltHome']]);

/* ---------- 31-38: close quarters ---------- */
// the knife's reverse grip guard: the left fist high by the chin, the blade down along the forearm
const LG_GUARD_L = [0.26, 0.07, 0.24];
lgClip('knife_draw', 'Knife draw', 'Close quarters', 1.15, false, LG_SRC.knife, 'The left hand crosses to the sheath, takes the handle so the blade leaves the little-finger side, and comes up into a guard by the chin. The pistol stays tucked.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.07, lean: 0.12, stance: false }); lgFoot(P, 'L', 0.12, 0.12, 0, 0, 0.2, 0); lgFoot(P, 'R', -0.08, -0.14, 0, 0, -0.05, 0);
  lgPistolAt(P, LG_POST.sul, { one: true, poleR: LG_POLE.Rt });
  const cross = lgK(t, [[0, 0], [0.32, 1, 'io'], [0.42, 1], [0.9, 0, 'o3']]);
  if (t < 0.4) { lgHandTo(P, 'L', 'chest', [lgLerp(0.2, 0.2, cross), lgLerp(0.2, -0.065, cross), lgLerp(-0.3, -0.11, cross)], [lgLerp(0, 1.4, cross), lgLerp(0, -0.2, cross), lgLerp(0, 1.5, cross)], [-0.3, 0.8, -0.6]); P.grip.L = cross > 0.85 ? 'knife' : 'open'; P.knife.at = 'sheath'; }
  else { P.knife.at = 'handL'; P.grip.L = 'knife'; const k = lgW(t, 0.4, 0.95); const s = lgE.o3(k); lgHandTo(P, 'L', 'chest', [lgLerp(0.21, LG_GUARD_L[0], s), lgLerp(-0.06, LG_GUARD_L[1], s), lgLerp(-0.1, LG_GUARD_L[2], s)], [lgLerp(1.4, 0.2, s), lgLerp(-0.2, -1.3, s), lgLerp(1.5, 0.4, s)], [-0.4, 0.8, -0.3]); }
  lgPelvis(P, 0, 0, -0.07, 0, 0.04, 0.12 - 0.1 * cross); lgSpine(P, 0.06, -0.1 * cross, 0); lgLookAt(P, 0, 0.1 * cross);
}, [[0.4, 'knifeOut']]);
function lgKnifeGuard(P, o) { o = o || {}; P.knife.at = 'handL'; P.grip.L = 'knife'; lgHandTo(P, 'L', 'chest', o.p || LG_GUARD_L, o.r || [0.2, -1.3, 0.4], o.pole || [-0.4, 0.8, -0.3]); lgPistolAt(P, LG_POST.sul, { one: true, poleR: LG_POLE.Rt }); }
lgClip('knife_slash', 'Reverse-grip slash', 'Close quarters', 0.85, false, LG_SRC.knife, 'Edge out, the hips do the work: a wind-up to the left and a horizontal cut across, the arm only along for the ride.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.09, lean: 0.14, stance: false }); lgFoot(P, 'L', 0.14, 0.12, 0, 0, 0.25, 0); lgFoot(P, 'R', -0.1, -0.15, 0, 0, -0.05, 0);
  const yaw = lgK(t, [[0, 0], [0.22, 0.45, 'o'], [0.4, -0.55, 'i3'], [0.55, -0.6, 'o'], [0.85, 0, 'io']]);
  lgPelvis(P, 0, 0, -0.09, 0, 0.05, yaw * 0.4); lgSpine(P, 0.06, yaw * 0.7, 0); lgLookAt(P, -yaw * 0.6, 0.05);
  lgKnifeGuard(P, { p: [lgK(t, [[0, 0.26], [0.22, 0.2], [0.4, 0.46, 'i3'], [0.55, 0.36], [0.85, 0.26]]), lgK(t, [[0, 0.07], [0.22, 0.24], [0.4, -0.18, 'i3'], [0.55, -0.25], [0.85, 0.07]]), lgK(t, [[0, 0.24], [0.22, 0.2], [0.4, 0.16], [0.85, 0.24]])], r: [0.2, lgK(t, [[0, -1.3], [0.4, -0.4], [0.85, -1.3]]), lgK(t, [[0, 0.4], [0.22, 1.2], [0.4, -0.6, 'i3'], [0.85, 0.4]])] });
}, [[0.33, 'swish']]);
lgClip('knife_stab', 'Hammer-fist stab', 'Close quarters', 0.95, false, LG_SRC.knife, 'Reverse grip, from high to low like a hammer: the fist goes up, the hips drop behind it, and it drives down.', (P, t, ctx, a) => {
  lgBase(P, { crouch: lgK(t, [[0, 0.08], [0.42, 0.06], [0.56, 0.2, 'i3'], [0.95, 0.08]]), lean: 0.2, stance: false }); lgFoot(P, 'L', 0.16, 0.12, 0, 0, 0.25, 0); lgFoot(P, 'R', -0.12, -0.15, 0, 0, -0.05, 0);
  const z = lgK(t, [[0, 0.24], [0.4, 0.5, 'o'], [0.47, 0.5], [0.56, -0.12, 'i3'], [0.66, -0.15], [0.95, 0.24, 'io']]), x = lgK(t, [[0, 0.26], [0.4, 0.16], [0.56, 0.42, 'i3'], [0.95, 0.26]]);
  lgKnifeGuard(P, { p: [x, lgK(t, [[0, 0.07], [0.4, 0.12], [0.56, 0.02], [0.95, 0.07]]), z], r: [lgK(t, [[0, 0.2], [0.4, 0.05], [0.56, -0.1], [0.95, 0.2]]), lgK(t, [[0, -1.3], [0.4, -1.6], [0.56, -0.6, 'i3'], [0.95, -1.3]]), lgK(t, [[0, 0.4], [0.4, 0.05], [0.95, 0.4]])], pole: [-0.5, 0.9, 0.2] });
  lgSpine(P, lgK(t, [[0, 0.08], [0.4, -0.05], [0.56, 0.32, 'i3'], [0.95, 0.08]]), 0.08, 0); lgLookAt(P, 0, lgK(t, [[0, 0.1], [0.56, 0.4], [0.95, 0.1]]));
}, [[0.53, 'stab']]);
lgClip('hip_throw', 'Hip throw', 'Close quarters', 1.7, false, LG_SRC.ogoshi, 'Pull them off balance, step in and turn the hips under theirs, lift with the hips while bending forward and pulling down: they land at his feet.', (P, t, ctx, a) => {
  const turn = lgK(t, [[0, 0], [0.25, 0], [0.55, 1.35, 'io'], [1.15, 1.35], [1.6, 0, 'io']]), lift = lgPulse(t, 0.6, 1.15), bend = lgK(t, [[0, 0], [0.55, 0.1], [0.75, 0.25], [0.98, 0.75, 'i'], [1.2, 0.5], [1.6, 0.05]]);
  P.root[3] = turn * 0.6;
  lgPelvis(P, 0, 0, -lgK(t, [[0, 0.05], [0.5, 0.2], [0.75, 0.12], [0.98, 0.06], [1.3, 0.12], [1.7, 0.04]]), 0, bend * 0.3, turn * 0.4);
  lgFoot(P, 'L', lgK(t, [[0, 0.05], [0.4, 0.12], [1.6, 0.05]]), lgK(t, [[0, 0.13], [0.45, 0.2], [1.6, 0.13]]), lgPulse(t, 0.3, 0.45) * 0.06, 0, lgK(t, [[0, 0.1], [0.5, 0.8], [1.5, 0.1]]), 0);
  lgFoot(P, 'R', lgK(t, [[0, -0.05], [0.3, 0.2], [0.55, 0.0], [1.6, -0.05]]), lgK(t, [[0, -0.13], [0.3, 0.0], [0.55, -0.05], [1.6, -0.13]]), lgPulse(t, 0.2, 0.42) * 0.08, 0, lgK(t, [[0, -0.1], [0.5, 0.9], [1.5, -0.1]]), 0);
  lgSpine(P, bend, turn * 0.35, -lift * 0.1); lgLookAt(P, -turn * 0.4, -bend * 0.4 + 0.1);
  // the arms: the left pulls the sleeve forward and down, the right wraps behind their back
  P.pistol.at = 'holster';
  lgArm(P, 'L', lgK(t, [[0, -0.55], [0.5, -0.75], [0.98, -0.15, 'i'], [1.3, -0.2], [1.7, 0.06]]), lgK(t, [[0, 0.2], [0.98, 0.45], [1.7, 0.1]]), 0, lgK(t, [[0, 0.9], [0.5, 1.3], [0.98, 0.5], [1.7, 0.2]]), 0.1);
  lgArm(P, 'R', lgK(t, [[0, -0.45], [0.5, -0.8], [0.98, -0.3], [1.7, 0.06]]), lgK(t, [[0, 0.3], [0.5, 0.75], [0.98, 0.45], [1.7, 0.1]]), lgK(t, [[0, 0], [0.5, 0.7], [1.7, 0]]), lgK(t, [[0, 0.9], [0.5, 1.7], [0.98, 1.3], [1.7, 0.2]]), 0.1);
  P.grip.L = t > 0.2 && t < 1.2 ? 'fist' : 'relax'; P.grip.R = t > 0.3 && t < 1.1 ? 'fist' : 'relax';
}, [[0.3, 'grunt'], [0.95, 'throw'], [1.15, 'thud']]);
lgClip('shove', 'Shove', 'Close quarters', 0.9, false, LG_SRC.merc, 'Making space: a step in with the left foot and the forearm driven out from the chest, the pistol kept back at retention.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.08, lean: 0.16, stance: false }); const st = lgK(t, [[0, 0], [0.3, 1, 'o3'], [0.9, 0]]);
  lgFoot(P, 'L', 0.08 + st * 0.2, 0.12, lgPulse(t, 0.05, 0.3) * 0.05, 0, 0.15, 0); lgFoot(P, 'R', -0.1, -0.14, 0, 0, -0.05, 0);
  lgPelvis(P, st * 0.08, 0, -0.08, 0, 0.06, 0.15 - st * 0.25); lgSpine(P, 0.12 * st, -0.15 * st, 0);
  const push = lgK(t, [[0, 0], [0.2, 0.1], [0.36, 1, 'o3'], [0.55, 0.9], [0.9, 0]]);
  lgHandTo(P, 'L', 'chest', [lgLerp(0.2, 0.55, push), lgLerp(0.05, 0.02, push), lgLerp(0.1, 0.16, push)], [0, -1.3, lgLerp(0.4, 0.1, push)], [-0.3, 0.8, -0.4]); P.grip.L = 'open';
  lgPistolAt(P, LG_POST.hip, { one: true, poleR: [-0.5, -0.6, -0.3] }); lgLookAt(P, 0, 0.05);
}, [[0.34, 'shove']]);
lgClip('palm_strike', 'Palm strike', 'Close quarters', 0.75, false, LG_SRC.merc, 'The heel of the left palm up under a chin, the hips turning into it, fast out and fast back.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.08, lean: 0.14, stance: false }); lgFoot(P, 'L', 0.14, 0.12, 0, 0, 0.2, 0); lgFoot(P, 'R', -0.1, -0.15, 0, 0, -0.05, 0);
  const s = lgK(t, [[0, 0], [0.15, -0.15], [0.3, 1, 'o3'], [0.42, 0.95], [0.75, 0]]);
  lgPelvis(P, s * 0.04, 0, -0.08, 0, 0.05, 0.2 - s * 0.35); lgSpine(P, 0.08, -0.25 * s, 0);
  lgHandTo(P, 'L', 'chest', [lgLerp(0.22, 0.56, s), lgLerp(0.08, 0.0, s), lgLerp(0.12, 0.34, s)], [0, lgLerp(-1.0, -2.0, s), 0], [-0.3, 0.8, -0.5]); P.grip.L = 'open';
  lgPistolAt(P, LG_POST.hip, { one: true, poleR: [-0.5, -0.6, -0.3] }); lgLookAt(P, 0, -0.04);
}, [[0.3, 'hit']]);
lgClip('pistol_whip', 'Pistol strike', 'Close quarters', 0.85, false, LG_SRC.merc, 'Too close to shoot clean: the frame of the pistol in a short arc, then straight back to a two-handed grip.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.08, lean: 0.14, stance: false }); lgFoot(P, 'L', 0.14, 0.12, 0, 0, 0.2, 0); lgFoot(P, 'R', -0.1, -0.15, 0, 0, -0.05, 0);
  const s = lgK(t, [[0, 0], [0.18, -0.3, 'o'], [0.34, 1, 'i3'], [0.45, 0.9], [0.85, 0]]);
  lgPelvis(P, 0, 0, -0.08, 0, 0.05, 0.15 + s * 0.3); lgSpine(P, 0.06 + s * 0.08, s * 0.25, 0);
  const v = [lgLerp(0.25, 0.42, Math.abs(s)), lgLerp(-0.1, 0.06, Math.max(0, s)), lgLerp(0.18, 0.3 - Math.max(0, s) * 0.1, Math.abs(s)), lgLerp(0, 0.8, Math.max(0, s)), lgLerp(0.0, 0.6, Math.max(0, s)), lgLerp(0, 1.2, Math.max(0, s))];
  // (1.9.995: the support hand comes back to the gun once the gun is back near level, so its wrist can take it)
  if (t < 0.78) lgPistolAt(P, t < 0.7 ? v : lgPostMix(v, 'high', lgW(t, 0.7, 0.85)), { one: true, poleR: [-0.4, -0.8, 0.1] }); else lgPistolAt(P, lgPostMix(v, 'high', lgW(t, 0.7, 0.85)), { poleR: LG_POLE.Rt, poleL: LG_POLE.Lt });
  if (t < 0.78) { lgHandTo(P, 'L', 'chest', [0.22, 0.08, 0.2], [0.2, -1.2, 0.3], [-0.4, 0.8, -0.2]); P.grip.L = 'fist'; }
  lgLookAt(P, 0, 0.04);
}, [[0.33, 'hit']]);
lgClip('front_kick', 'Front kick', 'Close quarters', 1.0, false, LG_SRC.merc, 'Knee up, snap the boot out from the hip into a midsection, pull it back and plant it. The pistol stays at high ready.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.06, lean: 0.06, stance: false });
  const ch = lgK(t, [[0, 0], [0.25, 1, 'o'], [0.36, 1], [0.6, 1], [0.8, 0, 'io']]), ex = lgK(t, [[0, 0], [0.3, 0], [0.42, 1, 'o3'], [0.5, 1], [0.62, 0, 'io']]);
  lgFoot(P, 'L', -0.02, 0.13, 0, 0, 0.15, 0);
  lgFoot(P, 'R', lgLerp(-0.05, 0.12, ch) + ex * 0.42, -0.13, ch * 0.42 + ex * 0.12, lgLerp(0, -0.2, ch) + ex * 0.9, -0.05, -ex * 0.4);
  lgPelvis(P, -ex * 0.06, 0.03 * ch, -0.06, 0.04 * ch, -0.1 * ch - 0.12 * ex, 0.05); lgSpine(P, -0.06 * ex, 0, 0.03 * ch);
  lgPistolAt(P, LG_POST.high, { poleR: LG_POLE.Rt, poleL: LG_POLE.Lt }); lgLookAt(P, 0, 0.12 * ex);
}, [[0.42, 'kick'], [0.82, 'stepR']]);

/* ---------- 39-42: special moves ---------- */
lgClip('roll', 'Combat roll', 'Special', 1.15, false, LG_SRC.merc, 'Down over the shoulder and up again in one piece: tucked tight, the pistol held in close, rolling up into a crouch facing the same way.', (P, t, ctx, a) => {
  // the tucked body is a ball rolling along the ground; the pelvis rides round its middle
  const tuck = lgK(t, [[0, 0], [0.22, 1, 'i'], [0.82, 1], [1.12, 0, 'o']]), ang = lgK(t, [[0, 0], [0.22, 0.15, 'i'], [0.82, TAU, 'l'], [1.15, TAU]]) % TAU;
  const fwd = lgK(t, [[0, 0], [0.22, 0.12, 'i'], [0.82, 1.35, 'l'], [1.15, 1.5, 'o']]);
  P.root[0] = ctx.inPlace ? 0 : fwd;
  const ox = -0.05, oz = -0.14, px = ox * Math.cos(ang) + oz * Math.sin(ang), pz = -ox * Math.sin(ang) + oz * Math.cos(ang);
  lgPelvis(P, px * tuck, 0, lgLerp(-0.04, 0.42 + pz - 0.98, tuck), 0, ang + 0.35 * tuck, 0);
  lgSpine(P, 0.55 * tuck + 0.08, 0, 0); lgLookAt(P, 0, 0.6 * tuck);
  if (tuck > 0.05) { P.ik.footL = null; P.ik.footR = null; for (const sd of ['L', 'R']) { lgJ(P, 'thigh' + sd, 0, -2.0 * tuck, 0); lgJ(P, 'shin' + sd, 0, 2.4 * tuck, 0); lgJ(P, 'foot' + sd, 0, 0.3 * tuck, 0); } }
  else lgStance(P, 0.13, 0.08, 0.12);
  lgPistolAt(P, LG_POST.sul, { one: true, poleR: LG_POLE.Rt }); lgArm(P, 'L', -0.9 * tuck, 0.3, 0, 1.7 * tuck + 0.18, 0); P.ik.handL = null;
}, [[0.25, 'roll'], [0.85, 'stepL']]);
lgClip('dash', 'Dash', 'Special', 0.5, false, LG_SRC.merc, 'A burst of two hard strides, body low and forward, the gun pulled in tight.', (P, t, ctx, a) => {
  const ph = (t / a.dur) * 1.0; lgGait(P, ph, { stride: 3.0, st: 0.36, lift: 0.2, crouch: 0.12, bob: 0.04, lean: 0.38, yaw: 0.1, heel: 1, run: true });
  if (ctx.run) lgRunAim(P, ctx, t, 0); else lgPistolAt(P, LG_POST.high, { poleR: LG_POLE.Rt, poleL: LG_POLE.Lt });
}, [[0.02, 'stepL'], [0.2, 'stepR']]);
lgClip('slide', 'Slide', 'Special', 1.2, false, LG_SRC.merc, 'Running in and dropping onto the hip on the wet ground: the lead leg out, the other folded under, the pistol still on target.', (P, t, ctx, a) => {
  const drop = lgK(t, [[0, 0], [0.25, 1, 'i'], [0.8, 1], [1.15, 0, 'io']]), fwd = lgK(t, [[0, 0], [0.25, 0.8, 'l'], [0.85, 2.0, 'o'], [1.2, 2.1]]);
  P.root[0] = ctx.inPlace ? 0 : fwd;
  lgPelvis(P, -0.1 * drop, 0.05 * drop, -0.62 * drop - 0.04, 0.2 * drop, -0.45 * drop, 0.15 * drop);
  lgFoot(P, 'L', lgLerp(0.05, 0.75, drop), 0.12, lgLerp(0, 0.05, drop), lgLerp(0, -0.4, drop), 0.1, 0);
  lgFoot(P, 'R', lgLerp(-0.05, 0.05, drop), lgLerp(-0.13, -0.3, drop), 0, lgLerp(0, 0.3, drop), lgLerp(-0.1, -1.2, drop), 0);
  lgSpine(P, 0.3 * drop, -0.1 * drop, -0.2 * drop); lgLookAt(P, 0.1 * drop, -0.1 * drop);
  lgPistolAt(P, LG_POST.iso, { one: drop > 0.3, poleR: LG_POLE.Rw });
  if (drop > 0.3) { lgHandTo(P, 'L', 'root', [lgLerp(0.2, -0.25, drop), 0.32, 0.02], [0, 0.4, 0], [0.2, 1, 0.3]); P.grip.L = 'open'; }
}, [[0.28, 'skid'], [1.0, 'stepL']]);
lgClip('radio', 'Radio call', 'Special', 2.5, false, LG_SRC.merc, 'Finger on the push-to-talk, head tipped to the earpiece: a short call, a nod for "copy", hand back to the gun.', (P, t, ctx, a) => {
  lgBase(P, { crouch: 0.035, lean: 0.07, stance: false }); lgStance(P, 0.13, 0.06, 0.13); lgBreath(P, t, 0.6, 3);
  const k = lgK(t, [[0, 0], [0.4, 1, 'o3'], [2.0, 1], [2.5, 0, 'io']]);
  lgPistolAt(P, LG_POST.sul, { one: true, poleR: LG_POLE.Rt });
  lgHandTo(P, 'L', 'chest', [lgLerp(0.13, 0.17, k), lgLerp(0.02, 0.1, k), lgLerp(0.02, 0.18, k)], [lgLerp(0, 0.4, k), lgLerp(0, -0.8, k), lgLerp(0.2, 0.9, k)], LG_POLE.Lt); P.grip.L = k > 0.5 ? 'point' : 'open';
  lgLookAt(P, 0.12 * k, 0.1 * k + lgPulse(t, 1.55, 1.8) * 0.15, 0.22 * k);
}, [[0.45, 'radio'], [1.95, 'radio']]);

/* ---------- 43-46: taking hits ---------- */
lgClip('hit_front', 'Hit from the front', 'Hits', 0.75, false, LG_SRC.merc, 'Something heavy hits the plates: the torso snaps back, a foot goes back to catch him, the gun never drops.', (P, t, ctx, a) => {
  const h = lgK(t, [[0, 0], [0.08, 1, 'o3'], [0.25, 0.7], [0.75, 0, 'io']]);
  lgBase(P, { crouch: 0.05 + 0.04 * h, lean: 0.12 - 0.3 * h, stance: false });
  lgFoot(P, 'L', 0.08 - h * 0.05, 0.13, 0, 0, 0.1, 0); lgFoot(P, 'R', -0.06 - lgK(t, [[0, 0], [0.15, 0.25, 'o'], [0.75, 0.0]]), -0.14, lgPulse(t, 0.05, 0.2) * 0.05, 0, -0.1, 0);
  lgSpine(P, -0.3 * h, 0.1 * h, 0.05 * h); lgLookAt(P, 0.1 * h, -0.35 * h);
  const v = LG_POST.high.slice(); v[4] -= 0.4 * h; v[2] += 0.06 * h; lgPistolAt(P, v, { poleR: LG_POLE.Rt, poleL: LG_POLE.Lt });
}, [[0.0, 'hit'], [0.18, 'grunt'], [0.2, 'stepR']]);
lgClip('hit_back', 'Hit from behind', 'Hits', 0.75, false, LG_SRC.merc, 'Hit in the back plate: pitched forward, a quick step to catch the fall, then the turn to face it.', (P, t, ctx, a) => {
  const h = lgK(t, [[0, 0], [0.08, 1, 'o3'], [0.3, 0.6], [0.75, 0, 'io']]);
  lgBase(P, { crouch: 0.05 + 0.05 * h, lean: 0.12 + 0.35 * h, stance: false });
  lgFoot(P, 'L', 0.06 + lgK(t, [[0, 0], [0.2, 0.3, 'o'], [0.75, 0.06]]), 0.13, lgPulse(t, 0.05, 0.22) * 0.06, 0, 0.1, 0); lgFoot(P, 'R', -0.06, -0.14, 0, 0, -0.1, 0);
  lgSpine(P, 0.35 * h, -0.1 * h, 0); lgLookAt(P, -0.3 * h, 0.2 * h);
  lgPistolAt(P, LG_POST.high, { poleR: LG_POLE.Rt, poleL: LG_POLE.Lt });
}, [[0.0, 'hit'], [0.18, 'grunt'], [0.22, 'stepL']]);
lgClip('grabbed', 'Grabbed', 'Hits', 1.7, false, LG_SRC.osoto, 'Hands on him: he twists against the grip, braces a forearm across their chest, and shoves free.', (P, t, ctx, a) => {
  const s = lgK(t, [[0, 0], [0.12, 1, 'o3'], [1.15, 1], [1.4, 0.3, 'o'], [1.7, 0]]), tw = Math.sin(t * 9) * (t < 1.15 ? 1 : 0);
  lgBase(P, { crouch: 0.08 + 0.05 * s, lean: 0.1 - 0.15 * s, stance: false });
  lgFoot(P, 'L', 0.1, 0.14, 0, 0, 0.15, 0); lgFoot(P, 'R', -0.15 * s - 0.05, -0.15, 0, 0, -0.15, 0);
  lgPelvis(P, -0.05 * s, 0, -0.1 * s, 0, -0.08 * s, tw * 0.12 * s); lgSpine(P, -0.15 * s, tw * 0.3 * s, tw * 0.1 * s); lgLookAt(P, tw * 0.3 * s, -0.1 * s);
  const push = lgK(t, [[0, 0], [1.15, 0.2], [1.32, 1, 'o3'], [1.7, 0]]);
  lgHandTo(P, 'L', 'chest', [lgLerp(0.26, 0.5, push), 0.03, 0.18], [0, -1.3, 0.2], [-0.3, 0.8, -0.4]); P.grip.L = 'open';
  lgPistolAt(P, LG_POST.hip, { one: true, poleR: [-0.5, -0.6, -0.3] });
}, [[0.05, 'grunt'], [0.5, 'cloth'], [1.3, 'shove']]);
lgClip('stagger', 'Stagger', 'Hits', 1.2, false, LG_SRC.merc, 'A hit that takes his legs: two stumbling steps sideways, knees buckling, arms out for balance, and he finds his feet.', (P, t, ctx, a) => {
  const h = lgK(t, [[0, 0], [0.1, 1, 'o3'], [0.7, 0.8], [1.2, 0, 'io']]);
  lgBase(P, { crouch: 0.05 + 0.14 * h, lean: 0.1 + 0.1 * h, stance: false });
  const sx = lgK(t, [[0, 0], [0.3, 0.18, 'o'], [0.6, 0.3, 'o'], [1.2, 0.3]]);
  lgFoot(P, 'L', 0.04, 0.13 - sx * 0.6, lgPulse(t, 0.1, 0.32) * 0.06, 0, 0.1, 0); lgFoot(P, 'R', -0.04, -0.14 - sx, lgPulse(t, 0.32, 0.58) * 0.06, 0, -0.1, 0);
  lgPelvis(P, 0, -sx * 0.7, -0.05 - 0.14 * h, -0.2 * h, 0.05, 0.1 * h); lgSpine(P, 0.15 * h, 0.15 * h, 0.25 * h); lgLookAt(P, 0.2 * h, 0.1 * h, -0.2 * h);
  lgPistolAt(P, LG_POST.hip, { one: true, poleR: [-0.5, -0.6, -0.3] }); lgArm(P, 'L', -0.3 * h, 0.9 * h + 0.1, 0, 0.4, 0.1); P.ik.handL = null;
}, [[0.0, 'hit'], [0.2, 'stepL'], [0.5, 'stepR'], [0.12, 'grunt']]);

/* ---------- 47-50: down and out ---------- */
lgClip('down', 'Going down', 'Down', 1.5, false, LG_SRC.merc, 'Hurt badly: down onto the knees, then onto the left hip, propped on an elbow with the pistol still up. Waiting for a teammate.', (P, t, ctx, a) => {
  const k1 = lgK(t, [[0, 0], [0.5, 1, 'i']]), k2 = lgK(t, [[0, 0], [0.5, 0], [1.1, 1, 'io']]);
  lgPelvis(P, -0.05 * k2, 0.15 * k2, -0.42 * k1 - 0.33 * k2, -0.55 * k2, 0.1 * k1 - 0.1 * k2, 0.3 * k2);
  lgFoot(P, 'L', lgLerp(0.0, -0.25, k1) + 0.3 * k2, lgLerp(0.13, 0.12, k1) + 0.15 * k2, 0, lgLerp(0, 1.0, k1) - 0.6 * k2, 0.1 + 0.3 * k2, 0);
  lgFoot(P, 'R', lgLerp(0.0, -0.28, k1) + 0.45 * k2, lgLerp(-0.13, -0.12, k1) - 0.05 * k2, 0, lgLerp(0, 1.0, k1) - 0.9 * k2, -0.1 + 0.5 * k2, 0);
  lgSpine(P, 0.2 * k1 - 0.3 * k2, 0.2 * k2, 0.35 * k2); lgLookAt(P, -0.2 * k2, 0.2 * k1 - 0.1 * k2, -0.3 * k2);
  const v = LG_POST.hip.slice(); v[2] += 0.1 * k2; v[0] += 0.08 * k2; lgPistolAt(P, v, { one: true, poleR: [-0.5, -0.6, -0.3] });
  lgArm(P, 'L', lgLerp(0.06, -0.4, k1) + 0.5 * k2, 0.1 + 0.55 * k2, 0, lgLerp(0.2, 0.3, k1) + 1.0 * k2, -0.15 * k2, 0.45 * k2); P.ik.handL = null; P.grip.L = 'open';   // (1.9.995: the palm pressed flat bends the wrist back, not sideways)
}, [[0.45, 'thud'], [1.05, 'thud'], [0.2, 'grunt']]);
lgClip('revive', 'Revived', 'Down', 1.7, false, LG_SRC.merc, 'Back up: a push off the elbow, a knee under him, a stagger, and back to the gun.', (P, t, ctx, a) => {
  const k = 1 - lgK(t, [[0, 0], [0.7, 0.55, 'io'], [1.3, 1, 'io'], [1.7, 1]]);
  const k1 = clamp(k * 2, 0, 1), k2 = clamp(k * 2 - 1, 0, 1);
  lgPelvis(P, -0.05 * k2, 0.15 * k2, -0.42 * k1 - 0.33 * k2, -0.55 * k2, 0.1 * k1 - 0.1 * k2, 0.3 * k2);
  lgFoot(P, 'L', lgLerp(0.0, -0.25, k1) + 0.3 * k2, 0.13 + 0.15 * k2, 0, lgLerp(0, 1.0, k1) - 0.6 * k2, 0.1 + 0.3 * k2, 0);
  lgFoot(P, 'R', lgLerp(0.06, -0.28, k1) + 0.45 * k2, -0.13 - 0.05 * k2, 0, lgLerp(0, 1.0, k1) - 0.9 * k2, -0.1 + 0.5 * k2, 0);
  lgSpine(P, 0.2 * k1 - 0.3 * k2 + 0.1 * (1 - k), 0.2 * k2, 0.35 * k2); lgLookAt(P, -0.2 * k2, 0.1, -0.3 * k2);
  lgPistolAt(P, lgPostMix('hip', 'high', 1 - k1), { one: k > 0.3, poleR: [-0.5, -0.6, -0.3], poleL: LG_POLE.Lt });
  if (k > 0.3) { lgArm(P, 'L', -0.4 * k1 + 0.5 * k2, 0.1 + 0.55 * k2, 0, 0.3 * k1 + 1.0 * k2, -0.15 * k2, 0.45 * k2); P.ik.handL = null; P.grip.L = 'open'; }
}, [[0.3, 'grunt'], [0.9, 'stepR'], [1.3, 'stepL']]);
lgClip('death_back', 'Falls back', 'Down', 1.4, false, LG_SRC.merc, 'Shot through: the knees go, he falls back, arms out, and the rain keeps falling on him.', (P, t, ctx, a) => {
  const k = lgK(t, [[0, 0], [0.25, 0.15, 'i'], [0.9, 1, 'i3'], [1.0, 0.97, 'o'], [1.4, 1]]);
  lgPelvis(P, -0.45 * k, 0, -0.84 * k, 0, -1.45 * k, 0.05 * k);
  lgFoot(P, 'L', lgLerp(0.04, 0.12, k), 0.15, lgK(t, [[0, 0], [0.6, 0.05], [1.0, 0.1]]), -0.6 * k, 0.4 * k, 0); lgFoot(P, 'R', lgLerp(-0.04, 0.2, k), -0.18, 0.05 * k, -0.5 * k, -0.5 * k, 0);
  lgSpine(P, -0.1 * k, 0.1 * k, 0); lgLookAt(P, 0.4 * k, -0.2 * k, 0.2 * k);
  P.pistol.at = 'handR'; P.grip.R = 'relax';
  lgArm(P, 'L', lgLerp(0.06, -0.35, k), 0.1 + 1.15 * k, 0, 0.3 + 0.2 * k, 0.2); lgArm(P, 'R', lgLerp(0.06, -0.2, k), 0.1 + 0.95 * k, 0, 0.5, 0.2); P.grip.L = 'open';
}, [[0.15, 'grunt'], [0.92, 'body']]);
lgClip('death_crumple', 'Crumples', 'Down', 1.6, false, LG_SRC.merc, 'Straight down where he stood: onto the knees, then folding forward onto his side.', (P, t, ctx, a) => {
  const k1 = lgK(t, [[0, 0], [0.45, 1, 'i']]), k2 = lgK(t, [[0, 0], [0.45, 0], [1.2, 1, 'i3'], [1.3, 0.97, 'o'], [1.6, 1]]);
  lgPelvis(P, 0.1 * k2, -0.1 * k2, -0.45 * k1 - 0.38 * k2, 0.4 * k2, 0.15 * k1 + 0.5 * k2, 0.2 * k2);
  lgFoot(P, 'L', lgLerp(0.0, -0.3, k1) - 0.1 * k2, 0.13, 0, lgLerp(0, 1.2, k1), 0.1, 0); lgFoot(P, 'R', lgLerp(0.0, -0.32, k1) - 0.05 * k2, -0.13, 0, lgLerp(0, 1.2, k1), -0.1, 0);
  lgSpine(P, 0.3 * k1 + 0.6 * k2, 0.2 * k2, 0.3 * k2); lgLookAt(P, 0.3 * k2, 0.3 * k1 + 0.2 * k2, 0.4 * k2);
  P.pistol.at = 'handR'; P.grip.R = 'relax';
  lgArm(P, 'L', -0.2 * k1 - 0.6 * k2, 0.1 + 0.3 * k2, 0, 0.4 + 0.5 * k2, 0.2); lgArm(P, 'R', -0.2 * k1 - 0.9 * k2, 0.1 + 0.2 * k2, 0, 0.3 + 0.6 * k2, 0.2); P.grip.L = 'relax';
}, [[0.12, 'grunt'], [0.45, 'thud'], [1.22, 'body']]);
