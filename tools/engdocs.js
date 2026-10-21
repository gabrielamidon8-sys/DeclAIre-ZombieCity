// Writes the engines document from engdocs.js: `node tools/engdocs.js` prints Markdown (ENGINES.md),
// `node tools/engdocs.js --json` prints the sections for the Google Doc builder.
const D = require('../engdocs.js');
const names = Object.keys(D);
const INTRO = [
  ['p', 'Zombie City runs on ' + names.length + ' engines. Each one does one job (light, sound, the crowd, the city, co-op...) and none of them works alone: they meet in CORE, the hub, which gives them one shared frame, one time budget, a message bus, a capability registry and a watchdog.'],
  ['h', 'How the ecosystem works (CORE v3)'],
  ['b', 'Adapts: an engine steps itself up and down with the frame and the device. When the frame runs late, CORE steps down the engine whose step down saves the most on this device; when there is room it climbs engines back, if what it learned says the next level fits. When a horde sets off it steps the crowd engines down before the crowd arrives.'],
  ['b', 'Repairs itself: every engine checks itself, and CORE checks every engine every two seconds (errors, the engine\'s own check, a heartbeat, a self-test). For each problem CORE tries the fixes that have worked best for that kind of problem on this device (the engine\'s own repair, help from the others, a step down, a fresh start), then rests the engine while the others cover for it.'],
  ['b', 'Learns: on each device, what every engine costs at each level and load, the levels it could not hold, which fix clears which problem and how much to trust each engine; and some engines learn something of their own (the co-op link, how fast the radio renders, when a phone runs hot, how long a city block takes to draw, where a hand misses a gun\'s grip and how far to move the gun, how far a foot travels in a step, where a shot loses its subject, how much rain a device can afford). Learning never changes the rules of a run (damage, hits, the waves): only how the work is done and drawn, so co-op screens can never fall out of step.'],
  ['b', 'Compatible: each engine says what it needs from the device and what it provides to the others, so it can tell you if it runs here fully, partly or not at all, and engines ask for a capability ("light", "crowd", "paths") instead of for each other.'],
  ['b', 'Heartbeat and self-test: an engine that should be working and goes quiet is restarted; engines that can test themselves do so at start (the name filter, the bullet maths, the roster, the encryption, the rigs, the city\'s seed, the ten guns, a dropped can).'],
  ['p', 'All of it shows live in the engine room (Settings > Accessibility > Ultra advanced): every engine\'s cost, its traits, what it has learned on this device, its trust, its self-test, and the two controls (how hard it runs, CPU or GPU).'],
  ['h', 'Adding an engine'],
  ['p', 'A new engine is one file added to the module list in build.js and one coreDefine({...}) call inside it, with its name, what it does, what it provides and needs, its levels and load, its checks, repairs and self-test, what it learns, its engine room spec and its entry for this document. The hub, the engine room, the contract test, the "how intricate is it" score and this document all pick it up from there.']
];
const FIELDS = [['does', 'What it does'], ['adapts', 'Adapts'], ['repairs', 'Repairs itself'], ['learns', 'Learns'], ['works', 'Works with'], ['runs', 'Runs on'], ['tune', 'In the engine room']];
const sections = names.map(n => ({ name: n, title: D[n].title, character: D[n].character, rows: FIELDS.filter(([k]) => D[n][k]).map(([k, l]) => [l, D[n][k]]) }));
if (process.argv.includes('--json')) { process.stdout.write(JSON.stringify({ count: names.length, intro: INTRO, engines: sections })); }
else {
  const out = ['# ' + names.length + ' engines', ''];
  let prevB = false; for (const [t, x] of INTRO) { if (t !== 'b' && prevB) out.push(''); out.push(t === 'h' ? '## ' + x : t === 'b' ? '- ' + x : x); if (t !== 'b') out.push(''); prevB = t === 'b'; }
  out.push('## The engines', '');
  for (const s of sections) { out.push('### ' + s.name + ': ' + s.title, '', '*' + s.character + '*', ''); for (const [l, v] of s.rows) out.push('- **' + l + ':** ' + v); out.push(''); }
  process.stdout.write(out.join('\n').replace(/\n{3,}/g, '\n\n'));
}
