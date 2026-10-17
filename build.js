// Joins the shell, data files and game into one self-contained page.
// `node build.js test` also exposes a debug hook for automated tests (never published).
const fs = require('fs');
const test = process.argv.includes('test');
const rd = f => fs.readFileSync(__dirname + '/' + f, 'utf8');
const introMusic = fs.existsSync(__dirname + '/media/intro-claude.mp3') ? fs.readFileSync(__dirname + '/media/intro-claude.mp3').toString('base64') : '';
let game = rd('game.js').replace('/*__ARSENAL__*/', () => rd('world.js') + '\n' + rd('life.js') + '\n' + rd('weather.js') + '\n' + rd('arsenal.js') + '\n' + rd('dashes.js') + '\n' + rd('keeper.js') + '\n' + rd('bossai.js') + '\n' + rd('perf.js') + '\n' + rd('settings.js') + '\n' + rd('input.js') + '\n' + rd('profile.js') + '\n' + rd('net.js') + '\n' + rd('intro.js').replace('/*__INTROMUSIC__*/', () => introMusic));
game = game.replace('/*__TESTHOOK__*/', test ? 'window.__zc = { G: G, MUTS: MUTS, WEAPONS: WEAPONS, CARDS: CARDS, found: found, guns: guns, spawnZombie: spawnZombie, killZombie: killZombie, die: die, startWave: startWave, spawnSnatcher: spawnSnatcher, qteHit: qteHit, equipWeapon: equipWeapon, applyChoice: applyChoice, openCards: openCards, recalc: recalc, buildCard: buildCard, chainKill: chainKill, openSkull: openSkull, spawnRoster: spawnRoster, ZB: ZB, startOverlord: startOverlord, callAirstrike: callAirstrike, grantAir: grantAir, openBossLog: openBossLog, hurtZombie: hurtZombie, bossStart: bossStart, BOSS_MOVES: BOSS_MOVES, chooseForbidden: chooseForbidden, refuseSkull: refuseSkull, FF: FF, flowDir: flowDir, buildField: buildField, blocked: blocked, reachable: reachable, PERF: PERF, Q: Q, LADDER: LADDER, TIER_Q: TIER_Q, applyRung: applyRung, trimCaches: trimCaches, cacheBytes: cacheBytes, perfError: perfError, perfCare: perfCare, setMode: setMode, sprites: sprites, chunks: chunks, scoreTier: scoreTier, gpuClass: gpuClass, openPerf: openPerf, frame: frame, get DPR() { return DPR; }, get ZOOM() { return ZOOM; }, INTRO: INTRO, startIntro: startIntro, introSkip: introSkip, introCard: introCard, fireWeapon: fireWeapon, GUN_LEN: GUN_LEN, keeperSkull: keeperSkull, KEEP: KEEP, openArmory: openArmory, openRadio: openRadio, toggleHudRadio: toggleHudRadio, pauseGame: pauseGame, DASHES: DASHES, equipDash: equipDash, launchStrafe: launchStrafe, dashes: dashes, WORLD: WORLD, WX: WX, WD: WD, SET: SET, BIO: BIO, setSetting: setSetting, distAt: distAt, waterAt: waterAt, riverV: riverV, getChunk: getChunk, renderChunk: renderChunk, chunks: chunks, worldSeed: worldSeed, pickStart: pickStart, setSeason: setSeason, startWorld: startWorld, openSettings: openSettings, closeSettings: closeSettings, boomBarrel: boomBarrel, carHit: carHit, worldBlast: worldBlast, lightning: lightning, strike: strike, wxReset: wxReset, newRun: newRun, cam: cam, rebuildActive: rebuildActive, surfaceAt: surfaceAt, SP: SP, waterLayer: waterLayer, DEV: DEV, BIND: BIND, ACTIONS: ACTIONS, held: held, markDev: markDev, padPoll: padPoll, aimMode: aimMode, coneTarget: coneTarget, startListen: startListen, assignBind: assignBind, menuLayer: menuLayer, navMove: navMove, focusables: focusables, ctrlHintText: ctrlHintText, STATS: STATS, renderTitlePanel: renderTitlePanel, NET: NET, netHost: netHost, netJoin: netJoin, netHostRun: netHostRun, netPlayers: netPlayers, openCoop: openCoop, netLeave: netLeave, netScan: netScan, NativeWS: NativeWS, setName: setName, LB: LB, renderLB: renderLB, openLB: openLB, get RM() { return RM; } };' : '');
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
  .replace('/*__MUTATIONS__*/', () => rd('mutations.js'))
  .replace("/*__AUDIO__*/", () => rd("audio.js").replace("/*__RADIO__*/", () => rd("radio.js")).replace('/*__SFX2__*/', () => rd('sfx2.js')))
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
