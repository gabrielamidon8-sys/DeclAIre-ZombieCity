/* ================= CHOREO: the fight choreographer (1.9.995) =================
   A new engine. CHOREO designs fights the way a fight director and a stunt coordinator do, and has LEGEND perform them,
   MIMATIC shoot them and VFXRAY dress them:
   - Moves (v1): strikes, kicks, blocks, parries, evasions, reactions, falls, a point-blank shot, footwork; each with its
     timing in three phases (the wind-up, the moment of contact, the recovery) from the measurements of real punches and
     kicks, the line it travels (high, middle, low), and how it is written on a fight sheet.
   - Spacing and contact (v2): the measure (the distance the fighters keep), the strike arriving on its target at the
     moment of contact, the partner's reaction starting on that moment, blocks meeting the strike, and the stage-combat
     rule that a blow that "lands" passes a hand's breadth beside the face, the gap hidden along the lens.
   - Phrases and rhythm (v3): moves joined into phrases, the pause-burst-pause rhythm of Hong Kong fight films, tempo,
     and several attackers who take turns (only one engages at a time, the others stay out of reach).
   - Reading on camera (v4): every exchange staged for the lens (the gap of every staged hit hidden from the camera, the
     hit and its reaction in one frame, the key poses' silhouettes clear).
   - Whole fights (v5): a fight with a story (a set-up, an escalation, a reversal, a climax), objects picked up and used,
     a point-blank shot at the end, and the sheet, the cameras and the effects that go with it.
   CHOREO keeps every fighter's feet planted except when a step lifts one (no sliding), and keeps the bodies apart
   except where a move makes contact. */
const CHO = { made: 0 };
// t: [wind-up to contact, contact (held), recovery] in seconds; line; target (a landmark on the partner); react: what a landed one does
const CHO_MOVES = {
  jab: { name: 'Jab', kind: 'strike', limb: 'L', target: 'face', line: 'high', t: [0.07, 0.06, 0.13], react: 'snapBack', fx: ['hit'], power: 0.35, note: 'L jab, face' },
  cross: { name: 'Cross', kind: 'strike', limb: 'R', target: 'face', line: 'high', t: [0.1, 0.06, 0.16], react: 'snapBack', fx: ['hit'], power: 0.8, note: 'R cross, face' },
  hook: { name: 'Hook', kind: 'strike', limb: 'L', target: 'jaw', line: 'high', path: 'hook', t: [0.12, 0.05, 0.18], react: 'snapSide', fx: ['hit'], power: 0.9, note: 'L hook, jaw' },
  uppercut: { name: 'Uppercut', kind: 'strike', limb: 'R', target: 'chin', line: 'high', path: 'upper', t: [0.12, 0.05, 0.18], react: 'snapUp', fx: ['hit'], power: 0.9, note: 'R uppercut, chin' },
  body: { name: 'Body shot', kind: 'strike', limb: 'R', target: 'belly', line: 'mid', t: [0.11, 0.06, 0.17], react: 'fold', fx: ['hit'], power: 0.7, note: 'R hook, body' },
  frontKick: { name: 'Front kick', kind: 'kick', limb: 'R', target: 'belly', line: 'mid', contact: 'ball', t: [0.21, 0.07, 0.35], react: 'push', fx: ['hit'], power: 1, note: 'R front kick, belly' },
  roundKick: { name: 'Roundhouse', kind: 'kick', limb: 'R', target: 'ribs', line: 'mid', path: 'round', contact: 'instep', t: [0.24, 0.08, 0.38], react: 'stagger', fx: ['hit'], power: 1, note: 'R round kick, ribs' },
  block: { name: 'High block', kind: 'block', limb: 'L', line: 'high', t: [0.1, 0.18, 0.18], fx: ['block'], note: 'L high block' },
  parry: { name: 'Parry', kind: 'parry', limb: 'R', line: 'high', t: [0.09, 0.08, 0.16], fx: ['block'], note: 'R parry (inside)' },
  slip: { name: 'Slip', kind: 'evade', line: 'high', t: [0.1, 0.14, 0.2], note: 'slip outside' },
  duck: { name: 'Duck', kind: 'evade', line: 'high', t: [0.14, 0.14, 0.24], note: 'duck' },
  shot: { name: 'Point-blank shot', kind: 'shot', limb: 'R', target: 'chest', line: 'mid', t: [0.6, 0.08, 0.4], react: 'fall', fx: ['shot', 'impactFlesh'], power: 1, note: 'R pistol, point blank, chest' }
};
const CHO_REACT = {
  snapBack: { name: 'head snaps back', dur: 0.5, head: [0, -0.35, 0], spine: [0, -0.1, 0], back: 0.06 },
  snapSide: { name: 'head turns with the hook', dur: 0.55, head: [0.15, 0, -0.55], spine: [0.1, 0, -0.18], back: 0.05 },
  snapUp: { name: 'chin up, up on the toes', dur: 0.6, head: [0, -0.55, 0], spine: [0, -0.2, 0], back: 0.08, up: 0.04 },
  fold: { name: 'folds over the blow', dur: 0.65, head: [0, 0.25, 0], spine: [0, 0.45, 0], back: 0.12, down: 0.08 },
  push: { name: 'driven back', dur: 0.75, head: [0, 0.2, 0], spine: [0, 0.35, 0], back: 0.45, down: 0.05, step: true },
  stagger: { name: 'staggers', dur: 0.9, head: [0.2, 0.1, -0.3], spine: [0.15, 0.2, -0.25], back: 0.35, step: true },
  fall: { name: 'falls', dur: 1.3, fall: true }
};
// the stage-combat gap: how far beside the target a staged blow passes, hidden along the lens (metres)
const CHO_GAP = 0.1;
const CHO_REACTION_T = 0.18;   // the shortest human reaction to a seen cue (about 180 to 200 ms): a defence needs its cue at least this early
const CHO_CUE = 0.3;           // the cue's length before a blow's wind-up (long enough for the partner's 0.18 s reaction)
/* ---------- landmarks on the partner ---------- */
function choMark(W, n) {
  const hd = W.subarray(LGB.head * 16, LGB.head * 16 + 16), at = (x, y, z) => lgPt(hd, x, y, z);
  switch (n) {
    case 'face': return at(0.11, 0, 0.06); case 'jaw': return at(0.08, 0, -0.02); case 'chin': return at(0.1, 0, -0.035);
    case 'chest': return curV3.add(curV3.lerp(lgaP(W, 'pelvis'), lgaP(W, 'neck'), 0.7), lgDir(W.subarray(LGB.chest * 16, LGB.chest * 16 + 16), 0.12, 0, 0));
    case 'belly': return curV3.add(curV3.lerp(lgaP(W, 'pelvis'), lgaP(W, 'neck'), 0.3), lgDir(W.subarray(LGB.spine * 16, LGB.spine * 16 + 16), 0.13, 0, 0));
    case 'ribs': return curV3.add(curV3.lerp(lgaP(W, 'pelvis'), lgaP(W, 'neck'), 0.5), lgDir(W.subarray(LGB.chest * 16, LGB.chest * 16 + 16), 0.02, -0.15, 0));
  }
  return lgaP(W, n);
}
/* ---------- a fight: fighters, footwork, exchanges ---------- */
// fighters: [{ name, model, cls, at: [x, y], face: index of the one they face (or a yaw), stance: 'orthodox' }]
// steps: [{ who, t, dir: 'in' | 'back' | 'left' | 'right', len }]; ex: [{ t (contact), a, move, b, def (block | parry | slip | duck | null), offline }]
function choFight(o) { return Object.assign({ fighters: [], steps: [], ex: [], dur: 4, camSide: 1, made: CHO.made++ }, o); }
// the feet over time: each foot planted at a place until a step lifts it, carries it (an arc 6 cm high) and puts it down
// (in a step the foot rises before it travels, and lands before it turns)
function choFeet(F, who, t) {
  const f = F.fighters[who]; if (!f._feet) choPlan(F);
  const sched = f._feet, at = (s) => { let cur = s.list[0]; for (const k of s.list) { if (t < k.t0) break; if (t <= k.t1) { const u = (t - k.t0) / (k.t1 - k.t0), uh = mimcEase(clamp((u - 0.15) / 0.7, 0, 1)), dy = Math.atan2(Math.sin(k.yaw - k.yaw0), Math.cos(k.yaw - k.yaw0)); return { p: curV3.lerp(k.from, k.p, uh), lift: Math.sin(u * Math.PI) * 0.11, yaw: k.yaw0 + dy * uh }; } cur = k; } return { p: cur.p, lift: 0, yaw: cur.yaw }; };
  return { L: at(sched.L), R: at(sched.R) };
}
// planning: initial feet from the stance; steps turned into foot moves (the lead foot first when advancing, the rear foot
// first when retreating, each foot about 0.18 s); a turn to face someone new re-places both feet for the new facing.
// Each planted foot keeps the direction it was put down in (a body can twist over its feet; the feet never spin in place).
function choPlan(F) {
  choActs(F);
  // a blow that drives someone back makes them step back (their feet carry them; nothing slides)
  if (!F._reactSteps) { F._reactSteps = true; for (const e of F.ex) { const m = CHO_MOVES[e.move]; if (e.def || !m.react) continue; const r = CHO_REACT[m.react]; if (r.step) { F.steps.push({ who: e.b, t: e.t + 0.04, dir: 'back', len: r.back * 0.8, react: true }); if (m.react === 'stagger') F.steps.push({ who: e.b, t: e.t + 0.4, dir: 'back', len: 0.15, react: true }); } } }
  const pos = F.fighters.map(f => f.at.slice()), faceOf = (i, t) => { const f = F.fighters[i]; let j = f.face == null ? (i === 0 ? 1 : 0) : f.face; if (f.faces) for (const [t0, jj] of f.faces) if (t >= t0) j = jj; return j; }, yawP = (i, t) => { const j = faceOf(i, t); return Math.atan2(pos[j][1] - pos[i][1], pos[j][0] - pos[i][0]); };
  const place = (c, yaw) => { const co = Math.cos(yaw), sn = Math.sin(yaw), w = 0.16, fwd = 0.2; return { L: [c[0] + co * fwd - sn * w, c[1] + sn * fwd + co * w, 0], R: [c[0] - co * fwd + sn * w, c[1] - sn * fwd - co * w, 0] }; };
  F.fighters.forEach((f, i) => { const yaw = yawP(i, 0), pl = place(f.at, yaw); f._feet = { L: { list: [{ t0: -1, t1: -1, from: pl.L, p: pl.L, yaw0: yaw + 0.25, yaw: yaw + 0.25 }] }, R: { list: [{ t0: -1, t1: -1, from: pl.R, p: pl.R, yaw0: yaw - 0.55, yaw: yaw - 0.55 }] } }; });
  // the turns: whenever someone's facing changes, a turning step
  const steps = F.steps.slice(); F.fighters.forEach((f, i) => { if (f.faces) f.faces.forEach(([t0], k) => { if (k) steps.push({ who: i, t: t0, dir: 'turn' }); }); });
  for (const st of steps.sort((a, b) => a.t - b.t)) {
    const f = F.fighters[st.who], yaw = yawP(st.who, st.t + 0.01), last = ft => f._feet[ft].list[f._feet[ft].list.length - 1];
    if (st.dir === 'turn') { const pl = place(pos[st.who], yaw); ['R', 'L'].forEach((ft, k) => { const l = last(ft), t0 = st.t + k * 0.14; f._feet[ft].list.push({ t0: t0, t1: t0 + 0.2, from: l.p, p: pl[ft], yaw0: l.yaw, yaw: yaw + (ft === 'L' ? 0.25 : -0.55) }); }); continue; }
    const dir = st.dir === 'in' ? [Math.cos(yaw), Math.sin(yaw)] : st.dir === 'back' ? [-Math.cos(yaw), -Math.sin(yaw)] : st.dir === 'left' ? [-Math.sin(yaw), Math.cos(yaw)] : [Math.sin(yaw), -Math.cos(yaw)];
    const len = st.len || 0.3, order = st.dir === 'back' ? ['R', 'L'] : st.dir === 'right' ? ['R', 'L'] : ['L', 'R'];
    order.forEach((ft, k) => { const l = last(ft), t0 = st.t + k * 0.12; f._feet[ft].list.push({ t0: t0, t1: t0 + 0.18, from: l.p, p: [l.p[0] + dir[0] * len, l.p[1] + dir[1] * len, 0], yaw0: l.yaw, yaw: yaw + (ft === 'L' ? 0.25 : -0.55) }); });
    pos[st.who] = [pos[st.who][0] + dir[0] * len, pos[st.who][1] + dir[1] * len];
  }
}
// where a fighter faces: toward the one it faces (from its own and their positions at t)
function choYaw(F, i, t, initial) {
  const f = F.fighters[i]; if (f.faceYaw != null) return f.faceYaw;
  // faces: [[t, who], ...]: it turns to face whoever it fights next, over 0.3 s
  let j = f.face == null ? (i === 0 ? 1 : 0) : f.face, jPrev = j, tSw = -9; if (f.faces) for (const [t0, jj] of f.faces) if (t >= t0) { jPrev = j; j = jj; tSw = t0; }
  const a = initial || !f._feet ? f.at : choCenter(F, i, t), to = (k) => { const b = initial || !F.fighters[k]._feet ? F.fighters[k].at : choCenter(F, k, t); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
  const y1 = to(j); if (jPrev === j || t - tSw >= 0.3) return y1; const y0 = to(jPrev), d = Math.atan2(Math.sin(y1 - y0), Math.cos(y1 - y0)); return y0 + d * mimcEase((t - tSw) / 0.3);
}
function choCenter(F, i, t) { const ft = choFeet(F, i, t); return [(ft.L.p[0] + ft.R.p[0]) / 2, (ft.L.p[1] + ft.R.p[1]) / 2]; }
/* ---------- the guard ---------- */
// fists up (the lead hand forward at the chin, the rear hand by the cheek), elbows in, chin down, knees soft
const CHO_GUARD = { L: [0.3, 0.1, 0.24], R: [0.2, -0.09, 0.27] };
const CHO_FIST_ROT = { L: [0.15, -1.45, 0.0], R: [-0.15, -1.45, 0.0] };
// the bottle: on the crate until the grab, then in the hand (LEGEND's grasp), let go when the pistol comes out
function choBottleGrip(F) { return F._bgr || (F._bgr = lgoGrasp('bottle', { side: 'R', app: [-1, 0.3, 0] })); }
function choBottleM0(F) { const b = F.bottleAt || [0.35, -0.75, 0.18]; return lgMul(lgM4(), lgTR(b[0], b[1], b[2]), lgRot(lgM4(), 0, 0, 0)); }
function choGrabT(F, i) { const e = F.ex.find(x => x.a === i && x.move === 'grab'); return e ? e.t : null; }
function choDropT(F, i) { const e = F.ex.find(x => x.a === i && x.move === 'shot'); return e ? e.t - CHO_MOVES.shot.t[0] : null; }
function choHolds(F, i, t) { const g = choGrabT(F, i), d = choDropT(F, i); return g != null && t >= g && (d == null || t < d); }
/* ---------- performing ---------- */
// a move's progress at t for a move with contact at tc: 0 at the start, 1 at contact, held, back to 0 after recovery
function choK(m, tc, t) { const [a, h, r] = m.t, t0 = tc - a, t2 = tc + h, t3 = t2 + r; if (t <= t0 || t >= t3) return 0; if (t < tc) return mimcEase((t - t0) / a); if (t <= t2) return 1; return 1 - mimcEase((t - t2) / r); }
// the exchanges, expanded into what each fighter does and when (attacks, defences, reactions)
function choActs(F) {
  if (F._acts) return F._acts; const acts = F.fighters.map(() => []);
  for (const e of F.ex) {
    const m = CHO_MOVES[e.move]; acts[e.a].push({ kind: 'attack', move: e.move, m: m, tc: e.t, b: e.b, e: e });
    if (e.def) { const dm = CHO_MOVES[e.def]; acts[e.b].push({ kind: 'defend', move: e.def, m: dm, tc: e.t - (dm.t[1] * 0.3), vs: e, e: e }); }
    else if (m.react) acts[e.b].push({ kind: 'react', r: CHO_REACT[m.react], name: m.react, t0: e.t, e: e, from: e.a });
  }
  F._acts = acts; return acts;
}
// a fighter's pose at t (its partner's pose at the contact times is needed for aim: solved once and kept)
function choPose(F, i, t) {
  const f = F.fighters[i], P = lgPose(); lgPoseReset(P);
  const ft = choFeet(F, i, t), yaw = choYaw(F, i, t), cx = (ft.L.p[0] + ft.R.p[0]) / 2, cy = (ft.L.p[1] + ft.R.p[1]) / 2;
  P.root = [cx, cy, 0, yaw]; lgBase(P, { lean: 0.08, crouch: 0.07 });
  // the feet where the plan puts them (world), toes along the facing, the rear foot turned out
  const fM = (y) => lgRot(lgM4(), 0, 0, y);
  const fT = (y, lift) => fM(y);   // (a lifted foot stays level: in the crouch the shin's lean already bends the ankle near its range)
  P.ik.footL = { sp: 'world', p: [ft.L.p[0], ft.L.p[1], LG_FOOT_Z + ft.L.lift], M: fT(ft.L.yaw, ft.L.lift), pole: [Math.cos(ft.L.yaw - 0.25), Math.sin(ft.L.yaw - 0.25), 0.15] };
  P.ik.footR = { sp: 'world', p: [ft.R.p[0], ft.R.p[1], LG_FOOT_Z + ft.R.lift], M: fT(ft.R.yaw, ft.R.lift), pole: [Math.cos(ft.R.yaw + 0.15), Math.sin(ft.R.yaw + 0.15), 0.15] };
  lgJadd(P, 'pelvis', 0, 0, -0.35); lgJadd(P, 'chest', 0, 0, 0.12); lgJadd(P, 'neck', 0, 0.06, 0.16); lgJadd(P, 'head', 0, 0.06, 0.06);   // bladed: the lead side forward, the chin down, the eyes on the partner
  const hand = { L: CHO_GUARD.L.slice(), R: CHO_GUARD.R.slice() }, hrot = { L: CHO_FIST_ROT.L.slice(), R: CHO_FIST_ROT.R.slice() }, world = {};
  P.grip.L = 'fist'; P.grip.R = 'fist';
  const acts = choActs(F)[i];
  for (const a of acts) {
    if (a.kind === 'attack') {
      const m = a.m;
      // the cue (stage combat's cue - reaction - action): a small, readable preparation before the blow (the shoulder or the
      // knee loads, the weight settles), early enough for the partner to answer it
      const tcue = a.tc - m.t[0] - CHO_CUE, kc = t > tcue && t < a.tc - m.t[0] ? Math.sin((t - tcue) / CHO_CUE * Math.PI) : 0;
      if (kc) { const sd = m.limb === 'R' ? 1 : -1; lgJadd(P, 'chest', 0, 0.04 * kc, -0.12 * sd * kc); P.t[LGB.pelvis * 3 + 2] -= 0.02 * kc; }
      const k = choK(m, a.tc, t); if (!k) continue;
      if (m.kind === 'grab') {
        // reaching for the bottle on the crate and taking it in LEGEND's grasp
        const gr = choBottleGrip(F), H = lgMul(lgM4(), choBottleM0(F), gr.S), guardW = choChestPt(F, i, t, hand.R), tg = [H[12], H[13], H[14]];
        world.R = curV3.lerp(guardW, tg, k); if (t >= a.tc - 0.05) { P.grip.R = gr.g; hrot.R = null; F._bottleHand = i; } continue;
      }
      if (m.kind === 'strike' || m.kind === 'shot') {
        const tgt = choTarget(F, a), s = m.limb, guardW = choChestPt(F, i, t, hand[s]);
        // the body behind the blow: the hips and shoulders turn into it, the weight goes forward
        const turn = (s === 'R' ? 1 : -0.5) * m.power * 0.5 * k; lgJadd(P, 'pelvis', 0, 0, turn * 0.6); lgJadd(P, 'chest', 0, 0.05 * k, turn * 0.6); P.t[LGB.pelvis * 3] += (0.05 * m.power + choLunge(F, i, a)) * k;
        let p = curV3.lerp(guardW, tgt, k);
        if (m.path === 'hook') { const side = choSide(P, s), arc = Math.sin(k * Math.PI) * 0.18; p = curV3.add(p, curV3.mul(side, arc)); }
        if (m.path === 'upper') p[2] -= Math.sin(k * Math.PI) * 0.15;
        world[s] = p;   // (a bottle swing lands with the bottle's body, held in the fist: the hand goes to the mark like a punch)
        if (m.kind === 'shot') { P.grip.R = 'pistol'; P.pistol.at = 'handR'; }
      } else if (m.kind === 'kick') {
        // the knee comes up, the foot snaps out to the target, back, and down where it was
        const tgt = choTarget(F, a), s = m.limb, fp = ft[s].p, kn = curV3.lerp([fp[0], fp[1], 0.6], tgt, 0.35), ch = clamp(k * 1.6, 0, 1), ext = clamp(k * 1.6 - 0.6, 0, 1);
        const f0 = [fp[0], fp[1], LG_FOOT_Z], up = ch * ch * (3 - 2 * ch), fwd = ch * ch;   // (the foot leaves the ground upward first, then travels)
        let p = curV3.lerp([f0[0] + (kn[0] - f0[0]) * fwd, f0[1] + (kn[1] - f0[1]) * fwd, f0[2] + (kn[2] - f0[2]) * up], tgt, ext);
        if (m.path === 'round') { const side = choSide(P, 'R'); p = curV3.add(p, curV3.mul(side, Math.sin(ext * Math.PI) * 0.25)); lgJadd(P, 'pelvis', 0, 0, 0.9 * ch); }
        const fy = ft[s].yaw + Math.atan2(Math.sin(yaw - ft[s].yaw), Math.cos(yaw - ft[s].yaw)) * up; P.ik['foot' + s] = { sp: 'world', p: p, M: fM(fy), pole: [Math.cos(yaw), Math.sin(yaw), 0.8] }; lgJadd(P, 'spine', 0, -0.2 * ch, 0); lgJadd(P, 'chest', 0, -0.1 * ch, 0);
        P._oneLeg = { s: s === 'R' ? 'L' : 'R', k: Math.min(1, ch * 3) };   // (balanced over the standing foot below, once the pose is complete)
      }
    } else if (a.kind === 'defend') {
      const m = a.m, k = choK(m, a.tc, t); if (!k) continue; const s = m.limb;
      if (m.kind === 'block') { const H = choMarkSelf(F, i, t, 'face'), up = [0, 0, 0.14]; world[s] = curV3.lerp(choChestPt(F, i, t, hand[s]), curV3.add(H, curV3.add(up, choFwd(yaw, 0.08))), k); hrot[s] = [0.1, -0.2, s === 'L' ? 1.4 : -1.4]; }
      else if (m.kind === 'parry') { const sp = choStrikePt(F, a.vs, a.vs.t - 0.03); if (sp) world[s] = curV3.lerp(choChestPt(F, i, t, hand[s]), sp, k * 0.85); }
      else if (a.move === 'slip') { lgJadd(P, 'spine', 0.18 * k, 0.05 * k, 0); lgJadd(P, 'chest', 0.22 * k, 0, 0); P.t[LGB.pelvis * 3 + 1] += 0.06 * k; }
      else if (a.move === 'duck') { P.t[LGB.pelvis * 3 + 2] -= 0.22 * k; lgJadd(P, 'spine', 0, 0.25 * k, 0); }
    } else if (a.kind === 'react') {
      const r = a.r, u = (t - a.t0) / r.dur; if (u < 0 || u > 1) { if (r.fall && u > 1) choFallen(P, 1); continue; }
      if (r.fall) { choFallen(P, u); continue; }
      const hit = Math.min(1, u * 6), rec = u < 0.25 ? 1 : 1 - mimcEase((u - 0.25) / 0.75), k = hit * rec;
      lgJadd(P, 'head', r.head[0] * k, r.head[1] * k, r.head[2] * k); lgJadd(P, 'neck', r.head[0] * k * 0.5, r.head[1] * k * 0.5, r.head[2] * k * 0.5); lgJadd(P, 'spine', r.spine[0] * k, r.spine[1] * k, r.spine[2] * k);
      P.t[LGB.pelvis * 3] -= (r.back || 0) * (r.step ? 0.25 * k : Math.min(1, u * 3) * rec); P.t[LGB.pelvis * 3 + 2] += ((r.up || 0) - (r.down || 0)) * k;   // (the feet take the rest of a driving blow)
    }
  }
  const holds = choHolds(F, i, t);
  if (holds) { P.grip.R = choBottleGrip(F).g; if (!world.R) hrot.R = [0.0, -0.4, -0.5]; }
  for (const s of ['L', 'R']) {
    const p = world[s] || choChestPt(F, i, t, hand[s], P); let M = hrot[s] ? choFistM(yaw, hrot[s]) : null;
    if (s === 'R' && !hrot.R) { const H = lgMul(lgM4(), choBottleM0(F), choBottleGrip(F).S); M = H.slice(); M[12] = M[13] = M[14] = 0; }   // (the hand turned to the bottle as LEGEND would hold it)
    P.ik['hand' + s] = { sp: 'world', p: p, M: M, pole: lgDir(lgRootM(P), -0.3, s === 'L' ? 0.8 : -0.8, -0.6) };
  }
  // on one leg (a kick): the hips move until the centre of mass is over the standing foot (two corrections)
  if (P._oneLeg && P._oneLeg.k > 0.02) for (let it = 0; it < 2; it++) {
    const W = lgmSolve(P), c = lgaCOM(W).c, sf = P._oneLeg.s, heel = lgaMark(W, 'heel' + sf), tip = lgaMark(W, 'tip' + sf), goal = curV3.lerp(heel, tip, 0.45), dx = goal[0] - c[0], dy = goal[1] - c[1], co = Math.cos(yaw), sn = Math.sin(yaw);
    P.t[LGB.pelvis * 3] += (dx * co + dy * sn) * P._oneLeg.k; P.t[LGB.pelvis * 3 + 1] += (-dx * sn + dy * co) * P._oneLeg.k;
  }
  return P;
}
// a body lying on its back after a fall, part way (u 0..1): the knees give, the body tips back, the root goes down
function choFallen(P, u) { const k = mimcEase(clamp(u, 0, 1)); P.ik.footL = P.ik.footR = null; P.t[LGB.pelvis * 3 + 2] = -0.82 * k; P.t[LGB.pelvis * 3] = -0.55 * k; lgJ(P, 'pelvis', 0, -1.45 * k, 0); lgJadd(P, 'spine', 0, 0.1 * k, 0); lgJ(P, 'thighL', 0, -1.2 * k, 0.1); lgJ(P, 'thighR', 0, -1.0 * k, -0.1); lgJ(P, 'shinL', 0, 1.1 * k, 0); lgJ(P, 'shinR', 0, 0.6 * k, 0); P.ik.handL = P.ik.handR = null; lgArm(P, 'L', -0.3 * k, 0.6 * k, 0, 0.4, 0); lgArm(P, 'R', -0.2 * k, 0.7 * k, 0, 0.3, 0); P.grip.L = P.grip.R = 'relax'; }
// how far the body must move into a blow for the arm to reach (a jab from the edge of measure carries the weight forward):
// measured once at the moment of contact, the shoulder against the target
function choLunge(F, i, a) {
  const e = a.e; if (e._lunge != null) return e._lunge; e._lunge = 0;
  const m = a.m, tgt = choTarget(F, a), P = choBodyOnly(F, i, e.t), turn = (m.limb === 'R' ? 1 : -0.5) * m.power * 0.5; lgJadd(P, 'pelvis', 0, 0, turn * 0.6); lgJadd(P, 'chest', 0, 0.05, turn * 0.6); P.t[LGB.pelvis * 3] += 0.05 * m.power;
  const W = lgmSolve(P), sh = lgaP(W, 'arm' + m.limb), d = curV3.len(curV3.sub(tgt, sh)); e._lunge = clamp((d - 0.53) * 1.15, 0, 0.3); return e._lunge;
}
function choFwd(yaw, d) { return [Math.cos(yaw) * d, Math.sin(yaw) * d, 0]; }
function choSide(P, s) { const y = P.root[3]; return s === 'L' ? [-Math.sin(y), Math.cos(y), 0] : [Math.sin(y), -Math.cos(y), 0]; }
function choFistM(yaw, r) { return lgMul(lgM4(), lgRot(lgM4(), 0, 0, yaw), lgRot(lgM4(), r[0], r[1], r[2])); }
// a point given in a fighter's chest space, in the world (from its pose at t without the hands)
function choChestPt(F, i, t, p, P0) {
  const key = i + '|' + t.toFixed(4); let W = F._chest && F._chest.k === key ? F._chest.W : null;
  if (!W) { const P = P0 || choBodyOnly(F, i, t); W = lgmSolve(P); F._chest = { k: key, W: W }; }
  return lgPt(W.subarray(LGB.chest * 16, LGB.chest * 16 + 16), p[0], p[1], p[2]);
}
function choBodyOnly(F, i, t) { const f = F.fighters[i], P = lgPose(); lgPoseReset(P); const ft = choFeet(F, i, t), yaw = choYaw(F, i, t); P.root = [(ft.L.p[0] + ft.R.p[0]) / 2, (ft.L.p[1] + ft.R.p[1]) / 2, 0, yaw]; lgBase(P, { lean: 0.08, crouch: 0.07 }); lgJadd(P, 'pelvis', 0, 0, -0.35); lgJadd(P, 'chest', 0, 0, 0.12); return P; }
function choMarkSelf(F, i, t, n) { return choMark(lgmSolve(choBodyOnly(F, i, t)), n); }
// where a strike goes: its target on the partner as the partner stands at the moment of contact (defences and all), less
// the fist's own size; a blow that lands is staged a hand's breadth beside the face, away from the camera
function choTarget(F, a) {
  const e = a.e; if (e._tgt) return e._tgt; const m = a.m;
  if (e._busy) return choMark(lgmSolve(choBodyOnly(F, e.b, e.t)), m.target);   // (two blows at once: aim at the body as it stands)
  e._busy = true; let Wb; try { Wb = choWorldAt(F, e.b, e.t, true); } finally { e._busy = false; }
  let p = choMark(Wb, m.target);
  if (e.def === 'block') { const dWp = choWorldAt(F, e.b, e.t, false); p = curV3.lerp(lgaP(dWp, 'foreL'), lgaP(dWp, 'handL'), 0.55); }
  else if (e.def === 'slip' || e.def === 'duck') { const dW = choWorldAt(F, e.b, e.t, false); p = choMark(dW, m.target); p = curV3.add(p, e.def === 'duck' ? [0, 0, 0.2] : curV3.mul(choSideW(F, e.b, e.t), -0.12)); }
  else if (e.def === 'parry') { p = curV3.add(p, curV3.mul(choSideW(F, e.b, e.t), 0.15)); }
  // the gap along the lens: the camera stands on camSide of the line between the two; the blow passes behind the target from it
  if (!e.def && m.kind !== 'shot') { const A = F.fighters[e.a], ca = choCenter(F, e.a, e.t), cb = choCenter(F, e.b, e.t), d = curV3.norm([cb[0] - ca[0], cb[1] - ca[1], 0]), away = [d[1] * F.camSide, -d[0] * F.camSide, 0]; p = curV3.add(p, curV3.mul(away, e.offline == null ? CHO_GAP : e.offline)); }
  // the fist (or the foot) arrives at the surface, not inside it
  const from = choCenter(F, e.a, e.t), dir = curV3.norm([p[0] - from[0], p[1] - from[1], 0]); p = curV3.sub(p, curV3.mul(dir, m.kind === 'kick' ? 0.02 : m.kind === 'shot' ? 0.35 : 0.04));
  if (m.kind === 'kick' && m.contact === 'ball') p = curV3.add(curV3.sub(p, curV3.mul(dir, 0.135)), [0, 0, 0.055]);   // (a front kick lands with the ball of the foot: the ankle is aimed behind and above it; a roundhouse with the instep)
  e._tgt = p; return p;
}
function choSideW(F, i, t) { const y = choYaw(F, i, t); return [-Math.sin(y), Math.cos(y), 0]; }
// a fighter's world bones at t (cached); bare = without its own reactions (for aim)
function choWorldAt(F, i, t, bare) { F._wc = F._wc || new Map(); const k = i + '|' + t.toFixed(4) + '|' + (bare ? 1 : 0); let W = F._wc.get(k); if (!W) { W = lgmSolve(bare ? choPoseBare(F, i, t) : choPose(F, i, t)); F._wc.set(k, W); } return W; }
function choPoseBare(F, i, t) { const acts = F._acts, keep = acts[i]; acts[i] = keep.filter(a => a.kind !== 'react'); try { return choPose(F, i, t); } finally { acts[i] = keep; } }
// the striking hand's place at a moment (for a parry that meets it)
function choStrikePt(F, e, t) { const W = choWorldAt(F, e.a, t, false), s = CHO_MOVES[e.move].limb; return lgaP(W, 'hand' + s); }
/* ---------- as a performance (for LEGEND's runner, MIMATIC's director and the studio) ---------- */
function choPerf(F) {
  choActs(F); choPlan(F);
  const beats = F.ex.map(e => ({ t: e.t, name: F.fighters[e.a].name + ': ' + CHO_MOVES[e.move].name + (e.def ? ' (' + CHO_MOVES[e.def].name.toLowerCase() + ')' : '') }));
  const at = (t) => {
    const Ps = F.fighters.map((_, i) => choPose(F, i, t)), things = [];
    if (F.bottleAt) {
      const hi = F.fighters.findIndex((_, i) => choGrabT(F, i) != null), gT = hi >= 0 ? choGrabT(F, hi) : null, dT = hi >= 0 ? choDropT(F, hi) : null;
      if (gT == null || t < gT) things.push({ key: 'bottle', M: choBottleM0(F) });
      else { const tt = dT != null && t > dT ? dT : t, W = lgmSolve(hi >= 0 ? choPose(F, hi, tt) : Ps[0]), HW = W.subarray(LGB.handR * 16, LGB.handR * 16 + 16), M = lgMul(lgM4(), HW, lgInv(lgM4(), choBottleGrip(F).S));
        if (dT != null && t > dT) { const u = t - dT, z = Math.max(0.038, M[14] - 0.5 * 9.81 * u * u); const L = lgMul(lgM4(), lgTR(M[12], M[13], z), lgRot(lgM4(), z <= 0.04 ? Math.PI / 2 : 0, 0, 0)); things.push({ key: 'bottle', M: L }); } else things.push({ key: 'bottle', M: M }); }
      things.push({ key: 'crate', M: lgTR(F.crate[0], F.crate[1], 0) });
    }
    return { Ps: Ps, things: things };
  };
  return lgmPerf({ kind: 'fight', dur: F.dur, beats: beats, F: F, at: at });
}
// the fight sheet: two columns (attacker, defender) per exchange, with the counts
function choSheet(F) {
  const rows = []; let n = 0;
  for (const e of F.ex.slice().sort((a, b) => a.t - b.t)) { n++; const m = CHO_MOVES[e.move], d = e.def ? CHO_MOVES[e.def] : null; rows.push({ n: n, t: e.t, a: F.fighters[e.a].name, act: m.note, b: F.fighters[e.b].name, resp: d ? d.note : (m.react ? CHO_REACT[m.react].name : '') }); }
  return rows;
}
/* ---------- v3: phrases, rhythm, several attackers ---------- */
// compose a fight from phrases: each phrase is a burst of moves between two fighters; bursts are separated by pauses
// (circling, resetting); with several attackers they take turns, the one not fighting kept out of reach.
// plan: { fighters, phrases: [{ a, b, moves: ['jab', 'cross', ...], defs: [def | null per move], gap (s between moves) }], pause: [lo, hi] }
function choCompose(plan) {
  const F = choFight({ fighters: plan.fighters.map(f => Object.assign({}, f)), steps: [], ex: [], camSide: plan.camSide || 1 }), rng = curRng(plan.seed || 3);
  let t = plan.start || 0.6; const hero = plan.hero == null ? 0 : plan.hero, faces = [], pos = plan.fighters.map(f => f.at.slice()), measure = plan.measure || 1.05;
  let engaged = null;
  // a fighter walks to (or away from) the hero in steps of up to 0.4 m, the steps carried by its feet
  const walk = (who, t0, want) => { const d = Math.hypot(pos[hero][0] - pos[who][0], pos[hero][1] - pos[who][1]), need = d - want, dir = need > 0 ? 'in' : 'back', u = [(pos[hero][0] - pos[who][0]) / (d || 1), (pos[hero][1] - pos[who][1]) / (d || 1)]; let rest = Math.abs(need), tt = t0; while (rest > 0.03) { const len = Math.min(0.4, rest); F.steps.push({ who: who, t: tt, dir: dir, len: len }); pos[who][0] += u[0] * len * (dir === 'in' ? 1 : -1); pos[who][1] += u[1] * len * (dir === 'in' ? 1 : -1); rest -= len; tt += 0.36; } return tt; };
  F._trace = [];
  plan.phrases.forEach((ph, pi) => {
    const other = ph.a === hero ? ph.b : ph.a; F._trace.push([pi, +t.toFixed(2), pos.map(p => p.map(v => +v.toFixed(2)))]);
    if (other !== engaged) {
      // the one who was fighting backs off out of reach; the next comes into measure; the hero turns to face them
      if (engaged != null) walk(engaged, t - 0.9, 2.15);
      const tIn = walk(other, t - 0.9, measure); if (tIn > t - 0.1) t = tIn + 0.1;
      faces.push([Math.max(0, t - 0.6), other]); engaged = other;
    } else { const tIn = walk(other, t - 0.7, measure); if (tIn > t - 0.1) t = tIn + 0.1; }   // (back to measure after the last phrase pushed them apart)
    ph.moves.forEach((mv, k) => { const m = CHO_MOVES[mv], def = ph.defs ? ph.defs[k] : null; t += m.t[0]; F.ex.push({ t: t, a: ph.a, move: mv, b: ph.b, def: def || null, phrase: pi });
      // a blow that drives the partner back: the attacker follows them in before the next blow
      const r = !def && m.react ? CHO_REACT[m.react] : null; let gapT = m.t[1] + (ph.gap != null ? ph.gap : 0.12) + (k === ph.moves.length - 1 ? 0 : m.t[2] * 0.35);
      if (r && r.step) { const back = r.back * 0.8 + (m.react === 'stagger' ? 0.15 : 0), d = Math.hypot(pos[ph.b][0] - pos[ph.a][0], pos[ph.b][1] - pos[ph.a][1]) || 1, u = [(pos[ph.b][0] - pos[ph.a][0]) / d, (pos[ph.b][1] - pos[ph.a][1]) / d]; pos[ph.b] = [pos[ph.b][0] + u[0] * back, pos[ph.b][1] + u[1] * back];
        if (k < ph.moves.length - 1) { F.steps.push({ who: ph.a, t: t + m.t[1] + m.t[2] * 0.6, dir: 'in', len: back }); pos[ph.a] = [pos[ph.a][0] + u[0] * back, pos[ph.a][1] + u[1] * back]; gapT = Math.max(gapT, m.t[1] + m.t[2] * 0.6 + 0.42); } }
      t += gapT; });
    const last = CHO_MOVES[ph.moves[ph.moves.length - 1]]; t += last.t[2];
    t += (plan.pause ? plan.pause[0] + rng() * (plan.pause[1] - plan.pause[0]) : 1.0);
  });
  if (faces.length) F.fighters[hero].faces = faces;
  F._pos = pos; F.dur = t + 0.8; return F;
}
// who is engaged at t: an attacker within striking measure of the hero, or in the middle of a move against them
function choEngaged(F, t, hero) {
  hero = hero == null ? 0 : hero; const h = choCenter(F, hero, t); let n = 0;
  F.fighters.forEach((f, i) => { if (i === hero) return; const c = choCenter(F, i, t), d = Math.hypot(c[0] - h[0], c[1] - h[1]), busy = F.ex.some(e => (e.a === i || e.b === i) && t >= e.t - 0.35 && t <= e.t + 0.35); if (busy || d < 1.15) n++; });
  return n;
}
// the rhythm: the gaps between contacts; a burst's gaps are short, the pauses between them long
function choRhythm(F) { const ts = F.ex.map(e => e.t).sort((a, b) => a - b), gaps = ts.slice(1).map((t, i) => t - ts[i]); return { gaps: gaps, bursts: gaps.filter(g => g < 0.6).length, pauses: gaps.filter(g => g > 0.9).length }; }
/* ---------- v4: reading on camera ---------- */
// the camera CHOREO stages for: square to the line between the two fighters, on camSide, at a medium-wide distance
function choCam(F, e) { const ca = choCenter(F, e.a, e.t), cb = choCenter(F, e.b, e.t), mid = [(ca[0] + cb[0]) / 2, (ca[1] + cb[1]) / 2, 1.35], d = curV3.norm([cb[0] - ca[0], cb[1] - ca[1], 0]), n = [-d[1] * F.camSide, d[0] * F.camSide, 0], cam = lgCam(); mimcToCam(cam, mimcBody({ f: 35 })); cam.eye = curV3.add(mid, curV3.mul(n, 3.4)); cam.eye[2] = 1.45; cam.tgt = mid; return cam; }
// a staged hit seen from that camera: the real gap between fist and target, the gap on the picture (as metres at the target's distance)
function choReads(F, e) {
  const m = CHO_MOVES[e.move], Wa = choWorldAt(F, e.a, e.t, false), Wb = choWorldAt(F, e.b, e.t, false), fist = m.kind === 'kick' ? lgaP(Wa, m.contact === 'ball' ? 'toe' + m.limb : 'foot' + m.limb) : lgPt(Wa.subarray(LGB['hand' + m.limb] * 16, LGB['hand' + m.limb] * 16 + 16), 0, 0, -0.07), tgt = choMark(Wb, m.target), cam = choCam(F, e);
  const a = mimcProject(cam, fist, 1.85), b = mimcProject(cam, tgt, 1.85), dist = curV3.len(curV3.sub(tgt, cam.eye)), mpp = 2 * dist * Math.tan(cam.fov / 2) / 2;
  // the silhouette: how much of the striking limb's length shows across the picture
  const s0 = m.kind === 'kick' ? lgaP(Wa, 'thigh' + m.limb) : lgaP(Wa, 'arm' + m.limb), p0 = mimcProject(cam, s0, 1.85), L3 = curV3.len(curV3.sub(fist, s0)), L2 = Math.hypot((a.x - p0.x) * 1.85, a.y - p0.y) * mpp;
  return { gap3: curV3.len(curV3.sub(fist, tgt)), gap2: Math.hypot((a.x - b.x) * 1.85, a.y - b.y) * mpp, show: L2 / Math.max(1e-6, L3), inFrame: Math.abs(a.x) < 0.95 && Math.abs(b.x) < 0.95 && Math.abs(a.y) < 0.95 && Math.abs(b.y) < 0.95 };
}
/* ---------- v5: a whole fight ---------- */
// moves with things: a bottle taken from a crate (LEGEND's grasp) and swung; a pistol drawn for the last shot
CHO_MOVES.grab = { name: 'Grab the bottle', kind: 'grab', limb: 'R', t: [0.45, 0.15, 0.3], note: 'R takes the bottle off the crate', fx: [] };
CHO_MOVES.bottle = { name: 'Bottle swing', kind: 'strike', limb: 'R', target: 'face', line: 'high', path: 'hook', t: [0.18, 0.06, 0.28], react: 'stagger', fx: ['hit'], power: 1, note: 'R bottle, side of the head', with: 'bottle' };
// the fight in the alley: one against two, a bottle, and a point-blank shot to end it (a set-up, an escalation, a reversal, a climax)
function choAlleyFight(o) {
  o = o || {};
  const plan = { hero: 0, camSide: 1, seed: 7, pause: [0.9, 1.3], fighters: [{ name: 'Hero', at: [0, 0] }, { name: 'First', at: [1.05, 0.1] }, { name: 'Second', at: [-1.9, 1.2] }],
    phrases: [
      { a: 1, b: 0, moves: ['jab', 'cross'], defs: ['block', 'parry'] },                  // set-up: he takes their measure
      { a: 0, b: 1, moves: ['jab', 'cross', 'body'], defs: [null, 'block', null] },         // he answers
      { a: 2, b: 0, moves: ['hook', 'roundKick'], defs: ['duck', null] },                   // the second comes in: he is hurt (the reversal)
      { a: 0, b: 2, moves: ['grab', 'bottle', 'frontKick'], defs: [null, null, null] },      // he finds the bottle
      { a: 1, b: 0, moves: ['hook', 'uppercut'], defs: ['slip', 'block'] },                  // the first again
      { a: 0, b: 1, moves: ['cross', 'shot'], defs: [null, null] }                          // the climax: point blank
    ] };
  const F = choCompose(plan);
  // the crate stands by his right hand where he will be when he reaches for it (in front and to the side, out of the fight's line)
  const gT = F.ex.find(e => e.move === 'grab').t, c = choCenter(F, 0, gT - 0.5), y = choYaw(F, 0, gT - 0.5), fw = [Math.cos(y), Math.sin(y)], rt = [Math.sin(y), -Math.cos(y)];
  F.crate = [c[0] + fw[0] * 0.3 + rt[0] * 0.55, c[1] + fw[1] * 0.3 + rt[1] * 0.55, 0]; F.bottleAt = [F.crate[0], F.crate[1], 0.18];
  return F;
}
// the story's shape: the intensity of each exchange (how hard, whether it lands, how many are in it) over the fight
function choArc(F) { return F.ex.map(e => { const m = CHO_MOVES[e.move]; return { t: e.t, k: (m.power || 0.3) * (e.def ? 0.55 : 1) * (m.kind === 'shot' ? 1.6 : 1) + (e.phrase || 0) * 0.08 }; }); }
