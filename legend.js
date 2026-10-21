/* ================= LEGEND: the characters and their whole rig (1.9.992) =================
   The legends are real 3D characters, not drawings. LEGEND builds them, rigs them, animates them and draws them:
   - The builder: every character is put together from shapes (rounded boxes, lathed bodies, limbs with muscle
     profiles, spheres, extruded outlines like a pistol slide or a knife blade, swept tubes for straps and cords, and
     decals for patches), each one fixed to a bone of the skeleton and given a material.
   - Materials and textures: a procedural atlas of twenty textures, painted once on this device: an original storm
     camo and a night camo, ripstop, Cordura, MOLLE webbing with its bar tacks, knit, leather, rubber lugs, carbon
     twill, brushed metal, polymer stipple, skin, brick, asphalt with its puddles, painted steel gone to rust, twill,
     and sheets of patches, class emblems, posters and faces. Each has a colour layer and a relief layer (height,
     roughness, cavity), so cloth weave and webbing catch the light, and wet cloth darkens while hard kit shines.
   - The rig: a 47-bone skeleton (spine, neck, head, collarbones, arms, hands with two-jointed fingers and thumbs,
     legs, feet and toes, plus the props: pistol and its slide and magazine, knife, carbine and its magazine, and the
     seven plates of the Operator's mask). Poses are set joint by joint or by reach: two-bone IK puts a hand on a grip
     or a foot on the ground, so a gun can be aimed and both hands follow it the way a shooter's would.
   - Animation: clips are small programs over time (keyframes, gaits, ready positions, breathing), written from
     references (how soldiers walk heel to toe, slice a corner, hold isosceles, draw a knife in a reverse grip, throw
     with the hips). Clips cross-fade at the joint level, after the reach has been solved.
   - Drawing: on the graphics chip (WebGL) with textures, relief, wet shading, a key light, a rim light, four point
     lights, lightning, shadows and puddle reflections; on the processor (a 2D painter) with the same meshes and a
     simpler shading when there is no graphics chip, and for the small top-down frames the game uses in a run.
   - In a run the survivor IS the chosen legend: the top-down frame follows what the player is doing (idle, walking
     forward, backing up, strafing left or right, running, dashing, down), with the feet keeping pace with the ground.
   It looks after itself: a lost graphics context hands over to the painter and comes back; a run of errors rests
   the GPU path for a minute; the level steps down (texture size, detail, shadows) when frames run long. */

/* ---------- the five classes and the legends ---------- */
const LG_CLASSES = [
  { id: 'attack', name: 'Attack', col: '#ff4b3e', glow: '#ff8a5c', tag: 'Push the line', blurb: 'Breaks a horde open and keeps the pressure on it.' },
  { id: 'defense', name: 'Defense', col: '#3f8cff', glow: '#7ab4ff', tag: 'Hold the ground', blurb: 'Plates up and stands in the doorway so the team never gets swarmed.' },
  { id: 'engineer', name: 'Engineer', col: '#ffb21e', glow: '#ffd36a', tag: 'Build the edge', blurb: 'Turrets, traps and quick fixes: makes the city fight on your side.' },
  { id: 'medic', name: 'Medic', col: '#36e58a', glow: '#86ffbe', tag: 'Bring them back', blurb: 'Patches wounds mid-fight and drags the fallen back to their feet.' },
  { id: 'magic', name: 'Magic', col: '#b25cff', glow: '#d8a2ff', tag: 'Bend the rules', blurb: 'Tech so strange it behaves like magic: sigils, wards and light.' }
];
const LG_CLASS_BY = {}; for (const c of LG_CLASSES) LG_CLASS_BY[c.id] = c;
const LG_LEGENDS = [
  { id: 'operator', name: 'Operator', title: 'The Operator', base: true, tier: 'Base legend · for beginners', classes: 'all',
    line: 'Walks in first. Leaves last.',
    bio: 'A contractor who stayed when the city was sealed. Soldier\'s discipline, a mercenary\'s nerve: brave enough to walk toward the noise, careful enough to count every round. He checks every corner twice and every magazine three times.',
    personality: ['Brave: steps toward the threat, chin level, never backs up without a reason', 'Methodical: checks corners, presses the chamber, tugs the glove tight', 'Calm: slow breathing, eyes lead and the head follows', 'Economical: no wasted movement, no wasted shot'],
    gear: ['High-cut ballistic helmet with rails, a mount and a strobe', 'Exotech mask: seven carbon plates that click shut over a balaclava, a visor slit that glows in the class colour', 'Plate carrier in night camo with curved plates, a cummerbund, MOLLE webbing, magazine and radio pouches', 'Combat shirt and trousers in storm camo, with elbow and knee pads', 'Tactical gloves with hard knuckles, tactical boots with lugged soles', 'Polymer pistol with an optic and a weapon light, in a hip holster', 'Fixed-blade knife carried for a reverse-grip draw', 'Class patch on the shoulder; each class adds its own kit'] }
];
const LG_LEGEND_BY = {}; for (const l of LG_LEGENDS) LG_LEGEND_BY[l.id] = l;

const LG = {
  ver: 1, mode: 'none', gl: null, cv: null, why: '', lost: false, offUntil: 0, errT: [], adapt: 0, lvl: 2,
  models: new Map(), atlas: null, atlasT: 0, atlasBusy: null, sprites: new Map(), spriteMade: 0, spriteMs: 0, spriteBudget: 0, mem: new WeakMap(),
  ms: 0, msAvg: 0, frames: 0, drawn: 0, tris: 0, beatT: 0, open: false, lastErr: '', tests: null
};
// metres per sprite unit (the old survivor sprite's units): shoulders about 13 units from the middle
const LG_UNIT = 0.0185;

/* ---------- maths: 4x4 matrices, column-major ---------- */
function lgM4() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
function lgMul(o, a, b) {
  const a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5], a6 = a[6], a7 = a[7], a8 = a[8], a9 = a[9], a10 = a[10], a11 = a[11], a12 = a[12], a13 = a[13], a14 = a[14], a15 = a[15];
  for (let c = 0; c < 16; c += 4) {
    const b0 = b[c], b1 = b[c + 1], b2 = b[c + 2], b3 = b[c + 3];
    o[c] = a0 * b0 + a4 * b1 + a8 * b2 + a12 * b3; o[c + 1] = a1 * b0 + a5 * b1 + a9 * b2 + a13 * b3;
    o[c + 2] = a2 * b0 + a6 * b1 + a10 * b2 + a14 * b3; o[c + 3] = a3 * b0 + a7 * b1 + a11 * b2 + a15 * b3;
  }
  return o;
}
// rotation R = Rx(rx) * Ry(ry) * Rz(rz): twist about the bone first, then pitch, then roll
function lgRot(o, rx, ry, rz) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  o[0] = cy * cz; o[4] = -cy * sz; o[8] = sy;
  o[1] = cx * sz + sx * sy * cz; o[5] = cx * cz - sx * sy * sz; o[9] = -sx * cy;
  o[2] = sx * sz - cx * sy * cz; o[6] = sx * cz + cx * sy * sz; o[10] = cx * cy;
  o[3] = o[7] = o[11] = 0; o[12] = o[13] = o[14] = 0; o[15] = 1;
  return o;
}
function lgTR(tx, ty, tz, rx, ry, rz) { const m = lgRot(lgM4(), rx || 0, ry || 0, rz || 0); m[12] = tx; m[13] = ty; m[14] = tz; return m; }
function lgS(sx, sy, sz) { const m = lgM4(); m[0] = sx; m[5] = sy; m[10] = sz; return m; }
function lgPt(m, x, y, z, o) { o = o || [0, 0, 0]; o[0] = m[0] * x + m[4] * y + m[8] * z + m[12]; o[1] = m[1] * x + m[5] * y + m[9] * z + m[13]; o[2] = m[2] * x + m[6] * y + m[10] * z + m[14]; return o; }
function lgDir(m, x, y, z, o) { o = o || [0, 0, 0]; o[0] = m[0] * x + m[4] * y + m[8] * z; o[1] = m[1] * x + m[5] * y + m[9] * z; o[2] = m[2] * x + m[6] * y + m[10] * z; return o; }
function lgInv(o, m) {
  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3], a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7], a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11], a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  let d = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!d) return lgM4(); d = 1 / d;
  o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * d; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * d; o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * d; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * d;
  o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * d; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * d; o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * d; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * d;
  o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * d; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * d; o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * d; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * d;
  o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * d; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * d; o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * d; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * d;
  return o;
}
function lgPersp(o, fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2); o.fill(0); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; }
function lgOrtho(o, l, r, b, t, n, f) { o.fill(0); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n); o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1; return o; }
function lgLook(o, e, c, up, roll) {
  let fx = c[0] - e[0], fy = c[1] - e[1], fz = c[2] - e[2]; let l = Math.hypot(fx, fy, fz) || 1; fx /= l; fy /= l; fz /= l;
  let ux = up[0], uy = up[1], uz = up[2];
  let sx = fy * uz - fz * uy, sy = fz * ux - fx * uz, sz = fx * uy - fy * ux; l = Math.hypot(sx, sy, sz);
  if (l < 1e-5) { ux = 0; uy = 1; uz = 0; sx = fy * uz - fz * uy; sy = fz * ux - fx * uz; sz = fx * uy - fy * ux; l = Math.hypot(sx, sy, sz) || 1; }
  sx /= l; sy /= l; sz /= l;
  let vx = sy * fz - sz * fy, vy = sz * fx - sx * fz, vz = sx * fy - sy * fx;
  if (roll) { const c0 = Math.cos(roll), s0 = Math.sin(roll), ax = sx * c0 + vx * s0, ay = sy * c0 + vy * s0, az = sz * c0 + vz * s0; vx = vx * c0 - sx * s0; vy = vy * c0 - sy * s0; vz = vz * c0 - sz * s0; sx = ax; sy = ay; sz = az; }
  o[0] = sx; o[4] = sy; o[8] = sz; o[1] = vx; o[5] = vy; o[9] = vz; o[2] = -fx; o[6] = -fy; o[10] = -fz;
  o[3] = o[7] = o[11] = 0; o[12] = -(sx * e[0] + sy * e[1] + sz * e[2]); o[13] = -(vx * e[0] + vy * e[1] + vz * e[2]); o[14] = fx * e[0] + fy * e[1] + fz * e[2]; o[15] = 1;
  return o;
}
// quaternions, for blending solved poses joint by joint
function lgQ(m, i, q) {   // rotation part of 4x4 m (or a 3x3 at offset i with stride 3) into q[x,y,z,w]
  let m00, m01, m02, m10, m11, m12, m20, m21, m22;
  if (i == null) { m00 = m[0]; m01 = m[4]; m02 = m[8]; m10 = m[1]; m11 = m[5]; m12 = m[9]; m20 = m[2]; m21 = m[6]; m22 = m[10]; }
  else { m00 = m[i]; m01 = m[i + 3]; m02 = m[i + 6]; m10 = m[i + 1]; m11 = m[i + 4]; m12 = m[i + 7]; m20 = m[i + 2]; m21 = m[i + 5]; m22 = m[i + 8]; }
  const tr = m00 + m11 + m22; let x, y, z, w;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = 0.25 * s; x = (m21 - m12) / s; y = (m02 - m20) / s; z = (m10 - m01) / s; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; w = (m21 - m12) / s; x = 0.25 * s; y = (m01 + m10) / s; z = (m02 + m20) / s; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; w = (m02 - m20) / s; x = (m01 + m10) / s; y = 0.25 * s; z = (m12 + m21) / s; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = 0.25 * s; }
  q[0] = x; q[1] = y; q[2] = z; q[3] = w; return q;
}
function lgQM(q, o, i) {   // quaternion into a 3x3 at offset i (stride 3)
  const x = q[0], y = q[1], z = q[2], w = q[3], xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
  o[i] = 1 - 2 * (yy + zz); o[i + 1] = 2 * (xy + wz); o[i + 2] = 2 * (xz - wy);
  o[i + 3] = 2 * (xy - wz); o[i + 4] = 1 - 2 * (xx + zz); o[i + 5] = 2 * (yz + wx);
  o[i + 6] = 2 * (xz + wy); o[i + 7] = 2 * (yz - wx); o[i + 8] = 1 - 2 * (xx + yy);
}
function lgNlerp(a, b, k, o) { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; const s = d < 0 ? -1 : 1; for (let i = 0; i < 4; i++) o[i] = a[i] * (1 - k) + b[i] * k * s; const l = Math.hypot(o[0], o[1], o[2], o[3]) || 1; for (let i = 0; i < 4; i++) o[i] /= l; return o; }
const lgLerp = (a, b, k) => a + (b - a) * k;
const lgSS = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function lgHex(h, lin) { const n = parseInt(h.slice(1), 16), c = [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; return lin === false ? c : c.map(v => Math.pow(v, 2.2)); }

/* ---------- noise: a seeded generator, periodic value noise and cells (so every texture tiles) ---------- */
function lgRng(s) { s = (s >>> 0) || 1; return function () { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function lgLat(nx, ny, R) { ny = ny || nx; const a = new Float32Array(nx * ny); for (let i = 0; i < a.length; i++) a[i] = R(); return { nx: nx, ny: ny, a: a }; }
function lgVal(L, x, y) {
  const nx = L.nx, ny = L.ny, fx = x * nx, fy = y * ny; let ix = Math.floor(fx), iy = Math.floor(fy); const tx = fx - ix, ty = fy - iy;
  ix = ((ix % nx) + nx) % nx; iy = ((iy % ny) + ny) % ny; const ix1 = ix + 1 === nx ? 0 : ix + 1, iy1 = iy + 1 === ny ? 0 : iy + 1;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), A = L.a;
  const a = A[iy * nx + ix], b = A[iy * nx + ix1], c = A[iy1 * nx + ix], d = A[iy1 * nx + ix1];
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function lgFbm(Ls, x, y) { let s = 0, w = 0.5, t = 0; for (let i = 0; i < Ls.length; i++) { s += lgVal(Ls[i], x, y) * w; t += w; w *= 0.5; } return s / t; }
function lgOcts(n0, k, R) { const o = []; for (let i = 0; i < k; i++) o.push(lgLat(n0 << i, n0 << i, R)); return o; }
// cells: distance to the nearest of a grid of jittered points (wraps), as a fraction of a cell, and the cell's id
function lgCells(n, R) { const p = new Float32Array(n * n * 2), id = new Float32Array(n * n); for (let i = 0; i < n * n; i++) { p[i * 2] = R(); p[i * 2 + 1] = R(); id[i] = R(); } return { n: n, p: p, id: id }; }
function lgCell(C, x, y, o) {
  const n = C.n, fx = x * n, fy = y * n, ix = Math.floor(fx), iy = Math.floor(fy); let d1 = 9, d2 = 9, idv = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = ix + i, cy = iy + j, wx = ((cx % n) + n) % n, wy = ((cy % n) + n) % n, k = wy * n + wx;
    const dx = cx + C.p[k * 2] - fx, dy = cy + C.p[k * 2 + 1] - fy, d = Math.sqrt(dx * dx + dy * dy);
    if (d < d1) { d2 = d1; d1 = d; idv = C.id[k]; } else if (d < d2) d2 = d;
  }
  o[0] = d1; o[1] = d2; o[2] = idv; return o;
}

/* ---------- the texture atlas: 20 tiles, 5 across and 4 down; a colour layer and a relief layer ---------- */
// relief layer: R height, G roughness (0 glossy .. 1 matte, puddles on the asphalt are glossy), B cavity (or the
// coverage of a cut-out decal)
const LT = { camo: 0, ncamo: 1, rip: 2, cord: 3, molle: 4, knit: 5, leather: 6, rubber: 7, carbon: 8, metal: 9, poly: 10, skin: 11, brick: 12, asphalt: 13, rust: 14, twill: 15, patch: 16, emblem: 17, poster: 18, face: 19 };
const LT_COLS = 5, LT_ROWS = 4;
const LT_NAMES = ['storm camo', 'night camo', 'ripstop', 'Cordura', 'MOLLE webbing', 'knit', 'leather', 'rubber', 'carbon twill', 'brushed metal', 'polymer stipple', 'skin', 'brick', 'asphalt', 'rusted paint', 'twill', 'patches', 'class emblems', 'posters', 'faces and tech'];
const lgMix3 = (o, c, k) => { o[0] += (c[0] - o[0]) * k; o[1] += (c[1] - o[1]) * k; o[2] += (c[2] - o[2]) * k; };
// each tile: (T, R) => { px(u, v, x, y, o) fills o = [r, g, b, height, rough, cavity] (0..1), post(gA, gH, T, R) draws on top }
function lgWeave(x, y, T) { const w = Math.max(1, T >> 7), g = Math.max(2, T >> 4); const wv = (((x / w) | 0) + ((y / w) | 0)) & 1 ? 0.04 : -0.04; const gx = x % g < w * 1.2 || y % g < w * 1.2 ? 0.07 : 0; return [wv + gx, gx]; }
function lgCamoTile(pal, seed, coarse) {
  return (T, R0) => {
    const R = lgRng(seed), A = lgOcts(3, 5, R), B2 = lgOcts(4, 5, R), C = lgOcts(6, 4, R), Br = lgLat(28, 3, R), Mi = lgLat(64, 64, R), Wx = lgOcts(4, 3, R), Wy = lgOcts(4, 3, R);
    return { px: (u, v, x, y, o) => {
      // domain warp: the blotches get torn, organic edges instead of following the noise lattice
      const wu = u + (lgFbm(Wx, u, v) - 0.5) * 0.09, wv0 = v + (lgFbm(Wy, u, v) - 0.5) * 0.09;
      const n1 = lgFbm(A, wu, wv0), n2 = lgFbm(B2, wu + 0.31, wv0 + 0.17), n3 = lgFbm(C, wu + 0.7, wv0 + 0.45), b = lgVal(Br, wu, v), m = lgVal(Mi, u, v);
      const c = pal[0].slice();
      lgMix3(c, pal[1], lgSS(0.5, 0.515, n1)); lgMix3(c, pal[2], lgSS(0.555, 0.57, n2)); lgMix3(c, pal[3], lgSS(0.6, 0.615, n3) * (1 - lgSS(0.5, 0.515, n1)));
      lgMix3(c, pal[4], (1 - lgSS(0.0, 0.03, Math.abs(b - 0.5))) * 0.8 * lgSS(0.45, 0.6, n2));
      const wv = coarse ? lgCordH(x, y, T) : lgWeave(x, y, T), sh = 1 + wv[0] * 0.4 + (m - 0.5) * 0.07;
      o[0] = c[0] * sh; o[1] = c[1] * sh; o[2] = c[2] * sh; o[3] = 0.5 + wv[0]; o[4] = 0.8 + (m - 0.5) * 0.2; o[5] = 1 - wv[1] * 0.3;
    } };
  };
}
function lgCordH(x, y, T) {   // Cordura: a 2x2 basket weave of thick yarns
  const w = Math.max(2, T / 40), i = Math.floor(x / w), j = Math.floor(y / w), over = ((i >> 1) + (j >> 1)) & 1;
  const a = over ? (y / w) % 1 : (x / w) % 1, h = Math.sin(a * Math.PI);
  return [(h - 0.5) * 0.35, 1 - h];
}
const LG_TILES = [
  // 0 storm camo (original): khaki ground, olive and brown blotches, light highlights, dark twigs; ripstop weave
  lgCamoTile([[0.34, 0.35, 0.3], [0.22, 0.26, 0.18], [0.3, 0.25, 0.19], [0.46, 0.46, 0.4], [0.13, 0.13, 0.11]], 11, false),
  // 1 night camo (original): charcoal ground, near-black and grey blotches; Cordura weave (plate carrier and pouches)
  lgCamoTile([[0.15, 0.15, 0.15], [0.075, 0.075, 0.08], [0.22, 0.22, 0.21], [0.3, 0.29, 0.27], [0.05, 0.05, 0.05]], 23, true),
  // 2 ripstop
  (T, R) => { const N = lgLat(64, 64, lgRng(31)); return { px: (u, v, x, y, o) => { const w = lgWeave(x, y, T), n = lgVal(N, u, v); const g = 0.8 + w[0] * 0.5 + (n - 0.5) * 0.08; o[0] = o[1] = o[2] = g; o[3] = 0.5 + w[0]; o[4] = 0.8; o[5] = 1 - w[1] * 0.4; } }; },
  // 3 Cordura
  (T, R) => { const N = lgLat(96, 96, lgRng(37)); return { px: (u, v, x, y, o) => { const c = lgCordH(x, y, T), n = lgVal(N, u, v); const g = 0.74 + c[0] * 0.4 + (n - 0.5) * 0.1; o[0] = o[1] = o[2] = g; o[3] = 0.5 + c[0]; o[4] = 0.86; o[5] = 0.85 + (1 - c[1]) * 0.15; } }; },
  // 4 MOLLE: four rows of 25 mm webbing on 38 mm centres, bar-tacked every 38 mm, over Cordura
  (T, R) => { const N = lgLat(128, 32, lgRng(41)); return { px: (u, v, x, y, o) => {
    const rv = (v * 4) % 1, cu = (u * 4) % 1, band = rv > 0.14 && rv < 0.8, edge = band ? Math.min(rv - 0.14, 0.8 - rv) : 0, n = lgVal(N, u, v);
    if (band) {
      const rib = Math.sin(rv * 140) * 0.04, tack = Math.abs(cu - 0.5) > 0.47, stitch = tack && (Math.floor(rv * 60) & 1);
      const bulge = Math.sin(cu * Math.PI) * 0.06, e = lgSS(0, 0.05, edge);
      const g = (0.62 + rib + (n - 0.5) * 0.06) * (0.75 + e * 0.25) + (stitch ? 0.12 : 0);
      o[0] = o[1] = o[2] = g; o[3] = 0.62 + bulge + rib * 0.5 + e * 0.12 - (tack ? 0.06 : 0); o[4] = 0.8; o[5] = 0.8 + e * 0.2;
    } else {
      const c = lgCordH(x, y, T), sh = rv >= 0.8 ? lgSS(0.8, 0.95, rv) : 1;
      const g = (0.7 + c[0] * 0.35) * (0.55 + 0.45 * sh); o[0] = o[1] = o[2] = g; o[3] = 0.3 + c[0] * 0.5; o[4] = 0.88; o[5] = 0.5 + 0.5 * sh;
    }
  } }; },
  // 5 knit (stretch fabric): fine vertical ribs
  (T, R) => { const N = lgLat(64, 64, lgRng(43)); return { px: (u, v, x, y, o) => { const r = Math.sin(u * Math.PI * 2 * 48) * 0.5 + 0.5, k = Math.sin(v * Math.PI * 2 * 96 + (u * 48 | 0) * 1.6) * 0.15, n = lgVal(N, u, v); const g = 0.7 + r * 0.08 + k * 0.1 + (n - 0.5) * 0.06; o[0] = o[1] = o[2] = g; o[3] = 0.45 + r * 0.25 + k * 0.2; o[4] = 0.85; o[5] = 0.85 + r * 0.15; } }; },
  // 6 leather: pebbled grain and long creases
  (T, R) => { const C = lgCells(28, lgRng(47)), K = lgOcts(4, 3, lgRng(48)), c = [0, 0, 0]; return { px: (u, v, x, y, o) => { lgCell(C, u, v, c); const p = lgSS(0.05, 0.6, c[1] - c[0]), k = Math.abs(lgFbm(K, u, v) - 0.5); const cr = 1 - lgSS(0, 0.02, k); const g = 0.6 + p * 0.18 - cr * 0.2; o[0] = o[1] = o[2] = g; o[3] = 0.4 + p * 0.3 - cr * 0.25; o[4] = 0.55 + (1 - p) * 0.2; o[5] = 0.7 + p * 0.3 - cr * 0.3; } }; },
  // 7 rubber: chevron lugs and pebbling (soles, knee caps, mask seals)
  (T, R) => { const C = lgCells(40, lgRng(53)), c = [0, 0, 0]; return { px: (u, v, x, y, o) => { const ch = ((v + Math.abs(u - 0.5) * 0.7) * 6) % 1, lug = ch < 0.55 ? 1 : 0, e = lug ? Math.min(ch, 0.55 - ch) : 0; lgCell(C, u, v, c); const pb = lgSS(0, 0.5, c[0]) * 0.1; const g = 0.32 + lug * 0.06 - pb * 0.5; o[0] = o[1] = o[2] = g; o[3] = lug ? 0.65 + lgSS(0, 0.06, e) * 0.2 - pb : 0.2; o[4] = 0.72; o[5] = lug ? 1 : 0.55; } }; },
  // 8 carbon: 2x2 twill tows with resin gloss; tows running across look lighter than the ones running down
  (T, R) => { const N = lgLat(64, 64, lgRng(59)); return { px: (u, v, x, y, o) => { const n = 16, i = Math.floor(u * n), j = Math.floor(v * n), horiz = ((i + j) & 3) < 2, a = horiz ? (v * n) % 1 : (u * n) % 1, f = horiz ? (v * n * 7) % 1 : (u * n * 7) % 1; const h = Math.sin(a * Math.PI), z = lgVal(N, u, v); const g = (horiz ? 0.33 : 0.17) * (0.7 + 0.3 * h) + Math.abs(f - 0.5) * 0.04 + (z - 0.5) * 0.03; o[0] = g * 0.95; o[1] = g; o[2] = g * 1.08; o[3] = 0.45 + h * 0.15; o[4] = 0.22 + (1 - h) * 0.15; o[5] = 0.75 + h * 0.25; } }; },
  // 9 brushed metal with scratches (drawn after)
  (T, R) => { const S = lgLat(4, 160, lgRng(61)), N = lgOcts(4, 3, lgRng(62)); return { px: (u, v, x, y, o) => { const s = lgVal(S, u, v), n = lgFbm(N, u, v); const g = 0.6 + (s - 0.5) * 0.18 + (n - 0.5) * 0.12; o[0] = g; o[1] = g; o[2] = g * 1.02; o[3] = 0.5 + (s - 0.5) * 0.08; o[4] = 0.3 + (n - 0.5) * 0.3; o[5] = 1; },
    post: (gA, gH, T, R2) => { const r = lgRng(63); for (let i = 0; i < 70; i++) { const x = r() * T, y = r() * T, a = (r() - 0.5) * 0.9, l = 4 + r() * T * 0.2; for (const [g, c] of [[gA, 'rgba(255,255,255,0.18)'], [gH, 'rgba(60,200,255,0.5)']]) { g.strokeStyle = c; g.lineWidth = Math.max(0.6, T / 600); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } } } }; },
  // 10 polymer stipple (pistol frame, helmet shell)
  (T, R) => { const C = lgCells(90, lgRng(67)), c = [0, 0, 0], N = lgLat(32, 32, lgRng(68)); return { px: (u, v, x, y, o) => { lgCell(C, u, v, c); const b = 1 - lgSS(0.15, 0.55, c[0]), n = lgVal(N, u, v); const g = 0.33 + b * 0.05 + (n - 0.5) * 0.04; o[0] = o[1] = o[2] = g; o[3] = 0.4 + b * 0.3; o[4] = 0.66 + b * 0.1; o[5] = 0.85 + b * 0.15; } }; },
  // 11 skin (the dead): mottling, veins, pores; tinted by each zombie's skin colour
  (T, R) => { const M = lgOcts(4, 4, lgRng(71)), V = lgOcts(5, 4, lgRng(72)), P = lgLat(128, 128, lgRng(73)); return { px: (u, v, x, y, o) => { const m = lgFbm(M, u, v), vn = 1 - lgSS(0, 0.018, Math.abs(lgFbm(V, u, v) - 0.5)), p = lgVal(P, u, v); const g = 0.68 + (m - 0.5) * 0.35; o[0] = g * (1 - vn * 0.35); o[1] = g * (1 - vn * 0.42); o[2] = g * (1 - vn * 0.2); o[3] = 0.5 + (p - 0.5) * 0.15 + vn * 0.12; o[4] = 0.5 + (p - 0.5) * 0.2; o[5] = 0.9 + (p - 0.5) * 0.15; } }; },
  // 12 brick: staggered courses, mortar, chipped edges, soot and grime
  (T, R) => { const N = lgOcts(8, 3, lgRng(79)), G = lgLat(10, 2, lgRng(80)), Rb = lgRng(81), pal = [[0.42, 0.18, 0.12], [0.5, 0.24, 0.15], [0.36, 0.16, 0.12], [0.3, 0.2, 0.17], [0.46, 0.28, 0.2]], bc = []; for (let i = 0; i < 64; i++) { const c = pal[(Rb() * pal.length) | 0].slice(), s = 0.75 + Rb() * 0.4; bc.push([c[0] * s, c[1] * s, c[2] * s, Rb()]); }
    return { px: (u, v, x, y, o) => { const rows = 8, row = Math.floor(v * rows), rv = (v * rows) % 1, off = row & 1 ? 0.25 : 0, cu = (u * 2 + off * 2) % 1, col = Math.floor(u * 2 + off * 2) & 1, n = lgFbm(N, u, v);
      const mt = 0.06 + (n - 0.5) * 0.05, mortar = rv < mt || rv > 1 - mt || cu < mt * 0.5 || cu > 1 - mt * 0.5, b = bc[(row * 2 + col) % 64], gr = lgVal(G, u, v);
      if (mortar) { const g = 0.36 + (n - 0.5) * 0.1; o[0] = g; o[1] = g * 0.97; o[2] = g * 0.92; o[3] = 0.25; o[4] = 0.95; o[5] = 0.55; }
      else { const s = 0.85 + (n - 0.5) * 0.35 - gr * 0.25 * (b[3] > 0.6 ? 1 : 0.4); o[0] = b[0] * s; o[1] = b[1] * s; o[2] = b[2] * s; o[3] = 0.7 + (n - 0.5) * 0.2; o[4] = 0.85; o[5] = 0.95; }
    } }; },
  // 13 asphalt: aggregate, cracks, oil, and puddles (glossy patches in the roughness)
  (T, R) => { const A = lgOcts(16, 3, lgRng(83)), K = lgOcts(4, 4, lgRng(84)), P = lgOcts(2, 3, lgRng(85)), C = lgCells(70, lgRng(86)), c = [0, 0, 0]; return { px: (u, v, x, y, o) => {
    const a = lgFbm(A, u, v), k = 1 - lgSS(0, 0.012, Math.abs(lgFbm(K, u, v) - 0.5)), p = lgFbm(P, u, v); lgCell(C, u, v, c); const sp = c[0] < 0.12 ? 0.08 : 0;
    const pud = lgSS(0.53, 0.58, p), g = (0.2 + (a - 0.5) * 0.12 + sp) * (1 - k * 0.5) * (1 - pud * 0.25);
    o[0] = g; o[1] = g; o[2] = g * 1.03; o[3] = 0.5 + (a - 0.5) * 0.2 - k * 0.3 - pud * 0.1; o[4] = lgLerp(0.85, 0.04, pud); o[5] = 1 - k * 0.5;
  } }; },
  // 14 painted steel gone to rust (dumpsters, doors, the fire escape)
  (T, R) => { const N = lgOcts(6, 4, lgRng(89)), D = lgLat(48, 6, lgRng(90)); return { px: (u, v, x, y, o) => { const n = lgFbm(N, u, v), d = lgVal(D, u, v), r = lgSS(0.62, 0.66, n + (d - 0.5) * 0.15); const paint = [0.12, 0.16, 0.13], rust = [0.25, 0.14, 0.08 + (n - 0.5) * 0.04]; const c = paint.slice(); lgMix3(c, rust, r); const s = 0.9 + (d - 0.5) * 0.25; o[0] = c[0] * s; o[1] = c[1] * s; o[2] = c[2] * s; o[3] = 0.5 + r * 0.15 + (n - 0.5) * 0.1 * r; o[4] = lgLerp(0.42, 0.92, r); o[5] = 1 - r * 0.2; } }; },
  // 15 twill (the clothes of the dead)
  (T, R) => { const N = lgOcts(8, 3, lgRng(97)); return { px: (u, v, x, y, o) => { const t = Math.sin((u + v) * Math.PI * 2 * 40) * 0.5 + 0.5, n = lgFbm(N, u, v); const g = 0.66 + t * 0.1 + (n - 0.5) * 0.25; o[0] = o[1] = o[2] = g; o[3] = 0.45 + t * 0.2; o[4] = 0.88; o[5] = 0.85 + t * 0.15; } }; },
  // 16-19: drawn sheets (patches, emblems, posters, faces), with a coverage mask in the relief layer
  (T, R) => ({ px: lgFlatPx, post: (gA, gH, T2) => lgDrawPatches(gA, gH, T2) }),
  (T, R) => ({ px: lgFlatPx, post: (gA, gH, T2) => lgDrawEmblems(gA, gH, T2) }),
  (T, R) => ({ px: lgFlatPx, post: (gA, gH, T2) => lgDrawPosters(gA, gH, T2) }),
  (T, R) => ({ px: lgFlatPx, post: (gA, gH, T2) => lgDrawFaces(gA, gH, T2) })
];
function lgFlatPx(u, v, x, y, o) { o[0] = o[1] = o[2] = 0; o[3] = 0.5; o[4] = 0.8; o[5] = 0; }
const LG_FONT = "'Chakra Petch', 'Share Tech Mono', sans-serif";
// a sheet is split into quarters (sub-decals); f(g, x, y, s, which) draws one at (x, y) size s on both layers
function lgQuarters(gA, gH, T, fns) {
  const s = T / 2;
  fns.forEach((f, i) => { const x = (i & 1) * s, y = (i >> 1) * s; gA.save(); gH.save(); gA.beginPath(); gA.rect(x, y, s, s); gA.clip(); gH.beginPath(); gH.rect(x, y, s, s); gH.clip(); try { f(gA, gH, x, y, s); } catch (e) { } gA.restore(); gH.restore(); });
}
// the relief layer of a decal: rgb(height, rough, coverage); 'cover' paints where the decal exists
const lgCover = (gH, h, r) => 'rgb(' + Math.round(h * 255) + ',' + Math.round(r * 255) + ',255)';
function lgStitch(g, x, y, w, h, col, k) { g.save(); g.strokeStyle = col; g.lineWidth = Math.max(1, k * 0.012); g.setLineDash([k * 0.03, k * 0.022]); g.strokeRect(x, y, w, h); g.restore(); }
function lgDrawPatches(gA, gH, T) {
  lgQuarters(gA, gH, T, [
    // name tape: OPERATOR
    (a, h, x, y, s) => { const m = s * 0.06, w = s - m * 2, ht = s * 0.32, y0 = y + s * 0.34; a.fillStyle = '#23261f'; a.fillRect(x + m, y0, w, ht); h.fillStyle = lgCover(h, 0.6, 0.9); h.fillRect(x + m, y0, w, ht); lgStitch(a, x + m + s * 0.025, y0 + s * 0.025, w - s * 0.05, ht - s * 0.05, '#5d6152', s); a.fillStyle = '#b9bba8'; a.font = '700 ' + Math.round(s * 0.17) + 'px ' + LG_FONT; a.textAlign = 'center'; a.textBaseline = 'middle'; a.fillText('OPERATOR', x + s / 2, y0 + ht / 2 + s * 0.01); h.fillStyle = lgCover(h, 0.75, 0.9); h.font = a.font; h.textAlign = 'center'; h.textBaseline = 'middle'; h.fillText('OPERATOR', x + s / 2, y0 + ht / 2 + s * 0.01); },
    // QRT: quarantine response team, subdued chevrons
    (a, h, x, y, s) => { const m = s * 0.1; a.save(); a.beginPath(); a.rect(x + m, y + m * 1.6, s - m * 2, s - m * 3.2); a.clip(); a.fillStyle = '#2b2d27'; a.fillRect(x, y, s, s); a.fillStyle = '#6b6a52'; for (let i = -6; i < 8; i++) { a.beginPath(); const cx = x + i * s * 0.16; a.moveTo(cx, y + s); a.lineTo(cx + s * 0.08, y + s); a.lineTo(cx + s * 0.5, y); a.lineTo(cx + s * 0.42, y); a.closePath(); a.fill(); } a.restore(); a.fillStyle = '#23251f'; a.fillRect(x + s * 0.28, y + s * 0.38, s * 0.44, s * 0.24); a.fillStyle = '#c7c3a6'; a.font = '700 ' + Math.round(s * 0.16) + 'px ' + LG_FONT; a.textAlign = 'center'; a.textBaseline = 'middle'; a.fillText('QRT', x + s / 2, y + s / 2 + s * 0.01); h.fillStyle = lgCover(h, 0.6, 0.9); h.fillRect(x + m, y + m * 1.6, s - m * 2, s - m * 3.2); lgStitch(a, x + m + s * 0.02, y + m * 1.6 + s * 0.02, s - m * 2 - s * 0.04, s - m * 3.2 - s * 0.04, '#55574a', s); },
    // round unit patch: ZC with stars
    (a, h, x, y, s) => { const cx = x + s / 2, cy = y + s / 2, r = s * 0.42; a.fillStyle = '#262822'; a.beginPath(); a.arc(cx, cy, r, 0, TAU); a.fill(); a.strokeStyle = '#6f705c'; a.lineWidth = s * 0.03; a.beginPath(); a.arc(cx, cy, r * 0.86, 0, TAU); a.stroke(); a.fillStyle = '#c6c2a4'; a.font = '700 ' + Math.round(s * 0.26) + 'px ' + LG_FONT; a.textAlign = 'center'; a.textBaseline = 'middle'; a.fillText('ZC', cx, cy + s * 0.01); for (let i = 0; i < 5; i++) { const an = -Math.PI / 2 + (i - 2) * 0.32; lgStar(a, cx + Math.cos(an) * r * 0.66, cy + Math.sin(an) * r * 0.66 - s * 0.0, s * 0.035); } h.fillStyle = lgCover(h, 0.62, 0.9); h.beginPath(); h.arc(cx, cy, r, 0, TAU); h.fill(); },
    // ID tape: blood group and callsign
    (a, h, x, y, s) => { const m = s * 0.06, w = s - m * 2, ht = s * 0.26, y0 = y + s * 0.37; a.fillStyle = '#1f211c'; a.fillRect(x + m, y0, w, ht); h.fillStyle = lgCover(h, 0.6, 0.9); h.fillRect(x + m, y0, w, ht); a.fillStyle = '#a9ab98'; a.font = '600 ' + Math.round(s * 0.12) + 'px ' + LG_FONT; a.textAlign = 'center'; a.textBaseline = 'middle'; a.fillText('O POS · OP-01', x + s / 2, y0 + ht / 2 + s * 0.008); lgStitch(a, x + m + s * 0.02, y0 + s * 0.02, w - s * 0.04, ht - s * 0.04, '#55574a', s); }
  ]);
}
function lgStar(g, x, y, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i & 1 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
// emblems: a 3 x 2 sheet (attack, defense, engineer / medic, magic, the base legend); white on black, coverage = shape
function lgDrawEmblems(gA, gH, T) {
  const cw = T / 3, chh = T / 2;
  const both = (fn) => { for (const [g, c] of [[gA, '#ffffff'], [gH, lgCover(gH, 0.8, 0.5)]]) { g.fillStyle = c; g.strokeStyle = c; fn(g); } };
  for (let i = 0; i < 6; i++) {
    const x = (i % 3) * cw, y = Math.floor(i / 3) * chh, cx = x + cw / 2, cy = y + chh / 2, s = Math.min(cw, chh) * 0.4;
    gA.save(); gH.save(); gA.translate(cx, cy); gH.translate(cx, cy);
    both(g => {
      g.lineWidth = s * 0.16; g.lineJoin = 'round'; g.lineCap = 'round';
      if (i === 0) { g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.62, s * 0.55); g.lineTo(0, s * 0.18); g.lineTo(-s * 0.62, s * 0.55); g.closePath(); g.fill(); g.beginPath(); g.arc(0, 0, s * 1.02, 0, TAU); g.lineWidth = s * 0.08; g.stroke(); }
      else if (i === 1) { g.beginPath(); g.moveTo(0, -s); g.quadraticCurveTo(s * 0.8, -s * 0.85, s * 0.85, -s * 0.55); g.quadraticCurveTo(s * 0.8, s * 0.55, 0, s); g.quadraticCurveTo(-s * 0.8, s * 0.55, -s * 0.85, -s * 0.55); g.quadraticCurveTo(-s * 0.8, -s * 0.85, 0, -s); g.fill(); }
      else if (i === 2) { g.beginPath(); for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, r = k & 1 ? s * 0.72 : s * 0.95; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); }
      else if (i === 3) { const w = s * 0.36; g.fillRect(-w, -s * 0.95, w * 2, s * 1.9); g.fillRect(-s * 0.95, -w, s * 1.9, w * 2); }
      else if (i === 4) { g.beginPath(); for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + k * 4 * Math.PI / 7; g.lineTo(Math.cos(a) * s, Math.sin(a) * s); } g.closePath(); g.lineWidth = s * 0.12; g.stroke(); g.beginPath(); g.arc(0, 0, s * 0.22, 0, TAU); g.fill(); }
      else { g.beginPath(); g.moveTo(-s * 0.9, -s * 0.2); g.quadraticCurveTo(0, -s * 1.1, s * 0.9, -s * 0.2); g.lineTo(s * 0.7, s * 0.7); g.lineTo(0, s); g.lineTo(-s * 0.7, s * 0.7); g.closePath(); g.fill(); }
    });
    if (i === 5) { gA.fillStyle = '#000'; gA.fillRect(-s * 0.6, -s * 0.12, s * 1.2, s * 0.14); gH.fillStyle = lgCover(gH, 0.3, 0.5).replace(',255)', ',0)'); gH.fillRect(-s * 0.6, -s * 0.12, s * 1.2, s * 0.14); }
    gA.restore(); gH.restore();
  }
}
function lgDrawPosters(gA, gH, T) {
  lgQuarters(gA, gH, T, [
    // a spray tag with drips (original letters)
    (a, h, x, y, s) => { a.save(); a.translate(x + s / 2, y + s / 2); a.rotate(-0.12); a.font = '700 ' + Math.round(s * 0.34) + 'px ' + LG_FONT; a.textAlign = 'center'; a.textBaseline = 'middle'; a.lineWidth = s * 0.05; a.strokeStyle = '#120a14'; a.strokeText('ZC', 0, 0); a.fillStyle = '#e8358f'; a.fillText('ZC', 0, 0); a.fillStyle = '#e8358f'; for (let i = 0; i < 7; i++) a.fillRect(-s * 0.26 + i * s * 0.085, s * 0.08, s * 0.012, s * (0.08 + ((i * 37) % 11) / 40)); a.restore(); h.save(); h.translate(x + s / 2, y + s / 2); h.rotate(-0.12); h.font = a.font; h.textAlign = 'center'; h.textBaseline = 'middle'; h.lineWidth = s * 0.05; h.strokeStyle = h.fillStyle = lgCover(h, 0.55, 0.45); h.strokeText('ZC', 0, 0); h.fillText('ZC', 0, 0); for (let i = 0; i < 7; i++) h.fillRect(-s * 0.26 + i * s * 0.085, s * 0.08, s * 0.012, s * (0.08 + ((i * 37) % 11) / 40)); h.restore(); },
    // a quarantine notice, torn at a corner
    (a, h, x, y, s) => { const m = s * 0.08; a.fillStyle = '#d9d3bf'; a.beginPath(); a.moveTo(x + m, y + m); a.lineTo(x + s - m, y + m); a.lineTo(x + s - m, y + s - m * 2.4); a.lineTo(x + s - m * 2.2, y + s - m); a.lineTo(x + m, y + s - m); a.closePath(); a.fill(); h.fillStyle = lgCover(h, 0.52, 0.7); h.fill(new Path2D()); h.beginPath(); h.moveTo(x + m, y + m); h.lineTo(x + s - m, y + m); h.lineTo(x + s - m, y + s - m * 2.4); h.lineTo(x + s - m * 2.2, y + s - m); h.lineTo(x + m, y + s - m); h.closePath(); h.fill(); a.fillStyle = '#b3261e'; a.fillRect(x + m, y + m, s - m * 2, s * 0.17); a.fillStyle = '#f1ecdc'; a.font = '700 ' + Math.round(s * 0.1) + 'px ' + LG_FONT; a.textAlign = 'center'; a.textBaseline = 'middle'; a.fillText('QUARANTINE', x + s / 2, y + m + s * 0.085); a.fillStyle = '#2a2622'; a.font = '600 ' + Math.round(s * 0.068) + 'px ' + LG_FONT; ['STAY INDOORS', 'KEEP DOORS LOCKED', 'DO NOT APPROACH', 'THE INFECTED'].forEach((t, i) => a.fillText(t, x + s / 2, y + s * (0.42 + i * 0.12))); a.fillStyle = 'rgba(40,30,20,0.25)'; a.fillRect(x + m, y + s * 0.72, s - m * 2, s * 0.05); },
    // a stencilled arrow: EVAC
    (a, h, x, y, s) => { const draw = (g, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x + s * 0.12, y + s * 0.42); g.lineTo(x + s * 0.62, y + s * 0.42); g.lineTo(x + s * 0.62, y + s * 0.3); g.lineTo(x + s * 0.88, y + s * 0.5); g.lineTo(x + s * 0.62, y + s * 0.7); g.lineTo(x + s * 0.62, y + s * 0.58); g.lineTo(x + s * 0.12, y + s * 0.58); g.closePath(); g.fill(); g.font = '700 ' + Math.round(s * 0.13) + 'px ' + LG_FONT; g.textAlign = 'center'; g.fillText('EVAC', x + s * 0.42, y + s * 0.84); }; draw(a, '#e8e2cf'); draw(h, lgCover(h, 0.52, 0.6)); },
    // a missing-person flyer
    (a, h, x, y, s) => { const m = s * 0.12; a.fillStyle = '#ece6d4'; a.fillRect(x + m, y + m * 0.6, s - m * 2, s - m * 1.2); h.fillStyle = lgCover(h, 0.52, 0.7); h.fillRect(x + m, y + m * 0.6, s - m * 2, s - m * 1.2); a.fillStyle = '#1e1c1a'; a.font = '700 ' + Math.round(s * 0.11) + 'px ' + LG_FONT; a.textAlign = 'center'; a.textBaseline = 'middle'; a.fillText('MISSING', x + s / 2, y + m * 0.6 + s * 0.1); a.fillStyle = '#8e8a80'; a.fillRect(x + s * 0.3, y + s * 0.27, s * 0.4, s * 0.36); a.fillStyle = '#5c5850'; a.beginPath(); a.arc(x + s * 0.5, y + s * 0.4, s * 0.08, 0, TAU); a.fill(); a.fillRect(x + s * 0.38, y + s * 0.5, s * 0.24, s * 0.13); a.fillStyle = '#3a3632'; a.font = '600 ' + Math.round(s * 0.058) + 'px ' + LG_FONT; a.fillText('LAST SEEN: 9TH STREET', x + s / 2, y + s * 0.72); a.fillText('HAVE YOU SEEN HER?', x + s / 2, y + s * 0.8); }
  ]);
}
function lgDrawFaces(gA, gH, T) {
  lgQuarters(gA, gH, T, [
    // the Operator's eyes through the balaclava
    (a, h, x, y, s) => { const g = a.createLinearGradient(x, y + s * 0.3, x, y + s * 0.7); g.addColorStop(0, '#6b4a38'); g.addColorStop(0.5, '#a07a60'); g.addColorStop(1, '#6b4a38'); a.fillStyle = g; a.fillRect(x, y + s * 0.3, s, s * 0.4); for (const ex of [0.3, 0.7]) { a.fillStyle = '#d9d2c4'; a.beginPath(); a.ellipse(x + s * ex, y + s * 0.5, s * 0.11, s * 0.05, 0, 0, TAU); a.fill(); a.fillStyle = '#3a2a1c'; a.beginPath(); a.arc(x + s * ex + s * 0.01, y + s * 0.5, s * 0.042, 0, TAU); a.fill(); a.fillStyle = '#0a0806'; a.beginPath(); a.arc(x + s * ex + s * 0.01, y + s * 0.5, s * 0.02, 0, TAU); a.fill(); a.fillStyle = 'rgba(255,255,255,0.8)'; a.beginPath(); a.arc(x + s * ex - s * 0.01, y + s * 0.485, s * 0.008, 0, TAU); a.fill(); a.strokeStyle = '#3a271b'; a.lineWidth = s * 0.018; a.beginPath(); a.ellipse(x + s * ex, y + s * 0.5, s * 0.115, s * 0.055, 0, Math.PI * 1.05, Math.PI * 1.95); a.stroke(); } h.fillStyle = lgCover(h, 0.5, 0.45); h.fillRect(x, y + s * 0.3, s, s * 0.4); },
    // a dead face: sunken sockets with a faint glow, a slack mouth with teeth
    (a, h, x, y, s) => { a.fillStyle = '#b8b8b0'; a.fillRect(x, y, s, s); h.fillStyle = lgCover(h, 0.5, 0.5); h.fillRect(x, y, s, s); for (const ex of [0.32, 0.68]) { const g = a.createRadialGradient(x + s * ex, y + s * 0.38, 0, x + s * ex, y + s * 0.38, s * 0.14); g.addColorStop(0, '#fff4c0'); g.addColorStop(0.18, '#3a2a24'); g.addColorStop(1, 'rgba(60,40,40,0)'); a.fillStyle = g; a.beginPath(); a.arc(x + s * ex, y + s * 0.38, s * 0.14, 0, TAU); a.fill(); } a.fillStyle = '#2a1414'; a.beginPath(); a.ellipse(x + s * 0.5, y + s * 0.74, s * 0.16, s * 0.08, 0, 0, TAU); a.fill(); a.fillStyle = '#cfc6a8'; for (let i = 0; i < 6; i++) a.fillRect(x + s * (0.38 + i * 0.042), y + s * 0.69, s * 0.03, s * 0.04); a.strokeStyle = '#5a2a2a'; a.lineWidth = s * 0.012; a.beginPath(); a.moveTo(x + s * 0.2, y + s * 0.6); a.lineTo(x + s * 0.3, y + s * 0.66); a.stroke(); },
    // velcro loop panel
    (a, h, x, y, s) => { const r = lgRng(101); a.fillStyle = '#2c2e29'; a.fillRect(x, y, s, s); for (let i = 0; i < s * s / 30; i++) { const px = x + r() * s, py = y + r() * s, v = 30 + r() * 40 | 0; a.fillStyle = 'rgb(' + v + ',' + v + ',' + (v - 3) + ')'; a.fillRect(px, py, 1.2, 1.2); } h.fillStyle = lgCover(h, 0.55, 1); h.fillRect(x, y, s, s); },
    // tech etching: circuit lines (they glow on the mask in the class colour); coverage only where the lines are
    (a, h, x, y, s) => { a.fillStyle = '#000'; a.fillRect(x, y, s, s); h.fillStyle = 'rgb(128,80,0)'; h.fillRect(x, y, s, s); const r = lgRng(103); const lw = Math.max(1.5, s * 0.016); for (const [g, c] of [[a, '#fff'], [h, lgCover(h, 0.6, 0.3)]]) { const rr = lgRng(103); g.strokeStyle = c; g.fillStyle = c; g.lineWidth = lw; g.lineJoin = 'round'; for (let i = 0; i < 12; i++) { let px = x + s * 0.1 + rr() * s * 0.8, py = y + s * 0.1 + rr() * s * 0.8; g.beginPath(); g.moveTo(px, py); for (let k = 0; k < 4; k++) { if (rr() < 0.5) px = clamp(px + (rr() - 0.5) * s * 0.45, x + s * 0.06, x + s * 0.94); else py = clamp(py + (rr() - 0.5) * s * 0.45, y + s * 0.06, y + s * 0.94); g.lineTo(px, py); } g.stroke(); g.beginPath(); g.arc(px, py, s * 0.02, 0, TAU); g.fill(); } } }
  ]);
}
// painting the atlas: one tile per step, so it can be spread across frames
function lgAtlasNew(T) {
  const W2 = T * LT_COLS, H2 = T * LT_ROWS, mk = () => { const c = document.createElement('canvas'); c.width = W2; c.height = H2; return c; };
  const A = mk(), Hc = mk();
  return { T: T, A: A, H: Hc, gA: A.getContext('2d'), gH: Hc.getContext('2d'), next: 0, done: false, ms: 0, dA: null, dH: null, lo: null, ver: 0 };
}
function lgAtlasStep(at) {
  if (at.done) return true;
  const i = at.next++, T = at.T, t0 = performance.now(), R = lgRng(1000 + i);
  let tile; try { tile = LG_TILES[i](T, R); } catch (e) { tile = { px: lgFlatPx }; }
  const ia = at.gA.createImageData(T, T), ih = at.gH.createImageData(T, T), a = ia.data, h = ih.data, o = [0, 0, 0, 0, 0, 0];
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    tile.px(x / T, y / T, x, y, o);
    const k = (y * T + x) * 4;
    a[k] = clamp(o[0], 0, 1) * 255; a[k + 1] = clamp(o[1], 0, 1) * 255; a[k + 2] = clamp(o[2], 0, 1) * 255; a[k + 3] = 255;
    h[k] = clamp(o[3], 0, 1) * 255; h[k + 1] = clamp(o[4], 0, 1) * 255; h[k + 2] = clamp(o[5], 0, 1) * 255; h[k + 3] = 255;
  }
  const ox = (i % LT_COLS) * T, oy = Math.floor(i / LT_COLS) * T;
  at.gA.putImageData(ia, ox, oy); at.gH.putImageData(ih, ox, oy);
  if (tile.post) { for (const g of [at.gA, at.gH]) { g.save(); g.beginPath(); g.rect(ox, oy, T, T); g.clip(); g.translate(ox, oy); } try { tile.post(at.gA, at.gH, T, R); } catch (e) { } at.gA.restore(); at.gH.restore(); }
  at.ms += performance.now() - t0;
  if (at.next >= LG_TILES.length) {
    at.done = true;
    // the sampling copy for the painter, and a blurred copy (an eighth of the size) for distant surfaces on the GPU
    try { at.dA = at.gA.getImageData(0, 0, at.A.width, at.A.height).data; at.dH = at.gH.getImageData(0, 0, at.H.width, at.H.height).data; } catch (e) { }
    const lo = document.createElement('canvas'), q = Math.max(4, T >> 3); lo.width = q * LT_COLS; lo.height = q * LT_ROWS;
    const g = lo.getContext('2d'); g.imageSmoothingEnabled = true; if ('imageSmoothingQuality' in g) g.imageSmoothingQuality = 'high'; g.drawImage(at.A, 0, 0, lo.width, lo.height); at.lo = lo;
    at.ver = Date.now();
  }
  return at.done;
}
// the atlas at a size; resolves when painted (a few tiles a frame)
function lgAtlasGet(T) {
  if (LG.atlas && LG.atlas.T >= T && LG.atlas.done) return Promise.resolve(LG.atlas);
  if (LG.atlasBusy && LG.atlasBusy.T === T) return LG.atlasBusy.p;
  const at = lgAtlasNew(T);
  const p = new Promise(res => {
    const step = () => {
      const t0 = performance.now();
      try { while (!lgAtlasStep(at) && performance.now() - t0 < 10) { } } catch (e) { coreHurt('LEGEND', e); at.done = true; }
      if (at.done) { LG.atlas = at; LG.atlasBusy = null; LG.atlasT = T; res(at); } else setTimeout(step, 0);
    };
    step();
  });
  LG.atlasBusy = { T: T, p: p };
  return p;
}
function lgAtlasSample(at, tile, u, v, o) {
  if (!at || !at.dA) { o[0] = o[1] = o[2] = 1; o[3] = 0.5; o[4] = 0.8; o[5] = 1; return o; }
  const T = at.T, fx = ((u % 1) + 1) % 1, fy = ((v % 1) + 1) % 1, x = (tile % LT_COLS) * T + Math.min(T - 1, (fx * T) | 0), y = Math.floor(tile / LT_COLS) * T + Math.min(T - 1, (fy * T) | 0), k = (y * at.A.width + x) * 4;
  o[0] = at.dA[k] / 255; o[1] = at.dA[k + 1] / 255; o[2] = at.dA[k + 2] / 255; o[3] = at.dH[k] / 255; o[4] = at.dH[k + 1] / 255; o[5] = at.dH[k + 2] / 255;
  return o;
}

/* ---------- the skeleton ---------- */
// x forward, y left, z up, metres. Limbs hang down (-z) from their joint at rest; the spine and head go up (+z).
// [name, parent, offset from the parent's joint]
const LG_SKEL = [
  ['root', null, 0, 0, 0], ['pelvis', 'root', 0, 0, 0.98], ['spine', 'pelvis', 0, 0, 0.1], ['chest', 'spine', 0, 0, 0.2], ['neck', 'chest', -0.01, 0, 0.25], ['head', 'neck', 0.015, 0, 0.09],
  ['clavL', 'chest', -0.005, 0.035, 0.2], ['armL', 'clavL', -0.012, 0.155, -0.01], ['foreL', 'armL', 0, 0, -0.285], ['handL', 'foreL', 0, 0, -0.255],
  ['idxL', 'handL', 0.026, 0.004, -0.092], ['idx2L', 'idxL', 0, 0, -0.045], ['finL', 'handL', -0.014, 0.004, -0.09], ['fin2L', 'finL', 0, 0, -0.043], ['thbL', 'handL', 0.026, 0.014, -0.022], ['thb2L', 'thbL', 0, 0, -0.042],
  ['clavR', 'chest', -0.005, -0.035, 0.2], ['armR', 'clavR', -0.012, -0.155, -0.01], ['foreR', 'armR', 0, 0, -0.285], ['handR', 'foreR', 0, 0, -0.255],
  ['idxR', 'handR', 0.026, -0.004, -0.092], ['idx2R', 'idxR', 0, 0, -0.045], ['finR', 'handR', -0.014, -0.004, -0.09], ['fin2R', 'finR', 0, 0, -0.043], ['thbR', 'handR', 0.026, -0.014, -0.022], ['thb2R', 'thbR', 0, 0, -0.042],
  ['thighL', 'pelvis', 0, 0.095, -0.045], ['shinL', 'thighL', 0, 0, -0.43], ['footL', 'shinL', 0, 0, -0.42], ['toeL', 'footL', 0.135, 0, -0.055],
  ['thighR', 'pelvis', 0, -0.095, -0.045], ['shinR', 'thighR', 0, 0, -0.43], ['footR', 'shinR', 0, 0, -0.42], ['toeR', 'footR', 0.135, 0, -0.055],
  // props (placed in the root's space every frame) and the mask's seven plates (on the head)
  ['pistol', 'root', 0, 0, 0], ['slide', 'pistol', 0, 0, 0], ['mag', 'pistol', 0, 0, 0], ['knife', 'root', 0, 0, 0], ['carbine', 'root', 0, 0, 0], ['cmag', 'carbine', 0, 0, 0],
  ['mBrow', 'head', 0, 0, 0], ['mCheekL', 'head', 0, 0, 0], ['mCheekR', 'head', 0, 0, 0], ['mJawL', 'head', 0, 0, 0], ['mJawR', 'head', 0, 0, 0], ['mChin', 'head', 0, 0, 0], ['mVisor', 'head', 0, 0, 0]
];
const LGB = {}; LG_SKEL.forEach((b, i) => { LGB[b[0]] = i; });
const LG_NB = LG_SKEL.length;
const LG_PAR = new Int16Array(LG_NB), LG_OFF = new Float32Array(LG_NB * 3);
LG_SKEL.forEach((b, i) => { LG_PAR[i] = b[1] == null ? -1 : LGB[b[1]]; LG_OFF[i * 3] = b[2]; LG_OFF[i * 3 + 1] = b[3]; LG_OFF[i * 3 + 2] = b[4]; });
const LG_PROPS = ['pistol', 'knife', 'carbine'].map(n => LGB[n]);
const LG_MIRROR = new Int16Array(LG_NB); LG_SKEL.forEach((b, i) => { const n = b[0]; const m = /L$/.test(n) ? n.replace(/L$/, 'R') : /R$/.test(n) ? n.replace(/R$/, 'L') : n; LG_MIRROR[i] = LGB[m] != null ? LGB[m] : i; });

/* ---------- poses ---------- */
// A pose is joint angles (twist, pitch, roll per bone), joint offsets, reach targets (IK), props and the mask.
function lgPose() {
  return { r: new Float32Array(LG_NB * 3), t: new Float32Array(LG_NB * 3), ik: {}, root: [0, 0, 0, 0], grip: { L: 'relax', R: 'relax' },
    pistol: { at: 'holster', M: null, slide: 0, mag: 'in', magM: null }, knife: { at: 'sheath', M: null }, carbine: { at: 'back', M: null, mag: 'in' },
    mask: 0, glow: 0, ev: null };
}
function lgPoseReset(P) { P.r.fill(0); P.t.fill(0); P.ik = {}; P.root[0] = P.root[1] = P.root[2] = P.root[3] = 0; P.grip.L = P.grip.R = 'relax'; P.pistol.at = 'holster'; P.pistol.M = null; P.pistol.slide = 0; P.pistol.mag = 'in'; P.pistol.magM = null; P.knife.at = 'sheath'; P.knife.M = null; P.carbine.at = 'back'; P.carbine.M = null; P.carbine.mag = 'in'; P.carbine.rock = 0; P.carbine.piv = null; P.mask = 0; P.glow = 0; return P; }
// set a bone's angles (radians); mirrored: the same pose on the other side
function lgJ(P, name, rx, ry, rz) { const i = LGB[name] * 3; P.r[i] = rx || 0; P.r[i + 1] = ry || 0; P.r[i + 2] = rz || 0; }
function lgJadd(P, name, rx, ry, rz) { const i = LGB[name] * 3; P.r[i] += rx || 0; P.r[i + 1] += ry || 0; P.r[i + 2] += rz || 0; }
function lgJm(P, side, base, rx, ry, rz) { const s = side === 'L' ? 1 : -1; lgJ(P, base + side, (rx || 0) * s, ry || 0, (rz || 0) * s); }
// finger grips: [idx, idx2, fin, fin2, thumb twist, thumb pitch, thumb roll, thumb2] for the right hand (left mirrors)
const LG_GRIPS = {
  relax: [0.25, 0.3, 0.45, 0.45, 0.2, -0.2, -0.35, 0.2], fist: [1.5, 1.4, 1.6, 1.5, 0.5, -0.5, -0.9, 0.7], open: [0.05, 0.05, 0.08, 0.08, 0, -0.35, -0.1, 0],
  pistol: [0.12, 0.08, 1.45, 1.35, 0.4, -0.15, -0.95, 0.35], trigger: [0.85, 0.6, 1.45, 1.35, 0.4, -0.15, -0.95, 0.35], support: [1.1, 0.9, 1.15, 1.0, 0.1, -0.3, -0.4, 0.1],
  knife: [1.55, 1.45, 1.6, 1.5, 0.6, -0.4, -1.05, 0.8], point: [0.05, 0.05, 1.5, 1.4, 0.4, -0.3, -0.8, 0.4], cup: [0.55, 0.5, 0.6, 0.55, 0.3, -0.3, -0.5, 0.3], claw: [0.7, 0.9, 0.8, 1.0, 0.2, -0.4, -0.3, 0.4]
};

/* ---------- solving a pose: local rotations and offsets, then world matrices ---------- */
const LG_TMP = { m: lgM4(), m2: lgM4(), m3: lgM4(), q1: [0, 0, 0, 1], q2: [0, 0, 0, 1], q3: [0, 0, 0, 1] };
// L = { R: 9 per bone (local rotation), T: 3 per bone (local offset) }
function lgLocalNew() { return { R: new Float32Array(LG_NB * 9), T: new Float32Array(LG_NB * 3) }; }
function lgWorldNew() { return new Float32Array(LG_NB * 16); }
function lgR9(o, i, rx, ry, rz) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  o[i] = cy * cz; o[i + 3] = -cy * sz; o[i + 6] = sy; o[i + 1] = cx * sz + sx * sy * cz; o[i + 4] = cx * cz - sx * sy * sz; o[i + 7] = -sx * cy; o[i + 2] = sx * sz - cx * sy * cz; o[i + 5] = sx * cz + cx * sy * sz; o[i + 8] = cx * cy;
}
// world of bone i from its parent's world and its local rotation/offset
function lgWorldOne(W, L, i, rootM) {
  const p = LG_PAR[i], o = i * 16, R = L.R, r = i * 9, tx = LG_OFF[i * 3] + L.T[i * 3], ty = LG_OFF[i * 3 + 1] + L.T[i * 3 + 1], tz = LG_OFF[i * 3 + 2] + L.T[i * 3 + 2];
  const m = LG_TMP.m; m[0] = R[r]; m[1] = R[r + 1]; m[2] = R[r + 2]; m[3] = 0; m[4] = R[r + 3]; m[5] = R[r + 4]; m[6] = R[r + 5]; m[7] = 0; m[8] = R[r + 6]; m[9] = R[r + 7]; m[10] = R[r + 8]; m[11] = 0; m[12] = tx; m[13] = ty; m[14] = tz; m[15] = 1;
  const pw = p < 0 ? rootM : W.subarray(p * 16, p * 16 + 16);
  lgMul(W.subarray(o, o + 16), pw, m);
}
function lgWorldAll(W, L, rootM) { for (let i = 0; i < LG_NB; i++) lgWorldOne(W, L, i, rootM); return W; }
function lgRootM(P, M) { M = M || lgM4(); lgRot(M, 0, 0, P.root[3]); M[12] = P.root[0]; M[13] = P.root[1]; M[14] = P.root[2]; return M; }
// a reach target: a point (and a rotation) given in the space of a bone, the root or the world
function lgIKresolve(W, tg, rootM, out) {
  const sp = tg.sp == null ? 'root' : tg.sp, M = sp === 'world' ? null : sp === 'root' ? rootM : W.subarray(LGB[sp] * 16, LGB[sp] * 16 + 16);
  const p = tg.p; if (M) lgPt(M, p[0], p[1], p[2], out.p); else { out.p[0] = p[0]; out.p[1] = p[1]; out.p[2] = p[2]; }
  if (tg.M) { if (M) lgMul(out.R, M, tg.M); else out.R.set(tg.M); out.hasR = true; } else out.hasR = false;
  if (tg.pole) { if (M) lgDir(M, tg.pole[0], tg.pole[1], tg.pole[2], out.pole); else { out.pole[0] = tg.pole[0]; out.pole[1] = tg.pole[1]; out.pole[2] = tg.pole[2]; } }
  return out;
}
const LG_IKO = { p: [0, 0, 0], R: lgM4(), pole: [1, 0, 0], hasR: false };
// two-bone reach: upper a, lower b, end c; bend +1 for knees (the joint points forward), -1 for elbows (back)
function lgIK2(W, L, ia, ib, ic, T, bend, rootM) {
  const pa = LG_PAR[ia], PW = pa < 0 ? rootM : W.subarray(pa * 16, pa * 16 + 16);
  const S = lgPt(PW, LG_OFF[ia * 3] + L.T[ia * 3], LG_OFF[ia * 3 + 1] + L.T[ia * 3 + 1], LG_OFF[ia * 3 + 2] + L.T[ia * 3 + 2]);
  const a = Math.hypot(LG_OFF[ib * 3], LG_OFF[ib * 3 + 1], LG_OFF[ib * 3 + 2]), b = Math.hypot(LG_OFF[ic * 3], LG_OFF[ic * 3 + 1], LG_OFF[ic * 3 + 2]);
  let dx = T.p[0] - S[0], dy = T.p[1] - S[1], dz = T.p[2] - S[2], d = Math.hypot(dx, dy, dz) || 1e-6; dx /= d; dy /= d; dz /= d;
  const dd = clamp(d, Math.abs(a - b) + 1e-4, a + b - 1e-4);
  // the pole, made square to the reach
  let px = T.pole[0], py = T.pole[1], pz = T.pole[2]; const pd = px * dx + py * dy + pz * dz; px -= dx * pd; py -= dy * pd; pz -= dz * pd;
  let pl = Math.hypot(px, py, pz); if (pl < 1e-5) { px = -dy; py = dx; pz = 0; pl = Math.hypot(px, py, pz) || 1; } px /= pl; py /= pl; pz /= pl;
  const ca = clamp((a * a + dd * dd - b * b) / (2 * a * dd), -1, 1), sa = Math.sqrt(1 - ca * ca);
  const ex = S[0] + dx * a * ca + px * a * sa, ey = S[1] + dy * a * ca + py * a * sa, ez = S[2] + dz * a * ca + pz * a * sa;
  const tx = S[0] + dx * dd, ty = S[1] + dy * dd, tz = S[2] + dz * dd;
  const frame = (ux, uy, uz, out) => {   // bone points along u (its -z), its x toward the pole (times bend)
    let l = Math.hypot(ux, uy, uz) || 1; ux /= l; uy /= l; uz /= l;
    let xx = px - ux * (px * ux + py * uy + pz * uz), xy = py - uy * (px * ux + py * uy + pz * uz), xz = pz - uz * (px * ux + py * uy + pz * uz); l = Math.hypot(xx, xy, xz) || 1; xx = xx / l * bend; xy = xy / l * bend; xz = xz / l * bend;
    const zx = -ux, zy = -uy, zz = -uz, yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    out[0] = xx; out[1] = xy; out[2] = xz; out[3] = yx; out[4] = yy; out[5] = yz; out[6] = zx; out[7] = zy; out[8] = zz;   // columns
    return out;
  };
  const Ra = frame(ex - S[0], ey - S[1], ez - S[2], new Float32Array(9)), Rb = frame(tx - ex, ty - ey, tz - ez, new Float32Array(9));
  // local = parentWorld^T * world (rotation parts)
  const loc = (PW3, Rw, i) => { const o = L.R, k = i * 9; for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[k + c * 3 + r] = PW3[r * 4] * Rw[c * 3] + PW3[r * 4 + 1] * Rw[c * 3 + 1] + PW3[r * 4 + 2] * Rw[c * 3 + 2]; };
  loc(PW, Ra, ia); lgWorldOne(W, L, ia, rootM);
  loc(W.subarray(ia * 16, ia * 16 + 16), Rb, ib); lgWorldOne(W, L, ib, rootM);
  if (T.hasR) { const R = T.R, R9 = [R[0], R[1], R[2], R[4], R[5], R[6], R[8], R[9], R[10]]; loc(W.subarray(ib * 16, ib * 16 + 16), R9, ic); }
  return d - dd;   // how far the reach fell short (0 when it got there)
}
// a hand that cannot quite reach brings its shoulder forward (the collarbone swings toward the target, up to about
// 35 degrees), the way a real arm reaches for a handguard or a grip, instead of stopping short in the air
function lgReach(W, L, ia, ib, ic, T, rootM) {
  const ci = LG_PAR[ia]; if (ci < 0) return; const pp = LG_PAR[ci], PP = pp < 0 ? rootM : W.subarray(pp * 16, pp * 16 + 16);
  const reach = Math.hypot(LG_OFF[ib * 3], LG_OFF[ib * 3 + 1], LG_OFF[ib * 3 + 2]) + Math.hypot(LG_OFF[ic * 3], LG_OFF[ic * 3 + 1], LG_OFF[ic * 3 + 2]) - 0.003;
  let used = 0;
  for (let it = 0; it < 4 && used < 0.62; it++) {
    const CW = W.subarray(ci * 16, ci * 16 + 16), S = lgPt(CW, LG_OFF[ia * 3] + L.T[ia * 3], LG_OFF[ia * 3 + 1] + L.T[ia * 3 + 1], LG_OFF[ia * 3 + 2] + L.T[ia * 3 + 2]);
    const d = Math.hypot(T.p[0] - S[0], T.p[1] - S[1], T.p[2] - S[2]); if (d <= reach) return;
    const vx = S[0] - CW[12], vy = S[1] - CW[13], vz = S[2] - CW[14], wx = T.p[0] - CW[12], wy = T.p[1] - CW[13], wz = T.p[2] - CW[14], lv = Math.hypot(vx, vy, vz) || 1;
    let ax = vy * wz - vz * wy, ay = vz * wx - vx * wz, az = vx * wy - vy * wx; const al = Math.hypot(ax, ay, az); if (al < 1e-6) return; ax /= al; ay /= al; az /= al;
    const phi = Math.min(0.62 - used, (d - reach) / lv * 1.15); used += phi;
    const cs = Math.cos(phi), sn = Math.sin(phi), t1 = 1 - cs, n = [0, 0, 0];
    const k = ci * 9;
    for (let c = 0; c < 3; c++) {
      const x = CW[c * 4], y = CW[c * 4 + 1], z = CW[c * 4 + 2], dt = ax * x + ay * y + az * z;   // Rodrigues: rotate this world axis about (ax, ay, az)
      n[0] = x * cs + (ay * z - az * y) * sn + ax * dt * t1; n[1] = y * cs + (az * x - ax * z) * sn + ay * dt * t1; n[2] = z * cs + (ax * y - ay * x) * sn + az * dt * t1;
      for (let r = 0; r < 3; r++) L.R[k + c * 3 + r] = PP[r * 4] * n[0] + PP[r * 4 + 1] * n[1] + PP[r * 4 + 2] * n[2];
    }
    lgWorldOne(W, L, ci, rootM);
  }
}
const LG_CHAINS = { handL: ['armL', 'foreL', 'handL', -1], handR: ['armR', 'foreR', 'handR', -1], footL: ['thighL', 'shinL', 'footL', 1], footR: ['thighR', 'shinR', 'footR', 1] };
const LG_CHAIN_AT = {}; for (const k in LG_CHAINS) LG_CHAIN_AT[LGB[LG_CHAINS[k][0]]] = k;
// the props' sockets and the hands' grips on them, set by the models (legmodel.js)
const LG_SOCK = { holster: null, sheath: null, back: null, gripR: null, gripL: null, kgrip: null, cgripR: null, cgripL: null, magOut: null, magHand: null, muzP: [0.19, 0, 0], muzC: [0.82, 0, 0.02], magHand: null, cmagHand: null };
// solve: pose -> local rotations/offsets (L) and world matrices (W)
function lgSolve(P, L, W, rootM) {
  rootM = rootM || lgRootM(P, LG_TMP.m3);
  const R = L.R, Tt = L.T;
  for (let i = 0; i < LG_NB; i++) { lgR9(R, i * 9, P.r[i * 3], P.r[i * 3 + 1], P.r[i * 3 + 2]); Tt[i * 3] = P.t[i * 3]; Tt[i * 3 + 1] = P.t[i * 3 + 1]; Tt[i * 3 + 2] = P.t[i * 3 + 2]; }
  lgGripApplyL(P, L);
  // props: the pistol (and the carbine) in their sockets, or aimed in the chest's space
  for (let i = 0; i < LG_NB; i++) {
    const ch = LG_CHAIN_AT[i];
    if (ch && P.ik[ch]) {
      const c = LG_CHAINS[ch], ia = LGB[c[0]], ib = LGB[c[1]], ic = LGB[c[2]];
      if (ch === 'handR' || ch === 'handL') lgPropsEarly(P, W, rootM);
      const tgt = lgIKresolve(W, lgIKtarget(P, ch, W, rootM), rootM, LG_IKO);
      if (!tgt.pole || P.ik[ch].pole == null) { const dp = ch[0] === 'f' ? [1, 0, 0.05] : [-0.3, ch === 'handL' ? 0.6 : -0.6, -0.75]; lgDir(rootM, dp[0], dp[1], dp[2], tgt.pole); }
      if (ch === 'handR' || ch === 'handL') lgReach(W, L, ia, ib, ic, tgt, rootM);
      lgIK2(W, L, ia, ib, ic, tgt, c[3], rootM);
      lgWorldOne(W, L, ic, rootM);
      i = ic; continue;
    }
    lgWorldOne(W, L, i, rootM);
  }
  lgPropsLate(P, L, W, rootM);
  lgMaskApply(P, L, W, rootM);
  return W;
}
function lgGripApplyL(P, L) {
  for (const side of ['L', 'R']) {
    const v = LG_GRIPS[P.grip[side]] || LG_GRIPS.relax, s = side === 'L' ? -1 : 1;
    const set = (n, rx, ry, rz) => { const i = LGB[n + side]; lgR9(L.R, i * 9, P.r[i * 3] + rx, P.r[i * 3 + 1] + ry, P.r[i * 3 + 2] + rz); };
    set('idx', v[0] * s, 0, 0); set('idx2', v[1] * s, 0, 0); set('fin', v[2] * s, 0, 0); set('fin2', v[3] * s, 0, 0); set('thb', v[6] * s, v[5], v[4] * s); set('thb2', v[7] * s, 0, 0);
  }
}
// where a hand should go: a target the clip gave, or the grip on a prop the clip is aiming
function lgIKtarget(P, ch, W, rootM) {
  const ik = P.ik[ch];
  if (ik.on) {
    const pi = LGB[ik.on], PM = W.subarray(pi * 16, pi * 16 + 16), S = ik.on === 'pistol' || ik.on === 'carbine' ? lgSockFor(ik.on, ch === 'handR' ? 'gripR' : 'gripL') : LG_SOCK.kgrip;   // (each gun its own grips: leggun.js)
    const M = lgMul(lgM4(), PM, S || lgM4());
    return { sp: 'world', p: [M[12], M[13], M[14]], M: M, pole: ik.pole ? lgDir(rootM, ik.pole[0], ik.pole[1], ik.pole[2]) : null };
  }
  return { sp: ik.sp || 'root', p: ik.p, M: ik.M || null, pole: ik.pole || null };
}
// props placed before the arms reach for them (aimed guns), and after (guns that ride in a hand or a socket)
function lgPropSet(L, W, i, M, rootM) {   // world matrix M for prop i: local (root space) = root^-1 * M
  const inv = lgInv(LG_TMP.m2, rootM), loc = lgMul(LG_TMP.m, inv, M), k = i * 9;
  L.R[k] = loc[0]; L.R[k + 1] = loc[1]; L.R[k + 2] = loc[2]; L.R[k + 3] = loc[4]; L.R[k + 4] = loc[5]; L.R[k + 5] = loc[6]; L.R[k + 6] = loc[8]; L.R[k + 7] = loc[9]; L.R[k + 8] = loc[10];
  L.T[i * 3] = loc[12]; L.T[i * 3 + 1] = loc[13]; L.T[i * 3 + 2] = loc[14];
  W.set(M, i * 16);
}
function lgPropsEarly(P, W, rootM) {
  for (const [nm, st] of [['pistol', P.pistol], ['carbine', P.carbine], ['knife', P.knife]]) {
    if (st.at !== 'aim' || !st.M) continue;
    const i = LGB[nm], sp = st.sp || 'chest', B = sp === 'root' ? rootM : W.subarray(LGB[sp] * 16, LGB[sp] * 16 + 16);
    lgMul(W.subarray(i * 16, i * 16 + 16), B, st.M);
  }
}
const LG_HIDE = (() => { const m = lgM4(); m[0] = m[5] = m[10] = 0.0001; m[14] = -50; return m; })();
function lgPropsLate(P, L, W, rootM) {
  const bw = n => W.subarray(LGB[n] * 16, LGB[n] * 16 + 16), tmp = lgM4();
  // pistol
  const aimed = (st) => { const sp = st.sp || 'chest', B = sp === 'root' ? rootM : bw(sp); return lgMul(lgM4(), B, st.M); };
  { const st = P.pistol, i = LGB.pistol; let M = null;
    if (st.at === 'aim' && st.M) M = aimed(st);
    else if (st.at === 'handR' || st.at === 'handL') M = lgMul(tmp, bw(st.at), lgInv(lgM4(), lgSockFor('pistol', st.at === 'handR' ? 'gripR' : 'gripL')));
    else if (st.at === 'holster' && LG_SOCK.holster) M = lgMul(tmp, bw('pelvis'), LG_SOCK.holster);
    else if (st.at === 'free' && st.W) M = st.W;
    lgPropSet(L, W, i, M || LG_HIDE, rootM);
    // slide travel (recoil) and the magazine
    const si = LGB.slide; L.R.fill(0, si * 9, si * 9 + 9); L.R[si * 9] = L.R[si * 9 + 4] = L.R[si * 9 + 8] = 1; L.T[si * 3] = -0.032 * clamp(st.slide, 0, 1); L.T[si * 3 + 1] = 0; L.T[si * 3 + 2] = 0; lgWorldOne(W, L, si, rootM);
    const mi = LGB.mag; L.R.fill(0, mi * 9, mi * 9 + 9); L.R[mi * 9] = L.R[mi * 9 + 4] = L.R[mi * 9 + 8] = 1; L.T[mi * 3] = L.T[mi * 3 + 1] = L.T[mi * 3 + 2] = 0;
    if (typeof st.mag === 'number') L.T[mi * 3 + 2] = -0.09 * st.mag;
    lgWorldOne(W, L, mi, rootM);
    lgMagState(st.mag, W, mi, 'handL', lgSockFor('pistol', 'magHand'));
    if (st.magM) { W.set(st.magM, mi * 16); }
  }
  // knife
  { const st = P.knife, i = LGB.knife; let M = null;
    if (st.at === 'aim' && st.M) M = aimed(st);
    else if (st.at === 'handL' || st.at === 'handR') M = lgMul(tmp, bw(st.at), LG_SOCK.kgrip ? lgInv(lgM4(), LG_SOCK.kgrip) : lgM4());
    else if (st.at === 'sheath' && LG_SOCK.sheath) M = lgMul(tmp, bw('chest'), LG_SOCK.sheath);
    lgPropSet(L, W, i, M || LG_HIDE, rootM); }
  // carbine
  { const st = P.carbine, i = LGB.carbine; let M = null;
    if (st.at === 'aim' && st.M) M = aimed(st);
    else if (st.at === 'handR') M = lgMul(tmp, bw('handR'), lgInv(lgM4(), lgSockFor('carbine', 'gripR') || lgM4()));
    else if (st.at === 'back' && LG_SOCK.back) M = lgMul(tmp, bw('chest'), LG_SOCK.back);
    lgPropSet(L, W, i, M || LG_HIDE, rootM);
    const ci = LGB.cmag; L.R.fill(0, ci * 9, ci * 9 + 9); L.R[ci * 9] = L.R[ci * 9 + 4] = L.R[ci * 9 + 8] = 1; L.T[ci * 3] = L.T[ci * 3 + 1] = 0; L.T[ci * 3 + 2] = typeof st.mag === 'number' ? -0.12 * st.mag : 0;
    // 1.9.993: a magazine that rocks in (the AK's hook and rock, the PP-19's hook and rotate): a pitch about its front hook
    if (st.rock) { const q = ci * 9, px = st.piv ? st.piv[0] : 0.1, pz = st.piv ? st.piv[1] : -0.045; lgR9(L.R, q, 0, st.rock, 0); const R = L.R; L.T[ci * 3] += px - (R[q] * px + R[q + 6] * pz); L.T[ci * 3 + 2] += pz - (R[q + 2] * px + R[q + 8] * pz); }
    lgWorldOne(W, L, ci, rootM);
    lgMagState(st.mag, W, ci, 'handL', lgSockFor('carbine', 'magHand')); }
}
// a magazine that is not in the gun: falling (with a tumble, stopping on the ground), in the support hand, or gone
function lgMagState(m, W, i, hand, sock) {
  if (m == null || m === 'in' || typeof m === 'number') return;
  const o = i * 16;
  if (m === 'out') { W.set(LG_HIDE, o); return; }
  if (m === 'hand') { const h = W.subarray(LGB[hand] * 16, LGB[hand] * 16 + 16); lgMul(W.subarray(o, o + 16), h, sock || lgM4()); return; }
  if (m.drop != null) {
    const tt = m.drop, z0 = W[o + 14], fall = Math.min(4.9 * tt * tt, Math.max(0, z0 - 0.02)), M = W.slice(o, o + 16), R = lgRot(lgM4(), tt * 5, tt * 3, 0);
    const out = lgMul(lgM4(), M, R); out[12] = M[12] + tt * 0.08; out[13] = M[13]; out[14] = z0 - fall; W.set(out, o);
  }
}
// the mask: each plate moves from where it is stowed (folded back along the helmet) to its place over the face,
// one after another, with a little overshoot as it locks (the click)
const LG_MASK = [];   // filled by the model: { b: bone, piv: pivot (head space), r0: stowed rotation, d0: stowed offset, a: start, e: end }
function lgMaskApply(P, L, W, rootM) {
  const m = clamp(P.mask, 0, 1);
  for (const pl of LG_MASK) {
    let k = clamp((m - pl.a) / (pl.e - pl.a), 0, 1);
    // ease out with a small overshoot (back easing), so it lands, presses past and locks
    const o = 1.7; k = k <= 0 ? 0 : k >= 1 ? 1 : 1 + (o + 1) * Math.pow(k - 1, 3) + o * Math.pow(k - 1, 2);
    const u = 1 - k, i = pl.b, R = L.R, q = i * 9, px = pl.piv[0], py = pl.piv[1], pz = pl.piv[2];
    lgR9(R, q, pl.r0[0] * u, pl.r0[1] * u, pl.r0[2] * u);
    // rotate about the pivot: T = piv - R * piv (+ the stowed offset)
    L.T[i * 3] = px - (R[q] * px + R[q + 3] * py + R[q + 6] * pz) + pl.d0[0] * u;
    L.T[i * 3 + 1] = py - (R[q + 1] * px + R[q + 4] * py + R[q + 7] * pz) + pl.d0[1] * u;
    L.T[i * 3 + 2] = pz - (R[q + 2] * px + R[q + 5] * py + R[q + 8] * pz) + pl.d0[2] * u;
    lgWorldOne(W, L, i, rootM);
  }
}
// blending two solved poses joint by joint (rotations by quaternion, offsets linearly)
function lgBlendL(La, Lb, k, Lo) {
  const q1 = LG_TMP.q1, q2 = LG_TMP.q2, q3 = LG_TMP.q3;
  for (let i = 0; i < LG_NB; i++) {
    lgQ(La.R, i * 9, q1); lgQ(Lb.R, i * 9, q2); lgNlerp(q1, q2, k, q3); lgQM(q3, Lo.R, i * 9);
    for (let j = 0; j < 3; j++) Lo.T[i * 3 + j] = lgLerp(La.T[i * 3 + j], Lb.T[i * 3 + j], k);
  }
  return Lo;
}

/* ---------- the builder: shapes on bones ---------- */
// one vertex: position 3, normal 3, uv 2, colour 4 (rgb + slot), material 4 (tile, rough, metal, emit), extra 2 (relief, porosity)
const LG_STRIDE = 18;
// slots: 0 plain, 1 class colour, 2 class glow, 3 wet ground (reflects), 4 cut-out, 5 class colour cut-out, 6 class glow cut-out
function lgB(lod) { return { lod: lod, bone: 0, M: null, st: [lgM4()], nt: [lgM4()], parts: [], def: null }; }
function lgBone(B, n) { B.bone = typeof n === 'number' ? n : LGB[n]; }
function lgMat(B, m) { B.M = m; }
function lgPush(B, m) { const top = B.st[B.st.length - 1], t = lgMul(lgM4(), top, m); B.st.push(t); const inv = lgInv(lgM4(), t); const n = lgM4(); n[0] = inv[0]; n[1] = inv[4]; n[2] = inv[8]; n[4] = inv[1]; n[5] = inv[5]; n[6] = inv[9]; n[8] = inv[2]; n[9] = inv[6]; n[10] = inv[10]; B.nt.push(n); }
function lgPop(B) { if (B.st.length > 1) { B.st.pop(); B.nt.pop(); } }
const lgSeg = (B, n) => Math.max(3, Math.round(n * [1, 0.6, 0.24][B.lod]));
function lgPart(B) { let p = B.parts[B.bone]; if (!p) p = B.parts[B.bone] = { v: [], i: [], n: 0 }; return p; }
const LG_DP = [0, 0, 0], LG_DN = [0, 0, 0];
function lgV(B, p, x, y, z, nx, ny, nz, u, v) {
  if (B.def) { LG_DP[0] = x; LG_DP[1] = y; LG_DP[2] = z; LG_DN[0] = nx; LG_DN[1] = ny; LG_DN[2] = nz; B.def(LG_DP, LG_DN); x = LG_DP[0]; y = LG_DP[1]; z = LG_DP[2]; nx = LG_DN[0]; ny = LG_DN[1]; nz = LG_DN[2]; }
  const m = B.st[B.st.length - 1], n = B.nt[B.nt.length - 1], M = B.M || LG_MAT_DEFAULT;
  const X = m[0] * x + m[4] * y + m[8] * z + m[12], Y = m[1] * x + m[5] * y + m[9] * z + m[13], Z = m[2] * x + m[6] * y + m[10] * z + m[14];
  let NX = n[0] * nx + n[4] * ny + n[8] * nz, NY = n[1] * nx + n[5] * ny + n[9] * nz, NZ = n[2] * nx + n[6] * ny + n[10] * nz; const l = Math.hypot(NX, NY, NZ) || 1;
  const k = M.k || 0.25;
  p.v.push(X, Y, Z, NX / l, NY / l, NZ / l, u / k, v / k, M.c[0], M.c[1], M.c[2], M.s || 0, M.t == null ? -1 : M.t, M.r == null ? 0.7 : M.r, M.m || 0, M.e || 0, M.n == null ? 1 : M.n, M.w == null ? 0.5 : M.w);
  return p.n++;
}
function lgTri(p, a, b, c) { p.i.push(a, b, c); }
const LG_MAT_DEFAULT = { c: [0.5, 0.5, 0.5], t: -1, r: 0.7 };
// a material: colour (hex, or rgb 0..1 linear), tile, roughness, metalness, emission, relief strength, porosity, texture metres, slot
function lgMtl(o) { const c = typeof o.c === 'string' ? lgHex(o.c) : o.c || [0.5, 0.5, 0.5]; return Object.assign({ t: -1, r: 0.7, m: 0, e: 0, n: 1, w: 0.5, k: 0.25, s: 0 }, o, { c: c }); }
// lathe: a profile [[r, z], ...] (bottom to top) spun around z; options: segs, sx/sy (oval), a0/a1 (partial), wr(a, z, r) wrinkles, ox/oy
function lgLathe(B, prof, o) {
  o = o || {}; const p = lgPart(B), seg = lgSeg(B, o.segs || 20), a0 = o.a0 == null ? 0 : o.a0, a1 = o.a1 == null ? TAU : o.a1, sx = o.sx || 1, sy = o.sy || 1, ox = o.ox || 0, oy = o.oy || 0, full = Math.abs(a1 - a0 - TAU) < 1e-6;
  const n = prof.length, base = p.n, nr = [], nz = [], len = [0];
  let avgR = 0; for (const q of prof) avgR += q[0]; avgR = avgR / n * (sx + sy) / 2;
  for (let i = 0; i < n; i++) {
    const pv = prof[Math.max(0, i - 1)], nx = prof[Math.min(n - 1, i + 1)], cur = prof[i];
    let a = pv, b = nx;
    if (i > 0 && pv[0] === cur[0] && pv[1] === cur[1]) a = cur; else if (i < n - 1 && nx[0] === cur[0] && nx[1] === cur[1]) b = cur;
    const tr = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tr, tz) || 1; nr.push(tz / l); nz.push(-tr / l);
    if (i) len.push(len[i - 1] + Math.hypot(cur[0] - prof[i - 1][0], cur[1] - prof[i - 1][1]));
  }
  const cols = full ? seg : seg + 1;
  for (let i = 0; i < n; i++) for (let j = 0; j < cols; j++) {
    const a = a0 + (a1 - a0) * j / seg, ca = Math.cos(a), sa = Math.sin(a); let r = prof[i][0];
    if (o.wr) r *= 1 + o.wr(a, prof[i][1], r);
    lgV(B, p, ox + r * ca * sx, oy + r * sa * sy, prof[i][1], nr[i] * ca / sx, nr[i] * sa / sy, nz[i], a * avgR, len[i]);
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) {
    const j1 = full ? (j + 1) % seg : j + 1, A = base + i * cols + j, Bb = base + i * cols + j1, C = base + (i + 1) * cols + j, D = base + (i + 1) * cols + j1;
    lgTri(p, A, Bb, D); lgTri(p, A, D, C);
  }
  if (o.capB && prof[0][0] > 0) lgLatheCap(B, p, prof[0], seg, a0, a1, sx, sy, ox, oy, -1, base, cols, full);
  if (o.capT && prof[n - 1][0] > 0) lgLatheCap(B, p, prof[n - 1], seg, a0, a1, sx, sy, ox, oy, 1, base + (n - 1) * cols, cols, full);
}
function lgLatheCap(B, p, q, seg, a0, a1, sx, sy, ox, oy, dir, ringBase, cols, full) {
  const c = lgV(B, p, ox, oy, q[1], 0, 0, dir, 0, 0), ring = [];
  for (let j = 0; j < cols; j++) { const a = a0 + (a1 - a0) * j / seg; ring.push(lgV(B, p, ox + q[0] * Math.cos(a) * sx, oy + q[0] * Math.sin(a) * sy, q[1], 0, 0, dir, Math.cos(a) * q[0], Math.sin(a) * q[0])); }
  for (let j = 0; j < seg; j++) lgTri(p, c, ring[j], ring[full ? (j + 1) % seg : j + 1]);
}
// a limb: radius control points [[f, r], ...] along its length (f 0 at the joint .. 1 at the far end), hanging -z
// (or rising +z with up: true); rounded ends; oval (sx, sy); wr wrinkles
function lgLimb(B, len, rads, o) {
  o = o || {}; const prof = [], ring = Math.max(4, lgSeg(B, o.rings || 10)), up = o.up ? 1 : -1, z0 = o.z0 || 0;
  const rAt = f => { let i = 0; while (i < rads.length - 2 && rads[i + 1][0] < f) i++; const a = rads[i], b = rads[i + 1], k = clamp((f - a[0]) / ((b[0] - a[0]) || 1), 0, 1), s = k * k * (3 - 2 * k); return a[1] + (b[1] - a[1]) * s; };
  const r0 = rads[0][1], r1 = rads[rads.length - 1][1], capN = Math.max(2, lgSeg(B, 4));
  const capA = o.capA === false ? 0 : 1, capE = o.capE === false ? 0 : 1;
  if (capA) for (let k = 0; k <= capN; k++) { const t = (1 - k / capN) * Math.PI / 2; prof.push([r0 * Math.cos(t), z0 - up * r0 * Math.sin(t) * (o.capK || 0.7)]); }
  for (let k = capA ? 1 : 0; k < ring; k++) { const f = k / (ring - 1); prof.push([rAt(f), z0 + up * len * f]); }
  if (capE) for (let k = 1; k <= capN; k++) { const t = k / capN * Math.PI / 2; prof.push([r1 * Math.cos(t), z0 + up * (len + r1 * Math.sin(t) * (o.capK || 0.7))]); }
  if (up < 0) prof.reverse();
  lgLathe(B, prof, { segs: o.segs || 16, sx: o.sx, sy: o.sy, wr: o.wr, ox: o.ox, oy: o.oy });
}
// a sphere or part of one: centre, radii; t0/t1 around, p0/p1 from bottom (-pi/2) to top (pi/2)
function lgSphere(B, cx, cy, cz, rx, ry, rz, o) {
  o = o || {}; const p = lgPart(B), nu = lgSeg(B, o.segs || 22), nv = Math.max(3, lgSeg(B, o.rings || 14)), t0 = o.t0 == null ? 0 : o.t0, t1 = o.t1 == null ? TAU : o.t1, p0 = o.p0 == null ? -Math.PI / 2 : o.p0, p1 = o.p1 == null ? Math.PI / 2 : o.p1, base = p.n, ru = (rx + ry) / 2;
  for (let i = 0; i <= nv; i++) { const ph = p0 + (p1 - p0) * i / nv, cp = Math.cos(ph), sp = Math.sin(ph); for (let j = 0; j <= nu; j++) { const th = t0 + (t1 - t0) * j / nu, dx = cp * Math.cos(th), dy = cp * Math.sin(th), dz = sp; let r = 1; if (o.wr) r += o.wr(th, ph); lgV(B, p, cx + dx * rx * r, cy + dy * ry * r, cz + dz * rz * r, dx / rx, dy / ry, dz / rz, th * ru, ph * rz); } }
  for (let i = 0; i < nv; i++) for (let j = 0; j < nu; j++) { const A = base + i * (nu + 1) + j, Bb = A + 1, C = A + nu + 1, D = C + 1; lgTri(p, A, Bb, D); lgTri(p, A, D, C); }
}
// rounded box: centre, half sizes, bevel; o.skip: faces to leave out ('+x','-x','+y','-y','+z','-z')
function lgBox(B, cx, cy, cz, hx, hy, hz, bev, o) {
  o = o || {}; const p = lgPart(B), b = B.lod === 2 && (bev || 0) < 0.02 ? 0 : Math.min(bev || 0, hx * 0.95, hy * 0.95, hz * 0.95), bs = b > 0 ? (B.lod === 0 ? 2 : 1) : 0;
  const coords = h => { if (!bs) return [-h, h]; const c = [-h]; for (let k = 1; k <= bs; k++) c.push(-h + b * (1 - Math.cos(k / bs * Math.PI / 2)) / (bs === 1 ? 1 : 1)); if (bs === 1) c[1] = -h + b; for (let k = bs; k >= 1; k--) c.push(h - b * (1 - Math.cos(k / bs * Math.PI / 2)) / (bs === 1 ? 1 : 1)); if (bs === 1) c[c.length - 1] = h - b; c.push(h); return c; };
  const H = [hx, hy, hz], CX = [coords(hx), coords(hy), coords(hz)], inner = [hx - b, hy - b, hz - b], skip = o.skip || '';
  const faces = [[0, 1, 2, 1, '+x'], [0, 2, 1, -1, '-x'], [1, 2, 0, 1, '+y'], [1, 0, 2, -1, '-y'], [2, 0, 1, 1, '+z'], [2, 1, 0, -1, '-z']];
  const q = [0, 0, 0];
  for (const f of faces) {
    if (skip.includes(f[4])) continue;
    const na = f[0], ua = f[1], va = f[2], s = f[3], U = CX[ua], V = CX[va], base = p.n;
    for (let j = 0; j < V.length; j++) for (let i = 0; i < U.length; i++) {
      q[na] = H[na] * s; q[ua] = U[i]; q[va] = V[j];
      const c0 = clamp(q[0], -inner[0], inner[0]), c1 = clamp(q[1], -inner[1], inner[1]), c2 = clamp(q[2], -inner[2], inner[2]);
      let nx = q[0] - c0, ny = q[1] - c1, nz = q[2] - c2; let l = Math.hypot(nx, ny, nz);
      if (l < 1e-7) { nx = na === 0 ? s : 0; ny = na === 1 ? s : 0; nz = na === 2 ? s : 0; l = 1; }
      nx /= l; ny /= l; nz /= l;
      const px = b > 0 ? c0 + nx * b : q[0], py = b > 0 ? c1 + ny * b : q[1], pz = b > 0 ? c2 + nz * b : q[2];
      lgV(B, p, cx + px, cy + py, cz + pz, nx, ny, nz, q[ua] * (s > 0 || na === 2 ? 1 : -1), q[va]);
    }
    for (let j = 0; j < V.length - 1; j++) for (let i = 0; i < U.length - 1; i++) { const A = base + j * U.length + i, Bb = A + 1, C = A + U.length, D = C + 1; lgTri(p, A, Bb, D); lgTri(p, A, D, C); }
  }
}
// ear clipping for simple polygons (counter-clockwise)
function lgEar(poly) {
  const n = poly.length, idx = []; for (let i = 0; i < n; i++) idx.push(i);
  let area = 0; for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  if (area < 0) idx.reverse();
  const out = [], inTri = (p, a, b, c) => { const d = (a, b, c2) => (b[0] - a[0]) * (c2[1] - a[1]) - (b[1] - a[1]) * (c2[0] - a[0]); return d(a, b, p) >= 0 && d(b, c, p) >= 0 && d(c, a, p) >= 0; };
  let guard = 0;
  while (idx.length > 3 && guard++ < 5000) {
    let cut = false;
    for (let i = 0; i < idx.length; i++) {
      const i0 = idx[(i + idx.length - 1) % idx.length], i1 = idx[i], i2 = idx[(i + 1) % idx.length], a = poly[i0], b = poly[i1], c = poly[i2];
      if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) <= 1e-12) continue;
      let ok = true; for (const j of idx) { if (j === i0 || j === i1 || j === i2) continue; if (inTri(poly[j], a, b, c)) { ok = false; break; } }
      if (!ok) continue; out.push(i0, i1, i2); idx.splice(i, 1); cut = true; break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) out.push(idx[0], idx[1], idx[2]);
  return out;
}
// extrude a polygon (x, y) along z from z0 to z1; bevel at both caps; smooth sides when the corner is gentle
function lgExtrude(B, poly, z0, z1, o) {
  o = o || {}; const p = lgPart(B), n = poly.length, bev = B.lod === 2 ? 0 : Math.min(o.bev || 0, Math.abs(z1 - z0) * 0.45), tris = lgEar(poly);
  let area = 0; for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; } const ccw = area > 0 ? 1 : -1;
  // vertex normals of the outline (outward), and an inset outline for the bevel
  const en = []; for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; en.push([dy / l * ccw, -dx / l * ccw]); }
  const vn = [], ins = []; for (let i = 0; i < n; i++) { const e0 = en[(i + n - 1) % n], e1 = en[i]; let x = e0[0] + e1[0], y = e0[1] + e1[1]; const l = Math.hypot(x, y) || 1; x /= l; y /= l; const dt = Math.max(0.3, x * e1[0] + y * e1[1]); vn.push([x, y]); ins.push([poly[i][0] - x * bev / dt, poly[i][1] - y * bev / dt]); }
  const cap = (pts, z, nz) => { const b0 = p.n; for (const q of pts) lgV(B, p, q[0], q[1], z, 0, 0, nz, q[0], q[1]); for (let t = 0; t < tris.length; t += 3) { if (nz > 0) lgTri(p, b0 + tris[t], b0 + tris[t + 1], b0 + tris[t + 2]); else lgTri(p, b0 + tris[t], b0 + tris[t + 2], b0 + tris[t + 1]); } };
  const smoothCos = Math.cos(o.smooth == null ? 0.5 : o.smooth);
  const ringPair = (A, za, Bp, zb, nzA, nzB) => {   // a band of quads between outline A at za and B at zb
    let per = 0;
    for (let i = 0; i < n; i++) {
      const i1 = (i + 1) % n, e = en[i], seg = Math.hypot(Bp[i1][0] - Bp[i][0], Bp[i1][1] - Bp[i][1]);
      const nAt = k => { const e0 = en[(k + n - 1) % n], e1 = en[k], sm = e0[0] * e1[0] + e0[1] * e1[1] > smoothCos; return sm ? vn[k] : e; };
      const n0 = nAt(i), n1 = (() => { const e0 = en[i], e1 = en[i1], sm = e0[0] * e1[0] + e0[1] * e1[1] > smoothCos; return sm ? vn[i1] : e; })();
      const mk = (q, z, nn, nzz, u) => { const l = Math.hypot(nn[0], nn[1], nzz) || 1; return lgV(B, p, q[0], q[1], z, nn[0] / l, nn[1] / l, nzz / l, u, z); };
      const a = mk(A[i], za, n0, nzA, per), b = mk(A[i1], za, n1, nzA, per + seg), c = mk(Bp[i], zb, n0, nzB, per), d = mk(Bp[i1], zb, n1, nzB, per + seg);
      lgTri(p, a, b, d); lgTri(p, a, d, c); per += seg;
    }
  };
  const lo = Math.min(z0, z1), hi = Math.max(z0, z1);
  if (bev > 0) {
    if (o.capB !== false) cap(ins, lo, -1);
    ringPair(ins, lo, poly, lo + bev, -0.7, -0.15); ringPair(poly, lo + bev, poly, hi - bev, 0, 0); ringPair(poly, hi - bev, ins, hi, 0.15, 0.7);
    if (o.capT !== false) cap(ins, hi, 1);
  } else {
    if (o.capB !== false) cap(poly, lo, -1);
    ringPair(poly, lo, poly, hi, 0, 0);
    if (o.capT !== false) cap(poly, hi, 1);
  }
}
// a tube along a path of points (parallel-transported rings); flat: oval ratio (straps); r may be a function of t
function lgTube(B, pts, r, o) {
  o = o || {}; const p = lgPart(B), seg = lgSeg(B, o.segs || 8), base = p.n, n = pts.length, flat = o.flat || 1;
  let nx = 0, ny = 0, nz = 1, len = 0; const tan = i => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; let x = b[0] - a[0], y = b[1] - a[1], z = b[2] - a[2]; const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
  let t0 = tan(0); { const up = o.up || (Math.abs(t0[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]); let x = up[1] * t0[2] - up[2] * t0[1], y = up[2] * t0[0] - up[0] * t0[2], z = up[0] * t0[1] - up[1] * t0[0]; const l = Math.hypot(x, y, z) || 1; nx = x / l; ny = y / l; nz = z / l; }
  for (let i = 0; i < n; i++) {
    const t = tan(i);
    // transport the normal: remove its component along the tangent
    const d = nx * t[0] + ny * t[1] + nz * t[2]; nx -= t[0] * d; ny -= t[1] * d; nz -= t[2] * d; let l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const bx = t[1] * nz - t[2] * ny, by = t[2] * nx - t[0] * nz, bz = t[0] * ny - t[1] * nx;
    if (i) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]);
    const rr = typeof r === 'function' ? r(i / (n - 1)) : r;
    for (let j = 0; j <= seg; j++) {
      const a = j / seg * TAU, ca = Math.cos(a), sa = Math.sin(a) * flat;
      const ox = nx * ca + bx * sa, oy = ny * ca + by * sa, oz = nz * ca + bz * sa;
      const gx = nx * ca + bx * Math.sin(a) / flat, gy = ny * ca + by * Math.sin(a) / flat, gz = nz * ca + bz * Math.sin(a) / flat;
      lgV(B, p, pts[i][0] + ox * rr, pts[i][1] + oy * rr, pts[i][2] + oz * rr, gx, gy, gz, a * rr, len);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) { const A = base + i * (seg + 1) + j, Bb = A + 1, C = A + seg + 1, D = C + 1; lgTri(p, A, Bb, D); lgTri(p, A, D, C); }
}
// a flat decal: centre, half-vectors u and v, uv rectangle in tile units [u0, v0, u1, v1], lifted off the surface
function lgDecal(B, c, uh, vh, uvr, o) {
  o = o || {}; const p = lgPart(B), nn = [uh[1] * vh[2] - uh[2] * vh[1], uh[2] * vh[0] - uh[0] * vh[2], uh[0] * vh[1] - uh[1] * vh[0]], l = Math.hypot(nn[0], nn[1], nn[2]) || 1;
  nn[0] /= l; nn[1] /= l; nn[2] /= l; const lift = o.lift == null ? 0.0012 : o.lift, k = (B.M && B.M.k) || 1, sub = o.sub || 1, base = p.n;
  for (let j = 0; j <= sub; j++) for (let i = 0; i <= sub; i++) {
    const a = i / sub * 2 - 1, b = j / sub * 2 - 1, x = c[0] + uh[0] * a + vh[0] * b + nn[0] * lift, y = c[1] + uh[1] * a + vh[1] * b + nn[1] * lift, z = c[2] + uh[2] * a + vh[2] * b + nn[2] * lift;
    lgV(B, p, x, y, z, nn[0], nn[1], nn[2], (uvr[0] + (uvr[2] - uvr[0]) * (i / sub)) * k, (uvr[3] + (uvr[1] - uvr[3]) * (j / sub)) * k);
  }
  for (let j = 0; j < sub; j++) for (let i = 0; i < sub; i++) { const A = base + j * (sub + 1) + i, Bb = A + 1, C = A + sub + 1, D = C + 1; lgTri(p, A, Bb, D); lgTri(p, A, D, C); }
}
// a subdivided plane (ground, walls): origin corner, edge vectors, cells
function lgPlane(B, o0, ea, eb, na, nb, uvk) {
  const p = lgPart(B), base = p.n, nn = [ea[1] * eb[2] - ea[2] * eb[1], ea[2] * eb[0] - ea[0] * eb[2], ea[0] * eb[1] - ea[1] * eb[0]], l = Math.hypot(nn[0], nn[1], nn[2]) || 1, la = Math.hypot(ea[0], ea[1], ea[2]), lb = Math.hypot(eb[0], eb[1], eb[2]);
  for (let j = 0; j <= nb; j++) for (let i = 0; i <= na; i++) { const a = i / na, b = j / nb; lgV(B, p, o0[0] + ea[0] * a + eb[0] * b, o0[1] + ea[1] * a + eb[1] * b, o0[2] + ea[2] * a + eb[2] * b, nn[0] / l, nn[1] / l, nn[2] / l, a * la * (uvk || 1), b * lb * (uvk || 1)); }
  for (let j = 0; j < nb; j++) for (let i = 0; i < na; i++) { const A = base + j * (na + 1) + i, Bb = A + 1, C = A + na + 1, D = C + 1; lgTri(p, A, Bb, D); lgTri(p, A, D, C); }
}
// bend helper: curve a shape around the z axis (a plate curving across the chest): x pulled back by y^2/2R
function lgBendY(R, cy) { cy = cy || 0; return (P, N) => { const y = P[1] - cy; P[0] -= y * y / (2 * R); const nx = N[0], ny = N[1] + N[0] * (y / R); const l = Math.hypot(nx, ny, N[2]) || 1; N[0] = nx / l; N[1] = ny / l; N[2] /= l; }; }
// finishing a model: one vertex buffer and one index list, the triangles of each bone in a run
function lgFinish(B, name) {
  let nv = 0, ni = 0; for (const p of B.parts) if (p) { nv += p.n; ni += p.i.length; }
  const V = new Float32Array(nv * LG_STRIDE), I = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni), runs = []; let vo = 0, io = 0;
  for (let b = 0; b < LG_NB_MAX; b++) {
    const p = B.parts[b]; if (!p || !p.n) continue;
    V.set(p.v, vo * LG_STRIDE); for (let k = 0; k < p.i.length; k++) I[io + k] = p.i[k] + vo;
    runs.push({ b: b, v0: vo, nv: p.n, i0: io, ni: p.i.length }); vo += p.n; io += p.i.length;
  }
  return { name: name, lod: B.lod, V: V, I: I, runs: runs, nv: nv, tris: ni / 3, gl: null, cpu: null, big: nv > 65535 };
}
const LG_NB_MAX = 96;   // sets (the alley) use more "bones" than the body: each moving piece of a set is its own

/* ---------- models: made once per legend, class and detail level (legmodel.js has the makers) ---------- */
const LG_MAKERS = {};
function lgModel(key, lod, cls) {
  const k = key + '|' + lod + '|' + (cls || ''); let m = LG.models.get(k); if (m) return m;
  const mk = LG_MAKERS[key]; if (!mk) return null;
  const t0 = performance.now(), B = lgB(lod);
  try { mk(B, cls || 'attack'); } catch (e) { coreHurt('LEGEND', e); try { console.error(e); } catch (x) { } }
  m = lgFinish(B, key); m.ms = performance.now() - t0; m.key = k;
  LG.models.set(k, m);
  if (LG.models.size > 40) { const first = LG.models.keys().next().value; const old = LG.models.get(first); lgGLFree(old); LG.models.delete(first); }
  return m;
}

/* ---------- the 2D painter: the same meshes on the processor ---------- */
// per model: positions in screen space, per-triangle colour taken from the material and the texture at its middle
function lgCpu(m) {
  if (m.cpu && m.cpu.at === (LG.atlas ? LG.atlas.ver : 0)) return m.cpu;
  const nt = m.tris, V = m.V, I = m.I, S = LG_STRIDE, tc = new Float32Array(nt * 3), tf = new Uint8Array(nt), te = new Float32Array(nt), sm = [0, 0, 0, 0, 0, 0];
  for (let t = 0; t < nt; t++) {
    const a = I[t * 3] * S, b = I[t * 3 + 1] * S, c = I[t * 3 + 2] * S, tile = V[a + 12];
    let r = (V[a + 8] + V[b + 8] + V[c + 8]) / 3, g = (V[a + 9] + V[b + 9] + V[c + 9]) / 3, bl = (V[a + 10] + V[b + 10] + V[c + 10]) / 3;
    const slot = V[a + 11];
    if (tile >= 0 && LG.atlas && LG.atlas.dA) {
      lgAtlasSample(LG.atlas, tile, (V[a + 6] + V[b + 6] + V[c + 6]) / 3, (V[a + 7] + V[b + 7] + V[c + 7]) / 3, sm);
      if ((slot >= 3.5) && sm[5] < 0.5) { tf[t] = 255; continue; }   // outside a cut-out decal
      r *= sm[0] * sm[0]; g *= sm[1] * sm[1]; bl *= sm[2] * sm[2];
    }
    tc[t * 3] = r; tc[t * 3 + 1] = g; tc[t * 3 + 2] = bl; tf[t] = slot | 0; te[t] = V[a + 15];
  }
  m.cpu = { at: LG.atlas ? LG.atlas.ver : 0, tc: tc, tf: tf, te: te, sx: new Float32Array(m.nv), sy: new Float32Array(m.nv), sz: new Float32Array(m.nv), wx: new Float32Array(m.nv), wy: new Float32Array(m.nv), wz: new Float32Array(m.nv), key: new Float32Array(nt), ord: new Uint32Array(nt), shade: new Float32Array(nt * 3) };
  return m.cpu;
}
const LG_FILL = new Map();
function lgFillStr(r, g, b) {
  const R = Math.round(clamp(r, 0, 1) * 63), G2 = Math.round(clamp(g, 0, 1) * 63), B2 = Math.round(clamp(b, 0, 1) * 63), k = (R << 12) | (G2 << 6) | B2;
  let s = LG_FILL.get(k); if (!s) { s = 'rgb(' + (R * 4.05 | 0) + ',' + (G2 * 4.05 | 0) + ',' + (B2 * 4.05 | 0) + ')'; if (LG_FILL.size > 20000) LG_FILL.clear(); LG_FILL.set(k, s); } return s;
}
// L: lights { key: [dir x,y,z, r,g,b], rim: [...], sky: [r,g,b], gnd: [r,g,b], acc: [r,g,b], glow, eye: [x,y,z] or null for ortho with dir view }
function lg2D(g, m, W, VP, vw, vh, L, o) {
  o = o || {}; const C = lgCpu(m), V = m.V, I = m.I, S = LG_STRIDE, nt = m.tris, hide = o.hide;
  if (!C.nx) { C.nx = new Float32Array(m.nv); C.ny = new Float32Array(m.nv); C.nz = new Float32Array(m.nv); }
  // to screen, with the mesh normals turned by their bones
  for (const run of m.runs) {
    if (hide && hide[run.b]) { for (let k = 0; k < run.nv; k++) C.sz[run.v0 + k] = NaN; continue; }
    const M = W.subarray(run.b * 16, run.b * 16 + 16), m0 = M[0], m1 = M[1], m2 = M[2], m4 = M[4], m5 = M[5], m6 = M[6], m8 = M[8], m9 = M[9], m10 = M[10];
    for (let k = 0; k < run.nv; k++) {
      const vi = run.v0 + k, a = vi * S, x = V[a], y = V[a + 1], z = V[a + 2], nx = V[a + 3], ny = V[a + 4], nz = V[a + 5];
      const wx = m0 * x + m4 * y + m8 * z + M[12], wy = m1 * x + m5 * y + m9 * z + M[13], wz = m2 * x + m6 * y + m10 * z + M[14];
      C.wx[vi] = wx; C.wy[vi] = wy; C.wz[vi] = wz; C.nx[vi] = m0 * nx + m4 * ny + m8 * nz; C.ny[vi] = m1 * nx + m5 * ny + m9 * nz; C.nz[vi] = m2 * nx + m6 * ny + m10 * nz;
      const cx = VP[0] * wx + VP[4] * wy + VP[8] * wz + VP[12], cy = VP[1] * wx + VP[5] * wy + VP[9] * wz + VP[13], cz = VP[2] * wx + VP[6] * wy + VP[10] * wz + VP[14], cw = VP[3] * wx + VP[7] * wy + VP[11] * wz + VP[15];
      if (cw <= 1e-4) { C.sz[vi] = NaN; continue; }
      C.sx[vi] = (cx / cw * 0.5 + 0.5) * vw; C.sy[vi] = (0.5 - cy / cw * 0.5) * vh; C.sz[vi] = cz / cw;
    }
  }
  // cull, shade, sort
  const key = L.key, rim = L.rim, eye = L.eye, vd = L.view || [0, 0, 1], acc = L.acc, glow = L.glow == null ? 1 : L.glow; let cnt = 0;
  const k0 = key[0], k1 = key[1], k2 = key[2], r0 = rim[0], r1 = rim[1], r2 = rim[2];
  for (let t = 0; t < nt; t++) {
    if (C.tf[t] === 255) continue;
    const a = I[t * 3], b = I[t * 3 + 1], c = I[t * 3 + 2];
    const za = C.sz[a], zb = C.sz[b], zc = C.sz[c]; if (!(za === za && zb === zb && zc === zc)) continue;
    const ux = C.wx[b] - C.wx[a], uy = C.wy[b] - C.wy[a], uz = C.wz[b] - C.wz[a], vx = C.wx[c] - C.wx[a], vy = C.wy[c] - C.wy[a], vz = C.wz[c] - C.wz[a];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const nl = Math.sqrt(nx * nx + ny * ny + nz * nz); if (nl < 1e-12) continue; nx /= nl; ny /= nl; nz /= nl;
    if (nx * (C.nx[a] + C.nx[b] + C.nx[c]) + ny * (C.ny[a] + C.ny[b] + C.ny[c]) + nz * (C.nz[a] + C.nz[b] + C.nz[c]) < 0) { nx = -nx; ny = -ny; nz = -nz; }
    let ex, ey, ez; if (eye) { ex = eye[0] - (C.wx[a] + C.wx[b] + C.wx[c]) / 3; ey = eye[1] - (C.wy[a] + C.wy[b] + C.wy[c]) / 3; ez = eye[2] - (C.wz[a] + C.wz[b] + C.wz[c]) / 3; const el = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1; ex /= el; ey /= el; ez /= el; } else { ex = vd[0]; ey = vd[1]; ez = vd[2]; }
    const facing = nx * ex + ny * ey + nz * ez; if (facing < -0.08) continue;
    const slot = C.tf[t]; let r = C.tc[t * 3], gg = C.tc[t * 3 + 1], bb = C.tc[t * 3 + 2];
    if (slot === 1 || slot === 5) { const lum = (r + gg + bb) / 3 / Math.max(0.05, (V[a * S + 8] + V[a * S + 9] + V[a * S + 10]) / 3); r = acc[0] * lum; gg = acc[1] * lum; bb = acc[2] * lum; }
    const dk = Math.max(0, (nx * k0 + ny * k1 + nz * k2 + 0.2) / 1.2), hz = nz * 0.5 + 0.5, f1 = 1 - Math.max(0, facing);
    const rimK = f1 * f1 * Math.max(0, nx * r0 + ny * r1 + nz * r2) * 0.9;
    let sr = r * (key[3] * dk + L.sky[0] * hz + L.gnd[0] * (1 - hz)) + rim[3] * rimK, sg = gg * (key[4] * dk + L.sky[1] * hz + L.gnd[1] * (1 - hz)) + rim[4] * rimK, sb = bb * (key[5] * dk + L.sky[2] * hz + L.gnd[2] * (1 - hz)) + rim[5] * rimK;
    const hx = k0 + ex, hy = k1 + ey, hz2 = k2 + ez, hl = Math.sqrt(hx * hx + hy * hy + hz2 * hz2) || 1; let sp = Math.max(0, (nx * hx + ny * hy + nz * hz2) / hl); sp *= sp; sp *= sp; sp *= sp; sp = sp * sp * sp * 0.35 * (1 - V[a * S + 13]);
    sr += sp * key[3]; sg += sp * key[4]; sb += sp * key[5];
    const em = C.te[t]; if (em > 0) { if (slot === 2 || slot === 6) { const k3 = em * glow; sr += acc[0] * k3; sg += acc[1] * k3; sb += acc[2] * k3; } else { sr += r * em; sg += gg * em; sb += bb * em; } }
    C.shade[t * 3] = Math.sqrt(sr / (sr + 0.55) * 1.45); C.shade[t * 3 + 1] = Math.sqrt(sg / (sg + 0.55) * 1.45); C.shade[t * 3 + 2] = Math.sqrt(sb / (sb + 0.55) * 1.45);
    C.key[t] = za + zb + zc; C.ord[cnt] = t; cnt++;
  }
  const ord = C.ord.subarray(0, cnt), kk = C.key; ord.sort((x, y) => kk[y] - kk[x]);
  // back to front, each triangle pushed out a hair from its middle to close the seams; runs of one colour share a fill,
  // and slivers smaller than a fraction of a pixel are left to their neighbours
  const gr = o.grow == null ? 0.45 : o.grow, minA = o.minArea == null ? 0.015 : o.minArea; let cur = '', open = false;
  for (let q = 0; q < cnt; q++) {
    const t = ord[q], a = I[t * 3], b = I[t * 3 + 1], c = I[t * 3 + 2];
    const ax = C.sx[a], ay = C.sy[a], bx = C.sx[b], by = C.sy[b], cx = C.sx[c], cy = C.sy[c];
    if (Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) < minA) continue;
    const mx = (ax + bx + cx) / 3, my = (ay + by + cy) / 3;
    let dx = ax - mx, dy = ay - my, l = Math.sqrt(dx * dx + dy * dy) || 1; const Ax = ax + dx / l * gr, Ay = ay + dy / l * gr;
    dx = bx - mx; dy = by - my; l = Math.sqrt(dx * dx + dy * dy) || 1; const Bx = bx + dx / l * gr, By = by + dy / l * gr;
    dx = cx - mx; dy = cy - my; l = Math.sqrt(dx * dx + dy * dy) || 1; const Cx = cx + dx / l * gr, Cy = cy + dy / l * gr;
    const fs = lgFillStr(C.shade[t * 3], C.shade[t * 3 + 1], C.shade[t * 3 + 2]);
    if (fs !== cur) { if (open) g.fill(); g.fillStyle = cur = fs; g.beginPath(); open = true; }
    g.moveTo(Ax, Ay); g.lineTo(Bx, By); g.lineTo(Cx, Cy); g.closePath();
  }
  if (open) g.fill();
  LG.tris += cnt;
  return cnt;
}
// which bone's matrix a vertex rides on (the run that holds it)
function lgRunM(m, W, vi) { const runs = m.runs; let lo = 0, hi = runs.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (runs[mid].v0 <= vi) lo = mid; else hi = mid - 1; } const b = runs[lo].b; return W.subarray(b * 16, b * 16 + 16); }

/* ---------- the GPU path ---------- */
const LGR = { gl: null, cv: null, ok: false, P: {}, ext: {}, tex: {}, fbo: {}, w: 0, h: 0, why: '', atlasVer: 0, shadowN: 0, quad: null, white: null };
const LG_VS = 'attribute vec3 aP; attribute vec3 aN; attribute vec2 aU; attribute vec4 aC; attribute vec4 aM; attribute vec2 aX;\n' +
  'uniform mat4 uVP, uMd, uLVP;\n' +
  'varying vec3 vP; varying vec3 vN; varying vec2 vU; varying vec4 vC; varying vec4 vM; varying vec2 vX; varying vec4 vL;\n' +
  'void main() { vec4 w = uMd * vec4(aP, 1.0); vP = w.xyz; vN = (uMd * vec4(aN, 0.0)).xyz; vU = aU; vC = aC; vM = aM; vX = aX; vL = uLVP * w; gl_Position = uVP * w; }';
const LG_FS = function (deriv) {
  return (deriv ? '#extension GL_OES_standard_derivatives : enable\n#define DERIV 1\n' : '') +
  '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' +
  'uniform sampler2D uA, uAL, uH, uSh, uRf;\n' +
  'uniform vec2 uGrid; uniform float uTx, uTT;\n' +
  'uniform vec3 uEye, uKD, uKC, uRD, uRC, uSky, uGnd, uAcc, uFlD, uFlC, uFogC, uFog;\n' +
  'uniform vec4 uPL[4]; uniform vec3 uPC[4];\n' +
  'uniform float uGlow, uWet, uTime, uExpo, uDesat, uShOn, uRfOn, uShTx, uSat, uCut;\n' +
  'uniform vec2 uRes; uniform vec4 uGrade;\n' +
  'varying vec3 vP; varying vec3 vN; varying vec2 vU; varying vec4 vC; varying vec4 vM; varying vec2 vX; varying vec4 vL;\n' +
  'vec2 tuv(float t, vec2 u) { vec2 f = clamp(fract(u), uTx, 1.0 - uTx); return (vec2(mod(t, uGrid.x), floor(t / uGrid.x + 0.001)) + f) / uGrid; }\n' +
  'float unpackD(vec4 c) { return dot(c, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0)); }\n' +
  'float shadowAt(vec4 L, float bias) { vec3 p = L.xyz / L.w * 0.5 + 0.5; if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0; float s = 0.0;\n' +
  ' s += step(p.z - bias, unpackD(texture2D(uSh, p.xy + vec2(-uShTx, -uShTx)))); s += step(p.z - bias, unpackD(texture2D(uSh, p.xy + vec2(uShTx, -uShTx))));\n' +
  ' s += step(p.z - bias, unpackD(texture2D(uSh, p.xy + vec2(-uShTx, uShTx)))); s += step(p.z - bias, unpackD(texture2D(uSh, p.xy + vec2(uShTx, uShTx)))); return s * 0.25; }\n' +
  'vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }\n' +
  'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n' +
  // rain rings on the puddles: a few drops per cell, each an expanding ring
  'vec2 ripples(vec2 p, float t) { vec2 g = vec2(0.0); for (int k = 0; k < 2; k++) { vec2 q = p * (k == 0 ? 2.6 : 4.1) + float(k) * 3.7; vec2 c = floor(q); vec2 f = fract(q) - 0.5;\n' +
  '  float h = hash(c); float ph = fract(t * (0.9 + h * 0.6) + h * 7.0); vec2 o = vec2(hash(c + 1.3), hash(c + 2.9)) - 0.5; vec2 d = f - o * 0.6; float r = length(d);\n' +
  '  float ring = sin((r - ph * 0.45) * 60.0) * smoothstep(0.08, 0.0, abs(r - ph * 0.45)) * (1.0 - ph); g += d / max(r, 0.001) * ring; } return g * 0.5; }\n' +
  'void main() {\n' +
  ' float slot = vC.a; float cut = step(3.5, slot); float sl = slot - 4.0 * cut; float tile = vM.x;\n' +
  ' vec3 N = normalize(vN); vec3 V = normalize(uEye - vP); if (dot(N, V) < 0.0) N = -N;\n' +
  ' vec3 base = (sl > 0.5 && sl < 2.5) ? uAcc : vC.rgb; vec3 alb = base; float rough = vM.y; float metal = vM.z; float ao = 1.0; float lum = 1.0; vec4 th = vec4(0.5, 0.6, 1.0, 1.0);\n' +
  ' if (tile >= 0.0) { vec2 tu = tuv(tile, vU); vec3 ta = texture2D(uA, tu).rgb; th = texture2D(uH, tu);\n' +
  '  if (cut > 0.5 && th.b < 0.5) discard;\n' +
  '#ifdef DERIV\n' +
  '  vec2 dx = dFdx(vU * uTT), dy = dFdy(vU * uTT); float lod = log2(max(max(length(dx), length(dy)), 1e-4));\n' +
  '  ta = mix(ta, texture2D(uAL, tu).rgb, clamp((lod - 1.2) * 0.6, 0.0, 1.0) * (1.0 - cut));\n' +
  '  float fadeN = 1.0 - clamp((lod - 0.8) * 0.5, 0.0, 1.0);\n' +
  '  if (vX.x > 0.0 && fadeN > 0.0) { float e = 1.0 / uTT; float hx = texture2D(uH, tuv(tile, vU + vec2(e, 0.0))).r; float hy = texture2D(uH, tuv(tile, vU + vec2(0.0, e))).r;\n' +
  '   vec3 dp1 = dFdx(vP), dp2 = dFdy(vP); vec2 du1 = dFdx(vU), du2 = dFdy(vU); vec3 p2 = cross(dp2, N), p1 = cross(N, dp1);\n' +
  '   vec3 Tg = p2 * du1.x + p1 * du2.x; vec3 Bg = p2 * du1.y + p1 * du2.y; float im = inversesqrt(max(max(dot(Tg, Tg), dot(Bg, Bg)), 1e-12));\n' +
  '   N = normalize(N - (Tg * im * (hx - th.r) + Bg * im * (hy - th.r)) * vX.x * 3.0 * fadeN); }\n' +
  '#endif\n' +
  '  lum = dot(ta, vec3(0.333)); alb = base * ta * ta * (sl > 0.5 && sl < 2.5 ? 1.0 / max(dot(vC.rgb, vec3(0.333)), 0.05) * 0.0 + 1.0 : 1.0);\n' +
  '  rough = clamp(rough * (0.55 + 0.9 * th.g), 0.03, 1.0); ao = mix(1.0, th.b, 0.75 * (1.0 - cut)); }\n' +
  // wet: porous cloth darkens and goes satin, hard kit goes glossy
  ' float wet = uWet * (sl > 2.5 && sl < 3.5 ? 1.0 : 1.0); alb *= mix(1.0, 0.55, wet * vX.y); rough = mix(rough, mix(0.1, 0.42, vX.y), wet * 0.85);\n' +
  ' if (sl > 2.5 && sl < 3.5) { rough = mix(rough, th.g * 0.6, 0.5); }\n' +
  ' float NV = max(dot(N, V), 0.0); float F0 = mix(0.04, 0.55, metal); float fres = F0 + (1.0 - F0) * pow(1.0 - NV, 5.0); float sp = exp2(11.0 * (1.0 - rough)) + 2.0; float spN = (sp + 8.0) / 25.13;\n' +
  ' vec3 dif = alb * (1.0 - metal * 0.75); vec3 spc = mix(vec3(1.0), alb * 2.2 + 0.2, metal);\n' +
  ' float w = 0.3 * vX.y; float NL = max((dot(N, uKD) + w) / (1.0 + w), 0.0); float sh = uShOn > 0.5 ? shadowAt(vL, 0.0025) : 1.0;\n' +
  ' vec3 H = normalize(uKD + V); vec3 col = (dif * NL + spc * pow(max(dot(N, H), 0.0), sp) * spN * fres * step(0.0, dot(N, uKD))) * uKC * sh;\n' +
  ' float rimF = pow(1.0 - NV, 2.6) * clamp(dot(N, uRD) * 0.6 + 0.4, 0.0, 1.0); col += uRC * rimF * (0.35 + 0.65 * (1.0 - rough)) * (0.6 + 0.4 * lum);\n' +
  ' col += dif * mix(uGnd, uSky, N.z * 0.5 + 0.5) * ao;\n' +
  ' for (int i = 0; i < 4; i++) { vec3 Lv = uPL[i].xyz - vP; float d = length(Lv); float att = clamp(1.0 - d / max(uPL[i].w, 0.001), 0.0, 1.0); att *= att; Lv /= max(d, 0.001);\n' +
  '  vec3 H2 = normalize(Lv + V); col += (dif * max(dot(N, Lv), 0.0) + spc * pow(max(dot(N, H2), 0.0), sp) * spN * fres) * uPC[i] * att; }\n' +
  ' vec3 Hf = normalize(uFlD + V); col += (dif * max(dot(N, uFlD), 0.0) + spc * pow(max(dot(N, Hf), 0.0), sp) * spN * (fres + 0.1)) * uFlC;\n' +
  ' vec3 emc = (sl > 1.5 && sl < 2.5) ? uAcc * uGlow * (0.25 + lum * 1.5) : alb; col += emc * vM.w;\n' +
  ' if (sl > 2.5 && sl < 3.5 && uRfOn > 0.5) { vec2 rp = ripples(vP.xy, uTime); vec2 sc = gl_FragCoord.xy / uRes + rp * 0.02 + N.xy * 0.01; vec3 rf = texture2D(uRf, sc).rgb;\n' +
  '  float pud = clamp(1.0 - th.g * 1.4, 0.0, 1.0); float k = clamp((0.25 + 0.75 * pow(1.0 - NV, 2.0)) * (0.35 + 0.65 * pud) * uWet, 0.0, 0.92); col = mix(col, rf, k); col += uKC * dot(rp, rp) * 0.0; }\n' +
  ' float dist = length(uEye - vP); float fog = 1.0 - exp(-uFog.x * max(0.0, dist - uFog.z)); fog *= clamp(1.0 - (vP.z - 0.2) * uFog.y, 0.25, 1.0); col = mix(col, uFogC, clamp(fog, 0.0, 1.0));\n' +
  ' col *= uExpo; col = aces(col);\n' +
  ' float g = dot(col, vec3(0.2126, 0.7152, 0.0722)); float keep = (sl > 0.5 && sl < 2.5) ? 0.15 : 1.0; col = mix(vec3(g), col, mix(1.0, uSat, keep)); col = mix(col, vec3(g) * vec3(1.02, 1.0, 0.97), uDesat * keep);\n' +
  ' col = pow(col, vec3(1.0 / 2.2)); col = col * uGrade.x + uGrade.yzw;\n' +
  ' gl_FragColor = vec4(col, 1.0); }';
};
// depth for the shadow map, packed into colour (WebGL 1 has no depth textures everywhere)
const LG_VS_D = 'attribute vec3 aP; attribute vec4 aC; attribute vec2 aU; attribute vec4 aM; uniform mat4 uVP, uMd; varying float vZ; varying vec2 vU; varying vec4 vC; varying vec4 vM; void main() { vec4 p = uVP * uMd * vec4(aP, 1.0); vZ = p.z / p.w * 0.5 + 0.5; vU = aU; vC = aC; vM = aM; gl_Position = p; }';
const LG_FS_D = 'precision highp float; varying float vZ; varying vec2 vU; varying vec4 vC; varying vec4 vM; vec4 packD(float d) { vec4 e = fract(vec4(1.0, 255.0, 65025.0, 16581375.0) * d); e -= e.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0); return e; } void main() { gl_FragColor = packD(vZ); }';
function lgGLInit() {
  if (LGR.gl && !LGR.lost) return LGR.ok;
  if (typeof prismGpuShy === 'function' && prismGpuShy()) { LGR.why = 'the graphics chip has lost its work too often on this device'; return false; }
  if (SET.legendGpu === false) { LGR.why = 'turned off in settings'; return false; }
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16; cv.className = 'lg-cv';
  let gl = null; const opt = { alpha: false, antialias: true, depth: true, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
  try { gl = cv.getContext('webgl', opt) || cv.getContext('experimental-webgl', opt); } catch (e) { gl = null; }
  if (!gl) { LGR.why = 'WebGL is not available'; return false; }
  LGR.gl = gl; LGR.cv = cv; LGR.lost = false;
  LGR.ext.deriv = gl.getExtension('OES_standard_derivatives'); LGR.ext.uint = gl.getExtension('OES_element_index_uint');
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); LGR.lost = true; LGR.ok = false; coreHurt('LEGEND', 'GPU context lost'); coreRepaired('LEGEND', 'Legends: the GPU reset, drawing on the processor until it is back'); for (const m of LG.models.values()) m.gl = null; LGR.tex = {}; LGR.fbo = {}; LGR.P = {}; }, false);
  cv.addEventListener('webglcontextrestored', () => { LGR.lost = false; LGR.gl = null; lgGLInit(); coreRepaired('LEGEND', 'Legends: shaders rebuilt after the GPU came back'); }, false);
  try {
    LGR.P.scene = lgProg(gl, LG_VS, LG_FS(!!LGR.ext.deriv));
    LGR.P.depth = lgProg(gl, LG_VS_D, LG_FS_D);
    LGR.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, LGR.quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    LGR.ok = true; LGR.why = '';
  } catch (e) { LGR.ok = false; LGR.why = 'a shader would not compile'; coreHurt('LEGEND', e); try { console.error(e); } catch (x) { } }
  return LGR.ok;
}
function lgProg(gl, vs, fs) {
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error('shader: ' + gl.getShaderInfoLog(o)); return o; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  ['aP', 'aN', 'aU', 'aC', 'aM', 'aX'].forEach((n, i) => gl.bindAttribLocation(p, i, n));
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error('link: ' + gl.getProgramInfoLog(p));
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); const nm = a.name.replace(/\[0\]$/, ''); u[nm] = gl.getUniformLocation(p, a.name); }
  const at = {}; ['aP', 'aN', 'aU', 'aC', 'aM', 'aX'].forEach(nm => { at[nm] = gl.getAttribLocation(p, nm); });
  return { p: p, u: u, a: at };
}
function lgGLModel(m) {
  const gl = LGR.gl; if (!gl) return null; if (m.gl) return m.gl;
  if (m.big && !LGR.ext.uint) return null;
  const vb = gl.createBuffer(), ib = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, m.V, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.I, gl.STATIC_DRAW);
  m.gl = { vb: vb, ib: ib, type: m.big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, bytes: m.big ? 4 : 2 };
  return m.gl;
}
function lgGLFree(m) { if (!m || !m.gl || !LGR.gl) return; try { LGR.gl.deleteBuffer(m.gl.vb); LGR.gl.deleteBuffer(m.gl.ib); } catch (e) { } m.gl = null; }
function lgGLTex(img, lin) {
  const gl = LGR.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function lgGLAtlas() {
  const at = LG.atlas; if (!at || !at.done || !LGR.gl) return false;
  if (LGR.atlasVer === at.ver && LGR.tex.A) return true;
  const gl = LGR.gl; for (const k of ['A', 'H', 'AL']) if (LGR.tex[k]) gl.deleteTexture(LGR.tex[k]);
  LGR.tex.A = lgGLTex(at.A); LGR.tex.H = lgGLTex(at.H); LGR.tex.AL = lgGLTex(at.lo || at.A); LGR.atlasVer = at.ver;
  return true;
}
function lgGLWhite() { if (LGR.white) return LGR.white; const gl = LGR.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255])); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); return LGR.white = t; }
// a framebuffer with a colour texture (and a depth buffer)
function lgFBO(name, w, h, depth) {
  const gl = LGR.gl; let f = LGR.fbo[name];
  if (f && f.w === w && f.h === h) return f;
  if (f) { gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.tex); if (f.rb) gl.deleteRenderbuffer(f.rb); }
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  let rb = null; if (depth) { rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb); }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  f = { fb: fb, tex: tex, rb: rb, w: w, h: h }; LGR.fbo[name] = f; return f;
}
function lgAttribs(gl, P) {
  const s = LG_STRIDE * 4, set = (n, sz, off) => { const l = P.a[n]; if (l == null || l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, sz, gl.FLOAT, false, s, off * 4); };
  set('aP', 3, 0); set('aN', 3, 3); set('aU', 2, 6); set('aC', 4, 8); set('aM', 4, 12); set('aX', 2, 16);
}
// draw a model's bones with the program already in use (uMd per bone); hide: bones to leave out; mir: a mirror matrix
const LG_MD = lgM4();
function lgGLDrawModel(m, W, P, mir, hide) {
  const gl = LGR.gl, g = lgGLModel(m); if (!g) return 0;
  gl.bindBuffer(gl.ARRAY_BUFFER, g.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.ib); lgAttribs(gl, P);
  let n = 0;
  for (const r of m.runs) {
    if (hide && hide[r.b]) continue;
    const M = W.subarray(r.b * 16, r.b * 16 + 16);
    gl.uniformMatrix4fv(P.u.uMd, false, mir ? lgMul(LG_MD, mir, M) : M);
    gl.drawElements(gl.TRIANGLES, r.ni, g.type, r.i0 * g.bytes); n += r.ni / 3;
  }
  LG.tris += n; return n;
}

/* ---------- cameras ---------- */
function lgCam() { return { eye: [2, 0, 1.4], tgt: [0, 0, 1], up: [0, 0, 1], fov: 0.75, roll: 0, near: 0.05, far: 120, ortho: 0, V: lgM4(), P: lgM4(), VP: lgM4(), asp: 1 }; }
function lgCamUpd(c, asp) {
  c.asp = asp; lgLook(c.V, c.eye, c.tgt, c.up, c.roll);
  if (c.ortho) { const h = c.ortho, w = h * asp; lgOrtho(c.P, -w, w, -h, h, c.near, c.far); } else lgPersp(c.P, c.fov, asp, c.near, c.far);
  // an off-centre lens: the picture's centre moved (in screen halves), so a subject can sit in the part of the screen a panel leaves free
  if (c.shift && !c.ortho) { c.P[8] -= c.shift[0]; c.P[9] -= c.shift[1]; }
  lgMul(c.VP, c.P, c.V); return c;
}

/* ---------- animation: clips, players and cross-fades ---------- */
const LG_ANIMS = [], LG_ANIM_BY = {};
function lgAnimDef(a) { if (LG_ANIM_BY[a.id]) return; a.n = LG_ANIMS.length + 1; LG_ANIMS.push(a); LG_ANIM_BY[a.id] = a; }
// a player: the clip playing, its time, and the one it is fading from
function lgPlayer() { return { a: null, t: 0, sp: 1, prev: null, pt: 0, fade: 0, fadeDur: 0.25, P: lgPose(), P2: lgPose(), L: lgLocalNew(), L2: lgLocalNew(), W: lgWorldNew(), W2: lgWorldNew(), ev: [], evFired: -1, done: false, ctx: {} }; }
function lgPlay(pl, id, o) {
  o = o || {}; const a = LG_ANIM_BY[id]; if (!a) return false;
  if (pl.a === a && !o.restart) return true;
  if (pl.a && (o.fade == null || o.fade > 0)) { pl.prev = pl.a; pl.pt = pl.t; pl.fade = o.fade == null ? (a.fadeIn || 0.25) : o.fade; pl.fadeDur = pl.fade; pl.L2.R.set(pl.L.R); pl.L2.T.set(pl.L.T); }
  else { pl.prev = null; pl.fade = 0; }
  pl.a = a; pl.t = o.t || 0; pl.sp = o.sp || 1; pl.done = false; pl.evAt = pl.t; return true;
}
function lgClipT(a, t) { return a.loop ? ((t % a.dur) + a.dur) % a.dur : clamp(t, 0, a.dur); }
// evaluate a clip at time t into pose P (the clip writes joint angles, reach targets, props)
function lgEvalClip(a, t, P, ctx) { lgPoseReset(P); try { a.fn(P, lgClipT(a, t), ctx || {}, a); } catch (e) { coreHurt('LEGEND', e); } return P; }
// advance a player by dt and solve it; events between the old and new time fire through onEv
function lgTickPlayer(pl, dt, rootM, onEv) {
  const a = pl.a; if (!a) return pl.W;
  const t0 = pl.t; pl.t += dt * pl.sp;
  if (!a.loop && pl.t >= a.dur) { pl.t = a.dur; pl.done = true; }
  if (onEv && a.ev) for (const e of a.ev) { const et = e[0]; if (a.loop) { const c0 = Math.floor(t0 / a.dur), c1 = Math.floor(pl.t / a.dur); for (let c = c0; c <= c1; c++) { const at = c * a.dur + et; if (at > t0 && at <= pl.t) onEv(e[1], e[2]); } } else if (et > t0 && et <= pl.t) onEv(e[1], e[2]); }
  lgEvalClip(a, pl.t, pl.P, pl.ctx);
  lgSolve(pl.P, pl.L, pl.W, rootM || lgRootM(pl.P));
  if (pl.fade > 0 && pl.prev) {
    pl.fade = Math.max(0, pl.fade - dt); const k = 1 - pl.fade / pl.fadeDur, s = k * k * (3 - 2 * k);
    // the old clip keeps playing underneath as it fades
    pl.pt += dt; lgEvalClip(pl.prev, pl.pt, pl.P2, pl.ctx); lgSolve(pl.P2, pl.L2, pl.W2, rootM || lgRootM(pl.P2));
    lgBlendL(pl.L2, pl.L, s, pl.L); lgWorldAll(pl.W, pl.L, rootM || lgRootM(pl.P));
    if (pl.fade <= 0) pl.prev = null;
  }
  return pl.W;
}

/* ---------- in a run: the legend as the survivor, seen from above ---------- */
// what the player is doing -> a clip and a phase; frames are painted once and kept (16 phases a cycle)
function lgRunClass(fk) { return fk === 'pistol' || fk === 'revolver' ? 'p' : 'r'; }
function lgRunState(p) {
  let M = LG.mem.get(p); const now = G.time || 0;
  if (!M) { M = { x: p.x, y: p.y, t: now, vx: 0, vy: 0, ph: 0, clip: 'idle_ready', idle: 0 }; LG.mem.set(p, M); }
  const dt = Math.max(1e-3, Math.min(0.1, now - M.t)); if (now !== M.t) {
    const vx = (p.x - M.x) / dt, vy = (p.y - M.y) / dt; M.vx += (vx - M.vx) * Math.min(1, dt * 12); M.vy += (vy - M.vy) * Math.min(1, dt * 12);
    // the feet keep pace with the ground: phase advances with the distance travelled (metres) over the stride
    const dist = Math.hypot(p.x - M.x, p.y - M.y) / (PK || 1) * LG_UNIT * 0.9; M.x = p.x; M.y = p.y; M.t = now;
    const sp = Math.hypot(M.vx, M.vy) / (PK || 1) * LG_UNIT * 0.9, ang = Math.atan2(M.vy, M.vx) - (p.aim || 0), fwd = Math.cos(ang), side = Math.sin(ang);
    let clip = 'idle_ready', stride = 1.3;
    if (p.down) clip = 'down';
    else if (p.dashT > 0) clip = 'dash';
    else if (sp > 0.35) {
      if (sp > 4.2) { clip = 'run'; stride = 2.6; }
      else if (fwd > 0.55) { clip = 'walk_tac'; stride = 1.3; }
      else if (fwd < -0.55) { clip = 'backpedal'; stride = 1.0; }
      else { clip = side > 0 ? 'strafe_r' : 'strafe_l'; stride = 1.1; }
    }
    M.ph = (M.ph + dist / stride) % 1;
    if (clip === 'idle_ready') M.idle += dt; else M.idle = 0;
    M.clip = clip;
  }
  return M;
}
function lgSpriteFor(p) {
  if (!LG_ANIM_BY.idle_ready || !LG_MAKERS.operator) return null;
  const lgId = p === G.p ? (SET.legend || 'operator') : (p.lg || 'operator'); if (lgId === 'none') return null;
  const cls = p === G.p ? (SET.legendClass || 'attack') : (p.lc || 'attack');
  const w = p.weapon || {}, fk = (w.F && w.F.key) || 'pistol', wc = lgRunClass(fk), gl = GUN_LEN[fk] || 16;
  const M = lgRunState(p), a = LG_ANIM_BY[M.clip] || LG_ANIM_BY.idle_ready;
  const loopy = a.loop, nph = M.clip === 'idle_ready' ? 12 : loopy ? 16 : 8;
  let ph;
  if (M.clip === 'idle_ready') ph = Math.floor(((G.time || 0) / a.dur % 1) * 12);
  else if (M.clip === 'dash') ph = Math.floor(clamp(1 - p.dashT / (p.dashDur || 0.2), 0, 0.999) * nph);
  else if (M.clip === 'down') ph = nph - 1;
  else ph = Math.floor(M.ph * nph) % nph;
  const px = SPR * PK, key = lgSprKey(lgId, cls, M.clip, ph, wc, gl, px);
  let s = LG.sprites.get(key);
  if (s) { LG.sprites.delete(key); LG.sprites.set(key, s); return s; }
  // a new frame costs a few milliseconds: at most two a frame, otherwise the nearest one already painted
  if (LG.spriteBudget <= 0) { for (let d = 1; d < nph; d++) { const k2 = key.replace('|' + ph + '|', '|' + ((ph + d) % nph) + '|'); const s2 = LG.sprites.get(k2); if (s2) return s2; } if (LG.spriteBudget < -6) return null; }
  LG.spriteBudget--;
  s = lgSpriteMake(lgId, cls, a, ph / nph * a.dur, wc, gl, px);
  if (s) { LG.sprites.set(key, s); const cap = [120, 160, 240, 320][LG.lvl | 0] || 240; while (LG.sprites.size > cap) LG.sprites.delete(LG.sprites.keys().next().value); }
  return s;
}
const LG_SPR = { pl: null, cam: null };
// a frame depends on the legend, his class, the clip and phase, pistol or long gun, and the size; not on which gun
// exactly (the poses are the same for every pistol and every long gun), nor on how big the texture atlas is
function lgSprKey(lgId, cls, clip, ph, wc, gl, px) { return lgId + '|' + cls + '|' + clip + '|' + ph + '|' + wc + '|' + Math.round(px * 100) + '|' + (LG.atlas && LG.atlas.done ? 't' : 'f'); }
// on the main menu, between frames: the rest of the run's frames are painted one at a time, so a run starts with them ready
const LG_WARM_CLIPS = [['idle_ready', 12], ['walk_tac', 16], ['backpedal', 16], ['strafe_l', 16], ['strafe_r', 16], ['run', 16], ['dash', 8], ['down', 8]];
function legendIdleWarm() {
  if (SET.legend === 'none' || !LG_ANIM_BY.idle_ready || !LG.atlas || !LG.atlas.done) return;
  const now = performance.now(); if (now - (LG.warmT || 0) < 140 || (PERF.fps && PERF.fps < 40)) return; LG.warmT = now;
  if (typeof lgvWarm === 'function' && typeof ARMS_ON !== 'undefined' && ARMS_ON) { try { if (lgvWarm(1)) return; } catch (e) { lgHurt(e); } }   // LEGEND v2's frames first
  const lgId = SET.legend || 'operator', cls = SET.legendClass || 'attack', px = SPR * PK, w = WEAPONS[loadoutId()] || WEAPONS[0] || {}, fk = (w.F && w.F.key) || 'pistol', wcs = [lgRunClass(fk)];
  if (wcs[0] !== 'p') wcs.push('p');
  for (const wc of wcs) for (const [clip, n] of LG_WARM_CLIPS) {
    const a = LG_ANIM_BY[clip]; if (!a) continue;
    for (let ph = clip === 'down' ? n - 1 : 0; ph < n; ph++) {
      const k = lgSprKey(lgId, cls, clip, ph, wc, 0, px); if (LG.sprites.has(k)) continue;
      try { const s2 = lgSpriteMake(lgId, cls, a, ph / n * a.dur, wc, 16, px); if (s2) LG.sprites.set(k, s2); } catch (e) { lgHurt(e); }
      return;
    }
  }
}
// the loader's jobs: a small atlas (painted at once), then the frames of standing and walking for the deployed legend
function legendWarmJobs() {
  const jobs = [];
  if (SET.legend === 'none') return jobs;
  jobs.push(() => { if (!LG.atlas || !LG.atlas.done) { const at = lgAtlasNew(128); while (!lgAtlasStep(at)) { } LG.atlas = at; LG.atlasT = 128; } });
  const warm = (clip, n, from, to) => () => { try { const a = LG_ANIM_BY[clip], lgId = SET.legend || 'operator', cls = SET.legendClass || 'attack', px = SPR * PK, w = (G.p && G.p.weapon) || WEAPONS[0] || {}, fk = (w.F && w.F.key) || 'pistol', wc = lgRunClass(fk), gl = GUN_LEN[fk] || 16;
    for (let ph = from; ph < to; ph++) { const k = lgSprKey(lgId, cls, clip, ph, wc, gl, px); if (LG.sprites.has(k)) continue; const s = lgSpriteMake(lgId, cls, a, ph / n * a.dur, wc, gl, px); if (s) LG.sprites.set(k, s); } } catch (e) { lgHurt(e); } };
  if (typeof lgvWarm === 'function' && typeof ARMS_ON !== 'undefined' && ARMS_ON) { for (let i = 0; i < 6; i++) jobs.push(() => { try { lgvWarm(7); } catch (e) { lgHurt(e); } }); return jobs; }
  jobs.push(warm('idle_ready', 12, 0, 12)); jobs.push(warm('walk_tac', 16, 0, 8)); jobs.push(warm('walk_tac', 16, 8, 16));
  return jobs;
}
function lgSpriteMake(lgId, cls, a, t, wc, gl, px) {
  const t0 = performance.now();
  const m = lgModel(lgId, 2, cls); if (!m) return null;
  if (!LG_SPR.pl) { LG_SPR.pl = lgPlayer(); LG_SPR.L = lgLocalNew(); LG_SPR.W = lgWorldNew(); }
  const P = lgPose(); lgEvalClip(a, t, P, { run: true, wc: wc, gl: gl });
  P.root[0] = 0; P.root[1] = 0; P.root[2] = 0; P.root[3] = 0;
  const W = lgSolve(P, LG_SPR.L, LG_SPR.W, lgRootM(P));
  // LEGEND's level: supersampled frames at 2 and 3, plain ones at 0 and 1
  const half = 48, size = Math.max(8, Math.ceil(half * 2 * px)), ss = (LG.lvl >= 2 ? (size < 48 ? 2 : 1.5) : 1), S = Math.ceil(size * ss);
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const tc = LG_SPR.tmp && LG_SPR.tmp.width === S ? LG_SPR.tmp : (LG_SPR.tmp = (() => { const k = document.createElement('canvas'); k.width = k.height = S; return k; })());
  const g = tc.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S);
  // straight down: x forward is screen right, y left is screen up; a metre is 1/LG_UNIT sprite units
  const VP = lgM4(), ext = half * LG_UNIT; lgOrtho(VP, -ext, ext, -ext, ext, -5, 5);
  const view = lgM4(); view[0] = 1; view[5] = 1; view[10] = 1;   // screen x = world x, screen up = world y
  const L = { key: [-0.25, 0.35, 0.9, 1.15, 1.1, 1.02], rim: [-0.6, -0.4, 0.3, 0.25, 0.28, 0.32], sky: [0.34, 0.36, 0.42], gnd: [0.1, 0.1, 0.1], acc: lgHex((LG_CLASS_BY[cls] || LG_CLASSES[0]).col), glow: 1, view: [0, 0, 1] };
  { const k = L.key, l = Math.hypot(k[0], k[1], k[2]); k[0] /= l; k[1] /= l; k[2] /= l; }
  lg2D(g, m, W, lgMul(lgM4(), VP, view), S, S, L, { grow: 0.5 * ss, hide: LG_SPR_HIDE(wc) });
  const out = c.getContext('2d'); out.imageSmoothingEnabled = true; if ('imageSmoothingQuality' in out) out.imageSmoothingQuality = 'high'; out.drawImage(tc, 0, 0, S, S, 0, 0, size, size);
  // where the muzzle ended up (sprite units), so the flash and the smoke come out of the real barrel
  const mi = wc === 'p' ? LGB.pistol : LGB.carbine, MW = W.subarray(mi * 16, mi * 16 + 16), mo = lgSockFor(wc === 'p' ? 'pistol' : 'carbine', 'muz'), mz = lgPt(MW, mo[0], mo[1], mo[2]);
  const dt = performance.now() - t0; LG.spriteMs += dt; LG.spriteMade++; coreCost('LEGEND', dt);
  return { c: c, half: half, mx: mz[0] / LG_UNIT, my: -mz[1] / LG_UNIT };
}
// in a run, long guns are drawn by the carbine; pistols by the pistol (the other prop stays stowed)
function LG_SPR_HIDE(wc) { const h = new Uint8Array(LG_NB_MAX); if (wc === 'p') { h[LGB.carbine] = 1; h[LGB.cmag] = 1; } return h; }
// drawPlayer asks this first: true when it drew the legend (the old sprite stays as the fallback)
function legendDrawPlayer(p, ctx2, fk, gl) {
  if (SET.legend === 'none' || !LG_ANIM_BY.idle_ready) return null;
  if (LG.offUntil && performance.now() < LG.offUntil) return null;
  // a fresh budget each frame: two new frames painted at most (one when the engine is trimmed)
  if (LG.budT !== G.time) { LG.budT = G.time; LG.spriteBudget = LG.adapt < 0 ? 1 : 2; if (typeof lgLevel === 'function') lgLevel(); }
  // 1.9.993: with the rebuilt guns, LEGEND v2 draws him in three parts that turn on their own (legrun.js)
  if (p.weapon && p.weapon.arms && typeof lgvDraw === 'function') { try { const r = lgvDraw(p, ctx2); if (r) { r.rot = (p.lgAim || p.aim || 0) - (p.aim || 0); r.v2 = true; return r; } } catch (e) { lgHurt(e); } }
  let s = null; try { s = lgSpriteFor(p); } catch (e) { lgHurt(e); return null; }
  if (!s) return null;
  ctx2.drawImage(s.c, -s.half, -s.half, s.half * 2, s.half * 2);
  return s;
}
function lgHurt(e) {
  const now = performance.now(); coreHurt('LEGEND', e); LG.lastErr = String(e && e.message || e).slice(0, 120); try { console.error(e); } catch (x) { }
  LG.errT.push(now); while (LG.errT.length && now - LG.errT[0] > 10000) LG.errT.shift();
  if (LG.errT.length >= 6) { LG.offUntil = now + 60000; LG.errT.length = 0; coreRepaired('LEGEND', 'Legends: back to the old survivor for a minute after errors'); }
}

/* ---------- drawing a scene: shadows, puddle reflections, then everything lit ---------- */
// S: { cam, items: [{ m, W, hide, acc: [r,g,b] linear, glow, ground, noShadow, noRefl }], key: { dir, col }, rim: { dir, col },
//      sky, gnd, pts: [{ p, r, col }] (up to 4), flash: { dir, col }, fog: { col, d, h, s }, wet, time, expo, sat, desat,
//      grade: [k, r, g, b], shadow: { on, c: [x,y,z], r, size }, refl: { on, z, scale }, clear: [r,g,b] }
const LG_ZERO3 = [0, 0, 0];
const LG_MIR = (() => { const m = lgM4(); m[10] = -1; return m; })();
function lgV3n(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function lgGLScene(S, w, h, target) {
  const gl = LGR.gl; if (!gl || !LGR.ok) return false;
  const atl = lgGLAtlas(), white = lgGLWhite(), P = LGR.P.scene;
  const items = S.items, cam = S.cam;
  lgCamUpd(cam, w / h);
  // 1. the shadow map, from the key light
  let LVP = LG_TMP.lvp || (LG_TMP.lvp = lgM4()), shOn = !!(S.shadow && S.shadow.on);
  if (shOn) {
    const sz = S.shadow.size || 1024, f = lgFBO('shadow', sz, sz, true), D = LGR.P.depth, c = S.shadow.c, r = S.shadow.r, d = lgV3n(S.key.dir);
    const eye = [c[0] + d[0] * r * 2, c[1] + d[1] * r * 2, c[2] + d[2] * r * 2], V = lgLook(lgM4(), eye, c, Math.abs(d[2]) > 0.95 ? [1, 0, 0] : [0, 0, 1]), Pm = lgOrtho(lgM4(), -r, r, -r, r, 0.05, r * 4);
    lgMul(LVP, Pm, V);
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb); gl.viewport(0, 0, sz, sz); gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    gl.useProgram(D.p); gl.uniformMatrix4fv(D.u.uVP, false, LVP);
    for (const it of items) if (!it.noShadow && !it.ground) lgGLDrawModel(it.m, it.W, D, null, it.hide);
  }
  // uniforms shared by the reflection and main passes
  const setU = (refl) => {
    gl.useProgram(P.p); const U = P.u;
    gl.uniformMatrix4fv(U.uVP, false, cam.VP); gl.uniformMatrix4fv(U.uLVP, false, LVP);
    gl.uniform3fv(U.uEye, cam.eye); gl.uniform2f(U.uGrid, LT_COLS, LT_ROWS);
    const T = LG.atlas ? LG.atlas.T : 64; gl.uniform1f(U.uTx, 0.5 / T); gl.uniform1f(U.uTT, T);
    gl.uniform3fv(U.uKD, lgV3n(S.key.dir)); gl.uniform3fv(U.uKC, S.key.col); gl.uniform3fv(U.uRD, lgV3n(S.rim.dir)); gl.uniform3fv(U.uRC, S.rim.col);
    gl.uniform3fv(U.uSky, S.sky); gl.uniform3fv(U.uGnd, S.gnd);
    const pl = new Float32Array(16), pc = new Float32Array(12); (S.pts || []).slice(0, 4).forEach((q, i) => { pl[i * 4] = q.p[0]; pl[i * 4 + 1] = q.p[1]; pl[i * 4 + 2] = q.p[2]; pl[i * 4 + 3] = q.r; pc[i * 3] = q.col[0]; pc[i * 3 + 1] = q.col[1]; pc[i * 3 + 2] = q.col[2]; });
    gl.uniform4fv(U.uPL, pl); gl.uniform3fv(U.uPC, pc);
    const fl = S.flash || { dir: [0, 0, 1], col: [0, 0, 0] }; gl.uniform3fv(U.uFlD, lgV3n(fl.dir)); gl.uniform3fv(U.uFlC, fl.col);
    const fg = S.fog || { col: [0, 0, 0], d: 0, h: 0, s: 0 }; gl.uniform3fv(U.uFogC, fg.col); gl.uniform3f(U.uFog, fg.d, fg.h, fg.s);
    gl.uniform1f(U.uWet, S.wet || 0); gl.uniform1f(U.uTime, S.time || 0); gl.uniform1f(U.uExpo, S.expo || 1); gl.uniform1f(U.uDesat, S.desat || 0); gl.uniform1f(U.uSat, S.sat == null ? 1 : S.sat);
    const gr = S.grade || [1, 0, 0, 0]; gl.uniform4f(U.uGrade, gr[0], gr[1], gr[2], gr[3]);
    gl.uniform1f(U.uShOn, shOn && !refl ? 1 : 0); gl.uniform1f(U.uShTx, 1 / ((S.shadow && S.shadow.size) || 1024));
    gl.uniform2f(U.uRes, w, h);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atl ? LGR.tex.A : white); gl.uniform1i(U.uA, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, atl ? LGR.tex.AL : white); gl.uniform1i(U.uAL, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, atl ? LGR.tex.H : white); gl.uniform1i(U.uH, 2);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, shOn ? LGR.fbo.shadow.tex : white); gl.uniform1i(U.uSh, 3);
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, !refl && S.refl && S.refl.on && LGR.fbo.refl ? LGR.fbo.refl.tex : white); gl.uniform1i(U.uRf, 4);
    gl.uniform1f(U.uRfOn, !refl && S.refl && S.refl.on ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
  };
  const drawItems = (mir) => {
    const U = P.u;
    for (const it of items) {
      if (mir && (it.ground || it.noRefl)) continue;
      const acc = it.acc || [1, 0.3, 0.2]; gl.uniform3f(U.uAcc, acc[0], acc[1], acc[2]); gl.uniform1f(U.uGlow, it.glow == null ? 1 : it.glow);
      gl.uniform3fv(U.uRC, it.rim || (it.noRim ? LG_ZERO3 : S.rim.col));   // each item can carry its own rim light (the line-up's class colours)
      lgGLDrawModel(it.m, it.W, P, mir, it.hide);
    }
  };
  // 2. the reflection in the puddles: everything mirrored under the ground, at a lower resolution
  if (S.refl && S.refl.on) {
    const k = S.refl.scale || 0.5, rw = Math.max(16, Math.round(w * k)), rh = Math.max(16, Math.round(h * k)), f = lgFBO('refl', rw, rh, true);
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb); gl.viewport(0, 0, rw, rh); const cc = S.clear || [0, 0, 0]; gl.clearColor(cc[0], cc[1], cc[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); setU(true);
    const mir = lgM4(); mir[10] = -1; mir[14] = 2 * (S.refl.z || 0);
    drawItems(mir);
  }
  // 3. the scene
  gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null); gl.viewport(0, 0, w, h);
  const cc = S.clear || [0, 0, 0]; gl.clearColor(cc[0], cc[1], cc[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); setU(false);
  drawItems(null);
  return true;
}
// the same scene on the processor: items back to front, each painted
function lg2DScene(g, S, w, h) {
  const cam = S.cam; lgCamUpd(cam, w / h);
  const cc = S.clear || [0, 0, 0]; g.fillStyle = 'rgb(' + Math.round(Math.pow(cc[0], 1 / 2.2) * 255) + ',' + Math.round(Math.pow(cc[1], 1 / 2.2) * 255) + ',' + Math.round(Math.pow(cc[2], 1 / 2.2) * 255) + ')'; g.fillRect(0, 0, w, h);
  const kd = lgV3n(S.key.dir), rd = lgV3n(S.rim.dir);
  const order = S.items.slice().sort((a, b) => (b.ground ? 1e9 : lgDist2(b, cam)) - (a.ground ? 1e9 : lgDist2(a, cam)));
  for (const it of order) {
    const L = { key: [kd[0], kd[1], kd[2], S.key.col[0], S.key.col[1], S.key.col[2]], rim: [rd[0], rd[1], rd[2], S.rim.col[0], S.rim.col[1], S.rim.col[2]], sky: S.sky, gnd: S.gnd, acc: it.acc || [1, 0.3, 0.2], glow: it.glow == null ? 1 : it.glow, eye: cam.eye };
    lg2D(g, it.m, it.W, cam.VP, w, h, L, { hide: it.hide, grow: 0.6 });
  }
}
function lgDist2(it, cam) { const W = it.W, i = (it.m.runs[0] || { b: 0 }).b * 16; const dx = W[i + 12] - cam.eye[0], dy = W[i + 13] - cam.eye[1], dz = W[i + 14] - cam.eye[2]; return dx * dx + dy * dy + dz * dz; }
