/* ================= SKYWAY: the highway engine =================
   Elevated highways cross the city on concrete piers, eight metres up, running straight for kilometres along a road,
   east-west or north-south, through every kind of district. Where two of them meet there is an interchange: loops and
   flyovers stacked at different heights (a spaghetti junction), each ramp on its own row of piers.
   - Up on the deck: four lanes with their markings, jersey barriers, expansion joints, light poles, green signs on
     gantries, and the traffic that was stuck there when it all went wrong (cars, trucks, buses and semis, many burned).
     In the destroyed districts whole spans have collapsed onto the street below, leaving a gap with rebar hanging out
     and a heap of concrete in the road.
   - Down on the street: the piers are solid (cover, and something to run round), the road continues underneath, and
     the deck keeps the ground beneath it in shade. The deck throws its shadow with the sun like everything else.
   - The deck is drawn over everything at street level, and fades to a ghost when you walk under or near it, so you
     never lose sight of yourself or what is chasing you. At night it is lit by its own lamps.
   Where the highways run is worked out from the city's seed, so every player in co-op has the same ones. */
const SKY = { rows: new Map(), cols: new Map(), S2: null, s2: null, drawn: 0, ms: 0 };
const SKY_W = 200, SKY_H = 7.5, SKY_HV = 10.5;   // deck width (block units), deck heights (metres): the north-south ones pass over
function skyRaw(i, salt) { return (Z.hash32((i * 0x9E3779B1) ^ (WORLD.seed * 7 + salt)) >>> 0) % 9 === 4; }
// does a highway run along the east-west road at the top of chunk row j (or the north-south road of column i)?
function skyRow(j) { let v = SKY.rows.get(j); if (v === undefined) { v = skyRaw(j, 0x4b1d) && !skyRaw(j - 1, 0x4b1d); if (SKY.rows.size > 4000) SKY.rows.clear(); SKY.rows.set(j, v); } return v; }
function skyCol(i) { let v = SKY.cols.get(i); if (v === undefined) { v = skyRaw(i, 0x7a5e) && !skyRaw(i - 1, 0x7a5e); if (SKY.cols.size > 4000) SKY.cols.clear(); SKY.cols.set(i, v); } return v; }
function skyReset() { SKY.rows.clear(); SKY.cols.clear(); }
// a collapsed span on this stretch (destroyed districts only): where along the chunk, and how long; same on every device
function skyGap(cx, cy, vert) {
  const bio = distAt(cx, cy).bio;
  if (bio !== 'ruins' && bio !== 'ash' && bio !== 'burning') return null;
  const h = Z.hash32((cx * 92837111) ^ (cy * 689287499) ^ (vert ? 0x51 : 0x15) ^ WORLD.seed) >>> 0;
  if (h % 100 >= (bio === 'ruins' ? 40 : 18)) return null;
  return { at: ROAD + 60 + (h >>> 8) % 280, len: 70 + (h >>> 16) % 70 };
}
// the four quadrant loops and two flyovers of an interchange centred on (px, py), as centre lines in block units
function skyRamps(px, py) {
  const out = [], D = 165, Rr = 105;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const cx = px + sx * D, cy = py + sy * D, a0 = Math.atan2(-sy, 0), pts = [];
    // a loop of three quarters, from the east-west deck round to the north-south one
    for (let k = 0; k <= 24; k++) { const a = a0 + sx * sy * (k / 24) * Math.PI * 1.5; pts.push(cx + Math.cos(a) * Rr, cy + Math.sin(a) * Rr); }
    out.push({ pts: pts, w: 58, h: 4.5 + ((sx + sy + 2) % 3) * 0.6 });
  }
  for (const s of [-1, 1]) {
    const pts = [];
    for (let k = 0; k <= 30; k++) { const t = k / 30, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; const x0 = px - s * 470, y0 = py - 70 * s, x1 = px + 70 * s, y1 = py + s * 470, qx = px - s * 30, qy = py - s * 30; pts.push(a * x0 + b * qx + c * x1, a * y0 + b * qy + c * y1); }
    out.push({ pts: pts, w: 62, h: 14 + (s > 0 ? 2.5 : 0), fly: true });
  }
  return out;
}
/* ---------- generation (called from the city generator, in block units) ---------- */
// keep the strip of the block under a deck (or the corner of an interchange) clear of buildings and trees
function skyKeep(c) {
  const ox = c.ox, oy = c.oy, cx = c.cx, cy = c.cy, bx = ox + ROAD, by = oy + ROAD, o = SKY_W / 2 - ROAD / 2 + 8;
  if (skyRow(cy)) keepClear(c, bx, by, BS, o);
  if (skyRow(cy + 1)) keepClear(c, bx, oy + CH - o, BS, o);
  if (skyCol(cx)) keepClear(c, bx, by, o, BS);
  if (skyCol(cx + 1)) keepClear(c, ox + CH - o, by, o, BS);
  // the interchange corners: the loops need the corner of each of the four blocks round a crossing
  for (const [ix, iy, qx, qy] of [[cx, cy, 1, 1], [cx + 1, cy, -1, 1], [cx, cy + 1, 1, -1], [cx + 1, cy + 1, -1, -1]]) {
    if (!skyRow(iy) || !skyCol(ix)) continue;
    const px = ix * CH + ROAD / 2, py = iy * CH + ROAD / 2, S = 300;
    keepClear(c, qx > 0 ? bx : ox + CH - S, qy > 0 ? by : oy + CH - S, S, S);
    c.xing = true;
    void px; void py;
  }
}
// the piers: down the middle of the road under each deck, and under every ramp of an interchange; collapsed spans leave
// a heap of rubble in the street
function skyPillars(c, R) {
  const ox = c.ox, oy = c.oy, cx = c.cx, cy = c.cy, bx = ox + ROAD, P = 18;
  const free = (x, y, s) => { for (const r of c.rects) if (x < r.x + r.w && x + s > r.x && y < r.y + r.h && y + s > r.y) return false; return !c.wm || !waterAtC(c, x + s / 2, y + s / 2); };
  const pier = (x, y) => { if (free(x - P / 2, y - P / 2, P)) c.rects.push({ x: x - P / 2, y: y - P / 2, w: P, h: P, k: 'pillar' }); };
  if (skyRow(cy)) { const gp = skyGap(cx, cy, false); for (let x = bx + 50; x < ox + CH - 30; x += 165) if (!gp || x < ox + gp.at - 20 || x > ox + gp.at + gp.len + 20) pier(x, oy + ROAD / 2); if (gp) skyRubble(c, R, ox + gp.at, oy + 6, gp.len, ROAD - 12); }
  if (skyCol(cx)) { const gp = skyGap(cx, cy, true); for (let y = oy + ROAD + 50; y < oy + CH - 30; y += 165) if (!gp || y < oy + gp.at - 20 || y > oy + gp.at + gp.len + 20) pier(ox + ROAD / 2, y); if (gp) skyRubble(c, R, ox + 6, oy + gp.at, ROAD - 12, gp.len); }
  // ramps of any interchange touching this block
  for (const [ix, iy] of [[cx, cy], [cx + 1, cy], [cx, cy + 1], [cx + 1, cy + 1]]) {
    if (!skyRow(iy) || !skyCol(ix)) continue;
    for (const rp of skyRamps(ix * CH + ROAD / 2, iy * CH + ROAD / 2)) {
      const p = rp.pts;
      for (let k = 2; k < p.length - 2; k += rp.fly ? 6 : 4) { const x = p[k], y = p[k + 1]; if (x > ox + 8 && x < ox + CH - 8 && y > oy + 8 && y < oy + CH - 8) { const s = 14; if (free(x - s / 2, y - s / 2, s)) c.rects.push({ x: x - s / 2, y: y - s / 2, w: s, h: s, k: 'pillar' }); } }
    }
  }
}
function skyRubble(c, R, x, y, w, h) {
  for (let i = 0; i < 4; i++) { const s = 18 + R() * 22, rx = x + R() * Math.max(1, w - s), ry = y + R() * Math.max(1, h - s); if (freeAt(c, rx, ry, s, s * 0.8, 2)) c.rects.push({ x: rx, y: ry, w: s, h: s * (0.6 + R() * 0.4), k: 'rub', s: (R() * 1e9) | 0, roof: '#6d6f73' }); }
}
// highway lamps for a block's lamp list (block units): along both edges of each deck through it
function skyLamps(cx, cy, L) {
  const ox = cx * CH, oy = cy * CH, e = SKY_W / 2 - 6;
  if (skyRow(cy)) for (let x = ox + 100, k = 0; x < ox + CH; x += 320, k++) L.push({ x: x, y: oy + ROAD / 2 + (k % 2 ? e : -e), cold: true, hw: true, broken: false });
  if (skyCol(cx)) for (let y = oy + 260, k = 0; y < oy + CH; y += 320, k++) L.push({ x: ox + ROAD / 2 + (k % 2 ? e : -e), y: y, cold: true, hw: true, broken: false });
}
/* ---------- what overlaps a block (for drawing, shadows and fading), in block units ---------- */
function skyInfo(c) {
  if (c.sky !== undefined) return c.sky;
  const cx = c.cx, cy = c.cy, ox = c.ox, oy = c.oy, decks = [], ramps = [];
  const hy = (j) => j * CH + ROAD / 2, vx = (i) => i * CH + ROAD / 2;
  for (const j of [cy, cy + 1]) if (skyRow(j)) decks.push({ x: ox, y: hy(j) - SKY_W / 2, w: CH, h: SKY_W, v: false, h0: SKY_H, own: j === cy, ocx: cx, ocy: j });
  for (const i of [cx, cx + 1]) if (skyCol(i)) decks.push({ x: vx(i) - SKY_W / 2, y: oy, w: SKY_W, h: CH, v: true, h0: SKY_HV, own: i === cx, ocx: i, ocy: cy });
  for (const [ix, iy] of [[cx, cy], [cx + 1, cy], [cx, cy + 1], [cx + 1, cy + 1]]) if (skyRow(iy) && skyCol(ix)) for (const rp of skyRamps(vx(ix), hy(iy))) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let k = 0; k < rp.pts.length; k += 2) { x0 = Math.min(x0, rp.pts[k]); x1 = Math.max(x1, rp.pts[k]); y0 = Math.min(y0, rp.pts[k + 1]); y1 = Math.max(y1, rp.pts[k + 1]); }
    if (x1 + rp.w < ox || x0 - rp.w > ox + CH || y1 + rp.w < oy || y0 - rp.w > oy + CH) continue;
    ramps.push(rp);
  }
  const vis = decks.filter(d => d.x < ox + CH && d.x + d.w > ox && d.y < oy + CH && d.y + d.h > oy);
  c.sky = vis.length || ramps.length ? { decks: vis, ramps: ramps } : null;
  return c.sky;
}
/* ---------- the elevated layer of a block, drawn once ---------- */
function skyCanvas(c) {
  const S = skyInfo(c); if (!S) return null;
  const sc = Q.chunkScale, px = Math.min(sc * c.k, 2048 / CH) * 0.72;
  if (c.skyc && c.skysc === sc && !c.skyStale) return c.skyc;
  const can = document.createElement('canvas'); can.width = can.height = Math.max(8, Math.round(CH * px));
  const g = can.getContext('2d'); g.scale(px, px); g.translate(-c.ox, -c.oy);
  const R = chunkRng(c.cx, c.cy, 0x5c1e), bio = c.bio, win = typeof winterOn === 'function' && winterOn(c) || bio === 'snow';
  const conc = bio === 'desert' ? '#8a7c66' : bio === 'snow' ? '#8e979f' : bio === 'ash' ? '#6a6a6d' : bio === 'burning' ? '#4e4a46' : '#595c62';
  try {
    // ramps underneath (the low loops), then the decks, then the flyovers above everything
    for (const rp of S.ramps) if (!rp.fly) skyRibbon(g, rp, conc, win, R);
    for (const d of S.decks) if (!d.v) skyDeck(g, c, d, conc, win);
    for (const d of S.decks) if (d.v) skyDeck(g, c, d, conc, win);
    for (const rp of S.ramps) if (rp.fly) skyRibbon(g, rp, conc, win, R);
  } catch (e) { coreHurt('SKYWAY', e); }
  c.skyc = can; c.skysc = sc; c.skyStale = false;
  return can;
}
function skyDeck(g, c, d, conc, win) {
  let R;
  const v = d.v, L = v ? d.h : d.w, x = d.x, y = d.y, w = d.w, h = d.h;
  // a collapsed span leaves a gap in the deck (only on this block's own stretch)
  // everything up here is seeded by the block that owns this stretch, so the blocks it overhangs draw the same thing
  const gp = skyGap(d.ocx, d.ocy, v); R = chunkRng(d.ocx, d.ocy, v ? 0x5c77 : 0x5c1e);
  g.save();
  if (gp) { g.beginPath(); g.rect(c.ox - 50, c.oy - 50, CH + 100, CH + 100); if (v) g.rect(x - 5, c.oy + gp.at, w + 10, gp.len); else g.rect(c.ox + gp.at, y - 5, gp.len, h + 10); g.clip('evenodd'); }
  // the slab, its underside showing at the edges, the concrete texture
  g.fillStyle = 'rgba(0,0,0,0.35)'; if (v) g.fillRect(x - 3, y, w + 6, h); else g.fillRect(x, y - 3, w, h + 6);
  g.fillStyle = conc; g.fillRect(x, y, w, h);
  grainFill(g, x, y, w, h, 0.6, 0.9);
  const R2 = Z.mulberry32(Z.hash32(Math.round(x * 7 + y * 13) | 0));
  for (let i = 0; i < 6; i++) softBlob(g, x + R2() * w, y + R2() * h, 14 + R2() * 30, 8 + R2() * 14, R2() * 3, '0,0,0', 0.12);
  // jersey barriers along both edges and down the median
  const bar = (o, t) => { g.fillStyle = 'rgba(0,0,0,0.3)'; if (v) g.fillRect(x + o + 2, y, t, h); else g.fillRect(x, y + o + 2, w, t); g.fillStyle = '#a9abad'; if (v) g.fillRect(x + o, y, t, h); else g.fillRect(x, y + o, w, t); g.fillStyle = 'rgba(255,255,255,0.25)'; if (v) g.fillRect(x + o, y, t * 0.35, h); else g.fillRect(x, y + o, w, t * 0.35); };
  const W2 = v ? w : h; bar(1, 7); bar(W2 - 8, 7); bar(W2 / 2 - 4, 8);
  // lane lines: solid edges, dashed between lanes
  g.strokeStyle = 'rgba(235,232,222,0.6)'; g.lineWidth = 2;
  const line = (o, dash) => { g.setLineDash(dash ? [26, 22] : []); g.beginPath(); if (v) { g.moveTo(x + o, y); g.lineTo(x + o, y + h); } else { g.moveTo(x, y + o); g.lineTo(x + w, y + o); } g.stroke(); };
  line(16, false); line(W2 - 16, false); line(W2 / 2 - 10, false); line(W2 / 2 + 10, false); line(W2 * 0.27, true); line(W2 * 0.73, true); g.setLineDash([]);
  // expansion joints and the odd patch
  g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1.5; g.beginPath();
  for (let a = 90; a < L; a += 180) { if (v) { g.moveTo(x + 8, y + a); g.lineTo(x + w - 8, y + a); } else { g.moveTo(x + a, y + 8); g.lineTo(x + a, y + h - 8); } }
  g.stroke();
  if (win) { g.fillStyle = 'rgba(232,238,244,0.55)'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(40,48,56,0.35)'; g.lineWidth = 4; for (const o of [W2 * 0.18, W2 * 0.36, W2 * 0.64, W2 * 0.82]) { g.beginPath(); if (v) { g.moveTo(x + o, y); g.lineTo(x + o, y + h); } else { g.moveTo(x, y + o); g.lineTo(x + w, y + o); } g.stroke(); } }
  // skid marks and oil
  for (let i = 0; i < 3; i++) { const a = R2() * L, o = 20 + R2() * (W2 - 40); softBlob(g, v ? x + o : x + a, v ? y + a : y + o, v ? 7 : 22, v ? 22 : 7, 0, '8,8,10', 0.35); }
  // the traffic that was stuck up here (this block's own stretch only, so nothing is drawn twice)
  {
    const n = 2 + Math.floor(R() * 5), bio = distAt(d.ocx, d.ocy).bio;
    for (let i = 0; i < n; i++) {
      const lane = Math.floor(R() * 4), o = [W2 * 0.18, W2 * 0.37, W2 * 0.63, W2 * 0.82][lane], fd = lane < 2 ? -1 : 1, vt = vehPick(R, 'highway', 220), V = VEH[vt];
      const a = (v ? ROAD : ROAD) + R() * (L - ROAD - V.L - 10);
      if (gp && a + V.L > gp.at - 10 && a < gp.at + gp.len + 10) continue;
      const rr = v ? { x: x + o - V.W / 2, y: y + a, w: V.W, h: V.L } : { x: x + a, y: y + o - V.W / 2, w: V.L, h: V.W };
      const dr = vehDress(R, vt); Object.assign(rr, { vt: dr.vt, col: dr.col, cab: dr.cab, s: dr.s, fd: v ? -fd : fd, burnt: R() < (bio === 'burning' || bio === 'ash' ? 0.7 : 0.18), k: 'car' });
      vehDraw(g, rr);
    }
    // a sign gantry now and then: a steel beam across with green signs
    if ((Z.hash32(d.ocx * 31 + d.ocy * 17 + (v ? 7 : 3)) >>> 0) % 4 === 0) {
      const a = ROAD + 140 + R() * (L - ROAD - 280);
      g.fillStyle = 'rgba(0,0,0,0.35)'; if (v) g.fillRect(x - 6, y + a + 4, w + 12, 10); else g.fillRect(x + a + 4, y - 6, 10, h + 12);
      g.fillStyle = '#6a6e74'; if (v) g.fillRect(x - 6, y + a, w + 12, 6); else g.fillRect(x + a, y - 6, 6, h + 12);
      const names = DNAMES.city[0];
      for (const k of [0.22, 0.62]) {
        g.save(); g.translate(v ? x + W2 * k : x + a - 12, v ? y + a - 12 : y + W2 * k); if (!v) g.rotate(-Math.PI / 2);
        g.fillStyle = '#1f6a3a'; g.fillRect(-22, -2, 44, 14); g.strokeStyle = '#e8e6e0'; g.lineWidth = 1; g.strokeRect(-21, -1, 42, 12);
        g.fillStyle = '#e8e6e0'; g.font = 'bold 6px sans-serif'; g.textAlign = 'center'; g.fillText(k < 0.5 ? 'EXIT ' + (1 + ((d.ocx * 7 + d.ocy * 3) & 63)) : names[((d.ocx + d.ocy) % names.length + names.length) % names.length].toUpperCase(), 0, 7); g.restore();
      }
    }
  }
  // light poles on the barriers (the lamps themselves are lights in the lighting engine)
  for (let a = (v ? 260 : 100), k = 0; a < L; a += 320, k++) {
    const o = k % 2 ? W2 - 6 : 6, px = v ? x + o : x + a, py = v ? y + a : y + o, ax = v ? (k % 2 ? -18 : 18) : 0, ay = v ? 0 : (k % 2 ? -18 : 18);
    g.strokeStyle = '#3c3f44'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(px, py); g.lineTo(px + ax, py + ay); g.stroke();
    g.fillStyle = '#26282c'; g.beginPath(); g.arc(px, py, 3, 0, TAU); g.fill(); g.fillStyle = '#e8eef4'; g.fillRect(px + ax - 3, py + ay - 2, 6, 4);
  }
  g.restore();
  // the broken ends of a collapsed span: ragged concrete and rebar
  if (gp) {
    g.strokeStyle = '#8a5a3e'; g.lineWidth = 1.2;
    for (const end of [gp.at, gp.at + gp.len]) for (let i = 0; i < 9; i++) { const o = 8 + R() * (W2 - 16), q = (R() - 0.5) * 14; g.beginPath(); if (v) { g.moveTo(x + o, c.oy + end); g.lineTo(x + o + q, c.oy + end + (end === gp.at ? 1 : -1) * (6 + R() * 10)); } else { g.moveTo(c.ox + end, y + o); g.lineTo(c.ox + end + (end === gp.at ? 1 : -1) * (6 + R() * 10), y + o + q); } g.stroke(); }
    g.fillStyle = '#3b3d40'; for (const end of [gp.at, gp.at + gp.len]) for (let i = 0; i < 6; i++) { const o = R() * W2, s = 4 + R() * 8; if (v) g.fillRect(x + o, c.oy + end - s / 2, s, s * 0.6); else g.fillRect(c.ox + end - s / 2, y + o, s * 0.6, s); }
  }
}
function skyRibbon(g, rp, conc, win, R) {
  const p = rp.pts, path = () => { g.beginPath(); g.moveTo(p[0], p[1]); for (let k = 2; k < p.length; k += 2) g.lineTo(p[k], p[k + 1]); };
  g.lineJoin = 'round'; g.lineCap = 'butt';
  path(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = rp.w + 6; g.stroke();
  path(); g.strokeStyle = '#a9abad'; g.lineWidth = rp.w; g.stroke();
  path(); g.strokeStyle = win ? '#c9d1d8' : conc; g.lineWidth = rp.w - 12; g.stroke();
  path(); g.strokeStyle = 'rgba(235,232,222,0.5)'; g.lineWidth = 1.6; g.setLineDash([20, 18]); g.stroke(); g.setLineDash([]);
  path(); g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = rp.w * 0.3; g.stroke();
  void R;
}
/* ---------- the shadows, and drawing the layer over the street ---------- */
// adds the decks' and ramps' shadows on the ground to the sun's path (simulation units): each is its shape, moved
// along the shadow direction by its height
function skySun(m, ux, uy, x0, y0, x1, y1) {
  const k = SCL, mg = 900 * k;
  const cx0 = Math.floor((x0 - mg) / CHS), cx1 = Math.floor((x1 + mg) / CHS), cy0 = Math.floor((y0 - mg) / CHS), cy1 = Math.floor((y1 + mg) / CHS);
  let n = 0;
  for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
    const c = chunks.get(cx + ',' + cy); if (!c) continue; const S = skyInfo(c); if (!S) continue;
    for (const d of S.decks) {
      if (!d.own) continue;
      const ox = ux * d.h0, oy = uy * d.h0, gx = c.ox, gy = c.oy;
      // this block's own share of the deck, so neighbours never add the same shadow twice
      const ax = d.v ? d.x : gx, ay = d.v ? gy : d.y, aw = d.v ? d.w : CH, ah = d.v ? CH : d.h;
      const sx = ax * k + ox, sy = ay * k + oy; if (sx > x1 || sx + aw * k < x0 || sy > y1 || sy + ah * k < y0) continue;
      m.rect(sx, sy, aw * k, ah * k); n++;
    }
  }
  return n;
}
function skyRampSun(m, ux, uy, x0, y0, x1, y1) {
  const k = SCL; let n = 0;
  const cx0 = Math.floor(x0 / CHS) - 1, cx1 = Math.floor(x1 / CHS) + 1, cy0 = Math.floor(y0 / CHS) - 1, cy1 = Math.floor(y1 / CHS) + 1, seen = new Set();
  for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
    if (!skyRow(cy) || !skyCol(cx)) continue;
    const key = cx + ',' + cy; if (seen.has(key)) continue; seen.add(key);
    for (const rp of skyRamps(cx * CH + ROAD / 2, cy * CH + ROAD / 2)) {
      const ox = ux * rp.h, oy = uy * rp.h, p = rp.pts;
      m.lineWidth = rp.w * k; m.beginPath(); m.moveTo(p[0] * k + ox, p[1] * k + oy); for (let i = 2; i < p.length; i += 2) m.lineTo(p[i] * k + ox, p[i + 1] * k + oy); m.stroke(); n++;
    }
  }
  return n;
}
// the ground under a deck is in shade all day: painted into the block's picture (shows when the deck fades)
function skyUnder(g, c) {
  const S = skyInfo(c); if (!S) return;
  for (const d of S.decks) {
    const gr = d.v ? g.createLinearGradient(d.x, 0, d.x + d.w, 0) : g.createLinearGradient(0, d.y, 0, d.y + d.h);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.12, 'rgba(0,0,0,0.26)'); gr.addColorStop(0.88, 'rgba(0,0,0,0.26)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(d.x, d.y, d.w, d.h);
  }
  g.lineCap = 'butt';
  for (const rp of S.ramps) { const p = rp.pts; g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = rp.w; g.beginPath(); g.moveTo(p[0], p[1]); for (let k = 2; k < p.length; k += 2) g.lineTo(p[k], p[k + 1]); g.stroke(); }
}
// how far you are from a block's elevated parts (simulation units), for fading them
function skyNear(c, x, y) {
  const S = c.sky; if (!S) return 1e9; const k = SCL; let best = 1e9;
  for (const d of S.decks) { const dx = Math.max(d.x * k - x, 0, x - (d.x + d.w) * k), dy = Math.max(d.y * k - y, 0, y - (d.y + d.h) * k); best = Math.min(best, Math.hypot(dx, dy)); }
  for (const rp of S.ramps) { const p = rp.pts; for (let i = 0; i < p.length; i += 4) best = Math.min(best, Math.max(0, Math.hypot(p[i] * k - x, p[i + 1] * k - y) - rp.w * k / 2)); }
  return best;
}
// render() calls this after the lighting: the decks over the street, faded near you, darkened and lamp-lit at night
function skyDraw(x0, y0, x1, y1, dt) {
  const t0 = performance.now(); SKY.drawn = 0;
  const pad = 400 * SCL, list = [];
  for (let cx = Math.floor((x0 - pad) / CHS); cx <= Math.floor((x1 + pad) / CHS); cx++) for (let cy = Math.floor((y0 - pad) / CHS); cy <= Math.floor((y1 + pad) / CHS); cy++) {
    const c = chunks.get(cx + ',' + cy); if (!c || !c.can || !skyInfo(c)) continue;
    if (c.sx > x1 || c.sx + CHS < x0 || c.sy > y1 || c.sy + CHS < y0) continue;
    list.push(c);
  }
  if (!list.length) return;
  const p = G.p && G.mode !== 'title' ? G.p : null, fx = p ? p.x : cam.x, fy = p ? p.y : cam.y;
  const amb = LUX.live ? LUX.amb : null, dark = amb ? 1 - (amb[0] + amb[1] + amb[2]) / 3 : 0;
  let g = ctx;
  if (dark > 0.04) {
    // at night the decks go through a screen-sized scratch canvas, so the darkness and the lamp light touch only them
    if (!SKY.S2 || SKY.S2.width !== cv.width || SKY.S2.height !== cv.height) { SKY.S2 = document.createElement('canvas'); SKY.S2.width = cv.width; SKY.S2.height = cv.height; SKY.s2 = SKY.S2.getContext('2d'); }
    g = SKY.s2; g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(ctx.getTransform());
  }
  let near = 1e9; for (const c of list) near = Math.min(near, skyNear(c, fx, fy));
  const want = p ? 0.2 + 0.72 * clamp((near - 30 * SCL) / (240 * SCL), 0, 1) : 0.9;
  SKY.a = SKY.a == null ? want : SKY.a + (want - SKY.a) * Math.min(1, dt * 7);
  for (const c of list) {
    const can = skyCanvas(c); if (!can) continue;
    g.globalAlpha = SKY.a; g.drawImage(can, c.sx, c.sy, CHS + 0.6, CHS + 0.6); SKY.drawn++;
  }
  g.globalAlpha = 1;
  if (g !== ctx) {
    // darkness first (only where a deck is), then the pools of the highway lamps on top
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(' + Math.round(6 + 20 * amb[0]) + ',' + Math.round(8 + 22 * amb[1]) + ',' + Math.round(16 + 30 * amb[2]) + ',' + clamp(dark * 1.05, 0, 0.9) + ')'; g.fillRect(0, 0, cv.width, cv.height);
    g.setTransform(ctx.getTransform()); g.globalCompositeOperation = 'source-atop';
    const on = clamp((dark - 0.1) / 0.25, 0, 1);
    if (on > 0) for (const c of list) { if (!c.lights) c.lights = lightsOf(c.cx, c.cy); for (const L of c.lights) { if (!L.hw) continue; const r = 200 * SCL, gr = g.createRadialGradient(L.x, L.y, 0, L.x, L.y, r); gr.addColorStop(0, 'rgba(225,235,255,' + 0.5 * on + ')'); gr.addColorStop(0.4, 'rgba(225,235,255,' + 0.16 * on + ')'); gr.addColorStop(1, 'rgba(225,235,255,0)'); g.fillStyle = gr; g.fillRect(L.x - r, L.y - r, r * 2, r * 2); } }
    g.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(SKY.S2, 0, 0); ctx.restore();
  }
  const ms = performance.now() - t0; SKY.ms = ms; coreCost('SKYWAY', ms);
}
coreAdd({
  name: 'SKYWAY', kind: 'render', does: 'Highway engine: elevated highways on concrete piers through every district, spaghetti interchanges of loops and flyovers, abandoned traffic and collapsed spans, deck shadows, fading when you walk underneath.',
  state: () => SKY.drawn ? 'on' : 'idle', level: () => SKY.drawn + ' decks in view'
});
