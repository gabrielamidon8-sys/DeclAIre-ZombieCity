/* ================= GARAGE: the vehicle engine =================
   Everything with wheels (and a few things with wings) that was left in the streets when the city fell.
   - Twenty-four kinds of vehicle, each with its own size, shape and height: hatchbacks, sedans, wagons, coupes, SUVs,
     pickups with something in the bed, vans, minivans, taxis, police cruisers, ambulances, fire trucks, box trucks,
     city buses, school buses, semis with box or tank trailers, garbage trucks, military Humvees and APCs, motorcycles,
     camper vans and an ice cream truck. Which ones turn up depends on the district (pickups and campers in the desert,
     Humvees at the riot checkpoints, buses downtown), and every one faces the way traffic flowed.
   - Each has a livery and a state: parked, burned out to a rusting shell, or rolled onto its roof. A few still have
     a working battery: headlights left on, hazards blinking, the light bar of a police car or an ambulance turning.
     Those are real lights for the lighting engine (the headlights are beams that cast shadows), and their bulbs glow.
   - The glass (windscreens, rear windows) is handed to the reflection engine, so it catches the sky and the lamps.
   - Rarely, the wreck of an aircraft: an airliner broken in three across a whole block with its wing torn off and
     fires burning in the debris, a light plane nosed into a yard, or a helicopter on its side with its rotor bent,
     police, news or military. The pieces are solid, so they are cover; their shadows move with the sun.
   Everything here is generated from the block's seed, so every player in co-op sees the same cars in the same places. */
const VPAL = ['#7b2f2b', '#2f4f6b', '#6b6b6b', '#c9c3b5', '#2d3a2c', '#8a6a2a', '#22262b', '#5a3a5e', '#9aa0a6', '#1d2f4a', '#6e1f1c', '#d8d4cc', '#3e5a3a', '#b86a2a', '#26323a', '#4a4f57'];
// L, W: length and width in the block's drawing units (13.33 to the metre) · h: height in metres
// g: glass along the length, as [from, to] fractions of L from the middle (front is +0.5) · r: corner radius
// 1.9.998: every size is the real vehicle's: a Golf, a Camry, a Passat wagon, a Mustang, an SUV between a RAV4 and an
// Explorer, an F-150 crew cab, a high-roof Transit, an Odyssey, a Charger interceptor, a Type III ambulance, a pumper, a
// 28-foot box truck, a 40-foot bus, a Type C school bus, a tractor with a 53-foot trailer, a rear loader, a Humvee, a
// Stryker, a Class C camper and a step-van ice cream truck (cars were up to a third too wide before)
const VEH = {
  hatch: { L: 57, W: 24, h: 1.46, r: 7, g: [[0.06, 0.24], [-0.43, -0.32]] },
  sedan: { L: 65, W: 24.5, h: 1.45, r: 6, g: [[0.08, 0.26], [-0.36, -0.23]] },
  wagon: { L: 64, W: 24.4, h: 1.5, r: 6, g: [[0.1, 0.26], [-0.48, -0.43]] },
  coupe: { L: 64, W: 25.6, h: 1.38, r: 8, g: [[0.0, 0.2], [-0.32, -0.2]] },
  suv: { L: 65, W: 25.7, h: 1.75, r: 5, g: [[0.14, 0.28], [-0.48, -0.42]] },
  pickup: { L: 78.5, W: 27, h: 1.96, r: 5, g: [[0.22, 0.33], [0.02, 0.05]] },
  van: { L: 80, W: 27.5, h: 2.5, r: 4, g: [[0.36, 0.45]] },
  minivan: { L: 69.5, W: 26.5, h: 1.74, r: 7, g: [[0.2, 0.34], [-0.5, -0.44]] },
  taxi: { L: 65, W: 24.5, h: 1.45, r: 6, g: [[0.08, 0.26], [-0.36, -0.23]] },
  police: { L: 68, W: 25.3, h: 1.48, r: 6, g: [[0.08, 0.26], [-0.36, -0.23]] },
  ambulance: { L: 93, W: 32, h: 2.9, r: 4, g: [[0.37, 0.46]] },
  fire: { L: 140, W: 33.3, h: 3.1, r: 4, g: [[0.42, 0.48]] },
  box: { L: 113, W: 33.3, h: 3.5, r: 3, g: [[0.4, 0.47]] },
  bus: { L: 167, W: 34.5, h: 3.2, r: 6, g: [[0.46, 0.5]] },
  school: { L: 155, W: 32.5, h: 3.2, r: 5, g: [[0.38, 0.44]] },
  semi: { L: 287, W: 34.5, h: 4.1, r: 3, g: [[0.43, 0.47]] },
  garbage: { L: 133, W: 33.3, h: 3.6, r: 4, g: [[0.4, 0.47]] },
  humvee: { L: 61, W: 28.8, h: 1.83, r: 4, g: [[0.18, 0.27]] },
  apc: { L: 93, W: 36.3, h: 2.64, r: 6, g: [] },
  moto: { L: 28, W: 10.7, h: 1.1, r: 4, g: [] },
  camper: { L: 97, W: 32, h: 3.4, r: 6, g: [[0.38, 0.46]] },
  icecream: { L: 87, W: 32, h: 2.9, r: 5, g: [[0.36, 0.45]] }
};
// what parks where: weights per kind of street
const VMIX = {
  city: { hatch: 14, sedan: 22, wagon: 5, coupe: 5, suv: 14, pickup: 6, van: 7, minivan: 6, taxi: 8, police: 1.5, ambulance: 1.2, fire: 0.6, box: 3, bus: 2.5, garbage: 1.5, moto: 3 },
  chaos: { sedan: 14, hatch: 8, suv: 10, pickup: 5, van: 5, police: 10, ambulance: 4, humvee: 6, apc: 1.2, box: 2, bus: 1.5, moto: 3, fire: 1 },
  burning: { sedan: 16, hatch: 10, suv: 10, pickup: 6, van: 6, minivan: 4, box: 3, bus: 2, fire: 2, ambulance: 1.5, police: 2, garbage: 1.5, moto: 2 },
  ruins: { sedan: 14, hatch: 12, suv: 9, pickup: 7, van: 6, box: 3, bus: 2, humvee: 2, school: 1, moto: 2 },
  ash: { sedan: 14, hatch: 10, suv: 9, pickup: 6, van: 6, box: 3, bus: 2, minivan: 4, moto: 2 },
  suburb: { sedan: 16, hatch: 10, suv: 16, minivan: 12, pickup: 9, wagon: 7, coupe: 3, school: 1.2, icecream: 0.8, moto: 2, camper: 1.5 },
  desert: { pickup: 22, suv: 10, sedan: 6, camper: 5, semi: 3, box: 2, moto: 3, hatch: 3 },
  snow: { suv: 18, pickup: 14, sedan: 6, wagon: 7, camper: 3, minivan: 3, box: 1 },
  lot: { hatch: 14, sedan: 22, wagon: 6, coupe: 6, suv: 12, minivan: 8, taxi: 3 },
  drive: { hatch: 12, sedan: 18, suv: 14, minivan: 10, coupe: 4, wagon: 6 },
  highway: { sedan: 18, hatch: 10, suv: 14, pickup: 9, van: 7, minivan: 6, box: 6, semi: 7, bus: 3, camper: 3, moto: 2, police: 1.5, ambulance: 1 }
};
const GARAGE = { lit: 0, drawn: 0, wrecks: 0, adapt: 0, beams: 0, _beams: 0, fn: -1 };
function vehPick(R, mix, maxL, maxW) {
  const M = VMIX[mix] || VMIX.city; let tot = 0;
  for (const k in M) { const v = VEH[k]; if ((maxL && v.L > maxL) || (maxW && v.W > maxW)) continue; tot += M[k]; }
  let r = R() * tot;
  for (const k in M) { const v = VEH[k]; if ((maxL && v.L > maxL) || (maxW && v.W > maxW)) continue; if (r < M[k]) return k; r -= M[k]; }
  return 'sedan';
}
// the paint and the battery: what a vehicle of kind vt looks like and whether anything on it still lights up
function vehDress(R, vt, o) {
  const d = { vt: vt };
  if (vt === 'taxi') d.col = '#e8b51c';
  else if (vt === 'police') d.col = R() < 0.5 ? '#14161a' : '#1b2a4a';
  else if (vt === 'ambulance') d.col = '#e9e6dd';
  else if (vt === 'fire') d.col = '#b3241d';
  else if (vt === 'school') d.col = '#f0b419';
  else if (vt === 'humvee' || vt === 'apc') d.col = R() < 0.6 ? '#4b5236' : '#8a7a58';
  else if (vt === 'garbage') d.col = R() < 0.5 ? '#2f6a3a' : '#e4e1d8';
  else if (vt === 'bus') d.col = ['#d9d6cc', '#2e5fa8', '#b8322a', '#2f7a4a'][Math.floor(R() * 4)];
  else if (vt === 'box' || vt === 'semi') d.col = ['#e6e3da', '#c9c5bb', '#2f4f6b', '#7b2f2b', '#d8a22a', '#3e5a3a'][Math.floor(R() * 6)];
  else if (vt === 'icecream') d.col = '#f4eef0';
  else if (vt === 'camper') d.col = '#e8e3d6';
  else d.col = VPAL[Math.floor(R() * VPAL.length)];
  d.cab = ['#e6e3da', '#2f4f6b', '#7b2f2b', '#22262b', '#c9c3b5'][Math.floor(R() * 5)];   // a truck's cab is often another colour
  d.s = (R() * 1e9) | 0;
  if (o && o.police) { d.vt = 'police'; d.col = o.col || '#1b2a4a'; }
  return d;
}
// after the burn/flip decision: does anything still light up (battery alive)
function vehBattery(R, r) {
  if (r.burnt || r.flip) return;
  const vt = r.vt, emerg = vt === 'police' || vt === 'ambulance' || vt === 'fire';
  if (emerg && R() < 0.65) r.lit = 'bar';
  else { const t = R(); r.lit = t < 0.05 ? 'head' : t < 0.11 ? 'hazard' : null; }
}
// the angle a vehicle faces, from its box and direction (traffic keeps right)
function vehAng(r) { const horiz = r.w >= r.h; return horiz ? (r.fd < 0 ? Math.PI : 0) : (r.fd < 0 ? -Math.PI / 2 : Math.PI / 2); }

/* ---------- drawing ---------- */
function vShade(hex, k) { return typeof shade === 'function' ? shade(hex, k) : hex; }
function vBody(g, L, W, rad, col) {
  g.fillStyle = col; rrect(g, -L / 2, -W / 2, L, W, rad); g.fill();
  // light from above: a brighter top, darker sills along both sides
  const gr = g.createLinearGradient(0, -W / 2, 0, W / 2); gr.addColorStop(0, 'rgba(0,0,0,0.22)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.08)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.12)'); gr.addColorStop(0.82, 'rgba(255,255,255,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0.28)');
  g.fillStyle = gr; rrect(g, -L / 2, -W / 2, L, W, rad); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.8; rrect(g, -L / 2 + 0.4, -W / 2 + 0.4, L - 0.8, W - 0.8, rad); g.stroke();
}
// glass across the vehicle between x0 and x1 (vehicle units), with the sky caught in it
function vGlass(g, x0, x1, W, inset, lit) {
  const w = x1 - x0; if (w <= 0) return;
  g.fillStyle = '#141b22'; rrect(g, x0, -W / 2 + inset, w, W - inset * 2, 1.6); g.fill();
  const gr = g.createLinearGradient(x0, -W / 2, x1, W / 2); gr.addColorStop(0, 'rgba(150,190,220,0.05)'); gr.addColorStop(0.42, 'rgba(170,210,235,0.32)'); gr.addColorStop(0.5, 'rgba(220,240,255,0.42)'); gr.addColorStop(0.58, 'rgba(170,210,235,0.16)'); gr.addColorStop(1, 'rgba(120,160,200,0.06)');
  g.fillStyle = gr; rrect(g, x0, -W / 2 + inset, w, W - inset * 2, 1.6); g.fill();
  if (lit) { g.fillStyle = 'rgba(255,214,140,0.25)'; rrect(g, x0, -W / 2 + inset, w, W - inset * 2, 1.6); g.fill(); }
}
// a car's outline from above: the nose and tail rounded in, the flanks swelling a touch at the wheel arches
function vCarBody(g, L, W, rad, col) {
  const t = W * 0.07, r = rad, path = () => {
    g.beginPath(); g.moveTo(-L / 2 + r, -W / 2 + t * 0.4);
    g.lineTo(-L * 0.36, -W / 2 + t * 0.4); g.quadraticCurveTo(-L * 0.31, -W / 2 - 0.4, -L * 0.25, -W / 2 + t * 0.2); g.lineTo(L * 0.25, -W / 2 + t * 0.2); g.quadraticCurveTo(L * 0.31, -W / 2 - 0.4, L * 0.36, -W / 2 + t * 0.3);
    g.lineTo(L / 2 - r * 1.5, -W / 2 + t * 0.5); g.quadraticCurveTo(L / 2, -W / 2 + t, L / 2, -W / 2 + t + r);
    g.lineTo(L / 2, W / 2 - t - r); g.quadraticCurveTo(L / 2, W / 2 - t, L / 2 - r * 1.5, W / 2 - t * 0.5);
    g.lineTo(L * 0.36, W / 2 - t * 0.3); g.quadraticCurveTo(L * 0.31, W / 2 + 0.4, L * 0.25, W / 2 - t * 0.2); g.lineTo(-L * 0.25, W / 2 - t * 0.2); g.quadraticCurveTo(-L * 0.31, W / 2 + 0.4, -L * 0.36, W / 2 - t * 0.4);
    g.lineTo(-L / 2 + r, W / 2 - t * 0.4); g.quadraticCurveTo(-L / 2, W / 2 - t * 0.6, -L / 2, W / 2 - t - r * 0.6);
    g.lineTo(-L / 2, -W / 2 + t + r * 0.6); g.quadraticCurveTo(-L / 2, -W / 2 + t * 0.6, -L / 2 + r, -W / 2 + t * 0.4); g.closePath();
  };
  g.fillStyle = col; path(); g.fill();
  const gr = g.createLinearGradient(0, -W / 2, 0, W / 2); gr.addColorStop(0, 'rgba(0,0,0,0.26)'); gr.addColorStop(0.16, 'rgba(255,255,255,0.06)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.14)'); gr.addColorStop(0.84, 'rgba(255,255,255,0.04)'); gr.addColorStop(1, 'rgba(0,0,0,0.3)');
  g.fillStyle = gr; path(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.38)'; g.lineWidth = 0.8; path(); g.stroke();
}
// a raked window: a windscreen (dir 1, wider at its foot) or a rear window (dir -1), set into the greenhouse
function vRake(g, x0, x1, W, gi, dir) {
  const a = W / 2 - gi + 0.6, b = W / 2 - gi - 1.6, foot = dir > 0 ? x0 : x1, top = dir > 0 ? x1 : x0;
  const path = () => { g.beginPath(); g.moveTo(foot, -b); g.lineTo(top, -a + 1.4); g.quadraticCurveTo(top + dir * 1.4, 0, top, a - 1.4); g.lineTo(foot, b); g.closePath(); };
  g.fillStyle = '#141b22'; path(); g.fill();
  const gr = g.createLinearGradient(x0, -W / 2, x1, W / 2); gr.addColorStop(0, 'rgba(150,190,220,0.06)'); gr.addColorStop(0.45, 'rgba(175,212,236,0.34)'); gr.addColorStop(0.52, 'rgba(225,242,255,0.44)'); gr.addColorStop(0.6, 'rgba(170,210,235,0.14)'); gr.addColorStop(1, 'rgba(120,160,200,0.06)');
  g.fillStyle = gr; path(); g.fill();
}
// shaped head and tail lamps, a grille between the headlamps, the mirrors standing off the doors
function vCarLights(g, L, W, col) {
  g.fillStyle = '#f3e3a8'; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(L / 2 - 2.4, sd * (W / 2 - 4.6), 1.6, 3, sd * 0.25, 0, TAU); g.fill(); }
  g.fillStyle = '#1a1c1f'; g.fillRect(L / 2 - 1.6, -W * 0.18, 1.6, W * 0.36);
  g.fillStyle = '#b8262a'; for (const sd of [-1, 1]) g.fillRect(-L / 2 + 0.3, sd > 0 ? W / 2 - 7.4 : -W / 2 + 3.4, 1.8, 4);
  g.fillStyle = col; for (const sd of [-1, 1]) { g.fillRect(L * 0.17, sd > 0 ? W / 2 - 0.6 : -W / 2 - 1.8, 3, 2.4); }
  g.fillStyle = '#141b22'; for (const sd of [-1, 1]) g.fillRect(L * 0.17 + 0.6, sd > 0 ? W / 2 + 0.6 : -W / 2 - 1.4, 1.8, 0.8);
}
function vWheels(g, xs, W, tw) { g.fillStyle = '#0b0b0c'; for (const x of xs) { g.fillRect(x - tw / 2, -W / 2 - 1.4, tw, 2.6); g.fillRect(x - tw / 2, W / 2 - 1.2, tw, 2.6); } }
function vLights(g, L, W, col) {
  g.fillStyle = '#f3e3a8'; g.fillRect(L / 2 - 2.6, -W / 2 + 2.6, 2.6, 4); g.fillRect(L / 2 - 2.6, W / 2 - 6.6, 2.6, 4);
  g.fillStyle = '#b8262a'; g.fillRect(-L / 2, -W / 2 + 2.6, 2.2, 4); g.fillRect(-L / 2, W / 2 - 6.6, 2.2, 4);
  g.fillStyle = col; g.fillRect(L * 0.18, -W / 2 - 2.2, 3.5, 2.6); g.fillRect(L * 0.18, W / 2 - 0.4, 3.5, 2.6);   // mirrors
}
function vRibs(g, x0, x1, W, step, a) { g.strokeStyle = 'rgba(0,0,0,' + (a || 0.18) + ')'; g.lineWidth = 0.8; g.beginPath(); for (let x = x0 + step; x < x1; x += step) { g.moveTo(x, -W / 2 + 2); g.lineTo(x, W / 2 - 2); } g.stroke(); }
function vBar(g, x, W, c1, c2) { g.fillStyle = '#1a1b1e'; g.fillRect(x - 2.5, -W * 0.36, 5, W * 0.72); g.fillStyle = c1; g.fillRect(x - 2, -W * 0.34, 4, W * 0.32); g.fillStyle = c2; g.fillRect(x - 2, W * 0.02, 4, W * 0.32); }
function vehDraw(g, r) {
  const vt = r.vt || 'sedan', V = VEH[vt] || VEH.sedan, horiz = r.w >= r.h, L = horiz ? r.w : r.h, W = horiz ? r.h : r.w;
  const sun = typeof luxSunShadowsOn === 'function' && luxSunShadowsOn();
  g.save(); g.translate(r.x + r.w / 2, r.y + r.h / 2); g.rotate(vehAng(r));
  // the ground under it: a soft contact shadow when the sun casts the real one, a drop shadow otherwise
  g.fillStyle = sun ? 'rgba(0,0,0,0.38)' : 'rgba(0,0,0,0.42)'; rrect(g, -L / 2 + (sun ? 1 : 4), -W / 2 + (sun ? 1.5 : 5), L, W, V.r); g.fill();
  if (r.flip) { vehFlipped(g, L, W, V, r); g.restore(); return; }
  if (r.burnt) { vehBurnt(g, L, W, V, r); g.restore(); return; }
  const R = Z.mulberry32(r.s || 7), col = r.col || '#6b6b6b';
  switch (vt) {
    case 'moto': {
      g.rotate(0.35); g.fillStyle = '#0d0d0e'; g.beginPath(); g.arc(L * 0.36, 0, 3.6, 0, TAU); g.arc(-L * 0.36, 0, 3.8, 0, TAU); g.fill();
      g.fillStyle = col; rrect(g, -L * 0.2, -3, L * 0.42, 6, 3); g.fill(); g.fillStyle = '#1a1a1c'; rrect(g, -L * 0.34, -2.4, L * 0.2, 4.8, 2); g.fill();
      g.strokeStyle = '#8a8d92'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(L * 0.28, -5); g.lineTo(L * 0.28, 5); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(-L * 0.1, -2.6, L * 0.2, 1.2);
      break;
    }
    case 'pickup': {
      vWheels(g, [-L * 0.33, L * 0.3], W, 10); vBody(g, L, W, V.r, col);
      // the bed: an open box with ribs, the tailgate, and whatever was left in it
      g.fillStyle = vShade(col, -0.45); g.fillRect(-L / 2 + 3, -W / 2 + 3, L * 0.48, W - 6); vRibs(g, -L / 2 + 3, -L / 2 + 3 + L * 0.48, W - 2, 4.5, 0.3);
      const t = R(); if (t < 0.35) { g.fillStyle = '#8a6a40'; g.fillRect(-L * 0.4, -W * 0.25, 9, 9); g.fillRect(-L * 0.27, -W * 0.05, 8, 8); } else if (t < 0.6) { g.fillStyle = '#3a4a3a'; rrect(g, -L / 2 + 4, -W / 2 + 4, L * 0.44, W - 8, 3); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.moveTo(-L / 2 + 6, 0); g.lineTo(-L * 0.08, 0); g.stroke(); } else if (t < 0.75) { g.fillStyle = '#141414'; g.beginPath(); g.arc(-L * 0.3, 0, 6, 0, TAU); g.fill(); g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(-L * 0.3, 0, 3, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(L * 0.05, -W / 2 + 3, L * 0.17, W - 6);
      vGlass(g, L * 0.22, L * 0.33, W, 3); vGlass(g, L * 0.02, L * 0.05, W, 4); vLights(g, L, W, col);
      break;
    }
    case 'van': case 'ambulance': case 'box': case 'garbage': case 'icecream': case 'fire': {
      const cabL = vt === 'fire' ? 0.2 : vt === 'van' || vt === 'icecream' ? 0.26 : 0.24, cl = L * cabL, bl = L - cl - 1.5;
      vWheels(g, vt === 'fire' ? [-L * 0.36, -L * 0.22, L * 0.34] : [-L * 0.32, L * 0.32], W, vt === 'fire' ? 11 : 10);
      if (vt === 'van' || vt === 'icecream') vBody(g, L, W, V.r, col);
      else {
        // the box (or body) behind, and a separate cab in front of it
        g.save(); g.translate(-L / 2 + bl / 2, 0); vBody(g, bl, W, 2, col); g.restore();
        g.save(); g.translate(L / 2 - cl / 2, 0); vBody(g, cl, W - 1, V.r, vt === 'fire' ? col : vt === 'ambulance' ? '#e9e6dd' : r.cab || '#e6e3da'); g.restore();
      }
      if (vt === 'box') { g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(-L / 2 + 2, -W / 2 + 2, L * 0.72, W - 4); vRibs(g, -L / 2, -L / 2 + L * 0.74, W, 8, 0.16); g.fillStyle = ['#c9402e', '#2f6fb0', '#3d8a4a', '#f2cc3a'][r.s & 3]; g.fillRect(-L / 2 + 6, -W / 2 + 2, L * 0.6, 3); }
      if (vt === 'garbage') { vRibs(g, -L / 2, -L / 2 + L * 0.74, W, 6, 0.25); g.fillStyle = '#2a2c30'; g.fillRect(-L / 2, -W / 2 + 3, 10, W - 6); g.fillStyle = '#f2cc3a'; g.fillRect(-L / 2 + 10, -W / 2, 2, W); }
      if (vt === 'van') { vRibs(g, -L / 2 + 4, L * 0.3, W, 9, 0.12); if (R() < 0.4) { g.strokeStyle = '#6a6d72'; g.lineWidth = 1.2; g.strokeRect(-L * 0.38, -W * 0.36, L * 0.6, W * 0.72); for (let x = -L * 0.38; x < L * 0.22; x += 7) { g.beginPath(); g.moveTo(x, -W * 0.36); g.lineTo(x, W * 0.36); g.stroke(); } } }
      if (vt === 'icecream') { g.fillStyle = '#f2a8c8'; g.fillRect(-L / 2 + 3, -W / 2 + 2, L * 0.7, 4); g.fillRect(-L / 2 + 3, W / 2 - 6, L * 0.7, 4); g.fillStyle = '#e8b878'; g.beginPath(); g.moveTo(-L * 0.12, 3); g.lineTo(-L * 0.2, -7); g.lineTo(-L * 0.04, -7); g.closePath(); g.fill(); g.fillStyle = '#ff9ec8'; g.beginPath(); g.arc(-L * 0.12, -8, 5, 0, TAU); g.fill(); g.fillStyle = '#fff6f0'; g.beginPath(); g.arc(-L * 0.12, -11, 3.4, 0, TAU); g.fill(); }
      if (vt === 'ambulance') { g.fillStyle = '#d23a2e'; g.fillRect(-L / 2 + 2, -W / 2 + 2, L * 0.74, 3); g.fillRect(-L / 2 + 2, W / 2 - 5, L * 0.74, 3); g.fillStyle = '#2f6fb0'; g.fillRect(-L * 0.22 - 2, -6, 4, 12); g.fillRect(-L * 0.22 - 6, -2, 12, 4); vBar(g, L * 0.24, W, '#ff2d2d', '#f4f4f4'); vBar(g, -L / 2 + 4, W, '#ff2d2d', '#ff2d2d'); }
      if (vt === 'fire') {
        // the ladder along the top, hose reels and lockers
        g.fillStyle = '#7d8187'; g.fillRect(-L * 0.46, -W * 0.22, L * 0.72, 2.2); g.fillRect(-L * 0.46, W * 0.22 - 2.2, L * 0.72, 2.2);
        g.strokeStyle = '#a7abb1'; g.lineWidth = 1.2; g.beginPath(); for (let x = -L * 0.46; x < L * 0.26; x += 6) { g.moveTo(x, -W * 0.22); g.lineTo(x, W * 0.22); } g.stroke();
        g.fillStyle = '#2a2c30'; g.beginPath(); g.arc(-L * 0.12, -W * 0.36, 3.2, 0, TAU); g.arc(-L * 0.12, W * 0.36, 3.2, 0, TAU); g.fill();
        g.fillStyle = '#e8e4da'; g.fillRect(-L / 2 + 2, -W / 2 + 1, L * 0.78, 1.6); g.fillRect(-L / 2 + 2, W / 2 - 2.6, L * 0.78, 1.6); vBar(g, L * 0.38, W, '#ff2d2d', '#ff2d2d');
      }
      vGlass(g, L * V.g[0][0], L * V.g[0][1], W, 3.2); vLights(g, L, W, vt === 'fire' ? col : r.cab || col);
      break;
    }
    case 'bus': case 'school': {
      vWheels(g, [-L * 0.32, L * 0.3], W, 11); vBody(g, L, W, V.r, col);
      // side windows run along both edges; the roof has its air-conditioning units and escape hatches
      g.fillStyle = 'rgba(20,28,36,0.72)'; g.fillRect(-L * 0.45, -W / 2 + 1.2, L * 0.86, 2.6); g.fillRect(-L * 0.45, W / 2 - 3.8, L * 0.86, 2.6);
      g.fillStyle = 'rgba(255,255,255,0.12)'; for (let x = -L * 0.45; x < L * 0.4; x += 11) { g.fillRect(x, -W / 2 + 1.2, 1, 2.6); g.fillRect(x, W / 2 - 3.8, 1, 2.6); }
      if (vt === 'school') { g.fillStyle = '#111'; g.fillRect(-L / 2 + 2, -W / 2 + 4.5, L - 10, 1.2); g.fillRect(-L / 2 + 2, W / 2 - 5.7, L - 10, 1.2); g.fillStyle = vShade(col, -0.1); g.fillRect(L * 0.38, -W / 2 + 4, L * 0.12, W - 8); g.font = 'bold 6px sans-serif'; g.fillStyle = '#111'; g.save(); g.rotate(Math.PI / 2); g.fillText('SCHOOL BUS', -17, -L * 0.3); g.restore(); }
      else { g.fillStyle = vShade(col, 0.2); g.fillRect(-L * 0.3, -W * 0.28, L * 0.18, W * 0.56); g.fillRect(L * 0.02, -W * 0.28, L * 0.14, W * 0.56); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.8; g.strokeRect(-L * 0.3, -W * 0.28, L * 0.18, W * 0.56); g.strokeRect(L * 0.02, -W * 0.28, L * 0.14, W * 0.56); }
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-L * 0.04, -4, 8, 8); g.fillRect(L * 0.24, -4, 8, 8);
      vGlass(g, L * V.g[0][0], L * V.g[0][1], W, 2.2); vLights(g, L, W, col);
      break;
    }
    case 'semi': {
      const cabL = L * 0.22, tr = L - cabL - 6;
      vWheels(g, [-L * 0.42, -L * 0.36, -L * 0.04, L * 0.3, L * 0.42], W, 9);
      // the trailer: a long box (or a tank) with ribs; the gap and fifth wheel; then the tractor with its hood
      if ((r.s & 7) === 0) { g.fillStyle = '#b8bcc2'; rrect(g, -L / 2, -W / 2 + 2, tr, W - 4, (W - 4) / 2); g.fill(); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(-L / 2 + 6, -W * 0.16, tr - 12, 3); vRibs(g, -L / 2, -L / 2 + tr, W, 26, 0.2); }
      else { g.fillStyle = col; g.fillRect(-L / 2, -W / 2, tr, W); g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(-L / 2 + 2, -W / 2 + 2, tr - 4, W - 4); vRibs(g, -L / 2, -L / 2 + tr, W, 7, 0.14); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1; g.strokeRect(-L / 2 + 0.5, -W / 2 + 0.5, tr - 1, W - 1); }
      g.fillStyle = '#1a1b1d'; g.fillRect(-L / 2 + tr, -W * 0.3, 6, W * 0.6);
      g.save(); g.translate(L / 2 - cabL / 2, 0); vBody(g, cabL, W - 2, 4, r.cab || '#7b2f2b'); g.restore();
      g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(L / 2 - cabL * 0.95, -W * 0.36, cabL * 0.4, W * 0.72);
      g.fillStyle = '#8a8d92'; g.fillRect(L / 2 - cabL * 0.55, -W / 2 - 1, 3, 2); g.fillRect(L / 2 - cabL * 0.55, W / 2 - 1, 3, 2);   // stacks
      vGlass(g, L * V.g[0][0], L * V.g[0][1], W, 3.4); vLights(g, L, W, r.cab || col);
      break;
    }
    case 'humvee': case 'apc': {
      vWheels(g, vt === 'apc' ? [-L * 0.36, -L * 0.12, L * 0.12, L * 0.36] : [-L * 0.3, L * 0.3], W, vt === 'apc' ? 9 : 10);
      g.fillStyle = col; g.beginPath();
      if (vt === 'apc') { g.moveTo(L / 2, -W * 0.3); g.lineTo(L * 0.38, -W / 2); g.lineTo(-L / 2, -W / 2); g.lineTo(-L / 2, W / 2); g.lineTo(L * 0.38, W / 2); g.lineTo(L / 2, W * 0.3); }
      else { g.rect(-L / 2, -W / 2, L, W); }
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(-L * 0.4, -W * 0.38, L * 0.7, W * 0.3); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(-L * 0.45, W * 0.3, L * 0.85, W * 0.18);
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.9; g.strokeRect(-L / 2 + 1, -W / 2 + 1, L - 2, W - 2);
      // camouflage blotches, a hatch with a gun ring, the spare wheel
      g.fillStyle = vShade(col, -0.3); for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse((R() - 0.5) * L * 0.8, (R() - 0.5) * W * 0.7, 4 + R() * 6, 2 + R() * 3, R() * 3, 0, TAU); g.fill(); }
      const hx = vt === 'apc' ? -L * 0.05 : -L * 0.08;
      g.fillStyle = '#26282a'; g.beginPath(); g.arc(hx, 0, vt === 'apc' ? 9 : 6, 0, TAU); g.fill(); g.strokeStyle = '#4a4d50'; g.lineWidth = 1.4; g.stroke();
      g.strokeStyle = '#1a1b1c'; g.lineWidth = vt === 'apc' ? 3 : 2; g.beginPath(); g.moveTo(hx, 0); g.lineTo(hx + (vt === 'apc' ? 30 : 16), vt === 'apc' ? 0 : 2); g.stroke();
      if (vt === 'humvee') { vGlass(g, L * V.g[0][0], L * V.g[0][1], W, 3); g.fillStyle = '#121212'; g.beginPath(); g.arc(-L / 2 + 2, 0, 5, 0, TAU); g.fill(); }
      break;
    }
    case 'camper': {
      vWheels(g, [-L * 0.25, L * 0.3], W, 11); vBody(g, L, W, V.r, col);
      g.fillStyle = '#7a4a2a'; g.fillRect(-L / 2 + 3, -W / 2 + 2, L - 10, 3); g.fillStyle = '#c9762a'; g.fillRect(-L / 2 + 3, -W / 2 + 5, L - 10, 1.6);
      g.fillStyle = '#c9cdd2'; g.fillRect(-L * 0.18, -6, 12, 12); g.fillStyle = '#1d2b45'; g.fillRect(-L * 0.42, -W * 0.3, 18, W * 0.6); g.strokeStyle = 'rgba(120,160,220,0.4)'; g.lineWidth = 0.6; g.strokeRect(-L * 0.42, -W * 0.3, 18, W * 0.6);
      g.fillStyle = '#5a5d62'; g.fillRect(-L / 2 + 4, W / 2 - 3, L * 0.5, 2.4);   // the rolled awning
      vGlass(g, L * V.g[0][0], L * V.g[0][1], W, 3); vLights(g, L, W, col);
      break;
    }
    default: {
      // the car family: hatch, sedan, wagon, coupe, SUV, minivan, taxi, police. 1.9.998: shaped like a car from above:
      // the nose and tail rounded in, wheel arches, a greenhouse narrower than the body with the windscreen and rear
      // window raked, side glass down both flanks, door seams, the bonnet's creases and shaped lamps
      vWheels(g, [-L * 0.31, L * 0.31], W, 9.5); vCarBody(g, L, W, V.r, col);
      const G0 = V.g[0], G1 = V.g[1], gi = W * 0.13;
      // the greenhouse: the roof panel between the windscreen and the rear window, side glass along its edges
      g.fillStyle = vShade(col, 0.06); rrect(g, L * G1[1], -W / 2 + gi, L * (G0[0] - G1[1]), W - gi * 2, 3); g.fill();
      g.fillStyle = '#141b22'; g.fillRect(L * G1[0] + 1, -W / 2 + gi - 1.2, L * (G0[0] - G1[0]), 1.6); g.fillRect(L * G1[0] + 1, W / 2 - gi - 0.4, L * (G0[0] - G1[0]), 1.6);
      g.fillStyle = 'rgba(160,200,225,0.18)'; g.fillRect(L * G1[0] + 2, -W / 2 + gi - 1.2, L * (G0[0] - G1[0]) - 2, 0.6);
      // door seams on both flanks, the bonnet's two creases, the boot lid's line
      g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 0.6; g.beginPath();
      for (const x of [L * (G0[0] - 0.02), L * ((G0[0] + G1[1]) / 2)]) { g.moveTo(x, -W / 2 + 0.6); g.lineTo(x, -W / 2 + gi - 1.6); g.moveTo(x, W / 2 - 0.6); g.lineTo(x, W / 2 - gi + 1.6); }
      g.moveTo(L * G0[1] + 2, -W * 0.22); g.lineTo(L / 2 - 3, -W * 0.18); g.moveTo(L * G0[1] + 2, W * 0.22); g.lineTo(L / 2 - 3, W * 0.18);
      if (G1) { g.moveTo(L * G1[0] - 2, -W * 0.32); g.lineTo(L * G1[0] - 2, W * 0.32); }
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.09)'; g.fillRect(L * G0[1] + 3, -W * 0.16, L * (0.5 - G0[1]) - 6, W * 0.32);
      if (vt === 'wagon' || vt === 'suv') { g.fillStyle = '#2a2c30'; g.fillRect(L * G1[1], -W / 2 + 2.6, L * (G0[0] - G1[1]), 1.4); g.fillRect(L * G1[1], W / 2 - 4, L * (G0[0] - G1[1]), 1.4); }
      if ((vt === 'suv' || vt === 'sedan') && (r.s & 3) === 1) { g.fillStyle = '#121820'; g.fillRect(-L * 0.06, -W * 0.22, L * 0.12, W * 0.44); }
      if (vt === 'coupe' && (r.s & 1)) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(-L / 2 + 2, -2.5, L - 4, 1.6); g.fillRect(-L / 2 + 2, 1, L - 4, 1.6); }
      if (vt === 'minivan') { g.strokeStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.moveTo(-L * 0.1, -W / 2 + 1); g.lineTo(-L * 0.1, -W / 2 + 4); g.moveTo(-L * 0.1, W / 2 - 1); g.lineTo(-L * 0.1, W / 2 - 4); g.stroke(); }
      if (vt === 'taxi') { g.fillStyle = '#111'; for (let x = -L * 0.4; x < L * 0.4; x += 4) { g.fillRect(x, -W / 2 + 0.4, 2, 1.4); g.fillRect(x + 2, W / 2 - 1.8, 2, 1.4); } g.fillStyle = '#f4f2ea'; g.fillRect(-L * 0.06, -W * 0.2, L * 0.1, W * 0.4); g.fillStyle = '#c9402e'; g.fillRect(-L * 0.06, -1, L * 0.1, 2); }
      if (vt === 'police') { if (col === '#14161a') { g.fillStyle = '#ecebe6'; g.fillRect(-L * 0.2, -W / 2, L * 0.36, W); } else { g.fillStyle = '#e8e6e0'; g.fillRect(-L * 0.4, -W / 2 + 1, L * 0.8, 1.8); g.fillRect(-L * 0.4, W / 2 - 2.8, L * 0.8, 1.8); } vBar(g, -L * 0.02, W, '#ff2d2d', '#2d6bff'); }
      vRake(g, L * G0[0], L * G0[1], W, gi, 1); if (G1) vRake(g, L * G1[0], L * G1[1], W, gi, -1);
      vCarLights(g, L, W, col);
    }
  }
  if (r.dust) { g.fillStyle = r.dust; rrect(g, -L / 2 + 1, -W / 2 + 1, L - 2, W - 2, V.r); g.fill(); }
  g.restore();
}
function vehBurnt(g, L, W, V, r) {
  // a burned-out shell: charred paint, rust blooming through, the glass gone, embers still glowing
  vWheels(g, [-L * 0.3, L * 0.3], W, Math.min(12, L * 0.17));
  g.fillStyle = r.rust ? '#5a3a26' : '#433b36'; rrect(g, -L / 2, -W / 2, L, W, V.r); g.fill();
  const R = Z.mulberry32(r.s || 5);
  g.fillStyle = 'rgba(126,66,32,0.6)'; for (let i = 0; i < 2 + L / 40; i++) g.fillRect(-L / 2 + R() * (L - 12), -W / 2 + R() * (W - 8), L * (0.1 + R() * 0.14), W * (0.2 + R() * 0.2));
  const gr = g.createRadialGradient(0, 0, 2, 0, 0, L / 2); gr.addColorStop(0, 'rgba(6,5,4,0.75)'); gr.addColorStop(1, 'rgba(6,5,4,0.1)'); g.fillStyle = gr; rrect(g, -L / 2, -W / 2, L, W, V.r); g.fill();
  for (const G1 of V.g) { g.fillStyle = '#090807'; g.fillRect(L * G1[0], -W / 2 + 3, L * (G1[1] - G1[0]), W - 6); }
  if (L > 90) { g.strokeStyle = 'rgba(20,16,14,0.8)'; g.lineWidth = 1; for (let x = -L / 2 + 8; x < L / 2 - 8; x += 9) { g.beginPath(); g.moveTo(x, -W / 2 + 3); g.lineTo(x, W / 2 - 3); g.stroke(); } }
  g.strokeStyle = 'rgba(170,160,150,0.4)'; g.lineWidth = 1; rrect(g, -L / 2 + 0.5, -W / 2 + 0.5, L - 1, W - 1, V.r); g.stroke();
  if (!r.rust) { g.fillStyle = '#ff7a1a'; for (let i = 0; i < 4; i++) g.fillRect(-L / 2 + ((i * 37) % L), -W / 4 + (i % 2) * W / 3, 2, 2); }
}
function vehFlipped(g, L, W, V, r) {
  g.fillStyle = r.burnt ? '#1c1a19' : '#2b2c2e'; rrect(g, -L / 2, -W / 2, L, W, V.r); g.fill();
  const ax = L > 90 ? [-L * 0.36, -L * 0.22, L * 0.34] : [-L * 0.32, L * 0.32];
  g.fillStyle = '#161616'; for (const x of ax) for (const y of [-W / 2 - 2, W / 2 - 5]) g.fillRect(x - 6, y, 12, 7);
  g.strokeStyle = '#454545'; g.lineWidth = 2.5; g.beginPath(); for (const x of ax) { g.moveTo(x, -W / 2 + 4); g.lineTo(x, W / 2 - 4); } g.moveTo(-L * 0.4, 0); g.lineTo(L * 0.4, 0); g.stroke();
  g.fillStyle = '#3a3836'; g.fillRect(-L * 0.12, -W * 0.22, L * 0.24, W * 0.44);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-L / 2 + 2, -W / 2 + 2, 6, W - 4);
  if (r.burnt) { g.fillStyle = '#ff7a1a'; g.fillRect(-4, -3, 2, 2); g.fillRect(6, 3, 2, 2); }
}

/* ---------- lights: headlights, tail lights, hazards and light bars ---------- */
// local point (vehicle units, +x forward) to world
function vehPt(r, lx, ly, out) { const a = vehAng(r), c = Math.cos(a), s = Math.sin(a); out[0] = r.x + r.w / 2 + lx * c - ly * s; out[1] = r.y + r.h / 2 + lx * s + ly * c; return out; }
const VP = [0, 0];
// what the vehicles in a block add to the lighting engine this frame (called from LUX's gather, in simulation units)
function garageLights(c, x0, y0, x1, y1, m, t, night, uk) {
  const t0 = performance.now();
  if (GARAGE.fn !== frameNo) { GARAGE.fn = frameNo; GARAGE.beams = GARAGE._beams; GARAGE._beams = 0; }
  try { garageLit(c, x0, y0, x1, y1, m, t, night, uk); } finally { coreCost('GARAGE', performance.now() - t0); }
}
function garageLit(c, x0, y0, x1, y1, m, t, night, uk) {
  if (!c.vlit) c.vlit = c.rects.filter(r => r.k === 'car' && r.lit);
  for (const r of c.vlit) {
    if (r.x > x1 + m || r.x + r.w < x0 - m || r.y > y1 + m || r.y + r.h < y0 - m) continue;
    const horiz = r.w >= r.h, L = horiz ? r.w : r.h, W = horiz ? r.h : r.w, a = vehAng(r);
    if (r.lit === 'head' && night > 0.08) {
      // two beams from the front corners (each a cone that casts shadows), and the red glow at the back
      // (engine room: Eco drops the beams' shadows and the tail glow, Hard and Max give both beams shadows)
      const gk = clamp((TUNE.GARAGE || 0) + (GARAGE.adapt | 0), -1, 2); GARAGE._beams++;
      for (const sd of [-1, 1]) { vehPt(r, L / 2, sd * W * 0.3, VP); luxPush(VP[0], VP[1], 300 * uk, 255, 240, 215, 0.62 * night, gk < 0 ? false : gk > 0 ? true : sd > 0, 0, { a: a, h: 0.34 }, 0.8); }
      if (gk >= 0) { vehPt(r, -L / 2, 0, VP); luxPush(VP[0], VP[1], 70 * uk, 255, 40, 30, 0.42 * night, false, 0, null, 0.8); }
    } else if (r.lit === 'hazard') {
      if (Math.floor(t * 1.6 + (r.s & 7) * 0.1) % 2 === 0) for (const sx of [-1, 1]) { vehPt(r, sx * L * 0.48, 0, VP); luxPush(VP[0], VP[1], 95 * uk, 255, 170, 40, (0.35 + 0.4 * night), false, 0, null, 0.9); }
    } else if (r.lit === 'bar') {
      const ph = Math.floor(t * 6 + (r.s & 3)) % 2, vt = r.vt, bx = vt === 'ambulance' ? L * 0.24 : vt === 'fire' ? L * 0.38 : -L * 0.02;
      vehPt(r, bx, ph ? -W * 0.25 : W * 0.25, VP);
      const col = vt === 'police' ? (ph ? [255, 50, 50] : [60, 110, 255]) : vt === 'ambulance' ? (ph ? [255, 50, 50] : [255, 255, 255]) : [255, 50, 40];
      luxPush(VP[0], VP[1], 240 * uk, col[0], col[1], col[2], 0.55 + 0.35 * night, true, 1, null, 1.6);
    }
  }
}
// the bulbs themselves, bright on top of everything (lit: after the lighting at night; else a plain sprite by day)
function garageEmissive(vis, a) {
  const t = G.time, cx = Math.floor(cam.x / CHS), cy = Math.floor(cam.y / CHS);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = cx - 1; i <= cx + 1; i++) for (let j = cy - 1; j <= cy + 1; j++) {
    const c = chunks.get(i + ',' + j); if (!c || !c.can) continue;
    if (!c.vlit) c.vlit = c.rects.filter(r => r.k === 'car' && r.lit);
    for (const r of c.vlit) {
      if (!vis(r.x + r.w / 2, r.y + r.h / 2, 80)) continue;
      const horiz = r.w >= r.h, L = horiz ? r.w : r.h, W = horiz ? r.h : r.w;
      if (r.lit === 'head') {
        for (const sd of [-1, 1]) { vehPt(r, L / 2, sd * W * 0.3, VP); ctx.globalAlpha = 0.8 * a + 0.2; const s = 10 * SCL; ctx.drawImage(glowSprite('#fff3d8'), VP[0] - s, VP[1] - s, s * 2, s * 2); }
        for (const sd of [-1, 1]) { vehPt(r, -L / 2, sd * W * 0.32, VP); ctx.globalAlpha = 0.7 * a + 0.2; const s = 6 * SCL; ctx.drawImage(glowSprite('#ff3a2a'), VP[0] - s, VP[1] - s, s * 2, s * 2); }
      } else if (r.lit === 'hazard') {
        if (Math.floor(t * 1.6 + (r.s & 7) * 0.1) % 2 === 0) for (const sx of [-1, 1]) for (const sd of [-1, 1]) { vehPt(r, sx * (L / 2 - 1), sd * (W / 2 - 3), VP); ctx.globalAlpha = 0.9; const s = 7 * SCL; ctx.drawImage(glowSprite('#ffae2a'), VP[0] - s, VP[1] - s, s * 2, s * 2); }
      } else if (r.lit === 'bar') {
        const ph = Math.floor(t * 6 + (r.s & 3)) % 2, vt = r.vt, bx = vt === 'ambulance' ? L * 0.24 : vt === 'fire' ? L * 0.38 : -L * 0.02;
        for (const sd of [-1, 1]) {
          const on = sd < 0 ? ph : !ph; if (!on) continue; vehPt(r, bx, sd * W * 0.2, VP);
          const col = vt === 'police' ? (sd < 0 ? '#ff3b3b' : '#3b7bff') : vt === 'ambulance' ? (sd < 0 ? '#ff3b3b' : '#ffffff') : '#ff3b2a';
          ctx.globalAlpha = 0.95; const s = 14 * SCL; ctx.drawImage(glowSprite(col), VP[0] - s, VP[1] - s, s * 2, s * 2);
        }
      }
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
// glass for the reflection engine: the windows of every intact vehicle near the view, drawn into its mask (world units)
function garageGlass(g, c, vis) {
  for (const r of c.rects) {
    if (r.k !== 'car' || r.burnt || r.flip || !vis(r.x + r.w / 2, r.y + r.h / 2, 60)) continue;
    const V = VEH[r.vt || 'sedan'] || VEH.sedan, horiz = r.w >= r.h, L = horiz ? r.w : r.h, W = horiz ? r.h : r.w;
    g.save(); g.translate(r.x + r.w / 2, r.y + r.h / 2); g.rotate(vehAng(r));
    g.globalAlpha = 0.18; g.fillRect(-L / 2, -W / 2, L, W);                 // paint and chrome: a faint gloss
    g.globalAlpha = 0.85; for (const G1 of V.g) g.fillRect(L * G1[0], -W / 2 + 3, L * (G1[1] - G1[0]), W - 6);
    g.restore();
  }
  g.globalAlpha = 1;
}

/* ---------- placing vehicles ---------- */
// a vehicle of a kind that suits the street, laid along it: horiz true for an east-west road. Returns the rect or null.
function placeVeh(c, R, mix, x, y, horiz, fd, o) {
  const vt = o && o.vt ? o.vt : vehPick(R, mix, o && o.maxL, o && o.maxW), V = VEH[vt];
  const w = horiz ? V.L : V.W, h = horiz ? V.W : V.L;
  const d = vehDress(R, vt, o);
  const opt = Object.assign({ vt: d.vt, col: d.col, cab: d.cab, s: d.s, fd: fd }, o || {}); delete opt.maxL; delete opt.maxW; delete opt.vt; opt.vt = d.vt;
  const r = addCar(c, R, x, y, w, h, opt);
  if (r) { r.vt = d.vt; vehBattery(R, r); }
  return r;
}

/* ---------- wrecks: aircraft that came down in the city ---------- */
// the block is the crash site: an airliner in three pieces with a wing torn off, debris and fires (replaces the block)
function crashSite(c, R) {
  const bx = c.ox + ROAD, by = c.oy + ROAD, cx = bx + BS / 2, cy = by + BS / 2, a = (R() - 0.5) * 1.4 + (R() < 0.5 ? 0 : Math.PI / 2);
  c.type = 'crash'; c.wrecks = c.wrecks || [];
  const w = { k: 'airliner', x: cx, y: cy, a: a, s: (R() * 1e9) | 0, livery: ['#c9402e', '#2f6fb0', '#3d8a4a', '#d8a22a', '#5a3a5e'][Math.floor(R() * 5)], gap1: 14 + R() * 18, gap2: 10 + R() * 16, tw: (R() - 0.5) * 0.5 };
  c.wrecks.push(w);
  wreckRects(c, w);
  // fires in the wreckage and a scattered debris field
  const ca = Math.cos(a), sa = Math.sin(a);
  for (let i = 0; i < 4; i++) { const t = (R() - 0.5) * 360, o = (R() - 0.5) * 120; addFire(c, cx + ca * t - sa * o, cy + sa * t + ca * o, 12 + R() * 14, R() < 0.25); }
  for (let i = 0; i < 9; i++) { const t = (R() - 0.5) * 420, o = (R() - 0.5) * 300, x = cx + ca * t - sa * o, y = cy + sa * t + ca * o, s = 10 + R() * 18; if (freeAt(c, x - s / 2, y - s / 2, s, s, 6)) c.rects.push({ x: x - s / 2, y: y - s / 2, w: s, h: s * (0.6 + R() * 0.5), k: 'rub', s: (R() * 1e9) | 0, roof: '#6b6f75' }); }
  for (let i = 0; i < 5; i++) addProp(c, R() < 0.5 ? 'crate' : 'can', bx + 30 + R() * (BS - 60), by + 30 + R() * (BS - 60), R);
  GARAGE.wrecks++;
}
// a light plane or a helicopter dropped wherever there is room for it in the block (after the block is laid out)
// 1.9.998: helicopters at their real sizes, three kinds: a UH-60 Black Hawk for the military (16.4 m rotor, 15.3 m
// fuselage), an AS350 for the police (10.7 m rotor, three blades) and an EC135 for the news and air ambulance (10.2 m
// rotor, a shrouded fenestron tail). In block units (13.33 to the metre): cab = cabin length, cw its width, boom and bw
// the tail boom, tr the tail rotor, rr the main rotor's radius, nb its blades
const HELI = {
  uh60: { cab: 127, cw: 31, boom: 80, bw: 12, tr: 45, rr: 109, nb: 4, ht: 3.8 },
  as350: { cab: 60, cw: 25, boom: 69, bw: 8, tr: 25, rr: 71, nb: 3, ht: 3.1 },
  ec135: { cab: 61, cw: 27, boom: 72, bw: 9, tr: 13, rr: 68, nb: 4, fen: 1, ht: 3.5 }
};
function heliType(w) { return w.mil ? 'uh60' : (w.s & 1) ? 'as350' : 'ec135'; }
function smallWreck(c, R, kind) {
  const mil = kind === 'heli' && (c.bio === 'chaos' || R() < 0.35), ht = kind === 'heli' ? HELI[mil ? 'uh60' : 'ec135'] : null;
  const bx = c.ox + ROAD, by = c.oy + ROAD, L = kind === 'cessna' ? 110 : ht.cab + ht.boom + 12, span = kind === 'cessna' ? 150 : ht.cw + 10;
  for (let t = 0; t < 10; t++) {
    const a = R() * TAU, cx = bx + 70 + R() * (BS - 140), cy = by + 70 + R() * (BS - 140), ca = Math.abs(Math.cos(a)), sa = Math.abs(Math.sin(a));
    const hw = (L * ca + span * sa) / 2, hh = (L * sa + span * ca) / 2;
    if (!freeAt(c, cx - hw, cy - hh, hw * 2, hh * 2, 6)) continue;
    c.wrecks = c.wrecks || [];
    const w = { k: kind, x: cx, y: cy, a: a, s: (R() * 1e9) | 0, mil: mil, livery: ['#2f4f6b', '#c9402e', '#e8e6e0', '#1b2a4a', '#d8a22a'][Math.floor(R() * 5)] };
    c.wrecks.push(w); wreckRects(c, w);
    if (R() < 0.75) addFire(c, cx + (R() - 0.5) * 40, cy + (R() - 0.5) * 30, 10 + R() * 8, false);
    GARAGE.wrecks++;
    return w;
  }
  return null;
}
// the solid parts of a wreck, as boxes along its length (so bullets, zombies and you all bump into it); each part's real
// outline is kept too, for its shadow
function wreckRects(c, w) {
  w.parts = [];
  const add = (x0, y0, x1, y1, wd, ht) => {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(len / (wd * 0.9))), nx = -(y1 - y0) / (len || 1) * wd / 2, ny = (x1 - x0) / (len || 1) * wd / 2;
    w.parts.push({ p: [x0 + nx, y0 + ny, x1 + nx, y1 + ny, x1 - nx, y1 - ny, x0 - nx, y0 - ny], h: ht });
    for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; c.rects.push({ x: x - wd / 2, y: y - wd / 2, w: wd, h: wd, k: 'wreck', ht: ht, low: ht < 1.2 }); }
  };
  const ca = Math.cos(w.a), sa = Math.sin(w.a), P = (t, o) => [w.x + ca * t - sa * o, w.y + sa * t + ca * o];
  if (w.k === 'airliner') {
    // (an A320: a 3.95 m fuselage, 4.1 m tall, 37.6 m long; wings of 35.8 m span)
    const f0 = P(240, 0), f1 = P(92, 0), m0 = P(90 - w.gap1, 6), m1 = P(-82 - w.gap1, 6), t0 = P(-82 - w.gap1 - w.gap2, -4), t1 = P(-215 - w.gap1 - w.gap2, -4);
    add(f0[0], f0[1], f1[0], f1[1], 50, 4.1); add(m0[0], m0[1], m1[0], m1[1], 53, 4.1); add(t0[0], t0[1], t1[0], t1[1], 44, 4);
    const wa = P(-w.gap1 - 6, 34), wb = P(-60 - w.gap1, 230); add(wa[0], wa[1], wb[0], wb[1], 40, 1.8);   // the wing still on
    const da = P(40, -120), db = P(-110, -270); add(da[0], da[1], db[0], db[1], 38, 1.6);                 // the one torn off
  } else if (w.k === 'cessna') {
    const a0 = P(45, 0), a1 = P(-55, 0); add(a0[0], a0[1], a1[0], a1[1], 16, 1.8);
    const b0 = P(12, -70), b1 = P(12, 70); add(b0[0], b0[1], b1[0], b1[1], 12, 1.4);
  } else {
    const H = HELI[heliType(w)], f = H.cab * 0.6, bk = -H.cab * 0.4;
    const a0 = P(f, 0), a1 = P(bk, 0); add(a0[0], a0[1], a1[0], a1[1], H.cw, H.ht * 0.85);
    const b0 = P(bk, 0), b1 = P(bk - H.boom, 0); add(b0[0], b0[1], b1[0], b1[1], Math.max(10, H.bw + 2), 1.6);
  }
}
function hull8(P, out) {
  // convex hull of the points in P (x, y pairs), monotone chain; returns the number of points written to out
  const n = P.length / 2, idx = []; for (let i = 0; i < n; i++) idx.push(i);
  idx.sort((a, b) => P[a * 2] - P[b * 2] || P[a * 2 + 1] - P[b * 2 + 1]);
  const H = [], cr = (o, a, b) => (P[a * 2] - P[o * 2]) * (P[b * 2 + 1] - P[o * 2 + 1]) - (P[a * 2 + 1] - P[o * 2 + 1]) * (P[b * 2] - P[o * 2]);
  for (const i of idx) { while (H.length >= 2 && cr(H[H.length - 2], H[H.length - 1], i) <= 0) H.pop(); H.push(i); }
  const lo = H.length + 1; for (let k = idx.length - 2; k >= 0; k--) { const i = idx[k]; while (H.length >= lo && cr(H[H.length - 2], H[H.length - 1], i) <= 0) H.pop(); H.push(i); }
  H.pop(); out.length = 0; for (const i of H) out.push(P[i * 2], P[i * 2 + 1]); return H.length;
}
const WSH = { P: [], H: [] };
function garageSun(m, ux, uy, x0, y0, x1, y1) {
  const k = SCL, mg = 600 * k; let n = 0;
  for (let cx = Math.floor((x0 - mg) / CHS); cx <= Math.floor((x1 + mg) / CHS); cx++) for (let cy = Math.floor((y0 - mg) / CHS); cy <= Math.floor((y1 + mg) / CHS); cy++) {
    const c = chunks.get(cx + ',' + cy); if (!c || !c.wrecks) continue;
    for (const w of c.wrecks) {
      if (!w.parts) continue; const ca = Math.cos(w.a), sa = Math.sin(w.a);
      void ca; void sa;
      for (const pt of w.parts) {
        const P = WSH.P; P.length = 0; const ox = ux * pt.h, oy = uy * pt.h;
        for (let i = 0; i < 8; i += 2) { const x = pt.p[i] * k, y = pt.p[i + 1] * k; P.push(x, y, x + ox, y + oy); }
        const h = hull8(P, WSH.H); if (h < 3) continue;
        const H = WSH.H; if (H[0] > x1 + 50 && H[2] > x1 + 50) continue;
        m.moveTo(H[0], H[1]); for (let i = 2; i < H.length; i += 2) m.lineTo(H[i], H[i + 1]); m.closePath(); n++;
      }
    }
  }
  return n;
}
function drawWrecks(g, c) {
  if (!c.wrecks) return;
  for (const w of c.wrecks) {
    const R = Z.mulberry32(w.s || 3);
    g.save(); g.translate(w.x, w.y); g.rotate(w.a);
    if (w.k === 'airliner') drawAirliner(g, w, R); else if (w.k === 'cessna') drawCessna(g, w, R); else drawHeli(g, w, R);
    g.restore();
  }
}
// scorched ground, a furrow ploughed by the impact, burned patches
function wreckScorch(g, len, wid, R) {
  const gr = g.createLinearGradient(len * 0.7, 0, -len * 0.6, 0); gr.addColorStop(0, 'rgba(12,9,7,0)'); gr.addColorStop(0.3, 'rgba(12,9,7,0.5)'); gr.addColorStop(1, 'rgba(12,9,7,0.35)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, len * 0.75, wid, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(40,30,22,0.55)'; g.lineWidth = 3; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(len * (0.9 + R() * 0.3), (R() - 0.5) * wid * 0.6); g.quadraticCurveTo(len * 0.4, (R() - 0.5) * wid, len * 0.1, (R() - 0.5) * wid * 0.5); g.stroke(); }
  for (let i = 0; i < 8; i++) soot(g, (R() - 0.5) * len * 1.2, (R() - 0.5) * wid * 1.4, 20 + R() * 40, 0.4);
}
function drawAirliner(g, w, R) {
  wreckScorch(g, 360, 180, R);
  const g1 = w.gap1, g2 = w.gap2, body = '#d9dcdf', dark = '#9ea3a8';
  // debris: panels, seats, suitcases, burnt foam
  for (let i = 0; i < 70; i++) { const x = (R() - 0.5) * 520, y = (R() - 0.5) * 300, s = 2 + R() * 7; g.fillStyle = ['#b9bdc2', '#7a7e84', '#2a2c30', '#4a3e5a', '#6a3030', '#a89870', '#1d1e20', '#5a5e64'][Math.floor(R() * 8)]; g.save(); g.translate(x, y); g.rotate(R() * 3); g.fillRect(-s / 2, -s / 3, s, s * 0.66); g.restore(); }
  const seg = (x0, x1, y, wd, nose, tail) => {
    g.save(); g.translate(0, y);
    g.fillStyle = 'rgba(0,0,0,0.35)'; rrect(g, x1 + 4, -wd / 2 + 6, x0 - x1, wd, wd / 2); g.fill();
    g.fillStyle = body; rrect(g, x1, -wd / 2, x0 - x1, wd, nose || tail ? wd / 2 : 2); g.fill();
    const gr = g.createLinearGradient(0, -wd / 2, 0, wd / 2); gr.addColorStop(0, 'rgba(0,0,0,0.25)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0.35)'); g.fillStyle = gr; rrect(g, x1, -wd / 2, x0 - x1, wd, nose || tail ? wd / 2 : 2); g.fill();
    g.fillStyle = w.livery; g.fillRect(x1 + 4, -2, x0 - x1 - 8, 4);
    g.fillStyle = '#1f2a36'; for (let x = x1 + 10; x < x0 - (nose ? 30 : 6); x += 9) { g.fillRect(x, -wd / 2 + 2.5, 4, 2.4); g.fillRect(x, wd / 2 - 4.9, 4, 2.4); }
    if (nose) { g.fillStyle = '#1b2430'; g.beginPath(); g.ellipse(x0 - 16, 0, 8, wd * 0.32, 0, 0, TAU); g.fill(); }
    // the torn ends: a dark ragged opening with frames showing
    const tear = (x, s) => { g.fillStyle = '#100e0c'; g.beginPath(); for (let i = 0; i <= 8; i++) { const yy = -wd / 2 + wd * i / 8, xx = x + s * (2 + R() * 7); if (!i) g.moveTo(xx, yy); else g.lineTo(xx, yy); } g.lineTo(x - s * 3, wd / 2); g.lineTo(x - s * 3, -wd / 2); g.closePath(); g.fill(); g.strokeStyle = '#6a6e74'; g.lineWidth = 1.4; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x - s * (3 + i * 4), -wd / 2); g.lineTo(x - s * (3 + i * 4), wd / 2); g.stroke(); } };
    if (!nose) tear(x0, -1); if (!tail) tear(x1, 1);
    g.restore();
  };
  // wings first, under the fuselage: the attached one, its engine, and the detached one lying further off
  // (swept back 25 degrees: a 6 m root chord tapering to 1.6 m at the tip; the engine nacelle 4.4 m long and 2.4 m across)
  const wing = (x, y, a, len, eng) => {
    g.save(); g.translate(x, y); g.rotate(a); const sw = len * 0.47;
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.moveTo(6, 6); g.lineTo(len + 6, sw + 6); g.lineTo(len + 2, sw + 27); g.lineTo(-6, 86); g.closePath(); g.fill();
    g.fillStyle = dark; g.beginPath(); g.moveTo(0, 0); g.lineTo(len, sw); g.lineTo(len - 4, sw + 21); g.lineTo(-12, 80); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(len, sw); g.lineTo(len - 1, sw + 5); g.lineTo(-2, 8); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 1; g.beginPath(); for (const t of [0.3, 0.55, 0.8]) { g.moveTo(len * t, sw * t + 21 + (1 - t) * 50); g.lineTo(len * t - 6, sw * t + 6); } g.stroke();   // flap tracks
    if (eng) { const ex = len * 0.34, ey = sw * 0.34 - 22; g.fillStyle = '#5a5e64'; rrect(g, ex - 16, ey, 32, 59, 14); g.fill(); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(ex - 10, ey + 6, 6, 44); g.fillStyle = '#16171a'; g.beginPath(); g.ellipse(ex, ey + 2, 13, 4, 0, 0, TAU); g.fill(); }
    g.restore();
  };
  wing(-g1 - 6, 30, 1.45, 210, true);
  wing(40, -120, -1.9, 200, R() < 0.5);
  seg(250, 92, 0, 50, true, false);
  seg(90 - g1, -82 - g1, 6, 53, false, false);
  seg(-82 - g1 - g2, -222 - g1 - g2, -4, 44, false, true);
  // the tail fin lying over (about 6 m), with the airline's colour; the stabilisers (12.5 m across) still on
  const tx = -200 - g1 - g2;
  g.fillStyle = dark; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(tx + 14, -4 + sd * 18); g.lineTo(tx - 10, -4 + sd * 84); g.lineTo(tx - 28, -4 + sd * 84); g.lineTo(tx - 22, -4 + sd * 18); g.closePath(); g.fill(); }
  g.save(); g.translate(tx + 10, -4); g.rotate(w.tw); g.fillStyle = w.livery; g.beginPath(); g.moveTo(0, 0); g.lineTo(-44, -84); g.lineTo(-16, -84); g.lineTo(36, 0); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-20, -62, 14, 9); g.restore();
  for (let i = 0; i < 6; i++) soot(g, (R() - 0.5) * 380, (R() - 0.5) * 60, 18 + R() * 24, 0.35);
}
function drawCessna(g, w, R) {
  wreckScorch(g, 110, 60, R);
  const col = w.livery;
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-50, -66, 40, 140);
  g.fillStyle = '#e8e6e0'; g.save(); g.rotate(0.12); g.fillRect(6, -72, 14, 144); g.fillStyle = col; g.fillRect(6, -72, 14, 6); g.fillRect(6, 66, 14, 6); g.restore();   // the high wing, bent
  g.fillStyle = '#e8e6e0'; rrect(g, -55, -7, 100, 14, 7); g.fill(); g.fillStyle = col; g.fillRect(-50, -1.5, 90, 3);
  g.fillStyle = '#1d2733'; g.fillRect(14, -6, 10, 12);
  g.fillStyle = '#e8e6e0'; g.beginPath(); g.moveTo(-50, 0); g.lineTo(-64, -22); g.lineTo(-56, -22); g.lineTo(-40, 0); g.closePath(); g.fill(); g.beginPath(); g.moveTo(-50, 0); g.lineTo(-64, 22); g.lineTo(-56, 22); g.lineTo(-40, 0); g.closePath(); g.fill();
  g.strokeStyle = '#2a2c30'; g.lineWidth = 2; g.beginPath(); g.moveTo(46, -10); g.quadraticCurveTo(52, 0, 46, 10); g.stroke();   // the bent propeller
  for (let i = 0; i < 14; i++) { g.fillStyle = ['#e8e6e0', '#9ea3a8', col, '#2a2c30'][Math.floor(R() * 4)]; g.fillRect((R() - 0.5) * 160, (R() - 0.5) * 120, 2 + R() * 4, 2 + R() * 3); }
}
function drawHeli(g, w, R) {
  const H = HELI[heliType(w)], t = heliType(w), col = w.mil ? '#3f4632' : t === 'as350' ? (w.livery === '#e8e6e0' ? '#1b2a4a' : '#e8e6e0') : w.livery;
  const f = H.cab * 0.6, bk = -H.cab * 0.4, cw = H.cw, tail = bk - H.boom;
  wreckScorch(g, H.cab + H.boom * 0.5, H.cw * 2.2, R);
  // shadows: the cabin, the boom
  g.fillStyle = 'rgba(0,0,0,0.35)'; rrect(g, bk + 4, -cw / 2 + 5, H.cab, cw, cw * 0.45); g.fill(); g.fillRect(tail + 4, -H.bw / 2 + 4, H.boom, H.bw);
  // the tail boom, its fin and the tail rotor (or the fenestron's ring)
  g.fillStyle = vShade(col, -0.15); rrect(g, tail, -H.bw / 2, H.boom + 6, H.bw, H.bw / 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(tail + 4, -H.bw / 2 + 1, H.boom - 6, H.bw * 0.25);
  if (H.fen) { g.fillStyle = col; g.beginPath(); g.ellipse(tail + 4, 0, 9, H.tr * 0.7, 0, 0, TAU); g.fill(); g.fillStyle = '#16171a'; g.beginPath(); g.ellipse(tail + 4, 0, 5, H.tr * 0.45, 0, 0, TAU); g.fill(); }
  else { g.fillStyle = col; g.fillRect(tail - 4, -H.bw * 0.8, 10, H.bw * 1.6); g.strokeStyle = '#2a2c30'; g.lineWidth = 2; g.beginPath(); g.moveTo(tail - 1, -H.tr / 2); g.lineTo(tail - 1, H.tr / 2); g.stroke(); }
  // horizontal stabiliser
  g.fillStyle = vShade(col, -0.25); g.fillRect(tail + 8, -H.bw * (t === 'uh60' ? 2.4 : 1.8), 8, H.bw * (t === 'uh60' ? 4.8 : 3.6));
  // the cabin: rounded nose, a cockpit glazed across the front, the engine cowling and exhausts on top
  g.fillStyle = col; rrect(g, bk, -cw / 2, H.cab, cw, cw * 0.45); g.fill();
  const gr = g.createLinearGradient(0, -cw / 2, 0, cw / 2); gr.addColorStop(0, 'rgba(0,0,0,0.3)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.15)'); gr.addColorStop(1, 'rgba(0,0,0,0.35)'); g.fillStyle = gr; rrect(g, bk, -cw / 2, H.cab, cw, cw * 0.45); g.fill();
  g.fillStyle = '#1b2531'; g.beginPath(); g.ellipse(f - cw * 0.42, 0, cw * 0.4, cw * 0.42, 0, -1.25, 1.25); g.fill();
  g.fillStyle = 'rgba(170,210,235,0.25)'; g.beginPath(); g.ellipse(f - cw * 0.42, -cw * 0.08, cw * 0.32, cw * 0.18, 0, -1, 0.4); g.fill();
  g.fillStyle = vShade(col, -0.1); rrect(g, bk + H.cab * 0.15, -cw * 0.28, H.cab * 0.42, cw * 0.56, 4); g.fill();
  g.fillStyle = '#24262a'; g.fillRect(bk + H.cab * 0.12, -cw * 0.2, 4, cw * 0.14); g.fillRect(bk + H.cab * 0.12, cw * 0.06, 4, cw * 0.14);
  if (w.mil) { g.fillStyle = '#2a2d22'; g.fillRect(bk + H.cab * 0.2, -cw / 2 - 1, H.cab * 0.36, 3); g.fillRect(bk + H.cab * 0.2, cw / 2 - 2, H.cab * 0.36, 3); }   // the cabin doors' rails
  else { g.fillStyle = t === 'as350' ? '#2f6fb0' : '#e8e6e0'; g.fillRect(bk + 4, -2, H.cab - 14, 4); if (t === 'as350') { g.fillStyle = '#e8e6e0'; g.font = 'bold 7px sans-serif'; g.save(); g.rotate(Math.PI / 2); g.fillText('POLICE', -12, -bk - H.cab * 0.55); g.restore(); } }
  // skids (wheels on the Black Hawk)
  if (w.mil) { g.fillStyle = '#121314'; for (const [x, y] of [[f - 14, -cw / 2 - 3], [f - 14, cw / 2 - 1], [tail + 14, -2]]) g.fillRect(x - 5, y, 10, 4); }
  else { g.fillStyle = '#2a2c30'; g.fillRect(bk + 4, -cw / 2 - 4, H.cab * 0.72, 2.6); g.fillRect(bk + 4, cw / 2 + 1.4, H.cab * 0.72, 2.6); }
  // the main rotor: its hub over the cabin and the blades, some snapped off short and some bent where they hit the ground
  const hx = bk + H.cab * 0.42; g.fillStyle = '#26282b'; g.beginPath(); g.arc(hx, 0, 5, 0, TAU); g.fill();
  g.strokeStyle = '#1e2023'; g.lineWidth = t === 'uh60' ? 5 : 3.6; g.lineCap = 'round'; g.beginPath();
  const a0 = (w.s % 628) / 100;
  for (let i = 0; i < H.nb; i++) {
    const a = a0 + i * TAU / H.nb, k = R(), L = k < 0.3 ? H.rr * (0.25 + R() * 0.3) : H.rr * (0.85 + R() * 0.15), bend = k > 0.65 ? (R() - 0.5) * 1.2 : 0;
    g.moveTo(hx, 0); if (bend) g.quadraticCurveTo(hx + Math.cos(a) * L * 0.55, Math.sin(a) * L * 0.55, hx + Math.cos(a + bend) * L, Math.sin(a + bend) * L); else g.lineTo(hx + Math.cos(a) * L, Math.sin(a) * L);
  }
  g.stroke(); g.lineCap = 'butt';
  for (let i = 0; i < 12; i++) { g.fillStyle = [col, '#2a2c30', '#9ea3a8'][Math.floor(R() * 3)]; g.fillRect((R() - 0.5) * (H.cab + H.boom) * 1.2, (R() - 0.5) * H.rr, 2 + R() * 5, 2 + R() * 3); }
}

coreAdd({
  name: 'GARAGE', kind: 'world', does: 'Vehicle engine: 22 kinds of vehicle with liveries, burned and rolled wrecks, working headlights, hazards and light bars, reflective glass, and rare crashed airliners, light planes and helicopters.',
  state: () => 'on', level: () => GARAGE.wrecks + ' wrecks in the city'
});
// CORE v3: a ladder for the headlights (both beams' shadows off and the tail glow dropped when the frame runs late at
// night with many lit cars in view), climbed back when there is room; its cost by how many lit cars it lights
coreMeta('GARAGE', { ver: 2, trimAny: true, climb: true, provides: ['vehicles', 'headlights'],
  lv: () => GARAGE.adapt + 1, adaptGet: () => GARAGE.adapt, loadNow: () => GARAGE.beams | 0, loadName: 'lit cars',
  canTrim: () => GARAGE.adapt > -1 && GARAGE.beams > 0, trim: () => { if (GARAGE.adapt <= -1) return false; GARAGE.adapt--; return true; },
  boost: () => { if (GARAGE.adapt >= 0) return false; GARAGE.adapt++; return true; },
  check: () => { for (const r of SWDYN.values()) if (!(r.x === r.x && r.y === r.y)) return 'a vehicle the crowd moved lost its place'; return ''; },
  repair: () => { for (const r of SWDYN.values()) if (!(r.x === r.x && r.y === r.y)) { r.x = r.ox0 || 0; r.y = r.oy0 || 0; r.vx = r.vy = 0; } } });
