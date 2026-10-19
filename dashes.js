/* ================= dashes (1.9.10) =================
   25 dashes. Each does something when you dash (to you, and to the zombies it touches or leaves behind) and has a
   passive that is always on while it's equipped. Dashes turn up on cards during a run (taking one unlocks it for
   good), and the armory picks the one you start with. Inserted into the game's closure like arsenal.js. */
const DASH_RAR = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
// zones a dash leaves behind: ice, fire, poison, smoke, a gravity well, holy ground, a void rift
function dZone(o) { if (!G.dfx) G.dfx = []; if (G.dfx.length > 60) G.dfx.shift(); o.t = 0; o.max = o.life; G.dfx.push(o); return o; }
function dNear(x, y, R, fn) { near(x, y, R + 40, o => { if (o.dead || o.st.under || o.illusion) return; const d = Math.hypot(o.x - x, o.y - y); if (d < R + o.r) fn(o, d); }); }
function dashDmg(m) { const p = G.p, S = p.S; return (12 + G.wave * 4 + S.dmg * S.pellets * 0.6) * m * (p.db && p.db.dmgT > 0 ? 1.5 : 1); }
function zHurt(z, m, kx, ky) { return hurtZombie(z, bonusDmg(z, dashDmg(m) * (z.boss ? 0.5 : 1)), { src: 'dash', kx: kx || 0, ky: ky || 0 }); }
function zStun(z, t, ice) { if (z.boss || z.rb) return; z.stun = Math.max(z.stun, t); if (ice) z.frozen = 1; }
function zSlow(z, t, mul) { z.slowT = Math.max(z.slowT, t); z.slowMul = Math.min(z.slowMul || 1, mul); }
function zBurn(z) { z.burnT = Math.max(z.burnT || 0, 3); z.burnDps = Math.max(z.burnDps || 0, 6 + G.wave * 1.3); }
function zPoison(z, dt) { z.poisonT = Math.max(z.poisonT || 0, 4); z.poisonDps = Math.min((z.poisonDps || 0) + (2 + G.wave * 0.4) * dt * 3, z.maxHp * 0.25); }
function zPush(z, x, y, f) { if (z.boss) return; const dx = z.x - x, dy = z.y - y, d = Math.hypot(dx, dy) || 1; z.kvx += dx / d * f * z.kb; z.kvy += dy / d * f * z.kb; }
function dRing(x, y, r1, col, w, life) { G.rings.push({ x: x, y: y, r0: 6, r1: r1, t: 0, life: life || 0.4, c: col, w: w || 3 }); }
function dLine(p, step, fn) { const d = G.p; d.dashTrail = (d.dashTrail || 0) + p; while (d.dashTrail >= step) { d.dashTrail -= step; fn(); } }
function lineHits(x1, y1, x2, y2, R, fn) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L;
  near(mx, my, L / 2 + R + 40, o => { if (o.dead || o.st.under || o.illusion) return; const ex = o.x - x1, ey = o.y - y1, t = clamp(ex * ux + ey * uy, 0, L); if (Math.hypot(ex - ux * t, ey - uy * t) < R + o.r) fn(o); });
}
function strikeBolt(z, m) { bolt(z.x + rand(-40, 40), z.y - 420, z.x, z.y, '#dff0ff'); bolt(z.x + rand(-30, 30), z.y - 420, z.x, z.y, '#9fc4ff'); dRing(z.x, z.y, 64, '200,225,255', 4, 0.35); zHurt(z, m); zStun(z, 0.5); }
function fireCone(p, R, half) {
  const a = Math.atan2(p.dashDy, p.dashDx);
  for (let i = 0; i < 26; i++) { const aa = a + rand(-half, half), sp = rand(240, 420); G.parts.push({ x: p.x, y: p.y, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, life: rand(0.35, 0.6), max: 0.6, c: pick(['#ffe9a0', '#ff9a3a', '#ff5a1a']), s: rand(4, 8) }); }
  dNear(p.x, p.y, R, (o) => { let da = Math.atan2(o.y - p.y, o.x - p.x) - a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < half + 0.15) { zBurn(o); zHurt(o, 2, Math.cos(a) * 160, Math.sin(a) * 160); } });
}
function boomAt(x, y, R, m, col) {
  dNear(x, y, R, (o, d) => { zHurt(o, m * (1 - d / (R + o.r) * 0.4), (o.x - x) / (d || 1) * 300, (o.y - y) / (d || 1) * 300); });
  luxFlash(x, y, R * 4.2 + 160, '255,170,80', 1.25, 0.55, { shade: true });
  burst(x, y, 26, col || '#ffb347', 320, 5, 0.5); burst(x, y, 12, '#3a2a20', 200, 7, 0.7); dRing(x, y, R, '255,150,60', 5, 0.4); splat(x, y, R * 0.45, 'rgba(20,10,6,0.55)'); shakeIt(7); SFX.boom(true); worldBlast(x, y, R * 1.3, null);
}

// [id, name, rarity, color, cooldown x, duration s, speed px/s, untouchable s, what it does, passive]
const DASHES = [
  { id: 'sprint', name: 'Sprint', r: 0, hex: '#f2cc3a', ico: 'run', cd: 1, dur: 0.18, spd: 620, ifr: 0.26, desc: 'A quick burst of speed. Nothing can touch you while you dash.', pas: '+6% move speed', st: { move: 0.06 } },
  { id: 'charge', name: 'Shoulder Charge', r: 0, hex: '#d98a4a', ico: 'shield', cd: 1.05, dur: 0.2, spd: 600, ifr: 0.28, desc: 'Plow through the horde: zombies you hit are knocked flying and stunned.', pas: 'Take 8% less damage', st: { taken: -0.08 },
    hit(p, z) { zHurt(z, 0.8, p.dashDx * 360, p.dashDy * 360); zStun(z, 0.6); burst(z.x, z.y, 6, '#d9b38a', 140, 4, 0.3); } },
  { id: 'slide', name: 'Baseball Slide', r: 0, hex: '#c9a27e', ico: 'slide', cd: 1, dur: 0.27, spd: 560, ifr: 0.32, desc: 'A long, low slide that sweeps the legs out from under every zombie you pass.', pas: 'Dash recharges 10% faster', st: { dash: 0.1 },
    hit(p, z) { zHurt(z, 0.5); zStun(z, 0.9); G.texts.push({ x: z.x, y: z.y - z.r, t: 0, life: 0.5, s: 'trip', c: '#c9a27e' }); } },
  { id: 'smoke', name: 'Smoke Bomb', r: 0, hex: '#9aa1a8', ico: 'smoke', cd: 1.15, dur: 0.18, spd: 620, ifr: 0.3, desc: 'Leave a smoke cloud behind. Zombies inside lose track of you and stumble around.', pas: '5% chance to dodge any hit', dodge: 0.05,
    start(p) { dZone({ k: 'smoke', x: p.x, y: p.y, r: 95, life: 3.6 }); burst(p.x, p.y, 18, '#b9bfc6', 140, 8, 0.8); } },
  { id: 'adren', name: 'Adrenaline Rush', r: 1, hex: '#ff5a7a', ico: 'heart', cd: 1, dur: 0.18, spd: 660, ifr: 0.26, desc: 'Your heart pounds: fire 40% faster for 2.5 seconds after dashing.', pas: 'Every kill recharges your dash 0.12 s',
    end(p) { p.db.rofT = 2.5; dRing(p.x, p.y, 46, '255,90,122', 3); } },
  { id: 'frost', name: 'Frost Step', r: 1, hex: '#9fdcff', ico: 'flake', cd: 1.05, dur: 0.22, spd: 600, ifr: 0.28, desc: 'Leave a trail of ice. Zombies on it slow to a crawl and can freeze solid.', pas: 'Your shots slow zombies', st: { slow: 0.5 },
    trail: 22, drop(p) { dZone({ k: 'ice', x: p.x, y: p.y, r: 26, life: 3.2 }); } },
  { id: 'flame', name: 'Flame Dash', r: 1, hex: '#ff8a2a', ico: 'flame', cd: 1.05, dur: 0.22, spd: 620, ifr: 0.28, desc: 'Leave a trail of fire that sets every zombie who walks through it ablaze.', pas: 'Burning wears off twice as fast on you', antiBurn: 1,
    trail: 20, drop(p) { dZone({ k: 'fire', x: p.x, y: p.y, r: 24, life: 2.8 }); } },
  { id: 'thunder', name: 'Thunder Dash', r: 1, hex: '#fff36b', ico: 'bolt', cd: 1.1, dur: 0.18, spd: 650, ifr: 0.26, desc: 'Land with a thunderclap: lightning jumps to the 5 closest zombies.', pas: 'Your shots chain lightning to 1 more zombie', st: { shock: 1 },
    end(p) { let from = { x: p.x, y: p.y }; const seen = []; for (let i = 0; i < 5; i++) { const t = nearestZ(from.x, from.y, 230, seen); if (!t) break; bolt(from.x, from.y, t.x, t.y, '#fff36b'); seen.push(t); zHurt(t, 1.6); zStun(t, 0.3); from = t; } if (seen.length) SFX.zap(); dRing(p.x, p.y, 60, '255,243,107', 3); } },
  { id: 'toxic', name: 'Toxic Trail', r: 1, hex: '#9be84a', ico: 'drop', cd: 1.05, dur: 0.22, spd: 610, ifr: 0.28, desc: 'Leave clouds of poison that eat away at anything that breathes them.', pas: 'Your shots poison zombies', st: { poison: 0.5 },
    trail: 26, drop(p) { dZone({ k: 'toxic', x: p.x, y: p.y, r: 30, life: 3.8 }); } },
  { id: 'blink', name: 'Blink', r: 2, hex: '#b07bff', ico: 'blink', cd: 1, dur: 0.06, spd: 0, ifr: 0.3, desc: 'Teleport instantly. Zombies where you were are left dazed.', pas: '+8% critical hit chance', st: { crit: 0.08 },
    start(p) {
      const sx = p.x, sy = p.y; let k = 0; for (let s = 0; s < 170; s += 10) { if (blocked(sx + p.dashDx * (s + 10), sy + p.dashDy * (s + 10), p.r)) break; k = s + 10; }
      burst(sx, sy, 16, '#b07bff', 160, 4, 0.4); p.ghosts.push({ x: sx, y: sy, t: 0, a: p.aim });
      dNear(sx, sy, 80, o => zStun(o, 0.7)); dRing(sx, sy, 80, '176,123,255', 3);
      p.x += p.dashDx * k; p.y += p.dashDy * k; burst(p.x, p.y, 16, '#d9c2ff', 160, 4, 0.4); dRing(p.x, p.y, 40, '217,194,255', 3, 0.3);
    } },
  { id: 'phantom', name: 'Phantom Walk', r: 2, hex: '#a8f0ff', ico: 'ghost', cd: 1.1, dur: 0.32, spd: 520, ifr: 0.8, desc: 'Turn to mist and pass right through the horde, chilling everything you touch.', pas: '10% chance to dodge any hit', dodge: 0.1,
    hit(p, z) { zHurt(z, 1.2); zSlow(z, 1.5, 0.5); burst(z.x, z.y, 5, '#cff7ff', 100, 3, 0.3); } },
  { id: 'quake', name: 'Shockwave Slam', r: 2, hex: '#b38a5a', ico: 'quake', cd: 1.15, dur: 0.2, spd: 600, ifr: 0.3, desc: 'Slam down when you land: a shockwave throws every zombie around you back.', pas: 'Your bullets knock zombies back harder', knock: 1.6,
    end(p) { dNear(p.x, p.y, 150, (o, d) => { zHurt(o, 1.6); zPush(o, p.x, p.y, 520 * (1 - d / 190)); zStun(o, 0.4); }); dRing(p.x, p.y, 150, '210,170,110', 6, 0.45); dRing(p.x, p.y, 90, '255,230,180', 3, 0.3); burst(p.x, p.y, 22, '#8c7254', 260, 5, 0.6); splat(p.x, p.y, 40, 'rgba(30,22,14,0.5)'); shakeIt(8); SFX.boom(false); } },
  { id: 'vamp', name: 'Blood Rush', r: 2, hex: '#e0304a', ico: 'fang', cd: 1.05, dur: 0.24, spd: 600, ifr: 0.3, desc: 'Drain every zombie you rush through: they bleed, and you heal 3 health each.', pas: '+2% of your damage heals you', st: { lifesteal: 0.02 },
    hit(p, z) { zHurt(z, 0.9); zPoison(z, 1); healPlayer(3); burst(z.x, z.y, 6, '#b3121c', 120, 3, 0.4); } },
  { id: 'well', name: 'Gravity Well', r: 2, hex: '#7a7bff', ico: 'well', cd: 1.2, dur: 0.18, spd: 620, ifr: 0.28, desc: 'Leave a singularity behind that drags zombies in, then collapses with a bang.', pas: 'Your shots pull zombies in a little', st: { gravity: 0.4 },
    start(p) { dZone({ k: 'well', x: p.x, y: p.y, r: 150, life: 2.2 }); } },
  { id: 'decoy', name: 'Hologram Decoy', r: 2, hex: '#3ee0c8', ico: 'holo', cd: 1.25, dur: 0.18, spd: 620, ifr: 0.28, desc: 'Leave a hologram of yourself. Zombies chase it for 3.5 seconds, then it explodes.', pas: '+10% score', st: { score: 0.1 },
    start(p) { G.decoy = { x: p.x, y: p.y, a: p.aim, t: 0, life: 3.5 }; } },
  { id: 'rocket', name: 'Rocket Boots', r: 3, hex: '#ff6a3a', ico: 'rocket', cd: 1.15, dur: 0.28, spd: 900, ifr: 0.4, desc: 'Blast off twice as far on a jet of flame and explode where you land.', pas: 'Your explosions are 20% bigger', st: { blast: 0.2 },
    tick(p) { G.parts.push({ x: p.x - p.dashDx * 10, y: p.y - p.dashDy * 10, vx: -p.dashDx * 160 + rand(-40, 40), vy: -p.dashDy * 160 + rand(-40, 40), life: 0.45, max: 0.45, c: pick(['#ffe9a0', '#ff9a3a', '#ff5a1a']), s: rand(4, 7) }); },
    end(p) { boomAt(p.x, p.y, 95, 2.4); } },
  { id: 'warp', name: 'Time Warp', r: 3, hex: '#5aa8ff', ico: 'clock', cd: 1.2, dur: 0.18, spd: 620, ifr: 0.3, desc: 'Bend time: every zombie moves at a third of its speed for 2.8 seconds.', pas: 'Dash recharges 20% faster', st: { dash: 0.2 },
    end(p) { G.warpT = 2.8; dRing(p.x, p.y, 260, '90,168,255', 4, 0.6); dRing(p.x, p.y, 140, '200,230,255', 2, 0.5); } },
  { id: 'berserk', name: 'Berserker', r: 3, hex: '#c2182a', ico: 'axe', cd: 1.05, dur: 0.22, spd: 640, ifr: 0.3, desc: 'Smash through zombies for heavy damage, then deal 50% more damage for 3 seconds.', pas: 'Below 30% health you deal 25% more damage', rage: 1,
    hit(p, z) { zHurt(z, 2.2, p.dashDx * 260, p.dashDy * 260); burst(z.x, z.y, 8, '#ff3040', 160, 4, 0.35); },
    end(p) { p.db.dmgT = 3; dRing(p.x, p.y, 50, '255,48,64', 4); } },
  { id: 'holy', name: 'Holy Ground', r: 3, hex: '#fff1b8', ico: 'halo', cd: 1.2, dur: 0.18, spd: 620, ifr: 0.3, desc: 'Bless the ground where you land: it heals you and burns zombies for 4 seconds.', pas: 'Regenerate 1 health per second', st: { regen: 1 },
    end(p) { dZone({ k: 'holy', x: p.x, y: p.y, r: 105, life: 4 }); dRing(p.x, p.y, 105, '255,241,184', 4, 0.5); } },
  { id: 'ninja', name: 'Ninja Vanish', r: 3, hex: '#5c6b7a', ico: 'star', cd: 1.2, dur: 0.18, spd: 660, ifr: 0.4, desc: 'Vanish in a puff of smoke. Zombies lose you for 2.6 seconds and your next shot is a crit.', pas: '+25% critical hit damage', st: { critDmg: 0.25 },
    start(p) { burst(p.x, p.y, 20, '#8a96a3', 150, 8, 0.7); }, end(p) { p.db.stealthT = 2.6; p.db.critNext = 1; burst(p.x, p.y, 14, '#8a96a3', 120, 7, 0.6); } },
  { id: 'meteor', name: 'Meteor Strike', r: 4, hex: '#ff4a1a', ico: 'meteor', cd: 1.3, dur: 0.4, spd: 420, ifr: 0.65, desc: 'Leap into the sky and crash down like a meteor, leaving a burning crater.', pas: '+10% damage', st: { dmg: 0.1 },
    end(p) { boomAt(p.x, p.y, 135, 3.6, '#ff6a2a'); dNear(p.x, p.y, 135, o => zStun(o, 0.6)); dZone({ k: 'fire', x: p.x, y: p.y, r: 70, life: 3.2 }); dRing(p.x, p.y, 200, '255,90,30', 6, 0.6); shakeIt(12); } },
  { id: 'dragon', name: "Dragon's Breath", r: 4, hex: '#ff7a1a', ico: 'dragon', cd: 1.2, dur: 0.2, spd: 620, ifr: 0.3, desc: 'Finish the dash with a roaring cone of dragon fire.', pas: 'Your shots set zombies on fire', st: { burn: 1 },
    end(p) { fireCone(p, 240, 0.62); SFX.boom(false); } },
  { id: 'void', name: 'Void Rift', r: 4, hex: '#8a2bff', ico: 'rift', cd: 1.25, dur: 0.24, spd: 640, ifr: 0.35, desc: 'Tear open a rift along your path. It shreds zombies and swallows the weak ones whole.', pas: 'Finish off weak zombies faster', st: { execute: 0.15 },
    start(p) { p.dashSX = p.x; p.dashSY = p.y; }, end(p) { dZone({ k: 'rift', x: p.dashSX, y: p.dashSY, x2: p.x, y2: p.y, r: 24, life: 1.6 }); } },
  { id: 'storm', name: 'Storm Rider', r: 4, hex: '#7ab8ff', ico: 'storm', cd: 1.1, dur: 0.2, spd: 680, ifr: 0.3, desc: 'Call down 3 lightning strikes on zombies around you every time you dash.', pas: 'Dash recharges twice as fast during boss fights', boss2: 1,
    end(p) { const pool = []; dNear(p.x, p.y, 330, o => pool.push(o)); pool.sort(() => Math.random() - 0.5).slice(0, 3).forEach((z, i) => setTimeout(() => { if (!z.dead) strikeBolt(z, 2.6); }, i * 120)); SFX.zap(); SFX.boom(false); shakeIt(5); } },
  { id: 'warthog', name: 'Warthog Run', r: 4, hex: '#9fd36a', ico: 'jet', cd: 2.6, dur: 0.18, spd: 620, ifr: 0.3, desc: 'Radio in a single A-10 for a quick gun run straight down the line you dashed.', pas: 'Earn A-10 strikes every 60 chained kills instead of 75', air: 60,
    end(p) { launchStrafe(p.x + p.dashDx * 170, p.y + p.dashDy * 170, Math.atan2(p.dashDy, p.dashDx), { mini: true }); SFX.radio(); } }
];
const DASH_SHORT = { sprint: 'Sprint', charge: 'Charge', slide: 'Slide', smoke: 'Smoke', adren: 'Adrenal', frost: 'Frost', flame: 'Flame', thunder: 'Thunder', toxic: 'Toxic', blink: 'Blink', phantom: 'Phantom', quake: 'Slam', vamp: 'Blood', well: 'Gravity', decoy: 'Decoy', rocket: 'Rocket', warp: 'Warp', berserk: 'Berserk', holy: 'Holy', ninja: 'Ninja', meteor: 'Meteor', dragon: 'Dragon', void: 'Void', storm: 'Storm', warthog: 'Warthog' };
const DASH_BY = {}; DASHES.forEach((d, i) => { d.i = i; d.rgb = rgbOf(d.hex); d.short = DASH_SHORT[d.id] || d.name; DASH_BY[d.id] = d; });
const dashes = new Set(store.get('zc_dashes', ['sprint'])); dashes.add('sprint');
function saveDashes() { store.set('zc_dashes', Array.from(dashes)); }
function dashLoadout() { const id = store.get('zc_dash', 'sprint'); return DASH_BY[id] && dashes.has(id) ? id : 'sprint'; }
function dashDef(p) { return DASH_BY[(p && p.dashK) || 'sprint'] || DASHES[0]; }
// the passive is added to the card stats before the game's live stats are worked out
function dashPassive(cs, p) { const d = dashDef(p), out = Object.assign({}, cs); if (d.st) for (const k in d.st) out[k] = (out[k] || 0) + d.st[k]; return out; }

function dashStart(p) {
  const d = dashDef(p);
  p.dashHit = new Set(); p.dashTrail = 0; p.dashSX = p.x; p.dashSY = p.y;
  p.dashT = d.dur; p.dashDur = d.dur; p.iframe = Math.max(p.iframe, d.ifr);
  let cd = p.dashCd * d.cd; if (d.boss2 && G.boss && !G.boss.dead) cd *= 0.5;
  p.dashCdT = cd; p.dashCdMax = cd;
  dRing(p.x, p.y, 34, d.rgb, 3, 0.3);
  if (d.start) d.start(p, d);
  SFX.dashKind(d.ico);
}
function dashVel(p, dt) {
  const d = dashDef(p);
  if (d.drop) dLine(d.spd * dt, d.trail, () => d.drop(p));
  if (d.tick) d.tick(p, dt);
  if (d.hit) near(p.x, p.y, p.r + 50, o => { if (o.dead || o.st.under || o.illusion || p.dashHit.has(o)) return; if (Math.hypot(o.x - p.x, o.y - p.y) < p.r + o.r + 8) { p.dashHit.add(o); d.hit(p, o); } });
  if (!p.ghosts.length || p.ghosts[p.ghosts.length - 1].t > 0.03) p.ghosts.push({ x: p.x, y: p.y, t: 0, a: p.aim });
  burst(p.x, p.y, 1, d.hex, 30, 4, 0.3);
  return d.spd;
}
function dashEnd(p) { const d = dashDef(p); if (d.end) d.end(p, d); }
function dashOnKill() { const p = G.p; if (p && p.dashK === 'adren') p.dashCdT = Math.max(0, p.dashCdT - 0.12); }
function dashDodge(p) { const d = dashDef(p); return !!(d.dodge && Math.random() < d.dodge); }
function dashDmgMul(p) { const d = dashDef(p); let m = p.db.dmgT > 0 ? 1.5 : 1; if (d.rage && p.hp < p.maxHp * 0.3) m *= 1.25; return m; }
function dashRofMul(p) { return p.db.rofT > 0 ? 1.4 : 1; }
function equipDash(d, fromCard) {
  const p = G.p, isNew = !dashes.has(d.id);
  p.dashK = d.id; dashes.add(d.id); saveDashes(); recalc(p); updDashBtn();
  if (fromCard) { if (isNew) { toast('New dash unlocked · ' + DASH_RAR[d.r], d.name, WRAR[d.r].color); SFX.unlock(); } else toast('Dash', d.name, d.hex); }
}
function updDashBtn() {
  const p = G.p, b = $('dashBtn'); if (!b) return; const d = dashDef(p);
  b.style.setProperty('--dash', d.hex); b.setAttribute('aria-label', 'Dash: ' + d.name);
  const n = b.querySelector('.dname'); if (n) n.textContent = d.short;
}

// every frame: buffs wear off, zones do their work, the decoy and time warp count down
function updDash(dt) {
  const p = G.p; if (!p) return;
  const db = p.db; if (db.rofT > 0) db.rofT -= dt; if (db.dmgT > 0) db.dmgT -= dt; if (db.stealthT > 0) db.stealthT -= dt;
  for (const g of p.ghosts) g.t += dt; if (p.ghosts.length) p.ghosts = p.ghosts.filter(g => g.t < 0.32).slice(-10);
  if (G.warpT > 0) G.warpT -= dt;
  if (dashDef(p).antiBurn && p.burnT > 0) p.burnT -= dt;
  const dc = G.decoy;
  if (dc) { dc.t += dt; if (dc.t >= dc.life) { boomAt(dc.x, dc.y, 85, 2.2, '#3ee0c8'); G.decoy = null; } }
  if (!G.dfx || !G.dfx.length) return;
  for (const z of G.dfx) {
    z.t += dt;
    if (z.k === 'ice') dNear(z.x, z.y, z.r, o => { zSlow(o, 1.5, 0.45); if (Math.random() < 0.18 * dt) zStun(o, 1, true); });
    else if (z.k === 'fire') dNear(z.x, z.y, z.r, o => zBurn(o));
    else if (z.k === 'toxic') dNear(z.x, z.y, z.r, o => zPoison(o, dt));
    else if (z.k === 'smoke') dNear(z.x, z.y, z.r, o => { if (!o.boss) o.confT = 0.6; zSlow(o, 0.6, 0.65); });
    else if (z.k === 'well') {
      dNear(z.x, z.y, z.r, (o, d) => { if (o.boss) return; const k = 900 * dt * (1 - d / (z.r + 40)); o.kvx += (z.x - o.x) / (d || 1) * k * 6; o.kvy += (z.y - o.y) / (d || 1) * k * 6; });
      if (z.t >= z.max && !z.popped) { z.popped = true; boomAt(z.x, z.y, 95, 2.6, '#9a9bff'); }
    }
    else if (z.k === 'holy') {
      if (Math.hypot(p.x - z.x, p.y - z.y) < z.r) healPlayer(4 * dt);
      dNear(z.x, z.y, z.r, o => { hurtZombie(o, bonusDmg(o, dashDmg(0.7) * dt), { src: 'dash' }); zSlow(o, 0.4, 0.7); });
    }
    else if (z.k === 'rift') lineHits(z.x, z.y, z.x2, z.y2, z.r, o => { if (!o.boss && !o.rb && o.hp < o.maxHp * 0.25) { burst(o.x, o.y, 10, '#c49bff', 140, 4, 0.4); killZombie(o); return; } hurtZombie(o, bonusDmg(o, dashDmg(2.5) * dt), { src: 'dash' }); });
  }
  G.dfx = G.dfx.filter(z => z.t < z.max);
}
// where a zombie walks when a dash is fooling it: the decoy, a lost scent, or a daze
function dashLure(z, dt) {
  if (z.boss || z.rb || z.snatch || z.fly) return null;
  if (z.confT > 0) { z.confT -= dt; const a = z.bob * 3 + G.time * 2.2; return [z.x + Math.cos(a) * 80, z.y + Math.sin(a) * 80]; }
  const dc = G.decoy; if (dc && Math.hypot(z.x - dc.x, z.y - dc.y) < 460) return [dc.x, dc.y];
  const p = G.p; if (p && p.db.stealthT > 0) { const a = z.bob + G.time * 0.6; return [z.x + Math.cos(a) * 60, z.y + Math.sin(a) * 60]; }
  return null;
}

/* ---------- drawing ---------- */
function drawDashZones(vis) {
  if (!G.dfx || !G.dfx.length) return;
  for (const z of G.dfx) {
    const f = z.t / z.max, a = Math.min(1, (1 - f) * 2.2) * Math.min(1, z.t * 6);
    if (z.k === 'rift') {
      ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(40,0,70,' + 0.8 * a + ')'; ctx.lineWidth = 30; ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(z.x2, z.y2); ctx.stroke();
      ctx.strokeStyle = 'rgba(196,155,255,' + 0.9 * a + ')'; ctx.lineWidth = 4 + Math.sin(G.time * 30) * 2; ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(z.x2, z.y2); ctx.stroke();
      if (Math.random() < 0.6) { const t = Math.random(); burst(z.x + (z.x2 - z.x) * t, z.y + (z.y2 - z.y) * t, 1, '#c49bff', 60, 3, 0.4); }
      continue;
    }
    if (!vis(z.x, z.y, z.r)) continue;
    if (z.k === 'ice') { ctx.fillStyle = 'rgba(170,225,255,' + 0.38 * a + ')'; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.8, 0.6, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(235,250,255,' + 0.6 * a + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(z.x - z.r * 0.6, z.y); ctx.lineTo(z.x + z.r * 0.6, z.y); ctx.moveTo(z.x, z.y - z.r * 0.5); ctx.lineTo(z.x, z.y + z.r * 0.5); ctx.stroke(); }
    else if (z.k === 'fire') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,110,30,' + 0.32 * a + ')'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (0.9 + Math.sin(G.time * 12 + z.x) * 0.1), 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; if (Math.random() < 0.35) burst(z.x + rand(-z.r, z.r) * 0.6, z.y + rand(-z.r, z.r) * 0.6, 1, '#ff9a3a', 40, 4, 0.4); }
    else if (z.k === 'toxic') { ctx.fillStyle = 'rgba(150,230,70,' + 0.22 * a + ')'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (1 + f * 0.2), 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(190,255,110,' + 0.18 * a + ')'; ctx.beginPath(); ctx.arc(z.x + Math.sin(G.time * 2 + z.y) * 6, z.y + Math.cos(G.time * 2 + z.x) * 5, z.r * 0.55, 0, TAU); ctx.fill(); }
    else if (z.k === 'smoke') { for (let i = 0; i < 6; i++) { const aa = i / 6 * TAU + G.time * 0.4; ctx.fillStyle = 'rgba(170,176,184,' + 0.2 * a + ')'; ctx.beginPath(); ctx.arc(z.x + Math.cos(aa) * z.r * 0.45, z.y + Math.sin(aa) * z.r * 0.45, z.r * 0.6, 0, TAU); ctx.fill(); } }
    else if (z.k === 'well') { ctx.strokeStyle = 'rgba(140,140,255,' + 0.55 * a + ')'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const rr = z.r * ((G.time * 0.8 + i / 3) % 1); ctx.beginPath(); ctx.arc(z.x, z.y, z.r - rr, 0, TAU); ctx.stroke(); } ctx.fillStyle = 'rgba(10,6,30,' + 0.9 * a + ')'; ctx.beginPath(); ctx.arc(z.x, z.y, 12 + f * 8, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(200,200,255,' + a + ')'; ctx.lineWidth = 2.5; ctx.stroke(); }
    else if (z.k === 'holy') { ctx.fillStyle = 'rgba(255,241,184,' + 0.13 * a + ')'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,236,160,' + 0.75 * a + ')'; ctx.lineWidth = 2.5; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -G.time * 30; ctx.stroke(); ctx.setLineDash([]); if (Math.random() < 0.4) { const aa = rand(TAU), rr = rand(z.r); G.parts.push({ x: z.x + Math.cos(aa) * rr, y: z.y + Math.sin(aa) * rr, vx: 0, vy: -40, life: 0.8, max: 0.8, c: '#fff1b8', s: 3 }); } }
  }
  ctx.globalAlpha = 1;
}
// afterimages and the decoy, drawn just under the player
function drawDashActors(p) {
  const d = dashDef(p);
  for (const g of p.ghosts) { const a = 0.4 * (1 - g.t / 0.32); ctx.fillStyle = 'rgba(' + d.rgb + ',' + a + ')'; ctx.beginPath(); ctx.ellipse(g.x, g.y, 10, 13, g.a, 0, TAU); ctx.fill(); }
  const dc = G.decoy;
  if (dc) {
    const fl = Math.floor(G.time * 20) % 7 === 0 ? 0.35 : 0.75, end = dc.life - dc.t < 0.8 && Math.floor(G.time * 12) % 2;
    ctx.save(); ctx.translate(dc.x, dc.y); ctx.rotate(dc.a + Math.sin(G.time * 3) * 0.3); ctx.globalAlpha = fl;
    ctx.fillStyle = end ? 'rgba(255,90,90,0.8)' : 'rgba(62,224,200,0.55)'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 13, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(2, 0, 6.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(160,255,240,0.9)'; ctx.lineWidth = 1; for (let y = -12; y < 13; y += 3) { ctx.beginPath(); ctx.moveTo(-10, y); ctx.lineTo(10, y); ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(62,224,200,' + (0.4 + 0.3 * Math.sin(G.time * 8)) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(dc.x, dc.y, 22, 0, TAU); ctx.stroke();
  }
}
function drawDashScreen() {
  if (G.warpT > 0) { ctx.globalAlpha = Math.min(0.32, G.warpT * 0.2); ctx.drawImage(screenGrad('warp', 0.2, 0.75, '60,130,255', 1), 0, 0, W, H); ctx.globalAlpha = 1; }
  const p = G.p; if (p && p.db.stealthT > 0) { ctx.globalAlpha = Math.min(0.5, p.db.stealthT * 0.4); ctx.drawImage(screenGrad('ninja', 0.25, 0.6, '10,14,20', 1), 0, 0, W, H); ctx.globalAlpha = 1; }
}

/* ---------- cards and the armory ---------- */
function rollDashCard(boss) {
  const p = G.p; let r = rollRarity(p.luck + (boss ? 1 : 0), boss); if (r > 4) r = 3;
  let pool = DASHES.filter(d => d.r === r && d.id !== p.dashK); if (!pool.length) pool = DASHES.filter(d => d.id !== p.dashK);
  const locked = pool.filter(d => !dashes.has(d.id));
  const d = locked.length && Math.random() < 0.65 ? pick(locked) : pick(pool);
  return { type: 'dash', d: d, r: d.r };
}
// a small badge for each dash: a glowing disc, speed streaks and the dash's own symbol
function drawDashIcon(g, d, S, sil) {
  const c = S / 2, col = sil ? '#2a2f36' : d.hex;
  g.save(); g.translate(c, c);
  const gr = g.createRadialGradient(0, 0, 2, 0, 0, c); gr.addColorStop(0, sil ? '#1d2127' : hexA(d.hex, 0.45)); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, c, 0, TAU); g.fill();
  g.strokeStyle = sil ? '#2a2f36' : hexA(d.hex, 0.55); g.lineWidth = S * 0.035; g.lineCap = 'round';
  for (let i = 0; i < 3; i++) { const y = (i - 1) * S * 0.14; g.beginPath(); g.moveTo(-S * 0.44, y); g.lineTo(-S * 0.24 + i * S * 0.03, y); g.stroke(); }
  const s = S / 100; g.scale(s, s); g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 6; g.lineJoin = 'round';
  const P = (pts, fill) => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); if (fill !== false) { g.closePath(); g.fill(); } else g.stroke(); };
  switch (d.ico) {
    case 'run': P([-10, -22, 10, 0, -10, 22], false); P([8, -22, 28, 0, 8, 22], false); break;
    case 'shield': g.beginPath(); g.moveTo(0, -26); g.quadraticCurveTo(24, -20, 22, -4); g.quadraticCurveTo(18, 18, 0, 28); g.quadraticCurveTo(-18, 18, -22, -4); g.quadraticCurveTo(-24, -20, 0, -26); g.fill(); break;
    case 'slide': P([-26, 14, 26, 14], false); P([-14, 4, 10, -8], false); g.beginPath(); g.arc(16, -12, 7, 0, TAU); g.fill(); break;
    case 'smoke': [[-10, 4, 13], [8, -2, 15], [2, 14, 11]].forEach(q => { g.beginPath(); g.arc(q[0], q[1], q[2], 0, TAU); g.fill(); }); break;
    case 'heart': g.beginPath(); g.moveTo(0, 22); g.bezierCurveTo(-34, -2, -18, -30, 0, -12); g.bezierCurveTo(18, -30, 34, -2, 0, 22); g.fill(); break;
    case 'flake': for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; P([0, 0, Math.cos(a) * 26, Math.sin(a) * 26], false); P([Math.cos(a) * 15 + Math.cos(a + 1) * 7, Math.sin(a) * 15 + Math.sin(a + 1) * 7, Math.cos(a) * 15, Math.sin(a) * 15, Math.cos(a) * 15 + Math.cos(a - 1) * 7, Math.sin(a) * 15 + Math.sin(a - 1) * 7], false); } break;
    case 'flame': g.beginPath(); g.moveTo(0, -28); g.bezierCurveTo(22, -6, 20, 24, 0, 26); g.bezierCurveTo(-20, 24, -22, 0, -8, -10); g.bezierCurveTo(-6, 0, 0, 2, 0, -28); g.fill(); break;
    case 'bolt': P([6, -30, -14, 4, 0, 4, -6, 30, 16, -6, 2, -6]); break;
    case 'drop': g.beginPath(); g.moveTo(0, -28); g.bezierCurveTo(16, -6, 20, 6, 20, 12); g.arc(0, 12, 20, 0, Math.PI); g.bezierCurveTo(-20, 6, -16, -6, 0, -28); g.fill(); break;
    case 'blink': for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, l = i % 2 ? 14 : 28; P([0, 0, Math.cos(a) * l, Math.sin(a) * l], false); } break;
    case 'ghost': g.beginPath(); g.arc(0, -6, 18, Math.PI, 0); g.lineTo(18, 24); g.lineTo(9, 16); g.lineTo(0, 24); g.lineTo(-9, 16); g.lineTo(-18, 24); g.closePath(); g.fill(); g.fillStyle = '#0e1115'; g.beginPath(); g.arc(-7, -6, 4, 0, TAU); g.arc(7, -6, 4, 0, TAU); g.fill(); break;
    case 'quake': P([-28, 20, 28, 20], false); P([0, 20, -6, 6, 6, -4, -2, -16], false); P([-14, 20, -20, 10], false); P([14, 20, 22, 8], false); break;
    case 'fang': P([-20, -18, -10, 22, -2, -18]); P([2, -18, 10, 22, 20, -18]); break;
    case 'well': g.beginPath(); for (let t = 0; t < 22; t++) { const a = t * 0.55, rr = 2 + t * 1.25; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.stroke(); break;
    case 'holo': g.globalAlpha = 0.85; g.beginPath(); g.arc(0, -14, 9, 0, TAU); g.fill(); g.beginPath(); g.ellipse(0, 12, 14, 16, 0, 0, TAU); g.fill(); g.globalAlpha = 1; g.strokeStyle = '#0e1115'; g.lineWidth = 2; for (let y = -22; y < 28; y += 6) { g.beginPath(); g.moveTo(-16, y); g.lineTo(16, y); g.stroke(); } break;
    case 'rocket': P([0, -30, 12, -6, 12, 16, -12, 16, -12, -6]); P([-12, 6, -22, 20, -12, 16]); P([12, 6, 22, 20, 12, 16]); g.fillStyle = '#ffe9a0'; P([-6, 18, 0, 32, 6, 18]); break;
    case 'clock': g.beginPath(); g.arc(0, 0, 24, 0, TAU); g.stroke(); P([0, 0, 0, -16], false); P([0, 0, 12, 6], false); break;
    case 'axe': P([-4, -26, 4, -26, 4, 28, -4, 28]); g.beginPath(); g.moveTo(4, -22); g.quadraticCurveTo(30, -18, 28, 4); g.quadraticCurveTo(16, -2, 4, 0); g.fill(); break;
    case 'halo': g.beginPath(); g.ellipse(0, -16, 20, 7, 0, 0, TAU); g.stroke(); P([0, -4, 0, 26], false); P([-14, 8, 14, 8], false); break;
    case 'star': for (let i = 0; i < 4; i++) { g.save(); g.rotate(i * Math.PI / 2 + 0.4); P([0, -28, 8, -6, 0, 0, -8, -6]); g.restore(); } g.fillStyle = '#0e1115'; g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill(); break;
    case 'meteor': g.beginPath(); g.arc(10, 10, 14, 0, TAU); g.fill(); g.globalAlpha = 0.6; P([-2, 2, -30, -26, -20, -30, 6, -6]); P([4, -2, -18, -30], false); g.globalAlpha = 1; break;
    case 'dragon': P([-24, 14, -6, -20, 2, -6, 14, -24, 12, -2, 26, 4, 8, 6, 2, 20]); break;
    case 'rift': g.lineWidth = 8; P([-4, -30, 6, -12, -6, 2, 8, 16, -2, 30], false); g.fillStyle = '#0e1115'; g.lineWidth = 3; break;
    case 'storm': g.beginPath(); g.arc(-8, -10, 12, 0, TAU); g.arc(8, -12, 14, 0, TAU); g.arc(16, -2, 10, 0, TAU); g.arc(-16, -2, 9, 0, TAU); g.fill(); g.fillStyle = sil ? col : '#fff36b'; P([2, 0, -8, 18, 0, 18, -4, 32, 10, 12, 2, 12]); break;
    case 'jet': g.rotate(-Math.PI / 2); P([-4, -30, 4, -30, 6, 30, -6, 30]); P([-30, -4, 30, -4, 30, 4, -30, 4]); P([-12, 22, 12, 22, 12, 28, -12, 28]); break;
  }
  g.restore();
}
function paintDash(c, d, size, sil) {
  const k = Math.min(window.devicePixelRatio || 1, 2); c.width = c.height = Math.round(size * k); c.style.width = c.style.height = size + 'px';
  const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, size, size); drawDashIcon(g, d, size, sil);
}
