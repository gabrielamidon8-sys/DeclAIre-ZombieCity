/* ================= LEGEND hands: grips that fit themselves =================
   1.9.994. A hand used to close on a gun by a table of finger angles written by eye, the same for every gun, so the
   fingers floated off one grip and sank into the next. Now each hand fits itself to the thing it holds, the way a real
   hand does:
   - The prop is read as a cloud of points (its own model, built once: every gun, the knife).
   - The palm first: the hand slides along its palm until the palm meets the grip (or the handguard, or the firing hand),
     so it neither floats off it nor sinks into it.
   - Then each finger closes like a real one: the knuckle turns until any part of the finger touches, then the middle
     joint, then the last, so the finger wraps the grip from the base out. The thumb closes the same way from its own
     side. The trigger finger lies along the frame until it is on the trigger, then curls onto it.
   - The support hand on a pistol wraps over the firing hand's fingers (they are part of what it closes on).
   Every fit is made once per gun, hand and grip and kept; the engine room reports how many it made and how long they took. */
const LGH = { cloud: new Map(), sock: new Map(), fit: new Map(), ms: 0, fits: 0, on: true, fails: 0 };
const LGH_FAN = [-0.09, -0.01, 0.07, 0.15];
const LGH_R = { idx: 0.0088, fin: 0.0091, rng: 0.0087, pnk: 0.0076 };
// the prop's points, in its own space
function lghCloud(prop, key) {
  const k = prop + '|' + (key || ''); let c = LGH.cloud.get(k); if (c) return c;
  const B = lgB(1), K = lgOpKit('attack'), D = key ? LG_GUN_DEF[key] : null;
  try {
    if (prop === 'knife') lgOpKnife(B, K);
    else if (prop === 'pistol') { if (D && D.fam === 'p') D.mk(B, K); else lgOpPistol(B, K); }
    else { if (D && D.fam === 'c') D.mk(B, K); else lgOpCarbine(B, K); }
  } catch (e) { lgHurt(e); }
  const bones = prop === 'pistol' ? ['pistol', 'slide', 'mag'] : prop === 'carbine' ? ['carbine', 'cmag'] : ['knife'], pts = [];
  // points over every face (a face's corners alone leave a flat grip full of holes a finger would slip through)
  const h = 0.0042;
  for (const n of bones) {
    const p = B.parts[LGB[n]]; if (!p) continue; const V = p.v, I = p.i, X = i => V[i * LG_STRIDE], Y = i => V[i * LG_STRIDE + 1], Z = i => V[i * LG_STRIDE + 2];
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t], b = I[t + 1], c = I[t + 2], ux = X(b) - X(a), uy = Y(b) - Y(a), uz = Z(b) - Z(a), vx = X(c) - X(a), vy = Y(c) - Y(a), vz = Z(c) - Z(a);
      const L = Math.max(Math.hypot(ux, uy, uz), Math.hypot(vx, vy, vz), Math.hypot(ux - vx, uy - vy, uz - vz)), n = Math.min(24, Math.max(1, Math.ceil(L / h)));
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) { const u = i / n, v = j / n; pts.push(X(a) + ux * u + vx * v, Y(a) + uy * u + vy * v, Z(a) + uz * u + vz * v); }
    }
  }
  c = new Float32Array(pts); LGH.cloud.set(k, c); return c;
}
// the cloud in a hand's space (S: the hand's frame in the prop's space), only what is within reach of that hand
function lghLocal(cloud, S, extra) {
  const I = lgInv(lgM4(), S), out = [];
  const add = (x, y, z) => { const hx = I[0] * x + I[4] * y + I[8] * z + I[12], hy = I[1] * x + I[5] * y + I[9] * z + I[13], hz = I[2] * x + I[6] * y + I[10] * z + I[14]; if (hx * hx + hy * hy + hz * hz < 0.03) out.push(hx, hy, hz); };
  for (let i = 0; i < cloud.length; i += 3) add(cloud[i], cloud[i + 1], cloud[i + 2]);
  if (extra) for (let i = 0; i < extra.length; i += 3) add(extra[i], extra[i + 1], extra[i + 2]);
  return out;
}
// the palm against the grip: how far to slide the hand along its palm normal (positive: toward the palm side)
function lghPalm(H, ps) {
  let minY = 1e9;
  for (let i = 0; i < H.length; i += 3) { const x = H[i], y = H[i + 1] * ps, z = H[i + 2]; if (x > -0.033 && x < 0.036 && z < -0.012 && z > -0.092 && y > -0.03) { if (y < minY) minY = y; } }
  if (minY > 0.09) return 0;   // nothing under the palm
  return minY - 0.0175;
}
// a finger chain's segments: knuckle, then three joints (curls c, fan f), lengths; calls back each segment's ends
function lghChain(base, rx0, ry0, rz0, curls, lens, s, cb) {
  let M = lgMul(lgM4(), base, lgRot(lgM4(), rx0, ry0, rz0));
  for (let j = 0; j < 3; j++) {
    if (j) M = lgMul(lgM4(), M, lgMul(lgM4(), lgTR(0, 0, -lens[j - 1]), lgRot(lgM4(), curls[j] * s, 0, 0)));
    const A = [M[12], M[13], M[14]], B = lgPt(M, 0, 0, -lens[j]);
    if (cb(j, A, B) === false) return false;
  }
  return true;
}
function lghSegHit(H, A, B, r) {
  const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], L2 = ux * ux + uy * uy + uz * uz || 1e-9, rr = r * r;
  for (let i = 0; i < H.length; i += 3) {
    const px = H[i] - A[0], py = H[i + 1] - A[1], pz = H[i + 2] - A[2]; let t = (px * ux + py * uy + pz * uz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = px - ux * t, dy = py - uy * t, dz = pz - uz * t; if (dx * dx + dy * dy + dz * dz < rr) return true;
  }
  return false;
}
// close a three-joint chain on the cloud, joint by joint (lo/hi: the range each joint may turn; dflt: if it never touches)
function lghClose(H, mkBase, lens, r, s, lo, hi, dflt) {
  const c = lo.slice();
  for (let j = 0; j < 3; j++) {
    let touched = false;
    for (let a = lo[j]; a <= hi[j] + 1e-6; a += 0.04) {
      c[j] = a;
      const hit = !lghChain(mkBase(c[0]), 0, 0, 0, c, lens, s, (k, A, B) => k < j ? true : !lghSegHit(H, A, B, k === 2 ? r * 0.92 : r));
      if (hit) { c[j] = Math.max(lo[j], a - 0.04); touched = true; break; }
    }
    if (!touched) c[j] = dflt[j];
  }
  return c;
}
// fit one hand: the palm, then the fingers and the thumb; returns { dS (the socket moved along the palm), g (a grip) }
function lghFit(prop, key, side, which, gripName, S, extra) {
  const ps = side === 'R' ? 1 : -1, d = -ps, s = ps, base = LG_GRIPS[gripName] || LG_GRIPS.relax;
  let H = lghLocal(lghCloud(prop, key), S, extra);
  const dy = lghPalm(H, ps);
  if (Math.abs(dy) > 0.0005 && Math.abs(dy) < 0.05) { for (let i = 1; i < H.length; i += 3) H[i] -= dy * ps; }
  const g = { f: base.f.map(a => a.slice()), t: base.t.slice(), sp: base.sp || 0 };
  // only the points a finger could reach (a sphere round its knuckle)
  const near = (c, R) => { const o = [], R2 = R * R; for (let i = 0; i < H.length; i += 3) { const dx = H[i] - c[0], dy2 = H[i + 1] - c[1], dz = H[i + 2] - c[2]; if (dx * dx + dy2 * dy2 + dz * dz < R2) o.push(H[i], H[i + 1], H[i + 2]); } return o; };
  const H0 = H;
  for (let k = 0; k < 4; k++) {
    const [f, x, z, l2, l3] = LG_FINGERS[k], lens = [l2, l3, l3 * 0.8], r = LGH_R[f], fan = LGH_FAN[k] * g.sp;
    const kn = lgTR(x, d * (f === 'pnk' ? 0 : 0.0025), -z); H = near([x, 0, -z], l2 + l3 * 1.8 + 0.014);
    const mk = c0 => lgMul(lgM4(), kn, lgRot(lgM4(), c0 * s, fan, 0));
    let hi = [1.62, 1.82, 1.25], lo = [0, 0.05, 0.05];
    if (f === 'idx' && gripName === 'pistol') { hi = [0.32, 0.25, 0.12]; }
    g.f[k] = lghClose(H, mk, lens, r, s, lo, hi, base.f[k]);
  }
  // the thumb: swung out by the grip's own amount, then it closes across toward the palm, joint by joint
  {
    H = H0; H = near([0.025, 0, -0.024], 0.11);
    const T = base.t, kn = lgTR(0.025, -d * 0.007, -0.024);
    const mk = c0 => lgMul(lgM4(), kn, lgRot(lgM4(), c0 * s, T[0], T[2] * s));
    const c = lghClose(H, mk, [0.04, 0.031, 0.025], 0.0102, s, [Math.max(0, T[1] - 0.45), 0, 0], [T[1] + 0.55, 0.9, 0.8], [T[1], T[3], T[4]]);
    g.t = [T[0], c[0], T[2], c[1], c[2]];
  }
  return { dy: Math.abs(dy) < 0.05 ? dy : 0, g: g };
}
// the support hand closes over the firing hand: the firing hand's finger segments as points in the prop's space
function lghHandPts(S, g, side) {
  const ps = side === 'R' ? 1 : -1, d = -ps, s = ps, out = [];
  for (let k = 0; k < 4; k++) {
    const [f, x, z, l2, l3] = LG_FINGERS[k], lens = [l2, l3, l3 * 0.8], r = LGH_R[f];
    const base = lgMul(lgM4(), S, lgTR(x, d * (f === 'pnk' ? 0 : 0.0025), -z));
    lghChain(base, g.f[k][0] * s, LGH_FAN[k] * g.sp, 0, g.f[k], lens, s, (j, A, B) => { for (let t = 0; t <= 1.001; t += 0.25) for (const [oy, oz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) { const p = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]; out.push(p[0], p[1] + oy, p[2] + oz); } });
  }
  // and the back of the firing hand (its palm is on the grip; its back faces out)
  for (let x = -0.03; x <= 0.031; x += 0.015) for (let z = -0.02; z >= -0.09; z -= 0.014) { const p = lgPt(S, x, d * 0.018, z); out.push(p[0], p[1], p[2]); }
  return out;
}
// the fitted socket and grip for a hand on a prop (cached); null when it cannot be fitted
function lghGet(prop, key, side, which, gripName, S0) {
  if (!LGH.on || !S0) return null;
  if (!LGH.loaded) lghLoad();
  const k = prop + '|' + (key || '') + '|' + side + '|' + which + '|' + gripName; let r = LGH.fit.get(k); if (r !== undefined) return r;
  const t0 = performance.now(); r = null;
  try {
    let extra = null;
    if (prop === 'pistol' && side === 'L') {
      // the firing hand first, where it holds this gun
      const R = lghGet('pistol', key, 'R', 'gripR', 'pistol', lghBaseSock('pistol', key, 'gripR'));
      if (R) extra = lghHandPts(R.S, R.g, 'R');
    }
    const f = lghFit(prop, key, side, which, gripName, S0, extra), S = S0.slice();
    if (f.dy) { const ps = side === 'R' ? 1 : -1; S[12] += S[4] * f.dy * ps; S[13] += S[5] * f.dy * ps; S[14] += S[6] * f.dy * ps; }
    r = { S: S, g: f.g, dy: f.dy };
    LGH.fits++;
  } catch (e) { LGH.fails++; lgHurt(e); r = null; }
  LGH.ms += performance.now() - t0;
  LGH.fit.set(k, r); lghSaveSoon(); return r;
}
/* 1.9.994: the fits are kept on the device (each costs 30 to 90 ms), under a key made from everything they depend on:
   the guns' and the knife's builders, the glove, the fitter and the hand-made sockets. Change any of them and the key
   changes, and the fits are made again. They are warmed in the background for the guns you carry. */
function lghVer() {
  if (LGH.ver) return LGH.ver;
  let s = JSON.stringify(LG_FINGERS) + lghFit + lghClose + lghPalm + lghCloud + (typeof lgOpHand === 'function' ? lgOpHand : '') + lgPistolFrame + lgARGrip + lgCurvedMag + lgOpKnife + JSON.stringify(LG_GRIPS);
  for (const k in LG_GUN_DEF) { const D = LG_GUN_DEF[k]; s += k + D.mk + JSON.stringify(Object.assign({}, D, { mk: 0 })); }
  for (const k of ['gripR', 'gripL', 'cgripR', 'cgripL', 'kgrip', 'kgripF']) if (LG_SOCK[k]) s += Array.from(LG_SOCK[k]).map(v => v.toFixed(5)).join(',');
  if (typeof LGA !== 'undefined' && LGA.grip) s += JSON.stringify(LGA.grip) + lgaSockAdj;
  let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return LGH.ver = (h >>> 0).toString(36) + '.' + s.length.toString(36);
}
function lghLoad() {
  LGH.loaded = true; if (typeof store === 'undefined' || !LG_SOCK.cgripR) return;
  try {
    const d = store.get('zc_lghFit', null); if (!d || d.v !== lghVer() || !d.f) return;
    let n = 0; for (const k in d.f) { const r = d.f[k]; if (LGH.fit.has(k)) continue; LGH.fit.set(k, r ? { S: new Float32Array(r.S), g: r.g, dy: r.dy } : null); n++; }
    LGH.restored = n;
  } catch (e) { }
}
function lghSaveSoon() { if (LGH.saveT || typeof store === 'undefined') return; LGH.saveT = setTimeout(lghSave, 1500); }
function lghSave() {
  LGH.saveT = 0;
  try { const f = {}; let n = 0; for (const [k, r] of LGH.fit) { if (n++ > 160) break; f[k] = r ? { S: Array.from(r.S, v => +v.toFixed(5)), g: r.g, dy: +(+r.dy).toFixed(5) } : null; } store.set('zc_lghFit', { v: lghVer(), f: f }); } catch (e) { }
}
// the carried guns' grips (and the knife's), made a few at a time while nothing else needs the time
function lghWarm(gp, gs) {
  const jobs = [];
  if (gp && LG_GUN_DEF[gp]) jobs.push(['carbine', gp, 'R', 'gripR', 'pistol'], ['carbine', gp, 'R', 'gripR', 'trigger'], ['carbine', gp, 'L', 'gripL', 'cup']);
  if (gs && LG_GUN_DEF[gs]) jobs.push(['pistol', gs, 'R', 'gripR', 'pistol'], ['pistol', gs, 'R', 'gripR', 'trigger'], ['pistol', gs, 'L', 'gripL', 'support']);
  jobs.push(['knife', null, 'R', LG_SOCK.kgripF ? 'kgripF' : 'kgrip', 'knife'], ['knife', null, 'L', 'kgrip', 'knife']);
  const step = () => {
    let done = 0;
    while (jobs.length && done < 1) { const [p, k, sd, w, gn] = jobs.shift(), key = p + '|' + (k || '') + '|' + sd + '|' + w + '|' + gn; if (LGH.fit.has(key)) continue; lghGet(p, k, sd, w, gn, lghBaseSock(p, k, w)); done++; }
    if (jobs.length) setTimeout(step, 50);
  };
  if (!LGH.loaded) lghLoad(); setTimeout(step, 30);
}
// the hand-made socket a fit starts from
function lghBaseSock(prop, key, which) {
  if (prop !== 'knife') return lgSockBase(prop, which, key);
  if (prop === 'carbine') return which === 'gripR' ? LG_SOCK.cgripR : LG_SOCK.cgripL;
  if (prop === 'knife') return which === 'kgripF' ? LG_SOCK.kgripF : LG_SOCK.kgrip;
  return which === 'gripR' ? LG_SOCK.gripR : LG_SOCK.gripL;
}
// the grip name each hand closes with on each prop (the trigger finger moves between two)
function lghGripName(prop, side, cur) {
  if (prop === 'knife') return 'knife';
  if (side === 'R') return cur === 'trigger' ? 'trigger' : 'pistol';
  return prop === 'pistol' ? 'support' : 'cup';
}
function lghReset() { LGH.fit.clear(); LGH.sock.clear(); LGH.ver = null; }
