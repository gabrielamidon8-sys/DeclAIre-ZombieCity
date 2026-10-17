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
  var AMB = null, ambLv = { rain: 0, wind: 0, river: 0, fire: 0, ash: 0 }, ambIdle = 0, crackT = 0;
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
    AMB = {
      rain: mk(white, [f('highpass', 900), f('lowpass', 7500), f('peaking', 3200, 0.7)]),
      wind: mk(brown, [windBp, f('lowpass', 1400)]),
      river: mk(brown, [river, f('lowpass', 1500)]),
      fire: mk(brown, [f('lowpass', 420)]),
      ash: mk(brown, [f('bandpass', 260, 0.6)]),
      lfos: [wl, rl]
    };
  }
  function ambStop() {
    if (!AMB) return; var a = AMB; AMB = null;
    ['rain', 'wind', 'river', 'fire', 'ash'].forEach(function (k) { try { a[k].s.stop(); a[k].g.disconnect(); } catch (e) { } });
    a.lfos.forEach(function (o) { try { o.stop(); } catch (e) { } });
  }
  var AMAX = { rain: 0.34, wind: 0.42, river: 0.3, fire: 0.3, ash: 0.18 };
  function ambSet(lv) {
    if (!ac || ac.state !== 'running') return;
    var any = false;
    for (var k in ambLv) { var v = lv && sfxOn ? Math.max(0, Math.min(1, lv[k] || 0)) : 0; ambLv[k] = v; if (v > 0.01) any = true; }
    if (any) { ambIdle = 0; ambStart(); } else if (AMB && ++ambIdle > 600) { ambStop(); return; }
    if (!AMB) return;
    var t = ac.currentTime;
    for (var k2 in ambLv) { var g = AMB[k2].g.gain, tgt = ambLv[k2] * AMAX[k2]; if (Math.abs(g.value - tgt) > 0.004) g.setTargetAtTime(tgt, t, 0.5); }
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
  var api2 = {
    shot: gunShot,
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
    carAlarm: function (hi, vol, pan) {
      if (!ok()) return; var t = ac.currentTime, g = ac.createGain(); g.gain.value = 0.06 * vol;
      if (ac.createStereoPanner) { var p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan || 0)); g.connect(p); p.connect(sfxBus); } else g.connect(sfxBus);
      osc('square', hi ? 1250 : 880, hi ? 1250 : 880, t, 0.32, 1, g, 0.005); setTimeout(function () { try { g.disconnect(); } catch (e) { } }, 600);
    }
  };
