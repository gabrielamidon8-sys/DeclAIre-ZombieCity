// Joins the shell, data files and game into one self-contained page.
// `node build.js test` also exposes a debug hook for automated tests (never published).
const fs = require('fs');
const test = process.argv.includes('test');
const rd = f => fs.readFileSync(__dirname + '/' + f, 'utf8');
let game = rd('game.js').replace('/*__ARSENAL__*/', () => rd('arsenal.js') + '\n' + rd('bossai.js'));
game = game.replace('/*__TESTHOOK__*/', test ? 'window.__zc = { G: G, MUTS: MUTS, WEAPONS: WEAPONS, CARDS: CARDS, found: found, guns: guns, spawnZombie: spawnZombie, killZombie: killZombie, die: die, startWave: startWave, spawnSnatcher: spawnSnatcher, qteHit: qteHit, equipWeapon: equipWeapon, applyChoice: applyChoice, openCards: openCards, recalc: recalc, buildCard: buildCard, chainKill: chainKill, openSkull: openSkull, spawnRoster: spawnRoster, ZB: ZB, startOverlord: startOverlord, callAirstrike: callAirstrike, grantAir: grantAir, openBossLog: openBossLog, hurtZombie: hurtZombie, bossStart: bossStart, BOSS_MOVES: BOSS_MOVES, chooseForbidden: chooseForbidden, refuseSkull: refuseSkull, FF: FF, flowDir: flowDir, buildField: buildField, blocked: blocked, reachable: reachable };' : '');
const out = rd('shell.html')
  .replace('/*__MUTATIONS__*/', () => rd('mutations.js'))
  .replace('/*__AUDIO__*/', () => rd('audio.js'))
  .replace('/*__WEAPONS__*/', () => rd('weapons.js'))
  .replace('/*__BOSSES__*/', () => rd('bosses.js'))
  .replace('/*__GAME__*/', () => game);
if (process.argv.includes('app')) {
  // Android app build: a full offline document with the fonts bundled locally and the app flag set.
  const cut = out.indexOf('<div id="app">');
  const head = out.slice(0, cut).split('\n').filter(l => !/fonts\.(googleapis|gstatic)\.com/.test(l)).join('\n');
  const ff = (fam, w, file) => "@font-face{font-family:'" + fam + "';font-style:normal;font-weight:" + w + ";font-display:swap;src:url(fonts/" + file + ") format('truetype')}";
  const fonts = '<style>' + [ff('Chakra Petch', 400, 'ChakraPetch-Regular.ttf'), ff('Chakra Petch', 500, 'ChakraPetch-Medium.ttf'), ff('Chakra Petch', 600, 'ChakraPetch-SemiBold.ttf'), ff('Chakra Petch', 700, 'ChakraPetch-Bold.ttf'),
    ff('Saira Stencil One', 400, 'SairaStencilOne-Regular.ttf'), ff('Share Tech Mono', 400, 'ShareTechMono-Regular.ttf')].join('') + '[hidden]{display:none!important}</style>';
  const doc = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><meta name="theme-color" content="#0e1115">'
    + '<script>window.ZC_APP = true;</script>' + fonts + head + '</head><body>' + out.slice(cut) + '</body></html>';
  const dir = __dirname + '/android/www';
  fs.mkdirSync(dir + '/fonts', { recursive: true });
  fs.writeFileSync(dir + '/index.html', doc);
  console.log('built app', dir + '/index.html', (doc.length / 1024).toFixed(1) + ' KB');
} else {
  const file = test ? (process.env.ZC_TEST_OUT || __dirname + '/zc-test-body.html') : __dirname + '/zombie-city.html';
  fs.writeFileSync(file, out);
  console.log('built', file, (out.length / 1024).toFixed(1) + ' KB');
}
