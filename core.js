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
  e.ms = 0; e.msAvg = 0; e.errs = 0; e.repairs = e.repairs || 0; e.lastErr = ''; e.health = 'ok'; e.ver = e.ver || 1; e.bad = 0; e.down = false; e.downs = 0;
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
  for (const e of CORE.list) { const ms = e.ms / n; e.msAvg = e.msAvg ? e.msAvg * 0.6 + ms * 0.4 : ms; e.ms = 0; if (e.sec) coreCall(e, 'sec'); }
  if (!CORE.verified) coreVerify();
  if (now - CORE.watchT >= 2000) { CORE.watchT = now; try { coreWatch(now); } catch (x) { } }
  if (now - CORE.saveT >= 30000) { CORE.saveT = now; coreSave(); }
}
/* ---------- the watchdog ---------- */
function coreWatch(now) {
  for (const e of CORE.list) {
    if (e.down) {
      if (now >= e.downUntil) {
        coreCall(e, 'restore'); e.down = false; e.health = 'back'; e.bad = 0; e.errsSeen = e.errs;
        coreLog(e.name + ' is back after resting'); coreEmit('engineUp', { name: e.name });
      }
      continue;
    }
    // a run of errors since the last look, or the engine's own check finding something wrong
    let problem = '';
    if (e.errs - (e.errsSeen || 0) >= 3) problem = (e.errs - (e.errsSeen || 0)) + ' errors (' + e.lastErr + ')';
    e.errsSeen = e.errs;
    if (!problem && e.check) problem = String(coreCall(e, 'check', '') || '');
    if (!problem) { if (e.bad) coreLog(e.name + ' is sound again'); e.bad = 0; if (e.health !== 'degraded' && e.health !== 'adapting') e.health = e.health === 'back' || e.repairs ? 'mended' : 'ok'; continue; }
    e.bad++; e.health = 'mending';
    if (e.bad === 1) { coreLog('CORE: ' + e.name + ': ' + problem + ' - repairing'); if (e.repair) { coreCall(e, 'repair'); e.repairs++; } }
    else if (e.bad === 2) {
      // its own repair did not hold: the engines that can help, help
      let helped = 0;
      for (const h of CORE.list) if (h !== e && !h.down && h.helps && typeof h.helps[e.name] === 'function') { try { h.helps[e.name](); helped++; coreLog(h.name + ' helped ' + e.name + ' (' + problem + ')'); } catch (x) { coreHurt(h.name, x); } }
      if (!helped && e.repair) { coreCall(e, 'repair'); e.repairs++; }
    } else if (e.isolate) {
      // still failing: rest it (a minute, longer each time), let the others cover for it and adapt
      e.downs++; e.down = true; e.downUntil = now + 60000 * Math.min(5, e.downs); e.health = 'resting'; e.bad = 0;
      coreCall(e, 'isolate');
      const cov = CORE.list.filter(c => c.covers && c.covers.indexOf(e.name) >= 0 && !c.down).map(c => c.name);
      coreLog(e.name + ' is resting (' + problem + ')' + (cov.length ? '; ' + cov.join(', ') + ' cover' + (cov.length > 1 ? '' : 's') + ' for it' : ''));
      if (typeof noteRepair === 'function') noteRepair(e.name + ' is resting for a moment');
      coreEmit('engineDown', { name: e.name, why: problem });
    }
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
  if (typeof LUX !== 'undefined') coreMeta('LUX', Object.assign({ ver: 3, needs: ['WORLD'], covers: ['PRISM', 'AURA'], save: () => LUX.adapt, load: lvl(LUX, 'adapt') }, rest(LUX), { restore: () => { LUX.offUntil = 0; LUX.A = null; } }));
  if (typeof PRISM !== 'undefined') coreMeta('PRISM', Object.assign({ ver: 3, needs: ['LUX'], save: () => PRISM.adapt, load: lvl(PRISM, 'adapt') }, rest(PRISM)));
  if (typeof MIRROR !== 'undefined') coreMeta('MIRROR', Object.assign({ ver: 1, needs: ['LUX', 'PRISM', 'WORLD'], save: () => MIRROR.adapt, load: lvl(MIRROR, 'adapt') }, rest(MIRROR)));
  if (typeof TEXEL !== 'undefined') coreMeta('TEXEL', Object.assign({ ver: 2, needs: ['MUTAGEN'], save: () => TEXEL.adapt, load: lvl(TEXEL, 'adapt') }, rest(TEXEL)));
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
}
// the frame is running late: step down the render engine taking the biggest share (above a floor), true if one did
function coreTrim(frameMs) {
  let best = null, bestMs = Math.max(0.6, frameMs * 0.12);
  for (const e of CORE.list) if (e.kind === 'render' && e.trim && e.msAvg > bestMs && coreCall(e, 'canTrim', true)) { best = e; bestMs = e.msAvg; }
  if (!best) return false;
  if (coreCall(best, 'trim', false)) { CORE.trims.push(best.name); if (CORE.trims.length > 12) CORE.trims.shift(); if (typeof logTrim === 'function') logTrim(best.name.toLowerCase()); return true; }
  return false;
}
// there is room again: give the last trimmed engine a level back
function coreBoost() {
  while (CORE.trims.length) {
    const e = CORE.by[CORE.trims[CORE.trims.length - 1]];
    if (e && coreCall(e, 'boost', false)) return true;
    CORE.trims.pop();
  }
  return false;
}
// for Settings > System: one line per engine
function coreStatus() {
  return CORE.list.map(e => ({ name: e.name, does: e.does, kind: e.kind, state: e.down ? 'resting' : coreCall(e, 'state', 'on'), level: coreCall(e, 'level', ''), ms: Math.round(e.msAvg * 100) / 100, errs: e.errs, repairs: e.repairs,
    health: e.health, ver: e.ver, needs: e.needs || [], covers: e.covers || [], helps: e.helps ? Object.keys(e.helps) : [], notes: String(coreCall(e, 'notes', '') || '') }));
}
// the renderer fills the shared frame once, before the engines that read it
function coreFrame(x0, y0, x1, y1, dt) {
  const F = CORE.frame; F.n++; F.t = G.time; F.dt = dt; F.x0 = x0; F.y0 = y0; F.x1 = x1; F.y1 = y1; F.cx = cam.x; F.cy = cam.y;
  F.zoom = ZOOM; F.dpr = DPR; F.w = W; F.h = H; F.tr = ctx.getTransform(); F.wet = WX.wet || 0; F.fog = WX.fog || 0; F.dust = (WX.sand || 0) + (WX.ash || 0) * 0.5;
  return F;
}
// world point to screen pixel (of the game canvas), using the frame's camera
function coreToScreen(x, y, out) {
  const F = CORE.frame, s = F.zoom * F.dpr; out[0] = (x - F.cx) * s + cv.width / 2; out[1] = (y - F.cy) * s + cv.height / 2; return out;
}

coreAdd({ name: 'CORE', kind: 'sim', ver: 2, covers: ['TRACER', 'MUZZLE'], does: 'Engine hub: connects every engine through one shared frame, one time budget, a message bus and a watchdog; engines check themselves, repair themselves, help repair each other and cover for one another, and the hub remembers the level each one settled at and recalibrates after updates.', state: () => 'on', level: () => CORE.list.length + ' engines, ' + CORE.list.filter(e => e.down).length + ' resting, ' + Array.from(CORE.bus.values()).reduce((a, L) => a + L.length, 0) + ' listeners' });
// the engines that were here before the hub: registered so the whole set shows in one place and shares one budget
coreAdd({ name: 'PERF', kind: 'sim', does: 'Performance governor: detects the hardware, sets resolution, quality tier and frame cap, trims caches and restarts a stalled game loop.', state: () => PERF.mode === 'auto' ? 'on' : 'manual', level: () => (typeof TIER_NAMES !== 'undefined' ? TIER_NAMES[PERF.tier] : PERF.tier) + ' ' + Math.round((PERF.resLock || RES_STEPS[PERF.res]) * 100) + '%' });
coreAdd({ name: 'WORLD', kind: 'world', does: 'City generator: builds the endless city from a seed, district by district (blocks, rivers, bridges, props, seasons) at real-world scale.', state: () => 'on', level: () => (SCL > 1.2 ? 'real scale' : 'classic') + ', ' + chunks.size + ' blocks' });
coreAdd({ name: 'FLOW', kind: 'sim', does: 'Pathfinding: flow fields that lead every zombie to the nearest player, with wider paths for big mutants and bosses.', state: () => FF.ready ? 'on' : 'idle', level: () => FF_N + 'x' + FF_N + ' cells' });
coreAdd({ name: 'NET', kind: 'net', does: 'Wi-Fi co-op: host and clients, snapshots, reconnects, shared cards and revives for 2 to 4 players.', state: () => NET.started ? NET.role : 'off', level: () => NET.started ? (NET.role === 'host' ? NET.peers.size + ' joined' : 'joined') : '' });
coreAdd({ name: 'LOADER', kind: 'sim', does: 'Loading screens and warm-up: prepares the streets, textures, lights and shaders before play so nothing stutters.', state: () => LOADING.on ? 'loading' : 'idle', level: () => '' });
coreAdd({ name: 'WX', kind: 'world', does: 'Weather and atmosphere: rain, storms and lightning, fog, snow, sand, ash, wind and gusts, seasons, fireflies, breath in the cold, puddle rings and cloud shadows.', state: () => wxLevel() > 0 ? 'on' : 'off', level: () => WX.kind + ' ' + Math.round(wxLevel() * 100) + '%' });
coreAdd({ name: 'LIFE', kind: 'world', does: 'Living city: trees, grass and bushes that sway, birds, props you can kick, explosive barrels, fires and car alarms.', state: () => 'on', level: () => WD.act.length + ' plants' });
coreAdd({ name: 'SFX', kind: 'audio', does: 'Sound engine: synthesizes every gunshot, impact, kill chain and ambience live, with echoes that change by district.', state: () => SFX.sfxOn && SFX.sfxOn() === false ? 'muted' : 'on', level: () => '' });
coreAdd({ name: 'RADIO', kind: 'audio', does: 'FM 66.6: writes and renders its own songs ahead of time on a separate audio thread, 7 channels of 35 songs, or your own music.', state: () => 'on', level: () => { try { return SFX.nowPlaying().name || ''; } catch (e) { return ''; } } });
coreAdd({ name: 'MUTAGEN', kind: 'data', does: 'Mutation engine: builds the 1,000 zombie mutations (strain, ability, size, colors) and draws each one.', state: () => 'on', level: () => MUTS.length + ' mutations' });
coreAdd({ name: 'BOSS', kind: 'sim', does: 'Boss engine: 50 bosses with attack patterns that mutate into new forms mid-fight, plus the Snatcher and the Overlord.', state: () => G.boss && !G.boss.dead ? 'fighting' : 'idle', level: () => '' });
coreAdd({ name: 'ACCOUNT', kind: 'data', does: 'Accounts and cloud saves: encrypts each save on the device (AES-GCM, PBKDF2) and merges progress across devices.', state: () => typeof ACCT !== 'undefined' ? ACCT.status : 'off', level: () => '' });
coreAdd({ name: 'FILTER', kind: 'data', does: 'Name filter: keeps slurs, threats, personal details and fake studio names out of every name shown.', state: () => 'on', level: () => '' });
