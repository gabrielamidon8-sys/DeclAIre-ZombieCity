// Builds the Cinematic Studio: the five film engines (and the shoot) on their own, with the studio's page around them.
// `node tools/build_studio.js` writes studio/index.html (a full page to open from the folder, beside studio/assets)
// and studio/dist/artifact.html (the same page without its document shell, for publishing with the assets).
const fs = require('fs'), path = require('path');
const Z = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(Z, f), 'utf8');
const ENGINES = ['legend', 'legmodel', 'leggun', 'leggun2', 'legfire', 'leghand', 'leganim', 'legloco', 'legperf', 'legrun', 'physics', 'vfxray', 'mimatic', 'legidle', 'curric', 'leganat', 'legobj', 'legmove', 'legqual', 'cur_legend', 'mimcam', 'mimcine', 'mimdir', 'cur_mimatic', 'vfxlens', 'vfxsim', 'cur_vfxray', 'choreo', 'cur_choreo', 'board', 'cur_board', 'mimshoot'];
const js = [rd('studio/shim.js')].concat(ENGINES.map(m => '/* ---- ' + m + '.js ---- */\n' + rd(m + '.js'))).join('\n');
// two functions with one name would replace each other silently: refuse, as the game's build does
{ const seen = new Set(), dup = new Set(); for (const m of js.matchAll(/^(?:async\s+)?function\s*\*?\s*([A-Za-z0-9_$]+)\s*\(/gm)) { if (seen.has(m[1])) dup.add(m[1]); seen.add(m[1]); } if (dup.size) { console.error('studio build stopped: defined twice: ' + [...dup].join(', ')); process.exit(1); } }
if (/<\/script/i.test(js)) { console.error('studio build stopped: an engine contains a closing script tag'); process.exit(1); }
const course = fs.existsSync(path.join(Z, 'studio/course.json')) ? rd('studio/course.json').replace(/<\//g, '<\\/') : 'null';
const page = rd('studio/studio.html').replace('/*__COURSE__*/', () => course).replace('/*__ENGINES__*/', () => js).replace('/*__APP__*/', () => rd('studio/app.js'));
const out = path.join(Z, 'studio/dist'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'artifact.html'), page);
fs.writeFileSync(path.join(Z, 'studio/index.html'), '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' + page.replace('<div class="wrap">', '</head><body>\n<div class="wrap">') + '\n</body></html>\n');
const A = path.join(Z, 'studio/assets');
console.log('built the studio', (Buffer.byteLength(page) / 1024).toFixed(0) + ' KB,', fs.readdirSync(A).length, 'pictures');
