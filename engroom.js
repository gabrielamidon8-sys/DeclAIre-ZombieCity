/* ================= the engine room (Settings > Accessibility > Ultra advanced) =================
   Every one of the game's engines on one page: what it is doing right now (its cost each frame and its share of the
   frame, a minute of history, its level, its health, its own numbers), how intricate it is (its lines, functions,
   parts and links to the other engines), and two controls: how hard it runs (Auto, Eco, Normal, Hard, Max) and what it
   runs on (CPU, GPU, Auto). When the ecosystem has locked a control it shows "Auto-lock" in purple, with the reason.
   It is behind a red warning: changes here override the automatic choices and can cost frame rate; the ecosystem
   (CORE's watchdog and guard) puts anything that hurts the game back on Auto by itself.
   1.9.991 (CORE v3): each card also shows the engine's traits (adapts, repairs itself, learns, covers, heartbeat,
   self-test, compatible), what it has learned on this device, how much the ecosystem trusts it, its self-test and
   whether this device gives it what it needs; "About" tells who it is (engdocs.js). Forget clears what was learned. */
/*__ENGSRC__*/
const ENGR = { open: false, iv: 0, filter: 'all', sort: 'cost', built: false, cards: new Map(), lastLog: '' };
const EFF_NAMES = { auto: 'Auto', eco: 'Eco', normal: 'Normal', hard: 'Hard', max: 'Max' };
const KIND_NAMES = { render: 'Render', sim: 'Simulation', world: 'World', audio: 'Audio', net: 'Network', data: 'Data' };
const engFloor = (o, key, k) => { if (!o || k == null) return; if (k >= 2) o[key] = Math.max(o[key] | 0, 0); else if (k >= 1) o[key] = Math.max(o[key] | 0, -1); };
const engPerf = (o, k) => { if (!o || k == null) return; if (k >= 2) o.perf = Math.max(o.perf | 0, 0); else if (k >= 1) o.perf = Math.max(o.perf | 0, -1); else if (k < 0) o.perf = Math.min(o.perf | 0, -1); };
const prismGpuNo = () => {
  if (typeof PRISM === 'undefined') return 'There is no shader engine on this build.';
  if (PRISM.glcv && !PRISM.gl) return 'This device or browser gave the game no WebGL graphics context' + (PRISM.reason ? ' (' + PRISM.reason + ')' : '') + ', so shaders can only run on the processor.';
  if (PRISM.lost) return 'The graphics context was lost (the device took it back); PRISM runs on the processor while it rebuilds it.';
  return '';
};
const viaPrism = what => () => {
  const p = prismGpuNo(); if (p) return p;
  if (typeof PRISM !== 'undefined' && PRISM.mode !== 'gpu') return what + ' reaches the graphics chip through PRISM\'s shaders, and PRISM is on the processor right now' + (PRISM.soft ? ' (this device draws with a software renderer, so Auto keeps shaders off the GPU)' : SET.prism === 'cpu' ? ' (you set it to CPU)' : '') + '. Put PRISM on GPU first.';
  return '';
};
/* What each engine is made of, what "harder" and "lighter" mean for it, what it can run on, and its live numbers.
   files: its own source (for how intricate it is); parts: what it does, piece by piece. */
const ENG_SPEC = {
  CORE: { files: ['core', 'learn'], parts: ['one shared frame', 'one time budget', 'message bus', 'capability registry', 'watchdog and heartbeats', 'learned repairs', 'cost models', 'ceilings', 'looking ahead', 'trust', 'self-tests', 'remembered levels', 'tuning and locks'], effort: false,
    effortWhy: 'CORE is the hub that runs this page and every repair: it costs almost nothing and must always run in full, so the ecosystem keeps it where it is.',
    stats: () => [['Engines', CORE.list.length], ['Resting', CORE.list.filter(e => e.down).length], ['Locked', CORE.list.filter(e => e.lockUntil > performance.now()).length], ['Listeners', Array.from(CORE.bus.values()).reduce((a, L) => a + L.length, 0)], ['Capabilities', Object.keys(coreCaps()).length], ['Sessions learned', LEARN.data ? LEARN.data.ses : 0]] },
  PERF: { files: ['perf'], parts: ['hardware check', 'quality tiers', 'resolution steps', 'frame cap', 'battery and heat care', 'cache trimming', 'loop watchdog'], effort: false,
    effortWhy: 'PERF is the governor that does the adapting for every other engine; how hard the game runs as a whole is Settings > Graphics > Graphics quality.',
    stats: () => [['Frame rate', PERF.fps ? Math.round(PERF.fps) + ' fps' : '…'], ['Target', Math.round(targetFps()) + ' fps'], ['Quality', TIER_NAMES[PERF.tier]], ['Resolution', Math.round((PERF.resLock || RES_STEPS[PERF.res]) * 100) + '%'], ['Particle budget', Math.round((PERF.scale == null ? 1 : PERF.scale) * 100) + '%'], ['Battery saver', PERF.saver ? 'on' : 'off'], ['Self-repairs', PERF.repairs || 0]] },
  WORLD: { files: ['world'], parts: ['seeded city', 'districts and biomes', 'rivers and bridges', 'props', 'seasons', 'real-world scale'], effort: false,
    effortWhy: 'The city is built the same way on every device (and for everyone in a co-op run), block by block as you walk, so there is nothing to run harder or lighter without changing the city itself.',
    stats: () => [['Blocks built', chunks.size], ['Seed', WORLD.lastSeed || WORLD.seed || 0], ['District', WORLD.cur ? WORLD.cur.name : '—'], ['Season', ['Spring', 'Summer', 'Fall', 'Winter'][WORLD.season] || '—'], ['Scale', SCL > 1.2 ? 'real-world' : 'classic']] },
  FLOW: { files: ['game#flow'], parts: ['flow fields', 'wide paths for big zombies', 'push fields for hordes', 'reachability'],
    hard: 'refreshes the zombies\' paths more often (every 0.25 s on Hard, 0.18 s on Max instead of 0.35 s), so they turn the corner after you sooner', eco: 'refreshes the paths every 0.55 s, a little cheaper, a little slower to react',
    stats: () => [['Grid', FF_N + ' × ' + FF_N], ['Field age', FF.ready ? Math.round((G.time - FF.t) * 1000) + ' ms' : '—'], ['Refresh', flowIv().toFixed(2) + ' s'], ['Wide fields', [G.needFB ? 'big' : '', G.needFS ? 'huge' : '', G.needFP ? 'push' : ''].filter(Boolean).join(', ') || 'none']] },
  NET: { files: ['net'], parts: ['host and clients', 'snapshots', 'reconnects', 'shared clock', 'hits and kills', 'revives', 'markers', 'jitter-aware smoothing'], effort: false,
    effortWhy: 'Co-op has to run the same on every screen in the game (the same zombies, hits and clock at the same moment), so its timing is never turned up or down.',
    stats: () => [['Role', NET.role || 'off'], ['Players', NET.started ? (NET.role === 'host' ? 1 + NET.peers.size : '2+') : 1], ['Ping', NET.started && NET.rtt ? Math.round(NET.rtt) + ' ms' : '—'], ['Snapshots', NET.ivMs ? Math.round(NET.ivMs) + ' ms apart' : '—'], ['Jitter', NET.jitMs != null && NET.ivMs ? Math.round(NET.jitMs) + ' ms' : '—'], ['Zombies mirrored', NET.zmap ? NET.zmap.size : 0]] },
  LOADER: { files: ['loader'], parts: ['loading screens', 'street warm-up', 'light warm-up', 'sprite and rig warm-up', 'time left', 'hang guard'], effort: false,
    effortWhy: 'LOADER only works behind the loading screens, never during play, so it has nothing to turn up or down.',
    stats: () => [['State', LOADING.on ? 'loading' : 'idle'], ['Progress', Math.round((LOADING.frac || 0) * 100) + '%']] },
  WX: { files: ['weather'], parts: ['rain and snow', 'storms and lightning', 'fog and sand', 'wind and gusts', 'seasons', 'puddles and breath'],
    hard: 'keeps the weather at full density even when the frame gets busy (Max also adds 15% more of it)', eco: 'draws at most about half the rain, snow and dust',
    stats: () => [['Weather', WX.kind], ['Detail', Math.round(wxLevel() * 100) + '%'], ['Fog', Math.round((WX.fog || 0) * 100) + '%'], ['Wet', Math.round((WX.wet || 0) * 100) + '%']] },
  LIFE: { files: ['life'], parts: ['swaying plants', 'birds', 'kickable props', 'barrels', 'fires', 'car alarms'],
    hard: 'lets every tree, bush and patch of grass sway and shake, even when the frame is busy', eco: 'draws the plants one step stiller',
    stats: () => [['Plants moving', WD.act.length], ['Birds', WD.birds ? WD.birds.length : 0], ['Plant detail', ['still', 'light', 'full'][vegLevel()]]] },
  SFX: { files: ['sfx2', 'gunsfx', 'armsfx', 'audio'], parts: ['synthesised guns', 'a voice for each of the twenty guns', 'the arms foley', 'impacts and kills', 'ambience', 'district echoes', 'the clock\'s ticks'],
    hard: 'synthesises every sound at high quality', eco: 'synthesises sounds at low quality (less work for older phones)',
    apply: k => { const q = k == null ? sfxAutoQ(Q.audio) : k < 0 ? 0 : k > 0 ? 2 : sfxAutoQ(Q.audio); if (ENGR.sfxQ !== q) { ENGR.sfxQ = q; try { SFX.setQuality(SET.aq === 'auto' ? q : SET.aq === 'low' ? 0 : 2); } catch (x) { } } },
    stats: () => { let h = {}; try { h = SFX.health(); } catch (x) { } return [['Audio', h.state || '—'], ['Quality', ['low', 'medium', 'high'][ENGR.sfxQ == null ? Q.audio : ENGR.sfxQ] || '—'], ['Late renders', h.late || 0]]; } },
  RADIO: { files: ['radio'], parts: ['song writer', 'renderer on its own audio thread', '7 channels', 'your own music', 'learned buffer'], effort: false,
    effortWhy: 'FM 66.6 writes and renders its songs ahead of time on its own audio thread, apart from the game, so it never competes with the frame.',
    stats: () => { let n = '', d = {}; try { n = SFX.nowPlaying().name; d = SFX.fm.renderStats(); } catch (x) { } return [['Now playing', n || '—'], ['Kept ready', (d.ahead || 24) + ' s'], ['Late chunks', d.late || 0]]; } },
  MUTAGEN: { files: ['roster', 'mutations'], parts: ['the 2.0 roster', 'looks and builds', 'walks and abilities', 'integrity and rebuild', 'the 1,000 old mutations (resting)'], effort: false,
    effortWhy: 'MUTAGEN is data: it builds every zombie once at start, the same on every device.',
    stats: () => [['2.0 zombies', ZR.length], ['Identified', ZR.filter(m => found.has(m.id)).length], ['Resting', MUTS.length - ZR.length]] },
  BOSS: { files: ['bosses', 'bossai'], parts: ['50 bosses', 'mutating forms', 'the Snatcher', 'the Overlord'], effort: false,
    effortWhy: 'The bosses are switched off until they are rebuilt for 2.0, so there is nothing for this engine to do yet.',
    stats: () => [['Boss on the street', G.boss && !G.boss.dead ? 'yes' : 'none'], ['Status', typeof ZR_BOSSES_OFF !== 'undefined' && ZR_BOSSES_OFF ? 'resting until rebuilt' : 'on']] },
  ACCOUNT: { files: ['account', 'acct-core'], parts: ['accounts', 'AES-GCM saves', 'PBKDF2 keys', 'merging devices', 'maintenance status', 'offline queue'], effort: false,
    effortWhy: 'Accounts and encryption are about keeping your progress safe, not about frame rate, so they always run in full.',
    stats: () => [['Status', typeof ACCT !== 'undefined' ? ACCT.status : 'off'], ['Save waiting', ACCT.pend ? 'yes' : 'no'], ['Score waiting', store.get('zc_pend_score', null) ? 'yes' : 'no']] },
  FILTER: { files: ['filter', 'filterdata'], parts: ['name checks', 'tricks with numbers and letters', 'personal details', 'studio names'], effort: false,
    effortWhy: 'The name filter keeps every name shown safe; it is never made lighter.',
    stats: () => { const z = ZCF.size(); return [['Status', 'on'], ['Checks', 'every name shown'], ['Lists', z.word + z.sub + z.mask + ' entries']]; } },
  LUX: { files: ['lux'], parts: ['lamp shadows', 'sun area light', 'light beams in fog', 'bounce light', 'bloom', 'pose shadows', 'self-repair'], procs: ['cpu', 'gpu'],
    hard: 'keeps one more level of shadows, light and bounce light than your quality sets, and stops it stepping itself down (Max keeps it at the top)', eco: 'draws one level less light and fewer shadows',
    gpuNo: viaPrism('Bounce light'), procWhat: 'bounce light (the path-traced light off walls and streets)',
    apply: (k, proc) => { engFloor(LUX, 'adapt', k); LUX.giCpuOnly = proc === 'cpu'; },
    stats: () => [['Level', ['glow only', 'few shadows', 'shadows + bloom', 'soft shadows', 'full'][LUX.level] || '—'], ['Lights', (CORE.frame.lights || []).length], ['Bounce light', LUX.giOn ? (typeof PRISM !== 'undefined' && PRISM.giGpu ? 'on, GPU' : 'on, CPU') : 'off'], ['Sun', CORE.frame.sun.on ? 'up' : 'down'], ['Self-adjust', LUX.adapt]] },
  PRISM: { files: ['prism'], parts: ['WebGL 2/1 shaders', 'bloom', 'light shafts', 'heat haze', 'sharpen and upscale', 'grading', 'lamp relief', 'CPU fallback'], procs: ['cpu', 'gpu'],
    hard: 'runs one more shader level than your quality sets (bloom, shafts, bounce light) and stops stepping itself down', eco: 'runs one shader level less',
    gpuNo: prismGpuNo, procWhat: 'every shader pass (the same as Settings > Graphics > Shader engine)',
    apply: (k, proc) => { engFloor(PRISM, 'adapt', k); PRISM.procOverride = proc; },
    stats: () => [['Path', PRISM.mode === 'gpu' ? 'GPU, WebGL ' + (PRISM.v2 ? 2 : 1) : PRISM.mode === 'cpu' ? 'CPU' : PRISM.mode], ['Level', ['color', 'bloom + sharpen', 'bounce + shafts', 'full'][PRISM.lvl] || '—'], ['Renderer', PRISM.renderer ? friendlyGpu(PRISM.renderer) : '—'], ['Temperature', (PRISM.temp || 0) + ' K']] },
  TEXEL: { files: ['texel'], parts: ['procedural textures', 'supersampled sprites', 'ground blending', 'cloth, skin and grime', 'the detail normal map', 'memory repair'],
    hard: 'draws textures one level sharper and keeps them there', eco: 'draws textures one level softer',
    apply: k => engFloor(TEXEL, 'adapt', k),
    stats: () => [['Level', ['off', 'low', 'high', 'ultra'][TEXEL.lvl] || '—'], ['Sprites cached', typeof sprites !== 'undefined' ? sprites.size : 0], ['Players cached', TEXEL.players ? TEXEL.players.size : 0]] },
  MIRROR: { files: ['mirror'], parts: ['water', 'wet streets', 'ice', 'car glass and paint', 'fresh blood', 'sun glitter'], procs: ['cpu', 'gpu'],
    hard: 'keeps full reflections and stops stepping them down', eco: 'reflects only the sky and the lights',
    gpuNo: viaPrism('Reflections'), procWhat: 'the reflection pass',
    apply: (k, proc) => { engFloor(MIRROR, 'adapt', k); MIRROR.cpuOnly = proc === 'cpu'; },
    stats: () => [['Path', MIRROR.on ? (MIRROR.gpu ? 'GPU' : 'CPU') : 'idle'], ['Level', ['off', 'sky and lights', 'full'][mirrorLevel()]]] },
  GORE: { files: ['gore'], parts: ['blood by zombie type', 'wounds by gun', 'sprays and pools', 'drying and fading', 'footprints', 'glowing blood'],
    hard: 'keeps one more level of blood detail and stops stepping it down', eco: 'draws one level less blood',
    apply: k => engFloor(GORE, 'adapt', k),
    stats: () => [['Stains', G.splats.length], ['Level', goreLevel()], ['Bad stains thrown out', GORE.fixed || 0]] },
  MUZZLE: { files: ['muzzle'], parts: ['a fire for every gun', 'mod tints', 'sparks', 'smoke', 'brass and shells', 'flash light'],
    hard: 'keeps half as much smoke and brass again (Max: twice as much) on the street', eco: 'keeps less than half the smoke and brass',
    stats: () => [['Flames', MUZZLE.spr ? MUZZLE.spr.size : 0], ['Smoke', MUZZLE.smoke ? MUZZLE.smoke.length : 0], ['Casings', MUZZLE.brass ? MUZZLE.brass.length : 0], ['Ladder', ['under half', 'two thirds', 'full'][MUZZLE.adapt + 2]]] },
  GARAGE: { files: ['garage'], parts: ['22 vehicles', 'liveries', 'wrecks', 'headlights and hazards', 'reflective glass', 'crashed aircraft', 'headlight ladder'],
    hard: 'gives both headlight beams of every lit car shadows', eco: 'drops the beams\' shadows and the tail lights\' glow',
    stats: () => [['Vehicles moved', SWDYN.size], ['Lit cars', GARAGE.beams | 0], ['Headlights', GARAGE.adapt < 0 ? 'lighter' : 'full']] },
  SKYWAY: { files: ['skyway'], parts: ['elevated highways', 'interchanges', 'collapsed spans', 'deck shadows', 'fading underneath'], effort: false,
    effortWhy: 'The highways, their lamps and their shadows are built into each block\'s picture when the block is made, so there is nothing to run harder while you play (and almost no cost each frame).',
    stats: () => [['Highway lines known', SKY.rows.size + SKY.cols.size]] },
  TRACER: { files: ['tracer'], parts: ['a style for every gun', 'motion blur', 'glow', 'heat shimmer', 'tracer lights', 'impacts'],
    hard: 'keeps trails, glows and lit rounds on even when the frame is busy (Max keeps everything)', eco: 'draws plainer rounds',
    apply: k => engPerf(TRACER, k),
    stats: () => [['Rounds', TRACER.drawn || 0], ['Lit', TRACER.lights || 0], ['Detail', TRACER.perf || 0]] },
  AURA: { files: ['aura'], parts: ['glowing zombies as lights', 'their shadows', 'eyes at night', 'death flares'],
    hard: 'keeps every glowing zombie lit and casting shadows (Max: as many as the lighting allows)', eco: 'lights fewer of them, without shadows',
    apply: k => engPerf(AURA, k),
    stats: () => [['Glowing', AURA.n || 0], ['With shadows', AURA.shadowed || 0], ['Eyes', AURA.eyes || 0]] },
  SWARM: { files: ['swarm', 'horde'], parts: ['hordes and droves', 'moving as one', 'crowd physics', 'pushing vehicles', 'encircling', 'hearing gunfire', 'levels of detail', 'three real gears', 'momentum and wall slams', 'solid bodies', 'crossing cars and fences', 'cutting you off', 'pile-ups'],
    hard: 'draws more of the crowd in full detail (like Crowd detail: High) and stops stepping detail down', eco: 'draws more of the crowd simplified (like Crowd detail: Low)',
    apply: k => engFloor(SWARM, 'adapt', k),
    stats: () => [['Alive', G.zs.length], ['Hordes', SWARM.hordes.length], ['Live cap', SWARM.capLive || SWARM.cap || 0], ['Self-adjust', SWARM.adapt || 0], ['Frenzies', HORDE.stats.frenzy], ['Wall slams', HORDE.stats.slams + HORDE.stats.down], ['Cars crossed', HORDE.stats.vaults + HORDE.stats.climbs + HORDE.stats.dives + HORDE.stats.unders], ['Cutting off', HORDE.stats.cutters], ['Highest pile', HORDE.stats.maxPz + ' m']] },
  ANIMA: { files: ['anima', 'anilook'], parts: ['jointed rigs', '75 animations each', 'blending', 'hit reactions', 'deaths and bodies', 'cached crowd frames', 'pose shadows', 'contact animations', 'momentum spring', 'real proportions', 'hands, shoes and faces', 'job details and decay'],
    hard: 'animates 5 more zombies with live joints (Max: 10 more) and stops stepping that down', eco: 'animates 5 fewer with live joints (the rest from cached pictures)',
    apply: k => engFloor(ANIMA, 'adapt', k),
    stats: () => [['Live rigs', ANIMA.live], ['Cached', ANIMA.cached], ['Bodies', ANIMA.corpses.length], ['Live cap', ANIMA.liveCap], ['Pictures stored', ANIMA.cache.size], ['Contacts played', ANIMA.contacts || 0]] },
  BALLISTICS: { files: ['ballistics'], parts: ['real rounds', 'drag and energy', 'swept rays', 'ricochets', 'hit regions', 'lethality', 'recoil'], effort: false,
    effortWhy: 'How bullets fly and kill has to be the same on every device and for everyone in co-op (it decides who lives), so it is never made lighter or heavier.',
    stats: () => [['Rounds', BAL.shots], ['Hits', BAL.hits], ['Kills', BAL.kills], ['Head kills', BAL.heads], ['Ricochets', BAL.ric], ['Passed through', BAL.pen || 0]] }
};
// hand each engine its part of the spec (the hub reads tune.effort, tune.procs and tune.apply)
for (const name in ENG_SPEC) {
  const s = ENG_SPEC[name];
  if (CORE.by[name]) coreMeta(name, { tune: { effort: s.effort !== false, effortWhy: s.effortWhy, procs: s.procs || ['cpu'], procWhy: s.procWhy || (name + ' runs in JavaScript on the processor; it has no graphics-chip version, so the ecosystem keeps it there.'), gpuNo: s.gpuNo, apply: s.apply } });
}
// PRISM's processor is the same choice as Settings > Graphics > Shader engine
function engProcGet(name) { if (name === 'PRISM') return SET.prism === 'gpu' || SET.prism === 'cpu' ? SET.prism : 'auto'; return coreTune(name).proc; }

/* ---------- how intricate each engine is ---------- */
function engIntricacy(name) {
  const e = CORE.by[name] || {}, s = ENG_SPEC[name] || e.spec || {}, src = typeof ENG_SRC !== 'undefined' ? ENG_SRC : {};
  let lines = 0, fns = 0, com = 0;
  for (const f of s.files || []) { const v = src[f]; if (v) { lines += v[0]; fns += v[1]; com += v[2]; } }
  const parts = (s.parts || []).length, links = (e.needs || []).length + (e.covers || []).length + (e.helps ? Object.keys(e.helps).length : 0);
  const raw = 1.8 * Math.log10(lines + 1) + 1.4 * Math.log10(fns + 1) + 0.25 * parts + 0.15 * links - 2;
  const score = clamp(Math.round(raw * 10) / 10, 1, 10);
  const word = score >= 8.5 ? 'Extremely intricate' : score >= 7 ? 'Highly intricate' : score >= 5 ? 'Intricate' : score >= 3 ? 'Involved' : 'Simple';
  return { score: score, word: word, lines: lines, fns: fns, com: com, parts: parts, links: links };
}

/* ---------- the warning, then the room ---------- */
function openEngineWarn() {
  SFX.click(); const w = $('engWarn'); w.hidden = false;
  try { SFX.refuse(); } catch (x) { }
  setTimeout(() => { const b = $('engWarnBack'); if (b) b.focus(); }, 30);
}
function closeEngineWarn() { $('engWarn').hidden = true; }
$('engWarnBack').addEventListener('click', () => { SFX.click(); closeEngineWarn(); });
$('engWarnGo').addEventListener('click', () => { SFX.click(); closeEngineWarn(); openEngineRoom(); });
function openEngineRoom() {
  ENGR.open = true; $('engRoom').hidden = false; $('engRoom').scrollTop = 0;
  engBuild(); engLive();
  clearInterval(ENGR.iv); ENGR.iv = setInterval(() => { if (!ENGR.open || $('engRoom').hidden) { clearInterval(ENGR.iv); ENGR.open = false; return; } engLive(); }, 1000);
}
function closeEngineRoom() { ENGR.open = false; clearInterval(ENGR.iv); $('engRoom').hidden = true; if (!$('settings').hidden) renderSettings(true); }
$('engClose').addEventListener('click', () => { SFX.click(); closeEngineRoom(); });

function engSet(name, k, v) {
  const all = Object.assign({}, SET.eng || {}), cur = Object.assign({}, all[name] || {});
  if (k === 'proc' && name === 'PRISM') { setSetting('prism', v); }
  else { cur[k] = v; if (cur.effort === 'auto') delete cur.effort; if (cur.proc === 'auto') delete cur.proc; if (Object.keys(cur).length) all[name] = cur; else delete all[name]; SET.eng = all; saveSettings(); }
  CORE.slowS = 0;   // (the guard counts its 8 slow seconds from the change, not from before it)
  try { coreTuneTick(performance.now()); } catch (x) { }
  coreLog(name + ': ' + (k === 'proc' ? 'runs on ' + (v === 'auto' ? 'Auto' : v.toUpperCase()) : 'effort ' + EFF_NAMES[v]) + ' (set in the engine room)');
  engCard(name, true); engLive();
}
function engResetAll() {
  SET.eng = {}; if (SET.prism === 'gpu' || SET.prism === 'cpu') setSetting('prism', 'auto'); saveSettings();
  try { coreTuneTick(performance.now()); } catch (x) { }
  coreLog('Every engine back on Auto (engine room)'); toast('Engine room', 'Every engine is back on Auto', '#c86bff');
  for (const n of ENGR.cards.keys()) engCard(n, true); engLive();
}

/* ---------- building the page ---------- */
function engBuild() {
  const top = $('engTop'), tools = $('engTools'), grid = $('engGrid');
  top.textContent = ''; tools.textContent = ''; grid.textContent = ''; ENGR.cards.clear();
  // the ecosystem at a glance
  const meters = el('div', 'eng-meters');
  for (const [id, k] of [['emFps', 'Frame rate'], ['emMs', 'Frame time'], ['emBudget', 'Engines use'], ['emHealth', 'Ecosystem'], ['emLearn', 'Learned here']]) { const m = el('div', 'eng-meter'); m.append(el('small', null, k), el('b', null, '…')); m.lastChild.id = id; meters.append(m); }
  const bar = el('div', 'eng-budget'); bar.id = 'engBudget'; bar.setAttribute('aria-hidden', 'true');
  const legend = el('p', 'eng-legend'); legend.id = 'engLegend';
  top.append(meters, bar, legend);
  // filter, sort, reset
  const seg = el('div', 'eng-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Show');
  for (const [k, l] of [['all', 'All'], ['render', 'Render'], ['sim', 'Simulation'], ['world', 'World'], ['audio', 'Audio'], ['data', 'Data and network']]) {
    const b = el('button', ENGR.filter === k ? 'on' : '', l); b.type = 'button'; b.setAttribute('aria-pressed', ENGR.filter === k);
    b.addEventListener('click', () => { SFX.click(); ENGR.filter = k; seg.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); engOrder(); });
    seg.append(b);
  }
  const sort = el('div', 'eng-seg small'); sort.setAttribute('role', 'group'); sort.setAttribute('aria-label', 'Sort by');
  for (const [k, l] of [['cost', 'Cost'], ['intricacy', 'Intricacy'], ['name', 'Name']]) {
    const b = el('button', ENGR.sort === k ? 'on' : '', l); b.type = 'button'; b.setAttribute('aria-pressed', ENGR.sort === k);
    b.addEventListener('click', () => { SFX.click(); ENGR.sort = k; sort.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); engOrder(); });
    sort.append(b);
  }
  const reset = el('button', 'btn small eng-reset', 'Everything back to Auto'); reset.type = 'button'; reset.addEventListener('click', () => { SFX.click(); engResetAll(); });
  // forgetting what was learned takes two presses (it starts every engine learning this device again)
  const forget = el('button', 'btn small eng-forget', 'Forget what they learned'); forget.type = 'button';
  forget.addEventListener('click', () => {
    SFX.click();
    if (!forget.classList.contains('arm')) { forget.classList.add('arm'); forget.textContent = 'Press again to forget'; clearTimeout(ENGR.fgT); ENGR.fgT = setTimeout(() => { forget.classList.remove('arm'); forget.textContent = 'Forget what they learned'; }, 4000); return; }
    clearTimeout(ENGR.fgT); forget.classList.remove('arm'); forget.textContent = 'Forget what they learned';
    learnForget(); toast('Engine room', 'The engines forgot this device and start learning it again', '#c86bff');
    for (const n of ENGR.cards.keys()) engCard(n, true); engLive();
  });
  tools.append(seg, sort, reset, forget);
  for (const e of CORE.list) { const c = el('article', 'eng-card'); c.dataset.name = e.name; grid.append(c); ENGR.cards.set(e.name, c); engCard(e.name, true); }
  engOrder();
}
function engOrder() {
  const grid = $('engGrid'), list = Array.from(ENGR.cards.values());
  const kindOk = c => { const e = CORE.by[c.dataset.name]; return ENGR.filter === 'all' || (ENGR.filter === 'data' ? (e.kind === 'data' || e.kind === 'net') : e.kind === ENGR.filter); };
  list.sort((a, b) => ENGR.sort === 'name' ? a.dataset.name.localeCompare(b.dataset.name) : ENGR.sort === 'intricacy' ? engIntricacy(b.dataset.name).score - engIntricacy(a.dataset.name).score : (CORE.by[b.dataset.name].msAvg || 0) - (CORE.by[a.dataset.name].msAvg || 0));
  for (const c of list) { c.hidden = !kindOk(c); grid.append(c); }
}
// one engine's card: built once, its numbers refreshed every second, its controls rebuilt when something changes
function engCard(name, full) {
  const c = ENGR.cards.get(name), e = CORE.by[name], s = ENG_SPEC[name] || {}; if (!c || !e) return;
  if (full) {
    c.textContent = '';
    const head = el('header', 'ec-head');
    const t = el('div', 'ec-title'); t.append(el('b', null, name), el('span', 'ec-kind', (KIND_NAMES[e.kind] || e.kind) + ' · v' + e.ver));
    const cost = el('div', 'ec-cost'); cost.append(el('b', 'ec-ms', '…'), el('span', 'ec-share', ''));
    const hb = el('span', 'ec-health', ''); head.append(t, hb, cost); c.append(head);
    const spark = document.createElement('canvas'); spark.className = 'ec-spark'; spark.setAttribute('aria-hidden', 'true'); c.append(spark);
    c.append(el('p', 'ec-does', e.does || ''));
    const st = el('dl', 'ec-stats'); c.append(st);
    c.append(engTraits(name));
    const lb = el('div', 'ec-learn'); lb.append(el('h4', null, 'Learned on this device'), el('div', 'ec-lines')); c.append(lb);
    if (typeof CUR !== 'undefined' && CUR.eng[name]) c.append(engCourse(name));
    c.append(el('p', 'ec-facts'));
    const I = engIntricacy(name), ib = el('div', 'ec-intri');
    const meter = el('div', 'ec-imeter'); const fill = el('i'); fill.style.width = (I.score * 10) + '%'; meter.append(fill);
    const il = el('div', 'ec-itext'); il.append(el('b', null, 'How intricate: ' + I.score.toFixed(1) + ' / 10 · ' + I.word), el('span', null, (I.lines ? I.lines.toLocaleString() + ' lines of code · ' + I.fns + ' functions · ' : '') + I.parts + ' parts · linked to ' + I.links + ' engine' + (I.links === 1 ? '' : 's')));
    ib.append(il, meter); c.append(ib);
    // controls
    const f = coreEff(name), want = coreTune(name), pw = engProcGet(name);
    const effRow = el('div', 'ec-ctl'); effRow.append(el('span', 'ec-ctl-l', 'Runs harder'));
    const es = el('div', 'ec-seg' + (f.locks.effort ? ' locked' : '')); es.setAttribute('role', 'group'); es.setAttribute('aria-label', name + ': how hard it runs');
    for (const v of EFFORTS) { const b = el('button', (want.effort === v && !f.locks.effort ? 'on' : '') + ' e-' + v, EFF_NAMES[v]); b.type = 'button'; b.disabled = !!f.locks.effort; b.setAttribute('aria-pressed', want.effort === v && !f.locks.effort); b.addEventListener('click', () => { SFX.click(); engSet(name, 'effort', v); }); es.append(b); }
    const el1 = el('button', 'lock' + (f.locks.effort ? ' on' : ''), 'Auto-lock'); el1.type = 'button'; el1.disabled = true; el1.title = f.locks.effort || 'Lights up when the ecosystem locks this setting'; es.append(el1);
    effRow.append(es); c.append(effRow);
    const prRow = el('div', 'ec-ctl'); prRow.append(el('span', 'ec-ctl-l', 'Runs on'));
    const ps = el('div', 'ec-seg' + (f.locks.proc ? ' locked' : '')); ps.setAttribute('role', 'group'); ps.setAttribute('aria-label', name + ': what it runs on');
    for (const [v, l] of [['cpu', 'CPU'], ['gpu', 'GPU'], ['auto', 'Auto']]) { const on = !f.locks.proc && pw === v; const b = el('button', (on ? 'on' : '') + ' p-' + v, l); b.type = 'button'; b.disabled = !!f.locks.proc; b.setAttribute('aria-pressed', on); b.addEventListener('click', () => { SFX.click(); engSet(name, 'proc', v); }); ps.append(b); }
    const pl = el('button', 'lock' + (f.locks.proc ? ' on' : ''), 'Auto-lock'); pl.type = 'button'; pl.disabled = true; pl.title = f.locks.proc || 'Lights up when the ecosystem locks this setting'; ps.append(pl);
    prRow.append(ps); c.append(prRow);
    c.append(el('div', 'ec-msg'));
    // details: its parts and who it works with
    const det = document.createElement('details'); det.className = 'ec-det';
    const sum = document.createElement('summary'); sum.textContent = 'About, parts, links and history'; det.append(sum);
    det.append(engAbout(name));
    const pp = el('ul', 'ec-parts'); for (const p of s.parts || []) pp.append(el('li', null, p)); det.append(pp);
    const links = [];
    if (e.needs && e.needs.length) links.push('Needs ' + e.needs.join(', ') + ' (if one of them rests, ' + name + ' adapts).');
    if (e.covers && e.covers.length) links.push('Covers for ' + e.covers.join(', ') + ' when ' + (e.covers.length > 1 ? 'they are' : 'it is') + ' down.');
    if (e.helps && Object.keys(e.helps).length) links.push('Helps repair ' + Object.keys(e.helps).join(', ') + '.');
    const by = CORE.list.filter(o => o.needs && o.needs.indexOf(name) >= 0).map(o => o.name); if (by.length) links.push(by.join(', ') + (by.length > 1 ? ' lean' : ' leans') + ' on ' + name + '.');
    det.append(el('p', 'ec-links', links.join(' ') || name + ' works on its own and talks to the others through the hub\'s message bus.'));
    const hist = el('p', 'ec-hist'); det.append(hist);
    c.append(det);
  }
  engCardLive(name);
}
// an engine with a course (1.9.995: the five film engines): each version, its exam as it last ran here, and a button to
// take the exams again (they run the engine's own work and measure it, so they take a few seconds)
function engCourse(name) {
  const box = el('div', 'ec-learn ec-course'), lines = el('div', 'ec-lines'), btn = el('button', 'ec-run', 'Take the exams here (a few seconds)'); btn.type = 'button';
  box.append(el('h4', null, 'Its course, v1 to v' + CUR.eng[name].levels.length), lines);
  const paint = () => { const C = CUR.eng[name]; lines.textContent = ''; for (const L of C.levels) { const r = C.res[L.v]; lines.append(el('p', r ? (r.ok ? 'ok' : 'bad') : null, 'v' + L.v + ' · ' + L.title + ': ' + (r ? (r.ok ? 'passed ' : 'not passed ') + r.pass + ' of ' + r.n + ' checks' + (r.at ? ' (' + new Date(r.at).toLocaleDateString() + ')' : '') : 'not taken on this device yet'))); } lines.append(el('p', null, C.earned ? 'Holds v' + C.earned + ' here: every exam up to it passed.' : 'Holds no version here until its exams are taken.')); };
  btn.addEventListener('click', () => { if (typeof SFX !== 'undefined') SFX.click(); btn.disabled = true; btn.textContent = 'Examining ' + name + '…'; setTimeout(() => { try { curRun(name); } catch (x) { coreHurt(name, x); } btn.disabled = false; btn.textContent = 'Take the exams again'; paint(); }, 40); });
  paint(); box.append(btn); return box;
}
// the words under the controls: what the current choice does for this engine, and what the ecosystem is doing
function engMessage(name) {
  const e = CORE.by[name], s = ENG_SPEC[name] || {}, f = coreEff(name), want = coreTune(name), out = [];
  if (f.locks.effort) out.push(['lock', 'Auto-lock (effort): ' + f.locks.effort]);
  else {
    const eff = want.effort;
    out.push(['', eff === 'auto' ? 'Auto: the ecosystem decides how hard ' + name + ' runs, stepping it down when the frame runs late and back up when there is room.'
      : eff === 'eco' ? 'Eco: ' + name + ' ' + (s.eco || 'runs lighter') + '. When the frame runs late, the ecosystem steps it down before any other engine.'
      : eff === 'normal' ? 'Normal: ' + name + ' runs at the level your quality setting gives it, and is stepped down like any other engine when the frame runs late.'
      : eff === 'hard' ? 'Hard: ' + name + ' ' + (s.hard || 'runs harder') + '. The ecosystem steps it down last, only after the others.'
      : 'Max: ' + name + ' ' + (s.hard || 'runs as hard as it can') + ', as far as it goes. The ecosystem never steps it down on its own, but if the game stays well under its frame-rate target for 8 seconds while ' + name + ' is the costliest engine you tuned, it goes back to Auto for 5 minutes.']);
  }
  if (f.locks.proc) out.push(['lock', 'Auto-lock (processor): ' + f.locks.proc]);
  else {
    const pv = engProcGet(name), what = s.procWhat || name;
    out.push(['', pv === 'gpu' ? 'GPU: ' + what + ' runs on the graphics chip, which is faster at this kind of work and leaves the processor for the game.' : pv === 'cpu' ? 'CPU: ' + what + ' runs on the processor (useful when the graphics chip is weak, hot or busy; it costs the processor more).' : 'Auto: ' + what + ' runs on the graphics chip when there is a real one, and on the processor otherwise.']);
  }
  const share = e.msAvg && CORE.fps ? e.msAvg / (1000 / CORE.fps) * 100 : 0;
  out.push(['now', 'Right now: ' + (e.down ? 'resting' : String(coreCall(e, 'state', 'on'))) + (coreCall(e, 'level', '') ? ', ' + coreCall(e, 'level', '') : '') + (e.msAvg >= 0.01 ? ' · ' + e.msAvg.toFixed(2) + ' ms a frame (' + share.toFixed(share < 10 ? 1 : 0) + '% of the frame)' : ' · too cheap to measure') + (e.repairs ? ' · repaired ' + e.repairs + ' time' + (e.repairs === 1 ? '' : 's') : '') + (e.locks ? ' · put back on Auto ' + e.locks + ' time' + (e.locks === 1 ? '' : 's') : '') + '.']);
  return out;
}
const HEALTH = { ok: ['Sound', 'ok'], mended: ['Mended', 'ok'], back: ['Back', 'ok'], mending: ['Mending', 'warn'], adapting: ['Adapting', 'warn'], degraded: ['Degraded', 'warn'], resting: ['Resting', 'bad'] };
function engCardLive(name) {
  const c = ENGR.cards.get(name), e = CORE.by[name], s = ENG_SPEC[name] || {}; if (!c || !e) return;
  const fms = CORE.fps ? 1000 / CORE.fps : 16.7, share = e.msAvg ? e.msAvg / fms * 100 : 0;
  const ms = c.querySelector('.ec-ms'); if (ms) ms.textContent = e.msAvg >= 0.01 ? e.msAvg.toFixed(2) + ' ms' : '< 0.01 ms';
  const sh = c.querySelector('.ec-share'); if (sh) sh.textContent = share >= 0.1 ? share.toFixed(share < 10 ? 1 : 0) + '% of the frame' : 'of the frame';
  const H = HEALTH[e.down ? 'resting' : e.health] || HEALTH.ok, hb = c.querySelector('.ec-health');
  const locked = e.lockUntil > performance.now();
  if (hb) { hb.textContent = locked ? 'Locked' : H[0]; hb.className = 'ec-health ' + (locked ? 'lock' : H[1]); }
  c.classList.toggle('is-locked', locked || !!e.down);
  c.classList.toggle('is-tuned', coreTune(name).effort !== 'auto' || engProcGet(name) !== 'auto');
  // its own numbers
  const st = c.querySelector('.ec-stats');
  if (st) { let rows = []; try { rows = s.stats ? s.stats() : []; } catch (x) { rows = [['Numbers', 'not available']]; }
    rows = rows.concat([['Errors', e.errs], ['Repairs', e.repairs]]);
    if (st.children.length !== rows.length) { st.textContent = ''; for (const [k, v] of rows) { const d = el('div'); d.append(el('dt', null, k), el('dd', null, String(v))); st.append(d); } }
    else rows.forEach(([k, v], i) => { const dd = st.children[i].lastChild, t = String(v); if (dd.textContent !== t) dd.textContent = t; }); }
  // a minute of cost
  const cv2 = c.querySelector('.ec-spark'); if (cv2) engSpark(cv2, e.hist || [], locked ? '#c86bff' : e.down ? '#ff3b4f' : share > 15 ? '#ffb35c' : '#f2cc3a');
  // the words, and the locks (rebuild the controls if a lock came or went)
  const f = coreEff(name), want = !!f.locks.effort + '|' + !!f.locks.proc + '|' + coreTune(name).effort + '|' + engProcGet(name);
  if (c.dataset.ctl && c.dataset.ctl !== want) { c.dataset.ctl = want; engCard(name, true); return; }
  c.dataset.ctl = want;
  const msg = c.querySelector('.ec-msg');
  if (msg) { const lines = engMessage(name), key = lines.map(l => l[1]).join('|'); if (msg.dataset.k !== key) { msg.dataset.k = key; msg.textContent = ''; for (const [cls, t] of lines) msg.append(el('p', cls, t)); } }
  // what it learned, its trust, its self-test and whether this device has what it needs (every other second)
  if (full2(c)) {
    const box = c.querySelector('.ec-lines'); if (box) { const L = learnSummary(name), k = L.join('|'); if (box.dataset.k !== k) { box.dataset.k = k; box.textContent = ''; for (const t of L.length ? L : ['Nothing yet: it learns from each second of play.']) box.append(el('p', null, t)); } }
    const fx = c.querySelector('.ec-facts'); if (fx) { const tr = learnTrust(name), cm = coreCompat(e), t = e.test, txt = 'Trust ' + Math.round(tr * 100) + '% · ' + (t ? 'self-test ' + (t.ok ? 'passed ' + t.pass + '/' + t.n : 'failed: ' + t.why) : e.selfTest ? 'self-test pending' : 'no self-test') + ' · runs here ' + (cm.ok === 'full' ? 'fully' : cm.ok === 'part' ? 'partly: ' + cm.why : 'not at all: ' + cm.why) + (e.climbs ? ' · climbed back ' + e.climbs + '×' : ''); if (fx.textContent !== txt) fx.textContent = txt; fx.className = 'ec-facts' + (tr < 0.5 ? ' low' : ''); }
  }
  const hist = c.querySelector('.ec-hist');
  if (hist) { const mine = CORE.log.filter(l => l.msg.indexOf(name) >= 0).slice(-3).reverse(); const t = mine.length ? 'Lately: ' + mine.map(l => new Date(l.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + l.msg).join(' · ') : 'Nothing has happened to ' + name + ' this session: no errors, no repairs, no locks.'; if (hist.textContent !== t) hist.textContent = t; }
}
function engSpark(cv2, h, col) {
  const w = cv2.clientWidth || 200, hh = 26, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv2.width !== Math.round(w * dpr)) { cv2.width = Math.round(w * dpr); cv2.height = Math.round(hh * dpr); }
  const g = cv2.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, hh);
  if (!h.length) return;
  const mx = Math.max(0.5, ...h), step = w / 59;
  g.beginPath(); for (let i = 0; i < h.length; i++) { const x = w - (h.length - 1 - i) * step, y = hh - 2 - h[i] / mx * (hh - 4); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  g.strokeStyle = col; g.lineWidth = 1.5; g.stroke();
  g.lineTo(w, hh); g.lineTo(w - (h.length - 1) * step, hh); g.closePath(); g.globalAlpha = 0.18; g.fillStyle = col; g.fill(); g.globalAlpha = 1;
}
// every second: the ecosystem meters, the budget bar, every card, the log
function engLive() {
  if (!ENGR.open) return;
  const fps = CORE.fps || PERF.fps || 0, fms = fps ? 1000 / fps : 0, tgt = targetFps();
  const tot = CORE.list.reduce((a, e) => a + (e.msAvg || 0), 0);
  const set = (id, v, cls) => { const x = $(id); if (x) { x.textContent = v; x.className = cls || ''; } };
  set('emFps', fps ? Math.round(fps) + ' / ' + Math.round(tgt) + ' fps' : '…', fps && fps < tgt * 0.7 ? 'bad' : fps && fps < tgt * 0.9 ? 'warn' : 'ok');
  set('emMs', fms ? fms.toFixed(1) + ' ms' : '…');
  set('emBudget', tot.toFixed(1) + ' ms' + (fms ? ' · ' + Math.round(tot / fms * 100) + '%' : ''));
  const down = CORE.list.filter(e => e.down).length, locked = CORE.list.filter(e => e.lockUntil > performance.now()).length, mending = CORE.list.filter(e => e.health === 'mending').length;
  set('emHealth', down ? down + ' resting' : mending ? mending + ' mending' : locked ? locked + ' locked' : 'All ' + CORE.list.length + ' sound', down ? 'bad' : mending || locked ? 'warn' : 'ok');
  { const d = LEARN.data || { e: {} }, n = Object.values(d.e).reduce((a, r) => a + Object.keys(r.c || {}).length + Object.keys(r.r || {}).length + Object.keys(r.o || {}).length, 0); set('emLearn', n + ' lessons', n ? 'ok' : ''); }
  // the budget bar: each engine's share of the frame, the costliest named
  const bar = $('engBudget');
  if (bar) {
    const top = CORE.list.filter(e => e.msAvg > 0.02).sort((a, b) => b.msAvg - a.msAvg), whole = Math.max(fms || 16.7, tot);
    bar.textContent = ''; const cols = ['#f2cc3a', '#ff8a3d', '#29e6ff', '#c86bff', '#7dff9a', '#ff5a7a', '#5aa8ff', '#e6b3ff'];
    top.slice(0, 8).forEach((e, i) => { const s = el('i'); s.style.width = (e.msAvg / whole * 100).toFixed(2) + '%'; s.style.background = cols[i]; s.title = e.name + ' ' + e.msAvg.toFixed(2) + ' ms'; bar.append(s); });
    const rest = top.slice(8).reduce((a, e) => a + e.msAvg, 0); if (rest > 0) { const s = el('i'); s.style.width = (rest / whole * 100).toFixed(2) + '%'; s.style.background = '#6b707a'; bar.append(s); }
    const lg = $('engLegend'); if (lg) lg.textContent = top.length ? 'Costliest: ' + top.slice(0, 5).map(e => e.name + ' ' + e.msAvg.toFixed(1) + ' ms').join(' · ') + '. The rest of each frame is the game itself and the browser drawing it.' : 'Waiting for the first second of numbers.';
  }
  for (const n of ENGR.cards.keys()) engCardLive(n);
  if (ENGR.sort === 'cost' && (ENGR.tick = (ENGR.tick || 0) + 1) % 5 === 0) engOrder();
  // the ecosystem's log
  const lg = $('engLog'), key = CORE.log.length ? CORE.log[CORE.log.length - 1].t + CORE.log[CORE.log.length - 1].msg : '';
  if (lg && key !== ENGR.lastLog) {
    ENGR.lastLog = key; lg.textContent = '';
    lg.append(el('h3', null, 'Ecosystem log'));
    const ul = el('ol'); const rows = CORE.log.slice(-14).reverse();
    if (!rows.length) ul.append(el('li', null, 'Quiet: nothing has needed repairing, covering or locking this session.'));
    for (const r of rows) { const li = el('li', /locked|Locked|back on Auto/.test(r.msg) ? 'lock' : /resting|error|failed/.test(r.msg) ? 'bad' : /repair|helped|sound again|back after/.test(r.msg) ? 'fix' : ''); li.append(el('time', null, new Date(r.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })), el('span', null, r.msg)); ul.append(li); }
    lg.append(ul);
  }
}
// a lock from the ecosystem while the room is shut still reaches the player
coreOn('engineLocked', 'ENGINE ROOM', d => { if (!ENGR.open) toast('Engine room', d.name + ' was put back on Auto', '#c86bff'); });
const full2 = c => { c._n = (c._n || 0) + 1; return c._n % 2 === 1; };
/* ---------- CORE v3: the traits row and "About" ---------- */
const TRAITS = [
  ['adapts', 'Adapts', 'Steps itself up and down with the frame and the device'],
  ['repairs', 'Self-repairs', 'Checks itself and has fixes CORE can use'],
  ['learns', 'Learns', 'Learns something about this device and uses it'],
  ['covers', 'Covers', 'Covers for another engine, or another covers for it'],
  ['beats', 'Heartbeat', 'Restarted if it goes quiet while it should be working'],
  ['tested', 'Self-test', 'Tests itself when the game starts'],
  ['compat', 'Compatible', 'Says what it needs from the device and what it provides to the others']
];
function engTraits(name) {
  const e = CORE.by[name], a = coreAudit(name), row = el('div', 'ec-traits'); row.setAttribute('aria-label', name + ': traits');
  for (const [k, l, d] of TRAITS) {
    const on = !!a[k], t = el('span', 'ec-trait' + (on ? ' on' : ''), l);
    let why = d;
    if (k === 'learns' && !on) why = e.noLearn || 'Nothing to learn yet';
    if (k === 'covers') why = (e.covers && e.covers.length ? 'Covers for ' + e.covers.join(', ') + '. ' : '') + (a.coveredBy.length ? 'Covered by ' + a.coveredBy.join(', ') + '.' : '') || 'Works on its own';
    if (k === 'beats' && on) why = e.heart || 'CORE restarts it if it reports no work for a few seconds while it should be running';
    if (k === 'compat' && e.provides) why = 'Provides ' + e.provides.join(', ') + '. ' + coreCompat(e).why[0].toUpperCase() + coreCompat(e).why.slice(1) + '.';
    t.title = why; row.append(t);
  }
  return row;
}
function engAbout(name) {
  const D = (typeof ENG_DOCS !== 'undefined' && ENG_DOCS[name]) || null, box = el('div', 'ec-about');
  if (!D) { box.append(el('p', null, CORE.by[name].does || '')); return box; }
  if (D.title) box.append(el('b', 'ec-epithet', D.title));
  if (D.character) box.append(el('p', 'ec-char', D.character));
  for (const [k, l] of [['adapts', 'Adapts'], ['repairs', 'Repairs itself'], ['learns', 'Learns'], ['works', 'Works with'], ['runs', 'Runs on']]) if (D[k]) { const p = el('p', null); p.append(el('em', null, l + ': '), document.createTextNode(D[k])); box.append(p); }
  return box;
}

