/* ================= LEGEND's course (1.9.995): the body, the hands, anatomy, handling things, the quality of movement ================= */
curCourse('LEGEND', { title: 'LEGEND: the body', role: 'Builds, poses and moves the people in a film: their skeleton and proportions, their hands, what their joints can do, how they hold and move things, and how well they move.', intro: 'Every version is the whole body done to full precision; each adds what LEGEND had to learn to do more with it.' });
// a standing body (no lean) for measuring
function curLgStand() { const P = lgPose(); lgPoseReset(P); lgStance(P, 0.1, 0, 0); return lgmSolve(P); }
curLevel('LEGEND', {
  v: 1, title: 'The body', focus: 'A skeleton with true proportions, posed by angles and by reaching.',
  studied: [
    { topic: 'Proportions from joint centres', facts: ['de Leva (1996) segment lengths between joint centres, as fractions of stature (male): upper arm 0.162, forearm 0.154, thigh 0.242, shank 0.249', 'Drillis and Contini (1966) heights as fractions of stature: shoulder 0.818, elbow 0.630, wrist 0.485, knee 0.285, ankle 0.039 (to landmarks on the skin, so a joint centre sits a little off them)', 'Shoulder joints about 0.21 of stature apart (biacromial breadth 0.259 less the acromion on each side); hip joints about 0.10'], src: [['de Leva 1996, Adjustments to Zatsiorsky-Seluyanov\'s segment inertia parameters', 'https://doi.org/10.1016/0021-9290(95)00178-6'], ['Drillis and Contini 1966, Body segment parameters (via Winter, Biomechanics and Motor Control of Human Movement)', 'https://doi.org/10.1002/9780470549148']] },
    { topic: 'Reaching (two-bone inverse kinematics)', facts: ['The elbow (or knee) angle comes from the law of cosines on the two bone lengths and the distance to the target', 'The bend\'s plane is set by a pole (where the elbow points)', 'A target out of reach: the limb points straight at it'], src: [['Kulpa and Multon 2005, Fast inverse kinematics and kinetics solver for human-like figures', 'https://doi.org/10.1109/ICHR.2005.1573560']] }
  ],
  can: ['A 61-bone skeleton (spine, neck, head, collarbones, arms, 15 bones a hand, legs, feet, toes) with props', 'Proportions within a couple of percent of stature of the anthropometric tables', 'Hands and feet that reach any point in range to under a millimetre'],
  exam: X => {
    const W = curLgStand(), H = lgaMark(W, 'headTop')[2], z = n => lgaMark(W, n)[2] / H, len = (a, b) => curV3.len(curV3.sub(lgaMark(W, a), lgaMark(W, b))) / H;
    X.near('stature (m)', H, 1.81, 0.05, ' m');
    X.near('upper arm / stature (de Leva 0.162)', len('armR', 'foreR'), 0.162, 0.012);
    X.near('forearm / stature (de Leva 0.154)', len('foreR', 'handR'), 0.154, 0.012);
    X.near('thigh / stature (de Leva 0.242)', len('thighR', 'shinR'), 0.242, 0.015);
    X.near('shank / stature (de Leva 0.249)', len('shinR', 'footR'), 0.249, 0.02);
    X.near('shoulder height / stature (D&C 0.818)', z('armR'), 0.818, 0.02);
    X.near('knee height / stature (D&C 0.285)', z('shinR'), 0.285, 0.02);
    X.near('ankle height / stature (D&C 0.039)', z('footR'), 0.039, 0.012);
    X.near('shoulder joints apart / stature', len('armL', 'armR'), 0.21, 0.02);
    X.ok('left and right limbs the same length', Math.abs(len('armL', 'foreL') - len('armR', 'foreR')) + Math.abs(len('thighL', 'shinL') - len('thighR', 'shinR')) < 1e-4, 'equal', 'equal');
    // reaching: 120 targets in reach (and 20 out of it) for the right hand
    const rng = curRng(11); let worst = 0, outOk = 0;
    for (let i = 0; i < 140; i++) {
      const far = i >= 120, dir = curV3.norm([0.3 + rng(), -0.6 - rng() * 0.6, rng() * 1.6 - 0.8]), r = far ? 0.75 + rng() * 0.3 : 0.25 + rng() * 0.27, sh = lgaP(W, 'armR'), tgt = curV3.add(sh, curV3.mul(dir, r));
      const P = lgPose(); lgPoseReset(P); lgStance(P, 0.1, 0, 0); P.ik.handR = { sp: 'world', p: tgt, pole: [-0.3, -0.8, -0.5] }; const W2 = lgmSolve(P), h = lgaP(W2, 'handR');
      if (!far) worst = Math.max(worst, curV3.len(curV3.sub(h, tgt))); else if (curAng(curV3.sub(h, lgaP(W2, 'armR')), curV3.sub(tgt, lgaP(W2, 'armR'))) * CUR_DEG < 3) outOk++;
    }
    X.within('worst reach error over 120 targets in range (mm)', worst * 1000, 0, 1, ' mm');
    X.ok('targets out of reach: the arm points at them (of 20)', outOk >= 19, outOk, '19 or more');
  }
});
curLevel('LEGEND', {
  v: 2, title: 'Hands and the gun', focus: 'Five-finger hands that close on whatever they hold (1.9.994).',
  studied: [
    { topic: 'The hand', facts: ['Three bones a finger (proximal, middle, distal phalanx) and the thumb\'s metacarpal and two phalanges: 15 bones a hand', 'Finger lengths in proportion: the middle finger longest, then the ring, the index, the little finger', 'A finger closes joint by joint: the knuckle first, then the middle joint, then the last'], src: [['Buryanov and Kotiuk 2010, Proportions of hand segments', 'https://doi.org/10.15626/ijms.2010.1.1']] },
    { topic: 'Holding a gun', facts: ['The firing hand high on the grip, the trigger finger along the frame or on the trigger', 'The support hand\'s fingers wrap over the firing hand\'s', 'On a rifle the support hand cups the handguard'], src: [['US Army TC 3-22.9, Rifle and Carbine', 'https://armypubs.army.mil/'], ['US Army TC 3-23.35, Pistols', 'https://armypubs.army.mil/']] }
  ],
  can: ['Each finger fitted to the actual gun (ten guns) and to the knife: it closes until it touches the metal', 'The fits kept on the device and remade only when something they depend on changes'],
  exam: X => {
    let fingers = 0, touching = 0, deep = 0, guns = 0, ms = 0;
    for (const key of Object.keys(LG_GUN_DEF)) {
      const prop = LG_GUN_DEF[key].fam === 'c' ? 'carbine' : 'pistol', t0 = performance.now();
      const r = lghGet(prop, key, 'R', 'gripR', 'pistol', lghBaseSock(prop, key, 'gripR')); ms += performance.now() - t0; if (!r) continue; guns++;
      const H = lghLocal(lghCloud(prop, key), r.S);
      for (let k = 1; k < 4; k++) {   // the middle, ring and little fingers wrap the grip (the index is the trigger finger)
        const [f, x, zz, l2, l3] = LG_FINGERS[k], c = r.g.f[k], base = lgMul(lgM4(), lgTR(x, -0.0025 * (f === 'pnk' ? 0 : 1), -zz), lgRot(lgM4(), c[0], LGH_FAN[k] * r.g.sp, 0));
        let near = 1e9; lghChain(base, 0, 0, 0, c, [l2, l3, l3 * 0.8], 1, (j, A, B) => { for (let i = 0; i < H.length; i += 3) { const d2 = lgqSegDist(A, B, [H[i], H[i + 1], H[i + 2]], [H[i], H[i + 1], H[i + 2]]) - LGH_R[f]; if (d2 < near) near = d2; } });
        fingers++; if (near < 0.006) touching++; if (near < -0.004) deep++;
      }
    }
    X.ok('guns fitted', guns === Object.keys(LG_GUN_DEF).length, guns, Object.keys(LG_GUN_DEF).length);
    X.within('wrapping fingers touching the grip (%)', touching / Math.max(1, fingers) * 100, 85, 100, '%');
    X.ok('no finger sunk into a gun more than 4 mm', deep === 0, deep, 0);
    X.note('fitting ten firing grips took ' + ms.toFixed(0) + ' ms (each is kept afterwards)');
  }
});
curLevel('LEGEND', {
  v: 3, title: 'Anatomy', focus: 'Every joint inside the range a human joint has; mass and balance like a body\'s.',
  studied: [
    { topic: 'Ranges of motion', facts: ['Shoulder: flexion to 180, extension 50 to 60, across the body about 50', 'Elbow: to about 145 (a few degrees of hyperextension); forearm: pronation about 80, supination 80 to 90', 'Wrist: flexion 60 to 80, extension 60 to 70, radial 20, ulnar 20 to 30', 'Fingers: knuckle 90, middle joint 100 to 110, last joint 70 to 90 (about two thirds of the middle one); thumb knuckle 50 to 60, last joint 80', 'Hip: flexion 120 (more with the knee bent), extension 30, abduction 40 to 45 (more as the hip flexes), adduction 20 to 30', 'Knee to 135 to 150; ankle: dorsiflexion 20 (about 40 to 45 under the body\'s weight in a lunge), plantarflexion 50', 'Neck: flexion 50 to 60, extension 75, side bend 45, rotation 80; back: flexion 45 to 80, rotation 30 to 45'], src: [['AAOS, Joint Motion: Method of Measuring and Recording', 'https://www.aaos.org/'], ['Soucie et al. 2011, Range of motion measurements: reference values', 'https://doi.org/10.1111/j.1365-2516.2010.02399.x'], ['Hallaceli et al. 2014, Normal hip, knee and ankle range of motion', 'https://doi.org/10.5152/balkanmedj.2014.13229']] },
    { topic: 'The shoulder\'s rhythm and the arm\'s swivel', facts: ['The collarbone and shoulder blade move with the arm (scapulohumeral rhythm, about 2:1)', 'With the hand fixed, the elbow can sit anywhere on a circle; people pick the place that keeps the wrist and forearm in range and the shoulder comfortable'], src: [['Inman, Saunders and Abbott 1944, Observations on the function of the shoulder joint', 'https://doi.org/10.1097/00003086-199609000-00002']] },
    { topic: 'Mass and balance', facts: ['de Leva\'s segment masses (% of body): head 6.94, trunk 43.46, upper arm 2.71, forearm 1.62, hand 0.61, thigh 14.16, shank 4.33, foot 1.37', 'The whole body\'s centre of mass stands at about 55% of stature', 'Standing is balanced when the centre of mass is over the base of support (the feet\'s hull)'], src: [['de Leva 1996', 'https://doi.org/10.1016/0021-9290(95)00178-6'], ['Hof, Gazendam and Sinke 2005, The condition for dynamic stability', 'https://doi.org/10.1016/j.jbiomech.2004.03.025']] }
  ],
  can: ['Every pose of the 123 clips inside the joint ranges (the clips were made by hand and often were not)', 'Arms that swivel to keep the wrist in range, grips that learned where to sit, ankles that roll onto the ball of the foot', 'The centre of mass and the base of support, frame by frame'],
  exam: X => {
    // the clips, measured with the anatomy off (as they were made) and on
    const count = (on) => { const was = LGA.on; LGA.on = on; let n = 0, samples = 0; const P = lgPose(), L = lgLocalNew(), W = lgWorldNew();
      try { for (const a of LG_ANIMS) { if (a.cat === 'Actors') continue; for (let k = 0; k <= 8; k++) { lgEvalClip(a, a.dur * k / 8, P, {}); lgSolve(P, L, W, lgRootM(P)); n += lgaOut(lgaJoints(W), 3).length; samples++; } } } finally { LGA.on = was; } return { n: n, samples: samples }; };
    const off = count(false), on = count(true);
    X.ok('joint angles past their range, as the clips were made (' + off.samples + ' poses)', off.n > 0, off.n, 'measured');
    X.ok('joint angles past their range with LEGEND\'s anatomy', on.n === 0, on.n, 0);
    X.curve('joints out of range: before and after', [off.n, on.n]);
    const W = curLgStand(), H = lgaMark(W, 'headTop')[2], c = lgaCOM(W).c;
    X.near('centre of mass height / stature (about 0.55)', c[2] / H, 0.55, 0.02);
    X.ok('standing: the centre of mass over the feet', lgaInside(lgaSupport(W, 0), c[0], c[1]) > 0.01, (lgaInside(lgaSupport(W, 0), c[0], c[1]) * 1000).toFixed(0) + ' mm inside', 'inside by 10 mm or more');
    // the support grip on the carbine, learned again from nothing: the cost of the grip should fall and land near the one kept
    const key = 'carbine|L', kept = LGA.grip[key].slice(); LGA.grip[key] = [0, 0, 0];
    let res; try { res = lgaLearnGrip(key, { rounds: 10, per: 3 }); } finally { const learnt = LGA.grip[key].slice(); LGA.grip[key] = kept; if (typeof lghReset === 'function') lghReset(); X.ev.learnt = learnt; }
    X.curve('support-hand grip on the carbine: cost while learning', res.curve);
    X.ok('the grip\'s cost fell while learning', res.curve[res.curve.length - 1] < res.curve[0] * 0.7, (res.curve[res.curve.length - 1] / res.curve[0] * 100).toFixed(0) + '% of the start', 'under 70%');
  }
});
// the grasps LEGEND is expected to choose (the taxonomy's answer for each thing and task)
const CUR_LG_GRASPS = { mug: 'hook', bottle: 'largeDiameter', can: 'mediumWrap', flashlight: 'smallDiameter', hammer: 'mediumWrap', ball: 'powerSphere', orange: 'powerSphere', pen: 'tripod', coin: 'palmarPinch', key: 'lateralPinch', phone: 'prismatic4', box: 'twoHand', crate: 'twoHand' };
curLevel('LEGEND', {
  v: 4, title: 'Handling things', focus: 'Holding everyday things the way people do, and the movements round them: reaching, lifting, handing over, throwing.',
  studied: [
    { topic: 'The grasp taxonomy', facts: ['Feix et al. (2016): 33 grasps in power, intermediate and precision classes, by opposition (palm, pad, side) and the thumb\'s position', 'Things over about 5 cm or 350 g are held in power grasps about 89% of the time (Feix, Bullock and Dollar 2014)', 'A grasp holds when its contact forces can balance: each push lies in a friction cone (skin on most things: a coefficient of about 0.8)'], src: [['Feix, Romero, Schmiedmayer, Dollar and Kragic 2016, The GRASP taxonomy of human grasp types', 'https://doi.org/10.1109/THMS.2015.2470657'], ['Feix, Bullock and Dollar 2014, Analysis of human grasping behavior', 'https://doi.org/10.1109/TOH.2014.2326871'], ['Ferrari and Canny 1992, Planning optimal grasps', 'https://doi.org/10.1109/ROBOT.1992.219918']] },
    { topic: 'Reaching to grasp', facts: ['Jeannerod (1984): a transport and a grip channel, coordinated', 'The hand\'s speed is one bell, peaking at about 40 to 45% of the reach (the landing is longer)', 'The grip opens wider than the thing, widest at 60 to 77% of the reach: about 55 mm plus 0.75 of its width (Smeets and Brenner 1999)', 'Fitts\'s law: time grows with log2(2D/W)'], src: [['Jeannerod 1984, The timing of natural prehension movements', 'https://doi.org/10.1080/00222895.1984.10735319'], ['Smeets and Brenner 1999, A new view on grasping', 'https://doi.org/10.1163/156856899X00012'], ['Fitts 1954, The information capacity of the human motor system', 'https://doi.org/10.1037/h0055392']] },
    { topic: 'Lifting, handing over, throwing', facts: ['Lift with the legs and keep the load close (NIOSH lifting equation: the load\'s horizontal distance matters most)', 'Handovers: the giver lets go as the receiver\'s grip closes, over 200 to 400 ms; they meet about halfway (Chan et al. 2012)', 'Overarm throwing: pelvis peak at 28 to 35% of foot contact to release, trunk 47 to 53%; peak speeds about 600 (pelvis), 1150 (trunk), 2200 (elbow) and 6500 (shoulder internal rotation) degrees a second (Fleisig et al.)'], src: [['Waters et al. 1993, Revised NIOSH equation for the design and evaluation of manual lifting tasks', 'https://doi.org/10.1080/00140139308967940'], ['Chan, Parker, Van der Loos and Croft 2012, Grip forces and load forces in handovers', 'https://doi.org/10.1145/2157689.2157692'], ['Fleisig, Barrentine, Zheng, Escamilla and Andrews 1999, Kinematic and kinetic comparison of baseball pitching among various levels of development', 'https://doi.org/10.1016/S0021-9290(99)00127-X']] }
  ],
  can: ['Thirteen everyday things, each held in the grasp people use for it, the hand settling until it touches without sinking in and the grip can hold', 'Reaching to grasp with a bell of speed, a wide-then-closing grip and the body leaning (hips back to keep the balance)', 'Lifting a 12 kg crate from the floor with the legs', 'Handing a bottle to another person', 'Throwing a ball to a target, learning when to let it go'],
  exam: X => {
    // the grasps
    let chose = 0, ok = 0, worstPen = 0, worstGap = 0, worstBal = 0; const pre = [], post = [];
    for (const k in CUR_LG_GRASPS) {
      const g = lgoGrasp(k); if (g.type === CUR_LG_GRASPS[k]) chose++;
      if (g.settle) { const a = g.settle.after, b = g.settle.before; pre.push(Math.max(-b.pen, ...b.gaps.map(Math.abs))); post.push(Math.max(-a.pen, ...a.gaps.map(Math.abs))); worstPen = Math.min(worstPen, a.pen); worstGap = Math.max(worstGap, ...a.gaps); if (g.type !== 'hook') worstBal = Math.max(worstBal, a.bal); }
    }
    X.ok('grasps chosen as people choose them', chose === Object.keys(CUR_LG_GRASPS).length, chose + ' of ' + Object.keys(CUR_LG_GRASPS).length, 'all');
    X.within('deepest sinking into a thing (mm; skin and glove give 1.5)', -worstPen * 1000, 0, 1.7, ' mm');
    X.within('widest gap at a contact the grasp needs (mm)', worstGap * 1000, -2, 1, ' mm');
    X.within('how far the contacts are from balancing (0: they can hold it)', worstBal, 0, 0.05);
    X.curve('worst contact error per grasp before settling (mm)', pre.map(v => v * 1000)); X.curve('after settling (mm)', post.map(v => v * 1000));
    // reaching to grasp
    lgmLearnBalance(16);
    const pf = lgmReach({ key: 'mug', at: [0.47, -0.2, 0.743], yaw: 1.2, side: 'R', lift: 0.12, root: [0.13, 0, 0, 0] }), run = lgmRun(pf, 120), st = lgmReachStats(run);
    X.within('reach: peak speed (fraction of the reach)', st.peakFrac, 0.38, 0.47);
    X.within('reach: widest opening (fraction of the reach)', st.mgaFrac, 0.6, 0.78);
    X.near('reach: widest opening (mm) against 55 + 0.75 w', st.mga * 1000, st.mgaWant * 1000, 3, ' mm');
    X.within('reach: the hand on the handle at the touch (mm)', st.handErr * 1000, 0, 2, ' mm');
    X.ok('reach: the centre of mass over the feet throughout', st.comInside > 0.01, (st.comInside * 1000).toFixed(0) + ' mm inside', 'inside');
    const near = lgmFitts(0.2, 0.04), far = lgmFitts(0.6, 0.04), small = lgmFitts(0.4, 0.01), big = lgmFitts(0.4, 0.08);
    X.ok('Fitts: farther and smaller take longer', far > near && small > big, [near, far, small, big].map(v => v.toFixed(2)).join(' / ') + ' s', 'far > near, small > big');
    X.curve('balance gain: error of each practice reach (mm)', LGM.curve.map(v => v * 1000));
    X.curve('reach: hand speed (m/s)', st.speed.filter((_, i) => i % 3 === 0));
    // lifting the crate
    const lf = lgmLiftBox({}), lr = lgmRun(lf, 60); let worst = 1e9;
    for (const f of lr.frames) { const ex = f.r.held ? [{ p: [f.things[0].M[12], f.things[0].M[13], f.things[0].M[14]], pct: lf.pct }] : null, c = lgaCOM(f.W[0], ex).c; worst = Math.min(worst, lgaInside(lgaSupport(f.W[0], 0), c[0], c[1])); }
    X.ok('lift (12 kg): the centre of mass over the feet throughout', worst > 0, (worst * 1000).toFixed(0) + ' mm', 'inside');
    const fG = lr.frames[Math.round(lf.t.grip * 60)].W[0], hR = lgaP(fG, 'handR'), gR = lgmGraspM(lgMul(lgM4(), lgTR(0.36, 0, 0), lgM4()), lgoGrasp('crate', { side: 'R', type: 'twoHand' }));
    X.within('lift: the hand on the crate at the grip (mm)', curV3.len(curV3.sub(hR, [gR[12], gR[13], gR[14]])) * 1000, 0, 15, ' mm');
    // handing over
    const ho = lgmHandover({}), hr = lgmRun(ho, 120);
    X.within('handover: the weight passes (s)', ho.t.free - ho.t.touch, 0.2, 0.4, ' s');
    let gapT = 0; for (let t = 0; t < ho.dur; t += 0.01) { const sh = ho.share(t); if (!(sh >= 0 && sh <= 1)) gapT++; } X.ok('handover: the bottle is held by someone at every moment', gapT === 0, gapT, 0);
    X.within('handover: where they meet (fraction of the way)', ho.H[0] / ho.gap, 0.4, 0.6);
    const iT = Math.round(ho.t.touch * 120), hB = hr.frames[iT].W[1], gB = lgaP(hB, 'handR'), bot = hr.frames[iT].things[0].M; X.within('handover: the receiver\'s hand on the bottle at the touch (cm)', curV3.len(curV3.sub(gB, [bot[12], bot[13], bot[14] + 0.065])) * 100, 0, 12, ' cm');
    // throwing
    const L = lgmLearnThrow(20), tr = lgmRun(lgmThrow({}), 1000), ts = lgmThrowStats(tr), fl = lgmFlight(ts.release.p, ts.release.v);
    X.within('throw: the hips turn fastest (fraction of foot contact to release)', ts.pelvis.frac, 0.28, 0.35);
    X.within('throw: the trunk turns fastest', ts.trunk.frac, 0.45, 0.55);
    X.ok('throw: the chain runs from the hips out (hips, trunk, elbow, arm)', ts.pelvis.t < ts.trunk.t && ts.trunk.t < ts.elbow.t && ts.elbow.t <= ts.ir.t, [ts.pelvis.t, ts.trunk.t, ts.elbow.t, ts.ir.t].map(v => v.toFixed(3)).join(' < '), 'in order');
    X.within('throw: hips peak speed (deg/s; about 600)', ts.pelvis.peak, 450, 800); X.within('throw: trunk peak speed (deg/s; about 1150)', ts.trunk.peak, 900, 1400);
    X.within('throw: elbow peak speed (deg/s; about 2200)', ts.elbow.peak, 1700, 2700); X.within('throw: shoulder internal rotation peak (deg/s; about 6500)', ts.ir.peak, 5000, 8000);
    X.ok('throw: the centre of mass over the back foot with the leg up', ts.single > 0, (ts.single * 1000).toFixed(0) + ' mm', 'inside');
    X.near('throw: the ball lands at the target (20 m)', fl.range, 20, 0.3, ' m');
    X.curve('throw: miss of each practice throw (m)', L.curve);
    X.note('throw: release at ' + ts.release.speed.toFixed(1) + ' m/s, ' + (Math.atan2(ts.release.v[2], Math.hypot(ts.release.v[0], ts.release.v[1])) * CUR_DEG).toFixed(1) + ' degrees up, in the air ' + fl.t.toFixed(2) + ' s');
  }
});
curLevel('LEGEND', {
  v: 5, title: 'The quality of movement, and performance', focus: 'Checking its own movement like an animation supervisor, and performing an action in more than one way.',
  studied: [
    { topic: 'Faults and their measures', facts: ['A planted foot must not slide', 'Limbs must not pass through the body (capsules of the segments\' thickness; soft tissue gives about 2 cm)', 'Smoothness: the spectral arc length of a speed profile (SPARC), about -1.4 to -2 for healthy reaching (Balasubramanian et al. 2015)', 'Arcs (Thomas and Johnston, The Illusion of Life): living movement curves; reaches bow slightly'], src: [['Balasubramanian, Melendez-Calderon, Roby-Brami and Burdet 2015, On the analysis of movement smoothness', 'https://doi.org/10.1186/s12984-015-0090-9'], ['Thomas and Johnston 1981, The Illusion of Life', 'https://en.wikipedia.org/wiki/The_Illusion_of_Life'], ['Ericson 2004, Real-Time Collision Detection', 'https://realtimecollisiondetection.net/']] },
    { topic: 'Gaze and life', facts: ['The eyes go to a target before the hand moves; the head follows the eyes by 10 to 50 ms', 'Breathing at rest: 12 to 20 a minute; blinking about 17 a minute'], src: [['Land and Hayhoe 2001, In what ways do eye movements contribute to everyday activities?', 'https://doi.org/10.1016/S0042-6989(01)00102-X'], ['Doughty 2001, Consideration of three types of spontaneous eyeblink activity', 'https://doi.org/10.1097/00006324-200110000-00011']] },
    { topic: 'Laban\'s efforts', facts: ['Time (sudden or sustained), space (direct or indirect), weight (strong or light), flow (bound or free)', 'The eight actions: punch, press, glide, float, dab, flick, slash, wring'], src: [['Laban and Lawrence 1947, Effort', 'https://en.wikipedia.org/wiki/Laban_movement_analysis'], ['Chi, Costa, Zhao and Badler 2000, The EMOTE model for effort and shape', 'https://doi.org/10.1145/344779.352172']] }
  ],
  can: ['Every movement checked for sliding feet, limbs through the body, jerkiness, straight-line paths and the eyes not leading', 'Arms that learned to keep out of the body (in the game\'s own clips too)', 'The same reach performed as a punch, a float, a glide, a slash and so on, each still correct'],
  exam: X => {
    lgmLearnBalance(16);
    const efforts = ['neutral', 'punch', 'float', 'glide', 'slash', 'dab', 'press'], R = {};
    for (const e of efforts) { const pf = lgmReach({ key: 'mug', at: [0.47, -0.2, 0.743], yaw: 1.2, side: 'R', lift: 0.12, root: [0.13, 0, 0, 0], effort: e }), run = lgmRun(pf, 120); R[e] = { q: lgqRun(run), st: lgmReachStats(run) }; }
    const all = efforts.map(e => R[e]);
    X.within('reaches (7 efforts): worst foot slide (m/s)', Math.max(...all.map(r => r.q.slide)), 0, 0.05, ' m/s');
    X.within('reaches: deepest limb into the body (mm; 20 allowed)', Math.max(...all.map(r => r.q.pen)) * 1000, 0, 20, ' mm');
    X.within('reaches: smoothness, the least smooth (SPARC)', Math.min(...all.map(r => r.q.sparc)), -2.2, -1.2);
    X.within('reaches: arcs, the straightest (bow / length)', Math.min(...all.map(r => r.q.bow)), 0.02, 0.35); X.ok('reaches: no wobble in any path', all.every(r => r.q.flips === 0), all.map(r => r.q.flips).join(','), 'all 0');
    X.within('reaches: the head on the thing before the hand\'s top speed (s), the latest', Math.min(...all.map(r => r.q.headFirst)), 0.1, 2, ' s');
    X.ok('efforts: a punch is quicker than a float and faster at its peak', R.punch.st.mt < R.float.st.mt * 0.7 && R.punch.st.vmax > R.float.st.vmax, R.punch.st.mt.toFixed(2) + ' s / ' + R.float.st.mt.toFixed(2) + ' s', 'punch under 70% of float');
    X.ok('efforts: indirect paths bow more than direct ones (float vs glide)', R.float.q.bow > R.glide.q.bow * 1.25, R.float.q.bow.toFixed(3) + ' / ' + R.glide.q.bow.toFixed(3), 'float 25% more');
    X.within('efforts: every hand still on the handle at the touch (mm)', Math.max(...all.map(r => r.st.handErr)) * 1000, 0, 2, ' mm');
    // the other performances
    for (const [name, pf, fps] of [['lift', lgmLiftBox({}), 60], ['handover', lgmHandover({}), 60]]) { const q = lgqRun(lgmRun(pf, fps)); X.within(name + ': foot slide (m/s)', q.slide, 0, 0.05, ' m/s'); X.within(name + ': deepest limb into the body (mm)', q.pen * 1000, 0, 20, ' mm'); }
    // every pose of the new performances inside the joints' ranges
    let viol = 0, poses = 0; const worstJ = {};
    for (const pf of [lgmReach({ key: 'mug', at: [0.47, -0.2, 0.743], yaw: 1.2, side: 'R', lift: 0.12, root: [0.13, 0, 0, 0] }), lgmLiftBox({}), lgmHandover({}), lgmThrow({})]) for (let t = 0; t <= pf.dur; t += 0.04) { const r = pf.at(t, null); for (const P of (r.Ps || [r.P])) { const o = lgaOut(lgaJoints(lgmSolve(P)), 3); viol += o.length; poses++; for (const x of o) worstJ[x[0]] = 1; } }
    X.ok('reach, lift, handover and throw: joints past their range (' + poses + ' poses)', viol === 0, viol + (viol ? ' (' + Object.keys(worstJ).join(', ') + ')' : ''), 0);
    // the game's clips: arms through the body, with the arm search as it was and as it is
    const survey = (on) => { const was = LGA.body; LGA.body = on; let over = 0, deep = 0; try { for (const id in LG_ANIM_BY) { const q = lgqClip(LG_ANIM_BY[id], { fps: 30 }); if (q.pen > 0.02) over++; if (q.pen > 0.06) deep++; } } finally { LGA.body = was; } return { over: over, deep: deep }; };
    const b = survey(false), a = survey(true);
    X.ok('clips with a limb more than 6 cm into the body: fewer than 60% of before', a.deep < b.deep * 0.6, b.deep + ' -> ' + a.deep, 'under 60%');
    X.curve('clips with a limb into the body (over 2 cm, over 6 cm): before, after', [b.over, b.deep, a.over, a.deep]);
    X.note('the clips still over 2 cm are mostly contact a capsule cannot tell from passing through: forearms resting on thighs when seated, a hand flat on the chest');
    X.within('breathing at rest (idle_ready, breaths a minute)', lgqBreaths('idle_ready', 16), 12, 20);
  }
});
