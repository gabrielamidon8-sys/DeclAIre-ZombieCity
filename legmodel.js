/* ================= LEGEND models: the Operator, his kit, his mask, and the actors of the dead =================
   Everything here is built from LEGEND's shapes, bone by bone, in metres (x forward, y left, z up).
   The Operator, from the boots up:
   - Tactical boots: a lugged rubber sole and heel, a coyote leather upper with a rubber rand round the toe, a shaft
     with laces and speed hooks, the trousers bloused over the top.
   - Storm-camo combat trousers with cargo pockets, knee pads (a rubber cap on a padded base, two straps), and a
     battle belt in night camo: a rigger's belt with a cobra-style buckle, the holster (a polymer shell round the
     pistol, a hood for retention, a quick-release plate), two pistol magazine pouches, a dump pouch, a tourniquet.
   - A combat shirt: knit torso, camo sleeves with built-in elbow pads, a shoulder pocket with a velcro panel and
     the class patch, the cuffs closed at the wrist.
   - The plate carrier in night camo: curved front and back plates with shooter's cuts, padded shoulder straps, a
     MOLLE cummerbund, a velcro panel with a name tape and an ID tape, a placard of three rifle magazines with bungee
     retention, a radio pouch with its antenna up behind the shoulder and a push-to-talk cable, a trauma kit with a
     red tab, a drag handle, a zip-on back panel, MOLLE across the back, and the knife sheath across the front.
   - Gloves with leather palms, nylon backs and a carbon knuckle guard; a watch on the left wrist.
   - A balaclava, ear protection on helmet rails, and a high-cut ballistic helmet: a stippled shell with a rubber
     edge trim, side rails, a night-vision mount, velcro panels, bungee cords, a light, a counterweight pouch and a
     strobe that glows in the class colour.
   - The exotech mask: seven carbon plates (two at the jaw, a chin plate with vents and two filters, two cheek plates
     with etched lines, a brow plate and the visor). Stowed, they fold back behind the ears, under the jaw and up into
     the helmet; on the mask's command they swing out one after another and lock with a click over the face, and the
     visor's slit lights up in the class colour.
   - Props: a polymer pistol (slide with serrations, an optic with a dot, a threaded barrel, a weapon light, a
     magazine that drops), a fixed-blade knife with a coated blade and a bright edge, and a carbine slung on the back.
   Each class adds its own kit: Attack more magazines, Defense shoulder armour and a groin plate, Engineer a tool
   pouch and a wrist tablet, Medic a big trauma kit and tourniquets on the straps, Magic a charm and brighter etching. */

/* ---------- shape helpers for the models ---------- */
// a transform from three axes (columns) and a position
function lgBasis(ax, ay, az, t) { const m = lgM4(); m[0] = ax[0]; m[1] = ax[1]; m[2] = ax[2]; m[4] = ay[0]; m[5] = ay[1]; m[6] = ay[2]; m[8] = az[0]; m[9] = az[1]; m[10] = az[2]; if (t) { m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; } return m; }
// profiles drawn side-on (x forward, z up) and extruded across y: local x -> X, local y -> Z, extrusion -> -Y
const LG_SIDE = lgBasis([1, 0, 0], [0, 0, 1], [0, -1, 0]);
// outlines drawn face-on (y across, z up) and extruded along x
const LG_FACE = lgBasis([0, 1, 0], [0, 0, 1], [1, 0, 0]);
function lgSide(B, poly, w, o) { lgPush(B, LG_SIDE); lgExtrude(B, poly, -w / 2, w / 2, o); lgPop(B); }
// bend for face-on outlines: the plate curves back at its edges (local x is across)
function lgBendXZ(R) { return (P, N) => { const x = P[0]; P[2] -= x * x / (2 * R); const nx = N[0] + N[2] * (x / R), l = Math.hypot(nx, N[1], N[2]) || 1; N[0] = nx / l; N[1] /= l; N[2] /= l; }; }
// an ellipsoid surface point, its normal, and a frame at (theta around z from forward, phi up from the equator)
function lgEll(E, th, ph, off) {
  const cp = Math.cos(ph), sp = Math.sin(ph), ct = Math.cos(th), st = Math.sin(th);
  let nx = cp * ct / E[3], ny = cp * st / E[4], nz = sp / E[5]; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
  return { p: [E[0] + E[3] * cp * ct + nx * off, E[1] + E[4] * cp * st + ny * off, E[2] + E[5] * sp + nz * off], n: [nx, ny, nz] };
}
// a frame on a surface: x along the normal, z "up" along the surface, y across
function lgEllFrame(E, th, ph, off, spin) {
  const a = lgEll(E, th, ph, off), b = lgEll(E, th, ph + 0.01, off), n = a.n;
  let ux = b.p[0] - a.p[0], uy = b.p[1] - a.p[1], uz = b.p[2] - a.p[2]; const d = ux * n[0] + uy * n[1] + uz * n[2]; ux -= n[0] * d; uy -= n[1] * d; uz -= n[2] * d; let l = Math.hypot(ux, uy, uz) || 1; ux /= l; uy /= l; uz /= l;
  let yx = uy * n[2] - uz * n[1], yy = uz * n[0] - ux * n[2], yz = ux * n[1] - uy * n[0];
  if (spin) { const c = Math.cos(spin), s = Math.sin(spin), zx = ux * c + yx * s, zy = uy * c + yy * s, zz = uz * c + yz * s; yx = yx * c - ux * s; yy = yy * c - uy * s; yz = yz * c - uz * s; ux = zx; uy = zy; uz = zz; }
  return lgBasis(n, [yx, yy, yz], [ux, uy, uz], a.p);
}
// keep a small decal on an ellipsoid (projected, lifted by off)
function lgOnEll(E, off) { return (P, N) => { let dx = (P[0] - E[0]) / E[3], dy = (P[1] - E[1]) / E[4], dz = (P[2] - E[2]) / E[5]; const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l; let nx = dx / E[3], ny = dy / E[4], nz = dz / E[5]; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl; P[0] = E[0] + dx * E[3] + nx * off; P[1] = E[1] + dy * E[4] + ny * off; P[2] = E[2] + dz * E[5] + nz * off; N[0] = nx; N[1] = ny; N[2] = nz; }; }
// a curved plate on an ellipsoid: theta and phi ranges (phi range may follow theta), offset off the surface, thickness
function lgShell(B, E, th0, th1, ph0, ph1, off, thick, o) {
  o = o || {}; const p = lgPart(B), nu = lgSeg(B, o.nu || 16), nv = Math.max(2, lgSeg(B, o.nv || 8)), base = p.n, ru = (E[3] + E[4]) / 2;
  const PH0 = typeof ph0 === 'function' ? ph0 : () => ph0, PH1 = typeof ph1 === 'function' ? ph1 : () => ph1;
  const grid = (offs, flip) => { const b0 = p.n; for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const th = th0 + (th1 - th0) * i / nu, ph = PH0(th) + (PH1(th) - PH0(th)) * j / nv, s = lgEll(E, th, ph, offs); lgV(B, p, s.p[0], s.p[1], s.p[2], s.n[0] * flip, s.n[1] * flip, s.n[2] * flip, th * ru, ph * E[5]); } for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const A = b0 + j * (nu + 1) + i, Bb = A + 1, C = A + nu + 1, D = C + 1; lgTri(p, A, Bb, D); lgTri(p, A, D, C); } return b0; };
  grid(off + thick, 1);
  if (o.inner !== false) { const im = o.innerM; const keep = B.M; if (im) B.M = im; grid(off, -1); B.M = keep; }
  // the rim, all the way round
  const rim = (th, ph, nth, nph) => { const a = lgEll(E, th, ph, off), b = lgEll(E, th, ph, off + thick); return [a, b, nth, nph]; };
  const edge = [];
  for (let i = 0; i <= nu; i++) { const th = th0 + (th1 - th0) * i / nu; edge.push([th, PH0(th), 0, -1]); }
  for (let j = 0; j <= nv; j++) { const th = th1; edge.push([th, PH0(th) + (PH1(th) - PH0(th)) * j / nv, 1, 0]); }
  for (let i = nu; i >= 0; i--) { const th = th0 + (th1 - th0) * i / nu; edge.push([th, PH1(th), 0, 1]); }
  for (let j = nv; j >= 0; j--) { const th = th0; edge.push([th, PH0(th) + (PH1(th) - PH0(th)) * j / nv, -1, 0]); }
  let prev = null; let u = 0;
  for (const e of edge) {
    const a = lgEll(E, e[0], e[1], off), b = lgEll(E, e[0], e[1], off + thick), c = lgEll(E, e[0] + e[2] * 0.02, e[1] + e[3] * 0.02, off);
    let rx = c.p[0] - a.p[0], ry = c.p[1] - a.p[1], rz = c.p[2] - a.p[2]; const l = Math.hypot(rx, ry, rz) || 1; rx /= l; ry /= l; rz /= l;
    const ia = lgV(B, p, a.p[0], a.p[1], a.p[2], rx, ry, rz, u, 0), ib = lgV(B, p, b.p[0], b.p[1], b.p[2], rx, ry, rz, u, thick);
    if (prev) { lgTri(p, prev[0], prev[1], ib); lgTri(p, prev[0], ib, ia); }
    prev = [ia, ib]; u += 0.01;
  }
  return base;
}
// a path of points along an ellipsoid surface (for trims, rails, cords)
function lgEllPath(E, th0, th1, ph, off, n) { const pts = []; const PH = typeof ph === 'function' ? ph : () => ph; for (let i = 0; i <= n; i++) { const th = th0 + (th1 - th0) * i / n; pts.push(lgEll(E, th, PH(th), off).p); } return pts; }
const lgC = (h) => lgHex(h);

/* ---------- the Operator's materials and his class kit ---------- */
function lgOpKit(cls) {
  const c = LG_CLASS_BY[cls] || LG_CLASSES[0];
  const M = {
    camo: lgMtl({ c: [1, 1, 1], t: LT.camo, r: 0.88, w: 1, n: 0.45, k: 0.3 }),
    shirt: lgMtl({ c: '#55574f', t: LT.knit, r: 0.86, w: 1, n: 0.7, k: 0.07 }),
    ncamo: lgMtl({ c: [1, 1, 1], t: LT.ncamo, r: 0.82, w: 0.9, n: 1, k: 0.3 }),
    molle: lgMtl({ c: '#30312c', t: LT.molle, r: 0.82, w: 0.9, n: 1.5, k: 0.152 }),
    cord: lgMtl({ c: '#33352f', t: LT.cord, r: 0.86, w: 0.9, n: 1, k: 0.05 }),
    pouch: lgMtl({ c: '#414434', t: LT.cord, r: 0.86, w: 0.9, n: 1, k: 0.05 }),
    web: lgMtl({ c: '#1f201d', t: LT.rip, r: 0.8, w: 0.8, n: 0.6, k: 0.04 }),
    rubber: lgMtl({ c: '#1c1d1c', t: LT.rubber, r: 0.7, w: 0.25, n: 1, k: 0.1 }),
    boot: lgMtl({ c: '#6a5a43', t: LT.leather, r: 0.62, w: 0.55, n: 0.8, k: 0.07 }),
    bootNy: lgMtl({ c: '#54493a', t: LT.cord, r: 0.8, w: 0.8, n: 0.8, k: 0.05 }),
    sole: lgMtl({ c: '#1b1a19', t: LT.rubber, r: 0.78, w: 0.2, n: 1.2, k: 0.09 }),
    palm: lgMtl({ c: '#7a705f', t: LT.leather, r: 0.62, w: 0.6, n: 0.8, k: 0.045 }),
    gback: lgMtl({ c: '#222322', t: LT.cord, r: 0.82, w: 0.8, n: 0.9, k: 0.04 }),
    knuckle: lgMtl({ c: '#1b1c1e', t: LT.carbon, r: 0.3, w: 0.05, n: 0.6, k: 0.035 }),
    carbon: lgMtl({ c: '#202226', t: LT.carbon, r: 0.24, m: 0.12, w: 0.04, n: 0.5, k: 0.055 }),
    carbonIn: lgMtl({ c: '#111214', t: LT.cord, r: 0.9, w: 0.3, k: 0.04 }),
    shell: lgMtl({ c: '#3d4236', t: LT.poly, r: 0.62, w: 0.2, n: 0.8, k: 0.1 }),
    shellIn: lgMtl({ c: '#26272a', t: LT.cord, r: 0.9, w: 0.5, k: 0.04 }),
    metal: lgMtl({ c: '#2b2d30', t: LT.metal, r: 0.34, m: 0.7, w: 0.04, n: 0.4, k: 0.09 }),
    steel: lgMtl({ c: '#9aa0a5', t: LT.metal, r: 0.16, m: 0.95, w: 0, n: 0.3, k: 0.08 }),
    brass: lgMtl({ c: '#b08a3e', t: LT.metal, r: 0.25, m: 0.9, w: 0, n: 0.2, k: 0.05 }),
    poly: lgMtl({ c: '#232421', t: LT.poly, r: 0.6, w: 0.08, n: 0.9, k: 0.04 }),
    polyHi: lgMtl({ c: '#2e302c', t: LT.poly, r: 0.55, w: 0.08, n: 0.6, k: 0.06 }),
    visor: lgMtl({ c: '#07090c', r: 0.05, m: 0.4, w: 0, n: 0 }),
    lens: lgMtl({ c: '#1a2a35', r: 0.04, m: 0.5, w: 0, n: 0 }),
    glow: lgMtl({ c: [1, 1, 1], s: 2, e: 2.4, r: 0.3, w: 0, n: 0 }),
    glowSoft: lgMtl({ c: [1, 1, 1], s: 2, e: 0.9, r: 0.4, w: 0, n: 0 }),
    white: lgMtl({ c: '#e8e4d8', r: 0.5, w: 0.2, e: 0.6 }),
    bala: lgMtl({ c: '#2b2b2c', t: LT.knit, r: 0.92, w: 1, n: 0.7, k: 0.045 }),
    eyes: lgMtl({ c: [1, 1, 1], t: LT.face, r: 0.45, w: 0.15, k: 1, s: 4, n: 0 }),
    patch: lgMtl({ c: [1, 1, 1], t: LT.patch, r: 0.88, w: 0.6, k: 1, s: 4, n: 0.4 }),
    patchBase: lgMtl({ c: '#1d1e1b', t: LT.cord, r: 0.9, w: 0.7, k: 0.03 }),
    emblem: lgMtl({ c: [1, 1, 1], t: LT.emblem, r: 0.55, w: 0.3, k: 1, s: 5, e: 0.35, n: 0 }),
    velcro: lgMtl({ c: [1, 1, 1], t: LT.face, r: 0.95, w: 0.8, k: 1, s: 4, n: 0.5 }),
    etch: lgMtl({ c: [1, 1, 1], t: LT.face, r: 0.3, k: 1, s: 6, e: cls === 'magic' ? 2.2 : 0.7, n: 0 }),
    red: lgMtl({ c: '#a8231c', t: LT.rip, r: 0.75, w: 0.7, k: 0.03 }),
    redCross: lgMtl({ c: '#c0322a', t: LT.emblem, r: 0.6, w: 0.3, k: 1, s: 4, n: 0 }),
    tan: lgMtl({ c: '#8a7d5f', t: LT.cord, r: 0.85, w: 0.85, k: 0.04 })
  };
  const ci = LG_CLASSES.indexOf(c);
  return { cls: c.id, ci: ci < 0 ? 0 : ci, M: M };
}
// the emblem sheet's cell for class i (3 x 2): uv rectangle in tile units
function lgEmblemUV(i) { const col = i % 3, row = Math.floor(i / 3), m = 0.01; return [col / 3 + m, row / 2 + m, (col + 1) / 3 - m, (row + 1) / 2 - m]; }
// a quarter of a decal sheet: 0 top left, 1 top right, 2 bottom left, 3 bottom right; with an inner crop [x0,y0,x1,y1] in 0..1
function lgQuarterUV(q, crop) { const x = (q & 1) * 0.5, y = (q >> 1) * 0.5, c = crop || [0.02, 0.02, 0.98, 0.98]; return [x + c[0] * 0.5, y + c[1] * 0.5, x + c[2] * 0.5, y + c[3] * 0.5]; }

/* ---------- sockets: where the props ride, and how the hands hold them ---------- */
(function lgSockets() {
  // pistol space: bore along +x, origin at the back of the slide on the bore line, slide top +z
  // right hand on the grip: thumb side up, palm facing the gun's left (into the grip), knuckles forward and a little down
  LG_SOCK.gripR = lgBasis([0.259, 0, 0.966], [0, 1, 0], [-0.966, 0, 0.259], [-0.0488, -0.03, -0.0562]);   // (1.9.994: forward, so the front strap lies across the base of the fingers)
  // support hand: canted down, palm against the left of the grip, thumb forward under the slide
  LG_SOCK.gripL = lgBasis([0.707, 0, 0.707], [0, 1, 0], [-0.707, 0, 0.707], [-0.035, 0.052, -0.052]);
  // holster on the right hip (pelvis space): muzzle down with a little rearward cant, sights facing forward
  LG_SOCK.holster = lgTR(0.005, -0.192, 0.035, 0, Math.PI / 2 + 0.12, 0);
  // knife space: blade along +x, spine +z. Sheath across the bottom of the carrier front (chest space), handle to the right
  LG_SOCK.sheath = lgBasis([0, 1, 0], [-1, 0, 0], [0, 0, 1], [0.205, 0.035, -0.105]);
  // left hand, reverse grip (1.9.993, fixed: the handle lies across the palm in the closed fist, the blade leaves the
  // little-finger side and lies back along the forearm, the edge out; it used to lie along the fingers, backwards)
  LG_SOCK.kgrip = lgBasis([-0.75, 0, 0.66], [0, -1, 0], [0.66, 0, 0.75], [-0.004, -0.022, 0.063]);
  // right hand, forward (hammer) grip, for work like sharpening: the blade leaves between thumb and index, edge forward
  LG_SOCK.kgripF = lgBasis([0.75, 0, 0.66], [0, 1, 0], [-0.66, 0, 0.75], [-0.0894, -0.022, 0.0411]);   // (held diagonally, heel of the palm to the index, as a real fist holds a handle)
  // carbine space: bore +x, origin over the pistol grip; on the back, muzzle up behind the left shoulder
  LG_SOCK.back = lgBasis([0, 0.5, 0.866], [0, 0.866, -0.5], [-1, 0, 0], [-0.205, -0.06, 0.02]);
  // 1.9.994: the firing hand high on the pistol grip (the index's knuckle beside the receiver, the web under the stock), and
  // the support hand under the handguard: the handguard lies in the palm, the thumb along the near side, the fingers
  // closing over the far side (both then fitted to the gun by leghand.js)
  LG_SOCK.cgripR = lgBasis([0.42, 0, 0.906], [0, 1, 0], [-0.906, 0, 0.42], [-0.1154, -0.0285, -0.0516]);
  LG_SOCK.cgripL = lgBasis([0.953, 0.301, 0], [0, 0, -1], [-0.301, 0.953, 0], [0.14, 0.0597, -0.0345]);
  LG_SOCK.muzP = [0.214, 0, 0]; LG_SOCK.muzC = [0.469, 0, 0];
  // a fresh magazine in the left hand (hand space -> magazine geometry, which is built in the gun's space): the
  // magazine's top between the fingers, index finger along its front
  LG_SOCK.magHand = lgBasis([0, 0, 1], [0, 1, 0], [-1, 0, 0], [-0.03, -0.02, -0.1]);
  LG_SOCK.cmagHand = lgBasis([0, 0, 1], [0, 1, 0], [-1, 0, 0], [-0.098, -0.02, -0.104]);   // (1.9.994: on the M4's magazine, which the generic carbine now is)
})();

/* ---------- the Operator ---------- */
LG_MAKERS.operator = function (B, cls) {
  // cls may carry a loadout: "class|primary|secondary" (1.9.993: each rebuilt gun has its own model, leggun.js)
  const parts = String(cls || 'attack').split('|'), K = lgOpKit(parts[0]); K.face = parts[1] === 'idle';   // (the stoop: balaclava pulled down, his face showing)
  lgOpPelvis(B, K); lgOpSpine(B, K); lgOpChest(B, K); lgOpHead(B, K); lgOpHelmet(B, K); lgOpMask(B, K);
  for (const s of ['L', 'R']) { lgOpArm(B, K, s); lgOpHand(B, K, s); lgOpLeg(B, K, s); }
  if (parts[1] === 'idle' && typeof lgOpIdleProps === 'function') { lgOpPistol(B, K); lgOpIdleProps(B, K); }   // the stoop: a whetstone where the carbine would be
  else if (parts.length > 1 && typeof lgOpGuns === 'function') lgOpGuns(B, K, parts[1], parts[2]); else { lgOpPistol(B, K); lgOpCarbine(B, K); }
  lgOpKnife(B, K);
};
function lgOpPelvis(B, K) {
  const M = K.M, hi = B.lod < 2;
  lgBone(B, 'pelvis');
  // hips in camo trousers
  lgMat(B, M.camo);
  lgLathe(B, [[0.03, -0.172], [0.085, -0.16], [0.135, -0.12], [0.158, -0.07], [0.166, -0.02], [0.162, 0.04], [0.156, 0.085]], { segs: 22, sx: 0.7, wr: (a, z) => z < -0.1 ? Math.sin(a * 6) * 0.015 : 0 });
  // battle belt (MOLLE, night) and the rigger's belt with its buckle
  lgMat(B, M.molle); lgLathe(B, [[0.17, -0.005], [0.178, 0.005], [0.179, 0.055], [0.172, 0.066]], { segs: 24, sx: 0.71, capB: false });
  lgMat(B, M.web); lgLathe(B, [[0.178, 0.058], [0.182, 0.062], [0.182, 0.082], [0.178, 0.086]], { segs: 24, sx: 0.72 });
  lgMat(B, M.metal); lgBox(B, 0.13, 0, 0.072, 0.008, 0.026, 0.013, 0.004);
  if (hi) { lgBox(B, 0.136, 0, 0.072, 0.004, 0.012, 0.006, 0.002); }
  // the holster round the pistol (built in the pistol's space at the hip)
  lgPush(B, LG_SOCK.holster);
  lgMat(B, M.poly);
  lgSide(B, [[-0.008, -0.016], [0.202, -0.016], [0.208, -0.008], [0.208, 0.02], [0.2, 0.026], [0.02, 0.026], [0.0, 0.02]], 0.036, { bev: 0.006, smooth: 0.6 });
  lgSide(B, [[0.03, -0.016], [0.1, -0.016], [0.095, -0.05], [0.04, -0.054]], 0.034, { bev: 0.005 });
  // the hood (retention), over the back of the slide
  lgMat(B, M.polyHi); lgTube(B, [[-0.03, 0.0, 0.035], [-0.012, 0.0, 0.05], [0.012, 0.0, 0.048], [0.03, 0.0, 0.032]], 0.006, { segs: 6, flat: 2.6, up: [0, 1, 0] });
  // quick-release plate and the arm up to the belt
  lgMat(B, M.metal); lgBox(B, 0.06, -0.022, 0.0, 0.035, 0.004, 0.03, 0.003);
  lgMat(B, M.poly); lgBox(B, -0.03, -0.024, 0.0, 0.045, 0.005, 0.02, 0.004);
  lgPop(B);
  // two pistol magazine pouches, front left
  for (let i = 0; i < 2; i++) {
    const a = 0.55 + i * 0.32, x = Math.cos(a) * 0.178 * 0.71, y = Math.sin(a) * 0.178;
    lgPush(B, lgTR(x, y, 0.03, 0, 0, a));
    lgMat(B, M.pouch); lgBox(B, 0.012, 0, -0.005, 0.011, 0.018, 0.04, 0.006);
    lgMat(B, M.poly); lgBox(B, 0.012, 0, 0.04, 0.008, 0.014, 0.006, 0.003);
    if (hi) { lgMat(B, M.web); lgTube(B, [[0.024, -0.012, 0.03], [0.026, 0, 0.05], [0.024, 0.012, 0.03]], 0.0022, { segs: 4 }); }
    lgPop(B);
  }
  // dump pouch (rolled), back left; tourniquet, back right
  lgPush(B, lgTR(-0.115, 0.06, 0.02, Math.PI / 2, 0, 0)); lgMat(B, M.pouch); lgLimb(B, 0.11, [[0, 0.028], [1, 0.028]], { up: true, z0: -0.055, segs: 10 }); lgPop(B);
  if (hi) {
    lgPush(B, lgTR(-0.12, -0.09, 0.0, 0, 0, 0)); lgMat(B, M.rubber); lgLimb(B, 0.1, [[0, 0.017], [1, 0.017]], { up: true, z0: -0.05, segs: 8 }); lgMat(B, M.red); lgBox(B, -0.012, 0, 0.055, 0.008, 0.006, 0.01, 0.003); lgPop(B);
  }
  if (K.cls === 'defense') { lgMat(B, M.ncamo); lgPush(B, lgTR(0.135, 0, -0.06, 0, -0.18, 0)); lgBox(B, 0, 0, 0, 0.012, 0.075, 0.075, 0.012); lgPop(B); }
  if (K.cls === 'medic') { lgPush(B, lgTR(-0.13, 0, 0.0, 0, 0, 0)); lgMat(B, M.pouch); lgBox(B, -0.02, 0, 0.0, 0.03, 0.07, 0.05, 0.012); lgMat(B, M.redCross); lgDecal(B, [-0.0515, 0, 0.0], [0, -0.03, 0], [0, 0, 0.03], lgEmblemUV(3)); lgPop(B); }
  if (K.cls === 'engineer') { lgPush(B, lgTR(-0.02, -0.18, 0.0, 0, 0, -Math.PI / 2)); lgMat(B, M.tan); lgBox(B, 0.012, 0, -0.01, 0.014, 0.04, 0.045, 0.008); lgMat(B, M.steel); lgBox(B, 0.012, 0.0, 0.05, 0.004, 0.006, 0.02, 0.002); lgPop(B); }
}
function lgOpSpine(B, K) {
  const M = K.M;
  lgBone(B, 'spine');
  lgMat(B, M.shirt); lgLathe(B, [[0.148, -0.03], [0.152, 0.05], [0.158, 0.13], [0.164, 0.21]], { segs: 20, sx: 0.74 });
  // the cummerbund round the sides and back
  lgMat(B, M.molle); lgLathe(B, [[0.166, 0.03], [0.176, 0.04], [0.179, 0.09], [0.178, 0.165], [0.17, 0.178]], { segs: 24, sx: 0.79 });
  if (K.cls === 'attack') { for (const y of [0.17, -0.17]) { lgPush(B, lgTR(0.03, y, 0.1, 0, 0, y > 0 ? 1.2 : -1.2)); lgMat(B, M.pouch); lgBox(B, 0.015, 0, 0, 0.012, 0.03, 0.045, 0.006); lgMat(B, M.poly); lgBox(B, 0.015, 0, 0.05, 0.009, 0.026, 0.008, 0.003); lgPop(B); } }
}
function lgOpChest(B, K) {
  const M = K.M, hi = B.lod < 2, top = B.lod === 0;
  lgBone(B, 'chest');
  // torso in the knit shirt, and the mock collar
  lgMat(B, M.shirt); lgLathe(B, [[0.166, -0.04], [0.17, 0.05], [0.178, 0.13], [0.172, 0.19], [0.142, 0.228], [0.085, 0.255], [0.062, 0.272]], { segs: 22, sx: 0.68 });
  lgLathe(B, [[0.06, 0.232], [0.066, 0.246], [0.065, 0.285], [0.058, 0.292]], { segs: 18, sx: 0.98 });
  // shoulders (sleeve caps)
  lgMat(B, M.camo); for (const s of [1, -1]) lgSphere(B, -0.012, s * 0.168, 0.188, 0.068, 0.066, 0.062, { segs: 16, rings: 10 });
  // front plate bag: curved, shooter's cuts, night camo; velcro panel with the name and ID tapes
  const plate = [[-0.132, -0.16], [0.132, -0.16], [0.132, 0.08], [0.078, 0.158], [-0.078, 0.158], [-0.132, 0.08]];
  const bendF = lgBendXZ(0.33), bendB = lgBendXZ(-0.38);
  lgMat(B, M.ncamo); lgPush(B, lgTR(0, 0, 0.075)); lgPush(B, LG_FACE); B.def = bendF; lgExtrude(B, plate, 0.098, 0.155, { bev: 0.014, smooth: 0.7 }); B.def = null; lgPop(B); lgPop(B);
  // decals ride the same curve: face-on (x across, y up), lifted off the front at x = 0.155
  const onFront = (cx, cz, hw, hh, mat, uv, lift) => { lgMat(B, mat); lgPush(B, lgTR(0, 0, 0.075)); lgPush(B, LG_FACE); B.def = bendF; lgDecal(B, [cx, cz, 0.155 + (lift || 0.0015)], [hw, 0, 0], [0, hh, 0], uv, { sub: 6, lift: 0 }); B.def = null; lgPop(B); lgPop(B); };
  onFront(0, 0.085, 0.1, 0.045, M.velcro, lgQuarterUV(2, [0.05, 0.05, 0.95, 0.95]));
  onFront(0, 0.088, 0.085, 0.024, M.patch, lgQuarterUV(0, [0.05, 0.33, 0.95, 0.67]), 0.0028);
  if (hi) onFront(0, 0.122, 0.055, 0.012, M.patch, lgQuarterUV(3, [0.05, 0.36, 0.95, 0.64]), 0.0028);
  // back plate bag with MOLLE across it, the drag handle and a zip-on panel
  lgMat(B, M.ncamo); lgPush(B, lgTR(0, 0, 0.085)); lgPush(B, LG_FACE); B.def = bendB; lgExtrude(B, [[-0.138, -0.17], [0.138, -0.17], [0.138, 0.09], [0.09, 0.165], [-0.09, 0.165], [-0.138, 0.09]], -0.16, -0.105, { bev: 0.014, smooth: 0.7 }); B.def = null; lgPop(B); lgPop(B);
  lgMat(B, M.molle); lgPush(B, lgTR(0, 0, 0.085)); lgPush(B, LG_FACE); B.def = bendB; lgDecal(B, [0, -0.04, -0.1615], [-0.125, 0, 0], [0, 0.11, 0], [0, 0, 1.64, 1.45], { sub: 6, lift: 0 }); B.def = null; lgPop(B); lgPop(B);
  lgMat(B, M.web); lgTube(B, [[-0.168, -0.035, 0.226], [-0.176, -0.03, 0.246], [-0.178, 0, 0.252], [-0.176, 0.03, 0.246], [-0.168, 0.035, 0.226]], 0.006, { segs: 5, flat: 0.45 });
  if (hi) { lgMat(B, M.cord); lgBox(B, -0.185, 0, 0.02, 0.012, 0.1, 0.11, 0.01); lgMat(B, M.metal); lgBox(B, -0.198, 0, 0.02, 0.0015, 0.003, 0.1, 0.001); }
  // shoulder straps with pads
  for (const s of [1, -1]) {
    const path = [[0.118, s * 0.098, 0.218], [0.08, s * 0.118, 0.255], [0.0, s * 0.13, 0.272], [-0.08, s * 0.12, 0.26], [-0.122, s * 0.1, 0.225]];
    lgMat(B, M.ncamo); lgTube(B, path, 0.036, { segs: 8, flat: 0.28, up: [0, 0, 1] });
    lgMat(B, M.cord); lgTube(B, path.slice(1, 4), 0.04, { segs: 8, flat: 0.34, up: [0, 0, 1] });
    if (K.cls === 'medic' && hi) { lgMat(B, M.rubber); lgPush(B, lgTR(0.1, s * 0.11, 0.18, 0, -0.3, 0)); lgLimb(B, 0.09, [[0, 0.016], [1, 0.016]], { up: true, z0: -0.045, segs: 8 }); lgMat(B, M.red); lgBox(B, 0.01, 0, 0.05, 0.006, 0.008, 0.01, 0.003); lgPop(B); }
  }
  // placard: three rifle magazines with bungee retention
  lgMat(B, M.cord); lgBox(B, 0.168, 0, -0.045, 0.026, 0.118, 0.05, 0.012);
  for (let i = -1; i <= 1; i++) {
    const y = i * 0.074;
    lgMat(B, M.pouch); lgBox(B, 0.2, y, -0.038, 0.018, 0.032, 0.046, 0.008);
    lgMat(B, M.poly); lgBox(B, 0.2, y, 0.012, 0.012, 0.026, 0.012, 0.004);
    if (hi) { lgMat(B, M.web); lgTube(B, [[0.214, y - 0.022, 0.0], [0.22, y, 0.03], [0.214, y + 0.022, 0.0]], 0.0028, { segs: 4 }); lgMat(B, M.red); lgBox(B, 0.221, y, 0.034, 0.004, 0.007, 0.006, 0.002); }
  }
  // radio pouch on the left with its antenna and the push-to-talk cable; the trauma kit on the right
  lgMat(B, M.pouch); lgBox(B, 0.0, 0.19, -0.005, 0.034, 0.03, 0.06, 0.01);
  lgMat(B, M.poly); lgBox(B, 0.0, 0.19, 0.065, 0.026, 0.022, 0.012, 0.005);
  if (hi) { lgMat(B, M.metal); lgLimb(B, 0.012, [[0, 0.006], [1, 0.006]], { up: true, z0: 0.078, ox: -0.01, oy: 0.19, segs: 8 }); }
  lgMat(B, M.rubber); lgTube(B, [[-0.012, 0.19, 0.08], [-0.05, 0.19, 0.2], [-0.075, 0.17, 0.32], [-0.09, 0.155, 0.44]], (t) => 0.005 - t * 0.003, { segs: 5 });
  if (hi) { lgMat(B, M.web); lgTube(B, [[0.03, 0.2, 0.05], [0.09, 0.17, 0.12], [0.13, 0.12, 0.16], [0.152, 0.1, 0.17]], 0.003, { segs: 4 }); lgMat(B, M.poly); lgBox(B, 0.158, 0.098, 0.17, 0.008, 0.015, 0.02, 0.004); }
  lgMat(B, K.cls === 'medic' ? M.red : M.pouch); lgBox(B, 0.0, -0.19, -0.005, K.cls === 'medic' ? 0.045 : 0.034, 0.03, K.cls === 'medic' ? 0.07 : 0.055, 0.012);
  lgMat(B, M.red); lgBox(B, 0.0, -0.22, 0.05, 0.008, 0.004, 0.012, 0.002);
  // the knife sheath across the bottom of the front
  lgPush(B, LG_SOCK.sheath); lgMat(B, M.poly); lgSide(B, [[-0.004, -0.016], [0.13, -0.016], [0.162, 0.0], [0.135, 0.017], [-0.004, 0.017]], 0.014, { bev: 0.004 }); lgMat(B, M.metal); lgBox(B, 0.02, -0.01, 0, 0.012, 0.003, 0.02, 0.002); lgPop(B);
  if (K.cls === 'magic') { lgMat(B, M.metal); lgPush(B, lgTR(0.16, -0.09, 0.13, 0, 0, 0)); lgPush(B, LG_FACE); lgExtrude(B, [[0, -0.02], [0.017, -0.01], [0.017, 0.01], [0, 0.02], [-0.017, 0.01], [-0.017, -0.01]], -0.003, 0.003, { bev: 0.001 }); lgPop(B); lgPop(B); lgMat(B, M.glow); lgSphere(B, 0.166, -0.09, 0.13, 0.006, 0.006, 0.006, { segs: 8, rings: 6 }); }
  if (K.cls === 'engineer' && hi) { lgMat(B, M.polyHi); lgBox(B, 0.162, 0.07, 0.15, 0.006, 0.035, 0.022, 0.004); lgMat(B, M.glowSoft); lgBox(B, 0.169, 0.07, 0.15, 0.001, 0.03, 0.017, 0.0); }
  if (K.cls === 'defense') { lgMat(B, M.ncamo); for (const s of [1, -1]) { lgPush(B, lgTR(0, s * 0.19, 0.1, 0, 0, 0)); lgBox(B, 0, 0, 0, 0.06, 0.015, 0.06, 0.012); lgPop(B); } }
}
function lgOpHead(B, K) {
  const M = K.M, hi = B.lod < 2;
  lgBone(B, 'neck'); lgMat(B, M.bala); lgLathe(B, [[0.057, -0.035], [0.055, 0.02], [0.054, 0.08], [0.058, 0.12]], { segs: 16, sx: 1.05 });
  // the balaclava pulled down off his face: a rolled ring of knit round the neck
  if (K.face) lgLathe(B, [[0.056, 0.05], [0.066, 0.06], [0.072, 0.085], [0.068, 0.11], [0.056, 0.12]], { segs: 18, sx: 1.08 });
  lgBone(B, 'head'); lgMat(B, M.bala);
  lgSphere(B, 0.015, 0, 0.09, 0.1, 0.079, 0.118, { segs: 22, rings: 14 });
  const skin = K.face ? lgMtl({ c: '#a07a60', r: 0.5, w: 0.15, n: 0.3 }) : M.bala, stub = K.face ? lgMtl({ c: '#5b4536', r: 0.75, w: 0.4, n: 0.5 }) : M.bala;
  lgMat(B, K.face ? stub : M.bala); lgSphere(B, 0.04, 0, 0.012, 0.064, 0.064, 0.052, { segs: 16, rings: 10 });
  lgMat(B, skin); lgSphere(B, 0.1, 0, 0.074, 0.018, 0.012, 0.02, { segs: 10, rings: 8 });
  lgSphere(B, 0.088, 0, 0.115, 0.032, 0.07, 0.018, { segs: 12, rings: 6 });
  if (K.face) {
    // his face: skin over the front of the head, stubble over the jaw, a straight nose, the brow, a set mouth; the eyes
    // are the decal below (lifted clear of the skin)
    const E = [0.015, 0, 0.09, 0.1, 0.079, 0.118];
    lgShell(B, E, -1.1, 1.1, -0.62, 0.55, 0.0008, 0.0008, { nu: 16, nv: 10, inner: false });
    lgMat(B, stub); lgShell(B, E, -1.05, 1.05, -0.76, -0.38, 0.0018, 0.0008, { nu: 14, nv: 5, inner: false });
    lgMat(B, skin); lgSphere(B, 0.108, 0, 0.08, 0.009, 0.007, 0.022, { segs: 10, rings: 8 }); lgSphere(B, 0.112, 0, 0.065, 0.009, 0.011, 0.008, { segs: 10, rings: 6 });
    for (const s of [1, -1]) { lgMat(B, lgMtl({ c: '#2a1f18', r: 0.8 })); lgBox(B, 0.1135, s * 0.028, 0.114, 0.002, 0.016, 0.0022, 0.0012); }
    lgMat(B, lgMtl({ c: '#5e3e33', r: 0.45 })); lgBox(B, 0.1095, 0, 0.047, 0.0015, 0.016, 0.0016, 0.0008);
  }  // the eyes, through the balaclava (seen when the mask is open)
  lgMat(B, M.eyes); { const E = [0.015, 0, 0.09, 0.1, 0.079, 0.118]; B.def = lgOnEll(E, K.face ? 0.0024 : 0.0035); if (K.face) lgDecal(B, [0.11, 0, 0.099], [0, -0.058, 0], [0, 0, 0.0085], [0.005, 0.214, 0.495, 0.286], { sub: 6, lift: 0 }); else lgDecal(B, [0.11, 0, 0.099], [0, -0.058, 0], [0, 0, 0.023], [0.005, 0.15, 0.495, 0.35], { sub: 6, lift: 0 }); B.def = null; }
  // ear protection: cups with a grille, on arms up to the helmet rails
  for (const s of [1, -1]) {
    lgPush(B, lgTR(-0.004, s * 0.082, 0.083, -s * Math.PI / 2, 0, 0));
    // (1.9.994: oval cups like a real comms headset, a little smaller, with the volume knob and the mic boom's root)
    lgMat(B, M.poly); lgLathe(B, [[0.0, 0.0], [0.04, 0.0], [0.044, 0.006], [0.045, 0.02], [0.039, 0.03], [0.0, 0.032]], { segs: 18, sx: 0.8 });
    lgMat(B, M.rubber); lgLathe(B, [[0.042, -0.006], [0.046, -0.002], [0.046, 0.004], [0.04, 0.006]], { segs: 18, sx: 0.8 });
    if (hi) { lgMat(B, M.metal); lgLathe(B, [[0.0, 0.032], [0.02, 0.032], [0.022, 0.035], [0.0, 0.0355]], { segs: 14, sx: 0.8 }); lgMat(B, M.rubber); lgBox(B, 0.024, -0.012, 0.022, 0.006, 0.006, 0.006, 0.003); }
    lgPop(B);
    lgMat(B, M.metal); lgBox(B, -0.005, s * 0.112, 0.135, 0.008, 0.005, 0.03, 0.003);
  }
}
const LG_HELM = [0.012, 0, 0.098, 0.134, 0.119, 0.13];
const lgHelmCut = th => 0.2875 + 0.275 * Math.cos(th) - 0.3125 * Math.cos(2 * th);
function lgOpHelmet(B, K) {
  const M = K.M, E = LG_HELM, hi = B.lod < 2, top = B.lod === 0;
  lgBone(B, 'head');
  // the shell: high-cut, stippled, 8 mm thick, padded inside, a rubber trim along the cut
  lgMat(B, M.shell); lgShell(B, E, -Math.PI, Math.PI, lgHelmCut, () => Math.PI / 2 - 0.001, -0.004, 0.008, { nu: 40, nv: 10, innerM: M.shellIn });
  lgMat(B, M.rubber); lgTube(B, lgEllPath(E, -Math.PI, Math.PI, lgHelmCut, 0.0, lgSeg(B, 48)), 0.0048, { segs: 5 });
  // side rails, the night-vision mount, velcro, bungee cords, a light, a counterweight pouch and the strobe
  for (const s of [1, -1]) {
    lgMat(B, M.polyHi); lgTube(B, lgEllPath(E, s * 0.55, s * 1.95, th => lgHelmCut(th) + 0.07, 0.009, lgSeg(B, 12)), 0.009, { segs: 6, flat: 0.42 });
    if (hi) { lgMat(B, M.web); lgTube(B, lgEllPath(E, s * 0.7, s * 2.5, th => 0.62 + 0.1 * Math.sin(th * s * 2), 0.0055, lgSeg(B, 14)), 0.0024, { segs: 4 }); }
    if (hi) { lgMat(B, M.velcro); B.def = lgOnEll(E, 0.0045); const f = lgEll(E, s * 1.3, 0.95, 0.0045).p; lgDecal(B, f, [0.035, 0, 0], [0, -s * 0.02, 0.026], lgQuarterUV(2), { sub: 4, lift: 0 }); B.def = null; }
  }
  lgMat(B, M.metal); lgPush(B, lgEllFrame(E, 0, 0.42, 0.004)); lgBox(B, 0.006, 0, 0, 0.008, 0.026, 0.02, 0.004); if (hi) { lgMat(B, M.visor); for (let i = -1; i <= 1; i++) lgBox(B, 0.0145, i * 0.012, 0.004, 0.001, 0.003, 0.003, 0); } lgPop(B);
  if (hi) { lgMat(B, M.velcro); B.def = lgOnEll(E, 0.0045); const f = lgEll(E, 0, 1.2, 0.0045).p; lgDecal(B, f, [0, -0.05, 0], [0.035, 0, 0], lgQuarterUV(2), { sub: 4, lift: 0 }); B.def = null; }
  lgMat(B, M.cord); lgPush(B, lgEllFrame(E, Math.PI, 0.18, 0.004)); lgBox(B, 0.015, 0, 0, 0.016, 0.05, 0.03, 0.01); lgPop(B);
  lgMat(B, M.poly); lgPush(B, lgEllFrame(E, Math.PI, 0.92, 0.004)); lgBox(B, 0.01, 0, 0, 0.011, 0.016, 0.02, 0.004); lgMat(B, M.glow); lgBox(B, 0.022, 0, 0.004, 0.002, 0.009, 0.006, 0.001); lgPop(B);
  lgMat(B, M.metal); lgPush(B, lgEllFrame(E, 1.45, lgHelmCut(1.45) + 0.1, 0.02)); lgPush(B, lgTR(0, 0, 0, 0, Math.PI / 2, 0)); lgLimb(B, 0.07, [[0, 0.011], [0.8, 0.012], [1, 0.014]], { up: true, z0: -0.035, segs: 10 }); lgMat(B, M.lens); lgSphere(B, 0, 0, 0.037, 0.012, 0.012, 0.003, { segs: 10, rings: 4 }); lgPop(B); lgPop(B);
}
// the mask: seven plates on the face. Each is built where it locks; its bone carries it to where it is stowed.
const LG_FACEE = [0.02, 0, 0.066, 0.118, 0.092, 0.112];
function lgOpMask(B, K) {
  const M = K.M, E = LG_FACEE, hi = B.lod < 2, top = B.lod === 0;
  const plate = (bone, th0, th1, ph0, ph1, off, extra) => { lgBone(B, bone); lgMat(B, M.carbon); lgShell(B, E, th0, th1, ph0, ph1, off, 0.0065, { nu: 12, nv: 7, innerM: M.carbonIn }); if (extra) extra(); };
  plate('mJawL', 0.32, 1.32, -0.6, -0.1, 0.013, () => { lgMat(B, M.metal); lgPush(B, lgEllFrame(E, 0.95, -0.34, 0.02)); lgPush(B, lgTR(0, 0, 0, 0, Math.PI / 2, 0)); lgLimb(B, 0.024, [[0, 0.02], [0.5, 0.022], [1, 0.021]], { up: true, z0: -0.006, segs: 14, wr: (a, z) => z > 0.012 ? Math.sin(a * 24) * 0.04 : 0 }); lgPop(B); lgPop(B); });
  plate('mJawR', -1.32, -0.32, -0.6, -0.1, 0.013, () => { lgMat(B, M.metal); lgPush(B, lgEllFrame(E, -0.95, -0.34, 0.02)); lgPush(B, lgTR(0, 0, 0, 0, Math.PI / 2, 0)); lgLimb(B, 0.024, [[0, 0.02], [0.5, 0.022], [1, 0.021]], { up: true, z0: -0.006, segs: 14, wr: (a, z) => z > 0.012 ? Math.sin(a * 24) * 0.04 : 0 }); lgPop(B); lgPop(B); });
  plate('mChin', -0.56, 0.56, -0.62, 0.21, 0.016, () => {
    // vents across the mouth and a ridge down the middle
    lgMat(B, M.visor); for (let i = 0; i < (hi ? 5 : 2); i++) { lgPush(B, lgEllFrame(E, 0, -0.16 - i * 0.065, 0.0235)); lgBox(B, 0, 0, 0, 0.002, 0.034 - i * 0.003, 0.0035, 0.0012); lgPop(B); }
    lgMat(B, M.metal); lgTube(B, [lgEll(E, 0, -0.58, 0.024).p, lgEll(E, 0, -0.3, 0.025).p, lgEll(E, 0, 0.0, 0.025).p, lgEll(E, 0, 0.18, 0.024).p], 0.0035, { segs: 5, flat: 0.6 });
  });
  plate('mCheekL', 0.52, 1.45, -0.14, 0.43, 0.019, () => { if (hi) { lgMat(B, M.etch); B.def = lgOnEll(E, 0.0265); const f = lgEll(E, 0.95, 0.12, 0.0265).p; lgDecal(B, f, [-0.02, 0.025, 0], [0, 0, 0.035], lgQuarterUV(3), { sub: 4, lift: 0 }); B.def = null; } });
  plate('mCheekR', -1.45, -0.52, -0.14, 0.43, 0.019, () => { if (hi) { lgMat(B, M.etch); B.def = lgOnEll(E, 0.0265); const f = lgEll(E, -0.95, 0.12, 0.0265).p; lgDecal(B, f, [0.02, 0.025, 0], [0, 0, 0.035], lgQuarterUV(3), { sub: 4, lift: 0 }); B.def = null; } });
  plate('mBrow', -0.98, 0.98, 0.42, 0.57, 0.017);
  // the visor: smoked, with the slit that lights up, and two sensors
  lgBone(B, 'mVisor'); lgMat(B, M.visor); lgShell(B, E, -0.88, 0.88, 0.21, 0.43, 0.014, 0.006, { nu: 14, nv: 4, innerM: M.carbonIn });
  lgMat(B, M.glow); lgShell(B, E, -0.62, 0.62, 0.3, 0.33, 0.0205, 0.0012, { nu: 12, nv: 1, inner: false });
  lgMat(B, M.metal); for (const s of [1, -1]) { const f = lgEll(E, s * 0.74, 0.32, 0.021).p; lgSphere(B, f[0], f[1], f[2], 0.006, 0.006, 0.006, { segs: 8, rings: 6 }); }
  if (top) { lgMat(B, M.steel); for (const s of [1, -1]) for (const ph of [-0.05, 0.36]) { const f = lgEll(E, s * 1.35, ph, 0.026).p; lgSphere(B, f[0], f[1], f[2], 0.0028, 0.0028, 0.0028, { segs: 6, rings: 4 }); } }
  // stowed: [pivot, rotation, extra offset, start, end] -- the jaws first, then the chin, the cheeks, the brow, the visor
  LG_MASK.length = 0;
  const add = (b, piv, r0, d0, a, e) => LG_MASK.push({ b: LGB[b], piv: piv, r0: r0, d0: d0, a: a, e: e });
  add('mJawL', [-0.02, 0.06, 0.0], [0, 0.3, 0], [-0.055, -0.026, -0.072], 0.0, 0.34);
  add('mJawR', [-0.02, -0.06, 0.0], [0, 0.3, 0], [-0.055, 0.026, -0.072], 0.04, 0.38);
  add('mChin', [0.0, 0, -0.03], [0, 0.3, 0], [-0.062, 0, -0.08], 0.16, 0.52);
  add('mCheekL', [-0.02, 0.07, 0.07], [0, 0.0, 0.25], [-0.09, -0.014, 0.0], 0.32, 0.66);
  add('mCheekR', [-0.02, -0.07, 0.07], [0, 0.0, -0.25], [-0.09, 0.014, 0.0], 0.36, 0.7);
  add('mBrow', [-0.01, 0, 0.13], [0, -0.08, 0], [-0.032, 0, 0.042], 0.58, 0.82);
  add('mVisor', [-0.01, 0, 0.13], [0, -0.1, 0], [-0.036, 0, 0.05], 0.72, 1.0);
}
function lgOpArm(B, K, s) {
  const M = K.M, sg = s === 'L' ? 1 : -1, hi = B.lod < 2, ci = K.ci;
  lgBone(B, 'arm' + s); lgMat(B, M.camo);
  // 1.9.994: an arm with a shoulder: the deltoid caps the joint (so the arm turns under it), the upper arm tapers to the elbow
  lgSphere(B, -0.004, sg * 0.004, -0.02, 0.055, 0.057, 0.06, { segs: 16, rings: 9 });
  lgLimb(B, 0.285, [[0, 0.058], [0.14, 0.059], [0.38, 0.054], [0.66, 0.048], [0.9, 0.0445], [1, 0.044]], { segs: 16, rings: 9, sx: 1.04, wr: (a, z) => z < -0.22 ? Math.sin(a * 5 + z * 90) * 0.045 : Math.sin(a * 3 + z * 40) * 0.012 });
  // shoulder pocket, velcro, and the class patch
  lgMat(B, M.camo); lgBox(B, 0.002, sg * 0.05, -0.085, 0.036, 0.008, 0.048, 0.006);
  lgBox(B, 0.002, sg * 0.052, -0.035, 0.038, 0.009, 0.012, 0.005);
  lgMat(B, M.patchBase); lgBox(B, 0.004, sg * 0.0595, -0.088, 0.03, 0.0025, 0.03, 0.006);
  lgMat(B, M.emblem); lgDecal(B, [0.004, sg * 0.0623, -0.088], [-sg * 0.026, 0, 0], [0, 0, 0.026], lgEmblemUV(ci), { lift: 0.0006 });
  if (K.cls === 'defense') { lgMat(B, M.ncamo); lgSphere(B, 0, sg * 0.03, -0.03, 0.07, 0.05, 0.065, { segs: 14, rings: 8, p0: -0.3, t0: sg > 0 ? -1.3 : Math.PI - 1.9, t1: sg > 0 ? 1.9 : Math.PI + 1.3 }); }
  lgBone(B, 'fore' + s); lgMat(B, M.camo);
  // the elbow (a ball the upper arm's end turns round), a forearm that narrows to the wrist, oval in section
  lgSphere(B, 0, 0, 0, 0.045, 0.045, 0.046, { segs: 14, rings: 8 });
  lgLimb(B, 0.27, [[0, 0.045], [0.2, 0.0465], [0.55, 0.0405], [0.85, 0.0345], [1, 0.0335]], { segs: 14, rings: 9, sx: 1.1, wr: (a, z) => z > -0.06 ? Math.sin(a * 5 - z * 80) * 0.04 : z < -0.2 ? Math.sin(a * 6 + z * 120) * 0.035 : 0 });
  // the elbow pad: a rubber cap on a padded base, strapped on
  lgMat(B, M.cord); lgSphere(B, -0.026, 0, -0.004, 0.026, 0.04, 0.042, { segs: 12, rings: 7, t0: Math.PI / 2, t1: Math.PI * 1.5 });
  lgMat(B, M.rubber); lgSphere(B, -0.04, 0, -0.004, 0.014, 0.03, 0.032, { segs: 10, rings: 6, t0: Math.PI / 2, t1: Math.PI * 1.5 });
  lgMat(B, M.camo); lgLathe(B, [[0.034, -0.273], [0.0365, -0.265], [0.0365, -0.247], [0.034, -0.241]], { segs: 14, sx: 1.08 });
  if (hi) { lgMat(B, M.web); lgBox(B, 0.03, sg * 0.0, -0.243, 0.012, 0.024, 0.008, 0.004); }
  if (s === 'L') { lgMat(B, M.poly); lgBox(B, 0.0, 0.04, -0.215, 0.019, 0.008, 0.017, 0.005); lgMat(B, M.visor); lgBox(B, 0.0, 0.0485, -0.215, 0.014, 0.0012, 0.012, 0.003); }
  if (s === 'R' && K.cls === 'engineer') { lgMat(B, M.polyHi); lgBox(B, 0.0, -0.042, -0.15, 0.026, 0.008, 0.04, 0.005); lgMat(B, M.glowSoft); lgBox(B, 0.0, -0.0505, -0.15, 0.021, 0.001, 0.034, 0.0); }
}
function lgOpHand(B, K, s) {
  // 1.9.994: a gloved hand built like a hand. A palm that widens from the wrist to an arched row of knuckles, padded
  // heel and thumb pad, a hard-knuckle guard across the back, a cuff with its strap; five fingers in three segments each,
  // tapering to rounded tips, with a ball at every joint so a bent finger stays whole; the thumb from the palm side of the
  // wrist. The palm faces +y on the right hand, -y on the left (ps); d is the back of the hand.
  const M = K.M, ps = s === 'R' ? 1 : -1, d = -ps, hi = B.lod < 2, top = B.lod === 0;
  lgBone(B, 'hand' + s);
  // the cuff over the wrist and its strap
  lgMat(B, M.gback); lgLathe(B, [[0.0305, 0.018], [0.0335, 0.012], [0.0338, 0.0], [0.0318, -0.012]], { segs: 14, sx: 1.04, sy: 0.74 });
  if (hi) { lgMat(B, M.knuckle); lgBox(B, 0.002, d * 0.0245, 0.004, 0.021, 0.0028, 0.0085, 0.002); lgMat(B, M.poly); lgBox(B, 0.019, d * 0.0262, 0.004, 0.0035, 0.0012, 0.006, 0.0008); }
  // the palm: an oval slab from the wrist to the knuckles, the back of the hand a little domed
  lgMat(B, M.gback); lgLimb(B, 0.084, [[0, 0.03], [0.45, 0.036], [0.85, 0.04], [1, 0.039]], { z0: -0.006, sx: 1.06, sy: 0.42, oy: d * 0.002, segs: 14, rings: 6, capA: false, capK: 0.32 });
  // the palm's leather: the heel of the hand, the pad under the little finger, the thumb's pad
  lgMat(B, M.palm);
  lgSphere(B, -0.004, ps * 0.009, -0.03, 0.03, 0.009, 0.024, { segs: 12, rings: 6 });
  lgSphere(B, -0.024, ps * 0.008, -0.052, 0.013, 0.009, 0.03, { segs: 10, rings: 6 });
  lgSphere(B, 0.021, ps * 0.011, -0.036, 0.016, 0.012, 0.025, { segs: 12, rings: 6 });
  lgBox(B, 0.002, ps * 0.0108, -0.079, 0.032, 0.0025, 0.0105, 0.0022);
  // the hard knuckle guard across the back, and the plate over the back of the hand
  lgMat(B, M.knuckle);
  lgBox(B, 0.001, d * 0.0165, -0.084, 0.035, 0.005, 0.0115, 0.0045);
  if (hi) { for (const [f, x, z] of LG_FINGERS) lgBox(B, x, d * 0.0208, -z + 0.006, 0.0072, 0.0022, 0.006, 0.002); }
  lgBox(B, 0.0, d * 0.0142, -0.046, 0.028, 0.0035, 0.022, 0.004);
  if (top) { lgMat(B, M.poly); for (const z of [-0.034, -0.058]) lgBox(B, 0.0, d * 0.0179, z, 0.022, 0.0006, 0.0012, 0); }
  // the fingers: three segments each, a ball at each joint, a pad on the back of the first segment, a grippy tip
  const R0 = { idx: [0.0094, 0.0088, 0.0083, 0.0077, 0.0069], fin: [0.0097, 0.0091, 0.0086, 0.008, 0.0071], rng: [0.0093, 0.0087, 0.0081, 0.0075, 0.0067], pnk: [0.0081, 0.0076, 0.0071, 0.0066, 0.006] };
  for (const [f, x, z, l2, l3] of LG_FINGERS) {
    const r = R0[f], l1 = l2, segs = 10, rings = 3;
    lgBone(B, f + s); lgMat(B, M.gback);
    lgSphere(B, 0, 0, 0, r[0] * 1.08, r[0] * 1.04, r[0] * 1.06, { segs: segs, rings: 5 });
    lgLimb(B, l1, [[0, r[0]], [1, r[1]]], { segs: segs, rings: rings, capA: false, capE: false, sy: 0.94 });
    if (hi) { lgMat(B, M.knuckle); lgBox(B, 0, d * r[0] * 0.82, -l1 * 0.5, r[0] * 0.72, 0.0022, l1 * 0.3, 0.002); }
    lgBone(B, f + '2' + s); lgMat(B, M.gback);
    lgSphere(B, 0, 0, 0, r[1] * 1.06, r[1] * 1.02, r[1] * 1.04, { segs: segs, rings: 5 });
    lgLimb(B, l3, [[0, r[2]], [1, r[3]]], { segs: segs, rings: rings, capA: false, capE: false, sy: 0.94 });
    lgBone(B, f + '3' + s); lgMat(B, M.gback);
    lgSphere(B, 0, 0, 0, r[3] * 1.05, r[3] * 1.01, r[3] * 1.03, { segs: segs, rings: 5 });
    lgMat(B, M.palm); lgLimb(B, l3 * 0.74, [[0, r[3]], [1, r[4]]], { segs: segs, rings: rings, capA: false, capK: 1.0, sy: 0.9 });
  }
  // the thumb: its metacarpal inside the thumb pad, then two segments
  lgBone(B, 'thb' + s); lgMat(B, M.gback);
  lgSphere(B, 0, 0, 0, 0.0128, 0.012, 0.013, { segs: 10, rings: 5 });
  lgLimb(B, 0.04, [[0, 0.0128], [1, 0.0112]], { segs: 10, rings: 4, capA: false, capE: false, sx: 1.05, sy: 0.92 });
  // the web between the thumb and the palm, which moves with the thumb so a thumb swung out never looks like a stick
  lgMat(B, M.palm); lgSphere(B, -0.011, ps * 0.002, -0.02, 0.017, 0.0095, 0.025, { segs: 12, rings: 6 });
  lgBone(B, 'thb2' + s); lgMat(B, M.gback);
  lgSphere(B, 0, 0, 0, 0.0114, 0.011, 0.0112, { segs: 10, rings: 5 });
  lgLimb(B, 0.031, [[0, 0.0106], [1, 0.0098]], { segs: 10, rings: 3, capA: false, capE: false, sy: 0.92 });
  if (hi) { lgMat(B, M.knuckle); lgBox(B, 0, d * 0.0092, -0.015, 0.0075, 0.0022, 0.009, 0.002); }
  lgBone(B, 'thb3' + s); lgMat(B, M.gback);
  lgSphere(B, 0, 0, 0, 0.0099, 0.0096, 0.0098, { segs: 10, rings: 5 });
  lgMat(B, M.palm); lgLimb(B, 0.025, [[0, 0.0095], [1, 0.0082]], { segs: 10, rings: 3, capA: false, capK: 1.0, sy: 0.9 });
}
function lgOpLeg(B, K, s) {
  const M = K.M, sg = s === 'L' ? 1 : -1, hi = B.lod < 2, top = B.lod === 0;
  lgBone(B, 'thigh' + s); lgMat(B, M.camo);
  lgLimb(B, 0.43, [[0, 0.091], [0.15, 0.088], [0.5, 0.076], [0.86, 0.063], [1, 0.059]], { segs: 18, rings: 10, sx: 1.04, wr: (a, z) => Math.sin(a * 4 + z * 30) * 0.012 + (z < -0.36 ? Math.sin(a * 6 + z * 100) * 0.03 : 0) });
  lgBox(B, 0.0, sg * 0.072, -0.2, 0.046, 0.014, 0.056, 0.01);
  lgBox(B, 0.0, sg * 0.075, -0.142, 0.048, 0.016, 0.013, 0.006);
  if (hi) { lgMat(B, M.poly); lgSphere(B, 0.0, sg * 0.0915, -0.15, 0.005, 0.003, 0.005, { segs: 6, rings: 4 }); }
  lgBone(B, 'shin' + s);
  // knee pad: rubber cap on a padded base, two straps
  lgMat(B, M.cord); lgSphere(B, 0.04, 0, -0.02, 0.034, 0.064, 0.072, { segs: 14, rings: 9, t0: -Math.PI / 2, t1: Math.PI / 2 });
  lgMat(B, M.rubber); lgSphere(B, 0.056, 0, -0.018, 0.026, 0.05, 0.056, { segs: 14, rings: 9, t0: -Math.PI / 2, t1: Math.PI / 2 });
  if (hi) { lgMat(B, M.web); for (const z of [-0.065, 0.03]) lgLathe(B, [[0.064, z - 0.008], [0.066, z - 0.006], [0.066, z + 0.006], [0.064, z + 0.008]], { segs: 14, sx: 1.05 }); }
  lgMat(B, M.camo);
  lgLimb(B, 0.42, [[0, 0.062], [0.22, 0.063], [0.6, 0.051], [0.78, 0.054], [0.9, 0.06], [1, 0.057]], { segs: 16, rings: 10, wr: (a, z) => z < -0.27 ? Math.sin(a * 7 + z * 140) * 0.06 : Math.sin(a * 3 + z * 30) * 0.01 });
  // boot shaft, laces and hooks
  lgMat(B, M.boot); lgLathe(B, [[0.051, -0.425], [0.055, -0.405], [0.057, -0.33], [0.055, -0.305], [0.05, -0.3]], { segs: 16, sx: 1.06 });
  if (hi) { lgMat(B, M.web); for (let i = 0; i < 5; i++) { const z = -0.315 - i * 0.02; lgBox(B, 0.057, 0, z, 0.003, 0.02, 0.002, 0.001); } }
  if (top) { lgMat(B, M.metal); for (let i = 0; i < 4; i++) for (const y of [0.022, -0.022]) lgSphere(B, 0.054, y, -0.315 - i * 0.025, 0.003, 0.003, 0.003, { segs: 5, rings: 3 }); }
  lgBone(B, 'foot' + s);
  lgMat(B, M.boot); lgBox(B, 0.028, 0, -0.038, 0.094, 0.047, 0.042, 0.03);
  lgMat(B, M.bootNy); lgBox(B, 0.0, 0, -0.012, 0.06, 0.05, 0.025, 0.02);
  lgMat(B, M.sole); lgBox(B, -0.048, 0, -0.072, 0.042, 0.046, 0.013, 0.006); lgBox(B, 0.035, 0, -0.078, 0.1, 0.05, 0.007, 0.004);
  lgMat(B, M.boot); lgLathe(B, [[0.049, -0.01], [0.052, 0.0], [0.051, 0.03], [0.048, 0.04]], { segs: 14, sx: 1.08, ox: -0.01 });
  if (hi) { lgMat(B, M.web); for (let i = 0; i < 3; i++) lgBox(B, 0.065 + i * 0.02, 0, -0.002 + i * -0.006, 0.003, 0.02, 0.002, 0.001); }
  lgBone(B, 'toe' + s);
  lgMat(B, M.boot); lgBox(B, 0.042, 0, 0.0, 0.05, 0.046, 0.028, 0.026);
  lgMat(B, M.sole); lgBox(B, 0.044, 0, -0.022, 0.054, 0.049, 0.007, 0.006); lgBox(B, 0.068, 0, -0.012, 0.032, 0.05, 0.012, 0.011);
}
// the pistol: polymer frame, steel slide, optic, threaded barrel, weapon light, magazine
function lgOpPistol(B, K) {
  const M = K.M, hi = B.lod < 2, top = B.lod === 0;
  lgBone(B, 'slide'); lgMat(B, M.metal);
  lgSide(B, [[0.0, -0.01], [0.19, -0.01], [0.192, -0.006], [0.192, 0.01], [0.185, 0.0168], [0.006, 0.0168], [0.0, 0.012]], 0.0262, { bev: 0.0022 });
  if (hi) {
    lgMat(B, M.visor); lgBox(B, 0.088, -0.0132, 0.006, 0.019, 0.0006, 0.0058, 0.001);
    lgMat(B, M.poly); for (let i = 0; i < (top ? 8 : 4); i++) for (const y of [0.0133, -0.0133]) lgBox(B, 0.012 + i * (top ? 0.0042 : 0.008), y, 0.004, 0.0011, 0.0004, 0.0095, 0);
    lgMat(B, M.metal); lgBox(B, 0.185, 0, 0.0195, 0.003, 0.0018, 0.003, 0.001); lgBox(B, 0.012, 0, 0.0195, 0.004, 0.006, 0.003, 0.001);
    // the optic: plate, housing, glass, and the dot
    lgMat(B, M.metal); lgBox(B, 0.05, 0, 0.0195, 0.022, 0.0125, 0.003, 0.0015);
    lgBox(B, 0.03, 0, 0.032, 0.003, 0.0125, 0.011, 0.002); lgBox(B, 0.068, 0, 0.034, 0.004, 0.0135, 0.013, 0.003);
    lgBox(B, 0.049, 0.0118, 0.033, 0.019, 0.0009, 0.011, 0.0006); lgBox(B, 0.049, -0.0118, 0.033, 0.019, 0.0009, 0.011, 0.0006);
    lgMat(B, M.lens); lgBox(B, 0.066, 0, 0.034, 0.0008, 0.011, 0.011, 0);
    lgMat(B, M.glow); lgSphere(B, 0.0655, 0, 0.035, 0.0012, 0.0012, 0.0012, { segs: 5, rings: 3 });
  }
  lgBone(B, 'pistol');
  lgMat(B, M.steel); lgPush(B, lgTR(0.19, 0, 0, 0, Math.PI / 2, 0)); lgLimb(B, 0.025, [[0, 0.0072], [1, 0.0072]], { up: true, segs: 10, wr: top ? (a, z) => Math.sin(z * 2500) * 0.08 : null }); lgPop(B);
  lgMat(B, M.poly);
  lgSide(B, [[0.055, -0.024], [0.188, -0.024], [0.19, -0.01], [0.055, -0.01]], 0.0245, { bev: 0.002 });
  lgSide(B, [[0.035, -0.024], [0.06, -0.024], [0.044, -0.055], [0.034, -0.08], [0.024, -0.124], [-0.012, -0.129], [-0.028, -0.03], [-0.036, -0.014], [0.0, -0.01]], 0.03, { bev: 0.0045, smooth: 0.5 });
  lgTube(B, [[0.06, 0, -0.024], [0.084, 0, -0.03], [0.088, 0, -0.045], [0.074, 0, -0.053], [0.05, 0, -0.051], [0.042, 0, -0.046]], 0.0028, { segs: 5, flat: 2.4, up: [0, 1, 0] });
  lgMat(B, M.metal); lgTube(B, [[0.062, 0, -0.026], [0.066, 0, -0.035], [0.064, 0, -0.045]], 0.0028, { segs: 4, flat: 0.6, up: [0, 1, 0] });
  if (hi) { lgMat(B, M.metal); lgBox(B, 0.04, 0.0128, -0.006, 0.012, 0.0012, 0.0025, 0.001); lgBox(B, 0.075, 0.0128, -0.016, 0.004, 0.0012, 0.003, 0.001); }
  // weapon light under the rail
  lgMat(B, M.metal); lgBox(B, 0.148, 0, -0.035, 0.034, 0.0135, 0.012, 0.005);
  lgPush(B, lgTR(0.182, 0, -0.035, 0, Math.PI / 2, 0)); lgLimb(B, 0.006, [[0, 0.012], [1, 0.012]], { up: true, segs: 12, capE: false }); lgMat(B, M.lens); lgSphere(B, 0, 0, 0.007, 0.0105, 0.0105, 0.002, { segs: 10, rings: 3 }); lgPop(B);
  lgBone(B, 'mag'); lgMat(B, M.poly);
  lgSide(B, [[0.02, -0.03], [0.034, -0.03], [0.02, -0.126], [-0.006, -0.128]], 0.022, { bev: 0.002 });
  lgBox(B, 0.004, 0, -0.134, 0.021, 0.0165, 0.007, 0.003);
}
function lgOpKnife(B, K) {
  const M = K.M;
  lgBone(B, 'knife');
  lgMat(B, M.metal); lgSide(B, [[0.0, -0.012], [0.12, -0.012], [0.152, 0.0], [0.135, 0.008], [0.1, 0.0138], [0.0, 0.0138]], 0.0045, { bev: 0.0012 });
  lgMat(B, M.steel); lgSide(B, [[0.006, -0.0122], [0.12, -0.0122], [0.1505, -0.0004], [0.148, 0.0016], [0.118, -0.0088], [0.006, -0.0088]], 0.0056, { bev: 0.0008 });
  lgMat(B, M.metal); lgBox(B, -0.002, 0, 0.0, 0.003, 0.0085, 0.019, 0.0012);
  lgMat(B, M.poly); lgSide(B, [[-0.112, -0.0115], [0.0, -0.0128], [0.0, 0.0128], [-0.112, 0.0118], [-0.12, 0.0]], 0.019, { bev: 0.0038, smooth: 0.6 });
}
function lgOpCarbine(B, K) {
  // 1.9.994: the generic carbine (the cinematics, the studio) is the rebuilt M4 (leggun.js), so every hand fits it the same
  lgGunM4(B, K);
}

/* ---------- the dead: actors for the cinematics ---------- */
// built from a roster entry (skin, clothes, hair) on the same skeleton; torn hems, stains, a dead face
LG_MAKERS.zombie = function (B, key) {
  const d = (typeof ZR_DEFS !== 'undefined' && ZR_DEFS.find(z => z.key === key)) || { skin: '#8e9a85', cloth: '#d8d4c8', cloth2: '#2b2e36', acc: '#7d1f2a', hair: 'short', hairCol: '#3a3029', top: 'shirt', bottom: 'slacks', tie: 1 };
  const hi = B.lod < 2;
  const M = {
    skin: lgMtl({ c: d.skin, t: LT.skin, r: 0.48, w: 0.5, n: 0.5, k: 0.09 }),
    top: lgMtl({ c: d.cloth, t: LT.twill, r: 0.86, w: 1, n: 0.6, k: 0.07 }),
    bot: lgMtl({ c: d.cloth2, t: LT.twill, r: 0.86, w: 1, n: 0.6, k: 0.07 }),
    acc: lgMtl({ c: d.acc || '#5a1a1a', t: LT.rip, r: 0.7, w: 0.8, k: 0.04 }),
    hair: lgMtl({ c: d.hairCol || '#2a221c', t: LT.knit, r: 0.75, w: 0.6, n: 1.2, k: 0.02 }),
    shoe: lgMtl({ c: '#1d1a17', t: LT.leather, r: 0.5, w: 0.4, k: 0.06 }),
    blood: lgMtl({ c: '#3a0d0b', r: 0.25, w: 0.1 }),
    face: lgMtl({ c: d.skin, t: LT.face, r: 0.5, w: 0.3, k: 1, s: 4, n: 0.3 }),
    eye: lgMtl({ c: d.eye || '#f2e2a0', e: 1.6, r: 0.3 }),
    white: lgMtl({ c: '#ece8df', t: LT.twill, r: 0.85, w: 1, k: 0.07 }),
    button: lgMtl({ c: '#2a2a2a', r: 0.4 })
  };
  const torn = (a, z, base) => (Math.abs(Math.sin(a * 7.3 + base) * Math.sin(a * 3.1)) > 0.55 ? -0.25 : 0);
  lgBone(B, 'pelvis'); lgMat(B, M.bot); lgLathe(B, [[0.03, -0.17], [0.09, -0.155], [0.14, -0.11], [0.155, -0.05], [0.152, 0.03], [0.146, 0.08]], { segs: 18, sx: 0.72 });
  lgMat(B, M.shoe); lgLathe(B, [[0.15, 0.04], [0.153, 0.045], [0.153, 0.068], [0.149, 0.072]], { segs: 18, sx: 0.73 });
  lgBone(B, 'spine'); lgMat(B, d.top === 'chef' ? M.white : M.top); lgLathe(B, [[0.15, -0.05], [0.142, 0.05], [0.146, 0.13], [0.152, 0.21]], { segs: 18, sx: 0.72, wr: (a, z) => z < 0 ? torn(a, z, 1) * 0.1 : 0 });
  lgBone(B, 'chest'); lgMat(B, d.top === 'chef' ? M.white : M.top);
  lgLathe(B, [[0.152, -0.04], [0.158, 0.06], [0.165, 0.14], [0.158, 0.19], [0.13, 0.226], [0.08, 0.25], [0.056, 0.268]], { segs: 18, sx: 0.66 });
  for (const s of [1, -1]) lgSphere(B, -0.012, s * 0.16, 0.18, 0.062, 0.06, 0.058, { segs: 12, rings: 8 });
  if (d.top === 'chef' && hi) { lgMat(B, M.button); for (let i = 0; i < 4; i++) for (const y of [0.04, -0.04]) lgSphere(B, 0.113, y, 0.02 + i * 0.05, 0.006, 0.006, 0.006, { segs: 6, rings: 4 }); }
  if (d.tie || d.top === 'suit') { lgMat(B, M.acc); lgPush(B, LG_FACE); lgExtrude(B, [[0, 0.24], [0.016, 0.22], [0.012, 0.0], [0, -0.03], [-0.012, 0.0], [-0.016, 0.22]], 0.108, 0.116, { bev: 0.002 }); lgPop(B); }
  if (hi) { lgMat(B, M.blood); lgSphere(B, 0.105, -0.05, 0.12, 0.012, 0.045, 0.06, { segs: 10, rings: 6 }); lgSphere(B, 0.1, 0.06, 0.02, 0.012, 0.03, 0.035, { segs: 8, rings: 5 }); }
  lgBone(B, 'neck'); lgMat(B, M.skin); lgLathe(B, [[0.05, -0.03], [0.048, 0.03], [0.047, 0.08], [0.05, 0.12]], { segs: 12 });
  lgBone(B, 'head'); lgMat(B, M.skin);
  lgSphere(B, 0.012, 0, 0.09, 0.098, 0.078, 0.115, { segs: 18, rings: 12 });
  lgSphere(B, 0.052, 0, 0.0, 0.06, 0.058, 0.048, { segs: 14, rings: 9 });
  lgSphere(B, 0.103, 0, 0.074, 0.02, 0.013, 0.022, { segs: 8, rings: 6 });
  for (const s of [1, -1]) lgSphere(B, -0.005, s * 0.078, 0.085, 0.014, 0.008, 0.024, { segs: 8, rings: 6 });
  lgMat(B, M.face); { const E = [0.012, 0, 0.09, 0.098, 0.078, 0.115]; B.def = lgOnEll(E, 0.002); lgDecal(B, [0.1, 0, 0.05], [0, -0.07, 0], [0, 0, 0.075], [0.505, 0.005, 0.995, 0.495], { sub: 8, lift: 0 }); B.def = null; }
  lgMat(B, M.eye); for (const s of [1, -1]) lgSphere(B, 0.098, s * 0.03, 0.098, 0.006, 0.008, 0.005, { segs: 6, rings: 4 });
  lgMat(B, M.hair);
  if (d.hair !== 'none' && d.hair !== 'shaved') lgSphere(B, 0.0, 0, 0.12, 0.102, 0.083, 0.09, { segs: 18, rings: 8, p0: d.hair === 'balding' ? -0.2 : 0.1, wr: (th, ph) => Math.sin(th * 13 + ph * 9) * 0.03 + (d.hair === 'balding' && ph > 0.9 ? -0.2 : 0) });
  if (d.top === 'chef') { lgMat(B, M.white); lgLathe(B, [[0.09, 0.17], [0.095, 0.2], [0.11, 0.26], [0.1, 0.29], [0.0, 0.3]], { segs: 16, sx: 1.05, ox: 0.005 }); }
  for (const s of ['L', 'R']) {
    const sg = s === 'L' ? 1 : -1;
    lgBone(B, 'arm' + s); lgMat(B, d.top === 'chef' ? M.white : M.top); lgLimb(B, 0.28, [[0, 0.055], [0.3, 0.05], [1, 0.042]], { segs: 12, rings: 7, wr: (a, z) => z < -0.22 ? torn(a, z, sg * 2) * 0.12 : 0 });
    lgBone(B, 'fore' + s); lgMat(B, M.skin); lgLimb(B, 0.27, [[0, 0.04], [0.3, 0.04], [1, 0.03]], { segs: 10, rings: 7 });
    if (hi && s === 'L') { lgMat(B, M.blood); lgSphere(B, 0.03, 0.02, -0.12, 0.012, 0.02, 0.03, { segs: 8, rings: 5 }); }
    lgBone(B, 'hand' + s); lgMat(B, M.skin); lgBox(B, 0, 0, -0.048, 0.038, 0.014, 0.048, 0.012);
    for (const f of ['idx', 'fin', 'thb']) { lgBone(B, f + s); const xo = f === 'fin' ? [0.002, -0.016, -0.031] : [0]; for (const x of xo) lgLimb(B, f === 'thb' ? 0.04 : 0.042, [[0, 0.0095], [1, 0.0085]], { ox: x, segs: 6, rings: 3 }); lgBone(B, f + '2' + s); for (const x of xo) lgLimb(B, 0.036, [[0, 0.0085], [1, 0.006]], { ox: x, segs: 6, rings: 3 }); }
    lgBone(B, 'thigh' + s); lgMat(B, M.bot); lgLimb(B, 0.43, [[0, 0.085], [0.5, 0.07], [1, 0.054]], { segs: 14, rings: 8, wr: (a, z) => Math.sin(a * 4 + z * 30) * 0.015 });
    lgBone(B, 'shin' + s); lgLimb(B, 0.42, [[0, 0.057], [0.6, 0.048], [1, 0.05]], { segs: 12, rings: 8, wr: (a, z) => z < -0.36 ? torn(a, z, sg) * 0.15 : 0 });
    lgBone(B, 'foot' + s); lgMat(B, M.shoe); lgBox(B, 0.03, 0, -0.045, 0.09, 0.043, 0.035, 0.026);
    lgBone(B, 'toe' + s); lgBox(B, 0.04, 0, -0.008, 0.048, 0.042, 0.022, 0.02);
  }
};
