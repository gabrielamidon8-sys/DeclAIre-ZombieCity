/* ================= TEXEL: the texture and resolution engine =================
   Every zombie, the player and the city's ground get their surface detail here.
   - A library of procedural textures, each made once as a small tiling picture from seeded noise: asphalt grain, skin
     mottling, cloth weave, grime and concrete. Anything can paint with them at any scale.
   - Zombie sprites: each mutation is drawn by the mutation engine as before, then TEXEL works on it at a higher
     resolution than the screen needs: skin texture and blotches of grime and blood inside the body only (it asks the
     mutation engine for the body's silhouette to know where the body is), shading from above so it has volume
     whatever the sun is doing, and a thin dark rim so it reads on any ground. Then it is scaled down to the screen's
     exact sharpness, which smooths every edge.
   - The player: no longer rebuilt shape by shape every frame. Four walking poses per weapon are drawn once, textured
     the same way, and the game just turns the right one to face your aim.
   - It looks after itself: it measures how long making sprites takes each second and steps down (less supersampling,
     then no texture passes) when that eats into the frame, and back up when there is room. A texture pass that throws
     falls back to the plain sprite for that one picture; a run of errors pauses the passes for a minute. When the
     device refuses a new canvas (out of memory), it clears the caches and tries once more, then draws without them. */
// levels: 0 plain · 1 textures · 2 textures, rim, 1.5x supersampling · 3 everything, 2x supersampling and fine detail
const TEXQ = [
  { ss: 1, tex: 0, rim: 0, detail: 0 },
  { ss: 1, tex: 1, rim: 0, detail: 0 },
  { ss: 1.5, tex: 1, rim: 1, detail: 1 },
  { ss: 2, tex: 1, rim: 1, detail: 2 }
];
const TEXEL = { adapt: 0, lib: new Map(), scratch: [], ms: 0, made: 0, errT: [], offUntil: 0, msAvg: 0, bad: 0, good: 0, players: new Map(), lvl: 2 };
function texelLevel() {
  if (TEXEL.offUntil && performance.now() < TEXEL.offUntil) return 0;
  const want = SET.texel || 'auto', base = want === 'auto' ? [1, 2, 2, 3][clamp(PERF.tier | 0, 0, 3)] : want === 'low' ? 1 : want === 'high' ? 2 : want === 'ultra' ? 3 : want === 'off' ? 0 : 2;
  return TEXEL.lvl = base ? clamp(base + TEXEL.adapt + (TUNE.TEXEL || 0), 0, 3) : 0;
}
function texelMk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
// a scratch canvas big enough for one sprite (reused, so making sprites does not churn memory)
function texelScratch(i, S) {
  let c = TEXEL.scratch[i];
  if (!c || c.width < S || c.height < S || c.width > S * 2.5) { c = texelMk(S, S); TEXEL.scratch[i] = c; c.g = c.getContext('2d'); }
  c.g.setTransform(1, 0, 0, 1, 0, 0); c.g.globalCompositeOperation = 'source-over'; c.g.globalAlpha = 1; c.g.clearRect(0, 0, c.width, c.height);
  return c;
}

/* ---------- the texture library ---------- */
// value noise, smoothed, tiling over n pixels
function texelNoise(n, cell, seed) {
  const R = Z.mulberry32(seed), gw = Math.max(2, Math.round(n / cell)), grid = new Float32Array(gw * gw), out = new Float32Array(n * n);
  for (let i = 0; i < grid.length; i++) grid[i] = R();
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const fx = x / n * gw, fy = y / n * gw, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), x1 = (ix + 1) % gw, y1 = (iy + 1) % gw;
    const a = grid[iy * gw + ix], b = grid[iy * gw + x1], c = grid[y1 * gw + ix], d = grid[y1 * gw + x1];
    out[y * n + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  return out;
}
function texelCanvas(kind) {
  let c = TEXEL.lib.get(kind); if (c) return c;
  const n = 128; c = texelMk(n, n); const g = c.getContext('2d'), im = g.createImageData(n, n), d = im.data, R = Z.mulberry32(0x9e3779b9 ^ kind.length * 7919);
  if (kind === 'grain') {
    // asphalt: light stones and dark pits, pixel sized
    for (let i = 0; i < n * n; i++) { const v = R(), k = i * 4; if (v < 0.12) { d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = 5 + R() * 12; } else if (v < 0.42) { d[k + 3] = 10 + R() * 26; } }
  } else if (kind === 'skin') {
    // mottled skin: two scales of soft noise around mid grey, with pores
    const a = texelNoise(n, 16, 11), b = texelNoise(n, 5, 23);
    for (let i = 0; i < n * n; i++) { const v = 128 + (a[i] - 0.5) * 120 + (b[i] - 0.5) * 70 + (R() < 0.04 ? -50 : 0), k = i * 4; d[k] = d[k + 1] = d[k + 2] = clamp(v, 0, 255); d[k + 3] = 255; }
  } else if (kind === 'cloth') {
    // a woven fabric: crossing threads with slub
    const a = texelNoise(n, 24, 37);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const k = (y * n + x) * 4, w = ((x >> 1) + (y >> 1)) & 1 ? 18 : -18, v = 128 + w * (0.6 + 0.4 * Math.sin(x * 1.7) * Math.sin(y * 1.3)) + (a[y * n + x] - 0.5) * 60; d[k] = d[k + 1] = d[k + 2] = clamp(v, 0, 255); d[k + 3] = 255; }
  } else if (kind === 'grime') {
    // patchy dirt: dark blotches with soft edges, mostly transparent
    const a = texelNoise(n, 22, 51), b = texelNoise(n, 7, 67);
    for (let i = 0; i < n * n; i++) { const v = a[i] * 0.7 + b[i] * 0.3, k = i * 4; d[k] = 40; d[k + 1] = 30; d[k + 2] = 22; d[k + 3] = v > 0.55 ? Math.min(200, (v - 0.55) * 900) : 0; }
  } else if (kind === 'glitter') {
    // sun glitter: sparse bright specks, a few with a cross of light, on nothing
    for (let i = 0; i < 70; i++) { const x = Math.floor(R() * n), y = Math.floor(R() * n), v = 150 + R() * 105, k = (y * n + x) * 4; d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = v; if (R() < 0.3) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = (((y + dy + n) % n) * n + ((x + dx + n) % n)) * 4; d[q] = d[q + 1] = d[q + 2] = 255; d[q + 3] = v * 0.4; } }
  } else if (kind === 'concrete') {
    const a = texelNoise(n, 32, 79), b = texelNoise(n, 4, 83);
    for (let i = 0; i < n * n; i++) { const v = 128 + (a[i] - 0.5) * 50 + (b[i] - 0.5) * 40, k = i * 4; d[k] = d[k + 1] = d[k + 2] = clamp(v, 0, 255); d[k + 3] = 255; }
  } else {
    for (let i = 0; i < n * n; i++) { const v = R() * 255, k = i * 4; d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255; }
  }
  g.putImageData(im, 0, 0); TEXEL.lib.set(kind, c); return c;
}
// 1.9.997: the detail map the shader engine lights every surface with (a normal map, as AAA games lay a tiling detail
// normal over every ground material): R is height from three octaves of noise with pebbles and hairline cracks, G is
// pixel grain, sampled by PRISM in world space so it stays put under the camera and reads under lamps and the flashlight
function texelDetail() {
  let c = TEXEL.lib.get('detail'); if (c) return c;
  const n = 256; c = texelMk(n, n); const g = c.getContext('2d'), im = g.createImageData(n, n), d = im.data, R = Z.mulberry32(0x5bd1e995);
  const a = texelNoise(n, 40, 101), b = texelNoise(n, 11, 103), e = texelNoise(n, 4, 107);
  for (let i = 0; i < n * n; i++) {
    const k = i * 4, h = 0.5 + (a[i] - 0.5) * 0.22 + (b[i] - 0.5) * 0.36 + (e[i] - 0.5) * 0.34 + (R() - 0.5) * 0.14 + (R() < 0.015 ? 0.22 : 0);   // (pebbles stand proud)
    d[k] = clamp(h * 255, 0, 255); d[k + 1] = clamp(128 + (R() - 0.5) * 150, 0, 255); d[k + 2] = 255; d[k + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  // hairline cracks in the blue channel (the shader weighs them by district: asphalt and concrete crack, snow and sand do
  // not): a few wandering lines, drawn across the tile's edges so they still tile
  const cm = texelMk(n, n), cg = cm.getContext('2d'); cg.fillStyle = '#fff'; cg.fillRect(0, 0, n, n); cg.strokeStyle = 'rgba(0,0,0,0.75)'; cg.lineWidth = 1.2; cg.lineCap = 'round';
  for (let i = 0; i < 7; i++) { let x = R() * n, y = R() * n, an = R() * Math.PI * 2; cg.beginPath(); cg.moveTo(x, y); for (let s = 0; s < 18; s++) { an += (R() - 0.5) * 1.1; x += Math.cos(an) * 7; y += Math.sin(an) * 7; cg.lineTo(x, y); } cg.stroke(); cg.save(); cg.translate(-n, 0); cg.stroke(); cg.translate(2 * n, 0); cg.stroke(); cg.translate(-n, -n); cg.stroke(); cg.translate(0, 2 * n); cg.stroke(); cg.restore(); }
  const cd = cg.getImageData(0, 0, n, n).data; for (let i = 0; i < n * n; i++) d[i * 4 + 2] = cd[i * 4];
  g.putImageData(im, 0, 0);
  TEXEL.lib.set('detail', c); return c;
}
/* ---------- the city's ground ----------
   Bigger tiles (256 pixels) for the street: grey maps around middle grey, laid over the painted blocks with an 'overlay'
   blend, so they add surface without changing the colours the city generator chose (lighter than grey lightens, darker
   darkens). Anchored to the world, so they run on across block edges without a seam. */
function texelGroundTex(kind) {
  const key = 'g:' + kind; let c = TEXEL.lib.get(key); if (c) return c;
  const n = kind === 'caustic' ? 128 : 256; c = texelMk(n, n); const g = c.getContext('2d'); if (!g) return null;
  const im = g.createImageData(n, n), d = im.data, R = Z.mulberry32(0x51ed27 ^ (kind.charCodeAt(0) * 131 + kind.length * 7));
  const put = (i, v, a) => { const k = i * 4; d[k] = d[k + 1] = d[k + 2] = clamp(v, 0, 255); d[k + 3] = a == null ? 255 : a; };
  if (kind === 'asphalt') {
    // aggregate in tar: light and dark stones of a few sizes over a softly mottled binder
    const a = texelNoise(n, 32, 101), b = texelNoise(n, 8, 103);
    for (let i = 0; i < n * n; i++) put(i, 128 + (a[i] - 0.5) * 26 + (b[i] - 0.5) * 22);
    for (let s = 0; s < 2600; s++) {
      const x = (R() * n) | 0, y = (R() * n) | 0, r = R() < 0.85 ? 1 : 2, v = R() < 0.55 ? 128 + 40 + R() * 50 : 128 - 30 - R() * 40;
      for (let dy = -r + 1; dy < r; dy++) for (let dx = -r + 1; dx < r; dx++) put((((y + dy + n) % n) * n + ((x + dx + n) % n)), v);
    }
  } else if (kind === 'concrete') {
    // poured concrete: fine pitting, trowel swirls, water stains
    const a = texelNoise(n, 64, 107), b = texelNoise(n, 16, 109), e = texelNoise(n, 4, 113);
    for (let i = 0; i < n * n; i++) { const st = a[i] > 0.62 ? -(a[i] - 0.62) * 70 : 0; put(i, 128 + (b[i] - 0.5) * 22 + (e[i] - 0.5) * 18 + st + (R() < 0.03 ? -34 : 0)); }
  } else if (kind === 'turf') {
    // grass: short blades every way, light tips and dark roots
    const a = texelNoise(n, 40, 127);
    for (let i = 0; i < n * n; i++) put(i, 128 + (a[i] - 0.5) * 34);
    g.putImageData(im, 0, 0); g.lineCap = 'round';
    for (let s = 0; s < 2200; s++) {
      const x = R() * n, y = R() * n, an = -Math.PI / 2 + (R() - 0.5) * 1.6, l = 2 + R() * 4, v = R() < 0.5 ? 170 + R() * 60 : 60 + R() * 40;
      g.strokeStyle = 'rgba(' + (v | 0) + ',' + (v | 0) + ',' + (v | 0) + ',0.55)'; g.lineWidth = 0.8;
      for (const ox of [0, -n, n]) for (const oy of [0, -n, n]) { const X = x + ox, Y = y + oy; if (X < -8 || X > n + 8 || Y < -8 || Y > n + 8) continue; g.beginPath(); g.moveTo(X, Y); g.lineTo(X + Math.cos(an) * l, Y + Math.sin(an) * l); g.stroke(); }
    }
    TEXEL.lib.set(key, c); return c;
  } else if (kind === 'sand') {
    // wind ripples (wavy bands) and grains
    const a = texelNoise(n, 32, 131);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = y * n + x, w = Math.sin((y + a[i] * 18) / n * TAU * 9); put(i, 128 + w * 14 + (a[i] - 0.5) * 20 + (R() - 0.5) * 26); }
  } else if (kind === 'snow') {
    // soft drifted snow with sparkle
    const a = texelNoise(n, 48, 137), b = texelNoise(n, 12, 139);
    for (let i = 0; i < n * n; i++) put(i, 128 + (a[i] - 0.5) * 24 + (b[i] - 0.5) * 14 + (R() < 0.012 ? 70 : 0));
  } else if (kind === 'gravel') {
    // rubble and gravel: chunky stones with shading
    const a = texelNoise(n, 24, 149);
    for (let i = 0; i < n * n; i++) put(i, 128 + (a[i] - 0.5) * 30);
    for (let s = 0; s < 700; s++) {
      const x = (R() * n) | 0, y = (R() * n) | 0, r = 1 + R() * 2.6, v = 128 + (R() - 0.5) * 90;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const q = dx * dx + dy * dy; if (q > r * r) continue; put((((y + dy + n) % n) * n + ((x + dx + n) % n)), v + (dy < 0 ? 18 : -14)); }
    }
  } else if (kind === 'snowcover') {
    // 1.9.998: snow lying on a road, in drifts and thin patches with bare asphalt between (white, its own alpha; laid on
    // in world space so it runs on across blocks and over a district border unbroken)
    const a = texelNoise(n, 64, 163), b = texelNoise(n, 20, 167), e = texelNoise(n, 6, 173);
    for (let i = 0; i < n * n; i++) {
      const v = a[i] * 0.6 + b[i] * 0.3 + e[i] * 0.1, t = clamp((v - 0.42) / 0.16, 0, 1), k = i * 4, sh = 236 + (b[i] - 0.5) * 30;
      d[k] = clamp(sh - 8, 0, 255); d[k + 1] = clamp(sh - 3, 0, 255); d[k + 2] = clamp(sh + 4, 0, 255); d[k + 3] = t * t * (3 - 2 * t) * 235;
    }
  } else if (kind === 'macro') {
    // big soft patches of dirt and wear (a multiply map: white leaves the picture alone)
    const a = texelNoise(n, 64, 151), b = texelNoise(n, 22, 157);
    for (let i = 0; i < n * n; i++) { const v = a[i] * 0.7 + b[i] * 0.3; put(i, 255 - Math.max(0, v - 0.45) * 150); }
  } else if (kind === 'caustic') {
    // light through moving water: a bright web of cells, on nothing (added with 'lighter')
    const P = []; for (let i = 0; i < 26; i++) P.push([R() * n, R() * n]);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let d1 = 1e9, d2 = 1e9;
      for (const p of P) for (const ox of [0, -n, n]) for (const oy of [0, -n, n]) { const dx = x - p[0] - ox, dy = y - p[1] - oy, q = dx * dx + dy * dy; if (q < d1) { d2 = d1; d1 = q; } else if (q < d2) d2 = q; }
      const e = Math.sqrt(d2) - Math.sqrt(d1), v = Math.max(0, 1 - e / 3.2), k = (y * n + x) * 4;
      d[k] = 200; d[k + 1] = 236; d[k + 2] = 255; d[k + 3] = v * v * 200;
    }
  }
  g.putImageData(im, 0, 0); TEXEL.lib.set(key, c); return c;
}
function texelGroundPat(g, kind, scale) {
  const t = texelGroundTex(kind); if (!t) return null;
  const pat = g.createPattern(t, 'repeat'); if (!pat) return null;
  if (pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix([scale, 0, 0, scale, 0, 0]));
  return pat;
}
// renderChunk calls this after the road and the block are painted (before the marks and the buildings go on): the
// street's surface, by district. g draws in the block's art units.
function texelGround(g, c, win) {
  if (texelLevel() < 1 || (Q.deco || 1) < 0.6) return;
  const t0 = performance.now(), ox = c.ox, oy = c.oy, by = oy + ROAD;
  try {
    g.save();
    texelGroundFor(g, c.bio, win, [[ox, oy, CH, ROAD], [ox, by, ROAD, BS]], [[ox + ROAD, by, BS, BS]]);
    g.restore();
  } catch (e) { g.restore(); texelHurt(e); }
  TEXEL.groundMs = (TEXEL.groundMs || 0) * 0.8 + (performance.now() - t0) * 0.2;
}
// one district's surfaces over the given road and block rectangles (the district blend paints a neighbour's ground with it)
function texelGroundFor(g, bio, win, road, block) {
  const snow = bio === 'snow' || win, all = road.concat(block);
  const fill = (kind, scale, op, a, rects) => {
    if (!rects.length) return; const pat = texelGroundPat(g, kind, scale); if (!pat) return;
    g.globalCompositeOperation = op; g.globalAlpha = a; g.fillStyle = pat;
    for (const r of rects) g.fillRect(r[0], r[1], r[2], r[3]);
  };
  // the road: aggregate in the asphalt (sand and snow lie on it in those districts)
  if (bio === 'desert') fill('sand', 0.5, 'overlay', 0.5, all);
  else if (snow) { fill('asphalt', 0.25, 'overlay', 0.35, road); fill('snow', 0.5, 'overlay', 0.45, all); }
  else fill('asphalt', 0.25, 'overlay', 0.6, road);
  // the block: concrete, grass, rubble
  if (!snow && bio !== 'desert') {
    if (bio === 'suburb') fill('turf', 0.3, 'overlay', 0.55, block);
    else if (bio === 'ruins' || bio === 'ash' || bio === 'burning') { fill('concrete', 0.35, 'overlay', 0.4, block); fill('gravel', 0.3, 'overlay', bio === 'ruins' ? 0.4 : 0.25, block); }
    else fill('concrete', 0.35, 'overlay', 0.45, block);
  }
  // wear and dirt over everything, big and soft
  fill('macro', 1.6, 'multiply', bio === 'snow' ? 0.18 : 0.32, all);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
}
/* ---------- material blending: one surface growing into another ----------
   Hard edges between materials are what make a procedural city look procedural. On top of the base surfaces, each block
   gets patches where one material creeps into another: dirt worn into a lawn, weeds pushing up through cracked
   concrete, oil soaked into the asphalt, sand and snow drifting over the road, ash and rubble spilling off a ruin, moss at
   the foot of the walls, and where two districts meet, each one's ground bleeding into the other's in ragged tongues
   instead of a straight line. Every patch is a texture (from the library) seen through a soft, irregular mask made of
   overlapping falloffs, tinted to its material, so its edge fades and wanders like the real thing. */
const TX_MAT = {
  dirt: ['gravel', '#5c4a36', 0.62, 0.5], mud: ['sand', '#3e3226', 0.6, 0.55], weeds: ['turf', '#41592c', 0.7, 0.55], moss: ['turf', '#3c4a2a', 0.55, 0.5],
  oil: ['macro', '#101012', 0.45, 0.3], tar: ['asphalt', '#1c1d20', 0.55, 0.4], sand: ['sand', '#b09366', 0.7, 0.5], snow: ['snow', '#e6ecf2', 0.8, 0.5],
  slush: ['snow', '#9aa4ac', 0.6, 0.5], ash: ['gravel', '#3a3836', 0.65, 0.45], rubble: ['gravel', '#6a645a', 0.7, 0.4], soot: ['macro', '#1a1614', 0.5, 0.35],
  leaves: ['turf', '#6a4a24', 0.55, 0.45], cracked: ['concrete', '#7a7670', 0.5, 0.4]
};
// one patch: material k over (x, y), about rx by ry art units, its mask made of n soft blobs
function texelSplat(g, c, k, x, y, rx, ry, n, R, alpha) {
  const M = TX_MAT[k]; if (!M) return;
  const px = c.px || 1, w = rx * 2.6, h = ry * 2.6, Sw = Math.ceil(w * px), Sh = Math.ceil(h * px), S = Math.max(Sw, Sh);
  if (S < 4 || S > 1400) return;
  const T = texelScratch(4, S), t = T.g;
  // the mask: overlapping soft blobs, a ragged soft-edged shape
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, d = Math.sqrt(R()) * 0.55, bx = (0.5 + Math.cos(a) * d * rx / w * 2) * Sw, by = (0.5 + Math.sin(a) * d * ry / h * 2) * Sh, br = (0.28 + R() * 0.32) * Math.min(Sw, Sh);
    const gr = t.createRadialGradient(bx, by, br * 0.15, bx, by, br); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    t.fillStyle = gr; t.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  // grain in the mask so the edge breaks up into specks instead of a smooth fade
  t.globalCompositeOperation = 'destination-out'; const np = texelPattern(t, 'grain', 2); if (np) { t.globalAlpha = 0.9; t.fillStyle = np; t.fillRect(0, 0, Sw, Sh); t.globalAlpha = 1; }
  // the material: its texture, then its colour on top
  t.globalCompositeOperation = 'source-in'; const pat = texelGroundPat(t, M[0], M[3] * px * 0.5); t.fillStyle = pat || '#808080'; t.fillRect(0, 0, Sw, Sh);
  t.globalCompositeOperation = 'source-atop'; t.globalAlpha = M[2]; t.fillStyle = M[1]; t.fillRect(0, 0, Sw, Sh); t.globalAlpha = 1; t.globalCompositeOperation = 'source-over';
  g.globalAlpha = alpha == null ? 0.85 : alpha; g.drawImage(T, 0, 0, Sw, Sh, x - w / 2, y - h / 2, w, h); g.globalAlpha = 1;
}
// renderChunk calls this right after texelGround: the blends for this block, by district
function texelSplats(g, c, win) {
  const lvl = texelLevel(); if (lvl < 1 || (Q.deco || 1) < 0.6) return;
  const t0 = performance.now(), ox = c.ox, oy = c.oy, bio = c.bio, bx = ox + ROAD, by = oy + ROAD, snow = bio === 'snow' || win;
  const R = Z.mulberry32(Z.hash32(c.cx * 92821 + c.cy * 68917 + 0x7e11)), N = lvl >= 3 ? 14 : lvl >= 2 ? 10 : 5;
  try {
    g.save();
    const onRoad = () => R() < 0.5 ? [ox + R() * CH, oy + 8 + R() * (ROAD - 16)] : [ox + 8 + R() * (ROAD - 16), by + R() * BS];
    const onBlock = () => [bx + 10 + R() * (BS - 20), by + 10 + R() * (BS - 20)];
    const atCurb = () => { const e = (R() * 4) | 0, t = R(); return e === 0 ? [bx + t * BS, by + 4] : e === 1 ? [bx + 4, by + t * BS] : e === 2 ? [bx + t * BS, oy + ROAD - 3] : [ox + ROAD - 3, by + t * BS]; };
    const at = { road: onRoad, block: onBlock, curb: atCurb };
    for (let i = 0; i < N; i++) {
      const p = texelSplatPick(bio, snow, R()), q = at[p[1]]();
      texelSplat(g, c, p[0], q[0], q[1], p[2] * (0.7 + R() * 0.6), p[2] * (0.7 + R() * 0.6), p[3], R, p[4]);
    }
    // (1.9.998: where two districts meet is the district blend's job now, texelBlend)
    g.restore();
  } catch (e) { g.restore(); texelHurt(e); }
  TEXEL.splatMs = (TEXEL.splatMs || 0) * 0.8 + (performance.now() - t0) * 0.2;
}
// which blend a district grows, for a roll u in 0..1: [material, where (road, block or curb), size, blobs, opacity]
function texelSplatPick(bio, snow, u) {
  if (snow) return u < 0.45 ? ['snow', 'road', 34, 6, 0.8] : u < 0.7 ? ['slush', 'road', 26, 5, 0.6] : ['snow', 'curb', 22, 5, 0.85];
  if (bio === 'desert') return u < 0.55 ? ['sand', 'road', 40, 6, 0.75] : u < 0.8 ? ['sand', 'curb', 26, 5, 0.85] : ['dirt', 'block', 30, 5, 0.6];
  if (bio === 'suburb') return u < 0.3 ? ['dirt', 'block', 30, 6, 0.7] : u < 0.5 ? ['leaves', 'curb', 20, 5, 0.7] : u < 0.65 ? ['mud', 'block', 22, 5, 0.6] : u < 0.8 ? ['weeds', 'curb', 16, 4, 0.75] : ['oil', 'road', 16, 4, 0.5];
  if (bio === 'ruins' || bio === 'ash' || bio === 'burning') return u < 0.3 ? ['rubble', 'curb', 28, 6, 0.75] : u < 0.5 ? ['ash', 'road', 34, 6, 0.6] : u < 0.65 ? ['soot', 'block', 36, 5, 0.6] : u < 0.8 ? ['weeds', 'block', 18, 4, 0.6] : ['cracked', 'block', 30, 5, 0.6];
  return u < 0.25 ? ['oil', 'road', 18, 4, 0.55] : u < 0.4 ? ['tar', 'road', 26, 5, 0.5] : u < 0.55 ? ['weeds', 'curb', 12, 4, 0.7] : u < 0.7 ? ['dirt', 'curb', 16, 4, 0.55] : u < 0.85 ? ['cracked', 'block', 26, 5, 0.55] : ['moss', 'block', 18, 4, 0.5];
}

/* ---------- 1.9.998: district blending ----------
   Districts used to change at a block's edge: a straight line of snow, a road that turned from sand to asphalt at a seam.
   Now every point of the city has a weight for each district near it, falling off over almost a whole block (about
   19 m) from that district's blocks, plus a district's own noise in four octaves (big tongues down to a ragged fine
   edge). Whichever district scores highest owns the ground there. The field is a function of world position alone, so
   the two blocks either side of a border paint exactly complementary halves of one wandering contour, with islands of
   one ground left inside the other, and corners and diagonals come out right because the weights come from distances to
   whole blocks. A block paints a neighbour's ground where the neighbour owns it: that district's road, sidewalk and lot
   colours over this block's layout, its surface textures and its own patches of snow, sand, weeds or rubble, seen
   through a soft mask made from the field. Snow and sand cover everything (roads, sidewalks, lines); between two paved
   districts the asphalt shades across before the road markings are painted, and the lots change while the sidewalks stay
   sidewalks. */
const TXB = { res: 0.55, L: 0.95, amp: 2.4, oct: [[260, 0.3], [96, 0.16], [34, 0.08], [12, 0.045]], off: { city: 11.3, burning: 23.9, chaos: 37.1, ruins: 51.7, ash: 67.3, suburb: 83.9, desert: 97.1, snow: 113.3 } };
function txbCover(bio, win) { return bio === 'snow' || bio === 'desert' || !!win; }
function txbWin(bio) { return WORLD.season === 3 && !!TEMPERATE[bio]; }
function txbNoise(b, x, y) { const o = TXB.off[b] || 0; let n = 0; for (const q of TXB.oct) n += perlin(x / q[0] + o, y / q[0] - o * 0.61) * q[1]; return n * TXB.amp; }
// each district's weight at (x, y) in art units: 1 inside its blocks, falling to 0 at TXB.L blocks away. nb is the 3x3 of
// district names round the block; the result goes in W by district (only districts in nb)
function txbWeights(nb, cx, cy, x, y, W) {
  const L = TXB.L * CH;
  for (const k in W) W[k] = 0;
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    const b = nb[j * 3 + i], x0 = (cx + i - 1) * CH, y0 = (cy + j - 1) * CH;
    const dx = x < x0 ? x0 - x : x > x0 + CH ? x - x0 - CH : 0, dy = y < y0 ? y0 - y : y > y0 + CH ? y - y0 - CH : 0, d = Math.sqrt(dx * dx + dy * dy);
    const w = d >= L ? 0 : 1 - d / L; if (w > W[b]) W[b] = w;
  }
  return W;
}
// the block's field: for each other district that owns some of this block's ground, a mask (alpha per grid node,
// (CH / cell + 1) square) and its box. Cached on the block; null when the whole neighbourhood is one district.
function txbField(c) {
  if (c.bf !== undefined) return c.bf;
  const me = c.bio, nb = []; let any = false;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const b = distAt(c.cx + i, c.cy + j).bio; nb.push(b); if (b !== me && txbDiffers(me, b)) any = true; }
  if (!any) return c.bf = null;   // (one district all round, or neighbours whose ground looks the same as this one's)
  // two grids: the weights and the two big octaves on a coarse one (32 units), interpolated onto a fine one (4 units)
  // where the two finest octaves are added and the edge is decided, so the border is crisp and ragged without
  // computing everything at the fine spacing
  const t0 = performance.now(), low = (Q.deco || 1) < 0.6, CC = 32, cell = low ? 8 : 4, GC = CH / CC + 1, G = Math.round(CH / cell) + 1, ox = c.cx * CH, oy = c.cy * CH;
  const bios = [...new Set(nb)], nB = bios.length, W = {}; for (const b of bios) W[b] = 0;
  const others = bios.filter(b => b !== me && txbDiffers(me, b)), masks = {};
  for (const b of others) masks[b] = { a: new Uint8ClampedArray(G * G), x0: G, y0: G, x1: -1, y1: -1, n: 0 };
  const SC = bios.map(() => new Float32Array(GC * GC)), oct = TXB.oct;
  for (let gy = 0; gy < GC; gy++) for (let gx = 0; gx < GC; gx++) {
    const x = ox + gx * CC, y = oy + gy * CC; txbWeights(nb, c.cx, c.cy, x, y, W);
    for (let k = 0; k < nB; k++) {
      const b = bios[k], w = W[b]; if (w <= 0) { SC[k][gy * GC + gx] = -3; continue; }
      const o = TXB.off[b] || 0; let n = 0; for (let q = 0; q < 2; q++) n += perlin(x / oct[q][0] + o, y / oct[q][0] - o * 0.61) * oct[q][1];
      SC[k][gy * GC + gx] = w + n * TXB.amp;
    }
  }
  const S = new Float32Array(nB), e = 0.1, FA2 = oct[2][1] * TXB.amp, FA = oct[3][1] * TXB.amp, near = (FA + FA2) * 1.25 + e;
  // each coarse cell, for each other district: none of it (well below the best at all four corners), all of it (well
  // above every other at all four corners) or an edge runs through it; only edge cells are worked out node by node
  const oK = others.map(b => bios.indexOf(b)), nO = oK.length, m = Math.round(CC / cell), lim = near + 0.02, st = new Uint8Array(nO);
  const mark = (M, gx, gy, a) => { M.a[gy * G + gx] = a; M.n++; if (gx < M.x0) M.x0 = gx; if (gx > M.x1) M.x1 = gx; if (gy < M.y0) M.y0 = gy; if (gy > M.y1) M.y1 = gy; };
  for (let j0 = 0; j0 < GC - 1; j0++) for (let i0 = 0; i0 < GC - 1; i0++) {
    const q = j0 * GC + i0, Q4 = [q, q + 1, q + GC, q + GC + 1]; let any = false, mixed = false;
    for (let t = 0; t < nO; t++) {
      const k = oK[t], A = SC[k]; let lo = 9, hi = -9;
      for (const qq of Q4) { let best = -9; for (let o = 0; o < nB; o++) if (o !== k && SC[o][qq] > best) best = SC[o][qq]; const d = A[qq] < -1 ? -9 : A[qq] - best; if (d < lo) lo = d; if (d > hi) hi = d; }
      st[t] = hi < -lim ? 0 : lo > lim ? 1 : 2; if (st[t]) any = true; if (st[t] === 2) mixed = true;
    }
    if (!any) continue;
    const gy1 = j0 === GC - 2 ? G - 1 : (j0 + 1) * m - 1, gx1 = i0 === GC - 2 ? G - 1 : (i0 + 1) * m - 1;
    for (let gy = j0 * m; gy <= gy1; gy++) {
      const fy = (gy - j0 * m) / m;
      for (let gx = i0 * m; gx <= gx1; gx++) {
        for (let t = 0; t < nO; t++) if (st[t] === 1) mark(masks[bios[oK[t]]], gx, gy, 255);
        if (!mixed) continue;
        const fx = (gx - i0 * m) / m, x = ox + gx * cell, y = oy + gy * cell;
        for (let k = 0; k < nB; k++) {
          const A = SC[k]; let v = (A[q] * (1 - fx) + A[q + 1] * fx) * (1 - fy) + (A[q + GC] * (1 - fx) + A[q + GC + 1] * fx) * fy;
          // the fine edge: the two smallest octaves for each district in play here
          if (v > -1) { const o = TXB.off[bios[k]] || 0; v += perlin(x / oct[2][0] + o, y / oct[2][0] - o * 0.61) * FA2 + perlin(x / oct[3][0] + o, y / oct[3][0] - o * 0.61) * FA; }
          S[k] = v;
        }
        for (let t = 0; t < nO; t++) {
          if (st[t] !== 2) continue; const k = oK[t]; if (S[k] < -1) continue;
          let best = -9; for (let o = 0; o < nB; o++) if (o !== k && S[o] > best) best = S[o];
          const d = S[k] - best; if (d < -e) continue;
          const u = d >= e ? 1 : (d + e) / (2 * e); mark(masks[bios[k]], gx, gy, u * u * (3 - 2 * u) * 255);
        }
      }
    }
  }
  const out = [];
  for (const b of others) if (masks[b].n) { const M = masks[b]; M.bio = b; M.G = G; M.cell = cell; out.push(M); }
  WORLD.blendMs = (WORLD.blendMs || 0) + performance.now() - t0; WORLD.blendN = (WORLD.blendN || 0) + 1;
  return c.bf = out.length ? out : null;
}
// snow lying on the roads of the frozen north (its own blocks and wherever it owns another's ground): two layers of the
// drift texture at different sizes, anchored to the world
function texelRoadSnow(g, rects) {
  if (!rects.length) return;
  for (const [sc, a] of [[1, 0.8], [0.43, 0.45]]) {
    const pat = texelGroundPat(g, 'snowcover', sc); if (!pat) return;
    g.globalAlpha = a; g.fillStyle = pat; for (const r of rects) g.fillRect(r[0], r[1], r[2], r[3]);
  }
  g.globalAlpha = 1;
}
// a district's ground colours: road, sidewalk (and its kerb line) and lot; desert and snow blocks are all lot
function txbPal(b, win) {
  const B = BIO[b], sea = WORLD.season, grass = sea === 0 ? '#29421f' : sea === 1 ? '#233c1d' : sea === 2 ? '#3a3520' : '#2f3a2a';
  if (b === 'desert' || b === 'snow') return { road: B.road, ring: 0, lot: B.lot, walk: B.lot };
  return { road: B.road, ring: 1, walk: win ? '#7d8890' : B.walk, edge: win ? '#9aa5ad' : B.edge, lot: win ? (b === 'suburb' ? '#8d99a3' : '#7d8890') : b === 'suburb' ? grass : B.lot };
}
// whether two districts' grounds look different enough to blend (two paved districts with asphalt and lots a shade
// apart do not: the field skips them, and their blocks cost nothing extra)
function txbDiffers(a, b) {
  if (a === b) return false;
  const wa = txbWin(a), wb = txbWin(b);
  if (txbCover(a, wa) !== txbCover(b, wb)) return true;
  const pa = txbPal(a, wa), pb = txbPal(b, wb);
  return !txbNear(pa.road, pb.road) || !txbNear(pa.lot, pb.lot) || !txbNear(pa.walk, pb.walk);
}
function txbNear(a, b) { const p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16); return Math.abs((p >> 16) - (q >> 16)) + Math.abs(((p >> 8) & 255) - ((q >> 8) & 255)) + Math.abs((p & 255) - (q & 255)) < 24; }
const TXB_SPECK = { desert: ['rgba(255,230,180,0.06)', 'rgba(60,40,20,0.12)'], snow: ['rgba(255,255,255,0.12)', 'rgba(60,80,100,0.08)'], suburb: ['rgba(120,170,90,0.10)', 'rgba(0,0,0,0.14)'], road: ['rgba(255,255,255,0.03)', 'rgba(0,0,0,0.16)'] };
function txbMaskCanvas(M) {
  if (M.can) return M.can;
  const cv = texelMk(M.G, M.G), g = cv.getContext('2d'), im = g.createImageData(M.G, M.G), d = im.data;
  for (let i = 0; i < M.a.length; i++) { const k = i * 4; d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = M.a[i]; }
  g.putImageData(im, 0, 0); return M.can = cv;
}
// paints the neighbours' ground into block c where they own it. late = 0 is the early pass (before road markings): the
// asphalt between two paved districts; late = 1 is everything else, after this block's own surfaces and patches
function texelBlend(g, c, late) {
  if (TXB.disabled) return;
  if (late && c.bio === 'snow') { const ox = c.ox, oy = c.oy; texelRoadSnow(g, [[ox, oy, CH, ROAD], [ox, oy + ROAD, ROAD, BS]]); }   // (under any neighbour's ground)
  let F; try { F = txbField(c); } catch (e) { texelHurt(e); return; }
  if (!F) return;
  const t0 = performance.now(), ox = c.ox, oy = c.oy, bx = ox + ROAD, by = oy + ROAD, px = c.px || 1, me = c.bio, meCov = txbCover(me, winterOn(c)), lvl = texelLevel();
  const roadR = [[ox, oy, CH, ROAD], [ox, by, ROAD, BS]], blockR = [bx, by, BS, BS], innerR = [bx + 16, by + 16, BS - 32, BS - 32];
  for (const M of F) {
    const b = M.bio, win = txbWin(b), cov = txbCover(b, win), full = cov || meCov;
    if (!late && (full || txbNear(BIO[b].road, BIO[me].road))) continue;   // (covering grounds are all painted in the late pass; two asphalts within a shade of each other need no early pass)
    const P = txbPal(b, win), R = Z.mulberry32(Z.hash32(c.cx * 7349 + c.cy * 91813 + b.length * 131 + (late ? 17 : 3)));
    // the box of the mask, in art units, with a cell of margin for the soft edge
    const cell = M.cell, ax0 = ox + (M.x0 - 1) * cell, ay0 = oy + (M.y0 - 1) * cell, ax1 = ox + (M.x1 + 1) * cell, ay1 = oy + (M.y1 + 1) * cell;
    const x0 = Math.max(ox, ax0), y0 = Math.max(oy, ay0), x1 = Math.min(ox + CH, ax1), y1 = Math.min(oy + CH, ay1);
    if (x1 - x0 < 2 || y1 - y0 < 2) continue;
    // (painted at a little over half the block's sharpness: it is soft ground seen through a soft mask, and a quarter of
    // the pixels to fill)
    const hp = Math.max(px * TXB.res, Math.min(px, 0.9)), Sw = Math.ceil((x1 - x0) * hp), Sh = Math.ceil((y1 - y0) * hp), T = texelScratch(5, Math.max(Sw, Sh)), t = T.g;
    t.setTransform(hp, 0, 0, hp, -x0 * hp, -y0 * hp);
    const box = (r) => { const a = Math.max(r[0], x0), b2 = Math.max(r[1], y0), w = Math.min(r[0] + r[2], x1) - a, h = Math.min(r[1] + r[3], y1) - b2; return w > 0 && h > 0 ? [a, b2, w, h] : null; };
    const roads = [], blocks = [];
    if (!late || full) for (const r of roadR) { const q = box(r); if (q) { t.fillStyle = P.road; t.fillRect(q[0], q[1], q[2], q[3]); roads.push(q); } }
    if (late) {
      if (full) {
        const q = box(blockR); if (q) { t.fillStyle = P.ring ? P.walk : P.lot; t.fillRect(q[0], q[1], q[2], q[3]); blocks.push(q); }
        if (P.ring) { t.strokeStyle = P.edge; t.lineWidth = 2; t.strokeRect(bx + 1, by + 1, BS - 2, BS - 2); }
      }
      if (P.ring) { const q = box(innerR); if (q) { t.fillStyle = P.lot; t.fillRect(q[0], q[1], q[2], q[3]); if (!full) blocks.push(q); } }
      else if (!full) { const q = box(innerR); if (q) { t.fillStyle = P.lot; t.fillRect(q[0], q[1], q[2], q[3]); blocks.push(q); } }
    }
    if (!roads.length && !blocks.length) continue;
    // grain: the district's speckle on its ground
    const dm = Q.deco || 1, sp = TXB_SPECK[b === 'suburb' && win ? 'snow' : b] || null;
    for (const q of roads) speckle(t, R, q[0], q[1], q[2], q[3], Math.floor(q[2] * q[3] / 1600 * dm), TXB_SPECK.road[0], TXB_SPECK.road[1]);
    if (sp) for (const q of blocks) speckle(t, R, q[0], q[1], q[2], q[3], Math.floor(q[2] * q[3] / 900 * dm), sp[0], sp[1]);
    if (late) {
      if (lvl >= 1 && dm >= 0.6) texelGroundFor(t, b, win, roads, blocks);
      if (b === 'snow') texelRoadSnow(t, roads);
      // the district's own patches, set where it owns the ground most firmly
      // (only the loose covers: snow, sand, ash and rubble lie anywhere; a paved district's oil and weeds belong to its own layout)
      const snowy = b === 'snow' || win, kinds = snowy ? ['snow', 'slush', 'snow'] : b === 'desert' ? ['sand', 'sand', 'dirt'] : b === 'ruins' || b === 'ash' || b === 'burning' ? ['ash', 'rubble', 'soot'] : null;
      const N = kinds ? (lvl >= 2 ? 4 : 2) : 0, G = M.G;
      for (let i = 0, tries = 0; i < N && tries < 50; tries++) {
        const gx = M.x0 + ((R() * (M.x1 - M.x0 + 1)) | 0), gy = M.y0 + ((R() * (M.y1 - M.y0 + 1)) | 0); if (M.a[gy * G + gx] < 220) continue;
        const sx = ox + gx * cell, sy = oy + gy * cell, k = kinds[i % 3], sz = k === 'sand' ? 38 : k === 'snow' ? 32 : 26; i++;
        if (lvl >= 1) texelSplat(t, c, k, sx, sy, sz * (0.8 + R() * 0.6), sz * (0.8 + R() * 0.6), 5, R, 0.75);
        if (snowy && i % 2) softBlob(t, sx, sy, 40 + R() * 50, 10 + R() * 7, windAngle(c), '250,252,255', 0.4);
      }
    }
    // through the mask
    t.globalCompositeOperation = 'destination-in'; t.imageSmoothingEnabled = true; if ('imageSmoothingQuality' in t) t.imageSmoothingQuality = 'low';
    t.drawImage(txbMaskCanvas(M), ox - cell / 2, oy - cell / 2, (M.G) * cell, (M.G) * cell);
    t.globalCompositeOperation = 'source-over'; t.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = late ? (full ? 0.96 : 0.9) : 0.92; g.drawImage(T, 0, 0, Sw, Sh, x0, y0, Sw / hp, Sh / hp); g.globalAlpha = 1;
  }
  TEXEL.blendMs = (TEXEL.blendMs || 0) * 0.8 + (performance.now() - t0) * 0.2;
}
// how much of each district is round a point (x, y in world pixels), for the shaders and the colour grade: the same
// weights as the ground blend without its noise, sharpened so a district's own middle is all its own
function bioMix(x, y, out) {
  out = out || {}; for (const k in out) out[k] = 0;
  const ax = x / SCL, ay = y / SCL, cx = Math.floor(ax / CH), cy = Math.floor(ay / CH), nb = [];
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) nb.push(distAt(cx + i, cy + j).bio);
  const W = {}; for (const b of nb) W[b] = 0; txbWeights(nb, cx, cy, ax, ay, W);
  let s = 0; for (const b in W) { const v = W[b] * W[b] * W[b] * W[b]; W[b] = v; s += v; }
  for (const b in W) out[b] = s > 0 ? W[b] / s : 0;
  return out;
}
// a pattern of a library texture, drawn at `scale` (pattern pixels per unit of the context it paints)
function texelPattern(g, kind, scale) {
  const pat = g.createPattern(texelCanvas(kind), 'repeat'); if (!pat) return null;
  if (scale && scale !== 1 && pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix([scale, 0, 0, scale, 0, 0]));
  return pat;
}

/* ---------- zombie sprites ---------- */
// draws mutation m (radius rq units) into a new canvas of `size` pixels, centred at half*SPR
function texelZombie(m, rq, plain, half, size) {
  const t0 = performance.now(), q = TEXQ[texelLevel()];
  let c = texelMk(size, size), g = c.getContext('2d');
  if (!g) { texelOOM(); c = texelMk(size, size); g = c.getContext('2d'); if (!g) return c; }
  const plainDraw = () => { g.setTransform(SPR, 0, 0, SPR, half * SPR, half * SPR); Z.drawMutation(g, m, rq, { noAbility: plain }); };
  if (!q.tex) { plainDraw(); const dt = performance.now() - t0; TEXEL.ms += dt; TEXEL.made++; coreCost('TEXEL', dt); return c; }
  try {
    const ss = q.ss, k = SPR * ss, S = Math.ceil(half * 2 * k), cx = half * k;
    const A = texelScratch(0, S), M = texelScratch(1, S), T = texelScratch(2, S), a = A.g, mg = M.g, t = T.g;
    // the zombie as the mutation engine draws it, and its body alone
    a.setTransform(k, 0, 0, k, cx, cx); Z.drawMutation(a, m, rq, { noAbility: plain });
    mg.setTransform(k, 0, 0, k, cx, cx); Z.drawMutation(mg, m, rq, { noAbility: plain, sil: true });
    mg.setTransform(1, 0, 0, 1, 0, 0);
    // the texture layer, only inside the body: mid grey (no change), skin mottling, grime and blood, then shading
    t.drawImage(M, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = '#808080'; t.fillRect(0, 0, S, S);
    t.globalCompositeOperation = 'source-atop';
    const feat = Math.max(0.6, rq * 0.11 * k / 4);
    t.globalAlpha = 0.6; t.fillStyle = texelPattern(t, 'skin', feat); t.save(); t.translate((m.seed & 63), (m.seed >> 6) & 63); t.fillRect(-64, -64, S + 128, S + 128); t.restore();
    t.globalAlpha = 0.75; t.fillStyle = texelPattern(t, 'grime', feat * 1.4); t.save(); t.translate((m.seed >> 3) & 127, (m.seed >> 10) & 127); t.fillRect(-128, -128, S + 256, S + 256); t.restore();
    t.globalAlpha = 1;
    const R = Z.mulberry32((m.seed ^ 0x7e1) >>> 0), nb = 2 + Math.floor(R() * 3 + q.detail);
    for (let i = 0; i < nb; i++) {
      const ang = R() * TAU, dd = R() * rq * 0.7 * k, rr = rq * k * (0.12 + R() * 0.2), blood = R() < 0.55;
      t.fillStyle = blood ? 'rgba(70,6,8,0.55)' : 'rgba(30,24,18,0.45)';
      t.beginPath(); t.ellipse(cx + Math.cos(ang) * dd, cx + Math.sin(ang) * dd, rr, rr * (0.5 + R() * 0.5), R() * 3, 0, TAU); t.fill();
      if (blood && q.detail) for (let j = 0; j < 3; j++) { t.beginPath(); t.arc(cx + Math.cos(ang) * dd + (R() - 0.5) * rr * 3, cx + Math.sin(ang) * dd + (R() - 0.5) * rr * 3, rr * 0.18, 0, TAU); t.fill(); }
    }
    if (q.detail >= 2) {
      // veins and cracks
      t.strokeStyle = 'rgba(40,20,30,0.45)'; t.lineWidth = Math.max(1, k * 0.35);
      for (let i = 0; i < 4; i++) { let x = cx + (R() - 0.5) * rq * k, y = cx + (R() - 0.5) * rq * k, an = R() * TAU; t.beginPath(); t.moveTo(x, y); for (let s = 0; s < 4; s++) { an += (R() - 0.5) * 1.4; x += Math.cos(an) * rq * k * 0.14; y += Math.sin(an) * rq * k * 0.14; t.lineTo(x, y); } t.stroke(); }
    }
    // shading from above: a soft highlight up top, darker toward the edges and the bottom
    const sh = t.createRadialGradient(cx - rq * k * 0.2, cx - rq * k * 0.3, rq * k * 0.1, cx, cx, rq * k * 1.25);
    sh.addColorStop(0, 'rgba(255,255,255,0.42)'); sh.addColorStop(0.45, 'rgba(128,128,128,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.55)');
    t.fillStyle = sh; t.fillRect(0, 0, S, S);
    // laid over the zombie: soft light keeps its colours and adds the detail
    a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = 'soft-light'; a.drawImage(T, 0, 0); a.globalCompositeOperation = 'source-over';
    if (q.rim) {
      // a thin dark rim round the body: the body stamped around itself, minus the body
      const O = texelScratch(3, S), o = O.g, w = Math.max(1, ss * 0.9);
      for (const [dx, dy] of [[w, 0], [-w, 0], [0, w], [0, -w], [w * 0.7, w * 0.7], [-w * 0.7, w * 0.7], [w * 0.7, -w * 0.7], [-w * 0.7, -w * 0.7]]) o.drawImage(M, dx, dy);
      o.globalCompositeOperation = 'destination-out'; o.drawImage(M, 0, 0);
      o.globalCompositeOperation = 'source-in'; o.fillStyle = 'rgba(8,6,5,0.6)'; o.fillRect(0, 0, S, S);
      a.drawImage(O, 0, 0);
    }
    // down to the screen's exact sharpness
    g.imageSmoothingEnabled = true; if ('imageSmoothingQuality' in g) g.imageSmoothingQuality = 'high';
    g.drawImage(A, 0, 0, S, S, 0, 0, size, size);
  } catch (e) {
    texelHurt(e);
    try { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, size, size); plainDraw(); } catch (x) { }
  }
  const dt = performance.now() - t0; TEXEL.ms += dt; TEXEL.made++; coreCost('TEXEL', dt);
  return c;
}

/* ---------- the player ---------- */
// the survivor seen from above, facing +x, in the player's own units (the game scales by PK): backpack, jacket,
// arms on the gun, head with a cap. f: walking pose 0..3
function texelPlayerArt(g, fk, gl, gw, col, f) {
  const sw = [0, 1, 0, -1][f] * 2.2;
  g.lineCap = 'round'; g.lineJoin = 'round';
  // backpack with a rolled mat and straps
  g.fillStyle = '#2b2f2a'; g.beginPath(); g.ellipse(-9.5, 0, 4.6, 7.6, 0, 0, TAU); g.fill();
  g.fillStyle = '#3a4033'; g.fillRect(-13.4, -6.5, 6, 13); g.fillStyle = '#1f221e'; g.fillRect(-13.4, -2, 6, 1.2);
  g.fillStyle = '#5a4630'; g.beginPath(); g.ellipse(-14.6, 0, 1.8, 7.2, 0, 0, TAU); g.fill();
  // jacket (the body), shoulders swinging a little with the walk
  g.save(); g.rotate(sw * 0.02);
  g.fillStyle = '#3e4a3a'; g.beginPath(); g.ellipse(0, 0, 9, 13, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-6, -9.5); g.quadraticCurveTo(0, -11, 4.5, -8); g.moveTo(-6, 9.5); g.quadraticCurveTo(0, 11, 4.5, 8); g.stroke();
  g.fillStyle = '#f2cc3a'; g.fillRect(-4.2, -12, 2.6, 24); g.fillRect(2, -11, 1.8, 22);     // the yellow straps
  g.fillStyle = '#2f382c'; g.beginPath(); g.ellipse(-1, 0, 2.4, 10, 0, 0, TAU); g.fill();     // collar and zip
  g.restore();
  // arms reaching to the gun: the back hand on the grip, the front hand under the barrel
  g.strokeStyle = '#334030'; g.lineWidth = 5.2;
  g.beginPath(); g.moveTo(1, 8.5); g.lineTo(9.5 + sw * 0.15, 3.2); g.moveTo(1, -8.5); g.lineTo(13 + sw * 0.25, -2.4); g.stroke();
  g.fillStyle = '#c9a27e'; g.beginPath(); g.arc(10.5 + sw * 0.15, 2.6, 2.4, 0, TAU); g.arc(14 + sw * 0.25, -1.8, 2.3, 0, TAU); g.fill();
  // the gun: body, stock, magazine, rail, and the weapon's colour along it
  if (fk === 'flamer') { g.fillStyle = '#7a2a1a'; g.beginPath(); g.ellipse(-12, 0, 6, 9, 0, 0, TAU); g.fill(); g.strokeStyle = '#2a1a14'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-8, 4); g.quadraticCurveTo(2, 9, 9, 2); g.stroke(); }
  g.fillStyle = '#16181b'; g.fillRect(8, -gw / 2, gl, gw); g.fillRect(4, -gw / 2 + 0.6, 4.5, gw - 1.2);
  g.fillStyle = '#0d0e10'; g.fillRect(10, gw / 2 - 1, 5, 4); g.fillRect(8 + gl - 3, -gw / 2 - 0.6, 3, gw + 1.2);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(9, -gw / 2, gl - 2, 0.8);
  g.fillStyle = col; g.fillRect(12, -1, gl * 0.45, 2);
  // head: hair and a cap with its brim to the front
  g.fillStyle = '#c9a27e'; g.beginPath(); g.arc(2, 0, 6.4, 0, TAU); g.fill();
  g.fillStyle = '#2d332b'; g.beginPath(); g.arc(0.6, 0, 6.6, Math.PI * 0.5, Math.PI * 1.5); g.fill();
  g.fillStyle = '#262b24'; g.beginPath(); g.ellipse(6.6, 0, 2.2, 5.2, 0, -Math.PI / 2, Math.PI / 2); g.fill();
  g.fillStyle = '#b48c6a'; g.beginPath(); g.arc(1.6, -6.2, 1.3, 0, TAU); g.arc(1.6, 6.2, 1.3, 0, TAU); g.fill();
}
// the player's sprite for a weapon and pose, made once at the screen's sharpness (and supersampled)
function texelPlayer(p) {
  const w = p.weapon || {}, fk = (w.F && w.F.key) || 'pistol', gl = GUN_LEN[fk] || 20, gw = GUN_W[fk] || 5, col = w.color || '#c9c9c9';
  const f = Math.floor(((p.walk || 0) / Math.PI * 2 % 4 + 4) % 4), q = TEXQ[texelLevel()], half = 48, px = SPR * PK;
  const key = fk + '|' + col + '|' + f + '|' + Math.round(px * 100) + '|' + TEXEL.lvl;
  let s = TEXEL.players.get(key); if (s) return s;
  const t0 = performance.now(), ss = q.ss, size = Math.max(8, Math.ceil(half * 2 * px)), S = Math.ceil(size * ss), k = px * ss;
  let c = texelMk(size, size), g = c.getContext('2d'); if (!g) { texelOOM(); c = texelMk(size, size); g = c.getContext('2d'); }
  try {
    if (!q.tex) { g.setTransform(px, 0, 0, px, size / 2, size / 2); texelPlayerArt(g, fk, gl, gw, col, f); }
    else {
      const A = texelScratch(0, S), T = texelScratch(2, S), a = A.g, t = T.g;
      a.setTransform(k, 0, 0, k, S / 2, S / 2); texelPlayerArt(a, fk, gl, gw, col, f); a.setTransform(1, 0, 0, 1, 0, 0);
      // fabric and shading only where the survivor is
      t.drawImage(A, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = '#808080'; t.fillRect(0, 0, S, S);
      t.globalCompositeOperation = 'source-atop'; t.globalAlpha = 0.5; t.fillStyle = texelPattern(t, 'cloth', Math.max(0.5, k * 0.18)); t.fillRect(0, 0, S, S); t.globalAlpha = 1;
      const sh = t.createRadialGradient(S / 2 - 2 * k, S / 2 - 3 * k, k, S / 2, S / 2, 15 * k);
      sh.addColorStop(0, 'rgba(255,255,255,0.4)'); sh.addColorStop(0.5, 'rgba(128,128,128,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.5)');
      t.fillStyle = sh; t.fillRect(0, 0, S, S);
      a.globalCompositeOperation = 'soft-light'; a.drawImage(T, 0, 0); a.globalCompositeOperation = 'source-over';
      if (q.rim) {
        const O = texelScratch(3, S), o = O.g, wd = Math.max(1, ss);
        for (const [dx, dy] of [[wd, 0], [-wd, 0], [0, wd], [0, -wd]]) o.drawImage(A, dx, dy);
        o.globalCompositeOperation = 'destination-out'; o.drawImage(A, 0, 0); o.globalCompositeOperation = 'source-in'; o.fillStyle = 'rgba(6,6,6,0.6)'; o.fillRect(0, 0, S, S);
        a.drawImage(O, 0, 0);
      }
      g.imageSmoothingEnabled = true; if ('imageSmoothingQuality' in g) g.imageSmoothingQuality = 'high';
      g.drawImage(A, 0, 0, S, S, 0, 0, size, size);
    }
  } catch (e) { texelHurt(e); try { g.setTransform(px, 0, 0, px, size / 2, size / 2); texelPlayerArt(g, fk, gl, gw, col, f); } catch (x) { } }
  s = { c: c, half: half };
  TEXEL.players.set(key, s); if (TEXEL.players.size > 48) TEXEL.players.delete(TEXEL.players.keys().next().value);
  const dt = performance.now() - t0; TEXEL.ms += dt; TEXEL.made++; coreCost('TEXEL', dt);
  return s;
}

/* ---------- looking after itself ---------- */
function texelOOM() { try { trimCaches(1); } catch (e) { } TEXEL.players.clear(); TEXEL.scratch.length = 0; coreRepaired('TEXEL', 'Textures: freed memory for new sprites'); }
function texelHurt(e) {
  const now = performance.now(); coreHurt('TEXEL', e); try { console.error(e); } catch (x) { }
  TEXEL.errT.push(now); while (TEXEL.errT.length && now - TEXEL.errT[0] > 10000) TEXEL.errT.shift();
  if (TEXEL.errT.length >= 6) { TEXEL.offUntil = now + 60000; TEXEL.errT.length = 0; coreRepaired('TEXEL', 'Textures paused for a minute after errors'); }
  else if (TEXEL.errT.length >= 3 && TEXEL.adapt > -3) { TEXEL.adapt--; coreRepaired('TEXEL', 'Textures stepped down a level'); }
}
// once a second: what making sprites cost, and whether to step down or back up
function texelWatch() {
  const ms = TEXEL.ms; TEXEL.ms = 0; TEXEL.msAvg = TEXEL.msAvg * 0.7 + ms * 0.3;
  const T = 1000 / targetFps();
  // a burst of new sprites is normal (a new wave, a new district); a steady cost of over a frame per second is not
  if (TEXEL.msAvg > T * 1.2 && PERF.fps && PERF.fps < targetFps() * 0.9) { if (++TEXEL.bad >= 3 && TEXEL.adapt > -2) { TEXEL.adapt--; TEXEL.bad = 0; } }
  else if (TEXEL.msAvg < T * 0.2 && TEXEL.adapt < 0) { if (++TEXEL.good >= 20 && coreRise('TEXEL')) { TEXEL.adapt++; TEXEL.good = 0; } }
  else { TEXEL.bad = Math.max(0, TEXEL.bad - 1); }
}
coreAdd({
  name: 'TEXEL', kind: 'render', does: 'Texture and resolution engine: procedural textures for zombies, the player and the city; blended ground materials (asphalt, concrete, grass, dirt, sand, rubble) with soft edges and districts that bleed into each other; cloth, skin and grime on the 2.0 zombies; sprites supersampled and scaled to the screen\'s exact sharpness, memory and error repair.',
  state: () => TEXEL.offUntil && performance.now() < TEXEL.offUntil ? 'paused' : texelLevel() ? 'on' : 'plain',
  level: () => ['plain', 'textured', 'textured, rim, 1.5x', 'full, 2x'][texelLevel()],
  sec: texelWatch, canTrim: () => texelLevel() > 0, trim: () => { if (TEXEL.adapt <= -3) return false; TEXEL.adapt--; return true; }, boost: () => { if (TEXEL.adapt >= 0) return false; TEXEL.adapt++; return true; }
});
// CORE v3: what a level costs it in sprite making, by how many sprites it had to make that second
coreMeta('TEXEL', { ver: 3, provides: ['textures', 'sprites', 'ground'], feats: { want: ['offscreen'] },
  lv: () => texelLevel(), adaptGet: () => TEXEL.adapt, loadNow: () => { const m = TEXEL.made - (TEXEL._m || 0); TEXEL._m = TEXEL.made; return m; }, loadName: 'new sprites a second',
  check: () => !(TEXEL.adapt <= 0 && TEXEL.adapt >= -3) ? 'its level went out of range' : sprites.size > Math.max(800, Q.sprCap * 3) ? 'its sprite cache overflowed (' + sprites.size + ')' : '',
  repair: () => { if (sprites.size > Q.sprCap) trimCaches(0); TEXEL.adapt = clamp(TEXEL.adapt | 0, -3, 0); },
  reset: () => { sprites.clear(); TEXEL.players.clear(); TEXEL.scratch.length = 0; TEXEL.offUntil = 0; TEXEL.errT.length = 0; } });
