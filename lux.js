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
  occ: new Float32Array(4 * 160), occE: new Uint8Array(160), nocc: 0, view: [0, 0, 0, 0], cand: [], G1: null, g1: null, ang: new Float32Array(1600), pts: new Float32Array(3300), spr: new Map(), probe: 0
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
  return (LUX.h0 + G.time / 24) % 24;                             // a day lasts about ten minutes of play
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
  const k = clamp(1 - WX.dark * 0.8 - (WORLD.cur && WORLD.cur.bio === 'ash' ? 0.07 : 0), 0.35, 1), fl = WX.flash > 0.01 ? WX.flash * 0.7 : 0;
  out[0] = Math.min(1, r * k + fl); out[1] = Math.min(1, g * k + fl); out[2] = Math.min(1, b * k + fl);
  LUX.day = day;
  return out;
}

/* ---------- transient lights: muzzle flashes, blasts, strikes ---------- */
// x, y: where · r: how far it reaches · col: 'r,g,b' · i: strength · life: seconds · o.shade: cast shadows
function luxFlash(x, y, r, col, i, life, o) {
  if (SET.lux === 'off') return;
  const a = LUX.fx; if (a.length > 28) a.shift();
  a.push({ x: x, y: y, r: r, col: col, i: i, life: life, max: life, shade: !!(o && o.shade), cone: o && o.cone });
}

/* ---------- canvases ---------- */
function luxCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(2, w); c.height = Math.max(2, h); return c; }
function luxBuild() {
  const lq = LUXQ[LUX.level], cw = Math.max(2, Math.round(cv.width * lq.res)), ch = Math.max(2, Math.round(cv.height * lq.res));
  LUX.A = luxCanvas(cw, ch); LUX.ag = LUX.A.getContext('2d'); LUX.M = luxCanvas(cw, ch); LUX.mg = LUX.M.getContext('2d');
  LUX.B1 = luxCanvas(Math.ceil(cw / 3), Math.ceil(ch / 3)); LUX.b1 = LUX.B1.getContext('2d');
  LUX.B2 = luxCanvas(Math.ceil(cw / 9), Math.ceil(ch / 9)); LUX.b2 = LUX.B2.getContext('2d');
  LUX.G1 = luxCanvas(cw, ch); LUX.g1 = LUX.G1.getContext('2d');
  if (!LUX.ag || !LUX.mg || !LUX.b1 || !LUX.b2 || !LUX.g1) throw new Error('lux: no canvas context');
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
const LAMP = [255, 190, 112], LAMPC = [160, 200, 255];
function luxPush(x, y, r, c0, c1, c2, i, shade, pr, cone) {
  if (!(r > 1) || !(i > 0.004) || !isFinite(x + y + r + i)) return;
  const V = LUX.view; if (x + r < V[0] || x - r > V[2] || y + r < V[1] || y - r > V[3]) return;   // its light never reaches the screen
  const a = LUX.lights, n = LUX.n++;
  const L = a[n] || (a[n] = { x: 0, y: 0, r: 0, c0: 0, c1: 0, c2: 0, i: 0, shade: false, pr: 0, cone: null, d: 0 });
  L.x = x; L.y = y; L.r = r; L.c0 = c0; L.c1 = c1; L.c2 = c2; L.i = i; L.shade = shade; L.pr = pr; L.cone = cone || null;
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
      const col = L.cold ? LAMPC : LAMP;
      // the lamps come on at dusk (a cloudy, stormy day turns them on early) and are off in daylight
      const on = clamp((night + WX.dark * 0.5 - 0.12) / 0.3, 0, 1); if (on <= 0) continue;
      luxPush(L.x, L.y, 140 * SCL, col[0], col[1], col[2], (0.55 + 0.45 * night) * k * on, true, 0);
    }
    if (!c.luxR) c.luxR = c.rects.filter(r => r.burn || r.police);
    // windows and shop fronts: the city still has power in places, and its light spills onto the sidewalk at night
    if (night > 0.05) {
      if (!c.spill) c.spill = luxSpill(c);
      for (let j = 0; j < c.spill.length; j++) {
        const L = c.spill[j]; if (L.x < x0 - m || L.x > x1 + m || L.y < y0 - m || L.y > y1 + m) continue;
        let k = night;
        if (L.fl) { const f = Math.sin(t * 9 + L.x) + Math.sin(t * 23.7 + L.y * 0.03); if (f > 1.4) k *= 0.15; }
        luxPush(L.x, L.y, L.r, L.c0, L.c1, L.c2, L.i * k, false, -1);
      }
    }
    for (const r of c.luxR) {
      if (r.burn && r.x < x1 + m && r.x + r.w > x0 - m && r.y < y1 + m && r.y + r.h > y0 - m) {
        const fl = 0.75 + 0.25 * Math.sin(t * 11 + r.x * 0.01) + 0.1 * Math.sin(t * 23 + r.y);
        luxPush(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.55 + 200, 255, 120, 44, 0.8 * fl, false, 0);
      }
      if (r.police && r.x < x1 + m && r.x + r.w > x0 - m && r.y < y1 + m && r.y + r.h > y0 - m) {
        const ph = Math.floor(t * 6) % 2;
        luxPush(r.x + r.w / 2 + (ph ? -14 : 14), r.y + r.h / 2, 230 * uk, ph ? 255 : 70, ph ? 60 : 120, ph ? 60 : 255, 0.8, true, 1);
      }
    }
  }
  // fires
  for (const f of WD.fires) {
    if (f.x < x0 - m || f.x > x1 + m || f.y < y0 - m || f.y > y1 + m || f.lit === 0) continue;
    const fl = 0.78 + 0.22 * Math.sin(t * 12 + f.ph * 5) + 0.1 * Math.sin(t * 29 + f.ph);
    luxPush(f.x, f.y, f.r * 3.3 + 150, 255, 128, 48, 0.95 * fl, true, 0);
  }
  for (const a of (G.alarms || [])) {
    if (!a.r || a.r.x < x0 - m || a.r.x > x1 + m) continue;
    const ph = Math.floor(t * 5) % 2; luxPush(a.r.x + a.r.w / 2, a.r.y + a.r.h / 2, 190 * uk, 255, ph ? 230 : 150, ph ? 120 : 60, 0.7, false, 0);
  }
  // hazards that glow
  for (const h of G.haz) {
    if (h.x < x0 - m || h.x > x1 + m || h.y < y0 - m || h.y > y1 + m) continue;
    const f = clamp(h.life / h.max * 2, 0, 1);
    if (h.k === 'fire') luxPush(h.x, h.y, h.r * 2.8 + 90, 255, 128, 44, 0.8 * f * (0.8 + 0.2 * Math.sin(t * 17 + h.x)), false, 0);
    else if (h.k === 'acid') luxPush(h.x, h.y, h.r * 2.2 + 60, 150, 255, 70, 0.55 * f, false, 0);
    else if (h.k === 'ice') luxPush(h.x, h.y, h.r * 2.2 + 60, 150, 220, 255, 0.55 * f, false, 0);
    else if (h.k === 'spore') luxPush(h.x, h.y, h.r * 2 + 60, 190, 215, 100, 0.35 * f, false, 0);
    else if (h.k === 'vortex') luxPush(h.x, h.y, h.r * 1.6, 150, 90, 255, 0.5 * f, false, 0);
  }
  // flames from a flamethrower
  let nf = 0;
  for (let i = 0; i < G.bullets.length && nf < 4; i += 3) { const b = G.bullets[i]; if (b.kind === 'flame') { nf++; luxPush(b.x, b.y, 230 * uk, 255, 140, 56, 0.7, false, 0); } }
  // flashes
  const a = LUX.fx;
  for (let i = a.length - 1; i >= 0; i--) {
    const e = a[i]; e.life -= dt; if (e.life <= 0) { a.splice(i, 1); continue; }
    if (e.x < x0 - m || e.x > x1 + m || e.y < y0 - m || e.y > y1 + m) continue;
    const f = e.life / e.max, k = f * f * (3 - 2 * f), cc = e.col.split(',');
    luxPush(e.x, e.y, e.r * (0.7 + 0.3 * k), +cc[0], +cc[1], +cc[2], e.i * k, e.shade, 2, e.cone);
  }
  // bosses and strong things glow a little
  for (const z of G.zs) {
    if (z.dead || !z.boss || z.x < x0 - m || z.x > x1 + m || z.y < y0 - m || z.y > y1 + m) continue;
    const el = z.rb && z.rb.def && z.rb.def.el, col = el === 'fire' ? [255, 110, 40] : el === 'ice' ? [140, 210, 255] : el === 'toxic' || el === 'poison' ? [150, 240, 70] : el === 'shock' || el === 'volt' ? [255, 240, 110] : el === 'void' ? [160, 90, 255] : [255, 90, 70];
    luxPush(z.x, z.y, z.r * 5 + 120, col[0], col[1], col[2], 0.55, false, 0);
  }
  // you: a flashlight and a small glow, so you are never lost in the dark
  const p = G.p;
  if (p && G.mode !== 'title' && !p.down && night > 0.04) {
    const aim = p.aim, rr = 6 * PK;
    luxPush(p.x, p.y, 120 * PK + 30, 255, 232, 190, 0.5 * night, false, 3);
    luxPush(p.x + Math.cos(aim) * rr, p.y + Math.sin(aim) * rr, 300 * (0.55 + 0.45 * SCL), 255, 238, 200, 0.95 * night, true, 3, { a: aim, h: 0.42 });
  }
  if (NET.started) {
    const each = NET.role === 'host' ? Array.from(NET.peers.values()).map(q => q.p).filter(Boolean) : Array.from(NET.others.values());
    for (const q of each) if (q && !q.down && night > 0.04 && q.x > x0 - m && q.x < x1 + m && q.y > y0 - m && q.y < y1 + m) {
      luxPush(q.x, q.y, 110, 255, 232, 190, 0.45 * night, false, 1);
      if (q.aim != null) luxPush(q.x + Math.cos(q.aim) * 6, q.y + Math.sin(q.aim) * 6, 420, 255, 238, 200, 0.7 * night, false, 1, { a: q.aim, h: 0.4 });
    }
  }
}

/* ---------- rays ---------- */
// the walls near a light, as boxes, from the same lists the game collides with
// ents: the zombies near the light block it too (your flashlight and your own gunfire throw their shadows)
function luxOcc(lx, ly, R, ents) {
  const rs = rectsNear(lx, ly, R), o = LUX.occ, cand = LUX.cand; let n = 0;
  cand.length = 0;
  for (let i = 0; i < rs.length; i++) {
    const r = rs[i]; if (r.low || r.k === 'rail' || r.k === 'bridge' || r.k === 'deck') continue;
    if (r.w < 8 && r.h < 8) continue;
    if (lx > r.x && lx < r.x + r.w && ly > r.y && ly < r.y + r.h) continue;      // a light inside a box is not blocked by it
    cand.push(r);
  }
  // too many walls in reach (a big flash in a dense block): keep the nearest, they hide the rest anyway
  if (cand.length > 160) {
    for (const r of cand) { const nx = clamp(lx, r.x, r.x + r.w), ny = clamp(ly, r.y, r.y + r.h); r._ld = (nx - lx) * (nx - lx) + (ny - ly) * (ny - ly); }
    cand.sort((a, b) => a._ld - b._ld); cand.length = 160;
  }
  const E = LUX.occE;
  for (const r of cand) { const k = n * 4; o[k] = r.x; o[k + 1] = r.y; o[k + 2] = r.x + r.w; o[k + 3] = r.y + r.h; E[n] = 0; n++; }
  // a zombie is lit on the side facing the light and throws its shadow behind (rays stop where they leave its body)
  if (ents && n < 150) {
    const R2 = R * R; let ne = 0;
    for (const z of G.zs) {
      if (z.dead || z.fly || (z.st && z.st.under) || z.illusion) continue;
      const dx = z.x - lx, dy = z.y - ly, d2 = dx * dx + dy * dy, h = z.r * 0.7;
      if (d2 > R2 || d2 < (h + 2) * (h + 2)) continue;
      const k = n * 4; o[k] = z.x - h; o[k + 1] = z.y - h; o[k + 2] = z.x + h; o[k + 3] = z.y + h; E[n] = 1; n++;
      if (++ne >= 28 || n >= 160) break;
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
function luxPoly(lx, ly, R, rays, a0, a1, ents) {
  const n = luxOcc(lx, ly, R, ents), A = LUX.ang; let na = 0, full = a1 - a0 >= 6.28;
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
        if (!full) { while (q < a0 - 3.1416) q += 6.2832; while (q > a0 + 3.1416) q -= 6.2832; if (q < a0 || q > a1) continue; }
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
function luxGrad(g, L, k) {
  const r = L.r, gr = g.createRadialGradient(L.x, L.y, 0, L.x, L.y, r), i = L.i * k, c = 'rgba(' + L.c0 + ',' + L.c1 + ',' + L.c2 + ',';
  gr.addColorStop(0, c + Math.min(1, i) + ')'); gr.addColorStop(0.1, c + Math.min(1, i * 0.72) + ')'); gr.addColorStop(0.3, c + Math.min(1, i * 0.34) + ')');
  gr.addColorStop(0.6, c + (i * 0.1).toFixed(3) + ')'); gr.addColorStop(1, c + '0)');
  return gr;
}
function luxDraw(g, L, lq, shadowed) {
  if (L.cone) {
    // a beam: a wide dim cone and a narrow bright one
    for (const [k, w] of [[0.55, 1], [0.5, 0.62]]) {
      const half = L.cone.h * w;
      if (shadowed && lq.rays) { const np = luxPoly(L.x, L.y, L.r, Math.max(10, lq.rays >> 1), L.cone.a - half, L.cone.a + half, lq.rays >= 72); if (np < 6) continue; luxPath(g, np); }
      else { g.beginPath(); g.moveTo(L.x, L.y); g.arc(L.x, L.y, L.r, L.cone.a - half, L.cone.a + half); g.closePath(); }
      g.fillStyle = luxGrad(g, L, k); g.fill();
    }
    return;
  }
  if (shadowed && lq.rays) {
    const soft = lq.soft && L.pr >= 2 && L.r < 520 ? lq.soft + 1 : 1, off = Math.min(26, L.r * 0.07);
    for (let s = 0; s < soft; s++) {
      const a = s * 2.4 + 0.5, ox = soft > 1 ? Math.cos(a) * off : 0, oy = soft > 1 ? Math.sin(a) * off : 0;
      const np = luxPoly(L.x + ox, L.y + oy, L.r + off, lq.rays, 0, 6.2832, L.pr >= 2 && lq.rays >= 72 && L.r < 700); if (np < 6) continue;
      luxPath(g, np); g.fillStyle = luxGrad(g, L, 1 / soft); g.fill();
    }
  } else { g.fillStyle = luxGrad(g, L, 1); g.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2); }
}

/* ---------- one frame: called by render() after the world is drawn ---------- */
function luxLevelNow(want) {
  const base = want === 'auto' ? [1, 2, 3, 4][clamp(PERF.tier | 0, 0, 3)] : want === 'basic' ? 1 : want === 'full' ? 3 : want === 'ultra' ? 4 : (+want || 2);
  return clamp(base + LUX.adapt, 0, 4);
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
  // the map: ambient colour plus the lights, multiplied over the picture
  const m = LUX.mg; m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-over';
  m.fillStyle = 'rgb(' + Math.round(amb[0] * 255) + ',' + Math.round(amb[1] * 255) + ',' + Math.round(amb[2] * 255) + ')'; m.fillRect(0, 0, LUX.cw, LUX.ch);
  m.globalCompositeOperation = 'lighter'; m.drawImage(LUX.A, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (dark && LUX.mul) { ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(LUX.M, 0, 0, cv.width, cv.height); }
  else if (dark) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1 - (amb[0] + amb[1] + amb[2]) / 3; ctx.fillStyle = '#080c16'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalAlpha = 1; }   // no multiply on this device: a plain dark veil
  // glow and bloom: the light itself, added on top
  ctx.globalCompositeOperation = 'lighter';
  const night = 1 - LUX.day, wet = clamp(WX.rain * 1.2 + (WX.storm || 0) * 0.4, 0, 1), fogk = clamp(WX.fog, 0, 1);
  if (use) {
    // wet streets shine and fog glows around every lamp
    ctx.globalAlpha = Math.min(1, (0.1 + 0.12 * night) * (1 + 0.6 * wet + 0.8 * fogk)); ctx.drawImage(LUX.A, 0, 0, cv.width, cv.height);
    if (lq.bloom && SET.bloom !== false) {
      LUX.b1.clearRect(0, 0, LUX.B1.width, LUX.B1.height); LUX.b1.drawImage(LUX.A, 0, 0, LUX.B1.width, LUX.B1.height);
      ctx.globalAlpha = Math.min(1, (0.16 + 0.12 * night) * (1 + 0.4 * wet + 1.2 * fogk)); ctx.drawImage(LUX.B1, 0, 0, cv.width, cv.height);
      if (lq.bloom > 1) {
        LUX.b2.clearRect(0, 0, LUX.B2.width, LUX.B2.height); LUX.b2.drawImage(LUX.B1, 0, 0, LUX.B2.width, LUX.B2.height);
        ctx.globalAlpha = Math.min(1, (0.2 + 0.14 * night) * (1 + 0.4 * wet + 1.2 * fogk)); ctx.drawImage(LUX.B2, 0, 0, cv.width, cv.height);
      }
    }
    // rain and snow caught in the light: streaks and flakes, only where a lamp, a fire or your flashlight reaches
    if (lq.bloom && (WX.rain > 0.08 || WX.snow > 0.08) && wxLevel() > 0 && night > 0.15) { luxGlints(lq); ctx.globalAlpha = 0.85 * night; ctx.drawImage(LUX.G1, 0, 0, cv.width, cv.height); }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  LUX.live = true;
}
function luxGlints(lq) {
  const g = LUX.g1, w = LUX.cw, h = LUX.ch, k = DPR * lq.res, sc = Math.min(W, H) / 480;
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
  g.globalCompositeOperation = 'multiply'; g.drawImage(LUX.A, 0, 0); g.globalCompositeOperation = 'source-over';
}
function noteLux() { if (LUX.repairs++ > 0) noteRepair('Rebuilt the lighting canvases'); }
// something went wrong inside the engine: remember it, and back off if it keeps going wrong
function luxHurt(e) {
  const now = performance.now(); LUX.lastErr = String(e && e.message || e).slice(0, 120);
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
  else if (LUX.msAvg < budget * 0.45 && LUX.adapt < 0) { if (++LUX.bad >= 12) { LUX.adapt++; LUX.bad = 0; } }
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
  const ms = performance.now() - t0; PERF.sec.lux = (PERF.sec.lux || 0) + ms; luxWatch(ms);
}
// a new run: the morning
function luxNewRun() { LUX.h0 = 8.5 + Math.random() * 5.5; LUX.fx.length = 0; LUX.adapt = Math.min(0, LUX.adapt + 1); }
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
