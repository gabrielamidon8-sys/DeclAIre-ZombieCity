/* ================= FAUNA: the animals of the 3D world (1.9.9991) =================
   The city was empty of anything alive but the dead and a few crows. FAUNA brings it back to life round the player:
   - Stray dogs (alone or in twos and threes) and cats in the streets and yards, foxes at night, deer in the suburbs and
     the frozen north at dawn, at dusk and through the night, rabbits on the lawns (white in the snow), squirrels under
     the trees by day, ducks on the ponds and rivers, and the crows and pigeons on the ground (the world's own birds).
   - Flocks overhead: crows and gulls crossing the sky, and at dusk a murmuration of starlings over the city, wheeling
     like smoke. Thunder scatters them.
   - Each one lives: it grazes, sniffs, sits, washes, pecks, looks round, wanders off; it notices you (the head comes up
     and turns to you), and when you, a teammate or the dead get too close, or a gun goes off near it, it runs: dogs and
     foxes lope, deer bound away, rabbits zig-zag, cats bolt, the birds take off. Dogs bark at the dead.
   - Every kind is one instanced draw: built from parts (body, head, four legs, tail, wings) and animated on the graphics
     chip (the legs swing in their gait, the head nods and turns, the tail wags, the wings beat), its shadow animated the
     same way. They are scenery: bullets pass them by, and each player sees their own (they are not sent over the net).
   They step down with the 3D level (fewer of them, no flocks on the weakest devices) and stay away from the top-down view. */
const FAUNA = { ok: false, sp: {}, list: [], flocks: [], birdsM: null, flockM: null, t: 0, spawnT: 2, scareT: 0, lastFlash: 0, seen: 0, fled: 0, barks: 0, tests: null, mats: null };
// kinds: n how many at most (at the highest level), len its body length in metres, walk and run speeds (m/s), alert and
// flee distances (m), gait (0 trot/walk, 1 bound and hop), the coats, where and when it lives, how many together
const FA_KIND = {
  dog: { n: 4, len: 0.85, walk: 1.2, run: 8.5, alert: 13, flee: 6, gait: 0, coats: ['#5e4a34', '#2a2622', '#a2865a', '#cfc6b6', '#46382a', '#7e7064', '#3a3430'], bios: { city: 1, chaos: 1.4, suburb: 1, ruins: 1.4, ash: 0.6, burning: 0.5, desert: 0.7, snow: 0.6 }, when: 'any', grp: [1, 3], s: [0.85, 1.25] },
  fox: { n: 2, len: 0.7, walk: 1.0, run: 8, alert: 16, flee: 10, gait: 0, coats: ['#b8642a', '#a85a26', '#c07038'], bios: { suburb: 1, city: 0.6, snow: 0.8, ruins: 0.8 }, when: 'night', grp: [1, 1], s: [0.9, 1.05] },
  cat: { n: 3, len: 0.45, walk: 0.7, run: 6.5, alert: 7, flee: 3.5, gait: 0, coats: ['#2a2826', '#8a6a48', '#c88a4a', '#9a9690', '#e2ddd4', '#5a524a'], bios: { city: 1, suburb: 1.2, chaos: 0.8, ruins: 0.6 }, when: 'any', grp: [1, 1], s: [0.9, 1.1] },
  deer: { n: 5, len: 1.45, walk: 1.0, run: 11, alert: 26, flee: 15, gait: 0, coats: ['#8a6a48', '#7a5c3e', '#94744e', '#6e5640'], bios: { suburb: 1, snow: 1.3, desert: 0.3, ruins: 0.4 }, when: 'dusk', grp: [2, 4], s: [0.85, 1.15] },
  rabbit: { n: 4, len: 0.34, walk: 0.5, run: 7, alert: 9, flee: 5, gait: 1, coats: ['#8a7a64', '#7a6a58', '#9a8a70'], bios: { suburb: 1.3, snow: 1, city: 0.4, desert: 0.5 }, when: 'day', grp: [1, 2], s: [0.85, 1.15] },
  squirrel: { n: 3, len: 0.22, walk: 0.9, run: 5, alert: 6, flee: 3.5, gait: 1, coats: ['#8a5a34', '#6a6460', '#9a6a3e'], bios: { suburb: 1.2, city: 0.8 }, when: 'sun', grp: [1, 1], s: [0.9, 1.1], trees: true },
  duck: { n: 6, len: 0.4, walk: 0.45, run: 1.4, alert: 9, flee: 4, gait: 2, coats: ['#ffffff'], bios: { suburb: 1, city: 1, snow: 0.4, ruins: 0.6, chaos: 0.6 }, when: 'sun', grp: [2, 4], s: [0.9, 1.1], water: true }
};
const FA_PART = { body: 0, head: 1, fl: 2, fr: 3, bl: 4, br: 5, tail: 6, wl: 7, wr: 8 };

/* ---------- building the bodies: ellipsoids and tubes, each vertex tagged with its part and the part's pivot ---------- */
function faB() { return { p: [], n: [], c: [], k: [], v: [], i: [], nv: 0 }; }
function faEll(B, c, r, part, piv, colFn, seg) {
  const S = seg || 10, Rn = Math.max(5, Math.round(S * 0.7)), v0 = B.nv;
  for (let j = 0; j <= Rn; j++) { const ph = j / Rn * Math.PI, sp = Math.sin(ph), cp = Math.cos(ph);
    for (let i = 0; i <= S; i++) { const th = i / S * TAU, x = sp * Math.cos(th), y = cp, z = sp * Math.sin(th), p = [c[0] + x * r[0], c[1] + y * r[1], c[2] + z * r[2]];
      const nn = [x / r[0], y / r[1], z / r[2]], nl = Math.hypot(nn[0], nn[1], nn[2]) || 1, col = colFn ? colFn(p, [x, y, z]) : [1, 1, 1];
      B.p.push(p[0], p[1], p[2]); B.n.push(nn[0] / nl, nn[1] / nl, nn[2] / nl); B.c.push(col[0], col[1], col[2]); B.k.push(part); B.v.push(piv[0], piv[1], piv[2]); B.nv++; } }
  for (let j = 0; j < Rn; j++) for (let i = 0; i < S; i++) { const a = v0 + j * (S + 1) + i, b = a + S + 1; B.i.push(a, b, a + 1, a + 1, b, b + 1); }
}
function faTube(B, A, Bp, r0, r1, part, piv, col, seg) {
  const S = seg || 7, dx = Bp[0] - A[0], dy = Bp[1] - A[1], dz = Bp[2] - A[2], l = Math.hypot(dx, dy, dz) || 1, ax = [dx / l, dy / l, dz / l];
  const u = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let px = [ax[1] * u[2] - ax[2] * u[1], ax[2] * u[0] - ax[0] * u[2], ax[0] * u[1] - ax[1] * u[0]]; const pl = Math.hypot(px[0], px[1], px[2]); px = px.map(q => q / pl);
  const py = [ax[1] * px[2] - ax[2] * px[1], ax[2] * px[0] - ax[0] * px[2], ax[0] * px[1] - ax[1] * px[0]], v0 = B.nv, cc = col || [1, 1, 1];
  for (let e = 0; e < 2; e++) { const O = e ? Bp : A, r = e ? r1 : r0;
    for (let i = 0; i <= S; i++) { const a = i / S * TAU, ca = Math.cos(a), sa = Math.sin(a), N = [px[0] * ca + py[0] * sa, px[1] * ca + py[1] * sa, px[2] * ca + py[2] * sa];
      B.p.push(O[0] + N[0] * r, O[1] + N[1] * r, O[2] + N[2] * r); B.n.push(N[0], N[1], N[2]); B.c.push(cc[0], cc[1], cc[2]); B.k.push(part); B.v.push(piv[0], piv[1], piv[2]); B.nv++; } }
  for (let i = 0; i < S; i++) { const a = v0 + i, b = v0 + S + 1 + i; B.i.push(a, b, a + 1, a + 1, b, b + 1); }
}
function faGeom(B) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3)); g.setAttribute('aPart', new THREE.Float32BufferAttribute(B.k, 1)); g.setAttribute('aPiv', new THREE.Float32BufferAttribute(B.v, 3));
  g.setIndex(B.i); g.computeBoundingSphere(); g.boundingSphere.radius += 1.5; return g;
}
// four legs from hips to feet (front at fx, back at bx, half-width w, hip heights hf, hb), paws at the feet
function faLegs(B, fx, bx, w, hf, hb, r0, r1, col, paw) {
  const legs = [[fx, -w, hf, FA_PART.fl], [fx, w, hf, FA_PART.fr], [bx, -w, hb, FA_PART.bl], [bx, w, hb, FA_PART.br]];
  for (const [x, z, h, pt] of legs) { const piv = [x, h, z]; faTube(B, [x, h, z], [x + (pt >= 4 ? -0.02 : 0.01) * h, 0.03, z], r0, r1, pt, piv, col);
    if (paw) faEll(B, [x + 0.02 * h, 0.025, z], [r1 * 1.5, 0.025, r1 * 1.2], pt, piv, () => col || [1, 1, 1], 6); }
}
// the kinds' bodies (metres, nose toward +x, up +y; left -z); vertex colours multiply the coat (above 1 lightens it)
function faBuild(kind) {
  const B = faB(), P = FA_PART, dark = [0.25, 0.22, 0.2], nose = [0.08, 0.07, 0.07];
  if (kind === 'dog' || kind === 'fox' || kind === 'cat') {
    const s = kind === 'cat' ? 0.52 : kind === 'fox' ? 0.82 : 1, H = (kind === 'cat' ? 0.5 : kind === 'fox' ? 0.82 : 1) * 0.55, L = 0.42 * s;
    const belly = (p, q) => q[1] < -0.35 ? (kind === 'fox' ? [1.6, 1.7, 1.8] : [1.22, 1.2, 1.15]) : [1, 1, 1];
    faEll(B, [0, H, 0], [L, 0.17 * s, 0.15 * s], P.body, [0, 0, 0], belly, 12);
    faEll(B, [L * 0.55, H + 0.01 * s, 0], [0.2 * s, 0.19 * s, 0.16 * s], P.body, [0, 0, 0], (p, q) => kind === 'fox' && q[0] > 0.3 && q[1] < 0.2 ? [1.7, 1.8, 1.9] : belly(p, q), 10);
    const nk = [L * 0.7, H + 0.07 * s, 0];
    faTube(B, nk, [L * 1.05, H + 0.24 * s, 0], 0.09 * s, 0.075 * s, P.head, nk);
    const hc = [L * 1.18, H + 0.28 * s, 0];
    faEll(B, hc, [0.13 * s, 0.11 * s, 0.1 * s], P.head, nk, null, 10);
    const sn = kind === 'cat' ? 0.05 : kind === 'fox' ? 0.11 : 0.09;
    faEll(B, [hc[0] + 0.1 * s + sn * s * 0.5, hc[1] - 0.03 * s, 0], [sn * s, 0.05 * s, 0.055 * s], P.head, nk, () => kind === 'fox' ? [1.5, 1.55, 1.6] : [0.92, 0.9, 0.88], 8);
    faEll(B, [hc[0] + 0.1 * s + sn * s * 1.45, hc[1] - 0.02 * s, 0], [0.022 * s, 0.02 * s, 0.025 * s], P.head, nk, () => nose, 6);
    for (const zz of [-1, 1]) {   // ears (tall and pointed on cats and foxes, floppy or pricked on dogs), eyes
      const pr = kind !== 'dog';
      faEll(B, [hc[0] - 0.02 * s, hc[1] + (pr ? 0.12 : 0.05) * s, zz * 0.065 * s], [0.03 * s, (pr ? 0.07 : 0.06) * s, 0.025 * s], P.head, nk, () => kind === 'fox' ? [0.4, 0.3, 0.25] : [0.9, 0.9, 0.9], 6);
      faEll(B, [hc[0] + 0.1 * s, hc[1] + 0.03 * s, zz * 0.055 * s], [0.014 * s, 0.014 * s, 0.014 * s], P.head, nk, () => kind === 'cat' ? [0.6, 0.7, 0.2] : [0.05, 0.04, 0.03], 5);
    }
    faLegs(B, L * 0.62, -L * 0.72, 0.085 * s, H - 0.04 * s, H - 0.02 * s, 0.05 * s, 0.035 * s, kind === 'fox' ? [0.3, 0.25, 0.22] : null, true);
    const tb = [-L * 0.98, H + 0.05 * s, 0];
    if (kind === 'fox') { faEll(B, [tb[0] - 0.2 * s, tb[1] - 0.02 * s, 0], [0.24 * s, 0.075 * s, 0.075 * s], P.tail, tb, (p, q) => q[0] < -0.75 ? [2.2, 2.3, 2.4] : [1, 1, 1], 9); }
    else if (kind === 'cat') { faTube(B, tb, [tb[0] - 0.12, tb[1] + 0.12, 0], 0.03, 0.026, P.tail, tb); faTube(B, [tb[0] - 0.12, tb[1] + 0.12, 0], [tb[0] - 0.1, tb[1] + 0.3, 0], 0.026, 0.02, P.tail, tb); }
    else faTube(B, tb, [tb[0] - 0.2, tb[1] + 0.13, 0], 0.04, 0.02, P.tail, tb);
  } else if (kind === 'deer' || kind === 'buck') {
    const H = 1.0, white = (p, q) => q[1] < -0.45 ? [1.9, 1.8, 1.65] : [1, 1, 1];
    faEll(B, [0, H, 0], [0.62, 0.25, 0.2], P.body, [0, 0, 0], white, 12);
    faEll(B, [0.42, H + 0.03, 0], [0.26, 0.26, 0.19], P.body, [0, 0, 0], white, 10);
    faEll(B, [-0.42, H + 0.03, 0], [0.26, 0.25, 0.2], P.body, [0, 0, 0], white, 10);
    const nk = [0.52, H + 0.12, 0];
    faTube(B, nk, [0.74, H + 0.5, 0], 0.12, 0.08, P.head, nk, [1, 1, 1], 8);
    const hc = [0.82, H + 0.56, 0];
    faEll(B, hc, [0.15, 0.1, 0.085], P.head, nk, null, 10);
    faEll(B, [hc[0] + 0.14, hc[1] - 0.04, 0], [0.08, 0.055, 0.055], P.head, nk, () => [0.85, 0.8, 0.75], 8);
    faEll(B, [hc[0] + 0.21, hc[1] - 0.04, 0], [0.025, 0.025, 0.03], P.head, nk, () => nose, 6);
    for (const zz of [-1, 1]) {
      faEll(B, [hc[0] - 0.05, hc[1] + 0.1, zz * 0.1], [0.035, 0.1, 0.06], P.head, nk, () => [1.1, 1.05, 1], 7);
      faEll(B, [hc[0] + 0.07, hc[1] + 0.03, zz * 0.07], [0.018, 0.018, 0.018], P.head, nk, () => [0.04, 0.03, 0.03], 5);
      if (kind === 'buck') { const a0 = [hc[0] - 0.02, hc[1] + 0.08, zz * 0.05], a1 = [hc[0] - 0.06, hc[1] + 0.32, zz * 0.17], a2 = [hc[0] + 0.08, hc[1] + 0.46, zz * 0.2];
        faTube(B, a0, a1, 0.018, 0.014, P.head, nk, [0.9, 0.8, 0.65], 5); faTube(B, a1, a2, 0.014, 0.008, P.head, nk, [0.9, 0.8, 0.65], 5); faTube(B, [a1[0] + 0.01, a1[1] + 0.06, a1[2]], [a1[0] + 0.1, a1[1] + 0.18, a1[2] * 0.9], 0.01, 0.006, P.head, nk, [0.9, 0.8, 0.65], 4); }
    }
    faLegs(B, 0.46, -0.48, 0.11, H - 0.08, H - 0.05, 0.07, 0.03, null, false);
    const tb = [-0.62, H + 0.08, 0]; faEll(B, [tb[0] - 0.05, tb[1] - 0.02, 0], [0.06, 0.09, 0.04], P.tail, tb, (p, q) => q[0] > 0 ? [1, 1, 1] : [2.1, 2.0, 1.9], 6);
  } else if (kind === 'rabbit') {
    const tint = (p, q) => q[1] < -0.4 ? [1.4, 1.38, 1.3] : [1, 1, 1];
    faEll(B, [0, 0.14, 0], [0.15, 0.11, 0.1], P.body, [0, 0, 0], tint, 10);
    faEll(B, [-0.07, 0.12, 0], [0.11, 0.11, 0.11], P.body, [0, 0, 0], tint, 9);
    const nk = [0.1, 0.18, 0], hc = [0.16, 0.22, 0];
    faEll(B, hc, [0.075, 0.065, 0.06], P.head, nk, null, 9);
    faEll(B, [hc[0] + 0.07, hc[1] - 0.01, 0], [0.015, 0.012, 0.015], P.head, nk, () => [0.5, 0.35, 0.35], 5);
    for (const zz of [-1, 1]) { faEll(B, [hc[0] - 0.03, hc[1] + 0.11, zz * 0.025], [0.022, 0.085, 0.014], P.head, nk, (p, q) => q[1] > 0.85 ? [0.5, 0.45, 0.42] : [1.05, 1, 0.98], 6); faEll(B, [hc[0] + 0.03, hc[1] + 0.02, zz * 0.045], [0.012, 0.012, 0.012], P.head, nk, () => [0.03, 0.02, 0.02], 5); }
    faLegs(B, 0.07, -0.08, 0.05, 0.1, 0.1, 0.022, 0.016, null, false);
    for (const zz of [-1, 1]) faEll(B, [-0.06, 0.02, zz * 0.06], [0.07, 0.02, 0.025], zz < 0 ? P.bl : P.br, [-0.08, 0.1, zz * 0.05], null, 6);
    const tb = [-0.17, 0.16, 0]; faEll(B, tb, [0.035, 0.035, 0.035], P.tail, tb, () => [2.2, 2.2, 2.2], 6);
  } else if (kind === 'squirrel') {
    faEll(B, [0, 0.1, 0], [0.11, 0.065, 0.055], P.body, [0, 0, 0], (p, q) => q[1] < -0.4 ? [1.6, 1.5, 1.4] : [1, 1, 1], 9);
    const nk = [0.08, 0.13, 0], hc = [0.12, 0.16, 0];
    faEll(B, hc, [0.05, 0.045, 0.04], P.head, nk, null, 8);
    for (const zz of [-1, 1]) { faEll(B, [hc[0] - 0.015, hc[1] + 0.05, zz * 0.022], [0.012, 0.022, 0.01], P.head, nk, null, 5); faEll(B, [hc[0] + 0.03, hc[1] + 0.012, zz * 0.028], [0.008, 0.008, 0.008], P.head, nk, () => [0.02, 0.02, 0.02], 4); }
    faLegs(B, 0.06, -0.06, 0.035, 0.08, 0.08, 0.016, 0.01, null, false);
    const tb = [-0.1, 0.11, 0];
    faEll(B, [tb[0] - 0.05, tb[1] + 0.07, 0], [0.045, 0.09, 0.04], P.tail, tb, () => [1.1, 1.05, 1], 8);
    faEll(B, [tb[0] - 0.02, tb[1] + 0.18, 0], [0.05, 0.05, 0.045], P.tail, tb, () => [1.15, 1.1, 1.05], 8);
  } else if (kind === 'duck') {
    // a mallard drake or a hen, its own colours (the coat is white)
    const drake = (p, q) => q[0] < -0.75 ? [0.18, 0.18, 0.2] : q[0] > 0.55 && q[1] > -0.2 ? [0.42, 0.26, 0.2] : q[1] < -0.3 ? [0.7, 0.7, 0.7] : [0.62, 0.62, 0.6];
    faEll(B, [0, 0.07, 0], [0.2, 0.085, 0.11], P.body, [0, 0, 0], drake, 10);
    faEll(B, [-0.17, 0.11, 0], [0.07, 0.03, 0.06], P.body, [0, 0, 0], () => [0.2, 0.2, 0.22], 6);
    for (const zz of [-1, 1]) faEll(B, [-0.02, 0.12, zz * 0.07], [0.14, 0.035, 0.04], P.body, [0, 0, 0], (p, q) => q[0] < -0.3 ? [0.25, 0.25, 0.3] : [0.5, 0.48, 0.46], 7);
    const nk = [0.13, 0.1, 0];
    faTube(B, nk, [0.17, 0.2, 0], 0.035, 0.03, P.head, nk, [0.85, 0.85, 0.85], 6);
    faTube(B, [0.155, 0.17, 0], [0.165, 0.185, 0], 0.036, 0.036, P.head, nk, [2.2, 2.2, 2.2], 6);
    const hc = [0.18, 0.23, 0];
    faEll(B, hc, [0.055, 0.05, 0.045], P.head, nk, () => [0.06, 0.28, 0.12], 8);
    faEll(B, [hc[0] + 0.065, hc[1] - 0.012, 0], [0.04, 0.012, 0.022], P.head, nk, () => [0.85, 0.7, 0.15], 6);
    for (const zz of [-1, 1]) faEll(B, [hc[0] + 0.02, hc[1] + 0.012, zz * 0.04], [0.008, 0.008, 0.008], P.head, nk, () => [0.02, 0.02, 0.02], 4);
  } else {
    // a bird: crow, pigeon, gull, starling (by scale and coat), wings folded on the ground and beating in the air
    faEll(B, [0, 0.12, 0], [0.12, 0.065, 0.06], P.body, [0, 0, 0], (p, q) => q[1] < -0.4 ? [1.15, 1.15, 1.15] : [1, 1, 1], 9);
    const nk = [0.07, 0.15, 0], hc = [0.11, 0.17, 0];
    faEll(B, hc, [0.042, 0.04, 0.036], P.head, nk, null, 8);
    faEll(B, [hc[0] + 0.045, hc[1] - 0.005, 0], [0.025, 0.009, 0.01], P.head, nk, () => [0.35, 0.3, 0.25], 5);
    for (const zz of [-1, 1]) faEll(B, [hc[0] + 0.02, hc[1] + 0.012, zz * 0.03], [0.007, 0.007, 0.007], P.head, nk, () => [0.05, 0.03, 0.02], 4);
    faEll(B, [-0.15, 0.125, 0], [0.08, 0.012, 0.04], P.tail, [-0.1, 0.12, 0], null, 6);
    for (const zz of [-1, 1]) { const sh = [0.02, 0.15, zz * 0.04]; faEll(B, [-0.01, 0.15, zz * 0.17], [0.09, 0.012, 0.14], zz < 0 ? P.wl : P.wr, sh, (p, q) => Math.abs(q[2]) > 0.75 ? [0.8, 0.8, 0.8] : [1, 1, 1], 9); }
    for (const zz of [-1, 1]) faTube(B, [0.0, 0.07, zz * 0.025], [0.01, 0.0, zz * 0.025], 0.008, 0.006, zz < 0 ? P.fl : P.fr, [0, 0.07, zz * 0.025], [0.5, 0.4, 0.35], 4);
  }
  return faGeom(B);
}

/* ---------- the material: the parts move on the graphics chip ---------- */
// iA: the gait's phase, the stride (0 still..1 full), the head's turn, its nod (down +); iB: the bounce, the tail, the
// wings, the gait (0 trot, 1 bound/hop, 2 swim/fly)
const FA_VERT = `
  attribute float aPart; attribute vec3 aPiv; attribute vec4 iA; attribute vec4 iB;
  vec3 faRZ(vec3 p, vec3 c, float a) { p -= c; float s = sin(a), k = cos(a); return c + vec3(p.x * k - p.y * s, p.x * s + p.y * k, p.z); }
  vec3 faRY(vec3 p, vec3 c, float a) { p -= c; float s = sin(a), k = cos(a); return c + vec3(p.x * k + p.z * s, p.y, -p.x * s + p.z * k); }
  vec3 faRX(vec3 p, vec3 c, float a) { p -= c; float s = sin(a), k = cos(a); return c + vec3(p.x, p.y * k - p.z * s, p.y * s + p.z * k); }
  vec3 faMove(vec3 p, vec3 c) {
    int pt = int(aPart + 0.5);
    if (pt >= 2 && pt <= 5) {
      float off = iB.w > 0.5 && iB.w < 1.5 ? (pt <= 3 ? 0.0 : 2.6) : ((pt == 2 || pt == 5) ? 0.0 : 3.14159);
      if (iB.w > 0.5 && iB.w < 1.5 && (pt == 3 || pt == 5)) off += 0.35;
      float a = sin(iA.x + off) * iA.y * (iB.w > 0.5 && iB.w < 1.5 ? 0.95 : 0.6);
      p = faRZ(p, c, a);
    } else if (pt == 1) { p = faRZ(p, c, -iA.w); p = faRY(p, c, iA.z); }
    else if (pt == 6) { p = faRY(p, c, iB.y); p = faRZ(p, c, iB.y * 0.2); }
    else if (pt == 7) p = faRX(p, c, iB.z);
    else if (pt == 8) p = faRX(p, c, -iB.z);
    return p;
  }
`;
function faMat() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0, envMapIntensity: 0.5 });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, DU);
    sh.vertexShader = FA_VERT + sh.vertexShader
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n objectNormal = normalize(faMove(objectNormal + aPiv, aPiv) - aPiv);')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed = faMove(transformed, aPiv); transformed.y += iB.x;');
    // fur and feathers: a fine noise in the coat, a soft sheen at the rim
    sh.vertexShader = 'varying vec3 vFaP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vFaP = position;');
    sh.fragmentShader = 'uniform sampler2D uNoise; varying vec3 vFaP;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n { vec4 nz = texture2D(uNoise, vFaP.xy * 2.3 + vFaP.z * 1.7); diffuseColor.rgb *= 0.86 + 0.22 * nz.r + 0.1 * nz.b; }');
  };
  m.customProgramCacheKey = () => 'fauna1';
  const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  d.onBeforeCompile = sh => { sh.vertexShader = FA_VERT + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed = faMove(transformed, aPiv); transformed.y += iB.x;'); };
  d.customProgramCacheKey = () => 'faunaD1';
  return { m: m, d: d };
}
// one kind's instanced mesh with its per-animal attributes
function faMesh(kind, cap) {
  const g = faBuild(kind), A = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4), Bb = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
  A.setUsage(THREE.DynamicDrawUsage); Bb.setUsage(THREE.DynamicDrawUsage); g.setAttribute('iA', A); g.setAttribute('iB', Bb);
  const M = new THREE.InstancedMesh(g, FAUNA.mats.m, cap); M.customDepthMaterial = FAUNA.mats.d; M.castShadow = true; M.receiveShadow = true; M.frustumCulled = false; M.count = 0;
  M.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  M.setColorAt(0, new THREE.Color(1, 1, 1)); M.instanceColor.setUsage(THREE.DynamicDrawUsage);
  DEPTH.scene.add(M);
  return { M: M, A: A, B: Bb, cap: cap, n: 0, geo: g };
}
function faunaInit() {
  if (FAUNA.ok || !DEPTH.ok || !DEPTH.scene) return FAUNA.ok;
  try {
    FAUNA.mats = faMat();
    for (const k of ['dog', 'fox', 'cat', 'deer', 'buck', 'rabbit', 'squirrel', 'duck']) FAUNA.sp[k] = faMesh(k, k === 'deer' || k === 'duck' ? 8 : k === 'buck' ? 3 : 6);
    FAUNA.birdsM = faMesh('bird', 120);
    FAUNA.O = new THREE.Object3D(); FAUNA.C = new THREE.Color();
    FAUNA.ok = true;
  } catch (e) { coreHurt('FAUNA', e); faunaFree(); }
  return FAUNA.ok;
}
function faunaFree() {
  for (const k in FAUNA.sp) { const s = FAUNA.sp[k]; try { DEPTH.scene && DEPTH.scene.remove(s.M); s.geo.dispose(); } catch (e) { } }
  if (FAUNA.birdsM) { try { DEPTH.scene && DEPTH.scene.remove(FAUNA.birdsM.M); FAUNA.birdsM.geo.dispose(); } catch (e) { } }
  if (FAUNA.mats) { try { FAUNA.mats.m.dispose(); FAUNA.mats.d.dispose(); } catch (e) { } }
  FAUNA.sp = {}; FAUNA.birdsM = null; FAUNA.mats = null; FAUNA.list.length = 0; FAUNA.flocks.length = 0; FAUNA.ok = false;
}

/* ---------- where and when they live ---------- */
function faWhen(k) {
  const h = LUX.hour == null ? 12 : LUX.hour, dusk = (h > 4.8 && h < 8.5) || (h > 17 && h < 21.5), night = h < 5.5 || h > 20.5, rain = clamp((WX.rain || 0) + (WX.storm || 0), 0, 1);
  const w = FA_KIND[k].when; let f = w === 'any' ? 1 : w === 'night' ? (night ? 1 : dusk ? 0.4 : 0) : w === 'dusk' ? (dusk ? 1.4 : night ? 0.8 : 0.25) : w === 'day' ? (night ? 0.15 : dusk ? 1.2 : 0.8) : (night ? 0 : dusk ? 0.6 : 1);
  if (k === 'cat' || k === 'squirrel' || k === 'rabbit') f *= 1 - rain * 0.8; else f *= 1 - rain * 0.35;
  return f;
}
function faCap() { const l = DEPTH.lvl || 0; return [0.35, 0.6, 1, 1.25][l] || 1; }
// a place for a group to appear: round the player, out of reach of the eye where it can (behind or far), on open ground
function faSpawn() {
  const p = G.p; if (!p) return;
  const U = DEPTH.upm || dUPM(), bio = bioAt(p.x, p.y), cap = faCap(), have = {};
  for (const a of FAUNA.list) have[a.k] = (have[a.k] || 0) + 1;
  const cand = [];
  for (const k in FA_KIND) { const K = FA_KIND[k], bw = K.bios[bio] || 0; if (!bw) continue; const max = Math.round(K.n * cap); if ((have[k] || 0) + (k === 'deer' ? have.buck || 0 : 0) >= max) continue; const w = bw * faWhen(k); if (w > 0.05) cand.push([k, w]); }
  if (!cand.length) return;
  let tot = 0; for (const c of cand) tot += c[1]; let r = Math.random() * tot, k = cand[0][0]; for (const c of cand) { r -= c[1]; if (r <= 0) { k = c[0]; break; } }
  const K = FA_KIND[k], f = HOVER.f3 || [1, 0, 0], fa = Math.atan2(f[2], f[0]);
  for (let tries = 0; tries < 8; tries++) {
    const ang = fa + Math.PI * (0.45 + Math.random() * 1.1) * (Math.random() < 0.5 ? -1 : 1), d = (K.water ? 18 : 26) + Math.random() * 34;
    let x = p.x + Math.cos(ang) * d * U, y = p.y + Math.sin(ang) * d * U;
    if (K.trees) { const t = faNearTree(x, y, 30 * U); if (!t) continue; x = t.x + (Math.random() - 0.5) * 3 * U; y = t.y + (Math.random() - 0.5) * 3 * U; }
    const wet = waterAt(x, y) > 0;
    if (K.water ? !wet : wet) continue;
    if (!K.water && blocked(x, y, 0.8 * U)) continue;
    const n = K.grp[0] + Math.floor(Math.random() * (K.grp[1] - K.grp[0] + 1)), gid = Math.random();
    for (let i = 0; i < n; i++) {
      const ax = x + (Math.random() - 0.5) * 4 * U, ay = y + (Math.random() - 0.5) * 4 * U; if (!K.water && blocked(ax, ay, 0.6 * U)) continue; if (K.water && !(waterAt(ax, ay) > 0)) continue;
      const kk = k === 'deer' && i === 0 && Math.random() < 0.45 ? 'buck' : k;
      const coats = bio === 'snow' && k === 'rabbit' ? ['#e6e6e2', '#dcdcd6'] : K.coats;
      FAUNA.list.push({ k: kk, base: k, x: ax, y: ay, a: Math.random() * TAU, sp: 0, want: 0, st: 'idle', t: 1 + Math.random() * 4, ph: Math.random() * 10, hy: 0, hp: 0, hpT: 0, tail: 0, s: K.s[0] + Math.random() * (K.s[1] - K.s[0]), coat: coats[Math.floor(Math.random() * coats.length)], gid: gid, tx: ax, ty: ay, fleeT: 0, alertT: 0, barkT: 0, look: 0, sit: 0 });
      FAUNA.seen++;
    }
    return;
  }
}
function faNearTree(x, y, r) {
  let best = null, bd = r * r;
  const cx = Math.floor(x / CHS), cy = Math.floor(y / CHS);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const c = chunks.get((cx + i) + ',' + (cy + j)); if (!c || !c.deco) continue; for (const d of c.deco) if (d.k === 'tree' && d.v !== 'dead') { const dd = (d.x - x) * (d.x - x) + (d.y - y) * (d.y - y); if (dd < bd) { bd = dd; best = d; } } }
  return best;
}
// a gun goes off: every animal within earshot bolts, birds take off
function faunaHear(x, y, fk) {
  if (!FAUNA.ok) return;
  const U = DEPTH.upm || dUPM(), R = ((typeof SW_EAR !== 'undefined' && SW_EAR[fk]) || 60) * 0.7 * U;
  for (const a of FAUNA.list) { const d = Math.hypot(a.x - x, a.y - y); if (d < R) { a.st = 'flee'; a.fleeT = 3 + Math.random() * 3; a.fx = x; a.fy = y; } }
  for (const F of FAUNA.flocks) if (Math.hypot(F.x - x, F.y - y) < R * 1.4) F.scare = 1;
}

/* ---------- each frame: what they do ---------- */
function faAngTo(a, b) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
function faThreat(a, U) {
  // the nearest player, and the nearest of the dead within twenty metres
  let best = null, bd = 1e12;
  for (const p of (typeof netPlayers === 'function' ? netPlayers() : [G.p])) { if (!p || p.down) continue; const d = Math.hypot(p.x - a.x, p.y - a.y); if (d < bd) { bd = d; best = p; } }
  let zb = null, zd = 20 * U;
  try { near(a.x, a.y, 20 * U, z => { if (z.dead) return; const d = Math.hypot(z.x - a.x, z.y - a.y); if (d < zd) { zd = d; zb = z; } }); } catch (e) { }
  return { p: best, pd: bd / U, z: zb, zd: zb ? zd / U : 1e9 };
}
function faStep(a, dt, U) {
  const K = FA_KIND[a.base], T = faThreat(a, U), sc = a.s;
  const alertR = K.alert * (a.st === 'flee' ? 1.4 : 1), fleeR = K.flee;
  // the nearer of the two dangers
  const dz = T.zd * 0.75, danger = Math.min(T.pd, dz), from = T.pd <= dz ? T.p : T.z;
  if (from && danger < fleeR && a.st !== 'flee') { a.st = 'flee'; a.fleeT = 2.5 + Math.random() * 2.5; a.fx = from.x; a.fy = from.y; FAUNA.fled++; }
  else if (from && danger < alertR && (a.st === 'idle' || a.st === 'walk')) { a.st = 'alert'; a.alertT = 1.5 + Math.random() * 2; a.fx = from.x; a.fy = from.y; }
  // dogs bark at the dead (the world's sound engine, if it has a bark)
  if (a.base === 'dog' && T.z && T.zd < 24) { a.barkT -= dt; if (a.barkT <= 0) { a.barkT = 0.6 + Math.random() * 1.6; a.bark = 0.25; FAUNA.barks++; try { if (typeof SFX !== 'undefined' && SFX.bark) SFX.bark(a.x, a.y); } catch (e) { } } }
  if (a.bark > 0) a.bark -= dt;
  let speed = 0, turnTo = null;
  if (a.st === 'flee') {
    a.fleeT -= dt; const away = Math.atan2(a.y - a.fy, a.x - a.fx) + (a.base === 'rabbit' ? Math.sin(FAUNA.t * 5 + a.ph) * 0.9 : 0);
    turnTo = away; speed = K.run * (a.base === 'duck' ? 1 : 1);
    if (from) { a.fx = from.x; a.fy = from.y; }
    if (a.fleeT <= 0 && danger > alertR) { a.st = 'idle'; a.t = 1 + Math.random() * 3; }
  } else if (a.st === 'alert') {
    a.alertT -= dt; turnTo = null; speed = 0;
    if (a.alertT <= 0) { a.st = danger < alertR ? 'walk' : 'idle'; a.t = 2 + Math.random() * 3; if (a.st === 'walk') { const aw = Math.atan2(a.y - a.fy, a.x - a.fx) + (Math.random() - 0.5); a.tx = a.x + Math.cos(aw) * 8 * U; a.ty = a.y + Math.sin(aw) * 8 * U; } }
  } else if (a.st === 'walk') {
    const d = Math.hypot(a.tx - a.x, a.ty - a.y); turnTo = Math.atan2(a.ty - a.y, a.tx - a.x); speed = K.walk;
    a.t -= dt; if (d < 0.5 * U || a.t <= 0) { a.st = 'idle'; a.t = 2 + Math.random() * 6; }
  } else {   // idle: graze, sniff, sit, look round, then wander a few metres
    a.t -= dt;
    if (a.t <= 0) { const r = Math.random(); if (r < 0.65) { const ang = a.a + (Math.random() - 0.5) * 2.4, dd = (2 + Math.random() * 6) * U * (K.len > 1 ? 1.5 : 1); a.tx = a.x + Math.cos(ang) * dd; a.ty = a.y + Math.sin(ang) * dd; a.st = 'walk'; a.t = 6; } else { a.t = 2 + Math.random() * 5; a.look = (Math.random() - 0.5) * 1.6; } a.sit = (a.base === 'cat' || a.base === 'dog') && Math.random() < 0.25 ? 1 : 0; }
  }
  // turn toward where it is going, then move (round what stands in the way; the ducks stay on the water)
  if (turnTo != null) { const d = faAngTo(a.a, turnTo); a.a += clamp(d, -dt * (a.st === 'flee' ? 6 : 2.5), dt * (a.st === 'flee' ? 6 : 2.5)); }
  a.sp += (speed - a.sp) * Math.min(1, dt * (a.st === 'flee' ? 4 : 2));
  if (a.sp > 0.02) {
    const st = a.sp * U * dt; let moved = false;
    for (const off of [0, 0.6, -0.6, 1.2, -1.2, 2.0, -2.0]) {
      const ang = a.a + off, nx = a.x + Math.cos(ang) * st, ny = a.y + Math.sin(ang) * st, wet = waterAt(nx, ny) > 0;
      if (K.water ? !wet : (blocked(nx, ny, 0.35 * U * sc) || wet)) continue;
      a.x = nx; a.y = ny; if (off) a.a += off * Math.min(1, dt * 4); moved = true; break;
    }
    if (!moved) { a.sp *= 0.3; if (a.st === 'walk') { a.st = 'idle'; a.t = 1; } }
  }
  // the gait: stride from speed, the phase from distance covered (a deer bounds when it runs, a rabbit always hops)
  const stride = clamp(a.sp / Math.max(0.5, K.walk * 1.4), 0, 1.2), fq = (a.base === 'rabbit' || a.base === 'squirrel') ? 7 : K.len > 1 ? 2.6 : 4.2;
  a.ph += dt * (a.sp > 0.05 ? (fq * (0.6 + 0.5 * Math.min(2.5, a.sp / Math.max(0.3, K.walk)))) : 0);
  a.gait = K.gait === 2 ? 2 : K.gait === 1 || (a.base === 'deer' && a.sp > K.run * 0.5) || ((a.base === 'dog' || a.base === 'fox' || a.base === 'cat') && a.sp > K.run * 0.6) ? 1 : 0;
  a.stride = K.gait === 2 ? 0 : Math.min(1, stride);
  // the head: up and turned to the danger when alert, down to graze or sniff when idle, a look round now and then
  let hy = 0, hp = 0;
  if (a.st === 'alert' || (a.st === 'flee' && a.sp < 1)) { hy = clamp(faAngTo(a.a, Math.atan2(a.fy - a.y, a.fx - a.x)), -1.2, 1.2); hp = -0.25; }
  else if (a.st === 'idle') { const g = Math.sin(FAUNA.t * 0.7 + a.ph * 3); hp = a.base === 'deer' || a.base === 'rabbit' || a.base === 'duck' ? (g > -0.2 ? 0.9 + 0.15 * Math.sin(FAUNA.t * 3 + a.ph) : -0.1) : a.base === 'dog' || a.base === 'fox' ? (g > 0.3 ? 0.6 : 0) : 0.05; hy = a.look * (g < -0.2 ? 1 : 0.3); if (a.sit) hp = -0.15; }
  else if (a.st === 'walk') hp = a.base === 'dog' ? 0.35 : 0.1;
  if (a.bark > 0) hp = -0.3 - Math.sin(a.bark * 40) * 0.12;
  a.hy += (hy - a.hy) * Math.min(1, dt * 5); a.hp += (hp - a.hp) * Math.min(1, dt * 3);
  a.tail = a.base === 'dog' ? (a.st === 'idle' ? Math.sin(FAUNA.t * 9 + a.ph) * 0.5 : Math.sin(FAUNA.t * 4) * 0.12) : a.base === 'cat' ? Math.sin(FAUNA.t * 1.3 + a.ph) * 0.35 : a.base === 'fox' ? Math.sin(FAUNA.t * 2 + a.ph) * 0.15 : a.base === 'deer' && a.st === 'flee' ? 0.6 : 0;
  // the bounce: a hop's arc, a lope's lift, a duck riding the ripples
  a.bob = a.gait === 1 && a.sp > 0.2 ? Math.abs(Math.sin(a.ph * 0.5 + 0.8)) * (K.len > 1 ? 0.22 : a.base === 'rabbit' || a.base === 'squirrel' ? 0.09 : 0.08) * Math.min(1, a.sp / K.walk) : K.gait === 2 ? Math.sin(FAUNA.t * 1.6 + a.ph) * 0.012 - 0.03 : a.sit ? -0.12 * (K.len) : 0;
}
// the sky's flocks: a few birds crossing by day (crows over the city, gulls over water), starlings wheeling at dusk
function faFlocks(dt, U) {
  const p = G.p; if (!p) return;
  const lvl = DEPTH.lvl || 0, h = LUX.hour == null ? 12 : LUX.hour, dusk = h > 16.8 && h < 19.8, storm = clamp((WX.storm || 0) + (WX.rain || 0) * 0.5, 0, 1);
  const want = lvl <= 0 || storm > 0.7 || h < 5.5 || h > 21 ? 0 : (dusk ? 2 : 1) + (lvl >= 3 ? 1 : 0);
  // thunder scatters them
  if ((WX.flash || 0) > 0.5 && FAUNA.lastFlash <= 0.5) for (const F of FAUNA.flocks) F.scare = 1;
  FAUNA.lastFlash = WX.flash || 0;
  if (FAUNA.flocks.length < want && Math.random() < dt * 0.15) {
    const murm = dusk && Math.random() < 0.6 && bioAt(p.x, p.y) !== 'desert', ang = Math.random() * TAU, d = 120 + Math.random() * 60, dir = ang + Math.PI + (Math.random() - 0.5) * 0.8;
    FAUNA.flocks.push({ x: p.x + Math.cos(ang) * d * U, y: p.y + Math.sin(ang) * d * U, alt: murm ? 38 + Math.random() * 20 : 22 + Math.random() * 30, a: dir, v: murm ? 9 : 11 + Math.random() * 4, n: murm ? (lvl >= 3 ? 70 : 46) : 5 + Math.floor(Math.random() * 9), murm: murm, kind: murm ? 'star' : Math.random() < 0.6 ? 'crow' : 'gull', t: 0, seed: Math.random() * 100, scare: 0 });
  }
  for (let i = FAUNA.flocks.length - 1; i >= 0; i--) {
    const F = FAUNA.flocks[i]; F.t += dt; F.scare = Math.max(0, F.scare - dt * 0.3);
    F.a += Math.sin(F.t * 0.15 + F.seed) * dt * (F.murm ? 0.35 : 0.08); const v = F.v * (1 + F.scare * 0.8);
    F.x += Math.cos(F.a) * v * U * dt; F.y += Math.sin(F.a) * v * U * dt; F.alt += (F.scare * 8 - (F.alt - (F.murm ? 45 : 32)) * 0.05) * dt;
    if (Math.hypot(F.x - p.x, F.y - p.y) > 220 * U) FAUNA.flocks.splice(i, 1);
  }
}
function faunaFrame(dt) {
  if (!DEPTH.ok || !DEPTH.scene || !G.p || G.mode === 'title') return;
  if (!FAUNA.ok && !faunaInit()) return;
  const U = DEPTH.upm || dUPM(); FAUNA.t += dt;
  // appear and leave
  FAUNA.spawnT -= dt; if (FAUNA.spawnT <= 0) { FAUNA.spawnT = 1.4 + Math.random(); try { faSpawn(); } catch (e) { coreHurt('FAUNA', e); } }
  for (let i = FAUNA.list.length - 1; i >= 0; i--) { const a = FAUNA.list[i]; if (Math.hypot(a.x - G.p.x, a.y - G.p.y) > 110 * U) FAUNA.list.splice(i, 1); }
  for (const a of FAUNA.list) faStep(a, dt, U);
  faFlocks(dt, U);
  faDraw(U);
}
// write each kind's instances (position, turn, size, coat; gait, head, tail, wings)
function faPut(S, x, y, z, ang, sc, col, iA, iB) {
  if (S.n >= S.cap) return; const O = FAUNA.O; O.position.set(x, y, z); O.rotation.set(0, -ang, 0); O.scale.setScalar(sc); O.updateMatrix();
  S.M.setMatrixAt(S.n, O.matrix); S.M.setColorAt(S.n, FAUNA.C.set(col));
  S.A.array.set(iA, S.n * 4); S.B.array.set(iB, S.n * 4); S.n++;
}
function faDraw(U) {
  for (const k in FAUNA.sp) FAUNA.sp[k].n = 0; const BM = FAUNA.birdsM; BM.n = 0;
  const piv = HOVER.pivot || [0, 0, 0], far2 = Math.pow((DEPTH.fogFar || 100) * 0.9, 2), T = FAUNA.t;
  for (const a of FAUNA.list) {
    const x = dX(a.x), z = dZ(a.y), dx = x - piv[0], dz = z - piv[2]; if (dx * dx + dz * dz > far2) continue;
    const S = FAUNA.sp[a.k]; if (!S) continue;
    const gy = FA_KIND[a.base].water ? -0.02 : fleshGroundY(a);
    faPut(S, x, gy, z, a.a, a.s, a.coat, [a.ph, a.stride || 0, -a.hy, a.hp], [a.bob || 0, a.tail || 0, 0, a.gait || 0]);
  }
  // the world's own birds on the ground and taking off (crows, pigeons, vultures)
  if (typeof WD !== 'undefined') for (const b of WD.birds) {
    if (b.st > 1) continue; const x = dX(b.x), z = dZ(b.y), dx = x - piv[0], dz = z - piv[2]; if (dx * dx + dz * dz > far2) continue;
    const big = b.kind === 'vulture' ? 2.2 : b.kind === 'pigeon' ? 0.95 : 1.15, col = b.kind === 'pigeon' ? '#7a8088' : b.kind === 'vulture' ? '#3a3230' : '#1c1c20';
    if (b.st === 0) { const pk = Math.max(0, Math.sin(T * 5 + (b.ph || 0) * 7)); faPut(BM, x, fleshGroundY(b), z, b.a || 0, big, col, [T * 6 + (b.ph || 0), Math.sin(T * 0.6 + (b.ph || 0)) > 0.6 ? 0.6 : 0, 0, pk > 0.7 ? 1.1 : 0.1], [0, Math.sin(T * 3) * 0.1, 0, 2]); }
    else { const hh = Math.min(30, 0.3 + b.t * (3 + b.t * 2)), fl = Math.sin(b.t * (big > 1.5 ? 8 : 20)); faPut(BM, x, hh, z, Math.atan2(b.vy || 0, b.vx || 1), big, col, [0, 0, 0, -0.1], [0, 0, fl * 0.9 + 0.1, 2]); }
  }
  // the flocks overhead
  for (const F of FAUNA.flocks) {
    const cx = dX(F.x), cz = dZ(F.y), sc = F.kind === 'star' ? 0.62 : F.kind === 'gull' ? 1.45 : 1.15, col = F.kind === 'gull' ? '#d8d8d4' : F.kind === 'star' ? '#2a2a2e' : '#1c1c20';
    for (let i = 0; i < F.n; i++) {
      const s = F.seed + i * 1.618, r = F.murm ? 14 + 10 * Math.sin(T * 0.7 + s) : 2.4 * Math.sqrt(i);
      let ox, oy, oz;
      if (F.murm) { ox = Math.sin(s * 3.1 + T * 0.9) * r + Math.sin(T * 0.37 + s) * 8; oz = Math.cos(s * 2.3 + T * 0.8) * r * 0.8; oy = Math.sin(s * 1.7 + T * 1.1) * r * 0.45 + Math.sin(T * 0.5 + ox * 0.05) * 6; }
      else { const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1; ox = -row * 2.6 + Math.sin(T + s) * 0.4; oz = side * row * 2.2 + Math.cos(T * 0.8 + s) * 0.4; oy = Math.sin(T * 0.9 + s) * 0.6; }
      const ca = Math.cos(F.a), sa = Math.sin(F.a), wx = cx + ox * ca - oz * sa, wz = cz + ox * sa + oz * ca;
      const glide = !F.murm && Math.sin(T * 0.4 + s) > 0.3, fl = glide ? 0.12 : Math.sin(T * (F.kind === 'gull' ? 6 : F.kind === 'star' ? 18 : 9) + s * 5);
      faPut(BM, wx, F.alt + oy, wz, F.a + (F.murm ? Math.sin(T + s) * 0.6 : 0), sc, col, [0, 0, 0, -0.1], [0, 0, fl * 0.85 + 0.12, 2]);
    }
  }
  for (const k in FAUNA.sp) { const S = FAUNA.sp[k]; S.M.count = S.n; if (S.n) { S.M.instanceMatrix.needsUpdate = true; S.M.instanceColor.needsUpdate = true; S.A.needsUpdate = true; S.B.needsUpdate = true; } }
  BM.M.count = BM.n; if (BM.n) { BM.M.instanceMatrix.needsUpdate = true; BM.M.instanceColor.needsUpdate = true; BM.A.needsUpdate = true; BM.B.needsUpdate = true; }
}
// the self-test builds every body and runs a dog through a scare in a scratch list
function faunaSelfTest() {
  if (!FAUNA.ok) return { ok: true, n: 0, pass: 0, why: 'resting (the 3D view is off)' };
  let parts = true, verts = true;
  for (const k of ['dog', 'deer', 'rabbit', 'duck', 'bird']) { const g = faBuild(k), pa = g.attributes.aPart.array; const seen = new Set(pa); if (k !== 'duck' && !(seen.has(2) && seen.has(1))) parts = false; if (Array.from(g.attributes.position.array).some(v => !(v === v))) verts = false; g.dispose(); }
  const U = DEPTH.upm || dUPM(), p = G.p || { x: 0, y: 0 }, a = { k: 'dog', base: 'dog', x: p.x + 3 * U, y: p.y, a: 0, sp: 0, st: 'idle', t: 9, ph: 0, hy: 0, hp: 0, s: 1, coat: '#888', fx: 0, fy: 0, fleeT: 0, alertT: 0, barkT: 9, look: 0, sit: 0, tx: 0, ty: 0 };
  const keepFled = FAUNA.fled; faStep(a, 0.05, U); const fled = a.st === 'flee'; FAUNA.fled = keepFled;
  const checks = [['every kind has a head and legs to move', parts], ['every vertex is a number', verts], ['a dog bolts from a player at three metres', fled || !G.p]];
  const pass = checks.filter(c => c[1]).length;
  return FAUNA.tests = { ok: pass === checks.length, n: checks.length, pass: pass, why: checks.filter(c => !c[1]).map(c => c[0]).join('; ') };
}
coreDefine({ name: 'FAUNA', kind: 'render', ver: 1, does: 'The animals of the 3D world: stray dogs and cats, foxes at night, deer at dawn and dusk, rabbits, squirrels, ducks on the water and the crows and pigeons on the ground, flocks crossing the sky and starlings wheeling at dusk; each grazes, sniffs, sits and wanders, looks up when you come near and bolts from you, the dead and gunfire, dogs barking at the dead, birds scattering at thunder. Every kind one instanced draw, its legs, head, tail and wings moved on the graphics chip.',
  provides: ['animals3d'], needs: ['DEPTH', 'WX'],
  state: () => FAUNA.ok ? FAUNA.list.length + ' animals near · ' + FAUNA.flocks.length + ' flocks · ' + FAUNA.seen + ' seen, ' + FAUNA.fled + ' bolted, ' + FAUNA.barks + ' barks' : 'resting',
  check: () => FAUNA.ok && !FAUNA.birdsM ? 'its birds went missing' : '',
  repair: () => { faunaFree(); },
  selfTest: faunaSelfTest,
  docs: { what: 'The animals round the player in the 3D view.', how: 'Kinds by district and hour appear out of sight round the player and live by a small state machine (idle, walk, alert, flee); each kind is an instanced mesh built from parts, its gait, head, tail and wings animated in the vertex shader.' }
});
