/* ================= AURA: the zombie glow engine =================
   Some zombies give off light: toxic ones a sick green, magma and infernal ones the orange of embers, void ones violet,
   abyssal ones a bioluminescent teal, volt ones a flickering electric yellow, irradiated ones a steady radioactive
   glow, glacial ones a faint cold blue, wraiths a breathing spectral cyan; bosses glow in the colour of their form, a
   bomber pulses red faster as its fuse burns, a zombie on fire burns. AURA hands these to the lighting engine as real
   light sources, so they light the street round them and their light is ray-traced: walls and cars throw shadows
   away from a glowing zombie as it walks past (the nearest few cast shadows, the rest glow without). Pools of glowing
   blood light the ground too, fading as they dry. At night every zombie's eyes catch the light and glow in its
   strain's colour, and the glowing ones get their halo back over the darkened picture.
   It only works on what is near enough to matter, caps how many lights it adds by the lighting engine's level, and
   steps down by itself (no shadows, then fewer lights, then eyes only) when the frame runs late. */
const AURA = { n: 0, shadowed: 0, eyes: 0, perf: 0, good: 0, ms: 0, msAvg: 0, msT: 0, errT: [], offUntil: 0, partOff: {} };
// c colour, i strength, r reach (world units at real scale), fl how it moves
const AURA_STRAIN = {
  toxic: { c: [120, 255, 60], i: 0.55, r: 110, fl: 'breathe' }, magma: { c: [255, 120, 30], i: 0.8, r: 140, fl: 'pulse' },
  void: { c: [170, 90, 255], i: 0.6, r: 120, fl: 'breathe' }, abyssal: { c: [40, 255, 210], i: 0.55, r: 120, fl: 'breathe' },
  volt: { c: [255, 240, 90], i: 0.65, r: 120, fl: 'flicker' }, irradiated: { c: [200, 255, 60], i: 0.75, r: 150, fl: 'steady' },
  infernal: { c: [255, 70, 40], i: 0.7, r: 130, fl: 'fire' }, hollow: { c: [255, 150, 50], i: 0.6, r: 120, fl: 'fire' },
  glacial: { c: [170, 230, 255], i: 0.3, r: 90, fl: 'steady' }, charred: { c: [255, 110, 40], i: 0.3, r: 80, fl: 'fire' },
  wraith: { c: [140, 230, 255], i: 0.35, r: 100, fl: 'breathe' }, crystal: { c: [255, 180, 240], i: 0.25, r: 80, fl: 'steady' },
  fungal: { c: [180, 255, 140], i: 0.15, r: 70, fl: 'breathe' }
};
const AURA_ABIL = {
  shocker: { c: [255, 240, 120], i: 0.3, r: 90, fl: 'flicker' }, chiller: { c: [170, 230, 255], i: 0.25, r: 90, fl: 'steady' },
  phantom: { c: [190, 220, 255], i: 0.3, r: 90, fl: 'breathe' }, voidheart: { c: [170, 90, 255], i: 0.35, r: 100, fl: 'breathe' },
  bomber: { c: [255, 60, 40], i: 0.35, r: 90, fl: 'fuse' }
};
function auraOn() { return !(AURA.offUntil && performance.now() < AURA.offUntil) && SET.lux !== 'off'; }
function auraPart(p) { const t = AURA.partOff[p]; return !(t && performance.now() < t); }
// what light a zombie gives off right now (null if none)
function auraOf(z, t) {
  let A = null;
  if (z.rb && z.rb.def && z.rb.def.forms) {
    const f = z.rb.def.forms[z.rb.form || 0], col = f && f.col ? f.col[2] || f.col[1] : null;
    if (col && typeof goreParse === 'function') { const p = goreParse(col); A = z.ac || (z.ac = { c: [p[0], p[1], p[2]], i: 0.7, r: 190, fl: 'breathe' }); }
  } else if (z.m) A = AURA_ABIL[z.m.A && z.m.A.key] || AURA_STRAIN[z.m.S && z.m.S.key] || null;
  if (z.boss && !A) A = { c: [255, 90, 70], i: 0.55, r: 160, fl: 'breathe' };
  let k = A ? A.i : 0;
  if (A) {
    const ph = (z.bob || 0) * 3;
    if (A.fl === 'breathe') k *= 0.78 + 0.22 * Math.sin(t * 1.6 + ph);
    else if (A.fl === 'pulse') k *= 0.8 + 0.2 * Math.sin(t * 3.2 + ph) + 0.05 * Math.sin(t * 11 + ph);
    else if (A.fl === 'flicker') k *= Math.random() < 0.12 ? 0.25 : 0.85 + 0.15 * Math.random();
    else if (A.fl === 'fire') k *= 0.78 + 0.22 * Math.sin(t * 12 + ph) + 0.1 * Math.sin(t * 27 + ph);
    else if (A.fl === 'fuse') k *= z.st && z.st.fuse > 0 ? (Math.floor(t * 16) % 2 ? 1.6 : 0.4) : 0.6 + 0.4 * Math.sin(t * 5 + ph);
    if (z.illusion) k *= 0.5; if (z.st && z.st.phased) k *= 0.3;
  }
  // on fire: it burns, whatever it is
  if (z.burnT > 0) { const fk = 0.5 * (0.8 + 0.2 * Math.sin(t * 14 + (z.bob || 0))); if (!A || fk > k) return { c: [255, 130, 44], k: fk, r: 100 }; }
  return A && k > 0.02 ? { c: A.c, k: k, r: A.r } : null;
}
// called by the lighting engine while it gathers its lights: glowing zombies (and glowing blood) become light sources
function auraLights(x0, y0, x1, y1, m, t) {
  AURA.n = 0; AURA.shadowed = 0;
  if (!auraOn() || !auraPart('lights')) return false;
  try {
    const uk = 0.45 + 0.55 * SCL / SCALE_REAL, cap = AURA.perf <= -2 ? 3 : [0, 4, 8, 12, 16][LUX.level || 0], shadows = AURA.perf <= -1 ? 0 : [0, 0, 1, 2, 3][LUX.level || 0];
    const cand = AURA.cand || (AURA.cand = []); cand.length = 0;
    for (const z of G.zs) {
      if (z.dead || z.fly || z.x < x0 - m || z.x > x1 + m || z.y < y0 - m || z.y > y1 + m) continue;
      const L = auraOf(z, t); if (!L) continue;
      const dx = z.x - cam.x, dy = z.y - cam.y; cand.push({ z: z, L: L, d: dx * dx + dy * dy - (z.boss ? 1e9 : 0) });
    }
    cand.sort((a, b) => a.d - b.d);
    for (let i = 0; i < cand.length && AURA.n < cap; i++) {
      const c = cand[i], z = c.z, L = c.L, sh = AURA.shadowed < shadows;
      luxPush(z.x, z.y, (L.r * uk + z.r * 2.5), L.c[0], L.c[1], L.c[2], L.k, sh, z.boss ? 1 : 0, null, z.boss ? 2.2 : 1.1);
      AURA.n++; if (sh) AURA.shadowed++;
    }
    // glowing blood on the ground
    if (typeof goreGlowLights === 'function' && AURA.perf > -2) {
      const B = AURA.gb || (AURA.gb = []); B.length = 0; goreGlowLights(B, 4);
      for (const l of B) luxPush(l.x, l.y, l.r * uk, l.c0, l.c1, l.c2, l.i, false, -1, null, 0.3);
    }
  } catch (e) { AURA.partOff.lights = performance.now() + 60000; auraHurt(e, 'lights'); return false; }
  return true;
}
// at night: eyes that catch the light, and the glowing ones' halos, over the lit picture (a = how dark it is)
function auraEmissive(a) {
  if (!auraOn()) return;
  const t0 = performance.now();
  try {
    const F = CORE.frame, t = G.time, k0 = Math.min(1, a * 1.25), soft = typeof tracerSoft === 'function' ? tracerSoft() : null;
    ctx.globalCompositeOperation = 'lighter'; AURA.eyes = 0;
    const maxEyes = AURA.perf <= -2 ? 30 : 140;
    for (const z of G.zs) {
      if (z.dead || z.fly || z.x < F.x0 - 30 || z.x > F.x1 + 30 || z.y < F.y0 - 30 || z.y > F.y1 + 30) continue;
      if (z.st && (z.st.under || z.st.down > 0)) continue;
      const L = auraPart('halo') && AURA.perf > -3 ? auraOf(z, t) : null;
      // the halo
      if (L && soft) { const r = z.r * 2.6; ctx.globalAlpha = Math.min(1, L.k * 0.55 * k0); ctx.drawImage(auraTint(soft, L.c), z.x - r, z.y - r, r * 2, r * 2); }
      // the eyes (a zombie's eyes are in front of its head, either side)
      if (AURA.eyes < maxEyes && auraPart('eyes') && z.m && z.m.S && z.m.A && z.m.A.key !== 'trickster') {
        const col = z.ec || (z.ec = z.m.A.key === 'blinker' ? '#b78bff' : z.m.A.key === 'berserker' ? '#ff2a2a' : z.m.S.eye || '#f4e9b0');
        const r = z.r, an = z.ang + Math.sin(t * 7 + (z.bob || 0)) * 0.06, ca = Math.cos(an), sa = Math.sin(an), fx = r * 0.49, fy = r * 0.16, er = Math.max(0.7, r * 0.075);
        ctx.globalAlpha = 0.85 * k0 * (z.illusion ? 0.5 : 1); ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(z.x + ca * fx - sa * fy, z.y + sa * fx + ca * fy, er, 0, TAU); ctx.arc(z.x + ca * fx + sa * fy, z.y + sa * fx - ca * fy, er, 0, TAU); ctx.fill();
        AURA.eyes++;
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  } catch (e) { AURA.partOff.halo = AURA.partOff.eyes = performance.now() + 60000; auraHurt(e, 'night'); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  const ms = performance.now() - t0; auraWatch(ms); coreCost('AURA', ms);
}
const auraT = new Map();
function auraTint(soft, c) {
  const key = c.join(','); let s = auraT.get(key); if (s) return s;
  s = document.createElement('canvas'); s.width = s.height = 64; const g = s.getContext('2d'); g.drawImage(soft, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgb(' + key + ')'; g.fillRect(0, 0, 64, 64);
  if (auraT.size < 48) auraT.set(key, s); return s;
}
function auraWatch(ms) {
  AURA.msAvg += (ms - AURA.msAvg) * 0.08;
  const now = performance.now(); if (now - AURA.msT < 1000) return; AURA.msT = now;
  const budget = 1000 / targetFps() * 0.03;
  if (AURA.msAvg > budget && PERF.fps && PERF.fps < targetFps() * 0.95) { if (AURA.perf > -3) { AURA.perf--; AURA.good = 0; } }
  else if (AURA.msAvg < budget * 0.4) { if (++AURA.good >= 6 && AURA.perf < 0 && coreRise('AURA')) { AURA.perf++; AURA.good = 0; } }
  else AURA.good = 0;
}
function auraCheck() { return !(AURA.perf <= 0 && AURA.perf >= -3) ? 'its detail went out of range' : !(AURA.n >= 0) ? 'its count of glowing zombies went bad' : ''; }
function auraNotes() { const off = Object.keys(AURA.partOff).filter(p => AURA.partOff[p] > performance.now()); return off.length ? 'resting: ' + off.join(', ') : ''; }
// a glowing zombie dies: its light goes out in a last flash (heard over the engine hub's message bus)
function auraDeath(z) {
  if (!z || !auraOn() || z.fly) return;
  const L = auraOf(z, G.time); if (!L || typeof luxFlash !== 'function') return;
  luxFlash(z.x, z.y, (L.r * 1.8 + z.r * 4) * (0.55 + 0.45 * SCL), L.c[0] + ',' + L.c[1] + ',' + L.c[2], Math.min(1.2, L.k + 0.5), 0.45, { shade: true });
  for (let i = 0; i < 8 && G.parts.length < Q.parts; i++) { const a = Math.random() * TAU, s = 60 + Math.random() * 120; G.parts.push({ x: z.x, y: z.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4, max: 0.4, c: 'rgb(' + L.c.join(',') + ')', s: 1.8, glow: true }); }
}
function auraRepair() { AURA.partOff = {}; AURA.errT.length = 0; AURA.offUntil = 0; auraT.clear(); }
function auraHurt(e, part) {
  const now = performance.now(); coreHurt('AURA', e); try { console.error(e); } catch (x) { }
  AURA.errT.push(now); while (AURA.errT.length && now - AURA.errT[0] > 10000) AURA.errT.shift();
  if (AURA.errT.length >= 5) { AURA.offUntil = now + 60000; AURA.errT.length = 0; coreRepaired('AURA', 'Zombie glow paused for a minute'); }
  else if (part) coreRepaired('AURA', 'Zombie glow: ' + part + ' switched off for a minute');
}
coreAdd({
  name: 'AURA', kind: 'render', ver: 1, needs: ['LUX', 'GORE'], provides: ['zombieLights', 'eyes'],
  does: 'Zombie glow engine: toxic, molten, void, abyssal, electric, radioactive, icy and spectral zombies, burning zombies, bombers and bosses become real light sources for the lighting engine, so their glow lights the street and walls and cars cast ray-traced shadows from them; glowing blood lights the ground; eyes glow at night.',
  state: () => auraOn() ? (AURA.n || AURA.eyes ? 'on' : 'idle') : 'off', level: () => AURA.n + ' glowing (' + AURA.shadowed + ' with shadows), ' + AURA.eyes + ' pairs of eyes' + (AURA.perf ? ', detail ' + AURA.perf : ''),
  check: auraCheck, notes: auraNotes, repair: auraRepair, isolate: () => { AURA.offUntil = performance.now() + 60000; }, restore: () => { AURA.offUntil = 0; },
  save: () => AURA.perf, load: v => { AURA.perf = clamp(v | 0, -2, 0); },
  on: { kill: d => auraDeath(d && d.z), quality: () => { AURA.perf = 0; AURA.good = 0; }, lowMemory: () => auraT.clear() }
});
coreMeta('AURA', { ver: 2, lv: () => AURA.perf + 3, adaptGet: () => AURA.perf, loadNow: () => AURA.n | 0, loadName: 'glowing zombies', zload: 0.08,
  reset: () => { auraRepair(); AURA.perf = 0; AURA.good = 0; } });
