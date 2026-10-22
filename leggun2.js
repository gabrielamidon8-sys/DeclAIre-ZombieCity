/* ================= LEGEND: ten more guns (1.9.997), built like the first ten (leggun.js) =================
   Five long guns and five sidearms, chosen so that no two share an action, a round and a silhouette, each with its own
   reload (the research notes: SP/research14_guns.md, part A):
   - MP5A3: a 9 mm roller-delayed submachine gun; the tubular receiver, the slotted cocking tube over the barrel, the
     drum sight, the slim handguard, the two-strut collapsing stock; the charging handle at 45 degrees on the left
     that locks back and is slapped down.
   - M249: the belt-fed squad automatic; the feed cover that hinges up, the belt in the tray, the 200-round pouch
     under it, the carry handle on the barrel, the bipod folded under the gas tube, a fixed polymer stock.
   - Mk 14 Mod 0: the M14 action in an aluminium chassis; the op-rod handle on the right that reciprocates, the long
     railed forend, a variable scope, a collapsible stock with its cheek riser, a 20-round magazine that rocks in.
   - Mossberg 590A1: the pump; a long magazine tube to the muzzle, the ribbed forend on twin action bars, the heat
     shield, the ghost ring and the bayonet lug, the loading gate underneath, a pistol-grip stock.
   - Steyr AUG A3: the bullpup; the magazine behind the grip, the folding foregrip folded forward, the three-prong
     flash hider, the top rail with an optic, the charging slot on the left, the translucent magazine.
   - Glock 17 Gen5: the polymer striker pistol at its 22 degree grip angle, front and rear serrations, no finger
     grooves, a flared magazine well.
   - Desert Eagle Mark XIX .50 AE: the tall squared slide, the triangular barrel block with its rail, the gas piston
     tube under the barrel, the safety levers on the slide.
   - Smith & Wesson Model 29: the .44 Magnum N-frame; a 6.5 in barrel with its top rib and full ejector shroud, the
     adjustable rear sight and red ramp front, target hammer and trigger, wood target grips; a speedloader.
   - FN Five-seveN MK2: the slab-sided polymer-clad slide, the large trigger guard, the safety above it, the rail.
   - A sawed-off coach gun: side-by-side barrels cut to twelve inches, the top lever, two triggers, a bird's-head grip;
     it breaks open on its hinge.
   The moving parts sit on LEGEND's part bones (slide, hammer, cyl, cbolt, ccharge, cpump; legend.js) and each gun's
   act says how far they travel and how it kicks (legfire.js). */
function lgGun2Mats(K) {
  const M = lgGunMats(K);
  if (!M.ndlc) {
    M.ndlc = lgMtl({ c: '#1b1d20', t: LT.metal, r: 0.34, m: 0.7, w: 0.03, n: 0.5, k: 0.08 });        // the Glock's nDLC slide
    M.polyLt = lgMtl({ c: '#24272a', t: LT.poly, r: 0.58, w: 0.1, n: 0.9, k: 0.05 });                 // lighter polymer (the AUG, the Five-seveN)
    M.augGrn = lgMtl({ c: '#4a5a3e', t: LT.poly, r: 0.6, w: 0.1, n: 0.8, k: 0.06 });                   // the AUG's olive body
    M.augMag = lgMtl({ c: '#8ea089', t: LT.poly, r: 0.3, w: 0.05, n: 0.3, k: 0.05 });                  // its translucent magazine (a pale shell)
    M.chrome = lgMtl({ c: '#b8bcc2', t: LT.metal, r: 0.18, m: 0.95, w: 0.02, n: 0.2, k: 0.08 });        // the Desert Eagle's brushed steel
    M.alu = lgMtl({ c: '#55585c', t: LT.metal, r: 0.46, m: 0.7, w: 0.04, n: 0.6, k: 0.1 });            // the Mossberg's and the chassis's aluminium
    M.canvas = lgMtl({ c: '#4f5240', t: LT.cord, r: 0.86, w: 0.1, n: 0.9, k: 0.1 });                    // the M249's ammunition pouch (Cordura; 1.9.997: it named a texture that does not exist and drew as plain plastic)
    M.wood = lgMtl({ c: '#7a4a2a', t: LT.leather, r: 0.4, w: 0.2, n: 0.5, k: 0.06 });                  // the Model 29's target grips
    M.link = lgMtl({ c: '#5c5e60', t: LT.metal, r: 0.5, m: 0.7, w: 0.04, n: 0.6, k: 0.1 });
  }
  return M;
}
/* ---------- the long guns (carbine bone; the origin on the bore line over the pistol grip) ---------- */
// MP5A3
function lgGunMP5(B, K) {
  const M = lgGun2Mats(K), hi = B.lod < 2, top = B.lod === 0;
  lgBone(B, 'carbine');
  // the receiver: a 37 mm tube from the rear cap to the trunnion, the cocking tube over the barrel, the magazine housing
  lgMat(B, M.gunBlk); lgBore(B, -0.11, 0.2, [[0, 0.018], [0.05, 0.0185], [1, 0.0185]], 0, 0.0, { segs: 14 });
  lgBore(B, 0.09, 0.16, 0.0185, 0, 0.0, { segs: 14 });
  lgBore(B, 0.03, 0.28, [[0, 0.01], [0.9, 0.0105], [1, 0.0095]], 0, 0.026, { segs: 10 });   // the cocking tube
  if (top) for (let i = 0; i < 9; i++) lgBox(B, 0.11 + i * 0.02, 0, 0.0365, 0.006, 0.0022, 0.0008, 0);   // its slots
  lgBox(B, -0.112, 0, 0.0, 0.004, 0.019, 0.019, 0.003);                                                    // the rear cap
  // (1.9.997, the detail pass: the stamped receiver wraps up round the cocking tube, so the tube is part of the gun and
  // not a bar floating over it; the pressed ribs on the receiver's sides; the two push pins that hold the trigger group)
  lgSide(B, [[-0.1, 0.004], [0.25, 0.004], [0.25, 0.03], [-0.07, 0.03], [-0.1, 0.022]], 0.03, { bev: 0.003, round: true });
  if (hi) { for (const sy of [1, -1]) lgBox(B, -0.03, sy * 0.0186, 0.004, 0.06, 0.0008, 0.0022, 0.0008); lgMat(B, M.metal); lgPin(B, -0.088, -0.009, 0.0026, 0.034); lgPin(B, 0.032, -0.009, 0.0026, 0.034); lgMat(B, M.gunBlk); }
  // the magazine housing and the paddle release behind it
  lgSide(B, [[0.045, -0.012], [0.105, -0.012], [0.105, -0.036], [0.047, -0.036]], 0.03, { bev: 0.0025, round: true });
  if (hi) { lgMat(B, M.gunBlk); lgSide(B, [[0.036, -0.03], [0.046, -0.032], [0.046, -0.046], [0.034, -0.044]], 0.014, { bev: 0.001 }); }   // the paddle
  // the polymer trigger group with the grip, the selector on the left, the trigger
  lgMat(B, M.gunPoly); lgSide(B, [[-0.095, -0.014], [0.045, -0.014], [0.045, -0.04], [0.0, -0.04], [-0.04, -0.044], [-0.095, -0.03]], 0.03, { bev: 0.003, round: true });
  M.gunPoly.dk = M.gunPoly.dk || lgMtl({ c: '#141516', t: LT.poly, r: 0.78, w: 0.06, n: 1.0, k: 0.04 }); B.M.dk = M.gunPoly.dk;
  lgARGrip(B, -0.012, -0.036, 0.029, { plain: !top });
  lgTrigger(B, M, -0.016, 0.044, -0.062, -0.042, { tx: 0.014 });
  if (hi) { lgMat(B, M.gunBlk); lgPush(B, lgTR(-0.036, 0.0155, -0.024, Math.PI / 2, 0, 0)); lgSide(B, [[-0.002, -0.003], [0.015, -0.002], [0.016, 0.002], [-0.002, 0.003]], 0.0018, { bev: 0.0005 }); lgPop(B); if (top) { lgMat(B, M.poly); for (let i = 0; i < 3; i++) lgBox(B, -0.046, 0.0158, -0.018 - i * 0.005, 0.0012, 0.0004, 0.0012, 0); } }   // the selector and its pictograms
  // the slim handguard under the cocking tube, ribbed
  lgMat(B, M.gunPoly); lgSide(B, [[0.1, -0.012], [0.265, -0.012], [0.27, -0.004], [0.27, 0.012], [0.265, 0.016], [0.1, 0.016], [0.096, 0.004]], 0.044, { bev: 0.007, round: true });
  if (top) { lgMat(B, M.gunPoly.dk); for (let i = 0; i < 7; i++) for (const s of [1, -1]) lgBox(B, 0.118 + i * 0.021, s * 0.0222, -0.001, 0.005, 0.0005, 0.011, 0.001); }
  // the barrel and its three-lug muzzle, the front sight hood on the cocking tube, the drum sight at the back
  lgMat(B, M.gunBlk); lgBore(B, 0.25, 0.085, [[0, 0.0078], [1, 0.0075]]); lgBore(B, 0.3, 0.035, [[0, 0.0095], [0.5, 0.0098], [1, 0.0085]], 0, 0, { segs: 10 });
  if (top) for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.5; lgBox(B, 0.325, Math.cos(a) * 0.0105, Math.sin(a) * 0.0105, 0.008, 0.0012, 0.0014, 0.0004); }   // the lugs
  lgPush(B, lgTR(0.3, 0, 0.026, 0, Math.PI / 2, 0)); lgLathe(B, [[0.0098, 0], [0.011, 0.003], [0.011, 0.016], [0.0098, 0.018]], { segs: 12, a0: -2.2, a1: 2.2 }); lgPop(B);   // the hooded front sight (open at the bottom)
  if (hi) lgBox(B, 0.309, 0, 0.034, 0.0012, 0.0012, 0.006, 0);
  lgPush(B, lgTR(-0.055, 0.008, 0.038, Math.PI / 2, 0, 0)); lgLimb(B, 0.016, [[0, 0.0105], [1, 0.0105]], { segs: 12, rings: 2, up: true, capK: 0.6 }); lgPop(B);   // the rotary drum (across the gun)
  if (top) { lgMat(B, M.visor); lgPush(B, lgTR(-0.055, 0.0095, 0.038, Math.PI / 2, 0, 0)); lgSide(B, [[-0.002, -0.002], [0.002, -0.002], [0.002, 0.002], [-0.002, 0.002]], 0.0005); lgPop(B); }
  lgMat(B, M.gunBlk); lgBox(B, -0.055, 0, 0.026, 0.012, 0.01, 0.004, 0.0015);   // the sight's base
  // the retractable stock: two struts and the butt plate (extended), the sling loop
  lgMat(B, M.metal); for (const s of [1, -1]) lgBore(B, -0.33, 0.22, 0.0055, s * 0.015, -0.002, { segs: 8 });
  lgMat(B, M.gunPoly); lgSide(B, [[-0.36, -0.07], [-0.33, -0.06], [-0.33, 0.028], [-0.36, 0.034], [-0.37, 0.028], [-0.37, -0.064]], 0.04, { bev: 0.005, round: true });
  lgMat(B, M.rubber); lgBox(B, -0.372, 0, -0.017, 0.004, 0.02, 0.05, 0.003);
  if (hi) { lgMat(B, M.metal); lgTube(B, [[-0.105, 0.017, -0.006], [-0.1, 0.024, -0.012], [-0.095, 0.017, -0.006]], 0.0015, { segs: 4 }); }
  lgWeaponLight(B, M, LG_GUN_DEF.mp5a3.light[0], LG_GUN_DEF.mp5a3.light[1], LG_GUN_DEF.mp5a3.light[2], 0.141, -1);
  // the charging handle: on the left, 45 degrees up, in its slot in the cocking tube; it locks back and is slapped home
  lgBone(B, 'ccharge'); lgMat(B, M.gunBlk);
  lgPush(B, lgTR(0.21, 0.0, 0.026, -Math.PI / 4, 0, 0)); lgBox(B, 0, 0.012, 0, 0.008, 0.012, 0.004, 0.0015); lgBox(B, 0, 0.024, 0, 0.012, 0.004, 0.0075, 0.002); lgPop(B);
  // the curved 30-round magazine
  lgBone(B, 'cmag'); lgMat(B, M.gunBlk); lgCurvedMag(B, 0.075, -0.036, 0.19, 0.28, 0.035, 0.025, { ribs: [[0.15, 0.85]], ribF: 0.4 });
  if (hi) lgMagTop(B, M, 0.074, -0.036, 0.03, 0.02);
}
// M249
function lgGunM249(B, K) {
  const M = lgGun2Mats(K), hi = B.lod < 2, top = B.lod === 0;
  lgBone(B, 'carbine');
  // the receiver and the feed tray; the trigger group with the grip; the crossbolt safety
  lgMat(B, M.gunBlk); lgSide(B, [[-0.13, -0.05], [0.3, -0.05], [0.3, 0.044], [-0.1, 0.044], [-0.13, 0.02]], 0.052, { bev: 0.004, round: true });
  lgSide(B, [[-0.02, 0.044], [0.25, 0.044], [0.25, 0.05], [-0.02, 0.05]], 0.056, { bev: 0.001 });   // the tray's lip
  if (hi) { lgMat(B, M.brass); for (let i = 0; i < 4; i++) { lgPush(B, lgTR(0.03 + i * 0.016, -0.028, 0.048, -Math.PI / 2, 0, 0)); lgLimb(B, 0.056, [[0, 0.0048], [0.7, 0.0048], [1, 0.003]], { segs: 6, rings: 2, up: true }); lgPop(B); } }   // the belt in the tray (the rounds lie across the gun)
  M.gunPoly.dk = M.gunPoly.dk || lgMtl({ c: '#141516', t: LT.poly, r: 0.78, w: 0.06, n: 1.0, k: 0.04 });
  lgMat(B, M.gunPoly); B.M.dk = M.gunPoly.dk; lgARGrip(B, -0.02, -0.05, 0.03);
  lgTrigger(B, M, -0.024, 0.044, -0.07, -0.052, { tx: 0.004 });
  if (hi) { lgMat(B, M.metal); lgKnob(B, -0.04, 0.026, -0.03, 0.004, 0.004, 1); lgKnob(B, 0.2, 0.026, 0.0, 0.004, 0.006, 1); }   // the safety, the barrel latch
  // (1.9.997, the detail pass: the STANAG magazine well on the left with its sprung dust cover, the ejection port under the
  // receiver (the M249 throws its cases and links down), the rows of rivets on the stamped receiver)
  lgMat(B, M.gunBlk); lgBox(B, 0.105, 0.04, -0.036, 0.028, 0.014, 0.016, 0.003);
  if (hi) { lgMat(B, M.gunPoly); lgBox(B, 0.105, 0.0545, -0.036, 0.026, 0.0012, 0.014, 0.001); lgMat(B, M.visor); lgBox(B, 0.165, 0, -0.0505, 0.032, 0.013, 0.0008, 0); }
  if (top) { lgMat(B, M.metal); for (const sy of [1, -1]) for (let i = 0; i < 7; i++) lgKnob(B, -0.1 + i * 0.06, sy * 0.0262, 0.034, 0.0022, 0.0012, sy); }
  // the handguard with its heat vents, the gas tube under the barrel, the barrel with its carry handle, the gas block
  // and front sight, the birdcage; the bipod folded under the gas tube
  lgMat(B, M.gunPoly); lgSide(B, [[0.3, -0.038], [0.53, -0.034], [0.53, 0.03], [0.3, 0.034]], 0.05, { bev: 0.006, round: true });
  if (hi) { lgMat(B, M.gunPoly.dk); for (let i = 0; i < 6; i++) for (const s of [1, -1]) lgBox(B, 0.33 + i * 0.032, s * 0.025, 0.0, 0.009, 0.0006, 0.012, 0.002); }
  lgMat(B, M.gunBlk); lgBore(B, 0.53, 0.33, [[0, 0.012], [0.3, 0.0115], [1, 0.011]]); lgBore(B, 0.5, 0.36, 0.009, 0, -0.03);   // the barrel, the gas tube
  // (1.9.997: the heat shield over the barrel's first stretch, open underneath, with its row of vents)
  lgPush(B, lgTR(0.535, 0, 0.0, 0, Math.PI / 2, 0)); lgLathe(B, [[0.0158, 0], [0.0172, 0.004], [0.0172, 0.15], [0.0158, 0.154]], { segs: 14, a0: -1.45, a1: 1.45 }); lgPop(B);
  if (hi) { lgMat(B, M.visor); for (let i = 0; i < 6; i++) lgBox(B, 0.555 + i * 0.023, 0, 0.0173, 0.006, 0.004, 0.0006, 0.001); lgMat(B, M.gunBlk); }
  lgBox(B, 0.6, 0, 0.0, 0.014, 0.012, 0.026, 0.003); if (hi) { lgBox(B, 0.6, 0, 0.032, 0.0014, 0.0014, 0.007, 0); for (const s of [1, -1]) lgBox(B, 0.6, s * 0.007, 0.03, 0.003, 0.0015, 0.008, 0.001); }   // the gas block and sight
  lgBore(B, 0.86, 0.06, [[0, 0.0125], [0.1, 0.013], [0.9, 0.013], [1, 0.012]], 0, 0, { segs: 12, wr: top ? (a, z) => (z > 0.015 && z < 0.05 && Math.sin(a * 5) > 0.55 ? -0.35 : 0) : null });
  lgMat(B, M.gunPoly); lgTube(B, [[0.46, 0, 0.012], [0.46, 0, 0.05], [0.56, 0, 0.05], [0.56, 0, 0.012]], 0.006, { segs: 6 });   // the carry handle, folded flat is a bar: left up
  lgMat(B, M.metal); for (const s of [1, -1]) { lgBore(B, 0.57, 0.3, 0.0045, s * 0.012, -0.044, { segs: 6 }); lgBore(B, 0.86, 0.02, 0.006, s * 0.012, -0.044, { segs: 6 }); }   // the bipod legs, folded forward
  lgBox(B, 0.565, 0, -0.042, 0.012, 0.018, 0.008, 0.002);
  // the fixed stock with its buffer and the shoulder rest
  lgMat(B, M.gunPoly); lgSide(B, [[-0.13, -0.044], [-0.13, 0.03], [-0.3, 0.036], [-0.39, 0.03], [-0.4, 0.02], [-0.4, -0.08], [-0.39, -0.09], [-0.3, -0.06], [-0.2, -0.05]], 0.042, { bev: 0.006, smooth: 0.35, round: true });
  if (hi) { lgMat(B, M.gunPoly.dk); lgSide(B, [[-0.2, -0.03], [-0.34, -0.02], [-0.36, -0.04], [-0.34, -0.06], [-0.24, -0.046]], 0.044, { bev: 0.001 }); }
  lgMat(B, M.rubber); lgBox(B, -0.404, 0, -0.03, 0.005, 0.021, 0.056, 0.004);
  if (hi) { lgMat(B, M.gunBlk); lgBox(B, -0.09, 0, 0.056, 0.006, 0.012, 0.006, 0.002); lgBox(B, -0.09, 0, 0.066, 0.004, 0.009, 0.004, 0.001); }   // the rear peep
  lgWeaponLight(B, M, LG_GUN_DEF.m249.light[0], LG_GUN_DEF.m249.light[1], LG_GUN_DEF.m249.light[2], 0.141, -1);
  // the feed cover (it hinges up at the front: cpump turns about its hinge), with the rail on top
  lgBone(B, 'cpump'); lgMat(B, M.gunBlk); lgSide(B, [[-0.05, 0.05], [0.25, 0.05], [0.26, 0.06], [0.26, 0.08], [0.2, 0.086], [-0.04, 0.086], [-0.05, 0.07]], 0.054, { bev: 0.004, round: true });
  lgRail(B, M, -0.03, 0.22, 0.09, 0.0105, hi, top);
  if (hi) { lgMat(B, M.metal); lgBox(B, -0.052, 0, 0.078, 0.004, 0.012, 0.006, 0.0015); }   // the cover latch
  // the charging handle on the right: non-reciprocating, pulled back and pushed home
  lgBone(B, 'ccharge'); lgMat(B, M.gunBlk); lgBox(B, 0.06, -0.03, 0.01, 0.012, 0.006, 0.006, 0.002); lgMat(B, M.gunPoly); lgBox(B, 0.06, -0.04, 0.01, 0.014, 0.005, 0.009, 0.003);
  // the 200-round pouch under the tray (on the magazine bone: it comes off and the new one hangs on)
  // (1.9.997, the detail pass: a soft bag, not a box: the sides bulge, the bottom is rounded, the flap's seam, the strap
  // and its buckle on the outside)
  lgBone(B, 'cmag'); lgMat(B, M.canvas);
  lgSide(B, [[0.012, -0.06], [0.19, -0.06], [0.2, -0.08], [0.202, -0.15], [0.19, -0.195], [0.15, -0.206], [0.05, -0.206], [0.01, -0.194], [-0.002, -0.15], [0.0, -0.08]], 0.094, { bev: 0.02, smooth: 0.8, round: true });
  lgSide(B, [[0.02, -0.08], [0.18, -0.08], [0.188, -0.15], [0.17, -0.19], [0.03, -0.19], [0.012, -0.15]], 0.104, { bev: 0.018, smooth: 0.9, round: true });   // the bulge
  if (hi) { M.canvas.dk = M.canvas.dk || lgMtl({ c: '#3f4130', t: LT.cord, r: 0.92, w: 0.1, n: 1.0, k: 0.04 }); lgMat(B, M.canvas.dk); lgBox(B, 0.1, 0, -0.072, 0.092, 0.049, 0.002, 0.001); for (const sy of [1, -1]) { lgBox(B, 0.1, sy * 0.052, -0.135, 0.009, 0.0015, 0.065, 0.001); lgMat(B, M.gunPoly); lgBox(B, 0.1, sy * 0.054, -0.12, 0.012, 0.002, 0.009, 0.002); lgMat(B, M.canvas.dk); } }
  lgMat(B, M.gunPoly); lgBox(B, 0.1, 0.0, -0.052, 0.07, 0.03, 0.006, 0.002);   // its plastic mouth clipped to the gun
  if (hi) { lgMat(B, M.link); lgBox(B, 0.1, 0.0, -0.058, 0.02, 0.028, 0.002, 0.0005); }
}
// Mk 14 Mod 0 EBR
function lgGunMk14(B, K) {
  const M = lgGun2Mats(K), hi = B.lod < 2, top = B.lod === 0;
  lgBone(B, 'carbine');
  // the chassis: a tube of rails from the receiver to the front, the receiver inside it, the magazine well
  lgMat(B, M.alu); lgSide(B, [[-0.1, -0.04], [0.12, -0.04], [0.12, 0.02], [-0.1, 0.02]], 0.036, { bev: 0.004, round: true });
  lgMat(B, M.park); lgSide(B, [[-0.09, 0.018], [0.12, 0.018], [0.12, 0.03], [-0.09, 0.03]], 0.03, { bev: 0.003, round: true });   // the receiver's top showing
  lgMat(B, M.alu); lgBore(B, 0.12, 0.3, [[0, 0.025], [1, 0.024]], 0, -0.002, { segs: 8, up: true });   // the octagonal forend tube
  lgRail(B, M, -0.09, 0.4, 0.026, 0.011, hi, top);
  if (hi) { for (const s of [1, -1]) lgRail(B, M, 0.16, 0.36, -0.002, 0.009, hi, false); lgRail(B, M, 0.16, 0.36, -0.03, 0.009, hi, false); }   // side and bottom rails (plain strips)
  lgSide(B, [[0.03, -0.04], [0.1, -0.04], [0.1, -0.058], [0.03, -0.058]], 0.034, { bev: 0.003, round: true });   // the well
  M.alu.dk = M.alu.dk || lgMtl({ c: '#3f4246', t: LT.metal, r: 0.5, m: 0.7, w: 0.04, n: 0.7, k: 0.08 });
  lgMat(B, M.gunPoly); B.M.dk = M.gunPoly.dk || M.gunPoly; lgARGrip(B, -0.02, -0.046, 0.029);
  lgTrigger(B, M, -0.024, 0.04, -0.066, -0.048, { tx: 0.006 });
  if (hi) { lgMat(B, M.park); lgBox(B, 0.0, 0, -0.052, 0.004, 0.003, 0.008, 0.001); }   // the safety in the guard
  // the barrel, the gas cylinder under it, the front sight and the four-tine flash hider
  lgMat(B, M.park); lgBore(B, 0.42, 0.157, [[0, 0.0098], [1, 0.0092]]); lgBore(B, 0.3, 0.14, 0.0105, 0, -0.03); lgBox(B, 0.44, 0, -0.016, 0.012, 0.011, 0.016, 0.003);
  if (hi) { lgBox(B, 0.5, 0, 0.012, 0.008, 0.006, 0.01, 0.002); lgBox(B, 0.5, 0, 0.024, 0.0014, 0.0014, 0.006, 0); }   // the front sight
  lgBore(B, 0.577, 0.025, 0.0115); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + TAU / 8; lgPush(B, lgTR(0.6, Math.cos(a) * 0.009, Math.sin(a) * 0.009, 0, Math.PI / 2 + 0.03, 0)); lgLimb(B, 0.05, [[0, 0.0035], [1, 0.0025]], { segs: 6, rings: 2, up: true }); lgPop(B); }   // the tines, flared
  // the scope on the rail: the tube, the objective bell, the eyepiece, the turrets, the rings
  lgMat(B, M.gunBlk); lgBore(B, -0.07, 0.24, [[0, 0.019], [0.12, 0.019], [0.2, 0.015], [0.65, 0.015], [0.78, 0.022], [1, 0.022]], 0, 0.058, { segs: 14 });
  lgMat(B, M.lens); lgBore(B, 0.1695, 0.001, 0.02, 0, 0.058, { segs: 14 }); lgBore(B, -0.0705, 0.001, 0.017, 0, 0.058, { segs: 14 });
  lgMat(B, M.gunBlk); lgBox(B, 0.04, 0, 0.078, 0.009, 0.009, 0.006, 0.002); lgBox(B, 0.04, 0.018, 0.058, 0.009, 0.006, 0.009, 0.002);   // the turrets
  for (const x of [-0.02, 0.1]) lgBox(B, x, 0, 0.044, 0.012, 0.0165, 0.012, 0.003);   // the rings
  // the collapsible stock on its tube, the cheek riser, the butt
  lgMat(B, M.alu); lgBore(B, -0.1, 0.16, 0.014, 0, 0.0, { up: false });
  lgMat(B, M.gunPoly); lgSide(B, [[-0.2, -0.016], [-0.2, 0.02], [-0.3, 0.026], [-0.35, 0.03], [-0.36, 0.024], [-0.36, -0.085], [-0.35, -0.094], [-0.32, -0.08], [-0.27, -0.05], [-0.22, -0.026]], 0.032, { bev: 0.006, smooth: 0.35, round: true });
  lgSide(B, [[-0.24, 0.026], [-0.34, 0.03], [-0.345, 0.044], [-0.245, 0.042]], 0.03, { bev: 0.003, round: true });   // the cheek riser
  lgMat(B, M.rubber); lgSide(B, [[-0.36, 0.024], [-0.366, 0.02], [-0.368, -0.08], [-0.364, -0.094], [-0.36, -0.085]], 0.034, { bev: 0.003, round: true });
  lgWeaponLight(B, M, LG_GUN_DEF.mk14.light[0], LG_GUN_DEF.mk14.light[1], LG_GUN_DEF.mk14.light[2], 0.141, -1);
  // the op-rod handle on the right: it reciprocates with every shot
  lgBone(B, 'cbolt'); lgMat(B, M.park); lgBox(B, 0.09, -0.022, 0.006, 0.014, 0.006, 0.005, 0.002); lgBox(B, 0.096, -0.03, 0.006, 0.006, 0.004, 0.01, 0.002);
  // the 20-round magazine, nearly straight, deep for 7.62
  lgBone(B, 'cmag'); lgMat(B, M.park); lgCurvedMag(B, 0.063, -0.058, 0.17, 0.08, 0.07, 0.024, { ribs: [[0.2, 0.8]], ribF: 0.36 });
  if (hi) lgMagTop(B, M, 0.06, -0.058, 0.06, 0.024);
}
// Mossberg 590A1
function lgGunM590(B, K) {
  const M = lgGun2Mats(K), hi = B.lod < 2, top = B.lod === 0;
  lgBone(B, 'carbine');
  // the aluminium receiver with the port on the right, the tang safety on top, the loading gate underneath
  lgMat(B, M.alu); lgSide(B, [[-0.1, -0.034], [0.09, -0.034], [0.095, -0.004], [0.09, 0.022], [-0.09, 0.024], [-0.1, 0.012]], 0.036, { bev: 0.004, round: true });
  if (hi) { lgMat(B, M.visor); lgBox(B, 0.02, -0.0182, 0.0, 0.03, 0.0008, 0.011, 0.002); lgBox(B, -0.0, 0, -0.034, 0.035, 0.011, 0.0008, 0.002); lgMat(B, M.gunBlk); lgBox(B, -0.102, 0, 0.026, 0.009, 0.004, 0.0035, 0.001); if (top) for (let i = 0; i < 3; i++) lgBox(B, -0.106 + i * 0.004, 0, 0.0295, 0.0008, 0.0035, 0.0006, 0); }
  // the grip (a pistol-grip stock), the trigger group, the stock and its pad
  M.gunPoly.dk = M.gunPoly.dk || lgMtl({ c: '#141516', t: LT.poly, r: 0.78, w: 0.06, n: 1.0, k: 0.04 });
  lgMat(B, M.gunPoly); B.M.dk = M.gunPoly.dk; lgARGrip(B, -0.02, -0.034, 0.029);
  lgMat(B, M.alu); lgTrigger(B, M, -0.024, 0.044, -0.056, -0.036, { gm: M.alu, tx: 0.008 });
  lgMat(B, M.gunPoly); lgSide(B, [[-0.1, -0.03], [-0.1, 0.02], [-0.24, 0.026], [-0.38, 0.03], [-0.39, 0.02], [-0.39, -0.1], [-0.38, -0.108], [-0.34, -0.09], [-0.24, -0.05], [-0.15, -0.04]], 0.038, { bev: 0.006, smooth: 0.35, round: true });
  lgMat(B, M.rubber); lgBox(B, -0.394, 0, -0.04, 0.005, 0.0195, 0.064, 0.004);
  // the barrel, the heat shield over it, the magazine tube to the muzzle with its cap, the bayonet lug, the sights
  lgMat(B, M.park); lgBore(B, 0.09, 0.51, [[0, 0.0125], [0.1, 0.012], [1, 0.0118]], 0, 0.004); lgBore(B, 0.09, 0.47, 0.0125, 0, -0.024); lgBore(B, 0.555, 0.015, 0.0135, 0, -0.024);
  lgMat(B, M.gunBlk); lgSide(B, [[0.1, 0.004], [0.5, 0.004], [0.5, 0.02], [0.1, 0.02]], 0.034, { bev: 0.003, round: true });   // the heat shield's body
  if (top) { lgMat(B, M.visor); for (let i = 0; i < 14; i++) for (const s of [1, -1]) lgBox(B, 0.115 + i * 0.027, s * 0.0172, 0.012, 0.005, 0.0005, 0.004, 0.001); for (let i = 0; i < 14; i++) lgBox(B, 0.115 + i * 0.027, 0, 0.0205, 0.005, 0.004, 0.0005, 0.001); }   // its holes
  lgMat(B, M.park); lgBox(B, 0.54, 0, -0.004, 0.012, 0.009, 0.012, 0.002); lgBox(B, 0.56, 0, -0.048, 0.008, 0.005, 0.01, 0.002);   // the barrel band, the bayonet lug
  lgBox(B, 0.585, 0, 0.02, 0.005, 0.005, 0.01, 0.002); if (hi) { lgMat(B, M.glow); lgSphere(B, 0.585, 0, 0.032, 0.0015, 0.0015, 0.0015, { segs: 5, rings: 3 }); }   // the front post
  lgMat(B, M.gunBlk); lgBox(B, -0.06, 0, 0.034, 0.008, 0.012, 0.012, 0.003); if (hi) { lgPush(B, lgTR(-0.06, 0, 0.052, 0, Math.PI / 2, 0)); lgLathe(B, [[0.006, -0.002], [0.009, 0], [0.009, 0.003], [0.006, 0.005]], { segs: 10 }); lgPop(B); for (const s of [1, -1]) lgBox(B, -0.06, s * 0.013, 0.05, 0.007, 0.0018, 0.012, 0.001); }   // the ghost ring
  lgWeaponLight(B, M, LG_GUN_DEF.m590a1.light[0], LG_GUN_DEF.m590a1.light[1], LG_GUN_DEF.m590a1.light[2], 0.141, -1);
  // the forend on the magazine tube and its twin action bars: the pump (cpump runs it back and forward)
  lgBone(B, 'cpump'); lgMat(B, M.gunPoly); lgSide(B, [[0.2, -0.046], [0.39, -0.046], [0.395, -0.03], [0.395, -0.006], [0.39, 0.0], [0.2, 0.0], [0.195, -0.012], [0.195, -0.036]], 0.044, { bev: 0.006, round: true });
  if (top) { lgMat(B, M.gunPoly.dk); for (let i = 0; i < 8; i++) for (const s of [1, -1]) lgBox(B, 0.215 + i * 0.022, s * 0.0222, -0.024, 0.0025, 0.0005, 0.012, 0.0005); }
  lgMat(B, M.park); for (const s of [1, -1]) lgBox(B, 0.13, s * 0.0135, -0.012, 0.07, 0.0015, 0.004, 0.0006);   // the action bars reaching into the receiver
  // the shell that rides the hand to the gate (on the magazine bone)
  lgBone(B, 'cmag'); lgMat(B, M.shellRed); lgBore(B, 0.03, 0.05, 0.0105, 0, -0.06); lgMat(B, M.brass); lgBore(B, 0.02, 0.012, 0.0112, 0, -0.06);
}
// Steyr AUG A3
function lgGunAUG(B, K) {
  const M = lgGun2Mats(K), hi = B.lod < 2, top = B.lod === 0;
  lgBone(B, 'carbine');
  M.augGrn.dk = M.augGrn.dk || lgMtl({ c: '#36432d', t: LT.poly, r: 0.7, w: 0.08, n: 0.9, k: 0.05 });
  // the one-piece polymer body: the stock with the magazine well behind the grip, the receiver housing over the grip,
  // the butt; the grip and its guard are part of it
  // (1.9.997, the detail pass: the shell's real line: the butt raked back at the toe, the underside curving up from the
  // magazine well to the toe, the cheek rising to the receiver; a crowned middle band so the section is round, not a slab;
  // the moulded seam along its top, the sling swivel at the butt, the magazine release behind the well)
  lgMat(B, M.augGrn); lgSide(B, [[-0.296, -0.05], [-0.27, -0.06], [-0.22, -0.062], [-0.17, -0.06], [-0.07, -0.056], [0.0, -0.05], [0.06, -0.046], [0.12, -0.04], [0.148, -0.03], [0.152, 0.0], [0.15, 0.03], [0.1, 0.034], [0.02, 0.036], [-0.1, 0.04], [-0.2, 0.043], [-0.262, 0.042], [-0.284, 0.036]], 0.046, { bev: 0.009, smooth: 0.6, round: true });
  lgSide(B, [[-0.27, -0.048], [-0.17, -0.05], [-0.06, -0.046], [0.1, -0.034], [0.13, 0.0], [0.1, 0.028], [-0.1, 0.034], [-0.26, 0.034]], 0.052, { bev: 0.012, smooth: 0.7, round: true });   // the crown
  lgSide(B, [[-0.17, -0.056], [-0.07, -0.056], [-0.075, -0.07], [-0.165, -0.07]], 0.036, { bev: 0.004, round: true });   // the well's mouth
  lgMat(B, M.rubber); lgPush(B, lgTR(-0.297, 0, -0.006, 0, -0.1, 0)); lgBox(B, 0, 0, 0, 0.005, 0.0235, 0.047, 0.004); lgPop(B);   // the butt plate, raked
  if (hi) { lgMat(B, M.augGrn.dk); lgBox(B, -0.1, 0, 0.0405, 0.15, 0.0005, 0.0006, 0); lgMat(B, M.metal); lgPin(B, -0.27, -0.054, 0.002, 0.05); lgTube(B, [[-0.276, 0.0, -0.058], [-0.282, 0.0, -0.07], [-0.262, 0.0, -0.07], [-0.266, 0.0, -0.058]], 0.0016, { segs: 4 }); lgMat(B, M.gunPoly); lgBox(B, -0.178, 0, -0.064, 0.005, 0.012, 0.004, 0.0015); }
  if (hi) { lgMat(B, M.augGrn.dk); lgBox(B, -0.12, -0.0232, 0.006, 0.02, 0.0006, 0.009, 0.002); lgBox(B, -0.12, 0.0232, 0.006, 0.02, 0.0006, 0.009, 0.002); lgBox(B, -0.19, 0.0235, -0.03, 0.01, 0.0015, 0.006, 0.001); }   // the ejection ports (one covered), the bolt release
  lgMat(B, M.augGrn); B.M.dk = M.augGrn.dk; lgARGrip(B, -0.016, -0.05, 0.03);
  lgMat(B, M.augGrn); lgTube(B, [[-0.03, 0, -0.05], [-0.02, 0, -0.1], [0.06, 0, -0.104], [0.1, 0, -0.075], [0.11, 0, -0.04]], 0.0035, { segs: 6, flat: 2.2, up: [0, 1, 0] });   // the big guard that takes a gloved hand
  lgMat(B, M.metal); lgTube(B, [[0.0, 0, -0.05], [0.004, 0, -0.06], [0.003, 0, -0.07], [-0.002, 0, -0.075]], 0.0018, { segs: 4, flat: 2, up: [0, 1, 0] });
  if (hi) { lgMat(B, M.visor); lgKnob(B, -0.02, 0.0235, -0.02, 0.004, 0.003, 1); lgMat(B, M.glow); lgSphere(B, -0.02, 0.027, -0.02, 0.0015, 0.0015, 0.0015, { segs: 5, rings: 3 }); }   // the crossbolt safety, red for fire
  // the receiver's top with the rail and an optic; the charging slot on the left
  lgMat(B, M.alu); lgSide(B, [[-0.06, 0.036], [0.15, 0.03], [0.15, 0.052], [-0.06, 0.054]], 0.03, { bev: 0.003, round: true });
  lgRail(B, M, -0.05, 0.14, 0.056, 0.0105, hi, top);
  if (hi) lgHolo(B, M, 0.05, 0.06, hi); else { lgMat(B, M.gunBlk); lgBox(B, 0.05, 0, 0.075, 0.034, 0.016, 0.016, 0.004); }
  if (hi) { lgMat(B, M.visor); lgBox(B, 0.07, 0.0152, 0.044, 0.05, 0.0006, 0.003, 0.0005); }   // the slot
  // the barrel group: the barrel out of the body, the gas block, the folding foregrip folded forward as a handguard,
  // the three-prong flash hider
  lgMat(B, M.gunBlk); lgBore(B, 0.15, 0.27, [[0, 0.0135], [0.2, 0.012], [1, 0.0095]]);
  lgBox(B, 0.19, 0, 0.012, 0.012, 0.012, 0.014, 0.003); if (hi) { lgKnob(B, 0.19, 0.0, 0.03, 0.005, 0.004, 1); }   // the gas block and regulator
  lgMat(B, M.augGrn); lgSide(B, [[0.08, -0.034], [0.19, -0.036], [0.195, -0.026], [0.195, -0.008], [0.19, -0.004], [0.08, -0.004], [0.075, -0.016], [0.075, -0.026]], 0.034, { bev: 0.005, round: true });
  if (hi) { lgMat(B, M.metal); lgPin(B, 0.082, -0.01, 0.003, 0.036); }   // the foregrip's hinge
  lgMat(B, M.gunBlk); lgBore(B, 0.42, 0.012, 0.012); for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + TAU / 4; lgPush(B, lgTR(0.43, Math.cos(a) * 0.0085, Math.sin(a) * 0.0085, 0, Math.PI / 2, 0)); lgLimb(B, 0.04, [[0, 0.003], [1, 0.0022]], { segs: 6, rings: 2, up: true }); lgPop(B); }
  lgWeaponLight(B, M, LG_GUN_DEF.aug.light[0], LG_GUN_DEF.aug.light[1], LG_GUN_DEF.aug.light[2], 0.141, -1);
  // the charging handle in its slot on the left: non-reciprocating; it is pulled and let go
  lgBone(B, 'ccharge'); lgMat(B, M.gunPoly); lgBox(B, 0.1, 0.02, 0.044, 0.01, 0.005, 0.004, 0.0015); lgBox(B, 0.1, 0.03, 0.044, 0.014, 0.005, 0.009, 0.003);
  // the translucent 30-round magazine behind the grip, the rounds showing through it
  lgBone(B, 'cmag'); lgMat(B, M.augMag); lgCurvedMag(B, -0.12, -0.064, 0.184, 0.12, 0.058, 0.023, { ribs: [[0.1, 0.3], [0.4, 0.6], [0.7, 0.9]], ribF: 0.4, plate: true });
  if (hi) { lgMat(B, M.brass); for (let i = 0; i < 5; i++) { const k = 0.15 + i * 0.16; lgBox(B, -0.12 + 0.12 * k * k * 0.184 - 0.01, 0, -0.064 - k * 0.184, 0.02, 0.0124, 0.0025, 0.001); } lgMagTop(B, M, -0.122, -0.064, 0.05, 0.022); }
}
/* ---------- the sidearms (pistol bone; the origin at the back of the slide on the bore line) ---------- */
function lgGunG17(B, K) { const M = lgGun2Mats(K); return lgPistolFrame(B, M, { L: 0.186, slideM: M.ndlc, frameM: M.gunPoly, front: true, rake: 0.38, h: 0.0175, w: 0.0255, gw: 0.03, gd: 0.05, gl: 0.1, nor: true, round: false, texM: M.gunPoly.dk || M.gunPoly, bt: 0.014, trigM: M.gunPoly, ctlM: M.gunBlk, flare: true }); }
function lgGunFiveSeven(B, K) { const M = lgGun2Mats(K); return lgPistolFrame(B, M, { L: 0.19, slideM: M.polyLt, frameM: M.gunPoly, h: 0.019, w: 0.028, gw: 0.03, gd: 0.05, gl: 0.1, nor: true, round: true, texM: M.gunPoly.dk || M.gunPoly, bt: 0.012, trigM: M.gunPoly, safety: true, ctlM: M.gunBlk, bigGuard: true }); }
// the Desert Eagle: the slide (shorter than the barrel) on the slide bone, the barrel block with its rail on the frame
function lgGunDeagle(B, K) {
  const M = lgGun2Mats(K), hi = B.lod < 2, top = B.lod === 0;
  const r = lgPistolFrame(B, M, { L: 0.15, slideM: M.chrome, frameM: M.chrome, h: 0.03, w: 0.0318, gw: 0.034, gd: 0.054, gl: 0.108, nor: true, round: true, panels: M.rubber, bt: 0.016, hammer: true, magM: M.chrome, plateM: M.chrome, ext: 0.004, serM: M.steel, ctlM: M.steel, nose: 0.002 });
  // the barrel block: a flat-topped triangular section from the slide's front to the muzzle, the rail on it, the gas
  // piston tube underneath, the front sight; the safety levers at the back of the slide
  lgBone(B, 'pistol'); lgMat(B, M.chrome);
  lgSide(B, [[0.15, -0.024], [0.272, -0.02], [0.274, -0.008], [0.274, 0.022], [0.268, 0.03], [0.15, 0.03]], 0.035, { bev: 0.004, round: true });
  lgSide(B, [[0.1, 0.03], [0.26, 0.03], [0.26, 0.036], [0.1, 0.036]], 0.022, { bev: 0.0015 });
  if (top) { lgMat(B, M.steel); for (let i = 0; i < 7; i++) lgBox(B, 0.11 + i * 0.02, 0, 0.0372, 0.003, 0.011, 0.001, 0); }   // the rail's slots
  lgMat(B, M.steel); lgBore(B, 0.274, 0.003, 0.0064); if (hi) { lgMat(B, M.gunBlk); lgBore(B, 0.2745, 0.0025, 0.0048); }
  lgMat(B, M.chrome); lgBore(B, 0.14, 0.11, 0.0065, 0, -0.03, { segs: 8 });                                  // the gas piston tube
  lgBox(B, 0.26, 0, 0.038, 0.004, 0.0022, 0.004, 0.001);
  if (hi) { lgMat(B, M.steel); for (const s of [1, -1]) { lgBox(B, 0.012, s * 0.018, 0.014, 0.008, 0.002, 0.005, 0.0015); lgBox(B, 0.006, s * 0.02, 0.018, 0.003, 0.0016, 0.006, 0.001); } }   // the safety levers
  return r;
}
// a Smith & Wesson double-action revolver (the Model 29): the frame, the cylinder on its bone, the hammer on its bone
function lgGunM29(B, K) {
  const M = lgGun2Mats(K), hi = B.lod < 2, top = B.lod === 0;
  // the target hammer: a wide spur, checkered
  lgBone(B, 'hammer'); lgMat(B, M.blued); lgSide(B, [[-0.006, 0.004], [0.004, 0.008], [0.003, 0.022], [-0.006, 0.032], [-0.022, 0.034], [-0.026, 0.028], [-0.014, 0.018]], 0.009, { bev: 0.0012, round: true });
  if (top) for (let i = 0; i < 5; i++) lgBox(B, -0.018 + i * 0.003, 0, 0.0335, 0.0006, 0.0044, 0.0008, 0);
  lgBone(B, 'pistol'); lgMat(B, M.blued);
  // the N-frame: the window round the cylinder, the top strap with the adjustable rear sight, the standing breech, the
  // thumb latch on the left, the barrel with its top rib and the full-length ejector shroud, the red ramp
  lgSide(B, [[-0.012, -0.004], [0.004, -0.028], [0.054, -0.028], [0.06, -0.018], [0.06, 0.022], [0.054, 0.028], [0.0, 0.026], [-0.012, 0.018]], 0.013, { bev: 0.002, round: true });
  lgSide(B, [[-0.004, 0.018], [0.06, 0.02], [0.06, 0.028], [0.0, 0.028], [-0.01, 0.024]], 0.024, { bev: 0.003, round: true });
  lgSide(B, [[-0.002, -0.028], [0.056, -0.028], [0.056, -0.021], [-0.002, -0.023]], 0.024, { bev: 0.003, round: true });
  lgSide(B, [[-0.012, -0.026], [0.002, -0.026], [0.002, 0.026], [-0.012, 0.02]], 0.046, { bev: 0.004, round: true });
  if (hi) { lgBox(B, -0.006, 0, 0.032, 0.008, 0.006, 0.004, 0.001); lgMat(B, M.visor); lgBox(B, -0.0135, 0, 0.034, 0.0006, 0.0016, 0.0024, 0); lgMat(B, M.blued); lgBox(B, 0.004, 0.012, 0.004, 0.008, 0.0016, 0.004, 0.0012); }   // the rear sight and its notch, the latch
  lgBore(B, 0.056, 0.165, [[0, 0.0105], [0.1, 0.0098], [1, 0.0095]], 0, 0.004);
  lgSide(B, [[0.058, 0.012], [0.218, 0.012], [0.218, 0.019], [0.058, 0.019]], 0.007, { bev: 0.0015, round: true });              // the rib
  lgSide(B, [[0.058, -0.021], [0.204, -0.021], [0.21, -0.012], [0.21, -0.002], [0.058, -0.004]], 0.013, { bev: 0.003, round: true });   // the shroud
  lgMat(B, M.steel); lgBore(B, 0.06, 0.146, 0.0038, 0, -0.012); if (hi) lgBore(B, 0.204, 0.006, 0.0048, 0, -0.012);
  lgMat(B, M.glow); lgPush(B, lgTR(0.208, 0, 0.019, 0, 0, 0)); lgSide(B, [[-0.009, 0], [0.005, 0], [0.004, 0.009], [-0.004, 0.01]], 0.0035, { bev: 0.0006 }); lgPop(B);   // the red ramp
  // the trigger guard, the wide target trigger, the target grips over the square butt
  lgMat(B, M.blued); lgTube(B, [[0.044, 0, -0.026], [0.056, 0, -0.036], [0.06, 0, -0.05], [0.046, 0, -0.058], [0.026, 0, -0.054], [0.014, 0, -0.04], [0.009, 0, -0.03]], 0.003, { segs: 6, flat: 2.2, up: [0, 1, 0] });   // (1.9.997: closed onto the frame at both ends)
  lgMat(B, M.steel); lgTube(B, [[0.036, 0, -0.028], [0.043, 0, -0.037], [0.041, 0, -0.046], [0.034, 0, -0.05]], 0.0028, { segs: 5, flat: 2.0, up: [0, 1, 0] });
  lgMat(B, M.blued); lgSide(B, [[0.014, -0.028], [0.0, -0.064], [-0.008, -0.1], [-0.018, -0.118], [-0.048, -0.116], [-0.054, -0.09], [-0.042, -0.036], [-0.022, -0.006], [-0.012, -0.004]], 0.02, { bev: 0.003, round: true });
  lgMat(B, M.wood); lgSide(B, [[0.012, -0.034], [-0.002, -0.066], [-0.01, -0.1], [-0.02, -0.112], [-0.046, -0.11], [-0.05, -0.088], [-0.038, -0.038], [-0.028, -0.02], [-0.018, -0.012]], 0.036, { bev: 0.007, smooth: 0.7, round: true });
  if (top) { lgMat(B, M.wood); for (const s of [1, -1]) lgSide(B, [[0.004, -0.05], [-0.006, -0.1], [-0.04, -0.1], [-0.034, -0.05]], 0.0375, { bev: 0.001 }); lgMat(B, M.steel); lgBox(B, -0.02, 0, -0.07, 0.0028, 0.019, 0.0028, 0.0012); }   // the checkered panels (a hair proud), the grip screw
  // the cylinder: six .44 chambers, fluted, 43 mm long and 43 mm across; its notches; the chamber mouths
  lgBone(B, 'cyl'); lgMat(B, M.blued); lgBore(B, 0.006, 0.045, [[0, 0.0205], [0.06, 0.0217], [0.94, 0.0217], [1, 0.0205]], 0, -0.001, { segs: 18, wr: hi ? (a, z) => (Math.cos(a * 6) > 0.72 && z > 0.006 && z < 0.038 ? -0.13 : 0) : null });
  if (hi) { lgMat(B, M.gunBlk); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + TAU / 12; lgBore(B, 0.0505, 0.0016, 0.0056, Math.cos(a) * 0.0145, -0.001 + Math.sin(a) * 0.0145, { segs: 8 }); } }
  if (top) { lgMat(B, M.gunBlk); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; lgBox(B, 0.028, Math.cos(a) * 0.022, -0.001 + Math.sin(a) * 0.022, 0.004, 0.0012, 0.0012, 0.0004); } }
  lgMat(B, M.steel); lgBore(B, 0.0, 0.006, 0.0075, 0, -0.001, { segs: 10 });   // the ratchet at the back
  // the speedloader with its six rounds (on the magazine bone: it comes to the cylinder and goes away)
  lgBone(B, 'mag'); lgMat(B, M.brass); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + TAU / 12; lgBore(B, 0.008, 0.04, 0.0054, Math.cos(a) * 0.0145, -0.001 + Math.sin(a) * 0.0145, { segs: 6 }); }
  // (the loader's body and its knob ride the slide bone, which follows the rounds until they are in and then goes away)
  lgBone(B, 'slide'); lgMat(B, M.gunPoly); lgBore(B, -0.018, 0.024, [[0, 0.02], [0.8, 0.02], [1, 0.018]], 0, -0.001, { segs: 12 }); lgMat(B, M.metal); lgBore(B, -0.028, 0.01, 0.007, 0, -0.001, { segs: 8 });
  return { magTop: [0.006, -0.001] };
}
// the sawed-off coach gun: the action on the pistol bone, the barrels (and their forend) on the cyl bone so they tip
// down on the hinge; the hulls on the magazine bone
function lgGunCoach(B, K) {
  const M = lgGun2Mats(K), hi = B.lod < 2, top = B.lod === 0;
  lgBone(B, 'pistol');
  // the action body: the standing breech, the top lever, the two triggers in their guard, the bird's-head grip in walnut
  lgMat(B, M.park); lgSide(B, [[-0.01, -0.026], [0.096, -0.03], [0.1, -0.012], [0.1, 0.02], [0.09, 0.026], [0.0, 0.028], [-0.012, 0.016]], 0.05, { bev: 0.005, round: true });
  if (hi) { lgMat(B, M.steel); lgBox(B, 0.02, 0, 0.03, 0.03, 0.004, 0.003, 0.001); lgBox(B, -0.006, 0.006, 0.032, 0.012, 0.0025, 0.0025, 0.001); } if (hi) { lgMat(B, M.steel); lgPin(B, 0.094, -0.014, 0.0045, 0.0516); lgMat(B, M.park); for (const sy of [1, -1]) lgSphere(B, 0.097, sy * 0.017, 0.017, 0.007, 0.009, 0.009, { segs: 10, rings: 6 }); if (top) { lgMat(B, M.gunBlk); for (const sy of [1, -1]) { const y = sy * 0.0252; lgBox(B, 0.045, y, 0.019, 0.04, 0.0004, 0.0005, 0); lgBox(B, 0.045, y, -0.021, 0.04, 0.0004, 0.0005, 0); lgBox(B, 0.006, y, -0.001, 0.0005, 0.0004, 0.02, 0); lgBox(B, 0.084, y, -0.001, 0.0005, 0.0004, 0.02, 0); } } }   // (1.9.997: the hinge pin where the barrels really pivot, the fences at the breech, the boxlock's inset border)   // the tang, the lever, the hinge pin's mark
  lgMat(B, M.park); lgTube(B, [[0.036, 0, -0.03], [0.05, 0, -0.04], [0.09, 0, -0.056], [0.11, 0, -0.05], [0.112, 0, -0.034]], 0.003, { segs: 6, flat: 2.4, up: [0, 1, 0] });
  lgMat(B, M.steel); for (const x of [0.056, 0.074]) lgTube(B, [[x, 0, -0.03], [x + 0.004, 0, -0.038], [x + 0.003, 0, -0.046], [x - 0.002, 0, -0.05]], 0.002, { segs: 4, flat: 2, up: [0, 1, 0] });
  lgMat(B, M.walnut); lgSide(B, [[0.034, -0.028], [0.02, -0.06], [0.004, -0.094], [-0.014, -0.11], [-0.046, -0.108], [-0.056, -0.09], [-0.046, -0.06], [-0.03, -0.034], [-0.014, -0.026]], 0.036, { bev: 0.008, smooth: 0.7, round: true });
  if (top) { lgMat(B, M.walnut); lgSide(B, [[0.016, -0.05], [0.004, -0.09], [-0.036, -0.09], [-0.034, -0.05]], 0.0375, { bev: 0.001 }); }
  // the barrels, side by side, cut short; the rib between them; the forend under them; the extractors at the breech
  lgBone(B, 'cyl'); lgMat(B, M.blued);
  for (const s of [1, -1]) lgBore(B, 0.1, 0.3, [[0, 0.0125], [0.06, 0.0118], [1, 0.0112]], s * 0.012, 0.004);
  lgSide(B, [[0.1, 0.008], [0.4, 0.008], [0.4, 0.0135], [0.1, 0.0135]], 0.008, { bev: 0.0015, round: true });
  if (hi) { lgMat(B, M.gunBlk); for (const s of [1, -1]) lgBore(B, 0.4, 0.001, 0.0085, s * 0.012, 0.004); }   // the two muzzles
  lgMat(B, M.walnut); lgSide(B, [[0.1, -0.008], [0.21, -0.006], [0.215, -0.02], [0.21, -0.032], [0.12, -0.034], [0.1, -0.024]], 0.034, { bev: 0.006, smooth: 0.6, round: true });
  if (hi) { lgMat(B, M.steel); lgBox(B, 0.102, 0, 0.004, 0.003, 0.025, 0.014, 0.001); }   // the breech face with the extractor
  // the two hulls (the magazine bone: the extractor lifts them, the hand pulls them, two fresh go in)
  lgBone(B, 'mag'); lgMat(B, M.shellRed); for (const s of [1, -1]) lgBore(B, 0.104, 0.05, 0.0098, s * 0.012, 0.004); lgMat(B, M.brass); for (const s of [1, -1]) lgBore(B, 0.1, 0.012, 0.0105, s * 0.012, 0.004);
  return { magTop: [0.1, 0.004] };
}
// each gun's definition (leggun.js has the first ten and what the fields mean)
Object.assign(LG_GUN_DEF, {
  mp5a3: { mk: lgGunMP5, fam: 'c', muz: [0.336, 0, 0], light: [0.25, -0.034, -0.004], sup: 0.205, mag: [0.075, -0.036], gx: -0.012, gz: -0.036,
    act: { lock: true, charge: 0.07, cyc: 0.075, imp: 3.3, rise: 0.8, rec: 0.12 } },
  m249: { mk: lgGunM249, fam: 'c', muz: [0.92, 0, 0], light: [0.52, -0.048, -0.016], sup: 0.4, mag: [0.1, -0.052], gx: -0.02, gz: -0.05,
    act: { charge: 0.1, cyc: 0.075, imp: 7.2, rise: 1, rec: 0.12, cover: [0.25, 0.08, 1.4] } },
  mk14: { mk: lgGunMk14, fam: 'c', muz: [0.65, 0, 0], light: [0.4, -0.036, -0.004], sup: 0.27, mag: [0.063, -0.058], gx: -0.02, gz: -0.046,
    act: { lock: true, bolt: 0.1, cyc: 0.1, imp: 12.5, rise: 4.2, rec: 0.28 } },
  m590a1: { mk: lgGunM590, fam: 'c', muz: [0.6, 0, 0.004], light: [0.5, -0.03, -0.034], sup: 0.33, mag: [0.03, -0.052], gx: -0.02, gz: -0.034,
    act: { pump: 0.09, manual: 'pump', cyc: 0, imp: 15, rise: 9, rec: 0.4 } },
  aug: { mk: lgGunAUG, fam: 'c', muz: [0.47, 0, 0], light: [0.3, -0.03, -0.02], sup: 0.2, mag: [-0.12, -0.064], gx: -0.016, gz: -0.05,
    act: { lock: true, charge: 0.06, cyc: 0.085, imp: 7.0, rise: 1.8, rec: 0.14 } },
  g17: { mk: lgGunG17, fam: 'p', muz: [0.188, 0, 0], mag: [0.027, -0.03], act: { lock: true, slide: 0.03, cyc: 0.05, imp: 3.7, rise: 7.5, rec: 0.2 } },
  deagle: { mk: lgGunDeagle, fam: 'p', muz: [0.275, 0, 0], mag: [0.027, -0.03], act: { lock: true, slide: 0.045, cyc: 0.075, hammer: true, hp: [0, 0.006], hrot: 0.6, hrest: 1, imp: 12.2, rise: 15, rec: 0.45 } },
  m29: { mk: lgGunM29, fam: 'p', muz: [0.222, 0, 0.004], mag: [0.006, -0.001], speed: true,
    act: { cyl: true, cc: [0, -0.001], crane: [0.013, -0.02], crot: 1.5, chambers: 6, hammer: true, hp: [-0.002, 0.006], hrot: 0.8, hrest: 0, da: 0.17, loader: true, imp: 9.8, rise: 24, rec: 0.7 } },
  fiveseven: { mk: lgGunFiveSeven, fam: 'p', muz: [0.192, 0, 0], mag: [0.027, -0.03], act: { lock: true, slide: 0.03, cyc: 0.045, imp: 1.8, rise: 4.5, rec: 0.15 } },
  coach: { mk: lgGunCoach, fam: 'p', muz: [0.4, 0, 0.004], mag: [0.1, 0.004], supP: [0.17, -0.044], brk: true, pull: 0.12,
    act: { hinge: [0.1, -0.012, 0.6], cyc: 0, imp: 16, rise: 14, rec: 0.5 } }
});
