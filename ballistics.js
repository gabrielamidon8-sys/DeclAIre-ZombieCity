/* ================= BALLISTICS: real gun and bullet physics =================
   Each gun fires a real round: its muzzle velocity and bullet mass give it a kinetic energy (a 9 mm pistol about 520
   joules, a .357 Magnum about 990, a 5.56 mm rifle about 1,770, a 7.62 mm sniper round about 3,500, each 00 buckshot
   pellet about 280), drag bleeds speed off with distance, and at 32 units a metre the rounds cross the screen in a frame
   or two. A round is a swept ray: it finds the first wall it meets (and the side it meets it on), the zombies along the
   way front to back, and the props in between. Grazing a wall makes it ricochet; a car's thin metal slows it rather
   than stopping it.
   When it reaches a 2.0 zombie it lands where the zombie's own skeleton is (1.9.998, the hit rig: a sphere for the
   head, capsules for the torso, shoulders, arms and legs in the pose it is in this frame). The round is a line at a
   height: aimed at the body's centre (a placed shot at the head), off by a spread that grows with the range and the
   gun's kick; it hits the first part that line crosses at that height (reaching arms before the chest, a hunched head
   in front of the body) or passes between them and misses. A shield takes what comes at its front. Then the odds of
   what it does: a head shot all but always kills
   (a helmet can turn a light round); a body shot kills most of the time, more often the harder the round hits (soft
   armour stops pistol rounds, plates stop rifle rounds; brutes shrug off some); arms and legs rarely kill but cripple
   (a shot leg limps, two crawl; a shot arm hits weaker). What does not kill still wounds. A round that passes through
   keeps what energy the body did not take, so a rifle can drop two in a line and a sniper round three or four.
   Firing kicks: each shot adds recoil to the spread, which settles back between shots; moving makes it wider. */
const BAL_GUN = {
  pistol: { v: 360, g: 8.0, cd: 0.0018, kick: 0.035, rec: 2.6, max: 0.16, cal: '9 mm' },
  smg: { v: 400, g: 8.0, cd: 0.0018, kick: 0.02, rec: 2.1, max: 0.2, cal: '9 mm' },
  rifle: { v: 940, g: 4.0, cd: 0.0011, kick: 0.017, rec: 2.4, max: 0.14, cal: '5.56 mm' },
  shotgun: { v: 400, g: 3.5, cd: 0.0065, kick: 0.09, rec: 1.7, max: 0.16, cal: '12 gauge buckshot' },
  sniper: { v: 850, g: 9.7, cd: 0.0008, kick: 0.12, rec: 1.3, max: 0.18, cal: '7.62 mm' },
  revolver: { v: 440, g: 10.2, cd: 0.0017, kick: 0.07, rec: 1.9, max: 0.16, cal: '.357 Magnum' },
  lmg: { v: 915, g: 4.0, cd: 0.0011, kick: 0.015, rec: 1.7, max: 0.2, cal: '5.56 mm' },
  burst: { v: 950, g: 4.0, cd: 0.0011, kick: 0.014, rec: 2.6, max: 0.12, cal: '5.56 mm' }
};
const BAL = { on: true, shots: 0, hits: 0, kills: 0, heads: 0, ric: 0, pen: 0, stopped: 0, ms: 0, msAvg: 0, errT: [], offUntil: 0, maxD: 72, reg: { head: 0, torso: 0, arm: 0, leg: 0 }, rigHit: 0, rigMiss: 0 };
const BAL_AIM = [0, 0], BAL_RH = [0, 0, 0, 0];
function balGauss() { let u = 0; while (u === 0) u = Math.random(); return clamp(Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random()), -2.5, 2.5); }
function balUp() { return BAL.on && !(BAL.offUntil && performance.now() < BAL.offUntil); }
const balUPM = () => 32 * SCL / SCALE_REAL;
// the energy of a gun's round in joules (damage cards and mods add to it: hotter loads, heavier bullets)
function balE0(fk) { const B = BAL_GUN[fk]; return B ? 0.5 * B.g / 1000 * B.v * B.v : 0; }
// a fired round: its real speed and energy, and how far it can fly
function balArm(b, p, w, S) {
  const B = BAL_GUN[w.F.key]; if (!B || !balUp() || S.homing || S.boomerang || b.kind !== 'bullet') return false;
  const u = balUPM(), e0 = balE0(w.F.key), k = Math.max(0.3, S.dmg / Math.max(0.1, w.F.dmg));
  const sp = B.v * u, a = Math.atan2(b.vy, b.vx);
  b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
  b.bal = 1; b.E = e0 * k; b.E0 = b.E; b.cd = B.cd; b.trav = 0; b.maxD = BAL.maxD * u; b.life = b.maxD / sp + 0.05; b.max = b.life; b.ric = 0;
  BAL.shots++; G.rounds = (G.rounds || 0) + 1;   // (per run, for the pause screen's accuracy)
  return true;
}
// recoil: where the next round goes (the base spread, the kick of the shots before it, wider on the move)
function balSpread(p, w, S) {
  const B = BAL_GUN[w.F.key]; if (!B || !balUp()) return 0;
  const mv = p.mvK || 0;
  return (p.bloom || 0) * (0.6 + 0.4 * Math.random()) + S.spread * 0.15 * mv;
}
function balKick(p, w) {
  const B = BAL_GUN[w.F.key]; if (!B || !balUp()) return;
  p.bloom = Math.min(B.max, (p.bloom || 0) + B.kick); p.kick = Math.min(1, (p.kick || 0) + B.kick * 9);
}
function balSettle(p, dt) {
  if (!p) return; const w = p.weapon, B = w && w.F && BAL_GUN[w.F.key];
  p.bloom = Math.max(0, (p.bloom || 0) - (B ? B.rec : 2) * dt * ((p.bloom || 0) * 6 + 0.15));
  p.kick = Math.max(0, (p.kick || 0) - dt * 9);
  // how fast the player is moving (from where it was last frame)
  if (p.blx !== undefined && dt > 0) { const sp = Math.hypot(p.x - p.blx, p.y - p.bly) / dt; p.mvK += (clamp(sp / Math.max(60, p.speed || 172), 0, 1) - p.mvK) * Math.min(1, dt * 8); } else p.mvK = 0;
  p.blx = p.x; p.bly = p.y;
}
// the first wall a segment meets: how far along (0..1), the rect, and the side it hit (its outward normal)
const BAL_RAY = { t: 1, r: null, nx: 0, ny: 0 };
function balRay(x0, y0, x1, y1, skip) {
  const R = BAL_RAY; R.t = 1; R.r = null; R.nx = R.ny = 0;
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy); if (len < 0.01) return R;
  // long rays are looked up in pieces (the nearest piece first), so a wall close by is found without gathering the city
  const n = Math.max(1, Math.ceil(len / 220));
  for (let s = 0; s < n && !R.r; s++) {
    const t0 = s / n, t1 = (s + 1) / n, mx = x0 + dx * (t0 + t1) / 2, my = y0 + dy * (t0 + t1) / 2, rs = rectsNear(mx, my, len / n / 2 + 4);
    for (let i = 0; i < rs.length; i++) {
      const r = rs[i]; if (r.low || r === skip) continue;
      // slab test: where the ray enters the box
      let tn = -Infinity, tf = Infinity, nx = 0, ny = 0;
      if (Math.abs(dx) < 1e-9) { if (x0 <= r.x || x0 >= r.x + r.w) continue; }
      else { const ta = (r.x - x0) / dx, tb = (r.x + r.w - x0) / dx, lo = Math.min(ta, tb), hi = Math.max(ta, tb); if (lo > tn) { tn = lo; nx = dx > 0 ? -1 : 1; ny = 0; } tf = Math.min(tf, hi); }
      if (Math.abs(dy) < 1e-9) { if (y0 <= r.y || y0 >= r.y + r.h) continue; }
      else { const ta = (r.y - y0) / dy, tb = (r.y + r.h - y0) / dy, lo = Math.min(ta, tb), hi = Math.max(ta, tb); if (lo > tn) { tn = lo; nx = 0; ny = dy > 0 ? -1 : 1; } tf = Math.min(tf, hi); }
      if (tn > tf || tf < 0 || tn > R.t) continue;
      if (tn < 0) { if (r === skip) continue; tn = 0; }   // starting inside: it stops at once
      R.t = tn; R.r = r; R.nx = nx; R.ny = ny;
    }
  }
  return R;
}
// where a round lands on a zombie and what it does. e: how far from the body's centre line it struck (0 centre, 1 the
// edge); side: -1 its left, 1 its right; front: the round came at its front
// (1.9.998: reg0, when the hit rig found the part the round crossed, is that part; otherwise the odds pick it)
function balResolve(z, b, e, side, front, reg0) {
  const T = z.T || {}, d = z.m.def || {}, D = z.m.ad || {}, E = b.E, wave = G.wave || 1, F = {};
  for (const f of d.feat || []) F[f] = 1;
  const low = T.low || 0, out = { reg: 'torso', kill: false, cripple: false, deflect: false, dmg: 0, absorb: 0, P: 0 };
  let reg;
  if (reg0) reg = reg0 === 'head' && T.shield && front && !b.crit && Math.random() < 0.5 ? 'torso' : reg0;
  else if (b.crit && !(T.shield && front && Math.random() < 0.5)) reg = 'head';
  else {
    let wh = 0.08 + low * 0.2, wt = (0.62 - low * 0.05) * (1.25 - 0.55 * e), wa = 0.13 * (0.35 + 1.5 * e), wl = 0.16 * (1 - low);
    if (D.noArmL) wa *= 0.6; if (D.legless) wl = 0;
    const tot = wh + wt + wa + wl; let r = Math.random() * tot;
    reg = (r -= wh) < 0 ? 'head' : (r -= wt) < 0 ? 'torso' : (r -= wa) < 0 ? 'arm' : 'leg';
  }
  const base = b.dmg * Math.sqrt(Math.max(0.05, E / Math.max(1, b.E0)));
  // a shield in front takes what comes at it (only the heaviest rounds get through, much weakened)
  if (T.shield && front && reg !== 'head') {
    if (E < 2600) { out.reg = 'torso'; out.deflect = true; out.dmg = base * 0.06; out.absorb = E; out.P = E / 2000; BAL.stopped++; balSpark(z, b, '#cfe8ff'); return out; }
    b.E = E - 1800; out.absorb = 1800;
  }
  const E2 = b.E, sideK = side < 0 ? 'L' : 'R';
  out.reg = reg === 'arm' || reg === 'leg' ? reg + sideK : reg;
  if (reg === 'head') {
    // a helmet can turn a light round; the rest of the time a head shot is the end
    const hel = T.helmet ? (E2 < 1300 ? T.helmet : T.helmet * 0.25) : 0;
    if (hel && Math.random() < hel) { out.deflect = true; out.dmg = base * 0.3; out.absorb += E2 * 0.75; out.P = E2 / 900; BAL.stopped++; balSpark(z, b, '#fff1b8'); return out; }
    out.kill = Math.random() < clamp(0.86 + E2 / 9000, 0.88, 0.995);
    out.dmg = base * 3; out.absorb += 380; out.P = E2 / 800;
  } else if (reg === 'torso') {
    // body armour: soft vests stop pistol rounds, plates stop rifle rounds (most of the time; the hit still hurts)
    const hard = F.plates || d.top === 'riot' || d.top === 'space', lim = hard ? 2700 : 1150;
    if (T.armor && E2 < lim && Math.random() < T.armor) { out.deflect = true; out.dmg = base * 0.3; out.absorb += E2; out.P = E2 / 1100; BAL.stopped++; balSpark(z, b, hard ? '#d8dde2' : '#8a8f94'); return out; }
    // a body shot: most zombies do not get up from one (a pistol round kills about three in four, a rifle round nearly all)
    const tough = T.tough || 0, waveK = Math.max(0.72, 1 - 0.01 * (wave - 1));
    out.kill = Math.random() < clamp(0.62 + E2 / 4000, 0.66, 0.96) * (1 - tough) * waveK * (T.brittle ? 1.1 : 1);
    out.dmg = base; out.absorb += 950 * (1 + tough); out.P = E2 / 1000;
  } else if (reg === 'arm') {
    out.kill = Math.random() < 0.03 + E2 / 40000; out.cripple = Math.random() < (T.brittle ? 1 : clamp(0.45 + E2 / 2500, 0, 0.95));
    out.dmg = base * 0.45; out.absorb += T.brittle ? 120 : 260; out.P = E2 / 1500;
  } else {
    out.kill = Math.random() < 0.04 + E2 / 30000; out.cripple = Math.random() < (T.brittle ? 1 : clamp(0.5 + E2 / 2500, 0, 0.95));
    out.dmg = base * 0.55; out.absorb += T.brittle ? 140 : 320; out.P = E2 / 1300;
  }
  BAL.reg[reg]++;
  return out;
}
function balSpark(z, b, col) {
  const a = Math.atan2(b.vy, b.vx) + Math.PI;
  if (typeof goreSparks === 'function') goreSparks(b.x, b.y, a, 5, [col, '#ffffff', '#ffd27a'], 220); else burst(b.x, b.y, 4, col, 160, 2, 0.2);
  if (typeof SFX !== 'undefined' && SFX.ricochet) SFX.ricochet();
}
// one round, one frame: fly, slow, find what is in the way (walls, props, zombies, front to back), and act on each
const BAL_C = [];
function balStep(b, dt) {
  const p = G.p, S = p.S;
  const sx = b.sx !== undefined ? b.sx : b.x, sy = b.sy !== undefined ? b.sy : b.y; b.sx = b.sy = undefined;
  const ex = b.x + b.vx * dt, ey = b.y + b.vy * dt, dx = ex - sx, dy = ey - sy, len = Math.hypot(dx, dy);
  b.life -= dt; b.age = (b.age || 0) + dt; b.trav += Math.hypot(b.vx * dt, b.vy * dt);
  if (b.life <= 0 || b.trav > b.maxD || b.E < 40) { b.dead = true; return; }
  const W = balRay(sx, sy, ex, ey, b.passR), tw = W.t, wr = W.r, wnx = W.nx, wny = W.ny;
  // props (barrels, signs, bins) along the way up to the wall
  b.x = sx + dx * tw; b.y = sy + dy * tw;
  if (bulletProps(b, sx, sy)) { b.dead = true; return; }
  // zombies along the path before the wall, nearest first. 1.9.998: a 2.0 zombie is hit where its skeleton is (the hit
  // rig, animaRigHit): the round's line at its height must cross a part of it; the old round body only for bosses
  BAL_C.length = 0;
  const l2 = len * len, lim = tw * len, rigOn = BAL.rig !== false && typeof animaRigHit === 'function';
  // (how far above or below its aim this round flies: a normal spread that grows with the range and the gun's kick, m)
  if (b.hn === undefined) b.hn = balGauss();
  const hsd = 0.11 + (b.trav / balUPM()) * 0.009 + (p && p.bloom || 0) * 1.6;
  if (len > 0.01) near((sx + b.x) / 2, (sy + b.y) / 2, 64 + lim / 2, z => {
    if (z.dead || (b.hit && b.hit.indexOf(z) >= 0)) return;
    const rig = rigOn && z.m.v2 && !z.boss, rr = rig ? z.r * 3.3 + 2 : z.r + 2, u = Math.max(0, Math.min(1, ((z.x - sx) * dx + (z.y - sy) * dy) / l2)), qx = sx + dx * u, qy = sy + dy * u, ox = z.x - qx, oy = z.y - qy, d2 = ox * ox + oy * oy;
    if (d2 > rr * rr || u * len > lim + rr) return;
    if (rig) {
      try {
        animaRigAim(z, BAL_AIM); let hb = (b.crit ? BAL_AIM[1] : BAL_AIM[0]) + b.hn * hsd;
        if (b.h3) { const dm = Math.hypot(z.x - b.h3.x0, z.y - b.h3.y0) / balUPM(); hb = b.h3.h0 + (b.h3.h1 - b.h3.h0) * clamp(dm / b.h3.d1, 0, 3) - fleshGroundY(z) + b.hn * hsd * 0.3; }   // (1.9.9991: the 3D crosshair's line)
        if (!animaRigHit(z, sx, sy, dx, dy, hb, 0.05, !!b.crit, BAL_RH)) { BAL.rigMiss++; return; }
        if (BAL_RH[0] * len > lim + 1) return;
        BAL_C.push(z, BAL_RH[0], BAL_RH[3], -ox, -oy, BAL_RH[1], BAL_RH[2]); BAL.rigHit++; return;
      } catch (e) { BAL.rig = false; balHurt(e); }
    }
    BAL_C.push(z, u, Math.sqrt(d2) / rr, -ox, -oy, -1, 0);
  });
  if (BAL_C.length > 7) {
    // sort the hits by distance along the path (a handful at most)
    const idx = []; for (let i = 0; i < BAL_C.length; i += 7) idx.push(i); idx.sort((a, c) => BAL_C[a + 1] - BAL_C[c + 1]);
    const cp = BAL_C.slice(); BAL_C.length = 0; for (const i of idx) for (let k = 0; k < 7; k++) BAL_C.push(cp[i + k]);
  }
  for (let i = 0; i < BAL_C.length && !b.dead; i += 7) {
    const z = BAL_C[i], u = BAL_C[i + 1], e = BAL_C[i + 2], rg = BAL_C[i + 5], rs = BAL_C[i + 6];
    b.x = sx + dx * u; b.y = sy + dy * u;
    if (z.dead) continue;
    const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp;
    const ca = Math.cos(z.ang), sa = Math.sin(z.ang), front = ux * ca + uy * sa < -0.35;
    // which side of the body it struck (in the zombie's own frame)
    const ly = -BAL_C[i + 3] * sa + BAL_C[i + 4] * ca, side = rg >= 0 && rs ? rs : ly < 0 ? -1 : 1;
    let res, absorb = 650, dmg;
    if (z.m.v2 && !z.boss) {
      const O = balResolve(z, b, e, side, front, rg >= 0 ? RIG_REG[rg] : null);
      dmg = bonusDmg(z, O.dmg); absorb = O.absorb;
      res = hurtZombie(z, dmg, { src: 'bullet', crit: O.reg === 'head' && !O.deflect, kx: ux * S.knock * 0.18, ky: uy * S.knock * 0.18, reg: O.reg, kill: O.kill, cripple: O.cripple, deflect: O.deflect, P: O.P });
      if (O.kill && res === true) { BAL.kills++; if (O.reg === 'head') { BAL.heads++; G.heads = (G.heads || 0) + 1; if (SFX.headshot) SFX.headshot(clamp((z.x - cam.x) / (W / ZOOM / 2), -1, 1)); } }
      if (O.deflect) { (b.hit || (b.hit = [])).push(z); b.E -= absorb; if (b.E < 60) { b.dead = true; break; } continue; }
    } else {
      dmg = bonusDmg(z, b.dmg * Math.sqrt(Math.max(0.1, b.E / Math.max(1, b.E0))));
      res = hurtZombie(z, dmg, { src: 'bullet', crit: b.crit, kx: ux * S.knock, ky: uy * S.knock });
    }
    if (res === 'pass' || !res) continue;
    if (res === 'reflect') { b.dead = true; break; }
    BAL.hits++; if (!b.hc) { b.hc = 1; G.hits = (G.hits || 0) + 1; }   // (a round that hits counts once for accuracy, however many it goes through)
    burst(b.x, b.y, 2, z.m.S.gore, 80, 3, 0.25);
    if (typeof goreHit === 'function') goreHit(z, b.vx, b.vy, dmg, b);
    onHitFx(z, b, dmg);
    (b.hit || (b.hit = [])).push(z);
    if (b.split > 0 && !b.shard) splitBullet(b, z);
    // what the body did not take, it keeps (armour-piercing rounds give up less of it)
    if (b.pierce > 0) { absorb *= 0.4; b.pierce--; }
    const e1 = b.E; b.E -= absorb;
    if (b.E < 70) { b.dead = true; break; }
    const k = Math.sqrt(b.E / e1); b.vx *= k; b.vy *= k; BAL.pen++;
  }
  if (b.dead) return;
  // drag: a round loses speed (and energy with the square of it) the further it flies
  const dk = Math.exp(-b.cd * len / balUPM()); b.vx *= dk; b.vy *= dk; b.E *= dk * dk;
  if (wr) {
    b.x = sx + dx * tw; b.y = sy + dy * tw;
    if (wr.k === 'car') {
      carHit(wr);
      // a car's body slows a round, it rarely stops a rifle's
      if (b.E > 700) { b.E -= 700; const k = Math.sqrt(b.E / (b.E + 700)); b.vx *= k; b.vy *= k; b.passR = wr; b.x += b.vx / Math.hypot(b.vx, b.vy) * 2; b.y += b.vy / Math.hypot(b.vx, b.vy) * 2; burst(b.x, b.y, 2, '#c9ced4', 120, 2, 0.15); return; }
    }
    const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp, cosI = -(ux * wnx + uy * wny);
    // a glancing hit skips off the wall (a ricochet keeps about half its energy); bouncing rounds (a card) always do
    if ((cosI < 0.24 && b.ric < 2 && b.E > 120) || b.bounce > 0) {
      if (!(cosI < 0.24) && b.bounce > 0) b.bounce--;
      const dot = ux * wnx + uy * wny; let rx = ux - 2 * dot * wnx, ry = uy - 2 * dot * wny; const ja = (Math.random() - 0.5) * 0.12, cj = Math.cos(ja), sj = Math.sin(ja); const nx2 = rx * cj - ry * sj, ny2 = rx * sj + ry * cj;
      const k = cosI < 0.24 ? 0.7 : 0.85; b.E *= k * k; b.vx = nx2 * sp * k; b.vy = ny2 * sp * k; b.x += wnx * 1.5; b.y += wny * 1.5; b.ric++; b.hit = null; b.passR = null; BAL.ric++;
      if (typeof goreSparks === 'function') goreSparks(b.x, b.y, Math.atan2(ny2, nx2), 4, ['#fff1b8', '#ffd27a', '#ffffff'], 200); else burst(b.x, b.y, 3, '#ffd27a', 120, 2, 0.15);
      return;
    }
    b.dead = true; burst(b.x, b.y, 3, b.col, 90, 2, 0.2); if (typeof tracerImpact === 'function') tracerImpact(b, wr);
    return;
  }
  b.x = ex; b.y = ey;
  if (b.passR && !pointInRect(b.x, b.y)) b.passR = null;
}
// a teammate's round on this screen: the same ray (walls stop it, the first zombie bleeds and flinches)
function balCos(b, dt) {
  const sx = b.x, sy = b.y, ex = b.x + b.vx * dt, ey = b.y + b.vy * dt; b.life -= dt; b.age = (b.age || 0) + dt;
  if (b.life <= 0) { b.dead = true; return; }
  const W = balRay(sx, sy, ex, ey, null), tw = W.t, dx = ex - sx, dy = ey - sy, l2 = dx * dx + dy * dy, lim = tw * Math.sqrt(l2);
  let best = null, bu = 2;
  near((sx + ex) / 2, (sy + ey) / 2, 64 + Math.sqrt(l2) / 2, z => { if (z.dead) return; const u = Math.max(0, Math.min(1, ((z.x - sx) * dx + (z.y - sy) * dy) / l2)), ox = z.x - sx - dx * u, oy = z.y - sy - dy * u; if (ox * ox + oy * oy > (z.r + 2) * (z.r + 2) || u * Math.sqrt(l2) > lim + z.r) return; if (u < bu) { bu = u; best = z; } });
  if (best) {
    b.x = sx + dx * bu; b.y = sy + dy * bu; b.dead = true; burst(b.x, b.y, 2, best.m.S.gore, 80, 3, 0.25);
    if (typeof goreHit === 'function') goreHit(best, b.vx, b.vy, 12, b);
    // (only a flinch where nobody decides the hit: on the host the real hit, with its region, follows in the teammate's message)
    if (best.m.v2 && NET.role !== 'host') { const r = Math.random(); best.hitReg = r < 0.12 ? 'head' : r < 0.7 ? 'torso' : r < 0.85 ? (Math.random() < 0.5 ? 'armL' : 'armR') : (Math.random() < 0.5 ? 'legL' : 'legR'); best.hitP = 0.8; best.hitT = G.time; best.hitA = Math.atan2(b.vy, b.vx); }
    return;
  }
  if (W.r) { b.x = sx + dx * tw; b.y = sy + dy * tw; b.dead = true; if (typeof tracerImpact === 'function') tracerImpact(b, W.r); return; }
  b.x = ex; b.y = ey;
}
function balHurt(e) {
  const now = performance.now(); coreHurt('BALLISTICS', e); try { console.error(e); } catch (x) { }
  BAL.errT.push(now); while (BAL.errT.length && now - BAL.errT[0] > 10000) BAL.errT.shift();
  if (BAL.errT.length >= 5) { BAL.offUntil = now + 30000; BAL.errT.length = 0; coreRepaired('BALLISTICS', 'Ballistics paused for 30 seconds after errors (the old bullets cover)'); }
}
coreAdd({
  name: 'BALLISTICS', kind: 'sim', ver: 1, needs: ['WORLD'], provides: ['bulletPhysics', 'hitRegions', 'lethality'],
  does: 'Real gun and bullet physics: real muzzle velocities and bullet masses (9 mm, .357, 5.56, 7.62, buckshot), energy and drag, swept rays that find the first wall and the zombies before it front to back, ricochets off glancing walls, rounds slowed by car bodies, recoil that kicks the spread; on the 2.0 zombies, hit regions (head, torso, arms, legs) with real odds: head shots all but always kill, body shots usually do (armour, plates, helmets and shields change that), limbs cripple, and a round that passes through keeps what energy is left.',
  state: () => balUp() ? 'on' : 'off',
  level: () => BAL.shots + ' rounds, ' + BAL.hits + ' hits (' + BAL.reg.head + ' head, ' + BAL.reg.torso + ' body, ' + BAL.reg.arm + ' arm, ' + BAL.reg.leg + ' leg), ' + BAL.kills + ' one-shot kills, ' + BAL.pen + ' through, ' + BAL.ric + ' ricochets, ' + BAL.stopped + ' stopped by armour',
  check: () => { for (const b of G.bullets) if (b.bal && !(b.x === b.x && b.E === b.E)) return 'a round lost its place'; return ''; },
  repair: () => { G.bullets = G.bullets.filter(b => !b.bal || (b.x === b.x && b.E === b.E)); BAL.errT.length = 0; },
  isolate: () => { BAL.offUntil = performance.now() + 60000; }, restore: () => { BAL.offUntil = 0; },
  on: { run: () => { BAL.shots = BAL.hits = BAL.kills = BAL.heads = BAL.ric = BAL.pen = BAL.stopped = 0; BAL.reg = { head: 0, torso: 0, arm: 0, leg: 0 }; } }
});
// CORE v3: bullets decide who lives, so BALLISTICS learns nothing (it must work the same on every device and for
// everyone in co-op); it checks itself instead: its numbers against real rounds at start, its rounds while flying
coreMeta('BALLISTICS', { ver: 2, noLearn: 'Learns nothing on purpose: how a bullet flies and kills has to be the same on every device and for everyone in co-op.',
  check: () => { if (G.bullets.length > 3000) return 'rounds piled up (' + G.bullets.length + ')'; for (const b of G.bullets) if (b.bal && !(b.x === b.x && b.E === b.E)) return 'a round lost its place'; return ''; },
  repair: () => { G.bullets = G.bullets.filter(b => !b.bal || (b.x === b.x && b.E === b.E)); if (G.bullets.length > 3000) G.bullets.splice(0, G.bullets.length - 1500); BAL.errT.length = 0; },
  selfTest: () => {
    const r = [], t = (ok, why) => r.push([ok, why]);
    t(Object.values(BAL_GUN).every(B => B.v > 0 && B.g > 0 && B.cd > 0 && B.max > 0), 'a gun has a missing number');
    const e9 = balE0('pistol'), e5 = balE0('rifle'), e7 = balE0('sniper');
    t(e9 > 400 && e9 < 700, 'the 9 mm round has the wrong energy (' + Math.round(e9) + ' J)');
    t(e5 > 1500 && e5 < 2000, 'the 5.56 round has the wrong energy (' + Math.round(e5) + ' J)');
    t(e7 > 3000 && e7 < 4000, 'the 7.62 round has the wrong energy (' + Math.round(e7) + ' J)');
    t(balE0('sniper') > balE0('rifle') && balE0('rifle') > balE0('pistol'), 'the rounds are in the wrong order of power');
    const bad = r.find(x => !x[0]);
    return { ok: !bad, n: r.length, pass: r.filter(x => x[0]).length, why: bad ? bad[1] : '' };
  } });
