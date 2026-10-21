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
   shake) and reduced motion (no zoom either). */
const GCAM = { ox: { x: 0, v: 0 }, oy: { x: 0, v: 0 }, z: { x: 1, v: 0 }, kx: 0, ky: 0, kv: 0, k: 0, t: 0, n: 0 };
function gcamZoom() { return ZOOM * GCAM.z.x; }
function gcamTick(dt, p) {
  GCAM.t += dt; GCAM.n++;
  if (!p || G.mode !== 'play') { physSpring(GCAM.ox, 0, 3, dt); physSpring(GCAM.oy, 0, 3, dt); physSpring(GCAM.z, 1, 3, dt); GCAM.k *= Math.exp(-dt * 12); return; }
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
  physSpring(GCAM.z, z, 2.6, dt);
  // the kick: each shot (ARMS sets camK by calibre) pushes the frame back along the gun, a stiff spring brings it home
  const shake = SET.shake == null ? 100 : SET.shake;
  if (a.camK > (GCAM.lastK || 0) + 0.01 && shake > 0 && !RM) { const d = (a.camK - (GCAM.lastK || 0)) * 3.2 * shake / 100; GCAM.kv -= d * 26; GCAM.heavy = Math.max(GCAM.heavy || 0, a.camK > 0.9 ? 0.35 : 0); }
  GCAM.lastK = a.camK || 0;
  const kx0 = GCAM.k; GCAM.kv += (-420 * GCAM.k - 34 * GCAM.kv) * dt; GCAM.k += GCAM.kv * dt; if (!(GCAM.k === GCAM.k)) { GCAM.k = 0; GCAM.kv = 0; }
  GCAM.kx = Math.cos(aim) * GCAM.k; GCAM.ky = Math.sin(aim) * GCAM.k;
  GCAM.heavy = Math.max(0, (GCAM.heavy || 0) - dt * 2.5);
}
// the shake as layered waves (a handheld's wander), scaled by the game's shake and the heavy rounds' tail
function gcamShake(out) {
  const t = GCAM.t, s = (G.shake > 0.1 ? G.shake : 0) * 0.5 + (GCAM.heavy || 0) * 4;
  out[0] = (Math.sin(t * 37.1) * 0.55 + Math.sin(t * 23.3 + 1.3) * 0.3 + Math.sin(t * 61.7 + 0.4) * 0.15) * s;
  out[1] = (Math.sin(t * 31.9 + 2.1) * 0.55 + Math.sin(t * 19.7 + 0.7) * 0.3 + Math.sin(t * 57.3 + 2.9) * 0.15) * s;
  return out;
}
