/* ================= MIMATIC v3: the camera (1.9.995) =================
   Until now MIMATIC's camera was a point, a target and an angle of view. A cinematographer's camera is a body and a
   lens: a sensor of a given size, a focal length, an aperture, a focus distance, a shutter, and something it rides on.
   MIMATIC now thinks in those terms and gets the picture the optics would give:
   - Angle of view from the focal length and the sensor (AOV = 2 atan(d / 2f)); the frame's aspect crops the sensor.
   - Depth of field: the hyperfocal distance, the near and far limits of acceptable sharpness for a circle of
     confusion, and the blur circle of anything off the focus plane (handed to VFXRAY to draw).
   - The shutter: exposure time from the shutter angle and frame rate (180 degrees at 24 fps is 1/48 s), and the
     length of motion blur that follows from it; exposure value from aperture, time and ISO.
   - The rigs: a locked-off tripod, pans and tilts kept under the strobing limit (an object should take about seven
     seconds to cross the frame), a dolly that starts and stops without a jolt, a crane, an arc round the subject, a
     Steadicam that floats after its subject, handheld (the operator's breathing and the shake of the hands), the
     dolly zoom (the camera moves while the lens zooms against it so the subject stays the same size and the world
     behind stretches or squeezes), rack focus and the whip pan. */
const MIMC = { made: 0 };
// sensors (mm) and the circle of confusion used for depth of field on each
const MIMC_SENSORS = {
  s35: { name: 'Super 35 (4-perf)', w: 24.89, h: 18.66, coc: 0.025 },
  ff: { name: 'Full frame', w: 36, h: 24, coc: 0.03 },
  s16: { name: 'Super 16', w: 12.52, h: 7.41, coc: 0.015 },
  imax: { name: 'IMAX 15/70', w: 70.41, h: 52.63, coc: 0.06 }
};
const MIMC_LENSES = [14, 18, 21, 25, 27, 32, 35, 40, 50, 65, 75, 85, 100, 135, 180];   // a cinema prime set (mm)
// the part of the sensor a frame of a given aspect uses (the frame's width across the sensor unless that makes it taller)
function mimcGate(sensor, aspect) { const S = MIMC_SENSORS[sensor || 's35'], sa = S.w / S.h; return aspect >= sa ? { w: S.w, h: S.w / aspect, coc: S.coc } : { w: S.h * aspect, h: S.h, coc: S.coc }; }
// angles of view (radians)
function mimcAOV(f, sensor, aspect) { const g = mimcGate(sensor, aspect || 1.85); return { h: 2 * Math.atan(g.w / (2 * f)), v: 2 * Math.atan(g.h / (2 * f)), d: 2 * Math.atan(Math.hypot(g.w, g.h) / (2 * f)), gate: g }; }
// the focal length that gives a vertical angle of view (the inverse)
function mimcFocal(vfov, sensor, aspect) { const g = mimcGate(sensor, aspect || 1.85); return g.h / (2 * Math.tan(vfov / 2)); }
/* ---------- depth of field (thin lens; distances in metres, lens in mm) ---------- */
function mimcDOF(f, N, s, coc) {
  const F = f / 1000, c = coc / 1000, H = F * F / (N * c) + F, near = s * (H - F) / (H + s - 2 * F), far = s < H ? s * (H - F) / (H - s) : Infinity;
  return { H: H, near: near, far: far, total: far - near };
}
// the blur circle on the sensor (mm) of a point at distance d when focused at s: c = A f |d - s| / (d (s - f)), A = f / N
function mimcCoC(f, N, s, d) { const F = f / 1000, A = F / N; return Math.abs(A * F * (d - s) / (d * (s - F))) * 1000; }
// in pixels of a picture h pixels tall
function mimcCoCpx(cmm, gateH, hpx) { return cmm / gateH * hpx; }
/* ---------- the shutter and exposure ---------- */
function mimcShutter(angle, fps) { return (angle / 360) / fps; }
// motion blur: a point moving v pixels a second leaves a streak v * t long
function mimcBlurPx(vpx, angle, fps) { return vpx * mimcShutter(angle, fps); }
// exposure value at ISO 100: EV = log2(N^2 / t) - log2(ISO / 100)
function mimcEV(N, t, iso) { return Math.log2(N * N / t) - Math.log2((iso || 100) / 100); }
// panning: the fastest pan (degrees a second) at which an object takes about 7 s to cross the frame (judder limit)
function mimcPanLimit(f, sensor, aspect, secs) { return mimcAOV(f, sensor, aspect).h * CUR_DEG / (secs || 7); }
/* ---------- a camera: body, lens and a move ---------- */
// o: { sensor, f (mm), N (f-stop), focus (m), shutter (deg), fps, iso, aspect }
function mimcBody(o) { return Object.assign({ sensor: 's35', f: 35, N: 2.8, focus: 3, shutter: 180, fps: 24, iso: 800, aspect: 1.85 }, o); }
// the engine's camera for a lens: the vertical angle of view from the focal length and the gate
function mimcToCam(cam, body, eye, tgt) { cam.fov = mimcAOV(body.f, body.sensor, body.aspect).v; if (eye) cam.eye = eye.slice(); if (tgt) cam.tgt = tgt.slice(); cam.lens = body; return cam; }
// the smooth start and stop of a dolly or crane: minimum-jerk position (acceleration starts and ends at zero)
function mimcEase(k) { k = clamp(k, 0, 1); return k * k * k * (10 - 15 * k + 6 * k * k); }
// handheld: the operator breathes (about 0.25 Hz) and the hands shake (a few hertz), translation (m) and rotation (rad)
function mimcHandheld(t, k, seed) {
  const s = seed || 0, n = (f, p) => Math.sin(TAU * f * t + p + s);
  const rot = [(n(1.3, 0.2) * 0.5 + n(2.9, 1.1) * 0.3 + n(4.7, 2.3) * 0.2) * 0.006 * k, (n(1.1, 3.1) * 0.5 + n(2.3, 0.7) * 0.35 + n(5.3, 1.9) * 0.15) * 0.006 * k, (n(0.9, 2.2) * 0.6 + n(3.1, 0.4) * 0.4) * 0.004 * k];
  const pos = [n(0.25, 0.5) * 0.004 * k + n(1.7, 1) * 0.002 * k, n(1.4, 2) * 0.003 * k, n(0.25, 0) * 0.006 * k + n(2.1, 0.3) * 0.0015 * k];
  return { rot: rot, pos: pos };
}
// turning one direction toward another at an even angular rate (spherical interpolation)
function mimcSlerp(a, b, k) { const om = curAng(a, b); if (om < 1e-6) return a.slice(); const s = Math.sin(om), wa = Math.sin((1 - k) * om) / s, wb = Math.sin(k * om) / s; return curV3.add(curV3.mul(a, wa), curV3.mul(b, wb)); }
// a camera move. Returns at(t) -> { eye, tgt, f, focus, roll, mb } over its duration; kinds:
// lock, pan, tilt, dolly (push in / pull out / track), crane, arc, steadicam, handheld, dollyZoom, rack, whip
function mimcMove(o) {
  o = Object.assign({ kind: 'lock', dur: 3, f: 35, sensor: 's35', aspect: 1.85 }, o); const dur = o.dur, body = mimcBody(o);
  const lerp3 = curV3.lerp;
  switch (o.kind) {
    case 'lock': return { dur: dur, at: t => ({ eye: o.eye, tgt: o.tgt, f: o.f, focus: o.focus || curV3.len(curV3.sub(o.tgt, o.eye)) }) };
    case 'pan': case 'tilt': case 'whip': {
      // a turn from one aim to another round the camera; a pan or tilt is held under the judder limit unless it is a whip
      const a0 = curV3.sub(o.tgt, o.eye), a1 = curV3.sub(o.tgt2, o.eye), ang = curAng(a0, a1) * CUR_DEG, lim = mimcPanLimit(o.f, o.sensor, o.aspect, o.crossSecs || 7);
      const need = o.kind === 'whip' ? Math.min(dur, 0.35) : Math.max(dur, ang / lim * 1.9);   // (the eased move's peak speed is 1.875 x its average)
      return { dur: need, limited: need > dur + 1e-6, peakDegS: o.kind === 'whip' ? ang / need * 1.875 : ang / need * 1.875, lim: lim, at: t => { const k = mimcEase(t / need), d = mimcSlerp(curV3.norm(a0), curV3.norm(a1), k), L = curV3.len(a0) + (curV3.len(a1) - curV3.len(a0)) * k; return { eye: o.eye, tgt: curV3.add(o.eye, curV3.mul(d, L)), f: o.f, mb: o.kind === 'whip' ? Math.sin(k * Math.PI) : 0 }; } };
    }
    case 'dolly': case 'crane': return { dur: dur, at: t => { const k = mimcEase(t / dur); return { eye: lerp3(o.eye, o.eye2, k), tgt: o.tgt2 ? lerp3(o.tgt, o.tgt2, k) : o.tgt, f: o.f }; } };
    case 'arc': { const c = o.center, r0 = curV3.sub(o.eye, c), a0 = Math.atan2(r0[1], r0[0]), rr = Math.hypot(r0[0], r0[1]); return { dur: dur, at: t => { const a = a0 + (o.sweep || 1) * mimcEase(t / dur); return { eye: [c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr, o.eye[2]], tgt: o.tgt || c, f: o.f }; } }; }
    case 'steadicam': {
      // follows a subject path (subject(t) -> point) at an offset, through a critically damped spring (it floats behind)
      const w0 = o.w0 || 3.2, dt = 1 / 240, tab = []; let p = curV3.add(o.subject(0), o.offset), v = [0, 0, 0];
      for (let t = 0; t <= dur + 1e-9; t += dt) { const goal = curV3.add(o.subject(t), o.offset), a = curV3.sub(curV3.mul(curV3.sub(goal, p), w0 * w0), curV3.mul(v, 2 * w0)); v = curV3.add(v, curV3.mul(a, dt)); p = curV3.add(p, curV3.mul(v, dt)); tab.push(p.slice()); }
      return { dur: dur, at: t => { const i = clamp(Math.round(t / dt), 0, tab.length - 1); return { eye: tab[i], tgt: curV3.add(o.subject(t), o.aim || [0, 0, 0]), f: o.f }; } };
    }
    case 'handheld': return { dur: dur, at: t => { const h = mimcHandheld(t, o.k || 1, o.seed || 0), e = curV3.add(o.eye, h.pos), fw = curV3.sub(o.tgt, o.eye), yaw = h.rot[2], pit = h.rot[1], c = Math.cos(yaw), s = Math.sin(yaw), d2 = [fw[0] * c - fw[1] * s, fw[0] * s + fw[1] * c, fw[2] + curV3.len(fw) * pit]; return { eye: e, tgt: curV3.add(e, d2), f: o.f, roll: h.rot[0] }; } };
    case 'dollyZoom': {
      // the subject's size on screen depends on f / distance: keep it, and the background changes
      const d0 = curV3.len(curV3.sub(o.tgt, o.eye)), dir = curV3.norm(curV3.sub(o.tgt, o.eye));
      return { dur: dur, at: t => { const k = mimcEase(t / dur), d = d0 + (o.d1 - d0) * k; return { eye: curV3.sub(o.tgt, curV3.mul(dir, d)), tgt: o.tgt, f: o.f * d / d0 }; } };
    }
    case 'rack': return { dur: dur, at: t => ({ eye: o.eye, tgt: o.tgt, f: o.f, focus: o.focus + (o.focus2 - o.focus) * mimcEase(t / dur) }) };
  }
  return null;
}
// the camera of a move at t, as the engine's camera
function mimcCamAt(mv, t, body, cam) { const r = mv.at(t); cam = cam || lgCam(); const b = Object.assign({}, body, { f: r.f || body.f }); mimcToCam(cam, b, r.eye, r.tgt); cam.roll = r.roll || 0; cam.focus = r.focus || b.focus; cam.mb = r.mb || 0; return cam; }
// where a world point lands on the picture (normalised device coordinates -1..1), and in front of the camera or not
function mimcProject(cam, p, asp) { lgCamUpd(cam, asp); const V = cam.VP, x = V[0] * p[0] + V[4] * p[1] + V[8] * p[2] + V[12], y = V[1] * p[0] + V[5] * p[1] + V[9] * p[2] + V[13], w = V[3] * p[0] + V[7] * p[1] + V[11] * p[2] + V[15]; return { x: x / w, y: y / w, front: w > 0, w: w }; }
