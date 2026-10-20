/* ================= CORE v3: the learning ecosystem =================
   CORE (core.js) is where the engines meet. This is the part of it that learns, so the ecosystem gets better at
   running on each device the longer it runs there. Nothing here ever changes the rules of a run (damage, hits, who
   lives, the waves, the clock): it only changes how the work is done and drawn. In co-op the host's game decides
   everything that matters, so nothing one device learns can put the screens out of step.
   What it learns, per engine, on this device (kept in the browser's storage, forgotten after the engine is updated
   or with Forget in the engine room):
   - Costs: what each level of each engine costs a frame under each load (8 lamps or 40, 30 zombies or 500), from
     every second of play. With that it can tell what a step down would save before taking it, whether a step up
     will fit before trying it, and what the horde that just set off will cost before it arrives.
   - Ceilings: a step up that had to come straight back down is remembered for that load, so the engine does not
     keep bouncing between two levels; the ceiling lifts on its own after a while (3 minutes, doubling each time).
   - Repairs: which fix (the engine's own repair, help from the others, a step down, a fresh start, a rest) has
     actually cleared each kind of problem; the next time, the fix that has worked best is tried first.
   - Trust: an engine that keeps having trouble on this device starts a run one step lighter and earns the step back
     by running clean; trust comes back by itself over time.
   - Its own lessons: some engines learn something of their own (how jittery the co-op link is, how fast this device
     renders the radio's songs, when this phone starts to run hot, how long the city takes to draw a block).
   It also keeps every engine honest: a heartbeat for each one that should be working (one that goes quiet is
   restarted), self-tests at start (the name filter catches what it should, the bullet maths adds up, the roster is
   whole, the encryption round-trips), what each needs from the device and whether it has it, and one capability
   registry so engines ask for "light" or "crowd" rather than for each other by name.
   Adding an engine: one coreDefine({...}) call in its own file, and it shows up in the hub, the engine room, the
   tests and the docs (see the README). */
const LEARN = { v: 1, data: null, dev: '', ready: false, dirty: false, saveT: 0, feats: null, tested: false, testsAt: 0 };
const LEARN_STRATS = ['repair', 'help', 'step', 'reset'];
const LEARN_PRIOR = { repair: 0.03, help: 0.02, step: 0.01, reset: 0 };
const LEARN_WORDS = { repair: 'its own repair', help: 'help from the other engines', step: 'a step down', reset: 'a fresh start', rest: 'a rest' };
const LEARN_BUCKETS = ['none', '1', '2–3', '4–7', '8–15', '16–31', '32–63', '64–127', '128–255', '256+'];
// load buckets roughly double: 0, 1, 2-3, 4-7 ... 256+
const learnBucket = x => { x = +x || 0; return x <= 0 ? 0 : Math.min(9, 1 + Math.floor(Math.log2(x))); };

/* ---------- the store ---------- */
function learnInit() {
  if (LEARN.ready) return LEARN.data;
  LEARN.ready = true;
  LEARN.dev = typeof PERF !== 'undefined' && PERF.key ? PERF.key : 'unknown';
  let d = null; try { d = typeof store !== 'undefined' ? store.get('zc_learn', null) : null; } catch (x) { }
  if (!d || d.v !== LEARN.v || d.dev !== LEARN.dev || typeof d.e !== 'object') {
    if (d && d.dev && d.dev !== LEARN.dev) coreLog('CORE: a different device or browser than last time, so the engines start learning it fresh');
    d = { v: LEARN.v, dev: LEARN.dev, ses: 0, born: Date.now(), e: {} };
  }
  d.ses = (d.ses | 0) + 1;
  // every new session forgives a little: trust drifts back towards whole
  for (const k in d.e) { const r = d.e[k]; if (r && typeof r.tr === 'number') r.tr = Math.min(1, r.tr + (1 - r.tr) * 0.2); }
  LEARN.data = d; LEARN.dirty = true;
  return d;
}
// an engine's record; a new version of the engine starts its lessons again (its old costs no longer apply)
function learnRec(e) {
  const d = learnInit(); if (!e) return null;
  let r = d.e[e.name];
  if (!r || r.ver !== e.ver) {
    if (r && r.ver !== e.ver) coreLog(e.name + ' was updated (v' + r.ver + ' to v' + e.ver + '): it learns this device again');
    r = d.e[e.name] = { ver: e.ver, c: {}, ce: {}, r: {}, tr: r && typeof r.tr === 'number' ? Math.max(r.tr, 0.8) : 0.9, o: {}, secs: 0 };
    LEARN.dirty = true;
  }
  return r;
}
// an engine's own lessons (it keeps whatever it likes in there; call learnDirty after changing it)
function learnOwn(name) { const e = CORE.by[name]; const r = e ? learnRec(e) : null; return r ? r.o : {}; }
function learnDirty() { LEARN.dirty = true; }
function learnSave(force) {
  if (!LEARN.ready || (!LEARN.dirty && !force)) return;
  LEARN.dirty = false;
  try { store.set('zc_learn', LEARN.data); } catch (x) { }
}
function learnForget() {
  try { store.set('zc_learn', null); } catch (x) { }
  LEARN.ready = false; LEARN.data = null; learnInit();
  for (const e of CORE.list) { e.inc = null; e.holdRise = 0; e._rise = null; e.riseWhy = ''; if (e.learnForget) coreCall(e, 'learnForget'); }
  coreLog('Everything the engines had learned on this device was forgotten; they start learning it again now');
  learnSave(true);
}

/* ---------- costs: what each level costs under each load ---------- */
// once a second, for every engine with levels: the cost of this second goes into the cell for its level and load
function learnSample(e, now) {
  if (!e.lv) return;
  const L = coreCall(e, 'lv', null); if (L == null || L !== L) return;
  if (e._L !== L) { e._L = L; e._Lt = now; return; }          // a level just changed: the next seconds are a transition
  if (now - e._Lt < 2000 || !(e.msSec > 0)) return;
  if (typeof PERF !== 'undefined' && now < PERF.holdT) return;   // the whole picture is changing tier
  const r = learnRec(e), b = learnBucket(coreCall(e, 'load', 0)), k = L + ':' + b, c = r.c[k];
  if (c) { c[0] = c[0] * 0.8 + e.msSec * 0.2; c[1] = Math.min(9999, c[1] + 1); } else r.c[k] = [e.msSec, 1];
  r.secs = (r.secs | 0) + 1; LEARN.dirty = true;
}
// what level L costs at load bucket b (milliseconds a frame), or null if it has not been seen enough to say
function learnPredict(r, L, b) {
  if (!r) return null;
  const c = r.c[L + ':' + b]; if (c && c[1] >= 3) return c[0];
  // the nearest load seen at the same level, scaled: each bucket is about twice the load, cost grows a little slower
  for (let d = 1; d <= 3; d++) for (const bb of [b - d, b + d]) { const w = r.c[L + ':' + bb]; if (w && w[1] >= 3 && bb >= 0 && bb <= 9) return w[0] * Math.pow(2, (b - bb) * 0.8); }
  return null;
}
// time left in a frame right now (milliseconds)
function learnFree() {
  if (typeof PERF === 'undefined' || !PERF.fps) return 0;
  const T = 1000 / targetFps();
  return PERF.fps >= targetFps() * 0.97 ? Math.max(0, T * 0.92 - PERF.workMs) : Math.max(0, T - 1000 / PERF.fps);
}
// an engine asks before it steps itself up; false while a learned ceiling holds or the step would not fit
function coreRise(name) {
  const e = CORE.by[name]; if (!e) return true;
  const now = performance.now();
  if (e.holdRise > now) { e.riseWhy = 'held one step lighter for ' + Math.max(1, Math.round((e.holdRise - now) / 1000)) + ' s more (' + (e.holdWhy || 'after a step down') + ')'; return false; }
  if (!LEARN.ready) return true;
  const r = learnRec(e), load = coreCall(e, 'load', 0), b = learnBucket(load);
  const ad = coreCall(e, 'adaptGet', null), c = r.ce[b];
  if (c && Date.now() < c[1] && ad != null && ad >= c[0]) { e.riseWhy = 'holding: the last time it stepped up with ' + learnLoadWords(e, b) + ' it had to come straight back down'; return false; }
  if (e.lv) {
    const L = coreCall(e, 'lv', null), p0 = learnPredict(r, L, b), p1 = learnPredict(r, L + 1, b);
    if (p0 != null && p1 != null) {
      const extra = p1 - p0, free = learnFree();
      if (extra > 0.25 && extra > free * 0.8) { e.riseWhy = 'waiting: the next level costs about ' + extra.toFixed(1) + ' ms more here and the frame has ' + free.toFixed(1) + ' ms to spare'; return false; }
    }
  }
  e.riseWhy = ''; return true;
}
// level changes, watched once a second: a step up that falls straight back becomes a ceiling for that load
function learnSteps(e, now) {
  const ad = coreCall(e, 'adaptGet', null); if (ad == null) return;
  if (e._ad == null) { e._ad = ad; return; }
  if (ad === e._ad) {
    // held a minute after stepping up: it was right to, and the ceiling for that load loosens
    if (e._rise && now - e._rise.t > 60000) { const r = learnRec(e), c = r.ce[e._rise.b]; if (c) { c[2] = Math.max(0, c[2] - 1); if (!c[2]) delete r.ce[e._rise.b]; LEARN.dirty = true; } e._rise = null; }
    return;
  }
  const b = learnBucket(coreCall(e, 'load', 0));
  if (ad > e._ad) e._rise = { from: e._ad, to: ad, b: b, t: now };
  else if (e._rise && now - e._rise.t < 15000 && ad < e._rise.to) {
    const r = learnRec(e), old = r.ce[e._rise.b], strikes = (old ? old[2] : 0) + 1, wait = Math.min(1800000, 180000 * Math.pow(2, strikes - 1));
    r.ce[e._rise.b] = [e._rise.from, Date.now() + wait, strikes]; LEARN.dirty = true;
    coreLog('CORE learned: ' + e.name + ' cannot hold its higher level with ' + learnLoadWords(e, e._rise.b) + ' on this device; it waits ' + Math.round(wait / 60000) + ' min before trying again');
    e._rise = null;
  }
  e._ad = ad;
}
function learnLoadWords(e, b) { return (b ? LEARN_BUCKETS[b] : 'no') + ' ' + (e.loadName || 'load'); }
// the saving a step down would bring (milliseconds), from what was learned; null if not known yet
function learnSaving(e) {
  if (!e.lv || !LEARN.ready) return null;
  const r = learnRec(e), L = coreCall(e, 'lv', null); if (L == null || L <= 0) return null;
  const b = learnBucket(coreCall(e, 'load', 0)), p0 = learnPredict(r, L, b), p1 = learnPredict(r, L - 1, b);
  return p0 != null && p1 != null ? Math.max(0, p0 - p1) : null;
}

/* ---------- looking ahead: a horde on its way ---------- */
// n more zombies are coming: the engines whose work grows with the crowd step down now if the learned costs say the
// frame will not hold them, instead of the frame stuttering first
function learnAhead(n, why) {
  if (!LEARN.ready || !(n > 0) || typeof G === 'undefined' || G.mode !== 'play') return 0;
  let free = learnFree(), steps = 0; const now = performance.now(), out = [];
  const list = CORE.list.filter(e => e.zload && e.lv && e.trim && !e.down && (e.effort || 'auto') !== 'max');
  const est = list.map(e => {
    const r = learnRec(e), L = coreCall(e, 'lv', null), x = coreCall(e, 'load', 0), b0 = learnBucket(x), b1 = learnBucket(x + n * e.zload);
    const p0 = learnPredict(r, L, b0), p1 = learnPredict(r, L, b1);
    return { e: e, add: p0 != null && p1 != null ? p1 - p0 : 0 };
  }).filter(o => o.add > 0.2).sort((a, b) => b.add - a.add);
  let need = est.reduce((a, o) => a + o.add, 0) - free;
  for (const o of est) {
    if (need <= 0 || steps >= 2) break;
    if (!coreCall(o.e, 'canTrim', true) || !coreCall(o.e, 'trim', false)) continue;
    const save = learnSaving(o.e) || o.add * 0.4;
    need -= save; steps++; o.e.holdRise = now + 30000; o.e.holdWhy = 'stepped down ahead of ' + why; out.push(o.e.name);
  }
  if (out.length) coreLog('CORE saw ' + why + ' coming (' + n + ' more) and stepped ' + out.join(' and ') + ' down before it arrived, from what they cost on this device');
  return steps;
}

/* ---------- repairs: which fix works for which problem ---------- */
// "3 errors (Cannot read x of null)" and "5 errors (y is not a function)" are the same kind of problem
function learnSig(problem) { return String(problem).toLowerCase().replace(/\([^)]*\)?/g, '').replace(/[0-9.]+/g, '#').replace(/[^a-z# ]+/g, ' ').trim().split(/\s+/).slice(0, 5).join(' ') || 'trouble'; }
function learnIncident(e, problem, now) {
  e.inc = { sig: learnSig(problem), problem: problem, tried: [], t0: now };
  const r = learnRec(e); r.tr = Math.max(0, (r.tr == null ? 0.9 : r.tr) - 0.05); LEARN.dirty = true;
}
function learnCan(e, s) {
  if (s === 'repair') return !!e.repair;
  if (s === 'help') return CORE.list.some(h => h !== e && !h.down && h.helps && typeof h.helps[e.name] === 'function');
  if (s === 'step') return !!e.trim && coreCall(e, 'canTrim', true) !== false && (e.effort || 'auto') !== 'max';
  if (s === 'reset') return !!e.reset;
  return false;
}
// the next fix to try for this incident: the best-scoring one not tried yet (wins + 1) / (tries + 2), at most three
// before a rest
function learnPick(e) {
  const inc = e.inc, r = learnRec(e), M = r.r[inc.sig] || {};
  if (inc.tried.filter(s => s !== 'rest').length < 3) {
    let best = null, bs = -1;
    for (const s of LEARN_STRATS) {
      if (inc.tried.indexOf(s) >= 0 || !learnCan(e, s)) continue;
      const m = M[s] || [0, 0], sc = (m[1] + 1) / (m[0] + 2) + LEARN_PRIOR[s];
      if (sc > bs) { bs = sc; best = s; }
    }
    if (best) return best;
  }
  return e.isolate && inc.tried.indexOf('rest') < 0 ? 'rest' : null;
}
function learnTried(e, s) {
  const r = learnRec(e), M = r.r[e.inc.sig] || (r.r[e.inc.sig] = {}), m = M[s] || (M[s] = [0, 0]);
  m[0]++; e.inc.tried.push(s); LEARN.dirty = true;
  // keep the memory small: the eight kinds of problem seen most
  const keys = Object.keys(r.r); if (keys.length > 8) { keys.sort((a, b) => learnTries(r.r[a]) - learnTries(r.r[b])); delete r.r[keys[0]]; }
}
const learnTries = M => Object.values(M).reduce((a, m) => a + m[0], 0);
// the problem is gone: the last fix tried gets the credit
function learnCredit(e) {
  const inc = e.inc; e.inc = null; if (!inc || !inc.tried.length) return;
  const s = inc.tried[inc.tried.length - 1], r = learnRec(e), M = r.r[inc.sig] || {}, m = M[s];
  if (m) { m[1] = Math.min(m[0], m[1] + 1); LEARN.dirty = true; }
  e.lastFix = { sig: inc.sig, s: s, t: Date.now() };
  coreLog(e.name + ' is sound again: ' + LEARN_WORDS[s] + ' fixed it' + (m ? ' (' + m[1] + ' of ' + m[0] + ' times for this kind of problem)' : ''));
}
// carries out a fix; true if there was something to do
function learnApply(e, s, problem, now) {
  if (s === 'repair') { coreLog('CORE: ' + e.name + ': ' + problem + ' - repairing'); coreCall(e, 'repair'); e.repairs++; return true; }
  if (s === 'help') {
    let helped = 0;
    for (const h of CORE.list) if (h !== e && !h.down && h.helps && typeof h.helps[e.name] === 'function') { try { h.helps[e.name](); helped++; coreLog(h.name + ' helped ' + e.name + ' (' + problem + ')'); } catch (x) { coreHurt(h.name, x); } }
    if (helped) e.repairs++;
    return helped > 0;
  }
  if (s === 'step') {
    if (!coreCall(e, 'trim', false)) return false;
    e.holdRise = now + 90000; e.holdWhy = 'a step down cleared a problem'; e.repairs++; coreLog('CORE stepped ' + e.name + ' down a level to clear it (' + problem + ')'); return true;
  }
  if (s === 'reset') { coreCall(e, 'reset'); e.repairs++; coreLog('CORE gave ' + e.name + ' a fresh start (' + problem + ')'); return true; }
  return false;
}
function learnRested(e) { const r = learnRec(e); r.tr = Math.max(0, r.tr - 0.12); LEARN.dirty = true; }
// a new run: an engine that has had trouble on this device lately starts one step lighter
function learnCautious() {
  if (!LEARN.ready) return;
  const now = performance.now();
  for (const e of CORE.list) {
    const r = learnRec(e);
    if (r.tr >= 0.5 || !e.trim || e.down || (e.effort || 'auto') !== 'auto' || !coreCall(e, 'canTrim', true)) continue;
    if (coreCall(e, 'trim', false)) { e.holdRise = now + 60000; e.holdWhy = 'a cautious start: it had trouble here lately'; coreLog('CORE starts ' + e.name + ' one step lighter this run: it has had trouble on this device lately (trust ' + Math.round(r.tr * 100) + '%); it earns the step back by running clean'); }
  }
}

/* ---------- every second: costs, steps, heartbeats, trust ---------- */
function learnTick(now) {
  if (!CORE.verified) return;
  learnInit();
  const playing = typeof G !== 'undefined' && (G.mode === 'play' || G.mode === 'title') && !document.hidden && !(typeof LOADING !== 'undefined' && LOADING.on);
  for (const e of CORE.list) {
    if (playing) { try { learnSample(e, now); learnSteps(e, now); } catch (x) { } }
    // the heartbeat: an engine that should be working and has not reported any work for a few seconds is stuck
    if (e.alive) {
      const should = playing && !e.down && coreCall(e, 'alive', false);
      if (!should || e.beatSec) e.still = 0;
      else if (++e.still >= (e.stallS || 4)) { e.stalled = 'stopped working: nothing from it for ' + e.still + ' seconds while it should be running'; e.still = 0; e.stalls = (e.stalls || 0) + 1; }
    }
    // a clean minute earns back a little trust
    if (!e.down && !e.inc && e.health !== 'mending') { if (++e._clean >= 60 || e._clean !== e._clean) { e._clean = 0; const r = learnRec(e); if (r.tr < 1) { r.tr = Math.min(1, r.tr + 0.01); LEARN.dirty = true; } } }
    else e._clean = 0;
  }
  if (playing) learnClimb(now);
  if (!LEARN.tested && LEARN.testsAt && now >= LEARN.testsAt && typeof G !== 'undefined' && G.mode !== 'intro') learnTests();
  if (now - LEARN.saveT > 30000) { LEARN.saveT = now; learnSave(); }
}
// Engines that can be stepped down but have no way to step themselves back up (reflections, blood level, smoke,
// headlights) are climbed back by CORE: every 8 seconds at most, one step for one engine, only while the frame is on
// target with time to spare and what was learned says the next level fits.
function learnClimb(now) {
  if (now - (LEARN.climbT || 0) < 8000 || typeof PERF === 'undefined' || !PERF.fps || PERF.fps < targetFps() * 0.97 || learnFree() < 2) return;
  for (const e of CORE.list) {
    if (!e.climb || e.down || !e.boost || e.holdRise > now) continue;
    const ad = coreCall(e, 'adaptGet', null); if (ad == null || ad >= 0) continue;
    if (!coreRise(e.name)) continue;
    if (coreCall(e, 'boost', false)) { LEARN.climbT = now; e.climbs = (e.climbs || 0) + 1; return; }
  }
}
// an engine that has no frame cost to report says it is alive this way
function coreBeat(name) { const e = CORE.by[name]; if (e) e._beat = true; }

/* ---------- what each engine needs from the device ---------- */
function coreFeats() {
  if (LEARN.feats) return LEARN.feats;
  const f = {}, p = typeof PERF !== 'undefined' && PERF.prof ? PERF.prof : { feats: {} };
  f.webgl = !!(p.gpu && p.gpu !== 'none' && p.gpu !== 'unknown');
  f.webgl2 = !!(p.feats && p.feats.webgl2);
  f.offscreen = typeof OffscreenCanvas !== 'undefined';
  f.audio = typeof (window.AudioContext || window.webkitAudioContext) === 'function';
  f.offlineAudio = typeof (window.OfflineAudioContext || window.webkitOfflineAudioContext) === 'function';
  f.worklet = typeof AudioWorkletNode !== 'undefined';
  f.crypto = !!(window.crypto && window.crypto.subtle);
  f.fetch = typeof fetch === 'function';
  f.websocket = typeof WebSocket === 'function';
  f.storage = (() => { try { localStorage.setItem('zc_probe', '1'); localStorage.removeItem('zc_probe'); return true; } catch (x) { return false; } })();
  f.observer = typeof ResizeObserver === 'function';
  f.gamepad = typeof navigator.getGamepads === 'function';
  f.bitmap = typeof createImageBitmap === 'function';
  return LEARN.feats = f;
}
const FEAT_WORDS = { webgl: 'WebGL graphics', webgl2: 'WebGL 2', offscreen: 'off-screen canvases', audio: 'Web Audio', offlineAudio: 'offline audio rendering', worklet: 'audio worklets', crypto: 'built-in encryption', fetch: 'network requests', websocket: 'WebSockets', storage: 'local storage', observer: 'resize observers', gamepad: 'controllers', bitmap: 'image bitmaps' };
// does this device give the engine what it needs? { ok: 'full' | 'part' | 'none', why }
function coreCompat(e) {
  const F = coreFeats(), need = (e.feats && e.feats.need) || [], want = (e.feats && e.feats.want) || [];
  const miss = need.filter(k => !F[k]), soft = want.filter(k => !F[k]);
  if (miss.length) return { ok: 'none', why: 'this device has no ' + miss.map(k => FEAT_WORDS[k] || k).join(' or ') + (e.feats.without ? ', so ' + e.feats.without : '') };
  if (soft.length) return { ok: 'part', why: 'no ' + soft.map(k => FEAT_WORDS[k] || k).join(' or ') + (e.feats.without ? ', so ' + e.feats.without : '') };
  return { ok: 'full', why: need.concat(want).length ? 'everything it uses is here (' + need.concat(want).map(k => FEAT_WORDS[k] || k).join(', ') + ')' : 'it needs nothing special from the device' };
}

/* ---------- capabilities: engines ask for what they need, not for each other ---------- */
// the healthy engine that provides a capability ('light', 'crowd', 'blood'...), or null
function coreWho(cap) {
  for (const e of CORE.list) if (!e.down && e.provides && e.provides.indexOf(cap) >= 0) return e.name;
  return null;
}
function coreCan(cap) { return coreWho(cap) != null; }
function coreCaps() { const m = {}; for (const e of CORE.list) for (const c of e.provides || []) (m[c] || (m[c] = [])).push(e.name); return m; }

/* ---------- self-tests at start ---------- */
function learnTestOne(e) {
  if (!e.selfTest) return null;
  const done = r => {
    r = r || { ok: false, why: 'no answer' };
    e.test = { ok: !!r.ok, n: r.n | 0, pass: r.pass | 0, why: r.why || '', t: Date.now() };
    if (!r.ok) { e.testBad = r.why || 'a check failed'; coreLog(e.name + ' failed its self-test (' + e.testBad + '): repairing'); }
    else { if (e.testBad) coreLog(e.name + ' passes its self-test again'); e.testBad = ''; }
    return e.test;
  };
  try { const r = e.selfTest(); if (r && typeof r.then === 'function') { r.then(done, x => done({ ok: false, why: String(x && x.message || x).slice(0, 80) })); return null; } return done(r); }
  catch (x) { return done({ ok: false, why: String(x && x.message || x).slice(0, 80) }); }
}
function learnTests() {
  LEARN.tested = true; let n = 0, ok = 0;
  for (const e of CORE.list) { if (!e.selfTest) continue; n++; const t = learnTestOne(e); if (!t || t.ok) ok++; }
  coreLog('CORE ran ' + n + ' self-tests at start: ' + (ok === n ? 'all passed' : (n - ok) + ' failed and are being repaired'));
}

/* ---------- what an engine is made of (for the engine room, the tests and the docs) ---------- */
function coreAudit(name) {
  const e = CORE.by[name]; if (!e) return null;
  const coveredBy = CORE.list.filter(c => c.covers && c.covers.indexOf(name) >= 0).map(c => c.name);
  const a = {
    adapts: !!(e.trim || (e.lv && e.adaptGet) || (e.tune && e.tune.apply) || e.adapts),
    repairs: !!((e.check || e.alive || e.selfTest) && (e.repair || e.reset || e.isolate)),
    learns: !!((e.lv && e.load) || e.learned),
    covers: !!((e.covers && e.covers.length) || coveredBy.length),
    beats: !!(e.alive || e.heart), tested: !!e.selfTest, compat: !!(e.feats || e.provides), docs: !!(typeof ENG_DOCS !== 'undefined' && ENG_DOCS[name]),
    coveredBy: coveredBy, why: e.noLearn || ''
  };
  a.score = ['adapts', 'repairs', 'learns', 'covers', 'beats', 'tested', 'compat', 'docs'].filter(k => a[k]).length;
  return a;
}
// what an engine has learned on this device, in a few lines for the engine room
function learnSummary(name) {
  const e = CORE.by[name]; if (!e || !LEARN.ready) return [];
  const r = learnRec(e), out = [];
  if (e.lv && e.load) {
    const b = learnBucket(coreCall(e, 'load', 0)), L = coreCall(e, 'lv', null), row = [];
    for (let l = Math.max(0, L - 2); l <= L + 1; l++) { const p = learnPredict(r, l, b); if (p != null) row.push('level ' + l + (l === L ? ' (now)' : '') + ' ≈ ' + p.toFixed(p < 1 ? 2 : 1) + ' ms'); }
    out.push(row.length ? 'With ' + learnLoadWords(e, b) + ': ' + row.join(', ') + '.' : 'Still learning what its levels cost with ' + learnLoadWords(e, b) + '.');
    const cells = Object.keys(r.c).length; out.push('Watched ' + (r.secs | 0) + ' seconds of play, ' + cells + ' level-and-load combination' + (cells === 1 ? '' : 's') + ' so far.');
    const ce = Object.entries(r.ce).filter(([, c]) => Date.now() < c[1]);
    if (ce.length) out.push('Holding back with ' + ce.map(([b2]) => learnLoadWords(e, +b2)).join(', ') + ' (it could not keep a higher level there).');
  } else if (e.noLearn) out.push(e.noLearn);
  const fixes = Object.entries(r.r).map(([sig, M]) => { const best = Object.entries(M).sort((a, b) => (b[1][1] + 1) / (b[1][0] + 2) - (a[1][1] + 1) / (a[1][0] + 2))[0]; return best && best[1][1] ? 'for "' + sig + '", ' + LEARN_WORDS[best[0]] + ' worked ' + best[1][1] + ' of ' + best[1][0] + ' times' : ''; }).filter(Boolean);
  if (fixes.length) out.push('Repairs learned: ' + fixes.slice(0, 2).join('; ') + '.');
  if (e.learned) { let own = []; try { own = e.learned() || []; } catch (x) { } out.push(...own.filter(Boolean)); }
  if (e.riseWhy) out.push('Right now: ' + e.riseWhy + '.');
  return out;
}
function learnTrust(name) { const e = CORE.by[name]; return e && LEARN.ready ? learnRec(e).tr : 1; }

/* ---------- adding an engine ---------- */
// One call registers an engine with everything the hub, the engine room and the docs read:
// coreDefine({ name, kind, ver, does, provides, needs, covers, feats: { need, want, without },
//   state, level, lv, adaptGet, load, loadName, zload, trim, canTrim, boost, alive, check, repair, reset, isolate,
//   restore, selfTest, learned, save, load, on: { event: fn }, spec: { files, parts, effort, procs, hard, eco, stats },
//   docs: { title, character, does, adapts, repairs, learns, works, runs, tune } })
function coreDefine(s) {
  const e = coreAdd(s);
  if (s.spec) e.spec = s.spec;
  if (s.docs && typeof ENG_DOCS !== 'undefined') ENG_DOCS[s.name] = s.docs;
  if (s.spec && !e.tune) e.tune = { effort: s.spec.effort !== false, effortWhy: s.spec.effortWhy, procs: s.spec.procs || ['cpu'], procWhy: s.spec.procWhy, gpuNo: s.spec.gpuNo, apply: s.spec.apply };
  if (CORE.verified) { coreLog(s.name + ' joined the ecosystem'); learnRec(e); }
  return e;
}

/* ---------- the engines that live in game.js or outside the modules ---------- */
// CORE itself, pathfinding, the name filter, the sound and the radio
function learnContracts() {
  coreMeta('CORE', { ver: 3, adapts: 'runs the time budget', provides: ['hub', 'learning'], feats: { want: ['storage'], without: 'what the engines learn lasts only until the page closes' },
    check: () => { for (const e of CORE.list) if (!(e.msAvg >= 0)) return e.name + "'s cost reading went bad"; return CORE.log.length > 60 ? 'its log overflowed' : ''; },
    repair: () => { for (const e of CORE.list) if (!(e.msAvg >= 0)) { e.msAvg = 0; e.ms = 0; } if (CORE.log.length > 40) CORE.log.splice(0, CORE.log.length - 40); },
    learned: () => { const d = LEARN.data || {}; return ['Learning on this device for ' + (d.ses | 0) + ' session' + (d.ses === 1 ? '' : 's') + '; ' + Object.values(d.e || {}).reduce((a, r) => a + Object.keys(r.c || {}).length, 0) + ' costs and ' + Object.values(d.e || {}).reduce((a, r) => a + Object.keys(r.r || {}).length, 0) + ' kinds of repair known across the engines.']; },
    selfTest: () => { const k = learnBucket(5) === 3 && learnBucket(0) === 0 && learnBucket(300) === 9, s = learnSig('3 errors (x is null)') === learnSig('7 errors (y)'); return { ok: k && s, n: 2, pass: (k ? 1 : 0) + (s ? 1 : 0), why: k ? (s ? '' : 'problem grouping') : 'load buckets' }; } });
  // pathfinding: how long a field takes to build here, and a refresh interval that follows it (host only)
  coreMeta('FLOW', { ver: 2, adapts: 'how often the paths refresh follows what a field costs here', provides: ['paths'], loadName: 'zombies', load: () => G.zs.length,
    alive: () => G.mode === 'play' && NET.role !== 'client' && G.zs.length > 0, stallS: 4,
    check: () => G.mode === 'play' && NET.role !== 'client' && FF.ready && G.time - FF.t > 3 ? 'its paths are ' + (G.time - FF.t).toFixed(1) + ' s old' : '',
    repair: () => { FF.ready = false; FF.t = -1; }, reset: () => { for (const F of [FF, FFS, FFB, FFP]) { F.ready = false; F.t = -1; } },
    learned: () => { const o = learnOwn('FLOW'); return o.ms ? ['A path field takes about ' + o.ms.toFixed(1) + ' ms to build here (' + FF_N + ' × ' + FF_N + ' cells); on Auto it refreshes every ' + flowIv().toFixed(2) + ' s.'] : []; } });
  // the name filter: never learns (it must treat every name the same), checks itself instead
  coreMeta('FILTER', { ver: 2, provides: ['nameSafety'], noLearn: 'Learns nothing on purpose: it has to treat every name the same way on every device.',
    selfTest: () => ZCF.selfTest(), check: () => ZCF.size().word ? '' : 'its word lists are empty', repair: () => ZCF.reload(), reset: () => ZCF.reload() });
  // the sound engine and the radio: they heal their own audio clocks (PERF calls them every 2 s); here they report
  coreMeta('SFX', { ver: 2, adapts: 'quality, capped at what this device keeps up with', provides: ['sound'], feats: { need: ['audio'], without: 'the game is silent' },
    heart: 'its audio clock is checked every 2 seconds: resumed if the device suspended it, rebuilt if it froze',
    check: () => { let h = {}; try { h = SFX.health(); } catch (x) { return ''; } return h.state === 'closed' ? 'its audio clock closed' : ''; },
    repair: () => { try { SFX.selfHeal(true); } catch (x) { } }, reset: () => { try { SFX.rebuild(); } catch (x) { } },
    learned: () => { const o = learnOwn('SFX'); return o.lr != null ? ['Late sounds here: ' + (o.lr * 60).toFixed(1) + ' a minute at ' + ['low', 'medium', 'high'][o.q == null ? 2 : o.q] + ' quality' + (o.cap != null ? '; it settled on ' + ['low', 'medium', 'high'][o.cap] + ' quality for this device' : '') + '.'] : []; } });
  coreMeta('RADIO', { ver: 2, adapts: 'how much music it keeps ready', provides: ['music'], heart: 'its own audio clock is checked every 2 seconds, and a song render that never finishes is dropped and tried again', feats: { need: ['offlineAudio'], want: ['worklet'], without: 'FM 66.6 cannot render its songs (your own music still plays)' },
    check: () => { let h = {}; try { h = SFX.health(); } catch (x) { return ''; } return h.radio === 'closed' ? 'its audio clock closed' : ''; },
    repair: () => { try { SFX.selfHeal(true); } catch (x) { } },
    learned: () => { const o = learnOwn('RADIO'); return o.k ? ['Renders a second of music in about ' + Math.round(o.k * 1000) + ' ms here, so it keeps ' + radioAhead(o) + ' s of music ready ahead.'] : []; } });
}
// what the sound engine learns: if it keeps falling behind at high quality, this device gets medium (and so on)
function learnSfx() {
  let h; try { h = SFX.health(); } catch (x) { return; } if (!h || h.state !== 'running') return;
  const o = learnOwn('SFX'), now = performance.now();
  if (o._t == null || o._late == null || h.late < o._late) { o._t = now; o._late = h.late; return; }
  if (now - o._t < 60000) return;
  const rate = (h.late - o._late) / ((now - o._t) / 1000); o._t = now; o._late = h.late;
  o.lr = o.lr == null ? rate : o.lr * 0.7 + rate * 0.3; o.q = h.quality;
  // more than one late sound every 20 seconds, at a quality above low: this device gets one step less from now on
  const cap0 = o.cap;
  if (o.lr > 0.05 && h.quality > 0 && (o.cap == null || o.cap >= h.quality)) { o.cap = h.quality - 1; coreLog('SFX learned to run at ' + ['low', 'medium'][o.cap] + ' quality on this device (it kept falling behind)'); }
  else if (o.lr < 0.005 && o.cap != null && o.cap < 2 && (o.calm = (o.calm | 0) + 1) >= 10) { o.cap++; o.calm = 0; coreLog('SFX steps its quality back up: it has kept up for a long while'); }
  if (o.cap !== cap0 && typeof SET !== 'undefined' && SET.aq === 'auto' && !(TUNE.SFX)) { try { SFX.setQuality(sfxAutoQ(Q.audio)); } catch (x) { } }
  learnDirty();
}
// the audio quality on Auto: the device's tier, capped by what the sound engine learned it can keep up with
function sfxAutoQ(q) { if (!LEARN.ready || typeof CORE === 'undefined' || !CORE.by.SFX) return q; const o = learnOwn('SFX'); return o.cap != null ? Math.min(q, o.cap) : q; }
// the radio keeps more music ready on a device that renders slowly (24 s normally, up to 48)
function radioAhead(o) { return Math.round(clamp(24 * (o.k ? Math.max(1, o.k * 6) : 1) + (o.late || 0) * 4, 24, 48)); }
function learnRadio() {
  let d; try { d = SFX.fm.renderStats(); } catch (x) { return; } if (!d || !d.chunks) return;
  const o = learnOwn('RADIO');
  if (d.chunks !== o._n && d.renderMs > 0 && d.audioS > 0) { o._n = d.chunks; const k = d.renderMs / 1000 / d.audioS; o.k = o.k ? o.k * 0.8 + k * 0.2 : k; learnDirty(); }
  if (d.late > (o._late || 0)) { o.late = Math.min(6, (o.late || 0) + 1); o._late = d.late; learnDirty(); }
  try { SFX.fm.ahead(radioAhead(o)); } catch (x) { }
}
// pathfinding: an average of what a field costs to build here; on Auto the refresh follows it (0.3 s when fields are
// cheap and the street is full, up to 0.5 s when they are expensive and the frame is tight); the engine room's
// Eco, Hard and Max set it outright
function flowLearn(ms) {
  if (!LEARN.ready || !CORE.by.FLOW) return;
  const o = learnOwn('FLOW'); o.ms = o.ms ? o.ms * 0.9 + ms * 0.1 : ms; o.n = (o.n | 0) + 1; if (o.n % 50 === 0) learnDirty();
}
function flowIv() {
  const k = TUNE.FLOW || 0; if (k) return [0.55, 0.35, 0.25, 0.18][k + 1];
  if (!LEARN.ready || !CORE.by.FLOW) return 0.35;
  const o = learnOwn('FLOW'), ms = o.ms || 0, T = 1000 / targetFps(), tight = PERF.fps && PERF.fps < targetFps() * 0.9;
  if (ms > T * 0.15 && tight) return 0.5;
  if (ms > T * 0.08 && tight) return 0.42;
  if (ms && ms < T * 0.04 && G.zs.length > 60 && !tight) return 0.3;
  return 0.35;
}
