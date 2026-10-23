/* ================= PULSE: the city's pulse (the world life engine, LIFE v3) =================
   1.9.998.2, "make the gameplay feel more alive". The city already had crows, kickable props, litter in the wind and
   far-off sounds; this adds what was missing between them:
   - City life. Rats run along the walls in stops and starts, sniff, and scatter (squeaking) when you come close or
     shoot; at night one creeps up to the dead. Flies gather over the bodies the longer they lie (none in the cold,
     fewer at night) and buzz as you pass. Steam rises from some of the manholes and bends with the wind, catching the
     street lamps at night (it is drawn before the lighting, so it lights like the street does).
   - The city beyond the screen. The far-off sounds now show: a helicopter's searchlight (by night) or its shadow (by
     day) sweeps across as you hear it pass over, a distant firefight flickers on the edge of the view on the side you
     hear it, a far explosion flashes and leaves a plume of smoke drifting in from that side, sirens strobe red and
     blue, and now and then at night a survivor's flare goes up and burns red over a district.
   - Combat feel. A split second of hit-stop on a headshot, a heavy round's kill, a knife finisher and a blast (solo
     only; never in co-op; off with Screen shake at 0, with reduced motion, or in Settings).
   - Voices. The nearest zombies groan, gurgle, snarl as they close and screech when the frenzy takes them, each from
     where it stands, deeper for a big one and higher for a small one. You breathe harder the longer you sprint and
     after each roll, grunt as you roll, gasp when you are hit, and your heart pounds when you are close to dying.
   Everything here is cosmetic and local to each screen (co-op stays in step), cheap (a few dozen small draws), and
   follows City life and Voices in Settings. */
const PULSE = { rats: [], ev: [], plumes: [], stopT: 0, stopCd: 0, voiceT: 0, exert: 0, breathT: 0, breathIn: true, heartT: 0, lastHp: -1, dodge: false, buzzT: 0, ratT: 0, flareT: 60, shotT: -9, lastK: 0,
  n: { rats: 0, events: 0, voices: 0, stops: 0, breaths: 0 } };
const PULSE_BODY = { heavy: 0.86, stocky: 0.88, hunch: 0.94, lanky: 1, avg: 1, thin: 1.08, small: 1.12 };
function pulseUpm() { return 32 * SCL / SCALE_REAL; }   // world units in a metre
function pulseLife() { return SET.life !== false; }
function pulseNight() { const F = CORE.frame; return F && F.night != null ? F.night : (LUX.live ? 1 - LUX.day : 0); }
function pulseReset() { PULSE.rats.length = 0; PULSE.ev.length = 0; PULSE.plumes.length = 0; PULSE.stopT = 0; PULSE.exert = 0; PULSE.lastHp = -1; PULSE.dodge = false; PULSE.flareT = 60 + Math.random() * 90; }
// a manhole that steams (about two in five, chosen by where it is), recorded by the city generator as it paints it
function pulseVent(c, x, y) { if (!c.vents) c.vents = []; if (c.vents.length < 3 && (Z.hash32((x * 31 | 0) ^ (y * 17 | 0) ^ citySeed) % 5) < 2) c.vents.push({ x: x * c.k, y: y * c.k, ph: Math.random() * 10 }); }

/* ---------- rats ---------- */
function pulseRatCap() {
  const bio = WORLD.cur ? WORLD.cur.bio : 'city'; if (bio === 'desert' || bio === 'snow' || WORLD.season === 3 && bio === 'suburb') return 0;
  const n = (bio === 'city' || bio === 'chaos' || bio === 'ruins' || bio === 'burning' || bio === 'ash' ? 3 : 1) + Math.round(pulseNight() * 3);
  return PERF.vegCut ? Math.ceil(n / 2) : n;
}
// a rat comes out along a wall near the edge of the view
function pulseRatSpawn() {
  const zm = gcamZoom(), hw = W / zm / 2, hh = H / zm / 2, u = pulseUpm();
  for (let k = 0; k < 6; k++) {
    const a = Math.random() * TAU, x = cam.x + Math.cos(a) * hw * (0.55 + Math.random() * 0.4), y = cam.y + Math.sin(a) * hh * (0.55 + Math.random() * 0.4);
    const R = rectsNear(x, y, 160); let best = null, bd = 1e9;
    for (const r of R) { if (r.k !== 'b') continue; const cx = clamp(x, r.x, r.x + r.w), cy = clamp(y, r.y, r.y + r.h), d = Math.hypot(cx - x, cy - y); if (d < bd) { bd = d; best = r; } }
    if (!best) continue;
    // stand just outside the nearest side of the building (somewhere along it, inside the view), facing along it
    const r = best, cx = clamp(x, r.x, r.x + r.w), cy = clamp(y, r.y, r.y + r.h), off = u * 0.18, along = (lo, hi, c, span) => clamp(c + (Math.random() - 0.5) * span, Math.max(lo, c - span), Math.min(hi, c + span));
    let px, py, dir;
    const dl = Math.abs(cx - r.x), dr = Math.abs(r.x + r.w - cx), dt = Math.abs(cy - r.y), db = Math.abs(r.y + r.h - cy), m = Math.min(dl, dr, dt, db);
    if (m === dt || m === db) { px = along(r.x, r.x + r.w, clamp(cx, cam.x - hw * 0.9, cam.x + hw * 0.9), u * 8); py = m === dt ? r.y - off : r.y + r.h + off; dir = Math.random() < 0.5 ? 0 : Math.PI; }
    else { px = m === dl ? r.x - off : r.x + r.w + off; py = along(r.y, r.y + r.h, clamp(cy, cam.y - hh * 0.9, cam.y + hh * 0.9), u * 8); dir = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2; }
    if (blocked(px, py, u * 0.08) || PULSE.rats.some(o => Math.abs(o.x - px) < u * 1.5 && Math.abs(o.y - py) < u * 1.5)) continue;
    PULSE.rats.push({ x: px, y: py, a: dir, st: 'run', t: 0, go: 0.4 + Math.random() * 0.8, sp: u * (1.4 + Math.random() * 1.2), ph: Math.random() * 10, life: 0, s: 0.9 + Math.random() * 0.25, wall: dir, corpse: null });
    PULSE.n.rats++; return true;
  }
  return false;
}
function pulseRatTick(dt) {
  const R = PULSE.rats, u = pulseUpm(), zm = gcamZoom(), hw = W / zm / 2, hh = H / zm / 2, p = G.p && G.mode === 'play' ? G.p : null, night = pulseNight();
  if (!pulseLife()) { R.length = 0; return; }
  PULSE.ratT -= dt;
  if (PULSE.ratT <= 0) { PULSE.ratT = 2 + Math.random() * 4; if (R.length < pulseRatCap()) pulseRatSpawn(); }
  const shot = G.time - PULSE.shotT < 0.4;
  for (let i = R.length - 1; i >= 0; i--) {
    const r = R[i]; r.life += dt; r.t += dt; r.ph += dt * (r.st === 'stop' ? 3 : 18);
    // what scares it: you close (closer still if you creep), gunfire, a zombie on top of it
    let tx = null, ty = null;
    if (p && !p.down) { const d = Math.hypot(p.x - r.x, p.y - r.y), moving = Math.abs(p.ix || 0) + Math.abs(p.iy || 0) > 0.1; if (d < u * (moving ? 6.5 : 3.5) || (shot && d < u * 14)) { tx = p.x; ty = p.y; } }
    // (near() hands over everything in the grid cells round the point, so the distance is checked here)
    if (tx == null) { const zr = u * 1.2; near(r.x, r.y, zr, z => { if (!z.dead && (z.x - r.x) * (z.x - r.x) + (z.y - r.y) * (z.y - r.y) < zr * zr) { tx = z.x; ty = z.y; return false; } }); }
    if (tx != null && r.st !== 'flee') { r.st = 'flee'; r.t = 0; r.a = Math.atan2(r.y - ty, r.x - tx) + (Math.random() - 0.5) * 0.6; r.sp = u * (3 + Math.random()); if (SFX.critter && SET.voices !== false && Math.random() < 0.6) SFX.critter('rat', clamp((r.x - cam.x) / hw, -1, 1), 0.4, clamp(Math.hypot(r.x - cam.x, r.y - cam.y) / (hw * 1.4), 0, 0.8)); }
    if (r.st === 'flee') { if (r.t > 3) { R.splice(i, 1); continue; } }
    else if (r.st === 'run') { if (r.t > r.go) { r.st = 'stop'; r.t = 0; r.go = 0.3 + Math.random() * 1.3; } }
    else if (r.st === 'stop') {
      if (r.t > r.go) {
        r.st = 'run'; r.t = 0; r.go = 0.4 + Math.random() * 1.1;
        // mostly along the wall, sometimes a dart out and back, and at night now and then toward the dead
        if (night > 0.4 && !r.corpse && Math.random() < 0.3 && typeof ANIMA !== 'undefined') { for (const C of ANIMA.corpses) if (C.done && Math.hypot(C.x - r.x, C.y - r.y) < u * 9) { r.corpse = C; break; } }
        if (r.corpse && ANIMA.corpses.indexOf(r.corpse) >= 0) { const d = Math.hypot(r.corpse.x - r.x, r.corpse.y - r.y); r.a = Math.atan2(r.corpse.y - r.y, r.corpse.x - r.x); if (d < r.corpse.r * 1.6) { r.st = 'stop'; r.go = 1.5 + Math.random() * 2; } }
        else { r.corpse = null; r.a = Math.random() < 0.15 ? r.wall + (Math.random() < 0.5 ? 1 : -1) * 1.2 : Math.random() < 0.25 ? r.wall + Math.PI : r.wall; if (Math.abs(((r.a - r.wall) % TAU + TAU) % TAU - Math.PI) < 0.1) r.wall = r.a; }
      }
    }
    if (r.st !== 'stop') {
      const sp = r.sp * (r.st === 'flee' ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(r.ph * 0.31))), nx = r.x + Math.cos(r.a) * sp * dt, ny = r.y + Math.sin(r.a) * sp * dt;
      if (blocked(nx, ny, u * 0.07)) { r.a += Math.PI * (0.6 + Math.random() * 0.8); if (r.st !== 'flee') r.wall = r.a; } else { r.x = nx; r.y = ny; }
    }
    if (Math.abs(r.x - cam.x) > hw + u * 12 || Math.abs(r.y - cam.y) > hh + u * 12 || r.life > 45) R.splice(i, 1);
  }
}
function pulseRatDraw(vis) {
  const R = PULSE.rats; if (!R.length) return;
  const u = pulseUpm();
  for (const r of R) {
    if (!vis(r.x, r.y, u)) continue;
    const L = u * 0.28 * r.s, run = r.st !== 'stop', wob = run ? Math.sin(r.ph) * 0.12 : 0, sniff = run ? 0 : Math.sin(r.ph * 2.3) * 0.05 * L;
    ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.a + wob * 0.5);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(L * 0.08, L * 0.12, L * 0.55, L * 0.28, 0, 0, TAU); ctx.fill();
    // the tail, swishing
    ctx.strokeStyle = '#6e5f5a'; ctx.lineWidth = Math.max(0.5, L * 0.06); ctx.lineCap = 'round'; const sw = Math.sin(r.ph * 0.7) * L * 0.35;
    ctx.beginPath(); ctx.moveTo(-L * 0.45, 0); ctx.quadraticCurveTo(-L * 0.85, sw, -L * 1.25, sw * 0.4 + Math.sin(r.ph * 0.5) * L * 0.15); ctx.stroke();
    // the body and the head (a pointed snout, ears, a glint of eye)
    ctx.fillStyle = '#4a3f37'; ctx.beginPath(); ctx.ellipse(-L * 0.05, 0, L * 0.5, L * 0.24 * (1 + wob * 0.4), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5a4c42'; ctx.beginPath(); ctx.moveTo(L * 0.3 + sniff, -L * 0.16); ctx.quadraticCurveTo(L * 0.78 + sniff, 0, L * 0.3 + sniff, L * 0.16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a6662'; ctx.beginPath(); ctx.arc(L * 0.36, -L * 0.14, L * 0.07, 0, TAU); ctx.arc(L * 0.36, L * 0.14, L * 0.07, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c9a0a0'; ctx.fillRect(L * 0.74 + sniff, -L * 0.03, L * 0.06, L * 0.06);
    ctx.restore();
  }
}

/* ---------- flies over the dead ---------- */
function pulseFlyOn() { const bio = WORLD.cur ? WORLD.cur.bio : 'city'; return pulseLife() && bio !== 'snow' && !(WORLD.season === 3 && (WX.temp == null || WX.temp < 5)) && (WX.snow || 0) < 0.3; }
function pulseFlies(fn) {
  if (typeof ANIMA === 'undefined' || !ANIMA.corpses.length || !pulseFlyOn()) return 0;
  const u = pulseUpm(), night = pulseNight(), t = G.time; let n = 0, done = 0;
  for (let ci = ANIMA.corpses.length - 1; ci >= 0 && done < 10; ci--) {
    const C = ANIMA.corpses[ci]; if (!C.done || C.life < 3) continue; done++;
    const seed = Z.hash32((C.x * 7 | 0) ^ (C.y * 13 | 0)), many = Math.min(PERF.vegCut ? 3 : 7, 2 + Math.floor(C.life / 3)), k = night > 0.6 ? Math.ceil(many / 2) : many;
    for (let i = 0; i < k; i++) {
      const s = (seed >>> (i * 3)) & 1023, sp = 2.2 + (s % 7) * 0.35, a = t * sp + s * 0.37, rr = u * (0.18 + 0.22 * Math.abs(Math.sin(t * (0.9 + (s % 5) * 0.2) + s)));
      fn(C.x + Math.cos(a) * rr + Math.sin(a * 2.3 + s) * rr * 0.45, C.y + Math.sin(a) * rr * 0.75 + Math.cos(a * 1.7) * rr * 0.3, C); n++;
    }
  }
  return n;
}
function pulseFlyDraw(vis) {
  // (bigger than life, as they would be invisible at true size from up here)
  const u = pulseUpm(), s = Math.max(0.9, u * 0.06);
  ctx.fillStyle = 'rgba(215,220,235,0.42)'; ctx.beginPath(); let any = 0;
  pulseFlies((x, y, C) => { if (!vis(C.x, C.y, u * 2)) return; ctx.rect(x - s * 1.2, y - s * 0.4, s * 2.4, s * 0.8); any++; });
  if (!any) return; ctx.fill();
  ctx.fillStyle = '#121212'; ctx.beginPath(); pulseFlies((x, y, C) => { if (vis(C.x, C.y, u * 2)) ctx.rect(x - s * 0.5, y - s * 0.5, s, s); }); ctx.fill();
}
// buzzing as you pass the dead
function pulseFlyTick(dt) {
  PULSE.buzzT -= dt; if (PULSE.buzzT > 0 || !G.p || G.mode !== 'play' || SET.voices === false || !pulseFlyOn() || typeof ANIMA === 'undefined') return;
  PULSE.buzzT = 1.4 + Math.random() * 1.6;
  const u = pulseUpm(), p = G.p, hw = W / gcamZoom() / 2; let best = null, bd = u * 4;
  for (const C of ANIMA.corpses) { if (!C.done || C.life < 3) continue; const d = Math.hypot(C.x - p.x, C.y - p.y); if (d < bd) { bd = d; best = C; } }
  if (best && SFX.critter) SFX.critter('buzz', clamp((best.x - cam.x) / hw, -1, 1), 0.3 * (1 - bd / (u * 4)) * (pulseNight() > 0.6 ? 0.5 : 1), bd / (u * 6));
}

/* ---------- steam from the manholes ---------- */
let PULSE_PUFF = null;
function pulsePuff() {
  if (PULSE_PUFF) return PULSE_PUFF;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(232,236,240,0.9)'); gr.addColorStop(0.45, 'rgba(225,230,235,0.45)'); gr.addColorStop(1, 'rgba(220,225,230,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return PULSE_PUFF = c;
}
function pulseSteamDraw(vis) {
  if (!pulseLife()) return;
  const u = pulseUpm(), zm = gcamZoom(), hw = W / zm / 2 + u * 4, hh = H / zm / 2 + u * 4, x0 = cam.x - hw, x1 = cam.x + hw, y0 = cam.y - hh, y1 = cam.y + hh;
  // (a thin wisp, a metre or so across, carried a couple of metres downwind before it is gone)
  const cold = WORLD.season === 3 || (WX.rain || 0) > 0.2 ? 1 : 0.65, N = PERF.vegCut ? 4 : 7, wl = Math.hypot(WX.wx || 0, WX.wy || 0), wk = wl > 1 ? 1 / wl : 1;
  const wx = (WX.wx || 0) * wk * u * 0.8, wy = (WX.wy || 0) * wk * u * 0.8, P = pulsePuff(), t = G.time;
  let drew = 0;
  for (let cx = Math.floor(x0 / CHS); cx <= Math.floor(x1 / CHS); cx++) for (let cy = Math.floor(y0 / CHS); cy <= Math.floor(y1 / CHS); cy++) {
    const c = chunks.get(cx + ',' + cy); if (!c || !c.vents) continue;
    for (const v of c.vents) {
      if (!vis(v.x, v.y, u * 3)) continue;
      // each puff rises (spreads) and drifts with the wind, the next one taking its place
      for (let i = 0; i < N; i++) {
        const per = 3.6, age = ((t + v.ph + i * per / N) % per) / per, r = u * (0.2 + age * 0.75);
        const x = v.x + (wx + u * 0.12) * age * 3 + Math.sin(t * 0.9 + i + v.ph) * u * 0.12 * age, y = v.y + wy * age * 3 - u * 0.35 * age;
        ctx.globalAlpha = 0.15 * cold * (1 - age) * Math.min(1, age * 5); ctx.drawImage(P, x - r, y - r, r * 2, r * 2); drew++;
      }
    }
  }
  ctx.globalAlpha = 1; return drew;
}

/* ---------- the city beyond the screen ---------- */
// called with every far-off sound the ambience plays (k, its pan, how far): some of them show
function pulseEvent(k, pan, far, force) {
  if (!force && (!pulseLife() || G.mode !== 'play')) return null;
  const zm = gcamZoom(), hw = W / zm / 2, hh = H / zm / 2, side = pan < 0 ? -1 : 1, f = clamp(far || 0.5, 0, 1);
  const dir = (side < 0 ? Math.PI : 0) + (Math.random() - 0.5) * 1.1, edge = Math.max(hw, hh) + 180 + f * 420, ex = cam.x + Math.cos(dir) * edge, ey = cam.y + Math.sin(dir) * edge * 0.8;
  let e = null;
  if (k === 'heli') { const y0 = cam.y + (Math.random() - 0.5) * hh * 1.2, y1 = cam.y + (Math.random() - 0.5) * hh * 1.2; e = { k: 'heli', dur: 9.5, x0: cam.x + side * (hw + 500), y0: y0, x1: cam.x - side * (hw + 500), y1: y1 }; }
  else if (k === 'gunfar') { const T = []; let tt = 0.05; for (let i = 0, n = 4 + Math.floor(Math.random() * 6); i < n; i++) { T.push(tt); tt += Math.random() < 0.6 ? 0.07 + Math.random() * 0.05 : 0.25 + Math.random() * 0.35; } e = { k: 'gun', dur: tt + 0.3, x: ex, y: ey, T: T, f: f }; }
  else if (k === 'boomfar') { e = { k: 'boom', dur: 2.6, x: ex, y: ey, f: f }; PULSE.plumes.push({ x: ex, y: ey, t: 0, dur: 45, s: 0.8 + Math.random() * 0.6, f: f }); if (f < 0.45 && typeof gcamTrauma === 'function') gcamTrauma(0.05); }
  else if (k === 'siren') e = { k: 'siren', dur: 6, x: ex, y: ey, f: f, hz: Math.random() < 0.5 ? 3 : 5 };
  else if (k === 'flare') { const inView = Math.random() < 0.3; e = { k: 'flare', dur: 24, x: inView ? cam.x + (Math.random() - 0.5) * hw * 1.2 : ex, y: inView ? cam.y + (Math.random() - 0.5) * hh * 1.2 : ey, f: inView ? 0 : f, seen: inView }; }
  if (!e) return null;
  e.t = 0; PULSE.ev.push(e); PULSE.n.events++; if (PULSE.ev.length > 8) PULSE.ev.shift();
  return e;
}
function pulseEvTick(dt) {
  for (let i = PULSE.ev.length - 1; i >= 0; i--) { const e = PULSE.ev[i]; e.t += dt; if (e.t > e.dur) PULSE.ev.splice(i, 1); }
  for (let i = PULSE.plumes.length - 1; i >= 0; i--) { const P = PULSE.plumes[i]; P.t += dt; P.x += (WX.wx || 0) * pulseUpm() * 0.8 * dt; P.y += (WX.wy || 0) * pulseUpm() * 0.8 * dt; if (P.t > P.dur) PULSE.plumes.splice(i, 1); }
  // a flare now and then on a dark night (with the pop and fizz from where it went up)
  if (G.mode === 'play' && pulseLife() && pulseNight() > 0.6 && (WX.rain || 0) < 0.6) {
    PULSE.flareT -= dt;
    if (PULSE.flareT <= 0) { PULSE.flareT = 90 + Math.random() * 150; const pan = Math.random() * 2 - 1, far = 0.3 + Math.random() * 0.5; const e = pulseEvent('flare', pan, far); if (e && SFX.ambEvent) SFX.ambEvent('flare', e.seen ? clamp((e.x - cam.x) / (W / gcamZoom() / 2), -1, 1) : pan, e.seen ? 0.8 : 0.55, e.seen ? 0.1 : far); }
  }
}
// where a helicopter is now (eased in and out along its line)
function pulseHeliAt(e) { const u = clamp(e.t / e.dur, 0, 1), s = u * u * (3 - 2 * u) * 0.3 + u * 0.7; return [e.x0 + (e.x1 - e.x0) * s, e.y0 + (e.y1 - e.y0) * s]; }
// by day: the shadow of a helicopter passing high over (body, tail and the blur of the rotor), under everything that stands
function pulseShadowDraw(vis) {
  const F = CORE.frame, sun = F && F.sun; if (!sun || !sun.on || sun.k < 0.2) return;
  const u = pulseUpm();
  for (const e of PULSE.ev) {
    if (e.k !== 'heli') continue;
    const [x, y] = pulseHeliAt(e), sl = Math.hypot(sun.dx, sun.dy) || 1, sx = x - sun.dx / sl * u * 14, sy = y - sun.dy / sl * u * 14; if (!vis(sx, sy, u * 12)) continue;
    const a = Math.atan2(e.y1 - e.y0, e.x1 - e.x0), k = 0.2 * sun.k * Math.min(1, e.t, e.dur - e.t);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(a); ctx.fillStyle = 'rgba(8,10,14,' + k.toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse(0, 0, u * 2.4, u * 1.1, 0, 0, TAU); ctx.fill(); ctx.fillRect(-u * 6.5, -u * 0.25, u * 4.5, u * 0.5); ctx.fillRect(-u * 6.8, -u * 1, u * 0.4, u * 2);
    ctx.fillStyle = 'rgba(8,10,14,' + (k * 0.45).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(0, 0, u * 7.3, 0, TAU); ctx.fill();
    ctx.restore();
  }
}
// smoke from far explosions drifting in at the edge of the view (drawn over the street, under the lighting)
function pulsePlumeDraw() {
  if (!PULSE.plumes.length) return;
  const u = pulseUpm(), P = pulsePuff(), t = G.time;
  for (const pl of PULSE.plumes) {
    const life = pl.t / pl.dur, a = 0.32 * Math.min(1, pl.t / 3) * (1 - life) * (1 - pl.f * 0.4);
    for (let i = 0; i < 7; i++) {
      const k = i / 7, r = u * (6 + k * 16) * pl.s * (1 + life * 0.8), x = pl.x + Math.sin(t * 0.15 + i * 1.7) * u * 4 + (WX.wx || 0) * u * 18 * k, y = pl.y + Math.cos(t * 0.12 + i) * u * 3 + (WX.wy || 0) * u * 18 * k - u * 10 * k;
      ctx.globalAlpha = a * (1 - k * 0.5); ctx.drawImage(P, x - r, y - r, r * 2, r * 2);
    }
  }
  ctx.globalAlpha = 1;
}
// after the lighting: the searchlight, the far flashes, the sirens' strobes and the flares, added as light
function pulseDrawLit(vis) {
  if (!PULSE.ev.length || !pulseLife()) return;
  const u = pulseUpm(), night = pulseNight(), dk = 0.3 + 0.7 * night;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const e of PULSE.ev) {
    const t = e.t;
    if (e.k === 'heli') {
      if (night < 0.35) continue;
      const [x, y] = pulseHeliAt(e), sx = x + Math.sin(t * 0.9) * u * 7 + Math.sin(t * 2.3) * u * 2, sy = y + Math.cos(t * 0.7) * u * 6, r = u * 4.2, k = Math.min(1, t * 0.8, (e.dur - t) * 0.8) * night;
      if (!vis(sx, sy, r * 3)) continue;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.6); g.addColorStop(0, 'rgba(225,235,255,' + (0.42 * k).toFixed(3) + ')'); g.addColorStop(0.32, 'rgba(210,225,255,' + (0.3 * k).toFixed(3) + ')'); g.addColorStop(0.4, 'rgba(190,210,250,' + (0.08 * k).toFixed(3) + ')'); g.addColorStop(1, 'rgba(180,200,240,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r * 2.6, 0, TAU); ctx.fill();
      continue;
    }
    let col = null, k = 0, R = u * 30 * (1 - (e.f || 0) * 0.4);
    if (e.k === 'gun') { for (const p of e.T) { const d = t - p; if (d >= 0 && d < 0.09) k = Math.max(k, 1 - d / 0.09); } col = '255,205,140'; k *= 0.22 * dk * (1 - e.f * 0.5); }
    else if (e.k === 'boom') { k = (t < 0.06 ? t / 0.06 : Math.exp(-(t - 0.06) * 2.2)) * 0.45 * dk * (1 - e.f * 0.5); col = '255,150,70'; R *= 1.8; }
    else if (e.k === 'siren') { const on = Math.floor(t * e.hz) % 2; k = 0.12 * dk * Math.min(1, t, e.dur - t) * (1 - e.f * 0.5) * (0.6 + 0.4 * Math.abs(Math.sin(t * e.hz * Math.PI))); col = on ? '255,40,40' : '50,90,255'; }
    else if (e.k === 'flare') { const life = t / e.dur, fl = 0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 7.7); k = (e.seen ? 0.1 : 0.13) * night * Math.min(1, t * 1.5) * (life > 0.8 ? (1 - life) / 0.2 : 1) * fl * (1 - e.f * 0.4); col = '255,70,45'; R = u * (e.seen ? 16 : 26); }
    if (k < 0.004 || !col) continue;
    let x = e.x, y = e.y;
    if (e.k === 'flare') { x += (WX.wx || 0) * u * 0.5 * t; y += (WX.wy || 0) * u * 0.5 * t + u * 0.08 * t * t; }
    const g = ctx.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, 'rgba(' + col + ',' + k.toFixed(3) + ')'); g.addColorStop(0.4, 'rgba(' + col + ',' + (k * 0.35).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    // a flare in view: the burning point itself, hissing red
    if (e.k === 'flare' && e.seen && vis(x, y, u * 2)) { ctx.fillStyle = 'rgba(255,190,170,' + Math.min(1, k * 4).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(x, y, u * 0.18, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}

/* ---------- hit-stop ---------- */
function pulseStopOk() { return !NET.started && SET.hitstop !== false && !RM && (SET.shake == null ? 100 : SET.shake) > 0 && G.mode === 'play'; }
function pulseKill(e) {
  const z = e && e.z; if (!z || !pulseStopOk() || (e.by != null && e.by !== 1)) return;
  const src = z.lastSrc || 'bullet', now = performance.now(); if (src === 'a10' || now < PULSE.stopCd) return;
  let k = 0;
  if (typeof src === 'string' && src[0] === 'k') k = 0.06;   // a knife finisher
  else if (src === 'blast') k = 0.035;
  else if (z.hitReg === 'head') k = 0.05;
  else if ((z.hitP || 0) >= 1.5) k = 0.045;
  if (z.boss) k = Math.max(k, 0.09);
  if (!k) return;
  PULSE.stopT = Math.max(PULSE.stopT, k); PULSE.stopCd = now + 450; PULSE.n.stops++;
}
// the main loop's time step through the hit-stop (the world nearly stops for those few hundredths of a second)
function pulseStop(dt, rdt) { if (PULSE.stopT > 0) { PULSE.stopT -= rdt; if (!pulseStopOk()) PULSE.stopT = 0; return dt * 0.05; } return dt; }

/* ---------- voices ---------- */
function pulseVoiceKind(z, d) {
  if (z.gear === 2) return Math.random() < 0.45 ? 'screech' : 'snarl';
  if (d < z.r * 4 + pulseUpm() * 1.2) return Math.random() < 0.7 ? 'snarl' : 'groan';
  return Math.random() < 0.7 ? 'groan' : 'gurgle';
}
function pulseVoiceRate(z) { const m = z.m || {}, b = m.def ? PULSE_BODY[m.def.body] || 1 : 1; return clamp(b / Math.pow(m.size || 1, 0.7) * (0.93 + Math.random() * 0.14), 0.6, 1.5); }
const PULSE_VC = [];
function pulseVoiceTick(dt) {
  if (SET.voices === false || !G.p || G.mode !== 'play' || !SFX.zvoice) return;
  PULSE.voiceT -= dt; if (PULSE.voiceT > 0) return;
  const p = G.p, u = pulseUpm(), R = u * 14, C = PULSE_VC; C.length = 0; let tot = 0;
  for (const z of G.zs) {
    if (z.dead || z.fly || (z.st && (z.st.under || z.st.down)) || (z.vcT || 0) > G.time) continue;
    const dx = z.x - p.x, dy = z.y - p.y; if (dx > R || dx < -R || dy > R || dy < -R) continue;
    const d = Math.hypot(dx, dy); if (d > R) continue;
    const w = (1 - d / R) * (1 - d / R) * (z.gear === 2 ? 2 : 1); C.push(z, d, w); tot += w; if (C.length >= 72) break;
  }
  const n = C.length / 3; if (!n) { PULSE.voiceT = 0.8; return; }
  PULSE.voiceT = clamp(1.6 / Math.sqrt(n), 0.28, 1.4) * (0.7 + Math.random() * 0.6);
  let r = Math.random() * tot, i = 0; for (; i < C.length - 3; i += 3) { r -= C[i + 2]; if (r <= 0) break; }
  const z = C[i], d = C[i + 1], kind = pulseVoiceKind(z, d), hw = W / gcamZoom() / 2;
  const vol = Math.pow(1 - d / R, 1.2) * ({ screech: 0.75, snarl: 0.8, groan: 0.7, gurgle: 0.6 })[kind] * 0.9;
  if (SFX.zvoice(kind, clamp((z.x - cam.x) / hw, -1, 1), vol, pulseVoiceRate(z), d / R * 0.7)) PULSE.n.voices++;
  z.vcT = G.time + 2.5 + Math.random() * 3.5;
}
// the survivor's breath, the grunt on the roll, the gasp when hit, the heart near the end
function pulseBodyTick(dt) {
  const p = G.p; if (!p || G.mode !== 'play' || p.down) { PULSE.lastHp = -1; return; }
  const st = p.arm && p.arm.st, dodge = p.dashT > 0 && p.dashK === 'dodge', hpK = p.maxHp ? p.hp / p.maxHp : 1;
  PULSE.exert = clamp(PULSE.exert + (st === 'sprint' ? dt * 0.22 : -dt * 0.12) + (dodge && !PULSE.dodge ? 0.12 : 0), hpK < 0.3 ? (1 - hpK / 0.3) * 0.6 : 0, 1);
  if (SET.voices === false || !SFX.pvoice) { PULSE.dodge = dodge; PULSE.lastHp = p.hp; return; }
  if (dodge && !PULSE.dodge && Math.random() < 0.55) SFX.pvoice('grunt', 0.42, 0.96 + Math.random() * 0.08);
  PULSE.dodge = dodge;
  if (PULSE.lastHp >= 0 && p.hp < PULSE.lastHp - 3 && throttleP('hurt', 600)) SFX.pvoice('hurt', 0.55, 0.95 + Math.random() * 0.1);
  PULSE.lastHp = p.hp;
  const ex = PULSE.exert;
  if (ex > 0.3) {
    PULSE.breathT -= dt;
    if (PULSE.breathT <= 0) { const per = 2.4 - (2.4 - 0.9) * (ex - 0.3) / 0.7; PULSE.breathT = per / 2 * (0.9 + Math.random() * 0.2); SFX.pvoice(PULSE.breathIn ? 'in' : ex > 0.7 ? 'outH' : 'out', 0.12 + 0.3 * (ex - 0.3), 0.96 + Math.random() * 0.08); PULSE.breathIn = !PULSE.breathIn; PULSE.n.breaths++; }
  } else PULSE.breathT = 0.2;
  if (hpK < 0.3 && hpK > 0) { const sev = 1 - hpK / 0.3; PULSE.heartT -= dt; if (PULSE.heartT <= 0) { PULSE.heartT = 1 - 0.45 * sev; SFX.pvoice('heart', 0.45 + 0.4 * sev, 1); } }
}
const PULSE_TH = {};
function throttleP(k, ms) { const t = performance.now(); if (PULSE_TH[k] && t - PULSE_TH[k] < ms) return false; PULSE_TH[k] = t; return true; }

/* ---------- the frame ---------- */
function pulseTick(dt) {
  try {
    // a shot of yours scares the rats (the arms engine's kick rises with each)
    const a = G.p && G.p.arm; if (a && (a.camK || 0) > PULSE.lastK + 0.01) PULSE.shotT = G.time; PULSE.lastK = a ? a.camK || 0 : 0;
    pulseRatTick(dt); pulseEvTick(dt); pulseFlyTick(dt); pulseVoiceTick(dt); pulseBodyTick(dt);
  } catch (e) { coreHurt('LIFE', e); }
}
function pulseDrawUnder(vis) { try { pulseRatDraw(vis); pulseShadowDraw(vis); } catch (e) { coreHurt('LIFE', e); } }
function pulseDrawOver(vis) { try { pulseFlyDraw(vis); pulseSteamDraw(vis); pulsePlumeDraw(); } catch (e) { ctx.globalAlpha = 1; coreHurt('LIFE', e); } }
coreOn('kill', 'LIFE', pulseKill);

/* ---------- self-test ---------- */
function pulseSelfTest() {
  let n = 0, pass = 0, why = '';
  // hit-stop: the time step nearly stops while it runs, then comes back whole
  { const sv = [PULSE.stopT, G.mode, NET.started]; n++; PULSE.stopT = 0.05; const a = pulseStop(0.016, 0.016); PULSE.stopT = 0; const b = pulseStop(0.016, 0.016); PULSE.stopT = sv[0];
    if (!pulseStopOk() || (a < 0.002 && b === 0.016)) pass++; else why = why || 'the hit-stop time step'; }
  // voices: a frenzied zombie screeches or snarls; a big one sounds deeper than a small one
  { n++; const big = { gear: 0, r: 10, m: { size: 1.4, def: { body: 'heavy' } } }, small = { gear: 0, r: 10, m: { size: 0.9, def: { body: 'thin' } } }, fz = { gear: 2, r: 10, m: {} };
    let rb = 0, rs = 0; for (let i = 0; i < 8; i++) { rb += pulseVoiceRate(big); rs += pulseVoiceRate(small); }
    const k = pulseVoiceKind(fz, 999); if (rb < rs && (k === 'screech' || k === 'snarl')) pass++; else why = why || 'the voices'; }
  // the city beyond the screen: a helicopter crosses the view, a far firefight has its flashes
  { n++; const L = PULSE.ev.length, h = pulseEvent('heli', 0.6, 0.4, true), g = pulseEvent('gunfar', -0.5, 0.5, true);
    const ok = h && g && Math.sign(h.x0 - cam.x) === 1 && Math.sign(h.x1 - cam.x) === -1 && g.T.length >= 4 && g.x < cam.x;
    PULSE.ev.splice(L); if (ok) pass++; else why = why || 'the far events'; }
  // a rat runs from you
  { n++; const sv = PULSE.rats.slice(), u = pulseUpm(); PULSE.rats.length = 0; const ok0 = pulseLife();
    if (!ok0 || !G.p) pass++;
    else { const r = { x: G.p.x + u * 2, y: G.p.y, a: Math.PI, st: 'run', t: 0, go: 1, sp: u * 2, ph: 0, life: 0, s: 1, wall: Math.PI, corpse: null }; PULSE.rats.push(r); const sm = G.mode; G.mode = 'play'; pulseRatTick(0.05); G.mode = sm;
      if (r.st === 'flee' && Math.cos(r.a) > 0) pass++; else why = why || 'the rats'; }
    PULSE.rats.length = 0; for (const r of sv) PULSE.rats.push(r); }
  return { ok: pass === n, n: n, pass: pass, why: why };
}
