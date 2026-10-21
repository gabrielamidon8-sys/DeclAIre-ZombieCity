/* ================= MIMATIC v4: cinematography, framing and light (1.9.995) =================
   A director of photography decides where the camera stands, which lens it wears, where the frame's edges cut the
   people, and how they are lit. MIMATIC v4 does it from the bodies LEGEND poses:
   - Shot sizes, named by where the bottom of the frame cuts the body: extreme close-up (the eyes), close-up (below the
     chin, at the top of the chest), medium close-up (mid-chest), medium (the waist), medium long or cowboy (mid-thigh),
     full (head to feet), wide and extreme wide (the figure small in its world). Each has a customary lens.
   - Composition: the eyes on the upper third line; look room on the side the subject faces (they sit on the opposite
     third); headroom that shrinks as the shot tightens; never a frame edge on a joint (the knees, the ankles).
   - Occlusion: nothing between the camera and the subject's eyes; the camera moves round until it is clear.
   - Light: the three-point setup (a key 30 to 45 degrees off the lens and above, a fill on the other side, a back light),
     the lighting ratio ((key + fill) : fill; about 2:1 for high key, 4:1 to 8:1 for low key) and colour temperature
     (tungsten 3200 K, daylight 5600 K, sodium streetlight about 2000 K), with the colour of a black body worked out from
     Planck's law. MIMATIC meters its own render and adjusts the fill until the ratio is the one it asked for. */
const MIMV = { made: 0 };
/* ---------- landmarks on a body (world points) ---------- */
function mimvMark(W, n) {
  const hd = W.subarray(LGB.head * 16, LGB.head * 16 + 16), at = (x, y, z) => lgPt(hd, x, y, z), mid = (a, b, k) => curV3.lerp(lgaP(W, a), lgaP(W, b), k);
  switch (n) {
    case 'eyes': return at(0.085, 0, 0.075); case 'brow': return at(0.09, 0, 0.11); case 'nose': return at(0.11, 0, 0.035); case 'chin': return at(0.085, 0, -0.025); case 'top': return lgaMark(W, 'headTop');
    case 'chestTop': return mid('pelvis', 'neck', 0.82); case 'midChest': return mid('pelvis', 'neck', 0.62); case 'waist': return mid('pelvis', 'neck', 0.12);
    case 'midThigh': return curV3.lerp(curV3.lerp(lgaP(W, 'thighL'), lgaP(W, 'shinL'), 0.55), curV3.lerp(lgaP(W, 'thighR'), lgaP(W, 'shinR'), 0.55), 0.5);
    case 'knees': return curV3.lerp(lgaP(W, 'shinL'), lgaP(W, 'shinR'), 0.5); case 'ankles': return curV3.lerp(lgaP(W, 'footL'), lgaP(W, 'footR'), 0.5);
    case 'feet': { const a = lgaMark(W, 'heelL'), b = lgaMark(W, 'heelR'); const p = curV3.lerp(a, b, 0.5); p[2] = Math.min(a[2], b[2]) - 0.035; return p; }
  }
  return lgaP(W, n);
}
// the direction a body faces (horizontal), from the head
function mimvFacing(W) { const hd = W.subarray(LGB.head * 16, LGB.head * 16 + 16); return Math.atan2(hd[1], hd[0]); }
/* ---------- shot sizes ---------- */
// bottom: the landmark the frame's bottom edge cuts; eyeY: where the eyes sit (normalised: +1 top, -1 bottom); lens (mm)
const MIMV_SIZES = {
  ECU: { name: 'Extreme close-up', bottom: 'nose', eyeY: 0.25, lens: 100 }, CU: { name: 'Close-up', bottom: 'chestTop', eyeY: 1 / 3, lens: 85 },
  MCU: { name: 'Medium close-up', bottom: 'midChest', eyeY: 1 / 3, lens: 65 }, MS: { name: 'Medium shot', bottom: 'waist', eyeY: 1 / 3, lens: 50 },
  MLS: { name: 'Medium long (cowboy)', bottom: 'midThigh', eyeY: 1 / 3, lens: 40 }, FS: { name: 'Full shot', top: 'top', bottom: 'feet', topY: 0.82, botY: -0.86, lens: 35 },
  WS: { name: 'Wide shot', top: 'top', bottom: 'feet', height: 0.45, lens: 27 }, EWS: { name: 'Extreme wide shot', top: 'top', bottom: 'feet', height: 0.16, lens: 21 }
};
const MIMV_ORDER = ['EWS', 'WS', 'FS', 'MLS', 'MS', 'MCU', 'CU', 'ECU'];
/* ---------- the framing solver ---------- */
// W: the subject; o: { size, az (round the subject from where it faces; 0 in front), el (camera above the eyes, radians:
// + looking down), f (lens; the size's own if not given), aspect, sensor, look: 'auto' | 'center', blockers: [W...] }
function mimvFrame(W, o) {
  o = Object.assign({ size: 'MS', az: 0.45, el: 0, aspect: 1.85, sensor: 's35' }, o); const Z = MIMV_SIZES[o.size], body = mimcBody({ f: o.f || Z.lens, sensor: o.sensor, aspect: o.aspect });
  const eyes = mimvMark(W, 'eyes'), face = mimvFacing(W), cam = lgCam(); mimcToCam(cam, body);
  const tanV = Math.tan(cam.fov / 2), dirAt = (az) => { const a = face + az; return [Math.cos(a) * Math.cos(o.el), Math.sin(a) * Math.cos(o.el), Math.sin(o.el)]; };
  // look room: a subject turned away from the lens looks toward one side of the frame; it sits on the other third
  const lookX = o.look === 'center' || Math.abs(Math.sin(o.az)) < 0.2 ? 0 : (Math.sin(o.az) > 0 ? -1 : 1) * (1 / 3);
  const pts = !Z.top ? { a: eyes, b: mimvMark(W, Z.bottom), ay: Z.eyeY, by: -1 } : { a: mimvMark(W, Z.top), b: mimvMark(W, Z.bottom), ay: Z.topY != null ? Z.topY : Z.height - 0.6, by: Z.botY != null ? Z.botY : -0.6 };
  if (Z.height) { pts.ay = -0.55 + Z.height * 2; pts.by = -0.55; }   // (a small figure: its feet a little below the middle of the frame)
  let D = Math.abs(pts.a[2] - pts.b[2]) / ((pts.ay - pts.by) / 2 * 2 * tanV) + 0.1, aim = [0, 0, 0], err = 1, it = 0;
  if (o.dbg) o.dbg.push(['init', D, pts.ay, pts.by]);
  const center = curV3.lerp(pts.a, pts.b, 0.5);
  for (; it < 40; it++) {
    const dir = dirAt(o.az); cam.eye = curV3.add(center, curV3.mul(dir, D)); cam.tgt = curV3.add(center, aim);
    const A = mimcProject(cam, pts.a, o.aspect), B = mimcProject(cam, pts.b, o.aspect), E = mimcProject(cam, eyes, o.aspect);
    const span = A.y - B.y, want = pts.ay - pts.by; err = Math.abs(span - want) + Math.abs(A.y - pts.ay) + Math.abs(E.x - lookX);
    if (o.dbg) o.dbg.push([it, D, A.y, B.y, E.x, span]);
    if (err < 1e-4) break;
    D *= span / want;                                                    // the distance sets the span
    const up = [0, 0, 1], fw = curV3.norm(curV3.sub(cam.tgt, cam.eye)), rt = curV3.norm(curV3.cross(fw, up)), mid = (A.y + B.y) / 2, wantMid = (pts.ay + pts.by) / 2;
    aim = curV3.add(aim, curV3.mul(up, (mid - wantMid) * D * tanV));        // the aim's height sets where they sit
    aim = curV3.add(aim, curV3.mul(rt, (E.x - lookX) * D * tanV * o.aspect)); // and its side, the look room
  }
  // occlusion: anything between the lens and the eyes moves the camera round (smallest turn first)
  let blocked = o.blockers ? mimvBlocked(cam.eye, eyes, o.blockers) : 0, moved = 0;
  if (blocked && !o.noDodge) for (const d of [0.15, -0.15, 0.3, -0.3, 0.45, -0.45, 0.6, -0.6]) { const r = mimvFrame(W, Object.assign({}, o, { az: o.az + d, noDodge: true })); if (!mimvBlocked(r.cam.eye, eyes, o.blockers)) { r.moved = d; r.wasBlocked = blocked; return r; } }
  MIMV.made++;
  return { cam: cam, body: body, D: D, err: err, iters: it, size: o.size, lookX: lookX, blocked: blocked, moved: moved };
}
// how much of the line from the lens to a point other bodies cover (0 clear): their capsules against the ray
function mimvBlocked(eye, p, bodies) {
  let hit = 0;
  for (const W of bodies) for (const c of LGQ_CAPS) { const a = lgaMark(W, c[1]), b = lgaMark(W, c[2]), d = lgqSegDist(eye, curV3.lerp(eye, p, 0.97), a, b); if (d < c[3]) hit = Math.max(hit, 1 - d / c[3]); }
  return hit;
}
// where the frame's edges fall on a body: each landmark's height on the picture (normalised)
function mimvCuts(cam, W, aspect) { const out = {}; for (const n of ['top', 'eyes', 'nose', 'chin', 'chestTop', 'midChest', 'waist', 'midThigh', 'knees', 'ankles', 'feet']) out[n] = mimcProject(cam, mimvMark(W, n), aspect || 1.85).y; return out; }
// the rule against cutting at a joint: the bottom edge not within 4% of the frame from the knees or ankles
function mimvJointCut(cam, W, aspect) { const c = mimvCuts(cam, W, aspect); return ['knees', 'ankles'].filter(j => Math.abs(c[j] + 1) < 0.08); }
/* ---------- colour temperature ---------- */
// the colour of a black body at T kelvin: Planck's law through the CIE 1931 observer (the multi-lobe fit of Wyman, Sloan
// and Shirley 2013), to linear sRGB, scaled so the brightest channel is 1
function mimvPlanck(T) {
  const g = (l, m, s1, s2) => { const t = (l - m) / (l < m ? s1 : s2); return Math.exp(-0.5 * t * t); };
  let X = 0, Y = 0, Zz = 0;
  for (let l = 380; l <= 780; l += 2) {
    const x = 1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2), y = 0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1), z = 1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8);
    const lm = l * 1e-9, B = 1 / (Math.pow(lm, 5) * (Math.exp(0.0143877735 / (lm * T)) - 1)); X += x * B; Y += y * B; Zz += z * B;
  }
  const r = 3.2406 * X - 1.5372 * Y - 0.4986 * Zz, gg = -0.9689 * X + 1.8758 * Y + 0.0415 * Zz, b = 0.0557 * X - 0.2040 * Y + 1.0570 * Zz, m = Math.max(r, gg, b);
  return [Math.max(0, r / m), Math.max(0, gg / m), Math.max(0, b / m)];
}
// the quick version used per frame (Tanner Helland's fit to the black-body table), as 8-bit sRGB
function mimvKelvin8(T) {
  const t = T / 100; let r, g, b;
  r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [r, g, b].map(v => clamp(Math.round(v), 0, 255));
}
const mimvSRGB8 = c => c.map(v => clamp(Math.round((v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255), 0, 255));
function mimvKelvin(T) { return mimvKelvin8(T).map(v => Math.pow(v / 255, 2.2)); }   // linear, for the lights
/* ---------- lighting design ---------- */
// three-point light for a subject seen from a camera. o: { ratio, keyAz (degrees off the lens), keyEl, side (+1: key on the
// camera's left), K: key intensity, kelvin: [key, fill, back], rim }
const MIMV_LOOKS = { highKey: { ratio: 2, keyAz: 30, keyEl: 30, kelvin: [5600, 5600, 5600], rim: 0.5, amb: 0.08 }, standard: { ratio: 4, keyAz: 40, keyEl: 35, kelvin: [3200, 3400, 5600], rim: 0.7, amb: 0.03 }, lowKey: { ratio: 8, keyAz: 55, keyEl: 40, kelvin: [3200, 4300, 6500], rim: 1.0, amb: 0.01 }, noir: { ratio: 16, keyAz: 75, keyEl: 45, kelvin: [4300, 4300, 7000], rim: 1.3, amb: 0.0 } };
function mimvLight(W, cam, o) {
  o = Object.assign({}, MIMV_LOOKS.standard, o); const c = mimvMark(W, 'eyes'), toCam = curV3.norm(curV3.sub(cam.eye, c)), side = o.side || 1, K = o.K || 2.2;
  const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]], flat = curV3.norm([toCam[0], toCam[1], 0]);
  const kd = curV3.norm(curV3.add(curV3.mul(rot(flat, side * o.keyAz / CUR_DEG), Math.cos(o.keyEl / CUR_DEG)), [0, 0, Math.sin(o.keyEl / CUR_DEG)]));
  const fd = curV3.norm(curV3.add(curV3.mul(rot(flat, -side * (o.fillAz || 30) / CUR_DEG), Math.cos(0.12)), [0, 0, 0.12]));
  const bd = curV3.norm(curV3.add(curV3.mul(rot(flat, Math.PI - side * 0.5), 0.6), [0, 0, 0.8]));
  const kc = mimvKelvin(o.kelvin[0]), fc = mimvKelvin(o.kelvin[1]), bc = mimvKelvin(o.kelvin[2]);
  // the fill as a soft point light 2.5 m out on its side; its strength from the ratio (refined by metering)
  const F = o.fillK != null ? o.fillK : K / Math.max(1, o.ratio - 1) * 1.9, fp = curV3.add(c, curV3.mul(fd, 2.5));
  return { key: { dir: kd, col: kc.map(v => v * K) }, rim: { dir: bd, col: bc.map(v => v * (o.rim || 0.6)) }, pts: [{ p: fp, r: 6, col: fc.map(v => v * F) }], sky: [o.amb, o.amb, o.amb * 1.1], gnd: [o.amb * 0.6, o.amb * 0.6, o.amb * 0.6], fillK: F, design: o, keyDir: kd, fillDir: fd, center: c };
}
/* ---------- metering the render ---------- */
LG_MAKERS.mim_probe = (B) => { lgBone(B, 'root'); lgMat(B, lgMtl({ c: [0.18, 0.18, 0.18], t: -1, r: 1.0, m: 0, k: 0.6 })); lgSphere(B, 0, 0, 0, 0.12, 0.12, 0.12, { segs: 40, rings: 28 }); };
// the inverse of the scene's transfer (ACES filmic, then the 2.2 display power): a pixel back to linear light
function mimvLinear(v8) { const y = Math.pow(v8 / 255, 2.2); let lo = 0, hi = 16; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2, a = clamp((m * (2.51 * m + 0.03)) / (m * (2.43 * m + 0.59) + 0.14), 0, 1); if (a < y) lo = m; else hi = m; } return (lo + hi) / 2; }
// an incident meter, the way a gaffer reads a ratio: a grey ball at the subject's place, read on the side facing the key
// with everything on (key and fill), then on the side facing the fill with the key and the back light off (fill alone).
// Pixels are taken back through the scene's transfer (ACES, then the display power) to linear light first.
function mimvMeterGL(L, cam0, o) {
  o = o || {}; const w = o.w || 160, h = o.h || 160; if (!LGR.gl) { lgGLInit(); }
  const c = L.center, cam = lgCam(); cam.tgt = c.slice(); cam.eye = curV3.add(c, curV3.mul(curV3.norm(curV3.sub(cam0.eye, c)), 1.1)); cam.fov = 0.32;
  const PW = lgWorldNew(), M = lgTR(c[0], c[1], c[2]); for (let i = 0; i < LG_NB; i++) PW.set(M, i * 16);
  const S = { cam: cam, items: [{ m: lgModel('mim_probe', 0, ''), W: PW }], key: L.key, rim: { dir: L.rim.dir, col: [0, 0, 0] }, sky: L.sky, gnd: L.gnd, pts: L.pts, fog: { col: [0, 0, 0], d: 0, h: 0, s: 1 }, wet: 0, time: 0, expo: o.expo || 0.35 };
  const gl = LGR.gl, px = new Uint8Array(4), flat = v => curV3.norm([v[0], v[1], 0]);
  const read = (p) => { const q = mimcProject(cam, p, 1), x = Math.round((q.x * 0.5 + 0.5) * w), y = Math.round((q.y * 0.5 + 0.5) * h); gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return 0.2126 * mimvLinear(px[0]) + 0.7152 * mimvLinear(px[1]) + 0.0722 * mimvLinear(px[2]); };
  const pk = curV3.add(c, curV3.mul(curV3.norm(curV3.add(flat(L.keyDir), [0, 0, 0.3])), 0.12)), pf = curV3.add(c, curV3.mul(curV3.norm(curV3.add(flat(L.fillDir), [0, 0, 0.1])), 0.12));
  LGR.cv.width = w; LGR.cv.height = h; lgGLScene(S, w, h, null); const lk = read(pk);
  // (the fill alone is read at a higher exposure, so its few dark pixel levels do not round its value)
  const xF = o.fillExpo || 6; lgGLScene(Object.assign({}, S, { key: { dir: L.key.dir, col: [0, 0, 0] }, expo: S.expo * xF }), w, h, null); const lf = read(pf) / xF;
  return { key: lk, fill: lf, ratio: lk / Math.max(1e-6, lf) };
}
// metering and adjusting: the fill is raised or lowered until the meter reads the ratio that was asked for
function mimvTuneFill(W, cam, o) {
  o = Object.assign({}, MIMV_LOOKS.standard, o); const curve = []; let L = mimvLight(W, cam, o), F = L.fillK;
  for (let i = 0; i < (o.iters || 8); i++) {
    const m = mimvMeterGL(L, cam), e = m.ratio / o.ratio; curve.push(Math.abs(m.ratio - o.ratio) / o.ratio);
    if (Math.abs(e - 1) < 0.02) break;
    F *= Math.pow(e, 0.9); L = mimvLight(W, cam, Object.assign({}, o, { fillK: F }));
  }
  const m = mimvMeterGL(L, cam); return { L: L, metered: m.ratio, curve: curve.concat([Math.abs(m.ratio - o.ratio) / o.ratio]) };
}
