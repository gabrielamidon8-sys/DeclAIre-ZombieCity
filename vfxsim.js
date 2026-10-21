/* ================= VFXRAY v5: effects that follow physics (1.9.995) =================
   Practical and digital effects artists build their effects from how the real thing behaves. VFXRAY's effects are now
   small simulations, each from the physics or the measurements, and each can be cued by CHOREO's fights (a hit, a shot,
   a fall) or by the director:
   - Rain: drops fall at their terminal speed, which depends on their size (Atlas, Srivastava and Sekhon 1973:
     v = 9.65 - 10.3 exp(-0.6 D), D in mm), reached through quadratic air drag.
   - Sparks: hot metal flung at tens of metres a second, slowed by drag, bouncing (they keep a part of their speed), and
     cooling as they fly, their colour the colour of a black body at their temperature (Planck, through MIMATIC).
   - Smoke: puffs carried by curl noise (the curl of a noise field has no divergence, so it swirls like a fluid without
     sources or sinks), rising by buoyancy, spreading as they mix (the radius grows about as the square root of time).
   - Debris: chunks thrown off an impact, spinning, bouncing and settling.
   - Dust: a ring of dust thrown out along the ground where a foot or a body lands.
   - Muzzle flash: its phases (the primary flash at the muzzle, the dark gap, and the larger secondary flash as the gases
     burn in air), the brass ejected to the side.
   Every effect is deterministic for a seed, so the same take gives the same frames. */
const VXS = { made: 0 };
const VXS_G = 9.81;
/* ---------- rain ---------- */
function vxsRainV(Dmm) { return 9.65 - 10.3 * Math.exp(-0.6 * Dmm); }
// a drop falling from rest under gravity and quadratic drag set so its terminal speed is the measured one
function vxsRainFall(Dmm, secs, dt) { const vt = vxsRainV(Dmm), k = VXS_G / (vt * vt); let v = 0, t = 0; const out = []; dt = dt || 1 / 240; while (t < (secs || 3)) { v += (VXS_G - k * v * v) * dt; t += dt; out.push(v); } return { vt: vt, v: out, dt: dt }; }
/* ---------- a particle system (positions, velocities, a step) ---------- */
function vxsSys(o) { return Object.assign({ ps: [], t: 0, g: VXS_G, ground: 0, rng: curRng(o && o.seed || 1) }, o); }
function vxsStep(S, dt) {
  for (const p of S.ps) {
    if (p.dead) continue; p.age += dt; if (p.age >= p.life) { p.dead = true; continue; }
    const sp = Math.hypot(p.v[0], p.v[1], p.v[2]), dg = p.drag || 0;
    // drag (quadratic), gravity, buoyancy, and a flow field (curl noise) for smoke
    let a = [-dg * sp * p.v[0], -dg * sp * p.v[1], -dg * sp * p.v[2] - (p.grav == null ? S.g : p.grav) + (p.buoy || 0)];
    if (p.curl) { const c = vxsCurl(p.p[0] * p.curl.f, p.p[1] * p.curl.f, p.p[2] * p.curl.f + S.t * 0.3); a = curV3.add(a, curV3.mul(curV3.sub(curV3.mul(c, p.curl.s), p.v), p.curl.k)); }
    p.v = curV3.add(p.v, curV3.mul(a, dt)); p.p = curV3.add(p.p, curV3.mul(p.v, dt));
    if (p.spin) p.rot += p.spin * dt;
    if (p.p[2] < S.ground + (p.r || 0) && p.v[2] < 0) { if (p.bounce) { p.p[2] = S.ground + (p.r || 0); p.v[2] = -p.v[2] * p.bounce; p.v[0] *= p.fric == null ? 0.6 : p.fric; p.v[1] *= p.fric == null ? 0.6 : p.fric; p.bounces = (p.bounces || 0) + 1; if (p.spin) p.spin *= 0.6; } else if (p.stick) { p.p[2] = S.ground; p.v = [0, 0, 0]; } }
    if (p.cool) p.T = p.T0 * Math.exp(-p.age / p.cool);
    if (p.grow) p.r = p.r0 + p.grow * Math.sqrt(p.age);
  }
  S.t += dt;
}
/* ---------- curl noise ---------- */
// a smooth vector potential from value noise; its curl (taken by central differences) is the flow
function vxsN3(x, y, z, s) { const h = (i, j, k) => { let n = (i * 374761393 + j * 668265263 + k * 1274126177 + s * 911) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }; const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz), L = (a, b, t) => a + (b - a) * t;
  return L(L(L(h(xi, yi, zi), h(xi + 1, yi, zi), u), L(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v), L(L(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), L(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w) * 2 - 1; }
function vxsPsi(x, y, z) { return [vxsN3(x, y, z, 1), vxsN3(x + 31.4, y + 7.1, z, 2), vxsN3(x, y + 19.3, z + 3.7, 3)]; }
function vxsCurl(x, y, z) { const e = 0.01, d = (f, i) => { const a = [x, y, z], b = [x, y, z]; a[i] += e; b[i] -= e; return [(f(...a)[0] - f(...b)[0]) / (2 * e), (f(...a)[1] - f(...b)[1]) / (2 * e), (f(...a)[2] - f(...b)[2]) / (2 * e)]; }; const dx = d(vxsPsi, 0), dy = d(vxsPsi, 1), dz = d(vxsPsi, 2); return [dy[2] - dz[1], dz[0] - dx[2], dx[1] - dy[0]]; }
// the divergence of the curl field at a point (should be zero: a check on the field)
function vxsDiv(x, y, z) { const e = 0.005, c = (a, b, cc) => vxsCurl(a, b, cc); return ((c(x + e, y, z)[0] - c(x - e, y, z)[0]) + (c(x, y + e, z)[1] - c(x, y - e, z)[1]) + (c(x, y, z + e)[2] - c(x, y, z - e)[2])) / (2 * e); }
/* ---------- the effects ---------- */
// sparks off steel: n sparks from p, around a direction, 20 to 40 m/s, about 1900 K cooling over a few tenths of a second
function vxsSparks(S, p, dir, n, o) {
  o = o || {}; const r = S.rng, d = curV3.norm(dir);
  for (let i = 0; i < (n || 40); i++) { const sp = (o.v0 || 20) + r() * (o.v1 || 20), j = curV3.norm([d[0] + (r() - 0.5) * 1.2, d[1] + (r() - 0.5) * 1.2, d[2] + (r() - 0.5) * 1.2 + 0.3]); S.ps.push({ kind: 'spark', p: p.slice(), v: curV3.mul(j, sp), age: 0, life: 0.5 + r() * 0.5, drag: o.drag == null ? 0.18 : o.drag, bounce: 0.35, fric: 0.5, T0: o.T0 || 1900 + r() * 300, T: 1900, cool: 0.35 + r() * 0.2, r: 0.0015 }); }
  VXS.made++;
}
// a smoke puff: buoyant, carried by curl noise, spreading
function vxsSmoke(S, p, n, o) { o = o || {}; const r = S.rng; for (let i = 0; i < (n || 16); i++) S.ps.push({ kind: 'smoke', p: [p[0] + (r() - 0.5) * 0.1, p[1] + (r() - 0.5) * 0.1, p[2] + (r() - 0.5) * 0.1], v: [(r() - 0.5) * 0.6 + (o.v ? o.v[0] : 0), (r() - 0.5) * 0.6 + (o.v ? o.v[1] : 0), r() * 0.4 + (o.v ? o.v[2] : 0)], age: 0, life: 2.5 + r() * 1.5, drag: 1.2, grav: 0, buoy: o.buoy || 0.35, curl: { f: 1.6, s: 0.5, k: 1.5 }, r0: 0.05, r: 0.05, grow: o.grow || 0.22, col: o.col || [0.35, 0.36, 0.38] }); VXS.made++; }
// debris from an impact: chunks thrown off the surface's normal, spinning and bouncing
function vxsDebris(S, p, nrm, n, o) { o = o || {}; const r = S.rng, d = curV3.norm(nrm); for (let i = 0; i < (n || 12); i++) { const j = curV3.norm([d[0] + (r() - 0.5) * 1.4, d[1] + (r() - 0.5) * 1.4, d[2] + (r() - 0.5) * 1.4 + 0.5]); S.ps.push({ kind: 'debris', p: p.slice(), v: curV3.mul(j, 2 + r() * 4), age: 0, life: 3, drag: 0.02, bounce: 0.3, fric: 0.5, spin: (r() - 0.5) * 30, rot: 0, r: 0.004 + r() * 0.01, col: o.col || [0.45, 0.42, 0.38] }); } VXS.made++; }
// dust where something lands: a ring thrown out along the ground, slowing in the air, settling
function vxsDust(S, p, n, o) { o = o || {}; const r = S.rng; for (let i = 0; i < (n || 24); i++) { const a = i / (n || 24) * TAU + r() * 0.3, sp = (o.v || 1.6) * (0.6 + r() * 0.6); S.ps.push({ kind: 'dust', p: [p[0], p[1], (S.ground || 0) + 0.02], v: [Math.cos(a) * sp, Math.sin(a) * sp, 0.3 + r() * 0.4], age: 0, life: 1.5 + r(), drag: 2.5, grav: 0.4, r0: 0.04, r: 0.04, grow: 0.25, col: o.col || [0.5, 0.46, 0.4] }); } VXS.made++; }
// a muzzle flash's phases (seconds after the shot): the primary flash in the bore's mouth, a dark gap, the secondary flash
const VXS_FLASH = [{ name: 'primary flash', t0: 0, t1: 0.0003, size: 0.06, k: 1 }, { name: 'dark gap (intermediate flash)', t0: 0.0003, t1: 0.0006, size: 0.04, k: 0.25 }, { name: 'secondary flash', t0: 0.0006, t1: 0.0025, size: 0.22, k: 1.6 }];
function vxsFlashAt(t) { for (const f of VXS_FLASH) if (t >= f.t0 && t < f.t1) return f; return null; }
// at 24 frames a second the whole flash lives inside one frame's exposure: that frame shows the brightest phase, the size
// of the secondary flash; the next frame shows the smoke
function vxsFlashFrame(fps, shutter) { const exp = (shutter || 180) / 360 / (fps || 24); let e = 0, size = 0; for (const f of VXS_FLASH) { const dt = Math.max(0, Math.min(f.t1, exp) - f.t0); e += dt * f.k; if (dt > 0) size = Math.max(size, f.size); } return { exposure: exp, energy: e, size: size, frames: 1 }; }
/* ---------- the cue sheet: what each moment of a fight or a scene calls for ---------- */
const VXS_CUES = {
  hit: [['dust', 'from the clothes, a few'], ['sweat', 'a spray off the head on a head hit']],
  block: [['dust', 'a puff off the forearm']],
  shot: [['flash', 'muzzle flash (one frame)'], ['brass', 'ejected to the right'], ['smoke', 'a curl from the muzzle']],
  impactMetal: [['sparks', 'off the steel'], ['debris', 'flakes of paint']], impactConcrete: [['debris', 'chips and grit'], ['dust', 'a puff of concrete dust']], impactFlesh: [['mist', 'a dark mist']],
  fall: [['dust', 'a ring along the ground'], ['splash', 'if the ground is wet']], land: [['dust', 'a ring along the ground']], step: [['dust', 'a small puff on a hard landing']]
};
// run one cue at a place (into a particle system); returns what it made
function vxsCue(S, kind, p, o) {
  o = o || {}; const made = [];
  for (const [fx] of VXS_CUES[kind] || []) {
    if (fx === 'sparks') { vxsSparks(S, p, o.n || [0, 0, 1], 30); made.push(fx); }
    else if (fx === 'debris') { vxsDebris(S, p, o.n || [0, 0, 1], 10); made.push(fx); }
    else if (fx === 'dust') { vxsDust(S, p, kind === 'step' ? 8 : kind === 'hit' || kind === 'block' ? 6 : 24, { v: kind === 'fall' || kind === 'land' ? 1.8 : 0.6 }); made.push(fx); }
    else if (fx === 'smoke') { vxsSmoke(S, p, 8, { v: o.dir ? curV3.mul(o.dir, 1.2) : [0, 0, 0.3] }); made.push(fx); }
    else made.push(fx);   // (the flash, brass, mist, sweat and splash are drawn by VFXRAY's sprites)
  }
  return made;
}
