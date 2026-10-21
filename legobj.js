/* ================= LEGEND v4: handling objects (1.9.995) =================
   A hand that has only ever held guns and a knife has not learned to hold things. LEGEND learns how people do it:
   - Things: a library of everyday objects, each with its true size and weight and an exact surface (a signed distance:
     how far any point is from the object, negative inside), so a finger can feel where it is.
   - Grasps: the human grasp taxonomy (Feix et al. 2016, after Napier and Cutkosky): power grasps that hold an object in
     the palm (the large, medium and small diameter wraps, the power sphere, the index finger along a tool), precision
     grasps that hold it in the finger pads (the tripod, the writing tripod, the palmar pinch, the precision sphere), the
     lateral pinch (a key against the side of the index finger), the hook (no thumb: a bag, a mug's handle), the
     prismatic grasp of a flat thing, and two hands for what one cannot hold.
   - Choosing: a grasp is picked from the object's shape, size and weight and from the task (to carry, to pour, to write,
     to throw), the way the taxonomy sorts them.
   - Placing the hand: the palm onto the object (or the finger pads around it), turned for the task, approached from the
     side the arm comes from.
   - Closing: every finger closes joint by joint until any part of it touches the surface (the same way the gun grips
     fit themselves), and the hand is checked for anything sinking into the object.
   - Moving: reach to grasp the way people do (the hand speeding up and slowing down in one smooth bell, the fingers
     opening wider than the object and closing on it late in the reach), lifting with the weight in the body (the hips and
     back lean against a heavy load so the centre of mass stays over the feet), handing over, and throwing with the body's
     chain (legs and hips first, then the trunk, the shoulder, the elbow, the wrist). */
const LGO = { made: 0, ms: 0 };
/* ---------- the things ---------- */
// parts: ['cyl', centre, radius, half-height] (axis z) | ['box', centre, half-sizes, bevel] | ['sph', centre, radius] | ['cap', a, b, radius]
// kg: weight; use: what it is for; pref: the grasp people use for it, by task
const LGO_OBJ = {
  mug: { name: 'Coffee mug', kg: 0.38, parts: [['cyl', [0, 0, 0.0475], 0.041, 0.0475], ['cap', [0.077, 0, 0.024], [0.077, 0, 0.073], 0.0075], ['cap', [0.039, 0, 0.078], [0.077, 0, 0.073], 0.0075], ['cap', [0.039, 0, 0.018], [0.077, 0, 0.024], 0.0075]], handle: { c: [0.077, 0, 0.048], axis: [0, 0, 1], r: 0.0075, h: 0.0245 }, col: '#e9e4d8', t: 'glaze', pref: { carry: 'hook', drink: 'hook' } },
  bottle: { name: 'Water bottle (1 L)', kg: 1.05, parts: [['cyl', [0, 0, 0.105], 0.038, 0.105], ['cyl', [0, 0, 0.235], 0.015, 0.03]], col: '#7fb7d6', t: 'poly', pref: { carry: 'largeDiameter', pour: 'largeDiameter' } },
  can: { name: 'Soda can', kg: 0.37, parts: [['cyl', [0, 0, 0.061], 0.033, 0.061]], col: '#c8312b', t: 'metal', pref: { carry: 'mediumWrap', drink: 'mediumWrap' } },
  flashlight: { name: 'Flashlight', kg: 0.24, parts: [['cyl', [0, 0, 0.0], 0.0145, 0.075], ['cyl', [0, 0, 0.095], 0.021, 0.022]], axis: 'z', col: '#2c2f33', t: 'metal', pref: { carry: 'smallDiameter', point: 'smallDiameter' } },
  hammer: { name: 'Claw hammer', kg: 0.57, parts: [['cyl', [0, 0, 0], 0.0155, 0.14], ['box', [0, 0, 0.16], [0.055, 0.014, 0.017], 0.004]], col: '#6b4a2c', t: 'leather', pref: { carry: 'mediumWrap', strike: 'mediumWrap' } },
  ball: { name: 'Baseball', kg: 0.145, parts: [['sph', [0, 0, 0], 0.037]], col: '#efe9dc', t: 'leather', pref: { carry: 'powerSphere', throw: 'tripodBall' } },
  orange: { name: 'Orange', kg: 0.2, parts: [['sph', [0, 0, 0], 0.04]], col: '#e48a2a', t: 'rubber', pref: { carry: 'powerSphere' } },
  pen: { name: 'Pen', kg: 0.012, parts: [['cyl', [0, 0, 0], 0.0048, 0.07]], col: '#1d3b8a', t: 'poly', pref: { write: 'writingTripod', carry: 'tripod' } },
  coin: { name: 'Coin', kg: 0.007, parts: [['cyl', [0, 0, 0], 0.012, 0.001]], col: '#c9a54a', t: 'metal', pref: { carry: 'palmarPinch' } },
  key: { name: 'Key', kg: 0.01, parts: [['box', [0, 0, 0], [0.0011, 0.012, 0.03], 0.0005]], col: '#b9b4a6', t: 'metal', pref: { carry: 'lateralPinch', turn: 'lateralPinch' } },
  phone: { name: 'Phone', kg: 0.19, parts: [['box', [0, 0, 0], [0.0042, 0.036, 0.074], 0.004]], col: '#1b1d22', t: 'poly', pref: { carry: 'prismatic4' } },
  box: { name: 'Shoebox', kg: 0.9, parts: [['box', [0, 0, 0.06], [0.17, 0.1, 0.06], 0.004]], col: '#b38c5a', t: 'cord', two: true, pref: { carry: 'twoHand' } },
  crate: { name: 'Ammo crate (12 kg)', kg: 12, parts: [['box', [0, 0, 0.09], [0.2, 0.13, 0.09], 0.006]], col: '#4f5a3c', t: 'metal', two: true, pref: { carry: 'twoHand' } }
};
// the grasp taxonomy LEGEND uses: class (power, intermediate, precision), opposition (palm, pad, side), thumb, and what it suits
const LGO_GRASPS = {
  largeDiameter: { name: 'Large diameter', cls: 'power', opp: 'palm', thumb: 'abducted', fits: 'cylinders about 5 to 9 cm across (a bottle)', fingers: 'all four wrap', ap: 'wrap' },
  mediumWrap: { name: 'Medium wrap', cls: 'power', opp: 'palm', thumb: 'abducted', fits: 'cylinders about 3 to 5 cm across (a can, a hammer handle)', fingers: 'all four wrap', ap: 'wrap' },
  smallDiameter: { name: 'Small diameter', cls: 'power', opp: 'palm', thumb: 'abducted', fits: 'thin cylinders under about 3 cm (a flashlight, a rail)', fingers: 'all four wrap tight', ap: 'wrap' },
  indexExt: { name: 'Index finger extension', cls: 'power', opp: 'palm', thumb: 'adducted', fits: 'tools aimed along the index (a knife, a screwdriver)', fingers: 'index along the tool, three wrap', ap: 'wrap' },
  powerSphere: { name: 'Power sphere', cls: 'power', opp: 'palm', thumb: 'abducted', fits: 'balls that fill the palm (an orange, a baseball held to carry)', fingers: 'spread round it', ap: 'sphere' },
  tripodBall: { name: 'Throwing grip (tripod on a ball)', cls: 'precision', opp: 'pad', thumb: 'abducted', fits: 'a ball to be thrown: thumb, index and middle on the ball, off the palm', fingers: 'index and middle pads over the top, thumb under', ap: 'pads' },
  tripod: { name: 'Tripod', cls: 'precision', opp: 'pad', thumb: 'abducted', fits: 'small things held by the pads of thumb, index and middle', fingers: 'three pads', ap: 'pads' },
  writingTripod: { name: 'Writing tripod', cls: 'precision', opp: 'side', thumb: 'abducted', fits: 'a pen: thumb and index pads, the middle finger beneath', fingers: 'three, the rest curled', ap: 'pads' },
  palmarPinch: { name: 'Palmar pinch', cls: 'precision', opp: 'pad', thumb: 'abducted', fits: 'small flat things (a coin) between the thumb and index pads', fingers: 'index pad', ap: 'pinch' },
  lateralPinch: { name: 'Lateral pinch', cls: 'intermediate', opp: 'side', thumb: 'adducted', fits: 'a key or a card pressed by the thumb onto the side of the index finger', fingers: 'index curled under', ap: 'side' },
  hook: { name: 'Hook', cls: 'power', opp: 'none', thumb: 'free', fits: 'handles and straps (a mug, a bag): the fingers curl through, no thumb needed', fingers: 'curl through the handle', ap: 'hook' },
  prismatic4: { name: 'Prismatic four-finger', cls: 'precision', opp: 'pad', thumb: 'abducted', fits: 'flat things held on their faces (a phone)', fingers: 'four pads on the back face, thumb on the front', ap: 'flat' },
  twoHand: { name: 'Two hands (bimanual)', cls: 'power', opp: 'palm', thumb: 'abducted', fits: 'things too big or heavy for one hand: palms on opposite sides', fingers: 'under the edges', ap: 'two' }
};
/* ---------- the surface: a signed distance ---------- */
function lgoSdfPart(q, x, y, z) {
  switch (q[0]) {
    case 'cyl': { const c = q[1], dr = Math.hypot(x - c[0], y - c[1]) - q[2], dz = Math.abs(z - c[2]) - q[3]; return Math.min(Math.max(dr, dz), 0) + Math.hypot(Math.max(dr, 0), Math.max(dz, 0)); }
    case 'box': { const c = q[1], h = q[2], b = q[3] || 0, qx = Math.abs(x - c[0]) - h[0] + b, qy = Math.abs(y - c[1]) - h[1] + b, qz = Math.abs(z - c[2]) - h[2] + b; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - b; }
    case 'sph': { const c = q[1]; return Math.hypot(x - c[0], y - c[1], z - c[2]) - q[2]; }
    case 'cap': { const a = q[1], b = q[2], ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], px = x - a[0], py = y - a[1], pz = z - a[2], t = clamp((px * ux + py * uy + pz * uz) / (ux * ux + uy * uy + uz * uz || 1e-9), 0, 1); return Math.hypot(px - ux * t, py - uy * t, pz - uz * t) - q[3]; }
  }
  return 1e9;
}
function lgoSdf(o, x, y, z) { let d = 1e9; for (const q of o.parts) { const v = lgoSdfPart(q, x, y, z); if (v < d) d = v; } return d; }
// the outward direction of the surface at a point (central differences)
function lgoNormal(o, p) { const e = 0.0007; return curV3.norm([lgoSdf(o, p[0] + e, p[1], p[2]) - lgoSdf(o, p[0] - e, p[1], p[2]), lgoSdf(o, p[0], p[1] + e, p[2]) - lgoSdf(o, p[0], p[1] - e, p[2]), lgoSdf(o, p[0], p[1], p[2] + e) - lgoSdf(o, p[0], p[1], p[2] - e)]); }
// size: the extents of the object
function lgoBounds(o) {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const q of o.parts) {
    let a, b;
    if (q[0] === 'cyl') { a = [q[1][0] - q[2], q[1][1] - q[2], q[1][2] - q[3]]; b = [q[1][0] + q[2], q[1][1] + q[2], q[1][2] + q[3]]; }
    else if (q[0] === 'box') { a = [0, 1, 2].map(i => q[1][i] - q[2][i]); b = [0, 1, 2].map(i => q[1][i] + q[2][i]); }
    else if (q[0] === 'sph') { a = q[1].map(v => v - q[2]); b = q[1].map(v => v + q[2]); }
    else { a = [0, 1, 2].map(i => Math.min(q[1][i], q[2][i]) - q[3]); b = [0, 1, 2].map(i => Math.max(q[1][i], q[2][i]) + q[3]); }
    for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], a[i]); hi[i] = Math.max(hi[i], b[i]); }
  }
  return { lo: lo, hi: hi, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]] };
}
/* ---------- the models (one per thing; drawn by LEGEND like any prop) ---------- */
function lgoMake(B, key) {
  const o = LGO_OBJ[key]; lgBone(B, 'root');
  const mat = lgMtl({ c: o.col, t: LT[o.t] == null ? -1 : LT[o.t], r: o.t === 'metal' ? 0.35 : 0.6, m: o.t === 'metal' ? 0.6 : 0, k: 0.6 });
  lgMat(B, mat);
  for (const q of o.parts) {
    if (q[0] === 'cyl') { const c = q[1], r = q[2], h = q[3]; lgLathe(B, [[r * 0.94, c[2] - h], [r, c[2] - h + Math.min(h * 0.2, 0.004)], [r, c[2] + h - Math.min(h * 0.2, 0.004)], [r * 0.94, c[2] + h]], { segs: 22, ox: c[0], oy: c[1], capB: true, capT: true }); }
    else if (q[0] === 'box') lgBox(B, q[1][0], q[1][1], q[1][2], q[2][0], q[2][1], q[2][2], q[3] || 0);
    else if (q[0] === 'sph') lgSphere(B, q[1][0], q[1][1], q[1][2], q[2], q[2], q[2], { segs: 20, rings: 14 });
    else if (q[0] === 'cap') lgTube(B, [q[1], q[2]], q[3], { segs: 10 });
  }
}
for (const k in LGO_OBJ) LG_MAKERS['obj_' + k] = (B) => lgoMake(B, k);
/* ---------- the hand, as LEGEND knows it ---------- */
// hand space: -z from the wrist to the fingertips, +x the thumb side, the palm faces +y (right) or -y (left)
const LGO_PALM_C = [0.004, 0.0175, -0.052];   // the middle of the palm's surface (right hand)
function lgoPalmPts(ps) { const o = []; for (let x = -0.026; x <= 0.031; x += 0.0095) for (let z = -0.022; z >= -0.086; z -= 0.0107) o.push([x, 0.0175 * ps, z]); return o; }
function lgoM(x, y, z, o) { const M = lgM4(); M[0] = x[0]; M[1] = x[1]; M[2] = x[2]; M[4] = y[0]; M[5] = y[1]; M[6] = y[2]; M[8] = z[0]; M[9] = z[1]; M[10] = z[2]; if (o) { M[12] = o[0]; M[13] = o[1]; M[14] = o[2]; } return M; }
// a hand frame (in the object's space) from its thumb-side axis, the direction the palm faces, and the palm's middle point
function lgoHandFrame(thumbAx, palmDir, palmAt, ps) {
  const x = curV3.norm(thumbAx), yh = curV3.mul(curV3.norm(palmDir), ps);
  // square the palm direction to the thumb axis
  let y = curV3.sub(yh, curV3.mul(x, curV3.dot(yh, x))); y = curV3.norm(y); const z = curV3.cross(x, y);
  const M = lgoM(x, y, z), pc = lgPt(M, LGO_PALM_C[0], LGO_PALM_C[1] * ps, LGO_PALM_C[2]);
  M[12] = palmAt[0] - pc[0]; M[13] = palmAt[1] - pc[1]; M[14] = palmAt[2] - pc[2]; return M;
}
/* ---------- choosing a grasp ---------- */
// the taxonomy as rules: shape, size (the longest dimension predicts best) and weight, then the task
function lgoShape(o) {
  const b = lgoBounds(o), sz = b.size.slice().sort((p, q) => p - q), main = o.parts[0];
  if (o.two) return { kind: 'big', b: b, sz: sz };
  if (main[0] === 'sph') return { kind: 'sphere', d: main[2] * 2, b: b, sz: sz };
  if (main[0] === 'cyl' && main[3] < main[2] * 0.2) return { kind: 'disk', d: main[2] * 2, b: b, sz: sz };
  if (main[0] === 'cyl') return { kind: 'cylinder', d: main[2] * 2, len: main[3] * 2, b: b, sz: sz };
  if (main[0] === 'box' && sz[0] < 0.012) return { kind: sz[2] < 0.05 ? 'tab' : 'slab', b: b, sz: sz };
  return { kind: 'box', b: b, sz: sz };
}
function lgoChoose(key, task) {
  const o = LGO_OBJ[key], sh = lgoShape(o); task = task || 'carry';
  if (o.pref && o.pref[task]) return { type: o.pref[task], why: 'how people hold a ' + o.name.toLowerCase() + ' to ' + task, shape: sh };
  if (sh.kind === 'big' || o.kg > 4) return { type: 'twoHand', why: 'too big or too heavy for one hand', shape: sh };
  if (sh.kind === 'sphere') return { type: sh.d >= 0.05 ? 'powerSphere' : 'tripod', why: sh.d >= 0.05 ? 'a ball that fills the palm' : 'a small ball, held in the pads', shape: sh };
  if (sh.kind === 'cylinder') return { type: sh.d >= 0.05 ? 'largeDiameter' : sh.d >= 0.03 ? 'mediumWrap' : sh.d >= 0.012 ? 'smallDiameter' : 'writingTripod', why: 'a cylinder ' + (sh.d * 100).toFixed(1) + ' cm across', shape: sh };
  if (sh.kind === 'disk') return { type: 'palmarPinch', why: 'a small flat disc', shape: sh };
  if (sh.kind === 'tab') return { type: 'lateralPinch', why: 'a thin small plate', shape: sh };
  if (sh.kind === 'slab') return { type: 'prismatic4', why: 'a thin flat thing held on its faces', shape: sh };
  return { type: o.kg > 0.35 && sh.sz[2] > 0.05 ? 'mediumWrap' : 'tripod', why: 'by size and weight', shape: sh };
}
/* ---------- closing the fingers on a surface ---------- */
// the same joint-by-joint closing the gun grips use, feeling a signed distance instead of a cloud of points
function lgoSegHit(sdf, A, B, r) { for (let t = 0; t <= 1.0001; t += 0.25) { const p = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]; if (sdf(p) < r) return true; } return false; }
function lgoClose(sdf, mkBase, lens, r, s, lo, hi, dflt) {
  const c = lo.slice(), touched = [false, false, false];
  for (let j = 0; j < 3; j++) {
    for (let a = lo[j]; a <= hi[j] + 1e-6; a += 0.035) {
      c[j] = a;
      const hit = !lghChain(mkBase(c[0]), 0, 0, 0, c, lens, s, (k, A, B) => k < j ? true : !lgoSegHit(sdf, A, B, k === 2 ? r * 0.92 : r));
      if (hit) { c[j] = Math.max(lo[j], a - 0.035); touched[j] = true; break; }
    }
    if (!touched[j]) c[j] = dflt[j];
  }
  return { c: c, touched: touched };
}
// preshapes for each grasp before the fingers close: which fingers close, their starting curls and spread, the thumb
const LGO_PRE = {
  wrap: { close: [1, 1, 1, 1], f0: [0, 0.1, 0.1], sp: 0.08, t: [-0.5, 0.35, 0.45, 0.1, 0.05], thumb: true },
  sphere: { close: [1, 1, 1, 1], f0: [0, 0.1, 0.1], sp: 0.7, t: [-0.6, 0.3, 0.4, 0.1, 0.05], thumb: true },
  hook: { close: [1, 1, 1, 1], f0: [0.2, 0.3, 0.2], sp: 0.05, t: [-0.15, 0.55, 0.6, 0.25, 0.2], thumb: false },
  two: { close: [1, 1, 1, 1], f0: [0, 0.05, 0.05], sp: 0.25, t: [-0.7, 0.1, 0.3, 0.05, 0.02], thumb: false },
  flat: { close: [1, 1, 1, 1], f0: [0.1, 0.1, 0.1], sp: 0.3, t: [-0.45, 0.4, 0.5, 0.15, 0.1], thumb: true }
};
// fit a hand (frame S in object space) to an object: palm onto it, then each finger and the thumb closes
function lgoFit(o, S, ps, pre, extIdx) {
  const s = ps, d = -ps, sdfO = (p) => lgoSdf(o, p[0], p[1], p[2]);
  // the palm onto the surface: slide along the palm's direction until the nearest palm point is just touching
  const pts = lgoPalmPts(ps); let mind = 1e9;
  for (const q of pts) { const w = lgPt(S, q[0], q[1], q[2]); mind = Math.min(mind, sdfO(w)); }
  const slide = clamp(mind - 0.0008, -0.03, 0.06), pn = [S[4] * ps, S[5] * ps, S[6] * ps], S2 = S.slice();
  if (pre !== LGO_PRE.hook && pre !== LGO_PRE.flat) { S2[12] += pn[0] * slide; S2[13] += pn[1] * slide; S2[14] += pn[2] * slide; }
  const sdfH = (p) => { const w = lgPt(S2, p[0], p[1], p[2]); return sdfO(w); };
  const g = { f: [], t: pre.t.slice(), sp: pre.sp }, touched = [];
  for (let k = 0; k < 4; k++) {
    const [f, x, z, l2, l3] = LG_FINGERS[k], lens = [l2, l3, l3 * 0.8], r = LGH_R[f], fan = LGH_FAN[k] * g.sp;
    const kn = lgTR(x, d * (f === 'pnk' ? 0 : 0.0025), -z), mk = c0 => lgMul(lgM4(), kn, lgRot(lgM4(), c0 * s, fan, 0));
    if (!pre.close[k] || (extIdx && k === 0)) { g.f.push(extIdx && k === 0 ? [0.12, 0.08, 0.05] : [0.9, 1.2, 0.6]); touched.push([false, false, false]); continue; }
    const res = lgoClose(sdfH, mk, lens, r, s, pre.f0, [1.6, 1.82, 1.25], [1.5, 1.6, 0.85]); g.f.push(res.c); touched.push(res.touched);
  }
  if (pre.thumb) {
    const T = pre.t, kn = lgTR(0.025, -d * 0.007, -0.024), mk = c0 => lgMul(lgM4(), kn, lgRot(lgM4(), c0 * s, T[0], T[2] * s));
    const res = lgoClose(sdfH, mk, [0.04, 0.031, 0.025], 0.0102, s, [Math.max(0, T[1] - 0.45), 0, 0], [T[1] + 0.85, 0.9, 0.85], [T[1], T[3], T[4]]);
    g.t = [T[0], res.c[0], T[2], res.c[1], res.c[2]]; touched.push(res.touched);
  }
  return { S: S2, g: g, touched: touched, slide: slide };
}
// how good a fit is: each closing finger's nearest point to the surface (its gap), and how deep anything sinks in
function lgoFitQuality(o, fit, ps, pre, extIdx) {
  const S = fit.S, g = fit.g, s = ps, d = -ps, sdfH = (p) => { const w = lgPt(S, p[0], p[1], p[2]); return lgoSdf(o, w[0], w[1], w[2]); };
  let pen = 0, gaps = [], contacts = 0;
  for (let k = 0; k < 4; k++) {
    const [f, x, z, l2, l3] = LG_FINGERS[k], lens = [l2, l3, l3 * 0.8], r = LGH_R[f], c = g.f[k];
    const base = lgMul(lgM4(), lgTR(x, d * (f === 'pnk' ? 0 : 0.0025), -z), lgRot(lgM4(), c[0] * s, LGH_FAN[k] * (g.sp || 0), 0));
    let near = 1e9;
    lghChain(base, 0, 0, 0, c, lens, s, (j, A, B) => { for (let t = 0; t <= 1.0001; t += 0.125) { const p = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t], v = sdfH(p) - (j === 2 ? r * 0.92 : r); near = Math.min(near, v); pen = Math.min(pen, v); } });
    if (pre.close[k] && !(extIdx && k === 0)) { gaps.push(near); if (near < 0.004) contacts++; }
  }
  if (pre.thumb) {
    const T = g.t, base = lgMul(lgM4(), lgTR(0.025, -d * 0.007, -0.024), lgRot(lgM4(), T[1] * s, T[0], T[2] * s)); let near = 1e9;
    lghChain(base, 0, 0, 0, [T[1], T[3], T[4]], [0.04, 0.031, 0.025], s, (j, A, B) => { for (let t = 0; t <= 1.0001; t += 0.125) { const p = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t], v = sdfH(p) - 0.0102; near = Math.min(near, v); pen = Math.min(pen, v); } });
    gaps.push(near); if (near < 0.004) contacts++;
  }
  // the palm (for the grasps that hold in the palm)
  let palm = 1e9; for (const q of lgoPalmPts(ps)) { palm = Math.min(palm, sdfH(q)); pen = Math.min(pen, sdfH(q) + 0.0005); }
  return { pen: pen, gaps: gaps, contacts: contacts, palm: palm, maxGap: Math.max(...gaps) };
}
/* ---------- placing the hand for a grasp ---------- */
// candidates of the hand's frame (object space) for a grasp, from an approach direction (object space, horizontal)
function lgoPlace(key, type, ps, app) {
  const o = LGO_OBJ[key], G = LGO_GRASPS[type], up = [0, 0, 1], a = curV3.norm([app[0], app[1], 0]);
  const main = o.parts[0];
  switch (G.ap) {
    case 'wrap': {
      // round the cylinder (or a handle) at about a third of its height, thumb up, palm toward the axis
      const c = main[1], r = main[2], z = type === 'indexExt' ? c[2] : c[2] + (main[3] || 0) * (type === 'largeDiameter' ? -0.1 : 0);
      return { S: lgoHandFrame(up, curV3.mul(a, -1), [c[0] + a[0] * r, c[1] + a[1] * r, z], ps), pre: LGO_PRE.wrap, ext: type === 'indexExt' };
    }
    case 'hook': {
      const h = o.handle, c = h.c;   // the palm outside the handle, the fingers curling through it
      const out = curV3.norm([c[0], c[1], 0]);
      return { S: lgoHandFrame(up, curV3.mul(out, -1), [c[0] + out[0] * (h.r + 0.012), c[1] + out[1] * (h.r + 0.012), c[2] + 0.004], ps), pre: LGO_PRE.hook };
    }
    case 'sphere': {
      const c = main[1], r = main[2];
      return { S: lgoHandFrame(up, curV3.mul(a, -1), [c[0] + a[0] * r, c[1] + a[1] * r, c[2] + r * 0.15], ps), pre: LGO_PRE.sphere };
    }
    case 'two': {
      const b = lgoBounds(o), c = [(b.lo[0] + b.hi[0]) / 2, (b.lo[1] + b.hi[1]) / 2, b.lo[2] + b.size[2] * 0.62], side = ps > 0 ? -1 : 1, fy = side * b.size[1] / 2;
      // palms on the side faces (toward the top, where a crate's handles are), thumbs forward, fingers down
      return { S: lgoHandFrame([1, 0, 0], [0, -side, 0], [c[0] - b.size[0] * 0.05, fy, c[2]], ps), pre: LGO_PRE.two };
    }
    case 'flat': {
      // a phone held upright: the palm behind it, thumb along its edge on the front
      const b = lgoBounds(o), c = [0, 0, 0];
      return { S: lgoHandFrame(up, curV3.mul(a, -1), [c[0] + a[0] * (b.size[0] / 2 + 0.006), c[1] + a[1] * (b.size[0] / 2 + 0.006), c[2] - 0.01], ps), pre: LGO_PRE.flat };
    }
  }
  return null;
}
// pad and side grasps: the object goes to where the pads meet (the hand does not wrap it)
const LGO_PADS = {
  palmarPinch: { use: [1, 0, 0, 0], f: [[0.5, 0.55, 0.3], [1.0, 1.3, 0.7], [1.1, 1.35, 0.7], [1.2, 1.35, 0.7]], t: [-0.3, 0.75, 0.75, 0.2, 0.15], align: 'thin' },
  tripod: { use: [1, 1, 0, 0], f: [[0.55, 0.6, 0.35], [0.6, 0.65, 0.35], [1.1, 1.35, 0.7], [1.2, 1.35, 0.7]], t: [-0.3, 0.8, 0.75, 0.2, 0.15], align: 'any' },
  writingTripod: { use: [1, 0, 0, 0], f: [[0.4, 0.5, 0.3], [0.85, 0.95, 0.45], [1.1, 1.3, 0.7], [1.2, 1.35, 0.7]], t: [-0.3, 0.7, 0.7, 0.2, 0.15], align: 'pen' },
  lateralPinch: { use: [0, 0, 0, 0], f: [[0.95, 1.25, 0.7], [1.05, 1.35, 0.7], [1.1, 1.35, 0.7], [1.2, 1.35, 0.7]], t: [-0.05, 0.85, 0.6, 0.1, 0.05], align: 'side' },
  tripodBall: { use: [1, 1, 0, 0], f: [[0.35, 0.45, 0.25], [0.35, 0.45, 0.25], [1.0, 1.25, 0.7], [1.1, 1.3, 0.7]], t: [-0.45, 0.85, 0.7, 0.15, 0.1], align: 'ball' },
  prismatic4: { use: [1, 1, 1, 1], f: [[0.35, 0.3, 0.15], [0.35, 0.3, 0.15], [0.35, 0.3, 0.15], [0.4, 0.3, 0.15]], t: [-0.35, 0.75, 0.7, 0.15, 0.1], align: 'flat' }
};
function lgoPad(chain, c, s) { let pad = null; lghChain(chain, 0, 0, 0, c, chain.lens, s, (j, A, B) => { if (j === 2) pad = [A[0] + (B[0] - A[0]) * 0.72, A[1] + (B[1] - A[1]) * 0.72, A[2] + (B[2] - A[2]) * 0.72]; }); return pad; }
// the object's thickness between the pads (along its thinnest dimension, or across a cylinder or a ball)
function lgoThick(o, align) { const m = o.parts[0]; if (m[0] === 'cyl') return align === 'thin' ? m[3] * 2 : m[2] * 2; if (m[0] === 'sph') return m[2] * 2 * 0.86; if (m[0] === 'box') return Math.min(...m[2]) * 2; return 0.01; }
// the thumb brought to a point: opposition. The thumb's five turns are searched (each within its range) until its pad
// is at the point; the curve of the distance on the way is what LEGEND learns from
const LGO_TR = [[-0.95, 0.35], [0, 1.45], [0, 1.45], [0, 0.95], [0, 0.95]];
function lgoThumbPad(T, s, d) { const tb = lgMul(lgM4(), lgTR(0.025, -d * 0.007, -0.024), lgRot(lgM4(), T[1] * s, T[0], T[2] * s)); tb.lens = [0.04, 0.031, 0.025]; return lgoPad(tb, [T[1], T[3], T[4]], s); }
function lgoOppose(target, T0, s, d, curve) {
  const T = T0.slice(), cost = t => { const p = lgoThumbPad(t, s, d); let c = curV3.len(curV3.sub(p, target)); for (let i = 0; i < 5; i++) c += Math.abs(t[i] - T0[i]) * 0.002; return c; };
  let best = cost(T);
  for (let step = 0.16; step > 0.005; step *= 0.5) {
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < 5; i++) for (const sg of [1, -1]) { const v = T[i] + sg * step; if (v < LGO_TR[i][0] || v > LGO_TR[i][1]) continue; const o = T[i]; T[i] = v; const c = cost(T); if (c < best - 1e-7) { best = c; improved = true; } else T[i] = o; }
      if (curve) curve.push(best);
      if (curve && curve.length > 400) break;
    }
  }
  return { T: T, err: curV3.len(curV3.sub(lgoThumbPad(T, s, d), target)) };
}
function lgoPadGrasp(key, type, ps) {
  const o = LGO_OBJ[key], P0 = LGO_PADS[type], s = ps, d = -ps, main = o.parts[0];
  const fBase = (k, c0) => { const [f, x, z] = LG_FINGERS[k]; return lgMul(lgM4(), lgTR(x, d * (f === 'pnk' ? 0 : 0.0025), -z), lgRot(lgM4(), c0 * s, LGH_FAN[k] * (P0.align === 'flat' ? 0.15 : 0.05), 0)); };
  const lens = k => [LG_FINGERS[k][3], LG_FINGERS[k][4], LG_FINGERS[k][4] * 0.8];
  const th = lgoThick(o, P0.align), want = th + (P0.align === 'side' ? 0.0088 : 0.0085) + 0.0095;
  // the opposing side for given finger curls: the pads of the fingers in use (or the side of the index's middle bone)
  const opposing = (F) => {
    if (P0.align === 'side') { const c = F[0], b = fBase(0, c[0]); let fp; lghChain(b, 0, 0, 0, c, lens(0), s, (j, A, B) => { if (j === 1) fp = curV3.add(curV3.lerp(A, B, 0.5), [0.0088, 0, 0]); }); return { fp: fp, fn: [1, 0, 0] }; }
    let n = 0, fp = [0, 0, 0], fn = [0, 0, 0];
    for (let k = 0; k < 4; k++) if (P0.use[k]) {
      const c = F[k], b = fBase(k, c[0]); b.lens = lens(k); let seg = null; lghChain(b, 0, 0, 0, c, lens(k), s, (j, A, B) => { if (j === 2) seg = [A, B]; });
      fp = curV3.add(fp, lgoPad(b, c, s)); n++;
      const ax = curV3.norm(curV3.sub(seg[1], seg[0])); fn = curV3.add(fn, curV3.norm(curV3.sub([0, ps, 0], curV3.mul(ax, curV3.dot([0, ps, 0], ax)))));
    }
    return { fp: curV3.mul(fp, 1 / n), fn: curV3.norm(fn) };
  };
  // opposition: the thumb's turns and the curls of the fingers in use, searched together until the thumb's pad sits across the
  // object from theirs (each joint within its range; a little cost for leaving the grasp's own shape)
  const idx = []; for (let k = 0; k < 4; k++) if (P0.use[k] || (P0.align === 'side' && k === 0)) idx.push(k);
  const v0 = P0.t.slice(); for (const k of idx) v0.push(...P0.f[k]);
  const unpack = v => { const F = P0.f.map(c => c.slice()); idx.forEach((k, i) => { F[k] = v.slice(5 + i * 3, 8 + i * 3); }); return { T: v.slice(0, 5), F: F }; };
  const rng = i => i < 5 ? LGO_TR[i] : [[0, 1.6], [0, 1.82], [0, 1.25]][(i - 5) % 3];
  // (and the thumb's last bone lies across the line between the pads, so its pad, not its tip, meets the object)
  const tAxis = T => { const tb = lgMul(lgM4(), lgTR(0.025, -d * 0.007, -0.024), lgRot(lgM4(), T[1] * s, T[0], T[2] * s)); let ax = null; lghChain(tb, 0, 0, 0, [T[1], T[3], T[4]], [0.04, 0.031, 0.025], s, (j, A, B) => { if (j === 2) ax = curV3.norm(curV3.sub(B, A)); }); return ax; };
  const cost = v => { const u = unpack(v), op = opposing(u.F), tp = lgoThumbPad(u.T, s, d), tgt = curV3.add(op.fp, curV3.mul(op.fn, want)); let c = curV3.len(curV3.sub(tp, tgt)); c += Math.abs(curV3.dot(tAxis(u.T), op.fn)) * 0.012; for (let i = 0; i < v.length; i++) c += Math.abs(v[i] - v0[i]) * 0.0015; return c; };
  const v = v0.slice(), curve = []; let best = cost(v);
  for (let step = 0.16; step > 0.004; step *= 0.5) {
    let improved = true, guard = 0;
    while (improved && guard++ < 30) {
      improved = false;
      for (let i = 0; i < v.length; i++) for (const sg of [1, -1]) { const nv = v[i] + sg * step, r = rng(i); if (nv < r[0] || nv > r[1]) continue; const ov = v[i]; v[i] = nv; const c = cost(v); if (c < best - 1e-7) { best = c; improved = true; } else v[i] = ov; }
      curve.push(best);
    }
  }
  const U = unpack(v), op = opposing(U.F), tp = lgoThumbPad(U.T, s, d), fp = op.fp, err = curV3.len(curV3.sub(tp, curV3.add(fp, curV3.mul(op.fn, want))));
  const u = curV3.norm(curV3.sub(fp, tp)), handX = [1, 0, 0], handZ = [0, 0, 1], palmN = [0, ps, 0];
  const C0 = curV3.add(tp, curV3.mul(u, 0.0095 + th / 2));
  let X, Y, Z, C = C0;
  const longCyl = main[0] === 'cyl' && main[3] > main[2] * 2;   // a pen, a rod: pinched across, its length lying toward the web of the thumb
  if (P0.align === 'pen' || longCyl) { const web = [0.03, 0.0, -0.012], ax = curV3.norm(curV3.sub(web, C0)); Z = curV3.norm(curV3.sub(ax, curV3.mul(u, curV3.dot(ax, u)))); X = u; Y = curV3.cross(Z, X); C = curV3.add(C0, curV3.mul(Z, 0.035)); }
  else if (P0.align === 'ball') { const r = main[2], dir = curV3.norm(curV3.sub(curV3.mul(handZ, -1), curV3.mul(u, curV3.dot(curV3.mul(handZ, -1), u)))); C = curV3.add(curV3.lerp(tp, fp, 0.5), curV3.mul(dir, Math.sqrt(Math.max(0, r * r - curV3.len(curV3.sub(fp, tp)) ** 2 / 4)))); X = handX; Y = curV3.mul(palmN, ps); Z = curV3.cross(X, Y); }
  else {
    const thinAx = main[0] === 'cyl' ? 'z' : main[0] === 'box' ? ['x', 'y', 'z'][main[2].indexOf(Math.min(...main[2]))] : 'z';
    const t = u, along = curV3.norm(curV3.sub([0, 0, -1], curV3.mul(t, curV3.dot([0, 0, -1], t))));
    if (thinAx === 'z') { Z = t; X = along; Y = curV3.cross(Z, X); }
    else if (thinAx === 'x') { X = t; Z = along; Y = curV3.cross(Z, X); }
    else { Y = t; Z = along; X = curV3.cross(Y, Z); }
    if (P0.align === 'flat') C = curV3.add(C0, curV3.mul(along, -0.02));
  }
  const g = { f: U.F, t: U.T, sp: P0.align === 'flat' ? 0.15 : 0.05 }, pre = { close: P0.use.map(u2 => !!u2), thumb: true };
  // the object may turn about the line between the pads; it settles where nothing of the hand sinks into it
  let bestS = null, bestPen = -1e9;
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * TAU, rot = (v) => { const c = Math.cos(a), sn = Math.sin(a), dd = curV3.dot(v, u), cr = curV3.cross(u, v); return [v[0] * c + cr[0] * sn + u[0] * dd * (1 - c), v[1] * c + cr[1] * sn + u[1] * dd * (1 - c), v[2] * c + cr[2] * sn + u[2] * dd * (1 - c)]; };
    const Cc = curV3.add(C0, rot(curV3.sub(C, C0))), Mo = lgoM(rot(X), rot(Y), rot(Z), Cc), S = lgInv(lgM4(), Mo);
    const q = lgoFitQuality(o, { S: S, g: g }, ps, pre, false), pen = q.pen + (i ? 0 : 0.0003);
    if (pen > bestPen) { bestPen = pen; bestS = S; }
  }
  return { S: bestS, g: g, touched: [], pre: pre, opp: { err: err, curve: curve } };
}
/* ---------- settling: the hand and the thing find each other ---------- */
// A first fit puts the hand on the object; then the grasp settles the way a real one does: the object shifts and turns in
// the hand and every joint in use moves a little, until the contacts the grasp needs are touching, nothing sinks in
// further than a glove's padding gives (1.5 mm), the forces from the contacts can balance (their directions oppose),
// and the fingers keep their natural coupling (the last joint bends about two thirds as much as the middle one).
// The cost on the way down is kept: the curve of the grasp learning to hold the thing.
const LGO_COMP = 0.0015;   // how far skin and glove give
const LGO_CONTACTS = {     // which parts must touch, by the grasp's opposition: [finger segments, thumb, palm]
  wrap: { seg: [1, 2], thumb: true, palm: 'touch' }, sphere: { seg: [2], thumb: true, palm: 'near' }, hook: { seg: [1, 2], thumb: false, palm: 'off' },
  pads: { seg: [2], thumb: true, palm: 'off' }, pinch: { seg: [2], thumb: true, palm: 'off' }, side: { seg: [1], thumb: true, palm: 'off', only: [0] },
  flat: { seg: [2], thumb: true, palm: 'off' }
};
// every bone of the hand as a capsule in hand space, for a grip g
function lgoSegs(g, ps) {
  const s = ps, d = -ps, out = [];
  for (let k = 0; k < 4; k++) {
    const [f, x, z, l2, l3] = LG_FINGERS[k], c = g.f[k], base = lgMul(lgM4(), lgTR(x, d * (f === 'pnk' ? 0 : 0.0025), -z), lgRot(lgM4(), c[0] * s, LGH_FAN[k] * (g.sp || 0), 0));
    lghChain(base, 0, 0, 0, c, [l2, l3, l3 * 0.8], s, (j, A, B) => { out.push({ k: k, j: j, A: A, B: B, r: j === 2 ? LGH_R[f] * 0.92 : LGH_R[f] }); });
  }
  const T = g.t, tb = lgMul(lgM4(), lgTR(0.025, -d * 0.007, -0.024), lgRot(lgM4(), T[1] * s, T[0], T[2] * s));
  lghChain(tb, 0, 0, 0, [T[1], T[3], T[4]], [0.04, 0.031, 0.025], s, (j, A, B) => { out.push({ k: 4, j: j, A: A, B: B, r: 0.0102 }); });
  return out;
}
function lgoSettle(key, gr, o3) {
  o3 = o3 || {}; const o = LGO_OBJ[key], G = LGO_GRASPS[gr.type], ps = gr.side === 'L' ? -1 : 1, s = ps;
  const CT = LGO_CONTACTS[G.ap]; if (!CT) return null;
  const used = [0, 1, 2, 3].filter(k => gr.pre.close[k] && !(gr.ext && k === 0) && (!CT.only || CT.only.indexOf(k) >= 0));
  if (G.ap === 'side') used.length = 0;
  const thumb = CT.thumb && gr.pre.thumb !== false, Mo0 = lgInv(lgM4(), gr.S), bb = lgoBounds(o), cO = [(bb.lo[0] + bb.hi[0]) / 2, (bb.lo[1] + bb.hi[1]) / 2, (bb.lo[2] + bb.hi[2]) / 2], cH = lgPt(Mo0, cO[0], cO[1], cO[2]);
  // the variables: the object's move (3) and turn (3) in the hand, then the joints in use
  const jIdx = []; for (const k of used) for (let j = 0; j < 3; j++) jIdx.push([k, j]);
  if (G.ap === 'side') for (let j = 0; j < 3; j++) jIdx.push([0, j]);
  if (thumb) for (let j = 0; j < 5; j++) jIdx.push([4, j]);
  const n = 6 + jIdx.length, v0 = new Array(n).fill(0); jIdx.forEach(([k, j], i) => { v0[6 + i] = k === 4 ? gr.g.t[j] : gr.g.f[k][j]; });
  const lim = ([k, j]) => k === 4 ? LGO_TR[j] : [[0, 1.6], [-0.05, 1.82], [-0.08, 1.25]][j];
  const build = v => {
    const g = { f: gr.g.f.map(c => c.slice()), t: gr.g.t.slice(), sp: gr.g.sp }; jIdx.forEach(([k, j], i) => { if (k === 4) g.t[j] = v[6 + i]; else g.f[k][j] = v[6 + i]; });
    const Mo = lgMul(lgM4(), lgTR(cH[0] + v[0], cH[1] + v[1], cH[2] + v[2]), lgMul(lgM4(), lgRot(lgM4(), v[3], v[4], v[5]), lgMul(lgM4(), lgTR(-cH[0], -cH[1], -cH[2]), Mo0)));
    return { g: g, S: lgInv(lgM4(), Mo) };
  };
  const palmPts = lgoPalmPts(ps), wantSeg = {}; for (const k of used) for (const j of CT.seg) wantSeg[k * 3 + j] = 1;
  if (G.ap === 'side') wantSeg[1] = 1;
  const measure = (B) => {
    const S = B.S, sd = (p) => { const w = lgPt(S, p[0], p[1], p[2]); return lgoSdf(o, w[0], w[1], w[2]); };
    const segs = lgoSegs(B.g, ps); let pen = 0, cost = 0; const near = {}, nearP = {};
    for (const q of segs) {
      let mn = 1e9, mp = null;
      for (let t = 0; t <= 1.0001; t += 0.125) { const p = [q.A[0] + (q.B[0] - q.A[0]) * t, q.A[1] + (q.B[1] - q.A[1]) * t, q.A[2] + (q.B[2] - q.A[2]) * t], v = sd(p) - q.r; if (v < mn) { mn = v; mp = p; } if (v < -LGO_COMP) cost += (v + LGO_COMP) * (v + LGO_COMP) * 6; }
      near[q.k * 3 + q.j] = mn; nearP[q.k * 3 + q.j] = mp; if (mn < pen) pen = mn;
    }
    let palm = 1e9, palmP = null; for (const q of palmPts) { const v = sd(q); if (v < palm) { palm = v; palmP = q; } if (v < -0.001) cost += (v + 0.001) * (v + 0.001) * 6; }
    // the contacts the grasp needs: per finger, its nearest wanted segment
    const gaps = [], normals = [];
    const contact = (keys) => { let mn = 1e9, mk = null; for (const kk of keys) if (near[kk] < mn) { mn = near[kk]; mk = kk; } return [mn, mk]; };
    for (const k of used) { const [g2, kk] = contact(CT.seg.map(j => k * 3 + j)); gaps.push(g2); if (g2 < 0.004) normals.push(lgoNormalH(o, S, nearP[kk])); }
    if (G.ap === 'side') { gaps.push(near[1]); if (near[1] < 0.004) normals.push(lgoNormalH(o, S, nearP[1])); }
    if (thumb) { const [g2, kk] = contact([14, 13]); gaps.push(g2); if (g2 < 0.004) normals.push(lgoNormalH(o, S, nearP[kk])); }
    for (const g2 of gaps) cost += g2 > 0 ? g2 * g2 * 2 : 0;
    if (CT.palm === 'touch') cost += palm > 0 ? palm * palm * 1.5 : 0;
    else if (CT.palm === 'near') cost += palm > 0.006 ? (palm - 0.006) * (palm - 0.006) : 0;
    else if (CT.palm === 'off') cost += palm < 0.004 ? (0.004 - palm) * (0.004 - palm) * 3 : 0;
    // balance: the directions the contacts push in should cancel (the object can be held still)
    // (the palm, when it touches, is a contact too)
    const all = normals.slice(); if (CT.palm !== 'off' && palm < 0.004 && palmP) all.push(lgoNormalH(o, S, palmP));
    const bal = lgoBalance(all, 0.8);
    if (G.ap !== 'hook') cost += bal * bal * 6e-6;
    return { cost: cost, pen: pen, palm: palm, gaps: gaps, bal: bal, contacts: normals.length };
  };
  const reg = v => { let c = 0; for (let i = 0; i < 6; i++) c += v[i] * v[i] * (i < 3 ? 0.002 : 2e-6); jIdx.forEach(([k, j], i) => { const d2 = v[6 + i] - v0[6 + i]; c += d2 * d2 * 1.2e-5; }); for (const k of used) { const i1 = 6 + jIdx.findIndex(q => q[0] === k && q[1] === 1); if (i1 > 5) c += Math.pow(v[i1 + 1] - 0.67 * v[i1], 2) * 4e-6; } return c; };
  const f = v => measure(build(v)).cost + reg(v);
  const v = v0.slice(), curve = []; let best = f(v); curve.push(best);
  const step0 = i => i < 3 ? 0.004 : i < 6 ? 0.06 : 0.08;
  for (let lv = 0; lv < 6; lv++) {
    const sc = Math.pow(0.5, lv); let sweeps = 0, improved = true;
    while (improved && sweeps++ < (o3.sweeps || 14)) {
      improved = false;
      for (let i = 0; i < n; i++) for (const sg of [1, -1]) {
        const nv = v[i] + sg * step0(i) * sc; if (i >= 6) { const r = lim(jIdx[i - 6]); if (nv < r[0] || nv > r[1]) continue; }
        const ov = v[i]; v[i] = nv; const c = f(v); if (c < best - 1e-12) { best = c; improved = true; } else v[i] = ov;
      }
      curve.push(best);
    }
  }
  const B = build(v), m0 = measure(build(v0)), m1 = measure(B);
  return { S: B.S, g: B.g, before: m0, after: m1, curve: curve, moved: curV3.len(v.slice(0, 3)), turned: curV3.len(v.slice(3, 6)) };
}
// can the contacts hold the object still? Each contact pushes into the surface, anywhere inside its friction cone (skin on
// most things: a friction coefficient of about 0.8, a cone about 39 degrees wide). The pushes can balance when no
// direction is left unopposed: zero lies inside the hull of the cones. The answer is how far from zero the closest
// balance comes (0: the grasp can hold; 1: everything pushes one way). Found by Frank-Wolfe steps over the cones' edges.
function lgoBalance(normals, mu) {
  if (normals.length < 2) return 1;
  const E = [];
  for (const n of normals) {
    const f = curV3.mul(n, -1), a = Math.abs(f[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], t1 = curV3.norm(curV3.cross(f, a)), t2 = curV3.cross(f, t1), c = 1 / Math.sqrt(1 + mu * mu), sn = mu * c;
    for (let i = 0; i < 8; i++) { const an = i / 8 * TAU; E.push(curV3.norm([f[0] * c + (t1[0] * Math.cos(an) + t2[0] * Math.sin(an)) * sn, f[1] * c + (t1[1] * Math.cos(an) + t2[1] * Math.sin(an)) * sn, f[2] * c + (t1[2] * Math.cos(an) + t2[2] * Math.sin(an)) * sn])); }
  }
  let x = [0, 0, 0]; for (const e of E) x = curV3.add(x, e); x = curV3.mul(x, 1 / E.length);
  for (let it = 0; it < 120; it++) {
    let bj = null, bd = 1e9; for (const e of E) { const d = curV3.dot(x, e); if (d < bd) { bd = d; bj = e; } }
    const dx = curV3.sub(x, bj), gap = curV3.dot(x, dx); if (gap < 1e-7) break;
    const g = clamp(gap / (curV3.dot(dx, dx) || 1e-9), 0, 1); x = curV3.sub(x, curV3.mul(dx, g));
  }
  return curV3.len(x);
}
// the surface's direction at a hand-space point (in hand space)
function lgoNormalH(o, S, p) { const w = lgPt(S, p[0], p[1], p[2]), nO = lgoNormal(o, w), Mo = lgInv(lgM4(), S); return curV3.norm(lgDir(Mo, nO[0], nO[1], nO[2])); }
// a whole grasp: choose (or take) the type, place the hand, close it, and measure the fit
function lgoGrasp(key, o2) {
  o2 = o2 || {}; const t0 = performance.now(), ps = o2.side === 'L' ? -1 : 1, ch = o2.type ? { type: o2.type, why: 'asked for' } : lgoChoose(key, o2.task), o = LGO_OBJ[key], G = LGO_GRASPS[ch.type];
  let fit, pre, ext = false;
  if (LGO_PADS[ch.type]) { const r = lgoPadGrasp(key, ch.type, ps); fit = { S: r.S, g: r.g, touched: r.touched, opp: r.opp }; pre = r.pre; }
  else { const pl = lgoPlace(key, ch.type, ps, o2.app || [ps > 0 ? -0.3 : -0.3, ps > 0 ? -1 : 1, 0]); pre = pl.pre; ext = pl.ext; fit = lgoFit(o, pl.S, ps, pre, ext); }
  const q0 = lgoFitQuality(o, fit, ps, pre, ext); let st = null;
  if (o2.settle !== false && G.ap !== 'two') { st = lgoSettle(key, { type: ch.type, side: ps > 0 ? 'R' : 'L', S: fit.S, g: fit.g, pre: pre, ext: ext }); if (st) { fit.S = st.S; fit.g = st.g; } }
  const q = lgoFitQuality(o, fit, ps, pre, ext);
  LGO.made++; LGO.ms += performance.now() - t0;
  return { key: key, type: ch.type, name: G.name, why: ch.why, cls: G.cls, S: fit.S, g: fit.g, q: q, q0: q0, settle: st, side: ps > 0 ? 'R' : 'L', pre: pre, ext: ext, opp: fit.opp || null };
}
