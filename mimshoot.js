/* ================= THE SHOOT: a written scene filmed, lit and finished (1.9.995) =================
   The last steps from a page to a film. BOARD has read the scene, planned it and staged it; CHOREO and LEGEND perform it
   (the fights, the hands on things, the walks); MIMATIC's director has chosen the coverage and where the cuts fall. Here:
   - the location: from the scene heading (outside or inside, day or night, the weather), a set built for cameras from
     any side (a night avenue of shopfronts, neon and sodium lamps; a warehouse floor under one bulb), with the
     practical lights that motivate the light (Brown, Motion Picture and Video Lighting: light should come from where
     the scene says light is);
   - the light for each shot: MIMATIC's key, fill and back designed round the subject for the look (the ratio, the
     colour temperatures), with the three practicals nearest the subject (a frame has four lamps);
   - the camera for each moment: the director's shot, following its subject, with the lens's focus pulled to the eyes
     and a small kick on the camera when a blow lands;
   - VFXRAY's finish: depth of field from the lens, rain and splashes in scene time, spray off a wet body when it is hit
     and a splash where it lands (dust when it is dry), fog by Beer-Lambert, a look as a lookup table, bloom, halation
     and grain, motion blur from the camera's own movement.
   Every frame can be drawn again at any moment of the scene, and the same take gives the same frames. */
const MIMS = { made: 0, ms: 0, lastMs: 0 };

/* ---------- the night avenue ---------- */
// built round the action (near the middle of the street), so a camera can stand anywhere within ten metres of it
const MIMS_LAMPS = [[-6.5, 9.0], [8.5, 9.0], [-9.5, -9.0], [4.5, -9.0], [19, 9.0], [-21, -9.0]];
LG_MAKERS.mims_street = function (B) {
  const hi = B.lod < 2, R = lgRng(7);
  const M = {
    brick: lgMtl({ c: '#ffffff', t: LT.brick, r: 0.9, w: 0.75, n: 1.3, k: 1.4 }), brick2: lgMtl({ c: '#b9b0a6', t: LT.brick, r: 0.9, w: 0.75, n: 1.3, k: 1.6 }),
    conc: lgMtl({ c: '#6a6a6c', t: LT.asphalt, r: 0.9, w: 0.5, n: 0.8, k: 1.5 }), conc2: lgMtl({ c: '#4c4f55', t: LT.asphalt, r: 0.85, w: 0.5, n: 0.8, k: 1.5 }),
    rust: lgMtl({ c: '#ffffff', t: LT.rust, r: 0.6, w: 0.25, n: 1, k: 0.8 }), steel: lgMtl({ c: '#3a3d40', t: LT.metal, r: 0.4, m: 0.7, w: 0.1, k: 0.5 }),
    glass: lgMtl({ c: '#0b1016', r: 0.06, m: 0.3, w: 0 }), lit: lgMtl({ c: '#ffb768', e: 1.4, r: 0.3 }), lit2: lgMtl({ c: '#9fd2ff', e: 0.9, r: 0.3 }),
    shop: lgMtl({ c: '#ffcf96', e: 0.95, r: 0.2 }), shop2: lgMtl({ c: '#bfe6ff', e: 0.8, r: 0.2 }), shop3: lgMtl({ c: '#ff9a6a', e: 0.8, r: 0.2 }),
    neonP: lgMtl({ c: '#ff3db4', e: 3.2, r: 0.3 }), neonC: lgMtl({ c: '#3de8ff', e: 3.0, r: 0.3 }), neonY: lgMtl({ c: '#ffd23d', e: 2.8, r: 0.3 }), sodium: lgMtl({ c: '#ffae4a', e: 4.0, r: 0.3 }),
    paint: lgMtl({ c: '#d8d4c8', r: 0.6, w: 0.2 }), curb: lgMtl({ c: '#77787a', t: LT.asphalt, r: 0.85, w: 0.4, n: 0.7, k: 1.4 }),
    car: lgMtl({ c: '#1d2a36', r: 0.25, m: 0.55, w: 0.1, k: 0.3 }), car2: lgMtl({ c: '#5a1d1a', r: 0.25, m: 0.55, w: 0.1, k: 0.3 }), tyre: lgMtl({ c: '#101010', t: LT.rubber, r: 0.8 }),
    tail: lgMtl({ c: '#ff2a1a', e: 1.6, r: 0.3 }), bag: lgMtl({ c: '#0e0f10', r: 0.15, w: 0.1 }), card: lgMtl({ c: '#7b5d3c', t: LT.twill, r: 0.9, w: 0.9, k: 0.4 }),
    poster: lgMtl({ c: [1, 1, 1], t: LT.poster, r: 0.85, w: 0.9, k: 1, s: 4 }), sky: lgMtl({ c: '#0b1422', e: 1.0, r: 1 }), city: lgMtl({ c: '#162133', e: 0.55, r: 1 }), win: lgMtl({ c: '#ffcf8a', e: 2.2, r: 1 }),
    cone: lgMtl({ c: '#ff6a1a', r: 0.5 }), hyd: lgMtl({ c: '#a8261c', r: 0.45, m: 0.3 })
  };
  lgBone(B, 'root');
  // the pavements on both sides, their kerbs
  lgMat(B, M.curb); for (const s of [1, -1]) { lgBox(B, 0, s * 10.75, 0.07, 32, 1.25, 0.07, 0.01); lgMat(B, M.conc); lgBox(B, 0, s * 9.52, 0.075, 32, 0.04, 0.075, 0.01); lgMat(B, M.curb); }
  // lane marks (dashes along the street) and a zebra crossing
  lgMat(B, M.paint);
  for (const y of [-3.6, 3.6]) for (let x = -30; x < 30; x += 6) lgBox(B, x, y, 0.004, 1.5, 0.06, 0.003, 0);
  for (let y = -8.5; y <= 8.6; y += 1.0) lgBox(B, 8.5, y, 0.004, 1.6, 0.25, 0.003, 0);
  // the buildings: a row along each side, each with its shopfront, its floors of windows and a cornice
  for (const s of [1, -1]) {
    let x = -30; let n = 0;
    while (x < 30) {
      const wd = 6 + R() * 5, ht = 8 + R() * 14, mat = R() < 0.5 ? M.brick : R() < 0.5 ? M.brick2 : M.conc2, y = s * 12, x0 = x, x1 = Math.min(30, x + wd), cx = (x0 + x1) / 2, hw = (x1 - x0) / 2;
      lgMat(B, mat); lgPlane(B, s > 0 ? [x0, y, 0] : [x1, y, 0], s > 0 ? [x1 - x0, 0, 0] : [x0 - x1, 0, 0], [0, 0, ht], hi ? Math.max(2, Math.round(wd)) : 2, hi ? Math.max(2, Math.round(ht / 2)) : 2, 1);
      // the side walls where a taller building meets a lower one, and its roof edge
      lgMat(B, M.conc); lgBox(B, cx, y - s * 0.12, ht + 0.12, hw, 0.18, 0.12, 0.01);
      lgMat(B, mat); lgBox(B, x0, y + s * 1.5, ht / 2, 0.08, 1.5, ht / 2, 0);
      // the shopfront: lit glass (or a shutter down), a sign band, a door
      const kind = R(), sg = -s;
      if (kind < 0.62) {
        const sm = kind < 0.3 ? M.shop : kind < 0.48 ? M.shop2 : M.shop3;
        lgMat(B, M.steel); lgBox(B, cx, y + sg * 0.04, 1.45, hw - 0.5, 0.05, 1.15, 0.01);
        lgMat(B, sm); lgBox(B, cx, y + sg * 0.07, 1.45, hw - 0.62, 0.02, 1.02, 0);
        if (hi) { lgMat(B, M.steel); for (let k = -1; k <= 1; k += 2) lgBox(B, cx + k * (hw - 0.62) / 3, y + sg * 0.09, 1.45, 0.03, 0.02, 1.02, 0); }
      } else { lgMat(B, M.rust); lgBox(B, cx, y + sg * 0.05, 1.4, hw - 0.5, 0.05, 1.3, 0.01); if (hi) { lgMat(B, M.steel); for (let z = 0.3; z < 2.7; z += 0.18) lgBox(B, cx, y + sg * 0.1, z, hw - 0.52, 0.01, 0.012, 0); } }
      lgMat(B, M.conc2); lgBox(B, cx, y + sg * 0.12, 2.95, hw - 0.3, 0.12, 0.28, 0.02);
      if (R() < 0.6) { lgMat(B, R() < 0.5 ? M.lit : M.lit2); lgBox(B, cx, y + sg * 0.25, 2.95, Math.min(hw - 0.6, 2.2), 0.01, 0.12, 0); }
      lgMat(B, M.poster); if (R() < 0.5) lgDecal(B, [x0 + 0.35, y + sg * 0.012, 1.6], [sg > 0 ? -0.3 : 0.3, 0, 0], [0, 0, 0.42], lgQuarterUV(n % 4), { lift: 0 });
      // the floors of windows above
      for (let z = 4.4; z < ht - 1.2; z += 3.2) for (let wx = x0 + 1.2; wx < x1 - 0.8; wx += 2.3) {
        const lit = R() < 0.24;
        lgMat(B, M.conc); lgBox(B, wx, y + sg * 0.02, z, 0.62, 0.04, 0.82, 0.01);
        lgMat(B, lit ? (R() < 0.65 ? M.lit : M.lit2) : M.glass); lgBox(B, wx, y + sg * 0.035, z, 0.5, 0.02, 0.7, 0);
      }
      // a fire escape on some
      if (hi && R() < 0.35 && ht > 12) { lgMat(B, M.rust); for (let z = 4.0; z < ht - 2; z += 3.2) { lgBox(B, cx, y + sg * 0.6, z, Math.min(hw - 0.5, 2.0), 0.55, 0.03, 0.005); lgTube(B, [[cx - Math.min(hw - 0.5, 2.0), y + sg * 1.12, z], [cx - Math.min(hw - 0.5, 2.0), y + sg * 1.12, z + 0.95], [cx + Math.min(hw - 0.5, 2.0), y + sg * 1.12, z + 0.95], [cx + Math.min(hw - 0.5, 2.0), y + sg * 1.12, z]], 0.02, { segs: 4 }); } }
      x = x1; n++;
    }
  }
  // neon signs: a bowl and chopsticks over a noodle bar, OPEN beside it; a cocktail glass across the street
  const strokes = (mat, L, r) => { lgMat(B, mat); for (const s of L) lgTube(B, s, r, { segs: 5 }); };
  { const x0 = 2.5, y = 11.86, z0 = 3.6, arc = []; for (let i = 0; i <= 14; i++) { const a = Math.PI + i / 14 * Math.PI; arc.push([x0 + Math.cos(a) * 0.55, y, z0 + 0.6 + Math.sin(a) * 0.42]); }
    strokes(M.neonP, [arc, [[x0 - 0.6, y, z0 + 0.6], [x0 + 0.6, y, z0 + 0.6]]], 0.022);
    strokes(M.neonC, [[[x0 - 0.12, y, z0 + 0.78], [x0 + 0.66, y, z0 + 1.38]], [[x0 + 0.06, y, z0 + 0.74], [x0 + 0.78, y, z0 + 1.26]]], 0.018);
    const lx = x0 + 1.2, lz = z0 + 0.1, s = 0.34, g = 0.42, O = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * TAU; O.push([lx + s / 2 + Math.cos(a) * s * 0.45, y, lz + s * 0.5 + Math.sin(a) * s * 0.5]); }
    strokes(M.neonC, [O, [[lx + g, y, lz], [lx + g, y, lz + s], [lx + g + s * 0.7, y, lz + s], [lx + g + s * 0.7, y, lz + s * 0.5], [lx + g, y, lz + s * 0.5]], [[lx + g * 2 + s * 0.7, y, lz], [lx + g * 2, y, lz], [lx + g * 2, y, lz + s], [lx + g * 2 + s * 0.7, y, lz + s]], [[lx + g * 2, y, lz + s * 0.5], [lx + g * 2 + s * 0.55, y, lz + s * 0.5]], [[lx + g * 3, y, lz], [lx + g * 3, y, lz + s], [lx + g * 3 + s * 0.7, y, lz], [lx + g * 3 + s * 0.7, y, lz + s]]], 0.015);
    lgMat(B, M.steel); lgBox(B, x0 + 0.9, 11.95, z0 + 0.7, 1.9, 0.04, 0.85, 0.01); }
  { const x0 = -5.5, y = -11.86, z0 = 3.4;
    strokes(M.neonY, [[[x0 - 0.5, y, z0 + 1.2], [x0 + 0.5, y, z0 + 1.2], [x0, y, z0 + 0.55], [x0 - 0.5, y, z0 + 1.2]], [[x0, y, z0 + 0.55], [x0, y, z0 + 0.1]], [[x0 - 0.28, y, z0 + 0.1], [x0 + 0.28, y, z0 + 0.1]]], 0.02);
    strokes(M.neonP, [[[x0 + 0.15, y, z0 + 1.2], [x0 + 0.45, y, z0 + 1.55]]], 0.015);
    const ox = x0 + 0.9, lz = z0 + 0.4; strokes(M.neonC, [[[ox, y, lz], [ox, y, lz + 0.42], [ox + 0.3, y, lz + 0.42]], [[ox + 0.45, y, lz], [ox + 0.45, y, lz + 0.42]], [[ox + 0.62, y, lz + 0.42], [ox + 0.62, y, lz], [ox + 0.9, y, lz]], [[ox + 1.05, y, lz], [ox + 1.05, y, lz + 0.42], [ox + 1.3, y, lz + 0.21], [ox + 1.05, y, lz]]], 0.014);
    lgMat(B, M.steel); lgBox(B, x0 + 0.5, -11.95, z0 + 0.85, 1.3, 0.04, 0.9, 0.01); }
  // street lamps: a pole, an arm over the road, a sodium head
  for (const [x, y] of MIMS_LAMPS) { const s = y > 0 ? -1 : 1;
    lgMat(B, M.steel); lgLimb(B, 5.4, [[0, 0.075], [1, 0.05]], { up: true, ox: x, oy: y, segs: 8, capA: false }); lgTube(B, [[x, y, 5.3], [x, y + s * 0.4, 5.6], [x, y + s * 1.0, 5.65]], 0.045, { segs: 6 });
    lgBox(B, x, y + s * 1.1, 5.6, 0.14, 0.3, 0.07, 0.02); lgMat(B, M.sodium); lgBox(B, x, y + s * 1.1, 5.53, 0.1, 0.24, 0.012, 0); }
  // parked cars along the kerbs
  const car = (x, y, mat, flip) => { const s = flip ? -1 : 1;
    lgMat(B, mat); lgBox(B, x, y, 0.62, 2.2, 0.88, 0.32, 0.12); lgBox(B, x - s * 0.2, y, 1.12, 1.25, 0.78, 0.26, 0.14);
    lgMat(B, M.glass); lgBox(B, x - s * 0.2, y, 1.13, 1.28, 0.8, 0.2, 0.1);
    lgMat(B, M.tyre); for (const dx of [-1.45, 1.45]) for (const dy of [-0.8, 0.8]) lgSphere(B, x + dx, y + dy, 0.33, 0.33, 0.12, 0.33, { segs: 12, rings: 6 });
    lgMat(B, M.tail); for (const dy of [-0.62, 0.62]) lgBox(B, x - s * 2.2, y + dy, 0.78, 0.02, 0.14, 0.05, 0); };
  car(-3.2, 8.35, M.car, false); car(11.5, -8.35, M.car2, true); car(-17, -8.35, M.car, true); if (hi) car(16, 8.35, M.car2, false);
  // the clutter of a street: bags and boxes by the doors, a hydrant, a few cones, a dumpster
  lgMat(B, M.bag); for (const [x, y, s] of [[6.2, 11.3, 0.34], [6.7, 11.1, 0.28], [-12.4, -11.3, 0.32], [-1.4, -11.4, 0.3], [13.5, 11.4, 0.3]]) lgSphere(B, x, y, s * 0.6, s, s * 0.85, s * 0.62, { segs: 12, rings: 8, wr: (a, p) => Math.sin(a * 5 + p * 3) * 0.08 });
  lgMat(B, M.card); lgBox(B, 7.3, 11.35, 0.24, 0.32, 0.26, 0.24, 0.01); lgBox(B, 7.25, 11.3, 0.62, 0.24, 0.2, 0.14, 0.01);
  lgMat(B, M.hyd); lgLimb(B, 0.55, [[0, 0.11], [0.8, 0.1], [1, 0.07]], { up: true, ox: 1.2, oy: 9.25, segs: 10, capA: false }); lgBox(B, 1.2, 9.25, 0.42, 0.18, 0.05, 0.05, 0.02);
  lgMat(B, M.cone); for (const [x, y] of [[4.6, -5.6], [5.4, -5.9]]) lgLimb(B, 0.7, [[0, 0.17], [1, 0.02]], { up: true, ox: x, oy: y, segs: 10, capA: false });
  lgMat(B, M.rust); lgBox(B, -9.5, 10.9, 0.66, 1.0, 0.62, 0.52, 0.04); lgBox(B, -9.5, 10.9, 1.2, 1.02, 0.66, 0.03, 0.01);
  // the ends of the street, closed by more building, the sky and the city beyond
  lgMat(B, M.conc2); lgBox(B, -31, 0, 7, 0.3, 12, 7, 0); lgBox(B, 31, 0, 9, 0.3, 12, 9, 0);
  lgMat(B, M.sky); lgPlane(B, [70, 70, -2], [0, -140, 0], [0, 0, 60], 4, 4, 1); lgPlane(B, [-70, -70, -2], [0, 140, 0], [0, 0, 60], 4, 4, 1); lgPlane(B, [-70, 70, -2], [140, 0, 0], [0, 0, 60], 4, 4, 1); lgPlane(B, [70, -70, -2], [-140, 0, 0], [0, 0, 60], 4, 4, 1);
  const RC = lgRng(31); for (const s of [1, -1]) for (let i = 0; i < 14; i++) { const x = -40 + i * 6 + RC() * 3, hgt = 16 + RC() * 30, y = s * (24 + RC() * 10); lgMat(B, M.city); lgBox(B, x, y, hgt / 2, 2.2, 2.0, hgt / 2, 0); if (hi) { lgMat(B, M.win); for (let k = 0; k < 7; k++) if (RC() < 0.5) lgBox(B, x + (RC() - 0.5) * 3, y - s * 2.02, 3 + RC() * (hgt - 4), 0.25, 0.01, 0.18, 0); } }
};
LG_MAKERS.mims_streetGround = function (B) { lgBone(B, 'root'); lgMat(B, lgMtl({ c: '#8a8c90', t: LT.asphalt, r: 0.8, w: 0.3, n: 0.55, k: 2.2, s: 3 })); lgPlane(B, [-32, -9.5, 0], [64, 0, 0], [0, 19, 0], B.lod < 2 ? 48 : 12, B.lod < 2 ? 16 : 4, 1); };

/* ---------- the warehouse (any scene inside) ---------- */
const MIMS_BULBS = [[0.6, -0.4, 2.7], [-6, 4, 5.5], [6, 5, 5.5]];
LG_MAKERS.mims_room = function (B) {
  const hi = B.lod < 2, R = lgRng(13);
  const M = { conc: lgMtl({ c: '#5d5f63', t: LT.asphalt, r: 0.9, w: 0.5, n: 0.8, k: 1.5 }), brick: lgMtl({ c: '#c8beb4', t: LT.brick, r: 0.9, w: 0.75, n: 1.3, k: 1.4 }), steel: lgMtl({ c: '#3a3d40', t: LT.metal, r: 0.4, m: 0.7, w: 0.1, k: 0.5 }),
    win: lgMtl({ c: '#9fc4e8', e: 1.6, r: 0.3 }), bulb: lgMtl({ c: '#ffd9a0', e: 6, r: 0.3 }), shade: lgMtl({ c: '#1f2224', r: 0.4, m: 0.6 }), cable: lgMtl({ c: '#0c0c0d', r: 0.5 }),
    wood: lgMtl({ c: '#6a5038', t: LT.twill, r: 0.85, w: 0.8, k: 0.6 }), rust: lgMtl({ c: '#ffffff', t: LT.rust, r: 0.6, w: 0.25, n: 1, k: 0.8 }), card: lgMtl({ c: '#7b5d3c', t: LT.twill, r: 0.9, w: 0.9, k: 0.4 }) };
  lgBone(B, 'root');
  // four walls well away from the action, high windows on one side (a cold daylight), columns, a roof of beams
  lgMat(B, M.brick); lgPlane(B, [-13, 13, 0], [26, 0, 0], [0, 0, 8], hi ? 20 : 4, hi ? 6 : 2, 1); lgPlane(B, [13, -13, 0], [-26, 0, 0], [0, 0, 8], hi ? 20 : 4, hi ? 6 : 2, 1);
  lgPlane(B, [13, 13, 0], [0, -26, 0], [0, 0, 8], hi ? 20 : 4, hi ? 6 : 2, 1); lgPlane(B, [-13, -13, 0], [0, 26, 0], [0, 0, 8], hi ? 20 : 4, hi ? 6 : 2, 1);
  lgMat(B, M.win); for (let x = -10; x <= 10; x += 4) lgBox(B, x, 12.95, 5.6, 1.4, 0.02, 1.2, 0);
  lgMat(B, M.steel); for (let x = -10; x <= 10; x += 4) { lgBox(B, x, 12.9, 5.6, 0.04, 0.03, 1.2, 0); lgBox(B, x, 12.9, 5.6, 1.4, 0.03, 0.04, 0); }
  for (const x of [-7, 7]) for (const y of [-7, 7]) lgBox(B, x, y, 4, 0.15, 0.15, 4, 0.01);
  for (let y = -12; y <= 12; y += 4) lgBox(B, 0, y, 7.8, 13, 0.1, 0.2, 0);
  // bulbs on cables, with their shades
  for (const [x, y, z] of MIMS_BULBS) { lgMat(B, M.cable); lgTube(B, [[x, y, 8], [x, y, z + 0.25]], 0.008, { segs: 3 }); lgMat(B, M.shade); lgSphere(B, x, y, z + 0.12, 0.22, 0.22, 0.14, { segs: 14, rings: 6, p0: 0 }); lgMat(B, M.bulb); lgSphere(B, x, y, z + 0.05, 0.05, 0.05, 0.06, { segs: 8, rings: 5 }); }
  // crates, pallets, a drum
  lgMat(B, M.wood); for (const [x, y, s] of [[-5, -6, 0.5], [-5.9, -6.2, 0.45], [-5.4, -6.1, 1.4], [8, -4, 0.6], [-9, 6, 0.55]]) lgBox(B, x, y, s < 1 ? s : 0.95 + 0.45, s < 1 ? s : 0.45, s < 1 ? s : 0.45, s < 1 ? s : 0.45, 0.02);
  lgMat(B, M.rust); lgLimb(B, 0.9, [[0, 0.29], [1, 0.29]], { up: true, ox: 7.2, oy: -5.4, segs: 14, capA: false });
};
LG_MAKERS.mims_roomGround = function (B) { lgBone(B, 'root'); lgMat(B, lgMtl({ c: '#6f6f70', t: LT.asphalt, r: 0.7, w: 0.2, n: 0.5, k: 1.6, s: 3 })); lgPlane(B, [-13, -13, 0], [26, 0, 0], [0, 26, 0], B.lod < 2 ? 26 : 8, B.lod < 2 ? 26 : 8, 1); };

/* ---------- the location, from the heading ---------- */
function mimsLocation(sc) {
  const t = (sc.time || 'NIGHT').toUpperCase(), night = /NIGHT|EVENING/.test(t), dusk = /DUSK|DAWN|MORNING/.test(t), inside = !!sc.inside, w = sc.weather || [];
  const rain = !inside && w.indexOf('rain') >= 0, wet = rain ? 1 : night && !inside ? 0.55 : 0.15;
  return { kind: inside ? 'room' : 'street', night: night, dusk: dusk, day: !night && !dusk, inside: inside, rain: rain, wet: wet, fog: w.indexOf('fog') >= 0 || w.indexOf('smoke') >= 0, neon: w.indexOf('neon') >= 0,
    light: night ? 'lowKey' : dusk ? 'standard' : 'highKey', look: night ? 'tealOrange' : dusk ? 'tealOrange' : 'identity', lookK: night ? 0.85 : dusk ? 0.5 : 1 };
}
// the practical lights of each location: where, how far they reach, their colour (scaled by MIMATIC's Kelvin table)
function mimsPracticals(loc) {
  if (loc.kind === 'room') return MIMS_BULBS.map((p, i) => ({ p: p, r: i ? 9 : 5.5, col: mimvKelvin(2700).map(v => v * (i ? 1.0 : 1.6)), name: 'bulb' }));
  if (!loc.night && !loc.dusk) return [];
  const out = MIMS_LAMPS.map(([x, y]) => ({ p: [x, y + (y > 0 ? -1.1 : 1.1), 5.45], r: 15, col: mimvKelvin(2100).map(v => v * (loc.dusk ? 0.8 : 1.8)), name: 'sodium' }));
  out.push({ p: [3.4, 11.3, 4.2], r: 8, col: [1.6, 0.45, 1.25], name: 'neon' }, { p: [-5, -11.3, 4.0], r: 7, col: [1.4, 1.1, 0.35], name: 'neon' });
  return out;
}
/* ---------- the take: everything the frames need, made once ---------- */
// B: the board (brdBoard); o: { side, mood }
function mimsTake(B, o) {
  o = o || {}; const run = B.run, fps = run.fps || B.fps || 24, nA = run.frames[0].W.length, names = B.sc.chars.map(c => c.name);
  const WAt = (a) => (t) => run.frames[clamp(Math.round(t * fps), 0, run.frames.length - 1)].W[a];
  const actors = []; for (let a = 0; a < Math.min(2, nA); a++) actors.push({ name: names[a] || 'P' + a, W: WAt(a) });
  const beats = brdDirBeats(B.C), mood = o.mood || (B.sc.beats.some(b => b.kind === 'fight') ? 'action' : B.sc.beats.some(b => b.kind === 'talk') ? 'talk' : 'tense');
  const sc = mimdScene({ actors: actors, beats: beats.length ? beats : [{ t0: 0, t1: B.C.dur, who: 0, kind: 'action', focus: 'body' }], mood: mood, dur: B.C.dur, run: run, things: t => run.frames[clamp(Math.round(t * fps), 0, run.frames.length - 1)].things });
  const ed = mimdEdit(sc, { side: o.side || B.side || 1 }), loc = mimsLocation(B.sc);
  // (a scene the director cannot cut is covered by its master, start to end)
  if (!ed.edl.length) { const m = ed.cover.find(s => s.kind === 'master') || ed.cover[0]; ed.edl = [{ n: 1, kind: m.kind, size: m.size, who: m.who, f: m.f, in: 0, out: B.C.dur, side: m.side, shot: m, beat: 0, cut: 'open' }]; }
  const T = { B: B, sc: sc, ed: ed, edl: ed.edl, loc: loc, dur: B.C.dur, fps: fps, nA: nA, cues: mimsCues(B), sim: null, simT: 0, cueI: 0, prevVP: null, prevShot: -1, cast: o.cast || ['attack', 'defense', 'engineer'] };
  T.judge = mimdJudge(sc, ed.edl);
  return T;
}
// what the fight and the falls call for, and when: a blow that lands, a blow blocked, a body that lands on the ground
function mimsCues(B) {
  const out = [];
  for (const s of B.C.segs) {
    if (s.kind === 'fight' && s.F) {
      const F = s.F;
      for (const e of F.ex) {
        const m = CHO_MOVES[e.move]; if (!m || e.move === 'grab') continue; let p; try { p = choStrikePt(F, e, e.t); } catch (x) { continue; }
        out.push({ t: s.t0 + e.t, kind: e.def ? 'block' : 'hit', p: p, who: e.b, big: !e.def && (m.react === 'fall' || m.react === 'fold' || e.move === 'frontKick' || e.move === 'roundKick') });
        if (!e.def && m.react === 'fall') { try { const W = choWorldAt(F, e.b, Math.min(F.dur, e.t + 0.75)); out.push({ t: s.t0 + e.t + 0.75, kind: 'land', p: lgaP(W, 'pelvis'), who: e.b }); } catch (x) { } }
      }
    } else if (s.kind === 'fall' && s.beat) {
      const t = s.t0 + Math.min(s.dur, 0.85), f = brdW(B, t), W = f.W[Math.min(f.W.length - 1, s.beat.who || 0)]; out.push({ t: t, kind: 'land', p: lgaP(W, 'pelvis'), who: s.beat.who || 0 });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}
// the effects simulated up to a moment (in order; going back starts again from the top, the same every time)
function mimsSimTo(T, t) {
  if (!T.sim || t < T.simT - 1e-6) { T.sim = vxsSys({ seed: 17 }); T.simT = 0; T.cueI = 0; }
  const S = T.sim, dt = 1 / 120;
  while (T.simT < t - 1e-9) {
    while (T.cueI < T.cues.length && T.cues[T.cueI].t <= T.simT + 1e-9) { mimsFire(T, T.cues[T.cueI]); T.cueI++; }
    const h = Math.min(dt, t - T.simT); vxsStep(S, h); T.simT += h; S.ps = S.ps.filter(p => !p.dead);
  }
  return S;
}
function mimsFire(T, c) {
  const S = T.sim, r = S.rng, wet = T.loc.wet > 0.5;
  if (c.kind === 'hit' || c.kind === 'block') {
    // a blow that lands throws off what is on the body: water when it is wet (rain), dust from the clothes when it is dry
    const n = c.kind === 'hit' ? (c.big ? 26 : 14) : 6;
    for (let i = 0; i < n; i++) { const d = curV3.norm([(r() - 0.5) * 2, (r() - 0.5) * 2, r() * 0.9 + 0.2]), sp = (wet ? 2.2 : 0.9) + r() * (wet ? 2.4 : 1.0);
      S.ps.push(wet ? { kind: 'drop', p: c.p.slice(), v: curV3.mul(d, sp), age: 0, life: 0.6 + r() * 0.3, drag: 0.6, r: 0.003 } : { kind: 'dust', p: c.p.slice(), v: curV3.mul(d, sp), age: 0, life: 0.7 + r() * 0.4, drag: 3, grav: 0.2, r0: 0.03, r: 0.03, grow: 0.16, col: [0.55, 0.52, 0.48] }); }
  } else if (c.kind === 'land') {
    if (wet) { for (let i = 0; i < 34; i++) { const a = i / 34 * TAU + r() * 0.2, sp = 1.4 + r() * 2.2; S.ps.push({ kind: 'drop', p: [c.p[0] + Math.cos(a) * 0.25, c.p[1] + Math.sin(a) * 0.25, 0.02], v: [Math.cos(a) * sp * 0.7, Math.sin(a) * sp * 0.7, 1.2 + r() * 2.0], age: 0, life: 0.7 + r() * 0.3, drag: 0.4, r: 0.004 }); } }
    else vxsCue(S, 'land', c.p);
  }
}
/* ---------- one frame ---------- */
// the shot on screen at a moment
function mimsShotAt(T, t) { for (const e of T.edl) if (t >= e.in - 1e-6 && t < e.out) return e; return T.edl[T.edl.length - 1]; }
// the camera at a moment: the director's shot following its subject, a kick when a blow lands
function mimsCam(T, t, e) {
  e = e || mimsShotAt(T, t); const cam = mimdCamAt(e.shot, T.sc, t);
  let k = 0; for (const c of T.cues) { if (c.kind !== 'hit' || c.t > t) continue; const dt = t - c.t; if (dt < 0.35) k += (c.big ? 1 : 0.5) * Math.exp(-dt * 14) * Math.sin(dt * 70); }
  if (k && T.sc.mood === 'action') { const sz = { ECU: 0.3, CU: 0.4, MCU: 0.6, MS: 0.8, MLS: 1, FS: 1, WS: 0.7, EWS: 0.4 }[e.size] || 0.7, d = curV3.len(curV3.sub(cam.tgt, cam.eye)) * 0.006 * sz; cam.tgt = [cam.tgt[0], cam.tgt[1] + k * d * 0.6, cam.tgt[2] + k * d]; }
  return cam;
}
// the subject a shot focuses on (the eyes; a master focuses between the two)
function mimsFocusPt(T, t, e) {
  const Ws = T.sc.actors.map(a => a.W(t));
  if (e.who >= 0 && Ws[e.who]) return e.kind === 'insert' ? lgaP(Ws[e.who], 'handR') : mimvMark(Ws[e.who], 'eyes');
  return Ws.length > 1 ? curV3.lerp(mimvMark(Ws[0], 'eyes'), mimvMark(Ws[1], 'eyes'), 0.5) : mimvMark(Ws[0], 'eyes');
}
// the models, made once per take (the set at one level of detail; the actors in their colours; the things)
function mimsModels(T, lod) {
  if (T.models && T.models.lod === lod) return T.models;
  const kind = T.loc.kind, I = lgWorldNew(); for (let i = 0; i < LG_NB; i++) I.set(lgM4(), i * 16);
  T.models = { lod: lod, set: lgModel('mims_' + kind, lod, ''), ground: lgModel('mims_' + kind + 'Ground', lod, ''), I: I, actors: [], things: {} };
  // (each actor with the balaclava down, so the face shows)
  for (let a = 0; a < T.nA; a++) { const cls = T.cast[a % T.cast.length]; T.models.actors.push({ m: lgModel('operator', lod, cls + '|idle'), acc: lgHex(LG_CLASS_BY[cls].col) }); }
  return T.models;
}
function mimsThingModel(T, key) { const c = T.models.things; if (c[key] !== undefined) return c[key]; const mk = LG_MAKERS['obj_' + key] ? 'obj_' + key : LG_MAKERS['set_' + key] ? 'set_' + key : null; return (c[key] = mk ? lgModel(mk, 0, '') : null); }
// the scene description for a frame
function mimsStage(T, t, cam, e, o) {
  o = o || {}; const loc = T.loc, f = T.B.run.frames[clamp(Math.round(t * T.fps), 0, T.B.run.frames.length - 1)], md = mimsModels(T, o.lod == null ? 0 : o.lod);
  const items = [{ m: md.ground, W: md.I, ground: true, noShadow: true, noRim: true, acc: [1, 0.3, 0.6], glow: 1 }, { m: md.set, W: md.I, noShadow: true, noRim: true, acc: [1, 0.3, 0.6], glow: 1 }];
  f.W.forEach((W, a) => items.push({ m: md.actors[a].m, W: W, acc: md.actors[a].acc, glow: 0.35 }));
  for (const th of f.things) { const m = mimsThingModel(T, th.key); if (!m) continue; const W = lgWorldNew(); for (let i = 0; i < LG_NB; i++) W.set(th.M, i * 16); items.push({ m: m, W: W }); }
  // the light: designed round the subject for the look, with the practicals nearest it
  const who = e.who >= 0 ? e.who : 0, Ws = f.W[Math.min(who, f.W.length - 1)], look = o.light || loc.light;
  const L = mimvLight(Ws, cam, { ...MIMV_LOOKS[look], K: loc.night ? 1.25 : loc.dusk ? 1.7 : 2.6, kelvin: loc.night ? [3200, 4300, 6500] : MIMV_LOOKS[look].kelvin }), c = L.center;
  const pr = mimsPracticals(loc).map(q => Object.assign({ d: Math.hypot(q.p[0] - c[0], q.p[1] - c[1], q.p[2] - c[2]) }, q)).sort((a, b) => a.d - b.d).slice(0, 3);
  const S = { cam: cam, items: items, key: L.key, rim: L.rim, pts: [L.pts[0]].concat(pr), sky: L.sky, gnd: L.gnd, wet: loc.wet, time: t, expo: loc.night ? 1.25 : 1.0, clear: [0.012, 0.016, 0.026] };
  if (loc.day && !loc.inside) { S.key = { dir: [0.45, -0.35, 0.82], col: [3.0, 2.85, 2.6] }; S.sky = [0.42, 0.48, 0.6]; S.gnd = [0.16, 0.15, 0.14]; S.clear = [0.5, 0.58, 0.7]; }
  if (loc.inside) { S.sky = [0.05, 0.06, 0.075]; S.gnd = [0.03, 0.03, 0.03]; }
  S.fog = { col: loc.day ? [0.5, 0.55, 0.62] : [0.03, 0.04, 0.062], d: loc.fog ? 0.09 : loc.day ? 0.01 : 0.035, h: 0.12, s: 1.5 };
  S.shadow = { on: true, c: [lgaP(Ws, 'pelvis')[0], lgaP(Ws, 'pelvis')[1], 0.8], r: 3.2, size: 2048 };
  S.refl = { on: o.refl !== false && loc.wet > 0.4, z: 0, scale: 1 };
  return S;
}
// VFXRAY's sprites for the simulated effects at this moment (drops of water, dust, sparks cooling as they fly)
function mimsSprites(T, sim, S) {
  const out = [], night = T.loc.night, lv = night ? 0.35 : 1, sh = 1 / 48;
  for (const p of sim.ps) {
    if (p.dead) continue; const k = p.age / p.life;
    if (p.kind === 'drop') out.push({ t: 0, life: 1, p: p.p, b: curV3.sub(p.p, curV3.mul(p.v, sh)), k: 6, w: 0.0035, w1: 0.0035, col: [0.55 * lv + 0.25, 0.62 * lv + 0.28, 0.72 * lv + 0.32], a: 0.9 * (1 - k), a1: 0.9 * (1 - k), add: true, rot: 0 });
    // a spark: a streak as long as it travels while the shutter is open, its colour a black body's at its temperature
    // (it glows past white while it is hot, so it is drawn brighter than the picture's white)
    else if (p.kind === 'spark') { const T0 = p.T || 1900, c = mimvKelvin(Math.max(1000, T0)), I = Math.pow(T0 / 1900, 4) * 9; out.push({ t: 0, life: 1, p: p.p, b: curV3.sub(p.p, curV3.mul(p.v, sh)), k: 6, w: 0.009, w1: 0.009, col: c.map(v => v * I), a: 1, a1: 1, add: true, rot: 0 }); }
    // dust and smoke catch the light they are in: lit by the lamps at night they read pale, not dark
    else if (p.kind === 'dust' || p.kind === 'smoke') { const col = (p.col || [0.5, 0.5, 0.5]).map((v, i) => Math.min(1, v * (night ? 0.95 : 1.1) + (night ? [0.02, 0.04, 0.08][i] : 0))); out.push({ t: 0, life: 1, p: p.p, k: 3, w: (p.r || 0.05) * 2.2, w1: (p.r || 0.05) * 2.2, col: col, a: 0.4 * (1 - k), a1: 0.4 * (1 - k), add: false, rot: (p.p[0] * 7.3) % 1 }); }
    else if (p.kind === 'debris') out.push({ t: 0, life: 1, p: p.p, k: 0, w: (p.r || 0.01) * 3, w1: (p.r || 0.01) * 3, col: (p.col || [0.4, 0.4, 0.4]).map(v => v * (night ? 0.9 : 1.3)), a: 1, a1: 1, add: false, rot: 0 });
  }
  return out;
}
// one finished frame at a moment, drawn to LEGEND's canvas (or the caller's target); o: { w, h, dof, mb, rain, fx, look, lookK, light, quality }
function mimsFrame(T, t, o) {
  o = o || {}; const t0 = performance.now(), w = o.w || 1110, h = o.h || 600, gl = LGR.gl; if (!gl || !LGR.ok) return null;
  vfxGLInit(); if (LGR.cv.width !== w || LGR.cv.height !== h) { LGR.cv.width = w; LGR.cv.height = h; }
  const e = mimsShotAt(T, t), cam = mimsCam(T, t, e), loc = T.loc;
  const S = mimsStage(T, t, cam, e, o); lgCamUpd(cam, w / h);
  // the lens: the director's focal length, focus pulled to the subject, the stop that gives this shot its depth
  const fp = mimsFocusPt(T, t, e), dist = Math.max(0.4, curV3.len(curV3.sub(fp, cam.eye))), N = e.size === 'EWS' || e.size === 'WS' ? 4 : e.size === 'FS' || e.size === 'MLS' ? 2.8 : 2.0;
  const lens = mimcBody({ f: e.f || mimcFocal(cam.fov, 's35', w / h), N: N, focus: dist, aspect: w / h, shutter: 180 });
  // the effects at this moment, and the rain
  const sim = o.fx === false ? null : mimsSimTo(T, t), spr = sim ? mimsSprites(T, sim, S) : [];
  const rain = loc.rain && o.rain !== false ? { on: true, center: [cam.tgt[0] * 0.5 + cam.eye[0] * 0.5, cam.tgt[1] * 0.5 + cam.eye[1] * 0.5, 4], box: [13, 9, 9], fall: 9, wind: [0.5, 0.25], speed: 1, dim: loc.night ? 1 : 0.6, splash: { center: [cam.eye[0] * 0.3 + cam.tgt[0] * 0.7, cam.eye[1] * 0.3 + cam.tgt[1] * 0.7, 0], area: [9, 5.4], z: 0 }, density: 0.65 } : null;
  const extra = () => { if (rain) vfxRain(S, rain, t); const keep = VX.sp; VX.sp = spr; vfxSprites(S, true); vfxSprites(S, false); VX.sp = keep; };
  const fin = lgFBO('mims_fin', w, h, false), sameShot = T.prevShot === e.n;
  const r = vxlRender(S, w, h, { lens: lens, dof: o.dof !== false, dofMax: Math.round(h / 22), mb: o.mb !== false && sameShot && T.prevVP, prevVP: T.prevVP, fog: { rho: loc.fog ? 0.05 : loc.night ? 0.018 : 0.006, H: 6, zb: 0, col: S.fog.col.map(v => v * 1.4) }, vig: 0.25, look: o.look || loc.look, lookK: o.lookK == null ? loc.lookK : o.lookK, extra: extra, out: fin });
  T.prevVP = cam.VP.slice(); T.prevShot = e.n;
  // the film: bloom and halation round the practicals, a little grain, a soft shoulder
  if (r && o.post !== false) vfxPost(fin, w, h, { bloom: 3, bloomK: loc.night ? 0.7 : 0.35, th: loc.night ? 0.52 : 0.7, streak: loc.night ? 0.25 : 0, ca: 0.35, grain: o.grain == null ? 0.04 : o.grain, vig: 0.4, bars: 0, fade: 0, flash: 0, mb: 0, hal: loc.night ? 0.22 : 0.08, tone: 0.4, shd: loc.night ? [0.0, 0.01, 0.03] : [0, 0, 0], hil: loc.night ? [0.03, 0.015, 0] : [0, 0, 0] }, t);
  MIMS.made++; MIMS.lastMs = performance.now() - t0; MIMS.ms = MIMS.ms ? MIMS.ms * 0.9 + MIMS.lastMs * 0.1 : MIMS.lastMs;
  return { shot: e, cam: cam, lens: lens, sprites: spr.length, ms: MIMS.lastMs };
}
