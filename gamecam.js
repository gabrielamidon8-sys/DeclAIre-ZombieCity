/* ================= MIMATIC v2 in a run: the director behind the gameplay camera =================
   1.9.993. The run's camera was a plain follow. Now MIMATIC directs it with the same grammar it uses in the
   cinematics, kept gentle enough to play with:
   - Lead room. The frame leads the way you look when you are engaged (more of the street in front of the gun) and
     the way you move when you are not; sprinting, it leads further, as a tracking shot runs ahead of its subject.
   - Focus. Engaged and holding still, it eases in a few percent, the way a lens pushes in on a moment; sprinting it
     eases out for speed; a reload eases in a touch; the dodge punches it.
   - Recoil. Each shot kicks the frame back along the gun by its calibre (a 9 mm barely, 7.62 and buckshot clearly)
     and lets it settle, and heavy rounds add a short smooth shake (no random jitter: layered waves, like a handheld).
   It all rides on springs (PHYSICS), so it never snaps; and it respects Screen shake in Settings (off: no kick and no
   shake) and reduced motion (no zoom either).
   1.9.997 (v3): trauma. Every shot, blast and hit adds trauma by its size (a 9 mm a little, 7.62 and 12 gauge a lot,
   a grenade more), trauma fades on its own, and the shake is trauma squared: a small hit barely moves the frame, a big
   one throws it, and it always settles the same way (the "trauma" shake of Squirrel Eiserloh's GDC talk). The shake
   now also rolls the frame a fraction of a degree, as a handheld does. The frame eases out as the dead close in (more
   of the street when it matters), out further for a boss, and punches in a touch on a kill up close; the dodge roll
   tilts it with him. */
const GCAM = { ox: { x: 0, v: 0 }, oy: { x: 0, v: 0 }, z: { x: 1, v: 0 }, kx: 0, ky: 0, kv: 0, k: 0, t: 0, n: 0, trauma: 0, roll: 0, rollT: { x: 0, v: 0 }, punch: 0, kills: 0, crowd: { x: 1, v: 0 } };
function gcamZoom() { return ZOOM * GCAM.z.x * GCAM.crowd.x; }
// trauma from a shot, a blast or a hit: 0..1, adds up, fades in about half a second
function gcamTrauma(k) { if (!(SET.shake == null ? 100 : SET.shake) || RM) return; GCAM.trauma = Math.min(1, GCAM.trauma + k); }
function gcamTick(dt, p) {
  GCAM.t += dt; GCAM.n++;
  GCAM.trauma = Math.max(0, GCAM.trauma - dt * 1.7); GCAM.punch = Math.max(0, GCAM.punch - dt * 6);
  if (!p || G.mode !== 'play') { physSpring(GCAM.ox, 0, 3, dt); physSpring(GCAM.oy, 0, 3, dt); physSpring(GCAM.z, 1, 3, dt); physSpring(GCAM.crowd, 1, 2, dt); physSpring(GCAM.rollT, 0, 4, dt); GCAM.k *= Math.exp(-dt * 12); return; }
  const a = p.arm || {}, st = a.st || '', f = a.focus || 0, hw = W / ZOOM / 2, hh = H / ZOOM / 2, lead = Math.min(hw, hh);
  const vx = p.ivx || 0, vy = p.ivy || 0, sp = Math.hypot(vx, vy), aim = p.aim || 0;
  // lead room: toward the aim when engaged, toward the motion otherwise (further when sprinting)
  let tx = Math.cos(aim) * lead * 0.16 * f, ty = Math.sin(aim) * lead * 0.16 * f;
  if (sp > 20) { const kk = st === 'sprint' ? 0.55 : 0.32 * (1 - f * 0.6); tx += vx * kk; ty += vy * kk; }
  const cap = lead * 0.28, l = Math.hypot(tx, ty); if (l > cap) { tx *= cap / l; ty *= cap / l; }
  physSpring(GCAM.ox, tx, st === 'sprint' ? 3.2 : 2.4, dt); physSpring(GCAM.oy, ty, st === 'sprint' ? 3.2 : 2.4, dt);
  // focus: in when engaged and still, out when sprinting, a touch in on a reload, a punch on the dodge
  let z = 1;
  if (!RM && SET.camZoom !== false) {
    if (st === 'sprint') z = 0.95; else if (st === 'reload') z = 1.03; else z = 1 + 0.055 * f * (sp < 60 ? 1 : 0.45);
    if (p.dashT > 0 && p.dashK === 'dodge') z -= 0.025;
  }
  if (GCAM.punch > 0 && !RM && SET.camZoom !== false) z += 0.018 * GCAM.punch;
  physSpring(GCAM.z, z, 2.6, dt);
  // the crowd: the frame eases out as the dead close in, and further for a boss (slowly, so it never pumps)
  const near = a.near || 0, boss = G.boss && !G.boss.dead ? 1 : 0;
  physSpring(GCAM.crowd, RM || SET.camZoom === false ? 1 : 1 - Math.min(0.07, near * 0.009) - boss * 0.035, 1.4, dt);
  // a kill up close punches the frame in a touch
  const kills = G.kills || 0; if (kills > GCAM.kills) { if (a.near > 0) GCAM.punch = 1; GCAM.kills = kills; } else GCAM.kills = kills;
  // the dodge tilts the frame with him (which way he rolls); the trauma rolls it a fraction of a degree
  let roll = 0;
  if (p.dashT > 0 && p.dashK === 'dodge' && !RM) { const side = Math.sin(Math.atan2(p.dashDy || 0, p.dashDx || 1) - aim); roll = -0.028 * Math.sign(side || 1) * Math.min(1, p.dashT / 0.3); }
  physSpring(GCAM.rollT, roll, 5, dt);
  GCAM.roll = GCAM.rollT.x + (Math.sin(GCAM.t * 29.3) * 0.6 + Math.sin(GCAM.t * 47.1 + 1.1) * 0.4) * GCAM.trauma * GCAM.trauma * 0.014 * ((SET.shake == null ? 100 : SET.shake) / 100);
  // the kick: each shot (ARMS sets camK by calibre) pushes the frame back along the gun, a stiff spring brings it home
  const shake = SET.shake == null ? 100 : SET.shake;
  if (a.camK > (GCAM.lastK || 0) + 0.01 && shake > 0 && !RM) {
    const d = (a.camK - (GCAM.lastK || 0)) * 3.2 * shake / 100; GCAM.kv -= d * 15;   // (15, not 26: the stepped spring answers truly, so this keeps the kick the size it was at 60 fps) GCAM.heavy = Math.max(GCAM.heavy || 0, a.camK > 0.9 ? 0.35 : 0);
    // trauma by the round's impulse (a 9 mm 0.05, 5.56 0.1, 7.62 and buckshot 0.2)
    const D = p.weapon && p.weapon.arms && typeof LG_GUN_DEF !== 'undefined' ? LG_GUN_DEF[p.weapon.arms.key] : null, imp = D && D.act && D.act.imp ? D.act.imp : (a.camK - (GCAM.lastK || 0)) * 8;
    gcamTrauma(clamp(imp * 0.014, 0.03, 0.3) * shake / 100);
  }
  // blasts and hits (the game raises G.shake for them): a jump in it is trauma too
  if ((G.shake || 0) > (GCAM.lastShake || 0) + 0.5) gcamTrauma(Math.min(0.6, ((G.shake || 0) - (GCAM.lastShake || 0)) * 0.08)); GCAM.lastShake = G.shake || 0;
  GCAM.lastK = a.camK || 0;
  // (1.9.998.1: the kick's spring runs in steps of at most 8 ms. In one step a frame this stiff spring went unstable
  // whenever a frame took longer than about 46 ms (under ~21 fps): each frame then threw it further instead of settling
  // it, and the whole view lurched back and forth by hundreds of pixels, worst when shooting and rolling, as frames run
  // slowest then. A kick is a few units at most, so it is also held to 40 as a last guard.)
  { const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n; for (let i = 0; i < n; i++) { GCAM.kv += (-420 * GCAM.k - 34 * GCAM.kv) * h; GCAM.k += GCAM.kv * h; } }
  if (!(GCAM.k === GCAM.k) || !(GCAM.kv === GCAM.kv)) { GCAM.k = 0; GCAM.kv = 0; } else if (Math.abs(GCAM.k) > 40) { GCAM.k = Math.sign(GCAM.k) * 40; GCAM.kv = 0; }
  GCAM.kx = Math.cos(aim) * GCAM.k; GCAM.ky = Math.sin(aim) * GCAM.k;
  GCAM.heavy = Math.max(0, (GCAM.heavy || 0) - dt * 2.5);
}
// the shake as layered waves (a handheld's wander), scaled by the game's shake and the heavy rounds' tail
function gcamShake(out) {
  // (1.9.997: the trauma's shake, squared, on top of the old layers; up to nine pixels at full trauma)
  const t = GCAM.t, s = (G.shake > 0.1 ? G.shake : 0) * 0.5 + (GCAM.heavy || 0) * 4 + GCAM.trauma * GCAM.trauma * 9 * ((SET.shake == null ? 100 : SET.shake) / 100);
  out[0] = (Math.sin(t * 37.1) * 0.55 + Math.sin(t * 23.3 + 1.3) * 0.3 + Math.sin(t * 61.7 + 0.4) * 0.15) * s;
  out[1] = (Math.sin(t * 31.9 + 2.1) * 0.55 + Math.sin(t * 19.7 + 0.7) * 0.3 + Math.sin(t * 57.3 + 2.9) * 0.15) * s;
  return out;
}
