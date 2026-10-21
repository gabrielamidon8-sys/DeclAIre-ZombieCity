/* ================= VFXRAY's course (1.9.995): the finishing pass, film, the lens, colour and atmosphere, effects ================= */
curCourse('VFXRAY', { title: 'VFXRAY: the effects', role: 'Finishes every frame: rain, light, the lens, colour, fog, and the effects of a fight.', intro: 'From a compositor\'s finishing tricks to a lens, a colourist and an effects department that work from the physics.' });
// a test frame: render, read back
function curVxGL() { if (!LGR.gl) { lgGLInit(); if (LGR.cv && !LGR.cv.parentNode && typeof document !== 'undefined') { LGR.cv.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(LGR.cv); } } vfxGLInit(); vxlInit(); return !!LGR.gl; }
function curVxCam(w, h, f) { const cam = lgCam(); cam.eye = [0, 0, 1]; cam.tgt = [1, 0, 1]; mimcToCam(cam, mimcBody({ f: f || 50, aspect: w / h })); return cam; }
// a source image for the post chain: the tone ramp (dark to bright across), or a uniform grey
function curVxRamp(w, h, maxX) { const f = lgFBO('cur_ramp', w, h, false); vxlPass(VXL.P.ramp, f, w, h, U => { LGR.gl.uniform1f(U.uMaxX, maxX || 4); }); return f; }
const curLum = (px, i) => 0.2126 * Math.pow(px[i] / 255, 2.2) + 0.7152 * Math.pow(px[i + 1] / 255, 2.2) + 0.0722 * Math.pow(px[i + 2] / 255, 2.2);
curLevel('VFXRAY', {
  v: 1, title: 'The finishing pass', focus: 'Rain in 3D, flashes, sprites, and a compositor\'s post chain (1.9.992).',
  studied: [
    { topic: 'Rain and lightning on film', facts: ['Rain reads only when backlit', 'Lightning is several uneven flashes from different angles', 'Photosensitive safety: no more than three flashes in any second (WCAG 2.3.1)'], src: [['Cinematography.net: lightning effects', 'https://www.cinematography.net/'], ['WCAG 2.1, Three flashes or below threshold', 'https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html']] },
    { topic: 'The post chain', facts: ['Bloom: the bright parts blurred through smaller and smaller copies and added back', 'Anamorphic streaks, chromatic fringing toward the edges, grain, vignette, letterbox bars, flashes, fades'], src: [['Kawase 2003, Frame buffer postprocessing effects (GDC)', 'https://www.gdcvault.com/']] }
  ],
  can: ['Thousands of rain streaks in scene time (slowed and frozen with it), splashes, muzzle flashes, sparks, mist, steam, lightning', 'Bloom, streaks, fringing, grain, vignette, bars, flashes and fades, stepping down when frames run long'],
  exam: X => {
    X.ok('rain: more drops at each quality step', VXQ.every((q, i) => !i || q.rain > VXQ[i - 1].rain), VXQ.map(q => q.rain).join(' < '), 'rising');
    // lightning: flashes in any one second (a flash: the light rising past half after falling under a quarter)
    const count = (rf) => { const was = SET.flash; SET.flash = rf; let n = 0; try { vfxLightning(0, [0, 0, 20], [0, 0, 0]); let low = true; for (let t = 0; t <= 1.0; t += 0.002) { const f = vfxFlashAt(t); if (low && f > 0.5) { n++; low = false; } if (f < 0.25) low = true; } } finally { SET.flash = was; VX.flashPat = null; VX.bolts = []; } return n; };
    X.within('lightning: flashes in the first second', count(false), 1, 3); X.ok('with reduced flashing: a single swell, never past half', count(true) === 0, count(true), 0);
    if (!curVxGL()) { X.ok('WebGL available for the render checks', false, 'none', 'WebGL'); return; }
    const w = 320, h = 200, cam = curVxCam(w, h, 50), S = vxlStage([vxlPlace('vxl_hot', [3, 0, 1])], cam), src = lgFBO('cur_src', w, h, true);
    lgGLScene(S, w, h, src); const before = vxlRead(src, w, h);
    vfxPost(src, w, h, { bloom: 3, bloomK: 1.2, th: 0.3, vig: 0, grain: 0, ca: 0 }, 0); const after = vxlRead(vfxQ().mb ? LGR.fbo.vxout : null, w, h);
    const ring = (px) => { let s = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const r = Math.hypot(x - w / 2, y - h / 2); if (r > 8 && r < 30) s += curLum(px, (y * w + x) * 4); } return s; };
    X.ok('bloom: light spreads round a bright point', ring(after) > ring(before) * 3 + 0.05, ring(before).toFixed(2) + ' -> ' + ring(after).toFixed(2), 'spreads');
    const flat = curVxRamp(w, h, 0.4); vfxPost(flat, w, h, { bloom: 0, vig: 0.55, grain: 0, ca: 0 }, 0); const vg = vxlRead(vfxQ().mb ? LGR.fbo.vxout : null, w, h);
    const top = curLum(vg, ((h - 3) * w + (w >> 1)) * 4), mid = curLum(vg, ((h >> 1) * w + (w >> 1)) * 4);
    X.ok('vignette: the edge darker than the middle (same tone)', top < mid * 0.95, (top / mid * 100).toFixed(0) + '% of the middle', 'under 95%');
  }
});
curLevel('VFXRAY', {
  v: 2, title: 'Film', focus: 'The look of film stock: halation, a filmic shoulder, a split tone (1.9.993).',
  studied: [
    { topic: 'Film\'s look', facts: ['Halation: light scattering back through the film base makes a warm red fringe round bright things', 'A filmic shoulder rolls highlights off instead of clipping them', 'Split toning: cool shadows, warm highlights (the teal and orange of many grades)'], src: [['Kodak: halation and antihalation backing', 'https://www.kodak.com/'], ['Hable 2010, Filmic tonemapping operators', 'http://filmicworlds.com/blog/filmic-tonemapping-operators/']] }
  ],
  can: ['A warm fringe round the bright things, a soft shoulder, cool shadows and warm highlights'],
  exam: X => {
    if (!curVxGL()) { X.ok('WebGL available', false, 'none', 'WebGL'); return; }
    const w = 256, h = 64, src = curVxRamp(w, h, 1), read = (o) => { vfxPost(src, w, h, Object.assign({ bloom: 0, vig: 0, grain: 0, ca: 0 }, o), 0); return vxlRead(vfxQ().mb ? LGR.fbo.vxout : null, w, h); };
    const plain = read({}), tone = read({ shd: [-0.03, 0.0, 0.04], hil: [0.05, 0.015, -0.04] }), sh = read({ tone: 1 });
    const at = (px, x) => { const i = ((h >> 1) * w + x) * 4; return [px[i], px[i + 1], px[i + 2]]; };
    const d = at(tone, 6), b = at(tone, w - 20);
    X.ok('split tone: shadows lean blue', d[2] > d[0], 'R ' + d[0] + ' B ' + d[2], 'B > R'); X.ok('split tone: highlights lean warm', b[0] > b[2], 'R ' + b[0] + ' B ' + b[2], 'R > B');
    X.ok('filmic shoulder: highlights compressed', at(sh, w - 10)[1] < at(plain, w - 10)[1], at(plain, w - 10)[1] + ' -> ' + at(sh, w - 10)[1], 'lower');
  }
});
curLevel('VFXRAY', {
  v: 3, title: 'The lens', focus: 'What the camera really records: depth of field, motion blur from the shutter, natural vignetting.',
  studied: [
    { topic: 'Depth of field in a render', facts: ['Each pixel\'s blur circle from the thin lens: c = A f |d - s| / (d (s - f)), converted to pixels by the sensor\'s height', 'Scatter as gather: each pixel collects the light of the neighbours whose blur discs reach it, each spread evenly over its disc, light added in linear values', 'A sharp thing in front must hide what is behind it; a blurred thing in front spills over (Jimenez 2014, Next generation post processing in Call of Duty: Advanced Warfare)'], src: [['Potmesil and Chakravarty 1981', 'https://doi.org/10.1145/965161.806817'], ['Jimenez 2014, Next generation post processing (SIGGRAPH course)', 'https://www.iryoku.com/next-generation-post-processing-in-call-of-duty-advanced-warfare']] },
    { topic: 'Motion blur and vignetting', facts: ['The shutter is open for (angle / 360) of a frame: the streak is that share of the frame\'s motion', 'Camera motion blur by reprojecting each pixel\'s depth into the previous frame (Rosado 2007, GPU Gems 3 ch. 27)', 'Natural vignetting falls as cos^4 of the angle off the lens\'s axis'], src: [['Rosado 2007, Motion blur as a post-processing effect (GPU Gems 3)', 'https://developer.nvidia.com/gpugems/gpugems3/part-iv-image-effects/chapter-27-motion-blur-post-processing-effect'], ['Cos^4 law (Wikipedia: Vignetting)', 'https://en.wikipedia.org/wiki/Vignetting']] }
  ],
  can: ['Depth of field from MIMATIC\'s lens, out-of-focus points opening into discs of the right size', 'Motion blur from the shutter angle', 'The lens\'s own vignetting'],
  exam: X => {
    if (!curVxGL()) { X.ok('WebGL available', false, 'none', 'WebGL'); return; }
    const w = 640, h = 400, cam = curVxCam(w, h, 85), lens = mimcBody({ f: 85, N: 1.4, focus: 4, aspect: w / h }); mimcToCam(cam, lens);
    const ds = [2, 3, 4, 6, 9], pos = ds.map((d, i) => [d, (i - 2) * 0.09 * d / 2, 1]), S = vxlStage(pos.map(p => vxlPlace('vxl_bead', p)), cam), out = lgFBO('vxl_final', w, h, false), sp = {};
    for (const dof of [false, true]) { vxlRender(S, w, h, { lens: lens, dof: dof, dofMax: 48, out: out }); const px = vxlRead(out, w, h); sp[dof] = pos.map(p => { const q = mimcProject(cam, p, w / h); return vxlSpot(px, w, h, Math.round((q.x * 0.5 + 0.5) * w), Math.round((q.y * 0.5 + 0.5) * h), 40); }); }
    const g = mimcGate('s35', w / h), got = [], want = [];
    ds.forEach((d, i) => { const a = sp[false][i], b = sp[true][i]; got.push(2 * Math.SQRT2 * Math.sqrt(Math.max(0, b.rms * b.rms - a.rms * a.rms))); want.push(mimcCoCpx(mimcCoC(85, 1.4, 4, d), g.h, h)); });
    X.curve('depth of field: blur measured on the render (px), points at 2, 3, 4, 6, 9 m', got); X.curve('blur the lens formula predicts (px)', want);
    let worst = 0; ds.forEach((d, i) => { if (want[i] > 5) worst = Math.max(worst, Math.abs(got[i] / want[i] - 1)); });
    X.within('out-of-focus points: measured blur against the formula (worst error, %)', worst * 100, 0, 20, '%'); X.within('the point in focus stays sharp (px)', got[2], 0, 5, ' px');
    // motion blur: the camera turning at 20 degrees a second, a point in the middle, a 180-degree shutter at 24 fps
    const cam2 = curVxCam(w, h, 50), S2 = vxlStage([vxlPlace('vxl_bead', [5, 0, 1])], cam2); lgCamUpd(cam2, w / h); const prev = lgCam(); Object.assign(prev, cam2, { V: lgM4(), P: lgM4(), VP: lgM4() }); const om = 20 / CUR_DEG / 24; prev.tgt = [Math.cos(-om) * 1, Math.sin(-om) * 1, 1]; prev.eye = [0, 0, 1]; lgCamUpd(prev, w / h);
    const res = []; for (const mb of [false, true]) { vxlRender(S2, w, h, { lens: mimcBody({ f: 50, shutter: 180, aspect: w / h }), mb: mb, prevVP: prev.VP, out: out }); const px = vxlRead(out, w, h); let s = 0, sx = 0, sxx = 0, sy = 0, syy = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const l = curLum(px, (y * w + x) * 4); if (l < 0.0015) continue; s += l; sx += l * x; sxx += l * x * x; sy += l * y; syy += l * y * y; } res.push([sxx / s - Math.pow(sx / s, 2), syy / s - Math.pow(sy / s, 2)]); }
    const L = Math.sqrt(Math.max(0, 12 * ((res[1][0] - res[0][0]) - (res[1][1] - res[0][1])))), fpx = h / 2 / Math.tan(cam2.fov / 2), wantL = Math.tan(om) * fpx * 0.5;
    X.near('motion blur: streak length (px) against the motion during a 180-degree exposure', L, wantL, wantL * 0.2, ' px');
    // the cos^4 law: a flat white wall, the vignette alone
    const cam3 = curVxCam(w, h, 24), S3 = vxlStage([vxlPlace('vxl_wall', [6, 0, 1])], cam3); vxlRender(S3, w, h, { vig: 1, out: out }); const pv = vxlRead(out, w, h); vxlRender(S3, w, h, { out: out }); const p0 = vxlRead(out, w, h);
    const fp = h / 2 / Math.tan(cam3.fov / 2), xs = [0.0, 0.25, 0.45], rat = xs.map(f => { const x = Math.round(w / 2 + f * w), i = ((h >> 1) * w + x) * 4; return curLum(pv, i) / Math.max(1e-6, curLum(p0, i)); }), law = xs.map(f => Math.pow(Math.cos(Math.atan(f * w / fp)), 4));
    X.within('cos^4 vignetting: measured against the law (worst error, %)', Math.max(...rat.map((r, i) => Math.abs(r / law[i] - 1))) * 100, 0, 3, '%');
  }
});
curLevel('VFXRAY', {
  v: 4, title: 'Colour and atmosphere', focus: 'The filmic tone curve, colour looks as lookup tables, light shafts, and fog by the Beer-Lambert law.',
  studied: [
    { topic: 'Tone and colour', facts: ['ACES filmic curve (Narkowicz\'s fit): x (2.51 x + 0.03) / (x (2.43 x + 0.59) + 0.14)', '3D lookup tables (32 cubed) carry a grade: the identity must change nothing', 'Looks: teal and orange (complementary shadows and skin), bleach bypass (silver retained: less colour, more contrast), day for night (about two stops under, desaturated, blue)'], src: [['Narkowicz 2016, ACES filmic tone mapping curve', 'https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/'], ['Selan 2005, Using lookup tables to accelerate color transformations (GPU Gems 2 ch. 24)', 'https://developer.nvidia.com/gpugems/gpugems2/part-iii-high-quality-rendering/chapter-24-using-lookup-tables-accelerate-color'], ['Bleach bypass (Wikipedia)', 'https://en.wikipedia.org/wiki/Bleach_bypass']] },
    { topic: 'Atmosphere', facts: ['Volumetric light scattering as a post process: samples toward the light, each decayed (decay 0.968, weight 0.588, density 0.926, exposure 0.3)', 'Beer-Lambert: transmittance T = exp(-integral of density along the ray); density falling with height exp(-(z - z0) / H) integrates exactly'], src: [['Mitchell 2007, Volumetric light scattering as a post-process (GPU Gems 3 ch. 13)', 'https://developer.nvidia.com/gpugems/gpugems3/part-ii-light-and-shadows/chapter-13-volumetric-light-scattering-post-process'], ['Beer-Lambert law (Wikipedia)', 'https://en.wikipedia.org/wiki/Beer%E2%80%93Lambert_law']] }
  ],
  can: ['Grades through lookup tables: teal and orange, bleach bypass, day for night, sodium noir', 'Light shafts from a light behind things', 'Fog that thickens with distance and toward the ground, exactly as the law says'],
  exam: X => {
    if (!curVxGL()) { X.ok('WebGL available', false, 'none', 'WebGL'); return; }
    const w = 256, h = 16; const ramp = curVxRamp(w, h, 8), px = vxlRead(ramp, w, h); let worst = 0;
    for (let x = 0; x < w; x += 4) { const xv = (x + 0.5) / w * 8, a = clamp((xv * (2.51 * xv + 0.03)) / (xv * (2.43 * xv + 0.59) + 0.14), 0, 1), want = Math.pow(a, 1 / 2.2) * 255; worst = Math.max(worst, Math.abs(px[((h >> 1) * w + x) * 4] - want)); }
    X.within('ACES on the GPU against the formula (worst, of 255)', worst, 0, 1.01);
    // lookup tables: the identity changes nothing; the looks do what they should
    const W2 = 256, H2 = 64, src = curVxRamp(W2, H2, 0.6), base = vxlRead(src, W2, H2), runLook = (look) => { const f = lgFBO('cur_lut', W2, H2, false); vxlPass(VXL.P.lut, f, W2, H2, U => { vxlTex(0, src.tex, U.uS); vxlTex(1, vxlLut(look), U.uT); LGR.gl.uniform1f(U.uK, 1); }); return vxlRead(f, W2, H2); };
    const id = runLook('identity'); let e = 0, em = 0; for (let i = 0; i < id.length; i += 4) for (let k = 0; k < 3; k++) { const d = Math.abs(id[i + k] - base[i + k]); e = Math.max(e, d); em += d; } em /= id.length * 0.75;
    X.within('identity table: worst change (of 255)', e, 0, 2); X.within('identity table: mean change (of 255)', em, 0, 0.6);
    const px2 = (p, x) => { const i = ((H2 >> 1) * W2 + x) * 4; return [p[i], p[i + 1], p[i + 2]]; }, to = runLook('tealOrange'), bl = runLook('bleach'), dn = runLook('dayForNight');
    const ds = px2(to, 40), hs = px2(to, 200); X.ok('teal and orange: shadows teal, highlights orange', ds[2] > ds[0] && hs[0] > hs[2], 'shadow ' + ds.join(',') + ' / highlight ' + hs.join(','), 'B > R, then R > B');
    const sat = p => { const m = Math.max(...p), n = Math.min(...p); return m ? (m - n) / m : 0; }, mx = (a) => Math.max(...[60, 120, 180].map(x => sat(px2(a, x))));
    const grey = runLook('identity'); X.ok('bleach bypass: contrast up (shadows down, highlights up)', px2(bl, 30)[1] < px2(grey, 30)[1] && px2(bl, 220)[1] > px2(grey, 220)[1], px2(grey, 30)[1] + '/' + px2(grey, 220)[1] + ' -> ' + px2(bl, 30)[1] + '/' + px2(bl, 220)[1], 'wider');
    const lum = (p, x) => { const c = px2(p, x); return 0.2126 * Math.pow(c[0] / 255, 2.2) + 0.7152 * Math.pow(c[1] / 255, 2.2) + 0.0722 * Math.pow(c[2] / 255, 2.2); };
    X.within('day for night: exposure down (stops)', -Math.log2(lum(dn, 180) / lum(grey, 180)), 1.5, 3, ' stops'); X.ok('day for night: blue', px2(dn, 180)[2] > px2(dn, 180)[0], px2(dn, 180).join(','), 'B > R');
    // light shafts: a light behind a bar; the shafts fade with distance from the light
    const W3 = 320, H3 = 200, cam = curVxCam(W3, H3, 35), S = vxlStage([vxlPlace('vxl_bar', [4, 0.25, 1])], cam), out = lgFBO('vxl_final', W3, H3, false), Lp = [40, 0, 1.0];
    vxlRender(S, W3, H3, { rays: { p: Lp, col: [1.4, 1.2, 0.9], r: 14 }, out: out }); const pr = vxlRead(out, W3, H3); vxlRender(S, W3, H3, { out: out }); const p0 = vxlRead(out, W3, H3);
    const q = mimcProject(cam, Lp, W3 / H3), lx = (q.x * 0.5 + 0.5) * W3, ly = (q.y * 0.5 + 0.5) * H3, prof = [20, 40, 60, 80].map(r => { const x = Math.round(lx + r * 0.8), y = Math.round(ly - r * 0.6); return curLum(pr, (y * W3 + x) * 4) - curLum(p0, (y * W3 + x) * 4); });
    X.ok('light shafts: present away from the light and fading with distance', prof[0] > 0.002 && prof.every((v, i) => !i || v <= prof[i - 1] + 1e-4), prof.map(v => v.toFixed(4)).join(' > '), 'falling');
    X.curve('light shaft brightness at 20, 40, 60, 80 px from the light', prof);
    // fog: a white wall through black fog, uniform density, at three distances: transmittance against exp(-rho L)
    const rho = 0.12, trans = [];
    for (const d of [3, 6, 12]) { const c2 = curVxCam(W3, H3, 35), S2 = vxlStage([vxlPlace('vxl_wall', [d, 0, 1])], c2); vxlRender(S2, W3, H3, { out: out }); const a = vxlRead(out, W3, H3); vxlRender(S2, W3, H3, { fog: { rho: rho, H: 1e6, col: [0, 0, 0] }, out: out }); const b = vxlRead(out, W3, H3); const i = ((H3 >> 1) * W3 + (W3 >> 1)) * 4; trans.push([d, curLum(b, i) / curLum(a, i), Math.exp(-rho * (d - 0.02))]); }
    X.within('Beer-Lambert fog: transmittance against exp(-rho L) at 3, 6, 12 m (worst error, %)', Math.max(...trans.map(t => Math.abs(t[1] / t[2] - 1))) * 100, 0, 4, '%');
    X.curve('fog transmittance measured at 3, 6, 12 m', trans.map(t => t[1])); X.curve('exp(-rho L)', trans.map(t => t[2]));
    const c3 = curVxCam(W3, H3, 35), S3 = vxlStage([vxlPlace('vxl_wall', [8, 0, 1])], c3); vxlRender(S3, W3, H3, { fog: { rho: 0.3, H: 0.6, zb: 0, col: [0, 0, 0] }, out: out }); const hf = vxlRead(out, W3, H3);
    X.ok('height fog: thicker toward the ground', curLum(hf, (20 * W3 + (W3 >> 1)) * 4) < curLum(hf, ((H3 - 20) * W3 + (W3 >> 1)) * 4), curLum(hf, (20 * W3 + (W3 >> 1)) * 4).toFixed(3) + ' low / ' + curLum(hf, ((H3 - 20) * W3 + (W3 >> 1)) * 4).toFixed(3) + ' high', 'darker low');
  }
});
curLevel('VFXRAY', {
  v: 5, title: 'Effects from physics', focus: 'Rain, sparks, smoke, debris, dust and the muzzle flash as small simulations, cued by the fights.',
  studied: [
    { topic: 'Falling and flying', facts: ['Raindrop terminal speed: v = 9.65 - 10.3 exp(-0.6 D) m/s, D in mm (Atlas, Srivastava and Sekhon 1973)', 'Quadratic drag: a = g - k v^2, terminal speed sqrt(g / k)', 'Sparks: hot steel flung at tens of metres a second, about 1900 K, cooling in tenths of a second; their colour the black body\'s'], src: [['Atlas, Srivastava and Sekhon 1973, Doppler radar characteristics of precipitation at vertical incidence', 'https://doi.org/10.1029/RG011i001p00001'], ['Planck\'s law', 'https://en.wikipedia.org/wiki/Planck%27s_law']] },
    { topic: 'Smoke and flashes', facts: ['Curl noise: the curl of a smooth vector potential is divergence-free, so it moves smoke like an incompressible flow (Bridson, Hourihan and Nordenstam 2007)', 'A puff spreads as it mixes, its radius growing about as the square root of time', 'Muzzle flash: primary flash, a dark intermediate zone, and the larger secondary flash as the gases burn in air (Klingenberg and Heimerl 1992)'], src: [['Bridson, Hourihan and Nordenstam 2007, Curl-noise for procedural fluid flow', 'https://doi.org/10.1145/1276377.1276435'], ['Klingenberg and Heimerl 1992, Gun Muzzle Blast and Flash (AIAA)', 'https://arc.aiaa.org/doi/book/10.2514/4.866111']] }
  ],
  can: ['Rain at the right speeds for its drops, sparks that fly, bounce and cool from white to red, smoke that swirls and spreads, debris and dust', 'A cue sheet: what a hit, a block, a shot, an impact, a fall or a landing calls for, and where'],
  exam: X => {
    let worst = 0; for (const D of [0.5, 1, 2, 4]) { const r = vxsRainFall(D, 4); worst = Math.max(worst, Math.abs(r.v[r.v.length - 1] / r.vt - 1)); }
    X.within('rain: drops reach their measured terminal speed (worst error, %)', worst * 100, 0, 1, '%'); X.near('rain: a 2 mm drop falls at (m/s; 9.65 - 10.3 e^-1.2)', vxsRainV(2), 6.548, 0.002, ' m/s');
    X.curve('rain: a 2 mm drop\'s speed over its first second (m/s)', vxsRainFall(2, 1).v.filter((_, i) => i % 24 === 0));
    // sparks: without drag they fly as the textbook says; with it, they slow; they bounce keeping a part of their speed; they cool to red
    const S = vxsSys({ seed: 3 }); S.ps.push({ p: [0, 0, 0.001], v: [10 * Math.cos(0.6), 0, 10 * Math.sin(0.6)], age: 0, life: 10, drag: 0 }); let land = null; for (let i = 0; i < 4000 && !land; i++) { vxsStep(S, 1 / 2000); const p = S.ps[0]; if (p.p[2] <= 0 && p.v[2] < 0) land = p.p[0]; }
    const range = 100 * Math.sin(1.2) / VXS_G; X.near('a spark without drag lands where the textbook says (m)', land, range, range * 0.01, ' m');
    const S2 = vxsSys({ seed: 4 }); vxsSparks(S2, [0, 0, 1], [1, 0, 0.2], 30); const v0 = S2.ps.map(p => curV3.len(p.v)); for (let i = 0; i < 24; i++) vxsStep(S2, 1 / 240); const v1 = S2.ps.map(p => curV3.len(p.v));
    X.ok('sparks: slowed by the air', v1.every((v, i) => v < v0[i]), (v0.reduce((a, b) => a + b) / v0.length).toFixed(1) + ' -> ' + (v1.reduce((a, b) => a + b) / v1.length).toFixed(1) + ' m/s', 'slower');
    const S3 = vxsSys({}); S3.ps.push({ p: [0, 0, 1], v: [0, 0, 0], age: 0, life: 10, drag: 0, bounce: 0.4, r: 0 }); let vin = 0, vout = null; for (let i = 0; i < 4000 && vout == null; i++) { const before = S3.ps[0].v[2]; vxsStep(S3, 1 / 2000); if (S3.ps[0].bounces === 1) { vin = before; vout = S3.ps[0].v[2]; } }
    X.near('a bounce keeps its share of the speed (restitution 0.4)', -vout / vin, 0.4, 0.02);
    const sp = { kind: 'spark', T0: 1900, age: 0, cool: 0.35 }, cols = [0, 0.2, 0.5].map(t => { const T = sp.T0 * Math.exp(-t / sp.cool); return [T, mimvPlanck(T)]; });
    X.ok('sparks cool from yellow-white to red (their colour by Planck)', cols[2][1][1] / cols[2][1][0] < cols[0][1][1] / cols[0][1][0] && cols[2][0] < 1100, cols.map(c => c[0].toFixed(0) + ' K').join(' -> '), 'cooling, the green share falling');
    X.ev.sparkColours = cols.map(c => mimvSRGB8(c[1]));
    // smoke: the flow has no divergence; puffs spread as the square root of time
    let dv = 0, cm = 0; const rng = curRng(9); for (let i = 0; i < 20; i++) { const x = rng() * 4, y = rng() * 4, z = rng() * 4; dv = Math.max(dv, Math.abs(vxsDiv(x, y, z))); cm = Math.max(cm, curV3.len(vxsCurl(x, y, z))); }
    X.within('curl noise: divergence against the flow\'s size', dv / cm, 0, 0.01);
    const S4 = vxsSys({}); vxsSmoke(S4, [0, 0, 1], 1); const rs = []; for (let i = 1; i <= 200; i++) { vxsStep(S4, 0.01); if (i % 40 === 0) rs.push([S4.ps[0].age, S4.ps[0].r - S4.ps[0].r0]); }
    const slope = (Math.log(rs[rs.length - 1][1]) - Math.log(rs[0][1])) / (Math.log(rs[rs.length - 1][0]) - Math.log(rs[0][0])); X.near('smoke: spread grows as time to the power (0.5)', slope, 0.5, 0.05);
    X.ok('smoke: rises', S4.ps[0].p[2] > 1.05, S4.ps[0].p[2].toFixed(2) + ' m', 'above 1.05 m');
    // the muzzle flash, and the cues
    X.ok('muzzle flash: primary, dark gap, secondary, in that order', VXS_FLASH.every((f, i) => !i || f.t0 >= VXS_FLASH[i - 1].t1 - 1e-9), VXS_FLASH.map(f => f.name).join(', '), 'in order');
    const ff = vxsFlashFrame(24, 180); X.ok('at 24 fps the whole flash falls in one frame\'s exposure', ff.exposure > VXS_FLASH[VXS_FLASH.length - 1].t1, (ff.exposure * 1000).toFixed(1) + ' ms exposure', 'longer than ' + (VXS_FLASH[2].t1 * 1000).toFixed(1) + ' ms');
    const kinds = Object.keys(VXS_CUES), S5 = vxsSys({ seed: 5 }); let made = 0; for (const k of kinds) made += vxsCue(S5, k, [0, 0, 1], {}).length;
    X.ok('every kind of moment has its cue (hit, block, shot, impacts, fall, land, step)', kinds.length >= 9 && made >= kinds.length, kinds.length + ' kinds, ' + made + ' effects', 'all');
    if (typeof CHO_MOVES !== 'undefined') { const ev = new Set(); for (const k in CHO_MOVES) for (const e of (CHO_MOVES[k].fx || [])) ev.add(e); X.ok('every effect CHOREO\'s moves call for is on the cue sheet', [...ev].every(e => VXS_CUES[e]), [...ev].join(', '), 'all known'); }
  }
});
