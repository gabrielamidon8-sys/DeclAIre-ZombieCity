/* ================= roster bosses: 50 named bosses that mutate, plus the Overlord ================= */
const bossSeen = new Set(store.get('zc_bosses', []));
const bossKilled = new Set(store.get('zc_bossk', []));
function saveBosses() { store.set('zc_bosses', Array.from(bossSeen)); store.set('zc_bossk', Array.from(bossKilled)); }
const BOSS_MOVES = {
  charge: { min: 120, max: 650, cd: 2.4, tele: 0.75 }, leap: { min: 90, max: 540, cd: 2.8, tele: 0.9 }, slam: { max: 230, cd: 2.2, tele: 0.7 },
  volley: { max: 720, cd: 2.2, tele: 0.45 }, nova: { cd: 2.8, tele: 0.6 }, spiral: { max: 700, cd: 4.5, tele: 0.3 }, summon: { cd: 7, tele: 0.7 },
  beam: { max: 680, cd: 3.2, tele: 0.85 }, sweep: { max: 620, cd: 3.8, tele: 0.6 }, teleport: { cd: 3.4, tele: 0.35 }, burrow: { min: 150, cd: 4.5, tele: 0.3 },
  meteor: { cd: 4.2, tele: 0.4 }, pull: { max: 500, cd: 5.5, tele: 0.4 }, shield: { cd: 8, tele: 0.3 }, clones: { cd: 8, tele: 0.5 },
  howl: { max: 400, cd: 4.5, tele: 0.5 }, web: { max: 580, cd: 3.2, tele: 0.4 }, bombs: { max: 600, cd: 3.6, tele: 0.3 }, blades: { max: 450, cd: 5.5, tele: 0.4 },
  regen: { cd: 10, tele: 0.3 }, grab: { max: 540, cd: 20, tele: 0 }, quake: { max: 440, cd: 4.2, tele: 0.55 }, frost: { max: 600, cd: 3.6, tele: 0.3 }, lightning: { cd: 3.8, tele: 0.3 }
};
const SHOT_COL = { acid: '#a5d43a', wisp: '#ffb04a', shard: '#e8eef5', spike: '#d9cfb4', fire: '#ff8a2a', ice: '#9ff0ff', void: '#b48cff', shock: '#fff36b', spirit: '#cfe8ff', web: '#f2efe6', bolt: '#ff5a4a' };
const ROSTER_BY_ID = new Map(ZB.ROSTER.map(d => [d.id, d]));

function rosterM(def) {
  const tier = def.tier, forms = def.forms.length;
  return {
    id: -100 - def.id, num: 0, name: def.name, unique: true, roster: true, threat: 8 + tier, rarity: 4,
    hp: (0.9 + tier * 0.15) * forms * 0.55, spd: 0.85, dmg: 1.15 + tier * 0.1, size: 0.85 + Math.min(tier, 5) * 0.06, hue: 0, seed: def.id,
    S: { key: 'boss', name: def.name, p: { kb: 0 }, gore: def.forms[0].col[0], trait: '' }, A: { key: 'none', name: '', desc: '' }
  };
}
function applyForm(z) {
  const rb = z.rb, F = rb.def.forms[rb.form], w = G.wave || 1;
  z.r = z.baseR * F.size;
  z.speed = 68 * 0.85 * F.spd * Math.min(1.3, 1 + 0.012 * (w - 1)) * (rb.def.overlord ? 1 + Math.min(0.4, (rb.absorbed || 0) * 0.02) : 1);
  rb.mcd = {}; rb.cd = 1.2;
}
function spawnRoster(def, roam, at) {
  const pos = at || spawnPos(), m = rosterM(def), z = spawnZombie(m, pos.x, pos.y, { boss: true });
  z.abs = []; z.kb = 0;
  if (roam) { z.hp *= 0.6; z.maxHp = z.hp; }
  const n = def.forms.length;
  z.rb = { def: def, form: 0, state: 'idle', t: 0, cd: 1.6, mv: null, d: {}, mcd: {}, look: 0, seg: null, lift: 0, mutT: 0, alpha: 1, shieldT: 0, bladesT: 0, regenT: 0, trailT: 0, roam: !!roam, thr: n === 3 ? [0.66, 0.33] : n === 2 ? [0.5] : [], absorbed: 0 };
  if (def.forms.some(f => f.body === 'serpent')) { z.rb.seg = []; for (let i = 0; i < 9; i++) z.rb.seg.push([z.x - i * z.r * 0.5, z.y]); }
  applyForm(z);
  G.boss = z; G.cineT = def.overlord ? 0 : 2.4;
  if (!def.overlord) {
    const isNew = !bossSeen.has(def.id); bossSeen.add(def.id); saveBosses();
    SFX.bossIntro(); SFX.roar();
    banner(def.name, (isNew ? 'New boss · ' : '') + def.title);
  }
  return z;
}
function pickRoster(wave, roam) {
  const top = clamp(1 + Math.floor(wave / (roam ? 10 : 8)), 1, 5);
  let pool = ZB.ROSTER.filter(d => d.tier <= top && d.tier >= top - 1);
  const fresh = pool.filter(d => !bossSeen.has(d.id));
  if (fresh.length && Math.random() < 0.75) pool = fresh;
  return pick(pool);
}
function bossMusic() {
  const b = G.boss && !G.boss.dead ? G.boss : null;
  let key = '', mod = null;
  if (b && b.rb && b.rb.def.overlord) { key = 'O' + (b.rb.form + 1); mod = { song: 'overlord', phase: b.rb.form + 1 }; }
  else if (b && b.rb) { key = 'R' + b.rb.def.id + ':' + b.rb.form; mod = b.rb.def.music(b.rb.form); }
  else if (b && b.snatch) { key = 'S'; mod = { tr: -1, tempo: 1.05, add: ['siren', 'choir'] }; }
  if (key !== G.bossMusKey) { G.bossMusKey = key; SFX.setBoss(mod); }
}

/* ---------- the state machine ---------- */
function bossTick(z, dt, dx, dy, d, c) {
  const rb = z.rb, p = G.p, F = rb.def.forms[rb.form], T = rb.def.tier, ov = rb.def.overlord;
  rb.look = Math.atan2(dy, dx);
  z.walk = (z.walk || 0) + Math.hypot(z.vx, z.vy) * dt * 0.12;
  if (rb.seg) { let px = z.x, py = z.y; const sp = z.r * 0.55; for (const s of rb.seg) { const ex = s[0] - px, ey = s[1] - py, el = Math.hypot(ex, ey) || 1; if (el > sp) { s[0] = px + ex / el * sp; s[1] = py + ey / el * sp; } px = s[0]; py = s[1]; } }
  for (const k in rb.mcd) rb.mcd[k] -= dt;
  // never let a boss get lost behind buildings: if it stays far away, it re-enters near the player
  if (d > 760 && G.mode === 'play' && rb.state === 'idle' && rb.mutT <= 0) { rb.farT = (rb.farT || 0) + dt; if (rb.farT > 5) { rb.farT = 0; const q = spawnPos(); burst(z.x, z.y, 12, '#6b5a45', 120, 4, 0.4); z.x = q.x; z.y = q.y; if (rb.seg) for (const sg of rb.seg) { sg[0] = z.x; sg[1] = z.y; } ring(z.x, z.y, 10, z.r * 2, 0.4, '229,72,77', 4); } } else rb.farT = 0;
  if (rb.shieldT > 0) rb.shieldT -= dt;
  if (rb.regenT > 0) { rb.regenT -= dt; const cap = rb.form ? rb.thr[rb.form - 1] * z.maxHp : z.maxHp; z.hp = Math.min(cap, z.hp + z.maxHp * 0.03 * dt); if (Math.random() < dt * 12) burst(z.x + rand(-z.r, z.r), z.y + rand(-z.r, z.r), 1, '#7bd88a', 40, 3, 0.5); }
  if (rb.bladesT > 0) { rb.bladesT -= dt; rb.bladeHit = (rb.bladeHit || 0) - dt; if (d < z.r * 2.3 + p.r && rb.bladeHit <= 0 && G.mode === 'play') { rb.bladeHit = 0.35; hurtPlayer(z.dmg * 0.8); } }
  if (F.trail && !z.st.under && G.mode === 'play') { rb.trailT -= dt; if (rb.trailT <= 0) { rb.trailT = 0.28; const k = rb.def.haz || 'fire'; G.haz.push({ k: k === 'ice' ? 'ice' : k, x: z.x, y: z.y, r: z.r * 0.9, life: 3, max: 3, dps: 8 + G.wave * 0.6 }); } }
  if (rb.mutT > 0) { rb.mutT -= dt; c.move = 0; z.vx *= 0.8; z.vy *= 0.8; if (rb.mutT <= 0) finishMutation(z); return; }
  if (z.stun > 0) return;
  if (rb.state === 'holding') { c.face = z.ang; c.move = 0; return; }
  if (rb.state === 'stunned' || rb.state === 'recover') { c.move = rb.state === 'stunned' ? 0 : 0.35; rb.t -= dt; if (rb.t <= 0) { rb.state = 'idle'; rb.cd = rand(0.7, 1.4) / (1 + rb.form * 0.25 + (ov ? 0.3 : 0)); } return; }
  if (rb.state === 'idle') {
    if (rb.bladesT > 0) c.move = 1.5;
    if (G.mode !== 'play') return;
    rb.cd -= dt; if (rb.cd > 0) return;
    const opts = F.moves.filter(m => { const M = BOSS_MOVES[m]; if (!M || (rb.mcd[m] || 0) > 0) return false; if (M.min && d < M.min) return false; if (M.max && d > M.max) return false; if (m === 'regen' && z.hp > z.maxHp * 0.7) return false; if (m === 'summon' && G.zs.length > 80) return false; if (m === 'shield' && rb.shieldT > 0) return false; return true; });
    if (!opts.length) { rb.cd = 0.35; return; }
    bossStart(z, pick(opts), dx, dy, d);
    return;
  }
  // telegraph and action phases
  const mv = rb.mv, D = rb.d;
  rb.t -= dt;
  if (rb.state === 'tele') {
    c.move = mv === 'blades' || mv === 'volley' ? 0.4 : 0; c.face = Math.atan2(dy, dx);
    if (mv === 'charge' && rb.t > 0.3) D.a = Math.atan2(dy, dx);
    if (mv === 'charge') c.face = D.a;
    if (mv === 'leap' && rb.t > 0.35) { D.tx = p.x; D.ty = p.y; }
    if (mv === 'beam' && rb.t > 0.3) D.a = Math.atan2(dy, dx);
    if (mv === 'teleport') rb.alpha = Math.max(0, rb.t / BOSS_MOVES.teleport.tele);
    if (mv === 'grab') return grabTick(z, dt, c);
    if (rb.t <= 0) bossExec(z, dx, dy, d);
    return;
  }
  if (rb.state === 'act') bossAct(z, dt, dx, dy, d, c);
}
function bossStart(z, mv, dx, dy, d) {
  const rb = z.rb, M = BOSS_MOVES[mv];
  rb.mv = mv; rb.state = 'tele'; rb.t = M.tele; rb.d = { a: Math.atan2(dy, dx), tx: G.p.x, ty: G.p.y, sx: z.x, sy: z.y };
  rb.mcd[mv] = M.cd * (rb.def.overlord ? (mv === 'grab' ? (rb.form ? 0.7 : 0.9) : 0.8) : 1) / (1 + rb.form * 0.15);
  if (mv === 'grab') { const s = rb.d; s.t = rb.def.overlord ? 1.35 : 1.7; s.max = s.t; s.zx = G.p.x; s.zy = G.p.y; s.zr = rb.def.overlord ? 135 : 120; s.lx = z.x; s.ly = z.y; rb.t = 99; SFX.alarm(); }
  if (mv === 'charge' || mv === 'leap' || mv === 'beam' || mv === 'sweep') SFX.alarm();
  if (mv === 'sweep') { rb.d.dir = Math.random() < 0.5 ? -1 : 1; rb.d.a0 = rb.d.a - rb.d.dir * 0.9; }
}
function shotKind(def) { return def.shot || 'spike'; }
function bossExec(z, dx, dy, d) {
  const rb = z.rb, mv = rb.mv, D = rb.d, def = rb.def, T = def.tier + rb.form, p = G.p, kind = shotKind(def), a = Math.atan2(dy, dx);
  const end = (t) => { rb.state = 'recover'; rb.t = t || 0.45; };
  const act = (t) => { rb.state = 'act'; rb.t = t; };
  switch (mv) {
    case 'charge': z.st.charge = 1; D.hit = false; act(0.85); break;
    case 'leap': D.sx = z.x; D.sy = z.y; act(0.38); break;
    case 'slam': { const R = z.r * 2.4 + 50; if (G.mode === 'play' && d < R + p.r * 0.5) hurtPlayer(z.dmg * 1.4); ring(z.x, z.y, z.r, R, 0.4, '255,140,60', 5); burst(z.x, z.y, 18, '#6b5a45', 240, 5, 0.5); shakeIt(8); SFX.boom(false); end(0.5); break; }
    case 'volley': { const n = 5 + Math.min(6, T); for (let i = 0; i < n; i++) shoot(z.x, z.y, a + (i - (n - 1) / 2) * 0.13, 300 + T * 12, z.dmg * 0.8, 6, kind); SFX.zap(); end(0.4); break; }
    case 'nova': { const n = 12 + T * 2; for (let i = 0; i < n; i++) shoot(z.x, z.y, i / n * TAU + rand(0.1), 230 + T * 8, z.dmg * 0.7, 6, kind); ring(z.x, z.y, z.r, z.r * 2.5, 0.3, '255,255,255', 3); SFX.boom(false); end(0.5); break; }
    case 'spiral': D.a = a; D.ft = 0; act(2.1); break;
    case 'summon': { const n = 3 + Math.min(4, T); for (let i = 0; i < n; i++) { const an = i / n * TAU, x = z.x + Math.cos(an) * z.r * 2.2, y = z.y + Math.sin(an) * z.r * 2.2; if (!blocked(x, y, 14)) { spawnZombie(Math.random() < 0.7 && G.feat.length ? pick(G.feat) : pick(G.pool), x, y); burst(x, y, 10, '#6b5a45', 120, 4, 0.4); } } SFX.roar(); end(0.5); break; }
    case 'beam': act(0.55); D.hitT = 0; SFX.zap(); break;
    case 'sweep': act(1.5); D.hitT = 0; break;
    case 'teleport': {
      let x = p.x, y = p.y; for (let i = 0; i < 12; i++) { const an = rand(TAU); x = p.x + Math.cos(an) * 160; y = p.y + Math.sin(an) * 160; if (!blocked(x, y, z.r * 0.8)) break; }
      D.tx = x; D.ty = y; rb.hide = true; act(0.45); break;
    }
    case 'burrow': z.st.under = true; D.stage = 0; act(1.4); break;
    case 'meteor': { const n = 4 + Math.min(5, T); for (let i = 0; i < n; i++) { const an = rand(TAU), rr = i === 0 ? 0 : rand(40, 210); G.blasts.push({ x: p.x + Math.cos(an) * rr, y: p.y + Math.sin(an) * rr, r: 62, t: 1 + i * 0.12, max: 1 + i * 0.12, dmg: z.dmg * 1.3, kind: 'meteor', haz: def.haz, col: def.forms[rb.form].col[2] }); } SFX.alarm(); end(0.6); break; }
    case 'pull': act(1.8); break;
    case 'shield': rb.shieldT = 2.6; ring(z.x, z.y, z.r, z.r * 1.8, 0.4, '110,180,255', 4); end(0.3); break;
    case 'clones': { const n = 2 + Math.min(2, rb.form); for (let i = 0; i < n; i++) { const an = rand(TAU), x = z.x + Math.cos(an) * 90, y = z.y + Math.sin(an) * 90; if (blocked(x, y, z.r * 0.7)) continue; const k = spawnZombie(z.m, x, y, { illusion: true }); k.r = z.r; k.speed = z.speed * 1.2; k.rb = { def: def, form: rb.form, ill: true, look: 0, seg: null, alpha: 0.6, lift: 0, mutT: 0 }; k.life = 6; burst(x, y, 10, '#efe9dc', 120, 4, 0.4); } end(0.4); break; }
    case 'howl': { ring(z.x, z.y, z.r, 340, 0.6, '255,230,200', 5); if (G.mode === 'play' && d < 340) { p.slowT = Math.max(p.slowT, 2); p.slowMul = Math.min(p.slowMul, 0.55); } near(z.x, z.y, 340, o => { if (o !== z && !o.dead) o.buffT = 4; }); SFX.roar(); shakeIt(5); end(0.5); break; }
    case 'web': { for (let i = -1; i <= 1; i++) shoot(z.x, z.y, a + i * 0.22, 340, z.dmg * 0.4, 7, 'web'); end(0.4); break; }
    case 'bombs': { const n = 3 + Math.floor(T / 2); for (let i = 0; i < n; i++) { const an = rand(TAU), rr = rand(20, 170); G.blasts.push({ x: p.x + Math.cos(an) * rr, y: p.y + Math.sin(an) * rr, r: 72, t: 1.4, max: 1.4, dmg: z.dmg * 1.2, kind: 'bomb', haz: def.haz, col: '#ff6a3a' }); } end(0.4); break; }
    case 'blades': rb.bladesT = 3; end(0.2); break;
    case 'regen': rb.regenT = 2.5; ring(z.x, z.y, z.r, z.r * 2, 0.5, '110,230,120', 4); end(0.3); break;
    case 'quake': { for (let i = 0; i < 3; i++) G.quakes.push({ x: z.x, y: z.y, t: -i * 0.45, max: 1.1, R: 440, w: 24, dmg: z.dmg * 1.1, hit: false }); shakeIt(6); SFX.boom(true); end(0.6); break; }
    case 'frost': G.blasts.push({ x: p.x, y: p.y, r: 125, t: 0.75, max: 0.75, dmg: z.dmg * 0.6, kind: 'frost', col: '#9ff0ff' }); end(0.4); break;
    case 'lightning': D.n = 0; D.ft = 0; act(1.5); break;
    default: end(0.3);
  }
}
function bossAct(z, dt, dx, dy, d, c) {
  const rb = z.rb, mv = rb.mv, D = rb.d, p = G.p, def = rb.def, T = def.tier + rb.form;
  const done = (t) => { rb.state = 'recover'; rb.t = t || 0.45; rb.lift = 0; };
  switch (mv) {
    case 'charge':
      c.ov = true; c.vx = Math.cos(D.a) * 640; c.vy = Math.sin(D.a) * 640; c.face = D.a;
      if (Math.random() < 0.5) burst(z.x, z.y, 1, '#6b5a45', 60, 4, 0.4);
      if (!D.hit && G.mode === 'play' && d < z.r + p.r + 4) { D.hit = true; if (hurtPlayer(z.dmg * 1.5)) { p.kvx += Math.cos(D.a) * 520; p.kvy += Math.sin(D.a) * 520; } }
      if (z.st.charge === 0) { done(0.9); shakeIt(5); return; }
      if (rb.t <= 0) { z.st.charge = 0; done(0.5); }
      return;
    case 'leap': {
      const f = clamp(1 - rb.t / 0.38, 0, 1); c.ov = true; c.vx = 0; c.vy = 0;
      z.x = D.sx + (D.tx - D.sx) * f; z.y = D.sy + (D.ty - D.sy) * f; rb.lift = Math.sin(f * Math.PI);
      if (rb.t <= 0) { if (G.mode === 'play' && Math.hypot(p.x - D.tx, p.y - D.ty) < 100 + p.r * 0.5) hurtPlayer(z.dmg * 1.6); ring(D.tx, D.ty, 10, 110, 0.4, '229,72,77', 5); burst(D.tx, D.ty, 20, '#6b5a45', 240, 6, 0.5); shakeIt(9); SFX.boom(true); collide(z, z.r * 0.9); done(0.6); }
      return;
    }
    case 'spiral':
      c.move = 0.15; D.ft -= dt; D.a += dt * 3.3;
      if (D.ft <= 0) { D.ft = 0.08; const k = shotKind(def); shoot(z.x, z.y, D.a, 220 + T * 6, z.dmg * 0.55, 6, k); shoot(z.x, z.y, D.a + Math.PI, 220 + T * 6, z.dmg * 0.55, 6, k); if (T >= 4) shoot(z.x, z.y, D.a + Math.PI / 2, 220, z.dmg * 0.55, 6, k); }
      if (rb.t <= 0) done(0.5);
      return;
    case 'beam': case 'sweep': {
      c.move = 0;
      const a = mv === 'beam' ? D.a : D.a0 + D.dir * 1.8 * (1 - rb.t / 1.5); D.cur = a; c.face = a;
      D.hitT -= dt;
      if (G.mode === 'play' && D.hitT <= 0) { const ex = p.x - z.x, ey = p.y - z.y, along = ex * Math.cos(a) + ey * Math.sin(a), perp = Math.abs(-ex * Math.sin(a) + ey * Math.cos(a)); if (along > 0 && along < 900 && perp < 20 + p.r) { D.hitT = 0.3; hurtPlayer(z.dmg * 0.9); } }
      if (rb.t <= 0) done(0.4);
      return;
    }
    case 'teleport':
      c.move = 0; c.ov = true; c.vx = 0; c.vy = 0;
      if (rb.t <= 0) {
        z.x = D.tx; z.y = D.ty; rb.hide = false; rb.alpha = 1; burst(z.x, z.y, 18, '#b48cff', 160, 4, 0.5); ring(z.x, z.y, 10, 90, 0.35, '180,140,255', 4);
        if (rb.form >= 1) for (let i = 0; i < 8; i++) shoot(z.x, z.y, i / 8 * TAU, 230, z.dmg * 0.6, 6, shotKind(def));
        if (rb.seg) for (const s of rb.seg) { s[0] = z.x; s[1] = z.y; }
        done(0.4);
      }
      return;
    case 'burrow':
      if (D.stage === 0) {
        const a = Math.atan2(dy, dx); c.ov = true; c.vx = Math.cos(a) * z.speed * 2.4; c.vy = Math.sin(a) * z.speed * 2.4;
        if (Math.random() < 0.6) burst(z.x, z.y, 1, '#6b5a45', 50, 4, 0.4);
        if (rb.t <= 0) { D.stage = 1; rb.t = 0.55; D.tx = z.x; D.ty = z.y; }
      } else {
        c.ov = true; c.vx = 0; c.vy = 0;
        if (rb.t <= 0) { z.st.under = false; if (G.mode === 'play' && Math.hypot(p.x - z.x, p.y - z.y) < 95 + p.r * 0.5) hurtPlayer(z.dmg * 1.5); ring(z.x, z.y, 10, 100, 0.4, '150,120,80', 5); burst(z.x, z.y, 24, '#6b5a45', 260, 6, 0.6); for (let i = 0; i < 8; i++) shoot(z.x, z.y, i / 8 * TAU, 240, z.dmg * 0.6, 6, shotKind(def)); shakeIt(8); SFX.boom(true); done(0.6); }
      }
      return;
    case 'pull':
      c.move = 0;
      if (G.mode === 'play' && d < 500) { const f = 170 + 140 * (1 - d / 500); p.extX -= dx / d * f; p.extY -= dy / d * f; if (d < z.r + p.r + 10) dotPlayer(z.dmg * 1.4 * dt); }
      if (Math.random() < 0.5) { const an = rand(TAU), rr = rand(150, 420); G.parts.push({ x: z.x + Math.cos(an) * rr, y: z.y + Math.sin(an) * rr, vx: -Math.cos(an) * 260, vy: -Math.sin(an) * 260, life: 0.9, max: 0.9, s: 3, c: def.forms[rb.form].col[2] }); }
      if (rb.t <= 0) done(0.4);
      return;
    case 'lightning':
      c.move = 0.3; D.ft -= dt;
      if (D.ft <= 0 && D.n < 3) { D.ft = 0.45; D.n++; G.blasts.push({ x: p.x, y: p.y, r: 58, t: 0.6, max: 0.6, dmg: z.dmg * 1.1, kind: 'bolt', col: '#fff36b' }); }
      if (rb.t <= 0) done(0.4);
      return;
  }
  if (rb.t <= 0) done(0.4);
}
// the grab: a red circle follows you, locks, then the boss leaps in. Caught = tap the circles (shared with the Snatcher)
function grabTick(z, dt, c) {
  const rb = z.rb, s = rb.d, p = G.p, LOCK = rb.def.overlord ? 0.45 : 0.6;
  s.t -= dt; c.move = 0;
  if (s.t > LOCK) { const k = Math.min(1, dt * (rb.def.overlord ? 5 : 4)); s.zx += (p.x - s.zx) * k; s.zy += (p.y - s.zy) * k; s.lx = z.x; s.ly = z.y; c.face = Math.atan2(s.zy - z.y, s.zx - z.x); }
  else {
    const f = 1 - Math.max(0, s.t) / LOCK, ang = Math.atan2(s.zy - s.ly, s.zx - s.lx);
    const tx = s.zx - Math.cos(ang) * z.r * 0.6, ty = s.zy - Math.sin(ang) * z.r * 0.6;
    z.x = s.lx + (tx - s.lx) * f; z.y = s.ly + (ty - s.ly) * f; c.face = ang; c.ov = true; c.vx = 0; c.vy = 0; rb.lift = Math.sin(f * Math.PI) * 0.7;
  }
  if (s.t <= 0) {
    rb.lift = 0;
    const inside = G.mode === 'play' && !G.grab && p.dashT <= 0 && Math.hypot(p.x - s.zx, p.y - s.zy) < s.zr;
    ring(s.zx, s.zy, 10, s.zr, 0.4, '229,72,77', 5); burst(s.zx, s.zy, 22, '#6b5a45', 260, 6, 0.6); shakeIt(10);
    if (inside) startGrab(z);
    else { rb.state = 'recover'; rb.t = 1.3; G.texts.push({ x: z.x, y: z.y - z.r - 16, t: 0, life: 1, s: 'MISSED', c: '#f2cc3a', big: true }); }
  }
}
/* ---------- mutation between forms ---------- */
function checkBossForm(z) {
  const rb = z.rb; if (!rb || rb.ill || rb.mutT > 0) return;
  const thr = rb.thr[rb.form]; if (thr == null) return;
  if (z.hp <= z.maxHp * thr) { z.hp = Math.max(1, z.maxHp * thr - 1); startMutation(z); }
}
function startMutation(z) {
  const rb = z.rb, ov = rb.def.overlord;
  rb.mutT = ov ? 2.6 : 1.6; rb.state = 'idle'; rb.shieldT = 0; rb.bladesT = 0; z.st.under = false; z.st.charge = 0; rb.hide = false; rb.alpha = 1; rb.lift = 0;
  if (G.grab && G.grab.z === z) endGrab(true);
  SFX.mutate(); shakeIt(10);
  if (ov) { SFX.barBreak(); $('bossBar').classList.add('breaking'); setTimeout(() => $('bossBar').classList.remove('breaking'), 2600); }
  ring(z.x, z.y, z.r, z.r * 3, 0.8, '255,255,255', 5);
  const nf = rb.def.forms[rb.form + 1];
  banner(nf.name, ov ? 'The second health bar awakens' : rb.def.name + ' is mutating');
}
function finishMutation(z) {
  const rb = z.rb, p = G.p;
  rb.form++; applyForm(z);
  burst(z.x, z.y, 50, rb.def.forms[rb.form].col[0], 320, 6, 0.8); burst(z.x, z.y, 30, rb.def.forms[rb.form].col[2], 260, 4, 0.7);
  ring(z.x, z.y, z.r, z.r * 4, 0.7, '255,255,255', 6); shakeIt(14); G.hurtFlash = Math.max(G.hurtFlash, 0.2);
  if (p && G.mode === 'play') { const d = Math.hypot(p.x - z.x, p.y - z.y) || 1; if (d < 260) { p.kvx += (p.x - z.x) / d * 600; p.kvy += (p.y - z.y) / d * 600; } }
  if (rb.seg && rb.def.forms[rb.form].body !== 'serpent') rb.seg = null;
  if (!rb.seg && rb.def.forms[rb.form].body === 'serpent') { rb.seg = []; for (let i = 0; i < 9; i++) rb.seg.push([z.x, z.y]); }
  SFX.roar();
}
/* ---------- blasts (meteors, bombs, frost, lightning) and quake rings ---------- */
function updBlasts(dt) {
  const p = G.p;
  for (const b of G.blasts) {
    b.t -= dt; if (b.t > 0) continue; b.dead = true;
    const d = Math.hypot(p.x - b.x, p.y - b.y), hit = G.mode === 'play' && d < b.r + p.r * 0.4;
    if (hit && hurtPlayer(b.dmg)) { if (b.kind === 'frost') { p.frozenT = Math.max(p.frozenT, 0.7); } if (b.haz === 'fire') p.burnT = Math.max(p.burnT, 2); }
    near(b.x, b.y, b.r, o => { if (!o.dead && !o.boss && Math.hypot(o.x - b.x, o.y - b.y) < b.r) hurtZombie(o, b.dmg * 0.5, { src: 'blast' }); });
    const col = b.col || '#ff8a3a';
    if (b.kind === 'bolt') { bolt(b.x + rand(-30, 30), b.y - 320, b.x, b.y, '#fff36b'); bolt(b.x + rand(-30, 30), b.y - 320, b.x, b.y, '#ffffff'); SFX.zap(); }
    else SFX.boom(b.kind === 'meteor');
    ring(b.x, b.y, 6, b.r * 1.15, 0.4, hexRgb(col), 4); burst(b.x, b.y, 14, col, 200, 5, 0.5); shakeIt(b.kind === 'meteor' ? 5 : 3);
    if (b.kind === 'frost') G.haz.push({ k: 'ice', x: b.x, y: b.y, r: b.r, life: 4, max: 4, dps: 4 + G.wave * 0.3 });
    else if (b.haz && b.kind !== 'bolt') G.haz.push({ k: b.haz === 'ice' ? 'ice' : b.haz, x: b.x, y: b.y, r: b.r * 0.85, life: 3, max: 3, dps: 9 + G.wave * 0.6 });
  }
  G.blasts = G.blasts.filter(b => !b.dead);
  for (const q of G.quakes) {
    q.t += dt; if (q.t < 0) continue; if (q.t > q.max) { q.dead = true; continue; }
    const R = q.R * q.t / q.max, d = Math.hypot(p.x - q.x, p.y - q.y);
    if (!q.hit && G.mode === 'play' && Math.abs(d - R) < q.w + p.r * 0.5) { q.hit = true; hurtPlayer(q.dmg); }
  }
  G.quakes = G.quakes.filter(q => !q.dead);
}
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255); }
function drawBlasts() {
  for (const b of G.blasts) {
    const f = clamp(1 - b.t / b.max, 0, 1), col = b.col || '#ff8a3a';
    ctx.fillStyle = hexA(col, 0.1 + f * 0.12); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = hexA(col, 0.28); ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(1, b.r * f), 0, TAU); ctx.fill();
    ctx.strokeStyle = hexA(col, 0.6 + f * 0.4); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
    if (b.kind === 'meteor' && f > 0.4) { const h = (1 - f) * 260; ctx.fillStyle = hexA(col, 0.9); ctx.beginPath(); ctx.arc(b.x + h * 0.4, b.y - h, 10 + f * 6, 0, TAU); ctx.fill(); ctx.strokeStyle = hexA(col, 0.4); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(b.x + h * 0.4, b.y - h); ctx.lineTo(b.x + h * 0.4 + 40, b.y - h - 100); ctx.stroke(); }
    if (b.kind === 'bomb') { ctx.fillStyle = '#2a2d22'; ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, TAU); ctx.fill(); ctx.fillStyle = Math.floor(G.time * 14) % 2 ? '#ff4a3a' : '#ffd38a'; ctx.beginPath(); ctx.arc(b.x, b.y - 2, 2.5, 0, TAU); ctx.fill(); }
  }
  for (const q of G.quakes) {
    if (q.t < 0) continue; const R = q.R * q.t / q.max, a = 1 - q.t / q.max;
    ctx.strokeStyle = 'rgba(150,120,80,' + (0.55 * a) + ')'; ctx.lineWidth = q.w * 2; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(1, R), 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,120,' + (0.7 * a) + ')'; ctx.lineWidth = 3; ctx.stroke();
  }
}
/* ---------- boss drawing and telegraphs ---------- */
function drawBossTele(z) {
  const rb = z.rb; if (!rb || rb.ill) return;
  const D = rb.d, mv = rb.mv;
  if (rb.state === 'tele') {
    const f = clamp(1 - rb.t / (BOSS_MOVES[mv] ? BOSS_MOVES[mv].tele || 1 : 1), 0, 1);
    if (mv === 'charge') { ctx.strokeStyle = 'rgba(255,70,60,' + (0.25 + f * 0.6) + ')'; ctx.lineWidth = z.r * 1.3; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(z.x + Math.cos(D.a) * 540, z.y + Math.sin(D.a) * 540); ctx.stroke(); }
    if (mv === 'leap') { ctx.fillStyle = 'rgba(229,72,77,0.12)'; ctx.beginPath(); ctx.arc(D.tx, D.ty, 100, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(229,72,77,0.25)'; ctx.beginPath(); ctx.arc(D.tx, D.ty, Math.max(1, 100 * f), 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,90,80,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(D.tx, D.ty, 100, 0, TAU); ctx.stroke(); }
    if (mv === 'slam') { const R = z.r * 2.4 + 50; ctx.fillStyle = 'rgba(255,140,60,0.12)'; ctx.beginPath(); ctx.arc(z.x, z.y, R, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,140,60,0.25)'; ctx.beginPath(); ctx.arc(z.x, z.y, Math.max(1, R * f), 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,160,80,0.8)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(z.x, z.y, R, 0, TAU); ctx.stroke(); }
    if (mv === 'beam') { ctx.strokeStyle = 'rgba(255,60,60,' + (0.3 + f * 0.5) + ')'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(z.x + Math.cos(D.a) * 900, z.y + Math.sin(D.a) * 900); ctx.stroke(); ctx.setLineDash([]); }
    if (mv === 'sweep') { ctx.fillStyle = 'rgba(255,60,60,0.1)'; ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.arc(z.x, z.y, 900, Math.min(D.a0, D.a0 + D.dir * 1.8), Math.max(D.a0, D.a0 + D.dir * 1.8)); ctx.closePath(); ctx.fill(); }
    if (mv === 'howl' || mv === 'nova' || mv === 'quake') { ctx.strokeStyle = 'rgba(255,230,200,' + (0.2 + f * 0.5) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (1.2 + f * 0.8), 0, TAU); ctx.stroke(); }
    if (mv === 'grab') drawGrabZone(D, rb.def.overlord ? 0.45 : 0.6);
  }
  if (rb.state === 'act') {
    if (mv === 'beam' || mv === 'sweep') {
      const a = D.cur == null ? D.a : D.cur, x2 = z.x + Math.cos(a) * 900, y2 = z.y + Math.sin(a) * 900, col = rb.def.forms[rb.form].col[2];
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = hexA(col, 0.35); ctx.lineWidth = 46; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = hexA(col, 0.9); ctx.lineWidth = 16; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 5; ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    if (mv === 'teleport') { ctx.strokeStyle = 'rgba(180,140,255,0.8)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(D.tx, D.ty, z.r * 1.2, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    if (mv === 'burrow' && D.stage === 1) { const f = clamp(1 - rb.t / 0.55, 0, 1); ctx.fillStyle = 'rgba(150,120,80,0.2)'; ctx.beginPath(); ctx.arc(z.x, z.y, 95, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(150,120,80,0.3)'; ctx.beginPath(); ctx.arc(z.x, z.y, Math.max(1, 95 * f), 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(200,170,120,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(z.x, z.y, 95, 0, TAU); ctx.stroke(); }
    if (mv === 'pull') { ctx.strokeStyle = hexA(rb.def.forms[rb.form].col[2], 0.35); ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(z.x, z.y, 120 + ((G.time * 260 + i * 130) % 380), 0, TAU); ctx.stroke(); } }
  }
}
function drawGrabZone(s, LOCK) {
  const f = clamp(1 - s.t / s.max, 0, 1), locked = s.t <= LOCK;
  ctx.fillStyle = 'rgba(229,72,77,' + (0.08 + f * 0.1) + ')'; ctx.beginPath(); ctx.arc(s.zx, s.zy, s.zr, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(229,72,77,0.22)'; ctx.beginPath(); ctx.arc(s.zx, s.zy, Math.max(1, s.zr * f), 0, TAU); ctx.fill();
  ctx.strokeStyle = locked ? 'rgba(255,90,80,0.95)' : 'rgba(255,90,80,0.6)'; ctx.lineWidth = locked ? 4 : 3;
  ctx.setLineDash(locked ? [] : [12, 9]); ctx.lineDashOffset = -G.time * 30; ctx.beginPath(); ctx.arc(s.zx, s.zy, s.zr, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,225,220,0.9)'; ctx.font = "bold 14px 'Share Tech Mono', monospace"; ctx.textAlign = 'center'; ctx.fillText(locked ? 'DASH OUT!' : 'GRAB', s.zx, s.zy - s.zr - 10);
}
function drawRoster(z) {
  const rb = z.rb;
  if (z.st.under) {
    ctx.fillStyle = 'rgba(70,58,44,0.9)'; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r * 1.1, z.r * 0.75, z.ang, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(30,24,18,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(z.x - z.r * 0.6, z.y); ctx.lineTo(z.x + z.r * 0.5, z.y + z.r * 0.2); ctx.stroke();
    return;
  }
  if (rb.hide && rb.alpha <= 0.02) return;
  ZB.draw(ctx, z, G.time);
  if (rb.ill) return;
  if (rb.shieldT > 0) { ctx.strokeStyle = 'rgba(110,180,255,' + (0.5 + Math.sin(G.time * 20) * 0.25) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 1.7, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(110,180,255,0.1)'; ctx.fill(); }
  if (rb.regenT > 0) { ctx.strokeStyle = 'rgba(110,230,120,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 1.5 + Math.sin(G.time * 8) * 4, 0, TAU); ctx.stroke(); }
  if (rb.state === 'stunned') { ctx.fillStyle = '#f2cc3a'; for (let i = 0; i < 3; i++) { const a = G.time * 4 + i * TAU / 3; ctx.beginPath(); ctx.arc(z.x + Math.cos(a) * z.r * 0.7, z.y - z.r * 0.9 + Math.sin(a) * z.r * 0.25, 4, 0, TAU); ctx.fill(); } }
  const ov = rb.def.overlord;
  ctx.strokeStyle = ov ? 'rgba(255,45,74,' + (0.55 + Math.sin(G.time * 6) * 0.25) + ')' : 'rgba(229,72,77,' + (0.4 + Math.sin(G.time * 4) * 0.2) + ')';
  ctx.lineWidth = ov ? 4 : 3; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 1.5, 0, TAU); ctx.stroke();
}

/* ================= the Overlord ================= */
function startOverlord() {
  const p = G.p; let pos = null;
  for (let i = 0; i < 24; i++) { const an = rand(TAU), x = p.x + Math.cos(an) * 400, y = p.y + Math.sin(an) * 400; if (!blocked(x, y, 60) && reachable(x, y)) { pos = { x: x, y: y }; break; } }
  if (!pos) pos = spawnPos();
  if (G.boss && !G.boss.dead) { const b = G.boss; burst(b.x, b.y, 40, b.m.S.gore, 260, 6, 0.8); b.dead = true; G.boss = null; }
  G.mode = 'cine'; joy.active = false; joy.id = null;
  G.cine = { t: 0, x: pos.x, y: pos.y, z: null, eaten: 0 };
  $('toasts').textContent = ''; $('banner').hidden = true;
  SFX.setBoss({ song: 'overlord', phase: 1 }); G.bossMusKey = 'O1';
}
function updCine(dt) {
  const C = G.cine, p = G.p; C.t += dt; G.time += dt;
  const k = Math.min(1, dt * 3.2);
  if (C.t < 3.9) { cam.x += (C.x - cam.x) * k; cam.y += (C.y - cam.y) * k; }
  else { cam.x += (p.x - cam.x) * k; cam.y += (p.y - cam.y) * k; }
  if (!C.z && C.t >= 0.9) {
    const z = spawnRoster(ZB.OVERLORD, false, { x: C.x, y: C.y });
    const w = G.wave || 1; z.maxHp = z.hp = 30 * 7 * (1 + 0.15 * (w - 1)) * (9 + w * 0.7) * 1.2; z.r = z.baseR = 14 * 1.75 * 1.9; applyForm(z);
    C.z = z; SFX.overlordRoar(); shakeIt(18); ring(C.x, C.y, 20, 320, 1, '255,45,74', 8); burst(C.x, C.y, 60, '#3a0d16', 340, 7, 1);
    banner('The Overlord', 'Death do us part');
  }
  const z = C.z;
  if (z) { z.rb.look = Math.atan2(p.y - z.y, p.x - z.x); z.ang = angLerp(z.ang, z.rb.look, dt * 3); }
  if (z && C.t >= 1.9 && C.t < 3.6) {
    if (!C.sucking) { C.sucking = true; SFX.absorb(1.7); }
    for (const o of G.zs) {
      if (o === z || o.dead) continue; const dx = z.x - o.x, dy = z.y - o.y, d = Math.hypot(dx, dy);
      if (d > 900) continue;
      const sp = 260 + (C.t - 1.9) * 520; o.x += dx / (d || 1) * Math.min(d, sp * dt); o.y += dy / (d || 1) * Math.min(d, sp * dt);
      if (Math.random() < 0.3) G.parts.push({ x: o.x, y: o.y, vx: dx / d * 120, vy: dy / d * 120, life: 0.4, max: 0.4, s: 3, c: '#ff2d4a' });
      if (d < z.r) { o.dead = true; C.eaten++; z.rb.absorbed++; z.maxHp += 40 + G.wave * 6; z.hp = z.maxHp; z.baseR *= 1.004; burst(z.x, z.y, 6, o.m.S.gore, 140, 4, 0.4); SFX.gulp(); }
    }
    G.zs = G.zs.filter(o => !o.dead);
  }
  if (z && C.t >= 3.6 && !C.done1) { C.done1 = true; applyForm(z); shakeIt(10); if (C.eaten) G.texts.push({ x: z.x, y: z.y - z.r - 20, t: 0, life: 1.6, s: 'ABSORBED ' + C.eaten, c: '#ff2d4a', big: true }); }
  updFx(dt);
  if (C.t >= 4.6) { G.mode = 'play'; G.cine = null; p.iframe = Math.max(p.iframe, 1.5); banner('The Overlord', 'Two health bars. It grabs twice as often.'); }
}

/* ================= A-10 Warthog airstrike ================= */
// The GAU-8 fires 30 mm high-explosive rounds: every round bursts where it lands (splash damage), punches a hole in
// the road and kicks up dust. The jets leave engine smoke and the gun leaves its own grey cloud; the BRRRT reaches
// you just after the rounds land and echoes off the buildings.
function airEvery() { return G.p && G.p.dashK === 'warthog' ? 60 : 75; }
function updAirBtn() {
  const b = $('airBtn'); if (!b) return; const n = G.air || 0;
  b.classList.toggle('ready', n > 0); b.disabled = !(n > 0 && G.mode === 'play');
  $('airN').textContent = n > 0 ? 'x' + n : 'x' + airEvery();
}
function grantAir() { G.air = Math.min(2, (G.air || 0) + 1); updAirBtn(); SFX.airReady(); toast('Chain x' + G.chain, 'A-10 Warthog ready', '#9fd36a'); }
function callAirstrike() {
  if (G.mode !== 'play' || !(G.air > 0) || G.jets.some(j => !j.mini)) return;
  G.air--; updAirBtn();
  const p = G.p; let cx = p.x + Math.cos(p.aim) * 160, cy = p.y + Math.sin(p.aim) * 160, n = 0, sx = 0, sy = 0;
  for (const z of G.zs) { if (z.dead || z.fly) continue; const d = Math.hypot(z.x - p.x, z.y - p.y); if (d < 520) { sx += z.x; sy += z.y; n++; } }
  if (n) { cx = sx / n; cy = sy / n; }
  let best = 0, bestA = p.aim;
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI, ux = Math.cos(a), uy = Math.sin(a); let c = 0;
    for (const z of G.zs) { if (z.dead) continue; const ex = z.x - cx, ey = z.y - cy; if (Math.abs(-ex * uy + ey * ux) < 70 && Math.abs(ex * ux + ey * uy) < 520) c += z.boss ? 4 : 1; }
    if (c > best) { best = c; bestA = a; }
  }
  if (Math.random() < 0.5) bestA += Math.PI;
  launchStrafe(cx, cy, bestA, {});
  SFX.radio(); SFX.a10Jet(2.8); banner('A-10 inbound', 'Danger close');
}
// a gun run along angle a through (cx, cy): three jets, or one for the Warthog Run dash
function launchStrafe(cx, cy, a, o) {
  const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux, mini = !!o.mini;
  const form = mini ? [[0, 0]] : [[0, 0], [-80, -70], [-80, 70]];
  form.forEach((f, i) => G.jets.push({ x: cx - ux * (1000 - f[0]) + vx * f[1], y: cy - uy * (1000 - f[0]) + vy * f[1], ux: ux, uy: uy, t: 0, fireT: 0, smT: 0, rounds: 0,
    tx: cx + vx * f[1] * 0.5, ty: cy + vy * f[1] * 0.5, firing: false, shot: false, k: i, mini: mini, len: mini ? 380 : 840, dmgMul: mini ? 0.6 : 1, tr: [] }));
  if (mini) SFX.a10Jet(2.2, true);
}
function puff(x, y, r0, r1, life, c, vx, vy) { if (!G.smoke) G.smoke = []; if (G.smoke.length > 520) G.smoke.splice(0, 40); G.smoke.push({ x: x, y: y, r0: r0, r1: r1, t: 0, life: life, c: c, vx: vx || 0, vy: vy || 0 }); }
function hole(x, y, r) { if (!G.holes) G.holes = []; if (G.holes.length > (Q.lod >= 2 ? 180 : 340)) G.holes.shift(); G.holes.push({ x: x, y: y, r: r, rot: rand(TAU), t: 0, hot: 1 }); }
function updJets(dt) {
  if (!G.jets.length) return;
  const dmg = 70 + G.wave * 9, sm = Q.burst;
  for (const j of G.jets) {
    j.t += dt; j.x += j.ux * 980 * dt; j.y += j.uy * 980 * dt;
    const along = (j.x - j.tx) * j.ux + (j.y - j.ty) * j.uy, px = -j.uy, py = j.ux;
    // engine smoke from both pods, drifting and spreading behind the jet
    j.smT -= dt * sm;
    while (j.smT <= 0) { j.smT += 0.03; for (const s of [-1, 1]) puff(j.x - j.ux * 26 + px * 9 * s, j.y - j.uy * 26 + py * 9 * s, 3, 16, 1.5, '200,204,210', -j.ux * 60, -j.uy * 60); }
    j.firing = along > -j.len + 120 && along < 120;
    if (j.firing) {
      if (!j.shot) {
        j.shot = true;
        if (j.k === 0) { SFX.a10Brrt(0.3, j.mini ? 0.45 : 1.05, j.mini); shakeIt(j.mini ? 6 : 10); G.flashA = j.mini ? 0.2 : 0.45; if (!j.mini) SFX.fm.duck(2.4); }
      }
      j.fireT -= dt;
      while (j.fireT <= 0) {
        j.fireT += 0.016; j.rounds++;
        const ix = j.x + j.ux * 260 + px * rand(-24, 24) + j.ux * rand(-16, 16), iy = j.y + j.uy * 260 + py * rand(-24, 24) + j.uy * rand(-16, 16);
        // every round is high explosive: a small burst with splash damage, stronger in the middle
        const R = 34, big = j.rounds % 6 === 0;
        near(ix, iy, R + 50, o => {
          if (o.dead) return; const d = Math.hypot(o.x - ix, o.y - iy); if (d > (big ? 56 : R) + o.r) return;
          const f = 1 - Math.min(1, d / (R + o.r)) * 0.5;
          hurtZombie(o, dmg * j.dmgMul * f * (o.boss ? 0.35 : 1) * (big ? 1.4 : 1), { src: 'a10', kx: j.ux * 70 + (o.x - ix) / (d || 1) * 120, ky: j.uy * 70 + (o.y - iy) / (d || 1) * 120 });
        });
        burst(ix, iy, 2, Math.random() < 0.5 ? '#c9b48a' : '#ffd27a', 140, 3, 0.35);
        burst(ix, iy, 1, '#fff2c0', 220, 2, 0.2);
        if (big) { burst(ix, iy, 9, '#ff8a2a', 200, 5, 0.45); burst(ix, iy, 5, '#3a2e24', 120, 7, 0.8); G.rings.push({ x: ix, y: iy, r0: 4, r1: 52, t: 0, life: 0.3, c: '255,170,80', w: 3 }); puff(ix, iy, 6, 30, 1.6, '70,62,56', rand(-20, 20), rand(-20, 20)); if (Math.random() < 0.5) SFX.impacts(); }
        else if (Math.random() < 0.3) puff(ix, iy, 4, 18, 1.1, '150,136,112', rand(-15, 15), rand(-15, 15));
        hole(ix + rand(-4, 4), iy + rand(-4, 4), rand(3, 5.4) * (big ? 1.5 : 1));
        if (Math.random() < 0.12 && G.splats.length < 150) splat(ix, iy, rand(6, 10), '#221e1a');
        j.tr.push({ x: ix, y: iy, t: 0 }); if (j.tr.length > 8) j.tr.shift();
        j.lix = ix; j.liy = iy;
      }
      // the gun's own smoke cloud, left in the air under the nose
      if (Math.random() < 0.7 * sm) puff(j.x + j.ux * 46, j.y + j.uy * 46, 5, 30, 2.2, '120,124,130', j.ux * 40, j.uy * 40);
      if (Math.random() < 0.35) shakeIt(j.mini ? 3 : 5);
    }
    for (const t of j.tr) t.t += dt;
    if (j.t > 2.8) j.dead = true;
  }
  G.jets = G.jets.filter(j => !j.dead);
}
// smoke, bullet holes and the impact flash keep going after the jets have gone
function updAirFx(dt) {
  if (G.smoke && G.smoke.length) { for (const s of G.smoke) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.97; s.vy *= 0.97; } G.smoke = G.smoke.filter(s => s.t < s.life); }
  if (G.holes && G.holes.length) { for (const h of G.holes) { h.t += dt; if (h.hot > 0) h.hot -= dt * 0.6; } if (G.holes[0].t > 28) G.holes = G.holes.filter(h => h.t < 28); }
  if (G.flashA > 0) G.flashA -= dt * 1.4;
}
function drawHoles(vis) {
  const H = G.holes; if (!H || !H.length) return;
  ctx.fillStyle = 'rgba(14,12,10,0.85)';
  for (const h of H) { if (!vis(h.x, h.y, 10)) continue; ctx.globalAlpha = Math.min(1, (28 - h.t) / 6); ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.8, h.rot, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = 'rgba(120,108,92,0.55)'; ctx.lineWidth = 1.2;
  for (const h of H) { if (!vis(h.x, h.y, 10)) continue; ctx.globalAlpha = Math.min(1, (28 - h.t) / 6); ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r * 1.5, h.r * 1.25, h.rot, 0, TAU); ctx.stroke(); }
  ctx.globalCompositeOperation = 'lighter';
  for (const h of H) { if (h.hot <= 0 || !vis(h.x, h.y, 10)) continue; ctx.globalAlpha = h.hot * 0.8; ctx.fillStyle = h.hot > 0.6 ? '#ffd27a' : '#ff6a2a'; ctx.beginPath(); ctx.arc(h.x, h.y, h.r * 0.6, 0, TAU); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
function drawSmoke(vis) {
  const S = G.smoke; if (!S || !S.length) return;
  for (const s of S) { const f = s.t / s.life, r = s.r0 + (s.r1 - s.r0) * Math.sqrt(f); if (!vis(s.x, s.y, r)) continue; ctx.fillStyle = 'rgba(' + s.c + ',' + (0.32 * (1 - f) * Math.min(1, s.t * 8)) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, TAU); ctx.fill(); }
}
function drawJets() {
  for (const j of G.jets) {
    const a = Math.atan2(j.uy, j.ux);
    ctx.save(); ctx.translate(j.x + 50, j.y + 80); ctx.rotate(a); ctx.globalAlpha = 0.35; drawA10(true); ctx.restore();
    if (j.firing && j.lix != null) {
      // tracers from the gun to where the rounds are landing
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (const t of j.tr) { const al = Math.max(0, 1 - t.t / 0.12); if (al <= 0) continue; ctx.strokeStyle = 'rgba(255,214,120,' + 0.75 * al + ')'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(j.x + j.ux * 48, j.y + j.uy * 48); ctx.lineTo(t.x, t.y); ctx.stroke(); ctx.strokeStyle = 'rgba(255,250,220,' + 0.9 * al + ')'; ctx.lineWidth = 1; ctx.stroke(); }
      const g = ctx.createRadialGradient(j.lix, j.liy, 2, j.lix, j.liy, 46); g.addColorStop(0, 'rgba(255,200,110,0.55)'); g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(j.lix, j.liy, 46, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.save(); ctx.translate(j.x, j.y); ctx.rotate(a); ctx.globalAlpha = 1;
    // engine glow
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,170,90,0.5)'; ctx.beginPath(); ctx.arc(-28, -9, 4, 0, TAU); ctx.arc(-28, 9, 4, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    drawA10(false);
    if (j.firing) { ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.moveTo(46, 0); ctx.lineTo(64, -7); ctx.lineTo(74, 0); ctx.lineTo(64, 7); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(50, 0, 3, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
// top-down A-10: long nose, straight wings, two engine pods on the rear fuselage, twin tails
function drawA10(shadow) {
  const body = shadow ? '#000' : '#7d8790', dark = shadow ? '#000' : '#545c64', light = shadow ? '#000' : '#a7b0b8';
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.moveTo(-8, -48); ctx.lineTo(4, -48); ctx.lineTo(8, -6); ctx.lineTo(8, 6); ctx.lineTo(4, 48); ctx.lineTo(-8, 48); ctx.lineTo(-4, 6); ctx.lineTo(-4, -6); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(46, 0); ctx.quadraticCurveTo(40, -6, 20, -6); ctx.lineTo(-36, -5); ctx.lineTo(-40, 0); ctx.lineTo(-36, 5); ctx.lineTo(20, 6); ctx.quadraticCurveTo(40, 6, 46, 0); ctx.fill();
  ctx.fillStyle = dark; ctx.fillRect(-26, -13, 16, 8); ctx.fillRect(-26, 5, 16, 8);
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-34, -20); ctx.lineTo(-42, -20); ctx.lineTo(-42, 20); ctx.lineTo(-34, 20); ctx.closePath(); ctx.fill();
  ctx.fillStyle = dark; ctx.fillRect(-44, -22, 9, 4); ctx.fillRect(-44, 18, 9, 4);
  if (!shadow) { ctx.fillStyle = '#2b333a'; ctx.beginPath(); ctx.ellipse(26, 0, 7, 3.4, 0, 0, TAU); ctx.fill(); ctx.fillStyle = light; ctx.fillRect(-2, -40, 3, 80); ctx.fillStyle = '#3b4249'; ctx.fillRect(44, -1, 6, 2); }
}

/* ================= boss log ================= */
function openBossLog() { $('bosslog').hidden = false; $('bosslog').scrollTop = 0; renderBossLog(); }
function closeBossLog() { $('blDetail').hidden = true; $('bosslog').hidden = true; refreshTitle(); }
function renderBossLog() {
  $('blCount').textContent = bossSeen.size + ' / ' + ZB.ROSTER.length;
  const grid = $('blGrid'); grid.textContent = '';
  const list = ZB.ROSTER.concat([ZB.OVERLORD]);
  for (const d of list) {
    const seen = d.overlord ? store.get('zc_overlord', 0) > 0 : bossSeen.has(d.id), b = document.createElement('button');
    b.type = 'button'; b.className = 'wcard bcard' + (seen ? ' known' : ' unknown'); b.style.setProperty('--rc', d.overlord ? '#ff2d4a' : ['#9aa1a8', '#5aa9e6', '#b57bff', '#f2cc3a', '#ff7a2b', '#ff2d4a'][Math.min(5, d.tier)]);
    const c = document.createElement('canvas'); c.width = c.height = 96; c.style.width = c.style.height = '96px';
    ZB.portrait(c.getContext('2d'), d, 0, 96, !seen);
    const num = document.createElement('span'); num.className = 'num'; num.textContent = d.overlord ? '???' : '#' + String(d.id).padStart(2, '0');
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = seen ? d.name : '???';
    const rr = document.createElement('span'); rr.className = 'rar'; rr.textContent = d.overlord ? 'Wheel only' : 'Tier ' + d.tier + (bossKilled.has(d.id) ? ' · slain' : '');
    b.append(num, c, nm, rr); b.addEventListener('click', () => openBossDetail(d, seen)); grid.appendChild(b);
  }
}
function openBossDetail(d, seen) {
  const el = $('blDetail'); el.hidden = false; el.style.setProperty('--rc', d.overlord ? '#ff2d4a' : d.forms[0].col[2]);
  $('blName').textContent = seen ? d.name : 'Unknown boss';
  $('blTag').textContent = seen ? (d.overlord ? 'Summoned by the skull wheel' : 'Tier ' + d.tier + ' · ' + d.el + ' · ' + d.title) : 'Survive more waves to meet it';
  const forms = $('blForms'); forms.textContent = '';
  d.forms.forEach((f, i) => {
    const row = document.createElement('div'); row.className = 'bl-form';
    const c = document.createElement('canvas'); c.width = c.height = 110; c.style.width = c.style.height = '110px'; ZB.portrait(c.getContext('2d'), d, i, 110, !seen);
    const t = document.createElement('div'); const h = document.createElement('b'); h.textContent = (i ? 'Mutates into ' : 'Form 1 · ') + (seen ? f.name : '???');
    const pr = document.createElement('p'); pr.textContent = seen ? 'Attacks: ' + f.moves.concat(f.trail ? ['burning trail'] : []).join(', ') : '';
    t.append(h, pr); row.append(c, t); forms.appendChild(row);
  });
}
