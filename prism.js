/* ================= PRISM: the shader engine =================
   The last step of every frame. The game draws the city into its canvas as always; PRISM takes that picture and
   finishes it with shaders, on the graphics chip when there is one and on the CPU when there is not.
   On the GPU (WebGL 2, or WebGL 1 on older devices) the frame goes through:
   - bounce light: the lighting engine's light map and a grid of what is solid go in, and a path tracer sends rays
     through the grid from every cell, many more than the CPU can afford, blending each frame into the last;
   - bloom: the brightest parts and every light glow outward through a chain of smaller and smaller copies;
   - light shafts: rays of light streaming from the strongest lamps and the flashlight when the air is heavy (fog, rain,
     dust, smoke, night);
   - the final pass: heat haze shimmering over fires and blasts, sharpening that brings back edges (and upscaling with
     a sharper filter when the governor has lowered the resolution), a touch of colour fringing at the edges, then
     exposure and a soft highlight roll-off, white balance from the colour temperature of the hour (warm at dusk,
     cool at night), saturation (which drains in the dark, as eyes do), contrast, toning, vignette and film grain.
   On the CPU the same look is approached with canvas blend modes: the white balance, the night's desaturation and
   grain (the lighting engine's own bloom and bounce light do the rest).
   It looks after itself. It picks the GPU only when the graphics chip is real hardware (a software renderer is slower
   than the CPU path), measures what it costs, and steps down when the frame runs late: no shafts, smaller bounce grid,
   fewer bloom steps, no upscaling. A shader that will not compile switches off only its own effect. A lost GPU context
   (a driver reset, the phone reclaiming memory) hands over to the CPU path at once and rebuilds when the GPU comes back.
   A run of errors drops a level; if it keeps failing it falls back to the CPU for a minute and tries the GPU again. */
// GPU levels: 0 colour only · 1 + bloom, sharpening, upscaling, grain · 2 + bounce light, shafts, heat haze · 3 more of all
const PRQ = [
  { bloom: 0, shafts: 0, gi: 0, haze: 0, sharp: 1, up: 0, grain: 1, ca: 0 },
  { bloom: 1, shafts: 0, gi: 0, haze: 0, sharp: 1, up: 1, grain: 1, ca: 0 },
  { bloom: 2, shafts: 1, gi: 1, haze: 1, sharp: 1, up: 1, grain: 1, ca: 1 },
  { bloom: 3, shafts: 1, gi: 2, haze: 1, sharp: 1, up: 2, grain: 1, ca: 1 }
];
const PRISM = {
  mode: 'none', want: '', gl: null, glcv: null, v2: false, soft: false, renderer: '', reason: '', lost: false, ok: false,
  adapt: 0, lvl: 2, slow: 0, fast: 0, slowCopy: 0, errT: [], offUntil: 0, ms: 0, msAvg: 0, frames: 0, P: {}, T: {}, F: {}, quad: null, giGpu: false, bloomGpu: false, vigGpu: false,
  gi: { a: null, b: null, w: 0, h: 0, gx: 0, gy: 0, cell: 0, rays: 0 }, wb: [1, 1, 1], temp: 6500, cpuG: null
};
function prismLevel() { return PRISM.lvl = clamp(([1, 2, 2, 3][clamp(PERF.tier | 0, 0, 3)]) + PRISM.adapt + (TUNE.PRISM || 0), 0, 3); }
function prismWanted() {
  // (procOverride: what the engine room's CORE says applies right now; the ecosystem can lock it back to Auto)
  const o = PRISM.procOverride, w = SET.prism === 'off' ? 'off' : o === 'auto' || o === 'cpu' || o === 'gpu' ? o : SET.prism || 'auto';
  if (w === 'off') return 'off';
  if (PRISM.offUntil && performance.now() < PRISM.offUntil) return 'cpu';
  if (w === 'cpu') return 'cpu';
  if (w === 'gpu') return 'gpu';
  return PRISM.soft || prismGpuShy() ? 'cpu' : 'gpu';
}

/* ---------- GPU setup ---------- */
const PR_VS = 'attribute vec2 a; varying vec2 v; void main() { v = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }';
const PR_HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nvarying vec2 v;\n';
const PR_FS = {
  // the bright parts of the picture, plus every light from the lighting engine, for bloom and shafts
  bright: 'uniform sampler2D uS, uL; uniform vec2 uPx; uniform float uTh, uLk;\n' +
    'void main() { vec3 c = (texture2D(uS, v - uPx).rgb + texture2D(uS, v + uPx).rgb + texture2D(uS, v + vec2(uPx.x, -uPx.y)).rgb + texture2D(uS, v - vec2(uPx.x, -uPx.y)).rgb) * 0.25;\n' +
    ' float l = max(c.r, max(c.g, c.b)); float k = clamp((l - uTh) / (1.0 - uTh + 0.0001), 0.0, 1.0); k *= k;\n' +
    ' gl_FragColor = vec4(c * k + texture2D(uL, v).rgb * uLk, 1.0); }',
  // a step down the bloom chain (13 taps folded into 5)
  down: 'uniform sampler2D uT; uniform vec2 uPx;\n' +
    'void main() { vec3 s = texture2D(uT, v).rgb * 4.0 + texture2D(uT, v - uPx).rgb + texture2D(uT, v + uPx).rgb + texture2D(uT, v + vec2(uPx.x, -uPx.y)).rgb + texture2D(uT, v - vec2(uPx.x, -uPx.y)).rgb;\n' +
    ' gl_FragColor = vec4(s / 8.0, 1.0); }',
  // a step back up, added to the level above (a tent filter, so the glow has no blocky edges)
  up: 'uniform sampler2D uT, uB; uniform vec2 uPx;\n' +
    'void main() { vec3 s = texture2D(uT, v + vec2(-2.0 * uPx.x, 0.0)).rgb + texture2D(uT, v + vec2(-uPx.x, uPx.y)).rgb * 2.0 + texture2D(uT, v + vec2(0.0, 2.0 * uPx.y)).rgb\n' +
    ' + texture2D(uT, v + uPx).rgb * 2.0 + texture2D(uT, v + vec2(2.0 * uPx.x, 0.0)).rgb + texture2D(uT, v + vec2(uPx.x, -uPx.y)).rgb * 2.0 + texture2D(uT, v + vec2(0.0, -2.0 * uPx.y)).rgb + texture2D(uT, v - uPx).rgb * 2.0;\n' +
    ' gl_FragColor = vec4((texture2D(uB, v).rgb + s / 12.0) * 0.5, 1.0); }',
  // light shafts: march from each pixel toward each strong light, gathering the glow along the way
  shafts: 'uniform sampler2D uB; uniform vec4 uL[4]; uniform vec3 uC[4]; uniform float uN, uD, uAsp;\n' +
    'void main() { vec3 acc = vec3(0.0);\n' +
    ' for (int i = 0; i < 4; i++) { if (float(i) >= uN) break; vec2 lp = uL[i].xy; vec2 d = lp - v; float dist = length(d * vec2(uAsp, 1.0)); float fall = clamp(1.0 - dist / uL[i].z, 0.0, 1.0);\n' +
    '  if (fall <= 0.0) continue; vec2 st = d / 16.0; vec2 p = v; float w = 1.0; vec3 s = vec3(0.0);\n' +
    '  for (int k = 0; k < 16; k++) { p += st; s += texture2D(uB, p).rgb * w; w *= 0.92; }\n' +
    '  acc += s * uC[i] * fall * fall; }\n' +
    ' gl_FragColor = vec4(acc * uD / 16.0, 1.0); }',
  // bounce light: a Monte Carlo path tracer over the grid of solid cells, blended over the frames
  gi: 'uniform sampler2D uOcc, uM, uPrev, uS; uniform vec2 uG, uOrg, uCv, uShift; uniform float uCell, uFrame, uBlend; uniform vec4 uTr; uniform vec3 uAlb;\n' +
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\n' +
    'float occ(vec2 c) { vec2 uv = vec2((c.x + 0.5) / uG.x, 1.0 - (c.y + 0.5) / uG.y); if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return -1.0; return texture2D(uOcc, uv).a; }\n' +
    'vec2 scr(vec2 c) { vec2 w = uOrg + (c + 0.5) * uCell; vec2 px = vec2(uTr.x * w.x + uTr.y, uTr.z * w.y + uTr.w); return vec2(px.x / uCv.x, 1.0 - px.y / uCv.y); }\n' +
    'vec3 lightAt(vec2 c) { return texture2D(uM, scr(c)).rgb; }\n' +
    'vec3 albAt(vec2 c) { vec3 s = texture2D(uS, scr(c)).rgb; return mix(uAlb, s / (max(s.r, max(s.g, s.b)) + 0.08) * 0.38, 0.6); }\n' +
    'vec3 prevAt(vec2 c) { return texture2D(uPrev, vec2((c.x + 0.5) / uG.x, 1.0 - (c.y + 0.5) / uG.y) + uShift).rgb; }\n' +
    'void main() { vec2 cf = vec2(floor(v.x * uG.x), floor((1.0 - v.y) * uG.y));\n' +
    ' if (occ(cf) > 0.5) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }\n' +
    ' vec3 sum = vec3(0.0); float open = 0.0;\n' +
    ' for (int k = 0; k < RAYS; k++) { float fk = float(k); float an = (fk + hash(cf + vec2(uFrame * 0.131, fk * 7.13))) / float(RAYS) * 6.28318; vec2 d = vec2(cos(an), sin(an));\n' +
    '  float len = 1.0 + hash(cf * 1.71 + vec2(fk * 3.37, uFrame * 0.719)) * float(STEPS) * 0.75; vec2 last = cf; float hit = 0.0;\n' +
    '  for (int s = 1; s <= STEPS; s++) { float t = float(s) * 0.75; if (t > len) break; vec2 c = floor(cf + 0.5 + d * t); float o = occ(c); if (o < 0.0) break; if (o > 0.5) { hit = 1.0; break; } last = c; }\n' +
    '  sum += (lightAt(last) + prevAt(last) * 0.5) * albAt(last) * (hit > 0.5 ? 0.5 : 1.0); open += 1.0 - hit; }\n' +
    ' vec4 cur = vec4(sum / float(RAYS), open / float(RAYS)); vec4 prev = texture2D(uPrev, v + uShift);\n' +
    ' gl_FragColor = mix(prev, cur, uBlend); }',
  // the final pass: everything together, then the grade
  final: 'uniform sampler2D uS, uBl, uSh, uGI, uM, uRf, uRw, uRb; uniform vec2 uIn, uCv, uOrg, uG, uRes, uSunDir; uniform vec4 uTr; uniform vec4 uHot[8]; uniform vec4 uPL[6]; uniform vec3 uPC[6]; uniform float uNPL, uLamp, uSpec;\n' +
    'uniform float uSharp, uBlK, uShK, uGIK, uAOK, uExp, uSat, uCon, uVig, uGrain, uTime, uCA, uHaze, uNH, uAsp, uCell, uCub, uRefK, uRbK, uSunK, uRain, uWind, uRelief, uClar, uGlare, uPurk, uVib, uTone; uniform vec3 uWB, uTS, uTH, uSky, uSun;\n' +
    'const vec3 W3 = vec3(0.2126, 0.7152, 0.0722);\n' +
    'vec3 tap(vec2 p) { return texture2D(uS, p).rgb; }\n' +
    'vec3 cubic(vec2 uv) { vec2 sz = 1.0 / uIn; vec2 sp = uv * sz; vec2 tp = floor(sp - 0.5) + 0.5; vec2 f = sp - tp;\n' +
    ' vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f)); vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f); vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f)); vec2 w3 = f * f * (-0.5 + 0.5 * f);\n' +
    ' vec2 w12 = w1 + w2; vec2 t0 = (tp - 1.0) * uIn; vec2 t3 = (tp + 2.0) * uIn; vec2 t12 = (tp + w2 / w12) * uIn;\n' +
    ' vec3 r = tap(vec2(t0.x, t0.y)) * w0.x * w0.y + tap(vec2(t12.x, t0.y)) * w12.x * w0.y + tap(vec2(t3.x, t0.y)) * w3.x * w0.y\n' +
    '  + tap(vec2(t0.x, t12.y)) * w0.x * w12.y + tap(vec2(t12.x, t12.y)) * w12.x * w12.y + tap(vec2(t3.x, t12.y)) * w3.x * w12.y\n' +
    '  + tap(vec2(t0.x, t3.y)) * w0.x * w3.y + tap(vec2(t12.x, t3.y)) * w12.x * w3.y + tap(vec2(t3.x, t3.y)) * w3.x * w3.y; return max(r, vec3(0.0)); }\n' +
    'void main() { vec2 uv = v;\n' +
    ' if (uHaze > 0.0) { vec2 off = vec2(0.0); for (int i = 0; i < 8; i++) { if (float(i) >= uNH) break; vec4 h = uHot[i]; float r = length((uv - h.xy) * vec2(uAsp, 1.0)); float f = clamp(1.0 - r / h.z, 0.0, 1.0);\n' +
    '  off += vec2(sin(uv.y * 140.0 + uTime * 7.0 + float(i) * 1.7), cos(uv.x * 120.0 + uTime * 6.0)) * f * f * h.w; } uv += off * uHaze * 0.003; }\n' +
    ' vec3 c = uCub > 0.5 ? cubic(uv) : tap(uv);\n' +
    ' if (uSharp > 0.0) { vec3 n = tap(uv + vec2(0.0, uIn.y)), s = tap(uv - vec2(0.0, uIn.y)), e = tap(uv + vec2(uIn.x, 0.0)), w = tap(uv - vec2(uIn.x, 0.0));\n' +
    '  vec3 mn = min(c, min(min(n, s), min(e, w))), mx = max(c, max(max(n, s), max(e, w))); vec3 amp = sqrt(clamp(min(mn, 1.0 - mx) / max(mx, vec3(0.001)), 0.0, 1.0));\n' +
    '  vec3 wg = -amp * uSharp * 0.2; c = max((c + (n + s + e + w) * wg) / (1.0 + 4.0 * wg), vec3(0.0)); }\n' +
    ' if (uCA > 0.0) { vec2 dc = uv - 0.5; float e2 = dot(dc, dc); c.r = mix(c.r, tap(uv - dc * uCA * e2).r, 0.85); c.b = mix(c.b, tap(uv + dc * uCA * e2).b, 0.85); }\n' +
    // relief: the picture's own detail (asphalt grain, roof gravel, cracks, skin) lit from the sun's side
    ' if (uRelief > 0.0) { float ln = dot(tap(uv + vec2(0.0, uIn.y)), W3), ls = dot(tap(uv - vec2(0.0, uIn.y)), W3), le = dot(tap(uv + vec2(uIn.x, 0.0)), W3), lw = dot(tap(uv - vec2(uIn.x, 0.0)), W3);\n' +
    '  c *= 1.0 - clamp(dot(vec2(le - lw, ln - ls), uSunDir) * uRelief * 6.0, -0.22, 0.22); }\n' +
    // lamplight on every surface: the picture's own detail read as height, lit by each lamp, fire and flashlight near
    // it (the side facing the light brighter, the far side darker), with a glint where the street is wet
    ' if (uNPL > 0.0) { float hn = dot(tap(uv + vec2(0.0, uIn.y)), W3), hs = dot(tap(uv - vec2(0.0, uIn.y)), W3), he = dot(tap(uv + vec2(uIn.x, 0.0)), W3), hw = dot(tap(uv - vec2(uIn.x, 0.0)), W3);\n' +
    '  vec3 nr = normalize(vec3((hw - he) * 7.0, (hs - hn) * 7.0, 1.0)); vec3 lsum = vec3(0.0);\n' +
    '  for (int i = 0; i < 6; i++) { if (float(i) >= uNPL) break; vec2 d = (uPL[i].xy - uv) * vec2(uAsp, 1.0); float dist = length(d); float fall = clamp(1.0 - dist / uPL[i].z, 0.0, 1.0); if (fall <= 0.0) continue;\n' +
    '   vec3 L = normalize(vec3(d, 0.06 + 0.22 * uPL[i].z)); float rel = dot(nr, L) - L.z; vec3 H = normalize(L + vec3(0.0, 0.0, 1.0)); float sp = pow(max(dot(nr, H), 0.0), 48.0) * uSpec;\n' +
    '   lsum += uPC[i] * (fall * fall) * uPL[i].w * (rel * 2.2 + sp); }\n' +
    '  c = max(c + c * lsum * uLamp + lsum * uSpec * 0.12, vec3(0.0)); }\n' +
    // clarity: local contrast against a wider ring, so textures read without oversharpening edges
    ' if (uClar > 0.0) { vec2 o1 = uIn * 5.0, o2 = vec2(uIn.x, -uIn.y) * 5.0; vec3 m = (tap(uv + vec2(o1.x, 0.0)) + tap(uv - vec2(o1.x, 0.0)) + tap(uv + vec2(0.0, o1.y)) + tap(uv - vec2(0.0, o1.y)) + tap(uv + o1 * 0.7) + tap(uv - o1 * 0.7) + tap(uv + o2 * 0.7) + tap(uv - o2 * 0.7)) * 0.125;\n' +
    '  c = max(c + (c - m) * uClar, vec3(0.0)); }\n' +
    ' if (uGIK > 0.0) { vec2 px = vec2(uv.x * uCv.x, (1.0 - uv.y) * uCv.y); vec2 w = vec2((px.x - uTr.y) / uTr.x, (px.y - uTr.w) / uTr.z);\n' +
    '  vec4 gi = texture2D(uGI, vec2((w.x - uOrg.x) / (uG.x * uCell), 1.0 - (w.y - uOrg.y) / (uG.y * uCell))); vec3 m = max(texture2D(uM, uv).rgb, vec3(0.07));\n' +
    '  c = c * (1.0 - uAOK * (1.0 - gi.a)) + c * min(gi.rgb * uGIK / m, vec3(1.6)); }\n' +
    // reflections: the sky, the street's lights (mirrored outward, the image sits under the surface) and sun glitter, rippled
    ' if (uRefK > 0.0) { float rf = texture2D(uRf, uv).a * uRefK;\n' +
    '  if (rf > 0.004) { float rw = texture2D(uRw, uv).a; vec2 px = vec2(uv.x * uCv.x, (1.0 - uv.y) * uCv.y); vec2 q = vec2((px.x - uTr.y) / uTr.x, (px.y - uTr.w) / uTr.z) * 0.03;\n' +
    '   vec2 n = vec2(sin(q.x * 1.3 + uTime * 1.4 + sin(q.y * 0.9 + uTime * 0.7) * 1.7), cos(q.y * 1.1 - uTime * 1.2 + sin(q.x * 0.8) * 1.9)) * (0.25 + 0.75 * rw) * (0.5 + uWind);\n' +
    '   n += vec2(sin(q.x * 9.0 + uTime * 9.0 + q.y * 3.0), cos(q.y * 9.0 + uTime * 8.0 - q.x * 2.0)) * uRain * (0.3 + rw) * 0.5;\n' +
    '   vec2 ru = uv + (uv - 0.5) * 0.05 + n * 0.006; vec3 sky = uSky * (0.9 + 0.1 * sin(q.x * 0.21 + q.y * 0.17 + uTime * 0.2));\n' +
    '   vec3 lit = texture2D(uRb, ru).rgb * uRbK; float gl = pow(max(0.0, sin(q.x * 6.1 + n.x * 5.0 + uTime * 2.6) * sin(q.y * 5.3 + n.y * 5.0 - uTime * 2.1)), 28.0) * rw * uSunK;\n' +
    '   c = mix(c, c * 0.7 + sky * (0.18 + 0.32 * rf) + lit, rf) + uSun * gl * 1.6; } }\n' +
    ' c += texture2D(uBl, uv).rgb * uBlK + texture2D(uSh, uv).rgb * uShK;\n' +
    // glare: bright lights at night streak sideways a little, as they do through a lens and through the eye
    ' if (uGlare > 0.0) { vec3 gs = vec3(0.0); for (int i = 1; i <= 6; i++) { float o = float(i) * 0.011, w = 1.0 - float(i) / 7.0; gs += (texture2D(uBl, uv + vec2(o, 0.0)).rgb + texture2D(uBl, uv - vec2(o, 0.0)).rgb) * w; } c += gs * uGlare * vec3(0.7, 0.85, 1.2); }\n' +
    // 1.9.997: the tone curve is the ACES fit (Narkowicz) with its white at 1.25, so the bloom's highlights roll off like
    // film instead of clipping, and the colour keeps its saturation into the brights; vibrance lifts the quiet colours
    // more than the loud ones (the research notes, part on grading)
    ' c *= uExp; if (uTone > 0.5) { vec3 x = c; vec3 a = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14); c = mix(c / (1.0 + max(c - 0.85, 0.0)), a / 0.9826, uTone - 1.0); } else c = c / (1.0 + max(c - 0.85, 0.0));\n' +
    ' c *= uWB; float l = dot(c, W3); float sc = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b)); c = mix(vec3(l), c, uSat * (1.0 + uVib * (1.0 - sc))); c = (c - 0.5) * uCon + 0.5; c += uTS * (1.0 - l) * (1.0 - l) + uTH * l * l;\n' +
    // the night shift: in the dark the eye sees in blue-grey, not in colour
    ' if (uPurk > 0.0) { float pl = dot(max(c, vec3(0.0)), W3); c = mix(c, vec3(pl) * vec3(0.62, 0.82, 1.18), uPurk * (1.0 - smoothstep(0.02, 0.32, pl))); }\n' +
    ' vec2 q = v - 0.5; c *= 1.0 - uVig * smoothstep(0.18, 0.75, dot(q, q) * 2.0);\n' +
    ' c += (fract(sin(dot(v * uRes + vec2(uTime * 61.0, uTime * 37.0), vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * uGrain;\n' +
    ' gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }'
};
function prismInit() {
  if (PRISM.glcv) return;
  const c = document.createElement('canvas'); c.id = 'glfx'; c.setAttribute('aria-hidden', 'true');
  c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:none;pointer-events:none';
  cv.parentNode.insertBefore(c, cv.nextSibling); PRISM.glcv = c;
  const opt = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
  let gl = null;
  try { gl = c.getContext('webgl2', opt); PRISM.v2 = !!gl; if (!gl) gl = c.getContext('webgl', opt) || c.getContext('experimental-webgl', opt); } catch (e) { gl = null; }
  if (!gl) { PRISM.reason = 'no WebGL on this device'; PRISM.soft = true; return; }
  PRISM.gl = gl;
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    PRISM.renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || '');
  } catch (e) { PRISM.renderer = ''; }
  // a software renderer draws shaders on the CPU, slower than the CPU path itself
  PRISM.soft = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i.test(PRISM.renderer);
  if (PRISM.soft) PRISM.reason = 'software graphics (' + PRISM.renderer.slice(0, 40) + ')';
  c.addEventListener('webglcontextlost', e => { e.preventDefault(); PRISM.lost = true; prismLost(); PRISM.ok = false; prismShow(false); coreHurt('PRISM', 'GPU context lost'); coreRepaired('PRISM', 'Shaders: the GPU reset, using the CPU path until it is back'); }, false);
  c.addEventListener('webglcontextrestored', () => { PRISM.lost = false; prismBuild(); coreRepaired('PRISM', 'Shaders rebuilt after the GPU came back'); }, false);
  prismBuild();
}
function prismShader(type, src) {
  const gl = PRISM.gl, s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error('shader: ' + String(log).slice(0, 160)); }
  return s;
}
function prismProgram(name, fs, defs) {
  const gl = PRISM.gl;
  try {
    const p = gl.createProgram();
    gl.attachShader(p, prismShader(gl.VERTEX_SHADER, PR_VS)); gl.attachShader(p, prismShader(gl.FRAGMENT_SHADER, (defs || '') + PR_HEAD + fs));
    gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + String(gl.getProgramInfoLog(p)).slice(0, 160));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i), nm = info.name.replace(/\[0\]$/, ''); u[nm] = gl.getUniformLocation(p, info.name); }
    return { p: p, u: u };
  } catch (e) { coreHurt('PRISM', name + ': ' + e.message); try { console.error(e); } catch (x) { } return null; }
}
function prismTex(filter) {
  const gl = PRISM.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter || gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter || gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  return t;
}
// a texture you can draw into, of w x h
function prismFbo(o, w, h) {
  const gl = PRISM.gl; w = Math.max(1, w | 0); h = Math.max(1, h | 0);
  if (o && o.w === w && o.h === h) return o;
  if (!o) { o = { t: prismTex(), f: gl.createFramebuffer(), w: 0, h: 0 }; }
  gl.bindTexture(gl.TEXTURE_2D, o.t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, o.f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, o.t, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('framebuffer incomplete');
  o.w = w; o.h = h; return o;
}
function prismBuild() {
  const gl = PRISM.gl; if (!gl || gl.isContextLost()) return;
  PRISM.P = {}; PRISM.T = {}; PRISM.F = {}; PRISM.gi.a = PRISM.gi.b = null; PRISM.gi.w = 0;
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); PRISM.quad = b;
  gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  for (const k of ['bright', 'down', 'up', 'shafts', 'final']) PRISM.P[k] = prismProgram(k, PR_FS[k]);
  PRISM.P.gi1 = prismProgram('gi', PR_FS.gi, '#define RAYS 6\n#define STEPS 12\n');
  PRISM.P.gi2 = prismProgram('gi', PR_FS.gi, '#define RAYS 12\n#define STEPS 16\n');
  for (const k of ['scene', 'light', 'amb', 'occ', 'rfa', 'rfw']) PRISM.T[k] = prismTex();
  PRISM.T.black = prismTex();
  PRISM.ok = !!PRISM.P.final;
  if (!PRISM.ok) PRISM.reason = 'the final shader did not compile';
}
function prismShow(on) { if (PRISM.glcv) PRISM.glcv.style.display = on ? 'block' : 'none'; }
function prismUpload(t, src) {
  const gl = PRISM.gl; gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
}
function prismDraw(prog, fbo, w, h) {
  const gl = PRISM.gl; gl.bindFramebuffer(gl.FRAMEBUFFER, fbo ? fbo.f : null); gl.viewport(0, 0, w, h); gl.useProgram(prog.p); gl.drawArrays(gl.TRIANGLES, 0, 3);
}
function prismBind(prog, name, unit, tex) { const gl = PRISM.gl, u = prog.u[name]; if (u == null) return; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u, unit); }

/* ---------- colour of the hour ---------- */
// the colour of light at a temperature (kelvin), as a multiplier that leaves 6500 K white
function prismKelvin(K, out) {
  const f = k => { const t = k / 100; let r, g, b; if (t <= 66) { r = 255; g = 99.47 * Math.log(t) - 161.12; b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04; } else { r = 329.7 * Math.pow(t - 60, -0.1332); g = 288.12 * Math.pow(t - 60, -0.0755); b = 255; } return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)]; };
  const a = f(K), w = f(6500); out[0] = a[0] / w[0]; out[1] = a[1] / w[1]; out[2] = a[2] / w[2];
  const m = Math.max(out[0], out[1], out[2]); out[0] /= m; out[1] /= m; out[2] /= m;   // never brighter than it was
  return out;
}
// the grade for this frame: temperature from the hour and the weather, saturation that drains in the dark
function prismGrade() {
  const F = CORE.frame, night = F.night || 0, sun = F.sun, bio = WORLD.cur ? WORLD.cur.bio : 'city';
  let K = 6500;
  if (LUX.live) {
    const h = LUX.hour, sea = WORLD.season, rise = LUX_RISE[sea], set = LUX_SET[sea], gold = Math.max(0, 1 - Math.min(Math.abs(h - set), Math.abs(h - rise)) / 1.3);
    K = 6500 - gold * 2600 * (1 - night) + night * 2200;
  }
  K += (WX.dark || 0) * 1200 + (WX.snow || 0) * 700 + (WX.fog || 0) * 500 - (WX.sand || 0) * 1400 - (bio === 'desert' ? 500 : 0) - (bio === 'burning' ? 700 : 0);
  const t = SET.temp || 'auto'; K += t === 'warm' ? -1100 : t === 'cool' ? 1400 : 0;
  // blend toward neutral, so the effect is a tint and not a filter
  prismKelvin(clamp(K, 2500, 12000), PRISM.wb);
  for (let i = 0; i < 3; i++) PRISM.wb[i] = 1 - (1 - PRISM.wb[i]) * 0.45;
  PRISM.temp = Math.round(K);
  // (1.9.997: a more vibrant base, the night still drains it; vibrance for the quiet colours; the ACES curve blended in)
  const vivid = SET.vivid == null ? 1 : SET.vivid;
  return { sat: 1.06 + 0.1 * vivid - night * 0.24 - (WX.fog || 0) * 0.08, con: 1.04 + 0.02 * vivid + (sun && sun.on ? 0.04 * sun.k : 0), exp: 1 + night * 0.1, vib: 0.45 * vivid * (1 - night * 0.5), tone: 1 + 0.85 * vivid };
}

/* ---------- one frame ---------- */
function prismGpu() {
  const gl = PRISM.gl, q = PRQ[prismLevel()], F = CORE.frame, P = PRISM.P, T = PRISM.T;
  if (!gl || gl.isContextLost() || !PRISM.ok) throw new Error('gpu not ready');
  // the output: full display sharpness when upscaling is on (the game may be drawing at a lower resolution)
  const outDpr = q.up ? Math.min(window.devicePixelRatio || 1, Math.max(DPR, Q.dpr)) : DPR;
  let ow = Math.round(W * outDpr), oh = Math.round(H * outDpr);
  const maxPx = 3840 * 2160; if (ow * oh > maxPx) { const k = Math.sqrt(maxPx / (ow * oh)); ow = Math.round(ow * k); oh = Math.round(oh * k); }
  const c = PRISM.glcv; if (c.width !== ow || c.height !== oh) { c.width = ow; c.height = oh; }
  const cw = cv.width, ch = cv.height;
  prismUpload(T.scene, cv);
  const lux = LUX.live && LUX.A && LUX.M;
  if (lux) { prismUpload(T.light, LUX.A); prismUpload(T.amb, LUX.M); }
  // bounce light on the GPU
  PRISM.giGpu = false;
  const giP = q.gi >= 2 ? P.gi2 : P.gi1;
  if (q.gi && giP && lux && LUX.giOn && F.gi && F.gi.occ && PRISM.tr && !LUX.giCpuOnly) {   // (giCpuOnly: bounce light set to CPU in the engine room)
    const G2 = F.gi, g = PRISM.gi, gw = G2.gw, gh = G2.gh;
    gl.bindTexture(gl.TEXTURE_2D, T.occ); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    if (!G2.occ255 || G2.occ255.length !== gw * gh) G2.occ255 = new Uint8Array(gw * gh);
    const o255 = G2.occ255, oc = G2.occ; for (let i = 0; i < o255.length; i++) o255[i] = oc[i] ? 255 : 0;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, gw, gh, 0, gl.ALPHA, gl.UNSIGNED_BYTE, o255);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    const resize = g.w !== gw || g.h !== gh || g.cell !== G2.cell;
    g.a = prismFbo(g.a, gw, gh); g.b = prismFbo(g.b, gw, gh);
    if (resize) { for (const f of [g.a, g.b]) { gl.bindFramebuffer(gl.FRAMEBUFFER, f.f); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); } g.gx = G2.gx; g.gy = G2.gy; }
    const sx = (G2.gx - g.gx) / gw, sy = -(G2.gy - g.gy) / gh;
    gl.useProgram(giP.p); const u = giP.u, t = PRISM.tr, alb = GI_ALB[WORLD.cur ? WORLD.cur.bio : 'city'] || GI_ALB.city;
    gl.uniform2f(u.uG, gw, gh); gl.uniform2f(u.uOrg, G2.gx * G2.cell, G2.gy * G2.cell); gl.uniform2f(u.uCv, cw, ch); gl.uniform2f(u.uShift, sx, sy);
    gl.uniform1f(u.uCell, G2.cell); gl.uniform1f(u.uFrame, PRISM.frames % 997); gl.uniform1f(u.uBlend, resize ? 1 : 0.18); gl.uniform4f(u.uTr, t.a, t.e, t.d, t.f); gl.uniform3f(u.uAlb, alb[0], alb[1], alb[2]);
    prismBind(giP, 'uOcc', 0, T.occ); prismBind(giP, 'uM', 1, T.amb); prismBind(giP, 'uPrev', 2, g.a.t); prismBind(giP, 'uS', 3, T.scene);
    prismDraw(giP, g.b, gw, gh);
    const sw = g.a; g.a = g.b; g.b = sw; g.w = gw; g.h = gh; g.cell = G2.cell; g.gx = G2.gx; g.gy = G2.gy;
    PRISM.giGpu = true;
  }
  // bloom: bright parts at half size, then down a chain and back up
  PRISM.bloomGpu = false;
  let bloomT = T.black;
  const hw = Math.max(1, cw >> 1), hh = Math.max(1, ch >> 1);
  if (q.bloom && P.bright && P.down && P.up && bloomK() > 0) {
    const B = PRISM.F; B.b0 = prismFbo(B.b0, hw, hh);
    gl.useProgram(P.bright.p); gl.uniform2f(P.bright.u.uPx, 1 / cw, 1 / ch); gl.uniform1f(P.bright.u.uTh, 0.75); gl.uniform1f(P.bright.u.uLk, lux ? 0.18 + 0.22 * (F.night || 0) : 0);
    prismBind(P.bright, 'uS', 0, T.scene); prismBind(P.bright, 'uL', 1, lux ? T.light : T.black); prismDraw(P.bright, B.b0, hw, hh);
    const steps = q.bloom + 1, chain = [B.b0];
    for (let i = 1; i <= steps; i++) { const f = B['b' + i] = prismFbo(B['b' + i], Math.max(1, hw >> i), Math.max(1, hh >> i)), src = chain[i - 1]; gl.useProgram(P.down.p); gl.uniform2f(P.down.u.uPx, 1 / src.w, 1 / src.h); prismBind(P.down, 'uT', 0, src.t); prismDraw(P.down, f, f.w, f.h); chain.push(f); }
    for (let i = steps; i >= 1; i--) { const src = i === steps ? chain[i] : B['u' + i], dst = B['u' + (i - 1)] = prismFbo(B['u' + (i - 1)], chain[i - 1].w, chain[i - 1].h); gl.useProgram(P.up.p); gl.uniform2f(P.up.u.uPx, 1 / src.w, 1 / src.h); prismBind(P.up, 'uT', 0, src.t); prismBind(P.up, 'uB', 1, chain[i - 1].t); prismDraw(P.up, dst, dst.w, dst.h); }
    bloomT = B.u0.t; PRISM.bloomGpu = true;
  }
  // light shafts from the strongest lights, when the air is heavy enough to show them
  let shT = T.black, shK = 0;
  const air = clamp(0.05 + (F.fog || 0) * 0.6 + (WX.rain || 0) * 0.25 + (F.dust || 0) * 0.35 + (F.night || 0) * 0.18 + (WX.ash || 0) * 0.3, 0, 1);
  if (q.shafts && P.shafts && PRISM.bloomGpu && F.lights.length && air > 0.08) {
    const B = PRISM.F; B.sh = prismFbo(B.sh, hw, hh); const u = P.shafts.u, Ls = F.lights.slice(0, 4), lv = new Float32Array(16), lc = new Float32Array(12);
    Ls.forEach((l, i) => { lv[i * 4] = l.sx / cw; lv[i * 4 + 1] = 1 - l.sy / ch; lv[i * 4 + 2] = Math.min(1.2, l.r / ch * 1.6); const k = Math.min(1.5, l.i) / 255; lc[i * 3] = l.c0 * k; lc[i * 3 + 1] = l.c1 * k; lc[i * 3 + 2] = l.c2 * k; });
    gl.useProgram(P.shafts.p); gl.uniform4fv(u.uL, lv); gl.uniform3fv(u.uC, lc); gl.uniform1f(u.uN, Ls.length); gl.uniform1f(u.uD, 0.32 * air); gl.uniform1f(u.uAsp, cw / ch);
    prismBind(P.shafts, 'uB', 0, B.b0.t); prismDraw(P.shafts, B.sh, hw, hh); shT = B.sh.t; shK = 1;
  }
  // the final pass, to the screen
  const fp = P.final, u = fp.u, gr = prismGrade(), night = F.night || 0, t = PRISM.tr || { a: 1, e: 0, d: 1, f: 0 };
  gl.useProgram(fp.p);
  gl.uniform2f(u.uIn, 1 / cw, 1 / ch); gl.uniform2f(u.uCv, cw, ch); gl.uniform2f(u.uRes, ow, oh); gl.uniform4f(u.uTr, t.a, t.e, t.d, t.f);
  const sharp = (SET.sharp == null ? 40 : SET.sharp) / 100, up = ow / cw;
  gl.uniform1f(u.uSharp, q.sharp ? clamp(sharp * (up > 1.05 ? 1.3 : 1), 0, 1.6) : 0); gl.uniform1f(u.uCub, q.up >= 2 && up > 1.05 ? 1 : 0);
  gl.uniform1f(u.uBlK, PRISM.bloomGpu ? (0.5 + 0.3 * night + 0.5 * (F.fog || 0) + 0.25 * (F.wet || 0)) * bloomK() : 0); gl.uniform1f(u.uShK, shK);
  const gig = PRISM.giGpu && F.gi;
  gl.uniform1f(u.uGIK, gig ? 0.9 : 0); gl.uniform1f(u.uAOK, gig ? 0.12 + 0.18 * (F.day || 0) : 0);
  if (gig) { gl.uniform2f(u.uOrg, F.gi.gx * F.gi.cell, F.gi.gy * F.gi.cell); gl.uniform2f(u.uG, F.gi.gw, F.gi.gh); gl.uniform1f(u.uCell, F.gi.cell); }
  gl.uniform1f(u.uExp, gr.exp); gl.uniform1f(u.uSat, gr.sat); gl.uniform1f(u.uCon, gr.con); gl.uniform1f(u.uVib, gr.vib || 0); gl.uniform1f(u.uTone, gr.tone || 0);
  gl.uniform3f(u.uWB, PRISM.wb[0], PRISM.wb[1], PRISM.wb[2]);
  gl.uniform3f(u.uTS, -0.012 * (1 - night), 0.004, 0.02 + 0.015 * night); gl.uniform3f(u.uTH, 0.018 * (1 - night * 0.6), 0.008, -0.012);
  gl.uniform1f(u.uVig, SET.grade === false ? 0 : (SET.vig == null ? 50 : SET.vig) / 100 * (0.42 + 0.12 * night));
  gl.uniform1f(u.uGrain, q.grain && SET.grain !== false ? 0.022 + 0.018 * night : 0); gl.uniform1f(u.uTime, (G.time || 0) % 100);
  gl.uniform1f(u.uCA, q.ca ? 0.006 : 0); gl.uniform1f(u.uAsp, cw / ch);
  const hot = q.haze && !RM ? F.hot : null, hv = new Float32Array(32);
  if (hot) hot.forEach((h, i) => { if (i < 8) { hv[i * 4] = h.sx / cw; hv[i * 4 + 1] = 1 - h.sy / ch; hv[i * 4 + 2] = Math.max(0.01, h.r / ch); hv[i * 4 + 3] = h.k; } });
  gl.uniform4fv(u.uHot, hv); gl.uniform1f(u.uNH, hot ? Math.min(8, hot.length) : 0); gl.uniform1f(u.uHaze, hot && hot.length ? 1 : 0);
  // reflections: the maps the reflection engine painted this frame
  const refl = typeof MIRROR !== 'undefined' && MIRROR.on && MIRROR.gpu && MIRROR.MA;
  if (refl) { prismUpload(T.rfa, MIRROR.MA); prismUpload(T.rfw, MIRROR.MW); }
  gl.uniform1f(u.uRefK, refl ? 1 : 0); gl.uniform1f(u.uRbK, 1.1 + 1.6 * night); gl.uniform1f(u.uRain, WX.rain || 0); gl.uniform1f(u.uWind, Math.min(1.2, WX.wind || 0));
  if (refl) { const S = MIRROR.sky, Sn = MIRROR.sun; gl.uniform3f(u.uSky, S[0], S[1], S[2]); gl.uniform3f(u.uSun, Sn[0], Sn[1], Sn[2]); gl.uniform1f(u.uSunK, MIRROR.lvl >= 2 ? MIRROR.sunK * (F.day || 0) : 0); }
  // relief and clarity by day (from the sun's side), glare and the blue shift of the eye at night
  const sun = F.sun, sl = sun && sun.on ? Math.hypot(sun.dx, sun.dy) || 1 : 1;
  gl.uniform1f(u.uRelief, q.sharp && sun && sun.on && prismLevel() >= 2 ? 0.22 * sun.k : 0); gl.uniform2f(u.uSunDir, sun && sun.on ? -sun.dx / sl : 0, sun && sun.on ? sun.dy / sl : 0);
  gl.uniform1f(u.uClar, prismLevel() >= 2 ? 0.16 + 0.06 * night : 0);
  // lamplight relief: up to six lights from the lighting engine (screen positions), stronger in the dark and on wet streets
  { const Ls = prismLevel() >= 1 && LUX.live ? F.lights : null, n = Ls ? Math.min(6, Ls.length) : 0, pl = PRISM.plv || (PRISM.plv = new Float32Array(24)), pc = PRISM.plc || (PRISM.plc = new Float32Array(18));
    for (let i = 0; i < n; i++) { const l = Ls[i]; pl[i * 4] = l.sx / cw; pl[i * 4 + 1] = 1 - l.sy / ch; pl[i * 4 + 2] = Math.min(1.4, l.r / ch * 1.4); pl[i * 4 + 3] = Math.min(1.5, l.i); pc[i * 3] = l.c0 / 255; pc[i * 3 + 1] = l.c1 / 255; pc[i * 3 + 2] = l.c2 / 255; }
    gl.uniform4fv(u.uPL, pl); gl.uniform3fv(u.uPC, pc); gl.uniform1f(u.uNPL, n); gl.uniform1f(u.uLamp, n ? (0.18 + 0.5 * night) : 0); gl.uniform1f(u.uSpec, n ? clamp(0.15 + (F.wet || 0) * 0.9, 0, 1) * (0.3 + 0.7 * night) : 0); }
  gl.uniform1f(u.uGlare, PRISM.bloomGpu && prismLevel() >= 2 ? 0.05 * night : 0); gl.uniform1f(u.uPurk, LUX.live ? 0.42 * night : 0);
  prismBind(fp, 'uS', 0, T.scene); prismBind(fp, 'uBl', 1, bloomT); prismBind(fp, 'uSh', 2, shT); prismBind(fp, 'uGI', 3, gig ? PRISM.gi.a.t : T.black); prismBind(fp, 'uM', 4, lux ? T.amb : T.black);
  prismBind(fp, 'uRf', 5, refl ? T.rfa : T.black); prismBind(fp, 'uRw', 6, refl ? T.rfw : T.black); prismBind(fp, 'uRb', 7, PRISM.bloomGpu ? PRISM.F.b0.t : T.black);
  prismDraw(fp, null, ow, oh);
  if (++PRISM.frames % 120 === 0) { const e = gl.getError(); if (e !== gl.NO_ERROR && e !== gl.CONTEXT_LOST_WEBGL) throw new Error('GL error ' + e); }
}
// the CPU path: white balance, the night's desaturation and a little grain, with canvas blend modes
function prismCpu() {
  const gr = prismGrade(), F = CORE.frame, lvl = prismLevel(), wb = PRISM.wb, night = F.night || 0;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const dev = Math.abs(1 - wb[0]) + Math.abs(1 - wb[1]) + Math.abs(1 - wb[2]);
  if (dev > 0.03) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgb(' + Math.round(wb[0] * 255) + ',' + Math.round(wb[1] * 255) + ',' + Math.round(wb[2] * 255) + ')'; ctx.fillRect(0, 0, cv.width, cv.height); }
  if (lvl >= 1 && gr.sat < 0.98) { ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = clamp((1 - gr.sat) * 1.4, 0, 0.6); ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalAlpha = 1; }
  else if (lvl >= 1 && gr.sat > 1.02) { ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = clamp((gr.sat - 1) * 0.9, 0, 0.14); ctx.fillStyle = '#8a8a8a'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalAlpha = 1; }   // (1.9.997: a little more punch by day on the processor path)
  if (lvl >= 2 && SET.grain !== false && !PERF.saver) {
    const pat = texelPattern(ctx, 'noise', Math.max(1, DPR)); if (pat) { ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.035 + 0.025 * night; ctx.translate(Math.random() * 128, Math.random() * 128); ctx.fillStyle = pat; ctx.fillRect(-128, -128, cv.width + 256, cv.height + 256); }
  }
  ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
// render() calls this at the very end of every frame; nothing in here may stop the game
function prismFrame() {
  const t0 = performance.now();
  const want = prismWanted();
  PRISM.tr = CORE.frame.tr || null;
  if (want === 'gpu' && !PRISM.glcv) prismInit();
  let mode = want;
  if (mode === 'gpu' && (!PRISM.gl || PRISM.lost || !PRISM.ok)) mode = 'cpu';
  if (mode !== PRISM.mode) { PRISM.mode = mode; prismShow(mode === 'gpu'); if (mode !== 'gpu') { PRISM.giGpu = PRISM.bloomGpu = false; } }
  PRISM.vigGpu = mode === 'gpu';
  try {
    if (mode === 'gpu') { prismGpu(); coreBeat('PRISM'); }
    else if (mode === 'cpu') prismCpu();
  } catch (e) { prismHurt(e); if (PRISM.mode === 'gpu') { PRISM.mode = 'cpu'; prismShow(false); PRISM.giGpu = PRISM.bloomGpu = PRISM.vigGpu = false; } }
  const ms = performance.now() - t0; PRISM.ms = ms; PRISM.msAvg += (ms - PRISM.msAvg) * 0.05; coreCost('PRISM', ms);
}
// once a second: a graphics chip that is the bottleneck (the frame is late but the CPU is not busy) steps the shaders
// down first; a canvas-to-texture copy that is slow on this device even at the lowest level hands over to the CPU path
function prismWatch() {
  if (PRISM.mode !== 'gpu' || document.hidden) return;
  const T = 1000 / targetFps(), now = performance.now();
  if (PERF.fps && PERF.fps < targetFps() * 0.85 && PERF.workMs < T * 0.5) { if (++PRISM.slow >= 2 && PRISM.adapt > -3) { PRISM.adapt--; PRISM.slow = 0; } }
  else if (PERF.fps >= targetFps() * 0.97) { PRISM.slow = 0; if (++PRISM.fast >= 15 && PRISM.adapt < 0 && coreRise('PRISM')) { PRISM.adapt++; PRISM.fast = 0; } }
  if (PRISM.msAvg > T * 0.35 && prismLevel() === 0) { if (++PRISM.slowCopy >= 3) { PRISM.offUntil = now + 300000; PRISM.slowCopy = 0; PRISM.reason = 'the GPU copy is slow on this device'; coreRepaired('PRISM', 'Shaders moved to the CPU: the GPU copy was too slow'); } }
  else PRISM.slowCopy = 0;
}
function prismHurt(e) {
  const now = performance.now(); coreHurt('PRISM', e); try { console.error(e); } catch (x) { }
  PRISM.errT.push(now); while (PRISM.errT.length && now - PRISM.errT[0] > 10000) PRISM.errT.shift();
  if (PRISM.errT.length >= 6) { PRISM.offUntil = now + 60000; PRISM.errT.length = 0; coreRepaired('PRISM', 'Shaders on the CPU for a minute after GPU errors'); }
  else if (PRISM.errT.length >= 3 && PRISM.adapt > -3) { PRISM.adapt--; coreRepaired('PRISM', 'Shaders stepped down a level'); }
  if (PRISM.gl && !PRISM.gl.isContextLost() && (!PRISM.P.final || PRISM.errT.length === 2)) prismBuild();
}
coreAdd({
  name: 'PRISM', kind: 'render', does: 'Shader engine: GPU shaders (WebGL 2 or 1) with a CPU fallback for path-traced bounce light, bloom, light shafts, heat haze, sharpening and upscaling, color temperature and grading, vignette and film grain; in the final pass, relief and highlights from the six nearest lamps, fires and flashes on every surface.',
  state: () => PRISM.mode === 'gpu' ? 'GPU' + (PRISM.v2 ? ' (WebGL 2)' : ' (WebGL 1)') : PRISM.mode === 'cpu' ? 'CPU' + (PRISM.reason ? ': ' + PRISM.reason : '') : PRISM.mode,
  level: () => PRISM.mode === 'gpu' ? ['color', 'bloom + sharpen', 'bounce light + shafts', 'full'][PRISM.lvl] + ', ' + PRISM.temp + ' K' : PRISM.temp + ' K',
  sec: prismWatch, canTrim: () => prismLevel() > 0,
  trim: () => { if (PRISM.adapt <= -3) return false; PRISM.adapt--; return true; }, boost: () => { if (PRISM.adapt >= 0) return false; PRISM.adapt++; return true; },
  repair: () => { PRISM.offUntil = 0; PRISM.errT.length = 0; if (PRISM.gl && !PRISM.gl.isContextLost()) prismBuild(); }
});
/* CORE v3: what the shader engine learns. A graphics chip that keeps losing its context on this device (it happens on
   some phones and drivers) is remembered: after 3 losses in recent sessions, Auto runs the shaders on the processor
   for a while instead of stuttering through rebuilds, and tries the GPU again after a few calm sessions. */
function prismLost() {
  if (typeof LEARN === 'undefined' || !LEARN.ready) return;
  const o = learnOwn('PRISM'); o.loss = (o.loss | 0) + 1; o.at = Date.now(); o.ses = LEARN.data.ses; learnDirty();
  if (o.loss === 3) coreLog('PRISM learned: the graphics chip lost its context 3 times on this device lately; Auto runs the shaders on the processor for a while');
}
function prismGpuShy() {
  if (typeof LEARN === 'undefined' || !LEARN.ready || !CORE.by.PRISM) return false;
  const o = learnOwn('PRISM');
  // calm sessions forgive one loss each
  if (o.loss && o.ses != null && LEARN.data.ses - o.ses >= 2) { o.loss--; o.ses = LEARN.data.ses; learnDirty(); }
  return (o.loss | 0) >= 3;
}
coreMeta('PRISM', { ver: 4, provides: ['shaders', 'grading', 'gpuBloom', 'gpuBounce'], feats: { want: ['webgl', 'webgl2'], without: 'every shader runs on the processor (slower, same look)' },
  lv: () => PRISM.mode === 'gpu' ? prismLevel() : -1, adaptGet: () => PRISM.adapt, loadNow: () => Math.round(cv.width * cv.height / 100000), loadName: 'hundred-thousand pixels',
  alive: () => G.mode === 'play' && PRISM.mode === 'gpu' && !PRISM.lost, stallS: 5, beatOwn: true,
  check: () => PRISM.mode === 'gpu' && PRISM.gl && !PRISM.lost && PRISM.gl.isContextLost() ? 'its graphics context is gone' : '',
  reset: () => { PRISM.offUntil = 0; PRISM.errT.length = 0; PRISM.adapt = clamp(PRISM.adapt | 0, -3, 0); if (PRISM.gl && !PRISM.gl.isContextLost()) prismBuild(); },
  learned: () => { const o = learnOwn('PRISM'); return o.loss ? ['The graphics chip lost its context ' + o.loss + ' time' + (o.loss === 1 ? '' : 's') + ' here lately' + (o.loss >= 3 ? ', so Auto keeps the shaders on the processor for now.' : '.')] : ['Its GPU path has been steady on this device.']; } });

