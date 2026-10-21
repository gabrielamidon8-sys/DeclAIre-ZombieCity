/* ================= CURRICULUM: how the cinematic engines study, practise and earn their versions (1.9.995) =================
   Five engines make the films: LEGEND (the body: anatomy and how hands handle things), MIMATIC (the director: directing,
   cinematography, the camera), VFXRAY (the effects), BOARD (the storyboard artist) and CHOREO (the choreographer). Each
   has a course of five versions. A version is not a rank: every version is the whole job done to full precision, and each
   one adds what the engine had to learn to do more of it. A version holds:
   - studied: what the engine studied for it (the facts and numbers it works from, and where they come from);
   - can: what it can do with it;
   - exam: checks, measured on the engine's own output (angles, distances, frames, timings), each with what it got and
     what it had to get. Some exams include practice: the engine tries, measures how far off it is, adjusts and tries
     again, and the exam keeps the curve of how its error came down (the evidence that it learned).
   An engine holds version N only when the exams of versions 1 to N all pass, so a later version can never be bought by
   breaking an earlier one. The results are kept with when they ran, and the studio shows them with the pictures. */
const CUR = { eng: {}, order: [], runs: 0, last: null };
// a course: { title, role, intro }
function curCourse(name, o) { if (!CUR.eng[name]) { CUR.eng[name] = Object.assign({ name: name, levels: [], earned: 0, res: {} }, o); CUR.order.push(name); } else Object.assign(CUR.eng[name], o); return CUR.eng[name]; }
// a version: { v, title, focus, studied: [{ topic, facts: [...], src: [[title, url], ...] }], can: [...], exam: (X) => {} }
function curLevel(name, L) { const c = CUR.eng[name] || curCourse(name, {}); c.levels = c.levels.filter(x => x.v !== L.v); c.levels.push(L); c.levels.sort((a, b) => a.v - b.v); return L; }
// the exam's notebook: checks, curves and notes
function curX() {
  const X = { checks: [], curves: {}, notes: [], ev: {} };
  X.ok = (name, cond, got, want) => { X.checks.push({ name: name, ok: !!cond, got: curFmt(got), want: want == null ? '' : String(want) }); return !!cond; };
  X.near = (name, got, want, tol, unit) => X.ok(name, Math.abs(got - want) <= tol, (+got).toFixed(3) + (unit || ''), want + ' ± ' + tol + (unit || ''));
  X.within = (name, got, lo, hi, unit) => X.ok(name, got >= lo && got <= hi, (+got).toFixed(3) + (unit || ''), lo + ' to ' + hi + (unit || ''));
  X.curve = (name, vals) => { X.curves[name] = vals.map(v => +(+v).toFixed(4)); };
  X.note = s => X.notes.push(String(s));
  return X;
}
function curFmt(v) { if (v == null) return ''; if (typeof v === 'number') return Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 1 ? v.toFixed(2) : v.toFixed(4); if (typeof v === 'string') return v.slice(0, 160); try { return JSON.stringify(v).slice(0, 160); } catch (e) { return String(v).slice(0, 160); } }
// one version's exam
function curExam(name, v) {
  const c = CUR.eng[name], L = c && c.levels.find(x => x.v === v); if (!L) return null;
  const X = curX(), t0 = performance.now(); let err = '';
  try { L.exam(X); } catch (e) { err = String(e && e.message || e).slice(0, 200); X.checks.push({ name: 'the exam ran', ok: false, got: err, want: 'no error' }); try { console.error(e); } catch (x) { } }
  const pass = X.checks.filter(k => k.ok).length;
  const r = { v: v, ok: !err && X.checks.length > 0 && pass === X.checks.length, n: X.checks.length, pass: pass, checks: X.checks, curves: X.curves, notes: X.notes, ev: X.ev, ms: Math.round(performance.now() - t0), at: Date.now() };
  c.res[v] = r; return r;
}
// the course in order; the version held is the last one whose exam (and every one before it) passed
function curRun(name, upto) {
  const c = CUR.eng[name]; if (!c) return 0;
  let earned = 0, broke = false;
  for (const L of c.levels) { if (upto && L.v > upto) break; const r = curExam(name, L.v); if (r && r.ok && !broke) earned = L.v; else broke = true; }
  c.earned = earned; CUR.runs++; CUR.last = Date.now(); curSave(); return earned;
}
function curRunAll() { const out = {}; for (const n of CUR.order) out[n] = curRun(n); return out; }
function curVer(name) { const c = CUR.eng[name]; return c ? c.earned : 0; }
// a short line per engine (the engine room, the docs)
function curSummary(name) {
  const c = CUR.eng[name]; if (!c) return '';
  const done = c.levels.filter(L => c.res[L.v]), ok = done.filter(L => c.res[L.v].ok);
  return 'v' + c.earned + ' of ' + c.levels.length + (done.length ? ' · ' + ok.length + '/' + done.length + ' exams passed' : ' · not examined yet');
}
function curSave() {
  if (typeof store === 'undefined') return;
  try { const o = {}; for (const n of CUR.order) { const c = CUR.eng[n]; o[n] = { e: c.earned, r: {} }; for (const v in c.res) { const r = c.res[v]; o[n].r[v] = { ok: r.ok, n: r.n, pass: r.pass, at: r.at }; } } store.set('zc_curric', o); } catch (e) { }
}
function curLoad() {
  if (typeof store === 'undefined') return;
  try { const o = store.get('zc_curric', null); if (!o) return; for (const n in o) { const c = CUR.eng[n]; if (!c) continue; c.earned = o[n].e | 0; for (const v in o[n].r) if (!c.res[v]) c.res[v] = Object.assign({ checks: [], curves: {}, notes: [], ev: {}, kept: true }, o[n].r[v]); } } catch (e) { }
}
// small shared helpers the courses use
const curV3 = { sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len: a => Math.hypot(a[0], a[1], a[2]), norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, lerp: (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k] };
function curAng(a, b) { const d = curV3.dot(curV3.norm(a), curV3.norm(b)); return Math.acos(d < -1 ? -1 : d > 1 ? 1 : d); }
const CUR_DEG = 180 / Math.PI;
// a seeded random (exams are repeatable)
function curRng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
