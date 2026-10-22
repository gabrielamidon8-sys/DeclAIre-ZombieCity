/* ================= MUZZLE: the muzzle flash engine =================
   Every gun has its own fire. A pistol barks a small three-pointed star; a revolver throws a round fireball and spits
   flame sideways from the gap at the cylinder; an SMG flickers fast and small; the rifles burn through a flash hider in a
   fan of prongs; the shotgun blooms in a wide cone full of sparks; the sniper's brake blasts two jets out sideways and
   kicks dust off the ground; the machine gun's flame changes shape shot to shot; the launcher roars a back-blast of
   fire and smoke behind the tube; the flamethrower keeps a blue pilot light burning at the nozzle. Each shot also
   throws sparks, leaves smoke drifting off on the wind, ejects brass (red shells from the shotgun) that bounces and lies
   in the street for a while, and lights the street around it (the lighting engine casts real shadows from it).
   Modifications tint the fire with their colour. The flames are drawn once per gun (four variants each, so no two
   shots look the same) and kept as sprites; at night they are drawn again over the lit picture so they glow. Teammates'
   shots look the same as yours. */
const MUZZLE = { spr: new Map(), smoke: [], brass: [], soft: null, made: 0, ms: 0, errT: [], offUntil: 0, shots: 0, adapt: 0 };
// len/w: the flame's size (player units); prong: star points; cage: a flash hider's fan; round: a fireball; cone: a
// shotgun's bloom; brake: side jets; gap: revolver cylinder jets; back: back-blast; light: [radius, strength, life]
// 1.9.997 (MUZZLE v2): every gun's flash is built from what a real one is made of (the slice's research notes, part B):
// the muzzle glow and the primary flash, a small bright ball at the crown; the intermediate flash, a reddish disc a few
// centimetres out; the secondary flash, the big white-yellow fireball further out that the device shapes (a birdcage's
// slots fan it into lobes with the bottom closed, a brake throws flat jets out of its side cuts, a four-tine hider strips
// nearly all of it, a bare pistol crown leaves a round ball, a cylinder gap spits two thin sheets sideways); and the
// residual sparks of unburnt powder. Sizes are the real ones in centimetres (a player unit is about 2.3 cm, and MZ_K
// draws them a little larger than life so they read from the camera), colours by the powder and the round (sodium
// yellow-orange as a rule, dull orange for the slow .45, white for the .50 AE's big clean charge, blue-white for the
// 5.7's small hot one), brightness 1–10 (the .50 AE is 10), and the flash's life in the eye.
// dev: bare | cage | brake | tines | prong | slant | cone | twin | magnum | ball | none; ball: [diameter, length] of the
// secondary fireball (cm); core: the primary ball's radius (cm); lobes: the star through a birdcage; side: [len, w] of a
// brake's side jets (cm); gap: cylinder-gap sheets; col: yw | or | dull | wy | bw; bright: 1–10; sparks; smoke: 0–2;
// life (s); light: [radius, strength, life]; back: back-blast; pilot: a pilot light; dust: kicks dust off the ground
const MZ_CM = 1 / 2.3;   // centimetres to player units
const MZ = {
  // the ARMS guns, by their muzzle device and round
  pistol: { dev: 'bare', ball: [12, 16], core: 2.2, col: 'yw', bright: 3, sparks: 3, smoke: 0.4, life: 0.035, brass: 'b' },             // 9 mm, 4–5 in
  pistol45: { dev: 'bare', ball: [11, 12], core: 2.0, col: 'dull', bright: 2, sparks: 4, smoke: 0.6, life: 0.035, brass: 'b' },          // .45 ACP: soft, dull
  pistolA: { dev: 'bare', ball: [10, 13], core: 1.9, col: 'yw', bright: 2.5, sparks: 2, smoke: 0.4, life: 0.03, brass: 'b' },            // 9×18 machine pistol
  pistol57: { dev: 'bare', ball: [10, 20], core: 1.6, col: 'bw', bright: 4, sparks: 2, smoke: 0.3, life: 0.03, brass: 'b' },             // 5.7×28: small, intense, blue-white
  revolver: { dev: 'magnum', ball: [18, 24], core: 2.4, gap: [11, 2.5], col: 'or', bright: 4, sparks: 5, smoke: 0.9, life: 0.045, brass: '' },   // .45 ACP from a revolver: a ball and the gap
  magnum: { dev: 'magnum', ball: [40, 65], core: 3.2, col: 'wy', bright: 10, sparks: 10, smoke: 0.9, life: 0.08, brass: 'b' },           // .50 AE: a huge forward ball
  magnumR: { dev: 'magnum', ball: [32, 50], core: 3.0, gap: [14, 3], col: 'or', bright: 8, sparks: 9, smoke: 0.9, life: 0.07, brass: '' },   // .44 Magnum: the ball and two bright sheets
  smg9: { dev: 'bare', ball: [8, 10], core: 1.5, col: 'yw', bright: 2, sparks: 2, smoke: 0.3, life: 0.028, brass: 'b' },                 // MP5: a long 9 mm barrel burns it all
  smg: { dev: 'slant', ball: [9, 12], core: 1.7, side: [12, 4], col: 'or', bright: 2.5, sparks: 2, smoke: 0.5, life: 0.03, brass: 'b' },   // PP-19's slant brake: a puff to the right
  rifle: { dev: 'cage', ball: [14, 26], core: 2.2, lobes: 5, col: 'yw', bright: 5, sparks: 3, smoke: 0.4, life: 0.04, brass: 'b' },         // 5.56, 14.5 in, A2 birdcage
  saw: { dev: 'cage', ball: [12, 22], core: 2.0, lobes: 5, col: 'yw', bright: 5, sparks: 4, smoke: 0.7, life: 0.04, brass: 'b' },          // M249, 18 in: smaller a shot, a strobe in bursts
  ak: { dev: 'brake', ball: [9, 10], core: 2.0, side: [25, 10], col: 'or', bright: 4, sparks: 4, smoke: 0.9, life: 0.04, brass: '' },       // AK-74's two-chamber brake: flat side jets
  battle: { dev: 'prong', ball: [24, 48], core: 2.6, lobes: 3, col: 'yw', bright: 6, sparks: 4, smoke: 0.7, life: 0.055, brass: '' },      // 7.62×51, 16 in, an open hider
  vortex: { dev: 'tines', ball: [7, 9], core: 2.0, lobes: 4, col: 'or', bright: 2, sparks: 3, smoke: 0.6, life: 0.035, brass: '' },        // Mk 14's four-tine hider strips it
  prong: { dev: 'prong', ball: [13, 24], core: 2.1, lobes: 3, col: 'yw', bright: 5, sparks: 3, smoke: 0.4, life: 0.04, brass: '' },        // AUG's three-prong hider
  shotgun: { dev: 'cone', ball: [30, 50], core: 3.0, col: 'or', bright: 6, sparks: 11, smoke: 1.4, life: 0.06, brass: 's' },               // 12 gauge, 20 in: a ragged cone
  coach: { dev: 'twin', ball: [50, 65], core: 3.4, col: 'or', bright: 8, sparks: 14, smoke: 2.0, life: 0.08, brass: '' },                 // the sawed-off: a fireball
  // the old frames (the 250 that rest while the guns are rebuilt)
  burst: { dev: 'cage', ball: [13, 22], core: 2.0, lobes: 3, col: 'yw', bright: 4.5, sparks: 3, smoke: 0.4, life: 0.04, brass: 'b' },
  sniper: { dev: 'brake', ball: [20, 30], core: 2.6, side: [38, 12], col: 'yw', bright: 7, sparks: 4, smoke: 1.1, dust: true, life: 0.06, brass: 'b' },
  lmg: { dev: 'cage', ball: [14, 26], core: 2.2, lobes: 5, col: 'yw', bright: 5.5, sparks: 4, smoke: 0.7, life: 0.04, brass: 'b' },
  launcher: { dev: 'ball', ball: [36, 36], core: 3.0, back: true, col: 'or', bright: 6, sparks: 6, smoke: 2.2, life: 0.09, brass: '' },
  flamer: { pilot: true, sparks: 0, smoke: 0, brass: '', light: [150, 0.9, 0.09], life: 0.05 }
};
for (const k in MZ) { const P = MZ[k]; if (!P.light) P.light = [Math.round(180 + 20 * (P.bright || 3)), +(0.7 + 0.06 * (P.bright || 3)).toFixed(2), +(0.05 + 0.008 * (P.bright || 3)).toFixed(3)]; P.len = P.ball ? P.ball[1] * MZ_CM : 10; P.w = P.ball ? P.ball[0] * MZ_CM : 8; }
const MZ_PX = 3;     // sprite pixels per player unit
const MZ_K = 1.3;   // flames are drawn a little larger than life, so they read at the camera's distance
function muzzleOn() { return !(MUZZLE.offUntil && performance.now() < MUZZLE.offUntil); }
// a mod's colour as numbers (the standard mod keeps the plain warm fire)
function muzzleTint(w) {
  if (!w || !w.M || w.M.key === 'standard' || w.M.key === 'heavy' || w.M.key === 'golden') return null;
  const n = parseInt(String(w.color || '#ffd678').slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255];
}
// the sprite's box round the muzzle (the muzzle at ox from the left edge, the bore along +x)
function muzzleBox(P) {
  const side = P.side ? P.side[0] * MZ_CM : 0, dia = P.w, len = P.len;
  const bw = Math.max(len * 1.35 + dia * 0.5, side * 0.6 + len) + 8, bh = Math.max(dia * 1.5, side * 2.2, len * 0.9) + 6;
  return { bw: bw, bh: bh, ox: P.dev === 'brake' || P.dev === 'slant' ? Math.max(6, side * 0.3) : dia * 0.3 + 4 };
}
// the flame's colours: the white-hot core, the yellow body, the rim (by the round), tinted by a mod
function muzzleCols(P, t) {
  const mix = (a, b, k) => Math.round(a * (1 - k) + b * k);
  let core = [255, 250, 232], mid = [255, 206, 112], out = [255, 128, 36];
  if (P.col === 'or') { mid = [255, 178, 70]; out = [255, 96, 24]; }
  else if (P.col === 'dull') { core = [255, 236, 200]; mid = [240, 150, 60]; out = [200, 80, 24]; }
  else if (P.col === 'wy') { core = [255, 255, 250]; mid = [255, 236, 170]; out = [255, 160, 60]; }
  else if (P.col === 'bw') { core = [245, 250, 255]; mid = [190, 215, 255]; out = [120, 120, 255]; }
  if (t) { mid = [mix(mid[0], t[0], 0.55), mix(mid[1], t[1], 0.55), mix(mid[2], t[2], 0.55)]; out = [mix(out[0], t[0], 0.75), mix(out[1], t[1], 0.75), mix(out[2], t[2], 0.75)]; }
  return { core: core, mid: mid, out: out };
}
// the flame of gun fk, variant v (0–3), layer 'a' (the sharp first frame: the primary ball, the star or the jets) or
// 'b' (the fireball that swells and fades after it), tinted by tint: drawn once and kept
function muzzleSprite(fk, v, tint, layer) {
  layer = layer || 'a';
  const key = fk + v + layer + (tint ? ':' + tint.join(',') : '');
  let c = MUZZLE.spr.get(key); if (c) { MUZZLE.spr.delete(key); MUZZLE.spr.set(key, c); return c; }
  const P = MZ[fk] || MZ.pistol; if (P.pilot) return null;
  const B = muzzleBox(P);
  c = document.createElement('canvas'); c.width = Math.ceil(B.bw * MZ_PX); c.height = Math.ceil(B.bh * MZ_PX);
  const g = c.getContext('2d'); if (!g) return null;
  const R = Z.mulberry32(0x6d2b79f5 ^ (v * 2654435761) ^ (fk.charCodeAt(0) << 8) ^ fk.length ^ (layer === 'b' ? 0x5bd1e995 : 0));
  g.setTransform(MZ_PX, 0, 0, MZ_PX, B.ox * MZ_PX, B.bh / 2 * MZ_PX);
  g.globalCompositeOperation = 'lighter';
  const C = muzzleCols(P, tint), css = (c3, a) => 'rgba(' + c3[0] + ',' + c3[1] + ',' + c3[2] + ',' + a + ')';
  // a tapered tongue of flame from (x0, 0) at angle a, length l, half-width hw
  const tongue1 = (a, l, hw, k, b, x0) => {
    x0 = x0 || 0; const ca = Math.cos(a), sa = Math.sin(a), gr = g.createLinearGradient(x0, 0, x0 + ca * l, sa * l), h0 = hw * (b == null ? 1 : b);
    gr.addColorStop(0, css(C.core, 0.95 * k)); gr.addColorStop(0.3, css(C.mid, 0.85 * k)); gr.addColorStop(0.75, css(C.out, 0.5 * k)); gr.addColorStop(1, css(C.out, 0));
    g.fillStyle = gr; g.beginPath(); g.moveTo(x0 - sa * h0, ca * h0); g.quadraticCurveTo(x0 + ca * l * 0.45 - sa * hw * 1.1, sa * l * 0.45 + ca * hw * 1.1, x0 + ca * l, sa * l); g.quadraticCurveTo(x0 + ca * l * 0.45 + sa * hw * 1.1, sa * l * 0.45 - ca * hw * 1.1, x0 + sa * h0, -ca * h0); g.closePath(); g.fill();
  };
  // (a tongue is gas, not paper: a wide faint one, a middle one and the bright core, so its edge is soft)
  const tongue = (a, l, hw, k, b, x0) => { tongue1(a, l * 0.92, hw * 1.9, k * 0.22, b, x0); tongue1(a, l * 0.97, hw * 1.35, k * 0.4, b, x0); tongue1(a, l, hw, k * 0.85, b, x0); };
  // a soft ball of fire (rx along the bore, ry across), ragged at its edge when rag > 0
  const blob = (x, y, rx, ry, k, rag) => {
    const r = Math.max(rx, ry); g.save(); g.translate(x, y); g.scale(rx / r, ry / r);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, css(C.core, 0.95 * k)); gr.addColorStop(0.35, css(C.mid, 0.8 * k)); gr.addColorStop(0.75, css(C.out, 0.35 * k)); gr.addColorStop(1, css(C.out, 0));
    g.fillStyle = gr; g.beginPath();
    if (rag) { const n = 14; for (let i = 0; i <= n; i++) { const a = i / n * TAU, rr = r * (1 - rag * 0.5 + rag * R()); if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); }
    else g.arc(0, 0, r, 0, TAU);
    g.fill(); g.restore();
  };
  // the reddish disc of the intermediate flash: a thin ellipse across the bore a few centimetres out
  const disc = (x, ry, k) => { g.fillStyle = css([255, 90, 40], 0.5 * k); g.beginPath(); g.ellipse(x, 0, ry * 0.22, ry, 0, 0, TAU); g.fill(); };
  // sparks: dots of unburnt powder thrown forward
  const sparks = (n, spread, dmax, k) => { g.fillStyle = css([255, 240, 200], 0.9 * k); for (let i = 0; i < n; i++) { const a = (R() - 0.5) * spread, d = dmax * (0.3 + R() * 0.7), s = 0.3 + R() * 0.5; g.fillRect(Math.cos(a) * d, Math.sin(a) * d, s, s); } };
  const dia = P.w, len = P.len, core = (P.core || 2) * MZ_CM, br = clamp((P.bright || 3) / 10, 0.15, 1), ka = 0.6 + 0.4 * br;
  if (layer === 'a') {
    // the first frame: the primary ball at the crown, then the device's own shape
    blob(core * 0.6, 0, core * 1.3, core * 1.1, 1);
    disc(core * 2.2 + 1.2, dia * 0.22 + 0.6, 0.8);
    if (P.dev === 'cage') {
      // the birdcage: the gas through its slots: a forward lobe and the side lobes, shorter toward the sides
      const n = P.lobes || 5;
      for (let i = 0; i < n; i++) { const u = n === 1 ? 0 : i / (n - 1) - 0.5, a = u * 1.5 + (R() - 0.5) * 0.1, l = len * (1 - Math.abs(u) * 0.55) * (0.8 + R() * 0.3); tongue(a, l, dia * 0.1 + 0.4, 0.9 * ka, 0.8, core); }
    } else if (P.dev === 'prong') {
      // an open three-prong hider: three lobes out between the prongs (two to the sides, one forward and down)
      for (const a of [-0.8, 0, 0.8]) tongue(a + (R() - 0.5) * 0.12, len * (a ? 0.42 : 1) * (0.85 + R() * 0.3), dia * 0.11 + 0.4, 0.9 * ka, 0.8, core);
    } else if (P.dev === 'tines') {
      // four tines: thin strips of flame between them and little else
      for (let i = 0; i < 4; i++) { const a = (i / 4 - 0.375) * 1.3; tongue(a, len * 0.9 * (0.7 + R() * 0.4), 0.45, 0.55 * ka, 0.8, core); }
    } else if (P.dev === 'brake') {
      // a brake: two flat jets out of the side cuts (a touch back), a small forward puff
      const sl = P.side[0] * MZ_CM, sw = P.side[1] * MZ_CM;
      for (const sd of [-1, 1]) { tongue(sd * (Math.PI / 2 + 0.18 + R() * 0.12), sl * (0.85 + R() * 0.3), sw * 0.32, 0.95 * ka, 1, core * 0.8); blob(core * 0.5, sd * sw * 0.5, sw * 0.45, sw * 0.35, 0.6); }
      tongue(0, len * 0.9, dia * 0.16, 0.7 * ka, 0.9, core);
    } else if (P.dev === 'slant') {
      // a slant brake: the gas vented up and to the right, a small puff forward
      const sl = P.side[0] * MZ_CM, sw = P.side[1] * MZ_CM;
      tongue(-(Math.PI / 2 - 0.5) + (R() - 0.5) * 0.1, sl * (0.8 + R() * 0.3), sw * 0.3, 0.85 * ka, 1, core * 0.6);
      tongue(0, len * 0.85, dia * 0.16, 0.75 * ka, 0.9, core);
    } else if (P.dev === 'cone' || P.dev === 'twin') {
      // a shotgun: fingers of fire in a wide ragged cone, full of unburnt powder
      const nf = P.dev === 'twin' ? 9 : 7, sp = P.dev === 'twin' ? 1.2 : 0.95;
      for (let i = 0; i < nf; i++) { const a = (R() - 0.5) * sp; tongue(a, len * (0.5 + R() * 0.55), dia * (0.05 + R() * 0.05) + 0.3, 0.75 * ka, 0.8, core); }
      sparks(P.dev === 'twin' ? 22 : 16, sp, len * 1.3, 0.9);
    } else {
      // a bare crown (a pistol, the machine pistol, the magnum, the MP5): the gas rolls forward off the crown, the first
      // jet a little the longer, with a hint of the crown's upward spill
      tongue((R() - 0.5) * 0.1, len * 0.9 * (0.9 + R() * 0.2), dia * 0.16 + 0.3, 0.9 * ka, 0.9, core);
      for (const sd of [-1, 1]) tongue(sd * (0.55 + R() * 0.3), len * 0.4 * (0.7 + R() * 0.5), dia * 0.1 + 0.3, 0.6 * ka, 0.8, core);
    }
    if (P.gap) {
      // the cylinder gap: two thin bright sheets straight out sideways, well behind the muzzle (drawn in muzzleDraw at
      // the cylinder; here only a hint so the sprite's own light reads)
    }
    sparks(Math.round((P.sparks || 3) * 1.2), P.dev === 'cone' || P.dev === 'twin' ? 1.0 : 0.6, len * 1.1, 0.7);
  } else {
    // the fireball that follows: the secondary flash, biggest furthest out, ragged, with the core's afterglow
    const cx = P.dev === 'brake' || P.dev === 'tines' ? len * 0.45 : len * 0.55, rx = len * 0.5, ry = dia * 0.5;
    blob(cx, 0, rx, ry, 0.85 * ka, 0.35);
    for (let i = 0; i < 4; i++) { const a = (R() - 0.5) * 1.4, d = R() * ry * 0.6; blob(cx + Math.cos(a) * d * 1.5, Math.sin(a) * d, rx * (0.35 + R() * 0.25), ry * (0.35 + R() * 0.25), 0.5 * ka, 0.5); }
    blob(core, 0, core * 1.6, core * 1.3, 0.6);
    if (P.dev === 'brake') { const sl = P.side[0] * MZ_CM, sw = P.side[1] * MZ_CM; for (const sd of [-1, 1]) blob(core, sd * sl * 0.55, sw * 0.5, sl * 0.4, 0.5 * ka, 0.4); }
    sparks(Math.round((P.sparks || 3) * 0.8), 0.9, len * 1.6, 0.6);
  }
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over';
  MUZZLE.spr.set(key, c); MUZZLE.made++;
  while (MUZZLE.spr.size > 128) MUZZLE.spr.delete(MUZZLE.spr.keys().next().value);
  return c;
}
// a shot: the light, sparks, smoke and brass (o: the shooter, for the flame's variant)
function muzzleShot(o, w, a, x, y) {
  const fk = (w && w.F && w.F.key) || 'pistol', P = MZ[fk] || MZ.pistol, tint = muzzleTint(w);
  if (o) { o.mfv = (Math.random() * 4) | 0; o.mfk = fk; o.mft = tint; o.mfl = P.life || 0.05; }
  const L = P.light, lc = fk === 'flamer' ? '255,150,60' : tint ? Math.round(255 * 0.6 + tint[0] * 0.4) + ',' + Math.round(214 * 0.6 + tint[1] * 0.4) + ',' + Math.round(140 * 0.6 + tint[2] * 0.4) : '255,214,140';
  luxFlash(x, y, L[0] * (0.55 + 0.45 * SCL), lc, L[1] * (SET.flash ? 0.55 : 1), L[2], { shade: true });
  // 1.9.993: the rebuilt guns throw real brass through PHYSICS, from the ejection port (behind the muzzle, over the hand)
  if (w && w.arms && typeof physEject === 'function' && !(w.arms.eject && w.arms.eject.onPump)) { const pl = (GUN_LEN[fk] || 20) * PK * 0.8; physEject(w, x - Math.cos(a) * pl, y - Math.sin(a) * pl, a); }   // (1.9.997: a pump gun's hull leaves on the pump stroke instead)
  if (!muzzleOn()) return;
  MUZZLE.shots++;
  const ca = Math.cos(a), sa = Math.sin(a), q = Q.burst || 0.6;
  // sparks, forward
  const ns = Math.round(P.sparks * q);
  for (let i = 0; i < ns; i++) {
    if (G.parts.length >= Q.parts) break;
    const wide = P.dev === 'cone' || P.dev === 'twin', aa = a + (Math.random() - 0.5) * (wide ? 0.9 : 0.5), sp = (180 + Math.random() * 320) * (0.7 + 0.06 * (P.bright || 3));
    G.parts.push({ x: x, y: y, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, life: 0.06 + Math.random() * (0.08 + 0.012 * (P.bright || 3)), max: 0.18, c: Math.random() < 0.5 ? '#fff1b8' : (P.col === 'bw' ? '#bcd6ff' : '#ffb347'), s: 1.2 + Math.random() * 1.4, glow: true });
  }
  if (P.dust && typeof ring === 'function') ring(x, y, 4 * PK, 34 * PK, 0.3, '196,186,166', 2);
  // 1.9.997: a shotgun's wad tumbles out behind the pellets and falls within twenty metres
  if ((P.dev === 'cone' || P.dev === 'twin') && G.parts.length < Q.parts) { const ws = (170 + Math.random() * 60) * PK; G.parts.push({ x: x, y: y, vx: ca * ws + (Math.random() - 0.5) * 30, vy: sa * ws + (Math.random() - 0.5) * 30, life: 0.22 + Math.random() * 0.08, max: 0.3, c: '#cfc4a6', s: 2.2 }); }
  // smoke: a puff (or the launcher's back-blast cloud behind the shooter), drifting off on the wind
  const mk = [0.45, 1, 1.5, 2][(TUNE.MUZZLE || 0) + 1] * [0.4, 0.7, 1][clamp(MUZZLE.adapt | 0, -2, 0) + 2], sm = MUZZLE.smoke, wx = (WX.wx || 0) * 22, wy = (WX.wy || 0) * 22, cap = Math.round((PERF.tier >= 2 ? 90 : 40) * mk);
  const puffs = Math.round(P.smoke * (Q.lod >= 2 ? 0.5 : 1) * 1.6 * Math.min(1.4, mk) + Math.random() * 0.6);
  for (let i = 0; i < puffs && sm.length < cap; i++) {
    const back = P.back && i % 2 === 0, d = back ? -(26 + Math.random() * 18) * PK : (4 + Math.random() * 10) * PK, sp = (back ? -60 : 30) * (0.5 + Math.random());
    sm.push({ x: x + ca * d, y: y + sa * d, vx: ca * sp + (Math.random() - 0.5) * 20 + wx, vy: sa * sp + (Math.random() - 0.5) * 20 + wy, r: (4 + Math.random() * 4) * PK * (P.smoke > 1 ? 1.5 : 1), g: (5 + Math.random() * 6) * PK, life: 0.8 + Math.random() * 0.9 * P.smoke, max: 0, a: 0.16 + 0.1 * Math.min(1, P.smoke), back: back });
    sm[sm.length - 1].max = sm[sm.length - 1].life;
  }
  if (P.back) luxFlash(x - ca * 34 * PK, y - sa * 34 * PK, 200 * (0.55 + 0.45 * SCL), '255,170,80', 0.9, 0.12, { shade: true });
  // brass, out to the right of the gun, spinning; it bounces and lies in the street
  if (P.brass && Q.lod < 3) {
    const B = MUZZLE.brass, bcap = Math.round((PERF.tier >= 2 ? 70 : 30) * mk), ra = a + Math.PI / 2 + (Math.random() - 0.5) * 0.5 - 0.25, sp = (110 + Math.random() * 90) * PK;
    const back = 12 * PK; if (B.length >= bcap) B.shift();
    B.push({ x: x - ca * back * 1.6, y: y - sa * back * 1.6, vx: Math.cos(ra) * sp, vy: Math.sin(ra) * sp, h: 6 * PK, vh: 70 * PK, rot: a, vr: (Math.random() - 0.5) * 40, k: P.brass, t: 0, bounced: 0 });
  }
}
function muzzleTick(dt) {
  const sm = MUZZLE.smoke;
  for (const s of sm) { s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; const k = Math.exp(-1.8 * dt); s.vx *= k; s.vy *= k; s.r += s.g * dt; }
  if (sm.length && sm[0].life <= 0) MUZZLE.smoke = sm.filter(s => s.life > 0);
  const B = MUZZLE.brass;
  for (const b of B) {
    b.t += dt;
    if (b.h > 0 || b.vh > 0) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt; b.vh -= 520 * PK * dt; b.h += b.vh * dt;
      if (b.h <= 0) { b.h = 0; if (b.bounced < 2 && b.vh < -30 * PK) { b.vh = -b.vh * 0.35; b.vx *= 0.5; b.vy *= 0.5; b.vr *= 0.5; b.bounced++; if (b.bounced === 1 && SET.steps && typeof SFX.tink === 'function' && Math.random() < 0.3) SFX.tink(); } else { b.vh = 0; b.vx = b.vy = 0; b.vr = 0; } }
      if (pointInRect(b.x, b.y)) { b.vx = -b.vx * 0.3; b.vy = -b.vy * 0.3; }
    }
  }
  if (B.length && B[0].t > 9) MUZZLE.brass = B.filter(b => b.t < 9);
}
// the flame in the shooter's own turned frame (drawPlayer calls this: the gun points along +x, the muzzle at mx)
function muzzleDraw(g, p, fk, gl, k) {
  const mx = 8 + gl, P = MZ[fk] || MZ.pistol;
  if (P.pilot) {
    // the flamethrower's pilot light: a small blue flame with an orange tip, flickering
    const f = 0.8 + Math.random() * 0.4; g.save(); g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.85 * k; g.fillStyle = '#5aa8ff'; g.beginPath(); g.ellipse(mx + 1.5, 0, 2.6 * f, 1.4, 0, 0, TAU); g.fill();
    g.globalAlpha = 0.6 * k; g.fillStyle = '#ffb347'; g.beginPath(); g.ellipse(mx + 3.5 * f, 0, 1.6 * f, 0.9, 0, 0, TAU); g.fill();
    g.restore(); return;
  }
  if (!(p.flashT > 0)) return;
  // the flash's own life (a pistol's is a frame, a magnum's lingers), as a fraction left; two layers: the sharp first
  // frame (the primary ball, the star or the jets) going out fast, and the fireball swelling and fading after it
  const life = Math.min(0.05, p.mfl || P.life || 0.05), fl = p.mfU != null ? 1 - p.mfU : clamp((p.flashT - (0.05 - life)) / life, 0, 1); if (fl <= 0) return;   // (mfU: a held point in its life, for the evidence pictures)
  const u = 1 - fl, v = p.mfv == null ? (Math.floor(G.time * 60) & 3) : p.mfv, tint = p.mfk === fk ? p.mft : muzzleTint(p.weapon);
  const B = muzzleBox(P), dim = SET.flash ? 0.6 : 1, sc = SET.flash ? 0.8 : 1;
  g.save(); g.translate(mx, 0); g.globalCompositeOperation = 'lighter';
  const sprA = muzzleSprite(fk, v, tint, 'a'), ka = Math.max(0, 1 - u * 1.7);
  if (sprA && ka > 0) { const s = (1 + 0.15 * u) * MZ_K * sc; g.save(); g.scale(s, s); g.globalAlpha = ka * k * dim; g.drawImage(sprA, -B.ox, -B.bh / 2, B.bw, B.bh); g.restore(); }
  const sprB = muzzleSprite(fk, v, tint, 'b'), kb = Math.sin(Math.min(1, u * 1.15) * Math.PI);
  if (sprB && kb > 0.02) { const s = (0.75 + 0.55 * u) * MZ_K * sc; g.save(); g.scale(s, s); g.globalAlpha = kb * 0.9 * k * dim; g.drawImage(sprB, -B.ox, -B.bh / 2, B.bw, B.bh); g.restore(); }
  // a revolver spits two thin sheets of fire straight out of the cylinder gap, either side, a hand's length behind the muzzle
  if (P.gap) {
    const cx = -gl * 0.62, gw = P.gap[0] * MZ_CM * 0.5 * MZ_K, gt = P.gap[1] * MZ_CM * 0.5 * MZ_K, C = muzzleCols(P, tint);
    g.globalAlpha = 0.9 * ka * k * dim;
    for (const sd of [-1, 1]) { const gr = g.createLinearGradient(cx, sd * 1.5, cx, sd * (1.5 + gw * 2)); gr.addColorStop(0, 'rgba(' + C.core.join(',') + ',0.95)'); gr.addColorStop(0.4, 'rgba(' + C.mid.join(',') + ',0.7)'); gr.addColorStop(1, 'rgba(' + C.out.join(',') + ',0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(cx - gt, sd * 1.5); g.lineTo(cx + gt, sd * 1.5); g.lineTo(cx + gt * 0.4, sd * (1.5 + gw * 2)); g.lineTo(cx - gt * 0.4, sd * (1.5 + gw * 2)); g.closePath(); g.fill(); }
  }
  // the launcher's back-blast, out of the rear of the tube
  if (P.back) {
    const s = MZ_K * sc; g.save(); g.scale(s, s);
    const bx = -(gl + 14) / s, gr = g.createRadialGradient(bx, 0, 0, bx, 0, 22);
    gr.addColorStop(0, 'rgba(255,240,200,' + (0.9 * fl) + ')'); gr.addColorStop(0.4, 'rgba(255,150,60,' + (0.55 * fl) + ')'); gr.addColorStop(1, 'rgba(255,90,30,0)');
    g.globalAlpha = k; g.fillStyle = gr; g.beginPath(); g.moveTo(bx + 8, 0); g.arc(bx + 8, 0, 26, Math.PI - 0.55, Math.PI + 0.55); g.closePath(); g.fill(); g.restore();
  }
  g.restore();
}
// smoke and brass in the street (drawn with the other things on the ground, so the lighting falls on them)
function muzzleWorld(vis, which) {
  const t0 = performance.now();
  try {
    if (which === 'brass' && MUZZLE.brass.length) {
      for (const b of MUZZLE.brass) {
        if (!vis(b.x, b.y, 10)) continue;
        const a = b.t > 6 ? Math.max(0, 1 - (b.t - 6) / 3) : 1, len = (b.k === 's' ? 3.2 : 2.2) * PK, wd = (b.k === 's' ? 1.5 : 0.95) * PK, lift = b.h;
        ctx.save(); ctx.translate(b.x, b.y - lift); ctx.rotate(b.rot);
        if (lift > 0.5) { ctx.globalAlpha = 0.25 * a; ctx.fillStyle = '#000'; ctx.fillRect(-len / 2, -wd / 2 + lift, len, wd); }
        ctx.globalAlpha = a;
        if (b.k === 's') { ctx.fillStyle = '#a3262a'; ctx.fillRect(-len / 2, -wd / 2, len * 0.72, wd); ctx.fillStyle = '#c8a24a'; ctx.fillRect(len * 0.22, -wd / 2, len * 0.28, wd); }
        else { ctx.fillStyle = '#b8892e'; ctx.fillRect(-len / 2, -wd / 2, len, wd); ctx.fillStyle = '#f1d27a'; ctx.fillRect(-len / 2, -wd / 2, len, wd * 0.35); }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    if (which === 'smoke' && MUZZLE.smoke.length) {
      const soft = muzzleSoft(), day = CORE.frame.day == null ? 1 : CORE.frame.day, tone = Math.round(150 + 60 * day);
      ctx.fillStyle = 'rgb(' + tone + ',' + tone + ',' + (tone + 6) + ')';
      for (const s of MUZZLE.smoke) {
        if (!vis(s.x, s.y, s.r * 2)) continue;
        const f = s.life / s.max, a = s.a * Math.min(1, (1 - f) * 6) * f;
        if (a < 0.01) continue;
        ctx.globalAlpha = a * (s.back ? 1.3 : 1); ctx.drawImage(soft, s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      }
      ctx.globalAlpha = 1;
    }
  } catch (e) { muzzleHurt(e); ctx.globalAlpha = 1; }
  const ms = performance.now() - t0; MUZZLE.ms = MUZZLE.ms * 0.9 + ms * 0.1; coreCost('MUZZLE', ms);
}
// a soft round puff (white; tinted by globalAlpha over a grey fill... drawn grey once)
function muzzleSoft() {
  if (MUZZLE.soft) return MUZZLE.soft;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(206,206,212,1)'); gr.addColorStop(0.5, 'rgba(196,196,204,0.55)'); gr.addColorStop(1, 'rgba(190,190,198,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); MUZZLE.soft = c; return c;
}
// at night: the flames again, added over the lit picture so they glow (a = how dark it is)
function muzzleEmissive(a) {
  const each = [];
  if (G.p && !G.p.down && G.mode !== 'title') each.push(G.p);
  if (NET.started) for (const o of NET.others.values()) if (o && !o.down) each.push(o);
  if (NET.started && NET.role === 'host') for (const q of NET.peers.values()) if (q.p && !q.p.down && each.indexOf(q.p) < 0) each.push(q.p);
  for (const p of each) {
    const fk = (p.weapon && p.weapon.F && p.weapon.F.key) || 'pistol', P = MZ[fk] || MZ.pistol;
    if (!(p.flashT > 0) && !P.pilot) continue;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(PK, PK); ctx.rotate(p.aim || 0);
    try { muzzleDraw(ctx, p, fk, GUN_LEN[fk] || 20, Math.min(0.8, a)); } catch (e) { muzzleHurt(e); }
    ctx.restore();
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function muzzleReset() { MUZZLE.smoke.length = 0; MUZZLE.brass.length = 0; }
function muzzleHurt(e) {
  const now = performance.now(); coreHurt('MUZZLE', e); try { console.error(e); } catch (x) { }
  MUZZLE.errT.push(now); while (MUZZLE.errT.length && now - MUZZLE.errT[0] > 10000) MUZZLE.errT.shift();
  if (MUZZLE.errT.length >= 4) { MUZZLE.offUntil = now + 60000; MUZZLE.errT.length = 0; MUZZLE.spr.clear(); muzzleReset(); coreRepaired('MUZZLE', 'Muzzle flashes paused for a minute after errors'); }
}
coreAdd({
  name: 'MUZZLE', kind: 'render', does: 'Muzzle flash engine: a different fire for every gun (star, fireball, flash-hider fan, shotgun bloom, sniper brake jets, launcher back-blast, flamethrower pilot light), tinted by the modification, with sparks, drifting smoke, ejected brass and shells, and a light that casts shadows.',
  state: () => muzzleOn() ? (MUZZLE.shots ? 'on' : 'idle') : 'paused', level: () => MUZZLE.spr.size + ' flames drawn, ' + MUZZLE.smoke.length + ' puffs, ' + MUZZLE.brass.length + ' casings',
  repair: () => { MUZZLE.spr.clear(); MUZZLE.offUntil = 0; MUZZLE.errT.length = 0; muzzleReset(); },
  on: { run: () => muzzleReset(), lowMemory: () => MUZZLE.spr.clear() }
});
// CORE v3: a ladder of its own (full, about two thirds, under half the smoke and brass), stepped by CORE when the
// frame runs late and climbed back when there is room; a check that keeps its lists finite and bounded
coreMeta('MUZZLE', { ver: 2, climb: true, provides: ['muzzleFlash', 'smoke', 'brass'],
  lv: () => MUZZLE.adapt + 2, adaptGet: () => MUZZLE.adapt, loadNow: () => MUZZLE.smoke.length + MUZZLE.brass.length, loadName: 'puffs and casings',
  canTrim: () => MUZZLE.adapt > -2, trim: () => { if (MUZZLE.adapt <= -2) return false; MUZZLE.adapt--; const cap = MUZZLE.adapt < -1 ? 30 : 60; if (MUZZLE.smoke.length > cap) MUZZLE.smoke.splice(0, MUZZLE.smoke.length - cap); return true; },
  boost: () => { if (MUZZLE.adapt >= 0) return false; MUZZLE.adapt++; return true; },
  check: () => MUZZLE.smoke.length > 400 || MUZZLE.brass.length > 400 ? 'its smoke or brass piled up' : MUZZLE.smoke.some(p => !(p.x === p.x && p.y === p.y)) ? 'a puff of smoke lost its place' : '',
  reset: () => { muzzleReset(); MUZZLE.spr.clear(); MUZZLE.offUntil = 0; MUZZLE.errT.length = 0; } });
