/* ================= CHOREO's course (1.9.995): moves, spacing and contact, phrases, the camera, whole fights ================= */
curCourse('CHOREO', { title: 'CHOREO: the choreographer', role: 'Designs the fights: the moves, their timing and spacing, the phrases and their rhythm, staged for the lens, told as a story.', intro: 'A new engine: a fight director and a stunt coordinator, working with LEGEND\'s bodies, MIMATIC\'s camera and VFXRAY\'s effects.' });
const CUR_CHO_PUNCH = ['jab', 'cross', 'hook', 'uppercut', 'body'];
function curChoPair() { return choFight({ fighters: [{ name: 'A', at: [0, 0] }, { name: 'B', at: [1.05, 0] }], dur: 4.4, steps: [{ who: 0, t: 0.3, dir: 'in', len: 0.15 }], ex: [{ t: 0.9, a: 0, move: 'jab', b: 1, def: 'block' }, { t: 1.3, a: 0, move: 'cross', b: 1 }, { t: 2.1, a: 1, move: 'hook', b: 0, def: 'duck' }, { t: 2.7, a: 0, move: 'body', b: 1 }, { t: 3.4, a: 0, move: 'frontKick', b: 1 }] }); }
curLevel('CHOREO', {
  v: 1, title: 'Moves', focus: 'A vocabulary of strikes, kicks, defences, reactions and footwork, each with real timing and a place on the fight sheet.',
  studied: [
    { topic: 'Timing', facts: ['Punches take about 223 to 357 ms from start to finish (boxers measured with motion capture)', 'Wind-up : contact : recovery runs from about 1:1:2 for a jab to 3:1:5 for a heavy blow', 'The fastest human reaction to a seen cue is about 180 to 200 ms'], src: [['Kimm and Thiel 2015, Hand speed measurements in boxing', 'https://doi.org/10.1016/j.proeng.2015.07.238'], ['Whelan 2008, Frame data and fighting game design (GDC)', 'https://www.gdcvault.com/'], ['Welford 1980, Reaction Times', 'https://archive.org/details/reactiontimes0000unse']] },
    { topic: 'Stage combat', facts: ['Cue, reaction, action: the attacker shows a cue, the partner reacts, then the attack is made (Society of American Fight Directors)', 'Lines: high, middle, low; parries numbered by the line they close', 'The fight sheet: two columns, the attacker\'s action and the partner\'s response, numbered'], src: [['Society of American Fight Directors, Unarmed stage combat', 'https://www.safd.org/'], ['Suddeth 1996, Fight Directing for the Theatre', 'https://www.heinemann.com/']] }
  ],
  can: ['Twelve moves and their reactions: jab, cross, hook, uppercut, body shot, front kick, roundhouse, high block, parry, slip, duck, point-blank shot; steps in, back and to the side', 'A readable cue before every blow, early enough for a partner to answer it'],
  exam: X => {
    let worstP = 0; for (const k of CUR_CHO_PUNCH) { const t = CHO_MOVES[k].t, tot = (t[0] + t[1] + t[2]) * 1000; worstP = Math.max(worstP, tot < 223 ? 223 - tot : tot > 357 ? tot - 357 : 0); }
    X.ok('punches last 223 to 357 ms', worstP === 0, CUR_CHO_PUNCH.map(k => ((CHO_MOVES[k].t[0] + CHO_MOVES[k].t[1] + CHO_MOVES[k].t[2]) * 1000).toFixed(0)).join(', ') + ' ms', 'all inside');
    const attacks = Object.keys(CHO_MOVES).filter(k => ['strike', 'kick'].includes(CHO_MOVES[k].kind)); let bad = [];
    for (const k of attacks) { const t = CHO_MOVES[k].t, a = t[0] / t[1], r = t[2] / t[1]; if (a < 0.9 || a > 3.2 || r < 1.9 || r > 5.2) bad.push(k); }
    X.ok('wind-up : contact : recovery between 1:1:2 and 3:1:5', bad.length === 0, bad.length ? bad.join(', ') : attacks.length + ' attacks', 'all');
    X.ok('every move has its line on the fight sheet', Object.values(CHO_MOVES).every(m => m.note), Object.keys(CHO_MOVES).length + ' moves', 'all written');
    let worstCue = 9; for (const a of attacks) for (const d of ['block', 'parry', 'slip', 'duck']) { const m = CHO_MOVES[a], dm = CHO_MOVES[d], gap = (m.t[0] + CHO_CUE) - (dm.t[1] * 0.3 + dm.t[0]); worstCue = Math.min(worstCue, gap); }
    X.within('every defence starts at least a reaction time after the attack\'s cue (s, worst)', worstCue, CHO_REACTION_T, 1, ' s');
    X.curve('move lengths (s): ' + Object.keys(CHO_MOVES).join(', '), Object.values(CHO_MOVES).map(m => m.t[0] + m.t[1] + m.t[2]));
  }
});
curLevel('CHOREO', {
  v: 2, title: 'Spacing and contact', focus: 'The measure kept, blows arriving where and when they should, partners reacting on the beat, and the stage-combat gap.',
  studied: [
    { topic: 'Measure and safety', facts: ['Measure: the distance at which a blow can reach; fighters work at it and step in or out', 'A staged blow that "lands" passes a hand\'s breadth (about 10 cm) beside the target, the gap hidden along the audience\'s or the lens\'s line', 'The reaction (head snap, fold) is the partner\'s job, timed to the moment of contact'], src: [['Society of American Fight Directors', 'https://www.safd.org/'], ['Kreng 2008, Fight Directing: A Practical Guide', 'https://www.cengage.com/']] }
  ],
  can: ['Fighters at measure, feet planted except when a step lifts them', 'Every blow on its target at its moment (or on the block that meets it), every reaction on the beat and in the blow\'s direction', 'The safety gap kept and hidden from the camera'],
  exam: X => {
    const F = curChoPair(), pf = choPerf(F); let worstAim = 0, minGap = 9, maxGap2 = 0, onBlock = 9, reactOk = 0, reactN = 0;
    for (const e of F.ex) {
      const m = CHO_MOVES[e.move], a = { e: e, m: m }, tgt = choTarget(F, a), Wa = choWorldAt(F, e.a, e.t, false), fist = m.kind === 'kick' ? lgPt(Wa.subarray(LGB['foot' + m.limb] * 16, LGB['foot' + m.limb] * 16 + 16), 0, 0, 0) : lgaP(Wa, 'hand' + m.limb);
      const ikT = m.kind === 'kick' ? tgt : tgt; worstAim = Math.max(worstAim, curV3.len(curV3.sub(fist, ikT)));
      if (!e.def) { const r = choReads(F, e); minGap = Math.min(minGap, r.gap3); maxGap2 = Math.max(maxGap2, r.gap2 - (m.kind === 'kick' ? 0.017 : 0)); reactN++;
        const W0 = choWorldAt(F, e.b, e.t, false), W1 = choWorldAt(F, e.b, e.t + 0.1, false), dH = curV3.sub(lgaP(W1, 'head'), lgaP(W0, 'head')), dir = curV3.sub(choMark(W0, m.target), choCenter(F, e.a, e.t).concat([1.2])); if (curV3.dot([dH[0], dH[1], 0], [dir[0], dir[1], 0]) > 0 || m.react === 'fold' || m.react === 'push') reactOk++; }
      if (e.def === 'block') { const Wb = choWorldAt(F, e.b, e.t, false); onBlock = Math.min(onBlock, lgqSegDist(fist, fist, lgaP(Wb, 'foreL'), lgaP(Wb, 'handL'))); }
    }
    X.within('blows arrive on their marks (worst miss, cm)', worstAim * 100, 0, 3, ' cm');
    X.within('the safety gap on staged hits (cm, the smallest)', minGap * 100, 6, 20, ' cm');
    X.within('the gap seen from the camera (cm, the largest; kicks allowed 1.5 more)', maxGap2 * 100, 0, 3, ' cm');
    X.within('a blocked jab meets the forearm (cm)', onBlock * 100, 0, 7, ' cm');
    X.ok('reactions go with the blow', reactOk === reactN, reactOk + ' of ' + reactN, 'all');
    const d0 = Math.hypot(choCenter(F, 0, 0.6)[0] - choCenter(F, 1, 0.6)[0], choCenter(F, 0, 0.6)[1] - choCenter(F, 1, 0.6)[1]); X.within('the measure the fighters keep (m)', d0, 0.85, 1.3, ' m');
    const run2 = lgmRun(pf, 30), fts = [0, 1].map(a => lgqFeet(run2.frames.map(f => f.W[a]), 30)); X.within('feet: how far planted feet slip over the whole exchange (cm, the worst fighter)', Math.max(...fts.map(f => f.dist)) * 100, 0, 3, ' cm');
    // balance on one leg in the kick
    let worstK = 1e9; for (let t = F.ex[4].t - 0.2; t <= F.ex[4].t + 0.35; t += 0.025) { const W = choWorldAt(F, 0, t, false), c = lgaCOM(W).c; worstK = Math.min(worstK, lgaInside(lgaSupport(W, 0), c[0], c[1])); }
    X.ok('the kicker balanced over the standing foot', worstK > 0, (worstK * 1000).toFixed(0) + ' mm inside', 'inside');
  }
});
curLevel('CHOREO', {
  v: 3, title: 'Phrases and rhythm', focus: 'Moves joined into phrases with the pause-burst-pause rhythm, and several attackers who take their turns.',
  studied: [
    { topic: 'Rhythm', facts: ['Bordwell: the Hong Kong fight is built of pause, burst, pause; a burst\'s blows come fast, then a held moment', 'Jackie Chan\'s rules include rhythm (a beat to every phrase) and showing each hit fully'], src: [['Bordwell 2000, Planet Hong Kong', 'https://www.davidbordwell.net/books/planet.php'], ['Every Frame a Painting 2014, Jackie Chan: How to do action comedy', 'https://www.youtube.com/watch?v=Z1PCtIaM_GQ']] },
    { topic: 'Many against one', facts: ['On screen the attackers take turns: only one engages at a time while the others stay out of reach (stacking)', 'The hero turns to face each one as they come'], src: [['87eleven (stunt design) on group fights', 'https://87eleven.net/'], ['Every Frame a Painting 2015, The Bourne fights', 'https://www.youtube.com/@everyframeapainting']] }
  ],
  can: ['Phrases composed from moves, with bursts and pauses', 'Two or more attackers who come in one at a time, walk into measure and back off out of reach'],
  exam: X => {
    const F = choAlleyFight(), pf = choPerf(F), rh = choRhythm(F); let maxE = 0, far = 9;
    for (let t = 0; t < F.dur; t += 0.05) { maxE = Math.max(maxE, choEngaged(F, t, 0)); }
    // the one who is not fighting stays out of reach while the other fights
    for (const e of F.ex) { const waiting = [1, 2].find(i => i !== e.a && i !== e.b); if (waiting == null) continue; const h = choCenter(F, 0, e.t), w = choCenter(F, waiting, e.t); far = Math.min(far, Math.hypot(h[0] - w[0], h[1] - w[1])); }
    X.ok('one attacker engaged at a time', maxE <= 1, maxE, '1 at most');
    X.within('the waiting attacker\'s distance while the other fights (m, the closest)', far, 1.6, 9, ' m');
    X.ok('bursts: blows less than 0.6 s apart', rh.bursts >= 5, rh.bursts, '5 or more'); X.ok('pauses: more than 0.9 s between phrases', rh.pauses >= 4, rh.pauses, '4 or more');
    X.curve('gaps between blows (s)', rh.gaps);
  }
});
curLevel('CHOREO', {
  v: 4, title: 'Reading on camera', focus: 'Every exchange staged for the lens: hits that read, silhouettes that read, the hit and its reaction in one shot.',
  studied: [
    { topic: 'Fights for the camera', facts: ['The gap of a staged hit is hidden along the lens: the camera square to the strike\'s line sees the gap edge-on only from the wrong side', 'Show the hit and the reaction in the same shot (Jackie Chan); a blow reads when the limb crosses the frame in profile', 'Wide enough to see the bodies, still enough to read the move (the Bourne critique: cutting too fast loses the geography)'], src: [['Every Frame a Painting 2014, Jackie Chan: How to do action comedy', 'https://www.youtube.com/watch?v=Z1PCtIaM_GQ'], ['Bordwell 2007, Unsteadicam chronicles', 'https://www.davidbordwell.net/blog/2007/08/17/unsteadicam-chronicles/']] }
  ],
  can: ['Staged hits that read as contact from the camera while the gap stays', 'Strikes that show across the frame', 'Coverage where each hit and its reaction share a shot'],
  exam: X => {
    const F = choAlleyFight(); choPerf(F); let read = 0, n = 0, show = 1, frame = 0;
    for (const e of F.ex) { const m = CHO_MOVES[e.move]; if (e.def || !['strike', 'kick'].includes(m.kind)) continue; const r = choReads(F, e); n++; if (r.gap2 < (m.kind === 'kick' ? 0.052 : 0.035) && r.gap3 > 0.06) read++;   // (a foot is bigger than a fist: 5 cm on the picture still reads as contact) show = Math.min(show, r.show); if (r.inFrame) frame++; }
    X.ok('staged hits that read as contact on camera with the gap kept', read === n, read + ' of ' + n, 'all');
    X.within('the striking limb shown across the frame (fraction of its length, the least)', show, 0.6, 1);
    X.ok('the blow and its target in frame', frame === n, frame + ' of ' + n, 'all');
    // the director covers the fight: each landed hit and its reaction in one shot
    const pf = choPerf(F), beats = F.ex.map((e, i) => ({ t0: i ? (F.ex[i - 1].t + e.t) / 2 : 0, t1: i + 1 < F.ex.length ? (e.t + F.ex[i + 1].t) / 2 : F.dur, who: e.a === 0 ? 0 : e.a, kind: 'action', focus: 'body', peak: e.t, what: CHO_MOVES[e.move].name }));
    const sc = mimdFromPerf(lgmPerf(Object.assign({}, pf, { at: (t) => ({ Ps: F.fighters.slice(0, 2).map((_, i) => choPose(F, i, t)), things: [] }) })), { beats: beats.map(b => Object.assign({}, b, { who: Math.min(1, b.who) })), mood: 'action', names: ['Hero', 'First'] });
    const ed = mimdEdit(sc, { side: F.camSide }); let together = 0, landed = 0;
    for (const e of F.ex) { if (e.def || !CHO_MOVES[e.move].react) continue; landed++; const sh = ed.edl.find(x => e.t >= x.in && e.t < x.out); if (sh && e.t + 0.2 < sh.out) together++; }
    X.within('landed hits whose reaction is in the same shot (%)', together / Math.max(1, landed) * 100, 70, 100, '%');
    X.ok('the fight\'s edit keeps one side of the line', mimdJudge(sc, ed.edl).crossings === 0, mimdJudge(sc, ed.edl).crossings, 0);
  }
});
curLevel('CHOREO', {
  v: 5, title: 'Whole fights', focus: 'A fight with a story, things picked up and used, a shot to end it, and its sheet, cameras and effects.',
  studied: [
    { topic: 'A fight is a story', facts: ['A set-up, an escalation, a reversal (the hero in trouble), a climax, a resolution', 'Use of the environment and props (the bottle on the crate), the hero improvising', 'Gun-fu at close range: the pistol tucked close (the Center Axis Relock idea), the shot as the punctuation'], src: [['Bordwell 2000, Planet Hong Kong', 'https://www.davidbordwell.net/books/planet.php'], ['Center Axis Relock (Wikipedia)', 'https://en.wikipedia.org/wiki/Center_Axis_Relock'], ['StudioBinder: how to write a fight scene', 'https://www.studiobinder.com/blog/how-to-write-a-fight-scene/']] }
  ],
  can: ['A 16-second fight in the alley, one against two: blocks, a duck, a roundhouse that hurts him, a bottle off a crate, a kick, a slip, and a point-blank shot', 'Its fight sheet, its cameras and its effects'],
  exam: X => {
    const F = choAlleyFight(), pf = choPerf(F), arc = choArc(F), n = arc.length, third = (a, b) => { const s = arc.filter(x => x.t >= F.dur * a && x.t < F.dur * b); return s.reduce((q, x) => q + x.k, 0) / Math.max(1, s.length); };
    X.ok('the story rises: the last third hits harder than the first', third(2 / 3, 1.01) > third(0, 1 / 3) * 1.3, third(0, 1 / 3).toFixed(2) + ' -> ' + third(2 / 3, 1.01).toFixed(2), '30% harder');
    X.ok('the climax at the end (the strongest moment in the last exchanges)', arc.findIndex(x => x.k === Math.max(...arc.map(y => y.k))) >= n - 2, arc[arc.length - 1].k.toFixed(2), 'last');
    const g = choBottleGrip(F); X.within('the bottle in LEGEND\'s grasp: sinking in (mm)', -g.q.pen * 1000, 0, 2, ' mm');
    const run = lgmRun(pf, 20); let held = 0, hn = 0; for (const f of run.frames) { if (!choHolds(F, 0, f.t)) continue; hn++; const W = f.W[0], b = f.things.find(x => x.key === 'bottle'), hp = lgaP(W, 'handR'); if (b && curV3.len(curV3.sub(hp, [b.M[12], b.M[13], b.M[14]])) < 0.2) held++; }
    X.ok('the bottle stays in his hand from the grab to the draw', held === hn && hn > 0, held + ' of ' + hn + ' frames', 'all');
    // the feet, and the bodies kept apart (the fallen one excepted once down)
    let slide = 0, pen = 0; for (let a = 0; a < 3; a++) { const Ws = run.frames.map(f => f.W[a]), ft = lgqFeet(Ws.filter((_, i) => !(a === 1 && run.frames[i].t > F.ex[F.ex.length - 1].t)), 20); slide = Math.max(slide, ft.dist); }
    for (const f of run.frames) for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) { const A = f.W[a], B = f.W[b], ta = [lgaMark(A, 'hips'), lgaMark(A, 'chestTop')], tb = [lgaMark(B, 'hips'), lgaMark(B, 'chestTop')], d = lgqSegDist(ta[0], ta[1], tb[0], tb[1]); pen = Math.max(pen, 0.25 - d); }
    X.within('feet: how far planted feet slip over the fight (cm, the worst fighter)', slide * 100, 0, 12, ' cm'); X.within('bodies kept apart (trunks overlapping, cm)', pen * 100, -100, 3, ' cm');
    const sheet = choSheet(F); X.ok('the fight sheet has every exchange', sheet.length === F.ex.length, sheet.length + ' rows', F.ex.length);
    let cues = 0; const S = vxsSys({ seed: 2 }); for (const e of F.ex) for (const fx of CHO_MOVES[e.move].fx || []) { if (VXS_CUES[fx]) { vxsCue(S, fx, [0, 0, 1], {}); cues++; } }
    X.ok('effects cued for the exchanges (hits, blocks, the shot)', cues >= F.ex.length - 1, cues + ' cues', 'one an exchange');
    X.within('length (s)', F.dur, 12, 20, ' s');
    X.curve('intensity of each exchange', arc.map(x => x.k));
    X.ev.sheet = sheet;
  }
});
