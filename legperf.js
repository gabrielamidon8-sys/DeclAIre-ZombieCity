/* ================= LGP: the performance layer, so a keyframed body moves like a captured one (1.9.996) =================
   Keyframed motion arrives everywhere at once and stops dead; a person's body does not. Captured motion carries three
   things a hand-set pose lacks, and this layer adds them to every LEGEND performance (the studio's clips, the cinematics'
   actors) without touching the clips themselves:
   - Overlap and follow-through. Each part of the body answers its parent a little late and settles past the mark: the
     spine after the pelvis, the head after the chest (and bobbing back), a free arm after the shoulder. Every joint's
     angle is the clip's angle filtered through a damped spring (its own stiffness: the trunk stiff, the head and free
     arms looser), computed from the clip's own past rather than from state, so a cinematic can still be scrubbed to any
     time and gives the same frame.
   - Micro-motion. A standing person is never still: the body sways slowly over the feet (0 to 0.5 Hz, the centre of
     pressure wandering about 9 mm a second), the head and trunk make small corrections, the breath lifts the chest
     12 to 15 times a minute (posturography and respiratory norms). Small, slow, layered noise does that.
   - Weight. Hands on a gun, feet on the ground and anything else held by reach stay exactly where the clip put them;
     only the free parts trail.
   lgpEval(clip, t, P, ctx, o) poses P like lgEvalClip, with the layer on. */
const LGP = { on: true, n: 0 };
// the spring per part: [frequency Hz, damping ratio]; parts not listed are left as the clip has them
// (1.9.997: stiffer than at first. A hand-keyed clip already carries its follow-through; the layer adds the last few
// hundredths of a second of lag and settle a captured body has, not a second swing on top. The arms at 3.8 Hz lagged a
// sprint's swing by a quarter of its cycle and overshot it: they read as wider and later than the clip.)
const LGP_SPRING = {
  pelvis: [10, 0.9], spine: [9, 0.85], chest: [8, 0.8], neck: [6.5, 0.72], head: [5.5, 0.68],
  clavL: [7, 0.72], clavR: [7, 0.72], armL: [7, 0.7], armR: [7, 0.7], foreL: [8, 0.7], foreR: [8, 0.7], handL: [9, 0.68], handR: [9, 0.68]
};
const LGP_TAUS = [0, 0.012, 0.025, 0.04, 0.058, 0.08, 0.105, 0.135, 0.17, 0.21, 0.26, 0.32];
// the filter weights for a spring: the impulse response of a damped second-order system sampled at the taus (trapezoid
// rule), normalized so a held pose stays put; underdamped springs have a negative lobe (the overshoot)
const LGP_W = (() => {
  const out = {}, cache = {};
  for (const k in LGP_SPRING) {
    const [f, z] = LGP_SPRING[k], key = f + '|' + z; if (cache[key]) { out[k] = cache[key]; continue; }
    const w = 2 * Math.PI * f, wd = w * Math.sqrt(Math.max(1e-4, 1 - z * z)), h = LGP_TAUS.map(t => Math.exp(-z * w * t) * Math.sin(wd * t) * w / Math.sqrt(Math.max(1e-4, 1 - z * z)));
    const ws = LGP_TAUS.map((t, i) => { const a = i > 0 ? (t - LGP_TAUS[i - 1]) / 2 : 0, b = i < LGP_TAUS.length - 1 ? (LGP_TAUS[i + 1] - t) / 2 : 0; return h[i] * (a + b); });
    const sum = ws.reduce((s, x) => s + x, 0) || 1; out[k] = cache[key] = ws.map(x => x / sum);
  }
  return out;
})();
const LGP_TMP = LGP_TAUS.map(() => lgPose()), LGP_RAW = lgPose();
// the gear's springs (slow and lightly damped: a whippy antenna, a heavy pouch, light strap tails)
const LGP_GW = (() => { const mk = (f, z) => { const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - z * z), h = LGP_TAUS.map(t => Math.exp(-z * w * t) * Math.sin(wd * t)), ws = LGP_TAUS.map((t, i) => { const a = i > 0 ? (t - LGP_TAUS[i - 1]) / 2 : 0, b = i < LGP_TAUS.length - 1 ? (LGP_TAUS[i + 1] - t) / 2 : 0; return h[i] * (a + b); }), sm = ws.reduce((s2, x) => s2 + x, 0) || 1; return ws.map(x => x / sm); }; return { antenna: mk(2.4, 0.18), dump: mk(3.2, 0.3), tail: mk(2.6, 0.22) }; })();
const LGP_IDX = Object.keys(LGP_SPRING).map(n => [LGB[n], LGP_W[n], n]);
// o: { noise (0..1, the micro-motion), springs (0..1, the overlap), free: [bone names left alone] }
function lgpEval(a, t, P, ctx, o) {
  o = o || {};
  lgEvalClip(a, t, P, ctx);
  if (!LGP.on) return P;
  // (springs 0: the micro-motion alone, for the weakest devices; the past samples are most of the layer's cost)
  if (o.springs !== 0) lgpSprings(a, t, P, ctx, o);
  lgpNoise(P, t, o);
  LGP.n++;
  return P;
}
function lgpSprings(a, t, P, ctx, o) {
  const tc = lgClipT(a, t);
  // the clip's own past, a sample per tau (a looped clip wraps; a one-shot holds its first frame before it starts)
  for (let k = 1; k < LGP_TAUS.length; k++) lgEvalClip(a, a.loop ? tc - LGP_TAUS[k] : Math.max(0, tc - LGP_TAUS[k]), LGP_TMP[k], ctx);
  LGP_RAW.r.set(P.r); LGP_RAW.t.set(P.t);
  const sk = o.springs == null ? 1 : o.springs;
  // an arm held by reach is placed by its target, not its angles: leave it; and an arm that has just let go (any past
  // sample still held) is left to the clip too: its angles in those samples were never meaningful, and blending them in
  // swung the freed arm out wide and late (1.9.997)
  const heldL = !!P.ik.handL, heldR = !!P.ik.handR; let wasL = heldL, wasR = heldR;
  for (let k = 1; k < LGP_TAUS.length && !(wasL && wasR); k++) { if (LGP_TMP[k].ik.handL) wasL = true; if (LGP_TMP[k].ik.handR) wasR = true; }
  for (const [bi, w, name] of LGP_IDX) {
    if (bi == null) continue;
    if ((name === 'armL' || name === 'foreL' || name === 'handL') && wasL) continue;
    if ((name === 'armR' || name === 'foreR' || name === 'handR') && wasR) continue;
    for (let c = 0; c < 3; c++) {
      // (angles are blended by their wrapped differences from the present, so a joint that turns through a full circle,
      // or a clip that wraps an angle, never blends across the seam into an inverted pose)
      const i = bi * 3 + c, cur = P.r[i]; let y = 0;
      for (let k = 1; k < LGP_TAUS.length; k++) { let d = LGP_TMP[k].r[i] - cur; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; y += d * w[k]; }
      P.r[i] += y * sk;
    }
    if (name === 'pelvis') for (let c = 0; c < 3; c++) { const i = bi * 3 + c; let y = P.t[i] * w[0]; for (let k = 1; k < LGP_TAUS.length; k++) y += LGP_TMP[k].t[i] * w[k]; P.t[i] += (y - P.t[i]) * sk; }
  }
  // the kit on its hinges: each piece is a mass on a soft spring hung from the body, so it trails the body's motion and
  // swings past: its deflection is how far the body moved from where the gear's spring (slower than the body's) has got to
  if (LGB.antenna != null) {
    const pi = LGB.pelvis * 3, ci = LGB.chest * 3, X = k => { const Q = k ? LGP_TMP[k] : LGP_RAW; return [Q.t[pi], Q.t[pi + 1], Q.t[pi + 2], Q.r[ci + 1] + Q.r[LGB.spine * 3 + 1], Q.r[ci] + Q.r[LGB.spine * 3]]; };
    const xs = LGP_TAUS.map((_, k) => X(k)), defl = (w) => { const f = [0, 0, 0, 0, 0]; for (let k = 0; k < xs.length; k++) for (let c = 0; c < 5; c++) f[c] += xs[k][c] * w[k]; return f.map((v, c) => v - xs[0][c]); };
    const dA = defl(LGP_GW.antenna), dD = defl(LGP_GW.dump), dT = defl(LGP_GW.tail), cl = (v, m) => clamp(v, -m, m);
    lgJadd(P, 'antenna', cl(dA[1] * 5 + dA[4] * 1.2, 0.5), cl(-dA[2] * 7 + dA[0] * 4 + dA[3] * 1.4, 0.6), 0);
    lgJadd(P, 'dump', cl(dD[1] * 6, 0.6), cl(dD[2] * 8 - dD[0] * 5, 0.7), 0);
    lgJadd(P, 'tailL', cl(dT[1] * 9, 0.9), cl(dT[2] * 12 - dT[0] * 8 + dT[3] * 2, 1.0), 0);
    lgJadd(P, 'tailR', cl(dT[1] * 9, 0.9), cl(dT[2] * 12 - dT[0] * 8 + dT[3] * 2, 1.0), 0);
  }
}
// micro-motion: slow sway over the feet, small corrections of the trunk and head, a breath
function lgpNoise(P, t, o) {
  const nz = (o.noise == null ? 1 : o.noise), s = o.seed || 0;
  if (nz > 0) {
    const pi = LGB.pelvis * 3;
    P.t[pi + 1] += lgN1(t * 0.22, 11 + s) * 0.006 * nz; P.t[pi] += lgN1(t * 0.18, 13 + s) * 0.004 * nz;
    lgJadd(P, 'spine', lgN1(t * 0.35, 17 + s) * 0.006 * nz, lgN1(t * 0.3, 19 + s) * 0.006 * nz, lgN1(t * 0.25, 23 + s) * 0.008 * nz);
    lgJadd(P, 'neck', lgN1(t * 0.6, 29 + s) * 0.008 * nz, lgN1(t * 0.5, 31 + s) * 0.01 * nz, lgN1(t * 0.45, 37 + s) * 0.012 * nz);
    lgJadd(P, 'head', lgN1(t * 0.9, 41 + s) * 0.006 * nz, lgN1(t * 0.8, 43 + s) * 0.008 * nz, lgN1(t * 0.7, 47 + s) * 0.01 * nz);
    const br = Math.sin(t * TAU / 4.4 + s) * nz; lgJadd(P, 'chest', 0, -0.008 * br, 0); lgJadd(P, 'clavL', 0.006 * br, 0, 0); lgJadd(P, 'clavR', -0.006 * br, 0, 0);
  }
}
