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
      // slow: the hero figure, the knife going in on a hit (1.9.994: the new ending)
      vStrings([50, 57, 62], T(8.6), 1.1, 0.03); vRiser(T(9.0), 0.62);
      vImpact(T(9.64)); lTimp(T(9.64), mtof(29), 0.8); vBrass([38, 45], T(9.64), 0.35, 0.05);
      // the third one: a stab, the ostinato again, rising under the turn
      vStac([49, 50, 56], T(9.8), 0.06); for (var s3 = 0; s3 < 9; s3++) vTremStr(s3 % 3 === 2 ? 41 : 38, T(9.85 + s3 * 0.055), 0.035);
      [9.9, 10.05, 10.15, 10.25].forEach(function (x) { lTom(T(x), 120); }); vRiser(T(9.85), 0.5);
      // the collar strike: a braam, slowed
      vBrass([26, 33, 38], T(10.41), 0.6, 0.065); lTimp(T(10.41), mtof(31), 0.8);
      // the freeze on the shot: a cold high chord, low hits, the title's shing, a last chord
      vChoir([74, 77, 81, 86], T(11.0), 2.2, 0.03); vStrings([62, 69, 74, 77], T(11.0), 2.4, 0.032); vImpact(T(10.95)); lTimp(T(10.95), mtof(26), 1.0);
      bell(T(11.64), 1318.5, 0.07, 2.2, CINE.mus); bell(T(11.65), 1975.5, 0.04, 1.8, CINE.mus); lTimp(T(11.64), mtof(31), 0.6);
      vBrass([26, 33, 38, 41], T(12.88), 1.5, 0.05); vSub(26, T(12.88), 1.5, 0.18); vStrings([50, 53, 57], T(12.88), 1.4, 0.025);
    });
    // slow motion: the score sinks under a closing filter for the collar strike and again into the shot, then opens for the freeze
    var lp = CINE.lp.frequency; lp.setValueAtTime(18000, T(10.32)); lp.exponentialRampToValueAtTime(900, T(10.42)); lp.exponentialRampToValueAtTime(18000, T(10.62));
    lp.setValueAtTime(18000, T(10.78)); lp.exponentialRampToValueAtTime(380, T(10.9)); lp.setValueAtTime(380, T(10.94)); lp.exponentialRampToValueAtTime(18000, T(11.0));
    var g = CINE.mus.gain; g.setValueAtTime(0.95 * VOL.music, T(10.83)); g.linearRampToValueAtTime(0.12 * VOL.music, T(10.92)); g.linearRampToValueAtTime(0.95 * VOL.music, T(10.98)); g.setValueAtTime(0.95 * VOL.music, T(13.38)); g.linearRampToValueAtTime(0.0001, T(14.5));
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
      // 1.9.993: the stoop. A stroke of steel on a whetstone is a rising rasp with a thin ring at its end; a kicked can is
      // a hollow tin knock with a ring of its own, then rattling bounces and a tinny roll; a wooden chair scrapes and creaks
      case 'whet': o = cOut(0.28, -0.1, 0.12); noise(t, R(0.42), 0.22, 'bandpass', F(2600), 3, F(4200), o); noise(t + R(0.05), R(0.34), 0.08, 'highpass', F(6000), 0.7, F(9000), o); osc('sine', F(3900), F(4100), t + R(0.36), R(0.25), 0.012, o, 0.003); break;
      case 'canKick': o = cOut(0.5, (Math.random() - 0.5) * 1.4, 0.35); osc('triangle', 520, 300, t, 0.08, 0.3, o, 0.001); noise(t, 0.05, 0.45, 'bandpass', 1900, 2, null, o); [[1, 0.2], [2.4, 0.12], [3.9, 0.06]].forEach(function (p) { osc('sine', 760 * p[0], 740 * p[0], t + 0.004, 0.5 / p[0], p[1], o, 0.001); }); break;
      case 'canBounce': o = cOut(0.36, (Math.random() - 0.5) * 0.8, 0.3); noise(t, 0.03, 0.4, 'bandpass', F(2200), 2.5, null, o); [[1, 0.12], [2.3, 0.07]].forEach(function (p) { osc('sine', F(820) * p[0], F(800) * p[0], t + 0.003, 0.25 / p[0], p[1], o, 0.001); }); break;
      case 'canRoll': o = cOut(0.3, 0.2, 0.25); for (i = 0; i < 9; i++) noise(t + i * 0.09 + Math.random() * 0.03, 0.03, 0.18 * (1 - i / 10), 'bandpass', 1700 + Math.random() * 600, 3, null, o); break;
      case 'chairScrape': o = cOut(0.36, 0, 0.12); noise(t, 0.22, 0.3, 'bandpass', 700, 2, 1400, o); osc('sawtooth', 210, 160, t, 0.18, 0.03, o); break;
      case 'chairCreak': o = cOut(0.25, 0, 0.12); osc('sawtooth', 340, 300, t, 0.3, 0.025, o, 0.05); noise(t, 0.3, 0.06, 'bandpass', 900, 6, 700, o); break;
      case 'stoneTap': o = cOut(0.3, -0.1, 0.1); osc('sine', 300, 140, t, 0.06, 0.35, o); noise(t, 0.02, 0.3, 'bandpass', 1400, 2, null, o); break;
      case 'catch': o = cOut(0.25, 0.1, 0.05); noise(t, 0.02, 0.35, 'bandpass', 1600, 2, null, o); osc('sine', 3300, 3300, t + 0.005, 0.2, 0.01, o, 0.002); break;
      case 'bulbFlicker': o = cOut(0.18, 0, 0.1); for (i = 0; i < 5; i++) { noise(t + i * 0.07 + Math.random() * 0.04, 0.02, 0.25, 'highpass', 3000, 0.7, null, o); osc('square', 120, 120, t + i * 0.07, 0.03, 0.02, o); } break;
      case 'knuckles': o = cOut(0.3, 0, 0.05); for (i = 0; i < 4; i++) noise(t + i * 0.035 + Math.random() * 0.02, 0.006, 0.5, 'bandpass', 2400 + Math.random() * 1200, 4, null, o); break;
      case 'slideRack': o = cOut(0.32, 0.1, 0.06); noise(t, 0.05, 0.3, 'bandpass', 3000, 3, 3800, o); noise(t + 0.18, 0.015, 0.45, 'bandpass', 2200, 6, null, o); break;
      case 'radioClick': o = cOut(0.22, -0.3, 0.02); noise(t, 0.008, 0.4, 'bandpass', 2600, 6, null, o); noise(t + 0.02, 0.6, 0.05, 'bandpass', 1800, 0.6, 1200, o); break;
      case 'glove': case 'stretch': o = cOut(0.2, 0, 0.04); noise(t, 0.35, 0.18, 'bandpass', 1200, 0.8, 2000, o); break;
      case 'hum': o = cOut(0.14, 0, 0.1); [0, 0.55, 1.1, 1.65, 2.2].forEach(function (d, j) { voice(t + d, [196, 220, 247, 220, 196][j], [196, 220, 247, 220, 196][j], 0.5, 0.05, [[500, 3], [900, 4]], o); }); break;
      case 'blow': o = cOut(0.2, 0, 0.05); noise(t, 0.5, 0.18, 'bandpass', 1300, 0.6, 700, o); break;
      case 'startle': o = cOut(0.22, 0, 0.04); noise(t, 0.12, 0.2, 'bandpass', 900, 1, 1600, o); break;
      case 'sheathIn': o = cOut(0.32, -0.1, 0.1); noise(t, 0.25, 0.2, 'bandpass', 3000, 3, 2000, o); noise(t + 0.24, 0.02, 0.4, 'bandpass', 1800, 4, null, o); break;
      case 'siren': o = cOut(0.06, -0.6, 0.6); (function () { var g2 = ac.createOscillator(), gg = ac.createGain(); g2.type = 'triangle'; g2.frequency.setValueAtTime(650, t); for (var k2 = 0; k2 < 6; k2++) { g2.frequency.linearRampToValueAtTime(950, t + k2 * 0.9 + 0.45); g2.frequency.linearRampToValueAtTime(650, t + k2 * 0.9 + 0.9); } gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(0.06, t + 1); gg.gain.linearRampToValueAtTime(0, t + 5.4); g2.connect(gg); gg.connect(o); g2.start(t); g2.stop(t + 5.5); })(); break;
      case 'glassClink': o = cOut(0.3, (Math.random() - 0.5) * 0.8, 0.3); [[1, 0.12], [2.7, 0.07], [5.1, 0.03]].forEach(function (p) { osc('sine', F(2300) * p[0], F(2300) * p[0], t, R(0.4) / p[0], p[1], o, 0.001); }); noise(t, 0.01, 0.3, 'highpass', 4000, 1, null, o); break;
      case 'carPass': o = cOut(0.14, -0.5, 0.4); noise(t, 2.6, 0.18, 'bandpass', 300, 0.8, 900, o); noise(t + 0.8, 1.6, 0.08, 'bandpass', 1400, 1, 500, o); break;
      case 'sirenFar': cineFx('siren', r, who); break;
      case 'flick': o = cOut(0.25, 0.2, 0.15); for (i = 0; i < 4; i++) noise(t + 0.25 + i * 0.12 * (1 + i * 0.3), 0.012, 0.3 / (i + 1), 'bandpass', 2600, 5, null, o); break;
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
