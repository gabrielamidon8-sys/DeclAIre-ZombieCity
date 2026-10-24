/* ================= NIMBUS: the sky of the 3D view, and storms you can watch coming (1.9.9991) =================
   The 3D sky had one flat layer of noise for its clouds, and a storm arrived the moment the weather said so. NIMBUS:
   - Clouds with body: the cumulus layer is warped so it billows instead of tiling, each cloud lit through its own depth
     toward the sun (thick hearts in shade, thin edges bright, a silver lining when you look toward the sun), with high
     cirrus streaks in fair weather above it, lit from inside by lightning close by.
   - Storms on the horizon, the way real ones come: the weather engine now decides what follows the weather you are in,
     so when a thunderstorm, a squall line or showers are next, their towers rise far upwind (cumulonimbus kilometres
     high with their anvils spreading at the top, grey rain shafts hanging under them to the ground) and drift toward you
     on the wind, timed to arrive as the weather turns. Lightning flickers inside them and forks to the ground; the
     thunder comes after the flash, as late as the distance says (a second for every 343 metres), duller and longer the
     farther it rolled, from its side. As one comes on, the sky darkens, its anvil swallows the sun, the wind picks up
     ahead of it; overhead it is the storm's ceiling, then it passes on and the light comes back behind it.
   - Summer afternoons and nights have distant storms that never come: towers on the horizon, heat lightning, a rumble.
   Everything here is the sky's: the rain where you stand is still the weather engine's. Each player watches their own
   towers (the weather systems they follow are the host's). On the weakest 3D level the towers stay off. */
const NIMBUS = { ok: false, towers: [], appr: null, mat: null, t: 0, farT: 20, flashes: 0, rumbles: 0, dark: 0, occl: 0, sky: 0, outflow: 0, tests: null };
const NB_STORMY = { storm: 'storm', cold: 'line', showers: 'shower' };
function nbAng(a, b) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }

/* ---------- the shader ---------- */
const NB_FRAG = `uniform sampler2D uNoise; uniform float uTime, uCover, uDark, uNight, uQ, uNT, uFlashSky; uniform vec3 uSun, uSunC, uSkyC, uFogC; uniform vec2 uWind;
  uniform vec4 uTw[4]; uniform vec4 uTv[4]; varying vec3 vDir;
  float cf(vec2 p) { vec4 a = texture2D(uNoise, p), b = texture2D(uNoise, p * 3.7 + 0.31), c = texture2D(uNoise, p * 9.3 + 0.7); return a.r * 0.5 + a.g * 0.22 + b.b * 0.17 + c.a * 0.11; }
  float cf2(vec2 p) { vec4 a = texture2D(uNoise, p); return a.r * 0.6 + a.b * 0.4; }
  // the puffs of a cumulus tower: the way from the nearest puff's middle (xy) and how far (z), in cells
  vec3 puff(vec2 p) { vec2 i = floor(p), f = fract(p); float d1 = 9.0; vec2 o1 = vec2(0.0);
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)), h = i + g; vec2 o = fract(sin(vec2(dot(h, vec2(127.1, 311.7)), dot(h, vec2(269.5, 183.3)))) * 43758.5453); vec2 r = g + o - f; float d = dot(r, r); if (d < d1) { d1 = d; o1 = r; } }
    return vec3(-o1, sqrt(d1)); }
  float dens(vec2 uv, float th) { vec2 w = vec2(cf2(uv * 0.45 + 0.17), cf2(uv * 0.45 + 0.61)) - 0.5; float n = cf(uv + w * 0.2 * uQ); return smoothstep(th, th + 0.18 + uCover * 0.12, n); }
  // a storm's tower: a: the way to it (x, z), how far (km), how wide (km); b: its top (km), its anvil (0..1), a flash, its rain
  vec4 tower(vec3 d, vec4 a, vec4 b) {
    float hl = length(d.xz); if (hl < 1e-4) return vec4(0.0);
    vec2 hd = d.xz / hl; float ca = dot(hd, a.xy); if (ca < 0.25) return vec4(0.0);
    float sa = hd.x * a.y - hd.y * a.x, D = a.z, R = a.w, L = D * sa, Y = D * ca * d.y / hl, aL = abs(L), base = 1.05 + 0.1 * sin(L * 1.7 + a.x * 5.0), top = b.x;
    // its outline: a column of cauliflower lobes (big ones and small on them), the anvil spreading flat at the top
    float yb = clamp((Y - base) / max(0.5, top - base), -0.2, 1.3);
    float nb = cf(vec2(L * 0.32, Y * 0.32) + a.xy * 7.0), ns = cf(vec2(L, Y) * 1.1 + 3.1);
    float lobe = abs(sin(Y * 1.9 + nb * 4.0 + a.y * 3.0));   // (the cauliflower: puffs stacked up the sides)
    float wBody = R * (0.8 + 0.2 * sin(clamp(yb, 0.0, 1.0) * 3.0)) * (0.74 + 0.3 * nb + 0.1 * ns + 0.14 * lobe);
    float anv = smoothstep(0.66, 0.92, yb) * b.y;
    float wA = R * (1.0 + 1.7 * b.y) * (0.9 + 0.16 * nb + 0.06 * ns);
    float w = mix(wBody, wA, anv), q = clamp(aL / max(w, 0.1), 0.0, 1.0);
    float dome = sqrt(max(0.0, 1.0 - q * q));
    float topY = top - 0.45 * anv * q * q + 0.7 * dome * (1.0 - b.y * 0.6) * (1.0 - anv) + 0.35 * (nb - 0.5);
    float feather = 0.035 * R + D * 0.0018;
    float body = (1.0 - smoothstep(w - feather, w, aL)) * smoothstep(base - 0.06, base + 0.12, Y) * (1.0 - smoothstep(topY - 0.15 - D * 0.002, topY, Y));
    // the rain under it: shafts to the ground, streaked, leaning a little with the wind
    float sx = L - (Y - base) * 0.12;
    float shaft = b.w * (1.0 - smoothstep(R * 0.5, R * 0.9, abs(sx) + 0.2 * nb * R)) * (1.0 - smoothstep(base - 0.2, base + 0.05, Y)) * step(-0.05, Y);
    shaft *= 0.6 + 0.4 * cf(vec2(sx * 2.4, Y * 0.1 - uTime * 0.012));
    // its light: a rounded column (the sun's side lit, the far side in the sky's blue, the belly dark), lobes catching it
    // (the puffs: each a rounded bulge, big ones with smaller on them, the crevices between them in shade)
    vec2 bump = vec2(nb - 0.5, ns - 0.5) * 0.6; float crev = 1.0;
    if (uQ > 1.5) {   // (High and up: the puffs; Medium makes do with the noise)
      vec2 wp = vec2(L, Y) + vec2(nb - 0.5, ns - 0.5) * 1.3;
      vec3 pb = puff(vec2(wp.x, wp.y * 0.85) / (0.6 + 0.12 * R + 0.25 * clamp(1.0 - yb, 0.0, 1.0)) + a.xy * 11.0), ps = puff(wp / 0.4 + 5.0);
      bump = pb.xy * 0.9 * (1.0 - smoothstep(0.55, 1.0, pb.z)) + ps.xy * 0.35;
      crev = mix(0.84, 1.0, smoothstep(0.95, 0.45, pb.z)) * mix(0.94, 1.0, smoothstep(0.9, 0.5, ps.z)); }
    float gx = bump.x, gy = bump.y;
    float nx = clamp(L / max(w, 0.1) * 0.8 + gx, -1.0, 1.0), nz = sqrt(max(0.0, 1.0 - nx * nx));
    vec2 el = vec2(a.y, -a.x), Nxz = nx * el - nz * a.xy;
    float ny = 0.5 * smoothstep(0.55, 1.0, yb) + gy * 0.9 - 0.7 * (1.0 - smoothstep(base, base + 1.2, Y));
    vec3 N = normalize(vec3(Nxz.x, ny, Nxz.y)), S = normalize(uSun);
    float dif = clamp(dot(N, S) * 0.75 + 0.3, 0.0, 1.0) * clamp(S.y * 5.0 + 0.4, 0.0, 1.0);
    float rim = pow(max(dot(d, S), 0.0), 5.0) * smoothstep(0.55, 1.0, q) * clamp(S.y * 5.0 + 0.4, 0.0, 1.0);   // (a silver edge with the sun behind it)
    float thick = 0.65 + 0.35 * nz;
    vec3 col = (mix(uSkyC * 0.5 * thick + vec3(0.025, 0.03, 0.045), uSunC * 1.25, dif) + uSunC * rim * 1.2) * crev;
    col *= mix(0.42, 1.0, smoothstep(base - 0.1, base + 1.6, Y)) * (1.0 - uDark * 0.45);
    vec3 sc = mix(vec3(0.13, 0.145, 0.17), vec3(0.22, 0.24, 0.28), dif) * (1.0 - uDark * 0.3);
    col = mix(col, vec3(0.016, 0.018, 0.026) + vec3(0.035, 0.022, 0.01) * (1.0 - clamp(yb, 0.0, 1.0)), uNight * 0.96); sc = mix(sc, vec3(0.01, 0.012, 0.018), uNight * 0.96);
    // lightning inside it, and a fork to the ground when it is strong
    float fl = b.z * (0.4 + 0.6 * ns) * exp(-pow((Y - base - (top - base) * 0.32) / max(1.0, (top - base) * 0.5), 2.0));
    col += vec3(0.72, 0.76, 1.0) * fl * 2.6; sc += vec3(0.5, 0.55, 0.7) * b.z * 0.55;
    float bx = R * 0.2 * sin(Y * 4.0 + a.x * 30.0) + R * 0.07 * sin(Y * 15.0 + a.y * 9.0);
    float bolt = step(0.62, b.z) * (1.0 - smoothstep(D * 0.0011, D * 0.0028, abs(L - bx))) * step(0.0, Y) * (1.0 - step(base, Y));
    float near = smoothstep(R * 1.05, R * 2.3, D), haze = 1.0 - exp(-D / 26.0);
    float A = max(body, shaft * 0.95) * near;
    vec3 C = mix(sc, col, body / max(1e-3, max(body, shaft * 0.95)));
    C = mix(C, uFogC * 1.04, haze * mix(0.68, 0.45, step(body, 0.01)));
    C += vec3(0.9, 0.92, 1.0) * bolt * 3.0; A = max(A, bolt * near);
    return vec4(C, clamp(A, 0.0, 1.0) * (1.0 - haze * 0.25) * smoothstep(-0.03, 0.004, d.y));
  }
  void main() {
    vec3 d = normalize(vDir); if (d.y < -0.02) discard;
    float dy = max(d.y, 0.0);
    // the towers first (they stand behind the layer), farthest first
    vec3 P = vec3(0.0); float A = 0.0;   // (premultiplied, back to front)
    for (int i = 0; i < 4; i++) { if (float(i) >= uNT) break; vec4 t = tower(d, uTw[i], uTv[i]); P = P * (1.0 - t.a) + t.rgb * t.a; A = A * (1.0 - t.a) + t.a; }
    // the cumulus layer, lit through its depth toward the sun
    vec2 uv = d.xz / (dy + 0.09) * 0.16 + uWind * uTime * 0.0015;
    float th = mix(0.66, 0.32, uCover), c = dens(uv, th);
    vec3 lc = vec3(0.0); float la = 0.0;
    if (c > 0.004) {
      vec2 sd = normalize(uSun.xz + 1e-4) * (0.018 + 0.03 * (1.0 - clamp(uSun.y, 0.0, 1.0)));
      float occ = uQ > 0.5 ? dens(uv + sd, th) + 0.6 * dens(uv + sd * 2.2, th) : clamp((c - dens(uv + sd, th)) * -3.0 + 0.6, 0.0, 1.6);
      float lit = exp(-occ * 1.5), edge = 1.0 - smoothstep(0.0, 0.6, c), fwd = pow(max(dot(d, normalize(uSun)), 0.0), 6.0) * clamp(uSun.y * 3.0 + 0.3, 0.0, 1.0);
      lc = mix(uSkyC * 0.72, uSunC, lit * (0.62 + 0.38 * edge)) + uSunC * fwd * edge * 0.85;
      lc *= 1.0 - 0.36 * smoothstep(0.3, 1.0, c) * (1.0 - lit);
      lc = mix(lc, vec3(0.07, 0.075, 0.085) * (0.6 + 0.4 * lit), uDark * 0.85);
      vec3 nightC = vec3(0.018, 0.02, 0.028) + vec3(0.06, 0.035, 0.016) * (1.0 - smoothstep(0.0, 0.35, dy));
      lc = mix(lc, nightC, uNight);
      lc += vec3(0.62, 0.66, 0.82) * uFlashSky * (0.4 + 0.6 * c);
      float hz = smoothstep(0.0, 0.22, dy); lc = mix(uFogC, lc, hz);
      la = c * hz * (0.75 + 0.2 * uCover);
    }
    // high cirrus in fair weather: thin streaks far above, catching the low sun first
    if (uQ > 0.5 && uCover < 0.75) {
      vec2 u2 = d.xz / (dy + 0.035) * 0.045 + uWind * uTime * 0.0004; vec2 r2 = vec2(u2.x * 0.8 + u2.y * 0.6, -u2.x * 0.6 + u2.y * 0.8);
      float ci = smoothstep(0.56, 0.8, cf(vec2(r2.x * 0.35, r2.y * 2.6))) * (1.0 - uCover * 1.2) * (1.0 - uDark) * smoothstep(0.02, 0.2, dy) * 0.42;
      vec3 cc = mix(uSunC * 0.95 + uSkyC * 0.2, vec3(0.02, 0.025, 0.035), uNight);
      P = P * (1.0 - ci) + cc * ci; A = A * (1.0 - ci) + ci;
    }
    P = P * (1.0 - la) + lc * la; A = A * (1.0 - la) + la;
    if (A < 0.004) discard;
    gl_FragColor = vec4(P / max(A, 1e-4), A);
  }`;
function nimbusInit() {
  if (NIMBUS.ok) return true;
  if (!DEPTH.ok || !DEPTH.clouds) return false;
  try {
    const old = DEPTH.clouds.material, u = old.uniforms, V4 = () => new THREE.Vector4(0, 0, 0, 0);
    const m = new THREE.ShaderMaterial({
      uniforms: Object.assign({}, u, { uQ: { value: DEPTH.lvl >= 2 ? 2 : DEPTH.lvl >= 1 ? 1 : 0 }, uNT: { value: 0 }, uFlashSky: { value: 0 }, uTw: { value: [V4(), V4(), V4(), V4()] }, uTv: { value: [V4(), V4(), V4(), V4()] } }),
      side: THREE.BackSide, transparent: true, depthWrite: false, depthTest: true, fog: false,
      vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: NB_FRAG
    });
    DEPTH.clouds.material = m; NIMBUS.mat = m; NIMBUS.old = old;
    NIMBUS.ok = true;
  } catch (e) { coreHurt('NIMBUS', e); NIMBUS.ok = false; }
  return NIMBUS.ok;
}
function nimbusFree() {
  if (NIMBUS.mat && DEPTH.clouds && NIMBUS.old && DEPTH.clouds.material === NIMBUS.mat) { try { DEPTH.clouds.material = NIMBUS.old; NIMBUS.mat.dispose(); } catch (e) { } }
  NIMBUS.mat = null; NIMBUS.old = null; NIMBUS.ok = false; NIMBUS.towers.length = 0; NIMBUS.appr = null;
}

/* ---------- the towers ---------- */
// the pan of a sound from a point: left and right of where the camera looks (3D), or of the screen (top-down)
function nbPan(x, y) {
  const dx = x - cam.x, dy = y - cam.y, d = Math.hypot(dx, dy) || 1;
  if (typeof DEPTH !== 'undefined' && DEPTH.on && HOVER.f3) { const f = HOVER.f3, fl = Math.hypot(f[0], f[2]) || 1; return clamp((dx * -f[2] + dy * f[0]) / (d * fl), -1, 1); }
  return clamp(dx / d, -1, 1);
}
function nbTower(kind, x, y, vx, vy, opt) {
  const R = Math.random, o = opt || {};
  const T = { kind: kind, x: x, y: y, vx: vx, vy: vy, age: 0, life: o.life || 900, seed: R() * 100,
    R: kind === 'storm' ? 2.6 + R() * 1.4 : kind === 'line' ? 2.0 + R() * 0.8 : kind === 'far' ? 2.4 + R() * 2 : 1.2 + R() * 0.6,
    top: kind === 'storm' ? 10.5 + R() * 3 : kind === 'line' ? 8 + R() * 2 : kind === 'far' ? 10 + R() * 4 : 5 + R() * 1.5,
    anv: kind === 'storm' || kind === 'far' ? 0.7 + R() * 0.3 : kind === 'line' ? 0.35 : 0, rain: kind === 'shower' ? 0.55 : 0.85, mat: o.mat == null ? 0.45 : o.mat,
    rate: kind === 'storm' || kind === 'far' ? 0.28 : kind === 'line' ? 0.2 : 0.02, flash: 0, strokes: [], fT: 2 + R() * 4, appr: !!o.appr, passed: false };
  NIMBUS.towers.push(T); return T;
}
// the next weather is stormy: its towers rise upwind, timed to arrive as it begins
function nbApproach() {
  const U = wxU(), left = Math.max(0, (WX.rd || 0) - (WX.rt || 0)), cur = NB_STORMY[WX.kind], next = WX.nextK ? NB_STORMY[WX.nextK] : null;
  const live = NIMBUS.towers.some(t => t.appr && !t.passed);
  if (live) return;
  let kind = null, D = 0, sp = 0;
  if (next && WX.hold < 0 && left < 330 && !cur) { kind = next; D = clamp(left * 70, 6000, 26000); sp = clamp(D / Math.max(25, left), 8, 95); }
  else if (cur && NIMBUS.sys !== WX.kind + ':' + Math.round(WX.rd) && !NIMBUS.towers.some(t => t.appr)) { kind = cur; D = 2200; sp = 9; }   // (already in it: one passing over)
  if (!kind) return;
  const dir = WX.wdir, ca = Math.cos(dir), sa = Math.sin(dir), px = G.p ? G.p.x : cam.x, py = G.p ? G.p.y : cam.y;
  const lat = (Math.random() - 0.5) * 1200, n = kind === 'line' ? 3 : 1;
  for (let i = 0; i < n; i++) {
    const off = kind === 'line' ? (i - 1) * 4200 + lat * 0.3 : lat, x = px - ca * D * U - sa * off * U, y = py - sa * D * U + ca * off * U;
    nbTower(kind, x, y, ca * sp * U, sa * sp * U, { appr: true, mat: kind === 'shower' ? 0.6 : 0.4, life: (D * 2 + 24000) / sp });
  }
  NIMBUS.appr = kind; NIMBUS.sys = (cur || next) + ':' + Math.round(cur ? WX.rd : -1);
}
// a summer storm far off that never comes: on the horizon, crossing
function nbFar(dt) {
  const h = wxHour(), sea = WORLD.season, bio = G.p ? bioAt(G.p.x, G.p.y) : 'city';
  if (NIMBUS.towers.filter(t => t.kind === 'far').length >= 2) return;
  const ok = sea !== 3 && bio !== 'snow' && (h > 13 || h < 3) && (WX.kind === 'fair' || WX.kind === 'heat' || WX.kind === 'clear' || WX.kind === 'sector' || WX.kind === 'showers');
  NIMBUS.farT -= dt; if (!ok || NIMBUS.farT > 0) return;
  NIMBUS.farT = 90 + Math.random() * 200;
  const U = wxU(), a = Math.random() * TAU, D = 22000 + Math.random() * 14000, va = a + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1), sp = 8 + Math.random() * 8, px = G.p ? G.p.x : cam.x, py = G.p ? G.p.y : cam.y;
  nbTower('far', px + Math.cos(a) * D * U, py + Math.sin(a) * D * U, Math.cos(va) * sp * U, Math.sin(va) * sp * U, { mat: 0.8 + Math.random() * 0.2, life: 500 + Math.random() * 400 });
}
// how much a tower darkens the sky at distance D (m): as it comes, under it, and less once it has passed
function nbDark(T, D) { const big = T.kind === 'storm' ? 0.55 : T.kind === 'line' ? 0.45 : T.kind === 'shower' ? 0.22 : 0; return big * T.mat * (T.passed ? wxSmooth(6000, 1500, D) : wxSmooth(9500, 1800, D)); }
function nimbusFrame(dt) {
  if (!DEPTH.ok || !DEPTH.clouds || G.mode === 'title') return;
  if (!NIMBUS.ok && !nimbusInit()) return;
  const U = wxU(), px = G.p ? G.p.x : cam.x, py = G.p ? G.p.y : cam.y, lvl = DEPTH.lvl || 0, m = NIMBUS.mat, u = m.uniforms;
  NIMBUS.t += dt;
  if (SET.weather !== 'off') { try { nbApproach(); nbFar(dt); } catch (e) { coreHurt('NIMBUS', e); } }
  // age, drift, flash; the thunder after the light
  let dark = 0, occl = 0, sky = Math.max(0, NIMBUS.sky - dt * 2.5), outflow = 0;
  const sp = DEPTH.sky ? DEPTH.sky.material.uniforms.sunPosition.value : null, sunAz = sp ? Math.atan2(sp.z, sp.x) : 0, sunEl = sp ? Math.asin(clamp(sp.y, -1, 1)) : 1;
  for (let i = NIMBUS.towers.length - 1; i >= 0; i--) {
    const T = NIMBUS.towers[i]; T.age += dt; T.x += T.vx * dt; T.y += T.vy * dt;
    const dx = (T.x - px) / U, dy = (T.y - py) / U, D = Math.hypot(dx, dy), closing = dx * T.vx + dy * T.vy < 0;
    if (T.appr && !closing && D > T.R * 1000) T.passed = true;
    T.mat += ((T.passed ? 0.7 : 1) - T.mat) * dt * (T.appr ? 0.01 : 0.004);
    T.D = D; T.az = Math.atan2(dy, dx);
    if (T.age > T.life || D > 34000) { NIMBUS.towers.splice(i, 1); continue; }
    // lightning: inside the cloud, now and then a fork to the ground; the thunder follows
    T.fT -= dt;
    if (T.fT <= 0) {
      T.fT = (2 + Math.random() * 7) / Math.max(0.05, T.rate * T.mat * T.mat * 4);
      const vis = !(WX.flash > 0.3);
      if (!(T.D < 1600 && NB_STORMY[WX.kind])) {   // (overhead, the weather engine's own lightning takes over)
        const n = 2 + Math.floor(Math.random() * 3); let t = 0; for (let k = 0; k < n; k++) { T.strokes.push([t, (k ? 0.5 + Math.random() * 0.4 : 1) * (Math.random() < 0.3 ? 1 : 0.72)]); t += 0.05 + Math.random() * 0.06; }
        NIMBUS.flashes++;
        if (D < 21000 && typeof SFX !== 'undefined' && SFX.thunderAt) { SFX.thunderAt(D, nbPan(T.x, T.y)); NIMBUS.rumbles++; }
        void vis;
      }
    }
    let f = 0; for (let k = T.strokes.length - 1; k >= 0; k--) { const s = T.strokes[k]; s[0] -= dt; if (s[0] <= 0) { const ag = -s[0]; f = Math.max(f, s[1] * Math.exp(-ag / 0.07)); if (ag > 0.4) T.strokes.splice(k, 1); } }
    T.flash = Math.max(f, T.flash - dt * 4);
    sky = Math.max(sky, T.flash * clamp(1 - D / 14000, 0, 1) * 0.55);
    // the sky darkens as it comes, stays dark under it, lightens behind it
    dark = Math.max(dark, nbDark(T, D));
    // its anvil over the sun
    if (sp && sunEl > 0 && D > 500) { const hw = Math.atan(T.R * (1 + 2.4 * T.anv) * 1000 / D), te = Math.atan(T.top * 1000 / D), da = Math.abs(nbAng(T.az, sunAz));
      if (da < hw * 1.15 && sunEl < te) occl = Math.max(occl, 0.78 * wxSmooth(hw * 1.15, hw * 0.7, da) * wxSmooth(te, te * 0.85, sunEl) * T.mat); }
    if (!T.passed && T.kind !== 'far' && T.kind !== 'shower') outflow = Math.max(outflow, wxSmooth(5500, 1800, D) * T.mat);
  }
  NIMBUS.dark = dark; NIMBUS.occl = occl; NIMBUS.sky = sky; NIMBUS.outflow = outflow;
  // the uniforms: the four nearest towers, farthest first
  const vis = lvl >= 1 ? NIMBUS.towers.slice().sort((a, b) => a.D - b.D).slice(0, 4).sort((a, b) => b.D - a.D) : [];
  u.uNT.value = vis.length; u.uQ.value = lvl >= 2 ? 2 : lvl >= 1 ? 1 : 0;
  for (let i = 0; i < 4; i++) { const T = vis[i]; if (!T) { u.uTw.value[i].set(0, 0, 0, 0); continue; }
    u.uTw.value[i].set(Math.cos(T.az), Math.sin(T.az), T.D / 1000, T.R); u.uTv.value[i].set(T.top * (0.75 + 0.25 * T.mat), T.anv * T.mat, T.flash, T.rain * T.mat); }
  u.uFlashSky.value = Math.max(WX.flash || 0, sky);
  u.uCover.value = Math.max(u.uCover.value, dark * 1.2); u.uDark.value = Math.max(u.uDark.value, dark * 0.9);
  // the light under it
  if (DEPTH.sun && DEPTH.sun.intensity > 0) DEPTH.sun.intensity *= (1 - occl) * (1 - dark * 0.55);
  if (DEPTH.hemi) DEPTH.hemi.intensity = DEPTH.hemi.intensity * (1 - dark * 0.3) + sky * 0.9;
}
// the self-test: a storm put on the horizon upwind gets its uniforms and arrives; the pan points the right way
function nimbusSelfTest() {
  if (!NIMBUS.ok) return { ok: true, n: 0, pass: 0, why: 'resting (the 3D view is off)' };
  const keep = NIMBUS.towers.slice(), U = wxU(), px = G.p ? G.p.x : cam.x, py = G.p ? G.p.y : cam.y;
  NIMBUS.towers.length = 0;
  const T = nbTower('storm', px + 6000 * U, py, -20 * U, 0, { appr: true, mat: 0.9 });
  let got = true;
  if (DEPTH.ok && DEPTH.clouds && NIMBUS.mat && G.mode !== 'title') { nimbusFrame(0.016); got = T.D > 5000 && NIMBUS.mat.uniforms.uNT.value >= ((DEPTH.lvl || 0) >= 1 ? 1 : 0); }
  const nearer = nbDark(T, 1000) > nbDark(T, 6000) && nbDark(T, 1000) > 0.2;
  NIMBUS.towers.length = 0; for (const t of keep) NIMBUS.towers.push(t);
  const panOk = typeof nbPan === 'function' && isFinite(nbPan(px + 100, py));
  const checks = [['a storm on the horizon reaches the sky shader', got], ['it darkens the sky as it comes', nearer], ['thunder knows which side it came from', panOk]];
  const pass = checks.filter(c => c[1]).length;
  return NIMBUS.tests = { ok: pass === checks.length, n: checks.length, pass: pass, why: checks.filter(c => !c[1]).map(c => c[0]).join('; ') };
}
coreDefine({ name: 'NIMBUS', kind: 'render', ver: 1, does: 'The 3D sky and storms you can watch coming: billowing cumulus lit through its depth toward the sun with silver linings, cirrus streaks high above in fair weather, clouds lit from inside by lightning; the towers of the coming thunderstorm, squall line or showers rising far upwind and drifting in timed to the weather, anvils spreading, rain shafts hanging to the ground, lightning flickering inside and forking down, the thunder arriving as late and as dull as the distance says and from its side, the sky darkening and the anvil swallowing the sun as it comes, then passing on; distant summer storms on the horizon that never come.',
  provides: ['sky3d', 'storms on the horizon'], needs: ['DEPTH', 'WX'],
  state: () => NIMBUS.ok ? NIMBUS.towers.length + ' towers' + (NIMBUS.towers.length ? ' (nearest ' + (Math.min.apply(null, NIMBUS.towers.map(t => t.D || 1e9)) / 1000).toFixed(1) + ' km)' : '') + ' · ' + NIMBUS.flashes + ' flashes, ' + NIMBUS.rumbles + ' rumbles' + (WX.nextK ? ' · next: ' + WX.nextK : '') : 'resting',
  check: () => NIMBUS.ok && DEPTH.clouds && DEPTH.clouds.material !== NIMBUS.mat ? 'its sky material went missing' : '',
  repair: () => { nimbusFree(); },
  selfTest: nimbusSelfTest,
  docs: { what: 'The 3D view\'s clouds and the storms on its horizon.', how: 'One sky-dome shader: a warped, sun-marched cumulus layer and cirrus, and up to four cumulonimbus towers drawn where the view ray passes them (body, anvil, rain shaft, flashes, bolts); the towers are spawned from the weather engine\'s next system, drift on its wind and schedule thunder by distance.' }
});
