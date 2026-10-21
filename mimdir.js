/* ================= MIMATIC v5: directing, coverage and the cut (1.9.995) =================
   With bodies that act (LEGEND) and a camera that frames and lights them (MIMATIC v3, v4), what is left is the
   director's part: which shots to take of a scene, and where to cut between them.
   - Coverage: for each beat, the shots a director would ask for: the master (everyone, wide), two-shots, singles on
     each person (angled toward the face), overs (over one person's shoulder onto the other), inserts (the hands and the
     thing they handle) and points of view.
   - Continuity: the line of action (between the two people, or along a movement) and the 180-degree rule: every camera
     on one side of it, so screen direction holds; the 30-degree rule: a cut to the same subject moves the camera at
     least 30 degrees or changes the size by two steps (or it jumps); match on action: a cut during movement falls on
     the movement's peak, so the motion carries across it.
   - Pacing: the average shot length set by the scene's mood (action about 2 to 3 s, conversation 4 to 6).
   - The choice of cut, scored by Murch's rule of six (In the Blink of an Eye): emotion 51%, story 23%, rhythm 10%,
     eye-trace 7%, the two-dimensional plane of the screen 5%, three-dimensional space 4%.
   - The result: an edit decision list (what, from where, in and out), the cameras, and the cuts' reasons. */
const MIMD = { made: 0 };
const MIMD_W = { emotion: 0.51, story: 0.23, rhythm: 0.10, eye: 0.07, plane: 0.05, space: 0.04 };
const MIMD_ASL = { action: 2.2, tense: 3.0, calm: 4.5, talk: 5.0 };
/* ---------- a scene for the director ---------- */
// actors: [{ name, W(t) -> world matrices }]; beats: [{ t0, t1, who (actor index), what, kind: 'action' | 'emotion' | 'handle' | 'look',
// focus: 'face' | 'hands' | 'body', peak (a time when the movement is fastest) }]; mood; dur
function mimdScene(o) { return Object.assign({ actors: [], beats: [], mood: 'action', dur: 1, fps: 24 }, o); }
// a scene from a LEGEND performance (one or two people), with its beats
function mimdFromPerf(pf, o) {
  o = o || {}; const run = lgmRun(pf, 60), n = run.frames[0].W.length, actors = [];
  for (let a = 0; a < n; a++) actors.push({ name: (o.names || ['A', 'B'])[a], W: t => run.frames[clamp(Math.round(t * 60), 0, run.frames.length - 1)].W[a] });
  const beats = (o.beats || []).map(b => Object.assign({}, b)); return mimdScene({ actors: actors, beats: beats, mood: o.mood || 'action', dur: pf.dur, run: run, things: t => run.frames[clamp(Math.round(t * 60), 0, run.frames.length - 1)].things });
}
/* ---------- the line of action ---------- */
function mimdLine(sc, t) {
  const A = sc.actors[0].W(t), a = mimvMark(A, 'eyes');
  if (sc.actors.length > 1) { const b = mimvMark(sc.actors[1].W(t), 'eyes'); return { p: a, d: curV3.norm([b[0] - a[0], b[1] - a[1], 0]), two: true }; }
  const f = mimvFacing(A); return { p: a, d: [Math.cos(f), Math.sin(f), 0], two: false };   // one person: the line along where they face
}
// which side of the line a camera stands (+1 / -1)
function mimdSide(line, eye) { const v = curV3.sub(eye, line.p); return Math.sign(line.d[0] * v[1] - line.d[1] * v[0]) || 1; }
/* ---------- coverage: the candidate shots ---------- */
// a shot: { kind, size, who, cam (at the beat's middle), eye, az, side, beat }
function mimdCoverage(sc, side) {
  const shots = [], aspect = 1.85;
  sc.beats.forEach((b, bi) => {
    const tm = (b.t0 + b.t1) / 2, line = mimdLine(sc, tm), who = b.who || 0, Ws = sc.actors.map(a => a.W(tm)), W = Ws[who], other = Ws[1 - who];
    // an angle round the subject that puts the camera on the chosen side of the line
    const azFor = (base) => { const f = mimvFacing(W); for (const az of [base, -base]) { const a = f + az, eye = curV3.add(mimvMark(W, 'eyes'), [Math.cos(a) * 3, Math.sin(a) * 3, 0]); if (mimdSide(line, eye) === side) return az; } return base; };
    const add = (kind, size, az, extra) => { const r = mimvFrame(W, Object.assign({ size: size, az: az, aspect: aspect, blockers: other ? [other] : null }, extra)); shots.push({ kind: kind, size: size, who: who, cam: r.cam, eye: r.cam.eye.slice(), tgt: r.cam.tgt.slice(), f: r.body.f, az: az + (r.moved || 0), side: mimdSide(line, r.cam.eye), beat: bi, blocked: r.blocked }); };
    // the master: wide, square to the line, everyone in
    { const mid = other ? curV3.lerp(mimvMark(W, 'eyes'), mimvMark(other, 'eyes'), 0.5) : mimvMark(W, 'eyes'), nrm = [-line.d[1] * side, line.d[0] * side, 0], body = mimcBody({ f: 27 }), cam = lgCam(); mimcToCam(cam, body); const span = other ? curV3.len(curV3.sub(mimvMark(W, 'eyes'), mimvMark(other, 'eyes'))) + 1.4 : 1.6, D = span / 2 / Math.tan(mimcAOV(27, 's35', aspect).h / 2) * 1.1 + 1; cam.eye = curV3.add(mid, curV3.add(curV3.mul(nrm, D), [0, 0, -0.1])); cam.tgt = [mid[0], mid[1], mid[2] - 0.35]; shots.push({ kind: 'master', size: 'WS', who: -1, cam: cam, eye: cam.eye.slice(), tgt: cam.tgt.slice(), f: 27, az: 0, side: mimdSide(line, cam.eye), beat: bi }); }
    if (other) add('two', 'MLS', azFor(1.25), { look: 'center' });
    add('single', b.focus === 'face' || b.kind === 'emotion' ? 'CU' : 'MCU', azFor(0.55));
    add('single', 'MS', azFor(0.85));
    if (other) { const ots = mimvFrame(W, { size: 'MCU', az: azFor(0.35), aspect: aspect }); shots.push({ kind: 'over', size: 'MCU', who: who, cam: ots.cam, eye: ots.cam.eye.slice(), tgt: ots.cam.tgt.slice(), f: ots.body.f, az: azFor(0.35), side: mimdSide(line, ots.cam.eye), beat: bi, over: true }); }
    if (b.kind === 'handle' || b.focus === 'hands') {
      // the insert: close on the hands and the thing, from the camera's side
      const hp = curV3.lerp(lgaP(W, 'handR'), lgaP(W, 'handL'), b.hand === 'L' ? 1 : b.hand === 'R' ? 0 : 0.5), f = mimvFacing(W), az = azFor(0.9), a = f + az, cam = lgCam(); mimcToCam(cam, mimcBody({ f: 85 }));
      cam.eye = [hp[0] + Math.cos(a) * 1.1, hp[1] + Math.sin(a) * 1.1, hp[2] + 0.35]; cam.tgt = hp.slice(); shots.push({ kind: 'insert', size: 'ECU', who: who, cam: cam, eye: cam.eye.slice(), tgt: cam.tgt.slice(), f: 85, az: az, side: mimdSide(line, cam.eye), beat: bi });
    }
  });
  return shots;
}
/* ---------- judging a shot and a cut ---------- */
// where the eye goes in a shot at a moment: the beat's subject (the face, or the hands for handling)
function mimdAttention(sc, shot, t, beat) {
  const who = beat.who || 0, W = sc.actors[who].W(t), p = beat.focus === 'hands' || beat.kind === 'handle' ? curV3.lerp(lgaP(W, 'handR'), lgaP(W, 'handL'), 0.5) : mimvMark(W, 'eyes');
  const cam = mimdCamAt(shot, sc, t); return mimcProject(cam, p, 1.85);
}
// a shot's camera at any moment (it keeps its place; it pans to keep its subject where it framed it)
function mimdCamAt(shot, sc, t) {
  const cam = lgCam(); mimcToCam(cam, mimcBody({ f: shot.f })); cam.eye = shot.eye.slice();
  if (shot.who >= 0) { const W0 = sc.actors[shot.who].W((sc.beats[shot.beat].t0 + sc.beats[shot.beat].t1) / 2), W1 = sc.actors[shot.who].W(t), d = curV3.sub(lgaP(W1, 'chest'), lgaP(W0, 'chest')); cam.tgt = curV3.add(shot.tgt, d); } else cam.tgt = shot.tgt.slice();
  return cam;
}
// how well a shot serves a beat (0..1 each): emotion (the face, big enough), story (the subject's action visible, not blocked)
function mimdServe(sc, shot, beat, t) {
  const who = beat.who || 0, W = sc.actors[who].W(t), cam = mimdCamAt(shot, sc, t), E = mimcProject(cam, mimvMark(W, 'eyes'), 1.85), H = mimcProject(cam, curV3.lerp(lgaP(W, 'handR'), lgaP(W, 'handL'), 0.5), 1.85);
  const inF = q => q.front && Math.abs(q.x) < 0.95 && Math.abs(q.y) < 0.95, sizeK = { ECU: 1, CU: 1, MCU: 0.85, MS: 0.65, MLS: 0.45, FS: 0.3, WS: 0.2, EWS: 0.1 }[shot.size] || 0.3;
  const faceOn = Math.cos(Math.atan2(Math.sin(shot.az), Math.cos(shot.az))), faceVis = inF(E) && shot.who === who && shot.kind !== 'insert' ? clamp(faceOn * 1.2, 0, 1) : (shot.who < 0 && inF(E) ? 0.25 : 0);
  const emotion = beat.kind === 'emotion' || beat.focus === 'face' ? faceVis * sizeK : faceVis * 0.5;
  const handsVis = inF(H) ? 1 : 0, story = beat.kind === 'handle' || beat.focus === 'hands' ? handsVis * (shot.kind === 'insert' ? 1 : sizeK > 0.6 ? 0.55 : 0.75) : (inF(E) ? (shot.who === who || shot.who < 0 ? 1 : 0.5) : 0) * (shot.blocked > 0.5 ? 0.3 : 1);
  return { emotion: emotion, story: story };
}
// the 30-degree rule between two shots: a cut to the same subject must turn the camera 30 degrees round it or change size by 2
function mimd30(a, b, sc, t) {
  if (a.who !== b.who || a.who < 0) return { ok: true, ang: 180, dsz: 9 };
  const W = sc.actors[a.who].W(t), c = mimvMark(W, 'eyes'), ang = curAng(curV3.sub(a.eye, c), curV3.sub(b.eye, c)) * CUR_DEG, dsz = Math.abs(MIMV_ORDER.indexOf(a.size) - MIMV_ORDER.indexOf(b.size));
  return { ok: ang >= 30 || dsz >= 2, ang: ang, dsz: dsz };
}
/* ---------- the edit ---------- */
// cut points: the beats' boundaries, and inside long beats the movement's peaks (match on action) or even steps
function mimdCutTimes(sc) {
  const asl = MIMD_ASL[sc.mood] || 3, out = [0];
  for (const b of sc.beats) {
    const len = b.t1 - b.t0, n = Math.max(1, Math.round(len / asl)); if (b.t0 > out[out.length - 1] + 0.3) out.push(b.t0);
    if (n > 1) for (let i = 1; i < n; i++) { let t = b.t0 + len * i / n; if (b.peak && Math.abs(b.peak - t) < len / n / 2) t = b.peak; out.push(t); }
    else if (b.peak && b.peak - b.t0 > 0.6 && b.t1 - b.peak > 0.6 && len > asl * 0.8) out.push(b.peak);
  }
  const uniq = [...new Set(out.map(t => +t.toFixed(3)))].sort((x, y) => x - y).filter((t, i, a) => i === 0 || t - a[i - 1] > 0.5);
  if (sc.dur - uniq[uniq.length - 1] < 0.5) uniq.pop();
  return uniq;
}
// the best sequence of shots over the cut points (dynamic programming), scored by the rule of six
function mimdEdit(sc, o) {
  o = o || {}; const side = o.side || 1, cover = o.cover || mimdCoverage(sc, side), cuts = mimdCutTimes(sc), segs = cuts.map((t, i) => [t, i + 1 < cuts.length ? cuts[i + 1] : sc.dur]);
  const beatAt = t => sc.beats.find(b => t >= b.t0 - 1e-6 && t < b.t1) || sc.beats[sc.beats.length - 1], asl = MIMD_ASL[sc.mood] || 3;
  const segScore = (sh, s) => { const b = beatAt((s[0] + s[1]) / 2); if (sc.beats.indexOf(b) !== sh.beat && sh.kind !== 'master') return null; let em = 0, st = 0; const n = 4; for (let k = 0; k < n; k++) { const t = s[0] + (s[1] - s[0]) * (k + 0.5) / n, v = mimdServe(sc, sh, b, t); em += v.emotion / n; st += v.story / n; } if (sh.side !== side) return null; const len = s[1] - s[0]; return { em: em, st: st, rh: Math.exp(-Math.pow(Math.log(len / asl), 2)) }; };
  const cutScore = (a, b, t) => { const r30 = mimd30(a, b, sc, t); if (!r30.ok || a === b) return null; const ba = beatAt(t - 0.02), bb = beatAt(t + 0.02), pa = mimdAttention(sc, a, t, ba), pb = mimdAttention(sc, b, t, bb), eye = 1 - clamp(Math.hypot(pa.x - pb.x, pa.y - pb.y) / 1.5, 0, 1); const plane = a.side === b.side ? 1 : 0, space = clamp(r30.ang / 60, 0, 1) * 0.5 + (r30.dsz >= 1 ? 0.5 : 0); const peakOn = sc.beats.some(x => x.peak && Math.abs(x.peak - t) < 1 / 24) || sc.beats.some(x => Math.abs(x.t0 - t) < 1 / 24) ? 1 : 0.6; return { eye: eye, plane: plane, space: space, rhythm: peakOn }; };
  const N = segs.length, best = [], from = [];
  for (let i = 0; i < N; i++) {
    best.push(new Map()); from.push(new Map());
    for (const sh of cover) {
      const ss = segScore(sh, segs[i]); if (!ss) continue; const own = MIMD_W.emotion * ss.em + MIMD_W.story * ss.st + MIMD_W.rhythm * 0.5 * ss.rh;
      if (i === 0) { if (sh.kind !== 'master' && !sc.coldOpen) continue; best[0].set(sh, own); from[0].set(sh, null); continue; }   // (the first shot establishes the space: the master, unless the scene opens cold)
      let bv = -1e9, bf = null;
      for (const [pv, val] of best[i - 1]) { const c = cutScore(pv, sh, segs[i][0]); if (!c) continue; const v = val + own + MIMD_W.eye * c.eye + MIMD_W.plane * c.plane + MIMD_W.space * c.space + MIMD_W.rhythm * 0.5 * c.rhythm; if (v > bv) { bv = v; bf = pv; } }
      if (bf) { best[i].set(sh, bv); from[i].set(sh, bf); }
    }
  }
  let last = null, lv = -1e9; for (const [sh, v] of best[N - 1] || []) if (v > lv) { lv = v; last = sh; }
  const seq = []; for (let i = N - 1; i >= 0 && last; i--) { seq.unshift(last); last = from[i].get(last); }
  const edl = seq.map((sh, i) => ({ n: i + 1, kind: sh.kind, size: sh.size, who: sh.who, f: sh.f, in: segs[i][0], out: segs[i][1], side: sh.side, shot: sh, beat: sc.beats.indexOf(beatAt((segs[i][0] + segs[i][1]) / 2)), cut: i ? (sc.beats.some(x => x.peak && Math.abs(x.peak - segs[i][0]) < 1 / 24) ? 'on the movement (match on action)' : 'at the beat') : 'open' }));
  MIMD.made++;
  return { edl: edl, cover: cover, cuts: cuts, score: lv / Math.max(1, N), side: side };
}
// the same scene cut without a director: every cut from one shot to whichever comes next in the list (for comparison)
function mimdNaive(sc, o) {
  o = o || {}; const cover = mimdCoverage(sc, 1).concat(mimdCoverage(sc, -1)), cuts = mimdCutTimes(sc), rng = curRng(o.seed || 5), edl = [];
  cuts.forEach((t, i) => { const out = i + 1 < cuts.length ? cuts[i + 1] : sc.dur, bi = sc.beats.findIndex(b => (t + out) / 2 >= b.t0 && (t + out) / 2 < b.t1), opts = cover.filter(s => s.beat === (bi < 0 ? 0 : bi)); const sh = opts[Math.floor(rng() * opts.length)]; edl.push({ n: i + 1, kind: sh.kind, size: sh.size, who: sh.who, f: sh.f, in: t, out: out, side: sh.side, shot: sh, beat: bi }); });
  return { edl: edl };
}
// the rule-of-six score of any cut list (the same measure the director used), and its continuity faults
function mimdJudge(sc, edl) {
  const asl = MIMD_ASL[sc.mood] || 3; let tot = 0, cross = 0, jump = 0; const parts = { emotion: 0, story: 0, rhythm: 0, eye: 0, plane: 0, space: 0 };
  edl.forEach((e, i) => {
    const b = sc.beats[Math.max(0, e.beat)] || sc.beats[0]; let em = 0, st = 0; for (let k = 0; k < 4; k++) { const v = mimdServe(sc, e.shot, b, e.in + (e.out - e.in) * (k + 0.5) / 4); em += v.emotion / 4; st += v.story / 4; }
    parts.emotion += em; parts.story += st; parts.rhythm += 0.5 * Math.exp(-Math.pow(Math.log((e.out - e.in) / asl), 2));
    if (i) { const p = edl[i - 1], r = mimd30(p.shot, e.shot, sc, e.in); if (!r.ok) jump++; if (p.side !== e.side) cross++; const pa = mimdAttention(sc, p.shot, e.in, sc.beats[Math.max(0, p.beat)]), pb = mimdAttention(sc, e.shot, e.in, b); parts.eye += 1 - clamp(Math.hypot(pa.x - pb.x, pa.y - pb.y) / 1.5, 0, 1); parts.plane += p.side === e.side ? 1 : 0; parts.space += r.ok ? 1 : 0; parts.rhythm += sc.beats.some(x => x.peak && Math.abs(x.peak - e.in) < 1 / 24) ? 0.5 : 0.3; }
  });
  for (const k in parts) tot += MIMD_W[k] * parts[k];
  const lens = edl.map(e => e.out - e.in), aslGot = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);
  return { score: tot / Math.max(1, edl.length), parts: parts, crossings: cross, jumps: jump, asl: aslGot, shots: edl.length };
}
