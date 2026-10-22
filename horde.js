/* ================= HORDE: how the swarm moves and thinks (1.9.998) =================
   The crowd engine's body and brain for the 2.0 zombies, with "Zombie speed: World War Z" on (the default; "Classic"
   keeps the old crowd). Built from real people's numbers (the research is in the README):
   - Three gears. An amble when it has not noticed you (a shambler about 0.6 m/s, a walker 1.2), a pursuit (a shambler's
     hurried lurch 1.4, a walker 2, a runner 2.8, a sprinter up to 3.4) and a frenzy when it sees you close or its horde
     surges (a shambler's lurching run about 3, a walker 4.6, a runner 6.2, a sprinter 7.5, just under your sprint).
     The frenzy comes in bursts of 5 to 10 seconds and spreads through a crowd body to body like a wave; the first
     waves hold some of it back.
   - Momentum. A body speeds up, brakes and turns only as hard as its build allows (3 m/s/s for a shambler up to 8.5 for
     a sprinter), and a frenzied one never brakes for a corner: at an alley mouth the leaders overshoot and slam into the
     far wall (a stumble above 3.5 m/s, knocked flat above 6, sometimes with its legs broken so it crawls on) and the
     ones behind glance off them along the pile and cut the corner faster.
   - Solid bodies. A zombie is a quarter of a metre each way from its middle: they crush together without passing
     through each other and pass momentum on by weight (a runner into the back of a crowd shoves it forward; the
     Linebacker or a Brute bowls it over).
   - Whatever it takes. Parked cars, dumpsters, benches, barriers, rubble and fences are slow ground on its map, not
     walls: it vaults a car, climbs over it, dives through its windows (a crawler goes under), climbs a fence, and goes
     round only when round is quicker. A bus or a truck is too tall: it goes round, or over the pile.
   - A brain for the pack. When you run, it works out where you are heading (the far end of the alley, the next corner)
     and sends the ones that are nearer that end round to cut you off.
   - Pile-ups. Pressed against what it cannot get through, the crowd climbs itself: the ones on top go over fences and
     onto car roofs and drop down the other side, the ones underneath are pinned and trampled, and a pile that loses its
     base comes down. Higher ones are drawn bigger, their shadows further off.
   - Every contact plays one of the fifteen contact animations (anima.js), from the physics: who hit what, how hard and
     from which side. */
const HORDE = { cut: null, cutT: 0, cutId: 0, cf: 0, cfF: -1, thinkF: 0,
  stats: { contacts: 0, slams: 0, down: 0, vaults: 0, climbs: 0, dives: 0, unders: 0, fences: 0, piles: 0, falls: 0, bowled: 0, shoved: 0, bumps: 0, trips: 0, pinned: 0, frenzy: 0, cutters: 0, maxPz: 0 } };
const HD_U = () => 32;   // units in a metre at the real scale (zombie speeds are the same units in the classic city, so its speed rules are too)
// gait class: 0 shambler, 1 walker, 2 runner, 3 sprinter
const HD_CLS = { shamble: 0, drag: 0, crawl: 0, waddle: 0, stagger: 0, limp: 0, march: 1, stomp: 1, jerk: 1, glide: 1, hop: 1, lope: 2, scuttle: 2, drive: 2, sprint: 3 };
// per class at the roster's pace 1: amble, pursuit and frenzy (m/s), how hard it can accelerate (m/s/s), how quickly it
// settles on the speed it wants (s)
const HD_GEAR = [{ a: 0.6, p: 1.45, f: 3.2, acc: 3.0, tau: 0.9 }, { a: 1.15, p: 2.0, f: 4.6, acc: 4.5, tau: 0.6 }, { a: 1.25, p: 2.8, f: 6.2, acc: 7.0, tau: 0.7 }, { a: 1.3, p: 3.2, f: 7.0, acc: 8.5, tau: 0.9 }];
// per build: how heavy (against an ordinary body) and the fastest it can run (m/s)
const HD_BODY = { avg: [1, 7.5], thin: [0.85, 7.5], small: [0.8, 4.2], heavy: [1.35, 4.4], stocky: [1.15, 7], lanky: [0.95, 7.5], hunch: [1, 4.8], buff: [1.25, 7.5], legless: [0.6, 1.8], bloat: [1.7, 3.0], brute: [2.6, 4.8] };
const HD_FCAP = 7.5;   // no zombie outruns your sprint (7.8 m/s)
function hordeOn(z) { return SET.zspeed !== 'classic' && !!z.m && !!z.m.v2 && !z.boss && !z.fly && !z.illusion && !z.rb && !z.snatch && swarmOn('horde'); }
function hordeSpec(m) {
  if (m.hs) return m.hs;
  const d = m.def, c = HD_CLS[d.gait] == null ? 1 : HD_CLS[d.gait], G0 = HD_GEAR[c], B = HD_BODY[d.body] || HD_BODY.avg, s = m.spd;
  const am = G0.a * Math.sqrt(s), pu = Math.min(3.4, G0.p * s), fr = Math.max(pu * 1.15, Math.min(B[1], HD_FCAP, G0.f * Math.pow(s, 0.8)));
  const base = 2.125 * s;   // what the zombie's own speed stands for (68 units a second at the real scale)
  m.hs = { cls: c, kA: am / base, kP: pu / base, kF: fr / base, acc: G0.acc, tau: G0.tau, massK: B[0], mA: am, mP: pu, mF: fr };
  return m.hs;
}
function hordeMass(z) { return z.mass || (z.mass = 70 * Math.pow(z.r / (14 * ZK), 2) * hordeSpec(z.m).massK); }
// how much of the frenzy the wave allows (the first waves hold some back; all of it from wave 6)
function hordeFmix() { return clamp(0.5 + 0.1 * ((G.wave || 1) - 1), 0.5, 1); }
// which gear (0 amble, 1 pursuit, 2 frenzy), thought over four times a second; returns the speed against its own pace
function hordeGear(z, d, dt) {
  const S = hordeSpec(z.m), U = HD_U();
  if (z.fzT > 0) z.fzT -= dt;
  z.gT = (z.gT || Math.random() * 0.25) - dt;
  if (z.gT <= 0) {
    z.gT = 0.22 + Math.random() * 0.08;
    const H = z.hd ? SWARM.hb.get(z.hd) : null, march = H && H.state === 'march', surge = H && !march && (H.surgeT > 0 || H.state === 'surge');
    let want = 1;
    if ((z.los && d < 32 * U) || (surge && d < 60 * U) || (z.fzN > 0 && Math.random() < 0.55) || (z.buffT > 0)) want = 2;
    else if (d > 48 * U && !surge && !march && !z.los) want = 0;
    if (march) want = 1;
    if (z.legK >= 2) want = Math.min(want, 1);
    if (want === 2) { if (!(z.fzT > 0)) { z.fz = !z.fz; z.fzT = z.fz ? 5 + Math.random() * 5 : 1.5 + Math.random() * 2; if (z.fz) HORDE.stats.frenzy++; } }
    else { z.fz = false; z.fzT = 0; }
    z.gear = want === 2 && !z.fz ? 1 : want; z.gMarch = march;
  }
  if (z.gMarch) return 1;
  if (z.gear === 2) return S.kP + (S.kF - S.kP) * hordeFmix();
  return z.gear === 0 ? S.kA : S.kP;
}
// the body: it accelerates toward the velocity it wants, only as hard as its build allows (so it cannot turn on the spot
// at a run), then takes the crowd's shoves (overlaps pushed apart, momentum passed on)
function hordeMove(z, dt, tvx, tvy) {
  const S = hordeSpec(z.m), U = HD_U(), am = S.acc * U * (z.gear === 2 ? 1 : 0.85) * (z.stun > 0 ? 0.35 : 1) * (z.pz > 0.2 ? 0.6 : 1);
  let ax = (tvx - z.vx) / S.tau, ay = (tvy - z.vy) / S.tau; const a = Math.hypot(ax, ay);
  z.skidK = a > am ? a / am : 1; if (a > am) { ax *= am / a; ay *= am / a; }
  z.vx += ax * dt; z.vy += ay * dt;
  if (z.swF === frameNo && !z.xing) {
    let dvx = z.dvX || 0, dvy = z.dvY || 0; const dm = Math.hypot(dvx, dvy), cap = Math.hypot(z.vx, z.vy) * 1.3 + 2 * U;
    if (dm > cap) { dvx *= cap / dm; dvy *= cap / dm; }
    z.vx += dvx; z.vy += dvy; z.pushIx = (z.pushIx || 0) + dvx; z.pushIy = (z.pushIy || 0) + dvy;
    const k = z.r * 0.8 * 0.8; z.x += (z.sepX || 0) * k; z.y += (z.sepY || 0) * k;
  }
  // never faster than its build can run (a pile of shoves does not launch it)
  let v = Math.hypot(z.vx, z.vy); const vmax = z.speed * (S.kF * 1.25 + 0.5);
  if (v > vmax) { z.vx *= vmax / v; z.vy *= vmax / v; v = vmax; }
  // a hard turn it cannot make at a run: the feet skid out
  if (z.skidK > 2.2 && v > 3.2 * U && z.gear === 2) { const side = (-Math.sin(z.ang) * tvx + Math.cos(z.ang) * tvy) > 0 ? 1 : -1; hordeContact(z, AC.cornerSkid, side); }
}
// the side something is on, from the zombie's point of view (+1 its right, -1 its left)
function hordeSide(z, dx, dy) { return (-Math.sin(z.ang) * dx + Math.cos(z.ang) * dy) > 0 ? 1 : -1; }
// a contact animation (rate-limited per zombie and per frame; sent to teammates for the ones on screen)
function hordeContact(z, ci, cs, speedK) {
  if (HORDE.cfF !== frameNo) { HORDE.cfF = frameNo; HORDE.cf = 0; }
  if (!z.m || !z.m.v2 || z.dead || G.time < (z.ctT || 0) || HORDE.cf >= 12) return false;
  z.ctT = G.time + 0.75; HORDE.cf++; HORDE.stats.contacts++;
  if (typeof animaPlay === 'function') animaPlay(z, ci, { cs: cs, speed: speedK });
  if (NET.role === 'host' && NET.started && (z.simL | 0) === 0) NET.evs.push(['zc', z.nid, ci, cs < 0 ? -1 : 1]);
  return true;
}
// co-op: a contact the host played
function hordeNetContact(nid, ci, cs) { const z = NET.zmap && NET.zmap.get(nid); if (z && !z.dead && z.m && z.m.v2 && ci >= 60 && ci < AC_N) animaPlay(z, ci, { cs: cs }); }
// into a wall (or a building, a truck): stopped dead with a little bounce, sliding on along it; hard enough and it is a
// slam (a stumble), harder still knocked flat (sometimes with its legs broken: a crawler from then on)
function hordeWall(z, nx, ny) {
  const U = HD_U(), vn = z.vx * nx + z.vy * ny; if (vn >= 0) return;
  const imp = -vn / U, tx = z.vx - vn * nx, ty = z.vy - vn * ny, tv = Math.hypot(tx, ty) / U;
  z.vx = tx * 0.82 - vn * nx * 0.12; z.vy = ty * 0.82 - vn * ny * 0.12;
  const cs = hordeSide(z, -nx, -ny);
  if (imp > 3.5 && G.time > (z.slamT || 0)) {
    z.slamT = G.time + 1.4; z.pushIx = (z.pushIx || 0) + nx * imp * U * 1.5; z.pushIy = (z.pushIy || 0) + ny * imp * U * 1.5;
    if (imp > 6) { z.stun = Math.max(z.stun || 0, 1.1 + (imp - 6) * 0.25); HORDE.stats.down++; hordeContact(z, AC.bowled, cs, 1.2); if (imp > 6.5 && Math.random() < 0.3 && !z.m.ad.legless) { z.legK = Math.max(z.legK || 0, 2); z.hp *= 0.85; } }
    else { z.stun = Math.max(z.stun || 0, 0.3 + (imp - 3.5) * 0.12); HORDE.stats.slams++; hordeContact(z, AC.wallSlam, cs); }
    if (G.p && Math.hypot(G.p.x - z.x, G.p.y - z.y) < 500 && SFX.thud) SFX.thud(Math.min(1, imp / 7));
  } else if (imp > 1.1 && tv > 2.0) hordeContact(z, AC.wallScrape, cs);
}
// the crowd's knocks: a hard one from something much heavier bowls it over, one from behind shoves it, the rest bump
function hordeKnocks(z) {
  const U = HD_U(), iv = z.impV || 0;
  if (z.bowlT && G.time - z.bowlT < 0.1) { z.bowlT = 0; z.ctT = 0; if (hordeContact(z, AC.bowled, hordeSide(z, -Math.cos(z.bowlA || 0), -Math.sin(z.bowlA || 0)), 1.1)) { HORDE.stats.bowled++; z.stun = Math.max(z.stun || 0, 0.9); } return; }
  if (iv < 1.4 * U) return;
  const fx = Math.cos(z.ang), fy = Math.sin(z.ang), dot = (z.impX || 0) * fx + (z.impY || 0) * fy, cs = hordeSide(z, -(z.impX || 0), -(z.impY || 0));
  if (iv > 4.5 * U && (z.impM || 1) > 1.8) { if (hordeContact(z, AC.bowled, cs, 1.1)) { HORDE.stats.bowled++; z.stun = Math.max(z.stun || 0, 0.8); } }
  else if (dot > 0.45) { if (hordeContact(z, AC.shoved, cs)) HORDE.stats.shoved++; }
  else if (hordeContact(z, AC.bump, cs, Math.min(1.4, iv / (2.5 * U)))) HORDE.stats.bumps++;
}

/* ---------- whatever it takes: crossing what is in the way ---------- */
const HD_LOW = { bench: 0.8, trough: 0.9, log: 0.5, wood: 1.2, barrier: 1.0, rail: 0.9, drift: 0.6, bones: 0.4 };
// how tall a thing is (m) and what it costs to cross on the pathfinding map (0: it cannot be crossed)
function hordeRectH(b) {
  if (b.k === 'car') { const v = typeof VEH !== 'undefined' && VEH[b.vt]; return b.flip ? 1.2 : v ? v.h : 1.5; }
  if (b.k === 'wreck') return b.ht || 3;
  return HD_LOW[b.k] || (b.k === 'fence' ? 1.8 : b.k === 'dumpster' ? 1.6 : b.k === 'rub' ? 2.2 : (typeof LUX_HT !== 'undefined' && LUX_HT[b.k]) || 3);
}
function hordeCrossCost(b) {
  if (b.k === 'car') return hordeRectH(b) <= 1.95 ? 3.2 : 0;
  if (HD_LOW[b.k]) return 1.6;
  if (b.k === 'fence') return 8;
  if (b.k === 'dumpster') return 3.6;
  if (b.k === 'rub') return 3;
  if (b.k === 'wreck') return b.low ? 2.5 : 0;
  return 0;
}
// what blocks a crossing zombie's map (the solid and the tall), and what its cells cost
function blockedX(x, y, r) {
  const rs = rectsNear(x, y, r);
  for (let i = 0; i < rs.length; i++) { const b = rs[i]; if (hordeCrossCost(b)) continue; const nx = clamp(x, b.x, b.x + b.w), ny = clamp(y, b.y, b.y + b.h); if ((x - nx) * (x - nx) + (y - ny) * (y - ny) < r * r) return true; }
  return false;
}
function crossCostAt(x, y, r) {
  const rs = rectsNear(x, y, r); let c = 1;
  for (let i = 0; i < rs.length; i++) { const b = rs[i], k = hordeCrossCost(b); if (!k) continue; const nx = clamp(x, b.x, b.x + b.w), ny = clamp(y, b.y, b.y + b.h); if ((x - nx) * (x - nx) + (y - ny) * (y - ny) < r * r && k > c) c = k; }
  return c;
}
// walked into something it can cross and it wants to go that way: over it (or under, or through its windows)
function hordeTryCross(z, b, nx, ny, ux, uy) {
  if (z.xing || -(ux * nx + uy * ny) < 0.35 || !hordeCrossCost(b)) return false;
  const U = HD_U(), d = z.m.def, legless = !!z.m.ad.legless || z.legK >= 2, heavy = d.body === 'bloat' || d.body === 'heavy' || d.body === 'brute', h = hordeRectH(b), v = Math.hypot(z.vx, z.vy), fast = z.gear === 2 && v > 3 * U;
  let mode, sp;
  if (b.k === 'car') {
    if (legless) { mode = 'under'; sp = 0.6; }
    else if (h > 1.65) { mode = 'climb'; sp = heavy ? 0.9 : 1.2; }
    else if (heavy) { mode = h < 1.5 ? 'vault' : 'climb'; sp = 1.1; }
    else if (fast) { mode = Math.random() < 0.68 ? 'vault' : 'dive'; sp = mode === 'vault' ? 3.4 : 2.8; }
    else { const q = Math.random(); mode = q < 0.42 ? 'climb' : q < 0.72 ? 'dive' : 'vault'; sp = mode === 'climb' ? 1.3 : mode === 'dive' ? 2.2 : 2.6; }
    if (mode === 'dive' && (b.burnt || b.flip)) mode = 'climb';
  } else if (b.k === 'fence' || b.k === 'dumpster' || b.k === 'rub' || b.k === 'wreck') { if (legless && b.k === 'fence') return false; mode = 'climb'; sp = b.k === 'fence' ? 0.8 : 1.1; if (b.k === 'fence') HORDE.stats.fences++; }
  else { mode = legless ? 'climb' : 'vault'; sp = legless ? 0.7 : fast ? 3.4 : 2.2; }
  const across = Math.abs(nx) > Math.abs(ny) ? b.w : b.h, len = across + z.r * 1.7, dur = len / (sp * U);
  z.xing = { b: b, mode: mode, t: 0, dur: dur, dx: -nx, dy: -ny, h: h, len: len };
  z.vx = -nx * sp * U; z.vy = -ny * sp * U;
  const ci = mode === 'climb' ? AC.climbOver : mode === 'vault' ? AC.vault : AC.diveThrough;   // (a crawler's "dive" is under the car)
  z.ctT = 0; hordeContact(z, ci, hordeSide(z, 0, 1), z.m.adur[ci] / Math.max(0.3, dur));
  HORDE.stats[mode === 'climb' ? 'climbs' : mode === 'vault' ? 'vaults' : mode === 'dive' ? 'dives' : 'unders']++;
  return true;
}
// one frame of crossing: straight across at its pace, up and down with the move, nothing else in the way
function hordeCrossTick(z, dt) {
  const X = z.xing, U = HD_U(); X.t += dt; const u = Math.min(1, X.t / X.dur), sp = X.len / X.dur;
  z.vx = X.dx * sp; z.vy = X.dy * sp; z.ang = angLerp(z.ang, Math.atan2(X.dy, X.dx), Math.min(1, dt * 8));
  z.pz = X.mode === 'vault' ? X.h * 0.72 * Math.sin(Math.PI * u) : X.mode === 'climb' ? X.h * Math.min(1, u / 0.25, (1 - u) / 0.25) : X.mode === 'dive' ? X.h * 0.55 * Math.sin(Math.PI * u) : 0;
  z.under = X.mode === 'under';
  if (u >= 1 || X.t > X.dur * 1.8) { z.xing = null; z.pz = 0; z.under = false; z.vx = X.dx * Math.min(sp, 2 * U); z.vy = X.dy * Math.min(sp, 2 * U); }
  void U;
}

/* ---------- pile-ups ---------- */
// called each frame for a zombie: climbing onto the crowd when it is pressed and stuck, standing on the ones under it,
// coming down when nothing holds it up (or standing on a car roof it climbed onto)
function hordePile(z, dt, stuck, d) {
  const U = HD_U();
  if (z.xing) return;
  const sup = z.sup | 0, pz = z.pz || 0;
  // under a pile: pinned, trampled as they climb over
  if ((z.onN | 0) >= 1 && pz < 0.2) { z.pinK = Math.min(1, (z.pinK || 0) + dt * 2); if ((z.onN | 0) >= 3 && Math.random() < dt * 0.8) { HORDE.stats.pinned++; hordeContact(z, AC.trampled, Math.random() < 0.5 ? -1 : 1); } else if (Math.random() < dt * 0.6) { HORDE.stats.pinned++; hordeContact(z, AC.pinned, 1); } }
  else z.pinK = Math.max(0, (z.pinK || 0) - dt * 2);
  // start climbing: pressed hard, getting nowhere, wanting to go on (and the pile has room to grow)
  if (!z.climb && pz < 0.1 && stuck > 0.45 && (z.press || 0) > 1.0 && z.gear >= 1 && d < 40 * U && !z.m.ad.legless && HORDE.climbN < 70 && Math.random() < dt * 1.6) {
    z.climb = 1; z.pzv = 0; HORDE.stats.piles++;
  }
  if (z.climb) {
    // up onto the backs in front, a body's height above the highest of them (at most about 3 m)
    const top = Math.min(3.1, (z.pileTop || 0) + 0.55);
    if (pz < top) { z.pz = Math.min(top, pz + dt * 0.9); hordeContact(z, AC.pileClimb, 1); }
    // (while it is still getting up it holds on to the bodies it presses against; once up it needs some under it)
    if ((pz > 0.6 ? sup === 0 : (z.press || 0) < 0.25) && !hordeRoof(z)) { z.climb = 0; z.pzv = 0; }
    else if (pz > 0.3 && sup === 0 && hordeRoof(z) && Math.random() < dt * 0.5) z.climb = 0;   // on a roof: it walks off
  }
  // nothing under it: it falls (a long fall is a tumble)
  if (!z.climb && (z.pz || 0) > 0) {
    const roof = hordeRoof(z);
    if (roof && z.pz <= roof + 0.05 && sup === 0 && Math.random() > dt * 0.4) { z.pz = roof; z.pzv = 0; return; }
    z.pzv = (z.pzv || 0) - 9.8 * dt; z.pz += z.pzv * dt;
    if (z.pz <= 0) { const fell = -(z.pzv || 0); z.pz = 0; z.pzv = 0; if (fell > 3.2) { HORDE.stats.falls++; z.stun = Math.max(z.stun || 0, 0.6); hordeContact(z, AC.pileTumble, Math.random() < 0.5 ? -1 : 1); } }
  }
  if (z.pz > HORDE.stats.maxPz) HORDE.stats.maxPz = +z.pz.toFixed(2);
}
// the roof of whatever it stands over (a car it climbed onto), m, or 0
function hordeRoof(z) {
  const rs = rectsNear(z.x, z.y, 2); let h = 0;
  for (let i = 0; i < rs.length; i++) { const b = rs[i]; if (z.x < b.x || z.x > b.x + b.w || z.y < b.y || z.y > b.y + b.h) continue; const k = hordeCrossCost(b) ? hordeRectH(b) : 0; if (k > h) h = k; }
  return h;
}
// a blast brings the pile down: the ones on top fall, the ones near are bowled over
function hordeBlast(x, y, R) {
  if (!swarmUp()) return;
  near(x, y, R, z => { if (z.dead || !z.m || !z.m.v2) return; const d = Math.hypot(z.x - x, z.y - y); if (d > R) return; if (z.pz > 0.2) { z.climb = 0; z.pzv = 1.5; } if (d < R * 0.75) { z.bowlT = G.time; z.bowlA = Math.atan2(z.y - y, z.x - x); } });
}

/* ---------- the pack's brain: cutting you off ---------- */
// where you are running to: the furthest open point ahead of you along the way you are moving (up to about 32 m),
// and a field that leads there; the zombies that are nearer that point than you are go there instead
function hordeBrain(dt) {
  HORDE.cutT -= dt; if (HORDE.cutT > 0) return;
  HORDE.cutT = 1.0;
  const p = G.p, U = HD_U(); if (!p || G.mode !== 'play' || NET.role === 'client' || SET.zspeed === 'classic' || !FF.ready) { HORDE.cut = null; return; }
  const vx = p.ivx || 0, vy = p.ivy || 0, v = Math.hypot(vx, vy);
  if (v < 1.6 * U) { HORDE.cut = null; return; }
  const ux = vx / v, uy = vy / v, step = FF_CS * 0.5; let ex = p.x, ey = p.y, n = 0;
  for (let s = step; s < 32 * U; s += step) { const x = p.x + ux * s, y = p.y + uy * s; if (cellBlockedF(FF, Math.floor(x / FF_CS), Math.floor(y / FF_CS))) break; ex = x; ey = y; n++; }
  if (Math.hypot(ex - p.x, ey - p.y) < 9 * U) { HORDE.cut = null; return; }
  let F = HORDE.F; if (!F) { F = HORDE.F = newField(15, false, 'cut'); F.cache = FF.cache; F.cross = FF.cross; F.ccache = FF.ccache; }
  F.owner = { x: ex, y: ey }; F.cross = FF.cross; F.ccache = FF.ccache;
  buildField(F);
  HORDE.cut = { F: F, x: ex, y: ey, id: ++HORDE.cutId, px: p.x, py: p.y };
  // who goes: of the pack after you, the ones whose way to that point is shorter than their way to you
  let nc = 0; const ofP = FF, cap = Math.max(4, Math.round(G.zs.length * 0.4));
  for (const z of G.zs) {
    if (z.dead || !hordeOn(z) || z.xing || nc >= cap) { z.cutF = 0; continue; }
    const dP = hordeFieldD(ofP, z.x, z.y), dE = hordeFieldD(F, z.x, z.y), dpl = Math.hypot(p.x - z.x, p.y - z.y) / U;
    const pick = (((z.nid | 0) * 2654435761) >>> 0) % 100 < 45;
    if (pick && dE < dP * 0.8 && dpl > 9 && dE < 1e8) { z.cutF = HORDE.cut.id; nc++; } else z.cutF = 0;
  }
  HORDE.stats.cutters = nc;
}
function hordeFieldD(F, x, y) { if (!F.ready) return 1e9; const n = F.n, i = Math.floor(x / F.cs) - F.ox, j = Math.floor(y / F.cs) - F.oy; if (i < 0 || j < 0 || i >= n || j >= n) return 1e9; return F.dist[j * n + i]; }
// a cutter's way: to the point ahead of you, until it is there or you have come past it
function hordeCutDir(z) {
  const C = HORDE.cut; if (!C || z.cutF !== C.id) return null;
  const U = HD_U(), p = G.p; if (Math.hypot(C.x - z.x, C.y - z.y) < 4 * U || (p && Math.hypot(p.x - z.x, p.y - z.y) < 9 * U)) { z.cutF = 0; return null; }
  return flowDir(z.x, z.y, C.F);
}

/* ---------- each frame ---------- */
function hordeFrame(dt) {
  let n = 0; for (const z of G.zs) if (z.climb || z.pz > 0.3) n++; HORDE.climbN = n;
  try { hordeBrain(dt); } catch (e) { swarmHurt(e, 'horde'); }
}
// a zombie up on a pile or a roof is drawn bigger (it is nearer the camera); its shadow lands further off
function hordeLift(z) { return 1 + Math.min(3.2, z.pz || 0) * 0.085; }
function hordeSelfTest() {
  let n = 0, pass = 0, why = '';
  const S = hordeSpec(ZR_BY.get('jogger')), W0 = hordeSpec(ZR_BY.get('office'));
  n++; if (S.mF <= HD_FCAP + 1e-6 && S.mF > 6 && W0.mF < 3.5 && W0.mA < 0.8) pass++; else why = why || 'the gears are off';
  n++; if (hordeCrossCost({ k: 'car', vt: 'sedan' }) > 1 && !hordeCrossCost({ k: 'car', vt: 'bus' }) && hordeCrossCost({ k: 'fence' }) > hordeCrossCost({ k: 'bench' }) && !hordeCrossCost({ k: 'b' })) pass++; else why = why || 'crossing rules are off';
  n++; if (Math.abs(hordeRectH({ k: 'car', vt: 'sedan' }) - 1.45) < 0.01 && hordeRectH({ k: 'fence' }) === 1.8) pass++; else why = why || 'heights are off';
  n++; if (ZR.every(m => { const s = hordeSpec(m); return s.mA < s.mP && s.mP < s.mF + 1e-6 && s.mF <= HD_FCAP + 1e-6; })) pass++; else why = why || 'a zombie with its gears out of order';
  return { ok: pass === n, n: n, pass: pass, why: why };
}
// the ground shadow of a zombie up off the ground: softer and further off the higher it is, along the light
function hordeShadow(z, s, e, f) {
  const U = HD_U(), h = Math.min(3.2, z.pz || 0);
  const sun = CORE.frame && CORE.frame.sun, dx = sun && sun.on ? sun.dx : 0.5, dy = sun && sun.on ? sun.dy : 0.6, k = h * U * 0.55;
  const x = z.x + dx * k, y = z.y + dy * k, r = z.r * (1.05 + h * 0.18);
  ctx.setTransform(s, 0, 0, s, e + x * s, f + y * s);
  const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r); g.addColorStop(0, 'rgba(0,0,0,' + (0.32 - h * 0.05).toFixed(3) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
}
// a foot caught on a body on the ground (running flat out over the dead)
function hordeTrip(z, dt) {
  z.tripT = (z.tripT == null ? Math.random() * 0.3 : z.tripT) - dt; if (z.tripT > 0) return; z.tripT = 0.3;
  if ((z.simL | 0) > 0 || z.xing || z.pz > 0.1 || typeof ANIMA === 'undefined' || !ANIMA.corpses.length) return;
  const U = HD_U(), v = Math.hypot(z.vx, z.vy), rr = z.r * 0.9;
  // squeezed from the sides while trying to get on: it turns side-on to get through
  if (v < 0.8 * U && (z.press || 0) > 0.9 && z.gear >= 1) { const sl = Math.abs(-Math.sin(z.ang) * (z.sepX || 0) + Math.cos(z.ang) * (z.sepY || 0)), sf = Math.abs(Math.cos(z.ang) * (z.sepX || 0) + Math.sin(z.ang) * (z.sepY || 0)); if (sl > sf * 1.6 && Math.random() < 0.3) hordeContact(z, AC.squeeze, hordeSide(z, z.sepX || 0, z.sepY || 0)); }
  if (v < 3 * U) return;
  for (const C of ANIMA.corpses) { if (!C.done) continue; const dx = C.x - z.x, dy = C.y - z.y; if (dx * dx + dy * dy < rr * rr && Math.random() < 0.35) { HORDE.stats.trips++; z.stun = Math.max(z.stun || 0, 0.55); z.vx *= 0.45; z.vy *= 0.45; hordeContact(z, AC.trip, 1); return; } }
}
