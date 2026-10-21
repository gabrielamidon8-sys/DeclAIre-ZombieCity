/* ================= MIMATIC: cinematic mimicry, directed (1.9.992) =================
   MIMATIC is a director. It keeps a library of film techniques, each studied from how films are shot and cut (not
   copied from any one of them): the low-angle hero shot, the tracking shot, the macro insert, the push-in, the
   over-the-shoulder, the Dutch angle, the whip pan, the punch-in on an impact, handheld energy, the speed ramp, the
   freeze frame, lightning as a light source, the bullet-time orbit, the title card, music hit points and the smash
   cut to black. Given a beat sheet (establish, insert, threat, action, impact, slow, freeze, resolve) and where the
   actors are, it chooses and blends techniques into shots: framing by the rule of thirds with lead room in the
   direction of movement and headroom over the eyes, a camera path for each shot, a cut or a whip between them, a time
   curve (speed ramps and holds) and the cues for the score, the sound and the effects, so every hit lands on a hit.
   Scenes:
   - The alley (the Operator's cinematic, about 14 seconds): night, rain, neon in the puddles. He walks in, his mask
     clicks shut, a kitchen door bangs open and two of the dead rush him; a head shot lights the walls; the second one
     grabs him and he throws it over his hip into the water; he drops onto it with a knee, the knife comes out in a
     reverse grip, and as it goes up the world slows, stops, and lightning freezes the frame.
   - The line-up (behind the Legends screen): the five classes standing in the rain in the same alley, each lit by
     its colour from behind, breathing, scanning, looking up into the rain, the camera drifting. Lightning now and then.
   - The studio (a legend's own page): a dark stage with a wet floor and a turntable ring in the class colour; the
     camera starts in front, then tilts up and over to look straight down, as the game sees him; it can orbit too.
   Everything runs in scene time, so the director can slow it, stop it, or scrub it, and every frame can be redrawn. */

/* ---------- the alley set ---------- */
const MIM_DOOR = 50, MIM_LID = 51;   // the set's moving pieces (extra "bones")
// 1.9.993: more moving pieces -- the neon (it flickers), two bottles and two cans (PHYSICS throws them), two newspapers
const MIM_NEON = 57, MIM_PROPS = [58, 59, 60, 61], MIM_PAPER = [62, 63];
function mimStrokes(B, mat, segs, r) { lgMat(B, mat); for (const s of segs) lgTube(B, s, r, { segs: 5 }); }
LG_MAKERS.alley = function (B) {
  const hi = B.lod < 2, top = B.lod === 0;
  const M = {
    road: lgMtl({ c: '#8a8c90', t: LT.asphalt, r: 0.8, w: 0.3, n: 1.2, k: 2.2, s: 3 }),
    brick: lgMtl({ c: '#ffffff', t: LT.brick, r: 0.9, w: 0.75, n: 1.3, k: 1.4 }), brick2: lgMtl({ c: '#c9c3bb', t: LT.brick, r: 0.9, w: 0.75, n: 1.3, k: 1.6 }),
    conc: lgMtl({ c: '#6a6a6c', t: LT.asphalt, r: 0.9, w: 0.5, n: 0.8, k: 1.5 }), rust: lgMtl({ c: '#ffffff', t: LT.rust, r: 0.6, w: 0.25, n: 1, k: 0.8 }),
    steel: lgMtl({ c: '#3a3d40', t: LT.metal, r: 0.4, m: 0.7, w: 0.1, k: 0.5 }), glass: lgMtl({ c: '#0b1016', r: 0.06, m: 0.3, w: 0 }),
    lit: lgMtl({ c: '#ffb768', e: 1.4, r: 0.3 }), lit2: lgMtl({ c: '#9fd2ff', e: 0.9, r: 0.3 }), bag: lgMtl({ c: '#0e0f10', r: 0.15, w: 0.1 }),
    card: lgMtl({ c: '#7b5d3c', t: LT.twill, r: 0.9, w: 0.9, k: 0.4 }), wood: lgMtl({ c: '#5e4a33', t: LT.twill, r: 0.85, w: 0.8, k: 0.6 }),
    neonP: lgMtl({ c: '#ff3db4', e: 3.2, r: 0.3 }), neonC: lgMtl({ c: '#3de8ff', e: 3.0, r: 0.3 }), sodium: lgMtl({ c: '#ffae4a', e: 4.0, r: 0.3 }),
    poster: lgMtl({ c: [1, 1, 1], t: LT.poster, r: 0.85, w: 0.9, k: 1, s: 4 }), fence: lgMtl({ c: '#55595d', t: LT.metal, r: 0.5, m: 0.6, k: 0.3 }),
    sky: lgMtl({ c: '#0b1422', e: 1.0, r: 1 }), city: lgMtl({ c: '#1a2638', e: 0.6, r: 1 }), win: lgMtl({ c: '#ffcf8a', e: 2.2, r: 1 }), cable: lgMtl({ c: '#0c0c0d', r: 0.5 })
  };
  lgBone(B, 'root');
  lgMat(B, M.conc); for (const y of [2.62, -2.62]) lgBox(B, 4, y, 0.04, 18, 0.18, 0.04, 0.01);
  // the walls: brick, windows (a few lit), pipes, an AC unit
  const wall = (y, mat) => { lgMat(B, mat); lgPlane(B, y > 0 ? [-14, y, 0] : [24, y, 0], y > 0 ? [38, 0, 0] : [-38, 0, 0], [0, 0, 11], hi ? 30 : 8, hi ? 8 : 3, 1); };
  wall(2.8, M.brick); wall(-2.8, M.brick2);
  const R = lgRng(11);
  for (const y of [2.79, -2.79]) for (let x = -9; x < 22; x += 3.4) for (const z of [3.6, 6.8, 9.6]) {
    if (y < 0 && x > 6 && x < 9 && z < 4) continue;
    const lit = R() < 0.22, sg = y > 0 ? -1 : 1;
    lgMat(B, M.conc); lgBox(B, x, y + sg * 0.02, z, 0.62, 0.04, 0.8, 0.01);
    lgMat(B, lit ? (R() < 0.6 ? M.lit : M.lit2) : M.glass); lgBox(B, x, y + sg * 0.03, z, 0.5, 0.02, 0.68, 0);
    if (hi) { lgMat(B, M.steel); lgBox(B, x, y + sg * 0.05, z, 0.5, 0.01, 0.015, 0); lgBox(B, x, y + sg * 0.05, z, 0.015, 0.01, 0.68, 0); }
  }
  lgMat(B, M.steel); for (const [x, y] of [[2.2, -2.7], [13.5, -2.7], [-3, 2.7], [15, 2.7]]) lgLimb(B, 9, [[0, 0.06], [1, 0.06]], { up: true, ox: x, oy: y, segs: 8, capA: false });
  lgMat(B, M.rust); lgBox(B, 4.2, -2.45, 2.6, 0.45, 0.35, 0.35, 0.03); if (hi) { lgMat(B, M.steel); for (let i = 0; i < 6; i++) lgBox(B, 3.85 + i * 0.14, -2.09, 2.6, 0.02, 0.01, 0.3, 0); }
  // the fire escape on the left wall
  lgMat(B, M.rust);
  for (const z of [3.2, 6.3]) { lgBox(B, 6, 2.25, z, 2.2, 0.55, 0.03, 0.005); if (hi) { lgMat(B, M.steel); lgTube(B, [[3.8, 1.7, z], [3.8, 1.7, z + 1], [8.2, 1.7, z + 1], [8.2, 1.7, z]], 0.02, { segs: 4 }); for (let x = 4.2; x < 8.2; x += 0.4) lgTube(B, [[x, 1.7, z], [x, 1.7, z + 1]], 0.008, { segs: 3 }); lgMat(B, M.rust); } }
  lgMat(B, M.steel); lgTube(B, [[4.2, 2.3, 3.2], [7.6, 2.3, 6.3]], 0.03, { segs: 4 }); lgTube(B, [[4.2, 1.85, 3.2], [7.6, 1.85, 6.3]], 0.03, { segs: 4 });
  if (hi) for (let i = 1; i < 10; i++) { const k = i / 10; lgBox(B, lgLerp(4.2, 7.6, k), 2.08, lgLerp(3.2, 6.3, k), 0.08, 0.22, 0.01, 0); }
  lgTube(B, [[8.2, 1.9, 3.2], [8.2, 1.9, 0.9]], 0.02, { segs: 4 }); lgTube(B, [[8.2, 2.4, 3.2], [8.2, 2.4, 0.9]], 0.02, { segs: 4 }); for (let z = 1.1; z < 3.2; z += 0.3) lgTube(B, [[8.2, 1.9, z], [8.2, 2.4, z]], 0.012, { segs: 3 });
  // the kitchen door on the right wall (it swings open), its frame and lamp
  lgMat(B, M.conc); lgBox(B, 7.5, -2.74, 1.15, 0.62, 0.08, 1.2, 0.02);
  lgMat(B, M.lit); lgBox(B, 7.5, -2.62, 2.5, 0.12, 0.08, 0.05, 0.02);
  lgMat(B, M.steel); lgBox(B, 7.5, -2.58, 2.58, 0.2, 0.14, 0.02, 0.01);
  lgBone(B, MIM_DOOR); lgMat(B, M.rust); lgBox(B, 0.5, 0.0, 1.05, 0.5, 0.035, 1.05, 0.01); lgMat(B, M.steel); lgBox(B, 0.88, 0.05, 1.0, 0.05, 0.02, 0.02, 0.005); if (hi) { lgMat(B, M.glass); lgBox(B, 0.5, 0.036, 1.55, 0.18, 0.004, 0.12, 0); }
  lgBone(B, 'root');
  // the dumpster on the left (its lid hinged at the back)
  lgMat(B, M.rust); lgBox(B, 9.6, 2.0, 0.62, 0.95, 0.6, 0.5, 0.04); lgMat(B, M.steel); for (const x of [8.8, 10.4]) for (const y of [1.55, 2.45]) lgSphere(B, x, y, 0.07, 0.07, 0.03, 0.07, { segs: 8, rings: 5 });
  lgBone(B, MIM_LID); lgMat(B, M.rust); lgBox(B, 0, -0.62, 0.02, 0.97, 0.64, 0.025, 0.01); lgBone(B, 'root');
  // trash bags, boxes, a pallet, posters and a tag
  lgMat(B, M.bag); for (const [x, y, s] of [[10.9, 2.3, 0.32], [11.4, 2.1, 0.26], [8.5, 2.4, 0.28], [13, -2.35, 0.3], [-2, 2.4, 0.3]]) lgSphere(B, x, y, s * 0.6, s, s * 0.85, s * 0.62, { segs: 12, rings: 8, wr: (a, p) => Math.sin(a * 5 + p * 3) * 0.08 });
  lgMat(B, M.card); lgBox(B, 12.2, 2.35, 0.22, 0.3, 0.25, 0.22, 0.01); lgBox(B, 12.3, 2.3, 0.56, 0.22, 0.2, 0.12, 0.01); lgBox(B, 1.0, -2.4, 0.2, 0.28, 0.24, 0.2, 0.01);
  lgMat(B, M.wood); lgBox(B, 5.5, -2.62, 0.6, 0.55, 0.06, 0.6, 0.01);
  lgMat(B, M.poster);
  const post = (x, y, z, q, sz) => { const sg = y > 0 ? -1 : 1; lgDecal(B, [x, y + sg * 0.012, z], [sg > 0 ? -sz : sz, 0, 0], [0, 0, sz], lgQuarterUV(q), { lift: 0 }); };   // (1.9.993: they read the right way round now)
  post(1.5, 2.8, 1.6, 1, 0.4); post(2.3, 2.8, 1.5, 3, 0.32); post(5.2, -2.8, 1.9, 1, 0.42); post(11.8, 2.8, 2.0, 0, 0.9); post(-4, -2.8, 1.4, 2, 0.5); post(14.5, -2.8, 1.6, 3, 0.36);
  // neon: a sign of a bowl and chopsticks, and OPEN, on the right wall
  { const x0 = 11.0, y = -2.68, z0 = 3.2, L = [];
    const arc = []; for (let i = 0; i <= 14; i++) { const a = Math.PI + i / 14 * Math.PI; arc.push([x0 + Math.cos(a) * 0.45, y, z0 + 0.5 + Math.sin(a) * 0.35]); } L.push(arc); L.push([[x0 - 0.5, y, z0 + 0.5], [x0 + 0.5, y, z0 + 0.5]]);
    lgBone(B, MIM_NEON);
    mimStrokes(B, M.neonP, L, 0.018);
    mimStrokes(B, M.neonC, [[[x0 - 0.1, y, z0 + 0.65], [x0 + 0.55, y, z0 + 1.15]], [[x0 + 0.05, y, z0 + 0.62], [x0 + 0.65, y, z0 + 1.05]]], 0.015);
    const lx = x0 - 0.62, lz = z0 - 0.25, s = 0.26, g = 0.32, Ls = [];
    const O = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * TAU; O.push([lx + s / 2 + Math.cos(a) * s * 0.45, y, lz + s * 0.5 + Math.sin(a) * s * 0.5]); } Ls.push(O);
    Ls.push([[lx + g, y, lz], [lx + g, y, lz + s], [lx + g + s * 0.7, y, lz + s], [lx + g + s * 0.7, y, lz + s * 0.5], [lx + g, y, lz + s * 0.5]]);
    Ls.push([[lx + g * 2 + s * 0.7, y, lz], [lx + g * 2, y, lz], [lx + g * 2, y, lz + s], [lx + g * 2 + s * 0.7, y, lz + s]]); Ls.push([[lx + g * 2, y, lz + s * 0.5], [lx + g * 2 + s * 0.55, y, lz + s * 0.5]]);
    Ls.push([[lx + g * 3, y, lz], [lx + g * 3, y, lz + s], [lx + g * 3 + s * 0.7, y, lz], [lx + g * 3 + s * 0.7, y, lz + s]]);
    mimStrokes(B, M.neonC, Ls, 0.012); lgBone(B, 'root');
    lgMat(B, M.steel); lgBox(B, x0, -2.76, z0 + 0.4, 0.75, 0.02, 0.6, 0.01); }
  // the loose things PHYSICS moves: two bottles and a can by the kitchen door, a can in his path; two newspapers
  { const glass = lgMtl({ c: '#2f5a33', r: 0.06, m: 0.2, w: 0 }), glass2 = lgMtl({ c: '#5a3a1a', r: 0.06, m: 0.2, w: 0 }), tin = lgMtl({ c: '#b8bcc0', t: LT.metal, r: 0.25, m: 0.85, w: 0.05, k: 0.2 }), lbl = lgMtl({ c: '#a3261d', r: 0.5 });
    const bottle = (b, mat) => { lgBone(B, b); lgMat(B, mat); lgLathe(B, [[0.0, -0.12], [0.032, -0.12], [0.033, 0.03], [0.014, 0.075], [0.012, 0.12], [0.0, 0.12]], { segs: 12 }); };
    const can = (b) => { lgBone(B, b); lgMat(B, tin); lgLathe(B, [[0.0, -0.06], [0.031, -0.06], [0.033, -0.052], [0.033, 0.052], [0.029, 0.06], [0.0, 0.06]], { segs: 12 }); lgMat(B, lbl); lgLathe(B, [[0.0335, -0.035], [0.0335, 0.04]], { segs: 12 }); };
    bottle(MIM_PROPS[0], glass); bottle(MIM_PROPS[1], glass2); can(MIM_PROPS[2]); can(MIM_PROPS[3]);
    const paper = lgMtl({ c: '#cfc8b8', t: LT.twill, r: 0.95, w: 0.9, k: 0.3 }); for (const b of MIM_PAPER) { lgBone(B, b); lgMat(B, paper); lgBox(B, 0, 0, 0, 0.2, 0.14, 0.002, 0); }
    lgBone(B, 'root'); }
  // overhead cables
  if (hi) { lgMat(B, M.cable); for (const [x, s] of [[0.5, 0.4], [6.8, 0.6], [14, 0.5]]) { const pts = []; for (let i = 0; i <= 12; i++) { const k = i / 12; pts.push([x + k * 0.6, -2.8 + k * 5.6, 5.5 - Math.sin(k * Math.PI) * s]); } lgTube(B, pts, 0.012, { segs: 4 }); } }
  // the streetlight at the mouth of the alley
  lgMat(B, M.steel); lgLimb(B, 5.2, [[0, 0.07], [1, 0.05]], { up: true, ox: -7.4, oy: -2.3, segs: 8, capA: false }); lgTube(B, [[-7.4, -2.3, 5.1], [-7.2, -2.0, 5.35], [-6.8, -1.6, 5.4]], 0.04, { segs: 6 });
  lgBox(B, -6.7, -1.5, 5.36, 0.25, 0.12, 0.06, 0.02); lgMat(B, M.sodium); lgBox(B, -6.7, -1.5, 5.3, 0.2, 0.09, 0.012, 0.0);
  // the far end: a chain-link fence, the glow of the city and its towers
  lgMat(B, M.fence); for (let y = -2.8; y <= 2.81; y += 0.7) lgTube(B, [[19.5, y, 0], [19.5, y, 3.2]], 0.025, { segs: 4 });
  if (hi) for (let z = 0.2; z < 3.2; z += 0.16) lgTube(B, [[19.5, -2.8, z], [19.5, 2.8, z]], 0.004, { segs: 3 });
  lgMat(B, M.sky); lgPlane(B, [40, 30, -2], [0, -60, 0], [0, 0, 40], 4, 4, 1);
  const RC = lgRng(29); for (let i = 0; i < 18; i++) { const y = -24 + i * 2.8 + RC() * 1.5, hgt = 8 + RC() * 22, x = 30 + RC() * 6; lgMat(B, M.city); lgBox(B, x, y, hgt / 2, 1.6, 1.1, hgt / 2, 0); if (hi) { lgMat(B, M.win); for (let k = 0; k < 6; k++) if (RC() < 0.6) lgBox(B, x - 1.62, y + (RC() - 0.5) * 1.6, 2 + RC() * (hgt - 3), 0.01, 0.12, 0.18, 0); } }
  // the left and right ends of the walls are closed from the camera's sight by more building
  lgMat(B, M.brick); lgBox(B, -14, 0, 5.5, 0.2, 2.8, 5.5, 0);
};
// the wet road (its own model: it shows the reflections, it is not reflected)
LG_MAKERS.alleyGround = function (B) { lgBone(B, 'root'); lgMat(B, lgMtl({ c: '#8a8c90', t: LT.asphalt, r: 0.8, w: 0.3, n: 0.55, k: 2.2, s: 3 })); lgPlane(B, [-14, -2.8, 0], [38, 0, 0], [0, 5.6, 0], B.lod < 2 ? 38 : 12, B.lod < 2 ? 6 : 2, 1); };
LG_MAKERS.studioGround = function (B) { lgBone(B, 'root'); lgMat(B, lgMtl({ c: '#232529', t: LT.poly, r: 0.3, w: 0.4, n: 0.25, k: 0.8, s: 3 })); lgPlane(B, [-12, -12, 0], [24, 0, 0], [0, 24, 0], 16, 16, 1); };
// a wet studio: a glossy floor, a turntable ring in the class colour, a curved backdrop
LG_MAKERS.studio = function (B) {
  lgBone(B, 'root');
  lgMat(B, lgMtl({ c: '#121316', t: LT.metal, r: 0.35, m: 0.6, k: 0.6 })); lgLathe(B, [[0.0, 0.0], [0.95, 0.0], [1.0, 0.012], [1.0, 0.03], [0.96, 0.04], [0.0, 0.04]], { segs: 48 });
  lgMat(B, lgMtl({ c: [1, 1, 1], s: 2, e: 2.6, r: 0.3 })); lgLathe(B, [[0.985, 0.03], [1.005, 0.031], [1.005, 0.037], [0.985, 0.04]], { segs: 64 });
  lgMat(B, lgMtl({ c: '#0b0c0e', r: 0.9 })); lgLathe(B, [[9, 0.0], [9, 1], [8.5, 4], [7.5, 7]], { segs: 48 });
};

/* ---------- the dead, in motion ---------- */
// arms that reach (or claw), a head that lolls; a lurching run
function mimZArms(P, t, k, o) {
  o = o || {}; const w = Math.sin(t * 7.3) * 0.12, w2 = Math.sin(t * 6.1 + 1) * 0.12;
  lgArm(P, 'L', -1.25 * k + w, 0.18 + 0.1 * k, 0.2, 0.3 + 0.25 * Math.abs(w), -0.2); lgArm(P, 'R', -1.15 * k + w2, 0.2 + 0.1 * k, -0.2, 0.35 + 0.25 * Math.abs(w2), -0.2);
  P.grip.L = P.grip.R = 'claw';
}
lgClip('z_rush', 'Rush (the dead)', 'Actors', 0.62, true, '', 'A lurching sprint, arms out ahead, head forward.', (P, t, ctx, a) => {
  lgGait(P, t / a.dur, { stride: 1.9, st: 0.42, lift: 0.14, crouch: 0.08, bob: 0.05, lean: 0.38, yaw: 0.16, sway: 0.04, heel: 1, run: true, w: 0.13 });
  mimZArms(P, t, 1); lgLookAt(P, Math.sin(t * 5) * 0.15, -0.35, Math.sin(t * 4) * 0.25);
}, [[0, 'zstep'], [0.31, 'zstep']]);
lgClip('z_shamble', 'Shamble (the dead)', 'Actors', 1.5, true, '', 'A dragging walk, one foot scuffing.', (P, t, ctx, a) => {
  lgGait(P, t / a.dur, { stride: 0.9, st: 0.68, lift: 0.04, crouch: 0.06, bob: 0.03, lean: 0.25, yaw: 0.1, sway: 0.06, heel: 1, w: 0.14 });
  mimZArms(P, t, 0.7); lgLookAt(P, Math.sin(t * 1.3) * 0.3, -0.2, 0.35);
});
lgClip('z_burst', 'Burst out (the dead)', 'Actors', 0.45, false, '', 'Through the door, shoulder first.', (P, t) => {
  lgBase(P, { crouch: 0.12, lean: 0.4, stance: false }); lgFoot(P, 'L', lgK(t, [[0, -0.1], [0.3, 0.35]]), 0.13, lgPulse(t, 0, 0.3) * 0.12, 0, 0, 0); lgFoot(P, 'R', -0.15, -0.13, 0, 0.3, 0, -0.3);
  lgSpine(P, 0.4, 0.3, -0.2); mimZArms(P, t, 0.6); lgLookAt(P, 0, -0.4, 0.2);
});
lgClip('z_rise', 'Rise (the dead)', 'Actors', 0.6, false, '', 'Up from behind cover.', (P, t) => {
  const k = lgK(t, [[0, 0], [0.6, 1, 'o']]); lgBase(P, { crouch: lgLerp(0.5, 0.08, k), lean: lgLerp(0.7, 0.35, k), stance: false }); lgStance(P, 0.14, 0.1, 0.2);
  mimZArms(P, t, k * 0.8); lgLookAt(P, 0, lgLerp(0.4, -0.3, k), 0.3);
});
lgClip('z_hs', 'Head shot (the dead)', 'Actors', 1.2, false, '', 'The head snaps back and the legs go; it slides on its back in the water.', (P, t) => {
  const k = lgK(t, [[0, 0], [0.08, 0.2, 'o'], [0.75, 1, 'i3'], [0.82, 0.97], [1.2, 1]]), snap = lgK(t, [[0, 0], [0.06, 1, 'o3'], [0.4, 0.6], [1.2, 0.4]]);
  lgPelvis(P, -0.55 * k, 0, -0.84 * k, 0, -1.45 * k, 0.1 * k);
  lgFoot(P, 'L', lgLerp(0.1, 0.25, k), 0.15, 0.1 * k, -0.6 * k, 0.3 * k, 0); lgFoot(P, 'R', lgLerp(-0.1, 0.3, k), -0.17, 0.15 * k, -0.5 * k, -0.4 * k, 0);
  lgSpine(P, -0.2 * k, 0.1, 0); lgLookAt(P, 0.3 * snap, -1.1 * snap, 0.4 * snap);
  lgArm(P, 'L', lgLerp(-1.2, -1.9, k), 0.3 + 0.6 * k, 0, 0.3, 0.2); lgArm(P, 'R', lgLerp(-1.1, -1.4, k), 0.3 + 0.9 * k, 0, 0.5, 0.2); P.grip.L = P.grip.R = 'relax';
});
lgClip('z_grab', 'Grab (the dead)', 'Actors', 0.3, false, '', 'Hands on the target.', (P, t) => {
  lgBase(P, { crouch: 0.1, lean: 0.35, stance: false }); lgFoot(P, 'L', 0.2, 0.12, 0, 0, 0.1, 0); lgFoot(P, 'R', -0.15, -0.14, 0, 0.3, -0.1, -0.3);
  lgArm(P, 'L', -1.5, 0.15, 0.3, 0.6, -0.3); lgArm(P, 'R', -1.45, 0.2, -0.3, 0.7, -0.3); P.grip.L = P.grip.R = 'fist'; lgLookAt(P, 0, -0.1, 0.2);
});
lgClip('z_thrown', 'Thrown (the dead)', 'Actors', 0.6, false, '', 'Over the hip and down on its back.', (P, t, ctx) => {
  const k = lgK(t, [[0, 0], [0.5, 1, 'l']]);
  lgPelvis(P, 0, 0, 0, 0, 0, 0); lgSpine(P, 0.3 * Math.sin(k * Math.PI), 0, 0);
  for (const s of ['L', 'R']) { lgJ(P, 'thigh' + s, 0, lgLerp(0, -0.8, Math.sin(k * Math.PI)), 0); lgJ(P, 'shin' + s, 0, lgLerp(0.2, 0.7, Math.sin(k * Math.PI)), 0); }
  lgArm(P, 'L', -1.2 - 0.8 * k, 0.4 + 0.6 * k, 0, 0.5, 0); lgArm(P, 'R', -1.3 - 0.6 * k, 0.5 + 0.7 * k, 0, 0.5, 0); P.grip.L = P.grip.R = 'open';
  lgLookAt(P, 0, 0.4 * k, 0);
});
lgClip('z_pinned', 'Pinned (the dead)', 'Actors', 1.0, true, '', 'On its back, thrashing and reaching up.', (P, t) => {
  lgPelvis(P, 0, 0, 0, 0, 0, 0);
  for (const s of ['L', 'R']) { const sg = s === 'L' ? 1 : -1; lgJ(P, 'thigh' + s, sg * 0.15, -0.25 + Math.sin(t * 6 + sg) * 0.15, 0); lgJ(P, 'shin' + s, 0, 0.4 + Math.sin(t * 6 + sg) * 0.25, 0); }
  lgArm(P, 'L', -1.6 + Math.sin(t * 7) * 0.3, 0.4, 0.2, 0.6 + Math.sin(t * 9) * 0.3, 0); lgArm(P, 'R', -1.4 + Math.sin(t * 6.3 + 1) * 0.3, 0.5, -0.2, 0.7, 0); P.grip.L = P.grip.R = 'claw';
  lgLookAt(P, Math.sin(t * 5) * 0.5, 0.2, Math.sin(t * 4) * 0.3);
});
// the Operator's cinematic moves (scene-specific; they share the fifty's helpers)
lgClip('c_alert', 'Alert', 'Cinematic', 2.0, false, LG_SRC.scan, 'The door bangs: low ready, the head snaps to the noise, the stance widens.', (P, t, ctx) => {
  lgBase(P, { crouch: 0.06, lean: 0.14, stance: false }); lgStance(P, 0.14, lgK(t, [[0, 0.06], [0.5, 0.14]]), 0.14);
  const yaw = lgK(t, [[0, 0], [0.3, 0], [0.45, -0.42, 'o3'], [0.85, -0.42], [1.0, 0.35, 'o3'], [1.6, 0.2], [2.0, 0.0]]);
  lgSpine(P, 0, yaw * 0.3, 0); lgLookAt(P, yaw * 0.7, 0.05);
  const v = LG_POST.low.slice(); v[3] = yaw * 0.35; v[4] -= 0.15 * lgW(t, 1.2, 2.0); lgPistolAt(P, v, { poleR: LG_POLE.Rt, poleL: LG_POLE.Lt });
  P.mask = 1; P.glow = 1;
});
lgClip('c_fire', 'Snap and fire', 'Cinematic', 0.7, false, LG_SRC.iso, 'Low ready to isosceles in a quarter second, one shot, hold.', (P, t) => {
  lgBase(P, { crouch: 0.075, lean: 0.17, stance: false }); lgStance(P, 0.14, 0.14, 0.12);
  const up = lgK(t, [[0, 0], [0.2, 1, 'o3']]), r = lgRecoil(t, 0.25);
  const v = lgPostMix([0.4, -0.035, -0.14, 0.15, 0.47, 0], [0.58, -0.035, 0.34, -0.12, 0.0, 0], up); v[4] -= r * 0.22; v[0] -= r * 0.04;
  lgPistolAt(P, v, { trigger: true }); P.pistol.slide = t > 0.25 && t < 0.33 ? 1 - Math.abs(t - 0.28) / 0.05 : 0;
  lgSpine(P, 0, -0.12 * up, 0); lgLookAt(P, -0.12 * up, 0.1); P.mask = 1; P.glow = 1;
}, [[0.25, 'shot']]);
lgClip('c_throw', 'Grabbed, then the throw', 'Cinematic', 1.5, false, LG_SRC.ogoshi, 'Hands on him; he turns his back into it, hips under its hips, lifts and throws it over.', (P, t) => {
  // 0-0.25 grabbed; 0.25-0.6 turn in (the root turns half round, outside this clip); 0.6-1.05 lift and throw; then follow down
  const g = lgPulse(t, 0, 0.35), lift = lgPulse(t, 0.55, 1.05), bend = lgK(t, [[0, 0.1], [0.5, 0.2], [0.85, 0.85, 'i'], [1.1, 0.6], [1.5, 0.35]]);
  lgPelvis(P, 0, 0, -lgK(t, [[0, 0.08], [0.5, 0.24], [0.8, 0.1], [1.0, 0.12], [1.5, 0.2]]), 0, bend * 0.3, 0);
  lgStance(P, 0.17, lgK(t, [[0, 0.1], [0.5, -0.05]]), 0.3);
  lgSpine(P, bend - g * 0.2, -lift * 0.25, 0); lgLookAt(P, 0.2 * lift, -bend * 0.4 + 0.15);
  P.pistol.at = 'handR'; P.grip.R = 'pistol';
  lgArm(P, 'L', lgK(t, [[0, -0.5], [0.5, -0.8], [0.95, -0.1, 'i'], [1.5, -0.3]]), lgK(t, [[0, 0.3], [0.95, 0.4]]), 0.2, lgK(t, [[0, 1.1], [0.5, 1.4], [0.95, 0.5], [1.5, 0.8]]), 0.1);
  lgArm(P, 'R', lgK(t, [[0, -0.4], [0.5, -0.9], [0.95, -0.3], [1.5, -0.5]]), lgK(t, [[0, 0.3], [0.5, 0.8], [1.5, 0.4]]), lgK(t, [[0, 0], [0.5, 0.6], [1.5, 0.2]]), lgK(t, [[0, 1.0], [0.5, 1.6], [0.95, 1.2], [1.5, 1.3]]), -0.3);
  P.grip.L = 'fist'; P.mask = 1; P.glow = 1;
}, [[0.0, 'grunt'], [0.62, 'throwWhoosh']]);
lgClip('c_mount', 'Knee mount and knife', 'Cinematic', 2.2, false, LG_SRC.knife, 'Down onto a knee on its chest, the gun hand pinning it, the knife drawn in a reverse grip and raised high.', (P, t) => {
  const d = lgK(t, [[0, 0], [0.5, 1, 's']]), dr = lgK(t, [[0, 0], [0.6, 0], [0.85, 1, 'io']]), up = lgK(t, [[0, 0], [1.1, 0], [1.9, 1, 's'], [2.2, 1]]);
  lgPelvis(P, 0.05 * d, 0, -0.52 * d - 0.03, 0.05 * d, 0.38 * d, 0.1 * d);
  lgFoot(P, 'L', lgLerp(0.06, 0.38, d), 0.24, lgPulse(t, 0.05, 0.4) * 0.1, 0, 0.2, 0);
  lgFoot(P, 'R', lgLerp(-0.06, -0.32, d), -0.12, 0, lgLerp(0, 1.15, d), -0.1, lgLerp(0, -0.9, d));
  lgSpine(P, 0.45 * d - 0.25 * up, -0.15 * d, 0.05 * d); lgLookAt(P, 0.1, 0.55 * d - 0.15 * up);
  // the gun hand pins the chest; the knife hand goes to the sheath, then up and back for the strike
  P.pistol.at = 'handR'; P.grip.R = 'pistol'; lgHandTo(P, 'R', 'root', [lgLerp(0.3, 0.62, d), lgLerp(-0.15, -0.05, d), lgLerp(0.8, 0.34, d)], [lgLerp(0, 0.2, d), lgLerp(0.4, 1.5, d), 0.3], [-0.2, -0.9, 0.3]);
  if (t < 0.85) { const c = lgK(t, [[0, 0], [0.6, 1, 'io']]); lgHandTo(P, 'L', 'chest', [lgLerp(0.2, 0.2, c), lgLerp(0.2, -0.065, c), lgLerp(-0.3, -0.11, c)], [lgLerp(0, 1.4, c), lgLerp(0, -0.2, c), lgLerp(0, 1.5, c)], [-0.3, 0.8, -0.6]); P.grip.L = c > 0.85 ? 'knife' : 'open'; P.knife.at = t < 0.62 ? 'sheath' : 'handL'; }
  else { P.knife.at = 'handL'; P.grip.L = 'knife'; lgHandTo(P, 'L', 'root', [lgLerp(0.4, 0.12, up), lgLerp(0.12, 0.22, up), lgLerp(0.75, 1.62, up)], [0.05, lgLerp(-1.3, -1.5, up), lgLerp(0.3, 0.05, up)], [-0.6, 0.9, 0.1]); }   // (the fist up with the little finger down: the blade points down at it)
  P.mask = 1; P.glow = 1;
}, [[0.45, 'knee'], [0.65, 'knifeOut']]);

/* ---------- the director's library ---------- */
// Each technique: what it is for, how it is built here, and what it was studied from (no single film is copied).
const MIM_REFS = {
  hero: { name: 'Low-angle hero shot', use: 'Makes the subject tower: camera near the ground, looking up, the sky or the light behind him.', ref: 'Classic hero framing; rain reads best backlit (FilmLifestyle: shooting in the rain)' },
  track: { name: 'Tracking shot', use: 'The camera moves alongside so the world slides past: the alley gets depth, neon slides through puddles.', ref: 'Dolly and tracking grammar' },
  insert: { name: 'Macro insert and push-in', use: 'A detail big on screen (the mask locking), the camera creeping in so the moment grows.', ref: 'Insert shots; the push-in for emphasis' },
  ots: { name: 'Over the shoulder', use: 'Puts us behind him looking at what he faces; sells distance and threat.', ref: 'Shot/reverse-shot grammar' },
  dutch: { name: 'Dutch angle', use: 'The horizon tilted (about 10 to 15 degrees) when the world goes wrong.', ref: 'Dutch angle (Wikipedia): unease and disorientation' },
  whip: { name: 'Whip pan', use: 'A pan so fast it blurs, carrying the eye from one threat to the next; motion blur hides the cut.', ref: 'Whip pans in action editing' },
  punch: { name: 'Punch-in and impact shake', use: 'On a shot or a landing: the frame jolts and settles, timed to the music hit.', ref: 'Impact framing; hit points (StudioBinder: Mickey Mousing)' },
  handheld: { name: 'Handheld energy', use: 'Small layered wander that rises with the action and calms in the quiet.', ref: 'Handheld operating' },
  ramp: { name: 'Speed ramp', use: 'Time slows smoothly (ease in, ease out) around the moment that matters, then can return.', ref: 'Speed ramping (CyberLink): slow motion and freeze from a time curve' },
  freeze: { name: 'Freeze frame and bullet time', use: 'Time stops while the camera keeps moving round the frozen moment; frozen rain hangs in the air.', ref: 'Freeze frames; bullet-time orbits' },
  lightning: { name: 'Lightning as light', use: 'A few uneven flashes from different angles, hard shadows, the frame drained to cold blue-white.', ref: 'Cinematography.net: lightning effects (several heads, uneven timing)' },
  title: { name: 'Title card', use: 'The name lands on the frozen frame, a stinger under it.', ref: 'Character introduction cards' },
  hits: { name: 'Hit points', use: 'The score is written to the cut: drum hits on the shot and the landing, a swell to the freeze, silence and a ring after it.', ref: 'StudioBinder: hit points, a few chosen per scene; agree with sound design who takes which hit' }
};
// framing: eye from a subject, a distance, an angle round (0 = in front of where he faces), a height, a target height
function mimOrbit(c, yaw, dist, az, h, th) { const a = yaw + az; return { eye: [c[0] + Math.cos(a) * dist, c[1] + Math.sin(a) * dist, h], tgt: [c[0], c[1], th] }; }
// handheld: three layered wanders, scaled
function mimShake(t, k, out) { const s = k * 0.012; out[0] += (Math.sin(t * 2.1) * 0.6 + Math.sin(t * 5.3 + 1) * 0.3 + Math.sin(t * 11.7 + 2) * 0.1) * s; out[1] += (Math.sin(t * 1.7 + 3) * 0.6 + Math.sin(t * 4.9 + 1) * 0.3 + Math.sin(t * 13.1) * 0.1) * s; out[2] += (Math.sin(t * 2.6 + 5) * 0.5 + Math.sin(t * 7.1) * 0.5) * s * 0.7; return out; }

/* ---------- actors: tracks of clips over scene time, root paths, and blends ---------- */
// track: [[t0, clip, clipStart, fade], ...]; root: [[t, x, y, z, yaw, ease], ...]
function mimActor(o) {
  return Object.assign({ model: 'operator', cls: 'attack', lod: 1, track: [], root: [[0, 0, 0, 0, 0]], hide: null, show: [0, 1e9], P: lgPose(), P2: lgPose(), L: lgLocalNew(), L2: lgLocalNew(), W: lgWorldNew(), W2: lgWorldNew(), ctx: {}, lastEvT: -1, root4: [0, 0, 0, 0], acc: null, glow: 1 }, o);
}
function mimRootAt(a, st) { const r = lgK(st, a.root.map(k => [k[0], [k[1], k[2], k[3], k[4]], k[5] || 'l'])); return r; }
function mimActorEval(a, st) {
  const tr = a.track; let i = 0; while (i < tr.length - 1 && tr[i + 1][0] <= st) i++;
  const seg = tr[i], clip = LG_ANIM_BY[seg[1]]; if (!clip) return a.W;
  const r = mimRootAt(a, st), rootM = lgM4(); lgRot(rootM, 0, 0, r[3]); rootM[12] = r[0]; rootM[13] = r[1]; rootM[14] = r[2]; a.root4 = r;
  lgEvalClip(clip, st - seg[0] + (seg[2] || 0), a.P, a.ctx);
  // clip-driven root turns ride on the path's
  if (a.P.root[3] || a.P.root[0]) { const m2 = lgM4(); lgRot(m2, 0, 0, a.P.root[3]); m2[12] = a.P.root[0]; lgMul(rootM, rootM, m2); }
  lgSolve(a.P, a.L, a.W, rootM);
  const fade = seg[3] == null ? 0.2 : seg[3];
  if (i > 0 && fade > 0 && st - seg[0] < fade) {
    const pv = tr[i - 1], pc = LG_ANIM_BY[pv[1]];
    if (pc) { lgEvalClip(pc, st - pv[0] + (pv[2] || 0), a.P2, a.ctx); lgSolve(a.P2, a.L2, a.W2, rootM); const k = (st - seg[0]) / fade; lgBlendL(a.L2, a.L, k * k * (3 - 2 * k), a.L); lgWorldAll(a.W, a.L, rootM); }
  }
  return a.W;
}
// events of an actor's clips crossed between st0 and st1 (for sound and effects)
function mimActorEvents(a, st0, st1, cb) {
  if (st1 <= st0) return;
  for (let i = 0; i < a.track.length; i++) {
    const seg = a.track[i], nx = a.track[i + 1], clip = LG_ANIM_BY[seg[1]]; if (!clip || !clip.ev) continue;
    const s0 = seg[0], s1 = nx ? nx[0] : 1e9;
    for (const e of clip.ev) {
      const off = seg[2] || 0; let base = s0 - off;
      if (clip.loop) { for (let c = Math.floor((st0 - base) / clip.dur) - 1; c <= Math.floor((st1 - base) / clip.dur) + 1; c++) { const at = base + c * clip.dur + e[0]; if (at > st0 && at <= st1 && at >= s0 && at < s1) cb(e[1], a, at); } }
      else { const at = base + e[0]; if (at > st0 && at <= st1 && at >= s0 && at < s1) cb(e[1], a, at); }
    }
  }
}

/* ---------- time: the speed curve and its integral ---------- */
// curve: [[realT, speed], ...] (linear between keys); st(rt) is its integral, tabulated
function mimWarp(curve, dur) {
  const n = Math.ceil(dur * 240), tab = new Float32Array(n + 1); let st = 0;
  const sp = t => { if (t <= curve[0][0]) return curve[0][1]; for (let i = 1; i < curve.length; i++) if (t <= curve[i][0]) { const a = curve[i - 1], b = curve[i], k = (t - a[0]) / ((b[0] - a[0]) || 1), s = k * k * (3 - 2 * k); return a[1] + (b[1] - a[1]) * s; } return curve[curve.length - 1][1]; };
  for (let i = 0; i <= n; i++) { tab[i] = st; st += sp(i / 240) / 240; }
  return { tab: tab, n: n, sp: sp, st: rt => { const f = clamp(rt * 240, 0, n), i = Math.floor(f), k = f - i; return i >= n ? tab[n] : tab[i] + (tab[i + 1] - tab[i]) * k; } };
}

/* ---------- the engine's state ---------- */
const MIM = { ver: 1, scene: null, rt: 0, st: 0, lastSt: 0, playing: false, actors: [], set: null, setW: null, cam: lgCam(), S: null, shots: [], shot: -1, warp: null, cues: [], cueI: 0, onEnd: null, onCue: null,
  cls: 'attack', w: 0, h: 0, scale: 1, adapt: 0, lvl: 2, ms: 0, msAvg: 0, frames: 0, mode: 'none', cv2: null, g2: null, mount: null, studio: { view: 'front', yaw: 0, pitch: 0.12, dist: 3.1, auto: true, tTilt: 0, from: null }, errT: [], offUntil: 0, look: {} };
function mimLevel() { return MIM.lvl = clamp(([1, 1, 2, 3][clamp(PERF.tier | 0, 0, 3)]) + MIM.adapt + (TUNE.MIMATIC || 0), 0, 3); }
const MIMQ = [{ scale: 0.55, lod: 1, lineLod: 2 }, { scale: 0.7, lod: 1, lineLod: 2 }, { scale: 0.85, lod: 0, lineLod: 1 }, { scale: 1, lod: 0, lineLod: 1 }];
function mimSetW() { const W = new Float32Array(LG_NB_MAX * 16); for (let i = 0; i < LG_NB_MAX; i++) W.set(lgM4(), i * 16); return W; }

/* ---------- lighting per scene ---------- */
function mimAlleyLights(acc) {
  return {
    key: { dir: [-0.3, 0.4, 1], col: [0.3, 0.38, 0.52] }, rim: { dir: [1, 0.1, 0.25], col: [0.5, 0.74, 1.1] }, sky: [0.055, 0.065, 0.095], gnd: [0.03, 0.027, 0.03],
    pts: [{ p: [-6.7, -1.5, 5.1], r: 19, col: [2.1, 1.2, 0.48] }, { p: [11.0, -2.3, 3.6], r: 7.5, col: [1.6, 0.45, 1.2] }, { p: [7.5, -2.35, 2.4], r: 5, col: [1.5, 1.0, 0.55] }, { p: [5.5, 2.5, 4.0], r: 0.01, col: [0, 0, 0] }],
    fog: { col: [0.03, 0.04, 0.062], d: 0.04, h: 0.12, s: 1.5 }, wet: 1, expo: 1.3, clear: [0.012, 0.016, 0.026]
  };
}
// where a bone of an actor is in the world
function mimBone(a, n) { const i = LGB[n] * 16; return [a.W[i + 12], a.W[i + 13], a.W[i + 14]]; }
const mimMid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
/* ---------- the line-up: the five classes in the rain ---------- */
const MIM_LINE_IDLE = [['idle_ready', 'idle_scan', 'press_check', 'idle_ready', 'rain_gaze'], ['idle_scan', 'idle_ready', 'neck_roll', 'idle_scan', 'check_six'], ['idle_ready', 'glove_tug', 'idle_scan', 'idle_ready', 'radio'], ['rain_gaze', 'idle_ready', 'idle_scan', 'press_check', 'idle_ready'], ['idle_scan', 'neck_roll', 'idle_ready', 'rain_gaze', 'idle_scan']];
function mimLineup(o) {
  o = o || {}; const q = MIMQ[mimLevel()], A = [];
  LG_CLASSES.forEach((c, i) => {
    const y = (2 - i) * 1.18, list = MIM_LINE_IDLE[i], tr = [[0, 'mask_tap', 0, 0]]; let t = 2.5 + i * 0.35;
    for (let k = 0; k < 40; k++) { const id = list[k % list.length], cl = LG_ANIM_BY[id]; tr.push([t, id, 0, 0.6]); t += cl.loop ? cl.dur * (id === 'idle_scan' ? 1 : 2) : cl.dur; }
    A.push(mimActor({ model: 'operator', cls: c.id, lod: q.lineLod, track: tr, root: [[0, 6.2 - Math.abs(i - 2) * 0.25, y, 0, Math.PI + (i - 2) * -0.06]], acc: lgHex(c.col), rimCol: lgHex(c.col).map(v => v * 2.4), hide: mimHideCarbine() }));
  });
  return A;
}
function mimHideCarbine() { const h = new Uint8Array(LG_NB_MAX); h[LGB.carbine] = 1; h[LGB.cmag] = 1; return h; }

/* ---------- the Operator's cinematic: the beat sheet, and the director at work ---------- */
// actors' blocking (scene time); the director turns the beats into shots (real time) and a time curve
function mimAlley(cls, S) {
  S = S || (t => t); const q = MIMQ[mimLevel()], acc = lgHex(LG_CLASS_BY[cls].col);
  const op = mimActor({ model: 'operator', cls: cls, lod: q.lod, acc: acc, hide: mimHideCarbine(),
    track: [[0, 'walk_tac', 0, 0], [2.75, 'mask_tap', 0, 0.45], [4.3, 'c_alert', 0, 0.35], [6.3, 'c_fire', 0, 0.16], [7.25, 'c_throw', 0, 0.2], [8.75, 'c_mount', 0, 0.42]],
    root: [[0, 0.1, 0.12, 0, 0], [2.45, 2.75, 0.12, 0, 0, 'l'], [3.05, 3.05, 0.1, 0, 0, 'o'], [6.3, 3.05, 0.1, 0, 0], [6.55, 3.05, 0.1, 0, -0.08], [7.3, 3.05, 0.08, 0, 0.0], [7.55, 3.2, 0.05, 0, Math.PI, 'io'], [8.75, 3.2, 0.05, 0, Math.PI], [9.3, 2.95, 0.1, 0, Math.PI, 'io']] });
  const z1 = mimActor({ model: 'zombie', cls: 'cook', lod: Math.max(1, q.lod), show: [4.55, 1e9],
    track: [[0, 'z_burst', 0, 0], [4.95, 'z_rush', 0, 0.15], [6.55, 'z_hs', 0, 0.04]],
    root: [[0, 7.5, -2.55, 0, Math.PI / 2], [4.55, 7.5, -2.55, 0, Math.PI / 2], [4.95, 7.2, -1.8, 0, 2.3, 'o'], [6.55, 5.05, -0.5, 0, 2.9, 'l'], [7.5, 5.75, -0.62, 0, 2.9, 'o']] });
  const z2 = mimActor({ model: 'zombie', cls: 'exec', lod: Math.max(1, q.lod), show: [4.85, 1e9],
    track: [[0, 'z_rise', 0, 0], [5.3, 'z_rush', 0.2, 0.15], [7.18, 'z_grab', 0, 0.08], [7.85, 'z_thrown', 0, 0.06], [8.42, 'z_pinned', 0, 0.12]],
    root: [[0, 10.2, 1.85, 0, Math.PI], [4.85, 10.2, 1.85, -0.25, Math.PI], [5.3, 9.6, 1.5, 0, Math.PI + 0.15, 'o'], [7.18, 3.62, 0.18, 0, Math.PI, 'l'], [7.55, 3.5, 0.12, 0, Math.PI], [7.85, 3.55, 0.08, 0.15, Math.PI], [8.35, 2.3, 0.0, 0.0, Math.PI]] });
  // the throw: the body arcs over his hip and rotates three-quarters of a turn forward onto its back
  const tThrow = S(7.85), tPin = S(8.42);
  z2.custom = (st, a) => {
    if (st < tThrow) return;
    const k = clamp((st - tThrow) / 0.5, 0, 1), s = k * k * (3 - 2 * k);
    const x = lgLerp(3.55, 2.3, s), z = Math.sin(Math.min(k, 1) * Math.PI) * 1.05 + lgLerp(0.98, 0.16, s) - 0.98, pitch = 1.5 * Math.PI * Math.min(1, k * 1.05);
    a.P.t[LGB.pelvis * 3] = 0; a.P.t[LGB.pelvis * 3 + 2] = z; lgJ(a.P, 'pelvis', 0, pitch, 0);
    a.rootX = x; a.P.ik.footL = a.P.ik.footR = null;
  };
  z2.customPost = (st, a) => { if (st >= tPin) { a.P.t[LGB.pelvis * 3 + 2] = -0.82; lgJ(a.P, 'pelvis', 0, 1.5 * Math.PI, 0); a.P.ik.footL = a.P.ik.footR = null; } };
  // everything above was blocked in real time; the time curve turns it into scene time. The knife reaches the top of
  // its swing exactly as time stops.
  for (const a of [op, z1, z2]) { a.track = a.track.map(k => [S(k[0]), k[1], k[2], k[3]]); a.root = a.root.map(k => [S(k[0]), k[1], k[2], k[3], k[4], k[5]]); a.show = [S(a.show[0]), a.show[1]]; }
  const stop = S(10.65), mi = op.track.findIndex(k => k[1] === 'c_mount'); if (mi > 0) op.track[mi][0] = Math.min(op.track[mi][0], stop - 1.95);
  return [op, z1, z2];
}
// the beat sheet: what happens, and the techniques the director reaches for
const MIM_SHEET_OPERATOR = [
  { beat: 'establish', t: 0, tech: ['hero', 'track'], what: 'He walks into the alley out of the streetlight, rain lit from behind.' },
  { beat: 'insert', t: 2.9, tech: ['insert'], what: 'The mask locks, plate by plate; the visor lights in the class colour.' },
  { beat: 'threat', t: 4.4, tech: ['ots', 'dutch', 'whip'], what: 'A kitchen door bangs open; two of the dead come for him.' },
  { beat: 'action', t: 6.35, tech: ['ots', 'punch', 'hits'], what: 'Isosceles in a quarter second; one round; the muzzle lights the alley.' },
  { beat: 'impact', t: 7.2, tech: ['handheld', 'ramp', 'punch'], what: 'Grabbed; hips in; over and down into the water.' },
  { beat: 'slow', t: 8.45, tech: ['hero', 'ramp'], what: 'A knee on its chest; the knife comes out in a reverse grip and goes up.' },
  { beat: 'freeze', t: 10.65, tech: ['freeze', 'lightning', 'title'], what: 'Everything stops; lightning freezes the frame.' },
  { beat: 'resolve', t: 12.6, tech: ['hits'], what: 'The name holds; the thunder rolls; out to black.' }
];
function mimDirectOperator() {
  const R = MIM.reduce, A = () => MIM.actors, op = () => A()[0], z1 = () => A()[1], z2 = () => A()[2];
  const opAt = () => op().root4, zAt = (z) => z.root4;
  const shots = [];
  // establish: low and in front, falling back as he comes, then a tracking shot alongside
  shots.push({ t0: 0, t1: 1.6, tech: ['hero'], cam: (rt) => { const r = opAt(); return { eye: [r[0] + lgLerp(3.0, 2.3, rt / 1.6), r[1] - 0.45, 0.3], tgt: [r[0], r[1], 1.3], fov: 0.64, shake: 0.25 }; } });
  shots.push({ t0: 1.6, t1: 2.9, tech: ['track'], cam: (rt) => { const r = opAt(); return { eye: [r[0] + 0.6, -2.2, 1.3], tgt: [r[0] + 0.3, r[1], 1.25], fov: 0.76, shake: 0.3 }; } });
  // insert: the mask, close, creeping in
  shots.push({ t0: 2.9, t1: 4.4, tech: ['insert'], cam: (rt) => { const H = mimBone(op(), 'head'), k = lgE.io(lgW(rt, 2.9, 4.4)), d = lgLerp(1.05, 0.74, k), az = -0.5; return { eye: [H[0] + 0.05 + Math.cos(az) * d, H[1] + Math.sin(az) * d, H[2] + 0.1], tgt: [H[0] + 0.05, H[1], H[2] + 0.07], fov: 0.5, shake: 0.06, flare: rt > 4.05 ? 1.5 : 0.4 }; } });
  // threat: over his shoulder toward the door, the horizon tipped; a whip to the second one; then low behind him
  const ots = () => { const H = mimBone(op(), 'head'); return [H[0] - 0.72, H[1] - 0.4, H[2] + 0.08]; };
  shots.push({ t0: 4.4, t1: 5.25, tech: ['ots', 'dutch'], cam: (rt) => { const zz = zAt(z1()) || [7.4, -2.3], k = lgW(rt, 4.6, 5.2); return { eye: ots(), tgt: [lgLerp(7.4, zz[0], k), lgLerp(-2.3, zz[1], k), 1.3], fov: 0.7, roll: R ? 0 : 0.17, shake: 0.5 }; } });
  shots.push({ t0: 5.25, t1: 5.52, tech: ['whip'], cam: (rt) => { const a = zAt(z1()), b = zAt(z2()), k = lgE.s(lgW(rt, 5.25, 5.5)); return { eye: ots(), tgt: [lgLerp(a[0], b[0], k), lgLerp(a[1], b[1], k), 1.3], fov: 0.7, roll: R ? 0 : lgLerp(0.17, -0.12, k), shake: 0.6, mb: R ? 0 : 0.6 * Math.sin(k * Math.PI) }; } });
  shots.push({ t0: 5.52, t1: 6.35, tech: ['hero', 'ots'], cam: (rt) => { const r = opAt(), m = mimMid(zAt(z1()), zAt(z2())); return { eye: [r[0] - 2.6, r[1] + 1.1, 1.05], tgt: [m[0], m[1], 1.15], fov: 0.6, roll: R ? 0 : -0.07, shake: 0.55 }; } });
  // action: tight over the gun; the shot is the hit; then the fall, from low
  shots.push({ t0: 6.35, t1: 6.78, tech: ['ots', 'punch'], cam: (rt) => { const r = opAt(); return { eye: [r[0] - 0.42, r[1] - 0.3, 1.6], tgt: [r[0] + 2.4, r[1] - 0.55, 1.35], fov: 0.58, shake: 0.35, punch: lgPulse(rt, 6.55, 6.75) }; } });
  shots.push({ t0: 6.78, t1: 7.2, tech: ['hero'], cam: (rt) => { const P = mimBone(z1(), 'pelvis'); return { eye: [P[0] - 0.6, Math.min(2.4, P[1] + 2.1), 0.62], tgt: [P[0] + 0.15, P[1], Math.max(0.35, P[2] - 0.1)], fov: 0.74, shake: 0.4 }; } });
  // impact: grabbed and thrown, handheld, slowed at the top, a jolt on the landing
  shots.push({ t0: 7.2, t1: 8.48, tech: ['handheld', 'ramp', 'punch'], cam: (rt) => ({ eye: [1.95, -2.2, 1.05], tgt: [2.95, 0.05, 0.98], fov: 0.84, roll: R ? 0 : 0.05, shake: 0.7 + lgPulse(rt, 8.3, 8.6) * 2, punch: lgPulse(rt, 8.32, 8.55) * 0.6 }) });
  // slow: high and down on the pin, then low in front of him as the knife goes up
  shots.push({ t0: 8.48, t1: 9.45, tech: ['hero'], cam: () => ({ eye: [2.2, -1.25, 2.45], tgt: [2.75, 0.05, 0.45], fov: 0.72, shake: 0.3 }) });
  shots.push({ t0: 9.45, t1: 10.65, tech: ['hero', 'ramp'], cam: (rt) => { const r = opAt(), k = lgW(rt, 9.45, 10.65), H = mimBone(op(), 'head'), K = mimBone(op(), 'handL'), c = mimMid(H, K); return { eye: [r[0] - lgLerp(1.2, 1.05, k), r[1] - lgLerp(0.85, 0.75, k), 0.32], tgt: [c[0], c[1], c[2] - 0.05], fov: lgLerp(0.78, 0.7, k), shake: 0.2 * (1 - k) }; } });
  // freeze: bullet time round the frozen moment, lightning, the title
  shots.push({ t0: 10.65, t1: 14.2, tech: ['freeze', 'lightning', 'title'], cam: (rt) => { const H = mimBone(op(), 'head'), K = mimBone(op(), 'handL'), c = mimMid(H, K), k = lgE.s(lgW(rt, 10.65, 13.2)), a = lgLerp(Math.PI + 0.62, Math.PI - 0.45, k), d = lgLerp(1.35, 1.75, k); return { eye: [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d, lgLerp(0.55, 1.15, k)], tgt: [c[0], c[1], c[2] - 0.08], fov: lgLerp(0.72, 0.64, k), shake: 0 }; } });
  // time: normal, a little slow at the top of the throw, ramping down from 10.2 to a stop at 10.65
  const warp = mimWarp([[0, 1], [7.88, 1], [8.0, 0.62], [8.22, 0.62], [8.34, 1], [10.15, 1], [10.6, 0.12], [10.66, 0.0], [20, 0]], 14.2);
  // cues (real time): score sections, hits, effects
  const cues = [
    [0, 'score'], [0, 'fadeIn'], [0.4, 'carPass'], [1.6, 'sirenFar'], [2.95, 'maskInsert'], [4.62, 'doorBang'], [4.66, 'zScream1'], [5.0, 'zScream2'], [5.25, 'whip'], [6.6, 'shotHit'],
    [7.22, 'grab'], [8.33, 'landHit'], [10.2, 'slowmo'], [10.65, 'freeze'], [10.7, 'lightning'], [11.35, 'title'], [12.6, 'resolve'], [13.15, 'fadeOut'], [14.2, 'end']
  ];
  return { shots: shots, warp: warp, cues: cues, dur: 14.2 };
}

/* ---------- starting, running and drawing a scene ---------- */
function mimSetup() {
  if (MIM.mode !== 'none') return MIM.mode;
  if (![LG, MIM, VX].some(x => x.procWant === 'cpu') && lgGLInit() && vfxGLInit()) MIM.mode = 'gl'; else { MIM.mode = '2d'; MIM.cv2 = document.createElement('canvas'); MIM.cv2.className = 'lg-cv'; MIM.g2 = MIM.cv2.getContext('2d'); }
  return MIM.mode;
}
function mimCanvas() { return MIM.mode === 'gl' ? LGR.cv : MIM.cv2; }
// name: 'lineup' | 'alley' | 'studio' | 'hub'; o: { cls, onEnd, onCue, legend }
function mimStart(name, o) {
  o = o || {}; mimSetup(); MIM.reduce = typeof RM !== 'undefined' && RM;
  MIM.scene = name; MIM.rt = 0; MIM.st = 0; MIM.lastSt = 0; MIM.playing = true; MIM.noSync = false; MIM.clk = null; MIM.wall0 = performance.now(); MIM.cls = o.cls || MIM.cls; MIM.onEnd = o.onEnd || null; MIM.onCue = o.onCue || null; MIM.cueI = 0; MIM.shot = -1; MIM.look = {};
  vfxReset();
  const q = MIMQ[mimLevel()];
  if (name === 'alley') {
    MIM.set = lgModel('alley', q.lod === 0 ? 0 : 1, ''); MIM.ground = lgModel('alleyGround', q.lod === 0 ? 0 : 1, ''); MIM.setW = mimSetW();
    const d = mimDirectOperator(); MIM.warp = d.warp; MIM.actors = mimAlley(MIM.cls, d.warp.st); MIM.shots = d.shots; MIM.cues = d.cues; MIM.dur = d.dur;
  } else if (name === 'lineup' || name === 'hub') {
    MIM.set = lgModel('alley', q.lod === 0 ? 0 : 1, ''); MIM.ground = lgModel('alleyGround', q.lod === 0 ? 0 : 1, ''); MIM.setW = mimSetW();
    MIM.actors = mimLineup(); MIM.shots = []; MIM.warp = null; MIM.cues = []; MIM.dur = 1e9; MIM.nextBolt = 6 + Math.random() * 6; mimAlleyProps(0);
  } else if (name === 'stoop') {
    // 1.9.993: the selection screen's idle scene (legidle.js)
    MIM.set = lgModel('stoop', q.lod === 0 ? 0 : 1, ''); MIM.ground = lgModel('stoopGround', q.lod === 0 ? 0 : 1, ''); MIM.setW = mimSetW();
    MIM.actors = lgiStart(o); MIM.shots = []; MIM.warp = null; MIM.cues = []; MIM.dur = 1e9;
  } else if (name === 'studio') {
    MIM.set = lgModel('studio', 0, ''); MIM.ground = lgModel('studioGround', 0, ''); MIM.setW = mimSetW();
    const pl = lgPlayer(); lgPlay(pl, o.anim || 'idle_ready', { fade: 0 }); pl.ctx.inPlace = true;
    MIM.actors = [mimActor({ model: o.legend || 'operator', cls: MIM.cls, lod: q.lod === 0 ? 0 : 1, acc: lgHex(LG_CLASS_BY[MIM.cls].col), player: pl })];
    mimStudioLoad(MIM.actors[0]);   // (1.9.994: he holds the guns you carry)
    MIM.studio.view = 'front'; MIM.studio.auto = true; MIM.studio.held = false; MIM.studio.from = null; MIM.studio.tTilt = 0; MIM.studio.yaw = 0; MIM.studio.pitch = 0.1; MIM.studio.dist = 3.3;
    MIM.cues = []; MIM.dur = 1e9; MIM.warp = null;
  }
  if (name === 'alley') mimAlleyProps(0);
  if (name === 'alley' || name === 'lineup' || name === 'hub') { MIM.phys = mimAlleyPhys(); MIM.neonNext = null; mimAlleyPhysTick(0, 0); } else MIM.phys = null;
  for (const a of MIM.actors) { a.m = lgModel(a.model, a.lod, a.cls); a.lastSt = 0; }
  coreEmit('cinematic', { scene: name, cls: MIM.cls });
  return true;
}
function mimStop() { MIM.playing = false; MIM.scene = null; MIM.actors = []; vfxReset(); }
// one frame: advance, pose, direct, draw
function mimFrame(rdt, w, h) {
  if (!MIM.playing || !MIM.scene) return;
  if (w > 0 && h > 0) MIM.asp = w / h;   // (the stoop frames by it: a phone held upright is a narrow frame)
  if (MIM.offUntil && performance.now() < MIM.offUntil) return;
  const t0 = performance.now(); VX.msF = 0;
  try {
    // the alley follows its score's clock (the hit points must land on the cut); anything else runs in real time
    let adv = rdt;
    if (MIM.scene === 'alley' && !MIM.noSync && MIM.rt > 0.1) {
      const c = mimClock();
      if (c != null && c !== MIM.clk) { const d = c - MIM.rt; if (d < -0.6 || d > 6) MIM.noSync = true; else adv = clamp(d, 0, 0.8); }
      MIM.clk = c;
    }
    MIM.rt += adv; const rt = MIM.rt;
    const st = MIM.warp ? MIM.warp.st(rt) : rt, dst = st - MIM.st; MIM.lastSt = MIM.st; MIM.st = st;
    // cues
    while (MIM.cueI < MIM.cues.length && MIM.cues[MIM.cueI][0] <= rt) { const c = MIM.cues[MIM.cueI++]; mimCue(c[1], rt); }
    // actors
    for (const a of MIM.actors) {
      if (a.player) { if (a.gp || a.gs) lgGunSet(a.gp, a.gs); lgTickPlayer(a.player, rdt, null, (e) => mimEvent(e, a)); if (a.gp || a.gs) lgGunSet(null, null); a.W = a.player.W; continue; }
      if (st < a.show[0]) { a.hidden = true; continue; } a.hidden = false;
      mimActorEvents(a, MIM.lastSt, st, (e) => mimEvent(e, a));
      mimActorEvalFull(a, st);
    }
    if (MIM.scene === 'stoop') { lgiTick(rdt); if (Math.random() < 0.6) vfxSteam([3.6, -1.2, 0.03], rdt); }
    if (MIM.scene === 'studio') { const sd = MIM.studio; if (sd.auto && sd.view === 'front' && rt > 1.6 && !sd.held) { sd.view = 'top'; sd.tTilt = rt; sd.from = { yaw: sd.yaw, pitch: sd.pitch, dist: sd.dist }; } }
    if (MIM.phys) mimAlleyPhysTick(st, Math.max(0, dst));
    if (MIM.scene === 'alley') { mimAlleyProps(st); if (MIM.pendingSplash && rt >= MIM.pendingSplash) { MIM.pendingSplash = 0; vfxSplash([5.65, -0.6], 1.1); mimSfx('bodySplash'); } }
    vfxTick(Math.max(0, dst));
    if (MIM.scene === 'alley' && Math.random() < 0.5) vfxSteam([12, -1.5, 0.05], Math.max(0, dst));
    if ((MIM.scene === 'alley' || MIM.scene === 'lineup' || MIM.scene === 'hub') && Math.random() < 0.35) { vfxSteam([2.2, 2.45, 0.05], Math.max(0, dst) * 0.7); vfxSteam([16, 0.9, 0.03], Math.max(0, dst) * 0.6); }
    // lightning in the line-up, now and then
    if ((MIM.scene === 'lineup' || MIM.scene === 'hub') && rt > MIM.nextBolt) { MIM.nextBolt = rt + 9 + Math.random() * 8; vfxLightning(rt, [26 + Math.random() * 6, -8 + Math.random() * 16, 30], [24, -6 + Math.random() * 12, 6]); mimSfx('thunderFar'); }
    if (!MIM.noRender) mimRender(w, h, rt, st);
    if (rt >= MIM.dur) { const cb = MIM.onEnd; MIM.playing = false; if (cb) cb(); }
  } catch (e) { mimHurt(e); }
  // the effects' share goes on VFXRAY's books, the rest (the direction, the actors, the scene pass) on MIMATIC's
  const dt = performance.now() - t0, vx = Math.min(VX.msF, dt); MIM.ms = dt - vx; MIM.msAvg = MIM.msAvg * 0.9 + (dt - vx) * 0.1; MIM.frames++; coreCost('MIMATIC', dt - vx);
  if (vx > 0) { VX.ms = vx; VX.msAvg = VX.msAvg * 0.9 + vx * 0.1; VX.frames++; coreCost('VFXRAY', vx); }
  LG.beatT = performance.now(); VX.beatT = LG.beatT;
}
function mimActorEvalFull(a, st) {
  // the same as mimActorEval, with the scene's own touches (the throw's arc) applied before the solve
  const tr = a.track; let i = 0; while (i < tr.length - 1 && tr[i + 1][0] <= st) i++;
  const seg = tr[i], clip = LG_ANIM_BY[seg[1]]; if (!clip) return;
  const r = mimRootAt(a, st); a.rootX = null; a.root4 = r;
  lgEvalClip(clip, st - seg[0] + (seg[2] || 0), a.P, a.ctx);
  if (a.custom) a.custom(st, a); if (a.customPost) a.customPost(st, a);
  mimWeight(a, r, st);
  const rootM = lgM4(); lgRot(rootM, 0, 0, r[3]); rootM[12] = a.rootX != null ? a.rootX : r[0]; rootM[13] = r[1]; rootM[14] = r[2];
  if (a.P.root[3] || a.P.root[0]) { const m2 = lgM4(); lgRot(m2, 0, 0, a.P.root[3]); m2[12] = a.P.root[0]; lgMul(rootM, rootM, m2); }
  lgSolve(a.P, a.L, a.W, rootM);
  const fade = seg[3] == null ? 0.2 : seg[3];
  if (i > 0 && fade > 0 && st - seg[0] < fade && !a.custom) {
    const pv = tr[i - 1], pc = LG_ANIM_BY[pv[1]];
    if (pc) { lgEvalClip(pc, st - pv[0] + (pv[2] || 0), a.P2, a.ctx); lgSolve(a.P2, a.L2, a.W2, rootM); const k = (st - seg[0]) / fade; lgBlendL(a.L2, a.L, k * k * (3 - 2 * k), a.L); lgWorldAll(a.W, a.L, rootM); }
  } else if (i > 0 && fade > 0 && st - seg[0] < fade && a.custom && st < 7.85) {
    const pv = tr[i - 1], pc = LG_ANIM_BY[pv[1]];
    if (pc) { lgEvalClip(pc, st - pv[0] + (pv[2] || 0), a.P2, a.ctx); lgSolve(a.P2, a.L2, a.W2, rootM); const k = (st - seg[0]) / fade; lgBlendL(a.L2, a.L, k * k * (3 - 2 * k), a.L); lgWorldAll(a.W, a.L, rootM); }
  }
}
// 1.9.993: weight. A body is not a point sliding on a path: when the hips speed up the upper body lags, when they stop
// it carries on and swings back, a turn twists the shoulders after the hips while the head holds steady against it.
// Springs (PHYSICS) driven by each actor's own acceleration and turn rate, in scene time (they slow and freeze with it)
function mimWeight(a, r, st) {
  const S = a.sec || (a.sec = { x: r[0], y: r[1], yaw: r[3], vx: 0, vy: 0, vyaw: 0, st: st, lf: { x: 0, v: 0 }, ls: { x: 0, v: 0 }, tw: { x: 0, v: 0 } });
  const dt = st - S.st; S.st = st;
  if (dt > 1e-4 && dt < 0.2) {
    const vx = (r[0] - S.x) / dt, vy = (r[1] - S.y) / dt, vyaw = angD(r[3], S.yaw) / dt, ax = (vx - S.vx) / dt, ay = (vy - S.vy) / dt, c = Math.cos(r[3]), s = Math.sin(r[3]);
    const af = ax * c + ay * s, as = -ax * s + ay * c;
    physWobble(S.lf, clamp(-af * 0.02, -0.14, 0.14), 70, 0.45, dt); physWobble(S.ls, clamp(as * 0.015, -0.1, 0.1), 70, 0.45, dt); physWobble(S.tw, clamp(-vyaw * 0.06, -0.25, 0.25), 90, 0.55, dt);
    S.vx = vx; S.vy = vy; S.vyaw = vyaw;
  } else if (dt < 0 || dt >= 0.2) { S.vx = S.vy = S.vyaw = 0; }
  S.x = r[0]; S.y = r[1]; S.yaw = r[3];
  const P = a.P; lgJadd(P, 'spine', S.ls.x * 0.4, S.lf.x * 0.5, S.tw.x * 0.4); lgJadd(P, 'chest', S.ls.x * 0.4, S.lf.x * 0.4, S.tw.x * 0.4); lgJadd(P, 'neck', -S.ls.x * 0.3, -S.lf.x * 0.5, -S.tw.x * 0.7); lgJadd(P, 'head', 0, -S.lf.x * 0.3, -S.tw.x * 0.3);
}
// 1.9.993: the loose things in the alley, in PHYSICS's 3D world: bottles and a can by the kitchen door (the door sends
// them flying), a can in his path (his boot sends it skittering), two newspapers the wind drags along
function mimAlleyPhys() {
  const Wd = phy3New({ boxes: [{ min: [-20, 2.8, 0], max: [30, 3.6, 10] }, { min: [-20, -3.6, 0], max: [30, -2.8, 10] }, { min: [8.65, 1.4, 0], max: [10.55, 2.6, 1.12] }, { min: [-20, 2.44, 0], max: [30, 2.8, 0.08] }, { min: [-20, -2.8, 0], max: [30, -2.44, 0.08] }] });
  const hit = (b, v) => { if (MIM.scene === 'alley' && v > 0.6) mimSfx(b.glass ? 'glassClink' : 'canBounce', 0.9 + Math.random() * 0.25); };
  const P = [phy3Add(Wd, { s: 'cyl', r: 0.033, h: 0.24, p: [7.42, -2.5, 0.2], e: 0.3, mu: 0.5, rr: 0.05, onHit: hit, glass: true }), phy3Add(Wd, { s: 'cyl', r: 0.033, h: 0.24, p: [7.62, -2.42, 0.2], e: 0.3, mu: 0.5, rr: 0.05, onHit: hit, glass: true }),
    phy3Add(Wd, { s: 'cyl', r: 0.033, h: 0.12, p: [7.9, -2.48, 0.14], e: 0.35, mu: 0.4, rr: 0.035, onHit: hit }), phy3Add(Wd, { s: 'cyl', r: 0.033, h: 0.12, p: [1.55, 0.34, 0.034], r3: [Math.PI / 2, 0, 0.4], e: 0.35, mu: 0.4, rr: 0.035, onHit: hit })];
  for (const b of P) { b.rest = true; }
  return { w: Wd, P: P, door: false, kick: false };
}
function mimAlleyPhysTick(st, dst) {
  const A = MIM.phys; if (!A) return;
  // the door hits the bottles (scene time 4.62), his boot finds the can (1.45)
  if (!A.door && st >= 4.62) { A.door = true; A.P.slice(0, 3).forEach((b, i) => { b.rest = false; b.v = [0.3 + i * 0.4 + Math.random() * 0.3, 3.2 + Math.random() * 1.6, 1.2 + Math.random()]; b.w = [6 + Math.random() * 8, Math.random() * 6, Math.random() * 4]; }); mimSfx('glassClink', 1.1); }
  if (!A.kick && st >= 1.45) { A.kick = true; const b = A.P[3]; b.rest = false; b.v = [2.4, 0.45, 0.7]; b.w = [0, 18, 2]; b.rollSign = 1; mimSfx('canKick', 1.2); }
  if (dst > 0) phy3Step(A.w, Math.min(0.1, dst));
  A.P.forEach((b, i) => MIM.setW.set(phy3Mat(b), MIM_PROPS[i] * 16));
  // the papers: dragged by the wind, lifting and flapping now and then
  MIM_PAPER.forEach((bn, i) => { const t = st + i * 3.7, x = 13 - ((t * 0.55) % 16), y = (i ? -1.4 : 1.2) + Math.sin(t * 0.7 + i) * 0.4, z = 0.012 + Math.max(0, Math.sin(t * 1.3 + i * 2)) * 0.18 * (0.5 + 0.5 * Math.sin(t * 0.31)); MIM.setW.set(lgMul(lgM4(), lgTR(x, y, z, Math.sin(t * 2.1 + i) * 0.5 * (z > 0.05 ? 1 : 0.1), Math.sin(t * 1.7) * 0.3 * (z > 0.05 ? 1 : 0.1), t * 0.4 + i), lgM4()), bn * 16); });
}
// the neon stutters now and then (its light with it)
function mimNeon(rt) {
  if (MIM.neonNext == null) MIM.neonNext = rt + 2 + Math.random() * 4;
  if (rt > MIM.neonNext + 0.55) MIM.neonNext = rt + 3 + Math.random() * 6;
  const on = rt < MIM.neonNext || (Math.sin(rt * 61) > -0.1 && Math.sin(rt * 17) > 0.2) ? 1 : 0;
  if (MIM.setW) MIM.setW.set(on ? lgM4() : LG_HIDE, MIM_NEON * 16);
  return on;
}
// 1.9.993: MIMATIC checks its own framing as it plays. Where the subject's head lands on screen in each shot: off the
// edge, or with no headroom, or jammed against a side with no lead room -- and corrects that shot next time (a little
// wider, the target moved), remembering it on the device. The rules are the ones the director frames by (thirds,
// headroom over the eyes, lead room toward where a subject faces).
function mimLearnLoad() { if (!MIM.learn) MIM.learn = (typeof store !== 'undefined' && store.get('zc_mimLearn', null)) || {}; return MIM.learn; }
function mimLearnApply(i, look) { const L = mimLearnLoad()[i]; if (!L) return; look.fov = clamp(look.fov * (1 + (L.w || 0)), 0.35, 1.2); if (look.tgt) look.tgt[2] += L.u || 0; }
function mimLearnFrame(i, cam, w, h) {
  const op = MIM.actors[0]; if (i == null || i < 0 || !op || !op.W || !cam.VP || MIM.reduce) return;
  const Hh = mimBone(op, 'head'), V = cam.VP, x = V[0] * Hh[0] + V[4] * Hh[1] + V[8] * Hh[2] + V[12], y = V[1] * Hh[0] + V[5] * Hh[1] + V[9] * Hh[2] + V[13], ww = V[3] * Hh[0] + V[7] * Hh[1] + V[11] * Hh[2] + V[15];
  if (!(ww > 0.05)) return;
  const nx = x / ww, ny = y / ww, L = mimLearnLoad(), e = L[i] || (L[i] = { w: 0, u: 0, n: 0 });
  // count only this shot's own subject shots (the inserts frame the head on purpose, the throw frames the bodies)
  const shot = MIM.shots[i]; if (!shot || shot.tech.indexOf('insert') >= 0) return;
  e.n++; let changed = false;
  if ((Math.abs(nx) > 1.02 || ny > 1.02) && e.w < 0.18) { e.w += 0.01; changed = true; }
  if (ny > 0.92 && ny <= 1.02 && e.u < 0.3) { e.u += 0.01; changed = true; }
  if (changed) { MIM.learnt = (MIM.learnt || 0) + 1; clearTimeout(MIM.learnSave); MIM.learnSave = setTimeout(() => { try { store.set('zc_mimLearn', MIM.learn); } catch (x) { } }, 1500); }
}
// the set's moving pieces: the kitchen door bangs open, the dumpster lid lifts
function mimAlleyProps(st) {
  const W = MIM.setW, d = lgK(st, [[0, 0], [4.6, 0], [4.72, 1.75, 'o3'], [4.9, 1.45, 'io'], [5.3, 1.6]]), dm = lgTR(7.0, -2.72, 0.05, 0, 0, d); W.set(dm, MIM_DOOR * 16);
  const l = lgK(st, [[0, 0.08], [4.85, 0.08], [5.0, 0.5, 'o'], [5.6, 0.3]]), lm = lgTR(9.6, 2.62, 1.12, -l, 0, 0); W.set(lm, MIM_LID * 16);
}
// clip events -> sound and effects
function mimEvent(e, a) {
  const sp = MIM.warp ? MIM.warp.sp(MIM.rt) : 1;
  if (e === 'shot' && a.model === 'operator') { mimMuzzle(a); mimSfx('cineShot', sp); }
  else if (e === 'rshot') { mimSfx('cineShot', sp); }
  else mimSfx(e, sp, a);
}
function mimMuzzle(a) {
  const W = a.W, i = LGB.pistol * 16, M = W.subarray(i, i + 16), p = lgPt(M, LG_SOCK.muzP[0] + 0.01, 0, 0), d = lgV3n(lgDir(M, 1, 0, 0));
  vfxMuzzle(p, d); const s = lgV3n(lgDir(M, 0, -1, 0.6)); vfxBrass(lgPt(M, 0.09, -0.015, 0.012), s);
  MIM.flashUntil = MIM.rt + 0.06; MIM.flashP = p;
  if (MIM.scene === 'alley' && MIM.actors[1]) { const z = MIM.actors[1].W, h = LGB.head * 16; vfxMist([z[h + 12], z[h + 13], z[h + 14] + 0.08], d); }
}
// the alley's clock: the score's when it is playing (so the hits land on the cut), otherwise the wall clock (muted, or
// the audio not started yet): either way the film keeps real time on a slow device, skipping frames instead of slowing
function mimClock() {
  let c = null; try { c = typeof SFX !== 'undefined' && SFX.cineClock ? SFX.cineClock() : null; } catch (e) { c = null; }
  const w = MIM.wall0 ? (performance.now() - MIM.wall0) / 1000 : null;
  // the audio clock leads while it keeps time with the wall clock; one that stalls or lags (no output device, a busy
  // audio thread) hands over to the wall clock, so the film never waits for it
  return c != null && (w == null || Math.abs(c - w) < 0.35) ? c : w;
}
function mimSfx(name, rate, a) { try { if (typeof SFX !== 'undefined' && SFX.cine) SFX.cine(name, rate == null ? 1 : rate, a && a.model === 'zombie' ? 'z' : 'o'); } catch (e) { } }
function mimCue(c, rt) {
  if (c === 'score') { mimSfx('score', 1); MIM.wall0 = performance.now() - rt * 1000; }
  else if (c === 'lightning') { vfxLightning(rt, [48, 9, 44], [41, 3, 15]); mimSfx('lightning'); }
  else if (c === 'freeze') mimSfx('freeze');
  else if (c === 'slowmo') mimSfx('slowmo');
  else if (c === 'landHit') { vfxSplash([2.3, 0.0], 1.6); mimSfx('landHit'); }
  else if (c === 'shotHit') { mimSfx('hsHit'); }
  else if (c === 'doorBang') { mimSfx('doorBang'); }
  else mimSfx(c);
  if (c === 'landHit' || c === 'shotHit') {}
  if (MIM.scene === 'alley' && c === 'shotHit' && MIM.actors[1]) { const z = MIM.actors[1]; setTimeout(() => { if (MIM.scene === 'alley') vfxSplash([5.6, -0.6], 1.1); }, 450); }
  if (MIM.onCue) try { MIM.onCue(c, rt); } catch (e) { }
}

/* ---------- drawing ---------- */
function mimRender(w, h, rt, st) {
  MIM.w = w; MIM.h = h;
  const scene = MIM.scene, q = MIMQ[mimLevel()], vq = vfxQ();
  // the camera of this moment
  const cam = MIM.cam; let look = { eye: [0, -3, 1.5], tgt: [0, 0, 1], fov: 0.7, roll: 0, shake: 0, mb: 0, punch: 0, flare: 0.4 };
  if (scene === 'alley') { let i = 0; while (i < MIM.shots.length - 1 && MIM.shots[i + 1].t0 <= rt) i++; if (i !== MIM.shot) { MIM.shot = i; } look = Object.assign(look, MIM.shots[i].cam(rt, st)); mimLearnApply(i, look); }
  else if (scene === 'lineup' || scene === 'hub') { const k = Math.sin(rt * 0.07), far = scene === 'hub'; look = { eye: [far ? -3.2 : -1.2 + k * 0.4, k * 0.9, far ? 2.3 : 1.55 + Math.sin(rt * 0.11) * 0.1], tgt: [6.2, k * 0.25, far ? 1.3 : 1.2], fov: far ? 0.62 : 0.74, roll: 0, shake: 0.12, mb: 0, flare: 0.5 }; if (MIM.focus != null) { const y = (2 - MIM.focus) * 1.18; look.tgt[1] = lgLerp(look.tgt[1], y, 0.3); } }
  else if (scene === 'studio') look = mimStudioCam(rt);
  else if (scene === 'stoop') look = lgiCam(rt);
  if (!MIM.reduce && look.shake) mimShake(rt, look.shake, look.eye);
  if (!MIM.reduce && look.punch) { const p = look.punch; look.fov *= 1 - 0.06 * p; look.eye[2] += Math.sin(rt * 70) * 0.01 * p; }
  cam.eye = look.eye; cam.tgt = look.tgt; cam.fov = look.fov; cam.roll = look.roll || 0; cam.near = 0.05; cam.far = 150; cam.up = look.up || [0, 0, 1]; cam.shift = look.shift || null;
  // the lights of this moment
  let S;
  if (scene === 'studio') S = mimStudioLights();
  else if (scene === 'stoop') S = lgiLights();
  else { const L = mimAlleyLights(); S = Object.assign({}, L); }
  S.cam = cam; S.time = st;
  const fl = vfxFlashAt(rt), freeze = scene === 'alley' ? lgW(rt, 10.62, 11.6) : 0;
  // the alley lives: the neon stutters, a car's lights sweep across the mouth of the alley now and then
  const neon = scene === 'alley' || scene === 'lineup' || scene === 'hub' ? mimNeon(rt) : 1;
  if (fl > 0) { S.flash = { dir: [0.35, 0.25, 1], col: [3.2 * fl, 3.4 * fl, 4.2 * fl] }; S.sky = S.sky.map((v, i) => v + [0.35, 0.4, 0.55][i] * fl); }
  if (S.pts && neon < 1) { S.pts = S.pts.slice(); S.pts[1] = Object.assign({}, S.pts[1], { col: [0.08, 0.02, 0.06] }); }
  if (S.pts && scene !== 'studio' && scene !== 'stoop') { const cy = scene === 'alley' ? (rt < 0.3 || rt > 3.2 ? null : lgLerp(-10, 10, (rt - 0.3) / 2.9)) : (((rt + 4) % 17) < 3 ? lgLerp(-10, 10, ((rt + 4) % 17) / 3) : null); if (cy != null) { S.pts = S.pts.slice(); S.pts[2] = { p: [-13, cy, 0.8], r: 6.5, col: [1.3, 1.2, 1.0].map(v => v * clamp(1.6 - Math.abs(cy) / 8, 0, 1)) }; } }
  if (S.pts && scene !== 'studio' && scene !== 'stoop' && MIM.actors[0] && MIM.actors[0].W) { const P0 = mimBone(MIM.actors[0], 'chest'); S.pts = S.pts.slice(); S.pts[3] = { p: [P0[0] - 1.2, P0[1] - 1.5, P0[2] + 1.4], r: 4.2, col: [0.55, 0.85, 1.2] }; }
  if (MIM.flashUntil && rt < MIM.flashUntil && S.pts) { S.pts = S.pts.slice(); S.pts[3] = { p: MIM.flashP, r: 6.5, col: [2.6, 1.7, 0.75] }; }
  S.desat = freeze * 0.7; S.sat = 1 - freeze * 0.15;
  const accS = lgHex(LG_CLASS_BY[MIM.cls].col);
  S.items = [{ m: MIM.ground, W: MIM.setW, ground: true, acc: accS, glow: 1, noShadow: true, noRim: true }, { m: MIM.set, W: MIM.setW, acc: accS, glow: 1, noShadow: true, noRim: true }];
  if (scene === 'studio' && MIM.actors[0] && MIM.actors[0].seat) { if (!MIM.chairW) { MIM.chairW = lgWorldNew(); for (let i = 0; i < LG_NB; i++) MIM.chairW.set(lgM4(), i * 16); } S.items.push({ m: lgModel('studioChair', 0, ''), W: MIM.chairW }); }
  for (const a of MIM.actors) { if (a.hidden || !a.m) continue; S.items.push({ m: a.m, W: a.W, acc: a.acc || lgHex(LG_CLASS_BY[a.cls] ? LG_CLASS_BY[a.cls].col : '#ff4b3e'), glow: a.P ? (a.P.glow == null ? 1 : Math.max(a.P.glow, scene === 'studio' ? 1 : 0)) : 1, hide: a.hide, rim: a.rimCol }); }
  const op = MIM.actors[0];
  S.shadow = { on: vq.shadow && scene !== 'hub', c: op && op.W ? [op.W[LGB.pelvis * 16 + 12], op.W[LGB.pelvis * 16 + 13], 0.8] : [0, 0, 0.8], r: scene === 'lineup' ? 4.2 : 2.6, size: mimLevel() >= 3 ? 2048 : 1024 };
  S.refl = { on: vq.refl > 0, z: 0, scale: vq.refl };
  if (scene === 'lineup' || scene === 'hub') { S.key = { dir: [-0.6, 0.0, 0.8], col: [0.18, 0.2, 0.28] }; }
  MIM.S = S;
  if (scene === 'alley') mimLearnFrame(MIM.shot, cam, w, h);
  if (MIM.mode === 'gl') {
    const k = q.scale * (MIM.scale || 1), rw = Math.max(64, Math.round(w * k)), rh = Math.max(64, Math.round(h * k)), gl = LGR.gl;
    const f = lgFBO('mimScene', rw, rh, true);
    mimSceneGL(S, rw, rh, f);
    // rain, splashes and sprites into the scene, depth-tested
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb); gl.viewport(0, 0, rw, rh);
    const rain = scene === 'studio' ? null : scene === 'stoop' ? { on: true, center: [2.5, 0, 3], box: [10, 12, 7], fall: 7.5, wind: [0.3, 0.6], speed: 1, dim: 0.7, splash: { center: [3.2, 0, 0], area: [6, 9], z: 0 }, density: 0.3 } : { on: true, center: [cam.tgt[0] * 0.5 + cam.eye[0] * 0.5, cam.tgt[1] * 0.5 + cam.eye[1] * 0.5, 4], box: [13, 9, 9], fall: 9, wind: [0.5, 0.25], speed: MIM.warp ? MIM.warp.sp(rt) : 1, dim: 1, splash: { center: [cam.eye[0] * 0.3 + cam.tgt[0] * 0.7, cam.eye[1] * 0.3 + cam.tgt[1] * 0.7, 0], area: [9, 5.4], z: 0 }, density: scene === 'hub' ? 0.6 : 1 };
    let vx0 = performance.now();
    if (rain) vfxRain(S, rain, st);
    vfxBoltSprites(fl); vfxSprites(S, true); vfxSprites(S, false);
    VX.msF += performance.now() - vx0;
    // the post chain to the screen
    if (LGR.cv.width !== w || LGR.cv.height !== h) { LGR.cv.width = w; LGR.cv.height = h; }
    const bars = scene === 'alley' ? Math.min(lgW(rt, 0, 0.8), 1 - lgW(rt, 13.6, 14.2)) * 0.12 + freeze * 0.03 : scene === 'stoop' ? 0.085 * lgW(rt, 0, 1.2) : 0.0;
    const fade = scene === 'alley' ? Math.max(1 - lgW(rt, 0, 0.9), lgW(rt, 13.15, 14.0)) : (scene === 'studio' ? 1 - lgW(rt, 0, 0.5) : 1 - lgW(rt, 0, 1.2));
    const stp = scene === 'stoop';
    const post = { bloom: 3, bloomK: scene === 'studio' ? 0.4 : stp ? 0.8 : 0.62, th: stp ? 0.5 : 0.58, streak: (look.flare || 0.4) * (scene === 'studio' ? 0.4 : 1), ca: scene === 'alley' ? 0.55 + (look.ca || 0) : stp ? 0.5 : 0.3, grain: scene === 'studio' ? 0.025 : stp ? 0.06 : 0.045, vig: scene === 'studio' ? 0.45 : stp ? 0.78 : 0.62, bars: bars, fade: fade, flash: Math.max(fl * 0.3 * (SET.flash ? 0.35 : 1), scene === 'alley' ? lgPulse(rt, 10.64, 10.78) * 0.6 * (SET.flash ? 0.3 : 1) : 0), mb: look.mb || 0, hal: stp ? 0.32 : scene === 'alley' ? 0.2 : scene === 'studio' ? 0.06 : 0.14, tone: scene === 'studio' ? 0.35 : 0.65, shd: scene === 'studio' ? [0, 0, 0] : [-0.004, 0.006, 0.018], hil: scene === 'studio' ? [0, 0, 0] : [0.02, 0.008, -0.012], sat: stp ? 0.92 : 1.05 - freeze * 0.1, expo: 1.0 + fl * 0.25, lift: stp ? [0.004, 0.014, 0.022] : [0.008, 0.012, 0.02], gain: stp ? [1.08, 0.99, 0.9] : [1.03, 1.0, 0.97] };
    vx0 = performance.now(); vfxPost(f, w, h, post, rt); VX.msF += performance.now() - vx0;
  } else {
    const c = MIM.cv2; if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = MIM.g2; lg2DScene(g, Object.assign({}, S, { items: S.items.filter(it => !it.ground) }), w, h);
    const vx0 = performance.now();
    if (scene !== 'studio') vfx2DRain(g, w, h, cam, { on: true, speed: MIM.warp ? MIM.warp.sp(rt) : 1 }, st);
    const bars = scene === 'alley' ? Math.min(lgW(rt, 0, 0.8), 1 - lgW(rt, 13.6, 14.2)) * 0.12 : 0, fade = scene === 'alley' ? Math.max(1 - lgW(rt, 0, 0.9), lgW(rt, 13.15, 14.0)) : 1 - lgW(rt, 0, 0.8);
    vfx2DPost(g, w, h, { vig: 0.6, grain: 0.04, bars: bars, fade: fade, flash: fl * 0.5 * (SET.flash ? 0.35 : 1) }, rt);
    VX.msF += performance.now() - vx0;
  }
}
// the scene pass with per-actor rim colours (the line-up lights each class from behind in its own colour)
function mimSceneGL(S, w, h, f) { return lgGLScene(S, w, h, f); }

/* ---------- the studio: front, then tilting up and over to straight down; or orbit ---------- */
function mimStudioLights() {
  const c = lgHex(LG_CLASS_BY[MIM.cls].col);
  return { key: { dir: [0.7, 0.55, 0.75], col: [1.5, 1.42, 1.32] }, rim: { dir: [-0.8, -0.25, 0.45], col: c.map(v => v * 2.2) }, sky: [0.1, 0.11, 0.13], gnd: [0.03, 0.03, 0.035],
    pts: [{ p: [-1.4, 1.2, 2.6], r: 3.6, col: c.map(v => v * 0.9) }, { p: [1.8, -1.6, 0.9], r: 4, col: [0.18, 0.22, 0.3] }, { p: [0, 0, 6], r: 0.01, col: [0, 0, 0] }, { p: [0, 0, 6], r: 0.01, col: [0, 0, 0] }],
    fog: { col: [0.02, 0.022, 0.026], d: 0.03, h: 0.0, s: 4 }, wet: 0.65, clear: [0.012, 0.013, 0.016] };
}
function mimStudioCam(rt) {
  const s = MIM.studio, a = MIM.actors[0];
  // auto: front for a beat, then the tilt to the game's view (straight down) over two seconds
  let yaw = s.yaw, pitch = s.pitch, dist = s.dist;
  const goal = s.view === 'top' ? { yaw: Math.PI, pitch: 1.48, dist: 2.7 } : s.view === 'front' ? { yaw: 0, pitch: 0.1, dist: 3.3 } : s.view === 'arms' ? { yaw: -0.72, pitch: 0.12, dist: 2.95 } : null;   // (arms: three-quarters from his gun side, closer: the armory's pick)
  if (goal && s.from) { const k = lgE.s(clamp((rt - s.tTilt) / 2.0, 0, 1)); yaw = lgLerp(s.from.yaw, goal.yaw, k); pitch = lgLerp(s.from.pitch, goal.pitch, k); dist = lgLerp(s.from.dist, goal.dist, k); if (k >= 1) { s.yaw = goal.yaw; s.pitch = goal.pitch; s.dist = goal.dist; } }
  else if (goal && !s.from) { yaw = goal.yaw; pitch = goal.pitch; dist = goal.dist; }
  s.cur = { yaw: yaw, pitch: pitch, dist: dist };
  // the free part of the stage (beside or above the panel): the lens shifts to it, and pulls back if it is short or narrow
  const F = MIM.free, asp = (MIM.w || 16) / (MIM.h || 9);
  if (F) { const need = Math.max(1 / Math.max(0.3, F.kh), (asp * F.kw) < 0.55 ? 0.55 / Math.max(0.15, asp * F.kw) : 1); dist *= clamp(need, 1, 2.6); }
  const c = [0, 0, lgLerp(0.94, 0.9, clamp(pitch / 1.5, 0, 1))], cp = Math.cos(pitch), sp = Math.sin(pitch);
  // the camera's up turns smoothly with the orbit; straight down from behind, he faces up the screen as in a run
  const up = [-Math.cos(yaw) * sp, -Math.sin(yaw) * sp, cp];
  return { eye: [c[0] + Math.cos(yaw) * cp * dist, c[1] + Math.sin(yaw) * cp * dist, c[2] + sp * dist], tgt: c, fov: 0.62, roll: 0, shake: 0, up: up, flare: 0.3, shift: F ? [F.sx, F.sy] : null };
}
function mimStudioView(v) { const s = MIM.studio; s.held = true; s.from = s.cur ? Object.assign({}, s.cur) : { yaw: s.yaw, pitch: s.pitch, dist: s.dist }; s.tTilt = MIM.rt; s.view = v; s.auto = false; if (v === 'orbit') { s.yaw = s.from.yaw; s.pitch = s.from.pitch; s.dist = s.from.dist; s.from = null; } }
function mimStudioDrag(dx, dy) { const s = MIM.studio; if (s.view !== 'orbit') { mimStudioView('orbit'); } s.yaw -= dx * 0.008; s.pitch = clamp(s.pitch + dy * 0.006, -0.15, 1.55); }
function mimStudioZoom(d) { const s = MIM.studio; s.dist = clamp(s.dist * (1 + d * 0.001), 1.2, 6); if (s.view !== 'orbit') mimStudioView('orbit'); }
// a seated clip (the stoop's idles) plays in the studio on his chair, with his mask down and his whetstone (the idle kit)
function mimStudioPlay(id) { const a = MIM.actors[0]; if (!a || !a.player) return; const seat = !!(LG_ANIM_BY[id] && LG_ANIM_BY[id].seat); if (seat !== !!a.seat) { a.seat = seat; mimStudioLoad(a); } lgPlay(a.player, id, { restart: true, fade: seat ? 0 : 0.2 }); a.player.ctx.inPlace = true; }
function mimStudioClass(cls) { MIM.cls = cls; const a = MIM.actors[0]; if (!a) return; a.cls = cls; a.acc = lgHex(LG_CLASS_BY[cls].col); mimStudioLoad(a); }
// the studio's Operator carries the loadout from the armory (the seated idles: the idle kit); the guns his hands fit to
function mimStudioLoad(a) {
  const L = typeof armsLoad === 'function' && typeof ARMS_ON !== 'undefined' && ARMS_ON ? armsLoad() : null;
  a.gp = !a.seat && L ? L.p : null; a.gs = !a.seat && L ? L.s : null;
  a.m = lgModel(a.model, a.lod, a.cls + (a.seat ? '|idle' : L ? '|' + L.p + '|' + L.s : ''));
  if (a.player) { a.player.ctx.gun = a.gp; a.player.ctx.gp = a.gp; a.player.ctx.gs = a.gs; }
  if ((a.gp || a.gs) && typeof lghWarm === 'function') lghWarm(a.gp, a.gs);
}
function mimHurt(e) {
  const now = performance.now(); coreHurt('MIMATIC', e); try { console.error(e); } catch (x) { }
  MIM.errT.push(now); while (MIM.errT.length && now - MIM.errT[0] > 10000) MIM.errT.shift();
  if (MIM.errT.length >= 5) { MIM.offUntil = now + 30000; MIM.errT.length = 0; coreRepaired('MIMATIC', 'Cinematics: resting for half a minute after errors'); }
}
