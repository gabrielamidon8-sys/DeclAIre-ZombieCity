/* ================= GORE: the blood engine =================
   Every bullet that lands throws an exit spray behind the zombie, droplets flying in the bullet's direction; every kill
   leaves a pool that spreads out over the first second, with fingers and satellite drops flung the way the body fell.
   Wounded zombies drip as they walk and carry their wounds on their bodies. Fresh blood is glossy (it shines, and the
   reflection engine mirrors the lamps in it), darkens and dries to brown over the next twenty seconds, and is then
   painted into the street itself (the block's own picture), so a long fight leaves the street stained without costing
   a thing per frame. Rain thins it out and spreads it; on snow it shows bright red; in rivers and ponds it clouds the
   water and drifts apart instead of staining. Explosions leave scorch marks the same way. Survivors who walk through
   a fresh pool leave red footprints for a few steps.
   The shapes are drawn once (a few variants of each kind), coloured per strain and kept in a small cache. */
const GORE = { spr: new Map(), cg: null, rgbs: new Map(), n: 0, baked: 0, made: 0, ms: 0, adapt: 0, errT: [], offUntil: 0, budget: 0, fx: 0 };
const GORE_S = 96, GORE_H = 2;                 // sprite size in pixels; the sprite covers +-2 radii round the centre
const GORE_FRESH = 14, GORE_FADE = 4;          // seconds glossy, seconds turning dry; then painted into the street
const GORE_V = { pool: 6, spray: 6, drop: 4, scorch: 4 };
const GORE_A = { pool: 0.8, spray: 0.78, drop: 0.8, scorch: 0.62 };
function goreLevel() {
  if (GORE.offUntil && performance.now() < GORE.offUntil) return 0;
  const d = SET.decals === 'low' ? 1 : SET.decals === 'high' ? 3 : 2;
  return clamp(d + GORE.adapt, 0, 3);
}
// any CSS colour as numbers [r, g, b, a] (the browser reads it; cached)
function goreParse(col) {
  let v = GORE.rgbs.get(col); if (v) return v;
  const g = GORE.cg || (GORE.cg = document.createElement('canvas').getContext('2d'));
  v = [90, 10, 10, 1];
  if (g) {
    g.fillStyle = '#5a0a0a'; g.fillStyle = col; const s = String(g.fillStyle);
    if (s[0] === '#') { const n = parseInt(s.slice(1, 7), 16); v = [n >> 16, (n >> 8) & 255, n & 255, 1]; }
    else { const m = s.match(/[\d.]+/g); if (m && m.length >= 3) v = [+m[0], +m[1], +m[2], m.length >= 4 ? +m[3] : 1]; }
  }
  if (GORE.rgbs.size < 256) GORE.rgbs.set(col, v); return v;
}
// a strain's blood colour: dark, old blood (deep red-brown) tinted with the strain's own hue, never pale; quantized so
// the cache stays small
function goreRgb(col) {
  const key = '~' + col; let v = GORE.rgbs.get(key); if (v) return v;
  const p = goreParse(col), q = x => Math.max(0, Math.min(255, Math.round(x / 8) * 8));
  let r = p[0] * 0.4 + 104 * 0.6, g = p[1] * 0.4 + 8 * 0.6, b = p[2] * 0.4 + 10 * 0.6;
  const L = 0.3 * r + 0.59 * g + 0.11 * b; if (L > 46) { const k = 46 / L; r *= k; g *= k; b *= k; }
  v = [q(r), q(g), q(b)];
  if (GORE.rgbs.size < 256) GORE.rgbs.set(key, v); return v;
}
// the shape of a stain, white, into a sprite (unit = one radius)
function goreShape(g, k, v) {
  const R = Z.mulberry32(0x9e3779b1 ^ (v * 7919) ^ (k.charCodeAt(0) << 16)), u = GORE_S / (2 * GORE_H), cx = GORE_S / 2;
  g.setTransform(u, 0, 0, u, cx, cx); g.fillStyle = '#fff';
  const dot = (x, y, rx, ry, a) => { g.beginPath(); g.ellipse(x, y, Math.max(0.012, rx), Math.max(0.012, ry), a || 0, 0, TAU); g.fill(); };
  if (k === 'pool') {
    const n = 6 + Math.floor(R() * 4);
    for (let i = 0; i < n; i++) { const a = R() * TAU, d = R() * 0.42, rr = 0.36 + R() * 0.34; dot(Math.cos(a) * d, Math.sin(a) * d, rr, rr * (0.85 + R() * 0.15), a); }
    const f = 2 + Math.floor(R() * 3);
    for (let i = 0; i < f; i++) { const a = (R() - 0.5) * 1.5, len = 0.9 + R() * 0.55, w = 0.1 + R() * 0.12; dot(Math.cos(a) * len * 0.62, Math.sin(a) * len * 0.62, len * 0.5, w, a); }
    const m = 8 + Math.floor(R() * 10);
    for (let i = 0; i < m; i++) { const a = (R() - 0.5) * 1.9, d = 1.15 + R() * 0.62, s = (0.035 + R() * 0.09) * (1.35 - d * 0.4), e = 1 + d * 0.7; dot(Math.cos(a) * d, Math.sin(a) * d, s * e, s, a); }
  } else if (k === 'spray') {
    dot(0.15, 0, 0.26, 0.2, 0);
    const n = 10 + Math.floor(R() * 10);
    for (let i = 0; i < n; i++) { const a = (R() - 0.5) * 1.05, d = 0.25 + R() * 1.5, s = (0.05 + R() * 0.09) * (1.05 - d / 2.2), e = 1.4 + d * 1.1; dot(Math.cos(a) * d, Math.sin(a) * d, s * e, s, a); }
    for (let i = 0; i < 34; i++) { const a = (R() - 0.5) * 1.4, d = 0.3 + R() * 1.55, s = 0.014 + R() * 0.022; dot(Math.cos(a) * d, Math.sin(a) * d, s, s, 0); }
  } else if (k === 'drop') {
    dot(0, 0, 0.5, 0.44 + R() * 0.06, R() * 3);
    const n = 3 + Math.floor(R() * 5);
    for (let i = 0; i < n; i++) { const a = R() * TAU, d = 0.68 + R() * 0.38, s = 0.05 + R() * 0.06; dot(Math.cos(a) * d, Math.sin(a) * d, s * 1.4, s, a); }
  } else {
    // scorch: soot thickest in the middle, streaks flung outward, ragged at the edge
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1.05); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1.05, 0, TAU); g.fill();
    const n = 14 + Math.floor(R() * 8);
    for (let i = 0; i < n; i++) {
      const a = R() * TAU, len = 1.1 + R() * 0.75, w = 0.05 + R() * 0.08;
      const lg = g.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len); lg.addColorStop(0, 'rgba(255,255,255,0.55)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = lg; g.beginPath(); g.moveTo(Math.cos(a + w) * 0.4, Math.sin(a + w) * 0.4); g.lineTo(Math.cos(a) * len, Math.sin(a) * len); g.lineTo(Math.cos(a - w) * 0.4, Math.sin(a - w) * 0.4); g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 18; i++) { const a = R() * TAU, d = 0.9 + R() * 0.8, s = 0.02 + R() * 0.05; dot(Math.cos(a) * d, Math.sin(a) * d, s, s, 0); }
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
}
// a stain's sprite in its colour, fresh or dry (cached; least recently used goes first)
function goreSprite(k, v, rgb, dry) {
  const key = k + v + ':' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + (dry ? 'd' : 'f');
  let c = GORE.spr.get(key); if (c) { GORE.spr.delete(key); GORE.spr.set(key, c); return c; }
  c = document.createElement('canvas'); c.width = c.height = GORE_S; const g = c.getContext('2d'); if (!g) return null;
  goreShape(g, k, v);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')'; g.fillRect(0, 0, GORE_S, GORE_S);
  const u = GORE_S / (2 * GORE_H), cx = GORE_S / 2;
  if (k !== 'scorch') {
    // depth: a faint sheen in the middle, darker where it thins and dries at the rim, a few clots
    g.globalCompositeOperation = 'source-atop';
    const gr = g.createRadialGradient(cx - u * 0.15, cx - u * 0.15, 0, cx, cx, u * 1.15); gr.addColorStop(0, 'rgba(255,255,255,' + (dry ? 0.02 : 0.1) + ')'); gr.addColorStop(0.6, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.38)');
    g.fillStyle = gr; g.fillRect(0, 0, GORE_S, GORE_S);
    if (k === 'pool') { const R = Z.mulberry32(v * 131 + 7); g.fillStyle = 'rgba(0,0,0,0.22)'; for (let i = 0; i < 5; i++) { const a = R() * TAU, d = R() * 0.5 * u; g.beginPath(); g.arc(cx + Math.cos(a) * d, cx + Math.sin(a) * d, (0.05 + R() * 0.09) * u, 0, TAU); g.fill(); } }
    if (dry) { g.fillStyle = 'rgba(34,14,8,0.5)'; g.fillRect(0, 0, GORE_S, GORE_S); }
  }
  g.globalCompositeOperation = 'source-over';
  GORE.spr.set(key, c); GORE.made++;
  const cap = PERF.tier >= 2 ? 72 : 40; while (GORE.spr.size > cap) GORE.spr.delete(GORE.spr.keys().next().value);
  return c;
}
// draw one stain with the transform T (world -> canvas) already chosen: rotated to its direction, scaled by its size
function goreBlit(g, T, s, spr, alpha, scale) {
  const r = s.r * scale * GORE_H, co = Math.cos(s.a), si = Math.sin(s.a);
  g.setTransform(T.a * co + T.c * si, T.b * co + T.d * si, T.c * co - T.a * si, T.d * co - T.b * si, T.a * s.x + T.c * s.y + T.e, T.b * s.x + T.d * s.y + T.f);
  g.globalAlpha = alpha; g.drawImage(spr, -r, -r, r * 2, r * 2);
}
function goreGrow(s, t) { if (s.k !== 'pool') return 1; const p = Math.min(1, t / 0.9); return 0.35 + 0.65 * (1 - (1 - p) * (1 - p)) * (1 + 0.35 * (s.dil || 0)); }

/* ---------- making stains ---------- */
function goreAdd(s) {
  const lvl = goreLevel(); if (!lvl || G.mode === 'intro') return null;
  if (GORE.budget-- <= 0 && s.k !== 'pool') return null;   // a frame makes only so many small stains
  s.t0 = G.time; s.v = s.v == null ? (Math.random() * (GORE_V[s.k] || 1)) | 0 : s.v;
  if (s.a == null) s.a = Math.random() * TAU;
  // in water the blood clouds and drifts apart instead of staining
  const wet = typeof waterAt === 'function' && isWater(waterAt(s.x, s.y));
  if (wet && s.k === 'scorch') return null;   // nothing scorches the water
  if (wet) { s.k = 'cloud'; s.r *= 1.2; }
  else if (s.k !== 'scorch') {
    const sf = surfaceAt(s.x, s.y);
    if (sf === 'snow') s.rgb = [Math.min(255, s.rgb[0] * 1.5 + 30), s.rgb[1] * 0.8, s.rgb[2] * 0.8].map(Math.round);   // vivid on snow
    s.dil = clamp((WX.wet || 0) * 1.1 - 0.2, 0, 1);                                                                    // thinned by rain
  }
  const L = G.splats; L.push(s); GORE.n++;
  const cap = Math.round(Q.splats * (lvl === 1 ? 0.6 : lvl === 3 ? 1.3 : 1));
  let k = 0; while (L.length > cap && k++ < 8) goreBake(L.shift());
  return s;
}
// the old interface: explosions, dust, a boss's tread marks
function goreScorch(x, y, r, col) { const p = goreParse(col); return goreAdd({ k: 'scorch', x: x, y: y, r: r * 1.1, rgb: [p[0] & 248, p[1] & 248, p[2] & 248], al: Math.min(1, p[3] * 0.95) }); }
// how much room there is ahead of a spray before a wall stops it
function goreRoom(x, y, a, len) {
  const dx = Math.cos(a), dy = Math.sin(a);
  for (let i = 1; i <= 5; i++) { const d = len * i / 5; if (pointInRect(x + dx * d, y + dy * d)) return Math.max(0.25, (i - 1) / 5); }
  return 1;
}
// a bullet lands: the exit spray behind the zombie, a wound where it went in, a fine mist
function goreHit(z, vx, vy, dmg) {
  if (!z || z.dead || z.fly || z.illusion) return;
  const a = Math.atan2(vy, vx); z.hitA = a;
  const lvl = goreLevel(); if (!lvl) return;
  // the wound, on the side the shot came from (in the body's own turning frame)
  if (z.m && Q.lod < 3) {
    const w = z.wnd || (z.wnd = []), wa = a + Math.PI - z.ang + (Math.random() - 0.5) * 0.9;
    if (w.length < (lvl >= 2 ? 4 : 2)) w.push([wa, 0.35 + Math.random() * 0.35, 0.13 + Math.random() * 0.08]);
    else { const q = w[(Math.random() * w.length) | 0]; q[2] = Math.min(0.32, q[2] + 0.03); }
  }
  if (lvl < 2 && Math.random() < 0.6) return;
  const now = G.time; if (z.sprT && now - z.sprT < 0.11) return; z.sprT = now;
  const rgb = goreRgb(z.m.S.gore), big = clamp(dmg / 30, 0.4, 1.4);
  const sx = z.x + Math.cos(a) * z.r * 0.6, sy = z.y + Math.sin(a) * z.r * 0.6, len = z.r * (1.15 + big * 0.8);
  const room = goreRoom(sx, sy, a, len * 1.8);
  goreAdd({ k: 'spray', x: sx, y: sy, r: len * room, a: a, rgb: rgb });
}
// a kill: the pool where the body fell, flung the way it was hit, and drops thrown through the air
function goreKill(z) {
  if (!z || z.fly || z.illusion) return;
  const lvl = goreLevel(); if (!lvl) return;
  const rgb = goreRgb(z.m.S.gore), a = z.hitA != null ? z.hitA : Math.random() * TAU, n = z.boss ? 3 : 1;
  for (let i = 0; i < n; i++) {
    const off = i ? z.r * 0.6 : 0, oa = Math.random() * TAU;
    goreAdd({ k: 'pool', x: z.x + Math.cos(oa) * off, y: z.y + Math.sin(oa) * off, r: z.r * (1.05 + Math.random() * 0.5) * (z.boss ? 1.3 : 1), a: a + (Math.random() - 0.5) * 0.6, rgb: rgb });
  }
  if (lvl >= 2 && Q.burst > 0.5) {
    const css = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')', m = Math.round((z.boss ? 14 : 5) * Q.burst);
    for (let i = 0; i < m; i++) {
      if (G.parts.length >= Q.parts) break;
      const aa = a + (Math.random() - 0.5) * 1.3, sp = 90 + Math.random() * 220;
      G.parts.push({ x: z.x, y: z.y, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, life: 0.18 + Math.random() * 0.3, max: 0.5, c: css, s: 2 + Math.random() * 2.2, bl: rgb });
    }
  }
}
// a drop thrown by a kill lands
function goreLand(q) { if (q.bl && goreLevel() >= 2) goreAdd({ k: 'drop', x: q.x, y: q.y, r: q.s * 0.55, rgb: q.bl }); }

/* ---------- every frame ---------- */
function goreTick(dt) {
  GORE.budget = [0, 6, 12, 18][goreLevel()];
  if (GORE.budget <= 0 || G.mode !== 'play') return;
  // wounded zombies drip as they walk (only the ones in view, a few a frame)
  let n = 0; const cap = GORE.budget >> 1;
  for (const z of G.zs) {
    if (z.dead || z.fly || z.illusion || z.boss || z.hp > z.maxHp * 0.55) continue;
    z.dripT = (z.dripT == null ? Math.random() : z.dripT) - dt;
    if (z.dripT > 0) continue;
    z.dripT = 0.3 + Math.random() * 0.9 * (z.hp / z.maxHp + 0.3);
    if (!visNearCam(z.x, z.y, 40)) continue;
    const a = Math.random() * TAU, d = Math.random() * z.r * 0.6;
    goreAdd({ k: 'drop', x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d, r: (1 + Math.random() * 1.4) * PK, rgb: goreRgb(z.m.S.gore) });
    if (++n >= cap) break;
  }
}
// the stains in view (render() calls this in the ground pass, before anything stands on it)
function goreDraw(vis) {
  const t0 = performance.now();
  try {
    const L = G.splats; if (!L.length) return;
    const T = ctx.getTransform(), now = G.time; let bakes = 0, drop = 0;
    for (let i = 0; i < L.length; i++) {
      const s = L[i], t = now - s.t0;
      if (s.k === 'cloud') { if (t > 7) { drop++; s.gone = true; continue; } goreCloud(s, t, T); continue; }
      const life = s.k === 'scorch' ? 10 : GORE_FRESH + GORE_FADE;
      if (t > life && bakes < 4) { bakes++; goreBake(s); s.gone = true; drop++; continue; }
      const R = s.r * GORE_H * 1.4; if (!vis(s.x, s.y, R)) continue;
      const base = (s.al || GORE_A[s.k] || 0.8) * (1 - 0.28 * (s.dil || 0)), gr = goreGrow(s, t);
      if (s.k === 'scorch') { const sp = goreSprite('scorch', s.v, s.rgb, false); if (sp) goreBlit(ctx, T, s, sp, base, 1); continue; }
      const f = clamp((t - GORE_FRESH) / GORE_FADE, 0, 1);
      if (f < 1) { const sp = goreSprite(s.k, s.v, s.rgb, false); if (sp) goreBlit(ctx, T, s, sp, base * (1 - f * 0.15), gr); }
      if (f > 0) { const sp = goreSprite(s.k, s.v, s.rgb, true); if (sp) goreBlit(ctx, T, s, sp, base * 0.82 * f, gr); }
      // fresh blood is glossy: a small soft highlight (by day; at night the reflection engine mirrors the lamps in it)
      if (s.k === 'pool' && t < GORE_FRESH && (CORE.frame.day == null || CORE.frame.day > 0.4)) {
        const k = (1 - t / GORE_FRESH) * 0.14 * (CORE.frame.day == null ? 1 : CORE.frame.day);
        ctx.setTransform(T); ctx.globalAlpha = k; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(s.x - s.r * gr * 0.22, s.y - s.r * gr * 0.26, s.r * gr * 0.3, s.r * gr * 0.12, -0.6, 0, TAU); ctx.fill();
      }
    }
    if (drop) G.splats = L.filter(s => !s.gone);
    ctx.setTransform(T); ctx.globalAlpha = 1;
  } catch (e) { goreHurt(e); ctx.globalAlpha = 1; }
  const ms = performance.now() - t0; GORE.ms = GORE.ms * 0.9 + ms * 0.1; coreCost('GORE', ms);
}
// blood in water: a soft cloud that widens and fades
function goreCloud(s, t, T) {
  const k = t / 7, r = s.r * (1 + 2.2 * Math.sqrt(k)), a = 0.42 * (1 - k) * (1 - k);
  if (a < 0.01) return;
  ctx.setTransform(T);
  const x = s.x + Math.cos(s.a) * t * 3 * PK, y = s.y + Math.sin(s.a) * t * 3 * PK;
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(' + s.rgb[0] + ',' + s.rgb[1] + ',' + s.rgb[2] + ',' + a.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + s.rgb[0] + ',' + s.rgb[1] + ',' + s.rgb[2] + ',0)');
  ctx.globalAlpha = 1; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
// a dried stain goes into the street: into the picture of every block it touches (and its list, for when the
// block is painted again)
function goreBake(s) {
  if (!s || s.k === 'cloud') return;
  const R = s.r * GORE_H * (s.k === 'pool' ? 1 + 0.35 * (s.dil || 0) : 1);
  for (let cx = Math.floor((s.x - R) / CHS); cx <= Math.floor((s.x + R) / CHS); cx++) for (let cy = Math.floor((s.y - R) / CHS); cy <= Math.floor((s.y + R) / CHS); cy++) {
    const c = chunks.get(cx + ',' + cy); if (!c) continue;
    const list = c.gore || (c.gore = []); list.push(s); if (list.length > [0, 40, 90, 150][goreLevel()] + 10) list.shift();
    if (!c.can) continue;
    const g = c.can.getContext('2d'); if (!g) continue;
    const k = c.can.width / CHS;
    try { g.save(); goreStamp(g, { a: k, b: 0, c: 0, d: k, e: -c.sx * k, f: -c.sy * k }, s); g.restore(); GORE.baked++; } catch (e) { goreHurt(e); }
  }
}
function goreStamp(g, T, s) {
  const dry = s.k !== 'scorch', sp = goreSprite(s.k, s.v, s.rgb, dry); if (!sp) return;
  goreBlit(g, T, s, sp, (s.al || GORE_A[s.k] || 0.8) * (1 - 0.28 * (s.dil || 0)) * (dry ? 0.82 : 1), goreGrow(s, 99));
}
// the block is being painted again (renderChunk): its dried stains go back in. g draws in the block's art units.
function goreRebake(g, c) {
  if (!c.gore || !c.gore.length) return;
  g.save(); if (c.k !== 1) g.scale(1 / c.k, 1 / c.k);
  const T = g.getTransform();
  try { for (const s of c.gore) goreStamp(g, T, s); } catch (e) { goreHurt(e); }
  g.restore();
}
// what the reflection engine needs: where the blood is still wet (alpha = how glossy)
function goreMirror(a, vis) {
  let any = false, T = null; const now = G.time;
  for (const s of G.splats) {
    if (s.k !== 'pool' && s.k !== 'drop') continue;
    const t = now - s.t0; if (t > GORE_FRESH) continue;
    const gr = goreGrow(s, t); if (!vis(s.x, s.y, s.r * gr * GORE_H)) continue;
    // the stain's own shape is the mask (its alpha is all the map reads)
    const sp = goreSprite(s.k, s.v, s.rgb, false); if (!sp) continue;
    if (!T) T = a.getTransform();
    goreBlit(a, T, s, sp, 0.25 * (1 - t / GORE_FRESH), gr); any = true;
  }
  if (T) a.setTransform(T);
  a.globalAlpha = 1; return any;
}
// a fresh pool under this spot? (for red footprints) -> its colour
function goreUnder(x, y) {
  const now = G.time;
  for (let i = G.splats.length - 1; i >= 0; i--) {
    const s = G.splats[i]; if (s.k !== 'pool' || now - s.t0 > GORE_FRESH + GORE_FADE) continue;
    const r = s.r * goreGrow(s, now - s.t0) * 0.8; if ((x - s.x) * (x - s.x) + (y - s.y) * (y - s.y) < r * r) return s.rgb;
  }
  return null;
}
// the wounds a zombie carries, drawn in its own turning frame right after its sprite (r = its radius)
function goreWounds(g, z, r) {
  const w = z.wnd; if (!w || !w.length) return;
  const rgb = goreRgb(z.m.S.gore), dk = z.wcs || (z.wcs = 'rgb(' + (rgb[0] * 0.55 | 0) + ',' + (rgb[1] * 0.5 | 0) + ',' + (rgb[2] * 0.5 | 0) + ')'), md = z.wcm || (z.wcm = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')');
  const a0 = g.globalAlpha;
  for (const q of w) {
    const x = Math.cos(q[0]) * q[1] * r, y = Math.sin(q[0]) * q[1] * r, s = q[2] * r;
    g.globalAlpha = a0 * 0.85; g.fillStyle = md; g.beginPath(); g.ellipse(x, y, s * 1.25, s, q[0], 0, TAU); g.fill();
    g.globalAlpha = a0; g.fillStyle = dk; g.beginPath(); g.arc(x, y, s * 0.55, 0, TAU); g.fill();
    // a run of blood from the wound, and spatter round it
    g.globalAlpha = a0 * 0.7; g.fillStyle = md; g.beginPath(); g.ellipse(x - s * 0.9, y + s * 0.2, s * 0.9, s * 0.28, 0.2, 0, TAU); g.fill();
    g.beginPath(); g.arc(x + s * 1.3, y - s * 0.6, s * 0.22, 0, TAU); g.arc(x + s * 0.4, y + s * 1.3, s * 0.18, 0, TAU); g.fill();
  }
  g.globalAlpha = a0;
}
function goreHurt(e) {
  const now = performance.now(); coreHurt('GORE', e); try { console.error(e); } catch (x) { }
  GORE.errT.push(now); while (GORE.errT.length && now - GORE.errT[0] > 10000) GORE.errT.shift();
  if (GORE.errT.length >= 5) { GORE.offUntil = now + 60000; GORE.errT.length = 0; GORE.spr.clear(); coreRepaired('GORE', 'Blood paused for a minute after errors'); }
  else if (GORE.errT.length >= 3 && GORE.adapt > -2) { GORE.adapt--; GORE.spr.clear(); coreRepaired('GORE', 'Blood stepped down a level'); }
}
coreAdd({
  name: 'GORE', kind: 'render', does: 'Blood engine: exit sprays in the direction of every shot, pools that spread where zombies fall, drips from the wounded, wounds on the bodies, glossy fresh blood that dries and stains the street, thinned by rain, bright on snow, clouding the water, bloody footprints, scorch marks.',
  state: () => goreLevel() ? (G.splats.length ? 'on' : 'idle') : 'off', level: () => ['off', 'few', 'normal', 'lots'][goreLevel()] + ', ' + G.splats.length + ' fresh, ' + GORE.baked + ' dried in',
  canTrim: () => goreLevel() > 1, trim: () => { if (GORE.adapt <= -2) return false; GORE.adapt--; return true; }, boost: () => { if (GORE.adapt >= 0) return false; GORE.adapt++; return true; },
  repair: () => { GORE.spr.clear(); GORE.offUntil = 0; GORE.errT.length = 0; }
});
