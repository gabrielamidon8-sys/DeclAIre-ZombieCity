/* ================= BLADE: the combat knife, its chain kills and its ten combos (1.9.994) =================
   V (the right bumper on a controller, the knife button on a phone) puts the knife in the Operator's left hand and his
   sidearm in his right (a long gun goes to the sling for the length of the chain and comes back after it). He lunges to
   the nearest of the dead in front of him and sticks it. While the chain is open (a breath after each strike) another
   V lunges to the next one, further away, quickly; a shot (fire) puts a round into the one in front of him point blank.
   That is the rhythm: knife, knife, shot, knife, knife, shot... until the sidearm runs dry, and then the shot becomes a
   pistol whip. Ten combos, each its own move and its own death for the zombie (ANIMA's ten melee deaths):
     1 Stick (K)            the knife into the gut; it folds over it and goes down on its face
     2 Two-Step (K K)       the second one high, at the neck; its hands go up to it, its knees go
     3 Knife, Knife, Shot   a round point blank into the head: it snaps back and is thrown down
     4 Throat Line (..S K)  a cut across the throat: it spins half round and drops
     5 Hammer Down (..K K)  the overhand stab at the collar: straight down onto its knees, then its face
     6 Second Pair (..S)    two rounds into the chest, point blank: it is thrown flat
     7 Pistol Whip (dry S)  the frame of the empty pistol to the temple: its head whips round, it goes over sideways
     8 Whip and Stick (W K) the knife up under the jaw: up on its toes, then down
     9 Lunge                a long dash into a thrust: it is driven back off its feet
    10 Reaper (K K K, three different dead) a spinning backhand cut that takes everything within reach
   Knife kills are silent (no horde hears them); heavy dead (the big ones and the bosses) take a deep wound and stagger
   instead. In co-op the strike's damage and the death it chose travel to the host with the hit (src "k" + the clip). */
const BLADE = { ver: 1, strikes: 0, kills: 0, chains: 0, best: 0, whiffs: 0, combos: {}, found: new Set(store.get('zc_bladeFound', [])), fx: [], offUntil: 0, errT: [], testing: false, popT: 0 };
// the moves: duration (s), when the blow lands (fraction), the zombie's death (ANIMA melee deaths 50..59), the combo
const BLADE_MOVES = {
  stab: { dur: 0.36, hit: 0.4, ci: 50, combo: 0, snd: 'stab', sw: 0.3, reach: 0.62 },
  neck: { dur: 0.34, hit: 0.42, ci: 51, combo: 1, snd: 'stab', sw: 0.4, reach: 0.62 },
  pb: { dur: 0.3, hit: 0.2, ci: 52, combo: 2, shot: 1, reach: 2.6 },
  slash: { dur: 0.4, hit: 0.45, ci: 53, combo: 3, snd: 'hit', sw: 0.5, reach: 0.72, arc: 1 },
  hammer: { dur: 0.42, hit: 0.5, ci: 54, combo: 4, snd: 'stab', sw: 0.35, reach: 0.62 },
  pair: { dur: 0.36, hit: 0.18, ci: 55, combo: 5, shot: 2, reach: 2.6 },
  whip: { dur: 0.38, hit: 0.42, ci: 56, combo: 6, snd: 'hit', sw: 0.5, reach: 0.7, whip: 1 },
  jaw: { dur: 0.4, hit: 0.45, ci: 57, combo: 7, snd: 'stab', sw: 0.3, reach: 0.62 },
  lunge: { dur: 0.44, hit: 0.55, ci: 58, combo: 8, snd: 'stab', sw: 0.45, reach: 0.66 },
  reaper: { dur: 0.52, hit: 0.48, ci: 59, combo: 9, snd: 'hit', sw: 0.7, reach: 1.25, arc: 2 }
};
const BLADE_MV = Object.keys(BLADE_MOVES);   // (their order is what co-op sends)
const BLADE_COMBOS = [
  { id: 'stick', name: 'Stick', seq: 'K', what: 'The knife into the gut.' },
  { id: 'two', name: 'Two-Step', seq: 'K · K', what: 'A second strike, high, at the neck.' },
  { id: 'kks', name: 'Knife, Knife, Shot', seq: 'K · K · S', what: 'Two with the knife, then a round point blank.' },
  { id: 'throat', name: 'Throat Line', seq: 'K · K · S · K', what: 'After the shot, a cut across the throat.' },
  { id: 'hammer', name: 'Hammer Down', seq: 'K · K · S · K · K', what: 'The overhand stab at the collar.' },
  { id: 'pair', name: 'Second Pair', seq: 'K · K · S · K · K · S', what: 'Two rounds point blank into the chest.' },
  { id: 'whip', name: 'Pistol Whip', seq: 'S (empty)', what: 'Out of rounds: the frame of the pistol to the temple.' },
  { id: 'wk', name: 'Whip and Stick', seq: 'W · K', what: 'After the whip, the knife up under the jaw.' },
  { id: 'lunge', name: 'Lunge', seq: 'K (far)', what: 'A long dash into a thrust.' },
  { id: 'reaper', name: 'Reaper', seq: 'K · K · K (three dead)', what: 'A spinning backhand cut that takes everything in reach.' }
];
const BLADE_WIN = 0.78;   // how long the chain stays open after a strike (s)
function bladeUp() { return !(BLADE.offUntil && performance.now() < BLADE.offUntil); }
function bladeU() { return typeof physU === 'function' ? physU() : 32; }
// the one to strike: the nearest of the dead within range, in front of him (a little behind counts when it is close)
function bladePick(p, range, not) {
  const u = bladeU(), R = range * u; let best = null, bs = 1e9;
  for (const z of G.zs) {   // (all of them: a press is rare, and the crowd grid can be a frame behind)
    if (z.dead || z.illusion || z.fly || (z.st && (z.st.under || z.st.down)) || (not && not.indexOf(z) >= 0)) continue;
    const dx = z.x - p.x, dy = z.y - p.y, d = Math.hypot(dx, dy) - (z.r || 10); if (d > R) continue;
    const off = Math.abs(angD(Math.atan2(dy, dx), p.aim)), close = d < 1.3 * u;
    if (!close && off > 1.15) continue;   // (right on top of him: any direction, he turns to it)
    const s = d + off * 0.7 * u; if (s < bs) { bs = s; best = z; }
  }
  return best;
}
function bladeHeavy(z) { return !!(z.boss || (z.m && z.m.def && z.m.def.t >= 7)); }
// V: the knife
function bladeStart(p) {
  if (!p || !p.arm || G.mode !== 'play' || !bladeUp() || G.grab || p.down || p.frozenT > 0) return false;
  const a = p.arm, kn = p.kn || (p.kn = { seq: '', win: 0, mv: '', t: 0, dur: 0, tgt: null, hitDone: true, buf: '', tg: [], prevSlot: -1, lunge: null, n: 0 });
  if (a.st === 'dodge') return false;   // (a swap in progress is cut short: the knife is quicker than any gun)
  if (a.st === 'knife' && kn.t < kn.dur * 0.62) { kn.buf = 'K'; return true; }   // (pressed during a strike: it comes next)
  return bladeStrike(p, 'K');
}
// fire during the chain: the shot (or, dry, the whip). auto: the aim-assist's own fire (only after two with the knife)
function bladeShot(p, target, auto) {
  const a = p.arm, kn = p.kn; if (!a || !kn || a.st !== 'knife') return false;
  const fresh = G.time - (kn.fireT == null ? -9 : kn.fireT) > 0.12; kn.fireT = G.time;   // (fire held through the chain is one press, not a stream)
  if (!fresh) return false;
  if (auto && !/KK$/.test(kn.seq)) return false;
  if (kn.t < kn.dur * 0.62) { if (!auto) kn.buf = 'S'; return true; }
  return bladeStrike(p, 'S', target);
}
// a strike: which move (from the chain so far), the one it is for, the lunge to it
function bladeStrike(p, inp, hint) {
  const a = p.arm, kn = p.kn, u = bladeU(), open = a.st === 'knife' && (kn.win > 0 || kn.t >= kn.dur * 0.62);
  if (!open) { kn.seq = ''; kn.tg = []; kn.n = 0; kn.lastMv = ''; if (a.st === 'reload' && p.weapon.arms.reload.kind !== 'tube') a.rEv = 0; }
  // the sidearm comes out (the long gun to the sling until the chain ends)
  if (!open) { kn.prevSlot = a.slot; if (a.slot !== 1) { a.slot = 1; p.weapon = a.w[1]; recalc(p); if (typeof updWeaponChip === 'function') updWeaponChip(); bladeSnd('draw'); } bladeSnd('knifeOut', 1.1); }
  let mv, z;
  if (inp === 'S') {
    z = hint && !hint.dead && Math.hypot(hint.x - p.x, hint.y - p.y) - hint.r < 2.6 * u ? hint : (kn.tgt && !kn.tgt.dead && Math.hypot(kn.tgt.x - p.x, kn.tgt.y - p.y) - kn.tgt.r < 2.6 * u ? kn.tgt : bladePick(p, 2.6));
    const dry = a.mag[a.slot] <= 0;
    if (dry) { mv = 'whip'; if (!z || Math.hypot(z.x - p.x, z.y - p.y) - z.r > 1.6 * u) z = bladePick(p, 1.6); }
    else mv = /KKSKK$/.test(kn.seq) ? 'pair' : 'pb';
  } else {
    // the next one: further while the chain is open, and not the one just killed
    z = bladePick(p, open ? 4.6 : 2.8);
    const d = z ? Math.hypot(z.x - p.x, z.y - p.y) - z.r - p.r : 0;
    const sinceS = kn.seq.lastIndexOf('S') >= 0 ? kn.seq.length - 1 - kn.seq.lastIndexOf('S') : -1, ks = /K*$/.exec(kn.seq)[0].length;
    const three = ks >= 2 && z && kn.tg.length >= 2 && kn.tg.slice(-2).every(q => q !== z) && kn.tg[kn.tg.length - 1] !== kn.tg[kn.tg.length - 2];
    if (kn.lastMv === 'whip') mv = 'jaw';
    else if (three) mv = 'reaper';
    else if (z && d > 2.0 * u) mv = 'lunge';
    else if (sinceS === 0) mv = 'slash';
    else if (sinceS === 1) mv = 'hammer';
    else mv = ks % 2 === 0 ? 'stab' : 'neck';
  }
  const M = BLADE_MOVES[mv];
  kn.seq = (kn.seq + (mv === 'whip' ? 'W' : inp)).slice(-12); kn.mv = mv; kn.lastMv = mv; kn.t = 0; kn.dur = M.dur; kn.tgt = z || null; kn.hitDone = false; kn.buf = ''; kn.win = 0; kn.n++;
  if (z) kn.tg.push(z); if (kn.tg.length > 6) kn.tg.shift();
  // to the target: a lunge when it is out of reach (the dodge's speed, untouchable on the way)
  kn.lunge = null;
  if (z) {
    const dx = z.x - p.x, dy = z.y - p.y, d = Math.hypot(dx, dy), want = z.r + p.r + (M.shot ? 0.45 : 0.32) * u;
    p.aim = Math.atan2(dy, dx);
    if (d > want + 0.08 * u && !M.shot) { const ld = clamp((d - want) / (16 * u), 0.07, 0.2); kn.lunge = { x0: p.x, y0: p.y, x1: z.x - dx / d * want, y1: z.y - dy / d * want, t: 0, d: ld }; kn.dur = Math.max(M.dur, ld / M.hit + 0.08); p.iframe = Math.max(p.iframe || 0, ld + 0.08); }
  }
  armsSet(p, 'knife', kn.dur); a.km = mv; armsEngage(p);
  if (M.sw) bladeSnd('swish', 1.25 - M.sw * 0.4);
  BLADE.strikes++;
  coreEmit('blade', { mv: mv, seq: kn.seq });
  return true;
}
// every frame while the knife is out (from armsTick)
function bladeTick(p, dt) {
  const a = p.arm, kn = p.kn; if (!kn) { armsSet(p, 'relaxed'); return; }
  const t0 = performance.now(); try { bladeTick1(p, a, kn, dt); } finally { coreCost('BLADE', performance.now() - t0 + 0.001); }   // (its heartbeat)
}
function bladeTick1(p, a, kn, dt) {
  kn.t += dt;
  if (kn.lunge) { const L = kn.lunge; L.t += dt; const k = clamp(L.t / L.d, 0, 1), e = 1 - (1 - k) * (1 - k); p.x = L.x0 + (L.x1 - L.x0) * e; p.y = L.y0 + (L.y1 - L.y0) * e; p.vx = p.vy = 0; if (k >= 1) kn.lunge = null; }
  if (kn.tgt && !kn.tgt.dead && !kn.lunge) p.aim += angD(Math.atan2(kn.tgt.y - p.y, kn.tgt.x - p.x), p.aim) * Math.min(1, dt * 18);
  const M = BLADE_MOVES[kn.mv] || BLADE_MOVES.stab;
  if (!kn.hitDone && kn.t >= kn.dur * M.hit && !kn.lunge) { kn.hitDone = true; bladeLand(p, kn, M); }
  a.t = kn.t; a.dur = kn.dur;
  if (kn.t >= kn.dur) {
    if (kn.win <= 0 && kn.t - kn.dur < dt * 1.5) kn.win = BLADE_WIN;
    // the buffered press, at once
    if (kn.buf) { const b = kn.buf; kn.buf = ''; kn.win = BLADE_WIN; if (b === 'K') bladeStrike(p, 'K'); else bladeStrike(p, 'S'); return; }
    kn.win -= dt;
    if (kn.win <= 0) bladeEnd(p);
  }
}
// the chain ends: the knife away, the gun he had comes back
function bladeEnd(p) {
  const a = p.arm, kn = p.kn; if (!a) return;
  if (kn) { if (kn.n > BLADE.best) BLADE.best = kn.n; if (kn.n >= 2) BLADE.chains++; kn.win = 0; kn.seq = ''; kn.tg = []; }
  bladeSnd('sheathIn', 1.15);
  if (kn && kn.prevSlot === 0 && a.slot !== 0) { a.slot = 0; p.weapon = a.w[0]; recalc(p); if (typeof updWeaponChip === 'function') updWeaponChip(); armsSet(p, 'swapIn', p.weapon.arms.draw * 0.8); a.swSeq++; armsSnd('draw', 0.95); }
  else armsSet(p, a.eng < 1 ? 'ready' : 'relaxed');
  a.km = '';
}
// the blow lands: the damage, the death it chose, the blood, the sound, the jolt
function bladeLand(p, kn, M) {
  const u = bladeU(), mv = kn.mv;
  let hits = [];
  const z0 = kn.tgt;
  if (z0 && !z0.dead && Math.hypot(z0.x - p.x, z0.y - p.y) - z0.r - p.r < (M.reach + 0.35) * u) hits.push(z0);
  if (M.arc) for (const z of G.zs) { if (z === z0 || z.dead || z.illusion || z.fly || (z.st && (z.st.under || z.st.down))) continue; const d = Math.hypot(z.x - p.x, z.y - p.y) - z.r - p.r, off = Math.abs(angD(Math.atan2(z.y - p.y, z.x - p.x), p.aim)); if (d < M.reach * u && (M.arc === 2 || off < 1.2)) hits.push(z); }
  if (M.shot) {
    // point blank: the sidearm's own shot (flash, sound, brass, co-op) and the round where it was put
    const a = p.arm, z = hits[0] || (kn.tgt && !kn.tgt.dead ? kn.tgt : null);
    for (let i = 0; i < M.shot; i++) {
      if (a.mag[a.slot] <= 0) break;
      if (z && !z.dead) { p.aim = Math.atan2(z.y - p.y, z.x - p.x); bladeHurt(p, z, mv, i === M.shot - 1 || !bladeHeavy(z), M.shot === 2 ? 'torso' : 'head'); }
      try { fireWeapon(z && !z.dead ? z : null, p.aim); } catch (e) { }
      a.mag[a.slot]--; a.kick = 1; a.kickN++; a.camK = Math.min(1.6, a.camK + (p.weapon.arms.cam || 0.4));
      if (a.mag[a.slot] <= 0) { a.emptyT = -1; armsSnd('empty', 1.1, 0, 0.5); }
    }
    bladeCombo(p, kn, M, z ? 1 : 0);
    return;
  }
  if (!hits.length) { BLADE.whiffs++; return; }
  for (const z of hits) bladeHurt(p, z, mv, true, mv === 'neck' || mv === 'jaw' || mv === 'slash' || mv === 'whip' ? 'head' : 'torso');
  bladeSnd(M.snd || 'stab', 0.95 + Math.random() * 0.12);
  if (M.whip) armsSnd('slideRack', 0.7, 0, 0.3);
  bladeCombo(p, kn, M, hits.length);
}
function bladeHurt(p, z, mv, lethal, reg) {
  const M = BLADE_MOVES[mv], heavy = bladeHeavy(z), u = bladeU(), ang = Math.atan2(z.y - p.y, z.x - p.x), kb = (mv === 'lunge' ? 260 : mv === 'whip' ? 200 : mv === 'pair' || mv === 'pb' ? 160 : 90) * (heavy ? 0.3 : 1);
  // a heavy one: a deep wound (a third of it with the blade), finished only once it is down to its last third
  const dmg = heavy ? (z.hp > z.maxHp * 0.36 ? Math.min(z.hp - 1, z.maxHp * (M.shot ? 0.2 : 0.34)) : z.hp + 999) : z.hp + z.maxHp + 999;
  if (heavy) { z.stun = Math.max(z.stun || 0, mv === 'whip' ? 0.9 : 0.45); }
  const kill = !heavy || z.hp <= dmg;
  const o = { src: 'k' + M.ci, crit: true, kx: Math.cos(ang) * kb, ky: Math.sin(ang) * kb, reg: reg, P: heavy ? 1.6 : 1.2, kill: kill && lethal };
  z.meleeCi = M.ci;
  try { if (typeof goreHit === 'function') goreHit(z, Math.cos(ang) * 400, Math.sin(ang) * 400, Math.min(dmg, 200), null); } catch (e) { }
  burst(z.x - Math.cos(ang) * z.r * 0.3, z.y - Math.sin(ang) * z.r * 0.3, M.shot ? 6 : 9, '#8e1218', 120, 3, 0.45);
  hurtZombie(z, dmg, o);
  if (z.dead || o.kill) BLADE.kills++;
}
// the combo it was: the banner, the count, the first time, the jolt and the slow beat on the big ones
function bladeCombo(p, kn, M, n) {
  if (!n) return;
  const C = BLADE_COMBOS[M.combo]; if (!C) return;
  const ks = kn.seq.replace(/W/g, 'S'), real = M.combo === 2 ? /KKS$/.test(kn.seq) : M.combo === 3 ? /KKSK$/.test(kn.seq) : M.combo === 4 ? /KKSKK$/.test(kn.seq) : M.combo === 5 ? /KKSKKS$/.test(kn.seq) : true;
  const name = real ? C.name : M.shot ? 'Point Blank' : 'Knife';
  if (real) { BLADE.combos[C.id] = (BLADE.combos[C.id] || 0) + 1; if (!BLADE.found.has(C.id)) { BLADE.found.add(C.id); store.set('zc_bladeFound', [...BLADE.found]); try { toast('New knife combo', C.name + ' · ' + BLADE.found.size + ' of 10', '#e8dcc0'); } catch (e) { } } }
  bladePop(name, kn.seq.split('').map(c => c === 'K' ? 'Knife' : c === 'S' ? 'Shot' : 'Whip').slice(-6).join(' · '), kn.n);
  const big = real && M.combo >= 2;
  shakeIt(M.shot ? 5 : big ? 5 : 3); if (typeof buzz === 'function') buzz(big ? 30 : 16);
  if (!RM && !BLADE.testing) G.slowT = Math.max(G.slowT || 0, M.combo === 9 ? 0.2 : big ? 0.1 : 0.04);   // (the hit stop, and a slow beat on the big ones)
  BLADE.fx.push({ x: p.x, y: p.y, a: p.aim, t: G.time, mv: kn.mv, r: (M.reach + 0.5) * bladeU() });
  if (BLADE.fx.length > 12) BLADE.fx.shift();
}
function bladePop(name, seq, n) {
  let el2 = $('bladePop');
  if (!el2) { el2 = document.createElement('div'); el2.id = 'bladePop'; el2.setAttribute('aria-live', 'polite'); el2.innerHTML = '<b></b><span></span><em></em>'; const host = $('chainPop') ? $('chainPop').parentNode : document.body; host.appendChild(el2); }
  el2.querySelector('b').textContent = name; el2.querySelector('span').textContent = seq; el2.querySelector('em').textContent = n > 1 ? '×' + n : '';
  el2.hidden = false; el2.classList.remove('in'); void el2.offsetWidth; el2.classList.add('in');
  clearTimeout(BLADE.popT); BLADE.popT = setTimeout(() => { el2.hidden = true; }, 1400);
}
function bladeSnd(n, rate) { if (BLADE.testing) return; try { if (n === 'draw' || n === 'holster') { if (SFX.arms) SFX.arms(n, rate || 1); } else if (SFX.cine) SFX.cine(n, rate || 1, 'o'); } catch (e) { } }
// the cut in the air: a pale arc where the blade went (drawn in the world, under the HUD)
function bladeDraw(ctx2) {
  if (!BLADE.fx.length) return;
  const now = G.time;
  for (let i = BLADE.fx.length - 1; i >= 0; i--) {
    const f = BLADE.fx[i], k = (now - f.t) / 0.22; if (k > 1 || k < 0) { if (k > 1) BLADE.fx.splice(i, 1); continue; }
    const spread = f.mv === 'reaper' ? Math.PI * 1.9 : f.mv === 'slash' ? 1.6 : f.mv === 'whip' ? 1.1 : 0.7, a0 = f.a - spread / 2 + (f.mv === 'reaper' ? k * Math.PI : 0);
    ctx2.save(); ctx2.globalCompositeOperation = 'lighter';
    ctx2.strokeStyle = 'rgba(235,240,255,' + (0.55 * (1 - k)).toFixed(3) + ')'; ctx2.lineWidth = 3 + 5 * (1 - k); ctx2.lineCap = 'round';
    ctx2.beginPath(); ctx2.arc(f.x, f.y, f.r * (0.75 + 0.25 * k), a0, a0 + spread * Math.min(1, k * 2.2)); ctx2.stroke();
    ctx2.strokeStyle = 'rgba(255,90,80,' + (0.35 * (1 - k)).toFixed(3) + ')'; ctx2.lineWidth = 1.5; ctx2.beginPath(); ctx2.arc(f.x, f.y, f.r * (0.7 + 0.25 * k), a0, a0 + spread * Math.min(1, k * 2.2)); ctx2.stroke();
    ctx2.restore();
  }
}
// a phone: the knife button
(() => { const b = $('knifeBtn'); if (b) b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (G.mode === 'play' && G.p && G.p.arm) bladeStart(G.p); }); })();

/* ---------- BLADE in the ecosystem ---------- */
function bladeSelfTest() {
  let n = 0, pass = 0, why = '';
  try {
    n++; if (BLADE_MV.length === 10 && BLADE_COMBOS.length === 10 && BLADE_MV.every(k => BLADE_MOVES[k].ci >= 50 && BLADE_MOVES[k].ci < 60)) pass++; else why = 'not ten moves and ten combos';
    n++; if (typeof AC !== 'undefined' && AC_N >= 60 && AC_KIND[50] === 'death' && AC_KIND[59] === 'death') pass++; else why = why || 'ANIMA has no melee deaths';
    n++; if (ARMS_ST.indexOf('knife') >= 0) pass++; else why = why || 'ARMS has no knife state';
    // the chain's moves, on a dummy: K, K, S, K, K, S, then dry S (the whip), then K (the jaw)
    const q = { x: 0, y: 0, aim: 0, r: 10, S: { rof: 10, dmg: 10 }, iframe: 0, fireCd: 0 }; armsNew(q, { p: 'm4a1', s: 'm17' });
    const kn = q.kn = { seq: '', win: 0, mv: '', t: 0, dur: 0, tgt: null, hitDone: true, buf: '', tg: [], prevSlot: 0, lunge: null, n: 0 };
    BLADE.testing = true; const got = [];
    const step = (inp) => { q.arm.st = 'knife'; kn.win = 1; bladeStrikeDry(q, inp); got.push(kn.mv); };
    q.arm.slot = 1; q.arm.mag[1] = 2;
    for (const i of ['K', 'K', 'S', 'K', 'K', 'S']) step(i);
    q.arm.mag[1] = 0; step('S'); step('K');
    const want = ['stab', 'neck', 'pb', 'slash', 'hammer', 'pair', 'whip', 'jaw'];
    n++; if (got.join() === want.join()) pass++; else why = why || 'the combo order came out ' + got.join(' ');
  } catch (e) { why = String(e && e.message || e); }
  BLADE.testing = false;
  return { ok: pass === n, n: n, pass: pass, why: why };
}
// the move a press makes, without a target or a lunge (the self-test's dry run of the combo grammar)
function bladeStrikeDry(p, inp) {
  const a = p.arm, kn = p.kn; let mv;
  if (inp === 'S') mv = a.mag[a.slot] <= 0 ? 'whip' : /KKSKK$/.test(kn.seq) ? 'pair' : 'pb';
  else { const sinceS = kn.seq.lastIndexOf('S') >= 0 ? kn.seq.length - 1 - kn.seq.lastIndexOf('S') : -1, ks = /K*$/.exec(kn.seq)[0].length; mv = kn.lastMv === 'whip' ? 'jaw' : sinceS === 0 ? 'slash' : sinceS === 1 ? 'hammer' : ks % 2 === 0 ? 'stab' : 'neck'; }
  kn.seq = (kn.seq + (mv === 'whip' ? 'W' : inp)).slice(-12); kn.mv = mv; kn.lastMv = mv;
  if (BLADE_MOVES[mv].shot && a.mag[a.slot] > 0) a.mag[a.slot] -= Math.min(a.mag[a.slot], BLADE_MOVES[mv].shot);
  return mv;
}
function bladeHurtE(e) {
  const now = performance.now(); coreHurt('BLADE', e); try { console.error(e); } catch (x) { }
  BLADE.errT.push(now); while (BLADE.errT.length && now - BLADE.errT[0] > 10000) BLADE.errT.shift();
  if (BLADE.errT.length >= 6) { BLADE.offUntil = now + 15000; BLADE.errT.length = 0; coreRepaired('BLADE', 'Blade: the knife stays sheathed for a moment after errors'); }
}
coreDefine({ name: 'BLADE', kind: 'sim', ver: 1, does: 'The combat knife: a lunge to the nearest of the dead and a strike, chain kills from one to the next while the chain is open, and ten combos (knife, knife, shot, until the sidearm runs dry, then the pistol whip), each its own move and its own death for the zombie.',
  provides: ['melee', 'chain kills', 'combos'], needs: ['ARMS', 'ANIMA'], feats: { want: [], without: '' },
  state: () => { const p = G.p; return p && p.arm && p.arm.st === 'knife' && p.kn ? 'knife · ' + p.kn.mv + ' · ' + p.kn.seq : BLADE.strikes ? BLADE.kills + ' knife kills, ' + BLADE.found.size + ' of 10 combos found' : 'sheathed'; },
  level: () => 'full', noLearn: '',
  alive: () => G.mode === 'play' && !!(G.p && G.p.arm && G.p.arm.st === 'knife'), stallS: 3,   // (it only works while the knife is out; its heartbeat is bladeTick's)
  check: () => { const p = G.p; if (!p || !p.arm || p.arm.st !== 'knife') return ''; if (!p.kn) return 'the knife is out with no chain'; if (p.kn.t > p.kn.dur + 4) return 'a strike never finished'; return ''; },
  repair: () => { const p = G.p; if (p && p.arm && p.arm.st === 'knife') bladeEnd(p); BLADE.errT.length = 0; BLADE.offUntil = 0; },
  reset: () => { BLADE.fx.length = 0; },
  selfTest: () => bladeSelfTest(),
  learned: () => { const top = Object.entries(BLADE.combos).sort((a, b) => b[1] - a[1])[0]; return BLADE.strikes ? ['This session: ' + BLADE.strikes + ' strikes, ' + BLADE.kills + ' knife kills, the longest chain ' + BLADE.best + '.' + (top ? ' Your combo: ' + (BLADE_COMBOS.find(c => c.id === top[0]) || {}).name + ' (' + top[1] + ').' : ''), BLADE.found.size + ' of the 10 combos found.'] : ['The knife has not come out yet. V (the right bumper, the knife button on a phone).']; },
  on: {},
  spec: { files: ['knife', 'anima'], parts: ['the lunge', 'chain kills', 'ten combos', 'the pistol whip', 'ten melee deaths', 'silent kills', 'heavy dead stagger', 'co-op hits with their deaths'], procs: ['cpu'],
    effort: false, effortWhy: 'A strike has to land the same for every player and in co-op.' }
});
