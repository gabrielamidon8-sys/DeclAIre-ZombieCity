/* ================= CORE: the engine hub =================
   Zombie City is built from engines (lighting, shaders, textures, weather, the city, pathfinding, sound, co-op...).
   CORE is where they meet, so they work as one system instead of side by side:
   - Every engine registers here with its name, what it does, and a few hooks: its state, its level, what it costs,
     how to step it down or back up, and how to repair it.
   - Each frame the renderer fills CORE.frame once (the view, the camera, the sun, the brightest lights, the hot spots)
     and every engine reads the same numbers from it, so the shader engine knows where the lighting engine put the
     lamps and the sun, and the texture engine knows how sharp the screen is.
   - Engines report their own cost each frame. Once a second CORE adds it up; when the frame is running late the
     performance governor asks CORE which engine to step down first (the one taking the biggest share), and when there
     is room again CORE steps the most recently trimmed engine back up.
   - Errors go through CORE too: an engine that keeps failing is stepped down or paused by its own repair hook, and the
     count shows in Settings > System > Engines.
   Nothing here may stop the game: every hook call is guarded. */
const CORE = {
  list: [], by: {}, sec: 0, lastSec: 0, trims: [],
  frame: { n: 0, t: 0, dt: 0.016, x0: 0, y0: 0, x1: 0, y1: 0, cx: 0, cy: 0, zoom: 1, dpr: 1, w: 1, h: 1,
    sun: { on: false, az: 0, el: 0, k: 0, dx: 0, dy: 0, col: [1, 1, 1], sky: [1, 1, 1] }, amb: [1, 1, 1], day: 1, night: 0, lights: [], hot: [], wet: 0, fog: 0, dust: 0 }
};
// e: { name, does, kind: 'render' | 'world' | 'sim' | 'audio' | 'net' | 'data', state(), level(), trim(), boost(), repair() }
function coreAdd(e) {
  if (CORE.by[e.name]) return CORE.by[e.name];
  e.ms = 0; e.msAvg = 0; e.errs = 0; e.repairs = e.repairs || 0; e.lastErr = '';
  CORE.list.push(e); CORE.by[e.name] = e; return e;
}
// an engine reports what a frame cost it (milliseconds)
function coreCost(name, ms) { const e = CORE.by[name]; if (e) e.ms += ms; }
// an engine reports an error; its own repair hook decides what to do about it
function coreHurt(name, err) {
  const e = CORE.by[name]; if (!e) return;
  e.errs++; e.lastErr = String(err && err.message || err).slice(0, 120);
}
function coreRepaired(name, what) { const e = CORE.by[name]; if (e) e.repairs++; if (typeof noteRepair === 'function') noteRepair(what); }
const coreCall = (e, k, d) => { try { return e[k] ? e[k]() : d; } catch (x) { return d; } };
// once a second: average each engine's cost over the frames of that second
function coreTick(now) {
  CORE.fc = (CORE.fc || 0) + 1;
  if (now - CORE.lastSec < 1000) return; CORE.lastSec = now;
  const n = Math.max(1, CORE.fc); CORE.fc = 0;
  for (const e of CORE.list) { const ms = e.ms / n; e.msAvg = e.msAvg ? e.msAvg * 0.6 + ms * 0.4 : ms; e.ms = 0; if (e.sec) coreCall(e, 'sec'); }
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
  return CORE.list.map(e => ({ name: e.name, does: e.does, kind: e.kind, state: coreCall(e, 'state', 'on'), level: coreCall(e, 'level', ''), ms: Math.round(e.msAvg * 100) / 100, errs: e.errs, repairs: e.repairs }));
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

coreAdd({ name: 'CORE', kind: 'sim', does: 'Engine hub: connects every engine through one shared frame, one time budget and one repair log, and steps the costliest one down when the frame runs late.', state: () => 'on', level: () => CORE.list.length + ' engines' });
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
