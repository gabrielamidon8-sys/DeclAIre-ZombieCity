  // ================= 1.9.992: the Legends' sound: the cinematic's score and foley, and the screen's ambience =================
  // The score is written to the cut (hit points): a low drone and a brave brass figure as he walks in, a string swell
  // that rises with the mask and lands on the visor's lock, a dissonant stab on the door, a driving low ostinato and
  // toms under the rush, a hit on the shot, braams on the grab and the landing, the hero figure again as the knife comes
  // out, everything filtered down into slow motion with a heartbeat, a silence, then the freeze: a crack of lightning,
  // a huge low hit and a cold, high chord that hangs over the frozen frame; a shing under the title; a last low chord
  // and the thunder rolling away. Foley is synthesized like the rest of the game: wet footsteps, mask plates clicking
  // home over a servo whine, a pistol in a brick alley (a slap of echo and a long tail), the door, the dead, cloth,
  // grunts, the throw and the splash, the knife leaving kydex. In slow motion every sound is pitched and stretched down.
  // The score has its own bus (following the music volume, even with the radio off) and stops cleanly if the preview is
  // cut short; the radio ducks under the Legends screen and comes back when it closes.
  var CINE = { mus: null, sfx: null, rev: null, lp: null, comp: null, t0: 0, amb: null, gen: 0 };
  function cineBus() {
    if (!ac) return false;
    if (!CINE.comp) {
      CINE.comp = ac.createDynamicsCompressor(); CINE.comp.threshold.value = -16; CINE.comp.ratio.value = 3; CINE.comp.attack.value = 0.005; CINE.comp.release.value = 0.25; CINE.comp.connect(mixG);
      CINE.rev = ac.createConvolver(); CINE.rev.buffer = impulse(2.4); CINE.revOut = ac.createGain(); CINE.revOut.gain.value = 0.32; CINE.rev.connect(CINE.revOut); CINE.revOut.connect(CINE.comp);
      CINE.sfx = ac.createGain(); CINE.sfx.gain.value = 0.9; CINE.sfx.connect(sfxComp); CINE.sfxRev = ac.createGain(); CINE.sfxRev.gain.value = 0.35; CINE.sfx.connect(CINE.sfxRev); CINE.sfxRev.connect(CINE.rev);
    }
    if (!CINE.mus) { CINE.lp = ac.createBiquadFilter(); CINE.lp.type = 'lowpass'; CINE.lp.frequency.value = 18000; CINE.lp.Q.value = 0.7; CINE.lp.connect(CINE.comp); CINE.mus = ac.createGain(); CINE.mus.gain.value = 0.95 * VOL.music; CINE.mus.connect(CINE.lp); CINE.musRev = ac.createGain(); CINE.musRev.gain.value = 0.55; CINE.mus.connect(CINE.musRev); CINE.musRev.connect(CINE.rev); }
    return true;
  }
  // run the music voices through the score's own buses
  function viaCine(fn) {
    var sv = [sfxBus, musBus, synthBus, drumBus, bellBus, revIn, dlyIn, TR];
    sfxBus = CINE.mus; musBus = CINE.mus; synthBus = CINE.mus; drumBus = CINE.mus; bellBus = CINE.mus; revIn = CINE.rev; dlyIn = CINE.rev; TR = 0;
    try { return fn(); } finally { sfxBus = sv[0]; musBus = sv[1]; synthBus = sv[2]; drumBus = sv[3]; bellBus = sv[4]; revIn = sv[5]; dlyIn = sv[6]; TR = sv[7]; }
  }
  function cineStop(fadeS) {
    if (!ac || !CINE.mus) return; var g = CINE.mus, l = CINE.lp, t = ac.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0.0001, t + (fadeS || 0.35));
    CINE.mus = null; CINE.gen++;
    setTimeout(function () { try { g.disconnect(); l.disconnect(); } catch (e) { } }, ((fadeS || 0.35) + 0.2) * 1000);
  }
  // the score, scheduled on the audio clock from t0 (the cinematic's real time 0)
  function cineScore(t0) {
    cineStop(0.05); cineBus(); var T = function (x) { return t0 + x; };
    viaCine(function () {
      // establish: a drone on D, a dark pad, a pulse like a slow heart, the brave figure in the low brass
      vSub(26, T(0.0), 2.9, 0.2); vPad([38, 45, 50], T(0.0), 2.8, 650, 0.03);
      for (var i = 0; i < 5; i++) lTimp(T(0.3 + i * 0.6), mtof(38), 0.28);
      vBrass([38, 45], T(1.15), 0.7, 0.04); vBrass([45, 50], T(1.85), 0.5, 0.042); vBrass([48, 53], T(2.35), 0.45, 0.04);
      for (var k = 0; k < 10; k++) vPluck([62, 65, 69, 65][k % 4], T(1.6 + k * 0.15), 0.025);
      // the mask: strings rising, landing on the lock
      vStrings([62, 69, 74], T(2.95), 1.45, 0.03); vStrings([50, 57], T(3.2), 1.2, 0.025); vRiser(T(3.1), 1.25);
      bell(T(4.37), 1174.7, 0.05, 1.6, CINE.mus); bell(T(4.38), 1760, 0.03, 1.2, CINE.mus); lTimp(T(4.37), mtof(38), 0.55);
      // threat: a stab on the door, a driving ostinato and toms, rising into the shot
      vStac([49, 50, 56, 61], T(4.62), 0.07); lTimp(T(4.62), mtof(37), 0.7);
      for (var s = 0; s < 30; s++) { var tt = T(4.75 + s * 0.06); vTremStr(s % 4 === 3 ? 41 : 38, tt, 0.03 + s * 0.0008); }
      [4.95, 5.25, 5.55, 5.7, 5.85, 6.0, 6.15, 6.25, 6.35, 6.45].forEach(function (x, j) { lTom(T(x), 90 + (j % 3) * 22); });
      vRiser(T(5.5), 1.05); vChoir([50, 53, 57], T(5.4), 1.1, 0.03);
      // the shot: the hit
      vImpact(T(6.56)); lTimp(T(6.56), mtof(31), 0.8);
      // action: groove, braams on the grab and the landing
      for (var b2 = 0; b2 < 6; b2++) { lTom(T(6.9 + b2 * 0.18), 110 - b2 * 6); lSnare(T(6.99 + b2 * 0.18), 0.12, 1); }
      vBrass([26, 33, 38], T(7.22), 0.9, 0.06); lTimp(T(7.22), mtof(33), 0.7);
      vImpact(T(8.33)); vBrass([26, 32, 38], T(8.33), 1.2, 0.07); lTimp(T(8.33), mtof(29), 0.9);
      // slow: the hero figure again, rising
      vStrings([50, 57, 62], T(8.6), 1.55, 0.03); vBrass([38, 45], T(9.45), 0.5, 0.045); vBrass([45, 50], T(9.95), 0.45, 0.05); vRiser(T(9.4), 0.85);
      // the freeze: a cold high chord, low hits, the title's shing, a last chord
      vChoir([74, 77, 81, 86], T(10.72), 2.2, 0.03); vStrings([62, 69, 74, 77], T(10.72), 2.4, 0.032); vImpact(T(10.69)); lTimp(T(10.69), mtof(26), 1.0);
      bell(T(11.36), 1318.5, 0.07, 2.2, CINE.mus); bell(T(11.37), 1975.5, 0.04, 1.8, CINE.mus); lTimp(T(11.36), mtof(31), 0.6);
      vBrass([26, 33, 38, 41], T(12.6), 1.5, 0.05); vSub(26, T(12.6), 1.5, 0.18); vStrings([50, 53, 57], T(12.6), 1.4, 0.025);
    });
    // slow motion: the whole score sinks under a closing filter, then opens again for the freeze
    var lp = CINE.lp.frequency; lp.setValueAtTime(18000, T(10.15)); lp.exponentialRampToValueAtTime(380, T(10.6)); lp.setValueAtTime(380, T(10.66)); lp.exponentialRampToValueAtTime(18000, T(10.72));
    var g = CINE.mus.gain; g.setValueAtTime(0.95 * VOL.music, T(10.55)); g.linearRampToValueAtTime(0.12 * VOL.music, T(10.64)); g.linearRampToValueAtTime(0.95 * VOL.music, T(10.7)); g.setValueAtTime(0.95 * VOL.music, T(13.1)); g.linearRampToValueAtTime(0.0001, T(14.2));
    CINE.t0 = t0;
  }
  // foley: r is the playback rate (slow motion stretches and lowers everything)
  function cOut(vol, pan, rev) {
    var o = ac.createGain(); o.gain.value = vol;
    if (pan && ac.createStereoPanner) { var p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); o.connect(p); p.connect(CINE.sfx); } else o.connect(CINE.sfx);
    if (rev) { var s = ac.createGain(); s.gain.value = rev; o.connect(s); s.connect(CINE.rev); }
    setTimeout(function () { try { o.disconnect(); } catch (e) { } }, 4000);
    return o;
  }
  function cineFx(n, r, who) {
    if (!ok() || !cineBus()) return; var t = ac.currentTime, o, i; r = Math.max(0.12, r || 1); var R = function (x) { return x / r; }, F = function (f) { return f * Math.max(0.35, r); };
    switch (n) {
      case 'stepL': case 'stepR': case 'zstep':
        o = cOut(who === 'z' ? 0.32 : 0.4, n === 'stepL' ? -0.15 : 0.15, 0.15);
        osc('sine', F(110), F(45), t, R(0.09), 0.5, o); noise(t, R(0.05), 0.35, 'lowpass', F(700), 0.8, F(200), o);
        noise(t + R(0.01), R(0.16), 0.22, 'bandpass', F(2400 + Math.random() * 1500), 1.2, F(900), o);
        if (who !== 'z') noise(t + R(0.03), R(0.05), 0.07, 'bandpass', F(3400), 5, null, o);
        break;
      case 'tap': o = cOut(0.3, 0.2, 0.05); noise(t, 0.015, 0.4, 'bandpass', 3000, 4, null, o); noise(t + 0.09, 0.015, 0.35, 'bandpass', 2700, 4, null, o); osc('sine', 900, 600, t, 0.03, 0.1, o); break;
      case 'mask':
        // a servo whine under seven plates locking home, the visor last and heaviest
        o = cOut(0.38, 0, 0.12);
        var sv = ac.createOscillator(), sg = ac.createGain(), sf = ac.createBiquadFilter(); sv.type = 'sawtooth'; sv.frequency.setValueAtTime(220, t); sv.frequency.linearRampToValueAtTime(520, t + 0.95); sf.type = 'bandpass'; sf.frequency.value = 1300; sf.Q.value = 3; sg.gain.setValueAtTime(0.0001, t); sg.gain.linearRampToValueAtTime(0.035, t + 0.1); sg.gain.setValueAtTime(0.035, t + 0.9); sg.gain.exponentialRampToValueAtTime(0.0001, t + 1.05); sv.connect(sf); sf.connect(sg); sg.connect(o); sv.start(t); sv.stop(t + 1.1);
        [0.31, 0.35, 0.5, 0.64, 0.69, 0.81].forEach(function (d, j) { var tt = t + d; noise(tt, 0.012, 0.5, 'bandpass', 3200 + j * 250, 6, null, o); osc('square', 1500 + j * 120, 700, tt, 0.018, 0.06, o); noise(tt + 0.004, 0.04, 0.2, 'lowpass', 900, 1, null, o); });
        break;
      case 'maskLock': o = cOut(0.5, 0, 0.25); noise(t, 0.02, 0.6, 'bandpass', 2400, 5, null, o); osc('sine', 160, 70, t, 0.18, 0.45, o); osc('sine', 880, 1760, t + 0.04, 0.5, 0.05, o); osc('sine', 1320, 2640, t + 0.06, 0.6, 0.03, o); noise(t + 0.03, 0.4, 0.06, 'highpass', 5000, 0.7, 9000, o); break;
      case 'maskInsert': o = cOut(0.15, 0, 0.3); osc('sine', 55, 55, t, 1.4, 0.3, o, 0.3); break;
      case 'cineShot': case 'rshot':
        // the round in a brick alley: crack, blast, a slap off the walls and a long tail
        o = cOut(0.75, -0.1, 0.55); gunRound(t, n === 'rshot' ? 'rifle' : 'pistol', Math.random, o);
        osc('sine', F(70), F(32), t, R(0.5), 0.55, o); noise(t + R(0.11), R(0.08), 0.1, 'lowpass', 1600, 0.8, 600, o); noise(t + R(0.26), R(0.1), 0.06, 'lowpass', 1200, 0.8, 500, o);
        noise(t + R(0.02), R(1.4), 0.06, 'lowpass', 700, 0.7, 120, o);
        for (i = 0; i < 3; i++) noise(t + R(0.35 + i * 0.09 + Math.random() * 0.05), 0.02, 0.04, 'bandpass', 4200 + Math.random() * 1500, 8, null, o);
        break;
      case 'hsHit': o = cOut(0.36, 0.2, 0.1); noise(t, 0.04, 0.5, 'bandpass', 1800, 1.5, 1300, o); noise(t + 0.01, 0.1, 0.3, 'lowpass', 900, 0.8, 300, o); osc('sine', 110, 40, t, 0.12, 0.3, o); break;
      case 'bodySplash': case 'landHit':
        o = cOut(n === 'landHit' ? 0.7 : 0.5, 0, 0.3); osc('sine', F(80), F(32), t, R(0.35), 0.75, o); noise(t, R(0.12), 0.5, 'lowpass', F(500), 0.8, F(120), o);
        noise(t + R(0.01), R(0.45), 0.35, 'bandpass', F(1600), 0.6, F(700), o); for (i = 0; i < 10; i++) noise(t + R(0.05 + Math.random() * 0.4), R(0.03), 0.06 + Math.random() * 0.05, 'bandpass', F(2000 + Math.random() * 3000), 2, null, o);
        break;
      case 'grab': case 'cloth': o = cOut(0.25, 0.1, 0.05); noise(t, R(0.18), 0.25, 'bandpass', F(1800), 0.8, F(900), o); noise(t + R(0.06), R(0.12), 0.15, 'bandpass', F(3200), 1, F(1500), o); if (n === 'grab') voice(t + 0.05, F(160), F(110), R(0.22), 0.06, [[600, 4], [1100, 6], [2400, 8]], o); break;
      case 'grunt': o = cOut(0.22, 0, 0.08); voice(t, F(140 + Math.random() * 20), F(95), R(0.26), 0.07, [[550, 4], [950, 6], [2300, 8]], o); noise(t, R(0.2), 0.05, 'bandpass', F(1400), 1, null, o); break;
      case 'throwWhoosh': case 'whip': case 'swish':
        o = cOut(0.35, n === 'whip' ? 0.4 : 0, 0.1); var ws = ac.createBufferSource(), wf = ac.createBiquadFilter(), wg = ac.createGain(), wd = R(n === 'whip' ? 0.3 : 0.4); ws.buffer = noiseBuf; ws.loop = true; wf.type = 'bandpass'; wf.Q.value = 1.8; wf.frequency.setValueAtTime(F(500), t); wf.frequency.exponentialRampToValueAtTime(F(2800), t + wd * 0.6); wf.frequency.exponentialRampToValueAtTime(F(800), t + wd); wg.gain.setValueAtTime(0.0001, t); wg.gain.exponentialRampToValueAtTime(0.5, t + wd * 0.55); wg.gain.exponentialRampToValueAtTime(0.0001, t + wd); ws.connect(wf); wf.connect(wg); wg.connect(o); ws.start(t, Math.random()); ws.stop(t + wd + 0.05);
        break;
      case 'knee': case 'thud': case 'body': o = cOut(0.4, 0, 0.12); osc('sine', F(95), F(38), t, R(0.2), 0.6, o); noise(t, R(0.08), 0.3, 'lowpass', F(600), 0.8, F(150), o); noise(t + R(0.02), R(0.1), 0.08, 'bandpass', F(2600), 3, null, o); break;
      case 'knifeOut': o = cOut(0.4, -0.2, 0.2); noise(t, 0.015, 0.4, 'bandpass', 2600, 5, null, o); var kd = R(0.32); noise(t + 0.02, kd, 0.14, 'bandpass', F(5200), 9, F(7400), o); bell(t + 0.04, F(3520), 0.03, R(0.9), o); bell(t + 0.045, F(5274), 0.018, R(0.7), o); break;
      case 'slowmo': o = cOut(0.45, 0, 0.4); osc('sine', 180, 40, t, 0.5, 0.35, o); noise(t, 0.5, 0.2, 'lowpass', 2400, 0.8, 200, o); lHeart(t + 0.05, 0.6); break;
      case 'freeze': o = cOut(0.35, 0, 0.6); noise(t, 0.12, 0.25, 'highpass', 2000, 0.7, 9000, o); osc('sine', 2093, 2093, t + 0.05, 2.6, 0.015, o, 0.3); osc('sine', 3136, 3136, t + 0.05, 2.2, 0.008, o, 0.3); break;
      case 'lightning':
        o = cOut(0.8, 0.2, 0.45); noise(t, 0.035, 0.9, 'highpass', 1800, 0.7, null, o); noise(t, 0.4, 0.6, 'bandpass', 900, 0.6, 250, o); osc('sine', 60, 28, t, 0.9, 0.8, o);
        for (i = 0; i < 5; i++) noise(t + 0.45 + i * 0.4 + Math.random() * 0.2, 0.9, 0.18 - i * 0.025, 'lowpass', 300 - i * 30, 0.8, 70, o);
        break;
      case 'thunderFar': o = cOut(0.3, (Math.random() - 0.5) * 0.8, 0.5); for (i = 0; i < 4; i++) noise(t + 0.6 + i * 0.5 + Math.random() * 0.3, 1.1, 0.12 - i * 0.02, 'lowpass', 220, 0.8, 60, o); break;
      case 'title': o = cOut(0.3, 0, 0.5); noise(t, 0.5, 0.08, 'highpass', 3000, 0.7, 9000, o); osc('sine', 110, 40, t, 0.6, 0.35, o); break;
      case 'resolve': case 'thunderRoll': o = cOut(0.35, -0.3, 0.6); for (i = 0; i < 5; i++) noise(t + i * 0.35 + Math.random() * 0.2, 1.2, 0.14 - i * 0.02, 'lowpass', 240, 0.8, 60, o); break;
      case 'doorBang':
        o = cOut(0.7, 0.45, 0.4); noise(t, 0.03, 0.8, 'bandpass', 1200, 0.8, null, o); osc('sine', 95, 45, t, 0.35, 0.8, o);
        [[1, 0.4], [2.76, 0.2], [5.4, 0.1]].forEach(function (p) { osc('sine', 180 * p[0], 170 * p[0], t, 0.9 / Math.pow(p[0], 0.4), 0.08 * p[1] / 0.4, o); }); noise(t + 0.18, 0.04, 0.3, 'bandpass', 900, 1, null, o); osc('sine', 120, 60, t + 0.18, 0.2, 0.3, o);
        break;
      case 'zScream1': case 'zScream2':
        o = cOut(0.55, n === 'zScream1' ? 0.4 : -0.3, 0.45); var zf = n === 'zScream1' ? 1 : 0.86;
        voice(t, 210 * zf, 520 * zf, 0.18, 0.12, [[750, 3], [1250, 5], [2800, 7]], o); voice(t + 0.12, 520 * zf, 240 * zf, 0.75, 0.14, [[800, 3], [1400, 5], [3000, 8]], o); voice(t + 0.1, 380 * zf, 180 * zf, 0.7, 0.08, [[650, 4], [1100, 5]], o);
        noise(t, 0.85, 0.08, 'bandpass', 2600, 2, 1600, o);
        break;
      case 'zgrowl': o = cOut(0.3, 0, 0.3); voice(t, 95, 70, 0.6, 0.1, [[420, 4], [800, 5], [2100, 7]], o); break;
      case 'tug': o = cOut(0.25, 0.1, 0.03); noise(t, 0.08, 0.3, 'bandpass', 2200, 1, 1200, o); noise(t + 0.05, 0.02, 0.2, 'bandpass', 3800, 6, null, o); break;
      case 'slideBack': case 'slideHome': case 'boltHome': o = cOut(0.35, 0.1, 0.06); noise(t, 0.012, 0.45, 'bandpass', n === 'slideBack' ? 3000 : 2200, 6, null, o); noise(t + 0.01, 0.06, 0.15, 'bandpass', 1600, 2, n === 'slideBack' ? 2400 : 1200, o); if (n !== 'slideBack') osc('sine', 300, 180, t + 0.02, 0.04, 0.15, o); break;
      case 'magOut': o = cOut(0.3, 0.1, 0.06); noise(t, 0.012, 0.4, 'bandpass', 2600, 6, null, o); noise(t + 0.38, 0.03, 0.35, 'bandpass', 1500, 2, null, o); osc('sine', 260, 120, t + 0.38, 0.06, 0.2, o); break;
      case 'magIn': o = cOut(0.38, 0.1, 0.06); noise(t, 0.015, 0.5, 'bandpass', 2400, 6, null, o); osc('sine', 220, 110, t, 0.06, 0.25, o); break;
      case 'pouch': o = cOut(0.22, -0.1, 0.03); noise(t, 0.12, 0.2, 'bandpass', 1400, 1, 2400, o); break;
      case 'draw': case 'holster': o = cOut(0.3, 0.2, 0.05); noise(t, 0.1, 0.22, 'bandpass', 1800, 1.5, n === 'draw' ? 3000 : 1200, o); noise(t + (n === 'draw' ? 0.0 : 0.08), 0.012, 0.35, 'bandpass', 2800, 6, null, o); break;
      case 'grip': o = cOut(0.2, 0, 0.02); noise(t, 0.03, 0.2, 'bandpass', 1500, 2, null, o); break;
      case 'stab': case 'hit': case 'shove': o = cOut(0.38, 0, 0.08); osc('sine', 150, 55, t, 0.12, 0.45, o); noise(t, 0.06, 0.35, 'bandpass', 1200, 1, 500, o); break;
      case 'throw': o = cOut(0.3, 0, 0.1); noise(t, 0.3, 0.2, 'bandpass', 900, 1.5, 2600, o); break;
      case 'kick': o = cOut(0.4, 0, 0.08); noise(t - 0.1, 0.12, 0.15, 'bandpass', 900, 1.5, 2400, o); osc('sine', 140, 50, t, 0.14, 0.5, o); break;
      case 'roll': case 'skid': o = cOut(0.35, 0, 0.1); noise(t, 0.5, 0.25, 'bandpass', 1100, 0.8, 500, o); noise(t + 0.05, 0.4, 0.12, 'bandpass', 3000, 1, 1500, o); break;
      case 'radio': o = cOut(0.25, -0.3, 0.02); osc('square', 1800, 1800, t, 0.05, 0.04, o); osc('square', 1400, 1400, t + 0.07, 0.05, 0.04, o); noise(t + 0.13, 0.3, 0.05, 'bandpass', 2500, 1.2, null, o); break;
      case 'breathIn': case 'breathOut': o = cOut(0.15, 0, 0.05); noise(t, 0.9, 0.08, 'bandpass', n === 'breathIn' ? 900 : 650, 1.2, n === 'breathIn' ? 1300 : 420, o); break;
      case 'score': cineScore(t + 0.02); break;
      // the screen's own sounds
      case 'uiHover': o = cOut(0.12, 0, 0.05); noise(t, 0.02, 0.3, 'bandpass', 3800, 6, null, o); osc('sine', 1600, 1900, t, 0.04, 0.03, o); break;
      case 'uiSelect': o = cOut(0.35, 0, 0.25); osc('sine', 130, 55, t, 0.3, 0.5, o); noise(t, 0.02, 0.4, 'bandpass', 2400, 5, null, o); bell(t + 0.02, 1760, 0.03, 0.8, o); break;
      case 'uiBack': o = cOut(0.2, 0, 0.1); osc('sine', 700, 380, t, 0.08, 0.06, o); noise(t, 0.02, 0.2, 'bandpass', 2000, 4, null, o); break;
      case 'uiTransition': o = cOut(0.45, 0, 0.5); noise(t, 0.6, 0.25, 'bandpass', 400, 1.2, 3600, o); osc('sine', 90, 35, t + 0.45, 0.8, 0.5, o); noise(t + 0.45, 0.05, 0.3, 'lowpass', 1200, 0.8, null, o); break;
      case 'uiDeploy': o = cOut(0.45, 0, 0.35); osc('sine', 110, 45, t, 0.5, 0.6, o); noise(t, 0.025, 0.5, 'bandpass', 2400, 5, null, o); osc('sine', 880, 1760, t + 0.05, 0.5, 0.05, o); bell(t + 0.08, 1318.5, 0.05, 1.4, o); break;
      case 'uiTab': o = cOut(0.15, 0, 0.05); noise(t, 0.015, 0.3, 'bandpass', 3000, 5, null, o); break;
    }
  }
  // the Legends screen's ambience: rain on the alley, drips, a low hum of the city and a slow dark pad
  function cineAmb(on) {
    if (!ac) return;
    if (on && !CINE.amb && ok() && cineBus()) {
      var t = ac.currentTime, out = ac.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.linearRampToValueAtTime(0.5 * VOL.amb + 0.05, t + 1.2); out.connect(CINE.comp);
      var src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true; var f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 2600; f1.Q.value = 0.5; var g1 = ac.createGain(); g1.gain.value = 0.18; src.connect(f1); f1.connect(g1); g1.connect(out);
      var f2 = ac.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 380; var g2 = ac.createGain(); g2.gain.value = 0.22; src.connect(f2); f2.connect(g2); g2.connect(out); src.start(t);
      var hum = ac.createOscillator(); hum.type = 'sine'; hum.frequency.value = 49; var hg = ac.createGain(); hg.gain.value = 0.03; hum.connect(hg); hg.connect(out); hum.start(t);
      var pads = []; [[38, 45], [41, 48], [36, 43]].forEach(function () { });
      var pad = ac.createGain(); pad.gain.value = 0.0; pad.connect(out); var pf = ac.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 520; pf.connect(pad);
      [50, 57, 62].forEach(function (m, i) { var o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = (i - 1) * 9; var og = ac.createGain(); og.gain.value = 0.012; o.connect(og); og.connect(pf); o.start(t); pads.push(o); });
      pad.gain.setValueAtTime(0, t); pad.gain.linearRampToValueAtTime(0.9 * VOL.music, t + 3);
      var lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 260; lfo.connect(lg); lg.connect(pf.frequency); lfo.start(t);
      CINE.amb = { out: out, nodes: [src, hum, lfo].concat(pads), drip: setInterval(function () { if (!ok() || !CINE.amb) return; var tt = ac.currentTime + Math.random() * 0.3; noise(tt, 0.02, 0.05 + Math.random() * 0.05, 'bandpass', 2400 + Math.random() * 3000, 9, null, out); }, 220) };
    } else if (!on && CINE.amb) {
      var a = CINE.amb, t2 = ac.currentTime; CINE.amb = null; clearInterval(a.drip); a.out.gain.cancelScheduledValues(t2); a.out.gain.setValueAtTime(a.out.gain.value, t2); a.out.gain.linearRampToValueAtTime(0.0001, t2 + 0.6);
      setTimeout(function () { a.nodes.forEach(function (n) { try { n.stop(); } catch (e) { } }); try { a.out.disconnect(); } catch (e) { } }, 800);
    }
  }
  // while the score plays, the cinematic's ambience dips (it is in the alley's own sound)
  function cineAmbDuck(k) { if (CINE.amb && ac) CINE.amb.out.gain.setTargetAtTime((0.5 * VOL.amb + 0.05) * k, ac.currentTime, 0.2); }
  var apiCine = {
    // a sound of the cinematic or the Legends screen; r is the playback rate (below 1 in slow motion); who: o or z
    cine: function (n, r, who) { try { cineFx(n, r, who); } catch (e) { } },
    cineStop: function () { cineStop(0.4); cineAmbDuck(1); },
    cineAmb: function (on) { try { cineAmb(on); } catch (e) { } },
    cineAmbDuck: function (k) { cineAmbDuck(k); },
    cineState: function () { return { score: !!CINE.mus, t0: CINE.t0, amb: !!CINE.amb, gen: CINE.gen }; },
    // where the score is (seconds since the cinematic's time 0 on the audio clock), or null when there is no score running
    cineClock: function () { return CINE.mus && ac && ac.state === 'running' ? ac.currentTime - CINE.t0 + 0.02 : null; }
  };
