/* ================= MIMATIC v2: the stoop -- the Operator between fights, the selection screen's idle scene =================
   1.9.993. Hover a legend's card and this is what plays behind it: night, a side street, a single bulb under a tin shade
   on a cable over a shop's shutter, swinging a little and buzzing. He sits under it on a wooden chair with his mask down,
   sharpening his knife on a whetstone across his knee. The camera lies on the asphalt across the street, low, looking
   at him; he faces it. Now and then a can is kicked somewhere off the edge of the frame and rattles into the street:
   he is on his feet in the same moment, knife up, eyes on the dark where it came from, then the other way, then
   nothing. A breath. He sits back down and picks the stone up again.
   Between the strokes he does the small things a man alone does with time to kill -- twenty-five of them, each starting
   and ending in the same seated pose so the director can cross-fade from any one into any other without a seam:
   testing the edge with his thumb, holding the blade up to the bulb, wiping it on his trousers, turning the stone over,
   spinning the knife, watching the street both ways, glancing up when the bulb flickers, stretching his neck, rolling
   his shoulders, cracking his knuckles, checking his watch, leaning back, resting on his elbows, rubbing his eyes,
   a long breath out, tapping a foot, retying a boot, press-checking his pistol, listening to the radio, tugging a glove,
   drumming on a knee, stretching his arms, humming to himself, picking grit off the stone, checking the edge's angle
   along the blade, and dozing for a moment before he catches himself.
   Sharpening, from the references: the blade held at 15 to 20 degrees to the stone, edge-leading strokes from heel to
   tip, a few to a side, then the knife turned over for the other side.
   The set is built for the camera on the ground: the sidewalk, the curb with a drain, the street with a worn lane line,
   a manhole breathing steam, puddles that hold the bulb, litter, a hydrant, a trash can, the roll-down shutter with
   tags and posters, a dead neon sign, a fire-escape ladder, cables overhead, a parked car's flank at the edge of the
   frame, and a sodium streetlight far down the street in the haze. The bulb swings on a pendulum and the light swings
   with it; the can is a body in PHYSICS's 3D world (thrown, bouncing, rolling, settling against the curb). */
const LGI = { scene: null };
// the set's moving pieces (extra bones): the lamp on its cable and the can
const LGI_LAMP = 52, LGI_CAN = 53;
// his chair, in the root's space (the seated clips sit on it): the stoop's, and the studio's when a seated clip plays there
function lgiChair(B) {
  lgBox(B, -0.14, 0, 0.455, 0.22, 0.23, 0.02, 0.008);
  for (const [x, y] of [[0.06, 0.2], [0.06, -0.2], [-0.33, 0.2], [-0.33, -0.2]]) lgBox(B, x, y, 0.22, 0.018, 0.018, 0.22, 0.004);
  for (const y of [0.2, -0.2]) lgBox(B, -0.35, y, 0.72, 0.018, 0.018, 0.26, 0.004);
  for (let i = 0; i < 3; i++) lgBox(B, -0.35, 0, 0.62 + i * 0.13, 0.012, 0.2, 0.03, 0.005);
}
LG_MAKERS.studioChair = function (B) { lgBone(B, 'root'); lgMat(B, lgMtl({ c: '#6b4f33', t: LT.twill, r: 0.8, w: 0.7, k: 0.5 })); lgiChair(B); };
LG_MAKERS.stoop = function (B) {
  const hi = B.lod < 2, top = B.lod === 0;
  const M = {
    walk: lgMtl({ c: '#7d7d80', t: LT.asphalt, r: 0.85, w: 0.5, n: 0.9, k: 1.6 }), curb: lgMtl({ c: '#8c8c8a', t: LT.asphalt, r: 0.85, w: 0.6, n: 0.9, k: 1.2 }),
    brick: lgMtl({ c: '#ffffff', t: LT.brick, r: 0.9, w: 0.75, n: 1.3, k: 1.3 }), shutter: lgMtl({ c: '#5f646a', t: LT.metal, r: 0.78, m: 0.25, w: 0.2, n: 0.8, k: 0.5 }),
    rust: lgMtl({ c: '#ffffff', t: LT.rust, r: 0.6, w: 0.25, n: 1, k: 0.8 }), steel: lgMtl({ c: '#3a3d40', t: LT.metal, r: 0.4, m: 0.7, w: 0.1, k: 0.5 }),
    wood: lgMtl({ c: '#6b4f33', t: LT.twill, r: 0.8, w: 0.7, k: 0.5 }), woodDk: lgMtl({ c: '#4a3524', t: LT.twill, r: 0.8, w: 0.7, k: 0.5 }),
    tin: lgMtl({ c: '#4d5a52', t: LT.metal, r: 0.45, m: 0.6, w: 0.1, k: 0.4 }), bulb: lgMtl({ c: '#ffd9a0', e: 1.7, r: 0.2 }), glassD: lgMtl({ c: '#0b1016', r: 0.06, m: 0.3, w: 0 }),
    lit: lgMtl({ c: '#ffb768', e: 1.2, r: 0.3 }), neonDead: lgMtl({ c: '#3a1e30', r: 0.4, m: 0.2 }), neonOn: lgMtl({ c: '#ff3db4', e: 2.2, r: 0.3 }),
    poster: lgMtl({ c: [1, 1, 1], t: LT.poster, r: 0.85, w: 0.9, k: 1, s: 4 }), red: lgMtl({ c: '#8a1d17', t: LT.metal, r: 0.45, m: 0.4, w: 0.2, k: 0.4 }),
    bag: lgMtl({ c: '#0e0f10', r: 0.15, w: 0.1 }), paper: lgMtl({ c: '#cfc8b8', t: LT.twill, r: 0.95, w: 0.9, k: 0.3 }), yellow: lgMtl({ c: '#c9a227', t: LT.asphalt, r: 0.8, w: 0.4, k: 1 }),
    car: lgMtl({ c: '#1d2a3a', t: LT.metal, r: 0.25, m: 0.7, w: 0.05, k: 0.3 }), chrome: lgMtl({ c: '#9aa0a6', t: LT.metal, r: 0.15, m: 0.95, w: 0, k: 0.2 }), tire: lgMtl({ c: '#141414', t: LT.rubber, r: 0.8, w: 0.3, k: 0.3 }),
    sodium: lgMtl({ c: '#ffae4a', e: 4.0, r: 0.3 }), sky: lgMtl({ c: '#0a111c', e: 0.8, r: 1 }), win: lgMtl({ c: '#ffcf8a', e: 1.8, r: 1 }), cable: lgMtl({ c: '#0c0c0d', r: 0.5 }),
    can: lgMtl({ c: '#b8bcc0', t: LT.metal, r: 0.25, m: 0.85, w: 0.05, k: 0.2 }), canLbl: lgMtl({ c: '#a3261d', t: LT.poly, r: 0.5, w: 0.2, k: 0.3 })
  };
  lgBone(B, 'root');
  // the sidewalk he sits on (x from the wall at -1.3 to the curb at 1.7), the curb and its drain
  lgMat(B, M.walk); lgBox(B, 0.2, 0, 0.06, 1.5, 12, 0.06, 0.005);
  if (hi) { lgMat(B, M.curb); for (let y = -12; y < 12; y += 1.5) lgBox(B, 0.2, y, 0.121, 1.49, 0.004, 0.001, 0); }
  lgMat(B, M.curb); lgBox(B, 1.72, 0, 0.075, 0.08, 12, 0.075, 0.01);
  lgMat(B, M.steel); lgBox(B, 1.79, 2.2, 0.06, 0.012, 0.45, 0.05, 0.005); if (hi) { lgMat(B, M.glassD); for (let i = 0; i < 7; i++) lgBox(B, 1.802, 1.85 + i * 0.11, 0.06, 0.002, 0.03, 0.035, 0); }
  // the wall behind him: brick, the shop's roll-down shutter (ribbed), its box, a door beside it with a lit pane
  const wall = (x0, x1, z0, z1, mat) => { lgMat(B, mat); lgPlane(B, [-1.3, x1, z0], [0, x0 - x1, 0], [0, 0, z1 - z0], hi ? 12 : 4, hi ? 6 : 2, 1); };
  wall(-12, 12, 0.12, 9, M.brick);
  lgMat(B, M.shutter); lgBox(B, -1.27, 0.15, 1.3, 0.03, 1.6, 1.18, 0.005);
  if (hi) { lgMat(B, M.steel); for (let z = 0.2; z < 2.45; z += 0.09) lgBox(B, -1.235, 0.15, z, 0.004, 1.58, 0.012, 0.002); }
  lgMat(B, M.steel); lgBox(B, -1.2, 0.15, 2.6, 0.1, 1.7, 0.13, 0.01); lgBox(B, -1.25, -1.48, 1.3, 0.03, 0.05, 1.2, 0.005); lgBox(B, -1.25, 1.78, 1.3, 0.03, 0.05, 1.2, 0.005);
  lgMat(B, M.woodDk); lgBox(B, -1.26, -2.35, 1.05, 0.03, 0.48, 1.05, 0.01); lgMat(B, M.lit); lgBox(B, -1.225, -2.35, 1.6, 0.004, 0.22, 0.2, 0); lgMat(B, M.steel); lgBox(B, -1.22, -2.0, 1.0, 0.02, 0.03, 0.02, 0.005);
  lgMat(B, M.curb); lgBox(B, -1.1, -2.35, 0.14, 0.18, 0.55, 0.02, 0.005);
  // posters and tags on the shutter and the brick
  lgMat(B, M.poster); const post = (y, z, q, sz) => lgDecal(B, [-1.228, y, z], [0, sz, 0], [0, 0, sz], lgQuarterUV(q), { lift: 0 });
  post(0.9, 1.5, 1, 0.42); post(-0.6, 1.25, 3, 0.36); post(2.6, 1.6, 0, 0.6); post(-3.4, 1.4, 2, 0.5); post(3.4, 1.2, 3, 0.34);
  // the dead neon sign over the shop (one tube still lit), and windows above, a few lit
  lgMat(B, M.steel); lgBox(B, -1.2, 0.15, 3.25, 0.06, 1.2, 0.3, 0.01);
  { const L = []; for (let i = 0; i < 6; i++) L.push([[-1.13, -0.75 + i * 0.3, 3.1], [-1.13, -0.6 + i * 0.3, 3.4]]); mimStrokes(B, M.neonDead, L.slice(1), 0.014); mimStrokes(B, M.neonOn, L.slice(0, 1), 0.014); }
  const R = lgRng(41);
  for (let y = -10; y < 10; y += 2.6) for (const z of [4.6, 7.4]) { const lit = R() < 0.25; lgMat(B, M.curb); lgBox(B, -1.29, y, z, 0.02, 0.55, 0.75, 0.01); lgMat(B, lit ? M.win : M.glassD); lgBox(B, -1.27, y, z, 0.01, 0.45, 0.64, 0); }
  // the fire-escape ladder down the wall, the drain pipe, the AC unit
  lgMat(B, M.rust); for (const y of [-3.9, -3.5]) lgTube(B, [[-1.15, y, 3.6], [-1.15, y, 8.5]], 0.02, { segs: 4 }); if (hi) for (let z = 3.8; z < 8.5; z += 0.32) lgTube(B, [[-1.15, -3.9, z], [-1.15, -3.5, z]], 0.012, { segs: 3 });
  lgMat(B, M.steel); lgLimb(B, 9, [[0, 0.05], [1, 0.05]], { up: true, ox: -1.22, oy: 3.1, segs: 8, capA: false });
  lgMat(B, M.rust); lgBox(B, -1.05, 3.9, 3.9, 0.25, 0.4, 0.3, 0.02);
  // the lamp's bracket on the wall; the lamp itself hangs on its own bone (it swings)
  lgMat(B, M.steel); lgTube(B, [[-1.28, 0.1, 3.0], [-0.5, 0.1, 3.05], [0.3, 0.1, 3.0]], 0.018, { segs: 5 }); lgTube(B, [[-1.28, 0.1, 2.6], [-0.5, 0.1, 3.0]], 0.012, { segs: 4 });
  // his chair (wood, a slatted back), a crate beside it with a canteen and an oil can, the trash can, the hydrant
  lgMat(B, M.wood); lgiChair(B);
  lgMat(B, M.woodDk); lgBox(B, 0.05, -0.62, 0.21, 0.2, 0.2, 0.2, 0.01); if (hi) { for (let i = 0; i < 3; i++) lgBox(B, 0.252, -0.62, 0.08 + i * 0.13, 0.002, 0.19, 0.012, 0); }
  lgMat(B, M.tin); lgBox(B, 0.08, -0.56, 0.5, 0.05, 0.07, 0.09, 0.02); lgMat(B, M.steel); lgLathe(B, [[0.0, 0.0], [0.04, 0.0], [0.04, 0.09], [0.015, 0.12], [0.008, 0.16], [0.0, 0.16]], { segs: 12, ox: 0.0, oy: -0.72 });
  lgMat(B, M.steel); lgLathe(B, [[0.0, 0.0], [0.27, 0.0], [0.29, 0.8], [0.3, 0.82], [0.0, 0.82]], { segs: 16, ox: 0.4, oy: 1.9 }); lgLathe(B, [[0.0, 0.82], [0.31, 0.82], [0.31, 0.86], [0.12, 0.9], [0.0, 0.9]], { segs: 16, ox: 0.4, oy: 1.9 });
  lgMat(B, M.bag); lgSphere(B, 0.75, 2.25, 0.25, 0.3, 0.26, 0.22, { segs: 12, rings: 8, wr: (a, p) => Math.sin(a * 5 + p * 3) * 0.08 });
  lgMat(B, M.red); lgLathe(B, [[0, 0.12], [0.11, 0.12], [0.11, 0.18], [0.09, 0.2], [0.09, 0.62], [0.1, 0.65], [0.07, 0.78], [0.0, 0.82]], { segs: 14, ox: 1.3, oy: -1.6 }); for (const s of [1, -1]) lgBox(B, 1.3, -1.6 + s * 0.12, 0.5, 0.03, 0.04, 0.03, 0.01);
  // the street: asphalt (its own wet model), the worn lane line, the manhole, litter, the parked car's flank
  lgMat(B, M.yellow); for (let y = -12; y < 12; y += 3) lgBox(B, 5.4, y, 0.004, 0.06, 1.0, 0.003, 0);
  lgMat(B, M.steel); lgLathe(B, [[0, 0.0], [0.34, 0.0], [0.35, 0.012], [0.0, 0.014]], { segs: 20, ox: 3.6, oy: -1.2 });
  if (hi) { lgMat(B, M.glassD); for (let i = -2; i <= 2; i++) lgBox(B, 3.6, -1.2 + i * 0.1, 0.0145, 0.25, 0.012, 0.001, 0); }
  lgMat(B, M.paper); for (const [x, y, a] of [[2.4, 0.8, 0.4], [1.1, -0.9, 1.2], [3.1, 1.9, 2.3], [0.6, 1.1, 0.8]]) { lgPush(B, lgTR(x, y, 0.13 - (x > 1.7 ? 0.12 : 0), 0, 0, a)); lgBox(B, 0, 0, 0.002, 0.11, 0.08, 0.002, 0); lgPop(B); }
  lgMat(B, M.glassD); lgLathe(B, [[0.0, 0.0], [0.03, 0.0], [0.03, 0.17], [0.012, 0.21], [0.012, 0.25], [0.0, 0.25]], { segs: 10, ox: 0, oy: 0 });
  lgPush(B, lgTR(2.6, -1.4, 0.03, Math.PI / 2, 0, 0.6)); lgMat(B, M.glassD); lgLathe(B, [[0.0, -0.12], [0.03, -0.12], [0.03, 0.05], [0.012, 0.09], [0.012, 0.13], [0.0, 0.13]], { segs: 10 }); lgPop(B);
  lgMat(B, M.car); lgBox(B, 3.4, 4.6, 0.62, 2.1, 0.88, 0.38, 0.18); lgBox(B, 3.2, 4.6, 1.15, 1.2, 0.8, 0.22, 0.15);
  lgMat(B, M.glassD); lgBox(B, 3.2, 3.79, 1.15, 1.1, 0.01, 0.16, 0.02); lgMat(B, M.chrome); lgBox(B, 3.4, 3.71, 0.55, 2.0, 0.01, 0.015, 0);
  lgMat(B, M.tire); for (const x of [2.0, 4.8]) { lgPush(B, lgTR(x, 3.72, 0.32, Math.PI / 2, 0, 0)); lgLathe(B, [[0.0, -0.11], [0.3, -0.11], [0.32, 0], [0.3, 0.11], [0.0, 0.11]], { segs: 18 }); lgPop(B); }
  // the far end of the street: the sodium light in the haze, the city's glow
  lgMat(B, M.steel); lgLimb(B, 5.2, [[0, 0.07], [1, 0.05]], { up: true, ox: 1.6, oy: -11, segs: 8, capA: false }); lgTube(B, [[1.6, -11, 5.1], [2.2, -11, 5.35], [2.8, -11, 5.4]], 0.04, { segs: 6 });
  lgMat(B, M.sodium); lgBox(B, 2.9, -11, 5.3, 0.22, 0.1, 0.014, 0.0);
  lgMat(B, M.sky); lgPlane(B, [12, 14, -1], [0, -28, 0], [0, 0, 26], 3, 3, 1);
  if (hi) { lgMat(B, M.cable); for (const [y, s] of [[-2.5, 0.5], [1.8, 0.4]]) { const pts = []; for (let i = 0; i <= 10; i++) { const k = i / 10; pts.push([-1.3 + k * 13, y + k * 0.8, 6.2 - Math.sin(k * Math.PI) * s]); } lgTube(B, pts, 0.012, { segs: 4 }); } }
  // the lamp: a cable, a tin shade, the bulb (its own bone: it swings from the bracket's end)
  lgBone(B, LGI_LAMP); lgMat(B, M.cable); lgTube(B, [[0, 0, 0], [0, 0, -0.6]], 0.006, { segs: 4 });
  lgMat(B, M.tin); lgLathe(B, [[0.012, -0.58], [0.03, -0.6], [0.16, -0.68], [0.17, -0.69], [0.03, -0.62]], { segs: 18 });
  lgMat(B, M.bulb); lgSphere(B, 0, 0, -0.69, 0.035, 0.035, 0.045, { segs: 12, rings: 8 });
  // the can (its own bone: PHYSICS throws it)
  lgBone(B, LGI_CAN); lgMat(B, M.can); lgLathe(B, [[0.0, -0.06], [0.031, -0.06], [0.033, -0.052], [0.033, 0.052], [0.029, 0.06], [0.0, 0.06]], { segs: 14 });
  lgMat(B, M.canLbl); lgLathe(B, [[0.0335, -0.035], [0.0335, 0.04]], { segs: 14 });
};
// the street under the camera: wet asphalt that holds the bulb's reflection
LG_MAKERS.stoopGround = function (B) { lgBone(B, 'root'); lgMat(B, lgMtl({ c: '#6e7074', t: LT.asphalt, r: 0.7, w: 0.35, n: 0.5, k: 2.0, s: 3 })); lgPlane(B, [1.8, -12, 0], [11, 0, 0], [0, 24, 0], B.lod < 2 ? 14 : 5, B.lod < 2 ? 20 : 6, 1); };
// the whetstone (on the carbine bone of the "idle" Operator): two grits, coarse below and fine on top
function lgOpIdleProps(B, K) {
  const M = K.M, hi = B.lod < 2;
  lgBone(B, 'carbine');
  lgMat(B, lgMtl({ c: '#8a5a33', t: LT.asphalt, r: 0.92, w: 0.6, n: 1.2, k: 0.8 })); lgBox(B, 0, 0, -0.006, 0.1, 0.026, 0.0065, 0.002);
  lgMat(B, lgMtl({ c: '#9a9c98', t: LT.asphalt, r: 0.88, w: 0.6, n: 0.5, k: 0.5 })); lgBox(B, 0, 0, 0.0065, 0.1, 0.026, 0.0065, 0.002);
}

/* ---------- seated: the base pose and its helpers ---------- */
// thigh space when seated: x up, -z forward along the thigh, y to his left. A direction in the root's space -> thigh space
const lgiTW = (x, y, z) => [z, y, -x];
// the stone across his left knee (thigh space) and a knife lying on it (u along the stone, v across, phi the blade's
// angle to the stone, tilt the edge's angle, lift above the stone)
const LGI_STONE = lgTR(0.081, 0.0, -0.31, 0, Math.PI / 2, 0);
function lgiKnifeOn(u, v, phi, tilt, lift, flip) {
  const M = lgMul(lgM4(), LGI_STONE, lgTR(u, v, 0.013 + (lift || 0) + 0.004, 0, 0, phi));
  return lgMul(lgM4(), M, lgRot(lgM4(), flip ? Math.PI / 2 + tilt : -Math.PI / 2 - tilt, 0, 0));
}
function lgiHandOnKnife(K) { return lgMul(lgM4(), K, lgKnifeSock('R')); }
function lgiIK(P, side, sp, M, pole) { P.ik['hand' + side] = { sp: sp, p: [M[12], M[13], M[14]], M: M, pole: pole }; }
// the left hand steadying the stone at its far end, palm down
const LGI_HOLD = lgMul(lgM4(), LGI_STONE, lgBasis([0, -1, 0], [0, 0, 1], [-1, 0, 0], [0.005, 0.012, 0.05]));
function lgiSteady(P, k) { const A = LGI_HOLD, Bk = lgMul(lgM4(), LGI_STONE, lgBasis([0, -1, 0], [0, 0, 1], [-1, 0, 0], [-0.02, 0.06, 0.09])); lgiIK(P, 'L', 'thighL', k ? lgvMix(A, Bk, k) : A, lgiTW(-0.4, 0.8, -0.2)); P.grip.L = 'cup'; }
function lgiStone(P, inHand) { P.carbine.at = 'aim'; P.carbine.sp = inHand ? 'handL' : 'thighL'; P.carbine.M = inHand ? lgTR(-0.01, -0.035, -0.07, 0, 0, Math.PI / 2) : LGI_STONE; P.carbine.mag = 'out'; }
// the knife resting on the right thigh, flat, handle toward the knee
const LGI_REST = lgMul(lgM4(), lgTR(0.075, 0.0, -0.22, 0, Math.PI / 2, 0), lgRot(lgM4(), Math.PI / 2, 0, Math.PI));
function lgiKnifeRest(P) { P.knife.at = 'aim'; P.knife.sp = 'thighR'; P.knife.M = LGI_REST; }
// the base seated pose: on the chair, forearms forward, head down over the work
function lgSit(P, o) {
  o = o || {}; const lean = o.lean == null ? 0.3 : o.lean, tw = o.twist || 0;
  lgPelvis(P, -0.12 + (o.px || 0), 0, -0.46 + (o.pz || 0), o.roll || 0, -0.06 + lean * 0.3, tw * 0.3);
  lgJ(P, 'spine', 0, lean * 0.45, tw * 0.35); lgJ(P, 'chest', 0, lean * 0.35, tw * 0.35);
  lgJ(P, 'neck', 0, o.neck == null ? 0.08 : o.neck, (o.look || 0) * 0.4); lgJ(P, 'head', o.tilt || 0, o.head == null ? 0.22 : o.head, (o.look || 0) * 0.6);
  lgFoot(P, 'L', 0.34 + (o.fl || 0), 0.17 + (o.wl || 0), o.liftL || 0, o.pl || 0, 0.18, 0); lgFoot(P, 'R', 0.32 + (o.fr || 0), -0.17 - (o.wr || 0), o.liftR || 0, o.pr || 0, -0.18, 0);
  if (o.breath !== false) lgBreath(P, o.t || 0, 0.8, 4.6);
  P.mask = 0; P.glow = 0.15;
}
// the base work: the knife in the right hand laid on the stone at the start of a stroke, the left hand steadying it
function lgiWork(P, u, v, k) {
  lgiStone(P, false); lgiSteady(P, 0);
  const K = lgiKnifeOn(u == null ? -0.06 : u, v == null ? -0.01 : v, 1.35, 0.3, k || 0);
  P.knife.at = 'handR'; P.grip.R = 'knife'; lgiIK(P, 'R', 'thighL', lgiHandOnKnife(K), lgiTW(-0.2, -0.9, -0.3));
}
// a hand somewhere in the root's space (the chair's), palm turned by a rotation
function lgiHand(P, side, p, r, pole) { lgHandTo(P, side, 'root', p, r, pole || (side === 'L' ? LG_POLE.L : LG_POLE.R)); }

/* ---------- the clips: the sharpening loop, the can, and twenty-five things between ---------- */
const LGI_SRC = 'Sharpening on a whetstone (GearJunkie: 15 to 20 degrees, trailing strokes, tip to heel); startle and orienting responses';
function lgiClip(id, name, dur, loop, desc, fn, ev) { lgClip(id, name, 'Idle', dur, loop, LGI_SRC, desc, fn, ev, { seat: true }); }
// four strokes a side: a push from heel to tip with the edge leading, lifted back; then the knife turned over
lgiClip('sit_sharpen', 'Sharpening', 6.4, true, 'Four strokes a side at about seventeen degrees, heel to tip, edge leading; then the blade turned over for the other side. The stone steadied by the left hand across his knee.', (P, t, ctx) => {
  lgSit(P, { t: t, lean: 0.34, head: 0.38 });
  const side = t < 3.2 ? 0 : 1, tt = t % 3.2, sk = Math.min(1, (tt % 0.8) / 0.8), stroke = sk < 0.62 ? lgvE(sk / 0.62) : 1 - lgvE((sk - 0.62) / 0.38), lift = sk < 0.62 ? 0 : Math.sin((sk - 0.62) / 0.38 * Math.PI) * 0.025;
  lgiStone(P, false); lgiSteady(P, 0);
  const flip = tt > 3.0 ? lgvE((tt - 3.0) / 0.2) : 0, f = side ? 1 - flip : flip;
  const K = lgiKnifeOn(lgLerp(-0.07, 0.07, side ? 1 - stroke : stroke), lgLerp(-0.0, -0.12, side ? 1 - stroke : stroke), 1.35, 0.3, lift + flip * 0.04, side ? f < 0.5 : f > 0.5);
  P.knife.at = 'handR'; P.grip.R = 'knife'; lgiIK(P, 'R', 'thighL', lgiHandOnKnife(K), lgiTW(-0.2, -0.9, -0.3));
  lgJadd(P, 'chest', 0, 0, (stroke - 0.5) * 0.04);
}, [[0.3, 'whet'], [1.1, 'whet'], [1.9, 'whet'], [2.7, 'whet'], [3.5, 'whet'], [4.3, 'whet'], [5.1, 'whet'], [5.9, 'whet']]);
// the can: off the edge of the frame, a clatter; up in the same instant, knife up, eyes on the dark; the other way;
// nothing; a breath; down again
lgiClip('sit_alert', 'A can in the dark', 5.6, false, 'A can clatters somewhere off the edge of the street: he is up in the same instant, the knife coming up into a reverse-grip guard, eyes on the dark where it came from, then the other way. Nothing. A breath, and he sits back down.', (P, t, ctx) => {
  const up = lgK(t, [[0, 0], [0.12, 0], [0.42, 1, 'o3'], [3.9, 1], [4.7, 0, 'io'], [5.6, 0]]), look = lgK(t, [[0, 0], [0.1, 0], [0.22, 0.95, 'o3'], [1.6, 0.85], [2.2, -0.75, 'io'], [3.0, -0.7], [3.5, 0.1, 'io'], [5.6, 0]]);
  const startle = lgPulse(t, 0.06, 0.4);
  // body: from the chair up into a crouched fighting stance, turned toward the sound
  lgPelvis(P, lgLerp(-0.12, 0.08, up), 0, lgLerp(-0.46, -0.12, up) - startle * 0.02, 0, lgLerp(0.03, 0.12, up), look * 0.35 * up);
  lgJ(P, 'spine', 0, lgLerp(0.14, 0.08, up), look * 0.25); lgJ(P, 'chest', 0, lgLerp(0.1, 0.06, up), look * 0.25);
  lgJ(P, 'neck', 0, lgLerp(0.08, -0.05, up), look * 0.35); lgJ(P, 'head', 0, lgLerp(0.22, -0.02, up), look * 0.45);
  lgShrug(P, 'L', 0.06 * startle, 0); lgShrug(P, 'R', 0.06 * startle, 0);
  lgFoot(P, 'L', lgLerp(0.34, 0.28, up), lgLerp(0.17, 0.2, up), lgPulse(t, 0.2, 0.45) * 0.05, 0, 0.18 + look * 0.2 * up, 0);
  lgFoot(P, 'R', lgLerp(0.32, -0.1, up), lgLerp(-0.17, -0.22, up), lgPulse(t, 0.25, 0.5) * 0.06, 0, -0.18 + look * 0.1 * up, 0);
  // the stone slides off the knee to the chair; the knife into the guard
  if (t < 0.25) { lgiWork(P, -0.06, -0.01, 0); }
  else if (t < 4.6) { P.carbine.at = 'aim'; P.carbine.sp = 'root'; P.carbine.M = lgTR(-0.08, 0.12, 0.47, 0, 0, 0.4); P.knife.at = 'handR'; P.grip.R = 'knife'; const g = lgW(t, 0.25, 0.55); lgiHand(P, 'R', [lgLerp(0.25, 0.32, g), lgLerp(-0.1, -0.16, g), lgLerp(0.62, 1.32, g)], [lgLerp(0, 0.3, g), lgLerp(-0.6, -1.2, g), lgLerp(0, -0.3, g)]); lgiHand(P, 'L', [0.3, 0.12, lgLerp(0.65, 1.28, g)], [0, -1.0, 0.4]); P.grip.L = 'fist'; }
  else { lgiWork(P, -0.06, -0.01, 0.08 * (1 - lgW(t, 4.6, 5.4))); }
  P.mask = 0; P.glow = 0.15;
}, [[0.0, 'canKick'], [0.18, 'chairScrape'], [4.75, 'chairCreak']]);
// the twenty-five
const LGI_IDLES = [];
function lgiIdle(id, name, dur, desc, fn, ev) { LGI_IDLES.push(id); lgiClip(id, name, dur, false, desc, fn, ev); }
const lgiIn = (t, dur, a, b) => lgvE(clamp(t / (a || 0.5), 0, 1)) * (1 - lgvE(clamp((t - (dur - (b || 0.5))) / (b || 0.5), 0, 1)));
lgiIdle('si_edge', 'Edge test', 3.2, 'Thumb across the edge, never along it: three light touches from heel to tip, listening to the bite.', (P, t) => {
  const k = lgiIn(t, 3.2, 0.6, 0.6); lgSit(P, { t: t, lean: 0.3, head: 0.45 }); lgiStone(P, false); lgiSteady(P, 0);
  const K = lgMul(lgM4(), lgiKnifeOn(-0.02, -0.06, 1.2, 0.3, 0.06 * k), lgRot(lgM4(), 0, -0.6 * k, 0)); P.knife.at = 'handR'; P.grip.R = 'knife'; lgiIK(P, 'R', 'thighL', lgiHandOnKnife(K), lgiTW(-0.2, -0.9, -0.3));
  // the left thumb taps across the edge
  const tap = Math.max(0, Math.sin(t * 6)) * lgW(t, 0.7, 2.6) * (1 - lgW(t, 2.6, 2.7));
  if (k > 0.3) { const H = lgMul(lgM4(), K, lgTR(0.05 + lgW(t, 0.7, 2.6) * 0.07, 0.03, -0.03 - tap * 0.01, Math.PI / 2, 0, 0)); lgiIK(P, 'L', 'thighL', lgvMix(LGI_HOLD, H, k), lgiTW(-0.4, 0.8, -0.2)); P.grip.L = 'point'; }
});
lgiIdle('si_light', 'Into the light', 3.6, 'He lifts the blade into the bulb\'s light and turns it slowly, reading the edge for a bright line that would mean a flat spot.', (P, t) => {
  const k = lgiIn(t, 3.6, 0.9, 0.8); lgSit(P, { t: t, lean: lgLerp(0.3, 0.05, k), head: lgLerp(0.38, -0.25, k), neck: lgLerp(0.08, -0.1, k) }); lgiStone(P, false); lgiSteady(P, 0);
  P.knife.at = 'handR'; P.grip.R = 'knife'; const turn = Math.sin(t * 2.2) * 0.5 * k;
  const W0 = lgiHandOnKnife(lgiKnifeOn(-0.06, -0.01, 1.35, 0.3, 0)), up = [0.38, -0.05, 1.35];
  if (k < 0.02) lgiIK(P, 'R', 'thighL', W0, lgiTW(-0.2, -0.9, -0.3)); else lgiHand(P, 'R', [lgLerp(0.36, up[0], k), lgLerp(-0.12, up[1], k), lgLerp(0.62, up[2], k)], [turn, lgLerp(-0.3, -1.3, k), 0.4 * k], [-0.3, -0.9, -0.4]);
});
lgiIdle('si_wipe', 'Wipe the blade', 3.0, 'The blade wiped flat on his trouser leg, one side, a turn of the wrist, the other: grit off before the next strokes.', (P, t) => {
  const k = lgiIn(t, 3.0, 0.5, 0.6); lgSit(P, { t: t, lean: 0.36, head: 0.45 }); lgiStone(P, false); lgiSteady(P, 0); P.knife.at = 'handR'; P.grip.R = 'knife';
  const sw = Math.sin(lgW(t, 0.5, 2.4) * Math.PI * 2), side = t > 1.45 ? 1 : 0;
  const wipe = lgMul(lgM4(), lgTR(0.085, 0.04 + sw * 0.05, -0.18, 0, Math.PI / 2, 0), lgRot(lgM4(), side ? -Math.PI / 2 : Math.PI / 2, 0, Math.PI * 0.9));
  lgiIK(P, 'R', 'thighR', lgiHandOnKnife(lgvMix(lgMul(lgM4(), lgTR(0.1, 0.2, -0.25, 0, 0, 0), lgM4()), wipe, 1)), lgiTW(-0.3, -0.9, -0.2));
  if (k < 0.98) { const W0 = lgiHandOnKnife(lgiKnifeOn(-0.06, -0.01, 1.35, 0.3, 0)); if (k < 0.5) lgiIK(P, 'R', 'thighL', W0, lgiTW(-0.2, -0.9, -0.3)); }
});
lgiIdle('si_flip', 'Turn the stone', 3.0, 'Coarse side done: he lifts the stone off his knee, turns it over to the fine grit, sets it square and taps it down.', (P, t) => {
  const k = lgiIn(t, 3.0, 0.5, 0.5), turn = lgvE(lgW(t, 0.8, 1.9)); lgSit(P, { t: t, lean: 0.32, head: 0.45 });
  lgiKnifeRest(P); lgiHand(P, 'R', [0.35, -0.18, 0.62], [0, -0.4, 0.2]); P.grip.R = 'relax';
  P.carbine.at = 'aim'; P.carbine.sp = 'thighL'; const lift = lgPulse(t, 0.6, 2.2) * 0.12; P.carbine.M = lgMul(lgM4(), LGI_STONE, lgTR(0, 0, lift, turn * Math.PI, 0, 0));
  lgiIK(P, 'L', 'thighL', lgMul(lgM4(), P.carbine.M, lgBasis([0, -1, 0], [0, 0, 1], [-1, 0, 0], [0.005, 0.012, 0.05])), lgiTW(-0.4, 0.8, -0.2)); P.grip.L = 'cup';
}, [[2.4, 'stoneTap']]);
lgiIdle('si_spin', 'Knife spin', 2.6, 'A habit more than a trick: the knife rolled once round his fingers, caught by the handle, settled back.', (P, t) => {
  const k = lgiIn(t, 2.6, 0.5, 0.5); lgSit(P, { t: t, lean: 0.25, head: 0.3 }); lgiStone(P, false); lgiSteady(P, 0);
  P.knife.at = 'handR'; P.grip.R = lgW(t, 0.8, 1.5) > 0 && t < 1.5 ? 'open' : 'knife'; const sp = lgvE(lgW(t, 0.8, 1.5)) * TAU;
  lgiHand(P, 'R', [lgLerp(0.36, 0.42, k), lgLerp(-0.12, -0.2, k), lgLerp(0.62, 0.82, k)], [sp * 0.15, -0.8 * k, sp], [-0.3, -0.9, -0.4]);
}, [[1.5, 'catch']]);
for (const [id, name, dir, desc] of [['si_left', 'Down the street, left', 1, 'A long look down the dark to his left, the eyes first, then the head, then the shoulders following; holds; back to the work.'], ['si_right', 'Down the street, right', -1, 'The same to the right, toward the sodium light in the haze: a long look, a hold, back.']]) {
  lgiIdle(id, name, 4.2, desc, (P, t) => {
    const k = lgK(t, [[0, 0], [0.4, 0.3, 'o'], [0.9, 1, 'io'], [3.0, 1], [3.8, 0, 'io']]); lgSit(P, { t: t, lean: lgLerp(0.34, 0.18, k), head: lgLerp(0.38, 0.0, k), look: dir * 1.0 * k, twist: dir * 0.25 * k }); lgiWork(P, -0.06, -0.01, 0.01 * k);
  });
}
lgiIdle('si_bulb', 'The bulb flickers', 2.8, 'The bulb stutters; his eyes go up to it, a squint into the light, until it steadies.', (P, t) => {
  const k = lgK(t, [[0, 0], [0.25, 1, 'o3'], [1.8, 1], [2.6, 0, 'io']]); lgSit(P, { t: t, lean: lgLerp(0.34, 0.0, k), head: lgLerp(0.38, -0.55, k), neck: lgLerp(0.08, -0.3, k) }); lgiWork(P, -0.06, -0.01, 0);
}, [[0.0, 'bulbFlicker']]);
lgiIdle('si_neck', 'Neck stretch', 3.4, 'The head tipped to one shoulder, held, to the other, held: the stiffness of a long night.', (P, t) => {
  const k = lgiIn(t, 3.4, 0.5, 0.6), tl = lgK(t, [[0, 0], [0.7, 0.45, 'io'], [1.4, 0.45], [2.1, -0.45, 'io'], [2.7, -0.45], [3.4, 0, 'io']]); lgSit(P, { t: t, lean: 0.28, head: lgLerp(0.38, 0.1, k), tilt: tl }); lgiWork(P, -0.06, -0.01, 0);
});
lgiIdle('si_shoulders', 'Shoulder roll', 2.6, 'Both shoulders rolled back twice, the chest opening, a breath let out.', (P, t) => {
  lgSit(P, { t: t, lean: 0.24, head: 0.3 }); const r = Math.sin(lgW(t, 0.3, 2.2) * Math.PI * 4); lgShrug(P, 'L', 0.08 * Math.max(0, r), -0.05 * r); lgShrug(P, 'R', 0.08 * Math.max(0, r), -0.05 * r); lgiWork(P, -0.06, -0.01, 0);
});
lgiIdle('si_knuckles', 'Knuckles', 3.2, 'The knife laid on his thigh, fingers laced and pushed out until they crack, shaken loose, the knife picked back up.', (P, t) => {
  const k = lgiIn(t, 3.2, 0.7, 0.7), push = lgPulse(t, 1.1, 2.0); lgSit(P, { t: t, lean: lgLerp(0.3, 0.2, k), head: 0.3 }); lgiStone(P, false);
  if (k < 0.15) { lgiWork(P, -0.06, -0.01, 0); return; }
  lgiKnifeRest(P); const x = lgLerp(0.36, 0.48 + push * 0.12, k), z = lgLerp(0.62, 0.88, k);
  lgiHand(P, 'R', [x, -0.035, z], [-Math.PI / 2, 0, Math.PI / 2], [-0.3, -0.9, -0.5]); lgiHand(P, 'L', [x, 0.035, z], [Math.PI / 2, 0, -Math.PI / 2], [-0.3, 0.9, -0.5]); P.grip.L = P.grip.R = 'cup';
}, [[1.55, 'knuckles']]);
lgiIdle('si_watch', 'The time', 2.6, 'The left wrist turned up, a glance at the watch, the night not over.', (P, t) => {
  const k = lgiIn(t, 2.6, 0.5, 0.6); lgSit(P, { t: t, lean: 0.3, head: lgLerp(0.38, 0.5, k), look: 0.15 * k }); lgiWork(P, -0.06, -0.01, 0);
  if (k > 0.02) { lgiHand(P, 'L', [lgLerp(0.42, 0.42, k), lgLerp(0.12, 0.02, k), lgLerp(0.62, 0.95, k)], [lgLerp(0, -1.6, k), lgLerp(0, -0.9, k), 0.2], [-0.4, 0.9, -0.3]); P.grip.L = 'relax'; }
});
lgiIdle('si_lean', 'Lean back', 4.6, 'Back against the chair, legs out, the knife resting on his thigh: a long breath with his eyes on the street.', (P, t) => {
  const k = lgiIn(t, 4.6, 1.0, 1.0); lgSit(P, { t: t, lean: lgLerp(0.3, -0.22, k), head: lgLerp(0.38, 0.05, k), px: -0.05 * k, fl: 0.25 * k, fr: 0.18 * k, pl: -0.3 * k, pr: -0.25 * k }); lgiStone(P, false);
  if (k < 0.2) { lgiWork(P, -0.06, -0.01, 0); return; }
  lgiKnifeRest(P); lgiHand(P, 'R', [0.22, -0.2, 0.58], [0, -0.2, 0.2]); lgiHand(P, 'L', [0.2, 0.2, 0.6], [0, -0.2, -0.2]); P.grip.L = P.grip.R = 'relax';
}, [[0.9, 'chairCreak']]);
lgiIdle('si_elbows', 'Elbows on knees', 4.0, 'Forward onto his elbows, the knife hanging from his fingers, head down for a moment of quiet.', (P, t) => {
  const k = lgiIn(t, 4.0, 0.8, 0.8); lgSit(P, { t: t, lean: lgLerp(0.3, 0.7, k), head: lgLerp(0.38, 0.6, k) }); lgiStone(P, false);
  if (k < 0.15) { lgiWork(P, -0.06, -0.01, 0); return; }
  P.knife.at = 'handR'; P.grip.R = 'knife'; lgiHand(P, 'R', [0.45, -0.08, 0.5], [0, 0.6, 0.6], [0.2, -0.9, 0.2]); lgiHand(P, 'L', [0.45, 0.08, 0.52], [0, 0.6, -0.6], [0.2, 0.9, 0.2]); P.grip.L = 'relax';
});
lgiIdle('si_eyes', 'Tired eyes', 3.0, 'The knife lowered, the back of his wrist pressed to his eyes, a slow rub, blinking the street back into focus.', (P, t) => {
  const k = lgiIn(t, 3.0, 0.6, 0.7); lgSit(P, { t: t, lean: lgLerp(0.3, 0.35, k), head: lgLerp(0.38, 0.45, k) }); lgiStone(P, false); lgiSteady(P, 0);
  P.knife.at = 'handR'; P.grip.R = 'knife'; if (k < 0.05) { lgiWork(P, -0.06, -0.01, 0); return; }
  const rub = Math.sin(t * 7) * 0.012 * lgW(t, 0.7, 2.2); lgiHand(P, 'R', [lgLerp(0.36, 0.2, k), lgLerp(-0.12, -0.03 + rub, k), lgLerp(0.62, 1.18, k)], [lgLerp(0, 1.4, k), lgLerp(-0.3, -1.8, k), 0.4 * k], [-0.1, -0.9, -0.6]);
});
lgiIdle('si_sigh', 'A long breath', 3.6, 'In through the nose until the shoulders rise, held, and let out slowly; the shoulders drop.', (P, t) => {
  const b = lgK(t, [[0, 0], [1.3, 1, 'io'], [1.8, 1], [3.4, -0.3, 'io'], [3.6, 0]]); lgSit(P, { t: t, lean: 0.3 - b * 0.08, head: 0.38 - b * 0.12, breath: false });
  lgJadd(P, 'chest', 0, -0.05 * b, 0); lgShrug(P, 'L', 0.06 * b, 0); lgShrug(P, 'R', 0.06 * b, 0); lgiWork(P, -0.06, -0.01, 0);
}, [[0.2, 'breathIn'], [1.9, 'breathOut']]);
lgiIdle('si_tap', 'Foot tap', 3.8, 'His right foot keeps a slow time on the paving while the blade rests on the stone.', (P, t) => {
  const tap = Math.max(0, Math.sin(t * Math.PI * 2 / 0.75)) * lgW(t, 0.3, 0.6) * (1 - lgW(t, 3.2, 3.6)); lgSit(P, { t: t, lean: 0.3, head: 0.35, liftR: 0.0, pr: -0.35 * tap }); lgiWork(P, -0.06, -0.01, 0);
}, [[0.75, 'tap'], [1.5, 'tap'], [2.25, 'tap'], [3.0, 'tap']]);
lgiIdle('si_boot', 'Boot lace', 4.4, 'The knife set down on his thigh; he leans down to the left boot, pulls the lace tight, double-knots it, sits back up.', (P, t) => {
  const k = lgiIn(t, 4.4, 0.9, 0.9); lgSit(P, { t: t, lean: lgLerp(0.3, 0.95, k), head: lgLerp(0.38, 0.4, k), twist: 0.15 * k, fl: -0.06 * k }); lgiStone(P, false);
  if (k < 0.15) { lgiWork(P, -0.06, -0.01, 0); return; }
  lgiKnifeRest(P); const pull = Math.sin(t * 9) * 0.02 * lgW(t, 1.3, 3.1);
  lgiHand(P, 'L', [lgLerp(0.4, 0.3, k), lgLerp(0.12, 0.21, k), lgLerp(0.6, 0.18, k) + pull], [0, 1.2 * k, 0], [0.3, 0.9, 0.3]); lgiHand(P, 'R', [lgLerp(0.36, 0.32, k), lgLerp(-0.12, 0.13, k), lgLerp(0.62, 0.19, k) - pull], [0, 1.2 * k, 0], [0.3, -0.9, 0.3]); P.grip.L = P.grip.R = 'claw';
});
lgiIdle('si_press', 'Press check', 4.0, 'The pistol out of the holster, the slide eased back an inch to see brass, home, back in the holster without looking.', (P, t) => {
  const k = lgiIn(t, 4.0, 0.8, 0.8), ck = lgPulse(t, 1.5, 2.6); lgSit(P, { t: t, lean: 0.28, head: lgLerp(0.38, 0.5, ck) }); lgiStone(P, false);
  if (k < 0.2) { lgiWork(P, -0.06, -0.01, 0); return; }
  lgiKnifeRest(P);
  if (t < 0.9 || t > 3.3) { P.pistol.at = 'holster'; lgiHand(P, 'R', [0.06, -0.24, 0.6], [0, 0.4, 0.1]); P.grip.R = 'pistol'; }
  else { lgPistolAt(P, [0.3, -0.02, -0.12, 0.3, 0.2, -0.6]); P.pistol.slide = ck * 0.25; }
}, [[1.0, 'holster'], [1.9, 'slideRack'], [3.3, 'holster']]);
lgiIdle('si_radio', 'Radio', 3.6, 'Two fingers to the push-to-talk, head tipped to the earpiece, listening; a nod; back to it.', (P, t) => {
  const k = lgiIn(t, 3.6, 0.6, 0.7); lgSit(P, { t: t, lean: 0.25, head: lgLerp(0.38, 0.2, k), tilt: -0.2 * k, look: 0.25 * k }); lgiWork(P, -0.06, -0.01, 0);
  if (k > 0.02) { lgiHand(P, 'L', [lgLerp(0.42, 0.12, k), lgLerp(0.12, 0.13, k), lgLerp(0.62, 1.28, k)], [0, -0.5, 0.3], [-0.5, 0.9, -0.2]); P.grip.L = 'point'; }
  lgJadd(P, 'head', 0, lgPulse(t, 2.4, 2.8) * 0.15, 0);
}, [[0.7, 'radioClick']]);
lgiIdle('si_glove', 'Glove', 3.0, 'The knife in the left hand for a moment; the right glove pulled tight at the cuff, fingers flexed, the knife taken back.', (P, t) => {
  const k = lgiIn(t, 3.0, 0.6, 0.6); lgSit(P, { t: t, lean: 0.28, head: 0.45 }); lgiStone(P, false);
  if (k < 0.15) { lgiWork(P, -0.06, -0.01, 0); return; }
  lgiKnifeRest(P); const tug = lgPulse(t, 1.0, 1.6);
  lgiHand(P, 'R', [0.4, -0.04, 0.8], [0, -0.9, 0.6], [-0.3, -0.9, -0.4]); lgiHand(P, 'L', [0.36, -0.03 + tug * 0.02, 0.76], [0, -0.6, -0.8], [-0.3, 0.9, -0.4]); P.grip.R = tug > 0.3 ? 'open' : 'relax'; P.grip.L = 'claw';
}, [[1.2, 'glove']]);
lgiIdle('si_drum', 'Drumming', 3.2, 'The fingers of his left hand drum on the stone\'s edge, slow, then quick, then still.', (P, t) => {
  lgSit(P, { t: t, lean: 0.3, head: 0.35, look: Math.sin(t * 0.8) * 0.2 }); lgiWork(P, -0.06, -0.01, 0);
  const d = Math.sin(t * (t < 1.6 ? 9 : 16)) > 0.4 ? 1 : 0; P.grip.L = d ? 'open' : 'claw';
});
lgiIdle('si_stretch', 'Stretch', 3.8, 'The knife set on his thigh, both arms up over his head, fingers laced, a long stretch, and down.', (P, t) => {
  const k = lgiIn(t, 3.8, 1.0, 1.0); lgSit(P, { t: t, lean: lgLerp(0.3, -0.12, k), head: lgLerp(0.38, -0.2, k) }); lgiStone(P, false);
  if (k < 0.15) { lgiWork(P, -0.06, -0.01, 0); return; }
  lgiKnifeRest(P); const z = lgLerp(0.65, 1.95, k);
  lgiHand(P, 'R', [lgLerp(0.36, 0.0, k), -0.04, z], [-Math.PI / 2, -1.4 * k, Math.PI / 2], [0, -1, 0.3]); lgiHand(P, 'L', [lgLerp(0.36, 0.0, k), 0.04, z], [Math.PI / 2, -1.4 * k, -Math.PI / 2], [0, 1, 0.3]); P.grip.L = P.grip.R = 'cup';
}, [[1.4, 'stretch']]);
lgiIdle('si_hum', 'Humming', 4.4, 'An old tune under his breath: the head nods with it, a stroke of the knife now and then in time.', (P, t) => {
  const nod = Math.sin(t * Math.PI * 2 / 1.1) * 0.06; lgSit(P, { t: t, lean: 0.32, head: 0.36 + nod }); const s = lgvE((t % 1.1) / 1.1);
  lgiStone(P, false); lgiSteady(P, 0); P.knife.at = 'handR'; P.grip.R = 'knife'; lgiIK(P, 'R', 'thighL', lgiHandOnKnife(lgiKnifeOn(lgLerp(-0.06, 0.02, s), lgLerp(-0.01, -0.05, s), 1.35, 0.3, 0)), lgiTW(-0.2, -0.9, -0.3));
}, [[0.0, 'hum']]);
lgiIdle('si_grit', 'Grit', 3.0, 'He brushes the slurry and grit off the stone with the side of his thumb and blows across it.', (P, t) => {
  const k = lgiIn(t, 3.0, 0.5, 0.5); lgSit(P, { t: t, lean: lgLerp(0.34, 0.5, k), head: 0.5 }); lgiStone(P, false);
  P.knife.at = 'handR'; P.grip.R = 'knife'; lgiHand(P, 'R', [0.32, -0.2, 0.66], [0, -0.5, 0.3]);
  const br = Math.sin(lgW(t, 0.6, 2.2) * Math.PI * 3) * 0.07; lgiIK(P, 'L', 'thighL', lgvMix(LGI_HOLD, lgMul(lgM4(), LGI_STONE, lgBasis([0, -1, 0], [0, 0, 1], [-1, 0, 0], [br, 0.04, 0.035])), k), lgiTW(-0.4, 0.8, -0.2)); P.grip.L = 'open';
}, [[2.4, 'blow']]);
lgiIdle('si_angle', 'Sighting the edge', 3.4, 'The blade held edge-on to his eye, sighting down it for a glint of a roll or a burr.', (P, t) => {
  const k = lgiIn(t, 3.4, 0.8, 0.8); lgSit(P, { t: t, lean: lgLerp(0.3, 0.1, k), head: lgLerp(0.38, 0.05, k) }); lgiStone(P, false); lgiSteady(P, 0);
  P.knife.at = 'handR'; P.grip.R = 'knife'; if (k < 0.05) { lgiWork(P, -0.06, -0.01, 0); return; }
  lgiHand(P, 'R', [lgLerp(0.36, 0.45, k), lgLerp(-0.12, -0.02, k), lgLerp(0.62, 1.18, k)], [lgLerp(0, -1.2, k), lgLerp(-0.3, -0.2, k), lgLerp(0, 1.5, k)], [-0.3, -0.9, -0.4]);
});
lgiIdle('si_doze', 'Nodding off', 5.0, 'The strokes slow, the head drops by degrees -- and jerks back up. A shake of the head; back to the stone.', (P, t) => {
  const drop = lgK(t, [[0, 0], [2.8, 1, 'i'], [3.05, 1], [3.25, -0.2, 'o3'], [4.0, 0, 'io']]), jerk = lgPulse(t, 3.05, 3.5);
  lgSit(P, { t: t, lean: 0.3 + drop * 0.12, head: 0.38 + drop * 0.45 - jerk * 0.2 }); lgShrug(P, 'L', jerk * 0.08, 0); lgShrug(P, 'R', jerk * 0.08, 0);
  lgiWork(P, lgLerp(-0.06, 0.0, drop), -0.01, 0.0); lgJadd(P, 'head', 0, 0, Math.sin(t * 18) * 0.08 * lgPulse(t, 3.4, 4.0));
}, [[3.05, 'startle']]);
lgiIdle('si_sheath', 'Sheathed and drawn', 4.2, 'The knife back into the sheath on his chest, a hand flat on it for a moment, then drawn again and laid on the stone.', (P, t) => {
  const k = lgiIn(t, 4.2, 0.6, 0.6); lgSit(P, { t: t, lean: lgLerp(0.3, 0.12, k), head: lgLerp(0.38, 0.25, k) }); lgiStone(P, false); lgiSteady(P, 0);
  if (k < 0.1) { lgiWork(P, -0.06, -0.01, 0); return; }
  if (t > 1.3 && t < 2.8) { P.knife.at = 'sheath'; lgHandTo(P, 'R', 'chest', [0.22, 0.02, -0.11], [0, -0.2, 0.2], [-0.3, -0.9, -0.5]); P.grip.R = 'open'; }
  else { P.knife.at = 'handR'; P.grip.R = 'knife'; lgHandTo(P, 'R', 'chest', [lgLerp(0.35, 0.22, k), lgLerp(-0.12, 0.03, k), lgLerp(-0.45, -0.11, k)], [0, lgLerp(-0.3, 0.2, k), 0.2], [-0.3, -0.9, -0.5]); }
}, [[1.3, 'sheathIn'], [2.8, 'knifeOut']]);
lgiIdle('si_scan', 'Street sounds', 4.8, 'Something far off -- a siren, a dog -- and he lifts his head toward it, still, until it fades.', (P, t) => {
  const k = lgK(t, [[0, 0], [0.5, 1, 'o'], [3.6, 1], [4.6, 0, 'io']]), dir = Math.sin(t * 0.6) * 0.25 + 0.5; lgSit(P, { t: t, lean: lgLerp(0.32, 0.12, k), head: lgLerp(0.38, -0.05, k), look: dir * k }); lgiWork(P, -0.06, -0.01, 0);
}, [[0.2, 'siren']]);
lgiIdle('si_coin', 'The pebble', 3.4, 'A pebble from the paving turned over in his fingers, flicked into the street, watched till it stops.', (P, t) => {
  const k = lgiIn(t, 3.4, 0.7, 0.7); lgSit(P, { t: t, lean: lgLerp(0.3, 0.5, lgPulse(t, 0.5, 1.4)), head: lgLerp(0.38, 0.3, k) }); lgiWork(P, -0.06, -0.01, 0);
  if (k > 0.02) { const fl = lgPulse(t, 2.0, 2.4); lgiHand(P, 'L', [lgLerp(0.42, 0.5 + fl * 0.12, k), lgLerp(0.12, 0.2, k), lgLerp(0.62, lgLerp(0.2, 0.75, lgW(t, 1.4, 1.9)), k)], [0, 0.4, -0.3], [0.2, 0.9, 0.2]); P.grip.L = fl > 0.3 ? 'open' : 'claw'; }
}, [[2.15, 'flick']]);

/* ---------- the director of the stoop ---------- */
// it plays the sharpening loop, now and then one of the twenty-five (never the same twice running, the long ones less
// often), cross-fading in and out of the base so nothing jumps; and every so often, the can
function lgiStart(o) {
  const q = MIMQ[mimLevel()], pl = lgPlayer(); lgPlay(pl, 'sit_sharpen', { fade: 0, t: Math.random() * 3 }); pl.ctx.inPlace = true;
  const D = LGI.scene = { t: 0, next: 4 + Math.random() * 4, last: [], canAt: o && o.canAt != null ? o.canAt : 9 + Math.random() * 5, can: null, w3: phy3New({ ground: 0.0, g: 9.81 }), lamp: { a: { x: 0.05, v: 0 }, b: { x: 0, v: 0 } }, flick: 0, flickT: 6 + Math.random() * 8, mothT: 0 };
  // the world for the can: the sidewalk is a box (its top at 0.12), the curb, the wall
  D.w3.boxes.push({ min: [-1.3, -12, 0], max: [1.8, 12, 0.12] }, { min: [-2, -12, 0], max: [-1.3, 12, 4] });
  if (o && o.idle && LG_ANIM_BY[o.idle]) lgPlay(pl, o.idle, { fade: 0, t: o.idleT || 0 }), D.next = 1e9;
  // where the hovered card sits across the screen (0 left, 1 right): he is framed on the far third, clear of it
  D.avoid = o && o.avoid != null ? clamp(+o.avoid, 0, 1) : null; D.fy = { x: lgiFrameY(D), v: 0 };
  const A = mimActor({ model: 'operator', cls: (MIM.cls || 'attack') + '|idle', lod: q.lod === 0 ? 0 : 1, acc: lgHex(LG_CLASS_BY[MIM.cls || 'attack'].col), player: pl });
  return [A];
}
function lgiTick(rdt) {
  const D = LGI.scene, A = MIM.actors[0]; if (!D || !A || !A.player) return;
  D.t += rdt; const pl = A.player;
  // the can: kicked from beyond the edge of the frame, it rattles into the street; the alert plays as it lands
  if (!D.can && D.t >= D.canAt && pl.a && pl.a.id !== 'sit_alert') {
    const side = Math.random() < 0.5 ? 1 : -1;
    D.can = phy3Add(D.w3, { s: 'cyl', r: 0.033, h: 0.12, p: [1.0 + Math.random() * 0.5, side * 4.4, 0.45], v: [0.9 + Math.random() * 0.5, -side * (3.0 + Math.random() * 0.8), 1.8], w: [Math.random() * 6, 14 * side, Math.random() * 4], e: 0.35, mu: 0.4, rr: 0.035, rollSign: -side });
    D.canSide = side; D.canHits = 0; mimSfx('canKick', 1); lgPlay(pl, 'sit_alert', { fade: 0.08, restart: true }); D.after = 'sit_sharpen';
    MIM.look.alert = side; D.next = D.t + 9;
  }
  if (D.can) {
    const b = D.can, vz0 = b.v[2]; phy3Step(D.w3, rdt);
    if (vz0 < -0.8 && b.v[2] > 0) { D.canHits++; if (D.canHits < 6) mimSfx('canBounce', 0.9 + Math.random() * 0.2); }
    if (b.rest && !D.canStill) { D.canStill = true; mimSfx('canRoll', 0.8); }
    const M = phy3Mat(b); MIM.setW.set(M, LGI_CAN * 16);
    if (D.t > D.canAt + 30) { D.can = null; D.canStill = false; D.w3.bodies.length = 0; D.canAt = D.t + 26 + Math.random() * 24; MIM.setW.set(LG_HIDE, LGI_CAN * 16); }
  } else MIM.setW.set(LG_HIDE, LGI_CAN * 16);
  // a clip that has finished goes back to the sharpening; the next idle when it is time
  if (pl.done || (pl.a && pl.a.id === 'sit_alert' && pl.done)) { lgPlay(pl, 'sit_sharpen', { fade: 0.9, t: 0 }); D.next = D.t + 3 + Math.random() * 6; }
  else if (pl.a && pl.a.id === 'sit_sharpen' && D.t >= D.next) {
    const pool = LGI_IDLES.filter(id => D.last.indexOf(id) < 0), id = pool[(Math.random() * pool.length) | 0];
    D.last.push(id); if (D.last.length > 8) D.last.shift();
    lgPlay(pl, id, { fade: 0.8, restart: true });
  }
  // the lamp on its cable: a pendulum the night breeze keeps pushing; the bulb flickers now and then
  const L = D.lamp; physPendulum(L.a, 0.6, rdt, Math.sin(D.t * 0.37) * 0.25 + Math.sin(D.t * 1.3) * 0.08, 0.15); physPendulum(L.b, 0.6, rdt, Math.cos(D.t * 0.29) * 0.2, 0.15);
  MIM.setW.set(lgMul(lgM4(), lgTR(0.3, 0.1, 3.0, 0, 0, 0), lgRot(lgM4(), L.b.x, L.a.x, 0)), LGI_LAMP * 16);
  D.flickT -= rdt; if (D.flickT <= 0) { D.flick = 0.55; D.flickT = 7 + Math.random() * 12; if (pl.a && pl.a.id === 'sit_sharpen' && Math.random() < 0.5) { lgPlay(pl, 'si_bulb', { fade: 0.4, restart: true }); } mimSfx('bulbFlicker'); }
  D.flick = Math.max(0, D.flick - rdt);
}
// where the bulb is (world), how bright (a flicker is a stutter of on and off), its colour
function lgiBulb() {
  const D = LGI.scene; if (!D) return { p: [0.3, 0.1, 2.31], k: 1 };
  const M = MIM.setW.subarray(LGI_LAMP * 16, LGI_LAMP * 16 + 16), p = lgPt(M, 0, 0, -0.69);
  const f = D.flick > 0 ? (Math.sin(D.t * 90) > 0.2 || Math.sin(D.t * 23) > 0.6 ? 0.15 : 1) : 1;
  return { p: p, k: f * (0.92 + Math.sin(D.t * 31) * 0.02 + Math.sin(D.t * 7.3) * 0.02) };
}
function lgiLights() {
  const b = lgiBulb(), k = b.k;
  return {
    key: { dir: [0.85, -0.35, 0.45], col: [0.2, 0.25, 0.36] }, rim: { dir: [-1, 0.5, 0.45], col: [0.55, 0.42, 0.3] }, sky: [0.045, 0.052, 0.072], gnd: [0.03, 0.026, 0.022],
    pts: [{ p: b.p, r: 4.4, col: [2.4 * k, 1.7 * k, 0.95 * k] }, { p: [2.9, -11, 5.2], r: 16, col: [1.4, 0.8, 0.3] }, { p: [-1.1, -2.35, 1.6], r: 1.6, col: [0.5, 0.35, 0.2] }, { p: [-1.1, -0.55, 3.25], r: 1.4, col: [0.7, 0.12, 0.45] }],
    fog: { col: [0.025, 0.03, 0.045], d: 0.05, h: 0.1, s: 2 }, wet: 0.85, expo: 1.35, clear: [0.008, 0.011, 0.018]
  };
}
// the camera lies on the street across from him, low, looking at him; it breathes and drifts a little; when the can
// comes it whips a touch toward the sound and pushes in
// the framing: the subject on a third (the rule of thirds), the third away from the card the player is hovering, so the
// card never covers him; with no card he sits a little right of centre, looking into the street
function lgiFrameY(D) {
  const asp = MIM.asp || 16 / 9, f = !D || D.avoid == null ? 0.56 : D.avoid < 0.45 ? 0.69 : D.avoid > 0.55 ? 0.31 : 0.29;
  if (asp < 1.1) return 0;   // (a phone held upright: the frame is too narrow for thirds, he stays in the middle and the card sits below him)
  return -(f - 0.5) * 2 * 1.42 * asp;   // (screen right is +y here; 1.42 m is half the frame's height at his distance)
}
// 1.9.996: the stoop is cut like a film's quiet scene, four shots on a loop of 26 s, each held long (6 to 9 s, the pace
// of a calm scene): the low wide pushing in on him; a side medium on the knife and stone; an insert on his hands and
// the blade; his face, close. Every shot keeps him on the third away from the card (or centred on a phone held upright,
// raised clear of the card below); the can in the dark always cuts back to the wide.
const LGI_SHOTS = [{ t: 9, id: 'wide' }, { t: 6, id: 'side' }, { t: 5, id: 'hands' }, { t: 6, id: 'face' }];
function lgiShotAt(rt) { const T = LGI_SHOTS.reduce((a, b) => a + b.t, 0); let u = ((rt % T) + T) % T; for (let i = 0; i < LGI_SHOTS.length; i++) { if (u < LGI_SHOTS[i].t) return { i: i, id: LGI_SHOTS[i].id, u: u, k: u / LGI_SHOTS[i].t }; u -= LGI_SHOTS[i].t; } return { i: 0, id: 'wide', u: 0, k: 0 }; }
function lgiCam(rt) {
  const D = LGI.scene, A = MIM.actors[0], c = A && A.W ? mimBone(A, 'chest') : [0, 0, 0.9];
  if (D && D.fy) physSpring(D.fy, lgiFrameY(D), 1.6, Math.min(0.05, Math.max(0, rt - (D.camRt || rt)))); if (D) D.camRt = rt;
  const fy = D && D.fy ? D.fy.x : 0, tall = (MIM.asp || 2) < 1.1;
  const al = D && A.player && A.player.a && A.player.a.id === 'sit_alert', alert = al ? lgPulse(A.player.t, 1.1, 5.2) : 0, look = al ? lgPulse(A.player.t, 0.0, 1.6) : 0, side = (D && D.canSide) || 1;
  const sh = al ? { id: 'wide', k: 0, u: 0 } : lgiShotAt(rt);
  if (sh.id === 'wide' || !A || !A.W) {
    const dr = Math.sin(rt * 0.09) * 0.35, push = alert * 0.9 + (al ? 0 : sh.k * 0.55);
    return { eye: [5.0 - push + Math.sin(rt * 0.05) * 0.15, -0.3 + dr, 0.16 + Math.sin(rt * 0.13) * 0.02], tgt: [c[0] * 0.6, c[1] * 0.6 + fy * (1 - alert * 0.5) + side * (alert * 0.4 + look * 0.6), lgLerp(0.86, 1.05, alert) - (tall ? 0.5 : 0)], fov: lgLerp(0.56, 0.5, alert), roll: Math.sin(rt * 0.07) * 0.01, shake: 0.06 + alert * 0.25, flare: 0.8 };
  }
  const H = mimBone(A, 'head'), hL = mimBone(A, 'handL'), hR = mimBone(A, 'handR'), hm = mimMid(hL, hR), k = sh.k;
  let eye, tgt, fov;
  if (sh.id === 'side') { const m = mimMid(c, hm); eye = [m[0] + 1.75 - 0.25 * k, m[1] - 1.45 + 0.2 * k, m[2] + 0.12]; tgt = [m[0], m[1], m[2] + 0.02]; fov = 0.5; }
  else if (sh.id === 'hands') { eye = [hm[0] + 0.8 - 0.12 * k, hm[1] - 0.42, hm[2] + 0.34]; tgt = [hm[0], hm[1], hm[2] - 0.01]; fov = 0.42; }
  else { eye = [H[0] + 0.92 - 0.12 * k, H[1] + 0.52, H[2] - 0.24]; tgt = [H[0] + 0.03, H[1] + 0.01, H[2] + 0.0]; fov = 0.4; }   // (from under the helmet's brim: he is looking down at the blade)
  // the subject on the third away from the card: the wide's offset scaled to this frame's size, the camera moved across
  const d = Math.hypot(tgt[0] - eye[0], tgt[1] - eye[1], tgt[2] - eye[2]), hh = d * Math.tan(fov / 2), f = fy * hh / 1.42;
  const fx = tgt[0] - eye[0], fyv = tgt[1] - eye[1], rl = Math.hypot(fx, fyv) || 1, rx = fyv / rl, ry = -fx / rl;   // (screen right: the view's direction crossed with up)
  eye = [eye[0] + rx * f, eye[1] + ry * f, eye[2]]; tgt = [tgt[0] + rx * f, tgt[1] + ry * f, tgt[2] - (tall ? hh * 0.35 : 0)];
  return { eye: eye, tgt: tgt, fov: fov, roll: Math.sin(rt * 0.07) * 0.008, shake: 0.05, flare: 0.6 };
}
