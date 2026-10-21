/* ================= LEGEND v2: the ten rebuilt guns as models, and how the hands hold each one =================
   1.9.993. Each gun is built in metres from LEGEND's shapes, in the space its bones carry:
   - Long guns on the carbine bone (bore along +x, the origin on the bore line straight over the pistol grip), the
     magazine on its own bone (cmag) so it can be stripped, rocked, hooked, dropped and seated.
   - Handguns on the pistol bone (bore along +x, the origin at the back of the slide on the bore line), the slide on
     its own bone (it runs back when it fires and locks open on empty), the magazine on its own.
   Proportions from the real guns (barrel lengths, overall lengths, magazine shapes; weapons.js has the numbers):
   - M4A1: flat-top upper with a rail, a 14.5 in barrel and an A2 birdcage, the front sight block at the end of a quad
     rail, a holographic sight, a six-position stock on a buffer tube, a curved 30-round magazine; the forward assist
     and the brass deflector behind the ejection port, the bolt catch on the left.
   - AK-74M: a ribbed dust cover, the rear sight leaf, the gas tube over the handguard, the front sight post and the
     74's two-chamber muzzle brake, the big safety lever on the right, a side-folding polymer stock, the plum magazine
     with its strong forward curve and a reinforced lip.
   - Mk 17 (SCAR-H): flat dark earth, a monolithic upper with a rail the whole length, the reciprocating charging
     handle on the left, a folding stock with a cheek riser, a 20-round box magazine of 7.62.
   - M1014: a 12 gauge semi-automatic with a tube under the barrel, ghost-ring sights, a collapsible stock, the loading
     port underneath, the charging handle on the right, red shells in the tube.
   - PP-19: an AK-type receiver, a short barrel with a slant brake, and the 64-round helical magazine under the
     barrel doubling as the handguard; a skeleton side-folding stock.
   - M17: coyote frame and slide, a slide cut for an optic, front and rear serrations; M9: the open-top slide that
     shows the barrel, a decocker on the slide, a long grip; M1911A1: slim, parkerized, a hammer spur, a grip safety
     and an arched mainspring housing, brown grips; M1917: a swing-out cylinder for six .45 rounds in two half-moon
     clips, a lanyard ring, walnut grips; APS: a long blued slide, bakelite grips, the selector on the slide.
   Each gun carries its own sockets: where the support hand goes (the handguard is longer or shorter), where its
   muzzle is, where its magazine sits in the hand. */
const LG_GUNS = {};
function lgGunMats(K) {
  const M = K.M;
  if (!M.fde) {
    M.fde = lgMtl({ c: '#8a7a5c', t: LT.poly, r: 0.62, w: 0.12, n: 0.7, k: 0.08 });
    M.fdeDk = lgMtl({ c: '#6e6249', t: LT.poly, r: 0.66, w: 0.1, n: 0.7, k: 0.06 });
    M.coyote = lgMtl({ c: '#7c6a4e', t: LT.poly, r: 0.6, w: 0.1, n: 0.6, k: 0.06 });
    M.coyoteSl = lgMtl({ c: '#8b7756', t: LT.metal, r: 0.38, m: 0.55, w: 0.04, n: 0.4, k: 0.08 });
    M.park = lgMtl({ c: '#4a4c47', t: LT.metal, r: 0.5, m: 0.6, w: 0.04, n: 0.6, k: 0.1 });
    M.blued = lgMtl({ c: '#22262d', t: LT.metal, r: 0.24, m: 0.85, w: 0.02, n: 0.3, k: 0.08 });
    M.walnut = lgMtl({ c: '#6a3d22', t: LT.leather, r: 0.42, w: 0.2, n: 0.5, k: 0.06 });
    M.bakelite = lgMtl({ c: '#4a2c1c', t: LT.poly, r: 0.38, w: 0.12, n: 0.6, k: 0.05 });
    M.plum = lgMtl({ c: '#5a2a1c', t: LT.poly, r: 0.52, w: 0.14, n: 0.7, k: 0.06 });
    M.shellRed = lgMtl({ c: '#a8261f', t: LT.poly, r: 0.5, w: 0.1, n: 0.4, k: 0.05 });
    M.gunBlk = lgMtl({ c: '#1d1f22', t: LT.metal, r: 0.4, m: 0.6, w: 0.04, n: 0.5, k: 0.09 });
    M.gunPoly = lgMtl({ c: '#1a1b1c', t: LT.poly, r: 0.62, w: 0.08, n: 0.9, k: 0.05 });
  }
  return M;
}
// a cylinder along the bore (+x) from x0, length len, radius r (optionally stepped radii)
function lgBore(B, x0, len, r, y, z, o) { lgPush(B, lgTR(x0, y || 0, z || 0, 0, Math.PI / 2, 0)); lgLimb(B, len, Array.isArray(r) ? r : [[0, r], [1, r]], Object.assign({ up: true, segs: 10 }, o || {})); lgPop(B); }
// a rail along the top: a strip with slots
function lgRail(B, M, x0, x1, z, w, hi, top) {
  lgMat(B, M.gunBlk); lgBox(B, (x0 + x1) / 2, 0, z, (x1 - x0) / 2, w, 0.004, 0.0015);
  if (top) { lgMat(B, M.poly); const n = Math.round((x1 - x0) / 0.01); for (let i = 0; i < n; i++) lgBox(B, x0 + (i + 0.5) * (x1 - x0) / n, 0, z + 0.0042, 0.0025, w + 0.0005, 0.0008, 0); }
}
// a holographic sight (long guns)
function lgHolo(B, M, x, z, hi) {
  lgMat(B, M.gunBlk); lgBox(B, x, 0, z + 0.008, 0.036, 0.017, 0.008, 0.003);
  lgBox(B, x - 0.03, 0, z + 0.028, 0.004, 0.017, 0.016, 0.002); lgBox(B, x + 0.028, 0, z + 0.028, 0.004, 0.017, 0.016, 0.002); lgBox(B, x, 0, z + 0.045, 0.034, 0.017, 0.003, 0.002);
  if (hi) { lgMat(B, M.lens); lgBox(B, x + 0.024, 0, z + 0.028, 0.0008, 0.014, 0.013, 0); lgMat(B, M.glow); lgSphere(B, x + 0.023, 0, z + 0.028, 0.0016, 0.0016, 0.0016, { segs: 5, rings: 3 }); }
}
// a curved box magazine drawn side-on: top at (mx, mz), length L (down), curve forward c, width w, depth d
function lgCurvedMag(B, mx, mz, L, c, d, w, o) {
  o = o || {}; const n = 6, F = [], Bk = [];
  for (let i = 0; i <= n; i++) { const k = i / n, z = mz - k * L, x = mx + c * k * k * L; F.push([x + d / 2, z]); Bk.push([x - d / 2, z]); }
  lgSide(B, F.concat(Bk.reverse()), w, { bev: o.bev == null ? 0.0025 : o.bev, smooth: 0.5 });
  if (o.plate !== false) { const k = 1, x = mx + c * L; lgBox(B, x + 0.002, 0, mz - L - 0.004, d / 2 + 0.004, w / 2 + 0.002, 0.005, 0.002); }
}

/* ---------- long guns (carbine bone) ---------- */
function lgGunM4(B, K) {
  const M = lgGunMats(K), hi = B.lod < 2, top = B.lod === 0;
  lgBone(B, 'carbine');
  // upper receiver with its rail, the ejection port, the forward assist, the brass deflector
  lgMat(B, M.gunBlk); lgSide(B, [[-0.075, -0.012], [0.1, -0.012], [0.1, 0.022], [-0.075, 0.022]], 0.029, { bev: 0.003 });
  lgRail(B, M, -0.07, 0.1, 0.026, 0.011, hi, top);
  if (hi) { lgMat(B, M.visor); lgBox(B, 0.03, -0.0148, 0.004, 0.025, 0.0008, 0.007, 0.001); lgMat(B, M.gunBlk); lgBox(B, -0.03, -0.0175, 0.012, 0.009, 0.004, 0.007, 0.003); lgBox(B, -0.005, -0.017, 0.016, 0.006, 0.003, 0.005, 0.002); }
  // lower receiver: magazine well, trigger guard, the grip
  lgSide(B, [[-0.07, -0.012], [0.075, -0.012], [0.072, -0.05], [0.028, -0.06], [-0.07, -0.046]], 0.027, { bev: 0.003 });
  lgMat(B, M.gunPoly); lgSide(B, [[-0.012, -0.012], [0.018, -0.012], [0.004, -0.1], [-0.026, -0.1], [-0.03, -0.02]], 0.028, { bev: 0.004, smooth: 0.5 });
  lgTube(B, [[0.02, 0, -0.03], [0.034, 0, -0.04], [0.026, 0, -0.046], [0.002, 0, -0.044]], 0.0028, { segs: 4, flat: 2, up: [0, 1, 0] });
  if (hi) { lgMat(B, M.gunBlk); lgBox(B, 0.06, 0.0145, -0.02, 0.006, 0.0015, 0.01, 0.001); lgBox(B, -0.04, -0.0145, -0.018, 0.007, 0.0015, 0.004, 0.001); }
  // quad rail handguard, the front sight block, the barrel and the birdcage
  lgMat(B, M.gunBlk); lgBox(B, 0.215, 0, 0.004, 0.115, 0.021, 0.021, 0.006);
  if (hi) { lgRail(B, M, 0.1, 0.33, 0.026, 0.011, hi, top); for (const s of [1, -1]) { lgMat(B, M.gunBlk); lgBox(B, 0.215, s * 0.022, 0.004, 0.11, 0.003, 0.006, 0.001); } }
  lgBore(B, 0.33, 0.13, 0.0075); lgBox(B, 0.36, 0, 0.022, 0.008, 0.009, 0.018, 0.002); lgBox(B, 0.36, 0, 0.042, 0.003, 0.002, 0.012, 0.001);
  lgBore(B, 0.46, 0.042, [[0, 0.0105], [0.15, 0.011], [1, 0.0105]], 0, 0, { wr: top ? (a, z) => (Math.sin(a * 6) > 0.6 && z > 0.01 && z < 0.036 ? -0.35 : 0) : null });
  // buffer tube and the six-position stock
  lgBore(B, -0.075, 0.18, 0.0145, 0, 0.004, { up: false });
  lgMat(B, M.gunPoly); lgSide(B, [[-0.33, -0.058], [-0.2, -0.026], [-0.19, 0.024], [-0.33, 0.028], [-0.345, 0.02], [-0.345, -0.062]], 0.036, { bev: 0.005 });
  lgMat(B, M.rubber); lgBox(B, -0.35, 0, -0.018, 0.006, 0.019, 0.046, 0.004);
  // charging handle at the back of the upper, and the holographic sight
  lgMat(B, M.gunBlk); lgBox(B, -0.082, 0, 0.018, 0.008, 0.016, 0.004, 0.002);
  if (hi) lgHolo(B, M, 0.03, 0.03, hi); else { lgMat(B, M.gunBlk); lgBox(B, 0.03, 0, 0.045, 0.032, 0.016, 0.016, 0.004); }
  lgBone(B, 'cmag'); lgMat(B, M.gunBlk); lgCurvedMag(B, 0.048, -0.055, 0.178, 0.14, 0.034, 0.022);
  if (hi) { lgMat(B, M.brass); lgBox(B, 0.046, 0, -0.054, 0.012, 0.004, 0.003, 0.002); }
}
function lgGunAK(B, K) {
  const M = lgGunMats(K), hi = B.lod < 2, top = B.lod === 0;
  lgBone(B, 'carbine');
  // receiver and the ribbed dust cover
  lgMat(B, M.blued); lgSide(B, [[-0.06, -0.045], [0.2, -0.045], [0.21, -0.012], [0.2, 0.012], [-0.06, 0.012]], 0.029, { bev: 0.002 });
  lgSide(B, [[-0.055, 0.012], [0.19, 0.012], [0.2, 0.024], [-0.04, 0.03], [-0.06, 0.022]], 0.027, { bev: 0.004, smooth: 0.6 });
  if (top) { lgMat(B, M.blued); for (let i = 0; i < 9; i++) lgBox(B, -0.02 + i * 0.022, 0, 0.0285, 0.003, 0.0125, 0.0012, 0.001); }
  // the safety lever on the right, the charging handle on the carrier (right side), the rear sight leaf
  lgMat(B, M.blued); lgPush(B, lgTR(0, -0.0165, 0, 0, 0, 0)); lgSide(B, [[-0.02, 0.0], [0.16, -0.004], [0.16, -0.018], [0.0, -0.02], [-0.035, -0.008]], 0.003, { bev: 0.0006 }); lgPop(B);
  lgBox(B, 0.17, -0.026, 0.004, 0.006, 0.012, 0.005, 0.003);
  lgBox(B, 0.215, 0, 0.03, 0.02, 0.012, 0.005, 0.002);
  // pistol grip and the trigger guard (black polymer)
  lgMat(B, M.gunPoly); lgSide(B, [[-0.012, -0.045], [0.016, -0.045], [0.0, -0.12], [-0.028, -0.12], [-0.03, -0.05]], 0.027, { bev: 0.004, smooth: 0.5 });
  lgMat(B, M.blued); lgTube(B, [[0.02, 0, -0.045], [0.04, 0, -0.06], [0.03, 0, -0.068], [0.0, 0, -0.066]], 0.0028, { segs: 4, flat: 2, up: [0, 1, 0] });
  // the handguard (lower) and the gas tube with its upper handguard
  lgMat(B, M.gunPoly); lgBox(B, 0.31, 0, -0.006, 0.09, 0.02, 0.018, 0.008);
  lgBox(B, 0.3, 0, 0.026, 0.085, 0.013, 0.011, 0.007);
  if (hi) { lgMat(B, M.visor); for (let i = 0; i < 4; i++) for (const s of [1, -1]) lgBox(B, 0.26 + i * 0.03, s * 0.0205, -0.006, 0.006, 0.0005, 0.009, 0.002); }
  // barrel, gas block, front sight post, the two-chamber brake
  lgMat(B, M.blued); lgBore(B, 0.2, 0.32, 0.0078); lgBox(B, 0.41, 0, 0.02, 0.012, 0.009, 0.016, 0.003);
  lgBox(B, 0.49, 0, 0.016, 0.01, 0.008, 0.02, 0.002); if (hi) { lgBox(B, 0.49, 0, 0.04, 0.0025, 0.002, 0.01, 0.0008); }
  lgBore(B, 0.52, 0.065, [[0, 0.0115], [0.35, 0.0125], [0.4, 0.0105], [0.55, 0.0125], [1, 0.0118]], 0, 0, { wr: hi ? (a, z) => (z > 0.02 && z < 0.06 && Math.abs(Math.sin(a)) > 0.92 ? -0.3 : 0) : null });
  // the side-folding stock, unfolded
  lgMat(B, M.gunPoly); lgSide(B, [[-0.06, -0.035], [-0.06, 0.018], [-0.32, 0.01], [-0.335, -0.004], [-0.335, -0.09], [-0.31, -0.095], [-0.2, -0.05]], 0.03, { bev: 0.005, smooth: 0.4 });
  lgMat(B, M.rubber); lgBox(B, -0.34, 0, -0.04, 0.005, 0.016, 0.052, 0.003);
  if (hi) lgHolo(B, M, 0.06, 0.03, hi);
  lgBone(B, 'cmag'); lgMat(B, M.plum); lgCurvedMag(B, 0.085, -0.045, 0.19, 0.32, 0.036, 0.024);
  if (hi) { lgMat(B, M.plum); lgBox(B, 0.087, 0, -0.05, 0.02, 0.0135, 0.006, 0.002); lgMat(B, M.brass); lgBox(B, 0.084, 0, -0.044, 0.012, 0.004, 0.003, 0.002); }
}
function lgGunMk17(B, K) {
  const M = lgGunMats(K), hi = B.lod < 2, top = B.lod === 0;
  lgBone(B, 'carbine');
  // the monolithic upper with a full-length rail, the reciprocating charging handle on the left
  lgMat(B, M.fde); lgSide(B, [[-0.12, -0.014], [0.37, -0.014], [0.37, 0.02], [-0.12, 0.02]], 0.034, { bev: 0.004 });
  lgRail(B, M, -0.115, 0.36, 0.024, 0.011, hi, top);
  if (hi) { for (const s of [1, -1]) lgRail(B, M, 0.2, 0.33, 0.0, 0.004, false, false); }
  lgMat(B, M.gunBlk); lgBox(B, 0.15, 0.024, 0.008, 0.008, 0.008, 0.005, 0.003);
  // the lower: magazine well, grip, trigger guard
  lgMat(B, M.fde); lgSide(B, [[-0.08, -0.014], [0.09, -0.014], [0.086, -0.054], [0.03, -0.062], [-0.08, -0.05]], 0.03, { bev: 0.004 });
  lgMat(B, M.fdeDk); lgSide(B, [[-0.012, -0.014], [0.018, -0.014], [0.004, -0.104], [-0.026, -0.104], [-0.03, -0.022]], 0.029, { bev: 0.004, smooth: 0.5 });
  lgTube(B, [[0.02, 0, -0.032], [0.034, 0, -0.042], [0.026, 0, -0.048], [0.002, 0, -0.046]], 0.003, { segs: 4, flat: 2, up: [0, 1, 0] });
  // barrel and the flash hider
  lgMat(B, M.gunBlk); lgBore(B, 0.37, 0.15, 0.0095); lgBore(B, 0.52, 0.06, [[0, 0.012], [1, 0.0115]], 0, 0, { wr: top ? (a, z) => (Math.sin(a * 5) > 0.5 && z > 0.015 ? -0.3 : 0) : null });
  // the folding stock with its cheek riser
  lgMat(B, M.fde); lgSide(B, [[-0.12, -0.036], [-0.12, 0.018], [-0.3, 0.03], [-0.36, 0.034], [-0.37, 0.02], [-0.37, -0.075], [-0.34, -0.08], [-0.22, -0.04]], 0.034, { bev: 0.005, smooth: 0.4 });
  lgMat(B, M.rubber); lgBox(B, -0.375, 0, -0.022, 0.006, 0.019, 0.05, 0.004);
  if (hi) lgHolo(B, M, 0.04, 0.028, hi); else { lgMat(B, M.gunBlk); lgBox(B, 0.04, 0, 0.045, 0.032, 0.016, 0.016, 0.004); }
  lgBone(B, 'cmag'); lgMat(B, M.gunBlk); lgCurvedMag(B, 0.055, -0.058, 0.138, 0.05, 0.04, 0.026);
  if (hi) { lgMat(B, M.brass); lgBox(B, 0.054, 0, -0.057, 0.016, 0.005, 0.004, 0.002); }
}
function lgGunM1014(B, K) {
  const M = lgGunMats(K), hi = B.lod < 2, top = B.lod === 0;
  lgBone(B, 'carbine');
  // receiver with the loading port underneath and the charging handle on the right
  lgMat(B, M.gunBlk); lgSide(B, [[-0.08, -0.034], [0.19, -0.034], [0.2, -0.004], [0.19, 0.022], [-0.07, 0.024], [-0.08, 0.01]], 0.032, { bev: 0.004 });
  lgRail(B, M, -0.06, 0.16, 0.027, 0.011, hi, top);
  lgBox(B, 0.08, -0.024, 0.0, 0.007, 0.009, 0.006, 0.003);
  if (hi) { lgMat(B, M.visor); lgBox(B, 0.09, 0, -0.034, 0.04, 0.012, 0.0008, 0.002); lgMat(B, M.shellRed); lgBox(B, 0.1, 0, -0.033, 0.03, 0.009, 0.0008, 0.001); }
  // grip
  lgMat(B, M.gunPoly); lgSide(B, [[-0.012, -0.034], [0.018, -0.034], [0.004, -0.11], [-0.026, -0.11], [-0.03, -0.04]], 0.029, { bev: 0.004, smooth: 0.5 });
  lgMat(B, M.gunBlk); lgTube(B, [[0.022, 0, -0.034], [0.036, 0, -0.05], [0.028, 0, -0.056], [0.002, 0, -0.054]], 0.003, { segs: 4, flat: 2, up: [0, 1, 0] });
  // the barrel above, the magazine tube below with its cap and the forend over it
  lgBore(B, 0.2, 0.42, [[0, 0.0105], [1, 0.0098]], 0, 0.006);
  lgBore(B, 0.19, 0.31, 0.0125, 0, -0.019); lgBore(B, 0.5, 0.018, 0.014, 0, -0.019);
  lgMat(B, M.gunPoly); lgBox(B, 0.3, 0, -0.016, 0.085, 0.02, 0.018, 0.009);
  if (hi) { lgMat(B, M.visor); for (let i = 0; i < 5; i++) for (const s of [1, -1]) lgBox(B, 0.24 + i * 0.024, s * 0.0205, -0.016, 0.0045, 0.0005, 0.012, 0.002); }
  // ghost-ring sights
  lgMat(B, M.gunBlk); lgBox(B, -0.02, 0, 0.05, 0.008, 0.012, 0.018, 0.003); if (hi) { lgLathe(B, [[0.006, -0.002], [0.009, 0], [0.009, 0.003], [0.006, 0.005]], { segs: 10, ox: -0.02 }); }
  lgBox(B, 0.6, 0, 0.022, 0.006, 0.006, 0.014, 0.002);
  // the collapsible stock
  lgBore(B, -0.08, 0.17, 0.0135, 0, 0.0, { up: false });
  lgMat(B, M.gunPoly); lgSide(B, [[-0.33, -0.064], [-0.2, -0.03], [-0.19, 0.022], [-0.33, 0.026], [-0.345, 0.018], [-0.345, -0.068]], 0.038, { bev: 0.005 });
  lgMat(B, M.rubber); lgBox(B, -0.352, 0, -0.022, 0.007, 0.02, 0.05, 0.004);
  // the "magazine" bone carries a shell (the one going in, and the port load)
  lgBone(B, 'cmag'); lgMat(B, M.shellRed); lgBore(B, 0.05, 0.05, 0.0105, 0, -0.06); lgMat(B, M.brass); lgBore(B, 0.04, 0.012, 0.0112, 0, -0.06);
}
function lgGunPP19(B, K) {
  const M = lgGunMats(K), hi = B.lod < 2, top = B.lod === 0;
  lgBone(B, 'carbine');
  lgMat(B, M.blued); lgSide(B, [[-0.06, -0.035], [0.17, -0.035], [0.18, -0.01], [0.17, 0.012], [-0.06, 0.012]], 0.028, { bev: 0.002 });
  lgSide(B, [[-0.055, 0.012], [0.16, 0.012], [0.17, 0.022], [-0.04, 0.028], [-0.06, 0.02]], 0.026, { bev: 0.004, smooth: 0.6 });
  lgBox(B, 0.14, -0.024, 0.004, 0.006, 0.011, 0.005, 0.003);
  lgPush(B, lgTR(0, -0.0155, 0, 0, 0, 0)); lgSide(B, [[-0.02, 0.0], [0.13, -0.004], [0.13, -0.016], [0.0, -0.018], [-0.03, -0.008]], 0.003, { bev: 0.0006 }); lgPop(B);
  lgMat(B, M.gunPoly); lgSide(B, [[-0.012, -0.035], [0.016, -0.035], [0.0, -0.11], [-0.028, -0.11], [-0.03, -0.04]], 0.027, { bev: 0.004, smooth: 0.5 });
  lgMat(B, M.blued); lgTube(B, [[0.02, 0, -0.035], [0.038, 0, -0.05], [0.028, 0, -0.058], [0.0, 0, -0.056]], 0.0028, { segs: 4, flat: 2, up: [0, 1, 0] });
  // the short barrel and the slant brake
  lgBore(B, 0.18, 0.15, 0.0078); lgBore(B, 0.33, 0.035, [[0, 0.011], [1, 0.0105]]);
  if (hi) { lgBox(B, 0.3, 0, 0.018, 0.006, 0.006, 0.014, 0.002); }
  // the skeleton side-folding stock
  lgTube(B, [[-0.06, 0, 0.004], [-0.3, 0, 0.0], [-0.33, 0, -0.03], [-0.33, 0, -0.085], [-0.3, 0, -0.09], [-0.18, 0, -0.04], [-0.06, 0, -0.03]], 0.0065, { segs: 6 });
  lgMat(B, M.rubber); lgBox(B, -0.336, 0, -0.045, 0.005, 0.016, 0.05, 0.003);
  if (hi) lgHolo(B, M, 0.06, 0.03, hi);
  // the 64-round helical magazine under the barrel: a ribbed cylinder, its feed at the back, a hook at the front
  lgBone(B, 'cmag'); lgMat(B, M.gunPoly);
  lgBore(B, 0.05, 0.28, [[0, 0.026], [0.04, 0.028], [0.96, 0.028], [1, 0.024]], 0, -0.052, { segs: 14, wr: hi ? (a, z) => Math.sin(z * 180) * 0.04 : null });
  lgBox(B, 0.045, 0, -0.03, 0.018, 0.014, 0.014, 0.004);
  if (hi) { lgMat(B, M.blued); lgBox(B, 0.33, 0, -0.03, 0.006, 0.01, 0.008, 0.002); }
}
/* ---------- handguns (pistol, slide, mag bones) ---------- */
// a polymer-framed striker pistol (M17) or a hammer gun (M9, 1911, APS): slide, frame, grip, trigger guard, magazine
function lgPistolFrame(B, M, o) {
  const hi = B.lod < 2, top = B.lod === 0, L = o.L, sm = o.slideM, fm = o.frameM, gm = o.gripM || fm, h = o.h || 0.0168, ga = o.ga || 0;
  lgBone(B, 'slide'); lgMat(B, sm);
  if (o.open) {   // the M9's open-top slide: the barrel shows between the slide's front and its rear
    lgSide(B, [[0.0, -0.01], [L, -0.01], [L + 0.002, -0.006], [L + 0.002, 0.012], [L - 0.006, h], [L * 0.62, h], [L * 0.6, 0.004], [L * 0.32, 0.004], [L * 0.3, h], [0.006, h], [0.0, 0.012]], o.w || 0.026, { bev: 0.0022 });
    lgMat(B, M.steel); lgBore(B, L * 0.3, L * 0.32, 0.0085, 0, 0.006);
  } else lgSide(B, [[0.0, -0.01], [L, -0.01], [L + 0.002, -0.006], [L + 0.002, 0.01], [L - 0.007, h], [0.006, h], [0.0, 0.012]], o.w || 0.0262, { bev: 0.0022 });
  if (hi) {
    lgMat(B, M.visor); lgBox(B, L * 0.46, -0.0132, 0.006, 0.019, 0.0006, 0.0058, 0.001);
    lgMat(B, sm); for (let i = 0; i < (top ? 7 : 3); i++) for (const y of [0.0133, -0.0133]) lgBox(B, 0.01 + i * (top ? 0.0042 : 0.009), y, 0.004, 0.0011, 0.0004, 0.0095, 0);
    if (o.front) for (let i = 0; i < (top ? 5 : 2); i++) for (const y of [0.0133, -0.0133]) lgBox(B, L - 0.035 + i * 0.005, y, 0.004, 0.0011, 0.0004, 0.0095, 0);
    lgMat(B, M.gunBlk); lgBox(B, L - 0.006, 0, h + 0.0025, 0.003, 0.0018, 0.0028, 0.001); lgBox(B, 0.01, 0, h + 0.0025, 0.004, 0.006, 0.003, 0.001);
    if (o.optic) { lgMat(B, M.gunBlk); lgBox(B, 0.05, 0, h + 0.0028, 0.022, 0.0125, 0.003, 0.0015); lgBox(B, 0.032, 0, h + 0.015, 0.003, 0.0125, 0.011, 0.002); lgBox(B, 0.068, 0, h + 0.017, 0.004, 0.0135, 0.013, 0.003); lgMat(B, M.lens); lgBox(B, 0.066, 0, h + 0.017, 0.0008, 0.011, 0.011, 0); lgMat(B, M.glow); lgSphere(B, 0.0655, 0, h + 0.018, 0.0012, 0.0012, 0.0012, { segs: 5, rings: 3 }); }
    if (o.decock) { lgMat(B, M.blued); for (const s of [1, -1]) lgBox(B, 0.012, s * 0.0145, 0.008, 0.006, 0.002, 0.004, 0.0015); }
  }
  lgBone(B, 'pistol');
  lgMat(B, M.steel); lgBore(B, L, o.bx || 0.012, 0.0068);
  // frame / dust cover, then the grip at its angle
  lgMat(B, fm); lgSide(B, [[0.05, -0.024], [L - 0.004, -0.024], [L - 0.002, -0.01], [0.05, -0.01]], 0.0242, { bev: 0.002 });
  const c = Math.cos(ga), s = Math.sin(ga), rot = (x, z) => [0.03 + (x - 0.03) * c + (z + 0.03) * s, -0.03 + (z + 0.03) * c - (x - 0.03) * s];
  const G = o.grip || [[0.035, -0.024], [0.06, -0.024], [0.044, -0.055], [0.034, -0.08], [0.024, -0.124], [-0.012, -0.129], [-0.028, -0.03], [-0.036, -0.014], [0.0, -0.01]];
  lgMat(B, gm); lgSide(B, G.map(p => rot(p[0], p[1])), o.gw || 0.03, { bev: 0.0045, smooth: 0.5 });
  if (o.panels && hi) { lgMat(B, o.panels); lgSide(B, G.slice(2, 6).concat([[0.0, -0.04], [0.02, -0.035]]).map(p => rot(p[0], p[1])), (o.gw || 0.03) + 0.003, { bev: 0.002 }); }
  lgMat(B, fm); lgTube(B, [[0.06, 0, -0.024], [0.084, 0, -0.03], [0.088, 0, -0.045], [0.074, 0, -0.053], [0.05, 0, -0.051], [0.042, 0, -0.046]], 0.0028, { segs: 5, flat: 2.4, up: [0, 1, 0] });
  lgMat(B, M.metal); lgTube(B, [[0.062, 0, -0.026], [0.066, 0, -0.035], [0.064, 0, -0.045]], 0.0028, { segs: 4, flat: 0.6, up: [0, 1, 0] });
  if (o.hammer) { lgMat(B, M.blued); lgSide(B, [[-0.004, 0.004], [0.004, 0.006], [0.0, 0.02], [-0.012, 0.022], [-0.014, 0.016]], 0.006, { bev: 0.001 }); }
  if (o.beaver && hi) { lgMat(B, fm); lgSide(B, [[-0.03, -0.01], [-0.005, -0.012], [-0.012, -0.03], [-0.038, -0.02]].map(p => rot(p[0], p[1])), 0.022, { bev: 0.002 }); }
  if (o.light) { lgMat(B, M.gunBlk); lgBox(B, L - 0.042, 0, -0.035, 0.032, 0.0135, 0.012, 0.005); lgPush(B, lgTR(L - 0.008, 0, -0.035, 0, Math.PI / 2, 0)); lgLimb(B, 0.006, [[0, 0.012], [1, 0.012]], { up: true, segs: 12, capE: false }); lgMat(B, M.lens); lgSphere(B, 0, 0, 0.007, 0.0105, 0.0105, 0.002, { segs: 10, rings: 3 }); lgPop(B); }
  lgBone(B, 'mag'); lgMat(B, o.magM || M.poly);
  const mt = rot(0.027, -0.03), mb = rot(0.004, -0.128 - (o.ext || 0));
  lgSide(B, [[mt[0] - 0.009, mt[1]], [mt[0] + 0.007, mt[1]], [mb[0] + 0.011, mb[1]], [mb[0] - 0.012, mb[1]]], 0.022, { bev: 0.002 });
  lgBox(B, mb[0], 0, mb[1] - 0.006, 0.021, 0.0165, 0.007, 0.003);
  return { magTop: mt };
}
function lgGunM17(B, K) { const M = lgGunMats(K); return lgPistolFrame(B, M, { L: 0.19, slideM: M.coyoteSl, frameM: M.coyote, optic: true, front: true, light: true }); }
function lgGunM9(B, K) { const M = lgGunMats(K); return lgPistolFrame(B, M, { L: 0.205, slideM: M.gunBlk, frameM: M.gunBlk, open: true, decock: true, hammer: true, gw: 0.032, panels: M.gunPoly, grip: [[0.035, -0.024], [0.062, -0.024], [0.046, -0.056], [0.036, -0.082], [0.028, -0.13], [-0.014, -0.135], [-0.03, -0.03], [-0.038, -0.014], [0.0, -0.01]] }); }
function lgGunM1911(B, K) { const M = lgGunMats(K); return lgPistolFrame(B, M, { L: 0.19, slideM: M.park, frameM: M.park, h: 0.0145, w: 0.023, gw: 0.027, hammer: true, beaver: true, panels: M.bakelite, ga: -0.06, magM: M.park,
  grip: [[0.035, -0.024], [0.058, -0.024], [0.042, -0.056], [0.032, -0.08], [0.02, -0.122], [-0.016, -0.126], [-0.026, -0.03], [-0.034, -0.014], [0.0, -0.01]] }); }
function lgGunAPS(B, K) { const M = lgGunMats(K); return lgPistolFrame(B, M, { L: 0.21, slideM: M.blued, frameM: M.blued, hammer: true, panels: M.bakelite, gw: 0.031, magM: M.blued, ext: 0.01, decock: true }); }
function lgGunM1917(B, K) {
  const M = lgGunMats(K), hi = B.lod < 2, top = B.lod === 0;
  // the hammer rides on the slide bone; the frame, the barrel, the cylinder and the grip on the pistol bone
  lgBone(B, 'slide'); lgMat(B, M.blued); lgSide(B, [[-0.006, 0.004], [0.004, 0.008], [0.0, 0.024], [-0.016, 0.028], [-0.02, 0.02]], 0.007, { bev: 0.001 });
  lgBone(B, 'pistol'); lgMat(B, M.blued);
  lgSide(B, [[0.0, -0.025], [0.072, -0.025], [0.075, -0.012], [0.075, 0.018], [0.064, 0.024], [0.0, 0.02], [-0.006, 0.0]], 0.024, { bev: 0.0025 });
  lgBore(B, 0.072, 0.142, [[0, 0.0095], [0.1, 0.0085], [1, 0.0082]], 0, 0.004);
  lgBox(B, 0.205, 0, 0.016, 0.006, 0.0018, 0.006, 0.001);
  // the ejector rod housing under the barrel and the cylinder with its flutes
  lgBore(B, 0.072, 0.06, 0.0045, 0, -0.012);
  lgMat(B, M.blued); lgBore(B, 0.022, 0.046, 0.0205, 0, -0.002, { segs: 12, wr: hi ? (a) => (Math.cos(a * 6) > 0.7 ? -0.14 : 0) : null });
  if (hi) { lgMat(B, M.brass); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; lgSphere(B, 0.0205, Math.cos(a) * 0.013, -0.002 + Math.sin(a) * 0.013, 0.0012, 0.0045, 0.0045, { segs: 6, rings: 3 }); } }
  // trigger guard, and the round-butt walnut grip with the lanyard ring
  lgTube(B, [[0.03, 0, -0.025], [0.05, 0, -0.035], [0.05, 0, -0.05], [0.03, 0, -0.054], [0.01, 0, -0.04]], 0.0026, { segs: 5, flat: 2.2, up: [0, 1, 0] });
  lgMat(B, M.walnut); lgSide(B, [[0.008, -0.022], [-0.006, -0.06], [-0.012, -0.095], [-0.026, -0.112], [-0.046, -0.108], [-0.05, -0.08], [-0.036, -0.03], [-0.012, -0.004]], 0.029, { bev: 0.005, smooth: 0.7 });
  if (hi) { lgMat(B, M.steel); lgLathe(B, [[0.006, -0.002], [0.008, 0], [0.008, 0.002], [0.006, 0.004]], { segs: 10, ox: -0.036 }); }
  // two half-moon clips with their three rounds each (on the magazine bone: they come out together)
  lgBone(B, 'mag'); lgMat(B, M.steel); lgBore(B, 0.0, 0.002, 0.017, 0, -0.002, { segs: 10 });
  if (hi) { lgMat(B, M.brass); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; lgBore(B, 0.002, 0.03, 0.0058, Math.cos(a) * 0.013, -0.002 + Math.sin(a) * 0.013, { segs: 6 }); } }
  return { magTop: [0.0, -0.002] };
}
// each gun: its builder, the bone family, its muzzle, the support hand, where its magazine's top is, a hand-off for the
// magazine in the hand; held relative to the original carbine and pistol sockets
const LG_GUN_DEF = {
  m4a1: { mk: lgGunM4, fam: 'c', muz: [0.502, 0, 0], sup: 0.2, mag: [0.048, -0.055] },
  ak74m: { mk: lgGunAK, fam: 'c', muz: [0.585, 0, 0], sup: 0.27, mag: [0.085, -0.045] },
  mk17: { mk: lgGunMk17, fam: 'c', muz: [0.58, 0, 0], sup: 0.22, mag: [0.055, -0.058] },
  m1014: { mk: lgGunM1014, fam: 'c', muz: [0.62, 0, 0.006], sup: 0.28, mag: [0.06, -0.06] },
  pp19: { mk: lgGunPP19, fam: 'c', muz: [0.365, 0, 0], sup: 0.15, mag: [0.06, -0.03], helix: true },
  m17: { mk: lgGunM17, fam: 'p', muz: [0.202, 0, 0], mag: [0.027, -0.03] },
  m9: { mk: lgGunM9, fam: 'p', muz: [0.217, 0, 0], mag: [0.027, -0.03] },
  m1911: { mk: lgGunM1911, fam: 'p', muz: [0.202, 0, 0], mag: [0.027, -0.03] },
  m1917: { mk: lgGunM1917, fam: 'p', muz: [0.214, 0, 0.004], mag: [0.0, -0.002], moon: true },
  aps: { mk: lgGunAPS, fam: 'p', muz: [0.222, 0, 0], mag: [0.027, -0.03] }
};
// the sockets of one gun (made once, after the generic ones exist)
function lgGunSock(key) {
  let S = LG_GUNS[key]; if (S) return S;
  const D = LG_GUN_DEF[key]; if (!D || !LG_SOCK.cgripR) return null;
  S = { key: key, fam: D.fam, muz: D.muz };
  // the magazine in the support hand: the generic hand-off moved by how far this gun's magazine top is from the generic one
  const shift = (sock, m0, m) => { const o = sock.slice(), dx = m0[0] - m[0], dz = m0[1] - m[1]; o[12] += o[0] * dx + o[8] * dz; o[13] += o[1] * dx + o[9] * dz; o[14] += o[2] * dx + o[10] * dz; return o; };
  if (D.fam === 'c') {
    S.gripR = LG_SOCK.cgripR;
    S.gripL = LG_SOCK.cgripL.slice(); S.gripL[12] = D.sup - 0.05;
    if (D.helix) { S.gripL = lgBasis([0, 1, 0], [0, 0, -1], [-1, 0, 0], [D.sup - 0.05, 0.0, -0.075]); }
    S.magHand = shift(LG_SOCK.cmagHand, [0.046, -0.06], D.mag);
  } else {
    S.gripR = LG_SOCK.gripR; S.gripL = LG_SOCK.gripL;
    S.magHand = shift(LG_SOCK.magHand, [0.027, -0.03], D.mag);
  }
  LG_GUNS[key] = S; return S;
}
// the guns the next pose is solved with (set before a frame is solved; null: the generic pistol and carbine)
LG.gunC = null; LG.gunP = null;
function lgGunSet(c, p) { LG.gunC = c && LG_GUN_DEF[c] ? c : null; LG.gunP = p && LG_GUN_DEF[p] ? p : null; }
function lgSockFor(prop, which) {
  const k = prop === 'carbine' ? LG.gunC : prop === 'pistol' ? LG.gunP : null, S = k ? lgGunSock(k) : null;
  if (S && S[which]) return S[which];
  if (prop === 'carbine') return which === 'gripR' ? LG_SOCK.cgripR : which === 'gripL' ? LG_SOCK.cgripL : which === 'magHand' ? LG_SOCK.cmagHand : which === 'muz' ? LG_SOCK.muzC : null;
  return which === 'gripR' ? LG_SOCK.gripR : which === 'gripL' ? LG_SOCK.gripL : which === 'magHand' ? LG_SOCK.magHand : which === 'muz' ? LG_SOCK.muzP : null;
}
// the Operator carrying a loadout: cls is "class|primary|secondary"
function lgOpGuns(B, K, gp, gs) {
  const P = LG_GUN_DEF[gp], S = LG_GUN_DEF[gs];
  if (P && P.fam === 'c') P.mk(B, K); else lgOpCarbine(B, K);
  if (S && S.fam === 'p') S.mk(B, K); else lgOpPistol(B, K);
}
