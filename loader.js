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
  e.pct.textContent = Math.round(LOADING.frac * 100) + '%';
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
  LOADING.on = true; LOADING.frac = 0; LOADING.title = title;
  const e = loadEls();
  clearTimeout(LOADING.timer);
  if (o.now || (e.box && !e.box.hidden && !e.box.classList.contains('out'))) loadShow(title);
  else LOADING.timer = setTimeout(() => { if (LOADING.on) loadShow(title); }, 140);
  loadStep(steps.length ? steps[0][0] : '', 0);
  for (let i = 0; i < steps.length; i++) {
    loadStep(steps[i][0], i / steps.length);
    await loadPaint();
    let r;
    try { r = steps[i][1](); if (r && typeof r.then === 'function') r = await r; } catch (err) { perfError(err); r = null; }
    if (Array.isArray(r)) {
      let lastY = performance.now();
      for (let j = 0; j < r.length; j++) {
        try { r[j](); } catch (err) { perfError(err); }
        if (performance.now() - lastY > 14) { loadStep(steps[i][0], (i + (j + 1) / r.length) / steps.length); await loadPaint(); lastY = performance.now(); }
      }
    }
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
  const cx0 = Math.floor((x - hw) / CH), cx1 = Math.floor((x + hw) / CH), cy0 = Math.floor((y - hh) / CH), cy1 = Math.floor((y + hh) / CH);
  const list = [];
  for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) list.push([cx, cy, Math.hypot((cx + 0.5) * CH - x, (cy + 0.5) * CH - y)]);
  list.sort((a, b) => a[2] - b[2]);   // the blocks you will see first are drawn first
  for (const [cx, cy] of list) jobs.push(() => { const c = getChunk(cx, cy); if (!c.can) { renderChunk(c); c.seen = frameNo; } });
  return jobs;
}
// waits until test() is true (or the time runs out), checking every frame
async function loadUntil(test, ms) { const end = performance.now() + ms; while (performance.now() < end) { if (test()) return true; await loadPaint(); } return false; }
