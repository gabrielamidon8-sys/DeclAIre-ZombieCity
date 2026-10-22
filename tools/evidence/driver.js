LG_MAKERS.floor = function (B) { lgBone(B, 'root'); lgMat(B, lgMtl({ c: '#8a8a8a', t: LT.asphalt, r: 0.8, w: 0.2, k: 1.2, s: 3 })); lgPlane(B, [-3, -3, 0], [6, 0, 0], [0, 6, 0], 12, 12, 1); };
window.lgDev = async function (o) {
  o = o || {}; const w = o.w || 900, h = o.h || 900;
  await lgAtlasGet(o.T || 256);
  if (!LGR.gl) { lgGLInit(); document.body.appendChild(LGR.cv); }
  LGR.cv.width = w; LGR.cv.height = h; LGR.cv.style.width = w + 'px'; LGR.cv.style.height = h + 'px';
  const cls = o.cls || 'attack', mk = o.gp ? cls + '|' + o.gp + '|' + (o.gs || 'm17') : cls, m = lgModel(o.model || 'operator', o.lod == null ? 0 : o.lod, o.model === 'zombie' ? (o.key || 'cook') : mk);
  lgGunSet(o.gp || null, o.gs || null);
  const P = lgPose(); P.mask = o.mask == null ? 1 : o.mask; P.glow = o.glow == null ? 1 : o.glow;
  if (o.anim && typeof LG_ANIM_BY !== 'undefined' && LG_ANIM_BY[o.anim]) lgEvalClip(LG_ANIM_BY[o.anim], o.t || 0, P, { gp: o.gp, gs: o.gs, gun: o.gp }); if (o.mask != null) P.mask = o.mask;
  if (o.pose) o.pose(P);
  if (o.gripTest) { lgPoseReset(P); lgBase(P, {}); P.mask = 1; P.grip.R = o.gripTest; lgHandTo(P, 'R', 'chest', o.hp || [0.42, -0.2, -0.02], o.hr || [0, -1.57, 0], [-0.3, -0.8, -0.4]); }
  if (o.handTest) { lgPoseReset(P); lgBase(P, {}); P.mask = 1; P.knife.at = 'handL'; P.grip.L = o.grip || 'knife'; lgHandTo(P, 'L', 'chest', o.hp || [0.5, 0.3, 0.05], o.hr || [0, 0, 0], [-0.3, 0.8, -0.4]); }
  const L = lgLocalNew(), W = lgWorldNew(); lgSolve(P, L, W, lgRootM(P)); lgGunSet(null, null);
  const fl = lgModel('floor', 0, ''), FW = lgWorldNew(); for (let i = 0; i < LG_NB; i++) FW.set(lgM4(), i * 16);
  const cam = lgCam(); cam.eye = o.eye || [2.2, 0.3, 1.3]; cam.tgt = o.tgt || [0, 0, 0.95]; cam.fov = o.fov || 0.7;
  if (o.focus) { const i = LGB[o.focus] * 16, f0 = [W[i + 12], W[i + 13], W[i + 14]], fz = W.subarray(i, i + 16), f = o.fo ? lgPt(fz, o.fo[0], o.fo[1], o.fo[2]) : f0, d = o.offL ? (() => { const q = o.offL; return [fz[0] * q[0] + fz[4] * q[1] + fz[8] * q[2], fz[1] * q[0] + fz[5] * q[1] + fz[9] * q[2], fz[2] * q[0] + fz[6] * q[1] + fz[10] * q[2]]; })() : (o.off || [0.5, 0.3, 0.2]); cam.tgt = f; cam.eye = [f[0] + d[0], f[1] + d[1], f[2] + d[2]]; }
  const acc = lgHex(LG_CLASS_BY[cls.split('|')[0]].col);
  const S = { cam: cam, items: [{ m: m, W: W, acc: acc, glow: P.glow }, { m: fl, W: FW, ground: true }], key: { dir: o.kd || [0.6, 0.5, 0.8], col: o.kc || [2.2, 2.0, 1.8] }, rim: { dir: [-0.8, -0.3, 0.4], col: o.rc || [0.8, 1.0, 1.3] }, sky: [0.18, 0.2, 0.25], gnd: [0.06, 0.055, 0.05], pts: o.pts || [], fog: { col: [0.02, 0.025, 0.03], d: 0.02, h: 0.1, s: 3 }, wet: o.wet || 0, time: 0, expo: o.expo || 1, shadow: { on: o.shadow !== false, c: [0, 0, 0.9], r: 1.3, size: 1024 }, refl: { on: !!o.refl, z: 0 }, clear: [0.03, 0.035, 0.04] };
  const draw = () => lgGLScene(S, w, h, null);
  draw(); window.__again = draw;
  return { ok: LGR.ok, why: LGR.why, nv: m.nv, tris: m.tris, ms: m.ms, deriv: !!LGR.ext.deriv };
};
window.lgDev2D = async function (o) {
  o = o || {}; const w = o.w || 600, h = o.h || 600;
  await lgAtlasGet(o.T || 128);
  let c = document.getElementById('c2'); if (!c) { c = document.createElement('canvas'); c.id = 'c2'; document.body.appendChild(c); } c.width = w; c.height = h;
  const cls = o.cls || 'attack', m = lgModel('operator', o.lod == null ? 1 : o.lod, cls);
  const P = lgPose(); P.mask = o.mask == null ? 1 : o.mask; if (o.anim && LG_ANIM_BY[o.anim]) lgEvalClip(LG_ANIM_BY[o.anim], o.t || 0, P, {}); if (o.mask != null) P.mask = o.mask;
  const L = lgLocalNew(), W = lgWorldNew(); lgSolve(P, L, W, lgRootM(P));
  const cam = lgCam(); cam.eye = o.eye || [2.2, 0.3, 1.3]; cam.tgt = o.tgt || [0, 0, 0.95];
  const S = { cam: cam, items: [{ m: m, W: W, acc: lgHex(LG_CLASS_BY[cls].col), glow: 1 }], key: { dir: [0.6, 0.5, 0.8], col: [1.4, 1.3, 1.2] }, rim: { dir: [-0.8, -0.3, 0.4], col: [0.6, 0.7, 0.9] }, sky: [0.25, 0.27, 0.32], gnd: [0.08, 0.08, 0.08], clear: [0.05, 0.05, 0.06] };
  const t0 = performance.now(); lg2DScene(c.getContext('2d'), S, w, h); return { ms: performance.now() - t0, tris: m.tris };
};
window.lgDevSprites = async function (o) {
  await lgAtlasGet(o.T || 128);
  let c = document.getElementById('c2'); if (!c) { c = document.createElement('canvas'); c.id = 'c2'; document.body.appendChild(c); }
  const list = o.list, px = o.px || 3, S = Math.ceil(96 * px); c.width = S * list.length; c.height = S;
  const g = c.getContext('2d'); g.fillStyle = '#2a2d31'; g.fillRect(0, 0, c.width, c.height);
  const times = [];
  list.forEach((it, i) => { const a = LG_ANIM_BY[it[0]]; const t0 = performance.now(); const s = lgSpriteMake('operator', it[3] || 'attack', a, it[1] * a.dur, it[2] || 'p', 16, px); times.push(performance.now() - t0); g.drawImage(s.c, i * S, 0); g.fillStyle = '#ff0'; g.fillRect(i * S + S / 2 + s.mx * px - 2, S / 2 + s.my * px - 2, 4, 4); });
  return times;
};
window.mimDev = async function (o) {
  const w = o.w || 960, h = o.h || 540; await lgAtlasGet(o.T || 256);
  mimSetup(); const c = mimCanvas(); if (!c.parentNode) document.body.appendChild(c); c.style.width = w + 'px'; c.style.height = h + 'px';
  if (o.lvl != null) MIM.adapt = o.lvl - 3;
  mimStart(o.scene || 'alley', Object.assign({ cls: o.cls || 'attack' }, o.opts || {}));
  if (o.play) mimStudioPlay(o.play);
  const dt = 1 / 30; MIM.noRender = true; const t0 = performance.now();
  while (MIM.rt + dt < (o.t || 0)) mimFrame(dt, w, h);
  MIM.noRender = false; const t1 = performance.now(); mimFrame(Math.max(0.001, (o.t || 0) - MIM.rt), w, h);
  const t2 = performance.now(); window.__again = () => { MIM.rt -= 0.0001; mimFrame(0.0001, w, h); };
  return { sim: Math.round(t1 - t0), frame: Math.round(t2 - t1), st: MIM.st, shot: MIM.shot, mode: MIM.mode };
};
window.objDev = async function (o) {
  const w = o.w || 400, h = o.h || 400; await lgAtlasGet(o.T || 128);
  if (!LGR.gl) { lgGLInit(); document.body.appendChild(LGR.cv); }
  LGR.cv.width = w; LGR.cv.height = h; LGR.cv.style.width = w + 'px'; LGR.cv.style.height = h + 'px';
  const m = lgModel('operator', 0, 'attack'), P = lgPose(); lgBase(P, {}); P.mask = 1;
  const g = lgoGrasp(o.key, { side: o.side || 'R', type: o.type });
  const s = o.side === 'L' ? 'L' : 'R'; P.grip[s] = g.g;
  lgHandTo(P, s, 'chest', o.hp || [0.42, s === 'R' ? -0.12 : 0.12, 0.0], o.hr || [0, -1.2, 0], s === 'R' ? [-0.3, -0.8, -0.4] : [-0.3, 0.8, -0.4]);
  const L = lgLocalNew(), W = lgWorldNew(); lgSolve(P, L, W, lgRootM(P));
  const HW = W.subarray(LGB['hand' + s] * 16, LGB['hand' + s] * 16 + 16), Mo = lgInv(lgM4(), g.S), OW = lgMul(lgM4(), HW, Mo);
  const om = lgModel('obj_' + o.key, 0, ''), OWW = lgWorldNew(); for (let i = 0; i < LG_NB; i++) OWW.set(OW, i * 16);
  const fl = lgModel('floor', 0, ''), FW = lgWorldNew(); for (let i = 0; i < LG_NB; i++) FW.set(lgM4(), i * 16);
  const hp = [HW[12], HW[13], HW[14]], cam = lgCam(), off = o.off || [0.25, -0.2, 0.08];
  const ax = (c) => [HW[c * 4], HW[c * 4 + 1], HW[c * 4 + 2]], X = ax(0), Y = ax(1), Z = ax(2);
  const pc = lgPt(HW, 0, 0, -0.06), e = [pc[0] + X[0] * off[0] + Y[0] * off[1] + Z[0] * off[2], pc[1] + X[1] * off[0] + Y[1] * off[1] + Z[1] * off[2], pc[2] + X[2] * off[0] + Y[2] * off[1] + Z[2] * off[2]];
  cam.eye = e; cam.tgt = pc; cam.fov = o.fov || 0.6;
  const S = { cam: cam, items: [{ m: m, W: W, acc: lgHex('#ff4b3e'), glow: 1 }, { m: om, W: OWW }, { m: fl, W: FW, ground: true }], key: { dir: [0.6, 0.5, 0.8], col: [2.4, 2.2, 2.0] }, rim: { dir: [-0.8, -0.3, 0.4], col: [0.8, 1.0, 1.3] }, sky: [0.25, 0.27, 0.32], gnd: [0.08, 0.075, 0.07], pts: [], fog: { col: [0.02, 0.025, 0.03], d: 0.0, h: 0.1, s: 3 }, wet: 0, time: 0, expo: 1.6 };
  const draw = () => lgGLScene(S, w, h, null); draw(); window.__again = draw;
  return { type: g.type, q: { pen: g.q.pen, gaps: g.q.gaps } };
};
window.objChk = function (o) {
  const P = lgPose(); lgBase(P, {});
  const g = lgoGrasp(o.key, { side: o.side || 'R', type: o.type }); const s = o.side === 'L' ? 'L' : 'R'; P.grip[s] = g.g;
  lgHandTo(P, s, 'chest', [0.42, s === 'R' ? -0.12 : 0.12, 0.0], [0, -1.2, 0], s === 'R' ? [-0.3, -0.8, -0.4] : [-0.3, 0.8, -0.4]);
  const L = lgLocalNew(), W = lgWorldNew(); lgSolve(P, L, W, lgRootM(P));
  const HW = W.subarray(LGB['hand' + s] * 16, LGB['hand' + s] * 16 + 16).slice(), OW = lgMul(lgM4(), HW, lgInv(lgM4(), g.S)), OI = lgInv(lgM4(), OW), ob = LGO_OBJ[o.key];
  const out = {};
  for (const [f, , , l2, l3] of LG_FINGERS.concat([['thb', 0, 0, 0.031, 0.025]])) {
    const M = W.subarray(LGB[f + '3' + s] * 16, LGB[f + '3' + s] * 16 + 16), len = f === 'thb' ? 0.025 : l3 * 0.8;
    let near = 1e9; for (let t = 0; t <= 1; t += 0.125) { const p = lgPt(M, 0, 0, -len * t), q = lgPt(OI, p[0], p[1], p[2]); near = Math.min(near, lgoSdf(ob, q[0], q[1], q[2])); }
    // also: the bone in hand space vs lghChain's
    const Hi = lgInv(lgM4(), HW), ph = lgPt(lgMul(lgM4(), Hi, M), 0, 0, 0);
    out[f] = [+(near * 1000).toFixed(1), ph.map(v => +(v * 1000).toFixed(1))];
  }
  // lghChain's idea of the distal joint for the index
  const c = g.g.f[0], base = lgMul(lgM4(), lgTR(LG_FINGERS[0][1], -(s === 'R' ? 1 : -1) * 0.0025, -LG_FINGERS[0][2]), lgRot(lgM4(), c[0] * (s === 'R' ? 1 : -1), LGH_FAN[0] * (g.g.sp || 0), 0)); let A3;
  lghChain(base, 0, 0, 0, c, [LG_FINGERS[0][3], LG_FINGERS[0][4], LG_FINGERS[0][4] * 0.8], s === 'R' ? 1 : -1, (j, A) => { if (j === 2) A3 = A; });
  out.chainIdx3 = A3.map(v => +(v * 1000).toFixed(1)); out.gaps = g.q.gaps.map(v => +(v * 1000).toFixed(1));
  return out;
};
window.objDev2 = async function (o) {
  const w = o.w || 400, h = o.h || 400; await lgAtlasGet(o.T || 128);
  if (!LGR.gl) { lgGLInit(); document.body.appendChild(LGR.cv); }
  LGR.cv.width = w; LGR.cv.height = h; LGR.cv.style.width = w + 'px'; LGR.cv.style.height = h + 'px';
  const s = o.side === 'L' ? 'L' : 'R', m = lgModel('operator', 0, o.cls || 'attack'), P = lgPose(); lgBase(P, {});
  const g = lgoGrasp(o.key, { side: s, type: o.type, settle: o.settle !== false }); P.grip[s] = g.g;
  lgHandTo(P, s, 'chest', [0.42, s === 'R' ? -0.12 : 0.12, 0.0], [0, -1.2, 0], s === 'R' ? [-0.3, -0.8, -0.4] : [-0.3, 0.8, -0.4]);
  const L = lgLocalNew(), W = lgWorldNew(); lgSolve(P, L, W, lgRootM(P));
  const keep = new Set(['fore' + s, 'hand' + s]); for (const [f] of LG_FINGERS) for (const x of ['', '2', '3']) keep.add(f + x + s); for (const x of ['', '2', '3']) keep.add('thb' + x + s);
  const hide = new Uint8Array(LG_NB_MAX); for (let i = 0; i < LG_NB; i++) if (!keep.has(LG_SKEL[i][0])) hide[i] = 1;
  const HW = W.subarray(LGB['hand' + s] * 16, LGB['hand' + s] * 16 + 16).slice(), OW = lgMul(lgM4(), HW, lgInv(lgM4(), g.S));
  const om = lgModel('obj_' + o.key, 0, ''), OWW = lgWorldNew(); for (let i = 0; i < LG_NB; i++) OWW.set(OW, i * 16);
  const ax = (c) => [HW[c * 4], HW[c * 4 + 1], HW[c * 4 + 2]], X = ax(0), Y = ax(1), Z = ax(2), ps = s === 'R' ? 1 : -1;
  const bb = lgoBounds(LGO_OBJ[o.key]), cO = [(bb.lo[0] + bb.hi[0]) / 2, (bb.lo[1] + bb.hi[1]) / 2, (bb.lo[2] + bb.hi[2]) / 2];
  const pc0 = lgPt(HW, 0.0, 0.03 * ps, -0.075), oc = lgPt(OW, cO[0], cO[1], cO[2]), pc = o.onObj ? oc : [(pc0[0] + oc[0]) / 2, (pc0[1] + oc[1]) / 2, (pc0[2] + oc[2]) / 2];
  const v = o.view || [0.6, 0.9, 0.3], dir = curV3.norm([X[0] * v[0] + Y[0] * v[1] * ps + Z[0] * v[2], X[1] * v[0] + Y[1] * v[1] * ps + Z[1] * v[2], X[2] * v[0] + Y[2] * v[1] * ps + Z[2] * v[2]]), dist = o.dist || 0.32;
  const cam = lgCam(); cam.eye = curV3.add(pc, curV3.mul(dir, dist)); cam.tgt = pc; cam.fov = o.fov || 0.62; cam.up = o.up ? [Z[0] * -1, Z[1] * -1, Z[2] * -1] : [0, 0, 1];
  const S = { cam: cam, items: [{ m: m, W: W, acc: lgHex('#ff4b3e'), glow: 0.4, hide: hide }, { m: om, W: OWW }], key: { dir: curV3.norm(curV3.add(dir, [0.2, 0.3, 0.9])), col: [2.6, 2.4, 2.2] }, rim: { dir: curV3.mul(dir, -1), col: [0.9, 1.1, 1.4] }, sky: [0.32, 0.34, 0.4], gnd: [0.1, 0.1, 0.1], pts: [], fog: { col: [0.05, 0.055, 0.065], d: 0.0, h: 0.1, s: 3 }, wet: 0, time: 0, expo: 1.5 };
  const draw = () => lgGLScene(S, w, h, null); draw(); window.__again = draw;
  const st = g.settle ? g.settle.after : null;
  return { type: g.type, name: g.name, pen: st ? +(st.pen * 1000).toFixed(1) : null, gaps: st ? st.gaps.map(x => +(x * 1000).toFixed(1)) : null, bal: st ? +st.bal.toFixed(3) : null };
};
window.lgoSurfPts = function (key, n) {
  const o = LGO_OBJ[key] || LGM_SET[key], out = [], rng = curRng(3);
  for (const q of o.parts) for (let i = 0; i < (n || 160) / o.parts.length; i++) {
    if (q[0] === 'cyl') { const a = rng() * TAU, z = (rng() * 2 - 1) * q[3]; out.push([q[1][0] + Math.cos(a) * q[2], q[1][1] + Math.sin(a) * q[2], q[1][2] + z]); }
    else if (q[0] === 'sph') { const u = rng() * 2 - 1, a = rng() * TAU, r = Math.sqrt(1 - u * u); out.push([q[1][0] + r * Math.cos(a) * q[2], q[1][1] + r * Math.sin(a) * q[2], q[1][2] + u * q[2]]); }
    else if (q[0] === 'box') { const f = Math.floor(rng() * 6), ax = f >> 1, sg = f & 1 ? 1 : -1, p = [0, 1, 2].map(k => k === ax ? sg * q[2][k] : (rng() * 2 - 1) * q[2][k]); out.push([q[1][0] + p[0], q[1][1] + p[1], q[1][2] + p[2]]); }
    else { const t = rng(), a = rng() * TAU; out.push([q[1][0] + (q[2][0] - q[1][0]) * t + Math.cos(a) * q[3], q[1][1] + (q[2][1] - q[1][1]) * t + Math.sin(a) * q[3], q[1][2] + (q[2][2] - q[1][2]) * t]); }
  }
  return out;
};
window.mkPerf = function (o) {
  if (o.learn) lgmLearnBalance(o.learn);
  if (o.kind === 'reach') return lgmReach(o.args);
  if (o.kind === 'lift') return lgmLiftBox(o.args || {});
  if (o.kind === 'handover') return lgmHandover(o.args || {});
  if (o.kind === 'fight') return choPerf(choTest());
  if (o.kind === 'alley') return choPerf(choAlleyFight());
  if (o.kind === 'throw') { if (o.learnThrow) lgmLearnThrow(o.learnThrow); return lgmThrow(o.args || {}); }
};
window.perfStrip = async function (o) {
  const pf = mkPerf(o), run = lgmRun(pf, o.fps || 60), times = o.times || pf.beats.map(b => b.t), n = times.length, cw = o.cw || 220, h = o.h || 300;
  let c = document.getElementById('c2'); if (!c) { c = document.createElement('canvas'); c.id = 'c2'; document.body.appendChild(c); }
  const views = o.views || ['side'], rows = views.length; c.width = cw * n; c.height = h * rows; const g = c.getContext('2d'); g.fillStyle = '#16181c'; g.fillRect(0, 0, c.width, c.height);
  const sets = (o.set || []).map(st => ({ pts: lgoSurfPts(st.key, 600), M: st.M }));
  views.forEach((view, r) => times.forEach((t, i) => {
    const f = run.frames[Math.min(run.frames.length - 1, Math.round(t * run.fps))], ox = i * cw + (o.ox != null ? o.ox : cw * 0.35), oy = r * h + h * 0.9, sc = o.s || 130;
    const vo = { view: view, x: view === 'top' ? i * cw + cw / 2 : ox, y: view === 'top' ? r * h + h * 0.6 : oy, s: sc };
    g.strokeStyle = '#333'; g.beginPath(); g.moveTo(i * cw, oy); g.lineTo(i * cw + cw, oy); g.stroke();
    for (const st of sets) { g.fillStyle = '#5d4630'; for (const p of st.pts) { const w = lgPt(st.M, p[0], p[1], p[2]), q = lgaProj(w, vo); g.fillRect(q[0], q[1], 1.2, 1.2); } }
    f.W.forEach((W, a) => lgaSketch(g, W, Object.assign({ col: a ? '#9fc3ff' : '#d8d2c2' }, vo)));
    for (const th of f.things) { const pts = lgoSurfPts(th.key, 260); g.fillStyle = '#ffb347'; for (const p of pts) { const w = lgPt(th.M, p[0], p[1], p[2]), q = lgaProj(w, vo); g.fillRect(q[0], q[1], 1.5, 1.5); } }
    // centre of mass on the ground (a cross) and the feet's hull
    const sup = lgaSupport(f.W[0], 0), ex = f.r.held && f.things[0] ? [{ p: [f.things[0].M[12], f.things[0].M[13], f.things[0].M[14]], pct: pf.pct || 0 }] : null, cm = lgaCOM(f.W[0], ex).c, cq = lgaProj([cm[0], cm[1], view === 'top' ? cm[2] : 0], vo);
    g.strokeStyle = lgaInside(sup, cm[0], cm[1]) > 0 ? '#6fd08c' : '#ff4b3e'; g.lineWidth = 2; g.beginPath(); g.moveTo(cq[0] - 5, cq[1] - 5); g.lineTo(cq[0] + 5, cq[1] + 5); g.moveTo(cq[0] + 5, cq[1] - 5); g.lineTo(cq[0] - 5, cq[1] + 5); g.stroke(); g.lineWidth = 1;
    if (r === 0) { g.fillStyle = '#ffe6a0'; g.font = '11px sans-serif'; const b = pf.beats.find(b2 => Math.abs(b2.t - t) < 1e-6); g.fillText((t.toFixed(2)) + ' s' + (b ? ' ' + b.name : ''), i * cw + 4, 14); }
  }));
  const out = { dur: pf.dur, beats: pf.beats.map(b => [b.name, +b.t.toFixed(3)]) };
  if (pf.kind === 'reach') { const st = lgmReachStats(run); out.stats = { mt: +st.mt.toFixed(3), peakFrac: +st.peakFrac.toFixed(3), vmax: +st.vmax.toFixed(2), mga: +(st.mga * 1000).toFixed(1), mgaWant: +(st.mgaWant * 1000).toFixed(1), mgaFrac: +st.mgaFrac.toFixed(3), comInside: +(st.comInside * 1000).toFixed(1), handErr: +(st.handErr * 1000).toFixed(1), gain: LGM.gain }; }
  return out;
};
window.c2dof = async function (o) {
  if (!LGR.gl) { lgGLInit(); document.body.appendChild(LGR.cv); } vfxGLInit(); const w = o.w || 640, h = o.h || 400;
  const cam = lgCam(); cam.eye = [0, 0, 1]; cam.tgt = [1, 0, 1]; const lens = mimcBody({ f: 85, N: o.N || 1.4, focus: o.focus || 4, aspect: w / h }); mimcToCam(cam, lens);
  const ds = [2, 3, 4, 6, 9]; const items = ds.map((d, i) => vxlPlace('vxl_bead', [d, (i - 2) * 0.09 * d / 2, 1])); const S = vxlStage(items, cam);
  const out = lgFBO('vxl_final', w, h, false); vxlRender(S, w, h, { lens: lens, dof: o.dof, dofMax: 48, out: out }); const px = vxlRead(out, w, h);
  let c = document.getElementById('c2'); if (!c) { c = document.createElement('canvas'); c.id = 'c2'; document.body.appendChild(c); } c.width = w; c.height = h; const g = c.getContext('2d'), im = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const s = ((h - 1 - y) * w + x) * 4, d = (y * w + x) * 4; for (let k = 0; k < 4; k++) im.data[d + k] = k === 3 ? 255 : Math.min(255, px[s + k] * (o.gain || 1)); }
  g.putImageData(im, 0, 0); return 1;
};
window.choTest = function () {
  return choFight({ fighters: [{ name: 'A', at: [0, 0] }, { name: 'B', at: [1.05, 0] }], dur: 4.2,
    steps: [{ who: 0, t: 0.3, dir: 'in', len: 0.15 }],
    ex: [{ t: 0.9, a: 0, move: 'jab', b: 1, def: 'block' }, { t: 1.25, a: 0, move: 'cross', b: 1 }, { t: 2.0, a: 1, move: 'hook', b: 0, def: 'duck' }, { t: 2.6, a: 0, move: 'body', b: 1 }, { t: 3.2, a: 0, move: 'frontKick', b: 1 }] });
};
window.slideDbg = function (F, fps) {
  const pf = choPerf(F), run = lgmRun(pf, fps || 30), sl = [];
  for (let a = 0; a < F.fighters.length; a++) { const Ws = run.frames.map(f => f.W[a]); const prev = {}; Ws.forEach((W, i) => { for (const s of ['L', 'R']) { const h = lgaMark(W, 'heel' + s), tp = lgaMark(W, 'tip' + s), low = h[2] < tp[2] ? h : tp, k = s + (h[2] < tp[2] ? 'h' : 't'); const on = Math.min(h[2], tp[2]) < 0.025; if (on && prev[k] && i) { const dz = Math.abs(low[2] - prev[k][2]) * (fps || 30), v = Math.hypot(low[0] - prev[k][0], low[1] - prev[k][1]) * (fps || 30); if (dz < 0.12 && v > 0.1) sl.push([a, k, +run.frames[i].t.toFixed(2), +v.toFixed(2), +h[2].toFixed(3), +tp[2].toFixed(3)]); } prev[s + 'h'] = h; prev[s + 't'] = tp; } }); }
  return sl;
};
window.CUR_SCENE = 'EXT. ALLEY - NIGHT. Rain falls through the neon.\nMAYA walks in and stops by the table. She picks up the mug. A stranger steps out of the shadows. "You lost?" he asks. Maya hands him the mug. The stranger throws a punch. Maya blocks and hits back with a cross. He swings a hook; she ducks. She kicks him in the stomach. He falls.';
window.c2board = async function (o) {
  const t0 = performance.now(), B = brdBoard(o.text || CUR_SCENE, { fps: 24 }), t1 = performance.now();
  let c = document.getElementById('c2'); if (!c) { c = document.createElement('canvas'); c.id = 'c2'; document.body.appendChild(c); }
  const pw = o.pw || 300, ph = Math.round(pw / 1.85) + 40, cols = o.cols || 4, shots = B.shots.filter(s => s.eye), rows = Math.ceil(shots.length / cols) + (o.plan ? 2 : 0);
  c.width = cols * (pw + 16) + 16; c.height = rows * (ph + 12) + 20; const g = c.getContext('2d'); g.fillStyle = '#e8e2d4'; g.fillRect(0, 0, c.width, c.height);
  const res = shots.map((sh, i) => brdPanel(g, B, sh, 16 + (i % cols) * (pw + 16), 12 + Math.floor(i / cols) * (ph + 12), pw));
  let plan = null; if (o.plan) plan = brdPlan(g, B, 16, 12 + Math.ceil(shots.length / cols) * (ph + 12), c.width - 32, 2 * (ph + 12) - 12);
  return { ms: [Math.round(t1 - t0), Math.round(performance.now() - t1)], dur: B.C.dur, shots: shots.map(s => [s.n, s.size, s.type, s.move, +s.t0.toFixed(2), +s.t1.toFixed(2), s.side]), check: brdCheck(B), arrows: res.map(r => r.arrows) };
};
window.shootTake = null;
window.c2shoot = async function (o) {
  await lgAtlasGet(o.T || 256);
  if (!LGR.gl) { lgGLInit(); document.body.appendChild(LGR.cv); }
  if (!window.shootTake || o.text) { const B = brdBoard(o.text || CUR_SCENE, { fps: 24 }); window.shootTake = mimsTake(B, {}); }
  const T = window.shootTake, w = o.w || 1110, h = o.h || 600, cols = o.cols || 1, pad = 6;
  let times = o.times || [o.t || 1]; if (o.perShot) { times = []; for (const e of T.edl) { const k = o.at && o.at[e.n] != null ? o.at[e.n] : 0.55; times.push(+(e.in + (e.out - e.in) * k).toFixed(2)); } if (o.extraT) times = times.concat(o.extraT).sort((a, b) => a - b); }
  let c = document.getElementById('c2'); if (!c) { c = document.createElement('canvas'); c.id = 'c2'; document.body.appendChild(c); }
  const tw = o.tw || w, th = Math.round(tw * h / w), rows = Math.ceil(times.length / cols); c.width = cols * tw + (cols - 1) * pad; c.height = rows * th + (rows - 1) * pad; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  const out = [];
  for (let i = 0; i < times.length; i++) { const r = mimsFrame(T, times[i], Object.assign({ w: w, h: h }, o.opts || {})); g.drawImage(LGR.cv, (i % cols) * (tw + pad), Math.floor(i / cols) * (th + pad), tw, th); if (o.label) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect((i % cols) * (tw + pad), Math.floor(i / cols) * (th + pad), 260, 20); g.fillStyle = '#ffe6a0'; g.font = '12px sans-serif'; g.fillText(times[i].toFixed(2) + ' s · ' + r.shot.n + ' ' + r.shot.size + ' ' + r.shot.kind + ' ' + (r.shot.f|0) + 'mm', (i % cols) * (tw + pad) + 6, Math.floor(i / cols) * (th + pad) + 14); } out.push({ t: times[i], shot: r.shot.n, size: r.shot.size, kind: r.shot.kind, ms: Math.round(r.ms), spr: r.sprites }); }
  return { dur: T.dur, edl: T.edl.map(e => [e.n, e.kind, e.size, e.who, +e.in.toFixed(2), +e.out.toFixed(2)]), cues: T.cues.map(c2 => [c2.kind, +c2.t.toFixed(2)]), loc: T.loc, judge: { score: +T.judge.score.toFixed(3), cross: T.judge.crossings, jumps: T.judge.jumps }, out: out };
};
