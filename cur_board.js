/* ================= BOARD's course (1.9.995): reading, the shot list, panels, floor plans and continuity, style and revisions ================= */
curCourse('BOARD', { title: 'BOARD: the storyboard artist', role: 'Reads a written scene, plans its shots, draws the board and the floor plan, keeps continuity, takes notes, and stages the scene for the other engines.', intro: 'A new engine: from a page of prose to a board a crew could shoot from.' });
const CUR_BRD_SCENES = [
  { text: 'INT. GYM - NIGHT. JACK circles. Leo jabs. Jack slips and hits back with an uppercut. Leo kicks him. Jack falls.', want: [['Leo', 'jab', null, 'Jack', 'slip'], ['Jack', 'uppercut', null, 'Leo', null], ['Leo', 'frontKick', null, 'Jack', null], ['Jack', 'fall', null, null, null]] },
  { text: 'EXT. PARK - DAY. ANNA walks up to Tom. She hands him a bottle. "Thanks," Tom says. He drinks.', want: [['Anna', 'walk', null, 'Tom', null], ['Anna', 'give', 'bottle', 'Tom', null], ['Tom', 'talk', null, null, null], ['Tom', 'drink', null, null, null]] },
  { text: 'EXT. YARD - DUSK. The boy picks up the ball. He throws the ball to his father. The father smiles.', want: [['boy', 'pick', 'ball', null, null], ['boy', 'throw', 'ball', 'father', null], ['father', 'react', null, null, null]] },
  { text: 'EXT. ALLEY - NIGHT. Rain falls through the neon.\nMAYA walks in and stops by the table. She picks up the mug. A stranger steps out of the shadows. "You lost?" he asks. Maya hands him the mug. The stranger throws a punch. Maya blocks and hits back with a cross. He swings a hook; she ducks. She kicks him in the stomach. He falls.', want: [['Maya', 'walk', null, null, null], ['Maya', 'pick', 'mug', null, null], ['stranger', 'walk', null, null, null], ['stranger', 'talk', null, null, null], ['Maya', 'give', 'mug', 'stranger', null], ['stranger', 'cross', null, 'Maya', 'block'], ['Maya', 'cross', null, 'stranger', null], ['stranger', 'hook', null, 'Maya', 'duck'], ['Maya', 'frontKick', null, 'stranger', null], ['stranger', 'fall', null, null, null]] }
];
let CUR_BRD = null;
function curBrdBoard() { if (!CUR_BRD) CUR_BRD = brdBoard(CUR_BRD_SCENES[3].text, { fps: 24 }); return CUR_BRD; }
curLevel('BOARD', {
  v: 1, title: 'Reading a scene', focus: 'From prose to beats: the heading, the people, what each does, to whom, with what, and how.',
  studied: [
    { topic: 'The screenplay page', facts: ['The scene heading: INT. or EXT., the place, the time of day', 'Action lines in the present tense; dialogue under the speaker; a character\'s name in capitals when they first appear', 'A beat is a unit of action or feeling: what changes'], src: [['The Hollywood Standard (Riley), screenplay format', 'https://www.mwp.com/product/the-hollywood-standard-3rd-edition/'], ['StudioBinder: how to write a scene heading', 'https://www.studiobinder.com/blog/how-to-write-a-scene-heading/']] },
    { topic: 'Following the people', facts: ['Pronouns go back to the person they name (he, she, him, her); a description ("a stranger") is a person until named', 'A defence ("she ducks") answers the blow before it', 'Adverbs carry the manner (slowly, angrily), which Laban\'s efforts can play'], src: [['Jurafsky and Martin, Speech and Language Processing: coreference', 'https://web.stanford.edu/~jurafsky/slp3/']] }
  ],
  can: ['Scene headings, weather and light; the people (named, described, pronouns); walking, running, picking up, putting down, handing over, throwing, drinking, talking, looking, reacting, every blow and defence of a fight', 'The things handled and the manner'],
  exam: X => {
    let got = 0, tot = 0; const fails = [];
    for (const S of CUR_BRD_SCENES) {
      const sc = brdRead(S.text), nm = id => id == null ? null : (sc.chars[id] || {}).name;
      S.want.forEach((w, k) => { tot++; const b = sc.beats[k]; const ok = b && nm(b.who) && nm(b.who).toLowerCase() === w[0].toLowerCase() && b.act === w[1] && (w[2] == null || b.thing === w[2]) && (w[3] == null || (nm(b.target) || '').toLowerCase() === w[3].toLowerCase()) && (w[4] == null || b.def === w[4]); if (ok) got++; else fails.push(w.join(' ')); });
      X.ok('beats found in "' + S.text.slice(0, 28) + '..."', sc.beats.length === S.want.length, sc.beats.length, S.want.length);
    }
    X.within('beats read right (who, what, with what, to whom, the defence; %)', got / tot * 100, 95, 100, '%');
    if (fails.length) X.note('missed: ' + fails.join('; '));
    const sc = brdRead(CUR_BRD_SCENES[3].text); X.ok('the heading, the place and the time', sc.heading === 'EXT. ALLEY - NIGHT' && sc.place === 'ALLEY' && sc.time === 'NIGHT' && sc.inside === false, sc.heading, 'EXT. ALLEY - NIGHT');
    X.ok('weather and light', sc.weather.join(',') === 'rain,neon', sc.weather.join(', '), 'rain, neon');
    X.ok('two people (one named twice, one described)', sc.chars.length === 2, sc.chars.map(c => c.name).join(', '), 'Maya, stranger');
    X.ok('the manner read as an effort ("slowly" -> glide)', brdRead('INT. ROOM - DAY. KIM slowly picks up the pen.').beats[0].effort === 'glide', brdRead('INT. ROOM - DAY. KIM slowly picks up the pen.').beats[0].effort, 'glide');
  }
});
curLevel('BOARD', {
  v: 2, title: 'The shot list', focus: 'Every beat planned as shots, with the fields a production works from.',
  studied: [
    { topic: 'Shot lists', facts: ['Fields: shot number, scene, description, size, type (single, two, over, insert, master), movement, lens, length, cast, notes', 'Open wide to establish; close for feeling; inserts for what the hands do; fights in short shots, often handheld'], src: [['StudioBinder: how to make a shot list', 'https://www.studiobinder.com/blog/how-to-make-a-shot-list/'], ['Katz 1991, Film Directing Shot by Shot', 'https://mwp.com/product/film-directing-shot-by-shot-25th-anniversary-edition/']] }
  ],
  can: ['A shot list for any scene it reads: sizes, types, moves, lenses and lengths from the beats, the timing from what the engines know of each action'],
  exam: X => {
    const sc = brdRead(CUR_BRD_SCENES[3].text), shots = brdShotList(sc);
    X.ok('it opens on an establishing shot', shots[0].type === 'master' && (shots[0].size === 'EWS' || shots[0].size === 'WS'), shots[0].size + ' ' + shots[0].type, 'a wide master');
    X.ok('every beat has a shot', sc.beats.every(b => shots.some(s => s.beat === b.i)), shots.length + ' shots for ' + sc.beats.length + ' beats', 'all');
    X.ok('handling gets an insert of the hands', sc.beats.filter(b => b.kind === 'handle').every(b => shots.some(s => s.beat === b.i && s.type === 'insert')), 'checked', 'every one');
    X.ok('talk and feeling are close (MCU or CU)', sc.beats.filter(b => b.kind === 'talk' || b.kind === 'emotion').every(b => shots.some(s => s.beat === b.i && (s.size === 'MCU' || s.size === 'CU'))), 'checked', 'every one');
    X.ok('the fight is handheld', sc.beats.filter(b => b.kind === 'fight').every(b => shots.some(s => s.beat === b.i && s.move === 'handheld')), 'checked', 'every exchange');
    const beatT = sc.beats.reduce((a, b) => a + b.dur, 0), shotT = shots.filter(s => s.beat >= 0).reduce((a, s) => a + s.len, 0);
    X.within('the shots\' lengths add up to the beats\' (%)', Math.abs(shotT / beatT - 1) * 100, 0, 10, '%');
    X.ok('every shot has its fields', shots.every(s => s.n && s.desc && s.size && s.type && s.move && s.lens && s.len > 0), 'all fields', 'complete');
  }
});
curLevel('BOARD', {
  v: 3, title: 'Panels', focus: 'Each shot drawn from MIMATIC\'s camera with the people as LEGEND performs them, and the arrows a board uses.',
  studied: [
    { topic: 'Storyboard drawing', facts: ['Frame lines at the film\'s aspect; the figures where the camera sees them', 'Arrows: a figure\'s movement inside the frame; the camera\'s move outside or on the frame (push in: arrows into the corners; pan or track: an arrow across; crane: up or down)', 'A number and a caption for each panel'], src: [['Begleiter 2010, From Word to Image', 'https://mwp.com/product/from-word-to-image-2nd-edition/'], ['StudioBinder: storyboard arrows', 'https://www.studiobinder.com/blog/how-to-make-a-storyboard/']] }
  ],
  can: ['A board of pencil panels: bodies posed from the performance, things where they are, camera and figure arrows, numbers and captions'],
  exam: X => {
    const B = curBrdBoard(), shots = B.shots.filter(s => s.eye), cv = typeof document !== 'undefined' ? document.createElement('canvas') : null; if (!cv) { X.ok('a canvas to draw on', false, 'none', 'canvas'); return; }
    cv.width = 340; cv.height = 240; const g = cv.getContext('2d'); let drawn = 0, camArrows = 0, wantCam = 0, moveArrows = 0, wantMove = 0;
    for (const sh of shots) {
      const r = brdPanel(g, B, sh, 10, 10, 300); if (r.bodies.some(b => b.marks > 0)) drawn++;
      if (sh.move !== 'static') { wantCam++; if (r.arrows.indexOf(sh.move) >= 0) camArrows++; }
      // someone crossing the frame by a good margin must get an arrow
      const f0 = brdW(B, sh.t0), f1 = brdW(B, sh.t1), cam = Object.assign(lgCam(), { eye: sh.eye, tgt: sh.tgt, fov: sh.cam.fov });
      f0.W.forEach((W, i) => { const a = mimcProject(cam, lgaP(W, 'pelvis'), 1.85), b = mimcProject(cam, lgaP(f1.W[i], 'pelvis'), 1.85); if (a.front && b.front && Math.hypot((b.x - a.x) * 150, (b.y - a.y) * 81) > 20) { wantMove++; if (r.arrows.some(x => x.indexOf('move:' + i) === 0)) moveArrows++; } });
    }
    X.ok('a panel for every shot, with the people drawn', drawn === shots.length, drawn + ' of ' + shots.length, 'all');
    X.ok('camera moves marked by convention', camArrows === wantCam, camArrows + ' of ' + wantCam, 'all');
    X.ok('figures that move get their arrow', moveArrows === wantMove, moveArrows + ' of ' + wantMove, 'all');
    let worst = 0; for (const sh of shots) { if (sh.type !== 'single' || !['CU', 'MCU', 'MS'].includes(sh.size)) continue; const f = brdW(B, (sh.t0 + sh.t1) / 2), cam = Object.assign(lgCam(), { eye: sh.eye, tgt: sh.tgt, fov: sh.cam.fov }), e = mimcProject(cam, mimvMark(f.W[sh.who], 'eyes'), 1.85); worst = Math.max(worst, Math.abs(e.y - 1 / 3)); }
    X.within('singles: the eyes on the upper third at the shot\'s middle (worst, % of the frame)', worst * 50, 0, 3, '%');
    X.ev.panels = shots.length;
  }
});
curLevel('BOARD', {
  v: 4, title: 'Floor plans and continuity', focus: 'The set from above with the marks, paths and cameras, and the continuity checked across every cut.',
  studied: [
    { topic: 'Floor plans', facts: ['The set from above: the actors\' start and end marks, their paths, each camera with its number and its field of view, the line of action', 'A field of view drawn at the lens\'s angle of view'], src: [['StudioBinder: shot list and floor plan (the overhead)', 'https://www.studiobinder.com/blog/what-is-a-floor-plan-in-film/']] },
    { topic: 'Continuity', facts: ['The 180-degree rule', 'Screen direction: what moves left to right keeps moving left to right across a cut', 'Eyelines: in shot and reverse shot, the two look in opposite directions across the frame'], src: [['Bordwell and Thompson, Film Art: continuity editing', 'https://en.wikipedia.org/wiki/Continuity_editing']] }
  ],
  can: ['A floor plan of any board', 'Continuity checks that find a camera across the line, a reversed screen direction or mismatched eyelines'],
  exam: X => {
    const B = curBrdBoard(), cv = document.createElement('canvas'); cv.width = 700; cv.height = 420; const g = cv.getContext('2d'), plan = brdPlan(g, B, 0, 0, 700, 420), shots = B.shots.filter(s => s.eye);
    X.ok('every camera on the plan', plan.cams.length === shots.length, plan.cams.length + ' cameras', shots.length);
    X.ok('fields of view drawn at the lens\'s angle', plan.cams.every((c, i) => Math.abs(c.fov - mimcAOV(shots[i].lens, 's35', 1.85).h) < 1e-6), 'checked', 'all');
    const faults = brdCheck(B); X.ok('the board keeps continuity', faults.length === 0, faults.length ? faults.map(f => f.n + ': ' + f.rule).join(', ') : 'no faults', 'no faults');
    // the checker itself: a board with one camera thrown across the line must be caught
    const k = shots.findIndex(s => s.type === 'single' && s.n > 3), sh = shots[k], line = brdLine(B, (sh.t0 + sh.t1) / 2), keep = { eye: sh.eye, side: sh.side };
    const v = curV3.sub(sh.eye, line.p), along = curV3.mul(line.d, curV3.dot(v, line.d)), perp = curV3.sub(v, along); sh.eye = curV3.add(line.p, curV3.sub(along, perp)); sh.eye[2] = keep.eye[2]; sh.side = mimdSide(line, sh.eye);
    const caught = brdCheck(B).some(f => f.rule === '180'); sh.eye = keep.eye; sh.side = keep.side;
    X.ok('a camera thrown across the line is caught', caught, caught ? 'caught' : 'missed', 'caught');
  }
});
curLevel('BOARD', {
  v: 5, title: 'Style, revisions and the animatic', focus: 'A pencil look, a director\'s notes taken without disturbing the rest, and the board timed to the cut.',
  studied: [
    { topic: 'The look of a board', facts: ['Pencil: line weight falls with distance; hatching on the shadow side gives the light', 'Simple mannequins read faster than detailed figures'], src: [['Hart 2008, The Art of the Storyboard', 'https://www.routledge.com/The-Art-of-the-Storyboard/Hart/p/book/9780240809601']] },
    { topic: 'Notes and animatics', facts: ['A note changes what it names and nothing else; continuity holds after it', 'The animatic: the panels timed to the shots\' lengths, camera moves played across them'], src: [['StudioBinder: what is an animatic', 'https://www.studiobinder.com/blog/what-is-an-animatic-definition/']] }
  ],
  can: ['Takes notes like "make 6 a close-up", "add an insert of the mug after 3", "cut 5", "make 2 longer by 0.5", "flip to the other side"', 'Times the board into an animatic'],
  exam: X => {
    const B = curBrdBoard(), snap = () => B.shots.map(s => JSON.stringify([s.n, s.size, s.lens, s.type, s.move, s.eye && s.eye.map(v => +v.toFixed(3)), +(s.t0 || 0).toFixed(3), +(s.t1 || 0).toFixed(3)]));
    const save = JSON.parse(JSON.stringify(B.shots.map(s => Object.assign({}, s, { cam: null })))), camSave = B.shots.map(s => s.cam), sideSave = B.side;
    try {
      let s0 = snap(), r = brdRevise(B, 'make 6 a close-up'), s1 = snap();
      X.ok('"make 6 a close-up": shot 6 becomes a close-up on an 85', B.shots[5].size === 'CU' && B.shots[5].lens === 85, B.shots[5].size + ' ' + B.shots[5].lens + ' mm', 'CU 85 mm');
      X.ok('...and nothing else changes', s0.every((x, i) => i === 5 || x === s1[i]), s0.filter((x, i) => i !== 5 && x !== s1[i]).length + ' others changed', 0);
      const n0 = B.shots.length; r = brdRevise(B, 'add an insert of the mug after 3'); X.ok('"add an insert of the mug after 3"', B.shots.length === n0 + 1 && B.shots[3].type === 'insert' && /mug/.test(B.shots[3].desc), B.shots[3].desc, 'Insert: the mug as shot 4');
      const n1 = B.shots.length; r = brdRevise(B, 'cut 5'); let cont = true; for (let i = 1; i < B.shots.length; i++) if (B.shots[i].t0 != null && B.shots[i - 1].t1 != null && B.shots[i].t0 + 1e-6 < B.shots[i - 1].t1 - 0.65) cont = false;
      X.ok('"cut 5": one fewer, and the time it held goes to its neighbour', B.shots.length === n1 - 1 && cont, B.shots.length + ' shots', n1 - 1);
      const l2 = B.shots[1].t1 - B.shots[1].t0; r = brdRevise(B, 'make 2 longer by 0.5'); X.near('"make 2 longer by 0.5"', B.shots[1].t1 - B.shots[1].t0 - l2, 0.5, 1e-6, ' s');
      const sides = B.shots.filter(s => s.eye).map(s => s.side); r = brdRevise(B, 'flip to the other side'); X.ok('"flip to the other side": every camera across, continuity kept', B.shots.filter(s => s.eye).every((s, i) => s.side === -sides[i]) && brdCheck(B).filter(f => f.rule === '180').length === 0, 'flipped', 'all, no faults');
      const an = brdAnimatic(B), tot = an.reduce((a, s) => a + (s.t1 - s.t0), 0); X.within('the animatic runs the scene\'s length (s)', Math.abs(tot - (an[an.length - 1].t1 - an[0].t0)), 0, 0.7, ' s');
      X.ok('push-ins play as moves in the animatic', an.filter(s => B.shots.find(x => x.n === s.n).move === 'push in').every(s => s.to.s > s.from.s), 'checked', 'zoom in');
    } finally { B.shots = save.map((s, i) => Object.assign(s, { cam: camSave[i] })); B.side = sideSave; }
    // the pencil look: grey only, with hatching
    const cv = document.createElement('canvas'); cv.width = 320; cv.height = 180; const g = cv.getContext('2d'), sh = B.shots.find(s => s.size === 'MS' && s.eye), r = brdPanel(g, B, sh, 0, 0, 320), px = g.getImageData(0, 0, 320, 172).data; let col = 0, dark = 0;
    for (let i = 0; i < px.length; i += 4) { const m = Math.max(px[i], px[i + 1], px[i + 2]), n = Math.min(px[i], px[i + 1], px[i + 2]); if (m - n > 40 && !(px[i] > 150 && px[i + 2] < 90)) col++; if (m < 120) dark++; }
    X.ok('pencil: no colour but the arrows', col / (px.length / 4) < 0.01, (col / (px.length / 4) * 100).toFixed(2) + '% coloured', 'under 1%');
    X.ok('pencil: hatching on the shadow side', r.bodies.reduce((a, b) => a + b.marks, 0) > 40, r.bodies.reduce((a, b) => a + b.marks, 0) + ' strokes', 'over 40');
  }
});
