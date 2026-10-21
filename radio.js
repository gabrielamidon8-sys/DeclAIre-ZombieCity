  /* ======================== FM 66.6 — the radio ========================
     The music is its own thing, apart from the game: it has its own AudioContext (its own audio thread and clock,
     asked for "playback" latency so phones give it big, safe buffers) and it never reacts to what the game does.
     Songs are generated from a seed (the same channel and number is always the same song) and rendered ahead of
     time in short chunks with OfflineAudioContext, then played back as plain samples. Busy game frames can no
     longer starve the music, and its sound nodes no longer compete with the game's effects.
     One song plays at a time: when it ends on its final chord, the next one fades in.
     7 channels x 35 songs. "Bluetooth" plays the player's own songs through the same chain (and light show). */
  var RENDER = null;                     // set while a radio chunk is being rendered (voices log beats into it)
  var RSR = 44100, AHEAD = 24, RSONGS = 35, RLVL = 0.6, TAIL = 3.4;
  var SCALE = { minor: [0, 2, 3, 5, 7, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11], phry: [0, 1, 3, 5, 7, 8, 10], dor: [0, 2, 3, 5, 7, 9, 10], major: [0, 2, 4, 5, 7, 9, 11] };
  var PROGS = [[0, 5, 2, 6], [0, 3, 5, 4], [0, 6, 5, 6], [0, 5, 3, 4], [0, 2, 5, 6], [0, 3, 6, 2], [0, 0, 5, 6], [0, 5, 6, 4], [0, 4, 5, 3], [5, 6, 0, 0], [0, 3, 0, 4], [0, 6, 3, 4]];
  function srng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function pick(r, a) { return a[Math.floor(r() * a.length)]; }
  function sdeg(sc, root, d) { var n = sc.length, o = Math.floor(d / n), i = d - o * n; return root + sc[i] + 12 * o; }
  function pat16(r, base, flip) { var p = base.split('').map(function (ch) { return ch === 'x'; }); for (var i = 0; i < 16; i++) if (r() < flip && i % 4) p[i] = !p[i]; p[0] = true; return p; }

  // a two-bar melody: rhythm weighted to the strong beats, steps and small leaps, phrases ending on a chord tone.
  // Degrees are relative to each bar's chord, so the tune follows the harmony.
  function motif(r, dens) {
    var out = [], dg = pick(r, [0, 2, 4]), s = 0;
    while (s < 32) {
      var p = s % 8 === 0 ? 0.92 : s % 4 === 0 ? 0.25 + 0.55 * dens : s % 2 === 0 ? 0.42 * dens : 0.16 * dens;
      if (r() < p) {
        var len = Math.min(32 - s, pick(r, dens > 0.6 ? [1, 2, 2, 3, 4] : [2, 3, 4, 4, 6, 8]));
        out.push({ s: s, len: len, dg: dg });
        dg = s % 8 === 6 ? pick(r, [0, 2, 4]) : Math.max(-2, Math.min(7, dg + pick(r, [-2, -1, -1, 1, 1, 2, 3, -3])));
        s += len;
      } else s++;
    }
    if (out.length) out[out.length - 1].dg = pick(r, [0, 4]);
    return out;
  }
  function vary(m, r) { var sh = pick(r, [2, -1, 1, 4]); return m.map(function (n, i) { return { s: n.s, len: n.len, dg: i === m.length - 1 ? n.dg : Math.max(-2, Math.min(9, n.dg + sh)) }; }); }

  // song form: section lengths are scaled to the song's length; e = energy (0 calm, 1 groove, 2 full)
  var FORMS = [
    [['in', 8, 0], ['a', 16, 1], ['b', 16, 2], ['brk', 8, 0], ['a', 8, 1], ['b', 16, 2], ['out', 8, 0]],
    [['in', 4, 0], ['a', 8, 1], ['b', 16, 2], ['a', 8, 1], ['b', 16, 2], ['brk', 8, 0], ['b', 16, 2], ['out', 8, 0]],
    [['in', 8, 0], ['a', 16, 1], ['brk', 8, 0], ['b', 16, 2], ['b', 16, 2], ['out', 8, 0]],
    [['in', 8, 0], ['b', 8, 2], ['a', 16, 1], ['b', 16, 2], ['brk', 4, 0], ['b', 16, 2], ['out', 8, 0]]
  ];
  function form(r, bd) {
    var f = pick(r, FORMS), tot = 0, i; for (i = 0; i < f.length; i++) tot += f[i][1];
    var want = (120 + r() * 60) / bd, k = want / tot, out = [], b = 0;
    for (i = 0; i < f.length; i++) { var n = Math.max(4, Math.round(f[i][1] * k / 4) * 4); out.push({ k: f[i][0], n: n, e: f[i][2], b0: b }); b += n; }
    return { secs: out, bars: b };
  }

  // ---------- the seven channels ----------
  function names(r, A, B) {
    var all = []; A.forEach(function (a) { B.forEach(function (b) { all.push(a + ' ' + b); }); });
    for (var i = all.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = all[i]; all[i] = all[j]; all[j] = t; }
    return all.slice(0, RSONGS);
  }
  function lead(c, S, fn, oct) {
    var m = c.i % 8 >= 4 && S.mB ? S.mB : S.mA, half = c.b % 2;
    for (var k = 0; k < m.length; k++) { var n = m[k]; if ((n.s >> 4) !== half) continue; fn(sdeg(S.sc, S.R + 12 * oct, c.d + n.dg), c.t + (n.s & 15) * c.st, n.len * c.st * 0.92, n.s & 15); }
  }
  function endChord(c, fn) { if (c.fin) fn(c.t + c.bd); }   // the song's last bar: one final chord rings out after it
  var RCH = [
    { id: 'dead', name: 'Dead Signal', genre: 'Synthwave', bpm: [96, 118], sc: ['minor', 'dor'], duck: true, vol: 1.4,
      A: ['Neon', 'Midnight', 'Static', 'Chrome', 'Electric', 'Faded', 'Crimson', 'Lost', 'Silent', 'Phantom', 'Velvet', 'Last'],
      B: ['Highway', 'Signal', 'Skyline', 'Horizon', 'Echoes', 'Arcade', 'Boulevard', 'Sunset', 'Transmission', 'Overdrive', 'Memories', 'Pulse'],
      init: function (S, r) { S.kp = pat16(r, pick(r, ['x.......x.......', 'x.......x.x.....', 'x.....x.x.......']), 0.08); S.arp = pick(r, [[0, 1, 2, 1], [0, 2, 1, 2], [0, 1, 2, 3]]); S.dens = 0.45; },
      bar: function (c, S) {
        var e = c.e, i, t;
        if (c.first && e >= 1) vCrash(c.t, 0.09);
        vPad(c.ch, c.t, c.bd, e >= 2 ? 2400 : e >= 1 ? 1700 : 950, e ? 0.03 : 0.038);
        if (e >= 1) for (i = 0; i < 8; i++) vBass(c.root + (i % 2 ? 12 : 0), c.t + i * 2 * c.st, c.st * 1.7, 0.15);
        else vSub(c.root + 12, c.t, c.bd * 0.95, 0.09);
        if (e >= 1) for (i = 0; i < 16; i++) { t = c.t + i * c.st; if (S.kp[i]) vKick(t, 0.36, c.st * 4); if (i === 4 || i === 12) vSnareA(t, 0.28); if (i % 2 === 0) vHat(t, false, e >= 2 ? 0.075 : 0.055); else if (e >= 2 && i % 4 === 3) vHat(t, true, 0.04); }
        else if (c.k === 'in' && c.i >= c.n / 2) for (i = 0; i < 16; i += 2) vHat(c.t + i * c.st, false, 0.035);
        if (e >= 2 || (e >= 1 && c.i % 4 >= 2)) for (i = 0; i < 16; i++) vArp(c.ch[S.arp[i % 4] % 3] + 12 + (S.arp[i % 4] === 3 ? 12 : 0), c.t + i * c.st, c.st * 0.9, 0.028);
        if (e >= 2) lead(c, S, function (m, t, d) { vLead(m, t, d, 0.04); }, 1);
        if (c.fill) for (i = 12; i < 16; i++) vTom(c.t + i * c.st, 170 - (i - 12) * 26);
        if (c.next === 'b' && c.i === c.n - 2) vRiser(c.t, c.bd * 2);
        endChord(c, function (t) { vPad(c.ch, t, c.bd * 2, 1500, 0.045); vCrash(t, 0.1); vSub(c.root + 12, t, c.bd * 2, 0.11); vKick(t, 0.5); });
      } },
    { id: 'grave', name: 'Grave Metal', genre: 'Heavy metal', bpm: [138, 184], sc: ['phry', 'minor', 'harm'], duck: false, vol: 0.85,
      A: ['Blood', 'Iron', 'Bone', 'Rotting', 'Grave', 'Black', 'Burning', 'Hollow', 'Doom', 'Rusted', 'Savage', 'Unholy'],
      B: ['Throne', 'Hammer', 'March', 'Cathedral', 'Legion', 'Crusade', 'Carnage', 'Ritual', 'Requiem', 'Reckoning', 'Fury', 'Oath'],
      init: function (S, r) { S.R -= 12; S.gtr = pick(r, ['P.xxx.xxP.xxx.xx', 'P.x.x.xxP.x.xxx.', 'Pxxxxx.xP.xxxxxx', 'P..xx.x.P..xxx.x']); S.kp = pat16(r, 'x..x..x.x..x..x.', 0.1); S.dens = 0.6; },
      bar: function (c, S) {
        var e = c.e, i, t, fast = S.bpm > 165;
        if (c.first && e >= 1) { vCrash(c.t, 0.12); vPower(c.root + 12, c.t, c.st * 3, 0.22); }
        if (e >= 1) {
          for (i = 0; i < 16; i++) {
            t = c.t + i * c.st; var g = S.gtr.charAt(i);
            if (e >= 2 ? (!fast || i % 2 === 0) : S.kp[i]) vKMetal(t, e >= 2 ? 0.5 : 0.6);
            if (i === 4 || i === 12) vSnareG(t, 0.3);
            if (i % 2 === 0) { if (e >= 2 && i % 8 === 0) vRide(t, 0.05); else vHat(t, false, 0.05); }
            if (g === 'x') vChug(c.root + 12, t, c.st * 0.9, 0.24); else if (g === 'P') vPower(c.root + 12, t, c.st * 2, 0.2);
            if (i % 2 === 0) vBassGtr(c.root + 12, t, c.st * 1.8);
          }
          if (e >= 2) lead(c, S, function (m, t, d) { vLeadG(m, t, d, 0.22); }, 2);
        } else {
          vPower(c.root + 12, c.t, c.bd * 0.95, 0.11);
          if (c.i % 2 === 1) vPower(c.root + 19, c.t + c.bd / 2, c.bd * 0.45, 0.08);
          if (c.k !== 'out') vSub(c.root + 12, c.t, c.bd, 0.1);
        }
        if (c.fill) for (i = 8; i < 16; i++) { if (i % 2 === 0 || i >= 12) vSnareG(c.t + i * c.st, 0.14 + (i - 8) * 0.025); }
        endChord(c, function (t) { vPower(c.root + 12, t, c.bd * 2, 0.24); vCrash(t, 0.13); vKMetal(t, 0.8); vSnareG(t, 0.3); });
      } },
    { id: 'bio', name: 'Biohazard', genre: 'Industrial', bpm: [120, 134], sc: ['phry', 'minor'], duck: true, vol: 0.95,
      A: ['Toxic', 'Chemical', 'Viral', 'Sterile', 'Mutant', 'Lab', 'Acid', 'Contagion', 'Quarantine', 'Synthetic', 'Feral', 'Corrosive'],
      B: ['Saints', 'Machine', 'Protocol', 'Sector', 'Strain', 'Factory', 'Containment', 'Agent', 'System', 'Specimen', 'Reactor', 'Grid'],
      init: function (S, r) { S.anv = pat16(r, '..x....x..x...x.', 0.25); S.acid = ACID.map(function (v) { return v == null || r() < 0.15 ? null : v; }); S.dens = 0.5; },
      bar: function (c, S) {
        var e = c.e, i, t;
        if (c.first && e >= 1) vCrash(c.t, 0.1);
        if (e >= 1) for (i = 0; i < 16; i++) {
          t = c.t + i * c.st;
          if (i % 4 === 0) vKHard(t, 0.3);
          if (i === 4 || i === 12) vClap(t, 0.3);
          if (e >= 2) vShaker(t, i % 2 ? 0.05 : 0.07); else if (i % 2 === 0) vHat(t, false, 0.05);
          if (S.anv[i] && (e >= 2 || i > 8)) vAnvil(t, 0.035);
          var a = S.acid[i]; if (a != null) vAcid(c.root + 12 + a, t, c.st * 0.9, ACC[i]);
        }
        else { vPad(c.ch, c.t, c.bd, 700, 0.04); vSub(c.root + 12, c.t, c.bd, 0.1); if (c.i % 2) vAnvil(c.t + c.bd * 0.75, 0.03); }
        if (e >= 2) { for (i = 0; i < 16; i += 2) vGate(c.ch, c.t + i * c.st, c.st * 0.8, 0.026); if (c.i % 2 === 0) vHoover(c.ch[0] + 12, c.t, c.bd * 0.5); }
        if (e >= 2 && c.i % 4 === 3) lead(c, S, function (m, t, d) { vScreech(m, t, Math.min(d, c.st * 3)); }, 0);
        if (c.next === 'b' && c.i === c.n - 2) vRiser(c.t, c.bd * 2);
        endChord(c, function (t) { vImpact(t); vPad(c.ch, t, c.bd * 2, 800, 0.05); });
      } },
    { id: 'req', name: 'Requiem', genre: 'Orchestral', bpm: [84, 106], sc: ['harm', 'minor'], duck: false, vol: 1.45,
      A: ['Requiem for', 'Hymn of', 'Lament of', 'Rise of', 'Fall of', 'Ashes of', 'Dirge for', 'Elegy of', 'Oath of', 'Mass for', 'Last Light of', 'Prayer for'],
      B: ['the Fallen', 'the Damned', 'the City', 'the Living', 'Lost Souls', 'the Horde', 'Kings', 'the Last Survivor', 'Empty Streets', 'the Quarantine', 'Dying Stars', 'Forgotten Heroes'],
      init: function (S, r) { S.dens = 0.35; },
      bar: function (c, S) {
        var e = c.e, i;
        vStrings(c.ch, c.t, c.bd, e >= 2 ? 0.03 : 0.026);
        if (e === 0) { for (i = 0; i < 4; i++) vHarp(c.ch[i % 3] + 12 + (i === 3 ? 12 : 0), c.t + i * 4 * c.st); vSub(c.root + 12, c.t, c.bd, 0.08); }
        if (e >= 1) { vTimp(c.t, c.root + 12, 0.42); for (i = 0; i < 16; i += 2) vStac([c.ch[0] + 12, c.ch[2] + 12], c.t + i * c.st, 0.022); vSub(c.root + 12, c.t, c.bd, 0.1); }
        if (e >= 2) {
          if (c.first) { vGong(c.t, c.root); vImpact(c.t); }
          vTimp(c.t + c.bd / 2, c.root + 12, 0.32);
          vBrass(c.ch, c.t, c.bd * 0.48, 0.03); vBrass(c.ch, c.t + c.bd / 2, c.bd * 0.45, 0.026);
          if (c.i % 2 === 0) vChoir([c.ch[0] + 12, c.ch[1] + 12, c.ch[2] + 12], c.t, c.bd * 1.9, 0.04);
          lead(c, S, function (m, t, d) { vTremStr(m, t, 0.03); if (d > c.st * 1.5) vTremStr(m, t + c.st, 0.026); vBrass([m - 12], t, d, 0.024); }, 1);
        }
        if (c.fill) for (i = 0; i < 8; i++) vTimp(c.t + c.bd / 2 + i * c.st, c.root + 12, 0.12 + i * 0.04);
        endChord(c, function (t) { vGong(t, c.root); vTimp(t, c.root + 12, 0.8); vBrass(c.ch, t, c.bd * 2, 0.04); vStrings(c.ch, t, c.bd * 2.2, 0.034); vChoir([c.ch[0] + 12, c.ch[1] + 12, c.ch[2] + 12], t, c.bd * 2, 0.045); });
      } },
    { id: 'night', name: 'Night Shift', genre: 'Lo-fi', bpm: [70, 88], sc: ['dor', 'minor'], duck: false, vol: 1.8,
      A: ['Rainy', 'Quiet', 'Empty', 'Late', 'Sleepy', 'Foggy', 'Warm', 'Blue', 'Hushed', 'Slow', 'Hazy', 'Cold'],
      B: ['Rooftop', 'Streetlights', 'Coffee', 'Window', 'Radio', 'Corners', 'Apartment', 'Alley', 'Tape', 'Hours', 'Bench', 'Walk'],
      init: function (S, r) { S.kp = pat16(r, pick(r, ['x.........x.....', 'x......x..x.....', 'x.........x..x..']), 0.06); S.dens = 0.3; },
      bar: function (c, S) {
        var e = c.e, i, t, sw = function (k) { return c.t + k * c.st + (k % 4 === 2 ? c.st * 0.35 : 0); };
        var ch7 = [c.ch[0], c.ch[1], c.ch[2], sdeg(S.sc, S.R, c.d + 6)];
        vPianoCh(ch7, c.t, 0.028); if (e >= 1) vPianoCh([ch7[1], ch7[2], ch7[3] + 0], sw(6), 0.022);
        vSub(c.root + 12, c.t, c.bd * 0.45, 0.12); if (e >= 1) vSub(c.root + 12, c.t + c.bd / 2, c.bd * 0.4, 0.1);
        if (e >= 1) for (i = 0; i < 16; i++) { t = sw(i); if (S.kp[i]) vKick(t, 0.24, c.st * 4); if (i === 4 || i === 12) vSnare(t, 0.15, 0.9); if (i % 2 === 0) vHat(t, false, i % 4 ? 0.025 : 0.035); }
        if (e >= 1) lead(c, S, function (m, t, d) { vPluck(m, t, 0.05); }, 1);
        N(c.t, c.bd, 0.005, 'highpass', 3500, 0.7, null, musBus);                          // tape hiss
        for (i = 0; i < 3; i++) N(c.t + c.r() * c.bd, 0.006, 0.05 * c.r(), 'highpass', 2000, 0.7, null, musBus);   // vinyl crackle
        endChord(c, function (t) { vPianoCh(ch7, t, 0.03); vPianoCh([ch7[0] + 12, ch7[2] + 12], t + c.st * 2, 0.02); vSub(c.root + 12, t, c.bd, 0.12); });
      } },
    { id: 'rot', name: 'Rot Rave', genre: 'Drum & bass', bpm: [168, 176], sc: ['minor', 'phry'], duck: true, vol: 1.15,
      A: ['Sub', 'Night', 'Rot', 'Hyper', 'Dark', 'Liquid', 'Feral', 'Crash', 'Venom', 'Rapid', 'Shadow', 'Blackout'],
      B: ['Runner', 'Pressure', 'Tunnel', 'Reactor', 'Chase', 'Frequency', 'Engine', 'Fever', 'Riot', 'Velocity', 'Circuit', 'Swarm'],
      init: function (S, r) { S.kp = pat16(r, pick(r, ['x.........x.....', 'x.........x..x..', 'x.x.......x.....']), 0); S.wob = pick(r, WOB); S.dens = 0.4; },
      bar: function (c, S) {
        var e = c.e, i, t;
        if (c.first && e >= 1) vCrash(c.t, 0.1);
        if (e >= 1) for (i = 0; i < 16; i++) { t = c.t + i * c.st; if (S.kp[i]) vKick(t, 0.3, c.st * 4); if (i === 4 || i === 12) vSnareA(t, 0.3); else if (e >= 2 && (i === 7 || i === 15) && c.r() < 0.4) vSnare(t, 0.07, 1.1); if (e >= 2) vShaker(t, 0.045); else if (i % 2 === 0) vHat(t, false, 0.045); }
        else { vKick(c.t, 0.3); vSnareA(c.t + c.bd / 2, 0.2); }
        if (e >= 2) { if (c.i % 2 === 0) vWobble(c.root + 12, c.t, c.bd, S.wob); else vReese(c.root + 12, c.t, c.bd); }
        else if (e >= 1) vReese(c.root + 12, c.t, c.bd);
        else vSub(c.root + 12, c.t, c.bd, 0.1);
        if (c.i % 2 === 0) vPad(c.ch, c.t, c.bd * 2, e ? 1800 : 1100, 0.026);
        if (e >= 2) { for (i = 0; i < 16; i += 2) vSawArp(c.ch[(i / 2) % 3] + 12, c.t + i * c.st, c.st * 1.6); lead(c, S, function (m, t, d) { vLead(m, t, d, 0.034); }, 1); }
        if (c.next === 'b' && c.i === c.n - 2) vRiser(c.t, c.bd * 2);
        endChord(c, function (t) { vImpact(t); vPad(c.ch, t, c.bd * 2, 1400, 0.04); vSub(c.root + 12, t, c.bd * 1.5, 0.14); });
      } },
    { id: 'pixel', name: 'Pixel Plague', genre: 'Chiptune', bpm: [128, 158], sc: ['minor', 'harm', 'dor'], duck: false, vol: 0.85,
      A: ['Pixel', 'Eight-Bit', 'Super', 'Mega', 'Turbo', 'Glitch', 'Retro', 'Ultra', 'Cyber', 'Byte', 'Arcade', 'Bit'],
      B: ['Plague', 'Zombies', 'Quest', 'Panic', 'Hero', 'Castle', 'Dungeon', 'Blaster', 'Run', 'Boss', 'Invaders', 'Outbreak'],
      init: function (S, r) { S.kp = pat16(r, pick(r, ['x...x...x...x...', 'x.....x.x.......', 'x...x..xx...x...']), 0.1); S.dens = 0.65; },
      bar: function (c, S) {
        var e = c.e, i, t;
        for (i = 0; i < 8; i++) vChipTri(c.root + 12 + (i % 2 ? 12 : 0), c.t + i * 2 * c.st, c.st * 1.6);
        if (e >= 1) for (i = 0; i < 16; i++) { t = c.t + i * c.st; if (S.kp[i]) vChipNoise(t, false); if (i === 4 || i === 12) vChipNoise(t, true); }
        var arpStep = e >= 1 ? 1 : 2;
        for (i = 0; i < 16; i += arpStep) vChip(c.ch[i % 3] + 12 + (i % 6 >= 3 ? 12 : 0), c.t + i * c.st, c.st * 0.8 * arpStep, 0.026);
        if (e >= 2 || (e >= 1 && c.i % 4 >= 2)) lead(c, S, function (m, t, d) { vChip(m, t, d, 0.04); }, 1);
        if (c.fill) for (i = 12; i < 16; i++) vChipNoise(c.t + i * c.st, true);
        endChord(c, function (t) { c.ch.forEach(function (m) { vChip(m + 12, t, c.bd, 0.03); }); vChipTri(c.root + 12, t, c.bd); vChipNoise(t, false); });
      } }
  ];
  RCH.forEach(function (st, i) { st.list = names(srng(9100 + i * 37), st.A, st.B); });

  // one song: everything is decided by the channel and the song number
  var SCACHE = {}, RCAP = 0;   // RCAP: tests can shorten every song to a few bars
  function genSong(chI, n) {
    var key = chI + ':' + n; if (SCACHE[key]) return SCACHE[key];
    var st = RCH[chI], r = srng(chI * 100003 + n * 7919 + 1234567);
    var bpm = st.bpm[0] + Math.floor(r() * (st.bpm[1] - st.bpm[0] + 1)), bd = 240 / bpm;
    var S = { ch: chI, n: n, st: st, name: st.list[n], bpm: bpm, bd: bd, step: bd / 16, sc: SCALE[pick(r, st.sc)], R: 57 + Math.floor(r() * 8), prog: pick(r, PROGS).slice() };
    if (r() < 0.5) S.prog2 = pick(r, PROGS).slice();
    var f = form(r, bd); S.secs = f.secs; S.bars = f.bars;
    if (RCAP) { S.secs = [{ k: 'b', n: RCAP - 1, e: 2, b0: 0 }, { k: 'out', n: 1, e: 0, b0: RCAP - 1 }]; S.bars = RCAP; }
    st.init(S, r); S.mA = motif(r, S.dens); S.mB = r() < 0.7 ? vary(S.mA, r) : motif(r, S.dens);
    S.chunk = Math.max(2, Math.min(8, Math.round(9 / bd)));
    S.endT = (S.bars + 1.6) * bd;                     // the final chord rings for about a bar and a half
    SCACHE[key] = S; return S;
  }
  // render one bar of a song at time t (in the current render context)
  function playBar(S, b, t) {
    var si = 0; while (si < S.secs.length - 1 && b >= S.secs[si + 1].b0) si++;
    var sec = S.secs[si], i = b - sec.b0, nx = S.secs[si + 1];
    var pr = (sec.k === 'b' && S.prog2) ? S.prog2 : S.prog, d = pr[i % pr.length];
    var c = { t: t, st: S.step, bd: S.bd, b: b, i: i, n: sec.n, k: sec.k, e: sec.e, d: d, first: i === 0, next: nx ? nx.k : null,
      ch: [sdeg(S.sc, S.R, d), sdeg(S.sc, S.R, d + 2), sdeg(S.sc, S.R, d + 4)], root: sdeg(S.sc, S.R - 24, d),
      r: srng(S.ch * 7 + S.n * 131 + b * 977), fin: b === S.bars - 1 };
    c.fill = i === sec.n - 1 && !!nx && nx.e >= 1;
    if (S.st.duck) song = { duck: true };
    S.st.bar(c, S);
    if (c.e >= 1 || c.k === 'brk') { if (i % 4 === 0) ev(t, 'bar'); }
    for (var q = 0; q < 4; q++) ev(t + q * S.bd / 4, 'beat');
  }

  // ---------- rendering: a few bars at a time, offline ----------
  var IRS = {};
  function mkGraph(off, S) {
    // build the same music buses the game used to have, inside the offline context
    var sv = getG(); ac = off; RENDER = { ev: [] };
    var mb = off.createGain(); mb.gain.value = 1; mb.connect(off.destination); musBus = mb;
    synthBus = off.createGain(); synthBus.connect(mb);
    drumBus = off.createGain(); drumBus.gain.value = 0.9; drumBus.connect(mb);
    var conv = off.createConvolver(); if (!IRS[off.sampleRate]) IRS[off.sampleRate] = impulse(2.6); conv.buffer = IRS[off.sampleRate];
    revIn = off.createGain(); var ro = off.createGain(); ro.gain.value = 0.3; revIn.connect(conv); conv.connect(ro); ro.connect(mb);
    dlyIn = off.createGain(); dly = off.createDelay(1.5); dly.delayTime.value = Math.min(1.4, S.step * 3);
    var fb = off.createGain(), dlp = off.createBiquadFilter(), dOut = off.createGain(); fb.gain.value = 0.34; dlp.type = 'lowpass'; dlp.frequency.value = 3200; dOut.gain.value = 0.24;
    dlyIn.connect(dly); dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(dOut); dOut.connect(mb);
    distIn = off.createWaveShaper(); distIn.curve = distCurve(60); var dO = off.createGain(); dO.gain.value = 0.3; distIn.connect(dO); dO.connect(drumBus);
    bellBus = off.createGain(); bellBus.connect(mb); bellBus.connect(revIn);
    var nS = SHAPERS.length; gtrIn = amp(7, 90, 4600, 0.14, 0.12); leadIn = amp(5, 160, 5200, 0.1, 0.32, true); SHAPERS.length = nS;
    var n = 32, re = new Float32Array(n), im = new Float32Array(n); for (var k = 1; k < n; k++) re[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * 0.25);
    pulse25 = off.createPeriodicWave(re, im); sfxBus = mb;
    var G = getG(); G.rec = RENDER; setG(sv); RENDER = null;
    return G;
  }
  function withG(G, S, fn) { var t0 = performance.now(), sv = getG(); setG(G); RENDER = G.rec; STEP = S.step; BPM = S.bpm; TR = 0; song = null; try { fn(); } catch (e) { RD.errs++; } finally { setG(sv); var d = performance.now() - t0; RD.buildMs += d; if (d > RD.buildMax) RD.buildMax = d; } }
  function getG() { return [ac, musBus, synthBus, drumBus, revIn, dlyIn, dly, distIn, bellBus, gtrIn, leadIn, pulse25, sfxBus, STEP, BPM, TR, song, RENDER]; }
  function setG(a) { ac = a[0]; musBus = a[1]; synthBus = a[2]; drumBus = a[3]; revIn = a[4]; dlyIn = a[5]; dly = a[6]; distIn = a[7]; bellBus = a[8]; gtrIn = a[9]; leadIn = a[10]; pulse25 = a[11]; sfxBus = a[12]; STEP = a[13]; BPM = a[14]; TR = a[15]; song = a[16]; RENDER = a[17]; }

  // ---------- the deck ----------
  var RD = { ctx: null, bus: null, an: null, vol: null, uvol: null, uv: 0.8, mono: false, mode: 'radio', ch: 0, idx: [0, 0, 0, 0, 0, 0, 0], muted: false, on: false,
    songs: [], job: null, token: 0, timer: null, startT: 0, buildMs: 0, buildMax: 0, stat: null, statG: null, errs: 0, late: 0, renderMs: 0, chunks: 0, listeners: [],
    bt: { list: [], i: 0, els: [], gs: [], cur: -1, url: null, urls: [] }, heal: { ct: -1, stuck: 0, rebuilds: 0 } };
  (function () { for (var i = 0; i < 7; i++) RD.idx[i] = Math.floor(Math.random() * RSONGS); })();
  function rNotify() { var inf = rInfo(); RD.listeners.forEach(function (f) { try { f(inf); } catch (e) { } }); }
  // the song you hear right now (the next one may already be rendered and waiting)
  function rCur() {
    var now = RD.ctx ? RD.ctx.currentTime : 0;
    for (var i = RD.songs.length - 1; i >= 0; i--) { var p = RD.songs[i]; if (p.t0 != null && p.t0 <= now + 0.05) return p; }
    return RD.songs[0] || null;
  }
  function rInfo() {
    var p = rCur(), st = RCH[RD.ch], bt = RD.bt;
    return { mode: RD.mode, freq: 'FM 66.6', ch: RD.ch, chName: st.name, genre: st.genre, muted: RD.muted, tuning: !!(RD.mode === 'radio' && (!p || p.t0 == null)),
      song: p ? p.song.name : st.list[RD.idx[RD.ch]], n: (p ? p.song.n : RD.idx[RD.ch]) + 1, total: RSONGS, bpm: p ? p.song.bpm : 0,
      bt: { count: bt.list.length, i: bt.i, name: bt.list.length ? bt.list[bt.i].name : '' }, channels: RCH.map(function (c) { return { name: c.name, genre: c.genre }; }) };
  }
  function rCreate() {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { RD.ctx = new AC({ latencyHint: 'playback' }); } catch (e) { try { RD.ctx = new AC(); } catch (e2) { RD.ctx = null; return; } }
    var c = RD.ctx;
    RD.bus = c.createGain();
    var comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.008; comp.release.value = 0.25;
    var clip = c.createWaveShaper(); clip.curve = softClip();
    var trim = c.createGain(); trim.gain.value = 0.6;
    RD.an = c.createAnalyser(); RD.an.fftSize = 1024; RD.an.smoothingTimeConstant = 0.5; spec = new Uint8Array(RD.an.frequencyBinCount); VIZ.spec = spec;
    RD.vol = c.createGain(); RD.vol.gain.value = RD.muted ? 0 : (RD.hold || 1);
    // the Music volume setting comes last, after the analyser, so the light show still sees the full song
    RD.uvol = c.createGain(); RD.uvol.gain.value = RD.uv; rMono();
    RD.bus.connect(comp); comp.connect(trim); trim.connect(clip); clip.connect(RD.an); RD.an.connect(RD.vol); RD.vol.connect(RD.uvol); RD.uvol.connect(c.destination);
    // the beat finder for the player's own songs listens to the raw signal
    onAn = c.createAnalyser(); onAn.fftSize = 1024; onAn.smoothingTimeConstant = 0; onAn.minDecibels = -100; onAn.maxDecibels = 0;
    onSpec = new Float32Array(onAn.frequencyBinCount); onPrev = new Float32Array(onAn.frequencyBinCount);
    var mute = c.createGain(); mute.gain.value = 0; onAn.connect(mute); mute.connect(c.destination);
    // radio static, for tuning between channels
    var sb = c.createBuffer(1, Math.floor(c.sampleRate * 1.7), c.sampleRate), d = sb.getChannelData(0), lp = 0;
    for (var i = 0; i < d.length; i++) { lp = lp * 0.55 + (Math.random() * 2 - 1) * 0.45; d[i] = lp * 0.5 + (Math.random() < 0.0009 ? (Math.random() - 0.5) * 3 : 0); }
    RD.statBuf = sb; RD.statG = c.createGain(); RD.statG.gain.value = 0;
    var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.6; RD.statG.connect(bp); bp.connect(RD.bus);
    RD.bt.els = []; RD.bt.gs = []; RD.bt.cur = -1;
  }
  function rMono() { if (!RD.uvol) return; try { RD.uvol.channelCount = RD.mono ? 1 : 2; RD.uvol.channelCountMode = RD.mono ? 'explicit' : 'max'; } catch (e) { } }
  function rStatic(on) {
    var c = RD.ctx; if (!c) return; var t = c.currentTime;
    if (on && !RD.stat) { var s = c.createBufferSource(); s.buffer = RD.statBuf; s.loop = true; s.connect(RD.statG); s.start(t); RD.stat = s; }
    RD.statG.gain.cancelScheduledValues(t); RD.statG.gain.setValueAtTime(RD.statG.gain.value, t); RD.statG.gain.linearRampToValueAtTime(on ? 0.22 : 0, t + (on ? 0.05 : 0.35));
    if (!on && RD.stat) { var o = RD.stat; RD.stat = null; try { o.stop(t + 0.4); } catch (e) { } }
  }
  function rPlayer(S, t0) {
    var g = RD.ctx.createGain(); g.gain.value = S.st.vol * RLVL; g.connect(RD.bus);
    return { song: S, t0: t0, next: 0, out: g, srcs: [], endT: null, queued: false };
  }
  function rFadeOut(p, d) {
    var c = RD.ctx, t = c.currentTime; p.dead = true;
    try { p.out.gain.cancelScheduledValues(t); p.out.gain.setValueAtTime(p.out.gain.value, t); p.out.gain.linearRampToValueAtTime(0.0001, t + d); } catch (e) { }
    p.srcs.forEach(function (s) { try { s.stop(t + d + 0.05); } catch (e) { } });
    setTimeout(function () { try { p.out.disconnect(); } catch (e) { } }, (d + 0.3) * 1000);
  }
  function rStopAll(d) { RD.token++; RD.job = null; RD.songs.forEach(function (p) { rFadeOut(p, d || 0.4); }); RD.songs = []; evq.length = 0; lastKickEv = -9; }
  // start the current song of the current channel from the top; static plays until its first chunk is ready
  function rTune(quiet) { rStopAll(0.35); if (RD.mode !== 'radio' || !RD.ctx) { rNotify(); return; } if (!quiet) rStatic(true); RD.songs.push(rPlayer(genSong(RD.ch, RD.idx[RD.ch]), null)); rNotify(); rPump(); }
  function rPump() {
    var c = RD.ctx; if (!c || RD.mode !== 'radio' || !RD.on || c.state !== 'running') return;
    var now = c.currentTime;
    RD.songs = RD.songs.filter(function (p) { return !p.dead && !(p.endT != null && now > p.endT + 6); });
    var p = RD.songs[RD.songs.length - 1];
    if (!p) { rTune(); return; }
    if (RD.job) return;
    if (p.next < p.song.bars) {
      if (p.t0 == null || p.t0 + p.next * p.song.bd < now + AHEAD) rRender(p);
      return;
    }
    // the latest song is fully rendered: line up the next one to begin as it ends
    if (!p.queued && p.endT != null && p.endT - now < AHEAD) {
      p.queued = true; RD.idx[RD.ch] = (RD.idx[RD.ch] + 1) % RSONGS;
      var q = rPlayer(genSong(RD.ch, RD.idx[RD.ch]), p.endT - 0.6); q.prev = p; RD.songs.push(q); rRender(q);
    }
  }
  function rRender(p) {
    // the first chunk of a song is short so it starts quickly, and so is any chunk while little is buffered
    var S = p.song, b0 = p.next, buffered = p.t0 == null ? 0 : p.t0 + b0 * S.bd - RD.ctx.currentTime;
    var nb = buffered < 6 ? Math.max(1, Math.round((p.t0 == null ? 3 : 4.5) / S.bd)) : S.chunk, b1 = Math.min(S.bars, b0 + nb);
    var last = b1 === S.bars, len = (b1 - b0) * S.bd + (last ? S.bd * 2.2 + 3 : TAIL);
    var off; try { off = new OfflineAudioContext(2, Math.ceil(len * RSR), RSR); } catch (e) { RD.errs++; return; }
    var G = mkGraph(off, S), tok = RD.token, started = performance.now(), job = { p: p, b0: b0, b1: b1, at: started };
    var lazy = typeof off.suspend === 'function';
    RD.job = job;
    withG(G, S, function () { for (var k = b0; k < (lazy ? b0 + 1 : b1); k++) playBar(S, k, (k - b0) * S.bd); });
    // the rest of the bars are added while the render is paused at each bar line, a little work at a time
    if (lazy) for (var k = b0 + 1; k < b1; k++) (function (k) {
      var at = (k - b0) * S.bd;
      off.suspend(at).then(function () { if (tok === RD.token) withG(G, S, function () { playBar(S, k, at); }); off.resume(); }, function () { });
    })(k);
    off.startRendering().then(function (buf) {
      if (RD.job === job) RD.job = null;
      if (tok !== RD.token || p.dead) return;
      RD.renderMs = performance.now() - started; RD.audioS = len; RD.chunks++;
      rPlace(p, buf, b0, b1, G.rec.ev);
      p.next = b1; rPump();
    }, function () { if (RD.job === job) RD.job = null; RD.errs++; });
  }
  function rPlace(p, buf, b0, b1, evs) {
    var c = RD.ctx, now = c.currentTime, S = p.song;
    if (p.t0 == null) { p.t0 = now + 0.08; rStatic(false); p.out.gain.setValueAtTime(0.0001, now); p.out.gain.linearRampToValueAtTime(S.st.vol * RLVL, now + 0.25); rNotify(); }
    else if (b0 === 0) {   // a song that follows another fades in over its first moments
      p.out.gain.setValueAtTime(0.0001, Math.max(now, p.t0)); p.out.gain.linearRampToValueAtTime(S.st.vol * RLVL, Math.max(now, p.t0) + 1.6);
      setTimeout(rNotify, Math.max(0, (p.t0 - now) * 1000));
    }
    // a short fade at the very end of the chunk's tail, so a cut-off reverb never clicks
    for (var ch = 0; ch < buf.numberOfChannels; ch++) { var d = buf.getChannelData(ch), n = Math.min(d.length, Math.floor(buf.sampleRate * 0.06)); for (var j = 0; j < n; j++) d[d.length - 1 - j] *= j / n; }
    var at = p.t0 + b0 * S.bd, src = c.createBufferSource(); src.buffer = buf; src.connect(p.out);
    if (at >= now) src.start(at); else { RD.late++; var o = now - at; if (o < buf.duration - 0.05) src.start(now, o); else { src.disconnect(); src = null; } }
    if (src) p.srcs.push(src);
    if (src) src.onended = function () { try { src.disconnect(); } catch (e) { } var k = p.srcs.indexOf(src); if (k >= 0) p.srcs.splice(k, 1); };
    for (var i = 0; i < evs.length; i++) { var e = evs[i], et = at + e[0]; if (e[1] === 'kick') { if (et - lastKickEv < 0.11) continue; lastKickEv = et; } evq.push([et, e[1]]); }
    evq.sort(function (a, b) { return a[0] - b[0]; }); if (evq.length > 1200) evq.splice(0, evq.length - 1200);
    if (b1 === S.bars) p.endT = p.t0 + S.endT;
  }

  // ---------- Bluetooth: the player's own songs ----------
  function btEl(k) {
    var B = RD.bt; if (B.els[k]) return B.els[k];
    var el = new Audio(); el.preload = 'auto'; el.crossOrigin = 'anonymous';
    var g = RD.ctx.createGain(); g.gain.value = 0;
    try { var src = RD.ctx.createMediaElementSource(el); src.connect(g); src.connect(onAn); } catch (e) { }
    g.connect(RD.bus);
    el.addEventListener('ended', function () { if (RD.mode === 'bt' && B.cur === k) btNext(1); });
    el.addEventListener('timeupdate', function () { if (RD.mode === 'bt' && B.cur === k && el.duration && el.duration - el.currentTime < 2.2 && !el._x) { el._x = true; btNext(1); } });
    B.els[k] = el; B.gs[k] = g; return el;
  }
  function btPlay(i) {
    var B = RD.bt; if (!RD.ctx || !B.list.length || !RD.on) return;
    B.i = (i % B.list.length + B.list.length) % B.list.length;
    var c = RD.ctx, t = c.currentTime, k = B.cur === 0 ? 1 : 0, o = B.cur;
    var el = btEl(k), g = B.gs[k], it = B.list[B.i];
    if (!it.url) it.url = URL.createObjectURL(it.blob);
    el._x = false; el.src = it.url; try { el.currentTime = 0; } catch (e) { }
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.75, t + 1.8);
    var pr = el.play(); if (pr && pr.catch) pr.catch(function () { });
    if (o >= 0 && B.els[o]) { var og = B.gs[o], oe = B.els[o]; og.gain.cancelScheduledValues(t); og.gain.setValueAtTime(og.gain.value, t); og.gain.linearRampToValueAtTime(0.0001, t + 2.2); setTimeout(function () { if (B.cur !== o) oe.pause(); }, 2400); }
    B.cur = k; rNotify();
  }
  function btNext(d) { btPlay(RD.bt.i + d); }
  function btStop() { var B = RD.bt; B.els.forEach(function (el, k) { try { B.gs[k].gain.setTargetAtTime(0, RD.ctx.currentTime, 0.15); } catch (e) { } setTimeout(function () { if (RD.mode !== 'bt' || RD.bt.cur !== k) el.pause(); }, 500); }); B.cur = -1; }

  // ---------- modes and controls ----------
  function rSetMode(m) {
    if (m !== 'radio' && m !== 'bt' && m !== 'off') m = 'radio';
    if (m === 'bt' && !RD.bt.list.length) m = 'radio';
    var prev = RD.mode; RD.mode = m;
    if (!RD.ctx || !RD.on) { introLevel(); rNotify(); return; }
    if (prev === 'bt' && m !== 'bt') btStop();
    if (m === 'radio') { if (prev !== 'radio' || !RD.songs.length) rTune(); }
    else { rStopAll(0.5); rStatic(false); if (m === 'bt') btPlay(RD.bt.i); }
    introLevel(); rNotify();
  }
  function rStart() {   // the radio comes on once the studio intro is over (safe to call again)
    RD.on = true; RD.startT = RD.startT || 1;
    if (!RD.timer) RD.timer = setInterval(rPump, 250);
    if (!RD.ctx) return;
    if (RD.mode === 'radio') { if (!RD.songs.length) rTune(true); }   // the first song just fades in, no static
    else if (RD.mode === 'bt') { if (RD.bt.cur < 0) btPlay(RD.bt.i); }
    introLevel();
  }
  function rHeal(visible) {
    var c = RD.ctx, H = RD.heal; if (!c || !visible || !RD.on) { H.ct = -1; H.stuck = 0; return ''; }
    if (c.state === 'closed') { rRebuild(); return 'rebuilt'; }
    if (c.state !== 'running') { c.resume().catch(function () { }); return 'resumed'; }
    if (H.ct >= 0 && c.currentTime === H.ct) { if (++H.stuck >= 2) { rRebuild(); return 'rebuilt'; } } else H.stuck = 0;
    H.ct = c.currentTime;
    // a render that never finished (it happens on some phones) is dropped and tried again
    if (RD.job && performance.now() - RD.job.at > 8000) { RD.job = null; RD.errs++; RD.token++; RD.songs.forEach(function (p) { if (p.t0 == null) p.dead = true; }); rPump(); return 'restarted'; }
    return '';
  }
  function rRebuild() {
    var old = RD.ctx; RD.heal.rebuilds++; RD.heal.ct = -1; RD.heal.stuck = 0;
    rStopAll(0.01); RD.stat = null; vizReset();
    try { RD.bt.els.forEach(function (el) { el.pause(); }); } catch (e) { }
    try { if (old) old.close(); } catch (e) { }
    RD.ctx = null; rCreate();
    if (RD.on) { if (RD.mode === 'radio') rTune(); else if (RD.mode === 'bt') btPlay(RD.bt.i); }
  }
  var radioApi = {
    info: rInfo,
    // CORE v3 learns how fast this device renders music and how much to keep ready ahead (24 s normally, up to 48)
    renderStats: function () { return { chunks: RD.chunks, renderMs: RD.renderMs, audioS: RD.audioS || 0, late: RD.late, ahead: AHEAD }; },
    ahead: function (v) { if (v > 0) AHEAD = Math.max(16, Math.min(48, v)); return AHEAD; },
    onChange: function (f) { RD.listeners.push(f); },
    mode: function (m) { if (m) rSetMode(m); return RD.mode; },
    channel: function (i) { if (i == null) return RD.ch; RD.ch = (i % 7 + 7) % 7; if (RD.mode !== 'radio') rSetMode('radio'); else rTune(); return RD.ch; },
    // the arrow keys: channels on the radio, songs on Bluetooth
    step: function (d) { if (RD.mode === 'bt') { btNext(d); return RD.bt.i; } return radioApi.channel(RD.ch + d); },
    skip: function () { if (RD.mode === 'bt') { btNext(1); return; } RD.idx[RD.ch] = (RD.idx[RD.ch] + 1) % RSONGS; if (RD.mode !== 'radio') rSetMode('radio'); else rTune(); },
    mute: function (on) { RD.muted = on == null ? !RD.muted : !!on; if (RD.vol) { var t = RD.ctx.currentTime; RD.vol.gain.cancelScheduledValues(t); RD.vol.gain.setTargetAtTime(RD.muted ? 0 : (RD.hold || 1), t, 0.06); } introLevel(); rNotify(); return RD.muted; },
    muted: function () { return RD.muted; },
    setVolume: function (v) { RD.uv = Math.max(0, Math.min(1.2, v)); if (RD.uvol) RD.uvol.gain.setTargetAtTime(RD.uv, RD.ctx.currentTime, 0.05); },
    setMono: function (m) { RD.mono = !!m; rMono(); },
    // the radio dips under something loud (the A-10's cannon), then comes back
    duck: function (sec) { if (!RD.vol || RD.muted) return; var t = RD.ctx.currentTime, h = RD.hold || 1; RD.vol.gain.cancelScheduledValues(t); RD.vol.gain.setTargetAtTime(0.4 * h, t, 0.06); RD.vol.gain.setTargetAtTime(h, t + (sec || 2), 0.4); },
    // the Legends screen holds the radio down (its own score and ambience play over it), and lets it back up
    hold: function (on, lvl) { RD.hold = on ? (lvl == null ? 0.18 : lvl) : 0; if (!RD.vol || !RD.ctx) return; var t = RD.ctx.currentTime; RD.vol.gain.cancelScheduledValues(t); RD.vol.gain.setTargetAtTime(RD.muted ? 0 : (RD.hold || 1), t, 0.3); },
    setState: function (s) { if (!s) return; if (s.ch != null) RD.ch = (s.ch % 7 + 7) % 7; if (s.idx && s.idx.length === 7) RD.idx = s.idx.map(function (v) { return ((v | 0) % RSONGS + RSONGS) % RSONGS; }); if (s.muted != null) RD.muted = !!s.muted; if (s.mode) RD.mode = s.mode; },
    state: function () { return { ch: RD.ch, idx: RD.idx.slice(), muted: RD.muted, mode: RD.mode }; },
    btSet: function (list, play) {
      var B = RD.bt, cur = B.list[B.i], keep = {};
      (list || []).forEach(function (x) { B.list.forEach(function (o) { if (o.blob === x.blob && o.url) keep[o.url] = 1; }); });
      B.list.forEach(function (it) { if (it.url && !keep[it.url]) URL.revokeObjectURL(it.url); });
      B.list = (list || []).map(function (x) { var o = null; B.list.forEach(function (it) { if (it.blob === x.blob) o = it; }); return o || { name: x.name, blob: x.blob }; });
      var ni = cur ? B.list.indexOf(cur) : -1; B.i = ni >= 0 ? ni : 0;
      if (RD.mode === 'bt') { if (!B.list.length) { btStop(); rSetMode('radio'); } else if (play != null) btPlay(play); else if (ni < 0 && RD.on && RD.ctx) btPlay(0); }
      else if (play != null && B.list.length) { B.i = play; rSetMode('bt'); }
      rNotify();
    },
    btPick: function (i) { if (RD.mode !== 'bt') { RD.bt.i = i; rSetMode('bt'); } else btPlay(i); },
    btList: function () { return RD.bt.list.map(function (x) { return x.name; }); },
    btCount: function () { return RD.bt.list.length; },
    song: function (ch, n) { var S = genSong(ch, n); return { name: S.name, bpm: S.bpm, bars: S.bars, secs: S.secs.map(function (s) { return s.k + s.n; }).join(' '), length: Math.round(S.endT) }; },
    _dbg: function () { var p = RD.songs[RD.songs.length - 1]; return { state: RD.ctx ? RD.ctx.state : 'none', on: RD.on, mode: RD.mode, songs: RD.songs.length, t0: p && p.t0, next: p && p.next, bars: p && p.song.bars, now: RD.ctx && RD.ctx.currentTime, late: RD.late, errs: RD.errs, renderMs: Math.round(RD.renderMs), chunks: RD.chunks, buildMs: Math.round(RD.buildMs), buildMax: +RD.buildMax.toFixed(1), rebuilds: RD.heal.rebuilds, ctx: RD.ctx, an: RD.an, latency: RD.ctx && (RD.ctx.outputLatency || RD.ctx.baseLatency) }; },
    _rebuild: rRebuild,
    _cap: function (n) { RCAP = n | 0; SCACHE = {}; }
  };
