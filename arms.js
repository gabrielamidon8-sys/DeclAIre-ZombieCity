/* ================= ARMS: the guns rebuilt on real ones, and how the Operator handles them =================
   1.9.993. The 250 frame-and-mod guns rest while they are rebuilt ten at a time; the first ten are five primaries
   (M4A1, AK-74M, Mk 17, M1014, PP-19) and five secondaries (M17, M9, M1911A1, M1917, APS), each with its real calibre,
   capacity, rate and muzzle velocity (weapons.js). You carry one of each and swap between them.
   How they are handled, from the references (README > what was studied):
   - Ready positions. Relaxed, the gun rides at low ready, muzzle down and forward; engaged, it comes up to the eyes
     (a focused posture: shoulders forward, knees soft, slower steps). Bringing it up takes the gun's ready time; after a
     few quiet seconds it comes back down. Nothing fires until the gun is up.
   - Sprinting. The gun comes off target and is carried; you cannot shoot. Letting go brings it back up (its ready
     time) before the first shot.
   - Reloads, each gun its own technique: the AR's speed reload (the empty drops, a fresh one seated, the bolt catch
     slapped on empty), the AK's strip-and-rock with the charging handle racked under, the SCAR's left-side reciprocating
     handle, the shotgun's shell-by-shell tube with a combat load through the port on empty, the PP-19's helical
     magazine hooked on its front pins and rotated up, a pistol's slide lock, the 1911's slide stop, the revolver's
     half-moon clips. A round stays in the chamber on a tactical reload (thirty plus one). With nothing close, a
     half-empty magazine is kept (a tactical reload); under pressure it is dropped. Pressing reload with a full gun
     checks it instead (a press check). Empty magazines lie in the street for 30 seconds, spent cases for 5 (PHYSICS).
   - The dodge. The dash button is a dodge roll now (the 25 dashes rest): a combat roll that is untouchable for its
     first part, then you are committed; it cancels a reload (a shotgun keeps the shells it already took).
   - Recoil. Every shot kicks the gun, the shoulders and the camera by its round: a 9 mm pistol a little, 7.62 hard,
     buckshot harder. */
var ARMS_ON = true;   // (a var: other files ask before this one has run)
const ARMS = { ver: 1, fired: 0, reloads: 0, tac: 0, specials: 0, swaps: 0, dodges: 0, checks: 0, dry: 0, sprintS: 0, errT: [], offUntil: 0, hudK: '', uses: store.get('zc_armsUse', {}) };
const ARMS_LIST = WEAPONS.filter(w => w.arms), ARMS_BY = {}; ARMS_LIST.forEach(w => { ARMS_BY[w.arms.key] = w; });
const ARMS_PRI = ARMS_LIST.filter(w => w.slot === 'primary'), ARMS_SEC = ARMS_LIST.filter(w => w.slot === 'secondary');
const ARMS_ST = ['relaxed', 'raise', 'ready', 'lower', 'reload', 'swapOut', 'swapIn', 'sprint', 'sprintOut', 'dodge', 'inspect'];
function armsOn() { return ARMS_ON; }
function armsUp() { return !(ARMS.offUntil && performance.now() < ARMS.offUntil); }
// the loadout: a primary and a secondary (stored on the device and in the cloud save with the rest)
function armsLoad() {
  const s = store.get('zc_arms', null) || {};
  return { p: ARMS_BY[s.p] && ARMS_BY[s.p].slot === 'primary' ? s.p : 'm4a1', s: ARMS_BY[s.s] && ARMS_BY[s.s].slot === 'secondary' ? s.s : 'm17' };
}
function armsSetLoad(slot, key) { const L = armsLoad(); if (slot === 'primary') L.p = key; else L.s = key; store.set('zc_arms', L); }
function armsPrimary() { return ARMS_BY[armsLoad().p]; }
function armsSecondary() { return ARMS_BY[armsLoad().s]; }
function armsCap(w) { const A = w.arms; return A.mag + (A.chamber || 0); }

/* ---------- the shared tables: every engine that looks guns up by name learns the new ten ---------- */
const ARMS_MZ = {
  ak: { len: 22, w: 12, prong: 2, brake: true, sparks: 4, smoke: 0.55, brass: '', light: [285, 1.05, 0.07] },
  battle: { len: 28, w: 12, prong: 3, cage: true, sparks: 4, smoke: 0.85, brass: '', light: [325, 1.18, 0.08] },
  pistol45: { len: 16, w: 12, prong: 3, sparks: 4, smoke: 0.75, brass: '', light: [272, 1.02, 0.08] },
  pistolA: { len: 13, w: 9, prong: 4, sparks: 2, smoke: 0.4, brass: '', light: [238, 0.9, 0.05] }
};
(function armsTables() {
  for (const w of ARMS_LIST) {
    const A = w.arms, k = A.key;
    BAL_GUN[k] = { v: A.v, g: A.g, cd: A.cd, kick: A.kick, rec: A.rec, max: A.max, cal: A.cal };
    MZ[k] = Object.assign({}, ARMS_MZ[A.mz] || MZ[A.mz] || MZ[A.base], { brass: '' });   // (PHYSICS throws the brass now)
    TR_GUN[k] = Object.assign({}, TR_GUN[A.base] || TR_GUN.pistol);
    GORE_GUN[k] = Object.assign({}, GORE_GUN[A.base] || GORE_GUN.pistol);
    if (A.key === 'mk17') GORE_GUN[k] = Object.assign({}, GORE_GUN.sniper || GORE_GUN.rifle);
    SW_EAR[k] = A.key === 'mk17' ? 110 : A.key === 'm1014' ? 80 : A.slot === 'secondary' ? (A.key === 'm1911' || A.key === 'm1917' ? 70 : 60) : A.key === 'pp19' ? 55 : 90;
    GUN_LEN[k] = A.len; if (A.w) GUN_W[k] = A.w;
  }
  // the dodge roll stands in for the dashes: committed, untouchable for its first part, quiet (no trail)
  DASH_BY.dodge = { id: 'dodge', name: 'Dodge roll', r: 0, hex: '#c9d2dc', ico: 'run', cd: 0.42, dur: 0.46, spd: 290, ifr: 0.3, quiet: true, short: 'Roll', i: 0, rgb: '201,210,220',
    prof: k => k < 0.18 ? 0.7 + k / 0.18 * 0.6 : 1.3 * Math.pow(1 - (k - 0.18) / 0.82, 1.4) + 0.08,
    desc: 'A combat roll: untouchable for its first part, then committed. Hold it to sprint out of the roll.', pas: 'No passive', st: {} };
})();

/* ---------- a player's arms ---------- */
function armsNew(p, load) {
  load = load || armsLoad();
  const W0 = ARMS_BY[load.p] || ARMS_PRI[0], W1 = ARMS_BY[load.s] || ARMS_SEC[0];
  p.arm = { w: [W0, W1], slot: 0, mag: [armsCap(W0), armsCap(W1)], st: 'relaxed', t: 0, dur: 0, eng: 9, focus: 0, kick: 0, kickN: 0, rk: '', rT: 0, rEv: 0, rSeq: 0, keep: false,
    tube: 0, tubeStop: false, next: '', emptyT: -1, latch: false, sprintHeld: false, nearT: 0, near: 0, dryT: 0, swSeq: 0, dodgeEnd: '', camK: 0 };
  p.weapon = W0; p.dashK = 'dodge';
  return p.arm;
}
function armsSet(p, st, dur) { const a = p.arm; a.st = st; a.t = 0; a.dur = dur || 0; }
// what the posture blends toward (0 relaxed .. 1 on target)
function armsFocusGoal(a) {
  switch (a.st) { case 'ready': return 1; case 'raise': return a.dur ? clamp(a.t / a.dur, 0, 1) : 1; case 'lower': return a.dur ? 1 - clamp(a.t / a.dur, 0, 1) : 0; case 'reload': return 0.55; case 'inspect': return 0.4; case 'sprintOut': return a.dur ? clamp(a.t / a.dur, 0, 1) * 0.8 : 0.8; default: return 0; }
}
// something says "fight": a shot wanted, a target, a hit taken, the dead close by
function armsEngage(p) { if (p.arm) p.arm.eng = 0; }
function armsSpeedMul(p) {
  const a = p.arm; if (!a) return 1;
  switch (a.st) { case 'sprint': return 1.45; case 'ready': return 0.86; case 'raise': case 'sprintOut': return 0.9; case 'reload': return 0.88; case 'swapOut': case 'swapIn': return 0.95; case 'inspect': return 0.92; default: return 1; }
}
function armsCanSprint(p) { const a = p.arm; return a && (a.st === 'relaxed' || a.st === 'ready' || a.st === 'raise' || a.st === 'lower' || a.st === 'inspect' || a.st === 'sprintOut'); }
// every frame for the local player: input, timers, transitions, reload events
function armsTick(p, dt, moving) {
  const a = p.arm; if (!a || !armsUp()) return;
  try {
    const w = p.weapon, A = w.arms;
    a.t += dt; a.eng += dt; a.kick = Math.max(0, a.kick - dt * 6); a.camK = Math.max(0, a.camK - dt * 5);
    a.focus += (armsFocusGoal(a) - a.focus) * Math.min(1, dt * 10);
    // the dead close by keep him on guard (looked up a few times a second)
    a.nearT -= dt; if (a.nearT <= 0) { a.nearT = 0.25; let n = 0; const R = 7 * physU(); near(p.x, p.y, R, z => { if (!z.dead && !z.illusion && !z.st.under && Math.hypot(z.x - p.x, z.y - p.y) < R) n++; }); a.near = n; if (n) armsEngage(p); }
    // sprint: held (Shift, or the dodge button held on a phone), or latched with the left stick
    const want = (typeof held === 'function' && (held('sprint') || held('dash'))) || a.latch || !!G.touchSprint;   // (the dodge held: he sprints out of the roll)
    if (!moving) a.latch = false;
    if (want && moving && armsCanSprint(p)) { if (a.st !== 'sprint') { armsSet(p, 'sprint'); ARMS.sprintS++; armsSnd('sling', 1); } }
    else if (a.st === 'sprint' && (!want || !moving)) { armsSet(p, 'sprintOut', A.ready * 1.15); armsSnd('readyUp', 1); }
    if (a.st === 'sprint' && Math.floor((p.walk || 0) / 3.2) !== a.sprStep) { a.sprStep = Math.floor((p.walk || 0) / 3.2); armsSnd('sprintStep', 1, 0.6); }
    // the bolt has locked back: reload on its own a beat later
    if (a.emptyT >= 0) { a.emptyT -= dt; if (a.emptyT < 0 && a.mag[a.slot] <= 0 && (a.st === 'ready' || a.st === 'relaxed')) armsReload(p); }
    switch (a.st) {
      case 'raise': if (a.t >= a.dur) armsSet(p, 'ready'); break;
      case 'ready': if (a.eng > 4.2) { armsSet(p, 'lower', A.ready * 1.3); armsSnd('readyDown', 1); } break;
      case 'lower': if (a.t >= a.dur) armsSet(p, 'relaxed'); break;
      case 'sprintOut': if (a.t >= a.dur) armsSet(p, a.eng < 1 ? 'ready' : 'relaxed'); break;
      case 'inspect': if (a.t >= a.dur) armsSet(p, a.eng < 1 ? 'ready' : 'relaxed'); break;
      case 'reload': armsReloadTick(p, dt); break;
      case 'swapOut': if (a.t >= a.dur) { a.slot = 1 - a.slot; p.weapon = a.w[a.slot]; recalc(p); updWeaponChip(); armsSet(p, 'swapIn', p.weapon.arms.draw); armsSnd('draw', p.weapon.slot === 'primary' ? 0.95 : 1.05); } break;
      case 'swapIn': if (a.t >= a.dur) armsSet(p, a.eng < 1.5 ? 'ready' : 'relaxed'); break;
      case 'dodge': if (!(p.dashT > 0)) armsSet(p, a.dodgeEnd || (a.eng < 1 ? 'raise' : 'relaxed'), a.dodgeEnd === 'raise' ? A.ready : 0); break;
    }
  } catch (e) { armsHurt(e); }
}
// a shot wanted (target: the zombie, ang: the aim): true when a round actually left the gun
function armsFire(p, target, ang, auto) {
  const a = p.arm; if (!a) { fireWeapon(target, ang); return true; }
  const w = p.weapon, A = w.arms;
  armsEngage(p);
  if (a.st === 'sprint') { a.latch = false; G.touchSprint = false; armsSet(p, 'sprintOut', A.ready * 1.15); armsSnd('readyUp', 1); return false; }
  if (a.st === 'relaxed') { armsSet(p, 'raise', A.ready); armsSnd('readyUp', 1); return false; }
  if (a.st === 'lower') { const k = a.dur ? clamp(a.t / a.dur, 0, 1) : 1; armsSet(p, 'raise', A.ready); a.t = A.ready * (1 - k); return false; }
  if (a.st === 'inspect') { armsSet(p, 'raise', A.ready * 0.6); return false; }
  if (a.st === 'reload') { if (A.reload.kind === 'tube' && a.mag[a.slot] > 0 && (!auto || a.near > 0)) a.tubeStop = true; return false; }   // (the shotgun: stop loading and shoot)
  if (a.st !== 'ready') return false;
  if (p.fireCd > 0 || p.jamT > 0 || p.frozenT > 0) return false;
  if (a.mag[a.slot] <= 0) { if (G.time - a.dryT > 0.35) { a.dryT = G.time; ARMS.dry++; armsSnd('dry', 1); } armsReload(p); return false; }
  // the cyclic rate holds even when frames are slow: the time owed carries over (two or three rounds in a long frame)
  if (p.fireCd < -0.15) p.fireCd = 0;
  let shots = 0;
  do {
    fireWeapon(target, ang); a.mag[a.slot]--; ARMS.fired++; shots++;
    p.fireCd = Math.max(p.fireCd, -0.12) + 1 / (p.S.rof * dashRofMul(p));
    a.kick = 1; a.kickN++; a.camK = Math.min(1.6, a.camK + A.cam);
  } while (p.fireCd <= 0 && a.mag[a.slot] > 0 && shots < 3);
  if (a.mag[a.slot] <= 0) { a.emptyT = 0.14; armsSnd('empty', A.slot === 'primary' ? 0.9 : 1.1, 0, 0.5); }
  return true;
}
/* ---------- reloads ---------- */
// each technique's beats: [fraction of the reload, what happens]; tac (a round still chambered) and empty
const ARMS_BEATS = {
  ar: { tac: [[0.08, 'magRelease'], [0.12, 'magOut'], [0.55, 'magIn'], [0.62, 'magTap']], empty: [[0.06, 'magRelease'], [0.1, 'magOut'], [0.5, 'magIn'], [0.56, 'magTap'], [0.78, 'boltCatch']] },
  ak: { tac: [[0.1, 'magOut'], [0.5, 'magIn']], empty: [[0.08, 'magOut'], [0.44, 'magIn'], [0.7, 'chargeBack'], [0.79, 'chargeHome']] },
  scar: { tac: [[0.08, 'magRelease'], [0.12, 'magOut'], [0.55, 'magIn'], [0.6, 'magTap']], empty: [[0.07, 'magRelease'], [0.1, 'magOut'], [0.48, 'magIn'], [0.53, 'magTap'], [0.74, 'chargeBack'], [0.8, 'chargeHome']] },
  helix: { tac: [[0.1, 'magRelease'], [0.18, 'magOut'], [0.55, 'magIn'], [0.66, 'magTap']], empty: [[0.08, 'magRelease'], [0.15, 'magOut'], [0.48, 'magIn'], [0.57, 'magTap'], [0.8, 'chargeBack'], [0.86, 'chargeHome']] },
  pistol: { tac: [[0.1, 'magRelease'], [0.14, 'magOut'], [0.55, 'magIn']], empty: [[0.08, 'magRelease'], [0.12, 'magOut'], [0.5, 'magIn'], [0.75, 'slideDrop']] },
  p1911: { tac: [[0.1, 'magRelease'], [0.14, 'magOut'], [0.56, 'magIn']], empty: [[0.08, 'magRelease'], [0.12, 'magOut'], [0.52, 'magIn'], [0.76, 'slideDrop']] },
  moon: { tac: [[0.08, 'cylOpen'], [0.22, 'eject'], [0.5, 'moonIn'], [0.68, 'moonIn'], [0.86, 'cylClose']], empty: [[0.08, 'cylOpen'], [0.22, 'eject'], [0.5, 'moonIn'], [0.68, 'moonIn'], [0.86, 'cylClose']] },
  tube: { tac: [[0.7, 'shellIn']], empty: [[0.45, 'portLoad'], [0.85, 'boltRelease']] }
};
function armsReload(p) {
  const a = p.arm; if (!a) return false;
  const w = p.weapon, A = w.arms, cap = armsCap(w), n = a.mag[a.slot];
  if (a.st === 'reload' || a.st === 'swapOut' || a.st === 'swapIn' || a.st === 'dodge') return false;
  if (a.st === 'sprint') { a.latch = false; G.touchSprint = false; }
  if (n >= cap || (A.reload.kind === 'tube' && n >= A.mag + 1)) {
    // full: a press check instead (a look at the chamber, the magazine tapped)
    if (a.st === 'relaxed' || a.st === 'ready') { armsSet(p, 'inspect', 1.3); ARMS.checks++; armsSnd(A.slot === 'primary' ? 'chargeBack' : 'slideRack', 1.15, 0, 0.35); }
    return false;
  }
  const empty = n <= 0, kind = A.reload.kind;
  a.rk = kind === 'moon' ? 'moon' : empty ? 'empty' : 'tac'; a.rEv = 0; a.tubeStop = false;
  if (kind === 'tube') { a.rk = empty ? 'port' : 'shell'; a.tube = 0; }
  a.keep = !empty && kind !== 'moon' && kind !== 'tube' && a.near === 0;   // nothing close: the half-empty magazine is kept
  armsSet(p, 'reload', kind === 'tube' ? (empty ? A.reload.empty : A.reload.perShell) : (empty ? A.reload.empty : A.reload.tac));
  a.rSeq++; ARMS.reloads++; if (a.keep) ARMS.tac++; if (empty || kind === 'moon' || kind === 'tube' || kind === 'ak' || kind === 'helix') ARMS.specials++;
  if (!ARMS.testing) armsUse(A.key, 'reload');
  return true;
}
function armsReloadTick(p, dt) {
  const a = p.arm, w = p.weapon, A = w.arms, kind = A.reload.kind, beats = ARMS_BEATS[kind] || ARMS_BEATS.pistol;
  const seq = kind === 'tube' ? (a.rk === 'port' ? beats.empty : beats.tac) : (a.rk === 'empty' ? beats.empty : beats.tac), f = a.dur ? a.t / a.dur : 1;
  while (a.rEv < seq.length && f >= seq[a.rEv][0]) { armsBeat(p, seq[a.rEv][1]); a.rEv++; }
  if (a.t < a.dur) return;
  // done (or, for the tube, one more shell)
  if (kind === 'tube') {
    if (a.rk === 'port') a.mag[a.slot] = 1; else a.mag[a.slot] = Math.min(A.mag + 1, a.mag[a.slot] + 1);
    if (a.mag[a.slot] < A.mag + 1 && !a.tubeStop && !(a.mag[a.slot] > 0 && a.eng < 0.4 && typeof wantFire === 'function' && wantFire(p))) { a.rk = 'shell'; a.rEv = 0; armsSet(p, 'reload', A.reload.perShell); return; }
    armsSet(p, 'ready'); a.eng = Math.min(a.eng, 1); return;
  }
  const cap = armsCap(w);
  a.mag[a.slot] = a.rk === 'empty' || kind === 'moon' ? A.mag : cap;   // empty: the bolt chambers one from the fresh magazine
  armsSet(p, a.eng < 2 ? 'ready' : 'relaxed');
}
// a beat of the reload: its sound, and the magazine leaving the gun
function armsBeat(p, b) {
  const a = p.arm, A = p.weapon.arms, r = A.slot === 'primary' ? (A.key === 'mk17' ? 0.86 : 0.95) : (A.key === 'm1911' || A.key === 'm1917' ? 0.98 : 1.06);
  armsSnd(b, r);
  if (((b === 'magOut' && !a.keep) || b === 'eject') && !ARMS.testing) armsDropMag(p);
}
function armsDropMag(p) {
  const A = p.weapon.arms, u = physU(), ca = Math.cos(p.aim), sa = Math.sin(p.aim);
  const x = p.x + ca * 0.32 * u - sa * 0.08 * u, y = p.y + sa * 0.32 * u + ca * 0.08 * u;
  physMagDrop(p.weapon, x, y, p.aim, (p.ivx || 0) * 0.5, (p.ivy || 0) * 0.5);
}
// a gun from a card in a run: it takes its slot (for this run), loaded; in the hands it comes in with a draw
function armsPickup(p, w) {
  const a = p.arm; if (!a || !w.arms) return false;
  const i = w.slot === 'primary' ? 0 : 1;
  a.w[i] = w; a.mag[i] = armsCap(w);
  if (a.slot === i) { p.weapon = w; armsSet(p, 'swapIn', w.arms.draw); a.swSeq++; armsSnd('draw', 1); }
  recalc(p); updWeaponChip(); ARMS.hudK = '';
  toast(w.slot === 'primary' ? 'Primary' : 'Secondary', w.arms.full + ' · ' + w.arms.cal, WRAR[w.rarity].color); SFX.unlock();
  return true;
}
function armsSwap(p) {
  const a = p.arm; if (!a || G.mode !== 'play') return false;
  if (a.st === 'swapOut' || a.st === 'swapIn' || a.st === 'dodge') return false;
  if (a.st === 'sprint') { a.latch = false; }
  if (a.st === 'reload' && p.weapon.arms.reload.kind !== 'tube') a.rEv = 0;   // (the magazine in progress is lost; the tube keeps its shells)
  armsSet(p, 'swapOut', p.weapon.arms.holster); a.swSeq++; ARMS.swaps++;
  armsSnd(p.weapon.slot === 'primary' ? 'sling' : 'holster', 1);
  return true;
}
function armsDodge(p) {
  const a = p.arm; if (!a) return false;
  if (G.mode !== 'play' || p.dashCdT > 0 || p.frozenT > 0 || G.grab || a.st === 'dodge') return false;
  let dx = p.ix, dy = p.iy; if (Math.abs(dx) + Math.abs(dy) < 0.05) { dx = -Math.cos(p.aim); dy = -Math.sin(p.aim); }   // standing still: a roll back, away from what he faces
  const l = Math.hypot(dx, dy) || 1; p.dashDx = dx / l; p.dashDy = dy / l;
  if (a.st === 'reload') { if (p.weapon.arms.reload.kind !== 'tube') a.rEv = 0; }
  a.dodgeEnd = a.st === 'ready' || a.st === 'raise' ? 'raise' : '';
  p.dashK = 'dodge'; armsSet(p, 'dodge'); dashStart(p); ARMS.dodges++;
  armsSnd('dodge', 1);
  return true;
}
function armsSnd(n, rate, pan, vol) { if (ARMS.testing) return; try { if (SFX.arms) SFX.arms(n, rate, pan, vol); } catch (e) { } }
function armsUse(key, what) { const u = ARMS.uses[key] || (ARMS.uses[key] = { r: 0, s: 0 }); if (what === 'reload') u.r++; else u.s++; ARMS.useDirty = true; }

/* ---------- co-op: what a teammate's screen needs to draw your hands right ---------- */
// [state, progress (percent), reload number, swap number, focus (tenths), reload kind: 0 dropped, 1 empty, 2 half-moon, 3 kept]
function armsNetCode(p) { const a = p.arm; if (!a) return null; return [Math.max(0, ARMS_ST.indexOf(a.st)), a.dur ? Math.round(clamp(a.t / a.dur, 0, 1) * 100) : 0, a.rSeq & 255, a.swSeq & 255, Math.round(clamp(a.focus, 0, 1) * 10), a.rk === 'empty' || a.rk === 'port' ? 1 : a.rk === 'moon' ? 2 : a.keep ? 3 : 0]; }
// a teammate's arms on this screen (their posture, their reload, their magazines falling here too)
function armsNetApply(o, c) {
  if (!Array.isArray(c) || !o || !o.weapon || !o.weapon.arms) return;
  const a = o.arm || (o.arm = { w: [o.weapon, o.weapon], slot: 0, mag: [0, 0], st: 'relaxed', t: 0, dur: 1, focus: 0, rSeq: -1, swSeq: -1, kick: 0, camK: 0, rk: '', keep: false, eng: 9 });
  const st = ARMS_ST[c[0] | 0] || 'relaxed', seq = c[2] | 0, kind = c[5] | 0;
  a.w[a.slot] = o.weapon; a.keep = kind === 3; a.rk = kind === 1 ? 'empty' : kind === 2 ? 'moon' : 'tac';
  if (a.rSeq >= 0 && seq !== a.rSeq && st === 'reload' && !a.keep && G.mode === 'play') {
    try { const u = physU(), ca = Math.cos(o.aim || 0), sa = Math.sin(o.aim || 0); physMagDrop(o.weapon, o.x + ca * 0.32 * u - sa * 0.08 * u, o.y + sa * 0.32 * u + ca * 0.08 * u, o.aim || 0, 0, 0); } catch (e) { }
  }
  a.rSeq = seq; a.swSeq = c[3] | 0; a.focus = clamp((+c[4] || 0) / 10, 0, 1);
  a.st = st; a.dur = 1; a.t = clamp((+c[1] || 0) / 100, 0, 1);
}

/* ---------- the HUD: the gun in your hands, its rounds, the reload, the other gun ---------- */
function armsHud() {
  const p = G.p; if (!p || !p.arm) return;
  const a = p.arm, w = p.weapon, A = w.arms, n = a.mag[a.slot], cap = armsCap(w), other = a.w[1 - a.slot];
  const busy = a.st === 'reload' || a.st === 'swapIn' || a.st === 'swapOut';
  const prog = a.st === 'reload' || a.st === 'swapIn' ? clamp(a.t / (a.dur || 1), 0, 1) : 0;
  const key = w.id + '|' + n + '|' + a.st + '|' + Math.round(prog * 24) + '|' + other.id + '|' + a.mag[1 - a.slot] + '|' + a.keep;
  if (key === ARMS.hudK) return; ARMS.hudK = key;
  const app = $('app'); if (!app.classList.contains('arms')) app.classList.add('arms');
  const m = $('wMag'), c = $('wCap'), r = $('wRl'), o = $('wOther'), s = $('wRar'), rb = $('reloadBtn'), low = n <= Math.max(1, Math.round(A.mag * 0.25));
  if (m) { m.textContent = n; m.classList.toggle('low', low && n > 0); m.classList.toggle('out', n <= 0); }
  if (c) c.textContent = '/ ' + (A.reload.kind === 'tube' ? A.mag + '+1' : A.mag + (A.chamber ? '+1' : ''));
  if (s) s.textContent = a.st === 'reload' ? (A.reload.kind === 'tube' ? (a.rk === 'port' ? 'Combat load' : 'Loading shells') : a.rk === 'moon' ? 'Half-moon clips' : a.keep ? 'Tactical reload' : a.rk === 'empty' ? 'Reload · bolt home' : 'Reload')
    : a.st === 'swapIn' || a.st === 'swapOut' ? 'Drawing' : a.st === 'sprint' ? 'Sprinting · gun down' : (w.slot === 'primary' ? 'Primary' : 'Secondary') + ' · ' + A.cal;
  if (r) { r.style.setProperty('--rl', prog.toFixed(3)); r.classList.toggle('on', busy); }
  if (o) o.textContent = other.name + ' · ' + a.mag[1 - a.slot];
  if (rb) { rb.classList.toggle('low', low && !busy); rb.classList.toggle('busy', busy); }
}
// a phone: the reload button, and a tap on the gun swaps to the other one
$('reloadBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (G.mode === 'play' && G.p && G.p.arm) armsReload(G.p); });
$('wChip').addEventListener('pointerdown', e => { if (G.mode !== 'play' || !G.p || !G.p.arm || DEV.kind !== 'touch') return; e.preventDefault(); e.stopPropagation(); armsSwap(G.p); });

/* ---------- icons: each gun's side view, drawn in vector (the armory and the HUD) ---------- */
function armsDrawIcon(g, w, cx, cy, sc, sil) {
  const A = w.arms, k = A.key, dk = sil ? '#0a0c10' : '#1b1e22', md = sil ? '#0a0c10' : '#2d3238', lt = sil ? '#0a0c10' : '#4a5058', fd = sil ? '#0a0c10' : '#7a6a4a', wood = sil ? '#0a0c10' : '#6a3a22', red = sil ? '#0a0c10' : '#8a2a1e';
  g.save(); g.translate(cx, cy); g.scale(sc, sc); g.lineJoin = 'round'; g.lineCap = 'round';
  const R = (x, y, w2, h, c, r) => { g.fillStyle = c; g.beginPath(); if (g.roundRect && r) g.roundRect(x, y, w2, h, r); else g.rect(x, y, w2, h); g.fill(); };
  const P = (pts, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
  switch (k) {
    case 'm4a1':
      P([-64, -6, -40, -9, -40, 7, -58, 9, -64, 6], md); R(-40, -9, 30, 14, md, 2); R(-10, -8, 34, 12, dk, 2); R(24, -4, 36, 4, dk); R(58, -6, 6, 8, dk, 1);
      R(-6, -12, 20, 4, lt, 1); R(-2, -18, 12, 7, dk, 2); P([-22, 5, -12, 5, -16, 22, -26, 22], dk); P([-6, 5, 8, 5, 12, 28, 0, 30], md); R(16, -7, 4, 10, lt); R(-36, -2, 4, 3, lt); break;
    case 'ak74m':
      P([-66, -4, -36, -7, -36, 8, -62, 12, -66, 9], dk); R(-36, -8, 34, 14, lt, 2); R(-2, -7, 26, 12, red, 3); R(24, -5, 30, 4, dk); R(50, -7, 10, 8, dk, 1); R(-2, -11, 26, 4, dk, 1);
      P([-22, 6, -12, 6, -15, 22, -25, 22], dk); P([-4, 6, 8, 6, 18, 26, 12, 32, 2, 30], sil ? dk : '#5a2a1c'); R(-8, -11, 8, 3, lt); break;
    case 'mk17':
      P([-64, -7, -40, -9, -40, 8, -60, 10, -64, 8], fd); R(-40, -10, 50, 14, fd, 2); R(10, -9, 26, 13, fd, 2); R(36, -4, 26, 4, dk); R(60, -6, 6, 8, dk, 1);
      R(-30, -13, 56, 3, dk); R(-2, -19, 13, 7, dk, 2); P([-26, 4, -16, 4, -20, 22, -30, 22], dk); R(-6, 4, 14, 20, dk, 1); R(-8, -2, 6, 4, lt); break;
    case 'm1014':
      P([-66, -5, -36, -7, -36, 7, -62, 10, -66, 7], dk); R(-36, -8, 30, 13, dk, 2); R(-6, -7, 66, 5, dk, 1); R(-6, -1, 56, 5, md, 2); R(-30, -12, 22, 4, lt, 1);
      P([-22, 5, -12, 5, -16, 22, -26, 22], dk); if (!sil) { g.fillStyle = '#a8261f'; for (let i = 0; i < 3; i++) g.fillRect(-26 + i * 6, -2, 4, 5); } break;
    case 'pp19':
      R(-60, -5, 22, 3, md); R(-60, 3, 22, 3, md); R(-40, -7, 34, 12, dk, 2); R(-6, -6, 26, 10, dk, 2); R(20, -3, 18, 3, dk); P([-24, 5, -14, 5, -18, 20, -28, 20], dk);
      R(-16, 5, 54, 9, md, 4); R(-14, 7, 50, 2, lt); R(-20, -10, 12, 3, lt); break;
    case 'm17':
      R(-20, -9, 40, 9, dk, 1); R(-20, -10, 40, 2, md); R(20, -7, 4, 5, dk); P([-16, 0, -4, 0, -7, 20, -19, 20], dk); R(-4, 0, 6, 4, md); R(4, 0, 12, 6, md, 2); R(-2, -14, 10, 4, dk, 1); break;
    case 'm9':
      R(-20, -9, 42, 9, dk, 1); R(-2, -9, 18, 3, md); R(22, -7, 3, 5, dk); P([-16, 0, -4, 0, -7, 20, -19, 20], sil ? dk : '#3a2a1e'); R(-4, 0, 6, 4, md); break;
    case 'm1911':
      R(-20, -9, 41, 8, md, 1); R(-20, -9, 41, 2, lt); R(21, -7, 3, 5, dk); P([-16, -1, -5, -1, -8, 20, -19, 20], sil ? dk : '#5a3a24'); R(-5, -1, 6, 4, md); R(-22, -6, 4, 4, dk); break;
    case 'm1917':
      R(4, -8, 30, 6, md, 1); R(-10, -11, 16, 12, dk, 3); if (!sil) { g.fillStyle = lt; for (let i = 0; i < 3; i++) g.fillRect(-8 + i * 5, -10, 2, 10); } P([-16, 0, -8, 0, -12, 20, -22, 18], sil ? dk : '#4a2a1a'); R(-16, -8, 8, 6, dk); break;
    case 'aps':
      R(-22, -9, 46, 9, dk, 1); R(-22, -10, 46, 2, md); R(24, -7, 3, 5, dk); P([-18, 0, -4, 0, -7, 22, -21, 22], sil ? dk : '#4a3220'); R(-4, 0, 6, 4, md); R(-6, -12, 8, 3, lt); break;
  }
  g.restore();
}
function armsPaint(c, w, cw, ch, sil) {
  const d = Math.min(window.devicePixelRatio || 1, 2); c.width = Math.round(cw * d); c.height = Math.round(ch * d); c.style.width = cw + 'px'; c.style.height = ch + 'px';
  const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, cw, ch);
  const bx = w.slot === 'primary' ? [-68, 68] : [-26, 30], sc = Math.min(cw / (bx[1] - bx[0] + 8), ch / (w.slot === 'primary' ? 48 : 36));
  armsDrawIcon(g, w, cw / 2 - (bx[0] + bx[1]) / 2 * sc, ch / 2 - 2 * sc, sc, sil);
}

/* ---------- the armory: two racks, five a side, and what is still being rebuilt ---------- */
let armsRack = 'primary', armsCur = null;
function renderArmsArmory() {
  const L = armsLoad();
  $('arCount').textContent = '10 / 250 rebuilt';
  const ld = $('arLoadout'); ld.textContent = '';
  const pb = el('b', null, ARMS_BY[L.p].full), sb = el('b', null, ARMS_BY[L.s].full);
  ld.append('You carry ', pb, ' and ', sb, '. Swap between them in a run; the rest of the 250 are being rebuilt on real guns, ten at a time.');
  const chips = $('arFrames'); chips.textContent = '';
  [['primary', 'Primaries', 5], ['secondary', 'Secondaries', 5], ['rest', 'Being rebuilt', 240]].forEach(([k, t, n]) => {
    const b = el('button', 'chip' + (armsRack === k ? ' on' : '')); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', armsRack === k);
    b.append(el('span', null, t), el('em', null, String(n))); b.addEventListener('click', () => { armsRack = k; SFX.click(); renderArmsArmory(); }); chips.appendChild(b);
  });
  const note = $('arFrameNote'); note.textContent = '';
  const grid = $('arGrid'); grid.textContent = '';
  if (armsRack === 'rest') {
    note.append(el('b', null, 'Being rebuilt. '), 'The 250 frame-and-mod guns rest while each is rebuilt on a real one with its own handling, reloads and model, ten at a time.');
    for (const F of ZW.FRAMES) { const b = el('div', 'wcard unknown arms-rest'); const c = el('canvas'); c.setAttribute('aria-hidden', 'true'); b.append(c, el('span', 'num', '25 guns'), el('span', 'nm', F.name), el('span', 'rar', 'Resting')); grid.appendChild(b); paintWeapon(c, WEAPONS[ZW.FRAMES.indexOf(F) * 25], 128, 60, true); }
    return;
  }
  note.append(el('b', null, armsRack === 'primary' ? 'Primaries. ' : 'Secondaries. '), armsRack === 'primary' ? 'Long guns: the carbine, the AK, the battle rifle, the shotgun and the submachine gun. Each reloads its own way.' : 'Sidearms: three automatics, a revolver in half-moon clips and a machine pistol. Quick to draw when the long gun runs dry.');
  for (const w of armsRack === 'primary' ? ARMS_PRI : ARMS_SEC) {
    const on = w.arms.key === (armsRack === 'primary' ? L.p : L.s), R = WRAR[w.rarity];
    const b = el('button', 'wcard arms-card known wr-' + w.rarity + (on ? ' equipped' : '')); b.type = 'button'; b.style.setProperty('--rc', R.color);
    const c = el('canvas'); c.setAttribute('aria-hidden', 'true');
    b.append(c, el('span', 'num', w.arms.cal), el('span', 'nm', w.arms.full), el('span', 'rar', w.arms.mag + (w.arms.chamber ? '+1' : '') + ' rounds · ' + (w.arms.auto ? w.arms.rpm + ' rpm' : 'semi')));
    if (on) b.append(el('span', 'eq', 'Carried'));
    b.addEventListener('click', () => openArmsDetail(w)); grid.appendChild(b); armsPaint(c, w, 140, 60, false);
  }
}
function renderArmsSide() {
  const S = $('arSide'); if (!S) return; S.textContent = '';
  const L = armsLoad();
  for (const [lab, w] of [['Primary', ARMS_BY[L.p]], ['Secondary', ARMS_BY[L.s]]]) {
    const R = WRAR[w.rarity], eq = el('section', 'ar-card ar-eq'); eq.style.setProperty('--rc', R.color);
    const h = el('h3'); h.append(el('span', null, lab), el('em', null, w.arms.cal)); eq.append(h);
    const c = el('canvas'); c.setAttribute('aria-hidden', 'true'); eq.append(c); armsPaint(c, w, 300, 96, false); c.style.width = '100%'; c.style.height = 'auto';
    eq.append(el('b', null, w.arms.full), el('span', 'rr', w.arms.real.action), el('p', null, w.arms.desc));
    S.append(eq);
  }
  const dd = el('section', 'ar-card'), dh = el('h3'); dh.append(el('span', null, 'Dodge'), el('em', null, 'replaces the dashes')); dd.append(dh);
  dd.append(el('p', null, 'The dash button is a combat roll now: untouchable for its first part, then committed. Hold it to sprint out of the roll. The 25 dashes rest for now.'));
  S.append(dd);
  const tip = el('p', 'ar-tip', ['A full magazine and nobody close? Press reload anyway: he checks the chamber.', 'Sprinting is fast. Shooting is not. Pick one.', 'The revolver throws no brass until you reload it.', 'Empty magazines lie where they fall for half a minute.'][Math.floor(Math.random() * 4)]);
  tip.append(el('small', null, 'The keeper')); S.append(tip);
}
function openArmsDetail(w) {
  armsCur = w; arCur = null; const A = w.arms, det = $('arDetail'), R = WRAR[w.rarity];
  det.style.setProperty('--rc', R.color);
  const art = $('awArt'); armsPaint(art, w, 280, 110, false);
  $('awTag').textContent = A.cal + ' · ' + (A.reload.kind === 'tube' ? A.mag + '+1 shells' : A.mag + (A.chamber ? '+1' : '') + ' rounds') + ' · ' + (w.slot === 'primary' ? 'Primary' : 'Secondary');
  $('awName').textContent = A.full;
  $('awMod').textContent = A.desc;
  $('awReact').textContent = 'Special reload: ' + A.reload.special;
  const bars = $('awBars'); bars.textContent = '';
  const E0 = 0.5 * A.g / 1000 * A.v * A.v * A.pellets;
  [['Energy', Math.min(1, E0 / 3200), Math.round(E0) + ' J'], ['Rate', Math.min(1, A.rpm / 900), A.auto ? A.rpm + ' rpm' : 'semi'], ['Capacity', Math.min(1, A.mag / 64), A.mag + (A.chamber ? '+1' : '')],
    ['Reload', 1 - Math.min(1, (A.reload.kind === 'tube' ? A.reload.perShell * A.mag : A.reload.tac) / 3.2), (A.reload.kind === 'tube' ? A.reload.perShell.toFixed(2) + ' s a shell' : A.reload.tac.toFixed(1) + ' / ' + A.reload.empty.toFixed(1) + ' s')],
    ['Handling', 1 - Math.min(1, A.ready / 0.35), A.ready.toFixed(2) + ' s up'], ['Muzzle velocity', Math.min(1, A.v / 950), A.real.mv]]
    .forEach(r => { const row = el('div', 'bar-row'), t = el('div', 'track'), f = el('i'); f.style.width = Math.round(clamp(r[1], 0.04, 1) * 100) + '%'; t.appendChild(f); row.append(el('span', null, r[0]), t, el('em', null, String(r[2]))); bars.appendChild(row); });
  const spec = el('p', 'aw-spec', 'Barrel ' + A.real.barrel + ' · ' + A.real.weight + ' · ' + A.real.action + ' · ' + A.real.rate); bars.appendChild(spec);
  const L = armsLoad(), on = A.key === (w.slot === 'primary' ? L.p : L.s), eq = $('awEquip');
  eq.hidden = false; eq.disabled = on; eq.textContent = on ? 'Carried' : 'Carry as ' + (w.slot === 'primary' ? 'primary' : 'secondary');
  det.hidden = false; det.scrollTop = 0;
}
function armsEquipCur() {
  const w = armsCur; if (!w) return false;
  armsSetLoad(w.slot, w.arms.key); SFX.click(); openArmsDetail(w); renderArmsArmory(); renderArmsSide(); try { KEEP.approve(); } catch (e) { }
  if (typeof legendWarmJobs === 'function') LG.sprites.clear();
  return true;
}

/* ---------- ARMS in the ecosystem ---------- */
function armsSelfTest() {
  let n = 0, pass = 0, why = '';
  try {
    n++; if (ARMS_PRI.length === 5 && ARMS_SEC.length === 5) pass++; else why = 'not five and five';
    n++; if (ARMS_LIST.every(w => BAL_GUN[w.arms.key] && GUN_LEN[w.arms.key] && MZ[w.arms.key] && ARMS_BEATS[w.arms.reload.kind])) pass++; else why = why || 'a gun is missing from a shared table';
    // a reload on a dummy: a tactical reload leaves thirty plus one, an empty one thirty; the tube takes one a shell
    const q = { x: 0, y: 0, aim: 0, walk: 0, ix: 0, iy: 0, S: { rof: 10 }, db: {}, fireCd: 0, jamT: 0, frozenT: 0 };
    armsNew(q, { p: 'm4a1', s: 'm17' }); q.arm.mag[0] = 12; q.arm.st = 'ready';
    const step = (dt, k) => { for (let i = 0; i < k; i++) { q.arm.t += dt; if (q.arm.st === 'reload') armsReloadTick(q, dt); } };
    ARMS.testing = true; armsReload(q); const tPick = q.arm.dur; step(0.05, Math.ceil(tPick / 0.05) + 2);
    n++; if (q.arm.mag[0] === 31) pass++; else why = why || 'a tactical reload did not leave thirty plus one';
    q.arm.mag[0] = 0; q.arm.st = 'ready'; armsReload(q); step(0.05, Math.ceil(q.arm.dur / 0.05) + 2);
    n++; if (q.arm.mag[0] === 30) pass++; else why = why || 'an empty reload did not leave thirty';
    q.arm.st = 'sprint'; const fired = armsFire(q, null, 0);
    n++; if (!fired && q.arm.st === 'sprintOut') pass++; else why = why || 'it fired while sprinting';
    q.arm.st = 'relaxed'; q.arm.t = 0; const early = armsFire(q, null, 0);
    n++; if (!early && q.arm.st === 'raise') pass++; else why = why || 'it fired before the gun was up';
    // each gun's round against the real one: muzzle energy (all the pellets for buckshot) within a quarter of the published figure
    const REF = [['5.56', 1700], ['5.45', 1400], ['7.62×51', 3300], ['12 gauge', 2700], ['9×18', 310], ['9×19', 520], ['.45', 480]];
    const off = ARMS_LIST.filter(w => { const A = w.arms, r = REF.find(x => A.cal.indexOf(x[0]) >= 0); if (!r) return true; const E = 0.5 * A.g / 1000 * A.v * A.v * (A.pellets || 1); return Math.abs(E / r[1] - 1) > 0.25; });
    n++; if (!off.length) pass++; else why = why || 'a round is off its real energy: ' + off.map(w => w.arms.key).join(', ');
  } catch (e) { why = String(e && e.message || e); }
  ARMS.testing = false; ARMS.reloads = Math.max(0, ARMS.reloads - 2); ARMS.tac = Math.max(0, ARMS.tac - 1); ARMS.specials = Math.max(0, ARMS.specials - 1);
  return { ok: pass === n, n: n, pass: pass, why: why };
}
function armsHurt(e) {
  const now = performance.now(); coreHurt('ARMS', e); try { console.error(e); } catch (x) { }
  ARMS.errT.push(now); while (ARMS.errT.length && now - ARMS.errT[0] > 10000) ARMS.errT.shift();
  if (ARMS.errT.length >= 8) { ARMS.offUntil = now + 20000; ARMS.errT.length = 0; coreRepaired('ARMS', 'Arms: the gun handling steps aside for a moment after errors'); }
}
coreDefine({ name: 'ARMS', kind: 'sim', ver: 1, does: 'The armorer: the ten rebuilt guns on real ones, a primary and a secondary, magazines and chambers, each gun\'s reload technique and special reload, ready-up and ready-down, sprint and the dodge roll, recoil by calibre.',
  provides: ['guns', 'reloads', 'loadout', 'dodge'], needs: ['BALLISTICS', 'PHYSICS'], feats: { want: [], without: '' },
  state: () => G.p && G.p.arm ? G.p.arm.st + ' · ' + G.p.weapon.name + ' ' + G.p.arm.mag[G.p.arm.slot] : 'ready',
  level: () => 'full', noLearn: '',
  alive: () => G.mode === 'play' && !!(G.p && G.p.arm), stallS: 8,
  check: () => { const p = G.p; if (!p || !p.arm) return ''; const a = p.arm; if (ARMS_ST.indexOf(a.st) < 0) return 'its state went bad'; if (!(a.mag[0] >= 0 && a.mag[1] >= 0)) return 'a magazine count went bad'; if (a.dur && a.t > a.dur + 8 && a.st !== 'sprint') return 'stuck in ' + a.st; return ''; },
  repair: () => { const p = G.p; if (p && p.arm) { const a = p.arm; if (ARMS_ST.indexOf(a.st) < 0 || (a.dur && a.t > a.dur + 8)) armsSet(p, 'relaxed'); for (let i = 0; i < 2; i++) if (!(a.mag[i] >= 0)) a.mag[i] = armsCap(a.w[i]); } ARMS.errT.length = 0; ARMS.offUntil = 0; },
  reset: () => { if (G.p && G.p.arm) armsNew(G.p, armsLoad()); },
  selfTest: () => armsSelfTest(),
  learned: () => { const u = Object.entries(ARMS.uses).sort((a, b) => (b[1].r + b[1].s) - (a[1].r + a[1].s))[0]; return ARMS.fired ? ['You have fired ' + ARMS.fired + ' rounds this session, reloaded ' + ARMS.reloads + ' times (' + ARMS.tac + ' tactical, magazine kept) and rolled ' + ARMS.dodges + ' times.' + (u ? ' The gun you reload most: the ' + ARMS_BY[u[0]].name + '; its frames are warmed first.' : '')] : []; },
  on: { run: () => { ARMS.hudK = ''; } },
  spec: { files: ['arms', 'weapons'], parts: ['ten real guns', 'primary and secondary', 'magazines and chambers', 'eight reload techniques', 'special reloads', 'tactical reload', 'press check', 'ready up and down', 'sprint', 'the dodge roll', 'recoil by calibre', 'the armory racks'], procs: ['cpu'],
    effort: false, effortWhy: 'How the guns handle has to be the same for every player and in co-op.' }
});
setInterval(() => { if (ARMS.useDirty) { ARMS.useDirty = false; store.set('zc_armsUse', ARMS.uses); } }, 15000);
