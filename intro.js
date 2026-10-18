/* ================= intro: DeclAIre Studios, then "Made with Claude" =================
   Card 1: a road is laid block by block, the player sprints across it with a stampede of the game's zombies behind,
   the skull rises laughing and bites the road; the frame punches red and black, then everything goes dark except the
   skull's red eyes, with the studio name slamming in below them.
   Card 2: the letters of CLAUDE orbit in 3D and lock into the word on the music's hit, a light ring circles it and
   shockwaves pulse on every beat; the card crossfades straight into the title screen.
   Tap (or Space/Enter/Esc, or Android Back) skips the current card. */
const INTRO = { on: false, card: 0, t: 0, gate: false, muted: false, musicPending: false, onZ: [], frozen: false, evI: 0, shake: 0, w: 1, h: 1, d: 1,
  blocks: [], cols: 0, B: 40, roadY: 0, RH: 120, runners: [], dust: [], debris: [], embers: [], sk: null, bite: null, dustT: 0 };
const IV = $('introCv'), IG = IV.getContext('2d'), INTRO_EL = $('intro');
const T1 = { build0: 0.35, build1: 2.25, paint: 2.4, rumble: 2.55, run: 3.0, skull: 6.0, laugh: 6.85, lunge: 8.3, bite: 8.6, eyes: 8.92, name: 9.35, end: 11.2 };
const T2 = { made: 1.0, hit: 2.25, final: 5.85, fade: 6.9, end: 8.0 };
// the "made with" card's music: the finale of "gods heaven" (cut and embedded at build time). The title lands on a
// beat at 2.22 s, the song's hard stop at 5.9 s closes the card; the light rays pulse on every beat.
const INTRO_MUSIC = '/*__INTROMUSIC__*/';
const INTRO_TRACK = { gain: 1.65, hit: 2.22, final: 5.66, fade: 6.6, end: 7.7,
  beats: [0.06, 0.47, 0.9, 1.34, 1.77, 2.22, 2.64, 3.06, 3.5, 3.93, 4.36, 4.78, 5.23, 5.66, 6.22, 6.76, 7.14, 7.47] };
const T2_SCORE = Object.assign({}, T2), SCORE_BEATS = [2.25, 3.6, 4.15, 4.7, 5.25, 5.85];

/* ---------- skull art: the game's own skull, rasterised in three layers so the jaw can move ---------- */
function introSkullArt() {
  const svg = $('skullArt'), ser = new XMLSerializer(), out = {};
  const mk = (keep, eyes) => {
    const c = svg.cloneNode(true);
    c.removeAttribute('class'); c.removeAttribute('id'); c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.setAttribute('width', '400'); c.setAttribute('height', '472');
    for (const sel of ['.sk-maw', '.sk-jaw', '.sk-head']) if (sel !== keep) { const n = c.querySelector(sel); if (n) n.remove(); }
    c.querySelectorAll('.sk-eye').forEach(e => { if (eyes) e.setAttribute('opacity', '1'); else e.remove(); });
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ser.serializeToString(c));
    return img;
  };
  out.maw = mk('.sk-maw'); out.jaw = mk('.sk-jaw'); out.head = mk('.sk-head', false); out.headLit = mk('.sk-head', true);
  return out;
}

/* ---------- set-up ---------- */
function introLayout() {
  const r = IV.getBoundingClientRect();
  INTRO.w = Math.max(1, r.width || W); INTRO.h = Math.max(1, r.height || H);
  INTRO.d = Math.max(0.6, Math.min(window.devicePixelRatio || 1, Q.dpr) * RES_STEPS[PERF.res]);
  IV.width = Math.round(INTRO.w * INTRO.d); IV.height = Math.round(INTRO.h * INTRO.d);
  const w = INTRO.w, h = INTRO.h, u = Math.min(w, h);
  INTRO.RH = clamp(u * 0.46, 140, 250); INTRO.B = INTRO.RH / 4; INTRO.roadY = h * 0.56;
  INTRO.cols = Math.ceil(w / INTRO.B) + 1;
}
function introBuild() {
  introLayout();
  const w = INTRO.w, B = INTRO.B, cols = INTRO.cols, span = T1.build1 - T1.build0 - 0.25, u = Math.min(INTRO.w, INTRO.h) / 480;
  INTRO.blocks = [];
  for (let c = 0; c < cols; c++) for (let r = -1; r < 5; r++) {
    INTRO.blocks.push({ c: c, r: r, ta: T1.build0 + c / cols * span + (r + 1) * 0.03, rot: rand(-0.5, 0.5), sh: rand(-6, 6) | 0, walk: r < 0 || r > 3 });
  }
  // the stampede: the player first, then a pack of the game's own mutations
  const n = Math.round(clamp(w / 7, 40, 72)), sp = (w + 160) / 1.55, s = clamp(Math.min(INTRO.w, INTRO.h) / 390, 1, 1.7);
  INTRO.runners = [{ kind: 'player', x: -40, y: INTRO.roadY, v: sp * 1.08, t0: T1.run, r: 17 * s, walk: 0 }];
  const pool = []; for (let i = 0; i < 1000; i += 7) if (!MUTS[i].unique) pool.push(MUTS[i]);
  for (let i = 0; i < n; i++) {
    const big = i % 13 === 6, m = pool[(i * 37 + 11) % pool.length];
    INTRO.runners.push({ kind: 'z', m: m, x: -60 - rand(0, 40), y: INTRO.roadY + (Math.random() < 0.15 ? rand(-0.72, 0.72) : rand(-0.44, 0.44)) * INTRO.RH, v: sp * rand(0.88, 1.18), t0: T1.run + 0.32 + Math.pow(i / n, 0.8) * 1.15,
      r: (big ? 30 : rand(12, 19)) * s, bob: rand(TAU), walk: 0 });
  }
  INTRO.dust = []; INTRO.debris = []; INTRO.embers = []; INTRO.bite = null; INTRO.shake = 0;
  INTRO.sk = { art: introSkullArt(), x: w / 2, y: INTRO.roadY - INTRO.RH * 0.8, s: 0, jaw: 0, lit: 0, open: 0 };
  introCity();
}

/* ---------- timeline events ---------- */
function introEvents(card) {
  const E = [];
  if (card === 1) {
    const cols = INTRO.cols, span = T1.build1 - T1.build0 - 0.25;
    for (let c = 0; c < cols; c++) E.push([T1.build0 + c / cols * span + 0.18, () => SFX.introBlock(c)]);
    E.push([T1.build1, () => SFX.introSettle()]);
    E.push([T1.paint, () => SFX.introPaint()]);
    E.push([T1.rumble, () => SFX.introStampede(3.4)]);
    E.push([T1.laugh, () => SFX.laugh()]);
    E.push([T1.bite, () => { SFX.bite(); introBite(); }]);
    E.push([T1.bite + 0.07, () => introFreeze()]);
    E.push([T1.eyes, () => introEyes()]);
    E.push([T1.name, () => { INTRO_EL.classList.add('studio'); SFX.introShing(); }]);
    E.push([T1.end, () => introCard(2)]);
  } else {
    E.push([0.05, () => { if (!introAudible()) { INTRO.musicPending = true; return; } if (!INTRO.track || !SFX.introTrack(0)) { INTRO.track = false; INTRO.scoreLen = SFX.introScore(); } }]);
    E.push([T2.fade, () => introFinish(true)]);
  }
  return E;
}
function introCard(n) {
  if (n === 2) {   // use the recorded track when it has decoded, otherwise the built-in orchestral score
    INTRO.track = !!(INTRO_MUSIC.length > 100 && SFX.introTrackReady());
    Object.assign(T2, INTRO.track ? { made: T2_SCORE.made, hit: INTRO_TRACK.hit, final: INTRO_TRACK.final, fade: INTRO_TRACK.fade, end: INTRO_TRACK.end } : T2_SCORE);
    INTRO.beats = INTRO.track ? INTRO_TRACK.beats : SCORE_BEATS; INTRO.word = null;
  }
  INTRO.card = n; INTRO.t = 0; INTRO.evI = 0; INTRO.ev = introEvents(n); INTRO.frozen = false;
  if (n === 2 && INTRO_EL.classList.contains('studio')) {   // the name fades out over the next card's opening
    const st = INTRO_EL.querySelector('.in-studio'); st.style.animation = 'none'; st.style.opacity = '1'; void st.offsetWidth;
    st.style.transition = 'opacity .8s ease'; st.style.opacity = '0';
    setTimeout(() => { st.style.animation = st.style.transition = st.style.opacity = ''; }, 900);
  }
  INTRO_EL.classList.remove('frozen', 'eyes', 'studio');   // the eyes fade out the same way (a transition on the layer)
  INTRO_EL.classList.add('card' + n); INTRO_EL.classList.remove('card' + (3 - n)); if (INTRO.muted) INTRO_EL.classList.add('muted');
  if (n === 2) { INTRO.embers = []; const k = Math.round(30 + Q.parts / 10); for (let i = 0; i < k; i++) INTRO.embers.push(newEmber(true)); }
}
function introBite() {
  const sk = INTRO.sk, bx = sk.x, by = INTRO.roadY;
  INTRO.bite = { x: bx, y: by, r: INTRO.RH * 0.62 };
  for (let i = 0; i < 46; i++) {
    const a = rand(-Math.PI, 0) + (Math.random() < 0.3 ? Math.PI : 0), s = rand(160, 620);
    INTRO.debris.push({ x: bx + rand(-30, 30), y: by + rand(-10, 20), vx: Math.cos(a) * s, vy: Math.sin(a) * s, sz: rand(3, 10), rot: rand(TAU), vr: rand(-12, 12), c: Math.random() < 0.7 ? '#2a2d33' : '#d6b450' });
  }
  INTRO.shake = 22; INTRO.flash = 1;
}
function introFreeze() {
  // draw one more frame so the debris is caught mid-air, then hold it and punch it red and black
  INTRO.flash = 0; drawIntro1(0.016);
  INTRO.frozen = true;
  INTRO_EL.classList.add('frozen');
  SFX.introSting();
}
// then the frame sinks into darkness and only the skull's eyes stay lit; the studio name lands below them
function introEyes() {
  const E = INTRO.eyePos; if (!E) return;
  const els = INTRO_EL.querySelectorAll('.in-eyes i');
  E.forEach((e, i) => { const el = els[i], d = e.r * 5.2; el.style.left = (e.x - d / 2) + 'px'; el.style.top = (e.y - d / 2) + 'px'; el.style.width = el.style.height = d + 'px'; });
  const st = INTRO_EL.querySelector('.in-studio');
  st.style.top = Math.min(INTRO.h * 0.78, E[0].y + E[0].r * 3.4) + 'px';
  INTRO_EL.classList.add('eyes');
  SFX.introEyes();
}

/* ---------- drawing helpers ---------- */
function easeOutBack(k) { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }
function drawRunner(g, x, y, r, walk) {
  const k = r / 13;
  g.save(); g.translate(x, y); g.scale(k, k);
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(2, 4, 13, 12, 0, 0, TAU); g.fill();
  const sw = Math.sin(walk) * 4;
  g.fillStyle = '#2b2f2a'; g.fillRect(-12, -7, 7, 14);
  g.fillStyle = '#3e4a3a'; g.beginPath(); g.ellipse(0, 0, 9, 13, 0, 0, TAU); g.fill();
  g.fillStyle = '#f2cc3a'; g.fillRect(-4, -12, 3, 24); g.fillRect(2, -11, 2, 22);
  g.strokeStyle = '#c9a27e'; g.lineWidth = 4.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(2, -8); g.lineTo(9 + sw, -11); g.moveTo(2, 8); g.lineTo(9 - sw, 11); g.stroke();
  g.fillStyle = '#c9a27e'; g.beginPath(); g.arc(2, 0, 6.5, 0, TAU); g.fill();
  g.fillStyle = '#2d332b'; g.beginPath(); g.arc(0.5, 0, 6.6, Math.PI * 0.5, Math.PI * 1.5); g.fill(); g.fillRect(2, -6.6, 4, 2.4);
  g.restore();
}
function drawRoadBlocks(g, t) {
  const B = INTRO.B, top = INTRO.roadY - INTRO.RH / 2, built = clamp((t - T1.build1) / 0.35, 0, 1);
  if (built > 0) { g.fillStyle = '#24272c'; g.fillRect(0, top, INTRO.w, INTRO.RH); g.fillStyle = '#34383f'; g.fillRect(0, top - B, INTRO.w, B); g.fillRect(0, top + INTRO.RH, INTRO.w, B); }
  for (const b of INTRO.blocks) {
    const k = clamp((t - b.ta) / 0.22, 0, 1); if (k <= 0) continue;
    const e = easeOutBack(k), sc = 1 + (1 - e) * 0.7, x = b.c * B + B / 2, y = top + b.r * B + B / 2;
    g.save(); g.translate(x, y); g.rotate(b.rot * (1 - e)); g.scale(sc, sc); g.globalAlpha = Math.min(1, k * 2.2);
    const v = (b.walk ? 52 : 36) + b.sh;
    g.fillStyle = 'rgb(' + v + ',' + (v + 4) + ',' + (v + 10) + ')'; g.fillRect(-B / 2, -B / 2, B, B);
    if (b.walk) { g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 1.5; g.strokeRect(-B / 2 + 3, -B / 2 + 3, B - 6, B - 6); }
    const gr = 1 - built;
    if (gr > 0) {
      g.globalAlpha *= gr;
      g.fillStyle = 'rgba(255,255,255,0.09)'; g.fillRect(-B / 2, -B / 2, B, 2.5); g.fillRect(-B / 2, -B / 2, 2.5, B);
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(-B / 2, B / 2 - 3, B, 3); g.fillRect(B / 2 - 3, -B / 2, 3, B);
    }
    g.restore();
  }
  g.globalAlpha = 1;
  if (built > 0) {   // curbs wipe in, then the lane paint is sprayed left to right
    const cw = INTRO.w * built, ch = Math.max(5, B * 0.16);
    g.fillStyle = '#4a4e55'; g.fillRect(0, top - ch, cw, ch); g.fillRect(0, top + INTRO.RH, cw, ch);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, top - 2, cw, 2); g.fillRect(0, top + INTRO.RH + ch, cw, 2);
  }
  const pk = clamp((t - T1.paint) / 0.45, 0, 1);
  if (pk > 0) {
    const px = INTRO.w * pk;
    g.fillStyle = 'rgba(214,180,80,0.85)';
    for (let x = 14; x < px; x += 52) g.fillRect(x, INTRO.roadY - 3, Math.min(30, px - x), 6);
    g.fillStyle = 'rgba(230,226,214,0.55)'; g.fillRect(0, top + 9, px, 3.5); g.fillRect(0, top + INTRO.RH - 12.5, px, 3.5);
  }
}
function drawBite(g) {
  const b = INTRO.bite; if (!b) return;
  // a bite taken out of the road: a dark hole with a toothed rim, and cracks running out of it
  g.fillStyle = '#050405'; g.beginPath();
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + i / n * Math.PI, rr = b.r * (i % 2 ? 0.86 : 1.02);
    const x = b.x + Math.cos(a) * rr * 1.25, y = b.y + 6 + Math.sin(a) * rr * 0.62;
    if (i) g.lineTo(x, y); else g.moveTo(x, y);
  }
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI, rr = b.r * (i % 2 ? 0.86 : 1.02);
    g.lineTo(b.x - Math.cos(a) * rr * 1.25 + 0, b.y + 6 + Math.sin(a) * rr * 0.52);
  }
  g.closePath(); g.fill();
  g.strokeStyle = 'rgba(230,226,214,0.7)'; g.lineWidth = 2; g.lineCap = 'round';
  const seeds = [[-1, -0.2], [1, -0.3], [-0.6, 0.9], [0.7, 0.85], [-1.2, 0.4], [1.3, 0.3]];
  for (const s of seeds) {
    let x = b.x + s[0] * b.r * 1.2, y = b.y + s[1] * b.r * 0.6; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += s[0] * b.r * 0.32 + (k % 2 ? 8 : -8); y += s[1] * b.r * 0.22 + (k % 2 ? -6 : 6); g.lineTo(x, y); }
    g.stroke();
  }
}
function drawSkull(g, t) {
  const sk = INTRO.sk, A = sk.art; if (!A || !A.head.complete) return;
  if (t < T1.skull) return;
  // rise, laugh, lunge
  let s = 1, y = sk.y, jaw = 0, lit = 0, rot = 0;
  const rk = clamp((t - T1.skull) / 0.85, 0, 1);
  s = rk < 1 ? 0.2 + 0.95 * easeOutBack(rk) : 1.0;
  y = sk.y + (1 - rk) * INTRO.RH * 0.9;
  lit = clamp((t - T1.skull - 0.5) / 0.3, 0, 1);
  if (t >= T1.laugh && t < T1.lunge) { const lt = t - T1.laugh; jaw = 0.5 + 0.5 * Math.sin(lt * 44); rot = Math.sin(lt * 9) * 0.06; y += Math.sin(lt * 18) * 3; }
  const base = Math.min(INTRO.w * 0.62, INTRO.h * 0.36), BS = 1.4, biteY = INTRO.roadY - 48 * base * BS / 200;
  if (t >= T1.lunge) {
    const lk = clamp((t - T1.lunge) / (T1.bite - T1.lunge), 0, 1), e = lk * lk;
    s = 1 + e * (BS - 1); y = sk.y + (biteY - sk.y) * e; jaw = lk < 0.85 ? 1 : 0; rot = 0;
  }
  if (t >= T1.bite) { jaw = 0; s = BS; y = biteY; }
  const size = base * s, k = size / 200;
  if (t >= T1.bite) {
    const C = INTRO.cam || { z: 1, x: 0, y: 0 }, P = (px, py) => ({ x: C.x + (px - C.x) * C.z, y: C.y + (py - C.y) * C.z });
    INTRO.eyePos = [68, 132].map(ex => Object.assign(P(sk.x + (ex - 100) * k, y + (106 - 118) * k), { r: 15 * k * C.z }));
  }
  g.save(); g.translate(sk.x, y); g.rotate(rot); g.scale(k, k); g.translate(-100, -118);
  const jy = jaw * 34;
  if (jaw > 0.05) { g.globalAlpha = jaw; g.drawImage(A.maw, 0, 0, 200, 236); g.globalAlpha = 1; }
  g.save(); g.translate(100, 166); g.rotate(jaw * 0.05); g.translate(-100, -166 + jy); g.drawImage(A.jaw, 0, 0, 200, 236); g.restore();
  g.save(); g.translate(0, -jaw * 6); g.drawImage(A.head, 0, 0, 200, 236);
  if (lit > 0 && A.headLit.complete) { g.globalAlpha = lit * (0.75 + 0.25 * Math.sin(t * 14)); g.drawImage(A.headLit, 0, 0, 200, 236); g.globalAlpha = 1; }
  g.restore();
  if (lit > 0) {   // eye glow
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = lit * 0.55;
    for (const ex of [68, 132]) { const gr = g.createRadialGradient(ex, 106 - jaw * 6, 2, ex, 106 - jaw * 6, 40); gr.addColorStop(0, 'rgba(255,60,80,0.9)'); gr.addColorStop(1, 'rgba(255,60,80,0)'); g.fillStyle = gr; g.fillRect(ex - 40, 66 - jaw * 6, 80, 80); }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }
  g.restore();
}

/* ---------- the city around the road (1.9.60) ----------
   Rooftops seen from above fill the space on both sides of the road. They drop into place block by block as the road
   is laid, the street lamps come on in a wave, a roof catches fire and a police car flashes in an alley once the
   stampede comes, and when the skull laughs the lights flicker and die one by one. */
let IGLOW = null;
function introGlow() {
  if (IGLOW) return IGLOW;
  IGLOW = {};
  for (const [k, c] of [['warm', '255,196,120'], ['red', '255,50,60'], ['blue', '70,120,255'], ['fire', '255,120,40'], ['white', '235,235,255']]) {
    const cv2 = document.createElement('canvas'); cv2.width = cv2.height = 128; const g = cv2.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(' + c + ',0.9)'); gr.addColorStop(0.35, 'rgba(' + c + ',0.35)'); gr.addColorStop(1, 'rgba(' + c + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); IGLOW[k] = cv2;
  }
  return IGLOW;
}
const IROOFS = [[52, 56, 63], [58, 55, 52], [47, 53, 50], [61, 60, 58], [44, 48, 56], [66, 58, 50], [50, 50, 54]];
function introCity() {
  const w = INTRO.w, h = INTRO.h, B = INTRO.B, top = INTRO.roadY - INTRO.RH / 2, span = T1.build1 - T1.build0 - 0.25;
  const C = { bld: [], lamps: [], props: [], smoke: [], embers: [], fog: [], streets: [], trees: [] };
  const upEdge = top - B - 3, dnEdge = top + INTRO.RH + B + 3;
  const lite = PERF.tier <= 0;
  // side streets run off the main road, up and down, which breaks up the blocks
  const nst = w < 700 ? 1 : w < 1150 ? 2 : 3, spots = nst === 1 ? [rand(0.15, 0.3)] : nst === 2 ? [rand(0.14, 0.3), rand(0.6, 0.8)] : [rand(0.12, 0.3), rand(0.52, 0.66), rand(0.82, 0.95)];
  for (const fx of spots) C.streets.push({ x: fx * w, w: B * rand(1.5, 1.9), up: Math.random() < 0.8, dn: Math.random() < 0.8, ta: T1.build0 + fx * span + 0.05 });
  const inStreet = (x0, x1, side) => C.streets.some(st => (side < 0 ? st.up : st.dn) && x1 > st.x - st.w / 2 - 6 && x0 < st.x + st.w / 2 + 6);
  // rows of buildings outward from the road until the screen edge is covered (a little past it for the camera zoom)
  const rows = (side) => {
    let edge = side < 0 ? upEdge : dnEdge, row = 0;
    while (side < 0 ? edge > -60 : edge < h + 60) {
      const depth = B * rand(1.6, 3.4) + (row ? B * 0.6 : 0), gapY = row ? B * rand(0.25, 0.5) : 0;
      let x = -50 - rand(0, B * 2);
      while (x < w + 50) {
        const bw = B * rand(1.7, 3.8), alley = Math.random() < 0.35 ? 0 : B * rand(0.3, 0.75);
        const blocked = C.streets.find(st => (side < 0 ? st.up : st.dn) && x + bw > st.x - st.w / 2 - 6 && x < st.x + st.w / 2 + 6);
        if (blocked) { x = blocked.x + blocked.w / 2 + 8; continue; }
        if (row > 0 && Math.random() < 0.1) {   // an empty lot with a couple of trees
          const ly = side < 0 ? edge - gapY - depth * 0.5 : edge + gapY + depth * 0.5;
          for (let i = 0; i < 3; i++) C.trees.push({ x: x + bw * rand(0.2, 0.8), y: ly + rand(-0.3, 0.3) * depth, r: B * rand(0.35, 0.6), ta: T1.build0 + clamp(x / w, 0, 1) * span + 0.3 });
          x += bw + alley; continue;
        }
        const y = side < 0 ? edge - gapY - depth : edge + gapY, dd = depth * rand(0.82, 1);
        const b = { x: x, y: side < 0 ? y + (depth - dd) : y, w: bw, d: dd, side: side, row: row, col: IROOFS[(Math.random() * IROOFS.length) | 0], sh: rand(-6, 6),
          ta: T1.build0 + clamp((x + bw / 2) / w, 0, 1) * span + 0.1 + row * 0.12 + rand(0, 0.12), det: [], win: [] };
        // rooftop details
        const n = lite ? 1 : 2 + ((Math.random() * 4) | 0);
        for (let i = 0; i < n; i++) {
          const k = Math.random();
          b.det.push({ k: k < 0.35 ? 'ac' : k < 0.55 ? 'vent' : k < 0.7 ? 'tank' : k < 0.85 ? 'sky' : 'ant', u: rand(0.12, 0.88), v: rand(0.18, 0.7), s: rand(0.7, 1.2) });
        }
        // facade windows facing south (the road, for the row above it)
        if (bw > B * 2.5 && Math.random() < 0.5) b.top = { u: rand(0.1, 0.35), v: rand(0.1, 0.3), w: rand(0.35, 0.55), h: rand(0.35, 0.55) };   // a taller part of the building
        const nw = Math.max(2, Math.floor(bw / (B * 0.34)));
        for (let i = 0; i < nw; i++) b.win.push({ lit: Math.random() < 0.38, tv: Math.random() < 0.12, ph: rand(TAU), off: rand(0.2, 1) });
        C.bld.push(b);
        if (alley > B * 0.45 && Math.random() < 0.3) C.trees.push({ x: x + bw + alley / 2, y: side < 0 ? edge - gapY - depth * rand(0.2, 0.8) : edge + gapY + depth * rand(0.2, 0.8), r: Math.min(alley * 0.55, B * 0.5), ta: T1.build0 + clamp(x / w, 0, 1) * span + 0.3 });
        else if (alley > B * 0.5 && Math.random() < 0.45) C.props.push({ k: Math.random() < 0.55 ? 'car' : 'bin', x: x + bw + alley / 2, y: side < 0 ? edge - gapY - depth * rand(0.3, 0.7) : edge + gapY + depth * rand(0.3, 0.7), a: rand(-0.3, 0.3) + (Math.random() < 0.5 ? Math.PI / 2 : 0), c: ['#5a2a26', '#2c3d52', '#3d3f44', '#4a4434', '#202326'][(Math.random() * 5) | 0], burnt: Math.random() < 0.3, ta: b.ta + 0.2 });
        x += bw + alley;
      }
      edge = side < 0 ? edge - gapY - depth : edge + gapY + depth; row++;
      if (row > 8) break;
    }
  };
  rows(-1); rows(1);
  // one burning roof up top, one police car in an alley below
  const near = (side, fx) => C.bld.filter(b => b.side === side && b.row === 0).sort((a, b) => Math.abs(a.x + a.w / 2 - w * fx) - Math.abs(b.x + b.w / 2 - w * fx))[0];
  const fb = near(-1, 0.74); if (fb) fb.fire = true;
  const pb = near(1, 0.24); if (pb) C.props.push({ k: 'police', x: pb.x + pb.w + B * 0.35, y: dnEdge + B * 0.9, a: Math.PI / 2 + 0.2, ta: T1.build1 });
  // street lamps on both sidewalks
  for (let x = B * 2.2, i = 0; x < w + B; x += B * 4.6, i++) {
    C.lamps.push({ x: x, y: top - B * 0.82, ny: top + B * 0.2, on: T1.build1 + 0.12 + x / w * 0.5, die: T1.lunge - 0.5 + rand(0, 0.45), flick: Math.random() < 0.18, ph: rand(TAU) });
    C.lamps.push({ x: x + B * 2.3, y: top + INTRO.RH + B * 0.82, ny: top + INTRO.RH - B * 0.2, on: T1.build1 + 0.2 + (x + B * 2.3) / w * 0.5, die: T1.lunge - 0.5 + rand(0, 0.45), flick: Math.random() < 0.18, ph: rand(TAU) });
  }
  // drifting fog over the rooftops
  if (!lite) for (let i = 0; i < 7; i++) C.fog.push({ x: rand(-0.2, 1.1) * w, y: i % 2 ? rand(0, upEdge) : rand(dnEdge, h), r: rand(0.18, 0.34) * Math.max(w, h), v: rand(6, 16) });
  INTRO.city = C;
}
function drawCar(g, x, y, a, len, col, burnt) {
  g.save(); g.translate(x, y); g.rotate(a);
  const L = len, Wd = len * 0.46;
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-L / 2 + 3, -Wd / 2 + 3, L, Wd);
  g.fillStyle = burnt ? '#1b1a19' : col; g.beginPath(); g.roundRect ? g.roundRect(-L / 2, -Wd / 2, L, Wd, Wd * 0.3) : g.rect(-L / 2, -Wd / 2, L, Wd); g.fill();
  g.fillStyle = burnt ? '#0c0b0b' : 'rgba(140,170,190,0.55)'; g.fillRect(L * 0.08, -Wd * 0.36, L * 0.18, Wd * 0.72); g.fillRect(-L * 0.34, -Wd * 0.34, L * 0.12, Wd * 0.68);
  g.fillStyle = burnt ? '#2a2522' : 'rgba(255,255,255,0.08)'; g.fillRect(-L * 0.2, -Wd * 0.38, L * 0.26, Wd * 0.76);
  g.restore();
}
// rooftops, alleys and props (drawn before the road)
function drawCity(g, t, dt) {
  const C = INTRO.city; if (!C) return;
  const B = INTRO.B, dark = t > T1.lunge ? clamp((t - T1.lunge) / 0.3, 0, 1) : 0, glow = introGlow();
  const top = INTRO.roadY - INTRO.RH / 2, bot = top + INTRO.RH;
  for (const st of C.streets) {
    const k = clamp((t - st.ta) / 0.4, 0, 1); if (k <= 0) continue;
    g.globalAlpha = k;
    const x0 = st.x - st.w / 2, len = Math.max(INTRO.h, 400) * k;
    g.fillStyle = '#1d2024';
    if (st.up) g.fillRect(x0, top - B - len, st.w, len);
    if (st.dn) g.fillRect(x0, bot + B, st.w, len);
    g.fillStyle = '#34383f';
    if (st.up) { g.fillRect(x0 - B * 0.28, top - B - len, B * 0.28, len); g.fillRect(x0 + st.w, top - B - len, B * 0.28, len); }
    if (st.dn) { g.fillRect(x0 - B * 0.28, bot + B, B * 0.28, len); g.fillRect(x0 + st.w, bot + B, B * 0.28, len); }
    if (t > T1.paint) {
      g.fillStyle = 'rgba(214,180,80,0.6)';
      if (st.up) for (let y = top - B - 30; y > top - B - len; y -= 46) g.fillRect(st.x - 2, y, 4, 24);
      if (st.dn) for (let y = bot + B + 8; y < bot + B + len; y += 46) g.fillRect(st.x - 2, y, 4, 24);
      g.fillStyle = 'rgba(230,226,214,0.4)';   // a crosswalk where it meets the main road
      for (let i = 0; i < 5; i++) { const xx = x0 + 4 + i * (st.w - 8) / 5; if (st.up) g.fillRect(xx, top - B * 0.9, (st.w - 8) / 10, B * 0.7); if (st.dn) g.fillRect(xx, bot + B * 0.2, (st.w - 8) / 10, B * 0.7); }
    }
  }
  g.globalAlpha = 1;
  for (const b of C.bld) {
    const k = clamp((t - b.ta) / 0.32, 0, 1); if (k <= 0) continue;
    const e = easeOutBack(k), sc = 0.55 + 0.45 * e, cx = b.x + b.w / 2, cy = b.y + b.d / 2;
    g.save(); g.translate(cx, cy); g.scale(sc, sc); g.translate(-cx, -cy); g.globalAlpha = Math.min(1, k * 2);
    const fh = Math.min(B * 0.38, b.d * 0.22), rh = b.d - fh, [r0, g0, b0] = b.col, v = b.sh;
    // shadow on the ground, light from the top left
    g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect(b.x + 6, b.y + 6, b.w, b.d);
    // roof
    g.fillStyle = 'rgb(' + (r0 + v) + ',' + (g0 + v) + ',' + (b0 + v) + ')'; g.fillRect(b.x, b.y, b.w, rh);
    g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(b.x, b.y, b.w, 2); g.fillRect(b.x, b.y, 2, rh);
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2; g.strokeRect(b.x + 4, b.y + 4, b.w - 8, rh - 8);
    if (b.top) {
      const tx = b.x + b.top.u * b.w, ty = b.y + b.top.v * rh, tw = b.top.w * b.w, th = b.top.h * rh;
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(tx + 5, ty + 5, tw, th);
      g.fillStyle = 'rgb(' + (r0 + v + 9) + ',' + (g0 + v + 9) + ',' + (b0 + v + 10) + ')'; g.fillRect(tx, ty, tw, th);
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(tx, ty, tw, 2); g.fillRect(tx, ty, 2, th);
    }
    for (const q of b.det) {
      const x = b.x + q.u * b.w, y = b.y + q.v * rh, s = B * 0.22 * q.s;
      if (q.k === 'ac') { g.fillStyle = '#7b8088'; g.fillRect(x - s, y - s * 0.7, s * 2, s * 1.4); g.fillStyle = '#2c3036'; g.beginPath(); g.arc(x, y, s * 0.5, 0, TAU); g.fill(); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - s + 2, y + s * 0.7, s * 2, 3); }
      else if (q.k === 'vent') { g.fillStyle = '#3a3e44'; g.fillRect(x - s * 0.5, y - s * 0.5, s, s); g.fillStyle = '#9aa0a8'; g.fillRect(x - s * 0.35, y - s * 0.35, s * 0.7, s * 0.2); }
      else if (q.k === 'tank') { g.fillStyle = '#5b4a38'; g.beginPath(); g.arc(x, y, s * 0.95, 0, TAU); g.fill(); g.strokeStyle = '#3a2f24'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, s * 0.6, 0, TAU); g.stroke(); }
      else if (q.k === 'sky') { g.fillStyle = 'rgba(150,190,210,0.28)'; g.fillRect(x - s * 1.2, y - s * 0.6, s * 2.4, s * 1.2); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.strokeRect(x - s * 1.2, y - s * 0.6, s * 2.4, s * 1.2); }
      else { g.strokeStyle = '#8a9099'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * 1.6, y - s * 1.2); g.moveTo(x + s * 0.5, y - s * 0.35); g.lineTo(x + s * 0.9, y + s * 0.2); g.stroke(); if (Math.sin(t * 5 + q.u * 9) > 0.6 && !dark) { g.fillStyle = '#ff3a3a'; g.fillRect(x + s * 1.6 - 1.5, y - s * 1.2 - 1.5, 3, 3); } }
    }
    if (b.fire && t > T1.rumble) {   // a hole burnt through the roof
      const fx = b.x + b.w * 0.5, fy = b.y + rh * 0.5;
      g.fillStyle = '#0b0807'; g.beginPath(); g.ellipse(fx, fy, b.w * 0.26, rh * 0.28, 0.2, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,' + (110 + Math.sin(t * 23) * 30 | 0) + ',30,0.9)'; g.beginPath(); g.ellipse(fx, fy, b.w * 0.17 * (0.9 + Math.sin(t * 17) * 0.1), rh * 0.17, 0, 0, TAU); g.fill();
    }
    // facade with windows along the south edge
    g.fillStyle = 'rgb(' + (r0 * 0.55 | 0) + ',' + (g0 * 0.55 | 0) + ',' + (b0 * 0.6 | 0) + ')'; g.fillRect(b.x, b.y + rh, b.w, fh);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(b.x, b.y + rh, b.w, 2);
    const n = b.win.length, ww = b.w / n;
    for (let i = 0; i < n; i++) {
      const q = b.win[i]; let on = q.lit && t > b.ta + 0.4 * q.off + 0.3;
      if (on && dark > q.off) on = false;
      if (on && t > T1.laugh && t < T1.lunge && Math.sin(t * 31 + q.ph) > 0.4) on = false;
      g.fillStyle = on ? (q.tv ? 'rgba(120,170,255,' + (0.55 + 0.3 * Math.sin(t * 9 + q.ph)) + ')' : 'rgba(255,206,120,0.82)') : 'rgba(8,10,14,0.45)';
      g.fillRect(b.x + i * ww + ww * 0.22, b.y + rh + fh * 0.28, ww * 0.56, fh * 0.46);
    }
    g.restore();
  }
  g.globalAlpha = 1;
  for (const q of C.trees) {
    const k = clamp((t - q.ta) / 0.3, 0, 1); if (k <= 0) continue;
    const r = q.r * (0.6 + 0.4 * easeOutBack(k)), sw = Math.sin(t * 1.6 + q.x * 0.03) * 1.2;
    g.globalAlpha = Math.min(1, k * 2);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(q.x + 5, q.y + 6, r, 0, TAU); g.fill();
    g.fillStyle = '#1f3324'; g.beginPath(); g.arc(q.x + sw, q.y, r, 0, TAU); g.fill();
    g.fillStyle = '#2b4630'; g.beginPath(); g.arc(q.x + sw - r * 0.25, q.y - r * 0.25, r * 0.62, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  for (const q of C.props) {
    const k = clamp((t - q.ta) / 0.3, 0, 1); if (k <= 0) continue;
    g.globalAlpha = k;
    if (q.k === 'bin') { g.save(); g.translate(q.x, q.y); g.rotate(q.a); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-B * 0.3 + 3, -B * 0.2 + 3, B * 0.6, B * 0.4); g.fillStyle = '#2f4a35'; g.fillRect(-B * 0.3, -B * 0.2, B * 0.6, B * 0.4); g.fillStyle = '#1e3022'; g.fillRect(-B * 0.3, -B * 0.2, B * 0.6, B * 0.1); g.restore(); }
    else drawCar(g, q.x, q.y, q.a, B * 1.25, q.k === 'police' ? '#e8e6e0' : q.c, q.burnt);
    if (q.k === 'police' && t > T1.rumble && !dark) { g.fillStyle = Math.sin(t * 18) > 0 ? '#ff3344' : '#3d6bff'; g.beginPath(); g.arc(q.x, q.y, B * 0.1, 0, TAU); g.fill(); }
  }
  g.globalAlpha = 1;
}
// light falling on the street: lamps, the fire and the police lights (drawn after the road, before the runners)
function drawCityLights(g, t, dt) {
  const C = INTRO.city; if (!C) return;
  const B = INTRO.B, glow = introGlow(), dark = t > T1.lunge;
  g.globalCompositeOperation = 'lighter';
  for (const L of C.lamps) {
    let on = t > L.on && t < L.die;
    if (on && t - L.on < 0.25) on = Math.sin((t - L.on) * 60) > -0.2;          // a buzz as it comes on
    if (on && L.flick && Math.sin(t * 13 + L.ph) + Math.sin(t * 29 + L.ph) > 1.3) on = false;
    if (on && t > T1.laugh && Math.sin(t * 40 + L.ph * 3) > 0.55) on = false;   // the skull's laugh shakes the power
    if (!on) continue;
    const R = B * 2.4;
    g.globalAlpha = 0.55; g.drawImage(glow.warm, L.x - R, L.ny - R * 0.62, R * 2, R * 1.24);
    g.globalAlpha = 0.9; g.drawImage(glow.warm, L.x - B * 0.35, L.y - B * 0.35, B * 0.7, B * 0.7);
  }
  if (!dark && t > T1.rumble) {
    const fb = C.bld.find(b => b.fire);
    if (fb) { const fl = 0.75 + 0.25 * Math.sin(t * 19) * Math.sin(t * 7.3), R = B * 3.2 * fl; g.globalAlpha = 0.6; g.drawImage(glow.fire, fb.x + fb.w / 2 - R, fb.y + fb.d * 0.4 - R, R * 2, R * 2); }
    const pc = C.props.find(q => q.k === 'police');
    if (pc) { const red = Math.sin(t * 18) > 0, R = B * 2.6; g.globalAlpha = 0.5; g.drawImage(red ? glow.red : glow.blue, pc.x - R, pc.y - R, R * 2, R * 2); }
  }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  // smoke and embers from the fire, fog drifting over the roofs
  const fb = C.bld.find(b => b.fire);
  if (fb && t > T1.rumble && !INTRO.frozen) {
    if (Math.random() < dt * 9 && C.smoke.length < 26) C.smoke.push({ x: fb.x + fb.w / 2 + rand(-8, 8), y: fb.y + fb.d * 0.4, r: B * 0.3, life: 2.6, max: 2.6 });
    if (Math.random() < dt * 22 && C.embers.length < 50) C.embers.push({ x: fb.x + fb.w / 2 + rand(-10, 10), y: fb.y + fb.d * 0.4, vx: rand(10, 40), vy: -rand(30, 80), life: rand(0.8, 1.8) });
  }
  if (!INTRO.frozen) {
    for (const q of C.smoke) { q.life -= dt; q.r += dt * B * 0.5; q.x += dt * 22; q.y -= dt * 14; }
    for (const q of C.embers) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx += Math.sin(t * 3 + q.y * 0.05) * 20 * dt; }
    C.smoke = C.smoke.filter(q => q.life > 0); C.embers = C.embers.filter(q => q.life > 0);
    for (const f of C.fog) { f.x += f.v * dt; if (f.x - f.r > INTRO.w + 40) f.x = -f.r; }
  }
  for (const q of C.smoke) { g.globalAlpha = clamp(q.life / q.max, 0, 1) * 0.3; g.fillStyle = '#2a2a2c'; g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.fill(); }
  g.fillStyle = '#ffb04a'; for (const q of C.embers) { g.globalAlpha = clamp(q.life, 0, 1); g.fillRect(q.x, q.y, 2, 2); }
  const fa = clamp((t - T1.build1) / 1.2, 0, 1) * 0.07;
  if (fa > 0) for (const f of C.fog) { g.globalAlpha = fa; g.drawImage(glow.white, f.x - f.r, f.y - f.r * 0.5, f.r * 2, f.r); }
  g.globalAlpha = 1;
}

/* ---------- card 1 ---------- */
function drawIntro1(dt) {
  const g = IG, t = INTRO.t, w = INTRO.w, h = INTRO.h, d = INTRO.d;
  g.setTransform(d, 0, 0, d, 0, 0);
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  let sx = 0, sy = 0;
  if (INTRO.shake > 0.2 && !RM) { sx = rand(-0.5, 0.5) * INTRO.shake; sy = rand(-0.5, 0.5) * INTRO.shake; }
  INTRO.shake *= Math.exp(-dt * 6);
  // the camera eases in on the skull while it laughs and lunges
  const cz = 1 + 0.12 * Math.pow(clamp((t - T1.skull) / (T1.bite - T1.skull), 0, 1), 1.6), czx = w / 2, czy = INTRO.roadY - INTRO.RH * 0.3;
  INTRO.cam = { z: cz, x: czx, y: czy };
  g.setTransform(d * cz, 0, 0, d * cz, (sx + czx - czx * cz) * d, (sy + czy - czy * cz) * d);
  const amb = clamp((t - T1.build1) / 0.8, 0, 1);
  if (amb > 0) { g.globalAlpha = amb; g.fillStyle = '#0d1014'; g.fillRect(-30, -30, w + 60, h + 60); g.globalAlpha = 1; }
  // build the stampede's sprites a few per frame while the road is laid, so nothing hitches when they arrive
  if (t < T1.run) { let k = 0; for (const r of INTRO.runners) { if (r.kind === 'z' && !r.warm) { getSprite(r.m, r.r, true); r.warm = 1; if (++k >= 4) break; } } }
  drawCity(g, t, dt);
  drawRoadBlocks(g, t);
  drawBite(g);
  drawCityLights(g, t, dt);
  // runners, dust behind them
  let onScreen = 0;
  for (const q of INTRO.dust) { q.life -= dt; q.r += dt * 30; q.x += q.vx * dt; }
  INTRO.dust = INTRO.dust.filter(q => q.life > 0);
  for (const q of INTRO.dust) { g.globalAlpha = clamp(q.life / q.max, 0, 1) * 0.35; g.fillStyle = '#6a6052'; g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  INTRO.dustT -= dt;
  const puff = INTRO.dustT <= 0; if (puff) INTRO.dustT = 0.05;
  const byY = INTRO.runners.slice().sort((a, b) => a.y - b.y);
  INTRO.onZ.length = 0;
  for (const r of byY) {
    if (t < r.t0) continue;
    if (!INTRO.frozen) { r.x += r.v * dt; r.walk += dt * 18; }
    if (r.x < -80 || r.x > w + 80) continue;
    onScreen++; if (r.kind === 'z') INTRO.onZ.push(r);
    const bob = r.kind === 'z' ? Math.sin(r.walk + r.bob) * 2 : 0;
    if (puff && r.kind === 'z' && Math.random() < 0.35 && INTRO.dust.length < 120) INTRO.dust.push({ x: r.x - r.r, y: r.y + r.r * 0.5, r: r.r * 0.5, vx: -40, life: 0.7, max: 0.7 });
    if (r.kind === 'player') drawRunner(g, r.x, r.y + bob, r.r, r.walk);
    else {
      const spr = getSprite(r.m, r.r, true), kk = r.r / spr.rq, hs = spr.half * kk;
      g.save(); g.translate(r.x, r.y + bob); g.rotate(Math.sin(r.walk * 0.5 + r.bob) * 0.12); g.drawImage(spr.c, -hs, -hs, hs * 2, hs * 2); g.restore();
    }
  }
  if (onScreen > 3 && t < T1.skull) INTRO.shake = Math.max(INTRO.shake, Math.min(9, onScreen * 0.22));
  // footfalls: each frame, a share of the zombies on screen land a heavy step, panned to where they are
  if (!INTRO.frozen && t < T1.skull && INTRO.onZ.length && introAudible()) {
    let n = Math.min(44, INTRO.onZ.length * 1.6) * dt; n = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
    const big = 22 * clamp(Math.min(w, h) / 390, 1, 1.7);
    for (let i = 0; i < n; i++) { const r = INTRO.onZ[(Math.random() * INTRO.onZ.length) | 0]; SFX.introStomp(r.x / w * 2 - 1, r.r > big ? 0.55 : 0.36, r.r > big); }
  }
  drawSkull(g, t);
  for (const q of INTRO.debris) { if (!INTRO.frozen) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 900 * dt; q.rot += q.vr * dt; } g.save(); g.translate(q.x, q.y); g.rotate(q.rot); g.fillStyle = q.c; g.fillRect(-q.sz / 2, -q.sz / 2, q.sz, q.sz * 0.7); g.restore(); }
  if (INTRO.flash > 0) { g.setTransform(d, 0, 0, d, 0, 0); g.fillStyle = 'rgba(255,240,230,' + Math.min(0.8, INTRO.flash) + ')'; g.fillRect(0, 0, w, h); INTRO.flash -= dt * 6; }
  g.setTransform(d, 0, 0, d, 0, 0);
  const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.6);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.7)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
}

/* ---------- card 2 ---------- */
function newEmber(any) {
  const w = INTRO.w, h = INTRO.h;
  return { x: rand(0, w), y: any ? rand(0, h) : h + rand(0, 40), vy: -rand(18, 60), vx: rand(-8, 8), r: rand(0.8, 2.6), ph: rand(TAU), life: rand(3, 7) };
}
// the word on a ring: final letter positions from the font's real widths, so the locked word is evenly spaced
const WORD = 'CLAUDE';
function introWord() {
  const g = IG, w = INTRO.w, h = INTRO.h, size = clamp(Math.min(w * 0.2, h * 0.17), 56, 176);
  g.font = size + "px 'Saira Stencil One', Impact, sans-serif";
  const adv = WORD.split('').map(c => g.measureText(c).width), gap = size * 0.05;
  const total = adv.reduce((p, q) => p + q, 0) + gap * (WORD.length - 1);
  let x = -total / 2; const xs = adv.map(q => { const c = x + q / 2; x += q + gap; return c; });
  const R = total * 0.92;
  INTRO.word = { size: size, adv: adv, xs: xs, total: total, R: R, fin: xs.map(c => Math.asin(clamp(c / R, -0.97, 0.97))) };
  return INTRO.word;
}
function beatPulse(t) {
  const B = INTRO.beats || []; let p = 0;
  for (let i = B.length - 1; i >= 0; i--) if (B[i] <= t) { p = Math.exp(-(t - B[i]) * 7) * (t < T2.final + 0.3 ? 1 : 0.35); break; }
  return p;
}
function drawIntro2(dt) {
  const g = IG, t = INTRO.t, w = INTRO.w, h = INTRO.h, d = INTRO.d, cx = w / 2, cy = h * 0.47;
  const Wd = INTRO.word || introWord(), N = WORD.length, L = T2.hit;
  g.setTransform(d, 0, 0, d, 0, 0); g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#020203'; g.fillRect(0, 0, w, h);
  const fadeOut = clamp((t - T2.fade) / 1.0, 0, 1), fadeIn = clamp(t / 0.9, 0, 1), live = fadeIn * (1 - fadeOut * 0.85);
  const hit = t >= L ? Math.exp(-(t - L) * 2.2) : 0, fin = t >= T2.final ? Math.exp(-(t - T2.final) * 1.6) : 0, beat = beatPulse(t);
  const locked = clamp((t - L) / 0.25, 0, 1);
  let I = (0.16 + 0.5 * locked + hit * 0.6 + fin * 0.5 + beat * 0.3) * live;
  // light rays behind the title: one pre-rendered fan, slowly turning
  g.globalCompositeOperation = 'lighter';
  const RR = Math.hypot(w, h) * 0.7;
  if (!INTRO.rays || INTRO.raysR !== RR) {
    const sz = Math.ceil(RR), c = document.createElement('canvas'); c.width = c.height = sz; const rg = c.getContext('2d'), m = sz / 2;
    rg.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU + Math.sin(i * 2.3) * 0.2, wd = 0.07 + 0.04 * Math.sin(i * 1.7);
      const gr = rg.createRadialGradient(m, m, 0, m, m, m);
      gr.addColorStop(0, 'rgba(255,196,110,0.22)'); gr.addColorStop(0.45, 'rgba(255,150,60,0.07)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
      rg.fillStyle = gr; rg.beginPath(); rg.moveTo(m, m); rg.arc(m, m, m, a - wd, a + wd); rg.closePath(); rg.fill();
    }
    const core = rg.createRadialGradient(m, m, 0, m, m, m * 0.8);
    core.addColorStop(0, 'rgba(255,200,120,0.28)'); core.addColorStop(1, 'rgba(255,160,80,0)'); rg.fillStyle = core; rg.fillRect(0, 0, sz, sz);
    INTRO.rays = c; INTRO.raysR = RR;
  }
  g.save(); g.translate(cx, cy); g.rotate(t * 0.07 + (1 - locked) * 0.4); g.globalAlpha = Math.min(1, I); g.drawImage(INTRO.rays, -RR, -RR, RR * 2, RR * 2); g.restore(); g.globalAlpha = 1;
  // embers drifting up, brightening on the beat
  for (const e of INTRO.embers) {
    e.y += e.vy * dt * (1 + beat); e.x += (e.vx + Math.sin(t * 1.3 + e.ph) * 10) * dt; e.life -= dt;
    if (e.y < -10 || e.life <= 0) Object.assign(e, newEmber(false));
    const f = 0.5 + 0.5 * Math.sin(t * 6 + e.ph), a = (0.35 + 0.65 * f) * live * (0.7 + I * 0.6);
    g.globalAlpha = Math.min(1, a); g.fillStyle = f > 0.7 ? '#ffe2a0' : '#ff9a3a'; g.beginPath(); g.arc(e.x, e.y, e.r * (1 + hit + beat * 0.6), 0, TAU); g.fill();
  }
  g.globalAlpha = 1;

  // ---- the orbit: letters spin round a ring as the camera looks down on it, gathering into the word on the hit ----
  const k = clamp(t / L, 0, 1), spin = -TAU * 1.15 * Math.pow(1 - k, 2.2), spread = Math.pow(1 - k, 1.3);
  const swing = t > L ? Math.sin((t - L) * 0.9) * 0.085 * Math.min(1, (t - L) / 0.8) : 0;     // the camera keeps orbiting gently
  const pitch = 0.5 * Math.pow(1 - k, 1.5) + 0.05 + (t > L ? 0.02 * Math.sin((t - L) * 0.7) : 0);
  const R = Wd.R, D = R * 3.2, norm = (D - R) / D, push = 1 + 0.06 * clamp((t - L) / 5, 0, 1) + beat * 0.012;
  const sp = Math.sin(pitch), cp = Math.cos(pitch), size = Wd.size;
  const P = (x, z) => { const zz = z * cp, sc = D / (D - zz) * norm * push; return { x: cx + x * sc, y: cy + z * sp * sc * 0.9, sc: sc, z: zz }; };
  // orbit ring (back half behind the letters, front half in front), with a comet riding it
  const ringR = R * 1.18, ringA = Math.min(1, t / 1.2) * live, tilt = pitch + 0.2;
  const ringPart = (a0, a1) => {
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    const n = 40;
    for (let i = 0; i < n; i++) {
      const u0 = a0 + (a1 - a0) * i / n, u1 = a0 + (a1 - a0) * (i + 1) / n;
      const p0 = P(Math.sin(u0) * ringR, Math.cos(u0) * ringR), p1 = P(Math.sin(u1) * ringR, Math.cos(u1) * ringR);
      const head = ((t * 1.9 % TAU) + TAU) % TAU, dd = ((u0 - head) % TAU + TAU) % TAU, tail = dd > TAU - 2.2 ? (dd - (TAU - 2.2)) / 2.2 : 0;
      g.strokeStyle = 'rgba(255,' + (190 + tail * 60 | 0) + ',120,' + (0.16 + tail * 0.8 + beat * 0.15) * ringA + ')';
      g.lineWidth = 1.4 + tail * 2.6;
      g.beginPath(); g.moveTo(p0.x, p0.y + (tilt - pitch) * Math.cos(u0) * ringR * 0.5 * p0.sc); g.lineTo(p1.x, p1.y + (tilt - pitch) * Math.cos(u1) * ringR * 0.5 * p1.sc); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
  };
  ringPart(Math.PI / 2, Math.PI * 1.5);                 // the far side
  // beat shockwaves from the word once it has locked
  if (t > L) {
    g.globalCompositeOperation = 'lighter';
    for (const b of (INTRO.beats || [])) {
      const age = t - b; if (b < L - 0.01 || age < 0 || age > 0.8) continue;
      const rx = R * (0.7 + age * 1.9) * push, ry = rx * (0.22 + pitch);
      g.strokeStyle = 'rgba(255,214,150,' + (1 - age / 0.8) * 0.45 * live + ')'; g.lineWidth = 2.2 * (1 - age / 0.8) + 0.6;
      g.beginPath(); g.ellipse(cx, cy + size * 0.05, rx, ry, 0, 0, TAU); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
  }
  // letters, far to near
  const L3 = [];
  for (let i = 0; i < N; i++) {
    const th = Wd.fin[i] + spread * ((i - (N - 1) / 2) * TAU / N - Wd.fin[i]) + spin + swing;
    const x = Math.sin(th) * R, z = Math.cos(th) * R, p = P(x, z);
    L3.push({ i: i, th: th, p: p, face: Math.cos(th) });
  }
  L3.sort((a, b) => a.p.z - b.p.z);
  g.font = size + "px 'Saira Stencil One', Impact, sans-serif"; g.textAlign = 'center'; g.textBaseline = 'middle';
  const gleamA = t > L + 0.25 && t < L + 1.7 ? (t - L - 0.25) / 1.45 : t > T2.final && t < T2.final + 1.3 ? (t - T2.final) / 1.3 : -1;
  const gx = gleamA >= 0 ? -Wd.total / 2 - size + gleamA * (Wd.total + size * 2) : 1e9;
  for (const q of L3) {
    const fx = Math.max(0.08, Math.abs(q.face)), back = q.face < 0, alpha = (back ? 0.35 : 0.45 + 0.55 * q.face) * live;
    g.save(); g.translate(q.p.x, q.p.y); g.scale(q.p.sc * fx * (back ? -1 : 1), q.p.sc * (0.94 + 0.06 * Math.cos(pitch)));
    g.globalAlpha = Math.min(1, alpha);
    const gr = g.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
    gr.addColorStop(0, back ? '#6b4a1c' : '#fff1c9'); gr.addColorStop(0.35, back ? '#5a3c14' : '#f0c56c'); gr.addColorStop(0.7, back ? '#3e290e' : '#b97a2b'); gr.addColorStop(1, back ? '#2b1c09' : '#6e4314');
    g.fillStyle = gr; g.fillText(WORD[q.i], 0, 0);
    if (!back && gx < 1e8) {   // the gleam sweeping across the word
      const lx = gx - Wd.xs[q.i], hg = g.createLinearGradient(lx - size * 0.5, 0, lx + size * 0.5, 0);
      hg.addColorStop(0, 'rgba(255,250,235,0)'); hg.addColorStop(0.5, 'rgba(255,250,235,0.85)'); hg.addColorStop(1, 'rgba(255,250,235,0)');
      g.fillStyle = hg; g.fillText(WORD[q.i], 0, 0);
    }
    g.restore();
  }
  g.globalAlpha = 1;
  ringPart(-Math.PI / 2, Math.PI / 2);                  // the near side, in front of the letters
  // "MADE WITH" above the word
  const ma = clamp((t - T2.made) / 0.9, 0, 1) * live;
  if (ma > 0) {
    const ms = Math.max(11, size * 0.13), sp2 = ms * (0.7 + (1 - ma) * 0.9), txt = 'MADE WITH';
    g.font = ms + "px 'Share Tech Mono', monospace"; g.fillStyle = 'rgba(236,220,176,' + ma + ')'; g.textAlign = 'center';
    let tw = 0; const cw = txt.split('').map(c => { const q = g.measureText(c).width; tw += q; return q; }); tw += sp2 * (txt.length - 1);
    let x = cx - tw / 2; const y = cy - size * 0.78;
    txt.split('').forEach((c, i) => { g.fillText(c, x + cw[i] / 2, y); x += cw[i] + sp2; });
  }
  // the lock: flash and an anamorphic streak (again on the final hit)
  g.globalCompositeOperation = 'lighter';
  const st = Math.max(hit, fin * 0.8);
  if (st > 0.02) {
    const sw = w * (0.4 + (1 - st) * 0.9), sh = 3 + st * 5;
    const lg = g.createLinearGradient(cx - sw / 2, 0, cx + sw / 2, 0);
    lg.addColorStop(0, 'rgba(255,190,110,0)'); lg.addColorStop(0.5, 'rgba(255,236,200,' + st * 0.9 + ')'); lg.addColorStop(1, 'rgba(255,190,110,0)');
    g.fillStyle = lg; g.fillRect(cx - sw / 2, cy - sh / 2, sw, sh);
  }
  if (hit > 0.3 || fin > 0.4) { g.fillStyle = 'rgba(255,230,190,' + Math.max(hit - 0.3, fin - 0.4) * 0.55 + ')'; g.fillRect(0, 0, w, h); }
  g.globalCompositeOperation = 'source-over';
  g.drawImage(screenGrad('introVig', 0.28, 0.62, '0,0,0', 0.85), 0, 0, w, h);
}

/* ---------- loop, skipping, finishing ---------- */
function introFrame(dt) {
  if (!INTRO.on || INTRO.gate || !INTRO.ev) return;
  if (INTRO.card === 1 && INTRO.t > T1.lunge + 0.1 && INTRO.t < T1.bite) dt *= 0.42;   // slow motion just before the bite
  INTRO.t += dt;
  const E = INTRO.ev;
  while (INTRO.evI < E.length && INTRO.t >= E[INTRO.evI][0]) { const f = E[INTRO.evI++][1]; try { f(); } catch (e) { perfError(e); } if (!INTRO.on) return; }
  if (!INTRO.on) return;
  if (INTRO.card === 1) { if (!INTRO.frozen) drawIntro1(dt); }
  else drawIntro2(dt);
}
function introAudible() { return SFX.health().state === 'running'; }
function introSoundOn() {
  INTRO.muted = false; INTRO_EL.classList.remove('muted'); INTRO_EL.querySelector('.in-gate').hidden = true;
  const t = INTRO.t;
  if (INTRO.card === 1) {
    const end = T1.rumble + 3.4;
    if (t >= T1.rumble && end - t > 0.6) SFX.introStampede(end - t);
  } else if (INTRO.card === 2 && INTRO.musicPending) {
    INTRO.musicPending = false;
    if (INTRO.track) SFX.introTrack(t + 0.03);
  }
}
function introUnlock() {
  SFX.init();
  let tries = 0;
  const check = () => { if (!INTRO.on) return; if (introAudible()) introSoundOn(); else if (++tries < 20) setTimeout(check, 50); };
  setTimeout(check, 30);
}
function introSkip() {
  if (!INTRO.on) return false;
  if (INTRO.muted && !introAudible()) { introUnlock(); return true; }
  SFX.introCut();
  if (INTRO.card === 1) introCard(2); else introFinish();
  return true;
}
function introFinish(natural) {
  if (!INTRO.on) return;
  INTRO.on = false;
  if (!natural) SFX.introCut();                 // a natural finish lets the music's tail ring into the title screen
  // after the intro (watched or skipped): the loading screen while the title screen's city and menus get ready
  G.mode = 'title';
  INTRO.fading = 0;
  INTRO_EL.classList.add('out');
  loadRun('Into the city', [
    ['Waking the city', () => { if (!G.attractReady) initAttract(); G.attractReady = false; return chunkJobs(cam.x, cam.y); }],
    ['Waking the dead', () => G.zs.filter(z => !z.dead).map(z => () => getSprite(z.m, z.r))],
    ['Opening the bunker', () => { refreshTitle(); }]
  ], { now: true }).then(() => {
    showOv('title');
    const ti = $('title'); ti.classList.remove('reveal'); void ti.offsetWidth; ti.classList.add('reveal');
  });
  setTimeout(() => { INTRO.fading = 0; INTRO_EL.hidden = true; INTRO_EL.className = ''; IV.width = IV.height = 1; INTRO.blocks = []; INTRO.runners = []; INTRO.sk = null; INTRO.rays = null; INTRO.word = null; }, 1250);
}
// keeps the card moving under the crossfade into the title screen
function introFadeFrame(dt) { if (INTRO.fading > 0 && INTRO.card === 2) { INTRO.t += dt; drawIntro2(dt); } }
function introBegin() {
  INTRO.gate = false;
  SFX.init(); if (INTRO_MUSIC.length > 100) SFX.setIntroTrack(INTRO_MUSIC, INTRO_TRACK.gain); introCard(1);
}
function startIntro() {
  G.mode = 'intro'; INTRO.on = true;
  showOv(null); INTRO_EL.hidden = false; INTRO_EL.className = '';
  introBuild();
  // the intro starts straight away. Browsers only allow sound after a tap, so if it is blocked a small
  // "Tap for sound" hint shows, and that first tap switches the sound on mid-intro instead of skipping.
  SFX.init();
  if (INTRO_MUSIC.length > 100) SFX.setIntroTrack(INTRO_MUSIC, INTRO_TRACK.gain);
  introBegin();
  setTimeout(() => {
    if (!INTRO.on || introAudible()) return;
    INTRO.muted = true; INTRO_EL.classList.add('muted'); INTRO_EL.querySelector('.in-gate').hidden = false;
  }, 150);
}
INTRO_EL.addEventListener('pointerdown', e => { e.preventDefault(); introSkip(); });
window.addEventListener('keydown', e => { if (INTRO.on && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')) { e.preventDefault(); introSkip(); } });
window.addEventListener('resize', () => { if (INTRO.on && !(INTRO.card === 1 && INTRO.frozen)) introLayout(); });
