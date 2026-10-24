/* ================= FLORA: trees, bushes and grass in 3D (1.9.9991) =================
   The 3D view's trees were lumpy balls on sticks and its grass five green slivers here and there. FLORA grows them:
   - Trees by kind, at a street tree's real size (an oak or a maple 8 to 14 m with a crown as wide, a pine taller and
     narrower): a tapering trunk in bark, the main limbs and the twigs off them, and a crown of leaf clusters (cards cut
     from a painted leaf atlas: broad leaves, needles on their twigs, blossom), lit through (the sun shows through a
     crown from behind), darker inside, swaying with the wind and gusts, the leaves fluttering. Bare in winter (the pines
     keep their needles), red and gold in the fall, pink in spring where they blossom; burnt black in the burning
     districts, grey under the ash. Dead trees are limbs and twigs.
   - Bushes and hedges: domes of small leaf clusters.
   - Grass: a field of blades round the camera wherever the ground is painted green (lawns, parks, lots, verges, the
     suburbs' yards, the wild edges of the city): tens of thousands of them in clumps, cut short on the lawns and long on
     the lots, browned in late summer and the fall, gone under snow, with wildflowers in spring and summer; the wind runs
     across them in waves and they part round your feet. It is one draw, placed on the graphics chip from a map of the
     ground round you that is redrawn as you walk.
   Each block's trees and bushes are two meshes; the grass is one for the whole view. All of it steps down with the 3D
   level (fewer clumps, a smaller field, no grass on the weakest devices). */
const FLORA = { ok: false, tex: null, mats: {}, grass: null, mask: null, maskT: null, maskAt: null, trees: 0, cards: 0, blades: 0, tests: null, gust: 0, gt: 0 };
const FL_U = { uWindV: { value: typeof THREE !== 'undefined' ? new THREE.Vector2(0.5, 0.2) : null }, uGust: { value: 0 }, uSunD: { value: typeof THREE !== 'undefined' ? new THREE.Vector3(0, 1, 0) : null }, uSunC: { value: typeof THREE !== 'undefined' ? new THREE.Color(1, 1, 1) : null } };

/* ---------- the leaf atlas: four tiles of 512 px (broad leaves, needles, blossom, small leaves) ---------- */
function floraAtlas() {
  if (FLORA.tex) return FLORA.tex;
  const N = 1024, T = 512, cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d'), R = Z.mulberry32(0x1eaf);
  const leaf = (cx, cy, len, wid, ang, v, warm) => {
    x.save(); x.translate(cx, cy); x.rotate(ang); const g = Math.round(v), r = Math.round(v * (0.86 + warm * 0.12)), b = Math.round(v * 0.74);
    x.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')'; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(len * 0.45, -wid, len, 0); x.quadraticCurveTo(len * 0.45, wid, 0, 0); x.fill();
    x.strokeStyle = 'rgba(40,50,30,0.35)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, 0); x.lineTo(len * 0.92, 0); x.stroke(); x.restore(); };
  // 0: broad leaves in a cluster, darker toward its heart, a twig through it
  x.save(); x.beginPath(); x.rect(0, 0, T, T); x.clip();
  x.strokeStyle = 'rgb(70,60,48)'; x.lineWidth = 6; x.beginPath(); x.moveTo(T * 0.5, T * 0.98); x.quadraticCurveTo(T * 0.45, T * 0.6, T * 0.52, T * 0.25); x.stroke();
  for (let i = 0; i < 230; i++) { const a = R() * TAU, rr = Math.sqrt(R()) * T * 0.42, cx = T / 2 + Math.cos(a) * rr, cy = T / 2 + Math.sin(a) * rr * 0.95; leaf(cx, cy, 30 + R() * 22, 11 + R() * 8, a + (R() - 0.5) * 1.6, 120 + R() * 120 * (0.55 + 0.45 * rr / (T * 0.42)), R()); }
  x.restore();
  // 1: a conifer's skirt of branches, hanging from its top edge (wrapped left to right so a ring of these closes without a
  // seam): dense needles near the trunk, fronds of needles hanging out to a ragged hem
  x.save(); x.beginPath(); x.rect(T, 0, T, T); x.clip();
  const needle = (px, py, a, l, v) => { x.strokeStyle = 'rgb(' + Math.round(v * 0.8) + ',' + Math.round(v) + ',' + Math.round(v * 0.76) + ')'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); };
  for (let i = 0; i < 1500; i++) { const px = T + R() * T, py = R() * T * 0.34, v = (95 + R() * 90) * (0.7 + 0.3 * py / (T * 0.34)); needle(px, py, Math.PI * (0.2 + R() * 0.6), 14 + R() * 14, v); }
  for (let f = 0; f < 9; f++) {
    const fx = (f + R() * 0.6) / 9 * T, fy0 = T * (0.04 + R() * 0.14), fy1 = T * (0.72 + R() * 0.25), bend = (R() - 0.5) * T * 0.12;
    for (const wrap of [0, -T, T]) {
      const X = (y) => T + fx + wrap + bend * Math.pow((y - fy0) / (fy1 - fy0), 2);
      x.strokeStyle = 'rgb(76,62,48)'; x.lineWidth = 4; x.beginPath(); x.moveTo(X(fy0), fy0); for (let y = fy0; y <= fy1; y += 12) x.lineTo(X(y), y); x.stroke();
      const n = 150;
      for (let k = 0; k < n; k++) {
        const u = R(), y = fy0 + (fy1 - fy0) * u, s = R() < 0.5 ? -1 : 1, l = (16 + R() * 22) * (1.1 - 0.6 * u), v = (110 + R() * 120) * (0.72 + 0.28 * u);
        needle(X(y) + s * R() * 4, y, Math.PI / 2 - s * (0.55 + R() * 0.7), l, v);
      }
      // side twigs off the frond, needled
      for (let k = 0; k < 5; k++) { const u = 0.15 + k * 0.15 + R() * 0.08, y = fy0 + (fy1 - fy0) * u, s = k % 2 ? -1 : 1, tl = (40 + R() * 40) * (1.1 - u * 0.7), ta = Math.PI / 2 - s * (0.7 + R() * 0.4), tx = X(y);
        for (let m = 0; m < 30; m++) { const w = R(), qx = tx + Math.cos(ta) * tl * w, qy = y + Math.sin(ta) * tl * w, ss = R() < 0.5 ? -1 : 1; needle(qx, qy, ta - ss * (0.6 + R() * 0.5), 10 + R() * 10, (120 + R() * 110) * (0.75 + 0.25 * u)); } }
    }
  }
  x.restore();
  // 2: blossom: five-petal flowers over a few leaves
  x.save(); x.beginPath(); x.rect(0, T, T, T); x.clip();
  for (let i = 0; i < 70; i++) { const a = R() * TAU, rr = Math.sqrt(R()) * T * 0.4; leaf(T / 2 + Math.cos(a) * rr, T + T / 2 + Math.sin(a) * rr, 26 + R() * 14, 10 + R() * 5, R() * TAU, 120 + R() * 80, R()); }
  for (let i = 0; i < 260; i++) { const a = R() * TAU, rr = Math.sqrt(R()) * T * 0.43, cx = T / 2 + Math.cos(a) * rr, cy = T + T / 2 + Math.sin(a) * rr, s = 5 + R() * 5, w = 220 + R() * 35;
    x.fillStyle = 'rgb(' + Math.round(w) + ',' + Math.round(w * 0.9) + ',' + Math.round(w * 0.93) + ')'; for (let p = 0; p < 5; p++) { const pa = p / 5 * TAU + a; x.beginPath(); x.arc(cx + Math.cos(pa) * s * 0.8, cy + Math.sin(pa) * s * 0.8, s * 0.62, 0, TAU); x.fill(); }
    x.fillStyle = 'rgb(230,200,120)'; x.beginPath(); x.arc(cx, cy, s * 0.35, 0, TAU); x.fill(); }
  x.restore();
  // 3: small leaves, dense (bushes and hedges)
  x.save(); x.beginPath(); x.rect(T, T, T, T); x.clip();
  for (let i = 0; i < 420; i++) { const a = R() * TAU, rr = Math.sqrt(R()) * T * 0.45; leaf(T + T / 2 + Math.cos(a) * rr, T + T / 2 + Math.sin(a) * rr, 16 + R() * 12, 6 + R() * 5, R() * TAU, 110 + R() * 130 * (0.5 + 0.5 * rr / (T * 0.45)), R()); }
  x.restore();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(4, DEPTH.R.capabilities.getMaxAnisotropy()); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return FLORA.tex = t;
}

/* ---------- materials ---------- */
// leaves: alpha-cut clusters, both sides lit as one rounded crown (the normals point out from the crown's middle), light
// through them from behind, swaying (aS: the tree's base x and z, how high up its crown this is 0..1, a phase)
const FL_WIND_V = `
  uniform vec2 uWindV; uniform float uGust;
  vec3 floraSway(vec3 p, vec4 s) { float h = s.z * s.z, t = uTime;
    float w = sin(t * 1.1 + s.w + s.x * 0.21 + s.y * 0.17) * 0.55 + sin(t * 2.3 + s.w * 1.7) * 0.25 + uGust * 0.9;
    vec2 d = uWindV * (0.35 + 0.65 * length(uWindV)) * w * h * 0.55;
    float fl = sin(t * 7.0 + s.w * 13.0 + p.y * 3.0) * 0.035 * (0.3 + length(uWindV)) * s.z;
    return p + vec3(d.x + fl, -abs(w) * h * 0.04, d.y - fl * 0.7); }
`;
function floraMats() {
  const M = FLORA.mats, tex = floraAtlas();
  M.leaf = dPatch(new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.82, metalness: 0, envMapIntensity: 0.5 }), {
    key: 'leaf3', uniforms: Object.assign({}, FL_U),
    vHead: 'attribute vec4 aS; varying float vIn; varying vec3 vWpL;\n' + FL_WIND_V,
    vBegin: 'transformed = floraSway(transformed, aS); vIn = aS.z;',
    vMain: 'vWpL = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    fHead: 'uniform vec3 uSunD, uSunC; varying float vIn; varying vec3 vWpL;\n',
    fColor: '{ float n = dN(vWpL.xz * 0.7 + vWpL.y * 0.5); diffuseColor.rgb *= (0.62 + 0.45 * vIn) * (0.82 + 0.36 * n); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.9, 0.95), uSnow * smoothstep(0.3, 0.9, vNormal.y) * 0.6); }',
    fEmis: '{ vec3 V = normalize(vWpL - cameraPosition); float tr = pow(max(0.0, dot(V, normalize(uSunD))), 3.0) * (1.0 - uNight); totalEmissiveRadiance += diffuseColor.rgb * uSunC * tr * 0.55; }'
  });
  const obc = M.leaf.onBeforeCompile; M.leaf.onBeforeCompile = (sh, r) => { obc(sh, r); sh.fragmentShader = sh.fragmentShader.replace('float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;', 'float faceDirection = 1.0;'); };
  // their shadows: the same cut-outs, swaying the same way
  M.leafD = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.42, side: THREE.DoubleSide });
  M.leafD.onBeforeCompile = sh => { Object.assign(sh.uniforms, FL_U, { uTime: DU.uTime }); sh.vertexShader = 'uniform float uTime;\nattribute vec4 aS;\n' + FL_WIND_V + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed = floraSway(transformed, aS);'); };
  M.leafD.customProgramCacheKey = () => 'leafD3';
  FLORA.ok = true;
}

/* ---------- geometry helpers ---------- */
// a limb: a tapering tube from A to B (radii r0, r1), n sides, into builder G
function flLimb(G, A, Bp, r0, r1, n, col, aux) {
  const dx = Bp[0] - A[0], dy = Bp[1] - A[1], dz = Bp[2] - A[2], l = Math.hypot(dx, dy, dz) || 1, ax = [dx / l, dy / l, dz / l];
  let u = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let px = [ax[1] * u[2] - ax[2] * u[1], ax[2] * u[0] - ax[0] * u[2], ax[0] * u[1] - ax[1] * u[0]]; const pl = Math.hypot(px[0], px[1], px[2]); px = px.map(v => v / pl);
  const py = [ax[1] * px[2] - ax[2] * px[1], ax[2] * px[0] - ax[0] * px[2], ax[0] * px[1] - ax[1] * px[0]];
  for (let i = 0; i < n; i++) {
    const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1), cm = Math.cos((a0 + a1) / 2), sm = Math.sin((a0 + a1) / 2);
    const P = (base, r, c, s) => [base[0] + (px[0] * c + py[0] * s) * r, base[1] + (px[1] * c + py[1] * s) * r, base[2] + (px[2] * c + py[2] * s) * r];
    const N = [px[0] * cm + py[0] * sm, px[1] * cm + py[1] * sm, px[2] * cm + py[2] * sm];
    dQuad(G, P(A, r0, c1, s1), P(A, r0, c0, s0), P(Bp, r1, c0, s0), P(Bp, r1, c1, s1), N, col, aux, [a1 * 0.3, 0], [a0 * 0.3, 0], [a0 * 0.3, l], [a1 * 0.3, l]);
  }
}
// a leaf card: centre P, size s, facing nrm (roughly), turned by spin; uv tile k (0..3); the crown's centre C gives the
// normals; base (bx, bz), height share h and phase ph go to aS for the wind
function flCard(G, P, s, nrm, spin, k, col, C, bx, bz, h, ph) {
  let n = nrm, nl = Math.hypot(n[0], n[1], n[2]) || 1; n = [n[0] / nl, n[1] / nl, n[2] / nl];
  let u = Math.abs(n[1]) < 0.95 ? [0, 1, 0] : [1, 0, 0];
  let t = [u[1] * n[2] - u[2] * n[1], u[2] * n[0] - u[0] * n[2], u[0] * n[1] - u[1] * n[0]]; const tl = Math.hypot(t[0], t[1], t[2]) || 1; t = t.map(v => v / tl);
  let b = [n[1] * t[2] - n[2] * t[1], n[2] * t[0] - n[0] * t[2], n[0] * t[1] - n[1] * t[0]];
  const cs = Math.cos(spin), sn = Math.sin(spin), T2 = [t[0] * cs + b[0] * sn, t[1] * cs + b[1] * sn, t[2] * cs + b[2] * sn], B2 = [b[0] * cs - t[0] * sn, b[1] * cs - t[1] * sn, b[2] * cs - t[2] * sn];
  const u0 = (k % 2) * 0.5, v0 = k < 2 ? 0.5 : 0, h2 = s / 2, v = G.nv;
  const corners = [[-1, -1, u0, v0], [1, -1, u0 + 0.5, v0], [1, 1, u0 + 0.5, v0 + 0.5], [-1, 1, u0, v0 + 0.5]];
  for (const [cx, cy, uu, vv] of corners) {
    const p = [P[0] + T2[0] * cx * h2 + B2[0] * cy * h2, P[1] + T2[1] * cx * h2 + B2[1] * cy * h2, P[2] + T2[2] * cx * h2 + B2[2] * cy * h2];
    const o = [p[0] - C[0], (p[1] - C[1]) * 1.3, p[2] - C[2]], ol = Math.hypot(o[0], o[1], o[2]) || 1, nn = [o[0] / ol * 0.75 + n[0] * 0.25, o[1] / ol * 0.75 + n[1] * 0.25, o[2] / ol * 0.75 + n[2] * 0.25];
    G.p.push(p[0], p[1], p[2]); G.n.push(nn[0], nn[1], nn[2]); G.c.push(col[0], col[1], col[2]); G.u.push(uu, vv); G.a.push(bx, bz, clamp(h + cy * 0.08, 0, 1), ph); G.f.push(0, 0);
  }
  G.i.push(v, v + 1, v + 2, v, v + 2, v + 3); G.nv += 4; FLORA.cards++;
}

// a skirt of branches round a trunk: a ring of seg quads from radius r0 at height y (at the trunk) out and down to r1 at
// y - drop, each showing the whole skirt tile (1); the normals lean out and up; the rim is jittered so no two match
function flCone(G, x, y, z, r0, r1, drop, seg, a0, lc, bx, bz, h, ph, R) {
  const ring = [];
  for (let i = 0; i <= seg; i++) { const j = i === seg ? ring[0][2] : 0.82 + R() * 0.32; ring.push([a0 + i / seg * TAU, 0, j]); }
  for (let i = 0; i < seg; i++) {
    const A0 = ring[i], A1 = ring[i + 1], col = lc(), v = G.nv;
    const pts = [[A0[0], 0, A0[2]], [A1[0], 0, A1[2]]];
    const P = (a, out, j) => out ? [x + Math.cos(a) * r1 * j, y - drop * (0.8 + 0.2 * j), z + Math.sin(a) * r1 * j] : [x + Math.cos(a) * r0, y, z + Math.sin(a) * r0];
    const N = (a) => { const nx = Math.cos(a) * drop, ny = r1 - r0, nz = Math.sin(a) * drop, l = Math.hypot(nx, ny, nz) || 1; return [nx / l * 0.8, ny / l * 0.8 + 0.25, nz / l * 0.8]; };
    // corners: inner-left, inner-right, outer-right, outer-left (uv: the tile's top edge at the trunk)
    const C = [[P(pts[0][0], false), N(pts[0][0]), 0.5, 1.0, h], [P(pts[1][0], false), N(pts[1][0]), 1.0, 1.0, h], [P(pts[1][0], true, pts[1][2]), N(pts[1][0]), 1.0, 0.5, h + 0.12], [P(pts[0][0], true, pts[0][2]), N(pts[0][0]), 0.5, 0.5, h + 0.12]];
    for (const [p, n, uu, vv, hh] of C) { G.p.push(p[0], p[1], p[2]); G.n.push(n[0], n[1], n[2]); G.c.push(col[0], col[1], col[2]); G.u.push(uu, vv); G.a.push(bx, bz, clamp(hh, 0, 1), ph + i * 0.7); G.f.push(0, 0); }
    G.i.push(v, v + 1, v + 2, v, v + 2, v + 3); G.nv += 4; FLORA.cards++;
  }
}

/* ---------- a tree, a bush ---------- */
// Wd: the wood (the plain material, in bark); Lv: the leaves. x, z, y0 in the block's metres; t the world's tree record
function floraTree(Wd, Lv, t, x, y0, z, sea, bio, win, k) {
  const R = Z.mulberry32(t.s || 1), U = DEPTH.upm, kind = t.v || 'oak', base = clamp(t.r / U * 1.05, 2.2, 5.2) * (0.85 + R() * 0.3);
  const burnt = bio === 'burning', ashy = bio === 'ash', bare = kind === 'dead' || burnt || (win && kind !== 'pine' && sea === 3);
  const bark = burnt ? dLin('#141210') : ashy ? dLin('#4a4844') : kind === 'blossom' ? dLin('#4a3a32') : dLin(['#4a3e32', '#3e3428', '#55483a'][Math.floor(R() * 3)]), A = DL('bark');
  const leafHex = kind === 'pine' ? ['#2e4c2c', '#355636', '#2a4628', '#3a5a34'] : kind === 'blossom' ? (sea === 0 ? ['#f2c8d8', '#ecb8cc', '#f8dce6'] : ['#3e5a2a', '#46622e', '#355226']) : sea === 2 ? ['#c8662a', '#d89a2a', '#9a3a1e', '#b8a030'] : sea === 1 ? ['#2e5a24', '#386628', '#27501e'] : ['#3e6a2a', '#4a7430', '#35602a'];
  const lc = () => { const c = dLin(ashy ? '#5a5a54' : leafHex[Math.floor(R() * leafHex.length)]); const v = 0.85 + R() * 0.3; return [c[0] * v, c[1] * v, c[2] * v]; };
  const ph = R() * 6.283;
  if (kind === 'pine') {
    // a spruce's cone: the trunk, then tiers of drooping skirts of branches (two per tier, turned half a step), widest at the
    // foot, a spire at the top
    const H = base * 3.5, rT = 0.1 + base * 0.045, pr = base * 0.95;
    flLimb(Wd, [x, y0, z], [x, y0 + H * (bare ? 1 : 0.88), z], rT, rT * 0.15, 6, bark, A);
    if (bare) return;
    const tiers = Math.round(clamp(base * 3.2, 7, 14) * (k < 1 ? 0.7 : 1)), seg = k < 1 ? 6 : 8;
    for (let i = 0; i < tiers; i++) {
      const f = i / (tiers - 1), yT = y0 + H * (0.2 + 0.78 * f), r = pr * Math.pow(1.0 - 0.86 * f, 1.1) + 0.25, drop = r * (0.62 - 0.2 * f) + 0.2;
      for (let c2 = 0; c2 < 2; c2++) flCone(Lv, x, yT + c2 * 0.08, z, rT * 1.4, r * (1 - c2 * 0.18), drop * (1 - c2 * 0.15), seg, R() * TAU, lc, x, z, clamp(0.3 + f * 0.7, 0, 1), ph + i, R);
    }
    flCone(Lv, x, y0 + H * 1.02, z, 0.02, pr * 0.18 + 0.2, H * 0.08, 5, R() * TAU, lc, x, z, 1, ph, R);
    FLORA.trees++; return;
  }
  const H = base * (kind === 'blossom' ? 2.3 : 2.7), rT = 0.08 + base * 0.045, tH = H * (0.38 + R() * 0.1), C = [x, y0 + H * 0.64, z], cr = [base, base * 0.78, base];
  // the trunk, leaning a little, and its limbs into the crown (twigs off them on a bare tree)
  const top = [x + (R() - 0.5) * 0.3, y0 + tH, z + (R() - 0.5) * 0.3];
  flLimb(Wd, [x, y0, z], top, rT, rT * 0.72, 7, bark, A);
  const nl = bare ? 6 + Math.floor(R() * 3) : 4 + Math.floor(R() * 2), tips = [];
  for (let i = 0; i < nl; i++) {
    const a = i / nl * TAU + R() * 0.6, el = 0.35 + R() * 0.5, rr = base * (0.55 + R() * 0.3);
    const tip = [C[0] + Math.cos(a) * rr * Math.cos(el), C[1] + (el - 0.25) * cr[1] * 0.9, C[2] + Math.sin(a) * rr * Math.cos(el)];
    flLimb(Wd, top, tip, rT * 0.55, rT * 0.14, 5, bark, A); tips.push(tip);
    if (bare) for (let j = 0; j < 3; j++) { const m = [top[0] + (tip[0] - top[0]) * (0.45 + j * 0.18), top[1] + (tip[1] - top[1]) * (0.45 + j * 0.18), top[2] + (tip[2] - top[2]) * (0.45 + j * 0.18)], a2 = a + (R() - 0.5) * 1.8, l2 = base * (0.3 + R() * 0.3);
      flLimb(Wd, m, [m[0] + Math.cos(a2) * l2, m[1] + l2 * (0.3 + R() * 0.5), m[2] + Math.sin(a2) * l2], rT * 0.16, rT * 0.04, 4, bark, A); }
  }
  if (bare) { FLORA.trees++; return; }
  // the crown: leaf clusters on its outer shell, more near the limbs' ends
  const nc = Math.round(clamp(72 * Math.pow(base / 3, 1.4), 48, 150) * (k || 1) * (sea === 2 ? 0.85 : 1)), tile = kind === 'blossom' && sea === 0 ? 2 : 0;
  for (let i = 0; i < nc; i++) {
    let px, py, pz;
    if (i < tips.length * 3) { const tp = tips[i % tips.length]; px = tp[0] + (R() - 0.5) * base * 0.7; py = tp[1] + (R() - 0.3) * base * 0.5; pz = tp[2] + (R() - 0.5) * base * 0.7; }
    else { const u = R() * TAU, v = Math.acos(2 * R() - 1), s = i % 4 === 0 ? 0.25 + 0.4 * R() : 0.6 + 0.42 * Math.sqrt(R()); /* (a quarter fill the crown's heart) */ px = C[0] + Math.cos(u) * Math.sin(v) * cr[0] * s; py = C[1] + Math.cos(v) * cr[1] * s; pz = C[2] + Math.sin(u) * Math.sin(v) * cr[2] * s; }
    const o = [px - C[0], py - C[1], pz - C[2]], sz = base * (0.55 + R() * 0.3) + 0.5;
    flCard(Lv, [px, Math.max(y0 + tH * 0.8, py), pz], sz, [o[0] + (R() - 0.5) * 2, o[1] + (R() - 0.3) * 2, o[2] + (R() - 0.5) * 2], R() * TAU, tile, lc(), C, x, z, clamp((py - y0) / H, 0.3, 1), ph + i * 0.37);
  }
  FLORA.trees++;
}
function floraBush(Lv, d, x, y0, z, sea, bio, win, i) {
  const R = Z.mulberry32(d.s || i + 1), U = DEPTH.upm, rr = Math.max(0.5, d.r / U * 0.85) * (0.85 + R() * 0.3), C = [x, y0 + rr * 0.55, z];
  const hex = bio === 'ash' ? ['#45453f'] : bio === 'burning' ? ['#2a2018'] : win && sea === 3 ? ['#5a5a4a', '#4e4e40'] : sea === 2 ? ['#7a5a26', '#5e5a24', '#3e4a22'] : d.v === 'dry' ? ['#6a6234', '#5e5830'] : ['#2e4a22', '#3a5426', '#26401e'];
  const n = Math.round(8 + rr * 9), ph = R() * 6.283;
  for (let k = 0; k < n; k++) {
    const u = R() * TAU, v = Math.acos(clamp(2 * R() - 1, -0.2, 1)), s = 0.6 + 0.4 * R(), px = C[0] + Math.cos(u) * Math.sin(v) * rr * s, py = C[1] + Math.cos(v) * rr * 0.7 * s, pz = C[2] + Math.sin(u) * Math.sin(v) * rr * s;
    const c = dLin(hex[Math.floor(R() * hex.length)]), vv = 0.85 + R() * 0.3;
    flCard(Lv, [px, Math.max(y0 + 0.1, py), pz], rr * (0.7 + R() * 0.4) + 0.25, [px - C[0] + (R() - 0.5), py - C[1] + 0.5, pz - C[2] + (R() - 0.5)], R() * TAU, 3, [c[0] * vv, c[1] * vv, c[2] * vv], C, x, z, clamp((py - y0) / (rr * 1.2), 0.2, 0.8), ph + k);
  }
}
// a block's trees and bushes: the wood into the block's plain geometry, the leaves into one mesh of their own
function floraChunk(c, G0, keep, TH, ox, oy, curb, ring) {
  if (!FLORA.ok) return false;
  const L = v => v / DEPTH.upm, q = DQ[DEPTH.lvl], sea = WORLD.season, bio = c.bio, win = winterOn(c) || bio === 'snow', Lv = dGB(), k = ring >= 2 ? 0.6 : 1;
  const yAt = (x, z) => curb && x > L(ROAD * SCL) && z > L(ROAD * SCL) ? curb : 0;
  const trees = c.deco.filter(d => d.k === 'tree'), nt = Math.round(trees.length * q.trees);
  for (let i = 0; i < nt; i++) { const t = trees[i], x = L(t.x - ox), z = L(t.y - oy); floraTree(TH, Lv, t, x, yAt(x, z), z, sea, bio, win, k); }
  const bush = c.deco.filter(d => d.k === 'bush'), nb = Math.round(bush.length * q.trees);
  for (let i = 0; i < nb; i++) { const d = bush[i], x = L(d.x - ox), z = L(d.y - oy); floraBush(Lv, d, x, yAt(x, z), z, sea, bio, win, i); }
  if (Lv.nv) { const g = dGeom(Lv, true); const m = new THREE.Mesh(g, FLORA.mats.leaf); m.customDepthMaterial = FLORA.mats.leafD; m.castShadow = true; m.receiveShadow = true; G0.add(m); keep.push(g); }
  return true;
}

/* ---------- grass round the camera ---------- */
// the map of the ground round the camera (from the blocks' own paintings): r grass, g how long it grows, b the curb
const FL_MASK_PX = 256, FL_MASK_M = 112;
function floraMaskUpdate(force) {
  const U = DEPTH.upm, cx = DEPTH.cam.position.x * U + DEPTH.ox, cz = DEPTH.cam.position.z * U + DEPTH.oy, half = FL_MASK_M * U / 2;
  const M = FLORA.mask || (FLORA.mask = { cv: null, cx: 1e12, cz: 1e12, data: new Uint8Array(FL_MASK_PX * FL_MASK_PX * 4), tex: null, n: 0 });
  if (!force && Math.hypot(cx - M.cx, cz - M.cz) < half * 0.3) return;
  if (!M.cv) { M.cv = document.createElement('canvas'); M.cv.width = M.cv.height = FL_MASK_PX; M.ctx = M.cv.getContext('2d', { willReadFrequently: true }); }
  const x = M.ctx, ox = cx - half, oz = cz - half, sc = FL_MASK_PX / (half * 2);
  x.fillStyle = '#000'; x.fillRect(0, 0, FL_MASK_PX, FL_MASK_PX);
  const wild = [], sea = WORLD.season;
  for (const C of DEPTH.chunks.values()) {
    const c = C.c, gc = C.groundCan; if (!gc) continue;
    const dx = (c.sx - ox) * sc, dy = (c.sy - oz) * sc, dw = CHS * sc; if (dx > FL_MASK_PX || dy > FL_MASK_PX || dx + dw < 0 || dy + dw < 0) continue;
    try { x.drawImage(gc, dx, dy, dw, dw); } catch (e) { }
    wild.push([dx, dy, dw, c.bio, !!(c.bio !== 'desert' && c.bio !== 'snow' && !c.wm)]);
  }
  const img = x.getImageData(0, 0, FL_MASK_PX, FL_MASK_PX).data, D = M.data, r0 = ROAD * SCL * sc, cs = CHS * sc;
  for (let py = 0; py < FL_MASK_PX; py++) for (let px = 0; px < FL_MASK_PX; px++) {
    const i = (py * FL_MASK_PX + px) * 4, r = img[i], g = img[i + 1], b = img[i + 2], mx = Math.max(r, g, b), gr = mx > 16 ? (g - Math.max(r, b)) / mx : 0;
    D[i] = Math.round(clamp((gr - 0.04) * 6, 0, 1) * 255);
    // the curb: inside the block (past this chunk's road) on the urban blocks
    const wx = px / sc + ox, wz = py / sc + oz, lx = ((wx % CHS) + CHS) % CHS, lz = ((wz % CHS) + CHS) % CHS;
    D[i + 2] = lx > ROAD * SCL && lz > ROAD * SCL ? 255 : 0;
    D[i + 1] = 0; D[i + 3] = 0;
  }
  // how long it grows, by district (lawns short in the suburbs, the wild lots and the edges long), the curb only on urban
  for (const [dx, dy, dw, bio, urban] of wild) {
    const ln = bio === 'suburb' ? 70 : bio === 'city' ? 120 : bio === 'chaos' || bio === 'ruins' ? 230 : bio === 'desert' ? 90 : bio === 'snow' ? 40 : 200;
    for (let py = Math.max(0, Math.floor(dy)); py < Math.min(FL_MASK_PX, Math.ceil(dy + dw)); py++) for (let px = Math.max(0, Math.floor(dx)); px < Math.min(FL_MASK_PX, Math.ceil(dx + dw)); px++) { const i = (py * FL_MASK_PX + px) * 4; D[i + 1] = ln; if (!urban) D[i + 2] = 0; D[i + 3] = bio === 'desert' ? 200 : sea === 2 ? 150 : sea === 3 ? 120 : 0; }
  }
  void r0; void cs;
  if (!M.tex) { M.tex = new THREE.DataTexture(D, FL_MASK_PX, FL_MASK_PX, THREE.RGBAFormat); M.tex.magFilter = THREE.LinearFilter; M.tex.minFilter = THREE.LinearFilter; M.tex.flipY = false; }
  M.tex.needsUpdate = true; M.cx = cx; M.cz = cz; M.n++;
}
function floraGrassBuild() {
  const lv = DEPTH.lvl; if (lv <= 0) return null;
  const R0 = [0, 16, 24, 30][lv], sp = [1, 0.5, 0.4, 0.34][lv], n = Math.floor(R0 * 2 / sp), N = n * n;
  // one clump: three blades, each a tapered strip of two quads and a tip (position.x across the blade, y up it 0..1, z the blade's turn)
  const P = [], I = [];
  for (let b = 0; b < 3; b++) {
    const a = b / 3 * TAU + 0.4, v0 = P.length / 3;
    const ys = [0, 0.45, 0.8, 1], ws = [0.035, 0.03, 0.02, 0];
    for (let k = 0; k < 4; k++) { if (k < 3) { P.push(-ws[k], ys[k], a, ws[k], ys[k], a); } else P.push(0, 1, a); }
    I.push(v0, v0 + 1, v0 + 3, v0, v0 + 3, v0 + 2, v0 + 2, v0 + 3, v0 + 5, v0 + 2, v0 + 5, v0 + 4, v0 + 4, v0 + 5, v0 + 6);
  }
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
  const off = new Float32Array(N * 2); let k = 0; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { off[k++] = i * sp; off[k++] = j * sp; }
  g.setAttribute('aO', new THREE.InstancedBufferAttribute(off, 2)); g.instanceCount = N;
  const u = Object.assign({ uCam: { value: new THREE.Vector2() }, uT: { value: R0 * 2 }, uSp: { value: sp }, uR: { value: R0 }, uMask: { value: null }, uMO: { value: new THREE.Vector2() }, uMS: { value: FL_MASK_M }, uPl: { value: new THREE.Vector3(0, -99, 0) }, uSea: { value: 1 }, uFlow: { value: 0 } }, FL_U);
  const m = new THREE.MeshStandardMaterial({ vertexColors: false, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, DU, u);
    sh.vertexShader = `uniform float uTime, uSnow, uT, uSp, uR, uMS, uSea, uFlow; uniform vec2 uCam, uMO; uniform sampler2D uMask; uniform vec3 uPl; attribute vec2 aO; varying vec3 vGC; varying float vGH;
      ` + FL_WIND_V + `
      float gH(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      ` + sh.vertexShader.replace('#include <begin_vertex>', `
        vec2 base = uCam - uR + mod(aO - (uCam - uR), uT); vec2 cell = floor(base / uSp + 0.5);
        float h1 = gH(cell), h2 = gH(cell + 17.31), h3 = gH(cell * 1.7 + 3.1);
        base += (vec2(h1, h2) - 0.5) * uSp * 0.9;
        vec4 mk = texture2D(uMask, (base - uMO) / uMS);
        float dist = length(base - uCam), fade = 1.0 - smoothstep(uR * 0.72, uR * 0.98, dist);
        float grow = smoothstep(0.15, 0.6, mk.r) * fade * (1.0 - smoothstep(0.35, 0.7, uSnow));
        float hgt = (0.08 + mk.g * 0.62 * (0.55 + 0.9 * h3)) * grow;
        // wildflowers in spring and summer, one clump in twenty on the long grass
        float flower = step(0.95, h3) * step(uSea, 1.5) * step(0.6, mk.g * 1.6);
        float ang = h1 * 6.2831853 + position.z, ca = cos(ang), sa = sin(ang);
        vec3 tr = vec3(position.x * ca, position.y * hgt * (1.0 + flower * 0.3), position.x * sa);
        // the blades lean out from the clump's middle, the wind runs across them in waves, they part round your feet
        float yk = position.y * position.y;
        tr.xz += vec2(cos(position.z), sin(position.z)) * 0.07 * yk * hgt / 0.3;
        float wave = sin(dot(base, normalize(uWindV + vec2(1e-4)) * 0.45) - uTime * (1.5 + length(uWindV) * 2.5)) * 0.5 + 0.5;
        tr.xz += uWindV * (0.25 + wave * 0.9 + uGust) * yk * hgt * 0.9;
        vec2 pd = base - uPl.xz; float pl = length(pd); tr.xz += pd / max(pl, 0.05) * yk * hgt * 1.6 * (1.0 - smoothstep(0.2, 0.9, pl));
        vec3 transformed = vec3(base.x, mk.b * 0.15 + 0.005, base.y) + tr;
        float dry = mk.a;
        vGC = mix(vec3(0.075, 0.13, 0.035), vec3(0.18, 0.26, 0.06), position.y) * (0.75 + 0.5 * h2);
        vGC = mix(vGC, vec3(0.26, 0.22, 0.08) * (0.6 + 0.6 * position.y), dry * (0.4 + 0.6 * h1));
        if (flower > 0.5 && position.y > 0.7) vGC = h2 < 0.33 ? vec3(0.9, 0.85, 0.2) : h2 < 0.66 ? vec3(0.85, 0.85, 0.9) : vec3(0.5, 0.3, 0.75);
        vGH = position.y;`)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n objectNormal = vec3(0.0, 1.0, 0.0);');
    sh.fragmentShader = 'varying vec3 vGC; varying float vGH;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = vGC * (0.55 + 0.45 * vGH);');
  };
  m.customProgramCacheKey = () => 'grass2';
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = false; mesh.renderOrder = 1;
  DEPTH.scene.add(mesh); FLORA.blades = N * 3;
  return FLORA.grass = { mesh: mesh, u: u, lvl: lv, geo: g, mat: m };
}
function floraFrame(dt) {
  if (!FLORA.ok || !DEPTH.scene) return;
  // the wind the plants feel: the weather's, with its gusts
  const wx = (WX.wx || 0.4), wy = (WX.wy || 0.15); FL_U.uWindV.value.set(wx * 0.9, wy * 0.9); FLORA.gt += dt; FL_U.uGust.value = clamp((WX.gust || 0) * 1.2 + (WX.gfk || 0) * 0.8 + (typeof NIMBUS !== 'undefined' ? NIMBUS.outflow * 0.7 : 0), 0, 1.5);
  if (DEPTH.sun) { const s = DEPTH.sun, t = s.target.position; FL_U.uSunD.value.set(t.x - s.position.x, t.y - s.position.y, t.z - s.position.z).normalize(); FL_U.uSunC.value.copy(s.color).multiplyScalar(Math.min(1.5, s.intensity * 0.45)); }
  // the grass field
  let GR = FLORA.grass;
  if (GR && GR.lvl !== DEPTH.lvl) { DEPTH.scene.remove(GR.mesh); GR.geo.dispose(); GR.mat.dispose(); GR = FLORA.grass = null; }
  if (!GR && DEPTH.lvl > 0) GR = floraGrassBuild();
  if (!GR) return;
  floraMaskUpdate(false);
  const M = FLORA.mask, U = DEPTH.upm, c = DEPTH.cam.position, f = HOVER.f3 || [0, 0, 1];
  // the field centred a little ahead of the camera (where you look), in the scene's metres
  GR.u.uCam.value.set(c.x + f[0] * GR.u.uR.value * 0.45, c.z + f[2] * GR.u.uR.value * 0.45);
  GR.u.uMask.value = M.tex; GR.u.uMO.value.set((M.cx - DEPTH.ox) / U - FL_MASK_M / 2, (M.cz - DEPTH.oy) / U - FL_MASK_M / 2);
  GR.u.uSea.value = WORLD.season || 0;
  if (G.p) GR.u.uPl.value.set(dX(G.p.x), 0, dZ(G.p.y));
  GR.mesh.visible = !!M.tex;
}
function floraFree() {
  if (FLORA.grass) { try { DEPTH.scene && DEPTH.scene.remove(FLORA.grass.mesh); FLORA.grass.geo.dispose(); FLORA.grass.mat.dispose(); } catch (e) { } FLORA.grass = null; }
  if (FLORA.mask && FLORA.mask.tex) { FLORA.mask.tex.dispose(); FLORA.mask.tex = null; FLORA.mask.cx = 1e12; }
  if (FLORA.tex) { FLORA.tex.dispose(); FLORA.tex = null; }
  for (const k in FLORA.mats) { try { FLORA.mats[k].dispose(); } catch (e) { } } FLORA.mats = {}; FLORA.ok = false;
}
// the self-test grows an oak, a pine, a dead tree and a bush in scratch builders and checks their parts
function floraSelfTest() {
  if (!FLORA.ok) return { ok: true, n: 0, pass: 0, why: 'resting (the 3D view is off)' };
  const W = dGB(), L = dGB(), U = DEPTH.upm || dUPM(), t0 = FLORA.trees;
  floraTree(W, L, { v: 'oak', r: 36 * U / 32, s: 11 }, 0, 0, 0, 1, 'suburb', false, 1); const oakCards = L.nv / 4;
  floraTree(W, L, { v: 'pine', r: 34 * U / 32, s: 12 }, 9, 0, 0, 1, 'suburb', false, 1);
  const wBefore = W.nv; floraTree(W, L, { v: 'dead', r: 30 * U / 32, s: 13 }, 18, 0, 0, 1, 'suburb', false, 1); const deadAdded = W.nv - wBefore;
  floraBush(L, { r: 14 * U / 32, s: 5, v: '' }, 25, 0, 0, 1, 'suburb', false, 0);
  let hiY = 0; for (let i = 1; i < W.p.length; i += 3) hiY = Math.max(hiY, W.p[i]);
  const checks = [['an oak grows a crown of leaf clusters', oakCards >= 20], ['a tree stands at a street tree\'s height (6 m or more)', hiY >= 6], ['a dead tree is all limbs and twigs', deadAdded > 60], ['every leaf has a place', !L.p.some(v => !(v === v))]];
  FLORA.trees = t0;
  const pass = checks.filter(c => c[1]).length;
  return FLORA.tests = { ok: pass === checks.length, n: checks.length, pass: pass, why: checks.filter(c => !c[1]).map(c => c[0]).join('; ') };
}
coreDefine({ name: 'FLORA', kind: 'render', ver: 1, does: 'Trees, bushes and grass in 3D: trees by kind at a street tree\'s real size (trunks in bark, limbs, twigs, crowns of painted leaf clusters lit through from behind, swaying and fluttering in the wind, bare in winter, red and gold in the fall, blossom in spring), bushes of small leaves, and a field of grass blades round the camera wherever the ground is green, short on lawns, long on the lots, browned late in the year, under the snow in winter, wildflowers in spring and summer, waves of wind across it and parting round your feet.',
  provides: ['plants3d'], needs: ['DEPTH', 'SURFACE', 'WX'],
  state: () => FLORA.ok ? FLORA.trees + ' trees grown · ' + FLORA.cards + ' leaf clusters · ' + (FLORA.grass ? FLORA.blades + ' blades of grass' : 'no grass at this level') : 'resting',
  check: () => FLORA.ok && !FLORA.tex ? 'its leaf atlas went missing' : '',
  repair: () => { floraFree(); if (DEPTH.ok) floraMats(); },
  selfTest: floraSelfTest,
  docs: { what: 'The trees, bushes and grass of the 3D view.', how: 'Trees and bushes are built into each block from the world\'s plants (leaf cards cut from a painted atlas, swaying in a vertex shader); the grass is one instanced field placed on the graphics chip from a map of the ground round the camera.' }
});
