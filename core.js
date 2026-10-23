/* ================= CORE: the engine hub (v2) =================
   Zombie City is built from engines (lighting, shaders, textures, weather, the city, pathfinding, sound, co-op, blood,
   bullets...). CORE is where they meet, so they work as one system instead of side by side:
   - Every engine registers here with its name, what it does, a version, what it needs from the others, what it gives
     them, and hooks: its state and level, its cost, how to step it down or up, how to check itself, repair itself,
     rest and come back, and what it can do for the others.
   - The shared frame: each frame the renderer fills CORE.frame once (the view, the camera, the sun, the brightest
     lights, the hot spots) and every engine reads the same numbers from it.
   - The time budget: engines report their own cost each frame; when the frame runs late the performance governor asks
     CORE which engine to step down first (the one taking the biggest share), and steps it back up when there is room.
   - The message bus: engines talk to each other through events instead of reaching into each other: a new run starts,
     memory runs short, the device's quality tier changes, a zombie dies, an engine goes down or comes back. A listener
     that keeps throwing is taken off the bus instead of breaking the one that called.
   - The watchdog: every two seconds CORE asks each engine whether it is sound. A problem gets the engine's own repair
     first; if it is still there next time, the other engines that can help are asked to (the governor frees memory,
     the loader warms the lighting again); if it keeps coming back the engine is rested for a minute (longer each time),
     the ones that can cover for it do (the lighting engine does bloom on the processor when the shader engine is down,
     the game draws plain stains and tracers), and everyone that depends on it is told so it can adapt.
   - Updates: the level each engine settled at on this device is remembered with the game's and the engine's
     version. Next time it starts where it was steady; after an update (a new version of the game or of that engine)
     it starts fresh and finds its level again.
   - Learning (CORE v3, learn.js): what each engine costs here at each level and load, ceilings it could not hold,
     which repair works for which problem, trust, heartbeats, self-tests and what each engine needs from the device.
   Nothing here may stop the game: every hook and listener call is guarded. */
const CORE = {
  list: [], by: {}, sec: 0, lastSec: 0, trims: [], bus: new Map(), log: [], watchT: 0, saveT: 0, verified: false, saved: null,
  frame: { n: 0, t: 0, dt: 0.016, x0: 0, y0: 0, x1: 0, y1: 0, cx: 0, cy: 0, zoom: 1, dpr: 1, w: 1, h: 1,
    sun: { on: false, az: 0, el: 0, k: 0, dx: 0, dy: 0, col: [1, 1, 1], sky: [1, 1, 1] }, amb: [1, 1, 1], day: 1, night: 0, lights: [], hot: [], wet: 0, fog: 0, dust: 0 }
};
// e: { name, does, kind: 'render' | 'world' | 'sim' | 'audio' | 'net' | 'data', ver, needs: [names], provides: [what],
//      covers: [names it stands in for], helps: { NAME: fn }, state(), level(), trim(), boost(), check() -> '' or a
//      problem, notes() -> '', repair(), isolate(), restore(), save() -> value, load(value), on: { event: fn } }
function coreAdd(e) {
  if (CORE.by[e.name]) return CORE.by[e.name];
  e.ms = 0; e.msAvg = 0; e.msSec = 0; e.errs = 0; e.repairs = e.repairs || 0; e.lastErr = ''; e.health = 'ok'; e.ver = e.ver || 1; e.bad = 0; e.down = false; e.downs = 0;
  e.still = 0; e._clean = 0; e.beatSec = false; e.inc = null; e.holdRise = 0; e.riseWhy = ''; e.stalled = ''; e.testBad = '';
  CORE.list.push(e); CORE.by[e.name] = e;
  if (e.on) for (const k in e.on) coreOn(k, e.name, e.on[k]);
  return e;
}
// more about an engine registered elsewhere (what it covers, who it helps)
function coreMeta(name, m) { const e = CORE.by[name]; if (e) { Object.assign(e, m); if (m.on) for (const k in m.on) coreOn(k, name, m.on[k]); } return e; }
// an engine reports what a frame cost it (milliseconds)
function coreCost(name, ms) { const e = CORE.by[name]; if (e) e.ms += ms; }
// an engine reports an error; its own repair hook decides what to do about it, and the watchdog keeps an eye on it
function coreHurt(name, err) {
  const e = CORE.by[name]; if (!e) return;
  e.errs++; e.lastErr = String(err && err.message || err).slice(0, 120);
}
function coreRepaired(name, what) { const e = CORE.by[name]; if (e) e.repairs++; coreLog(what); if (typeof noteRepair === 'function') noteRepair(what); }
function coreLog(msg) { CORE.log.push({ t: Date.now(), msg: String(msg).slice(0, 160) }); if (CORE.log.length > 40) CORE.log.shift(); }
const coreCall = (e, k, d) => { try { return e[k] ? e[k]() : d; } catch (x) { return d; } };
/* ---------- the message bus ---------- */
function coreOn(evt, who, fn) { let L = CORE.bus.get(evt); if (!L) CORE.bus.set(evt, L = []); if (!L.some(l => l.who === who && l.fn === fn)) L.push({ who: who, fn: fn, fails: 0 }); }
function coreEmit(evt, data) {
  const L = CORE.bus.get(evt); if (!L || !L.length) return 0;
  let n = 0;
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    try { l.fn(data); n++; }
    catch (x) { l.fails++; coreHurt(l.who, x); if (l.fails >= 3) { L.splice(i--, 1); coreLog(l.who + ' stopped listening to "' + evt + '" after errors'); } }
  }
  return n;
}
// once a second: average each engine's cost over the frames of that second; every two seconds, the watchdog
function coreTick(now) {
  CORE.fc = (CORE.fc || 0) + 1;
  if (now - CORE.lastSec < 1000) return; CORE.lastSec = now;
  const n = Math.max(1, CORE.fc); CORE.fc = 0;
  for (const e of CORE.list) {
    const ms = e.ms / n; e.msSec = ms; e.beatSec = e.beatOwn ? !!e._beat : e.ms > 0 || !!e._beat; e._beat = false;
    e.msAvg = e.msAvg ? e.msAvg * 0.6 + ms * 0.4 : ms; e.ms = 0; if (e.sec) coreCall(e, 'sec');
    // the last minute of what it cost, for the engine room's graphs
    (e.hist || (e.hist = [])).push(Math.round(e.msAvg * 100) / 100); if (e.hist.length > 60) e.hist.shift();
  }
  CORE.fps = typeof PERF !== 'undefined' ? PERF.fps : 0;
  try { coreTuneTick(now); } catch (x) { }
  if (!CORE.verified) coreVerify();
  // CORE v3 (learn.js): costs, ceilings, heartbeats and trust, every second; the sound and the radio every 5 seconds
  try { learnTick(now); } catch (x) { coreHurt('CORE', x); }
  if ((CORE.sec = (CORE.sec || 0) + 1) % 5 === 0) { try { learnSfx(); learnRadio(); } catch (x) { } }
  if (now - CORE.watchT >= 2000) { CORE.watchT = now; try { coreWatch(now); } catch (x) { } }
  if (now - CORE.saveT >= 30000) { CORE.saveT = now; coreSave(); }
}
/* ---------- the watchdog ---------- */
// Every two seconds. A problem (a run of errors, the engine's own check, a heartbeat gone quiet, a failed self-test)
// opens an incident; CORE then tries the fixes it has learned work best for that kind of problem on this device
// (its own repair, help from the others, a step down, a fresh start; at most three), then rests it. The fix that
// was tried last when the problem cleared gets the credit, so the next incident starts with what works.
function coreWatch(now) {
  for (const e of CORE.list) {
    if (e.down) {
      if (now >= e.downUntil) {
        coreCall(e, 'restore'); e.down = false; e.health = 'back'; e.bad = 0; e.errsSeen = e.errs; e.still = 0;
        coreLog(e.name + ' is back after resting'); coreEmit('engineUp', { name: e.name });
      }
      continue;
    }
    // a run of errors since the last look, the engine's own check, a heartbeat gone quiet, a self-test still failing
    let problem = '';
    if (e.errs - (e.errsSeen || 0) >= 3) problem = (e.errs - (e.errsSeen || 0)) + ' errors (' + e.lastErr + ')';
    e.errsSeen = e.errs;
    if (!problem && e.check) problem = String(coreCall(e, 'check', '') || '');
    if (!problem && e.stalled) { problem = e.stalled; e.stalled = ''; }
    if (!problem && e.testBad) { const t = learnTestOne(e); if (t && !t.ok) problem = 'its self-test failed (' + t.why + ')'; }
    if (!problem) {
      if (e.inc) learnCredit(e);
      if (e.bad) coreLog(e.name + ' is sound again'); e.bad = 0;
      if (e.health !== 'degraded' && e.health !== 'adapting') e.health = e.health === 'back' || e.repairs ? 'mended' : 'ok';
      continue;
    }
    e.bad++; e.health = 'mending';
    if (!e.inc) learnIncident(e, problem, now);
    const s = learnPick(e);
    if (s === 'rest') {
      // its best fixes did not hold: rest it (a minute, longer each time), let the others cover for it and adapt
      learnTried(e, 'rest'); learnRested(e); e.inc = null;
      e.downs++; e.down = true; e.downUntil = now + 60000 * Math.min(5, e.downs); e.health = 'resting'; e.bad = 0;
      coreCall(e, 'isolate');
      const cov = CORE.list.filter(c => c.covers && c.covers.indexOf(e.name) >= 0 && !c.down).map(c => c.name);
      coreLog(e.name + ' is resting (' + problem + ')' + (cov.length ? '; ' + cov.join(', ') + ' cover' + (cov.length > 1 ? '' : 's') + ' for it' : ''));
      if (typeof noteRepair === 'function') noteRepair(e.name + ' is resting for a moment');
      coreEmit('engineDown', { name: e.name, why: problem });
    } else if (s) {
      learnTried(e, s);
      if (!learnApply(e, s, problem, now)) coreLog('CORE: ' + e.name + ': ' + problem + ' (' + LEARN_WORDS[s] + ' had nothing to do)');
    } else if (e.bad >= 6) { e.inc.tried.length = 0; e.bad = 0; }   // nothing left to try and it cannot rest: start over
  }
}
// is this engine up? (engines ask before leaning on another one)
function coreUp(name) { const e = CORE.by[name]; return !!e && !e.down; }
/* ---------- versions, dependencies and remembered levels ---------- */
// how the engines lean on each other (set once everything has registered)
function coreLinks() {
  const mem = () => { if (typeof trimCaches === 'function') trimCaches(1); };
  const lvl = (o, k, lo) => v => { o[k] = clamp(Math.round(+v) || 0, lo == null ? -2 : lo, 0); };
  const rest = o => ({ isolate: () => { o.offUntil = performance.now() + 60000; }, restore: () => { o.offUntil = 0; } });
  // the governor frees memory for anyone short of it; the loader warms the lighting and the sprites again
  coreMeta('PERF', { helps: { TEXEL: mem, GORE: mem, MUZZLE: mem, TRACER: mem, AURA: mem, MIRROR: mem, SKYWAY: mem, GARAGE: mem, LUX: mem, SWARM: () => { mem(); if (typeof swarmForget === 'function') swarmForget(); } } });
  coreMeta('LOADER', { helps: { LUX: () => { LUX.A = null; LUX.offUntil = 0; if (typeof luxWarm === 'function') luxWarm(); }, TEXEL: () => { if (typeof sprites !== 'undefined') sprites.clear(); } } });
  if (typeof LUX !== 'undefined') coreMeta('LUX', Object.assign({ needs: ['WORLD'], covers: ['PRISM', 'AURA'], save: () => LUX.adapt, load: lvl(LUX, 'adapt') }, rest(LUX), { restore: () => { LUX.offUntil = 0; LUX.A = null; } }));
  if (typeof PRISM !== 'undefined') coreMeta('PRISM', Object.assign({ needs: ['LUX'], save: () => PRISM.adapt, load: lvl(PRISM, 'adapt') }, rest(PRISM)));
  if (typeof MIRROR !== 'undefined') coreMeta('MIRROR', Object.assign({ needs: ['LUX', 'PRISM', 'WORLD'], save: () => MIRROR.adapt, load: lvl(MIRROR, 'adapt') }, rest(MIRROR)));
  if (typeof TEXEL !== 'undefined') coreMeta('TEXEL', Object.assign({ needs: ['MUTAGEN'], save: () => TEXEL.adapt, load: lvl(TEXEL, 'adapt') }, rest(TEXEL)));
  if (typeof MUZZLE !== 'undefined') coreMeta('MUZZLE', Object.assign({ needs: ['LUX'] }, rest(MUZZLE)));
  coreMeta('WORLD', { covers: ['GORE'] }); coreMeta('GARAGE', { needs: ['WORLD', 'LUX'] }); coreMeta('SKYWAY', { needs: ['WORLD', 'LUX'] });
  coreMeta('NET', { needs: ['WORLD'] }); coreMeta('FLOW', { needs: ['WORLD'], covers: ['SWARM'] });
  // engines that lean on another hear when it goes down or comes back
  coreOn('engineDown', 'CORE', d => { for (const e of CORE.list) if (e.needs && e.needs.indexOf(d.name) >= 0 && e.health !== 'resting') e.health = 'adapting'; });
  coreOn('engineUp', 'CORE', d => { for (const e of CORE.list) if (e.needs && e.needs.indexOf(d.name) >= 0 && e.health === 'adapting') e.health = 'ok'; });
}
function coreVerify() {
  CORE.verified = true;
  try { coreLinks(); } catch (x) { coreLog('CORE could not link every engine: ' + (x && x.message)); }
  try { learnInit(); learnContracts(); for (const e of CORE.list) learnRec(e); } catch (x) { coreLog('CORE could not start learning: ' + (x && x.message)); }
  LEARN.testsAt = performance.now() + 4000;   // the self-tests, once the title has settled
  coreOn('run', 'CORE', () => learnCautious());
  coreOn('horde', 'CORE', d => learnAhead(d && d.n, 'a horde'));
  coreOn('wave', 'CORE', d => learnAhead(d && d.n, 'wave ' + (d && d.wave)));
  for (const e of CORE.list) {
    const missing = (e.needs || []).filter(n => !CORE.by[n]);
    if (missing.length) { e.health = 'degraded'; coreLog(e.name + ' is missing ' + missing.join(', ') + ' and runs without it'); }
  }
  // the levels each engine settled at on this device last time, if nothing has been updated since
  let S = null; try { S = typeof store !== 'undefined' ? store.get('zc_core', null) : null; } catch (x) { }
  CORE.saved = S;
  const gameVer = typeof ZC_VERSION !== 'undefined' ? ZC_VERSION : '';
  for (const e of CORE.list) {
    if (!e.load) continue;
    const r = S && S.engines && S.engines[e.name];
    if (!r) continue;
    if (S.game !== gameVer || r.ver !== e.ver) { coreLog(e.name + ' updated' + (r.ver !== e.ver ? ' (v' + r.ver + ' to v' + e.ver + ')' : '') + ': finding its level again'); continue; }
    try { e.load(r.v, r.downs || 0); } catch (x) { }
  }
}
function coreSave() {
  if (!CORE.verified || typeof store === 'undefined') return;
  const out = { game: typeof ZC_VERSION !== 'undefined' ? ZC_VERSION : '', engines: {} };
  for (const e of CORE.list) if (e.save) { try { out.engines[e.name] = { ver: e.ver, v: e.save(), downs: e.downs || 0 }; } catch (x) { } }
  try { store.set('zc_core', out); } catch (x) { }
  learnSave();
}
/* ---------- tuning (Settings > Accessibility > Ultra advanced, the engine room) ----------
   Every engine can be told to run harder or lighter (its effort: Auto, Eco, Normal, Hard, Max) and, where it has both,
   to run on the processor or the graphics chip (CPU, GPU, Auto). The player chooses, the ecosystem has the last word:
   - what an engine cannot do is locked to what it can ("Auto-lock", purple), with the reason written down: an engine
     that only exists on the processor, a GPU path on a device without a usable graphics chip, a path that needs
     another engine on the GPU first, an engine resting after errors, an engine whose job must be the same everywhere;
   - when a choice starts to hurt the game (the frame rate well under its target for 8 seconds while that engine is
     among the costliest, or the engine failing again and again), it is locked back to Auto for 5 minutes, and the
     engine room says what happened, with the numbers.
   Effort reaches each engine through TUNE[name] (-1 Eco, 0 Normal or Auto, 1 Hard, 2 Max) and its tune.apply hook. */
const TUNE = {};
const EFFORTS = ['auto', 'eco', 'normal', 'hard', 'max'], EFFORT_K = { auto: 0, eco: -1, normal: 0, hard: 1, max: 2 }, EFFORT_W = { auto: 1, eco: 1.9, normal: 1, hard: 0.4, max: 0 };
function coreTune(name) {
  const T = (typeof SET !== 'undefined' && SET.eng && SET.eng[name]) || {};
  // (PRISM's processor is the same choice as Settings > Graphics > Shader engine)
  const proc = name === 'PRISM' && typeof SET !== 'undefined' ? (SET.prism === 'gpu' || SET.prism === 'cpu' ? SET.prism : 'auto') : T.proc === 'cpu' || T.proc === 'gpu' ? T.proc : 'auto';
  return { effort: EFFORTS.indexOf(T.effort) >= 0 ? T.effort : 'auto', proc: proc };
}
// what locks an engine's choices right now, and why (an empty reason: free to choose)
function coreLocks(e, now) {
  const t = e.tune || {}, L = { effort: '', proc: '', procTo: '' }, at = d => { const m = Math.max(0, Math.ceil((d - now) / 60000)); return m <= 1 ? 'in about a minute' : 'in about ' + m + ' minutes'; };
  if (e.down) { const w = e.name + ' is resting after repeated errors and comes back ' + at(e.downUntil) + '; until then the ecosystem runs it for you.'; L.effort = w; L.proc = w; L.procTo = 'auto'; return L; }
  if (e.lockUntil > now) { L.effort = e.lockWhy + ' Unlocks ' + at(e.lockUntil) + '.'; L.proc = L.effort; L.procTo = 'auto'; return L; }
  if (t.effort === false) L.effort = t.effortWhy || 'The ecosystem keeps this engine where it is.';
  const procs = t.procs || ['cpu'];
  if (procs.length < 2) { L.proc = t.procWhy || (e.name + ' only runs on the processor.'); L.procTo = procs[0] || 'cpu'; }
  else if (typeof t.gpuNo === 'function') { const why = coreCall({ f: t.gpuNo }, 'f', ''); if (why) { L.proc = why; L.procTo = 'cpu'; } }
  return L;
}
// what applies right now, after the locks
function coreEff(name) {
  const e = CORE.by[name]; if (!e) return { effort: 'auto', proc: 'auto', locks: { effort: '', proc: '' } };
  const t = coreTune(name), L = coreLocks(e, performance.now());
  return { effort: L.effort ? 'auto' : t.effort, proc: L.proc ? (L.procTo || 'auto') : t.proc, locks: L, want: t };
}
// once a second: hand every engine its effort, then let the ecosystem check that no choice is hurting the game
function coreTuneTick(now) {
  for (const e of CORE.list) {
    const f = coreEff(e.name), k = EFFORT_K[f.effort] || 0;
    TUNE[e.name] = f.effort === 'auto' ? 0 : k; e.effort = f.effort; e.procNow = f.proc;
    if (e.tune && e.tune.apply) { try { e.tune.apply(f.effort === 'auto' ? null : k, f.proc); } catch (x) { coreHurt(e.name, x); } }
  }
  coreGuard(now);
}
function coreGuard(now) {
  const fps = typeof PERF !== 'undefined' ? PERF.fps : 0, tgt = typeof targetFps === 'function' ? targetFps() : 60;
  // a choice that keeps failing goes back to Auto
  for (const e of CORE.list) {
    const t = coreTune(e.name), mine = t.effort !== 'auto' || t.proc !== 'auto';
    if (!mine || e.lockUntil > now) { e.tuneErrs = e.errs; continue; }
    if (e.errs - (e.tuneErrs == null ? e.errs : e.tuneErrs) >= 3) coreLock(e, now, 'Locked by the ecosystem: ' + e.name + ' failed ' + (e.errs - e.tuneErrs) + ' times since you set it to ' + coreTuneWords(t) + ' (' + (e.lastErr || 'an error') + '), so it was put back on Auto.');
    e.tuneErrs = e.errs;
  }
  // the frame rate well under target for 8 seconds: the costliest engine running on your choice goes back to Auto
  if (fps && fps < tgt * 0.7) CORE.slowS = (CORE.slowS || 0) + 1; else CORE.slowS = 0;
  if (CORE.slowS >= 8) {
    let worst = null;
    for (const e of CORE.list) { const t = coreTune(e.name); if ((t.effort === 'hard' || t.effort === 'max' || t.proc !== 'auto') && !(e.lockUntil > now) && !e.down && (!worst || e.msAvg > worst.msAvg)) worst = e; }
    // (it has to matter: at least 0.4 ms and 5% of the frame)
    if (worst && worst.msAvg > 0.4 && (!fps || worst.msAvg / (1000 / fps) > 0.05)) {
      const t = coreTune(worst.name), frame = fps ? 1000 / fps : 0;
      coreLock(worst, now, 'Locked by the ecosystem: the game ran at ' + Math.round(fps) + ' fps for 8 seconds against a target of ' + Math.round(tgt) + ', and ' + worst.name + ' on ' + coreTuneWords(t) + ' was taking ' + worst.msAvg.toFixed(1) + ' ms of every ' + frame.toFixed(0) + ' ms frame, the most of any engine you had tuned, so it went back to Auto.');
      CORE.slowS = 0;
    }
  }
}
function coreTuneWords(t) { const E = { auto: 'Auto', eco: 'Eco', normal: 'Normal', hard: 'Hard', max: 'Max' }; return (t.effort !== 'auto' ? E[t.effort] : '') + (t.effort !== 'auto' && t.proc !== 'auto' ? ', ' : '') + (t.proc !== 'auto' ? t.proc.toUpperCase() : '') || 'Auto'; }
function coreLock(e, now, why) {
  e.lockUntil = now + 300000; e.lockWhy = why; e.locks = (e.locks || 0) + 1;
  coreLog(why); if (typeof noteRepair === 'function') noteRepair(e.name + ' was put back on Auto');
  coreEmit('engineLocked', { name: e.name, why: why });
}
// the frame is running late: step down the engine whose step down saves the most, as learned on this device (or,
// while it is still learning, the render engine taking the biggest share above a floor); true if one did. An engine
// set to Eco goes first, one set to Hard last, one set to Max never (the ecosystem's guard watches that).
function coreTrim(frameMs) {
  let best = null, bestW = 0; const floor = Math.max(0.6, frameMs * 0.12);
  for (const e of CORE.list) {
    if ((e.kind !== 'render' && !e.trimAny) || !e.trim || e.down || !coreCall(e, 'canTrim', true)) continue;
    const ew = EFFORT_W[e.effort || 'auto'] == null ? 1 : EFFORT_W[e.effort || 'auto']; if (!ew) continue;
    const save = learnSaving(e), w = (save != null ? save * 2.5 : e.msAvg) * ew;
    if ((save != null ? save > floor * 0.4 : e.msAvg > floor * 0.5) && w > Math.max(bestW, floor)) { best = e; bestW = w; }
  }
  if (!best) return false;
  if (coreCall(best, 'trim', false)) {
    best.holdRise = performance.now() + 20000; best.holdWhy = 'stepped down for the frame rate';   // (it does not climb straight back into the same slow frame)
    CORE.trims.push(best.name); if (CORE.trims.length > 12) CORE.trims.shift(); if (typeof logTrim === 'function') logTrim(best.name.toLowerCase());
    const sv = learnSaving(best); coreLog('CORE stepped ' + best.name + ' down for the frame rate: ' + (sv != null ? 'on this device that saves about ' + sv.toFixed(1) + ' ms here' : 'it was taking ' + best.msAvg.toFixed(1) + ' ms of every frame'));
    return true;
  }
  return false;
}
// there is room again: give the last trimmed engine a level back (one set to Hard or Max first), if it fits
function coreBoost() {
  for (const e of CORE.list) if ((e.effort === 'hard' || e.effort === 'max') && CORE.trims.indexOf(e.name) >= 0 && coreRise(e.name) && coreCall(e, 'boost', false)) return true;
  while (CORE.trims.length) {
    const e = CORE.by[CORE.trims[CORE.trims.length - 1]];
    if (e && coreRise(e.name) && coreCall(e, 'boost', false)) return true;
    CORE.trims.pop();
  }
  return false;
}
// for Settings > System: one line per engine
function coreStatus() {
  return CORE.list.map(e => ({ name: e.name, does: e.does, kind: e.kind, state: e.down ? 'resting' : coreCall(e, 'state', 'on'), level: coreCall(e, 'level', ''), ms: Math.round(e.msAvg * 100) / 100, errs: e.errs, repairs: e.repairs,
    health: e.health, ver: e.ver, needs: e.needs || [], covers: e.covers || [], helps: e.helps ? Object.keys(e.helps) : [], notes: String(coreCall(e, 'notes', '') || ''),
    effort: e.effort || 'auto', proc: e.procNow || 'auto', locked: !!(e.lockUntil > performance.now()), downs: e.downs || 0,
    trust: Math.round(learnTrust(e.name) * 100) / 100, test: e.test || null, stalls: e.stalls || 0, provides: e.provides || [], audit: coreAudit(e.name), compat: coreCompat(e) }));
}
// the renderer fills the shared frame once, before the engines that read it
function coreFrame(x0, y0, x1, y1, dt) {
  const F = CORE.frame; F.n++; F.t = G.time; F.dt = dt; F.x0 = x0; F.y0 = y0; F.x1 = x1; F.y1 = y1; F.cx = cam.x; F.cy = cam.y;
  F.zoom = ZOOM; F.dpr = DPR; F.w = W; F.h = H; F.tr = ctx.getTransform(); F.wet = WX.wet || 0; F.fog = WX.fog || 0; F.dust = (WX.sand || 0) + (WX.ash || 0) * 0.5;
  return F;
}
// world point to screen pixel (of the game canvas), using the frame's camera
// (1.9.998.1: through the frame's whole transform, so the gun's kick, the shake, the camera's zoom and its roll are all
// in it; it used to rebuild the camera from the base zoom alone, and the lights it placed for the shader slid off theirs)
function coreToScreen(x, y, out) {
  const F = CORE.frame, T = F.tr;
  if (T) { out[0] = T.a * x + T.c * y + T.e; out[1] = T.b * x + T.d * y + T.f; return out; }
  const s = F.zoom * F.dpr; out[0] = (x - F.cx) * s + cv.width / 2; out[1] = (y - F.cy) * s + cv.height / 2; return out;
}
// 1.9.998.1: put a picture on the world at (x, y), turned and scaled by co = cos(turn) * scale and si = sin(turn) * scale
// (world units), under the world transform T. The camera rolls the frame a fraction of a degree (each shot's trauma, the
// dodge), so a sprite's matrix has to be T times its own place and turn. Rebuilding it from T's scale and offset alone
// drops the roll, and the offset then carries roll times the sprite's distance from the map's origin: in the city that
// is hundreds of pixels, so everything drawn that way jumped about the screen as the frame shook.
function wPut(c, T, x, y, co, si) {
  c.setTransform(T.a * co + T.c * si, T.b * co + T.d * si, T.c * co - T.a * si, T.d * co - T.b * si, T.a * x + T.c * y + T.e, T.b * x + T.d * y + T.f);
}

coreAdd({ name: 'CORE', kind: 'sim', ver: 3, covers: ['TRACER', 'MUZZLE'], does: 'Engine hub and learning ecosystem: connects every engine through one shared frame, one time budget, a message bus, a capability registry and a watchdog with heartbeats and self-tests; it learns on each device what every engine costs at each level and load, steps engines down before a horde arrives, remembers which repair fixed which problem and tries that first, builds trust in engines that run clean, remembers levels across updates, and runs the engine room\'s tuning and locks.', state: () => 'on', level: () => CORE.list.length + ' engines, ' + CORE.list.filter(e => e.down).length + ' resting, ' + Array.from(CORE.bus.values()).reduce((a, L) => a + L.length, 0) + ' listeners' });
// the engines that were here before the hub: registered so the whole set shows in one place and shares one budget
coreAdd({ name: 'PERF', kind: 'sim', does: 'Performance governor: detects the hardware, sets resolution, quality tier and frame cap, trims caches and restarts a stalled game loop.', state: () => PERF.mode === 'auto' ? 'on' : 'manual', level: () => (typeof TIER_NAMES !== 'undefined' ? TIER_NAMES[PERF.tier] : PERF.tier) + ' ' + Math.round((PERF.resLock || RES_STEPS[PERF.res]) * 100) + '%' });
coreAdd({ name: 'WORLD', kind: 'world', does: 'City generator: builds the endless city from a seed, district by district (blocks, rivers, bridges, props, seasons) at real-world scale.', state: () => 'on', level: () => (SCL > 1.2 ? 'real scale' : 'classic') + ', ' + chunks.size + ' blocks' });
coreAdd({ name: 'FLOW', kind: 'sim', does: 'Pathfinding: flow fields that lead every zombie to the nearest player, with wider paths for big mutants and bosses.', state: () => FF.ready ? 'on' : 'idle', level: () => FF_N + 'x' + FF_N + ' cells' });
coreAdd({ name: 'NET', kind: 'net', does: 'Wi-Fi co-op: host and clients, snapshots, reconnects, shared cards and revives for 2 to 4 players.', state: () => NET.started ? NET.role : 'off', level: () => NET.started ? (NET.role === 'host' ? NET.peers.size + ' joined' : 'joined') : '' });
coreAdd({ name: 'LOADER', kind: 'sim', does: 'Loading screens and warm-up: prepares the streets, textures, lights and shaders before play so nothing stutters.', state: () => LOADING.on ? 'loading' : 'idle', level: () => '' });
coreAdd({ name: 'WX', kind: 'world', does: 'Weather and atmosphere: weather systems in their real order (fronts, showers, thunderstorms, fog, heat, haboobs, snow) over a field of drifting rain cells with lives of their own; rain, sleet, snow and hail by temperature; lightning, gust fronts, fog banks, wind and gusts, puddles and settled snow, seasons, fireflies, breath in the cold and cloud shadows.', state: () => wxLevel() > 0 ? 'on' : 'off', level: () => (WX.label || WX.kind) + ' ' + Math.round(wxLevel() * 100) + '%' });
coreAdd({ name: 'LIFE', kind: 'world', does: 'Living city: trees, grass and bushes that sway, birds, props you can kick, explosive barrels, fires and car alarms.', state: () => 'on', level: () => WD.act.length + ' plants' });
coreAdd({ name: 'SFX', kind: 'audio', does: 'Sound engine: synthesizes every gunshot, impact, kill chain and ambience live, with echoes that change by district.', state: () => SFX.sfxOn && SFX.sfxOn() === false ? 'muted' : 'on', level: () => '' });
coreAdd({ name: 'RADIO', kind: 'audio', does: 'FM 66.6: writes and renders its own songs ahead of time on a separate audio thread, 7 channels of 35 songs, or your own music.', state: () => 'on', level: () => { try { return SFX.nowPlaying().name || ''; } catch (e) { return ''; } } });
coreAdd({ name: 'MUTAGEN', kind: 'data', does: 'Mutation engine: builds the 2.0 roster (the first 50 regular zombies, each with its own name, look, build, walk, ability and strength) and keeps the 1,000 old mutations resting until they are rebuilt.', state: () => 'on', level: () => (typeof ZR_ONLY !== 'undefined' && ZR_ONLY ? ZR.length + ' zombies (2.0), ' + (MUTS.length - ZR.length) + ' resting' : MUTS.length + ' mutations') });
coreAdd({ name: 'BOSS', kind: 'sim', does: 'Boss engine: 50 bosses with attack patterns that mutate into new forms mid-fight, plus the Snatcher and the Overlord; resting until the bosses are rebuilt for 2.0.', state: () => G.boss && !G.boss.dead ? 'fighting' : 'idle', level: () => (typeof ZR_BOSSES_OFF !== 'undefined' && ZR_BOSSES_OFF ? 'off until rebuilt' : '') });
coreAdd({ name: 'ACCOUNT', kind: 'data', does: 'Accounts and cloud saves: encrypts each save on the device (AES-GCM, PBKDF2) and merges progress across devices.', state: () => typeof ACCT !== 'undefined' ? ACCT.status : 'off', level: () => '' });
coreAdd({ name: 'FILTER', kind: 'data', does: 'Name filter: keeps slurs, threats, personal details and fake studio names out of every name shown.', state: () => 'on', level: () => '' });
