/* ================= MIRROR: the reflection engine =================
   Things that shine: rivers and ponds, puddles, the whole street when it rains, ice, the glass and paint of every car,
   fresh blood. Each frame MIRROR paints a reflectivity map of the view (how much each spot reflects, and whether it is
   water that ripples) from what the other engines know: the water fields of the city generator, the puddles, the
   weather's wetness, the vehicle engine's glass, the blood engine's fresh pools.
   - On the GPU the shader engine reads that map in its final pass: the sky's colour (the hour, the weather, drifting
     cloud) reflected with a fresnel-like weight, the bright lights of the street (lamps, fires, headlights, muzzle
     flashes) mirrored a little outward from where they hang, everything rippled by waves on the water and by rain
     falling into the puddles, and the sun glittering on open water. Wet ground darkens and deepens in colour.
   - On the CPU the same is approached with blend modes: the sky screened in, the lights' glows mirrored and added,
     shimmering as the water moves, sparkles on the water in sunshine.
   It steps down by itself (no glitter, no wet streets, then off) when the frame runs late, and back up after. */
const MIRROR = { MA: null, ma: null, MW: null, mw: null, RF: null, rf: null, cw: 0, ch: 0, res: 0, on: false, gpu: false, adapt: 0, ms: 0, errT: [], offUntil: 0, sky: [0.5, 0.6, 0.75], sun: [1, 0.95, 0.85], sunK: 0, wet: 0, fk: 0, wk: 0, ft: 0 };
function mirrorLevel() {
  if (MIRROR.offUntil && performance.now() < MIRROR.offUntil) return 0;
  const w = SET.refl || 'auto', base = w === 'off' ? 0 : w === 'on' ? 2 : [1, 2, 2, 2][clamp(PERF.tier | 0, 0, 3)];
  return base ? clamp(base + MIRROR.adapt + (TUNE.MIRROR || 0), 0, 2) : 0;
}
function mirrorCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(2, w); c.height = Math.max(2, h); return c; }
// a block's water as a small mask (alpha = how reflective; open water ripples, ice does not), made once
function mirrorWater(c) {
  if (c.mwc !== undefined) return c.mwc;
  if (!c.fv || c.bio === 'desert') { c.mwc = null; return null; }
  const n = 192, can = mirrorCanvas(n, n), g = can.getContext('2d'), bx = c.wbox || (c.wbox = isoBox(c.fv, 0.9));
  if (!bx) { c.mwc = null; return null; }
  g.scale(n / CH, n / CH); g.translate(-c.ox, -c.oy);
  g.beginPath(); g.rect(c.ox + ROAD, c.oy + ROAD, BS, BS); g.clip();
  const ice = c.bio === 'snow' || (winterOn(c) && c.D.warm < 0.5);
  g.fillStyle = ice ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.95)'; isoFill(g, c.fv, c.ox, c.oy, 0.05, null, bx);
  c.mwc = can; c.mice = ice;
  return can;
}
function mirrorBuild(cw, ch, res) {
  MIRROR.MA = mirrorCanvas(cw, ch); MIRROR.ma = MIRROR.MA.getContext('2d');
  MIRROR.MW = mirrorCanvas(cw, ch); MIRROR.mw = MIRROR.MW.getContext('2d');
  MIRROR.RF = mirrorCanvas(cw, ch); MIRROR.rf = MIRROR.RF.getContext('2d');
  if (!MIRROR.ma || !MIRROR.mw || !MIRROR.rf) throw new Error('mirror: no canvas context');
  MIRROR.cw = cw; MIRROR.ch = ch; MIRROR.res = res; MIRROR.cvw = cv.width; MIRROR.cvh = cv.height;
}
// the colour of the sky for this frame (what water reflects): blue by day, gold at dusk, deep blue at night, grey in rain
function mirrorSky() {
  const F = CORE.frame, day = F.day == null ? 1 : F.day, night = 1 - day, sun = F.sun, S = MIRROR.sky, cov = clamp((WX.dark || 0) + (WX.rain || 0) * 0.6 + (WX.fog || 0) * 0.7 + (WX.snow || 0) * 0.4, 0, 1);
  let r = 0.42, g = 0.58, b = 0.82;
  if (LUX.live) { const h = LUX.hour, sea = WORLD.season, set = LUX_SET[sea], rise = LUX_RISE[sea], gold = Math.max(0, 1 - Math.min(Math.abs(h - set), Math.abs(h - rise)) / 1.4); r += gold * 0.45; g += gold * 0.12; b -= gold * 0.3; }
  r = r * (1 - cov) + 0.55 * cov; g = g * (1 - cov) + 0.58 * cov; b = b * (1 - cov) + 0.62 * cov;
  const k = 0.12 + 0.88 * day; S[0] = r * k + 0.02 * night; S[1] = g * k + 0.04 * night; S[2] = b * k + 0.1 * night;
  MIRROR.sunK = sun && sun.on ? sun.k : 0; MIRROR.sun[0] = 1; MIRROR.sun[1] = 0.92 - 0.2 * (1 - day); MIRROR.sun[2] = 0.8 - 0.35 * (1 - day);
  return S;
}
// paint the reflectivity map of the view (alpha) and the water map (alpha: how much it ripples)
function mirrorMask(x0, y0, x1, y1, lvl) {
  const res = lvl >= 2 ? 0.42 : 0.32, cw = Math.max(2, Math.round(cv.width * res)), ch = Math.max(2, Math.round(cv.height * res));
  if (!MIRROR.MA || MIRROR.cw !== cw || MIRROR.ch !== ch) mirrorBuild(cw, ch, res);
  const a = MIRROR.ma, w = MIRROR.mw, tr = ctx.getTransform();
  for (const g of [a, w]) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, cw, ch); g.setTransform(tr.a * res, tr.b * res, tr.c * res, tr.d * res, tr.e * res, tr.f * res); }
  const vis = (x, y, r) => x > x0 - r && x < x1 + r && y > y0 - r && y < y1 + r;
  const wet = MIRROR.wet = clamp(WX.wet || 0, 0, 1);
  let any = false;
  for (let cx = Math.floor(x0 / CHS); cx <= Math.floor(x1 / CHS); cx++) for (let cy = Math.floor(y0 / CHS); cy <= Math.floor(y1 / CHS); cy++) {
    const c = chunks.get(cx + ',' + cy); if (!c) continue;
    // rivers, ponds and ice
    if (c.wet) { const m = mirrorWater(c); if (m) { a.drawImage(m, c.sx, c.sy, CHS, CHS); if (!c.mice) w.drawImage(m, c.sx, c.sy, CHS, CHS); any = true; } }
    // the street in the rain: roads shine more than sidewalks, puddles most of all (1.9.998.2: easing in as the street
    // gets wet, and with the level, instead of switching on at a wetness of 0.12)
    const sk = MIRROR.wk * clamp((wet - 0.06) / 0.12, 0, 1);
    if (sk > 0.01 && c.bio !== 'desert' && c.bio !== 'snow') {
      a.fillStyle = 'rgba(255,255,255,' + (0.3 * wet * sk).toFixed(3) + ')'; a.fillRect(c.sx, c.sy, CHS, ROADS); a.fillRect(c.sx, c.sy + ROADS, ROADS, CHS - ROADS);
      a.fillStyle = 'rgba(255,255,255,' + (0.12 * wet * sk).toFixed(3) + ')'; a.fillRect(c.sx + ROADS, c.sy + ROADS, CHS - ROADS, CHS - ROADS); any = true;
    }
    const pk = typeof wxPudK === 'function' ? wxPudK() : (wet > 0.06 ? 0.6 + wet * 0.5 : 0);
    if (pk > 0) {
      const k = pk; a.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.6 * wet).toFixed(3) + ')'; w.fillStyle = 'rgba(255,255,255,' + (0.6 * wet).toFixed(3) + ')';
      a.beginPath(); w.beginPath();
      for (const p of c.puddles) { if (!vis(p.x, p.y, p.rx)) continue; a.moveTo(p.x + p.rx * k, p.y); a.ellipse(p.x, p.y, p.rx * k, p.ry * k, p.a, 0, TAU); w.moveTo(p.x + p.rx * k, p.y); w.ellipse(p.x, p.y, p.rx * k, p.ry * k, p.a, 0, TAU); }
      a.fill(); w.fill(); any = true;
    }
    // glass and paint
    if (typeof garageGlass === 'function') { a.fillStyle = '#fff'; garageGlass(a, c, vis); any = true; }
  }
  if (typeof goreMirror === 'function' && goreMirror(a, vis)) any = true;
  for (const g of [a, w]) g.setTransform(1, 0, 0, 1, 0, 0);
  return any;
}
// the CPU path: the sky, the lights mirrored, sparkles on the water, gathered small into one layer (masked by what
// reflects) and added over the picture in a single pass
function mirrorCpu(x0, y0, x1, y1, lvl) {
  const R = MIRROR.RF, g = MIRROR.rf, cw = MIRROR.cw, ch = MIRROR.ch, S = MIRROR.sky, F = CORE.frame, day = F.day == null ? 1 : F.day, night = 1 - day, t = G.time || 0;
  // the sky (added rather than screened, so a little weaker)
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, cw, ch);
  const gr = g.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, 'rgb(' + Math.round(S[0] * 255) + ',' + Math.round(S[1] * 255) + ',' + Math.round(S[2] * 255) + ')'); gr.addColorStop(1, 'rgb(' + Math.round(S[0] * 200) + ',' + Math.round(S[1] * 215) + ',' + Math.round(S[2] * 235) + ')');
  g.globalAlpha = (0.14 + 0.2 * day) * 0.75; g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
  // the lights of the street, mirrored a little outward from where they hang (their image sits below the surface)
  if (LUX.live && LUX.n) {
    const tr = ctx.getTransform(), res = MIRROR.res; g.setTransform(tr.a * res, tr.b * res, tr.c * res, tr.d * res, tr.e * res, tr.f * res);
    g.globalCompositeOperation = 'lighter'; const L = LUX.lights, cx = cam.x, cy = cam.y, shim = Math.sin(t * 2.3) * 3 * SCL, k = 0.5 + 0.5 * night;
    for (let i = 0; i < Math.min(LUX.n, 40); i++) {
      const l = L[i]; if (l.pr < 0 && night < 0.3) continue; const rx = l.x + (l.x - cx) * 0.06 + shim, ry = l.y + (l.y - cy) * 0.06 + Math.cos(t * 1.7 + l.x) * 2 * SCL, rr = Math.min(l.r * 0.2, 70 * SCL);
      const q = v => (Math.min(255, v | 0) >> 4) * 17; g.globalAlpha = Math.min(1, l.i * 0.9 * k); g.drawImage(glowSprite('#' + ((1 << 24) + (q(l.c0) << 16) + (q(l.c1) << 8) + q(l.c2)).toString(16).slice(1)), rx - rr, ry - rr, rr * 2, rr * 2);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in'; g.drawImage(MIRROR.MA, 0, 0);
  // sun glitter on open water: the sparkle pattern cut to the water map (which nothing reads after this on the CPU)
  const gk = MIRROR.wk * clamp((MIRROR.sunK - 0.15) / 0.15, 0, 1) * clamp((day - 0.45) / 0.15, 0, 1);
  if (gk > 0.01) {
    const pat = texelPattern(MIRROR.mw, 'glitter', 1);
    if (pat) {
      const w = MIRROR.mw; w.save(); w.setTransform(1, 0, 0, 1, 0, 0); w.globalCompositeOperation = 'source-in'; w.translate((t * 9) % 128, (t * 5) % 128); w.fillStyle = pat; w.fillRect(-128, -128, cw + 256, ch + 256); w.restore();
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.8 * MIRROR.sunK * gk; g.drawImage(MIRROR.MW, 0, 0); g.globalAlpha = 1;
    }
  }
  g.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(MIRROR.fk, 0, 1); ctx.drawImage(R, 0, 0, cv.width, cv.height); ctx.restore();
}
// render() calls this after the lighting (and before the highways): builds the map, and on the CPU draws the reflections
function mirrorRun(x0, y0, x1, y1) {
  const t0 = performance.now();
  MIRROR.on = false; MIRROR.gpu = false;
  // (1.9.998.2: the reflections fade over about a third of a second when the level changes: fk all of them, wk the wet
  // streets and the sun glitter that only the full level has. The governor trims the reflections when a frame runs late
  // and CORE climbs them back when there is room, and each step used to switch the wet streets, the glitter or all of it
  // on or off in one frame, so the reflections seemed to glitch every so often. While they fade out they keep running.)
  const want = mirrorLevel(), now = performance.now(), fk = Math.min(1, clamp((now - (MIRROR.ft || now)) / 1000, 0, 0.1) * 3); MIRROR.ft = now;
  MIRROR.fk += ((want ? 1 : 0) - MIRROR.fk) * fk; MIRROR.wk += ((want >= 2 ? 1 : 0) - MIRROR.wk) * fk;
  const lvl = want || (MIRROR.fk > 0.02 ? 1 : 0); if (!lvl || G.mode === 'intro') { if (G.mode === 'intro') MIRROR.fk = MIRROR.wk = 0; return; }
  try {
    mirrorSky();
    if (!mirrorMask(x0, y0, x1, y1, lvl)) return;
    MIRROR.on = true; MIRROR.lvl = lvl;
    if (typeof PRISM !== 'undefined' && PRISM.mode === 'gpu' && PRISM.ok && !MIRROR.cpuOnly) MIRROR.gpu = true;   // (cpuOnly: set to CPU in the engine room)
    else mirrorCpu(x0, y0, x1, y1, lvl);
  } catch (e) { mirrorHurt(e); MIRROR.on = false; }
  finally { ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  const ms = performance.now() - t0; MIRROR.ms = MIRROR.ms * 0.9 + ms * 0.1; coreCost('MIRROR', ms);
}
function mirrorHurt(e) {
  const now = performance.now(); coreHurt('MIRROR', e); try { console.error(e); } catch (x) { }
  MIRROR.errT.push(now); while (MIRROR.errT.length && now - MIRROR.errT[0] > 10000) MIRROR.errT.shift();
  if (MIRROR.errT.length >= 5) { MIRROR.offUntil = now + 60000; MIRROR.errT.length = 0; coreRepaired('MIRROR', 'Reflections paused for a minute after errors'); }
  else if (MIRROR.errT.length >= 3 && MIRROR.adapt > -2) { MIRROR.adapt--; MIRROR.MA = null; coreRepaired('MIRROR', 'Reflections stepped down a level'); }
}
coreAdd({
  name: 'MIRROR', kind: 'render', does: 'Reflection engine: rivers, ponds, puddles, rain-soaked streets, ice, car glass and paint and fresh blood reflect the sky, the street lamps, fires and headlights, rippled by waves and rain, with sun glitter on the water.',
  state: () => MIRROR.on ? (MIRROR.gpu ? 'GPU' : 'CPU') : mirrorLevel() ? 'idle' : 'off', level: () => ['off', 'sky and lights', 'full'][mirrorLevel()],
  canTrim: () => mirrorLevel() > 0, trim: () => { if (MIRROR.adapt <= -2) return false; MIRROR.adapt--; return true; }, boost: () => { if (MIRROR.adapt >= 0) return false; MIRROR.adapt++; return true; },
  repair: () => { MIRROR.MA = null; MIRROR.offUntil = 0; MIRROR.errT.length = 0; }
});
// CORE v3: the reflection engine never stepped itself back up after a step down (only a new run did); now CORE climbs
// it back when the frame has room and what it learned says the next level fits
coreMeta('MIRROR', { ver: 2, provides: ['reflections', 'wetStreets'], feats: { want: ['webgl'], without: 'reflections are blended on the processor' }, climb: true,
  lv: () => mirrorLevel(), adaptGet: () => MIRROR.adapt, loadNow: () => Math.round((WX.wet || 0) * 10) + (MIRROR.on ? 1 : 0), loadName: 'wetness',
  check: () => !(MIRROR.adapt <= 0 && MIRROR.adapt >= -2) ? 'its level went out of range' : MIRROR.on && MIRROR.MA && !(MIRROR.cw > 0) ? 'its reflection map lost its size' : '',
  reset: () => { MIRROR.MA = null; MIRROR.offUntil = 0; MIRROR.errT.length = 0; MIRROR.adapt = clamp(MIRROR.adapt | 0, -2, 0); } });
