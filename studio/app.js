/* The Cinematic Studio: a written scene read by BOARD, fought by CHOREO, performed by LEGEND, directed and lit by
   MIMATIC and finished by VFXRAY, played back here frame by frame; and the five engines' course, with what each one
   studied, what it can do, and its exams (as they ran when this page was made, or again here). */
(function () {
  const $ = id => document.getElementById(id);
  const DEPTS = [['LEGEND', 'the body', 'var(--legend)'], ['MIMATIC', 'direction and camera', 'var(--mimatic)'], ['VFXRAY', 'effects', 'var(--vfxray)'], ['CHOREO', 'choreography', 'var(--choreo)'], ['BOARD', 'storyboard', 'var(--board)']];
  const COL = { LEGEND: 'var(--legend)', MIMATIC: 'var(--mimatic)', VFXRAY: 'var(--vfxray)', CHOREO: 'var(--choreo)', BOARD: 'var(--board)' };
  const PRESETS = [
    { id: 'alley', name: 'Alley, night', text: 'EXT. ALLEY - NIGHT. Rain falls through the neon.\nMAYA walks in and stops by the table. She picks up the mug. A stranger steps out of the shadows. "You lost?" he asks. Maya hands him the mug. The stranger throws a punch. Maya blocks and hits back with a cross. He swings a hook; she ducks. She kicks him in the stomach. He falls.' },
    { id: 'gym', name: 'Gym fight', text: 'INT. GYM - NIGHT.\nJACK circles. Leo jabs. Jack slips and hits back with an uppercut. Leo kicks him. Jack falls.' },
    { id: 'park', name: 'Park, day', text: 'EXT. PARK - DAY.\nANNA walks up to Tom. She hands him a bottle. "Thanks," Tom says. He drinks.' },
    { id: 'yard', name: 'Yard, dusk', text: 'EXT. YARD - DUSK.\nThe boy picks up the ball. He throws the ball to his father. The father smiles.' }
  ];
  const Q = { final: { w: 1110, h: 600, dof: true, post: true }, preview: { w: 740, h: 400, dof: false, post: true } };
  const S = { T: null, B: null, t: 0, playing: false, ready: false, busy: false, preset: 'alley', last: 0, msAvg: 0, take: 0, course: null, eng: 'LEGEND', ver: 1 };
  const COURSE0 = (() => { try { return JSON.parse($('courseData').textContent); } catch (e) { return null; } })();

  /* ---------- small helpers ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tc = (t) => { const f = Math.floor(t * 24 + 1e-6), ff = f % 24, s = Math.floor(f / 24) % 60, m = Math.floor(f / 1440) % 60; return '00:' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + ':' + String(ff).padStart(2, '0'); };
  const name = (sc, id) => id == null ? '' : ((sc.chars[id] || {}).name || '');
  const tick = () => new Promise(r => setTimeout(r, 30));
  const status = (s, err) => { const el = $('status'); el.textContent = s; el.classList.toggle('err', !!err); };
  const busy = (title, msg) => { $('busy').hidden = !title; if (title) { $('busy').querySelector('b').textContent = title; $('busyMsg').textContent = msg || ''; } };

  /* ---------- the masthead, the presets ---------- */
  $('depts').innerHTML = DEPTS.map(([n, r, c]) => '<span class="dept" style="--c:' + c + '" title="' + esc(r) + '"><i></i>' + n + ' <b id="v-' + n + '">v5</b></span>').join('');
  $('presets').innerHTML = PRESETS.map(p => '<button class="chip" data-p="' + p.id + '" aria-pressed="' + (p.id === S.preset) + '">' + esc(p.name) + '</button>').join('');
  $('presets').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; const p = PRESETS.find(x => x.id === b.dataset.p); S.preset = p.id; $('scene').value = p.text; for (const c of $('presets').children) c.setAttribute('aria-pressed', c === b); shoot(); });
  $('scene').value = (() => { try { return localStorage.getItem('studio_draft') || PRESETS[0].text; } catch (e) { return PRESETS[0].text; } })();
  $('scene').addEventListener('input', () => { try { localStorage.setItem('studio_draft', $('scene').value); } catch (e) { } for (const c of $('presets').children) c.setAttribute('aria-pressed', 'false'); });
  $('shoot').addEventListener('click', () => shoot());

  /* ---------- the picture ---------- */
  function boot() {
    try { lgGLInit(); } catch (e) { }
    if (!LGR.ok) { busy('No WebGL here', 'This browser could not start WebGL, which the engines need to render. The storyboard, the breakdown and the course still work.'); status('WebGL is not available, so the picture cannot render here.', true); return false; }
    LGR.cv.setAttribute('aria-label', 'The film'); $('frame').insertBefore(LGR.cv, $('poster').nextSibling); LGR.cv.style.opacity = '0';
    return true;
  }
  async function shoot() {
    if (S.busy) return; S.busy = true; $('shoot').disabled = true; S.playing = false; setPlay();
    const text = $('scene').value.trim();
    try {
      busy('BOARD', 'reading the scene and planning the shots'); status('BOARD is reading the scene…'); await tick();
      const t0 = performance.now(), sc0 = brdRead(text);
      if (!sc0.beats.length) { status('BOARD found no action to stage. Start with a heading such as EXT. ALLEY - NIGHT, then write what people do: walks, picks up, hands, throws, punches, kicks, falls, says.', true); busy(null); return finish(); }
      const B = brdBoard(text, { fps: 24 });
      busy('MIMATIC', 'choosing the coverage and cutting it'); status('MIMATIC is covering the scene and cutting it…'); await tick();
      const T = mimsTake(B, {}); S.B = B; S.T = T; S.t = 0; S.take++;
      renderBoard(); renderBreak();
      if (S.ready) {
        busy('LEGEND', 'building the set and the cast'); await tick(); mimsModels(T, 0);
        busy(null); LGR.cv.style.opacity = '1'; $('poster').hidden = true; draw();
        S.playing = true; setPlay();
      } else busy(null);
      const c = B.sc.chars.map(x => x.name).join(', ');
      status('Take ' + S.take + ': ' + B.sc.beats.length + ' beats, ' + c + '. ' + B.shots.length + ' boards, ' + T.edl.length + ' shots in the cut, ' + T.dur.toFixed(1) + ' s. Made in ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s.');
      $('slate').textContent = 'Zombie City engines · ' + (B.sc.heading || 'scene 1') + ' · take ' + S.take + ' · 24 fps · 1.85 : 1 · Super 35';
      drawTL();
    } catch (e) { console.error(e); status('Something in the engines failed on this scene (' + (e && e.message || e) + '). Try a simpler sentence or one of the examples.', true); busy(null); }
    finish();
  }
  function finish() { S.busy = false; $('shoot').disabled = false; }
  function opts() { const q = Q[$('q').value] || Q.final; return { w: q.w, h: q.h, dof: q.dof, post: q.post, light: $('light').value || undefined, look: $('look').value || undefined, rain: $('rain').checked, fx: $('fx').checked }; }
  function draw() {
    if (!S.T || !S.ready) return; const t0 = performance.now(), r = mimsFrame(S.T, S.t, opts()); const ms = performance.now() - t0; S.msAvg = S.msAvg ? S.msAvg * 0.9 + ms * 0.1 : ms;
    if (r) { const e = r.shot; $('hudShot').textContent = 'SHOT ' + e.n + ' · ' + e.size + ' ' + e.kind + ' · ' + Math.round(e.f || r.lens.f) + ' mm · T' + r.lens.N.toFixed(1) + ' · focus ' + r.lens.focus.toFixed(1) + ' m'; }
    $('hudTc').textContent = tc(S.t); $('time').textContent = S.t.toFixed(1) + ' / ' + S.T.dur.toFixed(1) + ' s'; $('ms').textContent = Math.round(S.msAvg) + ' ms a frame';
    drawTL();
  }
  function loop(now) {
    const dt = Math.min(0.1, (now - (S.last || now)) / 1000); S.last = now;
    if (S.playing && S.T) { S.t += dt; if (S.t >= S.T.dur) { S.t = 0; } draw(); }
    requestAnimationFrame(loop);
  }
  function setPlay() { $('play').setAttribute('aria-label', S.playing ? 'Pause' : 'Play'); $('playIcon').innerHTML = S.playing ? '<path d="M3 1.5h3.5v13H3zM9.5 1.5H13v13H9.5z"/>' : '<path d="M3 1.5v13l11-6.5z"/>'; }
  $('play').addEventListener('click', () => { if (!S.T) return; S.playing = !S.playing; setPlay(); });
  for (const id of ['q', 'light', 'look', 'rain', 'fx']) $(id).addEventListener('change', () => { if (!S.playing) draw(); });
  document.addEventListener('keydown', e => { if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return; if (e.code === 'Space') { e.preventDefault(); $('play').click(); } });
  /* the timeline: one block per shot of the cut (wider shots darker), ticks where the fight cues effects */
  const SZ = { EWS: 0.25, WS: 0.32, FS: 0.4, MLS: 0.48, MS: 0.56, MCU: 0.66, CU: 0.78, ECU: 0.9 };
  function drawTL() {
    const c = $('tl'), r = c.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); if (!r.width) return;
    if (c.width !== Math.round(r.width * dpr)) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
    const g = c.getContext('2d'), W = c.width, H = c.height; g.clearRect(0, 0, W, H); if (!S.T) return;
    const X = t => t / S.T.dur * W;
    S.T.edl.forEach(e => { const a = SZ[e.size] || 0.5; g.fillStyle = 'rgba(255,179,71,' + (0.12 + a * 0.5) + ')'; g.fillRect(X(e.in) + 1, 6 * dpr, Math.max(1, X(e.out) - X(e.in) - 2), H - 18 * dpr); g.fillStyle = '#0d0f12'; g.font = (10 * dpr) + 'px IBM Plex Mono, monospace'; if (X(e.out) - X(e.in) > 30 * dpr) g.fillText(e.size, X(e.in) + 4 * dpr, 20 * dpr); });
    g.fillStyle = '#46e0f5'; for (const q of S.T.cues) g.fillRect(X(q.t) - dpr, H - 10 * dpr, 2 * dpr, 8 * dpr);
    g.fillStyle = '#ebe8e1'; g.fillRect(X(S.t) - dpr, 0, 2 * dpr, H);
  }
  { let drag = false; const at = e => { const r = $('tl').getBoundingClientRect(); if (!S.T) return; S.t = clamp((e.clientX - r.left) / r.width, 0, 0.9999) * S.T.dur; draw(); };
    $('tl').addEventListener('pointerdown', e => { drag = true; $('tl').setPointerCapture(e.pointerId); at(e); }); $('tl').addEventListener('pointermove', e => { if (drag) at(e); }); $('tl').addEventListener('pointerup', () => { drag = false; }); }
  window.addEventListener('resize', () => { drawTL(); if (S.B) renderPlan(); });

  /* ---------- the storyboard ---------- */
  function renderBoard() {
    const B = S.B, el = $('board'); el.innerHTML = ''; const pw = 320, dpr = 2;
    for (const sh of B.shots) { if (!sh.eye) continue; const c = document.createElement('canvas'), ph = Math.round(pw / 1.85) + 40; c.width = pw * dpr; c.height = ph * dpr; c.setAttribute('aria-label', 'Board ' + sh.n + ': ' + sh.desc); const g = c.getContext('2d'); g.scale(dpr, dpr); g.fillStyle = '#ece6d8'; g.fillRect(0, 0, pw, ph); try { brdPanel(g, B, sh, 0, 0, pw); } catch (e) { console.error(e); } el.appendChild(c); }
    renderPlan();
    const f = brdCheck(B); $('checks').textContent = f.length ? 'Continuity: ' + f.map(x => 'board ' + x.n + ', ' + x.what).join('; ') : 'Continuity: every board on one side of the line, screen direction and eyelines kept.';
  }
  function renderPlan() { const c = $('plan'), w = Math.max(320, Math.min(1400, c.parentNode.clientWidth - 28)), h = Math.round(w * 0.42), dpr = 2; c.width = w * dpr; c.height = h * dpr; const g = c.getContext('2d'); g.scale(dpr, dpr); try { brdPlan(g, S.B, 0, 0, w, h); } catch (e) { console.error(e); } }

  /* ---------- the breakdown ---------- */
  function table(cols, rows) { return '<div class="tbl"><table><thead><tr>' + cols.map(c => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map((v, i) => '<td' + (typeof v === 'object' && v && v.n ? ' class="n"' : '') + '>' + esc(typeof v === 'object' && v ? v.v : v) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>'; }
  function renderBreak() {
    const B = S.B, T = S.T, sc = B.sc, N = v => ({ n: 1, v: v });
    let h = '<h3>The scene read <small>BOARD v5 · ' + esc(sc.heading || 'no heading') + (sc.weather.length ? ' · ' + esc(sc.weather.join(', ')) : '') + '</small></h3>';
    h += table(['#', 'who', 'does', 'to whom', 'with', 'defence', 'says', 'on screen'], sc.beats.map(b => [N(b.i + 1), name(sc, b.who), b.act, name(sc, b.target), b.thing || '', b.def || '', b.quote ? '"' + b.quote + '"' : '', b.t0 != null ? N(tc(b.t0) + ' to ' + tc(b.t1)) : '']));
    h += '<h3>The shot list <small>BOARD v2</small></h3>' + table(['board', 'size', 'type', 'camera', 'lens', 'length', 'what we see'], B.shots.map(s => [N(s.n), s.size, s.type, s.move, N(s.lens + ' mm'), s.t0 != null ? N((s.t1 - s.t0).toFixed(1) + ' s') : '', s.desc]));
    h += '<h3>The cut <small>MIMATIC v5 · rule of six ' + T.judge.score.toFixed(3) + ' · ' + T.judge.crossings + ' crossings · ' + T.judge.jumps + ' jump cuts · average shot ' + T.judge.asl.toFixed(1) + ' s</small></h3>';
    h += table(['shot', 'in', 'out', 'size', 'coverage', 'on', 'lens', 'why the cut falls here'], T.edl.map(e => [N(e.n), N(tc(e.in)), N(tc(e.out)), e.size, e.kind, e.who >= 0 ? (T.sc.actors[e.who] || {}).name || '' : 'everyone', N(Math.round(e.f) + ' mm'), e.cut || '']));
    const fights = B.C.segs.filter(s => s.kind === 'fight' && s.F);
    for (const s of fights) h += '<h3>The fight <small>CHOREO v5 · starts at ' + tc(s.t0) + '</small></h3>' + table(['#', 'at', 'attacker', 'action', 'partner', 'response'], choSheet(s.F).map(r => [N(r.n), N(tc(s.t0 + r.t)), r.a, r.act, r.b, r.resp]));
    if (T.cues.length) h += '<h3>The effects cue sheet <small>VFXRAY v5 · ' + esc(T.loc.rain ? 'wet: water off the body, splashes' : 'dry: dust') + '</small></h3>' + table(['at', 'moment', 'what VFXRAY adds'], T.cues.map(q => [N(tc(q.t)), q.kind, q.kind === 'land' ? (T.loc.wet > 0.5 ? 'a splash ring where the body lands' : 'a ring of dust along the ground') : q.kind === 'hit' ? (T.loc.wet > 0.5 ? 'a spray of water off the body' : 'dust off the clothes') : (T.loc.wet > 0.5 ? 'a little water off the forearm' : 'a puff off the forearm')]));
    h += '<h3>The location <small>MIMATIC · VFXRAY</small></h3><p class="note">' + esc((T.loc.inside ? 'Inside: the warehouse floor, three bulbs, high windows.' : 'Outside: the avenue of shopfronts, ' + (T.loc.night ? 'sodium lamps and neon as the practical lights' : T.loc.dusk ? 'the last of the daylight' : 'daylight')) + '. The light is designed per shot as ' + ({ highKey: 'high key (2:1)', standard: 'standard (4:1)', lowKey: 'low key (8:1)', noir: 'noir (16:1)' }[T.loc.light] || T.loc.light) + ', a key, fill and back round the subject, with the three practicals nearest the subject; the look is ' + ({ identity: 'neutral', tealOrange: 'teal and orange', bleach: 'bleach bypass', dayForNight: 'day for night', sodium: 'sodium' }[T.loc.look] || T.loc.look) + (T.loc.rain ? '; rain in scene time with splashes.' : '.')) + '</p>';
    $('p-break').innerHTML = h;
  }

  /* ---------- the course ---------- */
  function results(engName) {
    const c = typeof CUR !== 'undefined' && CUR.eng[engName], live = c && Object.keys(c.res || {}).some(v => c.res[v] && c.res[v].checks && c.res[v].checks.length && !c.res[v].kept);
    if (live) return { live: true, levels: c.levels.map(L => ({ v: L.v, title: L.title, focus: L.focus, studied: L.studied, can: L.can, res: c.res[L.v] })), earned: c.earned };
    const e = COURSE0 && COURSE0.eng.find(x => x.name === engName); if (!e) return null;
    return { live: false, levels: e.levels, earned: e.earned };
  }
  function renderEngs() {
    $('engs').innerHTML = DEPTS.map(([n, r, c]) => { const R = results(n); return '<button class="eng" style="--c:' + c + '" data-e="' + n + '" aria-pressed="' + (n === S.eng) + '"><b>' + n + '</b><span>' + esc(r) + ' · v' + (R ? R.earned : '?') + ' of 5</span></button>'; }).join('');
  }
  $('engs').addEventListener('click', e => { const b = e.target.closest('[data-e]'); if (!b) return; S.eng = b.dataset.e; S.ver = 1; renderCourse(); });
  function sheetFile(n, v) { return 'assets/' + n.toLowerCase() + '_v' + v + (n === 'LEGEND' && v === 4 ? 'b_movement' : '') + '.jpg'; }
  function renderCourse() {
    renderEngs(); const R = results(S.eng), el = $('courseBody'), c = COL[S.eng]; if (!R) { el.innerHTML = '<p class="note">The course could not be loaded.</p>'; return; }
    let h = '<div class="vers" style="--c:' + c + '">' + R.levels.map(L => '<button class="ver' + (L.res && L.res.ok ? '' : ' fail') + '" data-v="' + L.v + '" aria-pressed="' + (L.v === S.ver) + '"><i></i>v' + L.v + ' · ' + esc(L.title) + '</button>').join('') + '</div>';
    const L = R.levels.find(x => x.v === S.ver) || R.levels[0], res = L.res || { checks: [], curves: {} };
    h += '<div class="vgrid" style="--c:' + c + '"><div><h3 style="color:' + c + '">v' + L.v + ' · ' + esc(L.title) + '</h3><p class="note">' + esc(L.focus) + '</p><p class="label" style="margin-top:14px">What it studied</p>';
    for (const st of L.studied || []) h += '<div class="topic"><h4>' + esc(st.topic) + '</h4><ul>' + st.facts.map(f => '<li>' + esc(f) + '</li>').join('') + '</ul>' + ((st.src || []).length ? '<div class="src">' + st.src.map(s => '<a href="' + esc(s[1]) + '" target="_blank" rel="noopener">' + esc(s[0]) + '</a>').join(' · ') + '</div>' : '') + '</div>';
    h += '<p class="label" style="margin-top:14px">What it can do now</p><ul class="can">' + (L.can || []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div><div>';
    h += '<p class="verdict" style="color:' + (res.ok ? 'var(--good)' : 'var(--bad)') + '">' + (res.ok ? 'Passed' : 'Not passed') + ' · ' + (res.pass || 0) + ' of ' + (res.n || 0) + ' checks</p><p class="note">' + (R.live ? 'These results ran just now, in this browser.' : 'These results ran when this page was made; run the exams to measure them again here.') + '</p>';
    h += '<div class="tbl exam"><table><thead><tr><th></th><th>check</th><th>got</th><th>wanted</th></tr></thead><tbody>' + (res.checks || []).map(k => '<tr><td class="' + (k.ok ? 'ok' : 'no') + '">' + (k.ok ? '✓' : '✗') + '</td><td>' + esc(k.name) + '</td><td class="got">' + esc(k.got) + '</td><td class="want">' + esc(k.want) + '</td></tr>').join('') + '</tbody></table></div>';
    const cv = Object.entries(res.curves || {}); if (cv.length) h += '<p class="label">Curves from the exam</p><div class="curves">' + cv.map(([k], i) => '<figure><figcaption>' + esc(k) + '</figcaption><canvas data-curve="' + i + '"></canvas></figure>').join('') + '</div>';
    h += '</div></div><img class="sheet" src="' + sheetFile(S.eng, L.v) + '" alt="The evidence sheet for ' + S.eng + ' version ' + L.v + '" data-full="' + sheetFile(S.eng, L.v) + '">';
    el.innerHTML = h;
    el.querySelectorAll('canvas[data-curve]').forEach(cnv => drawCurve(cnv, cv[+cnv.dataset.curve][1], getComputedStyle(document.documentElement).getPropertyValue('--' + S.eng.toLowerCase()).trim() || '#ffb347'));
    el.querySelector('.vers').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; S.ver = +b.dataset.v; renderCourse(); });
    el.querySelector('.sheet').addEventListener('click', e => openLB(e.target.dataset.full, e.target.alt));
  }
  function drawCurve(c, ys, col) {
    const r = c.getBoundingClientRect(), dpr = 2; c.width = Math.max(100, r.width) * dpr; c.height = 110 * dpr; const g = c.getContext('2d'), W = c.width, H = c.height, p = 10 * dpr;
    if (!ys || !ys.length) return; let lo = Math.min(...ys), hi = Math.max(...ys); if (hi === lo) { hi += 1; lo -= 1; }
    g.strokeStyle = '#2a2f37'; g.lineWidth = dpr; for (let k = 0; k <= 4; k++) { const y = p + (H - 2 * p) * k / 4; g.beginPath(); g.moveTo(p, y); g.lineTo(W - p, y); g.stroke(); }
    const X = i => p + (W - 2 * p) * (ys.length === 1 ? 0.5 : i / (ys.length - 1)), Y = v => H - p - (H - 2 * p) * (v - lo) / (hi - lo);
    g.strokeStyle = col; g.lineWidth = 2 * dpr; g.beginPath(); ys.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.stroke();
    g.fillStyle = col; if (ys.length < 40) ys.forEach((v, i) => { g.beginPath(); g.arc(X(i), Y(v), 2.5 * dpr, 0, TAU); g.fill(); });
    g.fillStyle = '#959ca6'; g.font = (10 * dpr) + 'px IBM Plex Mono, monospace'; g.fillText(String(+hi.toPrecision(4)), p, p + 9 * dpr); g.fillText(String(+lo.toPrecision(4)), p, H - p - 2 * dpr);
  }
  $('runExams').addEventListener('click', async () => {
    const b = $('runExams'); if (typeof CUR === 'undefined') return; b.disabled = true; S.playing = false; setPlay();
    try { if (!LG.atlas) await lgAtlasGet(128);
      for (const n of CUR.order) { b.textContent = 'Examining ' + n + '…'; await tick(); curRun(n); $('v-' + n).textContent = 'v' + curVer(n); renderCourse(); await tick(); }
      b.textContent = 'Exams ran here · run again';
    } catch (e) { console.error(e); b.textContent = 'An exam failed to run (' + (e && e.message || e) + ')'; }
    b.disabled = false;
  });

  /* ---------- the evidence ---------- */
  const GAL = [];
  for (const [n] of DEPTS) for (let v = 1; v <= 5; v++) { if (n === 'LEGEND' && v === 4) { GAL.push([n, 'assets/legend_v4a_grasps.jpg', 'v4 · grasps']); GAL.push([n, 'assets/legend_v4b_movement.jpg', 'v4 · movement']); } else GAL.push([n, 'assets/' + n.toLowerCase() + '_v' + v + '.jpg', 'v' + v]); }
  GAL.push(['FILM', 'assets/film_alley.jpg', 'the alley, night, rain'], ['FILM', 'assets/film_gym.jpg', 'the gym fight'], ['FILM', 'assets/film_park.jpg', 'the park by day']);
  $('gal').innerHTML = GAL.map(([n, src, cap]) => '<button data-src="' + src + '" style="--c:' + (COL[n] || 'var(--tungsten)') + '"><img loading="lazy" src="' + src + '" alt="' + esc(n + ' ' + cap) + '"><span><b>' + n + '</b>' + esc(cap) + '</span></button>').join('');
  $('gal').addEventListener('click', e => { const b = e.target.closest('[data-src]'); if (b) openLB(b.dataset.src, b.querySelector('img').alt); });
  function openLB(src, alt) { $('lbImg').src = src; $('lbImg').alt = alt || ''; try { $('lb').showModal(); } catch (e) { $('lb').setAttribute('open', ''); } }
  $('lbClose').addEventListener('click', () => $('lb').close()); $('lb').addEventListener('click', e => { if (e.target === $('lb')) $('lb').close(); });

  /* ---------- tabs ---------- */
  const PANES = ['board', 'break', 'course', 'ev'];
  function showPane(p) { for (const k of PANES) { $('p-' + k).hidden = k !== p; } document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t.dataset.pane === p)); if (p === 'course') renderCourse(); if (p === 'board' && S.B) renderPlan(); }
  document.querySelector('.tabs').addEventListener('click', e => { const b = e.target.closest('.tab'); if (b) showPane(b.dataset.pane); });
  if (['board', 'break', 'course', 'ev'].includes(location.hash.slice(1))) showPane(location.hash.slice(1));

  /* ---------- start ---------- */
  (async () => {
    try { if (typeof curLoad === 'function') curLoad(); } catch (e) { }
    for (const [n] of DEPTS) { const R = results(n); if (R) $('v-' + n).textContent = 'v' + R.earned; }
    // (a small screen starts on the faster picture; it can be switched to the final one)
    if (window.innerWidth < 700) $('q').value = 'preview';
    const gl = boot(); requestAnimationFrame(loop);
    if (gl) { busy('Setting up', 'building the textures (a few seconds the first time)'); status('Building the textures and the cast…'); await tick(); try { await lgAtlasGet(256); vfxGLInit(); S.ready = true; } catch (e) { console.error(e); } }
    busy(null); await shoot();
  })();
})();
