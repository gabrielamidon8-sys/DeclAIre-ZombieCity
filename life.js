/* ================= world life: things you can touch, shoot and scare =================
   Bushes and grass shake and bend as you (or the zombies) push through them, trees drop leaves, traffic cones and
   trash cans get kicked around, red barrels explode when shot, crows take off when you get close, fires burn in the
   burning districts, car alarms lure zombies, and you leave footprints in snow, sand, ash and mud. Water slows
   everything down and ripples around whoever is wading through it. */
const WD = { act: [], props: [], fires: [], birds: [], lights: [], t: 0, cx: 1e9, cy: 1e9, rustT: 0, flapT: 0, wasW: false, wetT: 0, stepD: 0, side: 1, ripT: 0, zrip: 0 };
const WSPR = new Map();   // bush and tree sprites, per kind, size and season
function worldReset() {
  WD.act = []; WD.props = []; WD.fires = []; WD.birds = []; WD.lights = []; WD.t = 0; WD.cx = 1e9; WD.wasW = false; WD.wetT = 0; WD.stepD = 0;
  G.prints = []; G.alarms = [];
  WORLD.cur = null;
}
// everything interactive within a chunk of the screen
function rebuildActive() {
  const hw = W / ZOOM / 2 + 260, hh = H / ZOOM / 2 + 260;
  const x0 = Math.floor((cam.x - hw) / CH), x1 = Math.floor((cam.x + hw) / CH), y0 = Math.floor((cam.y - hh) / CH), y1 = Math.floor((cam.y + hh) / CH);
  WD.act.length = 0; WD.props.length = 0; WD.fires.length = 0; WD.birds.length = 0; WD.lights.length = 0;
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
    const c = getChunk(cx, cy);
    for (const d of c.deco) WD.act.push(d);
    for (const p of c.props) if (!p.dead) WD.props.push(p);
    for (const f of c.fires) WD.fires.push(f);
    for (const b of c.birds) if (b.st < 2) WD.birds.push(b);
    if (!c.lights) c.lights = lightsOf(cx, cy);
    for (const L of c.lights) if (L.broken) WD.lights.push(L);
  }
  WD.t = 0.35; WD.cx = Math.floor(cam.x / 200); WD.cy = Math.floor(cam.y / 200);
}

/* ---------- touching things ---------- */
const LEAF = { round: [['#4f8a3e', '#3a6e32', '#ffb6d5'], ['#2f5e28', '#264e24', '#3a6a30'], ['#7a5a2a', '#8a4626', '#6a6a2e'], ['#cfd8de', '#9aa6ae', '#ffffff']],
  weed: [['#5a7a30'], ['#4a6a2a'], ['#8a7a3a'], ['#b9c3ca']], dry: [['#9a8050'], ['#9a8050'], ['#8a6a40'], ['#a08a6a']], snowy: [['#ffffff', '#cfd8de']], reed: [['#6a8a3a'], ['#5a7a30'], ['#9a8a40'], ['#b9c3ca']], lawn: [['#5f9a42'], ['#4f8a38'], ['#a08a3a'], ['#c9d3da']] };
function leafCol(v) { const L = LEAF[v] || LEAF.round, s = L[Math.min(L.length - 1, WORLD.season)]; return s[Math.floor(Math.random() * s.length)]; }
function touch(d, x, y, k, loud) {
  const fresh = d.sh < 0.35;
  d.sh = Math.min(1, Math.max(d.sh, k)); d.sa = Math.atan2(d.y - y, d.x - x);
  if (d.k === 'grass') { d.bend = Math.max(d.bend, k); d.ba = d.sa; }
  if (!fresh) return;
  const v = d.k === 'tree' ? (d.v === 'pine' ? 'snowy' : d.v === 'dead' ? 'dead' : 'round') : d.v;
  if (d.k !== 'grass' && Q.burst > 0.3) for (let i = 0; i < (d.k === 'tree' ? 6 : 4); i++) {
    if (G.parts.length >= Q.parts) break;
    const a = rand(TAU), s = rand(20, 70), rr = d.k === 'tree' ? d.r * 0.7 : d.r * 0.5;
    G.parts.push({ x: d.x + Math.cos(a) * rr, y: d.y + Math.sin(a) * rr, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.5, 1), max: 1, c: v === 'dead' ? '#3a3330' : v === 'snowy' && d.k === 'tree' ? (bioAt(d.x, d.y) === 'snow' || WORLD.season === 3 ? '#e8eef2' : '#2a4a34') : leafCol(v), s: rand(2, 3.5) });
  }
  if (loud && WD.rustT <= 0) { WD.rustT = 0.12; SFX.rustle(d.k === 'tree' ? 1 : d.k === 'grass' ? 0.5 : 0.8, d.v === 'dry' || d.v === 'snowy'); }
}
function visNearCam(x, y, m) { const hw = W / ZOOM / 2 + m, hh = H / ZOOM / 2 + m; return x > cam.x - hw && x < cam.x + hw && y > cam.y - hh && y < cam.y + hh; }

/* ---------- props: cones, cans, tires, crates and explosive barrels ---------- */
function boomBarrel(o) {
  if (o.dead) return; o.dead = true;
  const x = o.x, y = o.y, R = 105;
  near(x, y, R, z => { if (z.dead) return; const d = Math.hypot(z.x - x, z.y - y); if (d < R + z.r) { hurtZombie(z, (60 + G.wave * 9) * (z.boss ? 0.5 : 1) * (1 - d / (R * 1.6)), { src: 'blast', kx: (z.x - x) / (d || 1) * 320, ky: (z.y - y) / (d || 1) * 320 }); if (!z.dead && !z.boss) { z.burnT = 3; z.burnDps = Math.max(z.burnDps || 0, 8 + G.wave); } } });
  const p = G.p; if (p && G.mode === 'play') { const d = Math.hypot(p.x - x, p.y - y); if (d < 72) hurtPlayer(10 + G.wave * 0.6); }
  burst(x, y, 26, '#ffb347', 340, 5, 0.55); burst(x, y, 14, '#5a1a10', 200, 7, 0.8); burst(x, y, 10, '#c4262c', 260, 4, 0.5);
  ring(x, y, 8, R, 0.4, '255,140,50', 5); ring(x, y, 4, R * 0.6, 0.3, '255,230,180', 3);
  splat(x, y, 34, 'rgba(20,10,6,0.6)'); shakeIt(11); SFX.boom(true); buzz(40);
  for (let i = 0; i < 4; i++) puff(x + rand(-20, 20), y + rand(-20, 20), 10, 46, 2.6, '40,36,34', rand(-20, 20), rand(-40, -10));
  if (G.haz) G.haz.push({ x: x, y: y, r: 34, life: 4, max: 4, k: 'fire', dps: 12 + G.wave });
  worldBlast(x, y, R * 1.3, o);
}
function hitProp(o, b) {
  const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp, m = PROPS[o.k].m;
  o.vx += ux * 160 / m; o.vy += uy * 160 / m; o.va += (Math.random() - 0.5) * 12 / m;
  if (o.k === 'barrel') { o.hp -= b.dmg; o.flash = 0.12; burst(b.x, b.y, 3, '#ffcf6a', 120, 2, 0.2); if (o.hp <= 0) { o.fuse = 0.05; } return true; }
  if (o.k === 'can') o.down = true;
  burst(b.x, b.y, 2, '#d8d2c4', 90, 2, 0.2); SFX.propHit(o.k);
  return o.k === 'crate';
}
// a bullet's path against the props on screen: barrels and crates stop it, the light stuff just gets knocked
function bulletProps(b, sx, sy) {
  if (!WD.props.length || b.kind === 'flame') return false;
  const dx = b.x - sx, dy = b.y - sy, l2 = dx * dx + dy * dy;
  for (const o of WD.props) {
    if (o.dead || b.lastProp === o) continue;
    const u = l2 > 0 ? clamp(((o.x - sx) * dx + (o.y - sy) * dy) / l2, 0, 1) : 1, ex = o.x - (sx + dx * u), ey = o.y - (sy + dy * u);
    if (ex * ex + ey * ey > (o.r + 3) * (o.r + 3)) continue;
    b.lastProp = o;
    if (hitProp(o, b)) return true;
  }
  return false;
}
function updProps(dt) {
  const p = G.p;
  for (const o of WD.props) {
    if (o.dead) continue;
    if (o.fuse > 0) { o.fuse -= dt; if (o.fuse <= 0) { boomBarrel(o); continue; } }
    if (o.flash > 0) o.flash -= dt;
    const m = PROPS[o.k].m;
    if (p && G.mode !== 'title') {
      const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy), mn = o.r + p.r;
      if (d < mn && d > 0.01) {
        o.x = p.x + dx / d * mn; o.y = p.y + dy / d * mn;
        const kick = (p.dashT > 0 ? 520 : 170) / m; o.vx += dx / d * kick * dt * 8; o.vy += dy / d * kick * dt * 8; o.va += (Math.random() - 0.5) * 3;
        if (o.k === 'can' && !o.down && p.dashT > 0) o.down = true;
        if (Math.hypot(o.vx, o.vy) > 60 && !o.bumped) { o.bumped = true; SFX.propHit(o.k); }
      }
    }
    if ((frameNo & 1) === 0) near(o.x, o.y, o.r + 30, z => {
      if (z.dead || z.fly) return; const dx = o.x - z.x, dy = o.y - z.y, d = Math.hypot(dx, dy), mn = o.r + z.r * 0.8;
      if (d < mn && d > 0.01) { o.x = z.x + dx / d * mn; o.y = z.y + dy / d * mn; o.vx += dx / d * 30 / m; o.vy += dy / d * 30 / m; }
    });
    const sp = Math.hypot(o.vx, o.vy);
    if (sp > 1) {
      const px = o.x, py = o.y;
      o.x += o.vx * dt; o.y += o.vy * dt; o.a += o.va * dt;
      if (collide(o, o.r)) { if (Math.abs(o.x - px - o.vx * dt) > 0.5) o.vx *= -0.4; if (Math.abs(o.y - py - o.vy * dt) > 0.5) o.vy *= -0.4; }
      const f = Math.exp(-(o.k === 'tire' ? 1.6 : 3.2) * dt); o.vx *= f; o.vy *= f; o.va *= f;
    } else { o.vx = o.vy = 0; o.bumped = false; }
  }
}

/* ---------- explosions shake the world ---------- */
function worldBlast(x, y, R, src) {
  if (!WD.act) return;
  for (const o of WD.props) {
    if (o.dead || o === src) continue;
    const dx = o.x - x, dy = o.y - y, d = Math.hypot(dx, dy) || 1; if (d > R) continue;
    const k = (1 - d / R) * 600 / PROPS[o.k].m; o.vx += dx / d * k; o.vy += dy / d * k; o.va += (Math.random() - 0.5) * 20;
    if (o.k === 'barrel' && !o.fuse) { o.hp -= 40 * (1 - d / R) + 10; if (o.hp <= 0) o.fuse = 0.1 + Math.random() * 0.12; }
    if (o.k === 'can') o.down = true;
  }
  for (const d of WD.act) { const e = Math.hypot(d.x - x, d.y - y); if (e < R * 1.6) touch(d, x, y, Math.min(1, 1.3 - e / (R * 1.6)), false); }
  for (const b of WD.birds) if (b.st === 0 && Math.hypot(b.x - x, b.y - y) < 520) flee(b, x, y);
  const w = waterAt(x, y);
  if (isWater(w)) { burst(x, y, 22, '#cfe8f0', 260, 4, 0.7); ring(x, y, 10, R * 0.8, 0.6, '200,235,245', 4); }
}

/* ---------- birds ---------- */
function flee(b, x, y) {
  b.st = 1; b.t = 0; const a = Math.atan2(b.y - y, b.x - x) + (Math.random() - 0.5) * 1.2, s = b.kind === 'vulture' ? 90 : 140 + Math.random() * 60;
  b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s; b.a = a;
  if (WD.flapT <= 0 && visNearCam(b.x, b.y, 40)) { WD.flapT = 0.4; SFX.flap(b.kind === 'vulture'); }
}
function updBirds(dt) {
  if (!SET.life) return;
  const p = G.p, live = p && G.mode !== 'title';
  for (const b of WD.birds) {
    if (b.st === 2) continue;
    b.t += dt;
    if (b.st === 0) {
      b.ph += dt;
      if (Math.random() < dt * 0.5) b.a += (Math.random() - 0.5) * 2;
      if (Math.random() < dt * 0.3) { b.x += Math.cos(b.a) * 4; b.y += Math.sin(b.a) * 4; }   // a little hop
      let threat = null;
      if (live) { const d = Math.hypot(p.x - b.x, p.y - b.y); if (d < (Math.abs(p.ix) + Math.abs(p.iy) > 0.1 ? 150 : 95) || (p.flashT > 0 && d < 330)) threat = p; }
      if (!threat) near(b.x, b.y, 60, z => { if (!z.dead) { threat = z; return false; } });
      if (threat) flee(b, threat.x, threat.y);
    } else {
      b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 1 + dt * 0.8; b.vy *= 1 + dt * 0.8; b.vy -= dt * 30;
      if (b.t > 3.2) b.st = 2;
    }
  }
}

/* ---------- fires ---------- */
function updFires(dt) {
  const p = G.p, wet = WX.wet || 0;
  for (const f of WD.fires) {
    f.ph += dt; f.lit += ((wet > 0.5 ? 0.65 : 1) - f.lit) * Math.min(1, dt);
    if (!visNearCam(f.x, f.y, 120)) continue;
    if (Math.random() < dt * 2.2 * Q.burst * f.lit) puff(f.x + rand(-f.r, f.r) * 0.4, f.y - f.r * 0.2, 4, 18 + f.r, 2.6, '38,34,32', (WX.wx || 0) * 30 + rand(-6, 6), (WX.wy || 0) * 30 - 26);
    if (Math.random() < dt * 5 * Q.burst && G.parts.length < Q.parts) G.parts.push({ x: f.x + rand(-f.r, f.r) * 0.5, y: f.y, vx: rand(-20, 20) + (WX.wx || 0) * 40, vy: rand(-90, -40), life: rand(0.6, 1.3), max: 1.3, c: Math.random() < 0.5 ? '#ffb347' : '#ff6a2a', s: rand(1.5, 2.5) });
    if (!f.hz || G.mode !== 'play') continue;
    if (p && Math.hypot(p.x - f.x, p.y - f.y) < f.r * 0.85 + p.r * 0.5 && p.dashT <= 0) p.burnT = Math.max(p.burnT, 1.1);
    if ((frameNo & 3) === 0) near(f.x, f.y, f.r, z => { if (!z.dead && !z.fly && Math.hypot(z.x - f.x, z.y - f.y) < f.r) { z.burnT = Math.max(z.burnT || 0, 2); z.burnDps = Math.max(z.burnDps || 0, 6 + G.wave); } });
  }
}

/* ---------- car alarms: shoot a parked car and it screams, pulling nearby zombies to it ---------- */
function carHit(r) {
  if (!r || r.k !== 'car' || r.burnt || r.alarmed) return;
  r.alarmed = true;
  G.alarms.push({ r: r, x: r.x + r.w / 2, y: r.y + r.h / 2, t: 7, beep: 0, n: 0 });
  if (G.alarms.length > 4) G.alarms.shift();
}
function updAlarms(dt) {
  if (!G.alarms || !G.alarms.length) return;
  const p = G.p;
  for (const a of G.alarms) {
    a.t -= dt; a.beep -= dt;
    if (a.beep <= 0 && a.t > 0) { a.beep = 0.42; a.n++; const d = p ? Math.hypot(p.x - a.x, p.y - a.y) : 400; SFX.carAlarm(a.n & 1, Math.max(0.08, 1 - d / 900), clamp((a.x - cam.x) / (W / ZOOM / 2), -1, 1)); }
  }
  G.alarms = G.alarms.filter(a => a.t > 0);
}
// zombies drop everything for a screaming car alarm for its first few seconds
function worldLure(z) {
  if (!G.alarms || !G.alarms.length || z.boss || z.rb || z.snatch || z.fly) return null;
  for (const a of G.alarms) if (a.t > 2.5 && Math.abs(z.x - a.x) < 380 && Math.abs(z.y - a.y) < 380 && Math.hypot(z.x - a.x, z.y - a.y) < 380) return [a.x, a.y];
  return null;
}

/* ---------- surfaces, footprints, water ---------- */
function surfaceAt(x, y) {
  const w = waterAt(x, y);
  if (isWater(w)) return 'water'; if (w === 4) return 'ice'; if (w === 6) return 'mud'; if (w === 3) return 'road';
  const b = bioAt(x, y);
  if (b === 'snow' || (WORLD.season === 3 && TEMPERATE[b])) return 'snow';
  if (b === 'desert') return 'sand'; if (b === 'ash') return 'ash';
  if (b === 'suburb') { const lx = ((x % CH) + CH) % CH, ly = ((y % CH) + CH) % CH; if (lx > ROAD + 16 && ly > ROAD + 16 && lx < CH - 16 && ly < CH - 16) return 'grass'; }
  return (WX.wet || 0) > 0.45 ? 'wet' : 'road';
}
const PRINT_COL = { snow: 'rgba(60,80,104,0.42)', sand: 'rgba(40,28,16,0.38)', ash: 'rgba(22,22,24,0.5)', mud: 'rgba(30,22,14,0.55)', wet: 'rgba(14,22,30,0.4)' };
function updSteps(dt) {
  const p = G.p; if (!p || G.mode !== 'play') return;
  const w = waterAt(p.x, p.y), inW = isWater(w);
  if (inW && !WD.wasW) { burst(p.x, p.y, 12, '#cfe8f0', 160, 3, 0.5); ring(p.x, p.y, 6, 34, 0.45, '200,235,245', 3); SFX.splash(1); }
  if (!inW && WD.wasW) WD.wetT = 4;
  WD.wasW = inW;
  if (WD.wetT > 0) WD.wetT -= dt;
  const mv = Math.hypot(p.ix, p.iy);
  if (inW && mv > 0.1) { WD.ripT -= dt; if (WD.ripT <= 0) { WD.ripT = 0.2; ring(p.x - p.ix * 6, p.y - p.iy * 6, 8, 26, 0.6, '190,225,235', 2); if (Math.random() < 0.5) burst(p.x, p.y, 2, '#cfe8f0', 60, 2, 0.3); } }
  if (mv < 0.1 || p.dashT > 0) return;
  WD.stepD += p.speed * mv * dt;
  if (WD.stepD < 27) return;
  WD.stepD = 0; WD.side = -WD.side;
  let s = surfaceAt(p.x, p.y);
  if (WD.wetT > 0 && (s === 'road' || s === 'grass')) s = 'wet';
  const col = PRINT_COL[s];
  if (col && Q.prints > 0 && SET.decals !== 'low') {
    const a = Math.atan2(p.iy, p.ix), nx = -Math.sin(a) * 4 * WD.side, ny = Math.cos(a) * 4 * WD.side;
    G.prints.push({ x: p.x + nx, y: p.y + ny, a: a, t: 0, life: s === 'snow' ? 22 : s === 'wet' ? 6 : 15, c: col });
    const cap = Q.prints * (SET.decals === 'high' ? 1.6 : 1);
    if (G.prints.length > cap) G.prints.splice(0, G.prints.length - cap);
  }
  if (SET.steps) SFX.step(s);
}
function updZombieWater() {
  // ripples around zombies wading through water (a few each frame)
  if (!Q.water) return;
  let n = 0;
  for (const z of G.zs) {
    if (z.dead || z.fly || !z.inW) continue;
    if (((frameNo + (z.bob * 100 | 0)) % 24) !== 0) continue;
    if (!visNearCam(z.x, z.y, 20)) continue;
    ring(z.x, z.y, z.r * 0.7, z.r * 1.9, 0.6, '190,225,235', 1.6);
    if (++n >= 8) break;
  }
}

/* ---------- the update ---------- */
function updWorld(dt) {
  WD.t -= dt; WD.rustT -= dt; WD.flapT -= dt;
  if (WD.t <= 0 || Math.floor(cam.x / 200) !== WD.cx || Math.floor(cam.y / 200) !== WD.cy) rebuildActive();
  const p = G.p, play = p && G.mode === 'play';
  if (play) trackDistrict(p.x, p.y); else trackDistrict(cam.x, cam.y);
  const wind = WX.wind || 0;
  for (const d of WD.act) {
    if (d.sh > 0) d.sh = Math.max(0, d.sh - dt * (d.k === 'tree' ? 1.1 : 2.4));
    if (d.k === 'grass' && d.bend > 0) d.bend = Math.max(0, d.bend - dt * 1.6);
    if (!visNearCam(d.x, d.y, 60)) continue;
    if (play) {
      const rr = d.k === 'tree' ? 7 + p.r + 4 : d.r + p.r * 0.8, dx = p.x - d.x, dy = p.y - d.y;
      if (dx * dx + dy * dy < rr * rr) touch(d, p.x, p.y, p.dashT > 0 ? 1 : 0.8, true);
      if (d.k === 'tree') d.fa = (d.fa || 1) + ((dx * dx + dy * dy < (d.r + 14) * (d.r + 14) ? 0.32 : 1) - (d.fa || 1)) * Math.min(1, dt * 6);
    }
    if (d.k !== 'tree' && ((frameNo + d.s) & 3) === 0) near(d.x, d.y, d.r + 20, z => { if (!z.dead && !z.fly && !z.st.under && Math.hypot(z.x - d.x, z.y - d.y) < d.r + z.r * 0.6) { touch(d, z.x, z.y, 0.6, false); return false; } });
    // a strong wind keeps everything moving
    if (wind > 0.6 && d.k !== 'tree' && Math.random() < dt * wind * 0.4) d.sh = Math.max(d.sh, 0.25 * wind);
  }
  updProps(dt); updBirds(dt); updFires(dt); updAlarms(dt);
  if (G.prints && G.prints.length) { for (const f of G.prints) f.t += dt; if (G.prints[0].t > G.prints[0].life) G.prints = G.prints.filter(f => f.t < f.life); }
  if (play) { updSteps(dt); updZombieWater(); }
}

/* ---------- sprites ---------- */
function wSprite(key, size, draw) {
  let s = WSPR.get(key); if (s) return s;
  const px = Math.max(8, Math.ceil(size * 2 * SPR)), c = document.createElement('canvas'); c.width = c.height = px;
  const g = c.getContext('2d'); g.scale(SPR, SPR); g.translate(size, size); draw(g);
  s = { c: c, half: size }; WSPR.set(key, s);
  if (WSPR.size > 220) WSPR.delete(WSPR.keys().next().value);
  return s;
}
function bushSprite(d) {
  const sea = WORLD.season, rq = Math.round(d.r / 2) * 2, v = d.v, key = 'b|' + v + '|' + sea + '|' + rq + '|' + (d.s & 3);
  return wSprite(key, rq + 6, g => {
    const R = Z.mulberry32(d.s & 3 | (rq << 3)), L = LEAF[v] || LEAF.round, cols = L[Math.min(L.length - 1, sea)];
    const win = sea === 3 && v !== 'dry';
    if (v === 'dry') {
      g.strokeStyle = '#8a6a40'; g.lineWidth = 1.4;
      for (let i = 0; i < 14; i++) { const a = R() * TAU, r = rq * (0.4 + R() * 0.6); g.beginPath(); g.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2); g.quadraticCurveTo(Math.cos(a + 1) * r * 0.6, Math.sin(a + 1) * r * 0.6, Math.cos(a) * r, Math.sin(a) * r); g.stroke(); }
      g.strokeStyle = 'rgba(60,40,20,0.6)'; g.beginPath(); g.arc(0, 0, rq * 0.8, 0, TAU); g.stroke();
      return;
    }
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(3, 4, rq, rq * 0.9, 0, 0, TAU); g.fill();
    const n = 5 + Math.floor(R() * 3);
    for (let i = 0; i < n; i++) { const a = i / n * TAU + R(), r = rq * (0.45 + R() * 0.2), cr = rq * (0.42 + R() * 0.18); g.fillStyle = shade(cols[0], -0.25); g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, cr + 1.5, 0, TAU); g.fill(); }
    for (let i = 0; i < n; i++) { const a = i / n * TAU + R(), r = rq * (0.4 + R() * 0.2), cr = rq * (0.4 + R() * 0.15); g.fillStyle = cols[Math.min(cols.length - 1, i % 2)]; g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, cr, 0, TAU); g.fill(); }
    g.fillStyle = cols[0]; g.beginPath(); g.arc(0, 0, rq * 0.5, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(-rq * 0.25, -rq * 0.3, rq * 0.3, 0, TAU); g.fill();
    if (v === 'round' && sea === 0) { g.fillStyle = '#ffb6d5'; for (let i = 0; i < 6; i++) { const a = R() * TAU, r = R() * rq * 0.8; g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, 1.6, 0, TAU); g.fill(); } }
    if (win || v === 'snowy') { g.fillStyle = 'rgba(240,245,250,0.85)'; for (let i = 0; i < 5; i++) { const a = R() * TAU, r = R() * rq * 0.6; g.beginPath(); g.arc(Math.cos(a) * r - 2, Math.sin(a) * r - 2, rq * 0.25, 0, TAU); g.fill(); } }
  });
}
function treeSprite(d) {
  const sea = WORLD.season, rq = Math.round(d.r / 3) * 3, v = d.v, snowy = sea === 3 || bioAt(d.x, d.y) === 'snow';
  const key = 't|' + v + '|' + sea + '|' + rq + '|' + (d.s & 3) + '|' + (snowy ? 1 : 0);
  return wSprite(key, rq + 8, g => {
    const R = Z.mulberry32((d.s & 3) * 977 + rq);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(8, 10, rq, rq * 0.9, 0, 0, TAU); g.fill();
    const bare = v === 'dead' || (sea === 3 && (v === 'oak' || v === 'blossom'));
    if (bare) {
      g.strokeStyle = v === 'dead' ? '#24201e' : '#3a2e26'; g.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + R() * 0.5, l = rq * (0.6 + R() * 0.4); g.lineWidth = 3.4 - i * 0.2; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(a + 0.5) * l * 0.5, Math.sin(a + 0.5) * l * 0.5, Math.cos(a) * l, Math.sin(a) * l); g.stroke(); g.lineWidth = 1.2; g.beginPath(); g.moveTo(Math.cos(a) * l * 0.6, Math.sin(a) * l * 0.6); g.lineTo(Math.cos(a + 0.4) * l * 0.9, Math.sin(a + 0.4) * l * 0.9); g.stroke(); }
      if (snowy) { g.strokeStyle = 'rgba(240,245,250,0.7)'; g.lineWidth = 1.4; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2, l = rq * 0.7; g.beginPath(); g.moveTo(Math.cos(a) * l * 0.3, Math.sin(a) * l * 0.3 - 1); g.lineTo(Math.cos(a) * l, Math.sin(a) * l - 1); g.stroke(); } }
      g.fillStyle = '#2e2622'; g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill();
      return;
    }
    if (v === 'pine') {
      // layered star shapes, darkest at the bottom, with snow on the tips
      for (let k = 0; k < 3; k++) {
        const r = rq * (1 - k * 0.27), n = 9, col = ['#1f3a2a', '#2a4a34', '#355a3e'][k];
        g.fillStyle = col; g.beginPath();
        for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU + k * 0.3, rr = i % 2 ? r * 0.62 : r; if (!i) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        g.closePath(); g.fill();
        if (snowy) { g.fillStyle = 'rgba(240,245,250,0.8)'; for (let i = 0; i < n; i++) { const a = i / n * TAU + k * 0.3; g.beginPath(); g.arc(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, 2.4 - k * 0.5, 0, TAU); g.fill(); } }
      }
      return;
    }
    const cols = v === 'blossom' && sea <= 1 ? ['#a8607e', '#c97aa0', '#e6a8c8'] : sea === 2 ? ['#5e3219', '#8f4a24', '#b06a2e'] : sea === 0 ? ['#2f5a28', '#457a36', '#5c9446'] : ['#1c3a20', '#28522c', '#356836'];
    // a dark rim first so the crown reads as foliage, not a blob of color
    g.fillStyle = 'rgba(10,14,8,0.55)';
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, r = rq * 0.62; g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, rq * 0.46, 0, TAU); g.fill(); }
    for (let k = 0; k < 3; k++) {
      const n = 7 - k, base = rq * (0.62 - k * 0.14);
      g.fillStyle = cols[k];
      for (let i = 0; i < n; i++) { const a = i / n * TAU + R() * 0.6 + k, r = base * (0.8 + R() * 0.3), cr = rq * (0.42 - k * 0.08) * (0.85 + R() * 0.3); g.beginPath(); g.arc(Math.cos(a) * r * (k ? 0.7 : 1), Math.sin(a) * r * (k ? 0.7 : 1) - k * 2, cr, 0, TAU); g.fill(); }
    }
    // leaves: little dots of lighter and darker color across the crown
    const dots = v === 'blossom' && sea <= 1 ? ['#ffd6e8', '#f2b0d0'] : sea === 2 ? ['#c94a24', '#d8a03a', '#7a2a18'] : sea === 0 ? ['#7ab85a', '#3a6a2e'] : ['#467a40', '#18301c'];
    for (let i = 0; i < 26; i++) { const a = R() * TAU, r = R() * rq * 0.85; g.fillStyle = dots[i % dots.length]; g.fillRect(Math.cos(a) * r - 1, Math.sin(a) * r - 1, 2.2, 2.2); }
    g.fillStyle = 'rgba(255,255,255,0.07)'; g.beginPath(); g.arc(-rq * 0.25, -rq * 0.3, rq * 0.35, 0, TAU); g.fill();
  });
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.round(clamp(k < 0 ? v * (1 + k) : v + (255 - v) * k, 0, 255));
  return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
}

/* ---------- drawing ---------- */
const GRASS_COL = { lawn: ['#4f8a38', '#3f7a2c', '#9a7a34', '#c9d3da'], reed: ['#6a8a3a', '#5a7a30', '#9a8a40', '#aab4ba'], dry: ['#9a8050', '#a08654', '#8a6a40', '#a08a6a'], weed: ['#5a7a30', '#4a6a2a', '#8a7a3a', '#b9c3ca'] };
function vegLevel() { return SET.veg === 'auto' ? (PERF.vegCut ? Math.min(1, Q.veg) : Q.veg) : SET.veg === 'off' ? 0 : SET.veg === 'low' ? 1 : 2; }
// under the zombies: puddles, glints on the water, footprints, grass, tree trunks, props and birds on the ground
function drawWorldUnder(vis) {
  const wet = WX.wet || 0, t = G.time;
  // puddles shine when it rains
  if (wet > 0.12) {
    ctx.fillStyle = 'rgba(70,90,110,' + (0.3 * wet).toFixed(3) + ')';
    for (let cx = Math.floor((cam.x - W / ZOOM / 2) / CH); cx <= Math.floor((cam.x + W / ZOOM / 2) / CH); cx++) for (let cy = Math.floor((cam.y - H / ZOOM / 2) / CH); cy <= Math.floor((cam.y + H / ZOOM / 2) / CH); cy++) {
      const c = chunks.get(cx + ',' + cy); if (!c) continue;
      for (const p of c.puddles) { if (!vis(p.x, p.y, p.rx)) continue; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx * (0.6 + wet * 0.5), p.ry * (0.6 + wet * 0.5), p.a, 0, TAU); ctx.fill(); }
    }
  }
  // the glints on rivers drift with the current
  const wa = SET.water === 'auto' ? Q.water : SET.water === 'on' ? 1 : 0;
  if (wa) {
    const x0 = Math.floor((cam.x - W / ZOOM / 2) / CH), x1 = Math.floor((cam.x + W / ZOOM / 2) / CH), y0 = Math.floor((cam.y - H / ZOOM / 2) / CH), y1 = Math.floor((cam.y + H / ZOOM / 2) / CH);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const c = chunks.get(cx + ',' + cy); if (!c || !c.wet) continue;
      const L = waterLayer(c); if (!L) continue;
      const k = Math.sin(t * 0.9 + cx) * 6, k2 = Math.cos(t * 0.7 + cy) * 5;
      ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t * 1.7 + cx * 3); ctx.drawImage(L, c.ox + k, c.oy + k2, CH, CH);
      ctx.globalAlpha = 0.25 + 0.2 * Math.cos(t * 1.3 + cy * 2); ctx.drawImage(L, c.ox - k * 0.7 + 14, c.oy - k2 * 0.6 + 9, CH, CH);
    }
    ctx.globalAlpha = 1;
  }
  // footprints
  if (G.prints && G.prints.length) for (const f of G.prints) {
    if (!vis(f.x, f.y, 6)) continue;
    ctx.globalAlpha = Math.min(1, (f.life - f.t) / 4); ctx.fillStyle = f.c;
    ctx.beginPath(); ctx.ellipse(f.x, f.y, 4.6, 2.6, f.a, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const veg = vegLevel(), wind = WX.wind || 0, wdir = WX.wdir || 0;
  // grass: blades that sway in the wind and flatten when something walks through
  if (veg) {
    const sea = WORLD.season, cols = {};
    for (const d of WD.act) {
      if (d.k !== 'grass' || !vis(d.x, d.y, 20)) continue;
      const col = (GRASS_COL[d.v] || GRASS_COL.lawn)[sea]; (cols[col] || (cols[col] = [])).push(d);
    }
    ctx.lineCap = 'round'; ctx.lineWidth = 1.6;
    for (const col in cols) {
      ctx.strokeStyle = col; ctx.beginPath();
      for (const d of cols[col]) {
        const R = Z.mulberry32(d.s), n = 7, sway = veg >= 2 ? Math.sin(t * 2.2 + d.ph) * (0.12 + wind * 0.3) : 0;
        for (let i = 0; i < n; i++) {
          const a = (R() - 0.5) * 2.2 - Math.PI / 2, l = d.r * (0.6 + R() * 0.5), bx = d.x + (R() - 0.5) * d.r * 0.8, by = d.y + (R() - 0.5) * d.r * 0.5;
          let ex = bx + Math.cos(a) * l * 0.5 + Math.cos(wdir) * sway * l, ey = by + Math.sin(a) * l * 0.5 + Math.sin(wdir) * sway * l * 0.4;
          if (d.bend > 0) { ex += Math.cos(d.ba) * d.bend * l * 0.7; ey += Math.sin(d.ba) * d.bend * l * 0.7; }
          ctx.moveTo(bx, by); ctx.quadraticCurveTo((bx + ex) / 2 + 1, (by + ey) / 2, ex, ey);
        }
      }
      ctx.stroke();
    }
  }
  // tree trunks show when the canopy above fades out
  ctx.fillStyle = '#2e2420';
  for (const d of WD.act) if (d.k === 'tree' && vis(d.x, d.y, 10)) { ctx.beginPath(); ctx.arc(d.x, d.y, 6.5, 0, TAU); ctx.fill(); }
  // props
  for (const o of WD.props) { if (!o.dead && vis(o.x, o.y, 16)) drawProp(o); }
  // birds on the ground
  if (SET.life) for (const b of WD.birds) if (b.st === 0 && vis(b.x, b.y, 10)) drawBird(b, 0);
  // police lights and car alarms flash on the ground
  const lightOn = lightLevel() >= 1;
  if (lightOn) {
    ctx.globalCompositeOperation = 'lighter';
    for (const a of (G.alarms || [])) { if (!vis(a.x, a.y, 80)) continue; const on = Math.floor(G.time * 5) % 2; ctx.globalAlpha = on ? 0.55 : 0.18; const r = 60; ctx.drawImage(glowSprite('#ffd27a'), a.x - r, a.y - r, r * 2, r * 2); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}
function lightLevel() { return SET.light === 'auto' ? Q.light : SET.light === 'full' ? 2 : 1; }
function drawProp(o) {
  ctx.save(); ctx.translate(o.x, o.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(3, 4, o.r, o.r * 0.85, 0, 0, TAU); ctx.fill();
  ctx.rotate(o.a);
  switch (o.k) {
    case 'barrel':
      ctx.fillStyle = o.flash > 0 ? '#ffffff' : '#a8231e'; ctx.beginPath(); ctx.arc(0, 0, o.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#5a1210'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, o.r * 0.68, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#f2cc3a'; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(4.5, 3); ctx.lineTo(-4.5, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2a0a08'; ctx.fillRect(-0.8, -2.5, 1.6, 3.5);
      break;
    case 'cone':
      ctx.fillStyle = '#e8622a'; ctx.fillRect(-6, -6, 12, 12); ctx.fillStyle = '#ff8a3a'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#f2f0ea'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.stroke();
      break;
    case 'can':
      if (o.down) { ctx.fillStyle = '#4a5a52'; ctx.fillRect(-o.r, -5.5, o.r * 2, 11); ctx.fillStyle = '#2a332e'; ctx.beginPath(); ctx.ellipse(o.r, 0, 3, 5.5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(80,70,50,0.6)'; ctx.fillRect(o.r + 2, -4, 8, 3); ctx.fillRect(o.r + 4, 2, 6, 3); }
      else { ctx.fillStyle = '#4a5a52'; ctx.beginPath(); ctx.arc(0, 0, o.r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#2a332e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, o.r - 2, 0, TAU); ctx.stroke(); ctx.fillStyle = '#5e6e66'; ctx.fillRect(-2.5, -o.r + 3, 5, o.r * 2 - 6); }
      break;
    case 'tire':
      ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.arc(0, 0, o.r, 0, TAU); ctx.fill(); ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(0, 0, o.r * 0.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * o.r * 0.6, Math.sin(a) * o.r * 0.6); ctx.lineTo(Math.cos(a) * o.r, Math.sin(a) * o.r); ctx.stroke(); }
      break;
    case 'crate':
      ctx.fillStyle = '#8a6a40'; ctx.fillRect(-o.r, -o.r, o.r * 2, o.r * 2); ctx.strokeStyle = '#5a4428'; ctx.lineWidth = 2; ctx.strokeRect(-o.r + 1, -o.r + 1, o.r * 2 - 2, o.r * 2 - 2);
      ctx.beginPath(); ctx.moveTo(-o.r, -o.r); ctx.lineTo(o.r, o.r); ctx.moveTo(o.r, -o.r); ctx.lineTo(-o.r, o.r); ctx.stroke();
      break;
  }
  ctx.restore();
}
function drawBird(b, fly) {
  const big = b.kind === 'vulture', col = b.kind === 'pigeon' ? '#6e737a' : big ? '#3a2e26' : '#151517', s = big ? 1.6 : 1;
  if (!fly) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
    const peck = Math.sin(b.ph * 7) > 0.85 ? 2 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(1, 2, 5 * s, 3 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, 5 * s, 3 * s, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc((4.5 + peck) * s, 0, 2.2 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = big ? '#c9a27e' : '#e0b040'; ctx.fillRect((6 + peck) * s, -0.5, 2 * s, 1);
    ctx.restore();
    return;
  }
  const h = Math.min(1, b.t * 1.4), flap = Math.sin(b.t * (big ? 9 : 22)) * 0.9, sc = s * (1 + h * 0.6);
  ctx.fillStyle = 'rgba(0,0,0,' + (0.25 * (1 - h * 0.6)) + ')'; ctx.beginPath(); ctx.ellipse(b.x + h * 26, b.y + h * 34, 5 * sc, 3 * sc, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx)); ctx.globalAlpha = b.t > 2.6 ? Math.max(0, (3.2 - b.t) / 0.6) : 1;
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(0, 0, 5 * sc, 2.6 * sc, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-1 * sc, 0); ctx.lineTo(-3 * sc, -9 * sc * flap); ctx.lineTo(3 * sc, -1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-1 * sc, 0); ctx.lineTo(-3 * sc, 9 * sc * flap); ctx.lineTo(3 * sc, 1); ctx.closePath(); ctx.fill();
  ctx.restore(); ctx.globalAlpha = 1;
}
// over the zombies: bushes, tree canopies, birds in the air, flames and flickering lights
function drawWorldOver(vis) {
  const veg = vegLevel(), t = G.time, p = G.p && G.mode !== 'title' ? G.p : null;
  if (veg) for (const d of WD.act) {
    if (d.k === 'grass') continue;
    if (!vis(d.x, d.y, d.r + 10)) continue;
    const S = d.k === 'tree' ? treeSprite(d) : bushSprite(d), sh = veg >= 2 ? d.sh : 0;
    let a = 1;
    if (d.k === 'tree') a = 0.94 * (d.fa || 1);
    else if (p && Math.abs(p.x - d.x) < d.r + 8 && Math.abs(p.y - d.y) < d.r + 8) a = 0.55;
    ctx.globalAlpha = a;
    if (sh > 0.02) {
      const w = Math.sin(t * (d.k === 'tree' ? 16 : 30) + d.ph) * sh;
      ctx.save(); ctx.translate(d.x + Math.cos(d.sa) * sh * 3, d.y + Math.sin(d.sa) * sh * 3); ctx.rotate(w * (d.k === 'tree' ? 0.08 : 0.22)); ctx.scale(1 + sh * 0.06, 1 - sh * 0.05);
      ctx.drawImage(S.c, -S.half, -S.half, S.half * 2, S.half * 2); ctx.restore();
    } else ctx.drawImage(S.c, d.x - S.half, d.y - S.half, S.half * 2, S.half * 2);
  }
  ctx.globalAlpha = 1;
  if (SET.life) for (const b of WD.birds) if (b.st === 1 && vis(b.x, b.y, 30)) drawBird(b, 1);
  // flames
  if (WD.fires.length) {
    const L = lightLevel();
    for (const f of WD.fires) {
      if (!vis(f.x, f.y, f.r * 4)) continue;
      const fl = f.lit * (0.85 + 0.15 * Math.sin(f.ph * 13) + 0.1 * Math.sin(f.ph * 31));
      if (L >= 1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * fl; const r = f.r * (L >= 2 ? 4.2 : 3); ctx.drawImage(glowSprite('#ff8a3a'), f.x - r, f.y - r, r * 2, r * 2); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      drawFlame(f.x, f.y, f.r * fl, f.ph);
    }
  }
  // broken streetlights flicker
  if (lightLevel() >= 1 && WD.lights.length) {
    ctx.globalCompositeOperation = 'lighter';
    for (const L of WD.lights) {
      if (!vis(L.x, L.y, 120)) continue;
      const on = Math.sin(t * 23 + L.x) > 0.3 && Math.sin(t * 3.1 + L.y) > -0.2;
      if (!on) continue;
      ctx.globalAlpha = 0.5; const r = 120; ctx.drawImage(glowSprite('#ffc27a'), L.x - r, L.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  // police cars and alarms: flashing lights on top of the car
  if (lightLevel() >= 1) {
    ctx.globalCompositeOperation = 'lighter';
    for (const a of (G.alarms || [])) { if (!vis(a.x, a.y, 40)) continue; const on = Math.floor(t * 5) % 2; ctx.globalAlpha = 0.9; ctx.fillStyle = on ? '#fff2b0' : '#ff9a3a'; const r = a.r; if (r.w > r.h) { ctx.fillRect(r.x + r.w - 4, r.y + 3, 4, 5); ctx.fillRect(r.x + r.w - 4, r.y + r.h - 8, 4, 5); } else { ctx.fillRect(r.x + 3, r.y + r.h - 4, 5, 4); ctx.fillRect(r.x + r.w - 8, r.y + r.h - 4, 5, 4); } }
    for (const cx of [Math.floor(cam.x / CH) - 1, Math.floor(cam.x / CH), Math.floor(cam.x / CH) + 1]) for (const cy of [Math.floor(cam.y / CH) - 1, Math.floor(cam.y / CH), Math.floor(cam.y / CH) + 1]) {
      const c = chunks.get(cx + ',' + cy); if (!c || c.bio !== 'chaos') continue;
      for (const r of c.rects) {
        if (!r.police || !vis(r.x + r.w / 2, r.y + r.h / 2, 60)) continue;
        const ph = Math.floor(t * 6) % 2, x = r.x + r.w / 2, y = r.y + r.h / 2, rr = 46;
        ctx.globalAlpha = 0.45; ctx.drawImage(glowSprite(ph ? '#ff3b3b' : '#3b7bff'), x - rr - (ph ? 10 : -10), y - rr, rr * 2, rr * 2);
        ctx.globalAlpha = 1; ctx.fillStyle = ph ? '#ff6a6a' : '#7aa8ff'; ctx.fillRect(x - 6, y - 2, 5, 4); ctx.fillStyle = ph ? '#5a6aff' : '#ff4a4a'; ctx.fillRect(x + 1, y - 2, 5, 4);
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}
function drawFlame(x, y, r, ph) {
  // three tongues of fire, outer red to inner yellow, licking upward
  const cols = ['rgba(200,50,20,0.85)', 'rgba(255,130,40,0.9)', 'rgba(255,220,120,0.95)'];
  for (let k = 0; k < 3; k++) {
    const s = r * (1 - k * 0.3);
    ctx.fillStyle = cols[k]; ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const ox = (i - 1) * s * 0.45, h = s * (1.3 + 0.35 * Math.sin(ph * (9 + i * 3) + i * 2 + k)), w = s * 0.45;
      ctx.moveTo(x + ox - w, y); ctx.quadraticCurveTo(x + ox - w * 0.6, y - h * 0.55, x + ox + Math.sin(ph * 7 + i) * w * 0.4, y - h); ctx.quadraticCurveTo(x + ox + w * 0.6, y - h * 0.55, x + ox + w, y); ctx.closePath();
    }
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,240,200,0.6)'; ctx.beginPath(); ctx.ellipse(x, y, r * 0.5, r * 0.25, 0, 0, TAU); ctx.fill();
}
// a short buzz on phones that support it (if the player allows it)
function buzz(ms) {
  if (DEV.kind === 'pad') { padRumble(ms); return; }   // a controller rumbles instead of the phone
  if (!SET.vibrate) return;
  try { const n = window.ZCNative; if (n && n.vibrate) { n.vibrate(ms | 0); return; } if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { }
}
