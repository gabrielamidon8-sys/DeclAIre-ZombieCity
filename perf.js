/* ================= performance: device profile, adaptive quality, LOD, cache refresher, self-repair =================
   At start the game profiles the device (CPU cores, memory, GPU, screen, browser features and a 10 ms benchmark)
   and picks a quality tier. A governor then watches real frame times in the background and steps render resolution
   and detail up or down to hold a smooth frame rate, and remembers what worked for next time. Caches the game builds
   up (zombie sprites, city tiles, menu thumbnails) are trimmed on a timer, when the app goes to the background and
   when memory runs low. A watchdog restarts a stalled game loop or a frozen audio engine on its own. */
const TIER_NAMES = ['Low', 'Medium', 'High', 'Ultra'];
// dpr: highest pixel density drawn · parts/splats/texts: effect budgets · burst: particles per effect · spr: sprite
// resolution · boss: boss detail · lod: zombie detail offset · viz: light-show detail · sim: far zombies update every
// Nth frame · sprCap/chunkKeep: cache sizes · chunkScale: city tile resolution · audio: audio quality · beat: HUD pulse
// wx: weather particles · veg: trees and bushes (1 still, 2 animated) · water: animated rivers · light: dynamic lights
// (fires, police lights) · fog: fog layers · prints: footprints kept · deco: decorative detail generated per city block
const TIER_Q = [
  { dpr: 1.25, parts: 140, burst: 0.4, splats: 40, texts: 24, spr: 0.75, boss: 0, lod: 2, viz: 0, sim: 3, sprCap: 120, chunkKeep: 8, chunkScale: 0.5, audio: 0, beat: 0, wx: 0.35, veg: 1, water: 0, light: 0, fog: 0, prints: 0, deco: 0.5 },
  { dpr: 1.5, parts: 280, burst: 0.65, splats: 80, texts: 40, spr: 0.9, boss: 1, lod: 1, viz: 1, sim: 2, sprCap: 240, chunkKeep: 12, chunkScale: 0.75, audio: 1, beat: 1, wx: 0.6, veg: 1, water: 1, light: 1, fog: 1, prints: 30, deco: 0.75 },
  { dpr: 2, parts: 520, burst: 1, splats: 150, texts: 60, spr: 1, boss: 2, lod: 0, viz: 2, sim: 2, sprCap: 400, chunkKeep: 16, chunkScale: 1, audio: 2, beat: 2, wx: 0.9, veg: 2, water: 1, light: 2, fog: 1, prints: 60, deco: 1 },
  { dpr: 3, parts: 700, burst: 1.2, splats: 220, texts: 80, spr: 1, boss: 2, lod: 0, viz: 2, sim: 1, sprCap: 520, chunkKeep: 20, chunkScale: 1.25, audio: 2, beat: 2, wx: 1, veg: 2, water: 1, light: 2, fog: 1, prints: 90, deco: 1.2 }
];
const RES_STEPS = [1, 0.85, 0.72, 0.6, 0.5];
// one ladder from best to lightest: [tier, resolution step]. The governor climbs it one rung at a time.
const LADDER = [[3, 0], [3, 1], [2, 0], [2, 1], [2, 2], [1, 1], [1, 2], [1, 3], [0, 2], [0, 3], [0, 4]];
const Q = Object.assign({}, TIER_Q[2]);
const PS = store.get('zc_perf', {}) || {};
const PERF = {
  prof: null, bench: null, key: '', start: 2, ceil: 3, rung: 2, tier: 2, res: 0,
  mode: PS.mode == null ? 'auto' : PS.mode, cap: PS.cap == null ? 60 : PS.cap, saverMode: PS.saver || 'auto',
  saver: false, battery: null, thermal: 0, hz: 60, rafIv: [],
  win: { n: 0, sum: 0, work: 0, iv: [] }, good: 0, bad: 0, holdT: 0, upWait: {}, lastUp: { rung: -1, t: -1e9 }, stableT: 0,
  fps: 0, workMs: 0, changes: [], repairs: 0, log: [], errs: [], errT: [], storms: 0,
  lastFrame: 0, lastNow: -1, lastRaf: 0, lastDraw: 0, visibleAt: 0, freed: 0, lodN: [0, 0, 0, 0], frames: 0,
  // settings that scale the tier, and the parts the governor trims on its own before dropping a whole tier
  partMul: 1, resLock: null, wxScale: 1, vegCut: false, sec: { wx: 0, life: 0 }, secWin: { wx: 0, life: 0 }, deco: 1
};

/* ---------- device profile ---------- */
function gpuClass(s) {   // 0 weak, 1 mid, 2 strong, 3 desktop-class
  s = String(s || '').toLowerCase();
  if (!s || s === 'none' || /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/.test(s)) return 0;
  let m;
  if ((m = /adreno[^\d]*(\d{3})/.exec(s))) { const v = +m[1]; return v >= 730 ? 3 : v >= 640 ? 2 : v >= 610 ? 1 : v >= 530 ? 1 : 0; }
  if (/immortalis/.test(s)) return 3;
  if ((m = /mali-g(\d+)/.exec(s))) { const v = +m[1]; return v >= 715 ? 3 : v >= 610 ? 2 : v >= 77 ? 2 : v >= 52 ? 1 : 0; }
  if (/mali|powervr|videocore|vivante|tegra 3/.test(s)) return /powervr b-series|bxm/.test(s) ? 1 : 0;
  if (/xclipse/.test(s)) return 3;
  if (/apple/.test(s)) return 2;
  if (/nvidia|geforce|radeon|amd|rtx|gtx/.test(s)) return 3;
  if (/intel|iris|uhd/.test(s)) return 2;
  return 1;
}
// a short, readable GPU name for the panel
function friendlyGpu(s) {
  s = String(s || '');
  if (/swiftshader|llvmpipe|softpipe|basic render/i.test(s)) return 'Software graphics';
  s = s.replace(/\(TM\)|\(R\)/g, '').replace(/,?\s*OpenGL ES[\s\d.]*/i, '').replace(/^(Google|Qualcomm|ARM|Apple|Intel|NVIDIA Corporation|AMD),\s*/i, '')
    .replace(/Vulkan [\d.]+\s*/i, '').replace(/,?\s*(Direct3D|D3D)\S*.*$/i, '').replace(/\s+/g, ' ').trim();
  return s.slice(0, 48);
}
function readNative() {
  try { const n = window.ZCNative; if (n && n.info) return JSON.parse(n.info()); } catch (e) { }
  return null;
}
function detectDevice() {
  const n = navigator, ua = n.userAgent || '', p = {};
  p.cores = n.hardwareConcurrency || 0;
  p.mem = n.deviceMemory || 0;
  p.dpr = window.devicePixelRatio || 1;
  p.w = Math.round(Math.min(screen.width, screen.height)); p.h = Math.round(Math.max(screen.width, screen.height));
  p.touch = TOUCH; p.app = IS_APP;
  let m;
  p.os = (m = /Android\s([\d.]+)/.exec(ua)) ? 'Android ' + m[1] : /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && n.maxTouchPoints > 1) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'ChromeOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown';
  p.browser = (m = /(?:Chrome|CriOS)\/(\d+)/.exec(ua)) ? (/; wv\)/.test(ua) || IS_APP ? 'WebView ' : /Edg\//.test(ua) ? 'Edge ' : 'Chrome ') + m[1] : (m = /Firefox\/(\d+)/.exec(ua)) ? 'Firefox ' + m[1] : (m = /Version\/(\d+).*Safari/.exec(ua)) ? 'Safari ' + m[1] : 'Browser';
  p.saveData = !!(n.connection && n.connection.saveData);
  p.rm = RM;
  p.feats = {
    offscreen: typeof OffscreenCanvas !== 'undefined', bitmap: typeof createImageBitmap === 'function',
    worklet: typeof AudioWorkletNode !== 'undefined', battery: typeof n.getBattery === 'function', memory: !!(performance.memory)
  };
  p.gpu = '';
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      p.gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || '');
      p.feats.webgl2 = !!document.createElement('canvas').getContext('webgl2');
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    } else p.gpu = 'none';
  } catch (e) { p.gpu = 'unknown'; }
  p.gpu = p.gpu.replace(/^ANGLE \((.*)\)$/, '$1').replace(/\s*\(0x[0-9a-f]+\)/ig, '').replace(/, or similar$/, '').slice(0, 80);
  const nat = readNative();
  if (nat) {
    p.model = nat.model || ''; p.soc = nat.soc || ''; p.sdk = nat.sdk || 0; p.lowRam = !!nat.lowRam;
    if (nat.totalMem) p.mem = Math.ceil(nat.totalMem / 1073741824 - 0.05);   // Android reports a little under the nominal size
    if (nat.cores) p.cores = nat.cores;
    if (nat.hz) p.nativeHz = Math.round(nat.hz);
  }
  p.gpuClass = gpuClass(p.gpu);
  return p;
}
function benchmark() {
  // CPU: how much plain math fits in 4 ms
  let t0 = performance.now(), i = 0, x = 0;
  while (performance.now() - t0 < 4) { for (let k = 0; k < 500; k++) x += Math.sqrt(k * i + 1) * Math.sin(k); i++; }
  const cpu = Math.round(i / 4 * 10) / 10;
  // drawing: blend 160 soft sprites into a canvas and wait for it to finish
  const c = document.createElement('canvas'); c.width = c.height = 384;
  const g = c.getContext('2d'), s = document.createElement('canvas'); s.width = s.height = 64;
  const sg = s.getContext('2d'), gr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,200,120,0.9)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 64, 64);
  g.drawImage(s, 0, 0); g.getImageData(0, 0, 1, 1);
  t0 = performance.now();
  for (let k = 0; k < 160; k++) { g.globalAlpha = 0.5; g.drawImage(s, (k * 37) % 300, (k * 71) % 300, 96, 96); }
  g.getImageData(0, 0, 1, 1);
  return { cpu: cpu, fill: Math.round((performance.now() - t0) * 100) / 100, x: x > 0 };
}
function scoreTier(p, b) {
  let s = 0;
  s += p.cores >= 8 ? 2 : p.cores >= 6 ? 1.6 : p.cores >= 4 ? 1.1 : p.cores ? 0.3 : 1;
  s += p.mem ? (p.mem >= 8 ? 2 : p.mem >= 6 ? 1.7 : p.mem >= 4 ? 1.3 : p.mem >= 2 ? 0.7 : 0.2) : 1;
  s += [0, 1.2, 2.2, 3][p.gpuClass];
  s += b ? (b.fill < 3 ? 1.5 : b.fill < 6 ? 1.1 : b.fill < 12 ? 0.7 : b.fill < 25 ? 0.3 : 0) : 0.7;
  if (p.lowRam) s -= 1.5;
  if (p.w * p.h * p.dpr * p.dpr > 4.5e6) s -= 0.4;      // very large screens push many more pixels
  return { score: Math.round(s * 10) / 10, tier: s >= 7.2 ? 3 : s >= 5.2 ? 2 : s >= 3.2 ? 1 : 0 };
}
function deviceCeil(p, start) {
  let c = Math.min(3, start + 1);
  if (p.gpuClass === 0 || p.lowRam) c = Math.min(c, 1);
  if (p.touch && p.gpuClass < 3) c = Math.min(c, 2);
  return c;
}
function profileKey(p) { return [p.gpu, p.cores, p.mem, p.dpr, p.w + 'x' + p.h, p.app ? 'app' : 'web'].join('|'); }
function firstRung(tier) { return LADDER.findIndex(r => r[0] === tier); }
function ceilRung() {
  let c = PERF.ceil;
  if (PERF.saver) c = Math.min(c, 1);
  if (PERF.thermal >= 3) c = 0; else if (PERF.thermal >= 2) c = Math.min(c, Math.max(0, PERF.ceil - 1));
  return LADDER.findIndex(r => r[0] <= c);
}
function effCap() {
  if (PERF.saver) return PERF.cap && PERF.cap < 30 ? PERF.cap : 30;
  if (PERF.thermal >= 3) return 30;
  return PERF.cap;
}
function targetFps() { const c = effCap(); return c ? Math.min(c, PERF.hz) : PERF.hz; }

/* ---------- applying a quality level ---------- */
function applyRung(i, why) {
  i = clamp(i, 0, LADDER.length - 1);
  const r = LADDER[i], tierChanged = r[0] !== PERF.tier;
  PERF.rung = i; PERF.tier = r[0]; PERF.res = r[1];
  Object.assign(Q, TIER_Q[r[0]]); applyOverrides();
  ZB.setDetail(Q.boss); SFX.setQuality(Q.audio);
  if (!Q.beat) { const a = $('app'); a.style.setProperty('--beat', '0'); VZ.css = ''; }
  resize();
  if (tierChanged) trimCaches(0);
  PERF.holdT = performance.now() + 1600; PERF.good = PERF.bad = 0; PERF.stableT = performance.now();
  PERF.changes.push({ at: Math.round(performance.now() / 1000), to: TIER_NAMES[r[0]] + ' ' + Math.round(RES_STEPS[r[1]] * 100) + '%', why: why });
  if (PERF.changes.length > 12) PERF.changes.shift();
  renderPerfBtn();
}
function savePerf() {
  PS.mode = PERF.mode; PS.cap = PERF.cap; PS.saver = PERF.saverMode;
  store.set('zc_perf', PS);
}
function setMode(m) {
  PERF.mode = m; savePerf();
  if (m === 'auto') applyRung(Math.max(ceilRung(), PS.learned && PS.learned.key === PERF.key ? PS.learned.rung : firstRung(PERF.start)), 'auto');
  else applyRung(firstRung(+m), 'manual');
}

/* ---------- governor: runs every frame, decides once a second ---------- */
function perfFrame(now, rawIv, work) {
  PERF.frames++;
  if (document.hidden) return;
  const live = G.mode === 'play' || G.mode === 'title' || G.mode === 'cine';
  const w = PERF.win;
  if (G.mode !== PERF.lastMode) { PERF.lastMode = G.mode; PERF.holdT = Math.max(PERF.holdT, now + 1200); }
  if (!live || now < PERF.holdT) { w.n = w.sum = w.work = 0; w.iv.length = 0; return; }
  w.n++; w.sum += rawIv; w.work += work; w.iv.push(rawIv);
  const sw = PERF.secWin; sw.wx += PERF.sec.wx; sw.life += PERF.sec.life; PERF.sec.wx = PERF.sec.life = 0;
  if (w.sum < 1000) return;
  const wxShare = sw.wx / Math.max(1, w.work), lifeShare = sw.life / Math.max(1, w.work); sw.wx = sw.life = 0;
  PERF.share = { wx: Math.round(wxShare * 100), life: Math.round(lifeShare * 100) };
  const avg = w.sum / w.n, wk = w.work / w.n;
  w.iv.sort((a, b) => a - b); const p90 = w.iv[Math.floor(w.n * 0.9)];
  w.n = w.sum = w.work = 0; w.iv.length = 0;
  PERF.fps = Math.round(1000 / avg * 10) / 10; PERF.workMs = Math.round(wk * 10) / 10;
  if (PERF.mode !== 'auto') return;
  const T = 1000 / targetFps();
  const bad = p90 > T * 1.4 || avg > T * 1.18, good = avg < T * 1.08 && p90 < T * 1.3 && wk < T * 0.55;
  const top = ceilRung();
  if (PERF.rung < top) { applyRung(top, 'limit'); return; }
  if (bad) {
    PERF.good = 0;
    // the weather or the vegetation eating a big slice of the frame is trimmed first, keeping the rest sharp
    // a frame that is slow while the script is idle is waiting on drawing pixels: heavy weather (fog, storm darkness,
    // blowing sand) fills the whole screen several times over, so it is trimmed before the resolution drops
    const fillBound = wk < T * 0.45, heavyWx = WX.fog + WX.dark + WX.sand + WX.rain * 0.5 + WX.snow * 0.5 > 0.55;
    if (PERF.bad >= 1 && (wxShare > 0.2 || (fillBound && heavyWx)) && PERF.wxScale > (fillBound && wxShare <= 0.2 ? 0.51 : 0.26) && SET.weather === 'auto') { PERF.wxScale = Math.max(0.25, PERF.wxScale - 0.25); PERF.bad = 0; PERF.holdT = now + 1200; logTrim('weather ' + Math.round(PERF.wxScale * 100) + '%'); return; }
    if (PERF.bad >= 1 && lifeShare > 0.18 && !PERF.vegCut && SET.veg === 'auto') { PERF.vegCut = true; PERF.bad = 0; PERF.holdT = now + 1200; logTrim('still trees'); return; }
    if (++PERF.bad >= 2 && PERF.rung < LADDER.length - 1) {
      const from = PERF.rung, step = avg > T * 2 ? 2 : 1;
      // stepping down soon after stepping up means that rung is too much: wait longer before trying it again
      if (PERF.lastUp.rung === from && now - PERF.lastUp.t < 15000) PERF.upWait[from] = Math.min(240, (PERF.upWait[from] || 6) * 2);
      applyRung(Math.min(LADDER.length - 1, from + step), 'slow');
    }
  } else if (good) {
    PERF.bad = 0;
    const next = PERF.rung - 1;
    if ((PERF.wxScale < 1 || PERF.vegCut) && PERF.good >= 10) { PERF.good = 0; if (PERF.vegCut) PERF.vegCut = false; else PERF.wxScale = Math.min(1, PERF.wxScale + 0.25); logTrim('restored detail'); }
    else if (next >= top && ++PERF.good >= (PERF.upWait[next] || 6)) { PERF.lastUp = { rung: next, t: now }; applyRung(next, 'headroom'); }
    else if (next < top) PERF.good++;
  } else { PERF.bad = Math.max(0, PERF.bad - 1); PERF.good = 0; }
  // remember a level that has held for a while, so the next launch starts there
  if (now - PERF.stableT > 20000 && (!PS.learned || PS.learned.rung !== PERF.rung || PS.learned.key !== PERF.key)) {
    PS.learned = { key: PERF.key, rung: PERF.rung }; savePerf();
  }
}
function logTrim(what) { PERF.changes.push({ at: Math.round(performance.now() / 1000), to: TIER_NAMES[PERF.tier] + ' ' + Math.round(RES_STEPS[PERF.res] * 100) + '%', why: what }); if (PERF.changes.length > 12) PERF.changes.shift(); }
// the display's refresh rate, from the first couple of seconds of frames
function trackHz(iv) {
  const a = PERF.rafIv; if (a.length >= 150 || iv <= 0 || iv > 100) return;
  a.push(iv);
  if (a.length === 150) {
    const s = a.slice().sort((x, y) => x - y), med = s[75], hz = 1000 / med;
    PERF.hz = [30, 48, 60, 72, 90, 120, 144, 165].reduce((b, v) => Math.abs(v - hz) < Math.abs(b - hz) ? v : b, 60);
  }
}

/* ---------- cache refresher ---------- */
function canvasBytes(c) { return c ? c.width * c.height * 4 : 0; }
function cacheBytes() {
  let s = 0, k = 0, m = 0;
  for (const v of sprites.values()) s += canvasBytes(v.c);
  for (const c of chunks.values()) { if (c.can) k += canvasBytes(c.can); if (c.wcan) k += canvasBytes(c.wcan); }
  if (typeof WSPR !== 'undefined') for (const v of WSPR.values()) s += canvasBytes(v.c);
  for (const id of ['cxGrid', 'arGrid', 'blGrid']) { const g = $(id); if (g) for (const c of g.querySelectorAll('canvas')) m += canvasBytes(c); }
  for (const c of glowCache.values()) m += canvasBytes(c);
  return { sprites: s, city: k, menus: m, total: s + k + m };
}
// level 0: routine trim to the current budgets · 1: memory is low or the app is in the background · 2: full refresh
function trimCaches(level) {
  let freed = 0;
  const cap = level >= 1 ? (level >= 2 ? 0 : Math.floor(Q.sprCap / 4)) : Q.sprCap;
  if (sprites.size > cap) for (const [key, v] of sprites) { if (sprites.size <= cap) break; freed += canvasBytes(v.c); sprites.delete(key); }
  const live = []; for (const c of chunks.values()) if (c.can) live.push(c);
  live.sort((a, b) => b.seen - a.seen);
  const keep = level >= 2 ? 0 : level >= 1 ? live.filter(c => frameNo - c.seen < 3).length : Q.chunkKeep;
  for (let i = keep; i < live.length; i++) { freed += canvasBytes(live[i].can) + canvasBytes(live[i].wcan); live[i].can = null; live[i].wcan = null; }
  if (level >= 1 && typeof WSPR !== 'undefined') { for (const v of WSPR.values()) freed += canvasBytes(v.c); WSPR.clear(); }
  for (const [key, c] of chunks) if (Math.abs(c.ox + CH / 2 - cam.x) > CH * 5 || Math.abs(c.oy + CH / 2 - cam.y) > CH * 5) chunks.delete(key);
  if (level >= 1 || glowCache.size > 16) { for (const c of glowCache.values()) freed += canvasBytes(c); glowCache.clear(); ZB.clearCache(); EDGE.col = ''; VZ.specGr = null; SG.clear(); }
  for (const [id, sheet] of [['cxGrid', 'codex'], ['arGrid', 'armory'], ['blGrid', 'bosslog']]) {
    const g = $(id), sh = $(sheet);
    if (g && sh && sh.hidden && g.firstChild) { for (const c of g.querySelectorAll('canvas')) freed += canvasBytes(c); g.textContent = ''; }
  }
  if (G.parts.length > Q.parts) G.parts.splice(0, G.parts.length - Q.parts);
  if (G.splats.length > Q.splats) G.splats.splice(0, G.splats.length - Q.splats);
  if (G.texts.length > Q.texts) G.texts.splice(0, G.texts.length - Q.texts);
  if (level >= 2) { flashGrad = null; }
  PERF.freed += freed;
  return freed;
}
PERF.status = () => ({ share: PERF.share, tier: TIER_NAMES[PERF.tier], res: RES_STEPS[PERF.res], rung: PERF.rung, dpr: Math.round(DPR * 100) / 100, fps: PERF.fps, work: PERF.workMs,
  hz: PERF.hz, mode: PERF.mode, start: PERF.start, ceil: PERF.ceil, score: PERF.score, lod: PERF.lodN.slice(), repairs: PERF.repairs, cacheMB: Math.round(cacheBytes().total / 1048576 * 10) / 10 });
function noteRepair(what) {
  PERF.repairs++; PERF.log.push({ at: Math.round(performance.now() / 1000), what: what });
  if (PERF.log.length > 10) PERF.log.shift();
}
// errors inside the frame: a short burst usually means one broken effect, so the short-lived lists are reset
function perfError(err) {
  const now = performance.now(), msg = String(err && err.message || err).slice(0, 160);
  PERF.errT.push(now); while (PERF.errT.length && now - PERF.errT[0] > 3000) PERF.errT.shift();
  if (PERF.errs[PERF.errs.length - 1] !== msg) { PERF.errs.push(msg); if (PERF.errs.length > 6) PERF.errs.shift(); }
  if (PERF.errT.length >= 20) {
    PERF.errT.length = 0;
    G.parts = []; G.rings = []; G.bolts = []; G.texts = []; G.splats = [];
    if (G.blasts) G.blasts = []; if (G.quakes) G.quakes = [];
    noteRepair('Reset broken effects');
    if (++PERF.storms >= 3 && PERF.rung < LADDER.length - 1) { PERF.mode = 'auto'; applyRung(LADDER.length - 1, 'safe mode'); noteRepair('Safe mode'); }
  }
  try { console.error(err); } catch (e) { }
}

/* ---------- background care: every 2 seconds ---------- */
let perfTicks = 0;
function perfCare() {
  perfTicks++;
  const now = performance.now(), visible = !document.hidden;
  // the frame loop should never stop while the game is on screen
  if (visible && now - PERF.visibleAt > 4000 && now - PERF.lastFrame > 3000) { noteRepair('Restarted the game loop'); requestAnimationFrame(frame); }
  // audio: resume a suspended engine, rebuild a frozen one
  try { const a = SFX.selfHeal(visible && now - PERF.visibleAt > 2500); if (a === 'rebuilt') noteRepair('Rebuilt the audio engine'); } catch (e) { }
  if (perfTicks % 5 === 0) {           // every 10 s: battery, heat and memory
    const nat = readNative();
    if (nat) { PERF.thermal = nat.thermal || 0; PERF.nativeSaver = !!nat.powerSave; if (nat.lowMemory) trimCaches(1); }
    const b = PERF.battery, lowBatt = b && !b.charging && b.level <= 0.2;
    const sv = PERF.saverMode === 'on' || (PERF.saverMode === 'auto' && (lowBatt || PERF.nativeSaver));
    if (sv !== PERF.saver) { PERF.saver = sv; if (PERF.mode === 'auto' && PERF.rung < ceilRung()) applyRung(ceilRung(), sv ? 'battery saver' : 'limit'); renderPerfBtn(); }
    const pm = performance.memory;
    if (pm && pm.jsHeapSizeLimit && pm.usedJSHeapSize / pm.jsHeapSizeLimit > 0.75) { trimCaches(1); noteRepair('Freed memory'); }
  }
  if (perfTicks % 10 === 0) trimCaches(0);   // every 20 s: keep caches inside the budget
  renderPerfPanel();
}

/* ---------- start-up ---------- */
function perfInit() {
  PERF.holdT = performance.now() + 3000;
  const p = PERF.prof = detectDevice();
  PERF.key = profileKey(p);
  const sc = scoreTier(p, null);
  PERF.start = sc.tier; PERF.score = sc.score; PERF.ceil = deviceCeil(p, sc.tier);
  if (p.nativeHz) PERF.hz = p.nativeHz;
  let rung = firstRung(PERF.start);
  if (PERF.mode !== 'auto') rung = firstRung(+PERF.mode);
  else if (PS.learned && PS.learned.key === PERF.key) rung = Math.max(ceilRung(), PS.learned.rung);
  const r = LADDER[rung]; PERF.rung = rung; PERF.tier = r[0]; PERF.res = r[1]; Object.assign(Q, TIER_Q[r[0]]);
  ZB.setDetail(Q.boss); SFX.setQuality(Q.audio);
  // a first launch also runs a short benchmark once things settle, then re-picks the starting tier
  if (!(PS.learned && PS.learned.key === PERF.key) || !PS.bench) setTimeout(function benchSoon() {
    if (G.mode === 'intro') { setTimeout(benchSoon, 1000); return; }   // never hitch the intro
    try {
      const b = PERF.bench = benchmark(), sc2 = scoreTier(p, b);
      PS.bench = b; savePerf();
      PERF.score = sc2.score; PERF.start = sc2.tier; PERF.ceil = deviceCeil(p, sc2.tier);
      if (PERF.mode === 'auto' && !(PS.learned && PS.learned.key === PERF.key)) applyRung(Math.max(ceilRung(), firstRung(PERF.start)), 'device check');
    } catch (e) { }
  }, 900);
  else PERF.bench = PS.bench;
  if (navigator.getBattery) navigator.getBattery().then(b => { PERF.battery = b; }).catch(() => { });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearTimeout(perfInit.bg); perfInit.bg = setTimeout(() => { if (document.hidden) trimCaches(1); }, 3000); }
    else { PERF.visibleAt = performance.now(); PERF.holdT = performance.now() + 2000; }
  });
  cv.addEventListener('contextlost', e => { e.preventDefault(); });
  cv.addEventListener('contextrestored', () => { trimCaches(2); noteRepair('Restored graphics'); });
  window.zcTrim = lvl => { lvl = +lvl || 0; trimCaches(lvl >= 10 ? 1 : 0); if (lvl >= 10) noteRepair('Freed memory for the system'); };
  setInterval(perfCare, 2000);
}

/* ---------- the panel lives in Settings > System (settings.js) ---------- */
function fmtMB(b) { return b >= 1048576 ? (b / 1048576).toFixed(b >= 10485760 ? 0 : 1) + ' MB' : Math.round(b / 1024) + ' KB'; }
perfInit();
