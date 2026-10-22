/* Zombie City — weapons and cards.
   250 weapons = 10 frames x 25 modifications. The frame sets how the gun fires; the modification changes
   what bullets do, adds stats and changes how cards react to the weapon. Cards carry buffs, curses and a rarity. */
var ZW = (function () {
  'use strict';
  function hash32(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return n >>> 0; }
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // react: multipliers applied to a card's stat when this frame is equipped; conv: special conversions (see cardEffects).
  var FRAMES = [
    { key: 'pistol', box: [-24, 40], name: 'Pistol', tier: 0, dmg: 14, rof: 3.6, pellets: 1, spread: 0.04, speed: 660, range: 420, pierce: 0, crit: 0.05, knock: 90, move: 1, tags: ['precision', 'crit'], desc: 'Reliable sidearm with fast handling.', react: { crit: 1.25, critDmg: 1.25 }, reactText: 'Crit cards are 25% stronger.' },
    { key: 'smg', box: [-50, 48], name: 'SMG', tier: 1, dmg: 7, rof: 9, pellets: 1, spread: 0.13, speed: 620, range: 360, pierce: 0, crit: 0.04, knock: 45, move: 1.06, tags: ['rapid', 'speed'], desc: 'Sprays a storm of light rounds.', react: { rof: 1.3, dmg: 0.8 }, reactText: 'Fire rate cards are 30% stronger, damage cards 20% weaker.' },
    { key: 'rifle', box: [-66, 66], name: 'Assault Rifle', tier: 1, dmg: 11, rof: 6, pellets: 1, spread: 0.06, speed: 740, range: 480, pierce: 0, crit: 0.05, knock: 70, move: 1, tags: ['rapid', 'precision'], desc: 'Balanced automatic fire at range.', react: {}, conv: 'pierceBonus', reactText: 'Pierce cards add 1 extra pierce.' },
    { key: 'shotgun', box: [-68, 62], name: 'Shotgun', tier: 1, dmg: 8, rof: 1.4, pellets: 6, spread: 0.5, speed: 560, range: 260, pierce: 0, crit: 0.03, knock: 160, move: 1, tags: ['spread', 'damage'], desc: 'Six pellets per blast. Brutal up close.', react: {}, conv: 'doublePellets', reactText: 'Projectile cards add double pellets.' },
    { key: 'sniper', box: [-70, 86], name: 'Sniper', tier: 3, dmg: 58, rof: 0.9, pellets: 1, spread: 0, speed: 1300, range: 700, pierce: 2, crit: 0.12, knock: 200, move: 0.95, tags: ['precision', 'pierce'], desc: 'Huge single shots that pass through the horde.', react: {}, conv: 'rofToDmg', reactText: 'Half of every fire rate bonus becomes damage instead.' },
    { key: 'revolver', box: [-26, 46], name: 'Revolver', tier: 2, dmg: 28, rof: 1.8, pellets: 1, spread: 0.02, speed: 780, range: 480, pierce: 0, crit: 0.18, knock: 150, move: 1, tags: ['crit', 'damage'], desc: 'Heavy rounds with a high critical chance.', react: { critDmg: 1.5 }, reactText: 'Crit damage cards are 50% stronger.' },
    { key: 'lmg', box: [-62, 76], name: 'LMG', tier: 2, dmg: 9, rof: 11, pellets: 1, spread: 0.15, speed: 650, range: 430, pierce: 0, crit: 0.04, knock: 55, move: 0.88, tags: ['rapid', 'tank'], desc: 'Endless suppressing fire. Slows you down a little.', react: { rof: 1.3, move: 0.7 }, reactText: 'Fire rate cards are 30% stronger, speed cards 30% weaker.' },
    { key: 'burst', box: [-44, 62], name: 'Burst Rifle', tier: 2, dmg: 12, rof: 2.2, pellets: 1, burst: 3, spread: 0.05, speed: 760, range: 480, pierce: 0, crit: 0.06, knock: 70, move: 1, tags: ['precision', 'spread'], desc: 'Fires tight three-round bursts.', react: {}, conv: 'burstRounds', reactText: 'Projectile cards add rounds to each burst.' },
    { key: 'launcher', box: [-42, 58], name: 'Launcher', tier: 3, dmg: 30, rof: 0.9, pellets: 1, spread: 0.03, speed: 430, range: 420, pierce: 0, crit: 0.05, knock: 0, move: 0.95, blast: 72, kind: 'grenade', tags: ['explosive', 'damage'], desc: 'Grenades that explode on impact.', react: { splash: 1.5 }, conv: 'pierceToBlast', reactText: 'Pierce cards grow the blast instead. Splash cards are 50% stronger.' },
    { key: 'flamer', box: [-62, 66], name: 'Flamethrower', tier: 3, dmg: 3.2, rof: 18, pellets: 1, spread: 0.36, speed: 300, range: 175, pierce: 99, crit: 0.02, knock: 8, move: 1, kind: 'flame', burn: 1, tags: ['fire', 'spread'], desc: 'A roaring cone of fire that sets the horde ablaze.', react: { range: 2, burn: 1.5 }, conv: 'flameParticles', reactText: 'Range cards are doubled, burn cards 50% stronger, projectile cards add flame.' }
  ];

  // fx: built-in effects of the modification. color: tracer and accent colour.
  var MODS = [
    { key: 'standard', name: 'Standard', tier: 0, color: '#ffd678', tags: [], fx: {}, desc: 'Factory issue. No surprises.', react: {}, reactText: '' },
    { key: 'incendiary', name: 'Incendiary', tier: 1, color: '#ff7a2a', tags: ['fire'], fx: { burn: 1 }, desc: 'Sets zombies on fire.', react: { burn: 2 }, reactText: 'Burn cards are doubled.' },
    { key: 'cryo', name: 'Cryo', tier: 1, color: '#8fdcff', tags: ['ice'], fx: { slow: 1, freeze: 0.06 }, desc: 'Chills zombies and can freeze them solid.', react: { slow: 2, freeze: 2 }, reactText: 'Chill and freeze cards are doubled.' },
    { key: 'toxic', name: 'Toxic', tier: 1, color: '#9be23a', tags: ['toxic'], fx: { poison: 1 }, desc: 'Poison that stacks with every hit.', react: { poison: 2 }, conv: 'burnToPoison', reactText: 'Poison cards are doubled and burn cards also add poison.' },
    { key: 'heavy', name: 'Heavy', tier: 1, color: '#c9b18a', tags: ['damage'], dmg: 1.6, rof: 0.7, knock: 1.8, fx: {}, desc: '+60% damage and knockback, slower fire.', react: { dmg: 1.25, rof: 0.75 }, reactText: 'Damage cards 25% stronger, fire rate cards 25% weaker.' },
    { key: 'hair', name: 'Hair-Trigger', tier: 1, color: '#ffe066', tags: ['rapid'], dmg: 0.75, rof: 1.45, fx: {}, desc: '+45% fire rate, lighter rounds.', react: { rof: 1.25, dmg: 0.8 }, reactText: 'Fire rate cards 25% stronger, damage cards 20% weaker.' },
    { key: 'shock', name: 'Shock', tier: 2, color: '#fff36b', tags: ['shock'], fx: { shock: 1 }, desc: 'Hits arc lightning to a nearby zombie.', react: {}, conv: 'shockBonus', reactText: 'Chain lightning cards add 1 extra chain.' },
    { key: 'explosive', name: 'Explosive', tier: 2, color: '#ff5a3d', tags: ['explosive'], fx: { splash: 1 }, desc: 'Every hit bursts and splashes nearby zombies.', react: { splash: 1.5 }, reactText: 'Splash cards are 50% stronger.' },
    { key: 'ricochet', name: 'Ricochet', tier: 2, color: '#d2d8e0', tags: ['bounce'], fx: { bounce: 1 }, desc: 'Bullets bounce off walls and into the next zombie.', react: {}, conv: 'pierceToBounce', reactText: 'Pierce cards also add bounces.' },
    { key: 'seeker', name: 'Seeker', tier: 2, color: '#7affc8', tags: ['precision'], fx: { homing: 1 }, desc: 'Bullets curve toward the nearest zombie.', react: { range: 1.5 }, reactText: 'Range cards are 50% stronger.' },
    { key: 'vampiric', name: 'Vampiric', tier: 2, color: '#e0304a', tags: ['blood'], fx: { lifesteal: 0.02 }, desc: 'Drinks 2% of damage dealt as health.', react: { lifesteal: 2, regen: 2, killHeal: 2, heal: 2 }, reactText: 'Healing cards are doubled.' },
    { key: 'piercing', name: 'Piercing', tier: 2, color: '#b8c4ff', tags: ['pierce'], dmg: 0.9, pierce: 2, fx: {}, desc: 'Rounds punch through 2 extra zombies.', react: { pierce: 2 }, reactText: 'Pierce cards are doubled.' },
    { key: 'split', name: 'Split', tier: 2, color: '#ffa8e0', tags: ['spread'], fx: { split: 1 }, desc: 'On hit, each bullet splits into two shards.', react: {}, conv: 'multiToSplit', reactText: 'Projectile cards also add split shards.' },
    { key: 'scoped', name: 'Scoped', tier: 2, color: '#9fe8ff', tags: ['crit', 'precision'], range: 1.4, spread: 0.4, crit: 0.12, fx: {}, desc: '+40% range, tighter spread, +12% crit chance.', react: { crit: 1.5 }, reactText: 'Crit chance cards are 50% stronger.' },
    { key: 'overclocked', name: 'Overclocked', tier: 3, color: '#ff8a1a', tags: ['rapid'], dmg: 1.25, rof: 1.3, fx: { jamEvery: 40 }, desc: '+25% damage and fire rate, but jams every 40 shots.', react: { rof: 1.2 }, conv: 'rofDelaysJam', reactText: 'Fire rate cards also delay jams.' },
    { key: 'executioner', name: 'Executioner', tier: 3, color: '#ff3b3b', tags: ['damage', 'crit'], fx: { execute: 1 }, desc: 'Double damage to zombies under 30% health.', react: { execute: 2, crit: 1.2 }, reactText: 'Execute cards doubled, crit cards 20% stronger.' },
    { key: 'gravity', name: 'Gravity', tier: 3, color: '#a66bff', tags: ['void'], fx: { gravity: 1 }, desc: 'Hits drag nearby zombies into a cluster.', react: { splash: 1.3, gravity: 2 }, reactText: 'Splash cards 30% stronger, gravity cards doubled.' },
    { key: 'echo', name: 'Echo', tier: 3, color: '#7ab8ff', tags: ['rapid'], fx: { echo: 1 }, desc: 'Every shot repeats a moment later at 60% damage.', react: { dmg: 1.2 }, reactText: 'Damage cards are 20% stronger.' },
    { key: 'boomerang', name: 'Boomerang', tier: 3, color: '#ffc46b', tags: ['bounce'], fx: { boomerang: 1 }, desc: 'Bullets fly back to you and hit again.', react: { range: 1.5 }, conv: 'pierceToBounce', reactText: 'Range cards 50% stronger, pierce cards also add bounces.' },
    { key: 'hollow', name: 'Hollowpoint', tier: 3, color: '#ff9e9e', tags: ['crit'], crit: 0.05, critMul: 0.8, fx: {}, desc: 'Critical hits deal 3x damage.', react: { critDmg: 1.5 }, reactText: 'Crit damage cards are 50% stronger.' },
    { key: 'blessed', name: 'Blessed', tier: 3, color: '#fff2b0', tags: ['blood', 'luck'], fx: { killHeal: 1 }, desc: 'Kills heal 1. Ignores healing curses.', react: { heal: 2, regen: 2, killHeal: 2 }, conv: 'ignoreHealCurse', reactText: 'Healing cards doubled. Curses that cut healing do nothing.' },
    { key: 'cursed', name: 'Cursed', tier: 3, color: '#c23a8f', tags: ['curse', 'damage'], dmg: 1.5, fx: { taken: 0.15 }, desc: '+50% damage, but you take 15% more damage.', react: {}, conv: 'halveCurses', reactText: 'Curses on cards are halved.' },
    { key: 'volatile', name: 'Volatile', tier: 4, color: '#ff6a00', tags: ['crit', 'explosive'], crit: 0.05, fx: { volatile: 1 }, desc: 'Critical hits explode.', react: { crit: 1.3, splash: 1.3 }, reactText: 'Crit and splash cards are 30% stronger.' },
    { key: 'thunderclap', name: 'Thunderclap', tier: 4, color: '#e8f0ff', tags: ['shock'], fx: { thunder: 1, shock: 1 }, desc: 'Every 6th shot calls lightning for 4x damage.', react: { shock: 2 }, reactText: 'Chain lightning cards are doubled.' },
    { key: 'golden', name: 'Golden', tier: 4, color: '#ffcf3a', tags: ['luck'], dmg: 1.15, fx: { score: 0.5, luck: 1 }, desc: '+50% score, better card rarities, +15% damage.', react: { luck: 2, score: 2 }, reactText: 'Luck and score cards are doubled.' }
  ];

  // ---------- 1.9.993: ARMS, the guns rebuilt ten at a time on real ones (1.9.997: twenty) ----------
  // The 250 frame-and-mod guns rest while they are rebuilt, ten at a time. The first ten: five primaries and five
  // secondaries, each modelled on a real gun (military designations, real calibres, capacities, rates and muzzle
  // velocities), with its own reload technique, a special reload, a recoil sized to its round, ready-up and draw times.
  // base: the old frame the shared engines fall back on for a style (sound, flash, tracer, wounds); snd: the sound
  // and its pitch. real: what the armory shows. reload: tac (rounds left, bolt forward), empty (bolt or slide to run),
  // kind (the technique the animation and the sounds follow), special (its signature move).
  var ARMS = [
    { key: 'm4a1', slot: 'primary', name: 'M4A1', full: 'M4A1 Carbine', cls: 'carbine', base: 'rifle', snd: ['rifle', 1.0], mz: 'rifle', tier: 2,
      cal: '5.56×45mm NATO', mag: 30, chamber: 1, auto: 1, rpm: 800, dmg: 12, pellets: 1, spread: 0.05, speed: 900, range: 520, pierce: 0, crit: 0.06, knock: 70, move: 0.97,
      v: 900, g: 4.0, cd: 0.0011, kick: 0.016, rec: 2.4, max: 0.13, cam: 0.5, len: 26, ready: 0.24, draw: 0.62, holster: 0.5,
      reload: { tac: 2.05, empty: 2.55, kind: 'ar', special: 'Speed reload: the empty drops free while the fresh one is already on its way; the support hand slaps the bolt catch to send the bolt home.' },
      real: { barrel: '14.5 in (368 mm)', weight: '3.1 kg loaded', action: 'Gas, rotating bolt (direct impingement)', rate: '700–970 rounds/min', mv: '~900 m/s (M855)' },
      eject: { a: 1.75, s: 4.2, up: 2.2, kind: 'case556' }, tags: ['rapid', 'precision'], desc: 'The carbine the Operator trusts: light, quick to the shoulder, thirty rounds of 5.56 and a bolt that locks back to tell you it is empty.' },
    { key: 'ak74m', slot: 'primary', name: 'AK-74M', full: 'AK-74M Assault Rifle', cls: 'ak', base: 'rifle', snd: ['rifle', 0.9], mz: 'ak', tier: 2,
      cal: '5.45×39mm', mag: 30, chamber: 1, auto: 1, rpm: 650, dmg: 12, pellets: 1, spread: 0.055, speed: 900, range: 520, pierce: 0, crit: 0.05, knock: 72, move: 0.96,
      v: 900, g: 3.4, cd: 0.0012, kick: 0.017, rec: 2.5, max: 0.14, cam: 0.45, len: 27, ready: 0.27, draw: 0.66, holster: 0.52,
      reload: { tac: 2.3, empty: 2.85, kind: 'ak', special: 'Strip and rock: the fresh magazine knocks the empty out of the well, hooks the front lip in and rocks back until it clicks; on empty the support hand reaches under to rack the charging handle.' },
      real: { barrel: '415 mm (16.3 in)', weight: '3.4 kg', action: 'Gas, long-stroke piston, rotating bolt', rate: '600–650 rounds/min', mv: '~900 m/s (7N6)' },
      eject: { a: 1.45, s: 5.2, up: 2.4, kind: 'case545' }, tags: ['rapid', 'damage'], desc: 'Long-stroke and stubborn. The muzzle brake keeps the 5.45 flat; the brass flies far and to the front.' },
    { key: 'mk17', slot: 'primary', name: 'Mk 17', full: 'Mk 17 Battle Rifle', cls: 'scar', base: 'sniper', snd: ['sniper', 1.12], mz: 'battle', tier: 3,
      cal: '7.62×51mm NATO', mag: 20, chamber: 1, auto: 1, rpm: 600, dmg: 20, pellets: 1, spread: 0.045, speed: 790, range: 640, pierce: 1, crit: 0.08, knock: 140, move: 0.93,
      v: 790, g: 9.5, cd: 0.0009, kick: 0.045, rec: 1.9, max: 0.2, cam: 1.0, len: 29, ready: 0.31, draw: 0.72, holster: 0.58,
      reload: { tac: 2.4, empty: 3.0, kind: 'scar', special: 'Heavy gun, clean hands: on empty the support hand works the reciprocating charging handle on the left of the receiver, the firing hand never leaves the grip.' },
      real: { barrel: '16 in (406 mm)', weight: '3.6 kg', action: 'Gas, short-stroke piston, rotating bolt', rate: '~600 rounds/min', mv: '~790 m/s (M80)' },
      eject: { a: 1.65, s: 4.6, up: 2.6, kind: 'case762' }, tags: ['damage', 'pierce'], desc: 'Full-power 7.62: it drops what it hits and keeps going into the next. Twenty rounds, a hard push into the shoulder.' },
    { key: 'm1014', slot: 'primary', name: 'M1014', full: 'M1014 Combat Shotgun', cls: 'shotgun', base: 'shotgun', snd: ['shotgun', 1.0], mz: 'shotgun', tier: 2,
      cal: '12 gauge 00 buckshot', mag: 7, chamber: 1, auto: 0, rpm: 240, dmg: 7, pellets: 9, spread: 0.42, speed: 400, range: 300, pierce: 0, crit: 0.03, knock: 170, move: 0.95,
      v: 400, g: 3.5, cd: 0.0065, kick: 0.09, rec: 1.7, max: 0.16, cam: 1.25, len: 28, ready: 0.28, draw: 0.7, holster: 0.55, w: 6,
      reload: { tac: 0.42, empty: 0.95, kind: 'tube', perShell: 0.42, special: 'Combat load: on empty one shell goes straight into the open port and the bolt release sends it home, then the tube is fed shell by shell; firing stops the reload.' },
      real: { barrel: '18.5 in (470 mm)', weight: '3.8 kg', action: 'Gas, dual piston (ARGO), semi-automatic', rate: 'as fast as the trigger', mv: '~400 m/s per pellet' },
      eject: { a: 1.6, s: 3.4, up: 2.0, kind: 'shell12' }, tags: ['spread', 'damage'], desc: 'Nine pellets of 00 buck a pull. It feeds one shell at a time, and the tube is never full long.' },
    { key: 'pp19', slot: 'primary', name: 'PP-19', full: 'PP-19 Submachine Gun', cls: 'helix', base: 'smg', snd: ['smg', 0.92], mz: 'smg', tier: 2,
      cal: '9×18mm Makarov', mag: 64, chamber: 1, auto: 1, rpm: 680, dmg: 8, pellets: 1, spread: 0.1, speed: 320, range: 360, pierce: 0, crit: 0.04, knock: 48, move: 1.02,
      v: 320, g: 6.1, cd: 0.0019, kick: 0.012, rec: 2.2, max: 0.18, cam: 0.3, len: 22, ready: 0.22, draw: 0.55, holster: 0.45,
      reload: { tac: 2.6, empty: 3.1, kind: 'helix', special: 'The helical change: thumb the paddle catch, swing the long magazine down off its front pins, hook the new one on and rotate it up until it locks under the barrel.' },
      real: { barrel: '230 mm (9.1 in)', weight: '2.1 kg', action: 'Straight blowback, closed bolt', rate: '~680 rounds/min', mv: '~320 m/s' },
      eject: { a: 1.8, s: 3.2, up: 1.8, kind: 'case9' }, tags: ['rapid', 'speed'], desc: 'Sixty-four rounds in a helix under the barrel. Light, quick and soft-shooting: it buys time.' },
    { key: 'm17', slot: 'secondary', name: 'M17', full: 'M17 Pistol', cls: 'pistol', base: 'pistol', snd: ['pistol', 1.0], mz: 'pistol', tier: 1,
      cal: '9×19mm NATO', mag: 17, chamber: 1, auto: 0, rpm: 300, dmg: 14, pellets: 1, spread: 0.04, speed: 365, range: 430, pierce: 0, crit: 0.06, knock: 90, move: 1.0,
      v: 365, g: 8.0, cd: 0.0018, kick: 0.035, rec: 2.6, max: 0.16, cam: 0.35, len: 16, ready: 0.17, draw: 0.48, holster: 0.42,
      reload: { tac: 1.45, empty: 1.85, kind: 'pistol', special: 'Slide lock reload: the empty falls while the fresh one is indexed; the support thumb drops the slide release and he is back on target.' },
      real: { barrel: '120 mm (4.7 in)', weight: '834 g', action: 'Short recoil, striker-fired', rate: 'semi-automatic', mv: '~365 m/s' },
      eject: { a: 1.7, s: 3.0, up: 2.0, kind: 'case9' }, tags: ['precision', 'crit'], desc: 'Seventeen rounds of 9 mm, an optic and a light. The Operator\'s sidearm.' },
    { key: 'm9', slot: 'secondary', name: 'M9', full: 'M9 Pistol', cls: 'pistol', base: 'pistol', snd: ['pistol', 0.96], mz: 'pistol', tier: 1,
      cal: '9×19mm NATO', mag: 15, chamber: 1, auto: 0, rpm: 300, dmg: 14, pellets: 1, spread: 0.042, speed: 381, range: 430, pierce: 0, crit: 0.06, knock: 90, move: 1.0,
      v: 381, g: 8.0, cd: 0.0018, kick: 0.033, rec: 2.6, max: 0.16, cam: 0.35, len: 17, ready: 0.18, draw: 0.5, holster: 0.46,
      reload: { tac: 1.55, empty: 1.95, kind: 'pistol', special: 'Overhand rack: on empty the support hand comes over the top and slingshots the slide; on the way back to the holster his thumb rides the decocker.' },
      real: { barrel: '125 mm (4.9 in)', weight: '952 g', action: 'Short recoil, open slide, double/single action', rate: 'semi-automatic', mv: '~381 m/s' },
      eject: { a: 1.75, s: 3.1, up: 2.0, kind: 'case9' }, tags: ['precision', 'speed'], desc: 'The open slide never chokes on a round. Double action first shot, single after.' },
    { key: 'm1911', slot: 'secondary', name: 'M1911A1', full: 'M1911A1 Pistol', cls: 'pistol', base: 'pistol', snd: ['revolver', 1.18], mz: 'pistol45', tier: 2,
      cal: '.45 ACP', mag: 7, chamber: 1, auto: 0, rpm: 240, dmg: 22, pellets: 1, spread: 0.04, speed: 253, range: 400, pierce: 0, crit: 0.1, knock: 130, move: 1.0,
      v: 253, g: 14.9, cd: 0.002, kick: 0.055, rec: 2.2, max: 0.17, cam: 0.6, len: 16, ready: 0.18, draw: 0.5, holster: 0.44,
      reload: { tac: 1.55, empty: 1.85, kind: 'p1911', special: 'Single-stack, slide stop: seven fat rounds, the empty kicked free by the thumb on the release, the slide stop pressed down to close it.' },
      real: { barrel: '127 mm (5 in)', weight: '1.1 kg', action: 'Short recoil, single action', rate: 'semi-automatic', mv: '~253 m/s' },
      eject: { a: 1.6, s: 3.2, up: 2.2, kind: 'case45' }, tags: ['damage', 'crit'], desc: 'Seven rounds of .45, each one a decision. Heavy, slow and final.' },
    { key: 'm1917', slot: 'secondary', name: 'M1917', full: 'M1917 Revolver', cls: 'revolver', base: 'revolver', snd: ['revolver', 0.94], mz: 'revolver', tier: 2,
      cal: '.45 ACP (half-moon clips)', mag: 6, chamber: 0, auto: 0, rpm: 180, dmg: 24, pellets: 1, spread: 0.035, speed: 232, range: 400, pierce: 0, crit: 0.14, knock: 140, move: 1.0,
      v: 232, g: 14.9, cd: 0.002, kick: 0.06, rec: 2.0, max: 0.17, cam: 0.65, len: 19, ready: 0.2, draw: 0.55, holster: 0.48,
      reload: { tac: 3.0, empty: 3.0, kind: 'moon', special: 'Half-moon clips: the cylinder swings out, the muzzle tips up, one stroke of the ejector throws the empties and their clips to the ground, then two fresh clips of three, and the cylinder snaps shut.' },
      real: { barrel: '5.5 in (140 mm)', weight: '1.0–1.1 kg', action: 'Double/single action, swing-out cylinder', rate: 'double action', mv: '~232 m/s' },
      eject: null, tags: ['crit', 'damage'], desc: 'A Great War revolver that takes pistol rounds in half-moon clips. Six shots, no brass in the street until he reloads.' },
    { key: 'aps', slot: 'secondary', name: 'APS', full: 'APS Machine Pistol', cls: 'pistol', base: 'smg', snd: ['smg', 1.08], mz: 'pistolA', tier: 3,
      cal: '9×18mm Makarov', mag: 20, chamber: 1, auto: 1, rpm: 750, dmg: 9, pellets: 1, spread: 0.07, speed: 340, range: 380, pierce: 0, crit: 0.05, knock: 60, move: 1.0,
      v: 340, g: 6.1, cd: 0.0019, kick: 0.028, rec: 2.0, max: 0.24, cam: 0.4, len: 18, ready: 0.19, draw: 0.52, holster: 0.46,
      reload: { tac: 1.65, empty: 2.05, kind: 'pistol', special: 'Selector on the slide: twenty rounds at 750 a minute is gone in under two seconds; the slide stop holds it open and the empty is stripped out by the heel of the hand.' },
      real: { barrel: '140 mm (5.5 in)', weight: '1.22 kg', action: 'Straight blowback, select fire', rate: '~750 rounds/min', mv: '~340 m/s' },
      eject: { a: 1.75, s: 2.8, up: 1.8, kind: 'case9' }, tags: ['rapid', 'speed'], desc: 'A pistol that fires like a submachine gun. Hard to hold on target: short bursts.' },
    // ---------- 1.9.997: ten more, five long guns and five sidearms, no two sharing an action, a round and a silhouette ----------
    { key: 'mp5a3', slot: 'primary', name: 'MP5A3', full: 'Heckler & Koch MP5A3 Submachine Gun', cls: 'smg', base: 'smg', snd: ['smg', 1.0], mz: 'smg9', tier: 2,
      cal: '9×19mm NATO', mag: 30, chamber: 1, auto: 1, rpm: 800, dmg: 9, pellets: 1, spread: 0.06, speed: 400, range: 380, pierce: 0, crit: 0.05, knock: 55, move: 1.03,
      v: 400, g: 8.0, cd: 0.0018, kick: 0.011, rec: 2.3, max: 0.12, cam: 0.28, len: 20, ready: 0.21, draw: 0.52, holster: 0.44,
      reload: { tac: 1.9, empty: 2.3, kind: 'mp5', special: 'The HK slap: the bolt locked back in its notch, the paddle drops the empty, the fresh one rocks straight in, and the heel of the support hand slaps the charging handle down.' },
      real: { barrel: '225 mm (8.9 in)', weight: '2.54 kg', action: 'Roller-delayed blowback, closed bolt', rate: '800 rounds/min', mv: '~400 m/s' },
      eject: { a: 1.7, s: 3.4, up: 1.9, kind: 'case9' }, tags: ['rapid', 'precision'], desc: 'The roller-delayed nine: closed bolt, flat and quiet, thirty rounds that go where the sights are.' },
    { key: 'm249', slot: 'primary', name: 'M249', full: 'M249 Squad Automatic Weapon', cls: 'lmg', base: 'lmg', snd: ['rifle', 0.95], mz: 'saw', tier: 3,
      cal: '5.56×45mm NATO (M27 link)', mag: 200, chamber: 0, auto: 1, rpm: 800, dmg: 11, pellets: 1, spread: 0.09, speed: 915, range: 560, pierce: 0, crit: 0.04, knock: 65, move: 0.86,
      v: 915, g: 4.0, cd: 0.0011, kick: 0.012, rec: 2.0, max: 0.2, cam: 0.45, len: 34, ready: 0.42, draw: 0.95, holster: 0.8,
      reload: { tac: 7.0, empty: 7.0, kind: 'belt', special: 'The belt: the feed cover flips up, the empty pouch comes off, the new one hangs on, the first round is laid against the stop and the cover slammed; then the handle, if the bolt is forward.' },
      real: { barrel: '465 mm (18.3 in)', weight: '7.5 kg; 10 kg with 200 rounds', action: 'Gas, open bolt, rotating bolt', rate: '725–850 rounds/min', mv: '~915 m/s' },
      eject: { a: 1.55, s: 4.4, up: 1.6, kind: 'case556', link: true }, tags: ['rapid', 'tank'], desc: 'Two hundred rounds on a belt. Heavy to carry, slow to feed, and it does not stop.' },
    { key: 'mk14', slot: 'primary', name: 'Mk 14', full: 'Mk 14 Mod 0 Enhanced Battle Rifle', cls: 'dmr', base: 'sniper', snd: ['sniper', 1.0], mz: 'vortex', tier: 3,
      cal: '7.62×51mm NATO', mag: 20, chamber: 1, auto: 0, rpm: 300, dmg: 24, pellets: 1, spread: 0.03, speed: 853, range: 700, pierce: 1, crit: 0.12, knock: 150, move: 0.92,
      v: 853, g: 9.5, cd: 0.0009, kick: 0.05, rec: 1.8, max: 0.18, cam: 1.0, len: 31, ready: 0.33, draw: 0.76, holster: 0.6,
      reload: { tac: 2.5, empty: 2.9, kind: 'ebr', special: 'Rock and shunk: the magazine hooks at the front and rocks back until it clicks; on empty the op-rod handle on the right is pulled and let go with a ring of steel.' },
      real: { barrel: '18 in (457 mm)', weight: '5.1 kg; 6.4 kg loaded', action: 'Gas, rotating bolt (the M14 action in a chassis)', rate: 'semi-automatic (select-fire capable)', mv: '~853 m/s' },
      eject: { a: 1.6, s: 4.8, up: 2.4, kind: 'case762' }, tags: ['precision', 'pierce'], desc: 'The M14 action in an aluminium chassis: a marksman\'s 7.62 that reaches the end of the street.' },
    { key: 'm590a1', slot: 'primary', name: 'M590A1', full: 'Mossberg 590A1 Pump Shotgun', cls: 'pump', base: 'shotgun', snd: ['shotgun', 0.96], mz: 'shotgun', tier: 2,
      cal: '12 gauge 00 buckshot', mag: 8, chamber: 1, auto: 0, rpm: 75, dmg: 8, pellets: 9, spread: 0.4, speed: 366, range: 300, pierce: 0, crit: 0.03, knock: 190, move: 0.95,
      v: 366, g: 3.5, cd: 0.0065, kick: 0.1, rec: 1.5, max: 0.16, cam: 1.4, len: 29, ready: 0.3, draw: 0.72, holster: 0.56, w: 6, cycle: 0.5,
      reload: { tac: 0.9, empty: 1.5, kind: 'pump', perShell: 0.9, special: 'Port load: shells thumbed one at a time into the gate under the receiver; on an empty chamber one is racked straight in. Every shot is followed by the pump: back with a shuck, forward with a chak.' },
      real: { barrel: '20 in (508 mm), heavy wall', weight: '3.3 kg', action: 'Pump, twin action bars, tang safety', rate: 'as fast as the pump', mv: '~366 m/s per pellet' },
      eject: { a: 1.6, s: 3.2, up: 2.2, kind: 'shell12', onPump: true }, tags: ['spread', 'damage'], desc: 'Eight in the tube and one in the pipe. Nothing to jam, nothing to lock back: the hand is the action.' },
    { key: 'aug', slot: 'primary', name: 'AUG A3', full: 'Steyr AUG A3 Bullpup Rifle', cls: 'bullpup', base: 'rifle', snd: ['rifle', 1.06], mz: 'prong', tier: 2,
      cal: '5.56×45mm NATO', mag: 30, chamber: 1, auto: 1, rpm: 700, dmg: 12, pellets: 1, spread: 0.05, speed: 940, range: 540, pierce: 0, crit: 0.06, knock: 70, move: 0.99,
      v: 940, g: 4.0, cd: 0.0011, kick: 0.015, rec: 2.5, max: 0.13, cam: 0.45, len: 22, ready: 0.22, draw: 0.58, holster: 0.48,
      reload: { tac: 2.5, empty: 2.9, kind: 'bullpup', special: 'The magazine behind the grip: the thumb lifts the paddle, the translucent magazine comes down past the hip, the fresh one goes straight up by feel, and the bolt release on the left of the stock sends it home.' },
      real: { barrel: '16 in (417 mm)', weight: '3.7 kg', action: 'Gas, short-stroke piston, rotating bolt (bullpup)', rate: '680–750 rounds/min', mv: '~940 m/s' },
      eject: { a: 1.5, s: 4.0, up: 2.0, kind: 'case556' }, tags: ['rapid', 'speed'], desc: 'A full-length barrel in a gun no longer than a carbine with its stock folded. Handy round corners.' },
    { key: 'g17', slot: 'secondary', name: 'G17', full: 'Glock 17 Gen5', cls: 'pistol', base: 'pistol', snd: ['pistol', 1.04], mz: 'pistol', tier: 1,
      cal: '9×19mm', mag: 17, chamber: 1, auto: 0, rpm: 320, dmg: 14, pellets: 1, spread: 0.04, speed: 375, range: 430, pierce: 0, crit: 0.06, knock: 90, move: 1.0,
      v: 375, g: 8.0, cd: 0.0018, kick: 0.034, rec: 2.7, max: 0.15, cam: 0.33, len: 16, ready: 0.16, draw: 0.46, holster: 0.4,
      reload: { tac: 1.4, empty: 1.75, kind: 'pistol', special: 'Slide stop with the thumb: the empty falls, the fresh one goes in with the index finger along its front, and the support thumb drops the slide.' },
      real: { barrel: '114 mm (4.5 in)', weight: '630 g; 945 g loaded', action: 'Short recoil, striker-fired (Safe Action)', rate: 'semi-automatic', mv: '~375 m/s' },
      eject: { a: 1.7, s: 3.0, up: 2.0, kind: 'case9' }, tags: ['precision', 'speed'], desc: 'The polymer nine that goes everywhere. Seventeen rounds, a trigger that does not care about rain.' },
    { key: 'deagle', slot: 'secondary', name: 'Desert Eagle', full: 'Desert Eagle Mark XIX .50 AE', cls: 'magnum', base: 'revolver', snd: ['revolver', 0.8], mz: 'magnum', tier: 3,
      cal: '.50 Action Express', mag: 7, chamber: 1, auto: 0, rpm: 150, dmg: 34, pellets: 1, spread: 0.035, speed: 470, range: 420, pierce: 1, crit: 0.14, knock: 210, move: 0.98,
      v: 470, g: 19, cd: 0.002, kick: 0.085, rec: 1.6, max: 0.2, cam: 0.9, len: 20, ready: 0.24, draw: 0.6, holster: 0.52,
      reload: { tac: 2.1, empty: 2.5, kind: 'pistol', special: 'Two kilos of steel: the magazine is short and fat, the slide heavy enough that the whole hand goes over the top to run it.' },
      real: { barrel: '6 in (152 mm)', weight: '2.0 kg', action: 'Gas-operated, rotating bolt, single action', rate: 'semi-automatic', mv: '~470 m/s' },
      eject: { a: 1.6, s: 3.6, up: 2.4, kind: 'case50' }, tags: ['damage', 'crit'], desc: 'A rifle round in a pistol frame. Seven shots, each one lights the street.' },
    { key: 'm29', slot: 'secondary', name: 'Model 29', full: 'Smith & Wesson Model 29 .44 Magnum', cls: 'revolver', base: 'revolver', snd: ['revolver', 1.0], mz: 'magnum', tier: 3,
      cal: '.44 Remington Magnum', mag: 6, chamber: 0, auto: 0, rpm: 150, dmg: 30, pellets: 1, spread: 0.03, speed: 360, range: 420, pierce: 0, crit: 0.18, knock: 190, move: 1.0,
      v: 360, g: 16, cd: 0.002, kick: 0.08, rec: 1.6, max: 0.2, cam: 0.85, len: 20, ready: 0.21, draw: 0.56, holster: 0.5,
      reload: { tac: 2.8, empty: 2.8, kind: 'speed', special: 'The speedloader: thumb latch, the cylinder out to the left, muzzle up and one stroke of the ejector, six rounds in together with a twist, and the cylinder closed with the left thumb.' },
      real: { barrel: '6.5 in (165 mm)', weight: '1.37 kg', action: 'Double/single action, swing-out cylinder (N-frame)', rate: 'double action', mv: '~360 m/s' },
      eject: null, tags: ['crit', 'damage'], desc: 'The .44 Magnum. Six rounds, a flash that lights his face, and the longest recovery of anything he carries.' },
    { key: 'fiveseven', slot: 'secondary', name: 'Five-seveN', full: 'FN Five-seveN MK2', cls: 'pistol', base: 'pistol', snd: ['pistol', 1.22], mz: 'pistol57', tier: 2,
      cal: '5.7×28mm', mag: 20, chamber: 1, auto: 0, rpm: 330, dmg: 12, pellets: 1, spread: 0.035, speed: 650, range: 480, pierce: 1, crit: 0.08, knock: 60, move: 1.0,
      v: 650, g: 2.0, cd: 0.0012, kick: 0.022, rec: 3.0, max: 0.12, cam: 0.25, len: 16, ready: 0.16, draw: 0.46, holster: 0.4,
      reload: { tac: 1.4, empty: 1.75, kind: 'pistol', special: 'Light and long: the twenty-round magazine weighs nothing and the slide runs on a polymer frame with a click instead of a clack.' },
      real: { barrel: '122 mm (4.8 in)', weight: '610 g', action: 'Delayed blowback, striker-fired', rate: 'semi-automatic', mv: '~650 m/s' },
      eject: { a: 1.75, s: 3.2, up: 2.1, kind: 'case57' }, tags: ['precision', 'pierce'], desc: 'A tiny bottleneck round at rifle speed: it punches through and barely moves the gun.' },
    { key: 'coach', slot: 'secondary', name: 'Coach Gun', full: 'Sawed-off Coach Gun, 12 gauge', cls: 'break', base: 'shotgun', snd: ['shotgun', 1.1], mz: 'coach', tier: 2,
      cal: '12 gauge 00 buckshot', mag: 2, chamber: 0, auto: 0, rpm: 240, dmg: 8, pellets: 9, spread: 0.55, speed: 340, range: 200, pierce: 0, crit: 0.03, knock: 200, move: 1.0,
      v: 340, g: 3.5, cd: 0.0065, kick: 0.12, rec: 1.4, max: 0.16, cam: 1.5, len: 20, ready: 0.22, draw: 0.58, holster: 0.5, w: 6,
      reload: { tac: 3.0, empty: 3.0, kind: 'break', special: 'Break it open: the top lever over, the barrels drop, the two hulls pulled out by hand (no ejectors), two fresh shells in and the gun snapped shut on the way back up.' },
      real: { barrel: '12 in (305 mm), cut down', weight: '2.4 kg', action: 'Break-action side by side, two triggers', rate: 'two shots, then the break', mv: '~340 m/s per pellet' },
      eject: null, tags: ['spread', 'damage'], desc: 'Two barrels cut to the length of a forearm. Two shots that fill the alley, then it has to be broken open.' }
  ];

  var RAR = [
    { name: 'Common', color: '#a9adb5' }, { name: 'Uncommon', color: '#7bc96a' }, { name: 'Rare', color: '#5aa8ff' },
    { name: 'Epic', color: '#bb7cff' }, { name: 'Legendary', color: '#ff8a3d' }, { name: 'Cursed', color: '#e0457b' },
    { name: 'Forbidden', color: '#ff2d4a' }
  ];
  function weaponRarity(t) { return t <= 1 ? 0 : t <= 3 ? 1 : t === 4 ? 2 : t === 5 ? 3 : 4; }

  function buildWeapons() {
    var list = [];
    FRAMES.forEach(function (F, fi) {
      MODS.forEach(function (M, mi) {
        var id = fi * MODS.length + mi, R = rng(hash32(id * 977 + 31)), j = function (a) { return 1 - a + R() * a * 2; };
        var fx = {}; Object.keys(M.fx).forEach(function (k) { fx[k] = M.fx[k]; });
        if (F.burn) fx.burn = (fx.burn || 0) + F.burn;
        var w = {
          id: id, num: id + 1, code: 'ZC-' + String(id + 1).padStart(3, '0'), F: F, M: M, name: (M.key === 'standard' ? 'Standard ' : M.name + ' ') + F.name,
          tier: F.tier + M.tier, rarity: weaponRarity(F.tier + M.tier),
          dmg: F.dmg * (M.dmg || 1) * j(0.06), rof: F.rof * (M.rof || 1) * j(0.05), pellets: F.pellets, burst: F.burst || 1,
          spread: F.spread * (M.spread || 1), speed: F.speed, range: F.range * (M.range || 1), pierce: F.pierce + (M.pierce || 0),
          crit: F.crit + (M.crit || 0), critMul: 2.2 + (M.critMul || 0), knock: F.knock * (M.knock || 1), move: F.move,
          blast: F.blast || 0, kind: F.kind || 'bullet', fx: fx, color: M.color,
          tags: F.tags.concat(M.tags.filter(function (t) { return F.tags.indexOf(t) < 0; }))
        };
        w.dps = w.dmg * w.pellets * w.burst * w.rof;
        w.off = true;   // resting while the 250 are rebuilt ten at a time
        list.push(w);
      });
    });
    // the rebuilt guns, after the 250 (their ids are what co-op sends for a shot, so the old ones keep theirs)
    ARMS.forEach(function (A, i) {
      var F = { key: A.key, base: A.base, name: A.name, box: A.slot === 'primary' ? [-66, 66] : [-26, 46], tier: A.tier, dmg: A.dmg, rof: A.rpm / 60, pellets: A.pellets, spread: A.spread, speed: A.speed, range: A.range,
        pierce: A.pierce, crit: A.crit, knock: A.knock, move: A.move, tags: A.tags, desc: A.desc, react: {}, reactText: '', arms: A };
      var M = MODS[0], id = list.length;
      var w = { id: id, num: id + 1, code: 'ZC-' + A.key.toUpperCase(), F: F, M: M, name: A.name, tier: A.tier, rarity: weaponRarity(A.tier + 1),
        dmg: A.dmg, rof: A.rpm / 60, pellets: A.pellets, burst: 1, spread: A.spread, speed: A.speed, range: A.range, pierce: A.pierce, crit: A.crit, critMul: 2.2,
        knock: A.knock, move: A.move, blast: 0, kind: 'bullet', fx: {}, color: '#ffd678', tags: A.tags.slice(), arms: A, slot: A.slot };
      w.dps = w.dmg * w.pellets * w.rof;
      list.push(w);
    });
    return list;
  }

  // ---------- cards ----------
  // r: 0 common .. 4 legendary, 5 cursed. fx: buffs. curse: drawbacks. max: how many times it can be taken.
  var CARDS = [
    { id: 'hollow', name: 'Hollow Points', r: 0, tags: ['damage'], fx: { dmg: 0.15 } },
    { id: 'trigger', name: 'Light Trigger', r: 0, tags: ['rapid'], fx: { rof: 0.12 } },
    { id: 'shoes', name: 'Running Shoes', r: 0, tags: ['speed'], fx: { move: 0.08 }, max: 5 },
    { id: 'plates', name: 'Trauma Plates', r: 0, tags: ['tank'], fx: { maxHp: 20, heal: 20 } },
    { id: 'barrel', name: 'Long Barrel', r: 0, tags: ['precision'], fx: { range: 0.15 }, max: 4 },
    { id: 'dressing', name: 'Field Dressing', r: 0, tags: ['blood'], fx: { killHeal: 1 }, max: 4 },
    { id: 'aim', name: 'Steady Aim', r: 0, tags: ['crit'], fx: { crit: 0.05 } },
    { id: 'step', name: 'Quick Step', r: 0, tags: ['speed'], fx: { dash: 0.15 }, max: 3 },
    { id: 'medkit', name: 'Medkit', r: 0, tags: ['blood'], fx: { heal: 60 } },
    { id: 'ember', name: 'Ember Rounds', r: 0, tags: ['fire'], fx: { burn: 1 }, curse: { dmg: -0.05 } },
    { id: 'splitb', name: 'Split Barrel', r: 1, tags: ['spread'], fx: { multi: 1 }, curse: { dmg: -0.1 }, max: 4 },
    { id: 'ap', name: 'AP Rounds', r: 1, tags: ['pierce'], fx: { pierce: 1 }, max: 5 },
    { id: 'nanite', name: 'Nanite Shot', r: 1, tags: ['blood', 'tank'], fx: { regen: 1.5 }, max: 4 },
    { id: 'deadeye', name: 'Deadeye', r: 1, tags: ['crit', 'precision'], fx: { crit: 0.08, critDmg: 0.2 } },
    { id: 'kevlar', name: 'Kevlar Vest', r: 1, tags: ['tank'], fx: { taken: -0.1 }, max: 3 },
    { id: 'napalm', name: 'Napalm Coating', r: 1, tags: ['fire'], fx: { burn: 1, dmg: 0.05 } },
    { id: 'cryoc', name: 'Cryo Coating', r: 1, tags: ['ice'], fx: { slow: 1 } },
    { id: 'static', name: 'Static Charge', r: 1, tags: ['shock'], fx: { shock: 1 } },
    { id: 'fragr', name: 'Frag Rounds', r: 1, tags: ['explosive'], fx: { splash: 1 } },
    { id: 'venom', name: 'Venom Tips', r: 1, tags: ['toxic'], fx: { poison: 1 } },
    { id: 'twin', name: 'Twin Barrel', r: 2, tags: ['spread'], fx: { multi: 2 }, curse: { dmg: -0.15 } },
    { id: 'rico', name: 'Ricochet Rounds', r: 2, tags: ['bounce'], fx: { bounce: 1 }, max: 3 },
    { id: 'adren', name: 'Adrenaline', r: 2, tags: ['rapid', 'speed'], fx: { rof: 0.2, move: 0.1 } },
    { id: 'bloodline', name: 'Bloodline', r: 2, tags: ['blood'], fx: { lifesteal: 0.03 }, max: 3 },
    { id: 'hunter', name: "Hunter's Mark", r: 2, tags: ['damage', 'precision'], fx: { elite: 0.35 } },
    { id: 'overp', name: 'Overpressure', r: 2, tags: ['damage', 'rapid'], fx: { dmg: 0.3, rof: 0.1 } },
    { id: 'seekchip', name: 'Seeker Chip', r: 2, tags: ['precision'], fx: { homing: 1, range: 0.1 }, max: 1 },
    { id: 'riot', name: 'Riot Shield', r: 2, tags: ['tank'], fx: { taken: -0.15, maxHp: 15 } },
    { id: 'execu', name: 'Executioner', r: 3, tags: ['damage', 'crit'], fx: { execute: 0.8 } },
    { id: 'storm', name: 'Storm Caller', r: 3, tags: ['shock'], fx: { shock: 2, dmg: 0.1 } },
    { id: 'inferno', name: 'Inferno', r: 3, tags: ['fire', 'explosive'], fx: { burn: 2, splash: 1 } },
    { id: 'phoenix', name: 'Phoenix Feather', r: 3, tags: ['blood'], fx: { phoenix: 1 }, max: 1 },
    { id: 'hell', name: 'Bullet Hell', r: 3, tags: ['spread', 'rapid'], fx: { multi: 3, rof: 0.1 }, curse: { dmg: -0.25 } },
    { id: 'perma', name: 'Permafrost', r: 3, tags: ['ice'], fx: { slow: 2, freeze: 0.12 } },
    { id: 'plague', name: 'Plague Bearer', r: 3, tags: ['toxic', 'explosive'], fx: { poison: 2, splash: 1 } },
    { id: 'godslayer', name: 'Godslayer', r: 4, tags: ['damage', 'crit'], fx: { dmg: 1, critDmg: 0.5 } },
    { id: 'dilation', name: 'Time Dilation', r: 4, tags: ['speed'], fx: { zspeed: -0.25 }, max: 1 },
    { id: 'hydra', name: 'Hydra Rounds', r: 4, tags: ['spread'], fx: { split: 2 }, max: 2 },
    { id: 'midas', name: 'Midas Touch', r: 4, tags: ['luck'], fx: { score: 1, luck: 1 } },
    { id: 'singular', name: 'Singularity Core', r: 4, tags: ['void', 'explosive'], fx: { gravity: 1, splash: 2 } },
    { id: 'bloodpact', name: 'Blood Pact', r: 5, tags: ['damage', 'blood', 'curse'], fx: { dmg: 0.6 }, curse: { maxHp: -25 } },
    { id: 'glass', name: 'Glass Cannon', r: 5, tags: ['crit', 'curse'], fx: { dmg: 0.8, crit: 0.15 }, curse: { taken: 0.4 } },
    { id: 'berserk', name: 'Berserk Pact', r: 5, tags: ['rapid', 'speed', 'curse'], fx: { rof: 0.4, move: 0.15 }, curse: { healMul: -0.5 } },
    { id: 'magnet', name: 'Horde Magnet', r: 5, tags: ['luck', 'curse'], fx: { score: 1, luck: 1 }, curse: { horde: 0.3 } },
    { id: 'heavyheart', name: 'Heavy Heart', r: 5, tags: ['pierce', 'damage', 'curse'], fx: { pierce: 3, dmg: 0.5 }, curse: { move: -0.2 } },
    { id: 'hex', name: 'Hex Rounds', r: 5, tags: ['spread', 'curse'], fx: { multi: 2, dmg: 0.25 }, curse: { jam: 30 } },
    { id: 'night', name: 'Night Terror', r: 5, tags: ['crit', 'curse'], fx: { crit: 0.4, critDmg: 1 }, curse: { vision: 1 } },
    { id: 'hunger', name: 'Feral Hunger', r: 5, tags: ['blood', 'curse'], fx: { killHeal: 5, lifesteal: 0.03 }, curse: { maxHp: -30 } },
    { id: 'omen', name: 'Bad Omen', r: 5, tags: ['luck', 'curse'], fx: { luck: 2, dmg: 0.2 }, curse: { zspeed: 0.2 } }
  ];
  // Forbidden modifications: only offered by the skull at every 100-kill chain. Enormous power, brutal price.
  var FORBIDDEN = [
    { id: 'f_blood', name: 'Blood Engine', r: 6, tags: ['rapid', 'blood'], icon: 'blood', fx: { rof: 1.2, dmg: 0.3 }, curse: { hpPerShot: 0.4, taken: 0.25 }, lore: 'Your gun drinks from you.' },
    { id: 'f_nuke', name: 'Nuclear Rounds', r: 6, tags: ['explosive', 'damage'], icon: 'explosive', fx: { splash: 4, dmg: 0.8 }, curse: { maxHpPct: -0.4, zspeed: 0.15 }, lore: 'Every bullet is a warhead.' },
    { id: 'f_hydra', name: "Hydra's Wrath", r: 6, tags: ['spread'], icon: 'spread', fx: { multi: 5, split: 2 }, curse: { move: -0.35, zspeed: 0.2 }, lore: 'Cut one head off, five more fire.' },
    { id: 'f_god', name: 'God Complex', r: 6, tags: ['crit', 'damage'], icon: 'crit', fx: { dmg: 2.5, crit: 0.3, critDmg: 1 }, curse: { taken: 1, maxHpPct: -0.3 }, lore: 'Untouchable power. Paper skin.' },
    { id: 'f_storm', name: 'Bullet Storm', r: 6, tags: ['rapid', 'bounce'], icon: 'rapid', fx: { rof: 2, bounce: 3 }, curse: { jam: 14, taken: 0.3 }, lore: 'The barrel cannot keep up.' },
    { id: 'f_reaper', name: "Reaper's Deal", r: 6, tags: ['blood'], icon: 'curse', fx: { lifesteal: 0.08, killHeal: 6 }, curse: { zhp: 0.6, horde: 0.3 }, lore: 'The dead feed you. The living grow stronger.' },
    { id: 'f_horizon', name: 'Event Horizon', r: 6, tags: ['void', 'explosive'], icon: 'void', fx: { gravity: 3, splash: 2, pierce: 3 }, curse: { vision: 2, zspeed: 0.15 }, lore: 'Light itself bends away from you.' },
    { id: 'f_thief', name: 'Time Thief', r: 6, tags: ['speed'], icon: 'speed', fx: { zspeed: -0.4, move: 0.3 }, curse: { horde: 1, zhp: 0.2 }, lore: 'Stolen seconds. Twice the dead.' },
    { id: 'f_inferno', name: 'Inferno Heart', r: 6, tags: ['fire', 'toxic'], icon: 'fire', fx: { burn: 5, poison: 3, dmg: 0.3 }, curse: { selfDps: 2, healMul: -0.3 }, lore: 'You burn as bright as they do.' },
    { id: 'f_stormgod', name: 'Storm God', r: 6, tags: ['shock'], icon: 'shock', fx: { shock: 6, thunder: 1 }, curse: { taken: 0.6, healMul: -0.5 }, lore: 'The sky answers. It also strikes back.' },
    { id: 'f_mirror', name: 'Mirror Soul', r: 6, tags: ['bounce', 'pierce'], icon: 'bounce', fx: { pierce: 3, bounce: 3, homing: 1, echo: 1 }, curse: { bossHp: 1, zhp: 0.3 }, lore: 'Every shot hunts twice. The Alphas grow huge.' },
    { id: 'f_door', name: "Death's Door", r: 6, tags: ['blood'], icon: 'curse', fx: { phoenix: 2, dmg: 0.5 }, curse: { maxHpPct: -0.5, healMul: -0.4 }, lore: 'Die twice. Live on half a heart.' }
  ];
  // label, format, and whether a positive value is good for the player
  var STAT = {
    dmg: ['Damage', 'pct', 1], rof: ['Fire rate', 'pct', 1], multi: ['Projectiles', 'add', 1], burst: ['Burst rounds', 'add', 1], flame: ['Flame jets', 'add', 1], pierce: ['Pierce', 'add', 1], blast: ['Blast size', 'pct', 1],
    range: ['Range', 'pct', 1], crit: ['Crit chance', 'pct', 1], critDmg: ['Crit damage', 'pct', 1], move: ['Move speed', 'pct', 1],
    maxHp: ['Max health', 'add', 1], heal: ['Heal now', 'add', 1], regen: ['Health per second', 'add', 1], taken: ['Damage taken', 'pct', -1],
    dash: ['Dash recharge', 'pct', 1], killHeal: ['Heal per kill', 'add', 1], lifesteal: ['Lifesteal', 'pct', 1], burn: ['Burn', 'lvl', 1],
    slow: ['Chill', 'lvl', 1], freeze: ['Freeze chance', 'pct', 1], shock: ['Lightning chains', 'add', 1], splash: ['Splash', 'lvl', 1], poison: ['Poison', 'lvl', 1],
    bounce: ['Bounces', 'add', 1], elite: ['Boss damage', 'pct', 1], homing: ['Homing bullets', 'flag', 1], execute: ['Execute damage', 'pct', 1],
    phoenix: ['Revives', 'add', 1], zspeed: ['Zombie speed', 'pct', -1], split: ['Split shards', 'add', 1], score: ['Score', 'pct', 1],
    luck: ['Luck', 'add', 1], gravity: ['Gravity pull', 'lvl', 1], horde: ['Zombies per wave', 'pct', -1], healMul: ['Healing', 'pct', 1],
    jam: ['Gun jams every', 'jam', -1], vision: ['Darkness', 'lvl', -1],
    hpPerShot: ['Health cost per shot', 'add', -1], selfDps: ['Health lost per second', 'add', -1], zhp: ['Zombie health', 'pct', -1],
    bossHp: ['Boss health', 'pct', -1], thunder: ['Lightning every 6th shot', 'flag', 1], echo: ['Every shot fires twice', 'flag', 1], maxHpPct: ['Max health', 'pct', 1]
  };
  var INT = { thunder: 1, echo: 1, multi: 1, burst: 1, flame: 1, pierce: 1, maxHp: 1, heal: 1, killHeal: 1, shock: 1, bounce: 1, split: 1, phoenix: 1, luck: 1, jam: 1, burn: 1, slow: 1, splash: 1, poison: 1, gravity: 1, vision: 1, homing: 1 };
  function round(k, v) { if (!INT[k]) return v; var r = Math.round(v); return r === 0 ? (v > 0 ? 1 : v < 0 ? -1 : 0) : r; }

  // How a card plays out with a given weapon: synergy, frame/mod reactions, conversions, curse handling.
  function cardEffects(card, w) {
    var lines = [], notes = [], synergy = false;
    if (w) synergy = card.tags.some(function (t) { return t !== 'curse' && w.tags.indexOf(t) >= 0; });
    function push(k, v, good, note) { if (!v) return; var ex = lines.filter(function (l) { return l.k === k && l.curse === !good; })[0]; if (ex) ex.v += v; else lines.push({ k: k, v: v, curse: !good }); if (note && notes.indexOf(note) < 0) notes.push(note); }
    Object.keys(card.fx || {}).forEach(function (k) {
      var v = card.fx[k], m = 1, F = w && w.F, M = w && w.M;
      if (synergy) m *= 1.5;
      if (F && F.react[k]) m *= F.react[k];
      if (M && M.react[k]) m *= M.react[k];
      var val = v * m;
      if (F && F.conv === 'doublePellets' && k === 'multi') { val *= 2; notes.push('Shotgun: double pellets'); }
      if (F && F.conv === 'burstRounds' && k === 'multi') { push('burst', round('burst', val), true, 'Burst Rifle: adds burst rounds'); return; }
      if (F && F.conv === 'flameParticles' && k === 'multi') { push('flame', round('flame', val * 3), true, 'Flamethrower: adds flame jets'); return; }
      if (F && F.conv === 'pierceToBlast' && k === 'pierce') { push('blast', val * 0.2, true, 'Launcher: pierce grows the blast'); return; }
      if (F && F.conv === 'rofToDmg' && k === 'rof') { push('dmg', val * 0.5, true, 'Sniper: half of fire rate becomes damage'); val *= 0.5; }
      if (F && F.conv === 'pierceBonus' && k === 'pierce') { val += 1; notes.push('Assault Rifle: +1 extra pierce'); }
      if (M && M.conv === 'pierceToBounce' && k === 'pierce') push('bounce', round('bounce', val), true, M.name + ': pierce also adds bounces');
      if (M && M.conv === 'multiToSplit' && k === 'multi') push('split', round('split', val), true, 'Split: projectiles also add shards');
      if (M && M.conv === 'burnToPoison' && k === 'burn') push('poison', round('poison', val), true, 'Toxic: burn also adds poison');
      if (M && M.conv === 'shockBonus' && k === 'shock') { val += 1; notes.push('Shock: +1 extra chain'); }
      push(k, round(k, val), true);
    });
    Object.keys(card.curse || {}).forEach(function (k) {
      var v = card.curse[k], M = w && w.M;
      if (M && M.conv === 'halveCurses') { v = k === 'jam' ? Math.round(v * 2) : v * 0.5; notes.push('Cursed weapon: curse halved'); }
      if (M && M.conv === 'ignoreHealCurse' && k === 'healMul') { notes.push('Blessed: healing curse ignored'); return; }
      push(k, round(k, v), false);
    });
    if (w && w.M.conv === 'rofDelaysJam' && card.fx && card.fx.rof) notes.push('Overclocked: fire rate also delays jams');
    return { lines: lines, notes: notes, synergy: synergy };
  }
  function fmtLine(l) {
    var s = STAT[l.k] || [l.k, 'add', 1], v = l.v, txt;
    if (s[1] === 'pct') txt = (v > 0 ? '+' : '') + Math.round(v * 100) + '% ' + s[0];
    else if (s[1] === 'add') txt = (v > 0 ? '+' : '') + Math.round(v * 10) / 10 + ' ' + s[0];
    else if (s[1] === 'lvl') txt = (v > 0 ? '+' : '') + v + ' ' + s[0];
    else if (s[1] === 'jam') txt = s[0] + ' ' + v + ' shots';
    else txt = s[0];
    var good = s[2] > 0 ? v > 0 : v < 0;
    if (s[1] === 'jam') good = false;
    return { text: txt, good: good };
  }

  // ---------- art ----------
  function drawWeapon(g, w, cx, cy, sc, sil) {
    var F = w.F.key, acc = sil ? '#0a0c10' : w.color, body = sil ? '#0a0c10' : (w.M.key === 'golden' ? '#c9a23a' : '#2c3138'), dark = sil ? '#0a0c10' : (w.M.key === 'golden' ? '#8a6a1a' : '#1a1d22'), wood = sil ? '#0a0c10' : '#6b4a2e';
    g.save(); g.translate(cx, cy); g.scale(sc, sc); g.lineJoin = 'round'; g.lineCap = 'round';
    function R(x, y, w2, h, c, r) { g.fillStyle = c; if (r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w2, y, x + w2, y + h, r); g.arcTo(x + w2, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w2, y, r); g.closePath(); g.fill(); } else g.fillRect(x, y, w2, h); }
    function P(pts, c) { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); }
    var muzzle = 40;
    switch (F) {
      case 'pistol': R(-22, -10, 46, 12, body, 2); R(20, -7, 8, 6, dark); P([-18, 2, -6, 2, -10, 24, -22, 24], dark); R(-4, 2, 8, 6, dark); g.strokeStyle = dark; g.lineWidth = 2; g.beginPath(); g.arc(0, 6, 6, 0, Math.PI); g.stroke(); muzzle = 28; break;
      case 'smg': R(-30, -9, 50, 14, body, 2); R(20, -6, 16, 6, dark); R(-4, 5, 8, 22, dark); P([-24, 4, -14, 4, -18, 20, -28, 20], dark); g.strokeStyle = dark; g.lineWidth = 3; g.beginPath(); g.moveTo(-30, -2); g.lineTo(-48, -2); g.lineTo(-48, 8); g.stroke(); muzzle = 36; break;
      case 'rifle': R(-36, -8, 62, 14, body, 2); R(26, -5, 30, 5, dark); P([-4, 6, 6, 6, 10, 26, 0, 27], dark); P([-36, -6, -64, -4, -64, 8, -36, 6], wood); P([-26, 6, -16, 6, -20, 22, -30, 22], dark); R(-20, -12, 34, 3, dark); R(46, -10, 3, 6, dark); muzzle = 56; break;
      case 'shotgun': R(-12, -9, 66, 6, dark, 2); R(8, -2, 26, 8, wood, 3); R(-32, -10, 24, 15, body, 2); P([-32, -8, -66, -4, -66, 9, -32, 4], wood); P([-26, 5, -16, 5, -20, 20, -30, 20], dark); muzzle = 54; break;
      case 'sniper': R(18, -4, 58, 3, dark); R(-30, -8, 50, 12, body, 2); R(-12, -21, 34, 8, dark, 3); R(-14, -20, 4, 6, '#2a4a6a'); R(20, -20, 4, 6, '#2a4a6a'); P([-30, -6, -68, -3, -68, 9, -30, 4], wood); P([-22, 4, -12, 4, -16, 20, -26, 20], dark); g.strokeStyle = dark; g.lineWidth = 2; g.beginPath(); g.moveTo(40, -1); g.lineTo(34, 14); g.moveTo(40, -1); g.lineTo(46, 14); g.stroke(); muzzle = 76; break;
      case 'revolver': R(4, -9, 32, 8, body, 2); g.fillStyle = dark; g.beginPath(); g.arc(-2, -4, 10, 0, Math.PI * 2); g.fill(); g.fillStyle = body; for (var i = 0; i < 5; i++) { var a = i * 1.256; g.beginPath(); g.arc(-2 + Math.cos(a) * 5, -4 + Math.sin(a) * 5, 2, 0, Math.PI * 2); g.fill(); } P([-10, 2, -2, 4, -14, 24, -24, 22], wood); P([-14, -12, -8, -14, -6, -8], dark); muzzle = 36; break;
      case 'lmg': R(-36, -11, 62, 18, body, 3); R(26, -6, 40, 7, dark); for (var h = 0; h < 4; h++) R(30 + h * 9, -5, 4, 5, body); g.fillStyle = dark; g.beginPath(); g.arc(-6, 14, 11, 0, Math.PI * 2); g.fill(); R(-16, -18, 22, 5, dark); P([-36, -8, -60, -6, -60, 8, -36, 6], dark); muzzle = 66; break;
      case 'burst': R(-42, -10, 74, 16, body, 4); R(32, -5, 20, 5, dark); R(-32, 6, 10, 18, dark); P([-6, 6, 4, 6, 0, 22, -10, 22], dark); R(-8, -19, 16, 8, dark, 2); if (!sil) { g.fillStyle = acc; g.globalAlpha = 0.8; g.fillRect(-6, -17, 12, 4); g.globalAlpha = 1; } muzzle = 52; break;
      case 'launcher': R(-40, -13, 84, 24, body, 10); R(40, -15, 8, 28, dark, 3); P([-8, 11, 4, 11, 0, 28, -12, 28], dark); R(-14, -20, 12, 7, dark); if (!sil) { g.fillStyle = acc; g.fillRect(-30, -3, 50, 4); } muzzle = 48; break;
      case 'flamer': R(-60, -8, 32, 22, sil ? dark : '#7a2a1a', 9); R(-28, -6, 44, 12, body, 3); R(16, -4, 40, 7, dark); P([-18, 6, -8, 6, -12, 22, -22, 22], dark); g.strokeStyle = dark; g.lineWidth = 3; g.beginPath(); g.moveTo(-44, 14); g.quadraticCurveTo(-30, 26, -14, 6); g.stroke(); muzzle = 56; break;
    }
    if (!sil) {
      g.fillStyle = acc; g.globalAlpha = 0.95; g.fillRect(-14, -3, 18, 3); g.globalAlpha = 1;
      if (w.M.key !== 'standard') { g.fillStyle = acc; g.beginPath(); g.arc(-8, -2, 3.2, 0, Math.PI * 2); g.fill(); }
      if (w.M.key === 'scoped' && F !== 'sniper') { R(-6, -20, 26, 7, dark, 3); R(-4, -19, 3, 5, '#2a4a6a'); }
      var gr = g.createRadialGradient(muzzle, -3, 0, muzzle, -3, 12); gr.addColorStop(0, acc); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 0.55; g.fillStyle = gr; g.beginPath(); g.arc(muzzle, -3, 12, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    }
    g.restore();
  }
  function drawCardIcon(g, tag, col, s) {
    g.save(); g.translate(s / 2, s / 2); var u = s / 100;
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 5 * u; g.lineCap = 'round'; g.lineJoin = 'round';
    g.shadowColor = col; g.shadowBlur = 14 * u;
    function bullet(x, y, k) { g.beginPath(); g.moveTo(x - 8 * k * u, y + 20 * k * u); g.lineTo(x - 8 * k * u, y - 6 * k * u); g.quadraticCurveTo(x, y - 26 * k * u, x + 8 * k * u, y - 6 * k * u); g.lineTo(x + 8 * k * u, y + 20 * k * u); g.closePath(); g.fill(); }
    switch (tag) {
      case 'damage': bullet(0, 0, 1.4); break;
      case 'rapid': bullet(-20 * u, 6 * u, 0.9); bullet(0, -4 * u, 0.9); bullet(20 * u, 6 * u, 0.9); break;
      case 'precision': g.beginPath(); g.arc(0, 0, 26 * u, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(0, -38 * u); g.lineTo(0, 38 * u); g.moveTo(-38 * u, 0); g.lineTo(38 * u, 0); g.stroke(); g.beginPath(); g.arc(0, 0, 5 * u, 0, Math.PI * 2); g.fill(); break;
      case 'crit': for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; g.beginPath(); g.moveTo(Math.cos(a) * 10 * u, Math.sin(a) * 10 * u); g.lineTo(Math.cos(a) * (i % 2 ? 22 : 36) * u, Math.sin(a) * (i % 2 ? 22 : 36) * u); g.stroke(); } break;
      case 'spread': for (var j = -2; j <= 2; j++) { var b = -Math.PI / 2 + j * 0.32; g.beginPath(); g.moveTo(0, 30 * u); g.lineTo(Math.cos(b) * 38 * u, 30 * u + Math.sin(b) * 60 * u); g.stroke(); } break;
      case 'pierce': g.beginPath(); g.moveTo(-36 * u, 0); g.lineTo(32 * u, 0); g.stroke(); g.beginPath(); g.moveTo(36 * u, 0); g.lineTo(22 * u, -10 * u); g.lineTo(22 * u, 10 * u); g.closePath(); g.fill(); g.lineWidth = 3 * u; [-14, 8].forEach(function (x) { g.beginPath(); g.arc(x * u, 0, 12 * u, 0, Math.PI * 2); g.stroke(); }); break;
      case 'fire': g.beginPath(); g.moveTo(0, 36 * u); g.bezierCurveTo(-34 * u, 30 * u, -26 * u, -6 * u, -6 * u, -36 * u); g.bezierCurveTo(-4 * u, -14 * u, 10 * u, -10 * u, 12 * u, -24 * u); g.bezierCurveTo(34 * u, 0, 28 * u, 32 * u, 0, 36 * u); g.fill(); break;
      case 'ice': for (var k2 = 0; k2 < 3; k2++) { var c = k2 * Math.PI / 3; g.beginPath(); g.moveTo(Math.cos(c) * -34 * u, Math.sin(c) * -34 * u); g.lineTo(Math.cos(c) * 34 * u, Math.sin(c) * 34 * u); g.stroke(); } g.beginPath(); g.arc(0, 0, 8 * u, 0, Math.PI * 2); g.fill(); break;
      case 'shock': g.beginPath(); g.moveTo(8 * u, -38 * u); g.lineTo(-16 * u, 4 * u); g.lineTo(0, 4 * u); g.lineTo(-8 * u, 38 * u); g.lineTo(18 * u, -8 * u); g.lineTo(2 * u, -8 * u); g.closePath(); g.fill(); break;
      case 'toxic': g.beginPath(); g.moveTo(0, -36 * u); g.bezierCurveTo(-26 * u, 0, -24 * u, 30 * u, 0, 32 * u); g.bezierCurveTo(24 * u, 30 * u, 26 * u, 0, 0, -36 * u); g.fill(); g.fillStyle = '#0b0d10'; g.beginPath(); g.arc(-6 * u, 12 * u, 5 * u, 0, Math.PI * 2); g.arc(8 * u, 4 * u, 3 * u, 0, Math.PI * 2); g.fill(); break;
      case 'explosive': g.beginPath(); g.arc(-4 * u, 8 * u, 24 * u, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(10 * u, -12 * u); g.quadraticCurveTo(24 * u, -30 * u, 34 * u, -26 * u); g.stroke(); break;
      case 'bounce': g.beginPath(); g.moveTo(-38 * u, -20 * u); g.lineTo(-12 * u, 20 * u); g.lineTo(12 * u, -20 * u); g.lineTo(34 * u, 14 * u); g.stroke(); g.beginPath(); g.arc(34 * u, 14 * u, 6 * u, 0, Math.PI * 2); g.fill(); break;
      case 'blood': g.beginPath(); g.moveTo(0, 32 * u); g.bezierCurveTo(-40 * u, 4 * u, -26 * u, -32 * u, 0, -14 * u); g.bezierCurveTo(26 * u, -32 * u, 40 * u, 4 * u, 0, 32 * u); g.fill(); break;
      case 'speed': [-18, 0, 18].forEach(function (x) { g.beginPath(); g.moveTo((x - 8) * u, -22 * u); g.lineTo((x + 10) * u, 0); g.lineTo((x - 8) * u, 22 * u); g.stroke(); }); break;
      case 'tank': g.beginPath(); g.moveTo(0, -36 * u); g.lineTo(30 * u, -24 * u); g.lineTo(26 * u, 12 * u); g.lineTo(0, 36 * u); g.lineTo(-26 * u, 12 * u); g.lineTo(-30 * u, -24 * u); g.closePath(); g.stroke(); break;
      case 'luck': for (var q = 0; q < 10; q++) { var r2 = q % 2 ? 15 : 36, a2 = -Math.PI / 2 + q * Math.PI / 5; if (q) g.lineTo(Math.cos(a2) * r2 * u, Math.sin(a2) * r2 * u); else { g.beginPath(); g.moveTo(Math.cos(a2) * r2 * u, Math.sin(a2) * r2 * u); } } g.closePath(); g.fill(); break;
      case 'void': g.beginPath(); g.arc(0, 0, 18 * u, 0, Math.PI * 2); g.fill(); g.lineWidth = 3 * u; for (var v = 0; v < 3; v++) { g.beginPath(); g.arc(0, 0, (26 + v * 7) * u, v, v + 2.2); g.stroke(); } break;
      case 'curse': g.beginPath(); g.arc(0, -4 * u, 26 * u, Math.PI, 0); g.lineTo(18 * u, 26 * u); g.lineTo(-18 * u, 26 * u); g.closePath(); g.fill(); g.fillStyle = '#0b0d10'; g.shadowBlur = 0; g.beginPath(); g.arc(-10 * u, -2 * u, 7 * u, 0, Math.PI * 2); g.arc(10 * u, -2 * u, 7 * u, 0, Math.PI * 2); g.fill(); g.fillStyle = col; g.beginPath(); g.moveTo(-22 * u, -22 * u); g.lineTo(-34 * u, -40 * u); g.lineTo(-14 * u, -28 * u); g.moveTo(22 * u, -22 * u); g.lineTo(34 * u, -40 * u); g.lineTo(14 * u, -28 * u); g.fill(); break;
      default: bullet(0, 0, 1.2);
    }
    g.restore();
  }

  var api = { ARMS: ARMS, FRAMES: FRAMES, MODS: MODS, RAR: RAR, CARDS: CARDS, FORBIDDEN: FORBIDDEN, STAT: STAT, buildWeapons: buildWeapons, cardEffects: cardEffects, fmtLine: fmtLine, drawWeapon: drawWeapon, drawCardIcon: drawCardIcon };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  return api;
})();
