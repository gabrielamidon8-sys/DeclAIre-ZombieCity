/* ================= MIMATIC's course (1.9.995): the cinematic, the camera, cinematography, directing ================= */
curCourse('MIMATIC', { title: 'MIMATIC: the director and the camera', role: 'Directs the films: what is shot, from where, with which lens and light, and where the cuts fall.', intro: 'From a scripted cinematic to a director that covers a scene and cuts it by the rules editors use.' });
// the alley, built without drawing it (the actors and the director's shots)
function curMimAlley() { const d = mimDirectOperator(), actors = mimAlley('attack', d.warp.st); return { d: d, actors: actors }; }
// a scene for the director's exams: two people talk, one hands the other a bottle, who looks at it
function curMimScene() {
  const ho = lgmHandover({}), pre = 4.0, pf = lgmHold(ho, pre, 2.0), T = ho.t;
  const beats = [{ t0: 0, t1: 2.0, who: 0, kind: 'emotion', focus: 'face', what: 'A speaks' }, { t0: 2.0, t1: 4.0, who: 1, kind: 'emotion', focus: 'face', what: 'B listens' }, { t0: 4.0, t1: pre + T.reach, who: 0, kind: 'action', focus: 'body', what: 'A holds the bottle out' }, { t0: pre + T.reach, t1: pre + T.free, who: 1, kind: 'handle', focus: 'hands', hand: 'R', what: 'B takes the bottle', peak: pre + T.reach + 0.35 }, { t0: pre + T.free, t1: pf.dur, who: 1, kind: 'emotion', focus: 'face', what: 'B looks at it' }];
  return mimdFromPerf(pf, { beats: beats, mood: 'tense', names: ['A', 'B'] });
}
curLevel('MIMATIC', {
  v: 1, title: 'The cinematic', focus: 'A scripted short film: actors on tracks of clips, shots, a time curve and cues (1.9.992).',
  studied: [
    { topic: 'Film techniques', facts: ['The low-angle hero shot, the tracking shot, the insert and the push-in, the over-the-shoulder, the Dutch angle (10 to 15 degrees), the whip pan, the punch-in, handheld energy', 'Speed ramps (slow motion eased in and out), the freeze frame and the bullet-time orbit', 'Hit points: the score written to the cut, a few chosen per scene'], src: [['StudioBinder: camera movement and shot types', 'https://www.studiobinder.com/blog/different-types-of-camera-movements-in-film/'], ['StudioBinder: hit points and Mickey Mousing', 'https://www.studiobinder.com/blog/what-is-mickey-mousing-in-film/']] },
    { topic: 'Scene time', facts: ['A time curve (speed against real time) whose integral is the scene\'s clock, so slow motion and freezes are exact and every frame can be redrawn'], src: [['Speed ramping (CyberLink)', 'https://www.cyberlink.com/blog/the-top-video-editors/1035/speed-ramping']] }
  ],
  can: ['The Operator\'s 14.5-second cinematic: 15 shots, four actors, slow motion and a freeze on the shot', 'Sound, effects and the score cued to the cut'],
  exam: X => {
    const A = curMimAlley(), d = A.d, was = MIM.actors; MIM.actors = A.actors; let shotsOk = 0, contiguous = true;
    try {
      d.shots.forEach((sh, i) => {
        if (i && Math.abs(d.shots[i - 1].t1 - sh.t0) > 1e-6) contiguous = false;
        let inF = 0, n = 0;
        for (let k = 0; k < 6; k++) {
          const rt = sh.t0 + (sh.t1 - sh.t0) * (k + 0.5) / 6, st = d.warp.st(rt); for (const a of A.actors) mimActorEval(a, st);
          const c = sh.cam(rt), cam = lgCam(); cam.eye = c.eye; cam.tgt = c.tgt; cam.fov = c.fov; cam.roll = c.roll || 0;
          const vis = A.actors.some(a => st >= a.show[0] && ['head', 'chest', 'pelvis', 'handR'].some(b => { const q = mimcProject(cam, mimBone(a, b), 16 / 9); return q.front && Math.abs(q.x) < 1 && Math.abs(q.y) < 1; })); if (vis) inF++; n++;
        }
        if (inF / n >= 0.83) shotsOk++;
      });
    } finally { MIM.actors = was; }
    X.ok('shots that keep someone in frame (of ' + d.shots.length + ')', shotsOk === d.shots.length, shotsOk, d.shots.length);
    X.ok('the shots follow one another without a gap', contiguous, contiguous ? 'contiguous' : 'gaps', 'contiguous');
    let mono = true, prev = -1; for (let rt = 0; rt <= d.dur; rt += 0.01) { const st = d.warp.st(rt); if (st < prev - 1e-9) mono = false; prev = st; }
    X.ok('scene time never runs backward', mono, mono ? 'yes' : 'no', 'yes');
    X.within('speed at the freeze (scene seconds per second)', d.warp.sp(11.5), 0, 0.001);
    X.ok('cues in time order', d.cues.every((c, i) => !i || c[0] >= d.cues[i - 1][0]), d.cues.length + ' cues', 'ordered');
    X.curve('speed of scene time (every 0.25 s)', Array.from({ length: 59 }, (_, i) => d.warp.sp(i * 0.25)));
  }
});
curLevel('MIMATIC', {
  v: 2, title: 'Learning to frame, the studio and the line-up', focus: 'A camera that learns from its own frames, a turntable studio and the line-up of the five classes (1.9.993 to 1.9.994).',
  studied: [
    { topic: 'Framing', facts: ['The rule of thirds; lead room in the direction of movement; headroom over the eyes', 'A subject leaving the frame is a framing fault to correct'], src: [['StudioBinder: rule of thirds', 'https://www.studiobinder.com/blog/rule-of-thirds-photography/']] }
  ],
  can: ['Shots that widen or lift themselves when the subject leaves their frame, remembered on the device', 'A studio camera that orbits, tilts over to look straight down and zooms within limits', 'The five classes standing in the rain, each lit by its colour'],
  exam: X => {
    // learning to frame: a head out of frame widens the shot, a little at a time, up to a limit
    const L0 = MIM.learn, sh0 = MIM.shots, a0 = MIM.actors; MIM.learn = {}; MIM.shots = [{ tech: ['hero'] }];
    try {
      const op = { W: lgmSolve((() => { const P = lgPose(); lgPoseReset(P); return P; })()) }; MIM.actors = [op];
      const cam = lgCam(); cam.eye = [1.2, 0, 1.0]; cam.tgt = [0, 0, 0.6]; cam.fov = 0.5; lgCamUpd(cam, 16 / 9);
      const ws = []; for (let i = 0; i < 25; i++) { mimLearnFrame(0, cam, 1600, 900); ws.push(MIM.learn[0] ? MIM.learn[0].w : 0); }
      X.curve('learned widening while the head is out of frame', ws);
      X.ok('the shot learned to widen, and stopped at its limit', ws[ws.length - 1] > 0.1 && ws[ws.length - 1] <= 0.19, ws[ws.length - 1].toFixed(2), '0.10 to 0.19');
    } finally { MIM.learn = L0; MIM.shots = sh0; MIM.actors = a0; }
    // the studio camera's limits
    const s0 = Object.assign({}, MIM.studio); try { MIM.studio.view = 'orbit'; MIM.studio.pitch = 0.2; mimStudioDrag(0, 5000); const pHi = MIM.studio.pitch; mimStudioDrag(0, -9000); const pLo = MIM.studio.pitch; mimStudioZoom(99999); const dHi = MIM.studio.dist; mimStudioZoom(-99999); const dLo = MIM.studio.dist; X.ok('studio: tilt stops at straight down and just below level', pHi <= 1.55 && pLo >= -0.15, pLo.toFixed(2) + ' to ' + pHi.toFixed(2), '-0.15 to 1.55'); X.ok('studio: zoom stays between 1.2 and 6 m', dHi <= 6 && dLo >= 1.2, dLo.toFixed(1) + ' to ' + dHi.toFixed(1), '1.2 to 6'); } finally { Object.assign(MIM.studio, s0); }
    // the line-up
    const lu = mimLineup(); X.ok('line-up: five classes', lu.length === 5, lu.length, 5);
    const ys = lu.map(a => a.root[0][2]); X.within('line-up: spacing (m)', Math.abs(ys[0] - ys[1]), 1.0, 1.4, ' m');
  }
});
curLevel('MIMATIC', {
  v: 3, title: 'The camera', focus: 'A camera body and lens: sensor, focal length, aperture, focus, shutter, and the rigs it rides on.',
  studied: [
    { topic: 'Lenses and sensors', facts: ['Angle of view = 2 atan(d / 2f), d the sensor\'s width, height or diagonal', 'Super 35 (4-perf) is 24.89 x 18.66 mm; a 35 mm lens on it sees about 39 degrees across', 'The frame\'s aspect crops the sensor (1.85:1 uses the full width)'], src: [['ARRI Format and Lens Calculator', 'https://www.arri.com/en/learn-help/learn-help-camera-system/tools/format-and-lens-calculator'], ['Angle of view (Wikipedia)', 'https://en.wikipedia.org/wiki/Angle_of_view_(photography)']] },
    { topic: 'Depth of field', facts: ['Hyperfocal distance H = f^2 / (N c) + f', 'Near limit s (H - f) / (H + s - 2f); far limit s (H - f) / (H - s)', 'Blur circle of a point at d with focus at s: A f |d - s| / (d (s - f)), A = f / N', 'Circle of confusion about 0.025 mm on Super 35'], src: [['Depth of field (Wikipedia)', 'https://en.wikipedia.org/wiki/Depth_of_field'], ['Potmesil and Chakravarty 1981, A lens and aperture camera model for synthetic image generation', 'https://doi.org/10.1145/965161.806817']] },
    { topic: 'Shutter, exposure, movement', facts: ['Exposure time = (shutter angle / 360) / fps: 180 degrees at 24 fps is 1/48 s', 'EV = log2(N^2 / t) at ISO 100', 'Pans slow enough that an object takes about 7 s to cross the frame avoid judder (the ASC Manual\'s panning table)', 'The dolly zoom: f(d) = f0 d / d0 keeps the subject\'s size while the background changes', 'Dollies and cranes ease in and out (no jolt: acceleration starts and ends at zero)'], src: [['American Cinematographer Manual (ASC)', 'https://theasc.com/store/american-cinematographer-manual'], ['Dolly zoom (Wikipedia)', 'https://en.wikipedia.org/wiki/Dolly_zoom']] }
  ],
  can: ['A lens set from 14 to 180 mm on four sensors, with the angle of view, depth of field and blur circles they give', 'Moves: locked off, pan and tilt under the judder limit, dolly, crane, arc, Steadicam, handheld, dolly zoom, rack focus, whip pan'],
  exam: X => {
    X.near('35 mm on Super 35: horizontal angle of view (degrees)', mimcAOV(35, 's35', 1.85).h * CUR_DEG, 39.15, 0.05, ' deg');
    X.near('50 mm on full frame: diagonal angle of view (degrees)', 2 * Math.atan(Math.hypot(36, 24) / 100) * CUR_DEG, 46.8, 0.1, ' deg');
    // the engine's projection against the lens formula: a 1 m pole at 4 m through a 50 mm lens
    const body = mimcBody({ f: 50 }), cam = lgCam(); mimcToCam(cam, body, [4, 0, 1], [0, 0, 1]); const a = mimcProject(cam, [0, 0, 0.5], 1.85), b = mimcProject(cam, [0, 0, 1.5], 1.85), g = mimcGate('s35', 1.85);
    X.near('a 1 m pole at 4 m on a 50 mm lens: height on the sensor (mm; f h / d = 12.5)', (a.y - b.y) * -g.h / 2, 12.5, 0.15, ' mm');
    const D = mimcDOF(50, 2.8, 3, 0.025);
    X.near('50 mm f/2.8 focused at 3 m: near limit (m)', D.near, 2.771, 0.005, ' m'); X.near('far limit (m)', D.far, 3.270, 0.005, ' m'); X.near('hyperfocal (m)', D.H, 35.76, 0.05, ' m');
    X.near('blur circle at the near limit equals the circle of confusion (mm)', mimcCoC(50, 2.8, 3, D.near), 0.025, 0.0005, ' mm');
    X.near('180 degrees at 24 fps (exposure, 1/s)', 1 / mimcShutter(180, 24), 48, 0.01);
    X.near('f/2.8, 1/48 s at ISO 800: exposure value (log2(2.8^2 x 48) - 3)', mimcEV(2.8, 1 / 48, 800), 5.556, 0.01);
    // a pan asked to go too fast is slowed under the judder limit; a whip is not
    const pan = mimcMove({ kind: 'pan', eye: [0, 0, 1.6], tgt: [5, 0, 1.6], tgt2: [0, 5, 1.6], dur: 2, f: 35 }), whip = mimcMove({ kind: 'whip', eye: [0, 0, 1.6], tgt: [5, 0, 1.6], tgt2: [0, 5, 1.6], dur: 2, f: 35 });
    let peak = 0; for (let t = 0.01; t < pan.dur; t += 0.01) { const p0 = pan.at(t - 0.01), p1 = pan.at(t); peak = Math.max(peak, curAng(curV3.sub(p0.tgt, p0.eye), curV3.sub(p1.tgt, p1.eye)) * CUR_DEG / 0.01); }
    X.ok('a 90 degree pan asked for in 2 s is slowed', pan.limited && pan.dur > 2, pan.dur.toFixed(1) + ' s', 'longer than 2 s');
    X.within('its fastest moment against the judder limit (degrees a second)', peak, 0, pan.lim * 1.02, ' deg/s'); X.ok('a whip pan stays fast', whip.dur < 0.5, whip.dur.toFixed(2) + ' s', 'under 0.5 s');
    // the dolly zoom: the subject keeps its size, the background does not
    const dz = mimcMove({ kind: 'dollyZoom', eye: [6, 0, 1.6], tgt: [0, 0, 1.6], d1: 2, f: 24, dur: 3 }), size = (t, x) => { const r = dz.at(t), c = mimcToCam(lgCam(), mimcBody({ f: r.f }), r.eye, r.tgt), p = mimcProject(c, [x, 0, 1.1], 1.85), q = mimcProject(c, [x, 0, 2.1], 1.85); return q.y - p.y; };
    const s0 = size(0, 0), s1 = size(3, 0), bg0 = size(0, -8), bg1 = size(3, -8);
    X.within('dolly zoom: the subject\'s size changes by (%)', Math.abs(s1 / s0 - 1) * 100, 0, 1, '%'); X.within('dolly zoom: the wall 8 m behind changes size by (%; it recedes as the camera moves in and widens)', Math.abs(bg1 / bg0 - 1) * 100, 40, 400, '%');
    // a dolly's acceleration starts and ends at zero
    const dl = mimcMove({ kind: 'dolly', eye: [3, 0, 1.6], eye2: [1.5, 0, 1.6], tgt: [0, 0, 1.6], dur: 2 }), x = t => dl.at(t).eye[0], acc = t => (x(t + 0.001) - 2 * x(t) + x(t - 0.001)) / 1e-6;
    X.within('dolly: acceleration at the start and the end (m/s2)', Math.max(Math.abs(acc(0.002)), Math.abs(acc(1.998))), 0, 0.06, ' m/s2');
    // handheld: its strongest wobble between 1 and 6 hertz, a fraction of a degree
    const fs = 120, sig = Array.from({ length: fs * 8 }, (_, i) => mimcHandheld(i / fs, 1, 0).rot[1]); let bf = 0, bm = 0; for (let f = 0.5; f <= 12; f += 0.1) { let re = 0, im = 0; sig.forEach((v, i) => { re += v * Math.cos(TAU * f * i / fs); im += v * Math.sin(TAU * f * i / fs); }); if (Math.hypot(re, im) > bm) { bm = Math.hypot(re, im); bf = f; } }
    const rms = Math.sqrt(sig.reduce((s, v) => s + v * v, 0) / sig.length) * CUR_DEG; X.within('handheld: strongest wobble (Hz)', bf, 1, 6, ' Hz'); X.within('handheld: its size (degrees, rms)', rms, 0.1, 1, ' deg');
    X.curve('depth of field at f/2.8 by focus distance (m), 50 mm', [1, 2, 3, 5, 8, 12].map(s => mimcDOF(50, 2.8, s, 0.025).total));
  }
});
curLevel('MIMATIC', {
  v: 4, title: 'Cinematography: framing and light', focus: 'Shot sizes cut where they should be, composition, clear sightlines, and light designed and metered.',
  studied: [
    { topic: 'Shot sizes and composition', facts: ['Sizes are named by where the frame cuts the body: ECU (the eyes), CU (the top of the chest), MCU (mid-chest), MS (the waist), MLS or cowboy (mid-thigh), FS (head to feet), WS and EWS (small in the world)', 'The eyes on the upper third line; look room on the side the subject faces; never cut at a joint', 'Customary lenses tighten with the size (wide for the wide shots, 85 mm and up for close-ups)'], src: [['StudioBinder: types of camera shots', 'https://www.studiobinder.com/blog/ultimate-guide-to-camera-shots/'], ['Mascelli 1965, The Five C\'s of Cinematography', 'https://en.wikipedia.org/wiki/The_Five_C%27s_of_Cinematography']] },
    { topic: 'Light', facts: ['Three-point lighting: key 30 to 45 degrees off the lens and above, fill opposite, back light behind', 'Lighting ratio (key + fill) : fill: 2:1 high key, 4:1 to 8:1 low key', 'Colour temperature: tungsten 3200 K, daylight 5600 K, sodium about 2000 K; the colour of a black body by Planck\'s law', 'A gaffer meters the key side with everything on and the fill side with the key blocked'], src: [['Brown 2016, Cinematography: Theory and Practice', 'https://www.routledge.com/Cinematography-Theory-and-Practice/Brown/p/book/9781138940925'], ['Wyman, Sloan and Shirley 2013, Simple analytic approximations to the CIE XYZ color matching functions', 'https://jcgt.org/published/0002/02/01/'], ['Planck\'s law (Wikipedia)', 'https://en.wikipedia.org/wiki/Planck%27s_law']] }
  ],
  can: ['Frames any body at any of eight sizes from any side: the cut where it should be, the eyes on the third, look room, no joint on an edge', 'Moves round anyone standing between the lens and the face', 'Designs three-point light in four looks, meters its own render, and corrects the fill until the ratio is right'],
  exam: X => {
    const W = curLgStand(); let worstCut = 0, worstEye = 0, worstLook = 0, joints = 0, n = 0;
    for (const s of MIMV_ORDER) for (const az of [-0.6, 0.0, 0.6]) {
      const r = mimvFrame(W, { size: s, az: az }), Z = MIMV_SIZES[s], c = mimvCuts(r.cam, W), E = mimcProject(r.cam, mimvMark(W, 'eyes'), 1.85); n++;
      if (!Z.top) { worstCut = Math.max(worstCut, Math.abs(c[Z.bottom] + 1)); worstEye = Math.max(worstEye, Math.abs(E.y - Z.eyeY)); }
      else if (Z.botY != null) worstCut = Math.max(worstCut, Math.abs(c.feet - Z.botY), Math.abs(c.top - Z.topY)); else worstCut = Math.max(worstCut, Math.abs((c.top - c.feet) - Z.height * 2));
      worstLook = Math.max(worstLook, Math.abs(E.x - r.lookX)); joints += mimvJointCut(r.cam, W).length;
    }
    X.within('frame edges on their landmarks, 8 sizes from 3 sides (worst, % of frame)', worstCut * 50, 0, 1, '%');
    X.within('the eyes on the upper third (worst, % of frame)', worstEye * 50, 0, 1, '%');
    X.within('look room: subjects on the far third (worst, % of frame)', worstLook * 50, 0, 1, '%');
    X.ok('no frame edge on a knee or an ankle', joints === 0, joints, 0);
    // a person in the way: the camera moves round
    const P2 = lgPose(); lgPoseReset(P2); lgStance(P2, 0.1, 0, 0); P2.root = [1.3, 0.0, 0, Math.PI]; const W2 = lgmSolve(P2), r2 = mimvFrame(W, { size: 'MCU', az: 0.0, blockers: [W2] });
    X.ok('someone between the lens and the face: the camera moves until it is clear', r2.wasBlocked > 0 && !mimvBlocked(r2.cam.eye, mimvMark(W, 'eyes'), [W2]), r2.wasBlocked ? 'moved ' + (r2.moved * CUR_DEG).toFixed(0) + ' deg' : 'not blocked', 'clear');
    // colour temperature: the quick formula against Planck's law
    let worstK = 0; for (const T of [2000, 3200, 4300, 5600, 6500]) { const a = mimvKelvin8(T), b = mimvSRGB8(mimvPlanck(T)); worstK = Math.max(worstK, ...a.map((v, i) => Math.abs(v - b[i]))); X.ev['K' + T] = [a, b]; }
    X.within('black-body colours: the per-frame formula against Planck\'s law (worst channel, of 255)', worstK, 0, 8);
    // light: designed, rendered, metered, corrected
    const rc = mimvFrame(W, { size: 'MCU', az: 0.5 }); let worstR = 0;
    for (const look of ['highKey', 'standard', 'lowKey', 'noir']) { const t = mimvTuneFill(W, rc.cam, MIMV_LOOKS[look]); worstR = Math.max(worstR, Math.abs(t.metered / MIMV_LOOKS[look].ratio - 1)); X.curve('lighting ratio error while metering, ' + look + ' (' + MIMV_LOOKS[look].ratio + ':1)', t.curve); }
    X.within('lighting ratios metered from the render against the design (worst error, %)', worstR * 100, 0, 5, '%');
  }
});
curLevel('MIMATIC', {
  v: 5, title: 'Directing: coverage and the cut', focus: 'Which shots to take of a scene, keeping continuity, and where to cut, judged the way editors judge.',
  studied: [
    { topic: 'Coverage', facts: ['The master, two-shots, singles, overs, inserts and points of view', 'Shot and reverse shot; the master establishes the space'], src: [['Mascelli 1965, The Five C\'s of Cinematography', 'https://en.wikipedia.org/wiki/The_Five_C%27s_of_Cinematography'], ['StudioBinder: what is coverage', 'https://www.studiobinder.com/blog/what-is-coverage-in-film/']] },
    { topic: 'Continuity', facts: ['The 180-degree rule: the cameras stay on one side of the line of action, so screen direction holds', 'The 30-degree rule: a cut to the same subject moves the camera 30 degrees or more, or changes the size (else a jump cut)', 'Match on action: cut during a movement, at its peak'], src: [['Bordwell and Thompson, Film Art', 'https://en.wikipedia.org/wiki/Film_Art'], ['180-degree rule (Wikipedia)', 'https://en.wikipedia.org/wiki/180-degree_rule']] },
    { topic: 'The cut', facts: ['Murch\'s rule of six: emotion 51%, story 23%, rhythm 10%, eye-trace 7%, the screen\'s two dimensions 5%, three-dimensional space 4%', 'Average shot length: action about 2 to 3 s (the Bourne films about 2), conversation longer'], src: [['Murch 1995, In the Blink of an Eye', 'https://en.wikipedia.org/wiki/In_the_Blink_of_an_Eye_(Murch_book)'], ['Cutting, Brunick, DeLong, Iricinschi and Candan 2011, Quicker, faster, darker: changes in Hollywood film over 75 years', 'https://doi.org/10.1068/i0441aap']] }
  ],
  can: ['Covers a scene: master, two-shot, singles, overs and inserts for each beat, every camera on one side of the line', 'Cuts it: an edit chosen over all the possibilities by the rule of six, with no jump cuts and cuts on the movement', 'An edit decision list of what is used, from where, and why each cut falls where it does'],
  exam: X => {
    const sc = curMimScene(), ed = mimdEdit(sc, { side: 1 }), j = mimdJudge(sc, ed.edl), nv = mimdJudge(sc, mimdNaive(sc).edl);
    X.ok('every camera of the coverage on one side of the line', ed.cover.every(s => s.side === 1), ed.cover.filter(s => s.side !== 1).length + ' across', 0);
    X.ok('the edit: no crossing of the line', j.crossings === 0, j.crossings, 0); X.ok('the edit: no jump cuts (30-degree rule)', j.jumps === 0, j.jumps, 0);
    X.ok('every beat has a shot', sc.beats.every((b, i) => ed.edl.some(e => e.beat === i)), ed.edl.length + ' shots for ' + sc.beats.length + ' beats', 'all covered');
    X.within('average shot length (s; tense scene about 3)', j.asl, 1.5, 4.5, ' s');
    X.ok('the directed edit scores higher than a careless one (rule of six)', j.score > nv.score * 1.15, j.score.toFixed(3) + ' vs ' + nv.score.toFixed(3), '15% higher');
    X.ok('it opens on the master', ed.edl[0].kind === 'master', ed.edl[0].kind, 'master');
    X.ev.edl = ed.edl.map(e => [e.n, e.kind, e.size, e.who, e.f, +e.in.toFixed(2), +e.out.toFixed(2), e.cut]);
    X.note('edit: ' + ed.edl.map(e => e.size + ' ' + e.kind + (e.who >= 0 ? ' on ' + sc.actors[e.who].name : '') + ' ' + e.in.toFixed(1) + '-' + e.out.toFixed(1) + 's').join(' | '));
    X.curve('rule-of-six parts, directed (emotion, story, rhythm, eye-trace, plane, space)', ['emotion', 'story', 'rhythm', 'eye', 'plane', 'space'].map(k => j.parts[k] / j.shots));
    X.curve('the same, the careless edit', ['emotion', 'story', 'rhythm', 'eye', 'plane', 'space'].map(k => nv.parts[k] / nv.shots));
  }
});
