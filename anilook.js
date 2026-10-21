/* ================= the look of the 2.0 zombies: drawing a posed body =================
   The animation engine hands over a pose; this turns it into a skeleton and draws it seen from above, in the zombie's
   own frame (x forward, y to its right, units of its radius): a contact shadow, legs and shoes, hips, torso and belly
   in its clothes (collars, ties, vests, patterns, armour, aprons, harnesses, tanks), arms in their sleeves, hands or
   claws and whatever they hold, the neck and head with its hair or headgear and a face that shows when it is turned
   up to you (glowing eyes, a jaw that opens), and what the infection did (bones, burns, boils, fungus, frost, stitches,
   glowing veins, embers, flies, sparks). Big parts are shaded by the light that falls on the zombie (its colour too),
   limbs get a lit edge, and a rim of light catches the side facing a lamp. Things higher up are drawn a little bigger. */
const LK_TOP = {
  shirt: { sl: 2, collar: 1 }, tank: { sl: 0, straps: 1 }, uniform: { sl: 1, collar: 1, pocket: 1 }, cardigan: { sl: 2, open: 1 }, hawaii: { sl: 1, pat: 'floral', collar: 1 },
  vest: { sl: 1, hivis: 1 }, scrubs: { sl: 1, vneck: 1 }, chef: { sl: 2, dbl: 1 }, suit: { sl: 2, lapel: 1 }, plaid: { sl: 2, pat: 'plaid' }, coverall: { sl: 2, zip: 1 },
  police: { sl: 1, collar: 1, epaul: 1, badge: 1 }, medic: { sl: 2, refl: 1 }, jumpsuit: { sl: 1, zip: 1 }, studs: { sl: 0, pat: 'studs', vestover: 1 }, rags: { sl: 1, torn: 1 },
  leather: { sl: 2, zip: 1, collar: 1, pat: 'studs' }, gown: { sl: 1, gownback: 1 }, clown: { sl: 2, pat: 'dots' }, hazmat: { sl: 2, suit: 1 }, hunter: { sl: 2, pat: 'camo', orange: 1 },
  wetsuit: { sl: 2, wet: 1 }, ski: { sl: 2, two: 1, puffy: 1 }, camo: { sl: 2, pat: 'camo' }, dress: { sl: 0, straps: 1, lace: 1 }, labcoat: { sl: 2, open: 1, coat: 1 },
  work: { sl: 2, collar: 1 }, riot: { sl: 2, armor: 1, puffy: 1 }, none: { sl: 0, bare: 1 }, space: { sl: 2, suit: 1, puffy: 1 }, hood: { sl: 2, hoodie: 1 }, parka: { sl: 2, puffy: 1, fur: 1 },
  wraps: { sl: 2, pat: 'wraps' }
};
const LK_BOT = {
  slacks: { len: 2 }, shorts: { len: 1 }, jeans: { len: 2 }, check: { len: 2, pat: 'check' }, overalls: { len: 2, bib: 1 }, scrubs: { len: 2, top: 1 }, coverall: { len: 2, top: 1 }, jumpsuit: { len: 2, top: 1 },
  none: { len: 0 }, baggy: { len: 2, wide: 1 }, camo: { len: 2 }, wetsuit: { len: 2, top: 1 }, skipants: { len: 2, puffy: 1 }, skirt: { len: 2, skirt: 1 }, rags: { len: 1, torn: 1 }, riot: { len: 2, top: 1 },
  pants: { len: 2 }, space: { len: 2, top: 1, puffy: 1 }, wraps: { len: 2, top: 1 }, hazmat: { len: 2, top: 1 }
};
function lkRGB(hex) { const n = parseInt(String(hex || '#777777').slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function lkSh(c, k) { return k < 0 ? [c[0] * (1 + k), c[1] * (1 + k), c[2] * (1 + k)] : [c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k]; }
function lkMix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function lkCss(c, a) { return a == null ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')' : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; }
// a set of shades of one colour: base, dark, light, outline
function lkSet(c) { return { b: lkCss(c), d: lkCss(lkSh(c, -0.3)), l: lkCss(lkSh(c, 0.22)), o: lkCss(lkSh(c, -0.62)), hl: lkCss(lkSh(c, 0.45), 0.55), rgb: c }; }
function lookBuild(m) {
  const d = m.def, F = {}; for (const f of d.feat || []) F[f] = 1;
  const T = LK_TOP[d.top] || LK_TOP.shirt, B = LK_BOT[d.bottom] || LK_BOT.slacks;
  const sk = lkRGB(d.skin), cl = lkRGB(d.cloth), c2 = lkRGB(d.cloth2), ac = lkRGB(d.acc), hr = lkRGB(d.hairCol), cp = lkRGB(d.capCol || d.acc);
  const pants = B.top ? cl : c2;
  const L = { F: F, T: T, B: B, top: d.top, bottom: d.bottom, head: d.head, hair: d.hair, hold: d.hold, tie: !!d.tie, beard: !!d.beard,
    skin: lkSet(sk), cl: lkSet(cl), c2: lkSet(c2), ac: lkSet(ac), hr: lkSet(hr), cap: lkSet(cp), pants: lkSet(pants), holdC: lkSet(lkRGB(d.holdCol || '#5a4a3a')),
    shoe: lkSet(F.flippers ? lkRGB('#1a1a1a') : F.bigshoes ? lkRGB('#c8202a') : d.top === 'space' || d.top === 'hazmat' ? lkRGB('#d8d8d0') : lkRGB('#26221e')),
    eye: d.eye, eyeRGB: lkRGB(d.eye), gore: (m.S && m.S.gore) || '#5a0d0d',
    sleeve: T.sl, bare: !!T.bare, glowSkin: d.key === 'glow', key: d.key };
  // the sleeves: covered arms take the top's colour (an undershirt for a vest or tank-over)
  L.sleeveC = T.hivis ? L.ac : L.cl;
  if (d.top === 'suit') L.shirtC = lkSet(lkRGB('#e8e6e0'));
  if (d.top === 'labcoat') L.shirtC = L.c2;
  if (d.top === 'cardigan') L.shirtC = L.ac;
  return L;
}

/* ---------- drawing ---------- */
const LKP = new Float32Array(NJ * 3);   // the skeleton projected onto the ground (x, y, scale)
let LKG = null, LKL = null, LKO = null, LKM = null, LKSEV = 0;
function lkX(i) { return LKP[i * 3]; } function lkY(i) { return LKP[i * 3 + 1]; } function lkK(i) { return LKP[i * 3 + 2]; }
function lkSeg(g, x1, y1, x2, y2, w, col, out) {
  if (out) { g.strokeStyle = out; g.lineWidth = w + 0.11; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
}
// a limb: its outline, its colour, and a lit edge on the side facing the light
function lkLimb(g, x1, y1, x2, y2, w, S, lit) {
  lkSeg(g, x1, y1, x2, y2, w, S.b, S.o);
  if (lit && LKL) {
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy); if (l < 0.05) return;
    let nx = -dy / l, ny = dx / l; if (nx * LKL.x + ny * LKL.y < 0) { nx = -nx; ny = -ny; }
    const o = w * 0.24; g.strokeStyle = S.hl; g.lineWidth = w * 0.32; g.beginPath(); g.moveTo(x1 + nx * o, y1 + ny * o); g.lineTo(x2 + nx * o, y2 + ny * o); g.stroke();
  }
}
function lkEll(g, x, y, rx, ry, rot, fill, out, ow) {
  g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (out) { g.strokeStyle = out; g.lineWidth = ow || 0.07; g.stroke(); }
}
function lkCirc(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); g.fillStyle = fill; g.fill(); }
// surface texture: the texture engine's patterns (skin mottling, cloth weave, grime), one set per canvas it draws into
const LK_PAT = new WeakMap();
function lkPat(g, kind) {
  let P = LK_PAT.get(g); if (!P) { P = {}; LK_PAT.set(g, P); }
  if (P[kind] === undefined) { try { P[kind] = typeof texelPattern === 'function' ? texelPattern(g, kind, 0.075) : null; } catch (e) { P[kind] = null; } }
  return P[kind];
}
// lays a texture over the path just filled (soft, so the colour underneath stays)
function lkTex(g, kind, a) { if (LKO.lod > 1 || !LKO.tex) return; const p = lkPat(g, kind); if (!p) return; g.save(); g.globalAlpha = a; g.globalCompositeOperation = 'overlay'; g.fillStyle = p; g.fill(); g.restore(); }
// a part lit from one side: a radial gradient whose bright spot sits toward the light
function lkShade(g, x, y, r, S, k) {
  if (!LKL || LKO.lod >= 2) return S.b;
  const lx = LKL.x, ly = LKL.y, kk = k == null ? 1 : k;
  const gr = g.createRadialGradient(x + lx * r * 0.42, y + ly * r * 0.42, r * 0.05, x, y, r * 1.15);
  gr.addColorStop(0, S.l); gr.addColorStop(0.55 - 0.15 * kk * LKL.k, S.b); gr.addColorStop(1, S.d);
  return gr;
}
// the rim of light on the side of a part facing a lamp
function lkRim(g, x, y, rx, ry, rot) {
  if (!LKL || !(LKL.rim > 0.05) || LKO.lod > 0) return;
  const a = Math.atan2(LKL.y, LKL.x) - (rot || 0);
  g.strokeStyle = 'rgba(' + LKL.c + ',' + Math.min(0.75, LKL.rim * 0.7) + ')'; g.lineWidth = 0.07;
  g.beginPath(); g.ellipse(x, y, rx * 0.97, ry * 0.97, rot || 0, a - 0.9, a + 0.9); g.stroke();
}
// a pose drawn into g (already moved to the zombie and turned to face its way, one unit per radius)
function lookDraw(g, m, pose, o) {
  const D = m.ad, L = m.al, J = ANIMA.J, P = LKP, H = D.H;
  ANIMA.sev = o.sever | 0; animaFK(D, pose, J); LKSEV = ANIMA.sev; ANIMA.sev = 0;
  for (let i = 0; i < NJ; i++) { const k = i * 3; if (i === JN.fdir || i === JN.hup) { P[k] = J[k]; P[k + 1] = J[k + 1]; P[k + 2] = J[k + 2]; continue; } const s = 1 + A_PERSP * J[k + 2] / H; P[k] = J[k] * s; P[k + 1] = J[k + 1] * s; P[k + 2] = s; }
  LKG = g; LKL = o.light || null; LKO = o; LKM = m;
  g.lineCap = 'round'; g.lineJoin = 'round';
  const fall = pose[AP.fall], dead = o.dead;
  // a soft contact shadow under whatever touches the ground
  if (!o.noShadow) {
    const cx = (lkX(JN.ftL) + lkX(JN.ftR) + lkX(JN.pel) * (fall > 0.5 ? 2 : 0)) / (fall > 0.5 ? 4 : 2), cy = (lkY(JN.ftL) + lkY(JN.ftR) + lkY(JN.pel) * (fall > 0.5 ? 2 : 0)) / (fall > 0.5 ? 4 : 2);
    const ex = fall > 0.4 ? Math.hypot(lkX(JN.head) - lkX(JN.ftL), lkY(JN.head) - lkY(JN.ftL)) * 0.55 : 1.15, ang = fall > 0.4 ? Math.atan2(lkY(JN.head) - cy, lkX(JN.head) - cx) : 0;
    const air = Math.max(0, (J[JN.pel * 3 + 2] - D.legL) / H) * 4;
    g.fillStyle = 'rgba(0,0,0,' + (0.3 - Math.min(0.2, air) ) + ')'; g.beginPath(); g.ellipse(fall > 0.4 ? (cx + lkX(JN.head)) / 2 : 0.05, fall > 0.4 ? (cy + lkY(JN.head)) / 2 : 0.04, Math.max(1, ex) * (1 + air), (fall > 0.4 ? 0.85 : 0.95) * (1 + air), ang, 0, TAU); g.fill();
  }
  if (o.burn && !dead && LKO.lod <= 1) { g.fillStyle = 'rgba(255,120,30,0.18)'; g.beginPath(); g.arc(0, 0, 1.6, 0, TAU); g.fill(); }
  // which parts are higher: legs first, then the body, the arms above or below it, the head last
  const chestZ = J[JN.chest * 3 + 2], aLz = (J[JN.elL * 3 + 2] + J[JN.haL * 3 + 2]) / 2, aRz = (J[JN.elR * 3 + 2] + J[JN.haR * 3 + 2]) / 2;
  const tailFirst = L.F.entrails || L.F.tank || L.F.pack || L.F.sacs;
  lkLeg(g, m, -1); lkLeg(g, m, 1);
  if (L.B.skirt) lkSkirt(g, m, pose);
  const armLBelow = aLz < chestZ + 0.1 * H, armRBelow = aRz < chestZ + 0.1 * H;
  if (armLBelow) lkArm(g, m, -1, pose);
  if (armRBelow) lkArm(g, m, 1, pose);
  if (L.F.entrails) lkEntrails(g, m);
  lkTorso(g, m, pose);
  if (!armLBelow) lkArm(g, m, -1, pose);
  if (!armRBelow) lkArm(g, m, 1, pose);
  if (L.hold === 'shield') lkShield(g, m, pose);
  lkHead(g, m, pose);
  if (LKO.lod <= 1 && !dead) lkFx(g, m, pose, o);
  if (o.flash > 0 && LKO.lod <= 1) {
    g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,240,220,' + Math.min(0.5, o.flash * 5) + ')';
    g.beginPath(); g.ellipse((lkX(JN.sc) + lkX(JN.pel)) / 2, (lkY(JN.sc) + lkY(JN.pel)) / 2, D.chW * 1.05, D.chW * 0.9, 0, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over';
  }
  LKG = null; LKL = null; LKO = null;
}
/* ---- legs and feet ---- */
function lkLeg(g, m, side) {
  const D = m.ad, L = m.al, hi = side < 0 ? JN.hipL : JN.hipR, ki = hi + 1, fi = hi + 2, ti = side < 0 ? JN.toeL : JN.toeR;
  const hx = lkX(hi), hy = lkY(hi), kx = lkX(ki), ky = lkY(ki), fx = lkX(fi), fy = lkY(fi), tx = lkX(ti), ty = lkY(ti);
  const w = D.leg * lkK(hi), ws = D.shin * lkK(fi), lit = LKO.lod <= 1;
  const len = L.B.len, Pc = L.pants, S = L.skin;
  if (D.legless) {
    // stumps, wrapped or raw
    lkLimb(g, hx, hy, kx, ky, w, len ? Pc : S, lit); lkCirc(g, kx, ky, w * 0.5, L.F.entrails ? '#6a1a1a' : S.d);
    return;
  }
  const thighC = len ? Pc : S, shinC = len === 2 ? Pc : S;
  const wide = L.B.wide ? 1.25 : L.B.puffy ? 1.15 : 1;
  lkLimb(g, hx, hy, kx, ky, w * wide, thighC, lit);
  lkLimb(g, kx, ky, fx, fy, ws * wide, shinC, lit);
  if (L.F.bonelegs) { lkSeg(g, kx, ky, fx + (fx - kx) * 0.2, fy + (fy - ky) * 0.2, ws * 0.35, '#d9cfb4', '#6b6150'); }
  if (L.F.pads && len) { lkCirc(g, kx, ky, ws * 0.62, '#2a2c30'); }
  if (L.F.tape) { const mx = kx + (fx - kx) * 0.8, my = ky + (fy - ky) * 0.8; lkCirc(g, mx, my, ws * 0.55, '#9aa0a6'); }
  if (L.B.torn && LKO.lod <= 1) { lkSeg(g, kx, ky, kx + (fx - kx) * 0.3, ky + (fy - ky) * 0.3, ws * 0.7, S.b); }
  // the foot or shoe
  const fl = L.F.flippers ? 1.8 : L.F.bigshoes ? 1.6 : 1, fdx = tx - fx, fdy = ty - fy;
  const ex = fx + fdx * fl, ey = fy + fdy * fl;
  const shoe = (L.top === 'none' && L.bottom === 'rags') || L.key === 'crawler' || L.key === 'ravager' || L.key === 'burnt' ? S : L.shoe;
  lkSeg(g, fx, fy, ex, ey, ws * (L.F.flippers ? 1.3 : L.F.bigshoes ? 1.35 : 0.95), shoe.b, shoe.o);
}
// the wedding dress's skirt, flowing round the legs
function lkSkirt(g, m, pose) {
  const D = m.ad, L = m.al, px = lkX(JN.pel), py = lkY(JN.pel), mx = (lkX(JN.ftL) + lkX(JN.ftR)) / 2, my = (lkY(JN.ftL) + lkY(JN.ftR)) / 2, fall = pose[AP.fall];
  const cx = px * 0.55 + mx * 0.45, cy = py * 0.55 + my * 0.45, sp = Math.hypot(lkX(JN.ftL) - lkX(JN.ftR), lkY(JN.ftL) - lkY(JN.ftR));
  const rx = D.hipW * 2.1 + sp * 0.35 + fall * 1.2, ry = D.hipW * 2.3 + sp * 0.3, ang = Math.atan2(my - py, mx - px);
  lkEll(g, cx, cy, Math.max(rx, Math.hypot(mx - px, my - py) * 0.7 + 0.6), ry, fall > 0.3 ? ang : 0, lkShade(g, cx, cy, ry, L.cl), L.cl.o, 0.06);
  if (LKO.lod <= 1) { g.strokeStyle = L.cl.d; g.lineWidth = 0.05; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(px, py); g.lineTo(cx + Math.cos(ang + i * 0.5) * rx * 0.9, cy + Math.sin(ang + i * 0.5) * ry * 0.9); g.stroke(); } }
}
/* ---- the torso ---- */
function lkTorso(g, m, pose) {
  const D = m.ad, L = m.al, T = L.T, F = L.F, lod = LKO.lod;
  const sx = lkX(JN.sc), sy = lkY(JN.sc), px = lkX(JN.pel), py = lkY(JN.pel), slx = lkX(JN.shL), sly = lkY(JN.shL), srx = lkX(JN.shR), sry = lkY(JN.shR);
  let ax = srx - slx, ay = sry - sly; const al = Math.hypot(ax, ay) || 1; ax /= al; ay /= al;
  const rot = Math.atan2(ay, ax), ks = lkK(JN.sc), kp = lkK(JN.pel), puffy = T.puffy ? 1.1 : 1;
  const chW = D.chW * ks * puffy * (al / (2 * D.shW * ks) * 0.35 + 0.65), chD = D.chD * ks * puffy;
  // what covers it
  const C = L.bare ? L.skin : T.hivis ? L.cl : L.cl;
  // hips and the waist (seen when it leans, crouches or lies down)
  const hipC = L.B.len ? L.pants : L.skin;
  if (!D.legless || true) lkEll(g, px, py, D.hipW * 1.35 * kp, D.chD * 0.85 * kp, rot, hipC.b, hipC.o);
  // the trunk between hips and shoulders
  const dx = sx - px, dy = sy - py, span = Math.hypot(dx, dy);
  if (span > 0.15) {
    g.beginPath(); g.moveTo(slx - ax * 0.1, sly - ay * 0.1); g.lineTo(srx + ax * 0.1, sry + ay * 0.1);
    g.lineTo(px + ax * D.hipW * 1.25 * kp, py + ay * D.hipW * 1.25 * kp); g.lineTo(px - ax * D.hipW * 1.25 * kp, py - ay * D.hipW * 1.25 * kp); g.closePath();
    g.fillStyle = C.b; g.fill(); g.strokeStyle = C.o; g.lineWidth = 0.06; g.stroke();
  }
  // the belly (big on the heavy, huge on the bloated)
  if (D.belly > 0.1) {
    const bx = lkX(JN.belly), by = lkY(JN.belly), br = (0.45 + D.belly * 0.55) * D.chW * lkK(JN.belly);
    const bc = F.belly && L.top === 'none' ? L.skin : C;
    lkEll(g, bx, by, br, br * 0.92, rot, lkShade(g, bx, by, br, bc), bc.o);
    if (F.boils && lod <= 1) for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4; lkCirc(g, bx + Math.cos(a) * br * 0.6, by + Math.sin(a) * br * 0.55, 0.09 + (i % 2) * 0.05, '#c8c86a'); }
  }
  // the chest and shoulders
  const cx = sx * 0.82 + px * 0.18 + (lkX(JN.chest) - sx) * 0.15, cy = sy * 0.82 + py * 0.18 + (lkY(JN.chest) - sy) * 0.15;
  lkEll(g, cx, cy, chW, chD, rot + Math.PI / 2 * 0, lkShade(g, cx, cy, chW, C), C.o, 0.07);
  lkTex(g, L.bare ? 'skin' : 'cloth', 0.45); lkTex(g, 'grime', 0.35);
  // ---- what is on it, drawn in the chest's own frame (x along the shoulders, y front to back)
  g.save(); g.translate(cx, cy); g.rotate(rot);
  // after the rotation +y points to the zombie's back for a standing body; its front is -y
  const W2 = chW, D2 = chD;
  if (T.pat && lod <= 1) lkPattern(g, T.pat, W2, D2, L);
  if (T.hivis) { g.strokeStyle = '#e8e8e8'; g.lineWidth = 0.09; for (const v of [-0.35, 0.35]) { g.beginPath(); g.moveTo(v * W2, -D2 * 0.85); g.lineTo(v * W2, D2 * 0.85); g.stroke(); } g.strokeStyle = L.ac.b; g.lineWidth = 0.05; g.beginPath(); g.moveTo(-W2 * 0.9, 0); g.lineTo(W2 * 0.9, 0); g.stroke(); }
  if (T.refl || F.stripe) { g.strokeStyle = T.refl ? '#d7e34a' : L.ac.b; g.lineWidth = 0.1; g.beginPath(); g.moveTo(-W2 * 0.95, D2 * 0.15); g.lineTo(W2 * 0.95, D2 * 0.15); g.stroke(); if (T.refl) { g.strokeStyle = '#c8c8c8'; g.lineWidth = 0.04; g.stroke(); } }
  if (T.two) { g.fillStyle = L.c2.b; g.beginPath(); g.ellipse(0, D2 * 0.45, W2 * 0.9, D2 * 0.5, 0, 0, Math.PI); g.fill(); }
  if (T.wet) { g.strokeStyle = L.ac.b; g.lineWidth = 0.07; g.beginPath(); g.ellipse(0, 0, W2 * 0.9, D2 * 0.8, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  if (T.epaul) { g.fillStyle = L.ac.d; g.fillRect(-W2 * 0.9, -0.07, 0.3, 0.14); g.fillRect(W2 * 0.9 - 0.3, -0.07, 0.3, 0.14); }
  if (T.armor || F.plates) { const pc = L.top === 'riot' ? '#2c2f36' : F.plates && L.top === 'none' ? '#cfc4a6' : '#4a5040', po = '#15171a'; for (const v of [-1, 1]) lkEll(g, v * W2 * 0.72, 0, W2 * 0.32, D2 * 0.62, 0, pc, po, 0.05); lkEll(g, 0, D2 * 0.15, W2 * 0.42, D2 * 0.7, 0, pc, po, 0.05); }
  if (F.vest && L.top === 'police') { g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.06; g.beginPath(); g.ellipse(0, 0, W2 * 0.8, D2 * 0.78, 0, 0, TAU); g.stroke(); }
  if (T.open) { const sc2 = L.shirtC || L.c2; g.fillStyle = sc2.b; g.beginPath(); g.moveTo(-0.12, -D2 * 0.98); g.lineTo(0.12, -D2 * 0.98); g.lineTo(0.18, D2 * 0.1); g.lineTo(-0.18, D2 * 0.1); g.closePath(); g.fill(); }
  if (T.lapel) { const sc2 = L.shirtC; g.fillStyle = sc2.b; g.beginPath(); g.moveTo(-0.2, -D2 * 0.95); g.lineTo(0.2, -D2 * 0.95); g.lineTo(0, -D2 * 0.3); g.closePath(); g.fill(); g.strokeStyle = L.cl.o; g.lineWidth = 0.04; g.stroke(); }
  if (L.tie) { g.fillStyle = L.ac.b; g.beginPath(); g.moveTo(-0.07, -D2 * 0.9); g.lineTo(0.07, -D2 * 0.9); g.lineTo(0.05, -D2 * 0.35); g.lineTo(0, -D2 * 0.25); g.lineTo(-0.05, -D2 * 0.35); g.closePath(); g.fill(); }
  if (T.dbl && lod <= 1) { g.fillStyle = L.cl.d; for (const v of [-0.22, 0.22]) for (const w of [-0.55, -0.15]) lkCirc(g, v, w * D2, 0.04, L.cl.d); }
  if (T.zip) { g.strokeStyle = L.cl.d; g.lineWidth = 0.04; g.beginPath(); g.moveTo(0, -D2); g.lineTo(0, -D2 * 0.2); g.stroke(); }
  if (T.straps) { g.strokeStyle = L.top === 'dress' ? L.cl.d : L.cl.b; g.lineWidth = 0.1; for (const v of [-0.42, 0.42]) { g.beginPath(); g.moveTo(v * W2, -D2 * 0.75); g.lineTo(v * W2, D2 * 0.75); g.stroke(); } }
  if (T.hoodie || L.head === 'hood') { lkEll(g, 0, D2 * 0.75, W2 * 0.5, D2 * 0.4, 0, L.cl.d, null); }
  if (T.fur) { g.strokeStyle = '#d8cdb8'; g.lineWidth = 0.18; g.beginPath(); g.ellipse(0, D2 * 0.05, W2 * 0.42, D2 * 0.62, 0, 0, TAU); g.stroke(); }
  if (T.gownback && lod <= 1) { g.strokeStyle = L.cl.d; g.lineWidth = 0.04; g.beginPath(); g.moveTo(0, D2 * 0.1); g.lineTo(0, D2); g.stroke(); for (const w of [0.35, 0.7]) { g.beginPath(); g.moveTo(-0.1, w * D2); g.lineTo(0.1, w * D2); g.stroke(); } }
  if (T.suit && lod <= 1) { g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(-W2 * 0.7, -0.05, W2 * 1.4, 0.1); }
  if (T.torn && lod <= 1) { g.fillStyle = L.skin.b; for (let i = 0; i < 4; i++) { const a = i * 1.7 + 0.5; lkEll(g, Math.cos(a) * W2 * 0.55, Math.sin(a) * D2 * 0.5, 0.14, 0.08, a, L.skin.b); } }
  if (L.bare && lod <= 1) {
    // a bare torso: collarbones and, on the starved, ribs
    g.strokeStyle = L.skin.d; g.lineWidth = 0.04; g.beginPath(); g.moveTo(-W2 * 0.55, -D2 * 0.55); g.quadraticCurveTo(0, -D2 * 0.3, W2 * 0.55, -D2 * 0.55); g.stroke();
    if (F.ribs) { for (let i = 0; i < 4; i++) { const w = -D2 * 0.2 + i * D2 * 0.22; g.beginPath(); g.moveTo(-W2 * 0.6, w); g.quadraticCurveTo(0, w - 0.1, W2 * 0.6, w); g.stroke(); } }
  }
  if (F.badge) { lkSeg(g, -0.12, -D2 * 0.8, 0.02, -D2 * 0.1, 0.03, '#2a2a6a'); g.fillStyle = '#e8e8e0'; g.fillRect(-0.06, -D2 * 0.15, 0.16, 0.2); }
  if (T.badge) { g.fillStyle = '#d8b64a'; g.beginPath(); g.moveTo(-W2 * 0.45, -D2 * 0.55); g.lineTo(-W2 * 0.35, -D2 * 0.7); g.lineTo(-W2 * 0.25, -D2 * 0.55); g.lineTo(-W2 * 0.35, -D2 * 0.4); g.closePath(); g.fill(); }
  if (F.pearls) { g.fillStyle = '#efe8d8'; for (let i = -3; i <= 3; i++) lkCirc(g, i * 0.07, -D2 * 0.72 + Math.abs(i) * -0.02, 0.035, '#efe8d8'); }
  if (F.apron || F.butcherapron) { g.fillStyle = F.butcherapron ? '#ece4d8' : '#f2efe8'; g.beginPath(); g.moveTo(-W2 * 0.45, -D2 * 0.95); g.lineTo(W2 * 0.45, -D2 * 0.95); g.lineTo(W2 * 0.5, -D2 * 0.2); g.lineTo(-W2 * 0.5, -D2 * 0.2); g.closePath(); g.fill(); g.strokeStyle = '#8a8478'; g.lineWidth = 0.03; g.stroke(); if (F.butcherapron) { g.fillStyle = 'rgba(110,12,14,0.6)'; lkEll(g, 0.1, -D2 * 0.55, 0.18, 0.1, 0.4, 'rgba(110,12,14,0.6)'); } }
  if (F.harness || F.straps) { g.strokeStyle = F.harness ? '#3a3a3a' : '#4a4a38'; g.lineWidth = 0.07; g.beginPath(); g.moveTo(-W2 * 0.6, -D2 * 0.8); g.lineTo(W2 * 0.5, D2 * 0.8); g.moveTo(W2 * 0.6, -D2 * 0.8); g.lineTo(-W2 * 0.5, D2 * 0.8); g.stroke(); }
  if (F.belt) { g.strokeStyle = '#1a1a1a'; g.lineWidth = 0.1; g.beginPath(); g.ellipse(0, 0, W2 * 0.92, D2 * 0.9, 0, 0.1, Math.PI - 0.1); g.stroke(); }
  if (F.chains && lod <= 1) { g.strokeStyle = '#8a8f94'; g.lineWidth = 0.035; g.setLineDash([0.06, 0.04]); g.beginPath(); g.moveTo(-W2 * 0.8, -D2 * 0.3); g.quadraticCurveTo(0, D2 * 0.6, W2 * 0.8, -D2 * 0.3); g.stroke(); g.setLineDash([]); }
  if (F.spikes) { g.fillStyle = '#c8ccd0'; for (const v of [-1, 1]) for (let i = 0; i < 3; i++) { const bx = v * W2 * (0.6 + i * 0.12), by = -D2 * 0.1 + i * 0.12; g.beginPath(); g.moveTo(bx - 0.05, by); g.lineTo(bx + v * 0.16, by - 0.04); g.lineTo(bx - 0.05, by + 0.08); g.closePath(); g.fill(); } }
  if (F.ruff) { g.fillStyle = '#f2f2ee'; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; lkCirc(g, Math.cos(a) * 0.3, Math.sin(a) * 0.24 - D2 * 0.15, 0.1, '#f2f2ee'); } }
  if (F.tank || F.pack) { const tc = F.pack ? '#d8d8d0' : L.key === 'diver' ? '#c8c020' : L.key === 'hazmat' ? '#5a6a64' : '#6a6a5a'; if (F.pack) { g.fillStyle = tc; g.fillRect(-W2 * 0.7, D2 * 0.35, W2 * 1.4, D2 * 0.75); g.strokeStyle = '#7a7a72'; g.lineWidth = 0.04; g.strokeRect(-W2 * 0.7, D2 * 0.35, W2 * 1.4, D2 * 0.75); } else { for (const v of L.key === 'diver' ? [-0.2, 0.2] : [0]) lkEll(g, v * W2 + (L.key === 'diver' ? 0 : 0), D2 * 0.7, 0.2, D2 * 0.42, 0, tc, '#1a1a1a', 0.04); } }
  if (F.sacs) { for (let i = 0; i < 5; i++) { const a = i * 1.25; lkEll(g, Math.cos(a) * W2 * 0.45, D2 * 0.3 + Math.sin(a) * D2 * 0.4, 0.2 + (i % 2) * 0.06, 0.16, a, '#b08a7a', '#5a3a30', 0.04); lkCirc(g, Math.cos(a) * W2 * 0.45, D2 * 0.3 + Math.sin(a) * D2 * 0.4, 0.07, 'rgba(255,224,138,0.5)'); } }
  if (F.mushrooms && lod <= 1) { for (let i = 0; i < 4; i++) { const a = i * 1.6 + 0.3; lkEll(g, Math.cos(a) * W2 * 0.6, Math.sin(a) * D2 * 0.6 + 0.1, 0.16, 0.12, a, '#c98b4a', '#6a4320', 0.03); } }
  if (F.flag && lod <= 1) { g.fillStyle = '#2a4a8a'; g.fillRect(-W2 * 0.95, -0.08, 0.18, 0.14); g.fillStyle = '#c23b2e'; g.fillRect(-W2 * 0.95, 0.02, 0.18, 0.04); }
  if (F.trefoil && lod <= 1) { g.fillStyle = '#1a1a1a'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(0, D2 * 0.45); g.arc(0, D2 * 0.45, 0.22, i * TAU / 3 - 0.5, i * TAU / 3 + 0.5); g.closePath(); g.fill(); } }
  if (F.dosimeter) { g.fillStyle = '#e8c52a'; g.fillRect(W2 * 0.3, -D2 * 0.65, 0.12, 0.16); }
  if (F.throatsac) { lkEll(g, 0, -D2 * 0.95, 0.34 * (1 + pose[AP.sq] * 0.5), 0.26 * (1 + pose[AP.sq] * 0.5), 0, '#a8c04a', '#4a5a1a', 0.04); if (lod <= 1) lkCirc(g, 0.06, -D2 * 1.0, 0.08, 'rgba(220,255,120,0.55)'); }
  if (F.stitches && lod <= 1) { g.strokeStyle = '#2a1a1a'; g.lineWidth = 0.03; g.beginPath(); g.moveTo(-W2 * 0.8, -D2 * 0.4); g.lineTo(W2 * 0.6, D2 * 0.5); g.stroke(); for (let i = 0; i < 7; i++) { const t = i / 6, x = -W2 * 0.8 + t * W2 * 1.4, y = -D2 * 0.4 + t * D2 * 0.9; g.beginPath(); g.moveTo(x - 0.05, y + 0.06); g.lineTo(x + 0.05, y - 0.06); g.stroke(); } }
  if (F.patches && lod <= 1) { lkEll(g, -W2 * 0.4, D2 * 0.2, 0.3, 0.22, 0.3, '#8a9a7a'); lkEll(g, W2 * 0.45, -D2 * 0.3, 0.22, 0.2, -0.5, '#b8a09a'); }
  if ((F.stains || F.bite || F.tears) && lod <= 1) { g.fillStyle = 'rgba(100,10,12,0.55)'; if (F.stains) { lkEll(g, -W2 * 0.3, -D2 * 0.3, 0.2, 0.12, 0.6, 'rgba(100,10,12,0.5)'); lkEll(g, W2 * 0.25, D2 * 0.2, 0.14, 0.1, -0.3, 'rgba(100,10,12,0.45)'); } if (F.bite) lkEll(g, W2 * 0.62, -0.05, 0.14, 0.1, 0.5, 'rgba(120,12,14,0.75)'); if (F.tears) { g.strokeStyle = 'rgba(30,20,15,0.6)'; g.lineWidth = 0.04; g.beginPath(); g.moveTo(-W2 * 0.5, D2 * 0.3); g.lineTo(-W2 * 0.3, D2 * 0.45); g.lineTo(-W2 * 0.4, D2 * 0.6); g.stroke(); } }
  if (F.burns && lod <= 1) { lkEll(g, W2 * 0.3, D2 * 0.3, 0.26, 0.18, 0.4, 'rgba(30,18,12,0.65)'); lkEll(g, -W2 * 0.5, -D2 * 0.2, 0.16, 0.12, 0, 'rgba(30,18,12,0.55)'); }
  if (F.dust || F.dirt || F.grease) { const c = F.grease ? 'rgba(20,20,20,0.35)' : F.dirt ? 'rgba(80,58,30,0.35)' : 'rgba(180,170,150,0.3)'; for (let i = 0; i < 5; i++) { const a = i * 2.1 + 0.7; lkCirc(g, Math.cos(a) * W2 * 0.6, Math.sin(a) * D2 * 0.6, 0.06 + (i % 3) * 0.03, c); } }
  if (F.seaweed && lod <= 1) { g.strokeStyle = '#3e6b3a'; g.lineWidth = 0.05; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-W2 * 0.5 + i * 0.4, -D2 * 0.6); g.quadraticCurveTo(-W2 * 0.3 + i * 0.4, 0, -W2 * 0.5 + i * 0.45, D2 * 0.7); g.stroke(); } }
  if (F.frost || F.icicles) { g.fillStyle = 'rgba(220,245,255,0.6)'; for (const v of [-1, 1]) lkEll(g, v * W2 * 0.7, 0, 0.22, D2 * 0.5, 0, 'rgba(220,245,255,0.55)'); }
  if (F.glowveins && lod <= 1) { g.strokeStyle = L.key === 'glow' ? 'rgba(234,255,74,0.7)' : 'rgba(180,255,60,0.7)'; g.lineWidth = 0.035; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-W2 * 0.4 + i * 0.35, -D2 * 0.5); g.lineTo(-W2 * 0.3 + i * 0.3, 0); g.lineTo(-W2 * 0.45 + i * 0.38, D2 * 0.5); g.stroke(); } }
  if (F.dry && lod <= 1) { g.strokeStyle = 'rgba(60,45,25,0.5)'; g.lineWidth = 0.025; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-W2 * 0.6 + i * 0.35, -D2 * 0.6); g.lineTo(-W2 * 0.5 + i * 0.3, 0); g.stroke(); } }
  if (F.bones && lod <= 1) { g.strokeStyle = '#d9cfb4'; g.lineWidth = 0.05; for (let i = 0; i < 3; i++) { const w = D2 * (0.1 + i * 0.22); g.beginPath(); g.moveTo(-W2 * 0.75, w); g.quadraticCurveTo(-W2 * 0.4, w - 0.12, -W2 * 0.1, w); g.stroke(); } }
  if (F.tattoo && lod <= 1) { g.strokeStyle = 'rgba(30,40,70,0.6)'; g.lineWidth = 0.03; g.beginPath(); g.arc(W2 * 0.55, 0, 0.12, 0, TAU); g.stroke(); }
  if (F.camo && L.key === 'hunter') { g.fillStyle = L.ac.b; g.fillRect(-W2 * 0.75, -D2 * 0.15, W2 * 1.5, 0.12); }
  if (LKO.z && lod <= 1) lkWear(g, m, W2, D2, LKO.z);
  g.restore();
  // the collar or neckline at the base of the neck
  const nx = lkX(JN.neck), ny = lkY(JN.neck), nk = lkK(JN.neck);
  if (T.collar && !L.bare) lkEll(g, nx, ny, D.headR * 0.95 * nk, D.headR * 0.75 * nk, rot, (L.shirtC || L.cl).l, (L.shirtC || L.cl).o, 0.04);
  lkRim(g, cx, cy, chW, chD, rot);
}
// 1.9.994: what happened to this one (not its kind): its own blood, rips, a gash, bite marks, drool down its front, and
// more blood as it takes hits. From a seed of its own, so two office drones in the same crowd never look alike. In the
// chest's frame (x along the shoulders, -y its front), clipped to the chest's outline.
function lkWear(g, m, W2, D2, z) {
  const L = m.al, dmg = z.maxHp > 0 ? clamp(1 - z.hp / z.maxHp, 0, 1) : 0;
  let s = ((z.nid | 0) * 2654435761 >>> 0) % 2147483646 + 1; const R = () => (s = s * 16807 % 2147483647) / 2147483647;
  g.save(); g.beginPath(); g.ellipse(0, 0, W2 * 0.97, D2 * 0.97, 0, 0, TAU); g.clip();
  const blob = (x, y, r, col, n) => { g.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * TAU, rr = r * (0.62 + R() * 0.55); if (i === 0) g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fillStyle = col; g.fill(); };
  // a rip in what it wears, the skin underneath (not on the bare)
  if (!L.bare && R() < 0.62) {
    const x = (R() - 0.5) * W2 * 1.2, y = (R() - 0.6) * D2 * 1.1, w = W2 * (0.18 + R() * 0.2), h = D2 * (0.12 + R() * 0.16);
    g.beginPath(); for (let i = 0; i <= 9; i++) { const a = i / 9 * TAU, k = i % 2 ? 0.55 : 1; if (i === 0) g.moveTo(x + Math.cos(a) * w * k, y + Math.sin(a) * h * k); else g.lineTo(x + Math.cos(a) * w * k, y + Math.sin(a) * h * k); }
    g.closePath(); g.fillStyle = L.skin.d; g.fill(); g.strokeStyle = L.cl.o; g.lineWidth = 0.03; g.stroke();
  }
  // its own old blood, and new blood with every hit it takes
  const n = 1 + (R() * 2.6 | 0) + Math.floor(dmg * 5);
  for (let i = 0; i < n; i++) { const x = (R() - 0.5) * W2 * 1.5, y = (R() - 0.55) * D2 * 1.4, r = (0.07 + R() * 0.12) * (i >= n - Math.floor(dmg * 5) ? 1.15 : 1); blob(x, y, r, i % 3 ? 'rgba(78,8,10,0.72)' : 'rgba(110,14,14,0.62)', 7); if (r > 0.12) blob(x + r * 0.2, y + r * 0.1, r * 0.45, 'rgba(140,20,18,0.5)', 6); }
  // a gash, its edges, a dark line down it
  if (R() < 0.42) { const x0 = (R() - 0.5) * W2, y0 = (R() - 0.5) * D2, a = R() * Math.PI, l = W2 * (0.35 + R() * 0.3); g.lineCap = 'round'; g.strokeStyle = 'rgba(150,40,36,0.75)'; g.lineWidth = 0.075; g.beginPath(); g.moveTo(x0 - Math.cos(a) * l / 2, y0 - Math.sin(a) * l / 2); g.lineTo(x0 + Math.cos(a) * l / 2, y0 + Math.sin(a) * l / 2); g.stroke(); g.strokeStyle = 'rgba(40,2,4,0.9)'; g.lineWidth = 0.03; g.stroke(); }
  // a bite out of a shoulder: two crescents of teeth marks
  if (R() < 0.3) { const sx = (R() < 0.5 ? -1 : 1) * W2 * 0.7, sy = -D2 * 0.15; g.strokeStyle = 'rgba(60,6,8,0.8)'; g.lineWidth = 0.025; for (const k of [0, 1]) { g.beginPath(); g.arc(sx, sy + k * 0.09, 0.09, 0.2 + k * Math.PI, Math.PI - 0.2 + k * Math.PI); g.stroke(); } }
  // drool and blood from the mouth down its front
  if (R() < 0.55) { g.strokeStyle = 'rgba(96,10,12,0.6)'; g.lineWidth = 0.05; const x = (R() - 0.5) * W2 * 0.3; g.beginPath(); g.moveTo(x, -D2 * 0.95); g.quadraticCurveTo(x + 0.05, -D2 * 0.5, x - 0.02, -D2 * 0.05 - R() * D2 * 0.3); g.stroke(); }
  g.restore();
}
// the patterns printed or woven on clothes, inside the chest's outline (chords worked out, so nothing needs clipping)
function lkPattern(g, pat, W2, D2, L) {
  const R = Z.mulberry32(LKM.seed >>> 0);
  if (pat === 'floral') { const cs = ['#f26b8a', '#f2d23a', '#f2f2f2', '#7ad86b']; for (let i = 0; i < 9; i++) { const a = R() * TAU, q = Math.sqrt(R()) * 0.78; lkCirc(g, Math.cos(a) * W2 * q, Math.sin(a) * D2 * q, 0.07 + R() * 0.05, cs[i % 4]); } }
  else if (pat === 'plaid' || pat === 'check') {
    g.strokeStyle = 'rgba(20,20,20,0.35)'; g.lineWidth = 0.06;
    for (let v = -0.75; v <= 0.76; v += 0.25) { const h = Math.sqrt(Math.max(0, 1 - v * v)); g.beginPath(); g.moveTo(v * W2, -h * D2); g.lineTo(v * W2, h * D2); g.moveTo(-h * W2, v * D2); g.lineTo(h * W2, v * D2); g.stroke(); }
  } else if (pat === 'camo') { const cs = [L.c2.b, L.cl.d, '#3a3326']; for (let i = 0; i < 7; i++) { const a = R() * TAU, q = Math.sqrt(R()) * 0.7; lkEll(g, Math.cos(a) * W2 * q, Math.sin(a) * D2 * q, 0.15 + R() * 0.12, 0.09 + R() * 0.07, R() * 3, cs[i % 3]); } }
  else if (pat === 'dots') { const cs = ['#f2d23a', '#2f8f4a', '#e2442f', '#2aa1d6']; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.3, q = 0.5 + (i % 2) * 0.2; lkCirc(g, Math.cos(a) * W2 * q, Math.sin(a) * D2 * q, 0.09, cs[i % 4]); } }
  else if (pat === 'studs') { g.fillStyle = '#c8ccd0'; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; lkCirc(g, Math.cos(a) * W2 * 0.82, Math.sin(a) * D2 * 0.78, 0.035, '#c8ccd0'); } }
  else if (pat === 'wraps') { g.strokeStyle = 'rgba(90,70,40,0.45)'; g.lineWidth = 0.035; for (let v = -0.7; v <= 0.71; v += 0.2) { const h = Math.sqrt(Math.max(0, 1 - v * v)); g.beginPath(); g.moveTo(-h * W2, v * D2); g.lineTo(h * W2, v * D2 + 0.06); g.stroke(); } }
}
/* ---- arms, hands and what they hold ---- */
function lkArm(g, m, side, pose) {
  const D = m.ad, L = m.al, F = L.F, si = side < 0 ? JN.shL : JN.shR, ei = si + 1, hi = si + 2;
  const sx = lkX(si), sy = lkY(si), ex = lkX(ei), ey = lkY(ei), hx = lkX(hi), hy = lkY(hi), lit = LKO.lod <= 1;
  const big = side > 0 && D.bigArm ? 1.3 : 1, wu = D.limb * lkK(si) * big, wf = D.fore * lkK(hi) * big;
  if ((side < 0 && D.noArmL) || (LKSEV & (side < 0 ? 1 : 2))) {
    // the stump of a lost arm, bone showing
    lkLimb(g, sx, sy, ex, ey, wu, L.sleeve ? L.sleeveC : L.skin, lit); lkCirc(g, ex, ey, wu * 0.45, '#7a1a1a'); lkCirc(g, ex, ey, wu * 0.2, '#d9cfb4'); return;
  }
  const up = L.sleeve >= 1 ? L.sleeveC : L.skin, lo = L.sleeve >= 2 ? L.sleeveC : L.skin;
  const puffy = L.T.puffy ? 1.18 : 1;
  lkLimb(g, sx, sy, ex, ey, wu * puffy, up, lit);
  lkLimb(g, ex, ey, hx, hy, wf * (L.sleeve >= 2 ? puffy : 1), lo, lit);
  if (L.sleeve === 1 && LKO.lod <= 1) lkCirc(g, ex, ey, wu * 0.5, up.d);
  if (side > 0 && D.bigArm && LKO.lod <= 1) { g.strokeStyle = '#2a1a1a'; g.lineWidth = 0.03; g.beginPath(); g.moveTo(sx + (ex - sx) * 0.15, sy + (ey - sy) * 0.15 - 0.12); g.lineTo(sx + (ex - sx) * 0.15, sy + (ey - sy) * 0.15 + 0.12); g.stroke(); }
  if (F.veins && LKO.lod <= 1) { g.strokeStyle = 'rgba(40,60,90,0.5)'; g.lineWidth = 0.025; g.beginPath(); g.moveTo(ex, ey); g.lineTo((ex + hx) / 2 + 0.05, (ey + hy) / 2); g.lineTo(hx, hy); g.stroke(); }
  if (F.glowveins && LKO.lod <= 1) { g.strokeStyle = L.key === 'glow' ? 'rgba(234,255,74,0.75)' : 'rgba(180,255,60,0.75)'; g.lineWidth = 0.03; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.lineTo(hx, hy); g.stroke(); }
  if (F.chains && LKO.lod <= 1) lkCirc(g, hx + (ex - hx) * 0.18, hy + (ey - hy) * 0.18, wf * 0.55, '#8a8f94');
  if (F.tape && LKO.lod <= 1) lkCirc(g, hx + (ex - hx) * 0.18, hy + (ey - hy) * 0.18, wf * 0.55, '#9aa0a6');
  if (F.watch && side < 0 && LKO.lod <= 1) lkCirc(g, hx + (ex - hx) * 0.2, hy + (ey - hy) * 0.2, wf * 0.5, '#b8a24a');
  if (F.pads && LKO.lod <= 1) lkCirc(g, ex, ey, wu * 0.6, '#2a2c30');
  if (F.icicles && LKO.lod <= 1) { g.fillStyle = 'rgba(220,245,255,0.85)'; const mx = (ex + hx) / 2, my = (ey + hy) / 2; g.beginPath(); g.moveTo(mx - 0.05, my); g.lineTo(mx + 0.05, my); g.lineTo(mx, my + 0.3 * side); g.closePath(); g.fill(); }
  if (F.bones && side < 0 && LKO.lod <= 1) lkSeg(g, ex, ey, (ex + hx) / 2, (ey + hy) / 2, wf * 0.35, '#d9cfb4');
  if (F.studs && L.top === 'leather' && LKO.lod <= 1) { for (let i = 1; i < 3; i++) lkCirc(g, sx + (ex - sx) * i / 3, sy + (ey - sy) * i / 3, 0.035, '#c8ccd0'); }
  if (L.T.refl && LKO.lod <= 1) { const mx = sx + (ex - sx) * 0.7, my = sy + (ey - sy) * 0.7; lkCirc(g, mx, my, wu * 0.52, '#d7e34a'); }
  // the hand: a glove, a claw, a fist
  const hr = D.hand * lkK(hi) * big, glove = F.gloves || L.top === 'hazmat' || L.top === 'space' || L.top === 'riot' || L.key === 'butcher' ? (L.top === 'space' || L.top === 'hazmat' ? L.cl : lkSet([40, 40, 44])) : null;
  const handC = glove || (F.bloodhands ? lkSet(lkMix(L.skin.rgb, [120, 12, 14], 0.55)) : L.skin);
  const fa = Math.atan2(hy - ey, hx - ex), grip = pose[AP.grip];
  lkCirc(g, hx, hy, hr, handC.b);
  if (LKO.lod <= 1) {
    g.strokeStyle = handC.o; g.lineWidth = 0.05; g.beginPath(); g.arc(hx, hy, hr, 0, TAU); g.stroke();
    // fingers: spread and hooked as claws, or closed
    const nf = D.claws ? 4 : 3, len = (D.claws ? 0.32 : 0.16) * (1 - grip * 0.6);
    if (len > 0.05) { g.strokeStyle = D.claws ? '#2a221c' : handC.d; g.lineWidth = D.claws ? 0.035 : 0.05; g.beginPath(); for (let i = 0; i < nf; i++) { const a = fa + (i - (nf - 1) / 2) * 0.32; g.moveTo(hx + Math.cos(a) * hr * 0.8, hy + Math.sin(a) * hr * 0.8); g.lineTo(hx + Math.cos(a + side * 0.2) * (hr + len), hy + Math.sin(a + side * 0.2) * (hr + len)); } g.stroke(); }
  }
  if (side > 0 && L.hold && L.hold !== 'shield') lkProp(g, m, L.hold, hx, hy, fa, hr, pose);
  if (side < 0 && L.hold === 'bouquet') lkProp(g, m, 'bouquet2', hx, hy, fa, hr, pose);
}
function lkProp(g, m, k, x, y, a, hr, pose) {
  const L = m.al, c = Math.cos(a), s = Math.sin(a), lod = LKO.lod;
  g.save(); g.translate(x, y); g.rotate(a);
  switch (k) {
    case 'cleaver': g.fillStyle = '#3a2a1a'; g.fillRect(-0.05, -0.05, 0.3, 0.1); g.fillStyle = '#c9ced4'; g.beginPath(); g.moveTo(0.22, -0.08); g.lineTo(0.7, -0.08); g.lineTo(0.7, 0.28); g.lineTo(0.22, 0.2); g.closePath(); g.fill(); g.strokeStyle = '#6b7076'; g.lineWidth = 0.03; g.stroke(); if (lod <= 1) { g.fillStyle = 'rgba(110,10,12,0.6)'; g.fillRect(0.5, 0.05, 0.18, 0.12); } break;
    case 'iceaxe': g.strokeStyle = '#2a4a7a'; g.lineWidth = 0.08; g.beginPath(); g.moveTo(-0.1, 0); g.lineTo(0.9, 0); g.stroke(); g.strokeStyle = '#c0c4c8'; g.lineWidth = 0.07; g.beginPath(); g.moveTo(0.9, -0.3); g.lineTo(0.9, 0.38); g.lineTo(0.78, 0.48); g.stroke(); break;
    case 'wrench': g.strokeStyle = '#8a9096'; g.lineWidth = 0.1; g.beginPath(); g.moveTo(-0.05, 0); g.lineTo(0.75, 0); g.stroke(); g.fillStyle = '#8a9096'; g.beginPath(); g.arc(0.8, 0, 0.13, 0.7, TAU - 0.7); g.fill(); break;
    case 'hook': g.strokeStyle = '#7a7f84'; g.lineWidth = 0.05; g.setLineDash([0.07, 0.04]); g.beginPath(); g.moveTo(0, 0); g.lineTo(0.5, 0.15); g.stroke(); g.setLineDash([]); g.strokeStyle = '#a8adb2'; g.lineWidth = 0.08; g.beginPath(); g.arc(0.62, 0.15, 0.16, -1.2, 2.6); g.stroke(); break;
    case 'mop': { g.restore(); g.save(); const bx = x - 2.4, by = y + 0.35 * (m.an.side || 1); g.strokeStyle = '#8a6a3a'; g.lineWidth = 0.08; g.beginPath(); g.moveTo(x + c * 0.2, y + s * 0.2); g.lineTo(bx, by); g.stroke(); g.fillStyle = '#c8c4b0'; g.beginPath(); g.ellipse(bx, by, 0.3, 0.42, 0, 0, TAU); g.fill(); if (lod <= 1) { g.strokeStyle = '#9a9680'; g.lineWidth = 0.03; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(bx, by + i * 0.1); g.lineTo(bx - 0.35, by + i * 0.13); g.stroke(); } } break; }
    case 'briefcase': g.fillStyle = '#3a2618'; g.fillRect(0.02, -0.3, 0.32, 0.6); g.strokeStyle = '#1a120a'; g.lineWidth = 0.04; g.strokeRect(0.02, -0.3, 0.32, 0.6); g.fillStyle = '#b8a24a'; g.fillRect(0.02, -0.05, 0.06, 0.1); break;
    case 'medbag': g.fillStyle = L.holdC.b; g.fillRect(0.02, -0.28, 0.42, 0.56); g.fillStyle = '#f2f2f2'; g.fillRect(0.17, -0.12, 0.12, 0.24); g.fillRect(0.11, -0.06, 0.24, 0.12); break;
    case 'bag': g.restore(); g.save(); { const px = lkX(JN.pel), py = lkY(JN.pel); g.strokeStyle = '#3a2a18'; g.lineWidth = 0.05; g.beginPath(); g.moveTo(lkX(JN.shL), lkY(JN.shL)); g.lineTo(px - 0.1, py + 0.9); g.stroke(); g.fillStyle = L.holdC.b; g.fillRect(px - 0.55, py + 0.75, 0.7, 0.42); g.strokeStyle = L.holdC.o; g.strokeRect(px - 0.55, py + 0.75, 0.7, 0.42); } break;
    case 'camera': g.restore(); g.save(); { const cx = lkX(JN.sc) + 0.35, cy = lkY(JN.sc); g.strokeStyle = '#1a1a1a'; g.lineWidth = 0.035; g.beginPath(); g.arc(lkX(JN.neck), lkY(JN.neck), 0.4, -1, 1); g.stroke(); g.fillStyle = '#2a2a2c'; g.fillRect(cx - 0.1, cy - 0.22, 0.24, 0.44); g.fillStyle = '#5a6a7a'; lkCirc(g, cx + 0.18, cy, 0.1, '#5a6a7a'); } break;
    case 'whistle': g.restore(); g.save(); { const nx = lkX(JN.neck), ny = lkY(JN.neck); g.strokeStyle = '#f2f2f2'; g.lineWidth = 0.03; g.beginPath(); g.arc(nx, ny, 0.38, -0.9, 0.9); g.stroke(); lkCirc(g, nx + 0.4, ny + 0.05, 0.06, '#c8c8c8'); } break;
    case 'scalpel': g.strokeStyle = '#c9ced4'; g.lineWidth = 0.04; g.beginPath(); g.moveTo(0, 0); g.lineTo(0.35, 0); g.stroke(); g.strokeStyle = '#e8eef5'; g.lineWidth = 0.03; g.beginPath(); g.moveTo(0.35, 0); g.lineTo(0.48, 0.02); g.stroke(); break;
    case 'bouquet': case 'bouquet2': { const cs = ['#5a3a4a', '#3a2a30', '#6a4a52', '#2a3a2a']; for (let i = 0; i < 5; i++) { const aa = i * 1.3; lkCirc(g, 0.18 + Math.cos(aa) * 0.1, Math.sin(aa) * 0.1, 0.08, cs[i % 4]); } if (k === 'bouquet2') break; g.strokeStyle = '#2a3a2a'; g.lineWidth = 0.03; g.beginPath(); g.moveTo(0, 0); g.lineTo(-0.2, 0.05); g.stroke(); break; }
  }
  g.restore();
}
// the riot shield, on the left forearm, out in front
function lkShield(g, m, pose) {
  // the shield stands across the front of the body (square to the shoulders), held out on the forearm, slightly curved
  const hx = lkX(JN.haL), hy = lkY(JN.haL), a = Math.atan2(lkY(JN.shR) - lkY(JN.shL), lkX(JN.shR) - lkX(JN.shL));
  // in front of the chest (whatever the arm is doing), pushed out further when the arm drives it forward
  const fx = Math.sin(a), fy = -Math.cos(a), sx = lkX(JN.sc), sy = lkY(JN.sc), d0 = m.ad.chD + 0.45, px = sx + fx * d0, py = sy + fy * d0;
  let reach = Math.max(0, (hx - sx) * fx + (hy - sy) * fy - d0), cx = px + fx * reach * 0.8, cy = py + fy * reach * 0.8, L = m.ad.chW * 1.3;
  // down on the ground it lies where the hand let go of it
  const fall = pose[AP.fall]; if (fall > 0.3) { const k = Math.min(1, (fall - 0.3) / 0.5); cx += (hx + 0.6 - cx) * k; cy += (hy - cy) * k; }
  g.save(); g.translate(cx, cy); g.rotate(a);
  g.fillStyle = 'rgba(36,44,56,0.94)'; g.beginPath(); g.moveTo(-L, 0.06); g.quadraticCurveTo(0, -0.22, L, 0.06); g.lineTo(L, 0.22); g.quadraticCurveTo(0, -0.04, -L, 0.22); g.closePath(); g.fill();
  g.strokeStyle = '#0e1012'; g.lineWidth = 0.05; g.stroke();
  if (LKO.lod <= 1) { g.strokeStyle = 'rgba(170,200,230,0.45)'; g.lineWidth = 0.04; g.beginPath(); g.moveTo(-L * 0.85, 0.07); g.quadraticCurveTo(0, -0.16, L * 0.85, 0.07); g.stroke(); }
  g.restore();
}
// the trailing gut of the legless one
function lkEntrails(g, m) {
  const px = lkX(JN.pel), py = lkY(JN.pel), t = LKO.t || 0;
  g.strokeStyle = '#7a2a2a'; g.lineWidth = 0.14; g.beginPath(); g.moveTo(px, py);
  for (let i = 1; i <= 4; i++) g.lineTo(px - i * 0.35, py + Math.sin(i * 1.7 + t * 2) * 0.18);
  g.stroke(); g.strokeStyle = '#a84a4a'; g.lineWidth = 0.06; g.stroke();
}
/* ---- the head ---- */
function lkHead(g, m, pose) {
  const D = m.ad, L = m.al, F = L.F, lod = LKO.lod, J = ANIMA.J;
  const nx = lkX(JN.neck), ny = lkY(JN.neck), x = lkX(JN.head), y = lkY(JN.head), k = lkK(JN.head), hr = D.headR * k;
  // the neck
  lkSeg(g, nx, ny, x, y, D.headR * 0.95 * lkK(JN.neck), L.skin.b, L.skin.o);
  const fx = J[JN.fdir * 3], fy = J[JN.fdir * 3 + 1], fz = J[JN.fdir * 3 + 2], ux = J[JN.hup * 3], uy = J[JN.hup * 3 + 1];
  const vis = Math.max(0, fz), down = fz < -0.45;
  const fl = Math.hypot(fx, fy) || 1, fdx = fx / fl, fdy = fy / fl, ang = Math.atan2(fdy, fdx);
  const big = F.bigjaw ? 1 : 0;
  // the skull itself, lit from the side the light comes from
  const skinC = L.glowSkin && LKO.glow ? lkSet(lkMix(L.skin.rgb, [234, 255, 74], 0.25)) : L.skin;
  lkEll(g, x, y, hr, hr * 0.94, ang, lkShade(g, x, y, hr, skinC), skinC.o, 0.06);
  lkTex(g, 'skin', 0.5);
  // where the top of the head is (seen when upright) and where the face is (at the front edge, or full on when it looks up)
  const tx = x + ux * hr * 0.45, ty = y + uy * hr * 0.45;
  const ffx = x + fdx * hr * (0.62 - 0.48 * vis), ffy = y + fdy * hr * (0.62 - 0.48 * vis);
  lkHair(g, m, x, y, hr, ang, fdx, fdy, vis, down, tx, ty);
  if (!down) lkFace(g, m, pose, x, y, hr, ang, fdx, fdy, vis, ffx, ffy);
  lkHat(g, m, x, y, hr, ang, fdx, fdy, vis, down, tx, ty, pose);
  lkRim(g, x, y, hr, hr * 0.94, ang);
}
function lkHair(g, m, x, y, hr, ang, fdx, fdy, vis, down, tx, ty) {
  const L = m.al, h = L.hair, H = L.hr, lod = LKO.lod;
  if (h === 'none' || h === 'bald' || L.head === 'hazhood' || L.head === 'spacehelm' || L.head === 'riothelm' || L.head === 'hood') {
    if ((h === 'bald' || h === 'none') && lod <= 1 && !L.head.match(/hood|helm/)) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.ellipse(tx - fdx * hr * 0.1, ty - fdy * hr * 0.1, hr * 0.35, hr * 0.22, ang, 0, TAU); g.fill(); }
    return;
  }
  // hair sits behind the face: pushed back from it, smaller when the face turns up to you
  const back = 0.28 + 0.55 * vis, cx = x - fdx * hr * back + (tx - x) * 0.3, cy = y - fdy * hr * back + (ty - y) * 0.3, rr = hr * (0.98 - 0.3 * vis);
  if (down) { lkEll(g, x, y, hr * 0.96, hr * 0.9, ang, H.b, H.o, 0.05); }
  else switch (h) {
    case 'balding': g.strokeStyle = H.b; g.lineWidth = hr * 0.32; g.beginPath(); g.ellipse(cx, cy, rr * 0.82, rr * 0.78, ang, Math.PI * 0.45, Math.PI * 1.55); g.stroke(); break;
    case 'short': case 'slick': case 'messy': case 'shaved':
      lkEll(g, cx, cy, rr, rr * 0.95, ang, h === 'shaved' ? lkCss(L.hr.rgb, 0.45) : H.b, h === 'shaved' ? null : H.o, 0.04);
      if (h === 'slick' && lod <= 1) { g.strokeStyle = H.l; g.lineWidth = 0.04; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(cx + Math.cos(ang) * rr * 0.6 + Math.cos(ang + Math.PI / 2) * i * rr * 0.3, cy + Math.sin(ang) * rr * 0.6 + Math.sin(ang + Math.PI / 2) * i * rr * 0.3); g.lineTo(cx - Math.cos(ang) * rr * 0.7 + Math.cos(ang + Math.PI / 2) * i * rr * 0.3, cy - Math.sin(ang) * rr * 0.7 + Math.sin(ang + Math.PI / 2) * i * rr * 0.3); g.stroke(); } }
      if (h === 'messy' && lod <= 1) { g.fillStyle = H.b; for (let i = 0; i < 6; i++) { const a = ang + Math.PI * 0.5 + i * 0.4; g.beginPath(); g.moveTo(cx + Math.cos(a - 0.15) * rr * 0.85, cy + Math.sin(a - 0.15) * rr * 0.85); g.lineTo(cx + Math.cos(a) * rr * 1.35, cy + Math.sin(a) * rr * 1.35); g.lineTo(cx + Math.cos(a + 0.15) * rr * 0.85, cy + Math.sin(a + 0.15) * rr * 0.85); g.fill(); } }
      break;
    case 'ponytail': case 'bun':
      lkEll(g, cx, cy, rr, rr * 0.95, ang, H.b, H.o, 0.04);
      if (h === 'bun') lkCirc(g, x - fdx * hr * 1.05, y - fdy * hr * 1.05, hr * 0.42, H.d);
      else { const t = LKO.t || 0, sw = Math.sin(t * 5) * 0.25; g.strokeStyle = H.b; g.lineWidth = hr * 0.38; g.beginPath(); g.moveTo(x - fdx * hr * 0.9, y - fdy * hr * 0.9); g.quadraticCurveTo(x - fdx * hr * 1.6 + fdy * sw, y - fdy * hr * 1.6 - fdx * sw, x - fdx * hr * 2.2 + fdy * sw * 2, y - fdy * hr * 2.2 - fdx * sw * 2); g.stroke(); }
      break;
    case 'long': {
      lkEll(g, cx, cy, rr * 1.05, rr, ang, H.b, H.o, 0.04);
      // long hair hangs over the shoulders and down the back
      g.fillStyle = H.b; g.beginPath(); g.ellipse(x - fdx * hr * 1.1, y - fdy * hr * 1.1, hr * 1.0, hr * 1.25, ang + Math.PI / 2, 0, TAU); g.fill();
      if (lod <= 1) { g.strokeStyle = H.d; g.lineWidth = 0.035; for (let i = -2; i <= 2; i++) { const px = -fdy * i * hr * 0.3, py = fdx * i * hr * 0.3; g.beginPath(); g.moveTo(x + px, y + py); g.lineTo(x - fdx * hr * 2 + px * 1.2, y - fdy * hr * 2 + py * 1.2); g.stroke(); } }
      break;
    }
    case 'curly': for (let i = 0; i < 7; i++) { const a = ang + Math.PI * 0.35 + i * 0.27 * 3; lkCirc(g, cx + Math.cos(a) * rr * 0.62, cy + Math.sin(a) * rr * 0.62, rr * 0.42, i % 2 ? H.b : H.d); } break;
    case 'mohawk': { g.strokeStyle = H.b; g.lineWidth = hr * 0.42; g.beginPath(); g.moveTo(x + fdx * hr * 0.7, y + fdy * hr * 0.7); g.lineTo(x - fdx * hr * 1.0, y - fdy * hr * 1.0); g.stroke(); if (lod <= 1) { g.fillStyle = H.l; for (let i = 0; i < 5; i++) { const t2 = i / 4, px = x + fdx * hr * (0.7 - 1.7 * t2), py = y + fdy * hr * (0.7 - 1.7 * t2); g.beginPath(); g.moveTo(px - fdy * 0.06, py + fdx * 0.06); g.lineTo(px - fdx * 0.2, py - fdy * 0.2); g.lineTo(px + fdy * 0.06, py - fdx * 0.06); g.fill(); } } g.fillStyle = 'rgba(0,0,0,0.18)'; break; }
    case 'patchy': for (let i = 0; i < 4; i++) { const a = ang + Math.PI * 0.7 + i * 0.75; lkEll(g, cx + Math.cos(a) * rr * 0.5, cy + Math.sin(a) * rr * 0.5, rr * 0.3, rr * 0.22, a, H.b); } break;
    default: lkEll(g, cx, cy, rr, rr * 0.95, ang, H.b, H.o, 0.04);
  }
}
function lkFace(g, m, pose, x, y, hr, ang, fdx, fdy, vis, fx, fy) {
  const L = m.al, F = L.F, lod = LKO.lod, px = -fdy, py = fdx, jaw = pose[AP.jaw], vk = 0.45 + 0.55 * vis;
  const masked = L.head === 'hazhood' || L.head === 'spacehelm' || L.head === 'divemask' || L.head === 'riothelm' || L.head === 'respirator';
  // the mouth: opens with the jaw; an unhinged one hangs down to the chest
  if (!masked && (jaw > 0.15 || F.bigjaw)) {
    const jo = (F.bigjaw ? 0.55 + jaw * 0.6 : jaw * 0.42) * hr, mx = fx + fdx * hr * (0.1 + 0.18 * vis), my = fy + fdy * hr * (0.1 + 0.18 * vis);
    g.fillStyle = '#1a0606'; g.beginPath(); g.ellipse(mx + fdx * jo * 0.4, my + fdy * jo * 0.4, hr * 0.3 * vk, Math.max(0.02, jo * 0.5), ang + Math.PI / 2, 0, TAU); g.fill();
    if (lod <= 1 && vis > 0.2) { g.strokeStyle = '#d8d0b0'; g.lineWidth = 0.03; g.beginPath(); g.moveTo(mx - px * hr * 0.2, my - py * hr * 0.2); g.lineTo(mx + px * hr * 0.2, my + py * hr * 0.2); g.stroke(); }
    if (F.drool && lod <= 1) { g.strokeStyle = 'rgba(184,236,74,0.8)'; g.lineWidth = 0.04; g.beginPath(); g.moveTo(mx + fdx * jo * 0.8, my + fdy * jo * 0.8); g.lineTo(mx + fdx * (jo + 0.25), my + fdy * (jo + 0.25)); g.stroke(); }
  }
  if (L.beard) { g.fillStyle = L.hr.d; g.beginPath(); g.ellipse(fx + fdx * hr * 0.15, fy + fdy * hr * 0.15, hr * 0.42, hr * 0.28 * vk, ang + Math.PI / 2, 0, TAU); g.fill(); }
  if (L.head === 'mask' || F.mask) { g.fillStyle = L.key === 'surgeon' ? '#8fb8a0' : '#b9d6e0'; g.beginPath(); g.ellipse(fx + fdx * hr * 0.12, fy + fdy * hr * 0.12, hr * 0.5, hr * 0.26 * vk, ang + Math.PI / 2, 0, TAU); g.fill(); }
  // the eyes: they catch the light, and glow in the dark
  if (L.head === 'divemask' || L.head === 'goggles' || F.goggles || L.head === 'spacehelm' || L.head === 'hazhood' || L.head === 'riothelm') return;
  const ex = fx - fdx * hr * 0.12 * (1 - vis), ey = fy - fdy * hr * 0.12 * (1 - vis), sep = hr * 0.33, er = hr * (0.13 + 0.05 * vis) * (F.bigjaw ? 1.2 : 1);
  for (const sd of [-1, 1]) {
    const qx = ex + px * sep * sd, qy = ey + py * sep * sd;
    lkCirc(g, qx, qy, er * 1.25, 'rgba(20,10,8,0.65)');
    lkCirc(g, qx, qy, er, L.eye);
  }
  if (LKO.glow && lod <= 1) {
    const night = CORE.frame.night || 0, k = LKO.preview ? 0.5 : 0.2 + night * 0.65;
    if (k > 0.15) { g.globalCompositeOperation = 'lighter'; const c = L.eyeRGB; g.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (k * 0.35).toFixed(3) + ')'; for (const sd of [-1, 1]) { g.beginPath(); g.arc(ex + px * sep * sd, ey + py * sep * sd, er * 3.2, 0, TAU); g.fill(); } g.globalCompositeOperation = 'source-over'; }
  }
  if (L.head === 'glasses') { g.strokeStyle = '#1a1a1a'; g.lineWidth = 0.035; for (const sd of [-1, 1]) { g.beginPath(); g.arc(ex + px * sep * sd, ey + py * sep * sd, er * 1.7, 0, TAU); g.stroke(); } }
  if (L.head === 'nose' && vis > -0.2) lkCirc(g, fx + fdx * hr * 0.25, fy + fdy * hr * 0.25, hr * 0.2, '#e8202a');
  if (L.key === 'clown' && lod <= 1) { g.strokeStyle = '#c8202a'; g.lineWidth = 0.05; g.beginPath(); g.arc(fx + fdx * hr * 0.1, fy + fdy * hr * 0.1, hr * 0.35, ang + Math.PI / 2 - 1, ang + Math.PI / 2 + 1); g.stroke(); }
  if (F.piercings && lod <= 1) { lkCirc(g, x + px * hr * 0.92, y + py * hr * 0.92, 0.04, '#d8d8d8'); lkCirc(g, x - px * hr * 0.92, y - py * hr * 0.92, 0.04, '#d8d8d8'); }
  if (F.earbuds) { lkCirc(g, x + px * hr * 0.95, y + py * hr * 0.95, 0.05, '#f2f2f2'); lkCirc(g, x - px * hr * 0.95, y - py * hr * 0.95, 0.05, '#f2f2f2'); }
  if (F.sunburn && lod <= 1) { g.fillStyle = 'rgba(230,70,50,0.2)'; g.beginPath(); g.arc(x, y, hr * 0.9, 0, TAU); g.fill(); }
}
function lkHat(g, m, x, y, hr, ang, fdx, fdy, vis, down, tx, ty, pose) {
  const L = m.al, hd = L.head, C = L.cap, lod = LKO.lod, cx = tx * 0.6 + x * 0.4, cy = ty * 0.6 + y * 0.4, flat = 1 - vis * 0.5;
  switch (hd) {
    case 'cap': { const bk = L.key === 'mech' ? -1 : 1; lkEll(g, cx, cy, hr * 0.92, hr * 0.88, ang, lkShade(g, cx, cy, hr, C), C.o, 0.04); g.fillStyle = C.d; g.beginPath(); g.ellipse(cx + fdx * hr * 0.85 * bk, cy + fdy * hr * 0.85 * bk, hr * 0.5 * flat, hr * 0.62, ang, 0, TAU); g.fill(); break; }
    case 'hardhat': lkEll(g, cx, cy, hr * 1.22, hr * 1.12, ang, C.d, C.o, 0.04); lkEll(g, cx, cy, hr * 0.92, hr * 0.86, ang, lkShade(g, cx, cy, hr, C), null); if (lod <= 1) { g.strokeStyle = C.l; g.lineWidth = 0.05; g.beginPath(); g.moveTo(cx + fdx * hr * 0.85, cy + fdy * hr * 0.85); g.lineTo(cx - fdx * hr * 0.85, cy - fdy * hr * 0.85); g.stroke(); } break;
    case 'helmet': case 'climbhelm': lkEll(g, cx, cy, hr * 1.08, hr * 1.02, ang, lkShade(g, cx, cy, hr, C), C.o, 0.05); if (lod <= 1 && hd === 'helmet') { g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.04; g.beginPath(); g.ellipse(cx, cy, hr * 0.75, hr * 0.7, ang, 0, TAU); g.stroke(); } if (hd === 'climbhelm' && lod <= 1) { g.fillStyle = C.d; for (const s of [-1, 1]) g.fillRect(cx - fdy * s * hr * 0.4 - 0.04, cy + fdx * s * hr * 0.4 - 0.04, 0.08, 0.08); } break;
    case 'bucket': lkEll(g, cx, cy, hr * 1.35, hr * 1.3, ang, C.d, C.o, 0.04); lkEll(g, cx, cy, hr * 0.85, hr * 0.82, ang, lkShade(g, cx, cy, hr, C), null); break;
    case 'straw': lkEll(g, cx, cy, hr * 1.7, hr * 1.62, ang, C.b, C.o, 0.04); lkEll(g, cx, cy, hr * 0.82, hr * 0.8, ang, C.l, C.d, 0.04); if (lod <= 1) { g.strokeStyle = 'rgba(120,90,30,0.4)'; g.lineWidth = 0.025; g.beginPath(); g.arc(cx, cy, hr * 1.25, 0, TAU); g.stroke(); } break;
    case 'chefhat': lkEll(g, cx, cy, hr * 1.08, hr * 1.02, ang, C.b, '#b8b4a8', 0.04); if (lod <= 1) for (let i = 0; i < 5; i++) { const a = ang + i * 1.26; lkCirc(g, cx + Math.cos(a) * hr * 0.55, cy + Math.sin(a) * hr * 0.55, hr * 0.42, C.l); } break;
    case 'headband': case 'sweatband': g.strokeStyle = hd === 'headband' ? L.ac.b : L.ac.b; g.lineWidth = hr * 0.24; g.beginPath(); g.ellipse(x, y, hr * 0.86, hr * 0.82, ang, 0, TAU); g.stroke(); break;
    case 'bandana': lkEll(g, cx, cy, hr * 0.95, hr * 0.9, ang, C.b, C.o, 0.04); g.fillStyle = C.d; g.beginPath(); g.moveTo(x - fdx * hr * 0.9, y - fdy * hr * 0.9); g.lineTo(x - fdx * hr * 1.5 - fdy * 0.12, y - fdy * hr * 1.5 + fdx * 0.12); g.lineTo(x - fdx * hr * 1.4 + fdy * 0.16, y - fdy * hr * 1.4 - fdx * 0.16); g.closePath(); g.fill(); break;
    case 'beanie': case 'surgcap': lkEll(g, cx, cy, hr * 0.98, hr * 0.94, ang, lkShade(g, cx, cy, hr, C), C.o, 0.04); if (hd === 'beanie' && lod <= 1) lkCirc(g, cx - fdx * hr * 0.1, cy - fdy * hr * 0.1, hr * 0.28, C.l); break;
    case 'hazhood': lkEll(g, x, y, hr * 1.22, hr * 1.15, ang, lkShade(g, x, y, hr * 1.2, L.cl), L.cl.o, 0.05); if (!down) { g.fillStyle = 'rgba(40,60,70,0.85)'; g.beginPath(); g.ellipse(x + fdx * hr * (0.55 - 0.45 * vis), y + fdy * hr * (0.55 - 0.45 * vis), hr * 0.62, hr * (0.35 + 0.35 * vis), ang + Math.PI / 2, 0, TAU); g.fill(); if (lod <= 1) { g.fillStyle = 'rgba(200,240,255,0.3)'; g.beginPath(); g.ellipse(x + fdx * hr * 0.5 - fdy * 0.1, y + fdy * hr * 0.5 + fdx * 0.1, hr * 0.2, hr * 0.12, ang, 0, TAU); g.fill(); } } break;
    case 'spacehelm': lkEll(g, x, y, hr * 1.35, hr * 1.3, ang, lkShade(g, x, y, hr * 1.3, lkSet([232, 232, 226])), '#5a5a58', 0.05); if (!down) { const vx = x + fdx * hr * (0.5 - 0.45 * vis), vy = y + fdy * hr * (0.5 - 0.45 * vis); const gr = lod <= 1 ? g.createLinearGradient(vx - fdy * hr, vy + fdx * hr, vx + fdy * hr, vy - fdx * hr) : null; if (gr) { gr.addColorStop(0, '#b8862a'); gr.addColorStop(0.5, '#f2d27a'); gr.addColorStop(1, '#6a4a12'); } g.fillStyle = gr || '#c8962a'; g.beginPath(); g.ellipse(vx, vy, hr * 0.9, hr * (0.45 + 0.5 * vis), ang + Math.PI / 2, 0, TAU); g.fill(); } break;
    case 'riothelm': lkEll(g, x, y, hr * 1.18, hr * 1.12, ang, lkShade(g, x, y, hr * 1.15, lkSet([34, 36, 40])), '#0a0a0c', 0.05); if (!down) { g.fillStyle = 'rgba(120,150,180,0.55)'; g.beginPath(); g.ellipse(x + fdx * hr * (0.6 - 0.5 * vis), y + fdy * hr * (0.6 - 0.5 * vis), hr * 0.85, hr * (0.32 + 0.4 * vis), ang + Math.PI / 2, 0, TAU); g.fill(); } break;
    case 'hood': lkEll(g, x - fdx * hr * 0.15, y - fdy * hr * 0.15, hr * 1.2, hr * 1.12, ang, lkShade(g, x, y, hr * 1.2, L.cl), L.cl.o, 0.05); if (!down && vis < 0.6) { g.fillStyle = '#0a0a0a'; g.beginPath(); g.ellipse(x + fdx * hr * 0.55, y + fdy * hr * 0.55, hr * 0.62, hr * 0.32, ang + Math.PI / 2, 0, TAU); g.fill(); const c = L.eyeRGB; g.fillStyle = L.eye; for (const sd of [-1, 1]) lkCirc(g, x + fdx * hr * 0.6 - fdy * sd * hr * 0.25, y + fdy * hr * 0.6 + fdx * sd * hr * 0.25, hr * 0.1, L.eye); } break;
    case 'veil': { g.fillStyle = 'rgba(245,242,236,0.55)'; g.beginPath(); g.ellipse(x - fdx * hr * 1.0, y - fdy * hr * 1.0, hr * 1.3, hr * 1.8, ang + Math.PI / 2, 0, TAU); g.fill(); lkEll(g, cx, cy, hr * 0.55, hr * 0.5, ang, '#e8e2d4', null); if (lod <= 1) { g.fillStyle = '#f2e8d0'; for (let i = 0; i < 5; i++) { const a = ang + Math.PI * 0.6 + i * 0.35; lkCirc(g, x + Math.cos(a) * hr * 0.7, y + Math.sin(a) * hr * 0.7, 0.05, '#f2f0e0'); } } break; }
    case 'divemask': if (!down) { g.strokeStyle = '#1a1a1a'; g.lineWidth = hr * 0.18; g.beginPath(); g.ellipse(x, y, hr * 0.9, hr * 0.86, ang, 0, TAU); g.stroke(); g.fillStyle = 'rgba(60,140,180,0.7)'; g.beginPath(); g.ellipse(x + fdx * hr * (0.55 - 0.45 * vis), y + fdy * hr * (0.55 - 0.45 * vis), hr * 0.55, hr * (0.3 + 0.35 * vis), ang + Math.PI / 2, 0, TAU); g.fill(); g.strokeStyle = '#f2c418'; g.lineWidth = 0.07; g.beginPath(); g.moveTo(x + fdy * hr * 0.6, y - fdx * hr * 0.6); g.lineTo(x + fdy * hr * 0.6 - fdx * hr * 0.9, y - fdx * hr * 0.6 - fdy * hr * 0.9); g.stroke(); } break;
    case 'goggles': break;
    case 'respirator': if (!down) { lkCirc(g, x + fdx * hr * (0.75 - 0.5 * vis), y + fdy * hr * (0.75 - 0.5 * vis), hr * 0.38, '#2a2c2a'); for (const sd of [-1, 1]) lkCirc(g, x + fdx * hr * (0.6 - 0.4 * vis) - fdy * sd * hr * 0.45, y + fdy * hr * (0.6 - 0.4 * vis) + fdx * sd * hr * 0.45, hr * 0.24, '#4a5a3a'); } break;
    case 'mushrooms': { const cs = ['#c98b4a', '#b87a3a', '#d8a060']; for (let i = 0; i < 4; i++) { const a = ang + Math.PI * 0.5 + i * 0.9; const mx = cx + Math.cos(a) * hr * 0.45, my = cy + Math.sin(a) * hr * 0.45; lkEll(g, mx, my, hr * (0.42 - i * 0.05), hr * (0.38 - i * 0.05), a, cs[i % 3], '#5a3a1a', 0.03); if (lod <= 1) lkCirc(g, mx, my, hr * 0.08, '#f2e0c0'); } break; }
  }
  // goggles over whatever else, on the forehead
  if ((hd === 'goggles' || L.F.goggles) && !down) { g.strokeStyle = '#2a2a2a'; g.lineWidth = hr * 0.16; g.beginPath(); g.ellipse(x, y, hr * 0.92, hr * 0.88, ang, 0, TAU); g.stroke(); for (const sd of [-1, 1]) { const qx = x + fdx * hr * (0.62 - 0.45 * vis) - fdy * sd * hr * 0.32, qy = y + fdy * hr * (0.62 - 0.45 * vis) + fdx * sd * hr * 0.32; lkCirc(g, qx, qy, hr * 0.24, '#2a2a2a'); lkCirc(g, qx, qy, hr * 0.17, L.key === 'skipatrol' || L.key === 'climber' ? 'rgba(242,164,58,0.85)' : 'rgba(170,220,230,0.8)'); } }
  if (L.F.icicles && lod <= 1) { g.fillStyle = 'rgba(220,245,255,0.8)'; for (let i = 0; i < 4; i++) { const a = ang + Math.PI * 0.6 + i * 0.5; g.beginPath(); g.moveTo(x + Math.cos(a - 0.1) * hr, y + Math.sin(a - 0.1) * hr); g.lineTo(x + Math.cos(a) * hr * 1.5, y + Math.sin(a) * hr * 1.5); g.lineTo(x + Math.cos(a + 0.1) * hr, y + Math.sin(a + 0.1) * hr); g.fill(); } }
}
/* ---- what moves on it: flies, sparks, embers, spores, frost breath, the glow of the irradiated ---- */
function lkFx(g, m, pose, o) {
  const L = m.al, F = L.F, t = o.t || 0, sx = lkX(JN.sc), sy = lkY(JN.sc), hx = lkX(JN.head), hy = lkY(JN.head);
  if (F.flies) { g.fillStyle = '#16120a'; for (let i = 0; i < 5; i++) { const a = t * (3 + i * 0.7) + i * 1.9, rr = 0.9 + 0.35 * Math.sin(t * 2 + i); g.fillRect(hx + Math.cos(a) * rr - 0.04, hy + Math.sin(a * 1.3) * rr - 0.04, 0.08, 0.08); } }
  if (F.sparks && Math.random() < 0.5) { g.strokeStyle = '#fff36b'; g.lineWidth = 0.04; g.beginPath(); let x = sx + (Math.random() - 0.5), y = sy + (Math.random() - 0.5); g.moveTo(x, y); for (let i = 0; i < 3; i++) { x += (Math.random() - 0.5) * 0.5; y += (Math.random() - 0.5) * 0.5; g.lineTo(x, y); } g.stroke(); }
  if (F.embers) { g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { const ph = (t * 0.7 + i * 0.25) % 1, a = i * 1.7; g.fillStyle = 'rgba(255,' + (120 + i * 20) + ',40,' + (0.8 * (1 - ph)).toFixed(2) + ')'; g.beginPath(); g.arc(sx + Math.cos(a) * 0.5 - ph * 0.3, sy + Math.sin(a) * 0.5 + ph * 0.2, 0.07, 0, TAU); g.fill(); } g.globalCompositeOperation = 'source-over'; }
  if (F.spores) { g.fillStyle = 'rgba(220,190,120,0.45)'; for (let i = 0; i < 6; i++) { const ph = (t * 0.4 + i / 6) % 1, a = i * 2.3; g.beginPath(); g.arc(sx + Math.cos(a) * (0.6 + ph * 0.9), sy + Math.sin(a) * (0.6 + ph * 0.9), 0.06 * (1 - ph) + 0.02, 0, TAU); g.fill(); } }
  if (L.glowSkin || F.trefoil) { const night = CORE.frame.night || 0; if (night > 0.2 || o.preview) { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(200,255,60,' + (0.08 + 0.08 * Math.sin(t * 3)).toFixed(3) + ')'; g.beginPath(); g.arc(sx, sy, 1.8, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; } }
  if (F.drip && Math.random() < 0.3) { g.fillStyle = 'rgba(160,200,210,0.6)'; g.beginPath(); g.arc(sx + (Math.random() - 0.5) * 1.4, sy + (Math.random() - 0.5) * 1.4, 0.05, 0, TAU); g.fill(); }
}

/* ---- light on anything round seen from above (the player, a teammate): lit on the side facing the light, shaded on
   the other, a rim of the light's colour where it grazes the edge. g is in the thing's own turned frame. ---- */
function lookShade(g, L, rx, ry, k) {
  if (!L || !(L.k > 0.05)) return;
  const lx = L.x, ly = L.y, kk = k == null ? 1 : k;
  g.save(); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.clip();
  const sh = g.createLinearGradient(lx * rx, ly * ry, -lx * rx, -ly * ry);
  sh.addColorStop(0, 'rgba(' + L.c + ',' + (0.22 * L.k * kk).toFixed(3) + ')'); sh.addColorStop(0.45, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,' + (0.3 * kk).toFixed(3) + ')');
  g.fillStyle = sh; g.fillRect(-rx, -ry, rx * 2, ry * 2);
  g.restore();
  if (L.rim > 0.08) { const a = Math.atan2(ly, lx); g.strokeStyle = 'rgba(' + L.c + ',' + Math.min(0.7, L.rim * 0.65 * kk).toFixed(3) + ')'; g.lineWidth = Math.max(0.8, rx * 0.09); g.beginPath(); g.ellipse(0, 0, rx * 0.96, ry * 0.96, 0, a - 0.85, a + 0.85); g.stroke(); }
}

// the new roster joins the game (its rigs, looks and animations built once, here)
zrBuild();
