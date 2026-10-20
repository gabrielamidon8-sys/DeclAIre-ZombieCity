/* ================= GORE: the blood engine (v2) =================
   Every zombie bleeds its own way. All 40 strains have a blood profile: its colour, how thick it is (thin blood sprays
   far in fine droplets, thick blood falls in heavy blobs), whether it glows (toxic acid green, radioactive yellow,
   molten magma that cools to black crust, violet void ichor, electric volt blood, spectral ectoplasm that fades, teal
   abyssal ink, hellfire), what comes off it when it is hit (sparks from metal, chips from bone, crystal and ice, dust,
   ash) and what it breaks into (flesh, bone, scrap, crystal, ice, embers, stuffing, bandages, shell, thorns, ooze).
   Abilities and bosses add to it.
   Every gun hits differently, on every zombie: a pistol punches a hole and throws a short spray out the back; a revolver
   or a sniper tears an exit wound and throws a long narrow spray (and the sniper's goes on through); an SMG peppers;
   a shotgun opens a wide cone and up close tears chunks off; the launcher burns, blackens and blows them apart; the
   flamethrower chars them and leaves a husk. Mods add their own: incendiary burns and embers, cryo frost (a frozen
   zombie shatters into ice), toxic corrosion, shock scorches the body and the ground in branching burns, explosive
   gibs, vampiric blood drawn out towards you.
   Sprays always fly the way the shot went (with a little back-spatter towards the shooter). There are 50 variants of
   every spray, smear and puddle, in three thicknesses, coloured per zombie. Zombies that survive keep their bullet
   holes, exit wounds, burns, frost, scorches and missing chunks. Kills that shove the body leave a smear to where it
   stopped.
   Blood does not stay forever: it fades after its time (Settings > Graphics > Blood lasts), and anything no player can
   see (in co-op: off every player's screen) is cleared. The engine measures its own cost and drops details (bubbles
   and glitter, then flying chunks, then back-spatter and glow) when the frame runs late, and takes them back when
   there is room. A part that throws is switched off on its own for a minute while the rest keeps going; bad data is
   thrown out; if the whole engine fails the game falls back to plain stains. */
const GORE = { pieces: [], spr: new Map(), cg: null, rgbs: new Map(), prof: new Map(), n: 0, made: 0, ms: 0, msAvg: 0, msT: 0, adapt: 0, perf: 0, good: 0, errT: [], offUntil: 0, budget: 0, gibs: [], featOff: {}, culled: 0, faded: 0, views: [], viewF: -99, fixed: 0 };
const GORE_S = 64, GORE_H = 2, GORE_NV = 50;   // sprites are small (a stain is rarely bigger than this on screen) and each stain keeps its own
const GORE_FRESH = 14, GORE_FADE = 4;          // seconds glossy, seconds turning dry
const GORE_V = { pool: GORE_NV, spray: GORE_NV, smear: GORE_NV, drop: 12, scorch: 8, zap: 8, husk: 6 };
const GORE_A = { pool: 0.82, spray: 0.8, smear: 0.72, drop: 0.8, scorch: 0.62, zap: 0.7, husk: 0.75 };
// per strain: c colour, g glow [r, g, b, strength], v thickness (0 thin, 1 normal, 2 thick), d what it breaks into, h what a
// hit throws off, w how its body takes a bullet, a how much it bleeds, f how long it lasts (x), x special effects
const GORE_STRAIN = {
  shambling: { c: [110, 14, 16], v: 1, d: 'flesh' },
  rabid: { c: [150, 12, 14], v: 0, d: 'flesh', x: 'froth' },
  brutish: { c: [104, 12, 12], v: 2, d: 'flesh', k: 1.3 },
  bloated: { c: [126, 132, 40], v: 2, d: 'ooze', a: 1.7, k: 1.2 },
  crawling: { c: [96, 12, 14], v: 0, d: 'flesh', x: 'crawl' },
  ironhide: { c: [100, 16, 14], v: 1, d: 'metal', h: 'sparks', w: 'plate' },
  skeletal: { c: [72, 32, 22], v: 1, d: 'bone', h: 'chips', w: 'bone', a: 0.18 },
  toxic: { c: [92, 200, 40], g: [140, 255, 60, 0.6], v: 0, d: 'ooze', x: 'bubbles' },
  frostbitten: { c: [64, 116, 156], v: 2, d: 'ice', h: 'chips', w: 'ice', x: 'frost' },
  charred: { c: [34, 20, 16], g: [255, 120, 40, 0.3], v: 1, d: 'ember', h: 'ash' },
  fungal: { c: [84, 74, 30], g: [180, 255, 140, 0.14], v: 1, d: 'spore', h: 'spores', heal: 1 },
  crystal: { c: [228, 140, 200], g: [255, 180, 240, 0.25], v: 1, d: 'crystal', h: 'chips', w: 'crystal', a: 0.4, x: 'glitter' },
  void: { c: [44, 12, 74], g: [170, 90, 255, 0.5], v: 1, d: 'ecto', x: 'stars' },
  volt: { c: [204, 192, 44], g: [255, 240, 90, 0.55], v: 0, d: 'spark', h: 'sparks', x: 'flicker' },
  rotten: { c: [72, 42, 20], v: 2, d: 'flesh', x: 'bubbles' },
  colossal: { c: [104, 12, 14], v: 2, d: 'flesh', k: 1.8, a: 1.4 },
  wraith: { c: [124, 222, 255], g: [140, 230, 255, 0.45], v: 0, d: 'ecto', w: 'ecto', f: 0.4, a: 0.7 },
  chitin: { c: [152, 172, 44], v: 1, d: 'chitin', h: 'chips', w: 'shell' },
  magma: { c: [255, 122, 22], g: [255, 140, 40, 0.8], v: 2, d: 'ember', h: 'embers', x: 'cool' },
  abyssal: { c: [20, 92, 92], g: [60, 255, 210, 0.45], v: 2, d: 'ooze' },
  plagued: { c: [112, 62, 122], v: 2, d: 'ooze', x: 'bubbles' },
  feral: { c: [120, 14, 16], v: 0, d: 'flesh' },
  glacial: { c: [142, 192, 222], g: [180, 240, 255, 0.14], v: 2, d: 'ice', h: 'chips', w: 'ice', x: 'frost' },
  mummified: { c: [92, 72, 50], v: 1, d: 'bandage', h: 'dust', a: 0.3 },
  swamp: { c: [62, 82, 30], v: 2, d: 'ooze', h: 'spores', x: 'bubbles' },
  irradiated: { c: [184, 232, 40], g: [220, 255, 60, 0.7], v: 1, d: 'ooze', x: 'pulse' },
  cyborg: { c: [22, 22, 26], v: 1, d: 'metal', h: 'sparks', w: 'plate', a: 0.7, x: 'oil' },
  puppet: { c: [110, 16, 18], v: 1, d: 'fluff', a: 0.5 },
  stalker: { c: [72, 8, 12], v: 1, d: 'flesh' },
  brood: { c: [202, 172, 62], v: 2, d: 'ooze' },
  ashen: { c: [74, 72, 70], v: 1, d: 'ash', h: 'ash', a: 0.4 },
  dune: { c: [104, 40, 24], v: 1, d: 'sand', h: 'dust' },
  sanguine: { c: [176, 10, 22], v: 0, d: 'flesh', a: 1.8, f: 1.3 },
  bramble: { c: [62, 112, 30], v: 1, d: 'thorn', heal: 1 },
  ghoul: { c: [92, 10, 10], v: 1, d: 'flesh' },
  chrome: { c: [192, 202, 212], v: 1, d: 'metal', h: 'sparks', w: 'chrome', x: 'mercury' },
  infernal: { c: [222, 62, 20], g: [255, 90, 30, 0.6], v: 1, d: 'ember', h: 'embers' },
  hollow: { c: [60, 46, 40], g: [255, 170, 70, 0.5], v: 1, d: 'ash', h: 'ash' },
  stitched: { c: [112, 16, 18], v: 1, d: 'flesh', heal: 0 },
  twinhead: { c: [108, 14, 16], v: 2, d: 'flesh', k: 1.25 }
};
// abilities add to it
const GORE_ABIL = {
  spitter: { mix: [92, 200, 40, 0.3], g: [140, 255, 60, 0.2] }, oozer: { mix: [140, 220, 60, 0.3], x: 'bubbles' },
  shocker: { h: 'sparks', g: [255, 240, 120, 0.25] }, chiller: { x: 'frost', mix: [150, 200, 240, 0.3] },
  phantom: { w: 'ecto', f: 0.5, g: [190, 220, 255, 0.25] }, voidheart: { g: [170, 90, 255, 0.3], x: 'stars' },
  regrower: { heal: 1 }, medic: { heal: 1 }, juggernaut: { h: 'sparks' }, spiker: { d: 'bone', h: 'chips' }, hive: { x: 'flies' }
};
// how each gun hits: cal (wound size), spray (length), spread (width), exit (exit wound chance), chunk (chunk torn off on
// a kill), gib (body blown apart on a kill), back (back-spatter), and special
const GORE_GUN = {
  pistol: { cal: 1, spray: 1, spread: 1, exit: 0.15, chunk: 0.05, gib: 0, back: 0.5 },
  revolver: { cal: 1.4, spray: 1.45, spread: 0.9, exit: 0.6, chunk: 0.3, gib: 0.1, back: 0.6 },
  smg: { cal: 0.8, spray: 0.8, spread: 1.1, exit: 0.05, chunk: 0, gib: 0, back: 0.35 },
  rifle: { cal: 1.1, spray: 1.35, spread: 0.85, exit: 0.45, chunk: 0.12, gib: 0.05, back: 0.5 },
  burst: { cal: 1.1, spray: 1.25, spread: 0.85, exit: 0.4, chunk: 0.1, gib: 0.05, back: 0.5 },
  lmg: { cal: 1.15, spray: 1.3, spread: 0.95, exit: 0.45, chunk: 0.15, gib: 0.08, back: 0.45 },
  sniper: { cal: 1.9, spray: 2.3, spread: 0.55, exit: 1, chunk: 0.65, gib: 0.25, back: 0.8, through: 1 },
  shotgun: { cal: 0.7, spray: 1.1, spread: 1.7, exit: 0.1, chunk: 0.35, gib: 0.45, back: 0.3, close: 1 },
  launcher: { cal: 1.5, spray: 1.2, spread: 2, exit: 0, chunk: 0.8, gib: 1, back: 0, blast: 1, burn: 1 },
  flamer: { cal: 0, spray: 0, spread: 1, exit: 0, chunk: 0, gib: 0, back: 0, fire: 1, burn: 1 }
};
const GORE_MOD = {
  incendiary: { burn: 0.6, ember: 1 }, cryo: { frost: 1 }, toxic: { acid: 1 }, shock: { zap: 1 }, thunderclap: { zap: 1 },
  explosive: { blast: 0.5, gib: 0.3 }, volatile: { blast: 0.3, gib: 0.2 }, heavy: { cal: 1.4, chunk: 0.15 }, hollow: { exit: 0.4, chunk: 0.25 },
  piercing: { exit: 1, through: 1 }, vampiric: { drain: 1 }, ricochet: { sparks: 1 }, executioner: { chunk: 0.2 }, gravity: { swirl: 1 }
};
function goreLevel() {
  if (GORE.offUntil && performance.now() < GORE.offUntil) return 0;
  const d = SET.decals === 'low' ? 1 : SET.decals === 'high' ? 3 : 2;
  return clamp(d + GORE.adapt + (TUNE.GORE || 0), 0, 3);
}
function goreOk() { return goreLevel() > 0; }
function goreOn(f) { const t = GORE.featOff[f]; return !(t && performance.now() < t); }
// a part of the engine threw: switch just that part off for a minute
function goreTry(f, fn) { if (!goreOn(f)) return; try { fn(); } catch (e) { GORE.featOff[f] = performance.now() + 60000; goreHurt(e, f); } }
function goreLife() { const v = +SET.bloodTime; return isFinite(v) && v > 0 ? v : 60; }
// any CSS colour as numbers [r, g, b, a] (the browser reads it; cached)
function goreParse(col) {
  let v = GORE.rgbs.get(col); if (v) return v;
  const g = GORE.cg || (GORE.cg = document.createElement('canvas').getContext('2d'));
  v = [90, 10, 10, 1];
  if (g) {
    g.fillStyle = '#5a0a0a'; g.fillStyle = col; const s = String(g.fillStyle);
    if (s[0] === '#') { const n = parseInt(s.slice(1, 7), 16); v = [n >> 16, (n >> 8) & 255, n & 255, 1]; }
    else { const m = s.match(/[\d.]+/g); if (m && m.length >= 3) v = [+m[0], +m[1], +m[2], m.length >= 4 ? +m[3] : 1]; }
  }
  if (GORE.rgbs.size < 256) GORE.rgbs.set(col, v); return v;
}
const goreQ = x => Math.max(0, Math.min(255, Math.round(x / 8) * 8));
// a colour that is not on the list (old saves, unknown strains): dark red tinted by the strain's hue, never pale
function goreRgb(col) {
  const key = '~' + col; let v = GORE.rgbs.get(key); if (v) return v;
  const p = goreParse(col);
  let r = p[0] * 0.4 + 104 * 0.6, g = p[1] * 0.4 + 8 * 0.6, b = p[2] * 0.4 + 10 * 0.6;
  const L = 0.3 * r + 0.59 * g + 0.11 * b; if (L > 46) { const k = 46 / L; r *= k; g *= k; b *= k; }
  v = [goreQ(r), goreQ(g), goreQ(b)];
  if (GORE.rgbs.size < 256) GORE.rgbs.set(key, v); return v;
}
const goreMix = (a, b, k) => [goreQ(a[0] * (1 - k) + b[0] * k), goreQ(a[1] * (1 - k) + b[1] * k), goreQ(a[2] * (1 - k) + b[2] * k)];
// the blood profile of a zombie (strain + ability, or a boss's form), made once per kind and kept on the zombie
function goreProf(z) {
  if (z.gp && z.gpF === (z.rb ? z.rb.form : 0)) return z.gp;
  const m = z.m, sk = m && m.S ? m.S.key : '', ak = m && m.A ? m.A.key : '', form = z.rb ? z.rb.form : 0;
  const key = z.rb ? 'boss:' + (z.rb.def && z.rb.def.id) + ':' + form : sk + '|' + ak + (z.boss ? '|B' : '');
  let p = GORE.prof.get(key);
  if (!p) {
    const S = GORE_STRAIN[sk] || {}, A = GORE_ABIL[ak] || {};
    let c = S.c ? S.c.slice() : goreRgb(m && m.S ? m.S.gore : '#5a0a0a'), g = S.g || A.g || null;
    if (A.mix) c = goreMix(c, A.mix, A.mix[3]);
    if (z.rb && z.rb.def && z.rb.def.forms) {
      // a boss bleeds the colour of its form, thick, and blows apart in big pieces
      const col = z.rb.def.forms[form] ? z.rb.def.forms[form].col : null;
      if (col) { const a = goreParse(col[0]), e = goreParse(col[2] || col[1] || col[0]); c = goreMix([a[0], a[1], a[2]], [110, 10, 12], 0.45); if (Math.max(e[0], e[1], e[2]) > 200) g = [e[0], e[1], e[2], 0.3]; }
    }
    p = {
      rgb: c.map(goreQ), glow: g, visc: S.v == null ? 1 : S.v, deb: A.d || S.d || 'flesh', hit: A.h || S.h || 'blood', body: A.w || S.w || 'flesh',
      amt: S.a || 1, fade: (S.f || 1) * (A.f || 1), x: A.x || S.x || '', heal: !!(S.heal || A.heal), gibK: (S.k || 1) * (z.boss ? 2.2 : 1)
    };
    if (z.boss) { p.visc = 2; p.amt *= 1.5; }
    if (GORE.prof.size < 400) GORE.prof.set(key, p);
  }
  z.gp = p; z.gpF = form; return p;
}

/* ---------- the shapes: 50 variants of each, in three thicknesses ---------- */
function goreShape(g, k, v, visc) {
  const R = Z.mulberry32(0x9e3779b1 ^ (v * 7919) ^ (k.charCodeAt(0) << 16) ^ (k.charCodeAt(1) << 8) ^ (visc * 104729)), u = GORE_S / (2 * GORE_H), cx = GORE_S / 2;
  g.setTransform(u, 0, 0, u, cx, cx); g.fillStyle = '#fff';
  const dot = (x, y, rx, ry, a) => { g.beginPath(); g.ellipse(x, y, Math.max(0.012, rx), Math.max(0.012, ry), a || 0, 0, TAU); g.fill(); };
  const thin = visc === 0, thick = visc === 2;
  if (k === 'pool') {
    // a puddle: overlapping blobs (fewer and rounder when thick), fingers the way it was flung, satellite drops
    const n = (thick ? 4 : 6) + Math.floor(R() * 4);
    for (let i = 0; i < n; i++) { const a = R() * TAU, d = R() * (thick ? 0.32 : 0.44), rr = (thick ? 0.45 : 0.34) + R() * 0.32; dot(Math.cos(a) * d, Math.sin(a) * d, rr, rr * (0.82 + R() * 0.18), a); }
    const f = (thin ? 3 : thick ? 1 : 2) + Math.floor(R() * 3);
    for (let i = 0; i < f; i++) { const a = (R() - 0.5) * 1.6, len = (thin ? 1.05 : 0.85) + R() * 0.55, w = (thick ? 0.16 : 0.09) + R() * 0.12; dot(Math.cos(a) * len * 0.62, Math.sin(a) * len * 0.62, len * 0.5, w, a); }
    const m = (thin ? 14 : thick ? 3 : 8) + Math.floor(R() * (thin ? 12 : 8));
    for (let i = 0; i < m; i++) { const a = (R() - 0.5) * 2, d = 1.12 + R() * 0.66, s = (thick ? 0.07 : 0.03) + R() * (thin ? 0.06 : 0.09) * (1.35 - d * 0.4), e = 1 + d * (thin ? 0.9 : 0.6); dot(Math.cos(a) * d, Math.sin(a) * d, s * e, s, a); }
  } else if (k === 'spray') {
    // a spray out of the wound: a cone of streaks (long and fine when thin, short and heavy when thick) and mist
    const L = thin ? 1.85 : thick ? 1.15 : 1.55, cone = (0.8 + R() * 0.5) * (thick ? 0.85 : 1);
    dot(0.12, 0, 0.24, 0.19, 0);
    const n = (thin ? 16 : thick ? 7 : 11) + Math.floor(R() * 9);
    for (let i = 0; i < n; i++) { const a = (R() - 0.5) * cone, d = 0.22 + R() * L, s = ((thick ? 0.08 : 0.045) + R() * 0.08) * (1.05 - d / 2.2), e = 1.3 + d * (thin ? 1.4 : 1); dot(Math.cos(a) * d, Math.sin(a) * d, s * e, s, a); }
    const mist = thick ? 12 : thin ? 44 : 30;
    for (let i = 0; i < mist; i++) { const a = (R() - 0.5) * cone * 1.35, d = 0.3 + R() * L * 1.02, s = 0.012 + R() * 0.022; dot(Math.cos(a) * d, Math.sin(a) * d, s, s, 0); }
  } else if (k === 'smear') {
    // a body dragged or slid along the ground: a broad streak that thickens where it stopped, finger drags, drops
    const lanes = 2 + Math.floor(R() * 3), w0 = (thick ? 0.38 : 0.3) + R() * 0.12;
    for (let i = 0; i < 26; i++) { const t = i / 25, x = -1.8 + t * 3.4, w = w0 * (0.45 + t * 0.75) * (0.85 + R() * 0.3); dot(x, (R() - 0.5) * 0.08, 0.2, w, 0); }
    for (let l = 0; l < lanes; l++) { const y = (R() - 0.5) * w0 * 1.6, w = 0.025 + R() * 0.035; g.globalAlpha = 0.6; for (let i = 0; i < 16; i++) { const t = i / 15; dot(-1.85 + t * 3.2, y + Math.sin(t * 6 + l) * 0.03, 0.14, w, 0); } g.globalAlpha = 1; }
    dot(1.55, 0, w0 * 1.25, w0 * 1.1, 0);
    for (let i = 0; i < (thin ? 10 : 5); i++) { const x = -1.6 + R() * 3.3, y = (R() - 0.5) * 1.1, s = 0.03 + R() * 0.05; dot(x, y, s, s, 0); }
  } else if (k === 'drop') {
    dot(0, 0, 0.5, 0.44 + R() * 0.06, R() * 3);
    const n = 3 + Math.floor(R() * 5);
    for (let i = 0; i < n; i++) { const a = R() * TAU, d = 0.68 + R() * 0.38, s = 0.05 + R() * 0.06; dot(Math.cos(a) * d, Math.sin(a) * d, s * 1.4, s, a); }
  } else if (k === 'zap') {
    // an electrical burn: branching dark lines from where it struck (a Lichtenberg figure)
    g.strokeStyle = '#fff'; g.lineCap = 'round';
    const branch = (x, y, a, len, w, depth) => {
      if (depth > 5 || len < 0.06) return;
      let px = x, py = y; g.lineWidth = w; g.beginPath(); g.moveTo(px, py);
      const steps = 4; for (let i = 0; i < steps; i++) { a += (R() - 0.5) * 0.9; px += Math.cos(a) * len / steps; py += Math.sin(a) * len / steps; g.lineTo(px, py); }
      g.stroke();
      const nb = 1 + Math.floor(R() * 2.2); for (let i = 0; i < nb; i++) branch(px, py, a + (R() - 0.5) * 1.6, len * (0.55 + R() * 0.2), w * 0.7, depth + 1);
    };
    const arms = 4 + Math.floor(R() * 4); for (let i = 0; i < arms; i++) branch(0, 0, i / arms * TAU + R() * 0.6, 0.55 + R() * 0.3, 0.07, 0);
    dot(0, 0, 0.18, 0.18, 0);
  } else if (k === 'husk') {
    // what fire leaves of a body: a charred outline (head, shoulders, limbs) and ash
    g.globalAlpha = 0.9; dot(0, 0, 0.62, 0.42, 0); dot(0.55, 0, 0.26, 0.24, 0);
    for (const s of [-1, 1]) { dot(0.15, s * 0.5, 0.36, 0.1, s * 0.5); dot(-0.55, s * 0.24, 0.42, 0.1, s * 0.15); }
    g.globalAlpha = 0.5; for (let i = 0; i < 30; i++) { const a = R() * TAU, d = R() * 1.1, s = 0.02 + R() * 0.05; dot(Math.cos(a) * d, Math.sin(a) * d, s, s, 0); }
    g.globalAlpha = 1;
  } else {
    // scorch: soot thickest in the middle, streaks flung outward, ragged at the edge
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1.05); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1.05, 0, TAU); g.fill();
    const n = 14 + Math.floor(R() * 8);
    for (let i = 0; i < n; i++) {
      const a = R() * TAU, len = 1.1 + R() * 0.75, w = 0.05 + R() * 0.08;
      const lg = g.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len); lg.addColorStop(0, 'rgba(255,255,255,0.55)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = lg; g.beginPath(); g.moveTo(Math.cos(a + w) * 0.4, Math.sin(a + w) * 0.4); g.lineTo(Math.cos(a) * len, Math.sin(a) * len); g.lineTo(Math.cos(a - w) * 0.4, Math.sin(a - w) * 0.4); g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 18; i++) { const a = R() * TAU, d = 0.9 + R() * 0.8, s = 0.02 + R() * 0.05; dot(Math.cos(a) * d, Math.sin(a) * d, s, s, 0); }
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
}
// a stain's sprite in its colour, fresh or dry (cached; least recently used goes first)
function goreSprite(k, v, rgb, dry, visc) {
  visc = visc == null ? 1 : visc;
  const key = k + v + '.' + visc + ':' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + (dry ? 'd' : 'f');
  let c = GORE.spr.get(key); if (c) { GORE.spr.delete(key); GORE.spr.set(key, c); return c; }
  c = document.createElement('canvas'); c.width = c.height = GORE_S; const g = c.getContext('2d'); if (!g) return null;
  goreShape(g, k, v, visc);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')'; g.fillRect(0, 0, GORE_S, GORE_S);
  const u = GORE_S / (2 * GORE_H), cx = GORE_S / 2;
  if (k !== 'scorch' && k !== 'zap' && k !== 'husk') {
    // depth: a faint sheen in the middle, darker where it thins and dries at the rim, a few clots
    g.globalCompositeOperation = 'source-atop';
    const gr = g.createRadialGradient(cx - u * 0.15, cx - u * 0.15, 0, cx, cx, u * 1.15); gr.addColorStop(0, 'rgba(255,255,255,' + (dry ? 0.02 : 0.1) + ')'); gr.addColorStop(0.6, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.38)');
    g.fillStyle = gr; g.fillRect(0, 0, GORE_S, GORE_S);
    if (k === 'pool') { const R = Z.mulberry32(v * 131 + 7); g.fillStyle = 'rgba(0,0,0,0.22)'; for (let i = 0; i < 5; i++) { const a = R() * TAU, d = R() * 0.5 * u; g.beginPath(); g.arc(cx + Math.cos(a) * d, cx + Math.sin(a) * d, (0.05 + R() * 0.09) * u, 0, TAU); g.fill(); } }
    if (dry) { g.fillStyle = 'rgba(34,14,8,0.5)'; g.fillRect(0, 0, GORE_S, GORE_S); }
  }
  g.globalCompositeOperation = 'source-over';
  GORE.spr.set(key, c); GORE.made++;
  const cap = PERF.tier >= 2 ? 160 : 96; while (GORE.spr.size > cap) GORE.spr.delete(GORE.spr.keys().next().value);
  return c;
}
// draw one stain with the transform T (world -> canvas) already chosen: rotated to its direction, scaled by its size
// (sy squeezes or widens it across: a sniper's narrow spray, a shotgun's wide one)
function goreBlit(g, T, s, spr, alpha, scale) {
  const r = s.r * scale * GORE_H, co = Math.cos(s.a), si = Math.sin(s.a), sy = s.sy || 1;
  g.setTransform(T.a * co + T.c * si, T.b * co + T.d * si, (T.c * co - T.a * si) * sy, (T.d * co - T.b * si) * sy, T.a * s.x + T.c * s.y + T.e, T.b * s.x + T.d * s.y + T.f);
  g.globalAlpha = alpha; g.drawImage(spr, -r, -r, r * 2, r * 2);
}
function goreGrow(s, t) { if (s.k !== 'pool') return 1; const p = Math.min(1, t / 0.9); return 0.35 + 0.65 * (1 - (1 - p) * (1 - p)) * (1 + 0.35 * (s.dil || 0)); }

/* ---------- making stains ---------- */
function goreAdd(s) {
  const lvl = goreLevel(); if (!lvl || G.mode === 'intro') return null;
  if (GORE.budget-- <= 0 && s.k !== 'pool' && s.k !== 'husk') return null;   // a frame makes only so many small stains
  if (!isFinite(s.x) || !isFinite(s.y) || !isFinite(s.r) || s.r <= 0) return null;
  s.t0 = G.time; s.v = s.v == null ? (Math.random() * (GORE_V[s.k] || 1)) | 0 : s.v;
  if (s.a == null) s.a = Math.random() * TAU;
  if (s.visc == null) s.visc = 1;
  // in water the blood clouds and drifts apart instead of staining
  const wet = typeof waterAt === 'function' && isWater(waterAt(s.x, s.y));
  if (wet && (s.k === 'scorch' || s.k === 'zap' || s.k === 'husk' || s.k === 'gib')) return null;
  if (wet) { s.k = 'cloud'; s.r *= 1.2; }
  else if (s.k !== 'scorch' && s.k !== 'zap' && s.k !== 'husk' && s.k !== 'gib') {
    const sf = surfaceAt(s.x, s.y);
    if (sf === 'snow' && !s.glow) s.rgb = [Math.min(255, s.rgb[0] * 1.5 + 30), s.rgb[1] * 0.8, s.rgb[2] * 0.8].map(goreQ);   // vivid on snow
    s.dil = clamp((WX.wet || 0) * 1.1 - 0.2, 0, 1);                                                                           // thinned by rain
  }
  const L = G.splats; L.push(s); GORE.n++;
  const cap = goreCap(lvl);
  if (L.length > cap) {
    // over the limit: the oldest small marks go first (drops, then sprays), pools and husks last
    let need = L.length - cap;
    for (const kind of ['drop', 'spray', 'smear', 'zap', 'scorch']) { for (let i = 0; i < L.length - 1 && need > 0; i++) if (L[i].k === kind) { L.splice(i, 1); i--; need--; } if (need <= 0) break; }
    if (need > 0) L.splice(0, need);
  }
  return s;
}
// how many stains at once: more than the old splats (blood clears itself now), scaled by the setting and by how the
// engine is keeping up
function goreCap(lvl) { return Math.round(Math.max(60, Q.splats * 1.5) * (lvl === 1 ? 0.6 : lvl === 3 ? 1.3 : 1) * [1, 0.85, 0.7, 0.5][-GORE.perf]); }
// the old interface: explosions, dust, a boss's tread marks
function goreScorch(x, y, r, col) { const p = goreParse(col); return goreAdd({ k: 'scorch', x: x, y: y, r: r * 1.1, rgb: [p[0] & 248, p[1] & 248, p[2] & 248], al: Math.min(1, p[3] * 0.95) }); }
// how much room there is ahead of a spray before a wall stops it
function goreRoom(x, y, a, len) {
  const dx = Math.cos(a), dy = Math.sin(a);
  for (let i = 1; i <= 5; i++) { const d = len * i / 5; if (pointInRect(x + dx * d, y + dy * d)) return Math.max(0.25, (i - 1) / 5); }
  return 1;
}
// the gun that fired (frame + mod), merged into one reaction
function goreGunOf(fk, mk) {
  const key = (fk || 'pistol') + '|' + (mk || ''); let r = GORE.prof.get('gun:' + key); if (r) return r;
  const F = GORE_GUN[fk] || GORE_GUN.pistol, M = GORE_MOD[mk] || {};
  r = Object.assign({}, F);
  r.cal = F.cal * (M.cal || 1); r.exit = Math.min(1, F.exit + (M.exit || 0)); r.chunk = Math.min(1, F.chunk + (M.chunk || 0)); r.gib = Math.min(1, F.gib + (M.gib || 0));
  for (const k of ['burn', 'ember', 'frost', 'acid', 'zap', 'blast', 'drain', 'sparks', 'through', 'swirl']) if (M[k]) r[k] = Math.max(r[k] || 0, M[k]);
  GORE.prof.set('gun:' + key, r); return r;
}
// a wound on the zombie's body, in its own turning frame (a: angle round the body, d: how far out, s: size)
function goreWound(z, type, a, d, s, lvl) {
  const w = z.wnd || (z.wnd = []), cap = [0, 3, 5, 7][lvl];
  if (w.length >= cap) { const q = w[(Math.random() * w.length) | 0]; q.s = Math.min(0.34, q.s + 0.025); if (type === 'burn' || type === 'chunk') { q.t = type; } return q; }
  const q = { t: type, a: a, d: d, s: s, v: (Math.random() * 1e6) | 0, t0: G.time }; w.push(q); return q;
}
// bits flying off (chips, sparks, chunks): they arc, bounce once, land and lie as small pieces
function goreGib(x, y, a, sp, type, rgb, size, glow) {
  if (GORE.perf <= -2 || !goreOn('gibs')) return;
  const B = GORE.gibs, cap = [0, 24, 50, 80][goreLevel()]; if (B.length >= cap) B.shift();
  B.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, h: 4 * PK, vh: (60 + Math.random() * 90) * PK, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 18, type: type, rgb: rgb, s: size, glow: glow, t: 0, v: (Math.random() * 1e6) | 0 });
}
function goreChips(z, a, type, n, rgb) {
  const spread = 1.6;
  for (let i = 0; i < n; i++) goreGib(z.x + Math.cos(a) * z.r * 0.5, z.y + Math.sin(a) * z.r * 0.5, a + Math.PI + (Math.random() - 0.5) * spread, (70 + Math.random() * 140) * PK, type, rgb, (0.8 + Math.random() * 1.2) * PK, type === 'ember' || type === 'crystal');
}
// small sparks and puffs (into the game's particles; glowing ones stay bright at night)
function goreSparks(x, y, a, n, cols, spd) {
  for (let i = 0; i < n; i++) { if (G.parts.length >= Q.parts) break; const aa = a + (Math.random() - 0.5) * 1.8, s = (spd || 260) * (0.4 + Math.random()); G.parts.push({ x: x, y: y, vx: Math.cos(aa) * s, vy: Math.sin(aa) * s, life: 0.08 + Math.random() * 0.18, max: 0.26, c: cols[(Math.random() * cols.length) | 0], s: 1.2 + Math.random() * 1.4, glow: true }); }
}
function gorePuff(x, y, n, col, size) {
  for (let i = 0; i < n; i++) { if (G.parts.length >= Q.parts) break; const a = Math.random() * TAU, s = 20 + Math.random() * 50; G.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 15, life: 0.4 + Math.random() * 0.5, max: 0.9, c: col, s: (size || 4) * (0.6 + Math.random() * 0.8) }); }
}
const GORE_HITFX = { sparks: ['#fff1b8', '#ffd27a', '#ffffff'], embers: ['#ffb347', '#ff7a2a', '#ffe08a'], spores: ['#c8d890', '#a8b870'], ash: ['#8a8a88', '#6a6a68'], dust: ['#a89878', '#8a7a62'] };
// a bullet lands: the wound where it went in (and out), the spray out of the back, back-spatter, what comes off
function goreHit(z, vx, vy, dmg, b) {
  if (!z || z.dead || z.fly || z.illusion) return;
  const a = Math.atan2(vy, vx); z.hitA = a; z.gsrc = 'bullet';
  if (b) { z.gk = b.fk || z.gk; z.gm = b.mk || z.gm; }
  const lvl = goreLevel(); if (!lvl) return;
  const P = goreProf(z), R = goreGunOf(z.gk, z.gm), ent = a + Math.PI - z.ang + (Math.random() - 0.5) * 0.8;
  z.ghit = dmg;
  // fire: it chars, it doesn't bleed
  if (R.fire) {
    if (Math.random() < 0.25) goreTry('wounds', () => goreWound(z, 'burn', ent, 0.2 + Math.random() * 0.45, 0.2 + Math.random() * 0.1, lvl));
    z.charK = Math.min(0.7, (z.charK || 0) + 0.015);
    if (Math.random() < 0.15) gorePuff(z.x, z.y, 1, 'rgba(60,56,52,0.6)', 5 * PK);
    return;
  }
  // the wound: what kind depends on the body (metal plates dent and spark, bone and crystal and ice crack, ghosts
  // leave a glowing hole) and on the gun's mod (burns, frost, corrosion, scorches)
  goreTry('wounds', () => {
    if (Q.lod >= 3) return;
    const s0 = clamp(0.1 * R.cal, 0.06, 0.24) * (0.85 + Math.random() * 0.3);
    let type = 'hole';
    if (P.body === 'bone' || P.body === 'crystal' || P.body === 'ice' || P.body === 'shell') type = 'crack';
    else if (P.body === 'chrome' || (P.body === 'plate' && Math.random() < 0.55)) type = 'dent';
    else if (P.body === 'ecto') type = 'ecto';
    goreWound(z, type, ent, 0.3 + Math.random() * 0.4, s0, lvl);
    if (type === 'hole' && Math.random() < R.exit) goreWound(z, 'exit', a - z.ang + (Math.random() - 0.5) * 0.7, 0.45 + Math.random() * 0.3, s0 * (1.6 + (GORE_MOD[z.gm] && GORE_MOD[z.gm].exit ? 0.6 : 0)), lvl);
    if (R.burn && Math.random() < R.burn) goreWound(z, 'burn', ent, 0.3 + Math.random() * 0.4, s0 * 1.8, lvl);
    if (R.frost) { goreWound(z, 'frost', ent, 0.35 + Math.random() * 0.3, s0 * 2, lvl); z.frostK = Math.min(0.8, (z.frostK || 0) + 0.12); }
    if (R.acid) goreWound(z, 'acid', ent, 0.3 + Math.random() * 0.4, s0 * 1.6, lvl);
    if (R.zap) goreWound(z, 'zap', ent, 0.25 + Math.random() * 0.4, s0 * 2.2, lvl);
  });
  // what comes off it
  const ex = z.x + Math.cos(a) * z.r * 0.6, ey = z.y + Math.sin(a) * z.r * 0.6, nx = z.x - Math.cos(a) * z.r * 0.6, ny = z.y - Math.sin(a) * z.r * 0.6;
  goreTry('hitfx', () => {
    const fx = GORE_HITFX[P.hit] || (R.sparks ? GORE_HITFX.sparks : null);
    if (P.hit === 'sparks' || R.sparks) goreSparks(nx, ny, a + Math.PI, 3 + (Math.random() * 3 | 0), GORE_HITFX.sparks, 280);
    else if (P.hit === 'chips') goreChips(z, a, P.deb === 'flesh' ? 'bone' : P.deb, 1 + (Math.random() * 2 | 0), P.rgb);
    else if (P.hit === 'embers') goreSparks(nx, ny, a + Math.PI, 3, GORE_HITFX.embers, 160);
    else if (fx) gorePuff(nx, ny, 2, fx[0], 4 * PK);
    if (R.ember) goreSparks(ex, ey, a, 3, GORE_HITFX.embers, 200);
    if (R.zap) { goreSparks(z.x, z.y, a, 4, ['#fff36b', '#ffffff', '#9fd3ff'], 300); if (Math.random() < 0.35) goreAdd({ k: 'zap', x: z.x + Math.cos(a) * z.r, y: z.y + Math.sin(a) * z.r, r: z.r * (0.7 + Math.random() * 0.5), rgb: [20, 18, 26], al: 0.6 }); }
    if (R.frost) goreSparks(ex, ey, a, 3, ['#e8f8ff', '#bfe8ff'], 140);
    if (R.drain && G.p && Math.random() < 0.5) { const pa = Math.atan2(G.p.y - z.y, G.p.x - z.x), d = Math.hypot(G.p.x - z.x, G.p.y - z.y); for (let i = 0; i < 3; i++) { if (G.parts.length >= Q.parts) break; G.parts.push({ x: z.x, y: z.y, vx: Math.cos(pa) * d * 2.4 + (Math.random() - 0.5) * 40, vy: Math.sin(pa) * d * 2.4 + (Math.random() - 0.5) * 40, life: 0.38, max: 0.38, c: 'rgb(' + P.rgb.join(',') + ')', s: 2.2 }); } }
  });
  if (P.amt < 0.05 || (lvl < 2 && Math.random() < 0.6)) return;
  const now = G.time, slow = !(R.through || R.close); if (slow && z.sprT && now - z.sprT < 0.08) return; z.sprT = now;
  // the spray out of the exit side, the way the bullet went (long and narrow for a sniper, wide for a shotgun)
  goreTry('spray', () => {
    let rgb = P.rgb;
    if (R.frost) rgb = goreMix(rgb, [190, 225, 255], 0.45); else if (R.acid) rgb = goreMix(rgb, [120, 220, 60], 0.3); else if (R.burn) rgb = goreMix(rgb, [40, 22, 16], 0.25);
    const big = clamp(dmg / 30, 0.4, 1.5), len = z.r * (0.95 + big * 0.7) * R.spray * Math.pow(P.amt, 0.35) * (P.visc === 0 ? 1.15 : P.visc === 2 ? 0.8 : 1);
    const room = goreRoom(ex, ey, a, len * 1.8);
    goreAdd({ k: 'spray', x: ex, y: ey, r: len * room, a: a + (Math.random() - 0.5) * 0.12, sy: R.spread * (0.85 + Math.random() * 0.3), rgb: rgb, visc: P.visc, glow: P.glow, fade: P.fade, fx: P.x });
    // back-spatter: a little blood thrown back towards the shooter from where it went in
    if (GORE.perf > -3 && Math.random() < R.back * 0.6) goreAdd({ k: 'spray', x: nx, y: ny, r: len * 0.28, a: a + Math.PI + (Math.random() - 0.5) * 0.5, sy: 1.2, rgb: rgb, visc: P.visc, glow: P.glow, fade: P.fade });
  });
}
// an explosion catches a zombie: it burns, blackens, loses pieces, and bleeds outward
function goreBlastHit(z, a, dmg) {
  if (!z || z.dead || z.fly || z.illusion) return;
  const lvl = goreLevel(); if (!lvl) return;
  z.gsrc = 'blast'; z.hitA = a; z.ghit = dmg;
  const P = goreProf(z), ent = a + Math.PI - z.ang;
  z.charK = Math.min(0.75, (z.charK || 0) + 0.25);
  goreTry('wounds', () => { goreWound(z, 'burn', ent + (Math.random() - 0.5), 0.3 + Math.random() * 0.4, 0.22 + Math.random() * 0.1, lvl); if (dmg > z.maxHp * 0.25 && Math.random() < 0.6) goreWound(z, 'chunk', ent + (Math.random() - 0.5) * 0.8, 0.85, 0.26 + Math.random() * 0.1, lvl); });
  goreTry('hitfx', () => { goreSparks(z.x, z.y, a, 5, GORE_HITFX.embers, 220); if (dmg > z.maxHp * 0.2) goreChips(z, a + Math.PI, P.deb, 2, P.rgb); });
  if (P.amt >= 0.05) goreTry('spray', () => goreAdd({ k: 'spray', x: z.x + Math.cos(a) * z.r * 0.5, y: z.y + Math.sin(a) * z.r * 0.5, r: z.r * 1.4 * Math.pow(P.amt, 0.35), a: a, sy: 1.6, rgb: goreMix(P.rgb, [30, 18, 14], 0.3), visc: P.visc, glow: P.glow, fade: P.fade }));
}
// a kill: how the body comes apart depends on what killed it and on what it is made of
function goreKill(z, by) {
  if (!z || z.fly || z.illusion) return;
  const lvl = goreLevel(); if (!lvl) return;
  // in co-op a teammate's kill: their gun decides
  if (by != null && !z.gk && typeof NET !== 'undefined' && NET.started) { const o = NET.role === 'host' ? (NET.peers.get(by) || {}).p : NET.others.get(by); if (o && o.weapon && o.weapon.F) { z.gk = o.weapon.F.key; z.gm = o.weapon.M ? o.weapon.M.key : ''; } }
  goreTry('kill', () => goreKillNow(z, lvl));
}
function goreKillNow(z, lvl) {
  const P = goreProf(z), R = goreGunOf(z.gk, z.gm), a = z.hitA != null ? z.hitA : Math.random() * TAU, rgb = P.rgb, K = P.gibK;
  const over = (z.ghit || 0) > z.maxHp * 0.9, frozen = (z.frozen && z.stun > 0) || (z.frostK || 0) > 0.5, burnt = z.burnT > 0 || R.fire || (z.charK || 0) > 0.45;
  const blast = z.gsrc === 'blast' || R.blast >= 1, closeShot = R.close && G.p && Math.hypot(G.p.x - z.x, G.p.y - z.y) < 150 * Math.max(1, PK * 1.2);
  const pool = (r, k, x, y, aa, rr) => goreAdd({ k: k || 'pool', x: x == null ? z.x : x, y: y == null ? z.y : y, r: z.r * r, a: aa == null ? a + (Math.random() - 0.5) * 0.6 : aa, rgb: rr || rgb, visc: P.visc, glow: P.glow, fade: P.fade, fx: P.x });
  const flesh = P.deb === 'flesh' ? ['flesh', 'flesh', 'bone'] : [P.deb, P.deb, 'flesh'];
  const gibs = (n, aa, spread, sp) => { for (let i = 0; i < n; i++) goreGib(z.x, z.y, aa + (Math.random() - 0.5) * spread, (sp || 160) * (0.4 + Math.random()) * PK, flesh[(Math.random() * flesh.length) | 0], rgb, (1 + Math.random() * 1.8) * PK * Math.sqrt(K), P.deb === 'ember' || P.deb === 'crystal' || !!P.glow && P.deb !== 'flesh'); };
  if (P.amt < 0.25) {
    // bone, dust, bandages: a heap of what it was made of and very little blood
    gibs(Math.round(6 * K), a, TAU, 90); gorePuff(z.x, z.y, 4, (GORE_HITFX[P.hit] || GORE_HITFX.dust)[0], 6 * PK);
    if (P.amt > 0.1) pool(0.5);
    return;
  }
  if (P.body === 'ecto') {
    // a ghost: a splash of glowing ectoplasm that fades quickly, no body
    pool(1.1); for (let i = 0; i < 3; i++) pool(0.7, 'spray', z.x, z.y, a + (i - 1) * 2.1);
    return;
  }
  if (frozen) {
    // frozen solid: it shatters into ice and frozen chunks, a little slush
    for (let i = 0; i < Math.round(9 * K); i++) goreGib(z.x, z.y, Math.random() * TAU, (90 + Math.random() * 160) * PK, i % 3 ? 'ice' : flesh[0], i % 3 ? [200, 230, 250] : goreMix(rgb, [190, 225, 255], 0.5), (1 + Math.random() * 1.6) * PK, false);
    pool(0.6, 'pool', null, null, null, goreMix(rgb, [190, 225, 255], 0.55)); goreSparks(z.x, z.y, a, 8, ['#e8f8ff', '#bfe8ff'], 220);
    return;
  }
  if (burnt && !blast) {
    // burned: a charred husk, smoke, embers, a little blood cooked dark
    goreAdd({ k: 'husk', x: z.x, y: z.y, r: z.r * 1.15, a: z.ang, rgb: [24, 18, 16], al: 0.75 });
    pool(0.55, 'pool', null, null, null, goreMix(rgb, [30, 18, 14], 0.6)); gorePuff(z.x, z.y, 5, 'rgba(56,52,48,0.7)', 7 * PK); goreSparks(z.x, z.y, a, 5, GORE_HITFX.embers, 120);
    return;
  }
  if (blast || (over && Math.random() < R.gib) || (closeShot && Math.random() < R.gib + 0.25)) {
    // blown apart: pieces everywhere, blood sprayed all round, a pool, scorched if it was an explosion
    const n = Math.round((blast ? 10 : 7) * K * (lvl === 3 ? 1.3 : lvl === 1 ? 0.6 : 1));
    gibs(n, blast ? a : a, blast ? TAU : 1.4, blast ? 220 : 190);
    const rays = blast ? 5 : 3;
    for (let i = 0; i < rays; i++) pool(1.1 * Math.pow(P.amt, 0.35), 'spray', null, null, blast ? i / rays * TAU + Math.random() * 0.6 : a + (i - 1) * 0.5);
    pool(1.15 * Math.sqrt(P.amt)); if (blast) goreAdd({ k: 'scorch', x: z.x, y: z.y, r: z.r * 1.4, rgb: [20, 12, 8], al: 0.55 });
    return;
  }
  // a big round through it (sniper, revolver, hollow points): a chunk torn out and thrown, a long spray
  if (over && Math.random() < R.chunk) {
    for (let i = 0; i < Math.round(3 * K); i++) goreGib(z.x, z.y, a + (Math.random() - 0.5) * 0.5, (180 + Math.random() * 160) * PK, flesh[i % flesh.length], rgb, (1.3 + Math.random() * 1.5) * PK, false);
    pool(1.6 * Math.pow(P.amt, 0.35), 'spray', z.x + Math.cos(a) * z.r * 0.6, z.y + Math.sin(a) * z.r * 0.6, a);
  }
  // the usual: a pool where it fell, the spray of the last shot, and a smear if the hit shoved the body along
  const n = z.boss ? 3 : 1, sz = (1.05 + Math.random() * 0.5) * (z.boss ? 1.3 : 1) * Math.sqrt(P.amt);
  const kv = Math.hypot(z.kvx || 0, z.kvy || 0), slide = Math.min(z.r * 4, kv * 0.012 * z.r + (Math.random() < 0.3 ? z.r * 1.2 : 0));
  if (slide > z.r * 0.8 && GORE.perf > -3) {
    const sa = kv > 20 ? Math.atan2(z.kvy, z.kvx) : a, len = slide + z.r * 1.2;
    goreAdd({ k: 'smear', x: z.x + Math.cos(sa) * len * 0.4, y: z.y + Math.sin(sa) * len * 0.4, r: len / 3.8, a: sa, sy: 1.1, rgb: rgb, visc: P.visc, glow: P.glow, fade: P.fade });
    pool(sz * 0.8, 'pool', z.x + Math.cos(sa) * len * 0.85, z.y + Math.sin(sa) * len * 0.85);
  } else for (let i = 0; i < n; i++) { const off = i ? z.r * 0.6 : 0, oa = Math.random() * TAU; pool(sz, 'pool', z.x + Math.cos(oa) * off, z.y + Math.sin(oa) * off); }
  if (P.x === 'bubbles' && P.amt > 1.2) for (let i = 0; i < 4; i++) pool(0.8, 'spray', null, null, i / 4 * TAU);   // a bloated one bursts all round
  // drops thrown through the air, landing a moment later
  if (lvl >= 2 && Q.burst > 0.5 && goreOn('drops')) {
    const css = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')', m = Math.round((z.boss ? 14 : 5) * Q.burst * Math.min(1.5, P.amt));
    for (let i = 0; i < m; i++) {
      if (G.parts.length >= Q.parts) break;
      const aa = a + (Math.random() - 0.5) * 1.3, sp = 90 + Math.random() * 220;
      G.parts.push({ x: z.x, y: z.y, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, life: 0.18 + Math.random() * 0.3, max: 0.5, c: css, s: 2 + Math.random() * 2.2, bl: rgb, bv: P.visc, glow: !!P.glow });
    }
  }
}
// a drop thrown by a kill lands
function goreLand(q) { if (q.bl && goreLevel() >= 2) goreAdd({ k: 'drop', x: q.x, y: q.y, r: q.s * 0.55, rgb: q.bl, visc: q.bv }); }

/* ---------- every frame ---------- */
function goreTick(dt) {
  const lvl = goreLevel();
  GORE.budget = [0, 6, 12, 18][lvl] * (GORE.perf <= -2 ? 0.6 : 1);
  if (!lvl) return;
  goreTry('gibs', () => goreGibTick(dt));
  if (G.mode !== 'play') return;
  goreTry('drips', () => {
    // the wounded drip as they walk (a crawler leaves a smear); burning ones char and smoke; healers close their wounds
    let n = 0; const cap = Math.max(1, GORE.budget >> 1);
    for (const z of G.zs) {
      if (z.dead || z.fly || z.illusion) continue;
      if (z.burnT > 0) { z.charK = Math.min(0.7, (z.charK || 0) + dt * 0.12); if (Math.random() < dt * 3 && visNearCam(z.x, z.y, 30)) gorePuff(z.x, z.y, 1, 'rgba(70,66,62,0.55)', 5 * PK); }
      if (z.frostK > 0 && !(z.frozen && z.stun > 0)) z.frostK = Math.max(0, z.frostK - dt * 0.08);
      if (z.wnd && z.wnd.length && z.gp && z.gp.heal) { for (const q of z.wnd) q.s -= dt * 0.012; z.wnd = z.wnd.filter(q => q.s > 0.04); }
      if (z.boss || z.hp > z.maxHp * 0.55) continue;
      z.dripT = (z.dripT == null ? Math.random() : z.dripT) - dt;
      if (z.dripT > 0) continue;
      const P = goreProf(z); if (P.amt < 0.25) { z.dripT = 9; continue; }
      z.dripT = (0.3 + Math.random() * 0.9 * (z.hp / z.maxHp + 0.3)) / Math.min(1.6, P.amt);
      if (!visNearCam(z.x, z.y, 40)) continue;
      if (P.x === 'crawl' && Math.hypot(z.vx || 0, z.vy || 0) > 5) goreAdd({ k: 'smear', x: z.x, y: z.y, r: z.r * 0.5, a: Math.atan2(z.vy || 0, z.vx || 1), sy: 0.8, rgb: P.rgb, visc: P.visc });
      else { const a = Math.random() * TAU, d = Math.random() * z.r * 0.6; goreAdd({ k: 'drop', x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d, r: (1 + Math.random() * 1.4) * PK, rgb: P.rgb, visc: P.visc, glow: P.glow, fade: P.fade }); }
      if (++n >= cap) break;
    }
  });
}
function goreGibTick(dt) {
  const B = GORE.gibs; if (!B.length) return;
  for (const b of B) {
    b.t += dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt; b.vh -= 480 * PK * dt; b.h += b.vh * dt;
    if (b.h <= 0) {
      if (!b.bounced && b.vh < -40 * PK) { b.h = 0; b.vh = -b.vh * 0.3; b.vx *= 0.45; b.vy *= 0.45; b.vr *= 0.4; b.bounced = 1; }
      else { b.land = true; }
    }
    if (pointInRect(b.x, b.y)) { b.vx = -b.vx * 0.3; b.vy = -b.vy * 0.3; }
  }
  // landed pieces become stains (they fade and clear like the rest), and leave a small splash
  const PC = GORE.pieces, pcap = [0, 30, 60, 100][goreLevel()] * (GORE.perf <= -2 ? 0.5 : 1);
  for (const b of B) if (b.land) {
    if (typeof waterAt === 'function' && isWater(waterAt(b.x, b.y))) continue;   // pieces sink in water
    PC.push({ k: 'gib', x: b.x, y: b.y, r: b.s, a: b.rot, gt: b.type, rgb: b.rgb, glow: b.glow ? 1 : 0, v: b.v, t0: G.time });
    if (b.type === 'flesh' && Math.random() < 0.5) goreAdd({ k: 'drop', x: b.x, y: b.y, r: b.s * 0.9, rgb: b.rgb });
  }
  if (PC.length > pcap) PC.splice(0, PC.length - pcap);
  GORE.gibs = B.filter(b => !b.land && b.t < 3);
}
// every player's view (in co-op the teammates' too): blood off all of them is cleared
function goreViews() {
  if (frameNo - GORE.viewF < 8 && GORE.views.length) return GORE.views;
  GORE.viewF = frameNo;
  const hw = W / ZOOM / 2, hh = H / ZOOM / 2, m = 0.25, V = GORE.views; V.length = 0;
  V.push([cam.x - hw * (1 + m), cam.y - hh * (1 + m), cam.x + hw * (1 + m), cam.y + hh * (1 + m)]);
  if (typeof NET !== 'undefined' && NET.started) {
    const each = NET.role === 'host' ? Array.from(NET.peers.values()).map(q => q.p).filter(Boolean) : Array.from(NET.others.values());
    const k = 1.15 * (1 + m);
    for (const q of each) if (q && isFinite(q.x) && isFinite(q.y)) V.push([q.x - hw * k, q.y - hh * k, q.x + hw * k, q.y + hh * k]);
  }
  return V;
}
function goreSeen(x, y, r) {
  const V = goreViews();
  for (let i = 0; i < V.length; i++) { const v = V[i]; if (x + r > v[0] && x - r < v[2] && y + r > v[1] && y - r < v[3]) return true; }
  return false;
}
// the stains in view (render() calls this in the ground pass, before anything stands on it)
function goreDraw(vis) {
  const t0 = performance.now();
  try {
    const L = G.splats; if (!L.length && !GORE.gibs.length && !GORE.pieces.length) return;
    const T = ctx.getTransform(), now = G.time, life0 = goreLife(), detail = GORE.perf > -1 && goreOn('detail'), night = CORE.frame.night || 0;
    let drop = 0;
    for (let i = 0; i < L.length; i++) {
      const s = L[i], t = now - s.t0;
      if (!isFinite(t) || !isFinite(s.x) || !isFinite(s.y) || !(s.r > 0)) { s.gone = true; drop++; GORE.fixed++; continue; }   // bad data: thrown out
      // gone with time, or when nobody can see it any more
      const life = (s.k === 'cloud' ? 7 : s.k === 'scorch' || s.k === 'zap' ? life0 * 0.6 : life0) * (s.fade || 1);
      if (t > life) { s.gone = true; drop++; GORE.faded++; continue; }
      const R = s.r * GORE_H * 1.5 * (s.sy > 1 ? s.sy : 1);
      if (!goreSeen(s.x, s.y, R)) { if (!s.oT) s.oT = now; else if (now - s.oT > 1.5) { s.gone = true; drop++; GORE.culled++; continue; } } else s.oT = 0;
      if (!vis(s.x, s.y, R)) continue;
      const out = clamp((life - t) / (life * 0.25), 0, 1);   // the last quarter of its life it fades out
      if (s.k === 'cloud') { goreCloud(s, t, T); continue; }
      const base = (s.al || GORE_A[s.k] || 0.8) * (1 - 0.28 * (s.dil || 0)) * out, gr = goreGrow(s, t);
      if (s.k === 'scorch' || s.k === 'zap' || s.k === 'husk') { const sp = s.spF || (s.spF = goreSprite(s.k, s.v, s.rgb, false, 1)); if (sp) goreBlit(ctx, T, s, sp, base, 1); continue; }
      // each stain keeps the pictures it uses (so a busy street never makes the cache throw away what is on screen)
      const f = clamp((t - GORE_FRESH) / GORE_FADE, 0, 1);
      if (s.fx === 'cool') {
        // molten blood cools to black crust: the glowing picture fades into the crust picture
        const c = clamp(t / 12, 0, 1), sp = s.spF || (s.spF = goreSprite(s.k, s.v, s.rgb, false, s.visc)), sc = s.spC || (s.spC = goreSprite(s.k, s.v, [40, 24, 16], true, s.visc));
        if (sp && c < 1) goreBlit(ctx, T, s, sp, base * (1 - c), gr); if (sc && c > 0) goreBlit(ctx, T, s, sc, base * c, gr);
      } else {
        if (f < 1) { const sp = s.spF || (s.spF = goreSprite(s.k, s.v, s.rgb, false, s.visc)); if (sp) goreBlit(ctx, T, s, sp, base * (1 - f * 0.15), gr); }
        if (f > 0) { const sp = s.spD || (s.spD = goreSprite(s.k, s.v, s.rgb, true, s.visc)); if (sp) goreBlit(ctx, T, s, sp, base * 0.82 * f, gr); }
      }
      if (detail && t < GORE_FRESH && s.fx) goreTry('fx', () => goreFx(s, t, T, gr, base));
      // fresh blood is glossy: a small soft highlight (by day; at night the reflection engine mirrors the lamps in it)
      if (s.k === 'pool' && t < GORE_FRESH && night < 0.6) {
        const k = (1 - t / GORE_FRESH) * 0.14 * (1 - night) * out;
        ctx.setTransform(T); ctx.globalAlpha = k; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(s.x - s.r * gr * 0.22, s.y - s.r * gr * 0.26, s.r * gr * 0.3, s.r * gr * 0.12, -0.6, 0, TAU); ctx.fill();
      }
    }
    if (drop) G.splats = L.filter(s => !s.gone);
    // pieces lying in the street: they fade and clear the same way
    const PC = GORE.pieces; let pd = 0;
    for (const s of PC) {
      const t = now - s.t0, life = life0 * 0.8;
      if (t > life || !isFinite(s.x)) { s.gone = true; pd++; continue; }
      if (!goreSeen(s.x, s.y, 10)) { if (!s.oT) s.oT = now; else if (now - s.oT > 1.5) { s.gone = true; pd++; GORE.culled++; continue; } } else s.oT = 0;
      if (vis(s.x, s.y, 10)) goreGibDraw(s, T, clamp((life - t) / (life * 0.25), 0, 1) * 0.95, true);
    }
    if (pd) GORE.pieces = PC.filter(s => !s.gone);
    // pieces still in the air
    for (const b of GORE.gibs) if (vis(b.x, b.y, 10)) goreGibDraw(b, T, 1, false);
    ctx.setTransform(T); ctx.globalAlpha = 1;
  } catch (e) { goreHurt(e, 'draw'); ctx.globalAlpha = 1; }
  const ms = performance.now() - t0; GORE.ms = ms; goreWatch(ms); coreCost('GORE', ms);
}
// small touches on fresh blood: bubbles on toxic and rotten blood, froth, glitter on crystal, stars in void ichor,
// beads of mercury
function goreFx(s, t, T, gr, base) {
  const x = s.x, y = s.y, r = s.r * gr, R = Z.mulberry32((s.v + 1) * 7919 + (s.x | 0));
  ctx.setTransform(T);
  if (s.fx === 'bubbles') { ctx.globalAlpha = base * 0.7; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = Math.max(0.4, r * 0.03); for (let i = 0; i < 3; i++) { const ph = (t * (0.6 + R()) + R()) % 1, a = R() * TAU, d = R() * r * 0.6; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.06 * ph, 0, TAU); ctx.stroke(); } }
  else if (s.fx === 'froth') { ctx.globalAlpha = base * 0.6; ctx.fillStyle = '#f2ece6'; for (let i = 0; i < 6; i++) { const a = R() * TAU, d = R() * r * 0.7; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.03 + R() * 0.05), 0, TAU); ctx.fill(); } }
  else if (s.fx === 'glitter' || s.fx === 'stars') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = s.fx === 'stars' ? '#d8b8ff' : '#ffffff'; for (let i = 0; i < 5; i++) { const a = R() * TAU, d = R() * r * 0.8, tw = 0.5 + 0.5 * Math.sin(t * (3 + R() * 4) + R() * 6); ctx.globalAlpha = base * tw; ctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.04 + 0.5, r * 0.04 + 0.5); } ctx.globalCompositeOperation = 'source-over'; }
  else if (s.fx === 'mercury') { ctx.globalAlpha = base; ctx.fillStyle = '#eef3f8'; for (let i = 0; i < 4; i++) { const a = R() * TAU, d = r * (0.9 + R() * 0.6); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.05 + R() * 0.06), 0, TAU); ctx.fill(); } }
  else if (s.fx === 'oil') { ctx.globalAlpha = base * 0.35; const g = ctx.createRadialGradient(x, y, 0, x, y, r * 0.8); g.addColorStop(0, 'rgba(120,60,200,0.6)'); g.addColorStop(0.5, 'rgba(40,160,120,0.4)'); g.addColorStop(1, 'rgba(200,160,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.fill(); }
  else if (s.fx === 'frost') { ctx.globalAlpha = base * 0.5; ctx.strokeStyle = '#e8f8ff'; ctx.lineWidth = Math.max(0.4, r * 0.025); for (let i = 0; i < 4; i++) { const a = R() * TAU, d = r * 0.3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d); ctx.lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9); ctx.stroke(); } }
  ctx.globalAlpha = 1;
}
// a piece of a body (flying, or lying where it landed)
const GORE_GIBC = { bone: '#e2dccb', metal: '#8a9098', crystal: '#f4b8e4', ice: '#d8eefa', ember: '#ff9a3a', fluff: '#f2eee6', bandage: '#c8b890', chitin: '#7a8a2a', thorn: '#4a7a22', spark: '#fff36b', ecto: '#bfefff', spore: '#b8c890', sand: '#c8a878', ash: '#7a7876' };
function goreGibDraw(b, T, a, lying) {
  const x = b.x, y = b.y - (lying ? 0 : (b.h || 0)), s = b.s, R = Z.mulberry32(b.v || 1), co = Math.cos(b.rot || b.a || 0), si = Math.sin(b.rot || b.a || 0);
  ctx.setTransform(T.a * co + T.c * si, T.b * co + T.d * si, T.c * co - T.a * si, T.d * co - T.b * si, T.a * x + T.c * y + T.e, T.b * x + T.d * y + T.f);
  const type = b.gt || b.type, rgb = b.rgb || [110, 14, 16];
  if (!lying && b.h > 1) { ctx.globalAlpha = 0.25 * a; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, b.h, s, s * 0.6, 0, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = a;
  if (type === 'flesh' || type === 'ooze') {
    ctx.fillStyle = 'rgb(' + (rgb[0] * 0.8 | 0) + ',' + (rgb[1] * 0.8 | 0) + ',' + (rgb[2] * 0.8 | 0) + ')'; ctx.beginPath();
    const n = 5 + (R() * 3 | 0); for (let i = 0; i < n; i++) { const an = i / n * TAU, d = s * (0.6 + R() * 0.5); if (i) ctx.lineTo(Math.cos(an) * d, Math.sin(an) * d); else ctx.moveTo(Math.cos(an) * d, Math.sin(an) * d); } ctx.closePath(); ctx.fill();
    ctx.fillStyle = type === 'ooze' ? 'rgba(255,255,255,0.35)' : 'rgba(255,170,160,0.35)'; ctx.beginPath(); ctx.arc(-s * 0.2, -s * 0.2, s * 0.3, 0, TAU); ctx.fill();
  } else if (type === 'bone') { ctx.fillStyle = GORE_GIBC.bone; ctx.beginPath(); ctx.ellipse(0, 0, s * 1.2, s * 0.32, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(s * 1.1, 0, s * 0.38, 0, TAU); ctx.arc(-s * 1.1, 0, s * 0.38, 0, TAU); ctx.fill(); }
  else if (type === 'metal' || type === 'chitin' || type === 'crystal' || type === 'ice' || type === 'thorn') {
    ctx.fillStyle = GORE_GIBC[type]; ctx.beginPath(); ctx.moveTo(s * 1.1, 0); ctx.lineTo(-s * 0.3, s * 0.55); ctx.lineTo(-s * 0.9, -s * 0.1); ctx.lineTo(-s * 0.1, -s * 0.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.moveTo(s * 0.9, 0); ctx.lineTo(-s * 0.1, -s * 0.5); ctx.lineTo(-s * 0.2, -s * 0.1); ctx.closePath(); ctx.fill();
  } else if (type === 'ember') { const k = lying ? clamp(1 - (G.time - (b.t0 || G.time)) / 8, 0, 1) : 1; ctx.fillStyle = 'rgb(' + (40 + 215 * k | 0) + ',' + (24 + 130 * k | 0) + ',' + (16 + 40 * k | 0) + ')'; ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, TAU); ctx.fill(); }
  else if (type === 'bandage') { ctx.fillStyle = GORE_GIBC.bandage; ctx.fillRect(-s * 1.2, -s * 0.25, s * 2.4, s * 0.5); }
  else { ctx.fillStyle = GORE_GIBC[type] || GORE_GIBC.flesh || '#7a1a1a'; ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, TAU); ctx.fill(); }
}
// blood in water: a soft cloud that widens and fades
function goreCloud(s, t, T) {
  const k = t / 7, r = s.r * (1 + 2.2 * Math.sqrt(k)), a = 0.42 * (1 - k) * (1 - k);
  if (a < 0.01) return;
  ctx.setTransform(T);
  const x = s.x + Math.cos(s.a) * t * 3 * PK, y = s.y + Math.sin(s.a) * t * 3 * PK;
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(' + s.rgb[0] + ',' + s.rgb[1] + ',' + s.rgb[2] + ',' + a.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + s.rgb[0] + ',' + s.rgb[1] + ',' + s.rgb[2] + ',0)');
  ctx.globalAlpha = 1; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
// at night: glowing blood (and glowing pieces) drawn again over the lit picture, so it glows (a = how dark it is)
function goreEmissive(a) {
  if (!goreOk() || GORE.perf <= -3 || !goreOn('glow')) return;
  goreTry('glow', () => {
    const T = ctx.getTransform(), now = G.time, life0 = goreLife(), k0 = Math.min(1, a * 1.3) * Math.max(0.3, bloomK());
    ctx.globalCompositeOperation = 'lighter';
    for (const s of GORE.pieces) { if (!s.glow || !vis2(s.x, s.y, 8)) continue; ctx.setTransform(T); ctx.globalAlpha = 0.5 * k0 * (s.gt === 'ember' ? clamp(1 - (now - s.t0) / 8, 0, 1) : 1); ctx.fillStyle = s.gt === 'ember' ? '#ff9a3a' : '#f4c8ff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); }
    for (const s of G.splats) {
      if (!s.glow || s.k === 'cloud') continue;
      if (s.k === 'gib') { const R = s.r * 2; if (!vis2(s.x, s.y, R)) continue; ctx.setTransform(T); ctx.globalAlpha = 0.5 * k0; ctx.fillStyle = s.gt === 'ember' ? '#ff9a3a' : '#f4c8ff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); continue; }
      const t = now - s.t0, life = life0 * (s.fade || 1), g = Array.isArray(s.glow) ? s.glow : null; if (!g) continue;
      const gk = g[3] * clamp(1 - t / Math.min(life, 25), 0, 1) * (s.fx === 'flicker' ? 0.6 + 0.4 * Math.random() : s.fx === 'pulse' ? 0.75 + 0.25 * Math.sin(now * 3 + s.v) : 1) * (s.fx === 'cool' ? clamp(1 - t / 10, 0, 1) : 1);
      if (gk < 0.02) continue;
      const R = s.r * GORE_H * 1.5; if (!vis2(s.x, s.y, R)) continue;
      const sp = s.spG || (s.spG = goreSprite(s.k, s.v, [g[0] & 248, g[1] & 248, g[2] & 248], false, s.visc)); if (!sp) continue;
      goreBlit(ctx, T, s, sp, Math.min(1, gk * k0), goreGrow(s, t));
    }
    ctx.setTransform(T); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  });
}
function vis2(x, y, r) { const F = CORE.frame; return x + r > F.x0 && x - r < F.x1 && y + r > F.y0 && y - r < F.y1; }
// the brightest glowing blood near the camera, for the zombie glow engine to light the street with
function goreGlowLights(out, max) {
  if (!goreOk()) return out;
  const now = G.time;
  for (let i = G.splats.length - 1; i >= 0 && out.length < max; i--) {
    const s = G.splats[i]; if (!Array.isArray(s.glow) || s.k !== 'pool') continue;
    const t = now - s.t0; if (t > 18 || !vis2(s.x, s.y, 60)) continue;
    const g = s.glow, k = g[3] * (1 - t / 18) * (s.fx === 'cool' ? clamp(1 - t / 10, 0, 1) : 1); if (k < 0.12) continue;
    out.push({ x: s.x, y: s.y, r: s.r * 9 + 60 * SCL, c0: g[0], c1: g[1], c2: g[2], i: k * 0.55, src: 'blood' });
  }
  return out;
}
// what the reflection engine needs: where the blood is still wet (alpha = how glossy); mercury is a mirror
function goreMirror(a, vis) {
  let any = false, T = null; const now = G.time;
  for (const s of G.splats) {
    if (s.k !== 'pool' && s.k !== 'drop' && s.k !== 'smear') continue;
    const t = now - s.t0; if (t > GORE_FRESH) continue;
    const gr = goreGrow(s, t); if (!vis(s.x, s.y, s.r * gr * GORE_H)) continue;
    const sp = s.spF || (s.spF = goreSprite(s.k, s.v, s.rgb, false, s.visc)); if (!sp) continue;
    if (!T) T = a.getTransform();
    goreBlit(a, T, s, sp, (s.fx === 'mercury' ? 0.5 : 0.1) * (1 - t / GORE_FRESH), gr * 0.75); any = true;
  }
  if (T) a.setTransform(T);
  a.globalAlpha = 1; return any;
}
// a fresh pool under this spot? (for red footprints) -> its colour
function goreUnder(x, y) {
  const now = G.time;
  for (let i = G.splats.length - 1; i >= 0; i--) {
    const s = G.splats[i]; if ((s.k !== 'pool' && s.k !== 'smear') || now - s.t0 > GORE_FRESH + GORE_FADE) continue;
    const r = s.r * goreGrow(s, now - s.t0) * (s.k === 'smear' ? 1.6 : 0.8); if ((x - s.x) * (x - s.x) + (y - s.y) * (y - s.y) < r * r) return s.rgb;
  }
  return null;
}
// the wounds a zombie carries, drawn in its own turning frame right after its sprite (r = its radius)
function goreWounds(g, z, r) {
  if (!goreOn('wounds')) return;
  try { goreWoundsNow(g, z, r); } catch (e) { GORE.featOff.wounds = performance.now() + 60000; goreHurt(e, 'wounds'); }
}
function goreWoundsNow(g, z, r) {
  const P = goreProf(z), rgb = P.rgb, a0 = g.globalAlpha;
  const dk = z.wcs || (z.wcs = 'rgb(' + (rgb[0] * 0.5 | 0) + ',' + (rgb[1] * 0.45 | 0) + ',' + (rgb[2] * 0.45 | 0) + ')'), md = z.wcm || (z.wcm = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')');
  // the whole body: blackened by fire, rimed with frost
  if (z.charK > 0.05) { g.globalAlpha = a0 * z.charK * 0.75; g.fillStyle = '#16100c'; g.beginPath(); g.ellipse(-r * 0.1, 0, r * 0.88, r * 0.98, 0, 0, TAU); g.fill(); }
  if (z.frostK > 0.05) { g.globalAlpha = a0 * z.frostK * 0.5; g.fillStyle = '#d8f0ff'; g.beginPath(); g.ellipse(-r * 0.1, 0, r * 0.9, r, 0, 0, TAU); g.fill(); }
  const w = z.wnd; if (!w || !w.length) { g.globalAlpha = a0; return; }
  for (const q of w) {
    const x = Math.cos(q.a) * q.d * r, y = Math.sin(q.a) * q.d * r, s = q.s * r, R = Z.mulberry32(q.v);
    switch (q.t) {
      case 'hole':
        // a bullet hole: a dark core, a torn red rim, a trickle
        g.globalAlpha = a0 * 0.85; g.fillStyle = md; g.beginPath(); g.ellipse(x, y, s * 1.2, s, q.a, 0, TAU); g.fill();
        g.globalAlpha = a0; g.fillStyle = '#120606'; g.beginPath(); g.arc(x, y, s * 0.45, 0, TAU); g.fill();
        g.globalAlpha = a0 * 0.7; g.fillStyle = md; g.beginPath(); g.ellipse(x - s * 0.9, y + s * 0.2, s * 0.9, s * 0.26, 0.2, 0, TAU); g.fill();
        break;
      case 'exit':
        // an exit wound: bigger, ragged, flesh showing
        g.globalAlpha = a0 * 0.9; g.fillStyle = md; g.beginPath(); for (let i = 0; i < 8; i++) { const an = i / 8 * TAU, d = s * (0.8 + R() * 0.6); if (i) g.lineTo(x + Math.cos(an) * d, y + Math.sin(an) * d); else g.moveTo(x + Math.cos(an) * d, y + Math.sin(an) * d); } g.closePath(); g.fill();
        g.globalAlpha = a0; g.fillStyle = dk; g.beginPath(); g.arc(x, y, s * 0.55, 0, TAU); g.fill();
        g.fillStyle = 'rgba(230,170,160,0.6)'; g.beginPath(); g.arc(x + s * 0.2, y - s * 0.15, s * 0.22, 0, TAU); g.fill();
        break;
      case 'burn':
        // a burn: charred black, an ember rim that dies down, cracked skin
        g.globalAlpha = a0 * 0.92; g.fillStyle = '#1a120e'; g.beginPath(); g.ellipse(x, y, s * 1.3, s, q.a, 0, TAU); g.fill();
        { const hot = clamp(1 - (G.time - q.t0) / 4, 0, 1); if (hot > 0) { g.globalAlpha = a0 * hot * 0.8; g.strokeStyle = '#ff8a2a'; g.lineWidth = s * 0.18; g.beginPath(); g.ellipse(x, y, s * 1.2, s * 0.9, q.a, 0, TAU); g.stroke(); } }
        g.globalAlpha = a0 * 0.5; g.strokeStyle = '#3a2a22'; g.lineWidth = s * 0.08; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s * 0.8, y + s * 0.3); g.stroke();
        break;
      case 'frost':
        g.globalAlpha = a0 * 0.8; g.fillStyle = '#e4f6ff'; g.beginPath(); g.ellipse(x, y, s * 1.2, s, q.a, 0, TAU); g.fill();
        g.strokeStyle = '#ffffff'; g.lineWidth = s * 0.1; g.beginPath(); for (let i = 0; i < 3; i++) { const an = R() * TAU; g.moveTo(x, y); g.lineTo(x + Math.cos(an) * s * 1.4, y + Math.sin(an) * s * 1.4); } g.stroke();
        break;
      case 'acid':
        g.globalAlpha = a0 * 0.85; g.fillStyle = '#4a6a14'; g.beginPath(); g.ellipse(x, y, s * 1.2, s, q.a, 0, TAU); g.fill();
        g.fillStyle = '#b8ec4a'; for (let i = 0; i < 3; i++) { const an = R() * TAU, d = R() * s * 0.8; g.beginPath(); g.arc(x + Math.cos(an) * d, y + Math.sin(an) * d, s * (0.15 + 0.15 * Math.abs(Math.sin(G.time * 3 + i))), 0, TAU); g.fill(); }
        break;
      case 'zap':
        // an electrical burn: branching dark lines
        g.globalAlpha = a0 * 0.85; g.strokeStyle = '#140e10'; g.lineWidth = Math.max(0.5, s * 0.12); g.beginPath();
        for (let i = 0; i < 4; i++) { let px = x, py = y, an = R() * TAU; g.moveTo(px, py); for (let k = 0; k < 3; k++) { an += (R() - 0.5) * 1.2; px += Math.cos(an) * s * 0.6; py += Math.sin(an) * s * 0.6; g.lineTo(px, py); } }
        g.stroke(); break;
      case 'chunk':
        // a chunk missing at the edge of the body: a torn crater, flesh and bone inside
        { const ex = Math.cos(q.a) * r * 0.82, ey = Math.sin(q.a) * r * 0.82;
          g.globalAlpha = a0; g.fillStyle = dk; g.beginPath(); g.arc(ex, ey, s * 1.6, 0, TAU); g.fill();
          g.fillStyle = md; g.beginPath(); g.arc(ex - Math.cos(q.a) * s * 0.3, ey - Math.sin(q.a) * s * 0.3, s * 1.05, 0, TAU); g.fill();
          g.fillStyle = '#e8e0cc'; g.beginPath(); g.ellipse(ex, ey, s * 0.6, s * 0.18, q.a + 1.2, 0, TAU); g.fill(); }
        break;
      case 'crack':
        // bone, crystal, ice and shell crack instead of bleeding
        g.globalAlpha = a0 * 0.85; g.strokeStyle = P.body === 'crystal' ? '#fff0fa' : P.body === 'ice' ? '#ffffff' : '#2a2018'; g.lineWidth = Math.max(0.5, s * 0.14); g.beginPath();
        for (let i = 0; i < 3; i++) { let px = x, py = y, an = R() * TAU; g.moveTo(px, py); for (let k = 0; k < 2; k++) { an += (R() - 0.5) * 1; px += Math.cos(an) * s * 0.9; py += Math.sin(an) * s * 0.9; g.lineTo(px, py); } }
        g.stroke(); break;
      case 'dent':
        // a round off metal: a bright dented ring and scratches
        g.globalAlpha = a0 * 0.9; g.fillStyle = '#5a6068'; g.beginPath(); g.arc(x, y, s * 0.8, 0, TAU); g.fill();
        g.strokeStyle = '#e4ecf4'; g.lineWidth = s * 0.2; g.beginPath(); g.arc(x, y, s * 0.6, -1.2, 1.4); g.stroke();
        break;
      case 'ecto':
        g.globalAlpha = a0 * 0.7; g.fillStyle = '#e0faff'; g.beginPath(); g.arc(x, y, s * 0.9, 0, TAU); g.fill();
        g.fillStyle = '#0c1a22'; g.beginPath(); g.arc(x, y, s * 0.4, 0, TAU); g.fill();
        break;
    }
  }
  g.globalAlpha = a0;
}
// the engine's own clock: once a second it compares its cost with its share of the frame and drops or takes back detail
function goreWatch(ms) {
  GORE.msAvg += (ms - GORE.msAvg) * 0.08;
  const now = performance.now(); if (now - GORE.msT < 1000) return; GORE.msT = now;
  const budget = 1000 / targetFps() * 0.07;
  if (GORE.msAvg > budget && PERF.fps && PERF.fps < targetFps() * 0.95) { if (GORE.perf > -3) { GORE.perf--; GORE.good = 0; } }
  else if (GORE.msAvg < budget * 0.4) { if (++GORE.good >= 6 && GORE.perf < 0) { GORE.perf++; GORE.good = 0; } }
  else GORE.good = 0;
}
// what the engine hub asks: is everything sound? (and if not, mend it)
function goreCheck() {
  const cap = goreCap(Math.max(1, goreLevel()));
  if (G.splats.length > cap * 2) return 'too many stains (' + G.splats.length + ')';
  if (GORE.gibs.length > 200 || GORE.pieces.length > 300) return 'too many pieces';
  return '';
}
function goreNotes() { const off = Object.keys(GORE.featOff).filter(f => GORE.featOff[f] > performance.now()); return off.length ? 'resting: ' + off.join(', ') : ''; }
function goreRepair() {
  goreForget(); GORE.offUntil = 0; GORE.errT.length = 0; GORE.featOff = {};
  G.splats = G.splats.filter(s => isFinite(s.x) && isFinite(s.y) && s.r > 0).slice(-goreCap(Math.max(1, goreLevel())));
  GORE.gibs.length = 0; GORE.pieces = GORE.pieces.filter(s => isFinite(s.x) && isFinite(s.y));
}
// stains hold on to their pictures; this lets go of them all (a memory squeeze, a repair, a step down)
function goreForget() { GORE.spr.clear(); for (const L of [G.splats, GORE.pieces]) for (const s of L) s.spF = s.spD = s.spC = s.spG = null; }
function goreReset() { GORE.gibs.length = 0; GORE.pieces.length = 0; GORE.views.length = 0; }
function goreHurt(e, part) {
  const now = performance.now(); coreHurt('GORE', e); try { console.error(e); } catch (x) { }
  GORE.errT.push(now); while (GORE.errT.length && now - GORE.errT[0] > 10000) GORE.errT.shift();
  if (GORE.errT.length >= 6) { GORE.offUntil = now + 60000; GORE.errT.length = 0; goreForget(); coreRepaired('GORE', 'Blood paused for a minute after errors (plain stains meanwhile)'); }
  else if (GORE.errT.length >= 4 && GORE.adapt > -2) { GORE.adapt--; goreForget(); coreRepaired('GORE', 'Blood stepped down a level'); }
  else if (part) coreRepaired('GORE', 'Blood: ' + part + ' switched off for a minute');
}
coreAdd({
  name: 'GORE', kind: 'render', ver: 2, needs: ['LUX', 'MIRROR'], provides: ['blood', 'wounds', 'glowBlood'],
  does: 'Blood engine: blood for every zombie type (glowing for toxic, radioactive, molten, void, electric and spectral ones), a reaction to every gun and mod on every zombie and boss (bullet holes, exit wounds, burns, frost, electrical scorches, missing chunks, bodies blown apart or burned to husks), sprays in the direction of the shot, 50 variants each of spray, smear and puddle, blood that fades and clears when no player can see it.',
  state: () => goreLevel() ? (G.splats.length ? 'on' : 'idle') : 'off',
  level: () => ['off', 'few', 'normal', 'lots'][goreLevel()] + (GORE.perf ? ', detail ' + GORE.perf : '') + ', ' + G.splats.length + ' stains, ' + GORE.pieces.length + ' pieces, ' + GORE.culled + ' cleared off screen, ' + GORE.faded + ' faded',
  canTrim: () => goreLevel() > 1, trim: () => { if (GORE.adapt <= -2) return false; GORE.adapt--; return true; }, boost: () => { if (GORE.adapt >= 0) return false; GORE.adapt++; return true; },
  check: goreCheck, notes: goreNotes, repair: goreRepair, isolate: () => { GORE.offUntil = performance.now() + 60000; }, restore: () => { GORE.offUntil = 0; },
  save: () => ({ a: GORE.adapt, p: GORE.perf }), load: v => { if (v) { GORE.adapt = clamp(v.a | 0, -2, 0); GORE.perf = clamp(v.p | 0, -2, 0); } },
  on: { run: () => goreReset(), quality: () => { GORE.perf = 0; GORE.good = 0; }, lowMemory: d => { goreForget(); if (d && d.level >= 1 && GORE.pieces.length > 20) GORE.pieces.splice(0, GORE.pieces.length - 20); } }
});
