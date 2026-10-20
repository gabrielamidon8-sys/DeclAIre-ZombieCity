/* ================= TRACER: the bullet engine =================
   Every round in flight is drawn the way it would look: a white-hot head, a tapered streak behind it as long as the
   camera's shutter would smear it (so at a low frame rate the streak still joins up), and a soft glow round it, all in
   the gun's own style. A pistol round is a short warm streak; a revolver's is thicker; an SMG's thin and quick; rifle
   rounds long and bright; the machine gun fires a bright tracer every third round with dimmer ones between; the sniper's
   round is a long blinding line that leaves a vapour trail hanging in the air (thicker in rain and fog) and heat
   shimmer behind it; shotgun pellets are a spray of short fine streaks; a grenade spins, blinks and trails smoke; the
   flamethrower's flames burn from white through orange to smoke, with shimmering heat.
   The gun's modification colours it and adds its own touch: incendiary rounds shed embers, cryo rounds leave frost
   glitter and a cold breath, toxic rounds drip, shock and thunderclap rounds crackle with little arcs, seekers and
   boomerangs draw their curve, vampiric rounds drip blood, golden ones sparkle, cursed ones trail dark smoke.
   Hot rounds bend the air (the shader engine's heat haze, on the GPU), light the street as they pass at night (the
   lighting engine casts their shadows), and hit things the way things get hit: concrete puffs dust and chips, metal
   sparks, water splashes. Teammates' rounds look the same. It measures its cost and drops trails, glows and lights when
   the frame runs late; a part that throws rests for a minute while the rest goes on. */
const TRACER = { ms: 0, msAvg: 0, msT: 0, perf: 0, good: 0, errT: [], offUntil: 0, partOff: {}, wakes: [], puffs: [], lights: 0, drawn: 0, soft: null };
// w width, len streak (seconds of travel), glow halo strength, heat shimmer, every (bright tracer every n rounds)
const TR_GUN = {
  pistol: { w: 1.6, len: 0.02, glow: 0.5, heat: 0.15 },
  revolver: { w: 2.4, len: 0.026, glow: 0.7, heat: 0.35 },
  smg: { w: 1.25, len: 0.016, glow: 0.38, heat: 0.08 },
  rifle: { w: 1.9, len: 0.03, glow: 0.6, heat: 0.25 },
  burst: { w: 1.8, len: 0.028, glow: 0.6, heat: 0.22 },
  lmg: { w: 2.0, len: 0.03, glow: 0.55, heat: 0.3, every: 3 },
  sniper: { w: 3.0, len: 0.046, glow: 1.0, heat: 0.9, wake: 1, light: 1 },
  shotgun: { w: 1.15, len: 0.012, glow: 0.3, heat: 0.05 },
  launcher: { w: 0, len: 0, glow: 0.5, heat: 0.3, grenade: 1 },
  flamer: { w: 0, len: 0, glow: 0.8, heat: 1, flame: 1 }
};
// the mod's touch: what it sheds along the way
const TR_MOD = {
  incendiary: 'embers', cryo: 'frost', toxic: 'drip', shock: 'arc', thunderclap: 'arc', seeker: 'curve', boomerang: 'curve',
  vampiric: 'blood', golden: 'sparkle', blessed: 'sparkle', cursed: 'dark', gravity: 'warp', volatile: 'embers', overclocked: 'hot', explosive: 'hot'
};
function tracerOn() { return !(TRACER.offUntil && performance.now() < TRACER.offUntil); }
function tracerPart(p) { const t = TRACER.partOff[p]; return !(t && performance.now() < t); }
function tracerTry(p, fn) { if (!tracerPart(p)) return; try { fn(); } catch (e) { TRACER.partOff[p] = performance.now() + 60000; tracerHurt(e, p); } }
const trRgb = new Map();
function tracerRgb(col) { let v = trRgb.get(col); if (v) return v; const n = parseInt(String(col || '#ffd678').slice(1, 7), 16); v = [n >> 16, (n >> 8) & 255, n & 255]; if (trRgb.size < 64) trRgb.set(col, v); return v; }
// a bullet leaves the gun: which style it flies in (the bright tracer rounds of a machine gun, a teammate's rounds)
function tracerTag(b, shotNo) {
  const P = TR_GUN[b.fk] || TR_GUN.pistol;
  b.tr = P && P.every ? ((shotNo == null ? (Math.random() * P.every) | 0 : shotNo) % P.every === 0) : true;
}
// every frame: remember where each round has been (for curved trails and heat), age the vapour trails and puffs
function tracerTick(dt) {
  if (!tracerOn()) return;
  tracerTry('tick', () => {
    const lowFx = TRACER.perf <= -2;
    for (const b of G.bullets) {
      if (b.dead || b.kind === 'flame') continue;
      if (b.cos) b.age = (b.age || 0) + dt;
      if (!lowFx) { const h = b.hist || (b.hist = []); h.push(b.x, b.y); if (h.length > 16) h.splice(0, 2); }
      const P = TR_GUN[b.fk] || TR_GUN.pistol;
      // the sniper's round leaves vapour hanging in the air
      if (P.wake && !lowFx && b.lx != null) { const W = TRACER.wakes; if (W.length < 40) W.push({ x0: b.lx, y0: b.ly, x1: b.x, y1: b.y, t: 0, life: 0.7 + (WX.fog || 0) * 0.8 + (WX.rain || 0) * 0.4 }); }
      // a grenade trails smoke
      if (P.grenade && !lowFx && Math.random() < 0.7) { const U = TRACER.puffs; if (U.length < 60) U.push({ x: b.x, y: b.y, r: 3 * PK, g: 9 * PK, t: 0, life: 0.6 + Math.random() * 0.4, a: 0.22, c: 0 }); }
      // mods shed things along the way
      const md = TR_MOD[b.mk];
      if (md && !lowFx && Math.random() < 0.35 && G.parts.length < Q.parts) {
        const sv = 30 + Math.random() * 40, a = Math.random() * TAU;
        if (md === 'embers') G.parts.push({ x: b.x, y: b.y, vx: Math.cos(a) * sv, vy: Math.sin(a) * sv, life: 0.25, max: 0.25, c: Math.random() < 0.5 ? '#ffb347' : '#ff6a2a', s: 1.6, glow: true });
        else if (md === 'frost') G.parts.push({ x: b.x, y: b.y, vx: Math.cos(a) * sv * 0.5, vy: Math.sin(a) * sv * 0.5, life: 0.4, max: 0.4, c: Math.random() < 0.5 ? '#e8f8ff' : '#bfe8ff', s: 1.5, glow: true });
        else if (md === 'drip') G.parts.push({ x: b.x, y: b.y, vx: 0, vy: 40, life: 0.3, max: 0.3, c: '#9be23a', s: 1.8 });
        else if (md === 'blood') G.parts.push({ x: b.x, y: b.y, vx: 0, vy: 30, life: 0.3, max: 0.3, c: '#7a0a14', s: 1.8 });
        else if (md === 'sparkle') G.parts.push({ x: b.x, y: b.y, vx: Math.cos(a) * sv * 0.4, vy: Math.sin(a) * sv * 0.4, life: 0.35, max: 0.35, c: '#fff2b0', s: 1.4, glow: true });
        else if (md === 'dark') { const U = TRACER.puffs; if (U.length < 60) U.push({ x: b.x, y: b.y, r: 2 * PK, g: 7 * PK, t: 0, life: 0.5, a: 0.3, c: 1 }); }
      }
      b.lx = b.x; b.ly = b.y;
    }
    for (const w of TRACER.wakes) w.t += dt;
    if (TRACER.wakes.length && TRACER.wakes[0].t > TRACER.wakes[0].life) TRACER.wakes = TRACER.wakes.filter(w => w.t < w.life);
    for (const u of TRACER.puffs) { u.t += dt; u.r += u.g * dt; }
    if (TRACER.puffs.length && TRACER.puffs[0].t > TRACER.puffs[0].life) TRACER.puffs = TRACER.puffs.filter(u => u.t < u.life);
  });
}
// a soft round sprite (white), for glows and flames
function tracerSoft() {
  if (TRACER.soft) return TRACER.soft;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); TRACER.soft = c; return c;
}
// one round's streak: glow, tapered body, white-hot head (k scales everything; glowOnly for the night pass)
function tracerStreak(b, P, rgb, k, glowOnly, dt) {
  const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp, bright = b.tr === false ? 0.55 : 1;
  // as long as a camera shutter would smear it, never back past the muzzle
  let L = Math.min(Math.max(P.len, dt * 0.85) * (b.tr === false ? 0.8 : 1) * (b.crit ? 1.25 : 1), b.age || 0) * sp;
  // a real round (the ballistics engine's) moves a screen in a frame or two: its streak is kept to what the eye sees
  if (b.bal) L = Math.min(L, (b.heavy ? 300 : b.fk === 'shotgun' ? 110 : 190) * SCL / SCALE_REAL * (b.age < 0.02 ? 0.7 : 1));
  if (L < 0.5) return;
  if (TRACER.perf <= -2) {
    // keeping up: one plain stroke per round
    ctx.strokeStyle = b.crit ? '#ffffff' : b.col; ctx.globalAlpha = k * (b.tr === false ? 0.6 : 1); ctx.lineWidth = P.w || 1.6; ctx.beginPath(); ctx.moveTo(b.x - ux * L, b.y - uy * L); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.globalAlpha = 1; return;
  }
  const tx = b.x - ux * L, ty = b.y - uy * L, w = (b.shard ? 1.2 : P.w) * (b.crit ? 1.3 : 1) * (b.tr === false ? 0.8 : 1);
  const core = b.crit ? '255,255,255' : Math.round(200 + rgb[0] * 0.22) + ',' + Math.round(190 + rgb[1] * 0.25) + ',' + Math.round(170 + rgb[2] * 0.3);
  const tint = rgb[0] + ',' + rgb[1] + ',' + rgb[2];
  // the glow round it (wider, soft)
  if (TRACER.perf > -3 && tracerPart('glow')) {
    const g = ctx.createLinearGradient(tx, ty, b.x, b.y); g.addColorStop(0, 'rgba(' + tint + ',0)'); g.addColorStop(1, 'rgba(' + tint + ',' + (P.glow * 0.45 * k * bright).toFixed(3) + ')');
    ctx.strokeStyle = g; ctx.lineWidth = w * 3.2; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  if (glowOnly) return;
  // the body: tapered from nothing at the tail to the head's colour
  const g2 = ctx.createLinearGradient(tx, ty, b.x, b.y); g2.addColorStop(0, 'rgba(' + tint + ',0)'); g2.addColorStop(0.6, 'rgba(' + tint + ',' + (0.75 * k * bright).toFixed(3) + ')'); g2.addColorStop(1, 'rgba(' + core + ',' + (0.95 * k).toFixed(3) + ')');
  ctx.strokeStyle = g2; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(b.x, b.y); ctx.stroke();
  // the white-hot head
  ctx.fillStyle = 'rgba(' + core + ',' + (0.9 * k).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(b.x, b.y, w * 0.62, 0, TAU); ctx.fill();
}
// the curve a seeker or a boomerang flew
function tracerCurve(b, rgb, k) {
  const h = b.hist; if (!h || h.length < 6) return;
  ctx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (0.35 * k).toFixed(3) + ')'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(h[0], h[1]);
  for (let i = 2; i < h.length; i += 2) ctx.lineTo(h[i], h[i + 1]); ctx.lineTo(b.x, b.y); ctx.stroke();
}
// little arcs crackling round a shock round
function tracerArc(b, k) {
  const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp;
  ctx.strokeStyle = 'rgba(255,243,140,' + (0.8 * k).toFixed(3) + ')'; ctx.lineWidth = 0.9; ctx.beginPath();
  let x = b.x, y = b.y; ctx.moveTo(x, y);
  for (let i = 0; i < 4; i++) { x -= ux * 4 * PK + (Math.random() - 0.5) * 7 * PK; y -= uy * 4 * PK + (Math.random() - 0.5) * 7 * PK; ctx.lineTo(x, y); }
  ctx.stroke();
}
function tracerFlame(b, k) {
  // a tongue of flame: white-yellow while young, orange, deep red, then smoke; flickering, growing
  const f = clamp(1 - b.life / b.max, 0, 1), soft = tracerSoft(), r = (4 + f * 14) * (0.9 + Math.random() * 0.2);
  if (f > 0.72) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.35 * (1 - f) * 3 * k; ctx.fillStyle = '#4a4440'; ctx.beginPath(); ctx.arc(b.x, b.y, r * 1.2, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'lighter'; return; }
  const col = f < 0.18 ? [255, 244, 200] : f < 0.45 ? [255, 170, 60] : [210, 70, 26];
  ctx.globalAlpha = Math.min(1, 0.75 * (1 - f) * k);
  ctx.drawImage(tracerTintSoft(col), b.x - r, b.y - r, r * 2, r * 2);
}
const trSoftT = new Map();
function tracerTintSoft(col) {
  const key = col.join(','); let c = trSoftT.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.drawImage(tracerSoft(), 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgb(' + key + ')'; g.fillRect(0, 0, 64, 64);
  trSoftT.set(key, c); return c;
}
function tracerGrenade(b, k) {
  const a = (b.age || 0) * 18;
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
  ctx.fillStyle = '#2a2d22'; ctx.beginPath(); ctx.ellipse(0, 0, 5.5 * Math.max(0.6, PK), 4 * Math.max(0.6, PK), 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#4a5038'; ctx.fillRect(-1.5, -4 * Math.max(0.6, PK), 3, 8 * Math.max(0.6, PK));
  ctx.restore();
  const blink = Math.floor(G.time * 14) % 2;
  ctx.fillStyle = blink ? '#ff4a3a' : '#5a1a14'; ctx.beginPath(); ctx.arc(b.x, b.y, 1.8, 0, TAU); ctx.fill();
}
// all rounds in flight (render() calls this where the bullets used to be drawn)
function tracerDraw(vis) {
  const t0 = performance.now(); TRACER.drawn = 0;
  try {
    const dt = Math.min(0.05, G.rdt || 0.016);
    ctx.lineCap = 'round';
    // smoke and vapour first, under the rounds
    tracerTry('trails', () => {
      if (TRACER.wakes.length) for (const w of TRACER.wakes) { const f = w.t / w.life; ctx.strokeStyle = 'rgba(230,236,240,' + (0.22 * (1 - f) * (0.6 + (WX.fog || 0) + (WX.rain || 0) * 0.5)).toFixed(3) + ')'; ctx.lineWidth = (1 + f * 4) * Math.max(0.6, PK); ctx.beginPath(); ctx.moveTo(w.x0, w.y0); ctx.lineTo(w.x1, w.y1); ctx.stroke(); }
      if (TRACER.puffs.length) { const soft = tracerSoft(); for (const u of TRACER.puffs) { if (!vis(u.x, u.y, u.r * 2)) continue; const f = u.t / u.life; ctx.globalAlpha = u.a * (1 - f); ctx.drawImage(u.c ? tracerTintSoft([40, 24, 48]) : tracerTintSoft([170, 170, 176]), u.x - u.r, u.y - u.r, u.r * 2, u.r * 2); } ctx.globalAlpha = 1; }
    });
    // flames
    ctx.globalCompositeOperation = 'lighter';
    tracerTry('flames', () => { for (const b of G.bullets) { if (b.kind !== 'flame' || b.dead || !vis(b.x, b.y, 30)) continue; tracerFlame(b, 1); } });
    ctx.globalAlpha = 1;
    // the rounds
    tracerTry('rounds', () => {
      for (const b of G.bullets) {
        if (b.dead || b.kind === 'flame' || !vis(b.x, b.y, 80)) continue;
        if (b.kind === 'grenade') { ctx.globalCompositeOperation = 'source-over'; tracerGrenade(b, 1); ctx.globalCompositeOperation = 'lighter'; continue; }
        const P = TR_GUN[b.fk] || TR_GUN.pistol, rgb = tracerRgb(b.col), md = TR_MOD[b.mk];
        if (md === 'curve' && TRACER.perf > -2) tracerCurve(b, rgb, 1);
        tracerStreak(b, P, rgb, 1, false, dt);
        if (md === 'arc' && Math.random() < 0.6) tracerArc(b, 1);
        TRACER.drawn++;
      }
    });
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  } catch (e) { tracerHurt(e, 'draw'); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  const ms = performance.now() - t0; TRACER.ms = ms; tracerWatch(ms); coreCost('TRACER', ms);
}
// at night: the rounds glow again over the lit picture, the brightest light the street as they pass, and hot rounds
// bend the air (a = how dark it is)
function tracerEmissive(a) {
  if (!tracerOn()) return false;
  const t0 = performance.now();
  tracerTry('night', () => {
    const dt = Math.min(0.05, G.rdt || 0.016), F = CORE.frame, k = Math.min(1, a * 1.15) * Math.max(0.35, bloomK());
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    let lights = 0; const lightMax = TRACER.perf <= -1 ? 0 : [0, 1, 2, 3, 4][LUX.level || 0];
    const sc = [0, 0];
    for (const b of G.bullets) {
      if (b.dead || b.x < F.x0 - 60 || b.x > F.x1 + 60 || b.y < F.y0 - 60 || b.y > F.y1 + 60) continue;
      if (b.kind === 'flame') { tracerFlame(b, k * 0.8); continue; }
      if (b.kind === 'grenade') { ctx.globalAlpha = k * (Math.floor(G.time * 14) % 2 ? 1 : 0.2); ctx.fillStyle = '#ff4a3a'; ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; continue; }
      const P = TR_GUN[b.fk] || TR_GUN.pistol, rgb = tracerRgb(b.col);
      tracerStreak(b, P, rgb, k, false, dt);
      // the brightest rounds light the street (and cast shadows) as they pass
      if (lights < lightMax && (P.light || (P.every && b.tr)) && typeof luxFlash === 'function') { luxFlash(b.x, b.y, (P.light ? 150 : 90) * (0.55 + 0.45 * SCL), rgb[0] + ',' + rgb[1] + ',' + rgb[2], P.light ? 0.7 : 0.4, 0.04, { shade: lights === 0 }); lights++; }
    }
    // hot rounds bend the air: hand the shader engine a few hot spots along the sniper's path
    if (F.hot && TRACER.perf > -2 && typeof coreToScreen === 'function') {
      for (const w of TRACER.wakes) { if (F.hot.length >= 8) break; if (w.t > 0.3) continue; coreToScreen((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2, sc); F.hot.push({ sx: sc[0], sy: sc[1], r: 18 * F.zoom * F.dpr, k: 0.5 * (1 - w.t / 0.3) }); }
    }
    TRACER.lights = lights;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  });
  coreCost('TRACER', performance.now() - t0);
  return true;
}
// a round hits something solid
function tracerImpact(b, r) {
  if (!tracerOn() || !tracerPart('impact')) return;
  try {
    const sp = Math.hypot(b.vx, b.vy) || 1, a = Math.atan2(-b.vy, -b.vx);
    if (r && (r.k === 'car' || r.k === 'wreck')) {
      // metal: bright sparks bouncing off
      for (let i = 0; i < 4; i++) { if (G.parts.length >= Q.parts) break; const aa = a + (Math.random() - 0.5) * 1.6, s = 120 + Math.random() * 220; G.parts.push({ x: b.x, y: b.y, vx: Math.cos(aa) * s, vy: Math.sin(aa) * s, life: 0.1 + Math.random() * 0.15, max: 0.25, c: Math.random() < 0.5 ? '#fff1b8' : '#ffd27a', s: 1.3, glow: true }); }
    } else {
      // concrete, brick, wood: a puff of dust and a few chips
      for (let i = 0; i < 3; i++) { if (G.parts.length >= Q.parts) break; const aa = a + (Math.random() - 0.5) * 1.4, s = 30 + Math.random() * 60; G.parts.push({ x: b.x, y: b.y, vx: Math.cos(aa) * s, vy: Math.sin(aa) * s, life: 0.35 + Math.random() * 0.3, max: 0.65, c: i ? 'rgba(170,164,150,0.55)' : '#8a8478', s: i ? 4 : 1.6 }); }
    }
  } catch (e) { TRACER.partOff.impact = performance.now() + 60000; tracerHurt(e, 'impact'); }
}
function tracerWatch(ms) {
  TRACER.msAvg += (ms - TRACER.msAvg) * 0.08;
  const now = performance.now(); if (now - TRACER.msT < 1000) return; TRACER.msT = now;
  const budget = 1000 / targetFps() * 0.05;
  if (TRACER.msAvg > budget && PERF.fps && PERF.fps < targetFps() * 0.95) { if (TRACER.perf > -3) { TRACER.perf--; TRACER.good = 0; } }
  else if (TRACER.msAvg < budget * 0.4) { if (++TRACER.good >= 6 && TRACER.perf < 0) { TRACER.perf++; TRACER.good = 0; } }
  else TRACER.good = 0;
}
function tracerCheck() {
  if (TRACER.wakes.length > 200 || TRACER.puffs.length > 200) return 'trails piling up';
  return '';
}
function tracerNotes() { const off = Object.keys(TRACER.partOff).filter(p => TRACER.partOff[p] > performance.now()); return off.length ? 'resting: ' + off.join(', ') : ''; }
// a repair puts back any gun style that went bad (from the copy kept at start) and clears the trails; a part that was
// switched off rests out its minute, so a fault that comes straight back cannot thrash on and off
const TR_GUN0 = JSON.parse(JSON.stringify(TR_GUN));
function tracerRepair() {
  for (const k in TR_GUN0) { const P = TR_GUN[k]; if (!P || typeof P !== 'object' || !(P.len >= 0) || !(P.w > 0)) TR_GUN[k] = Object.assign({}, TR_GUN0[k]); }
  TRACER.errT.length = 0; TRACER.offUntil = 0; TRACER.wakes.length = 0; TRACER.puffs.length = 0; TRACER.soft = null; trSoftT.clear(); }
function tracerReset() { TRACER.wakes.length = 0; TRACER.puffs.length = 0; }
function tracerHurt(e, part) {
  const now = performance.now(); coreHurt('TRACER', e); try { console.error(e); } catch (x) { }
  TRACER.errT.push(now); while (TRACER.errT.length && now - TRACER.errT[0] > 10000) TRACER.errT.shift();
  if (TRACER.errT.length >= 6) { TRACER.offUntil = now + 60000; TRACER.errT.length = 0; coreRepaired('TRACER', 'Tracers paused for a minute (plain tracers meanwhile)'); }
  else if (part) coreRepaired('TRACER', 'Tracers: ' + part + ' switched off for a minute');
}
coreAdd({
  name: 'TRACER', kind: 'render', ver: 1, needs: ['LUX', 'PRISM'], provides: ['tracers', 'heatHaze'],
  does: 'Bullet engine: every round drawn with a white-hot head, a motion-blurred streak and a glow in its gun\'s style (machine gun tracer rounds, the sniper\'s vapour trail and heat shimmer, shotgun pellet sprays, spinning grenades with smoke, living flames), coloured and dressed by its mod (embers, frost, arcs, curves, sparkles, dark smoke), lighting the street at night and hitting dust from concrete and sparks from metal.',
  state: () => tracerOn() ? (TRACER.drawn ? 'on' : 'idle') : 'paused', level: () => TRACER.drawn + ' rounds in flight' + (TRACER.perf ? ', detail ' + TRACER.perf : '') + (TRACER.lights ? ', ' + TRACER.lights + ' lit' : ''),
  check: tracerCheck, notes: tracerNotes, repair: tracerRepair, isolate: () => { TRACER.offUntil = performance.now() + 60000; }, restore: () => { TRACER.offUntil = 0; },
  save: () => TRACER.perf, load: v => { TRACER.perf = clamp(v | 0, -2, 0); },
  on: { run: () => tracerReset(), quality: () => { TRACER.perf = 0; TRACER.good = 0; }, lowMemory: () => { trSoftT.clear(); TRACER.soft = null; } }
});
