/* ================= HOVER: the third-person camera (1.9.999) =================
   The run is seen from a camera that hovers behind and above the survivor, a high chase camera in the manner of The
   Division and Days Gone, so the horde coming down the street is in view; when you aim it swings in over your shoulder
   (Resident Evil 4, The Last of Us) and the lens narrows.
   - Framing. Hip: about six metres back and four up, looking a little down the street, the survivor a third of the way
     across the frame. Aiming: two metres back over the right shoulder (or the left: Settings > Controls), the field of
     view down by a quarter. Sprinting it eases back and widens for speed.
   - It never goes through a wall. A ray from the survivor's shoulder to where the camera wants to be is tested against
     the buildings, the walls and the parked trucks; the camera snaps in front of whatever is in the way and eases back
     out once it is clear (the spring arm of every third-person game).
   - It floats. It follows on a spring (a fraction of a second behind, so it moves like an operator, not a rail), the
     shots kick it, blasts and hits shake it by trauma (the same trauma the top-down camera used: small hits barely move
     it, big ones throw it), the dodge roll tilts it.
   - Aiming is where the crosshair is. A ray from the camera through the middle of the screen finds the first thing it
     meets: a zombie (its body, or its head), a wall, or the street; the survivor aims his gun at that point, so what is
     under the crosshair is what gets shot. Movement is relative to the camera: forward is where you look.
   - Controls. Mouse: the camera follows the mouse (the pointer is captured while you play; Esc lets it go), the left
     button fires, the right aims over the shoulder. Controller: the right stick turns the camera with a little
     acceleration, the left trigger aims. Touch: the left thumb moves (the joystick), the right thumb drags to look, with
     light aim assist (the crosshair slows over a zombie and drifts onto it); fire with the fire button, or let it fire
     by itself when the crosshair is on a target.
   On the title screen it flies slowly round the city. */
const HOVER = {
  yaw: 0, pitch: 0.3, ads: 0, adsT: false, side: 1, sideK: 1, fov: 68, pos: [0, 4, 0], pivot: [0, 1.6, 0], piv: null, fwd: [1, 0], f3: [1, 0, 0],
  dist: 6, colD: 6, aimPt: [0, 0], aimH: 1.2, aimZ: null, aimHead: false, aimD: 10, look: { dx: 0, dy: 0 }, locked: false, lockWant: false,
  touch: { id: null, x: 0, y: 0, t: 0, moved: 0 }, fireHeld: false, att: 0, kick: 0, padV: [0, 0], init: false, lastMode: '', t: 0, hits: 0, roll: 0,
  btn: null
};
// metres of the survivor's eyes over the ground, and the hip and aiming framings
const HV = { eye: 1.62, hipD: 6.1, hipLift: 0.4, adsD: 2.15, adsLift: 0.12, hipSh: 0.42, adsSh: 0.7, pitchMin: -0.42, pitchMax: 1.1 };
function hoverActive() { return typeof depthOn === 'function' && depthOn() && (G.mode === 'play' || G.mode === 'pause' || G.mode === 'over' || G.mode === 'upgrade' || G.mode === 'skull' || G.mode === 'cine'); }
// a new run: the camera starts behind the survivor, facing where he faces
function hoverReset(p) { HOVER.yaw = p && p.aim != null ? p.aim : 0; HOVER.pitch = 0.3; HOVER.ads = 0; HOVER.adsT = false; HOVER.piv = null; HOVER.colD = HV.hipD; HOVER.look.dx = HOVER.look.dy = 0; }
function hoverViewChanged() { if (!depthOn() && document.pointerLockElement === cv) try { document.exitPointerLock(); } catch (e) { } hoverButtons(); }
const angDh = (a, b) => ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;

/* ---------- input: the mouse, the touch screen, the controller ---------- */
function hoverSens() { return (SET.look == null ? 100 : SET.look) / 100; }
window.addEventListener('pointermove', e => {
  if (!hoverActive() || G.mode !== 'play') return;
  if (e.pointerType === 'mouse') {
    const locked = document.pointerLockElement === cv;
    if (locked || DEV.kind === 'kbm') {
      // without the pointer captured, the mouse still turns the camera (and keeps turning at the screen's edges)
      HOVER.look.dx += (e.movementX || 0) * 0.0024 * hoverSens(); HOVER.look.dy += (e.movementY || 0) * 0.0024 * hoverSens() * (SET.invertY ? -1 : 1);
    }
  } else if (e.pointerId === HOVER.touch.id) {
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, T = HOVER.touch;
    const k = 0.0062 * hoverSens() * (HOVER.ads > 0.5 ? 0.6 : 1) * (HOVER.assistSlow || 1);
    HOVER.look.dx += (x - T.x) * k; HOVER.look.dy += (y - T.y) * k * 0.8 * (SET.invertY ? -1 : 1); T.moved += Math.abs(x - T.x) + Math.abs(y - T.y); T.x = x; T.y = y;
  }
}, { passive: true });
cv.addEventListener('pointerdown', e => {
  if (!hoverActive() || G.mode !== 'play') return;
  if (e.pointerType === 'mouse') {
    // the first click in a run captures the pointer (the browser asks for a click)
    if (document.pointerLockElement !== cv && SET.lockMouse !== false) { try { const pr = cv.requestPointerLock({ unadjustedMovement: true }); if (pr && pr.catch) pr.catch(() => { try { cv.requestPointerLock(); } catch (x) { } }); } catch (x) { try { cv.requestPointerLock(); } catch (y) { } } }
    return;
  }
  const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  if (HOVER.touch.id === null && !moveSide(x)) { HOVER.touch = { id: e.pointerId, x: x, y: y, t: performance.now(), moved: 0 }; try { cv.setPointerCapture(e.pointerId); } catch (x2) { } }
});
function hoverTouchEnd(e) {
  const T = HOVER.touch; if (e.pointerId !== T.id) return;
  // a quick tap on the right still rolls (when tap-to-dodge is on)
  if (performance.now() - T.t < 220 && T.moved < 14 && SET.dashTap && G.mode === 'play') tryDash();
  HOVER.touch = { id: null, x: 0, y: 0, t: 0, moved: 0 };
}
cv.addEventListener('pointerup', hoverTouchEnd); cv.addEventListener('pointercancel', hoverTouchEnd);
document.addEventListener('pointerlockchange', () => {
  const was = HOVER.locked; HOVER.locked = document.pointerLockElement === cv;
  // Esc lets the pointer go: in a run that is a pause
  if (was && !HOVER.locked && G.mode === 'play' && hoverActive()) pauseGame();
});
// the touch buttons for the 3D view: fire, and aim over the shoulder
function hoverButtons() {
  const want = hoverActive() && DEV.kind === 'touch' && G.mode === 'play';
  if (!HOVER.btn && want) {
    const host = $('dashBtn') && $('dashBtn').parentNode; if (!host) return;
    const mk = (id, txt, css) => { const b = document.createElement('button'); b.id = id; b.type = 'button'; b.className = 'hv-btn'; b.textContent = txt; b.setAttribute('aria-label', txt); b.style.cssText = css; host.appendChild(b); return b; };
    const base = 'position:absolute;border-radius:50%;border:2px solid rgba(242,204,58,0.7);background:rgba(10,12,16,0.42);color:#f2cc3a;font:600 12px "Chakra Petch",sans-serif;letter-spacing:0.08em;touch-action:none;z-index:6;';
    const fire = mk('fire3dBtn', 'FIRE', base + 'width:84px;height:84px;right:calc(26px + env(safe-area-inset-right,0px));bottom:calc(150px + env(safe-area-inset-bottom,0px));');
    const ads = mk('ads3dBtn', 'AIM', base + 'width:58px;height:58px;right:calc(124px + env(safe-area-inset-right,0px));bottom:calc(190px + env(safe-area-inset-bottom,0px));font-size:11px;');
    fire.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); HOVER.fireHeld = true; });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave']) fire.addEventListener(ev, () => { HOVER.fireHeld = false; });
    ads.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); HOVER.adsT = !HOVER.adsT; ads.style.background = HOVER.adsT ? 'rgba(242,204,58,0.35)' : 'rgba(10,12,16,0.42)'; });
    HOVER.btn = { fire: fire, ads: ads };
  }
  if (HOVER.btn) { HOVER.btn.fire.hidden = !want; HOVER.btn.ads.hidden = !want; if (!want) HOVER.fireHeld = false; }
}
// what the other input code asks: movement turned to the camera, the aim from the crosshair, firing
function hoverMove(x, y) {
  const a = HOVER.yaw, fx = Math.cos(a), fy = Math.sin(a), rx = -Math.sin(a), ry = Math.cos(a);
  return [rx * x + fx * -y, ry * x + fy * -y];
}
function hoverAimAng(p) {
  const dx = HOVER.aimPt[0] - p.x, dy = HOVER.aimPt[1] - p.y;
  if (dx * dx + dy * dy < (1.6 * dUPM()) ** 2) return HOVER.yaw;
  return Math.atan2(dy, dx);
}
function hoverWantFire(p) {
  if (DEV.kind === 'touch') return HOVER.fireHeld || (SET.fire3d !== 'manual' && !!HOVER.aimZ && HOVER.aimD < (p.S ? p.S.range / dUPM() + 2 : 40));
  return null;   // (mouse and controller: the usual rules)
}

/* ---------- the camera each frame ---------- */
const HV_T = { v: null, f: null, r: null };
function hoverFrame(dt) {
  if (typeof THREE === 'undefined' || !DEPTH.cam) return;
  if (!HV_T.v) { HV_T.v = new THREE.Vector3(); HV_T.f = new THREE.Vector3(); }
  const C = DEPTH.cam, U = dUPM(); HOVER.t += dt;
  hoverButtons();
  const p = G.p, mode = G.mode;
  if (mode !== HOVER.lastMode) { if ((mode === 'play' || mode === 'loading') && (HOVER.lastMode === 'title' || HOVER.lastMode === '' || HOVER.lastMode === 'over')) hoverReset(p); HOVER.lastMode = mode; }
  // the title screen: the camera flies slowly round the city
  if (mode === 'title' || !p) {
    HOVER.att += dt;
    const a = HOVER.att * 0.045, cx = dX(cam.x), cz = dZ(cam.y), r = 26, h = 11 + Math.sin(HOVER.att * 0.07) * 3;
    C.position.set(cx + Math.cos(a) * r, h, cz + Math.sin(a) * r); C.lookAt(cx, 2.5, cz);
    HOVER.pivot = [cx, 1.5, cz]; HOVER.fwd = [-Math.cos(a), -Math.sin(a)]; C.fov = 58; C.updateProjectionMatrix();
    return;
  }
  // who the camera follows: you, or (down in co-op) the teammate the game follows
  let tg = p; if (NET.role === 'host' && p.down && typeof netAlive === 'function') tg = netAlive()[0] || p;
  // look: the mouse and the touch screen accumulate between frames; the controller's right stick turns with acceleration
  let ldx = HOVER.look.dx, ldy = HOVER.look.dy; HOVER.look.dx = 0; HOVER.look.dy = 0;
  if (mode === 'play' && DEV.kind === 'kbm' && !HOVER.locked && DEV.mIn) { const e = DEV.mx / Math.max(1, W); if (e < 0.04) ldx -= dt * 1.6 * hoverSens(); else if (e > 0.96) ldx += dt * 1.6 * hoverSens(); }
  if (mode === 'play' && DEV.pad) {
    const s = aimStick(), m = Math.hypot(s.x, s.y), dz = (SET.padDead || 18) / 100;
    if (m > dz) { const k = Math.pow((m - dz) / (1 - dz), 1.6) / m, acc = HOVER.padV; acc[0] = Math.min(1.6, acc[0] + dt * 1.4); const rate = 2.6 * (1 + acc[0] * 0.6) * hoverSens() * (HOVER.ads > 0.5 ? 0.55 : 1) * (HOVER.assistSlow || 1); ldx += s.x * k * rate * dt; ldy += s.y * k * rate * 0.72 * dt * (SET.invertY ? -1 : 1); }
    else HOVER.padV[0] = 0;
  }
  if (mode === 'play') { HOVER.yaw += ldx; HOVER.pitch = clamp(HOVER.pitch + ldy, HV.pitchMin, HV.pitchMax); }
  // light aim assist on the controller and the touch screen: the crosshair slows over a zombie and drifts onto it
  HOVER.assistSlow = 1;
  if (mode === 'play' && (DEV.kind === 'pad' || DEV.kind === 'touch') && SET.assist3d !== false && HOVER.aimNear) {
    const z = HOVER.aimNear, za = Math.atan2(z.y - (tg.y), z.x - (tg.x)), d = angDh(HOVER.yaw, za);
    if (Math.abs(d) < 0.12) { HOVER.assistSlow = 0.55; if (ldx || ldy || Math.hypot(p.ivx || 0, p.ivy || 0) > 10) HOVER.yaw += d * Math.min(1, dt * (DEV.kind === 'touch' ? 5 : 3)); }
  }
  // aiming over the shoulder
  const a = p.arm || {}, sprint = a.st === 'sprint', wantAds = mode === 'play' && !sprint && !p.down && (held('ads') || (DEV.kind === 'touch' && HOVER.adsT));
  HOVER.ads += ((wantAds ? 1 : 0) - HOVER.ads) * Math.min(1, dt * 11);
  if (held('shoulder') && !HOVER.shPrev) HOVER.side = -HOVER.side; HOVER.shPrev = held('shoulder');
  const sideWant = (SET.shoulder === 'left' ? -1 : 1) * HOVER.side; HOVER.sideK += (sideWant - HOVER.sideK) * Math.min(1, dt * 8);
  const ads = HOVER.ads, ae = ads * ads * (3 - 2 * ads);
  // the pivot: the survivor's eyes, out over the shoulder, followed on a spring
  const yaw = HOVER.yaw, cy = Math.cos(yaw), sy = Math.sin(yaw), rx = -sy, rz = cy;
  const sh = (HV.hipSh + (HV.adsSh - HV.hipSh) * ae) * HOVER.sideK;
  const gy = typeof fleshGroundY === 'function' ? fleshGroundY(tg) : 0;
  const tx = dX(tg.x) + rx * sh, tz = dZ(tg.y) + rz * sh, ty = gy + HV.eye - (p.down ? 1.0 : 0) + (sprint ? -0.05 : 0);
  if (!HOVER.piv || Math.hypot(tx - HOVER.piv[0], tz - HOVER.piv[2]) > 12) HOVER.piv = [tx, ty, tz];
  const kf = 1 - Math.exp(-dt * (ads > 0.5 ? 22 : 13)); HOVER.piv[0] += (tx - HOVER.piv[0]) * kf; HOVER.piv[1] += (ty - HOVER.piv[1]) * kf; HOVER.piv[2] += (tz - HOVER.piv[2]) * kf;
  const piv = HOVER.piv; HOVER.pivot = piv;
  // recoil kick (the top-down camera's spring, read as a kick up) and the trauma's shake
  const shk = (SET.shake == null ? 100 : SET.shake) / 100 * (RM ? 0 : 1), tr = GCAM.trauma || 0, tt = HOVER.t;
  const kick = Math.max(0, -(GCAM.k || 0)) * 0.0022 * shk + Math.max(0, (GCAM.k || 0)) * 0.0011 * shk;
  const sAmp = tr * tr * shk, sYaw = (Math.sin(tt * 31.7) * 0.55 + Math.sin(tt * 19.3 + 1.2) * 0.45) * 0.024 * sAmp, sPit = (Math.sin(tt * 27.9 + 0.7) * 0.55 + Math.sin(tt * 43.1 + 2.1) * 0.45) * 0.018 * sAmp;
  HOVER.roll = (GCAM.roll || 0) * 0.9;
  const pitch = HOVER.pitch * (1 - ae * 0.35) + ae * HOVER.pitch * 0.35;
  const cp = Math.cos(pitch), spn = Math.sin(pitch), f3x = cy * cp, f3y = -spn, f3z = sy * cp;
  HOVER.f3 = [f3x, f3y, f3z]; HOVER.fwd = [cy, sy];
  // the boom: how far back, how high; then the walls in the way
  const dist = (HV.hipD + (HV.adsD - HV.hipD) * ae) * (sprint ? 1.1 : 1) * ((SET.camDist == null ? 100 : SET.camDist) / 100), lift = HV.hipLift + (HV.adsLift - HV.hipLift) * ae;
  const wx = piv[0] - f3x * dist, wy = piv[1] - f3y * dist + lift, wz = piv[2] - f3z * dist;
  const t = hoverCollide(piv[0], piv[1], piv[2], wx, wy, wz);
  const want = Math.max(0.6, dist * t - (t < 1 ? 0.35 : 0));
  if (want < HOVER.colD) HOVER.colD = want; else HOVER.colD += (want - HOVER.colD) * Math.min(1, dt * 2.6);
  const k2 = HOVER.colD / dist;
  C.position.set(piv[0] - f3x * HOVER.colD, Math.max(gy + 0.35, piv[1] - f3y * HOVER.colD + lift * k2), piv[2] - f3z * HOVER.colD);
  HOVER.pos = [C.position.x, C.position.y, C.position.z];
  // the lens
  const fovB = SET.fov || 68, fov = fovB * (1 - 0.26 * ae) + (sprint ? 5 : 0);
  HOVER.fov += (fov - HOVER.fov) * Math.min(1, dt * 9);
  if (Math.abs(C.fov - HOVER.fov) > 0.01) { C.fov = HOVER.fov; C.updateProjectionMatrix(); }
  const yawE = yaw + sYaw, pitE = pitch + sPit - kick;
  C.rotation.set(-pitE, Math.atan2(-Math.cos(yawE), -Math.sin(yawE)), HOVER.roll);
  C.updateMatrixWorld();
  // where the crosshair points
  if (mode === 'play' || mode === 'pause') hoverAim(tg, U);
}
// how far along the segment from the pivot to where the camera wants to be it can go before a wall (0..1)
function hoverCollide(x0, y0, z0, x1, y1, z1) {
  let tMin = 1; const U = dUPM(), dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, pad = 0.28;
  const gx0 = Math.min(x0, x1) * U + DEPTH.ox, gx1 = Math.max(x0, x1) * U + DEPTH.ox, gy0 = Math.min(z0, z1) * U + DEPTH.oy, gy1 = Math.max(z0, z1) * U + DEPTH.oy;
  const rs = rectsNear((gx0 + gx1) / 2, (gy0 + gy1) / 2, Math.max(gx1 - gx0, gy1 - gy0) / 2 + 60);
  for (let i = 0; i < rs.length; i++) {
    const r = rs[i]; if (r.low) continue;
    const h = luxHeight(r); if (h < 0.9) continue;
    const bx0 = (r.x - DEPTH.ox) / U - pad, bx1 = (r.x + r.w - DEPTH.ox) / U + pad, bz0 = (r.y - DEPTH.oy) / U - pad, bz1 = (r.y + r.h - DEPTH.oy) / U + pad, by1 = h + pad;
    const t = hvRayBox(x0, y0, z0, dx, dy, dz, bx0, -1, bz0, bx1, by1, bz1);
    if (t >= 0 && t < tMin) tMin = t;
  }
  return tMin;
}
// a ray (origin, direction scaled to the segment) against a box: the entry fraction, or -1
function hvRayBox(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1) {
  let tn = -Infinity, tf = Infinity;
  for (let a = 0; a < 3; a++) {
    const o = a === 0 ? ox : a === 1 ? oy : oz, d = a === 0 ? dx : a === 1 ? dy : dz, lo = a === 0 ? x0 : a === 1 ? y0 : z0, hi = a === 0 ? x1 : a === 1 ? y1 : z1;
    if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return -1; continue; }
    let t1 = (lo - o) / d, t2 = (hi - o) / d; if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
    if (t1 > tn) tn = t1; if (t2 < tf) tf = t2; if (tn > tf || tf < 0) return -1;
  }
  return tn >= 0 ? tn : 0;
}
// the crosshair's ray: the first zombie, wall or bit of street it meets
function hoverAim(p, U) {
  const o = HOVER.pos, f = HOVER.f3, R = 140;
  let best = R, hitZ = null, head = false;
  // the zombies: a standing body is a cylinder (its height and girth from its size), the head a sphere on top
  const px = dX(p.x), pz = dZ(p.y); let near = null, nearA = 0.2;
  for (const z of G.zs) {
    if (z.dead || z.st.under || z.illusion && 0) continue;
    const zx = dX(z.x), zz = dZ(z.y), ex = zx - o[0], ez = zz - o[2]; const along = ex * f[0] + ez * f[2]; if (along < 0.5 || along > R) continue;
    const rm = z.r / U, hgt = typeof fleshHeightOf === 'function' ? fleshHeightOf(z) : 5.6 * rm, rad = Math.max(0.22, rm * 0.95);
    // (for the assist: the one nearest the crosshair's line, within a few degrees)
    const lx = ex - f[0] * along, ly = (hgt * 0.62) - (o[1] + f[1] * along), lz = ez - f[2] * along, off = Math.hypot(lx, ly, lz) / along;
    if (off < nearA && !z.st.down) { nearA = off; near = z; }
    // the ray against the cylinder (in the ground plane), then the height at the hit
    const dxz = Math.hypot(f[0], f[2]); if (dxz < 1e-4) continue;
    const t = hvRayCyl(o[0], o[2], f[0], f[2], zx, zz, rad); if (t < 0 || t > best) continue;
    const y = o[1] + f[1] * t; if (y < 0 || y > hgt * 1.04) continue;
    best = t; hitZ = z; head = y > hgt * 0.86;
  }
  HOVER.aimNear = near;
  // walls (only nearer than the zombie found)
  const tw = hoverWall(o, f, best); if (tw >= 0 && tw < best) { best = tw; hitZ = null; head = false; }
  // the street
  if (f[1] < -1e-3) { const tg = (0 - o[1]) / f[1]; if (tg > 0 && tg < best) { best = tg; hitZ = null; head = false; } }
  const hx = o[0] + f[0] * best, hy = o[1] + f[1] * best, hz = o[2] + f[2] * best;
  HOVER.aimPt[0] = hx * U + DEPTH.ox; HOVER.aimPt[1] = hz * U + DEPTH.oy; HOVER.aimH = hy; HOVER.aimZ = hitZ; HOVER.aimHead = head; HOVER.aimD = Math.hypot(hx - px, hz - pz);
  // the head under the crosshair is what the bullet meets (the ballistics engine reads this for the hit region)
  if (p === G.p) { p.aimH = hy; p.aimHead = head; p.aimZ = hitZ; }
}
function hvRayCyl(ox, oz, dx, dz, cx, cz, r) {
  const fx = ox - cx, fz = oz - cz, a = dx * dx + dz * dz, b = 2 * (fx * dx + fz * dz), c = fx * fx + fz * fz - r * r, disc = b * b - 4 * a * c;
  if (disc < 0) return -1; const s = Math.sqrt(disc), t1 = (-b - s) / (2 * a), t2 = (-b + s) / (2 * a);
  return t1 > 0 ? t1 : t2 > 0 ? 0 : -1;
}
// the nearest wall along the crosshair's ray (the boxes of the blocks round the camera)
function hoverWall(o, f, maxT) {
  const U = dUPM(); let best = -1;
  const ex = o[0] + f[0] * maxT, ez = o[2] + f[2] * maxT, cx = (o[0] + ex) / 2 * U + DEPTH.ox, cz = (o[2] + ez) / 2 * U + DEPTH.oy;
  const rs = rectsNear(cx, cz, maxT * U / 2 + 40);
  for (let i = 0; i < rs.length; i++) {
    const r = rs[i]; if (r.low) continue;
    const h = luxHeight(r); if (h < 0.6) continue;
    const t = hvRayBox(o[0], o[1], o[2], f[0], f[1], f[2], (r.x - DEPTH.ox) / U, 0, (r.y - DEPTH.oy) / U, (r.x + r.w - DEPTH.ox) / U, h, (r.y + r.h - DEPTH.oy) / U);
    if (t > 0 && (best < 0 || t < best)) best = t;
  }
  return best;
}
// the crosshair in the middle of the screen (red over a zombie, a cross over a head; slow guns show their cycle)
function hoverDrawAim() {
  const p = G.p; if (!p || G.mode !== 'play' || G.grab || SET.xhair === 'off') return;
  const x = W / 2, y = H / 2, col = XCOL[SET.xhairColor] || XCOL.yellow, sz = (SET.xhairSize || 100) / 100 * (1 - HOVER.ads * 0.25);
  const hot = !!HOVER.aimZ, c = p.jamT > 0 ? '#9a968c' : hot ? (HOVER.aimHead ? '#ff2a2a' : '#ff5a4a') : col;
  const spread = (p.arm && p.arm.bloom ? p.arm.bloom : 0) * 30 + (1 - HOVER.ads) * 3 + Math.min(6, Math.hypot(p.ivx || 0, p.ivy || 0) / 60);
  const gap = (4 + spread) * sz, len = 7 * sz;
  const shape = (lw, stroke) => {
    ctx.strokeStyle = stroke; ctx.fillStyle = stroke; ctx.lineWidth = lw; ctx.beginPath();
    if (SET.xhair === 'circle') ctx.arc(x, y, 9 * sz + spread * 0.6, 0, TAU);
    else if (SET.xhair !== 'dot') { ctx.moveTo(x - gap - len, y); ctx.lineTo(x - gap, y); ctx.moveTo(x + gap, y); ctx.lineTo(x + gap + len, y); ctx.moveTo(x, y - gap - len); ctx.lineTo(x, y - gap); ctx.moveTo(x, y + gap); ctx.lineTo(x, y + gap + len); }
    ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, SET.xhair === 'dot' ? 2.6 * sz + lw / 4 : 1.3 * sz + lw / 4, 0, TAU); ctx.fill();
  };
  shape(4, 'rgba(0,0,0,0.5)'); shape(2, c);
  // a hit: the marker flashes at the crosshair
  const kills = G.kills || 0; if (kills > (HOVER.killsSeen || 0)) { HOVER.markT = 0.3; HOVER.markK = 1; } HOVER.killsSeen = kills;
  if (HOVER.markT > 0) { HOVER.markT -= G.rdt || 0.016; const k = HOVER.markT / 0.3; ctx.strokeStyle = 'rgba(255,255,255,' + k + ')'; ctx.lineWidth = 2; const a = 6 * sz, b = 12 * sz; ctx.beginPath(); for (const [sx, sy2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.moveTo(x + sx * a, y + sy2 * a); ctx.lineTo(x + sx * b, y + sy2 * b); } ctx.stroke(); }
  const cdMax = 1 / (p.S.rof * dashRofMul(p)), left = clamp(p.fireCd / cdMax, 0, 1);
  if (cdMax > 0.3 && left > 0.02) { ctx.strokeStyle = hexA(c, 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 13 * sz, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - left)); ctx.stroke(); }
}
// where a zombie may come in without popping into view: out of the camera's sight (behind, to the side), past the fog,
// or behind a building (the line from the survivor to it is blocked)
function hoverSpawnPos() {
  const p = NET.role === 'host' ? netAnchor() : G.p; if (!p) return null;
  const U = dUPM(), fog = DEPTH.fogFar || 90;
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * TAU, d = (26 + Math.random() * 26) * U, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    if (blocked(x, y, 26) || waterAt(x, y) === 2) continue;
    const front = Math.abs(angDh(HOVER.yaw, a)) < 1.05, far = d / U > fog * 0.85;
    let hidden = !front || far;
    if (!hidden) { const o = [dX(p.x), 1.6, dZ(p.y)], e = [dX(x), 1.2, dZ(y)]; hidden = hoverCollideSeg(o, e) < 0.97; }
    if (!hidden && i < 20) continue;
    if (i > 16 || reachable(x, y)) return { x: x, y: y };
  }
  return null;
}
function hoverCollideSeg(o, e) { return hoverCollide(o[0], o[1], o[2], e[0], e[1], e[2]); }
function hoverSelfTest() {
  let n = 0, pass = 0, why = ''; const t = (ok, w) => { n++; if (ok) pass++; else if (!why) why = w; };
  // a ray along +x from the origin meets a box from x 4 to 6 a fifth of the way along a 20 m segment
  t(Math.abs(hvRayBox(0, 1, 0, 20, 0, 0, 4, 0, -1, 6, 2, 1) - 0.2) < 1e-6, 'ray against a box');
  t(hvRayBox(0, 5, 0, 20, 0, 0, 4, 0, -1, 6, 2, 1) < 0, 'a ray over a box');
  // a ray at a cylinder of radius 1 four metres ahead meets it at 3 m
  t(Math.abs(hvRayCyl(0, 0, 1, 0, 4, 0, 1) - 3) < 1e-6, 'ray against a body');
  // movement is turned to the camera: facing south (yaw = 90 degrees), forward on the stick walks south
  const sv = HOVER.yaw; HOVER.yaw = Math.PI / 2; const m = hoverMove(0, -1); HOVER.yaw = sv; t(Math.abs(m[0]) < 1e-9 && Math.abs(m[1] - 1) < 1e-9, 'camera-relative movement');
  return { ok: pass === n, n: n, pass: pass, why: why };
}
coreDefine({ name: 'HOVER', kind: 'render', ver: 1, does: 'The third-person camera: a high chase camera that hovers behind and above the survivor and swings over his shoulder to aim, never through a wall (a spring arm against the buildings), floating on a spring, kicked by the shots and shaken by trauma; the crosshair\'s ray finds the zombie, its head, the wall or the street the gun points at; movement turns with the camera; mouse, controller (with acceleration) and touch (twin sticks with light aim assist).',
  provides: ['camera3d', 'aim3d'], needs: ['DEPTH'],
  state: () => !hoverActive() ? 'resting (top-down view)' : (HOVER.ads > 0.5 ? 'over the shoulder' : 'chase') + ' · ' + HOVER.colD.toFixed(1) + ' m back' + (HOVER.aimZ ? ' · on target' : ''),
  check: () => { if (!(HOVER.yaw === HOVER.yaw) || !(HOVER.pitch === HOVER.pitch)) return 'its angles went bad'; return ''; },
  repair: () => { if (!(HOVER.yaw === HOVER.yaw)) HOVER.yaw = 0; if (!(HOVER.pitch === HOVER.pitch)) HOVER.pitch = 0.3; HOVER.piv = null; },
  selfTest: hoverSelfTest,
  docs: { what: 'The camera behind the survivor, and aiming in 3D.', how: 'A spring-arm chase camera over the shoulder; the crosshair is a ray into the 3D world.' }
});
