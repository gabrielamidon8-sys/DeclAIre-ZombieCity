/* SPARK (1.9.999): the fight's effects in the 3D view.
   Tracers run from the muzzle to where the crosshair points; the muzzle flash bursts at the real muzzle of the
   survivor's 3D gun; sparks, blood and smoke get a height and fall (or rise) under gravity; the zombies' shots glow at
   chest height; burning, acid, ice and sludge lie on the street; blood and scorch marks stay where they landed; shock
   rings spread, warning circles fill before something lands, and medkits spin over a soft glow.
   It draws what the game's own lists already hold (bullets, particles, shots, hazards, splats, pickups, rings,
   blasts, brass, smoke and gibs), so nothing in the simulation changes and co-op sees the same thing.
   Four draws: glowing things, dark things, marks on the ground, medkits. */
const SPARK = {
  ok: false, scene: null, glow: null, dark: null, deco: null, med: null, medTex: null, h: new WeakMap(), col: new Map(),
  ms: 0, msAvg: 0, n: [0, 0, 0, 0], errT: [], offUntil: 0, lit: [1, 1, 1], made: 0
};
const SPARK_CAP = [7000, 3500, 1800, 64];   // glowing, dark, ground marks, medkits
const SPARK_HOT = 3.2;                      // glowing things are brighter than white, so the bloom catches them

const SPARK_GLSL_N = `
  float vh21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vvn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(vh21(i), vh21(i + vec2(1.0, 0.0)), f.x), mix(vh21(i + vec2(0.0, 1.0)), vh21(i + vec2(1.0, 1.0)), f.x), f.y); }
  float vfbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vvn(p); p *= 2.03; a *= 0.5; } return s; }`;
// billboards: a quad that faces the camera (round things) or runs along a segment (streaks); iA = where and how big,
// iB = the segment (zero for a round thing) and the shape (+ a seed in the fraction), iC = colour and opacity
const SPARK_VS = `
  attribute vec4 iA, iB, iC;
  varying vec2 vUv; varying vec4 vC; varying float vK, vS, vFogDepth;
  void main() {
    vec3 P = iA.xyz; float s = iA.w; vec3 D = iB.xyz; vK = floor(iB.w); vS = fract(iB.w); vC = iC; vUv = position.xy;
    vec3 a = (viewMatrix * vec4(P, 1.0)).xyz, q;
    if (dot(D, D) > 1e-8) {
      vec3 b = (viewMatrix * vec4(P + D, 1.0)).xyz, ax = b - a; float L = length(ax); vec3 dir = ax / max(L, 1e-5);
      vec3 mid = mix(a, b, 0.5 + 0.5 * position.x), side = normalize(cross(dir, mid) + vec3(1e-6, 0.0, 0.0));
      q = mid + side * position.y * s * 0.5 + dir * position.x * s * 0.5;
    } else {
      float r = vS * 6.2832 + (vK > 1.5 ? vS * 3.0 : 0.0), c = cos(r), sn = sin(r);
      vec2 o = vec2(position.x * c - position.y * sn, position.x * sn + position.y * c);
      q = a + vec3(o * s * 0.5, 0.0);
      vUv = position.xy;
    }
    vFogDepth = -q.z;
    gl_Position = projectionMatrix * vec4(q, 1.0);
  }`;
const SPARK_FS = `
  uniform vec3 uLit; uniform float uTime, uAdd; uniform vec3 fogColor; uniform float fogDensity;
  varying vec2 vUv; varying vec4 vC; varying float vK, vS, vFogDepth;
  ${SPARK_GLSL_N}
  void main() {
    float a; vec3 c = vC.rgb; int k = int(vK + 0.5); float r = length(vUv);
    if (k == 1) {            // a streak: a hot core, soft edges, fading towards its tail
      float ac = abs(vUv.y), t = 0.5 + 0.5 * vUv.x;
      a = (1.0 - smoothstep(0.0, 1.0, ac)) * (1.0 - t * 0.8) * (1.0 - smoothstep(0.82, 1.0, abs(vUv.x)));
      c *= 1.0 + 1.6 * (1.0 - smoothstep(0.0, 0.35, ac)) * uAdd;
    } else if (k == 2) {     // smoke: a soft, lumpy puff
      float n = vfbm(vUv * 1.7 + vS * 31.0 + uTime * 0.15);
      a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.45 + 0.55 * n);
    } else if (k == 3) {     // a chunk: a small hard piece (blood drops, grit, brass)
      a = 1.0 - smoothstep(0.5, 0.72, r + (vvn(vUv * 2.5 + vS * 17.0) - 0.5) * 0.35);
    } else {                 // a glow: a round falloff with a white-hot middle
      a = pow(max(0.0, 1.0 - r), 1.7); c *= 1.0 + 2.2 * exp(-r * r * 12.0) * uAdd;
    }
    a *= vC.a; if (a < 0.003) discard;
    float f = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    if (uAdd > 0.5) gl_FragColor = vec4(c * (1.0 - f * 0.85), a);
    else { c *= uLit; gl_FragColor = vec4(mix(c, fogColor, f), a); }
  }`;
// marks on the ground: a flat quad turned by its angle, sized on both axes; the shape comes from its kind
const SPARK_DVS = `
  attribute vec4 dA, dB, dC, dD;
  varying vec2 vUv; varying vec4 vC, vD; varying float vK, vS, vFogDepth;
  void main() {
    float ca = cos(dA.w), sa = sin(dA.w); vec2 l = position.xy * dB.xy, w = vec2(l.x * ca - l.y * sa, l.x * sa + l.y * ca);
    vec3 P = vec3(dA.x + w.x, dA.y, dA.z + w.y);
    vUv = position.xy; vC = dC; vD = dD; vK = dB.z; vS = dB.w;
    vec4 mv = viewMatrix * vec4(P, 1.0); vFogDepth = -mv.z; gl_Position = projectionMatrix * mv;
  }`;
const SPARK_DFS = `
  uniform vec3 uLit; uniform float uTime; uniform vec3 fogColor; uniform float fogDensity;
  varying vec2 vUv; varying vec4 vC, vD; varying float vK, vS, vFogDepth;
  ${SPARK_GLSL_N}
  void main() {
    int k = int(vK + 0.5); vec2 u = vUv; float r = length(u), a = 0.0, em = vD.w; vec3 c = vC.rgb; vec2 sp = u * 2.0 + vS * 37.0;
    if (k == 0) {            // blood: an uneven pool with drops round it, darker and thicker at the rim
      float e = 0.6 + 0.32 * vfbm(sp * 1.3);
      a = 1.0 - smoothstep(e - 0.07, e, r);
      a = max(a, step(0.87, vvn(u * 9.0 + vS * 91.0)) * (1.0 - smoothstep(0.75, 1.0, r)));
      c *= 0.72 + 0.45 * (1.0 - smoothstep(e - 0.22, e, r)) * vvn(u * 3.0 + vS * 7.0) + 0.0;
    } else if (k == 1) {     // a spray: streaks thrown out along the shot, flecks past them
      float n = vfbm(vec2(u.x * 1.4, u.y * 5.5) + vS * 13.0);
      a = (1.0 - smoothstep(0.35, 1.0, length(u * vec2(0.85, 1.7)))) * smoothstep(0.42, 0.66, n);
      a = max(a, step(0.9, vvn(u * 13.0 + vS * 5.0)) * (1.0 - smoothstep(0.55, 1.0, r)));
    } else if (k == 2) {     // scorch: soot that thins out to the edge
      a = (1.0 - smoothstep(0.12, 1.0, r)) * (0.6 + 0.4 * vfbm(sp));
    } else if (k == 3) {     // a ring (shock rings, danger auras)
      float th = clamp(vD.x, 0.015, 0.6); a = 1.0 - smoothstep(0.0, th, abs(r - (1.0 - th)));
    } else if (k == 4) {     // a warning circle: the area faint, a disc filling to the moment, a bright edge
      a = (0.14 + 0.24 * step(r, vD.y) + 0.7 * (1.0 - smoothstep(0.0, 0.05, abs(r - 0.95)))) * step(r, 1.0);
    } else if (k == 5) {     // acid: a bubbling pool
      float e = 0.74 + 0.2 * vfbm(sp + uTime * 0.2); a = (1.0 - smoothstep(e - 0.1, e, r)) * 0.85;
      c *= 0.65 + 0.9 * smoothstep(0.62, 0.9, vvn(u * 7.0 + vec2(0.0, uTime * 0.7) + vS * 9.0));
    } else if (k == 6) {     // a vortex: a black heart with arms turning round it
      float an = atan(u.y, u.x), sw = sin(an * 3.0 + r * 9.0 - uTime * 5.0);
      a = (1.0 - smoothstep(0.2, 1.0, r)) * (0.5 + 0.5 * sw); c *= smoothstep(0.0, 0.45, r); a = max(a, 1.0 - smoothstep(0.12, 0.36, r));
    } else if (k == 7) {     // ice: a frozen sheet with cracks
      float e = 0.8 + 0.15 * vfbm(sp); a = (1.0 - smoothstep(e - 0.06, e, r)) * 0.72;
      c *= 1.0 + 0.9 * (1.0 - smoothstep(0.0, 0.045, abs(vvn(u * 5.0 + vS * 3.0) - 0.5)));
    } else if (k == 8) {     // fire on the ground: a hot bed that flickers
      float n = vfbm(sp * 1.5 + vec2(0.0, -uTime * 1.6)); a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.35 + 0.65 * n);
      c *= mix(vec3(1.0, 0.22, 0.03), vec3(1.0, 0.72, 0.28), n);
    } else if (k == 9) {     // a lane: the strip a charger is about to run down, brighter at its far end
      a = (1.0 - smoothstep(0.8, 1.0, abs(u.y))) * (1.0 - smoothstep(0.94, 1.0, abs(u.x))) * (0.35 + 0.65 * (0.5 + 0.5 * u.x));
    } else if (k == 10) {    // sludge and spores: a soft, mottled patch
      a = (1.0 - smoothstep(0.35, 1.0, r)) * (0.45 + 0.55 * vfbm(sp + uTime * 0.05));
    } else {                 // a soft glow (under a pickup)
      a = pow(max(0.0, 1.0 - r), 2.0);
    }
    a *= vC.a; if (a < 0.004) discard;
    float e1 = clamp(em, 0.0, 1.0);
    vec3 o = c * uLit * (1.0 - e1) + c * em * 2.4;
    float f = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    gl_FragColor = vec4(mix(o, fogColor, f), a * (1.0 - f * 0.3));
  }`;

function sparkQuad(g) {
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
}
function sparkAttr(g, name, cap) { const a = new Float32Array(cap * 4), at = new THREE.InstancedBufferAttribute(a, 4); at.setUsage(THREE.DynamicDrawUsage); g.setAttribute(name, at); return a; }
function sparkBillboards(cap, add) {
  const g = new THREE.InstancedBufferGeometry(); sparkQuad(g);
  const A = sparkAttr(g, 'iA', cap), B = sparkAttr(g, 'iB', cap), C = sparkAttr(g, 'iC', cap); g.instanceCount = 0;
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uLit: { value: new THREE.Vector3(1, 1, 1) }, uTime: { value: 0 }, uAdd: { value: add ? 1 : 0 } }]),
    vertexShader: SPARK_VS, fragmentShader: SPARK_FS, transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending
  });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = add ? 6 : 5;
  return { mesh: mesh, g: g, m: m, A: A, B: B, C: C, n: 0, cap: cap };
}
function sparkDecals(cap) {
  const g = new THREE.InstancedBufferGeometry(); sparkQuad(g);
  // the quad lies flat: its y becomes the ground's depth (z), so the shader turns it in the ground plane
  const A = sparkAttr(g, 'dA', cap), B = sparkAttr(g, 'dB', cap), C = sparkAttr(g, 'dC', cap), D = sparkAttr(g, 'dD', cap); g.instanceCount = 0;
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uLit: { value: new THREE.Vector3(1, 1, 1) }, uTime: { value: 0 } }]),
    vertexShader: SPARK_DVS, fragmentShader: SPARK_DFS, transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4
  });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 2;
  return { mesh: mesh, g: g, m: m, A: A, B: B, C: C, D: D, n: 0, cap: cap };
}
// the medkit's box: off-white plastic with a red cross on every face
function sparkMedTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#e8e2d4'; g.fillRect(0, 0, 64, 64); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 61, 61);
  g.fillStyle = '#c4262c'; g.fillRect(25, 12, 14, 40); g.fillRect(12, 25, 40, 14);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function sparkInit() {
  if (typeof THREE === 'undefined' || !DEPTH.ok || !DEPTH.scene) return false;
  sparkFree();
  try {
    const S = DEPTH.scene;
    SPARK.glow = sparkBillboards(SPARK_CAP[0], true); SPARK.dark = sparkBillboards(SPARK_CAP[1], false); SPARK.deco = sparkDecals(SPARK_CAP[2]);
    SPARK.medTex = sparkMedTex();
    const mm = new THREE.MeshStandardMaterial({ map: SPARK.medTex, roughness: 0.55, metalness: 0, emissive: new THREE.Color(0xffffff), emissiveMap: SPARK.medTex, emissiveIntensity: 0.12 });
    SPARK.med = new THREE.InstancedMesh(new THREE.BoxGeometry(0.44, 0.28, 0.32), mm, SPARK_CAP[3]); SPARK.med.count = 0; SPARK.med.castShadow = true; SPARK.med.frustumCulled = false;
    S.add(SPARK.deco.mesh); S.add(SPARK.dark.mesh); S.add(SPARK.glow.mesh); S.add(SPARK.med);
    SPARK.scene = S; SPARK.ok = true; SPARK.made++;
    return true;
  } catch (e) { sparkHurt(e); return false; }
}
function sparkFree() {
  for (const k of ['glow', 'dark', 'deco']) { const B = SPARK[k]; if (B) { if (SPARK.scene) SPARK.scene.remove(B.mesh); B.g.dispose(); B.m.dispose(); SPARK[k] = null; } }
  if (SPARK.med) { if (SPARK.scene) SPARK.scene.remove(SPARK.med); SPARK.med.geometry.dispose(); SPARK.med.material.dispose(); SPARK.med = null; }
  if (SPARK.medTex) { SPARK.medTex.dispose(); SPARK.medTex = null; }
  SPARK.ok = false; SPARK.scene = null;
}

// a colour from the game ('#rgb', '#rrggbb', 'rgb(...)', 'rgba(...)') into the renderer's linear light, cached
function sparkCol(s) {
  let c = SPARK.col.get(s); if (c) return c;
  c = [1, 1, 1, 1];
  try {
    if (typeof s === 'string' && s[0] === '#') {
      let h = s.slice(1); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      const v = parseInt(h.slice(0, 6), 16); c[0] = (v >> 16 & 255) / 255; c[1] = (v >> 8 & 255) / 255; c[2] = (v & 255) / 255;
    } else if (typeof s === 'string') {
      const m = s.match(/[\d.]+/g); if (m) { c[0] = +m[0] / 255; c[1] = +m[1] / 255; c[2] = +m[2] / 255; if (m[3] != null) c[3] = +m[3]; }
    }
  } catch (e) { }
  for (let i = 0; i < 3; i++) c[i] = Math.pow(clamp(c[i], 0, 1), 2.2);
  if (SPARK.col.size > 600) SPARK.col.clear();
  SPARK.col.set(s, c); return c;
}
function sparkRgb(rgb) { return [Math.pow((rgb[0] || 0) / 255, 2.2), Math.pow((rgb[1] || 0) / 255, 2.2), Math.pow((rgb[2] || 0) / 255, 2.2), 1]; }

// one billboard: at (x, y, z) metres, s across, along the segment (dx, dy, dz) when it is a streak
function sparkPut(B, x, y, z, s, dx, dy, dz, shape, seed, r, g, b, a) {
  if (B.n >= B.cap || !(a > 0.004)) return;
  const i = B.n++ * 4, A = B.A, Bb = B.B, C = B.C;
  A[i] = x; A[i + 1] = y; A[i + 2] = z; A[i + 3] = s;
  Bb[i] = dx; Bb[i + 1] = dy; Bb[i + 2] = dz; Bb[i + 3] = shape + clamp(seed, 0, 0.999);
  C[i] = r; C[i + 1] = g; C[i + 2] = b; C[i + 3] = a;
}
// one mark on the ground: centre (x, z) at height y, half sizes (hx, hz), turned by ang; kind, seed, colour, params
function sparkMark(x, y, z, hx, hz, ang, kind, seed, r, g, b, a, p0, p1, em) {
  const D = SPARK.deco; if (D.n >= D.cap || !(a > 0.004) || !(hx > 0.01)) return;
  const i = D.n++ * 4;
  D.A[i] = x; D.A[i + 1] = y; D.A[i + 2] = z; D.A[i + 3] = ang;
  D.B[i] = hx; D.B[i + 1] = hz; D.B[i + 2] = kind; D.B[i + 3] = seed;
  D.C[i] = r; D.C[i + 1] = g; D.C[i + 2] = b; D.C[i + 3] = a;
  D.D[i] = p0 || 0; D.D[i + 1] = p1 || 0; D.D[i + 2] = 0; D.D[i + 3] = em || 0;
}
function sparkFlush(B) {
  const g = B.g; g.instanceCount = B.n;
  for (const k in g.attributes) { const at = g.attributes[k]; if (!at.isInstancedBufferAttribute) continue; at.clearUpdateRanges(); at.addUpdateRange(0, Math.max(4, B.n * 4)); at.needsUpdate = true; }
}

// a tracer's height: from the muzzle towards the height of the point the crosshair found, straight along the way it
// flies (the simulation is flat: this is only where it is drawn). Rounds from anywhere else fly at chest height.
function sparkBulletStart(b, U) {
  const p = G.p;
  if (p && !b.cos && FLESH.muz && Math.hypot(b.x - p.x, b.y - p.y) < 4 * U && G.mode !== 'title') {
    const h0 = FLESH.muz[1], d = Math.max(1, Math.hypot(HOVER.aimPt[0] - b.x, HOVER.aimPt[1] - b.y) / U);
    return { h0: h0, s: clamp((HOVER.aimH - h0) / d, -0.6, 0.6), x0: b.x, y0: b.y };
  }
  return { h0: 1.35, s: 0, x0: b.x, y0: b.y };
}
function sparkBulletH(st, b, U) { return Math.max(0.03, st.h0 + st.s * Math.hypot(b.x - st.x0, b.y - st.y0) / U); }

/* ---------- the frame ---------- */
function sparkFrame(dt) {
  if (!DEPTH.ok) return;
  if (SPARK.offUntil && performance.now() < SPARK.offUntil) { if (SPARK.ok) { SPARK.glow.mesh.visible = SPARK.dark.mesh.visible = SPARK.deco.mesh.visible = SPARK.med.visible = false; } return; }
  if (!SPARK.ok || SPARK.scene !== DEPTH.scene) { if (!sparkInit()) return; }
  const t0 = performance.now();
  try { sparkBuild(clamp(dt || 0.016, 0, 0.05)); }
  catch (e) { sparkHurt(e); }
  const ms = performance.now() - t0; SPARK.ms = ms; SPARK.msAvg = SPARK.msAvg * 0.95 + ms * 0.05; coreCost('SPARK', ms);
}
function sparkBuild(dt) {
  const U = DEPTH.upm, Gl = SPARK.glow, Dk = SPARK.dark, De = SPARK.deco, HM = SPARK.h, T = G.time || 0, HOT = SPARK_HOT;
  Gl.n = 0; Dk.n = 0; De.n = 0;
  Gl.mesh.visible = Dk.mesh.visible = De.mesh.visible = SPARK.med.visible = true;
  // the light the dark things and the marks are lit by: the sun and the sky, roughly as the ground gets them
  const su = DEPTH.sun, he = DEPTH.hemi, L = SPARK.lit, sy = su ? Math.max(0.15, (su.position.y - (HOVER.pivot ? HOVER.pivot[1] : 0)) / 120) : 0.5;
  for (let i = 0; i < 3; i++) { const sc = su ? [su.color.r, su.color.g, su.color.b][i] * su.intensity * sy * 0.75 : 0, hc = he ? [he.color.r, he.color.g, he.color.b][i] * he.intensity : 0.5; L[i] = (sc + hc) / Math.PI + 0.02; }
  for (const B of [Gl, Dk, De]) { B.m.uniforms.uLit.value.set(L[0], L[1], L[2]); B.m.uniforms.uTime.value = T; }
  const cx = HOVER.pivot ? HOVER.pivot[0] * U + DEPTH.ox : cam.x, cy = HOVER.pivot ? HOVER.pivot[2] * U + DEPTH.oy : cam.y, far = (DEPTH.fogFar || 100) * U * 1.1, far2 = far * far;
  const near = (x, y, m) => { const dx = x - cx, dy = y - cy; return dx * dx + dy * dy < far2 + (m || 0); };
  const gy = (x, y) => fleshGroundY({ x: x, y: y });

  /* the muzzle flash, at the 3D gun's muzzle, pointing where the crosshair is */
  const p = G.p;
  if (p && G.mode !== 'title' && !p.down && FLESH.muz && p.flashT > 0) {
    const fk = (p.weapon && p.weapon.F && p.weapon.F.key) || 'pistol', P = (typeof MZ !== 'undefined' && (MZ[fk] || MZ.pistol)) || {};
    const life = Math.min(0.05, p.mfl || P.life || 0.05), fl = clamp((p.flashT - (0.05 - life)) / life, 0, 1);
    if (fl > 0 && fk !== 'flamer') {
      const m = FLESH.muz, ax = dX(HOVER.aimPt[0]) - m[0], ay = HOVER.aimH - m[1], az = dZ(HOVER.aimPt[1]) - m[2], al = Math.hypot(ax, ay, az) || 1;
      const fx = ax / al, fy = ay / al, fz = az / al, sc = (0.55 + 0.11 * (P.bright || 3)) * (SET.flash ? 0.75 : 1) * (P.dev === 'cone' || P.dev === 'twin' ? 1.35 : 1);
      const tn = p.mft, cr = tn ? 0.6 + tn[0] / 255 * 0.4 : 1, cg = tn ? 0.6 * 0.84 + tn[1] / 255 * 0.4 : 0.8, cb = tn ? 0.6 * 0.55 + tn[2] / 255 * 0.4 : 0.48;
      const H = HOT * 2.2 * fl, sd = (p.mfv || 0) * 0.23;
      sparkPut(Gl, m[0] + fx * 0.04, m[1] + fy * 0.04, m[2] + fz * 0.04, 0.26 * sc, 0, 0, 0, 0, sd, cr * H, cg * H, cb * H, 1);
      sparkPut(Gl, m[0], m[1], m[2], 0.32 * sc * (0.8 + fl * 0.4), fx * 0.5 * sc, fy * 0.5 * sc, fz * 0.5 * sc, 1, sd, cr * H, cg * H * 0.9, cb * H * 0.7, 1);
      // four short petals out to the sides (an up vector and a side vector round the barrel)
      const sx = -fz, sz = fx, sl = Math.hypot(sx, sz) || 1, ux = -fy * fx, uy = fx * fx + fz * fz, uz = -fy * fz, ul = Math.hypot(ux, uy, uz) || 1;
      for (let i = 0; i < 4; i++) {
        const an = i * Math.PI / 2 + sd * 6, c = Math.cos(an), s = Math.sin(an), dx = (sx / sl * c + ux / ul * s), dy = (uy / ul * s), dz = (sz / sl * c + uz / ul * s);
        sparkPut(Gl, m[0] + fx * 0.06, m[1] + fy * 0.06, m[2] + fz * 0.06, 0.08 * sc, dx * 0.16 * sc + fx * 0.05, dy * 0.16 * sc + fy * 0.05, dz * 0.16 * sc + fz * 0.05, 1, 0, cr * H, cg * H * 0.85, cb * H * 0.6, 0.85);
      }
      sparkPut(Gl, m[0] + fx * 0.15, m[1] + fy * 0.15, m[2] + fz * 0.15, 1.3 * sc, 0, 0, 0, 0, 0, cr * HOT * 0.5, cg * HOT * 0.45, cb * HOT * 0.4, 0.3 * fl);
    }
    if (fk === 'flamer') { const m = FLESH.muz, k = 0.8 + Math.random() * 0.4; sparkPut(Gl, m[0], m[1], m[2], 0.07 * k, 0, 0, 0, 0, 0, 0.2 * HOT, 0.45 * HOT, 1.2 * HOT, 0.9); }
  }

  /* rounds in flight */
  for (const b of G.bullets) {
    if (b.dead || !near(b.x, b.y)) continue;
    let st = HM.get(b); if (!st) { st = sparkBulletStart(b, U); HM.set(b, st); }
    const x = dX(b.x), z = dZ(b.y);
    if (b.kind === 'flame') {
      const f = clamp(1 - b.life / b.max, 0, 1), h = sparkBulletH(st, b, U) + f * 0.7, s = (4 + f * 13) * 2.2 / U * 1.6;
      const c = f < 0.3 ? [1, 0.82, 0.38] : f < 0.6 ? [1, 0.36, 0.05] : [0.6, 0.08, 0.01];
      sparkPut(Gl, x, h, z, s, 0, 0, 0, 0, (b.x * 0.013) % 1, c[0] * HOT, c[1] * HOT, c[2] * HOT, 0.7 * (1 - f));
      if (f > 0.45) sparkPut(Dk, x, h + 0.25, z, s * 1.5, 0, 0, 0, 2, (b.y * 0.017) % 1, 0.08, 0.075, 0.07, 0.3 * (f - 0.45));
      continue;
    }
    if (b.kind === 'grenade') {
      const f = clamp(1 - b.life / (b.max || 1), 0, 1), h = Math.max(0.08, st.h0 * (1 - f) + 2.4 * 4 * f * (1 - f) * 0.6);
      sparkPut(Dk, x, h, z, 0.13, 0, 0, 0, 3, 0.3, 0.06, 0.07, 0.05, 1);
      if (Math.floor(T * 14) % 2) sparkPut(Gl, x, h + 0.05, z, 0.12, 0, 0, 0, 0, 0, HOT * 1.5, 0.2, 0.1, 0.9);
      continue;
    }
    const h = sparkBulletH(st, b, U), tl = Math.min(b.heavy ? 0.034 : b.shard ? 0.012 : 0.022, b.age || 0) * 1.5;
    const tx = -b.vx * tl / U, tz = -b.vy * tl / U, ty = -st.s * Math.hypot(tx, tz);
    const c = b.crit ? [1, 1, 1, 1] : sparkCol(b.col || '#ffd27a'), w = b.heavy ? 0.075 : b.shard ? 0.03 : b.crit ? 0.06 : 0.045;
    sparkPut(Gl, x, h, z, w, tx, ty, tz, 1, 0, c[0] * HOT * 1.6, c[1] * HOT * 1.6, c[2] * HOT * 1.6, 1);
    sparkPut(Gl, x, h, z, w * 4.5, tx, ty, tz, 1, 0, c[0] * HOT * 0.5, c[1] * HOT * 0.5, c[2] * HOT * 0.5, 0.08);
  }

  /* the zombies' shots, at chest height */
  for (const e of G.eshots) {
    if (!near(e.x, e.y)) continue;
    const x = dX(e.x), z = dZ(e.y), h = 1.15 + Math.sin(T * 9 + e.x * 0.05) * 0.04, r = (e.r || 5) / U;
    if (e.k === 'wrench' || e.k === 'spike' || e.k === 'shard') {
      const c = sparkCol(SHOT_COL[e.k] || '#9aa0a6'), sp = Math.hypot(e.vx, e.vy) || 1, ln = 0.28;
      sparkPut(Dk, x, h, z, e.k === 'wrench' ? 0.12 : 0.07, -e.vx / sp * ln, 0, -e.vy / sp * ln, 1, 0, c[0], c[1], c[2], 1);
      continue;
    }
    if (e.k === 'web') { sparkPut(Dk, x, h, z, 0.42, 0, 0, 0, 2, (e.x * 0.01) % 1, 0.9, 0.88, 0.82, 0.75); continue; }
    const col = e.k === 'acid' ? '#b8ec4a' : e.k === 'wisp' ? '#ffd38a' : SHOT_COL[e.k] && e.k !== 'bolt' ? SHOT_COL[e.k] : null;
    if (col) {
      const c = sparkCol(col);
      sparkPut(Gl, x, h, z, Math.max(0.12, r * 2.4), 0, 0, 0, 0, 0, c[0] * HOT * 1.5, c[1] * HOT * 1.5, c[2] * HOT * 1.5, 1);
      sparkPut(Gl, x, h, z, Math.max(0.3, r * 5), 0, 0, 0, 0, 0, c[0] * HOT * 0.6, c[1] * HOT * 0.6, c[2] * HOT * 0.6, 0.35);
      if (e.k === 'acid') sparkPut(Dk, x, h, z, Math.max(0.1, r * 1.8), 0, 0, 0, 3, (e.y * 0.01) % 1, c[0] * 0.8, c[1] * 0.8, c[2] * 0.8, 0.9);
    } else {
      const sp = 0.03; sparkPut(Gl, x, h, z, 0.07, -e.vx * sp / U, 0, -e.vy * sp / U, 1, 0, HOT * 1.6, 0.2 * HOT, 0.15 * HOT, 1);
    }
  }

  /* particles: each gets a height and falls (sparks fall slowly, smoke rises) */
  const pm = FLESH.muz;
  for (const q of G.parts) {
    if (!near(q.x, q.y)) continue;
    let st = HM.get(q);
    if (!st) {
      const atMuz = pm && p && q.glow && Math.hypot(q.x - p.x, q.y - p.y) < 3 * U;
      const smoke = typeof q.c === 'string' && q.c.indexOf('rgba') === 0 && q.s >= 3.5;
      st = { h: atMuz ? pm[1] : q.bl ? 0.9 + Math.random() * 0.5 : 0.4 + Math.random() * 0.9, v: smoke ? 0.3 + Math.random() * 0.4 : atMuz ? Math.random() * 1.2 - 0.3 : 0.6 + Math.random() * 2.6, gr: smoke ? -0.4 : q.glow ? 5 : 9.8, g: gy(q.x, q.y), sm: smoke };
      HM.set(q, st);
    }
    st.v -= st.gr * dt; st.h += st.v * dt;
    if (st.h < st.g + 0.02) { st.h = st.g + 0.02; st.v = st.v < -1 ? -st.v * 0.25 : 0; }
    const a = clamp(q.life / (q.max || 1), 0, 1), c = sparkCol(q.c), s = Math.max(0.025, (q.s || 2) / U * 1.5), x = dX(q.x), z = dZ(q.y);
    if (q.glow) sparkPut(Gl, x, st.h, z, s * 1.6, 0, 0, 0, 0, 0, c[0] * HOT, c[1] * HOT, c[2] * HOT, a * (c[3] || 1));
    else if (st.sm) sparkPut(Dk, x, st.h, z, s * 2.6, 0, 0, 0, 2, (q.x * 0.013 + q.y * 0.007) % 1, c[0], c[1], c[2], a * (c[3] || 1) * 0.8);
    else sparkPut(Dk, x, st.h, z, s, 0, 0, 0, 3, (q.x * 0.013) % 1, c[0], c[1], c[2], a * (c[3] || 1));
  }

  /* the gun smoke, the brass on the street and the bits off the dead */
  if (typeof MUZZLE !== 'undefined') {
    for (const s of MUZZLE.smoke) {
      if (!near(s.x, s.y)) continue; let st = HM.get(s); if (!st) { st = { h: pm && p && Math.hypot(s.x - p.x, s.y - p.y) < 3 * U ? pm[1] : 1.3 }; HM.set(s, st); }
      st.h += dt * 0.28;
      const a = clamp(s.life / (s.max || 1), 0, 1) * (s.a || 0.2) * 1.5;
      sparkPut(Dk, dX(s.x), st.h, dZ(s.y), s.r * 2 / U * 1.4, 0, 0, 0, 2, (s.x * 0.011) % 1, 0.42, 0.41, 0.39, a);
    }
    for (const b of MUZZLE.brass) {
      if (!near(b.x, b.y)) continue;
      sparkPut(Dk, dX(b.x), Math.max(0.02, b.h / U) + gy(b.x, b.y) * (b.h > 0 ? 0 : 1), dZ(b.y), 0.04, 0, 0, 0, 3, 0.5, b.k === 'shell' ? 0.6 : 0.62, b.k === 'shell' ? 0.06 : 0.42, b.k === 'shell' ? 0.04 : 0.1, b.t > 7 ? clamp(9 - b.t, 0, 1) : 1);
    }
  }
  if (typeof GORE !== 'undefined') for (const b of GORE.gibs) {
    if (!near(b.x, b.y)) continue;
    const c = sparkRgb(b.rgb || [90, 10, 14]), h = Math.max(0.02, b.h / U), s = Math.max(0.03, (b.s || 1.5) / U * 1.6);
    if (b.glow) sparkPut(Gl, dX(b.x), h, dZ(b.y), s * 1.5, 0, 0, 0, 0, 0, c[0] * HOT, c[1] * HOT, c[2] * HOT, 1);
    else sparkPut(Dk, dX(b.x), h, dZ(b.y), s, 0, 0, 0, 3, (b.v % 997) / 997, c[0], c[1], c[2], 1);
  }

  /* lightning arcs (the tesla and the bosses) */
  for (const b of G.bolts) {
    const P = b.pts; if (!P || P.length < 4 || !near(P[0], P[1])) continue;
    const c = sparkCol(b.c || '#cfe8ff'), a = clamp(b.life / 0.18, 0, 1);
    for (let i = 0; i + 3 < P.length; i += 2) {
      const h0 = 1.25 + Math.sin(i * 1.7 + T * 40) * 0.12, h1 = 1.25 + Math.sin((i + 2) * 1.7 + T * 40) * 0.12;
      const x0 = dX(P[i]), z0 = dZ(P[i + 1]);
      sparkPut(Gl, x0, h0, z0, 0.06, dX(P[i + 2]) - x0, h1 - h0, dZ(P[i + 3]) - z0, 1, 0, c[0] * HOT * 2, c[1] * HOT * 2, c[2] * HOT * 2, a);
      sparkPut(Gl, x0, h0, z0, 0.3, dX(P[i + 2]) - x0, h1 - h0, dZ(P[i + 3]) - z0, 1, 0, c[0] * HOT * 0.6, c[1] * HOT * 0.6, c[2] * HOT * 0.6, a * 0.25);
    }
  }

  /* lightning: a ground strike is a jagged bolt from the clouds down to where it hit, a far one flickers off on the horizon */
  if (typeof WX !== 'undefined' && WX.bolts) for (const b of WX.bolts) {
    let st = HM.get(b); if (!st) { st = sparkBoltPath(b, U); HM.set(b, st); }
    const a = clamp(b.life / (b.max || 0.3), 0, 1) * (0.55 + 0.45 * Math.random());
    for (const g of st) { sparkPut(Gl, g[0], g[1], g[2], g[6], g[3], g[4], g[5], 1, 0, 0.75 * HOT * 4, 0.82 * HOT * 4, HOT * 4, a); sparkPut(Gl, g[0], g[1], g[2], g[6] * 7, g[3], g[4], g[5], 1, 0, 0.5 * HOT, 0.6 * HOT, HOT, a * 0.18); }
  }
  /* on the ground: hazards (fire also throws up flames and smoke) */
  for (const hz of G.haz) {
    if (!near(hz.x, hz.y, hz.r * hz.r)) continue;
    const f = clamp(hz.life / (hz.max || 1) * 2, 0, 1), x = dX(hz.x), z = dZ(hz.y), y = gy(hz.x, hz.y) + 0.025, r = hz.r / U, sd = ((hz.x * 0.0137 + hz.y * 0.0071) % 1 + 1) % 1;
    if (hz.k === 'acid') sparkMark(x, y, z, r, r, 0, 5, sd, 0.22, 0.6, 0.04, 0.85 * f, 0, 0, 0.4);
    else if (hz.k === 'fire') {
      sparkMark(x, y, z, r * 1.1, r * 1.1, 0, 8, sd, 1, 1, 1, f, 0, 0, 1.6);
      sparkMark(x, y - 0.004, z, r * 1.25, r * 1.25, sd * 6, 2, sd, 0.02, 0.018, 0.015, 0.55 * f, 0, 0, 0);
      const n = clamp(Math.round(r * 3), 2, 7);
      for (let i = 0; i < n; i++) {
        const ph = i * 1.71 + sd * 9, cy = ((T * 1.3 + ph) % 1 + 1) % 1, an = i * 2.4 + sd * 6, rr = r * (0.15 + 0.4 * ((i * 0.37) % 1));
        const fx = x + Math.cos(an) * rr, fz = z + Math.sin(an) * rr, s = (0.45 + 0.55 * (1 - cy)) * Math.min(1.4, 0.4 + r * 0.6);
        const c = cy < 0.3 ? [1, 0.78, 0.32] : cy < 0.65 ? [1, 0.38, 0.06] : [0.7, 0.12, 0.02];
        sparkPut(Gl, fx, y + 0.12 + cy * 1.1 * Math.min(1.5, 0.6 + r * 0.5), fz, s, 0, 0, 0, 0, (ph % 1), c[0] * HOT, c[1] * HOT, c[2] * HOT, (1 - cy) * f * 0.85);
        if (i < 3) sparkPut(Dk, fx, y + 1.2 + cy * 2.2, fz, s * 2.2, 0, 0, 0, 2, (ph * 0.3) % 1, 0.05, 0.045, 0.04, 0.22 * (1 - cy) * f);
      }
    }
    else if (hz.k === 'spore') { sparkMark(x, y, z, r, r, sd * 6, 10, sd, 0.3, 0.38, 0.1, 0.45 * f, 0, 0, 0.15); for (let i = 0; i < 3; i++) { const an = i * 2.1 + T * 0.5, rr = r * 0.4; sparkPut(Dk, x + Math.cos(an) * rr, 0.6 + Math.sin(T + i) * 0.2, z + Math.sin(an) * rr, r * 1.3, 0, 0, 0, 2, (sd + i * 0.3) % 1, 0.32, 0.4, 0.12, 0.28 * f); } }
    else if (hz.k === 'sludge') sparkMark(x, y, z, r, r * 0.8, 0.4, 10, sd, 0.08, 0.05, 0.02, 0.85 * f, 0, 0, 0);
    else if (hz.k === 'ice') sparkMark(x, y, z, r, r, sd * 6, 7, sd, 0.3, 0.55, 0.8, 0.7 * f, 0, 0, 0.08);
    else if (hz.k === 'vortex') sparkMark(x, y, z, r, r, 0, 6, sd, 0.28, 0.08, 0.6, f, 0, 0, 1.1);
  }
  /* blood and scorch marks, newest first */
  const SP = G.splats;
  for (let i = SP.length - 1; i >= 0 && De.n < De.cap - 200; i--) {
    const s = SP[i]; if (!s || !near(s.x, s.y)) continue;
    const k = s.k === 'spray' ? 1 : s.k === 'scorch' || s.k === 'zap' ? 2 : 0;
    const c = s.rgb ? sparkRgb(s.rgb) : sparkCol(s.c || '#5a0a10'), grow = s.k === 'pool' ? clamp((T - (s.t0 || 0)) / 1.6, 0.35, 1) : 1, r = (s.r || 8) / U * grow;
    const al = (s.al == null ? 0.9 : s.al) * (1 - (s.dil || 0) * 0.5) * (s.k === 'cloud' ? 0.4 : 1);
    sparkMark(dX(s.x), gy(s.x, s.y) + 0.012 + (i % 7) * 0.0006, dZ(s.y), r * (k === 1 ? 1.5 : 1), r * (s.sq || (k === 1 ? 0.7 : 1)), s.a || s.rot || 0, k, ((s.v || 0) * 0.137 + s.x * 0.001) % 1, c[0], c[1], c[2], al, 0, 0, s.glow ? 0.6 : 0);
  }
  /* shock rings, quake rings, the warning circles of what is coming down, the zombies' danger auras and charge lanes */
  for (const r of G.rings) {
    if (!near(r.x, r.y)) continue;
    const t = clamp(r.t / (r.life || 1), 0, 1), R = Math.max(0.05, (r.r0 + (r.r1 - r.r0) * t) / U), c = sparkCol('rgb(' + r.c + ')');
    sparkMark(dX(r.x), gy(r.x, r.y) + 0.04, dZ(r.y), R, R, 0, 3, 0, c[0], c[1], c[2], (1 - t) * 0.85, clamp((r.w || 2) * 1.4 / U / R, 0.02, 0.5), 0, 1.2);
  }
  if (G.quakes) for (const q of G.quakes) { if (q.t < 0) continue; const R = Math.max(0.1, q.R * q.t / q.max / U), a = 1 - q.t / q.max; sparkMark(dX(q.x), 0.05, dZ(q.y), R, R, 0, 3, 0, 1, 0.55, 0.25, 0.7 * a, clamp(q.w * 2 / U / R, 0.02, 0.4), 0, 0.8); }
  for (const b of G.blasts) {
    if (!near(b.x, b.y)) continue;
    const f = clamp(1 - b.t / (b.max || 1), 0, 1), c = sparkCol(b.col || '#ff8a3a'), x = dX(b.x), z = dZ(b.y), R = b.r / U;
    sparkMark(x, gy(b.x, b.y) + 0.035, z, R, R, 0, 4, 0, c[0], c[1], c[2], 0.9, 0, f, 1.0);
    if (b.kind === 'meteor' && f > 0.4) { const h = (1 - f) * 260 / U * 2.2; sparkPut(Gl, x + h * 0.3, h, z, 0.9, 0.6 * 3, 1.6 * 3, 0, 1, 0, c[0] * HOT * 2, c[1] * HOT * 2, c[2] * HOT * 2, 1); sparkPut(Gl, x + h * 0.3, h, z, 2.2, 0, 0, 0, 0, 0, c[0] * HOT, c[1] * HOT, c[2] * HOT, 0.5); }
    if (b.kind === 'bomb') { sparkPut(Dk, x, 0.12, z, 0.24, 0, 0, 0, 3, 0.2, 0.04, 0.05, 0.03, 1); if (Math.floor(T * 14) % 2) sparkPut(Gl, x, 0.25, z, 0.16, 0, 0, 0, 0, 0, HOT * 2, 0.3, 0.15, 1); }
  }
  if (G.p && G.mode !== 'title') for (const zz of G.zs) {
    if (zz.dead || zz.st.under || !near(zz.x, zz.y)) continue;
    const x = dX(zz.x), z = dZ(zz.y);
    if (zz.st.wind > 0 && zz.st.cx != null) { const a = Math.atan2(zz.st.cy, zz.st.cx), L = 150 / U; sparkMark(x + Math.cos(a) * L, gy(zz.x, zz.y) + 0.03, z + Math.sin(a) * L, L, zz.r * 0.6 / U, a, 9, 0, 1, 0.16, 0.12, 0.3 + (0.65 - zz.st.wind) * 0.8, 0, 0, 1.4); }
    if (zz.m && zz.m.S && zz.m.S.p && zz.m.S.p.rad && !zz.st.down) sparkMark(x, 0.03, z, 90 / U, 90 / U, 0, 3, 0, 0.6, 1, 0.05, 0.35, 0.04, 0, 0.9);
    if (zz.abs && zz.abs.indexOf('chiller') >= 0) sparkMark(x, 0.03, z, 150 / U, 150 / U, 0, 3, 0, 0.5, 0.75, 1, 0.35, 0.03, 0, 0.7);
    if (zz.boss) { const R = zz.r / U * 1.6, pu = 0.5 + 0.5 * Math.sin(T * 3); sparkMark(x, gy(zz.x, zz.y) + 0.035, z, R, R, 0, 3, 0, 1, 0.12, 0.08, 0.45 + 0.25 * pu, 0.05, 0, 1.4); }
  }

  /* medkits: a box that spins and bobs over a soft green glow (and blinks before it is gone) */
  const M = SPARK.med; let mn = 0; const O = SPARK.o || (SPARK.o = new THREE.Object3D());
  for (const k of G.picks) {
    if (k.dead || !near(k.x, k.y) || mn >= SPARK_CAP[3]) continue;
    if (k.life < 3 && Math.floor(T * 8) % 2) continue;
    const x = dX(k.x), z = dZ(k.y), y = gy(k.x, k.y), ph = (k.x * 0.013 + k.y * 0.011) % 6.28;
    O.position.set(x, y + 0.42 + Math.sin(T * 2.6 + ph) * 0.07, z); O.rotation.set(0.12, T * 1.7 + ph, 0); O.scale.setScalar(1); O.updateMatrix();
    M.setMatrixAt(mn++, O.matrix);
    sparkMark(x, y + 0.02, z, 0.7, 0.7, 0, 11, 0, 0.3, 1, 0.4, 0.4 + Math.sin(T * 4 + ph) * 0.12, 0, 0, 1.2);
  }
  M.count = mn; if (mn) M.instanceMatrix.needsUpdate = true;

  sparkFlush(Gl); sparkFlush(Dk); sparkFlush(De);
  SPARK.n[0] = Gl.n; SPARK.n[1] = Dk.n; SPARK.n[2] = De.n; SPARK.n[3] = mn;
}
// a bolt's path in 3D (once per bolt): jagged, thinning towards the ground, with a few forks
function sparkBoltPath(b, U) {
  const out = [], R = Z.mulberry32(((Math.random() * 1e9) | 0) ^ 0x51a7), piv = HOVER.pivot || [0, 0, 0];
  let x1, z1, y1, x0, z0, y0;
  if (b.gx != null) { x1 = dX(b.gx); z1 = dZ(b.gy); y1 = 0; x0 = x1 + (R() - 0.5) * 30; z0 = z1 + (R() - 0.5) * 30; y0 = 95; }
  else { const an = R() * TAU, d = Math.min(150, (DEPTH.fogFar || 100) * 0.85); x1 = piv[0] + Math.cos(an) * d; z1 = piv[2] + Math.sin(an) * d; y1 = R() < 0.5 ? 0 : 35; x0 = x1 + (R() - 0.5) * 40; z0 = z1 + (R() - 0.5) * 40; y0 = 110; }
  const seg = (ax, ay, az, bx, by, bz, n, w, jit, fork) => {
    let px = ax, py = ay, pz = az;
    for (let i = 1; i <= n; i++) {
      const t = i / n, j = jit * (1 - t * 0.7), nx = i === n ? bx : ax + (bx - ax) * t + (R() - 0.5) * j, ny = i === n ? by : ay + (by - ay) * t + (R() - 0.5) * j * 0.3, nz = i === n ? bz : az + (bz - az) * t + (R() - 0.5) * j;
      out.push([px, py, pz, nx - px, ny - py, nz - pz, w * (1 - t * 0.5)]);
      if (fork && i > 2 && i < n - 2 && R() < 0.22) { const fx = nx + (R() - 0.5) * 18, fy = ny - 8 - R() * 14, fz = nz + (R() - 0.5) * 18; seg(nx, ny, nz, fx, fy, fz, 5, w * 0.5, jit * 0.5, false); }
      px = nx; py = ny; pz = nz;
    }
  };
  seg(x0, y0, z0, x1, y1, z1, 16, b.gx != null ? 0.35 : 0.6, b.gx != null ? 7 : 12, true);
  return out;
}
function sparkHurt(e) {
  const now = performance.now(); coreHurt('SPARK', e); try { console.error(e); } catch (x) { }
  SPARK.errT.push(now); while (SPARK.errT.length && now - SPARK.errT[0] > 10000) SPARK.errT.shift();
  if (SPARK.errT.length >= 5) { SPARK.errT.length = 0; SPARK.offUntil = now + 30000; sparkFree(); coreRepaired('SPARK', '3D effects: rested for 30 seconds after errors'); }
}
function sparkSelfTest() {
  let n = 0, pass = 0, why = ''; const t = (ok, w) => { n++; if (ok) pass++; else if (!why) why = w; };
  // colours come in sRGB from the game and go to the renderer as linear light
  SPARK.col.clear();
  const a = sparkCol('#ff0000'), b = sparkCol('rgba(255,255,255,0.5)'), c = sparkCol('#808080');
  t(a[0] === 1 && a[1] === 0 && b[3] === 0.5 && Math.abs(c[0] - Math.pow(128 / 255, 2.2)) < 1e-6, 'colours');
  // a tracer starts at the muzzle and climbs or drops straight to the height the crosshair found
  const st = { h0: 1.4, s: 0.1, x0: 0, y0: 0 }; t(Math.abs(sparkBulletH(st, { x: 10 * 32, y: 0 }, 32) - 2.4) < 1e-6, 'tracer heights');
  // the buffers take what fits and nothing more
  const B = { n: 0, cap: 1, A: new Float32Array(4), B: new Float32Array(4), C: new Float32Array(4) };
  sparkPut(B, 1, 2, 3, 0.5, 0, 0, 0, 1, 0.25, 1, 1, 1, 1); sparkPut(B, 1, 2, 3, 0.5, 0, 0, 0, 1, 0.25, 1, 1, 1, 1);
  t(B.n === 1 && B.A[1] === 2 && Math.abs(B.B[3] - 1.25) < 1e-6, 'the billboard buffer');
  return { ok: pass === n, n: n, pass: pass, why: why };
}
coreDefine({ name: 'SPARK', kind: 'render', ver: 1, does: 'The fight\'s effects in 3D: tracers from the 3D gun\'s muzzle to the point the crosshair found, the muzzle flash at the real muzzle, sparks, blood and smoke that fall or rise under gravity, the zombies\' glowing shots, fire, acid, ice, sludge and vortices on the ground, blood and scorch marks where they landed, shock rings, warning circles that fill before something lands, the zombies\' danger auras and charge lanes, brass and gun smoke, and medkits that spin over a glow — all from the game\'s own lists, in four draws.',
  provides: ['fx3d'], needs: ['DEPTH', 'FLESH', 'HOVER'],
  state: () => !SPARK.ok ? 'resting' : SPARK.n[0] + ' glowing · ' + SPARK.n[1] + ' dark · ' + SPARK.n[2] + ' on the ground · ' + SPARK.n[3] + ' medkits',
  check: () => SPARK.ok && SPARK.scene !== DEPTH.scene ? 'it was drawing into an old scene' : '',
  repair: () => { sparkFree(); },
  selfTest: sparkSelfTest,
  docs: { what: 'Tracers, flashes, particles, marks and pickups in the 3D view.', how: 'Reads the game\'s lists every frame into instanced billboards and ground marks (three.js shaders).' }
});
