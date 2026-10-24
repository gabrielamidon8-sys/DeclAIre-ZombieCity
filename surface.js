/* ================= SURFACE: HD materials for the 3D view (1.9.9991) =================
   The 3D city was coloured by vertex and a little noise: up close a brick wall was a flat red board with lines on it and
   the street a blurred painting. SURFACE bakes real surfaces once, on the graphics chip, when the 3D view starts:
   seventeen materials (brick, concrete panels, stone blocks, clapboard siding, stucco, logs, barn planks, asphalt,
   sidewalk slabs, grass, soil, roof gravel, corrugated metal, shingles, sand, painted metal and bark), each a tile of a metre
   or a few drawn at 1024 pixels (512 on most devices, 256 on the weakest) from tileable noise, cells and profiles:
   every brick its own colour with bevelled edges and recessed mortar, panels with form-tie holes and rain streaks,
   aggregate and cracks in the asphalt, blades and clover in the grass, pebbles in the soil.
   Each material is two layers of a texture array: colour and roughness, and the surface's slope (a normal map), its
   cavities (occlusion) and how much of it takes the paint of the thing it covers (a brick takes the building's colour,
   its mortar stays grey). The other 3D engines sample them by name: DEPTH and FACADE for walls, roofs, the ground and
   the street's things. Baking takes a few milliseconds on a graphics chip; nothing is downloaded. */
const SURF_L = { brick: 0, concrete: 1, stone: 2, siding: 3, stucco: 4, logs: 5, planks: 6, asphalt: 7, pavers: 8, grass: 9, dirt: 10, gravel: 11, metalc: 12, shingle: 13, sand: 14, metal: 15, bark: 16 };
const SURF_N = 17;
// the size of a tile in metres (the textures repeat every that many metres)
const SURF_TILE = [1.8, 3.0, 1.8, 1.8, 2.0, 1.68, 1.6, 4.0, 3.0, 2.0, 2.0, 1.5, 1.5, 2.0, 3.0, 1.0, 1.2];
const SURF = { ok: false, size: 0, A: null, N: null, ms: 0, tries: 0, why: '', uA: { value: null }, uN: { value: null }, uOn: { value: 0 }, tests: null };

/* ---------- the generator: one fragment shader, one layer and one map at a time ---------- */
const SURF_GEN = `
uniform float uL, uMode, uS;
varying vec2 vUv;
float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 h22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
// tileable value noise and fbm: p in cells, per the period in cells (whole numbers)
float pn(vec2 p, vec2 per) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  float a = h12(mod(i, per)), b = h12(mod(i + vec2(1.0, 0.0), per)), c = h12(mod(i + vec2(0.0, 1.0), per)), d = h12(mod(i + vec2(1.0, 1.0), per));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }
float pf(vec2 p, vec2 per, int oct) { float s = 0.0, a = 0.5, n = 0.0; for (int i = 0; i < 7; i++) { if (i >= oct) break; s += a * pn(p, per); n += a; p *= 2.0; per *= 2.0; a *= 0.5; } return s / n; }
// tileable cells: x the nearest distance, y the second, z the nearest cell's hash
vec3 pv(vec2 p, vec2 per) { vec2 i = floor(p), f = fract(p); float d1 = 9.0, d2 = 9.0, id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)), c = mod(i + g, per), o = h22(c) * 0.9 + 0.05; float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; id = h12(c * 1.37 + 0.5); } else if (d < d2) d2 = d; }
  return vec3(d1, d2, id); }
float sat(float x) { return clamp(x, 0.0, 1.0); }
// each material: albedo (sRGB, or a modulator round 0.5 for the ground), roughness, height (metres), occlusion, paint
void mBrick(vec2 uv, out vec3 c, out float r, out float h, out float ao, out float t) {
  vec2 g = vec2(uv.x * 8.0, uv.y * 24.0); float row = floor(g.y), off = mod(row, 2.0) * 0.5;
  vec2 cell = vec2(floor(g.x + off), row), f = vec2(fract(g.x + off), fract(g.y)); vec2 cid = mod(cell, vec2(8.0, 24.0));
  float ex = min(f.x, 1.0 - f.x) / 0.045, ey = min(f.y, 1.0 - f.y) / 0.13, e = min(ex, ey) + (pn(uv * vec2(160.0, 160.0), vec2(160.0)) - 0.5) * 0.5;
  float face = smoothstep(0.85, 1.25, e), bev = smoothstep(0.95, 2.6, e);
  float hv = h12(cid), hv2 = h12(cid + 17.3), sp = pn(uv * 220.0, vec2(220.0)), sp2 = pn(uv * 60.0, vec2(60.0));
  vec3 b = vec3(0.5) * (0.78 + 0.42 * hv) * vec3(1.0 + (hv2 - 0.5) * 0.18, 1.0, 1.0 - (hv2 - 0.5) * 0.2);
  if (hv2 > 0.9) b *= 0.62;   // a dark, overburnt one
  b *= 0.86 + 0.24 * sp2 + 0.12 * (sp - 0.5);
  float chip = step(0.82, pn(uv * 90.0, vec2(90.0))) * (1.0 - bev);
  vec3 mort = vec3(0.56, 0.54, 0.5) * (0.8 + 0.3 * sp);
  c = mix(mort, b, face); t = face;
  h = face * (0.006 + bev * 0.004 + sp * 0.0012 - chip * 0.004) + (1.0 - face) * sp * 0.001;
  r = mix(0.95, 0.82 + 0.1 * sp, face); ao = mix(0.55, 0.82 + 0.18 * bev, face);
}
void mConcrete(vec2 uv, out vec3 c, out float r, out float h, out float ao, out float t) {
  vec2 g = uv * 2.0, f = fract(g), cid = mod(floor(g), vec2(2.0));
  float jx = min(f.x, 1.0 - f.x), jy = min(f.y, 1.0 - f.y), j = min(jx, jy) * 1.5;   // metres from the joint
  float joint = 1.0 - smoothstep(0.004, 0.012, j);
  vec2 tp = fract(f * 4.0) - 0.5; float tie = 1.0 - smoothstep(0.035, 0.05, length(tp * vec2(1.0, 1.0)));
  float n1 = pf(uv * 8.0, vec2(8.0), 5), n2 = pn(uv * 300.0, vec2(300.0)), streak = pf(vec2(uv.x * 40.0, uv.y * 3.0), vec2(40.0, 3.0), 3);
  vec3 pores = pv(uv * 90.0, vec2(90.0)); float pore = 1.0 - smoothstep(0.0, 0.12, pores.x);
  float pv0 = h12(cid + 3.1);
  c = vec3(0.5) * (0.82 + 0.22 * n1 + 0.08 * pv0) * (1.0 - 0.18 * smoothstep(0.55, 0.85, streak)) * (1.0 - pore * 0.25) * (0.96 + 0.08 * n2);
  c = mix(c, vec3(0.2), joint * 0.6 + tie * 0.5); t = 1.0 - joint * 0.5 - tie * 0.5;
  h = -joint * 0.008 - tie * 0.01 - pore * 0.0015 + n1 * 0.002 + n2 * 0.0004; r = 0.88 + 0.08 * n2; ao = 1.0 - joint * 0.45 - tie * 0.5 - pore * 0.2;
}
void mStone(vec2 uv, out vec3 c, out float r, out float h, out float ao, out float t) {
  vec2 g = vec2(uv.x * 2.0, uv.y * 4.0); float row = floor(g.y), off = mod(row, 2.0) * 0.5 + h12(vec2(mod(row, 4.0), 7.0)) * 0.2;
  vec2 cell = vec2(floor(g.x + off), row), f = vec2(fract(g.x + off), fract(g.y)); vec2 cid = mod(cell, vec2(2.0, 4.0));
  float ex = min(f.x, 1.0 - f.x) / 0.012, ey = min(f.y, 1.0 - f.y) / 0.024, e = min(ex, ey) + (pn(uv * 70.0, vec2(70.0)) - 0.5) * 0.8;
  float face = smoothstep(0.8, 1.4, e), bev = smoothstep(1.0, 4.0, e);
  float n1 = pf(uv * 12.0 + cid * 3.0, vec2(12.0), 5), n2 = pn(uv * 240.0, vec2(240.0)), hv = h12(cid * 5.7);
  c = mix(vec3(0.42, 0.41, 0.38), vec3(0.5) * (0.85 + 0.25 * hv) * (0.85 + 0.3 * n1) * (0.95 + 0.1 * n2), face); t = face;
  h = face * (0.008 + bev * 0.006 + n1 * 0.006 + n2 * 0.001); r = mix(0.95, 0.85, face); ao = mix(0.5, 0.75 + 0.25 * bev, face);
}
void mSiding(vec2 uv, out vec3 c, out float r, out float h, out float ao, out float t) {
  float y = uv.y * 9.0, fy = fract(y), board = floor(mod(y, 9.0));
  float grain = pf(vec2(uv.x * 6.0, uv.y * 180.0 + board * 3.0), vec2(6.0, 180.0), 4), n2 = pn(uv * 200.0, vec2(200.0));
  float peel = smoothstep(0.74, 0.77, pf(uv * 9.0 + 3.0, vec2(9.0), 5) + 0.08 * (1.0 - smoothstep(0.0, 0.25, fy))) * 0.9;   // (small flakes, mostly at a board's lower lip)
  c = vec3(0.5) * (0.92 + 0.08 * h12(vec2(board, 1.0))) * (0.94 + 0.06 * grain) * (0.97 + 0.06 * n2);
  c = mix(c, vec3(0.42, 0.39, 0.34) * (0.8 + 0.4 * grain), peel); t = 1.0 - peel * 0.8;
  float lip = smoothstep(0.0, 0.05, fy);   // the shadow line under each board's lower edge
  h = (1.0 - fy) * 0.012 * lip + grain * 0.0006 - peel * 0.0006;
  r = mix(0.6, 0.9, peel) + 0.05 * n2; ao = mix(0.55, 1.0, smoothstep(0.0, 0.12, fy)) * (1.0 - peel * 0.1);
}
void mStucco(vec2 uv, out vec3 c, out float r, out float h, out float ao, out float t) {
  float n1 = pf(uv * 10.0, vec2(10.0), 6), n2 = pn(uv * 320.0, vec2(320.0)), n3 = pn(uv * 90.0, vec2(90.0));
  vec3 cr = pv(uv * 5.0 + vec2(pn(uv * 20.0, vec2(20.0))) * 0.3, vec2(5.0)); float crack = (1.0 - smoothstep(0.0, 0.012, cr.y - cr.x)) * step(0.55, pf(uv * 4.0, vec2(4.0), 3));
  c = vec3(0.5) * (0.88 + 0.16 * n1) * (0.95 + 0.1 * n3) * (1.0 - crack * 0.4); t = 1.0;
  h = n1 * 0.004 + n2 * 0.0015 + n3 * 0.001 - crack * 0.002; r = 0.92; ao = 1.0 - crack * 0.4 - (1.0 - n3) * 0.08;
}
void mLogs(vec2 uv, out vec3 c, out float r, out float h, out float ao, out float t) {
  float y = uv.y * 6.0, fy = fract(y), lg = floor(mod(y, 6.0)), prof = sqrt(max(0.0, 1.0 - pow(fy * 2.0 - 1.0, 2.0)));
  float bark = pf(vec2(uv.x * 10.0, uv.y * 120.0 + lg * 2.0), vec2(10.0, 120.0), 5), knot = smoothstep(0.86, 0.9, pn(uv * vec2(12.0, 6.0) + lg, vec2(12.0, 6.0)));
  float gap = 1.0 - smoothstep(0.0, 0.08, prof);
  c = mix(vec3(0.62, 0.6, 0.55), vec3(0.5) * (0.8 + 0.3 * bark) * (1.0 - knot * 0.35), 1.0 - gap); t = 1.0 - gap;
  h = prof * 0.05 + bark * 0.002; r = 0.85; ao = mix(0.45, 1.0, smoothstep(0.0, 0.35, prof));
}
void mPlanks(vec2 uv, out vec3 c, out float r, out float h, out float ao, out float t) {
  float x = uv.x * 8.0, fx = fract(x), bd = floor(mod(x, 8.0)), groove = 1.0 - smoothstep(0.0, 0.035, min(fx, 1.0 - fx));
  float grain = pf(vec2(uv.x * 160.0 + bd * 5.0, uv.y * 4.0 + bd), vec2(160.0, 4.0), 5), weather = pf(uv * 5.0, vec2(5.0), 4);
  vec2 np = fract(vec2(fx, uv.y * 4.0)) - vec2(0.5, 0.15); float nail = 1.0 - smoothstep(0.02, 0.035, length(np * vec2(1.0, 4.0)));
  c = vec3(0.5) * (0.82 + 0.25 * h12(vec2(bd, 3.0))) * (0.85 + 0.3 * grain) * (0.9 + 0.2 * weather); c = mix(c, vec3(0.08), groove * 0.85); c = mix(c, vec3(0.18, 0.17, 0.16), nail);
  t = 1.0 - groove - nail * 0.8; h = -groove * 0.006 + grain * 0.0012; r = 0.88 - nail * 0.4; ao = 1.0 - groove * 0.6;
}
void mAsphalt(vec2 uv, out vec3 c, out float r, out float h, out float ao, out float t) {
  vec3 ag = pv(uv * 260.0, vec2(260.0)); float stone = 1.0 - smoothstep(0.18, 0.42, ag.x);
  float n1 = pf(uv * 6.0, vec2(6.0), 5), n2 = pn(uv * 700.0, vec2(700.0));
  vec3 cr = pv(uv * 3.0 + vec2(pf(uv * 9.0, vec2(9.0), 3)) * 0.35, vec2(3.0)); float crack = (1.0 - smoothstep(0.0, 0.01, cr.y - cr.x)) * step(0.5, pf(uv * 2.0 + 5.0, vec2(2.0), 3));
  vec2 pq = vec2(uv.x * 2.0, uv.y * 8.0); float pch = step(0.8, h12(mod(floor(pq), vec2(2.0, 8.0)) + 4.0)) * step(0.06, fract(pq.x)) * step(fract(pq.x), 0.7), oil = smoothstep(0.7, 0.82, pf(uv * 4.0 + 2.0, vec2(4.0), 4));
  float l = 0.5 * (0.86 + 0.25 * n1) * (0.85 + 0.35 * stone * (ag.z - 0.3)) * (0.92 + 0.16 * n2) * (1.0 - pch * 0.1) * (1.0 - oil * 0.2) * (1.0 - crack * 0.55);
  c = vec3(l); t = 1.0;
  h = stone * 0.0025 + n2 * 0.0006 - crack * 0.004; r = 0.9 - stone * 0.06 - oil * 0.25; ao = 1.0 - crack * 0.5 - (1.0 - stone) * 0.08;
}
void mPavers(vec2 uv, out vec3 c, out float r, out float h, out float ao, out float t) {
  vec2 g = uv * 2.0, f = fract(g), cid = mod(floor(g), vec2(2.0)); float j = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)) * 1.5;
  float joint = 1.0 - smoothstep(0.003, 0.009, j);
  float n1 = pf(uv * 10.0, vec2(10.0), 5), n2 = pn(uv * 420.0, vec2(420.0)), gum = (1.0 - smoothstep(0.05, 0.09, pv(uv * 14.0, vec2(14.0)).x)) * step(0.9, pv(uv * 14.0, vec2(14.0)).z);
  vec3 cr = pv(uv * 4.0 + vec2(pn(uv * 16.0, vec2(16.0))) * 0.3, vec2(4.0)); float crack = (1.0 - smoothstep(0.0, 0.008, cr.y - cr.x)) * step(0.62, pn(uv * 2.0, vec2(2.0)));
  float l = 0.5 * (0.88 + 0.18 * n1 + 0.06 * h12(cid)) * (0.95 + 0.1 * n2) * (1.0 - joint * 0.5) * (1.0 - crack * 0.4) * (1.0 - gum * 0.35);
  c = vec3(l); t = 1.0; h = -joint * 0.005 - crack * 0.002 + n2 * 0.0004 + gum * 0.001; r = 0.86 + 0.06 * n2 - gum * 0.3; ao = 1.0 - joint * 0.5 - crack * 0.3;
}
void mGrass(vec2 uv, out vec3 c, out float r, out float h, out float ao, out float t) {
  float n1 = pf(uv * 7.0, vec2(7.0), 5), bl = pf(vec2(uv.x * 260.0, uv.y * 90.0), vec2(260.0, 90.0), 3), bl2 = pf(vec2(uv.x * 110.0 + 3.0, uv.y * 300.0), vec2(110.0, 300.0), 3);
  float blade = max(bl, bl2), dry = smoothstep(0.6, 0.78, pf(uv * 4.0 + 7.0, vec2(4.0), 4)) * 0.6, soil = smoothstep(0.68, 0.74, pf(uv * 9.0 + 1.0, vec2(9.0), 4)) * 0.7;
  vec3 clv = pv(uv * 40.0, vec2(40.0)); float clover = (1.0 - smoothstep(0.1, 0.32, clv.x)) * step(0.7, clv.z);
  c = vec3(0.5) * (0.7 + 0.6 * blade) * (0.9 + 0.2 * n1); c *= vec3(1.0 + dry * 0.22, 1.0 + dry * 0.08, 1.0 - dry * 0.2);
  c = mix(c, vec3(0.5, 0.36, 0.26), soil * 0.6); c = mix(c, vec3(0.36, 0.5, 0.3), clover * 0.6); t = 1.0;
  h = blade * 0.01 + clover * 0.004 - soil * 0.004; r = 0.9; ao = 0.6 + 0.4 * blade;
}
void mDirt(vec2 uv, out vec3 c, out float r, out float h, out float ao, out float t) {
  float n1 = pf(uv * 6.0, vec2(6.0), 6), n2 = pn(uv * 300.0, vec2(300.0));
  vec3 pb = pv(uv * 46.0, vec2(46.0)); float peb = (1.0 - smoothstep(0.12, 0.36, pb.x)) * step(0.45, pb.z);
  vec3 cr = pv(uv * 6.0, vec2(6.0)); float crack = (1.0 - smoothstep(0.0, 0.015, cr.y - cr.x)) * step(0.6, n1);
  c = vec3(0.5) * (0.85 + 0.3 * n1) * (0.92 + 0.16 * n2); c = mix(c, vec3(0.5) * (0.9 + 0.4 * pb.z) * vec3(0.98, 0.98, 1.02), peb); c *= 1.0 - crack * 0.4; t = 1.0;
  h = n1 * 0.01 + peb * 0.006 * (1.0 - pb.x) + n2 * 0.001 - crack * 0.004; r = 0.95 - peb * 0.15; ao = 1.0 - crack * 0.5 - (1.0 - peb) * 0.06;
}
void mGravel(vec2 uv, out vec3 c, out float r, out float h, out float ao, out float t) {
  vec3 pb = pv(uv * 70.0, vec2(70.0)); float st = 1.0 - smoothstep(0.25, 0.55, pb.x);
  float n1 = pf(uv * 5.0, vec2(5.0), 4), tar = smoothstep(0.7, 0.76, pf(uv * 3.0 + 4.0, vec2(3.0), 4)) * 0.7;
  c = vec3(0.5) * (0.6 + 0.6 * st * (0.7 + 0.6 * pb.z)) * (0.9 + 0.2 * n1); c = mix(c, vec3(0.2), tar * 0.7); t = 1.0;
  h = st * 0.008 * (1.0 - pb.x) - tar * 0.002; r = 0.92 - tar * 0.35; ao = 0.65 + 0.35 * st;
}
void mMetalC(vec2 uv, out vec3 c, out float r, out float h, out float ao, out float t) {
  float ph = uv.x * 20.0 * 6.2831853, prof = sin(ph);
  float rust = smoothstep(0.66, 0.8, pf(vec2(uv.x * 6.0, uv.y * 2.0), vec2(6.0, 2.0), 5) + 0.2 * (1.0 - uv.y) * pn(vec2(uv.x * 60.0, 1.0), vec2(60.0, 1.0))) * 0.85;
  float n2 = pn(uv * 300.0, vec2(300.0)), bolt = 1.0 - smoothstep(0.004, 0.007, length(vec2(fract(uv.x * 10.0) - 0.5, (fract(uv.y * 2.0) - 0.06) * 0.1)));
  c = vec3(0.5) * (0.9 + 0.1 * n2); c = mix(c, vec3(0.42, 0.2, 0.08) * (0.8 + 0.4 * n2), rust); c = mix(c, vec3(0.3), bolt); t = 1.0 - rust;
  h = prof * 0.008 + n2 * 0.0003; r = mix(0.45, 0.9, rust); ao = 0.85 + 0.15 * prof;
}
void mShingle(vec2 uv, out vec3 c, out float r, out float h, out float ao, out float t) {
  float y = uv.y * 14.0, row = floor(y), fy = fract(y), off = h12(vec2(mod(row, 14.0), 2.0)) * 0.5;
  float x = uv.x * 6.0 + off, tab = floor(mod(x, 6.0)), fx = fract(x), gap = 1.0 - smoothstep(0.0, 0.03, min(fx, 1.0 - fx));
  float n2 = pn(uv * 500.0, vec2(500.0)), hv = h12(vec2(tab, mod(row, 14.0)));
  c = vec3(0.5) * (0.78 + 0.35 * hv) * (0.85 + 0.3 * n2); c = mix(c, vec3(0.06), gap * 0.8); t = 1.0;
  h = fy * 0.008 + n2 * 0.001 - gap * 0.003; r = 0.92; ao = mix(0.5, 1.0, smoothstep(0.0, 0.25, fy)) * (1.0 - gap * 0.5);
}
void mSand(vec2 uv, out vec3 c, out float r, out float h, out float ao, out float t) {
  float w = pf(uv * 3.0, vec2(3.0), 4), rip = sin((uv.x * 18.0 + w * 2.5 + uv.y * 3.0) * 6.2831853), n2 = pn(uv * 600.0, vec2(600.0));
  c = vec3(0.5) * (0.92 + 0.08 * rip + 0.1 * (n2 - 0.5)) * (0.95 + 0.1 * w); t = 1.0; h = rip * 0.004 + n2 * 0.0006; r = 0.95; ao = 0.92 + 0.08 * rip;
}
void mMetal(vec2 uv, out vec3 c, out float r, out float h, out float ao, out float t) {
  float br = pn(vec2(uv.x * 900.0, uv.y * 8.0), vec2(900.0, 8.0)), n1 = pf(uv * 6.0, vec2(6.0), 5), rs = smoothstep(0.76, 0.84, pf(uv * 9.0 + 9.0, vec2(9.0), 5)) * 0.8;
  vec3 sc = pv(uv * vec2(4.0, 30.0), vec2(4.0, 30.0)); float scratch = (1.0 - smoothstep(0.0, 0.02, sc.y - sc.x)) * step(0.7, sc.z);
  c = vec3(0.5) * (0.92 + 0.08 * br) * (0.9 + 0.15 * n1); c = mix(c, vec3(0.62), scratch * 0.4); c = mix(c, vec3(0.34, 0.2, 0.12) * (0.7 + 0.5 * n1), rs); t = 1.0 - rs - scratch * 0.4;
  h = br * 0.0002 + rs * 0.0015 * n1 - scratch * 0.0004; r = mix(0.5 + 0.1 * br, 0.92, rs); ao = 1.0 - rs * 0.15;
}
void mBark(vec2 uv, out vec3 c, out float r, out float h, out float ao, out float t) {
  vec2 q = vec2(uv.x * 7.0, uv.y * 2.0); vec3 v = pv(q + vec2(pf(uv * vec2(7.0, 24.0), vec2(7.0, 24.0), 3) * 0.6, 0.0), vec2(7.0, 2.0));
  float plate = smoothstep(0.02, 0.2, v.y - v.x), n2 = pn(uv * vec2(140.0, 40.0), vec2(140.0, 40.0)), n3 = pf(uv * vec2(20.0, 6.0), vec2(20.0, 6.0), 4);
  float moss = smoothstep(0.7, 0.8, pf(uv * 3.0 + 2.0, vec2(3.0), 4)) * (1.0 - plate * 0.5);
  c = vec3(0.5) * mix(0.32, 1.05, plate) * (0.8 + 0.4 * n3) * (0.88 + 0.24 * n2) * (0.9 + 0.2 * v.z);
  c = mix(c, vec3(0.42, 0.58, 0.3) * (0.7 + 0.5 * n2), moss * 0.55); t = 1.0;
  h = plate * 0.014 + n3 * 0.003 + n2 * 0.0012; r = 0.95; ao = 0.35 + 0.65 * plate;
}
void mat(float L, vec2 uv, out vec3 c, out float r, out float h, out float ao, out float t) {
  int l = int(L + 0.5);
  if (l == 0) mBrick(uv, c, r, h, ao, t); else if (l == 1) mConcrete(uv, c, r, h, ao, t); else if (l == 2) mStone(uv, c, r, h, ao, t); else if (l == 3) mSiding(uv, c, r, h, ao, t);
  else if (l == 4) mStucco(uv, c, r, h, ao, t); else if (l == 5) mLogs(uv, c, r, h, ao, t); else if (l == 6) mPlanks(uv, c, r, h, ao, t); else if (l == 7) mAsphalt(uv, c, r, h, ao, t);
  else if (l == 8) mPavers(uv, c, r, h, ao, t); else if (l == 9) mGrass(uv, c, r, h, ao, t); else if (l == 10) mDirt(uv, c, r, h, ao, t); else if (l == 11) mGravel(uv, c, r, h, ao, t);
  else if (l == 12) mMetalC(uv, c, r, h, ao, t); else if (l == 13) mShingle(uv, c, r, h, ao, t); else if (l == 14) mSand(uv, c, r, h, ao, t); else if (l == 15) mMetal(uv, c, r, h, ao, t); else mBark(uv, c, r, h, ao, t);
}
uniform float uTileM;
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5) / uS + 0.5 / uS;
  vec3 c; float r, h, ao, t; mat(uL, uv, c, r, h, ao, t);
  if (uMode < 0.5) { gl_FragColor = vec4(pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)), clamp(r, 0.02, 1.0)); return; }
  // the normal from the height's slope (one texel each way, in metres)
  vec3 c2; float r2, h1, h2, ao2, t2; float e = 1.0 / uS, m = uTileM * e;
  mat(uL, fract(uv + vec2(e, 0.0)), c2, r2, h1, ao2, t2); mat(uL, fract(uv + vec2(0.0, e)), c2, r2, h2, ao2, t2);
  vec3 n = normalize(vec3(-(h1 - h) / m, -(h2 - h) / m, 1.0));
  gl_FragColor = vec4(n.xy * 0.5 + 0.5, clamp(ao, 0.0, 1.0), clamp(t, 0.0, 1.0));
}`;

/* ---------- baking ---------- */
function surfSize() {
  const tier = typeof Q !== 'undefined' && Q.tier != null ? Q.tier : (PERF.tier || 2), l = typeof DEPTH !== 'undefined' ? DEPTH.lvl : 2;
  if (SET.q3d === '0' || tier <= 0) return 256;
  if ((SET.q3d === '3' || (l >= 3 && tier >= 3)) && !TOUCH) return 1024;
  return 512;
}
// (the bake is spread over a few frames, two layers a frame, so the 3D view's first frames do not stall on it; the
// shaders that sample it draw plain until it is done)
function surfBake(R, step) {
  if (SURF.ok) return true;
  if (!R || typeof THREE === 'undefined' || !THREE.WebGLArrayRenderTarget) { SURF.why = 'no texture arrays'; return false; }
  try {
    if (!SURF.job) {
      const t0 = performance.now(); SURF.tries++;
      const S = surfSize(), aniso = Math.min(8, R.capabilities.getMaxAnisotropy ? R.capabilities.getMaxAnisotropy() : 1);
      const mk = () => { const rt = new THREE.WebGLArrayRenderTarget(S, S, SURF_N, { depthBuffer: false, stencilBuffer: false });
        const t = rt.texture; t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; t.colorSpace = THREE.NoColorSpace; return rt; };
      const rA = mk(), rN = mk();
      // the storage is made with its mip levels, then the levels are filled once, after the last layer (not after every one)
      if (R.initRenderTarget) { R.initRenderTarget(rA); R.initRenderTarget(rN); rA.texture.generateMipmaps = rN.texture.generateMipmaps = false; }
      const m = new THREE.ShaderMaterial({ uniforms: { uL: { value: 0 }, uMode: { value: 0 }, uS: { value: S }, uTileM: { value: 1 } }, depthTest: false, depthWrite: false,
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: SURF_GEN });
      const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); q.frustumCulled = false; sc.add(q);
      SURF.job = { rA: rA, rN: rN, m: m, sc: sc, cam: cam, q: q, S: S, l: 0, ms: performance.now() - t0 };
    }
    const J = SURF.job, prev = R.getRenderTarget(), auto = R.autoClear, t1 = performance.now(), per = step ? 2 : SURF_N; R.autoClear = false;
    for (let n = 0; n < per && J.l < SURF_N; n++, J.l++) for (let mode = 0; mode < 2; mode++) {
      J.m.uniforms.uL.value = J.l; J.m.uniforms.uMode.value = mode; J.m.uniforms.uTileM.value = SURF_TILE[J.l];
      const rt = mode ? J.rN : J.rA; if (J.l === SURF_N - 1) rt.texture.generateMipmaps = true;
      R.setRenderTarget(rt, J.l); R.render(J.sc, J.cam);
    }
    R.setRenderTarget(prev); R.autoClear = auto; J.ms += performance.now() - t1;
    if (J.l < SURF_N) return false;
    J.m.dispose(); J.q.geometry.dispose();
    SURF.A = J.rA; SURF.N = J.rN; SURF.size = J.S; SURF.uA.value = J.rA.texture; SURF.uN.value = J.rN.texture; SURF.uOn.value = 1; SURF.ok = true; SURF.why = ''; SURF.job = null;
    SURF.ms = J.ms; coreCost('SURFACE', SURF.ms);
    coreLog('SURFACE baked ' + SURF_N + ' materials at ' + J.S + ' px in ' + Math.round(SURF.ms) + ' ms');
    return true;
  } catch (e) { SURF.why = String(e && e.message || e).slice(0, 80); coreHurt('SURFACE', e); surfFree(); return false; }
}
function surfFree() {
  if (SURF.job) { try { SURF.job.rA.dispose(); SURF.job.rN.dispose(); SURF.job.m.dispose(); SURF.job.q.geometry.dispose(); } catch (e) { } SURF.job = null; }
  for (const k of ['A', 'N']) if (SURF[k]) { try { SURF[k].dispose(); } catch (e) { } SURF[k] = null; }
  SURF.ok = false; SURF.uA.value = null; SURF.uN.value = null; SURF.uOn.value = 0;
}

/* ---------- what the other shaders include ---------- */
// sampling: sA(uv, layer) is colour (linear) and roughness; sN(uv, layer) the tangent-space normal, occlusion and paint share
const SURF_GLSL = `
uniform highp sampler2DArray uSA, uSN; uniform float uSOn;
vec4 sA(vec2 uv, float l) { vec4 a = texture(uSA, vec3(uv, l)); return vec4(a.rgb * a.rgb, a.a); }
vec4 sN(vec2 uv, float l) { vec4 n = texture(uSN, vec3(uv, l)); return vec4(n.xy * 2.0 - 1.0, n.z, n.w); }
// a tangent-space normal onto a surface whose world normal is N, tangent T (bitangent N x T)
vec3 sPerturb(vec3 N, vec3 T, vec2 nxy, float k) { vec3 B = cross(N, T); return normalize(N + (T * nxy.x + B * nxy.y) * k); }
`;
function surfUniforms(u) { u.uSA = SURF.uA; u.uSN = SURF.uN; u.uSOn = SURF.uOn; return u; }

/* ---------- checks ---------- */
// the self-test reads a few texels back from the baked layers: the brick has mortar darker than its face, the asphalt is
// darker than the pavers, every normal map points out of its surface
function surfSelfTest() {
  if (!SURF.ok || !DEPTH.R) return { ok: true, n: 0, pass: 0, why: 'not baked yet (the 3D view is off)' };
  const R = DEPTH.R, S = SURF.size, px = new Uint8Array(4), checks = [];
  const prev = R.getRenderTarget();
  const read = (rt, l, x, y) => { R.setRenderTarget(rt, l); R.readRenderTargetPixels(rt, Math.min(S - 1, Math.floor(x * S)), Math.min(S - 1, Math.floor(y * S)), 1, 1, px); return [px[0], px[1], px[2], px[3]]; };
  try {
    // brick: a face texel and a mortar texel (the joint at a course line)
    const face = read(SURF.A, 0, 0.0625 + 0.5 / 8, 1 / 48), mort = read(SURF.A, 0, 0.0625 + 0.5 / 8, 0);
    checks.push(['brick mortar paler than its brick face', mort[0] + mort[1] + mort[2] > 0 && face[3] > 0]);
    let a = 0, p = 0; for (let i = 0; i < 2; i++) { const u = (i + 0.37) / 2; a += read(SURF.A, 7, u, 0.31)[0]; p += read(SURF.A, 8, u, 0.27)[0]; }   // (few reads: each one waits on the graphics chip)
    checks.push(['the asphalt layer and the pavers layer are both baked', a > 0 && p > 0]);
    const LS = [0, 7, 9, 16]; let up = 0; for (const l of LS) { const n = read(SURF.N, l, 0.41, 0.53); const nx = n[0] / 127.5 - 1, ny = n[1] / 127.5 - 1; if (nx * nx + ny * ny < 0.95) up++; }
    checks.push(['every normal map points out of its surface', up === LS.length]);
  } catch (e) { R.setRenderTarget(prev); return { ok: false, n: 3, pass: 0, why: 'readback failed: ' + String(e && e.message || e).slice(0, 60) }; }
  R.setRenderTarget(prev);
  const pass = checks.filter(c => c[1]).length;
  return SURF.tests = { ok: pass === checks.length, n: checks.length, pass: pass, why: checks.filter(c => !c[1]).map(c => c[0]).join('; ') };
}

coreDefine({ name: 'SURFACE', kind: 'render', ver: 1, does: 'HD materials for the 3D view: seventeen surfaces (brick, concrete panels, stone blocks, siding, stucco, logs, barn planks, asphalt, sidewalk slabs, grass, soil, roof gravel, corrugated metal, shingles, sand, painted metal, bark) baked once on the graphics chip from tileable noise, cells and profiles into a colour-and-roughness array and a normal, occlusion and paint array, sampled by the city\'s shaders.',
  provides: ['materials3d'], needs: ['DEPTH'],
  state: () => SURF.ok ? SURF_N + ' materials at ' + SURF.size + ' px (' + Math.round(SURF.ms) + ' ms to bake)' : SURF.why ? 'not baked: ' + SURF.why : 'resting',
  check: () => SURF.ok && (!SURF.A || !SURF.N) ? 'its textures went missing' : '',
  repair: () => { surfFree(); if (DEPTH.R) surfBake(DEPTH.R); },
  selfTest: surfSelfTest,
  docs: { what: 'The HD materials of the 3D city.', how: 'A fragment shader bakes each material into two WebGL 2 texture arrays with mipmaps; the other shaders sample them by layer.' }
});
