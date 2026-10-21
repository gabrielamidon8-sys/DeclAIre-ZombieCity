/* ================= BOARD: the storyboard artist (1.9.995) =================
   A new engine. BOARD turns a written scene into what a production plans from, and stages it for the other engines:
   - Reading a scene (v1): the scene heading (inside or out, the place, the time), the people (named, described or
     pronouns followed back to who they mean), what each does (walking, picking up, handing over, throwing, drinking,
     talking, looking, every blow of a fight), the things they handle, how they do it (an adverb becomes one of Laban's
     efforts) and the weather and light.
   - The shot list (v2): every beat as shots with the fields a production uses (number, description, size, type,
     movement, lens, length, the people in it), opening wide, close for feeling, inserts for hands, fights in short
     handheld shots.
   - Panels (v3): each shot drawn from the camera MIMATIC chose, the people posed as LEGEND performs them at that moment,
     with the arrows storyboard artists use (a figure's movement, the camera's push, pan or track), the frame and caption.
   - Floor plans and continuity (v4): the set from above with the people's marks and paths, every camera with its field
     of view, the line of action; checks of the 180-degree rule, screen direction and eyelines across the cuts.
   - Style, revisions and the animatic (v5): a pencil look (line weight by depth, hatching on the shadow side), notes
     from a director applied to the board ("make 3 a close-up", "add an insert of the bottle") without disturbing what
     the note did not touch, and the animatic: the panels timed to the cut, with the camera moves played across them.
   BOARD also compiles the scene for the others: each beat becomes a LEGEND performance or a CHOREO fight, in order, on
   a set, so the scene can be directed, drawn and rendered. */
const BRD = { made: 0 };
/* ---------- the vocabulary ---------- */
const BRD_VERBS = [
  [/\b(walks?|strolls?|steps?|comes?|enters?)\b(?! back)/, 'walk', 'action'], [/\b(runs?|rushes?|charges?|sprints?)\b/, 'run', 'action'],
  [/\b(picks? up|grabs?|takes?|lifts?|snatches?)\b/, 'pick', 'handle'], [/\b(puts? down|sets? down|places?)\b/, 'put', 'handle'],
  [/\b(hands?|gives?|passes?|offers?)\b/, 'give', 'handle'], [/\b(throws?|tosses?|hurls?|pitches?)\b/, 'throw', 'action'], [/\b(drinks?|sips?)\b/, 'drink', 'handle'],
  [/\bjabs?\b/, 'jab', 'fight'], [/\buppercuts?\b/, 'uppercut', 'fight'], [/\bhooks?\b/, 'hook', 'fight'], [/\broundhouse\b/, 'roundKick', 'fight'], [/\bkicks?\b/, 'frontKick', 'fight'],
  [/\b(body shot|to the body|in the gut|in the stomach)\b/, 'body', 'fight'], [/\bcross(es)?\b/, 'cross', 'fight'], [/\b(punch(es)?|hits?|strikes?|swings? at|smashes?)\b/, 'cross', 'fight'],
  [/\bblocks?\b/, 'block', 'fight'], [/\bparr(y|ies)\b/, 'parry', 'fight'], [/\bducks?\b/, 'duck', 'fight'], [/\b(slips?|dodges?|evades?|sidesteps?)\b/, 'slip', 'fight'],
  [/\b(fires?|shoots?)\b/, 'shot', 'fight'], [/\b(falls?|collapses?|crumples?|goes down)\b/, 'fall', 'action'],
  [/\b(says?|asks?|tells?|whispers?|shouts?|speaks?|talks?|replies?|answers?)\b/, 'talk', 'talk'], [/\b(looks?|stares?|glances?|watches?|turns to)\b/, 'look', 'emotion'],
  [/\b(smiles?|frowns?|nods?|sighs?|freezes?|waits?|hesitates?)\b/, 'react', 'emotion']
];
const BRD_THINGS = { mug: 'mug', cup: 'mug', coffee: 'mug', bottle: 'bottle', beer: 'bottle', can: 'can', soda: 'can', flashlight: 'flashlight', torch: 'flashlight', hammer: 'hammer', ball: 'ball', baseball: 'ball', orange: 'orange', pen: 'pen', coin: 'coin', key: 'key', keys: 'key', phone: 'phone', box: 'box', shoebox: 'box', crate: 'crate' };
const BRD_ADVERBS = { angrily: 'slash', furiously: 'punch', hard: 'punch', slowly: 'glide', carefully: 'press', gently: 'float', softly: 'float', quickly: 'dab', lightly: 'flick', nervously: 'wring', firmly: 'press', casually: 'float' };
const BRD_DEF = { block: 1, parry: 1, duck: 1, slip: 1 };
/* ---------- v1: reading ---------- */
function brdRead(text) {
  const out = { heading: null, place: '', inside: null, time: '', weather: [], chars: [], beats: [], text: text };
  const lines = text.replace(/\r/g, '').split(/\n+/).map(s => s.trim()).filter(Boolean); let body = [];
  for (const ln of lines) { const h = ln.match(/^(INT|EXT|INT\/EXT)\.?\s+(.+?)\s*[-–—]\s*(DAY|NIGHT|DUSK|DAWN|MORNING|EVENING|LATER|CONTINUOUS)\b\.?\s*(.*)$/i); if (h && !out.heading) { out.heading = h[0].slice(0, h[0].length - h[4].length).trim().replace(/\.$/, ''); out.inside = /^INT/i.test(h[1]); out.place = h[2].trim(); out.time = h[3].toUpperCase(); if (h[4]) body.push(h[4]); } else body.push(ln); }
  let all = body.join(' '); const low = all.toLowerCase();
  for (const [w, k] of [['rain', 'rain'], ['fog', 'fog'], ['mist', 'fog'], ['smoke', 'smoke'], ['neon', 'neon'], ['streetlight', 'sodium'], ['moon', 'moonlight'], ['snow', 'snow'], ['dust', 'dust']]) if (low.indexOf(w) >= 0 && out.weather.indexOf(k) < 0) out.weather.push(k);
  // dialogue: the words inside quotes are kept aside so their punctuation does not split sentences; a quote and the
  // short line that says who spoke it ("he asks") are one sentence
  const quotes = []; all = all.replace(/["“]([^"”]+)["”]/g, (m0, q) => { quotes.push(q); return ' Q' + (quotes.length - 1) + 'Q '; });
  all = all.replace(/(Q\d+Q)\s*[.!?]?\s+((?:he|she|they|[A-Z][a-z]+)\s+(?:says?|asks?|tells?|whispers?|shouts?|replies?|answers?)\b)/g, '$1 $2');
  // the people: names (any capitals, one person), or described ("a man", "the stranger"); pronouns go back to the right one
  const C = out.chars, key = nm => nm.toLowerCase(), find = (nm) => C.find(c => c.names.some(n => n === key(nm))), title = nm => nm.charAt(0).toUpperCase() + nm.slice(1).toLowerCase();
  const add = (nm, desc) => { let c = find(nm); if (!c) { c = { id: C.length, name: desc ? nm.toLowerCase() : title(nm), names: [key(nm)], desc: desc || '', g: null }; if (/\b(man|guy|boy|father|son|brother|king|he)\b/.test(key(nm))) c.g = 'm'; if (/\b(woman|girl|mother|daughter|sister|queen|she)\b/.test(key(nm))) c.g = 'f'; C.push(c); } return c; };
  const STOP = new Set(['The', 'A', 'An', 'He', 'She', 'They', 'It', 'His', 'Her', 'Then', 'Rain', 'Night', 'Int', 'Ext', 'Neon', 'With', 'In', 'On', 'At', 'And', 'But', 'As', 'When', 'Now', 'Snow', 'Fog', 'Smoke', 'Silence', 'Thunder', 'Lightning']);
  const DESC = '((?:[a-z]+\\s)?(?:man|woman|stranger|thug|guard|kid|hero|cop|soldier|boxer|fighter|figure|bartender|attacker|girl|boy|father|mother|son|daughter|friend|brother|sister|partner|officer|driver))';
  const pron = (p, last) => { const g = /^(he|him|his)$/i.test(p) ? 'm' : /^(she|her)$/i.test(p) ? 'f' : null; if (g) { const byG = C.filter(c => c.g === g); if (byG.length === 1) return byG[0]; if (last && !last.g && !C.some(c => c.g === g)) { last.g = g; return last; } if (byG.length) return byG[byG.length - 1]; } return last; };
  const sentences = all.match(/[^.!?;]+[.!?;]+|[^.!?;]+$/g) || [all]; let lastSubj = null, i = 0;
  for (const raw of sentences) {
    const s = raw.trim(); if (!s) continue; const qm = s.match(/Q(\d+)Q/), quote = qm ? quotes[+qm[1]] : null, s2 = s.replace(/Q\d+Q/g, '').trim();
    let subj = null, m;
    if ((m = s2.match(/^([A-Z][A-Za-z]+)(?=[\s,:'])/)) && !STOP.has(title(m[1]))) subj = add(m[1]);
    else if ((m = s2.match(new RegExp('^(?:the|a|an)\\s+' + DESC + '\\b', 'i')))) subj = find(m[1]) || add(m[1], 'a ' + m[1].toLowerCase());
    else if ((m = s2.match(/^(he|she|they)\b/i))) subj = pron(m[1], lastSubj);
    if (!subj && quote) subj = C.find(c => c !== lastSubj) || lastSubj;
    // the one acted on: another person named or described in the sentence, or a pronoun
    // (a name met for the first time later in the sentence is a person too)
    { const g2 = /\b([A-Z][a-z]+)\b/g; let mm; while ((mm = g2.exec(s2))) if (mm.index > 0 && !STOP.has(mm[1]) && !/^Q\d/.test(mm[1])) add(mm[1]); }
    let obj = null; for (const c of C) if (c !== subj && c.names.some(nm => (new RegExp('\\b' + nm + '\\b', 'i')).test(s2))) obj = c;
    if (!obj && (m = s2.match(new RegExp('\\b(?:his|her|their)\\s+' + DESC + '\\b', 'i')))) obj = find(m[1]) || add(m[1], 'a ' + m[1].toLowerCase());
    if (!obj && (m = s2.match(new RegExp('\\b(?:at|to|on|toward|towards)\\s+(?:the|a)\\s+' + DESC + '\\b', 'i')))) obj = find(m[1]) || add(m[1], 'a ' + m[1].toLowerCase());
    if (!obj && (m = s2.match(/\b(him|her|them)\b/i))) { const o2 = pron(m[1], null); obj = o2 && o2 !== subj ? o2 : C.find(c => c !== subj) || null; }
    // what is done: every verb in the order written
    const found = []; for (const [re, act, kind] of BRD_VERBS) { const g = new RegExp(re.source, 'gi'); let mm; while ((mm = g.exec(s2))) { if (found.some(f => Math.abs(f.at - mm.index) < 3)) continue; found.push({ at: mm.index, act: act, kind: kind, word: mm[0] }); } }
    found.sort((a, b) => a.at - b.at);
    // "throws a punch" is a punch; "punch" next to a named blow is that blow; a kick "in the stomach" is the kick
    for (let k = found.length - 1; k >= 0; k--) { const f = found[k], nx = found[k + 1]; if (f.act === 'throw' && nx && nx.kind === 'fight') found.splice(k, 1); }
    for (let k = found.length - 1; k > 0; k--) if (found[k - 1].act === 'cross' && /punch|hit|strike/i.test(found[k - 1].word) && found[k].kind === 'fight' && found[k].at - found[k - 1].at < 30 && !BRD_DEF[found[k].act]) found.splice(k - 1, 1);
    if (found.some(f => f.act === 'frontKick' || f.act === 'roundKick')) { const k = found.findIndex(f => f.act === 'body'); if (k >= 0) found.splice(k, 1); }
    if (found.some(f => f.act === 'walk') && found.some(f => f.act === 'react')) found.splice(found.findIndex(f => f.act === 'react'), 1);
    const thing = (() => { for (const w of s2.toLowerCase().split(/[^a-z]+/)) if (BRD_THINGS[w]) return BRD_THINGS[w]; return null; })();
    const effort = (() => { for (const w of s2.toLowerCase().split(/[^a-z]+/)) if (BRD_ADVERBS[w]) return BRD_ADVERBS[w]; return null; })();
    if (quote && !found.some(f => f.kind === 'talk')) found.unshift({ act: 'talk', kind: 'talk', word: 'says' });
    if (!subj) continue;   // (a line of weather or setting: no one acts)
    for (const f of found) out.beats.push({ i: i++, text: s.replace(/Q(\d+)Q/g, (m0, q) => '"' + quotes[+q] + '"'), who: subj.id, verb: f.word.toLowerCase(), act: f.act, kind: f.kind, thing: ['pick', 'put', 'give', 'throw', 'drink'].includes(f.act) ? thing : f.act === 'cross' && /bottle/i.test(s2) ? 'bottle' : null, target: obj ? obj.id : null, effort: effort, quote: f.kind === 'talk' ? quote : null });
    lastSubj = subj;
  }
  // a defence answers the blow before it: it belongs to that exchange
  for (let k = 1; k < out.beats.length; k++) { const b = out.beats[k], p = out.beats[k - 1]; if (BRD_DEF[b.act] && p.kind === 'fight' && !BRD_DEF[p.act]) { p.def = b.act; b.merged = true; } }
  out.beats = out.beats.filter(b => !b.merged).map((b, k) => Object.assign(b, { i: k }));
  for (const b of out.beats) { if ((b.kind === 'fight' || b.act === 'give') && (b.target == null || b.target === b.who)) { const o2 = out.chars.find(c => c.id !== b.who); b.target = o2 ? o2.id : null; } b.dur = brdBeatDur(b); }
  BRD.made++; return out;
}
// how long a beat takes, from what the engines know of it
function brdBeatDur(b) {
  switch (b.act) {
    case 'walk': return 2.6; case 'run': return 1.6; case 'pick': return 2.3; case 'put': return 1.8; case 'give': return 2.8; case 'throw': return 1.5; case 'drink': return 3.2; case 'fall': return 1.4;
    case 'talk': return b.quote ? 0.6 + b.quote.split(/\s+/).length / 2.6 : 2.2; case 'look': return 1.6; case 'react': return 1.4;
  }
  if (b.kind === 'fight') { const m = CHO_MOVES[b.act]; return m ? m.t[0] + m.t[1] + m.t[2] + 0.35 : 0.8; }
  return 1.5;
}
/* ---------- v2: the shot list ---------- */
// fields after StudioBinder's shot list: n, scene, beat, description, size, type, movement, lens, length, cast, notes
function brdShotList(sc) {
  const shots = [], name = id => id == null ? '' : (sc.chars[id] || {}).name || '';
  const push = (o) => { shots.push(Object.assign({ n: shots.length + 1, scene: 1 }, o)); };
  push({ beat: -1, desc: (sc.heading || 'The scene') + (sc.weather.length ? ', ' + sc.weather.join(', ') : '') + ': establishing', size: 'EWS', type: 'master', move: sc.weather.indexOf('rain') >= 0 ? 'crane down' : 'static', lens: 21, len: 2.5, cast: sc.chars.map(c => c.name).join(', ') });
  let fightRun = 0;
  for (const b of sc.beats) {
    const who = name(b.who), tgt = name(b.target), d = (who + ' ' + b.verb + (b.thing ? ' the ' + b.thing : '') + (tgt && b.kind !== 'handle' ? ' ' + tgt : '') + (b.def ? '; ' + tgt + ' ' + b.def + 's' : '') + (b.quote ? ': "' + b.quote + '"' : '')).trim();
    if (b.kind === 'fight') { fightRun++; push({ beat: b.i, desc: d, size: fightRun % 3 === 1 ? 'MLS' : fightRun % 3 === 2 ? 'MS' : 'MCU', type: fightRun % 3 === 0 ? 'single' : 'two', move: 'handheld', lens: fightRun % 3 === 0 ? 50 : 35, len: b.dur, cast: [who, tgt].filter(Boolean).join(', '), notes: 'staged for the lens (CHOREO)' }); continue; }
    fightRun = 0;
    if (b.kind === 'handle') { push({ beat: b.i, desc: d, size: 'MS', type: 'single', move: 'static', lens: 50, len: b.dur * 0.55, cast: who }); push({ beat: b.i, desc: 'Insert: ' + who + '\'s hands on the ' + (b.thing || 'thing'), size: 'ECU', type: 'insert', move: 'push in', lens: 85, len: b.dur * 0.45, cast: who }); continue; }
    if (b.kind === 'talk') { push({ beat: b.i, desc: d, size: 'MCU', type: 'single', move: 'static', lens: 65, len: b.dur, cast: who }); continue; }
    if (b.kind === 'emotion') { push({ beat: b.i, desc: d, size: 'CU', type: 'single', move: 'push in', lens: 85, len: b.dur, cast: who }); continue; }
    if (b.act === 'walk' || b.act === 'run') { push({ beat: b.i, desc: d, size: 'WS', type: 'single', move: 'track', lens: 27, len: b.dur, cast: who }); continue; }
    push({ beat: b.i, desc: d, size: b.act === 'fall' ? 'FS' : 'MLS', type: 'single', move: 'static', lens: 35, len: b.dur, cast: who });
  }
  return shots;
}
/* ---------- compiling the scene for the engines ---------- */
// the staging: the first person at the origin facing +x, the second 1.1 m in front facing back, a third off to the side;
// a table beside the first for the things they handle
const BRD_MARKS = [[0, 0, 0], [1.1, 0, Math.PI], [-1.9, 1.2, -0.56]];
function brdSolveL(P) { const L = lgLocalNew(), W = lgWorldNew(); lgSolve(P, L, W, lgRootM(P)); return { L: L, W: W, root: P.root.slice() }; }
function brdIdle(i, t, o) { o = o || {}; const P = lgPose(); lgPoseReset(P); const m = o.mark || BRD_MARKS[i] || [0, 0, 0]; P.root = [m[0], m[1], 0, m[2]]; lgBase(P, {}); lgBreath(P, t + i * 1.7, 1, 4.2); if (o.talk) { lgJadd(P, 'head', 0, Math.sin(t * 7) * 0.04, Math.sin(t * 2.3) * 0.05); lgJadd(P, 'neck', 0, 0, Math.sin(t * 1.1) * 0.06); lgArm(P, 'R', -0.25 - Math.sin(t * 2.1) * 0.1, 0.15, 0, 0.9 + Math.sin(t * 3.1) * 0.25, 0); } if (o.look != null) lgLookAt(P, o.look, 0, 0); if (o.fallen != null) choFallen(P, o.fallen); return P; }
function brdCompile(sc, o) {
  o = o || {}; const n = Math.max(2, Math.min(3, sc.chars.length || 2)), segs = []; let t = 0; const state = { holds: {}, fallen: {} }, C0 = { set: [] };
  // consecutive blows make one fight
  const groups = []; for (const b of sc.beats) { const g = groups[groups.length - 1]; if (b.kind === 'fight' && g && g.fight) g.beats.push(b); else groups.push({ fight: b.kind === 'fight', beats: [b] }); }
  const table = { at: [0.62, -0.42, 0] };
  // someone whose first beat is walking in waits where that walk starts (out of the shot), until then
  const enters = {}; for (const b of sc.beats) { if (b.who == null || enters[b.who] != null) continue; enters[b.who] = b.act === 'walk' || b.act === 'run' ? b : false; }
  const waitMark = (i) => { const b = enters[i], m = BRD_MARKS[i] || [0, 0, 0]; if (!b) return null; const d = b.act === 'run' ? 3.6 : 2.6; return [m[0] - Math.cos(m[2]) * d, m[1] - Math.sin(m[2]) * d, m[2]]; };
  const offAt = (i, tt) => enters[i] && enters[i].t0 == null && tt < 1e9;
  for (const g of groups) {
    const b = g.beats[0], who = b.who == null ? 0 : b.who;
    if (g.fight) {
      // the fight: CHOREO stages the blows between the people named, from their marks
      const ids = [...new Set(g.beats.flatMap(x => [x.who, x.target]).filter(x => x != null))], at = (id) => { const m = BRD_MARKS[id] || [0, 0, 0]; return [m[0] * (id === 1 ? 0.955 : 1), m[1]]; };
      const fighters = [0, 1, 2].slice(0, n).map(id => ({ name: (sc.chars[id] || { name: 'P' + id }).name, at: at(id) }));
      let tt = 0.9; const ex = g.beats.map(x => { const m = CHO_MOVES[x.act] || CHO_MOVES.cross; tt += m.t[0]; const e = { t: tt, a: x.who == null ? 0 : x.who, move: CHO_MOVES[x.act] ? x.act : 'cross', b: x.target == null ? 1 : x.target, def: x.def || null, beat: x.i }; tt += m.t[1] + m.t[2] + 0.35; return e; });
      const F = choFight({ fighters: fighters, ex: ex, steps: [], dur: tt + 0.9, camSide: 1 }); choPerf(F);
      for (const e of ex) { const x = sc.beats[e.beat]; x.t0 = t + e.t - (CHO_MOVES[e.move].t[0] + 0.3); x.t1 = t + e.t + CHO_MOVES[e.move].t[1] + CHO_MOVES[e.move].t[2]; x.peak = t + e.t; }
      const last = ex[ex.length - 1]; if (CHO_MOVES[last.move].react === 'fall' && !last.def) state.fallenAfter = { who: last.b, t: t + last.t };
      segs.push({ t0: t, dur: F.dur, kind: 'fight', F: F, poses: (tl) => F.fighters.map((_, i) => choPose(F, i, tl)) }); t += F.dur; continue;
    }
    const segAt = (dur, fn, things) => { segs.push({ t0: t, dur: dur, kind: b.act, beat: b, poses: fn, things: things }); b.t0 = t; b.t1 = t + dur; t += dur; };
    const fallenNow = Object.assign({}, state.fallen), waiting = {}; for (const k in enters) if (enters[k] && enters[k].t0 == null && enters[k] !== b) waiting[k] = waitMark(+k);
    const idle = (i, tt, o2) => brdIdle(i, tt, Object.assign({ fallen: fallenNow[i] ? 1 : null, mark: waiting[i] || null }, o2));
    if (b.act === 'walk' || b.act === 'run') {
      const m = BRD_MARKS[who] || [0, 0, 0], v = b.act === 'run' ? 2.4 : 1.087, dist = b.act === 'run' ? 3.6 : 2.6, dur = dist / v, fwd = [Math.cos(m[2]), Math.sin(m[2])], clip = LG_ANIM_BY[b.act === 'run' ? 'run' : 'walk_tac'];
      const t00 = t; segAt(dur + 0.5, (tl) => [0, 1, 2].slice(0, n).map(i => { if (i !== who) return idle(i, t00 + tl, { look: 0.2 }); const P = lgPose(); lgPoseReset(P); const k = Math.min(1, tl / dur), d = dist * (1 - k); if (tl < dur) { lgEvalClip(clip, tl, P, { inPlace: true }); } else lgBase(P, {}); P.root = [m[0] - fwd[0] * d, m[1] - fwd[1] * d, 0, m[2]]; return P; }));
    } else if (b.act === 'pick' || b.act === 'drink' || b.act === 'put') {
      const key = b.thing || 'mug', ob = LGO_OBJ[key] && !LGO_OBJ[key].two ? key : 'mug', m = BRD_MARKS[who];
      const pf = lgmReach({ key: ob, at: [m[0] + 0.3 * Math.cos(m[2]) + 0.47 * Math.sin(m[2]), m[1] + 0.3 * Math.sin(m[2]) - 0.47 * Math.cos(m[2]), 0.743], yaw: m[2] - 0.4, side: 'R', lift: 0.14, root: [m[0], m[1], 0, m[2]], effort: b.effort || undefined, carry: b.act === 'drink' ? [0.16, 0.05, 1.46] : null, hold: 0.4 });
      state.holds[who] = ob; let W0 = null;
      const t00 = t; segAt(pf.dur, (tl) => [0, 1, 2].slice(0, n).map(i => { if (i !== who) return idle(i, t00 + tl, { look: 0.25 }); const r = pf.at(tl, W0); return r.P; }), (tl) => pf.at(tl, null).things);
      if (!C0.set.some(x => x.key === 'table')) { const ta = [m[0] + 0.35 * Math.cos(m[2]) + 0.77 * Math.sin(m[2]), m[1] + 0.35 * Math.sin(m[2]) - 0.77 * Math.cos(m[2])]; C0.set.push({ key: 'table', M: lgMul(lgM4(), lgTR(ta[0], ta[1], 0), lgRot(lgM4(), 0, 0, m[2])) }); }
    } else if (b.act === 'give') {
      const key = state.holds[who] || b.thing || 'bottle', pf = lgmHandover({ key: LGO_OBJ[key] ? key : 'bottle' }); state.holds[b.target == null ? 1 - who : b.target] = key; delete state.holds[who];
      const t00 = t; segAt(pf.dur, (tl) => { const r = pf.at(tl); const Ps = r.Ps.slice(); if (n > 2) Ps.push(idle(2, t00 + tl, { look: 0 })); return Ps; }, (tl) => pf.at(tl).things);
    } else if (b.act === 'throw') {
      const m = BRD_MARKS[who]; if (!LGM.relT) lgmLearnThrow(18); const pf = lgmThrow({ root: [m[0], m[1], 0, m[2] + 0.9] });
      const t00 = t; segAt(pf.dur, (tl) => [0, 1, 2].slice(0, n).map(i => i === who ? pf.at(tl, null).P : idle(i, t00 + tl, { look: 0.6 })));
    } else if (b.act === 'fall') {
      const t00 = t; segAt(1.6, (tl) => [0, 1, 2].slice(0, n).map(i => idle(i, t00 + tl, i === who ? { fallen: Math.min(1, tl / 1.3) } : { look: 0.3 })));
      state.fallen[who] = true;
    } else {
      const dur = b.dur || 2, t00 = t; segAt(dur, (tl) => [0, 1, 2].slice(0, n).map(i => idle(i, t00 + tl, { talk: b.kind === 'talk' && i === who, look: i === who ? 0.05 : 0.1 })));
    }
  }
  return { segs: segs, dur: t, n: n, sc: sc, table: table, set: C0.set };
}
// the compiled scene as one performance: each moment from its segment, a quarter second of blend across each change of segment
function brdPerf(C) {
  const segAt = (t) => { let s = C.segs[0]; for (const q of C.segs) if (t >= q.t0) s = q; return s; };
  const at = (t) => {
    const s = segAt(t), tl = clamp(t - s.t0, 0, s.dur), Ps = s.poses(tl), k = s.t0 > 0 ? (t - s.t0) / 0.25 : 1;
    let Ws = null;
    if (k < 1) { const ps = segAt(s.t0 - 1e-4), Pp = ps.poses(ps.dur); Ws = Ps.map((P, i) => { const a = brdSolveL(Pp[i] || P), b = brdSolveL(P), e = k * k * (3 - 2 * k), L = lgLocalNew(); lgBlendL(a.L, b.L, e, L); const root = a.root.map((v, j) => v + (b.root[j] - v) * e), W = lgWorldNew(); return lgWorldAll(W, L, lgRootM({ root: root })); }); }
    const things = (s.things ? s.things(tl) : []).concat(C.set || []);
    return { Ps: Ps, Ws: Ws, things: things };
  };
  const beats = C.sc.beats.filter(b => b.t0 != null).map(b => ({ t: b.t0, name: (C.sc.chars[b.who] || { name: '' }).name + ' ' + b.verb }));
  return lgmPerf({ kind: 'scene', dur: C.dur, beats: beats, at: at, C: C, selfSolved: true });
}
// the director's beats from the board (who, what kind, where the movement peaks)
function brdDirBeats(C) {
  return C.sc.beats.filter(b => b.t0 != null).map(b => ({ t0: b.t0, t1: b.t1, who: Math.min(1, b.who == null ? 0 : b.who), kind: b.kind === 'handle' ? 'handle' : b.kind === 'talk' || b.kind === 'emotion' ? 'emotion' : 'action', focus: b.kind === 'handle' ? 'hands' : b.kind === 'talk' || b.kind === 'emotion' ? 'face' : 'body', hand: 'R', peak: b.peak, what: b.text }));
}
/* ---------- the board: the scene read, compiled, performed, and its shots framed ---------- */
function brdBoard(text, o) {
  o = o || {}; const sc = brdRead(text), C = brdCompile(sc), perf = brdPerf(C), run = lgmRun(perf, o.fps || 24), shots = brdShotList(sc);
  const B = { sc: sc, C: C, perf: perf, run: run, shots: shots, side: 1, fps: o.fps || 24 }; brdTime(B); brdFrameAll(B); return B;
}
// the bones of everyone at a moment (from the baked performance)
function brdW(B, t) { const f = B.run.frames[clamp(Math.round(t * B.run.fps), 0, B.run.frames.length - 1)]; return f; }
// each shot's place in time: the establishing shot opens, every beat's shots share its time
function brdTime(B) {
  let t = 0; const byBeat = {};
  for (const sh of B.shots) (byBeat[sh.beat] = byBeat[sh.beat] || []).push(sh);
  const est = byBeat[-1] || []; for (const sh of est) { sh.t0 = 0; sh.t1 = Math.min(sh.len, B.C.dur); }
  for (const b of B.sc.beats) { const list = byBeat[b.i] || []; if (b.t0 == null) continue; const tot = list.reduce((a, s) => a + s.len, 0) || 1; let u = b.t0; for (const sh of list) { const len = (b.t1 - b.t0) * sh.len / tot; sh.t0 = u; sh.t1 = u + len; u += len; } }
  // the establishing shot holds until the first beat starts
  if (est.length) { const first = B.shots.find(s => s.beat >= 0 && s.t0 != null); est[0].t1 = first ? Math.max(0.8, first.t0) : est[0].t1; if (first && first.t0 < est[0].t1) first.t0 = est[0].t1; }
  // no gaps: each shot runs until the next begins, the last to the end of the scene
  const timed = B.shots.filter(s => s.t0 != null); timed.forEach((s, i) => { const nx = timed[i + 1]; if (nx && nx.t0 > s.t1) s.t1 = nx.t0; if (!nx) s.t1 = Math.max(s.t1, B.C.dur); });
}
// MIMATIC frames every planned shot: size and lens from the plan, the camera on the board's side of the line of action
function brdLine(B, t) { const f = brdW(B, t), a = mimvMark(f.W[0], 'eyes'), b = f.W[1] ? mimvMark(f.W[1], 'eyes') : curV3.add(a, [1, 0, 0]); return { p: a, d: curV3.norm([b[0] - a[0], b[1] - a[1], 0]) }; }
function brdFrame(B, sh) {
  const tm = (sh.t0 + sh.t1) / 2, f = brdW(B, tm), beat = B.sc.beats[sh.beat], who = beat && beat.who != null ? Math.min(B.C.n - 1, beat.who) : 0, W = f.W[who], other = f.W[who === 0 ? 1 : 0], line = brdLine(B, tm);
  const side = (az) => { const fc = mimvFacing(W); for (const a of [az, -az]) { const e = curV3.add(mimvMark(W, 'eyes'), [Math.cos(fc + a) * 3, Math.sin(fc + a) * 3, 0]); if (mimdSide(line, e) === B.side) return a; } return az; };
  let cam;
  if (sh.type === 'master') { const mid = curV3.lerp(mimvMark(f.W[0], 'eyes'), mimvMark(other || f.W[0], 'eyes'), 0.5), nrm = [-line.d[1] * B.side, line.d[0] * B.side, 0]; cam = lgCam(); mimcToCam(cam, mimcBody({ f: sh.lens })); const D = sh.size === 'EWS' ? 9 : sh.size === 'WS' ? 6 : 4.2; cam.eye = curV3.add(mid, curV3.add(curV3.mul(nrm, D), [0, 0, sh.size === 'EWS' ? 1.6 : 0.3])); cam.tgt = [mid[0], mid[1], mid[2] - 0.5]; }
  else if (sh.type === 'insert') { const hp = lgaP(W, 'handR'), fc = mimvFacing(W), a = fc + side(0.9); cam = lgCam(); mimcToCam(cam, mimcBody({ f: sh.lens })); cam.eye = [hp[0] + Math.cos(a) * 1.0, hp[1] + Math.sin(a) * 1.0, hp[2] + 0.3]; cam.tgt = hp.slice(); }
  else if (sh.type === 'two') { const r = mimvFrame(W, { size: sh.size, az: side(1.2), look: 'center', f: sh.lens }); cam = r.cam; }
  else { const r = mimvFrame(W, { size: sh.size, az: side(sh.size === 'CU' || sh.size === 'MCU' ? 0.55 : 0.8), f: sh.lens, blockers: other ? [other] : null }); cam = r.cam; }
  sh.cam = cam; sh.eye = cam.eye.slice(); sh.tgt = cam.tgt.slice(); sh.who = sh.type === 'master' ? -1 : who; sh.side = mimdSide(line, cam.eye); return sh;
}
function brdFrameAll(B) { for (const sh of B.shots) if (sh.t0 != null) brdFrame(B, sh); }
/* ---------- v3: panels ---------- */
// pencil: a seeded wobble, line weight by depth, hatching on the side away from the light
function brdRng(seed) { return curRng(seed); }
function brdStroke(g, pts, o) { const r = o.rng || Math.random, j = o.jit == null ? 0.6 : o.jit; g.beginPath(); pts.forEach((p, i) => { const x = p[0] + (r() - 0.5) * j, y = p[1] + (r() - 0.5) * j; if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke(); }
function brdArrow(g, a, b, o) { o = o || {}; const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hl = o.head || 9; g.beginPath(); if (o.curve) { const m = [(a[0] + b[0]) / 2 - Math.sin(ang) * o.curve, (a[1] + b[1]) / 2 + Math.cos(ang) * o.curve]; g.moveTo(a[0], a[1]); g.quadraticCurveTo(m[0], m[1], b[0], b[1]); } else { g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke(); g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(b[0] - Math.cos(ang - 0.45) * hl, b[1] - Math.sin(ang - 0.45) * hl); g.lineTo(b[0] - Math.cos(ang + 0.45) * hl, b[1] - Math.sin(ang + 0.45) * hl); g.closePath(); g.fill(); }
// a body as a pencil mannequin seen through a camera into a box (x, y, w, h); light: a world direction
function brdBody(g, W, cam, box, o) {
  o = o || {}; const asp = box.w / box.h, rng = brdRng(o.seed || 1), fpx = box.h / 2 / Math.tan(cam.fov / 2), L = o.light || [0.5, 0.4, 0.8];
  const prj = p => { const q = mimcProject(cam, p, asp); return { x: box.x + (q.x * 0.5 + 0.5) * box.w, y: box.y + (1 - (q.y * 0.5 + 0.5)) * box.h, z: q.w, front: q.front }; };
  const caps = LGQ_CAPS.map(c => { const a = lgaMark(W, c[1]), b = lgaMark(W, c[2]), A = prj(a), Bq = prj(b); return { a: a, b: b, A: A, B: Bq, r: c[3], z: (A.z + Bq.z) / 2, name: c[0] }; }).filter(c => c.A.front && c.B.front).sort((p, q) => q.z - p.z);
  const Lp = (() => { const c = lgaP(W, 'chest'), A = prj(c), Bq = prj(curV3.add(c, curV3.mul(L, 0.3))); return [Bq.x - A.x, Bq.y - A.y]; })(), lpn = Math.hypot(Lp[0], Lp[1]) || 1;
  let marks = 0;
  for (const c of caps) {
    const rp = Math.max(1.2, c.r * fpx / c.z), dx = c.B.x - c.A.x, dy = c.B.y - c.A.y, len = Math.hypot(dx, dy) || 1e-3, nx = -dy / len, ny = dx / len, wgt = clamp(2.4 * 3 / c.z, 0.6, 2.6);
    if (c.name === 'head') {
      // the head: an egg, the face's direction marked by the nose and the line of the eyes
      const hc = prj(lgPt(W.subarray(LGB.head * 16, LGB.head * 16 + 16), 0.02, 0, 0.1)), r0 = Math.max(2, 0.105 * fpx / hc.z), nz = prj(lgPt(W.subarray(LGB.head * 16, LGB.head * 16 + 16), 0.13, 0, 0.06));
      g.fillStyle = o.fill || 'rgba(244,239,228,1)'; g.strokeStyle = 'rgba(30,30,32,0.9)'; g.lineWidth = wgt; g.beginPath(); g.ellipse(hc.x, hc.y, r0 * 0.86, r0, 0, 0, TAU); g.fill(); g.stroke();
      g.lineWidth = Math.max(0.6, wgt * 0.6); brdStroke(g, [[hc.x + (nz.x - hc.x) * 0.55, hc.y + (nz.y - hc.y) * 0.55], [nz.x, nz.y]], { rng: rng, jit: 0.3 }); marks += 2; continue;
    }
    g.fillStyle = o.fill || 'rgba(244,239,228,1)'; g.strokeStyle = 'rgba(30,30,32,0.85)'; g.lineWidth = wgt;
    g.beginPath(); g.moveTo(c.A.x + nx * rp, c.A.y + ny * rp); g.lineTo(c.B.x + nx * rp, c.B.y + ny * rp); g.arc(c.B.x, c.B.y, rp, Math.atan2(ny, nx), Math.atan2(ny, nx) - Math.PI, true); g.lineTo(c.A.x - nx * rp, c.A.y - ny * rp); g.arc(c.A.x, c.A.y, rp, Math.atan2(-ny, -nx), Math.atan2(-ny, -nx) - Math.PI, true); g.closePath(); g.fill();
    brdStroke(g, [[c.A.x + nx * rp, c.A.y + ny * rp], [c.B.x + nx * rp, c.B.y + ny * rp]], { rng: rng, jit: 0.8 }); brdStroke(g, [[c.A.x - nx * rp, c.A.y - ny * rp], [c.B.x - nx * rp, c.B.y - ny * rp]], { rng: rng, jit: 0.8 }); marks += 2;
    // hatching on the shadow side (the edge facing away from the light)
    const sh = (nx * Lp[0] + ny * Lp[1]) / lpn > 0 ? -1 : 1; g.lineWidth = Math.max(0.5, wgt * 0.45); g.strokeStyle = 'rgba(40,40,44,0.55)';
    const nh = Math.max(2, Math.floor(len / 4)); for (let k = 0; k <= nh; k++) { const u = k / nh, cx = c.A.x + dx * u, cy = c.A.y + dy * u; brdStroke(g, [[cx + nx * rp * sh, cy + ny * rp * sh], [cx + nx * rp * sh * 0.35 + dx / len * 3, cy + ny * rp * sh * 0.35 + dy / len * 3]], { rng: rng, jit: 0.4 }); marks++; }
  }
  // the hands: small mitts at the ends of the forearms
  for (const sd of ['L', 'R']) { const hp = prj(lgPt(W.subarray(LGB['hand' + sd] * 16, LGB['hand' + sd] * 16 + 16), 0, 0, -0.06)); if (!hp.front) continue; const r0 = Math.max(1.5, 0.045 * fpx / hp.z); g.fillStyle = o.fill || 'rgba(244,239,228,1)'; g.strokeStyle = 'rgba(30,30,32,0.85)'; g.lineWidth = 1; g.beginPath(); g.arc(hp.x, hp.y, r0, 0, TAU); g.fill(); g.stroke(); marks++; }
  return { marks: marks, head: prj(mimvMark(W, 'eyes')), pelvis: prj(lgaP(W, 'pelvis')) };
}
// a thing (its surface points) as pencil dots and a hull
function brdThing(g, key, M, cam, box) { const pts = lgoSurfPtsB(key, 140), asp = box.w / box.h; g.fillStyle = 'rgba(30,30,32,0.75)'; for (const p of pts) { const w = lgPt(M, p[0], p[1], p[2]), q = mimcProject(cam, w, asp); if (!q.front) continue; g.fillRect(box.x + (q.x * 0.5 + 0.5) * box.w, box.y + (1 - (q.y * 0.5 + 0.5)) * box.h, 1.3, 1.3); } }
function lgoSurfPtsB(key, n) {
  const o = LGO_OBJ[key] || LGM_SET[key], out = [], rng = curRng(3); if (!o) return out;
  for (const q of o.parts) for (let i = 0; i < (n || 120) / o.parts.length; i++) {
    if (q[0] === 'cyl') { const a = rng() * TAU, z = (rng() * 2 - 1) * q[3]; out.push([q[1][0] + Math.cos(a) * q[2], q[1][1] + Math.sin(a) * q[2], q[1][2] + z]); }
    else if (q[0] === 'sph') { const u = rng() * 2 - 1, a = rng() * TAU, r = Math.sqrt(1 - u * u); out.push([q[1][0] + r * Math.cos(a) * q[2], q[1][1] + r * Math.sin(a) * q[2], q[1][2] + u * q[2]]); }
    else if (q[0] === 'box') { const f = Math.floor(rng() * 6), ax = f >> 1, sg = f & 1 ? 1 : -1, p = [0, 1, 2].map(k => k === ax ? sg * q[2][k] : (rng() * 2 - 1) * q[2][k]); out.push([q[1][0] + p[0], q[1][1] + p[1], q[1][2] + p[2]]); }
    else { const t = rng(), a = rng() * TAU; out.push([q[1][0] + (q[2][0] - q[1][0]) * t + Math.cos(a) * q[3], q[1][1] + (q[2][1] - q[1][1]) * t + Math.sin(a) * q[3], q[1][2] + (q[2][2] - q[1][2]) * t]); }
  }
  return out;
}
// the arrows a shot calls for: the camera's move (by convention) and each person's movement through the shot
function brdArrows(g, B, sh, box, cam) {
  const out = []; g.strokeStyle = 'rgba(178,34,34,0.9)'; g.fillStyle = 'rgba(178,34,34,0.9)'; g.lineWidth = 2;
  const mv = sh.move || 'static', cx = box.x + box.w / 2, cy = box.y + box.h / 2, ins = 14;
  if (mv === 'push in' || mv === 'pull out') { for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const outer = [cx + sx * (box.w / 2 - 4), cy + sy * (box.h / 2 - 4)], inner = [cx + sx * (box.w / 2 - 4 - ins * 1.8), cy + sy * (box.h / 2 - 4 - ins)]; if (mv === 'push in') brdArrow(g, outer, inner, { head: 7 }); else brdArrow(g, inner, outer, { head: 7 }); } out.push(mv); }
  else if (mv === 'pan' || mv === 'track') { const y = mv === 'pan' ? box.y + 14 : box.y + box.h - 12; brdArrow(g, [box.x + box.w * 0.2, y], [box.x + box.w * 0.8, y]); out.push(mv); }
  else if (mv === 'crane down' || mv === 'crane up') { const x = box.x + box.w - 16; brdArrow(g, [x, mv === 'crane down' ? box.y + 14 : box.y + box.h - 14], [x, mv === 'crane down' ? box.y + box.h * 0.5 : box.y + box.h * 0.5]); out.push(mv); }
  else if (mv === 'handheld') { g.beginPath(); for (let i = 0; i <= 8; i++) { const x = box.x + 10 + i * 5, y = box.y + 12 + (i % 2 ? -3 : 3); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); out.push(mv); }
  // the people's movement: where each is at the start and the end of the shot, on the picture
  g.strokeStyle = 'rgba(30,60,160,0.85)'; g.fillStyle = 'rgba(30,60,160,0.85)';
  const f0 = brdW(B, sh.t0), f1 = brdW(B, sh.t1), asp = box.w / box.h;
  f0.W.forEach((W, i) => { const a = mimcProject(cam, lgaP(W, 'pelvis'), asp), b = mimcProject(cam, lgaP(f1.W[i], 'pelvis'), asp); if (!a.front || !b.front) return; const A = [box.x + (a.x * 0.5 + 0.5) * box.w, box.y + (1 - (a.y * 0.5 + 0.5)) * box.h], Bp = [box.x + (b.x * 0.5 + 0.5) * box.w, box.y + (1 - (b.y * 0.5 + 0.5)) * box.h]; if (Math.hypot(Bp[0] - A[0], Bp[1] - A[1]) > 14) { brdArrow(g, A, Bp, { curve: 8 }); out.push('move:' + i + ':' + Math.sign(Bp[0] - A[0])); } });
  return out;
}
// one panel: the frame, the drawing at the shot's key moment, its arrows, number and caption
function brdPanel(g, B, sh, x, y, w, o) {
  o = o || {}; const h = Math.round(w / 1.85), box = { x: x, y: y, w: w, h: h }, tk = sh.key != null ? sh.key : sh.t0 + (sh.t1 - sh.t0) * 0.5, f = brdW(B, tk), cam = Object.assign(lgCam(), { eye: sh.eye.slice(), tgt: sh.tgt.slice(), fov: sh.cam.fov });
  g.save(); g.fillStyle = '#f4efe4'; g.fillRect(x, y, w, h); g.beginPath(); g.rect(x, y, w, h); g.clip();
  // the ground: a horizon line and a few receding lines
  const hz = mimcProject(cam, curV3.add(cam.eye, curV3.mul(curV3.norm([cam.tgt[0] - cam.eye[0], cam.tgt[1] - cam.eye[1], 0]), 60)), 1.85); g.strokeStyle = 'rgba(60,60,60,0.35)'; g.lineWidth = 1; const hy = y + (1 - (hz.y * 0.5 + 0.5)) * h; brdStroke(g, [[x, hy], [x + w, hy]], { rng: brdRng(sh.n), jit: 0.5 });
  const things = f.things || []; for (const th of things) brdThing(g, th.key, th.M, cam, box);
  const res = f.W.map((W, i) => brdBody(g, W, cam, box, { seed: sh.n * 7 + i, light: o.light }));
  const arrows = brdArrows(g, B, sh, box, cam); g.restore();
  g.strokeStyle = '#222'; g.lineWidth = 2; g.strokeRect(x, y, w, h);
  g.fillStyle = '#222'; g.font = 'bold 13px sans-serif'; g.fillText(String(sh.n), x + 6, y + 16);
  g.font = '11px sans-serif'; g.fillStyle = '#333'; const cap = sh.size + ' ' + sh.type + ', ' + sh.lens + ' mm, ' + sh.move + ', ' + (sh.t1 - sh.t0).toFixed(1) + ' s'; g.fillText(cap, x, y + h + 14); const d = sh.desc.length > 70 ? sh.desc.slice(0, 68) + '…' : sh.desc; g.fillStyle = '#555'; g.fillText(d, x, y + h + 28);
  return { box: box, bodies: res, arrows: arrows };
}
/* ---------- v4: the floor plan and continuity ---------- */
function brdPlan(g, B, x, y, w, h, o) {
  o = o || {}; const f0 = brdW(B, 0), fN = brdW(B, B.C.dur), pts = []; for (const W of f0.W.concat(fN.W)) pts.push(lgaP(W, 'pelvis')); for (const sh of B.shots) if (sh.eye) pts.push(sh.eye);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 3) * 1.15, sc = Math.min(w, h) / span;
  const P = p => [x + w / 2 - (p[1] - cy) * sc, y + h / 2 - (p[0] - cx) * sc];   // (x up the page, y to the left)
  g.fillStyle = '#f4efe4'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(0,0,0,0.08)'; g.lineWidth = 1; for (let k = -10; k <= 10; k++) { const a = P([cx + k, cy - 10]), b = P([cx + k, cy + 10]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); const c = P([cx - 10, cy + k]), d = P([cx + 10, cy + k]); g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.stroke(); }
  // the line of action
  const L = brdLine(B, B.C.dur * 0.5), a = P(curV3.sub(L.p, curV3.mul(L.d, 3))), b = P(curV3.add(L.p, curV3.mul(L.d, 4))); g.setLineDash([6, 5]); g.strokeStyle = 'rgba(178,34,34,0.8)'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.setLineDash([]);
  // things
  for (const th of (fN.things || []).concat(f0.things || [])) { const q = P([th.M[12], th.M[13], 0]); g.strokeStyle = '#6b4f35'; g.strokeRect(q[0] - 5, q[1] - 5, 10, 10); }
  // the people: start and end marks, the path between, the facing
  const paths = f0.W.map((_, i) => B.run.frames.filter((_, k) => k % 6 === 0).map(fr => lgaP(fr.W[i], 'pelvis')));
  const cols = ['#1f4fa3', '#2e7d32', '#8e24aa']; paths.forEach((pp, i) => { g.strokeStyle = cols[i % 3]; g.lineWidth = 1.5; g.beginPath(); pp.forEach((p, k) => { const q = P(p); if (k) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.stroke(); for (const [W, lab] of [[f0.W[i], 'start'], [fN.W[i], 'end']]) { const q = P(lgaP(W, 'pelvis')), fc = mimvFacing(W); g.fillStyle = cols[i % 3]; g.beginPath(); g.arc(q[0], q[1], 7, 0, TAU); g.fill(); const n2 = P(curV3.add(lgaP(W, 'pelvis'), [Math.cos(fc) * 0.4, Math.sin(fc) * 0.4, 0])); g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(n2[0], n2[1]); g.stroke(); } g.fillStyle = '#222'; g.font = '11px sans-serif'; const q = P(lgaP(f0.W[i], 'pelvis')); g.fillText(B.sc.chars[i] ? B.sc.chars[i].name : 'P' + i, q[0] + 9, q[1] - 6); });
  // cameras: a body and its field of view, numbered by shot
  const cams = [];
  for (const sh of B.shots) { if (!sh.eye) continue; const e = P(sh.eye), dir = Math.atan2(sh.tgt[1] - sh.eye[1], sh.tgt[0] - sh.eye[0]), hf = mimcAOV(sh.lens, 's35', 1.85).h / 2, len = 1.2, l1 = P(curV3.add(sh.eye, [Math.cos(dir + hf) * len, Math.sin(dir + hf) * len, 0])), l2 = P(curV3.add(sh.eye, [Math.cos(dir - hf) * len, Math.sin(dir - hf) * len, 0]));
    g.fillStyle = 'rgba(30,30,30,0.08)'; g.strokeStyle = 'rgba(30,30,30,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(e[0], e[1]); g.lineTo(l1[0], l1[1]); g.lineTo(l2[0], l2[1]); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#222'; g.fillRect(e[0] - 4, e[1] - 4, 8, 8); g.font = 'bold 10px sans-serif'; g.fillText(String(sh.n), e[0] + 6, e[1] + 4); cams.push({ n: sh.n, at: e, fov: hf * 2 }); }
  return { cams: cams, scale: sc };
}
// continuity: the 180-degree rule, screen direction and eyelines from shot to shot
function brdCheck(B) {
  const faults = [], cut = B.shots.filter(s => s.eye);
  for (let i = 1; i < cut.length; i++) { const a = cut[i - 1], b = cut[i]; if (a.side !== b.side) faults.push({ n: b.n, rule: '180', what: 'the camera crosses the line of action' }); }
  // screen direction: a person moving through consecutive shots keeps moving the same way across the picture
  for (let i = 1; i < cut.length; i++) { const a = cut[i - 1], b = cut[i]; for (let p = 0; p < B.C.n; p++) { const dir = (sh) => { const f0 = brdW(B, sh.t0), f1 = brdW(B, sh.t1), a0 = lgaP(f0.W[p], 'pelvis'), a1 = lgaP(f1.W[p], 'pelvis'); if (Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) < 0.4) return 0; const cam = Object.assign(lgCam(), { eye: sh.eye, tgt: sh.tgt, fov: sh.cam.fov }), q0 = mimcProject(cam, a0, 1.85), q1 = mimcProject(cam, a1, 1.85), d = q1.x - q0.x; return Math.abs(d) > 0.08 && q0.front && q1.front ? Math.sign(d) : 0; }; const da = dir(a), db = dir(b); if (da && db && da !== db) faults.push({ n: b.n, rule: 'screen direction', what: (B.sc.chars[p] || {}).name + ' reverses across the cut' }); } }
  // eyelines: two singles of the two people in turn look in opposite directions across the picture
  for (let i = 1; i < cut.length; i++) { const a = cut[i - 1], b = cut[i]; if (a.type !== 'single' || b.type !== 'single' || a.who === b.who || a.who < 0 || b.who < 0) continue; const look = (sh) => { const f = brdW(B, (sh.t0 + sh.t1) / 2), W = f.W[sh.who], cam = Object.assign(lgCam(), { eye: sh.eye, tgt: sh.tgt, fov: sh.cam.fov }), e = mimvMark(W, 'eyes'), fc = mimvFacing(W), q0 = mimcProject(cam, e, 1.85), q1 = mimcProject(cam, curV3.add(e, [Math.cos(fc) * 0.3, Math.sin(fc) * 0.3, 0]), 1.85); return Math.sign(q1.x - q0.x); }; if (look(a) === look(b) && look(a) !== 0) faults.push({ n: b.n, rule: 'eyeline', what: 'both look the same way across the picture' }); }
  return faults;
}
/* ---------- v5: revisions and the animatic ---------- */
// a director's note: "make 3 a close-up", "add an insert of the bottle after 4", "cut 6", "make 2 longer", "flip to the other side"
const BRD_SIZE_WORDS = { 'extreme close-up': 'ECU', 'extreme close up': 'ECU', 'close-up': 'CU', 'close up': 'CU', 'medium close-up': 'MCU', 'medium close up': 'MCU', 'medium shot': 'MS', 'medium': 'MS', 'cowboy': 'MLS', 'medium long': 'MLS', 'full shot': 'FS', 'wide shot': 'WS', 'wide': 'WS', 'extreme wide': 'EWS' };
function brdRevise(B, note) {
  const n = note.toLowerCase(), num = (n.match(/(?:shot\s*)?(\d+)/) || [])[1], k = num ? +num : null, sh = k ? B.shots.find(s => s.n === k) : null, before = JSON.stringify(B.shots.map(s => [s.n, s.size, s.lens, s.type, s.len, s.eye]));
  let did = null;
  const sizeWord = Object.keys(BRD_SIZE_WORDS).sort((a, b) => b.length - a.length).find(w => n.indexOf(w) >= 0);
  if (/\bflip\b|other side/.test(n)) { B.side = -B.side; brdFrameAll(B); did = 'flipped the coverage to the other side of the line'; }
  else if (/\binsert\b/.test(n) && /\badd\b/.test(n)) { const thing = Object.keys(BRD_THINGS).find(w => n.indexOf(w) >= 0) || 'hands', at = k || B.shots.length, base = B.shots.find(s => s.n === at) || B.shots[B.shots.length - 1], ns = { n: at + 1, scene: 1, beat: base.beat, desc: 'Insert: the ' + thing, size: 'ECU', type: 'insert', move: 'push in', lens: 85, len: 1.2, cast: base.cast, t0: base.t1 - Math.min(1.2, (base.t1 - base.t0) / 2), t1: base.t1 }; base.t1 = ns.t0; B.shots.splice(B.shots.indexOf(base) + 1, 0, ns); B.shots.forEach((s, i) => s.n = i + 1); brdFrame(B, ns); did = 'added an insert of the ' + thing + ' after ' + at; }
  else if (/\b(cut|drop|remove|lose)\b/.test(n) && sh) { const i = B.shots.indexOf(sh), prev = B.shots[i - 1], next = B.shots[i + 1]; if (prev) prev.t1 = sh.t1; else if (next) next.t0 = sh.t0; B.shots.splice(i, 1); B.shots.forEach((s, j) => s.n = j + 1); did = 'cut shot ' + k; }
  else if (sizeWord && sh) { sh.size = BRD_SIZE_WORDS[sizeWord]; sh.lens = (MIMV_SIZES[sh.size] || { lens: sh.lens }).lens; if (sh.type === 'master' && sh.size !== 'WS' && sh.size !== 'EWS') sh.type = 'single'; brdFrame(B, sh); did = 'made shot ' + k + ' a ' + MIMV_SIZES[sh.size].name.toLowerCase(); }
  else if (/longer|shorter/.test(n) && sh) { const d = (+(n.match(/by\s+([\d.]+)/) || [])[1] || 0.5) * (/shorter/.test(n) ? -1 : 1), i = B.shots.indexOf(sh), next = B.shots[i + 1]; sh.t1 += d; if (next) next.t0 += d; did = 'made shot ' + k + (d > 0 ? ' longer' : ' shorter') + ' by ' + Math.abs(d) + ' s'; }
  return { did: did, changed: did ? B.shots.map(s => s.n) : [], before: before };
}
// the animatic: each panel held for its shot's time, the camera's move played as a move across the drawing
function brdAnimatic(B) {
  return B.shots.filter(s => s.t0 != null).map(s => ({ n: s.n, t0: s.t0, t1: s.t1, from: s.move === 'push in' ? { s: 1, x: 0, y: 0 } : s.move === 'pull out' ? { s: 1.18, x: 0, y: 0 } : s.move === 'pan' ? { s: 1.12, x: -0.05, y: 0 } : { s: 1, x: 0, y: 0 }, to: s.move === 'push in' ? { s: 1.18, x: 0, y: 0 } : s.move === 'pull out' ? { s: 1, x: 0, y: 0 } : s.move === 'pan' ? { s: 1.12, x: 0.05, y: 0 } : s.move === 'handheld' ? { s: 1.02, x: 0.005, y: -0.004 } : { s: 1, x: 0, y: 0 } }));
}
