/* ================= DEPTH: the city in three dimensions (1.9.999) =================
   Zombie City 2.0 is played in 3D now, from a camera hovering behind the survivor (HOVER, hover.js). DEPTH builds and
   lights the world that camera looks at; FLESH (flesh.js) puts the living and the dead in it. Nothing about the game
   itself changed: the simulation still runs on the ground plane (the same streets, walls, bullets and crowds on every
   device, so co-op stays in step) and DEPTH reads it every frame:
   - The ground of every block is the block's own painting (the road and its lines, the sidewalks, lots, grass, sand,
     snow, rivers and stains, painted by the city engine as before, only without the buildings and cars on it), laid on
     the ground and given relief, wear and wetness by a shader; the sidewalks stand a curb's height above the road.
   - Buildings stand at the heights the lighting engine always gave them (10 to 36 m downtown, 7 m houses, 4.5 m adobe):
     brick, concrete, stone, glass towers, siding, stucco, logs and barns, with floors and windows drawn by a shader
     (a storefront at street level downtown), lit windows at night where the city still has power, soot and dark
     windows where it burned, and roofs in their own colours.
   - Cars, trucks and buses at their real sizes, trees by kind and season, rocks, benches, kiosks, stalls, fences,
     planters, dumpsters, hydrants, traffic signals, bus stops, street lamps and fires, all from the block's own seed.
   - Light: the sun where the lighting engine puts it (east at dawn, south at noon, higher in summer), its shadows on
     everything; the sky (Rayleigh and Mie scattering) and its fog, overcast and darker in bad weather; at night the
     moon, the stars, the street lamps, the fires, headlights and muzzle flashes as real lights (the nearest and
     brightest of the lighting engine's own list) and the rest as glows on the ground.
   - The look: a filmic tone curve, bloom, a grade (shadows toward teal, highlights warm, a little desaturated: gritty,
     not grey), a vignette, fine grain and anti-aliasing; ambient occlusion on Ultra.
   It looks after itself like the other engines: five levels (resolution, shadow size, how far you see, how many real
   lights, bloom and occlusion), stepped down when frames run late and back up when there is room, and a lost graphics
   context hands the frame to the top-down view until it comes back. */
const DQ = [
  { name: 'Low', res: 0.55, shadow: 0, smap: 0, lights: 2, bloom: 0, ao: 0, far: 72, ring: 1, gpx: 0.5, trees: 0.5, grain: 0 },
  { name: 'Medium', res: 0.72, shadow: 1, smap: 1024, lights: 4, bloom: 1, ao: 0, far: 96, ring: 2, gpx: 0.75, trees: 0.8, grain: 1 },
  { name: 'High', res: 0.86, shadow: 1, smap: 2048, lights: 6, bloom: 1, ao: 0, far: 124, ring: 2, gpx: 1.05, trees: 1, grain: 1 },
  { name: 'Ultra', res: 1, shadow: 2, smap: 2048, lights: 8, bloom: 1, ao: 1, far: 150, ring: 3, gpx: 1.35, trees: 1, grain: 1 }
];
const DEPTH = {
  on: false, ok: false, tried: false, why: '', R: null, cv: null, scene: null, cam: null, comp: null, pass: {}, lvl: 2, lvlSet: -1, adapt: 0, good: 0,
  ox: 0, oy: 0, upm: 32, chunks: new Map(), queue: [], lights: [], spot: null, sun: null, hemi: null, sky: null, stars: null, moon: null,
  env: null, envT: -99, envDay: -1, pmrem: null, mats: {}, geo: {}, tex: {}, ms: 0, msAvg: 0, frames: 0, errT: [], offUntil: 0, lost: false,
  built: 0, buildMs: 0, dyn: null, t: 0, calls: 0, tris: 0, scale: 1, lastW: 0, lastH: 0, lastPR: 0, fogFar: 120, dayK: 1, night: 0, wet: 0, tests: null
};
// metres per world unit: 32 units are a metre at the real world scale (fewer at the classic scale)
function dUPM() { return 32 * SCL / SCALE_REAL; }
const dX = x => (x - DEPTH.ox) / DEPTH.upm, dZ = y => (y - DEPTH.oy) / DEPTH.upm;
// can this device draw the 3D view at all? (WebGL 2 and a float-capable framebuffer for the post chain)
function depthCan() {
  if (DEPTH.can != null) return DEPTH.can;
  if (typeof THREE === 'undefined') { DEPTH.why = 'the 3D library did not load'; return DEPTH.can = false; }
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2');
    if (!gl) { DEPTH.why = 'WebGL 2 is not available on this device'; return DEPTH.can = false; }
    const ext = gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float');
    DEPTH.halfOk = !!ext; const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
  } catch (e) { DEPTH.why = 'WebGL 2 failed to start'; return DEPTH.can = false; }
  return DEPTH.can = true;
}
// is the run drawn in 3D right now?
function depthOn() { return DEPTH.on && DEPTH.ok && !DEPTH.lost && !(DEPTH.offUntil && performance.now() < DEPTH.offUntil); }
function depthWanted() { return (SET.view || '3d') === '3d' && depthCan() && !(DEPTH.offUntil && performance.now() < DEPTH.offUntil); }
// the level: chosen in settings, or the device's tier, trimmed by what the engine measures
function depthLevelNow() {
  const s = SET.q3d || 'auto';
  if (s !== 'auto') return clamp(+s, 0, 3);
  const tier = typeof Q !== 'undefined' && Q.tier != null ? Q.tier : (PERF.tier || 2);
  let base = tier >= 3 ? 3 : tier >= 2 ? 2 : tier >= 1 ? 1 : 0;
  if (TOUCH && base > 2) base = 2;   // (a phone runs hot at Ultra)
  return clamp(base + DEPTH.adapt, 0, 3);
}

/* ---------- starting and stopping ---------- */
function depthInit() {
  if (DEPTH.ok) return true;
  if (DEPTH.tried && !DEPTH.ok && performance.now() < (DEPTH.retryAt || 0)) return false;
  DEPTH.tried = true;
  if (!depthCan()) return false;
  const t0 = performance.now();
  try {
    const c = document.createElement('canvas'); c.id = 'cv3'; c.className = 'cv3'; c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
    cv.parentNode.insertBefore(c, cv);
    const R = new THREE.WebGLRenderer({ canvas: c, antialias: false, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1;
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.shadowMap.autoUpdate = true;
    R.info.autoReset = false;
    DEPTH.R = R; DEPTH.cv = c;
    if (typeof surfBake === 'function') surfBake(R, true);   // (1.9.9991: SURFACE's HD materials, begun here and finished over the next frames)
    c.addEventListener('webglcontextlost', e => { e.preventDefault(); DEPTH.lost = true; coreHurt('DEPTH', 'GPU context lost'); coreRepaired('DEPTH', '3D: the graphics chip reset, the top-down view covers until it is back'); }, false);
    c.addEventListener('webglcontextrestored', () => { DEPTH.lost = false; depthFree(true); coreRepaired('DEPTH', '3D: rebuilt after the graphics chip came back'); }, false);
    const S = new THREE.Scene(); DEPTH.scene = S;
    DEPTH.cam = new THREE.PerspectiveCamera(68, 16 / 9, 0.08, 400);
    DEPTH.cam.rotation.order = 'YXZ';
    depthMats();
    depthSkyBuild();
    depthLightsBuild();
    depthPostBuild();
    DEPTH.pmrem = new THREE.PMREMGenerator(R);
    DEPTH.ok = true; DEPTH.why = '';
    depthResize(true);
    coreLog('DEPTH started in ' + Math.round(performance.now() - t0) + ' ms');
  } catch (e) {
    try { console.error(e); } catch (x) { }
    DEPTH.why = 'the 3D view would not start (' + String(e && e.message || e).slice(0, 60) + ')'; coreHurt('DEPTH', e);
    depthFree(); DEPTH.retryAt = performance.now() + 30000; return false;
  }
  return true;
}
// everything handed back to the graphics chip (soft: the canvas and the renderer stay, the scene is rebuilt)
function depthFree(soft) {
  try {
    if (typeof surfFree === 'function') surfFree();
    if (typeof facadeFree === 'function') facadeFree();
    if (typeof floraFree === 'function') floraFree();
    if (typeof faunaFree === 'function') faunaFree();
    if (typeof nimbusFree === 'function') nimbusFree();
    if (typeof driftFree === 'function') driftFree();
    for (const k of DEPTH.chunks.keys()) depthChunkDrop(k);
    DEPTH.chunks.clear(); DEPTH.queue.length = 0;
    if (typeof fleshFree === 'function') fleshFree();
    if (typeof sparkFree === 'function') sparkFree();
    const S = DEPTH.scene;
    if (S) S.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; for (const q of m) q.dispose(); } });
    for (const k in DEPTH.tex) { try { DEPTH.tex[k].dispose(); } catch (x) { } } DEPTH.tex = {};
    for (const k in DEPTH.mats) { try { DEPTH.mats[k].dispose(); } catch (x) { } } DEPTH.mats = {};
    if (DEPTH.env) { DEPTH.env.dispose(); DEPTH.env = null; }
    if (DEPTH.comp) { try { DEPTH.comp.dispose(); } catch (x) { } DEPTH.comp = null; }
    if (DEPTH.pmrem) { DEPTH.pmrem.dispose(); DEPTH.pmrem = null; }
    if (!soft) {
      if (DEPTH.R) { DEPTH.R.dispose(); DEPTH.R = null; }
      if (DEPTH.cv && DEPTH.cv.parentNode) DEPTH.cv.parentNode.removeChild(DEPTH.cv); DEPTH.cv = null;
    }
  } catch (e) { coreHurt('DEPTH', e); }
  DEPTH.scene = null; DEPTH.ok = false; DEPTH.lvlSet = -1; DEPTH.envDay = -1; DEPTH.wx = null; DEPTH.life = null; DEPTH.jets = null; DEPTH.dyn = null;
  if (soft && DEPTH.R) { DEPTH.tried = false; depthInit(); }
}
// the 3D view on or off (Settings > Graphics > View, the governor's fallback, a lost context)
function depthSetView(v) {
  if (v === '3d' && depthWanted()) { DEPTH.on = true; if (!DEPTH.ok) depthInit(); }
  else { DEPTH.on = false; if (DEPTH.cv) DEPTH.cv.style.display = 'none'; }
  if (DEPTH.on && DEPTH.cv) DEPTH.cv.style.display = 'block';
  if (typeof hoverViewChanged === 'function') hoverViewChanged();
  for (const c of chunks.values()) c.stale = 1;   // (the top-down art is repainted when it comes back)
}
function depthResize(force) {
  if (!DEPTH.ok) return;
  const q = DQ[DEPTH.lvl] || DQ[2], dpr = Math.min(window.devicePixelRatio || 1, TOUCH ? 2 : 2.5);
  const pr = Math.max(0.35, dpr * q.res * DEPTH.scale);
  if (!force && W === DEPTH.lastW && H === DEPTH.lastH && Math.abs(pr - DEPTH.lastPR) < 0.01) return;
  DEPTH.lastW = W; DEPTH.lastH = H; DEPTH.lastPR = pr;
  DEPTH.R.setPixelRatio(pr); DEPTH.R.setSize(W, H, false);
  DEPTH.cam.aspect = W / Math.max(1, H); DEPTH.cam.updateProjectionMatrix();
  if (DEPTH.comp) { DEPTH.comp.setPixelRatio(pr); DEPTH.comp.setSize(W, H); }
  const P = DEPTH.pass; if (P.fxaa) P.fxaa.uniforms.resolution.value.set(1 / (W * pr), 1 / (H * pr));
  if (P.grade) P.grade.uniforms.uRes.value.set(W * pr, H * pr);
}

/* ---------- materials ---------- */
// sRGB hex to the renderer's linear colour
const D_COL = typeof THREE !== 'undefined' ? new THREE.Color() : null;
function dLin(hex, out, k) { D_COL.set(hex); out = out || [0, 0, 0]; const m = k == null ? 1 : k; out[0] = D_COL.r * m; out[1] = D_COL.g * m; out[2] = D_COL.b * m; return out; }
// a small shared noise texture (tileable value noise in four channels) the shaders read for wear, grime and relief
function depthNoiseTex() {
  if (DEPTH.tex.noise) return DEPTH.tex.noise;
  const N = 128, d = new Uint8Array(N * N * 4), R = Z.mulberry32(0x5eed3d);
  const lat = (n) => { const a = new Float32Array(n * n); for (let i = 0; i < a.length; i++) a[i] = R(); return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const g = (i, j) => a[((j % n + n) % n) * n + ((i % n + n) % n)]; return g(xi, yi) * (1 - u) * (1 - v) + g(xi + 1, yi) * u * (1 - v) + g(xi, yi + 1) * (1 - u) * v + g(xi + 1, yi + 1) * u * v; }; };
  const o = [lat(8), lat(16), lat(32), lat(64)];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const k = (y * N + x) * 4;
    for (let c = 0; c < 4; c++) { const L = o[c], s = [8, 16, 32, 64][c] / N; let v = L(x * s, y * s) * 0.6 + o[(c + 1) % 4](x * s * 2, y * s * 2) * 0.4; d[k + c] = Math.round(clamp(v, 0, 1) * 255); }
  }
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return DEPTH.tex.noise = t;
}
// global uniforms every DEPTH shader shares (time, night, wetness, snow cover, the noise)
const DU = { uTime: { value: 0 }, uNight: { value: 0 }, uWet: { value: 0 }, uSnow: { value: 0 }, uNoise: { value: null }, uDust: { value: 0 } };
// (1.9.9991) where the HD materials' tiles start: the world's origin moves with the player in steps of four blocks, so each
// material's repeat is offset by that origin, modulo its tile, and the patterns stay nailed to the world
const DU_GQ = { value: 1 };
const D_NL = typeof SURF_N !== 'undefined' ? SURF_N : 17;
const DU_OFF = { value: typeof THREE !== 'undefined' ? Array.from({ length: D_NL }, () => new THREE.Vector2()) : [] };
const D_TILES = 'const float dTile[' + D_NL + '] = float[' + D_NL + '](' + (typeof SURF_TILE !== 'undefined' ? SURF_TILE : [1.8, 3, 1.8, 1.8, 2, 1.68, 1.6, 4, 3, 2, 2, 1.5, 1.5, 2, 3, 1, 1.2]).map(v => v.toFixed(3)).join(', ') + ');\nuniform vec2 uOff[' + D_NL + '];\n';
function depthTileOffsets() {
  const U = DEPTH.upm || dUPM(), ox = DEPTH.ox / U, oy = DEPTH.oy / U, T = typeof SURF_TILE !== 'undefined' ? SURF_TILE : null; if (!T) return;
  for (let i = 0; i < D_NL; i++) { const t = T[i]; DU_OFF.value[i].set(((ox % t) + t) % t, ((oy % t) + t) % t); }
}
const D_GLSL_COMMON = `
uniform float uTime, uNight, uWet, uSnow, uDust; uniform sampler2D uNoise;
float dH12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float dN(vec2 p) { return texture2D(uNoise, p).r; }
float dFbm(vec2 p) { vec4 a = texture2D(uNoise, p), b = texture2D(uNoise, p * 4.1 + 0.37); return a.r * 0.5 + a.g * 0.25 + b.b * 0.15 + b.a * 0.1; }
`;
// patch a standard material: extra varyings from the vertex shader, extra work in the fragment shader
function dPatch(mat, o) {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, DU, o.uniforms || {});
    sh.vertexShader = 'uniform float uTime, uNight, uWet, uSnow;\n' + (o.vHead || '') + sh.vertexShader;
    if (o.vMain) sh.vertexShader = sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + o.vMain);
    if (o.vBegin) sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + o.vBegin);
    sh.fragmentShader = D_GLSL_COMMON + (o.fHead || '') + sh.fragmentShader;
    if (o.fColor) sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + o.fColor);
    if (o.fRough) sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + o.fRough);
    if (o.fMetal) sh.fragmentShader = sh.fragmentShader.replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n' + o.fMetal);
    if (o.fNormal) sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + o.fNormal);
    if (o.fEmis) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + o.fEmis);
    mat._sh = sh;   // (not in userData: a material clone copies userData through JSON)
  };
  mat.customProgramCacheKey = () => o.key;
  return mat;
}
function depthMats() {
  DU.uNoise.value = depthNoiseTex();
  const M = DEPTH.mats;
  // the ground: the block's painting, with relief and wear from noise, darker and glossier when it is wet (puddles in the
  // low spots shine), and snow settling on it in the north and in winter
  // the ground: the block's painting, with SURFACE's HD detail by what the painting shows there (asphalt on the roads,
  // slabs on the sidewalks and lots, grass, soil and sand by their colour: the two strongest blended), darker and
  // glossier when it is wet (puddles in the low spots shine), and snow settling on it in the north and in winter
  M.ground = dPatch(new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, envMapIntensity: 0.6 }), {
    key: 'ground5', uniforms: surfUniforms({ uOff: DU_OFF, uGQ: DU_GQ }),
    vHead: 'varying vec3 vWp;\n', vMain: 'vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    fHead: SURF_GLSL + D_TILES + 'varying vec3 vWp; float dPud, dGR; vec4 dGN; uniform sampler2D uWMask; uniform float uHasW, uGQ;\n',
    fColor: `
      // a river or a pond: the ground is cut away where the water is (the water lies lower, with banks round it)
      if (uHasW > 0.5) { vec2 wu = vec2(vMapUv.x, 1.0 - vMapUv.y) * (80.0 / 81.0) + 0.5 / 81.0; if (texture2D(uWMask, wu).r < 0.5) discard; }
      dGR = 0.92; dGN = vec4(0.0, 0.0, 1.0, 1.0);
      if (uSOn > 0.5) {
        vec3 pc = diffuseColor.rgb; float mx = max(pc.r, max(pc.g, pc.b)), mn = min(pc.r, min(pc.g, pc.b)), lum = dot(pc, vec3(0.2126, 0.7152, 0.0722)), sa = (mx - mn) / max(mx, 1e-3);
        float wGr = smoothstep(0.03, 0.12, (pc.g - max(pc.r, pc.b)) / max(mx, 1e-3));
        float warm = smoothstep(0.1, 0.22, sa) * step(pc.b, pc.g) * (1.0 - wGr);
        float wSa = warm * smoothstep(0.1, 0.2, lum), wDi = warm - wSa, grey = (1.0 - wGr) * (1.0 - warm);
        float wAs = grey * (1.0 - smoothstep(0.03, 0.065, lum)), wPa = grey - wAs;
        float W5[5] = float[5](wAs, wPa, wGr, wDi, wSa); float L5[5] = float[5](7.0, 8.0, 9.0, 10.0, 14.0);
        int i1 = 0; for (int i = 1; i < 5; i++) if (W5[i] > W5[i1]) i1 = i;
        int i2 = i1 == 0 ? 1 : 0; for (int i = 0; i < 5; i++) if (i != i1 && W5[i] > W5[i2]) i2 = i;
        float l1 = L5[i1], w1 = W5[i1], l2 = L5[i2], w2 = W5[i2];
        vec2 u1 = (vWp.xz + uOff[int(l1)]) / dTile[int(l1)]; vec4 a = sA(u1, l1); dGN = sN(u1, l1);
        if (uGQ > 0.5 && w2 > 0.03) { vec2 u2 = (vWp.xz + uOff[int(l2)]) / dTile[int(l2)]; float k = w2 / max(1e-3, w1 + w2); a = mix(a, sA(u2, l2), k); dGN = mix(dGN, sN(u2, l2), k); }
        diffuseColor.rgb = pc * (1.0 + 0.6 * wAs) * a.rgb * 2.1 * mix(1.0, dGN.z, 0.7); dGR = a.a;   // (old asphalt is greyer than the map paints it)
      }
      { float n1 = dFbm(vWp.xz * 0.045); float n2 = dN(vWp.xz * 0.6);
        diffuseColor.rgb *= 0.86 + 0.24 * n1 + 0.06 * (n2 - 0.5);
        dPud = smoothstep(0.62 - uWet * 0.22, 0.7 - uWet * 0.2, dFbm(vWp.xz * 0.11 + 3.3)) * uWet;
        diffuseColor.rgb *= 1.0 - uWet * 0.38 - dPud * 0.25;
        float sn = uSnow * smoothstep(0.3, 0.7, dFbm(vWp.xz * 0.07 + 7.1) + uSnow * 0.5);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.9, 0.95), sn * 0.85); dGN.xy *= 1.0 - sn; }`,
    fRough: 'roughnessFactor = dGR; roughnessFactor = mix(roughnessFactor, 0.32, uWet * 0.7); roughnessFactor = mix(roughnessFactor, 0.04, dPud);',
    fNormal: '{ vec2 b = dGN.xy * (1.0 - dPud) * 1.15; if (uSOn < 0.5) { vec2 q = vWp.xz * 1.9; float hC = dN(q), hX = dN(q + vec2(0.02, 0.0)), hZ = dN(q + vec2(0.0, 0.02)); b = vec2(hC - hX, hC - hZ) * 2.4 * (1.0 - dPud); } normal = normalize((viewMatrix * vec4(normalize(vec3(b.x, 1.0, b.y)), 0.0)).xyz); }'
  });
  // the buildings (1.9.9991): SURFACE's HD materials (brick, concrete panels, stone, siding, stucco, logs, planks; gravel on
  // the flat roofs) under the building's own paint, floors and windows by the shader, the windows set back in the wall
  // (the reveal shows on the side away from you: the jambs, the dark soffit, the sill catching the sky), a stone sill
  // under each and a lintel over it on masonry, frames and mullions at the glass, the room behind it (interior mapping),
  // storefronts at street level, lit at night where the city has power, soot where it burned.
  // aS = style, seed, lit share, roof flag; aF = metres along the wall, metres up
  M.facade = dPatch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, envMapIntensity: 0.8 }), {
    key: 'facade5', uniforms: surfUniforms({ uOff: DU_OFF }),
    vHead: 'attribute vec4 aS; attribute vec2 aF; varying vec4 vS; varying vec2 vF; varying vec3 vWp2; varying vec3 vWN;\n',
    vMain: 'vS = aS; vF = aF; vWp2 = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);',
    fHead: SURF_GLSL + D_TILES + `varying vec4 vS; varying vec2 vF; varying vec3 vWp2; varying vec3 vWN; float dWin, dLit, dFrame, dRoomK, dTR, dRev, dSill; vec3 dLitC, dNrev; vec4 dTN;
      vec2 dCellOf(float st, out vec2 f, out vec2 sz) {
        float fh = st < 0.5 ? 3.3 : st < 1.5 ? 3.5 : st < 2.5 ? 3.9 : st < 3.5 ? 3.6 : st < 5.5 ? 3.0 : 3.2;
        float ws = st < 0.5 ? 2.6 : st < 1.5 ? 3.1 : st < 2.5 ? 1.6 : st < 3.5 ? 2.9 : st < 4.5 ? 3.4 : 3.8;
        sz = vec2(ws, fh); vec2 g = vF / sz; f = fract(g); return floor(g); }
      float dLayerOf(float st, float seed) { return st < 0.5 ? 0.0 : st < 1.5 ? 1.0 : st < 2.5 ? 15.0 : st < 3.5 ? 2.0 : st < 4.5 ? 3.0 : st < 5.5 ? 4.0 : st < 6.5 ? 5.0 : st < 7.5 ? 6.0 : (fract(seed * 7.13) < 0.5 ? 1.0 : 0.0); }
      `,
    fColor: `
      dWin = 0.0; dLit = 0.0; dFrame = 0.0; dLitC = vec3(0.0); dRoomK = 1.0; dTR = 0.85; dRev = 0.0; dSill = 0.0; dNrev = vec3(0.0, 1.0, 0.0); dTN = vec4(0.0, 0.0, 1.0, 1.0);
      { float st = vS.x, seed = vS.y, litK = vS.z, roof = vS.w; vec3 paint = diffuseColor.rgb;
        float grime = dFbm(vec2(vF.x * 0.13 + seed * 17.0, vF.y * 0.035));
        if (roof > 0.5) {
          if (uSOn > 0.5) { vec2 ru = (vWp2.xz + uOff[11]) / dTile[11]; vec4 ta = sA(ru, 11.0); dTN = sN(ru, 11.0); diffuseColor.rgb = paint * ta.rgb * 2.0 * mix(1.0, dTN.z, 0.7); dTR = ta.a; }
          else { float g1 = dN(vWp2.xz * 1.7), g2 = dN(vWp2.xz * 7.0 + 0.3); diffuseColor.rgb *= 0.78 + 0.28 * g1 + 0.1 * g2; }
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.91, 0.95), uSnow * 0.9);
        } else {
          vec2 f, sz; vec2 cell = dCellOf(st, f, sz);
          float L = dLayerOf(st, seed);
          vec3 wallAlb = paint;
          if (uSOn > 0.5) { vec2 wu = vF / dTile[int(L)]; vec4 ta = sA(wu, L); dTN = sN(wu, L); wallAlb = mix(ta.rgb, paint * ta.rgb * 2.0, dTN.w);
            if (st > 1.5 && st < 2.5) { wallAlb = paint * (0.8 + 0.5 * ta.g); dTN.xy *= 0.3; }   // (a curtain wall's spandrels: painted metal panels, no rust)
            diffuseColor.rgb = wallAlb * mix(1.0, dTN.z, 0.85); dTR = ta.a; }
          else if (st < 0.5) { vec2 b = vec2(vF.x / 0.24 + mod(floor(vF.y / 0.075), 2.0) * 0.5, vF.y / 0.075); vec2 bf = fract(b); float mortar = step(bf.x, 0.06) + step(bf.y, 0.14); diffuseColor.rgb *= (0.86 + 0.24 * dH12(floor(b) + seed * 31.0)) * (1.0 - 0.22 * clamp(mortar, 0.0, 1.0)); }
          // grime: streaks running down from the sills and the roof, darker toward the street
          diffuseColor.rgb *= 0.8 + 0.3 * grime;
          diffuseColor.rgb *= 0.72 + 0.28 * smoothstep(0.0, 2.2, vF.y);
          // windows (none on barns, few on adobe); downtown the street level is a storefront
          float shop = (st < 3.5 && cell.y < 0.5 && litK > 0.0) ? 1.0 : 0.0;
          vec2 wlo = st > 1.5 && st < 2.5 ? vec2(0.06, 0.08) : st > 4.5 && st < 5.5 ? vec2(0.36, 0.3) : vec2(0.2, 0.26);
          vec2 whi = st > 1.5 && st < 2.5 ? vec2(0.94, 0.94) : st > 4.5 && st < 5.5 ? vec2(0.64, 0.75) : vec2(0.8, 0.84);
          if (shop > 0.5) { wlo = vec2(0.05, 0.12); whi = vec2(0.95, 0.82); }
          vec2 aw = fwidth(vF / sz) * 1.5;
          vec2 a = smoothstep(wlo - aw, wlo + aw, f) * (1.0 - smoothstep(whi - aw, whi + aw, f));
          float w = a.x * a.y * (st > 6.5 && st < 7.5 ? 0.0 : 1.0);
          float far = clamp(max(aw.x, aw.y) * 3.0 - 0.4, 0.0, 1.0);
          // a stone sill under the window and a lintel over it (on brick, concrete, stone and the ruins); on brick the
          // lintel is a soldier course, bricks stood on end
          float trimOk = (st < 1.5 || (st > 2.5 && st < 3.5) || st > 7.5) && shop < 0.5 ? 1.0 - far : 0.0;
          float sx = step(wlo.x - 0.05 / sz.x, f.x) * step(f.x, whi.x + 0.05 / sz.x), lx = step(wlo.x - 0.07 / sz.x, f.x) * step(f.x, whi.x + 0.07 / sz.x);
          float sill = trimOk * sx * step(wlo.y - 0.075 / sz.y, f.y) * step(f.y, wlo.y);
          float lint = trimOk * lx * step(whi.y, f.y) * step(f.y, whi.y + 0.17 / sz.y);
          vec3 stoneC = vec3(0.56, 0.54, 0.5) * (0.85 + 0.25 * dN(vF * 3.1));
          if (st < 0.5 && lint > 0.5) { float k = floor(vF.x / 0.075); diffuseColor.rgb = mix(paint * 1.5 * (0.75 + 0.35 * dH12(vec2(k, seed * 9.0))), vec3(0.5, 0.48, 0.45), step(0.86, fract(vF.x / 0.075))); }
          else diffuseColor.rgb = mix(diffuseColor.rgb, stoneC, lint * 0.9);
          diffuseColor.rgb = mix(diffuseColor.rgb, stoneC * 1.08, sill); dSill = sill;
          // far away the pattern averages out instead of shimmering
          w = mix(w, 0.32, far);
          dWin = w;
          vec3 glass = mix(vec3(0.05, 0.06, 0.07), vec3(0.14, 0.17, 0.2), dH12(cell + seed * 5.0));
          if (st < 0.5 || st > 7.5) glass *= 0.8;
          vec3 winC = glass;
          if (w > 0.01 && far < 0.98) {
            vec3 nW = normalize(vWN), tW = normalize(cross(vec3(0.0, 1.0, 0.0), nW) + vec3(1e-5)), V = normalize(vWp2 - cameraPosition);
            vec3 vt = vec3(dot(V, tW), V.y, -dot(V, nW));
            vec2 rs = sz * (whi - wlo), p0 = clamp((f - wlo) / (whi - wlo), 0.0, 1.0) * rs;
            // the window is set back in the wall: the ray may meet a jamb, the soffit or the sill before it meets the glass
            float Dr = (st > 1.5 && st < 2.5) ? 0.035 : ((st > 3.5 && st < 4.5) || (st > 5.5 && st < 7.5)) ? 0.07 : 0.17; if (shop > 0.5) Dr = 0.12;
            vec2 q = p0 + vt.xy / max(vt.z, 0.05) * Dr;
            if (q.x < 0.0 || q.x > rs.x || q.y < 0.0 || q.y > rs.y) {
              float tx = vt.x > 0.0 ? (rs.x - p0.x) / max(vt.x, 1e-4) : p0.x / max(-vt.x, 1e-4), ty = vt.y > 0.0 ? (rs.y - p0.y) / max(vt.y, 1e-4) : p0.y / max(-vt.y, 1e-4);
              bool side = tx < ty;
              float sh = side ? 0.6 : (vt.y > 0.0 ? 0.4 : 0.9);
              winC = (side || vt.y > 0.0 || trimOk < 0.5 ? wallAlb : stoneC) * sh;
              dRev = 1.0 - far; dNrev = side ? (vt.x > 0.0 ? -tW : tW) : (vt.y > 0.0 ? vec3(0.0, -1.0, 0.0) : vec3(0.0, 1.0, 0.0));
            } else {
              p0 = q;
              float tx = vt.x > 0.0 ? (rs.x - p0.x) / max(vt.x, 1e-4) : p0.x / max(-vt.x, 1e-4);
              float ty = vt.y > 0.0 ? (rs.y - p0.y) / max(vt.y, 1e-4) : p0.y / max(-vt.y, 1e-4);
              float RD = shop > 0.5 ? 5.0 : 3.2;
              float tz = RD / max(vt.z, 1e-3), tt = min(min(tx, ty), tz), dz = clamp(vt.z * tt / RD, 0.0, 1.0);
              float rh = dH12(cell * 1.31 + seed * 17.0);
              vec3 wallC = mix(vec3(0.46, 0.41, 0.34), vec3(0.32, 0.35, 0.38), step(0.5, rh)) * (0.65 + 0.5 * dH12(cell + 3.7));
              vec3 ic = tt == tz ? wallC : tt == ty ? (vt.y > 0.0 ? vec3(0.5, 0.5, 0.47) : vec3(0.16, 0.12, 0.09)) : wallC * 0.72;
              if (tt == tz && shop < 0.5) ic *= 0.8 + 0.4 * step(0.55, fract((p0.x + vt.x * tt) / max(rs.x, 0.1) * 2.0 + rh));   // a door or a picture on the far wall
              if (shop > 0.5 && tt != ty) { float sh2 = step(0.3, fract((p0.y + vt.y * tt) / 0.55)) * step(0.15, fract((p0.x + vt.x * tt) / 1.3)); ic = mix(ic, vec3(0.3, 0.26, 0.2) * (0.6 + 0.8 * dH12(floor(vec2(p0.x + vt.x * tt, p0.y + vt.y * tt) / vec2(0.25, 0.55)) + seed)), sh2 * 0.8); }   // shelves of stock
              dRoomK = 1.0 - 0.6 * dz; ic *= dRoomK;
              float bl = step(0.62, dH12(cell * 2.9 + seed)) * step(1.0 - (0.25 + 0.6 * dH12(cell * 5.1 + seed)), p0.y / rs.y) * (1.0 - shop);
              ic = mix(ic, vec3(0.5, 0.47, 0.4) * (0.8 + 0.2 * sin(vF.y * 60.0)), bl); dRoomK = mix(dRoomK, 0.9, bl);
              winC = mix(glass, ic * 0.24 * (1.0 - 0.75 * uNight), (1.0 - far) * (st > 7.5 ? 0.5 : st > 1.5 && st < 2.5 ? 0.35 : 0.9));
              // the frame at the glass and a mullion (a transom on the wider ones)
              float fw = 0.045, e = min(min(p0.x, rs.x - p0.x), min(p0.y, rs.y - p0.y));
              float mull = (rs.x > 1.1 && st > 2.5 || st < 1.5) ? 1.0 - smoothstep(0.018, 0.03, abs(p0.x - rs.x * 0.5)) : 0.0;
              float tran = shop < 0.5 && rs.y > 1.4 ? 1.0 - smoothstep(0.018, 0.03, abs(p0.y - rs.y * 0.72)) : 0.0;
              dFrame = max(1.0 - smoothstep(fw * 0.7, fw, e), max(mull, tran)) * (1.0 - far) * (st > 1.5 && st < 2.5 ? 0.6 : 1.0);
              vec3 frC = dH12(vec2(seed * 13.0, 2.0)) < 0.5 ? vec3(0.62, 0.6, 0.56) : vec3(0.05, 0.05, 0.055);
              winC = mix(winC, frC, dFrame);
            }
          }
          diffuseColor.rgb = mix(diffuseColor.rgb, winC, w);
          // lit at night: warm rooms, cold screens, a few that flicker; a burnt or ruined building has none
          float h = dH12(cell * 1.7 + seed * 91.0), on = step(h, litK) * uNight;
          float fl = step(0.985, dH12(cell + floor(uTime * 7.0))) * step(0.9, dH12(cell * 3.1 + seed));
          dLitC = mix(vec3(1.0, 0.72, 0.42), vec3(0.62, 0.78, 1.0), step(0.75, dH12(cell * 2.3 + seed)));
          if (shop > 0.5) dLitC = vec3(1.0, 0.86, 0.66);
          dLit = on * w * (1.0 - dRev) * (1.0 - dFrame) * (1.0 - fl) * (0.55 + 0.6 * dH12(cell * 4.3 + seed));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.9, 0.95), uSnow * 0.25 * step(0.85, fract(vF.y / sz.y)) * (1.0 - w));
          if (st > 7.5) diffuseColor.rgb *= 0.55 + 0.45 * smoothstep(0.0, 9.0, vF.y) * grime;   // soot
          dWin = w * (1.0 - dRev) * (1.0 - dFrame);
        }
        diffuseColor.rgb *= 1.0 - uWet * 0.18 * (1.0 - dWin);
      }`,
    fRough: 'roughnessFactor = mix(dTR, 0.06, dWin); roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.6, uWet);',
    fMetal: 'metalnessFactor = mix(metalnessFactor, 0.2, dWin * 0.6);',
    fNormal: `{ vec3 nW = normalize(vWN), Nw;
      if (vS.w > 0.5) Nw = normalize(vec3(dTN.x, 1.0, dTN.y));
      else { vec3 tW = normalize(cross(vec3(0.0, 1.0, 0.0), nW) + vec3(1e-5)); float k = 1.0 - dWin; Nw = normalize(nW + (tW * dTN.x + vec3(0.0, 1.0, 0.0) * dTN.y) * k);
        if (dSill > 0.5) Nw = normalize(nW * 0.6 + vec3(0.0, 1.0, 0.0));
        Nw = normalize(mix(Nw, dNrev, dRev)); }
      normal = normalize((viewMatrix * vec4(Nw, 0.0)).xyz); }`,
    fEmis: 'totalEmissiveRadiance += dLitC * dLit * 2.4 * (0.35 + 0.75 * dRoomK);'
  });
  // the things in the street (colour by vertex): with a SURFACE material where the builder named one (aS.x: its layer + 1,
  // projected along the face's main axis: concrete curbs and barriers, painted metal poles and boxes, planks, shingled and
  // tin roofs), a little wear from the noise everywhere
  M.thing = dPatch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.05, envMapIntensity: 0.7 }), {
    key: 'thing3', uniforms: surfUniforms({ uOff: DU_OFF }),
    vHead: 'attribute vec4 aS; varying vec4 vS3; varying vec3 vWp3; varying vec3 vWN3;\n', vMain: 'vS3 = aS; vWp3 = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN3 = normalize(mat3(modelMatrix) * objectNormal);',
    fHead: SURF_GLSL + D_TILES + 'varying vec4 vS3; varying vec3 vWp3; varying vec3 vWN3; float dTR3; vec4 dTN3; vec3 dT3, dB3;\n',
    fColor: `{ dTR3 = -1.0; float n = dFbm(vWp3.xz * 0.5 + vWp3.y * 0.3);
      if (vS3.x > 0.5 && uSOn > 0.5) { float L = floor(vS3.x - 0.5); int li = int(L + 0.5); vec3 an = abs(vWN3); vec2 uv;
        if (an.y >= an.x && an.y >= an.z) { uv = vWp3.xz + uOff[li]; dT3 = vec3(1.0, 0.0, 0.0); dB3 = vec3(0.0, 0.0, 1.0); }
        else if (an.x >= an.z) { uv = vec2(vWp3.z + uOff[li].y, vWp3.y); dT3 = vec3(0.0, 0.0, 1.0); dB3 = vec3(0.0, 1.0, 0.0); }
        else { uv = vec2(vWp3.x + uOff[li].x, vWp3.y); dT3 = vec3(1.0, 0.0, 0.0); dB3 = vec3(0.0, 1.0, 0.0); }
        uv /= dTile[li]; vec4 ta = sA(uv, L); dTN3 = sN(uv, L);
        diffuseColor.rgb = mix(ta.rgb, diffuseColor.rgb * ta.rgb * 2.0, dTN3.w) * mix(1.0, dTN3.z, 0.75); dTR3 = ta.a; n = 0.55 + 0.45 * n; }
      diffuseColor.rgb *= 0.8 + 0.35 * n; diffuseColor.rgb *= 1.0 - uWet * 0.2; }`,
    fRough: 'if (dTR3 >= 0.0) roughnessFactor = dTR3; roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.55, uWet);',
    fNormal: 'if (dTR3 >= 0.0) { vec3 N = normalize(vWN3); vec3 Nw = normalize(N + (dT3 * dTN3.x + dB3 * dTN3.y)); normal = normalize((viewMatrix * vec4(Nw, 0.0)).xyz); }'
  });
  // car paint: glossy, with the city's dust on it
  M.paint = dPatch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.35, envMapIntensity: 1.1 }), {
    key: 'paint2', vHead: 'varying vec3 vWp4;\n', vMain: 'vWp4 = (modelMatrix * vec4(transformed, 1.0)).xyz;', fHead: 'varying vec3 vWp4; float dDust;\n',
    fColor: '{ dDust = smoothstep(0.45, 0.85, dFbm(vWp4.xz * 2.6 + vWp4.y * 1.7)) * (0.25 + 0.35 * smoothstep(0.9, 0.2, vWp4.y - floor(vWp4.y / 3.0) * 3.0)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.3, 0.27, 0.23), dDust * 0.45); }',
    fRough: 'roughnessFactor = mix(roughnessFactor, 0.85, dDust * 0.6); roughnessFactor = mix(roughnessFactor, 0.12, uWet * 0.5);'
  });
  M.glass = new THREE.MeshStandardMaterial({ color: 0x0b0e12, roughness: 0.05, metalness: 0.6, envMapIntensity: 1.4 });
  // water: dark and deep in the middle, a moving surface (two drifts of ripples, choppier in rain) that mirrors the sky
  M.water = dPatch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.1, metalness: 0.0, envMapIntensity: 0.9 }), {
    key: 'water1', vHead: 'varying vec3 vWp6;\n', vMain: 'vWp6 = (modelMatrix * vec4(transformed, 1.0)).xyz;', fHead: 'varying vec3 vWp6;\n',
    fNormal: '{ vec2 q = vWp6.xz; float e = 0.04; vec2 a = q * 0.32 + uTime * vec2(0.035, 0.02), b = q * 0.9 - uTime * vec2(0.02, 0.055), c2 = q * 2.6 + uTime * vec2(0.09, -0.07);' +
      ' float h0 = dN(a) + 0.5 * dN(b) + 0.25 * uWet * dN(c2), hx = dN(a + vec2(e, 0.0)) + 0.5 * dN(b + vec2(e, 0.0)) + 0.25 * uWet * dN(c2 + vec2(e, 0.0)), hz = dN(a + vec2(0.0, e)) + 0.5 * dN(b + vec2(0.0, e)) + 0.25 * uWet * dN(c2 + vec2(0.0, e));' +
      ' vec3 bump = vec3(h0 - hx, 0.0, h0 - hz) * (2.2 + uWet * 4.0); normal = normalize(normal + (viewMatrix * vec4(bump, 0.0)).xyz); }'
  });
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.9, metalness: 0 });
  M.foliage = dPatch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, flatShading: false }), {
    key: 'leaf2', vHead: 'varying vec3 vWp5;\n', vMain: 'vWp5 = (modelMatrix * vec4(transformed, 1.0)).xyz;', fHead: 'varying vec3 vWp5;\n',
    vBegin: '{ vec4 wp0 = modelMatrix * vec4(transformed, 1.0); float sway = sin(uTime * 1.3 + wp0.x * 0.3 + wp0.z * 0.2) * 0.06 * max(0.0, transformed.y); transformed.x += sway; transformed.z += sway * 0.6; }',
    fColor: '{ float n = dN(vWp5.xz * 1.3 + vWp5.y * 0.9); diffuseColor.rgb *= 0.65 + 0.6 * n; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.9, 0.95), uSnow * smoothstep(0.2, 0.9, vNormal.y)); }'
  });
  // fire and glows: added light, no shading
  M.flame = new THREE.ShaderMaterial({
    uniforms: { uTime: DU.uTime }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float aPh; varying vec2 vUv; varying float vPh; void main() { vUv = uv; vPh = aPh; vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); vec2 s = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz)); mv.xy += position.xy * s; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uTime; varying vec2 vUv; varying float vPh; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); } float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); } void main() { vec2 p = vUv; float t = uTime * 2.2 + vPh * 10.0; float x = (p.x - 0.5) * 2.0; float rise = n(vec2(p.x * 4.0, p.y * 3.0 - t)) * 0.6 + n(vec2(p.x * 9.0, p.y * 7.0 - t * 1.7)) * 0.4; float shape = (1.0 - p.y) * (1.0 - x * x * (1.2 + p.y * 2.5)); float f = clamp(shape * 1.6 - rise * (0.4 + p.y * 1.2), 0.0, 1.0); vec3 c = mix(vec3(1.0, 0.25, 0.04), vec3(1.0, 0.85, 0.45), f * f); gl_FragColor = vec4(c * f * 2.2, f); }'
  });
  M.glow = new THREE.ShaderMaterial({
    uniforms: {}, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute vec3 aC; varying vec2 vUv; varying vec3 vC; void main() { vUv = uv; vC = aC; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec2 vUv; varying vec3 vC; void main() { float d = length(vUv - 0.5) * 2.0; float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.2); gl_FragColor = vec4(vC * a, a); }'
  });
  M.lampHead = new THREE.MeshStandardMaterial({ color: 0x222326, roughness: 0.6, metalness: 0.5, emissive: 0xffc890, emissiveIntensity: 0 });
  if (typeof facadeMats === 'function') { try { facadeMats(); } catch (e) { coreHurt('FACADE', e); } }
  if (typeof floraMats === 'function') { try { floraMats(); } catch (e) { coreHurt('FLORA', e); } }
  if (typeof driftMats === 'function') { try { driftMats(); } catch (e) { coreHurt('DRIFT', e); } }
}

/* ---------- the sky, the sun, the moon and the stars ---------- */
function depthSkyBuild() {
  const S = DEPTH.scene, sky = new THREE.Sky(); sky.scale.setScalar(1800); sky.material.depthWrite = false; sky.renderOrder = -10;
  sky.frustumCulled = false; S.add(sky); DEPTH.sky = sky;
  const u = sky.material.uniforms; u.turbidity.value = 4; u.rayleigh.value = 1.6; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.82;
  // the sky's own light is far brighter than the scene's; scaled down it keeps its blue instead of burning to white
  u.uSkyK = { value: 0.42 }; sky.material.fragmentShader = 'uniform float uSkyK;\n' + sky.material.fragmentShader.replace('gl_FragColor = vec4( retColor, 1.0 );', 'gl_FragColor = vec4( retColor * uSkyK, 1.0 );'); sky.material.needsUpdate = true;
  // the stars: a few thousand points on a dome, twinkling a little, fading in with the night
  const n = 2600, pos = new Float32Array(n * 3), sz = new Float32Array(n), R = Z.mulberry32(0x57a25);
  for (let i = 0; i < n; i++) { const a = R() * TAU, y = Math.pow(R(), 0.65), r = Math.sqrt(1 - y * y); pos[i * 3] = Math.cos(a) * r * 360; pos[i * 3 + 1] = y * 360 + 8; pos[i * 3 + 2] = Math.sin(a) * r * 360; sz[i] = 0.6 + Math.pow(R(), 6) * 3.2; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSz', new THREE.BufferAttribute(sz, 1));
  const m = new THREE.ShaderMaterial({ uniforms: { uK: { value: 0 }, uTime: DU.uTime }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float aSz; varying float vA; uniform float uTime; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSz * 1.6; vA = 0.6 + 0.4 * sin(uTime * (1.0 + aSz) + position.x); }',
    fragmentShader: 'uniform float uK; varying float vA; void main() { vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(d)); gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a * uK * vA, a * uK); }' });
  const st = new THREE.Points(g, m); st.frustumCulled = false; st.renderOrder = -9; S.add(st); DEPTH.stars = st;
  // the moon: a pale disc with its seas, opposite the sun's path
  const mc = document.createElement('canvas'); mc.width = mc.height = 128; const x = mc.getContext('2d'), gr = x.createRadialGradient(64, 64, 10, 64, 64, 62); gr.addColorStop(0, '#f2f0e6'); gr.addColorStop(0.85, '#d6d3c6'); gr.addColorStop(1, 'rgba(214,211,198,0)'); x.fillStyle = gr; x.beginPath(); x.arc(64, 64, 62, 0, TAU); x.fill();
  x.fillStyle = 'rgba(120,120,112,0.35)'; for (const [a, b, r] of [[50, 48, 14], [76, 60, 10], [58, 78, 12], [80, 84, 6], [44, 70, 7]]) { x.beginPath(); x.arc(a, b, r, 0, TAU); x.fill(); }
  const mt = new THREE.CanvasTexture(mc); mt.colorSpace = THREE.SRGBColorSpace; DEPTH.tex.moon = mt;
  const moon = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: mt, transparent: true, depthWrite: false, fog: false, color: 0xffffff }));
  moon.scale.setScalar(46); moon.renderOrder = -8; moon.frustumCulled = false; S.add(moon); DEPTH.moon = moon;
  // clouds: a dome inside the far plane, its cover from the weather, lit from the sun's side (silver edges, dark
  // bellies), drifting with the wind, grey and low in a storm, faintly lit by the city at night, melting into the haze
  const cg = new THREE.SphereGeometry(370, 32, 16, 0, TAU, 0, Math.PI * 0.55);
  const cm = new THREE.ShaderMaterial({
    uniforms: { uNoise: DU.uNoise, uTime: DU.uTime, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunC: { value: new THREE.Color(1, 1, 1) }, uSkyC: { value: new THREE.Color(0.5, 0.6, 0.7) }, uFogC: { value: new THREE.Color(0.3, 0.3, 0.3) },
      uCover: { value: 0.3 }, uDark: { value: 0 }, uNight: { value: 0 }, uWind: { value: new THREE.Vector2(1, 0.3) } },
    side: THREE.BackSide, transparent: true, depthWrite: false, depthTest: true, fog: false,
    vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D uNoise; uniform float uTime, uCover, uDark, uNight; uniform vec3 uSun, uSunC, uSkyC, uFogC; uniform vec2 uWind; varying vec3 vDir;
      float cf(vec2 p) { vec4 a = texture2D(uNoise, p), b = texture2D(uNoise, p * 3.7 + 0.31), c = texture2D(uNoise, p * 9.3 + 0.7); return a.r * 0.5 + a.g * 0.22 + b.b * 0.17 + c.a * 0.11; }
      void main() {
        vec3 d = normalize(vDir); if (d.y < 0.0) discard;
        vec2 uv = d.xz / (d.y + 0.09) * 0.16 + uWind * uTime * 0.0015;
        float n = cf(uv), th = mix(0.66, 0.34, uCover);
        float c = smoothstep(th, th + 0.2 + uCover * 0.1, n);
        if (c < 0.004) discard;
        float n2 = cf(uv + normalize(uSun.xz + 1e-4) * 0.025 * (1.0 - uSun.y));
        float lit = clamp(0.55 + (n - n2) * 6.0, 0.0, 1.0);
        float edge = 1.0 - smoothstep(0.0, 0.6, c);
        vec3 col = mix(uSkyC * 0.75, uSunC, lit * (0.6 + 0.4 * edge));
        col *= 1.0 - 0.35 * smoothstep(0.3, 1.0, c) * (1.0 - lit);
        col = mix(col, vec3(0.07, 0.075, 0.085) * (0.6 + 0.4 * lit), uDark * 0.85);
        vec3 nightC = vec3(0.018, 0.02, 0.028) + vec3(0.06, 0.035, 0.016) * (1.0 - smoothstep(0.0, 0.35, d.y));
        col = mix(col, nightC, uNight);
        float hz = smoothstep(0.0, 0.22, d.y);
        col = mix(uFogC, col, hz);
        gl_FragColor = vec4(col, c * hz * (0.75 + 0.2 * uCover));
      }`
  });
  const clouds = new THREE.Mesh(cg, cm); clouds.renderOrder = -7; clouds.frustumCulled = false; S.add(clouds); DEPTH.clouds = clouds;
  S.fog = new THREE.FogExp2(0x8a96a4, 0.012);
}
// the sun (or the moon) as a light with shadows, the sky's and the ground's bounce, the flashlight, and a fixed pool of
// lamps that the nearest real lights of the lighting engine are handed to each frame (a fixed number, so the shaders
// never have to be rebuilt in the middle of a fight)
function depthLightsBuild() {
  const S = DEPTH.scene, q = DQ[DEPTH.lvl];
  const sun = new THREE.DirectionalLight(0xffffff, 2); sun.castShadow = q.shadow > 0;
  sun.shadow.mapSize.set(q.smap || 1024, q.smap || 1024); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  const sc = sun.shadow.camera; sc.left = -38; sc.right = 38; sc.top = 38; sc.bottom = -38; sc.near = 1; sc.far = 260;
  S.add(sun); S.add(sun.target); DEPTH.sun = sun;
  const hemi = new THREE.HemisphereLight(0xb4c4d8, 0x3a342c, 0.8); S.add(hemi); DEPTH.hemi = hemi;
  const spot = new THREE.SpotLight(0xfff0d0, 0, 42, 0.42, 0.55, 1.6); spot.castShadow = q.shadow > 1; spot.shadow.mapSize.set(512, 512); spot.shadow.bias = -0.0008;
  S.add(spot); S.add(spot.target); DEPTH.spot = spot;
  DEPTH.lights.length = 0;
  for (let i = 0; i < q.lights; i++) { const L = new THREE.PointLight(0xffc080, 0, 20, 1.7); L.castShadow = false; S.add(L); DEPTH.lights.push(L); }
}
function depthPostBuild() {
  const R = DEPTH.R, q = DQ[DEPTH.lvl], comp = new THREE.EffectComposer(R);
  comp.addPass(new THREE.RenderPass(DEPTH.scene, DEPTH.cam));
  const P = DEPTH.pass = {};
  if (q.ao) { try { P.ao = new THREE.GTAOPass(DEPTH.scene, DEPTH.cam, W, H); P.ao.output = 0; P.ao.blendIntensity = 0.85; comp.addPass(P.ao); } catch (e) { P.ao = null; } }
  // (1.9.9991) LIGHTFX: contact shadows from the depth (ambient occlusion where walls meet the street, under cars, in
  // doorways and between the dead in a crowd) on High, where Ultra has its own; and sun shafts: light streaming past the
  // buildings, the trees and a storm's towers when the sun is low or the air is thick (fog, dust, a coming storm)
  if (DEPTH.lvl >= 1) { try {
    const dt1 = new THREE.DepthTexture(1, 1), dt2 = new THREE.DepthTexture(1, 1); dt1.type = dt2.type = THREE.UnsignedIntType;
    comp.renderTarget1.depthTexture = dt1; comp.renderTarget2.depthTexture = dt2;
    P.fx = new THREE.ShaderPass({
      uniforms: { tDiffuse: { value: null }, tDepth: { value: dt1 }, uRes: { value: new THREE.Vector2(W, H) }, uPI: { value: new THREE.Matrix4() }, uP11: { value: 1 }, uAO: { value: !q.ao && DEPTH.lvl >= 2 ? 1 : 0 },
        uRad: { value: 0.75 }, uAOK: { value: 1.1 }, uSun: { value: new THREE.Vector2(0.5, 0.5) }, uSunK: { value: 0 }, uSunC: { value: new THREE.Color(1, 0.9, 0.75) }, uTime: { value: 0 }, uSkyK: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform highp sampler2D tDepth; uniform vec2 uRes, uSun; uniform mat4 uPI; uniform float uP11, uAO, uRad, uAOK, uSunK, uTime, uSkyK; uniform vec3 uSunC; varying vec2 vUv;
        vec3 vpos(vec2 uv) { float d = texture2D(tDepth, uv).r; vec4 c = uPI * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return c.xyz / c.w; }
        float hh(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
        void main() {
          vec3 col = texture2D(tDiffuse, vUv).rgb; float d0 = texture2D(tDepth, vUv).r;
          if (uAO > 0.5 && d0 < 0.99995) {
            vec3 P = vpos(vUv), N = normalize(cross(dFdx(P), dFdy(P)));
            float rs = uRad * uP11 / max(0.2, -P.z) * 0.5, occ = 0.0, a0 = hh(gl_FragCoord.xy) * 6.2831853, r0 = hh(gl_FragCoord.yx + 7.0);
            for (int i = 0; i < 10; i++) { float fi = float(i), a = a0 + fi * 2.39996, r = (fi + r0) / 10.0; vec2 uv2 = vUv + vec2(cos(a), sin(a)) * rs * r * vec2(uRes.y / uRes.x, 1.0);
              vec3 Q = vpos(clamp(uv2, 0.001, 0.999)), v = Q - P; float l = length(v); occ += max(0.0, dot(N, v / max(l, 1e-4)) - 0.08) * (1.0 - smoothstep(uRad * 0.6, uRad * 2.0, l)); }
            float ao = clamp(1.0 - uAOK * occ / 10.0, 0.25, 1.0); col *= mix(1.0, ao, smoothstep(140.0, 40.0, -P.z));
          }
          if (uSunK > 0.002) {
            vec2 dlt = (uSun - vUv) / 28.0; vec2 uv = vUv + dlt * hh(gl_FragCoord.xy + uTime); float w = 1.0, acc = 0.0;
            for (int i = 0; i < 28; i++) { float sky = step(0.99995, texture2D(tDepth, clamp(uv, 0.001, 0.999)).r); acc += sky * w; w *= 0.95; uv += dlt; }
            float fall = 1.0 - smoothstep(0.0, 0.75, length((vUv - uSun) * vec2(uRes.x / uRes.y, 1.0)));
            col += uSunC * acc / 15.3 * uSunK * 0.65 * fall * fall * uSkyK;
          }
          gl_FragColor = vec4(col, 1.0); }`
    });
    comp.addPass(P.fx);
  } catch (e) { P.fx = null; coreHurt('DEPTH', e); } }
  if (q.bloom) { P.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.62, 0.86); comp.addPass(P.bloom); }
  P.out = new THREE.OutputPass(); comp.addPass(P.out);
  P.grade = new THREE.ShaderPass({
    uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(W, H) }, uTime: { value: 0 }, uVig: { value: 0.5 }, uGrain: { value: 0.04 }, uSat: { value: 0.95 }, uCon: { value: 1.12 },
      uLift: { value: new THREE.Vector3(0.012, 0.022, 0.03) }, uGain: { value: new THREE.Vector3(1.02, 1.0, 0.96) }, uFlash: { value: new THREE.Vector4(0, 0, 0, 0) }, uCA: { value: 0.0015 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uTime, uVig, uGrain, uSat, uCon, uCA; uniform vec3 uLift, uGain; uniform vec4 uFlash; varying vec2 vUv;
      float hh(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      void main() { vec2 d = vUv - 0.5; float r2 = dot(d, d);
        vec3 c; c.r = texture2D(tDiffuse, vUv - d * uCA * r2 * 4.0).r; c.g = texture2D(tDiffuse, vUv).g; c.b = texture2D(tDiffuse, vUv + d * uCA * r2 * 4.0).b;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(l), c, uSat);
        c = (c - 0.5) * uCon + 0.5;
        // split tone: the shadows lean teal, the highlights warm (the gritty look)
        c += uLift * (1.0 - smoothstep(0.0, 0.5, l)); c *= mix(vec3(1.0), uGain, smoothstep(0.35, 1.0, l));
        c *= 1.0 - uVig * smoothstep(0.12, 0.62, r2 * 1.6);
        c += (hh(vUv * uRes + fract(uTime * 7.3) * 113.0) - 0.5) * uGrain;
        c = mix(c, uFlash.rgb, uFlash.a * (0.35 + 0.65 * smoothstep(0.05, 0.45, r2)));
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`
  });
  comp.addPass(P.grade);
  P.fxaa = new THREE.ShaderPass(THREE.FXAAShader); comp.addPass(P.fxaa);
  DEPTH.comp = comp;
}
// a new level: the shadow maps, the light pool and the post chain are rebuilt for it
function depthApplyLevel(l) {
  if (l === DEPTH.lvlSet || !DEPTH.ok) return;
  const prev = DEPTH.lvlSet; DEPTH.lvl = l; DEPTH.lvlSet = l;
  const S = DEPTH.scene, q = DQ[l];
  if (prev >= 0) {
    for (const L of DEPTH.lights) { S.remove(L); L.dispose(); } DEPTH.lights.length = 0;
    if (DEPTH.sun) { S.remove(DEPTH.sun.target); S.remove(DEPTH.sun); if (DEPTH.sun.shadow.map) DEPTH.sun.shadow.map.dispose(); DEPTH.sun.dispose(); }
    if (DEPTH.spot) { S.remove(DEPTH.spot.target); S.remove(DEPTH.spot); DEPTH.spot.dispose(); }
    if (DEPTH.hemi) { S.remove(DEPTH.hemi); DEPTH.hemi.dispose(); }
    depthLightsBuild();
    if (DEPTH.comp) DEPTH.comp.dispose(); depthPostBuild();
    // the view distance changed: blocks out of the new ring go
    for (const [k, C] of DEPTH.chunks) if (C.ring > q.ring + 1) depthChunkDrop(k);
  }
  DEPTH.lastPR = 0; depthResize(true);
}

/* ---------- geometry helpers ---------- */
// a geometry being built: positions, normals, uvs, colours, an extra vec4 and a vec2 per vertex
function dGB() { return { p: [], n: [], u: [], c: [], a: [], f: [], i: [], nv: 0 }; }
// a quad a, b, c, d (counter-clockwise seen from where its normal points)
function dQuad(B, a, b, c, d, nrm, col, aux, fa, fb, fc, fd) {
  const v0 = B.nv;
  for (const [P, F] of [[a, fa], [b, fb], [c, fc], [d, fd]]) {
    B.p.push(P[0], P[1], P[2]); B.n.push(nrm[0], nrm[1], nrm[2]); B.c.push(col[0], col[1], col[2]);
    B.a.push(aux ? aux[0] : 0, aux ? aux[1] : 0, aux ? aux[2] : 0, aux ? aux[3] : 0); B.f.push(F ? F[0] : 0, F ? F[1] : 0); B.u.push(F ? F[0] : 0, F ? F[1] : 0);
  }
  B.i.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3); B.nv += 4;
}
// an axis-aligned box (metres), every face but the bottom; faces: which to leave out ('b' bottom always)
function dBox(B, x0, y0, z0, x1, y1, z1, col, aux, roofCol, skip) {
  const top = roofCol || col;
  const A = aux ? [aux[0], aux[1], aux[2], 0] : null, R = aux ? [aux[0], aux[1], aux[2], 1] : null;
  const w = x1 - x0, d = z1 - z0, h = y1 - y0;
  if (!skip || skip.indexOf('n') < 0) dQuad(B, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], col, A, [0, 0], [w, 0], [w, h], [0, h]);
  if (!skip || skip.indexOf('s') < 0) dQuad(B, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col, A, [0, 0], [w, 0], [w, h], [0, h]);
  if (!skip || skip.indexOf('w') < 0) dQuad(B, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], col, A, [0, 0], [d, 0], [d, h], [0, h]);
  if (!skip || skip.indexOf('e') < 0) dQuad(B, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], col, A, [0, 0], [d, 0], [d, h], [0, h]);
  if (!skip || skip.indexOf('t') < 0) dQuad(B, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], top, R, [x0, z1], [x1, z1], [x1, z0], [x0, z0]);
}
// a box turned about the vertical axis (cx, cz centre; hw, hd half sizes; a angle), all faces but the bottom
function dBoxR(B, cx, y0, cz, hw, hd, y1, a, col, aux) {
  const c = Math.cos(a), s = Math.sin(a), P = (lx, lz, y) => [cx + lx * c - lz * s, y, cz + lx * s + lz * c], N = (nx, nz) => [nx * c - nz * s, 0, nx * s + nz * c];
  const h = y1 - y0;
  dQuad(B, P(hw, -hd, y0), P(-hw, -hd, y0), P(-hw, -hd, y1), P(hw, -hd, y1), N(0, -1), col, aux, [0, 0], [hw * 2, 0], [hw * 2, h], [0, h]);
  dQuad(B, P(-hw, hd, y0), P(hw, hd, y0), P(hw, hd, y1), P(-hw, hd, y1), N(0, 1), col, aux, [0, 0], [hw * 2, 0], [hw * 2, h], [0, h]);
  dQuad(B, P(-hw, -hd, y0), P(-hw, hd, y0), P(-hw, hd, y1), P(-hw, -hd, y1), N(-1, 0), col, aux, [0, 0], [hd * 2, 0], [hd * 2, h], [0, h]);
  dQuad(B, P(hw, hd, y0), P(hw, -hd, y0), P(hw, -hd, y1), P(hw, hd, y1), N(1, 0), col, aux, [0, 0], [hd * 2, 0], [hd * 2, h], [0, h]);
  dQuad(B, P(-hw, hd, y1), P(hw, hd, y1), P(hw, -hd, y1), P(-hw, -hd, y1), [0, 1, 0], col, aux, [0, 0], [1, 0], [1, 1], [0, 1]);
}
// a cylinder standing up (or lying along a turned axis), n sides
function dCyl(B, cx, y0, cz, r0, r1, y1, n, col, aux) {
  for (let i = 0; i < n; i++) {
    const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1), cm = Math.cos((a0 + a1) / 2), sm = Math.sin((a0 + a1) / 2);
    dQuad(B, [cx + c1 * r0, y0, cz + s1 * r0], [cx + c0 * r0, y0, cz + s0 * r0], [cx + c0 * r1, y1, cz + s0 * r1], [cx + c1 * r1, y1, cz + s1 * r1], [cm, 0, sm], col, aux, [a1, y0], [a0, y0], [a0, y1], [a1, y1]);
    if (r1 > 0.001) { const v0 = B.nv; B.p.push(cx, y1, cz, cx + c1 * r1, y1, cz + s1 * r1, cx + c0 * r1, y1, cz + s0 * r1); for (let k = 0; k < 3; k++) { B.n.push(0, 1, 0); B.c.push(col[0], col[1], col[2]); B.a.push(aux ? aux[0] : 0, aux ? aux[1] : 0, aux ? aux[2] : 0, aux ? aux[3] : 0); B.f.push(0, 0); B.u.push(0, 0); } B.i.push(v0, v0 + 1, v0 + 2); B.nv += 3; }
  }
}
function dGeom(B, extra) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2));
  if (extra) { g.setAttribute('aS', new THREE.Float32BufferAttribute(B.a, 4)); g.setAttribute('aF', new THREE.Float32BufferAttribute(B.f, 2)); }
  g.setIndex(B.nv > 65535 ? new THREE.Uint32BufferAttribute(B.i, 1) : new THREE.Uint16BufferAttribute(B.i, 1));
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}

/* ---------- a block in 3D ---------- */
const D_STYLE = { brick: 0, concrete: 1, glass: 2, stone: 3, siding: 4, stucco: 5, logs: 6, barn: 7, ruin: 8 };
// what a building is made of, from its kind, its district and its own seed
function dBuildStyle(r, bio) {
  const st = r.st || 'block', u = (((r.s || 1) * 2654435761) >>> 0) % 1000 / 1000;
  if (r.burn) return D_STYLE.ruin;
  if (st === 'ruin') return D_STYLE.ruin;
  if (st === 'house') return D_STYLE.siding;
  if (st === 'adobe') return D_STYLE.stucco;
  if (st === 'cabin' || st === 'lodge') return D_STYLE.logs;
  if (st === 'barn') return D_STYLE.barn;
  if (bio === 'ash' || bio === 'ruins') return u < 0.5 ? D_STYLE.concrete : D_STYLE.ruin;
  if (bio === 'burning') return u < 0.6 ? D_STYLE.brick : D_STYLE.ruin;
  const h = luxHeight(r);
  if (h > 24 && u < 0.5) return D_STYLE.glass;
  return u < 0.38 ? D_STYLE.brick : u < 0.72 ? D_STYLE.concrete : D_STYLE.stone;
}
const D_WALL = {
  0: ['#7a4334', '#6b3b2e', '#8a5240', '#5e3a30', '#7d5a48'], 1: ['#8b8a86', '#9a958c', '#76787a', '#a39d92', '#6d6c68'], 2: ['#3e4752', '#4a5560', '#36404a'],
  3: ['#a0937e', '#8e8473', '#b0a48e'], 4: ['#c9c2b2', '#a7b4ba', '#d8cfb8', '#9fae9a', '#c8b7a0', '#e1ddd3'], 5: ['#c49a6c', '#d2ab7c', '#b88c62'],
  6: ['#5a3e2a', '#6b4a32', '#4e3624'], 7: ['#7c2a22', '#8a3328', '#6a241e'], 8: ['#5c5853', '#4e4a45', '#6a645c']
};
// the lit share of a building's windows at night (the city still has power in places)
function dLitShare(r, bio, style) {
  if (style === D_STYLE.ruin || r.burn || style === D_STYLE.barn) return 0;
  const base = { city: 0.32, chaos: 0.14, burning: 0.05, ruins: 0, ash: 0.04, suburb: 0.35, desert: 0.25, snow: 0.4 }[bio];
  const u = (((r.s || 7) * 40503) >>> 0) % 1000 / 1000;
  return (base == null ? 0.2 : base) * (u < 0.15 ? 0.15 : u < 0.3 ? 1.8 : 1);
}
const D_THING = {
  bench: ['#5a4632', 0.5], planter: ['#6e6b64', 0.9], statue: ['#7c7f78', 6], kiosk: ['#2f6fb0', 2.8], stall: ['#9a5a2a', 2.6], hoop: ['#9aa0a6', 3.05], fence: ['#55585c', 1.8],
  dumpster: ['#2f5a3a', 1.5], barrier: ['#c8c4bc', 0.9], rock: ['#6a645c', 1.6], rub: ['#5d5850', 1.2], tank: ['#8a8d90', 7], windmill: ['#9a9da0', 10], pool: ['#3a8aa8', 0.3],
  mesa: ['#9a6a48', 20], cactus: ['#4a6a34', 3], pump: ['#8a2a22', 1.6], log: ['#5a4030', 0.5], trough: ['#7a7c7e', 0.8], wood: ['#7a5a3a', 1.1], checkpoint: ['#4a5a3a', 2.6],
  bags: ['#2a2a2c', 0.55], pallets: ['#8a6a44', 0.5], rolloff: ['#a65a22', 1.3], rail: ['#6a6d70', 0.95], tanker: ['#c8c8c4', 3.3], plow: ['#c88a22', 2.8], pillar: ['#8c8a84', 7.5], wreck: ['#6a6e72', 3],
  trunk: null, b: null, car: null, lm: ['#7a7c78', 1.6]
};
// (1.9.9991) SURFACE layers for the plain material: [layer + 1, ...] in the aS attribute (0: none)
const DL = k => [(typeof SURF_L !== 'undefined' ? SURF_L[k] : 0) + 1, 0, 0, 0];
const DL_CON = DL('concrete'), DL_MET = DL('metal'), DL_PLK = DL('planks'), DL_ASP = DL('asphalt'), DL_STU = DL('stucco'), DL_STO = DL('stone'), DL_SHI = DL('shingle'), DL_TIN = DL('metalc');
const D_UP = 1;   // the sidewalk curb (in centimetres it is 15; this is a scale on it)
function depthChunkKey(cx, cy) { return cx + ',' + cy; }
// build the 3D block for chunk c (its data must exist); returns the record kept in DEPTH.chunks
function depthChunkBuild(c, ring) {
  const t0 = performance.now(), U = DEPTH.upm, q = DQ[DEPTH.lvl], S = DEPTH.scene, G0 = new THREE.Group();
  G0.position.set((c.sx - DEPTH.ox) / U, 0, (c.sy - DEPTH.oy) / U); G0.matrixAutoUpdate = true;
  const ox = c.sx, oy = c.sy, L = (v) => v / U, keep = [], rec = { k: depthChunkKey(c.cx, c.cy), c: c, g: G0, keep: keep, ring: ring, lit: [], fires: [], props: [] };
  const TH = dGB();   // everything in the plain material goes into one geometry (one draw for the whole block)
  const sz = CHS / U, bio = c.bio, B0 = BIO[bio] || BIO.city, urban = bio !== 'desert' && bio !== 'snow';
  const curb = urban && !c.wm ? 0.15 : 0;
  // the ground: the block's painting at this level's resolution (nearer blocks sharper)
  const px = q.gpx * (ring <= 0 ? 1.4 : ring === 1 ? 1 : 0.55) * (TOUCH ? 0.8 : 1), can = chunkPaint(c, { ground: true, px: Math.max(0.35, Math.min(2.4, px)) });
  const tex = new THREE.CanvasTexture(can); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, DEPTH.R.capabilities.getMaxAnisotropy()); tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  keep.push(tex); rec.groundCan = can;
  const WT = depthWaterMask(c), wtex = WT ? WT.tex : depthNoWater(), obc = DEPTH.mats.ground.onBeforeCompile;
  if (WT) keep.push(WT.tex);
  const gm = DEPTH.mats.ground.clone(); gm.map = tex; gm.onBeforeCompile = (sh, r) => { obc(sh, r); sh.uniforms.uWMask = { value: wtex }; sh.uniforms.uHasW = { value: WT ? 1 : 0 }; }; gm.customProgramCacheKey = DEPTH.mats.ground.customProgramCacheKey; keep.push(gm);
  if (WT) { try { depthWaterBuild(c, WT, G0, keep, curb, TH); } catch (e) { coreHurt('DEPTH', e); } }
  {
    const B = dGB(), bx = L(ROAD * SCL), BSm = L(BS * SCL), wcol = [1, 1, 1];
    // road (the whole square, the block sits on top of it), then the block raised by the curb
    dQuad(B, [0, 0, sz], [sz, 0, sz], [sz, 0, 0], [0, 0, 0], [0, 1, 0], wcol, null, [0, 0], [1, 0], [1, 1], [0, 1]);
    if (curb) { const u0 = ROAD / CH, u1 = 1; dQuad(B, [bx, curb, bx + BSm], [bx + BSm, curb, bx + BSm], [bx + BSm, curb, bx], [bx, curb, bx], [0, 1, 0], wcol, null, [u0, 1 - u1], [u1, 1 - u1], [u1, 1 - u0], [u0, 1 - u0]); }
    const g = dGeom(B);
    // (the ground's uv: x across, y up the texture; the painting's top row is the north edge)
    const uv = g.attributes.uv.array; for (let i = 0; i < uv.length; i += 2) { const vx = B.p[(i / 2) * 3], vz = B.p[(i / 2) * 3 + 2]; uv[i] = vx / sz; uv[i + 1] = 1 - vz / sz; }
    const m = new THREE.Mesh(g, gm); m.receiveShadow = true; m.castShadow = false; G0.add(m); keep.push(g);
    if (curb) { const cc = dLin('#8a8984', null, 0.8); dBox(TH, bx, 0, bx, bx + BSm, curb, bx + BSm, cc, DL_CON, null, 't'); }
  }
  // buildings
  {
    const B = dGB(), T = TH, V = TH, roofTmp = [0, 0, 0], col = [0, 0, 0];
    // (1.9.9991) FACADE dresses each building: trim, shops and their signs, fire escapes, roofs, porches, marks on the walls
    const fctx = typeof facadeBuilding === 'function' && FAC.ok ? { TH: TH, SG: dGB(), DG: dGB(), bx: L(ROAD * SCL), bs: L(BS * SCL), curb: curb, bio: bio, ring: ring, c: c } : null; rec.fctx = fctx;
    for (const r of c.rects) {
      const x0 = L(r.x - ox), z0 = L(r.y - oy), x1 = L(r.x + r.w - ox), z1 = L(r.y + r.h - oy);
      if (r.k === 'b') {
        const style = dBuildStyle(r, bio), pal = D_WALL[style], u = (((r.s || 3) * 2246822519) >>> 0) % 1000 / 1000;
        dLin(pal[Math.floor(u * pal.length) % pal.length], col);
        const h = luxHeight(r), lit = dLitShare(r, bio, style), seed = u, y0 = curb;
        dLin(r.roof || '#3a3d42', roofTmp, style === D_STYLE.ruin ? 0.7 : 1);
        // tall towers step back near the top; houses and cabins get a pitched roof
        if ((r.st || 'block') === 'block' && h > 20 && style !== D_STYLE.ruin && (x1 - x0) > 14 && (z1 - z0) > 14 && u > 0.35) {
          const h1 = h * (0.68 + u * 0.12), ins = Math.min(x1 - x0, z1 - z0) * 0.14;
          dBox(B, x0, y0, z0, x1, y0 + h1, z1, col, [style, seed, lit], roofTmp);
          dBox(B, x0 + ins, y0 + h1, z0 + ins, x1 - ins, y0 + h, z1 - ins, col, [style, seed + 0.31, lit], roofTmp);
          if (fctx) facadeBuilding(fctx, r, x0, z0, x1, z1, y0, h1, style, col, seed, lit, 'tower');
        } else if (style === D_STYLE.siding || style === D_STYLE.logs || style === D_STYLE.barn) {
          const ridge = Math.min(x1 - x0, z1 - z0) * (style === D_STYLE.logs ? 0.42 : 0.3), alongX = (x1 - x0) >= (z1 - z0);
          dBox(B, x0, y0, z0, x1, y0 + h - ridge * 0.6, z1, col, [style, seed, lit], roofTmp, 't');
          dRoofGable(T, x0, z0, x1, z1, y0 + h - ridge * 0.6, ridge, alongX, roofTmp, style === D_STYLE.barn ? DL_TIN : style === D_STYLE.logs ? DL_PLK : DL_SHI);
          if (fctx) facadeBuilding(fctx, r, x0, z0, x1, z1, y0, h - ridge * 0.6, style, col, seed, lit, 'gable');
        } else if (style === D_STYLE.ruin) {
          // a ruin: the walls broken off at uneven heights
          const nx = Math.max(1, Math.round((x1 - x0) / 6)), nz = Math.max(1, Math.round((z1 - z0) / 6)), R2 = Z.mulberry32(r.s || 9);
          for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { if (i > 0 && i < nx - 1 && j > 0 && j < nz - 1 && R2() < 0.7) continue; const hh = h * (0.35 + R2() * 0.65); const ax = x0 + (x1 - x0) * i / nx, az = z0 + (z1 - z0) * j / nz; dBox(B, ax, y0, az, ax + (x1 - x0) / nx, y0 + hh, az + (z1 - z0) / nz, col, [style, seed + i * 0.13 + j * 0.07, 0], roofTmp); }
        } else {
          dBox(B, x0, y0, z0, x1, y0 + h, z1, col, [style, seed, lit], roofTmp);
          // a parapet round the flat roof (FACADE puts its coping on, and what stands on the roof)
          if (h > 9 && (x1 - x0) > 8) { const pc = dLin('#4a4c50', null, 0.9); const rh = y0 + h; dBox(V, x0, rh, z0, x1, rh + 0.6, z0 + 0.25, pc, DL_CON); dBox(V, x0, rh, z1 - 0.25, x1, rh + 0.6, z1, pc, DL_CON); dBox(V, x0, rh, z0, x0 + 0.25, rh + 0.6, z1, pc, DL_CON); dBox(V, x1 - 0.25, rh, z0, x1, rh + 0.6, z1, pc, DL_CON);
            if (!fctx) { const R2 = Z.mulberry32((r.s || 5) ^ 0x77); const n = 1 + Math.floor(R2() * 3); for (let i = 0; i < n; i++) { const cx = x0 + 2 + R2() * (x1 - x0 - 4), cz = z0 + 2 + R2() * (z1 - z0 - 4), k = R2(); if (k < 0.35) dCyl(V, cx, rh, cz, 1.4, 1.4, rh + 2.6, 10, dLin('#5a4a3a'), DL_PLK); else if (k < 0.7) dBox(V, cx - 1.6, rh, cz - 1.1, cx + 1.6, rh + 1.4, cz + 1.1, dLin('#9aa0a4'), DL_MET); else dBox(V, cx - 1.5, rh, cz - 1.5, cx + 1.5, rh + 2.8, cz + 1.5, col, DL_CON); } } }
          if (fctx) facadeBuilding(fctx, r, x0, z0, x1, z1, y0, h, style, col, seed, lit, 'box');
        }
        if (r.burn) rec.fires.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, y: y0 + h * 0.6, r: Math.min(x1 - x0, z1 - z0) * 0.4, roof: y0 + h });
      }
    }
    if (B.nv) { const g = dGeom(B, true); const m = new THREE.Mesh(g, DEPTH.mats.facade); m.castShadow = true; m.receiveShadow = true; G0.add(m); keep.push(g); rec.bld = m; }
    if (fctx) { try { facadeChunkEnd(fctx, G0, keep); } catch (e) { coreHurt('FACADE', e); } }
    if (fctx && fctx.smoke) rec.smoke = fctx.smoke;
    void T; void V;
  }
  // the things in the street: vehicles, benches, planters, fences, rubble... (boxes at their real sizes for now; the
  // vehicles get their own bodies)
  {
    const B = TH, P = dGB(), Gl = dGB(), Tr = dGB(), col = [0, 0, 0];
    for (const r of c.rects) {
      if (r.k === 'b' || r.k === 'trunk' || r.dyn) continue;
      const x0 = L(r.x - ox), z0 = L(r.y - oy), x1 = L(r.x + r.w - ox), z1 = L(r.y + r.h - oy), y0 = r.k === 'car' ? 0 : curb && x0 > L(ROAD * SCL) - 0.01 && z0 > L(ROAD * SCL) - 0.01 ? curb : 0;
      if (r.k === 'car') { dVehicle(r.burnt ? B : P, Gl, Tr, r, x0, z0, x1, z1); continue; }   // (a burnt shell is matt: the plain material)
      const T = D_THING[r.k], h = luxHeight(r) || (T ? T[1] : 1);
      dLin(T ? T[0] : '#6a6a6a', col);
      if (r.k === 'fence') { if (!(rec.fctx && facFence(rec.fctx, r, x0, z0, x1, z1, y0))) dBox(B, x0, y0, z0, x1, y0 + h, z1, dLin('#3e4246', col), DL_MET); continue; }
      if (r.k === 'rub' || r.k === 'rock') { const R2 = Z.mulberry32(r.s || ((r.x * 7 + r.y) | 0)); const n = r.k === 'rock' ? 2 : 4; for (let i = 0; i < n; i++) { const w = (x1 - x0), d = (z1 - z0), cx = x0 + w * (0.25 + R2() * 0.5), cz = z0 + d * (0.25 + R2() * 0.5); dBoxR(B, cx, y0, cz, w * (0.2 + R2() * 0.3), d * (0.2 + R2() * 0.3), y0 + h * (0.4 + R2() * 0.6), R2() * 3, col, r.k === 'rock' ? DL_STU : DL_CON); } continue; }
      if (r.k === 'pillar') { const ph = dPierH(c, r) || h; dBox(B, x0, 0, z0, x1, ph, z1, col, DL_CON); const e = 0.35; dBox(B, x0 - e, ph - 0.6, z0 - e, x1 + e, ph, z1 + e, col, DL_CON); continue; }
      if (r.k === 'planter') { dBox(B, x0, y0, z0, x1, y0 + 0.75, z1, col, DL_CON); dBox(B, x0 + 0.15, y0 + 0.75, z0 + 0.15, x1 - 0.15, y0 + 0.82, z1 - 0.15, dLin('#2e2418'), DL('dirt')); continue; }
      if (r.k === 'bench') { const bc = dLin('#5a4632'); dBox(B, x0, y0 + 0.4, z0, x1, y0 + 0.47, z1, bc, DL_PLK); continue; }
      const tl = r.k === 'barrier' || r.k === 'checkpoint' ? DL_CON : r.k === 'statue' || r.k === 'mesa' ? DL_STU : r.k === 'pallets' || r.k === 'wood' || r.k === 'log' || r.k === 'stall' ? DL_PLK : r.k === 'bags' || r.k === 'cactus' || r.k === 'pool' ? null : DL_MET;
      dBox(B, x0, y0, z0, x1, y0 + h, z1, col, tl);
    }
    for (const f of c.furn || []) dFurniture(B, Gl, f, L(f.x * SCL - ox), L(f.y * SCL - oy), curb);
    if (P.nv) { const g = dGeom(P); const m = new THREE.Mesh(g, DEPTH.mats.paint); m.castShadow = true; m.receiveShadow = true; G0.add(m); keep.push(g); }
    if (Gl.nv) { const g = dGeom(Gl); const m = new THREE.Mesh(g, DEPTH.mats.glass); m.castShadow = false; m.receiveShadow = false; G0.add(m); keep.push(g); }
    if (Tr.nv) { const g = dGeom(Tr); const m = new THREE.Mesh(g, DEPTH.mats.rubber); m.castShadow = false; G0.add(m); keep.push(g); }
    if (rec.fctx) { try { facFenceEnd(rec.fctx, G0, keep); } catch (e) { coreHurt('FACADE', e); } }
    rec.fctx = null;   // (the builders are done with)
  }
  // street lamps: a pole, an arm out over the road and the head (lit by the light pool at night)
  {
    const B = TH, H = dGB(), pc = dLin('#3a3d42');
    if (!c.lights) c.lights = lightsOf(c.cx, c.cy);
    for (const l of c.lights) {
      if (l.hw) continue;
      const x = L(l.x - ox), z = L(l.y - oy), hx = L((l.hx == null ? l.x : l.hx) - ox), hz = L((l.hy == null ? l.y : l.hy) - oy), y0 = curb;
      dCyl(B, x, y0, z, 0.09, 0.07, y0 + 7.2, 6, pc, DL_MET);
      const dx = hx - x, dz = hz - z, len = Math.hypot(dx, dz);
      if (len > 0.2) dBoxR(B, (x + hx) / 2, y0 + 7.05, (z + hz) / 2, len / 2, 0.05, y0 + 7.2, Math.atan2(dz, dx), pc, DL_MET);
      dBoxR(H, hx, y0 + 6.88, hz, 0.34, 0.16, y0 + 7.06, Math.atan2(dz, dx), [1, 1, 1]);
      rec.lit.push({ x: hx, y: y0 + 6.85, z: hz });
    }
    if (H.nv) { const g = dGeom(H); const m = new THREE.Mesh(g, DEPTH.mats.lampHead); G0.add(m); keep.push(g); }
  }
  // the elevated highways over this block: decks, ramps, barriers, lamps and the traffic stuck up there
  try { depthSkyway(c, G0, keep, TH); } catch (e) { coreHurt('DEPTH', e); }
  // trees, bushes and grass: FLORA grows them (1.9.9991); the old instanced ones if it is not up
  const floraDone = typeof floraChunk === 'function' && FLORA.ok ? (() => { try { return floraChunk(c, G0, keep, TH, ox, oy, curb, ring); } catch (e) { coreHurt('FLORA', e); return false; } })() : false;
  // trees: a trunk and a crown, by kind and season (instanced per block)
  if (!floraDone) {
    const trees = c.deco.filter(d => d.k === 'tree'), n = Math.round(trees.length * q.trees);
    if (n) {
      const geo = depthTreeGeo(), tm = new THREE.InstancedMesh(geo.trunk, DEPTH.mats.thing, n), cm = new THREE.InstancedMesh(geo.crown, DEPTH.mats.foliage, n);
      const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3(), C3 = new THREE.Color(), sea = WORLD.season, win = winterOn(c) || bio === 'snow';
      for (let i = 0; i < n; i++) {
        const t = trees[i], x = L(t.x - ox), z = L(t.y - oy), rr = Math.max(1.2, L(t.r) * 0.62), R2 = Z.mulberry32(t.s || i), ht = t.v === 'pine' ? rr * 3.2 : t.v === 'dead' ? rr * 2.4 : rr * 2.3;
        const y0 = curb && x > L(ROAD * SCL) && z > L(ROAD * SCL) ? curb : 0;
        Q4.setFromAxisAngle(V3.set(0, 1, 0), R2() * TAU);
        M4.compose(V3.set(x, y0, z), Q4, S3.set(rr * 0.12, ht * 0.62, rr * 0.12)); tm.setMatrixAt(i, M4); tm.setColorAt(i, C3.set(t.v === 'blossom' ? '#4a3a30' : '#3e3024'));
        const dead = t.v === 'dead' || (win && t.v !== 'pine' && sea === 3);
        M4.compose(V3.set(x, y0 + ht * (t.v === 'pine' ? 0.42 : 0.6), z), Q4, dead ? S3.set(0.001, 0.001, 0.001) : S3.set(rr * (t.v === 'pine' ? 0.62 : 1), t.v === 'pine' ? ht * 0.62 : rr * 0.85, rr * (t.v === 'pine' ? 0.62 : 1)));
        cm.setMatrixAt(i, M4);
        const leaf = t.v === 'pine' ? '#1f3a24' : t.v === 'blossom' ? (sea === 0 ? '#e8a8c8' : '#3e5a2a') : sea === 2 ? ['#b8662a', '#c89a2a', '#8a3a1e'][i % 3] : sea === 3 ? '#4a4a3e' : sea === 1 ? '#2e5a24' : '#3e6a2a';
        cm.setColorAt(i, C3.set(bio === 'ash' ? '#4a4a48' : bio === 'burning' ? '#3a2e22' : leaf));
      }
      tm.castShadow = cm.castShadow = true; tm.receiveShadow = cm.receiveShadow = true;
      tm.instanceMatrix.needsUpdate = true; cm.instanceMatrix.needsUpdate = true; if (tm.instanceColor) tm.instanceColor.needsUpdate = true; if (cm.instanceColor) cm.instanceColor.needsUpdate = true;
      tm.computeBoundingSphere(); cm.computeBoundingSphere();
      G0.add(tm); G0.add(cm); rec.tm = tm; rec.cm = cm;
    }
  }
  // bushes and grass: instanced per block, swaying in the wind like the trees; flattened and browned by the season
  if (!floraDone) {
    const bush = c.deco.filter(d => d.k === 'bush'), grass = c.deco.filter(d => d.k === 'grass'), sea = WORLD.season, win = winterOn(c) || bio === 'snow';
    const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3(), C3 = new THREE.Color(), YA = new THREE.Vector3(0, 1, 0), geo = depthBushGeo();
    const nb = Math.round(bush.length * q.trees), ng = Math.round(grass.length * q.trees * (DEPTH.lvl >= 2 ? 1 : 0.5));
    const at = (d) => { const x = L(d.x - ox), z = L(d.y - oy); return [x, z, curb && x > L(ROAD * SCL) && z > L(ROAD * SCL) ? curb : 0]; };
    if (nb) {
      const im = new THREE.InstancedMesh(geo.bush, DEPTH.mats.foliage, nb);
      for (let i = 0; i < nb; i++) { const d = bush[i], [x, z, y0] = at(d), R2 = Z.mulberry32(d.s || i), rr = Math.max(0.45, L(d.r) * 0.7);
        Q4.setFromAxisAngle(YA, R2() * TAU); M4.compose(V3.set(x, y0, z), Q4, S3.set(rr * (0.9 + R2() * 0.3), rr * (0.7 + R2() * 0.3), rr * (0.9 + R2() * 0.3))); im.setMatrixAt(i, M4);
        im.setColorAt(i, C3.set(bio === 'ash' ? '#45453f' : bio === 'burning' ? '#3a2c20' : win && sea === 3 ? '#5a5a4a' : sea === 2 ? ['#7a5a26', '#5e5a24', '#3e4a22'][i % 3] : d.v === 'dry' ? '#6a6234' : ['#2e4a22', '#3a5426', '#26401e'][i % 3])); }
      im.castShadow = true; im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); G0.add(im);
    }
    if (ng) {
      const im = new THREE.InstancedMesh(geo.grass, DEPTH.mats.foliage, ng);
      for (let i = 0; i < ng; i++) { const d = grass[i], [x, z, y0] = at(d), R2 = Z.mulberry32(d.s || i), rr = Math.max(0.25, L(d.r) * 0.55);
        Q4.setFromAxisAngle(YA, R2() * TAU); M4.compose(V3.set(x, y0, z), Q4, S3.set(rr, rr * (d.v === 'reed' ? 2.4 : 1.1), rr)); im.setMatrixAt(i, M4);
        im.setColorAt(i, C3.set(d.v === 'reed' ? '#5a6a34' : win ? '#7a7a64' : sea === 2 ? '#8a7a3a' : bio === 'ash' ? '#4a4a44' : ['#4a6a2a', '#5a7430', '#3e5a24'][i % 3])); }
      im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); G0.add(im);
    }
  }
  // fires: flames on the ground and on burning roofs
  {
    const fl = [];
    for (const f of c.fires) fl.push({ x: L(f.x - ox), y: curb, z: L(f.y - oy), r: Math.max(0.6, L(f.r) * 0.9) });
    for (const f of rec.fires) fl.push({ x: f.x, y: f.roof, z: f.z, r: Math.min(4, f.r * 0.5) });
    if (fl.length) {
      const geo = depthFlameGeo(), im = new THREE.InstancedMesh(geo, DEPTH.mats.flame, fl.length * 2), M4 = new THREE.Matrix4(), ph = new Float32Array(fl.length * 2);
      fl.forEach((f, i) => { for (let k = 0; k < 2; k++) { const j = i * 2 + k; M4.makeScale(f.r * (k ? 1.4 : 2), f.r * (k ? 2.1 : 3), 1); M4.setPosition(f.x + (k ? f.r * 0.3 : 0), f.y + f.r * (k ? 1.0 : 1.4), f.z + (k ? -f.r * 0.2 : 0)); im.setMatrixAt(j, M4); ph[j] = i * 0.37 + k * 0.5; } });
      geo.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 1));
      im.frustumCulled = false; im.renderOrder = 5; G0.add(im); rec.flames = im;
    }
  }
  if (TH.nv) { const g = dGeom(TH, true); const m = new THREE.Mesh(g, DEPTH.mats.thing); m.castShadow = true; m.receiveShadow = true; G0.add(m); keep.push(g); }
  S.add(G0); DEPTH.chunks.set(rec.k, rec);
  const ms = performance.now() - t0; DEPTH.built++; DEPTH.buildMs += ms; coreCost('DEPTH', ms);
  return rec;
}
// the water of a block: its field (from the city engine: below zero is water) as a mask the ground shader cuts away
// with, the roads kept dry (the bridge decks carry them); none in the desert, on the frozen north or in a winter freeze
function depthWaterMask(c) {
  if (!c.wm || !c.fv || c.bio === 'desert' || c.bio === 'snow' || winterOn(c)) return null;
  const N = WF, d = new Uint8Array(N * N), f = c.fv, nR = ROAD / WC;
  let any = false;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let v = f[j * N + i]; if (i < nR || j < nR) v = Math.max(v, 1.5);
    d[j * N + i] = Math.round(clamp(0.5 + v * 0.25, 0, 1) * 255); if (v < 0) any = true;
  }
  if (!any) return null;
  const t = new THREE.DataTexture(d, N, N, THREE.RedFormat, THREE.UnsignedByteType); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
  return { tex: t, d: d };
}
function depthNoWater() { if (!DEPTH.tex.noW) { const t = new THREE.DataTexture(new Uint8Array([255]), 1, 1, THREE.RedFormat, THREE.UnsignedByteType); t.needsUpdate = true; DEPTH.tex.noW = t; } return DEPTH.tex.noW; }
// the water itself (a surface half a metre down, under the decks too), the banks round it (traced along the field's
// zero line, so they meet the cut in the ground exactly), and the bridges: the decks' edges, parapets and piers
function depthWaterBuild(c, WT, G0, keep, curb, TH) {
  const U = DEPTH.upm, N = WF, D = WT.d, f = c.fv, cs = WC * SCL / U, nR = ROAD / WC, WY = -0.5, B = dGB(), K = TH || dGB();
  const mv = (i, j) => (D[j * N + i] / 255 - 0.5) * 4;   // the mask's value at a corner (a field: below zero is water)
  const deep = [0.012, 0.03, 0.036], shal = [0.03, 0.07, 0.07];
  // the surface: every cell with water at a corner (the road band too, under the decks)
  for (let j = 0; j < WM; j++) for (let i = 0; i < WM; i++) {
    const v0 = f[j * N + i], v1 = f[j * N + i + 1], v2 = f[(j + 1) * N + i + 1], v3 = f[(j + 1) * N + i];
    if (Math.min(v0, v1, v2, v3) > 0.25) continue;
    const col = (v) => { const k = clamp(-v / 1.6, 0, 1); return [shal[0] + (deep[0] - shal[0]) * k, shal[1] + (deep[1] - shal[1]) * k, shal[2] + (deep[2] - shal[2]) * k]; };
    const x0 = i * cs, z0 = j * cs, x1 = x0 + cs, z1 = z0 + cs, vb = B.nv;
    for (const [x, z, v] of [[x0, z1, v3], [x1, z1, v2], [x1, z0, v1], [x0, z0, v0]]) { const cc = col(v); B.p.push(x, WY, z); B.n.push(0, 1, 0); B.c.push(cc[0], cc[1], cc[2]); B.a.push(0, 0, 0, 0); B.f.push(0, 0); B.u.push(0, 0); }
    B.i.push(vb, vb + 1, vb + 2, vb, vb + 2, vb + 3); B.nv += 4;
  }
  if (B.nv) { const g = dGeom(B); const m = new THREE.Mesh(g, DEPTH.mats.water); m.receiveShadow = true; G0.add(m); keep.push(g); }
  // the banks: marching squares on the mask's zero line; a bank is earth and stone down past the water, a bridge's
  // edge (where the dry side is road) is only the deck's thickness, with the water running on under it
  const bank = dLin('#3a342c'), fascia = dLin('#6a6a66');
  const P = (i, j, i2, j2) => { const a = mv(i, j), b = mv(i2, j2), t = a / ((a - b) || 1e-6); return [(i + (i2 - i) * t) * cs, (j + (j2 - j) * t) * cs]; };
  for (let j = 0; j < WM; j++) for (let i = 0; i < WM; i++) {
    const a = mv(i, j), b = mv(i + 1, j), cc = mv(i + 1, j + 1), d = mv(i, j + 1);
    const pts = [];
    if ((a < 0) !== (b < 0)) pts.push(P(i, j, i + 1, j));
    if ((b < 0) !== (cc < 0)) pts.push(P(i + 1, j, i + 1, j + 1));
    if ((d < 0) !== (cc < 0)) pts.push(P(i, j + 1, i + 1, j + 1));
    if ((a < 0) !== (d < 0)) pts.push(P(i, j, i, j + 1));
    for (let k = 0; k + 1 < pts.length; k += 2) {
      const p = pts[k], q = pts[k + 1], dx = q[0] - p[0], dz = q[1] - p[1]; if (Math.hypot(dx, dz) < 1e-4) continue;
      // which side is the water: the field a little to one side of the middle
      const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2, nx = -dz, nz = dx, nl = Math.hypot(nx, nz), tx = (mx + nx / nl * 0.15 * cs) / cs, tz = (mz + nz / nl * 0.15 * cs) / cs;
      const ti = clamp(Math.floor(tx), 0, WM - 1), tj = clamp(Math.floor(tz), 0, WM - 1), fx = tx - ti, fz = tz - tj;
      const sv = mv(ti, tj) * (1 - fx) * (1 - fz) + mv(ti + 1, tj) * fx * (1 - fz) + mv(ti, tj + 1) * (1 - fx) * fz + mv(ti + 1, tj + 1) * fx * fz;
      let A = p, Bq = q; if (sv > 0) { A = q; Bq = p; }   // (the normal (-dz, dx) of A -> B points at the water)
      const ex = Bq[0] - A[0], ez = Bq[1] - A[1], el = Math.hypot(ex, ez), road = Math.min(mx, mz) < (nR + 0.6) * cs;
      const top = road ? 0 : curb, bot = road ? -0.55 : -1.25, n = [-ez / el, 0, ex / el], cl = road ? fascia : bank;
      dQuad(K, [A[0], bot, A[1]], [Bq[0], bot, Bq[1]], [Bq[0], top, Bq[1]], [A[0], top, A[1]], n, cl, null);
    }
  }
  // the bridges: concrete parapets along both sides of each deck, piers down into the water
  const L = (v) => v / U, pc = dLin('#7a7a74');
  for (const dk of c.decks || []) {
    const x0 = L(dk.x * SCL - c.sx), z0 = L(dk.y * SCL - c.sy), x1 = L((dk.x + dk.w) * SCL - c.sx), z1 = L((dk.y + dk.h) * SCL - c.sy);
    if (dk.horiz) { dBox(K, x0, 0, z0, x1, 0.85, z0 + 0.25, pc); dBox(K, x0, 0, z1 - 0.25, x1, 0.85, z1, pc); for (let x = x0 + 3; x < x1 - 1; x += 9) { dBox(K, x - 0.4, -3, z0 + 1.2, x + 0.4, -0.5, z0 + 2, pc); dBox(K, x - 0.4, -3, z1 - 2, x + 0.4, -0.5, z1 - 1.2, pc); } }
    else { dBox(K, x0, 0, z0, x0 + 0.25, 0.85, z1, pc); dBox(K, x1 - 0.25, 0, z0, x1, 0.85, z1, pc); for (let z = z0 + 3; z < z1 - 1; z += 9) { dBox(K, x0 + 1.2, -3, z - 0.4, x0 + 2, -0.5, z + 0.4, pc); dBox(K, x1 - 2, -3, z - 0.4, x1 - 1.2, -0.5, z + 0.4, pc); } }
  }
  if (!TH && K.nv) { const g = dGeom(K, true); const m = new THREE.Mesh(g, DEPTH.mats.thing); m.castShadow = true; m.receiveShadow = true; G0.add(m); keep.push(g); }
}
// the highways in 3D (from the SKYWAY engine's own layout): each deck a slab at its height with the engine's painting
// of the carriageway on top (lanes, joints, snow; without its flat traffic), jersey barriers down both sides and the
// median, light poles, a broken gap with the deck's raw ends where a span collapsed; the interchange ramps as ribbons
// on their own heights; the cars stuck up there are real 3D vehicles
function dPierH(c, r) {
  const S = typeof skyInfo === 'function' ? skyInfo(c) : null; if (!S) return 0;
  const x = r.x / SCL + r.w / SCL / 2, y = r.y / SCL + r.h / SCL / 2;   // (block units)
  for (const d of S.decks) if (x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h) return d.h0 - 1.3;
  let best = 0, bd = 1e9; for (const rp of S.ramps) for (let k = 0; k < rp.pts.length; k += 2) { const dd = Math.hypot(rp.pts[k] - x, rp.pts[k + 1] - y); if (dd < bd && dd < rp.w) { bd = dd; best = rp.h - 1; } }
  return best;
}
function dSkyCanvas(c, S) {
  const px = Math.min(Q.chunkScale * c.k, 2048 / CH) * 0.72 * (TOUCH ? 0.8 : 1), can = document.createElement('canvas'); can.width = can.height = Math.max(8, Math.round(CH * px));
  const g = can.getContext('2d'); g.scale(px, px); g.translate(-c.ox, -c.oy);
  const bio = c.bio, win = winterOn(c) || bio === 'snow', conc = bio === 'desert' ? '#8a7c66' : bio === 'snow' ? '#8e979f' : bio === 'ash' ? '#6a6a6d' : bio === 'burning' ? '#4e4a46' : '#595c62';
  SKY.flat3 = true; try { for (const d of S.decks) skyDeck(g, c, d, conc, win); } catch (e) { coreHurt('SKYWAY', e); } finally { SKY.flat3 = false; }
  return can;
}
function depthSkyway(c, G0, keep, TH) {
  const S = typeof skyInfo === 'function' ? skyInfo(c) : null; if (!S) return;
  const U = DEPTH.upm, ox = c.ox, oy = c.oy, bx = (x) => (x - ox) * SCL / U, bz = (y) => (y - oy) * SCL / U, mu = SCL / U;   // block units to the block's metres
  const conc = dLin(c.bio === 'desert' ? '#8a7c66' : c.bio === 'snow' ? '#8e979f' : c.bio === 'ash' ? '#6a6a6d' : c.bio === 'burning' ? '#4e4a46' : '#62656b'), under = dLin('#3a3c40'), barC = dLin('#a9abad'), pole = dLin('#3a3d42');
  const T = dGB(), K = TH || dGB(), H = dGB(), P = dGB(), Gl = dGB(), Tr = dGB(), BB = K, SLAB = 1.3;
  if (S.decks.length) {
    const can = dSkyCanvas(c, S), tex = new THREE.CanvasTexture(can); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, DEPTH.R.capabilities.getMaxAnisotropy()); keep.push(tex);
    const sz = CH * mu;
    for (const d of S.decks) {
      const X0 = Math.max(d.x, ox), X1 = Math.min(d.x + d.w, ox + CH), Y0 = Math.max(d.y, oy), Y1 = Math.min(d.y + d.h, oy + CH); if (X1 <= X0 || Y1 <= Y0) continue;
      const v = d.v, h0 = d.h0, gp = skyGap(d.ocx, d.ocy, v), o0 = v ? d.ocy * CH : d.ocx * CH;
      // the pieces along its length either side of a collapsed span
      const a0 = v ? Y0 : X0, a1 = v ? Y1 : X1, cuts = gp ? [[a0, Math.min(a1, o0 + gp.at)], [Math.max(a0, o0 + gp.at + gp.len), a1]] : [[a0, a1]];
      for (const [s0, s1] of cuts) {
        if (s1 - s0 < 1) continue;
        const x0 = bx(v ? X0 : s0), x1 = bx(v ? X1 : s1), z0 = bz(v ? s0 : Y0), z1 = bz(v ? s1 : Y1);
        const uv = (x, z) => [x / sz, 1 - z / sz];
        dQuad(T, [x0, h0, z1], [x1, h0, z1], [x1, h0, z0], [x0, h0, z0], [0, 1, 0], [1, 1, 1], null, uv(x0, z1), uv(x1, z1), uv(x1, z0), uv(x0, z0));
        dQuad(K, [x0, h0 - SLAB, z0], [x1, h0 - SLAB, z0], [x1, h0 - SLAB, z1], [x0, h0 - SLAB, z1], [0, -1, 0], under, DL_CON);
        // the long sides (where they are in this block) and the raw ends at a gap
        if (v) { if (d.x >= ox) dQuad(K, [x0, h0 - SLAB, z0], [x0, h0 - SLAB, z1], [x0, h0, z1], [x0, h0, z0], [-1, 0, 0], conc, DL_CON); if (d.x + d.w <= ox + CH) dQuad(K, [x1, h0 - SLAB, z1], [x1, h0 - SLAB, z0], [x1, h0, z0], [x1, h0, z1], [1, 0, 0], conc, DL_CON); }
        else { if (d.y >= oy) dQuad(K, [x1, h0 - SLAB, z0], [x0, h0 - SLAB, z0], [x0, h0, z0], [x1, h0, z0], [0, 0, -1], conc, DL_CON); if (d.y + d.h <= oy + CH) dQuad(K, [x0, h0 - SLAB, z1], [x1, h0 - SLAB, z1], [x1, h0, z1], [x0, h0, z1], [0, 0, 1], conc, DL_CON); }
        if (gp) {
          if (s1 === Math.min(a1, o0 + gp.at) && s1 < a1) { if (v) dQuad(K, [x0, h0 - SLAB, z1], [x1, h0 - SLAB, z1], [x1, h0, z1], [x0, h0, z1], [0, 0, 1], under, DL_CON); else dQuad(K, [x1, h0 - SLAB, z1], [x1, h0 - SLAB, z0], [x1, h0, z0], [x1, h0, z1], [1, 0, 0], under, DL_CON); }
          if (s0 === Math.max(a0, o0 + gp.at + gp.len) && s0 > a0) { if (v) dQuad(K, [x1, h0 - SLAB, z0], [x0, h0 - SLAB, z0], [x0, h0, z0], [x1, h0, z0], [0, 0, -1], under, DL_CON); else dQuad(K, [x0, h0 - SLAB, z0], [x0, h0 - SLAB, z1], [x0, h0, z1], [x0, h0, z0], [-1, 0, 0], under, DL_CON); }
        }
        // jersey barriers: both edges and the median (where the painting has them)
        const W2 = v ? d.w : d.h, e0 = v ? d.x : d.y;
        for (const [o, t] of [[1, 7], [W2 - 8, 7], [W2 / 2 - 4, 8]]) { const q0 = e0 + o, q1 = q0 + t; if (v) { if (q1 <= ox || q0 >= ox + CH) continue; dBox(BB, bx(Math.max(q0, ox)), h0, z0, bx(Math.min(q1, ox + CH)), h0 + 0.85, z1, barC, DL_CON); } else { if (q1 <= oy || q0 >= oy + CH) continue; dBox(BB, x0, h0, bz(Math.max(q0, oy)), x1, h0 + 0.85, bz(Math.min(q1, oy + CH)), barC, DL_CON); } }
      }
      // light poles on the barriers (the lamps are the lighting engine's)
      const Ln = v ? d.h : d.w;
      for (let a = (v ? 260 : 100), k = 0; a < Ln; a += 320, k++) {
        const W2 = v ? d.w : d.h, o = k % 2 ? W2 - 6 : 6, px = v ? d.x + o : d.x + a, py = v ? d.y + a : d.y + o; if (px < ox || px >= ox + CH || py < oy || py >= oy + CH) continue;
        if (gp && (v ? py : px) > o0 + gp.at - 10 && (v ? py : px) < o0 + gp.at + gp.len + 10) continue;
        const X = bx(px), Zz = bz(py), dx = v ? (k % 2 ? -1 : 1) : 0, dz = v ? 0 : (k % 2 ? -1 : 1);
        dCyl(K, X, h0 + 0.85, Zz, 0.1, 0.08, h0 + 9.5, 6, pole, DL_MET); dBoxR(K, X + dx * 0.9, h0 + 9.3, Zz + dz * 0.9, 0.9, 0.05, h0 + 9.45, Math.atan2(dz, dx), pole, DL_MET);
        dBoxR(H, X + dx * 1.7, h0 + 9.1, Zz + dz * 1.7, 0.36, 0.16, h0 + 9.3, Math.atan2(dz, dx), [1, 1, 1]);
      }
      // the traffic left up here: real vehicles on this block's own stretch
      if (d.own) {
        const R = chunkRng(d.ocx, d.ocy, v ? 0x3d77 : 0x3d1e), n = 2 + Math.floor(R() * 5), bio = distAt(d.ocx, d.ocy).bio, W2 = v ? d.w : d.h;
        for (let i = 0; i < n; i++) {
          const lane = Math.floor(R() * 4), o = [W2 * 0.18, W2 * 0.37, W2 * 0.63, W2 * 0.82][lane], fd = lane < 2 ? -1 : 1, vt = vehPick(R, 'highway', 220), V = VEH[vt];
          const a = ROAD + R() * (Ln - ROAD - V.L - 10); if (gp && a + V.L > gp.at - 10 && a < gp.at + gp.len + 10) continue;
          const rr = v ? { x: d.x + o - V.W / 2, y: d.y + a, w: V.W, h: V.L } : { x: d.x + a, y: d.y + o - V.W / 2, w: V.L, h: V.W }, dr = vehDress(R, vt);
          const car = { vt: dr.vt, col: dr.col, s: dr.s, fd: v ? -fd : fd, burnt: R() < (bio === 'burning' || bio === 'ash' ? 0.7 : 0.18), yb: h0, k: 'car' };
          dVehicle(car.burnt ? K : P, Gl, Tr, car, bx(rr.x), bz(rr.y), bx(rr.x + rr.w), bz(rr.y + rr.h));
        }
      }
    }
    if (T.nv) { const g = dGeom(T); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 0.88, metalness: 0, envMapIntensity: 0.6 })); m.castShadow = true; m.receiveShadow = true; G0.add(m); keep.push(g, m.material); }
  }
  // the interchange ramps: ribbons on their own heights (each block builds the stretches whose middle is over it)
  for (const rp of S.ramps) {
    const p = rp.pts, hw = rp.w / 2, h0 = rp.h;
    for (let k = 0; k + 3 < p.length; k += 2) {
      const ax = p[k], ay = p[k + 1], bx2 = p[k + 2], by2 = p[k + 3], mx = (ax + bx2) / 2, my = (ay + by2) / 2; if (mx < ox || mx >= ox + CH || my < oy || my >= oy + CH) continue;
      const dx = bx2 - ax, dy = by2 - ay, ln = Math.hypot(dx, dy) || 1, nx = -dy / ln * hw, ny = dx / ln * hw, ex = dx / ln * 2, ey = dy / ln * 2;   // (2 units of overlap hides the joints on the bends)
      const A = [bx(ax - ex + nx), bz(ay - ey + ny)], Bq = [bx(bx2 + ex + nx), bz(by2 + ey + ny)], C = [bx(bx2 + ex - nx), bz(by2 + ey - ny)], D = [bx(ax - ex - nx), bz(ay - ey - ny)];
      const up = (P0) => [P0[0], h0, P0[1]], dn = (P0) => [P0[0], h0 - SLAB, P0[1]], cr = (q, r2) => (r2[0] - q[0]);
      // top (counter-clockwise from above whichever way the ribbon turns), underside, both edges, barriers
      const ccw = ((Bq[0] - A[0]) * (D[1] - A[1]) - (D[0] - A[0]) * (Bq[1] - A[1])) < 0;
      if (ccw) dQuad(K, up(A), up(Bq), up(C), up(D), [0, 1, 0], conc, DL_ASP); else dQuad(K, up(A), up(D), up(C), up(Bq), [0, 1, 0], conc, DL_ASP);
      if (ccw) dQuad(K, dn(A), dn(D), dn(C), dn(Bq), [0, -1, 0], under, DL_CON); else dQuad(K, dn(A), dn(Bq), dn(C), dn(D), [0, -1, 0], under, DL_CON);
      for (const [E0, E1, sgn] of [[A, Bq, 1], [C, D, 1]]) { const ex2 = E1[0] - E0[0], ez2 = E1[1] - E0[1], el = Math.hypot(ex2, ez2) || 1; let n = [-ez2 / el, 0, ex2 / el]; const midx = (E0[0] + E1[0]) / 2 - bx(mx), midz = (E0[1] + E1[1]) / 2 - bz(my); let q0 = E0, q1 = E1; if (n[0] * midx + n[2] * midz < 0) { q0 = E1; q1 = E0; n = [-n[0], 0, -n[2]]; } dQuad(K, [q0[0], h0 - SLAB, q0[1]], [q1[0], h0 - SLAB, q1[1]], [q1[0], h0 + 0.85, q1[1]], [q0[0], h0 + 0.85, q0[1]], n, barC, null); void sgn; void cr; }
    }
  }
  if (!TH && K.nv) { const g = dGeom(K, true); const m = new THREE.Mesh(g, DEPTH.mats.thing); m.castShadow = true; m.receiveShadow = true; G0.add(m); keep.push(g); }
  if (H.nv) { const g = dGeom(H); const m = new THREE.Mesh(g, DEPTH.mats.lampHead); G0.add(m); keep.push(g); }
  if (P.nv) { const g = dGeom(P); const m = new THREE.Mesh(g, DEPTH.mats.paint); m.castShadow = true; m.receiveShadow = true; G0.add(m); keep.push(g); }
  if (Gl.nv) { const g = dGeom(Gl); const m = new THREE.Mesh(g, DEPTH.mats.glass); G0.add(m); keep.push(g); }
  if (Tr.nv) { const g = dGeom(Tr); const m = new THREE.Mesh(g, DEPTH.mats.rubber); G0.add(m); keep.push(g); }
}
// a gable roof over a rectangle, the ridge along the longer side
function dRoofGable(B, x0, z0, x1, z1, y0, rise, alongX, col, aux) {
  const xm = (x0 + x1) / 2, zm = (z0 + z1) / 2, y1 = y0 + rise, o = 0.4, c2 = [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8];
  if (alongX) {
    const nz = rise / Math.hypot(rise, (z1 - z0) / 2), ny = (z1 - z0) / 2 / Math.hypot(rise, (z1 - z0) / 2);
    dQuad(B, [x1 + o, y0, z0 - o], [x0 - o, y0, z0 - o], [x0 - o, y1, zm], [x1 + o, y1, zm], [0, ny, -nz], col, aux);
    dQuad(B, [x0 - o, y0, z1 + o], [x1 + o, y0, z1 + o], [x1 + o, y1, zm], [x0 - o, y1, zm], [0, ny, nz], col, aux);
    for (const [x, n] of [[x0, -1], [x1, 1]]) { const v0 = B.nv; B.p.push(x, y0, n < 0 ? z1 : z0, x, y0, n < 0 ? z0 : z1, x, y1, zm); for (let k = 0; k < 3; k++) { B.n.push(n, 0, 0); B.c.push(c2[0], c2[1], c2[2]); B.a.push(aux ? aux[0] : 0, 0, 0, 0); B.f.push(0, 0); B.u.push(0, 0); } B.i.push(v0, v0 + 1, v0 + 2); B.nv += 3; }
  } else {
    const nx = rise / Math.hypot(rise, (x1 - x0) / 2), ny = (x1 - x0) / 2 / Math.hypot(rise, (x1 - x0) / 2);
    dQuad(B, [x0 - o, y0, z0 - o], [x0 - o, y0, z1 + o], [xm, y1, z1 + o], [xm, y1, z0 - o], [-nx, ny, 0], col, aux);
    dQuad(B, [x1 + o, y0, z1 + o], [x1 + o, y0, z0 - o], [xm, y1, z0 - o], [xm, y1, z1 + o], [nx, ny, 0], col, aux);
    for (const [z, n] of [[z0, -1], [z1, 1]]) { const v0 = B.nv; B.p.push(n < 0 ? x0 : x1, y0, z, n < 0 ? x1 : x0, y0, z, xm, y1, z); for (let k = 0; k < 3; k++) { B.n.push(0, 0, n); B.c.push(c2[0], c2[1], c2[2]); B.a.push(aux ? aux[0] : 0, 0, 0, 0); B.f.push(0, 0); B.u.push(0, 0); } B.i.push(v0, v0 + 1, v0 + 2); B.nv += 3; }
  }
}
// a vehicle at its real size (the garage's dimensions), shaped from a side profile of its kind: bumper, bonnet,
// windscreen, roof, rear window and boot for a car (narrower over the cabin, with side windows and a B-pillar), a box with
// a raked windscreen for vans, buses and trucks (a lower cab before a truck's body, a band of windows down a bus), wheel
// arches cut into the sides with the tyres and hubs in them, head and tail lamps; burnt out it is a rust-black shell on
// its rims, and a flipped one lies on its roof
const D_VAX = {   // wheel radius, ground clearance, axle positions from each end (metres)
  car: [0.31, 0.16, [0.82], [0.78]], tall: [0.38, 0.24, [0.85], [0.85]], van: [0.36, 0.22, [0.85], [1.0]], bus: [0.5, 0.3, [2.3], [2.9]],
  truck: [0.5, 0.32, [1.3], [1.5, 2.6]], semi: [0.52, 0.34, [1.25, 4.6], [1.2, 2.5]], apc: [0.55, 0.42, [1.0, 2.6], [1.0, 2.6]], moto: [0.3, 0.05, [0.3], [0.3]]
};
function dVehClass(vt) { return LUX_CAB[vt] ? (vt === 'suv' || vt === 'pickup' || vt === 'humvee' ? 'tall' : 'car') : vt === 'bus' || vt === 'school' || vt === 'camper' ? 'bus' : vt === 'semi' ? 'semi' : vt === 'apc' ? 'apc' : vt === 'moto' ? 'moto' : vt === 'box' || vt === 'garbage' || vt === 'fire' ? 'truck' : 'van'; }
function dVehicle(P, Gl, Tr, r, x0, z0, x1, z1) {
  const vt = r.vt || 'sedan', V = (typeof VEH !== 'undefined' && VEH[vt]) || { h: 1.5, g: [[0.08, 0.26], [-0.36, -0.23]] }, horiz = (x1 - x0) >= (z1 - z0);
  const L = horiz ? x1 - x0 : z1 - z0, Wd = horiz ? z1 - z0 : x1 - x0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, a = horiz ? (r.fd < 0 ? Math.PI : 0) : (r.fd < 0 ? -Math.PI / 2 : Math.PI / 2);
  const h = V.h || 1.5, cls = dVehClass(vt), AX = D_VAX[cls], burnt = !!r.burnt, flip = !!r.flip, cab = LUX_CAB[vt];
  const col = burnt ? dLin(['#2e2420', '#3a2a22', '#26201c'][(r.s >>> 3) % 3]) : dLin(r.col || '#6b6b6b'), trim = burnt ? [0.025, 0.02, 0.018] : [0.022, 0.022, 0.025];
  const ca = Math.cos(a), sa = Math.sin(a), drop = burnt ? AX[0] * 0.3 : 0, H0 = h + 0.04, yb = r.yb || 0;
  // local (along, up, across) to the block's metres; a flipped vehicle is turned over its long axis onto its roof
  const W3 = (lx, ly, lz) => { let y = ly - drop, z = lz; if (flip) { y = H0 - ly; z = -lz; } return [cx + lx * ca - z * sa, Math.max(0, y) + yb, cz + lx * sa + z * ca]; };
  const N3 = (nx, ny, nz) => { if (flip) { ny = -ny; nz = -nz; } return [nx * ca - nz * sa, ny, nx * sa + nz * ca]; };
  const quad = (B, p0, p1, p2, p3, n, c) => dQuad(B, W3(p0[0], p0[1], p0[2]), W3(p1[0], p1[1], p1[2]), W3(p2[0], p2[1], p2[2]), W3(p3[0], p3[1], p3[2]), N3(n[0], n[1], n[2]), c, null);
  const lbox = (B, ax0, ax1, ay0, ay1, az0, az1, c) => {
    quad(B, [ax1, ay0, az0], [ax1, ay0, az1], [ax1, ay1, az1], [ax1, ay1, az0], [1, 0, 0], c); quad(B, [ax0, ay0, az1], [ax0, ay0, az0], [ax0, ay1, az0], [ax0, ay1, az1], [-1, 0, 0], c);
    quad(B, [ax0, ay0, az1], [ax0, ay1, az1], [ax1, ay1, az1], [ax1, ay0, az1], [0, 0, 1], c); quad(B, [ax1, ay0, az0], [ax1, ay1, az0], [ax0, ay1, az0], [ax0, ay0, az0], [0, 0, -1], c);
    quad(B, [ax0, ay1, az0], [ax1, ay1, az0], [ax1, ay1, az1], [ax0, ay1, az1], [0, 1, 0], c);
  };
  if (cls === 'moto') {
    lbox(P, -L * 0.32, L * 0.3, 0.42, 0.7, -0.1, 0.1, col); lbox(P, -L * 0.3, 0, 0.7, 0.8, -0.13, 0.13, trim); lbox(P, L * 0.22, L * 0.3, 0.7, 1.05, -0.04, 0.04, trim);
    for (const wx of [L / 2 - 0.32, -L / 2 + 0.32]) dVehWheel(Tr, P, W3, N3, wx, 0.3, 0, 0.3, 0.1, burnt);
    return;
  }
  // the side profile, front to back over the top: [along, up, kind of the edge that starts here] (p paint, g glass, k trim)
  const gc = AX[1], prof = [];
  let hb, tumble, win = null;
  if (cab) {
    hb = h * cab; tumble = 0.15;
    const ws = (V.g && V.g[0]) || [0.08, 0.26], rw = (V.g && V.g[1]) || [-0.36, -0.23], bed = vt === 'pickup';
    prof.push([L / 2 - 0.05, gc + 0.03, 'k'], [L / 2, hb * 0.6, 'p'], [L / 2 - 0.12, hb * 0.97, 'p'], [ws[1] * L, hb, 'g'], [ws[0] * L, h, 'p'], [rw[1] * L, h, 'g'], [rw[0] * L, hb, bed ? 'k' : 'p']);
    prof.push([Math.min(-L / 2 + 0.1, rw[0] * L - 0.03), hb * 0.96, 'k'], [-L / 2, hb * 0.6, 'k'], [-L / 2 + 0.05, gc + 0.03, '']);
    win = { f0: [ws[1] * L, hb], f1: [ws[0] * L, h], r1: [rw[1] * L, h], r0: [rw[0] * L, hb], split: vt !== 'coupe' && vt !== 'pickup' && vt !== 'humvee' };
  } else {
    const ws = (V.g && V.g[0]) || [0.4, 0.47], truck = cls === 'truck' || cls === 'semi', cabH = truck ? h * 0.8 : h, apc = cls === 'apc';
    hb = h * 0.5; tumble = 0.04;
    if (apc) prof.push([L / 2 - 0.05, gc, 'p'], [L / 2, h * 0.45, 'p'], [L * 0.36, h * 0.92, 'p'], [L * 0.28, h, 'p'], [-L / 2 + 0.1, h, 'p'], [-L / 2, h * 0.85, 'p'], [-L / 2 + 0.05, gc, '']);
    else {
      const fx = Math.min(L / 2 - 0.03, ws[1] * L), tx = Math.min(fx - 0.12, ws[0] * L);
      prof.push([L / 2 - 0.03, gc, 'k'], [L / 2, h * 0.3, 'p'], [fx, h * 0.46, 'g'], [tx, cabH, 'p']);
      if (truck) prof.push([tx - L * 0.12, cabH, 'p'], [tx - L * 0.125, h, 'p']);
      prof.push([-L / 2 + 0.03, h, 'p'], [-L / 2, h * 0.3, 'k'], [-L / 2 + 0.02, gc, '']);
      win = { box: true, front: tx, cabTop: cabH, truck: truck, band: cls === 'bus' };
    }
  }
  const hw = (y) => Wd / 2 - 0.02 - (y > hb ? tumble * clamp((y - hb) / Math.max(0.1, h - hb), 0, 1) : 0);
  // the body's top and ends: a strip across for every edge of the profile
  for (let i = 0; i + 1 < prof.length; i++) {
    const A = prof[i], Bp = prof[i + 1], dx = Bp[0] - A[0], dy = Bp[1] - A[1], ln = Math.hypot(dx, dy) || 1, n = [dy / ln, -dx / ln, 0];
    const wa = hw(A[1]), wb = hw(Bp[1]), tgt = A[2] === 'g' && !burnt ? Gl : P, c = A[2] === 'k' || (A[2] === 'g' && burnt) ? trim : col;
    quad(tgt, [A[0], A[1], -wa], [Bp[0], Bp[1], -wb], [Bp[0], Bp[1], wb], [A[0], A[1], wa], n, c);
  }
  // the sides: the profile closed along the bottom, with an arch over every wheel
  const wr = AX[0], arR = wr + 0.06, axles = AX[2].map(d => L / 2 - d).concat(AX[3].map(d => -L / 2 + d)).sort((p, q) => p - q), bottom = [];
  for (const ax of axles) { const n = 7; for (let k = 0; k <= n; k++) { const t = Math.PI - k / n * Math.PI; bottom.push([ax + Math.cos(t) * arR, Math.max(gc, wr + Math.sin(t) * arR)]); } }
  const contour = prof.map(q => [q[0], q[1]]).concat(bottom.filter(q => q[0] > -L / 2 + 0.06 && q[0] < L / 2 - 0.06));
  const tris = THREE.ShapeUtils.triangulateShape(contour.map(q => new THREE.Vector2(q[0], q[1])), []);
  for (const sd of [1, -1]) for (const t of tris) {
    let i0 = t[0], i1 = t[1], i2 = t[2]; const A = contour[i0], Bq = contour[i1], C = contour[i2];
    const ar = (Bq[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (Bq[1] - A[1]); if ((ar > 0) !== (sd > 0)) { const tt = i1; i1 = i2; i2 = tt; }
    const v0 = P.nv;
    for (const ii of [i0, i1, i2]) { const q = contour[ii], w = W3(q[0], q[1], sd * hw(q[1])), nn = N3(0, q[1] > hb ? 0.3 : 0, sd * (q[1] > hb ? 0.95 : 1)); P.p.push(w[0], w[1], w[2]); P.n.push(nn[0], nn[1], nn[2]); P.c.push(col[0], col[1], col[2]); P.a.push(0, 0, 0, 0); P.f.push(0, 0); P.u.push(0, 0); }
    P.i.push(v0, v0 + 1, v0 + 2); P.nv += 3;
  }
  // the dark lining inside each arch
  for (let i = 0; i + 1 < bottom.length; i++) { const A = bottom[i], Bq = bottom[i + 1]; if (Math.abs(Bq[0] - A[0]) > arR * 1.2) continue; const dx = Bq[0] - A[0], dy = Bq[1] - A[1], ln = Math.hypot(dx, dy) || 1; quad(P, [A[0], A[1], -hw(A[1])], [Bq[0], Bq[1], -hw(Bq[1])], [Bq[0], Bq[1], hw(Bq[1])], [A[0], A[1], hw(A[1])], [dy / ln, -dx / ln, 0], [0.012, 0.012, 0.014]); }
  // windows on the sides (glass; a burnt one is a black hole)
  const GW = burnt ? P : Gl, gcol = burnt ? [0.01, 0.008, 0.007] : [0.02, 0.025, 0.03];
  const pane = (xa, xb, ya, yb, xa2, xb2) => { for (const sd of [1, -1]) { const za = sd * (hw(ya) + 0.008), zb = sd * (hw(yb) + 0.008), n = [0, 0.2, sd * 0.98];
    if (sd > 0) quad(GW, [xa, ya, za], [xb, ya, za], [xb2, yb, zb], [xa2, yb, zb], n, gcol); else quad(GW, [xa2, yb, zb], [xb2, yb, zb], [xb, ya, za], [xa, ya, za], n, gcol); } };
  if (win && !win.box) {
    const y0 = hb + 0.06, y1 = h - 0.07, lerpX = (P0, P1, y) => P0[0] + (P1[0] - P0[0]) * clamp((y - P0[1]) / ((P1[1] - P0[1]) || 1), 0, 1);
    const fb = lerpX(win.f0, win.f1, y0) - 0.1, ft = lerpX(win.f0, win.f1, y1) - 0.1, rb = lerpX(win.r0, win.r1, y0) + 0.1, rt = lerpX(win.r0, win.r1, y1) + 0.1;
    if (win.split) { const mb = (fb + rb) / 2, mt = (ft + rt) / 2; pane(mb + 0.05, fb, y0, y1, mt + 0.05, ft); pane(rb, mb - 0.05, y0, y1, rt, mt - 0.05); }
    else pane(rb, fb, y0, y1, rt, ft);
  } else if (win && win.box) {
    const y0 = h * 0.5, y1 = win.cabTop - 0.16;
    pane(win.front - 0.95, win.front - 0.12, y0, y1, win.front - 0.95, win.front - 0.18);
    if (win.band) { const xe = win.front - 1.2, xs = -L / 2 + 0.6, n = Math.max(1, Math.round((xe - xs) / 1.25)), st = (xe - xs) / n; for (let k = 0; k < n; k++) pane(xs + k * st + 0.07, xs + (k + 1) * st - 0.07, y0, h * 0.86, xs + k * st + 0.07, xs + (k + 1) * st - 0.07); }
  }
  // lamps: white-ish heads, red tails, an amber or a red-blue bar on the emergency ones
  if (!burnt) {
    const ly0 = cab ? hb * 0.72 : h * 0.24, ly1 = cab ? hb * 0.88 : h * 0.3, lz = Wd / 2 - 0.3;
    for (const sd of [1, -1]) { lbox(P, L / 2 - 0.08, L / 2 + 0.01, ly0, ly1, sd * lz - 0.17, sd * lz + 0.17, [0.75, 0.74, 0.68]); lbox(P, -L / 2 - 0.01, -L / 2 + 0.08, ly0, ly1, sd * lz - 0.15, sd * lz + 0.15, [0.42, 0.015, 0.015]); }
    if (vt === 'police' || vt === 'ambulance' || vt === 'fire') { const ry = vt === 'police' ? h : h, rx = vt === 'police' ? 0 : L / 2 - 0.5; lbox(P, rx - 0.12, rx + 0.12, ry, ry + 0.12, -0.55, 0, [0.6, 0.02, 0.02]); lbox(P, rx - 0.12, rx + 0.12, ry, ry + 0.12, 0, 0.55, vt === 'police' ? [0.02, 0.06, 0.6] : [0.6, 0.02, 0.02]); }
    if (vt === 'taxi') lbox(P, -0.25, 0.25, h, h + 0.16, -0.12, 0.12, [0.85, 0.7, 0.1]);
  }
  // wheels: tyres with hubs in the arches (a burnt one sits on its rims)
  const ww = cls === 'car' ? 0.21 : 0.28, wz = Wd / 2 - ww / 2 - 0.03;
  for (const ax of axles) for (const sd of [1, -1]) dVehWheel(Tr, P, W3, N3, ax, wr, sd * wz, wr, ww, burnt, sd);
}
// a wheel lying across the vehicle: a tyre (n-sided, its tread and its outer wall) and a hub disc on the outer side
function dVehWheel(Tr, P, W3, N3, lx, ly, lz, r, w, burnt, sd) {
  const n = 12, z0 = lz - w / 2, z1 = lz + w / 2, s = sd || 1, rr = burnt ? r * 0.72 : r, tc = burnt ? [0.08, 0.06, 0.05] : [0.03, 0.03, 0.035];
  const B = burnt ? P : Tr, pt = (k, rad, z) => { const t = k / n * TAU; return [lx + Math.cos(t) * rad, ly + Math.sin(t) * rad, z]; };
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n * TAU, a0 = pt(k, rr, z0), a1 = pt(k + 1, rr, z0), b1 = pt(k + 1, rr, z1), b0 = pt(k, rr, z1);
    const c = [Math.cos(t), Math.sin(t), 0];
    dQuad(B, W3(a0[0], a0[1], a0[2]), W3(a1[0], a1[1], a1[2]), W3(b1[0], b1[1], b1[2]), W3(b0[0], b0[1], b0[2]), N3(c[0], c[1], c[2]), tc, null);
    // the outer wall, then the hub on it
    const zo = s > 0 ? z1 : z0, o0 = pt(k, rr, zo), o1 = pt(k + 1, rr, zo), ctr = [lx, ly, zo], hb0 = pt(k, rr * 0.62, zo + s * 0.006), hb1 = pt(k + 1, rr * 0.62, zo + s * 0.006), hc = [lx, ly, zo + s * 0.012];
    const tri = (BB, q0, q1, q2, col) => { const v0 = BB.nv, nn = N3(0, 0, s), pp = s > 0 ? [q0, q1, q2] : [q0, q2, q1]; for (const q of pp) { const w3 = W3(q[0], q[1], q[2]); BB.p.push(w3[0], w3[1], w3[2]); BB.n.push(nn[0], nn[1], nn[2]); BB.c.push(col[0], col[1], col[2]); BB.a.push(0, 0, 0, 0); BB.f.push(0, 0); BB.u.push(0, 0); } BB.i.push(v0, v0 + 1, v0 + 2); BB.nv += 3; };
    tri(B, ctr, o0, o1, tc);
    if (!burnt) tri(P, hc, hb0, hb1, [0.42, 0.43, 0.45]);
  }
}
// the street furniture the ground painting listed: a hydrant, a traffic signal over the crossing, a mailbox, a bus
// shelter, newspaper boxes
function dFurniture(B, Gl, f, x, z, curb) {
  const y = curb;
  if (f.k === 'hydrant') { const c = dLin(f.col || '#c03a2e'); dCyl(B, x, y, z, 0.13, 0.11, y + 0.62, 8, c, DL_MET); dCyl(B, x, y + 0.62, z, 0.11, 0.02, y + 0.76, 8, c, DL_MET); dBoxR(B, x, y + 0.36, z, 0.2, 0.05, y + 0.44, 0, c, DL_MET); }
  else if (f.k === 'signal') { const c = dLin('#3a3d42'); dCyl(B, x, y, z, 0.1, 0.08, y + 5.4, 6, c, DL_MET); const ax = x - 2.6, az = z - 2.3; dBoxR(B, (x + ax) / 2, y + 5.3, (z + az) / 2, Math.hypot(2.6, 2.3) / 2, 0.05, y + 5.42, Math.atan2(-2.3, -2.6), c, DL_MET); dBoxR(B, ax, y + 4.5, az, 0.18, 0.18, y + 5.32, 0.7, dLin('#1a1b1e')); }
  else if (f.k === 'mailbox') { dCyl(B, x, y, z, 0.05, 0.05, y + 1.0, 5, dLin('#3a2a1e')); dBoxR(B, x, y + 1.0, z, 0.24, 0.12, y + 1.26, 0, dLin(f.col || '#2f4f6b')); }
  else if (f.k === 'busstop') { const c = dLin('#4a4d52'); const L = x + 2.0; dBox(B, x, y, z, x + 0.08, y + 2.4, z + 0.08, c, DL_MET); dBox(B, x + 3.9, y, z, x + 3.98, y + 2.4, z + 0.08, c, DL_MET); dBox(B, x, y + 2.4, z - 0.1, x + 3.98, y + 2.5, z + 1.0, c, DL_MET); dBox(Gl, x + 0.08, y + 0.3, z, x + 3.9, y + 2.3, z + 0.05, [0.08, 0.12, 0.14]); dBox(B, x + 0.4, y + 0.42, z + 0.4, x + 3.5, y + 0.5, z + 0.8, c); void L; }
  else if (f.k === 'newsbox') { dBox(B, x - 0.24, y, z - 0.2, x + 0.24, y + 1.05, z + 0.2, dLin(f.col || '#2f6fb0')); }
}
// shared geometries (built once): a tree's trunk and crown, a flame's quad
function depthTreeGeo() {
  if (DEPTH.geo.tree) return DEPTH.geo.tree;
  const trunk = new THREE.CylinderGeometry(0.75, 1, 1, 7, 1, false); trunk.translate(0, 0.5, 0);
  const crown = new THREE.IcosahedronGeometry(1, 2), p = crown.attributes.position, R = Z.mulberry32(0x7ee);
  // lumpy: each vertex pushed in or out by the noise of where it is
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 0.82 + 0.3 * (Math.sin(x * 4.1 + z * 2.3) * 0.5 + Math.sin(y * 5.3 + x * 1.7) * 0.5) * 0.5 + R() * 0.08; p.setXYZ(i, x * k, y * k * 0.9, z * k); }
  crown.computeVertexNormals();
  return DEPTH.geo.tree = { trunk: trunk, crown: crown };
}
function depthBushGeo() {
  if (DEPTH.geo.bush) return DEPTH.geo.bush;
  const bush = new THREE.IcosahedronGeometry(1, 1), p = bush.attributes.position, R = Z.mulberry32(0xb05);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 0.78 + 0.32 * R(); p.setXYZ(i, x * k, Math.max(-0.1, y) * k * 0.85 + 0.55, z * k); }
  bush.computeVertexNormals();
  // a tuft: five blades leaning out from the middle
  const P = [], N = [], I = []; let v = 0;
  for (let b = 0; b < 5; b++) { const a = b / 5 * TAU + 0.3, c = Math.cos(a), s = Math.sin(a), w = 0.09, lx = -s * w, lz = c * w, tx = c * 0.32, tz = s * 0.32;
    P.push(lx, 0, lz, -lx, 0, -lz, tx, 1, tz); const nx = c, nz = s; N.push(nx, 0.4, nz, nx, 0.4, nz, nx, 0.4, nz); I.push(v, v + 1, v + 2, v, v + 2, v + 1); v += 3; }
  const grass = new THREE.BufferGeometry(); grass.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); grass.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); grass.setIndex(I);
  return DEPTH.geo.bush = { bush: bush, grass: grass };
}
function depthFlameGeo() { const g = new THREE.PlaneGeometry(1, 1); g.translate(0, 0.0, 0); return g; }
function depthChunkDrop(k) {
  const C = DEPTH.chunks.get(k); if (!C) return;
  try {
    DEPTH.scene && DEPTH.scene.remove(C.g);
    C.g.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
    for (const x of C.keep) { try { x.dispose(); } catch (e) { } }
    if (C.flames) C.flames.geometry.dispose();
  } catch (e) { coreHurt('DEPTH', e); }
  DEPTH.chunks.delete(k);
}

/* ---------- streaming: the blocks round the camera ---------- */
function depthStream() {
  const q = DQ[DEPTH.lvl], U = DEPTH.upm, cam3 = DEPTH.cam, px = cam3.position.x * U + DEPTH.ox, py = cam3.position.z * U + DEPTH.oy;
  // the ring of blocks round where the camera looks (a little ahead of it)
  const f = typeof HOVER !== 'undefined' ? HOVER.fwd : [0, 1];
  const lx = px + f[0] * CHS * 0.6, ly = py + f[1] * CHS * 0.6, ccx = Math.floor(lx / CHS), ccy = Math.floor(ly / CHS), R = q.ring;
  const want = [];
  for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) {
    const cx = ccx + i, cy = ccy + j, k = depthChunkKey(cx, cy), ring = Math.max(Math.abs(i), Math.abs(j));
    const C = DEPTH.chunks.get(k);
    if (C) { C.seen = frameNo; if (ring <= 0 && C.ring > 1 && !C.sharp) C.resharpen = 1; continue; }
    want.push([cx, cy, ring, i * i + j * j]);
  }
  want.sort((a, b) => a[3] - b[3]);
  // build the nearest missing block (two when the frame has room)
  if (DEPTH.season !== WORLD.season) { if (DEPTH.season != null) for (const C of DEPTH.chunks.values()) C.c.stale3 = 1; DEPTH.season = WORLD.season; }
  for (const [k, C] of DEPTH.chunks) if (C.c.stale3) { C.c.stale3 = 0; const ring = C.ring; depthChunkDrop(k); try { depthChunkBuild(C.c, ring); } catch (e) { coreHurt('DEPTH', e); } break; }
  const budget = PERF.fps && PERF.fps < targetFps() * 0.9 ? 1 : 2;
  for (let n = 0; n < Math.min(budget, want.length); n++) { const w = want[n]; try { depthChunkBuild(getChunk(w[0], w[1]), w[2]); } catch (e) { coreHurt('DEPTH', e); try { console.error(e); } catch (x) { } } }
  // drop the ones well out of the ring
  for (const [k, C] of DEPTH.chunks) { const dx = C.c.cx - ccx, dy = C.c.cy - ccy; if (Math.max(Math.abs(dx), Math.abs(dy)) > R + 1) depthChunkDrop(k); }
}
// the world's origin follows the player in steps of a block, so the numbers the graphics chip works with stay small
function depthRebase(x, y) {
  const s = CHS * 4, nx = Math.round(x / s) * s, ny = Math.round(y / s) * s;
  if (nx === DEPTH.ox && ny === DEPTH.oy) return;
  DEPTH.ox = nx; DEPTH.oy = ny;
  const U = DEPTH.upm; for (const C of DEPTH.chunks.values()) C.g.position.set((C.c.sx - nx) / U, 0, (C.c.sy - ny) / U);
}

/* ---------- light, sky and weather each frame ---------- */
const D_HAS3 = typeof THREE !== 'undefined', D_V = D_HAS3 ? new THREE.Vector3() : null, D_V2 = D_HAS3 ? new THREE.Vector3() : null, D_C = D_HAS3 ? new THREE.Color() : null, D_C2 = D_HAS3 ? new THREE.Color() : null;
function depthAtmos(rdt) {
  depthTileOffsets(); DU_GQ.value = DEPTH.lvl >= 1 ? 1 : 0;
  const S = DEPTH.scene, F = CORE.frame, sun = F.sun || {}, amb = LUX.amb || [1, 1, 1], day = LUX.day == null ? 1 : LUX.day, night = 1 - day;
  DEPTH.night = night; DU.uNight.value = clamp((night - 0.25) / 0.45 + (WX.dark || 0) * 0.3, 0, 1);
  DEPTH.wet = clamp(WX.wet || 0, 0, 1); DU.uWet.value = DEPTH.wet;
  DU.uSnow.value = clamp((WX.snowAcc || 0) * 0.6 + (WORLD.cur && WORLD.cur.bio === 'snow' ? 0.85 : 0) + (WORLD.season === 3 && WORLD.cur && TEMPERATE[WORLD.cur.bio] ? 0.5 : 0), 0, 1);
  DU.uTime.value = (G.time || 0); DU.uDust.value = clamp((WX.sand || 0) + (WX.ash || 0) * 0.6, 0, 1);
  // where the sun is (degrees from the lighting engine); below the horizon the moon takes over
  const hour = LUX.hour || 12, sea = WORLD.season || 0, rise = LUX_RISE[sea], set = LUX_SET[sea];
  let el, az;
  if (hour > rise && hour < set) { const p = (hour - rise) / (set - rise); el = LUX_SUNMAX[sea] * Math.sin(p * Math.PI); az = 90 + p * 180; }
  else { const nl = 24 - (set - rise), t = hour > set ? hour - set : hour + 24 - set, p = t / nl; el = -8 - 20 * Math.sin(p * Math.PI); az = 270 + p * 180; }
  const er = Math.max(-0.3, el) * Math.PI / 180, ar = az * Math.PI / 180;
  const sx = Math.sin(ar) * Math.cos(er), sy = Math.sin(er), sz = -Math.cos(ar) * Math.cos(er);
  const cover = clamp(WX.cloud != null ? WX.cloud : 0.2, 0, 1), storm = clamp((WX.storm || 0) + (WX.dark || 0), 0, 1), fog = clamp(WX.fog || 0, 0, 1), dust = DU.uDust.value;
  // the sky
  const su = DEPTH.sky.material.uniforms;
  su.sunPosition.value.set(sx, sy, sz);
  su.turbidity.value = 1.8 + cover * 7 + dust * 10 + fog * 6; su.rayleigh.value = 1.5 + day * 0.8 - cover * 0.9; su.mieCoefficient.value = 0.0035 + cover * 0.008 + dust * 0.03;
  DEPTH.sky.material.uniforms.up.value.set(0, 1, 0);
  // at night and in a storm the sky shader is near black; a dim blue night sky is added by the fog colour and the stars
  DEPTH.stars.material.uniforms.uK.value = clamp((night - 0.35) * 1.8, 0, 1) * (1 - cover * 0.85);
  // the moon opposite where the sun went
  const mel = Math.max(0.12, (night > 0.3 ? 0.55 : -0.5)), maz = ar + Math.PI;
  DEPTH.moon.position.set(DEPTH.cam.position.x + Math.sin(maz) * Math.cos(mel) * 350, DEPTH.cam.position.y + Math.sin(mel) * 350, DEPTH.cam.position.z - Math.cos(maz) * Math.cos(mel) * 350);
  DEPTH.moon.scale.setScalar(23); DEPTH.moon.lookAt(DEPTH.cam.position); DEPTH.moon.material.opacity = clamp((night - 0.3) * 2, 0, 1) * (1 - cover * 0.8);
  DEPTH.sky.position.copy(DEPTH.cam.position); DEPTH.stars.position.copy(DEPTH.cam.position);
  // the key light: the sun by day (warm and low at the ends of the day), the moon at night (cold, faint)
  const sunK = sun.on ? clamp(sun.k, 0, 1) : 0, isDay = el > 0;
  const kd = DEPTH.sun, tgt = HOVER.pivot || [0, 0, 0];
  if (isDay) { kd.position.set(tgt[0] + sx * 120, tgt[1] + Math.max(0.08, sy) * 120, tgt[2] + sz * 120); D_C.setRGB(1, 0.94 - (1 - sy) * 0.2, 0.86 - (1 - sy) * 0.42); }
  else { kd.position.set(tgt[0] + Math.sin(maz) * 80, tgt[1] + 90, tgt[2] - Math.cos(maz) * 80); D_C.setRGB(0.55, 0.66, 0.95); }
  kd.target.position.set(tgt[0], tgt[1], tgt[2]); kd.target.updateMatrixWorld();
  kd.color.copy(D_C);
  kd.intensity = isDay ? 0.3 + 2.9 * Math.max(sunK, 0.06) * (1 - storm * 0.6) : 0.16 * (1 - cover * 0.6);
  // the shadow box follows the camera's target, snapped to its texels so the shadows do not crawl
  if (kd.castShadow) { const sc = kd.shadow.camera, step = (sc.right - sc.left) / (kd.shadow.mapSize.x || 1024); kd.position.x = Math.round(kd.position.x / step) * step; kd.position.z = Math.round(kd.position.z / step) * step; kd.target.position.x = Math.round(tgt[0] / step) * step; kd.target.position.z = Math.round(tgt[2] / step) * step; kd.target.updateMatrixWorld(); }
  // the sky's and the ground's light: the ambient colour of the lighting engine
  D_C.setRGB(amb[0] * 0.75 + 0.05, amb[1] * 0.8 + 0.06, amb[2] * 0.9 + 0.1);
  DEPTH.hemi.color.copy(D_C); D_C2.setRGB(amb[0] * 0.32, amb[1] * 0.29, amb[2] * 0.26); DEPTH.hemi.groundColor.copy(D_C2);
  DEPTH.hemi.intensity = 0.24 + 0.92 * day * (1 - storm * 0.35) + night * 0.16;   // (1.9.9991: the open sky lights a street in shadow more than it did)
  // fog: the haze of the city by day, the dark at night, thick in fog and dust, lighter in the frozen north
  const q = DQ[DEPTH.lvl], far = q.far * (1 - fog * 0.72) * (1 - dust * 0.6) * (1 - storm * 0.25);
  DEPTH.fogFar = far;
  S.fog.density = 1.0 / Math.max(18, far);
  const hz = [0.24, 0.265, 0.3];
  if (dust > 0.2) { hz[0] = 0.72; hz[1] = 0.56; hz[2] = 0.36; }
  D_C.setRGB(lerpN(0.035, hz[0], day) * (1 - storm * 0.5) + WX.flash * 0.6, lerpN(0.045, hz[1], day) * (1 - storm * 0.45) + WX.flash * 0.6, lerpN(0.07, hz[2], day) * (1 - storm * 0.4) + WX.flash * 0.7);
  if (fog > 0.1) D_C.lerp(D_C2.setRGB(0.36 * day + 0.04, 0.38 * day + 0.05, 0.4 * day + 0.06), fog * 0.7);
  S.fog.color.copy(D_C);
  S.background = null;
  if (DEPTH.clouds) {
    const cu = DEPTH.clouds.material.uniforms; DEPTH.clouds.position.copy(DEPTH.cam.position);
    cu.uSun.value.set(sx, Math.max(-0.2, sy), sz); cu.uCover.value = clamp(cover * 0.85 + storm * 0.3 + fog * 0.2, 0, 1); cu.uDark.value = clamp(storm, 0, 1); cu.uNight.value = clamp((night - 0.2) / 0.6, 0, 1);
    const sk = isDay ? (0.35 + 2.1 * Math.max(sunK, 0.1)) * 0.42 : 0.1; cu.uSunC.value.setRGB(kd.color.r * sk, kd.color.g * sk, kd.color.b * sk);
    cu.uSkyC.value.setRGB(DEPTH.hemi.color.r * DEPTH.hemi.intensity * 0.7, DEPTH.hemi.color.g * DEPTH.hemi.intensity * 0.72, DEPTH.hemi.color.b * DEPTH.hemi.intensity * 0.78);
    cu.uFogC.value.copy(S.fog.color); cu.uWind.value.set(WX.wx || 0.6, WX.wy || 0.2);
  }
  // exposure: a touch brighter at night so it is dark, not black
  DEPTH.R.toneMappingExposure = 0.82 + night * 0.5 - storm * 0.05 + WX.flash * 0.8;
  // the environment for reflections (glass, wet streets, car paint): rebuilt from the sky now and then
  if (DEPTH.pmrem && (Math.abs(day - DEPTH.envDay) > 0.06 || (G.time || 0) - DEPTH.envT > 40)) {
    try {
      DEPTH.envDay = day; DEPTH.envT = G.time || 0;
      const keep = [DEPTH.stars.visible, DEPTH.moon.visible]; DEPTH.stars.visible = false; DEPTH.moon.visible = false;
      const tmp = new THREE.Scene(); const sk2 = DEPTH.sky.clone(); sk2.position.set(0, 0, 0); tmp.add(sk2);
      const rt = DEPTH.pmrem.fromScene(tmp, 0.02); if (DEPTH.env) DEPTH.env.dispose(); DEPTH.env = rt; S.environment = rt.texture; S.environmentIntensity = 0.2 + day * 0.7;
      DEPTH.stars.visible = keep[0]; DEPTH.moon.visible = keep[1];
    } catch (e) { coreHurt('DEPTH', e); }
  }
}
function lerpN(a, b, k) { return a + (b - a) * k; }
// the real lights: the nearest and brightest of the lighting engine's list go to the pool; lamp heads glow at night
function depthLightsFrame() {
  const pool = DEPTH.lights, U = DEPTH.upm, cx = HOVER.pivot ? HOVER.pivot[0] : 0, cz = HOVER.pivot ? HOVER.pivot[2] : 0;
  const L = LUX.lights || [], n = LUX.n || 0, pick = DEPTH.pick || (DEPTH.pick = []); pick.length = 0;
  for (let i = 0; i < n; i++) {
    const l = L[i]; if (!l || !(l.i > 0.02)) continue;
    if (l.cone || l.pr === 3) continue;   // (the survivor's flashlight is the real spot light below; his small glow is left to the sky)
    const x = (l.x - DEPTH.ox) / U, z = (l.y - DEPTH.oy) / U, d = Math.hypot(x - cx, z - cz);
    if (d > 60) continue;
    pick.push({ l: l, x: x, z: z, s: l.i * (l.r / U) / (d + 6) });
  }
  pick.sort((a, b) => b.s - a.s);
  for (let i = 0; i < pool.length; i++) {
    const P = pool[i], k = pick[i];
    if (!k) { P.intensity = 0; continue; }   // (it stays in the scene: a light coming or going would make every shader rebuild)
    const l = k.l;
    P.position.set(k.x, (l.hgt || l.h || 3) * (SCALE_REAL / Math.max(1, SCL)) * 0 + clamp(l.hgt || 3, 0.8, 14), k.z);
    P.color.setRGB((l.c0 || 255) / 255, (l.c1 || 200) / 255, (l.c2 || 140) / 255);
    // bright enough to light the ground under it to about the lighting engine's own strength, whatever its height
    const hh = Math.max(1.6, P.position.y); P.distance = clamp(l.r / U * 1.6, 6, 40); P.intensity = clamp(l.i, 0, 2) * 1.3 * hh * hh;
  }
  // the flashlight on the gun, from the 3D muzzle to where the crosshair is
  const p = G.p;
  if (p && G.mode !== 'title' && !p.down && FLESH.muz) { const m = FLESH.muz, ax = dX(HOVER.aimPt[0]) - m[0], az = dZ(HOVER.aimPt[1]) - m[2], hd = Math.hypot(ax, az) || 1; depthFlashlight(m[0] + ax / hd * 0.2, m[1] + 0.03, m[2] + az / hd * 0.2, Math.atan2(az, ax), Math.atan2(m[1] - HOVER.aimH, hd)); }
  else depthFlashlight(0, 0, 0, 0, 0);
  // the lamp heads glow when the lamps are on
  const on = clamp((DEPTH.night + (WX.dark || 0) * 0.5 - 0.12) / 0.3, 0, 1);
  DEPTH.mats.lampHead.emissiveIntensity = on * 3.5;
}
// the flashlight, from the gun forward (at night, or in a dark storm)
function depthFlashlight(px, py, pz, aim, pitch) {
  const s = DEPTH.spot, k = clamp((DEPTH.night - 0.3) * 2 + (WX.dark || 0), 0, 1);
  if (k <= 0.01 || G.mode === 'over' || !G.p || G.mode === 'title') { s.intensity = 0; return; }   // (off by its strength: the light stays, so no shader rebuilds)
  s.intensity = 45 * k;
  s.position.set(px, py, pz);
  s.target.position.set(px + Math.cos(aim) * 10, py - 10 * Math.tan(pitch == null ? 0.12 : pitch), pz + Math.sin(aim) * 10); s.target.updateMatrixWorld();
}

/* ---------- weather in the air: rain, sleet, snow, sand, ash, embers, leaves ---------- */
// rain is a box of streaks round the camera, snow and the rest a box of points; both move on the GPU (falling, blown by
// the wind and wrapped round the camera), so the CPU only sets how much there is
const D_WXBOX = [44, 26, 44];
function depthWeatherBuild() {
  const S = DEPTH.scene, R = Z.mulberry32(0x3a1d), n = 9000, P = new Float32Array(n * 2 * 3), T = new Float32Array(n * 2), Rr = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { const x = R() * D_WXBOX[0], y = R() * D_WXBOX[1], z = R() * D_WXBOX[2], r = R(); for (let k = 0; k < 2; k++) { const j = i * 2 + k; P[j * 3] = x; P[j * 3 + 1] = y; P[j * 3 + 2] = z; T[j] = k; Rr[j] = r; } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aT', new THREE.BufferAttribute(T, 1)); g.setAttribute('aR', new THREE.BufferAttribute(Rr, 1));
  const box = 'uniform vec3 uCam, uBox; uniform float uTime, uK; uniform vec3 uVel; varying float vA;\n' +
    'vec3 wrapBox(vec3 p) { vec3 o = p + uVel * uTime; return uCam + mod(o - uCam + uBox * 0.5, uBox) - uBox * 0.5; }\n';
  const rm = new THREE.ShaderMaterial({ uniforms: { uCam: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(...D_WXBOX) }, uTime: { value: 0 }, uK: { value: 0 }, uVel: { value: new THREE.Vector3(0, -9, 0) }, uLen: { value: 0.5 }, uCol: { value: new THREE.Color(0.6, 0.65, 0.72) } },
    transparent: true, depthWrite: false, fog: false,
    vertexShader: box + 'attribute float aT, aR; uniform float uLen; void main() { vec3 p = wrapBox(position); vec3 d = normalize(uVel); p -= d * uLen * aT * (0.7 + aR * 0.6); vec4 mv = viewMatrix * vec4(p, 1.0); float dist = -mv.z; vA = (aR < uK ? 1.0 : 0.0) * smoothstep(0.4, 2.5, dist) * (1.0 - smoothstep(10.0, 22.0, dist)) * (1.0 - aT * 0.6); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uCol; varying float vA; void main() { if (vA < 0.01) discard; gl_FragColor = vec4(uCol, vA * 0.42); }' });
  const rain = new THREE.LineSegments(g, rm); rain.frustumCulled = false; rain.renderOrder = 7; S.add(rain);
  const m2 = 7000, Q = new Float32Array(m2 * 3), Q2 = new Float32Array(m2);
  for (let i = 0; i < m2; i++) { Q[i * 3] = R() * D_WXBOX[0]; Q[i * 3 + 1] = R() * D_WXBOX[1]; Q[i * 3 + 2] = R() * D_WXBOX[2]; Q2[i] = R(); }
  const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(Q, 3)); g2.setAttribute('aR', new THREE.BufferAttribute(Q2, 1));
  const pm = new THREE.ShaderMaterial({ uniforms: { uCam: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(...D_WXBOX) }, uTime: { value: 0 }, uK: { value: 0 }, uVel: { value: new THREE.Vector3(0, -1.2, 0) }, uSize: { value: 0.05 }, uSway: { value: 0.4 }, uCol: { value: new THREE.Color(1, 1, 1) }, uGlow: { value: 0 }, uPx: { value: 400 } },
    transparent: true, depthWrite: false, fog: false,
    vertexShader: box + 'attribute float aR; uniform float uSize, uSway, uPx; varying float vR; void main() { vec3 p = position; p.x += sin(uTime * (0.6 + aR) + aR * 40.0) * uSway; p.z += cos(uTime * (0.5 + aR * 0.7) + aR * 23.0) * uSway; p = wrapBox(p); vec4 mv = viewMatrix * vec4(p, 1.0); float dist = -mv.z; vR = aR; vA = (aR < uK ? 1.0 : 0.0) * smoothstep(0.3, 1.5, dist) * (1.0 - smoothstep(12.0, 22.0, dist)); gl_PointSize = clamp(uSize * (0.6 + aR * 0.8) * uPx / max(0.5, dist), 1.0, 24.0); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uCol; uniform float uGlow; varying float vR; varying float vA; void main() { if (vA < 0.01) discard; vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.15, length(d)); gl_FragColor = vec4(uCol * (1.0 + uGlow * 2.0), a * vA * (0.75 + 0.25 * vR)); }' });
  const pts = new THREE.Points(g2, pm); pts.frustumCulled = false; pts.renderOrder = 7; S.add(pts);
  DEPTH.wx = { rain: rain, pts: pts, t: 0 };
}
function depthWeatherFrame(dt) {
  if (!DEPTH.wx) { try { depthWeatherBuild(); } catch (e) { coreHurt('DEPTH', e); DEPTH.wx = { off: true }; return; } }
  const X = DEPTH.wx; if (X.off) return;
  X.t += dt;
  const c = DEPTH.cam.position, ru = X.rain.material.uniforms, pu = X.pts.material.uniforms, wx = (WX.wx || 0) * 9, wz = (WX.wy || 0) * 9, lvl = DQ[DEPTH.lvl], dens = [0.35, 0.6, 0.85, 1][DEPTH.lvl];
  const lit = 0.25 + 0.75 * (1 - DEPTH.night) * (1 - (WX.dark || 0) * 0.5);
  // rain and sleet (heavier in a storm, slanting with the wind)
  const rk = clamp((WX.rain || 0) + (WX.sleet || 0) * 0.6 + (WX.storm || 0) * 0.3 + (WX.hail || 0) * 0.5, 0, 1) * dens;
  X.rain.visible = rk > 0.01;
  if (X.rain.visible) { ru.uCam.value.copy(c); ru.uTime.value = X.t; ru.uK.value = rk; ru.uVel.value.set(wx * 0.6, -(9 + (WX.storm || 0) * 4), wz * 0.6); ru.uLen.value = 0.45 + (WX.storm || 0) * 0.35; ru.uCol.value.setRGB(0.55 * lit + 0.05, 0.6 * lit + 0.06, 0.68 * lit + 0.08); }
  // the points: snow, then ash, sand, embers, petals and leaves (whichever is strongest)
  const kinds = [['snow', (WX.snow || 0) + (WX.sleet || 0) * 0.4], ['ash', WX.ash || 0], ['sand', WX.sand || 0], ['embers', WX.embers || 0], ['petals', WX.petals || 0], ['leaves', WX.leaves || 0]];
  let best = null; for (const k of kinds) if (k[1] > 0.02 && (!best || k[1] > best[1])) best = k;
  X.pts.visible = !!best;
  if (best) {
    const k = best[0], v = clamp(best[1], 0, 1) * dens; pu.uCam.value.copy(c); pu.uTime.value = X.t; pu.uK.value = v; pu.uPx.value = H * DEPTH.R.getPixelRatio() * 0.6;
    if (k === 'snow') { pu.uVel.value.set(wx * 0.35, -1.1, wz * 0.35); pu.uSize.value = 0.06; pu.uSway.value = 0.45; pu.uCol.value.setRGB(0.9 * lit + 0.05, 0.92 * lit + 0.05, 0.96 * lit + 0.06); pu.uGlow.value = 0; }
    else if (k === 'ash') { pu.uVel.value.set(wx * 0.4, -0.45, wz * 0.4); pu.uSize.value = 0.05; pu.uSway.value = 0.6; pu.uCol.value.setRGB(0.32 * lit, 0.31 * lit, 0.3 * lit); pu.uGlow.value = 0; }
    else if (k === 'sand') { pu.uVel.value.set(wx * 1.6 + 3, -0.3, wz * 1.6 + 1); pu.uSize.value = 0.025; pu.uSway.value = 0.2; pu.uCol.value.setRGB(0.72 * lit, 0.56 * lit, 0.36 * lit); pu.uGlow.value = 0; }
    else if (k === 'embers') { pu.uVel.value.set(wx * 0.5, 1.2, wz * 0.5); pu.uSize.value = 0.035; pu.uSway.value = 0.8; pu.uCol.value.setRGB(1, 0.45, 0.12); pu.uGlow.value = 1; }
    else if (k === 'petals') { pu.uVel.value.set(wx * 0.6, -0.6, wz * 0.6); pu.uSize.value = 0.06; pu.uSway.value = 0.9; pu.uCol.value.setRGB(0.9 * lit, 0.6 * lit, 0.72 * lit); pu.uGlow.value = 0; }
    else { pu.uVel.value.set(wx * 0.8, -0.8, wz * 0.8); pu.uSize.value = 0.08; pu.uSway.value = 1.1; pu.uCol.value.setRGB(0.5 * lit, 0.36 * lit, 0.14 * lit); pu.uGlow.value = 0; }
    X.pts.material.blending = k === 'embers' ? THREE.AdditiveBlending : THREE.NormalBlending;
  }
  void lvl;
}

/* ---------- street life: the props you kick and shoot, the birds ---------- */
// barrels, cones, bins, tyres and crates are the LIFE engine's (they move when kicked, a barrel blows up): one instanced
// mesh per kind, posed each frame from its list; crows, pigeons and vultures peck on the street and take off when you
// come near, climbing and flapping away
function depthLifeBuild() {
  const S = DEPTH.scene, mk = (geo, mat, n, shadow) => { const m = new THREE.InstancedMesh(geo, mat, n); m.count = 0; m.castShadow = !!shadow; m.receiveShadow = true; m.frustumCulled = false; S.add(m); return m; };
  const band = (g, y0, y1, a, b) => { const p = g.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = y > y0 && y < y1 ? b : a; c[i * 3] = k[0]; c[i * 3 + 1] = k[1]; c[i * 3 + 2] = k[2]; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; };
  const red = dLin('#a8261e'), dk = dLin('#5a1410'), org = dLin('#e0601a'), wht = dLin('#e8e6e0'), gry = dLin('#4a524c'), gry2 = dLin('#33383a');
  const barrel = band(new THREE.CylinderGeometry(0.29, 0.29, 0.88, 14).translate(0, 0.44, 0), 0.28, 0.32, red, dk); band(barrel, 0.56, 0.6, red, dk);
  { const p = barrel.attributes.position, c = barrel.attributes.color; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if ((y > 0.27 && y < 0.33) || (y > 0.55 && y < 0.61)) c.setXYZ(i, dk[0], dk[1], dk[2]); else c.setXYZ(i, red[0], red[1], red[2]); } }
  const cone = band(new THREE.ConeGeometry(0.16, 0.68, 12).translate(0, 0.34, 0), 0.3, 0.44, org, wht);
  const can = band(new THREE.CylinderGeometry(0.27, 0.23, 0.92, 12).translate(0, 0.46, 0), 0.86, 1, gry, gry2);
  const tire = new THREE.TorusGeometry(0.29, 0.11, 8, 16).rotateX(Math.PI / 2).translate(0, 0.11, 0);
  const crate = new THREE.BoxGeometry(0.72, 0.72, 0.72).translate(0, 0.36, 0);
  const vm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.25, envMapIntensity: 0.8 });
  const bird = (() => { const g = new THREE.BufferGeometry(), P = [0.18, 0, 0, -0.16, 0.02, 0.05, -0.16, 0.02, -0.05, 0.02, 0.01, 0, -0.06, 0.01, 0.32, -0.04, 0.01, 0, 0.02, 0.01, 0, -0.04, 0.01, 0, -0.06, 0.01, -0.32]; g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex([0, 1, 2, 3, 4, 5, 6, 7, 8]); g.computeVertexNormals(); return g; })();
  const bm = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.8, side: THREE.DoubleSide });
  const rat = (() => { const g = new THREE.SphereGeometry(0.06, 8, 6); g.scale(1.9, 0.85, 1); g.translate(0, 0.05, 0); const t = new THREE.CylinderGeometry(0.006, 0.01, 0.17, 4); t.rotateZ(Math.PI / 2); t.translate(-0.19, 0.03, 0); return THREE.BufferGeometryUtils ? THREE.BufferGeometryUtils.mergeGeometries([g.toNonIndexed(), t.toNonIndexed()]) : g; })();
  const fm = new THREE.MeshStandardMaterial({ color: 0x3a0e10, roughness: 0.7, side: THREE.DoubleSide, emissive: 0x5a0a08, emissiveIntensity: 0.35 });
  DEPTH.life = { barrel: mk(barrel, vm, 48, true), cone: mk(cone, vm, 64, true), can: mk(can, vm, 48, true), tire: mk(tire, DEPTH.mats.rubber, 48, true), crate: mk(crate, new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.85 }), 32, true), bird: mk(bird, bm, 96, false), flyer: mk(bird.clone().scale(2.4, 2.4, 2.4), fm, 48, true), rat: mk(rat, new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: 0.9 }), 32, true), o: new THREE.Object3D(), mats: [vm, bm, fm] };
}
function depthLifeFrame() {
  if (!DEPTH.life) { try { depthLifeBuild(); } catch (e) { coreHurt('DEPTH', e); DEPTH.life = { off: true }; return; } }
  const Lf = DEPTH.life; if (Lf.off) return;
  const O = Lf.o, n = { barrel: 0, cone: 0, can: 0, tire: 0, crate: 0, bird: 0, flyer: 0, rat: 0 }, piv = HOVER.pivot || [0, 0, 0], U = DEPTH.upm, T = G.time || 0, far2 = Math.pow((DEPTH.fogFar || 100) * 0.8, 2);
  const put = (k, x, y, z, ry, rx, sc) => { const M = Lf[k]; if (!M || n[k] >= M.instanceMatrix.count) return; O.position.set(x, y, z); O.rotation.set(rx || 0, ry, 0, 'YXZ'); O.scale.setScalar(sc || 1); O.updateMatrix(); M.setMatrixAt(n[k]++, O.matrix); };
  if (typeof WD !== 'undefined') {
    for (const p of WD.props) {
      if (p.dead || !Lf[p.k]) continue; const x = dX(p.x), z = dZ(p.y), dx = x - piv[0], dz = z - piv[2]; if (dx * dx + dz * dz > far2) continue;
      const gy = fleshGroundY(p);
      if (p.down) put(p.k, x, gy + (p.k === 'can' ? 0.25 : 0.17), z, -(p.a || 0), Math.PI / 2); else put(p.k, x, gy, z, -(p.a || 0), 0);
    }
    if (!(typeof FAUNA !== 'undefined' && FAUNA.ok)) for (const b of WD.birds) {   // (FAUNA draws them when it is up)
      if (b.st > 1) continue; const x = dX(b.x), z = dZ(b.y), dx = x - piv[0], dz = z - piv[2]; if (dx * dx + dz * dz > far2) continue;
      const big = b.kind === 'vulture' ? 1.7 : b.kind === 'pigeon' ? 0.9 : 1;
      if (b.st === 0) put('bird', x, fleshGroundY(b) + 0.06, z, -(b.a || 0), 0, big * 0.9);
      else { const h = Math.min(30, 0.3 + b.t * (3 + b.t * 2)), fl = Math.sin(b.t * (big > 1.2 ? 9 : 22)); put('bird', x, h, z, -Math.atan2(b.vy || 0, b.vx || 1), fl * 0.6, big * (1 + 0.1 * fl)); }
    }
  }
  // rats running along the walls (the PULSE engine's), and the odd dead one
  if (typeof PULSE !== 'undefined' && PULSE.rats) for (const r of PULSE.rats) { const x = dX(r.x), zz = dZ(r.y), dx = x - piv[0], dz = zz - piv[2]; if (dx * dx + dz * dz > far2) continue; put('rat', x, fleshGroundY(r), zz, -(r.a || 0), r.st === 'dead' ? Math.PI : 0, (r.s || 1) * 1.1); }
  // the hive's flyers: leathery things the size of a crow's wingspan, flapping fast at head height
  for (const z of G.zs) { if (z.dead || !z.fly) continue; const x = dX(z.x), zz = dZ(z.y), dx = x - piv[0], dz = zz - piv[2]; if (dx * dx + dz * dz > far2) continue; const fl = Math.sin(T * 26 + (z.nid | 0)); put('flyer', x, 1.7 + Math.sin(T * 3 + (z.nid | 0)) * 0.3, zz, -Math.atan2(z.vy || 0, z.vx || 1), fl * 0.7, 1 + 0.08 * fl); }
  for (const k in n) { const M = Lf[k]; M.count = n[k]; if (n[k]) M.instanceMatrix.needsUpdate = true; }
}

/* ---------- vehicles the horde pushes ---------- */
// a car the crowd shoves is taken out of its block (the block is rebuilt without it) and drawn here where it is now; when
// it comes to rest its block is rebuilt with it in its new place
function depthDynFrame() {
  if (typeof SWDYN === 'undefined') return;
  const M = DEPTH.dyn || (DEPTH.dyn = new Map()), U = DEPTH.upm, seen = DEPTH.dynSeen || (DEPTH.dynSeen = new Set()); seen.clear();
  for (const [vid, r] of SWDYN) {
    if (!r.dyn || !(r.x === r.x)) continue; seen.add(vid);
    let e = M.get(vid);
    if (!e) {
      const P = dGB(), Gl = dGB(), Tr = dGB(); dVehicle(P, Gl, Tr, r, 0, 0, r.w / U, r.h / U);
      const g = new THREE.Group(), geos = [];
      for (const [B, mat] of [[P, r.burnt ? DEPTH.mats.thing : DEPTH.mats.paint], [Gl, DEPTH.mats.glass], [Tr, DEPTH.mats.rubber]]) if (B.nv) { const geo = dGeom(B); const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; g.add(m); geos.push(geo); }
      DEPTH.scene.add(g); e = { g: g, geos: geos }; M.set(vid, e);
    }
    e.g.position.set(dX(r.x), 0, dZ(r.y));
  }
  for (const [vid, e] of M) if (!seen.has(vid)) { DEPTH.scene.remove(e.g); for (const g of e.geos) g.dispose(); M.delete(vid); }
}

/* ---------- the A-10 ---------- */
// the Warthog at its real size (16.3 m long, 17.5 m across): a fuselage with its long nose and the gun's muzzle, the
// canopy, straight wings with their stores, the two engine pods high on the rear fuselage and the twin tails, in two-tone
// grey; it comes in low over the street, dips for its gun run, and its engines glow
function depthJetGeo() {
  if (DEPTH.geo.jet) return DEPTH.geo.jet;
  const B = dGB(), up = dLin('#4a4e52'), lo = dLin('#6a6e72'), dk = dLin('#2a2c2e'), gl = [0.02, 0.025, 0.03];
  // a tube along x (r0 at x0, r1 at x1), n sides, centred at (y, z)
  const tube = (x0, x1, r0, r1, y, z, n, colU, colL) => { for (let i = 0; i < n; i++) { const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, am = (a0 + a1) / 2, cU = Math.sin(am) > -0.1 ? colU : colL;
    dQuad(B, [x0, y + Math.sin(a0) * r0, z + Math.cos(a0) * r0], [x0, y + Math.sin(a1) * r0, z + Math.cos(a1) * r0], [x1, y + Math.sin(a1) * r1, z + Math.cos(a1) * r1], [x1, y + Math.sin(a0) * r1, z + Math.cos(a0) * r1], [0, Math.sin(am), Math.cos(am)], cU, null); } };
  tube(-7.4, -5.2, 0.45, 0.95, 0, 0, 10, up, lo); tube(-5.2, 3.5, 0.95, 1.05, 0, 0, 10, up, lo); tube(3.5, 7.2, 1.05, 0.5, 0.05, 0, 10, up, lo); tube(7.2, 8.0, 0.5, 0.12, 0.05, 0, 8, dk, dk);
  tube(8.0, 8.6, 0.06, 0.06, -0.15, 0, 6, dk, dk);   // the gun's barrels
  dBox(B, 3.6, 0.85, -0.55, 5.6, 1.45, 0.55, gl);   // the canopy
  dBox(B, -1.6, -0.25, -8.75, 1.2, 0.1, 8.75, up);  // the wings
  for (const zz of [-6.2, -4.4, 4.4, 6.2]) dBox(B, -0.4, -0.75, zz - 0.18, 1.6, -0.25, zz + 0.18, dk);   // the stores
  for (const zz of [-1.25, 1.25]) { tube(-4.6, -1.0, 0.68, 0.72, 1.15, zz, 10, up, lo); dBox(B, -3.4, 0.55, zz - 0.15, -2.0, 1.0, zz + 0.15, up); }   // the engine pods on their pylons
  dBox(B, -7.6, 0.2, -2.85, -6.0, 0.4, 2.85, up);   // the tailplane
  for (const zz of [-2.75, 2.75]) dBox(B, -7.7, 0.2, zz - 0.12, -5.9, 3.0, zz + 0.12, up);   // the twin fins
  return DEPTH.geo.jet = dGeom(B);
}
function depthJetsFrame() {
  const J = G.jets || [];
  if (!DEPTH.jets) DEPTH.jets = [];
  const list = DEPTH.jets, U = DEPTH.upm;
  while (list.length < Math.min(3, J.length)) { const m = new THREE.Mesh(depthJetGeo(), DEPTH.mats.paint); m.castShadow = true; m.frustumCulled = false; DEPTH.scene.add(m); list.push(m); }
  for (let i = 0; i < list.length; i++) {
    const m = list[i], j = J[i]; if (!j) { m.visible = false; continue; }
    m.visible = true;
    const yaw = Math.atan2(j.uy, j.ux), dip = j.firing ? 1 : 0; j._alt = j._alt == null ? 55 : j._alt + ((dip ? 32 : 55) - j._alt) * Math.min(1, (G.rdt || 0.016) * 1.5);
    const x = dX(j.x), z = dZ(j.y), y = j._alt;
    m.position.set(x, y, z); m.rotation.set(0, -yaw, j.firing ? -0.18 : -0.05, 'YZX');
    // where the nose is (for the tracers): 8.6 m ahead along its heading, down its pitch
    const c = Math.cos(yaw), s2 = Math.sin(yaw); j._n3 = [x + c * 8.6, y - 1.5 * (j.firing ? 1 : 0.3) - 0.15, z + s2 * 8.6];
    void U;
  }
}

/* ---------- the frame ---------- */
function depthRender() {
  const t0 = performance.now();
  if (!DEPTH.ok && !depthInit()) { DEPTH.on = false; return false; }
  try {
    DEPTH.upm = dUPM();
    const lvl = depthLevelNow(); if (lvl !== DEPTH.lvlSet) depthApplyLevel(lvl);
    depthResize(false);
    const p = G.p && G.mode !== 'title' ? G.p : cam;
    depthRebase(p.x, p.y);
    // the shared frame every engine reads (the view is the ground round the player out to the fog)
    const vr = Math.max(W, H) / ZOOM * 0.75; coreFrame(cam.x - vr, cam.y - vr, cam.x + vr, cam.y + vr, G.rdt || 0.016);
    // the lighting engine still decides the hour, the ambient, the sun and the list of lights (it draws nothing here)
    LUX.hour = luxHourNow(); luxAmbient(LUX.amb); luxSun(LUX.amb); LUX.live = SET.lux !== 'off';
    try { luxGather(cam.x - vr, cam.y - vr, cam.x + vr, cam.y + vr, G.rdt || 0.016); } catch (e) { }
    if (typeof SURF !== 'undefined' && !SURF.ok && SURF.job) surfBake(DEPTH.R, true);
    hoverFrame(G.rdt || 0.016);
    depthStream();
    depthAtmos(G.rdt || 0.016);
    depthLightsFrame();
    if (typeof fleshFrame === 'function') fleshFrame(G.rdt || 0.016);
    if (typeof sparkFrame === 'function') sparkFrame(G.rdt || 0.016);
    depthWeatherFrame(Math.min(0.05, G.rdt || 0.016));
    if (typeof nimbusFrame === 'function') { try { nimbusFrame(Math.min(0.05, G.rdt || 0.016)); } catch (e) { coreHurt('NIMBUS', e); } }
    if (typeof driftFrame === 'function') { try { driftFrame(Math.min(0.05, G.rdt || 0.016)); } catch (e) { coreHurt('DRIFT', e); } }
    if (typeof floraFrame === 'function') { try { floraFrame(Math.min(0.05, G.rdt || 0.016)); } catch (e) { coreHurt('FLORA', e); } }
    if (typeof faunaFrame === 'function') { try { faunaFrame(Math.min(0.05, G.rdt || 0.016)); } catch (e) { coreHurt('FAUNA', e); } }
    depthLifeFrame();
    depthJetsFrame();
    depthDynFrame();
    // the grade: the bloom by the setting, grain and vignette by the settings, flashes on the screen
    const P = DEPTH.pass;
    if (P.bloom) { P.bloom.strength = 0.22 * bloomK() + DEPTH.night * 0.14 + WX.flash * 0.4; P.bloom.threshold = 1.5 - DEPTH.night * 0.45; }
    if (P.grade) { const u = P.grade.uniforms; u.uTime.value = performance.now() / 1000; u.uVig.value = (SET.vig == null ? 50 : SET.vig) / 100 * (0.7 + DEPTH.night * 0.4); u.uGrain.value = SET.grain === false || !DQ[DEPTH.lvl].grain ? 0 : 0.028 + DEPTH.night * 0.03;
      const hf = G.hurtFlash || 0; u.uFlash.value.set(0.55, 0.02, 0.02, clamp(hf * 1.6, 0, 0.55)); if (G.flashA > 0) u.uFlash.value.set(1, 0.84, 0.6, Math.min(0.5, G.flashA)); }
    if (P.fx) { try { depthFxFrame(P.fx); } catch (e) { P.fx.enabled = false; } }
    DEPTH.R.info.reset();
    if (DEPTH.comp) DEPTH.comp.render(); else DEPTH.R.render(DEPTH.scene, DEPTH.cam);
    DEPTH.calls = DEPTH.R.info.render.calls; DEPTH.tris = DEPTH.R.info.render.triangles;
    // the 2D layer on top: only what belongs on the screen (crosshair, damage numbers, teammates' pointers, hints)
    depthOverlay();
    DEPTH.frames++;
  } catch (e) {
    depthHurt(e); return false;
  }
  const ms = performance.now() - t0; DEPTH.ms = ms; DEPTH.msAvg = DEPTH.msAvg * 0.95 + ms * 0.05; coreCost('DEPTH', ms);
  depthGovern(ms);
  return true;
}
// (1.9.9991) LIGHTFX's uniforms: the depth the scene is about to be drawn with, the camera, where the sun is on the screen
// and how strong its shafts are (low sun, thick air, a storm's towers in front of it; none at night or behind you)
const DFX_V = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
function depthFxFrame(F) {
  const u = F.uniforms, C = DEPTH.cam, comp = DEPTH.comp;
  u.tDepth.value = comp.readBuffer.depthTexture; u.uPI.value.copy(C.projectionMatrixInverse); u.uP11.value = C.projectionMatrix.elements[5]; u.uTime.value = (performance.now() / 1000) % 100;
  const rb = comp.readBuffer; u.uRes.value.set(rb.width, rb.height);
  const sp = DEPTH.sky ? DEPTH.sky.material.uniforms.sunPosition.value : null; let k = 0;
  if (sp && sp.y > -0.05 && DEPTH.night < 0.6) {
    DFX_V.set(C.position.x + sp.x * 500, C.position.y + sp.y * 500, C.position.z + sp.z * 500).project(C);
    const inFront = DFX_V.z < 1 && Math.abs(DFX_V.x) < 1.6 && Math.abs(DFX_V.y) < 1.6;
    if (inFront) { u.uSun.value.set(DFX_V.x * 0.5 + 0.5, DFX_V.y * 0.5 + 0.5);
      const low = 1 - wxSmooth(0.15, 0.55, sp.y), thick = clamp((WX.fog || 0) * 0.8 + (DU.uDust.value || 0) + (typeof NIMBUS !== 'undefined' ? NIMBUS.dark + NIMBUS.occl * 0.6 : 0) + (WX.cloud || 0) * 0.3, 0, 1.2);
      k = (0.16 + 0.34 * low + 0.3 * thick) * (1 - DEPTH.night) * (1 - clamp((WX.storm || 0) * 0.8, 0, 0.9)) * wxSmooth(1.6, 1.0, Math.max(Math.abs(DFX_V.x), Math.abs(DFX_V.y))); }
    if (DEPTH.sun) u.uSunC.value.copy(DEPTH.sun.color).multiplyScalar(0.55);
  }
  u.uSunK.value = SET.godrays === false ? 0 : k;
}
// the governor: frames running late step the level down (or the resolution), room to spare steps it back up
function depthGovern(ms) {
  const fps = PERF.fps || 60, tgt = targetFps();
  // a device too weak for 3D even at the lowest level and the smallest picture: the top-down view takes over (and stays
  // the setting, with a word about where to turn 3D back on); only in a run, only after eight seconds of it
  if (G.mode === 'play' && depthLevelNow() === 0 && DEPTH.scale <= 0.72 && fps < Math.max(18, tgt * 0.5)) { DEPTH.slowT = (DEPTH.slowT || 0) + Math.min(0.1, G.rdt || 0.016); if (DEPTH.slowT > 8 && !DEPTH.fellBack) { DEPTH.fellBack = true; SET.view = 'top'; saveSettings(); depthSetView('top'); coreRepaired('DEPTH', '3D was too heavy for this device: the top-down view took over'); try { toast('Graphics', '3D was too heavy here: top-down view (Settings > Graphics > View)', '#e8b04a'); } catch (e) { } return; } }
  else DEPTH.slowT = Math.max(0, (DEPTH.slowT || 0) - (G.rdt || 0.016) * 0.5);
  if (SET.q3d && SET.q3d !== 'auto') return;
  if (fps < tgt * 0.82) { DEPTH.good = 0; DEPTH.bad = (DEPTH.bad || 0) + 1; if (DEPTH.bad > 90) { DEPTH.bad = 0; if (DEPTH.scale > 0.78) { DEPTH.scale = Math.max(0.7, DEPTH.scale - 0.08); depthResize(true); } else if (depthLevelNow() > 0) { DEPTH.adapt--; DEPTH.scale = 1; } } }
  else if (fps > tgt * 0.97) { DEPTH.bad = 0; DEPTH.good = (DEPTH.good || 0) + 1; if (DEPTH.good > 600) { DEPTH.good = 0; if (DEPTH.scale < 1) { DEPTH.scale = Math.min(1, DEPTH.scale + 0.06); depthResize(true); } else if (DEPTH.adapt < 0) DEPTH.adapt++; } }
}
function depthHurt(e) {
  const now = performance.now(); coreHurt('DEPTH', e); try { console.error(e); } catch (x) { }
  DEPTH.errT.push(now); while (DEPTH.errT.length && now - DEPTH.errT[0] > 10000) DEPTH.errT.shift();
  if (DEPTH.errT.length >= 5) { DEPTH.offUntil = now + 45000; DEPTH.errT.length = 0; coreRepaired('DEPTH', '3D: errors, the top-down view covers for 45 seconds'); }
}
// the screen layer: the 2D canvas is cleared and only what lives on the screen is drawn on it
const D_P = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
function depthToScreen(x, y, h, out) {
  D_P.set(dX(x), h, dZ(y)).project(DEPTH.cam); out = out || [0, 0, 0];
  out[0] = (D_P.x * 0.5 + 0.5) * W; out[1] = (-D_P.y * 0.5 + 0.5) * H; out[2] = D_P.z < 1 ? 1 : 0; return out;
}
function depthOverlay() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const play = G.mode === 'play' || G.mode === 'pause' || G.mode === 'upgrade' || G.mode === 'over' || G.mode === 'skull' || G.mode === 'cine';
  // floating numbers and words over the fight, where they happened
  if (SET.ftext && G.texts.length) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const o = [0, 0, 0];
    for (const t of G.texts) {
      depthToScreen(t.x, t.y, 2.1 + t.t * 0.8, o); if (!o[2]) continue;
      ctx.globalAlpha = clamp(1 - t.t / t.life, 0, 1); ctx.font = (t.big ? '22px' : '14px') + " 'Share Tech Mono', monospace";
      ctx.fillStyle = '#000'; ctx.fillText(t.s, o[0] + 1, o[1] + 1); ctx.fillStyle = t.c; ctx.fillText(t.s, o[0], o[1]);
    }
    ctx.globalAlpha = 1;
  }
  // words standing in the world (a grab's warning)
  if (typeof SPARK !== 'undefined' && SPARK.lab.length) { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = "bold 14px 'Share Tech Mono', monospace"; const o = [0, 0, 0]; for (const L of SPARK.lab) { depthToScreen(L.x, L.y, L.h, o); if (!o[2]) continue; ctx.fillStyle = '#000'; ctx.fillText(L.s, o[0] + 1, o[1] + 1); ctx.fillStyle = L.c; ctx.fillText(L.s, o[0], o[1]); } }
  if (play) {
    if (typeof drawScreenFx === 'function') { try { drawScreenFx(); } catch (e) { } }
    if (typeof hoverDrawAim === 'function') hoverDrawAim();
    if (NET.started) { try { depthNetOverlay(); } catch (e) { coreHurt('DEPTH', e); } }
  }
}

// co-op in 3D: a name tag over each teammate (red and pulsing when they are down), an arrow at the screen's edge for
// anyone out of view (behind you too), and the pings they drop as diamonds standing over the spot
const D_NV = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
function depthNetOverlay() {
  if (!G.p || SET.netArrows === false) return;
  const list = NET.role === 'host' ? Array.from(NET.peers.values()).filter(p => p.p && !p.away).map(p => ({ x: p.p.x, y: p.p.y, name: p.name, col: p.col, down: p.p.down, h: 2.15 }))
    : Array.from(NET.others.values()).map(o => ({ x: o.x, y: o.y, name: o.name, col: o.col, down: o.down, h: 2.15 }));
  for (const k of NET.marks || []) list.push({ x: k.x, y: k.y, name: k.name + '\u2019s mark', col: k.col, mark: true, h: 1.6 });
  const C = DEPTH.cam, cx = W / 2, cy = H / 2, pad = 34;
  ctx.save(); ctx.font = "bold 11px 'Share Tech Mono', monospace"; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  for (const o of list) {
    const col = o.down ? '#ff4a4a' : (o.col || '#9fd3ff'), pulse = o.down ? 0.6 + 0.4 * Math.sin(G.time * 8) : o.mark ? 0.6 + 0.35 * Math.sin(G.time * 6) : 1;
    D_NV.set(dX(o.x), o.h, dZ(o.y)).applyMatrix4(C.matrixWorldInverse); const behind = D_NV.z > -0.1;
    D_NV.set(dX(o.x), o.h, dZ(o.y)).project(C); let sx = (D_NV.x * 0.5 + 0.5) * W, sy = (-D_NV.y * 0.5 + 0.5) * H;
    ctx.globalAlpha = pulse;
    if (!behind && sx > 8 && sx < W - 8 && sy > 8 && sy < H - 8) {
      // on screen: the tag (a diamond for a ping), smaller the further off
      if (o.mark) { ctx.fillStyle = 'rgba(8,10,13,0.7)'; ctx.beginPath(); ctx.moveTo(sx, sy - 12); ctx.lineTo(sx + 9, sy); ctx.lineTo(sx, sy + 12); ctx.lineTo(sx - 9, sy); ctx.closePath(); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(sx, sy - 9); ctx.lineTo(sx + 6, sy); ctx.lineTo(sx, sy + 9); ctx.lineTo(sx - 6, sy); ctx.closePath(); ctx.fill(); }
      const label = (o.name || '?') + (o.down ? ' \u00b7 DOWN' : ''), tw = ctx.measureText(label).width, ty = sy - (o.mark ? 22 : 0);
      ctx.fillStyle = 'rgba(8,10,13,0.62)'; ctx.fillRect(sx - tw / 2 - 5, ty - 8, tw + 10, 16); ctx.fillStyle = col; ctx.fillText(label, sx, ty);
      continue;
    }
    // off screen: an arrow at the edge pointing the way (behind you, the way round you would turn)
    let dx = sx - cx, dy = sy - cy; if (behind) { dx = -dx; dy = -dy; if (Math.abs(dy) < 1) dy = 1; dy = Math.abs(dy) * 1; }
    const k = Math.min((cx - pad) / Math.abs(dx || 1e-6), (cy - pad) / Math.abs(dy || 1e-6)), px = cx + dx * k, py = cy + dy * k, a = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(px, py); ctx.rotate(a); ctx.scale(1.4, 1.4);
    ctx.fillStyle = 'rgba(8,10,13,0.75)'; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-9, -11); ctx.lineTo(-4, 0); ctx.lineTo(-9, 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-6, -8); ctx.lineTo(-2, 0); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = col; ctx.fillText(o.name || '', px - Math.cos(a) * 30, py - Math.sin(a) * 22);
  }
  ctx.restore(); ctx.globalAlpha = 1;
  // the marks age here as they do in the top-down view
  if (NET.marks && NET.marks.length) NET.marks = NET.marks.filter(k => (k.t = (k.t || 0) + (G.rdt || 0.016)) < k.life);
}
// is the next run going to be drawn in 3D? (the loader builds 3D blocks instead of painting top-down ones)
function depthWantedNow() { return (SET.view || '3d') === '3d' && depthWanted() && (DEPTH.ok || depthInit()); }
// the loader's jobs for the 3D view: the blocks round the start, nearest first, and two frames so the shaders are built
function depthWarmJobs(x, y) {
  const jobs = [], q = DQ[depthLevelNow()] || DQ[2], R = q.ring, cx0 = Math.floor(x / CHS), cy0 = Math.floor(y / CHS), list = [];
  jobs.push(() => { DEPTH.on = true; depthShow(true); DEPTH.upm = dUPM(); depthApplyLevel(depthLevelNow()); depthRebase(x, y); if (typeof fleshInit === 'function') fleshInit(); });
  for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) list.push([cx0 + i, cy0 + j, Math.max(Math.abs(i), Math.abs(j)), i * i + j * j]);
  list.sort((a, b) => a[3] - b[3]);
  for (const [cx, cy, ring] of list) jobs.push(() => { if (!DEPTH.ok) return; const k = depthChunkKey(cx, cy); if (!DEPTH.chunks.has(k)) { try { depthChunkBuild(getChunk(cx, cy), ring); } catch (e) { coreHurt('DEPTH', e); } } });
  return jobs;
}
// the game's frame asks this first: true when the 3D view drew the frame (false: the top-down renderer draws it)
function depthShow(on) { if (DEPTH.cv) { const d = on ? 'block' : 'none'; if (DEPTH.cv.style.display !== d) DEPTH.cv.style.display = d; } }
function depthFrame3() {
  if ((SET.view || '3d') !== '3d') { if (DEPTH.on) depthSetView('top'); depthShow(false); return false; }
  if (!DEPTH.on) { if (depthWanted()) depthSetView('3d'); else { depthShow(false); return false; } }
  if (!depthOn() && !(DEPTH.on && !DEPTH.ok && depthInit())) { depthShow(false); return false; }
  depthShow(true);
  // the shader engine's canvas (top-down) is put away while 3D draws; it comes back by itself with the top-down view
  if (typeof PRISM !== 'undefined' && PRISM.glcv && PRISM.glcv.style.display !== 'none') { prismShow(false); PRISM.mode = 'off3d'; }
  return depthRender();
}

/* ---------- the engine on the hub ---------- */
function depthSelfTest() {
  let n = 0, pass = 0, why = '';
  const t = (ok, w) => { n++; if (ok) pass++; else if (!why) why = w; };
  t(typeof THREE !== 'undefined' && !!THREE.WebGLRenderer, 'the 3D library is missing');
  // the ground plane maps the world the way the simulation sees it: east is +x, south is +z, a metre is a metre
  const upm = dUPM(); t(Math.abs(dX(DEPTH.ox + upm * 3) - 3) < 1e-6 && Math.abs(dZ(DEPTH.oy - upm * 2) + 2) < 1e-6, 'the ground mapping');
  // a building's box: the facade style and its lit windows follow its district (ruins are dark)
  t(dBuildStyle({ k: 'b', st: 'ruin', s: 5 }, 'city') === D_STYLE.ruin && dLitShare({ s: 1 }, 'city', D_STYLE.ruin) === 0, 'building styles');
  // a box has five faces of four corners each
  const B = dGB(); dBox(B, 0, 0, 0, 1, 2, 1, [1, 1, 1]); t(B.nv === 20 && B.i.length === 30, 'box geometry');
  return { ok: pass === n, n: n, pass: pass, why: why };
}
coreDefine({ name: 'DEPTH', kind: 'render', ver: 1, does: 'The city in three dimensions: every block built in 3D from the city engine\'s own data (the ground from its painting, buildings at the lighting engine\'s heights with floors, windows and storefronts drawn by a shader, vehicles at real sizes, trees by kind and season, furniture, lamps, fires), lit by the sun and the moon with shadows, the sky by scattering, fog by the weather, the nearest real lights from the lighting engine, and finished with a filmic curve, bloom, a gritty grade, grain and anti-aliasing.',
  provides: ['view3d', 'world3d', 'light3d'], needs: ['WORLD', 'LUX', 'WX'],
  feats: { need: ['webgl2'], without: 'the game is played in the top-down view' },
  state: () => !DEPTH.on ? 'off (top-down view)' : !DEPTH.ok ? (DEPTH.why || 'starting') : DQ[DEPTH.lvl].name + ' · ' + DEPTH.chunks.size + ' blocks · ' + DEPTH.calls + ' draws · ' + Math.round(DEPTH.tris / 1000) + 'k triangles',
  level: () => DEPTH.lvl, trim: () => { if (DEPTH.lvl > 0) { DEPTH.adapt--; return true; } return false; }, boost: () => { if (DEPTH.adapt < 0) { DEPTH.adapt++; return true; } return false; },
  check: () => { if (!DEPTH.on) return ''; if (DEPTH.ok && DEPTH.R && DEPTH.R.getContext().isContextLost()) return 'its graphics context is lost'; if (DEPTH.chunks.size > 80) return 'it is holding ' + DEPTH.chunks.size + ' blocks'; return ''; },
  repair: () => { if (DEPTH.chunks.size > 80) for (const k of [...DEPTH.chunks.keys()].slice(0, DEPTH.chunks.size - 40)) depthChunkDrop(k); },
  selfTest: depthSelfTest,
  docs: { what: 'The 3D world: blocks, buildings, light, sky, fog and the look.', how: 'Reads the city engine\'s blocks and the lighting engine\'s sun, ambient and lights every frame; draws with three.js (WebGL 2).' }
});
