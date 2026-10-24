/* ================= FLESH: the living and the dead in 3D (1.9.999) =================
   The bodies of the 3D view. Nothing new is invented about them: they are the game's own characters, moved by the
   game's own animation engines, shown in three dimensions.
   - The dead. Every one of the fifty is LEGEND's sculpted 3D model of that zombie (its skin, its clothes, its hair, the
     dead face, torn hems and stains), stretched to that zombie's own proportions (a lanky one's long arms, a bloater's
     girth, a brute's shoulders) and moved by ANIMA, the same skeleton and the same seventy-five animations that drew it
     from above: the joints ANIMA solves each frame become seventeen bones, and the graphics chip bends the model with
     them (GPU skinning, instanced: one draw for every zombie of a kind on screen, so a horde of hundreds stays cheap).
     Each body carries its own blood (more the more it has been hurt), char from fire and frost, and flashes when hit.
     The nearest move every frame; further out their animation is worked out every second or third frame (they are too
     far to tell) and beyond the fog they are not drawn at all.
   - Where they fell. A corpse finishes its death in 3D (falling the way ANIMA chose for the bullet, the knife or the
     blast), lies where it dropped, and sinks away when its time is up.
   - The survivor. The Operator (or whichever legend is deployed) is LEGEND's full model with his kit and both guns of
     his loadout, posed each frame by LEGEND's own systems: the legs on LOCO (the gait at his real speed, the steps
     toward where he moves), the upper body on the ARMS engine's state (relaxed, ready, the shot, reloads beat by beat,
     swaps, sprint, the knife, the roll), the chest turned toward the aim over the hips, the hands on the gun by reach.
     Teammates in co-op are drawn the same way.
   It works out the textures once (LEGEND's procedural atlas), builds a kind's model the first time it is seen (one a
   frame), and steps its own detail down (fewer bodies animated every frame, the simpler model sooner) when it runs late. */
const FB = ['pelvis', 'spine', 'chest', 'neck', 'head', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
const FBN = FB.length, FBI = {}; FB.forEach((n, i) => { FBI[n] = i; });
const FLESH = {
  ok: false, types: new Map(), building: 0, tex: null, data: null, cap: 0, used: 0, ptex: null, pdata: null, players: new Map(), mat: null, dmat: null, pmat: null, pdmat: null,
  atlasVer: -1, tA: null, tH: null, tL: null, J: null, ms: 0, msAvg: 0, drawn: 0, live: 0, corpses: 0, adapt: 0, errT: [], offUntil: 0, frame: 0,
  muz: null, light: null, grid: [5, 4], T: 64
};
// how the LEGEND bones fold onto the seventeen the dead are moved by (fingers into the hand, the toe into the foot)
let FB_OF = null, FB_OFF = null;
function fleshBoneMap() {
  if (FB_OF) return;
  FB_OF = new Int16Array(LG_NB_MAX).fill(-1); FB_OFF = new Float32Array(LG_NB_MAX * 3);
  for (let i = 0; i < LG_NB; i++) {
    let j = i, ox = 0, oy = 0, oz = 0;
    while (j >= 0 && FBI[LG_SKEL[j][0]] == null) { ox += LG_OFF[j * 3]; oy += LG_OFF[j * 3 + 1]; oz += LG_OFF[j * 3 + 2]; j = LG_PAR[j]; }
    if (j < 0) continue;
    // props and the mask's plates are not on the dead
    const n = LG_SKEL[i][0]; if (LG_PBONES.indexOf(n) >= 0 || LG_CBONES.indexOf(n) >= 0 || n === 'knife' || n === 'root' || /^m[A-Z]/.test(n)) continue;
    FB_OF[i] = FBI[LG_SKEL[j][0]]; FB_OFF[i * 3] = ox; FB_OFF[i * 3 + 1] = oy; FB_OFF[i * 3 + 2] = oz;
  }
}

/* ---------- the shader: LEGEND's materials on the standard lighting, skinned from a texture of bones ---------- */
function fleshMaterial(o) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0, envMapIntensity: 0.6 });
  const W = o.bones * 3;
  const vHead = `
    attribute vec4 aC; attribute vec4 aM; attribute vec2 aX; attribute float aBone;` + (o.inst ? ` attribute float aRow; attribute vec4 aZ;` : '') + `
    uniform highp sampler2D uBones; uniform float uRow;
    varying vec4 vC; varying vec4 vM; varying vec2 vX; varying vec2 vU2; varying vec3 vObj; varying vec4 vZ;
    mat4 fleshBone() { int b = int(aBone + 0.5) * 3; int r = int(` + (o.inst ? 'aRow' : 'uRow') + ` + 0.5);
      vec4 a = texelFetch(uBones, ivec2(b, r), 0), c = texelFetch(uBones, ivec2(b + 1, r), 0), d = texelFetch(uBones, ivec2(b + 2, r), 0);
      return mat4(a.x, c.x, d.x, 0.0, a.y, c.y, d.y, 0.0, a.z, c.z, d.z, 0.0, a.w, c.w, d.w, 1.0); }
  `;
  const fHead = `
    uniform sampler2D uA, uH, uAL; uniform vec2 uGrid; uniform float uTx, uTT, uGlow, uWet2; uniform vec3 uAcc;
    varying vec4 vC; varying vec4 vM; varying vec2 vX; varying vec2 vU2; varying vec3 vObj; varying vec4 vZ;
    float fR, fAO, fTile, fCut; vec4 fTh; vec3 fAlb;
    vec2 fTuv(float t, vec2 u) { vec2 f = clamp(fract(u), uTx, 1.0 - uTx); float r = floor(t / uGrid.x + 0.001); return (vec2(t - r * uGrid.x, r) + f) / uGrid; }
    float fHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float fNoise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(fHash(i), fHash(i + vec3(1, 0, 0)), f.x), mix(fHash(i + vec3(0, 1, 0)), fHash(i + vec3(1, 1, 0)), f.x), f.y), mix(mix(fHash(i + vec3(0, 0, 1)), fHash(i + vec3(1, 0, 1)), f.x), mix(fHash(i + vec3(0, 1, 1)), fHash(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
  `;
  m.onBeforeCompile = sh => {
    sh.uniforms.uBones = o.texU; sh.uniforms.uRow = o.row || { value: 0 };
    sh.uniforms.uA = FLESH.uA; sh.uniforms.uH = FLESH.uH; sh.uniforms.uAL = FLESH.uAL; sh.uniforms.uGrid = FLESH.uGrid; sh.uniforms.uTx = FLESH.uTx; sh.uniforms.uTT = FLESH.uTT;
    sh.uniforms.uGlow = o.glow || { value: 1 }; sh.uniforms.uAcc = o.acc || { value: new THREE.Vector3(1, 0.3, 0.2) }; sh.uniforms.uWet2 = DU.uWet;
    sh.vertexShader = vHead + sh.vertexShader
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n mat4 fB = fleshBone(); objectNormal = normalize(mat3(fB) * objectNormal);')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vObj = transformed; transformed = (fB * vec4(transformed, 1.0)).xyz; vC = aC; vM = aM; vX = aX; vU2 = uv;' + (o.inst ? ' vZ = aZ;' : ' vZ = vec4(0.0);'));
    sh.fragmentShader = fHead + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        { float slot = vC.a; fCut = step(3.5, slot); float sl = slot - 4.0 * fCut; fTile = floor(vM.x + 0.5);
          vec3 base = (sl > 0.5 && sl < 2.5) ? uAcc : vC.rgb; fAlb = base; fR = vM.y; fAO = 1.0; fTh = vec4(0.5, 0.6, 1.0, 1.0);
          if (fTile >= 0.0) { vec2 tu = fTuv(fTile, vU2); vec3 ta = texture2D(uA, tu).rgb; fTh = texture2D(uH, tu);
            if (fCut > 0.5 && fTh.b < 0.5) discard;
            vec2 dx = dFdx(vU2 * uTT), dy = dFdy(vU2 * uTT); float lod = log2(max(max(length(dx), length(dy)), 1e-4));
            ta = mix(ta, texture2D(uAL, tu).rgb, clamp((lod - 1.2) * 0.6, 0.0, 1.0) * (1.0 - fCut));
            fAlb = base * ta * ta; fR = clamp(fR * (0.55 + 0.9 * fTh.g), 0.03, 1.0); fAO = mix(1.0, fTh.b, 0.75 * (1.0 - fCut)); }
          // the dead's own blood in patches (more on the badly hurt), char from fire, frost
          float n1 = fNoise(vObj * 9.0 + vZ.y * 3.0), n2 = fNoise(vObj * 23.0);
          float bl = smoothstep(0.62 - vZ.y * 0.25, 0.8 - vZ.y * 0.2, n1 * 0.75 + n2 * 0.25) * clamp(vZ.y * 1.5, 0.0, 1.0);
          fAlb = mix(fAlb, vec3(0.13, 0.008, 0.006), bl * 0.9); fR = mix(fR, 0.3, bl * 0.8);
          fAlb = mix(fAlb, vec3(0.025, 0.02, 0.018), vZ.z * smoothstep(0.25, 0.65, n1));
          fAlb = mix(fAlb, vec3(0.7, 0.84, 0.95), vZ.w * 0.55 * smoothstep(0.4, 0.7, n2));
          fAlb *= 1.0 - uWet2 * 0.25 * vX.y;
          diffuseColor.rgb = fAlb * fAO; }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(fR, mix(0.12, 0.42, vX.y), uWet2 * 0.7);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor = vM.z;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (fTile >= 0.0 && vX.x > 0.0) { float e = 1.0 / uTT; float hx = texture2D(uH, fTuv(fTile, vU2 + vec2(e, 0.0))).r, hy = texture2D(uH, fTuv(fTile, vU2 + vec2(0.0, e))).r;
          vec3 dp1 = dFdx(-vViewPosition), dp2 = dFdy(-vViewPosition); vec2 du1 = dFdx(vU2), du2 = dFdy(vU2); vec3 p2 = cross(dp2, normal), p1 = cross(normal, dp1);
          vec3 Tg = p2 * du1.x + p1 * du2.x, Bg = p2 * du1.y + p1 * du2.y; float im = inversesqrt(max(max(dot(Tg, Tg), dot(Bg, Bg)), 1e-12));
          vec2 dx2 = dFdx(vU2 * uTT); float fadeN = 1.0 - clamp((log2(max(length(dx2), 1e-4)) - 0.8) * 0.5, 0.0, 1.0);
          normal = normalize(normal - (Tg * im * (hx - fTh.r) + Bg * im * (hy - fTh.r)) * vX.x * 3.0 * fadeN); }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n { float sl = vC.a - 4.0 * fCut; totalEmissiveRadiance += ((sl > 1.5 && sl < 2.5) ? uAcc * uGlow : fAlb) * vM.w + vec3(1.0, 0.82, 0.72) * vZ.x * 0.32; }');
    m._sh = sh;
  };
  m.customProgramCacheKey = () => 'flesh' + (o.inst ? 'I' : 'P') + o.bones;
  return m;
}
// the same bones for the shadow pass
function fleshDepthMaterial(o) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = sh => {
    sh.uniforms.uBones = o.texU; sh.uniforms.uRow = o.row || { value: 0 };
    sh.vertexShader = `attribute float aBone;` + (o.inst ? ` attribute float aRow;` : '') + ` uniform highp sampler2D uBones; uniform float uRow;
      mat4 fleshBone() { int b = int(aBone + 0.5) * 3; int r = int(` + (o.inst ? 'aRow' : 'uRow') + ` + 0.5); vec4 a = texelFetch(uBones, ivec2(b, r), 0), c = texelFetch(uBones, ivec2(b + 1, r), 0), d = texelFetch(uBones, ivec2(b + 2, r), 0); return mat4(a.x, c.x, d.x, 0.0, a.y, c.y, d.y, 0.0, a.z, c.z, d.z, 0.0, a.w, c.w, d.w, 1.0); }
    ` + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed = (fleshBone() * vec4(transformed, 1.0)).xyz;');
  };
  m.customProgramCacheKey = () => 'fleshD' + (o.inst ? 'I' : 'P') + o.bones;
  return m;
}
function fleshBoneTex(w, h) {
  const d = new Float32Array(w * h * 4), t = new THREE.DataTexture(d, w, h, THREE.RGBAFormat, THREE.FloatType);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}
function fleshInit() {
  if (FLESH.ok) return true;
  if (typeof THREE === 'undefined' || !DEPTH.ok) return false;
  fleshBoneMap();
  FLESH.J = new Float32Array(NJ * 3);
  FLESH.uA = { value: null }; FLESH.uH = { value: null }; FLESH.uAL = { value: null }; FLESH.uGrid = { value: new THREE.Vector2(LT_COLS, LT_ROWS) }; FLESH.uTx = { value: 0.5 / 64 }; FLESH.uTT = { value: 64 };
  FLESH.cap = 256; FLESH.tex = fleshBoneTex(FBN * 3, FLESH.cap); FLESH.data = FLESH.tex.image.data; FLESH.uBones = { value: FLESH.tex };
  FLESH.ptex = fleshBoneTex(LG_NB_MAX * 3, 8); FLESH.pdata = FLESH.ptex.image.data; FLESH.uPB = { value: FLESH.ptex };
  const zo = { bones: FBN, inst: true, texU: FLESH.uBones };
  FLESH.mat = fleshMaterial(zo); FLESH.dmat = fleshDepthMaterial(zo);
  fleshAtlas();
  FLESH.ok = true;
  return true;
}
function fleshFree() {
  for (const T of FLESH.types.values()) for (const L of T.lod) if (L) { if (L.mesh) { DEPTH.scene && DEPTH.scene.remove(L.mesh); L.mesh.dispose(); } L.geo.dispose(); }
  FLESH.types.clear();
  for (const R of FLESH.players.values()) { if (R.mesh) { DEPTH.scene && DEPTH.scene.remove(R.mesh); R.geo.dispose(); R.mat.dispose(); R.dmat.dispose(); } }
  FLESH.players.clear();
  for (const k of ['tex', 'ptex', 'tA', 'tH', 'tL']) if (FLESH[k]) { FLESH[k].dispose(); FLESH[k] = null; }
  for (const k of ['mat', 'dmat']) if (FLESH[k]) { FLESH[k].dispose(); FLESH[k] = null; }
  FLESH.ok = false; FLESH.atlasVer = -1;
}
// LEGEND's texture atlas on the graphics chip (it asks for a sharper one for the 3D view and swaps it in when painted)
function fleshAtlas() {
  const want = DEPTH.lvl >= 2 ? 256 : 128;
  if ((!LG.atlas || LG.atlas.T < want) && !LG.atlasBusy && typeof lgAtlasGet === 'function') lgAtlasGet(want);
  const at = LG.atlas; if (!at || !at.done || at.ver === FLESH.atlasVer) return;
  for (const k of ['tA', 'tH', 'tL']) if (FLESH[k]) FLESH[k].dispose();
  const mk = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.NoColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.flipY = false; return t; };
  FLESH.tA = mk(at.A, true); FLESH.tH = mk(at.H, false); FLESH.tL = mk(at.lo || at.A, true);
  FLESH.uA.value = FLESH.tA; FLESH.uH.value = FLESH.tH; FLESH.uAL.value = FLESH.tL; FLESH.uTx.value = 0.5 / at.T; FLESH.uTT.value = at.T;
  FLESH.atlasVer = at.ver;
}

/* ---------- a kind of zombie: its model, folded to seventeen bones ---------- */
function fleshGeoFrom(m, fold) {
  const S = LG_STRIDE, V = m.V, nv = m.nv;
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), aC = new Float32Array(nv * 4), aM = new Float32Array(nv * 4), aX = new Float32Array(nv * 2), aB = new Float32Array(nv);
  const keep = new Uint8Array(nv);
  for (const r of m.runs) {
    const b = r.b; let fi = b, ox = 0, oy = 0, oz = 0;
    if (fold) { fi = FB_OF[b]; if (fi < 0) continue; ox = FB_OFF[b * 3]; oy = FB_OFF[b * 3 + 1]; oz = FB_OFF[b * 3 + 2]; }
    for (let v = r.v0; v < r.v0 + r.nv; v++) {
      const k = v * S; keep[v] = 1;
      pos[v * 3] = V[k] + ox; pos[v * 3 + 1] = V[k + 1] + oy; pos[v * 3 + 2] = V[k + 2] + oz;
      nrm[v * 3] = V[k + 3]; nrm[v * 3 + 1] = V[k + 4]; nrm[v * 3 + 2] = V[k + 5];
      uv[v * 2] = V[k + 6]; uv[v * 2 + 1] = V[k + 7];
      aC[v * 4] = V[k + 8]; aC[v * 4 + 1] = V[k + 9]; aC[v * 4 + 2] = V[k + 10]; aC[v * 4 + 3] = V[k + 11];
      aM[v * 4] = V[k + 12]; aM[v * 4 + 1] = V[k + 13]; aM[v * 4 + 2] = V[k + 14]; aM[v * 4 + 3] = V[k + 15];
      aX[v * 2] = V[k + 16]; aX[v * 2 + 1] = V[k + 17]; aB[v] = fi;
    }
  }
  // triangles of the bones left out (props) are dropped
  const I = m.I, out = []; for (let i = 0; i < I.length; i += 3) if (keep[I[i]] && keep[I[i + 1]] && keep[I[i + 2]]) out.push(I[i], I[i + 1], I[i + 2]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('aC', new THREE.BufferAttribute(aC, 4)); g.setAttribute('aM', new THREE.BufferAttribute(aM, 4)); g.setAttribute('aX', new THREE.BufferAttribute(aX, 2)); g.setAttribute('aBone', new THREE.BufferAttribute(aB, 1));
  g.setIndex(nv > 65535 ? new THREE.Uint32BufferAttribute(out, 1) : new THREE.Uint16BufferAttribute(out, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return g;
}
function fleshType(m) {
  const key = m.def ? m.def.key : 'office'; let T = FLESH.types.get(key);
  if (T) return T.lod[0] ? T : null;
  if (FLESH.building >= 1) return null;   // one new kind a frame
  FLESH.building++;
  T = { key: key, lod: [null, null], n: [0, 0] }; FLESH.types.set(key, T);
  try {
    for (let l = 0; l < 2; l++) {
      const lm = lgModel('zombie', l === 0 ? 1 : DEPTH.lvl <= 1 ? 3 : 2, key); if (!lm) continue;   // (the far ones: 2,500 triangles, or 780 at Low and Medium)
      const g = fleshGeoFrom(lm, true), cap = 64;
      g.setAttribute('aRow', new THREE.InstancedBufferAttribute(new Float32Array(cap), 1));
      g.setAttribute('aZ', new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4));
      const mesh = new THREE.InstancedMesh(g, FLESH.mat, cap); mesh.customDepthMaterial = FLESH.dmat; mesh.castShadow = l === 0 || DEPTH.lvl >= 3; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.count = 0;   // (the far ones cast no shadow below Ultra)
      const I4 = new THREE.Matrix4(); for (let i = 0; i < cap; i++) mesh.setMatrixAt(i, I4); mesh.instanceMatrix.needsUpdate = true;
      DEPTH.scene.add(mesh); T.lod[l] = { geo: g, mesh: mesh, cap: cap, tris: lm.tris };
    }
  } catch (e) { coreHurt('FLESH', e); try { console.error(e); } catch (x) { } }
  return T.lod[0] ? T : null;
}
// a mesh full: twice the room (the attribute buffers are rebuilt)
function fleshGrow(L, need) {
  let cap = L.cap; while (cap < need) cap *= 2; if (cap === L.cap) return;
  const g = L.geo; g.setAttribute('aRow', new THREE.InstancedBufferAttribute(new Float32Array(cap), 1)); g.setAttribute('aZ', new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4));
  const old = L.mesh, mesh = new THREE.InstancedMesh(g, FLESH.mat, cap); mesh.customDepthMaterial = FLESH.dmat; mesh.castShadow = old.castShadow; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.count = 0;
  const I4 = new THREE.Matrix4(); for (let i = 0; i < cap; i++) mesh.setMatrixAt(i, I4); mesh.instanceMatrix.needsUpdate = true;
  DEPTH.scene.remove(old); old.dispose(); DEPTH.scene.add(mesh); L.mesh = mesh; L.cap = cap;
}

/* ---------- bones from ANIMA's joints ---------- */
// joint j of skeleton J (zombie units: x forward, y right, z up) in the 3D world (metres)
const FV = { o: [0, 0, 0], m: [0, 0, 0], f: [0, 0, 0], l: [0, 0, 0], a: [0, 0, 0], b: [0, 0, 0], X: [0, 0, 0], Y: [0, 0, 0], Z: [0, 0, 0], up: [0, 1, 0] };
const FP = new Float32Array(NJ * 3);
function fleshJointsWorld(J, ang, rm, X0, Y0, Z0) {
  const c = Math.cos(ang), s = Math.sin(ang);
  for (let j = 0; j < NJ; j++) {
    const k = j * 3, jx = J[k], jy = J[k + 1], jz = J[k + 2];
    if (j === JN.fdir || j === JN.hup) { FP[k] = jx * c - jy * s; FP[k + 1] = jz; FP[k + 2] = jx * s + jy * c; continue; }
    FP[k] = X0 + (jx * c - jy * s) * rm; FP[k + 1] = Y0 + jz * rm; FP[k + 2] = Z0 + (jx * s + jy * c) * rm;
  }
}
const fSub = (o, a, ai, b, bi) => { o[0] = a[ai] - b[bi]; o[1] = a[ai + 1] - b[bi + 1]; o[2] = a[ai + 2] - b[bi + 2]; return o; };
const fLen = v => Math.hypot(v[0], v[1], v[2]);
function fNorm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; v[0] /= l; v[1] /= l; v[2] /= l; return v; }
function fCross(o, a, b) { const x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0]; o[0] = x; o[1] = y; o[2] = z; return o; }
// write bone bi of row r: origin o, a main direction (normalised), a forward reference; mode 0: the bone hangs down its
// -z (limbs), 1: it rises along +z (spine, neck), 2: x along the main direction and z toward up (feet, head)
function fBone(D, row, bi, o, main, fwd, mode, sx, sy, sz) {
  const X = FV.X, Y = FV.Y, Zc = FV.Z;
  if (mode === 2) {
    X[0] = main[0]; X[1] = main[1]; X[2] = main[2]; fNorm(X);
    const d = fwd[0] * X[0] + fwd[1] * X[1] + fwd[2] * X[2]; Zc[0] = fwd[0] - X[0] * d; Zc[1] = fwd[1] - X[1] * d; Zc[2] = fwd[2] - X[2] * d;
    if (fLen(Zc) < 1e-4) { Zc[0] = 0; Zc[1] = 1; Zc[2] = 0; } fNorm(Zc);
  } else {
    const k = mode === 0 ? -1 : 1; Zc[0] = main[0] * k; Zc[1] = main[1] * k; Zc[2] = main[2] * k; fNorm(Zc);
    const d = fwd[0] * Zc[0] + fwd[1] * Zc[1] + fwd[2] * Zc[2]; X[0] = fwd[0] - Zc[0] * d; X[1] = fwd[1] - Zc[1] * d; X[2] = fwd[2] - Zc[2] * d;
    if (fLen(X) < 1e-4) { X[0] = 1; X[1] = 0; X[2] = 0; const d2 = Zc[0]; X[0] -= Zc[0] * d2; X[1] -= Zc[1] * d2; X[2] -= Zc[2] * d2; } fNorm(X);
  }
  fCross(Y, Zc, X);
  const p = (row * D.w + bi * 3) * 4, A = D.a;
  A[p] = X[0] * sx; A[p + 1] = Y[0] * sy; A[p + 2] = Zc[0] * sz; A[p + 3] = o[0];
  A[p + 4] = X[1] * sx; A[p + 5] = Y[1] * sy; A[p + 6] = Zc[1] * sz; A[p + 7] = o[1];
  A[p + 8] = X[2] * sx; A[p + 9] = Y[2] * sy; A[p + 10] = Zc[2] * sz; A[p + 11] = o[2];
}
const FDW = { a: null, w: FBN * 3 };
// a zombie's seventeen bones from its joints (J in its own units), into row `row` of the bone texture
function fleshBonesOf(J, m, ang, rm, X0, Y0, Z0, row) {
  const D = m.ad; fleshJointsWorld(J, ang, rm, X0, Y0, Z0);
  const P = FP, o = FV.o, mn = FV.m, f = FV.f, l = FV.l, a = FV.a, up = FV.up, W = FDW; W.a = FLESH.data;
  const kS = rm / 0.31 * 0.97, kW = D.chW / 0.78 * kS, kD = (D.chD / 0.4 + D.belly * 0.35) * kS, kA = D.limb / 0.32 * kS, kL = D.leg / 0.5 * kS, kH = D.headR / 0.26 * kS;
  const J3 = i => i * 3;
  // the hips: up the spine, forward from the hips' line
  fSub(l, P, J3(JN.hipL), P, J3(JN.hipR)); fSub(mn, P, J3(JN.chest), P, J3(JN.pel)); const spL = fLen(mn); fNorm(mn);
  fCross(f, l, mn); fNorm(f);
  o[0] = P[J3(JN.pel)]; o[1] = P[J3(JN.pel) + 1]; o[2] = P[J3(JN.pel) + 2];
  fBone(W, row, 0, o, mn, f, 1, kD, kW, kS);
  // the lower spine (a third of the way up) and the chest (its forward from the shoulders)
  const pf = [f[0], f[1], f[2]];
  o[0] = P[J3(JN.pel)] + mn[0] * spL / 3; o[1] = P[J3(JN.pel) + 1] + mn[1] * spL / 3; o[2] = P[J3(JN.pel) + 2] + mn[2] * spL / 3;
  fBone(W, row, 1, o, mn, f, 1, kD, kW, spL * 2 / 3 / 0.2);
  fSub(l, P, J3(JN.shL), P, J3(JN.shR)); fSub(mn, P, J3(JN.neck), P, J3(JN.chest)); const chL = fLen(mn); fNorm(mn); fCross(f, l, mn); fNorm(f);
  const cf = [f[0], f[1], f[2]];
  o[0] = P[J3(JN.chest)]; o[1] = P[J3(JN.chest) + 1]; o[2] = P[J3(JN.chest) + 2];
  fBone(W, row, 2, o, mn, f, 1, kD, kW, chL / 0.25);
  // the head: where it faces and which way is up; the neck reaches from the top of the spine to the base of the skull
  const fd = [P[J3(JN.fdir)], P[J3(JN.fdir) + 1], P[J3(JN.fdir) + 2]], hu = [P[J3(JN.hup)], P[J3(JN.hup) + 1], P[J3(JN.hup) + 2]]; fNorm(fd); fNorm(hu);
  const hb = [P[J3(JN.head)] - hu[0] * 0.095 * kH, P[J3(JN.head) + 1] - hu[1] * 0.095 * kH, P[J3(JN.head) + 2] - hu[2] * 0.095 * kH];
  mn[0] = hb[0] - P[J3(JN.neck)]; mn[1] = hb[1] - P[J3(JN.neck) + 1]; mn[2] = hb[2] - P[J3(JN.neck) + 2]; const nkL = fLen(mn); fNorm(mn);
  o[0] = P[J3(JN.neck)]; o[1] = P[J3(JN.neck) + 1]; o[2] = P[J3(JN.neck) + 2];
  fBone(W, row, 3, o, mn, fd, 1, kA * 1.1, kA * 1.1, Math.max(0.2, nkL / 0.09));
  fBone(W, row, 4, hb, fd, hu, 2, kH, kH, kH);
  // the arms: shoulder to elbow to wrist, the hand hanging on from the forearm
  for (let s = 0; s < 2; s++) {
    const sh = s ? JN.shR : JN.shL, el = sh + 1, ha = sh + 2, b0 = s ? 8 : 5;
    fSub(mn, P, J3(el), P, J3(sh)); const aL = fLen(mn); fNorm(mn); o[0] = P[J3(sh)]; o[1] = P[J3(sh) + 1]; o[2] = P[J3(sh) + 2];
    fBone(W, row, b0, o, mn, cf, 0, kA, kA, Math.max(0.05, aL / 0.285));
    fSub(mn, P, J3(ha), P, J3(el)); const fL2 = fLen(mn); fNorm(mn); o[0] = P[J3(el)]; o[1] = P[J3(el) + 1]; o[2] = P[J3(el) + 2];
    fBone(W, row, b0 + 1, o, mn, cf, 0, kA, kA, Math.max(0.05, fL2 / 0.27));
    o[0] = P[J3(ha)]; o[1] = P[J3(ha) + 1]; o[2] = P[J3(ha) + 2];
    fBone(W, row, b0 + 2, o, mn, cf, 0, kA * 0.95, kA * 0.95, kA * (D.claws ? 1.25 : 1));
  }
  // the legs: hip to knee to ankle (a foot's height over where the foot is), the foot flat toward its toe
  for (let s = 0; s < 2; s++) {
    const hp = s ? JN.hipR : JN.hipL, kn = hp + 1, ft = hp + 2, toe = s ? JN.toeR : JN.toeL, b0 = s ? 14 : 11;
    fSub(mn, P, J3(kn), P, J3(hp)); const tL = fLen(mn); fNorm(mn); o[0] = P[J3(hp)]; o[1] = P[J3(hp) + 1]; o[2] = P[J3(hp) + 2];
    fBone(W, row, b0, o, mn, pf, 0, kL, kL, Math.max(0.05, tL / 0.43));
    const an = [P[J3(ft)], P[J3(ft) + 1] + 0.072 * kL, P[J3(ft) + 2]];
    mn[0] = an[0] - P[J3(kn)]; mn[1] = an[1] - P[J3(kn) + 1]; mn[2] = an[2] - P[J3(kn) + 2]; const sL = fLen(mn); fNorm(mn); o[0] = P[J3(kn)]; o[1] = P[J3(kn) + 1]; o[2] = P[J3(kn) + 2];
    fBone(W, row, b0 + 1, o, mn, pf, 0, kL, kL, Math.max(0.05, sL / 0.42));
    fSub(a, P, J3(toe), P, J3(ft)); if (fLen(a) < 1e-4) { a[0] = pf[0]; a[1] = 0; a[2] = pf[2]; }
    fBone(W, row, b0 + 2, an, a, up, 2, kL, kL, kL);
  }
}

/* ---------- the frame: the dead, the corpses, the survivors ---------- */
// how high the ground is under someone: the sidewalk's curb in the city blocks
function fleshGroundY(o) {
  const c = chunks.get(Math.floor(o.x / CHS) + ',' + Math.floor(o.y / CHS)); if (!c) return 0;
  const bio = c.bio; if (bio === 'desert' || bio === 'snow' || c.wm) return 0;
  const lx = o.x - c.sx, ly = o.y - c.sy, r0 = ROAD * SCL;
  return lx > r0 && ly > r0 ? 0.15 : 0;
}
function fleshHeightOf(z) { const rm = z.r / dUPM(); if (z.m && z.m.ad) return z.m.ad.H * rm * 0.98; const P = z.fly ? null : fleshProxy(z); return P ? P.m.ad.H * rm * 0.62 * 0.98 : z.fly ? 2.2 : 3.4 * rm; }
const FL_LIST = [];
function fleshFrame(dt) {
  const t0 = performance.now();
  if (!FLESH.ok && !fleshInit()) return;
  try {
    fleshAtlas();
    FLESH.building = 0; FLESH.frame++;
    if (typeof animaFrame === 'function') animaFrame(dt);
    for (const T of FLESH.types.values()) { T.n[0] = T.n[1] = 0; }
    const U = dUPM(), C = DEPTH.cam, cx = C.position.x, cz = C.position.z, fx = HOVER.f3[0], fz = HOVER.f3[2], far = DEPTH.fogFar * 1.05 + 6, far2 = far * far;
    const near0 = 15 + DEPTH.lvl * 4, liveCap = Math.max(10, [24, 40, 64, 96][DEPTH.lvl] + FLESH.adapt * 10);
    // who is in view: in front of the camera (or right beside it) and nearer than the fog
    FL_LIST.length = 0;
    for (const z of G.zs) {
      if (z.dead || !z.m || z.fly) continue;
      if (!z.m.v2 && !fleshProxy(z)) continue;   // (a boss, the Snatcher or an old mutation: drawn as a roster body standing in)
      const x = dX(z.x) - cx, y = dZ(z.y) - cz, d2 = x * x + y * y; if (d2 > far2) continue;
      if (x * fx + y * fz < -4 && d2 > 36) continue;
      FL_LIST.push({ z: z, d2: d2, c: null });
    }
    const L = ANIMA.corpses;
    for (let i = 0; i < L.length; i++) { const Cc = L[i], x = dX(Cc.x) - cx, y = dZ(Cc.y) - cz, d2 = x * x + y * y; if (d2 > far2 || (x * fx + y * fz < -4 && d2 > 36)) continue; FL_LIST.push({ z: null, d2: d2, c: Cc }); }
    FL_LIST.sort((a, b) => a.d2 - b.d2);
    const n = Math.min(FL_LIST.length, [140, 260, 420, 600][DEPTH.lvl] + FLESH.adapt * 40);
    if (n > FLESH.cap) { let c2 = FLESH.cap; while (c2 < n) c2 *= 2; FLESH.tex.dispose(); FLESH.cap = c2; FLESH.tex = fleshBoneTex(FBN * 3, c2); FLESH.data = FLESH.tex.image.data; FLESH.uBones.value = FLESH.tex; }
    let row = 0, live = 0, nc = 0; const J = FLESH.J;
    for (let i = 0; i < n; i++) {
      const it = FL_LIST[i];
      if (it.z) {
        const z0 = it.z, z = z0.m.v2 ? z0 : fleshProxy(z0), T = fleshType(z.m); if (!T) continue;
        // the nearest move every frame; further out the full pose every second or third frame
        const full = live < liveCap || ((FLESH.frame + (z.nid | 0)) % (it.d2 > 900 ? 3 : 2)) === 0;
        const A = animaTick(z, G.rdt || dt, full); if (full) live++;
        ANIMA.sev = z.sever | 0; animaFK(z.m.ad, A.pose, J); ANIMA.sev = 0;
        const rm = z.r / U * (z0 !== z ? 0.62 : 1), gy = fleshGroundY(z) + (z.pz || 0) - (z.under ? 0.45 : 0);   // (a stand-in boss body: two and a half times a man, not five)
        let x = z.x, y = z.y; if (z.warn > 0 && z.m.an.ab === 'bomber') { x += rand(-1, 1); y += rand(-1, 1); }
        fleshBonesOf(J, z.m, z.ang, rm, dX(x), gy, dZ(y), row);
        const l = it.d2 < near0 * near0 ? 0 : 1, Lm = T.lod[l] || T.lod[0];
        fleshPut(T, Lm, l, row, Math.min(1, (z.flash || 0) * 9), clamp(1 - z.hp / Math.max(1, z.maxHp), 0, 1) * 0.9 + (z.wnd ? 0.15 : 0), z.charK || (z.burnT > 0 ? 0.4 : 0), z.frostK || 0);
        A.J3 = frameNo;
      } else {
        const Cc = it.c, T = fleshType(Cc.m); if (!T) continue;
        const P = Cc.done ? (Cc.lastP || (Cc.lastP = new Float32Array(aCorpsePose(Cc)))) : aCorpsePose(Cc);
        ANIMA.sev = Cc.sever | 0; animaFK(Cc.m.ad, P, J); ANIMA.sev = 0;
        const life = aCorpseLife(), fade = Cc.done ? clamp((life - Cc.life) / 3, 0, 1) : 1, rm = Cc.r / U;
        fleshBonesOf(J, Cc.m, Cc.ang, rm, dX(Cc.x), fleshGroundY(Cc) - (1 - fade) * 0.5, dZ(Cc.y), row);
        fleshPut(T, T.lod[1] || T.lod[0], 1, row, 0, 1, Cc.char || Cc.burn * 0.6, Cc.frost || 0); nc++;
      }
      row++;
    }
    FLESH.used = row; FLESH.live = live; FLESH.corpses = nc; FLESH.drawn = row;
    for (const T of FLESH.types.values()) for (let l = 0; l < 2; l++) { const Lm = T.lod[l]; if (!Lm) continue; Lm.mesh.count = T.n[l]; if (T.n[l]) { Lm.geo.attributes.aRow.needsUpdate = true; Lm.geo.attributes.aZ.needsUpdate = true; } }
    FLESH.tex.needsUpdate = true;
    // the survivors
    fleshPlayers(dt);
  } catch (e) { fleshHurt(e); }
  const ms = performance.now() - t0; FLESH.ms = ms; FLESH.msAvg = FLESH.msAvg * 0.94 + ms * 0.06; coreCost('FLESH', ms);
  if (FLESH.msAvg > 1000 / targetFps() * 0.3 && FLESH.adapt > -3 && PERF.fps < targetFps() * 0.9) { FLESH.adapt--; FLESH.msAvg *= 0.7; }
  else if (FLESH.msAvg < 1000 / targetFps() * 0.12 && FLESH.adapt < 0 && FLESH.frame % 240 === 0) FLESH.adapt++;
}
function fleshPut(T, Lm, l, row, flash, blood, burn, frost) {
  const i = T.n[l]; if (i >= Lm.cap) fleshGrow(Lm, i + 1);
  Lm.geo.attributes.aRow.array[i] = row; const z = Lm.geo.attributes.aZ.array; z[i * 4] = flash; z[i * 4 + 1] = blood; z[i * 4 + 2] = burn; z[i * 4 + 3] = frost;
  T.n[l] = i + 1;
}

/* ---------- the survivors: LEGEND's model posed by LOCO, ARMS and reach ---------- */
const FL_LEGS = ['root', 'pelvis', 'thighL', 'shinL', 'footL', 'toeL', 'thighR', 'shinR', 'footR', 'toeR', 'dump', 'tailL', 'tailR'];
function fleshPlayerList() {
  const out = [];
  if (G.p && G.mode !== 'title' && !G.p.down) out.push(G.p); else if (G.p && G.mode !== 'title' && G.p.down) out.push(G.p);
  if (NET.started) { if (NET.role === 'host') { for (const pr of NET.peers.values()) if (pr.p) out.push(pr.p); } else for (const q of NET.others.values()) out.push(q); }
  return out;
}
function fleshPlayers(dt) {
  const list = fleshPlayerList(), seen = new Set();
  let row = 0;
  for (const p of list) {
    if (row >= 8) break;
    let R = FLESH.players.get(p); const mk = lgvModelKey(p), lgId = p === G.p ? (SET.legend || 'operator') : (p.lg || 'operator');
    if (lgId === 'none') continue;
    const lod = DEPTH.lvl >= 2 && p === G.p ? 0 : 1, key = lgId + '|' + lod + '|' + mk.k;
    if (!R || R.key !== key) { if (R && R.mesh) { DEPTH.scene.remove(R.mesh); R.geo.dispose(); R.mat.dispose(); R.dmat.dispose(); } R = fleshPlayerBuild(p, lgId, lod, mk, key); if (!R) continue; FLESH.players.set(p, R); }
    R.row.value = row; seen.add(p);
    try { fleshPlayerPose(p, R, mk, row); R.mesh.visible = true; } catch (e) { fleshHurt(e); R.mesh.visible = false; }
    row++;
  }
  for (const [p, R] of FLESH.players) if (!seen.has(p)) { if (R.mesh) { DEPTH.scene.remove(R.mesh); R.geo.dispose(); R.mat.dispose(); R.dmat.dispose(); } FLESH.players.delete(p); }
  FLESH.ptex.needsUpdate = true;
}
function fleshPlayerBuild(p, lgId, lod, mk, key) {
  const m = lgModel(lgId, lod, mk.k); if (!m) return null;
  const g = fleshGeoFrom(m, false), row = { value: 0 }, cls = LG_CLASS_BY[mk.cls] || LG_CLASSES[0], acc = lgHex(cls.col);
  const o = { bones: LG_NB_MAX, inst: false, texU: FLESH.uPB, row: row, acc: { value: new THREE.Vector3(acc[0], acc[1], acc[2]) }, glow: { value: 1.15 } };
  const mat = fleshMaterial(o), dmat = fleshDepthMaterial(o);
  const mesh = new THREE.Mesh(g, mat); mesh.customDepthMaterial = dmat; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  DEPTH.scene.add(mesh);
  return { key: key, geo: g, mat: mat, dmat: dmat, mesh: mesh, row: row, P: lgPose(), P2: lgPose(), L: lgLocalNew(), W: lgWorldNew(), M4: lgM4() };
}
// one frame of a survivor's pose: the legs from LOCO, the upper body from the ARMS state, the chest turned to the aim
function fleshPlayerPose(p, R, mk, row) {
  const B = lgvStep(p, lgvBody(p)), U = lgvUpState(p, B), a = p.arm || { st: 'relaxed', t: 0, dur: 1 }, P = R.P, P2 = R.P2, fam = U.ctx.fam;
  lgPoseReset(P); let yaw = B.leg;
  if (U.full || p.down) {
    if (p.down) lgEvalClip(LG_ANIM_BY.down, LG_ANIM_BY.down.dur, P, { run: true, wc: fam === 'p' ? 'p' : 'r' });
    else lgvRoll(P, clamp(1 - p.dashT / (p.dashDur || 0.46), 0, 0.999), U.ctx);
    P.mask = 1; yaw = p.down ? (p.aim || 0) : B.leg;
  } else {
    // the upper body at the ARMS state's own moment (not the painted frames' steps)
    const ctx = Object.assign({}, U.ctx), st = U.st;
    let k = a.dur ? clamp(a.t / a.dur, 0, 0.999) : 0;
    if (st === 'sprint') k = B.ph % 1; else if (st === 'relaxed' || st === 'ready') { k = ((G.time || 0) / 4) % 1; ctx.t = (G.time || 0); }
    else if (st === 'shot') { const u = (G.time || 0) - (a.fireT || 0); k = clamp(u / LGV_SHOT_T, 0, 0.999); }
    else if (st === 'pump') { const u = (G.time || 0) - (a.fireT || 0), A2 = (p.weapon && p.weapon.arms) || {}; k = clamp((u - 0.06) / (A2.cycle || 0.5), 0, 0.999); }
    else if (st === 'raise' && a.st === 'lower') k = 1 - k;
    if (ctx.gun) ctx.fk = ctx.gun + ':' + st;
    lgGunSet(mk.gp, mk.gs);
    (LGV_UP[st] || LGV_UP.relaxed)(P, k, ctx); P.mask = 1;
    // the legs: LOCO at the real speed and direction, or the stand
    lgPoseReset(P2);
    const Lo = B.loco || {}, moving = B.clip === 'loco' || B.clip === 'turn';
    if (moving) locoPose(P2, B.ph, { v: B.clip === 'turn' ? 1.3 : (Lo.v || 1.3), dir: Lo.dir || 0, back: !!Lo.back, load: 0.3, arms: 'hold' });
    else lgEvalClip(LG_ANIM_BY.idle_ready, 0, P2, { run: true, wc: 'r' });
    for (const nm of FL_LEGS) { const i = LGB[nm]; if (i == null) continue; const k3 = i * 3; P.r[k3] = P2.r[k3]; P.r[k3 + 1] = P2.r[k3 + 1]; P.r[k3 + 2] = P2.r[k3 + 2]; P.t[k3] = P2.t[k3]; P.t[k3 + 1] = P2.t[k3 + 1]; P.t[k3 + 2] = P2.t[k3 + 2]; }
    if (P2.ik.footL) P.ik.footL = P2.ik.footL; else delete P.ik.footL;
    if (P2.ik.footR) P.ik.footR = P2.ik.footR; else delete P.ik.footR;
    P.root[0] = P2.root[0]; P.root[1] = P2.root[1]; P.root[2] = P2.root[2];
    // the chest turns over the hips toward the aim (the legs go where you walk, the gun where you look), and the recoil
    // pushes it back
    const tw = angD(B.leg, B.chest);
    lgJadd(P, 'spine', 0, 0, tw * 0.4); lgJadd(P, 'chest', 0, 0, tw * 0.6);
    lgJadd(P, 'chest', 0, -(B.kick.x || 0) * 3, 0);
    yaw = B.leg;
  }
  P.root[3] = 0;
  const W = lgSolve(P, R.L, R.W, lgRootM(P, R.M4)); lgGunSet(null, null);
  // into the world: LEGEND's frame (x forward, y left, z up, metres) turned to his heading and set on the ground
  const gx = dX(p.x), gz = dZ(p.y), gy = fleshGroundY(p), c = Math.cos(yaw), s = Math.sin(yaw), D = FLESH.pdata, w = LG_NB_MAX * 3;
  for (let b = 0; b < LG_NB; b++) {
    const M = W.subarray(b * 16, b * 16 + 16), pp = (row * w + b * 3) * 4;
    // world = T(g) * R(yaw) * C(lg -> 3D) * M ; C maps (x, y, z) to (x, z, -y); R turns about the vertical by the heading
    for (let col = 0; col < 4; col++) {
      const x = M[col * 4], y = M[col * 4 + 1], z = M[col * 4 + 2];
      // C: (x, y, z) -> (x, z, -y); then the heading: X' = X cos - Z' ... in the ground plane (east, south): a turn by yaw
      const ex = x, ey = z, ez = -y;
      const wx = ex * c - ez * s, wz = ex * s + ez * c;
      if (col < 3) { D[pp + col] = wx; D[pp + 4 + col] = ey; D[pp + 8 + col] = wz; }
      else { D[pp + 3] = wx + gx; D[pp + 7] = ey + gy; D[pp + 11] = wz + gz; }
    }
  }
  // where the muzzle is (for the flash and the tracers) and where the gun points
  if (p === G.p) {
    const mi = fam === 'p' ? LGB.pistol : LGB.carbine, MW = W.subarray(mi * 16, mi * 16 + 16), mo = lgSockFor(fam === 'p' ? 'pistol' : 'carbine', 'muz'), mz = lgPt(MW, mo[0], mo[1], mo[2]);
    const ex = mz[0], ey = mz[2], ez = -mz[1]; FLESH.muz = [ex * c - ez * s + gx, ey + gy, ex * s + ez * c + gz];
  }
}
// a stand-in body for a zombie with no 3D model of its own (the fifty bosses, the Snatcher, the old mutations): one of the
// big roster bodies, chosen by its seed so it is always the same one, animated by ANIMA like the rest (it reads the real
// zombie through its prototype, so speed, attacks and turning are its own); its size is the boss's own
const FL_PX = new WeakMap();
function fleshProxy(z) {
  let P = FL_PX.get(z); if (P) return P;
  if (typeof ZR === 'undefined' || !ZR.length) return null;
  if (!FLESH.big) FLESH.big = ZR.filter(m => m.v2 && m.ad).sort((a, b) => (b.size || 1) - (a.size || 1)).slice(0, 10);
  if (!FLESH.big.length) return null;
  const id = Math.abs((z.m && (z.m.seed != null ? z.m.seed : z.m.id)) | 0);
  P = Object.create(z); P.m = FLESH.big[id % FLESH.big.length]; FL_PX.set(z, P);
  return P;
}
function fleshHurt(e) {
  const now = performance.now(); coreHurt('FLESH', e); try { console.error(e); } catch (x) { }
  FLESH.errT.push(now); while (FLESH.errT.length && now - FLESH.errT[0] > 10000) FLESH.errT.shift();
  if (FLESH.errT.length >= 6) { FLESH.errT.length = 0; fleshFree(); coreRepaired('FLESH', '3D bodies: rebuilt after errors'); }
}
function fleshSelfTest() {
  let n = 0, pass = 0, why = ''; const t = (ok, w) => { n++; if (ok) pass++; else if (!why) why = w; };
  fleshBoneMap();
  // every finger folds into its hand, the toe into the foot, and the props are left off the dead
  t(FB_OF[LGB.idxL] === FBI.handL && FB_OF[LGB.toeR] === FBI.footR && FB_OF[LGB.pistol] === -1, 'the bone fold');
  // a bone hanging straight down: its local -z points at the ground, its x forward
  const save = FDW.a, A = new Float32Array(FBN * 3 * 4); FDW.a = A;
  fBone(FDW, 0, 0, [0, 1, 0], [0, -1, 0], [1, 0, 0], 0, 1, 1, 1);
  t(Math.abs(A[2]) < 1e-6 && Math.abs(A[6] - 1) < 1e-6 && Math.abs(A[0] - 1) < 1e-6, 'a limb bone frame');
  FDW.a = save;
  return { ok: pass === n, n: n, pass: pass, why: why };
}
coreDefine({ name: 'FLESH', kind: 'render', ver: 1, does: 'The living and the dead in 3D: each of the fifty zombies is LEGEND\'s sculpted model of it, stretched to its own proportions and moved by ANIMA\'s skeleton and seventy-five animations (GPU skinning, one draw per kind for the whole horde), with its own blood, char and frost; corpses finish their deaths and lie where they fell; the survivor is LEGEND\'s full model posed each frame by LOCO\'s gait, the ARMS engine\'s state and reach, the chest turned to the aim.',
  provides: ['bodies3d'], needs: ['DEPTH', 'ANIMA', 'LEGEND'],
  state: () => !FLESH.ok ? 'resting' : FLESH.drawn + ' bodies (' + FLESH.live + ' animated every frame, ' + FLESH.corpses + ' dead) · ' + FLESH.types.size + ' kinds built',
  level: () => FLESH.adapt, trim: () => { if (FLESH.adapt > -3) { FLESH.adapt--; return true; } return false; }, boost: () => { if (FLESH.adapt < 0) { FLESH.adapt++; return true; } return false; },
  check: () => FLESH.ok && FLESH.types.size > 60 ? 'it holds ' + FLESH.types.size + ' kinds' : '',
  repair: () => { if (FLESH.types.size > 60) fleshFree(); },
  selfTest: fleshSelfTest,
  docs: { what: 'The bodies of the 3D view: the dead and the survivors.', how: 'LEGEND\'s models, ANIMA\'s and LEGEND\'s skeletons, GPU skinning from a texture of bones.' }
});
