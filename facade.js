/* ================= FACADE: the buildings, remade (1.9.9991) =================
   DEPTH raised every building as a box with its floors and windows drawn on it. FACADE gives each one the parts a real
   street is made of, from the building's own kind, district and seed, and the shader that draws the wall (DEPTH's facade
   material) now sets each window back in the wall with its sill and lintel:
   - masonry (brick, concrete, stone): a plinth at the foot, a string course over the ground floor, a stepped cornice at
     the top, a parapet with its coping; brick walk-ups get a fire escape (landings, railings, stairs and the drop ladder)
     on their street side, air conditioners hang out of some windows;
   - shops: on the street side of a downtown building the ground floor is a run of storefronts: pilasters between them, a
     sign board over each with its own name painted, lettered or in neon (lit at night where the city has power, a few
     flickering, some dead), striped awnings over some;
   - roofs: water towers on their legs over the old walk-ups, air handlers, vents, stair houses, antennas, skylights,
     billboards on a few; houses get a porch with its posts, steps and roof, and a chimney;
   - the street's marks: graffiti (tags, warnings, the search crews' X codes), posters and notices on the walls at eye level.
   Everything is built into the block's few meshes when the block is (no extra draw per building), simpler further out. */
const FAC = { ok: false, atlas: null, emis: null, decal: null, mats: {}, built: 0, signs: 0, decals: 0, esc: 0, tests: null };
const FAC_NAMES = ['PHARMACY', 'DELI', 'LIQUOR', 'PAWN', 'LAUNDROMAT', 'HARDWARE', 'GROCERY', 'BAR & GRILL', 'PIZZA', 'BANK', 'DINER', 'BARBER', 'TATTOO', 'PHONE REPAIR',
  'GUNS & AMMO', 'DONUTS', 'CHECKS CASHED', 'MOTEL', 'BOOKS', 'FLOWERS', 'THRIFT STORE', 'COFFEE', 'NAILS', 'TAILOR', 'FURNITURE', 'PET SUPPLY', 'BAKERY', 'VIDEO RENTAL',
  'RECORDS', 'PAINT', 'AUTO PARTS', 'DRY CLEANING', 'SUSHI', 'TACOS', 'NOODLES', 'CLINIC', 'DENTIST', 'OPTICIAN', 'GYM', 'ARCADE', 'CINEMA', 'HOTEL', 'PAYDAY LOANS',
  'CELL PHONES', 'JEWELRY', 'COLD BEER', 'MARKET', 'OPEN 24 HRS', 'SPORTS', 'TOYS', 'MUSIC', 'CAMERA', 'BURGERS', 'CHICKEN', 'SUPPLY CO.', 'PAWN & GOLD', 'LOANS',
  'FISH MARKET', 'BUTCHER', 'WINE', 'VAPE', 'POOL HALL', 'BOWLING', 'FM 66.6'];
const FAC_COLS = 4, FAC_ROWS = 16;   // the sign atlas: 64 signs of 512 x 96
// the cell of a wall's windows (as the facade shader has it): width and floor height in metres, by style
const FAC_WS = [2.6, 3.1, 1.6, 2.9, 3.4, 3.8, 3.8, 3.8, 3.8], FAC_FH = [3.3, 3.5, 3.9, 3.6, 3.0, 3.0, 3.2, 3.2, 3.2];

/* ---------- the atlases (painted once, on canvases) ---------- */
function facAtlases() {
  if (FAC.atlas) return;
  const R = Z.mulberry32(0xfacade), tw = 512, th = 96, W = tw * FAC_COLS, H = th * FAC_ROWS;
  const ca = document.createElement('canvas'), ce = document.createElement('canvas'); ca.width = ce.width = W; ca.height = ce.height = H;
  const x = ca.getContext('2d'), e = ce.getContext('2d'); e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  const fonts = ['bold 64px Georgia, "Times New Roman", serif', '900 66px Impact, "Arial Black", sans-serif', 'bold 60px "Courier New", monospace', 'bold 64px "Trebuchet MS", Arial, sans-serif', 'bold italic 64px Georgia, serif', 'bold 62px Verdana, sans-serif'];
  const boards = ['#1f3b5a', '#7a1e1e', '#e8e0c8', '#203a2a', '#111214', '#c89a2a', '#f2f2ee', '#5a2a5a', '#2a4a6a', '#8a4a1e', '#3a3a3e', '#0e4a4a'];
  const neon = ['#ff3a6a', '#3af0ff', '#ffe23a', '#7aff5a', '#ff8a2a', '#c86aff'];
  for (let i = 0; i < FAC_COLS * FAC_ROWS; i++) {
    const cx = (i % FAC_COLS) * tw, cy = Math.floor(i / FAC_COLS) * th, name = FAC_NAMES[i % FAC_NAMES.length], kind = R() < 0.3 ? 'neon' : R() < 0.55 ? 'lit' : 'board';
    x.save(); x.beginPath(); x.rect(cx, cy, tw, th); x.clip();
    const bg = kind === 'neon' ? '#0b0b0d' : boards[Math.floor(R() * boards.length)], lightBg = /^#[cdef]/i.test(bg);
    x.fillStyle = bg; x.fillRect(cx, cy, tw, th);
    // the board: a frame, the grain of its paint, a little dirt
    x.strokeStyle = kind === 'neon' ? '#26262a' : lightBg ? '#5a5048' : 'rgba(255,255,255,0.25)'; x.lineWidth = 6; x.strokeRect(cx + 4, cy + 4, tw - 8, th - 8);
    for (let k = 0; k < 40; k++) { x.fillStyle = 'rgba(0,0,0,' + (0.03 + R() * 0.06) + ')'; x.fillRect(cx + R() * tw, cy + R() * th, 2 + R() * 30, 1 + R() * 3); }
    const tc = kind === 'neon' ? neon[Math.floor(R() * neon.length)] : lightBg ? ['#1a1a1c', '#7a1e1e', '#1f3b5a'][Math.floor(R() * 3)] : ['#f2f0e6', '#ffd23a', '#ffffff', '#e8c88a'][Math.floor(R() * 4)];
    const f = fonts[Math.floor(R() * fonts.length)]; x.font = f; x.textAlign = 'center'; x.textBaseline = 'middle';
    let s = 1; const mw = x.measureText(name).width; if (mw > tw - 40) s = (tw - 40) / mw;
    x.save(); x.translate(cx + tw / 2, cy + th / 2 + 2); x.scale(s, 1);
    if (kind === 'neon') { x.shadowColor = tc; x.shadowBlur = 20; x.fillStyle = tc; x.fillText(name, 0, 0); x.shadowBlur = 4; x.fillStyle = '#fff'; x.globalAlpha = 0.6; x.fillText(name, 0, 0); x.globalAlpha = 1; }
    else { x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillText(name, 2, 2); x.fillStyle = tc; x.fillText(name, 0, 0); }
    x.restore();
    // weathering: grime from the top, a rust streak, sometimes a letter gone
    const g = x.createLinearGradient(cx, cy, cx, cy + th); g.addColorStop(0, 'rgba(20,16,12,' + (0.15 + R() * 0.3) + ')'); g.addColorStop(1, 'rgba(20,16,12,0)'); x.fillStyle = g; x.fillRect(cx, cy, tw, th);
    if (R() < 0.4) { x.fillStyle = 'rgba(110,50,20,0.35)'; x.fillRect(cx + R() * tw, cy + th * 0.6, 3 + R() * 4, th * 0.4); }
    const gone = R() < 0.25 ? [cx + 50 + R() * (tw - 120), 26 + R() * 24] : null; if (gone) { x.fillStyle = bg; x.fillRect(gone[0], cy + 14, gone[1], th - 28); }
    x.restore();
    // the light: neon and backlit letters glow at night (a dead tube stays dark)
    if (kind !== 'board') {
      e.save(); e.beginPath(); e.rect(cx, cy, tw, th); e.clip(); e.font = f; e.textAlign = 'center'; e.textBaseline = 'middle';
      e.translate(cx + tw / 2, cy + th / 2 + 2); e.scale(s, 1); e.fillStyle = kind === 'neon' ? tc : '#ffeccc'; if (kind === 'neon') { e.shadowColor = tc; e.shadowBlur = 16; }
      e.fillText(name, 0, 0); e.restore();
      if (gone) { e.fillStyle = '#000'; e.fillRect(gone[0], cy + 14, gone[1], th - 28); }
      if (kind === 'lit') { e.fillStyle = 'rgba(255,236,204,0.12)'; e.fillRect(cx + 8, cy + 8, tw - 16, th - 16); }
    }
  }
  const mk = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = Math.min(8, DEPTH.R.capabilities.getMaxAnisotropy()); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; };
  FAC.atlas = mk(ca, true); FAC.emis = mk(ce, true);
  // the street's marks: 16 decals of 256 px with their own transparency
  const cd = document.createElement('canvas'); cd.width = cd.height = 1024; const d = cd.getContext('2d');
  const sprayTxt = (cx, cy, txt, col, size, rot, drip) => {
    d.save(); d.translate(cx, cy); d.rotate(rot); d.font = '900 ' + size + 'px Impact, "Arial Black", sans-serif'; d.textAlign = 'center'; d.textBaseline = 'middle';
    let s = 1; const mw = d.measureText(txt).width; if (mw > 236) s = 236 / mw; d.scale(s, 1);
    d.shadowColor = col; d.shadowBlur = 5; d.fillStyle = col; d.fillText(txt, 0, 0); d.shadowBlur = 0;
    if (drip) { d.fillStyle = col; for (let k = 0; k < 7; k++) { const dx = (R() - 0.5) * mw * 0.9, l = 8 + R() * 40; d.fillRect(dx, size * 0.25, 2 + R() * 2, l); d.beginPath(); d.arc(dx + 1.5, size * 0.25 + l, 2.5, 0, TAU); d.fill(); } }
    d.restore(); };
  const tiles = [
    t => sprayTxt(t[0] + 128, t[1] + 120, 'HELP', '#e8261e', 90, -0.06, true),
    t => sprayTxt(t[0] + 128, t[1] + 128, 'THEY\'RE INSIDE', '#f2f2ee', 46, 0.04, true),
    t => sprayTxt(t[0] + 128, t[1] + 128, 'NO WAY OUT', '#ffd23a', 56, -0.03, true),
    t => sprayTxt(t[0] + 128, t[1] + 128, 'QUARANTINE', '#ff6a1e', 52, 0.02, false),
    t => { // the search crews' X: the date, who searched, hazards, the dead found
      d.save(); d.strokeStyle = '#ff5a1e'; d.lineWidth = 10; d.lineCap = 'round'; d.beginPath(); d.moveTo(t[0] + 40, t[1] + 40); d.lineTo(t[0] + 216, t[1] + 216); d.moveTo(t[0] + 216, t[1] + 40); d.lineTo(t[0] + 40, t[1] + 216); d.stroke();
      d.fillStyle = '#ff5a1e'; d.font = 'bold 30px Impact, sans-serif'; d.textAlign = 'center'; d.fillText('10/' + (10 + Math.floor(R() * 18)), t[0] + 128, t[1] + 62); d.fillText('2', t[0] + 128, t[1] + 212); d.fillText('TF4', t[0] + 62, t[1] + 138); d.fillText('Z', t[0] + 194, t[1] + 138); d.restore(); },
    t => sprayTxt(t[0] + 128, t[1] + 128, 'SAFE ZONE →', '#5aff6a', 46, 0, true),
    t => sprayTxt(t[0] + 128, t[1] + 128, 'DEAD INSIDE', '#e8261e', 54, 0.05, true),
    t => { // a tag: loops and a crown
      d.save(); d.strokeStyle = ['#3af0ff', '#c86aff', '#f2f2ee'][Math.floor(R() * 3)]; d.lineWidth = 9; d.lineJoin = d.lineCap = 'round'; d.beginPath(); let px = t[0] + 30, py = t[1] + 150; d.moveTo(px, py);
      for (let k = 0; k < 9; k++) { const nx = px + 22 + R() * 6, ny = t[1] + 90 + R() * 90; d.bezierCurveTo(px + 30, py - 70, nx - 20, ny + 70, nx, ny); px = nx; py = ny; } d.stroke(); d.lineWidth = 3; d.strokeStyle = '#111'; d.stroke(); d.restore(); },
    t => { // a missing poster: a face, a name, the paper torn
      d.save(); d.fillStyle = '#ece6d6'; d.fillRect(t[0] + 58, t[1] + 20, 140, 200); d.fillStyle = '#1a1a1c'; d.font = 'bold 26px Arial, sans-serif'; d.textAlign = 'center'; d.fillText('MISSING', t[0] + 128, t[1] + 50);
      d.fillStyle = '#8a8478'; d.beginPath(); d.arc(t[0] + 128, t[1] + 100, 30, 0, TAU); d.fill(); d.fillRect(t[0] + 92, t[1] + 128, 72, 40);
      d.fillStyle = '#3a3a3c'; d.font = '14px Arial, sans-serif'; d.fillText('HAVE YOU SEEN', t[0] + 128, t[1] + 186); d.fillText('MY DAUGHTER?', t[0] + 128, t[1] + 204);
      d.globalCompositeOperation = 'destination-out'; d.beginPath(); d.moveTo(t[0] + 198, t[1] + 150); for (let k = 0; k < 6; k++) d.lineTo(t[0] + 198 - R() * 30, t[1] + 150 + k * 14); d.lineTo(t[0] + 198, t[1] + 230); d.fill(); d.restore(); },
    t => { // a notice: the curfew
      d.save(); d.fillStyle = '#f2ead2'; d.fillRect(t[0] + 40, t[1] + 30, 176, 196); d.fillStyle = '#7a1e1e'; d.fillRect(t[0] + 40, t[1] + 30, 176, 40); d.fillStyle = '#fff'; d.font = 'bold 24px Arial, sans-serif'; d.textAlign = 'center'; d.fillText('NOTICE', t[0] + 128, t[1] + 58);
      d.fillStyle = '#1a1a1c'; d.font = 'bold 20px Arial, sans-serif'; d.fillText('CURFEW', t[0] + 128, t[1] + 100); d.font = '15px Arial, sans-serif'; ['8 PM TO 6 AM', 'STAY INDOORS', 'DO NOT APPROACH', 'THE INFECTED', 'BY ORDER OF THE', 'CITY OF ...'].forEach((l, k) => d.fillText(l, t[0] + 128, t[1] + 126 + k * 17)); d.restore(); },
    t => sprayTxt(t[0] + 128, t[1] + 128, 'KEEP OUT', '#f2f2ee', 60, 0, false),
    t => sprayTxt(t[0] + 128, t[1] + 128, 'GOD HELP US', '#e8261e', 48, -0.08, true),
    t => sprayTxt(t[0] + 128, t[1] + 128, 'EVAC ↑ NORTH', '#ffd23a', 46, 0.03, true),
    t => { // a handprint smear in old blood
      d.save(); d.fillStyle = 'rgba(90,6,8,0.85)'; d.beginPath(); d.ellipse(t[0] + 128, t[1] + 150, 34, 40, 0, 0, TAU); d.fill(); for (let k = 0; k < 5; k++) { d.beginPath(); d.ellipse(t[0] + 92 + k * 18, t[1] + 92 - Math.abs(2 - k) * 10, 8, 26, (k - 2) * 0.15, 0, TAU); d.fill(); }
      d.fillRect(t[0] + 110, t[1] + 180, 36, 60); d.restore(); },
    t => sprayTxt(t[0] + 128, t[1] + 128, 'FM 66.6', '#3af0ff', 64, -0.04, false),
    t => sprayTxt(t[0] + 128, t[1] + 128, 'LOOTERS WILL BE SHOT', '#f2f2ee', 40, 0.02, true)];
  tiles.forEach((fn, i) => { d.save(); d.beginPath(); d.rect((i % 4) * 256, Math.floor(i / 4) * 256, 256, 256); d.clip(); fn([(i % 4) * 256, Math.floor(i / 4) * 256]); d.restore(); });
  FAC.decal = mk(cd, true);
}
function facadeMats() {
  facAtlases();
  const M = FAC.mats;
  // the signs: painted by day, the lit ones glowing at night (aL: lit, 0 dead; a few flicker)
  M.sign = dPatch(new THREE.MeshStandardMaterial({ map: FAC.atlas, roughness: 0.55, metalness: 0.1, envMapIntensity: 0.6 }), {
    key: 'sign1', uniforms: { uEmis: { value: FAC.emis } },
    vHead: 'attribute float aL; varying float vL;\n', vMain: 'vL = aL;',
    fHead: 'uniform sampler2D uEmis; varying float vL;\n',
    fEmis: '{ float fl = step(0.6, vL) * step(0.93, fract(sin(floor(uTime * 9.0) * 12.9898 + vL * 78.233) * 43758.5453)); totalEmissiveRadiance += texture2D(uEmis, vMapUv).rgb * 2.6 * step(0.05, vL) * clamp(uNight * 1.4, 0.0, 1.0) * (1.0 - fl); }'
  });
  // the marks on the walls: graffiti and paper (transparent, laid just off the wall)
  M.decal = new THREE.MeshStandardMaterial({ map: FAC.decal, transparent: true, depthWrite: false, roughness: 0.85, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, alphaTest: 0.02 });
  // the fences: one texture of four bands (chain-link, board fence, pickets, iron railings), cut out, casting cut-out shadows
  facFenceTex();
  M.fence = new THREE.MeshStandardMaterial({ map: FAC.fence, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.72, metalness: 0.12, envMapIntensity: 0.6 });
  M.fenceD = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: FAC.fence, alphaTest: 0.5, side: THREE.DoubleSide });
  FAC.ok = true;
}
// four bands of 512 x 512 (each a square of the fence as tall as it is), a margin above and below each so they do not bleed
const FAC_FB = 512, FAC_FM = 10;
function facFenceTex() {
  if (FAC.fence) return FAC.fence;
  const T = FAC_FB, cv = document.createElement('canvas'); cv.width = T; cv.height = T * 4; const x = cv.getContext('2d'), R = Z.mulberry32(0xfe7ce);
  const band = (i, fn) => { x.save(); x.beginPath(); x.rect(0, i * T + FAC_FM, T, T - FAC_FM * 2); x.clip(); x.translate(0, i * T + FAC_FM); fn(T - FAC_FM * 2); x.restore(); };
  // 0: chain-link: wire diamonds, twenty-four across, a little sag and shine
  band(0, H => { const n = 24, p = T / n; x.lineWidth = 2.6;
    for (let k = -n; k <= n * 2; k++) for (const s2 of [1, -1]) { const v = 150 + R() * 60; x.strokeStyle = 'rgb(' + v + ',' + (v + 4) + ',' + (v + 8) + ')'; x.beginPath(); x.moveTo(k * p, 0); x.lineTo(k * p + s2 * H, H); x.stroke(); }
    x.fillStyle = 'rgb(170,174,178)'; x.fillRect(0, 0, T, 5); x.fillRect(0, H - 4, T, 4); });
  // 1: a board fence: twelve boards, dog-eared, grain, the odd gap
  band(1, H => { const n = 12, bw = T / n;
    for (let k = 0; k < n; k++) { const v = 170 + R() * 60, x0 = k * bw + 1.5, w = bw - 3 - (R() < 0.15 ? 3 : 0);
      x.fillStyle = 'rgb(' + v + ',' + Math.round(v * 0.97) + ',' + Math.round(v * 0.92) + ')'; x.beginPath(); x.moveTo(x0, 10); x.lineTo(x0 + w * 0.22, 0); x.lineTo(x0 + w * 0.78, 0); x.lineTo(x0 + w, 10); x.lineTo(x0 + w, H); x.lineTo(x0, H); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(60,50,40,0.25)'; x.lineWidth = 1.2; for (let g = 0; g < 7; g++) { const gx = x0 + 3 + R() * (w - 6); x.beginPath(); x.moveTo(gx, 4); x.bezierCurveTo(gx + (R() - 0.5) * 6, H * 0.3, gx + (R() - 0.5) * 6, H * 0.7, gx + (R() - 0.5) * 4, H); x.stroke(); }
      if (R() < 0.3) { x.fillStyle = 'rgba(40,30,20,0.5)'; x.beginPath(); x.ellipse(x0 + w * (0.3 + R() * 0.4), H * (0.2 + R() * 0.6), 3, 5, 0, 0, TAU); x.fill(); }
      x.fillStyle = 'rgba(40,40,40,0.5)'; x.fillRect(x0 + w / 2 - 1.5, H * 0.18, 3, 3); x.fillRect(x0 + w / 2 - 1.5, H * 0.8, 3, 3);
      x.fillStyle = 'rgba(50,60,40,0.28)'; x.fillRect(x0, H * 0.9, w, H * 0.1); } });
  // 2: pickets: nine, pointed, on two rails
  band(2, H => { const n = 9, pw = T / n;
    x.fillStyle = 'rgb(210,208,204)'; x.fillRect(0, H * 0.22, T, H * 0.07); x.fillRect(0, H * 0.72, T, H * 0.07);
    for (let k = 0; k < n; k++) { const v = 215 + R() * 30, x0 = k * pw + pw * 0.2, w = pw * 0.6; x.fillStyle = 'rgb(' + v + ',' + v + ',' + Math.round(v * 0.97) + ')'; x.beginPath(); x.moveTo(x0, H * 0.1); x.lineTo(x0 + w / 2, 0); x.lineTo(x0 + w, H * 0.1); x.lineTo(x0 + w, H); x.lineTo(x0, H); x.closePath(); x.fill();
      x.fillStyle = 'rgba(80,70,60,0.18)'; x.fillRect(x0, H * 0.82, w, H * 0.18); } });
  // 3: iron railings: twelve bars with spear heads, two rails
  band(3, H => { const n = 12, pw = T / n; x.fillStyle = 'rgb(200,200,200)';
    x.fillRect(0, H * 0.12, T, 9); x.fillRect(0, H * 0.86, T, 9);
    for (let k = 0; k < n; k++) { const cx = (k + 0.5) * pw; x.fillRect(cx - 4, H * 0.05, 8, H * 0.95); x.beginPath(); x.moveTo(cx - 9, H * 0.07); x.lineTo(cx, 0); x.lineTo(cx + 9, H * 0.07); x.closePath(); x.fill(); } });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = Math.min(8, DEPTH.R.capabilities.getMaxAnisotropy()); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return FAC.fence = t;
}

/* ---------- fences ---------- */
// a fence along the long side of its rect: chain-link (the courts and lots), board fences (yards), pickets (the suburbs'
// fronts), iron railings (the city), split-rail (the ranches); posts on the plain builder, the panel cut out of the band
function facFence(ctx, r, x0, z0, x1, z1, y0) {
  if (!FAC.ok || !FAC.fence) return false;
  const TH = ctx.TH, FN = ctx.FN || (ctx.FN = dGB()), R = Z.mulberry32((r.s || ((r.x * 13 + r.y * 7) | 0)) ^ 0xfe7), along = (x1 - x0) >= (z1 - z0), len = along ? x1 - x0 : z1 - z0;
  if (len < 0.3) return true;
  const mid = along ? (z0 + z1) / 2 : (x0 + x1) / 2, a0 = along ? x0 : z0;
  const P = (a, y, o) => along ? [a0 + a, y, mid + (o || 0)] : [mid + (o || 0), y, a0 + a];
  const kind = r.wire ? 'chain' : r.ranch ? 'rail' : ctx.bio === 'suburb' ? (R() < 0.35 ? 'picket' : 'board') : ctx.bio === 'city' ? (R() < 0.4 ? 'iron' : 'board') : ctx.bio === 'snow' || ctx.bio === 'desert' ? (R() < 0.5 ? 'rail' : 'board') : (R() < 0.5 ? 'chain' : 'board');
  const h = kind === 'chain' ? (r.wire ? 2.6 : 2.0) : kind === 'board' ? 1.8 : kind === 'picket' ? 1.05 : kind === 'iron' ? 1.6 : 1.25;
  const n = along ? [0, 0, 1] : [1, 0, 0];
  if (kind === 'rail') {
    const pc = dLin(['#6a5038', '#5a4430', '#7a5e40'][Math.floor(R() * 3)]), sp = 2.5, np = Math.max(1, Math.round(len / sp));
    for (let i = 0; i <= np; i++) { const a = len * i / np, p = P(a, y0); dBox(TH, p[0] - 0.07, y0, p[2] - 0.07, p[0] + 0.07, y0 + h + 0.08, p[2] + 0.07, pc, DL_PLK); }
    for (const yy of [0.35, 0.72, 1.08]) { const q0 = P(0, y0), q1 = P(len, y0); dBox(TH, Math.min(q0[0], q1[0]) - (along ? 0 : 0.03), y0 + yy, Math.min(q0[2], q1[2]) - (along ? 0.03 : 0), Math.max(q0[0], q1[0]) + (along ? 0 : 0.03), y0 + yy + 0.13, Math.max(q0[2], q1[2]) + (along ? 0.03 : 0), pc, DL_PLK); }
    FAC.fences = (FAC.fences || 0) + 1; return true;
  }
  const bandI = kind === 'chain' ? 0 : kind === 'board' ? 1 : kind === 'picket' ? 2 : 3, m = FAC_FM / (FAC_FB * 4);
  const vB = 1 - (bandI + 1) / 4 + m, vT = 1 - bandI / 4 - m;
  const col = kind === 'chain' ? dLin('#a4a9ae') : kind === 'board' ? dLin(['#8a6a48', '#7a5c3e', '#94744e', '#6e5a48'][Math.floor(R() * 4)]) : kind === 'picket' ? dLin(['#eeeae2', '#e4e0d6', '#d8d4ca'][Math.floor(R() * 3)]) : dLin('#2a2c30');
  const u1 = len / h, A = P(0, y0), B = P(len, y0), Ct = P(len, y0 + h), Dt = P(0, y0 + h);
  dQuad(FN, A, B, Ct, Dt, n, col, null, [0, vB], [u1, vB], [u1, vT], [0, vT]);
  // posts (and the chain-link's top rail; the board fence's rails behind it)
  const sp = kind === 'chain' ? 3.0 : 2.4, np = Math.max(1, Math.round(len / sp));
  const pc = kind === 'chain' ? dLin('#8a9096') : kind === 'iron' ? dLin('#1e2024') : col, pa = kind === 'chain' || kind === 'iron' ? DL_MET : DL_PLK;
  for (let i = 0; i <= np; i++) { const a = len * i / np, p = P(a, y0);
    if (kind === 'chain') dCyl(TH, p[0], y0, p[2], 0.04, 0.04, y0 + h + 0.05, 6, pc, pa);
    else { const w = kind === 'iron' ? 0.05 : 0.065; dBox(TH, p[0] - w, y0, p[2] - w, p[0] + w, y0 + h + (kind === 'picket' ? 0.06 : 0.04), p[2] + w, pc, pa); } }
  if (kind === 'chain' && typeof flLimb === 'function') flLimb(TH, P(0, y0 + h - 0.02), P(len, y0 + h - 0.02), 0.025, 0.025, 6, pc, pa);
  if (kind === 'board') for (const yy of [0.25, h - 0.3]) { const q0 = P(0, y0 + yy, 0.04), q1 = P(len, y0 + yy, 0.1); dBox(TH, Math.min(q0[0], q1[0]), y0 + yy, Math.min(q0[2], q1[2]), Math.max(q0[0], q1[0]), y0 + yy + 0.09, Math.max(q0[2], q1[2]), dLin('#5a4632'), DL_PLK); }
  FAC.fences = (FAC.fences || 0) + 1;
  return true;
}
function facFenceEnd(ctx, G0, keep) {
  if (!ctx || !ctx.FN || !ctx.FN.nv) return;
  const g = dGeom(ctx.FN), m = new THREE.Mesh(g, FAC.mats.fence); m.customDepthMaterial = FAC.mats.fenceD; m.castShadow = true; m.receiveShadow = true; G0.add(m); keep.push(g);
}

/* ---------- building parts ---------- */
// the faces of a box: where along its length the wall's pattern starts (the facade shader's metres along), the way along,
// the outward normal and the length (as dBox lays them out)
function facFaces(x0, z0, x1, z1) {
  return [{ o: [x1, z0], t: [-1, 0], n: [0, -1], len: x1 - x0, side: 'n' }, { o: [x0, z1], t: [1, 0], n: [0, 1], len: x1 - x0, side: 's' },
    { o: [x0, z0], t: [0, 1], n: [-1, 0], len: z1 - z0, side: 'w' }, { o: [x1, z1], t: [0, -1], n: [1, 0], len: z1 - z0, side: 'e' }];
}
// a box in a face's own frame: along a0..a1, up y0..y1, out n0..n1 (metres)
function facBox(B, F, a0, a1, y0, y1, n0, n1, col, aux, skip) {
  const xa = F.o[0] + F.t[0] * a0 + F.n[0] * n0, za = F.o[1] + F.t[1] * a0 + F.n[1] * n0, xb = F.o[0] + F.t[0] * a1 + F.n[0] * n1, zb = F.o[1] + F.t[1] * a1 + F.n[1] * n1;
  dBox(B, Math.min(xa, xb), y0, Math.min(za, zb), Math.max(xa, xb), y1, Math.max(za, zb), col, aux, null, skip);
}
// a quad in a face's frame (the corners given as [along, up, out]), facing out
function facQuad(B, F, p0, p1, p2, p3, col, aux, nrm) {
  const P = q => [F.o[0] + F.t[0] * q[0] + F.n[0] * q[2], q[1], F.o[1] + F.t[1] * q[0] + F.n[1] * q[2]];
  const n = nrm || [F.n[0], 0, F.n[1]];
  dQuad(B, P(p0), P(p1), P(p2), P(p3), n, col, aux, [p0[0], p0[1]], [p1[0], p1[1]], [p2[0], p2[1]], [p3[0], p3[1]]);
}
// a sloped slab (stairs, an awning) from (a0..a1 at up ya, out na) to (up yb, out nb): its top and front edge
function facSlope(B, F, a0, a1, ya, na, yb, nb, th, col, aux) {
  const dy = yb - ya, dn = nb - na, ln = Math.hypot(dy, dn) || 1, ny = dn / ln, nn = -dy / ln, N = [F.n[0] * nn, ny, F.n[1] * nn];
  if (ny < 0) { N[0] = -N[0]; N[1] = -N[1]; N[2] = -N[2]; }
  facQuad(B, F, [a1, ya, na], [a0, ya, na], [a0, yb, nb], [a1, yb, nb], col, aux, N);
  facQuad(B, F, [a0, yb - th, nb], [a1, yb - th, nb], [a1, yb, nb], [a0, yb, nb], col, aux);
  facQuad(B, F, [a0, ya - th, na], [a1, ya - th, na], [a1, yb - th, nb], [a0, yb - th, nb], col, aux, [-N[0], -N[1], -N[2]]);
}
// a fire escape up one face: a landing at every floor, its railing, the stairs between, the drop ladder at the bottom
function facFireEscape(TH, F, a0, nf, fh, y0, ws) {
  const iron = dLin('#24262a'), A = DL_MET, w = ws * 2 - 0.3, d = 1.15, a1 = a0 + w;
  for (let k = 1; k < nf; k++) {
    const y = y0 + k * fh + 0.02;
    facBox(TH, F, a0, a1, y - 0.06, y, 0.02, d, iron, A);                                      // the landing
    facBox(TH, F, a0, a1, y + 0.98, y + 1.02, d - 0.04, d, iron, A);                           // its rail
    facBox(TH, F, a0, a1, y + 0.45, y + 0.48, d - 0.04, d, iron, A);
    for (const s of [a0, a1 - 0.04]) { facBox(TH, F, s, s + 0.04, y, y + 1.02, 0.02, 0.06, iron, A); facBox(TH, F, s, s + 0.04, y, y + 1.02, d - 0.04, d, iron, A); facBox(TH, F, s, s + 0.04, y + 0.98, y + 1.02, 0.02, d, iron, A); }
    for (let b = a0 + 0.5; b < a1 - 0.3; b += 0.5) facBox(TH, F, b, b + 0.025, y, y + 1.0, d - 0.03, d, iron, A);
    // the stairs down to the landing below (alternating sides)
    const sa = k % 2 ? a0 + 0.1 : a1 - 1.0, yb = y - fh;
    if (k > 1) facSlope(TH, F, sa, sa + 0.8, y - 0.06, 0.25, yb + 0.02, d - 0.15, 0.06, iron, A);
    else { facBox(TH, F, sa + 0.2, sa + 0.24, y - 2.4, y, d - 0.3, d - 0.26, iron, A); facBox(TH, F, sa + 0.56, sa + 0.6, y - 2.4, y, d - 0.3, d - 0.26, iron, A); for (let r = 0.3; r < 2.4; r += 0.3) facBox(TH, F, sa + 0.2, sa + 0.6, y - r - 0.02, y - r, d - 0.3, d - 0.26, iron, A); }
  }
}
// a storefront run on a face's ground floor: pilasters on the cell lines, a sign board over each shop, awnings on some
function facStorefronts(ctx, F, style, fh, y0, seed, lit) {
  const ws = FAC_WS[style], n = Math.floor(F.len / ws), R = Z.mulberry32(((seed * 1e6) | 0) ^ 0x51a9), TH = ctx.TH, SG = ctx.SG;
  if (n < 1) return;
  const pil = dLin(style === 0 ? '#3a2a24' : '#5c5a56'), fasc = dLin(['#1a1a1c', '#2a2420', '#3a3e44', '#4a2020'][Math.floor(R() * 4)]);
  const top = y0 + fh * 0.82 + 0.06, sb0 = top + 0.04, sb1 = y0 + fh + 0.12;
  for (let k = 0; k <= n; k++) { const a = Math.min(F.len - 0.2, k * ws); facBox(TH, F, a - 0.14, a + 0.14, y0, sb1 + 0.1, 0, 0.1, pil, DL_CON); }
  facBox(TH, F, 0, Math.min(F.len, n * ws), top - 0.04, top + 0.02, 0, 0.12, pil, DL_CON);   // the head of the shop windows
  let k = 0;
  while (k < n) {
    const span = Math.min(n - k, 1 + Math.floor(R() * 3)), a0 = k * ws + 0.18, a1 = (k + span) * ws - 0.18;
    // the sign board and the sign on it
    facBox(TH, F, a0, a1, sb0, sb1, 0, 0.14, fasc, null);
    const ti = Math.floor(R() * FAC_COLS * FAC_ROWS), u0 = (ti % FAC_COLS) / FAC_COLS, v0 = 1 - (Math.floor(ti / FAC_COLS) + 1) / FAC_ROWS, u1 = u0 + 1 / FAC_COLS, v1 = v0 + 1 / FAC_ROWS;
    const sw = Math.min(a1 - a0 - 0.1, (sb1 - sb0 - 0.06) * 5.33), sm = (a0 + a1) / 2, s0 = sm - sw / 2, s1 = sm + sw / 2, yy0 = sb0 + 0.03, yy1 = sb1 - 0.03;
    const live = lit > 0 && R() < 0.75 ? (R() < 0.12 ? 0.8 : 0.4) : 0;   // lit, flickering, or dead
    facQuadSign(SG, F, s0, s1, yy0, yy1, 0.145, u0, v0, u1, v1, live);
    // an awning under it (striped canvas, sagging a little, its valance in front)
    if (R() < 0.45) {
      const ya = sb0 - 0.04, yb = ya - 0.55, out = 1.2, cA = dLin(['#7a1e1e', '#1f3b5a', '#203a2a', '#c89a2a', '#5a2a5a'][Math.floor(R() * 5)]), cB = dLin('#e8e0c8'), st = Math.max(2, Math.round((a1 - a0) / 0.42));
      for (let s = 0; s < st; s++) { const p0 = a0 + (a1 - a0) * s / st, p1 = a0 + (a1 - a0) * (s + 1) / st; facSlope(TH, F, p0, p1, ya, 0.05, yb, out, 0.02, s % 2 ? cA : cB, null); facBox(TH, F, p0, p1, yb - 0.24, yb, out - 0.02, out, s % 2 ? cA : cB, null); }
    }
    k += span; FAC.signs++;
  }
}
function facQuadSign(SG, F, a0, a1, y0, y1, n, u0, v0, u1, v1, live) {
  const P = (a, y) => [F.o[0] + F.t[0] * a + F.n[0] * n, y, F.o[1] + F.t[1] * a + F.n[1] * n], N = [F.n[0], 0, F.n[1]], v = SG.nv;
  const pts = [[P(a0, y0), [u0, v0]], [P(a1, y0), [u1, v0]], [P(a1, y1), [u1, v1]], [P(a0, y1), [u0, v1]]];
  for (const [p, uv] of pts) { SG.p.push(p[0], p[1], p[2]); SG.n.push(N[0], N[1], N[2]); SG.c.push(1, 1, 1); SG.u.push(uv[0], uv[1]); SG.a.push(live, 0, 0, 0); SG.f.push(0, 0); }
  SG.i.push(v, v + 1, v + 2, v, v + 2, v + 3); SG.nv += 4;
}
// a mark on a face (graffiti, a poster): tile 0..15 of the decal atlas, centred at along a, up y, size s
function facDecal(DG, F, a, y, s, tile) {
  const n = 0.012, u0 = (tile % 4) / 4, v0 = 1 - (Math.floor(tile / 4) + 1) / 4, P = (aa, yy) => [F.o[0] + F.t[0] * aa + F.n[0] * n, yy, F.o[1] + F.t[1] * aa + F.n[1] * n], N = [F.n[0], 0, F.n[1]], v = DG.nv;
  const pts = [[P(a - s / 2, y - s / 2), [u0, v0]], [P(a + s / 2, y - s / 2), [u0 + 0.25, v0]], [P(a + s / 2, y + s / 2), [u0 + 0.25, v0 + 0.25]], [P(a - s / 2, y + s / 2), [u0, v0 + 0.25]]];
  for (const [p, uv] of pts) { DG.p.push(p[0], p[1], p[2]); DG.n.push(N[0], N[1], N[2]); DG.c.push(1, 1, 1); DG.u.push(uv[0], uv[1]); DG.a.push(0, 0, 0, 0); DG.f.push(0, 0); }
  DG.i.push(v, v + 1, v + 2, v, v + 2, v + 3); DG.nv += 4; FAC.decals++;
}
// a water tower on its legs (wooden tank, conical roof)
function facWaterTower(TH, cx, y, cz, R) {
  const r = 1.4 + R() * 0.5, h = 2.6 + R() * 0.8, leg = 2.2 + R() * 0.8, iron = dLin('#2a2c30'), wood = dLin(['#5a4a3a', '#4a3e30', '#6a5640'][Math.floor(R() * 3)]);
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) dBox(TH, cx + dx * r * 0.62 - 0.07, y, cz + dz * r * 0.62 - 0.07, cx + dx * r * 0.62 + 0.07, y + leg, cz + dz * r * 0.62 + 0.07, iron, DL_MET);
  dBox(TH, cx - r * 0.75, y + leg - 0.12, cz - r * 0.75, cx + r * 0.75, y + leg, cz + r * 0.75, iron, DL_MET);
  dCyl(TH, cx, y + leg, cz, r, r, y + leg + h, 12, wood, DL_PLK);
  for (const hb of [0.25, 0.55, 0.85]) dCyl(TH, cx, y + leg + h * hb, cz, r + 0.03, r + 0.03, y + leg + h * hb + 0.06, 12, iron, DL_MET);
  dCyl(TH, cx, y + leg + h, cz, r + 0.12, 0.08, y + leg + h + r * 0.75, 12, dLin('#3a3430'), DL_SHI);
}
// an air handler or a condenser on a roof (a box with its fan on top)
function facRoofUnit(TH, cx, y, cz, R) {
  const w = 1.0 + R() * 1.4, d = 0.8 + R() * 1.0, h = 0.7 + R() * 0.9, c = dLin(['#9aa0a4', '#b8bcbe', '#8a9094'][Math.floor(R() * 3)]);
  dBox(TH, cx - w / 2, y, cz - d / 2, cx + w / 2, y + h, cz + d / 2, c, DL_MET);
  dCyl(TH, cx, y + h, cz, Math.min(w, d) * 0.32, Math.min(w, d) * 0.32, y + h + 0.06, 10, dLin('#2a2c2e'), DL_MET);
}

/* ---------- one building ---------- */
// ctx: the block's builders (TH plain, SG signs, DG decals), its bounds (bx, bs), the curb, the district, the ring
function facadeBuilding(ctx, r, x0, z0, x1, z1, y0, h, style, col, seed, lit, shape) {
  if (!FAC.ok) return;
  const TH = ctx.TH, st = r.st || 'block', R = Z.mulberry32((r.s || 7) ^ 0x6a5c), ring = ctx.ring, near = ring <= 1;
  const masonry = style === D_STYLE.brick || style === D_STYLE.concrete || style === D_STYLE.stone, ws = FAC_WS[style] || 3, fh = FAC_FH[style] || 3.2;
  const faces = facFaces(x0, z0, x1, z1), edge = 4.5, b0 = ctx.bx, b1 = ctx.bx + ctx.bs;
  for (const F of faces) F.street = F.side === 'n' ? z0 < b0 + edge : F.side === 's' ? z1 > b1 - edge : F.side === 'w' ? x0 < b0 + edge : x1 > b1 - edge;
  const trim = dLin(style === D_STYLE.brick ? '#6a625a' : style === D_STYLE.stone ? '#8a8270' : '#7a7874'), A = style === D_STYLE.stone ? DL_STO : DL_CON;
  const box = shape !== 'tower';
  if (st === 'block' && style !== D_STYLE.ruin) {
    // the plinth at the foot of every face
    for (const F of faces) facBox(TH, F, -0.04, F.len + 0.04, y0, y0 + 0.45, 0, 0.05, dLin('#4a4844'), DL_STO);
    if (masonry && h >= 6.5) {
      // a string course over the ground floor and a stepped cornice at the top
      for (const F of faces) {
        facBox(TH, F, -0.06, F.len + 0.06, y0 + fh + 0.12, y0 + fh + 0.3, 0, 0.07, trim, A);   // (above the shop fascia)
        if (h < 34 && box) { const yt = y0 + h; facBox(TH, F, -0.12, F.len + 0.12, yt - 0.85, yt - 0.62, 0, 0.12, trim, A); facBox(TH, F, -0.25, F.len + 0.25, yt - 0.62, yt - 0.3, 0, 0.26, trim, A); facBox(TH, F, -0.4, F.len + 0.4, yt - 0.3, yt, 0, 0.42, trim, A); }
      }
    }
    // shops on the street side downtown (where the shader draws a storefront)
    if (style < 3.5 && style !== D_STYLE.glass && lit > 0) for (const F of faces) if (F.street && F.len > ws * 1.2) facStorefronts(ctx, F, style, fh, y0, seed + (F.side.charCodeAt(0) * 0.013), lit);
    // a fire escape up the street face of a brick walk-up
    const nf = Math.floor(h / fh);
    if (near && style === D_STYLE.brick && nf >= 3 && h < 32) {
      const sf = faces.filter(F => F.street && F.len > ws * 3).sort((a, b) => b.len - a.len)[0];
      if (sf && R() < 0.8) { const cells = Math.floor(sf.len / ws), at = Math.max(1, Math.floor(cells * (0.3 + R() * 0.4)) - 1); facFireEscape(TH, sf, at * ws + 0.15, nf, fh, y0, ws); FAC.esc++; }
    }
    // air conditioners in some windows (not on glass towers), street side only
    if (near && masonry) for (const F of faces) {
      if (!F.street) continue; const cells = Math.floor(F.len / ws);
      for (let fl = 1; fl < nf; fl++) for (let k = 0; k < cells; k++) if (R() < 0.07) { const ac = (k + 0.5) * ws, ay = y0 + fl * fh + fh * 0.26; facBox(TH, F, ac - 0.33, ac + 0.33, ay, ay + 0.42, 0, 0.42, dLin('#b8b4aa'), DL_MET); }
    }
    // the parapet's coping and what stands on the roof
    if (box && h > 9 && (x1 - x0) > 8) {
      const yt = y0 + h + 0.6, cp = dLin('#6a6862');
      dBox(TH, x0 - 0.05, yt, z0 - 0.05, x1 + 0.05, yt + 0.08, z0 + 0.32, cp, DL_CON); dBox(TH, x0 - 0.05, yt, z1 - 0.32, x1 + 0.05, yt + 0.08, z1 + 0.05, cp, DL_CON);
      dBox(TH, x0 - 0.05, yt, z0, x0 + 0.32, yt + 0.08, z1, cp, DL_CON); dBox(TH, x1 - 0.32, yt, z0, x1 + 0.05, yt + 0.08, z1, cp, DL_CON);
      const yr = y0 + h;
      if (style === D_STYLE.brick && h < 30 && R() < 0.6) facWaterTower(TH, x0 + 2.5 + R() * Math.max(0.1, x1 - x0 - 5), yr, z0 + 2.5 + R() * Math.max(0.1, z1 - z0 - 5), R);
      const nu = 1 + Math.floor(R() * 3); for (let i = 0; i < nu; i++) facRoofUnit(TH, x0 + 2 + R() * Math.max(0.1, x1 - x0 - 4), yr, z0 + 2 + R() * Math.max(0.1, z1 - z0 - 4), R);
      if (R() < 0.35) { const ax = x0 + 1.5 + R() * Math.max(0.1, x1 - x0 - 3), az = z0 + 1.5 + R() * Math.max(0.1, z1 - z0 - 3), ah = 4 + R() * 6; dCyl(TH, ax, yr, az, 0.06, 0.03, yr + ah, 5, dLin('#2a2c30'), DL_MET); dBox(TH, ax - 0.5, yr + ah * 0.7, az - 0.02, ax + 0.5, yr + ah * 0.7 + 0.04, az + 0.02, dLin('#2a2c30'), DL_MET); }
      if (h > 14 && R() < 0.18 && ctx.bio === 'city') {   // a billboard on its frame
        const F = faces.filter(q => q.street).sort((a, b) => b.len - a.len)[0];
        if (F && F.len > 9) { const bw = Math.min(10, F.len * 0.7), a0 = F.len / 2 - bw / 2, by = yr + 1.2; for (const s of [a0 + 0.6, a0 + bw - 0.6]) facBox(TH, F, s - 0.08, s + 0.08, yr, by + 3.4, -1.6, -1.44, dLin('#2a2c30'), DL_MET); facBox(TH, F, a0, a0 + bw, by, by + 3.4, -1.44, -1.3, dLin('#1a1a1c'), DL_MET);
          const ti = Math.floor(R() * FAC_COLS * FAC_ROWS), u0 = (ti % FAC_COLS) / FAC_COLS, v0 = 1 - (Math.floor(ti / FAC_COLS) + 1) / FAC_ROWS; facQuadSign(ctx.SG, F, a0 + 0.15, a0 + bw - 0.15, by + 0.15, by + 3.25, -1.29, u0, v0, u0 + 1 / FAC_COLS, v0 + 1 / FAC_ROWS, lit > 0 ? 0.4 : 0); }
      }
    }
  }
  // (1.9.9991) DRIFT: survivors' sheets out of the windows where someone holds out, flags on some roofs
  if (typeof driftSheet === 'function' && DRIFT.ok && near && st === 'block' && style !== D_STYLE.ruin) {
    const nf2 = Math.floor(h / fh);
    if (lit > 0 && nf2 >= 2 && R() < 0.22) { const F = faces.filter(q => q.street && q.len > ws * 2)[0]; if (F) { const cells = Math.floor(F.len / ws), k = Math.floor(R() * cells), fl = 1 + Math.floor(R() * Math.min(3, nf2 - 1)); driftSheet(ctx, F, (k + 0.5) * ws, y0 + fl * fh + fh * 0.78, R); } }
    if (masonry && box && h > 9 && h < 40 && R() < 0.12) driftFlag(ctx, x0 + 1.2, y0 + h + 0.6, z0 + 1.2, R);
  }
  // houses: a porch on the street side (its floor, posts, steps and roof) and a chimney
  if ((style === D_STYLE.siding || style === D_STYLE.logs) && near) {
    const F = faces.filter(q => q.street).sort((a, b) => b.len - a.len)[0] || faces[1];
    if (F && F.len > 6 && R() < 0.75) {
      const pw = Math.min(F.len - 1, 3 + R() * 4), a0 = (F.len - pw) / 2 + (R() - 0.5) * 1.5, a1 = a0 + pw, pd = 1.8 + R() * 0.6, wood = dLin(['#e8e2d6', '#c8b49a', '#8a6a4a'][Math.floor(R() * 3)]), floorH = y0 + 0.45, roofY = y0 + 2.7;
      facBox(TH, F, a0, a1, y0, floorH, 0, pd, dLin('#6a645a'), DL_PLK);
      for (const s of [a0 + 0.1, a1 - 0.22, a0 + pw / 2 - 0.06]) facBox(TH, F, s, s + 0.12, floorH, roofY, pd - 0.25, pd - 0.13, wood, DL_PLK);
      facSlope(TH, F, a0 - 0.15, a1 + 0.15, roofY + 0.45, 0, roofY, pd + 0.25, 0.08, col.map(v => v * 0.7), DL_SHI);
      for (let s = 0; s < 3; s++) facBox(TH, F, a0 + pw / 2 - 0.6, a0 + pw / 2 + 0.6, y0, floorH - s * 0.15, pd + s * 0.3, pd + (s + 1) * 0.3, dLin('#7a7268'), DL_CON);
      for (const s of [a0 + 0.1, a1 - 0.1]) void s;
      facBox(TH, F, a0, a1, floorH + 0.85, floorH + 0.92, pd - 0.2, pd - 0.14, wood, DL_PLK);   // the porch rail
    }
    if (R() < 0.7) { const ex = x0 + (x1 - x0) * (R() < 0.5 ? 0.18 : 0.82), ez = (z0 + z1) / 2 + (R() - 0.5) * (z1 - z0) * 0.3; if (lit > 0 && !r.burn) (ctx.smoke || (ctx.smoke = [])).push([ex, y0 + h + 1.4, ez]); dBox(TH, ex - 0.4, y0 + h * 0.5, ez - 0.4, ex + 0.4, y0 + h + 1.2, ez + 0.4, dLin('#6a3a2e'), DL('brick')); dBox(TH, ex - 0.46, y0 + h + 1.2, ez - 0.46, ex + 0.46, y0 + h + 1.32, ez + 0.46, dLin('#4a4844'), DL_CON); }
  }
  // the street's marks at eye level on the street faces (more downtown and in the chaos)
  if (ctx.DG && near && st !== 'barn') {
    const k = { city: 0.35, chaos: 0.6, burning: 0.4, ruins: 0.5, ash: 0.3, suburb: 0.15, desert: 0.1, snow: 0.1 }[ctx.bio] || 0.2;
    for (const F of faces) { if (!F.street || F.len < 3) continue; let m = Math.floor(F.len / 7); while (m-- > 0) if (R() < k) facDecal(ctx.DG, F, 1 + R() * (F.len - 2), y0 + 1.3 + R() * 0.9, 1.0 + R() * 0.9, Math.floor(R() * 16)); }
  }
  FAC.built++;
}
// the block's sign and decal meshes, once its buildings are done
function facadeChunkEnd(ctx, G0, keep) {
  if (typeof driftChunkEnd === 'function') { try { driftChunkEnd(ctx, G0, keep); } catch (e) { coreHurt('DRIFT', e); } }
  if (ctx.SG && ctx.SG.nv) { const g = dGeom(ctx.SG); g.setAttribute('aL', new THREE.Float32BufferAttribute(ctx.SG.a.filter((v, i) => i % 4 === 0), 1)); const m = new THREE.Mesh(g, FAC.mats.sign); m.receiveShadow = true; G0.add(m); keep.push(g); }
  if (ctx.DG && ctx.DG.nv) { const g = dGeom(ctx.DG); const m = new THREE.Mesh(g, FAC.mats.decal); m.receiveShadow = true; m.renderOrder = 2; G0.add(m); keep.push(g); }
}
function facadeFree() {
  for (const k of ['atlas', 'emis', 'decal', 'fence']) if (FAC[k]) { try { FAC[k].dispose(); } catch (e) { } FAC[k] = null; }
  for (const k in FAC.mats) { try { FAC.mats[k].dispose(); } catch (e) { } } FAC.mats = {}; FAC.ok = false;
}
// the self-test builds one brick walk-up with a street face in a scratch block and checks its parts came out
function facadeSelfTest() {
  if (!FAC.ok) return { ok: true, n: 0, pass: 0, why: 'resting (the 3D view is off)' };
  const ctx = { TH: dGB(), SG: dGB(), DG: dGB(), bx: 0, bs: 60, curb: 0.15, bio: 'chaos', ring: 0 }, r = { k: 'b', st: 'block', s: 4242 };
  const s0 = FAC.signs, e0 = FAC.esc; let tries = 0;
  while (FAC.esc === e0 && tries < 12) { r.s = 4242 + tries * 977; facadeBuilding(ctx, r, 2, 2, 22, 14, 0.15, 18, D_STYLE.brick, [0.2, 0.06, 0.04], 0.37, 0.3, 'box'); tries++; }
  const f0 = ctx.FN ? ctx.FN.nv : 0; facFence(ctx, { k: 'fence', wire: true, s: 3 }, 0, 0, 12, 0.12, 0); facFence(ctx, { k: 'fence', s: 4 }, 0, 4, 0.12, 14, 0); FAC.fences -= 2;
  const checks = [['a chain-link and a board fence cut from their bands', ctx.FN && ctx.FN.nv - f0 >= 8], ['a storefront run with its signs on the street face', FAC.signs > s0 && ctx.SG.nv >= 4], ['a fire escape up a brick walk-up', FAC.esc > e0], ['plinth, string course and cornice built', ctx.TH.nv > 200], ['every vertex is a number', !ctx.TH.p.some(v => !(v === v))]];
  FAC.built -= tries;
  const pass = checks.filter(c => c[1]).length;
  return FAC.tests = { ok: pass === checks.length, n: checks.length, pass: pass, why: checks.filter(c => !c[1]).map(c => c[0]).join('; ') };
}
coreDefine({ name: 'FACADE', kind: 'render', ver: 1, does: 'The buildings remade for the 3D view, and the fences: chain-link round the courts and lots, board fences between the yards, white pickets, iron railings and split-rail on the ranches, posts and rails and cut-out panels that cast their pattern as shadow; plinths, string courses, stepped cornices and copings on masonry, storefront runs with pilasters, painted, lettered and neon signs (lit at night where there is power, some flickering, some dead) and striped awnings, fire escapes up the brick walk-ups, air conditioners in windows, water towers, roof units, antennas and billboards, porches and chimneys on houses, graffiti, the search crews\' X codes and posters on the walls; the facade shader sets every window back in its wall with a sill and a lintel.',
  provides: ['buildings3d'], needs: ['DEPTH', 'SURFACE'],
  state: () => FAC.ok ? FAC.built + ' buildings dressed · ' + FAC.signs + ' signs · ' + FAC.esc + ' fire escapes · ' + FAC.decals + ' marks · ' + (FAC.fences || 0) + ' fences' : 'resting',
  check: () => FAC.ok && !FAC.atlas ? 'its sign atlas went missing' : '',
  repair: () => { facadeFree(); if (DEPTH.ok) facadeMats(); },
  selfTest: facadeSelfTest,
  docs: { what: 'The parts of the 3D buildings: trim, shops and signs, fire escapes, roofs, porches, marks.', how: 'Built into each block\'s meshes from the building\'s kind, district and seed; signs and marks from two canvas atlases.' }
});
