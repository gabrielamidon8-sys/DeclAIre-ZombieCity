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
const MZ = {
  pistol: { len: 15, w: 9, prong: 3, sparks: 3, smoke: 0.5, brass: 'b', light: [250, 0.95, 0.07] },
  revolver: { len: 17, w: 14, round: true, gap: true, sparks: 5, smoke: 0.9, brass: '', light: [285, 1.08, 0.09] },
  smg: { len: 12, w: 8, prong: 4, sparks: 2, smoke: 0.3, brass: 'b', light: [225, 0.85, 0.05] },
  rifle: { len: 24, w: 10, prong: 4, cage: true, sparks: 3, smoke: 0.45, brass: 'b', light: [270, 1, 0.07] },
  burst: { len: 21, w: 9, prong: 3, cage: true, sparks: 3, smoke: 0.4, brass: 'b', light: [260, 0.95, 0.06] },
  shotgun: { len: 26, w: 22, cone: true, sparks: 11, smoke: 1.4, brass: 's', light: [345, 1.22, 0.1] },
  sniper: { len: 30, w: 8, prong: 2, brake: true, sparks: 4, smoke: 1.1, dust: true, brass: 'b', light: [335, 1.25, 0.1] },
  lmg: { len: 26, w: 12, prong: 5, cage: true, sparks: 4, smoke: 0.7, brass: 'b', light: [300, 1.1, 0.06] },
  launcher: { len: 16, w: 16, round: true, back: true, sparks: 6, smoke: 2.2, brass: '', light: [320, 1.15, 0.14] },
  flamer: { pilot: true, sparks: 0, smoke: 0, brass: '', light: [150, 0.9, 0.09] }
};
const MZ_PX = 3;     // sprite pixels per player unit
const MZ_K = 1.3;   // flames are drawn a little larger than life, so they read at the camera's distance
function muzzleOn() { return !(MUZZLE.offUntil && performance.now() < MUZZLE.offUntil); }
// a mod's colour as numbers (the standard mod keeps the plain warm fire)
function muzzleTint(w) {
  if (!w || !w.M || w.M.key === 'standard' || w.M.key === 'heavy' || w.M.key === 'golden') return null;
  const n = parseInt(String(w.color || '#ffd678').slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255];
}
function muzzleBox(P) { const bw = P.len * 1.9 + 6 + (P.round || P.cone ? P.w * 0.6 : 0), bh = Math.max(P.w * 2.6, P.len * 0.85) + 4; return { bw: bw, bh: bh, ox: P.brake ? bw * 0.18 : P.round || P.cone ? P.w * 0.6 + 2 : 4 }; }
// the flame of gun fk, variant v, tinted by tint: drawn once (white-hot core, yellow, orange, the shape of the muzzle device)
function muzzleSprite(fk, v, tint) {
  const key = fk + v + (tint ? ':' + tint.join(',') : '');
  let c = MUZZLE.spr.get(key); if (c) { MUZZLE.spr.delete(key); MUZZLE.spr.set(key, c); return c; }
  const P = MZ[fk] || MZ.pistol; if (P.pilot) return null;
  const B = muzzleBox(P);
  c = document.createElement('canvas'); c.width = Math.ceil(B.bw * MZ_PX); c.height = Math.ceil(B.bh * MZ_PX);
  const g = c.getContext('2d'); if (!g) return null;
  const R = Z.mulberry32(0x6d2b79f5 ^ (v * 2654435761) ^ (fk.charCodeAt(0) << 8) ^ fk.length);
  g.setTransform(MZ_PX, 0, 0, MZ_PX, B.ox * MZ_PX, B.bh / 2 * MZ_PX);
  g.globalCompositeOperation = 'lighter';
  const t = tint, mix = (a, b, k) => Math.round(a * (1 - k) + b * k);
  const mid = t ? [mix(255, t[0], 0.55), mix(214, t[1], 0.55), mix(120, t[2], 0.55)] : [255, 206, 112], out = t ? [mix(255, t[0], 0.75), mix(130, t[1], 0.75), mix(40, t[2], 0.75)] : [255, 128, 36];
  const css = (c3, a) => 'rgba(' + c3[0] + ',' + c3[1] + ',' + c3[2] + ',' + a + ')';
  // a tapered tongue of flame from the muzzle at angle a, length l, half-width hw
  const tongue = (a, l, hw, k, b) => {
    const ca = Math.cos(a), sa = Math.sin(a), gr = g.createLinearGradient(0, 0, ca * l, sa * l), h0 = hw * (b == null ? 1 : b);
    gr.addColorStop(0, css([255, 250, 232], 0.95 * k)); gr.addColorStop(0.3, css(mid, 0.85 * k)); gr.addColorStop(0.75, css(out, 0.5 * k)); gr.addColorStop(1, css(out, 0));
    g.fillStyle = gr; g.beginPath(); g.moveTo(-sa * h0, ca * h0); g.quadraticCurveTo(ca * l * 0.45 - sa * hw * 1.1, sa * l * 0.45 + ca * hw * 1.1, ca * l, sa * l); g.quadraticCurveTo(ca * l * 0.45 + sa * hw * 1.1, sa * l * 0.45 - ca * hw * 1.1, sa * h0, -ca * h0); g.closePath(); g.fill();
  };
  const blob = (x, y, rx, ry, k) => {
    const r = Math.max(rx, ry); g.save(); g.translate(x, y); g.scale(rx / r, ry / r);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, css([255, 252, 240], 0.95 * k)); gr.addColorStop(0.35, css(mid, 0.8 * k)); gr.addColorStop(0.75, css(out, 0.35 * k)); gr.addColorStop(1, css(out, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.restore();
  };
  const L = P.len, Wd = P.w;
  if (P.cone) {
    // the shotgun: a wide bloom, fingers of fire, a bright core
    tongue(0, L * 1.25, Wd * 0.5, 0.75, 0.12);
    for (let i = 0; i < 7; i++) { const a = (R() - 0.5) * 0.95; tongue(a, L * (0.55 + R() * 0.55), Wd * (0.08 + R() * 0.07), 0.8, 0.3); }
    blob(L * 0.3, 0, L * 0.34, Wd * 0.3, 0.9);
    g.fillStyle = css([255, 240, 200], 0.9);
    for (let i = 0; i < 14; i++) { const a = (R() - 0.5) * 0.9, d = L * (0.4 + R() * 1.0), s = 0.35 + R() * 0.55; g.fillRect(Math.cos(a) * d, Math.sin(a) * d, s, s); }
  } else if (P.round) {
    // a fireball: ragged, round, a little forward
    for (let i = 0; i < 6; i++) { const a = (R() - 0.5) * 1.6, d = R() * Wd * 0.3; blob(Wd * 0.38 + Math.cos(a) * d, Math.sin(a) * d, Wd * (0.32 + R() * 0.16), Wd * (0.28 + R() * 0.14), 0.75); }
    tongue(0, L * 1.05, Wd * 0.22, 0.75);
    blob(Wd * 0.25, 0, Wd * 0.22, Wd * 0.2, 1);
  } else {
    // star points: a flash hider fans them forward evenly; a bare muzzle throws them every way forward, one long
    const n = P.prong || 3;
    for (let i = 0; i < n; i++) {
      const a = P.cage ? (n === 1 ? 0 : (i / (n - 1) - 0.5) * 1.05) : (i === 0 ? 0 : (i % 2 ? 1 : -1) * (0.5 + R() * 0.55));
      const l = (P.cage ? 0.6 + R() * 0.35 : i === 0 ? 1 : 0.45 + R() * 0.3) * L;
      tongue(a + (R() - 0.5) * 0.12, l, Wd * (P.cage ? 0.13 : 0.18), 0.95);
    }
    if (P.cage) tongue(0, L * (0.95 + R() * 0.3), Wd * 0.16, 0.9);
    blob(L * 0.12, 0, L * 0.28, Wd * 0.34, 1);
    if (P.brake) {
      // the brake: two jets thrown out sideways (a little back), and a long thin core forward
      for (const s of [-1, 1]) { tongue(s * (Math.PI / 2 + 0.25 + R() * 0.15), Wd * (1.7 + R() * 0.5), Wd * 0.3, 0.85); blob(-1, s * Wd * 0.5, Wd * 0.42, Wd * 0.3, 0.6); }
      tongue(0, L * 1.35, Wd * 0.12, 0.8);
    }
  }
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over';
  MUZZLE.spr.set(key, c); MUZZLE.made++;
  while (MUZZLE.spr.size > 64) MUZZLE.spr.delete(MUZZLE.spr.keys().next().value);
  return c;
}
// a shot: the light, sparks, smoke and brass (o: the shooter, for the flame's variant)
function muzzleShot(o, w, a, x, y) {
  const fk = (w && w.F && w.F.key) || 'pistol', P = MZ[fk] || MZ.pistol, tint = muzzleTint(w);
  if (o) { o.mfv = (Math.random() * 4) | 0; o.mfk = fk; o.mft = tint; }
  const L = P.light, lc = fk === 'flamer' ? '255,150,60' : tint ? Math.round(255 * 0.6 + tint[0] * 0.4) + ',' + Math.round(214 * 0.6 + tint[1] * 0.4) + ',' + Math.round(140 * 0.6 + tint[2] * 0.4) : '255,214,140';
  luxFlash(x, y, L[0] * (0.55 + 0.45 * SCL), lc, L[1] * (SET.flash ? 0.55 : 1), L[2], { shade: true });
  if (!muzzleOn()) return;
  MUZZLE.shots++;
  const ca = Math.cos(a), sa = Math.sin(a), q = Q.burst || 0.6;
  // sparks, forward
  const ns = Math.round(P.sparks * q);
  for (let i = 0; i < ns; i++) {
    if (G.parts.length >= Q.parts) break;
    const aa = a + (Math.random() - 0.5) * (P.cone ? 0.9 : 0.5), sp = 180 + Math.random() * 320;
    G.parts.push({ x: x, y: y, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, life: 0.06 + Math.random() * 0.12, max: 0.18, c: Math.random() < 0.5 ? '#fff1b8' : '#ffb347', s: 1.4 + Math.random() * 1.4, glow: true });
  }
  if (P.dust && typeof ring === 'function') ring(x, y, 4 * PK, 34 * PK, 0.3, '196,186,166', 2);
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
  const fl = clamp(p.flashT / 0.05, 0, 1), v = p.mfv == null ? (Math.floor(G.time * 60) & 3) : p.mfv;
  const spr = muzzleSprite(fk, v, p.mfk === fk ? p.mft : muzzleTint(p.weapon)); if (!spr) return;
  const B = muzzleBox(P), s = (0.72 + 0.4 * (1 - fl)) * MZ_K * (SET.flash ? 0.8 : 1);
  g.save(); g.translate(mx, 0); g.scale(s, s); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, 0.35 + fl) * k * (SET.flash ? 0.6 : 1);
  g.drawImage(spr, -B.ox, -B.bh / 2, B.bw, B.bh);
  // the revolver spits fire from the cylinder gap, either side
  if (P.gap) { const cx = -gl * 0.42 / s; g.fillStyle = '#ffc870'; g.globalAlpha = 0.7 * fl * k; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(cx, sd * 4.2, 1.6, 3.2, 0, 0, TAU); g.fill(); } }
  // the launcher's back-blast, out of the rear of the tube
  if (P.back) {
    const bx = -(gl + 14) / s, gr = g.createRadialGradient(bx, 0, 0, bx, 0, 22);
    gr.addColorStop(0, 'rgba(255,240,200,' + (0.9 * fl) + ')'); gr.addColorStop(0.4, 'rgba(255,150,60,' + (0.55 * fl) + ')'); gr.addColorStop(1, 'rgba(255,90,30,0)');
    g.globalAlpha = k; g.fillStyle = gr; g.beginPath(); g.moveTo(bx + 8, 0); g.arc(bx + 8, 0, 26, Math.PI - 0.55, Math.PI + 0.55); g.closePath(); g.fill();
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
  lv: () => MUZZLE.adapt + 2, adaptGet: () => MUZZLE.adapt, load: () => MUZZLE.smoke.length + MUZZLE.brass.length, loadName: 'puffs and casings',
  canTrim: () => MUZZLE.adapt > -2, trim: () => { if (MUZZLE.adapt <= -2) return false; MUZZLE.adapt--; const cap = MUZZLE.adapt < -1 ? 30 : 60; if (MUZZLE.smoke.length > cap) MUZZLE.smoke.splice(0, MUZZLE.smoke.length - cap); return true; },
  boost: () => { if (MUZZLE.adapt >= 0) return false; MUZZLE.adapt++; return true; },
  check: () => MUZZLE.smoke.length > 400 || MUZZLE.brass.length > 400 ? 'its smoke or brass piled up' : MUZZLE.smoke.some(p => !(p.x === p.x && p.y === p.y)) ? 'a puff of smoke lost its place' : '',
  reset: () => { muzzleReset(); MUZZLE.spr.clear(); MUZZLE.offUntil = 0; MUZZLE.errT.length = 0; } });
