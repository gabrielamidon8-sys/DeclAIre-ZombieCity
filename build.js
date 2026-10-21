// Joins the shell, data files and game into one self-contained page.
// `node build.js test` also exposes a debug hook for automated tests (never published).
const fs = require('fs');
const test = process.argv.includes('test');
const rd = f => fs.readFileSync(__dirname + '/' + f, 'utf8');
// the studio intro (and its music) is retired while 2.0 is built, so its audio is no longer embedded in the page
const introMusic = '';
// The modules, in the order they run, joined into game.js where it says ARSENAL (the end of the file, so everything
// game.js sets up exists first). learn.js and engdocs.js come straight after the hub so every engine can use them.
// A new engine is one more file in this list plus a coreDefine() call inside it: the hub, the engine room, the tests,
// the docs and "how intricate is it" all pick it up from there.
const MODULES = ['core', 'learn', 'engdocs', 'world', 'garage', 'skyway', 'life', 'weather', 'lux', 'prism', 'mirror', 'texel', 'gore', 'muzzle', 'tracer', 'aura', 'swarm', 'roster', 'anima', 'anilook',
  'ballistics', 'arsenal', 'dashes', 'physics', 'arms', 'keeper', 'bossai', 'perf', 'settings', 'legend', 'legmodel', 'leggun', 'leganim', 'legrun', 'vfxray', 'mimatic', 'legends', 'engroom', 'loader', 'input', 'profile', 'maint', 'account', 'net', 'intro'];
let game = (rd('filterdata.js') + '\n' + rd('filter.js') + '\n' + rd('acct-core.js') + '\n' + rd('game.js')).replace('/*__ARSENAL__*/', () => MODULES.map(m => m === 'intro' ? rd('intro.js').replace('/*__INTROMUSIC__*/', () => introMusic) : rd(m + '.js')).join('\n'));
// the engine room's "how intricate is it": each engine's own source, counted (lines of code, functions, comment lines, bytes)
{
  const stat = txt => { let code = 0, com = 0, inC = false; for (let l of txt.split('\n')) { l = l.trim(); if (!l) continue; if (inC) { com++; if (l.includes('*/')) inC = false; continue; } if (l.startsWith('/*')) { com++; if (!l.includes('*/')) inC = true; continue; } if (l.startsWith('//')) { com++; continue; } code++; } return [code, (txt.match(/^\s*(?:async\s+)?function\s*\*?\s*[A-Za-z0-9_$]+\s*\(/gm) || []).length + (txt.match(/^\s+[a-zA-Z0-9_]+:\s*function\s*\(/gm) || []).length, com, Buffer.byteLength(txt)]; };
  // every module, plus the files outside the module list that engines are made of
  const files = MODULES.concat(['sfx2', 'cinesfx', 'armsfx', 'audio', 'radio', 'mutations', 'bosses', 'acct-core', 'filter', 'filterdata']);
  const src = {}; for (const f of files) { try { src[f] = stat(rd(f + '.js')); } catch (e) { } }
  // pathfinding lives inside game.js: only its own functions
  const g = rd('game.js'); let ft = ''; for (const n of ['cellBlockedF', 'cellBlocked', 'buildField', 'fieldBuild', 'fieldFor', 'flowDir', 'reachable']) { const i = g.indexOf('function ' + n + '('); if (i < 0) continue; const j = g.indexOf('\nfunction ', i + 10); ft += g.slice(i, j < 0 ? g.length : j) + '\n'; }
  src['game#flow'] = stat(ft);
  game = game.replace('/*__ENGSRC__*/', () => 'const ENG_SRC = ' + JSON.stringify(src) + ';');
}
// every module shares one script, so two functions with the same name would silently replace each other (that is
// how the intro's drawCar once hid every parked car in the city): refuse to build if it happens
{
  const seen = new Map(), dup = [];
  for (const m of game.matchAll(/^(?:async\s+)?function\s*\*?\s*([A-Za-z0-9_$]+)\s*\(/gm)) { if (seen.has(m[1])) dup.push(m[1]); seen.set(m[1], 1); }
  if (dup.length) { console.error('build stopped: these functions are defined twice: ' + [...new Set(dup)].join(', ')); process.exit(1); }
}
game = game.replace('/*__TESTHOOK__*/', test ? 'window.__zc = { LEARN: LEARN, learnRec: learnRec, learnPredict: learnPredict, learnBucket: learnBucket, coreRise: coreRise, learnAhead: learnAhead, learnPick: learnPick, learnForget: learnForget, learnSummary: learnSummary, learnSave: learnSave, learnTick: learnTick, learnClimb: learnClimb, learnTests: learnTests, coreAudit: coreAudit, coreCompat: coreCompat, coreDefine: coreDefine, coreWho: coreWho, coreCaps: coreCaps, coreTrim: coreTrim, ENG_DOCS: ENG_DOCS, netLead: netLead, netFollowK: netFollowK, acctQueueScore: acctQueueScore, acctFlushScore: acctFlushScore, loadLeft: loadLeft, flowIv: flowIv, LOADING: LOADING, ZCF: ZCF, NET: NET, ACCT: ACCT, store: store, MUZZLE_: () => MUZZLE, openEngineRoom: openEngineRoom, openEngineWarn: openEngineWarn, closeEngineRoom: closeEngineRoom, coreEff: coreEff, coreGuard: coreGuard, coreTuneTick: coreTuneTick, coreLocks: coreLocks, TUNE: TUNE, ENG_SPEC: ENG_SPEC, engIntricacy: engIntricacy, engSet: engSet, ENGR: ENGR, waveTime: waveTime, zLeft: zLeft, fmtClock: fmtClock, pzTab: pzTab, BAL: BAL, BAL_GUN: BAL_GUN, balResolve: balResolve, balRay: balRay, balE0: balE0, ANIMA: ANIMA, ZR: ZR, ZR_BY: ZR_BY, zrPool: zrPool, animaEval: animaEval, animaFK: animaFK, animaPlay: animaPlay, animaState: animaState, animaTick: animaTick, animaDeathClip: animaDeathClip, animaDraw: animaDraw, lookDraw: lookDraw, AC: AC, AP: AP, AC_KIND: AC_KIND, AC_N: AC_N, breakTick: breakTick, waveCleared: waveCleared, CARDS_OFF: CARDS_OFF, SWARM: SWARM, SWDYN: SWDYN, swarmNeed: swarmNeed, swarmVehSpec: swarmVehSpec, swarmLaunch: swarmLaunch, swarmWave: swarmWave, swarmCaps: swarmCaps, swarmVehFind: swarmVehFind, swarmVehForce: swarmVehForce, swarmZF: swarmZF, swarmHurt: swarmHurt, swarmRepair: swarmRepair, swarmCheck: swarmCheck, coreMeta: coreMeta, zombieR: zombieR, near: near, coreOn: coreOn, coreEmit: coreEmit, coreHurt: coreHurt, coreWatch: coreWatch, coreSave: coreSave, coreUp: coreUp, AURA: AURA, auraOf: auraOf, TRACER: TRACER, TR_GUN: TR_GUN, goreProf: goreProf, goreBlastHit: goreBlastHit, goreGunOf: goreGunOf, GORE_STRAIN: GORE_STRAIN, bloomK: bloomK, MUZZLE: MUZZLE, MZ: MZ, muzzleShot: muzzleShot, muzzleSprite: muzzleSprite, GORE: GORE, goreSpriteT: goreSprite, goreHit: goreHit, goreKill: goreKill, goreUnder: goreUnder, MIRROR: MIRROR, VEH: VEH, GARAGE: GARAGE, SKY: SKY, skyRow: skyRow, skyCol: skyCol, skyInfo: skyInfo, PRISM: PRISM, GI: GI, CORE: CORE, TEXEL: TEXEL, coreStatus: coreStatus, ATM: ATM, LUX: LUX, chunks: chunks, luxSpill: luxSpill, WX: WX, SET: SET, luxFlash: luxFlash, G: G, MUTS: MUTS, WEAPONS: WEAPONS, CARDS: CARDS, found: found, guns: guns, spawnZombie: spawnZombie, killZombie: killZombie, die: die, startWave: startWave, spawnSnatcher: spawnSnatcher, qteHit: qteHit, equipWeapon: equipWeapon, applyChoice: applyChoice, openCards: openCards, recalc: recalc, buildCard: buildCard, chainKill: chainKill, openSkull: openSkull, spawnRoster: spawnRoster, ZB: ZB, startOverlord: startOverlord, callAirstrike: callAirstrike, grantAir: grantAir, openBossLog: openBossLog, hurtZombie: hurtZombie, bossStart: bossStart, BOSS_MOVES: BOSS_MOVES, chooseForbidden: chooseForbidden, refuseSkull: refuseSkull, FF: FF, flowDir: flowDir, buildField: buildField, blocked: blocked, reachable: reachable, PERF: PERF, Q: Q, LADDER: LADDER, TIER_Q: TIER_Q, applyRung: applyRung, trimCaches: trimCaches, cacheBytes: cacheBytes, perfError: perfError, perfCare: perfCare, setMode: setMode, sprites: sprites, chunks: chunks, scoreTier: scoreTier, gpuClass: gpuClass, openPerf: openPerf, frame: frame, get DPR() { return DPR; }, get ZOOM() { return ZOOM; }, INTRO: INTRO, startIntro: startIntro, introSkip: introSkip, introCard: introCard, fireWeapon: fireWeapon, GUN_LEN: GUN_LEN, keeperSkull: keeperSkull, KEEP: KEEP, openArmory: openArmory, openRadio: openRadio, toggleHudRadio: toggleHudRadio, pauseGame: pauseGame, DASHES: DASHES, equipDash: equipDash, launchStrafe: launchStrafe, dashes: dashes, WORLD: WORLD, WX: WX, WD: WD, SET: SET, BIO: BIO, setSetting: setSetting, distAt: distAt, waterAt: waterAt, riverV: riverV, getChunk: getChunk, renderChunk: renderChunk, chunks: chunks, worldSeed: worldSeed, pickStart: pickStart, setSeason: setSeason, startWorld: startWorld, openSettings: openSettings, closeSettings: closeSettings, boomBarrel: boomBarrel, carHit: carHit, worldBlast: worldBlast, lightning: lightning, strike: strike, wxReset: wxReset, newRun: newRun, cam: cam, rebuildActive: rebuildActive, surfaceAt: surfaceAt, SP: SP, waterLayer: waterLayer, DEV: DEV, BIND: BIND, ACTIONS: ACTIONS, held: held, markDev: markDev, padPoll: padPoll, aimMode: aimMode, coneTarget: coneTarget, startListen: startListen, assignBind: assignBind, menuLayer: menuLayer, navMove: navMove, focusables: focusables, ctrlHintText: ctrlHintText, STATS: STATS, renderTitlePanel: renderTitlePanel, NET: NET, netHost: netHost, netJoin: netJoin, netHostRun: netHostRun, netPlayers: netPlayers, openCoop: openCoop, netLeave: netLeave, netScan: netScan, NativeWS: NativeWS, setName: setName, LB: LB, ACCT: ACCT, acctSync: acctSync, openAcct: openAcct, closeAcct: closeAcct, acctTotals: acctTotals, lbRefresh: lbRefresh, recordRun: recordRun, STATS: STATS, bossSeen: bossSeen, renderLB: renderLB, openLB: openLB, AcctCore: AcctCore, SEASON: SEASON, netMark: netMark, netAutoPick: netAutoPick, nameEl: nameEl, statusCheck: statusCheck, statusBlocked: statusBlocked, STATUS: STATUS, WXD: WXD, windAt: windAt, get RM() { return RM; }, get SCL() { return SCL; }, get CHS() { return CHS; }, get PK() { return PK; }, setWorldScale: setWorldScale, lightsOf: lightsOf, bioAt: bioAt, rectsNear: rectsNear, collide: collide, LG: LG, LGS: LGS, LGR: LGR, MIM: MIM, VX: VX, VXQ: VXQ, LGB: LGB, LG_SKEL: LG_SKEL, LG_ANIMS: LG_ANIMS, LG_ANIM_BY: LG_ANIM_BY, LG_CLASSES: LG_CLASSES, LG_MAKERS: LG_MAKERS, lgSolve: lgSolve, lgPose: lgPose, lgLocalNew: lgLocalNew, lgWorldNew: lgWorldNew, lgRootM: lgRootM, lgEvalClip: lgEvalClip, lgModel: lgModel, lgSpriteFor: lgSpriteFor, lgRunState: lgRunState, lgSelfTest: lgSelfTest, legendCover: legendCover, legendDrawPlayer: legendDrawPlayer, openLegends: openLegends, closeLegends: closeLegends, lgsEnterCharacters: lgsEnterCharacters, lgsHover: lgsHover, lgsUnhover: lgsUnhover, lgsOpenLegend: lgsOpenLegend, lgsSetClass: lgsSetClass, lgsPlayAnim: lgsPlayAnim, lgsDeploy: lgsDeploy, lgsBack: lgsBack, mimStart: mimStart, mimStop: mimStop, mimDirectOperator: mimDirectOperator, vfxFlashAt: vfxFlashAt, vfxLightning: vfxLightning, netLegendOk: netLegendOk, netLegendChanged: netLegendChanged, LG_SOCK: LG_SOCK, lgMul: lgMul, lgM4: lgM4, ARMS: ARMS, ARMS_LIST: ARMS_LIST, ARMS_BY: ARMS_BY, armsFire: armsFire, armsReload: armsReload, armsSwap: armsSwap, armsDodge: armsDodge, armsTick: armsTick, armsSelfTest: armsSelfTest, armsLoad: armsLoad, armsSetLoad: armsSetLoad, armsNetCode: armsNetCode, armsPickup: armsPickup, PHY: PHY, PHY_KIND: PHY_KIND, physSpawn: physSpawn, physEject: physEject, physMagDrop: physMagDrop, physStep: physStep, physSelfTest: physSelfTest, physU: physU, phy3New: phy3New, phy3Add: phy3Add, phy3Step: phy3Step, physSpring: physSpring, tryDash: tryDash, hurtPlayer: hurtPlayer, updWeaponChip: updWeaponChip, renderArmory: renderArmory, LGV: LGV, lgvDraw: lgvDraw, lgvBody: lgvBody, LGV_UP: LGV_UP, lgvPaint: lgvPaint, LGV_M: LGV_M, LGV_BOX: LGV_BOX, lgvModelKey: lgvModelKey, lgModel: lgModel, LG_GUN_DEF: LG_GUN_DEF, lgGunSock: lgGunSock, lgvWarm: lgvWarm, lgvRoll: lgvRoll };' : '');
// Fonts are embedded in the page, so neither version makes a single network request.
// Chakra Petch and Saira Stencil One are trimmed to the characters the game uses; Share Tech Mono (which has a
// Reserved Font Name) is embedded unmodified. All three are under the SIL Open Font License 1.1 (see fonts/).
const font = (fam, w, file, fmt) => "@font-face{font-family:'" + fam + "';font-style:normal;font-weight:" + w + ";font-display:swap;src:url(data:font/" + fmt + ";base64," + fs.readFileSync(__dirname + '/fonts/' + file).toString('base64') + ") format('" + fmt + "')}";
const FONTS = '<style>/* Fonts: Chakra Petch (c) 2018 The Chakra Petch Project Authors; Saira Stencil One (c) 2019 The Saira Stencil Project Authors; '
  + "Share Tech Mono (c) 2012 Carrois Type Design, Ralph du Carrois, Reserved Font Name 'Share'. Licensed under the SIL Open Font License 1.1, https://openfontlicense.org */"
  + [font('Chakra Petch', 400, 'ChakraPetch-Regular.woff', 'woff'), font('Chakra Petch', 500, 'ChakraPetch-Medium.woff', 'woff'), font('Chakra Petch', 600, 'ChakraPetch-SemiBold.woff', 'woff'),
     font('Chakra Petch', 700, 'ChakraPetch-Bold.woff', 'woff'), font('Saira Stencil One', 400, 'SairaStencilOne-Regular.woff', 'woff'), font('Share Tech Mono', 400, 'ShareTechMono-Regular.ttf', 'truetype')].join('')
  + '</style>';
const out = rd('shell.html').split('\n').filter(l => !/fonts\.(googleapis|gstatic)\.com/.test(l)).join('\n').replace('<style>', () => FONTS + '\n<style>')
  .replace('<!--__KEEPER__-->', () => rd('keeper.html'))
  .replace('/*__KEEPERCSS__*/', () => rd('keeper.css'))
  // the 2.0 interface (1.9.990): the HUD and controls, the menus and the pause screen, the engine room
  .replace('/*__UI2CSS__*/', () => ['ui-hud.css', 'ui-menu.css', 'ui-eng.css', 'ui-legends.css'].filter(f => fs.existsSync(__dirname + '/' + f)).map(rd).join('\n'))
  .replace('/*__MUTATIONS__*/', () => rd('mutations.js'))
  .replace("/*__AUDIO__*/", () => rd("audio.js").replace("/*__RADIO__*/", () => rd("radio.js")).replace('/*__SFX2__*/', () => rd('sfx2.js')).replace('/*__CINESFX__*/', () => rd('cinesfx.js')).replace('/*__ARMSFX__*/', () => rd('armsfx.js')))
  .replace('/*__WEAPONS__*/', () => rd('weapons.js'))
  .replace('/*__BOSSES__*/', () => rd('bosses.js'))
  .replace('/*__GAME__*/', () => game);
if (process.argv.includes('win')) {
  // Windows app build (desktop/build_win.py wraps it in Electron): a full offline document with the desktop flag set
  const cut = out.indexOf('<div id="app">');
  const doc = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0e1115">'
    + '<script>window.ZC_DESKTOP = true;</script><style>[hidden]{display:none!important}</style>' + out.slice(0, cut) + '</head><body>' + out.slice(cut) + '</body></html>';
  const dir = __dirname + '/desktop/app';
  fs.mkdirSync(dir + '/fonts', { recursive: true }); fs.mkdirSync(dir + '/game', { recursive: true });
  for (const f of fs.readdirSync(__dirname + '/fonts')) if (f.startsWith('OFL')) fs.copyFileSync(__dirname + '/fonts/' + f, dir + '/fonts/' + f);
  fs.writeFileSync(dir + '/game/index.html', doc);
  // the game's version, read from game.js, and the release files the launcher downloads updates from
  const ver = (/const ZC_VERSION = '([^']+)'/.exec(rd('game.js')) || [])[1] || '0';
  const sum = require('crypto').createHash('sha256').update(doc).digest('hex');
  fs.writeFileSync(dir + '/game/game.json', JSON.stringify({ version: ver, sha256: sum, size: Buffer.byteLength(doc) }));
  const sh = rd('shell.html'), sk0 = sh.indexOf('<svg class="skull-art" id="skullArt"'), skull = sh.slice(sk0, sh.indexOf('</svg>', sk0) + 6).replace(' class="skull-art" id="skullArt"', '');
  fs.writeFileSync(dir + '/launcher.html', rd('desktop/launcher.html').replace('<!--__FONTS__-->', () => FONTS).replace('<!--__SKULL__-->', () => skull));
  console.log('built windows launcher', ver, dir, (doc.length / 1024).toFixed(1) + ' KB');
} else if (process.argv.includes('app')) {
  // Android app build: a full offline document with the app flag set (fonts are already embedded above)
  const cut = out.indexOf('<div id="app">');
  const doc = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><meta name="theme-color" content="#0e1115">'
    + '<script>window.ZC_APP = true;</script><style>[hidden]{display:none!important}</style>' + out.slice(0, cut) + '</head><body>' + out.slice(cut) + '</body></html>';
  const dir = __dirname + '/android/www';
  fs.mkdirSync(dir + '/fonts', { recursive: true });
  for (const f of fs.readdirSync(__dirname + '/fonts')) if (f.startsWith('OFL')) fs.copyFileSync(__dirname + '/fonts/' + f, dir + '/fonts/' + f);
  fs.writeFileSync(dir + '/index.html', doc);
  console.log('built app', dir + '/index.html', (doc.length / 1024).toFixed(1) + ' KB');
} else {
  const file = test ? (process.env.ZC_TEST_OUT || __dirname + '/zc-test-body.html') : __dirname + '/zombie-city.html';
  fs.writeFileSync(file, out);
  console.log('built', file, (out.length / 1024).toFixed(1) + ' KB');
  if (!test) {
    // a complete stand-alone page for playing offline straight from a file
    const cut = out.indexOf('<div id="app">');
    const doc = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><meta name="theme-color" content="#0e1115">'
      + out.slice(0, cut) + '</head><body>' + out.slice(cut) + '</body></html>';
    fs.writeFileSync(__dirname + '/zombie-city-offline.html', doc);
    console.log('built', __dirname + '/zombie-city-offline.html');
  }
}
