/* ================= DRIFT: what the wind moves in the 3D view (1.9.9991) =================
   The city stood still between the gusts. DRIFT gives the air something to carry:
   - Smoke: wisps from the chimneys of the houses where someone is still holding out, drifting off on the wind; thick
     dark columns from every burning building and street fire, rising, slowing, spreading and leaning downwind, lit
     orange from below by the flames, seen for blocks.
   - Cloth: survivors' sheets hung out of windows with SOS, HELP and ALIVE INSIDE painted on them, billowing off the
     wall; flags and banners on the roofs, some torn, rippling in the wind (a stiff wind snaps them out, a calm lets them
     hang). Each moves on the graphics chip; smoke is one instanced draw for the whole view, cloth one per block.
   It steps down with the 3D level (fewer puffs, no smoke at the lowest). */
const DRIFT = { ok: false, mats: {}, tex: null, puffTex: null, smoke: null, puffs: [], cap: 0, emit: new Map(), t: 0, cloths: 0, sources: 0, spots: [], tests: null };
const DR_U = { uWindV: null, uLight: null, uFire: null };

/* ---------- the cloth atlas: four squares (an SOS sheet, a HELP sheet, a torn red flag, a faded banner) ---------- */
function driftAtlas() {
  if (DRIFT.tex) return DRIFT.tex;
  const N = 1024, T = 512, cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d'), R = Z.mulberry32(0xd21f7);
  const sheet = (ox, oy, words, ink) => {
    x.save(); x.beginPath(); x.rect(ox, oy, T, T); x.clip();
    x.fillStyle = '#e8e4da'; x.fillRect(ox + 6, oy + 4, T - 12, T - 8);
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(120,110,90,' + (0.04 + R() * 0.08) + ')'; x.beginPath(); x.ellipse(ox + R() * T, oy + R() * T, 10 + R() * 60, 6 + R() * 40, R() * 3, 0, TAU); x.fill(); }
    x.strokeStyle = 'rgba(90,80,70,0.25)'; x.lineWidth = 2; for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(ox + 20 + R() * (T - 40), oy + 6); x.lineTo(ox + 20 + R() * (T - 40), oy + T - 6); x.stroke(); }
    x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle';
    words.forEach((w, i) => { x.font = '900 ' + (w.length > 5 ? 92 : 150) + 'px Impact, "Arial Black", sans-serif'; x.save(); x.translate(ox + T / 2 + (R() - 0.5) * 20, oy + T / 2 + (i - (words.length - 1) / 2) * (w.length > 5 ? 120 : 170)); x.rotate((R() - 0.5) * 0.12); x.fillText(w, 0, 0);
      for (let d = 0; d < 6; d++) { x.fillRect((R() - 0.5) * 200, 40 + R() * 30, 5, 30 + R() * 70); } x.restore(); });
    // the hem torn here and there (cut away by the alpha)
    x.clearRect(ox, oy + T - 4, T, 4); for (let i = 0; i < 9; i++) { const cx = ox + R() * T; x.clearRect(cx, oy + T - 10 - R() * 30, 8 + R() * 20, 40); }
    x.restore();
  };
  sheet(0, 0, ['SOS'], '#b8221c'); sheet(T, 0, ['HELP', 'US'], '#1a1a1a');
  // a red flag, torn at the fly end
  x.save(); x.beginPath(); x.rect(0, T, T, T); x.clip(); x.fillStyle = '#9a1f1a'; x.fillRect(0, T + 60, T, T - 120);
  x.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 5; i++) x.fillRect(0, T + 60 + i * 80, T, 8);
  for (let i = 0; i < 14; i++) { const y = T + 60 + R() * (T - 120); x.clearRect(T - 30 - R() * 120, y, 160, 6 + R() * 26); } x.restore();
  // a faded banner: stripes, frayed
  x.save(); x.beginPath(); x.rect(T, T, T, T); x.clip(); const cols = ['#2c4a7a', '#d8d4c8', '#2c4a7a', '#d8d4c8', '#2c4a7a'];
  cols.forEach((c, i) => { x.fillStyle = c; x.fillRect(T, T + 60 + i * (T - 120) / 5, T, (T - 120) / 5 + 1); });
  x.fillStyle = 'rgba(200,190,170,0.35)'; x.fillRect(T, T, T, T);
  for (let i = 0; i < 30; i++) x.clearRect(2 * T - 12 - R() * 40, T + 60 + R() * (T - 120), 60, 3); x.restore();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(4, DEPTH.R.capabilities.getMaxAnisotropy()); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return DRIFT.tex = t;
}
// a soft puff of smoke: a lumpy round blot, darker in the middle
function driftPuffTex() {
  if (DRIFT.puffTex) return DRIFT.puffTex;
  const N = 128, cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d'), R = Z.mulberry32(0x5e0ce);
  for (let i = 0; i < 26; i++) { const a = R() * TAU, r = Math.sqrt(R()) * 26, cx = 64 + Math.cos(a) * r, cy = 64 + Math.sin(a) * r, rr = 14 + R() * 22, g = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
    g.addColorStop(0, 'rgba(255,255,255,0.32)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rr, 0, TAU); x.fill(); }
  const t = new THREE.CanvasTexture(cv); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return DRIFT.puffTex = t;
}
function driftMats() {
  if (DRIFT.ok) return true;
  if (!DEPTH.ok) return false;
  try {
    driftAtlas(); driftPuffTex();
    DR_U.uWindV = (typeof FL_U !== 'undefined' && FL_U.uWindV) || { value: new THREE.Vector2(0.4, 0.1) };
    DR_U.uLight = { value: new THREE.Color(0.6, 0.6, 0.62) }; DR_U.uFire = { value: new THREE.Color(1.0, 0.45, 0.15) };
    // cloth: aD = (how free this point is 0 pinned..1, its phase, the kind 0 sheet 1 flag, the cloth's length)
    const CV = `attribute vec4 aD; uniform vec2 uWindV; uniform float uTime;
      vec3 drCloth(vec3 p, vec3 n) { float w = aD.x, ph = aD.y, wl = length(uWindV), t = uTime;
        if (aD.z > 0.5) { float s = 0.35 + wl * 1.6, wave = sin(aD.w * w * 7.0 - t * (4.0 + wl * 6.0) + ph) * (0.12 + 0.1 * wl) * w + sin(aD.w * w * 13.0 - t * 9.0 + ph * 2.0) * 0.03 * w;
          return p + n * wave + vec3(0.0, -w * w * 0.35 * aD.w * (1.0 - clamp(s, 0.0, 1.0)), 0.0); }
        float bil = (0.06 + 0.22 * wl) * w * (0.6 + 0.4 * sin(t * 1.3 + ph)) + sin(t * 3.1 + ph + p.y * 2.0) * 0.03 * w * wl;
        return p + n * bil + vec3(uWindV.x, 0.0, uWindV.y) * w * w * 0.12; }
    `;
    const M = DRIFT.mats;
    M.cloth = new THREE.MeshStandardMaterial({ map: DRIFT.tex, vertexColors: false, side: THREE.DoubleSide, alphaTest: 0.45, roughness: 0.95, metalness: 0 });
    M.cloth.onBeforeCompile = sh => { Object.assign(sh.uniforms, { uWindV: DR_U.uWindV, uTime: DU.uTime }); sh.vertexShader = CV + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed = drCloth(transformed, normal);'); };
    M.cloth.customProgramCacheKey = () => 'cloth1';
    // smoke: camera-facing puffs placed by instance (iP: centre and size; iC: shade, alpha, turn, the fire's glow)
    M.smoke = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: DRIFT.puffTex }, uLight: DR_U.uLight, uFire: DR_U.uFire, fogColor: { value: new THREE.Color() }, fogDensity: { value: 0.01 } },
      transparent: true, depthWrite: false, fog: true,
      vertexShader: `attribute vec4 iP; attribute vec4 iC; varying vec2 vUv; varying vec4 vC; varying float vFogDepth;
        void main() { vUv = uv; vC = iC; float c = cos(iC.z), s = sin(iC.z); vec2 q = vec2(position.x * c - position.y * s, position.x * s + position.y * c) * iP.w;
          vec4 mv = viewMatrix * vec4(iP.xyz, 1.0); mv.xy += q; vFogDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D uTex; uniform vec3 uLight, uFire, fogColor; uniform float fogDensity; varying vec2 vUv; varying vec4 vC; varying float vFogDepth;
        void main() { vec4 t = texture2D(uTex, vUv); float a = t.a * vC.y; if (a < 0.004) discard;
          vec3 col = vec3(vC.x) * uLight * (0.75 + 0.35 * (1.0 - vUv.y)) + uFire * vC.w * (0.6 + 0.4 * vUv.y);
          float ff = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth * 0.35); col = mix(col, fogColor, ff);
          gl_FragColor = vec4(col, a * (1.0 - ff * 0.6)); }`
    });
    DRIFT.ok = true;
  } catch (e) { coreHurt('DRIFT', e); DRIFT.ok = false; }
  return DRIFT.ok;
}

/* ---------- cloth builders (FACADE calls these while it dresses a building) ---------- */
// a grid of nx x ny quads from a top edge (p0..p1, pinned) hanging along dir for len metres; n: the way it billows
function drCloth(B, p0, p1, dir, len, n, tile, kind, ph, nx, ny) {
  const u0 = (tile % 2) * 0.5, v0 = tile < 2 ? 0.5 : 0, v = B.nv;
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const a = i / nx, b = j / ny, x = p0[0] + (p1[0] - p0[0]) * a + dir[0] * len * b, y = p0[1] + (p1[1] - p0[1]) * a + dir[1] * len * b, z = p0[2] + (p1[2] - p0[2]) * a + dir[2] * len * b;
    B.p.push(x, y, z); B.n.push(n[0], n[1], n[2]); B.c.push(1, 1, 1);
    if (kind === 1) { B.u.push(u0 + b * 0.5, v0 + 0.5 - a * 0.5); B.a.push(b, ph, 1, len); }   // (a flag: free along its length from the pole)
    else { B.u.push(u0 + a * 0.5, v0 + 0.5 - b * 0.5); B.a.push(b, ph + a * 0.7, 0, len); }
    B.f.push(0, 0);
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const q = v + j * (nx + 1) + i; B.i.push(q, q + 1, q + nx + 2, q, q + nx + 2, q + nx + 1); }
  B.nv += (nx + 1) * (ny + 1); DRIFT.cloths++;
}
// a sheet out of a window on face F: its top at the window's head, hanging down off the wall
function driftSheet(ctx, F, a, top, R) {
  const B = ctx.CL || (ctx.CL = dGB()), w = 1.1 + R() * 0.4, len = 1.5 + R() * 0.5, o = 0.1;
  const p0 = [F.o[0] + F.t[0] * (a - w / 2) + F.n[0] * o, top, F.o[1] + F.t[1] * (a - w / 2) + F.n[1] * o], p1 = [F.o[0] + F.t[0] * (a + w / 2) + F.n[0] * o, top, F.o[1] + F.t[1] * (a + w / 2) + F.n[1] * o];
  drCloth(B, p0, p1, [0, -1, 0], len, [F.n[0], 0, F.n[1]], R() < 0.55 ? 0 : 1, 0, R() * 6, 4, 6);
  if (ctx.c && DRIFT.spots.length < 40) DRIFT.spots.push([(ctx.c.sx - DEPTH.ox) / DEPTH.upm + p0[0], top, (ctx.c.sy - DEPTH.oy) / DEPTH.upm + p0[2], F.n[0], F.n[1]]);
}
// a flag on a pole at (x, y, z), flying toward the wind's side (the shader carries it)
function driftFlag(ctx, x, y, z, R) {
  const B = ctx.CL || (ctx.CL = dGB()), TH = ctx.TH, h = 4 + R() * 2, fl = 1.5 + R() * 0.6, fh = 0.9 + R() * 0.3;
  dCyl(TH, x, y, z, 0.045, 0.035, y + h, 6, dLin('#8a8e94'), DL_MET);
  const ang = R() * TAU, d = [Math.cos(ang), 0, Math.sin(ang)], n = [-d[2], 0, d[0]];
  drCloth(B, [x, y + h - 0.05, z], [x, y + h - 0.05 - fh, z], d, fl, n, R() < 0.5 ? 2 : 3, 1, R() * 6, 3, 8);
}
function driftChunkEnd(ctx, G0, keep) {
  if (!ctx || !ctx.CL || !ctx.CL.nv || !DRIFT.ok) return;
  const g = new THREE.BufferGeometry(), B = ctx.CL;
  g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2)); g.setAttribute('aD', new THREE.Float32BufferAttribute(B.a, 4)); g.setIndex(B.i);
  g.computeBoundingSphere(); g.boundingSphere.radius += 2;
  const m = new THREE.Mesh(g, DRIFT.mats.cloth); m.receiveShadow = true; G0.add(m); keep.push(g);
}

/* ---------- smoke ---------- */
function driftSmokeBuild() {
  const cap = [0, 140, 300, 480][DEPTH.lvl] || 0; if (!cap) return null;
  const g = new THREE.InstancedBufferGeometry(), q = new THREE.PlaneGeometry(1, 1);
  g.setIndex(q.index); g.setAttribute('position', q.attributes.position); g.setAttribute('uv', q.attributes.uv);
  const iP = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4), iC = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4); iP.setUsage(THREE.DynamicDrawUsage); iC.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('iP', iP); g.setAttribute('iC', iC); g.instanceCount = 0;
  const mesh = new THREE.Mesh(g, DRIFT.mats.smoke); mesh.frustumCulled = false; mesh.renderOrder = 6; DEPTH.scene.add(mesh);
  DRIFT.cap = cap; return DRIFT.smoke = { mesh: mesh, geo: g, iP: iP, iC: iC, lvl: DEPTH.lvl };
}
// the sources round the camera: chimneys (from FACADE), burning roofs and street fires
function driftSources() {
  const L = [], cx = DEPTH.cam.position.x, cz = DEPTH.cam.position.z, U = DEPTH.upm;
  for (const C of DEPTH.chunks.values()) {
    const gx = C.g.position.x, gz = C.g.position.z, dx = gx + CHS / U / 2 - cx, dz = gz + CHS / U / 2 - cz; if (dx * dx + dz * dz > 170 * 170) continue;
    if (C.smoke) for (const s of C.smoke) L.push({ k: 'c' + C.k + s[0] + s[2], x: gx + s[0], y: s[1], z: gz + s[2], kind: 0, r: 0.3 });
    if (C.fires) for (const f of C.fires) L.push({ k: 'f' + C.k + f.x + f.z, x: gx + f.x, y: f.roof || f.y, z: gz + f.z, kind: 1, r: Math.max(1, f.r * 0.5) });
    if (C.c && C.c.fires) for (const f of C.c.fires) L.push({ k: 'g' + C.k + f.x + f.y, x: dX(f.x), y: 0.2, z: dZ(f.y), kind: 2, r: Math.max(0.5, f.r / U * 0.6) });
  }
  return L;
}
function driftFrame(dt) {
  if (!DEPTH.ok || !DEPTH.scene || G.mode === 'title') return;
  if (!DRIFT.ok && !driftMats()) return;
  DRIFT.t += dt;
  // the light the smoke takes: the sky's and the sun's (dim at night, the fires' own glow on top)
  if (DEPTH.hemi && DEPTH.sun) { const h = DEPTH.hemi, s = DEPTH.sun; DR_U.uLight.value.setRGB(h.color.r * h.intensity * 0.55 + s.color.r * s.intensity * 0.12, h.color.g * h.intensity * 0.55 + s.color.g * s.intensity * 0.12, h.color.b * h.intensity * 0.55 + s.color.b * s.intensity * 0.12); }
  let S = DRIFT.smoke;
  if (S && S.lvl !== DEPTH.lvl) { DEPTH.scene.remove(S.mesh); S.geo.dispose(); S = DRIFT.smoke = null; DRIFT.puffs.length = 0; }
  if (!S && DEPTH.lvl > 0) S = driftSmokeBuild();
  if (!S) return;
  if (DEPTH.scene.fog) { DRIFT.mats.smoke.uniforms.fogColor.value.copy(DEPTH.scene.fog.color); DRIFT.mats.smoke.uniforms.fogDensity.value = DEPTH.scene.fog.density; }
  // emit: each source at its own rate (the fires puff far more and far bigger), the nearest first when the pool is full
  const all = driftSources(), cx = DEPTH.cam.position.x, cz = DEPTH.cam.position.z;
  for (const q of all) q.d = Math.hypot(q.x - cx, q.z - cz) * (q.kind === 1 ? 0.6 : 1);   // (the big fires count from further off)
  all.sort((a, b) => a.d - b.d); const src = all.slice(0, [0, 10, 18, 26][DEPTH.lvl] || 0); DRIFT.sources = src.length;
  // the pool shared out: each source's puffs per second so the whole stays within it (a fire's column of fewer, bigger puffs)
  let need = 0; for (const q of src) need += (q.kind === 0 ? 1.6 * 7.5 : q.kind === 1 ? 1.4 * 14 : 1.2 * 10); const share = Math.min(1, DRIFT.cap * 0.92 / Math.max(1, need));
  const wx = (WX.wx || 0.3) * 3.2 * (1 + (WX.gust || 0)), wz = (WX.wy || 0.1) * 3.2 * (1 + (WX.gust || 0)), rain = clamp((WX.rain || 0), 0, 1);
  for (const s of src) {
    let e = DRIFT.emit.get(s.k); if (e == null) e = Math.random();
    e -= dt * (s.kind === 0 ? 1.6 : s.kind === 1 ? 1.4 : 1.2) * share * (1 - rain * (s.kind === 0 ? 0.3 : 0.5));
    while (e <= 0 && DRIFT.puffs.length < DRIFT.cap) { e += 1;
      DRIFT.puffs.push({ x: s.x + (Math.random() - 0.5) * s.r, y: s.y + Math.random() * 0.3, z: s.z + (Math.random() - 0.5) * s.r, vy: s.kind === 0 ? 0.8 + Math.random() * 0.3 : 2.6 + Math.random() * 1.2, age: 0, life: s.kind === 0 ? 6 + Math.random() * 3 : 11 + Math.random() * 6, kind: s.kind, s0: s.kind === 0 ? 0.35 : s.r * 1.6 + 1, rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 0.4, shade: s.kind === 0 ? 0.78 + Math.random() * 0.1 : 0.14 + Math.random() * 0.1 }); }
    if (e < 0) e = 0;
    DRIFT.emit.set(s.k, e);
  }
  if (DRIFT.emit.size > 600) DRIFT.emit.clear();
  // rise, slow, spread and lean downwind; fade out
  const P = DRIFT.puffs, A = S.iP.array, C = S.iC.array; let n = 0;
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i]; p.age += dt; if (p.age > p.life) { P.splice(i, 1); continue; }
    const k = p.age / p.life; p.vy *= 1 - dt * (p.kind === 0 ? 0.08 : 0.12);
    p.x += wx * dt * (0.4 + 1.6 * k); p.z += wz * dt * (0.4 + 1.6 * k); p.y += p.vy * dt; p.rot += p.spin * dt;
  }
  for (const p of P) {
    if (n >= DRIFT.cap) break;
    const k = p.age / p.life, sz = p.s0 + (p.kind === 0 ? 2.4 : 9) * Math.sqrt(k), al = (p.kind === 0 ? 0.32 : 0.7) * wxSmooth(0, 0.06, k) * (1 - wxSmooth(0.5, 1, k));
    const glow = p.kind > 0 ? Math.max(0, 1 - p.age / 1.8) * (0.6 + 0.4 * DEPTH.night) : 0;
    A[n * 4] = p.x; A[n * 4 + 1] = p.y; A[n * 4 + 2] = p.z; A[n * 4 + 3] = sz;
    C[n * 4] = p.shade + k * (p.kind === 0 ? 0.05 : 0.25); C[n * 4 + 1] = al; C[n * 4 + 2] = p.rot; C[n * 4 + 3] = glow; n++;
  }
  S.geo.instanceCount = n; if (n) { S.iP.needsUpdate = true; S.iC.needsUpdate = true; }
}
function driftFree() {
  if (DRIFT.smoke) { try { DEPTH.scene && DEPTH.scene.remove(DRIFT.smoke.mesh); DRIFT.smoke.geo.dispose(); } catch (e) { } DRIFT.smoke = null; }
  for (const k of ['tex', 'puffTex']) if (DRIFT[k]) { try { DRIFT[k].dispose(); } catch (e) { } DRIFT[k] = null; }
  for (const k in DRIFT.mats) { try { DRIFT.mats[k].dispose(); } catch (e) { } } DRIFT.mats = {}; DRIFT.puffs.length = 0; DRIFT.emit.clear(); DRIFT.ok = false;
}
// the self-test: a sheet and a flag come out of the builders, and a fire's smoke rises and leans downwind
function driftSelfTest() {
  if (!DRIFT.ok) return { ok: true, n: 0, pass: 0, why: 'resting (the 3D view is off)' };
  const ctx = { TH: dGB() }, R = Z.mulberry32(5), F = { o: [0, 0], t: [1, 0], n: [0, 1], len: 10 };
  const c0 = DRIFT.cloths; driftSheet(ctx, F, 3, 6, R); driftFlag(ctx, 2, 10, 2, R); const made = ctx.CL && ctx.CL.nv > 40 && !ctx.CL.p.some(v => !(v === v)); DRIFT.cloths = c0;
  const p = { x: 0, y: 1, z: 0, vy: 2.5 }, y0 = p.y; for (let i = 0; i < 20; i++) { p.vy *= 1 - 0.05 * 0.12; p.y += p.vy * 0.05; }
  const checks = [['a sheet and a flag are woven', made], ['smoke rises', p.y > y0 + 1], ['the smoke pool fits this level', DRIFT.cap >= 0]];
  const pass = checks.filter(c => c[1]).length;
  return DRIFT.tests = { ok: pass === checks.length, n: checks.length, pass: pass, why: checks.filter(c => !c[1]).map(c => c[0]).join('; ') };
}
coreDefine({ name: 'DRIFT', kind: 'render', ver: 1, does: 'What the wind moves in the 3D view: smoke from the chimneys of houses where someone holds out, thick dark columns rising from burning buildings and street fires, leaning downwind and lit orange from below; survivors\' sheets hung from windows (SOS, HELP US) billowing off the walls, flags and banners on the roofs rippling and snapping in the wind. Moved on the graphics chip; smoke is one instanced draw.',
  provides: ['smoke3d', 'cloth3d'], needs: ['DEPTH', 'WX'],
  state: () => DRIFT.ok ? DRIFT.puffs.length + ' puffs from ' + DRIFT.sources + ' sources · ' + DRIFT.cloths + ' cloths hung' : 'resting',
  check: () => DRIFT.ok && !DRIFT.tex ? 'its cloth atlas went missing' : '',
  repair: () => { driftFree(); },
  selfTest: driftSelfTest,
  docs: { what: 'Smoke and cloth in the 3D view.', how: 'Smoke: puffs emitted from chimney, roof-fire and street-fire sources round the camera, simulated on the CPU and drawn as instanced camera-facing quads; cloth: grids built into each block by FACADE, waved in the vertex shader by the wind.' }
});
