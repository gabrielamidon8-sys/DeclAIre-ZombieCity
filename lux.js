/* ================= LUX: the lighting engine =================
   Real lighting for the city, in its own small engine. Every lamp, fire, muzzle flash, explosion and the flashlight in
   your hand is a light that casts rays: each ray runs out until it hits a wall or a parked car, the hit points make a
   visibility shape, and only that shape is lit. Buildings throw real shadows, a doorway or an alley leaves a dark
   wedge, and a gunshot lights the street around you for a moment, brighter where nothing is in the way. The lit
   shapes are painted into a light map; the map darkens everything the light does not reach (so night is dark and the
   lamps matter), adds a glow, and a soft bloom around anything bright.
   The day has a sun: a run starts in the morning and the light moves through noon, golden dusk and night, with
   shorter winter days and a gentler or deeper night (Time of day in the settings).
   It looks after itself. It measures what it costs every second and trades rays, shadow-casting lights, resolution
   and bloom against the frame rate, climbing back when the device has room. A light that comes out broken (not a
   number, no shape) is dropped on its own; a canvas that is lost or the wrong size is rebuilt; a burst of errors
   restarts the engine with fewer features, and if it keeps failing it switches itself off for a minute and tries
   again. Nothing here is allowed to stop the game from drawing. */
// levels: 0 simple glow (no shadows) · 1 few shadows · 2 shadows and bloom · 3 more rays, soft edges · 4 everything
const LUXQ = [
  { res: 0.3, rays: 0, shade: 0, lights: 10, bloom: 0, soft: 0 },
  { res: 0.36, rays: 44, shade: 4, lights: 12, bloom: 0, soft: 0 },
  { res: 0.5, rays: 72, shade: 8, lights: 18, bloom: 1, soft: 0 },
  { res: 0.6, rays: 110, shade: 12, lights: 26, bloom: 2, soft: 1 },
  { res: 0.75, rays: 160, shade: 18, lights: 36, bloom: 2, soft: 2 }
];
const LUX = {
  live: false, lvl: 2, adapt: 0, day: 1, hour: 12, h0: 11, amb: [1, 1, 1], mul: false,
  ms: 0, msAvg: 0, msT: 0, budget: 3, errT: [], bad: 0, offUntil: 0, level: 0, repairs: 0, fails: 0, lastErr: '',
  A: null, ag: null, M: null, mg: null, B1: null, b1: null, B2: null, b2: null, cw: 0, ch: 0, res: 0, fx: [], lights: [], n: 0, shaded: 0, rays: 0,
  occ: new Float32Array(4 * 160), occE: new Uint8Array(160), nocc: 0, view: [0, 0, 0, 0], cand: [], G1: null, g1: null, ang: new Float32Array(1600), pts: new Float32Array(3300), spr: new Map(), probe: 0,
  S: null, sg: null, fin: [], fz: [], ff: [], hp: [], hh: [], tr: null, beams: []
};
const LUX_RISE = [6, 5.5, 6.5, 7.5], LUX_SET = [19, 20.5, 18, 16.5];   // sunrise and sunset by season
const LUX_NIGHT = [[0.27, 0.37, 0.62], [0.2, 0.29, 0.54]];            // how dark the night is: gentle, deeper
const luxSmooth = x => x * x * (3 - 2 * x);

// the hour of the day (0 to 24)
function luxHourNow() {
  const sea = WORLD.season, rise = LUX_RISE[sea], set = LUX_SET[sea], m = SET.tod || 'cycle';
  if (G.mode === 'title') return set - 0.7;                       // the title screen waits in the golden hour
  if (m === 'day') return 13; if (m === 'dusk') return set - 0.7; if (m === 'dawn') return rise + 0.35; if (m === 'night') return 23.2;
  if (m === 'real') { const d = new Date(); return d.getHours() + d.getMinutes() / 60; }
  // a day lasts about ten minutes of play; the run's morning hour comes from the city's seed, so co-op players share it
  if (LUX.h0s !== WORLD.seed) { LUX.h0s = WORLD.seed; LUX.h0 = 8.5 + ((WORLD.seed >>> 0) % 551) / 100; }
  return (LUX.h0 + G.time / 24) % 24;
}
// how bright the world is without any lamp: a colour to multiply the picture by
function luxAmbient(out) {
  const sea = WORLD.season, rise = LUX_RISE[sea], set = LUX_SET[sea], h = LUX.hour;
  let e;                                                         // the sun's height: 1 at noon, below 0 at night
  if (h >= rise && h <= set) e = Math.sin((h - rise) / (set - rise) * Math.PI);
  else { const nl = 24 - (set - rise), t = h > set ? h - set : h + 24 - set; e = -Math.sin(t / nl * Math.PI) * 0.6; }
  // day: how far toward full daylight · tw: how golden (the sun low on the horizon, just before and after it is down)
  const day = luxSmooth(clamp((e + 0.1) / 0.4, 0, 1)), tw = clamp(1 - Math.abs(e - 0.08) / 0.3, 0, 1);
  const N = LUX_NIGHT[SET.nightDark === 'deep' ? 1 : 0];
  let r = N[0] + (1 - N[0]) * day, g = N[1] + (1 - N[1]) * day, b = N[2] + (1 - N[2]) * day;
  r = Math.min(1, r * (1 + 0.1 * tw)); g *= 1 - 0.2 * tw; b *= 1 - 0.4 * tw;      // golden at the edges of the day
  const k = clamp(1 - WX.dark * 0.8 - bioK('ash') * 0.07, 0.35, 1), fl = WX.flash > 0.01 ? WX.flash * 0.7 : 0;
  out[0] = Math.min(1, r * k + fl); out[1] = Math.min(1, g * k + fl); out[2] = Math.min(1, b * k + fl);
  LUX.day = day;
  return out;
}

/* ---------- transient lights: muzzle flashes, blasts, strikes ---------- */
// x, y: where · r: how far it reaches · col: 'r,g,b' · i: strength · life: seconds · o.shade: cast shadows
function luxFlash(x, y, r, col, i, life, o) {
  if (SET.lux === 'off') return;
  const a = LUX.fx; if (a.length > 28) a.shift();
  a.push({ x: x, y: y, r: r, col: col, i: i, life: life, max: life, shade: !!(o && o.shade), cone: o && o.cone, hgt: o && o.hgt });
}

/* ---------- canvases ---------- */
function luxCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(2, w); c.height = Math.max(2, h); return c; }
function luxBuild() {
  const lq = LUXQ[LUX.level], cw = Math.max(2, Math.round(cv.width * lq.res)), ch = Math.max(2, Math.round(cv.height * lq.res));
  LUX.A = luxCanvas(cw, ch); LUX.ag = LUX.A.getContext('2d'); LUX.M = luxCanvas(cw, ch); LUX.mg = LUX.M.getContext('2d');
  LUX.B1 = luxCanvas(Math.ceil(cw / 3), Math.ceil(ch / 3)); LUX.b1 = LUX.B1.getContext('2d');
  LUX.B2 = luxCanvas(Math.ceil(cw / 9), Math.ceil(ch / 9)); LUX.b2 = LUX.B2.getContext('2d');
  // rain and snow glints: thin streaks need less than the light map's resolution
  const gk = Math.min(lq.res, 0.4) / lq.res;
  LUX.G1 = luxCanvas(Math.max(2, Math.round(cw * gk)), Math.max(2, Math.round(ch * gk))); LUX.g1 = LUX.G1.getContext('2d');
  LUX.S = luxCanvas(cw, ch); LUX.sg = LUX.S.getContext('2d');   // scratch: one light at a time, before its short shadows are cut out
  if (!LUX.ag || !LUX.mg || !LUX.b1 || !LUX.b2 || !LUX.g1 || !LUX.sg) throw new Error('lux: no canvas context');
  LUX.cw = cw; LUX.ch = ch; LUX.res = lq.res; LUX.cvw = cv.width; LUX.cvh = cv.height;
}
// can this device multiply one picture by another? (every current browser can; this is the check)
function luxProbe() {
  try {
    const a = luxCanvas(2, 2), g = a.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 2, 2);
    const b = luxCanvas(2, 2), h = b.getContext('2d'); h.fillStyle = '#808080'; h.fillRect(0, 0, 2, 2);
    g.globalCompositeOperation = 'multiply'; g.drawImage(b, 0, 0);
    const d = g.getImageData(0, 0, 1, 1).data; return d[0] > 100 && d[0] < 156;
  } catch (e) { return false; }
}

/* ---------- gathering the lights ---------- */
// the colour of each kind of street lamp: high-pressure sodium (orange), LED (cool white), metal halide (warm white)
const LAMP = [255, 172, 88], LAMPC = [222, 233, 255], LAMP_T = { sodium: [255, 172, 88], led: [222, 233, 255], halide: [255, 242, 220] };
// hgt: how high the light hangs (metres). Anything taller than the light blocks it outright (walls, buildings); anything
// shorter throws a shadow of its own height (a car under a street lamp, a zombie in front of a fire)
function luxPush(x, y, r, c0, c1, c2, i, shade, pr, cone, hgt) {
  if (!(r > 1) || !(i > 0.004) || !isFinite(x + y + r + i)) return;
  const V = LUX.view; if (x + r < V[0] || x - r > V[2] || y + r < V[1] || y - r > V[3]) return;   // its light never reaches the screen
  const a = LUX.lights, n = LUX.n++;
  const L = a[n] || (a[n] = { x: 0, y: 0, r: 0, c0: 0, c1: 0, c2: 0, i: 0, shade: false, pr: 0, cone: null, d: 0, hgt: 2 });
  L.x = x; L.y = y; L.r = r; L.c0 = c0; L.c1 = c1; L.c2 = c2; L.i = i; L.shade = shade; L.pr = pr; L.cone = cone || null; L.hgt = hgt || 2;
  const dx = x - cam.x, dy = y - cam.y; L.d = dx * dx + dy * dy - pr * 1e6;
}
// the lit windows of a block, worked out once per block: a few points on the sidewalk in front of buildings that still
// have power. Ruined, burnt and ash districts are dark; the chaos district buzzes with broken neon.
const SPILL = { city: [0.55, [[255, 206, 150], [255, 190, 120], [190, 220, 255]]], suburb: [0.45, [[255, 196, 130], [255, 214, 160]]], chaos: [0.35, [[255, 60, 230], [80, 255, 120], [60, 220, 255], [255, 200, 120]]], snow: [0.4, [[255, 196, 130]]], desert: [0.25, [[255, 190, 120]]] };
function luxSpill(c) {
  const S = SPILL[c.bio], out = []; if (!S) return out;
  const R = Z.mulberry32(Z.hash32(c.cx * 92821 + c.cy * 68917 + 0x5b11)), k = c.k, bx = (c.ox + ROAD) * k, by = (c.oy + ROAD) * k, bs = BS * k, near = 70 * k;
  for (const r of c.rects) {
    if (r.k !== 'b' || r.burn || r.st === 'ruin') continue;
    const sides = [];
    if (r.y - by < near) sides.push(0); if (by + bs - (r.y + r.h) < near) sides.push(1); if (r.x - bx < near) sides.push(2); if (bx + bs - (r.x + r.w) < near) sides.push(3);
    if (!sides.length) continue;
    // along each street-facing wall, a window or a shop front every 5 to 9 metres, lit or not
    for (const sd of sides) {
      const len = sd < 2 ? r.w : r.h;
      for (let at = (20 + R() * 50) * k; at < len - 15 * k; at += (70 + R() * 50) * k) {
        if (R() > S[0]) continue;
        const off = 12 * k, x = sd < 2 ? r.x + at : sd === 2 ? r.x - off : r.x + r.w + off, y = sd >= 2 ? r.y + at : sd === 0 ? r.y - off : r.y + r.h + off;
        const col = S[1][Math.floor(R() * S[1].length)];
        out.push({ x: x, y: y, r: (70 + R() * 50) * k, c0: col[0], c1: col[1], c2: col[2], i: 0.3 + R() * 0.22, fl: c.bio === 'chaos' && R() < 0.5 });
        if (out.length > 60) return out;
      }
    }
  }
  return out;
}
function luxGather(x0, y0, x1, y1, dt) {
  LUX.n = 0; const V = LUX.view; V[0] = x0 - 40; V[1] = y0 - 40; V[2] = x1 + 40; V[3] = y1 + 40;
  const t = G.time, night = 1 - LUX.day, m = 520, uk = 0.45 + 0.55 * SCL / SCALE_REAL;
  // street lamps, burning roofs and police lights from the blocks in and around the view
  const cx0 = Math.floor((x0 - m) / CHS), cx1 = Math.floor((x1 + m) / CHS), cy0 = Math.floor((y0 - m) / CHS), cy1 = Math.floor((y1 + m) / CHS);
  for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
    const c = chunks.get(cx + ',' + cy); if (!c) continue;
    if (!c.lights) c.lights = lightsOf(cx, cy);
    for (let j = 0; j < c.lights.length; j++) {
      const L = c.lights[j]; if (L.x < x0 - m || L.x > x1 + m || L.y < y0 - m || L.y > y1 + m) continue;
      let k = 1;
      if (L.broken) { const f = Math.sin(t * 13 + L.x) + Math.sin(t * 7.3 + L.y * 0.01); k = f > 1.2 ? 0.8 : 0; if (!k) continue; }
      const col = LAMP_T[L.type] || (L.cold ? LAMPC : LAMP);
      // the lamps come on at dusk (a cloudy, stormy day turns them on early) and are off in daylight
      const on = clamp((night + WX.dark * 0.5 - 0.12) / 0.3, 0, 1); if (on <= 0) continue;
      // the light hangs from the head at the end of the arm, out over the road; highway lamps stand higher and reach further
      if (L.hw) luxPush(L.x, L.y, 210 * SCL, col[0], col[1], col[2], (0.5 + 0.4 * night) * on, true, 0, null, 12);
      else luxPush(L.hx == null ? L.x : L.hx, L.hy == null ? L.y : L.hy, 150 * SCL, col[0], col[1], col[2], (0.55 + 0.45 * night) * k * on, true, 0, null, 7);
    }
    if (!c.luxR) c.luxR = c.rects.filter(r => r.burn);
    if (typeof garageLights === 'function') garageLights(c, x0, y0, x1, y1, m, t, night, uk);
    // windows and shop fronts: the city still has power in places, and its light spills onto the sidewalk at night
    if (night > 0.05) {
      if (!c.spill) c.spill = luxSpill(c);
      for (let j = 0; j < c.spill.length; j++) {
        const L = c.spill[j]; if (L.x < x0 - m || L.x > x1 + m || L.y < y0 - m || L.y > y1 + m) continue;
        let k = night;
        if (L.fl) { const f = Math.sin(t * 9 + L.x) + Math.sin(t * 23.7 + L.y * 0.03); if (f > 1.4) k *= 0.15; }
        luxPush(L.x, L.y, L.r, L.c0, L.c1, L.c2, L.i * k, false, -1, null, 2.5);
      }
    }
    for (const r of c.luxR) {
      if (r.burn && r.x < x1 + m && r.x + r.w > x0 - m && r.y < y1 + m && r.y + r.h > y0 - m) {
        const fl = 0.75 + 0.25 * Math.sin(t * 11 + r.x * 0.01) + 0.1 * Math.sin(t * 23 + r.y);
        luxPush(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.55 + 200, 255, 120, 44, 0.8 * fl, false, 0, null, 12);
      }
    }
  }
  // fires
  for (const f of WD.fires) {
    if (f.x < x0 - m || f.x > x1 + m || f.y < y0 - m || f.y > y1 + m || f.lit === 0) continue;
    const fl = 0.78 + 0.22 * Math.sin(t * 12 + f.ph * 5) + 0.1 * Math.sin(t * 29 + f.ph);
    luxPush(f.x, f.y, f.r * 3.3 + 150, 255, 128 + 16 * Math.sin(t * 7 + f.ph), 48, 0.95 * fl, true, 0, null, 1.3);
  }
  for (const a of (G.alarms || [])) {
    if (!a.r || a.r.x < x0 - m || a.r.x > x1 + m) continue;
    const ph = Math.floor(t * 5) % 2; luxPush(a.r.x + a.r.w / 2, a.r.y + a.r.h / 2, 190 * uk, 255, ph ? 230 : 150, ph ? 120 : 60, 0.7, false, 0, null, 1);
  }
  // hazards that glow
  for (const h of G.haz) {
    if (h.x < x0 - m || h.x > x1 + m || h.y < y0 - m || h.y > y1 + m) continue;
    const f = clamp(h.life / h.max * 2, 0, 1);
    if (h.k === 'fire') luxPush(h.x, h.y, h.r * 2.8 + 90, 255, 128, 44, 0.8 * f * (0.8 + 0.2 * Math.sin(t * 17 + h.x)), false, 0, null, 1);
    else if (h.k === 'acid') luxPush(h.x, h.y, h.r * 2.2 + 60, 150, 255, 70, 0.55 * f, false, 0, null, 0.3);
    else if (h.k === 'ice') luxPush(h.x, h.y, h.r * 2.2 + 60, 150, 220, 255, 0.55 * f, false, 0, null, 0.3);
    else if (h.k === 'spore') luxPush(h.x, h.y, h.r * 2 + 60, 190, 215, 100, 0.35 * f, false, 0, null, 0.5);
    else if (h.k === 'vortex') luxPush(h.x, h.y, h.r * 1.6, 150, 90, 255, 0.5 * f, false, 0, null, 1);
  }
  // flames from a flamethrower
  let nf = 0;
  for (let i = 0; i < G.bullets.length && nf < 4; i += 3) { const b = G.bullets[i]; if (b.kind === 'flame') { nf++; luxPush(b.x, b.y, 230 * uk, 255, 140, 56, 0.7, false, 0, null, 1); } }
  // flashes
  const a = LUX.fx;
  for (let i = a.length - 1; i >= 0; i--) {
    const e = a[i]; e.life -= dt; if (e.life <= 0) { a.splice(i, 1); continue; }
    if (e.x < x0 - m || e.x > x1 + m || e.y < y0 - m || e.y > y1 + m) continue;
    const f = e.life / e.max, k = f * f * (3 - 2 * f), cc = e.col.split(',');
    luxPush(e.x, e.y, e.r * (0.7 + 0.3 * k), +cc[0], +cc[1], +cc[2], e.i * k, e.shade, 2, e.cone, e.hgt || 1.4);
  }
  // glowing zombies (the zombie glow engine), or else just the bosses
  if (!(typeof auraLights === 'function' && auraLights(x0, y0, x1, y1, m, t))) for (const z of G.zs) {
    if (z.dead || !z.boss || z.x < x0 - m || z.x > x1 + m || z.y < y0 - m || z.y > y1 + m) continue;
    const el = z.rb && z.rb.def && z.rb.def.el, col = el === 'fire' ? [255, 110, 40] : el === 'ice' ? [140, 210, 255] : el === 'toxic' || el === 'poison' ? [150, 240, 70] : el === 'shock' || el === 'volt' ? [255, 240, 110] : el === 'void' ? [160, 90, 255] : [255, 90, 70];
    luxPush(z.x, z.y, z.r * 5 + 120, col[0], col[1], col[2], 0.55, false, 0, null, 2);
  }
  // you: a flashlight and a small glow, so you are never lost in the dark
  const p = G.p;
  if (p && G.mode !== 'title' && !p.down && night > 0.04) {
    const aim = p.aim, rr = 6 * PK;
    luxPush(p.x, p.y, 120 * PK + 30, 255, 232, 190, 0.5 * night, false, 3, null, 1.5);
    // 1.9.993: the light is on the gun: it starts at the muzzle and points where the gun really points (LEGEND v2 says
    // where that is); relaxed, the gun is low, so the beam is short and wide on the ground ahead; engaged, it throws
    // long and tight; a reload or a swap drops it; sprinting it swings across with the carried gun
    const A = p.arm, f = A ? (A.focus || 0) : 1, ga = p.lgAim != null ? p.lgAim : aim, st = A ? A.st : '';
    let ox = p.x + Math.cos(aim) * rr, oy = p.y + Math.sin(aim) * rr;
    if (p.lgMx != null && A) { const c = Math.cos(aim), s = Math.sin(aim), lx = p.lgLx != null ? p.lgLx : p.lgMx, ly = p.lgLx != null ? p.lgLy : p.lgMy; ox = p.x + (c * lx - s * ly) * PK; oy = p.y + (s * lx + c * ly) * PK; }
    // 1.9.996: from the light on the rail, along the barrel as it is held (low ready points it at the ground just ahead)
    const gb = p.lgBeam != null && A ? p.lgBeam : ga;
    // (a barrel pointed steeply at the ground, as in the sprint's muzzle-down carry, throws a short wide pool by his feet
    // rather than a long cone: the reach follows how much of the bore lies level, p.lgBeamD)
    const bd = p.lgBeamD != null && A ? clamp(p.lgBeamD, 0, 1) : 1;
    const low = st === 'reload' || st === 'swapOut' || st === 'swapIn' ? 0.5 : st === 'sprint' ? 0.75 : 1, reach = 330 * (0.55 + 0.45 * SCL) * (A ? 0.7 + 0.42 * f : 1) * (0.28 + 0.72 * bd * bd);
    luxPush(ox, oy, reach, 255, 244, 228, 0.95 * night * low, true, 3, { a: gb, h: (A ? 0.6 - 0.25 * f : 0.46) + 0.35 * (1 - bd), beam: 1 }, 1.2);
  }
  if (NET.started) {
    const each = NET.role === 'host' ? Array.from(NET.peers.values()).map(q => q.p).filter(Boolean) : Array.from(NET.others.values());
    for (const q of each) if (q && !q.down && night > 0.04 && q.x > x0 - m && q.x < x1 + m && q.y > y0 - m && q.y < y1 + m) {
      luxPush(q.x, q.y, 110, 255, 232, 190, 0.45 * night, false, 1, null, 1.5);
      if (q.aim != null) { const qa = q.lgBeam != null ? q.lgBeam : q.lgAim != null ? q.lgAim : q.aim, qf = q.arm ? (q.arm.focus || 0) : 1, c = Math.cos(q.aim), sn = Math.sin(q.aim), qx = q.lgLx != null ? q.x + (c * q.lgLx - sn * q.lgLy) * PK : q.x + c * 6, qy = q.lgLx != null ? q.y + (sn * q.lgLx + c * q.lgLy) * PK : q.y + sn * 6; luxPush(qx, qy, 420 * (q.arm ? 0.7 + 0.42 * qf : 1), 255, 242, 222, 0.7 * night, true, 1, { a: qa, h: q.arm ? 0.6 - 0.25 * qf : 0.44, beam: 1 }, 1.2); }
    }
  }
}

/* ---------- rays ---------- */
// the walls near a light, as boxes, from the same lists the game collides with. H: the light's height. What stands taller
// than the light blocks it outright (its shadow runs on to the edge of the light's reach); what is shorter goes on a
// second list (LUX.fin) and throws a shadow as long as its height allows (luxFinite).
// ents: bodies count too: zombies taller than the light block it, the rest (and players, props, trees and bushes) throw
// short shadows of their own
const LUX_PH = { barrel: 0.9, cone: 0.7, can: 1, tire: 0.3, crate: 0.8 };
const LUXOC = [0, 0, 0, 0, 0, 0, -1];
function luxOcc(lx, ly, R, ents, H) {
  H = H || 99;
  // the same light asking again this frame (the check before drawing, then the trace itself): nothing to redo
  const C = LUXOC; if (C[0] === lx && C[1] === ly && C[2] === R && C[3] === ents && C[4] === H && C[5] === LUX.noFin && C[6] === LUX.fn) return LUX.nocc;
  C[0] = lx; C[1] = ly; C[2] = R; C[3] = ents; C[4] = H; C[5] = LUX.noFin; C[6] = LUX.fn;
  // a light with no budget left for short shadows treats everything as a wall, as the engine always did
  if (LUX.noFin) H = 0.01;
  const rs = rectsNear(lx, ly, R), o = LUX.occ, cand = LUX.cand, fin = LUX.fin; let n = 0;
  cand.length = 0; fin.length = 0;
  for (let i = 0; i < rs.length; i++) {
    const r = rs[i]; if (r.k === 'rail' || r.k === 'bridge' || r.k === 'deck') continue;
    if (lx > r.x && lx < r.x + r.w && ly > r.y && ly < r.y + r.h) continue;      // a light inside a box is not blocked by it
    let h = r.k === 'trunk' ? 4 : luxHeight(r);
    if (!h) { if (r.low) continue; h = 2.5; }
    if (h >= H * 0.98) { if (r.w < 8 && r.h < 8) continue; cand.push(r); }
    else if (fin.length < 70) fin.push(r);
  }
  // too many walls in reach (a big flash in a dense block): keep the nearest, they hide the rest anyway
  if (cand.length > 160) {
    for (const r of cand) { const nx = clamp(lx, r.x, r.x + r.w), ny = clamp(ly, r.y, r.y + r.h); r._ld = (nx - lx) * (nx - lx) + (ny - ly) * (ny - ly); }
    cand.sort((a, b) => a._ld - b._ld); cand.length = 160;
  }
  const E = LUX.occE;
  for (const r of cand) { const k = n * 4; o[k] = r.x; o[k + 1] = r.y; o[k + 2] = r.x + r.w; o[k + 3] = r.y + r.h; E[n] = 0; n++; }
  const fz = LUX.fz, ff = LUX.ff; fz.length = 0; ff.length = 0;
  if (ents && n < 150 && !LUX.noFin) {
    // a zombie taller than the light is lit on the side facing it and blocks it (rays stop where they leave its body)
    const R2 = R * R; let ne = 0;
    near(lx, ly, R, z => {
      if (z.dead || z.fly || (z.st && z.st.under) || z.illusion) return;
      const dx = z.x - lx, dy = z.y - ly, d2 = dx * dx + dy * dy, h = z.r * 0.7;
      if (d2 > R2 || d2 < (h + 2) * (h + 2)) return;
      const zh = 1.7 * clamp(z.r / (14 * ZK), 0.75, 3.2);
      if (zh >= H * 0.98) { if (ne < 28 && n < 160) { const k = n * 4; o[k] = z.x - h; o[k + 1] = z.y - h; o[k + 2] = z.x + h; o[k + 3] = z.y + h; E[n] = 1; n++; ne++; } }
      else if (fz.length < 40) fz.push({ x: z.x, y: z.y, rho: h, h: zh });
    });
    const body = (q, own) => { if (!q || q.down || own) return; const dx = q.x - lx, dy = q.y - ly; if (dx * dx + dy * dy > R2 || dx * dx + dy * dy < 100) return; fz.push({ x: q.x, y: q.y, rho: (q.r || 9 * PK) * 0.75, h: 1.75 }); };
    if (G.p && G.mode !== 'title') body(G.p, LUX.ownLight);
    if (NET.started) { const each = NET.role === 'host' ? Array.from(NET.peers.values()).map(q => q.p) : Array.from(NET.others.values()); for (const q of each) body(q, false); }
    for (const pr of WD.props) { if (pr.dead) continue; const dx = pr.x - lx, dy = pr.y - ly; if (dx * dx + dy * dy > R2) continue; fz.push({ x: pr.x, y: pr.y, rho: pr.r, h: LUX_PH[pr.k] || 0.8 }); }
    // trees and bushes: leaves let some light through
    for (const d of WD.act) {
      if (d.k === 'grass') continue; const dx = d.x - lx, dy = d.y - ly; if (dx * dx + dy * dy > R2) continue;
      if (d.k === 'tree') { if (H > 4.2) ff.push({ x: d.x, y: d.y, rho: d.r * 0.82, h: 3.6, a: 0.42 }); }
      else ff.push({ x: d.x, y: d.y, rho: d.r * 0.9, h: 1.1, a: 0.62 });
    }
  }
  LUX.nocc = n; return n;
}
function luxCast(lx, ly, R, dx, dy) {
  const o = LUX.occ, E = LUX.occE, n = LUX.nocc; let t = R;
  for (let i = 0; i < n; i++) {
    const k = i * 4; let t0 = 0, t1 = t;
    if (dx > 1e-9 || dx < -1e-9) { const inv = 1 / dx; let a = (o[k] - lx) * inv, b = (o[k + 2] - lx) * inv; if (a > b) { const s = a; a = b; b = s; } if (a > t0) t0 = a; if (b < t1) t1 = b; }
    else if (lx < o[k] || lx > o[k + 2]) continue;
    if (t0 > t1) continue;
    if (dy > 1e-9 || dy < -1e-9) { const inv = 1 / dy; let a = (o[k + 1] - ly) * inv, b = (o[k + 3] - ly) * inv; if (a > b) { const s = a; a = b; b = s; } if (a > t0) t0 = a; if (b < t1) t1 = b; }
    else if (ly < o[k + 1] || ly > o[k + 3]) continue;
    if (t0 <= t1 && t0 > 0) { const hit = E[i] ? t1 : t0; if (hit < t) t = hit; }
  }
  return t;
}
// the shape a light can see: rays toward the corners of every wall (so the edges of shadows are sharp) plus an even
// fan around. Returns the number of points written to LUX.pts (x, y pairs).
function luxPoly(lx, ly, R, rays, a0, a1, ents, H) {
  if (!isFinite(a0) || !isFinite(a1)) { a0 = 0; a1 = 6.2832; }
  const n = luxOcc(lx, ly, R, ents, H), A = LUX.ang; let na = 0, full = a1 - a0 >= 6.28;
  for (let i = 0; i < rays && na < 1500; i++) A[na++] = a0 + (a1 - a0) * (i / (rays - (full ? 0 : 1)));
  const o = LUX.occ, R2 = R * R * 1.3;
  for (let i = 0; i < n && na < 1590; i++) {
    const k = i * 4;
    for (let c = 0; c < 4; c++) {
      const vx = (c & 1 ? o[k + 2] : o[k]) - lx, vy = (c & 2 ? o[k + 3] : o[k + 1]) - ly;
      if (vx * vx + vy * vy > R2) continue;
      const an = Math.atan2(vy, vx);
      for (const d of [-0.0009, 0.0009]) {
        let q = an + d;
        // into the beam's turn (one modulo, never a loop: an aim angle can grow large over a long run)
        if (!full) { q = a0 + (((q - a0 + 3.1416) % 6.2832) + 6.2832) % 6.2832 - 3.1416; if (!(q >= a0 && q <= a1)) continue; }
        A[na++] = q;
      }
    }
  }
  const s = A.subarray(0, na); s.sort();
  const P = LUX.pts; let np = 0;
  if (!full) { P[np++] = lx; P[np++] = ly; }
  for (let i = 0; i < na; i++) {
    const dx = Math.cos(s[i]), dy = Math.sin(s[i]), t = luxCast(lx, ly, R, dx, dy);
    P[np++] = lx + dx * t; P[np++] = ly + dy * t;
  }
  LUX.rays += na;
  return np;
}

/* ---------- painting the light map ---------- */
function luxPath(g, np) { const P = LUX.pts; g.beginPath(); g.moveTo(P[0], P[1]); for (let i = 2; i < np; i += 2) g.lineTo(P[i], P[i + 1]); g.closePath(); }
function luxGrad(g, L, k, rk) {
  const r = L.r * (rk || 1), gr = g.createRadialGradient(L.x, L.y, 0, L.x, L.y, r), i = L.i * k, c = 'rgba(' + L.c0 + ',' + L.c1 + ',' + L.c2 + ',';
  if (L.hgt >= 4 && !L.cone) {
    // a lamp up on a pole: the pool under it falls off as cos cubed over the lamp's height (bright under it, a long soft
    // spread across the street), then fades out at the edge of its reach
    const upm = 32 * SCL / SCALE_REAL, Rm = r / upm;
    for (const f of [0, 0.1, 0.22, 0.36, 0.52, 0.7, 0.86, 1]) { const d = f * Rm / L.hgt, e = Math.pow(1 + d * d, -1.5) * (1 - f * f) * (1 - f * f); gr.addColorStop(f, c + Math.min(1, i * e).toFixed(3) + ')'); }
    return gr;
  }
  gr.addColorStop(0, c + Math.min(1, i) + ')'); gr.addColorStop(0.1, c + Math.min(1, i * 0.72) + ')'); gr.addColorStop(0.3, c + Math.min(1, i * 0.34) + ')');
  gr.addColorStop(0.6, c + (i * 0.1).toFixed(3) + ')'); gr.addColorStop(1, c + '0)');
  return gr;
}
function luxDrawLight(g, L, lq, shadowed) {
  if (L.cone) {
    // a beam. A flashlight is three layers (the wide dim spill, the main beam, the bright hot spot in the middle), all
    // inside one traced shape, so its edge is soft and the walls and bodies in it throw shadows
    const beam = !!L.cone.beam, wide = L.cone.h * (beam ? 1.38 : 1); let clip = false;
    if (shadowed && lq.rays) {
      const np = luxPoly(L.x, L.y, L.r, Math.max(12, lq.rays >> 1), L.cone.a - wide, L.cone.a + wide, lq.rays >= 44, L.hgt); if (np < 6) return;
      g.save(); luxPath(g, np); g.clip(); clip = true;
      if (beam) { const B = L.poly && L.poly.length >= np ? L.poly : (L.poly = new Float32Array(Math.max(np, 64))); B.set(LUX.pts.subarray(0, np)); L.np = np; LUX.beams.push(L); }
    }
    const layers = beam ? [[0.3, 1.38, 1], [0.55, 1, 1], [0.42, 0.42, 0.82]] : [[0.55, 1, 1], [0.5, 0.62, 1]];
    for (const [k, w, rk] of layers) { const half = L.cone.h * w; g.beginPath(); g.moveTo(L.x, L.y); g.arc(L.x, L.y, L.r * rk, L.cone.a - half, L.cone.a + half); g.closePath(); g.fillStyle = luxGrad(g, L, k, rk); g.fill(); }
    if (clip) g.restore();
    return;
  }
  if (shadowed && lq.rays) {
    const soft = lq.soft && L.pr >= 2 && L.r < 520 ? lq.soft + 1 : 1, off = Math.min(26, L.r * 0.07);
    for (let s = 0; s < soft; s++) {
      const a = s * 2.4 + 0.5, ox = soft > 1 ? Math.cos(a) * off : 0, oy = soft > 1 ? Math.sin(a) * off : 0;
      const np = luxPoly(L.x + ox, L.y + oy, L.r + off, lq.rays, 0, 6.2832, lq.rays >= 44, L.hgt); if (np < 6) continue;
      luxPath(g, np); g.fillStyle = luxGrad(g, L, 1 / soft); g.fill();
    }
  } else { g.fillStyle = luxGrad(g, L, 1); g.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2); }
}
// the short shadows of one light, cut out of its own light in the scratch canvas: boxes (cars, benches, barriers, piers
// shorter than the light), bodies (zombies, players, props) and leaves (tree crowns and bushes, partly see-through).
// Each is the shape and its copy pushed away from the light by height / (light height - height), wrapped in one outline.
function luxHull(s, P) { const H = LUX.hh; if (hull8(P, H) < 3) return 0; s.moveTo(H[0], H[1]); for (let i = 2; i < H.length; i += 2) s.lineTo(H[i], H[i + 1]); s.closePath(); return 1; }
function luxFinite(s, L) {
  const H = L.hgt || 2, P = LUX.hp, lx = L.x, ly = L.y;
  const kOf = h => Math.min(9, H / Math.max(0.12, H - h));
  s.fillStyle = '#000'; s.globalAlpha = 0.84; s.beginPath(); let n = 0;
  for (const r of LUX.fin) {
    const k = kOf(r.k === 'trunk' ? 4 : luxHeight(r) || 2.5); P.length = 0;
    for (const x of [r.x, r.x + r.w]) for (const y of [r.y, r.y + r.h]) P.push(x, y, lx + (x - lx) * k, ly + (y - ly) * k);
    n += luxHull(s, P);
  }
  if (n) s.fill();
  const circ = (e) => { const k = kOf(e.h), cx = lx + (e.x - lx) * k, cy = ly + (e.y - ly) * k, rr = e.rho * k; P.length = 0; for (let i = 0; i < 8; i++) { const a = i * 0.7854, ca = Math.cos(a), sa = Math.sin(a); P.push(e.x + ca * e.rho, e.y + sa * e.rho, cx + ca * rr, cy + sa * rr); } return luxHull(s, P); };
  s.globalAlpha = 0.8; s.beginPath(); n = 0; for (const e of LUX.fz) n += circ(e); if (n) s.fill();
  for (const e of LUX.ff) { s.globalAlpha = e.a; s.beginPath(); if (circ(e)) s.fill(); }
  s.globalAlpha = 1;
}
function luxDrawFin(g, L, lq) {
  const S = LUX.S, s = LUX.sg, tr = LUX.tr, res = LUX.res;
  const sx = (tr.a * L.x + tr.e) * res, sy = (tr.d * L.y + tr.f) * res, sr = Math.abs(L.r * tr.a * res) + 3;
  const bx = Math.max(0, Math.floor(sx - sr)), by = Math.max(0, Math.floor(sy - sr)), bx2 = Math.min(LUX.cw, Math.ceil(sx + sr)), by2 = Math.min(LUX.ch, Math.ceil(sy + sr));
  if (bx2 <= bx || by2 <= by) return;
  s.setTransform(1, 0, 0, 1, 0, 0); s.globalCompositeOperation = 'source-over'; s.globalAlpha = 1; s.clearRect(bx, by, bx2 - bx, by2 - by);
  s.setTransform(tr.a * res, tr.b * res, tr.c * res, tr.d * res, tr.e * res, tr.f * res);
  s.globalCompositeOperation = 'lighter';
  LUX.ownLight = L.pr === 3;
  luxDrawLight(s, L, lq, true);
  LUX.ownLight = false;
  s.globalCompositeOperation = 'destination-out'; luxFinite(s, L);
  s.setTransform(1, 0, 0, 1, 0, 0); s.globalCompositeOperation = 'source-over';
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'lighter'; g.drawImage(S, bx, by, bx2 - bx, by2 - by, bx, by, bx2 - bx, by2 - by); g.restore();
}
// the nearest few shadowed lights get short shadows (how many depends on the level); the rest are traced the old way,
// where everything blocks. A light with nothing short near it skips the scratch canvas.
function luxDraw(g, L, lq, shadowed) {
  if (shadowed && lq.rays && LUX.finLeft > 0 && LUX.S && LUX.tr) {
    LUX.ownLight = L.pr === 3;
    luxOcc(L.x, L.y, L.r, lq.rays >= 44, L.hgt);
    if (LUX.fin.length || LUX.fz.length || LUX.ff.length) { LUX.finLeft--; luxDrawFin(g, L, lq); return; }
    luxDrawLight(g, L, lq, shadowed); LUX.ownLight = false; return;
  }
  LUX.ownLight = L.pr === 3; LUX.noFin = shadowed && lq.rays > 0; luxDrawLight(g, L, lq, shadowed); LUX.noFin = false; LUX.ownLight = false;
}

/* ---------- one frame: called by render() after the world is drawn ---------- */
function luxLevelNow(want) {
  const base = want === 'auto' ? [1, 2, 3, 4][clamp(PERF.tier | 0, 0, 3)] : want === 'basic' ? 1 : want === 'full' ? 3 : want === 'ultra' ? 4 : (+want || 2);
  return clamp(base + LUX.adapt + (base ? TUNE.LUX || 0 : 0), 0, 4);   // (TUNE: Hard or Max in the engine room add a level, Eco takes one)
}
function luxFrame(x0, y0, x1, y1, shx, shy, dt) {
  const now = performance.now();
  if (LUX.offUntil && now < LUX.offUntil) { LUX.live = false; return; }
  const want = SET.lux || 'auto';
  if (want === 'off') { LUX.live = false; LUX.fx.length = 0; return; }
  if (!LUX.probe) LUX.probe = luxProbe() ? 1 : -1;
  LUX.mul = LUX.probe > 0;
  // the level: chosen in settings, or by the device's tier, then trimmed by what the engine measures itself costing
  LUX.level = luxLevelNow(want);
  if (LUX.level !== LUX.lvl) { LUX.lvl = LUX.level; LUX.A = null; }
  const lq = LUXQ[LUX.level];
  if (!LUX.A || LUX.cvw !== cv.width || LUX.cvh !== cv.height || LUX.res !== lq.res || (ctx.isContextLost && ctx.isContextLost())) { luxBuild(); noteLux(); }
  LUX.hour = luxHourNow();
  const amb = luxAmbient(LUX.amb), dark = Math.min(amb[0], amb[1], amb[2]) < 0.985;
  luxGather(x0, y0, x1, y1, dt);
  // the nearest, most important lights cast shadows; the rest are plain glows
  const L = LUX.lights, n = LUX.n;
  const idx = LUX.idx || (LUX.idx = []); idx.length = n; for (let i = 0; i < n; i++) idx[i] = i;
  idx.sort((a, b) => L[a].d - L[b].d);
  const use = Math.min(n, lq.lights);
  // paint
  const g = LUX.ag, tr = ctx.getTransform(), s = lq.res;
  LUX.tr = tr; LUX.beams.length = 0; LUX.fn = (LUX.fn || 0) + 1; LUX.finLeft = [0, 0, 2, 4, 6][LUX.level];
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.fillRect(0, 0, LUX.cw, LUX.ch);
  g.setTransform(tr.a * s, tr.b * s, tr.c * s, tr.d * s, tr.e * s, tr.f * s);
  g.globalCompositeOperation = 'lighter';
  LUX.rays = 0; let shaded = 0;
  const ex = (x1 - x0) * 0.5 + 600;
  for (let q = 0; q < use; q++) {
    const l = L[idx[q]];
    const sh = l.shade && shaded < lq.shade; if (sh) shaded++;
    try { luxDraw(g, l, lq, sh); } catch (e) { luxHurt(e); }
  }
  LUX.shaded = shaded;
  // roofs are lit by the sky, not by the lamps in the street: paint them dark again
  if (dark && use) {
    g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000';
    const cx0 = Math.floor(x0 / CHS), cx1 = Math.floor(x1 / CHS), cy0 = Math.floor(y0 / CHS), cy1 = Math.floor(y1 / CHS);
    for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
      const c = chunks.get(cx + ',' + cy); if (!c) continue;
      for (const r of c.rects) { if (r.k === 'b' && !r.burn && r.x < x1 && r.x + r.w > x0 && r.y < y1 && r.y + r.h > y0) g.fillRect(r.x, r.y, r.w, r.h); }
    }
  }
  // the sun: where it stands, how strong it is through the weather, and which way the shadows fall
  const sun = luxSun(amb), shadowed = sun.on && sun.k > 0.02;
  // a light day on a slower device (the two lowest levels, no bounce light) or one that can't multiply pictures: the sun's
  // shadows go straight onto the picture as one shape, with no light map over the whole screen
  const lite = shadowed && !dark && (!LUX.mul || (LUX.level <= 1 && !luxGIwanted(lq))), lit = dark || (shadowed && !lite);
  // the map: sunlight (or the night's ambient), the sun's shadows, then the lamps and fires, multiplied over the picture
  const m = LUX.mg; m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-over';
  m.fillStyle = 'rgb(' + Math.round(amb[0] * 255) + ',' + Math.round(amb[1] * 255) + ',' + Math.round(amb[2] * 255) + ')'; m.fillRect(0, 0, LUX.cw, LUX.ch);
  if (shadowed && !lite) { m.setTransform(tr.a * s, tr.b * s, tr.c * s, tr.d * s, tr.e * s, tr.f * s); try { luxSunShadows(m, sun, x0, y0, x1, y1); } catch (e) { luxHurt(e); } m.setTransform(1, 0, 0, 1, 0, 0); }
  m.globalCompositeOperation = 'lighter'; m.drawImage(LUX.A, 0, 0);
  // light that bounces off walls and the street, path traced: here on the CPU, or by the shader engine on the GPU
  LUX.giOn = lit && luxGIwanted(lq);
  if (LUX.giOn) { try { luxGIgrid(x0, y0, x1, y1, lq); if (!(typeof PRISM !== 'undefined' && PRISM.giGpu)) luxGI(m, tr, s, lq); } catch (e) { luxHurt(e); LUX.giOn = false; } }
  m.globalCompositeOperation = 'source-over';
  luxExport(amb, use);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (lit && LUX.mul) { ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(LUX.M, 0, 0, cv.width, cv.height); }
  else if (lite) {
    ctx.setTransform(tr);
    if (LUX.mul) { ctx.globalCompositeOperation = 'multiply'; try { luxSunShadows(ctx, sun, x0, y0, x1, y1); } catch (e) { luxHurt(e); } }
    else { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.3 * sun.k; try { luxSunShadows(ctx, sun, x0, y0, x1, y1, '#0c1424'); } catch (e) { luxHurt(e); } ctx.globalAlpha = 1; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  else if (dark) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1 - (amb[0] + amb[1] + amb[2]) / 3; ctx.fillStyle = '#080c16'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalAlpha = 1; }   // no multiply on this device: a plain dark veil
  LUX.lit = lit && LUX.mul;
  // light in the air: a flashlight (or headlight) beam shows as a shaft through fog, rain, dust and smoke, inside its
  // traced shape, brightest near the lens
  const airK = clamp(0.04 + (WX.fog || 0) * 0.6 + (WX.rain || 0) * 0.32 + (WX.sand || 0) * 0.4 + (WX.ash || 0) * 0.3 + (1 - LUX.day) * 0.1, 0, 1);
  if (LUX.beams.length && dark && lq.rays) {
    ctx.save(); ctx.setTransform(tr); ctx.globalCompositeOperation = 'lighter';
    for (const B of LUX.beams) {
      const P = B.poly, np = B.np; if (!P || np < 6) continue;
      ctx.save(); ctx.beginPath(); ctx.moveTo(P[0], P[1]); for (let i = 2; i < np; i += 2) ctx.lineTo(P[i], P[i + 1]); ctx.closePath(); ctx.clip();
      const gr = ctx.createRadialGradient(B.x, B.y, 0, B.x, B.y, B.r * 0.9), a = (0.05 + 0.2 * airK) * Math.min(1, B.i);
      gr.addColorStop(0, 'rgba(' + B.c0 + ',' + B.c1 + ',' + B.c2 + ',' + a.toFixed(3) + ')'); gr.addColorStop(0.35, 'rgba(' + B.c0 + ',' + B.c1 + ',' + B.c2 + ',' + (a * 0.4).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + B.c0 + ',' + B.c1 + ',' + B.c2 + ',0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.arc(B.x, B.y, B.r * 0.9, B.cone.a - B.cone.h * 0.9, B.cone.a + B.cone.h * 0.9); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  // glow and bloom: the light itself, added on top
  ctx.globalCompositeOperation = 'lighter';
  const night = 1 - LUX.day, wet = clamp(WX.rain * 1.2 + (WX.storm || 0) * 0.4, 0, 1), fogk = clamp(WX.fog, 0, 1);
  const gpuBloom = typeof PRISM !== 'undefined' && PRISM.bloomGpu;
  if (use && !gpuBloom) {
    // wet streets shine and fog glows around every lamp
    ctx.globalAlpha = Math.min(1, (0.1 + 0.12 * night) * (1 + 0.6 * wet + 0.8 * fogk)); ctx.drawImage(LUX.A, 0, 0, cv.width, cv.height);
    if (lq.bloom && bloomK() > 0) {
      // two blurs (a third and a ninth of the light map), summed small and laid over the picture in one pass
      const b1 = LUX.b1, B1w = LUX.B1.width, B1h = LUX.B1.height;
      const a1 = Math.min(1, (0.16 + 0.12 * night) * (1 + 0.4 * wet + 1.2 * fogk)), a2 = lq.bloom > 1 ? Math.min(1, (0.2 + 0.14 * night) * (1 + 0.4 * wet + 1.2 * fogk)) : 0, top = Math.max(a1, a2);
      b1.globalCompositeOperation = 'source-over'; b1.globalAlpha = 1; b1.clearRect(0, 0, B1w, B1h); b1.drawImage(LUX.A, 0, 0, B1w, B1h);
      if (a2 > 0) {
        LUX.b2.clearRect(0, 0, LUX.B2.width, LUX.B2.height); LUX.b2.drawImage(LUX.B1, 0, 0, LUX.B2.width, LUX.B2.height);
        if (a1 < top) { b1.clearRect(0, 0, B1w, B1h); b1.globalAlpha = a1 / top; b1.drawImage(LUX.A, 0, 0, B1w, B1h); }
        b1.globalCompositeOperation = 'lighter'; b1.globalAlpha = a2 / top; b1.drawImage(LUX.B2, 0, 0, B1w, B1h);
        b1.globalCompositeOperation = 'source-over'; b1.globalAlpha = 1;
      }
      ctx.globalAlpha = Math.min(1, top * bloomK()); ctx.drawImage(LUX.B1, 0, 0, cv.width, cv.height);
      if (bloomK() > 1.05) { ctx.globalAlpha = Math.min(1, top * (bloomK() - 1)); ctx.drawImage(LUX.B1, 0, 0, cv.width, cv.height); }
    }
  }
  if (use) {
    // rain and snow caught in the light: streaks and flakes, only where a lamp, a fire or your flashlight reaches
    if (lq.bloom && (WX.rain > 0.08 || WX.snow > 0.08) && wxLevel() > 0 && night > 0.15) { luxGlints(lq); ctx.globalAlpha = 0.85 * night; ctx.drawImage(LUX.G1, 0, 0, cv.width, cv.height); }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  LUX.live = true; coreBeat('LUX');
}
function luxGlints(lq) {
  const g = LUX.g1, w = LUX.G1.width, h = LUX.G1.height, k = DPR * lq.res * w / LUX.cw, sc = Math.min(W, H) / 480;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  if (WX.rain > 0.08) {
    const n = Math.floor(320 * WX.rain), lx = -6.2 * WX.wx * k, ly = -21.6 * sc * k;
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = Math.max(1, k * 1.1); g.beginPath();
    for (let i = 0; i < n; i++) { const x = Math.random() * w, y = Math.random() * h, z = 0.5 + Math.random() * 0.5; g.moveTo(x, y); g.lineTo(x + lx * z, y + ly * z); }
    g.stroke();
  }
  if (WX.snow > 0.08) {
    const n = Math.floor(140 * WX.snow); g.fillStyle = 'rgba(255,255,255,0.65)'; g.beginPath();
    for (let i = 0; i < n; i++) { const s = (1 + Math.random() * 2) * k * sc; g.rect(Math.random() * w, Math.random() * h, s, s); }
    g.fill();
  }
  g.globalCompositeOperation = 'multiply'; g.drawImage(LUX.A, 0, 0, w, h); g.globalCompositeOperation = 'source-over';
}
function noteLux() { if (LUX.repairs++ > 0) noteRepair('Rebuilt the lighting canvases'); }
// something went wrong inside the engine: remember it, and back off if it keeps going wrong
function luxHurt(e) {
  const now = performance.now(); LUX.lastErr = String(e && e.message || e).slice(0, 120); coreHurt('LUX', e);
  LUX.errT.push(now); while (LUX.errT.length && now - LUX.errT[0] > 8000) LUX.errT.shift();
  try { console.error(e); } catch (x) { }
  if (LUX.errT.length >= 3 && LUX.adapt > -3) { LUX.adapt--; LUX.A = null; LUX.errT.length = 0; noteRepair('Lighting engine dropped a level'); }
  else if (LUX.errT.length >= 6) { LUX.offUntil = now + 60000; LUX.live = false; LUX.A = null; LUX.errT.length = 0; LUX.fails++; noteRepair('Lighting engine paused; retrying in a minute'); }
}
// the engine watches what it costs: once a second it compares the average with a share of the frame, and trades
// detail for speed (or takes some back when there is room)
function luxWatch(ms) {
  LUX.ms = ms; LUX.msAvg += (ms - LUX.msAvg) * 0.06;
  const now = performance.now(); if (now - LUX.msT < 1000) return; LUX.msT = now;
  if (document.hidden) return;   // (a level picked by hand still steps down when the device cannot keep up, and back up after)
  const T = 1000 / targetFps(), budget = T * (0.2 + 0.05 * Math.min(2, LUX.level));
  LUX.budget = budget;
  if (LUX.msAvg > budget && PERF.fps && PERF.fps < targetFps() * 0.95) { if (++LUX.bad >= 2 && LUX.adapt > -3) { LUX.adapt--; LUX.bad = 0; } }
  else if (LUX.msAvg < budget * 0.45 && LUX.adapt < 0) { if (++LUX.bad >= 12 && coreRise('LUX')) { LUX.adapt++; LUX.bad = 0; } }
  else LUX.bad = Math.max(0, LUX.bad - 1);
  if (LUX.offUntil && now >= LUX.offUntil) { LUX.offUntil = 0; LUX.adapt = Math.min(LUX.adapt, -1); }
}
// render() calls this; nothing in here may stop the frame
function luxRun(x0, y0, x1, y1, shx, shy, dt) {
  const t0 = performance.now();
  ctx.save();
  try { luxFrame(x0, y0, x1, y1, shx, shy, dt); }
  catch (e) { luxHurt(e); }
  ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const ms = performance.now() - t0; PERF.sec.lux = (PERF.sec.lux || 0) + ms; luxWatch(ms); coreCost('LUX', ms);
}
// a new run: the morning
function luxNewRun() { LUX.h0s = null; LUX.fx.length = 0; LUX.adapt = Math.min(0, LUX.adapt + 1); }
// the loading screen calls this: builds the canvases, tests the device, and draws one shadowed light so the first real frame is cheap
function luxWarm() {
  if (!LUX.probe) LUX.probe = luxProbe() ? 1 : -1;
  if (SET.lux === 'off') return;
  LUX.level = LUX.lvl = luxLevelNow(SET.lux || 'auto');
  const lq = LUXQ[LUX.level];
  try {
    if (!LUX.A || LUX.cvw !== cv.width || LUX.cvh !== cv.height || LUX.res !== lq.res) luxBuild();
    // one light and one wall, traced and painted the same way a real frame does it
    LUX.nocc = 1; LUX.occ[0] = 40; LUX.occ[1] = -20; LUX.occ[2] = 80; LUX.occ[3] = 20; LUX.occE[0] = 0;
    const g = LUX.ag, P = LUX.pts, rays = Math.max(24, lq.rays); let np = 0;
    g.setTransform(1, 0, 0, 1, 100, 100); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < rays; i++) { const a = i / rays * 6.2832, dx = Math.cos(a), dy = Math.sin(a), t = luxCast(0, 0, 200, dx, dy); P[np++] = dx * t; P[np++] = dy * t; }
    luxPath(g, np); g.fillStyle = luxGrad(g, { x: 0, y: 0, r: 200, c0: 255, c1: 200, c2: 120, i: 0.5 }, 1); g.fill();
    g.setTransform(1, 0, 0, 1, 0, 0);
    LUX.mg.drawImage(LUX.A, 0, 0); LUX.b1.drawImage(LUX.A, 0, 0, LUX.B1.width, LUX.B1.height); LUX.b2.drawImage(LUX.B1, 0, 0, LUX.B2.width, LUX.B2.height);
    LUX.nocc = 0;
  } catch (e) { luxHurt(e); }
}

/* ---------- the sun ----------
   It rises in the east, crosses the south at noon and sets in the west (north is up the screen), climbing higher in
   summer than in winter. Its light is the day's ambient colour; where a building, a car, a tree or a body blocks it,
   only the blue light of the sky is left. Shadows are as long as the sun is low: a tower's shadow at dusk crosses the
   street, at noon it hugs the wall. Clouds, rain and fog soften them until, under a storm, there are none. */
const LUX_SUNMAX = [52, 72, 46, 28];                 // how high the sun climbs (degrees), by season
const LUX_COVER = { clear: 0, overcast: 0.72, rain: 0.86, storm: 0.95, fog: 0.82, snow: 0.7, blizzard: 0.96, sand: 0.55, ash: 0.7 };
const LUX_SKY = [0.7, 0.75, 0.88];                  // what is left in the shade: the sky's blue
function luxSunShadowsOn() { return SET.lux !== 'off' && SET.sun !== false; }
function luxSun(amb) {
  const S = CORE.frame.sun, sea = WORLD.season, rise = LUX_RISE[sea], set = LUX_SET[sea], h = LUX.hour;
  if (h <= rise + 0.05 || h >= set - 0.05 || !luxSunShadowsOn()) { S.on = false; S.k = 0; return S; }
  const p = (h - rise) / (set - rise), el = LUX_SUNMAX[sea] * Math.sin(p * Math.PI), az = 90 + p * 180;
  const cover = LUX_COVER[WX.kind] != null ? LUX_COVER[WX.kind] : 0.5;
  S.k = clamp(el / 9, 0, 1) * (1 - cover) * (1 - (WX.fog || 0) * 0.5) * (1 - clamp(WX.dark || 0, 0, 1) * 0.6);
  S.on = S.k > 0.02; S.el = el; S.az = az;
  const len = Math.min(10, 1 / Math.tan(Math.max(5, el) * Math.PI / 180)), ar = az * Math.PI / 180;
  S.dx = -Math.sin(ar) * len; S.dy = Math.cos(ar) * len;   // metres of shadow per metre of height, pointing away from the sun
  S.col[0] = amb[0]; S.col[1] = amb[1]; S.col[2] = amb[2];
  for (let i = 0; i < 3; i++) S.sky[i] = amb[i] * (1 - S.k * 0.85 * (1 - LUX_SKY[i]));
  S.css = 'rgb(' + Math.round(S.sky[0] * 255) + ',' + Math.round(S.sky[1] * 255) + ',' + Math.round(S.sky[2] * 255) + ')';
  return S;
}
// how tall things stand, in metres (a building's height comes from its own seed, so it is the same every time)
const LUX_HT = { car: 1.5, tanker: 3.4, plow: 3, planter: 4, rub: 2.4, barrier: 1, rail: 0.9, fence: 1.8, rock: 2, mesa: 22, cactus: 3, pump: 1.6, bench: 0.8, dumpster: 1.6, hoop: 3, kiosk: 3, log: 0.5, stall: 2.8, tank: 8, trough: 0.9, windmill: 11, wood: 1.2, checkpoint: 3, statue: 6 };
function luxHeight(r) {
  if (r._ht !== undefined) return r._ht;
  let h = 0;
  if (r.k === 'b') {
    const st = r.st || 'block', u = ((((r.s || (r.x * 31 + r.y * 17) | 0) * 2654435761) >>> 0) % 10000) / 10000;
    h = st === 'block' ? 10 + u * u * 26 + Math.min(8, Math.sqrt(r.w * r.h) / (SCL * 60)) : st === 'ruin' ? 5 + u * 8 : st === 'house' ? 7 : st === 'adobe' ? 4.5 : st === 'cabin' || st === 'lodge' ? 7 : st === 'barn' ? 9 : 3.4;
  } else if (r.k === 'lm') h = r.lm === 'statue' ? 7 : r.lm === 'plane' ? 4 : r.lm === 'fountain' ? 1.6 : 3;
  else if (r.k === 'car') h = ((typeof VEH !== 'undefined' && VEH[r.vt]) || { h: 1.5 }).h * (r.flip ? 0.75 : r.burnt ? 0.85 : 1);
  else if (r.k === 'wreck') h = r.ht || 3;
  else if (r.k === 'pillar') h = typeof SKY_H !== 'undefined' ? SKY_H : 7.5;
  else h = LUX_HT[r.k] || 0;
  return r._ht = h;
}
// the shadow a box throws, minus the box itself (so its own roof stays in the sun): an L-shaped outline. Every outline
// is wound the same way round, so all of them fill as one shape in a single pass.
function luxShadowPath(m, x, y, w, h, ox, oy) {
  const a = Math.abs(ox), b = Math.abs(oy), fx = ox >= 0, fy = oy >= 0;
  const P = [w, 0, w + a, b, w + a, h + b, a, h + b, 0, h, w, h];
  const X = i => fx ? x + P[i] : x + w - P[i], Y = i => fy ? y + P[i + 1] : y + h - P[i + 1];
  if (fx === fy) { m.moveTo(X(0), Y(0)); for (let i = 2; i < 12; i += 2) m.lineTo(X(i), Y(i)); }
  else { m.moveTo(X(10), Y(10)); for (let i = 8; i >= 0; i -= 2) m.lineTo(X(i), Y(i)); }
  m.closePath();
}
// The sun is not a point: it is sampled over its disc (and the bright sky round it) a few times, each sample a slightly
// different direction and length, and the shadows of all samples are laid on top of each other. Near whatever casts it a
// shadow is dark and sharp; further out the samples spread, so its edges soften and it fades towards the tip, the way a
// real shadow does (and the way a ray tracer with an area light draws it). More samples at higher levels.
const LUX_SS = [[0, 1], [0.045, 0.86], [-0.045, 0.74], [0.09, 0.62], [-0.08, 0.5]];
// how strong each sample is, by the number of samples: the longest (first) alone reaches the tip, so the tip is faint and
// the shadow deepens towards its foot where all of them overlap
const LUX_SA = { 2: [0.45, 0.75], 3: [0.4, 0.5, 0.6], 4: [0.32, 0.42, 0.5, 0.55], 5: [0.3, 0.36, 0.42, 0.48, 0.5] };
function luxSunShadows(m, sun, x0, y0, x1, y1, col) {
  const UPM = 32 * SCL / SCALE_REAL, maxL = 900 * Math.max(0.5, SCL / SCALE_REAL), mg = maxL, lite = !!col || m === ctx;
  const K = lite ? 2 : LUX.level >= 4 ? 5 : LUX.level >= 3 ? 4 : 3, SA = LUX_SA[K];
  m.fillStyle = col || sun.css; m.strokeStyle = col || sun.css; m.lineCap = 'round';
  const cx0 = Math.floor((x0 - mg) / CHS), cx1 = Math.floor((x1 + mg) / CHS), cy0 = Math.floor((y0 - mg) / CHS), cy1 = Math.floor((y1 + mg) / CHS);
  // what casts, gathered once (the samples only move the shadows)
  const rects = [], poles = [];
  for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
    const c = chunks.get(cx + ',' + cy); if (!c) continue;
    for (const r of c.rects) { if (r.k === 'wreck') continue; const h = luxHeight(r); if (h && r.x < x1 + mg && r.x + r.w > x0 - mg && r.y < y1 + mg && r.y + r.h > y0 - mg) rects.push(r); }
    if (!c.lights) c.lights = lightsOf(cx, cy);
    for (const L of c.lights) if (!L.hw && L.x > x0 - mg && L.x < x1 + 200 && L.y > y0 - mg && L.y < y1 + 200) poles.push(L);
  }
  const bodies = [];
  // the crowd engine hands over the zombies nearest the camera first, so in a horde the closest ones cast shadows
  const swb = typeof swarmBodies === 'function' ? swarmBodies() : null;
  const rigs = [];
  for (const z of (swb || G.zs)) {
    if (z.dead || z.fly || (z.st && z.st.under)) continue; if (z.x < x0 - 400 || z.x > x1 + 400 || z.y < y0 - 400 || z.y > y1 + 400) continue;
    // a zombie drawn joint by joint this frame throws the shadow of its own pose (arms out, legs striding, falling)
    if (z.m && z.m.v2 && z.an && z.an.jF >= frameNo - 1 && rigs.length < 32 && typeof animaShadow === 'function') { rigs.push(z); continue; }
    bodies.push(z.x, z.y, z.r, clamp(z.r * 0.17, 1.2, 6)); if (bodies.length > 320) break;
  }
  if (G.p && G.mode !== 'title' && !G.p.down) bodies.push(G.p.x, G.p.y, G.p.r, 1.75);
  if (NET.started) { const each = NET.role === 'host' ? Array.from(NET.peers.values()).map(q => q.p).filter(Boolean) : Array.from(NET.others.values()); for (const q of each) if (q && !q.down) bodies.push(q.x, q.y, 9 * PK, 1.75); }
  for (const pr of WD.props) if (!pr.dead) bodies.push(pr.x, pr.y, pr.r, LUX_PH[pr.k] || 0.8);
  const sa = Math.atan2(sun.dy, sun.dx), sl = Math.hypot(sun.dx, sun.dy);
  // small and soft casters (trees, bushes, bodies, poles) take only the first two samples, each strong enough that where
  // both overlap the shade is as deep as under all of them
  let keep = 1; for (let i = 0; i < K; i++) keep *= 1 - SA[i];
  const aSmall = 1 - Math.sqrt(keep);
  for (let si = 0; si < K; si++) {
    const S = LUX_SS[si], an = sa + S[0], ln = sl * S[1], ux = Math.cos(an) * ln * UPM, uy = Math.sin(an) * ln * UPM;
    m.globalAlpha = SA[si];
    // buildings, walls, cars, piers: each box and the L-shaped shadow it throws, all as one shape
    m.beginPath(); let n = 0;
    for (const r of rects) {
      const h = luxHeight(r);
      let ox = ux * h, oy = uy * h; const L = Math.hypot(ox, oy); if (L > maxL) { ox *= maxL / L; oy *= maxL / L; }
      if (Math.min(r.x, r.x + ox) > x1 || Math.max(r.x + r.w, r.x + r.w + ox) < x0 || Math.min(r.y, r.y + oy) > y1 || Math.max(r.y + r.h, r.y + r.h + oy) < y0) continue;
      luxShadowPath(m, r.x, r.y, r.w, r.h, ox, oy); n++;
    }
    // highway decks and wrecked aircraft
    if (typeof skySun === 'function') n += skySun(m, ux, uy, x0, y0, x1, y1);
    if (typeof garageSun === 'function') n += garageSun(m, ux, uy, x0, y0, x1, y1);
    if (n) m.fill();
    if (typeof skyRampSun === 'function') skyRampSun(m, ux, uy, x0, y0, x1, y1);
    if (si >= 2) continue;
    m.globalAlpha = K > 2 ? aSmall : SA[si];
    // tree crowns as clusters of leaves (each tree its own), trunks, bushes, and everyone standing in the street
    m.beginPath(); n = 0;
    for (const d of WD.act) {
      if (d.k === 'grass') continue;
      if (d.k === 'tree') {
        const hc = 6, cxw = d.x + ux * hc, cyw = d.y + uy * hc, rr = d.r * 0.82;
        if (cxw + rr * 1.3 < x0 || cxw - rr * 1.3 > x1 || cyw + rr * 1.3 < y0 || cyw - rr * 1.3 > y1) continue;
        const nl = 4 + (d.s & 3), ph = (d.s >>> 3) % 628 / 100;
        m.moveTo(cxw + rr * 0.72, cyw); m.arc(cxw, cyw, rr * 0.72, 0, TAU);
        for (let i = 0; i < nl; i++) { const a = ph + i / nl * TAU, lx = cxw + Math.cos(a) * rr * 0.42, ly = cyw + Math.sin(a) * rr * 0.42, lr = rr * (0.42 + ((d.s >>> (i + 5)) & 7) / 40); m.moveTo(lx + lr, ly); m.arc(lx, ly, lr, 0, TAU); }
        n++;
      } else {
        const hb = 1.1, cxw = d.x + ux * hb * 0.55, cyw = d.y + uy * hb * 0.55, rr = d.r * 0.9;
        if (cxw + rr < x0 || cxw - rr > x1 || cyw + rr < y0 || cyw - rr > y1) continue;
        m.moveTo(cxw + rr, cyw); m.ellipse(cxw, cyw, rr * (1 + Math.hypot(ux, uy) * 0.02), rr * 0.9, Math.atan2(uy, ux), 0, TAU); n++;
      }
    }
    for (let i = 0; i < bodies.length; i += 4) {
      const x = bodies[i], y = bodies[i + 1], r = bodies[i + 2], hm = bodies[i + 3];
      const ox = ux * hm, oy = uy * hm, L = Math.hypot(ox, oy); if (x + L + r < x0 || x - L - r > x1 || y + L + r < y0 || y - L - r > y1) continue;
      const rx = L / 2 + r * 0.6, ry = r * 0.62, a = Math.atan2(oy, ox), ex = x + ox * 0.5, ey = y + oy * 0.5;
      m.moveTo(ex + Math.cos(a) * rx, ey + Math.sin(a) * rx); m.ellipse(ex, ey, rx, ry, a, 0, TAU); n++;
    }
    for (const z of rigs) { animaShadow(m, z, ux, uy, UPM); n++; }
    if (n) m.fill();
    // trunks and lamp posts: thin shadows from the foot of the pole, the lamp head's at the end
    m.lineWidth = 0.32 * UPM; m.beginPath(); n = 0;
    for (const d of WD.act) { if (d.k !== 'tree') continue; const ex = d.x + ux * 4, ey = d.y + uy * 4; if (Math.max(d.x, ex) < x0 || Math.min(d.x, ex) > x1 || Math.max(d.y, ey) < y0 || Math.min(d.y, ey) > y1) continue; m.moveTo(d.x, d.y); m.lineTo(ex, ey); n++; }
    for (const L of poles) { const hx = (L.hx == null ? L.x : L.hx), hy = (L.hy == null ? L.y : L.hy), ex = L.x + ux * 7, ey = L.y + uy * 7; m.moveTo(L.x, L.y); m.lineTo(ex, ey); m.lineTo(hx + ux * 7.2, hy + uy * 7.2); n++; }
    if (n) m.stroke();
  }
  m.globalAlpha = 1;
  // dappled light under the trees: a few sunflecks through the gaps in the leaves (the light map only)
  if (!lite && LUX.level >= 3 && sun.k > 0.3) {
    const ux = sun.dx * UPM, uy = sun.dy * UPM; m.fillStyle = 'rgba(' + Math.round(sun.col[0] * 255) + ',' + Math.round(sun.col[1] * 255) + ',' + Math.round(sun.col[2] * 255) + ',0.55)'; m.beginPath(); let n = 0;
    for (const d of WD.act) {
      if (d.k !== 'tree' || d.v === 'pine') continue; const cxw = d.x + ux * 6, cyw = d.y + uy * 6, rr = d.r * 0.7;
      if (cxw + rr < x0 || cxw - rr > x1 || cyw + rr < y0 || cyw - rr > y1) continue;
      const R = Z.mulberry32(d.s ^ 0x5f1ec);
      for (let i = 0; i < 7; i++) { const a = R() * TAU, q = Math.sqrt(R()) * rr, fr = (1.5 + R() * 3) * SCL; m.moveTo(cxw + Math.cos(a) * q + fr, cyw + Math.sin(a) * q); m.arc(cxw + Math.cos(a) * q, cyw + Math.sin(a) * q, fr, 0, TAU); n++; }
    }
    if (n) m.fill();
  }
}

/* ---------- bounce light: path traced ----------
   The view is laid over with a grid of cells (fixed to the world, so it does not swim as the camera moves). Each
   frame, half of the cells send a few rays in random directions; a ray runs through the grid until it reaches a random
   distance or hits a wall, and brings back the light it finds there (the street's or the wall's colour times the light
   on it). The average is the light bouncing into that cell: sunlight spilling into the shade, a fire turning the
   walls around it orange, lamplight reaching round a corner. Rays that hit a wall close by also tell how much of the
   sky the cell can see, so the shade deepens where buildings crowd round (ambient occlusion). Every frame's answer is
   blended into the last ones, so the noise of a few rays per cell settles into a smooth picture. With a GPU the
   shader engine traces the same paths, more of them, on the graphics chip. */
const GI = { cell: 0, gx: 0, gy: 0, gw: 0, gh: 0, acc: null, vis: null, occ: null, src: null, out: null, outImg: null, ao: null, aoImg: null, gs: null, gsg: null, f: 0, seed: 1, ms: 0, rays: 0 };
const GI_COLS = [0, 40, 48, 56, 64], GI_COLS_GPU = [0, 64, 96, 112, 128];   // the CPU traces a coarser grid than the GPU
const GI_ALB = { city: [0.34, 0.34, 0.36], chaos: [0.34, 0.32, 0.34], burning: [0.32, 0.25, 0.2], ruins: [0.36, 0.34, 0.3], ash: [0.42, 0.42, 0.43], suburb: [0.27, 0.35, 0.22], desert: [0.56, 0.46, 0.33], snow: [0.8, 0.84, 0.9] };
function luxGIwanted(lq) {
  const w = SET.gi || 'auto'; if (w === 'off' || !lq.rays) return false;
  // with the shader engine on the GPU, the GPU traces (if its level allows); the CPU tracer reads the light map back,
  // which would stall a graphics chip, so it only runs where the canvas is drawn on the CPU anyway
  if (typeof PRISM !== 'undefined' && PRISM.mode === 'gpu') return PRQ[PRISM.lvl].gi > 0;
  return w === 'on' || LUX.level >= 2;
}
// the grid for this frame and which of its cells are solid (also handed to the shader engine for its GPU pass)
function luxGIgrid(x0, y0, x1, y1, lq) {
  const gpu = typeof PRISM !== 'undefined' && PRISM.mode === 'gpu', cols = (gpu ? GI_COLS_GPU : GI_COLS)[LUX.level] || 48, cell = Math.max(4, Math.round((x1 - x0) / cols * 4) / 4);
  const gx = Math.floor(x0 / cell) - 1, gy = Math.floor(y0 / cell) - 1, gw = Math.ceil((x1 - x0) / cell) + 3, gh = Math.ceil((y1 - y0) / cell) + 3, N = gw * gh;
  if (cell !== GI.cell || gw !== GI.gw || gh !== GI.gh || !GI.acc) {
    GI.cell = cell; GI.gw = gw; GI.gh = gh; GI.gx = gx; GI.gy = gy;
    GI.acc = new Float32Array(N * 3); GI.vis = new Float32Array(N).fill(1); GI.occ = new Uint8Array(N); GI.src = new Float32Array(N * 3);
    GI.out = null; GI.ao = null;
  } else if (gx !== GI.gx || gy !== GI.gy) {
    // the camera moved: slide what has been gathered so far along with the world
    const sx = gx - GI.gx, sy = gy - GI.gy, a = new Float32Array(N * 3), v = new Float32Array(N).fill(1);
    for (let y = 0; y < gh; y++) { const oy = y + sy; if (oy < 0 || oy >= gh) continue; for (let x = 0; x < gw; x++) { const ox = x + sx; if (ox < 0 || ox >= gw) continue; const i = y * gw + x, j = oy * gw + ox; a[i * 3] = GI.acc[j * 3]; a[i * 3 + 1] = GI.acc[j * 3 + 1]; a[i * 3 + 2] = GI.acc[j * 3 + 2]; v[i] = GI.vis[j]; } }
    GI.acc = a; GI.vis = v; GI.gx = gx; GI.gy = gy;
  }
  const occ = GI.occ; occ.fill(0);
  const wx0 = gx * cell, wy0 = gy * cell, wx1 = wx0 + gw * cell, wy1 = wy0 + gh * cell;
  const cx0 = Math.floor(wx0 / CHS), cx1 = Math.floor(wx1 / CHS), cy0 = Math.floor(wy0 / CHS), cy1 = Math.floor(wy1 / CHS);
  for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
    const c = chunks.get(cx + ',' + cy); if (!c) continue;
    for (const r of c.rects) {
      if (luxHeight(r) < 2 || r.x > wx1 || r.x + r.w < wx0 || r.y > wy1 || r.y + r.h < wy0) continue;
      const ia = Math.max(0, Math.floor((r.x - wx0) / cell)), ib = Math.min(gw - 1, Math.floor((r.x + r.w - wx0) / cell)), ja = Math.max(0, Math.floor((r.y - wy0) / cell)), jb = Math.min(gh - 1, Math.floor((r.y + r.h - wy0) / cell));
      for (let j = ja; j <= jb; j++) occ.fill(1, j * gw + ia, j * gw + ib + 1);
    }
  }
  const F = CORE.frame; F.gi = GI;
}
function luxGI(m, tr, s, lq) {
  const t0 = performance.now(), gw = GI.gw, gh = GI.gh, N = gw * gh, cell = GI.cell;
  // the light on the ground, read back small from the light map (every 4th frame is plenty: the bounce settles slower)
  if (!GI.gs || GI.gs.width !== gw || GI.gs.height !== gh) { GI.gs = luxCanvas(gw, gh); GI.gsg = GI.gs.getContext('2d', { willReadFrequently: true }); GI.f = 0; }
  if ((GI.f & 3) === 0) {
    const wx = GI.gx * cell, wy = GI.gy * cell, sx = (tr.a * wx + tr.e) * s, sy = (tr.d * wy + tr.f) * s, sw = tr.a * gw * cell * s, sh = tr.d * gh * cell * s;
    GI.gsg.setTransform(1, 0, 0, 1, 0, 0); GI.gsg.globalCompositeOperation = 'source-over'; GI.gsg.fillStyle = '#000'; GI.gsg.fillRect(0, 0, gw, gh);
    GI.gsg.drawImage(LUX.M, sx, sy, sw, sh, 0, 0, gw, gh);
    const d = GI.gsg.getImageData(0, 0, gw, gh).data, src = GI.src;
    for (let i = 0; i < N; i++) { src[i * 3] = d[i * 4] / 255; src[i * 3 + 1] = d[i * 4 + 1] / 255; src[i * 3 + 2] = d[i * 4 + 2] / 255; }
  }
  // the colour of what the light bounces off, read small from the picture before the lighting goes on (every 16th frame)
  if ((GI.f & 15) === 0) {
    if (!GI.ac || GI.ac.width !== gw || GI.ac.height !== gh) { GI.ac = luxCanvas(gw, gh); GI.acg = GI.ac.getContext('2d', { willReadFrequently: true }); }
    const wx = GI.gx * cell, wy = GI.gy * cell, sx = tr.a * wx + tr.e, sy = tr.d * wy + tr.f, sw = tr.a * gw * cell, sh = tr.d * gh * cell;
    GI.acg.setTransform(1, 0, 0, 1, 0, 0); GI.acg.fillStyle = '#555'; GI.acg.fillRect(0, 0, gw, gh); GI.acg.drawImage(cv, sx, sy, sw, sh, 0, 0, gw, gh);
    const d = GI.acg.getImageData(0, 0, gw, gh).data; if (!GI.alb || GI.alb.length !== N * 3) GI.alb = new Float32Array(N * 3);
    const A = GI.alb, base = bioBlend(GI_ALB, GI.albM || (GI.albM = []));
    for (let i = 0; i < N; i++) { const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], m = Math.max(r, g, b) + 20; A[i * 3] = base[0] * 0.4 + r / m * 0.24; A[i * 3 + 1] = base[1] * 0.4 + g / m * 0.24; A[i * 3 + 2] = base[2] * 0.4 + b / m * 0.24; }
  }
  // trace: half the cells this frame, the other half next frame. What a ray finds is the light there plus the bounce
  // already gathered there (so light keeps bouncing, a little less each time), coloured by the surface
  const occ = GI.occ, src = GI.src, acc = GI.acc, vis = GI.vis, alb = bioBlend(GI_ALB, GI.albM2 || (GI.albM2 = [])), AL = GI.alb && GI.alb.length === N * 3 ? GI.alb : null;
  const R = LUX.level >= 3 ? 3 : 2, S = 10, blend = 0.22, WALL = 0.5;
  let seed = GI.seed = (GI.seed * 1664525 + 1013904223) >>> 0, rays = 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let c = GI.f & 1; c < N; c += 2) {
    if (occ[c]) { acc[c * 3] = acc[c * 3 + 1] = acc[c * 3 + 2] = 0; vis[c] = 1; continue; }
    const cx = c % gw, cy = (c / gw) | 0; let r = 0, g = 0, b = 0, open = 0;
    for (let k = 0; k < R; k++) {
      const an = (k + rnd()) / R * 6.2832, dx = Math.cos(an), dy = Math.sin(an), len = 1 + rnd() * S;
      let lx = cx, ly = cy, hit = false;
      for (let t = 0.75; t < len; t += 0.75) {
        const ix = (cx + 0.5 + dx * t) | 0, iy = (cy + 0.5 + dy * t) | 0;
        if (ix < 0 || iy < 0 || ix >= gw || iy >= gh) break;
        if (occ[iy * gw + ix]) { hit = true; break; }
        lx = ix; ly = iy;
      }
      const j = (ly * gw + lx) * 3, w = hit ? WALL : 1, a0 = AL ? AL[j] : alb[0], a1 = AL ? AL[j + 1] : alb[1], a2 = AL ? AL[j + 2] : alb[2];
      r += (src[j] + acc[j] * 0.5) * a0 * w; g += (src[j + 1] + acc[j + 1] * 0.5) * a1 * w; b += (src[j + 2] + acc[j + 2] * 0.5) * a2 * w; if (!hit) open++;
    }
    rays += R;
    acc[c * 3] += (r / R - acc[c * 3]) * blend; acc[c * 3 + 1] += (g / R - acc[c * 3 + 1]) * blend; acc[c * 3 + 2] += (b / R - acc[c * 3 + 2]) * blend;
    vis[c] += (open / R - vis[c]) * blend;
  }
  GI.f++; GI.rays = rays;
  // into the light map: the bounce added, the crowded corners darkened a little
  if (!GI.out || GI.out.width !== gw || GI.out.height !== gh) { GI.out = luxCanvas(gw, gh); GI.outG = GI.out.getContext('2d'); GI.outImg = GI.outG.createImageData(gw, gh); GI.ao = luxCanvas(gw, gh); GI.aoG = GI.ao.getContext('2d'); GI.aoImg = GI.aoG.createImageData(gw, gh); }
  const gain = 0.9, day = LUX.day, aoK = 0.12 + 0.18 * day, o = GI.outImg.data, q = GI.aoImg.data;
  for (let i = 0; i < N; i++) {
    o[i * 4] = Math.min(255, acc[i * 3] * gain * 255); o[i * 4 + 1] = Math.min(255, acc[i * 3 + 1] * gain * 255); o[i * 4 + 2] = Math.min(255, acc[i * 3 + 2] * gain * 255); o[i * 4 + 3] = 255;
    const a = 255 * (1 - aoK * (1 - vis[i])); q[i * 4] = q[i * 4 + 1] = q[i * 4 + 2] = a; q[i * 4 + 3] = 255;
  }
  GI.outG.putImageData(GI.outImg, 0, 0); GI.aoG.putImageData(GI.aoImg, 0, 0);
  m.setTransform(tr.a * s, tr.b * s, tr.c * s, tr.d * s, tr.e * s, tr.f * s); m.imageSmoothingEnabled = true;
  const wx = GI.gx * cell, wy = GI.gy * cell, ww = gw * cell, wh = gh * cell;
  m.globalCompositeOperation = 'multiply'; m.drawImage(GI.ao, wx, wy, ww, wh);
  m.globalCompositeOperation = 'lighter'; m.drawImage(GI.out, wx, wy, ww, wh);
  m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-over';
  GI.ms = performance.now() - t0;
}

/* ---------- what the other engines need from this one ---------- */
// the brightest lights on screen (for light shafts and bloom), the hot spots (for heat haze), the sun and the sky
function luxExport(amb, use) {
  const F = CORE.frame, L = LUX.lights, idx = LUX.idx, out = F.lights; out.length = 0;
  F.amb = amb; F.day = LUX.day; F.night = 1 - LUX.day;
  const sc = [0, 0];
  for (let q = 0; q < Math.min(use, LUX.n) && out.length < 6; q++) {
    const l = L[idx[q]]; if (l.i < 0.35 || l.pr < 0) continue;
    coreToScreen(l.x, l.y, sc); out.push({ sx: sc[0], sy: sc[1], r: l.r * CORE.frame.zoom * CORE.frame.dpr, c0: l.c0, c1: l.c1, c2: l.c2, i: l.i, cone: l.cone });
  }
  const hot = F.hot; hot.length = 0;
  for (const f of WD.fires) { if (hot.length >= 8) break; if (f.lit === 0 || f.x < F.x0 - 200 || f.x > F.x1 + 200 || f.y < F.y0 - 200 || f.y > F.y1 + 200) continue; coreToScreen(f.x, f.y, sc); hot.push({ sx: sc[0], sy: sc[1], r: f.r * 4 * F.zoom * F.dpr, k: 0.8 }); }
  for (const e of LUX.fx) { if (hot.length >= 8) break; if (e.i < 1.1) continue; coreToScreen(e.x, e.y, sc); hot.push({ sx: sc[0], sy: sc[1], r: e.r * 0.5 * F.zoom * F.dpr, k: e.life / e.max }); }
  for (const h of G.haz) { if (hot.length >= 8) break; if (h.k !== 'fire' || h.x < F.x0 - 100 || h.x > F.x1 + 100 || h.y < F.y0 - 100 || h.y > F.y1 + 100) continue; coreToScreen(h.x, h.y, sc); hot.push({ sx: sc[0], sy: sc[1], r: h.r * 2.5 * F.zoom * F.dpr, k: 0.6 }); }
}

coreAdd({
  name: 'LUX', kind: 'render', does: 'Lighting engine: ray-traced shadows from every lamp, fire, muzzle flash, headlight and the flashlight; lamps with heights, so cars, trees, bushes and bodies throw shadows away from them; zombies throw shadows shaped by their pose, arms and legs moving with them; a moving sun as an area light whose shadows soften towards the tip; visible beams in rain and fog; path-traced bounce light, day and night, bloom.',
  state: () => SET.lux === 'off' ? 'off' : LUX.offUntil && performance.now() < LUX.offUntil ? 'paused' : LUX.live ? 'on' : 'idle',
  level: () => ['glow only', 'few shadows', 'shadows + bloom', 'soft shadows', 'full'][LUX.level] + (LUX.giOn ? ', bounce light' + (typeof PRISM !== 'undefined' && PRISM.giGpu ? ' (GPU)' : ' (CPU)') : '') + (CORE.frame.sun.on ? ', sun' : ''),
  canTrim: () => LUX.level > 0, trim: () => { if (LUX.adapt <= -3) return false; LUX.adapt--; LUX.A = null; return true; }, boost: () => { if (LUX.adapt >= 0) return false; LUX.adapt++; LUX.A = null; return true; },
  repair: () => { LUX.A = null; LUX.offUntil = 0; LUX.errT.length = 0; }
});
// CORE v3: how the hub reads, steps, checks and teaches the lighting engine
coreMeta('LUX', { ver: 4, provides: ['light', 'shadows', 'bloom', 'sun'], feats: { want: ['offscreen'] },
  lv: () => LUX.level | 0, adaptGet: () => LUX.adapt, loadNow: () => (CORE.frame.lights || []).length, loadName: 'lights',
  alive: () => G.mode === 'play' && SET.lux !== 'off' && !(LUX.offUntil > performance.now()), beatOwn: true,
  check: () => !(LUX.adapt <= 0 && LUX.adapt >= -3) ? 'its level went out of range' : LUX.live && LUX.A && !(LUX.cw > 0) ? 'its light map lost its size' : '',
  reset: () => { LUX.adapt = clamp(LUX.adapt | 0, -3, 0); LUX.A = null; LUX.offUntil = 0; LUX.errT.length = 0; LUX.fx.length = 0; LUX.bad = 0; try { luxWarm(); } catch (x) { } },
  selfTest: () => { const n = 2, a = LUXQ.length === 5 && LUXQ.every(q => q.res > 0 && q.lights >= 0), b = typeof luxLevelNow('auto') === 'number'; return { ok: a && b, n: n, pass: (a ? 1 : 0) + (b ? 1 : 0), why: a ? (b ? '' : 'it could not pick a level') : 'its quality table is broken' }; } });

