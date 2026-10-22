/* ================= VFXRAY v3 and v4: the lens, colour and atmosphere (1.9.995) =================
   VFXRAY finished pictures with a compositor's tricks; now it renders what MIMATIC's camera would really record, from
   the scene's depth:
   - v3, the lens: depth of field from the thin-lens blur circle of every pixel (the lens's focal length, aperture and
     focus distance, the sensor's size), gathered over a disc of 128 samples on a golden-angle spiral (a far pixel takes
     light only from what is behind it, a near one spills over the sharp ones); motion blur from the shutter, by
     reprojecting each pixel into the previous frame's camera (the streak is the motion during the exposure: a
     180-degree shutter keeps half of the frame's motion); natural vignetting by the cosine-fourth law of the lens.
   - v4, colour and atmosphere: the filmic tone curve (ACES, in the scene's own shader), colour looks as 32x32x32 lookup
     tables (teal and orange, bleach bypass, day for night, sodium noir, and the identity, which must change nothing),
     light shafts (volumetric light scattering by radial sampling toward the light, GPU Gems 3 chapter 13), and fog by
     the Beer-Lambert law with a density that thins with height (the optical depth integrated exactly along each ray). */
const VXL = { ok: false, P: {}, luts: {}, ms: 0, made: 0 };
const VXL_HEAD = 'precision highp float;\n';
const VXL_UNPACK = 'float unpackD(vec4 c) { return dot(c, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0)); }\n';
const VXL_LIN = 'uniform vec2 uNF; float linZ(float d) { float z = min(d, 0.999999) * 2.0 - 1.0; return 2.0 * uNF.x * uNF.y / (uNF.y + uNF.x - z * (uNF.y - uNF.x)); }\n';   // (the cleared background reads as the far plane)
// depth of field: signed blur diameter in pixels (negative in front of the focus plane)
const VXL_DOF = VXL_HEAD + VXL_UNPACK + VXL_LIN + 'varying vec2 v; uniform sampler2D uS, uD; uniform vec2 uRes; uniform vec4 uLens; uniform float uMax;\n' +
  'float coc(vec2 uv) { float d = linZ(unpackD(texture2D(uD, uv))); float c = uLens.y * uLens.x * (d - uLens.z) / (d * (uLens.z - uLens.x)); return clamp(c * uLens.w, -uMax, uMax); }\n' +
  // every source pixel spreads its light evenly over its own blur disc; a pixel gathers what reaches it (each of the 128
  // samples stands for its share of the gathering disc's area). Sources behind this pixel reach it only as far as this
  // pixel is itself blurred (a sharp thing in front hides what is behind it); sources in front spill over freely.
  'void main() { float c0 = coc(v); float r0 = abs(c0) * 0.5; float R = uMax * 0.5; float aS = 3.14159265 * R * R / 128.0; vec3 acc = vec3(0.0); float K = 0.0;\n' +
  ' for (int i = 0; i < 128; i++) { float fi = float(i); float r = sqrt((fi + 0.5) / 128.0) * R; float a = fi * 2.3999632; vec2 uv = v + vec2(cos(a), sin(a)) * r / uRes;\n' +
  '  float cs = coc(uv); float rs = max(abs(cs) * 0.5, 0.5); float reach = cs < c0 - 0.5 || r0 > 2.0 ? rs : min(rs, max(r0, 0.5) + 0.5);\n' +
  '  float k = clamp(reach - r + 0.5, 0.0, 1.0) * aS / (3.14159265 * rs * rs); acc += pow(texture2D(uS, uv).rgb, vec3(2.2)) * k; K += k; }\n' +
  ' vec3 c = pow(texture2D(uS, v).rgb, vec3(2.2)); if (r0 < 1.0) { acc = acc * (1.0 - smoothstep(0.0, 1.0, 1.0 - r0)) ; K = K * (1.0 - smoothstep(0.0, 1.0, 1.0 - r0)); }\n' +
  ' vec3 o = K > 1.0 ? acc / K : acc + c * (1.0 - K); gl_FragColor = vec4(pow(o, vec3(1.0 / 2.2)), 1.0); }';   // (light adds in linear values, not in the display\'s)
// motion blur from the camera's own movement: where each pixel was in the last frame, the streak over the exposure
const VXL_MB = VXL_HEAD + VXL_UNPACK + 'varying vec2 v; uniform sampler2D uS, uD; uniform mat4 uInv, uPrev; uniform float uK;\n' +
  'void main() { float d = unpackD(texture2D(uD, v)); vec4 p = uInv * vec4(v * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); p /= p.w; vec4 q = uPrev * p; vec2 pv = q.xy / q.w * 0.5 + 0.5; vec2 vel = (v - pv) * uK;\n' +
  ' vec3 acc = vec3(0.0); for (int i = 0; i < 24; i++) { float t = (float(i) + 0.5) / 24.0 - 0.5; acc += pow(texture2D(uS, v + vel * t).rgb, vec3(2.2)); } gl_FragColor = vec4(pow(acc / 24.0, vec3(1.0 / 2.2)), 1.0); }';
// fog: Beer-Lambert, density rho0 * exp(-(z - zb) / H), optical depth integrated along the ray; and the cos^4 vignette
const VXL_FOG = VXL_HEAD + VXL_UNPACK + 'varying vec2 v; uniform sampler2D uS, uD; uniform mat4 uInv; uniform vec3 uEye, uFogC; uniform vec4 uFog; uniform float uVig, uFpx; uniform vec2 uRes;\n' +
  'void main() { vec3 c = pow(texture2D(uS, v).rgb, vec3(2.2)); float d = unpackD(texture2D(uD, v)); vec4 p = uInv * vec4(v * 2.0 - 1.0, min(d, 0.99999) * 2.0 - 1.0, 1.0); p /= p.w;\n' +
  ' if (uFog.x > 0.0) { float L = length(p.xyz - uEye); float z0 = uEye.z - uFog.z, z1 = p.z - uFog.z; float x = (z1 - z0) / uFog.y;\n' +
  // (the optical depth rho0 L exp(-z0/H) (1 - exp(-x)) / x, x = dz / H, with the small-x series so it stays exact in floats)
  '  float g = abs(x) < 1e-3 ? 1.0 - x * 0.5 + x * x / 6.0 : (1.0 - exp(-x)) / x; float tau = uFog.x * L * exp(-z0 / uFog.y) * g; float T = exp(-tau); c = c * T + uFogC * (1.0 - T); }\n' +
  ' if (uVig > 0.0) { vec2 q = (v - 0.5) * uRes; float t2 = dot(q, q) / (uFpx * uFpx); float k = 1.0 / ((1.0 + t2) * (1.0 + t2)); c *= mix(1.0, k, uVig); }\n' +
  ' gl_FragColor = vec4(pow(c, vec3(1.0 / 2.2)), 1.0); }';
// light shafts: the light's own pixels (the bright sky round the light, not blocked by anything) smeared toward it
const VXL_OCC = VXL_HEAD + VXL_UNPACK + 'varying vec2 v; uniform sampler2D uS, uD; uniform vec2 uL, uRes; uniform float uR; uniform vec3 uLC;\n' +
  'void main() { float d = unpackD(texture2D(uD, v)); float sky = step(0.9999, d); vec2 q = (v - uL) * uRes; float disc = exp(-dot(q, q) / (uR * uR)); gl_FragColor = vec4(uLC * sky * disc + texture2D(uS, v).rgb * sky * 0.15, 1.0); }';
const VXL_RAYS = VXL_HEAD + 'varying vec2 v; uniform sampler2D uS, uO; uniform vec2 uL; uniform vec4 uP;\n' +   // uP: decay, weight, density, exposure
  'void main() { vec2 tc = v; vec2 dt = (tc - uL) * (1.0 / 100.0) * uP.z; float il = 1.0; vec3 c = vec3(0.0); for (int i = 0; i < 100; i++) { tc -= dt; c += texture2D(uO, tc).rgb * il * uP.y; il *= uP.x; }\n' +
  ' gl_FragColor = vec4(texture2D(uS, v).rgb + c * uP.w, 1.0); }';
// a colour look: a 32x32x32 table laid out as 32 slices side by side (1024 x 32), blue picks the slice
const VXL_LUT = VXL_HEAD + 'varying vec2 v; uniform sampler2D uS, uT; uniform float uK;\n' +
  'vec3 lut(vec3 c) { float b = clamp(c.b, 0.0, 1.0) * 31.0; float s0 = floor(b), s1 = min(s0 + 1.0, 31.0); vec2 xy = (clamp(c.rg, 0.0, 1.0) * 31.0 + 0.5) / vec2(1024.0, 32.0);\n' +
  ' vec3 a = texture2D(uT, vec2(xy.x + s0 / 32.0, xy.y)).rgb, bb = texture2D(uT, vec2(xy.x + s1 / 32.0, xy.y)).rgb; return mix(a, bb, b - s0); }\n' +
  'void main() { vec3 c = texture2D(uS, v).rgb; gl_FragColor = vec4(mix(c, lut(c), uK), 1.0); }';
// the tone curve, drawn as a ramp so the GPU's version can be checked against the formula
const VXL_RAMP = VXL_HEAD + 'varying vec2 v; uniform float uMaxX; vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); } void main() { float x = v.x * uMaxX; gl_FragColor = vec4(pow(aces(vec3(x)), vec3(1.0 / 2.2)), 1.0); }';
function vxlInit() {
  const gl = LGR.gl; if (!gl) return false; if (VXL.ok && VXL.gl === gl) return true;
  try { for (const [k, fs] of Object.entries({ dof: VXL_DOF, mb: VXL_MB, fog: VXL_FOG, occ: VXL_OCC, rays: VXL_RAYS, lut: VXL_LUT, ramp: VXL_RAMP })) VXL.P[k] = vfxProg(gl, VX_Q_VS, fs, ['aP']); VXL.ok = true; VXL.gl = gl; VXL.luts = {}; }
  catch (e) { VXL.ok = false; try { console.error(e); } catch (x) { } }
  return VXL.ok;
}
function vxlQuad(gl) { gl.bindBuffer(gl.ARRAY_BUFFER, LGR.quad); for (let i = 1; i < 8; i++) gl.disableVertexAttribArray(i); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
function vxlPass(P, dst, w, h, setU) { const gl = LGR.gl; gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fb : null); gl.viewport(0, 0, dst ? dst.w : w, dst ? dst.h : h); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.useProgram(P.p); setU(P.u); vxlQuad(gl); }
function vxlTex(i, t, u) { const gl = LGR.gl; gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(u, i); }
/* ---------- the scene's depth (from the camera, packed into colour as the shadow map is) ---------- */
function vxlDepth(S, w, h) {
  const gl = LGR.gl, f = lgFBO('vxdepth', w, h, true), D = LGR.P.depth; lgCamUpd(S.cam, w / h);
  // (packed depth must never be blended between texels: nearest sampling)
  if (!f.nearest) { gl.bindTexture(gl.TEXTURE_2D, f.tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); f.nearest = true; }
  gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb); gl.viewport(0, 0, w, h); gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.useProgram(D.p); gl.uniformMatrix4fv(D.u.uVP, false, S.cam.VP);
  for (const it of S.items) lgGLDrawModel(it.m, it.W, D, null, it.hide);
  return f;
}
/* ---------- lookup tables ---------- */
// a look as a function of a colour (display values 0..1) -> colour
const VXL_LOOKS = {
  identity: c => c,
  tealOrange: c => { const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], sh = 1 - lgSS(0.0, 0.55, l), hi = lgSS(0.45, 1.0, l), teal = [-0.06, 0.02, 0.07], org = [0.08, 0.02, -0.07]; return c.map((v, i) => v + teal[i] * sh * 0.9 + org[i] * hi * 0.9); },
  bleach: c => { const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], s = c.map(v => l + (v - l) * 0.45), k = 1.35; return s.map(v => clamp((v - 0.5) * k + 0.5 - 0.02, 0, 1)); },   // silver left in: half the colour, more contrast
  dayForNight: c => { const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], m = c.map(v => l + (v - l) * 0.35), lin = m.map(v => Math.pow(v, 2.2) * 0.25), tint = [0.75, 0.9, 1.35]; return lin.map((v, i) => Math.pow(clamp(v * tint[i], 0, 1), 1 / 2.2)); },   // two stops down, desaturated, blue
  sodium: c => { const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], g = clamp((l - 0.5) * 1.25 + 0.5, 0, 1); return [clamp(g * 1.05 + 0.03, 0, 1), clamp(g * 0.78, 0, 1), clamp(g * 0.42, 0, 1)]; }   // a streetlight's single colour, hard
};
function vxlLutData(look) { const f = VXL_LOOKS[look], d = new Uint8Array(1024 * 32 * 4); for (let b = 0; b < 32; b++) for (let g = 0; g < 32; g++) for (let r = 0; r < 32; r++) { const o = f([r / 31, g / 31, b / 31]), i = (g * 1024 + b * 32 + r) * 4; d[i] = Math.round(clamp(o[0], 0, 1) * 255); d[i + 1] = Math.round(clamp(o[1], 0, 1) * 255); d[i + 2] = Math.round(clamp(o[2], 0, 1) * 255); d[i + 3] = 255; } return d; }
function vxlLut(look) {
  const gl = LGR.gl; if (VXL.luts[look]) return VXL.luts[look];
  gl.activeTexture(gl.TEXTURE7);   // (made on a spare unit, so a pass's bound textures are left alone)
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 32, 0, gl.RGBA, gl.UNSIGNED_BYTE, vxlLutData(look));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  VXL.luts[look] = t; return t;
}
/* ---------- the lens chain ---------- */
// S: the scene (as for lgGLScene); o: { lens: mimcBody, dof, mb (with prevVP), fog: { rho, H, zb, col }, vig, rays: { p (world), col, r, decay, weight, density, exposure }, look, lookK, out: fbo or null }
function vxlRender(S, w, h, o) {
  if (!vxlInit()) return false; const gl = LGR.gl, t0 = performance.now(); o = o || {};
  const scene = lgFBO('vxl_s', w, h, true); lgGLScene(S, w, h, scene);
  // what is drawn into the scene itself, depth-tested against it (the rain, the splashes, the sprites of the effects)
  if (o.extra) { gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fb); gl.viewport(0, 0, w, h); o.extra(S); }
  const dep = vxlDepth(S, w, h), cam = S.cam;
  let cur = scene; const ping = n => lgFBO('vxl_' + n, w, h, false), inv = lgInv(lgM4(), cam.VP), lens = o.lens || mimcBody({ f: mimcFocal(cam.fov, 's35', w / h) }), g = mimcGate(lens.sensor, w / h);
  const step = (name, P, setU) => { const dst = ping(name); vxlPass(P, dst, w, h, U => { vxlTex(0, cur.tex, U.uS); setU(U); }); cur = dst; };
  if (o.dof) step('a', VXL.P.dof, U => { vxlTex(1, dep.tex, U.uD); gl.uniform2f(U.uRes, w, h); gl.uniform2f(U.uNF, cam.near, cam.far); gl.uniform4f(U.uLens, lens.f / 1000, lens.f / 1000 / lens.N, lens.focus, h / (g.h / 1000)); gl.uniform1f(U.uMax, o.dofMax || 24); });
  if (o.mb && o.prevVP) step('b', VXL.P.mb, U => { vxlTex(1, dep.tex, U.uD); gl.uniformMatrix4fv(U.uInv, false, inv); gl.uniformMatrix4fv(U.uPrev, false, o.prevVP); gl.uniform1f(U.uK, (lens.shutter || 180) / 360); });
  if (o.rays) { const R = o.rays, q = mimcProject(cam, R.p, w / h), L = [q.x * 0.5 + 0.5, q.y * 0.5 + 0.5], occ = lgFBO('vxl_o', w >> 1, h >> 1, false);
    vxlPass(VXL.P.occ, occ, w, h, U => { vxlTex(0, cur.tex, U.uS); vxlTex(1, dep.tex, U.uD); gl.uniform2f(U.uL, L[0], L[1]); gl.uniform2f(U.uRes, w >> 1, h >> 1); gl.uniform1f(U.uR, R.r || 18); gl.uniform3fv(U.uLC, R.col || [1, 0.9, 0.7]); });
    step('c', VXL.P.rays, U => { vxlTex(1, occ.tex, U.uO); gl.uniform2f(U.uL, L[0], L[1]); gl.uniform4f(U.uP, R.decay || 0.96815, R.weight || 0.58767, R.density || 0.926, R.exposure || 0.3); }); }
  if (o.fog || o.vig) step('d', VXL.P.fog, U => { vxlTex(1, dep.tex, U.uD); gl.uniformMatrix4fv(U.uInv, false, inv); gl.uniform3fv(U.uEye, cam.eye); const F = o.fog || { rho: 0 }; gl.uniform4f(U.uFog, F.rho || 0, F.H || 1e6, F.zb || 0, 0); gl.uniform3fv(U.uFogC, F.col || [0, 0, 0]); gl.uniform1f(U.uVig, o.vig || 0); gl.uniform1f(U.uFpx, h / 2 / Math.tan(cam.fov / 2)); gl.uniform2f(U.uRes, w, h); });
  if (o.look && o.look !== 'none') step('e', VXL.P.lut, U => { vxlTex(1, vxlLut(o.look), U.uT); gl.uniform1f(U.uK, o.lookK == null ? 1 : o.lookK); });
  // to the screen (or the caller's target)
  vxlPass(VX.P.copy, o.out || null, w, h, U => vxlTex(0, cur.tex, U.uS));
  gl.activeTexture(gl.TEXTURE0); VXL.ms = performance.now() - t0; VXL.made++;
  return { scene: scene, depth: dep, last: cur };
}
// read pixels back from a framebuffer (for the exams): RGBA bytes
function vxlRead(fbo, w, h) { const gl = LGR.gl, px = new Uint8Array(w * h * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo ? fbo.fb : null); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.bindFramebuffer(gl.FRAMEBUFFER, null); return px; }
/* ---------- test pieces for the exams (a glowing bead, a wall, an occluder) ---------- */
LG_MAKERS.vxl_bead = (B) => { lgBone(B, 'root'); lgMat(B, lgMtl({ c: [1, 1, 1], t: -1, r: 1, m: 0, e: 0.5 })); lgSphere(B, 0, 0, 0, 0.008, 0.008, 0.008, { segs: 14, rings: 10 }); };
LG_MAKERS.vxl_hot = (B) => { lgBone(B, 'root'); lgMat(B, lgMtl({ c: [1, 1, 1], t: -1, r: 1, m: 0, e: 6 })); lgSphere(B, 0, 0, 0, 0.02, 0.02, 0.02, { segs: 14, rings: 10 }); };
LG_MAKERS.vxl_wall = (B) => { lgBone(B, 'root'); lgMat(B, lgMtl({ c: [1, 1, 1], t: -1, r: 1, m: 0, e: 0.8 })); lgBox(B, 0, 0, 0, 0.02, 30, 30, 0); };
LG_MAKERS.vxl_bar = (B) => { lgBone(B, 'root'); lgMat(B, lgMtl({ c: [0.02, 0.02, 0.02], t: -1, r: 1, m: 0, e: 0 })); lgBox(B, 0, 0, 0, 0.05, 0.08, 3, 0); };
function vxlPlace(name, p) { const W = lgWorldNew(), M = lgTR(p[0], p[1], p[2]); for (let i = 0; i < LG_NB; i++) W.set(M, i * 16); return { m: lgModel(name, 0, ''), W: W }; }
function vxlStage(items, cam) { return { cam: cam, items: items, key: { dir: [0.3, 0.2, 1], col: [0, 0, 0] }, rim: { dir: [0, 0, 1], col: [0, 0, 0] }, sky: [0, 0, 0], gnd: [0, 0, 0], pts: [], fog: { col: [0, 0, 0], d: 0, h: 0, s: 1 }, wet: 0, time: 0, expo: 1, clear: [0, 0, 0] }; }
// the size of a glowing spot round a point on the picture, from how its light spreads: a uniform disc of diameter D has an
// rms radius of D / (2 sqrt 2), and spreads add in quadrature (the spot's own size is taken back out)
function vxlSpot(px, w, h, cx, cy, R) {
  const L = (x, y) => { const i = (y * w + x) * 4; return Math.pow(px[i] / 255, 2.2) + Math.pow(px[i + 1] / 255, 2.2) + Math.pow(px[i + 2] / 255, 2.2); };
  const x0 = Math.max(0, cx - R), x1 = Math.min(w - 1, cx + R), y0 = Math.max(0, cy - R), y1 = Math.min(h - 1, cy + R); let s = 0, sx = 0, sy = 0, peak = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const l = L(x, y); if (l < 0.002) continue; s += l; sx += l * x; sy += l * y; peak = Math.max(peak, l); }
  const mx = sx / (s || 1), my = sy / (s || 1); let r2 = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const l = L(x, y); if (l < 0.002) continue; r2 += l * ((x - mx) * (x - mx) + (y - my) * (y - my)); }
  const rms = Math.sqrt(r2 / (s || 1)); return { d: 2 * Math.SQRT2 * rms, rms: rms, sum: s, peak: peak, c: [mx, my] };
}
