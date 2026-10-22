/* ================= PHYSICS: what falls, bounces, rolls and settles =================
   1.9.993. The game's own small physics engine, in two worlds that share one set of rules.
   In a run (top-down, with height): spent cases leave each gun at its own angle and speed, spinning end over end;
   they fall under real gravity (9.81 m/s² at the game's 32 units a metre), bounce off the street with the
   restitution of their metal (brass rings, lacquered steel clicks, a shotgun hull thuds), lose speed to friction,
   then roll: a straight pistol case rolls straight, a bottlenecked rifle case rolls in a curve, as real ones do. They
   glance off walls and sink in water. Magazines dropped in a reload fall heavier and flatter, slide and stop.
   Cases lie 5 seconds and magazines 30, then fade.
   In a cinematic (full 3D): bodies with a shape (sphere, cylinder or box), position, velocity, orientation and spin,
   gravity, ground contact with friction and rolling, and static boxes for the set (walls, a dumpster, a chair). The
   kicked can in the idle scene, the brass in the alley, debris, the trash the wind moves.
   And springs: critically damped and under-damped springs that other engines use for weight (LEGEND's upper body
   lagging when the body turns or stops, gear swinging, a hanging lamp and its cable). */
const PHY = { ver: 1, b: [], adapt: 0, lvl: 2, made: 0, settled: 0, drops: 0, ms: 0, msAvg: 0, steps: 0, errT: [], offUntil: 0, snd: 0, sndT: 0, w3: 0, maxV: 0 };
// what each thing is: length and radius (m), drawn larger than life (k) so it reads at the camera's distance;
// restitution (e), sliding friction (mu), rolling resistance (rr), how much it curves when rolling (curve, rad/m),
// colour, lifetime (s), its sound when it lands
const PHY_KIND = {
  case556: { L: 0.045, R: 0.0048, k: 2.3, e: 0.42, mu: 0.42, rr: 0.16, curve: 1.6, col: '#c79a3c', hi: '#f2d27e', life: 5, snd: 'brass', m: 0.006 },
  case545: { L: 0.04, R: 0.0045, k: 2.3, e: 0.36, mu: 0.48, rr: 0.19, curve: 1.8, col: '#6d6a3a', hi: '#a3a066', life: 5, snd: 'steel', m: 0.0055 },
  case762: { L: 0.051, R: 0.006, k: 2.2, e: 0.4, mu: 0.42, rr: 0.16, curve: 1.3, col: '#c99b3e', hi: '#f4d585', life: 5, snd: 'brass', m: 0.012 },
  case9: { L: 0.019, R: 0.005, k: 2.8, e: 0.45, mu: 0.4, rr: 0.14, curve: 0.25, col: '#cfa64a', hi: '#f6dc90', life: 5, snd: 'brass', m: 0.004 },
  case45: { L: 0.023, R: 0.006, k: 2.6, e: 0.44, mu: 0.4, rr: 0.14, curve: 0.2, col: '#caa045', hi: '#f2d488', life: 5, snd: 'brass', m: 0.006 },
  shell12: { L: 0.067, R: 0.0105, k: 1.9, e: 0.26, mu: 0.55, rr: 0.24, curve: 0.15, col: '#a8261f', hi: '#d24a3a', base: '#c99b3e', life: 5, snd: 'shell', m: 0.007 },
  // 1.9.997: the .50 AE's fat case, the 5.7's little bottleneck, a belt link
  case50: { L: 0.033, R: 0.0068, k: 2.3, e: 0.42, mu: 0.42, rr: 0.15, curve: 0.3, col: '#c99b3e', hi: '#f2d27e', life: 5, snd: 'brass', m: 0.012 },
  case57: { L: 0.029, R: 0.004, k: 2.9, e: 0.46, mu: 0.4, rr: 0.14, curve: 0.5, col: '#caa045', hi: '#f6dc90', life: 5, snd: 'brass', m: 0.0035 },
  link: { L: 0.02, R: 0.004, k: 2.2, e: 0.3, mu: 0.5, rr: 0.2, curve: 1.2, col: '#5c5e60', hi: '#9a9ea3', life: 5, snd: 'steel', m: 0.003 },
  moon: { L: 0.03, R: 0.012, k: 2.2, e: 0.3, mu: 0.6, rr: 0.4, curve: 0, col: '#b48a3a', hi: '#e8c876', life: 30, snd: 'brass', m: 0.03 },
  mag: { L: 0.2, R: 0.016, k: 1.35, e: 0.18, mu: 0.75, rr: 0.9, curve: 0, col: '#26292c', hi: '#484d52', life: 30, snd: 'mag', m: 0.15 }
};
// each gun's magazine as it lies in the street: length, width, curve, colours
const PHY_MAG = {
  m4a1: { L: 0.19, W: 0.03, bend: 0.12, col: '#3a3b33', hi: '#6c6a58', plate: '#2a2b25' },
  ak74m: { L: 0.22, W: 0.032, bend: 0.32, col: '#5a2a1c', hi: '#8a4a32', plate: '#2c1a14' },
  mk17: { L: 0.15, W: 0.034, bend: 0.06, col: '#22252a', hi: '#4a4f56', plate: '#17191c' },
  pp19: { L: 0.34, W: 0.05, bend: 0, col: '#1d1f22', hi: '#3c4046', plate: '#121314', round: 1 },
  m17: { L: 0.12, W: 0.024, bend: 0, col: '#1f2124', hi: '#45494f', plate: '#2d3034' },
  m9: { L: 0.115, W: 0.024, bend: 0, col: '#26282b', hi: '#4b4f55', plate: '#1a1b1d' },
  m1911: { L: 0.11, W: 0.02, bend: 0, col: '#2e3033', hi: '#5a5e63', plate: '#1d1e20' },
  aps: { L: 0.13, W: 0.026, bend: 0, col: '#2a2c2f', hi: '#50555b', plate: '#1b1c1e' }
};
function physUp() { return !(PHY.offUntil && performance.now() < PHY.offUntil); }
function physLevel() { return PHY.lvl = clamp(([1, 1, 2, 3][clamp(PERF.tier | 0, 0, 3)]) + PHY.adapt + (TUNE.PHYSICS || 0), 0, 3); }
const PHY_CAP = [{ cases: 40, mags: 10, sub: 1 }, { cases: 90, mags: 16, sub: 1 }, { cases: 160, mags: 24, sub: 2 }, { cases: 260, mags: 32, sub: 2 }];
const physU = () => 32 * SCL / SCALE_REAL;   // world units in a metre
// a new body in the street: kind, where (z is the height above the ground in units), how it moves, which gun it came from
function physSpawn(kind, x, y, z, vx, vy, vz, o) {
  if (!physUp()) return null;
  const K = PHY_KIND[kind]; if (!K) return null;
  const q = PHY_CAP[physLevel()], isMag = kind === 'mag' || kind === 'moon';
  // over the cap the oldest of the same family goes first
  let n = 0; for (const b of PHY.b) if ((b.k === 'mag' || b.k === 'moon') === isMag) n++;
  if (n >= (isMag ? q.mags : q.cases)) { const i = PHY.b.findIndex(b => (b.k === 'mag' || b.k === 'moon') === isMag); if (i >= 0) PHY.b.splice(i, 1); }
  o = o || {};
  const b = { k: kind, K: K, x: x, y: y, z: z || 0, vx: vx || 0, vy: vy || 0, vz: vz || 0, a: o.a || 0, va: o.va || 0, tip: o.tip || 0, vt: o.vt || 0, t: 0, life: o.life || K.life, rest: false, hits: 0, gun: o.gun || '', side: Math.random() < 0.5 ? -1 : 1, sunk: 0 };
  PHY.b.push(b); PHY.made++;
  return b;
}
// a spent case leaves the ejection port: the gun's angle (out to the right of the bore, a little back), its speed and
// lift, spin end over end; gun: the weapon (its arms entry holds the ejection), x, y: the port, a: where the bore points
function physEject(w, x, y, a, h) {
  const A = w && (w.arms || (w.F && w.F.arms)); let E = A ? A.eject : null;
  if (!A) { const k = w && w.F && w.F.key; if (k === 'revolver' || k === 'launcher' || k === 'flamer') return null; E = { a: 1.7, s: 3.6, up: 2.1, kind: k === 'shotgun' ? 'shell12' : k === 'pistol' ? 'case9' : 'case556' }; }
  if (!E) return null;
  const u = physU(), ea = a + E.a * (0.92 + Math.random() * 0.16) + (Math.random() - 0.5) * 0.25, sp = E.s * (0.8 + Math.random() * 0.4) * u;
  if (E.link && PHY_KIND.link) { const la = a + 1.4 + (Math.random() - 0.5) * 0.3, ls = 2.2 * u; physSpawn('link', x, y, (h == null ? 1.15 : h) * u, Math.cos(la) * ls, Math.sin(la) * ls, 1.2 * u, { a: Math.random() * TAU, va: (Math.random() - 0.5) * 40, tip: Math.random() * TAU, vt: 30 }); }   // (1.9.997: the belt's link goes out to the right with the case)
  return physSpawn(E.kind, x, y, (h == null ? 1.15 : h) * u, Math.cos(ea) * sp, Math.sin(ea) * sp, E.up * (0.75 + Math.random() * 0.5) * u,
    { a: a + Math.PI / 2 + (Math.random() - 0.5), va: (Math.random() - 0.5) * 30, tip: Math.random() * TAU, vt: 25 + Math.random() * 35 });
}
// a magazine let go in a reload: it leaves the well with a little of the hand's push and the gun's angle, and drops
function physMagDrop(w, x, y, a, vx, vy) {
  const A = w && (w.arms || (w.F && w.F.arms)); if (!A) return null;
  const u = physU();
  if (A.reload.kind === 'moon') {
    // two half-moon clips with their three empties each, thrown off the ejector star
    for (let i = 0; i < 2; i++) physSpawn('moon', x + (Math.random() - 0.5) * 0.04 * u, y + (Math.random() - 0.5) * 0.04 * u, 0.9 * u, (vx || 0) + (Math.random() - 0.5) * 0.8 * u, (vy || 0) + (Math.random() - 0.5) * 0.8 * u, -0.5 * u,
      { a: Math.random() * TAU, va: (Math.random() - 0.5) * 12, tip: Math.random() * TAU, vt: (Math.random() - 0.5) * 18, gun: A.key });
    return true;
  }
  if (!PHY_MAG[A.key]) return null;   // (the shotgun has a tube, not a magazine)
  PHY.drops++;
  return physSpawn('mag', x, y, 1.0 * u, (vx || 0) + Math.cos(a) * 0.4 * u + (Math.random() - 0.5) * 0.5 * u, (vy || 0) + Math.sin(a) * 0.4 * u + (Math.random() - 0.5) * 0.5 * u, -0.3 * u,
    { a: a + (Math.random() - 0.5) * 0.6, va: (Math.random() - 0.5) * 6, tip: 0, vt: (Math.random() - 0.5) * 8, gun: A.key });
}
// one step of the street world
function physStep(dt) {
  if (!physUp() || !PHY.b.length) return;
  const t0 = performance.now();
  try {
    const u = physU(), g = 9.81 * u, sub = PHY_CAP[physLevel()].sub, h = dt / sub;
    for (let s = 0; s < sub; s++) for (const b of PHY.b) physBody(b, h, u, g);
    let n = 0; for (const b of PHY.b) { b.t += dt; if (b.t < b.life && !(b.sunk > 0.6)) PHY.b[n++] = b; }
    PHY.b.length = n; if (n > PHY.maxV) PHY.maxV = n;
  } catch (e) { physHurt(e); }
  const ms = performance.now() - t0; PHY.ms = ms; PHY.msAvg = PHY.msAvg * 0.95 + ms * 0.05; coreCost('PHYSICS', ms); PHY.steps++;
}
function physBody(b, dt, u, g) {
  if (b.rest) return;
  if (b.sunk > 0) { b.sunk += dt; b.vx *= 0.9; b.vy *= 0.9; return; }
  const K = b.K, x0 = b.x, y0 = b.y;
  b.vz -= g * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.a += b.va * dt; b.tip += b.vt * dt;
  // walls: back out along whichever axis went in, and the velocity on that axis bounces back, weaker
  if (pointInRect(b.x, b.y)) {
    if (!pointInRect(x0, b.y)) { b.x = x0; b.vx = -b.vx * K.e; } else if (!pointInRect(b.x, y0)) { b.y = y0; b.vy = -b.vy * K.e; } else { b.x = x0; b.y = y0; b.vx = -b.vx * K.e; b.vy = -b.vy * K.e; }
    b.va = -b.va * 0.6; physSound(b, 0.6);
  }
  if (b.z <= 0) {
    b.z = 0;
    if (typeof waterAt === 'function' && waterAt(b.x, b.y) >= 2) { b.sunk = 0.01; return; }   // into the water it goes
    if (b.vz < -0.35 * u) {
      // a bounce: the vertical speed comes back by the restitution, friction takes some of the slide, the spin is jolted
      const imp = -b.vz; b.vz = imp * K.e * (0.8 + Math.random() * 0.4);
      const f = Math.max(0, 1 - K.mu * 0.55); b.vx *= f; b.vy *= f; b.va = b.va * 0.5 + (Math.random() - 0.5) * 18; b.vt *= 0.45;
      b.hits++; if (b.hits <= 3) physSound(b, Math.min(1, imp / (2.2 * u)));
      if (b.vz < 0.25 * u) b.vz = 0;
    } else {
      b.vz = 0;
      const sp = Math.hypot(b.vx, b.vy);
      if (b.k === 'mag' || b.k === 'moon') {
        // flat things slide and stop: friction scrubs speed off
        const dec = K.mu * g * dt; if (sp <= dec) { b.vx = b.vy = 0; } else { b.vx -= b.vx / sp * dec; b.vy -= b.vy / sp * dec; }
        b.va *= Math.exp(-6 * dt); b.vt = 0; b.tip = 0;
      } else {
        // a case rolls across its own axis; a bottlenecked one curves as it goes; rolling resistance slows it
        const ax = Math.cos(b.a), ay = Math.sin(b.a), nx = -ay, ny = ax, along = b.vx * ax + b.vy * ay, across = b.vx * nx + b.vy * ny;
        const slide = Math.exp(-K.mu * 14 * dt), roll = Math.max(0, 1 - K.rr * g * dt / Math.max(1e-3, Math.abs(across) || 1));
        let vAcross = across * roll * (Math.abs(across) < 0.03 * u ? 0 : 1), vAlong = along * slide;
        b.vx = ax * vAlong + nx * vAcross; b.vy = ay * vAlong + ny * vAcross;
        b.va = vAcross / u * K.curve * b.side;   // the curve turns the case as it rolls
        b.vt = vAcross / Math.max(1e-4, K.R * u * K.k);
      }
      if (Math.hypot(b.vx, b.vy) < 0.02 * u && Math.abs(b.va) < 0.05) { b.rest = true; b.vx = b.vy = b.va = b.vt = 0; PHY.settled++; }
    }
  }
  if (!(b.x === b.x && b.y === b.y && b.z === b.z)) { b.x = x0; b.y = y0; b.z = 0; b.vx = b.vy = b.vz = 0; b.rest = true; }
}
// the sound of a landing: brass rings, steel clicks, a hull thuds, a magazine clatters (only near the camera, and not a
// hundred at once)
function physSound(b, k) {
  const now = performance.now(); if (now - PHY.sndT < 28 || k < 0.15 || !G.p) return;
  const d = Math.hypot(b.x - G.p.x, b.y - G.p.y); if (d > 420) return;
  PHY.sndT = now; PHY.snd++;
  try { if (typeof SFX !== 'undefined' && SFX.drop) SFX.drop(b.K.snd, clamp((b.x - cam.x) / (W / ZOOM / 2), -1, 1), k * (1 - d / 460)); } catch (e) { }
}
// drawing: on the ground with the other things in the street, so the light and the shadows fall on them
function physDraw(vis) {
  if (!PHY.b.length || !physUp()) return;
  const t0 = performance.now(), u = physU();
  try {
    for (const b of PHY.b) {
      if (!vis(b.x, b.y, 14)) continue;
      const K = b.K, fade = Math.min(1, (b.life - b.t) / 0.6) * (b.sunk > 0 ? Math.max(0, 1 - b.sunk / 0.6) : 1); if (fade <= 0.01) continue;
      const lift = b.z, sc = 1 + lift / (6 * u);   // higher things are a little bigger (closer to the camera) and cast a shadow
      if (lift > 0.02 * u) { ctx.globalAlpha = 0.28 * fade; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(b.x + lift * 0.25, b.y + lift * 0.18, K.L * u * K.k * 0.45, K.R * u * K.k * 1.4, b.a, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = fade; ctx.save(); ctx.translate(b.x, b.y - lift * 0.35); ctx.rotate(b.a); ctx.scale(sc, sc);
      if (b.k === 'mag') physDrawMag(b, u);
      else if (b.k === 'moon') physDrawMoon(b, u);
      else physDrawCase(b, u);
      ctx.restore();
    }
  } catch (e) { physHurt(e); }
  ctx.globalAlpha = 1;
  coreCost('PHYSICS', performance.now() - t0);
}
// a case seen from above as it tumbles: its length shortens as it turns end-on, the mouth and the head show
function physDrawCase(b, u) {
  const K = b.K, L = K.L * u * K.k, R = K.R * u * K.k, fl = b.rest ? 1 : 0.35 + 0.65 * Math.abs(Math.cos(b.tip)), l = Math.max(R * 1.2, L * fl);
  if (b.k === 'shell12') {
    ctx.fillStyle = K.col; ctx.fillRect(-l / 2, -R, l * 0.72, R * 2);
    ctx.fillStyle = K.base; ctx.fillRect(l * 0.22, -R * 1.08, l * 0.28, R * 2.16);
    ctx.fillStyle = K.hi; ctx.globalAlpha *= 0.6; ctx.fillRect(-l / 2, -R, l * 0.72, R * 0.6); return;
  }
  ctx.fillStyle = K.col; ctx.beginPath();
  // a bottlenecked rifle case: body, shoulder, neck
  if (K.curve > 1) { ctx.moveTo(-l / 2, -R); ctx.lineTo(l * 0.18, -R); ctx.lineTo(l * 0.3, -R * 0.6); ctx.lineTo(l / 2, -R * 0.55); ctx.lineTo(l / 2, R * 0.55); ctx.lineTo(l * 0.3, R * 0.6); ctx.lineTo(l * 0.18, R); ctx.lineTo(-l / 2, R); }
  else ctx.rect(-l / 2, -R, l, R * 2);
  ctx.fill();
  ctx.fillStyle = K.hi; ctx.fillRect(-l / 2, -R * 0.75, l * 0.7, R * 0.55);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-l / 2, -R, Math.max(0.4, l * 0.08), R * 2);   // the extractor groove at the head
}
function physDrawMag(b, u) {
  const M = PHY_MAG[b.gun] || PHY_MAG.m17, K = b.K, L = M.L * u * K.k, Wd = M.W * u * K.k, bend = M.bend;
  ctx.fillStyle = M.col; ctx.beginPath();
  if (M.round) { ctx.ellipse(0, 0, L / 2, Wd / 2, 0, 0, TAU); }
  else { ctx.moveTo(-L / 2, -Wd / 2); ctx.quadraticCurveTo(0, -Wd / 2 - bend * L * 0.5, L / 2, -Wd / 2 + bend * L * 0.25); ctx.lineTo(L / 2, Wd / 2 + bend * L * 0.25); ctx.quadraticCurveTo(0, Wd / 2 - bend * L * 0.5, -L / 2, Wd / 2); ctx.closePath(); }
  ctx.fill();
  ctx.fillStyle = M.hi; ctx.globalAlpha *= 0.55; ctx.fillRect(-L / 2 + L * 0.08, -Wd * 0.3, L * 0.7, Wd * 0.18); ctx.globalAlpha /= 0.55;
  ctx.fillStyle = M.plate; ctx.fillRect(L / 2 - L * 0.07, -Wd * 0.62, L * 0.07, Wd * 1.24);   // the base plate
  if (b.gun !== 'pp19') { ctx.fillStyle = '#c9a14a'; ctx.fillRect(-L / 2, -Wd * 0.22, L * 0.05, Wd * 0.44); }   // the top round, if any left
}
function physDrawMoon(b, u) {
  const K = b.K, R = K.R * u * K.k;
  ctx.strokeStyle = '#3a3a36'; ctx.lineWidth = R * 0.35; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI); ctx.stroke();
  for (let i = 0; i < 3; i++) { const a = (i + 0.5) / 3 * Math.PI; ctx.fillStyle = K.col; ctx.beginPath(); ctx.arc(Math.cos(a) * R, Math.sin(a) * R, R * 0.42, 0, TAU); ctx.fill(); ctx.fillStyle = K.hi; ctx.beginPath(); ctx.arc(Math.cos(a) * R - R * 0.12, Math.sin(a) * R - R * 0.12, R * 0.16, 0, TAU); ctx.fill(); }
}
function physReset() { PHY.b.length = 0; }
function physHurt(e) {
  const now = performance.now(); coreHurt('PHYSICS', e); try { console.error(e); } catch (x) { }
  PHY.errT.push(now); while (PHY.errT.length && now - PHY.errT[0] > 10000) PHY.errT.shift();
  if (PHY.errT.length >= 6) { PHY.offUntil = now + 60000; PHY.errT.length = 0; PHY.b.length = 0; coreRepaired('PHYSICS', 'Physics: paused for a minute after errors'); }
}

/* ---------- the 3D world, for cinematics ---------- */
// a world: bodies and static boxes; z is up, metres, seconds
function phy3New(o) { o = o || {}; return { bodies: [], boxes: o.boxes || [], g: o.g == null ? 9.81 : o.g, ground: o.ground == null ? 0 : o.ground, t: 0 }; }
// shape: { s: 'sphere'|'cyl'|'box', r, h (cylinder length / box size [x,y,z]) }, e: restitution, mu: friction
function phy3Add(Wd, o) {
  const b = Object.assign({ p: [0, 0, 0], v: [0, 0, 0], r3: [0, 0, 0], w: [0, 0, 0], s: 'sphere', r: 0.05, h: 0.1, e: 0.35, mu: 0.4, rr: 0.05, rest: false, hits: 0, onHit: null, age: 0, live: true }, o);
  b.p = b.p.slice(); b.v = b.v.slice(); b.r3 = b.r3.slice(); b.w = b.w.slice(); Wd.bodies.push(b); return b;
}
// the lowest point of a body (a lying cylinder touches with its side, a standing one with its end)
function phy3Low(b) {
  if (b.s === 'sphere') return b.r;
  if (b.s === 'cyl') { const cr = Math.abs(Math.cos(b.r3[0])) * Math.abs(Math.cos(b.r3[1])); return lgLerp(b.r, b.h / 2, cr); }
  const H = b.h; return (Math.abs(H[2] * Math.cos(b.r3[1]) * Math.cos(b.r3[0])) + Math.abs(H[0] * Math.sin(b.r3[1])) + Math.abs(H[1] * Math.sin(b.r3[0]))) / 2;
}
function phy3Step(Wd, dt) {
  const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
  for (let k = 0; k < n; k++) for (const b of Wd.bodies) {
    if (b.rest || !b.live) continue;
    b.age += h;
    b.v[2] -= Wd.g * h;
    for (let i = 0; i < 3; i++) { b.p[i] += b.v[i] * h; b.r3[i] += b.w[i] * h; }
    // static boxes: push out along the shallowest axis and bounce that axis
    const rad = b.s === 'sphere' ? b.r : b.s === 'cyl' ? Math.max(b.r, b.h / 2) * 0.8 : Math.max(b.h[0], b.h[1], b.h[2]) * 0.45;
    for (const X of Wd.boxes) {
      const q = [clamp(b.p[0], X.min[0], X.max[0]), clamp(b.p[1], X.min[1], X.max[1]), clamp(b.p[2], X.min[2], X.max[2])], d = [b.p[0] - q[0], b.p[1] - q[1], b.p[2] - q[2]], dl = Math.hypot(d[0], d[1], d[2]);
      if (dl >= rad) continue;
      let nx, ny, nz;
      if (dl > 1e-6) { nx = d[0] / dl; ny = d[1] / dl; nz = d[2] / dl; }
      else { const c = [(X.min[0] + X.max[0]) / 2, (X.min[1] + X.max[1]) / 2, (X.min[2] + X.max[2]) / 2], e2 = [b.p[0] - c[0], b.p[1] - c[1], b.p[2] - c[2]], ax = [Math.abs(e2[0]) / (X.max[0] - X.min[0]), Math.abs(e2[1]) / (X.max[1] - X.min[1]), Math.abs(e2[2]) / (X.max[2] - X.min[2])]; const m = ax.indexOf(Math.max(...ax)); nx = m === 0 ? Math.sign(e2[0]) : 0; ny = m === 1 ? Math.sign(e2[1]) : 0; nz = m === 2 ? Math.sign(e2[2]) : 0; }
      const pen = rad - dl; b.p[0] += nx * pen; b.p[1] += ny * pen; b.p[2] += nz * pen;
      const vn = b.v[0] * nx + b.v[1] * ny + b.v[2] * nz;
      if (vn < 0) { const j = -(1 + b.e) * vn; b.v[0] += nx * j; b.v[1] += ny * j; b.v[2] += nz * j; b.hits++; if (b.onHit && -vn > 0.4) b.onHit(b, -vn, X); for (let i = 0; i < 3; i++) b.w[i] *= 0.7; }
    }
    // the ground
    const low = phy3Low(b), gz = Wd.ground + low;
    if (b.p[2] < gz) {
      b.p[2] = gz;
      if (b.v[2] < -0.3) {
        const imp = -b.v[2]; b.v[2] = imp * b.e; b.hits++;
        const f = Math.max(0, 1 - b.mu * 0.5); b.v[0] *= f; b.v[1] *= f;
        b.w[0] = b.w[0] * 0.55 + (Math.random() - 0.5) * imp * 3; b.w[1] = b.w[1] * 0.55 + (Math.random() - 0.5) * imp * 3; b.w[2] *= 0.7;
        if (b.onHit && imp > 0.4) b.onHit(b, imp, null);
      } else {
        b.v[2] = 0;
        if (b.s === 'cyl' || b.s === 'sphere') {
          // rolling: it settles on its side and rolls along the ground, slowing with rolling resistance
          if (b.s === 'cyl') { b.r3[0] = lgLerp(b.r3[0], Math.round(b.r3[0] / (Math.PI / 2)) * (Math.PI / 2), Math.min(1, h * 10)); b.r3[1] = lgLerp(b.r3[1], 0, Math.min(1, h * 10)); }
          const sp = Math.hypot(b.v[0], b.v[1]), dec = b.rr * Wd.g * h;
          if (sp <= dec) { b.v[0] = b.v[1] = 0; } else { b.v[0] -= b.v[0] / sp * dec; b.v[1] -= b.v[1] / sp * dec; }
          b.w[1] = sp / Math.max(0.01, b.r) * (b.rollSign || 1);
        } else { const sp = Math.hypot(b.v[0], b.v[1]), dec = b.mu * Wd.g * h; if (sp <= dec) { b.v[0] = b.v[1] = 0; } else { b.v[0] -= b.v[0] / sp * dec; b.v[1] -= b.v[1] / sp * dec; } for (let i = 0; i < 3; i++) b.w[i] *= Math.exp(-8 * h); }
        if (Math.hypot(b.v[0], b.v[1]) < 0.01 && Math.abs(b.w[2]) < 0.05) { b.rest = true; b.w = [0, 0, 0]; }
      }
    }
  }
  Wd.t += dt;
}
// a body's world matrix (for drawing it with LEGEND's renderer): rotation x, y, z (roll, pitch, yaw), then position
function phy3Mat(b, out) { const M = out || lgM4(); lgRot(M, b.r3[0], b.r3[1], b.r3[2]); M[12] = b.p[0]; M[13] = b.p[1]; M[14] = b.p[2]; return M; }

/* ---------- springs ---------- */
// a critically damped spring toward a target (s: { x, v }); w: how quick (rad/s)
function physSpring(s, target, w, dt) {
  const f = 1 + 2 * dt * w, oo = w * w, hoo = dt * oo, hhoo = dt * hoo, det = 1 / (f + hhoo);
  const x = det * (f * s.x + dt * s.v + hhoo * target), v = det * (s.v + hoo * (target - s.x));
  s.x = x; s.v = v; return x;
}
// an under-damped spring (it overshoots and settles): k stiffness, z damping ratio (0..1)
function physWobble(s, target, k, z, dt) {
  const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n, c = 2 * z * Math.sqrt(k);
  for (let i = 0; i < n; i++) { const a = k * (target - s.x) - c * s.v; s.v += a * h; s.x += s.v * h; }
  return s.x;
}
// a hanging thing (a lamp, a sign) as a pendulum: angle and angular velocity, length (m), a push
function physPendulum(s, len, dt, push, damp) {
  const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
  for (let i = 0; i < n; i++) { s.v += (-9.81 / Math.max(0.05, len) * Math.sin(s.x) + (push || 0)) * h; s.v *= 1 - (damp == null ? 0.25 : damp) * h; s.x += s.v * h; }
  return s.x;
}

/* ---------- PHYSICS in the ecosystem ---------- */
function physSelfTest() {
  let n = 0, pass = 0, why = '';
  try {
    // a 3D drop: a can falls from a metre, bounces lower each time, never goes through the ground, and comes to rest
    const Wd = phy3New(); const c = phy3Add(Wd, { s: 'cyl', r: 0.033, h: 0.12, p: [0, 0, 1], v: [0.4, 0, 0], e: 0.35, mu: 0.4, rr: 0.03 });
    let lowest = 9, peaks = [], up = false, lastZ = 1; for (let i = 0; i < 1200; i++) { phy3Step(Wd, 1 / 120); lowest = Math.min(lowest, c.p[2]); if (c.v[2] > 0.05) up = true; if (up && c.v[2] <= 0) { peaks.push(c.p[2]); up = false; } lastZ = c.p[2]; }
    n++; if (lowest > 0.02) pass++; else why = 'a body sank into the ground';
    n++; if (peaks.length >= 1 && peaks.every((p, i) => i === 0 || p <= peaks[i - 1] + 1e-6) && (peaks[0] || 0) < 1) pass++; else why = why || 'bounces did not lose energy';
    n++; if (c.rest || Math.hypot(c.v[0], c.v[1]) < 0.05) pass++; else why = why || 'a body never came to rest';
    // a box in the way: a ball thrown at a wall comes back, it does not pass through
    const W2 = phy3New({ boxes: [{ min: [1, -1, 0], max: [1.2, 1, 2] }] }); const ball = phy3Add(W2, { s: 'sphere', r: 0.05, p: [0, 0, 0.5], v: [6, 0, 0], e: 0.5 });
    for (let i = 0; i < 240; i++) phy3Step(W2, 1 / 120);
    n++; if (ball.p[0] < 1) pass++; else why = why || 'a body passed through a wall';
    // a spring settles on its target
    const s = { x: 0, v: 0 }; for (let i = 0; i < 240; i++) physSpring(s, 1, 12, 1 / 120);
    n++; if (Math.abs(s.x - 1) < 0.01) pass++; else why = why || 'a spring did not settle';
  } catch (e) { why = String(e && e.message || e); }
  return { ok: pass === n, n: n, pass: pass, why: why };
}
coreDefine({ name: 'PHYSICS', kind: 'sim', ver: 1, does: 'The physics engine: spent cases and dropped magazines in the street (real gravity, bounce, friction, rolling, walls, water), 3D bodies for the cinematics, and springs for weight.',
  provides: ['physics', 'brass', 'springs'], needs: ['CORE'], feats: { want: [], without: '' }, climb: true,
  state: () => physUp() ? (PHY.b.length ? PHY.b.length + ' things in the street' : 'quiet') : 'paused',
  level: () => ['few', 'some', 'many', 'all'][physLevel()] + ' bodies · ' + PHY_CAP[physLevel()].sub + ' step' + (PHY_CAP[physLevel()].sub > 1 ? 's' : '') + ' a frame',
  lv: () => physLevel(), adaptGet: () => PHY.adapt, loadNow: () => PHY.b.length, loadName: 'bodies',
  canTrim: () => PHY.adapt > -2, trim: () => { if (PHY.adapt <= -2) return false; PHY.adapt--; const q = PHY_CAP[physLevel()]; while (PHY.b.length > q.cases + q.mags) PHY.b.shift(); return true; },
  boost: () => { if (PHY.adapt >= 0) return false; PHY.adapt++; return true; },
  alive: () => G.mode === 'play' && physUp() && PHY.b.some(b => !b.rest), stallS: 6,
  check: () => PHY.b.length > 600 ? 'bodies piled up' : PHY.b.some(b => !(b.x === b.x && b.y === b.y)) ? 'a body lost its place' : PHY.offUntil > performance.now() ? 'resting after errors' : '',
  repair: () => { PHY.b = PHY.b.filter(b => b.x === b.x && b.y === b.y && b.z === b.z).slice(-300); PHY.errT.length = 0; PHY.offUntil = 0; },
  reset: () => { physReset(); PHY.errT.length = 0; PHY.offUntil = 0; },
  selfTest: () => physSelfTest(),
  learned: () => PHY.steps > 60 ? ['A frame of street physics costs about ' + PHY.msAvg.toFixed(2) + ' ms here with up to ' + PHY.maxV + ' bodies; ' + PHY.made + ' made, ' + PHY.settled + ' settled.'] : [],
  on: { run: () => physReset(), lowMemory: () => { PHY.b = PHY.b.slice(-40); } },
  spec: { files: ['physics'], parts: ['gravity and bounce', 'friction and rolling', 'curving rifle cases', 'walls and water', 'magazines and half-moon clips', 'the 3D world for cinematics', 'static boxes', 'springs', 'pendulums', 'landing sounds'], procs: ['cpu'],
    hard: 'more bodies at once and two steps a frame', eco: 'fewer bodies, one step a frame',
    apply: (k) => engFloor(PHY, 'adapt', k),
    stats: () => [['Bodies', PHY.b.length], ['Made', PHY.made], ['Settled', PHY.settled], ['Magazines dropped', PHY.drops], ['Frame', PHY.msAvg.toFixed(2) + ' ms']] }
});
