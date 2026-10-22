/* slice 13 audit renders: a clip as frames from several sides, the body's lines over it, and its numbers */
// the knee, hip and ankle angles of one side (degrees): flexion positive; the trunk's lean; the pelvis height
function auJoint(W, s) {
  const P = b => lgaP(W, b), sub = curV3.sub, ang = (a, b) => Math.acos(clamp(curV3.dot(curV3.norm(a), curV3.norm(b)), -1, 1)) * CUR_DEG;
  const hip = P('thigh' + s), knee = P('shin' + s), ank = P('foot' + s), toe = P('toe' + s), pel = P('pelvis'), ch = P('neck');
  const thigh = sub(knee, hip), shin = sub(ank, knee), foot = sub(toe, ank), trunk = sub(ch, pel);
  // sagittal angles in the pelvis's forward plane (x forward, z up): signed by forward/back
  const fwd = curV3.norm([W[LGB.pelvis * 16], W[LGB.pelvis * 16 + 1], 0]);
  const sag = v => Math.atan2(curV3.dot(v, fwd), -v[2]) * CUR_DEG;   // 0 = straight down, + = forward
  const kneeF = ang(thigh, shin), hipF = sag(thigh) - (Math.atan2(curV3.dot(trunk, fwd), trunk[2]) * CUR_DEG) * -1 * 0, trunkLean = Math.atan2(curV3.dot(trunk, fwd), trunk[2]) * CUR_DEG;
  const ankF = 90 - ang(shin.map(v => -v), foot);   // + dorsiflexion
  return { hip: sag(thigh) + trunkLean * 0, thighAbs: sag(thigh), knee: kneeF, ankle: ankF, trunk: trunkLean, pelZ: pel[2], ankZ: ank[2], toeZ: toe[2], ankX: curV3.dot(ank, fwd), heelZ: ank[2] };
}
// frames of one clip: rows are views (azimuth, elevation), columns phases; ctx as the game passes it
window.auClipSheet = async function (o) {
  await lgAtlasGet(o.T || 256); evGL();
  const a = LG_ANIM_BY[o.id]; if (!a) return { err: 'no clip ' + o.id };
  const n = o.n || 8, views = o.views || [[90, 6], [0, 6], [40, 22]], tw = o.tw || 200, th = o.th || 300, pad = 3;
  const g = evC2(n * tw + (n - 1) * pad, views.length * th + (views.length - 1) * pad + 0);
  const P = lgPose(), L = lgLocalNew(), Wd = lgWorldNew(), data = [];
  const dur = o.dur || a.dur, t0 = o.t0 || 0;
  const model = evModel(o.model || 'operator', o.kit || 'attack');
  views.forEach(([az, el], vi) => {
    for (let i = 0; i < n; i++) {
      const t = t0 + (a.loop ? i / n : i / Math.max(1, n - 1)) * dur;
      if (o.perf) lgpEval(a, t, P, Object.assign({}, o.ctx || {})); else lgEvalClip(a, t, P, Object.assign({}, o.ctx || {}));
      if (!a.loop && o.ctx && o.ctx.root === false) { P.root[0] = P.root[1] = 0; }
      const W = lgSolve(P, L, Wd, lgRootM(P));
      if (vi === 0) data.push(Object.assign({ t: +t.toFixed(3) }, { L: auJoint(W, 'L'), R: auJoint(W, 'R') }));
      const cam = lgCam(); cam.fov = o.fov || 0.42; const d = o.dist || 5.4, c = [P.root[0] + (o.cx || 0), P.root[1], o.cz || 0.95];
      cam.eye = [c[0] + Math.cos(az / CUR_DEG) * Math.cos(el / CUR_DEG) * d, c[1] + Math.sin(az / CUR_DEG) * Math.cos(el / CUR_DEG) * d, c[2] + Math.sin(el / CUR_DEG) * d]; cam.tgt = c;
      const S = evStage(o.set || 'cyc', cam, c, { shR: 2.2 }); S.items.push({ m: model, W: W, acc: lgHex(LG_CLASS_BY[(o.kit || 'attack').split('|')[0]] ? LG_CLASS_BY[(o.kit || 'attack').split('|')[0]].col : '#ff4b3e'), glow: 0.5 });
      evRender(S, tw, th, { vx: { dof: false, fog: { rho: 0, H: 6, col: [0.3, 0.3, 0.3] }, vig: 0.1, look: 'identity' }, post: { bloomK: 0.2, th: 0.85, grain: 0.0, vig: 0.15, hal: 0.0 } });
      const x = i * (tw + pad), y = vi * (th + pad); g.drawImage(LGR.cv, x, y, tw, th);
      if (o.lines !== false) {
        // the body's lines: thigh, shin, foot, trunk on the projected skeleton
        const asp = tw / th, pr = b => { const q = mimcProject(cam, lgaP(W, b), asp); return [x + (q.x * 0.5 + 0.5) * tw, y + (0.5 - q.y * 0.5) * th]; };
        g.lineWidth = 1.5;
        for (const [s, col] of [['L', 'rgba(90,220,255,0.85)'], ['R', 'rgba(255,170,60,0.85)']]) { g.strokeStyle = col; g.beginPath(); const q = ['thigh' + s, 'shin' + s, 'foot' + s, 'toe' + s].map(pr); g.moveTo(q[0][0], q[0][1]); for (const p of q.slice(1)) g.lineTo(p[0], p[1]); g.stroke(); }
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); const tq = ['pelvis', 'spine', 'chest', 'neck', 'head'].map(pr); g.moveTo(tq[0][0], tq[0][1]); for (const p of tq.slice(1)) g.lineTo(p[0], p[1]); g.stroke();
      }
      evLabel(g, x + 3, y + 3, (vi === 0 ? '' : '') + (a.loop ? Math.round(i / n * 100) + '%' : t.toFixed(2) + 's'), { size: 11 });
    }
  });
  return { id: o.id, dur: a.dur, data: data };
};
// the numbers of a clip over its cycle (no render): joint angles and contact heights at m samples
window.auClipData = function (o) {
  const a = LG_ANIM_BY[o.id]; if (!a) return null; const m = o.m || 40, P = lgPose(), L = lgLocalNew(), Wd = lgWorldNew(), out = [];
  for (let i = 0; i < m; i++) { const t = (o.t0 || 0) + (a.loop ? i / m : i / (m - 1)) * (o.dur || a.dur); lgEvalClip(a, t, P, Object.assign({}, o.ctx || {})); const W = lgSolve(P, L, Wd, lgRootM(P)); out.push({ t: +t.toFixed(4), L: auJoint(W, 'L'), R: auJoint(W, 'R'), root: P.root.slice() }); }
  return { id: o.id, dur: a.dur, loop: a.loop, data: out };
};
window.auList = function () { return LG_ANIMS.map(a => [a.id, a.name, a.cat, a.dur, a.loop]); };
// the character: full body from four sides and the head close, in the studio light (o.kit, o.pose: clip id at t)
window.auPortrait = async function (o) {
  await lgAtlasGet(o.T || 512); evGL(); const tw = o.tw || 340, th = o.th || 620, views = o.views || [[0, 4], [180, 4], [90, 4], [35, 12]];
  const g = evC2(views.length * (tw + 4) - 4 + (o.head ? tw + 4 : 0), th);
  const P = lgPose(); if (o.clip) lgEvalClip(LG_ANIM_BY[o.clip], o.t || 0, P, o.ctx || {}); else { lgPoseReset(P); lgBase(P, {}); }
  const W = lgmSolve(P), model = evModel('operator', o.kit || 'attack');
  const shoot = (cam, x, w2, h2) => { const S = evStage('cyc', cam, cam.tgt, { shR: 2 }); S.items.push({ m: model, W: W, acc: lgHex('#ff4b3e'), glow: 0.6 }); evRender(S, w2, h2, { vx: { dof: false, fog: { rho: 0, H: 6, col: [0.3, 0.3, 0.3] }, vig: 0.1, look: 'identity' }, post: { bloomK: 0.2, th: 0.85, grain: 0.0, vig: 0.12, hal: 0.0 } }); g.drawImage(LGR.cv, x, 0, w2, h2); };
  views.forEach(([az, el], i) => { const cam = lgCam(); cam.fov = 0.36; const d = 5.6, c = [0, 0, 0.93]; cam.eye = [Math.cos(az / CUR_DEG) * Math.cos(el / CUR_DEG) * d, Math.sin(az / CUR_DEG) * Math.cos(el / CUR_DEG) * d, c[2] + Math.sin(el / CUR_DEG) * d]; cam.tgt = c; shoot(cam, i * (tw + 4), tw, th); });
  if (o.head) { const h = lgaP(W, 'head'), cam = lgCam(); cam.fov = 0.34; const az = (o.headAz || 30) / CUR_DEG; cam.eye = [h[0] + Math.cos(az) * 1.6, h[1] + Math.sin(az) * 1.6, h[2] + 0.12]; cam.tgt = [h[0], h[1], h[2] - 0.12]; shoot(cam, views.length * (tw + 4), tw, th); }
  return { ok: true };
};
// LOCO: the new gait, posed straight from the engine: o.v (m/s), o.dir, o.back, o.arms; frames over one cycle from views;
// the root moves forward at the speed so a planted foot stays put on the floor; returns how far each planted foot slid
window.auLoco = async function (o) {
  await lgAtlasGet(o.T || 256); evGL();
  const n = o.n || 8, views = o.views || [[90, 6], [0, 6], [40, 22]], tw = o.tw || 200, th = o.th || 300, pad = 3, g = evC2(n * tw + (n - 1) * pad, views.length * th + (views.length - 1) * pad);
  const G = locoParams(o.v, o), T = 1 / G.cad, P = lgPose(), L = lgLocalNew(), Wd = lgWorldNew(), model = evModel('operator', o.kit || 'attack');
  const mdir = (o.back ? Math.PI : 0) + (o.dir || 0) + (o.yaw || 0);
  const pose = (t) => { lgPoseReset(P); const r = locoPose(P, t / T, Object.assign({ arms: 'free' }, o)); if (o.hold) lgRunAim(P, { wc: 'r' }, t, 1); const d = o.v * t; P.root[0] = Math.cos(mdir) * d; P.root[1] = Math.sin(mdir) * d; return r; };
  // the slide test: 120 samples over two cycles, each foot's ankle in the world while it is planted
  const slide = { L: 0, R: 0 }; let last = { L: null, R: null };
  for (let i = 0; i <= 240; i++) { const t = i / 120 * T, r = pose(t), W = lgSolve(P, L, Wd, lgRootM(P)); for (const s of ['L', 'R']) { const c = s === 'L' ? r.contactL : r.contactR, toe = lgaP(W, 'toe' + s); if (c && last[s]) slide[s] = Math.max(slide[s], Math.hypot(toe[0] - last[s][0], toe[1] - last[s][1]) * 0); last[s] = c ? (last[s] || toe) : null; if (c && last[s]) slide[s] = Math.max(slide[s], Math.hypot(toe[0] - last[s][0], toe[1] - last[s][1])); } }
  views.forEach(([az, el], vi) => {
    for (let i = 0; i < n; i++) {
      const t = i / n * T; pose(t); const W = lgSolve(P, L, Wd, lgRootM(P));
      const cam = lgCam(); cam.fov = o.fov || 0.42; const d = o.dist || 5.4, c = [P.root[0], P.root[1], 0.95];
      cam.eye = [c[0] + Math.cos(az / CUR_DEG) * Math.cos(el / CUR_DEG) * d, c[1] + Math.sin(az / CUR_DEG) * Math.cos(el / CUR_DEG) * d, c[2] + Math.sin(el / CUR_DEG) * d]; cam.tgt = c;
      const S = evStage(o.set || 'cyc', cam, c, { shR: 2.2 }); S.items.push({ m: model, W: W, acc: lgHex('#ff4b3e'), glow: 0.5 });
      evRender(S, tw, th, { vx: { dof: false, fog: { rho: 0, H: 6, col: [0.3, 0.3, 0.3] }, vig: 0.1, look: 'identity' }, post: { bloomK: 0.2, th: 0.85, grain: 0.0, vig: 0.15, hal: 0.0 } });
      const x = i * (tw + pad), y = vi * (th + pad); g.drawImage(LGR.cv, x, y, tw, th);
      if (o.lines !== false) {
        const asp = tw / th, pr = b => { const q = mimcProject(cam, lgaP(W, b), asp); return [x + (q.x * 0.5 + 0.5) * tw, y + (0.5 - q.y * 0.5) * th]; };
        g.lineWidth = 1.5;
        for (const [s, col] of [['L', 'rgba(90,220,255,0.85)'], ['R', 'rgba(255,170,60,0.85)']]) { g.strokeStyle = col; g.beginPath(); const q = ['thigh' + s, 'shin' + s, 'foot' + s, 'toe' + s].map(pr); g.moveTo(q[0][0], q[0][1]); for (const p of q.slice(1)) g.lineTo(p[0], p[1]); g.stroke(); }
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); const tq = ['pelvis', 'spine', 'chest', 'neck', 'head'].map(pr); g.moveTo(tq[0][0], tq[0][1]); for (const p of tq.slice(1)) g.lineTo(p[0], p[1]); g.stroke();
      }
      evLabel(g, x + 3, y + 3, Math.round(i / n * 100) + '%' + (i === 0 ? ' · ' + o.v + ' m/s' : ''), { size: 11 });
    }
  });
  return { v: o.v, cadence: +(G.cad * 120).toFixed(1), stride: +G.stride.toFixed(2), stance: +G.st.toFixed(2), slideMM: { L: +(slide.L * 1000).toFixed(1), R: +(slide.R * 1000).toFixed(1) } };
};
window.auLocoSlide = function (o) {
  const G = locoParams(o.v, o), T = 1 / G.cad, P = lgPose(), L = lgLocalNew(), Wd = lgWorldNew(), out = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48 * T; lgPoseReset(P); const r = locoPose(P, t / T, Object.assign({ arms: 'free' }, o)); const d = o.v * t; P.root[0] = d;
    const tgt = P.ik.footL.p.slice(), W = lgSolve(P, L, Wd, lgRootM(P)), an = lgaP(W, 'footL'), toe = lgaP(W, 'toeL');
    out.push([+(t / T).toFixed(3), r.contactL ? 1 : 0, +(tgt[0] + d).toFixed(3), +(an[0]).toFixed(3), +(tgt[2]).toFixed(3), +an[2].toFixed(3), +toe[0].toFixed(3), +toe[2].toFixed(3)]);
  }
  return out;
};
window.auEval = function (o) { return eval(o.js); };
// a close look at the gun in his hands: the light on the rail, from his right
window.auGunLight = async function (o) {
  await lgAtlasGet(o.T || 512); evGL(); const tw = o.tw || 640, th = o.th || 420, g = evC2(tw * 2 + 4, th);
  lgGunSet(o.gp || 'm4a1', o.gs || 'm17');
  const P = lgPose(); lgEvalClip(LG_ANIM_BY[o.clip || 'rifle_aim'], 0.5, P, {}); const W = lgmSolve(P), model = evModel('operator', 'attack|' + (o.gp || 'm4a1') + '|' + (o.gs || 'm17'));
  const ci = LGB.carbine * 16, gp = [W[ci + 12], W[ci + 13], W[ci + 14]];
  [[-60, 10, 1.1], [-20, 25, 2.4]].forEach(([az, el, d], i) => {
    const cam = lgCam(); cam.fov = 0.42; const c = [gp[0] + 0.15, gp[1], gp[2]]; cam.eye = [c[0] + Math.cos(az / CUR_DEG) * Math.cos(el / CUR_DEG) * d, c[1] + Math.sin(az / CUR_DEG) * Math.cos(el / CUR_DEG) * d, c[2] + Math.sin(el / CUR_DEG) * d]; cam.tgt = c;
    const S = evStage('cyc', cam, c, { shR: 2 }); S.items.push({ m: model, W: W, acc: lgHex('#ff4b3e'), glow: 0.6 });
    evRender(S, tw, th, { vx: { dof: false, fog: { rho: 0, H: 6, col: [0.3, 0.3, 0.3] }, vig: 0.1, look: 'identity' }, post: { bloomK: 0.2, th: 0.85, grain: 0.0, vig: 0.12, hal: 0.0 } }); g.drawImage(LGR.cv, i * (tw + 4), 0, tw, th);
  });
  lgGunSet(null, null); return { ok: true };
};
// a whole cinematic scene from MIMATIC (the alley, the line-up, the stoop) rendered at chosen times, as the game draws it
window.auMim = async function (o) {
  await lgAtlasGet(o.T || 256);
  if (typeof PERF !== 'undefined') PERF.tier = o.tier == null ? 2 : o.tier;
  mimStart(o.scene || 'alley', { cls: o.cls || 'attack', anim: o.anim });
  const w = o.w || 640, h = o.h || 360, times = o.times || [1, 3, 5], cols = o.cols || 4, rows = Math.ceil(times.length / cols), pad = 4;
  const g = evC2(cols * w + (cols - 1) * pad, rows * h + (rows - 1) * pad);
  MIM.noSync = true;
  for (let i = 0; i < times.length; i++) {
    const t = times[i]; MIM.rt = Math.max(0, t - 0.05); MIM.playing = true; mimFrame(0.05, w, h); MIM.rt = t; mimFrame(0.0001, w, h);
    const cv = mimCanvas(); const x = (i % cols) * (w + pad), y = Math.floor(i / cols) * (h + pad); if (cv) g.drawImage(cv, x, y, w, h);
    evLabel(g, x + 4, y + 4, t.toFixed(2) + ' s', { size: 12 });
  }
  return { n: times.length, mode: MIM.mode, actors: MIM.actors.length };
};
// heads close: o.models [[model, kit]], o.az angles; each row a model, studio light
window.auHeads = async function (o) {
  await lgAtlasGet(o.T || 512); evGL(); const tw = o.tw || 300, th = o.th || 340, azs = o.az || [0, 35, 90], ms = o.models || [['operator', 'attack'], ['operator', 'attack|idle'], ['zombie', 'cook']];
  const g = evC2(azs.length * (tw + 4) - 4, ms.length * (th + 4) - 4);
  ms.forEach(([mn, kit], r) => {
    const P = lgPose(); lgPoseReset(P); lgBase(P, {}); if (mn === 'operator' && o.mask) lgEvalClip(LG_ANIM_BY.mask_tap, 3.0, P, {}); const W = lgmSolve(P), model = evModel(mn, kit);
    azs.forEach((az, i) => {
      const h = lgaP(W, 'head'), cam = lgCam(); cam.fov = o.fov || 0.2; const a = az / CUR_DEG, d = 1.5; cam.eye = [h[0] + Math.cos(a) * d, h[1] + Math.sin(a) * d, h[2] + 0.1 + (o.el || 0)]; cam.tgt = [h[0], h[1], h[2] + 0.06];
      const S = evStage('cyc', cam, cam.tgt, { shR: 2 }); S.items.push({ m: model, W: W, acc: lgHex('#ff4b3e'), glow: 0.6 });
      evRender(S, tw, th, { vx: { dof: false, fog: { rho: 0, H: 6, col: [0.3, 0.3, 0.3] }, vig: 0.1, look: 'identity' }, post: { bloomK: 0.2, th: 0.85, grain: 0.0, vig: 0.12, hal: 0.0 } }); g.drawImage(LGR.cv, i * (tw + 4), r * (th + 4), tw, th);
    });
  });
  return { ok: true };
};
// a live scene (the studio, the stoop: their actors are played in real time, not scrubbed) run forward in steps of a
// thirtieth of a second, with frames taken at the chosen times
window.auMimRun = async function (o) {
  await lgAtlasGet(o.T || 256);
  if (typeof PERF !== 'undefined') PERF.tier = o.tier == null ? 2 : o.tier;
  mimStart(o.scene || 'studio', { cls: o.cls || 'attack', anim: o.anim });
  const w = o.w || 640, h = o.h || 360, times = o.times || [1, 2, 3], cols = o.cols || 4, rows = Math.ceil(times.length / cols), pad = 4;
  const g = evC2(cols * w + (cols - 1) * pad, rows * h + (rows - 1) * pad); MIM.noSync = true;
  let t = 0, i = 0; const dt = 1 / 30;
  while (i < times.length) {
    const draw = t + dt >= times[i] - 1e-6; MIM.playing = true; mimFrame(dt, draw ? w : 64, draw ? h : 36); t += dt;
    if (draw) { const cv = mimCanvas(), x = (i % cols) * (w + pad), y = Math.floor(i / cols) * (h + pad); if (cv) g.drawImage(cv, x, y, w, h); evLabel(g, x + 4, y + 4, times[i].toFixed(2) + ' s', { size: 12 }); i++; }
  }
  return { n: times.length };
};
