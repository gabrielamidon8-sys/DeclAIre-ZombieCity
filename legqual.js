/* ================= LEGEND v5: the quality of movement, and performance (1.9.995) =================
   A body that moves correctly can still move badly. LEGEND v5 checks its own movement the way an animation supervisor
   would, with measures from motor-control research and the animator's craft, and it can perform an action in more
   than one way:
   - Feet that stay put: a planted foot does not slide (the most common fault of game animation).
   - No part of the body through another: the limbs as capsules (their thickness from the anthropometry), tested
     against each other every frame.
   - Smoothness: the spectral arc length of a hand's speed (SPARC; Balasubramanian, Melendez-Calderon, Roby-Brami and
     Burdet 2015): healthy reaching is about -1.4 to -2; a jerky one falls well below.
   - Arcs: living movement curves a little (Disney's principle of arcs; reaches are slightly curved), neither ruler-
     straight nor wobbling.
   - Overlap and follow-through: the parts of a chain arrive one after another, proximal first.
   - The eyes lead: the head turns to a thing before the hand goes for it.
   - Breathing at rest: 12 to 20 breaths a minute.
   - Performance (Laban's efforts): the same action done with a different quality of time (sudden or sustained), space
     (direct or indirect), weight (strong or light) and flow (bound or free), and still correct by every check above. */
const LGQ = { checked: 0 };
// the body as capsules: [name, from, to, radius (m)] (radii: half the segment's typical breadth)
const LGQ_CAPS = [
  ['head', 'head', 'headTop', 0.085], ['torso', 'hips', 'chestTop', 0.125], ['neck', 'chestTop', 'head', 0.06],
  ['upper arm L', 'armL', 'foreL', 0.045], ['forearm L', 'foreL', 'handL', 0.037], ['hand L', 'handL', 'knuckleL', 0.03],
  ['upper arm R', 'armR', 'foreR', 0.045], ['forearm R', 'foreR', 'handR', 0.037], ['hand R', 'handR', 'knuckleR', 0.03],
  ['thigh L', 'thighL', 'shinL', 0.068], ['shank L', 'shinL', 'footL', 0.048], ['foot L', 'heelL', 'tipL', 0.035],
  ['thigh R', 'thighR', 'shinR', 0.068], ['shank R', 'shinR', 'footR', 0.048], ['foot R', 'heelR', 'tipR', 0.035]
];
// pairs that cannot pass through each other (joined segments, and contact that is natural, are left out:
// hands may touch anything; the upper arms lie against the torso)
const LGQ_PAIRS = (() => {
  const out = [], n = LGQ_CAPS.map(c => c[0]), ok = (a, b) => {
    if (/^hand/.test(a) || /^hand/.test(b)) return false;
    const join = { 'head': ['torso', 'neck'], 'neck': ['head', 'torso', 'upper arm L', 'upper arm R'], 'torso': ['head', 'neck', 'upper arm L', 'upper arm R', 'thigh L', 'thigh R'], 'upper arm L': ['torso', 'neck', 'forearm L'], 'upper arm R': ['torso', 'neck', 'forearm R'], 'forearm L': ['upper arm L'], 'forearm R': ['upper arm R'], 'thigh L': ['torso', 'shank L', 'thigh R'], 'thigh R': ['torso', 'shank R', 'thigh L'], 'shank L': ['thigh L', 'foot L'], 'shank R': ['thigh R', 'foot R'], 'foot L': ['shank L'], 'foot R': ['shank R'] };
    return !(join[a] || []).includes(b);
  };
  for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) if (ok(n[i], n[j])) out.push([i, j]);
  return out;
})();
// the closest distance between two segments (Ericson, Real-Time Collision Detection 5.1.9)
function lgqSegDist(p1, q1, p2, q2) {
  const d1 = curV3.sub(q1, p1), d2 = curV3.sub(q2, p2), r = curV3.sub(p1, p2), a = curV3.dot(d1, d1), e = curV3.dot(d2, d2), f = curV3.dot(d2, r);
  let s, t; if (a < 1e-9 && e < 1e-9) return curV3.len(r);
  if (a < 1e-9) { s = 0; t = clamp(f / e, 0, 1); }
  else { const c = curV3.dot(d1, r); if (e < 1e-9) { t = 0; s = clamp(-c / a, 0, 1); } else { const b = curV3.dot(d1, d2), den = a * e - b * b; s = den > 1e-9 ? clamp((b * f - c * e) / den, 0, 1) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); } } }
  return curV3.len(curV3.sub(curV3.add(p1, curV3.mul(d1, s)), curV3.add(p2, curV3.mul(d2, t))));
}
// how deep any two parts of the body go into each other in one pose (soft tissue gives: 2 cm is allowed)
function lgqCollide(W, give) {
  give = give == null ? 0.02 : give; const C = LGQ_CAPS.map(c => [lgaMark(W, c[1]), lgaMark(W, c[2]), c[3]]); let worst = 0, pair = null;
  for (const [i, j] of LGQ_PAIRS) { const pen = C[i][2] + C[j][2] - lgqSegDist(C[i][0], C[i][1], C[j][0], C[j][1]); if (pen > worst) { worst = pen; pair = [LGQ_CAPS[i][0], LGQ_CAPS[j][0]]; } }
  return { pen: worst, over: worst > give, pair: pair };
}
// feet: while a foot's sole is on the ground and not lifting, how fast does it slide? (m/s, and the total metres)
function lgqFeet(frames, fps, ground) {
  ground = ground || 0; let worst = 0, dist = 0, planted = 0; const prev = {};
  frames.forEach((W, i) => {
    for (const s of ['L', 'R']) {
      const h = lgaMark(W, 'heel' + s), tp = lgaMark(W, 'tip' + s), low = h[2] < tp[2] ? h : tp, k = s + (h[2] < tp[2] ? 'h' : 't');
      const on = Math.min(h[2], tp[2]) - ground < 0.025;
      if (on && prev[k] && i) { const dz = Math.abs(low[2] - prev[k][2]) * fps, v = Math.hypot(low[0] - prev[k][0], low[1] - prev[k][1]) * fps; if (dz < 0.12) { planted++; worst = Math.max(worst, v); dist += v / fps; } }
      prev[s + 'h'] = h; prev[s + 't'] = tp;
    }
  });
  return { slide: worst, dist: dist, planted: planted };
}
// smoothness: the spectral arc length of a speed profile (SPARC). The profile is zero-padded, its spectrum normalised
// by the zero frequency, cut where it falls under 5% (or at 10 Hz), and the length of that curve is the (negative) answer
function lgqSPARC(v, fs, o) {
  o = o || {}; const fc = o.fc || 10, th = o.th || 0.05; let n = 1; while (n < v.length) n <<= 1; n <<= 2;
  const K = Math.floor(fc * n / fs) + 1, mag = new Float64Array(K);
  for (let k = 0; k < K; k++) { let re = 0, im = 0; const w = -TAU * k / n; for (let i = 0; i < v.length; i++) { re += v[i] * Math.cos(w * i); im += v[i] * Math.sin(w * i); } mag[k] = Math.hypot(re, im); }
  const m0 = mag[0] || 1; for (let k = 0; k < K; k++) mag[k] /= m0;
  let last = 0; for (let k = 0; k < K; k++) if (mag[k] >= th) last = k;
  const wc = Math.max(1, last); let L = 0; for (let k = 1; k <= wc; k++) L += Math.hypot(1 / wc, mag[k] - mag[k - 1]);
  return -L;
}
// arcs: how far a path bows from the straight line between its ends (a fraction of its length), and how often it
// changes the side it bows to (wobbles)
function lgqArc(pts) {
  const a = pts[0], b = pts[pts.length - 1], ab = curV3.sub(b, a), L = curV3.len(ab) || 1e-9, u = curV3.mul(ab, 1 / L);
  let dev = 0, n0 = null, flips = 0, lastS = 0;
  for (const p of pts) { const ap = curV3.sub(p, a), perp = curV3.sub(ap, curV3.mul(u, curV3.dot(ap, u))), d = curV3.len(perp); if (d > dev) { dev = d; n0 = curV3.norm(perp); } }
  if (n0) for (const p of pts) { const ap = curV3.sub(p, a), perp = curV3.sub(ap, curV3.mul(u, curV3.dot(ap, u))), sd = curV3.dot(perp, n0); if (Math.abs(sd) > dev * 0.15) { const sg = Math.sign(sd); if (lastS && sg !== lastS) flips++; lastS = sg; } }
  return { bow: dev / L, flips: flips, len: L };
}
// a whole run's quality: feet, collisions, and (for reaches) the hand's smoothness and arc
function lgqRun(run, o) {
  o = o || {}; const fps = run.fps, out = { slide: 0, slideDist: 0, pen: 0, pair: null, frames: run.frames.length };
  const nA = run.frames[0].W.length;
  for (let a = 0; a < nA; a++) {
    const Ws = run.frames.map(f => f.W[a]), ft = lgqFeet(Ws, fps); out.slide = Math.max(out.slide, ft.slide); out.slideDist += ft.dist;
    for (let i = 0; i < Ws.length; i += o.step || 2) { const c = lgqCollide(Ws[i]); if (c.pen > out.pen) { out.pen = c.pen; out.pair = c.pair; out.at = run.frames[i].t; } }
  }
  if (run.perf.kind === 'reach') {
    const pf = run.perf, s = pf.side, i0 = Math.round(pf.t.hand * fps), i1 = Math.round(pf.t.touch * fps), wr = lgmPath(run, 'hand' + s).slice(i0, i1 + 1), v = lgmSpeed(wr, fps).slice(1);
    out.sparc = lgqSPARC(v, fps); const arc = lgqArc(wr); out.bow = arc.bow; out.flips = arc.flips;
    // the eyes lead: the head is turned to the thing (within 12 degrees) before the hand reaches its top speed
    const tv = pf.t.hand + pf.MT * 0.42; let tHead = null;
    for (const f of run.frames) { const W = f.W[0], H = W.subarray(LGB.head * 16, LGB.head * 16 + 16), fw = [H[0], H[1], H[2]], to = curV3.sub([pf.OW[12], pf.OW[13], pf.OW[14]], [H[12], H[13], H[14]]); if (curAng(fw, to) * CUR_DEG < (o.gazeTol || 25)) { tHead = f.t; break; } }
    out.headFirst = tHead != null ? tv - tHead : -1;
  }
  LGQ.checked++;
  return out;
}
// the game's own clips through the same checks (the feet are judged only where a clip stands its ground)
function lgqClip(clip, o) {
  o = o || {}; const fps = o.fps || 60, dur = clip.dur || 1, n = Math.max(2, Math.round(dur * fps)), frames = [];
  for (let i = 0; i <= n; i++) { const P = lgPose(); lgEvalClip(clip, i / fps, P, { inPlace: true }); frames.push(lgmSolve(P)); }
  let pen = 0, pair = null; for (let i = 0; i < frames.length; i += 2) { const c = lgqCollide(frames[i]); if (c.pen > pen) { pen = c.pen; pair = c.pair; } }
  return { pen: pen, pair: pair, feet: lgqFeet(frames, fps) };
}
// breathing: the chest's rise and fall in an idle, as breaths a minute: the strongest rhythm of the chest's pitch between
// 8 and 30 a minute (its spectrum over the clip)
function lgqBreaths(clipId, secs) {
  const c = LG_ANIM_BY[clipId]; if (!c) return 0; const fps = 30, n = Math.round((secs || 16) * fps), x = [];
  for (let i = 0; i < n; i++) { const P = lgPose(); lgEvalClip(c, i / fps, P, { inPlace: true }); x.push(P.r[LGB.chest * 3 + 1]); }
  const m = x.reduce((a, b) => a + b, 0) / n; let best = 0, bf = 0;
  for (let bpm = 8; bpm <= 30; bpm += 0.25) { const f = bpm / 60; let re = 0, im = 0; for (let i = 0; i < n; i++) { re += (x[i] - m) * Math.cos(TAU * f * i / fps); im += (x[i] - m) * Math.sin(TAU * f * i / fps); } const a = Math.hypot(re, im); if (a > best) { best = a; bf = bpm; } }
  return bf;
}
/* ---------- Laban's efforts ---------- */
// time: +1 sudden .. -1 sustained; space: +1 direct .. -1 indirect; weight: +1 strong .. -1 light; flow: +1 free .. -1 bound
const LGQ_EFFORTS = {
  neutral: { time: 0, space: 0, weight: 0, flow: 0 }, punch: { time: 1, space: 1, weight: 1, flow: -0.3 }, press: { time: -1, space: 1, weight: 1, flow: -0.6 },
  glide: { time: -1, space: 1, weight: -1, flow: 0.2 }, float: { time: -1, space: -1, weight: -1, flow: 0.6 }, dab: { time: 1, space: 1, weight: -1, flow: -0.2 },
  flick: { time: 1, space: -1, weight: -1, flow: 0.6 }, slash: { time: 1, space: -1, weight: 1, flow: 0.5 }, wring: { time: -1, space: -1, weight: 1, flow: -0.6 }
};
// what each effort does to a reach: the time scales its duration, flow shapes its bell (bound: a long careful landing),
// space bends its path (indirect: a wide arc), weight sets the body's height and how hard the grip closes
function lgqEffort(e) {
  e = Object.assign({ time: 0, space: 0, weight: 0, flow: 0 }, typeof e === 'string' ? LGQ_EFFORTS[e] : e);
  const peak = clamp(0.42 + 0.06 * e.flow + 0.04 * e.time, 0.3, 0.55), a = 5 * peak, b = 5 - a;
  return { e: e, mtK: Math.pow(2, -0.65 * e.time), bell: lgmBell(a, b), peak: peak, lat: 0.02 + 0.08 * Math.max(0, -e.space) - 0.02 * Math.max(0, e.space), crouch: 0.03 * e.weight, secureK: Math.pow(2, -0.5 * e.weight) };
}
