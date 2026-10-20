/* ================= loading screens =================
   One screen for every wait: starting the game, after the intro (watched or skipped), going into a run, and joining a
   co-op game. It shows what is really being prepared, with a bar for how far along it is, and it only stays up for as
   long as the work takes: nothing here waits on purpose. The first one is already on the page before any code runs
   (it is plain HTML and CSS), so even the moment the browser spends reading the game has something to look at. */
const LOADING = { on: false, shown: false, timer: 0, frac: 0, title: '' };
const LOAD_TIPS = [
  'Dash through a crowd to break their line. Some dashes leave fire, ice or poison behind.',
  'Chain 75 kills without a break and the A-10 is yours to call in.',
  'At a x100 chain the skull offers a forbidden card. Insane power, brutal curse.',
  'Water carries lightning. Stay off the river in a thunderstorm.',
  'Red barrels explode, and they set off the barrels next to them.',
  'Shoot a parked car and its alarm pulls the horde toward it.',
  'Bosses mutate into new forms halfway through the fight. Keep moving.',
  'In co-op, stand next to a downed teammate to bring them back.',
  'In co-op, press G (LB on a controller, the pin on a phone) to mark a spot for your team.',
  'Every weapon you find stays unlocked. Pick your starting gun in the armory.',
  'Fog and sandstorms cut how far you can see. Listen for the horde.',
  'A free DeclAIre account saves your progress and follows you to every device.',
  'The radio has seven channels. M mutes it, N skips the song.',
  'Snow and ash keep your footprints. So do the zombies.',
  'Frozen rivers are slippery for everyone, zombies included.'
];
const loadWait = ms => new Promise(r => setTimeout(r, ms));
// the next painted frame (or a short timeout when the window is hidden and frames are paused)
const loadPaint = () => new Promise(res => { let done = false; const f = () => { if (!done) { done = true; res(); } }; requestAnimationFrame(f); setTimeout(f, 60); });
function loadEls() { return { box: $('boot'), fill: $('bootFill'), step: $('bootStep'), title: $('bootTitle'), tip: $('bootTip'), pct: $('bootPct') }; }
function loadShow(title) {
  const e = loadEls(); if (!e.box) return;
  LOADING.shown = true;
  if (title) e.title.textContent = title;
  if (e.box.hidden || e.box.classList.contains('out')) {
    e.box.hidden = false; e.box.classList.remove('out', 'gone');
    e.tip.textContent = LOAD_TIPS[(Math.random() * LOAD_TIPS.length) | 0];
  }
}
function loadStep(label, frac) {
  const e = loadEls(); if (!e.box) return;
  LOADING.frac = Math.max(LOADING.frac, clamp(frac, 0, 1));
  if (label) e.step.textContent = label;
  e.fill.style.width = (LOADING.frac * 100).toFixed(1) + '%';
  const left = loadLeft(); e.pct.textContent = Math.round(LOADING.frac * 100) + '%' + (left >= 1.5 ? ' · about ' + Math.round(left) + ' s' : '');
}
function loadHide() {
  const e = loadEls(); if (!e.box || e.box.hidden) return;
  e.box.classList.add('out');
  setTimeout(() => { if (!LOADING.on) { e.box.hidden = true; e.box.classList.remove('out'); } }, 260);
}
// Runs the steps in order with the loading screen up: each step is [label, job]. A job can do its work at once, return
// a promise, or return a list of small jobs that are spread over frames so the bar keeps moving. With now = true the
// screen shows straight away; otherwise only if the work takes long enough to notice.
async function loadRun(title, steps, o) {
  o = o || {};
  LOADING.on = true; LOADING.frac = 0; LOADING.title = title; LOADING.since = performance.now(); LOADING.steps = steps.map(s => s[0]); LOADING.at = 0; LOADING.t0 = performance.now();
  const e = loadEls();
  clearTimeout(LOADING.timer);
  if (o.now || (e.box && !e.box.hidden && !e.box.classList.contains('out'))) loadShow(title);
  else LOADING.timer = setTimeout(() => { if (LOADING.on) loadShow(title); }, 140);
  loadStep(steps.length ? steps[0][0] : '', 0);
  for (let i = 0; i < steps.length; i++) {
    LOADING.at = i; LOADING.stepT = performance.now();
    loadStep(steps[i][0], i / steps.length);
    await loadPaint();
    let r;
    // (CORE v3: a step that waits on something that never comes is let go after 12 seconds, so the screen never hangs)
    try {
      r = steps[i][1]();
      if (r && typeof r.then === 'function') { let fin = false; r = await Promise.race([r.then(v => { fin = true; return v; }), loadWait(12000).then(() => { if (fin) return null; coreLog('LOADER let go of "' + steps[i][0] + '": it waited 12 seconds on something that never came'); coreHurt('LOADER', 'a step hung'); return null; })]); }
    } catch (err) { perfError(err); r = null; }
    if (Array.isArray(r)) {
      let lastY = performance.now();
      for (let j = 0; j < r.length; j++) {
        try { r[j](); } catch (err) { perfError(err); }
        if (performance.now() - lastY > 14) { loadStep(steps[i][0], (i + (j + 1) / r.length) / steps.length); await loadPaint(); lastY = performance.now(); }
      }
    }
    loadLearn(title, steps[i][0], performance.now() - LOADING.stepT);
  }
  loadStep(o.done || 'Ready', 1);
  clearTimeout(LOADING.timer);
  if (LOADING.shown) await loadPaint();
  LOADING.on = false; LOADING.shown = false;
  loadHide();
}
// a job list that draws every block of the city that will be on screen around (x, y), plus a margin, so the first
// seconds of a run (or the title screen) never stutter on drawing streets
function chunkJobs(x, y) {
  const hw = W / 2 / ZOOM + 260, hh = H / 2 / ZOOM + 260, jobs = [];
  const cx0 = Math.floor((x - hw) / CHS), cx1 = Math.floor((x + hw) / CHS), cy0 = Math.floor((y - hh) / CHS), cy1 = Math.floor((y + hh) / CHS);
  const list = [];
  for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) list.push([cx, cy, Math.hypot((cx + 0.5) * CHS - x, (cy + 0.5) * CHS - y)]);
  list.sort((a, b) => a[2] - b[2]);   // the blocks you will see first are drawn first
  for (const [cx, cy] of list) jobs.push(() => { const c = getChunk(cx, cy); if (!c.can) { renderChunk(c); c.seen = frameNo; } });
  return jobs;
}
// waits until test() is true (or the time runs out), checking every frame
async function loadUntil(test, ms) { const end = performance.now() + ms; while (performance.now() < end) { if (test()) return true; await loadPaint(); } return false; }
// the warm-up: everything the first seconds of play would otherwise build on the fly is built here, behind the loading
// screen: zombie sprites, glows, the lighting engine, weather and a few real frames. A list of small jobs, so the bar moves.
function warmJobs() {
  const jobs = [];
  jobs.push(() => luxWarm());
  // the trees, bushes and grass around the start, so their sprites are drawn before the first frame needs them
  jobs.push(() => rebuildActive());
  jobs.push(() => { let n = 0; for (const d of WD.act) { if (d.k === 'tree') treeSprite(d); else if (d.k === 'bush') bushSprite(d); if (++n > 160) break; } });
  // the 2.0 zombies of the first waves: their walk frames
  if (typeof animaWarm === 'function' && typeof ZR_ONLY !== 'undefined' && ZR_ONLY) for (const m of mutaWarmList(2)) jobs.push(() => animaWarm(m));
  const seen = new Set();
  for (const m of (typeof ZR_ONLY !== 'undefined' && ZR_ONLY ? [] : MUTS)) {
    const k = m.S && m.S.key; if (!k || seen.has(k)) continue; seen.add(k);
    jobs.push(() => { getSprite(m, zombieR(m.size || 1, 1), true); });
  }
  jobs.push(() => { for (const c of ['#ff8a3a', '#ffc27a', '#ffd27a', '#ff3b3b', '#3b7bff', '#b6ff6a', '#9ad7ff', '#d2ff6a', '#e8eef4', '#bcd6ff']) glowSprite(c); atmCloudSprite(); grainCanvas(); });
  jobs.push(() => { if (typeof drawWeatherScreen === 'function') drawWeatherScreen(0.016); });
  for (let i = 0; i < 3; i++) jobs.push(() => { render(); });
  jobs.push(() => { LUX.msAvg = 0; LUX.bad = 0; PERF.sec && (PERF.sec.lux = 0); });
  return jobs;
}
/* CORE v3: what the loader learns. It times every step of every loading screen on this device, so the screen can say
   about how long is left; a step that hangs is let go (above), and a loading screen stuck up for 45 seconds is taken
   down by the watchdog. */
function loadKey(title, label) { return String(title).slice(0, 24) + '|' + String(label).slice(0, 32); }
function loadLearn(title, label, ms) {
  if (typeof LEARN === 'undefined' || !LEARN.ready || !CORE.by.LOADER) return;
  const o = learnOwn('LOADER'), s = o.s || (o.s = {}), k = loadKey(title, label);
  s[k] = s[k] ? s[k] * 0.7 + ms * 0.3 : ms; const ks = Object.keys(s); if (ks.length > 24) delete s[ks[0]]; learnDirty();
}
// seconds left on this loading screen, from what each remaining step took last time (0 when it does not know)
function loadLeft() {
  if (typeof LEARN === 'undefined' || !LEARN.ready || !CORE.by.LOADER || !LOADING.steps) return 0;
  const s = learnOwn('LOADER').s; if (!s) return 0;
  let left = 0, known = 0;
  LOADING.steps.forEach((l, i) => { const v = s[loadKey(LOADING.title, l)]; if (v == null || i < LOADING.at) return; known++; left += i === LOADING.at ? Math.max(0, v - (performance.now() - LOADING.stepT)) : v; });
  return known ? left / 1000 : 0;
}
coreMeta('LOADER', { ver: 2, adapts: 'spreads its work over frames', provides: ['warmup'],
  check: () => LOADING.on && performance.now() - (LOADING.since || 0) > 45000 ? 'its loading screen has been up for ' + Math.round((performance.now() - LOADING.since) / 1000) + ' s' : '',
  repair: () => { LOADING.on = false; LOADING.shown = false; loadHide(); },
  learned: () => { const s = learnOwn('LOADER').s; if (!s) return []; const tot = t => Object.entries(s).filter(([k]) => k.indexOf(t) === 0).reduce((a, [, v]) => a + v, 0) / 1000; const a = tot('Starting Zombie City'); return a ? ['Starting the game takes about ' + a.toFixed(1) + ' s on this device; the loading screen counts down from what each step took last time.'] : []; } });
