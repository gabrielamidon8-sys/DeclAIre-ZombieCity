/* ================= the look of the 2.0 zombies: drawing a posed body (LOOK v2, 1.9.998) =================
   The animation engine hands over a pose; this turns it into a skeleton and draws it seen from above, in the zombie's
   own frame (x forward, y to its right, units of its radius, about 31 cm). 1.9.998 redraws every one at its real
   proportions and in far more detail:
   - Limbs are tapered and round: a deltoid cap on the shoulder, an upper arm narrowing to the elbow, a forearm full at
     the elbow and slim at the wrist, a thigh and a shin, each shaded across its width by the light that falls on it.
   - Hands are a palm, four fingers and a thumb (spread, hooked or closed by the grip; claws, gloves, missing fingers,
     frostbitten tips); feet wear their own shoes: dress shoes, sneakers with white soles and laces, boots, heels,
     sandals, slippers, clogs, cleats, shoe covers, crampons, flippers, clown shoes, one shoe lost, or bare toes.
   - The torso is the shoulder girdle seen from above (round deltoids, the trapezius ridge, shoulder blades and the
     spine down the back), joined to the hips when it leans or falls, with the belly of the heavy and the bloated.
   - The head is 16 cm wide and 20 deep, with ears, the tip of the nose and a brow; hair has its own shape, strands and
     a sheen toward the light (a hairline, a crown, a bald spot that shines); the face shows when it looks up.
   - Clothes keep their cut (collars, ties, lapels, vests, patterns) and gain the details of the job: buttons, pockets,
     lanyards and badges, name tags, radios and holsters, patches, a stethoscope, dog tags, pouches and bandoliers,
     tool belts, a fanny pack, rolled sleeves and cuffs, rips, bullet holes; the Linebacker's helmet with its cage,
     shoulder pads and number.
   - What the infection and the dead months did: mottled skin, scalp wounds, a bitten-off ear, teeth through a torn
     cheek, an empty eye socket, maggots, mould, algae and barnacles, blisters, cracked dry skin, scars and staples, and
     on each one its own blood, rips and bites (from its own seed, so no two in a crowd look alike).
   - Light: big parts shaded toward the light (its colour too), a soft shadow under the head and the arms, a lit rim on
     the side facing a lamp; things higher up are drawn a little bigger. Small cached pictures skip the fine work. */
const LK_TOP = {
  shirt: { sl: 2, collar: 1 }, tank: { sl: 0, straps: 1 }, uniform: { sl: 1, collar: 1, pocket: 1 }, cardigan: { sl: 2, open: 1 }, hawaii: { sl: 1, pat: 'floral', collar: 1 },
  vest: { sl: 1, hivis: 1 }, scrubs: { sl: 1, vneck: 1 }, chef: { sl: 2, dbl: 1 }, suit: { sl: 2, lapel: 1 }, plaid: { sl: 2, pat: 'plaid' }, coverall: { sl: 2, zip: 1 },
  police: { sl: 1, collar: 1, epaul: 1, badge: 1 }, medic: { sl: 2, refl: 1 }, jumpsuit: { sl: 1, zip: 1 }, studs: { sl: 0, pat: 'studs', vestover: 1 }, rags: { sl: 1, torn: 1 },
  leather: { sl: 2, zip: 1, collar: 1, pat: 'studs' }, gown: { sl: 1, gownback: 1 }, clown: { sl: 2, pat: 'dots' }, hazmat: { sl: 2, suit: 1 }, hunter: { sl: 2, pat: 'camo', orange: 1 },
  wetsuit: { sl: 2, wet: 1 }, ski: { sl: 2, two: 1, puffy: 1 }, camo: { sl: 2, pat: 'camo' }, dress: { sl: 0, straps: 1, lace: 1 }, labcoat: { sl: 2, open: 1, coat: 1 },
  work: { sl: 2, collar: 1 }, riot: { sl: 2, armor: 1, puffy: 1 }, none: { sl: 0, bare: 1 }, space: { sl: 2, suit: 1, puffy: 1 }, hood: { sl: 2, hoodie: 1 }, parka: { sl: 2, puffy: 1, fur: 1 },
  wraps: { sl: 2, pat: 'wraps' }, jersey: { sl: 1, mesh: 1, jersey: 1 }
};
const LK_BOT = {
  slacks: { len: 2 }, shorts: { len: 1 }, jeans: { len: 2 }, check: { len: 2, pat: 'check' }, overalls: { len: 2, bib: 1 }, scrubs: { len: 2, top: 1 }, coverall: { len: 2, top: 1 }, jumpsuit: { len: 2, top: 1 },
  none: { len: 0 }, baggy: { len: 2, wide: 1 }, camo: { len: 2 }, wetsuit: { len: 2, top: 1 }, skipants: { len: 2, puffy: 1 }, skirt: { len: 2, skirt: 1 }, rags: { len: 1, torn: 1 }, riot: { len: 2, top: 1 },
  pants: { len: 2 }, space: { len: 2, top: 1, puffy: 1 }, wraps: { len: 2, top: 1 }, hazmat: { len: 2, top: 1 }, football: { len: 1.6, knee: 1 }
};
function lkRGB(hex) { const n = parseInt(String(hex || '#777777').slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function lkSh(c, k) { return k < 0 ? [c[0] * (1 + k), c[1] * (1 + k), c[2] * (1 + k)] : [c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k]; }
function lkMix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function lkCss(c, a) { return a == null ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')' : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; }
// a set of shades of one colour: base, dark, light, outline, highlight (and the rgb)
function lkSet(c) { return { b: lkCss(c), d: lkCss(lkSh(c, -0.3)), l: lkCss(lkSh(c, 0.22)), o: lkCss(lkSh(c, -0.62)), hl: lkCss(lkSh(c, 0.45), 0.55), m: lkCss(lkSh(c, -0.15)), sh: lkCss(lkSh(c, -0.45), 0.5), rgb: c }; }
const LK_SHOE_DEF = { dress: '#241e1a', sneaker: '#3a4a6a', boot: '#3a2a1e', heel: '#7a1420', sandal: '#8a6a4a', slipper: '#c8a8c0', clog: '#3a6a7a', cleat: '#161618', cover: '#7aa8d8', crampon: '#2a2a30', bare: '#000', flipper: '#1a1a1a', big: '#c8202a', oneshoe: '#2a2420' };
function lookBuild(m) {
  const d = m.def, F = {}; for (const f of d.feat || []) F[f] = 1; for (const f of d.det || []) F[f] = 1;
  const T = LK_TOP[d.top] || LK_TOP.shirt, B = LK_BOT[d.bottom] || LK_BOT.slacks;
  const sk = lkRGB(d.skin), cl = lkRGB(d.cloth), c2 = lkRGB(d.cloth2), ac = lkRGB(d.acc), hr = lkRGB(d.hairCol), cp = lkRGB(d.capCol || d.acc);
  const pants = B.top ? cl : c2;
  // the shoes: given by the definition, or what the outfit implies
  let shoe = d.shoe || (F.flippers ? 'flipper' : F.bigshoes ? 'big' : d.top === 'space' || d.top === 'hazmat' ? 'boot' : 'dress');
  if (d.body === 'legless') shoe = 'bare';
  const shoeCol = d.shoeCol || (shoe === 'boot' && (d.top === 'space' || d.top === 'hazmat') ? '#d8d8d0' : LK_SHOE_DEF[shoe] || '#26221e');
  const L = { F: F, T: T, B: B, top: d.top, bottom: d.bottom, head: d.head, hair: d.hair, hold: d.hold, tie: !!d.tie, beard: !!d.beard,
    skin: lkSet(sk), cl: lkSet(cl), c2: lkSet(c2), ac: lkSet(ac), hr: lkSet(hr), cap: lkSet(cp), pants: lkSet(pants), holdC: lkSet(lkRGB(d.holdCol || '#5a4a3a')),
    shoeK: shoe, shoe: lkSet(lkRGB(shoeCol)),
    eye: d.eye, eyeRGB: lkRGB(d.eye), gore: (m.S && m.S.gore) || '#5a0d0d',
    sleeve: T.sl, bare: !!T.bare, glowSkin: d.key === 'glow', key: d.key,
    // the dead's own colours: livor (pooled blood), a bruise, the wet red of a wound and its dark core, bone
    livor: lkCss(lkMix(sk, [90, 60, 110], 0.45), 0.42), bruise: lkCss(lkMix(sk, [60, 70, 40], 0.5), 0.45), wound: 'rgba(132,18,20,0.85)', woundD: 'rgba(42,4,6,0.92)', bone: '#ddd3b6' };
  L.sleeveC = T.hivis ? L.ac : L.cl;
  if (d.top === 'suit') L.shirtC = lkSet(lkRGB('#e8e6e0'));
  if (d.top === 'labcoat') L.shirtC = L.c2;
  if (d.top === 'cardigan') L.shirtC = L.ac;
  // gloves: what colour (rubber, nitrile, leather, the suits' own)
  const gl = F.gloves || d.top === 'hazmat' || d.top === 'space' || d.top === 'riot';
  L.glove = !gl ? null : d.top === 'space' || d.top === 'hazmat' ? L.cl : lkSet(lkRGB(d.key === 'janitor' ? '#d8c43a' : d.key === 'medic' || d.key === 'lab' || d.key === 'surgeon' ? '#7aa0d8' : d.key === 'clown' ? '#f2f2ee' : d.key === 'lineman' ? '#c8642a' : d.key === 'climber' || d.key === 'skipatrol' ? '#2a2c34' : '#3a3632'));
  return L;
}

/* ---------- drawing ---------- */
const LKP = new Float32Array(NJ * 3);   // the skeleton projected onto the ground (x, y, scale)
let LKG = null, LKL = null, LKO = null, LKM = null, LKSEV = 0;
function lkX(i) { return LKP[i * 3]; } function lkY(i) { return LKP[i * 3 + 1]; } function lkK(i) { return LKP[i * 3 + 2]; }
function lkSeg(g, x1, y1, x2, y2, w, col, out) {
  if (out) { g.strokeStyle = out; g.lineWidth = w + 0.09; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
}
function lkEll(g, x, y, rx, ry, rot, fill, out, ow) {
  g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (out) { g.strokeStyle = out; g.lineWidth = ow || 0.06; g.stroke(); }
}
function lkCirc(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); g.fillStyle = fill; g.fill(); }
// a tapered capsule: the outline round two circles (x1, y1, r1) and (x2, y2, r2) and the lines tangent to both
function lkCap(g, x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
  g.beginPath();
  if (d <= Math.abs(r1 - r2) + 1e-4) { if (r1 >= r2) g.arc(x1, y1, Math.max(0.01, r1), 0, TAU); else g.arc(x2, y2, Math.max(0.01, r2), 0, TAU); return; }
  const a = Math.atan2(dy, dx), th = Math.acos(clamp((r1 - r2) / d, -1, 1));
  g.arc(x1, y1, Math.max(0.01, r1), a + th, a - th + TAU);
  g.arc(x2, y2, Math.max(0.01, r2), a - th, a + th);
  g.closePath();
}
// a round limb: its colour, shaded across its width by the light (bright on the lit side, dark on the far one), an outline
function lkLimb2(g, x1, y1, r1, x2, y2, r2, S, lit, noOut) {
  lkCap(g, x1, y1, r1, x2, y2, r2);
  if (lit && LKL && LKO.lod <= 1) {
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1; let nx = -dy / l, ny = dx / l; if (nx * LKL.x + ny * LKL.y < 0) { nx = -nx; ny = -ny; }
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, r = Math.max(r1, r2), gr = g.createLinearGradient(mx + nx * r, my + ny * r, mx - nx * r, my - ny * r);
    gr.addColorStop(0, S.l); gr.addColorStop(0.42, S.b); gr.addColorStop(1, S.d); g.fillStyle = gr;
  } else g.fillStyle = S.b;
  g.fill();
  if (!noOut) { g.strokeStyle = S.o; g.lineWidth = LKO.lod <= 1 ? 0.045 : 0.06; g.stroke(); }
}
// the old flat limb (for small things: straps, a stump)
function lkLimb(g, x1, y1, x2, y2, w, S, lit) { lkLimb2(g, x1, y1, w / 2, x2, y2, w / 2, S, lit); }
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
  g.strokeStyle = 'rgba(' + LKL.c + ',' + Math.min(0.75, LKL.rim * 0.7) + ')'; g.lineWidth = 0.06;
  g.beginPath(); g.ellipse(x, y, rx * 0.97, ry * 0.97, rot || 0, a - 0.9, a + 0.9); g.stroke();
}
// a soft dark shadow (ambient occlusion) that one part throws on what is under it, away from the light
function lkAO(g, x, y, r, a) {
  if (LKO.lod > 1) return;
  const ox = LKL ? -LKL.x * r * 0.35 : 0, oy = LKL ? -LKL.y * r * 0.35 : 0, gr = g.createRadialGradient(x + ox, y + oy, r * 0.2, x + ox, y + oy, r);
  gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x + ox, y + oy, r, 0, TAU); g.fill();
}
// a seeded random for things that are this one zombie's (its wounds, its blood), from its id
function lkRand(seed) { let s = ((seed | 0) * 2654435761 >>> 0) % 2147483646 + 1; return () => (s = s * 16807 % 2147483647) / 2147483647; }
// a ragged blob (blood, a wound, a patch of mould)
function lkBlob(g, R, x, y, r, col, n) { g.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * TAU, rr = r * (0.62 + R() * 0.55); if (i === 0) g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fillStyle = col; g.fill(); }
// block digits (a jersey number), h tall, centred at x, y, drawn in the current frame
const LK_DIG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcfgd' };
function lkDigits(g, str, x, y, h, col) {
  const w = h * 0.52, gap = h * 0.2, n = str.length, tot = n * w + (n - 1) * gap; g.strokeStyle = col; g.lineWidth = h * 0.17; g.lineCap = 'square';
  for (let i = 0; i < n; i++) {
    const s = LK_DIG[str[i]] || '', x0 = x - tot / 2 + i * (w + gap), y0 = y - h / 2, P = { a: [0, 0, 1, 0], b: [1, 0, 1, 0.5], c: [1, 0.5, 1, 1], d: [0, 1, 1, 1], e: [0, 0.5, 0, 1], f: [0, 0, 0, 0.5], g: [0, 0.5, 1, 0.5] };
    g.beginPath(); for (const k of s) { const q = P[k]; g.moveTo(x0 + q[0] * w, y0 + q[1] * h); g.lineTo(x0 + q[2] * w, y0 + q[3] * h); } g.stroke();
  }
  g.lineCap = 'round';
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
    const ex = fall > 0.4 ? Math.hypot(lkX(JN.head) - lkX(JN.ftL), lkY(JN.head) - lkY(JN.ftL)) * 0.55 : 1.0, ang = fall > 0.4 ? Math.atan2(lkY(JN.head) - cy, lkX(JN.head) - cx) : 0;
    const air = Math.max(0, (J[JN.pel * 3 + 2] - D.legL) / H) * 4, sx = fall > 0.4 ? (cx + lkX(JN.head)) / 2 : 0.04, sy = fall > 0.4 ? (cy + lkY(JN.head)) / 2 : 0.03, rx = Math.max(0.9, ex) * (1 + air), ry = (fall > 0.4 ? 0.75 : 0.82) * (1 + air);
    if (o.lod <= 1) {
      // soft edged: darker under the body, fading out
      g.save(); g.translate(sx, sy); g.rotate(ang); g.scale(1, ry / rx); const gr = g.createRadialGradient(0, 0, rx * 0.25, 0, 0, rx);
      gr.addColorStop(0, 'rgba(0,0,0,' + (0.34 - Math.min(0.2, air)).toFixed(3) + ')'); gr.addColorStop(0.7, 'rgba(0,0,0,' + (0.2 - Math.min(0.12, air * 0.6)).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
    } else { g.fillStyle = 'rgba(0,0,0,' + (0.28 - Math.min(0.18, air)) + ')'; g.beginPath(); g.ellipse(sx, sy, rx, ry, ang, 0, TAU); g.fill(); }
  }
  if (o.burn && !dead && LKO.lod <= 1) { g.fillStyle = 'rgba(255,120,30,0.18)'; g.beginPath(); g.arc(0, 0, 1.6, 0, TAU); g.fill(); }
  // which parts are higher: legs first, then the body, the arms above or below it, the head last
  const chestZ = J[JN.chest * 3 + 2], aLz = (J[JN.elL * 3 + 2] + J[JN.haL * 3 + 2]) / 2, aRz = (J[JN.elR * 3 + 2] + J[JN.haR * 3 + 2]) / 2;
  lkLeg(g, m, -1); lkLeg(g, m, 1);
  if (L.B.skirt) lkSkirt(g, m, pose);
  const armLBelow = aLz < chestZ + 0.1 * H, armRBelow = aRz < chestZ + 0.1 * H;
  if (armLBelow) lkArm(g, m, -1, pose);
  if (armRBelow) lkArm(g, m, 1, pose);
  if (L.F.entrails) lkEntrails(g, m);
  lkTorso(g, m, pose);
  // the arms over the body throw a soft shadow on it
  if (LKO.lod <= 1 && !dead) { if (!armLBelow) lkAO(g, (lkX(JN.elL) + lkX(JN.haL)) / 2, (lkY(JN.elL) + lkY(JN.haL)) / 2, D.limb * 1.2, 0.18); if (!armRBelow) lkAO(g, (lkX(JN.elR) + lkX(JN.haR)) / 2, (lkY(JN.elR) + lkY(JN.haR)) / 2, D.limb * 1.2, 0.18); }
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
  const D = m.ad, L = m.al, F = L.F, hi = side < 0 ? JN.hipL : JN.hipR, ki = hi + 1, fi = hi + 2, ti = side < 0 ? JN.toeL : JN.toeR, lod = LKO.lod;
  const hx = lkX(hi), hy = lkY(hi), kx = lkX(ki), ky = lkY(ki), fx = lkX(fi), fy = lkY(fi), tx = lkX(ti), ty = lkY(ti);
  const wide = L.B.wide ? 1.22 : L.B.puffy ? 1.14 : 1, rt = D.leg * 0.5 * lkK(hi) * wide, rk = D.leg * 0.4 * lkK(ki) * wide, rs = D.shin * 0.46 * lkK(ki), ra = D.shin * 0.3 * lkK(fi), lit = lod <= 1;
  const len = L.B.len, Pc = L.pants, S = L.skin;
  if (D.legless) {
    // stumps, wrapped or raw, the bone end showing
    lkLimb2(g, hx, hy, rt, kx, ky, rt * 0.86, len ? Pc : S, lit); lkCirc(g, kx, ky, rt * 0.62, F.entrails ? '#6a1a1a' : '#5a1416'); if (lod <= 1) lkCirc(g, kx, ky, rt * 0.24, L.bone);
    return;
  }
  // the thigh and the shin, in skin or what covers them (shorts stop short; a long garment covers both)
  lkLimb2(g, hx, hy, rt, kx, ky, rk, len >= 1 ? Pc : S, lit);
  if (len === 1) { const mx = hx + (kx - hx) * 0.6, my = hy + (ky - hy) * 0.6; lkLimb2(g, mx, my, rt * 0.88, kx, ky, rk, S, lit); if (lod <= 1) { g.strokeStyle = Pc.d; g.lineWidth = 0.05; lkCap(g, mx, my, rt * 0.92, mx + (kx - mx) * 0.02, my + (ky - my) * 0.02, rt * 0.92); g.stroke(); } }
  lkLimb2(g, kx, ky, rs * wide, fx, fy, ra * wide, len >= 1.6 ? Pc : S, lit);
  if (len === 1.6) { const mx = kx + (fx - kx) * 0.15, my = ky + (fy - ky) * 0.15; lkLimb2(g, mx, my, rs * 0.9, fx, fy, ra, F.socks ? L.cl : S, lit); }
  if (lod <= 1) {
    if (F.socks && len < 2) { const sx = kx + (fx - kx) * 0.62, sy = ky + (fy - ky) * 0.62; lkLimb2(g, sx, sy, rs * 0.8, fx, fy, ra * 1.05, L.key === 'linebacker' ? L.cl : lkSet([232, 230, 222]), lit); }
    if (F.kneepads || L.B.knee) lkEll(g, kx, ky, rk * 1.15, rk * 0.95, Math.atan2(ky - hy, kx - hx), '#e8e2d0', '#8a8478', 0.04);
    if (F.legknife && side > 0) { const mx = kx + (fx - kx) * 0.45, my = ky + (fy - ky) * 0.45; lkSeg(g, mx - (fx - kx) * 0.2, my - (fy - ky) * 0.2, mx + (fx - kx) * 0.25, my + (fy - ky) * 0.25, 0.09, '#2a2a2c', '#0a0a0a'); }
    if (F.rips && len >= 2) { const mx = kx + (hx - kx) * 0.2, my = ky + (hy - ky) * 0.2; lkEll(g, mx, my, rk * 0.6, rk * 0.35, Math.atan2(ky - hy, kx - hx), S.b, null); g.strokeStyle = 'rgba(240,240,240,0.5)'; g.lineWidth = 0.025; g.stroke(); }
    if (F.grass) lkEll(g, kx, ky, rk * 0.7, rk * 0.5, 0, 'rgba(70,110,40,0.45)', null);
  }
  if (F.bonelegs) lkSeg(g, kx, ky, fx + (fx - kx) * 0.2, fy + (fy - ky) * 0.2, rs * 0.7, L.bone, '#6b6150');
  if (F.pads && len) lkCirc(g, kx, ky, rs * 1.25, '#2a2c30');
  if (F.tape) { const mx = kx + (fx - kx) * 0.8, my = ky + (fy - ky) * 0.8; lkCirc(g, mx, my, rs * 1.1, '#9aa0a6'); }
  if (L.B.torn && lod <= 1) lkLimb2(g, kx, ky, rs * 0.9, kx + (fx - kx) * 0.35, ky + (fy - ky) * 0.35, rs * 0.8, S, lit);
  lkShoe(g, m, side, fx, fy, tx, ty, ra);
}
// the foot or what it wears, from the ankle (ax, ay) toward the toe
function lkShoe(g, m, side, ax, ay, tx, ty, ra) {
  const L = m.al, D = m.ad, F = L.F, lod = LKO.lod, S = L.skin, k = lkK(JN.ftL);
  let st = L.shoeK; if (st === 'oneshoe') st = side > 0 ? 'bare' : 'dress';
  const dx = tx - ax, dy = ty - ay, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl, nx = -uy, ny = ux;
  const fl = (st === 'flipper' ? 1.75 : st === 'big' ? 1.6 : st === 'boot' || st === 'crampon' ? 1.1 : st === 'heel' ? 1.02 : 1) * D.foot * 0.92, w = Math.max(0.13, D.shin * 0.42) * k * (st === 'big' ? 1.45 : st === 'boot' || st === 'crampon' ? 1.12 : st === 'heel' ? 0.82 : st === 'clog' ? 1.15 : 1);
  const hx = ax - ux * w * 0.55, hy = ay - uy * w * 0.55, ex = ax + ux * fl, ey = ay + uy * fl, rH = w * 0.72, rT = w * (st === 'heel' ? 0.5 : st === 'flipper' ? 1.5 : 0.88);
  if (st === 'bare' || st === 'sandal') {
    lkLimb2(g, hx, hy, rH * 0.9, ex - ux * rT * 0.4, ey - uy * rT * 0.4, rT * 0.82, S, lod <= 1);
    if (lod <= 1) { for (let i = 0; i < 5; i++) { const o = (i - 2) * rT * 0.38, tl = rT * (i === 0 || i === 4 ? 0.1 : 0.22); lkCirc(g, ex + nx * o - ux * (0.03 + Math.abs(i - 1.5) * 0.02) + ux * tl * 0.2, ey + ny * o - uy * (0.03 + Math.abs(i - 1.5) * 0.02) + uy * tl * 0.2, rT * (i === 1 ? 0.26 : 0.2), F.frostbite ? '#2a3240' : S.d); } }
    if (st === 'sandal') { g.strokeStyle = L.shoe.b; g.lineWidth = 0.06; for (const t of [0.25, 0.62]) { const px = hx + (ex - hx) * t, py = hy + (ey - hy) * t; g.beginPath(); g.moveTo(px + nx * w * 0.8, py + ny * w * 0.8); g.lineTo(px - nx * w * 0.8, py - ny * w * 0.8); g.stroke(); } }
    return;
  }
  const C = st === 'cover' ? lkSet([122, 168, 216]) : L.shoe;
  if (st === 'boot' || st === 'crampon') lkCirc(g, ax, ay, w * 0.95, C.m);   // the boot's shaft round the ankle
  lkLimb2(g, hx, hy, rH, ex, ey, rT, C, lod <= 1);
  if (lod > 1) return;
  if (st === 'sneaker' || st === 'cleat') { g.strokeStyle = st === 'cleat' ? '#e8e8e8' : '#eeeae0'; g.lineWidth = 0.035; lkCap(g, hx, hy, rH * 0.96, ex, ey, rT * 0.96); g.stroke(); }
  if (st === 'sneaker' || st === 'boot' || st === 'cleat') { g.strokeStyle = st === 'boot' ? 'rgba(20,14,10,0.6)' : 'rgba(250,250,245,0.7)'; g.lineWidth = 0.02; for (let i = 0; i < 3; i++) { const t = 0.15 + i * 0.13, px = ax + (ex - ax) * t, py = ay + (ey - ay) * t; g.beginPath(); g.moveTo(px + nx * w * 0.38, py + ny * w * 0.38); g.lineTo(px - nx * w * 0.38, py - ny * w * 0.38); g.stroke(); } }
  if (st === 'cleat') { g.strokeStyle = '#d8d8d8'; g.lineWidth = 0.03; g.beginPath(); g.moveTo(hx + nx * w * 0.6 * side, hy + ny * w * 0.6 * side); g.quadraticCurveTo(ax + nx * w * 0.8 * side, ay + ny * w * 0.8 * side, ex - ux * rT + nx * w * 0.5 * side, ey - uy * rT + ny * w * 0.5 * side); g.stroke(); }
  if (st === 'dress' || st === 'heel') { g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.ellipse(ex - ux * rT * 0.35 + (LKL ? LKL.x : 0) * rT * 0.2, ey - uy * rT * 0.35 + (LKL ? LKL.y : 0) * rT * 0.2, rT * 0.38, rT * 0.22, Math.atan2(uy, ux), 0, TAU); g.fill(); }
  if (st === 'heel') lkCirc(g, hx - ux * 0.03, hy - uy * 0.03, w * 0.22, '#1a0a0c');
  if (st === 'crampon') { g.fillStyle = '#b8bec4'; for (let i = 0; i < 6; i++) { const t = i / 5, px = hx + (ex - hx) * t, py = hy + (ey - hy) * t; for (const s2 of [-1, 1]) lkCirc(g, px + nx * s2 * w * 0.95, py + ny * s2 * w * 0.95, 0.025, '#b8bec4'); } }
  if (st === 'slipper') { g.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 4; i++) lkCirc(g, ex - ux * rT * 0.6 + nx * (i - 1.5) * rT * 0.4, ey - uy * rT * 0.6 + ny * (i - 1.5) * rT * 0.4, rT * 0.18, 'rgba(255,255,255,0.25)'); }
  if (st === 'flipper') { g.strokeStyle = 'rgba(80,120,160,0.4)'; g.lineWidth = 0.03; for (const s2 of [-0.5, 0, 0.5]) { g.beginPath(); g.moveTo(ax + nx * s2 * w, ay + ny * s2 * w); g.lineTo(ex + nx * s2 * rT * 1.4 + ux * rT * 0.5, ey + ny * s2 * rT * 1.4 + uy * rT * 0.5); g.stroke(); } }
  if (st === 'big') { g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(ex - ux * rT * 0.3, ey - uy * rT * 0.3, rT * 0.5, rT * 0.32, Math.atan2(uy, ux), 0, TAU); g.fill(); }
  if (F.grass && (st === 'cleat')) lkEll(g, ex - ux * rT * 0.5, ey - uy * rT * 0.5, rT * 0.4, rT * 0.3, 0, 'rgba(70,110,40,0.5)', null);
}
// the wedding dress's skirt, flowing round the legs
function lkSkirt(g, m, pose) {
  const D = m.ad, L = m.al, px = lkX(JN.pel), py = lkY(JN.pel), mx = (lkX(JN.ftL) + lkX(JN.ftR)) / 2, my = (lkY(JN.ftL) + lkY(JN.ftR)) / 2, fall = pose[AP.fall];
  const cx = px * 0.55 + mx * 0.45, cy = py * 0.55 + my * 0.45, sp = Math.hypot(lkX(JN.ftL) - lkX(JN.ftR), lkY(JN.ftL) - lkY(JN.ftR));
  const rx = D.hipW * 2.2 + sp * 0.35 + fall * 1.2, ry = D.hipW * 2.4 + sp * 0.3, ang = Math.atan2(my - py, mx - px);
  lkEll(g, cx, cy, Math.max(rx, Math.hypot(mx - px, my - py) * 0.7 + 0.6), ry, fall > 0.3 ? ang : 0, lkShade(g, cx, cy, ry, L.cl), L.cl.o, 0.05);
  if (LKO.lod <= 1) {
    g.strokeStyle = L.cl.d; g.lineWidth = 0.04; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(px, py); g.lineTo(cx + Math.cos(ang + i * 0.42) * rx * 0.92, cy + Math.sin(ang + i * 0.42) * ry * 0.92); g.stroke(); }
    // the hem dragged through the street: dirty, torn
    g.strokeStyle = 'rgba(70,60,48,0.45)'; g.lineWidth = 0.09; g.beginPath(); g.ellipse(cx, cy, Math.max(rx, 0.6) * 0.96, ry * 0.96, fall > 0.3 ? ang : 0, 0, TAU); g.stroke();
  }
}
/* ---- the torso ---- */
// the shoulder girdle seen from above, in the chest's own frame (x along the shoulders, -y its front): a flatter chest,
// round shoulders, the back rounding over the shoulder blades
function lkGirdle(g, W, Dd) {
  g.beginPath();
  g.moveTo(0, -Dd * 0.94);
  g.bezierCurveTo(W * 0.45, -Dd * 1.02, W * 0.86, -Dd * 0.8, W * 0.98, -Dd * 0.22);
  g.bezierCurveTo(W * 1.05, Dd * 0.3, W * 0.92, Dd * 0.86, W * 0.56, Dd * 0.97);
  g.bezierCurveTo(W * 0.3, Dd * 1.05, -W * 0.3, Dd * 1.05, -W * 0.56, Dd * 0.97);
  g.bezierCurveTo(-W * 0.92, Dd * 0.86, -W * 1.05, Dd * 0.3, -W * 0.98, -Dd * 0.22);
  g.bezierCurveTo(-W * 0.86, -Dd * 0.8, -W * 0.45, -Dd * 1.02, 0, -Dd * 0.94);
  g.closePath();
}
function lkTorso(g, m, pose) {
  const D = m.ad, L = m.al, T = L.T, F = L.F, lod = LKO.lod;
  const sx = lkX(JN.sc), sy = lkY(JN.sc), px = lkX(JN.pel), py = lkY(JN.pel), slx = lkX(JN.shL), sly = lkY(JN.shL), srx = lkX(JN.shR), sry = lkY(JN.shR);
  let ax = srx - slx, ay = sry - sly; const al = Math.hypot(ax, ay) || 1; ax /= al; ay /= al;
  const rot = Math.atan2(ay, ax), ks = lkK(JN.sc), kp = lkK(JN.pel), puffy = T.puffy ? 1.1 : 1;
  const W = D.chW * ks * puffy * (al / (2 * D.shW * ks) * 0.3 + 0.7), Dd = D.chD * ks * puffy;
  const C = L.bare ? L.skin : L.cl, hipC = L.B.len ? L.pants : L.skin;
  // the hips (seen when it leans, crouches or lies down) and the trunk up to the shoulders
  lkEll(g, px, py, D.hipW * 1.45 * kp, D.chD * 0.85 * kp, rot, lkShade(g, px, py, D.hipW * 1.4 * kp, hipC), hipC.o, 0.05);
  if (lod <= 1 && L.B.len) { g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.06; g.beginPath(); g.ellipse(px, py, D.hipW * 1.38 * kp, D.chD * 0.8 * kp, rot, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
  const cx = sx * 0.85 + px * 0.15 + (lkX(JN.chest) - sx) * 0.12, cy = sy * 0.85 + py * 0.15 + (lkY(JN.chest) - sy) * 0.12;
  const dx = cx - px, dy = cy - py, span = Math.hypot(dx, dy);
  if (span > 0.12) {
    const hw = D.hipW * 1.3 * kp, tw = W * 0.86;
    g.beginPath(); g.moveTo(cx - ax * tw, cy - ay * tw); g.lineTo(cx + ax * tw, cy + ay * tw); g.lineTo(px + ax * hw, py + ay * hw); g.lineTo(px - ax * hw, py - ay * hw); g.closePath();
    if (lod <= 1 && LKL) { const gr = g.createLinearGradient(px, py, cx, cy); gr.addColorStop(0, C.d); gr.addColorStop(1, C.b); g.fillStyle = gr; } else g.fillStyle = C.b;
    g.fill(); g.strokeStyle = C.o; g.lineWidth = 0.05; g.stroke();
    // a lying or bent body shows its back: the spine down it
    if (lod <= 1 && span > 0.5) { g.strokeStyle = L.bare ? L.skin.sh : 'rgba(0,0,0,0.18)'; g.lineWidth = 0.035; g.beginPath(); g.moveTo(cx, cy); g.lineTo(px, py); g.stroke(); }
  }
  // the belly (big on the heavy, huge on the bloated)
  if (D.belly > 0.1) {
    const bx = lkX(JN.belly), by = lkY(JN.belly), br = (0.45 + D.belly * 0.55) * D.chW * lkK(JN.belly);
    const bc = F.belly && L.top === 'none' ? L.skin : C;
    lkEll(g, bx, by, br, br * 0.92, rot, lkShade(g, bx, by, br, bc), bc.o, 0.05);
    if (lod <= 1) {
      if (F.boils) for (let i = 0; i < 6; i++) { const a = i * 1.1 + 0.4; lkCirc(g, bx + Math.cos(a) * br * 0.6, by + Math.sin(a) * br * 0.55, 0.07 + (i % 2) * 0.05, '#c8c86a'); lkCirc(g, bx + Math.cos(a) * br * 0.6 - 0.02, by + Math.sin(a) * br * 0.55 - 0.02, 0.025, 'rgba(255,255,220,0.6)'); }
      if (F.cracks && D.belly > 0.6) { g.strokeStyle = 'rgba(90,30,40,0.55)'; g.lineWidth = 0.025; for (let i = 0; i < 5; i++) { const a = i * 1.25; g.beginPath(); g.moveTo(bx + Math.cos(a) * br * 0.2, by + Math.sin(a) * br * 0.2); g.lineTo(bx + Math.cos(a + 0.2) * br * 0.55, by + Math.sin(a + 0.2) * br * 0.55); g.lineTo(bx + Math.cos(a - 0.1) * br * 0.85, by + Math.sin(a - 0.1) * br * 0.85); g.stroke(); } }
    }
  }
  // the shoulders and upper body, in the chest's frame
  g.save(); g.translate(cx, cy); g.rotate(rot);
  const lc = Math.cos(rot), ls = Math.sin(rot), Lx = LKL ? LKL.x * lc + LKL.y * ls : -0.5, Ly = LKL ? -LKL.x * ls + LKL.y * lc : -0.6;
  lkGirdle(g, W, Dd);
  if (lod <= 1 && LKL) { const gr = g.createRadialGradient(Lx * W * 0.35, Ly * Dd * 0.35, 0.05, 0, 0, Math.max(W, Dd) * 1.2); gr.addColorStop(0, C.l); gr.addColorStop(0.5 - 0.12 * LKL.k, C.b); gr.addColorStop(1, C.d); g.fillStyle = gr; }
  else g.fillStyle = C.b;
  g.fill(); g.strokeStyle = C.o; g.lineWidth = lod <= 1 ? 0.05 : 0.07; g.stroke();
  lkTex(g, L.bare ? 'skin' : 'cloth', 0.45); lkTex(g, 'grime', 0.3);
  // its shape under the light: the trapezius ridge across the top, the shoulder blades and the spine on the back, folds
  if (lod <= 1) {
    g.strokeStyle = C.hl; g.lineWidth = 0.07; g.beginPath(); g.moveTo(-W * 0.82, -Dd * 0.05); g.quadraticCurveTo(0, Dd * 0.14, W * 0.82, -Dd * 0.05); g.stroke();
    g.strokeStyle = L.bare ? L.skin.sh : C.sh; g.lineWidth = 0.035;
    for (const s2 of [-1, 1]) { g.beginPath(); g.arc(s2 * W * 0.42, Dd * 0.5, Math.min(W, Dd) * 0.42, s2 > 0 ? 0.2 : Math.PI - 1.9, s2 > 0 ? 1.9 : Math.PI - 0.2); g.stroke(); }
    g.beginPath(); g.moveTo(0, Dd * 0.3); g.lineTo(0, Dd * 0.98); g.stroke();
    if (!L.bare) { g.strokeStyle = C.sh; g.lineWidth = 0.025; for (const s2 of [-1, 1]) { g.beginPath(); g.moveTo(s2 * W * 0.88, -Dd * 0.35); g.quadraticCurveTo(s2 * W * 0.62, -Dd * 0.1, s2 * W * 0.7, Dd * 0.3); g.stroke(); } }
  }
  lkChest(g, m, pose, W, Dd);
  if (LKO.z && lod <= 1) lkWear(g, m, W, Dd, LKO.z);
  if (F.shoulderpads) lkPads(g, m, W, Dd);
  g.restore();
  // the collar or neckline at the base of the neck
  const nx = lkX(JN.neck), ny = lkY(JN.neck), nk = lkK(JN.neck);
  if (T.collar && !L.bare && !F.shoulderpads) lkEll(g, nx, ny, D.headR * 0.95 * nk, D.headR * 0.78 * nk, rot, (L.shirtC || L.cl).l, (L.shirtC || L.cl).o, 0.035);
  lkRim(g, cx, cy, W, Dd, rot);
}
// what is on the chest and back (in the chest's frame: x along the shoulders, -y the front, +y the back)
function lkChest(g, m, pose, W2, D2) {
  const L = m.al, T = L.T, F = L.F, lod = LKO.lod;
  if (T.pat && lod <= 1) lkPattern(g, T.pat, W2, D2, L);
  if (T.mesh && lod <= 1) { g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = -4; i <= 4; i++) for (let j = -2; j <= 2; j++) { const x = i * W2 * 0.2, y = j * D2 * 0.35; if ((x / W2) ** 2 + (y / D2) ** 2 < 0.7) lkCirc(g, x, y, 0.02, 'rgba(0,0,0,0.12)'); } }
  if (T.hivis) { g.strokeStyle = '#e8e8e8'; g.lineWidth = 0.08; for (const v of [-0.35, 0.35]) { g.beginPath(); g.moveTo(v * W2, -D2 * 0.85); g.lineTo(v * W2, D2 * 0.85); g.stroke(); } g.strokeStyle = L.ac.b; g.lineWidth = 0.045; g.beginPath(); g.moveTo(-W2 * 0.9, 0); g.lineTo(W2 * 0.9, 0); g.stroke(); }
  if (T.refl || F.stripe) { g.strokeStyle = T.refl ? '#d7e34a' : L.ac.b; g.lineWidth = 0.09; g.beginPath(); g.moveTo(-W2 * 0.95, D2 * 0.15); g.lineTo(W2 * 0.95, D2 * 0.15); g.stroke(); if (T.refl) { g.strokeStyle = '#c8c8c8'; g.lineWidth = 0.035; g.stroke(); } }
  if (T.two) { g.fillStyle = L.c2.b; g.beginPath(); g.ellipse(0, D2 * 0.45, W2 * 0.9, D2 * 0.5, 0, 0, Math.PI); g.fill(); }
  if (T.wet) { g.strokeStyle = L.ac.b; g.lineWidth = 0.06; g.beginPath(); g.ellipse(0, 0, W2 * 0.9, D2 * 0.8, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); if (lod <= 1) { g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 0.05; g.beginPath(); g.ellipse(0, 0, W2 * 0.7, D2 * 0.6, 0, Math.PI * 1.2, Math.PI * 1.6); g.stroke(); } }
  if (T.epaul) { g.fillStyle = L.ac.d; g.fillRect(-W2 * 0.92, -0.06, 0.26, 0.12); g.fillRect(W2 * 0.92 - 0.26, -0.06, 0.26, 0.12); }
  if (T.armor || F.plates) { const pc = L.top === 'riot' ? '#2c2f36' : F.plates && L.top === 'none' ? '#cfc4a6' : '#4a5040', po = '#15171a'; for (const v of [-1, 1]) lkEll(g, v * W2 * 0.72, 0, W2 * 0.3, D2 * 0.6, 0, pc, po, 0.04); lkEll(g, 0, D2 * 0.15, W2 * 0.4, D2 * 0.68, 0, pc, po, 0.04); if (lod <= 1) { g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 0.04; g.beginPath(); g.ellipse(0, D2 * 0.1, W2 * 0.3, D2 * 0.5, 0, Math.PI * 1.1, Math.PI * 1.7); g.stroke(); } }
  if (F.vest && L.top === 'police') { g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.05; g.beginPath(); g.ellipse(0, 0, W2 * 0.8, D2 * 0.78, 0, 0, TAU); g.stroke(); }
  if (T.open) { const sc2 = L.shirtC || L.c2; g.fillStyle = sc2.b; g.beginPath(); g.moveTo(-0.11, -D2 * 0.98); g.lineTo(0.11, -D2 * 0.98); g.lineTo(0.16, D2 * 0.1); g.lineTo(-0.16, D2 * 0.1); g.closePath(); g.fill(); if (T.coat && lod <= 1) { g.strokeStyle = L.cl.d; g.lineWidth = 0.025; g.beginPath(); g.moveTo(-0.16, -D2 * 0.9); g.lineTo(-0.16, D2 * 0.1); g.moveTo(0.16, -D2 * 0.9); g.lineTo(0.16, D2 * 0.1); g.stroke(); } }
  if (T.lapel) { const sc2 = L.shirtC; g.fillStyle = sc2.b; g.beginPath(); g.moveTo(-0.18, -D2 * 0.95); g.lineTo(0.18, -D2 * 0.95); g.lineTo(0, -D2 * 0.3); g.closePath(); g.fill(); g.strokeStyle = L.cl.o; g.lineWidth = 0.035; g.stroke(); if (lod <= 1) { g.strokeStyle = L.cl.l; g.lineWidth = 0.025; g.beginPath(); g.moveTo(-0.18, -D2 * 0.95); g.lineTo(-0.3, -D2 * 0.55); g.lineTo(-0.05, -D2 * 0.3); g.moveTo(0.18, -D2 * 0.95); g.lineTo(0.3, -D2 * 0.55); g.lineTo(0.05, -D2 * 0.3); g.stroke(); } }
  if (L.tie) { g.fillStyle = L.ac.b; g.beginPath(); g.moveTo(-0.06, -D2 * 0.9); g.lineTo(0.06, -D2 * 0.9); g.lineTo(0.045, -D2 * 0.35); g.lineTo(0, -D2 * 0.25); g.lineTo(-0.045, -D2 * 0.35); g.closePath(); g.fill(); if (lod <= 1) { g.strokeStyle = L.ac.d; g.lineWidth = 0.02; g.stroke(); lkCirc(g, 0, -D2 * 0.88, 0.045, L.ac.d); } }
  if (F.buttons && lod <= 1 && !T.dbl) { const bc = L.key === 'clown' ? '#f2d23a' : L.cl.o; for (let i = 0; i < 3; i++) lkCirc(g, 0, -D2 * (0.88 - i * 0.2), L.key === 'clown' ? 0.07 : 0.025, bc); }
  if (T.dbl && lod <= 1) { for (const v of [-0.2, 0.2]) for (const w of [-0.55, -0.15]) lkCirc(g, v, w * D2, 0.035, L.cl.d); }
  if (T.zip) { g.strokeStyle = L.cl.d; g.lineWidth = 0.035; g.beginPath(); g.moveTo(0, -D2); g.lineTo(0, -D2 * 0.2); g.stroke(); if (lod <= 1) lkCirc(g, 0, -D2 * 0.85, 0.035, '#b8bcc0'); }
  if (T.straps) { g.strokeStyle = L.top === 'dress' ? L.cl.d : L.cl.b; g.lineWidth = 0.09; for (const v of [-0.42, 0.42]) { g.beginPath(); g.moveTo(v * W2, -D2 * 0.75); g.lineTo(v * W2, D2 * 0.75); g.stroke(); } }
  if (T.lace && lod <= 1) { g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.02; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(-W2 * 0.6 + i * W2 * 0.2, -D2 * 0.7, 0.07, 0, Math.PI); g.stroke(); } }
  if (T.hoodie || L.head === 'hood') { lkEll(g, 0, D2 * 0.72, W2 * 0.5, D2 * 0.4, 0, L.cl.d, null); if (lod <= 1) { g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.025; g.beginPath(); g.ellipse(0, D2 * 0.72, W2 * 0.42, D2 * 0.3, 0, 0, TAU); g.stroke(); } }
  if (T.fur) { g.strokeStyle = '#d8cdb8'; g.lineWidth = 0.17; g.beginPath(); g.ellipse(0, D2 * 0.05, W2 * 0.42, D2 * 0.62, 0, 0, TAU); g.stroke(); if (lod <= 1) { g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 0.025; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * W2 * 0.36, D2 * 0.05 + Math.sin(a) * D2 * 0.52); g.lineTo(Math.cos(a) * W2 * 0.5, D2 * 0.05 + Math.sin(a) * D2 * 0.72); g.stroke(); } } }
  if (T.gownback && lod <= 1) { g.strokeStyle = L.cl.d; g.lineWidth = 0.035; g.beginPath(); g.moveTo(0, D2 * 0.1); g.lineTo(0, D2); g.stroke(); for (const w of [0.35, 0.7]) { g.beginPath(); g.moveTo(-0.1, w * D2); g.lineTo(0.1, w * D2); g.stroke(); } lkEll(g, 0, D2 * 0.55, W2 * 0.12, D2 * 0.35, 0, L.livor, null); }
  if (T.suit && lod <= 1) { g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(-W2 * 0.7, -0.05, W2 * 1.4, 0.1); }
  if (T.torn && lod <= 1) { for (let i = 0; i < 5; i++) { const a = i * 1.37 + 0.5, x = Math.cos(a) * W2 * 0.55, y = Math.sin(a) * D2 * 0.5; g.beginPath(); for (let j = 0; j <= 6; j++) { const b = j / 6 * TAU, k = j % 2 ? 0.5 : 1; if (!j) g.moveTo(x + Math.cos(b) * 0.13 * k, y + Math.sin(b) * 0.08 * k); else g.lineTo(x + Math.cos(b) * 0.13 * k, y + Math.sin(b) * 0.08 * k); } g.closePath(); g.fillStyle = L.skin.b; g.fill(); } }
  if (L.bare && lod <= 1) {
    // a bare torso: collarbones, the chest, and on the starved the ribs
    g.strokeStyle = L.skin.d; g.lineWidth = 0.035; g.beginPath(); g.moveTo(-W2 * 0.55, -D2 * 0.6); g.quadraticCurveTo(0, -D2 * 0.32, W2 * 0.55, -D2 * 0.6); g.stroke();
    if (F.ribs) { g.strokeStyle = L.skin.sh; for (let i = 0; i < 5; i++) { const w = -D2 * 0.25 + i * D2 * 0.2; g.beginPath(); g.moveTo(-W2 * 0.62, w); g.quadraticCurveTo(0, w - 0.1, W2 * 0.62, w); g.stroke(); } }
  }
  // the job's details
  if (lod <= 1) {
    if (F.pocket || T.pocket) { g.strokeStyle = L.cl.d; g.lineWidth = 0.025; g.strokeRect(-W2 * 0.55, -D2 * 0.82, 0.2, 0.18); if (F.pens) { g.strokeStyle = '#2a4a8a'; g.lineWidth = 0.03; g.beginPath(); g.moveTo(-W2 * 0.5, -D2 * 0.86); g.lineTo(-W2 * 0.5, -D2 * 0.7); g.stroke(); g.strokeStyle = '#c23b2e'; g.beginPath(); g.moveTo(-W2 * 0.43, -D2 * 0.86); g.lineTo(-W2 * 0.43, -D2 * 0.72); g.stroke(); } if (L.key === 'exec') { g.fillStyle = '#c23b2e'; g.fillRect(-W2 * 0.55, -D2 * 0.86, 0.12, 0.06); } }
    if (F.lanyard) { g.strokeStyle = '#2a4a9a'; g.lineWidth = 0.03; g.beginPath(); g.moveTo(-W2 * 0.3, -D2 * 0.2); g.quadraticCurveTo(0, -D2 * 1.05, W2 * 0.3, -D2 * 0.2); g.stroke(); g.fillStyle = '#e8e8e0'; g.fillRect(-0.07, -D2 * 1.02, 0.14, 0.12); g.fillStyle = '#4a7ab8'; g.fillRect(-0.07, -D2 * 1.02, 0.14, 0.035); }
    if (F.nametag) { g.fillStyle = L.key === 'mech' || L.key === 'janitor' ? '#e8e8e0' : '#f2f2ee'; g.fillRect(W2 * 0.3, -D2 * 0.8, 0.2, 0.08); g.fillStyle = '#2a2a2a'; g.fillRect(W2 * 0.33, -D2 * 0.78, 0.13, 0.025); }
    if (F.logo) { lkCirc(g, W2 * 0.42, -D2 * 0.65, 0.07, L.key === 'bugman' ? '#3b6b2a' : L.ac.b); if (L.key === 'bugman') { g.strokeStyle = '#1a1a1a'; g.lineWidth = 0.02; g.beginPath(); g.moveTo(W2 * 0.42 - 0.05, -D2 * 0.65); g.lineTo(W2 * 0.42 + 0.05, -D2 * 0.65); g.stroke(); } }
    if (F.cross) { g.fillStyle = L.key === 'lifeguard' ? '#f2f2f2' : '#f2f2f2'; g.fillRect(-0.05, -D2 * 0.75, 0.1, 0.24); g.fillRect(-0.12, -D2 * 0.68, 0.24, 0.1); g.fillRect(-0.05, D2 * 0.35, 0.1, 0.28); g.fillRect(-0.14, D2 * 0.44, 0.28, 0.1); }
    if (F.number && !F.shoulderpads) lkDigits(g, L.key === 'inmate' ? '17' : '54', 0, D2 * 0.48, D2 * 0.6, L.key === 'inmate' ? '#1a1a1a' : L.ac.b);
    if (F.patch) { const x = L.key === 'biker' ? 0 : -W2 * 0.85, y = L.key === 'biker' ? D2 * 0.45 : 0.02, r = L.key === 'biker' ? D2 * 0.38 : 0.08; lkCirc(g, x, y, r, L.key === 'biker' ? '#c8b088' : L.key === 'astro' ? '#2a4a9a' : L.ac.b); if (L.key === 'biker') { lkCirc(g, x, y, r * 0.6, '#1a1a1a'); lkCirc(g, x, y, r * 0.25, '#c8b088'); } }
    if (F.radio) { g.fillStyle = '#1a1a1c'; g.fillRect(W2 * 0.55, -D2 * 0.35, 0.12, 0.2); g.strokeStyle = '#1a1a1c'; g.lineWidth = 0.025; g.beginPath(); g.moveTo(W2 * 0.61, -D2 * 0.35); g.lineTo(W2 * 0.61, -D2 * 0.6); g.stroke(); }
    if (F.stethoscope) { g.strokeStyle = '#2a2a30'; g.lineWidth = 0.03; g.beginPath(); g.moveTo(-W2 * 0.35, -D2 * 0.1); g.quadraticCurveTo(0, D2 * 0.45, W2 * 0.35, -D2 * 0.1); g.stroke(); g.beginPath(); g.moveTo(-W2 * 0.35, -D2 * 0.1); g.lineTo(-W2 * 0.3, -D2 * 0.8); g.stroke(); lkCirc(g, -W2 * 0.3, -D2 * 0.85, 0.06, '#b8bcc0'); }
    if (F.headphones) { g.strokeStyle = '#1a1a1c'; g.lineWidth = 0.05; g.beginPath(); g.arc(0, -D2 * 0.2, W2 * 0.32, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); for (const s2 of [-1, 1]) lkEll(g, s2 * W2 * 0.3, -D2 * 0.5, 0.1, 0.07, 0, '#2a2a2e', '#0a0a0a', 0.02); }
    if (F.dogtags) { g.strokeStyle = '#a8adb2'; g.lineWidth = 0.02; g.beginPath(); g.moveTo(-W2 * 0.25, -D2 * 0.3); g.quadraticCurveTo(0, -D2 * 1.0, W2 * 0.25, -D2 * 0.3); g.stroke(); lkEll(g, 0.02, -D2 * 0.95, 0.05, 0.03, 0.3, '#c8ccd0', '#6a6e72', 0.015); }
    if (F.bandolier) { g.strokeStyle = '#4a3a22'; g.lineWidth = 0.1; g.beginPath(); g.moveTo(-W2 * 0.75, -D2 * 0.7); g.lineTo(W2 * 0.7, D2 * 0.75); g.stroke(); g.fillStyle = '#c8a040'; for (let i = 0; i < 6; i++) { const t = 0.12 + i * 0.14; lkCirc(g, -W2 * 0.75 + t * W2 * 1.45, -D2 * 0.7 + t * D2 * 1.45, 0.03, '#c8a040'); } }
    if (F.pouches) { for (const v of [-0.5, -0.17, 0.17, 0.5]) { g.fillStyle = L.cl.d; g.fillRect(v * W2 - 0.08, -D2 * 0.95, 0.16, 0.14); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.015; g.strokeRect(v * W2 - 0.08, -D2 * 0.95, 0.16, 0.14); } }
    if (F.toolbelt) { g.strokeStyle = '#5a3e22'; g.lineWidth = 0.08; g.beginPath(); g.ellipse(0, 0, W2 * 0.95, D2 * 0.95, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.fillStyle = '#6a4a2a'; for (const v of [-0.85, 0.85]) g.fillRect(v * W2 - 0.08, -D2 * 0.25, 0.16, 0.2); g.strokeStyle = '#8a9096'; g.lineWidth = 0.03; g.beginPath(); g.moveTo(-W2 * 0.85, -D2 * 0.3); g.lineTo(-W2 * 0.85, -D2 * 0.55); g.stroke(); }
    if (F.fannypack) { g.fillStyle = '#c84a8a'; g.beginPath(); g.ellipse(0, -D2 * 1.0, 0.22, 0.09, 0, 0, TAU); g.fill(); g.strokeStyle = '#2a2a2a'; g.lineWidth = 0.025; g.beginPath(); g.moveTo(-W2 * 0.9, -D2 * 0.6); g.lineTo(-0.2, -D2 * 1.0); g.moveTo(W2 * 0.9, -D2 * 0.6); g.lineTo(0.2, -D2 * 1.0); g.stroke(); }
    if (F.holster) { g.fillStyle = '#1a1a1a'; g.fillRect(W2 * 0.82, -D2 * 0.1, 0.14, 0.32); lkCirc(g, W2 * 0.89, -D2 * 0.12, 0.05, '#3a3a3a'); }
    if (F.rope) { g.strokeStyle = '#d8a83a'; g.lineWidth = 0.06; g.beginPath(); g.ellipse(-W2 * 0.1, D2 * 0.1, W2 * 0.75, D2 * 0.85, 0.5, 0, TAU); g.stroke(); g.strokeStyle = 'rgba(80,50,10,0.5)'; g.lineWidth = 0.015; g.setLineDash([0.04, 0.04]); g.stroke(); g.setLineDash([]); }
    if (F.hoses) { g.strokeStyle = '#d8d8d0'; g.lineWidth = 0.06; for (const s2 of [-1, 1]) { g.beginPath(); g.moveTo(s2 * W2 * 0.3, -D2 * 0.7); g.quadraticCurveTo(s2 * W2 * 0.8, -D2 * 0.2, s2 * W2 * 0.55, D2 * 0.5); g.stroke(); } }
    if (F.rag) { g.fillStyle = '#c8402a'; g.beginPath(); g.moveTo(W2 * 0.6, D2 * 0.6); g.lineTo(W2 * 0.75, D2 * 0.65); g.lineTo(W2 * 0.68, D2 * 0.95); g.closePath(); g.fill(); }
    if (F.holes) { for (let i = 0; i < 3; i++) { const x = (i - 1) * W2 * 0.4 + 0.05, y = -D2 * 0.4 + (i % 2) * D2 * 0.6; lkCirc(g, x, y, 0.045, L.woundD); g.strokeStyle = 'rgba(120,14,16,0.6)'; g.lineWidth = 0.02; g.beginPath(); g.arc(x, y, 0.065, 0, TAU); g.stroke(); } }
    if (F.splatter) { const R = lkRand(LKM.seed); for (let i = 0; i < 6; i++) lkBlob(g, R, (R() - 0.5) * W2 * 1.4, -D2 * (0.3 + R() * 0.6), 0.04 + R() * 0.06, 'rgba(110,10,12,0.7)', 6); }
  }
  if (F.badge) { lkSeg(g, -0.12, -D2 * 0.8, 0.02, -D2 * 0.1, 0.03, '#2a2a6a'); g.fillStyle = '#e8e8e0'; g.fillRect(-0.06, -D2 * 0.15, 0.16, 0.2); }
  if (T.badge) { g.fillStyle = '#d8b64a'; g.beginPath(); g.moveTo(-W2 * 0.45, -D2 * 0.55); g.lineTo(-W2 * 0.35, -D2 * 0.7); g.lineTo(-W2 * 0.25, -D2 * 0.55); g.lineTo(-W2 * 0.35, -D2 * 0.4); g.closePath(); g.fill(); }
  if (F.pearls) { for (let i = -4; i <= 4; i++) lkCirc(g, i * 0.06, -D2 * 0.72 + Math.abs(i) * -0.018, 0.032, '#efe8d8'); }
  if (F.apron) { g.fillStyle = '#f2efe8'; g.beginPath(); g.moveTo(-W2 * 0.45, -D2 * 0.95); g.lineTo(W2 * 0.45, -D2 * 0.95); g.lineTo(W2 * 0.5, -D2 * 0.2); g.lineTo(-W2 * 0.5, -D2 * 0.2); g.closePath(); g.fill(); g.strokeStyle = '#8a8478'; g.lineWidth = 0.025; g.stroke(); g.strokeStyle = '#d8d4c8'; g.lineWidth = 0.03; g.beginPath(); g.moveTo(-W2 * 0.9, 0); g.lineTo(-W2 * 0.45, -D2 * 0.5); g.moveTo(W2 * 0.9, 0); g.lineTo(W2 * 0.45, -D2 * 0.5); g.stroke(); }
  if (F.harness || F.straps) { g.strokeStyle = F.harness ? '#3a3a3a' : '#4a4a38'; g.lineWidth = 0.06; g.beginPath(); g.moveTo(-W2 * 0.6, -D2 * 0.8); g.lineTo(W2 * 0.5, D2 * 0.8); g.moveTo(W2 * 0.6, -D2 * 0.8); g.lineTo(-W2 * 0.5, D2 * 0.8); g.stroke(); if (lod <= 1) lkCirc(g, 0, 0, 0.05, '#8a8f94'); }
  if (F.belt) { g.strokeStyle = '#1a1a1a'; g.lineWidth = 0.09; g.beginPath(); g.ellipse(0, 0, W2 * 0.92, D2 * 0.9, 0, 0.1, Math.PI - 0.1); g.stroke(); }
  if (F.chains && lod <= 1) { g.strokeStyle = '#8a8f94'; g.lineWidth = 0.03; g.setLineDash([0.05, 0.035]); g.beginPath(); g.moveTo(-W2 * 0.8, -D2 * 0.3); g.quadraticCurveTo(0, D2 * 0.6, W2 * 0.8, -D2 * 0.3); g.stroke(); g.setLineDash([]); }
  if (F.spikes) { g.fillStyle = '#c8ccd0'; for (const v of [-1, 1]) for (let i = 0; i < 3; i++) { const bx = v * W2 * (0.6 + i * 0.12), by = -D2 * 0.1 + i * 0.12; g.beginPath(); g.moveTo(bx - 0.05, by); g.lineTo(bx + v * 0.16, by - 0.04); g.lineTo(bx - 0.05, by + 0.08); g.closePath(); g.fill(); } }
  if (F.ruff) { for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; lkCirc(g, Math.cos(a) * 0.28, Math.sin(a) * 0.22 - D2 * 0.15, 0.09, i % 2 ? '#f2f2ee' : '#e2e2da'); } }
  if (F.tank || F.pack) { const tc = F.pack ? '#d8d8d0' : L.key === 'diver' ? '#c8c020' : L.key === 'hazmat' ? '#5a6a64' : '#6a6a5a'; if (F.pack) { g.fillStyle = tc; g.fillRect(-W2 * 0.68, D2 * 0.35, W2 * 1.36, D2 * 0.75); g.strokeStyle = '#7a7a72'; g.lineWidth = 0.035; g.strokeRect(-W2 * 0.68, D2 * 0.35, W2 * 1.36, D2 * 0.75); if (lod <= 1) { g.fillStyle = '#9a9a92'; g.fillRect(-W2 * 0.4, D2 * 0.5, W2 * 0.25, D2 * 0.15); g.fillStyle = '#c23b2e'; g.fillRect(W2 * 0.2, D2 * 0.5, 0.06, 0.06); } } else { for (const v of L.key === 'diver' ? [-0.2, 0.2] : [0]) { lkEll(g, v * W2, D2 * 0.7, 0.18, D2 * 0.42, 0, lkShade(g, v * W2, D2 * 0.7, 0.3, lkSet(lkRGB(tc))), '#1a1a1a', 0.035); if (lod <= 1) lkCirc(g, v * W2, D2 * 0.3, 0.06, '#8a8f94'); } } }
  if (F.sacs) { for (let i = 0; i < 5; i++) { const a = i * 1.25; lkEll(g, Math.cos(a) * W2 * 0.45, D2 * 0.3 + Math.sin(a) * D2 * 0.4, 0.2 + (i % 2) * 0.06, 0.16, a, lkShade(g, Math.cos(a) * W2 * 0.45, D2 * 0.3 + Math.sin(a) * D2 * 0.4, 0.22, lkSet([176, 138, 122])), '#5a3a30', 0.035); lkCirc(g, Math.cos(a) * W2 * 0.45, D2 * 0.3 + Math.sin(a) * D2 * 0.4, 0.07, 'rgba(255,224,138,0.5)'); } }
  if (F.mushrooms && lod <= 1) { for (let i = 0; i < 4; i++) { const a = i * 1.6 + 0.3; lkEll(g, Math.cos(a) * W2 * 0.6, Math.sin(a) * D2 * 0.6 + 0.1, 0.15, 0.11, a, '#c98b4a', '#6a4320', 0.025); lkCirc(g, Math.cos(a) * W2 * 0.6, Math.sin(a) * D2 * 0.6 + 0.1, 0.035, '#f2e0c0'); } }
  if (F.flag && lod <= 1) { g.fillStyle = '#2a4a8a'; g.fillRect(-W2 * 0.95, -0.08, 0.18, 0.14); g.fillStyle = '#c23b2e'; g.fillRect(-W2 * 0.95, 0.02, 0.18, 0.04); }
  if (F.trefoil && lod <= 1) { g.fillStyle = '#1a1a1a'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(0, D2 * 0.45); g.arc(0, D2 * 0.45, 0.2, i * TAU / 3 - 0.5, i * TAU / 3 + 0.5); g.closePath(); g.fill(); } }
  if (F.dosimeter) { g.fillStyle = '#e8c52a'; g.fillRect(W2 * 0.3, -D2 * 0.65, 0.12, 0.16); }
  if (F.throatsac) { lkEll(g, 0, -D2 * 0.95, 0.32 * (1 + pose[AP.sq] * 0.5), 0.24 * (1 + pose[AP.sq] * 0.5), 0, lkShade(g, 0, -D2 * 0.95, 0.3, lkSet([168, 192, 74])), '#4a5a1a', 0.035); if (lod <= 1) { lkCirc(g, 0.06, -D2 * 1.0, 0.08, 'rgba(220,255,120,0.55)'); g.strokeStyle = 'rgba(60,80,20,0.5)'; g.lineWidth = 0.015; g.beginPath(); g.moveTo(-0.15, -D2 * 0.95); g.lineTo(0.1, -D2 * 0.85); g.stroke(); } }
  if (F.stitches && lod <= 1) { g.strokeStyle = '#2a1a1a'; g.lineWidth = 0.025; g.beginPath(); g.moveTo(-W2 * 0.8, -D2 * 0.4); g.lineTo(W2 * 0.6, D2 * 0.5); g.stroke(); for (let i = 0; i < 9; i++) { const t = i / 8, x = -W2 * 0.8 + t * W2 * 1.4, y = -D2 * 0.4 + t * D2 * 0.9; g.beginPath(); g.moveTo(x - 0.045, y + 0.055); g.lineTo(x + 0.045, y - 0.055); g.stroke(); } }
  if (F.staples && lod <= 1) { g.strokeStyle = '#a8adb2'; g.lineWidth = 0.02; for (let i = 0; i < 6; i++) { const x = W2 * (0.1 + i * 0.1), y = -D2 * 0.6 + i * 0.05; g.beginPath(); g.moveTo(x, y - 0.04); g.lineTo(x + 0.03, y - 0.04); g.lineTo(x + 0.03, y + 0.04); g.lineTo(x, y + 0.04); g.stroke(); } }
  if (F.patches && lod <= 1) { lkEll(g, -W2 * 0.4, D2 * 0.2, 0.28, 0.2, 0.3, '#8a9a7a'); lkEll(g, W2 * 0.45, -D2 * 0.3, 0.2, 0.18, -0.5, '#b8a09a'); }
  if ((F.stains || F.bite || F.tears) && lod <= 1) { if (F.stains) { lkEll(g, -W2 * 0.3, -D2 * 0.3, 0.19, 0.11, 0.6, 'rgba(100,10,12,0.5)'); lkEll(g, W2 * 0.25, D2 * 0.2, 0.13, 0.09, -0.3, 'rgba(100,10,12,0.45)'); } if (F.bite) { lkEll(g, W2 * 0.62, -0.05, 0.13, 0.09, 0.5, L.wound); lkEll(g, W2 * 0.62, -0.05, 0.06, 0.04, 0.5, L.woundD); } if (F.tears) { g.strokeStyle = 'rgba(30,20,15,0.6)'; g.lineWidth = 0.035; g.beginPath(); g.moveTo(-W2 * 0.5, D2 * 0.3); g.lineTo(-W2 * 0.3, D2 * 0.45); g.lineTo(-W2 * 0.4, D2 * 0.6); g.stroke(); } }
  if (F.burns && lod <= 1) { lkEll(g, W2 * 0.3, D2 * 0.3, 0.24, 0.17, 0.4, 'rgba(30,18,12,0.65)'); lkEll(g, -W2 * 0.5, -D2 * 0.2, 0.15, 0.11, 0, 'rgba(30,18,12,0.55)'); lkEll(g, W2 * 0.3, D2 * 0.3, 0.1, 0.07, 0.4, 'rgba(160,40,20,0.5)'); }
  if (F.dust || F.dirt || F.grease) { const c = F.grease ? 'rgba(20,20,20,0.35)' : F.dirt ? 'rgba(80,58,30,0.35)' : 'rgba(180,170,150,0.3)'; for (let i = 0; i < 6; i++) { const a = i * 2.1 + 0.7; lkCirc(g, Math.cos(a) * W2 * 0.6, Math.sin(a) * D2 * 0.6, 0.05 + (i % 3) * 0.03, c); } }
  if (F.seaweed && lod <= 1) { g.strokeStyle = '#3e6b3a'; g.lineWidth = 0.045; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-W2 * 0.5 + i * 0.4, -D2 * 0.6); g.quadraticCurveTo(-W2 * 0.3 + i * 0.4, 0, -W2 * 0.5 + i * 0.45, D2 * 0.7); g.stroke(); } }
  if (F.frost || F.icicles) { for (const v of [-1, 1]) lkEll(g, v * W2 * 0.7, 0, 0.2, D2 * 0.48, 0, 'rgba(220,245,255,0.55)'); if (lod <= 1) { g.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 6; i++) lkCirc(g, (i - 2.5) * W2 * 0.3, (i % 2 ? -1 : 1) * D2 * 0.6, 0.025, 'rgba(255,255,255,0.7)'); } }
  if (F.glowveins && lod <= 1) { g.strokeStyle = L.key === 'glow' ? 'rgba(234,255,74,0.7)' : 'rgba(180,255,60,0.7)'; g.lineWidth = 0.03; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-W2 * 0.4 + i * 0.35, -D2 * 0.5); g.lineTo(-W2 * 0.3 + i * 0.3, 0); g.lineTo(-W2 * 0.45 + i * 0.38, D2 * 0.5); g.stroke(); } }
  if (F.dry && lod <= 1) { g.strokeStyle = 'rgba(60,45,25,0.5)'; g.lineWidth = 0.022; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-W2 * 0.6 + i * 0.3, -D2 * 0.6); g.lineTo(-W2 * 0.5 + i * 0.28, 0); g.lineTo(-W2 * 0.6 + i * 0.3, D2 * 0.6); g.stroke(); } }
  if (F.bones && lod <= 1) { g.strokeStyle = L.bone; g.lineWidth = 0.045; for (let i = 0; i < 3; i++) { const w = D2 * (0.1 + i * 0.22); g.beginPath(); g.moveTo(-W2 * 0.75, w); g.quadraticCurveTo(-W2 * 0.4, w - 0.12, -W2 * 0.1, w); g.stroke(); } lkEll(g, -W2 * 0.45, D2 * 0.3, W2 * 0.35, D2 * 0.45, 0, 'rgba(60,20,20,0.35)', null); }
  if (F.tattoo && lod <= 1) { g.strokeStyle = 'rgba(30,40,70,0.6)'; g.lineWidth = 0.025; g.beginPath(); g.arc(W2 * 0.55, 0, 0.11, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(W2 * 0.55 - 0.08, 0); g.lineTo(W2 * 0.55 + 0.08, 0); g.stroke(); }
  if (F.camo && L.key === 'hunter') { g.fillStyle = L.ac.b; g.fillRect(-W2 * 0.75, -D2 * 0.15, W2 * 1.5, 0.11); }
  // the dead months on its skin and clothes
  if (lod <= 1) {
    const R = lkRand(LKM.seed + 7);
    if (F.mottled) for (let i = 0; i < 4; i++) lkBlob(g, R, (R() - 0.5) * W2 * 1.4, (R() - 0.3) * D2 * 1.2, 0.08 + R() * 0.1, L.bare ? L.livor : 'rgba(60,40,50,0.18)', 7);
    if (F.gutwound) { lkBlob(g, R, W2 * 0.1, -D2 * 0.75, 0.16, L.wound, 8); lkBlob(g, R, W2 * 0.1, -D2 * 0.75, 0.08, L.woundD, 6); }
    if (F.maggots) { g.fillStyle = '#f2ecd0'; for (let i = 0; i < 8; i++) { const x = (R() - 0.5) * W2 * 1.1, y = (R() - 0.5) * D2 * 1.1; g.beginPath(); g.ellipse(x, y, 0.035, 0.015, R() * 3, 0, TAU); g.fill(); } }
    if (F.mold) for (let i = 0; i < 4; i++) { const x = (R() - 0.5) * W2 * 1.3, y = (R() - 0.5) * D2 * 1.2; lkBlob(g, R, x, y, 0.1 + R() * 0.08, 'rgba(150,170,120,0.45)', 8); lkCirc(g, x, y, 0.03, 'rgba(230,240,210,0.5)'); }
    if (F.algae) for (let i = 0; i < 4; i++) lkBlob(g, R, (R() - 0.5) * W2 * 1.3, (R() - 0.5) * D2 * 1.2, 0.1 + R() * 0.1, 'rgba(60,110,60,0.45)', 8);
    if (F.barnacles) for (let i = 0; i < 7; i++) { const x = (R() - 0.5) * W2 * 1.2, y = (R() - 0.2) * D2 * 1.1; lkCirc(g, x, y, 0.045, '#c8c4b0'); lkCirc(g, x, y, 0.018, '#4a4a42'); }
    if (F.blisters) for (let i = 0; i < 6; i++) { const x = (R() - 0.5) * W2 * 1.2, y = (R() - 0.5) * D2 * 1.1; lkCirc(g, x, y, 0.035 + R() * 0.03, 'rgba(230,210,150,0.7)'); }
    if (F.cracks && L.bare) { g.strokeStyle = 'rgba(40,20,15,0.55)'; g.lineWidth = 0.02; for (let i = 0; i < 4; i++) { let x = (R() - 0.5) * W2 * 1.2, y = (R() - 0.5) * D2; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 3; j++) { x += (R() - 0.5) * 0.2; y += (R() - 0.5) * 0.2; g.lineTo(x, y); } g.stroke(); } }
    if (F.scars) { g.strokeStyle = 'rgba(200,150,140,0.55)'; g.lineWidth = 0.03; for (let i = 0; i < 3; i++) { const x = (R() - 0.5) * W2 * 1.2, y = (R() - 0.5) * D2 * 1.1, a = R() * 3; g.beginPath(); g.moveTo(x - Math.cos(a) * 0.15, y - Math.sin(a) * 0.15); g.lineTo(x + Math.cos(a) * 0.15, y + Math.sin(a) * 0.15); g.stroke(); } }
    if (F.grass) for (let i = 0; i < 3; i++) lkBlob(g, R, (R() - 0.5) * W2 * 1.2, (R() - 0.5) * D2, 0.09, 'rgba(70,110,40,0.4)', 6);
  }
}
// the Linebacker's shoulder pads under the jersey: a wide shell over each shoulder, the stripes, the number on the back
function lkPads(g, m, W, Dd) {
  const L = m.al, lod = LKO.lod, PW = W * 1.22, PD = Dd * 1.1, C = L.cl;
  lkGirdle(g, PW, PD);
  if (lod <= 1 && LKL) { const gr = g.createLinearGradient(-PW, -PD, PW, PD); gr.addColorStop(0, C.l); gr.addColorStop(0.5, C.b); gr.addColorStop(1, C.d); g.fillStyle = gr; } else g.fillStyle = C.b;
  g.fill(); g.strokeStyle = C.o; g.lineWidth = 0.05; g.stroke();
  // the shoulder caps and their stripes
  for (const s2 of [-1, 1]) {
    lkEll(g, s2 * PW * 0.72, 0, PW * 0.32, PD * 0.78, 0, null, C.d, 0.035);
    g.strokeStyle = L.ac.b; g.lineWidth = 0.06; for (const o of [-0.07, 0.07]) { g.beginPath(); g.moveTo(s2 * PW * 0.84 + o, -PD * 0.6); g.lineTo(s2 * PW * 0.84 + o, PD * 0.6); g.stroke(); }
  }
  // the neck hole and the number front and back
  lkEll(g, 0, 0, W * 0.3, Dd * 0.42, 0, 'rgba(0,0,0,0.35)', null);
  lkDigits(g, '54', 0, PD * 0.6, PD * 0.55, L.ac.b);
  if (lod <= 1) lkDigits(g, '54', 0, -PD * 0.68, PD * 0.3, L.ac.b);
  if (lod <= 1) { g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.025; g.beginPath(); g.moveTo(-PW * 0.4, 0); g.lineTo(-PW * 0.4, PD * 0.9); g.moveTo(PW * 0.4, 0); g.lineTo(PW * 0.4, PD * 0.9); g.stroke(); }
}
// 1.9.994: what happened to this one (not its kind): its own blood, rips, a gash, bite marks, drool down its front, and
// more blood as it takes hits. From a seed of its own, so two office drones in the same crowd never look alike. In the
// chest's frame (x along the shoulders, -y its front), clipped to the chest's outline.
function lkWear(g, m, W2, D2, z) {
  const L = m.al, dmg = z.maxHp > 0 ? clamp(1 - z.hp / z.maxHp, 0, 1) : 0, R = lkRand(z.nid);
  g.save(); lkGirdle(g, W2 * 0.98, D2 * 0.98); g.clip();
  // a rip in what it wears, the skin underneath (not on the bare)
  if (!L.bare && R() < 0.62) {
    const x = (R() - 0.5) * W2 * 1.2, y = (R() - 0.6) * D2 * 1.1, w = W2 * (0.18 + R() * 0.2), h = D2 * (0.12 + R() * 0.16);
    g.beginPath(); for (let i = 0; i <= 9; i++) { const a = i / 9 * TAU, k = i % 2 ? 0.55 : 1; if (i === 0) g.moveTo(x + Math.cos(a) * w * k, y + Math.sin(a) * h * k); else g.lineTo(x + Math.cos(a) * w * k, y + Math.sin(a) * h * k); }
    g.closePath(); g.fillStyle = L.skin.d; g.fill(); g.strokeStyle = L.cl.o; g.lineWidth = 0.025; g.stroke();
  }
  // its own old blood, and new blood with every hit it takes
  const n = 1 + (R() * 2.6 | 0) + Math.floor(dmg * 5);
  for (let i = 0; i < n; i++) { const x = (R() - 0.5) * W2 * 1.5, y = (R() - 0.55) * D2 * 1.4, r = (0.06 + R() * 0.11) * (i >= n - Math.floor(dmg * 5) ? 1.15 : 1); lkBlob(g, R, x, y, r, i % 3 ? 'rgba(78,8,10,0.72)' : 'rgba(110,14,14,0.62)', 7); if (r > 0.11) lkBlob(g, R, x + r * 0.2, y + r * 0.1, r * 0.45, 'rgba(140,20,18,0.5)', 6); }
  // a gash, its edges, a dark line down it
  if (R() < 0.42) { const x0 = (R() - 0.5) * W2, y0 = (R() - 0.5) * D2, a = R() * Math.PI, l = W2 * (0.35 + R() * 0.3); g.lineCap = 'round'; g.strokeStyle = 'rgba(150,40,36,0.75)'; g.lineWidth = 0.065; g.beginPath(); g.moveTo(x0 - Math.cos(a) * l / 2, y0 - Math.sin(a) * l / 2); g.lineTo(x0 + Math.cos(a) * l / 2, y0 + Math.sin(a) * l / 2); g.stroke(); g.strokeStyle = 'rgba(40,2,4,0.9)'; g.lineWidth = 0.025; g.stroke(); }
  // a bite out of a shoulder: two crescents of teeth marks
  if (R() < 0.3) { const sx = (R() < 0.5 ? -1 : 1) * W2 * 0.7, sy = -D2 * 0.15; g.strokeStyle = 'rgba(60,6,8,0.8)'; g.lineWidth = 0.022; for (const k of [0, 1]) { g.beginPath(); g.arc(sx, sy + k * 0.08, 0.08, 0.2 + k * Math.PI, Math.PI - 0.2 + k * Math.PI); g.stroke(); } }
  // drool and blood from the mouth down its front
  if (R() < 0.55) { g.strokeStyle = 'rgba(96,10,12,0.6)'; g.lineWidth = 0.045; const x = (R() - 0.5) * W2 * 0.3; g.beginPath(); g.moveTo(x, -D2 * 0.95); g.quadraticCurveTo(x + 0.05, -D2 * 0.5, x - 0.02, -D2 * 0.05 - R() * D2 * 0.3); g.stroke(); }
  g.restore();
}
// the patterns printed or woven on clothes, inside the chest's outline (chords worked out, so nothing needs clipping)
function lkPattern(g, pat, W2, D2, L) {
  const R = Z.mulberry32(LKM.seed >>> 0);
  if (pat === 'floral') { const cs = ['#f26b8a', '#f2d23a', '#f2f2f2', '#7ad86b']; for (let i = 0; i < 11; i++) { const a = R() * TAU, q = Math.sqrt(R()) * 0.78, x = Math.cos(a) * W2 * q, y = Math.sin(a) * D2 * q; for (let p = 0; p < 4; p++) lkCirc(g, x + Math.cos(p * 1.57) * 0.04, y + Math.sin(p * 1.57) * 0.04, 0.035, cs[i % 4]); lkCirc(g, x, y, 0.02, '#f2e08a'); } }
  else if (pat === 'plaid' || pat === 'check') {
    g.strokeStyle = 'rgba(20,20,20,0.35)'; g.lineWidth = 0.055;
    for (let v = -0.75; v <= 0.76; v += 0.25) { const h = Math.sqrt(Math.max(0, 1 - v * v)); g.beginPath(); g.moveTo(v * W2, -h * D2); g.lineTo(v * W2, h * D2); g.moveTo(-h * W2, v * D2); g.lineTo(h * W2, v * D2); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 0.02; for (let v = -0.625; v <= 0.63; v += 0.25) { const h = Math.sqrt(Math.max(0, 1 - v * v)); g.beginPath(); g.moveTo(v * W2, -h * D2); g.lineTo(v * W2, h * D2); g.stroke(); }
  } else if (pat === 'camo') { const cs = [L.c2.b, L.cl.d, '#3a3326', L.cl.l]; for (let i = 0; i < 9; i++) { const a = R() * TAU, q = Math.sqrt(R()) * 0.7; lkEll(g, Math.cos(a) * W2 * q, Math.sin(a) * D2 * q, 0.14 + R() * 0.12, 0.08 + R() * 0.07, R() * 3, cs[i % 4]); } }
  else if (pat === 'dots') { const cs = ['#f2d23a', '#2f8f4a', '#e2442f', '#2aa1d6']; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + 0.3, q = 0.5 + (i % 2) * 0.2; lkCirc(g, Math.cos(a) * W2 * q, Math.sin(a) * D2 * q, 0.085, cs[i % 4]); } }
  else if (pat === 'studs') { for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; lkCirc(g, Math.cos(a) * W2 * 0.82, Math.sin(a) * D2 * 0.78, 0.032, '#c8ccd0'); } }
  else if (pat === 'wraps') { g.strokeStyle = 'rgba(90,70,40,0.45)'; g.lineWidth = 0.03; for (let v = -0.7; v <= 0.71; v += 0.15) { const h = Math.sqrt(Math.max(0, 1 - v * v)); g.beginPath(); g.moveTo(-h * W2, v * D2); g.lineTo(h * W2, v * D2 + 0.06); g.stroke(); } }
}
/* ---- arms, hands and what they hold ---- */
function lkArm(g, m, side, pose) {
  const D = m.ad, L = m.al, F = L.F, si = side < 0 ? JN.shL : JN.shR, ei = si + 1, hi = si + 2, lod = LKO.lod;
  const sx = lkX(si), sy = lkY(si), ex = lkX(ei), ey = lkY(ei), hx = lkX(hi), hy = lkY(hi), lit = lod <= 1;
  const big = side > 0 && D.bigArm ? 1.3 : 1, ru = D.limb * 0.5 * lkK(si) * big, re = D.limb * 0.4 * lkK(ei) * big, rf = D.fore * 0.52 * lkK(ei) * big, rw = D.fore * 0.34 * lkK(hi) * big;
  const sleeveC = L.sleeveC, up = L.sleeve >= 1 ? sleeveC : L.skin, puffy = L.T.puffy ? 1.18 : 1;
  if ((side < 0 && D.noArmL) || (LKSEV & (side < 0 ? 1 : 2))) {
    // the stump of a lost arm, bone showing
    lkLimb2(g, sx, sy, ru * puffy, ex, ey, re, up, lit); lkCirc(g, ex, ey, re * 0.9, '#7a1a1a'); lkCirc(g, ex, ey, re * 0.4, L.bone); return;
  }
  // the deltoid, then the upper arm and the forearm (in skin); sleeves go on over them
  lkLimb2(g, sx, sy, ru, ex, ey, re, L.skin, lit);
  lkLimb2(g, ex, ey, rf, hx, hy, rw, L.skin, lit);
  if (lod <= 1) {
    if (F.tattooarm && side > 0 && L.sleeve < 2) { const mx = ex + (hx - ex) * 0.45, my = ey + (hy - ey) * 0.45; g.strokeStyle = 'rgba(30,40,70,0.65)'; g.lineWidth = 0.025; g.beginPath(); g.arc(mx, my, rf * 0.55, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(ex + (hx - ex) * 0.2, ey + (hy - ey) * 0.2); g.lineTo(ex + (hx - ex) * 0.75, ey + (hy - ey) * 0.75); g.stroke(); }
    if (F.mottled && L.sleeve < 2) lkCirc(g, ex + (hx - ex) * 0.5, ey + (hy - ey) * 0.5, rf * 0.6, L.livor);
    if (F.veins) { g.strokeStyle = 'rgba(40,60,90,0.5)'; g.lineWidth = 0.022; g.beginPath(); g.moveTo(ex, ey); g.lineTo((ex + hx) / 2 + 0.04, (ey + hy) / 2); g.lineTo(hx, hy); g.stroke(); }
    if (F.bandage) { const mx = ex + (hx - ex) * 0.7, my = ey + (hy - ey) * 0.7; lkLimb2(g, mx - (hx - ex) * 0.12, my - (hy - ey) * 0.12, rw * 1.25, mx + (hx - ex) * 0.12, my + (hy - ey) * 0.12, rw * 1.2, lkSet([230, 226, 214]), lit); lkCirc(g, mx, my, rw * 0.5, 'rgba(140,20,20,0.55)'); }
  }
  // the sleeve: short ones stop on the upper arm, long ones at the wrist (or rolled up to the elbow)
  if (L.sleeve >= 1) {
    const rolled = F.rolled && L.sleeve >= 2, longS = L.sleeve >= 2 && !rolled;
    const t1 = L.sleeve === 1 ? 0.6 : 1, cx1 = sx + (ex - sx) * t1, cy1 = sy + (ey - sy) * t1;
    lkLimb2(g, sx, sy, ru * 1.1 * puffy, cx1, cy1, (L.sleeve === 1 ? (ru + re) / 2 * 1.12 : re * 1.12) * puffy, sleeveC, lit);
    if (longS) { lkLimb2(g, ex, ey, rf * 1.1 * puffy, hx - (hx - ex) * 0.08, hy - (hy - ey) * 0.08, rw * 1.25 * puffy, sleeveC, lit); if (lod <= 1) { g.strokeStyle = sleeveC.d; g.lineWidth = 0.05; const qx = hx - (hx - ex) * 0.14, qy = hy - (hy - ey) * 0.14, ux = (hx - ex), uy = (hy - ey), ul = Math.hypot(ux, uy) || 1; g.beginPath(); g.moveTo(qx - uy / ul * rw * 1.25, qy + ux / ul * rw * 1.25); g.lineTo(qx + uy / ul * rw * 1.25, qy - ux / ul * rw * 1.25); g.stroke(); } if (F.cuffs && lod <= 1) lkCirc(g, hx - (hx - ex) * 0.12, hy - (hy - ey) * 0.12, 0.035, '#d8c070'); }
    else if (rolled) { const qx = ex + (hx - ex) * 0.3, qy = ey + (hy - ey) * 0.3; lkLimb2(g, ex, ey, rf * 1.12, qx, qy, rf * 1.05, sleeveC, lit); lkLimb2(g, qx - (hx - ex) * 0.06, qy - (hy - ey) * 0.06, rf * 1.2, qx + (hx - ex) * 0.04, qy + (hy - ey) * 0.04, rf * 1.18, lkSet(lkSh(sleeveC.rgb, 0.12)), lit); }
    else if (lod <= 1) { g.strokeStyle = sleeveC.d; g.lineWidth = 0.05; const ux = ex - sx, uy = ey - sy, ul = Math.hypot(ux, uy) || 1, rr = (ru + re) / 2 * 1.12; g.beginPath(); g.moveTo(cx1 - uy / ul * rr, cy1 + ux / ul * rr); g.lineTo(cx1 + uy / ul * rr, cy1 - ux / ul * rr); g.stroke(); }
  }
  if (lod <= 1) {
    if (side > 0 && D.bigArm) { g.strokeStyle = '#2a1a1a'; g.lineWidth = 0.025; for (let i = 0; i < 5; i++) { const t = 0.08 + i * 0.03, x = sx + (ex - sx) * t, y = sy + (ey - sy) * t, ux = ex - sx, uy = ey - sy, ul = Math.hypot(ux, uy) || 1; g.beginPath(); g.moveTo(x - uy / ul * ru * 1.1, y + ux / ul * ru * 1.1); g.lineTo(x + uy / ul * ru * 1.1, y - ux / ul * ru * 1.1); g.stroke(); } }
    if (F.glowveins) { g.strokeStyle = L.key === 'glow' ? 'rgba(234,255,74,0.75)' : 'rgba(180,255,60,0.75)'; g.lineWidth = 0.028; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.lineTo(hx, hy); g.stroke(); }
    const band = (t0, t1, col) => lkLimb2(g, hx + (ex - hx) * t1, hy + (ey - hy) * t1, rw * (1.18 + t1 * 0.5), hx + (ex - hx) * t0, hy + (ey - hy) * t0, rw * 1.16, lkSet(lkRGB(col)), true);
    if (F.chains) { band(0.1, 0.22, '#8a8f94'); g.strokeStyle = '#5a5e62'; g.lineWidth = 0.015; g.setLineDash([0.03, 0.02]); g.beginPath(); g.moveTo(hx + (ex - hx) * 0.16, hy + (ey - hy) * 0.16); g.lineTo(hx + (ex - hx) * 0.16 + 0.25 * side, hy + (ey - hy) * 0.16 + 0.2); g.stroke(); g.setLineDash([]); }
    if (F.tape) band(0.1, 0.24, '#9aa0a6');
    if (F.watch && side < 0) { band(0.12, 0.2, '#3a3026'); lkCirc(g, hx + (ex - hx) * 0.16, hy + (ey - hy) * 0.16, rw * 0.8, '#b8a24a'); lkCirc(g, hx + (ex - hx) * 0.16, hy + (ey - hy) * 0.16, rw * 0.55, '#e8e4d0'); }
    if (F.wristband) band(0.08, 0.24, L.key === 'linebacker' ? '#f1ece3' : L.key === 'gym' || L.key === 'jogger' ? '#f2f2f2' : '#d33a3a');
    if (F.bracelet && side > 0) { g.strokeStyle = L.key === 'punk' ? '#c8ccd0' : '#d8c070'; g.lineWidth = 0.025; for (const t of [0.12, 0.18]) { const bx = hx + (ex - hx) * t, by = hy + (ey - hy) * t, ux = ex - hx, uy = ey - hy, ul = Math.hypot(ux, uy) || 1; g.beginPath(); g.moveTo(bx - uy / ul * rw * 1.25, by + ux / ul * rw * 1.25); g.lineTo(bx + uy / ul * rw * 1.25, by - ux / ul * rw * 1.25); g.stroke(); } }
    if (F.pads) lkCirc(g, ex, ey, re * 1.3, '#2a2c30');
    if (F.icicles) { g.fillStyle = 'rgba(220,245,255,0.85)'; const mx = (ex + hx) / 2, my = (ey + hy) / 2; g.beginPath(); g.moveTo(mx - 0.05, my); g.lineTo(mx + 0.05, my); g.lineTo(mx, my + 0.3 * side); g.closePath(); g.fill(); }
    if (F.bones && side < 0) lkSeg(g, ex, ey, (ex + hx) / 2, (ey + hy) / 2, rw * 0.7, L.bone);
    if (F.studs && L.top === 'leather') { for (let i = 1; i < 3; i++) lkCirc(g, sx + (ex - sx) * i / 3, sy + (ey - sy) * i / 3, 0.032, '#c8ccd0'); }
    if (L.T.refl) { const mx = sx + (ex - sx) * 0.7, my = sy + (ey - sy) * 0.7; lkCirc(g, mx, my, re * 1.12, '#d7e34a'); }
    if (L.T.jersey) { const mx = sx + (ex - sx) * 0.45, my = sy + (ey - sy) * 0.45; g.strokeStyle = L.ac.b; g.lineWidth = 0.05; const ux = ex - sx, uy = ey - sy, ul = Math.hypot(ux, uy) || 1, rr = ru * 1.1; g.beginPath(); g.moveTo(mx - uy / ul * rr, my + ux / ul * rr); g.lineTo(mx + uy / ul * rr, my - ux / ul * rr); g.stroke(); }
  }
  lkHand(g, m, side, ex, ey, hx, hy, rw, pose, big);
}
// a hand: a palm, four fingers (spread and hooked as claws, or closed by the grip) and a thumb toward the body
function lkHand(g, m, side, ex, ey, hx, hy, rw, pose, big) {
  const D = m.ad, L = m.al, F = L.F, lod = LKO.lod, k = lkK(side < 0 ? JN.haL : JN.haR) * big;
  const glove = L.glove;
  const handC = glove || (F.bloodhands ? lkSet(lkMix(L.skin.rgb, [120, 12, 14], 0.55)) : L.skin);
  const dx = hx - ex, dy = hy - ey, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl, nx = -uy, ny = ux, grip = pose[AP.grip], fa = Math.atan2(uy, ux);
  const px = hx + ux * 0.1 * k, py = hy + uy * 0.1 * k, prx = 0.15 * k, pry = 0.125 * k;
  if (lod > 1) { lkCirc(g, px, py, pry * 1.15, handC.b); return; }
  // the fingers first (the palm sits over their roots)
  const claws = D.claws, nf = 4, fl = (claws ? 0.27 : 0.2) * k * (1 - grip * 0.62), missing = F.fingers && side < 0 ? 2 : 0;
  if (fl > 0.02) {
    for (let i = 0; i < nf - missing; i++) {
      const o = (i - 1.5) * 0.06 * k, bx = px + ux * prx * 0.75 + nx * o, by = py + uy * prx * 0.75 + ny * o, spread = (i - 1.5) * (claws ? 0.16 : 0.09) * (1 - grip), curl = grip * 0.8 + (claws ? 0.25 : 0.1);
      const a = fa + spread, tx = bx + Math.cos(a) * fl * (1 - curl * 0.3), ty = by + Math.sin(a) * fl * (1 - curl * 0.3);
      lkSeg(g, bx, by, tx, ty, 0.055 * k, handC.b, handC.o);
      if (claws) lkSeg(g, tx, ty, tx + Math.cos(a) * 0.07 * k, ty + Math.sin(a) * 0.07 * k, 0.022, '#2a221c');
      else if (F.frostbite) lkCirc(g, tx, ty, 0.026 * k, '#1e2430');
      else if (!glove && lod === 0) lkCirc(g, tx, ty, 0.012 * k, 'rgba(220,210,190,0.6)');
    }
  }
  // the thumb, on the side toward the body
  const ts = -side, tbx = px + nx * ts * pry * 0.7 - ux * prx * 0.1, tby = py + ny * ts * pry * 0.7 - uy * prx * 0.1, ta = fa + ts * (0.9 - grip * 0.5);
  lkSeg(g, tbx, tby, tbx + Math.cos(ta) * 0.14 * k * (1 - grip * 0.3), tby + Math.sin(ta) * 0.14 * k * (1 - grip * 0.3), 0.06 * k, handC.b, handC.o);
  // the palm (the back of the hand from above), with its knuckles
  lkEll(g, px, py, prx, pry, fa, lkShade(g, px, py, prx, handC), handC.o, 0.035);
  if (lod === 0 && !glove) { g.strokeStyle = handC.sh; g.lineWidth = 0.018; g.beginPath(); g.moveTo(px + ux * prx * 0.55 + nx * pry * 0.7, py + uy * prx * 0.55 + ny * pry * 0.7); g.lineTo(px + ux * prx * 0.55 - nx * pry * 0.7, py + uy * prx * 0.55 - ny * pry * 0.7); g.stroke(); }
  if (F.ring && side < 0 && lod === 0) lkCirc(g, px + ux * prx * 0.9 + nx * 0.02 * k, py + uy * prx * 0.9 + ny * 0.02 * k, 0.025 * k, '#e8c84a');
  if (F.bloodhands && lod === 0) lkCirc(g, px - nx * 0.03, py - ny * 0.03, pry * 0.6, 'rgba(110,8,10,0.5)');
  if (side > 0 && L.hold && L.hold !== 'shield') lkProp(g, m, L.hold, hx, hy, fa, pry * 1.2, pose);
  if (side < 0 && L.hold === 'bouquet') lkProp(g, m, 'bouquet2', hx, hy, fa, pry * 1.2, pose);
}
function lkProp(g, m, k, x, y, a, hr, pose) {
  const L = m.al, c = Math.cos(a), s = Math.sin(a), lod = LKO.lod;
  g.save(); g.translate(x, y); g.rotate(a);
  switch (k) {
    case 'cleaver': g.fillStyle = '#3a2a1a'; g.fillRect(-0.05, -0.04, 0.28, 0.08); if (lod <= 1) { g.fillStyle = '#c8b88a'; lkCirc(g, 0.05, 0, 0.015, '#c8b88a'); lkCirc(g, 0.15, 0, 0.015, '#c8b88a'); } g.fillStyle = '#c9ced4'; g.beginPath(); g.moveTo(0.2, -0.07); g.lineTo(0.62, -0.07); g.lineTo(0.62, 0.24); g.lineTo(0.2, 0.18); g.closePath(); g.fill(); g.strokeStyle = '#6b7076'; g.lineWidth = 0.025; g.stroke(); if (lod <= 1) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0.22, -0.06, 0.38, 0.04); g.fillStyle = 'rgba(110,10,12,0.6)'; g.fillRect(0.45, 0.05, 0.15, 0.1); } break;
    case 'iceaxe': g.strokeStyle = '#2a4a7a'; g.lineWidth = 0.07; g.beginPath(); g.moveTo(-0.1, 0); g.lineTo(0.85, 0); g.stroke(); g.strokeStyle = '#c0c4c8'; g.lineWidth = 0.06; g.beginPath(); g.moveTo(0.85, -0.28); g.lineTo(0.85, 0.34); g.lineTo(0.74, 0.44); g.stroke(); break;
    case 'wrench': g.strokeStyle = '#8a9096'; g.lineWidth = 0.08; g.beginPath(); g.moveTo(-0.05, 0); g.lineTo(0.68, 0); g.stroke(); g.fillStyle = '#8a9096'; g.beginPath(); g.arc(0.73, 0, 0.11, 0.7, TAU - 0.7); g.fill(); if (lod <= 1) { g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 0.02; g.beginPath(); g.moveTo(0, -0.02); g.lineTo(0.6, -0.02); g.stroke(); } break;
    case 'mop': { g.restore(); g.save(); const bx = x - 2.4, by = y + 0.35 * (m.an.side || 1); g.strokeStyle = '#8a6a3a'; g.lineWidth = 0.07; g.beginPath(); g.moveTo(x + c * 0.2, y + s * 0.2); g.lineTo(bx, by); g.stroke(); g.fillStyle = '#c8c4b0'; g.beginPath(); g.ellipse(bx, by, 0.3, 0.42, 0, 0, TAU); g.fill(); if (lod <= 1) { g.strokeStyle = '#9a9680'; g.lineWidth = 0.025; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(bx, by + i * 0.1); g.lineTo(bx - 0.35, by + i * 0.13); g.stroke(); } } break; }
    case 'briefcase': g.fillStyle = '#3a2618'; g.fillRect(0.02, -0.28, 0.3, 0.56); g.strokeStyle = '#1a120a'; g.lineWidth = 0.035; g.strokeRect(0.02, -0.28, 0.3, 0.56); g.fillStyle = '#b8a24a'; g.fillRect(0.02, -0.05, 0.05, 0.1); if (lod <= 1) { g.fillStyle = '#b8a24a'; g.fillRect(0.27, -0.2, 0.04, 0.05); g.fillRect(0.27, 0.15, 0.04, 0.05); } break;
    case 'medbag': g.fillStyle = L.holdC.b; g.fillRect(0.02, -0.26, 0.4, 0.52); g.fillStyle = '#f2f2f2'; g.fillRect(0.16, -0.11, 0.11, 0.22); g.fillRect(0.11, -0.055, 0.22, 0.11); break;
    case 'bag': g.restore(); g.save(); { const px = lkX(JN.pel), py = lkY(JN.pel); g.strokeStyle = '#3a2a18'; g.lineWidth = 0.045; g.beginPath(); g.moveTo(lkX(JN.shL), lkY(JN.shL)); g.lineTo(px - 0.1, py + 0.9); g.stroke(); g.fillStyle = L.holdC.b; g.fillRect(px - 0.55, py + 0.75, 0.68, 0.4); g.strokeStyle = L.holdC.o; g.lineWidth = 0.035; g.strokeRect(px - 0.55, py + 0.75, 0.68, 0.4); if (lod <= 1) { g.fillStyle = 'rgba(240,235,220,0.8)'; g.fillRect(px - 0.48, py + 0.7, 0.2, 0.1); g.fillRect(px - 0.24, py + 0.71, 0.18, 0.1); } } break;
    case 'camera': g.restore(); g.save(); { const cx = lkX(JN.sc) + 0.33, cy = lkY(JN.sc); g.strokeStyle = '#1a1a1a'; g.lineWidth = 0.03; g.beginPath(); g.arc(lkX(JN.neck), lkY(JN.neck), 0.38, -1, 1); g.stroke(); g.fillStyle = '#2a2a2c'; g.fillRect(cx - 0.09, cy - 0.2, 0.22, 0.4); g.fillStyle = '#5a6a7a'; lkCirc(g, cx + 0.17, cy, 0.09, '#5a6a7a'); if (lod <= 1) lkCirc(g, cx + 0.19, cy - 0.02, 0.03, 'rgba(255,255,255,0.5)'); } break;
    case 'whistle': g.restore(); g.save(); { const nx = lkX(JN.neck), ny = lkY(JN.neck); g.strokeStyle = '#f2f2f2'; g.lineWidth = 0.025; g.beginPath(); g.arc(nx, ny, 0.36, -0.9, 0.9); g.stroke(); lkCirc(g, nx + 0.38, ny + 0.05, 0.055, '#c8c8c8'); } break;
    case 'scalpel': g.strokeStyle = '#c9ced4'; g.lineWidth = 0.035; g.beginPath(); g.moveTo(0, 0); g.lineTo(0.32, 0); g.stroke(); g.strokeStyle = '#e8eef5'; g.lineWidth = 0.025; g.beginPath(); g.moveTo(0.32, 0); g.lineTo(0.45, 0.02); g.stroke(); break;
    case 'bouquet': case 'bouquet2': { const cs = ['#5a3a4a', '#3a2a30', '#6a4a52', '#2a3a2a']; for (let i = 0; i < 6; i++) { const aa = i * 1.05; lkCirc(g, 0.17 + Math.cos(aa) * 0.1, Math.sin(aa) * 0.1, 0.07, cs[i % 4]); } if (lod <= 1) lkCirc(g, 0.17, 0, 0.05, '#4a2a3a'); if (k === 'bouquet2') break; g.strokeStyle = '#2a3a2a'; g.lineWidth = 0.025; g.beginPath(); g.moveTo(0, 0); g.lineTo(-0.2, 0.05); g.stroke(); break; }
  }
  g.restore();
}
// the riot shield, on the left forearm, out in front
function lkShield(g, m, pose) {
  const hx = lkX(JN.haL), hy = lkY(JN.haL), a = Math.atan2(lkY(JN.shR) - lkY(JN.shL), lkX(JN.shR) - lkX(JN.shL));
  const fx = Math.sin(a), fy = -Math.cos(a), sx = lkX(JN.sc), sy = lkY(JN.sc), d0 = m.ad.chD + 0.45, px = sx + fx * d0, py = sy + fy * d0;
  let reach = Math.max(0, (hx - sx) * fx + (hy - sy) * fy - d0), cx = px + fx * reach * 0.8, cy = py + fy * reach * 0.8, L = m.ad.chW * 1.45;
  const fall = pose[AP.fall]; if (fall > 0.3) { const k = Math.min(1, (fall - 0.3) / 0.5); cx += (hx + 0.6 - cx) * k; cy += (hy - cy) * k; }
  g.save(); g.translate(cx, cy); g.rotate(a);
  g.fillStyle = 'rgba(36,44,56,0.94)'; g.beginPath(); g.moveTo(-L, 0.06); g.quadraticCurveTo(0, -0.22, L, 0.06); g.lineTo(L, 0.22); g.quadraticCurveTo(0, -0.04, -L, 0.22); g.closePath(); g.fill();
  g.strokeStyle = '#0e1012'; g.lineWidth = 0.045; g.stroke();
  if (LKO.lod <= 1) { g.strokeStyle = 'rgba(170,200,230,0.45)'; g.lineWidth = 0.035; g.beginPath(); g.moveTo(-L * 0.85, 0.07); g.quadraticCurveTo(0, -0.16, L * 0.85, 0.07); g.stroke(); g.fillStyle = 'rgba(240,240,240,0.7)'; g.fillRect(-0.18, 0.04, 0.36, 0.05); }
  g.restore();
}
// the trailing gut of the legless one
function lkEntrails(g, m) {
  const px = lkX(JN.pel), py = lkY(JN.pel), t = LKO.t || 0;
  g.strokeStyle = '#7a2a2a'; g.lineWidth = 0.13; g.beginPath(); g.moveTo(px, py);
  for (let i = 1; i <= 5; i++) g.lineTo(px - i * 0.3, py + Math.sin(i * 1.7 + t * 2) * 0.18);
  g.stroke(); g.strokeStyle = '#a84a4a'; g.lineWidth = 0.055; g.stroke();
  if (LKO.lod <= 1) { g.strokeStyle = 'rgba(255,200,200,0.3)'; g.lineWidth = 0.02; g.stroke(); }
}
/* ---- the head ---- */
function lkHead(g, m, pose) {
  const D = m.ad, L = m.al, F = L.F, lod = LKO.lod, J = ANIMA.J;
  const nx = lkX(JN.neck), ny = lkY(JN.neck), x = lkX(JN.head), y = lkY(JN.head), k = lkK(JN.head), hr = D.headR * k, hl = (D.headL || D.headR * 1.25) * k;
  const fx = J[JN.fdir * 3], fy = J[JN.fdir * 3 + 1], fz = J[JN.fdir * 3 + 2], ux = J[JN.hup * 3], uy = J[JN.hup * 3 + 1];
  const vis = Math.max(0, fz), down = fz < -0.45;
  const fl = Math.hypot(fx, fy) || 1, fdx = fx / fl, fdy = fy / fl, ang = Math.atan2(fdy, fdx), px = -fdy, py = fdx;
  // seen from above the head is longer front to back than across; tipped up to face you it shows round
  const rx = hl * (1 - 0.18 * vis), ry = hr;
  // the shadow it throws on the shoulders, then the neck
  if (lod <= 1) lkAO(g, x, y, hr * 1.7, 0.28);
  const skinC = L.glowSkin && LKO.glow ? lkSet(lkMix(L.skin.rgb, [234, 255, 74], 0.25)) : L.skin;
  lkLimb2(g, nx, ny, hr * 0.62 * lkK(JN.neck), x, y, hr * 0.6, skinC, lod <= 1);
  const covered = L.head === 'hazhood' || L.head === 'spacehelm' || L.head === 'riothelm' || L.head === 'hood' || L.head === 'football' || L.head === 'veil';
  // the ears, either side, a little forward of the middle (one bitten off)
  if (!covered && L.hair !== 'long' && L.hair !== 'curly') {
    for (const sd of [-1, 1]) {
      const ex = x + px * sd * ry * 0.96 + fdx * rx * 0.06, ey = y + py * sd * ry * 0.96 + fdy * rx * 0.06;
      if (F.earbitten && sd < 0) { lkCirc(g, ex, ey, 0.035 * k, L.woundD); continue; }
      lkEll(g, ex, ey, 0.085 * k, 0.045 * k, ang, skinC.m, skinC.o, 0.025);
      if (F.earring && sd > 0 && lod <= 1) lkCirc(g, ex - fdx * 0.04, ey - fdy * 0.04, 0.025, '#d8d8d8');
    }
  }
  // the skull, lit from the side the light comes from
  lkEll(g, x, y, rx, ry, ang, lkShade(g, x, y, Math.max(rx, ry), skinC), skinC.o, 0.045);
  lkTex(g, 'skin', 0.5);
  // the tip of the nose and the brow at the front (when not looking up at you)
  if (!covered && vis < 0.45 && !down && lod <= 1) {
    lkEll(g, x + fdx * rx * 0.98, y + fdy * rx * 0.98, 0.05 * k, 0.035 * k, ang, skinC.m, skinC.o, 0.02);
    g.strokeStyle = skinC.sh; g.lineWidth = 0.03; g.beginPath(); g.ellipse(x, y, rx * 0.86, ry * 0.86, ang, -0.7, 0.7); g.stroke();
  }
  const tx = x + ux * hr * 0.4, ty = y + uy * hr * 0.4;
  const ffx = x + fdx * rx * (0.62 - 0.48 * vis), ffy = y + fdy * rx * (0.62 - 0.48 * vis);
  lkHair(g, m, x, y, hr, rx, ry, ang, fdx, fdy, vis, down, tx, ty);
  // what the dead months did to the scalp
  if (lod <= 1 && !covered) {
    const R = lkRand(LKM.seed + 3);
    if (F.scalpwound) { const a = ang + Math.PI * (0.6 + R() * 0.8), wx = x + Math.cos(a) * ry * 0.45, wy = y + Math.sin(a) * ry * 0.45; lkBlob(g, R, wx, wy, 0.07 * k, L.wound, 7); g.strokeStyle = L.woundD; g.lineWidth = 0.02; g.beginPath(); g.moveTo(wx - Math.cos(a + 1.5) * 0.05, wy - Math.sin(a + 1.5) * 0.05); g.lineTo(wx + Math.cos(a + 1.5) * 0.05, wy + Math.sin(a + 1.5) * 0.05); g.stroke(); }
    if (F.mottled) lkBlob(g, R, x - fdx * rx * 0.3 + px * ry * 0.3, y - fdy * rx * 0.3 + py * ry * 0.3, 0.07 * k, L.livor, 6);
    if (F.maggots) { g.fillStyle = '#f2ecd0'; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(x + (R() - 0.5) * ry, y + (R() - 0.5) * ry, 0.03, 0.013, R() * 3, 0, TAU); g.fill(); } }
    if (F.mold) lkBlob(g, R, x - fdx * rx * 0.2, y - fdy * rx * 0.2, 0.08 * k, 'rgba(150,170,120,0.5)', 7);
    if (F.barnacles) { for (let i = 0; i < 3; i++) { const bx = x + (R() - 0.5) * ry, by = y + (R() - 0.5) * ry; lkCirc(g, bx, by, 0.035, '#c8c4b0'); lkCirc(g, bx, by, 0.014, '#4a4a42'); } }
    if (F.blisters || F.burns) for (let i = 0; i < 3; i++) lkCirc(g, x + (R() - 0.5) * ry * 1.2, y + (R() - 0.5) * ry * 1.2, 0.03, F.burns ? 'rgba(30,18,12,0.6)' : 'rgba(230,210,150,0.7)');
    if (F.staples) { g.strokeStyle = '#a8adb2'; g.lineWidth = 0.018; for (let i = 0; i < 4; i++) { const a = ang + Math.PI * 0.7 + i * 0.22, sx2 = x + Math.cos(a) * ry * 0.6, sy2 = y + Math.sin(a) * ry * 0.6; g.beginPath(); g.moveTo(sx2 - 0.025, sy2 - 0.02); g.lineTo(sx2 + 0.025, sy2 + 0.02); g.stroke(); } }
  }
  if (!down) lkFace(g, m, pose, x, y, hr, rx, ang, fdx, fdy, vis, ffx, ffy);
  lkHat(g, m, x, y, hr, rx, ang, fdx, fdy, vis, down, tx, ty, pose);
  lkRim(g, x, y, rx, ry, ang);
}
function lkHair(g, m, x, y, hr, rx, ry, ang, fdx, fdy, vis, down, tx, ty) {
  const L = m.al, F = L.F, h = L.hair, H = L.hr, lod = LKO.lod, px = -fdy, py = fdx;
  const sheen = () => { if (lod > 1 || !LKL) return; const a = Math.atan2(LKL.y, LKL.x); g.strokeStyle = H.hl; g.lineWidth = 0.035; g.beginPath(); g.ellipse(x - fdx * rx * 0.08, y - fdy * rx * 0.08, rx * 0.72, ry * 0.7, ang, a - ang - 0.55, a - ang + 0.55); g.stroke(); };
  if (h === 'none' || h === 'bald' || L.head === 'hazhood' || L.head === 'spacehelm' || L.head === 'riothelm' || L.head === 'hood' || L.head === 'football') {
    if ((h === 'bald' || h === 'none') && lod <= 1 && !/hood|helm|football/.test(L.head)) { g.fillStyle = 'rgba(255,255,255,0.16)'; g.beginPath(); g.ellipse(tx - fdx * hr * 0.1 + (LKL ? LKL.x : 0) * hr * 0.2, ty - fdy * hr * 0.1 + (LKL ? LKL.y : 0) * hr * 0.2, hr * 0.38, hr * 0.22, ang, 0, TAU); g.fill(); }
    return;
  }
  // hair sits behind the face: pushed back from it, smaller when the face turns up to you
  const back = 0.16 + 0.45 * vis, cx = x - fdx * rx * back + (tx - x) * 0.3, cy = y - fdy * rx * back + (ty - y) * 0.3, rr = 1 - 0.28 * vis, hrx = rx * 0.98 * rr, hry = ry * 1.04 * rr;
  const cap = (k, fill, out) => lkEll(g, cx, cy, hrx * k, hry * k, ang, fill, out, 0.035);
  if (down) { lkEll(g, x, y, rx * 0.96, ry * 0.98, ang, H.b, H.o, 0.04); return; }
  switch (h) {
    case 'balding': g.strokeStyle = H.b; g.lineWidth = hr * 0.34; g.beginPath(); g.ellipse(cx, cy, hrx * 0.8, hry * 0.78, ang, Math.PI * 0.42, Math.PI * 1.58); g.stroke(); if (lod <= 1) { g.fillStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); g.ellipse(x + (LKL ? LKL.x : 0) * hr * 0.25, y + (LKL ? LKL.y : 0) * hr * 0.25, hr * 0.32, hr * 0.2, ang, 0, TAU); g.fill(); } break;
    case 'short': case 'slick': case 'messy': case 'shaved':
      cap(1, h === 'shaved' ? lkCss(L.hr.rgb, 0.45) : lkShade(g, cx, cy, hrx, H), h === 'shaved' ? null : H.o);
      if (lod <= 1 && h !== 'shaved') { g.strokeStyle = H.d; g.lineWidth = 0.018; for (let i = -3; i <= 3; i++) { const a2 = ang + Math.PI + i * 0.32; g.beginPath(); g.moveTo(cx + Math.cos(a2) * hrx * 0.15, cy + Math.sin(a2) * hry * 0.15); g.lineTo(cx + Math.cos(a2) * hrx * 0.85, cy + Math.sin(a2) * hry * 0.85); g.stroke(); } }
      if (h === 'shaved' && lod <= 1) { g.fillStyle = lkCss(L.hr.rgb, 0.35); for (let i = 0; i < 10; i++) { const a2 = i * 2.4, q = (i % 3) / 3 + 0.2; lkCirc(g, cx + Math.cos(a2) * hrx * q, cy + Math.sin(a2) * hry * q, 0.012, lkCss(L.hr.rgb, 0.35)); } }
      if (h === 'slick' && lod <= 1) { g.strokeStyle = H.l; g.lineWidth = 0.03; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(cx + fdx * hrx * 0.6 + px * i * hry * 0.3, cy + fdy * hrx * 0.6 + py * i * hry * 0.3); g.lineTo(cx - fdx * hrx * 0.7 + px * i * hry * 0.3, cy - fdy * hrx * 0.7 + py * i * hry * 0.3); g.stroke(); } }
      if (h === 'messy' && lod <= 1) { g.fillStyle = H.b; for (let i = 0; i < 7; i++) { const a = ang + Math.PI * 0.45 + i * 0.36; g.beginPath(); g.moveTo(cx + Math.cos(a - 0.14) * hrx * 0.85, cy + Math.sin(a - 0.14) * hry * 0.85); g.lineTo(cx + Math.cos(a) * hrx * 1.32, cy + Math.sin(a) * hry * 1.32); g.lineTo(cx + Math.cos(a + 0.14) * hrx * 0.85, cy + Math.sin(a + 0.14) * hry * 0.85); g.fill(); } }
      if (h !== 'shaved') sheen();
      break;
    case 'ponytail': case 'bun':
      cap(1, lkShade(g, cx, cy, hrx, H), H.o);
      if (lod <= 1) { g.strokeStyle = H.d; g.lineWidth = 0.018; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x + fdx * rx * 0.55 + px * i * ry * 0.25, y + fdy * rx * 0.55 + py * i * ry * 0.25); g.lineTo(x - fdx * rx * 0.85 + px * i * ry * 0.08, y - fdy * rx * 0.85 + py * i * ry * 0.08); g.stroke(); } }
      if (h === 'bun') { lkCirc(g, x - fdx * rx * 1.0, y - fdy * rx * 1.0, hr * 0.48, H.d); if (lod <= 1) { g.strokeStyle = H.o; g.lineWidth = 0.02; g.beginPath(); g.arc(x - fdx * rx * 1.0, y - fdy * rx * 1.0, hr * 0.3, 0, 4); g.stroke(); } }
      else { const t = LKO.t || 0, sw = Math.sin(t * 5) * 0.25; g.strokeStyle = H.b; g.lineWidth = hr * 0.42; g.beginPath(); g.moveTo(x - fdx * rx * 0.85, y - fdy * rx * 0.85); g.quadraticCurveTo(x - fdx * rx * 1.5 + fdy * sw, y - fdy * rx * 1.5 - fdx * sw, x - fdx * rx * 2.1 + fdy * sw * 2, y - fdy * rx * 2.1 - fdx * sw * 2); g.stroke(); lkCirc(g, x - fdx * rx * 0.95, y - fdy * rx * 0.95, hr * 0.22, L.ac.b); }
      sheen(); break;
    case 'long': {
      // long hair hangs over the shoulders and down the back, in strands
      g.fillStyle = H.d; g.beginPath(); g.ellipse(x - fdx * rx * 1.15, y - fdy * rx * 1.15, ry * 1.25, rx * 1.15, ang + Math.PI / 2, 0, TAU); g.fill();
      cap(1.05, lkShade(g, cx, cy, hrx, H), H.o);
      if (lod <= 1) { g.strokeStyle = H.d; g.lineWidth = 0.025; for (let i = -3; i <= 3; i++) { const qx = px * i * ry * 0.28, qy = py * i * ry * 0.28; g.beginPath(); g.moveTo(x + fdx * rx * 0.4 + qx * 0.5, y + fdy * rx * 0.4 + qy * 0.5); g.quadraticCurveTo(x - fdx * rx * 0.6 + qx, y - fdy * rx * 0.6 + qy, x - fdx * rx * 2.0 + qx * 1.3, y - fdy * rx * 2.0 + qy * 1.3); g.stroke(); } }
      sheen(); break;
    }
    case 'curly': for (let i = 0; i < 9; i++) { const a = ang + Math.PI * 0.3 + i * 0.27 * 2.6; lkCirc(g, cx + Math.cos(a) * hrx * 0.62, cy + Math.sin(a) * hry * 0.62, hr * 0.4, i % 2 ? H.b : H.d); if (lod <= 1) lkCirc(g, cx + Math.cos(a) * hrx * 0.62 - 0.02, cy + Math.sin(a) * hry * 0.62 - 0.02, hr * 0.15, H.l); } lkCirc(g, cx, cy, hr * 0.45, H.b); break;
    case 'mohawk': { g.strokeStyle = H.b; g.lineWidth = hr * 0.44; g.beginPath(); g.moveTo(x + fdx * rx * 0.7, y + fdy * rx * 0.7); g.lineTo(x - fdx * rx * 1.0, y - fdy * rx * 1.0); g.stroke(); if (lod <= 1) { g.fillStyle = H.l; for (let i = 0; i < 6; i++) { const t2 = i / 5, qx = x + fdx * rx * (0.7 - 1.7 * t2), qy = y + fdy * rx * (0.7 - 1.7 * t2); g.beginPath(); g.moveTo(qx - fdy * 0.06, qy + fdx * 0.06); g.lineTo(qx - fdx * 0.2, qy - fdy * 0.2); g.lineTo(qx + fdy * 0.06, qy - fdx * 0.06); g.fill(); } g.fillStyle = lkCss(L.hr.rgb, 0.25); for (const sd of [-1, 1]) lkEll(g, x + px * sd * ry * 0.55, y + py * sd * ry * 0.55, rx * 0.6, ry * 0.3, ang, lkCss([40, 40, 40], 0.25)); } break; }
    case 'patchy': for (let i = 0; i < 5; i++) { const a = ang + Math.PI * 0.6 + i * 0.6; lkEll(g, cx + Math.cos(a) * hrx * 0.5, cy + Math.sin(a) * hry * 0.5, hr * 0.32, hr * 0.22, a, H.b); } break;
    default: cap(1, H.b, H.o);
  }
  // hair falling out: the scalp showing through in patches
  if (F.hairloss && lod <= 1 && h !== 'patchy') { const R = lkRand(LKM.seed + 11); for (let i = 0; i < 2; i++) { const a = ang + Math.PI * (0.5 + R()), q = 0.3 + R() * 0.4; lkEll(g, cx + Math.cos(a) * hrx * q, cy + Math.sin(a) * hry * q, hr * 0.22, hr * 0.15, a, L.skin.m); } }
}
function lkFace(g, m, pose, x, y, hr, rx, ang, fdx, fdy, vis, fx, fy) {
  const L = m.al, F = L.F, lod = LKO.lod, px = -fdy, py = fdx, jaw = pose[AP.jaw], vk = 0.45 + 0.55 * vis;
  const masked = L.head === 'hazhood' || L.head === 'spacehelm' || L.head === 'divemask' || L.head === 'riothelm' || L.head === 'respirator';
  // the mouth: opens with the jaw; an unhinged one hangs down to the chest
  if (!masked && (jaw > 0.15 || F.bigjaw)) {
    const jo = (F.bigjaw ? 0.55 + jaw * 0.6 : jaw * 0.42) * hr, mx = fx + fdx * hr * (0.1 + 0.18 * vis), my = fy + fdy * hr * (0.1 + 0.18 * vis);
    g.fillStyle = '#1a0606'; g.beginPath(); g.ellipse(mx + fdx * jo * 0.4, my + fdy * jo * 0.4, hr * 0.3 * vk, Math.max(0.02, jo * 0.5), ang + Math.PI / 2, 0, TAU); g.fill();
    if (lod <= 1 && vis > 0.2) { g.strokeStyle = '#d8d0b0'; g.lineWidth = 0.025; g.beginPath(); g.moveTo(mx - px * hr * 0.2, my - py * hr * 0.2); g.lineTo(mx + px * hr * 0.2, my + py * hr * 0.2); g.stroke(); }
    if (F.mouthguard && vis > 0.2) { g.strokeStyle = '#3a8ad8'; g.lineWidth = 0.035; g.beginPath(); g.moveTo(mx - px * hr * 0.15, my - py * hr * 0.15); g.lineTo(mx + px * hr * 0.15, my + py * hr * 0.15); g.stroke(); }
    if (F.drool && lod <= 1) { g.strokeStyle = 'rgba(184,236,74,0.8)'; g.lineWidth = 0.035; g.beginPath(); g.moveTo(mx + fdx * jo * 0.8, my + fdy * jo * 0.8); g.lineTo(mx + fdx * (jo + 0.25), my + fdy * (jo + 0.25)); g.stroke(); }
  }
  // the cheek torn open, teeth showing on one side
  if (F.teeth && !masked && lod <= 1) { const cx = fx + px * hr * 0.42 + fdx * hr * 0.1, cy = fy + py * hr * 0.42 + fdy * hr * 0.1; lkEll(g, cx, cy, hr * 0.2, hr * 0.12, ang, L.woundD); g.strokeStyle = '#e8e0c4'; g.lineWidth = 0.02; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(cx + fdx * i * 0.03, cy + fdy * i * 0.03); g.lineTo(cx + fdx * i * 0.03 + px * 0.04, cy + fdy * i * 0.03 + py * 0.04); g.stroke(); } }
  if (L.beard) { g.fillStyle = L.hr.d; g.beginPath(); g.ellipse(fx + fdx * hr * 0.15, fy + fdy * hr * 0.15, hr * 0.42, hr * 0.28 * vk, ang + Math.PI / 2, 0, TAU); g.fill(); if (lod <= 1) { g.strokeStyle = L.hr.o; g.lineWidth = 0.015; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(fx + px * i * hr * 0.12, fy + py * i * hr * 0.12); g.lineTo(fx + px * i * hr * 0.12 + fdx * hr * 0.3, fy + py * i * hr * 0.12 + fdy * hr * 0.3); g.stroke(); } } }
  if (L.head === 'mask' || F.mask) { g.fillStyle = L.key === 'surgeon' ? '#8fb8a0' : '#b9d6e0'; g.beginPath(); g.ellipse(fx + fdx * hr * 0.12, fy + fdy * hr * 0.12, hr * 0.5, hr * 0.26 * vk, ang + Math.PI / 2, 0, TAU); g.fill(); if (lod <= 1) { g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.015; g.stroke(); g.strokeStyle = 'rgba(240,240,240,0.8)'; g.lineWidth = 0.015; g.beginPath(); g.moveTo(fx + px * hr * 0.5, fy + py * hr * 0.5); g.lineTo(x + px * hr * 0.95, y + py * hr * 0.95); g.moveTo(fx - px * hr * 0.5, fy - py * hr * 0.5); g.lineTo(x - px * hr * 0.95, y - py * hr * 0.95); g.stroke(); } }
  // the eyes: sunken, they catch the light, and glow in the dark
  if (L.head === 'divemask' || L.head === 'goggles' || F.goggles || L.head === 'spacehelm' || L.head === 'hazhood' || L.head === 'riothelm') return;
  const ex = fx - fdx * hr * 0.12 * (1 - vis), ey = fy - fdy * hr * 0.12 * (1 - vis), sep = hr * 0.36, er = hr * (0.12 + 0.05 * vis) * (F.bigjaw ? 1.2 : 1);
  for (const sd of [-1, 1]) {
    const qx = ex + px * sep * sd, qy = ey + py * sep * sd;
    lkCirc(g, qx, qy, er * 1.35, 'rgba(20,10,8,0.65)');
    if (F.eyemissing && sd < 0) { lkCirc(g, qx, qy, er * 1.05, L.woundD); continue; }
    lkCirc(g, qx, qy, er, L.eye);
    if (F.eyeblack && vis > 0.1) { g.fillStyle = '#0a0a0a'; g.beginPath(); g.ellipse(qx + fdx * er * 1.6, qy + fdy * er * 1.6, er * 0.55, er * 1.2, ang + Math.PI / 2, 0, TAU); g.fill(); }
    if (F.mascara && vis > 0.1 && lod <= 1) { g.strokeStyle = 'rgba(20,20,30,0.6)'; g.lineWidth = 0.022; g.beginPath(); g.moveTo(qx + fdx * er, qy + fdy * er); g.lineTo(qx + fdx * er * 4, qy + fdy * er * 4 + py * 0.02); g.stroke(); }
  }
  if (LKO.glow && lod <= 1) {
    const night = CORE.frame.night || 0, k = LKO.preview ? 0.5 : 0.2 + night * 0.65;
    if (k > 0.15) { g.globalCompositeOperation = 'lighter'; const c = L.eyeRGB; g.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (k * 0.35).toFixed(3) + ')'; for (const sd of [-1, 1]) { if (F.eyemissing && sd < 0) continue; g.beginPath(); g.arc(ex + px * sep * sd, ey + py * sep * sd, er * 3.2, 0, TAU); g.fill(); } g.globalCompositeOperation = 'source-over'; }
  }
  if (L.head === 'glasses') { g.strokeStyle = '#1a1a1a'; g.lineWidth = 0.03; for (const sd of [-1, 1]) { g.beginPath(); g.arc(ex + px * sep * sd, ey + py * sep * sd, er * 1.7, 0, TAU); g.stroke(); } if (lod <= 1) { g.beginPath(); g.moveTo(ex - px * sep * 0.4, ey - py * sep * 0.4); g.lineTo(ex + px * sep * 0.4, ey + py * sep * 0.4); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 0.015; g.beginPath(); g.arc(ex + px * sep, ey + py * sep, er * 1.3, 3.6, 4.6); g.stroke(); } }
  if (L.head === 'nose' && vis > -0.2) lkCirc(g, fx + fdx * hr * 0.25, fy + fdy * hr * 0.25, hr * 0.2, '#e8202a');
  if (L.key === 'clown' && lod <= 1) { g.strokeStyle = '#c8202a'; g.lineWidth = 0.045; g.beginPath(); g.arc(fx + fdx * hr * 0.1, fy + fdy * hr * 0.1, hr * 0.35, ang + Math.PI / 2 - 1, ang + Math.PI / 2 + 1); g.stroke(); g.fillStyle = 'rgba(40,60,160,0.5)'; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(ex + px * sep * sd - fdx * er * 2.2, ey + py * sep * sd - fdy * er * 2.2); g.lineTo(ex + px * sep * sd + px * er * sd * 0.8, ey + py * sep * sd + py * er * sd * 0.8); g.lineTo(ex + px * sep * sd + fdx * er * 2.2, ey + py * sep * sd + fdy * er * 2.2); g.fill(); } }
  if (F.piercings && lod <= 1) { lkCirc(g, x + px * hr * 0.92, y + py * hr * 0.92, 0.035, '#d8d8d8'); lkCirc(g, x - px * hr * 0.92, y - py * hr * 0.92, 0.035, '#d8d8d8'); lkCirc(g, fx + fdx * hr * 0.2 + px * 0.03, fy + fdy * hr * 0.2 + py * 0.03, 0.02, '#d8d8d8'); }
  if (F.earbuds) { lkCirc(g, x + px * hr * 0.95, y + py * hr * 0.95, 0.045, '#f2f2f2'); lkCirc(g, x - px * hr * 0.95, y - py * hr * 0.95, 0.045, '#f2f2f2'); }
  if (F.sunburn && lod <= 1) { g.fillStyle = 'rgba(230,70,50,0.2)'; g.beginPath(); g.ellipse(x, y, rx * 0.9, hr * 0.9, ang, 0, TAU); g.fill(); }
}
function lkHat(g, m, x, y, hr, rx, ang, fdx, fdy, vis, down, tx, ty, pose) {
  const L = m.al, hd = L.head, C = L.cap, lod = LKO.lod, cx = tx * 0.6 + x * 0.4, cy = ty * 0.6 + y * 0.4, flat = 1 - vis * 0.5, E = rx / hr, px = -fdy, py = fdx;
  switch (hd) {
    case 'cap': { const bk = L.key === 'mech' ? -1 : 1; lkEll(g, cx, cy, hr * 0.98 * E, hr * 0.94, ang, lkShade(g, cx, cy, hr, C), C.o, 0.035); g.fillStyle = C.d; g.beginPath(); g.ellipse(cx + fdx * rx * 0.88 * bk, cy + fdy * rx * 0.88 * bk, hr * 0.5 * flat, hr * 0.7, ang, 0, TAU); g.fill(); if (lod <= 1) { g.strokeStyle = C.o; g.lineWidth = 0.02; for (let i = 0; i < 3; i++) { const a = ang + i * 2.09; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * hr * 0.9, cy + Math.sin(a) * hr * 0.9); g.stroke(); } lkCirc(g, cx, cy, 0.03, C.d); } break; }
    case 'hardhat': lkEll(g, cx, cy, hr * 1.25 * E, hr * 1.15, ang, C.d, C.o, 0.035); lkEll(g, cx, cy, hr * 0.95 * E, hr * 0.88, ang, lkShade(g, cx, cy, hr, C), null); if (lod <= 1) { g.strokeStyle = C.l; g.lineWidth = 0.045; g.beginPath(); g.moveTo(cx + fdx * rx * 0.85, cy + fdy * rx * 0.85); g.lineTo(cx - fdx * rx * 0.85, cy - fdy * rx * 0.85); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(cx + (LKL ? LKL.x : 0) * hr * 0.3, cy + (LKL ? LKL.y : 0) * hr * 0.3, hr * 0.3, hr * 0.18, ang, 0, TAU); g.fill(); } break;
    case 'helmet': case 'climbhelm': lkEll(g, cx, cy, hr * 1.12 * E, hr * 1.06, ang, lkShade(g, cx, cy, hr, C), C.o, 0.04); if (lod <= 1 && hd === 'helmet') { g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.035; g.beginPath(); g.ellipse(cx, cy, hr * 0.78 * E, hr * 0.74, ang, 0, TAU); g.stroke(); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 5; i++) lkCirc(g, cx + Math.cos(ang + i * 1.3) * hr * 0.45, cy + Math.sin(ang + i * 1.3) * hr * 0.45, 0.03, 'rgba(0,0,0,0.25)'); } if (hd === 'climbhelm' && lod <= 1) { g.fillStyle = C.d; for (const s of [-1, 1]) g.fillRect(cx + px * s * hr * 0.4 - 0.04, cy + py * s * hr * 0.4 - 0.04, 0.08, 0.08); lkCirc(g, cx + fdx * rx * 0.75, cy + fdy * rx * 0.75, 0.05, '#f2f2d0'); } break;
    case 'bucket': lkEll(g, cx, cy, hr * 1.4 * E, hr * 1.34, ang, C.d, C.o, 0.035); lkEll(g, cx, cy, hr * 0.88 * E, hr * 0.85, ang, lkShade(g, cx, cy, hr, C), null); if (lod <= 1) { g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 0.02; g.beginPath(); g.ellipse(cx, cy, hr * 1.15 * E, hr * 1.1, ang, 0, TAU); g.stroke(); } break;
    case 'straw': lkEll(g, cx, cy, hr * 1.75 * E, hr * 1.66, ang, C.b, C.o, 0.035); lkEll(g, cx, cy, hr * 0.85 * E, hr * 0.82, ang, C.l, C.d, 0.035); if (lod <= 1) { g.strokeStyle = 'rgba(120,90,30,0.4)'; g.lineWidth = 0.02; for (const q of [1.1, 1.3, 1.5]) { g.beginPath(); g.ellipse(cx, cy, hr * q * E, hr * q, ang, 0, TAU); g.stroke(); } g.strokeStyle = '#7a3a2a'; g.lineWidth = 0.05; g.beginPath(); g.ellipse(cx, cy, hr * 0.9 * E, hr * 0.87, ang, 0, TAU); g.stroke(); } break;
    case 'chefhat': lkEll(g, cx, cy, hr * 1.1 * E, hr * 1.04, ang, C.b, '#b8b4a8', 0.035); if (lod <= 1) for (let i = 0; i < 6; i++) { const a = ang + i * 1.05; lkCirc(g, cx + Math.cos(a) * hr * 0.55, cy + Math.sin(a) * hr * 0.55, hr * 0.4, i % 2 ? C.l : C.b); } break;
    case 'headband': case 'sweatband': g.strokeStyle = L.ac.b; g.lineWidth = hr * 0.24; g.beginPath(); g.ellipse(x, y, rx * 0.88, hr * 0.84, ang, 0, TAU); g.stroke(); break;
    case 'bandana': lkEll(g, cx, cy, hr * 0.98 * E, hr * 0.92, ang, C.b, C.o, 0.035); g.fillStyle = C.d; g.beginPath(); g.moveTo(x - fdx * rx * 0.9, y - fdy * rx * 0.9); g.lineTo(x - fdx * rx * 1.45 - fdy * 0.12, y - fdy * rx * 1.45 + fdx * 0.12); g.lineTo(x - fdx * rx * 1.35 + fdy * 0.16, y - fdy * rx * 1.35 - fdx * 0.16); g.closePath(); g.fill(); if (lod <= 1) { g.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 5; i++) lkCirc(g, cx + Math.cos(ang + i * 1.25) * hr * 0.5, cy + Math.sin(ang + i * 1.25) * hr * 0.5, 0.02, 'rgba(255,255,255,0.5)'); } break;
    case 'beanie': case 'surgcap': lkEll(g, cx, cy, hr * 1.0 * E, hr * 0.96, ang, lkShade(g, cx, cy, hr, C), C.o, 0.035); if (hd === 'beanie' && lod <= 1) { lkCirc(g, cx - fdx * hr * 0.1, cy - fdy * hr * 0.1, hr * 0.28, C.l); g.strokeStyle = C.d; g.lineWidth = 0.02; for (let i = 0; i < 8; i++) { const a = ang + i * 0.785; g.beginPath(); g.moveTo(cx + Math.cos(a) * hr * 0.3, cy + Math.sin(a) * hr * 0.3); g.lineTo(cx + Math.cos(a) * hr * 0.9, cy + Math.sin(a) * hr * 0.9); g.stroke(); } } break;
    case 'hazhood': lkEll(g, x, y, hr * 1.28 * E, hr * 1.2, ang, lkShade(g, x, y, hr * 1.2, L.cl), L.cl.o, 0.045); if (!down) { g.fillStyle = 'rgba(40,60,70,0.85)'; g.beginPath(); g.ellipse(x + fdx * rx * (0.55 - 0.45 * vis), y + fdy * rx * (0.55 - 0.45 * vis), hr * 0.62, hr * (0.35 + 0.35 * vis), ang + Math.PI / 2, 0, TAU); g.fill(); if (lod <= 1) { g.fillStyle = 'rgba(200,240,255,0.3)'; g.beginPath(); g.ellipse(x + fdx * rx * 0.5 - fdy * 0.1, y + fdy * rx * 0.5 + fdx * 0.1, hr * 0.2, hr * 0.12, ang, 0, TAU); g.fill(); if (L.F.cracks) { g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 0.015; g.beginPath(); g.moveTo(x + fdx * rx * 0.5, y + fdy * rx * 0.5); g.lineTo(x + fdx * rx * 0.6 + px * 0.08, y + fdy * rx * 0.6 + py * 0.08); g.lineTo(x + fdx * rx * 0.55 + px * 0.14, y + fdy * rx * 0.55 + py * 0.14); g.stroke(); } } } break;
    case 'spacehelm': lkEll(g, x, y, hr * 1.42 * E, hr * 1.36, ang, lkShade(g, x, y, hr * 1.3, lkSet([232, 232, 226])), '#5a5a58', 0.045); if (!down) { const vx = x + fdx * rx * (0.5 - 0.45 * vis), vy = y + fdy * rx * (0.5 - 0.45 * vis); const gr = lod <= 1 ? g.createLinearGradient(vx - fdy * hr, vy + fdx * hr, vx + fdy * hr, vy - fdx * hr) : null; if (gr) { gr.addColorStop(0, '#b8862a'); gr.addColorStop(0.5, '#f2d27a'); gr.addColorStop(1, '#6a4a12'); } g.fillStyle = gr || '#c8962a'; g.beginPath(); g.ellipse(vx, vy, hr * 0.95, hr * (0.45 + 0.5 * vis), ang + Math.PI / 2, 0, TAU); g.fill(); } break;
    case 'riothelm': lkEll(g, x, y, hr * 1.24 * E, hr * 1.18, ang, lkShade(g, x, y, hr * 1.15, lkSet([34, 36, 40])), '#0a0a0c', 0.045); if (!down) { g.fillStyle = 'rgba(120,150,180,0.55)'; g.beginPath(); g.ellipse(x + fdx * rx * (0.6 - 0.5 * vis), y + fdy * rx * (0.6 - 0.5 * vis), hr * 0.88, hr * (0.32 + 0.4 * vis), ang + Math.PI / 2, 0, TAU); g.fill(); } if (lod <= 1) { g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(x - fdx * rx * 0.2 + (LKL ? LKL.x : 0) * hr * 0.3, y - fdy * rx * 0.2 + (LKL ? LKL.y : 0) * hr * 0.3, hr * 0.35, hr * 0.2, ang, 0, TAU); g.fill(); } break;
    case 'hood': lkEll(g, x - fdx * hr * 0.15, y - fdy * hr * 0.15, hr * 1.25 * E, hr * 1.16, ang, lkShade(g, x, y, hr * 1.2, L.cl), L.cl.o, 0.045); if (!down && vis < 0.6) { g.fillStyle = '#0a0a0a'; g.beginPath(); g.ellipse(x + fdx * rx * 0.55, y + fdy * rx * 0.55, hr * 0.62, hr * 0.32, ang + Math.PI / 2, 0, TAU); g.fill(); g.fillStyle = L.eye; for (const sd of [-1, 1]) lkCirc(g, x + fdx * rx * 0.6 - fdy * sd * hr * 0.25, y + fdy * rx * 0.6 + fdx * sd * hr * 0.25, hr * 0.1, L.eye); } break;
    case 'veil': { g.fillStyle = 'rgba(245,242,236,0.55)'; g.beginPath(); g.ellipse(x - fdx * rx * 1.0, y - fdy * rx * 1.0, hr * 1.3, hr * 1.85, ang + Math.PI / 2, 0, TAU); g.fill(); if (L.hair === 'long') { g.fillStyle = L.hr.b; g.beginPath(); g.ellipse(x - fdx * rx * 0.2, y - fdy * rx * 0.2, rx * 0.95, hr * 1.02, ang, 0, TAU); g.fill(); } lkEll(g, cx, cy, hr * 0.55 * E, hr * 0.5, ang, '#e8e2d4', null); if (lod <= 1) { for (let i = 0; i < 6; i++) { const a = ang + Math.PI * 0.6 + i * 0.3; lkCirc(g, x + Math.cos(a) * hr * 0.7, y + Math.sin(a) * hr * 0.7, 0.045, '#f2f0e0'); } } break; }
    case 'divemask': if (!down) { g.strokeStyle = '#1a1a1a'; g.lineWidth = hr * 0.18; g.beginPath(); g.ellipse(x, y, rx * 0.92, hr * 0.88, ang, 0, TAU); g.stroke(); g.fillStyle = 'rgba(60,140,180,0.7)'; g.beginPath(); g.ellipse(x + fdx * rx * (0.55 - 0.45 * vis), y + fdy * rx * (0.55 - 0.45 * vis), hr * 0.55, hr * (0.3 + 0.35 * vis), ang + Math.PI / 2, 0, TAU); g.fill(); g.strokeStyle = '#f2c418'; g.lineWidth = 0.06; g.beginPath(); g.moveTo(x + fdy * hr * 0.6, y - fdx * hr * 0.6); g.lineTo(x + fdy * hr * 0.6 - fdx * rx * 0.9, y - fdx * hr * 0.6 - fdy * rx * 0.9); g.stroke(); } break;
    case 'goggles': break;
    case 'respirator': if (!down) { lkCirc(g, x + fdx * rx * (0.75 - 0.5 * vis), y + fdy * rx * (0.75 - 0.5 * vis), hr * 0.38, '#2a2c2a'); for (const sd of [-1, 1]) lkCirc(g, x + fdx * rx * (0.6 - 0.4 * vis) - fdy * sd * hr * 0.45, y + fdy * rx * (0.6 - 0.4 * vis) + fdx * sd * hr * 0.45, hr * 0.24, '#4a5a3a'); g.strokeStyle = '#1a1a1a'; g.lineWidth = 0.03; g.beginPath(); g.ellipse(x, y, rx * 0.9, hr * 0.86, ang, Math.PI * 0.6, Math.PI * 1.4); g.stroke(); } break;
    case 'mushrooms': { const cs = ['#c98b4a', '#b87a3a', '#d8a060']; for (let i = 0; i < 4; i++) { const a = ang + Math.PI * 0.5 + i * 0.9; const mx = cx + Math.cos(a) * hr * 0.45, my = cy + Math.sin(a) * hr * 0.45; lkEll(g, mx, my, hr * (0.42 - i * 0.05), hr * (0.38 - i * 0.05), a, lkShade(g, mx, my, hr * 0.4, lkSet(lkRGB(cs[i % 3]))), '#5a3a1a', 0.025); if (lod <= 1) { lkCirc(g, mx, my, hr * 0.08, '#f2e0c0'); lkCirc(g, mx + 0.04, my - 0.03, hr * 0.05, '#f2e0c0'); } } break; }
    case 'football': {
      // the helmet: a glossy shell in the team colour, its stripe front to back, the ear holes, the cage across the face
      const sx = hr * 1.42 * E, sy = hr * 1.3;
      lkEll(g, x - fdx * rx * 0.05, y - fdy * rx * 0.05, sx, sy, ang, lkShade(g, x, y, sx, C), C.o, 0.045);
      g.strokeStyle = L.ac.b; g.lineWidth = hr * 0.22; g.beginPath(); g.moveTo(x + fdx * sx * 0.8, y + fdy * sx * 0.8); g.lineTo(x - fdx * sx * 0.95, y - fdy * sx * 0.95); g.stroke();
      g.strokeStyle = C.b; g.lineWidth = hr * 0.08; g.stroke();
      for (const sd of [-1, 1]) lkCirc(g, x + px * sd * sy * 0.9, y + py * sd * sy * 0.9, 0.03, '#0a0a0a');
      if (lod <= 1) { g.fillStyle = 'rgba(255,255,255,0.32)'; g.beginPath(); g.ellipse(x + (LKL ? LKL.x : -0.4) * hr * 0.45, y + (LKL ? LKL.y : -0.5) * hr * 0.45, hr * 0.38, hr * 0.2, ang + 0.4, 0, TAU); g.fill(); for (const sd of [-1, 1]) lkEll(g, x + px * sd * sy * 0.62 - fdx * rx * 0.2, y + py * sd * sy * 0.62 - fdy * rx * 0.2, 0.08, 0.06, ang, L.ac.b); }
      if (!down) { const fmx = x + fdx * sx * (0.9 - 0.35 * vis), fmy = y + fdy * sx * (0.9 - 0.35 * vis); g.strokeStyle = '#b8bcc0'; g.lineWidth = 0.035; for (const q of [0.55, 0.85]) { g.beginPath(); g.ellipse(x, y, sx * (0.78 + q * 0.25), sy * (0.75 + q * 0.2), ang, -0.7 * (1 - vis * 0.3), 0.7 * (1 - vis * 0.3)); g.stroke(); } g.beginPath(); g.moveTo(fmx - px * sy * 0.15, fmy - py * sy * 0.15); g.lineTo(fmx + fdx * 0.06 - px * sy * 0.15, fmy + fdy * 0.06 - py * sy * 0.15); g.moveTo(fmx + px * sy * 0.15, fmy + py * sy * 0.15); g.lineTo(fmx + fdx * 0.06 + px * sy * 0.15, fmy + fdy * 0.06 + py * sy * 0.15); g.stroke(); }
      break;
    }
  }
  // goggles over whatever else, on the forehead
  if ((hd === 'goggles' || L.F.goggles) && !down) { g.strokeStyle = '#2a2a2a'; g.lineWidth = hr * 0.16; g.beginPath(); g.ellipse(x, y, rx * 0.93, hr * 0.9, ang, 0, TAU); g.stroke(); for (const sd of [-1, 1]) { const qx = x + fdx * rx * (0.62 - 0.45 * vis) - fdy * sd * hr * 0.32, qy = y + fdy * rx * (0.62 - 0.45 * vis) + fdx * sd * hr * 0.32; lkCirc(g, qx, qy, hr * 0.25, '#2a2a2a'); lkCirc(g, qx, qy, hr * 0.18, L.key === 'skipatrol' || L.key === 'climber' ? 'rgba(242,164,58,0.85)' : 'rgba(170,220,230,0.8)'); if (lod <= 1) lkCirc(g, qx - 0.02, qy - 0.02, hr * 0.06, 'rgba(255,255,255,0.6)'); } }
  if (L.F.icicles && lod <= 1) { g.fillStyle = 'rgba(220,245,255,0.8)'; for (let i = 0; i < 4; i++) { const a = ang + Math.PI * 0.6 + i * 0.5; g.beginPath(); g.moveTo(x + Math.cos(a - 0.1) * hr, y + Math.sin(a - 0.1) * hr); g.lineTo(x + Math.cos(a) * hr * 1.5, y + Math.sin(a) * hr * 1.5); g.lineTo(x + Math.cos(a + 0.1) * hr, y + Math.sin(a + 0.1) * hr); g.fill(); } }
}
/* ---- what moves on it: flies, sparks, embers, spores, frost breath, the glow of the irradiated ---- */
function lkFx(g, m, pose, o) {
  const L = m.al, F = L.F, t = o.t || 0, sx = lkX(JN.sc), sy = lkY(JN.sc), hx = lkX(JN.head), hy = lkY(JN.head);
  if (F.flies || F.maggots) { g.fillStyle = '#16120a'; for (let i = 0; i < (F.flies ? 6 : 3); i++) { const a = t * (3 + i * 0.7) + i * 1.9, rr = 0.8 + 0.35 * Math.sin(t * 2 + i); g.fillRect(hx + Math.cos(a) * rr - 0.035, hy + Math.sin(a * 1.3) * rr - 0.035, 0.07, 0.07); } }
  if (F.sparks && Math.random() < 0.5) { g.strokeStyle = '#fff36b'; g.lineWidth = 0.035; g.beginPath(); let x = sx + (Math.random() - 0.5), y = sy + (Math.random() - 0.5); g.moveTo(x, y); for (let i = 0; i < 3; i++) { x += (Math.random() - 0.5) * 0.5; y += (Math.random() - 0.5) * 0.5; g.lineTo(x, y); } g.stroke(); }
  if (F.embers) { g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { const ph = (t * 0.7 + i * 0.25) % 1, a = i * 1.7; g.fillStyle = 'rgba(255,' + (120 + i * 20) + ',40,' + (0.8 * (1 - ph)).toFixed(2) + ')'; g.beginPath(); g.arc(sx + Math.cos(a) * 0.5 - ph * 0.3, sy + Math.sin(a) * 0.5 + ph * 0.2, 0.06, 0, TAU); g.fill(); } g.globalCompositeOperation = 'source-over'; }
  if (F.spores) { g.fillStyle = 'rgba(220,190,120,0.45)'; for (let i = 0; i < 6; i++) { const ph = (t * 0.4 + i / 6) % 1, a = i * 2.3; g.beginPath(); g.arc(sx + Math.cos(a) * (0.6 + ph * 0.9), sy + Math.sin(a) * (0.6 + ph * 0.9), 0.05 * (1 - ph) + 0.02, 0, TAU); g.fill(); } }
  if (L.glowSkin || F.trefoil) { const night = CORE.frame.night || 0; if (night > 0.2 || o.preview) { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(200,255,60,' + (0.08 + 0.08 * Math.sin(t * 3)).toFixed(3) + ')'; g.beginPath(); g.arc(sx, sy, 1.8, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; } }
  if (F.drip && Math.random() < 0.3) { g.fillStyle = 'rgba(160,200,210,0.6)'; g.beginPath(); g.arc(sx + (Math.random() - 0.5) * 1.4, sy + (Math.random() - 0.5) * 1.4, 0.045, 0, TAU); g.fill(); }
  if (F.frost || L.key === 'skipatrol' || L.key === 'climber') { const ph = (t * 0.8) % 1, fdx = ANIMA.J[JN.fdir * 3], fdy = ANIMA.J[JN.fdir * 3 + 1]; g.fillStyle = 'rgba(235,245,255,' + (0.35 * (1 - ph)).toFixed(3) + ')'; g.beginPath(); g.arc(hx + fdx * (0.35 + ph * 0.5), hy + fdy * (0.35 + ph * 0.5), 0.08 + ph * 0.16, 0, TAU); g.fill(); }
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
