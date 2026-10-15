/* Zombie City — mutation system.
   20 strains x 25 abilities = 500 unique mutations.
   Strain = body type: sets durability, speed, damage, size, a passive trait and the base look.
   Ability = behaviour: changes stats again, adds an active power and a visual feature.
   Every mutation also gets a small seeded stat roll and colour shift, so no two are identical. */
var ZC = (function () {
  'use strict';

  function hash32(n) {
    n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4);
    n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return n >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // p = passive. dr: damage reduction, dodge: chance bullets pass, regen: share of max HP per second,
  // onHit: effect on you, death: effect when killed, blink: sidestep teleport, reach: longer grab, kb: knockback taken.
  var STRAINS = [
    { key: 'shambling', name: 'Shambling', hp: 1, spd: 1, dmg: 1, size: 1, threat: 1, skin: [88, 16, 46], cloth: [25, 18, 30], eye: '#f4e9b0', clothed: true, trait: 'No special trait. The most common infected.', p: {} },
    { key: 'rabid', name: 'Rabid', hp: 0.7, spd: 1.55, dmg: 0.9, size: 0.9, threat: 2, skin: [12, 30, 50], cloth: [210, 12, 26], eye: '#ff4a3d', clothed: true, trait: 'Very fast but fragile.', p: {} },
    { key: 'brutish', name: 'Brutish', hp: 2.1, spd: 0.8, dmg: 1.6, size: 1.3, threat: 3, skin: [75, 18, 40], cloth: [30, 22, 22], eye: '#f0d070', clothed: true, trait: 'Thick muscle. Hits hard and shrugs off knockback.', p: { kb: 0.5 } },
    { key: 'bloated', name: 'Bloated', hp: 2.6, spd: 0.62, dmg: 1.1, size: 1.4, threat: 2, skin: [64, 28, 50], cloth: [50, 10, 30], eye: '#e8e070', trait: 'Bursts in a bile spray when killed.', p: { death: 'bile' } },
    { key: 'crawling', name: 'Crawling', hp: 0.55, spd: 1.2, dmg: 0.8, size: 0.72, threat: 1, skin: [95, 12, 42], cloth: [0, 0, 22], eye: '#d8f0a0', clothed: true, trait: 'Small and low to the ground. Hard to hit.', p: {} },
    { key: 'ironhide', name: 'Ironhide', hp: 1.5, spd: 0.8, dmg: 1.1, size: 1.1, threat: 3, skin: [80, 10, 40], cloth: [210, 6, 30], eye: '#ffb347', clothed: true, trait: 'Scrap-metal plates block 35% of damage.', p: { dr: 0.35 } },
    { key: 'skeletal', name: 'Skeletal', hp: 0.6, spd: 1.3, dmg: 1, size: 0.95, threat: 2, skin: [42, 25, 80], cloth: [30, 10, 16], eye: '#5ff0ff', trait: '15% of bullets pass between the ribs.', p: { dodge: 0.15 } },
    { key: 'toxic', name: 'Toxic', hp: 1, spd: 1, dmg: 1, size: 1, threat: 2, skin: [100, 50, 36], cloth: [90, 30, 18], eye: '#d4ff3a', clothed: true, trait: 'Hits poison you.', p: { onHit: 'poison' } },
    { key: 'frostbitten', name: 'Frostbitten', hp: 1.2, spd: 0.9, dmg: 1, size: 1, threat: 2, skin: [205, 35, 68], cloth: [215, 25, 30], eye: '#e0f6ff', clothed: true, trait: 'Hits chill you and slow you down.', p: { onHit: 'chill' } },
    { key: 'charred', name: 'Charred', hp: 1.1, spd: 1.1, dmg: 1.1, size: 1, threat: 3, skin: [18, 22, 16], cloth: [0, 0, 8], eye: '#ff8a2a', trait: 'Hits set you on fire.', p: { onHit: 'burn' } },
    { key: 'fungal', name: 'Fungal', hp: 1.3, spd: 0.85, dmg: 0.9, size: 1.05, threat: 2, skin: [28, 22, 40], cloth: [30, 15, 22], eye: '#fff0c0', clothed: true, trait: 'Spores slowly regrow its flesh.', p: { regen: 0.015 } },
    { key: 'crystal', name: 'Crystal', hp: 1.4, spd: 0.9, dmg: 1.2, size: 1.05, threat: 4, skin: [178, 42, 60], cloth: [190, 30, 30], eye: '#ffffff', trait: 'Crystal growths block 25% of damage.', p: { dr: 0.25 } },
    { key: 'void', name: 'Void', hp: 1.1, spd: 1.15, dmg: 1.2, size: 1, threat: 4, skin: [265, 30, 22], cloth: [270, 40, 10], eye: '#c58bff', trait: 'Flickers sideways through space.', p: { blink: true } },
    { key: 'volt', name: 'Volt', hp: 1, spd: 1.25, dmg: 1, size: 0.95, threat: 3, skin: [52, 22, 32], cloth: [50, 30, 15], eye: '#fff36b', trait: 'Hits jam your gun for a moment.', p: { onHit: 'jam' } },
    { key: 'rotten', name: 'Rotten', hp: 0.9, spd: 0.95, dmg: 1.3, size: 1, threat: 1, skin: [45, 30, 32], cloth: [35, 15, 20], eye: '#e8d26a', clothed: true, trait: 'Leaves slowing sludge when killed.', p: { death: 'sludge' } },
    { key: 'colossal', name: 'Colossal', hp: 4, spd: 0.55, dmg: 2.2, size: 1.85, threat: 5, skin: [82, 14, 34], cloth: [20, 20, 16], eye: '#ff6b3d', trait: 'Towering. Cannot be knocked back.', p: { kb: 0 } },
    { key: 'wraith', name: 'Wraith', hp: 0.8, spd: 1.35, dmg: 1, size: 1, threat: 4, skin: [225, 40, 82], cloth: [230, 30, 60], eye: '#7fe8ff', trait: '30% of bullets pass right through.', p: { dodge: 0.3, ghost: true } },
    { key: 'chitin', name: 'Chitin', hp: 1.3, spd: 1.2, dmg: 1.1, size: 1, threat: 3, skin: [95, 24, 26], cloth: [85, 30, 16], eye: '#ffcf3a', trait: 'Insect shell blocks 15% of damage.', p: { dr: 0.15 } },
    { key: 'magma', name: 'Magma', hp: 1.6, spd: 0.85, dmg: 1.4, size: 1.15, threat: 4, skin: [12, 30, 14], cloth: [10, 40, 8], eye: '#ffcc33', trait: 'Hits burn. Leaves fire behind when killed.', p: { onHit: 'burn', death: 'fire' } },
    { key: 'abyssal', name: 'Abyssal', hp: 1.4, spd: 1, dmg: 1.3, size: 1.1, threat: 5, skin: [195, 40, 24], cloth: [200, 50, 12], eye: '#3affd2', trait: 'Tentacles grab you from further away.', p: { reach: 22, kb: 0.5 } },
    // ---- Outbreak II: strains 21-40 (mutations #501-1000)
    { key: 'plagued', name: 'Plagued', hp: 1.1, spd: 0.95, dmg: 1, size: 1, threat: 2, skin: [285, 15, 40], cloth: [280, 12, 22], eye: '#e6b3ff', clothed: true, trait: 'Hits weaken your gun: 35% less damage for 3 seconds.', p: { onHit: 'weaken' } },
    { key: 'feral', name: 'Feral', hp: 0.85, spd: 1.45, dmg: 1.1, size: 0.95, threat: 2, skin: [30, 30, 34], cloth: [25, 25, 20], eye: '#ffd23a', trait: 'Hunts in packs. Faster when other zombies are close.', p: { pack: true } },
    { key: 'glacial', name: 'Glacial', hp: 1.6, spd: 0.7, dmg: 1.2, size: 1.15, threat: 3, skin: [195, 45, 74], cloth: [200, 40, 45], eye: '#9ff6ff', trait: 'Ice armor blocks 25% of damage. Hits freeze you solid for a moment.', p: { dr: 0.25, onHit: 'freeze' } },
    { key: 'mummified', name: 'Mummified', hp: 1.2, spd: 0.85, dmg: 1, size: 1, threat: 3, skin: [40, 30, 62], cloth: [38, 25, 72], eye: '#5fd4ff', trait: 'Gets back up once after it is killed.', p: { revive: true } },
    { key: 'swamp', name: 'Swamp', hp: 1.1, spd: 0.9, dmg: 1, size: 1.05, threat: 1, skin: [80, 25, 28], cloth: [90, 30, 20], eye: '#c8e86a', clothed: true, trait: 'Bursts into a poison spore cloud when killed.', p: { death: 'spores' } },
    { key: 'irradiated', name: 'Irradiated', hp: 1.1, spd: 1, dmg: 1.1, size: 1, threat: 4, skin: [75, 60, 45], cloth: [60, 40, 22], eye: '#eaff4a', clothed: true, trait: 'Radiation burns you when you stand close.', p: { rad: true } },
    { key: 'cyborg', name: 'Cyborg', hp: 1.4, spd: 1, dmg: 1.2, size: 1.05, threat: 3, skin: [15, 18, 50], cloth: [215, 8, 40], eye: '#ff3030', trait: 'Steel half-frame blocks 20% of damage. Hits knock you flying.', p: { dr: 0.2, onHit: 'knock' } },
    { key: 'puppet', name: 'Puppet', hp: 0.9, spd: 1.05, dmg: 1, size: 0.95, threat: 2, skin: [30, 35, 55], cloth: [350, 35, 30], eye: '#ffffff', clothed: true, trait: 'Jerks forward in sudden bursts of speed.', p: { stutter: true } },
    { key: 'stalker', name: 'Stalker', hp: 0.9, spd: 1.25, dmg: 1.2, size: 1, threat: 4, skin: [220, 10, 20], cloth: [230, 15, 12], eye: '#ff2d55', clothed: true, trait: 'Nearly invisible from afar. Your gun only locks on when it is close.', p: { camo: true } },
    { key: 'brood', name: 'Brood', hp: 1.2, spd: 0.85, dmg: 0.9, size: 1.1, threat: 3, skin: [50, 22, 44], cloth: [40, 20, 25], eye: '#ffe08a', trait: 'Hatches three biting larvae when killed.', p: { death: 'brood' } },
    { key: 'ashen', name: 'Ashen', hp: 1, spd: 1.05, dmg: 1, size: 1, threat: 2, skin: [0, 0, 55], cloth: [0, 0, 30], eye: '#ff9a3c', clothed: true, trait: 'Hits throw ash in your eyes and darken your view.', p: { onHit: 'blind' } },
    { key: 'dune', name: 'Dune', hp: 0.95, spd: 1.15, dmg: 1, size: 0.95, threat: 1, skin: [38, 40, 55], cloth: [35, 35, 40], eye: '#ffe6a0', clothed: true, trait: 'Swirling sand makes 20% of bullets miss.', p: { dodge: 0.2 } },
    { key: 'sanguine', name: 'Sanguine', hp: 1, spd: 1.1, dmg: 1.1, size: 1, threat: 3, skin: [355, 55, 35], cloth: [350, 40, 18], eye: '#ffd0d0', trait: 'Hits make you bleed and heal it.', p: { onHit: 'bleed', lifesteal: true } },
    { key: 'bramble', name: 'Bramble', hp: 1.3, spd: 0.85, dmg: 1, size: 1.05, threat: 3, skin: [70, 30, 30], cloth: [30, 30, 22], eye: '#ff6a3d', trait: 'Thorny vines root you in place when it hits.', p: { onHit: 'root' } },
    { key: 'ghoul', name: 'Ghoul', hp: 1, spd: 1.15, dmg: 1.3, size: 1, threat: 2, skin: [60, 8, 70], cloth: [0, 0, 25], eye: '#b0ff6a', trait: 'Feeds on the fallen. Heals when zombies die near it.', p: { feed: true } },
    { key: 'chrome', name: 'Chrome', hp: 1.3, spd: 1, dmg: 1.1, size: 1.05, threat: 4, skin: [210, 10, 70], cloth: [210, 10, 45], eye: '#5ad0ff', trait: 'Mirror skin bounces 15% of bullets back at you.', p: { reflect: 0.15 } },
    { key: 'infernal', name: 'Infernal', hp: 1.3, spd: 1.05, dmg: 1.3, size: 1.1, threat: 4, skin: [0, 65, 32], cloth: [0, 50, 12], eye: '#ffd23a', trait: 'Flies into a rage when zombies die near it.', p: { enrage: true } },
    { key: 'hollow', name: 'Hollow', hp: 1.1, spd: 1.05, dmg: 1.1, size: 1, threat: 5, skin: [40, 15, 22], cloth: [40, 10, 12], eye: '#ffb04a', trait: 'A burning wisp escapes its shell and hunts you when it dies.', p: { death: 'wisp' } },
    { key: 'stitched', name: 'Stitched', hp: 1.6, spd: 0.9, dmg: 1.2, size: 1.15, threat: 2, skin: [110, 15, 52], cloth: [25, 20, 22], eye: '#7af0ff', trait: 'Surges with power when it drops below half health.', p: { surge: true } },
    { key: 'twinhead', name: 'Twinhead', hp: 1.8, spd: 0.9, dmg: 1.1, size: 1.25, threat: 5, skin: [15, 25, 45], cloth: [0, 0, 15], eye: '#ff7a3a', trait: 'Two heads, two bites. Attacks twice as often.', p: { twin: true, kb: 0.5 } }
  ];

  var ABILITIES = [
    { key: 'lunger', name: 'Lunger', hp: 1, spd: 1, dmg: 1, size: 1, threat: 1, desc: 'Leaps at you from close range.' },
    { key: 'spitter', name: 'Spitter', hp: 0.9, spd: 0.9, dmg: 0.9, size: 1, threat: 2, desc: 'Spits acid globs from range.' },
    { key: 'bomber', name: 'Bomber', hp: 0.8, spd: 1.05, dmg: 1, size: 1, threat: 2, desc: 'Detonates when it reaches you or dies.' },
    { key: 'splitter', name: 'Splitter', hp: 1.1, spd: 1, dmg: 1, size: 1.05, threat: 2, desc: 'Splits into two smaller copies when killed.' },
    { key: 'warden', name: 'Warden', hp: 1, spd: 0.95, dmg: 1, size: 1, threat: 3, desc: 'Carries a recharging bio-shield.' },
    { key: 'regrower', name: 'Regrower', hp: 1.1, spd: 1, dmg: 1, size: 1, threat: 2, desc: 'Regenerates health quickly.' },
    { key: 'blinker', name: 'Blinker', hp: 0.9, spd: 1, dmg: 1, size: 1, threat: 3, desc: 'Teleports right next to you.' },
    { key: 'caller', name: 'Caller', hp: 1.2, spd: 0.85, dmg: 1, size: 1.05, threat: 4, desc: 'Summons small minions.' },
    { key: 'screamer', name: 'Screamer', hp: 1, spd: 1, dmg: 0.9, size: 1, threat: 3, desc: 'Screams to speed up the horde around it.' },
    { key: 'leech', name: 'Leech', hp: 1, spd: 1.05, dmg: 1, size: 1, threat: 2, desc: 'Heals and grows every time it hits you.' },
    { key: 'burrower', name: 'Burrower', hp: 1, spd: 1, dmg: 1.1, size: 1, threat: 3, desc: 'Tunnels underground where bullets cannot reach.' },
    { key: 'charger', name: 'Charger', hp: 1.3, spd: 0.9, dmg: 1.3, size: 1.05, threat: 3, desc: 'Winds up and charges in a straight line.' },
    { key: 'oozer', name: 'Oozer', hp: 1, spd: 1, dmg: 1, size: 1, threat: 1, desc: 'Leaves burning acid puddles behind it.' },
    { key: 'chiller', name: 'Chiller', hp: 1.1, spd: 0.95, dmg: 1, size: 1, threat: 2, desc: 'A frost aura slows you when close.' },
    { key: 'shocker', name: 'Shocker', hp: 1, spd: 1, dmg: 1, size: 1, threat: 3, desc: 'Zaps you with arcing lightning.' },
    { key: 'phantom', name: 'Phantom', hp: 0.9, spd: 1.1, dmg: 1, size: 1, threat: 4, desc: 'Phases out of reality. Bullets pass through.' },
    { key: 'spiker', name: 'Spiker', hp: 1, spd: 1, dmg: 1, size: 1, threat: 2, desc: 'Bursts into a ring of bone spikes when killed.' },
    { key: 'medic', name: 'Medic', hp: 1, spd: 0.9, dmg: 0.9, size: 1, threat: 3, desc: 'Heals other zombies nearby.' },
    { key: 'magnet', name: 'Magnet', hp: 1.2, spd: 0.8, dmg: 1, size: 1.05, threat: 3, desc: 'Drags you toward it.' },
    { key: 'berserker', name: 'Berserker', hp: 1.1, spd: 1, dmg: 1.1, size: 1, threat: 3, desc: 'Gets faster and stronger as it is hurt.' },
    { key: 'juggernaut', name: 'Juggernaut', hp: 1.8, spd: 0.85, dmg: 1.2, size: 1.2, threat: 4, desc: 'Takes 40% less damage and cannot be pushed.' },
    { key: 'hive', name: 'Hive', hp: 1, spd: 1, dmg: 1, size: 1, threat: 2, desc: 'Releases biting flies when shot.' },
    { key: 'trickster', name: 'Trickster', hp: 1, spd: 1.05, dmg: 1, size: 1, threat: 4, desc: 'Creates fake copies of itself.' },
    { key: 'voidheart', name: 'Voidheart', hp: 1, spd: 1, dmg: 1, size: 1, threat: 5, desc: 'Collapses into a black hole when killed.' },
    { key: 'sniper', name: 'Sniper', hp: 0.9, spd: 0.9, dmg: 1, size: 1, threat: 4, desc: 'Locks on and fires bone bolts from far away.' }
  ];

  var RARITY = [
    { key: 'common', name: 'Common', color: '#a9adb5' },
    { key: 'uncommon', name: 'Uncommon', color: '#7bc96a' },
    { key: 'rare', name: 'Rare', color: '#5aa8ff' },
    { key: 'epic', name: 'Epic', color: '#bb7cff' },
    { key: 'legendary', name: 'Legendary', color: '#ff8a3d' }
  ];
  function rarityOf(t) { return t <= 3 ? 0 : t <= 5 ? 1 : t <= 7 ? 2 : t === 8 ? 3 : 4; }
  // Highest threat allowed to spawn in a wave. Threat 2..10.
  function threatCap(w) { return Math.min(10, 3 + Math.floor((w - 1) * 0.6)); }
  function firstWave(t) { for (var w = 1; w < 60; w++) if (threatCap(w) >= t) return w; return 60; }

  function buildMutations() {
    var list = [];
    for (var s = 0; s < STRAINS.length; s++) {
      for (var a = 0; a < ABILITIES.length; a++) {
        var S = STRAINS[s], A = ABILITIES[a], id = s * ABILITIES.length + a;
        var rnd = mulberry32(hash32(id * 7919 + 13));
        var jh = 0.92 + rnd() * 0.16, js = 0.94 + rnd() * 0.12, jd = 0.95 + rnd() * 0.1;
        var threat = S.threat + A.threat;
        list.push({
          id: id, num: id + 1, s: s, a: a, S: S, A: A,
          name: S.name + ' ' + A.name,
          threat: threat, rarity: rarityOf(threat), wave: firstWave(threat),
          hp: S.hp * A.hp * jh, spd: S.spd * A.spd * js, dmg: S.dmg * A.dmg * jd, size: S.size * A.size,
          hue: (rnd() - 0.5) * 22, seed: hash32(id + 1)
        });
      }
    }
    return list;
  }

  // ---------- drawing ----------
  // Draws a mutation centred on (0,0), facing +x, body radius r.
  // o.sil: dark silhouette (unfound), o.noAbility: plain minion version.
  function drawMutation(g, m, r, o) {
    o = o || {};
    var S = m.S, k = S.key, ak = o.noAbility ? null : m.A.key, sil = !!o.sil;
    var R = mulberry32(m.seed), H = m.hue;
    var SIL = 'rgba(6,8,11,1)';
    function col(c, dl, ds, a) {
      if (sil) return SIL;
      return 'hsla(' + (((c[0] + H) % 360) + 360) % 360 + ',' + clamp(c[1] + (ds || 0), 0, 100) + '%,' + clamp(c[2] + (dl || 0), 0, 100) + '%,' + (a == null ? 1 : a) + ')';
    }
    function C(css) { return sil ? SIL : css; }
    function glow(color, blur) { if (!sil) { g.shadowColor = color; g.shadowBlur = blur; } }
    function noGlow() { g.shadowBlur = 0; g.shadowColor = 'transparent'; }
    function ell(x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); }
    function circ(x, y, rr) { g.beginPath(); g.arc(x, y, Math.max(0.1, rr), 0, Math.PI * 2); }
    function line(x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
    function tri(x1, y1, x2, y2, x3, y3) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3); g.closePath(); }
    function hex(x, y, rr) { g.beginPath(); for (var i = 0; i < 6; i++) { var t = i * Math.PI / 3; g.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); } g.closePath(); }
    // point on body ellipse edge at angle t, pushed out by f
    function edge(t, f) { return [Math.cos(t) * bw * (f || 1), Math.sin(t) * bh * (f || 1)]; }
    function spikeRing(n, len, w, fill, skipFront) {
      g.fillStyle = fill;
      for (var i = 0; i < n; i++) {
        var t = (i + 0.5) / n * Math.PI * 2;
        if (skipFront && Math.cos(t) > 0.55) continue;
        var e1 = edge(t - w, 0.92), e2 = edge(t + w, 0.92), tip = edge(t, 1 + len);
        tri(e1[0], e1[1], tip[0], tip[1], e2[0], e2[1]); g.fill();
      }
    }

    var skin = col(S.skin), skinD = col(S.skin, -12), skinL = col(S.skin, 12);
    var cloth = col(S.cloth), clothD = col(S.cloth, -6), clothL = col(S.cloth, 10);
    var bone = C('#d9cfb4'), boneD = C('#9c9078');
    var eye = S.eye;
    if (ak === 'blinker') eye = '#b78bff';
    if (ak === 'berserker') eye = '#ff2a2a';

    var bw = r * 0.62, bh = r, hr = r * 0.44, hx = r * 0.26, armL = 1.05, armW = r * 0.26, handR = r * 0.2;
    switch (k) {
      case 'rabid': bh = r * 0.82; armL = 1.25; armW = r * 0.2; hr = r * 0.4; break;
      case 'brutish': bh = r * 1.08; armW = r * 0.36; hr = r * 0.38; handR = r * 0.3; break;
      case 'colossal': bh = r * 1.06; armW = r * 0.34; hr = r * 0.36; handR = r * 0.3; break;
      case 'bloated': bw = r * 0.92; bh = r * 0.95; hr = r * 0.34; hx = r * 0.62; armL = 0.95; armW = r * 0.2; break;
      case 'crawling': bw = r * 0.9; bh = r * 0.58; hx = r * 0.72; hr = r * 0.4; armL = 1.4; armW = r * 0.2; break;
      case 'skeletal': armW = r * 0.13; handR = r * 0.15; break;
      case 'chitin': bw = r * 0.75; bh = r * 0.85; break;
      case 'wraith': armW = r * 0.18; break;
      case 'feral': bw = r * 0.7; bh = r * 0.86; hr = r * 0.4; armW = r * 0.22; armL = 1.15; break;
      case 'glacial': bh = r * 1.05; armW = r * 0.3; handR = r * 0.24; break;
      case 'puppet': armW = r * 0.17; handR = r * 0.17; break;
      case 'ghoul': armL = 1.2; armW = r * 0.16; handR = r * 0.14; break;
      case 'twinhead': bh = r * 1.1; hr = r * 0.36; hx = r * 0.22; armW = r * 0.3; break;
      case 'stitched': armW = r * 0.3; handR = r * 0.24; break;
    }

    g.save();
    g.lineCap = 'round'; g.lineJoin = 'round';

    // ---- ground shadow
    if (!sil) { g.fillStyle = 'rgba(0,0,0,0.35)'; ell(r * 0.1, r * 0.16, bw * 1.15, bh * 1.08); g.fill(); }

    // ---- glows and back layer
    var GLOWS = { toxic: '120,255,60', magma: '255,120,30', void: '170,90,255', abyssal: '40,255,210', volt: '255,240,90', irradiated: '200,255,60', infernal: '255,70,40', hollow: '255,150,50', glacial: '170,230,255' };
    if (!sil && GLOWS[k]) {
      var gc = GLOWS[k];
      var gr = g.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.7);
      gr.addColorStop(0, 'rgba(' + gc + ',0.32)'); gr.addColorStop(1, 'rgba(' + gc + ',0)');
      g.fillStyle = gr; circ(0, 0, r * 1.7); g.fill();
    }
    if (ak === 'oozer') {
      g.fillStyle = C('rgba(140,220,60,0.55)');
      ell(-bw * 0.7, 0, bw * 0.8, bh * 0.9); g.fill();
      for (var oi = 0; oi < 4; oi++) { circ(-bw * (1.1 + R() * 0.5), (R() - 0.5) * bh * 1.6, r * (0.12 + R() * 0.12)); g.fill(); }
    }
    if (k === 'wraith') {
      g.fillStyle = col(S.skin, 0, 0, 0.35);
      for (var wi = -1; wi <= 1; wi++) {
        g.beginPath(); g.moveTo(-bw * 0.4, wi * bh * 0.55 - r * 0.2);
        g.quadraticCurveTo(-r * 1.3, wi * bh * 0.8 + (R() - 0.5) * r * 0.6, -r * (1.7 + R() * 0.4), wi * bh * 0.6);
        g.quadraticCurveTo(-r * 1.1, wi * bh * 0.4, -bw * 0.4, wi * bh * 0.55 + r * 0.2); g.fill();
      }
    }
    if (k === 'crawling') {
      g.strokeStyle = cloth; g.lineWidth = r * 0.24;
      line(-bw * 0.6, -bh * 0.35, -bw * 1.75, -bh * 0.7); line(-bw * 0.6, bh * 0.35, -bw * 1.65, bh * 0.85);
    }
    if (k === 'chitin') {
      g.strokeStyle = col(S.skin, -14); g.lineWidth = r * 0.09;
      for (var ci = 0; ci < 3; ci++) {
        var lx = bw * (0.45 - ci * 0.45);
        for (var cs = -1; cs <= 1; cs += 2) {
          g.beginPath(); g.moveTo(lx, cs * bh * 0.8); g.lineTo(lx + r * 0.25, cs * bh * 1.25); g.lineTo(lx - r * 0.1, cs * bh * 1.55); g.stroke();
        }
      }
    }
    if (k === 'abyssal') {
      g.strokeStyle = col(S.skin, 6); g.lineWidth = r * 0.18;
      for (var ti = 0; ti < 4; ti++) {
        var ty = (ti - 1.5) * bh * 0.42;
        g.beginPath(); g.moveTo(-bw * 0.6, ty);
        g.bezierCurveTo(-r * 1.2, ty + r * 0.5 * (ti % 2 ? 1 : -1), -r * 1.4, ty - r * 0.4 * (ti % 2 ? 1 : -1), -r * (1.75 + R() * 0.3), ty + (R() - 0.5) * r * 0.5);
        g.stroke();
      }
    }
    if (k === 'feral') {
      g.fillStyle = col(S.skin, -10); g.beginPath();
      for (var fi = 0; fi <= 24; fi++) { var ft = fi / 24 * Math.PI * 2, ff = fi % 2 ? 1.16 : 0.96; g.lineTo(Math.cos(ft) * bw * ff, Math.sin(ft) * bh * ff); }
      g.closePath(); g.fill();
    }
    if (k === 'mummified') {
      g.strokeStyle = C('#d9cfae'); g.lineWidth = r * 0.14;
      g.beginPath(); g.moveTo(-bw * 0.6, bh * 0.3); g.bezierCurveTo(-r * 1.1, bh * 0.6, -r * 1.3, -bh * 0.1, -r * 1.75, bh * 0.25); g.stroke();
    }
    if (k === 'swamp') {
      g.strokeStyle = C('rgba(70,110,40,0.85)'); g.lineWidth = r * 0.07;
      for (var sw = 0; sw < 4; sw++) { var sy1 = (sw - 1.5) * bh * 0.45; g.beginPath(); g.moveTo(-bw * 0.5, sy1); g.quadraticCurveTo(-r * 1.1, sy1 + (R() - 0.5) * r * 0.6, -r * (1.35 + R() * 0.35), sy1 + (R() - 0.5) * r * 0.4); g.stroke(); }
    }
    if (k === 'puppet') {
      g.strokeStyle = C('rgba(225,225,215,0.75)'); g.lineWidth = r * 0.025;
      line(bw * 0.05, -bh * 0.72, -r * 2.05, -r * 1.25); line(bw * 0.05, bh * 0.72, -r * 2.05, r * 1.25); line(hx, 0, -r * 2.2, 0);
      g.fillStyle = C('#6b4f32'); g.fillRect(-r * 2.25, -r * 1.4, r * 0.18, r * 2.8);
    }
    if (k === 'stalker') {
      g.fillStyle = col(S.cloth, -2); g.beginPath(); g.moveTo(bw * 0.3, -bh * 1.05);
      for (var st2 = 0; st2 <= 8; st2++) g.lineTo(-bw * (1.45 + (st2 % 2 ? 0.25 : 0)), -bh * 1.05 + st2 * bh * 2.1 / 8);
      g.lineTo(bw * 0.3, bh * 1.05); g.closePath(); g.fill();
    }
    if (k === 'brood') {
      for (var bi = 0; bi < 6; bi++) {
        var ex1 = -bw * (0.7 + R() * 0.55), ey1 = (R() - 0.5) * bh * 1.5, er1 = r * (0.13 + R() * 0.08);
        g.fillStyle = C('rgba(232,214,138,0.9)'); ell(ex1, ey1, er1 * 1.2, er1); g.fill();
        g.strokeStyle = C('rgba(120,90,40,0.8)'); g.lineWidth = r * 0.025; g.stroke();
        g.fillStyle = C('rgba(70,40,20,0.7)'); circ(ex1 + er1 * 0.2, ey1, er1 * 0.35); g.fill();
      }
    }
    if (k === 'ashen' && !sil) {
      g.fillStyle = 'rgba(150,150,150,0.25)';
      for (var ai = 0; ai < 5; ai++) { circ(-bw * (0.9 + R() * 0.8), (R() - 0.5) * bh * 1.6, r * (0.2 + R() * 0.25)); g.fill(); }
    }
    if (k === 'dune' && !sil) {
      g.strokeStyle = 'rgba(214,180,110,0.5)'; g.lineWidth = r * 0.05;
      for (var di = 0; di < 3; di++) { g.beginPath(); g.arc(-r * 0.2, 0, r * (1.15 + di * 0.18), Math.PI * (0.7 + di * 0.1), Math.PI * (1.25 + di * 0.08)); g.stroke(); }
    }
    if (ak === 'magnet') {
      g.lineWidth = r * 0.24; g.lineCap = 'butt';
      g.strokeStyle = C('#c43a32'); g.beginPath(); g.arc(-bw * 0.95, 0, r * 0.42, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
      g.strokeStyle = C('#b8bcc2'); line(-bw * 0.95, -r * 0.42, -bw * 0.55, -r * 0.42); line(-bw * 0.95, r * 0.42, -bw * 0.55, r * 0.42);
      g.lineCap = 'round';
    }

    // ---- arms
    for (var side = -1; side <= 1; side += 2) {
      var len = r * armL; if (ak === 'sniper' && side === 1) len *= 1.5;
      var sx = bw * 0.05, sy = side * bh * 0.72, ex = len, ey = side * bh * (k === 'crawling' ? 0.78 : 0.42);
      if (k === 'colossal' || k === 'brutish') ey = side * bh * 0.55;
      g.strokeStyle = k === 'skeletal' ? bone : skinD; g.lineWidth = armW;
      line(sx, sy, ex, ey);
      if (S.clothed && k !== 'brutish') {
        g.strokeStyle = cloth; g.lineWidth = armW * 1.18;
        line(sx, sy, sx + (ex - sx) * 0.38, sy + (ey - sy) * 0.38);
      }
      if (ak === 'medic' && side === -1) {
        var mx = sx + (ex - sx) * 0.3, my = sy + (ey - sy) * 0.3;
        g.strokeStyle = C('#f2f0ea'); g.lineWidth = armW * 1.35; g.lineCap = 'butt';
        line(mx - r * 0.1, my, mx + r * 0.1, my); g.lineCap = 'round';
        g.fillStyle = C('#d6262c'); g.fillRect(mx - r * 0.04, my - armW * 0.45, r * 0.08, armW * 0.9);
      }
      if (ak === 'burrower') {
        g.fillStyle = C('#6b5a45'); ell(ex + r * 0.08, ey, handR * 1.7, handR * 1.25); g.fill();
        g.strokeStyle = C('#3d3226'); g.lineWidth = r * 0.04; g.stroke();
      } else {
        g.fillStyle = k === 'skeletal' ? bone : skin; circ(ex, ey, handR); g.fill();
      }
      if (ak === 'lunger') {
        g.fillStyle = bone;
        for (var li = -1; li <= 1; li++) { tri(ex + handR * 0.5, ey + li * handR * 0.6 - r * 0.04, ex + handR + r * 0.32, ey + li * handR * 0.75, ex + handR * 0.5, ey + li * handR * 0.6 + r * 0.04); g.fill(); }
      }
      if (k === 'ghoul') { g.strokeStyle = C('#e8e4d6'); g.lineWidth = r * 0.035; for (var gi = -1; gi <= 1; gi++) line(ex + handR * 0.6, ey + gi * handR * 0.6, ex + handR + r * 0.45, ey + gi * handR * 0.9); }
      if (k === 'puppet') { g.fillStyle = C('#9c7a4f'); circ(sx + (ex - sx) * 0.55, sy + (ey - sy) * 0.55, armW * 0.75); g.fill(); }
      if (ak === 'sniper' && side === 1) { g.fillStyle = C('#ff3b2f'); circ(ex + handR * 0.4, ey, handR * 0.45); glow('#ff3b2f', r * 0.5); g.fill(); noGlow(); }
    }

    // ---- body
    var bodyFill = S.clothed ? cloth : skin, bodyEdge = S.clothed ? clothD : skinD;
    if (k === 'skeletal') { bodyFill = C('#2a2620'); bodyEdge = boneD; }
    if (k === 'ironhide') bodyFill = cloth;
    if (k === 'wraith') bodyFill = col(S.skin, 0, 0, 0.8);
    if (k === 'stalker') bodyFill = col(S.cloth, 2);
    if (k === 'chrome' && !sil) { var lg = g.createLinearGradient(-bw, -bh, bw, bh); lg.addColorStop(0, '#eef3f8'); lg.addColorStop(0.45, '#7f8b97'); lg.addColorStop(0.7, '#c9d2dc'); lg.addColorStop(1, '#5d6873'); bodyFill = lg; bodyEdge = '#3b444d'; }
    g.fillStyle = bodyFill; ell(0, 0, bw, bh); g.fill();
    g.strokeStyle = bodyEdge; g.lineWidth = r * 0.07; g.stroke();
    if (ak === 'juggernaut') { g.strokeStyle = C('#2c3036'); g.lineWidth = r * 0.16; ell(0, 0, bw, bh); g.stroke(); }

    // ---- strain details on body
    var i, t, p;
    switch (k) {
      case 'shambling':
        g.strokeStyle = C('rgba(0,0,0,0.45)'); g.lineWidth = r * 0.05;
        for (i = 0; i < 3; i++) { var sx0 = (R() - 0.6) * bw, sy0 = (R() - 0.5) * bh * 1.2; g.beginPath(); g.moveTo(sx0, sy0); g.lineTo(sx0 + r * 0.12, sy0 + r * 0.1); g.lineTo(sx0 + r * 0.05, sy0 + r * 0.22); g.lineTo(sx0 + r * 0.18, sy0 + r * 0.32); g.stroke(); }
        g.fillStyle = C('rgba(110,20,20,0.5)'); ell(-bw * 0.25, bh * 0.2, r * 0.22, r * 0.16, 0.6); g.fill();
        break;
      case 'rabid':
        g.strokeStyle = C('rgba(120,10,10,0.7)'); g.lineWidth = r * 0.04;
        for (i = 0; i < 3; i++) line(-bw * 0.5 + i * r * 0.12, -bh * 0.5, -bw * 0.1 + i * r * 0.12, bh * 0.1);
        break;
      case 'brutish':
        g.fillStyle = skin; ell(bw * 0.05, -bh * 0.78, bw * 0.55, bh * 0.28); g.fill(); ell(bw * 0.05, bh * 0.78, bw * 0.55, bh * 0.28); g.fill();
        g.strokeStyle = skinD; g.lineWidth = r * 0.05; line(-bw * 0.4, -bh * 0.75, bw * 0.3, -bh * 0.8);
        break;
      case 'bloated':
        for (i = 0; i < 7; i++) {
          t = R() * Math.PI * 2; var rr = Math.sqrt(R()) * 0.75;
          var bx = Math.cos(t) * bw * rr, by = Math.sin(t) * bh * rr, br = r * (0.1 + R() * 0.12);
          g.fillStyle = col(S.skin, 14, 10); circ(bx, by, br); g.fill();
          g.strokeStyle = skinD; g.lineWidth = r * 0.04; g.stroke();
          g.fillStyle = C('rgba(255,250,180,0.6)'); circ(bx - br * 0.3, by - br * 0.3, br * 0.3); g.fill();
        }
        break;
      case 'crawling':
        g.strokeStyle = skinD; g.lineWidth = r * 0.07; line(-bw * 0.8, 0, bw * 0.5, 0);
        break;
      case 'ironhide':
        g.fillStyle = C('#6d747c'); g.strokeStyle = C('#3e4349'); g.lineWidth = r * 0.04;
        var plates = [[-0.35, -0.55, 0.3], [0.1, 0.5, -0.25], [-0.45, 0.35, 0.1]];
        for (i = 0; i < 3; i++) {
          g.save(); g.translate(plates[i][0] * bw, plates[i][1] * bh); g.rotate(plates[i][2]);
          g.fillRect(-r * 0.28, -r * 0.2, r * 0.56, r * 0.4); g.strokeRect(-r * 0.28, -r * 0.2, r * 0.56, r * 0.4);
          g.fillStyle = C('#2c3035'); circ(-r * 0.2, -r * 0.12, r * 0.035); g.fill(); circ(r * 0.2, r * 0.12, r * 0.035); g.fill();
          g.restore(); g.fillStyle = C('#6d747c');
        }
        break;
      case 'skeletal':
        g.strokeStyle = bone; g.lineWidth = r * 0.09; line(-bw * 0.9, 0, bw * 0.5, 0);
        g.lineWidth = r * 0.06;
        for (i = 0; i < 4; i++) {
          var rx = -bw * 0.55 + i * bw * 0.3;
          g.beginPath(); g.moveTo(rx, 0); g.quadraticCurveTo(rx + r * 0.08, -bh * 0.55, rx - r * 0.08, -bh * 0.82); g.stroke();
          g.beginPath(); g.moveTo(rx, 0); g.quadraticCurveTo(rx + r * 0.08, bh * 0.55, rx - r * 0.08, bh * 0.82); g.stroke();
        }
        break;
      case 'toxic':
        g.strokeStyle = C('#9dff3a'); g.lineWidth = r * 0.05; glow('#9dff3a', r * 0.4);
        for (i = 0; i < 3; i++) { g.beginPath(); p = [(R() - 0.5) * bw * 1.4, (R() - 0.5) * bh * 1.4]; g.moveTo(p[0], p[1]); for (var vj = 0; vj < 3; vj++) { p[0] += (R() - 0.5) * r * 0.5; p[1] += (R() - 0.5) * r * 0.5; g.lineTo(p[0], p[1]); } g.stroke(); }
        noGlow();
        break;
      case 'frostbitten':
        spikeRing(10, 0.32, 0.18, C('rgba(230,245,255,0.92)'));
        g.fillStyle = C('rgba(255,255,255,0.8)');
        for (i = 0; i < 9; i++) { circ((R() - 0.5) * bw * 1.4, (R() - 0.5) * bh * 1.5, r * 0.04); g.fill(); }
        break;
      case 'charred':
        g.strokeStyle = C('#ff7a1a'); g.lineWidth = r * 0.045; glow('#ff7a1a', r * 0.35);
        for (i = 0; i < 4; i++) { g.beginPath(); p = [(R() - 0.5) * bw * 1.2, (R() - 0.5) * bh * 1.2]; g.moveTo(p[0], p[1]); for (var cj = 0; cj < 3; cj++) { p[0] += (R() - 0.5) * r * 0.45; p[1] += (R() - 0.5) * r * 0.45; g.lineTo(p[0], p[1]); } g.stroke(); }
        g.fillStyle = C('#ffb347');
        for (i = 0; i < 5; i++) { circ((R() - 0.5) * bw * 1.5, (R() - 0.5) * bh * 1.5, r * 0.04); g.fill(); }
        noGlow();
        break;
      case 'fungal':
        var caps = [[-0.3, -0.6], [-0.5, 0.45], [0.15, 0.7], [0.2, -0.75]];
        for (i = 0; i < caps.length; i++) {
          var cr = r * (0.2 + R() * 0.1), cx2 = caps[i][0] * bw, cy2 = caps[i][1] * bh;
          g.fillStyle = C(R() < 0.5 ? '#b83a2a' : '#c9a24a'); circ(cx2, cy2, cr); g.fill();
          g.strokeStyle = C('rgba(0,0,0,0.35)'); g.lineWidth = r * 0.03; g.stroke();
          g.fillStyle = C('#f1e9d2'); circ(cx2 - cr * 0.35, cy2 - cr * 0.2, cr * 0.18); g.fill(); circ(cx2 + cr * 0.3, cy2 + cr * 0.25, cr * 0.14); g.fill();
        }
        break;
      case 'crystal':
        for (i = 0; i < 6; i++) {
          t = (i / 6) * Math.PI * 2 + R() * 0.4 + 0.4;
          var base1 = edge(t - 0.22, 0.75), base2 = edge(t + 0.22, 0.75), tip2 = edge(t, 1.45 + R() * 0.3);
          g.fillStyle = col(S.skin, 18, 10); tri(base1[0], base1[1], tip2[0], tip2[1], base2[0], base2[1]); g.fill();
          g.strokeStyle = C('rgba(255,255,255,0.75)'); g.lineWidth = r * 0.03; g.stroke();
        }
        g.strokeStyle = C('rgba(255,255,255,0.35)'); g.lineWidth = r * 0.03;
        line(-bw * 0.6, -bh * 0.3, bw * 0.2, bh * 0.4); line(-bw * 0.2, bh * 0.6, bw * 0.4, -bh * 0.5);
        break;
      case 'void':
        g.strokeStyle = C('#a66bff'); g.lineWidth = r * 0.08; glow('#a66bff', r * 0.6); ell(0, 0, bw, bh); g.stroke(); noGlow();
        g.fillStyle = C('#ffffff');
        for (i = 0; i < 10; i++) { circ((R() - 0.5) * bw * 1.4, (R() - 0.5) * bh * 1.5, r * 0.025); g.fill(); }
        break;
      case 'volt':
        g.strokeStyle = C('#ffe94a'); g.lineWidth = r * 0.06; glow('#ffe94a', r * 0.5);
        for (i = 0; i < 2; i++) {
          var zy = (i ? 1 : -1) * bh * 0.4;
          g.beginPath(); g.moveTo(-bw * 0.8, zy);
          for (var zj = 1; zj <= 5; zj++) g.lineTo(-bw * 0.8 + zj * bw * 0.32, zy + (zj % 2 ? -1 : 1) * r * 0.16);
          g.stroke();
        }
        noGlow();
        break;
      case 'rotten':
        g.fillStyle = C('rgba(20,14,8,0.85)');
        for (i = 0; i < 3; i++) { circ((R() - 0.6) * bw * 1.2, (R() - 0.5) * bh * 1.3, r * (0.08 + R() * 0.08)); g.fill(); }
        g.fillStyle = C('rgba(190,170,60,0.75)');
        for (i = 0; i < 4; i++) { var dp = edge(R() * Math.PI * 2, 1.15); ell(dp[0], dp[1], r * 0.07, r * 0.1); g.fill(); }
        break;
      case 'colossal':
        g.fillStyle = bone;
        for (var cs2 = -1; cs2 <= 1; cs2 += 2) for (i = 0; i < 3; i++) {
          var px = -bw * 0.3 + i * bw * 0.3, py = cs2 * bh * 0.82;
          tri(px - r * 0.1, py, px - r * 0.02, py + cs2 * r * 0.42, px + r * 0.08, py); g.fill();
        }
        g.strokeStyle = skinD; g.lineWidth = r * 0.05; line(-bw * 0.5, -bh * 0.2, bw * 0.2, bh * 0.3);
        break;
      case 'wraith':
        g.strokeStyle = col(S.skin, 10, 0, 0.9); g.lineWidth = r * 0.04;
        g.beginPath();
        for (i = 0; i <= 16; i++) { t = i / 16 * Math.PI * 2; var f = i % 2 ? 1.08 : 0.94; p = edge(t, f); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
        g.stroke();
        break;
      case 'chitin':
        g.strokeStyle = col(S.skin, -12); g.lineWidth = r * 0.06;
        for (i = 0; i < 3; i++) { g.beginPath(); g.ellipse(-bw * 0.2 + i * bw * 0.35, 0, bw * 0.25, bh * 0.92, 0, -Math.PI / 2, Math.PI / 2); g.stroke(); }
        g.strokeStyle = C('rgba(255,255,255,0.22)'); g.lineWidth = r * 0.05; g.beginPath(); g.ellipse(0, -bh * 0.1, bw * 0.75, bh * 0.75, 0, Math.PI * 1.1, Math.PI * 1.45); g.stroke();
        break;
      case 'magma':
        g.strokeStyle = C('#ffb23a'); g.lineWidth = r * 0.06; glow('#ff8a1a', r * 0.6);
        for (i = 0; i < 5; i++) { g.beginPath(); p = [(R() - 0.5) * bw * 0.6, (R() - 0.5) * bh * 0.6]; g.moveTo(p[0], p[1]); for (var mj = 0; mj < 3; mj++) { p[0] += (R() - 0.5) * r * 0.55; p[1] += (R() - 0.5) * r * 0.55; g.lineTo(p[0], p[1]); } g.stroke(); }
        noGlow();
        break;
      case 'abyssal':
        g.fillStyle = C('#3affd2'); glow('#3affd2', r * 0.4);
        for (i = 0; i < 7; i++) { circ((R() - 0.5) * bw * 1.4, (R() - 0.5) * bh * 1.5, r * (0.035 + R() * 0.03)); g.fill(); }
        noGlow();
        break;
      case 'plagued':
        for (i = 0; i < 7; i++) {
          t = R() * Math.PI * 2; var pr = Math.sqrt(R()) * 0.8, px2 = Math.cos(t) * bw * pr, py2 = Math.sin(t) * bh * pr, pb = r * (0.08 + R() * 0.09);
          g.fillStyle = C('#a45cc4'); circ(px2, py2, pb); g.fill();
          g.strokeStyle = C('#3a1c47'); g.lineWidth = r * 0.03; g.stroke();
          g.fillStyle = C('rgba(255,225,255,0.6)'); circ(px2 - pb * 0.3, py2 - pb * 0.3, pb * 0.3); g.fill();
        }
        break;
      case 'feral':
        g.strokeStyle = col(S.skin, -16); g.lineWidth = r * 0.07;
        for (i = 0; i < 4; i++) { var fx = -bw * 0.75 + i * bw * 0.32; line(fx, -bh * 0.75, fx + r * 0.1, -bh * 0.3); line(fx, bh * 0.75, fx + r * 0.1, bh * 0.3); }
        break;
      case 'glacial':
        var slabs = [[-0.4, -0.55, 0.4], [0.15, 0.6, -0.3], [-0.5, 0.3, -0.15], [0.2, -0.7, 0.2]];
        for (i = 0; i < slabs.length; i++) {
          g.save(); g.translate(slabs[i][0] * bw, slabs[i][1] * bh); g.rotate(slabs[i][2]);
          g.fillStyle = C('rgba(215,245,255,0.85)'); g.fillRect(-r * 0.24, -r * 0.18, r * 0.48, r * 0.36);
          g.strokeStyle = C('rgba(255,255,255,0.95)'); g.lineWidth = r * 0.03; g.strokeRect(-r * 0.24, -r * 0.18, r * 0.48, r * 0.36);
          g.restore();
        }
        break;
      case 'mummified':
        g.save(); ell(0, 0, bw, bh); g.clip();
        g.strokeStyle = C('#e6dcc0'); g.lineWidth = r * 0.16;
        for (i = 0; i < 6; i++) { var mx2 = -bw * 1.1 + i * bw * 0.45; line(mx2 - r * 0.3, -bh, mx2 + r * 0.3, bh); }
        g.strokeStyle = C('rgba(90,70,40,0.5)'); g.lineWidth = r * 0.03;
        for (i = 0; i < 6; i++) { var mx3 = -bw * 1.1 + i * bw * 0.45 + r * 0.09; line(mx3 - r * 0.3, -bh, mx3 + r * 0.3, bh); }
        g.restore();
        break;
      case 'swamp':
        g.save(); ell(0, 0, bw, bh); g.clip();
        for (i = 0; i < 6; i++) { g.fillStyle = C(R() < 0.5 ? '#4f7a2e' : '#3b5e24'); ell((R() - 0.5) * bw * 1.6, (R() - 0.5) * bh * 1.6, r * (0.18 + R() * 0.16), r * (0.12 + R() * 0.1), R() * 3); g.fill(); }
        g.restore();
        g.fillStyle = C('#6f9a3a'); for (i = 0; i < 3; i++) { circ((R() - 0.6) * bw, (R() - 0.5) * bh * 1.4, r * 0.06); g.fill(); }
        break;
      case 'irradiated':
        g.fillStyle = C('#f2e14a'); circ(-r * 0.36, 0, r * 0.32); g.fill();
        g.fillStyle = C('#15140a');
        for (i = 0; i < 3; i++) { t = i * Math.PI * 2 / 3 - Math.PI / 2; g.beginPath(); g.arc(-r * 0.36, 0, r * 0.27, t - 0.5, t + 0.5); g.arc(-r * 0.36, 0, r * 0.08, t + 0.5, t - 0.5, true); g.closePath(); g.fill(); }
        circ(-r * 0.36, 0, r * 0.05); g.fill();
        break;
      case 'cyborg':
        g.save(); ell(0, 0, bw, bh); g.clip();
        g.fillStyle = C('#7c838c'); g.fillRect(-bw, 0, bw * 2, bh);
        g.strokeStyle = C('#3f454c'); g.lineWidth = r * 0.03; line(-bw, bh * 0.35, bw, bh * 0.35); line(-bw * 0.2, 0, -bw * 0.2, bh);
        g.fillStyle = C('#2a2e33'); circ(-bw * 0.6, bh * 0.2, r * 0.04); g.fill(); circ(bw * 0.3, bh * 0.6, r * 0.04); g.fill();
        g.restore();
        g.strokeStyle = C('#d43a2a'); g.lineWidth = r * 0.04; line(-bw * 0.7, -r * 0.05, bw * 0.3, -r * 0.05);
        break;
      case 'puppet':
        g.fillStyle = C('#9c7a4f'); circ(bw * 0.05, -bh * 0.72, r * 0.16); g.fill(); circ(bw * 0.05, bh * 0.72, r * 0.16); g.fill();
        g.strokeStyle = C('#f2e6c8'); g.lineWidth = r * 0.05; line(-bw * 0.6, -bh * 0.3, -bw * 0.6, bh * 0.3);
        break;
      case 'brood':
        for (i = 0; i < 3; i++) { var bx2 = (R() - 0.7) * bw, by2 = (R() - 0.5) * bh * 1.2, br2 = r * 0.12; g.fillStyle = C('rgba(232,214,138,0.9)'); ell(bx2, by2, br2 * 1.2, br2); g.fill(); g.fillStyle = C('rgba(70,40,20,0.7)'); circ(bx2, by2, br2 * 0.35); g.fill(); }
        break;
      case 'ashen':
        g.strokeStyle = C('rgba(20,20,20,0.6)'); g.lineWidth = r * 0.04;
        for (i = 0; i < 4; i++) { g.beginPath(); p = [(R() - 0.5) * bw * 1.2, (R() - 0.5) * bh * 1.2]; g.moveTo(p[0], p[1]); for (var aj = 0; aj < 3; aj++) { p[0] += (R() - 0.5) * r * 0.4; p[1] += (R() - 0.5) * r * 0.4; g.lineTo(p[0], p[1]); } g.stroke(); }
        g.fillStyle = C('#3a3a3a'); for (i = 0; i < 6; i++) { var ae = edge(R() * Math.PI * 2, 1.05 + R() * 0.25); g.fillRect(ae[0], ae[1], r * 0.08, r * 0.08); }
        break;
      case 'dune':
        g.save(); ell(0, 0, bw, bh); g.clip();
        g.strokeStyle = col(S.cloth, 12); g.lineWidth = r * 0.12;
        for (i = 0; i < 5; i++) { var dx2 = -bw + i * bw * 0.5; line(dx2 + r * 0.3, -bh, dx2 - r * 0.3, bh); }
        g.restore();
        break;
      case 'sanguine':
        g.strokeStyle = C('#5a0a12'); g.lineWidth = r * 0.04;
        for (i = 0; i < 4; i++) { g.beginPath(); p = [(R() - 0.5) * bw * 1.2, (R() - 0.5) * bh * 1.3]; g.moveTo(p[0], p[1]); for (var sj = 0; sj < 3; sj++) { p[0] += (R() - 0.5) * r * 0.45; p[1] += (R() - 0.5) * r * 0.45; g.lineTo(p[0], p[1]); } g.stroke(); }
        g.fillStyle = C('rgba(255,255,255,0.3)'); ell(-bw * 0.2, -bh * 0.45, bw * 0.35, bh * 0.12, 0.3); g.fill();
        g.fillStyle = C('#a3101c'); for (i = 0; i < 4; i++) { var sd = edge(R() * Math.PI * 2, 1.12); ell(sd[0], sd[1], r * 0.06, r * 0.09); g.fill(); }
        break;
      case 'bramble':
        for (i = 0; i < 3; i++) {
          var vy = (i - 1) * bh * 0.55, pts = [], vj;
          for (vj = 0; vj <= 4; vj++) pts.push([-bw * 0.95 + vj * bw * 0.45, vy + (vj % 2 ? 1 : -1) * r * 0.12]);
          g.strokeStyle = C('#3d4a1e'); g.lineWidth = r * 0.07;
          g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (vj = 1; vj < pts.length; vj++) g.lineTo(pts[vj][0], pts[vj][1]); g.stroke();
          g.fillStyle = C('#c9b98a');
          for (vj = 1; vj < pts.length; vj++) { tri(pts[vj][0] - r * 0.04, pts[vj][1], pts[vj][0], pts[vj][1] - r * 0.16 * (vj % 2 ? -1 : 1), pts[vj][0] + r * 0.04, pts[vj][1]); g.fill(); }
        }
        break;
      case 'ghoul':
        g.fillStyle = col(S.skin, -14);
        for (i = 0; i < 5; i++) { circ(-bw * 0.85 + i * bw * 0.3, 0, r * 0.07); g.fill(); }
        g.strokeStyle = col(S.skin, -20); g.lineWidth = r * 0.03;
        for (i = 0; i < 3; i++) { line(-bw * 0.6 + i * r * 0.2, -bh * 0.2, -bw * 0.6 + i * r * 0.2 - r * 0.08, -bh * 0.7); line(-bw * 0.6 + i * r * 0.2, bh * 0.2, -bw * 0.6 + i * r * 0.2 - r * 0.08, bh * 0.7); }
        break;
      case 'chrome':
        g.strokeStyle = C('rgba(255,255,255,0.75)'); g.lineWidth = r * 0.06; line(-bw * 0.5, -bh * 0.6, bw * 0.1, -bh * 0.75);
        break;
      case 'infernal':
        for (var is = -1; is <= 1; is += 2) {
          g.fillStyle = C('#ff7a1a'); g.beginPath(); g.moveTo(bw * 0.1, is * bh * 0.55); g.quadraticCurveTo(-bw * 0.6, is * bh * 1.25, -bw * 1.3, is * bh * 0.95); g.quadraticCurveTo(-bw * 0.5, is * bh * 0.85, bw * 0.1, is * bh * 0.55); g.fill();
          g.fillStyle = C('#ffd23a'); g.beginPath(); g.moveTo(0, is * bh * 0.62); g.quadraticCurveTo(-bw * 0.5, is * bh * 1.05, -bw * 0.95, is * bh * 0.92); g.quadraticCurveTo(-bw * 0.4, is * bh * 0.82, 0, is * bh * 0.62); g.fill();
        }
        break;
      case 'hollow':
        g.strokeStyle = C('#ffae3a'); g.lineWidth = r * 0.05; glow('#ff8a1a', r * 0.6);
        for (i = 0; i < 4; i++) { g.beginPath(); p = [(R() - 0.5) * bw * 0.8, (R() - 0.5) * bh * 0.8]; g.moveTo(p[0], p[1]); for (var hj = 0; hj < 3; hj++) { p[0] += (R() - 0.5) * r * 0.5; p[1] += (R() - 0.5) * r * 0.5; g.lineTo(p[0], p[1]); } g.stroke(); }
        g.fillStyle = C('#ffb84a');
        for (i = 0; i < 3; i++) { circ((R() - 0.6) * bw, (R() - 0.5) * bh * 1.2, r * (0.07 + R() * 0.05)); g.fill(); }
        noGlow();
        break;
      case 'stitched':
        g.save(); ell(0, 0, bw, bh); g.clip();
        g.fillStyle = col(S.skin, 8); g.beginPath(); g.moveTo(-bw, -bh); g.lineTo(bw * 0.3, -bh); g.lineTo(-bw * 0.2, bh * 0.1); g.lineTo(-bw, bh * 0.2); g.closePath(); g.fill();
        g.fillStyle = C('hsl(' + ((S.skin[0] + 60) % 360) + ',' + S.skin[1] + '%,' + (S.skin[2] - 6) + '%)'); g.beginPath(); g.moveTo(bw, bh); g.lineTo(-bw * 0.1, bh); g.lineTo(bw * 0.2, bh * 0.1); g.lineTo(bw, -bh * 0.1); g.closePath(); g.fill();
        g.restore();
        g.strokeStyle = C('#1d1a17'); g.lineWidth = r * 0.04;
        line(bw * 0.3, -bh * 0.95, -bw * 0.2, bh * 0.1); line(-bw * 0.2, bh * 0.1, -bw * 0.95, bh * 0.2);
        line(-bw * 0.1, bh * 0.95, bw * 0.2, bh * 0.1); line(bw * 0.2, bh * 0.1, bw * 0.95, -bh * 0.1);
        g.lineWidth = r * 0.025;
        for (i = 0; i <= 5; i++) { var tt = i / 5, qx = bw * 0.3 + (-bw * 0.5) * tt, qy = -bh * 0.95 + bh * 1.05 * tt; line(qx - r * 0.06, qy - r * 0.02, qx + r * 0.06, qy + r * 0.02); }
        break;
      case 'twinhead':
        g.strokeStyle = skinD; g.lineWidth = r * 0.05; line(-bw * 0.5, 0, bw * 0.2, 0);
        break;
    }

    // ---- ability details on body (under head)
    switch (ak) {
      case 'bomber':
        if (!sil) {
          var bgd = g.createRadialGradient(-r * 0.4, 0, 0, -r * 0.4, 0, r * 0.32);
          bgd.addColorStop(0, '#ffe2b0'); bgd.addColorStop(0.45, '#ff4a1f'); bgd.addColorStop(1, '#5a0d06');
          g.fillStyle = bgd;
        } else g.fillStyle = SIL;
        g.strokeStyle = C('#3a3a3a'); g.lineWidth = r * 0.035;
        line(-r * 0.4, -r * 0.3, -r * 0.1, -bh * 0.8); line(-r * 0.4, r * 0.3, -r * 0.1, bh * 0.8);
        circ(-r * 0.4, 0, r * 0.32); g.fill();
        g.strokeStyle = C('#1d1d1d'); g.lineWidth = r * 0.06; g.stroke();
        break;
      case 'splitter':
        g.strokeStyle = C('#2b1414'); g.lineWidth = r * 0.06; line(-bw, 0, hx + hr, 0);
        g.lineWidth = r * 0.035;
        for (t = -bw * 0.9; t < hx + hr; t += r * 0.2) line(t, -r * 0.08, t, r * 0.08);
        break;
      case 'warden':
        g.fillStyle = C('#2d6fd8'); hex(-r * 0.48, 0, r * 0.26); g.fill();
        g.strokeStyle = C('#a8d4ff'); g.lineWidth = r * 0.05; glow('#6fb6ff', r * 0.4); g.stroke(); noGlow();
        break;
      case 'regrower':
        g.strokeStyle = C('#5be36b'); g.lineWidth = r * 0.06;
        for (i = 0; i < 3; i++) { g.beginPath(); var ry0 = (i - 1) * bh * 0.55; g.moveTo(-bw * 0.8, ry0); g.bezierCurveTo(-bw * 0.3, ry0 - r * 0.3, bw * 0.1, ry0 + r * 0.3, bw * 0.5, ry0); g.stroke(); }
        g.fillStyle = C('#8af07a');
        for (i = 0; i < 4; i++) { ell((R() - 0.5) * bw * 1.2, (R() - 0.5) * bh * 1.2, r * 0.1, r * 0.05, R() * 3); g.fill(); }
        break;
      case 'blinker':
        g.strokeStyle = C('rgba(183,139,255,0.55)'); g.lineWidth = r * 0.05; ell(-r * 0.28, r * 0.18, bw, bh); g.stroke();
        break;
      case 'burrower':
        g.fillStyle = C('rgba(107,90,69,0.85)');
        for (i = 0; i < 4; i++) { ell((R() - 0.5) * bw * 1.3, (R() - 0.5) * bh * 1.3, r * (0.12 + R() * 0.1), r * (0.08 + R() * 0.08), R() * 3); g.fill(); }
        break;
      case 'oozer':
        g.fillStyle = C('rgba(160,240,70,0.8)');
        for (i = 0; i < 5; i++) { ell((R() - 0.5) * bw * 1.3, (R() - 0.5) * bh * 1.4, r * 0.07, r * 0.12, R() * 3); g.fill(); }
        break;
      case 'chiller':
        g.strokeStyle = C('#bfe8ff'); g.lineWidth = r * 0.05;
        for (i = 0; i < 3; i++) { t = i * Math.PI / 3; line(-r * 0.42 - Math.cos(t) * r * 0.26, -Math.sin(t) * r * 0.26, -r * 0.42 + Math.cos(t) * r * 0.26, Math.sin(t) * r * 0.26); }
        break;
      case 'shocker':
        for (var ss = -1; ss <= 1; ss += 2) {
          g.strokeStyle = C('#8c939b'); g.lineWidth = r * 0.07; line(-bw * 0.1, ss * bh * 0.6, -bw * 0.75, ss * bh * 0.95);
          g.fillStyle = C('#ffe94a'); glow('#ffe94a', r * 0.6); circ(-bw * 0.75, ss * bh * 0.95, r * 0.1); g.fill(); noGlow();
        }
        break;
      case 'phantom':
        g.strokeStyle = C('rgba(240,244,255,0.7)'); g.lineWidth = r * 0.05; g.setLineDash([r * 0.18, r * 0.12]);
        ell(0, 0, bw * 1.12, bh * 1.1); g.stroke(); g.setLineDash([]);
        break;
      case 'spiker':
        spikeRing(12, 0.5, 0.12, C('#bfb39a'), true);
        break;
      case 'medic':
        g.fillStyle = C('#f2f0ea'); circ(-r * 0.42, 0, r * 0.24); g.fill();
        g.fillStyle = C('#d6262c'); g.fillRect(-r * 0.42 - r * 0.15, -r * 0.05, r * 0.3, r * 0.1); g.fillRect(-r * 0.42 - r * 0.05, -r * 0.15, r * 0.1, r * 0.3);
        break;
      case 'berserker':
        g.strokeStyle = C('#c4161c'); g.lineWidth = r * 0.05;
        for (i = 0; i < 4; i++) { var by0 = (R() - 0.5) * bh * 1.4; line(-bw * 0.7, by0, -bw * 0.1 + R() * bw * 0.4, by0 + (R() - 0.5) * r * 0.4); }
        break;
      case 'juggernaut':
        for (var js2 = -1; js2 <= 1; js2 += 2) {
          g.fillStyle = C('#3a3f46'); ell(0, js2 * bh * 0.72, bw * 0.55, bh * 0.36); g.fill();
          g.fillStyle = C('#9aa0a8');
          for (i = 0; i < 2; i++) { var jx = -bw * 0.25 + i * bw * 0.4, jy = js2 * bh * 0.9; tri(jx - r * 0.08, jy, jx, jy + js2 * r * 0.28, jx + r * 0.08, jy); g.fill(); }
        }
        break;
      case 'hive':
        for (i = 0; i < 5; i++) {
          var hxp = -r * 0.56 + (i % 3) * r * 0.18, hyp = (Math.floor(i / 3) ? 0.5 : -0.5) * r * 0.46 + (i % 3 - 1) * r * 0.08;
          g.fillStyle = C('#1d150a'); hex(hxp, hyp, r * 0.12); g.fill();
          g.strokeStyle = C('#d69b2a'); g.lineWidth = r * 0.035; g.stroke();
        }
        break;
      case 'voidheart':
        g.fillStyle = C('#05030a'); circ(-r * 0.4, 0, r * 0.3); g.fill();
        g.strokeStyle = C('#a66bff'); g.lineWidth = r * 0.06; glow('#a66bff', r * 0.6); g.stroke();
        g.beginPath(); g.arc(-r * 0.4, 0, r * 0.17, 0.3, 3.6); g.stroke(); noGlow();
        break;
    }

    // ---- head
    var headFill = k === 'skeletal' ? bone : skin;
    if (k === 'wraith') headFill = col(S.skin, 6, 0, 0.85);
    if (k === 'chrome' && !sil) { var hg = g.createLinearGradient(hx - hr, -hr, hx + hr, hr); hg.addColorStop(0, '#f3f7fb'); hg.addColorStop(0.5, '#8996a3'); hg.addColorStop(1, '#d5dde6'); headFill = hg; }
    var heads = k === 'twinhead' ? [-hr * 0.95, hr * 0.95] : [0];
    for (var hi = 0; hi < heads.length; hi++) {
      g.fillStyle = headFill; circ(hx, heads[hi], hr); g.fill();
      g.strokeStyle = k === 'skeletal' ? boneD : skinD; g.lineWidth = r * 0.06; g.stroke();
    }
    if (k === 'ironhide') { g.fillStyle = C('#6d747c'); g.beginPath(); g.arc(hx, 0, hr * 1.05, Math.PI * 0.5, Math.PI * 1.5); g.closePath(); g.fill(); g.strokeStyle = C('#3e4349'); g.lineWidth = r * 0.04; g.stroke(); }
    if (k === 'fungal') { g.fillStyle = C('#b83a2a'); circ(hx - hr * 0.35, -hr * 0.2, hr * 0.42); g.fill(); g.fillStyle = C('#f1e9d2'); circ(hx - hr * 0.45, -hr * 0.3, hr * 0.1); g.fill(); }
    if (k === 'brutish' || k === 'colossal') { g.strokeStyle = skinD; g.lineWidth = r * 0.04; line(hx - hr * 0.5, -hr * 0.4, hx + hr * 0.1, hr * 0.1); }
    if (k === 'chitin') {
      g.strokeStyle = C('#1d2414'); g.lineWidth = r * 0.07;
      g.beginPath(); g.arc(hx + hr * 1.05, -hr * 0.25, hr * 0.5, Math.PI * 0.7, Math.PI * 1.35); g.stroke();
      g.beginPath(); g.arc(hx + hr * 1.05, hr * 0.25, hr * 0.5, Math.PI * 0.65, Math.PI * 1.3); g.stroke();
    }
    if (k === 'abyssal') {
      g.strokeStyle = col(S.skin, 10); g.lineWidth = r * 0.07;
      for (i = -1.5; i <= 1.5; i += 1) { g.beginPath(); g.moveTo(hx + hr * 0.7, i * hr * 0.3); g.quadraticCurveTo(hx + hr * 1.3, i * hr * 0.5 + r * 0.1, hx + hr * 1.6, i * hr * 0.42); g.stroke(); }
    }
    if (k === 'rabid') { g.fillStyle = C('rgba(255,255,255,0.85)'); for (i = 0; i < 4; i++) { circ(hx + hr * (0.85 + R() * 0.3), (R() - 0.5) * hr, r * 0.04); g.fill(); } }
    if (k === 'frostbitten') { g.fillStyle = C('rgba(240,250,255,0.9)'); circ(hx - hr * 0.2, -hr * 0.3, hr * 0.2); g.fill(); }
    if (k === 'void') { g.strokeStyle = C('#a66bff'); g.lineWidth = r * 0.05; circ(hx, 0, hr); g.stroke(); }
    if (k === 'feral') {
      g.fillStyle = col(S.skin, -14);
      tri(hx - hr * 0.55, -hr * 0.5, hx - hr * 1.1, -hr * 1.05, hx - hr * 0.05, -hr * 0.9); g.fill();
      tri(hx - hr * 0.55, hr * 0.5, hx - hr * 1.1, hr * 1.05, hx - hr * 0.05, hr * 0.9); g.fill();
      g.fillStyle = col(S.skin, -6); ell(hx + hr * 0.9, 0, hr * 0.5, hr * 0.36); g.fill();
      g.fillStyle = C('#140c08'); circ(hx + hr * 1.32, 0, hr * 0.11); g.fill();
    }
    if (k === 'mummified') {
      g.save(); circ(hx, 0, hr); g.clip();
      g.strokeStyle = C('#e6dcc0'); g.lineWidth = r * 0.12;
      for (i = 0; i < 4; i++) line(hx - hr + i * hr * 0.6, -hr, hx - hr + i * hr * 0.6 + hr * 0.4, hr);
      g.restore();
    }
    if (k === 'cyborg') {
      g.save(); circ(hx, 0, hr); g.clip(); g.fillStyle = C('#7c838c'); g.fillRect(hx - hr, 0, hr * 2, hr); g.restore();
      g.strokeStyle = C('#3f454c'); g.lineWidth = r * 0.03; line(hx - hr, 0, hx + hr, 0);
    }
    if (k === 'puppet') { g.fillStyle = C('rgba(220,60,70,0.75)'); circ(hx + hr * 0.25, -hr * 0.55, hr * 0.17); g.fill(); circ(hx + hr * 0.25, hr * 0.55, hr * 0.17); g.fill(); g.strokeStyle = C('#3a2a1a'); g.lineWidth = r * 0.03; line(hx + hr * 0.75, -hr * 0.25, hx + hr * 0.75, hr * 0.25); }
    if (k === 'stalker') { g.fillStyle = col(S.cloth, -4); circ(hx - hr * 0.2, 0, hr * 1.22); g.fill(); g.fillStyle = C('#060709'); ell(hx + hr * 0.35, 0, hr * 0.58, hr * 0.7); g.fill(); }
    if (k === 'dune') {
      g.strokeStyle = C('#2b2418'); g.lineWidth = r * 0.06; line(hx - hr * 0.8, -hr * 0.36, hx - hr * 0.8, hr * 0.36);
      for (var gs = -1; gs <= 1; gs += 2) { g.fillStyle = C('#2b2418'); circ(hx + hr * 0.45, gs * hr * 0.38, hr * 0.28); g.fill(); g.fillStyle = C('#e09a3a'); circ(hx + hr * 0.5, gs * hr * 0.38, hr * 0.18); g.fill(); }
    }
    if (k === 'infernal') {
      g.strokeStyle = C('#141010'); g.lineWidth = r * 0.12;
      for (var ih = -1; ih <= 1; ih += 2) { g.beginPath(); g.moveTo(hx, ih * hr * 0.7); g.quadraticCurveTo(hx - hr * 0.6, ih * hr * 1.6, hx - hr * 1.5, ih * hr * 1.2); g.stroke(); }
    }
    if (k === 'ghoul') { g.fillStyle = C('#14100c'); ell(hx + hr * 0.75, 0, hr * 0.28, hr * 0.42); g.fill(); g.strokeStyle = C('#e8e4d6'); g.lineWidth = r * 0.025; line(hx + hr * 0.72, -hr * 0.3, hx + hr * 0.9, -hr * 0.3); line(hx + hr * 0.72, hr * 0.3, hx + hr * 0.9, hr * 0.3); }
    if (k === 'stitched') { g.fillStyle = C('#8c939b'); g.fillRect(hx - hr * 0.2, -hr * 1.25, hr * 0.4, hr * 0.3); g.fillRect(hx - hr * 0.2, hr * 0.95, hr * 0.4, hr * 0.3); g.strokeStyle = C('#1d1a17'); g.lineWidth = r * 0.025; line(hx - hr * 0.8, -hr * 0.5, hx + hr * 0.2, -hr * 0.3); }
    if (k === 'plagued') { g.fillStyle = C('#a45cc4'); circ(hx - hr * 0.3, hr * 0.4, hr * 0.22); g.fill(); }
    if (k === 'sanguine') { g.fillStyle = C('rgba(255,255,255,0.35)'); ell(hx - hr * 0.2, -hr * 0.4, hr * 0.35, hr * 0.12, 0.4); g.fill(); }
    if (k === 'hollow') { g.fillStyle = C('#ffb84a'); glow('#ff8a1a', r * 0.4); circ(hx - hr * 0.3, hr * 0.3, hr * 0.14); g.fill(); noGlow(); }
    if (k === 'glacial') { g.fillStyle = C('rgba(230,250,255,0.9)'); tri(hx - hr * 0.6, -hr * 0.5, hx - hr * 1.2, -hr * 0.1, hx - hr * 0.4, 0); g.fill(); }

    // ---- ability details on head
    switch (ak) {
      case 'spitter':
        g.fillStyle = C('#a5d43a'); circ(hx + hr * 0.55, 0, hr * 0.48); g.fill();
        g.strokeStyle = C('#5d7a1c'); g.lineWidth = r * 0.04; g.stroke();
        g.fillStyle = C('rgba(255,255,220,0.7)'); circ(hx + hr * 0.4, -hr * 0.18, hr * 0.13); g.fill();
        break;
      case 'caller':
        g.fillStyle = bone;
        for (i = 0; i < 5; i++) { t = Math.PI * 0.6 + i * Math.PI * 0.2; tri(hx + Math.cos(t - 0.16) * hr * 0.9, Math.sin(t - 0.16) * hr * 0.9, hx + Math.cos(t) * hr * 1.6, Math.sin(t) * hr * 1.6, hx + Math.cos(t + 0.16) * hr * 0.9, Math.sin(t + 0.16) * hr * 0.9); g.fill(); }
        break;
      case 'screamer':
        g.fillStyle = C('#1a0b0b'); ell(hx + hr * 0.5, 0, hr * 0.32, hr * 0.48); g.fill();
        g.strokeStyle = C('#efe6cf'); g.lineWidth = r * 0.03;
        for (i = -1; i <= 1; i++) line(hx + hr * 0.62, i * hr * 0.2, hx + hr * 0.8, i * hr * 0.2);
        break;
      case 'leech':
        g.strokeStyle = C('#b0162a'); g.lineWidth = r * 0.07;
        for (i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(hx + hr * 0.8, i * hr * 0.25); g.bezierCurveTo(hx + hr * 1.3, i * hr * 0.25 + r * 0.25, hx + hr * 1.5, i * hr * 0.25 - r * 0.25, hx + hr * 2.0, i * hr * 0.45); g.stroke(); }
        break;
      case 'charger':
        g.strokeStyle = bone; g.lineWidth = r * 0.14;
        for (var cs3 = -1; cs3 <= 1; cs3 += 2) { g.beginPath(); g.moveTo(hx + hr * 0.2, cs3 * hr * 0.8); g.quadraticCurveTo(hx + hr * 1.0, cs3 * hr * 1.5, hx + hr * 1.7, cs3 * hr * 0.9); g.stroke(); }
        break;
      case 'chiller':
        g.fillStyle = C('#bfe8ff');
        for (i = 0; i < 4; i++) { t = Math.PI * 0.65 + i * Math.PI * 0.23; tri(hx + Math.cos(t - 0.15) * hr, Math.sin(t - 0.15) * hr, hx + Math.cos(t) * hr * 1.55, Math.sin(t) * hr * 1.55, hx + Math.cos(t + 0.15) * hr, Math.sin(t + 0.15) * hr); g.fill(); }
        break;
      case 'berserker':
        g.strokeStyle = C('#c4161c'); g.lineWidth = r * 0.04; line(hx - hr * 0.6, -hr * 0.3, hx + hr * 0.2, -hr * 0.1); line(hx - hr * 0.5, hr * 0.4, hx + hr * 0.1, hr * 0.15);
        break;
      case 'trickster':
        g.fillStyle = C('#efe9dc'); g.beginPath(); g.arc(hx, 0, hr * 0.92, -Math.PI * 0.5, Math.PI * 0.5); g.closePath(); g.fill();
        g.fillStyle = C('#14121a');
        for (var ts = -1; ts <= 1; ts += 2) { var dx0 = hx + hr * 0.42, dy0 = ts * hr * 0.36; g.beginPath(); g.moveTo(dx0 - hr * 0.16, dy0); g.lineTo(dx0, dy0 - hr * 0.16); g.lineTo(dx0 + hr * 0.16, dy0); g.lineTo(dx0, dy0 + hr * 0.16); g.closePath(); g.fill(); }
        g.strokeStyle = C('#c2182b'); g.lineWidth = r * 0.04; g.beginPath(); g.arc(hx + hr * 0.25, 0, hr * 0.5, -0.9, 0.9); g.stroke();
        break;
    }

    // ---- eyes
    if (!sil && ak !== 'trickster') {
      g.fillStyle = eye; glow(eye, r * 0.45);
      if (ak === 'sniper') { circ(hx + hr * 0.55, 0, hr * 0.28); g.fill(); g.fillStyle = '#1a0505'; noGlow(); circ(hx + hr * 0.6, 0, hr * 0.1); g.fill(); }
      else if (k === 'skeletal') {
        noGlow(); g.fillStyle = '#16120d'; circ(hx + hr * 0.42, -hr * 0.36, hr * 0.24); g.fill(); circ(hx + hr * 0.42, hr * 0.36, hr * 0.24); g.fill();
        g.fillStyle = eye; glow(eye, r * 0.4); circ(hx + hr * 0.46, -hr * 0.36, hr * 0.1); g.fill(); circ(hx + hr * 0.46, hr * 0.36, hr * 0.1); g.fill();
      } else {
        var er = hr * (k === 'crawling' ? 0.2 : 0.17);
        for (var eh = 0; eh < heads.length; eh++) { circ(hx + hr * 0.52, heads[eh] - hr * 0.36, er); g.fill(); circ(hx + hr * 0.52, heads[eh] + hr * 0.36, er); g.fill(); }
        if (k === 'cyborg') { circ(hx + hr * 0.52, hr * 0.36, hr * 0.26); g.fill(); }
      }
      noGlow();
    }
    g.restore();
  }

  var api = {
    STRAINS: STRAINS, ABILITIES: ABILITIES, RARITY: RARITY,
    buildMutations: buildMutations, drawMutation: drawMutation,
    threatCap: threatCap, rarityOf: rarityOf, hash32: hash32, mulberry32: mulberry32
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  return api;
})();
