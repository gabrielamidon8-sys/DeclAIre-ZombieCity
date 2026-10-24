/* ================= WX v3: the weather engine (1.9.998, redone) =================
   The sky is no longer one state that crossfades into the next. It runs on two layers, the way real weather does:
   - A planner works through weather systems in the order the atmosphere puts them: fair spells, a warm front (rain
     building over minutes, steady with heavier bursts, then a drizzle tail), the warm sector behind it, a cold front
     (a squall line that sweeps across the city: a wind jump, then a downpour, then clearing), post-frontal showers,
     afternoon thunderstorms, radiation fog that settles in the low wet places at night and burns off, advection fog
     rolling in on the wind, heatwaves, dust haze and haboobs in the desert, flurries, snow and blizzards. It plays them
     like a deck (a kind that has not come up for a while is more likely, so nothing stalls), weighted by the season, the
     hour (fog by night and morning, storms in the afternoon, heat at midday) and the district you are in.
   - Over that, a field of rain cells drifts across the city on the steering wind, each with a life: towering (dark, no
     rain yet), mature (the heaviest rain, lightning that leads the peak, hail in the strongest cores, and an outflow gust
     front that reaches you before the rain does), then dissipating. Fronts are lines that move: you can watch the edge
     of a shower or a squall line, or the wall of a haboob, come across the screen.
   Rain intensity, fog density and dust are fields over the world (precipitation is evaluated across the screen, so the
   edge of a shower is visible), and the kind of precipitation comes from temperature: the season, the hour and the
   district (the frozen north is 30 degrees colder, the desert hotter by day and colder at night), so rain turns to sleet
   and then snow as you walk north, and in the desert most rain evaporates before it lands. Heavy rain looks heavy
   because its drops are bigger and faster, not because there are more of them: longer, brighter streaks, more splashes.
   The rain falls at the angle the wind gives it. The ground gets wet first and only grows puddles after enough rain has
   fallen; it dries in the sun and wind, puddles last. Snow settles and melts the same way.
   With "weather affects gameplay" on, fog, sand and blizzards shorten how far you can see, blizzards slow everyone,
   wind pushes you, and lightning hits whatever is under it (water carries the shock).
   The wind: a mean from the weather, a slow random wander (an Ornstein-Uhlenbeck process, so a 3-second gust peaks at
   about 1.45 times the mean as measured), gust waves you can watch crossing the trees and grass before they reach you,
   and the outflow of storm cells. Litter, leaves, sand and snow skitter along the ground in front of it. */
const WXK = {
  clear: 'Clear', fair: 'Fair', overcast: 'Overcast', drizzle: 'Drizzle', rain: 'Rain', downpour: 'Downpour', showers: 'Showers', squall: 'Squall line',
  storm: 'Thunderstorm', hail: 'Hail', sleet: 'Sleet', freezing: 'Freezing rain', fog: 'Fog', mist: 'Mist', flurries: 'Flurries', snow: 'Snow',
  blizzard: 'Blizzard', sand: 'Sandstorm', haze: 'Dust haze', heat: 'Heatwave', ash: 'Ashfall', embers: 'Embers'
};
const WX = {
  kind: 'clear', local: 'clear', t: 30, rt: 0, rd: 60, hold: -1, rain: 0, snow: 0, sleet: 0, hail: 0, sand: 0, ash: 0, fog: 0, storm: 0, leaves: 0, embers: 0, petals: 0, dark: 0,
  wind: 0.15, wbase: 0.15, wdir: 0.35, wx: 0.15, wy: 0.05, gust: 0, gA: 0, gf: 0, gT: 4, ou: 0, gfx: 0, gfy: 0, gfk: 0, wet: 0, acc: 0, pud: 0, cover: 0, snowAcc: 0, ice: 0,
  flash: 0, pulses: [], vis: 1, slow: 1, next: 4, strikes: [], bolts: [], label: 'Clear',
  gr: [0, 0, 0, 0], grT: [0, 0, 0, 0], sampleT: 0, river: 0, fireLv: 0, lastCam: null, splash: [],
  R: 0, drop: 0.3, temp: 12, snowF: 0, cloud: 0.1, heat: 0, haze: 0, cells: [], front: null, since: {}, bx: 0, by: 0, sx: 0, sy: 0,
  T: null, grid: null, hailG: [], lrate: 0, lastFlashT: -99
};
const wxU = () => 32 * SCL / SCALE_REAL;                 // world units per metre
const wxSmooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// the weather systems: how long each lasts (seconds of play) and what can follow it (weights, before the season, the
// hour, the district and the deck have their say)
const WX_REG = {
  clear:    { d: [80, 170], next: { fair: 3, overcast: 2, heat: 1.2, fog: 1, haze: 0.6, flurries: 0.6 } },
  fair:     { d: [80, 160], next: { clear: 2, overcast: 2, showers: 1.2, storm: 1, heat: 0.5 } },
  overcast: { d: [60, 140], next: { drizzle: 1.5, warm: 2.5, clear: 1, mist: 1, fair: 1, snow: 0.8 } },
  drizzle:  { d: [70, 140], next: { overcast: 2, mist: 1.2, warm: 1, clear: 0.8 } },
  warm:     { d: [150, 260], next: { sector: 3 } },
  sector:   { d: [50, 110], next: { cold: 3 } },
  cold:     { d: [100, 180], next: { showers: 3 } },
  showers:  { d: [120, 220], next: { fair: 2, clear: 2, storm: 0.6 } },
  storm:    { d: [140, 260], next: { showers: 2, fair: 1.5, overcast: 1 } },
  fog:      { d: [100, 200], next: { clear: 2, fair: 1, overcast: 1 } },
  mist:     { d: [90, 170], next: { overcast: 2, drizzle: 1, clear: 1 } },
  heat:     { d: [100, 200], next: { storm: 1.5, clear: 1.5, fair: 1, haze: 0.5 } },
  haze:     { d: [90, 170], next: { clear: 1.5, sand: 1, fair: 1 } },
  sand:     { d: [90, 170], next: { haze: 2, clear: 1 } },
  flurries: { d: [80, 150], next: { snow: 2, overcast: 1, clear: 1 } },
  snow:     { d: [120, 240], next: { flurries: 1, blizzard: 1, overcast: 1.5, clear: 0.8 } },
  blizzard: { d: [90, 170], next: { snow: 2, flurries: 1 } }
};
// the fixed choices in the settings: which system, held at which point of its course
const WX_FIXED = { clear: ['clear', 0.5], rain: ['warm', 0.55], storm: ['storm', 0.5], snow: ['snow', 0.55], fog: ['fog', 0.5], sand: ['sand', 0.6] };
function wxLevel() { const k = TUNE.WX || 0, sc = k >= 2 ? 1 : k >= 1 ? Math.max(PERF.wxScale, 0.75) : k < 0 ? Math.min(PERF.wxScale, 0.55) : PERF.wxScale; return SET.weather === 'off' ? 0 : SET.weather === 'low' ? 0.45 : SET.weather === 'full' ? 1 : Math.min(1, Q.wx * sc * (k >= 2 ? 1.15 : 1)); }
function wxHour() { return typeof LUX !== 'undefined' && LUX.hour != null && isFinite(LUX.hour) ? LUX.hour : 12; }
function wxIsClient() { return typeof NET !== 'undefined' && NET.role === 'client' && NET.started; }
// how likely a system is now: the season, the hour, the district round the camera
function wxWeight(k) {
  const sea = WORLD.season, h = wxHour(), night = h < 7 || h > 21, aft = h >= 13 && h <= 19, mid = h >= 11 && h <= 17;
  const snowy = sea === 3 || bioK('snow') > 0.4, desert = bioK('desert');
  let w = 1;
  if (k === 'flurries' || k === 'snow' || k === 'blizzard') w = snowy ? (sea === 3 ? 1.4 : 1) : 0;
  else if (k === 'sand') w = desert > 0.25 ? 1.6 * desert : 0;
  else if (k === 'haze') w = 0.25 + desert * 1.5;
  else if (k === 'heat') w = sea === 1 ? (mid ? 2.2 : 1) : sea === 0 || sea === 2 ? 0.25 : 0;
  else if (k === 'storm') w = (sea === 1 ? 2 : sea === 3 ? 0.15 : 1) * (aft ? 1.8 : 0.8);
  else if (k === 'fog') w = (sea === 2 ? 1.8 : sea === 1 ? 0.4 : 1.1) * (night || h < 10 ? 2 : 0.3) * (1 - desert * 0.8);
  else if (k === 'mist') w = sea === 2 ? 1.4 : 1;
  else if (k === 'drizzle') w = sea === 2 ? 1.4 : sea === 1 ? 0.5 : 1;
  else if (k === 'showers') w = sea === 0 ? 1.5 : 1;
  else if (k === 'warm') w = sea === 2 ? 1.3 : 1;
  if (snowy && (k === 'heat')) w = 0;
  return w;
}
// the next system: its successors' weights times the conditions times the deck (one that has not come up for a while
// is likelier, so a run sees the range instead of stalling in one kind)
function wxPick(from) {
  const R0 = WX_REG[from] || WX_REG.clear, opts = [];
  let tot = 0;
  for (const k in R0.next) { const s = WX.since[k] == null ? 6 : WX.since[k], w = R0.next[k] * wxWeight(k) * (1 + Math.min(8, s) * 0.3); if (w > 0) { opts.push([k, w]); tot += w; } }
  if (!opts.length) return 'clear';
  let r = Math.random() * tot; for (const [k, w] of opts) { if (r < w) return k; r -= w; }
  return opts[0][0];
}
function wxBegin(k, hold) {
  const R0 = WX_REG[k] || WX_REG.clear;
  for (const q in WX_REG) WX.since[q] = (WX.since[q] || 0) + 1; WX.since[k] = 0;
  WX.kind = k; WX.rt = 0; WX.rd = R0.d[0] + Math.random() * (R0.d[1] - R0.d[0]); WX.t = WX.rd; WX.hold = hold == null ? -1 : hold;
  // (1.9.9991) what comes after this is decided now, so the sky can show it coming (a storm's tower on the horizon)
  WX.nextK = WX.hold < 0 && !wxIsClient() ? wxPick(k) : null;
  WX.front = null;
  // the moving lines: a warm front's broad leading edge, a cold front's squall line, a haboob's dust wall. Each starts
  // upwind of the camera and crosses it at the speed real ones do (a cold front 12 m/s, a warm front half that).
  const u = wxU(), dir = WX.wdir, ca = Math.cos(dir), sa = Math.sin(dir), view = Math.hypot(W, H) / Math.max(0.2, ZOOM) / 2, here = cam.x * ca + cam.y * sa;
  if (hold < 0 || hold == null) {
    if (k === 'warm') WX.front = { k: 'warm', dir: dir, v: 5 * u, w: 70 * u, pos: here - view - 100 * u };
    else if (k === 'cold') WX.front = { k: 'cold', dir: dir, v: 12 * u, w: 6 * u, pos: here - view - 300 * u, peak: 1.25 + Math.random() * 0.2, hail: Math.random() < 0.3 };
    else if (k === 'sand') WX.front = { k: 'dust', dir: dir, v: 13 * u, w: 10 * u, pos: here - view - 250 * u };
  } else if (k === 'cold' || k === 'sand') WX.front = { k: k === 'cold' ? 'cold' : 'dust', dir: dir, v: 0, w: 6 * u, pos: here + 400 * u, peak: 1.2, hail: false };
  // showers and storms start with a cell or two already on the way
  if (k === 'showers' || k === 'storm' || k === 'snow') for (let i = 0; i < (k === 'storm' ? 2 : 1); i++) wxCellSpawn(k, i === 0 ? 0.55 : 1);
  wxAhead(k);
}
function wxReset() {
  WX.strikes = []; WX.bolts = []; WX.flash = 0; WX.pulses = []; WX.next = 5; WX.cover = 0; WX.splash = []; WX.cells = []; WX.hailG = []; WX.front = null;
  WX.rain = WX.snow = WX.sleet = WX.hail = WX.sand = WX.ash = WX.fog = WX.storm = WX.leaves = WX.embers = WX.petals = WX.dark = WX.wet = WX.acc = WX.pud = WX.snowAcc = WX.ice = 0;
  WX.gA = WX.gust = WX.ou = WX.gfx = WX.gfy = WX.gfk = 0; WX.gT = 3; WXD.length = 0; WX.since = {}; WX.T = null;
  if (SET.wxMode && SET.wxMode !== 'dynamic') { wxForce(SET.wxMode); return; }
  wxBegin(Math.random() < 0.35 ? 'overcast' : Math.random() < 0.5 ? 'fair' : 'clear');
  WX.rt = WX.rd * 0.3;
}
function wxForce(mode) { const f = WX_FIXED[mode]; if (f) wxBegin(f[0], f[1]); else wxBegin('clear'); }
function wxNext() {
  if (wxIsClient()) { WX.t = 999; return; }
  if (SET.wxMode && SET.wxMode !== 'dynamic') { wxForce(SET.wxMode); return; }
  wxBegin(WX.nextK && WX_REG[WX.nextK] && wxWeight(WX.nextK) > 0 ? WX.nextK : wxPick(WX.kind));
}
/* ---------- temperature: what falls ---------- */
const WX_TBASE = [12, 25, 13, -3], WX_TOFF = { snow: -30, desert: 12, burning: 5, ash: 1 };
function wxTempMix(mix) {
  const h = wxHour(), dK = mix ? (mix.desert || 0) : 0, di = 5 * Math.sin((h - 9) / 24 * TAU) * (1 + 1.3 * dK);
  let t = WX_TBASE[WORLD.season] + di + (WX.toff || 0);
  if (mix) for (const b in mix) if (WX_TOFF[b]) t += WX_TOFF[b] * mix[b];
  return t;
}
const wxSnowF = t => wxSmooth(1.5, -1, t);
/* ---------- what each system does over its course (ph 0..1) ---------- */
function wxTargets(k, ph, env) {
  const T = { cloud: 0.1, R: 0, drop: 0.3, fog: 0, bank: 0.45, wind: 0.18, gustK: 1, dark: 0, cells: 0, cellK: 'shower', heat: 0, haze: 0, sand: 0, toff: 0, drizzle: 0 };
  const burst = 0.5 + 0.5 * Math.sin(G.time * 0.21) * Math.sin(G.time * 0.077 + 1.3);
  switch (k) {
    case 'clear': T.cloud = 0.08; T.wind = 0.16 + env.desert * 0.08; break;
    case 'fair': T.cloud = 0.38; T.wind = 0.22; T.cells = env.aft && WORLD.season !== 3 ? 0.006 : 0; break;
    case 'overcast': T.cloud = 0.86; T.dark = 0.16; T.wind = 0.28; break;
    case 'drizzle': T.cloud = 0.92; T.R = 0.12; T.drop = 0.08; T.drizzle = 1; T.fog = 0.2; T.bank = 0.3; T.dark = 0.18; T.wind = 0.2; break;
    case 'warm':
      T.cloud = 0.92; T.dark = 0.22; T.wind = 0.34; T.toff = 1;
      T.R = 0.62 * wxSmooth(0, 0.3, ph) * (0.75 + 0.5 * burst) * (1 - wxSmooth(0.8, 1, ph)) + (ph > 0.82 ? 0.12 : 0);
      if (ph > 0.85) { T.drizzle = 1; T.drop = 0.1; } else T.drop = 0.25 + T.R * 0.45;
      T.fog = ph < 0.14 ? 0.32 * (1 - ph / 0.14) : 0; break;   // (fog can form just before a warm front's rain)
    case 'sector': T.cloud = 0.62; T.R = 0.06 * burst; T.drizzle = 1; T.drop = 0.1; T.dark = 0.1; T.wind = 0.32; T.toff = 3; T.fog = 0.1; break;
    case 'cold': T.cloud = 0.88; T.dark = 0.3; T.wind = 0.42; T.toff = -6 * wxSmooth(0.15, 0.45, ph); T.drop = 0.8; T.cells = ph > 0.5 ? 0.012 : 0; break;
    case 'showers': T.cloud = 0.55; T.wind = 0.32; T.cells = 0.03; T.cellK = 'shower'; T.dark = 0.06; T.toff = -4; break;
    case 'storm': T.cloud = 0.8; T.dark = 0.2 + 0.12 * wxSmooth(0, 0.2, ph); T.wind = 0.38; T.cells = 0.028 * wxSmooth(0, 0.15, ph); T.cellK = 'storm'; T.toff = -2; break;
    case 'fog':   // radiation fog: settles, pools in the low wet places, burns off from the edges in
      T.cloud = 0.2; T.wind = 0.05; T.gustK = 0.2; T.dark = 0.08;
      T.fog = 0.9 * wxSmooth(0, 0.25, ph) * (1 - wxSmooth(0.72, 1, ph)); T.bank = 0.3 + 0.5 * wxSmooth(0.7, 1, ph); break;
    case 'mist': T.cloud = 0.7; T.wind = 0.2; T.fog = 0.55 * wxSmooth(0, 0.2, ph) * (1 - wxSmooth(0.8, 1, ph)); T.bank = 0.75; T.dark = 0.08; break;   // advection fog: banks on the wind
    case 'heat': T.cloud = 0.04; T.wind = 0.12; T.heat = wxSmooth(0, 0.3, ph) * (1 - wxSmooth(0.85, 1, ph)) * (env.mid ? 1 : 0.6); T.dark = -0.04; T.toff = 6; break;
    case 'haze': T.cloud = 0.25; T.wind = 0.42; T.haze = 0.5; T.sand = 0.22 * env.desertish; break;
    case 'sand': T.cloud = 0.35; T.wind = 0.95; T.dark = 0.12; T.haze = 0.3; break;   // (the storm itself comes with the dust wall: wxDust)
    case 'flurries': T.cloud = 0.75; T.R = 0.22; T.drop = 0.2; T.wind = 0.22; T.dark = 0.08; T.toff = -8; break;
    case 'snow': T.cloud = 0.92; T.R = 0.6 * wxSmooth(0, 0.2, ph) * (1 - wxSmooth(0.85, 1, ph)) * (0.8 + 0.4 * burst); T.drop = 0.4; T.wind = 0.26; T.dark = 0.12; T.cells = 0.008; T.cellK = 'snow'; T.toff = -10; break;
    case 'blizzard': T.cloud = 1; T.R = 1.05; T.drop = 0.5; T.wind = 1; T.fog = 0.5; T.bank = 0.2; T.dark = 0.22; T.toff = -14; break;
  }
  return T;
}
/* ---------- rain cells ---------- */
function wxCellSpawn(k, near) {
  if (WX.cells.length >= 6) return;
  const u = wxU(), view = Math.hypot(W, H) / Math.max(0.2, ZOOM) / 2, dir = WX.wdir, ca = Math.cos(dir), sa = Math.sin(dir);
  const storm = k === 'storm', r = (storm ? 55 + Math.random() * 60 : k === 'snow' ? 70 + Math.random() * 60 : 35 + Math.random() * 45) * u;
  const D = (view + r * 1.1) * (near == null ? 1 + Math.random() * 0.6 : near), lat = (Math.random() - 0.5) * 2 * (view + r * 0.4);
  const steer = Math.max(3, 1.7 * WX.wbase * 12) * u, life = storm ? 70 + Math.random() * 50 : 50 + Math.random() * 40;
  WX.cells.push({ x: cam.x - ca * D - sa * lat, y: cam.y - sa * D + ca * lat, vx: ca * steer, vy: sa * steer, r: r, age: life * (near != null && near < 1 ? 0.28 : 0.12), life: life,
    peak: storm ? 0.95 + Math.random() * 0.45 : k === 'snow' ? 0.5 + Math.random() * 0.3 : 0.45 + Math.random() * 0.45, k: k === 'storm' ? 'storm' : k === 'snow' ? 'snow' : 'shower',
    hail: storm && Math.random() < 0.35, seed: Math.random() * 10, gst: 0 });
}
// a cell's rain over its life: towering (none yet), mature (the most), dissipating (light)
function wxCellRain(a) { return a < 0.3 ? a / 0.3 * 0.12 : a < 0.65 ? 0.12 + 0.88 * wxSmooth(0.3, 0.42, a) : 0.5 * Math.max(0, 1 - (a - 0.65) / 0.35) + 0.5 * Math.max(0, 1 - (a - 0.65) / 0.12); }
// its lightning leads its rain (the "lightning jump" a few minutes before the peak)
function wxCellFlash(a) { return a < 0.25 ? 0 : a < 0.38 ? (a - 0.25) / 0.13 : a < 0.6 ? 1 : Math.max(0, 1 - (a - 0.6) / 0.25); }
function wxCellAt(c, x, y) {
  const dx = x - c.x, dy = y - c.y, q = (dx * dx + dy * dy) / (c.r * c.r); if (q > 9) return 0;
  const th = Math.atan2(dy, dx), wob = 1 + 0.22 * Math.sin(th * 3 + c.seed) + 0.12 * Math.sin(th * 5 - c.seed * 1.7);
  return c.peak * wxCellRain(c.age / c.life) * Math.exp(-q * wob);
}
function wxCellsTick(dt, Tg) {
  const view = Math.hypot(W, H) / Math.max(0.2, ZOOM) / 2;
  if (!wxIsClient() && Tg.cells > 0 && Math.random() < Tg.cells * dt * 10 * (WX.cells.length < 2 ? 1.6 : 1)) wxCellSpawn(Tg.cellK);
  for (let i = WX.cells.length - 1; i >= 0; i--) {
    const c = WX.cells[i]; c.age += dt; c.x += c.vx * dt; c.y += c.vy * dt;
    const far = Math.hypot(c.x - cam.x, c.y - cam.y) > view * 3 + c.r * 3;
    if (c.age > c.life || far) WX.cells.splice(i, 1);
  }
}
/* ---------- fronts ---------- */
// distance behind the line (positive once it has passed the point), for the current front
function wxBehind(F, x, y) { return F.pos - (x * Math.cos(F.dir) + y * Math.sin(F.dir)); }
function wxFrontR(x, y, base) {
  const F = WX.front; if (!F) return base;
  const b = wxBehind(F, x, y);
  if (F.k === 'warm') return base * wxSmooth(-F.w * 0.2, F.w, b);
  if (F.k === 'cold') { if (b < 0) return 0; const tail = b / Math.max(1, F.v || wxU() * 12); return F.peak * wxSmooth(0, F.w, b) * Math.exp(-tail / 26) + 0.2 * wxSmooth(0, F.w * 4, b) * Math.exp(-tail / 90); }
  return base;
}
function wxDustAt(x, y) {
  const F = WX.front; if (!F || F.k !== 'dust') return 0;
  const b = wxBehind(F, x, y); if (b < -F.w) return 0;
  return wxSmooth(-F.w, F.w, b) * (0.7 + 0.3 * Math.exp(-b / Math.max(1, F.v * 50)));
}
// precipitation intensity at a point (0 none, about 0.12 drizzle, 0.35 light, 0.6 moderate, 1 heavy, 1.3+ a downpour)
function wxR(x, y) {
  const Tg = WX.T; let r = Tg ? wxFrontR(x, y, Tg.R) : 0;
  for (const c of WX.cells) r += wxCellAt(c, x, y);
  return r;
}
function wxHailAt(x, y) {
  let h = 0;
  for (const c of WX.cells) { if (!c.hail) continue; const v = wxCellAt(c, x, y); if (v > 0.9) h = Math.max(h, wxSmooth(0.9, 1.25, v)); }
  const F = WX.front; if (F && F.k === 'cold' && F.hail) { const b = wxBehind(F, x, y), tail = b / Math.max(1, F.v); if (b > 0 && tail < 14) h = Math.max(h, 0.8 * (1 - tail / 14)); }
  return h;
}
// fog density at a point: the system's fog, broken into banks that drift on the wind, thicker over water
function wxFogAt(x, y) {
  const Tg = WX.T; if (!Tg || Tg.fog <= 0.005) return 0;
  const u = wxU(), n = perlin((x - WX.bx) / (70 * u) + 31.7, (y - WX.by) / (70 * u) - 12.3) * 0.7 + perlin((x - WX.bx) / (24 * u) - 5.1, (y - WX.by) / (24 * u) + 8.9) * 0.3;
  const bank = clamp(0.5 + n * 1.4, 0, 1), k = 1 - Tg.bank + Tg.bank * bank;
  return clamp(Tg.fog * k * (1 + WX.river * 0.45), 0, 1);
}
/* ---------- the update ---------- */
function updWeather(dt, rdt) {
  const lv = wxLevel(), play = G.mode === 'play';
  // the planner (a teammate's game follows the host's systems instead: wxApply)
  if (!wxIsClient()) { WX.rt += dt; WX.t = WX.rd - WX.rt; if (WX.t <= 0 && WX.hold < 0) wxNext(); }
  else WX.rt += dt;
  if (WX.hold >= 0) WX.rt = WX.rd * WX.hold;
  const ph = clamp(WX.rt / Math.max(1, WX.rd), 0, 1), h = wxHour();
  const x = G.p && G.mode !== 'title' ? G.p.x : cam.x, y = G.p && G.mode !== 'title' ? G.p.y : cam.y;
  const bio = bioAt(x, y), sea = WORLD.season, mix = WORLD.mixv || null;
  const env = { aft: h >= 13 && h <= 19, mid: h >= 11 && h <= 17, desert: bioK('desert'), desertish: Math.max(0.25, bioK('desert')) };
  const Tg = WX.T = wxTargets(WX.kind, ph, env), e = Math.min(1, rdt * 0.35), e2 = Math.min(1, rdt * 0.12);
  // fronts move; cells drift and age; fog banks drift on the wind
  if (WX.front) { WX.front.pos += WX.front.v * dt; if (WX.hold < 0 && wxBehind(WX.front, cam.x, cam.y) > (WX.front.k === 'warm' ? 400 : 260) * wxU() && WX.front.k !== 'cold') WX.front.done = 1; }
  wxCellsTick(dt, Tg);
  const fu = wxU() * (1 + WX.wbase * 6); WX.bx += Math.cos(WX.wdir) * fu * dt; WX.by += Math.sin(WX.wdir) * fu * dt;
  // temperature and the kind of precipitation here
  WX.toff = (WX.toff || 0) + ((Tg.toff || 0) - (WX.toff || 0)) * e2;
  const temp = WX.temp = wxTempMix(mix), snowF = WX.snowF = wxSnowF(temp), desertK = env.desert;
  const R0 = wxR(x, y), virga = sea === 3 ? 1 : 1 - 0.7 * desertK, Rv = WX.R = R0 * virga;
  const drop = Tg.drizzle ? 0.08 : clamp(0.15 + Rv * 0.55, 0.1, 1);
  WX.drop += (drop - WX.drop) * Math.min(1, rdt * 0.8);
  const hailT = sea === 3 ? 0 : wxHailAt(x, y);
  // (precipitation follows the field directly: the field itself moves smoothly)
  const fz = WX.kind === 'warm' && temp < 0 && temp > -4;   // freezing rain: liquid falling onto frozen ground
  const rainT = Rv * (fz ? 1 : 1 - snowF), snowT = fz ? 0 : Rv * snowF, sleetT = !fz && snowF > 0.12 && snowF < 0.88 ? Rv * (1 - Math.abs(snowF - 0.5) * 2) : 0;
  const f = Math.min(1, rdt * 2.5);
  WX.rain += (rainT - WX.rain) * f; WX.snow += (snowT - WX.snow) * f; WX.sleet += (sleetT - WX.sleet) * f; WX.hail += (hailT - WX.hail) * f;
  WX.ice += ((fz && Rv > 0.05 ? 1 : 0) - WX.ice) * Math.min(1, rdt * 0.05);
  // dust: haze, the haboob's wall, desert wind lifting sand
  const dust = Math.max(wxDustAt(x, y), Tg.sand || 0, desertK > 0.3 && WX.wbase > 0.7 ? (WX.wbase - 0.7) * 1.6 * desertK : 0);
  WX.sand += (dust - WX.sand) * Math.min(1, rdt * (dust > WX.sand ? 1.2 : 0.3));
  WX.haze += ((Tg.haze || 0) - WX.haze) * e; WX.heat += ((Tg.heat || 0) * (sea === 1 || desertK > 0.4 ? 1 : 0.5) - WX.heat) * e;
  WX.fog += (wxFogAt(x, y) - WX.fog) * Math.min(1, rdt * 0.5);
  // the sky: cover and darkness (a mature cell overhead darkens the street under it)
  let cd = 0; for (const c of WX.cells) { const d = Math.hypot(c.x - x, c.y - y); if (d < c.r * 2.2) cd = Math.max(cd, (1 - d / (c.r * 2.2)) * Math.min(1, c.age / c.life * 3) * (c.k === 'storm' ? 0.32 : 0.16)); }
  const frontDark = WX.front && WX.front.k === 'cold' ? 0.25 * wxSmooth(-220 * wxU(), 0, wxBehind(WX.front, x, y)) * Math.exp(-Math.max(0, wxBehind(WX.front, x, y)) / (WX.front.v * 60 + 1)) : 0;
  WX.cloud += (Math.max(Tg.cloud, cd * 2.5) - WX.cloud) * e;
  WX.dark += (clamp(Tg.dark + cd + frontDark + Rv * 0.06, -0.06, 0.6) - WX.dark) * e;
  // district extras
  const ashT = bioK('ash') * 0.85, embT = bioK('burning');
  const urbanK = bioK('suburb') + bioK('city') + bioK('chaos') + bioK('ruins');
  WX.ash += (ashT - WX.ash) * e; WX.embers += (embT - WX.embers) * e;
  WX.leaves += ((sea === 2 ? urbanK * (0.45 + WX.wind * 0.5) : 0) * (1 - Math.min(1, WX.rain)) - WX.leaves) * e;
  WX.petals += ((sea === 0 ? (bioK('suburb') + bioK('city')) * 0.4 : 0) * (1 - Math.min(1, WX.rain)) - WX.petals) * e;
  if (bio === 'snow' && WX.snow < 0.12 && Rv < 0.05) WX.snow += (0.12 - WX.snow) * e;   // (a few flakes always drift up north)
  // storm activity: mature storm cells near, a squall line passing
  let st = 0; for (const c of WX.cells) if (c.k === 'storm') { const d = Math.hypot(c.x - x, c.y - y); st = Math.max(st, wxCellFlash(c.age / c.life) * c.peak * clamp(1.6 - d / (c.r * 2.5), 0, 1)); }
  if (WX.front && WX.front.k === 'cold') { const b = wxBehind(WX.front, x, y); if (b > -30 * wxU()) st = Math.max(st, 0.85 * Math.exp(-Math.max(0, b) / (WX.front.v * 30 + 1))); }
  WX.storm += (clamp(st, 0, 1) - WX.storm) * Math.min(1, rdt * 1.5);
  // the label
  WX.local = wxLocalKind(Rv, snowF, fz); WX.label = WX_LABEL(WX.local, bio);
  updWind(rdt, Tg.wind, Tg.gustK, x, y);
  // the ground: wet first, puddles only after enough has fallen; it dries in sun and wind (the puddles last); snow settles
  wxSurface(rdt, Rv * (fz ? 1 : 1 - snowF), snowT, temp, bio);
  // what the weather does to the game
  const gp = SET.wxPlay && lv > 0;
  WX.vis = gp ? 1 - Math.min(0.6, WX.fog * 0.46 + WX.sand * 0.42 + (WX.snow > 0.8 ? (WX.snow - 0.8) * WX.wbase * 1.5 : 0) + WX.haze * 0.06) : 1;
  WX.slow = gp && ((WX.snow > 0.75 && WX.wbase > 0.7) || WX.cover > 0.7) ? 0.88 : 1;
  if (gp && play && G.p && (WX.sand > 0.5 || (WX.snow > 0.7 && WX.wbase > 0.7))) { G.p.extX += Math.cos(WX.wdir) * WX.wbase * 30; G.p.extY += Math.sin(WX.wdir) * WX.wbase * 30; }
  // lightning: from the cells (their flash rate), the squall line, flashes far off
  wxLightningTick(dt, rdt, gp && play, x, y);
  for (const s of WX.strikes) { s.t -= dt; if (s.t <= 0 && !s.done) { s.done = true; strike(s); } }
  WX.strikes = WX.strikes.filter(s => !s.done);
  for (const b of WX.bolts) b.life -= rdt; WX.bolts = WX.bolts.filter(b => b.life > 0);
  wxFlashTick(rdt);
  // hailstones bouncing on the ground
  wxHailTick(rdt, lv);
  // ambience: listen for nearby water and fire twice a second
  WX.sampleT -= rdt;
  if (WX.sampleT <= 0) {
    WX.sampleT = 0.5;
    let wn = 0; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; if (isWater(waterAt(x + Math.cos(a) * 140, y + Math.sin(a) * 140))) wn++; if (isWater(waterAt(x + Math.cos(a) * 280, y + Math.sin(a) * 280))) wn += 0.5; }
    WX.river = Math.min(1, wn / 7);
    { let tr = 0; for (const d of WD.act) if ((d.k === 'tree' || d.k === 'bush') && Math.abs(d.x - x) < 420 && Math.abs(d.y - y) < 420) tr++; WX.trees = tr; }
    let fd = 1e9; for (const f2 of WD.fires) { const d = Math.hypot(f2.x - x, f2.y - y); if (d < fd) fd = d; }
    WX.fireLv = fd < 600 ? (1 - fd / 600) : 0;
    SFX.setEnv(bio);
    if (WX.hail > 0.2 && lv > 0) SFX.ambEvent('hail', rand(-0.6, 0.6), 0.35 + WX.hail * 0.5, 0.15);
  }
  if (lv > 0) {
    const bio2 = WORLD.cur ? WORLD.cur.bio : 'city', town = bio2 === 'city' || bio2 === 'chaos' || bio2 === 'burning' || bio2 === 'ruins' || bio2 === 'ash';
    SFX.amb(Object.assign({
      rain: clamp(WX.rain * (0.55 + WX.drop * 0.6) + WX.sleet * 0.3 + WX.hail * 0.3, 0, 1.2), river: WX.river, fire: WX.fireLv, ash: WX.ash * 0.4,
      // a breeze is a soft hush; gusts swell it, storms and blizzards roar
      wind: clamp(0.1 + WX.wbase * 0.45 + WX.gust * 0.75 + WX.gfk * 0.5 + WX.sand * 0.3 + WX.snow * WX.wbase * 0.3 + WX.storm * 0.2, 0, 1),
      windPitch: clamp(WX.wind, 0, 1.4),
      // wind whistling between buildings once it picks up
      whistle: town ? clamp((WX.wind - 0.45) * 1.4, 0, 1) : clamp((WX.wind - 0.7) * 0.8, 0, 0.5),
      hum: town && bio2 !== 'ruins' ? (bio2 === 'city' ? 0.5 : 0.3) : 0,
      // cicadas in the heat of the day (1.9.9991: the night has its crickets)
      bugs: (bio2 === 'suburb' || bio2 === 'desert') && WORLD.season !== 3 && WX.rain < 0.2 && WX.wind < 0.6 ? (bio2 === 'desert' ? 0.6 + WX.heat * 0.3 : 0.4) * (h > 9 && h < 19.5 ? (WORLD.season === 1 ? 1 : 0.45) : 0.12) : 0,
    }, wxBeds(bio2, h)));
  } else SFX.amb(null);
  // the far-off sounds of the world play whatever the weather setting
  ambienceTick(rdt, WORLD.cur ? WORLD.cur.bio : 'city');
}
// what to call the weather where you are
function wxLocalKind(R, snowF, fz) {
  const F = WX.front;
  if (WX.sand > 0.45) return 'sand';
  if (R > 0.04 || WX.hail > 0.1) {
    if (WX.hail > 0.25) return 'hail';
    if (fz) return 'freezing';
    if (snowF > 0.88) return WX.wbase > 0.72 && R > 0.55 ? 'blizzard' : R < 0.3 ? 'flurries' : 'snow';
    if (snowF > 0.12) return 'sleet';
    if (F && F.k === 'cold' && Math.abs(wxBehind(F, cam.x, cam.y)) < 40 * wxU()) return 'squall';
    if (WX.storm > 0.35) return 'storm';
    if (WX.drop < 0.13) return 'drizzle';
    if (R > 1) return 'downpour';
    return WX.kind === 'showers' ? 'showers' : 'rain';
  }
  if (WX.fog > 0.45) return 'fog';
  if (WX.fog > 0.15) return 'mist';
  if (WX.haze > 0.25) return 'haze';
  if (WX.heat > 0.4) return 'heat';
  return WX.cloud > 0.75 ? 'overcast' : WX.cloud > 0.3 ? 'fair' : 'clear';
}
const WX_LABEL = (k, bio) => bio === 'ash' && (k === 'clear' || k === 'overcast' || k === 'fair') ? WXK.ash : bio === 'burning' && (k === 'clear' || k === 'fair') ? 'Smoke' : WXK[k] || 'Clear';
// the ground's water and snow. acc is rain fallen and not yet dried, in millimetres (weather time runs about twenty
// times faster than real: a moderate rain wets the street in about ten seconds and starts puddles after about a minute)
function wxSurface(rdt, rainR, snowR, temp, bio) {
  const K = 20, mmh = rainR * 12, sun = typeof LUX !== 'undefined' && LUX.live ? LUX.day * (1 - WX.cloud) : 0.5, wind = WX.wbase * 12;
  WX.acc += mmh / 3600 * K * rdt;
  const dry = (0.0032 + 0.0064 * sun + 0.0005 * wind) * (rainR > 0.03 ? 0.1 : 1);
  WX.acc = clamp(WX.acc - dry * rdt * (WX.acc > 2 ? 0.6 : 1), 0, 5);
  WX.wet = wxSmooth(0, 0.6, WX.acc) * (bio === 'desert' ? 0.6 : 1);
  WX.pud = clamp((WX.acc - 1.6) / 2, 0, 1);
  // snow: about ten times the depth of the water it holds; settles below freezing, melts above it and in the rain
  if (snowR > 0.02 && temp < 1) WX.snowAcc += snowR * 0.05 * rdt;
  if (temp > 0.5) WX.snowAcc -= (temp * 0.004 + rainR * 0.03) * rdt;
  WX.snowAcc = clamp(WX.snowAcc, 0, 4);
  WX.cover = bio === 'snow' || bio === 'desert' ? 0 : clamp(WX.snowAcc / 3, 0, 0.85);
}
// puddle size for the drawing (0 when the puddles are dry)
function wxPudK() { return WX.pud > 0.01 ? 0.3 + 0.8 * WX.pud : 0; }
/* ---------- co-op: the host's systems, sent every couple of seconds ---------- */
function wxSync() {
  const F = WX.front, r = v => Math.round(v);
  return [WX.kind, Math.round(WX.rt * 10), Math.round(WX.rd * 10), WX.hold < 0 ? -1 : Math.round(WX.hold * 100), Math.round(WX.wdir * 1000),
    F ? [F.k, Math.round(F.dir * 1000), r(F.v), r(F.w), r(F.pos), Math.round((F.peak || 0) * 100), F.hail ? 1 : 0] : 0,
    WX.cells.map(c => [r(c.x), r(c.y), r(c.vx), r(c.vy), r(c.r), Math.round(c.age * 10), Math.round(c.life * 10), Math.round(c.peak * 100), c.k === 'storm' ? 't' : c.k === 'snow' ? 'n' : 'h', c.hail ? 1 : 0, Math.round(c.seed * 100)]), WX.nextK || 0];
}
function wxApply(s) {
  if (!Array.isArray(s) || !WX_REG[s[0]]) return;
  WX.kind = s[0]; WX.rt = s[1] / 10; WX.rd = Math.max(1, s[2] / 10); WX.hold = s[3] < 0 ? -1 : s[3] / 100; WX.t = 999;
  WX.nextK = s[7] && WX_REG[s[7]] ? s[7] : null; WX.tLeft = Math.max(0, WX.rd - WX.rt);
  const dd = s[4] / 1000 - WX.wdir; if (Math.abs(dd) > 0.05) WX.wdir += dd * 0.5;
  const F = s[5]; WX.front = F ? { k: F[0], dir: F[1] / 1000, v: F[2], w: F[3], pos: F[4], peak: F[5] / 100, hail: !!F[6] } : null;
  const K = { h: 'shower', t: 'storm', n: 'snow' };
  WX.cells = (s[6] || []).map(c => ({ x: c[0], y: c[1], vx: c[2], vy: c[3], r: c[4], age: c[5] / 10, life: c[6] / 10, peak: c[7] / 100, k: K[c[8]] || 'shower', hail: !!c[9], seed: c[10] / 100, gst: 0 }));
}

/* ---------- (1.9.9991) the living beds: birdsong by day, crickets by night, frogs by the water, leaves in the wind ---------- */
function wxBeds(bio, h) {
  const sea = WORLD.season, wet = clamp(WX.rain * 1.4 + WX.storm + WX.snow * 0.6 + WX.sand, 0, 1), calm = clamp(1 - (WX.wind - 0.5) * 1.6, 0, 1);
  const day = h > 5.2 && h < 20.2, dawn = h > 5 && h < 8.5, eve = h > 17 && h < 19.8, night = h < 5.4 || h > 20.4;
  const bk = { suburb: 0.85, city: 0.35, ruins: 0.3, snow: 0.22, desert: 0.18, chaos: 0.15, ash: 0.04, burning: 0 }[bio] || 0.2;
  const birds = day ? bk * (dawn ? 1.35 : eve ? 1.1 : 0.75) * (sea === 3 ? 0.3 : sea === 0 ? 1.15 : 1) * (1 - wet * 0.92) * calm : 0;
  const ck = { suburb: 0.85, desert: 0.65, city: 0.3, ruins: 0.45, chaos: 0.2, ash: 0.1 }[bio] || 0;
  const crickets = night || (h > 19.6 && h < 21) ? ck * (sea === 1 ? 1 : sea === 2 ? 0.8 : sea === 0 ? 0.45 : 0) * (1 - wet * 0.85) * calm * (night ? 1 : 0.5) : 0;
  const frogs = WX.river > 0.04 && (night || eve) ? clamp(WX.river * 2, 0, 1) * (sea === 0 ? 1.1 : sea === 1 ? 1 : sea === 2 ? 0.3 : 0) * (1 - WX.snow) * (1 - WX.storm * 0.5) : 0;
  const leaves = (WX.trees || 0) > 2 && !(sea === 3 && TEMPERATE[bio]) ? clamp(Math.min(1, WX.trees * 0.06) * (0.15 + WX.wind * 0.7 + WX.gust * 0.6), 0, 1) : 0;
  return { birds: birds, crickets: crickets, frogs: frogs, leaves: leaves };
}
/* ---------- ambience ---------- */
// Every few seconds something happens somewhere out of sight: a siren across downtown, a dog in the suburbs, crows
// over the ruins, a coyote in the desert, wolves and cracking ice up north. Each district has its own list, the
// weather and season trim it (no birdsong in a storm, frogs only by a river in spring and summer), and each sound
// comes from a random side at its own distance. Gusts bring their own: leaves rushing through nearby trees, a loose
// sign rattling in town, sand or snow hissing past.
const AMBI = { t: 3, gust: 0 };
const AMB_LIST = {
  city: [['siren', 3], ['horn', 2], ['heli', 1], ['gunfar', 2], ['eas', 1], ['glass', 2], ['dog', 1], ['moan', 2], ['bird', 1.5], ['creak', 1], ['gull', 1.5], ['owl', 0.6], ['duck', 0.8]],
  chaos: [['siren', 4], ['gunfar', 4], ['heli', 2], ['boomfar', 2], ['horn', 2], ['glass', 2], ['eas', 1], ['moan', 2]],
  burning: [['creak', 3], ['collapse', 2], ['glass', 2], ['boomfar', 2], ['siren', 1], ['moan', 1]],
  ruins: [['crow', 3], ['metal', 3], ['bellfar', 1], ['collapse', 1], ['creak', 2], ['moan', 2], ['dog', 1], ['owl', 1.5]],
  ash: [['crow', 2], ['metal', 2], ['creak', 1], ['moan', 1], ['bellfar', 1]],
  suburb: [['dog', 4], ['bird', 4], ['chime', 2], ['crow', 1], ['branch', 1], ['siren', 1], ['moan', 1], ['frog', 2], ['owl', 2], ['woodpecker', 1.5], ['duck', 1.5]],
  desert: [['coyote', 3], ['hawk', 3], ['rattle', 1], ['gunfar', 1], ['dog', 0.5], ['metal', 1]],
  snow: [['wolf', 3], ['ice', 2], ['branch', 3], ['crow', 2], ['creak', 1], ['owl', 1.5], ['woodpecker', 1]]
};
function ambOk(k, bio) {
  const sea = WORLD.season, wet = WX.rain > 0.3 || WX.storm > 0.3 || WX.snow > 0.6 || WX.sand > 0.4;
  switch (k) {
    case 'bird': return !wet && WX.wbase < 0.6 && sea !== 3 && wxHour() > 5 && wxHour() < 20.5;
    case 'owl': return !wet && (wxHour() < 5.2 || wxHour() > 20.3);
    case 'woodpecker': return !wet && sea !== 3 && wxHour() > 6 && wxHour() < 18;
    case 'duck': return WX.river > 0.08 && !wet && wxHour() > 5.5 && wxHour() < 20;
    case 'gull': return WX.river > 0.15 && WX.storm < 0.4 && wxHour() > 5.5 && wxHour() < 20;
    case 'frog': return WX.river > 0.05 && (sea === 0 || sea === 1) && WX.snow < 0.2;
    case 'chime': return WX.wind > 0.12;
    case 'crow': return bio !== 'suburb' || sea >= 2;
    case 'branch': return bio === 'snow' || sea === 3;
    case 'rattle': return sea === 1 || sea === 0;
    case 'metal': return bio !== 'desert' || WX.wind > 0.3;   // out in the desert it's the windmill turning
    case 'coyote': case 'wolf': case 'hawk': return WX.storm < 0.5 && WX.sand < 0.6 && WX.snow < 0.85;
  }
  return true;
}
function ambienceTick(rdt, bio) {
  if (!SFX.ambEvent || G.mode === 'intro') return;
  // gusts: when one reaches you
  const g = WX.gust, thr = 0.1 + WX.wbase * 0.3;
  if (g > thr && AMBI.gust <= thr) {
    const ca = Math.cos(WX.wdir), pan = clamp(-ca * 0.8, -0.9, 0.9);
    if (bio === 'desert') SFX.ambEvent('sandgust', pan, 0.4 + g * 0.6, 0.2, true);
    else if (bio === 'snow' || WX.snow > 0.3) SFX.ambEvent('snowgust', pan, 0.4 + g * 0.6, 0.2, true);
    else {
      let trees = 0; for (const d of WD.act) if ((d.k === 'tree' || d.k === 'bush') && Math.abs(d.x - cam.x) < 380 && Math.abs(d.y - cam.y) < 300) trees++;
      if (trees > 2 && !(WORLD.season === 3 && TEMPERATE[bio])) SFX.ambEvent('leaves', pan, Math.min(0.8, 0.2 + trees * 0.03 + g * 0.5), 0.1, true);
      else if (bio !== 'suburb' && Math.random() < 0.6) SFX.ambEvent('clatter', rand(-0.8, 0.8), 0.35 + g * 0.4, 0.3);
      if (bio === 'suburb' && Math.random() < 0.3) setTimeout(() => SFX.ambEvent('chime', rand(-0.7, 0.7), 0.4 + g * 0.4, 0.15), 400);
    }
  }
  AMBI.gust = g;
  AMBI.t -= rdt; if (AMBI.t > 0) return;
  // busier downtown and in the chaos, quieter out in the snow; a storm drowns most of it out
  const busy = bio === 'chaos' ? 0.55 : bio === 'city' ? 0.75 : bio === 'snow' || bio === 'ash' ? 1.3 : 1;
  AMBI.t = (4 + Math.random() * 7) * busy * (1 + WX.storm * 0.8 + WX.sand * 0.6);
  const L = (AMB_LIST[bio] || AMB_LIST.city).filter(e => ambOk(e[0], bio)); if (!L.length) return;
  let tot = 0; for (const e of L) tot += e[1];
  let r = Math.random() * tot, k = L[0][0]; for (const e of L) { r -= e[1]; if (r <= 0) { k = e[0]; break; } }
  const far = k === 'rattle' || k === 'branch' || k === 'chime' ? rand(0, 0.3) : rand(0.25, 0.85), vol = (1 - far * 0.55) * rand(0.5, 0.9), pan = rand(-0.85, 0.85);
  SFX.ambEvent(k, pan, vol, far, k === 'heli');
  if (typeof pulseEvent === 'function') pulseEvent(k, pan, far);   // (1.9.998.2: the helicopter, far fighting, explosions and sirens show)
}
/* ---------- wind ---------- */
// WX.wbase is how hard the weather blows (eased in and out); WX.wind is that plus the wander, the gust passing over you
// right now and any storm outflow. A gust is a band of stronger wind that sweeps along the wind's direction.
function wxGauss() { let u = 0, v = 0; while (u === 0) u = Math.random(); v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
function updWind(rdt, target, gustK, px, py) {
  WX.wbase += (target - WX.wbase) * Math.min(1, rdt * 0.35);
  // the slow random wander (tau 6 s): with sigma about 0.17 a 3-second peak comes to about 1.45 times the mean
  const tau = 6, sig = 0.17 * (gustK == null ? 1 : gustK);
  WX.ou += (-WX.ou / tau) * rdt + sig * Math.sqrt(2 * Math.max(0, rdt) / tau) * wxGauss(); WX.ou = clamp(WX.ou, -1.2, 1.6);
  const ca = Math.cos(WX.wdir), sa = Math.sin(WX.wdir), camS = cam.x * ca + cam.y * sa;
  WX.gT -= rdt;
  if (WX.gT <= 0) {
    // the next gust: stronger and more often when it is already windy
    WX.gA = (0.3 + Math.random() * 0.7) * (0.12 + WX.wbase * 0.75) * (gustK == null ? 1 : Math.max(0.3, gustK));
    WX.gf = camS - 1300 - Math.random() * 500;
    WX.gT = (4 + Math.random() * 10) / (0.6 + WX.wbase);
  }
  WX.gf += (300 + WX.wbase * 320) * rdt;
  const dc = camS - WX.gf;
  WX.gust = WX.gA * Math.exp(-dc * dc / (2 * 360 * 360));
  if (-dc > 1800) WX.gA = 0;
  // storm outflow: a mature cell's gust front runs out ahead of its rain (it reaches you first: the wind jumps and swings
  // to blow away from the storm, debris flies), and a squall line or a dust wall pushes a wall of wind in front of it
  let gx = 0, gy = 0; const u = wxU();
  for (const c of WX.cells) {
    if (c.k === 'snow') continue; const a = c.age / c.life; if (a < 0.3 || a > 0.78) continue;
    const dx = px - c.x, dy = py - c.y, d = Math.hypot(dx, dy) || 1, rg = c.r * (1.05 + 1.1 * (a - 0.3) / 0.48), band = c.r * 0.45;
    const k = Math.max(0, 1 - Math.abs(d - rg) / band) * c.peak * (c.k === 'storm' ? 0.7 : 0.4);
    if (k > 0) { gx += dx / d * k; gy += dy / d * k; if (k > 0.25 && !c.gst) { c.gst = 1; wxGustBurst(k, Math.atan2(dy, dx)); } }
  }
  const F = WX.front;
  if (F && (F.k === 'cold' || F.k === 'dust')) {
    const b = wxBehind(F, px, py), lead = 45 * u;
    if (b > -lead && b < 25 * u) { const k = (F.k === 'dust' ? 0.9 : 0.7) * wxSmooth(-lead, -lead * 0.3, b) * (1 - wxSmooth(0, 25 * u, b)); gx += Math.cos(F.dir) * k; gy += Math.sin(F.dir) * k; if (k > 0.3 && !F.gst) { F.gst = 1; wxGustBurst(k, F.dir); } }
  }
  const ge = Math.min(1, rdt * 1.6); WX.gfx += (gx - WX.gfx) * ge; WX.gfy += (gy - WX.gfy) * ge; WX.gfk = Math.hypot(WX.gfx, WX.gfy);
  // the wind itself breathes, and swings round slowly (a touch faster in a storm)
  const base = Math.max(0, WX.wbase * (1 + 0.32 * WX.ou) + WX.gust * 0.9), vx = ca * base + WX.gfx, vy = sa * base + WX.gfy;
  WX.wind = Math.hypot(vx, vy); WX.wx = vx; WX.wy = vy;
  WX.wdir += (Math.sin(G.time * 0.031) * 0.012 + Math.sin(G.time * 0.17 + 2) * 0.006 * (1 + WX.storm * 2)) * rdt;
  updWindDebris(rdt);
  updAtmos(rdt);
}
// a gust front arriving: a burst of litter, leaves or sand along it, and its rush in the trees
function wxGustBurst(k, ang) {
  const lv = wxLevel(); if (!lv || G.mode === 'intro') return;
  const bio = WORLD.cur ? WORLD.cur.bio : 'city', sea = WORLD.season, hw = W / ZOOM / 2, hh = H / ZOOM / 2, ca = Math.cos(ang), sa = Math.sin(ang);
  for (let i = 0; i < Math.round(10 * k * lv) && WXD.length < 60; i++) {
    const kind = bio === 'desert' ? 'puff' : bio === 'snow' || (sea === 3 && TEMPERATE[bio]) ? 'snake' : bio === 'suburb' || sea === 2 ? 'leaf' : Math.random() < 0.7 ? 'paper' : 'bag', side = (Math.random() - 0.5) * 2;
    WXD.push({ k: kind, x: cam.x - ca * hw * 0.9 - sa * side * hh, y: cam.y - sa * hh * 0.9 + ca * side * hw, vx: ca * 200 * k, vy: sa * 200 * k, a: Math.random() * TAU, va: 0, t: 0, s: 0.8 + Math.random() * 0.6, ph: Math.random() * 10, c: Math.floor(Math.random() * 4) });
  }
  SFX.ambEvent(bio === 'desert' ? 'sandgust' : bio === 'snow' ? 'snowgust' : 'leaves', ca * 0.6, 0.45 + k * 0.5, 0.15, true);
}
// how strongly the wind moves something standing at (x, y) right now (0 calm, about 1 a strong wind, more in a gust):
// the steady wind ripples through in waves, and a gust is a brighter band moving along with it
function windAt(x, y) {
  const s = x * Math.cos(WX.wdir) + y * Math.sin(WX.wdir), ripple = 0.5 + 0.5 * Math.sin(G.time * 1.8 - s * 0.0105);
  let k = WX.wbase * (0.5 + 0.5 * ripple) * (1 + 0.25 * WX.ou) + WX.gfk * 0.8;
  if (WX.gA > 0.01) { const d = s - WX.gf; if (d > -1100 && d < 1100) k += WX.gA * Math.exp(-d * d / (2 * 360 * 360)) * 1.3; }
  return Math.max(0, k);
}
function windWord(w) { return w < 0.1 ? 'Calm' : w < 0.32 ? 'Breeze' : w < 0.58 ? 'Windy' : w < 0.85 ? 'Strong wind' : 'Gale'; }

// things the wind pushes along the ground near you: paper and plastic bags in town, leaves in the suburbs and in fall,
// tumbleweeds and sand puffs in the desert, snow snakes up north, swirls of ash. Purely for looks, and local.
const WXD = [];
function updWindDebris(rdt) {
  const lv = wxLevel(); if (!lv || G.mode === 'intro') { WXD.length = 0; return; }
  const bio = WORLD.cur ? WORLD.cur.bio : 'city', sea = WORLD.season, max = Math.round((SET.life === false ? 0 : 26) * Math.min(1, lv + 0.2));
  const ca = Math.cos(WX.wdir), sa = Math.sin(WX.wdir), hw = W / ZOOM / 2 + 80, hh = H / ZOOM / 2 + 80;
  // new pieces come in from the upwind edge of the view, more of them the harder it blows
  if (WXD.length < max && Math.random() < rdt * (0.4 + WX.wind * 6)) {
    const kind = bio === 'desert' ? (Math.random() < 0.12 ? 'weed' : 'puff') : bio === 'snow' || (sea === 3 && TEMPERATE[bio]) ? 'snake' : bio === 'ash' ? 'ashw' : bio === 'suburb' || sea === 2 ? (Math.random() < 0.8 ? 'leaf' : 'paper') : bio === 'burning' ? (Math.random() < 0.5 ? 'ashw' : 'paper') : (Math.random() < 0.75 ? 'paper' : 'bag');
    const side = (Math.random() - 0.5) * 2;
    const x = cam.x - ca * hw * 1.05 - sa * side * hh, y = cam.y - sa * hh * 1.05 + ca * side * hw;
    WXD.push({ k: kind, x: x, y: y, vx: 0, vy: 0, a: Math.random() * TAU, va: 0, t: 0, s: 0.7 + Math.random() * 0.6, ph: Math.random() * 10, c: Math.floor(Math.random() * 4) });
  }
  // on a calm hot day out in the desert, now and then a dust devil wanders across
  if (bio === 'desert' && WX.sand < 0.4 && WX.rain < 0.1 && WX.wbase < 0.45 && Math.random() < rdt * 0.03 && !WXD.some(d => d.k === 'devil')) {
    const a = Math.random() * TAU; WXD.push({ k: 'devil', x: cam.x + Math.cos(a) * hw * 0.7, y: cam.y + Math.sin(a) * hh * 0.7, vx: 0, vy: 0, a: 0, va: 0, t: 0, s: 0.8 + Math.random() * 0.5, ph: 0, c: 0, life: 9 + Math.random() * 6 });
  }
  for (let i = WXD.length - 1; i >= 0; i--) {
    const d = WXD[i];
    if (d.k === 'devil') { d.t += rdt; d.ph += rdt; d.x += (ca * 30 + Math.sin(d.t * 0.7) * 22) * rdt; d.y += (sa * 30 + Math.cos(d.t * 0.5) * 22) * rdt; if (d.t > d.life) WXD.splice(i, 1); continue; }
    const w = windAt(d.x, d.y), sp = (d.k === 'weed' ? 150 : d.k === 'snake' || d.k === 'puff' ? 230 : 120) * w * d.s;
    d.t += rdt; d.ph += rdt * (2 + w * 4);
    // carried along in skips and tumbles, with a little wobble across the wind
    const hop = d.k === 'paper' || d.k === 'leaf' || d.k === 'bag' ? 0.55 + 0.45 * Math.max(0, Math.sin(d.ph * 1.7)) : 1;
    d.vx += (ca * sp * hop - d.vx) * Math.min(1, rdt * 3) + (-sa) * Math.sin(d.ph * 0.9) * 18 * rdt;
    d.vy += (sa * sp * hop - d.vy) * Math.min(1, rdt * 3) + ca * Math.sin(d.ph * 0.9) * 18 * rdt;
    d.x += d.vx * rdt; d.y += d.vy * rdt; d.a += (d.k === 'weed' ? sp / 14 : sp / 40 * Math.sin(d.ph)) * rdt;
    if (blocked(d.x, d.y, 4)) { d.vx *= -0.3; d.vy *= -0.3; d.x += d.vx * rdt * 2; d.y += d.vy * rdt * 2; }
    if (Math.abs(d.x - cam.x) > hw * 1.3 || Math.abs(d.y - cam.y) > hh * 1.3 || d.t > 30) WXD.splice(i, 1);
  }
}
function drawWindDebris(vis) {
  if (!WXD.length) return;
  for (const d of WXD) {
    if (!vis(d.x, d.y, 20)) continue;
    const sh = SET.life === false ? 0 : 1; if (!sh) continue;
    switch (d.k) {
      case 'paper': ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a); ctx.scale(1, 0.4 + 0.6 * Math.abs(Math.sin(d.ph))); ctx.fillStyle = ['#d9d4c6', '#e8e2d4', '#c9c0a8', '#b8c4cc'][d.c]; ctx.fillRect(-4, -3, 8, 6); ctx.restore(); break;
      case 'bag': ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a); ctx.globalAlpha = 0.8; ctx.fillStyle = ['#e8e8e8', '#d8d0c0', '#c03a2e', '#3a3a3a'][d.c]; ctx.beginPath(); ctx.ellipse(0, 0, 6, 4 + 2 * Math.sin(d.ph * 3), 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.restore(); break;
      case 'leaf': ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a); ctx.fillStyle = WORLD.season === 2 ? ['#c9762a', '#a8442a', '#e0a83a', '#8a5a2a'][d.c] : ['#4f7a34', '#6a8a3a', '#8a7a34', '#3a5a2a'][d.c]; ctx.beginPath(); ctx.ellipse(0, 0, 3.6, 1.2 + 1.6 * Math.abs(Math.sin(d.ph * 2)), 0, 0, TAU); ctx.fill(); ctx.restore(); break;
      case 'weed': {
        ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a); ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 1.2; const r = 11 * d.s;
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(4, 6, r, r * 0.6, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a + 0.8) * r * 0.6, Math.sin(a + 0.8) * r * 0.6, Math.cos(a) * r, Math.sin(a) * r); } ctx.arc(0, 0, r * 0.85, 0, TAU); ctx.stroke(); ctx.restore(); break;
      }
      case 'puff': { const r = 14 + d.t * 10, a = Math.max(0, 0.22 - d.t * 0.07); if (a <= 0) break; ctx.globalAlpha = a; ctx.drawImage(glowSprite('#c79a5a'), d.x - r, d.y - r * 0.6, r * 2, r * 1.2); ctx.globalAlpha = 1; break; }
      case 'snake': { const l = 26 * d.s, ca = Math.cos(WX.wdir), sa = Math.sin(WX.wdir), a = Math.min(1, d.t * 2) * 0.5; ctx.strokeStyle = 'rgba(245,250,255,' + a.toFixed(2) + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(d.x - ca * l, d.y - sa * l); ctx.quadraticCurveTo(d.x - sa * 4 * Math.sin(d.ph * 3), d.y + ca * 4 * Math.sin(d.ph * 3), d.x, d.y); ctx.stroke(); ctx.lineCap = 'butt'; break; }
      case 'devil': {
        const f = Math.min(1, d.t / 2, (d.life - d.t) / 2); if (f <= 0) break;
        ctx.fillStyle = 'rgba(0,0,0,' + (0.12 * f).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(d.x + 6, d.y + 8, 22 * d.s, 10 * d.s, 0, 0, TAU); ctx.fill();
        for (let k = 0; k < 16; k++) { const a = d.ph * (7 - k * 0.25) + k * 0.8, r = (3 + k * 1.7) * d.s, h = k * 2.6 * d.s, pr = (6 + k * 0.9) * d.s; ctx.globalAlpha = f * (0.38 - k * 0.016); ctx.drawImage(glowSprite('#efdcb4'), d.x + Math.cos(a) * r - pr, d.y + Math.sin(a) * r * 0.5 - h - pr * 0.7, pr * 2, pr * 1.4); }
        // a thin spiral of grit so it reads as turning
        ctx.globalAlpha = f * 0.45; ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 1; ctx.beginPath();
        for (let k = 0; k < 24; k++) { const a = d.ph * 6 + k * 0.55, r = (2 + k * 1.1) * d.s, px = d.x + Math.cos(a) * r, py = d.y + Math.sin(a) * r * 0.5 - k * 1.7 * d.s; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke(); ctx.globalAlpha = 1; break;
      }
      case 'ashw': { ctx.fillStyle = 'rgba(150,150,154,0.5)'; for (let k = 0; k < 4; k++) { const a = d.ph * 2 + k * 1.6, r = 4 + k * 2; ctx.fillRect(d.x + Math.cos(a) * r, d.y + Math.sin(a) * r * 0.6, 2, 2); } break; }
    }
  }
}
// fast faint streaks across the screen when the wind is strong
function drawWindStreaks(rdt, mx, my) {
  if (WX.wind < 0.45 || wxLevel() < 0.4) return;
  const P = pool('streak', 18), k = Math.min(1, (WX.wind - 0.45) * 1.6), n = Math.floor(P.max * k), ca = Math.cos(WX.wdir), sa = Math.sin(WX.wdir), sc = Math.min(W, H) / 480, sp = (600 + WX.wind * 700) * sc;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    P.x[i] += ca * sp * P.z[i] * rdt - mx; P.y[i] += sa * sp * P.z[i] * rdt - my; P.r[i] += rdt;
    if (P.x[i] < -200 || P.x[i] > W + 200 || P.y[i] < -200 || P.y[i] > H + 200 || P.r[i] > 2.2) { P.r[i] = 0; P.x[i] = ca > 0 ? -150 - Math.random() * 100 : W + 150 + Math.random() * 100; P.y[i] = Math.random() * H; if (Math.abs(sa) > 0.7) { P.x[i] = Math.random() * W; P.y[i] = sa > 0 ? -150 : H + 150; } }
    const l = (36 + 60 * P.z[i]) * sc, a = 0.12 * k * Math.sin(Math.min(1, P.r[i] / 2.2) * Math.PI);
    ctx.strokeStyle = 'rgba(230,236,242,' + a.toFixed(3) + ')'; ctx.lineWidth = 1 + P.z[i];
    ctx.beginPath(); ctx.moveTo(P.x[i], P.y[i]); ctx.quadraticCurveTo(P.x[i] - ca * l * 0.5 - sa * 3, P.y[i] - sa * l * 0.5 + ca * 3, P.x[i] - ca * l, P.y[i] - sa * l); ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
/* ---------- lightning ----------
   Flashes come from the storm cells (each flashes fastest a little before its rain peaks) and from a squall line as it
   passes. A flash is three or four return strokes 40 to 60 ms apart, each a spike that dies away in about 80 ms. Near
   ones strike the street; others light the sky inside the cloud (a broad glow from the cell's side, no bolt) or show
   as a thin bolt far off. Thunder follows at the speed of sound: about 3 seconds a kilometre. */
function wxLightningTick(dt, rdt, canStrike, px, py) {
  if (wxLevel() <= 0 && !canStrike) return;
  const view = Math.hypot(W, H) / Math.max(0.2, ZOOM) / 2;
  for (const c of WX.cells) {
    if (c.k !== 'storm') continue;
    const fr = wxCellFlash(c.age / c.life) * c.peak * 0.3; if (fr <= 0) continue;   // flashes a second at a mature core
    const d = Math.hypot(c.x - px, c.y - py), far = clamp(1 - (d - c.r) / (view * 5), 0, 1); if (far <= 0) continue;
    if (Math.random() < fr * far * dt) wxFlash(c.x, c.y, d, canStrike && d < c.r * 1.4 + view * 0.5, view);
  }
  const F = WX.front;
  if (F && F.k === 'cold') { const b = wxBehind(F, px, py), near = Math.exp(-Math.abs(b) / (35 * wxU())); if (Math.random() < 0.22 * near * dt) { const lx = px - Math.cos(F.dir) * b, ly = py - Math.sin(F.dir) * b; wxFlash(lx, ly, Math.abs(b), canStrike && Math.abs(b) < view, view); } }
  // (the fixed "storms" setting with no cell close by yet still rumbles now and then)
  if (WX.hold >= 0 && WX.kind === 'storm' && WX.storm < 0.2) { WX.next -= dt; if (WX.next <= 0) { WX.next = 6 + Math.random() * 8; wxFlash(px + rand(-1, 1) * view * 3, py + rand(-1, 1) * view * 3, view * 2.5, false, view); } }
}
function wxFlash(x, y, d, near, view) {
  WX.lastFlashT = G.time;
  const rf = SET.flash, dm = d / Math.max(1, wxU()), delay = clamp(dm / 343, 0.05, 9);
  // the strokes
  const n = rf ? 1 : 3 + (Math.random() < 0.4 ? 1 : 0); let t = 0;
  for (let i = 0; i < n; i++) { WX.pulses.push({ t: t, a: (rf ? 0.28 : 1) * (i === 0 ? 1 : 0.55 + Math.random() * 0.35) * (near ? 1 : clamp(1.4 - d / (view * 4), 0.25, 0.8)) }); t += 0.04 + Math.random() * 0.02; }
  if (near && Math.random() < 0.65) { lightning(true); return; }
  // in the cloud: the sky lights up from the cell's side, every building throws a shadow for an instant
  const ang = Math.atan2(y - cam.y, x - cam.x), r = Math.min(d, view * 0.9);
  luxFlash(cam.x + Math.cos(ang) * r, cam.y + Math.sin(ang) * r, view * 2.6, '190,210,255', rf ? 0.3 : near ? 1.1 : 0.7, 0.3, { shade: true });
  if (d < view * 3 && Math.random() < 0.45) WX.bolts.push(skyBolt(ang));
  if (SFX.thunderAt && typeof nbPan === 'function') SFX.thunderAt(dm, nbPan(x, y)); else SFX.thunder(delay, d < view * 1.2);   // (1.9.9991: from where it flashed)
}
function wxFlashTick(rdt) {
  let f = 0;
  for (let i = WX.pulses.length - 1; i >= 0; i--) {
    const p = WX.pulses[i]; p.t -= rdt;
    if (p.t <= 0) { const age = -p.t; f = Math.max(f, p.a * Math.exp(-age / 0.08)); if (age > 0.5) WX.pulses.splice(i, 1); }
  }
  WX.flash = Math.max(f, WX.flash - rdt * 3.2);
}
function lightning(canStrike) {
  const rf = SET.flash;   // reduce flashing
  if (!WX.pulses.length) { WX.pulses.push({ t: 0, a: rf ? 0.28 : 1 }); if (!rf) { WX.pulses.push({ t: 0.05, a: 0.6 }); WX.pulses.push({ t: 0.1, a: 0.45 }); } }
  // the sky lights up from one side: every building throws a long shadow for an instant
  { const a = rand(TAU), d = W / ZOOM * 0.75; luxFlash(cam.x + Math.cos(a) * d, cam.y + Math.sin(a) * d, d * 2.4, '190,210,255', rf ? 0.35 : 1.1, 0.32, { shade: true }); }
  const strikeIt = canStrike && Math.random() < 0.6;
  if (!strikeIt) { SFX.thunder(0.4 + Math.random() * 1.2, false); WX.bolts.push(skyBolt()); return; }
  // pick a spot: usually a zombie on screen, never right on top of the player
  const p = G.p, hw = W / ZOOM / 2, hh = H / ZOOM / 2;
  let tx = 0, ty = 0, ok = false;
  const vis = G.zs.filter(z => !z.dead && !z.fly && Math.abs(z.x - cam.x) < hw && Math.abs(z.y - cam.y) < hh && Math.hypot(z.x - p.x, z.y - p.y) > 110);
  if (vis.length && Math.random() < 0.75) { const z = pick(vis); tx = z.x; ty = z.y; ok = true; }
  for (let i = 0; i < 8 && !ok; i++) { tx = cam.x + rand(-hw, hw) * 0.9; ty = cam.y + rand(-hh, hh) * 0.9; if (Math.hypot(tx - p.x, ty - p.y) > 140) ok = true; }
  if (!ok) return;
  WX.strikes.push({ x: tx, y: ty, t: 0.75, max: 0.75 });
  SFX.static();
}
/* ---------- hail on the ground ----------
   Stones land, bounce two or three times (a third of their speed back each time), roll a little, lie there and melt. */
function wxHailTick(rdt, lv) {
  const L = WX.hailG, u = wxU();
  if (WX.hail > 0.05 && lv > 0) {
    const hw = W / ZOOM / 2, hh = H / ZOOM / 2, n = WX.hail * lv * 70 * rdt, cap = Math.round(150 * lv);
    let k = Math.floor(n) + (Math.random() < n - Math.floor(n) ? 1 : 0);
    while (k-- > 0 && L.length < cap) {
      const x = cam.x + rand(-hw, hw) * 1.05, y = cam.y + rand(-hh, hh) * 1.05;
      if (WX.grid && wxGridAt(WX.grid.H, x, y) < Math.random() * 0.8) continue;
      L.push({ x: x, y: y, z: 0, vz: 2 + Math.random() * 1.8, vx: (Math.random() - 0.5) * 1.6 + WX.wx * 2, vy: (Math.random() - 0.5) * 1.6 + WX.wy * 2, b: 0, rest: 0, s: 0.7 + Math.random() * 0.7, w: isWater(waterAt(x, y)) ? 1 : 0 });
    }
  }
  for (let i = L.length - 1; i >= 0; i--) {
    const h = L[i];
    if (h.w) { h.rest += rdt * 3; if (h.rest > 1) L.splice(i, 1); continue; }   // (a stone into water is just a ring)
    if (h.b < 3) {
      h.vz -= 9.8 * rdt; h.z += h.vz * rdt; h.x += h.vx * u * rdt; h.y += h.vy * u * rdt;
      if (h.z <= 0) { h.z = 0; h.b++; h.vz = -h.vz * 0.36; h.vx *= 0.55; h.vy *= 0.55; if (Math.abs(h.vz) < 0.35) { h.b = 3; h.vz = 0; } }
    } else { h.rest += rdt; h.x += h.vx * u * rdt * 0.3; h.y += h.vy * u * rdt * 0.3; h.vx *= 0.9; h.vy *= 0.9; }
    if (h.rest > 3 + h.s * 2 || Math.abs(h.x - cam.x) > W / ZOOM || Math.abs(h.y - cam.y) > H / ZOOM) L.splice(i, 1);
  }
}
function strike(s) {
  const x = s.x, y = s.y, R = 78, p = G.p;
  WX.flash = SET.flash ? 0.3 : 1; WX.bolts.push(groundBolt(x, y)); luxFlash(x, y, 520, '200,220,255', 1.4, 0.35, { shade: true });
  SFX.thunder(0.05, true); shakeIt(12); buzz(60);
  burst(x, y, 22, '#dff0ff', 320, 3, 0.4); burst(x, y, 10, '#ffffff', 200, 2, 0.25);
  ring(x, y, 6, R, 0.35, '210,230,255', 5); ring(x, y, 4, R * 1.8, 0.6, '160,200,255', 2);
  splat(x, y, 26, 'rgba(10,10,14,0.65)');
  near(x, y, R + 20, z => { if (z.dead) return; const d = Math.hypot(z.x - x, z.y - y); if (d < R + z.r) { hurtZombie(z, (85 + G.wave * 12) * (z.boss ? 0.4 : 1), { src: 'blast' }); if (!z.dead && !z.boss) { z.stun = Math.max(z.stun, 0.6); z.burnT = 2; z.burnDps = Math.max(z.burnDps || 0, 6 + G.wave); } } });
  if (p && G.mode === 'play' && Math.hypot(p.x - x, p.y - y) < 62) hurtPlayer(14);
  // water carries the shock
  if (isWater(waterAt(x, y))) {
    ring(x, y, 10, 240, 0.5, '140,200,255', 3);
    near(x, y, 250, z => { if (!z.dead && z.inW && Math.hypot(z.x - x, z.y - y) < 250) { hurtZombie(z, (50 + G.wave * 6) * (z.boss ? 0.4 : 1), { src: 'blast' }); if (!z.dead) z.stun = Math.max(z.stun, 0.8); bolt(x, y, z.x, z.y, '#bfe0ff'); } });
    if (p && G.mode === 'play' && isWater(waterAt(p.x, p.y)) && Math.hypot(p.x - x, p.y - y) < 250) { hurtPlayer(10); bolt(x, y, p.x, p.y, '#bfe0ff'); }
  }
  worldBlast(x, y, R * 1.4, null);
}
function jag(x0, y0, x1, y1, n, amp) {
  const pts = [x0, y0];
  for (let i = 1; i < n; i++) { const t = i / n; pts.push(x0 + (x1 - x0) * t + rand(-amp, amp), y0 + (y1 - y0) * t + rand(-amp, amp) * 0.4); }
  pts.push(x1, y1); return pts;
}
function groundBolt(x, y) {
  const top = cam.y - H / ZOOM / 2 - 60, main = jag(x + rand(-80, 80), top, x, y, 12, 26), br = [];
  for (let i = 0; i < 3; i++) { const k = 2 + Math.floor(Math.random() * 7) * 2, bx = main[k], by = main[k + 1]; br.push(jag(bx, by, bx + rand(-90, 90), by + rand(30, 120), 5, 14)); }
  return { main: main, br: br, life: 0.32, max: 0.32, gx: x, gy: y };
}
function skyBolt(ang) {
  // a flash far off: a thin bolt in the distance at the edge of the screen (on the storm's side when it is known)
  const hw = W / ZOOM / 2, hh = H / ZOOM / 2;
  const x = ang == null ? cam.x + rand(-hw, hw) : cam.x + Math.cos(ang) * hw * 0.85, top = ang == null ? cam.y - hh - 20 : cam.y + Math.sin(ang) * hh * 0.85 - 90;
  return { main: jag(x, top, x + rand(-60, 60), top + rand(80, 180), 8, 18), br: [], life: 0.2, max: 0.2, far: true };
}

/* ---------- drawing ---------- */
// on the ground, before anything stands on it: wet streets, a dusting of snow, warning circles for strikes
let SNOWPAT = null, FOGTEX = null;
function snowPattern() {
  if (SNOWPAT) return SNOWPAT;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  for (let i = 0; i < 220; i++) { g.fillStyle = 'rgba(235,242,248,' + (0.2 + Math.random() * 0.5) + ')'; g.beginPath(); g.ellipse(Math.random() * 256, Math.random() * 256, 4 + Math.random() * 18, 3 + Math.random() * 10, Math.random() * 3, 0, TAU); g.fill(); }
  SNOWPAT = ctx.createPattern(c, 'repeat'); return SNOWPAT;
}
/* ---------- the precipitation field across the view ----------
   Each frame the field is sampled on a coarse grid that spans the view and a margin round it: rain and snow (split by
   the temperature at each node, so a district border on screen shows the rain turning to snow across it), dust, hail.
   Particles take their density from it (the edge of a shower is visible and moves), the rain sheet and the shower's
   shadow on the street are masked by it. */
const WXG = { GX: 9, GY: 6, m: 0.15 };
function wxGridUpdate() {
  const GX = WXG.GX, GY = WXG.GY, N = GX * GY, hw = W / ZOOM / 2, hh = H / ZOOM / 2, m = WXG.m;
  let G0 = WX.grid; if (!G0) G0 = WX.grid = { R: new Float32Array(N), S: new Float32Array(N), D: new Float32Array(N), H: new Float32Array(N), mix: {}, can: null, f: -1 };
  if (G0.f === frameNo) return G0; G0.f = frameNo;
  G0.wx0 = cam.x - hw * (1 + 2 * m); G0.wy0 = cam.y - hh * (1 + 2 * m); G0.ww = hw * 2 * (1 + 2 * m); G0.wh = hh * 2 * (1 + 2 * m);
  G0.sx0 = -W * m; G0.sy0 = -H * m; G0.sw = W * (1 + 2 * m); G0.sh = H * (1 + 2 * m);
  const sea = WORLD.season, fzK = WX.kind === 'warm';
  let rMax = 0, sMax = 0, dMax = 0, rSum = 0;
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
    const q = j * GX + i, x = G0.wx0 + G0.ww * i / (GX - 1), y = G0.wy0 + G0.wh * j / (GY - 1);
    const mix = bioMix(x, y, G0.mix), t = wxTempMix(mix), sf = wxSnowF(t), fz = fzK && t < 0 && t > -4, v = sea === 3 ? 1 : 1 - 0.7 * (mix.desert || 0);
    const R = wxR(x, y) * v;
    G0.R[q] = R * (fz ? 1 : 1 - sf); G0.S[q] = fz ? 0 : R * sf; G0.D[q] = Math.max(wxDustAt(x, y), WX.T ? WX.T.sand || 0 : 0); G0.H[q] = sea === 3 ? 0 : wxHailAt(x, y);
    if (G0.R[q] > rMax) rMax = G0.R[q]; if (G0.S[q] > sMax) sMax = G0.S[q]; if (G0.D[q] > dMax) dMax = G0.D[q]; rSum += G0.R[q];
  }
  // (the snow that always drifts up north, and the rain under the player, never vanish from the grid)
  G0.rMax = Math.max(rMax, WX.rain); G0.sMax = Math.max(sMax, WX.snow); G0.dMax = Math.max(dMax, WX.sand); G0.rAvg = rSum / N;
  if (WX.snow > sMax) for (let q = 0; q < N; q++) G0.S[q] = Math.max(G0.S[q], WX.snow * 0.9);
  return G0;
}
// the grid's value at a world point / at a screen point
function wxGridAt(A, x, y) {
  const G0 = WX.grid; if (!G0) return 0;
  const u = clamp((x - G0.wx0) / G0.ww, 0, 1) * (WXG.GX - 1), v = clamp((y - G0.wy0) / G0.wh, 0, 1) * (WXG.GY - 1);
  const i = Math.min(WXG.GX - 2, u | 0), j = Math.min(WXG.GY - 2, v | 0), fx = u - i, fy = v - j, q = j * WXG.GX + i;
  return (A[q] * (1 - fx) + A[q + 1] * fx) * (1 - fy) + (A[q + WXG.GX] * (1 - fx) + A[q + WXG.GX + 1] * fx) * fy;
}
function wxGridScr(A, sx, sy) {
  const G0 = WX.grid; if (!G0) return 0;
  const u = clamp((sx - G0.sx0) / G0.sw, 0, 1) * (WXG.GX - 1), v = clamp((sy - G0.sy0) / G0.sh, 0, 1) * (WXG.GY - 1);
  const i = Math.min(WXG.GX - 2, u | 0), j = Math.min(WXG.GY - 2, v | 0), fx = u - i, fy = v - j, q = j * WXG.GX + i;
  return (A[q] * (1 - fx) + A[q + 1] * fx) * (1 - fy) + (A[q + WXG.GX] * (1 - fx) + A[q + WXG.GX + 1] * fx) * fy;
}
// a field as a tiny picture (alpha = the value), to be stretched smoothly over the view as a mask
function wxGridMask(A, k, key) {
  const G0 = WX.grid; let c = G0['m' + key];
  if (!c) { c = G0['m' + key] = document.createElement('canvas'); c.width = WXG.GX; c.height = WXG.GY; c.g = c.getContext('2d'); c.im = c.g.createImageData(WXG.GX, WXG.GY); }
  const d = c.im.data; for (let q = 0; q < A.length; q++) { const o = q * 4; d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = clamp(A[q] * k, 0, 1) * 255; }
  c.g.putImageData(c.im, 0, 0); return c;
}
/* ---------- textures ---------- */
const WXT = {};
// the rain sheet: faint streaks of several lengths, falling straight down the tile (turned to the rain's angle when drawn)
function wxSheetTex() {
  if (WXT.sheet) return WXT.sheet;
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), R = Z.mulberry32(0x7a1d);
  g.lineCap = 'round';
  for (let i = 0; i < 190; i++) {
    const x = R() * n, y = R() * n, l = 14 + R() * 38, a = 0.05 + R() * 0.16;
    g.strokeStyle = 'rgba(210,222,240,' + a.toFixed(3) + ')'; g.lineWidth = R() < 0.2 ? 1.6 : 1;
    for (const oy of [0, -n, n]) { g.beginPath(); g.moveTo(x, y + oy); g.lineTo(x, y + oy + l); g.stroke(); }
  }
  return WXT.sheet = c;
}
// snowflakes for the near layer: six arms with side branches and a soft glow, three kinds
function wxFlakeTex(i) {
  const key = 'fl' + i; if (WXT[key]) return WXT[key];
  const n = 32, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), R = Z.mulberry32(0x5f1a + i * 77);
  const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.45, 'rgba(240,246,255,0.18)'); gr.addColorStop(1, 'rgba(240,246,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 1.3; g.lineCap = 'round'; g.translate(n / 2, n / 2);
  const L = 9 + i * 1.5, br = 0.35 + R() * 0.25;
  for (let k = 0; k < 6; k++) {
    g.save(); g.rotate(k * Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -L);
    for (const t of [0.45, 0.72]) { const s = L * (i === 2 ? 0.3 : br) * (1 - t * 0.5); g.moveTo(0, -L * t); g.lineTo(-s, -L * t - s); g.moveTo(0, -L * t); g.lineTo(s, -L * t - s); }
    g.stroke(); g.restore();
  }
  return WXT[key] = c;
}
// fog banks: where the bank is thin the fog is cleared (used to cut gaps out of the fog layers)
function wxBankTex() {
  if (WXT.bank) return WXT.bank;
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), im = g.createImageData(n, n), d = im.data;
  const a = texelNoise(n, 96, 211), b = texelNoise(n, 32, 223);
  for (let i = 0; i < n * n; i++) { const v = a[i] * 0.72 + b[i] * 0.28, k = i * 4; d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = wxSmooth(0.46, 0.72, v) * 255; }
  g.putImageData(im, 0, 0); return WXT.bank = c;
}
// cloud shadows: soft cumulus shapes (dark, their own alpha) on a tile laid in world space
function wxCloudTex() {
  if (WXT.cloud) return WXT.cloud;
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), im = g.createImageData(n, n), d = im.data;
  const a = texelNoise(n, 80, 307), b = texelNoise(n, 26, 311), e = texelNoise(n, 9, 313);
  for (let i = 0; i < n * n; i++) { const v = a[i] * 0.62 + b[i] * 0.28 + e[i] * 0.1, k = i * 4; d[k] = 6; d[k + 1] = 9; d[k + 2] = 16; d[k + 3] = wxSmooth(0.5, 0.66, v) * 255; }
  g.putImageData(im, 0, 0); return WXT.cloud = c;
}
/* ---------- drawing on the ground ---------- */
// on the ground, before anything stands on it: wet streets, the shadow under a shower, settled snow, splashes, hail,
// warning circles for strikes
function drawWeatherGround(x0, y0, x1, y1) {
  const lv = wxLevel(); if (!lv || (WX.dbg & 1)) return;
  const G0 = wxGridUpdate(), now = performance.now(), dt = Math.min(0.05, (now - (WX.gt || now)) / 1000); WX.gt = now;
  if (WX.wet > 0.02) { ctx.fillStyle = 'rgba(16,26,40,' + (WX.wet * 0.22).toFixed(3) + ')'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); }
  if (WX.ice > 0.05) { ctx.fillStyle = 'rgba(205,225,240,' + (WX.ice * 0.1).toFixed(3) + ')'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); }
  // the shadow of the shower: the street darker under the heaviest rain, its edge moving with the cell
  if (G0.rMax + G0.sMax > 0.08 && lv > 0.3) {
    const M = wxGridMask(G0.R, 0.16, 'r'); ctx.save(); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over'; const T = WXT.shade || (WXT.shade = document.createElement('canvas'));
    if (T.width !== WXG.GX) { T.width = WXG.GX; T.height = WXG.GY; T.g = T.getContext('2d'); }
    T.g.clearRect(0, 0, T.width, T.height); T.g.globalCompositeOperation = 'source-over'; T.g.drawImage(M, 0, 0); T.g.globalCompositeOperation = 'source-in'; T.g.fillStyle = '#080c16'; T.g.fillRect(0, 0, T.width, T.height);
    const cw = G0.ww / (WXG.GX - 1), ch = G0.wh / (WXG.GY - 1); ctx.drawImage(T, G0.wx0 - cw / 2, G0.wy0 - ch / 2, G0.ww + cw, G0.wh + ch); ctx.restore();
  }
  // settled snow, laid in world space like the snow the frozen north bakes on its roads
  if (WX.cover > 0.02 && lv > 0.4) {
    // (an even thin layer first, then the drifts on top at a finer size, so it settles evenly instead of in blotches)
    const pat = typeof texelGroundPat === 'function' ? texelGroundPat(ctx, 'snowcover', SCL * 0.22) : null;
    ctx.fillStyle = 'rgba(226,233,241,' + (WX.cover * 0.62).toFixed(3) + ')'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    if (pat) { ctx.globalAlpha = WX.cover * 0.3; ctx.fillStyle = pat; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.globalAlpha = 1; }
  }
  // splashes: a crown and a few droplets where drops land (a tiny share of the real impacts, held for a few frames, more
  // where the rain is heavier); rings on water
  const S = WX.splash, u = wxU(), cap = Math.round(170 * lv);
  if (G0.rMax > 0.03) {
    const hw = W / ZOOM / 2, hh = H / ZOOM / 2; let n = 320 * G0.rAvg * lv * dt * (0.6 + WX.drop);
    while ((n >= 1 || Math.random() < n) && S.length < cap) {
      n -= 1; const x = cam.x + rand(-hw, hw), y = cam.y + rand(-hh, hh), r = wxGridAt(G0.R, x, y);
      if (r < Math.random() * G0.rMax) continue;
      S.push({ x: x, y: y, t: 0, life: 0.09 + Math.random() * 0.08, s: (0.6 + WX.drop * 0.8) * (0.7 + Math.random() * 0.6), w: isWater(waterAt(x, y)) ? 1 : 0, a: Math.random() * TAU });
    }
  }
  if (S.length) {
    ctx.lineWidth = Math.max(0.6, u * 0.02); ctx.strokeStyle = 'rgba(205,220,238,0.42)'; ctx.fillStyle = 'rgba(215,228,242,0.5)';
    ctx.beginPath();
    for (let i = S.length - 1; i >= 0; i--) {
      const s = S[i]; s.t += dt; const f = s.t / (s.w ? s.life * 4 : s.life); if (f >= 1) { S.splice(i, 1); continue; }
      const r = (s.w ? 0.05 + f * 0.22 : 0.03 + f * 0.09) * u * s.s; ctx.moveTo(s.x + r, s.y); ctx.ellipse(s.x, s.y, r, r * 0.6, 0, 0, TAU);
    }
    ctx.stroke(); ctx.beginPath();
    for (const s of S) { if (s.w) continue; const f = s.t / s.life, d = (0.04 + f * 0.12) * u * s.s, h = Math.sin(f * Math.PI) * 0.05 * u * s.s; for (let k = 0; k < 3; k++) { const a = s.a + k * 2.1; ctx.rect(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.6 - h, u * 0.018, u * 0.018); } }
    ctx.fill();
  }
  // hailstones on the street
  if (WX.hailG.length) {
    const r0 = u * 0.06; ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath();
    for (const h of WX.hailG) { if (h.w) continue; const r = r0 * h.s; ctx.moveTo(h.x + r + h.z * u * 0.25, h.y + h.z * u * 0.4); ctx.arc(h.x + h.z * u * 0.25, h.y + h.z * u * 0.4, r, 0, TAU); }
    ctx.fill();
    for (const h of WX.hailG) {
      const r = r0 * h.s, melt = h.b >= 3 ? clamp(1 - h.rest / (3 + h.s * 2), 0, 1) : 1;
      if (h.w) { ctx.strokeStyle = 'rgba(210,225,240,' + (0.4 * (1 - h.rest)).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(h.x, h.y, (0.05 + h.rest * 0.2) * u, (0.03 + h.rest * 0.12) * u, 0, 0, TAU); ctx.stroke(); continue; }
      ctx.fillStyle = 'rgba(236,242,250,' + (0.92 * melt).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(h.x, h.y - h.z * u * 0.6, r * (0.6 + 0.4 * melt), 0, TAU); ctx.fill();
    }
  }
  for (const s of WX.strikes) {
    const f = 1 - s.t / s.max, a = 0.25 + f * 0.6;
    ctx.strokeStyle = 'rgba(190,220,255,' + a + ')'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -G.time * 60;
    ctx.beginPath(); ctx.arc(s.x, s.y, 78 * (1.2 - f * 0.2), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(190,220,255,' + (0.06 + f * 0.12) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, 78, 0, TAU); ctx.fill();
    if (Math.random() < 0.4) bolt(s.x + rand(-40, 40), s.y + rand(-40, 40), s.x + rand(-40, 40), s.y + rand(-40, 40), '#cfe4ff');
  }
}
// lightning bolts in the world
function drawWeatherWorld() {
  if (!WX.bolts.length) return;
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const b of WX.bolts) {
    const a = clamp(b.life / b.max, 0, 1), fl = Math.random() < 0.3 ? 0.5 : 1;
    const line = (pts, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
    ctx.globalAlpha = a * fl * (b.far ? 0.5 : 1);
    line(b.main, b.far ? 4 : 10, 'rgba(120,160,255,0.35)'); line(b.main, b.far ? 1.5 : 3.5, '#eef4ff');
    for (const br of b.br) { line(br, 4, 'rgba(120,160,255,0.3)'); line(br, 1.4, '#dfe9ff'); }
    if (b.gx != null) { const r = 90; ctx.drawImage(glowSprite('#bcd6ff'), b.gx - r, b.gy - r, r * 2, r * 2); }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.lineJoin = 'miter';
}
// screen-space particles: rain, snow, sleet, hail, sand, ash, leaves, petals and embers
const WXP = {};
function pool(name, max) {
  let P = WXP[name];
  if (!P) { P = WXP[name] = { x: new Float32Array(max), y: new Float32Array(max), z: new Float32Array(max), r: new Float32Array(max), n: 0, max: max }; for (let i = 0; i < max; i++) { P.x[i] = Math.random() * W; P.y[i] = Math.random() * H; P.z[i] = 0.4 + Math.random() * 0.6; P.r[i] = Math.random() * TAU; } }
  return P;
}
// a particle that left the screen comes back in on the side the motion brings things in from
function wxWrap(P, i, vx, vy, pad, jump) {
  if (!jump && P.x[i] > -pad && P.x[i] < W + pad && P.y[i] > -pad && P.y[i] < H + pad) return;
  const ax = Math.abs(vx), ay = Math.abs(vy);
  if (jump || Math.random() * (ax + ay) < ay) { P.y[i] = vy >= 0 ? -pad * 0.5 - Math.random() * pad : H + pad * 0.5 + Math.random() * pad; P.x[i] = Math.random() * (W + pad * 2) - pad; if (jump) P.y[i] = Math.random() * H; }
  else { P.x[i] = vx >= 0 ? -pad * 0.5 - Math.random() * pad : W + pad * 0.5 + Math.random() * pad; P.y[i] = Math.random() * (H + pad * 2) - pad; }
}
function drawWeatherScreen(rdt) {
  if (WX.dbg & 2) return;
  const lv = wxLevel();
  const lc = WX.lastCam || (WX.lastCam = { x: cam.x, y: cam.y }), mx = (cam.x - lc.x) * ZOOM, my = (cam.y - lc.y) * ZOOM; lc.x = cam.x; lc.y = cam.y;
  const jump = Math.abs(mx) > W || Math.abs(my) > H;
  const dt = Math.min(0.05, rdt);
  // at night rain, snow and fog are only as bright as the light falling on them; lightning lights the rain up
  const lum = (LUX.live ? 0.3 + 0.7 * Math.max(LUX.amb[0], LUX.amb[1], LUX.amb[2]) : 1) * (1 + WX.flash * 0.6);
  if (lv > 0) {
    const G0 = wxGridUpdate(), sc = Math.min(W, H) / 480, pxm = wxU() * ZOOM, wsx = WX.wx * 12 * pxm, wsy = WX.wy * 12 * pxm * 0.5;
    ctx.globalAlpha = Math.min(1, lum);
    // rain: drops fall at their size's speed (2 m/s drizzle to 9 m/s for the big drops of a downpour) and the wind tilts
    // them; the streak is what the eye sees of the motion. Heavier rain: longer, brighter streaks, not many more of them.
    if (G0.rMax > 0.02) {
      const v = 2 + 7 * WX.drop, svx = wsx, svy = wsy + v * 0.9 * pxm, sl = Math.hypot(svx, svy), texp = 1 / 11, kl = Math.min(1, 70 / Math.max(1, sl * texp));
      // the sheet: two layers of a streaked texture, turned to the rain's angle and scrolling down it, masked by the field
      if (lv >= 0.6 && G0.rMax > 0.08) {
        const F = fogScratch(), fg = F.g, fw = F.c.width, fh = F.c.height, fs = fw / W, ang = Math.atan2(svy, svx) - Math.PI / 2, T = wxSheetTex();
        fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalCompositeOperation = 'source-over'; fg.globalAlpha = 1; fg.clearRect(0, 0, fw, fh);
        WX.sheetT = (WX.sheetT || 0) + dt;
        for (let L = 0; L < 2; L++) {
          const pat = fg.createPattern(T, 'repeat'); if (!pat) break;
          const k = L ? 1.7 : 1, s = k * fs * sc * 1.2, off = WX.sheetT * sl * (L ? 1.3 : 0.85) * fs;
          const sy = s * (0.8 + WX.drop * 0.8);
          if (pat.setTransform) pat.setTransform(new DOMMatrix().rotateSelf(ang * 180 / Math.PI).translateSelf(0, off % (256 * sy), 0).scaleSelf(s, sy));
          fg.globalAlpha = (L ? 0.55 : 0.75) * Math.min(1, 0.4 + WX.drop); fg.fillStyle = pat; fg.fillRect(0, 0, fw, fh);
        }
        fg.globalAlpha = 1; fg.globalCompositeOperation = 'destination-in'; fg.imageSmoothingEnabled = true;
        const M = wxGridMask(G0.R, 0.9, 's'); fg.drawImage(M, G0.sx0 * fs - G0.sw * fs / (WXG.GX - 1) / 2, G0.sy0 * fs - G0.sh * fs / (WXG.GY - 1) / 2, G0.sw * fs * WXG.GX / (WXG.GX - 1), G0.sh * fs * WXG.GY / (WXG.GY - 1));
        fg.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.min(1, lum) * lv; ctx.drawImage(F.c, 0, 0, W, H); ctx.globalAlpha = Math.min(1, lum);
      }
      // the near drops: a share of the pool by the heaviest rain on screen, each as bright as the rain where it is
      const P = pool('rain', 700), n = Math.floor(P.max * lv * Math.min(1, Math.pow(G0.rMax, 0.4) * 0.95)), lx = svx * texp * kl, ly = svy * texp * kl;
      for (let i = 0; i < n; i++) { const z = P.z[i]; P.x[i] += svx * z * dt - mx * z; P.y[i] += svy * z * dt - my * z; wxWrap(P, i, svx, svy, 60, jump); }
      const base = 0.14 + 0.34 * WX.drop;
      for (const pass of [0, 1]) for (let b = 0; b < 3; b++) {
        const lo = b === 0 ? 0.05 : b === 1 ? 0.34 : 0.67, hi = b === 0 ? 0.34 : b === 1 ? 0.67 : 9, a = base * (b + 1) / 3 * (pass ? 1 : 0.55);
        ctx.strokeStyle = pass ? 'rgba(205,218,238,' + a.toFixed(3) + ')' : 'rgba(170,190,215,' + a.toFixed(3) + ')'; ctx.lineWidth = pass ? 1 + WX.drop * 0.9 : 1; ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const z = P.z[i]; if ((z > 0.7) !== !!pass) continue;
          const loc = wxGridScr(G0.R, P.x[i], P.y[i]) / G0.rMax; if (loc < lo || loc >= hi) continue;
          ctx.moveTo(P.x[i], P.y[i]); ctx.lineTo(P.x[i] - lx * z, P.y[i] - ly * z);
        }
        ctx.stroke();
      }
    }
    // hail: fast, short, bright
    if (WX.hail > 0.05) {
      const P = pool('hail', 200), n = Math.floor(P.max * WX.hail * lv), svx = wsx * 0.6, svy = wsy + 15 * 0.9 * pxm, lx = svx / 30, ly = svy / 30;
      for (let i = 0; i < n; i++) { const z = P.z[i]; P.x[i] += svx * z * dt - mx * z; P.y[i] += svy * z * dt - my * z; wxWrap(P, i, svx, svy, 40, jump); }
      ctx.strokeStyle = 'rgba(240,246,255,0.8)'; ctx.lineWidth = 2.2 * Math.max(1, sc * 0.8); ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = 0; i < n; i++) { ctx.moveTo(P.x[i], P.y[i]); ctx.lineTo(P.x[i] - lx * P.z[i], P.y[i] - ly * P.z[i]); }
      ctx.stroke(); ctx.lineCap = 'butt';
    }
    // snow: three layers, far flakes small and sharp, near ones big and soft and fast, all swaying as they fall; the
    // wind does most of the steering (flakes fall at under a metre a second)
    if (G0.sMax > 0.02) {
      const vf = 0.9 + WX.drop * 0.6, svx = wsx * 0.95, svy = wsy + vf * 0.9 * pxm + 20 * sc;
      const sMax = G0.sMax, nf = Math.min(1, Math.pow(sMax, 0.5));
      for (const L of [['snowF', 380, 0.55, 1.2], ['snow', 240, 0.85, 2.2]]) {
        const P = pool(L[0], L[1]), n = Math.floor(P.max * lv * nf), sw = 18 * sc * L[2];
        for (let i = 0; i < n; i++) {
          P.r[i] += dt * (0.8 + P.z[i]); const z = P.z[i] * L[2];
          P.x[i] += (svx * z + Math.sin(P.r[i]) * sw) * dt - mx * z; P.y[i] += svy * z * dt - my * z; wxWrap(P, i, svx, svy, 30, jump);
        }
        ctx.fillStyle = L[0] === 'snow' ? 'rgba(248,251,255,0.85)' : 'rgba(225,235,245,0.5)'; ctx.beginPath();
        for (let i = 0; i < n; i++) { const loc = wxGridScr(G0.S, P.x[i], P.y[i]) / sMax; if (loc < (i % 7) * 0.03 + 0.04) continue; const s = (L[3] * P.z[i] + 0.6) * sc * (0.6 + 0.4 * loc); ctx.rect(P.x[i], P.y[i], s, s); }
        ctx.fill();
      }
      if (lv >= 0.5) {
        const P = pool('snowN', 70), n = Math.floor(P.max * lv * nf);
        for (let i = 0; i < n; i++) {
          P.r[i] += dt * 1.3; const z = 1.5 + P.z[i];
          P.x[i] += (svx * z + Math.sin(P.r[i]) * 30 * sc) * dt - mx * z; P.y[i] += svy * z * dt - my * z; wxWrap(P, i, svx * z, svy * z, 40, jump);
          const loc = wxGridScr(G0.S, P.x[i], P.y[i]) / sMax; if (loc < 0.15) continue;
          const s = (9 + P.z[i] * 9) * sc; ctx.globalAlpha = Math.min(1, lum) * (0.3 + 0.25 * P.z[i]) * loc;
          ctx.drawImage(wxFlakeTex(i % 3), P.x[i] - s / 2, P.y[i] - s / 2, s, s);
        }
        ctx.globalAlpha = Math.min(1, lum);
      }
    }
    // dust: the haboob's wall rolling in, then grit streaming past and dust clouds rolling through
    const F = WX.front;
    if (F && F.k === 'dust') {
      const b = wxBehind(F, cam.x, cam.y), hw = W / ZOOM / 2, view = Math.hypot(hw, H / ZOOM / 2);
      if (b < view * 1.2 && b > -view * 2.5) {
        const lx = cam.x + Math.cos(F.dir) * b, ly = cam.y + Math.sin(F.dir) * b, sx = (lx - cam.x) * ZOOM + W / 2, sy = (ly - cam.y) * ZOOM + H / 2, D = Math.hypot(W, H);
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(F.dir);
        const depth = 60 * wxU() * ZOOM, gr = ctx.createLinearGradient(-depth, 0, 0, 0);
        gr.addColorStop(0, 'rgba(120,86,48,0.94)'); gr.addColorStop(0.7, 'rgba(150,108,62,0.8)'); gr.addColorStop(1, 'rgba(170,124,74,0.35)');
        ctx.globalAlpha = Math.min(1, lum) * Math.min(1, lv + 0.3); ctx.fillStyle = gr; ctx.fillRect(-depth, -D, depth, D * 2);
        ctx.fillStyle = 'rgba(120,86,48,0.94)'; ctx.fillRect(-depth - D * 2, -D, D * 2, D * 2);
        // the billowing front edge
        const spr = glowSprite('#b8875a'), t = G.time;
        for (let k = -14; k <= 14; k++) { const y = k * D / 14, r = (90 + 60 * Math.sin(k * 1.7 + t * 0.9)) * sc * 1.6, x = Math.sin(k * 0.8 + t * 0.6) * 30 * sc; ctx.globalAlpha = Math.min(1, lum) * 0.55; ctx.drawImage(spr, x - r * 0.6, y - r, r * 1.6, r * 2); }
        ctx.restore(); ctx.globalAlpha = Math.min(1, lum);
      }
    }
    if (WX.sand > 0.02) {
      const P = pool('sand', 300), n = Math.floor(P.max * WX.sand * lv), sp = 700 * sc * (0.4 + WX.wind), dx = Math.cos(WX.wdir), dy = Math.sin(WX.wdir) * 0.35;
      for (let i = 0; i < n; i++) { P.x[i] += dx * sp * P.z[i] * dt - mx * P.z[i]; P.y[i] += dy * sp * P.z[i] * dt - my * P.z[i]; wxWrap(P, i, dx * sp, dy * sp, 60, jump); }
      ctx.strokeStyle = 'rgba(225,190,130,0.4)'; ctx.lineWidth = 1.3; ctx.beginPath();
      for (let i = 0; i < n; i++) { const l = 18 * P.z[i] * (0.5 + WX.wind); ctx.moveTo(P.x[i], P.y[i]); ctx.lineTo(P.x[i] - dx * l, P.y[i] - dy * l); }
      ctx.stroke();
      const C = pool('dust', 10), nc = Math.floor(10 * WX.sand * Math.min(1, lv + 0.3)), spr = glowSprite('#c79a5a');
      for (let i = 0; i < nc; i++) {
        C.x[i] += dx * sp * 0.5 * C.z[i] * dt - mx * 0.6; C.y[i] += dy * sp * 0.4 * dt - my * 0.6;
        if (C.x[i] > W + 300) { C.x[i] = -300; C.y[i] = Math.random() * H; } else if (C.x[i] < -300) { C.x[i] = W + 300; C.y[i] = Math.random() * H; }
        const r = 180 * C.z[i] * sc + 80; ctx.globalAlpha = 0.2 * WX.sand * Math.min(1, lum); ctx.drawImage(spr, C.x[i] - r, C.y[i] - r, r * 2, r * 2);
      }
      ctx.globalAlpha = Math.min(1, lum);
    }
    // falling ash
    if (WX.ash > 0.02) {
      const P = pool('ash', 260), n = Math.floor(P.max * WX.ash * lv), wx = WX.wx * 90;
      for (let i = 0; i < n; i++) {
        P.r[i] += dt * 1.3;
        P.x[i] += (wx + Math.sin(P.r[i]) * 22) * P.z[i] * dt - mx * P.z[i]; P.y[i] += 40 * sc * P.z[i] * dt - my * P.z[i];
        if (P.y[i] > H + 10 || jump) { P.y[i] = -10; P.x[i] = Math.random() * W; } if (P.y[i] < -60) P.y[i] += H + 70;
        if (P.x[i] < -20) P.x[i] += W + 40; else if (P.x[i] > W + 20) P.x[i] -= W + 40;
      }
      ctx.fillStyle = 'rgba(190,190,196,0.6)'; ctx.beginPath();
      for (let i = 0; i < n; i++) { const s = 2.6 * P.z[i] * sc; ctx.rect(P.x[i], P.y[i], s, s * 0.7); }
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,140,60,0.8)'; ctx.beginPath();
      for (let i = 0; i < n; i += 9) { if (Math.sin(P.r[i] * 3) > 0.3) ctx.rect(P.x[i], P.y[i], 2, 2); }
      ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    }
    // embers drifting up through the burning districts
    if (WX.embers > 0.02) {
      const P = pool('emb', 90), n = Math.floor(P.max * WX.embers * lv);
      for (let i = 0; i < n; i++) {
        P.r[i] += dt * 3;
        P.x[i] += (WX.wx * 120 + Math.sin(P.r[i]) * 30) * dt - mx * P.z[i]; P.y[i] += -60 * P.z[i] * dt - my * P.z[i];
        if (P.y[i] < -10 || jump) { P.y[i] = H + Math.random() * 40; P.x[i] = Math.random() * W; }
        if (P.y[i] > H + 60) P.y[i] -= H + 70;
        if (P.x[i] < -20) P.x[i] += W + 40; else if (P.x[i] > W + 20) P.x[i] -= W + 40;
      }
      ctx.globalCompositeOperation = 'lighter'; ctx.beginPath();
      for (let i = 0; i < n; i++) { const s = (1.4 + P.z[i] * 1.6) * (0.6 + 0.4 * Math.sin(P.r[i] * 2)); ctx.rect(P.x[i], P.y[i], s, s); }
      ctx.fillStyle = 'rgba(255,150,60,0.9)'; ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    }
    // leaves and petals tumbling across
    for (const kind of ['leaves', 'petals']) {
      const v = WX[kind]; if (v < 0.02) continue;
      const P = pool(kind, 60), n = Math.floor(P.max * v * lv), sp = 60 + WX.wind * 260;
      const cols = kind === 'leaves' ? ['#c9762a', '#a8442a', '#e0a83a', '#8a5a2a'] : ['#ffc0dc', '#ffe0ee', '#f7a8cc'];
      for (let i = 0; i < n; i++) {
        P.r[i] += dt * (2 + P.z[i] * 3);
        P.x[i] += (Math.cos(WX.wdir) * sp * P.z[i] + Math.sin(P.r[i]) * 30) * dt - mx * P.z[i]; P.y[i] += (Math.sin(WX.wdir) * sp * 0.4 + 30 + Math.cos(P.r[i] * 0.7) * 20) * P.z[i] * dt - my * P.z[i];
        if (P.x[i] > W + 20) { P.x[i] = -20; P.y[i] = Math.random() * H; } else if (P.x[i] < -20) { P.x[i] = W + 20; P.y[i] = Math.random() * H; }
        if (P.y[i] > H + 20) { P.y[i] = -20; P.x[i] = Math.random() * W; } else if (P.y[i] < -20) P.y[i] = H + 20;
        ctx.fillStyle = cols[i % cols.length];
        const s = (kind === 'leaves' ? 3.6 : 2.6) * (0.6 + P.z[i] * 0.6) * sc;
        ctx.beginPath(); ctx.ellipse(P.x[i], P.y[i], s, s * Math.abs(Math.sin(P.r[i])) * 0.6 + 0.6, P.r[i], 0, TAU); ctx.fill();
      }
    }
    drawWindStreaks(dt, mx, my);
    // heat: the air over the hot street shimmers (thin bright bands that flicker and drift)
    if (WX.heat > 0.05 && lv >= 0.5) {
      WX.heatT = (WX.heatT || 0) - dt; if (WX.heatT <= 0 || !WX.heatL) { WX.heatT = 0.12; WX.heatL = []; for (let i = 0; i < 10; i++) WX.heatL.push([Math.random() * W, Math.random() * H, 60 + Math.random() * 160]); }
      ctx.strokeStyle = 'rgba(255,248,230,' + (0.07 * WX.heat).toFixed(3) + ')'; ctx.lineWidth = 2 * sc; ctx.beginPath();
      for (const l of WX.heatL) { ctx.moveTo(l[0], l[1]); for (let k = 1; k <= 6; k++) ctx.lineTo(l[0] + l[2] * k / 6, l[1] + Math.sin(G.time * 9 + k + l[0]) * 1.6 * sc); }
      ctx.stroke();
    }
    // fog: cloud layers drifting with the wind, broken into banks, lit by the light that falls on it
    const fogOn = SET.fog === 'auto' ? Q.fog : SET.fog === 'on';
    if (WX.fog > 0.03 && fogOn) {
      // 1.9.997: fog conserves energy: it can only be as bright as the light falling on it. The cloud layers are laid into
      // a half-size scratch picture, multiplied by the lighting engine's light map (ambient, sun, every lamp and fire,
      // so the fog over a lamp glows and the fog in the dark is dark), and only then blended over the street.
      // 1.9.998: then cut into banks: a large drifting pattern clears gaps in it (more of them in mist and as radiation
      // fog burns off), anchored to the world so the banks you walk through stay where they are
      const T = fogTex(), ts = 520 * sc, Fs = fogScratch(), fg = Fs.g, fw = Fs.c.width, fh = Fs.c.height, fs = fw / W;
      fg.setTransform(fs, 0, 0, fs, 0, 0); fg.globalCompositeOperation = 'source-over'; fg.globalAlpha = 1; fg.clearRect(0, 0, W, H);
      for (let L = 0; L < (lv > 0.5 ? 2 : 1); L++) {
        const k = L ? 1.35 : 1, ox = ((-(cam.x * ZOOM) * (L ? 0.9 : 1) - G.time * 14 * WX.wx * (L + 1) * 10) % (ts * k) + ts * k) % (ts * k), oy = ((-(cam.y * ZOOM) * (L ? 0.9 : 1) - G.time * 6 * (L + 1)) % (ts * k) + ts * k) % (ts * k);
        fg.globalAlpha = Math.min(0.9, WX.fog * (L ? 0.42 : 0.56) * Math.min(1, lv + 0.3));
        for (let x = ox - ts * k; x < W; x += ts * k) for (let y = oy - ts * k; y < H; y += ts * k) fg.drawImage(T, x, y, ts * k, ts * k);
      }
      const bk = WX.T ? WX.T.bank : 0.4;
      if (bk > 0.05 && lv >= 0.4) {
        const pat = fg.createPattern(wxBankTex(), 'repeat');
        if (pat && pat.setTransform) {
          const tile = 75 * wxU() * ZOOM / 256;   // (one tile of the bank pattern spans about 75 m)
          pat.setTransform(new DOMMatrix().translateSelf(((WX.bx - cam.x) * ZOOM + W / 2), ((WX.by - cam.y) * ZOOM + H / 2), 0).scaleSelf(tile, tile));
          fg.globalCompositeOperation = 'destination-out'; fg.globalAlpha = Math.min(0.95, bk); fg.fillStyle = pat; fg.fillRect(0, 0, W, H);
        }
      }
      // the light on the cloud: the light map's colour where the cloud is (its own alpha kept), at the fog's albedo
      fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalAlpha = 1; fg.globalCompositeOperation = 'source-atop';
      if (LUX.live && LUX.M) fg.drawImage(LUX.M, 0, 0, fw, fh);
      else { const a = LUX.live ? LUX.amb : [1, 1, 1]; fg.fillStyle = 'rgb(' + Math.round(a[0] * 255) + ',' + Math.round(a[1] * 255) + ',' + Math.round(a[2] * 255) + ')'; fg.fillRect(0, 0, fw, fh); }
      fg.fillStyle = WX.snow > 0.5 ? 'rgba(10,14,22,0.06)' : 'rgba(0,4,12,0.16)'; fg.fillRect(0, 0, fw, fh);
      fg.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1; ctx.drawImage(Fs.c, 0, 0, W, H);
    }
    ctx.globalAlpha = 1;
  }
  // the sky over everything: storm darkness, the place's color, blowing sand and snow, haze and heat, folded into one fill
  const grade = SET.grade !== false, L = [];
  if (WX.dark > 0.02 && lv > 0) L.push([8, 12, 22, WX.dark * (LUX.live ? 0.2 : 0.55)]);   // with the lighting engine on, storms darken the ambient light instead (so lamps still cut through)
  if (grade) {
    // (the grade is mixed from the districts round the camera, colour weighted by each one's strength)
    const g = WX.grT || (WX.grT = [0, 0, 0, 0]), m = WORLD.mixv; let ga = 0, r = 0, gg = 0, bb = 0;
    if (m) { for (const b in m) { const w = m[b], G1 = GRADE[b] || GRADE.city; if (!w) continue; const a = G1[3] * w; ga += a; r += G1[0] * a; gg += G1[1] * a; bb += G1[2] * a; } }
    else { const G1 = GRADE[WORLD.cur ? WORLD.cur.bio : 'city'] || GRADE.city; ga = G1[3]; r = G1[0] * ga; gg = G1[1] * ga; bb = G1[2] * ga; }
    if (ga > 0) { g[0] = r / ga; g[1] = gg / ga; g[2] = bb / ga; } g[3] = ga;
    const gr = WX.gr, e = Math.min(1, rdt * 0.8); for (let i = 0; i < 4; i++) gr[i] += (g[i] - gr[i]) * e;
    if (gr[3] > 0.005) L.push([gr[0], gr[1], gr[2], gr[3]]);
    if (lv > 0 && WX.sand > 0.05) L.push([160, 112, 58, WX.sand * 0.18]);
    if (lv > 0 && WX.haze > 0.05) L.push([190, 160, 112, WX.haze * 0.1]);
    if (lv > 0 && WX.heat > 0.05) L.push([255, 206, 130, WX.heat * 0.06]);
    if (lv > 0 && WX.snow > 0.6 && WX.wind > 0.6) L.push([220, 230, 240, (WX.snow - 0.6) * WX.wind * 0.4]);   // a blizzard's whiteout
  }
  if (L.length) {
    let r = 0, gg = 0, bb = 0, keep = 1;
    for (const c of L) { const a = Math.min(1, c[3]); r = r * (1 - a) + c[0] * a; gg = gg * (1 - a) + c[1] * a; bb = bb * (1 - a) + c[2] * a; keep *= 1 - a; }
    const A = 1 - keep;
    if (A > 0.004) { ctx.fillStyle = 'rgba(' + Math.round(r / A) + ',' + Math.round(gg / A) + ',' + Math.round(bb / A) + ',' + A.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
  }
  // how far you can see in fog, sand and blizzards
  if (WX.vis < 0.98) {
    const k = 1 - WX.vis, col = WX.sand > WX.fog ? '120,84,44' : WX.snow > 0.5 ? '200,210,222' : '60,68,80';
    ctx.globalAlpha = Math.min(1, k * 1.5); ctx.drawImage(screenGrad('wxv' + col, 0.12, 0.5, col, 0.92), 0, 0, W, H); ctx.globalAlpha = 1;
  }
  // lightning lights up the whole screen
  if (WX.flash > 0.01) { ctx.fillStyle = 'rgba(225,235,255,' + (WX.flash * 0.5).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
}
const GRADE = { city: [0, 0, 0, 0], burning: [255, 96, 30, 0.07], chaos: [255, 180, 60, 0.03], ruins: [120, 100, 80, 0.05], ash: [150, 150, 156, 0.13], suburb: [60, 120, 40, 0.025], desert: [255, 170, 80, 0.07], snow: [170, 205, 255, 0.07] };
// the half-size scratch picture the lit fog is built in
let FOGSCR = null;
function fogScratch() {
  const w = Math.max(2, Math.ceil(W / 2)), h = Math.max(2, Math.ceil(H / 2));
  if (!FOGSCR || FOGSCR.c.width !== w || FOGSCR.c.height !== h) { const c = document.createElement('canvas'); c.width = w; c.height = h; FOGSCR = { c: c, g: c.getContext('2d') }; }
  return FOGSCR;
}
function fogTex() {
  if (FOGTEX) return FOGTEX;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, r = 30 + Math.random() * 70;
    for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, 'rgba(200,208,218,0.22)'); gr.addColorStop(1, 'rgba(200,208,218,0)');
      g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
  FOGTEX = c; return c;
}
// the HUD line under the wave number: where you are and what the sky is doing
const WXH = { key: '' };
function updWhere() {
  const D = WORLD.cur; if (!D) return;
  const ww = windWord(WX.wbase), key = D.name + '|' + WX.label + '|' + WORLD.season + '|' + ww;
  if (key !== WXH.key) {
    WXH.key = key;
    const el = $('whereChip'); if (!el) return;
    el.textContent = '';
    const a = document.createElement('b'); a.textContent = D.name; a.style.color = BIO[D.bio].col;
    const b = document.createElement('span'); b.textContent = WX.label + ' · ';
    const ar = document.createElement('i'); ar.className = 'windArrow'; ar.textContent = '\u27a4'; ar.setAttribute('aria-hidden', 'true');
    const c = document.createElement('span'); c.textContent = ww + ' · ' + SEASONS[WORLD.season];
    b.append(ar, c); el.append(a, b); WXH.ar = ar; WXH.ang = null;
  }
  // the arrow turns with the wind
  if (WXH.ar && (WXH.ang == null || Math.abs(WX.wdir - WXH.ang) > 0.03)) { WXH.ang = WX.wdir; WXH.ar.style.transform = 'rotate(' + WX.wdir.toFixed(2) + 'rad)'; }
}

/* ---------- atmosphere: the small things that make a season and an hour ----------
   Cloud shadows sailing over the city on a fair day, fireflies over the lawns and parks on a summer night, your breath
   showing in the cold, rings spreading in the puddles when it rains. All of it for looks, local to the view, and
   scaled down (or off) with the weather detail setting. */
const ATM = { ff: [], puffs: [], rip: [], breathT: 1, cx: 0, cy: 0, cloud: null };
function atmCloudSprite() {
  if (ATM.cloud) return ATM.cloud;
  // a lumpy cloud: a few soft blobs overlapping, so the shadow is not a perfect circle
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'), R = Z.mulberry32(0xc10d);
  for (let i = 0; i < 9; i++) {
    const a = R() * TAU, d = R() * n * 0.22, x = n / 2 + Math.cos(a) * d, y = n / 2 + Math.sin(a) * d * 0.7, r = n * (0.16 + R() * 0.14);
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,0.42)'); gr.addColorStop(0.65, 'rgba(0,0,0,0.36)'); gr.addColorStop(0.85, 'rgba(0,0,0,0.14)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ATM.cloud = c; return c;
}
// how strong the cloud shadows are: broken cloud gives the sharpest shadows; past heavy cover the sky is one grey
function atmCloudiness() {
  const c = WX.cloud * (1 - wxSmooth(0.6, 0.85, WX.cloud)) * 1.1 + (WX.kind === 'clear' ? 0.1 : 0);
  return c * (1 - Math.min(1, WX.rain + WX.snow + WX.sand)) * (1 - WX.fog) * (LUX.live ? LUX.day : 1);
}
function updAtmos(rdt) {
  const lv = wxLevel(); if (!lv || G.mode === 'intro') { ATM.ff.length = ATM.puffs.length = ATM.rip.length = 0; return; }
  // the clouds drift with the wind
  // (at about twice the surface wind, as the cloud deck's steering wind blows)
  const sp = (2 + WX.wbase * 12 * 2) * wxU(); ATM.cx += Math.cos(WX.wdir) * sp * rdt; ATM.cy += Math.sin(WX.wdir) * sp * rdt;
  const bio = WORLD.cur ? WORLD.cur.bio : 'city', sea = WORLD.season, night = LUX.live ? 1 - LUX.day : 0, hw = W / ZOOM / 2, hh = H / ZOOM / 2;
  // fireflies: summer (and late spring) nights, over grass and parks, not in rain or a strong wind
  const ffOn = (sea === 1 || sea === 0) && night > 0.45 && WX.rain < 0.1 && WX.snow < 0.1 && WX.wind < 0.7 && (bio === 'suburb' || bio === 'city' || bio === 'ruins') && SET.life !== false;
  const ffMax = ffOn ? Math.round((bio === 'suburb' ? 34 : 18) * Math.min(1, lv + 0.2) * (sea === 1 ? 1 : 0.5)) : 0;
  if (ATM.ff.length < ffMax && Math.random() < rdt * 8) ATM.ff.push({ x: cam.x + rand(-hw, hw) * 1.1, y: cam.y + rand(-hh, hh) * 1.1, ph: Math.random() * 20, sp: 0.6 + Math.random() * 0.8, a: Math.random() * TAU, life: 8 + Math.random() * 10, t: 0 });
  for (let i = ATM.ff.length - 1; i >= 0; i--) {
    const f = ATM.ff[i]; f.t += rdt; f.ph += rdt * f.sp; f.a += Math.sin(f.ph * 1.3) * rdt * 1.6;
    const v = 14 * SCL * f.sp; f.x += Math.cos(f.a) * v * rdt + WX.wx * 10 * rdt; f.y += Math.sin(f.a) * v * rdt + WX.wy * 10 * rdt;
    if (f.t > f.life || !ffMax || Math.abs(f.x - cam.x) > hw * 1.4 || Math.abs(f.y - cam.y) > hh * 1.4) ATM.ff.splice(i, 1);
  }
  // breath in the cold: winter in the temperate city, anywhere in the snow, and cold nights out of summer
  const p = G.p, cold = (sea === 3 && TEMPERATE[bio]) || bio === 'snow' || (night > 0.7 && sea !== 1 && bio !== 'desert');
  if (cold && p && !p.down && (G.mode === 'play' || G.mode === 'title')) {
    ATM.breathT -= rdt * (p.dashT > 0 || Math.hypot(p.vx || 0, p.vy || 0) > 100 ? 1.6 : 1);
    if (ATM.breathT <= 0) {
      ATM.breathT = 1.6 + Math.random() * 0.9;
      const a = p.aim || 0, d = 9 * PK;
      ATM.puffs.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, vx: Math.cos(a) * 16 * PK + WX.wx * 20, vy: Math.sin(a) * 16 * PK + WX.wy * 20, t: 0, life: 1.3 });
    }
  }
  for (let i = ATM.puffs.length - 1; i >= 0; i--) { const q = ATM.puffs[i]; q.t += rdt; q.x += q.vx * rdt; q.y += q.vy * rdt; q.vx *= 0.97; q.vy *= 0.97; if (q.t > q.life) ATM.puffs.splice(i, 1); }
  // rain rings in the puddles
  if (WX.rain > 0.15 && WX.pud > 0.02 && ATM.rip.length < 70) {
    let n = WX.rain * rdt * 70 * lv;
    const cx0 = Math.floor((cam.x - hw) / CHS), cx1 = Math.floor((cam.x + hw) / CHS), cy0 = Math.floor((cam.y - hh) / CHS), cy1 = Math.floor((cam.y + hh) / CHS), list = [];
    for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) { const c = chunks.get(cx + ',' + cy); if (c) for (const q of c.puddles) if (Math.abs(q.x - cam.x) < hw + q.rx && Math.abs(q.y - cam.y) < hh + q.rx) list.push(q); }
    while (list.length && (n >= 1 || Math.random() < n)) {
      n -= 1; const q = list[Math.floor(Math.random() * list.length)], a = Math.random() * TAU, d = Math.sqrt(Math.random()) * 0.75;
      const s = wxPudK(), x = q.x + Math.cos(a) * q.rx * d * s, y = q.y + Math.sin(a) * q.ry * d * s;
      ATM.rip.push({ x: x, y: y, t: 0, life: 0.55 + Math.random() * 0.3 });
    }
  }
  for (let i = ATM.rip.length - 1; i >= 0; i--) { const r = ATM.rip[i]; r.t += rdt; if (r.t > r.life) ATM.rip.splice(i, 1); }
}
// on the ground, under everyone: rain rings in puddles, and breath clouds
function drawAtmosGround(vis) {
  if (ATM.rip.length) {
    const k = SCL > 1.2 ? 2 : 1; ctx.lineWidth = 0.8 * k; ctx.strokeStyle = 'rgba(205,220,238,0.4)';
    for (const r of ATM.rip) { if (!vis(r.x, r.y, 20)) continue; const f = r.t / r.life; ctx.globalAlpha = 1 - f; ctx.beginPath(); ctx.ellipse(r.x, r.y, (1 + f * 7) * k, (0.7 + f * 5) * k, 0, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  if (ATM.puffs.length) {
    const spr = glowSprite('#e8eef4');
    for (const q of ATM.puffs) { const f = q.t / q.life, r = (4 + f * 14) * PK * (SCL > 1.2 ? 1.6 : 1); ctx.globalAlpha = 0.34 * (1 - f) * Math.min(1, q.t * 6); ctx.drawImage(spr, q.x - r, q.y - r, r * 2, r * 2); }
    ctx.globalAlpha = 1;
  }
}
// cloud shadows: soft cumulus shapes laid in world space, sailing at about twice the wind over streets, roofs and
// zombies alike (two layers at different sizes so the tile never shows); past heavy cover they merge into one dim.
// They are soft, so they are laid into a picture an eighth of the screen's size. With the lighting engine's light map
// on, they go into it with the other sun shadows (a cloud takes the sun away and leaves the sky's light, at no cost
// over the whole screen); otherwise the small picture is stretched over the view
function wxCloudLayer(x0, y0, x1, y1, tint) {
  const lv = wxLevel(); if (!lv || G.mode === 'intro' || (WX.dbg & 4)) return null;
  const a = atmCloudiness(); if (a < 0.03) return null;
  const T = wxCloudTex(), cw = Math.max(8, Math.ceil(W / 8)), ch = Math.max(8, Math.ceil(H / 8));
  let C = WXT.csh; if (!C || C.width !== cw || C.height !== ch) { C = WXT.csh = document.createElement('canvas'); C.width = cw; C.height = ch; C.g = C.getContext('2d'); }
  const g = C.g, kx = cw / (x1 - x0), ky = ch / (y1 - y0); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, cw, ch);
  ATM.drawn = 0;
  for (const [sc, k, sp] of [[1, 1, 1], [0.57, 0.6, 1.25]]) {
    const pat = g.createPattern(T, 'repeat'); if (!pat || !pat.setTransform) break;
    const tile = 110 * wxU() * sc / 256;   // (a tile of cloud spans about 110 m)
    pat.setTransform(new DOMMatrix().translateSelf((ATM.cx * sp - x0) * kx, (ATM.cy * sp - y0) * ky, 0).scaleSelf(tile * kx, tile * ky));
    g.globalAlpha = Math.min(0.36, a * 0.8) * k * (tint ? 1.6 : 1); g.fillStyle = pat; g.fillRect(0, 0, cw, ch); ATM.drawn++;
  }
  if (tint) { g.globalAlpha = 1; g.globalCompositeOperation = 'source-in'; g.fillStyle = tint; g.fillRect(0, 0, cw, ch); g.globalCompositeOperation = 'source-over'; }
  return C;
}
function drawCloudShadows(x0, y0, x1, y1) {
  if (typeof LUX !== 'undefined' && LUX.lit) return;   // (the light map has them)
  if (wxLevel() < 0.6) return;
  const C = wxCloudLayer(x0, y0, x1, y1, null); if (!C) return;
  ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true; ctx.drawImage(C, x0, y0, x1 - x0, y1 - y0);
}
// what glows by itself after dark, drawn after the lighting: fireflies
function drawAtmosLit(vis) {
  if (!ATM.ff.length) return;
  const spr = glowSprite('#d2ff6a'), k = SCL > 1.2 ? 1.6 : 1;
  ctx.globalCompositeOperation = 'lighter';
  for (const f of ATM.ff) {
    if (!vis(f.x, f.y, 20)) continue;
    const b = Math.pow(Math.max(0, Math.sin(f.ph * 2.1)), 6) * Math.min(1, f.t, f.life - f.t); if (b < 0.02) continue;
    const r = 16 * k; ctx.globalAlpha = b; ctx.drawImage(spr, f.x - r, f.y - r, r * 2, r * 2);
    ctx.fillStyle = '#f4ffc0'; ctx.fillRect(f.x - 1.2 * k, f.y - 1.2 * k, 2.4 * k, 2.4 * k);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
/* CORE v3: what the weather learns. Every second spent in strong weather teaches it what each kind costs at full
   density on this device (a blizzard, a sandstorm, a thunderstorm); when the next weather is chosen and what it
   learned says it will not fit the frame, it starts thinner instead of building up and then being cut back. Its
   density is a ladder CORE can step too (the same one the performance governor uses). */
const wxStrength = () => Math.max(WX.rain || 0, WX.snow || 0, WX.sand || 0, WX.ash || 0, WX.fog || 0, WX.storm || 0);
function wxLearn() {
  const e = CORE.by.WX; if (!e || !(e.msSec > 0) || typeof LEARN === 'undefined' || !LEARN.ready || G.mode !== 'play') return;
  const lv = wxLevel(); if (wxStrength() < 0.6 || lv < 0.2) return;
  const o = learnOwn('WX'), k = WX.local || WX.kind, ms = e.msSec / lv; o.k = o.k || {};
  o.k[k] = o.k[k] ? o.k[k] * 0.85 + ms * 0.15 : ms; if ((o.n = (o.n | 0) + 1) % 10 === 0) learnDirty();
}
function wxAhead(k) {
  if (typeof LEARN === 'undefined' || !LEARN.ready || !CORE.by.WX || SET.weather !== 'auto' || G.mode !== 'play') return;
  const o = learnOwn('WX'), full = o.k && o.k[k]; if (!full) return;
  const add = full * wxLevel() - (CORE.by.WX.msAvg || 0);
  if (add > learnFree() && PERF.wxScale > 0.26) { PERF.wxScale = Math.max(0.25, PERF.wxScale - 0.25); coreLog('WX starts the coming ' + k + ' thinner: it costs about ' + full.toFixed(1) + ' ms a frame at full density on this device'); }
}
coreMeta('WX', { ver: 3, provides: ['weather', 'wind', 'wetness', 'precipitation field', 'fronts', 'rain cells', 'puddles', 'snow cover'], sec: wxLearn,
  lv: () => Math.round(wxLevel() * 4), adaptGet: () => Math.round(PERF.wxScale * 4), loadNow: () => Math.round(wxStrength() * 10) + WXD.length, loadName: 'weather strength',
  canTrim: () => SET.weather === 'auto' && PERF.wxScale > 0.26, trim: () => { if (SET.weather !== 'auto' || PERF.wxScale <= 0.26) return false; PERF.wxScale = Math.max(0.25, PERF.wxScale - 0.25); return true; },
  boost: () => { if (PERF.wxScale >= 1) return false; PERF.wxScale = Math.min(1, PERF.wxScale + 0.25); return true; },
  check: () => WXD.length > 600 ? 'its drifting debris piled up' : WXD.some(d => !(d.x === d.x && d.y === d.y)) ? 'a drifting leaf lost its place' : !(WX.wet >= 0 && WX.wet <= 1.5) ? 'its wetness went out of range' : WX.cells.length > 12 || WX.cells.some(c => !(c.x === c.x && c.r > 0)) ? 'a rain cell lost its place' : !WX_REG[WX.kind] ? 'it lost track of its weather system' : !(WX.acc >= 0 && WX.acc <= 6) ? 'the rain on the ground went out of range' : '',
  repair: () => { for (let i = WXD.length - 1; i >= 0; i--) if (!(WXD[i].x === WXD[i].x && WXD[i].y === WXD[i].y)) WXD.splice(i, 1); if (WXD.length > 600) WXD.length = 300; WX.wet = clamp(WX.wet || 0, 0, 1); WX.cells = WX.cells.filter(c => c.x === c.x && c.r > 0).slice(0, 6); WX.acc = clamp(WX.acc || 0, 0, 5); if (!WX_REG[WX.kind]) wxBegin('clear'); },
  reset: () => { WXD.length = 0; WX.splash = []; WX.strikes = []; WX.bolts = []; WX.hailG = []; WX.pulses = []; },
  learned: () => { const o = learnOwn('WX'), ks = o.k ? Object.entries(o.k).sort((a, b) => b[1] - a[1]).slice(0, 3) : []; return ks.length ? ['At full density here: ' + ks.map(([k, v]) => k + ' ' + v.toFixed(1) + ' ms').join(', ') + '.'] : []; } });
