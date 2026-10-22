/* evidence renders for the slice 12 course sheets (dev only) */
LG_MAKERS.ev_cyc = function (B) { lgBone(B, 'root'); const fl = lgMtl({ c: '#7a7c80', r: 0.85, w: 0.1, k: 0.2 }); lgMat(B, fl); lgPlane(B, [-12, -12, 0], [24, 0, 0], [0, 24, 0], 12, 12, 1);
  // the curved backdrop behind (a quarter cylinder round the -x side and both flanks), so a camera from the +x half sees a seamless wall
  for (let i = 0; i < 24; i++) { const a0 = Math.PI * 0.5 + i / 24 * Math.PI, a1 = Math.PI * 0.5 + (i + 1) / 24 * Math.PI, R = 9; for (let k = 0; k < 6; k++) { const z0 = k * 1.5, z1 = z0 + 1.5; lgPlane(B, [Math.cos(a0) * R, Math.sin(a0) * R, z0], [Math.cos(a1) * R - Math.cos(a0) * R, Math.sin(a1) * R - Math.sin(a0) * R, 0], [0, 0, z1 - z0], 1, 1, 1); } } };
function evGL() { if (!LGR.gl) { lgGLInit(); document.body.appendChild(LGR.cv); } vfxGLInit(); }
function evI() { const I = lgWorldNew(); for (let i = 0; i < LG_NB; i++) I.set(lgM4(), i * 16); return I; }
function evWfor(M) { const W = lgWorldNew(); for (let i = 0; i < LG_NB; i++) W.set(M, i * 16); return W; }
function evC2(w, h, bg) { let c = document.getElementById('c2'); if (!c) { c = document.createElement('canvas'); c.id = 'c2'; document.body.appendChild(c); } c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = bg || '#0d0f12'; g.fillRect(0, 0, w, h); return g; }
function evLabel(g, x, y, s, o) { o = o || {}; g.font = (o.size || 13) + 'px sans-serif'; const w = g.measureText(s).width; g.fillStyle = o.bg || 'rgba(0,0,0,0.55)'; g.fillRect(x, y, w + 12, (o.size || 13) + 9); g.fillStyle = o.col || '#ffe6a0'; g.fillText(s, x + 6, y + (o.size || 13) + 2); }
const EVM = {};
function evModel(key, cls) { const k = key + '|' + (cls || ''); return EVM[k] || (EVM[k] = lgModel(key, 0, cls || '')); }
function evThing(key) { const mk = LG_MAKERS['obj_' + key] ? 'obj_' + key : LG_MAKERS['set_' + key] ? 'set_' + key : null; return mk ? evModel(mk, '') : null; }
// the set and its light: 'room' (the warehouse), 'street' (the night avenue), 'plain' (a grey floor, studio light)
function evStage(kind, cam, center, o) {
  o = o || {}; const I = evI(), items = [];
  if (kind === 'room') { items.push({ m: evModel('mims_roomGround'), W: I, ground: true, noShadow: true, noRim: true }, { m: evModel('mims_room'), W: I, noShadow: true, noRim: true }); }
  else if (kind === 'street') { items.push({ m: evModel('mims_streetGround'), W: I, ground: true, noShadow: true, noRim: true, acc: [1, 0.3, 0.6], glow: 1 }, { m: evModel('mims_street'), W: I, noShadow: true, noRim: true, acc: [1, 0.3, 0.6], glow: 1 }); }
  else if (kind === 'plain') items.push({ m: evModel('floor'), W: I, ground: true });
  else if (kind === 'cyc') items.push({ m: evModel('ev_cyc'), W: I, noShadow: true });
  const c = center || [0, 0, 1];
  let S;
  if (kind === 'street') {
    const pr = mimsPracticals({ kind: 'street', night: true }).map(q => Object.assign({ d: Math.hypot(q.p[0] - c[0], q.p[1] - c[1]) }, q)).sort((a, b) => a.d - b.d).slice(0, 3);
    S = { key: { dir: [-0.4, 0.5, 0.75], col: [0.9, 0.95, 1.15] }, rim: { dir: [0.8, -0.4, 0.4], col: [0.9, 1.1, 1.5] }, sky: [0.03, 0.035, 0.05], gnd: [0.02, 0.02, 0.025], pts: [{ p: [c[0] + 1.5, c[1] + 1.8, c[2] + 0.8], r: 6, col: [0.6, 0.65, 0.8] }].concat(pr), fog: { col: [0.03, 0.04, 0.062], d: 0.035, h: 0.12, s: 1.5 }, wet: 0.8, expo: 1.25, clear: [0.012, 0.016, 0.026], refl: { on: true, z: 0, scale: 1 } };
  } else if (kind === 'room') {
    S = { key: { dir: [0.45, 0.55, 0.75], col: [1.7, 1.6, 1.45] }, rim: { dir: [-0.7, -0.4, 0.5], col: [0.7, 0.85, 1.1] }, sky: [0.07, 0.075, 0.085], gnd: [0.035, 0.035, 0.035], pts: MIMS_BULBS.map((p, i) => ({ p: p, r: i ? 9 : 5.5, col: mimvKelvin(2700).map(v => v * (i ? 1.0 : 1.4)) })).concat([{ p: [c[0] - 2, c[1] - 2.5, 2.2], r: 7, col: [0.5, 0.55, 0.65] }]), fog: { col: [0.04, 0.045, 0.05], d: 0.02, h: 0.1, s: 2 }, wet: 0.15, expo: 1.15, clear: [0.03, 0.035, 0.04] };
  } else if (kind === 'cyc') {
    // studio light from the camera: the key 40 degrees to one side and 40 up, a fill on the other side, a back light
    const cd = cam ? curV3.norm([cam.eye[0] - c[0], cam.eye[1] - c[1], 0]) : [1, 0, 0], rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), 0];
    const kd = curV3.norm(curV3.add(rot(cd, 0.7), [0, 0, 0.85])), fd = rot(cd, -0.9), bd = curV3.norm(curV3.add(rot(cd, Math.PI - 0.4), [0, 0, 0.9]));
    S = { key: { dir: kd, col: [2.3, 2.15, 1.95] }, rim: { dir: bd, col: [1.0, 1.1, 1.3] }, sky: [0.2, 0.21, 0.24], gnd: [0.09, 0.09, 0.09], pts: [{ p: [c[0] + fd[0] * 3, c[1] + fd[1] * 3, c[2] + 0.3], r: 7, col: [0.55, 0.58, 0.65] }], fog: { col: [0.3, 0.31, 0.33], d: 0.0, h: 0.1, s: 3 }, wet: 0, expo: 1.05, clear: [0.33, 0.34, 0.36] };
  } else {
    S = { key: { dir: [0.6, 0.5, 0.8], col: [2.2, 2.05, 1.85] }, rim: { dir: [-0.8, -0.3, 0.4], col: [0.8, 1.0, 1.3] }, sky: [0.2, 0.22, 0.27], gnd: [0.07, 0.065, 0.06], pts: [], fog: { col: [0.04, 0.045, 0.05], d: 0.0, h: 0.1, s: 3 }, wet: 0, expo: 1.1, clear: [0.06, 0.065, 0.075] };
  }
  S.cam = cam; S.items = items; S.time = 0; S.shadow = { on: true, c: [c[0], c[1], 0.8], r: o.shR || 2.6, size: 2048 };
  if (o.light) Object.assign(S, o.light);
  return S;
}
// frame a cloud of points: camera from azimuth / elevation (degrees), fov (vertical), aspect
function evFrame(pts, o) {
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (const p of pts) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
  const c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2], az = (o.az == null ? 60 : o.az) / CUR_DEG, el = (o.el == null ? 8 : o.el) / CUR_DEG, fov = o.fov || 0.55, asp = o.aspect || 1;
  const d = [Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el)];
  // the extent across the view and up it
  const right = curV3.norm([-d[1], d[0], 0]), up = curV3.cross(right, d).map(v => -v); let ex = 0, ey = 0, ez = 0;
  for (const p of pts) { const v = curV3.sub(p, c); ex = Math.max(ex, Math.abs(curV3.dot(v, right))); ey = Math.max(ey, Math.abs(curV3.dot(v, up))); ez = Math.max(ez, curV3.dot(v, d)); }
  const tv = Math.tan(fov / 2), dist = Math.max(ey / tv, ex / (tv * asp)) * (o.pad || 1.15) + ez;
  const cam = lgCam(); cam.fov = fov; cam.tgt = curV3.add(c, o.tgtOff || [0, 0, 0]); cam.eye = curV3.add(c, curV3.mul(d, dist)); if (o.eyeZ != null) cam.eye[2] = o.eyeZ; return cam;
}
function evRender(S, w, h, o) {
  o = o || {}; if (LGR.cv.width !== w || LGR.cv.height !== h) { LGR.cv.width = w; LGR.cv.height = h; }
  if (o.vx) { const fin = lgFBO('ev_fin', w, h, false); vxlRender(S, w, h, Object.assign({ out: fin }, o.vx)); if (o.post !== false) vfxPost(fin, w, h, Object.assign({ bloom: 3, bloomK: 0.45, th: 0.65, streak: 0, ca: 0.2, grain: 0.02, vig: 0.35, bars: 0, fade: 0, flash: 0, mb: 0, hal: 0.08, tone: 0.3 }, o.post || {}), 0); else vxlRender(S, w, h, Object.assign({}, o.vx, { out: null })); }
  else lgGLScene(S, w, h, null);
}
const evActorCls = ['attack', 'medic', 'defense', 'engineer', 'magic'];
// a performance (LEGEND's or CHOREO's) as 3D frames of the real characters from one camera
window.evPerf3D = async function (o) {
  await lgAtlasGet(o.T || 256); evGL();
  const pf = o.F ? choPerf(eval(o.F)) : o.effort ? lgmReach(Object.assign({}, o.args, { effort: o.effort })) : mkPerf(o), run = lgmRun(pf, o.fps || 60), times = o.times || pf.beats.map(b => b.t), n = times.length;
  const tw = o.tw || 300, th = o.th || 380, cols = o.cols || n, rows = Math.ceil(n / cols), pad = 4, g = evC2(cols * tw + (cols - 1) * pad, rows * th + (rows - 1) * pad);
  // the camera: one for the whole strip, framing everyone over the whole performance
  const pts = []; run.frames.forEach((f, i) => { if (i % 4) return; f.W.forEach(W => { for (const b of ['head', 'handL', 'handR', 'footL', 'footR', 'pelvis']) pts.push(lgaP(W, b)); pts.push(mimvMark(W, 'top')); }); });
  if (o.extraPts) for (const p of o.extraPts) pts.push(p);
  const cam = evFrame(pts, { az: o.az, el: o.el, fov: o.fov || 0.5, aspect: tw / th, pad: o.pad || 1.1 }); if (o.camEye) cam.eye = o.camEye; if (o.camTgt) cam.tgt = o.camTgt;
  const center = cam.tgt.slice(), out = [];
  times.forEach((t, i) => {
    const f = run.frames[Math.min(run.frames.length - 1, Math.round(t * run.fps))], S = evStage(o.set || 'cyc', cam, center, { shR: o.shR || 3 });
    f.W.forEach((W, a) => { const cls = (o.cls || evActorCls)[a % 5]; S.items.push({ m: evModel('operator', cls + '|idle'), W: W, acc: lgHex(LG_CLASS_BY[cls].col), glow: 0.4 }); });
    for (const thg of f.things) { const m = evThing(thg.key); if (m) S.items.push({ m: m, W: evWfor(thg.M) }); }
    if (o.table) S.items.push({ m: evModel('set_table'), W: evWfor(lgMul(lgM4(), lgTR(o.table[0], o.table[1], 0), lgRot(lgM4(), 0, 0, o.table[2] || 0))) });
    evRender(S, tw, th, { vx: o.vx === false ? null : { dof: false, fog: { rho: (o.set || 'cyc') === 'cyc' ? 0 : 0.01, H: 6, col: [0.04, 0.045, 0.05] }, vig: 0.15, look: o.look || 'identity' }, post: Object.assign({ bloomK: 0.25, th: 0.8, grain: 0.012, vig: 0.25, hal: 0.03 }, o.postO || {}) });
    const x = (i % cols) * (tw + pad), y = Math.floor(i / cols) * (th + pad); g.drawImage(LGR.cv, x, y, tw, th);
    const b = pf.beats.find(b2 => Math.abs(b2.t - t) < 1e-6); evLabel(g, x + 4, y + 4, t.toFixed(2) + ' s' + (b ? ' · ' + b.name : '') + (o.labels ? ' · ' + o.labels[i] : ''), { size: 12 });
    out.push(t);
  });
  return { dur: pf.dur, beats: pf.beats.map(b => [b.name, +b.t.toFixed(3)]), n: out.length };
};
// LEGEND v1: the body, front and side, with its joint centres marked and the proportion lines
window.evBody = async function (o) {
  await lgAtlasGet(o.T || 256); evGL(); const tw = o.tw || 380, th = o.th || 640, g = evC2(tw * 3 + 8, th);
  const P = lgPose(); lgPoseReset(P); lgBase(P, {}); const W = lgmSolve(P), out = {};
  [['front', 0], ['side', 90], ['three-quarter', 40]].forEach(([nm, az], i) => {
    const cam = lgCam(); cam.fov = 0.36; const d = 6.2; cam.eye = [Math.cos(az / CUR_DEG) * d, Math.sin(az / CUR_DEG) * d, 0.95]; cam.tgt = [0, 0, 0.92];
    const S = evStage('plain', cam, [0, 0, 1]); S.items.push({ m: evModel('operator', 'attack|idle'), W: W, acc: lgHex('#ff4b3e'), glow: 0.5 });
    if (i < 2) S.items.forEach(it => { if (it.m && it.m.key && it.m.key.startsWith('operator')) it.alpha = 1; });
    evRender(S, tw, th); g.drawImage(LGR.cv, i * (tw + 4), 0);
    if (i < 2) { // joint centres projected, the proportion ticks
      g.save(); g.translate(i * (tw + 4), 0); const asp = tw / th;
      const J = ['head', 'neck', 'armL', 'armR', 'foreL', 'foreR', 'handL', 'handR', 'pelvis', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR'];
      const pr = b => { const q = mimcProject(cam, lgaP(W, b), asp); return [(q.x * 0.5 + 0.5) * tw, (0.5 - q.y * 0.5) * th]; };
      g.strokeStyle = 'rgba(120,220,255,0.9)'; g.lineWidth = 2; for (const [a, b] of [['armR', 'foreR'], ['foreR', 'handR'], ['thighR', 'shinR'], ['shinR', 'footR'], ['armL', 'foreL'], ['foreL', 'handL'], ['thighL', 'shinL'], ['shinL', 'footL'], ['neck', 'pelvis'], ['armL', 'armR'], ['thighL', 'thighR']]) { const A = pr(a), Bp = pr(b); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(Bp[0], Bp[1]); g.stroke(); }
      for (const b of J) { const p = pr(b); g.fillStyle = '#6fe0ff'; g.beginPath(); g.arc(p[0], p[1], 4, 0, TAU); g.fill(); }
      // stature ticks (eighths of the height, the classical canon), with the floor and the top of the head
      const top = mimcProject(cam, [0, 0, 1.81], asp), bot = mimcProject(cam, [0, 0, 0], asp), yT = (0.5 - top.y * 0.5) * th, yB = (0.5 - bot.y * 0.5) * th;
      g.strokeStyle = 'rgba(255,230,160,0.7)'; g.lineWidth = 1; g.font = '11px sans-serif'; g.fillStyle = '#ffe6a0';
      for (let k = 0; k <= 8; k++) { const y = yT + (yB - yT) * k / 8; g.beginPath(); g.moveTo(tw - 46, y); g.lineTo(tw - 12, y); g.stroke(); if (k % 2 === 0) g.fillText((1.81 * (1 - k / 8)).toFixed(2) + ' m', tw - 92, y + 4); }
      g.restore();
    }
    evLabel(g, i * (tw + 4) + 6, 6, nm, { size: 13 });
  });
  out.stature = lgaP(W, 'head'); return out;
};
// LEGEND v1: reaching: the hand sent to targets round the body (spheres), each reached
window.evReach = async function (o) {
  await lgAtlasGet(o.T || 256); evGL(); const tw = o.tw || 300, th = o.th || 380, P0 = lgPose(); lgPoseReset(P0); lgStance(P0, 0.1, 0, 0); const sh = lgaP(lgmSolve(P0), 'armR'), tg = (o.dirs || [[0.8, -0.3, 0.3, 0.5], [0.9, -0.1, -0.35, 0.48], [0.4, -0.8, -0.5, 0.45], [0.5, -0.4, 0.9, 0.42], [0.95, 0.35, 0.05, 0.5]]).map(d => curV3.add(sh, curV3.mul(curV3.norm(d), d[3]))), g = evC2(tg.length * (tw + 4) - 4, th);
  const errs = [];
  tg.forEach((p, i) => {
    const P = lgPose(); lgPoseReset(P); lgStance(P, 0.1, 0, 0); P.ik.handR = { sp: 'world', p: p, pole: [-0.3, -0.8, -0.5] }; const W = lgmSolve(P);
    const pal = lgaP(W, 'handR'); errs.push(+(curV3.len(curV3.sub(pal, p)) * 1000).toFixed(2));
    const cam = lgCam(); cam.fov = 0.55; cam.eye = [2.6, -1.6, 1.4]; cam.tgt = [0.15, -0.15, 1.05];
    const S = evStage('plain', cam, [0, 0, 1]); S.items.push({ m: evModel('operator', 'attack|idle'), W: W, acc: lgHex('#ff4b3e'), glow: 0.5 });
    evRender(S, tw, th); g.drawImage(LGR.cv, i * (tw + 4), 0); { const q = mimcProject(cam, p, tw / th), x = i * (tw + 4) + (q.x * 0.5 + 0.5) * tw, y = (0.5 - q.y * 0.5) * th; g.strokeStyle = '#ffd23d'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 14, 0, TAU); g.moveTo(x - 22, y); g.lineTo(x - 8, y); g.moveTo(x + 8, y); g.lineTo(x + 22, y); g.moveTo(x, y - 22); g.lineTo(x, y - 8); g.moveTo(x, y + 8); g.lineTo(x, y + 22); g.stroke(); } evLabel(g, i * (tw + 4) + 4, 4, 'target ' + (i + 1) + ': off by ' + errs[i] + ' mm', { size: 12 });
  });
  return errs;
};
// LEGEND v2: hands fitted to the guns (close on the grip): the gun up, then the support hand close
window.evGrips = async function (o) {
  await lgAtlasGet(o.T || 256); evGL(); const list = o.list || [['m4a1', 'rifle_aim'], ['ak74m', 'rifle_aim'], ['mk17', 'rifle_low'], ['pp19', 'rifle_aim'], ['m17', 'aim_iso']], tw = o.tw || 260, th = o.th || 260, g = evC2(list.length * (tw + 4) - 4, th * 2 + 4);
  const res = [];
  list.forEach(([gun, clip], i) => {
    const pist = LG_GUN_DEF[gun].fam === 'p', gp = pist ? 'm4a1' : gun, gs = pist ? gun : 'm17', cls = 'attack|' + gp + '|' + gs, m = lgModel('operator', 0, cls); lgGunSet(gp, gs);
    const P = lgPose(); lgEvalClip(LG_ANIM_BY[clip], 0.35, P, { gp: gp, gs: gs, gun: pist ? null : gp }); P.mask = 1;
    const L = lgLocalNew(), W = lgWorldNew(); lgSolve(P, L, W, lgRootM(P)); lgGunSet(null, null);
    const hR = lgaP(W, 'handR'), hL = lgaP(W, 'handL');
    [[0, curV3.lerp(hR, hL, 0.5), [0.55, -0.8, 0.18], 0.95], [1, pist ? hR : hL, pist ? [0.35, -0.8, -0.25] : [0.65, 0.45, -0.5], 0.4]].forEach(([row, c, d, dist]) => {
      const cam = lgCam(); cam.fov = 0.5; cam.eye = curV3.add(c, curV3.mul(curV3.norm(d), dist)); cam.tgt = c;
      if (row) { const hb = pist ? 'handR' : 'handL', M = W.subarray(LGB[hb] * 16, LGB[hb] * 16 + 16), pc = lgPt(M, 0, 0, -0.07); cam.tgt = pc; cam.eye = curV3.add(pc, curV3.mul(curV3.norm(pist ? [0.35, -1, 0.25] : [0.25, -1, 0.3]), 0.42)); cam.fov = 0.55; }
      const S = evStage('plain', cam, c); S.items = S.items.filter(it => !it.ground); S.items.push({ m: m, W: W, acc: lgHex('#ff4b3e'), glow: 0.5 }); S.clear = [0.05, 0.055, 0.065]; S.key = { dir: curV3.norm(curV3.add(curV3.norm(d), [0.1, 0.2, 0.9])), col: [2.6, 2.45, 2.25] };
      evRender(S, tw, th); g.drawImage(LGR.cv, i * (tw + 4), row * (th + 4)); evLabel(g, i * (tw + 4) + 4, row * (th + 4) + 4, (row ? (pist ? 'firing hand on the grip (right side)' : 'support hand: fingers round the handguard') : gun.toUpperCase() + ' · ' + clip.replace('_', ' ')), { size: 12 });
    });
    res.push(gun);
  });
  return res;
};
// LEGEND v3: the anatomy before and after: the worst poses as the clips were made, and with the ranges kept
window.evRomFind = async function (o) {
  await lgAtlasGet(64); lgModel('operator', 1, 'attack'); const out = [], P = lgPose(), L = lgLocalNew(), W = lgWorldNew();
  LGA.on = false;
  for (const a of LG_ANIMS) { if (a.cat === 'Actors') continue; for (let k = 0; k <= 8; k++) { const t = a.dur * k / 8; lgEvalClip(a, t, P, {}); lgSolve(P, L, W, lgRootM(P)); const v = lgaOut(lgaJoints(W), 2); if (!v.length) continue; let worst = 0, wj = ''; for (const x of v) { const r = x[2], e = Math.max(r[0] - x[1], x[1] - r[1]); if (e > worst) { worst = e; wj = x[0]; } } out.push([a.id, +t.toFixed(2), wj, +worst.toFixed(1), v.length]); } }
  LGA.on = true; out.sort((a, b) => b[3] - a[3]); return out.slice(0, o.n || 30);
};
window.evRomPair = async function (o) {
  await lgAtlasGet(o.T || 256); evGL(); const list = o.list, tw = o.tw || 260, th = o.th || 360, g = evC2(list.length * (tw * 2 + 12) - 12, th + 40, '#0d0f12'), res = [];
  list.forEach(([id, t, joint], i) => {
    const a = LG_ANIM_BY[id];
    for (const [k, on] of [[0, false], [1, true]]) {
      LGA.on = on; const P = lgPose(); lgEvalClip(a, t, P, {}); P.mask = 1; const L = lgLocalNew(), W = lgWorldNew(); lgSolve(P, L, W, lgRootM(P)); const v = lgaOut(lgaJoints(W), 2); LGA.on = true;
      const pts = []; for (const b of ['head', 'handL', 'handR', 'footL', 'footR', 'pelvis']) pts.push(lgaP(W, b));
      const cam = evFrame(pts, { az: o.az == null ? 55 : o.az, el: 10, fov: 0.5, aspect: tw / th, pad: 1.25 });
      const S = evStage('plain', cam, cam.tgt); S.items.push({ m: evModel('operator', 'attack'), W: W, acc: lgHex('#ff4b3e'), glow: 0.5 });
      evRender(S, tw, th); const x = i * (tw * 2 + 12) + k * (tw + 2); g.drawImage(LGR.cv, x, 0);
      // the out-of-range joints marked red on the picture
      const asp = tw / th; g.save(); g.translate(x, 0);
      for (const q of v) { const b = q[0].replace(/^(shoulder\w*?|elbow\w*?|forearm\w*?|wrist\w*?|hip\w*?|knee\w*?|ankle\w*?|spine\w*?|neck\w*?)([LR]?)$/, (m0, j, s) => { const jj = j.match(/^[a-z]+/)[0]; return (LGA_JOINT_OF[jj] || 'chest') + s; }); if (LGB[b] == null) continue; const pq = mimcProject(cam, lgaP(W, b), asp); g.strokeStyle = '#ff4b3e'; g.lineWidth = 3; g.beginPath(); g.arc((pq.x * 0.5 + 0.5) * tw, (0.5 - pq.y * 0.5) * th, 13, 0, TAU); g.stroke(); }
      g.restore();
      g.fillStyle = k ? '#6fd08c' : '#ff8a7a'; g.font = '13px sans-serif'; g.fillText((k ? 'with anatomy: ' : 'as made: ') + v.length + ' joint' + (v.length === 1 ? '' : 's') + ' out of range', x + 6, th + 16);
      g.fillStyle = '#ccc'; g.font = '11px sans-serif'; g.fillText(v.slice(0, 2).map(q => q[0] + ' ' + q[1] + '° (' + q[2][0] + ' to ' + q[2][1] + ')').join(', ').slice(0, 52), x + 6, th + 32);
      res.push([id, t, on, v.length, v.slice(0, 3)]);
    }
    evLabel(g, i * (tw * 2 + 12) + 4, 4, (a.name || id) + ' at ' + t + ' s', { size: 12 });
  });
  return res;
};
// LEGEND v4: grasps, the hand alone on each thing, before and after it settles
window.evGrasp = async function (o) {
  await lgAtlasGet(o.T || 256); evGL(); const keys = o.keys, tw = o.tw || 240, th = o.th || 240, rows = o.settleRow ? 2 : 1, g = evC2(keys.length * (tw + 4) - 4, rows * (th + 4) - 4), res = [];
  keys.forEach((key, i) => {
    for (let r = 0; r < rows; r++) {
      const settle = rows === 2 ? r === 1 : true, info = await_objDev2({ key: key, settle: settle, w: tw, h: th, view: o.view || [0.6, 0.9, 0.3], dist: o.dist, fov: o.fov });
      g.drawImage(LGR.cv, i * (tw + 4), r * (th + 4)); evLabel(g, i * (tw + 4) + 4, r * (th + 4) + 4, (LGO_OBJ[key] ? LGO_OBJ[key].name : key) + (rows === 2 ? (settle ? ' · settled' : ' · first fit') : '') + ' · ' + (info.name || info.type), { size: 11 });
      if (info.pen != null) evLabel(g, i * (tw + 4) + 4, r * (th + 4) + th - 24, 'deepest ' + info.pen + ' mm · balance ' + info.bal, { size: 11, col: '#bfe8ff' });
      res.push([key, settle, info.type, info.pen, info.bal]);
    }
  });
  return res;
};
// objDev2 without the page plumbing (synchronous, draws to LGR.cv)
function await_objDev2(o) {
  const w = o.w || 400, h = o.h || 400; LGR.cv.width = w; LGR.cv.height = h;
  const s = o.side === 'L' ? 'L' : 'R', m = evModel('operator', o.cls || 'attack'), P = lgPose(); lgBase(P, {});
  const gr = lgoGrasp(o.key, { side: s, type: o.type, settle: o.settle !== false }); P.grip[s] = gr.g;
  lgHandTo(P, s, 'chest', [0.42, s === 'R' ? -0.12 : 0.12, 0.0], [0, -1.2, 0], s === 'R' ? [-0.3, -0.8, -0.4] : [-0.3, 0.8, -0.4]);
  const L = lgLocalNew(), W = lgWorldNew(); lgSolve(P, L, W, lgRootM(P));
  const keep = new Set(['fore' + s, 'hand' + s]); for (const [f] of LG_FINGERS) for (const x of ['', '2', '3']) keep.add(f + x + s); for (const x of ['', '2', '3']) keep.add('thb' + x + s);
  const hide = new Uint8Array(LG_NB_MAX); for (let i = 0; i < LG_NB; i++) if (!keep.has(LG_SKEL[i][0])) hide[i] = 1;
  const HW = W.subarray(LGB['hand' + s] * 16, LGB['hand' + s] * 16 + 16).slice(), OW = lgMul(lgM4(), HW, lgInv(lgM4(), gr.S)), om = evThing(o.key);
  const ax = (c) => [HW[c * 4], HW[c * 4 + 1], HW[c * 4 + 2]], X = ax(0), Y = ax(1), Z = ax(2), ps = s === 'R' ? 1 : -1;
  const bb = lgoBounds(LGO_OBJ[o.key]), cO = [(bb.lo[0] + bb.hi[0]) / 2, (bb.lo[1] + bb.hi[1]) / 2, (bb.lo[2] + bb.hi[2]) / 2];
  const pc0 = lgPt(HW, 0.0, 0.03 * ps, -0.075), oc = lgPt(OW, cO[0], cO[1], cO[2]), pc = [(pc0[0] + oc[0]) / 2, (pc0[1] + oc[1]) / 2, (pc0[2] + oc[2]) / 2];
  const v = o.view || [0.6, 0.9, 0.3], dir = curV3.norm([X[0] * v[0] + Y[0] * v[1] * ps + Z[0] * v[2], X[1] * v[0] + Y[1] * v[1] * ps + Z[1] * v[2], X[2] * v[0] + Y[2] * v[1] * ps + Z[2] * v[2]]), dist = o.dist || Math.max(0.3, Math.hypot(bb.hi[0] - bb.lo[0], bb.hi[1] - bb.lo[1], bb.hi[2] - bb.lo[2]) * 1.6);
  const cam = lgCam(); cam.eye = curV3.add(pc, curV3.mul(dir, dist)); cam.tgt = pc; cam.fov = o.fov || 0.62;
  const S = { cam: cam, items: [{ m: m, W: W, acc: lgHex('#ff4b3e'), glow: 0.4, hide: hide }, { m: om, W: evWfor(OW) }], key: { dir: curV3.norm(curV3.add(dir, [0.2, 0.3, 0.9])), col: [2.6, 2.4, 2.2] }, rim: { dir: curV3.mul(dir, -1), col: [0.9, 1.1, 1.4] }, sky: [0.32, 0.34, 0.4], gnd: [0.1, 0.1, 0.1], pts: [], fog: { col: [0.05, 0.055, 0.065], d: 0.0, h: 0.1, s: 3 }, wet: 0, time: 0, expo: 1.5, clear: [0.07, 0.075, 0.085] };
  lgGLScene(S, w, h, null);
  const st = gr.settle ? gr.settle.after : null;
  return { type: gr.type, name: gr.name, pen: st ? +(st.pen * 1000).toFixed(1) : null, bal: st ? +st.bal.toFixed(3) : null };
}
// MIMATIC v3: the lens: one subject, several focal lengths from one place; the same shot at f/1.4 and f/8; a dolly zoom
window.evLens = async function (o) {
  await lgAtlasGet(o.T || 256); evGL(); const tw = o.tw || 360, th = Math.round(tw / 1.85), items = o.items || 'focal', g = evC2((o.n || 4) * (tw + 4) - 4, th + 0);
  const P = lgPose(); lgPoseReset(P); P.root = [0, 0, 0, -Math.PI / 2]; lgBase(P, {}); lgBreath(P, 0.3, 1, 4.2); const W = lgmSolve(P);
  const P2 = lgPose(); lgPoseReset(P2); P2.root = [-0.55, 4.2, 0, -1.7]; lgBase(P2, {}); const W2 = lgmSolve(P2);
  const eyes = mimvMark(W, 'eyes'), res = [];
  const shoot = (lens, eye, tgt, i, label) => {
    const cam = lgCam(); mimcToCam(cam, Object.assign({ aspect: tw / th }, lens), eye, tgt);
    const S = evStage('street', cam, eyes); S.items.push({ m: evModel('operator', 'attack|idle'), W: W, acc: lgHex('#ff4b3e'), glow: 0.4 }, { m: evModel('operator', 'medic|idle'), W: W2, acc: lgHex(LG_CLASS_BY.medic.col), glow: 0.4 });
    evRender(S, tw, th, { vx: { lens: Object.assign({ aspect: tw / th }, lens), dof: true, dofMax: 30, fog: { rho: 0.02, H: 6, col: [0.04, 0.055, 0.085] }, vig: 0.25, look: 'tealOrange', lookK: 0.8 }, post: { bloomK: 0.6, th: 0.55 } });
    g.drawImage(LGR.cv, i * (tw + 4), 0); evLabel(g, i * (tw + 4) + 4, 4, label, { size: 12 }); res.push(label);
  };
  if (items === 'focal') { const eye = [eyes[0] + 0.5, eyes[1] - 3.2, eyes[2] - 0.05]; [18, 35, 50, 85].forEach((f, i) => { const A = mimcAOV(f, 's35', tw / th); shoot({ f: f, N: 2.8, focus: 3.2 }, eye, eyes, i, f + ' mm · ' + (A.h * CUR_DEG).toFixed(0) + '° across'); }); }
  else if (items === 'stop') { const eye = [eyes[0] + 0.45, eyes[1] - 2.35, eyes[2]]; [[1.4, 'f/1.4'], [2.8, 'f/2.8'], [5.6, 'f/5.6'], [11, 'f/11']].forEach(([N, l], i) => { const d = mimcDOF(85, N, 2.4, 0.025); shoot({ f: 85, N: N, focus: 2.4 }, eye, eyes, i, '85 mm ' + l + ' · sharp ' + d.near.toFixed(2) + ' to ' + (isFinite(d.far) ? d.far.toFixed(2) : '∞') + ' m'); }); }
  else if (items === 'dolly') { const fc = Math.PI * 0.85; const span = 0.62; [[24, 0], [35, 1], [60, 2], [100, 3]].forEach(([f, i]) => { const A = mimcAOV(f, 's35', tw / th), dist = span / 2 / Math.tan(A.v / 2), eye = [eyes[0] + dist * 0.2, eyes[1] - dist * 0.98, eyes[2]]; shoot({ f: f, N: 4, focus: dist }, eye, eyes, i, 'dolly zoom: ' + f + ' mm at ' + dist.toFixed(1) + ' m'); }); }
  return res;
};
// MIMATIC v4: the shot sizes, framed by the solver on a standing actor
window.evSizes = async function (o) {
  await lgAtlasGet(o.T || 256); evGL(); const sizes = o.sizes || ['ECU', 'CU', 'MCU', 'MS', 'MLS', 'FS', 'WS', 'EWS'], tw = o.tw || 300, th = Math.round(tw / 1.85), cols = o.cols || 4, g = evC2(cols * (tw + 4) - 4, Math.ceil(sizes.length / cols) * (th + 4) - 4);
  const P = lgPose(); lgPoseReset(P); P.root = [0, 0, 0, Math.PI]; lgBase(P, {}); lgBreath(P, 0.3, 1, 4.2); const W = lgmSolve(P), res = [];
  sizes.forEach((sz, i) => {
    const r = mimvFrame(W, { size: sz, az: 0.35, aspect: tw / th }), cam = r.cam, S = evStage('street', cam, mimvMark(W, 'eyes'));
    S.items.push({ m: evModel('operator', 'attack|idle'), W: W, acc: lgHex('#ff4b3e'), glow: 0.4 });
    const lens = mimcBody({ f: r.body.f, N: { ECU: 11, CU: 5.6, MCU: 4 }[sz] || 2.8, focus: curV3.len(curV3.sub(cam.eye, mimvMark(W, 'eyes'))), aspect: tw / th });
    evRender(S, tw, th, { vx: { lens: lens, dof: true, dofMax: 24, fog: { rho: 0.02, H: 6, col: [0.04, 0.055, 0.085] }, vig: 0.2, look: 'tealOrange', lookK: 0.8 }, post: { bloomK: 0.55, th: 0.55 } });
    const x = (i % cols) * (tw + 4), y = Math.floor(i / cols) * (th + 4); g.drawImage(LGR.cv, x, y); evLabel(g, x + 4, y + 4, sz + ' · ' + Math.round(r.body.f) + ' mm' + (MIMV_SIZES[sz] && MIMV_SIZES[sz].name ? ' · ' + MIMV_SIZES[sz].name : ''), { size: 12 }); res.push([sz, Math.round(r.body.f)]);
  });
  return res;
};
// MIMATIC v4: light designed for the subject: the four looks (key-to-fill ratio, colour temperatures)
window.evLooks = async function (o) {
  await lgAtlasGet(o.T || 256); evGL(); const looks = o.looks || ['highKey', 'standard', 'lowKey', 'noir'], tw = o.tw || 300, th = o.th || 360, g = evC2(looks.length * (tw + 4) - 4, th), res = [];
  const P = lgPose(); lgPoseReset(P); P.root = [0, 0, 0, Math.PI]; lgBase(P, {}); const W = lgmSolve(P);
  looks.forEach((lk, i) => {
    const r = mimvFrame(W, { size: 'MCU', az: 0.35, aspect: tw / th }), cam = r.cam, L = mimvLight(W, cam, MIMV_LOOKS[lk]);
    const S = evStage('plain', cam, mimvMark(W, 'eyes')); S.items = S.items.filter(it => !it.ground); S.items.push({ m: evModel('operator', 'attack|idle'), W: W, acc: lgHex('#ff4b3e'), glow: 0.2 });
    Object.assign(S, { key: L.key, rim: L.rim, pts: L.pts, sky: L.sky, gnd: L.gnd, clear: [0.02, 0.022, 0.026], expo: 1 });
    evRender(S, tw, th, { vx: { dof: false, vig: 0.15, look: 'identity' }, post: { bloomK: 0.2, th: 0.8, grain: 0.015 } });
    g.drawImage(LGR.cv, i * (tw + 4), 0); evLabel(g, i * (tw + 4) + 4, 4, lk + ' · ' + MIMV_LOOKS[lk].ratio + ':1 · key ' + MIMV_LOOKS[lk].kelvin[0] + ' K', { size: 12 }); res.push(lk);
  });
  return res;
};
// VFXRAY v4: the same frame through the looks
window.evLUT = async function (o) {
  await lgAtlasGet(o.T || 256); evGL(); const looks = o.looks || ['identity', 'tealOrange', 'bleach', 'dayForNight', 'sodium'], tw = o.tw || 300, th = Math.round(tw / 1.85), cols = o.cols || 5, g = evC2(cols * (tw + 4) - 4, Math.ceil(looks.length / cols) * (th + 4) - 4);
  const P = lgPose(); lgPoseReset(P); P.root = [0, 0, 0, Math.PI * 0.85]; lgBase(P, {}); const W = lgmSolve(P), r = mimvFrame(W, { size: 'MLS', az: 0.6, aspect: tw / th });
  looks.forEach((lk, i) => { const S = evStage('street', r.cam, mimvMark(W, 'eyes')); S.items.push({ m: evModel('operator', 'attack|idle'), W: W, acc: lgHex('#ff4b3e'), glow: 0.4 });
    evRender(S, tw, th, { vx: { dof: false, fog: { rho: 0.02, H: 6, col: [0.04, 0.055, 0.085] }, vig: 0.2, look: lk, lookK: 1 }, post: { bloomK: 0.55, th: 0.55 } }); const x = (i % cols) * (tw + 4), y = Math.floor(i / cols) * (th + 4); g.drawImage(LGR.cv, x, y); evLabel(g, x + 4, y + 4, 'look: ' + lk, { size: 12 }); });
  return looks;
};
// VFXRAY: on and off (the finishing pass, film, fog, rays) on one street frame; kinds: list of [label, vx options, post options]
window.evVX = async function (o) {
  await lgAtlasGet(o.T || 256); evGL(); const list = o.list, tw = o.tw || 400, th = Math.round(tw / 1.85), cols = o.cols || list.length, g = evC2(cols * (tw + 4) - 4, Math.ceil(list.length / cols) * (th + 4) - 4);
  const P = lgPose(); lgPoseReset(P); P.root = [0, 0, 0, Math.PI * 0.85]; lgBase(P, {}); const W = lgmSolve(P), r = mimvFrame(W, { size: o.size || 'FS', az: o.az == null ? 0.7 : o.az, aspect: tw / th });
  if (o.camEye) { r.cam.eye = o.camEye; r.cam.tgt = o.camTgt; }
  list.forEach(([label, vx, post, rain], i) => { const S = evStage('street', r.cam, mimvMark(W, 'eyes')); S.items.push({ m: evModel('operator', 'attack|idle'), W: W, acc: lgHex('#ff4b3e'), glow: 0.4 });
    if (rain) { vx = Object.assign({}, vx, { extra: () => vfxRain(S, { on: true, center: [r.cam.tgt[0] * 0.5 + r.cam.eye[0] * 0.5, r.cam.tgt[1] * 0.5 + r.cam.eye[1] * 0.5, 4], box: [13, 9, 9], fall: 9, wind: [0.5, 0.25], speed: 1, dim: 1, splash: { center: [r.cam.eye[0] * 0.3 + r.cam.tgt[0] * 0.7, r.cam.eye[1] * 0.3 + r.cam.tgt[1] * 0.7, 0], area: [9, 5.4], z: 0 }, density: 0.7 }, 1.3) }); }
    if (vx && vx.panDeg) { const pc = lgCam(); pc.fov = r.cam.fov; pc.eye = r.cam.eye.slice(); const d = curV3.sub(r.cam.tgt, r.cam.eye), a = vx.panDeg / CUR_DEG; pc.tgt = curV3.add(pc.eye, [d[0] * Math.cos(a) - d[1] * Math.sin(a), d[0] * Math.sin(a) + d[1] * Math.cos(a), d[2]]); lgCamUpd(pc, tw / th); vx = Object.assign({}, vx, { mb: true, prevVP: pc.VP.slice() }); }
    if (vx && vx.raysAt) vx = Object.assign({}, vx, { rays: { p: vx.raysAt, r: 22, col: [1.0, 0.75, 0.45], exposure: 0.35 } });
    evRender(S, tw, th, { vx: vx || { dof: false }, post: post === false ? false : post }); const x = (i % cols) * (tw + 4), y = Math.floor(i / cols) * (th + 4); g.drawImage(LGR.cv, x, y); evLabel(g, x + 4, y + 4, label, { size: 12 }); });
  return list.length;
};
// VFXRAY v5: the effects simulated and drawn: sparks off steel, smoke, debris, dust (frames at times after the cue)
window.evFX = async function (o) {
  await lgAtlasGet(o.T || 256); evGL(); const kinds = o.kinds || ['sparks', 'smoke', 'debris', 'dust'], times = o.times || [0.08, 0.6], tw = o.tw || 300, th = Math.round(tw * 0.75), g = evC2(kinds.length * (tw + 4) - 4, times.length * (th + 4) - 4), res = [];
  kinds.forEach((kd, i) => times.forEach((tt, j) => {
    const sim = vxsSys({ seed: 5 + i }), p = [0.6, -0.4, kd === 'dust' ? 0 : 0.9];
    if (kd === 'sparks') vxsSparks(sim, p, [0.2, 0.9, 0.4], 60); else if (kd === 'smoke') vxsSmoke(sim, [0.6, -0.4, 0.3], 24, { v: [0, 0, 0.5] }); else if (kd === 'debris') vxsDebris(sim, p, [0.3, 0.8, 0.3], 24); else vxsDust(sim, p, 32, { v: 1.8 });
    const tEnd = kd === 'smoke' ? tt * 4 : tt; let k = 0; while (k < tEnd - 1e-9) { const h = Math.min(1 / 240, tEnd - k); vxsStep(sim, h); k += h; }
    const cam = lgCam(); cam.fov = 0.55; cam.eye = [0.6 - 1.6, -0.4 - 0.7, kd === 'dust' ? 0.6 : 1.1]; cam.tgt = [0.6, -0.1, kd === 'smoke' ? 1.1 : kd === 'dust' ? 0.15 : 0.8];
    const S = evStage('street', cam, p); const T = { loc: { night: true } }, spr = mimsSprites(T, sim, S);
    evRender(S, tw, th, { vx: { dof: false, fog: { rho: 0.02, H: 6, col: [0.04, 0.055, 0.085] }, vig: 0.2, look: 'tealOrange', lookK: 0.7, extra: () => { const keep = VX.sp; VX.sp = spr; vfxSprites(S, true); vfxSprites(S, false); VX.sp = keep; } }, post: { bloomK: 0.7, th: 0.5 } });
    g.drawImage(LGR.cv, i * (tw + 4), j * (th + 4)); evLabel(g, i * (tw + 4) + 4, j * (th + 4) + 4, kd + ' · ' + tEnd.toFixed(2) + ' s after the cue · ' + sim.ps.filter(q => !q.dead).length + ' alive', { size: 12 }); res.push([kd, tEnd, spr.length]);
  }));
  return res;
};
// CHOREO v1: each move at its moment of contact, two fighters, from the side
window.evMoves = async function (o) {
  await lgAtlasGet(o.T || 256); evGL(); const moves = o.moves || ['jab', 'cross', 'hook', 'uppercut', 'body', 'frontKick', 'roundKick', 'block', 'duck', 'slip'], tw = o.tw || 240, th = o.th || 300, cols = o.cols || 5, g = evC2(cols * (tw + 4) - 4, Math.ceil(moves.length / cols) * (th + 4) - 4), res = [];
  moves.forEach((mv, i) => {
    const def = ['block', 'duck', 'slip', 'parry'].includes(mv), F = choFight({ fighters: [{ name: 'A', at: [0, 0] }, { name: 'B', at: [1.05, 0] }], dur: 1.6, steps: [], ex: [def ? { t: 0.8, a: 1, move: mv === 'duck' ? 'hook' : 'jab', b: 0, def: mv } : { t: 0.8, a: 0, move: mv, b: 1 }] });
    choPerf(F); const tc = 0.8, Ws = [choWorldAt(F, 0, tc), choWorldAt(F, 1, tc)];
    const pts = []; Ws.forEach(W => { for (const b of ['head', 'handL', 'handR', 'footL', 'footR', 'pelvis', 'toeL', 'toeR']) pts.push(lgaP(W, b)); pts.push(mimvMark(W, 'top')); });
    const cam = evFrame(pts, { az: -90, el: 6, fov: 0.42, aspect: tw / th, pad: 1.12 }), S = evStage('cyc', cam, cam.tgt);
    Ws.forEach((W, a) => S.items.push({ m: evModel('operator', evActorCls[a] + '|idle'), W: W, acc: lgHex(LG_CLASS_BY[evActorCls[a]].col), glow: 0.4 }));
    evRender(S, tw, th, { vx: { dof: false, vig: 0.15, look: 'identity' }, post: { bloomK: 0.2, th: 0.85, grain: 0.01 } }); const x = (i % cols) * (tw + 4), y = Math.floor(i / cols) * (th + 4); g.drawImage(LGR.cv, x, y);
    const m = CHO_MOVES[mv]; evLabel(g, x + 4, y + 4, m.name + ' · ' + m.t.map(v => Math.round(v * 1000)).join('/') + ' ms', { size: 12 }); res.push([mv, m.t]);
  });
  return res;
};
// CHOREO v2: the stage-combat gap: a blow at contact seen from the camera it was staged for (it lands) and from above (it misses by a hand)
window.evGap = async function (o) {
  await lgAtlasGet(o.T || 256); evGL(); const tw = o.tw || 380, th = o.th || 320, moves = o.moves || ['cross', 'hook'], g = evC2(moves.length * (tw * 2 + 12) - 12, th), res = [];
  moves.forEach((mv, mi) => {
    const F = choFight({ fighters: [{ name: 'A', at: [0, 0] }, { name: 'B', at: [1.05, 0] }], dur: 1.6, steps: [], camSide: 1, ex: [{ t: 0.8, a: 0, move: mv, b: 1 }] }); choPerf(F);
    const e = F.ex[0], Ws = [choWorldAt(F, 0, 0.8), choWorldAt(F, 1, 0.8)], m = CHO_MOVES[mv], fist = lgPt(Ws[0].subarray(LGB['hand' + m.limb] * 16, LGB['hand' + m.limb] * 16 + 16), 0, 0, -0.07), tgt = choMark(Ws[1], m.target), rd = choReads(F, e);
    const c1 = choCam(F, e), mid = curV3.lerp(fist, tgt, 0.5), c2 = lgCam(); c2.fov = 0.5; c2.eye = [mid[0] - 0.25, mid[1] + 0.05, mid[2] + 2.2]; c2.tgt = mid; c2.up = [1, 0, 0];
    [[c1, 'from its camera: it lands (' + (rd.gap2 * 100).toFixed(1) + ' cm on the picture)'], [c2, 'from above: ' + (rd.gap3 * 100).toFixed(1) + ' cm of air, along the lens']].forEach(([cam, label], k) => {
      if (k === 0) { c1.fov = 0.36; const dd = curV3.norm(curV3.sub(c1.tgt, c1.eye)); c1.tgt = mid; c1.eye = curV3.sub(mid, curV3.mul(dd, 2.6)); }
      const S = evStage('cyc', cam, mid); Ws.forEach((W, a) => S.items.push({ m: evModel('operator', evActorCls[a] + '|idle'), W: W, acc: lgHex(LG_CLASS_BY[evActorCls[a]].col), glow: 0.4 }));
      evRender(S, tw, th, { vx: { dof: false, vig: 0.15, look: 'identity' }, post: { bloomK: 0.2, th: 0.85, grain: 0.01 } }); const x = mi * (tw * 2 + 12) + k * (tw + 2); g.drawImage(LGR.cv, x, 0);
      const pa = mimcProject(cam, fist, tw / th), pb = mimcProject(cam, tgt, tw / th), P = q => [x + (q.x * 0.5 + 0.5) * tw, (0.5 - q.y * 0.5) * th], A = P(pa), B2 = P(pb);
      g.strokeStyle = '#ffd23d'; g.lineWidth = 2; g.beginPath(); g.arc(A[0], A[1], 6, 0, TAU); g.stroke(); g.strokeStyle = '#6fe0ff'; g.beginPath(); g.arc(B2[0], B2[1], 6, 0, TAU); g.stroke(); if (k) { g.strokeStyle = '#ffffff'; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B2[0], B2[1]); g.stroke(); g.setLineDash([]); }
      evLabel(g, x + 4, 4, m.name + ' · ' + label, { size: 12 });
    });
    res.push([mv, +(rd.gap3 * 100).toFixed(1), +(rd.gap2 * 100).toFixed(1)]);
  });
  return res;
};
// the finished film: frames of the take (the board, the director, the shoot)
window.evFilm = async function (o) { return c2shoot(o); };
window.evHandDbg = async function (o) {
  await lgAtlasGet(128); evGL(); const views = o.views, tw = 300, th = 300, g = evC2(views.length * 304, th);
  const gp = o.gp || 'm4a1', cls = 'attack|' + gp + '|m17', m = lgModel('operator', 0, cls); lgGunSet(gp, 'm17');
  const P = lgPose(); lgEvalClip(LG_ANIM_BY[o.clip || 'rifle_aim'], 0.35, P, { gp: gp, gs: 'm17', gun: gp }); P.mask = 1; if (o.off) LGH.on = false;
  const L = lgLocalNew(), W = lgWorldNew(); lgSolve(P, L, W, lgRootM(P)); lgGunSet(null, null); LGH.on = true;
  const hL = lgaP(W, 'handL'), M = W.subarray(LGB.handL * 16, LGB.handL * 16 + 16), pc = lgPt(M, 0, 0, -0.07);
  views.forEach((d, i) => { const cam = lgCam(); cam.fov = 0.55; cam.tgt = pc; cam.eye = curV3.add(pc, curV3.mul(curV3.norm(d), 0.45)); const S = evStage('plain', cam, pc); S.items = []; S.items.push({ m: m, W: W, acc: lgHex('#ff4b3e'), glow: 0.5 }); S.clear = [0.2, 0.22, 0.25]; S.key = { dir: curV3.norm(curV3.add(curV3.norm(d), [0, 0, 0.8])), col: [2.6, 2.45, 2.25] }; evRender(S, tw, th); g.drawImage(LGR.cv, i * 304, 0); evLabel(g, i * 304 + 4, 4, JSON.stringify(d), { size: 11 }); });
  return { grip: P.grip.L };
};

// LEGEND v2: the fit on and off: the fingers left where the clip put them, and closed until they touch the gun
window.evGripFit = async function (o) {
  await lgAtlasGet(o.T || 256); evGL(); const list = o.list || [['m4a1', 'rifle_aim', 'L'], ['ak74m', 'rifle_aim', 'L'], ['m17', 'aim_iso', 'R']], tw = o.tw || 280, th = o.th || 280, g = evC2(list.length * (tw * 2 + 12) - 12, th);
  list.forEach(([gun, clip, side], i) => {
    const pist = LG_GUN_DEF[gun].fam === 'p', gp = pist ? 'm4a1' : gun, gs = pist ? gun : 'm17', m = lgModel('operator', 0, 'attack|' + gp + '|' + gs);
    [false, true].forEach((on, k) => {
      lgGunSet(gp, gs); LGH.on = on; const P = lgPose(); lgEvalClip(LG_ANIM_BY[clip], 0.35, P, { gp: gp, gs: gs, gun: pist ? null : gp }); P.mask = 1;
      const L = lgLocalNew(), W = lgWorldNew(); lgSolve(P, L, W, lgRootM(P)); lgGunSet(null, null); LGH.on = true;
      const M = W.subarray(LGB['hand' + side] * 16, LGB['hand' + side] * 16 + 16), pc = lgPt(M, 0, 0, -0.07), cam = lgCam(); cam.fov = 0.55; cam.tgt = pc; cam.eye = curV3.add(pc, curV3.mul(curV3.norm(pist ? [0.35, -1, 0.25] : [0.25, -1, 0.3]), 0.42));
      const S = evStage('plain', cam, pc); S.items = [{ m: m, W: W, acc: lgHex('#ff4b3e'), glow: 0.5 }]; S.clear = [0.16, 0.18, 0.21]; S.key = { dir: curV3.norm([0.3, -0.7, 0.9]), col: [2.6, 2.45, 2.25] };
      evRender(S, tw, th); const x = i * (tw * 2 + 12) + k * (tw + 2); g.drawImage(LGR.cv, x, 0); evLabel(g, x + 4, 4, gun.toUpperCase() + (on ? ' · fitted: closed to the metal' : ' · as the clip posed it'), { size: 12, col: on ? '#a8f0b8' : '#ffb0a0' });
    });
  });
  return list.length;
};
// MIMATIC v1/v2: the scripted cinematic, the line-up and the studio, as they play (frames at times)
window.evMim = async function (o) {
  const times = o.times, tw = o.tw || 400, th = o.th || Math.round(tw * 9 / 16), cols = o.cols || times.length, g0 = null; const shots = [];
  const tiles = [];
  for (const t of times) { await mimDev({ scene: o.scene || 'alley', t: t, w: o.w || 960, h: o.h || 540, cls: o.cls || 'attack' }); const c = mimCanvas(); const k = document.createElement('canvas'); k.width = tw; k.height = th; k.getContext('2d').drawImage(c, 0, 0, tw, th); tiles.push(k); shots.push([t, MIM.shot]); }
  const g = evC2(cols * (tw + 4) - 4, Math.ceil(times.length / cols) * (th + 4) - 4);
  tiles.forEach((k, i) => { const x = (i % cols) * (tw + 4), y = Math.floor(i / cols) * (th + 4); g.drawImage(k, x, y); evLabel(g, x + 4, y + 4, times[i].toFixed(1) + ' s' + (o.labels ? ' · ' + o.labels[i] : ''), { size: 12 }); });
  return shots;
};
// BOARD v5: notes taken: the panels a note touches, before and after
window.evBoardRev = async function (o) {
  const notes = o.notes || [['make 6 a close-up', [6]], ['add an insert of the mug after 3', [3, 4, 5]], ['flip to the other side', [2, 3, 6]]], pw = o.pw || 250, ph = Math.round(pw / 1.85), rows = notes.length;
  const cols = Math.max(...notes.map(n => n[1].length)) * 2, g = evC2(cols * (pw + 10) + 50, rows * (ph + 92) + 10, '#e8e2d4'), res = [];
  notes.forEach(([note, ns], r) => {
    const B = brdBoard(o.text || CUR_SCENE, { fps: 24 }), y = 30 + r * (ph + 92);
    const draw = (list, x0, tag) => list.forEach((n, i) => { const sh = B.shots.filter(s => s.eye)[n - 1]; if (!sh) return; brdPanel(g, B, sh, x0 + i * (pw + 10), y + 18, pw); g.fillStyle = '#3a342c'; g.font = '12px sans-serif'; g.fillText(tag + ' ' + sh.n + ' · ' + sh.size + ' ' + sh.type, x0 + i * (pw + 10), y + 12); });
    draw(ns, 10, 'before:'); const rr = brdRevise(B, note); const ns2 = /insert/.test(note) ? [ns[0], ns[0] + 1, ns[0] + 2] : ns; draw(ns2, 10 + (ns.length) * (pw + 10) + 30, 'after:');
    g.fillStyle = '#7a2a1a'; g.font = 'bold 14px sans-serif'; g.fillText('the director\'s note: "' + note + '"', 10, y - 8); g.fillStyle = '#7a2a1a'; g.font = 'bold 22px sans-serif'; g.fillText('→', 10 + ns.length * (pw + 10) + 2, y + 18 + ph / 2); res.push([note, rr && rr.did ? rr.did : String(rr && rr.what || '')]);
  });
  return res;
};
window.evBoardData = async function (o) { evC2(2, 2);
  const B = brdBoard(o.text || CUR_SCENE, { fps: 24 });
  return { heading: B.sc.heading, inside: B.sc.inside, time: B.sc.time, weather: B.sc.weather, chars: B.sc.chars.map(c => [c.name, c.desc, c.g]), beats: B.sc.beats.map(b => ({ i: b.i, who: b.who == null ? '' : B.sc.chars[b.who].name, act: b.act, kind: b.kind, whom: b.whom == null ? '' : (B.sc.chars[b.whom] || {}).name, what: b.what || '', how: b.how || '', quote: b.quote || '', t0: b.t0, t1: b.t1, text: b.text })),
    shots: B.shots.map(s => ({ n: s.n, size: s.size, type: s.type, move: s.move, lens: s.lens, len: s.len, desc: s.desc, t0: s.t0, t1: s.t1, side: s.side, cast: s.cast })), check: brdCheck(B), anim: brdAnimatic(B), segs: B.C.segs.map(s => [s.kind, +s.t0.toFixed(2), +s.dur.toFixed(2)]), dur: B.C.dur,
    take: (() => { const T = mimsTake(B, {}); return { edl: T.edl.map(e => ({ n: e.n, kind: e.kind, size: e.size, who: e.who, f: Math.round(e.f || 0), in: e.in, out: e.out, cut: e.cut })), judge: T.judge, cues: T.cues.map(c => [c.kind, +c.t.toFixed(2)]), loc: T.loc }; })() };
};
