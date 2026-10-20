  // ================= 1.9.50: guns, weather ambience and the sounds of the world =================
  // Every gun is built from layers: the crack of the round, the blast of the barrel, a low thump, the action cycling
  // (a slide, a bolt, a pump), a tail and a slap of echo off the buildings. Each one is rendered in three takes so
  // rapid fire never sounds like one sample repeating, and shell casings tinkle onto the road after the shot.
  // Gunfire has its own bus with an echo that follows the district: tight slaps between buildings downtown,
  // almost dry out in the desert and the snow.
  var GUNS = ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'revolver', 'lmg', 'burst', 'launcher'];
  var GV = [], gunEnv = null, gunConv = null, ENVK = { city: [0.2, 0.1, 0.12], burning: [0.18, 0.08, 0.12], chaos: [0.2, 0.1, 0.12], ruins: [0.26, 0.14, 0.16], ash: [0.2, 0.1, 0.14], suburb: [0.12, 0.05, 0.08], desert: [0.04, 0.02, 0.03], snow: [0.05, 0.02, 0.05] };
  function gunEnvInit() {
    // two echoes off the street (near wall, far wall), filtered dull; plus a short hall when audio quality allows
    var d1 = ac.createDelay(1), d2 = ac.createDelay(1), lp = ac.createBiquadFilter(), g1 = ac.createGain(), g2 = ac.createGain();
    d1.delayTime.value = 0.11; d2.delayTime.value = 0.29; lp.type = 'lowpass'; lp.frequency.value = 1900; g1.gain.value = 0.2; g2.gain.value = 0.1;
    gunBus.connect(lp); lp.connect(d1); lp.connect(d2); d1.connect(g1); d2.connect(g2); g1.connect(gunOut); g2.connect(gunOut);
    gunEnv = { g1: g1, g2: g2, bio: '' };
    gunConvSet();
  }
  function gunConvSet() {
    if (!ac || !gunBus) return;
    if (AQ >= 2 && !gunConv) { var cv = ac.createConvolver(), wg = ac.createGain(); cv.buffer = impulse(1.3); wg.gain.value = 0.12; gunBus.connect(cv); cv.connect(wg); wg.connect(gunOut); gunConv = { cv: cv, wg: wg }; }
    else if (AQ < 2 && gunConv) { try { gunBus.disconnect(gunConv.cv); gunConv.wg.disconnect(); } catch (e) { } gunConv = null; }
  }
  function applyVol() {
    if (!ac) return; var t = ac.currentTime, n = MIX.night;
    master.gain.setTargetAtTime(0.86 * VOL.master, t, 0.03);
    sfxBus.gain.setTargetAtTime(0.85 * VOL.sfx, t, 0.03);
    loudBus.gain.setTargetAtTime(0.8 * VOL.sfx * (n ? 0.6 : 1), t, 0.03);
    gunBus.gain.setTargetAtTime(VOL.gun * VOL.sfx, t, 0.03);
    uiBus.gain.setTargetAtTime(0.9 * VOL.ui * VOL.master, t, 0.03);
    ambBus.gain.setTargetAtTime(0.9 * VOL.amb, t, 0.03);
  }
  function applyMix() {
    if (!ac) return; var n = MIX.night;
    // night mode: the effects compressor squeezes hard so explosions don't jump out over everything else
    sfxComp.threshold.value = n ? -28 : -14; sfxComp.ratio.value = n ? 12 : 6; sfxComp.knee.value = n ? 4 : 8;
    if (gunOut) { gunOut.threshold.value = n ? -22 : -9; gunOut.ratio.value = n ? 10 : 4; }
    mixG.gain.value = n ? 0.6 : 0.5;
    try { master.channelCount = MIX.mono ? 1 : 2; master.channelCountMode = MIX.mono ? 'explicit' : 'max'; } catch (e) { }
    applyVol();
  }
  function jr(R, k) { return 1 + (R() - 0.5) * k; }
  // one round of a gun at time t on bus b (take v changes the random details)
  function gunRound(t, k, R, b) {
    var j = function (x) { return x * jr(R, 0.12); };
    switch (k) {
      case 'pistol':
        noise(t, 0.008, 0.5, 'highpass', j(3500), 0.7, null, b); noise(t, 0.07, 0.45, 'bandpass', j(1500), 0.8, 600, b); osc('sine', j(180), 55, t, 0.07, 0.45, b, 0.0015);
        noise(t + 0.01, 0.28, 0.12, 'lowpass', 900, 0.6, 250, b); noise(t + j(0.09), 0.05, 0.06, 'lowpass', 1300, 0.7, 600, b);
        noise(t + 0.035, 0.008, 0.12, 'bandpass', 4200, 6, null, b); noise(t + 0.062, 0.008, 0.08, 'bandpass', 3000, 6, null, b); break;
      case 'smg':
        noise(t, 0.006, 0.42, 'highpass', j(4200), 0.7, null, b); noise(t, 0.045, 0.38, 'bandpass', j(2100), 1, 900, b); osc('sine', j(160), 60, t, 0.045, 0.32, b, 0.0015);
        noise(t + 0.01, 0.17, 0.08, 'lowpass', 1100, 0.6, 300, b); noise(t + 0.02, 0.007, 0.07, 'bandpass', 5000, 6, null, b); break;
      case 'rifle': case 'burst':
        var br = k === 'burst';
        noise(t, br ? 0.008 : 0.01, 0.55, 'highpass', j(br ? 3300 : 3000), 0.7, null, b); noise(t, br ? 0.07 : 0.09, 0.5, 'bandpass', j(br ? 1600 : 1300), 0.8, 500, b); osc('sine', j(br ? 150 : 140), br ? 48 : 45, t, br ? 0.08 : 0.1, 0.5, b, 0.0015);
        noise(t + 0.01, br ? 0.3 : 0.38, 0.14, 'lowpass', 1100, 0.6, 280, b); noise(t + j(0.11), 0.06, 0.08, 'lowpass', 1400, 0.7, 600, b); noise(t + j(0.23), 0.06, 0.04, 'lowpass', 1000, 0.7, 500, b);
        noise(t + 0.03, 0.008, 0.1, 'bandpass', 3800, 6, null, b); break;
      case 'shotgun':
        noise(t, 0.012, 0.55, 'highpass', j(2500), 0.7, null, b); noise(t, 0.24, 0.8, 'bandpass', j(900), 0.6, 300, b); osc('sine', j(110), 35, t, 0.24, 0.95, b, 0.0015);
        noise(t, 0.32, 0.42, 'lowpass', 600, 0.7, 150, b); noise(t + 0.01, 0.65, 0.3, 'lowpass', 700, 0.6, 180, b); noise(t + j(0.12), 0.08, 0.12, 'lowpass', 1100, 0.7, 500, b);
        // the pump: back, then forward
        noise(t + 0.38, 0.01, 0.18, 'bandpass', 2600, 5, null, b); noise(t + 0.39, 0.06, 0.12, 'bandpass', 1800, 2, 1200, b);
        noise(t + 0.52, 0.01, 0.2, 'bandpass', 2200, 5, null, b); noise(t + 0.52, 0.07, 0.12, 'bandpass', 1500, 2, 2000, b); osc('sine', 300, 200, t + 0.53, 0.02, 0.12, b, 0.001); break;
      case 'sniper':
        noise(t, 0.004, 0.6, 'highpass', 5000, 0.7, null, b); noise(t, 0.015, 0.5, 'highpass', j(2200), 0.7, null, b); noise(t, 0.18, 0.82, 'bandpass', j(1100), 0.8, 350, b); osc('sine', j(92), 28, t, 0.32, 0.98, b, 0.0015);
        noise(t + 0.01, 0.95, 0.32, 'lowpass', 800, 0.6, 140, b); noise(t + j(0.15), 0.08, 0.12, 'lowpass', 1200, 0.7, 500, b); noise(t + j(0.34), 0.08, 0.08, 'lowpass', 900, 0.7, 400, b); noise(t + j(0.6), 0.1, 0.05, 'lowpass', 700, 0.7, 300, b);
        // the bolt cycling
        noise(t + 0.55, 0.01, 0.15, 'bandpass', 2400, 5, null, b); noise(t + 0.56, 0.08, 0.1, 'bandpass', 1500, 2, 1000, b); noise(t + 0.68, 0.01, 0.18, 'bandpass', 2800, 5, null, b); break;
      case 'revolver':
        noise(t, 0.01, 0.55, 'highpass', j(3200), 0.7, null, b); noise(t, 0.15, 0.76, 'bandpass', j(1200), 0.8, 450, b); osc('sine', j(130), 40, t, 0.17, 0.86, b, 0.0015);
        noise(t + 0.01, 0.55, 0.26, 'lowpass', 900, 0.6, 200, b); noise(t + j(0.1), 0.07, 0.1, 'lowpass', 1300, 0.7, 500, b);
        noise(t + 0.32, 0.008, 0.1, 'bandpass', 3500, 6, null, b); noise(t + 0.36, 0.01, 0.12, 'bandpass', 2600, 6, null, b); break;
      case 'lmg':
        noise(t, 0.009, 0.48, 'highpass', j(2800), 0.7, null, b); noise(t, 0.08, 0.48, 'bandpass', j(1250), 0.8, 450, b); osc('sine', j(120), 42, t, 0.09, 0.5, b, 0.0015);
        noise(t + 0.01, 0.26, 0.1, 'lowpass', 1000, 0.6, 260, b); noise(t + 0.02, 0.008, 0.06, 'bandpass', 4500, 6, null, b); noise(t + 0.045, 0.008, 0.05, 'bandpass', 3600, 6, null, b); break;
      case 'launcher':
        osc('sine', j(95), 38, t, 0.25, 0.7, b, 0.002); noise(t, 0.18, 0.45, 'bandpass', 320, 1.4, 200, b); noise(t, 0.3, 0.2, 'bandpass', 1200, 0.8, 300, b);
        noise(t + 0.02, 0.008, 0.1, 'bandpass', 2000, 5, null, b); noise(t + 0.6, 0.01, 0.14, 'bandpass', 1800, 5, null, b); osc('sine', 220, 150, t + 0.6, 0.03, 0.15, b, 0.001); break;
    }
  }
  var GUNDUR = { pistol: 0.42, smg: 0.3, rifle: 0.55, shotgun: 0.75, sniper: 1.15, revolver: 0.62, lmg: 0.4, burst: 0.75, launcher: 0.72 };
  // shell casings: a few metallic pings as they bounce on the road (shotgun shells are a duller plastic tock)
  function casing(t, R, shell) {
    var hs = [0, 0.06 + R() * 0.03, 0.13 + R() * 0.05];
    for (var i = 0; i < hs.length; i++) {
      var v = (1 - i * 0.3) * 0.05, tt = t + hs[i];
      if (shell) { osc('sine', 900 + R() * 200, 700, tt, 0.03, v * 1.4, null, 0.0008); noise(tt, 0.012, v, 'bandpass', 2400, 3); }
      else { [4800, 6900, 9200].forEach(function (f, k) { var ff = f * jr(R, 0.06); osc('sine', ff, ff, tt, 0.05 / (1 + k * 0.5), v * [1, 0.6, 0.35][k], null, 0.0005); }); noise(tt, 0.006, v * 1.2, 'highpass', 6000, 0.7); }
    }
  }
  // a weapon mod's own little layer on each shot
  var MODL = { incendiary: 'fire', cryo: 'ice', shock: 'zap', toxic: 'hiss', explosive: 'thud', gravity: 'wub' };
  function modLayer(t, m) {
    switch (m) {
      case 'fire': noise(t, 0.14, 0.06, 'highpass', 3000, 0.7, null); noise(t + 0.02, 0.1, 0.05, 'bandpass', 900, 2, 2400); break;
      case 'ice': osc('sine', 2600, 2600, t, 0.12, 0.035, null, 0.001); osc('sine', 3900, 3900, t + 0.02, 0.1, 0.025, null, 0.001); break;
      case 'zap': osc('sawtooth', 1800, 400, t, 0.06, 0.05); noise(t, 0.04, 0.05, 'highpass', 5000); break;
      case 'hiss': noise(t, 0.1, 0.05, 'bandpass', 5000, 2, 3000); break;
      case 'thud': osc('sine', 80, 40, t, 0.08, 0.14); break;
      case 'wub': osc('sine', 200, 60, t, 0.12, 0.08); break;
    }
  }
  function bakeAll2() {
    GUNS.forEach(function (k) {
      for (var v = 0; v < 3; v++) (function (v) {
        bake('g_' + k + v, GUNDUR[k] + 0.35, function (t) {
          var R = Z2(k.length * 131 + v * 977);
          if (k === 'burst') { gunRound(t, k, R, sfxBus); gunRound(t + 0.07, k, R, sfxBus); gunRound(t + 0.14, k, R, sfxBus); }
          else gunRound(t, k, R, sfxBus);
        }, k === 'shotgun' || k === 'sniper' || k === 'revolver' || k === 'launcher' ? 0.82 : 0.72);
      })(v);
    });
    for (var v = 0; v < 3; v++) (function (v) { bake('case' + v, 0.4, function (t) { casing(t, Z2(v * 31 + 7), false); }, 0.3); bake('shell' + v, 0.4, function (t) { casing(t, Z2(v * 37 + 11), true); }, 0.3); })(v);
    ['fire', 'ice', 'zap', 'hiss', 'thud', 'wub'].forEach(function (m) { bake('m_' + m, 0.25, function (t) { modLayer(t, m); }, 0.3); });
    // the world
    [0, 1, 2].forEach(function (v) { bake('thunderC' + v, 4.6, function (t) { thunderSnd(t, true, Z2(v * 53 + 1)); }, 0.95); });
    bake('thunderF', 4.2, function (t) { thunderSnd(t, false, Z2(99)); }, 0.7);
    bake('rustleA', 0.4, function (t) { rustleSnd(t, false); }, 0.5); bake('rustleD', 0.4, function (t) { rustleSnd(t, true); }, 0.5);
    bake('flap', 0.7, function (t) { flapSnd(t, false); }, 0.5); bake('flapB', 0.9, function (t) { flapSnd(t, true); }, 0.5);
    bake('splash', 0.7, function (t) { splashSnd(t); }, 0.6);
    bake('static', 0.8, function (t) { staticSnd(t); }, 0.4);
    ['barrel', 'cone', 'can', 'tire', 'crate'].forEach(function (k) { bake('p_' + k, 0.35, function (t) { propSnd(t, k); }, 0.5); });
    ['road', 'sand', 'snow', 'water', 'ice', 'grass', 'ash', 'mud', 'wet'].forEach(function (s) { for (var v = 0; v < 2; v++) (function (v) { bake('st_' + s + v, 0.3, function (t) { stepSnd(t, s, Z2(s.length * 17 + v * 5)); }, 0.35); })(v); });
  }
  function Z2(n) { var a = n | 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // gun voices: up to 8 ringing at once, the oldest fades out to make room
  function gunVoice(name, t, vol, rate, bus) {
    var v = play(name, t, vol, rate, bus, 0, 0, true); if (!v || v === true) return;
    GV.push(v); v.s.onended = function () { var i = GV.indexOf(v); if (i >= 0) GV.splice(i, 1); try { v.g.disconnect(); } catch (e) { } };
    while (GV.length > 8) { var o = GV.shift(), tt = ac.currentTime; try { o.g.gain.cancelScheduledValues(tt); o.g.gain.setValueAtTime(o.g.gain.value, tt); o.g.gain.linearRampToValueAtTime(0.0001, tt + 0.04); o.s.stop(tt + 0.05); } catch (e) { } }
  }
  var lastGun = { k: '', n: 0, mod: 0 };
  function gunShot(kind, mod) {
    if (!ok()) return;
    if (kind === 'flamer') { flameOn(); return; }
    var k = GUNS.indexOf(kind) >= 0 ? kind : 'pistol', fast = k === 'smg' || k === 'lmg';
    if (!throttle('shot', fast ? 50 : 35)) return;
    var t = ac.currentTime, n = (lastGun.n + 1 + (Math.random() < 0.5 ? 1 : 0)) % 3; lastGun.n = n;
    var name = 'g_' + k + n;
    if (!BANK[name]) { gunRound(t, k, Math.random, gunBus); return; }
    gunVoice(name, t, fast ? 0.85 : 1, 0.96 + Math.random() * 0.08, gunBus);
    // casings land a moment later (most of the time, and not for every round of a stream)
    if (k !== 'launcher' && k !== 'revolver' && Math.random() < (fast ? 0.35 : 0.75)) {
      var cs = BANK[(k === 'shotgun' ? 'shell' : 'case') + Math.floor(Math.random() * 3)];
      if (cs) { var s = ac.createBufferSource(), g = ac.createGain(); s.buffer = cs; s.playbackRate.value = 0.94 + Math.random() * 0.12; g.gain.value = 0.9; s.connect(g); g.connect(gunBus); s.start(t + 0.18 + Math.random() * 0.15); s.onended = function () { try { g.disconnect(); } catch (e) { } }; }
    }
    var ml = MODL[mod]; if (ml && performance.now() - lastGun.mod > 90) { lastGun.mod = performance.now(); play('m_' + ml, t + 0.01, 0.9, 0.97 + Math.random() * 0.06, gunBus); }
  }
  // the flamethrower is one continuous roar while it fires, with a crackle riding on it
  var FL = null;
  function flameOn() {
    var t = ac.currentTime;
    if (FL) { FL.last = t; return; }
    var src = ac.createBufferSource(), lp = ac.createBiquadFilter(), bp = ac.createBiquadFilter(), g = ac.createGain(), am = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    src.buffer = noiseBuf; src.loop = true; lp.type = 'lowpass'; lp.frequency.value = 1300; bp.type = 'bandpass'; bp.frequency.value = 320; bp.Q.value = 0.8;
    lfo.type = 'square'; lfo.frequency.value = 13; lg.gain.value = 0.18; am.gain.value = 0.82; lfo.connect(lg); lg.connect(am.gain);
    src.connect(lp); src.connect(bp); lp.connect(am); bp.connect(am); am.connect(g); g.connect(gunBus);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.32, t + 0.08);
    src.start(t, Math.random()); lfo.start(t);
    noise(t, 0.06, 0.18, 'highpass', 2000, 0.7, null, gunBus);   // the ignition
    FL = { src: src, lfo: lfo, g: g, last: t };
  }
  function flameTick() {
    if (!FL || !ac) return; var t = ac.currentTime;
    if (t - FL.last > 0.2) { var f = FL; FL = null; f.g.gain.cancelScheduledValues(t); f.g.gain.setValueAtTime(f.g.gain.value, t); f.g.gain.linearRampToValueAtTime(0.0001, t + 0.25); try { f.src.stop(t + 0.3); f.lfo.stop(t + 0.3); } catch (e) { } setTimeout(function () { try { f.g.disconnect(); } catch (e) { } }, 500); }
  }

  // ---------- weather ambience ----------
  // a few long noise loops through filters: rain, wind, a river, a fire's roar. Their levels follow the weather.
  // 1.9.925: the wind is a soft breeze that swells with each gust and rises in pitch as it strengthens, it whistles
  // between buildings when it picks up, and there are quiet beds under everything: the low drone of a dead city,
  // and crickets or cicadas out in the suburbs and the desert.
  var AMB = null, ambLv = { rain: 0, wind: 0, river: 0, fire: 0, ash: 0, whistle: 0, hum: 0, bugs: 0 }, ambIdle = 0, crackT = 0, AMBK = ['rain', 'wind', 'river', 'fire', 'ash', 'whistle', 'hum', 'bugs'];
  // insects, written straight into a loop: a couple of crickets chirping at their own pace, or the buzz of cicadas
  function bugBuf(sec) {
    var sr = ac.sampleRate, n = Math.floor(sr * sec), b = ac.createBuffer(1, n, sr), d = b.getChannelData(0);
    var cr = [[4300, 0.62, 0], [4750, 0.81, 0.27], [3900, 1.13, 0.5]];
    cr.forEach(function (c) {
      for (var t0 = c[2]; t0 < sec - 0.2; t0 += c[1] * (0.9 + Math.random() * 0.2)) for (var p = 0; p < 3; p++) {
        var s0 = Math.floor((t0 + p * 0.034) * sr), len = Math.floor(0.022 * sr);
        for (var i = 0; i < len && s0 + i < n; i++) d[s0 + i] += Math.sin(2 * Math.PI * c[0] * i / sr) * Math.sin(Math.PI * i / len) * 0.22;
      }
    });
    // a faint cicada hiss underneath, pulsing
    for (var j = 0; j < n; j++) d[j] += (Math.random() * 2 - 1) * 0.05 * (0.6 + 0.4 * Math.sin(2 * Math.PI * 38 * j / sr)) * (0.5 + 0.5 * Math.sin(2 * Math.PI * j / n * 2));
    var f = Math.floor(sr * 0.05); for (var k = 0; k < f; k++) { var q = k / f; d[k] = d[k] * q + d[n - f + k] * (1 - q); }
    return b;
  }
  function ambNoise(sec, brown) {
    var n = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0), last = 0;
    for (var i = 0; i < n; i++) { var w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    // crossfade the ends so the loop never clicks
    var f = Math.floor(ac.sampleRate * 0.05); for (var j = 0; j < f; j++) { var k = j / f; d[j] = d[j] * k + d[n - f + j] * (1 - k); }
    return b;
  }
  function ambStart() {
    if (AMB || !ac) return;
    var white = ambNoise(4.3, false), brown = ambNoise(5.1, true), t = ac.currentTime;
    var mk = function (buf, chain) { var s = ac.createBufferSource(); s.buffer = buf; s.loop = true; var g = ac.createGain(); g.gain.value = 0; var last = s; chain.forEach(function (n) { last.connect(n); last = n; }); last.connect(g); g.connect(ambBus); s.start(t, Math.random() * 2); return { s: s, g: g }; };
    var f = function (type, fr, q) { var b = ac.createBiquadFilter(); b.type = type; b.frequency.value = fr; if (q) b.Q.value = q; return b; };
    var windBp = f('bandpass', 500, 0.7), wl = ac.createOscillator(), wlg = ac.createGain(); wl.frequency.value = 0.13; wlg.gain.value = 260; wl.connect(wlg); wlg.connect(windBp.frequency); wl.start(t);
    var river = f('bandpass', 520, 0.9), rl = ac.createOscillator(), rlg = ac.createGain(); rl.type = 'triangle'; rl.frequency.value = 3.3; rlg.gain.value = 140; rl.connect(rlg); rlg.connect(river.frequency); rl.start(t);
    // the whistle: a narrow band of noise that wavers in pitch
    var wh = f('bandpass', 1100, 14), whl = ac.createOscillator(), whg = ac.createGain(); whl.frequency.value = 0.37; whg.gain.value = 180; whl.connect(whg); whg.connect(wh.frequency); whl.start(t);
    var windLp = f('lowpass', 1400);
    AMB = {
      rain: mk(white, [f('highpass', 900), f('lowpass', 7500), f('peaking', 3200, 0.7)]),
      wind: mk(brown, [windBp, windLp]),
      river: mk(brown, [river, f('lowpass', 1500)]),
      fire: mk(brown, [f('lowpass', 420)]),
      ash: mk(brown, [f('bandpass', 260, 0.6)]),
      whistle: mk(white, [wh, f('peaking', 1800, 3)]),
      hum: mk(brown, [f('lowpass', 140), f('peaking', 60, 4)]),
      bugs: mk(bugBuf(5.3), [f('highpass', 2000)]),
      windBp: windBp, windLp: windLp, wh: wh, pitch: -1,
      lfos: [wl, rl, whl]
    };
  }
  function ambStop() {
    if (!AMB) return; var a = AMB; AMB = null;
    AMBK.forEach(function (k) { try { a[k].s.stop(); a[k].g.disconnect(); } catch (e) { } });
    a.lfos.forEach(function (o) { try { o.stop(); } catch (e) { } });
  }
  var AMAX = { rain: 0.34, wind: 0.42, river: 0.3, fire: 0.3, ash: 0.18, whistle: 0.07, hum: 0.16, bugs: 0.1 };
  function ambSet(lv) {
    if (!ac || ac.state !== 'running') return;
    var any = false;
    for (var k in ambLv) { var v = lv && sfxOn ? Math.max(0, Math.min(1, lv[k] || 0)) : 0; ambLv[k] = v; if (v > 0.01) any = true; }
    if (any) { ambIdle = 0; ambStart(); } else if (AMB && ++ambIdle > 600) { ambStop(); return; }
    if (!AMB) return;
    var t = ac.currentTime;
    for (var k2 in ambLv) { var g = AMB[k2].g.gain, tgt = ambLv[k2] * AMAX[k2]; if (Math.abs(g.value - tgt) > 0.004) g.setTargetAtTime(tgt, t, k2 === 'wind' ? 0.35 : 0.5); }
    // a stronger wind is a higher, brighter rush, and the whistle climbs with it
    var wp = lv && lv.windPitch != null ? Math.max(0, Math.min(1.4, lv.windPitch)) : 0.3;
    if (Math.abs(wp - AMB.pitch) > 0.02) { AMB.pitch = wp; AMB.windBp.frequency.setTargetAtTime(330 + wp * 520, t, 0.6); AMB.windLp.frequency.setTargetAtTime(900 + wp * 1500, t, 0.6); AMB.wh.frequency.setTargetAtTime(850 + wp * 650, t, 0.8); }
    // fire crackles: little pops scheduled while a fire is close
    if (ambLv.fire > 0.05 && t > crackT) { crackT = t + 0.05 + Math.random() * 0.25 / ambLv.fire; noise(t + 0.01, 0.006 + Math.random() * 0.012, 0.05 + Math.random() * 0.12 * ambLv.fire, 'bandpass', 1500 + Math.random() * 3000, 1.4, null, ambBus); }
  }
  // thunder: a crack that tears overhead (close) and a long roll that rumbles away
  function thunderSnd(t, close, R) {
    var bus = ac.createGain(), cv = ac.createConvolver(), wg = ac.createGain(); bus.connect(sfxBus); cv.buffer = impulse(2.4); wg.gain.value = 0.45; bus.connect(cv); cv.connect(wg); wg.connect(sfxBus);
    if (close) { noise(t, 0.05, 0.7, 'highpass', 1800, 0.7, null, bus); noise(t, 0.35, 0.6, 'bandpass', 900, 0.6, 200, bus); osc('sine', 70, 28, t, 0.6, 0.8, bus, 0.003); for (var i = 0; i < 8; i++) noise(t + 0.03 + i * 0.03 + R() * 0.02, 0.03, 0.3 * (1 - i / 9), 'bandpass', 600 + R() * 1800, 1, null, bus); }
    var roll = close ? 3.6 : 3.4;
    for (var k = 0; k < 9; k++) { var tt = t + (close ? 0.25 : 0) + k * roll / 10 + R() * 0.2; noise(tt, 0.6 + R() * 0.6, (close ? 0.42 : 0.3) * (1 - k / 10), 'lowpass', 260 + R() * 260, 0.8, 60, bus); }
    osc('sine', 45, 30, t + (close ? 0.2 : 0), roll, close ? 0.35 : 0.25, bus, 0.4);
  }
  function rustleSnd(t, dry) {
    for (var i = 0; i < 9; i++) { var tt = t + i * 0.028 + Math.random() * 0.02; noise(tt, 0.03 + Math.random() * 0.03, (0.12 + Math.random() * 0.1) * (1 - i / 11), 'bandpass', dry ? 2400 + Math.random() * 2000 : 3200 + Math.random() * 2500, dry ? 1.5 : 0.9); }
  }
  function flapSnd(t, big) { var n = big ? 6 : 9, iv = big ? 0.12 : 0.06; for (var i = 0; i < n; i++) noise(t + i * iv, big ? 0.07 : 0.04, 0.22 * (1 - i / (n + 2)), 'lowpass', big ? 500 : 900, 0.8, 200); }
  function splashSnd(t) { noise(t, 0.3, 0.45, 'bandpass', 1400, 0.8, 500); noise(t + 0.02, 0.4, 0.2, 'highpass', 3000, 0.7); for (var i = 0; i < 5; i++) { var tt = t + 0.08 + Math.random() * 0.4; osc('sine', 600 + Math.random() * 900, 1400 + Math.random() * 800, tt, 0.04, 0.05, null, 0.001); } }
  function staticSnd(t) { for (var i = 0; i < 30; i++) noise(t + i * 0.024 + Math.random() * 0.01, 0.008, 0.04 + i * 0.006, 'highpass', 3000 + Math.random() * 4000, 0.7); }
  function propSnd(t, k) {
    switch (k) {
      case 'barrel': bell(t, 180, 0.12, 0.4); noise(t, 0.05, 0.3, 'bandpass', 700, 1.2); break;
      case 'cone': noise(t, 0.04, 0.3, 'bandpass', 900, 1.5); osc('sine', 260, 180, t, 0.05, 0.15); break;
      case 'can': bell(t, 520, 0.06, 0.25); noise(t, 0.12, 0.2, 'bandpass', 3000, 2); noise(t + 0.08, 0.06, 0.12, 'bandpass', 2400, 2); break;
      case 'tire': osc('sine', 110, 70, t, 0.12, 0.3); noise(t, 0.06, 0.12, 'lowpass', 400); break;
      case 'crate': noise(t, 0.05, 0.35, 'bandpass', 600, 1.4); osc('triangle', 220, 160, t, 0.06, 0.18); break;
    }
  }
  function stepSnd(t, s, R) {
    var v = 0.6 + R() * 0.4;
    switch (s) {
      case 'road': case 'wet': noise(t, 0.03, 0.18 * v, 'bandpass', 900 + R() * 300, 1.2); osc('sine', 120, 80, t, 0.04, 0.12 * v); if (s === 'wet') noise(t + 0.01, 0.08, 0.12 * v, 'highpass', 2500, 0.7); break;
      case 'sand': noise(t, 0.09, 0.14 * v, 'bandpass', 1800 + R() * 600, 0.7, 900); break;
      case 'snow': for (var i = 0; i < 6; i++) noise(t + i * 0.012 + R() * 0.006, 0.012, 0.13 * v, 'bandpass', 1500 + R() * 2500, 1.6); break;
      case 'water': noise(t, 0.16, 0.22 * v, 'bandpass', 1200, 0.8, 500); osc('sine', 500 + R() * 300, 1000, t + 0.05, 0.04, 0.04); break;
      case 'ice': noise(t, 0.01, 0.2 * v, 'highpass', 4000, 0.7); osc('sine', 2400, 2000, t, 0.03, 0.04 * v); break;
      case 'grass': noise(t, 0.08, 0.1 * v, 'bandpass', 3500, 1, 2500); break;
      case 'ash': noise(t, 0.08, 0.1 * v, 'lowpass', 900, 0.7, 400); break;
      case 'mud': noise(t, 0.12, 0.18 * v, 'lowpass', 700, 1.2, 300); osc('sine', 180, 90, t + 0.03, 0.08, 0.1 * v); break;
    }
  }
  // ---------- the sounds of the world, far off ----------
  // Each one is synthesised when it plays (so no two are quite alike) through its own pan and a lowpass that dulls
  // it with distance, on the ambience volume. Weather.js decides what you hear and when, by district and weather.
  function hold(type, f0, f1, t, dur, vol, bus, att, rel) {
    var o = ac.createOscillator(), g = ac.createGain(); att = att || 0.02; rel = rel || 0.06;
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.linearRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.setValueAtTime(vol, t + Math.max(att, dur - rel)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05); return o;
  }
  function flt(type, f, q, dest) { var b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || 1; b.connect(dest); return b; }
  // noise that swells in and out (a gust through leaves, sand hissing past)
  function swell(t, dur, vol, type, f, q, bus) {
    var s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q || 0.7;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  // a voice-like tone with vibrato (howls, sirens), following a list of [time, frequency] points
  function glide(type, pts, t, vol, bus, vib, vibHz) {
    var o = ac.createOscillator(), g = ac.createGain(), end = pts[pts.length - 1][0];
    o.type = type; o.frequency.setValueAtTime(pts[0][1], t); for (var i = 1; i < pts.length; i++) o.frequency.linearRampToValueAtTime(pts[i][1], t + pts[i][0]);
    if (vib) { var l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = vibHz || 5; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + end + 0.1); }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.3, end * 0.2)); g.gain.setValueAtTime(vol, t + end * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + end);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + end + 0.05);
  }
  var AEV = {
    // a siren somewhere across the city: a slow wail, or the fast yelp
    siren: function (t, b, R) {
      var lp = flt('lowpass', 1700, 0.7, b), pts = [[0, 640]];
      if (R() < 0.6) { for (var i = 0; i < 2; i++) { pts.push([i * 2.8 + 1.3, 1180]); pts.push([i * 2.8 + 2.8, 640]); } }
      else { for (var j = 0; j < 14; j++) pts.push([0.2 + j * 0.3, j % 2 ? 700 : 1350]); pts.push([4.6, 700]); }
      glide('sawtooth', pts, t, 0.07, lp); glide('sine', pts, t, 0.08, b); return 6;
    },
    horn: function (t, b, R) {
      var lp = flt('lowpass', 1800, 0.7, b), n = 1 + Math.floor(R() * 3), tt = t;
      for (var i = 0; i < n; i++) { var d = i === n - 1 ? 0.5 + R() * 0.4 : 0.18 + R() * 0.1; hold('square', 392, 392, tt, d, 0.05, lp, 0.01, 0.03); hold('square', 494, 494, tt, d, 0.04, lp, 0.01, 0.03); tt += d + 0.12; }
      return tt - t + 0.2;
    },
    // a helicopter passing over somewhere: the rotor's thump rises and falls away
    heli: function (t, b, R) {
      var dur = 8, n = Math.floor(dur * 11.5);
      for (var i = 0; i < n; i++) { var a = Math.pow(Math.sin(Math.PI * i / n), 2); if (a < 0.03) continue; noise(t + i / 11.5, 0.07, 0.3 * a, 'lowpass', 300 + a * 200, 1, 110, b); }
      swell(t, dur, 0.05, 'bandpass', 1400, 2, b); hold('sine', 1720, 1600, t + 1, dur - 2, 0.012, b, 2, 2); return dur + 0.3;
    },
    gunfar: function (t, b, R) {
      var lp = flt('lowpass', 1100, 0.7, b), burst = R() < 0.45, n = burst ? 4 + Math.floor(R() * 6) : 2 + Math.floor(R() * 4), tt = t;
      for (var i = 0; i < n; i++) { noise(tt, 0.05, 0.45, 'lowpass', 1000, 0.7, 300, lp); osc('sine', 110, 45, tt, 0.12, 0.35, lp); noise(tt + 0.22, 0.32, 0.12, 'lowpass', 520, 0.6, 200, lp); tt += burst ? 0.085 + R() * 0.02 : 0.35 + R() * 0.7; }
      return tt - t + 0.8;
    },
    dog: function (t, b, R) {
      var bp = flt('bandpass', 950, 1.6, b), n = 2 + Math.floor(R() * 4), tt = t, f = 0.85 + R() * 0.4;
      for (var i = 0; i < n; i++) { hold('sawtooth', 560 * f, 330 * f, tt, 0.12, 0.2, bp, 0.008, 0.05); noise(tt, 0.09, 0.14, 'bandpass', 1300 * f, 1.5, 700, b); tt += 0.25 + R() * (i % 2 ? 0.5 : 0.15); }
      return tt - t + 0.3;
    },
    // wind chimes on a porch
    chime: function (t, b, R) {
      var notes = [1047, 1175, 1319, 1568, 1760, 2093], n = 4 + Math.floor(R() * 5), tt = t;
      for (var i = 0; i < n; i++) { bell(tt, notes[Math.floor(R() * notes.length)], 0.04 + R() * 0.03, 2.4, b); tt += 0.1 + R() * 0.45; }
      return tt - t + 2.6;
    },
    bird: function (t, b, R) {
      var tt = t, base = 2600 + R() * 1500;
      if (R() < 0.5) { for (var i = 0; i < 3 + Math.floor(R() * 4); i++) { var f0 = base * (0.9 + R() * 0.25); osc('sine', f0, f0 * (R() < 0.5 ? 1.35 : 0.7), tt, 0.07 + R() * 0.06, 0.05, b, 0.006); tt += 0.12 + R() * 0.25; } }
      else { for (var j = 0; j < 8; j++) { osc('sine', base * 1.1, base * 0.85, tt, 0.035, 0.04, b, 0.003); tt += 0.05; } tt += 0.2; osc('sine', base * 0.8, base * 1.3, tt, 0.18, 0.05, b, 0.01); tt += 0.2; }
      return tt - t + 0.3;
    },
    crow: function (t, b, R) {
      var bp = flt('bandpass', 1300, 2.5, b), n = 2 + Math.floor(R() * 3), tt = t;
      for (var i = 0; i < n; i++) { hold('sawtooth', 660, 520, tt, 0.26, 0.14, bp, 0.02, 0.08); noise(tt, 0.26, 0.05, 'bandpass', 1900, 2, 1400, b); tt += 0.42 + R() * 0.2; }
      return tt - t + 0.3;
    },
    // a building settling: a long wooden creak, or the groan of steel
    creak: function (t, b, R) {
      var bp = flt('bandpass', 650 + R() * 300, 5, b), d = 0.8 + R() * 0.9;
      hold('sawtooth', 70 + R() * 30, 120 + R() * 40, t, d, 0.18, bp, 0.1, 0.2); return d + 0.3;
    },
    metal: function (t, b, R) {
      var bp = flt('bandpass', 380 + R() * 200, 7, b), d = 1.4 + R() * 0.8;
      hold('triangle', 160 + R() * 40, 230 + R() * 50, t, d, 0.22, bp, 0.3, 0.4); hold('sine', 330, 410, t + 0.2, d - 0.2, 0.03, b, 0.3, 0.4);
      if (R() < 0.6) bell(t + d, 300 + R() * 200, 0.05, 1.3, b); return d + 1.4;
    },
    // somewhere a wall gives way
    collapse: function (t, b, R) {
      noise(t, 2.4, 0.32, 'lowpass', 320, 0.8, 70, b); osc('sine', 55, 28, t, 2, 0.4, b, 0.05);
      for (var i = 0; i < 16; i++) { var tt = t + 0.15 + R() * 1.8; noise(tt, 0.02 + R() * 0.03, 0.12 * (1 - (tt - t) / 2.4), 'bandpass', 700 + R() * 2200, 2, null, b); }
      if (R() < 0.5) bell(t + 0.5 + R(), 260 + R() * 200, 0.04, 1, b); return 3;
    },
    glass: function (t, b, R) {
      noise(t, 0.05, 0.25, 'highpass', 3200, 0.7, null, b);
      for (var i = 0; i < 12; i++) { var f = 3000 + R() * 4500; osc('sine', f, f, t + 0.03 + R() * 0.7, 0.05 + R() * 0.08, 0.025 + R() * 0.03, b, 0.001); }
      return 1.2;
    },
    boomfar: function (t, b, R) {
      noise(t, 1.6, 0.55, 'lowpass', 380, 0.8, 60, b); osc('sine', 62, 26, t, 1.3, 0.55, b, 0.01); noise(t + 0.4, 2, 0.16, 'lowpass', 240, 0.6, 60, b); return 2.8;
    },
    // a church bell somewhere in the ruins, still swinging
    bellfar: function (t, b, R) { var n = 2 + Math.floor(R() * 3), f = 200 + R() * 60; for (var i = 0; i < n; i++) bell(t + i * 1.7, f, 0.09, 4, b); return n * 1.7 + 3.5; },
    // the emergency broadcast tone from a radio left on in a car
    eas: function (t, b, R) { var lp = flt('lowpass', 1500, 0.7, b), d = 1.2 + R() * 0.8; hold('sine', 853, 853, t, d, 0.05, lp, 0.02, 0.05); hold('sine', 960, 960, t, d, 0.05, lp, 0.02, 0.05); noise(t, d, 0.03, 'bandpass', 1800, 0.6, null, lp); return d + 0.3; },
    // a long way off, a lot of them
    moan: function (t, b, R) {
      var bp = flt('bandpass', 480, 3, b), v = 1 + Math.floor(R() * 3);
      for (var i = 0; i < v; i++) { var f = 100 + R() * 50, s = t + i * (0.3 + R() * 0.5), d = 1.4 + R() * 0.8; glide('sawtooth', [[0, f], [d * 0.4, f * 1.12], [d, f * 0.85]], s, 0.12, bp, 3, 4 + R() * 2); }
      return 3.4;
    },
    coyote: function (t, b, R) {
      var f = 0.9 + R() * 0.25; glide('sine', [[0, 520 * f], [0.5, 1150 * f], [1.2, 1000 * f], [1.8, 700 * f]], t, 0.07, b, 18, 6);
      var tt = t + 2; for (var i = 0; i < 3 + Math.floor(R() * 3); i++) { osc('sine', 900 * f, 1300 * f, tt, 0.08, 0.05, b, 0.005); tt += 0.12 + R() * 0.1; }
      return tt - t + 0.3;
    },
    hawk: function (t, b, R) {
      var bp = flt('bandpass', 2600, 2, b); hold('sawtooth', 3200, 2100, t, 0.9, 0.06, bp, 0.04, 0.4); noise(t, 0.9, 0.04, 'bandpass', 3000, 3, 2000, b);
      if (R() < 0.5) hold('sawtooth', 3000, 2200, t + 1.2, 0.6, 0.04, bp, 0.04, 0.3); return 2;
    },
    // a rattlesnake under a rock close by
    rattle: function (t, b, R) { var n = 50 + Math.floor(R() * 30); for (var i = 0; i < n; i++) noise(t + i / 46, 0.012, 0.06 * Math.sin(Math.PI * i / n), 'highpass', 5200, 0.7, null, b); return n / 46 + 0.2; },
    wolf: function (t, b, R) {
      var f = 0.9 + R() * 0.2; glide('sine', [[0, 380 * f], [0.6, 720 * f], [2.2, 680 * f], [3, 500 * f]], t, 0.08, b, 9, 5);
      if (R() < 0.6) glide('sine', [[0, 420 * f], [0.7, 820 * f], [2, 760 * f], [2.6, 560 * f]], t + 0.9, 0.05, b, 11, 5.5);
      return 4;
    },
    // lake ice cracking with that ringing zing
    ice: function (t, b, R) { noise(t, 0.015, 0.35, 'highpass', 2500, 0.7, null, b); osc('sine', 2400, 280, t + 0.01, 0.55, 0.06, b, 0.001); osc('sine', 1600, 200, t + 0.05, 0.65, 0.04, b, 0.001); osc('sine', 90, 40, t, 0.6, 0.15, b, 0.005); return 1; },
    branch: function (t, b, R) { noise(t, 0.012, 0.5, 'bandpass', 2200, 1.2, null, b); for (var i = 0; i < 5; i++) noise(t + 0.02 + R() * 0.12, 0.008, 0.15, 'bandpass', 1500 + R() * 2000, 2, null, b); noise(t + 0.5 + R() * 0.3, 0.3, 0.12, 'lowpass', 500, 0.7, 200, b); return 1.2; },
    frog: function (t, b, R) { var n = 3 + Math.floor(R() * 5), f = 160 + R() * 80; for (var i = 0; i < n; i++) { var tt = t + i * (0.35 + R() * 0.1); for (var k = 0; k < 4; k++) osc('square', f, f * 0.9, tt + k * 0.025, 0.02, 0.03, b, 0.002); } return n * 0.45 + 0.3; },
    // gusts: leaves rushing in the trees, sand hissing past, a loose sign rattling
    leaves: function (t, b, R) { var d = 1.4 + R(); swell(t, d, 0.12, 'bandpass', 3200, 0.5, b); swell(t + 0.2, d * 0.8, 0.07, 'highpass', 5000, 0.7, b); return d + 0.2; },
    sandgust: function (t, b, R) { var d = 1.3 + R(); swell(t, d, 0.14, 'highpass', 3500, 0.7, b); return d + 0.2; },
    snowgust: function (t, b, R) { var d = 1.5 + R(); swell(t, d, 0.1, 'bandpass', 1800, 0.6, b); return d + 0.2; },
    clatter: function (t, b, R) { var n = 6 + Math.floor(R() * 8); for (var i = 0; i < n; i++) noise(t + i * 0.07 + R() * 0.03, 0.02, 0.08, 'bandpass', 900 + R() * 700, 4, null, b); if (R() < 0.5) bell(t + 0.1, 340 + R() * 80, 0.03, 0.6, b); return n * 0.09 + 0.6; }
  };
  var aevN = 0;
  // pan: -1 left to 1 right; vol 0 to 1; far 0 (close) to 1 (very far, dull); sweep: the pan swings across while it plays
  function ambEvent(kind, pan, vol, far, sweep) {
    if (!ok() || !AEV[kind] || aevN > 6 || (AQ < 1 && kind === 'heli')) return;
    var t = ac.currentTime + 0.02, g = ac.createGain(), lp = ac.createBiquadFilter(), out = g, pn = null;
    g.gain.value = Math.max(0, Math.min(1, vol == null ? 0.6 : vol)); lp.type = 'lowpass'; lp.frequency.value = 9000 - Math.max(0, Math.min(1, far || 0)) * 7800; lp.Q.value = 0.5;
    g.connect(lp);
    if (ac.createStereoPanner) { pn = ac.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, pan || 0)); lp.connect(pn); pn.connect(ambBus); } else lp.connect(ambBus);
    var dur = 3; try { dur = AEV[kind](t, out, Math.random) || 3; } catch (e) { }
    if (pn && sweep) { pn.pan.setValueAtTime(pn.pan.value, t); pn.pan.linearRampToValueAtTime(Math.max(-1, Math.min(1, -(pan || 0))), t + dur); }
    aevN++; setTimeout(function () { aevN--; try { g.disconnect(); lp.disconnect(); if (pn) pn.disconnect(); } catch (e) { } }, (dur + 0.5) * 1000);
  }
  var api2 = {
    shot: gunShot,
    ambEvent: ambEvent,
    setVolumes: function (v) { for (var k in v) VOL[k] = v[k]; applyVol(); radioApi.setVolume(VOL.music * VOL.master); },
    setMix: function (m) { for (var k in m) MIX[k] = m[k]; applyMix(); radioApi.setMono(MIX.mono); },
    // the gun echo follows the district you are standing in
    setEnv: function (bio) {
      if (!gunEnv || gunEnv.bio === bio) return; gunEnv.bio = bio; var e = ENVK[bio] || ENVK.city, t = ac.currentTime;
      gunEnv.g1.gain.setTargetAtTime(e[0], t, 0.4); gunEnv.g2.gain.setTargetAtTime(e[1], t, 0.4); if (gunConv) gunConv.wg.gain.setTargetAtTime(e[2], t, 0.4);
    },
    amb: function (lv) { if (ac) ambSet(lv); },
    thunder: function (delay, close) {
      if (!ok()) return; var t = ac.currentTime + (delay || 0);
      var name = close ? 'thunderC' + Math.floor(Math.random() * 3) : 'thunderF';
      if (!play(name, t, close ? 0.95 : 0.55 + Math.random() * 0.3, 0.9 + Math.random() * 0.2, close ? sfxBus : ambBus)) { if (close) noise(t, 0.4, 0.5, 'lowpass', 900, 0.7, 120); noise(t, 2.5, 0.3, 'lowpass', 300, 0.8, 60, ambBus); }
    },
    static: function () { if (!ok()) return; play('static', ac.currentTime, 0.8, 1, sfxBus); },
    rustle: function (v, dry) { if (!ok() || !throttle('rustle', 110)) return; play(dry ? 'rustleD' : 'rustleA', ac.currentTime, 0.5 * (v || 1), 0.9 + Math.random() * 0.2, sfxBus); },
    flap: function (big) { if (!ok() || !throttle('flap', 300)) return; play(big ? 'flapB' : 'flap', ac.currentTime, 0.7, 0.9 + Math.random() * 0.2, ambBus); },
    splash: function (v) { if (!ok() || !throttle('splash', 250)) return; play('splash', ac.currentTime, 0.7 * (v || 1), 0.9 + Math.random() * 0.2, sfxBus); },
    propHit: function (k) { if (!ok() || !throttle('prop' + k, 70)) return; play('p_' + k, ac.currentTime, 0.7, 0.9 + Math.random() * 0.2, sfxBus); },
    step: function (s) { if (!ok() || !throttle('step', 140)) return; play('st_' + s + (Math.random() < 0.5 ? 0 : 1), ac.currentTime, 0.75, 0.92 + Math.random() * 0.16, sfxBus); },
    // a horde coming: the rumble of hundreds of feet and a rising chorus of moans from one side (bigger, louder, longer)
    horde: function (pan, n) {
      if (!ok() || !throttle('horde', 3000)) return;
      var t = ac.currentTime + 0.05, k = Math.min(1, Math.log(1 + (n || 20)) / Math.log(400)), dur = 2.6 + k * 2.4, out = ac.createGain(); out.gain.value = 0.55 + k * 0.45;
      if (ac.createStereoPanner) { var pn = ac.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, (pan || 0) * 0.8)); out.connect(pn); pn.connect(sfxBus); } else out.connect(sfxBus);
      var src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(), am = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
      src.buffer = noiseBuf; src.loop = true; fl.type = 'lowpass'; fl.frequency.value = 170; fl.Q.value = 1;
      lfo.type = 'triangle'; lfo.frequency.value = 5.5 + Math.random() * 2; lg.gain.value = 0.45; lfo.connect(lg); lg.connect(am.gain); am.gain.value = 0.6;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9 * (0.5 + k * 0.5), t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(fl); fl.connect(am); am.connect(g); g.connect(out); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.1); lfo.start(t); lfo.stop(t + dur + 0.1);
      var F = [[420, 5], [780, 6], [2100, 8]], nv = Math.round(10 + k * 22);
      for (var i = 0; i < nv; i++) { var tt = t + dur * (0.15 + Math.random() * 0.7), f = 64 + Math.random() * 80; voice(tt, f * 1.25, f * 0.72, 0.5 + Math.random() * 0.7, (0.03 + Math.random() * 0.035) * (0.6 + k * 0.4), F, out); }
      setTimeout(function () { try { out.disconnect(); } catch (e) { } }, (dur + 1) * 1000);
    },
    // a vehicle being shoved across the road: tyres and steel scraping on asphalt
    scrape: function (vol, pan) {
      if (!ok() || !throttle('scrape', 300)) return;
      var t = ac.currentTime, out = ac.createGain(); out.gain.value = Math.max(0, Math.min(1, vol || 0.5)) * 0.5;
      if (ac.createStereoPanner) { var pn = ac.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, pan || 0)); out.connect(pn); pn.connect(sfxBus); } else out.connect(sfxBus);
      noise(t, 0.38, 0.22, 'bandpass', 1400 + Math.random() * 900, 3, 900, out); noise(t, 0.3, 0.16, 'lowpass', 260, 1, 120, out);
      if (Math.random() < 0.35) osc('triangle', 380 + Math.random() * 300, 300, t + 0.05, 0.25, 0.03, out);
      setTimeout(function () { try { out.disconnect(); } catch (e) { } }, 900);
    },
    // a head shot that kills: a sharp wet crack over a short low knock (the thing the ear waits for)
    headshot: function (pan) {
      if (!ok() || !throttle('hs', 60)) return;
      var t = ac.currentTime, out = ac.createGain(); out.gain.value = 0.34;
      if (ac.createStereoPanner) { var pn = ac.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, pan || 0)); out.connect(pn); pn.connect(sfxBus); } else out.connect(sfxBus);
      noise(t, 0.035, 0.55, 'bandpass', 1900 + Math.random() * 500, 1.6, 1400, out); noise(t + 0.01, 0.09, 0.28, 'lowpass', 900, 0.8, 300, out);
      osc('sine', 110, 42, t, 0.11, 0.3, out); osc('triangle', 3200, 2400, t, 0.03, 0.05, out);
      setTimeout(function () { try { out.disconnect(); } catch (e) { } }, 500);
    },
    // the wave clock's last five seconds: a hard steel tick, higher and with a low thud on the last one
    countTick: function (n) {
      if (!ok() || !throttle('ctick', 400)) return;
      var t = ac.currentTime, out = ac.createGain(), last = n <= 1; out.gain.value = last ? 0.42 : 0.3; out.connect(sfxBus);
      noise(t, 0.025, 0.6, 'bandpass', last ? 3600 : 2800, 6, last ? 3000 : 2400, out);
      osc('square', last ? 1320 : 990, last ? 1320 : 990, t, 0.06, 0.05, out);
      osc('sine', last ? 88 : 70, 40, t, last ? 0.32 : 0.16, last ? 0.5 : 0.25, out);
      setTimeout(function () { try { out.disconnect(); } catch (e) { } }, 600);
    },
    // the clock ran out with zombies still on the street: a rising siren under the next wave's drums
    timeUp: function () {
      if (!ok() || !throttle('tup', 1500)) return;
      var t = ac.currentTime, out = ac.createGain(); out.gain.value = 0.3; out.connect(sfxBus);
      osc('sawtooth', 220, 660, t, 0.9, 0.11, out); osc('sawtooth', 223, 664, t + 0.02, 0.9, 0.09, out);
      osc('sine', 55, 44, t, 1.1, 0.4, out); noise(t, 0.6, 0.12, 'bandpass', 700, 2, 1600, out);
      setTimeout(function () { try { out.disconnect(); } catch (e) { } }, 1500);
    },
    // a round skipping off a wall or a helmet: the classic falling whine with a sharp crack at its start
    ricochet: function () {
      if (!ok() || !throttle('ric', 120)) return;
      var t = ac.currentTime, out = ac.createGain(); out.gain.value = 0.22;
      out.connect(sfxBus);
      noise(t, 0.04, 0.5, 'highpass', 2600, 1, 2600, out);
      var f0 = 2600 + Math.random() * 1600; osc('sine', f0, f0 * 0.42, t + 0.01, 0.28 + Math.random() * 0.12, 0.12, out); osc('triangle', f0 * 1.5, f0 * 0.6, t + 0.01, 0.18, 0.04, out);
      setTimeout(function () { try { out.disconnect(); } catch (e) { } }, 700);
    },
    carAlarm: function (hi, vol, pan) {
      if (!ok()) return; var t = ac.currentTime, g = ac.createGain(); g.gain.value = 0.06 * vol;
      if (ac.createStereoPanner) { var p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan || 0)); g.connect(p); p.connect(sfxBus); } else g.connect(sfxBus);
      osc('square', hi ? 1250 : 880, hi ? 1250 : 880, t, 0.32, 1, g, 0.005); setTimeout(function () { try { g.disconnect(); } catch (e) { } }, 600);
    }
  };
