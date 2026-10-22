/* ================= VFXRAY: the last pass of a cinematic (1.9.992) =================
   MIMATIC directs and LEGEND draws the characters and the set; VFXRAY finishes the picture like a VFX compositor:
   - Rain: thousands of streaks in 3D around the camera, falling in scene time, so a speed ramp slows them into
     drops and a freeze frame hangs them in the air. A streak is brightest when it is backlit (looking toward a lamp
     through the rain, the way cinematographers light rain) and near the point lights; lightning lights them all.
   - Splashes: rings and little crowns where drops hit the wet ground, and bursts when a body or a boot lands.
   - Sprites: muzzle flashes (a star of light and a point light that lights the walls for a frame), smoke, brass,
     sparks, a dark mist for a head shot, steam from vents, and lightning bolts (branching, drawn as glowing
     segments) with a flash pattern of a few uneven flickers.
   - The post chain: bloom (a bright pass blurred through smaller and smaller copies), an anamorphic streak (bright
     points stretched sideways in a cool blue, the lens look), chromatic fringing toward the edges, film grain,
     a vignette, letterbox bars that slide in for the widescreen moments, a white flash for lightning, motion blur
     (the last frame blended in during whip pans), a fade to black, and a grade (lift, gain, saturation).
   It respects the player: with reduced motion there is no shake or whip pan; with reduced flashing the lightning is
   a soft single glow and never flickers. Any flash pattern stays at three flashes a second or fewer.
   On the processor (no WebGL) it does the same with a 2D canvas: rain lines, splashes, flashes, vignette, grain and
   bars. It steps down when frames run long: fewer drops, no reflections, fewer bloom steps, no streak. */
const VX = { ver: 1, adapt: 0, lvl: 3, ok: false, P: {}, rainN: 0, rainBuf: null, rainIdx: null, splN: 0, splBuf: null, splIdx: null, sp: [], spBuf: null, spCap: 0, spData: null,
  bolts: [], flashT: -9, flash: 0, flashPat: null, ms: 0, msAvg: 0, msF: 0, frames: 0, prev: null, grainT: 0, errT: [], offUntil: 0 };
// quality: drops, splashes, bloom steps, streak, motion blur, aberration, reflections
const VXQ = [
  { rain: 900, spl: 60, bloom: 1, streak: 0, mb: 0, ca: 0, refl: 0, shadow: 0 },
  { rain: 2200, spl: 120, bloom: 2, streak: 0, mb: 0, ca: 1, refl: 0.4, shadow: 1 },
  { rain: 4200, spl: 220, bloom: 3, streak: 1, mb: 1, ca: 1, refl: 0.5, shadow: 1 },
  { rain: 6500, spl: 320, bloom: 3, streak: 1, mb: 1, ca: 1, refl: 0.6, shadow: 1 }
];
function vfxLevel() { return VX.lvl = clamp(([1, 2, 3, 3][clamp(PERF.tier | 0, 0, 3)]) + VX.adapt + (TUNE.VFXRAY || 0), 0, 3); }
function vfxQ() { return VXQ[vfxLevel()]; }

/* ---------- shaders ---------- */
const VX_HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
const VX_RAIN_VS = 'attribute vec4 aS; attribute vec2 aC;\n' +
  'uniform mat4 uVP; uniform vec3 uCam, uCen, uBox, uKD, uKC, uFlC; uniform float uT, uFall, uLen, uW, uDim; uniform vec2 uWind; uniform vec4 uPL[4]; uniform vec3 uPC[4];\n' +
  'varying vec2 vC; varying vec3 vCol;\n' +
  'void main() {\n' +
  ' vec3 vel = vec3(uWind, -uFall) * (0.85 + aS.w * 0.3);\n' +
  ' vec3 p = aS.xyz * uBox + vel * uT; p = mod(p - uCen + uBox * 0.5, uBox) + uCen - uBox * 0.5;\n' +
  ' vec3 dir = normalize(vel); float len = uLen * (0.7 + aS.w * 0.6) + 0.004;\n' +
  ' vec3 pos = p - dir * len * aC.y; vec3 toCam = normalize(uCam - pos); vec3 side = normalize(cross(dir, toCam)) * uW * (0.7 + aS.w * 0.6); pos += side * aC.x;\n' +
  // light on a drop: backlight (the light behind it, toward the camera), the point lights, lightning
  ' vec3 L = vec3(0.0); for (int i = 0; i < 4; i++) { vec3 d = uPL[i].xyz - pos; float r = length(d); float att = clamp(1.0 - r / max(uPL[i].w * 1.6, 0.01), 0.0, 1.0); float back = 0.35 + 1.6 * pow(max(dot(normalize(d), -toCam), 0.0), 6.0); L += uPC[i] * att * att * back; }\n' +
  ' float kb = 0.25 + 1.2 * pow(max(dot(normalize(uKD), -toCam), 0.0), 8.0); L += uKC * 0.06 * kb + uFlC * 0.5;\n' +
  ' float near = clamp(length(uCam - pos) / 1.2, 0.0, 1.0); vCol = L * uDim * near; vC = aC; gl_Position = uVP * vec4(pos, 1.0); }';
const VX_RAIN_FS = VX_HEAD + 'varying vec2 vC; varying vec3 vCol; void main() { float a = (1.0 - vC.x * vC.x) * (0.35 + 0.65 * (1.0 - vC.y)) * smoothstep(0.0, 0.15, vC.y + 0.02); gl_FragColor = vec4(vCol * a, a); }';
const VX_SPL_VS = 'attribute vec4 aS; attribute vec3 aC;\n' +
  'uniform mat4 uVP; uniform vec3 uCam, uCen, uFlC; uniform vec2 uArea; uniform float uT, uZ, uDim; uniform vec4 uPL[4]; uniform vec3 uPC[4];\n' +
  'varying vec2 vU; varying float vA; varying vec3 vCol; varying float vK;\n' +
  'float h1(float n) { return fract(sin(n) * 43758.5453); }\n' +
  'void main() {\n' +
  ' float rate = 1.6 + aS.w * 1.2; float cyc = uT * rate + aS.z * 7.0; float ph = fract(cyc); float id = floor(cyc) + aS.z * 113.0;\n' +
  ' vec2 xy = uCen.xy + (vec2(h1(id * 1.7 + aS.x * 31.0), h1(id * 2.3 + aS.y * 17.0)) - 0.5) * uArea; vec3 c = vec3(xy, uZ + 0.004);\n' +
  ' vec3 pos; vK = aC.z;\n' +
  ' if (aC.z < 0.5) { float r = 0.012 + ph * 0.07; pos = c + vec3(aC.x * r, aC.y * r, 0.0); vA = (1.0 - ph) * (1.0 - ph); }\n' +
  ' else { float hgt = sin(min(ph * 2.2, 1.0) * 3.14159) * 0.05; vec3 toCam = normalize(uCam - c); vec3 sd = normalize(cross(vec3(0.0, 0.0, 1.0), toCam)); pos = c + sd * aC.x * 0.006 + vec3(0.0, 0.0, hgt + aC.y * 0.008); vA = ph < 0.45 ? 1.0 - ph / 0.45 : 0.0; }\n' +
  ' vec3 L = vec3(0.04) + uFlC * 0.4; for (int i = 0; i < 4; i++) { float r2 = length(uPL[i].xyz - c); float att = clamp(1.0 - r2 / max(uPL[i].w * 1.4, 0.01), 0.0, 1.0); L += uPC[i] * att * att; }\n' +
  ' vCol = L * uDim; vU = aC.xy; gl_Position = uVP * vec4(pos, 1.0); }';
const VX_SPL_FS = VX_HEAD + 'varying vec2 vU; varying float vA; varying vec3 vCol; varying float vK; void main() { float a; if (vK < 0.5) { float r = length(vU); a = smoothstep(0.55, 0.85, r) * smoothstep(1.0, 0.86, r); } else { a = 1.0 - dot(vU, vU) * 0.8; } a *= vA; gl_FragColor = vec4(vCol * a, a * 0.5); }';
// one program for every sprite: billboards (dots, stars, rings, smoke) and segments (bolts, sparks, brass trails)
const VX_SP_VS = 'attribute vec3 aA; attribute vec3 aB; attribute vec4 aD; attribute vec4 aCol;\n' +
  'uniform mat4 uVP; uniform vec3 uCam, uR, uU;\n' +
  'varying vec2 vU; varying vec4 vCol; varying float vK; varying float vR;\n' +
  'void main() { vec2 c = aD.xy; float w = aD.z; vK = floor(aD.w); vR = fract(aD.w) * 6.2832; vec3 pos;\n' +
  ' if (vK < 5.5) { float cr = cos(vR), sr = sin(vR); vec2 q = vec2(c.x * cr - (c.y * 2.0 - 1.0) * sr, c.x * sr + (c.y * 2.0 - 1.0) * cr); pos = aA + (uR * q.x + uU * q.y) * w; vU = vec2(c.x, c.y * 2.0 - 1.0); }\n' +
  ' else { vec3 d = aB - aA; vec3 p = mix(aA, aB, c.y); vec3 sd = normalize(cross(d, uCam - p)); pos = p + sd * w * c.x; vU = vec2(c.x, c.y); }\n' +
  ' vCol = aCol; gl_Position = uVP * vec4(pos, 1.0); }';
const VX_SP_FS = VX_HEAD + 'varying vec2 vU; varying vec4 vCol; varying float vK; varying float vR;\n' +
  'float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\n' +
  'void main() { float r = length(vU), a;\n' +
  ' if (vK < 0.5) a = exp(-r * r * 4.0);\n' +                                                   // soft dot
  ' else if (vK < 1.5) { float ang = atan(vU.y, vU.x); a = exp(-r * r * 6.0) + pow(max(0.0, cos(ang * 3.0)), 18.0) * exp(-r * 2.2) * 0.9; }\n' +   // muzzle star
  ' else if (vK < 2.5) a = smoothstep(0.6, 0.85, r) * smoothstep(1.0, 0.88, r);\n' +             // ring
  ' else if (vK < 3.5) { float n = hash(floor(vU * 4.0 + vR)); a = exp(-r * r * 2.2) * (0.7 + 0.3 * n); }\n' +   // smoke
  ' else if (vK < 4.5) a = exp(-r * r * 1.4) * 0.8;\n' +                                        // big glow
  ' else a = exp(-r * r * 3.0);\n' +
  ' if (vK > 5.5) a = (1.0 - vU.x * vU.x) * (1.0 - vU.x * vU.x);\n' +                           // segment
  ' gl_FragColor = vec4(vCol.rgb * a * vCol.a, a * vCol.a); }';
const VX_Q_VS = 'attribute vec2 aP; varying vec2 v; void main() { v = aP * 0.5 + 0.5; gl_Position = vec4(aP, 0.0, 1.0); }';
const VX_BRIGHT = VX_HEAD + 'varying vec2 v; uniform sampler2D uS; uniform float uTh; uniform vec2 uPx; void main() { vec3 c = (texture2D(uS, v + uPx).rgb + texture2D(uS, v - uPx).rgb + texture2D(uS, v + vec2(uPx.x, -uPx.y)).rgb + texture2D(uS, v - vec2(uPx.x, -uPx.y)).rgb) * 0.25; float l = max(c.r, max(c.g, c.b)); float k = clamp((l - uTh) / (1.0 - uTh), 0.0, 1.0); gl_FragColor = vec4(c * k * k, 1.0); }';
const VX_BLUR = VX_HEAD + 'varying vec2 v; uniform sampler2D uS; uniform vec2 uD; void main() { vec3 c = texture2D(uS, v).rgb * 0.227; c += (texture2D(uS, v + uD * 1.385).rgb + texture2D(uS, v - uD * 1.385).rgb) * 0.316; c += (texture2D(uS, v + uD * 3.231).rgb + texture2D(uS, v - uD * 3.231).rgb) * 0.07; gl_FragColor = vec4(c, 1.0); }';
const VX_POST = VX_HEAD + 'varying vec2 v; uniform sampler2D uS, uB1, uB2, uB3, uSt, uPv; uniform vec2 uRes; uniform float uTime, uGrain, uVig, uCA, uBars, uFade, uFlash, uMB, uBK, uSK, uSat, uExpo, uPvOn, uHal, uTone; uniform vec3 uLift, uGain, uFlashC, uBW, uShd, uHil;\n' +
  'float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\n' +
  'void main() { vec2 uv = v; vec2 d = uv - 0.5; float r2 = dot(d, d);\n' +
  ' vec3 c; if (uCA > 0.0) { vec2 o = d * r2 * uCA * 0.02; c = vec3(texture2D(uS, uv + o).r, texture2D(uS, uv).g, texture2D(uS, uv - o).b); } else c = texture2D(uS, uv).rgb;\n' +
  ' if (uPvOn > 0.5) c = mix(c, texture2D(uPv, uv).rgb, uMB);\n' +
  ' vec3 bl = texture2D(uB1, uv).rgb * uBW.x + texture2D(uB2, uv).rgb * uBW.y + texture2D(uB3, uv).rgb * uBW.z; c += bl * uBK;\n' +
  ' c += texture2D(uSt, uv).rgb * vec3(0.55, 0.75, 1.25) * uSK;\n' +
  ' vec3 hb = texture2D(uB2, uv).rgb + texture2D(uB3, uv).rgb; c += hb * vec3(1.0, 0.32, 0.12) * uHal;\n' +
  ' c *= uExpo; c = mix(c, c * (1.0 + c / 6.0) / (1.0 + c), uTone);\n' +
  ' float g = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(g), c, uSat); c += uShd * (1.0 - smoothstep(0.0, 0.45, g)) + uHil * smoothstep(0.35, 1.0, g); c = uLift + c * uGain;\n' +
  ' c *= 1.0 - uVig * smoothstep(0.12, 0.62, r2 * 1.6);\n' +
  ' c += (hash(uv * uRes + fract(uTime * 13.7) * 91.0) - 0.5) * uGrain;\n' +
  ' c = mix(c, uFlashC, uFlash); c *= 1.0 - uFade;\n' +
  ' float bar = step(abs(uv.y - 0.5), 0.5 - uBars); c *= bar;\n' +
  ' gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }';
const VX_COPY = VX_HEAD + 'varying vec2 v; uniform sampler2D uS; void main() { gl_FragColor = vec4(texture2D(uS, v).rgb, 1.0); }';
function vfxProg(gl, vs, fs, attrs) {
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error('vfx shader: ' + gl.getShaderInfoLog(o)); return o; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); attrs.forEach((n, i) => gl.bindAttribLocation(p, i, n));
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error('vfx link: ' + gl.getProgramInfoLog(p));
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, a.name); }
  return { p: p, u: u, n: attrs.length };
}
function vfxGLInit() {
  const gl = LGR.gl; if (!gl || !LGR.ok) return false; if (VX.ok && VX.gl === gl) return true;
  try {
    VX.P.rain = vfxProg(gl, VX_RAIN_VS, VX_RAIN_FS, ['aS', 'aC']);
    VX.P.spl = vfxProg(gl, VX_SPL_VS, VX_SPL_FS, ['aS', 'aC']);
    VX.P.sp = vfxProg(gl, VX_SP_VS, VX_SP_FS, ['aA', 'aB', 'aD', 'aCol']);
    VX.P.bright = vfxProg(gl, VX_Q_VS, VX_BRIGHT, ['aP']); VX.P.blur = vfxProg(gl, VX_Q_VS, VX_BLUR, ['aP']); VX.P.post = vfxProg(gl, VX_Q_VS, VX_POST, ['aP']); VX.P.copy = vfxProg(gl, VX_Q_VS, VX_COPY, ['aP']);
    VX.rainBuf = gl.createBuffer(); VX.rainIdx = gl.createBuffer(); VX.splBuf = gl.createBuffer(); VX.splIdx = gl.createBuffer(); VX.spBuf = gl.createBuffer(); VX.spIdx = gl.createBuffer();
    VX.rainN = 0; VX.splN = 0; VX.spCap = 0; VX.ok = true; VX.gl = gl;
  } catch (e) { VX.ok = false; coreHurt('VFXRAY', e); try { console.error(e); } catch (x) { } }
  return VX.ok;
}
// static buffers of drops and splashes, rebuilt when the quality changes the count
function vfxRainBuild(n) {
  const gl = LGR.gl, R = lgRng(77), V = new Float32Array(n * 4 * 6), I = new Uint16Array(n * 6);
  for (let i = 0; i < n; i++) { const s = [R(), R(), R(), R()]; for (let k = 0; k < 4; k++) { const o = (i * 4 + k) * 6; V.set(s, o); V[o + 4] = k & 1 ? 1 : -1; V[o + 5] = k >> 1; } const b = i * 4; I.set([b, b + 1, b + 3, b, b + 3, b + 2], i * 6); }
  gl.bindBuffer(gl.ARRAY_BUFFER, VX.rainBuf); gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, VX.rainIdx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, I, gl.STATIC_DRAW); VX.rainN = n;
}
function vfxSplBuild(n) {
  const gl = LGR.gl, R = lgRng(91), V = new Float32Array(n * 8 * 7), I = new Uint16Array(n * 12);
  for (let i = 0; i < n; i++) { const s = [R(), R(), R(), R()]; for (let q = 0; q < 2; q++) for (let k = 0; k < 4; k++) { const o = (i * 8 + q * 4 + k) * 7; V.set(s, o); V[o + 4] = k & 1 ? 1 : -1; V[o + 5] = k >> 1 ? 1 : -1; V[o + 6] = q; } for (let q = 0; q < 2; q++) { const b = i * 8 + q * 4; I.set([b, b + 1, b + 3, b, b + 3, b + 2], i * 12 + q * 6); } }
  gl.bindBuffer(gl.ARRAY_BUFFER, VX.splBuf); gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, VX.splIdx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, I, gl.STATIC_DRAW); VX.splN = n;
}
function vfxLightsU(gl, U, S) {
  const pl = new Float32Array(16), pc = new Float32Array(12); (S.pts || []).slice(0, 4).forEach((q, i) => { pl[i * 4] = q.p[0]; pl[i * 4 + 1] = q.p[1]; pl[i * 4 + 2] = q.p[2]; pl[i * 4 + 3] = q.r; pc[i * 3] = q.col[0]; pc[i * 3 + 1] = q.col[1]; pc[i * 3 + 2] = q.col[2]; });
  if (U.uPL) gl.uniform4fv(U.uPL, pl); if (U.uPC) gl.uniform3fv(U.uPC, pc);
  const fl = S.flash || { col: [0, 0, 0] }; if (U.uFlC) gl.uniform3fv(U.uFlC, fl.col);
}
// rain and splashes into the scene's framebuffer (after the scene, depth-tested, no depth writes, additive)
// R: { on, center, box: [x,y,z], fall, wind: [x,y], shutter, width, dim, splash: { center, area: [x,y], z } }
function vfxRain(S, R, st) {
  const gl = LGR.gl, q = vfxQ(); if (!R || !R.on || !VX.ok) return;
  // 1.9.993: VFXRAY learns its own cost here: when the effects run heavy it thins the rain a step (and the next time it
  // starts from that), when there is room it brings it back (VX.rainK, kept on the device)
  const n = Math.round(q.rain * (R.density == null ? 1 : R.density) * vfxRainK()); if (n !== VX.rainN && n > 0) vfxRainBuild(n);
  gl.enable(gl.DEPTH_TEST); gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  const P = VX.P.rain, U = P.u; gl.useProgram(P.p);
  gl.uniformMatrix4fv(U.uVP, false, S.cam.VP); gl.uniform3fv(U.uCam, S.cam.eye); gl.uniform3fv(U.uCen, R.center); gl.uniform3fv(U.uBox, R.box || [14, 14, 9]);
  gl.uniform1f(U.uT, st); gl.uniform1f(U.uFall, R.fall || 9); gl.uniform2fv(U.uWind, R.wind || [0.6, 0.2]); gl.uniform1f(U.uLen, (R.fall || 9) * (R.shutter == null ? 0.022 : R.shutter) * (R.speed == null ? 1 : R.speed)); gl.uniform1f(U.uW, R.width || 0.0035); gl.uniform1f(U.uDim, R.dim || 1);
  gl.uniform3fv(U.uKD, lgV3n(S.key.dir)); gl.uniform3fv(U.uKC, S.key.col); vfxLightsU(gl, U, S);
  gl.bindBuffer(gl.ARRAY_BUFFER, VX.rainBuf); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, VX.rainIdx);
  for (let i = 2; i < 8; i++) gl.disableVertexAttribArray(i);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 24, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 24, 16);
  gl.drawElements(gl.TRIANGLES, VX.rainN * 6, gl.UNSIGNED_SHORT, 0);
  if (R.splash) {
    const m = Math.round(q.spl * (R.density == null ? 1 : R.density)); if (m !== VX.splN && m > 0) vfxSplBuild(m);
    const Q = VX.P.spl, V2 = Q.u; gl.useProgram(Q.p); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniformMatrix4fv(V2.uVP, false, S.cam.VP); gl.uniform3fv(V2.uCam, S.cam.eye); gl.uniform3fv(V2.uCen, R.splash.center); gl.uniform2fv(V2.uArea, R.splash.area); gl.uniform1f(V2.uT, st); gl.uniform1f(V2.uZ, R.splash.z || 0); gl.uniform1f(V2.uDim, R.dim || 1); vfxLightsU(gl, V2, S);
    gl.bindBuffer(gl.ARRAY_BUFFER, VX.splBuf); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, VX.splIdx);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 28, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 16);
    gl.drawElements(gl.TRIANGLES, VX.splN * 12, gl.UNSIGNED_SHORT, 0);
  }
  gl.depthMask(true); gl.disable(gl.BLEND);
}

/* ---------- sprites: emitted in scene time, simulated, drawn as one batch ---------- */
// kind: 0 dot, 1 muzzle star, 2 ring, 3 smoke, 4 glow, 6 segment; add: additive or blended
function vfxEmit(o) { if (VX.sp.length > 900) VX.sp.splice(0, 100); const p = Object.assign({ t: 0, life: 0.3, k: 0, w: 0.05, w1: null, col: [1, 1, 1], a: 1, a1: 0, v: [0, 0, 0], g: 0, drag: 0, rot: Math.random(), add: true, b: null, ground: null }, o); p.p = p.p.slice(); VX.sp.push(p); return p; }
function vfxTick(dt) {
  for (let i = VX.sp.length - 1; i >= 0; i--) {
    const p = VX.sp[i]; p.t += dt; if (p.t >= p.life) { VX.sp.splice(i, 1); continue; }
    if (p.drag) { const k = Math.exp(-p.drag * dt); p.v[0] *= k; p.v[1] *= k; p.v[2] *= k; }
    p.v[2] -= p.g * dt; p.p[0] += p.v[0] * dt; p.p[1] += p.v[1] * dt; p.p[2] += p.v[2] * dt;
    if (p.b) { p.b[0] += p.v[0] * dt; p.b[1] += p.v[1] * dt; p.b[2] += p.v[2] * dt; }
    if (p.ground != null && p.p[2] < p.ground) { p.p[2] = p.ground; p.v[2] *= -0.3; p.v[0] *= 0.5; p.v[1] *= 0.5; }
  }
}
function vfxSprites(S, add) {
  const gl = LGR.gl; if (!VX.ok) return 0;
  const list = VX.sp.filter(p => p.add === add); if (!list.length) return 0;
  const n = list.length, F = 14; if (!VX.spData || VX.spCap < n) { VX.spCap = Math.max(64, n * 2); VX.spData = new Float32Array(VX.spCap * 4 * F); const I = new Uint16Array(VX.spCap * 6); for (let i = 0; i < VX.spCap; i++) { const b = i * 4; I.set([b, b + 1, b + 3, b, b + 3, b + 2], i * 6); } gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, VX.spIdx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, I, gl.STATIC_DRAW); }
  const D = VX.spData;
  list.forEach((p, i) => {
    const k = p.t / p.life, w = p.w1 == null ? p.w : lgLerp(p.w, p.w1, k), a = Math.max(0, lgLerp(p.a, p.a1, k)), b = p.b || p.p;
    for (let c = 0; c < 4; c++) { const o = (i * 4 + c) * F; D[o] = p.p[0]; D[o + 1] = p.p[1]; D[o + 2] = p.p[2]; D[o + 3] = b[0]; D[o + 4] = b[1]; D[o + 5] = b[2]; D[o + 6] = c & 1 ? 1 : -1; D[o + 7] = c >> 1; D[o + 8] = w; D[o + 9] = p.k + (p.rot % 1) * 0.999; D[o + 10] = p.col[0]; D[o + 11] = p.col[1]; D[o + 12] = p.col[2]; D[o + 13] = a; }
  });
  const P = VX.P.sp, U = P.u; gl.useProgram(P.p);
  const V = S.cam.V; gl.uniformMatrix4fv(U.uVP, false, S.cam.VP); gl.uniform3fv(U.uCam, S.cam.eye); gl.uniform3f(U.uR, V[0], V[4], V[8]); gl.uniform3f(U.uU, V[1], V[5], V[9]);
  gl.bindBuffer(gl.ARRAY_BUFFER, VX.spBuf); gl.bufferData(gl.ARRAY_BUFFER, D.subarray(0, n * 4 * F), gl.DYNAMIC_DRAW); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, VX.spIdx);
  for (let i = 4; i < 8; i++) gl.disableVertexAttribArray(i);
  const s = F * 4; gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, s, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, s, 12); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, s, 24); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, s, 40);
  gl.enable(gl.DEPTH_TEST); gl.depthMask(false); gl.enable(gl.BLEND); if (add) gl.blendFunc(gl.ONE, gl.ONE); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.drawElements(gl.TRIANGLES, n * 6, gl.UNSIGNED_SHORT, 0);
  gl.depthMask(true); gl.disable(gl.BLEND);
  return n;
}
// effects the director calls for
function vfxMuzzle(p, dir, col) {
  const c = col || [1.6, 1.15, 0.6];
  vfxEmit({ p: [p[0] + dir[0] * 0.04, p[1] + dir[1] * 0.04, p[2] + dir[2] * 0.04], k: 1, w: 0.16, w1: 0.22, life: 0.06, col: c, a: 1.6, a1: 0 });
  vfxEmit({ p: p, k: 4, w: 0.28, w1: 0.36, life: 0.06, col: [c[0] * 0.4, c[1] * 0.3, c[2] * 0.2], a: 0.7, a1: 0 });
  for (let i = 0; i < 3; i++) vfxEmit({ p: [p[0] + dir[0] * 0.06, p[1] + dir[1] * 0.06, p[2] + dir[2] * 0.06], k: 3, w: 0.04, w1: 0.22 + Math.random() * 0.1, life: 1.2 + Math.random() * 0.6, col: [0.32, 0.32, 0.34], a: 0.4, a1: 0, v: [dir[0] * (0.8 + i * 0.4) + (Math.random() - 0.5) * 0.2, dir[1] * (0.8 + i * 0.4) + (Math.random() - 0.5) * 0.2, 0.15 + Math.random() * 0.15], drag: 2.5, add: false });
}
function vfxBrass(p, side) { const v = [side[0] * 1.4 + (Math.random() - 0.5) * 0.4, side[1] * 1.4 + (Math.random() - 0.5) * 0.4, 1.8 + Math.random() * 0.6]; vfxEmit({ p: p, b: [p[0] + 0.012, p[1], p[2]], k: 6, w: 0.004, life: 1.4, col: [0.9, 0.65, 0.28], a: 1, a1: 1, v: v, g: 9.8, ground: 0.01 }); }
function vfxMist(p, dir) { for (let i = 0; i < 9; i++) vfxEmit({ p: p, k: 3, w: 0.03, w1: 0.12 + Math.random() * 0.08, life: 0.4 + Math.random() * 0.4, col: [0.16, 0.02, 0.02], a: 0.85, a1: 0, v: [dir[0] * (1 + Math.random() * 2) + (Math.random() - 0.5), dir[1] * (1 + Math.random() * 2) + (Math.random() - 0.5), dir[2] * 1.5 + Math.random() * 0.8], g: 2.5, drag: 3, add: false }); }
function vfxSplash(p, k) {
  k = k || 1;
  vfxEmit({ p: [p[0], p[1], 0.02], k: 2, w: 0.05, w1: 0.55 * k, life: 0.6, col: [0.5, 0.55, 0.6], a: 0.7, a1: 0, add: true });
  for (let i = 0; i < Math.round(26 * k); i++) { const a = Math.random() * TAU, s = 0.8 + Math.random() * 1.6 * k; vfxEmit({ p: [p[0], p[1], 0.03], b: [p[0], p[1], 0.06], k: 6, w: 0.006, life: 0.55 + Math.random() * 0.3, col: [0.55, 0.6, 0.68], a: 0.9, a1: 0, v: [Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6, 1.2 + Math.random() * 2 * k], g: 9.8, add: true }); }
}
function vfxSteam(p, dt) { if (Math.random() < dt * 9) vfxEmit({ p: [p[0] + (Math.random() - 0.5) * 0.15, p[1] + (Math.random() - 0.5) * 0.15, p[2]], k: 3, w: 0.12, w1: 0.6, life: 2.4, col: [0.3, 0.32, 0.36], a: 0.18, a1: 0, v: [0.1, 0.05, 0.5 + Math.random() * 0.3], drag: 0.4, add: false }); }
// lightning: a branching bolt (segments that glow) and an uneven flash pattern (at most three flashes a second)
function vfxBolt(a, b, depth, out, R) {
  out = out || []; R = R || lgRng((Math.random() * 1e9) | 0);
  const segs = 10, pts = [a]; let p = a;
  for (let i = 1; i <= segs; i++) { const k = i / segs, q = [lgLerp(a[0], b[0], k) + (R() - 0.5) * 1.6 * (1 - k * 0.5), lgLerp(a[1], b[1], k) + (R() - 0.5) * 1.6 * (1 - k * 0.5), lgLerp(a[2], b[2], k)]; if (i === segs) { q[0] = b[0]; q[1] = b[1]; q[2] = b[2]; } pts.push(q); out.push([p, q, depth ? 0.03 : 0.07]); if (depth < 2 && R() < 0.3) { const e = [q[0] + (R() - 0.5) * 4, q[1] + (R() - 0.5) * 4, q[2] - 2 - R() * 3]; vfxBolt(q, e, depth + 1, out, R); } p = q; }
  return out;
}
function vfxLightning(at, from, to) {
  const rf = SET.flash;   // reduce flashing: one soft swell, no flicker
  VX.flashT = at; VX.flashPat = rf ? [[0, 0], [0.12, 0.3], [0.6, 0]] : [[0, 0], [0.03, 1], [0.09, 0.15], [0.16, 0.85], [0.22, 0.25], [0.42, 0.55], [1.2, 0]];
  VX.bolts = rf ? [] : vfxBolt(from, to, 0, []);
}
function vfxFlashAt(t) {
  const P = VX.flashPat; if (!P) return 0; const d = t - VX.flashT; if (d < 0 || d > P[P.length - 1][0]) return 0;
  for (let i = 1; i < P.length; i++) if (d <= P[i][0]) { const a = P[i - 1], b = P[i], k = (d - a[0]) / (b[0] - a[0]); return lgLerp(a[1], b[1], k); }
  return 0;
}
function vfxBoltSprites(f) { if (f < 0.05 || !VX.bolts.length) return; for (const s of VX.bolts) { vfxEmit({ p: s[0], b: s[1], k: 6, w: s[2] * 1.4, life: 0.02, col: [2.4 * f, 2.6 * f, 3.4 * f], a: 1, a1: 1 }); vfxEmit({ p: s[0], b: s[1], k: 6, w: s[2] * 6, life: 0.02, col: [0.5 * f, 0.6 * f, 1.1 * f], a: 1, a1: 1 }); } }

/* ---------- the post chain ---------- */
// src: the scene framebuffer; o: { bloom, streak, ca, grain, vig, bars, fade, flash, flashC, mb, sat, expo, lift, gain, th }
function vfxPost(src, w, h, o, tm) {
  const gl = LGR.gl, q = vfxQ(); if (!VX.ok) return false;
  const quad = () => { gl.bindBuffer(gl.ARRAY_BUFFER, LGR.quad); for (let i = 1; i < 8; i++) gl.disableVertexAttribArray(i); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
  const pass = (P, dst, setU) => { gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fb : null); gl.viewport(0, 0, dst ? dst.w : w, dst ? dst.h : h); gl.useProgram(P.p); setU(P.u); quad(); };
  const tex = (i, t, u) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(u, i); };
  gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
  const lv = Math.min(q.bloom, o.bloom == null ? 3 : o.bloom), white = lgGLWhite();
  const b = [], dims = [[2, 2], [4, 4], [8, 8]];
  if (lv > 0) {
    const f0 = lgFBO('vxb0', Math.max(8, w >> 1), Math.max(8, h >> 1), false);
    pass(VX.P.bright, f0, U => { tex(0, src.tex, U.uS); gl.uniform1f(U.uTh, o.th == null ? 0.62 : o.th); gl.uniform2f(U.uPx, 1 / w, 1 / h); });
    let cur = f0;
    for (let i = 0; i < 3; i++) {
      if (i >= lv) { b.push(null); continue; }
      const dw = Math.max(4, w / dims[i][0] | 0), dh = Math.max(4, h / dims[i][1] | 0), A = lgFBO('vxa' + i, dw, dh, false), Bf = lgFBO('vxc' + i, dw, dh, false);
      pass(VX.P.blur, A, U => { tex(0, cur.tex, U.uS); gl.uniform2f(U.uD, 1 / dw, 0); });
      pass(VX.P.blur, Bf, U => { tex(0, A.tex, U.uS); gl.uniform2f(U.uD, 0, 1 / dh); });
      b.push(Bf); cur = Bf;
    }
  }
  let st = null;
  if (q.streak && (o.streak || 0) > 0 && lv > 0) {
    const sw = Math.max(8, w >> 2), sh = Math.max(4, h >> 3), A = lgFBO('vxs0', sw, sh, false), Bf = lgFBO('vxs1', sw, sh, false);
    pass(VX.P.blur, A, U => { tex(0, LGR.fbo.vxb0.tex, U.uS); gl.uniform2f(U.uD, 3 / sw, 0); });
    pass(VX.P.blur, Bf, U => { tex(0, A.tex, U.uS); gl.uniform2f(U.uD, 7 / sw, 0); });
    pass(VX.P.blur, A, U => { tex(0, Bf.tex, U.uS); gl.uniform2f(U.uD, 15 / sw, 0); });
    st = A;
  }
  const mbOn = q.mb && (o.mb || 0) > 0.01 && VX.prev && VX.prev.w === w && VX.prev.h === h;
  // o.into: write the picture into that target instead of the screen (the exams read it back at its own size)
  const out = o.into || (q.mb ? lgFBO('vxout', w, h, false) : null);
  pass(VX.P.post, out, U => {
    tex(0, src.tex, U.uS); tex(1, b[0] ? b[0].tex : white, U.uB1); tex(2, b[1] ? b[1].tex : white, U.uB2); tex(3, b[2] ? b[2].tex : white, U.uB3); tex(4, st ? st.tex : white, U.uSt); tex(5, mbOn ? VX.prev.tex : white, U.uPv);
    gl.uniform2f(U.uRes, w, h); gl.uniform1f(U.uTime, tm || 0); gl.uniform1f(U.uGrain, o.grain == null ? 0.035 : o.grain); gl.uniform1f(U.uVig, o.vig == null ? 0.55 : o.vig);
    gl.uniform1f(U.uCA, q.ca ? (o.ca == null ? 1 : o.ca) : 0); gl.uniform1f(U.uBars, o.bars || 0); gl.uniform1f(U.uFade, o.fade || 0); gl.uniform1f(U.uFlash, o.flash || 0); gl.uniform3fv(U.uFlashC, o.flashC || [0.85, 0.9, 1]);
    gl.uniform1f(U.uMB, o.mb || 0); gl.uniform1f(U.uPvOn, mbOn ? 1 : 0);
    // the bloom steps that ran, weighted so fewer steps keep about the same glow (a step that did not run adds nothing)
    gl.uniform3fv(U.uBW, lv >= 3 ? [0.5, 0.8, 1.1] : lv === 2 ? [0.7, 1.5, 0] : lv === 1 ? [1.6, 0, 0] : [0, 0, 0]);
    gl.uniform1f(U.uBK, lv > 0 ? (o.bloomK == null ? 0.55 : o.bloomK) * (b[0] ? 1 : 0) : 0); gl.uniform1f(U.uSK, st ? (o.streak || 0) : 0);
    gl.uniform1f(U.uSat, o.sat == null ? 1 : o.sat); gl.uniform1f(U.uExpo, o.expo == null ? 1 : o.expo); gl.uniform3fv(U.uLift, o.lift || [0, 0, 0]); gl.uniform3fv(U.uGain, o.gain || [1, 1, 1]);
    // 1.9.993: film halation (a warm fringe round the bright things, from the widest bloom), a soft filmic shoulder, and
    // a split tone (cool shadows, warm highlights)
    if (U.uHal) gl.uniform1f(U.uHal, lv > 1 ? (o.hal || 0) : 0); if (U.uTone) gl.uniform1f(U.uTone, o.tone || 0); if (U.uShd) gl.uniform3fv(U.uShd, o.shd || [0, 0, 0]); if (U.uHil) gl.uniform3fv(U.uHil, o.hil || [0, 0, 0]);
  });
  if (out && !o.into) {
    // keep this frame for motion blur, and show it
    const pv = lgFBO('vxprev', w, h, false); pass(VX.P.copy, pv, U => tex(0, out.tex, U.uS)); VX.prev = pv;
    pass(VX.P.copy, null, U => tex(0, out.tex, U.uS));
  }
  gl.activeTexture(gl.TEXTURE0);
  return true;
}

/* ---------- the same on the processor ---------- */
const VX2 = { grain: null, drops: null };
function vfx2DRain(g, w, h, cam, R, st) {
  if (!R || !R.on) return; const q = vfxQ(), n = Math.round(q.rain * 0.12 * (R.density == null ? 1 : R.density));
  if (!VX2.drops || VX2.drops.length !== n) { const r = lgRng(5); VX2.drops = []; for (let i = 0; i < n; i++) VX2.drops.push([r(), r(), r()]); }
  const sp = R.speed == null ? 1 : R.speed, len = 0.04 * h * sp + 1.5;
  g.save(); g.strokeStyle = 'rgba(190,205,225,0.28)'; g.lineWidth = Math.max(1, h / 700); g.beginPath();
  for (const d of VX2.drops) { const x = ((d[0] + st * 0.03 * d[2]) % 1) * w, y = ((d[1] + st * (0.9 + d[2] * 0.5)) % 1) * h; g.moveTo(x, y); g.lineTo(x - len * 0.08, y - len); }
  g.stroke(); g.restore();
}
function vfx2DPost(g, w, h, o, tm) {
  g.save();
  if (o.vig) { const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.6); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,' + (0.75 * o.vig) + ')'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
  if (o.flash) { const c = o.flashC || [0.85, 0.9, 1]; g.fillStyle = 'rgba(' + (c[0] * 255 | 0) + ',' + (c[1] * 255 | 0) + ',' + (c[2] * 255 | 0) + ',' + Math.min(1, o.flash) + ')'; g.fillRect(0, 0, w, h); }
  if (o.grain) { if (!VX2.grain) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), d = x.createImageData(128, 128); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 26; } x.putImageData(d, 0, 0); VX2.grain = c; } g.globalAlpha = Math.min(1, o.grain * 12); const ox = (tm * 997 % 128) | 0, oy = (tm * 571 % 128) | 0; g.fillStyle = g.createPattern(VX2.grain, 'repeat'); g.translate(-ox, -oy); g.fillRect(ox, oy, w, h); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; }
  if (o.fade) { g.fillStyle = 'rgba(0,0,0,' + o.fade + ')'; g.fillRect(0, 0, w, h); }
  if (o.bars) { const b = o.bars * h; g.fillStyle = '#000'; g.fillRect(0, 0, w, b); g.fillRect(0, h - b, w, b); }
  g.restore();
}
function vfxReset() { VX.sp.length = 0; VX.bolts = []; VX.flashPat = null; VX.prev = null; }
function vfxHurt(e) {
  const now = performance.now(); coreHurt('VFXRAY', e); try { console.error(e); } catch (x) { }
  VX.errT.push(now); while (VX.errT.length && now - VX.errT[0] > 10000) VX.errT.shift();
  if (VX.errT.length >= 5) { VX.offUntil = now + 60000; VX.errT.length = 0; coreRepaired('VFXRAY', 'Effects: plain picture for a minute after errors'); }
}
function vfxRainK() {
  if (VX.rainK == null) { VX.rainK = clamp(+((typeof store !== 'undefined' && store.get('zc_vxRain', 1)) || 1), 0.4, 1); VX.rainKT = 0; }
  const now = performance.now(); if (now - (VX.rainKT || 0) > 2500 && VX.frames > 30) {
    VX.rainKT = now; const was = VX.rainK;
    if (VX.msAvg > 6.5 && VX.rainK > 0.4) VX.rainK = Math.max(0.4, VX.rainK - 0.1); else if (VX.msAvg < 3 && VX.rainK < 1) VX.rainK = Math.min(1, VX.rainK + 0.05);
    if (was !== VX.rainK) { VX.learnt = (VX.learnt || 0) + 1; try { if (typeof store !== 'undefined') store.set('zc_vxRain', +VX.rainK.toFixed(2)); } catch (e) { } }
  }
  return VX.rainK;
}
