/* ================= arsenal: weapons, cards, chain kills, armory, sound settings ================= */
/* This file is inserted inside the game's closure at build time, so it shares G, $, store and the helpers. */
const WEAPONS = ZW.buildWeapons(), CARDS = ZW.CARDS, WRAR = ZW.RAR;
const guns = new Set(store.get('zc_guns', [0])); guns.add(0);
function saveGuns() { store.set('zc_guns', Array.from(guns)); }
function loadoutId() {
  if (ARMS_ON) { const k = (store.get('zc_arms', null) || {}).p, w = WEAPONS.find(x => x.arms && x.slot === 'primary' && x.arms.key === k) || WEAPONS.find(x => x.arms && x.slot === 'primary'); if (w) return w.id; }   // 1.9.993: the primary you carry
  const id = store.get('zc_loadout', 0); return guns.has(id) && WEAPONS[id] ? id : 0;
}

function newCardStats() {
  return { dmg: 0, rof: 0, multi: 0, burst: 0, flame: 0, pierce: 0, blast: 0, range: 0, crit: 0, critDmg: 0, move: 0, regen: 0, taken: 0, dash: 0, killHeal: 0, lifesteal: 0, burn: 0, slow: 0, freeze: 0, shock: 0, splash: 0, poison: 0, bounce: 0, elite: 0, homing: 0, execute: 0, phoenix: 0, zspeed: 0, split: 0, score: 0, luck: 0, gravity: 0, horde: 0, healMul: 0, jam: 0, vision: 0, hpPerShot: 0, selfDps: 0, zhp: 0, bossHp: 0, thunder: 0, echo: 0, maxHpPct: 0 };
}
// Combine the equipped weapon with every card taken so far into the live stats the game uses.
function recalc(p) {
  const w = p.weapon, c = dashPassive(p.cs, p), fx = w.fx;
  let jam = fx.jamEvery ? Math.round(fx.jamEvery * (1 + Math.max(0, c.rof))) : 0;
  if (c.jam) jam = jam ? Math.min(jam, c.jam) : c.jam;
  p.S = {
    dmg: w.dmg * Math.max(0.15, 1 + c.dmg), rof: w.rof * Math.max(0.25, 1 + c.rof),
    pellets: Math.max(1, w.pellets + c.multi + c.flame), burst: w.burst + c.burst, spread: w.spread,
    speed: w.speed * (1 + Math.max(0, c.range) * 0.3), range: w.range * Math.max(0.4, 1 + c.range),
    pierce: w.pierce + c.pierce, crit: Math.min(0.95, w.crit + c.crit), critMul: w.critMul + c.critDmg,
    knock: w.knock * (dashDef(p).knock || 1), kind: w.kind, blast: w.blast * (1 + c.blast),
    burn: (fx.burn || 0) + c.burn, slow: (fx.slow || 0) + c.slow, freeze: Math.min(0.6, (fx.freeze || 0) + c.freeze), shock: (fx.shock || 0) + c.shock,
    splash: (fx.splash || 0) + c.splash, poison: (fx.poison || 0) + c.poison, bounce: (fx.bounce || 0) + c.bounce,
    homing: (fx.homing || 0) + c.homing, lifesteal: (fx.lifesteal || 0) + c.lifesteal, split: (fx.split || 0) + c.split,
    execute: (fx.execute || 0) + c.execute, gravity: (fx.gravity || 0) + c.gravity, echo: fx.echo || c.echo || 0, boomerang: fx.boomerang || 0,
    volatile: fx.volatile || 0, thunder: fx.thunder || c.thunder || 0, elite: c.elite, jamEvery: jam
  };
  p.speed = 172 * w.move * Math.max(0.4, 1 + c.move);
  p.dashCd = 2.4 * Math.max(0.35, 1 - c.dash);
  p.healMul = Math.max(0, 1 + c.healMul);
  p.regen = c.regen; p.killHeal = c.killHeal + (fx.killHeal || 0);
  p.taken = Math.max(0.3, 1 + c.taken + (fx.taken || 0));
  p.scoreMul = 1 + c.score + (fx.score || 0);
  p.luck = c.luck + (fx.luck || 0);
  p.vision = c.vision;
  G.zsMul = Math.max(0.5, 1 + c.zspeed);
  G.hordeMul = 1 + c.horde;
  p.hpPerShot = c.hpPerShot; p.selfDps = c.selfDps;
  G.zhpMul = c.zhp; G.bossHpMul = c.bossHp;
}
function healPlayer(a) { const p = G.p; if (!p || a <= 0) return; p.hp = Math.min(p.maxHp, p.hp + a * p.healMul); }

/* ---------- firing ---------- */
// t: the zombie being shot at (null when you aim at nothing); ang: where you are aiming yourself (mouse or stick)
function fireWeapon(t, ang) {
  const p = G.p, S = p.S, a = ang != null ? ang : Math.atan2(t.y - p.y, t.x - p.x);
  p.shots++;
  if (p.hpPerShot) p.hp = Math.max(1, p.hp - p.hpPerShot);
  if (S.thunder && p.shots % 6 === 0 && t) thunderStrike(t);
  volley(a, 1);
  for (let i = 1; i < S.burst; i++) p.queue.push({ t: i * 0.07, mul: 1 });
  if (S.echo) p.queue.push({ t: 0.17, mul: 0.6 });
  if (S.jamEvery && p.shots % S.jamEvery === 0) { p.jamT = 1.2; SFX.jam(); G.texts.push({ x: p.x, y: p.y - 28, t: 0, life: 0.9, s: 'JAMMED', c: '#fff36b' }); }
  if (p.weapon.arms) SFX.shot(p.weapon.arms.snd[0], p.weapon.M.key, p.weapon.arms.snd[1], p.weapon.arms.key); else SFX.shot(p.weapon.F.key, p.weapon.M.key);
  if (typeof swarmHear === 'function') swarmHear(p.x, p.y, p.weapon.F.key);   // hordes in earshot come running
}
function volley(a, mul) {
  const p = G.p, S = p.S, w = p.weapon, n = S.pellets, kind = S.kind, cone = w.F.key === 'shotgun' || kind === 'flame' || !!(w.arms && w.arms.pellets > 1);
  // the muzzle: the gun is drawn from 8 px in front of the player and is GUN_LEN long, pointing along p.aim
  // (if the barrel is poking into a wall, the shot starts from the player so a zombie pinned against the wall still gets hit)
  let md = (10 + (GUN_LEN[w.F.key] || 20)) * PK, mx = p.x + Math.cos(p.aim) * md, my = p.y + Math.sin(p.aim) * md;
  if (pointInRect(mx, my)) { mx = p.x; my = p.y; }
  // the flash, its light, sparks, smoke and brass: each gun its own (the muzzle flash engine)
  if (typeof muzzleShot === 'function') muzzleShot(p, w, a, p.x + Math.cos(p.aim) * md * 0.9, p.y + Math.sin(p.aim) * md * 0.9);
  else luxFlash(p.x + Math.cos(p.aim) * md * 0.8, p.y + Math.sin(p.aim) * md * 0.8, (kind === 'flame' ? 150 : cone ? 330 : 260) * (0.55 + 0.45 * SCL), kind === 'flame' ? '255,150,60' : '255,214,140', 1, 0.09, { shade: true });
  const gap = 0.11 * Math.min(1, 6 / Math.max(1, n));
  for (let i = 0; i < n; i++) {
    let ang = a;
    if (n > 1) ang += cone ? (i / (n - 1) - 0.5) * S.spread : (i - (n - 1) / 2) * gap;
    ang += rand(-1, 1) * (kind === 'flame' ? S.spread * 0.5 : S.spread * 0.35 + 0.012);
    // recoil: the kick of the shots before this one, and a wider spread on the move (real guns only)
    if (typeof balSpread === 'function' && kind === 'bullet') ang += (Math.random() + Math.random() - 1) * balSpread(p, w, S);
    let crit = Math.random() < S.crit; if (p.db.critNext) { p.db.critNext = 0; crit = true; }
    const spd = S.speed * (kind === 'flame' ? rand(0.75, 1.15) : 1), life = S.range / spd;
    G.bullets.push({
      x: mx, y: my, sx: p.x, sy: p.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      dmg: S.dmg * mul * (crit ? S.critMul : 1) * (p.weakT > 0 ? 0.65 : 1) * dashDmgMul(p), crit: crit, pierce: S.pierce, bounce: S.bounce, split: S.split,
      life: life, max: life, hit: null, kind: kind, col: w.color, homing: S.homing, boom: S.boomerang ? 1 : 0, heavy: w.F.key === 'sniper' || w.F.key === 'mk17', fk: w.F.key, mk: w.M.key
    });
    if (typeof balArm === 'function') balArm(G.bullets[G.bullets.length - 1], p, w, S);   // a real round: real speed and energy
    // (1.9.9991) in the 3D view the round flies from the muzzle's height to the crosshair's: it meets the part of a body
    // the crosshair is on (the head when you aim at the head), not a height made up for it
    if (kind === 'bullet' && typeof DEPTH !== 'undefined' && DEPTH.on && typeof HOVER !== 'undefined' && HOVER.aimD > 0) G.bullets[G.bullets.length - 1].h3 = { h0: FLESH && FLESH.muz ? FLESH.muz[1] : fleshGroundY(p) + 1.4, h1: HOVER.aimH, d1: Math.max(0.6, HOVER.aimD), x0: p.x, y0: p.y };
    if (typeof tracerTag === 'function') tracerTag(G.bullets[G.bullets.length - 1], p.shots + i);
  }
  if (typeof balKick === 'function') balKick(p, w);
  p.flashT = 0.05;
  if (NET.started) netShot(a, mx, my, n, S, w);   // co-op: teammates see the shot
}
function thunderStrike(t) {
  const S = G.p.S;
  bolt(t.x + rand(-40, 40), t.y - 460, t.x, t.y, '#e8f0ff'); bolt(t.x + rand(-40, 40), t.y - 460, t.x, t.y, '#a9c6ff');
  ring(t.x, t.y, 6, 70, 0.35, '232,240,255', 4); shakeIt(5); SFX.zap(); SFX.boom(false);
  hurtZombie(t, S.dmg * 4 * (G.p.weakT > 0 ? 0.65 : 1), { src: 'blast', crit: true });
}
function nearestZ(x, y, R, exclude) {
  let best = null, bd = R * R;
  near(x, y, R, o => { if (o.dead || o.illusion || o.st.under || o.st.down > 0 || (exclude && exclude.indexOf(o) >= 0)) return; const d = (o.x - x) * (o.x - x) + (o.y - y) * (o.y - y); if (d < bd) { bd = d; best = o; } });
  return best;
}
function bonusDmg(z, dmg) { const S = G.p.S; if (S.execute && z.hp < z.maxHp * 0.3) dmg *= 1 + S.execute; if (S.elite && (z.boss || z.m.threat >= 7)) dmg *= 1 + S.elite; return dmg; }
function updBullets(dt) {
  const p = G.p, S = p.S;
  for (const b of G.bullets) {
    if (b.dead) continue;
    if (b.cos) { netCosBullet(b, dt); continue; }   // a teammate's shot: drawn, no damage here
    // a real round: the ballistics engine flies it (rays, energy, hit regions, ricochets)
    if (b.bal) { try { balStep(b, dt); } catch (e) { balHurt(e); b.dead = true; } continue; }
    if (b.homing && b.boom !== 2 && (frameNo & 1) === 0) {
      const tg = nearestZ(b.x, b.y, 240, b.hit);
      if (tg) { const ta = Math.atan2(tg.y - b.y, tg.x - b.x), ca = Math.atan2(b.vy, b.vx), na = angLerp(ca, ta, Math.min(1, dt * 14)), sp = Math.hypot(b.vx, b.vy); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; }
    }
    // swept hit test: check the whole path travelled this frame (from the player on the first frame), so fast
    // bullets can't skip over small zombies and point-blank targets inside the muzzle still get hit
    const sx = b.sx !== undefined ? b.sx : b.x, sy = b.sy !== undefined ? b.sy : b.y; b.sx = b.sy = undefined;
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; b.age = (b.age || 0) + dt;
    if (b.life <= 0) {
      if (b.boom === 1) { b.boom = 2; b.life = b.max * 1.5; b.hit = null; continue; }
      if (b.kind === 'grenade') explodeAt(b.x, b.y, b, null);
      b.dead = true; continue;
    }
    if (b.boom === 2) {
      const a = Math.atan2(p.y - b.y, p.x - b.x), sp = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
      if (Math.hypot(p.x - b.x, p.y - b.y) < 18) { b.dead = true; continue; }
    } else if (bulletProps(b, sx, sy)) {
      if (b.kind === 'grenade') explodeAt(b.x, b.y, b, null);
      b.dead = true; continue;
    } else if ((b.wall = pointInRect(b.x, b.y))) {
      if (b.wall.k === 'car' && b.kind !== 'flame') carHit(b.wall);
      if (b.kind === 'grenade') { b.x -= b.vx * dt; b.y -= b.vy * dt; explodeAt(b.x, b.y, b, null); b.dead = true; continue; }
      if (b.bounce > 0 && b.kind !== 'flame') { reflectBullet(b, dt); b.bounce--; continue; }
      b.dead = true; if (b.kind !== 'flame') { burst(b.x, b.y, 3, b.col, 90, 2, 0.2); if (typeof tracerImpact === 'function') tracerImpact(b, b.wall); } continue;
    }
    const dx = b.x - sx, dy = b.y - sy, l2 = dx * dx + dy * dy;
    near((sx + b.x) / 2, (sy + b.y) / 2, 64 + Math.sqrt(l2) / 2, z => {
      if (z.dead || (b.hit && b.hit.indexOf(z) >= 0)) return;
      const rr = z.r + (b.kind === 'flame' ? 8 : 3), u = l2 > 0 ? Math.max(0, Math.min(1, ((z.x - sx) * dx + (z.y - sy) * dy) / l2)) : 1;
      const ex = z.x - (sx + dx * u), ey = z.y - (sy + dy * u); if (ex * ex + ey * ey > rr * rr) return;
      if (b.kind === 'grenade') { explodeAt(b.x, b.y, b, z); b.dead = true; return false; }
      const dmg = bonusDmg(z, b.dmg), sp = Math.hypot(b.vx, b.vy) || 1;
      const res = hurtZombie(z, dmg, { src: 'bullet', crit: b.crit, kx: b.vx / sp * S.knock, ky: b.vy / sp * S.knock });
      if (res === 'pass' || !res) return;
      if (res === 'reflect') { b.dead = true; return false; }
      if (b.kind !== 'flame') burst(b.x, b.y, 2, z.m.S.gore, 80, 3, 0.25);
      if (typeof goreHit === 'function') goreHit(z, b.vx, b.vy, dmg, b);   // the blood engine: this gun on this zombie
      onHitFx(z, b, dmg);
      (b.hit || (b.hit = [])).push(z);
      if (b.split > 0 && !b.shard) splitBullet(b, z);
      if (b.pierce > 0) { b.pierce--; return; }
      if (b.bounce > 0) {
        const tg = nearestZ(b.x, b.y, 260, b.hit);
        if (tg) { b.bounce--; const a = Math.atan2(tg.y - b.y, tg.x - b.x), s2 = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a) * s2; b.vy = Math.sin(a) * s2; b.life = Math.max(b.life, 0.5); return false; }
      }
      b.dead = true; return false;
    });
  }
  G.bullets = G.bullets.filter(b => !b.dead);
  if (G.bullets.length > 700) G.bullets.splice(0, G.bullets.length - 700);
}
function onHitFx(z, b, dmg) {
  const S = G.p.S;
  if (S.burn) { z.burnT = 3; z.burnDps = Math.max(z.burnDps || 0, dmg * 0.22 * S.burn + 2 * S.burn); }
  if (S.poison) { z.poisonT = 4; z.poisonDps = Math.min((z.poisonDps || 0) + dmg * 0.08 * S.poison + 0.5, z.maxHp * 0.3); }
  if (S.slow) { z.slowT = 1.2 + 0.3 * S.slow; z.slowMul = Math.max(0.3, 1 - 0.22 * S.slow); }
  if (S.freeze && !z.boss && Math.random() < S.freeze) { z.stun = Math.max(z.stun, 1); z.frozen = 1; }
  if (S.shock && !b.chained) chainLightning(z, dmg * 0.45, S.shock);
  if (S.splash) splashAt(b.x, b.y, 24 + 14 * S.splash, dmg * 0.4, z, false);
  if (S.gravity) near(b.x, b.y, 70 + 25 * S.gravity, o => { if (o.dead || o.boss || o === z) return; const dx = b.x - o.x, dy = b.y - o.y, d = Math.hypot(dx, dy) || 1; o.kvx += dx / d * 170; o.kvy += dy / d * 170; });
  if (S.lifesteal) healPlayer(dmg * S.lifesteal);
  if (S.volatile && b.crit) splashAt(b.x, b.y, 56, dmg * 0.6, null, true);
}
function chainLightning(z, dmg, n) {
  let from = z; const seen = [z];
  for (let i = 0; i < n; i++) {
    const tg = nearestZ(from.x, from.y, 140, seen); if (!tg) break;
    bolt(from.x, from.y, tg.x, tg.y, '#fff36b'); seen.push(tg); hurtZombie(tg, dmg, { src: 'blast' }); from = tg;
  }
  if (seen.length > 1) SFX.zap();
}
function splashAt(x, y, R, dmg, except, big) {
  near(x, y, R + 30, o => { if (o !== except && !o.dead && Math.hypot(o.x - x, o.y - y) < R + o.r) hurtZombie(o, dmg, { src: 'blast' }); });
  ring(x, y, 4, R, 0.2, big ? '255,120,40' : '255,170,80', big ? 3 : 2);
  if (big) { burst(x, y, 10, '#ffb347', 200, 4, 0.4); SFX.boom(false); }
}
function explodeAt(x, y, b, direct) {
  const R = G.p.S.blast || 60;
  near(x, y, R + 40, o => {
    if (o.dead) return; const d = Math.hypot(o.x - x, o.y - y); if (d > R + o.r) return;
    const dmg = bonusDmg(o, b.dmg * (o === direct ? 1.2 : 1));
    const res = hurtZombie(o, dmg, { src: 'blast', crit: b.crit, kx: (o.x - x) / (d || 1) * 220, ky: (o.y - y) / (d || 1) * 220 });
    if (res === true) onHitFx(o, { x: o.x, y: o.y, crit: b.crit, chained: true }, dmg * 0.6);
  });
  burst(x, y, 24, '#ffb347', 320, 5, 0.5); burst(x, y, 10, '#5a1a10', 200, 7, 0.7); worldBlast(x, y, R * 1.4, null);
  ring(x, y, 8, R, 0.35, '255,140,50', 4); splat(x, y, R * 0.5, 'rgba(20,10,6,0.55)'); shakeIt(6); SFX.boom(true);
}
function splitBullet(b, z) {
  for (let s = -1; s <= 1; s += 2) for (let k = 0; k < b.split; k++) {
    const a = Math.atan2(b.vy, b.vx) + s * (0.5 + k * 0.25), sp = Math.hypot(b.vx, b.vy) * 0.85;
    G.bullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: b.dmg * 0.35, crit: false, pierce: 0, bounce: 0, split: 0, shard: true, life: 0.35, max: 0.35, hit: [z], kind: 'bullet', col: b.col, homing: 0, boom: 0 });
  }
}
function reflectBullet(b, dt) {
  const px = b.x - b.vx * dt, py = b.y - b.vy * dt;
  if (!pointInRect(px, b.y)) b.vx = -b.vx; else if (!pointInRect(b.x, py)) b.vy = -b.vy; else { b.vx = -b.vx; b.vy = -b.vy; }
  b.x = px; b.y = py; b.hit = null; burst(b.x, b.y, 2, b.col, 60, 2, 0.15);
}
// burn and poison ticking on a zombie. Returns true if it died.
function dotZombie(z, dt) {
  let d = 0;
  if (z.burnT > 0) { z.burnT -= dt; d += z.burnDps; if (Math.random() < dt * 12) burst(z.x + rand(-0.5, 0.5) * z.r, z.y + rand(-0.5, 0.5) * z.r, 1, Math.random() < 0.5 ? '#ff9a3a' : '#ffd27a', 40, 3, 0.4); if (z.burnT <= 0) z.burnDps = 0; }
  if (z.poisonT > 0) { z.poisonT -= dt; d += z.poisonDps; if (Math.random() < dt * 6) burst(z.x, z.y, 1, '#9be23a', 30, 3, 0.5); if (z.poisonT <= 0) z.poisonDps = 0; }
  if (d > 0 && !z.st.under && !(z.st.down > 0)) { z.hp -= d * dt; if (z.hp <= 0) { killZombie(z); return true; } }
  return false;
}

/* ---------- chain kills ---------- */
const CHAIN_WINDOW = 2;
const CHAIN_COLORS = ['#f2cc3a', '#ff8a3d', '#ff4d5e', '#c77dff', '#5ff0ff', '#8fe388', '#ffffff', '#ff6ad5'];
const CHAIN_NAMES = { 10: 'Rampage', 25: 'Massacre', 50: 'Unstoppable', 75: 'Godlike', 100: 'Apocalypse', 125: 'Annihilation', 150: 'Extinction', 175: 'Armageddon', 200: 'Ragnarok' };
function chainColor(n) { return CHAIN_COLORS[Math.floor(n / 25) % CHAIN_COLORS.length]; }
function chainKill() {
  G.chain = G.time - G.lastKill < CHAIN_WINDOW ? G.chain + 1 : 1;
  G.lastKill = G.time; if (G.chain > G.bestChain) G.bestChain = G.chain;
  SFX.kill(G.chain);
  const c = G.chain;
  if (c % 25 === 0) { SFX.tierUp(c / 25); if (!RM) G.slowT = 0.55; G.tierFlash = 1; }
  else if (c === 10) SFX.milestone();
  if (CHAIN_NAMES[c] || (c >= 25 && c % 25 === 0)) {
    const el = $('chainPop'); el.textContent = ''; el.style.setProperty('--cc', chainColor(c));
    const b = document.createElement('b'); b.textContent = 'x' + c; const s = document.createElement('span'); s.textContent = CHAIN_NAMES[c] || 'Unreal';
    el.append(b, s); el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    clearTimeout(chainKill.t); chainKill.t = setTimeout(() => { el.hidden = true; }, 1600);
  }
  if (c % airEvery() === 0) grantAir();
  if (c % 100 === 0 && G.mode === 'play') G.skullPending = true;
  return 1 + Math.min(1.5, (c - 1) * 0.02);
}

/* ---------- the skull: forbidden modifications at every 100 chain ---------- */
function openSkull() {
  G.skullPending = false; if (G.mode !== 'play') return;
  G.mode = 'skull'; G.picking = false; joy.active = false; joy.id = null;
  if (G.grab) endGrab(true);
  $('toasts').textContent = ''; $('banner').hidden = true; $('chainPop').hidden = true;
  const ov = $('skull'), sk = $('skullArt'), row = $('skullCards');
  row.textContent = ''; $('skullText').hidden = true; $('skullRefuse').hidden = true; $('skullWheel').hidden = true; $('wheelResult').textContent = ''; $('wheelResult').className = 'wheel-result';
  const wheel = G.chain >= 200; G.wheel = null;
  sk.setAttribute('class', 'skull-art'); $('skullStage').classList.remove('lit'); ov.classList.remove('leaving', 'dealt'); ov.scrollTop = 0; ov.hidden = false;
  $('skullEyebrow').textContent = 'x' + G.chain + ' chain';
  sk.getBoundingClientRect(); sk.classList.add('rise');
  SFX.skull();
  const pool = ZW.FORBIDDEN.slice(); G.skullChoices = [];
  for (let i = 0; i < 3; i++) { const k = Math.floor(Math.random() * pool.length); G.skullChoices.push({ type: 'card', card: pool[k], r: 6 }); pool.splice(k, 1); }
  setTimeout(() => { if (G.mode !== 'skull') return; sk.classList.add('open'); $('skullStage').classList.add('lit'); SFX.jaw(); shakeIt(10); }, RM ? 100 : 1250);
  setTimeout(() => {
    if (G.mode !== 'skull') return;
    $('skullText').hidden = false; ov.classList.add('dealt');
    if (wheel) { $('skullTitle').textContent = 'Spin the wheel of fate'; $('skullSub').textContent = 'Seven prizes. One death. The skull decides.'; buildWheel(); return; }
    $('skullTitle').textContent = 'Choose your custom modification'; $('skullSub').textContent = 'Three forbidden mods. Insane power, brutal curse. Shoot one, or walk away.';
    $('skullRefuse').hidden = false;
    G.skullChoices.forEach((ch, i) => setTimeout(() => SFX.cardIn(i), 90 + i * 140)); setTimeout(() => SFX.rare(6), 420);
    G.skullChoices.forEach((ch, i) => { const b = buildCard(ch, i, chooseForbidden); b.classList.add('from-skull'); row.appendChild(b); });
    setTimeout(() => { const f = row.querySelector('button'); if (f && DEV.kind !== 'touch') f.focus({ preventScroll: true }); }, 60);
  }, RM ? 200 : 2000);
}
function chooseForbidden(i, ev) {
  if (G.mode !== 'skull' || G.picking || !G.skullChoices || !G.skullChoices[i]) return;
  shootCard($('skullCards'), i, ev);
  setTimeout(() => { const ch = G.skullChoices[i]; applyChoice(ch); closeSkull(ch.card.name, ch.card.lore); }, RM ? 350 : 1200);
}
function refuseSkull() {
  if (G.mode !== 'skull' || G.picking) return;
  G.picking = true; SFX.refuse();
  Array.from($('skullCards').children).forEach(c => c.classList.add('gone'));
  setTimeout(() => closeSkull('You refused', 'The skull remembers.'), 450);
}
function closeSkull(title, sub) {
  const ov = $('skull'), sk = $('skullArt');
  sk.classList.remove('open'); sk.classList.add('sink'); $('skullStage').classList.remove('lit'); ov.classList.add('leaving');
  setTimeout(() => {
    ov.hidden = true; ov.classList.remove('leaving'); G.picking = false; G.skullChoices = null;
    if (G.mode !== 'skull') return;
    G.mode = 'play'; G.p.iframe = Math.max(G.p.iframe, 2); G.lastKill = G.time;
    banner(title, sub);
  }, RM ? 150 : 650);
}
$('skullRefuse').addEventListener('click', refuseSkull);

/* ---------- the wheel of fate: every 100 chain from x200 on ---------- */
function buildWheel() {
  const pool = ZW.FORBIDDEN.slice(), good = CARDS.filter(k => k.r === 3 || k.r === 4), segs = [];
  for (let i = 0; i < 4 && pool.length; i++) { const k = Math.floor(Math.random() * pool.length); segs.push({ type: 'card', card: pool[k], r: 6 }); pool.splice(k, 1); }
  for (let i = 0; i < 3 && good.length; i++) { const k = Math.floor(Math.random() * good.length); segs.push({ type: 'card', card: good[k], r: good[k].r }); good.splice(k, 1); }
  // Death Do Us Part raises the Overlord: while the bosses are switched off (2.0 rebuilds them) the wheel has one more prize instead
  if (typeof ZR_BOSSES_OFF !== 'undefined' && ZR_BOSSES_OFF) { if (pool.length) segs.push({ type: 'card', card: pool[(Math.random() * pool.length) | 0], r: 6 }); }
  else segs.push({ ddup: true });
  for (let i = segs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = segs[i]; segs[i] = segs[j]; segs[j] = t; }
  G.wheel = { segs: segs, angle: 0, spinning: false, done: false };
  drawWheel(); $('skullWheel').hidden = false; $('wheelSpin').hidden = false; $('wheelSpin').disabled = false;
  SFX.rare(6);
  clearTimeout(buildWheel.t); buildWheel.t = setTimeout(() => { if (G.wheel && !G.wheel.spinning && G.mode === 'skull') spinWheel(); }, 6000);
}
function drawWheel() {
  const W8 = G.wheel; if (!W8) return;
  const c = $('wheelCv'), g = c.getContext('2d'), n = W8.segs.length, R = 300, S = TAU / n;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 600, 600); g.translate(300, 300);
  W8.segs.forEach((sg, i) => {
    const a0 = -Math.PI / 2 + i * S, a1 = a0 + S;
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, a0, a1); g.closePath();
    g.fillStyle = sg.ddup ? '#050203' : sg.r === 6 ? (i % 2 ? '#6a0c1c' : '#8e1226') : sg.r === 4 ? '#8a6a12' : '#4b2a7a'; g.fill();
    g.strokeStyle = '#1a0a0e'; g.lineWidth = 4; g.stroke();
    g.save(); g.rotate(a0 + S / 2); g.textAlign = 'right'; g.textBaseline = 'middle';
    const label = sg.ddup ? 'DEATH DO US PART' : sg.card.name;
    let fs = sg.ddup ? 26 : 24; do { g.font = (sg.ddup ? 'bold ' : '600 ') + fs + "px 'Chakra Petch', sans-serif"; fs--; } while (g.measureText(label).width > 205 && fs > 12);
    g.fillStyle = sg.ddup ? '#ff2d4a' : '#ffe3e6'; g.fillText(label, R - 20, 0);
    g.restore();
  });
  g.beginPath(); g.arc(0, 0, 54, 0, TAU); g.fillStyle = '#12070a'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#f2cc3a'; g.stroke();
  g.fillStyle = '#ff2d4a'; g.font = "bold 46px 'Saira Stencil One', Impact, sans-serif"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, 3);
}
function spinWheel() {
  const W8 = G.wheel; if (!W8 || W8.spinning || W8.done || G.mode !== 'skull') return;
  W8.spinning = true; $('wheelSpin').disabled = true; clearTimeout(buildWheel.t);
  const n = W8.segs.length, S = 360 / n, di = W8.segs.findIndex(s => s.ddup);
  let k = di >= 0 && Math.random() < 0.25 ? di : Math.floor(Math.random() * n); if (k === di && Math.random() < 0) k = (k + 1) % n;
  const target = 360 * 6 + (360 - (k * S + S / 2)) + rand(-S * 0.3, S * 0.3), dur = RM ? 600 : 4600, t0 = performance.now(), cv = $('wheelCv');
  let lastSeg = -1;
  (function step(now) {
    if (G.mode !== 'skull' || !G.wheel) return;
    const f = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - f, 3.2), ang = target * e;
    cv.style.transform = 'rotate(' + ang.toFixed(2) + 'deg)';
    const seg = Math.floor((((360 - (ang % 360)) % 360) + 360) % 360 / S);
    if (seg !== lastSeg) { lastSeg = seg; SFX.wheelTick(seg); }
    if (f < 1) requestAnimationFrame(step); else landWheel(k);
  })(t0);
}
function landWheel(k) {
  const W8 = G.wheel; W8.done = true; W8.spinning = false; $('wheelSpin').hidden = true;
  const sg = W8.segs[k], res = $('wheelResult');
  if (!sg.ddup) {
    SFX.wheelLand(false); res.textContent = sg.card.name; res.className = 'wheel-result';
    setTimeout(() => { if (G.mode !== 'skull') return; applyChoice(sg); closeSkull(sg.card.name, 'The wheel has spoken'); }, RM ? 400 : 1500);
    return;
  }
  // Death Do Us Part: the skull laughs, bites the screen, and the Overlord rises
  SFX.wheelLand(true); res.textContent = 'Death do us part'; res.className = 'wheel-result ddup';
  const sk = $('skullArt');
  setTimeout(() => { if (G.mode !== 'skull') return; sk.classList.add('open', 'laugh'); SFX.laugh(); shakeIt(6); }, 500);
  setTimeout(() => {
    if (G.mode !== 'skull') return;
    sk.classList.remove('laugh'); sk.classList.add('lunge'); $('skullWheel').hidden = true;
    const b = $('bite'); b.hidden = false; b.className = ''; void b.offsetWidth;
    setTimeout(() => { b.classList.add('chomp'); SFX.bite(); shakeIt(20); }, 220);
    setTimeout(() => { b.classList.add('cracked'); const fl = $('shotFlash'); fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on'); }, 440);
    setTimeout(() => {
      $('skull').hidden = true; sk.setAttribute('class', 'skull-art'); G.picking = false; G.skullChoices = null; G.wheel = null;
      b.classList.add('open'); b.classList.remove('chomp');
      setTimeout(() => { b.hidden = true; b.className = ''; }, 600);
      G.mode = 'play'; G.lastKill = G.time; startOverlord();
    }, 1250);
  }, RM ? 900 : 2300);
}
$('wheelSpin').addEventListener('click', spinWheel);
$('bossLogBtn').addEventListener('click', openBossLog);
$('blClose').addEventListener('click', closeBossLog);
$('blCloseD').addEventListener('click', () => { $('blDetail').hidden = true; });
$('airBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); callAirstrike(); });

/* ---------- cards ---------- */
function rollRarity(luck, boss) {
  const w = [52, 27, 13, 6, 2];
  for (let i = 0; i < Math.min(6, luck); i++) { w[0] *= 0.72; w[2] *= 1.3; w[3] *= 1.4; w[4] *= 1.5; }
  if (boss) { w[0] *= 0.4; w[1] *= 0.8; w[3] *= 2; w[4] *= 2.5; }
  const all = w.concat([G.wave >= 3 ? 9 : 0]);
  let r = Math.random() * all.reduce((a, b) => a + b, 0);
  for (let i = 0; i < all.length; i++) { r -= all[i]; if (r <= 0) return i; }
  return 0;
}
function rollWeaponCard(boss) {
  const p = G.p; let r = rollRarity(p.luck + (boss ? 1 : 0), boss); if (r === 5) r = 3;
  // 1.9.993: a gun found in a run is one of the rebuilt ten you are not carrying; it takes its slot for the run
  if (p.arm) { const carried = p.arm.w.map(x => x.id), pool = ARMS_LIST.filter(x => carried.indexOf(x.id) < 0), w = pick(pool.length ? pool : ARMS_LIST); return { type: 'weapon', w: w, r: w.rarity }; }
  let pool = WEAPONS.filter(w => w.rarity === r && w.id !== p.weapon.id); if (!pool.length) pool = WEAPONS.filter(w => w.id !== p.weapon.id);
  const locked = pool.filter(w => !guns.has(w.id));
  const w = locked.length && Math.random() < 0.7 ? pick(locked) : pick(pool);
  return { type: 'weapon', w: w, r: w.rarity };
}
function rollCards() {
  const p = G.p, boss = G.wave % 5 === 0, out = [], used = new Set();
  const wSlot = boss ? Math.floor(Math.random() * 3) : Math.random() < 0.22 ? Math.floor(Math.random() * 3) : -1;
  let dSlot = Math.random() < (boss ? 0.35 : 0.17) ? Math.floor(Math.random() * 3) : -1; if (dSlot === wSlot) dSlot = (dSlot + 1) % 3;
  if (p.arm) dSlot = -1;   // (the dashes rest while the dodge roll stands in)
  for (let s = 0; s < 3; s++) {
    if (s === wSlot) { out.push(rollWeaponCard(boss)); continue; }
    if (s === dSlot) { out.push(rollDashCard(boss)); continue; }
    let r = rollRarity(p.luck, boss), c = null;
    for (let tries = 0; tries < 12 && !c; tries++) {
      const pool = CARDS.filter(k => k.r === r && !used.has(k.id) && !(k.max && (p.cards[k.id] || 0) >= k.max) && !(k.id === 'medkit' && p.hp > p.maxHp * 0.8));
      if (pool.length) c = pick(pool); else r = r === 5 ? 0 : Math.max(0, r - 1);
    }
    if (!c) c = pick(CARDS.filter(k => k.r === 0 && !used.has(k.id)));
    used.add(c.id); out.push({ type: 'card', card: c, r: c.r });
  }
  return out;
}
function paintWeapon(c, w, cw, ch, sil) {
  if (w.arms) return armsPaint(c, w, cw, ch, sil);   // the rebuilt guns draw themselves (arms.js)
  const d = Math.min(window.devicePixelRatio || 1, 2); c.width = Math.round(cw * d); c.height = Math.round(ch * d);
  c.style.width = cw + 'px'; c.style.height = ch + 'px';
  const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, cw, ch);
  const bx = w.F.box, sc = Math.min(cw / (bx[1] - bx[0] + 8), ch / 58);
  ZW.drawWeapon(g, w, cw / 2 - (bx[0] + bx[1]) / 2 * sc, ch / 2 + sc, sc, sil);
}
function paintIcon(c, tag, color, size) {
  const d = Math.min(window.devicePixelRatio || 1, 2); c.width = c.height = Math.round(size * d);
  c.style.width = c.style.height = size + 'px';
  const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, size, size); ZW.drawCardIcon(g, tag, color, size);
}
const CRACK = '<svg viewBox="-40 -40 80 80" aria-hidden="true"><g stroke="rgba(8,6,4,.9)" stroke-width="1.8" fill="none" stroke-linecap="round"><path d="M0 0 L13 -9 L21 -22 L24 -34"/><path d="M0 0 L-11 -15 L-15 -31"/><path d="M0 0 L-19 5 L-35 3"/><path d="M0 0 L5 18 L3 33"/><path d="M0 0 L20 11 L31 23"/><path d="M-6 -8 L-2 -12 L4 -10"/></g></svg>';
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function buildCard(ch, i, onPick) {
  const p = G.p, R = WRAR[ch.r];
  const b = el('button', 'gcard r-' + ch.r + (ch.type === 'weapon' ? ' weapon' : ch.type === 'dash' ? ' dash' : '')); b.type = 'button';
  b.style.setProperty('--rc', R.color); b.style.setProperty('--d', (0.08 + i * 0.14) + 's');
  const top = el('span', 'gc-top'); top.append(el('em', 'gc-rar', R.name), el('em', 'gc-type', ''), el('kbd', null, String(i + 1)));
  const art = el('canvas', 'gc-art'); art.setAttribute('aria-hidden', 'true');
  const body = el('span', 'gc-body'), name = el('b', 'gc-name', ''), ul = el('ul', 'gc-stats'), notes = el('span', 'gc-notes');
  body.append(name, ul, notes);
  b.append(el('span', 'gc-shine'), top, art, body);
  const li = (t, cls) => { const x = el('li', cls, t); ul.appendChild(x); };
  if (ch.type === 'weapon') {
    const w = ch.w, cur = w.arms && p.arm ? p.arm.w[w.slot === 'primary' ? 0 : 1] : p.weapon;
    top.querySelector('.gc-type').textContent = w.arms ? (w.slot === 'primary' ? 'Primary' : 'Secondary') : guns.has(w.id) ? 'Weapon' : 'New weapon';
    name.textContent = w.name; paintWeapon(art, w, 132, 66, false); art.classList.add('w');
    const cmp = (label, a, bv, fmt) => { const up = a >= bv; li((up ? '▲ ' : '▼ ') + label + ' ' + fmt(a), up ? 'good' : 'bad'); };
    cmp('Damage', w.dmg * w.pellets * w.burst, cur.dmg * cur.pellets * cur.burst, v => Math.round(v));
    cmp('Fire rate', w.rof, cur.rof, v => v.toFixed(1) + '/s');
    cmp('Range', w.range, cur.range, v => Math.round(v));
    if (w.arms) { li(w.arms.cal + ' · ' + w.arms.mag + (w.arms.chamber ? '+1' : '') + ' · replaces your ' + cur.name, 'meta'); notes.append(el('span', 'gc-react', 'Special reload: ' + w.arms.reload.special)); }
    else { li(w.M.desc, 'meta'); notes.append(el('span', 'gc-react', 'Cards: ' + (w.F.reactText + (w.M.reactText ? ' ' + w.M.reactText : '')))); }
  } else if (ch.type === 'dash') {
    const d = ch.d, cur = dashDef(p);
    top.querySelector('.gc-type').textContent = dashes.has(d.id) ? 'Dash' : 'New dash';
    name.textContent = d.name; paintDash(art, d, 84, false);
    li(d.desc, 'good'); li('Passive: ' + d.pas, 'good');
    li('Recharge ' + (p.dashCd * d.cd).toFixed(1) + ' s · replaces ' + cur.name, 'meta');
  } else {
    const c = ch.card, eff = ZW.cardEffects(c, p.weapon);
    top.querySelector('.gc-type').textContent = c.r === 6 ? 'Deadly' : c.r === 5 ? 'Cursed card' : 'Card';
    name.textContent = c.name;
    paintIcon(art, c.icon || (c.r === 5 ? 'curse' : c.tags[0]), R.color, 84);
    eff.lines.forEach(l => { const f = ZW.fmtLine(l); li(f.text, f.good ? 'good' : 'bad'); });
    if (c.max) li('Taken ' + (p.cards[c.id] || 0) + ' of ' + c.max, 'meta');
    if (eff.synergy) notes.append(el('span', 'gc-syn', 'Synergy with your ' + p.weapon.name + ': x1.5'));
    eff.notes.forEach(n => notes.append(el('span', 'gc-react', n)));
  }
  if (ch.card && ch.card.lore) notes.append(el('span', 'gc-lore', ch.card.lore));
  b.addEventListener('click', ev => (onPick || chooseCard)(i, ev));
  return b;
}
function openCards() {
  G.mode = 'upgrade'; G.picking = false;
  $('toasts').textContent = ''; $('banner').hidden = true; hc.combo = false; $('combo').hidden = true; $('chainPop').hidden = true;
  G.upChoices = rollCards();
  $('upEyebrow').textContent = 'Wave ' + G.wave + ' cleared · +' + (G.wave * 100) + ' bonus';
  $('upSub').textContent = 'Your weapon: ' + G.p.weapon.name + '. Shoot the card you want.';
  const row = $('upGrid'); row.textContent = '';
  G.upChoices.forEach((ch, i) => row.appendChild(buildCard(ch, i)));
  showOv('upgrade');
  G.upChoices.forEach((ch, i) => setTimeout(() => SFX.cardIn(i), 90 + i * 140));
  const best = Math.max.apply(null, G.upChoices.map(c => c.r === 5 ? 5 : c.r));
  if (best >= 3) setTimeout(() => SFX.rare(best), 380);
  setTimeout(() => { const f = row.querySelector('button'); if (f && DEV.kind !== 'touch') f.focus({ preventScroll: true }); }, 60);
}
function shootCard(row, i, ev) {
  G.picking = true;
  const cards = Array.from(row.children), card = cards[i], rect = card.getBoundingClientRect();
  let hx = rect.width * rand(0.35, 0.65), hy = rect.height * rand(0.3, 0.5);
  if (ev && ev.detail && ev.clientX) { hx = ev.clientX - rect.left; hy = ev.clientY - rect.top; }
  const hole = el('span', 'bullet-hole'); hole.innerHTML = CRACK; hole.style.left = hx + 'px'; hole.style.top = hy + 'px'; hole.style.transform = 'rotate(' + Math.round(rand(360)) + 'deg)';
  card.appendChild(hole);
  card.style.setProperty('--rot', ((hx < rect.width / 2 ? 1 : -1) * rand(10, 20)).toFixed(1) + 'deg');
  card.classList.add('shot');
  cards.forEach((c, j) => { if (j !== i) c.classList.add('gone'); });
  const fl = $('shotFlash'); fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on');
  SFX.cardShot();
}
function chooseCard(i, ev) {
  if (G.mode !== 'upgrade' || G.picking || !G.upChoices || !G.upChoices[i]) return;
  shootCard($('upGrid'), i, ev);
  setTimeout(() => {
    applyChoice(G.upChoices[i]); G.upChoices = null; G.picking = false;
    if (NET.started) { netPicked(); return; }   // co-op: the next wave starts when the whole team has picked
    showOv(null); startWave(G.wave + 1);
  }, RM ? 350 : 1200);
}
function applyChoice(ch) {
  const p = G.p;
  if (ch.type === 'weapon') { equipWeapon(ch.w); return; }
  if (ch.type === 'dash') { equipDash(ch.d, true); return; }
  const c = ch.card, eff = ZW.cardEffects(c, p.weapon);
  p.cards[c.id] = (p.cards[c.id] || 0) + 1;
  eff.lines.forEach(l => {
    const k = l.k, v = l.v;
    if (k === 'heal') healPlayer(v);
    else if (k === 'maxHp') { p.maxHp = Math.max(20, p.maxHp + v); if (v > 0) p.hp += v; p.hp = Math.min(p.hp, p.maxHp); }
    else if (k === 'maxHpPct') { p.maxHp = Math.max(20, Math.round(p.maxHp * (1 + v))); p.hp = Math.min(p.hp, p.maxHp); }
    else if (k === 'jam') p.cs.jam = p.cs.jam ? Math.min(p.cs.jam, v) : v;
    else if (k === 'vision') p.cs.vision = Math.max(p.cs.vision, v);
    else if (k in p.cs) p.cs[k] += v;
  });
  recalc(p); updWeaponChip();
}
function equipWeapon(w) {
  const p = G.p, isNew = !guns.has(w.id);
  if (w.arms && p.arm) { armsPickup(p, w); return; }
  p.weapon = w; p.shots = 0; p.queue = []; guns.add(w.id); saveGuns(); recalc(p); updWeaponChip();
  if (isNew) { toast('New weapon unlocked · ' + WRAR[w.rarity].name, w.name, WRAR[w.rarity].color); SFX.unlock(); }
}
function updWeaponChip() {
  const p = G.p; if (!p) return;
  paintWeapon($('wIcon'), p.weapon, 48, 22, false);
  const n = $('wName'), R = WRAR[p.weapon.rarity]; n.textContent = p.weapon.name; n.style.color = R.color;
  const r = $('wRar'); if (r) r.textContent = p.weapon.arms ? p.weapon.arms.cal : (R.name || p.weapon.rarity) + ' · ' + (p.weapon.F && p.weapon.F.name ? p.weapon.F.name : '');
  if (p.arm) ARMS.hudK = '';
  $('wChip').style.setProperty('--wr', R.color);
}

/* ---------- build summary (pause screen) ---------- */
function renderBuild() {
  const p = G.p; if (!p) return;
  const w = p.weapon, S = p.S;
  paintWeapon($('bwIcon'), w, 120, 56, false);
  $('bwName').textContent = w.name; const r = $('bwRar'); r.textContent = WRAR[w.rarity].name + ' · ' + w.code; r.style.color = WRAR[w.rarity].color;
  $('bwDesc').textContent = w.arms ? w.arms.desc + ' Special reload: ' + w.arms.reload.special : w.M.desc + ' ' + w.F.reactText;
  const d = dashDef(p), bd = $('bDash'); bd.textContent = ''; const dc = el('canvas'); paintDash(dc, d, 46, false);
  const dt = el('div'); const dn = el('b', null, (d.quiet ? '' : 'Dash: ') + d.name); dn.style.color = d.hex; dt.append(dn, el('p', null, d.quiet ? d.desc : d.desc + ' Passive: ' + d.pas + '.')); bd.append(dc, dt);
  const st = $('bStats'); st.textContent = '';
  [['Damage', Math.round(S.dmg * S.pellets * S.burst)], ['Fire rate', S.rof.toFixed(1) + '/s'], ['Crit', Math.round(S.crit * 100) + '%'], ['Pierce', S.pierce], ['Range', Math.round(S.range)], ['Speed', Math.round(p.speed)]]
    .forEach(x => { const d = el('div'); d.append(el('dt', null, x[0]), el('dd', null, String(x[1]))); st.appendChild(d); });
  const cs = $('bCards'); cs.textContent = '';
  const ids = Object.keys(p.cards);
  if (!ids.length) cs.appendChild(el('span', 'bc-empty', 'No cards yet. Clear a wave to draw some.'));
  ids.forEach(id => { const c = CARDS.find(k => k.id === id); if (!c) return; const s = el('span', 'bc', c.name + (p.cards[id] > 1 ? ' x' + p.cards[id] : '')); s.style.setProperty('--rc', WRAR[c.r].color); cs.appendChild(s); });
}

/* ---------- armory ---------- */
let arFrame = 0, arSpoil = false, arCur = null;
const W_MAX = { dmg: Math.max(...WEAPONS.map(w => w.dmg * w.pellets * w.burst)), rof: Math.max(...WEAPONS.map(w => w.rof)), range: Math.max(...WEAPONS.map(w => w.range)), dps: Math.max(...WEAPONS.map(w => w.dps)) };
// The keeper (keeper.js) runs through his acts while the armory is open; 0.001% of visits his head turns into the skull.
function keeperSkull() { KEEP.skull(); }
function openArmory() { $('armory').hidden = false; $('armory').scrollTop = 0; renderArmory(); KEEP.start(); }
function closeArmory() { $('arDetail').hidden = true; $('armory').hidden = true; KEEP.stop(); refreshTitle(); }
$('keeper').querySelector('.kp-poke').addEventListener('click', () => { SFX.init(); KEEP.poke(); });
function renderArmory() {
  if (ARMS_ON) { renderArmsArmory(); renderArmsSide(); return; }   // 1.9.993: the rebuilt ten (arms.js)
  $('arCount').textContent = guns.size + ' / 250';
  renderArmorySide();
  if (arFrame === 'dash') return renderDashArmory();
  const lw = WEAPONS[loadoutId()], ld = $('arLoadout'); ld.textContent = '';
  const lb = el('b', null, lw.name); lb.style.color = WRAR[lw.rarity].color; ld.append('Starting weapon: ', lb, '. Pick up new weapons from cards during a run to unlock them here.');
  const chips = $('arFrames'); chips.textContent = '';
  ZW.FRAMES.forEach((F, i) => {
    let n = 0; for (let m = 0; m < 25; m++) if (guns.has(i * 25 + m)) n++;
    const b = el('button', 'chip' + (i === arFrame ? ' on' : '')); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', i === arFrame);
    b.append(el('span', null, F.name), el('em', null, n + '/25')); b.addEventListener('click', () => { arFrame = i; renderArmory(); });
    chips.appendChild(b);
  });
  chips.appendChild(dashChip());
  const F = ZW.FRAMES[arFrame], note = $('arFrameNote'); note.textContent = ''; note.append(el('b', null, F.name + '. '), F.desc + ' ' + F.reactText);
  const grid = $('arGrid'); grid.textContent = '';
  for (let m = 0; m < 25; m++) {
    const w = WEAPONS[arFrame * 25 + m], have = guns.has(w.id), show = have || arSpoil, R = WRAR[w.rarity];
    const b = el('button', 'wcard wr-' + w.rarity + ' ' + (have ? 'known' : 'unknown') + (w.id === loadoutId() ? ' equipped' : '')); b.type = 'button'; b.style.setProperty('--rc', R.color);
    const c = el('canvas'); c.setAttribute('aria-hidden', 'true');
    b.append(c, el('span', 'num', w.code), el('span', 'nm', show ? w.name : 'Locked'), el('span', 'rar', R.name));
    if (w.id === loadoutId()) b.append(el('span', 'eq', 'Equipped'));
    b.addEventListener('click', () => openWeaponDetail(w));
    grid.appendChild(b); paintWeapon(c, w, 128, 60, !show);
  }
}
// the loadout panel beside the racks on wide screens: what you start with, how much is unlocked, a word from the keeper
const KEEP_TIPS = ['Legendaries glow. Try not to stare, they get shy.', 'Cards that say "cursed" mean it. Read the small print.', 'Shotguns love close friends. Snipers hate them.', 'The A-10 does not miss. You might, but it does not.', 'A dash is a gun for your feet. Use both.', 'Every weapon reacts to cards in its own way. Check how before you pick.', 'Rivers slow you down. They slow them down too. Mostly.', 'If the skull offers you a deal, count your fingers after.', 'Burst rifles hate wasted bullets. Aim, then hold.', 'Clean your rifle. Mine has never jammed. Today.'];
function renderArmorySide() {
  const S = $('arSide'); if (!S) return;
  S.textContent = '';
  const lw = WEAPONS[loadoutId()], R = WRAR[lw.rarity];
  const eq = el('section', 'ar-card ar-eq'); eq.style.setProperty('--rc', R.color);
  const h = el('h3'); h.append(el('span', null, 'Starting weapon'), el('em', null, lw.code)); eq.append(h);
  const c = el('canvas'); c.setAttribute('aria-hidden', 'true'); eq.append(c); paintWeapon(c, lw, 300, 110, false); c.style.width = '100%'; c.style.height = 'auto';
  eq.append(el('b', null, lw.name), el('span', 'rr', R.name + ' · ' + ZW.FRAMES[Math.floor(lw.id / 25)].name), el('p', null, lw.M.name + ' mod: ' + lw.M.desc));
  const bars = el('div', 'ar-bars');
  [['Damage', lw.dmg * lw.pellets * lw.burst / W_MAX.dmg, Math.round(lw.dmg * lw.pellets * lw.burst)], ['Fire rate', lw.rof / W_MAX.rof, lw.rof.toFixed(1) + '/s'], ['Range', lw.range / W_MAX.range, Math.round(lw.range)], ['Power', lw.dps / W_MAX.dps, Math.round(lw.dps)]]
    .forEach(([k, f, v]) => { const d = el('div'), tr = el('i'), fl = el('s'); fl.style.width = Math.round(clamp(f, 0.03, 1) * 100) + '%'; tr.append(fl); d.append(el('span', null, k), tr, el('em', null, String(v))); bars.append(d); });
  eq.append(bars); S.append(eq);
  const cd = DASH_BY[dashLoadout()], ds = el('section', 'ar-card');
  const dh = el('h3'); dh.append(el('span', null, 'Starting dash'), el('em', null, DASH_RAR[cd.r])); ds.append(dh);
  const dr = el('div', 'ar-dash'), dc = el('canvas'); dc.setAttribute('aria-hidden', 'true'); paintDash(dc, cd, 52, false);
  const dt = el('div'), dn = el('b', null, cd.name); dn.style.color = cd.hex; dt.append(dn, el('p', null, cd.desc));
  dr.append(dc, dt); ds.append(dr); S.append(ds);
  const col = el('section', 'ar-card'), ch = el('h3'); ch.append(el('span', null, 'Collection'), el('em', null, guns.size + ' / 250')); col.append(ch);
  const list = el('div', 'ar-col');
  WRAR.forEach((rr, ri) => {
    let tot = 0, have = 0; for (const w of WEAPONS) if (w.rarity === ri) { tot++; if (guns.has(w.id)) have++; }
    if (!tot) return;
    const d = el('div'); d.style.setProperty('--rc', rr.color); const tr = el('i'), fl = el('s'); fl.style.width = (have / tot * 100).toFixed(1) + '%'; tr.append(fl);
    d.append(el('span', null, rr.name), tr, el('em', null, have + '/' + tot)); list.append(d);
  });
  { const d = el('div'); d.style.setProperty('--rc', '#29e6ff'); const tr = el('i'), fl = el('s'); fl.style.width = (dashes.size / 25 * 100).toFixed(1) + '%'; tr.append(fl); d.append(el('span', null, 'Dashes'), tr, el('em', null, dashes.size + '/25')); list.append(d); }
  col.append(list); S.append(col);
  const tip = el('p', 'ar-tip', KEEP_TIPS[Math.floor(Math.random() * KEEP_TIPS.length)]); tip.append(el('small', null, 'The keeper')); S.append(tip);
}
function dashChip() {
  const b = el('button', 'chip dchip' + (arFrame === 'dash' ? ' on' : '')); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', arFrame === 'dash');
  b.append(el('span', null, 'Dashes'), el('em', null, dashes.size + '/25')); b.addEventListener('click', () => { arFrame = 'dash'; renderArmory(); });
  return b;
}
function renderDashArmory() {
  $('arCount').textContent = dashes.size + ' / 25';
  const ld = $('arLoadout'); ld.textContent = ''; const cur = DASH_BY[dashLoadout()];
  const lb = el('b', null, cur.name); lb.style.color = cur.hex; ld.append('Starting dash: ', lb, '. Find new dashes on cards during a run to unlock them here.');
  const chips = $('arFrames'); chips.textContent = '';
  ZW.FRAMES.forEach((F, i) => { let n = 0; for (let m = 0; m < 25; m++) if (guns.has(i * 25 + m)) n++; const b = el('button', 'chip'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', 'false'); b.append(el('span', null, F.name), el('em', null, n + '/25')); b.addEventListener('click', () => { arFrame = i; renderArmory(); }); chips.appendChild(b); });
  chips.appendChild(dashChip());
  const note = $('arFrameNote'); note.textContent = ''; note.append(el('b', null, 'Dashes. '), 'Every dash does something to you and the zombies around you, and has a passive that is always on.');
  const grid = $('arGrid'); grid.textContent = '';
  DASHES.forEach(d => {
    const have = dashes.has(d.id), show = have || arSpoil, R = WRAR[d.r];
    const b = el('button', 'wcard dcard wr-' + d.r + ' ' + (have ? 'known' : 'unknown') + (d.id === cur.id ? ' equipped' : '')); b.type = 'button'; b.style.setProperty('--rc', R.color);
    const c = el('canvas'); c.setAttribute('aria-hidden', 'true'); paintDash(c, d, 56, !show);
    b.append(c, el('span', 'num', 'DSH-' + String(d.i + 1).padStart(2, '0')), el('span', 'nm', show ? d.name : 'Locked'), el('span', 'rar', DASH_RAR[d.r]));
    if (d.id === cur.id) b.append(el('span', 'eq', 'Equipped'));
    b.addEventListener('click', () => openDashDetail(d)); grid.appendChild(b);
  });
}
function openDashDetail(d) {
  arCur = { dash: d }; const have = dashes.has(d.id), show = have || arSpoil, det = $('arDetail');
  det.style.setProperty('--rc', WRAR[d.r].color);
  const art = $('awArt'); const k = Math.min(window.devicePixelRatio || 1, 2); art.width = 260 * k; art.height = 110 * k; art.style.width = '260px'; art.style.height = '110px';
  const g = art.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, 260, 110); g.save(); g.translate(130 - 50, 5); drawDashIcon(g, d, 100, !show); g.restore();
  $('awTag').textContent = 'DSH-' + String(d.i + 1).padStart(2, '0') + ' · ' + DASH_RAR[d.r] + ' dash'; $('awName').textContent = show ? d.name : 'Locked dash';
  $('awMod').textContent = show ? 'When you dash: ' + d.desc : 'Find this dash on a card during a run to unlock it.';
  $('awReact').textContent = show ? 'Passive: ' + d.pas + '.' : '';
  const bars = $('awBars'); bars.textContent = '';
  [['Recharge', 1 / d.cd / 1.2, (2.4 * d.cd).toFixed(1) + ' s'], ['Distance', Math.min(1, d.spd * d.dur / 260), d.spd ? Math.round(d.spd * d.dur) : 'Teleport'], ['Untouchable', d.ifr / 0.8, d.ifr.toFixed(2) + ' s']]
    .forEach(r => { const row = el('div', 'bar-row'), t = el('div', 'track'), f = el('i'); f.style.width = show ? Math.round(Math.min(1, r[1]) * 100) + '%' : '0%'; t.appendChild(f); row.append(el('span', null, r[0]), t, el('em', null, show ? String(r[2]) : '?')); bars.appendChild(row); });
  const eq = $('awEquip'); eq.hidden = !have; eq.disabled = d.id === dashLoadout(); eq.textContent = d.id === dashLoadout() ? 'Equipped' : 'Start runs with this';
  det.hidden = false; det.scrollTop = 0;
}
function openWeaponDetail(w) {
  arCur = w; const have = guns.has(w.id), show = have || arSpoil, R = WRAR[w.rarity], d = $('arDetail');
  d.style.setProperty('--rc', R.color);
  paintWeapon($('awArt'), w, 260, 110, !show);
  $('awTag').textContent = w.code + ' · ' + R.name; $('awName').textContent = show ? w.name : 'Locked weapon';
  $('awMod').textContent = show ? w.M.name + ' mod: ' + w.M.desc : 'Find this weapon on a card during a run to unlock it.';
  $('awReact').textContent = show ? 'How it reacts to cards: ' + w.F.reactText + (w.M.reactText ? ' ' + w.M.reactText : '') : '';
  const bars = $('awBars'); bars.textContent = '';
  [['Damage', w.dmg * w.pellets * w.burst / W_MAX.dmg, Math.round(w.dmg * w.pellets * w.burst)], ['Fire rate', w.rof / W_MAX.rof, w.rof.toFixed(1) + '/s'], ['Range', w.range / W_MAX.range, Math.round(w.range)], ['Power', w.dps / W_MAX.dps, Math.round(w.dps)]]
    .forEach(r => { const row = el('div', 'bar-row'), t = el('div', 'track'), f = el('i'); f.style.width = show ? Math.round(r[1] * 100) + '%' : '0%'; t.appendChild(f); row.append(el('span', null, r[0]), t, el('em', null, show ? String(r[2]) : '?')); bars.appendChild(row); });
  const eq = $('awEquip'); eq.hidden = !have; eq.disabled = w.id === loadoutId(); eq.textContent = w.id === loadoutId() ? 'Equipped' : 'Start runs with this';
  d.hidden = false; d.scrollTop = 0;
}
$('awEquip').addEventListener('click', () => {
  if (ARMS_ON && armsCur) { armsEquipCur(); return; }
  if (arCur && arCur.dash) { if (!dashes.has(arCur.dash.id)) return; store.set('zc_dash', arCur.dash.id); SFX.click(); openDashDetail(arCur.dash); renderArmory(); KEEP.approve(); return; }
  if (!arCur || !guns.has(arCur.id)) return; store.set('zc_loadout', arCur.id); SFX.click(); openWeaponDetail(arCur); renderArmory(); KEEP.approve();
});
$('awClose').addEventListener('click', () => { $('arDetail').hidden = true; });
$('armoryBtn').addEventListener('click', openArmory); $('arClose').addEventListener('click', closeArmory);
$('arSpoil').addEventListener('change', e => { arSpoil = e.target.checked; renderArmory(); });

/* ---------- sound settings and the radio, FM 66.6 ---------- */
const AUD = store.get('zc_audio', { sfx: true, music: 'builtin' });
if (!AUD.vis) AUD.vis = RM ? 'low' : 'full';
SFX.setSfx(AUD.sfx);
// the radio remembers its source, channel, the song on each channel and mute between visits
SFX.fm.setState(Object.assign({ mode: AUD.music === 'off' ? 'off' : AUD.music === 'custom' ? 'bt' : 'radio' }, store.get('zc_radio', null) || {}));
function idb(op, key, val) {
  return new Promise(res => {
    try {
      const rq = indexedDB.open('zombiecity', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
      rq.onerror = () => res(null);
      rq.onsuccess = () => {
        try {
          const tx = rq.result.transaction('kv', op === 'get' ? 'readonly' : 'readwrite'), st = tx.objectStore('kv');
          const r = op === 'get' ? st.get(key) : op === 'del' ? st.delete(key) : st.put(val, key);
          r.onsuccess = () => res(r.result || null); r.onerror = () => res(null);
        } catch (e) { res(null); }
      };
    } catch (e) { res(null); }
  });
}
// Bluetooth: the player's own songs, kept on the device (the single song from older versions moves into the playlist)
let BT = [];
idb('get', 'playlist').then(async list => {
  if (!Array.isArray(list)) {
    const old = await idb('get', 'music');
    list = old && old.blob ? [{ name: old.name || 'Your music', blob: old.blob }] : [];
    if (list.length) { idb('put', 'playlist', list); idb('del', 'music'); }
  }
  BT = list.filter(x => x && x.blob);
  SFX.fm.btSet(BT); renderAudio();
});
function saveBT() { if (BT.length) idb('put', 'playlist', BT.filter(x => x.blob.size < 60e6).slice(-40)); else idb('del', 'playlist'); }

const IC = {
  prev: '<svg viewBox="0 0 24 24"><path d="M15 5 L8 12 L15 19"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M9 5 L16 12 L9 19"/></svg>',
  skip: '<svg viewBox="0 0 24 24"><path class="fill" d="M5 5.5 L14.5 12 L5 18.5 Z"/><path d="M18 5.5 V18.5"/></svg>',
  vol: '<svg viewBox="0 0 24 24"><path class="fill" d="M3 9 H7 L12 5 V19 L7 15 H3 Z"/><path d="M15.5 9 Q17.5 12 15.5 15 M18.5 6.5 Q22 12 18.5 17.5"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path class="fill" d="M3 9 H7 L12 5 V19 L7 15 H3 Z"/><path d="M16 9.5 L21 14.5 M21 9.5 L16 14.5"/></svg>',
  radio: '<svg viewBox="0 0 24 24"><path d="M5 9 L18 3.5"/><rect x="2.5" y="9" width="19" height="12" rx="2"/><circle cx="8.5" cy="15" r="3"/><path d="M14.5 13 H19 M14.5 16.5 H19"/></svg>',
  bt: '<svg viewBox="0 0 24 24"><path d="M7 7.5 L17 16 L12 20.5 V3.5 L17 8 L7 16.5"/></svg>',
  off: '<svg viewBox="0 0 24 24"><path d="M12 3 V11"/><path d="M6.5 6.5 A8 8 0 1 0 17.5 6.5"/></svg>'
};
const STRIPS = [];
function radioStrip(box, mini, onLcd) {
  const r = el('div', 'radio' + (mini ? ' mini' : ''));
  const lcd = el(onLcd ? 'button' : 'div', 'lcd');
  if (onLcd) { lcd.type = 'button'; lcd.setAttribute('aria-label', 'Open the radio'); lcd.addEventListener('click', () => { SFX.click(); onLcd(); }); }
  const fq = el('div', 'lcd-freq'), fs = el('small', null, 'FM'), fb = el('b', null, '66.6'); fq.append(fs, fb);
  const ch = el('div', 'lcd-ch'), chn = el('span'), tag = el('i', 'lcd-tag', 'ST'); ch.append(chn, tag);
  const song = el('div', 'lcd-song'), ss = el('span'); song.append(ss);
  const eq = document.createElement('canvas'); eq.className = 'lcd-eq'; eq.width = 180; eq.height = 24; eq.setAttribute('aria-hidden', 'true');
  lcd.append(fq, ch, song, eq);
  const keys = el('div', 'radio-keys');
  const mk = (label, svg, fn) => {
    const b = el('button', 'rkey'); b.type = 'button'; b.setAttribute('aria-label', label); b.innerHTML = svg;
    b.addEventListener('click', e => { e.stopPropagation(); SFX.init(); fn(); SFX.click(); hudRadioPoke(); }); keys.append(b); return b;
  };
  const S = { r, lcd, fs, fb, chn, tag, song, ss, eq, key: '', col: '#7dffb0', vis: false };
  S.kPrev = mk('Previous channel', IC.prev, () => SFX.fm.step(-1));
  S.kNext = mk('Next channel', IC.next, () => SFX.fm.step(1));
  S.kSkip = mk('Next song', IC.skip, () => SFX.fm.skip());
  S.kMute = mk('Mute the radio', IC.vol, () => { SFX.fm.mute(); });
  r.append(lcd, keys); box.append(r); STRIPS.push(S);
  paintStrip(S, SFX.fm.info()); eqKick();
  return S;
}
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function paintStrip(S, i) {
  const bt = i.mode === 'bt', off = i.mode === 'off';
  S.r.classList.toggle('bt', bt); S.r.classList.toggle('off', off); S.r.classList.toggle('muted', i.muted && !off);
  S.lcd.classList.toggle('tuning', i.tuning);
  S.col = off || i.muted ? '#ff8a7a' : bt ? '#7cc4ff' : '#7dffb0';
  let line;
  if (off) { S.fs.textContent = 'FM'; S.fb.textContent = '--.-'; S.chn.textContent = 'Radio off'; line = 'Press a button to tune in'; }
  else if (bt) { S.fs.textContent = 'SRC'; S.fb.textContent = 'BT'; S.chn.textContent = 'Bluetooth'; line = i.bt.count ? i.bt.name : 'No songs yet'; }
  else { S.fs.textContent = 'FM'; S.fb.textContent = '66.6'; S.chn.textContent = 'CH' + (i.ch + 1) + ' ' + i.chName; line = i.tuning ? 'Tuning ...' : i.song + '  ·  ' + pad2(i.n) + '/' + i.total; }
  S.tag.textContent = i.muted ? 'Mute' : bt ? (i.bt.count ? (i.bt.i + 1) + '/' + i.bt.count : '0') : off ? 'Off' : 'ST';
  S.tag.classList.toggle('lit', !off && (i.muted || !i.tuning));
  if (S.ss.textContent !== line) { S.ss.textContent = line; S.song.classList.remove('scroll'); requestAnimationFrame(() => marquee(S)); }
  S.kMute.innerHTML = i.muted ? IC.mute : IC.vol; S.kMute.classList.toggle('on', i.muted);
  S.kMute.setAttribute('aria-label', i.muted ? 'Unmute the radio' : 'Mute the radio'); S.kMute.setAttribute('aria-pressed', String(i.muted));
  S.kPrev.setAttribute('aria-label', bt ? 'Previous song' : 'Previous channel'); S.kNext.setAttribute('aria-label', bt ? 'Next song' : 'Next channel');
}
function marquee(S) {
  const over = S.ss.scrollWidth - S.song.clientWidth;
  if (over > 4) { S.song.style.setProperty('--w', -(over + 8) + 'px'); S.song.style.setProperty('--dur', Math.max(6, over / 18 + 4) + 's'); S.song.classList.add('scroll'); }
}
// the little spectrum on every visible radio display
let eqOn = false, eqN = 0;
function eqKick() { if (!eqOn) { eqOn = true; requestAnimationFrame(eqLoop); } }
function eqLoop() {
  eqN++;
  if (eqN % 20 === 1) for (const S of STRIPS) S.vis = !!(S.r.isConnected && S.r.offsetParent);
  const live = STRIPS.filter(S => S.vis);
  if (!live.length && eqN % 20 !== 0) { requestAnimationFrame(eqLoop); return; }
  const v = SFX.viz(), sp = v.spec, on = v.live && sp;
  for (const S of live) {
    const g = S.eq.getContext('2d'), w = S.eq.width, h = S.eq.height, n = 18, bw = w / n;
    g.clearRect(0, 0, w, h); g.fillStyle = S.col;
    for (let k = 0; k < n; k++) {
      const b0 = Math.floor(1.5 * Math.pow(1.27, k)), b1 = Math.max(b0 + 1, Math.floor(1.5 * Math.pow(1.27, k + 1)));
      let a = 0; if (on) { for (let j = b0; j < b1 && j < sp.length; j++) a += sp[j]; a /= (b1 - b0) * 255; }
      const lv = Math.max(on ? 0.06 : 0.04, Math.min(1, a * 1.15));
      const segs = Math.round(lv * 6);
      for (let q = 0; q < 6; q++) { g.globalAlpha = q < segs ? 0.95 : 0.12; g.fillRect(k * bw + 1, h - (q + 1) * (h / 6) + 1, bw - 2, h / 6 - 1.5); }
    }
    g.globalAlpha = 1;
  }
  requestAnimationFrame(eqLoop);
}
// "now playing": a slip that slides in whenever a new song starts
let tkKey = '', tkT = 0;
function fmTicker(i) {
  if (i.mode === 'off' || (i.mode === 'radio' && i.tuning)) return;
  const key = i.mode + '|' + (i.mode === 'bt' ? i.bt.name : i.ch + '|' + i.song);
  if (key === tkKey) return; tkKey = key;
  if (G.mode === 'intro' || !$('radioPanel').hidden || (i.mode === 'bt' && !i.bt.count)) return;
  const t = $('fmTicker'); t.textContent = '';
  const fq = el('div', 'tk-freq'); fq.append(el('span', null, i.mode === 'bt' ? 'SRC' : 'FM'), el('b', null, i.mode === 'bt' ? 'BT' : '66.6'));
  const tx = el('div', 'tk-txt'); tx.append(el('small', null, i.mode === 'bt' ? 'Bluetooth · your music' : 'CH' + (i.ch + 1) + ' · ' + i.chName + ' · ' + i.genre), el('strong', null, i.mode === 'bt' ? i.bt.name : i.song));
  const bars = el('div', 'tk-bars'); for (let k = 0; k < 4; k++) bars.append(el('i'));
  t.append(fq, tx, bars);
  t.classList.toggle('bt', i.mode === 'bt'); t.classList.toggle('hud', !$('hud').hidden); t.classList.toggle('boss', !!(G.boss && !G.boss.dead));
  t.classList.remove('out'); t.hidden = true; void t.offsetWidth; t.hidden = false;
  clearTimeout(tkT); tkT = setTimeout(() => { t.classList.add('out'); tkT = setTimeout(() => { t.hidden = true; }, 450); }, 3800);
}
// the radio panel
function openRadio() { SFX.init(); renderRadioPanel(); $('radioPanel').hidden = false; $('fmTicker').hidden = true; SFX.click(); }
function closeRadio() { $('radioPanel').hidden = true; }
let RP = null;
function renderRadioPanel() {
  if (!RP) {
    RP = { strip: radioStrip($('rpStrip'), false, null), src: {}, pre: [] };
    const srcBox = $('rpSource');
    [['radio', 'Radio', IC.radio], ['bt', 'Bluetooth', IC.bt], ['off', 'Off', IC.off]].forEach(([m, label, ic]) => {
      const b = el('button'); b.type = 'button'; b.innerHTML = ic; b.append(label);
      b.addEventListener('click', () => {
        SFX.init(); SFX.click();
        if (m === 'bt' && !BT.length) { $('musicFile').click(); return; }
        if (m === 'radio' && SFX.fm.muted()) SFX.fm.mute(false);
        SFX.fm.mode(m);
      });
      srcBox.append(b); RP.src[m] = b;
    });
    SFX.fm.info().channels.forEach((c, k) => {
      const b = el('button', 'preset'); b.type = 'button';
      b.append(el('kbd', null, String(k + 1)), el('b', null, c.name), el('small', null, c.genre));
      b.addEventListener('click', () => { SFX.init(); SFX.click(); if (SFX.fm.muted()) SFX.fm.mute(false); SFX.fm.channel(k); });
      $('rpPresets').append(b); RP.pre.push(b);
    });
    $('rpClose').addEventListener('click', closeRadio);
    $('radioPanel').addEventListener('click', e => { if (e.target === $('radioPanel')) closeRadio(); });
  }
  paintRadioPanel(SFX.fm.info());
}
function paintRadioPanel(i) {
  if (!RP) return;
  for (const m in RP.src) { RP.src[m].classList.toggle('on', i.mode === m); RP.src[m].setAttribute('aria-pressed', String(i.mode === m)); }
  RP.pre.forEach((b, k) => { b.classList.toggle('on', i.mode === 'radio' && i.ch === k); b.setAttribute('aria-pressed', String(i.mode === 'radio' && i.ch === k)); });
  const box = $('rpBt'); box.hidden = i.mode !== 'bt' && !BT.length; box.textContent = '';
  box.append(el('p', 'sub-eyebrow', BT.length ? 'Bluetooth · ' + BT.length + ' song' + (BT.length > 1 ? 's' : '') + ' on this device' : 'Bluetooth · your music'));
  if (BT.length) {
    const ol = el('ol');
    BT.forEach((s, k) => {
      const li = el('li'), b = el('button', i.mode === 'bt' && i.bt.i === k ? 'on' : ''); b.type = 'button';
      b.append(el('em', null, pad2(k + 1)), el('span', null, s.name));
      b.addEventListener('click', () => { SFX.init(); SFX.click(); if (SFX.fm.muted()) SFX.fm.mute(false); SFX.fm.btPick(k); });
      li.append(b); ol.append(li);
    });
    box.append(ol);
  }
  const row = el('div', 'btns');
  const add = el('button', 'btn small', BT.length ? 'Add songs' : 'Choose songs'); add.type = 'button'; add.addEventListener('click', () => $('musicFile').click());
  row.append(add);
  if (BT.length) { const clr = el('button', 'btn small ghost', 'Remove all'); clr.type = 'button'; clr.addEventListener('click', () => { BT = []; saveBT(); SFX.fm.btSet(BT); SFX.click(); }); row.append(clr); }
  box.append(row);
  const more = $('rpMore'); more.textContent = ''; audioToggles(more);
}
// under the radio: music and effects volume, and the way into every sound setting
function audioToggles(box) {
  for (const id of ['volMusic', 'volSfx']) { const r = SET_ROWS.find(x => x.id === id), row = settingRow(r); row.classList.add('mini'); box.append(row); }
  const b = el('button', 'btn small', 'All sound settings'); b.type = 'button';
  b.addEventListener('click', () => { closeRadio(); openSettings('sound'); });
  box.append(b);
}
// the HUD: a radio button next to pause that drops down a small radio
let hudStrip = null, hudT = 0;
function toggleHudRadio(open) {
  const d = $('hudRadio'), b = $('radioBtn'); open = open == null ? d.hidden : open;
  if (open && !hudStrip) hudStrip = radioStrip(d, true, null);
  d.hidden = !open; b.setAttribute('aria-expanded', String(open));
  if (open) { SFX.init(); hudRadioPoke(); eqKick(); }
}
function hudRadioPoke() { clearTimeout(hudT); if (!$('hudRadio').hidden) hudT = setTimeout(() => toggleHudRadio(false), 6000); }
$('radioBtn').addEventListener('click', e => { e.stopPropagation(); SFX.click(); toggleHudRadio(); });
$('cv').addEventListener('pointerdown', () => { if (!$('hudRadio').hidden) toggleHudRadio(false); });
function paintHudBtn(i) { const b = $('radioBtn'); b.classList.toggle('bt', i.mode === 'bt'); b.classList.toggle('off', i.mode === 'off'); b.classList.toggle('muted', i.muted); b.setAttribute('aria-label', 'Radio: ' + (i.mode === 'off' ? 'off' : i.mode === 'bt' ? 'Bluetooth' : i.chName) + (i.muted ? ', muted' : '')); }
let fmSave = 0;
SFX.fm.onChange(i => {
  for (const S of STRIPS) paintStrip(S, i);
  paintRadioPanel(i); paintHudBtn(i); fmTicker(i);
  AUD.music = i.mode === 'off' ? 'off' : i.mode === 'bt' ? 'custom' : 'builtin';
  clearTimeout(fmSave); fmSave = setTimeout(() => { store.set('zc_radio', SFX.fm.state()); store.set('zc_audio', AUD); }, 400);
});
function renderAudio() {
  if (!$('titleAudio').firstChild) radioStrip($('titleAudio'), true, openRadio);
  if (!$('pauseAudio').firstChild) radioStrip($('pauseAudio'), true, openRadio);
  const i = SFX.fm.info(); for (const S of STRIPS) paintStrip(S, i); paintHudBtn(i);
  if (RP && !$('radioPanel').hidden) paintRadioPanel(i);
  eqKick();
}
$('titleRadioBtn').addEventListener('click', openRadio);
$('pauseRadioBtn').addEventListener('click', openRadio);
$('musicFile').addEventListener('change', e => {
  const ok = f => /^audio\//.test(f.type) || /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i.test(f.name);
  const files = [...(e.target.files || [])].filter(ok); e.target.value = '';
  if (!files.length) { if (e.target.files && e.target.files.length) toast('Bluetooth', 'Those files are not songs this device can play.', '#e5484d'); return; }
  SFX.init();
  const first = BT.length;
  for (const f of files) BT.push({ name: f.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Song', blob: f });
  if (BT.length > 40) BT = BT.slice(-40);
  saveBT(); SFX.fm.btSet(BT, Math.min(first, BT.length - 1)); if (SFX.fm.muted()) SFX.fm.mute(false);
  if (!$('radioPanel').hidden) paintRadioPanel(SFX.fm.info());
});
function unlockAudio() { SFX.init(); }
document.addEventListener('pointerdown', unlockAudio, true);
document.addEventListener('keydown', unlockAudio, true);
document.addEventListener('visibilitychange', () => { if (document.hidden) SFX.suspend(); else SFX.resume(); });
renderAudio();
