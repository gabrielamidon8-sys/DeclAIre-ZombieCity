/* Zombie City — sound. Everything is synthesized with the Web Audio API, so there are no audio files.
   Two separate engines: the game's effects (gunfire, kills, bosses, the studio intro) on one AudioContext, and
   the music on another — the radio, FM 66.6 (see the radio section): 7 channels of 35 generated songs each, or
   "Bluetooth", the player's own songs. The music never reacts to the game, so a heavy moment can't make it skip
   or go quiet. SFX.viz() reports the music's beats and spectrum for the light show. */
var SFX = (function () {
  'use strict';
  var ac = null, master = null, sfxBus = null, musBus = null, noiseBuf = null, loudBus = null;
  var onAn = null, onSpec = null, onPrev = null, BANK = {}, BAKING = false, sfxComp = null, musComp = null;
  var synthBus = null, drumBus = null, revIn = null, dlyIn = null, dly = null, distIn = null, bellBus = null;
  var gtrIn = null, leadIn = null, pulse25 = null;
  var SHAPERS = [], AQ = 2, HB = { ct: -1, stuck: 0 }, rebuilds = 0;   // audio quality level and the self-repair heartbeat
  var sfxOn = true, last = {}, lateN = 0, scene = 'title', BPM = 120, STEP = 60 / BPM / 4, TR = 0, song = null;

  // what the music is doing right now, for the visualizer
  var evq = [], spec = null, lastKick = -9, lastKickEv = -9, lastSnare = -9, lastHat = -9, lastBeat = -9, lastBar = -9, lastImpact = -9, bi = 0, onsetAvg = 0, lastOnset = -9;
  var VIZ = { kick: 0, snare: 0, hat: 0, beat: 0, bar: 0, impact: 0, bass: 0, mid: 0, high: 0, kickN: 0, beatN: 0, beats: [-9, -9, -9, -9], now: 0, tBar: 9, tImpact: 9, spec: null, bpm: 0, live: false };

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function mf(m) { return mtof(m + TR); }
  function ready() { return !!ac && ac.state === 'running'; }
  function ok() { return ready() && sfxOn; }
  function throttle(k, ms) { var t = performance.now(); if (last[k] && t - last[k] < ms) return false; last[k] = t; return true; }

  function init() {
    // every tap and key press comes through here: it wakes both engines if the phone put them to sleep
    if (ac) {
      if (ac.state === 'suspended') ac.resume().catch(function () {});
      if (!RD.ctx) { rCreate(); if (RD.on) rStart(); } else if (RD.ctx.state === 'suspended' && !document.hidden) RD.ctx.resume().catch(function () {});
      return;
    }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ac = new AC(); } catch (e) { ac = null; return; }
    // effects and the intro's score each get their own compressor; both meet in a soft clipper that rounds off peaks
    sfxComp = ac.createDynamicsCompressor(); musComp = ac.createDynamicsCompressor();
    sfxComp.threshold.value = -14; sfxComp.knee.value = 8; sfxComp.ratio.value = 6; sfxComp.attack.value = 0.002; sfxComp.release.value = 0.12;
    musComp.threshold.value = -15; musComp.knee.value = 10; musComp.ratio.value = 3; musComp.attack.value = 0.006; musComp.release.value = 0.2;
    var mix = ac.createGain(); mix.gain.value = 0.5;
    var clip = ac.createWaveShaper(); clip.curve = softClip(); clip.oversample = AQ >= 1 ? '2x' : 'none'; SHAPERS = [clip];
    // the phone adds this engine and the radio together, so this one leaves the radio some headroom
    master = ac.createGain(); master.gain.value = 0.86;
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.85;
    musBus = ac.createGain(); musBus.gain.value = 0;
    sfxBus.connect(sfxComp); sfxComp.connect(mix);
    musBus.connect(musComp); musComp.connect(mix);
    // the A-10's cannon and engines skip the effects compressor so they hit at full size (the clipper still rounds them off)
    loudBus = ac.createGain(); loudBus.gain.value = 0.8; loudBus.connect(mix);
    mix.connect(clip); clip.connect(master); master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 1.5), ac.sampleRate);
    var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    synthBus = ac.createGain(); synthBus.connect(musBus);
    drumBus = ac.createGain(); drumBus.gain.value = 0.9; drumBus.connect(musBus);
    var conv = ac.createConvolver(); conv.buffer = impulse(2.6);
    revIn = ac.createGain(); var revOut = ac.createGain(); revOut.gain.value = 0.3;
    revIn.connect(conv); conv.connect(revOut); revOut.connect(musBus);
    dlyIn = ac.createGain(); dly = ac.createDelay(1.5); dly.delayTime.value = STEP * 3;
    var fb = ac.createGain(), dlp = ac.createBiquadFilter(), dOut = ac.createGain();
    fb.gain.value = 0.36; dlp.type = 'lowpass'; dlp.frequency.value = 3200; dOut.gain.value = 0.26;
    dlyIn.connect(dly); dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(dOut); dOut.connect(musBus);
    distIn = ac.createWaveShaper(); distIn.curve = distCurve(60); distIn.oversample = AQ >= 1 ? '2x' : 'none'; SHAPERS.push(distIn);
    var distOut = ac.createGain(); distOut.gain.value = 0.3; distIn.connect(distOut); distOut.connect(drumBus);
    bellBus = ac.createGain(); bellBus.connect(musBus); bellBus.connect(revIn);
    // guitar amps: rhythm (chugs, power chords) and lead, each its own drive so chords and solos stay clean of each other
    gtrIn = amp(7, 90, 4600, 0.14, 0.12);
    leadIn = amp(5, 160, 5200, 0.1, 0.32, true);
    // 25% pulse wave for chiptune
    var n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (var k = 1; k < n; k++) re[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * 0.25);
    pulse25 = ac.createPeriodicWave(re, im);
    setTimeout(bakeAll, 60);
    introLevel();
    if (!RD.ctx) rCreate();
    if (RD.on) rStart();
  }
  // the studio intro's score plays on the effects engine; it follows the radio's mute and off switch
  function introLevel() { if (!ac) return; musBus.gain.cancelScheduledValues(ac.currentTime); musBus.gain.setTargetAtTime(RD.mode === 'off' || RD.muted ? 0 : 0.5, ac.currentTime, 0.05); }
  function amp(drive, hp, lp, vol, rev, delay) {
    var input = ac.createGain(), pre = ac.createGain(), sh = ac.createWaveShaper(), h = ac.createBiquadFilter(), pk = ac.createBiquadFilter(), l = ac.createBiquadFilter(), out = ac.createGain();
    pre.gain.value = drive; sh.curve = distCurve(90); sh.oversample = AQ >= 1 ? '2x' : 'none'; SHAPERS.push(sh);
    h.type = 'highpass'; h.frequency.value = hp; pk.type = 'peaking'; pk.frequency.value = 1900; pk.gain.value = 4; pk.Q.value = 0.8;
    l.type = 'lowpass'; l.frequency.value = lp; out.gain.value = vol;
    input.connect(pre); pre.connect(sh); sh.connect(h); h.connect(pk); pk.connect(l); l.connect(out); out.connect(musBus);
    var rs = ac.createGain(); rs.gain.value = rev; out.connect(rs); rs.connect(revIn);
    if (delay) { var ds = ac.createGain(); ds.gain.value = 0.22; out.connect(ds); ds.connect(dlyIn); }
    return input;
  }
  function impulse(sec) {
    var n = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(2, n, ac.sampleRate);
    for (var c = 0; c < 2; c++) { var d = b.getChannelData(c); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.8); }
    return b;
  }
  function softClip() { var n = 2048, c = new Float32Array(n); for (var i = 0; i < n; i++) { var u = i * 2 / (n - 1) - 1; c[i] = Math.tanh(2 * u); } return c; }
  function distCurve(k) { var n = 1024, c = new Float32Array(n); for (var i = 0; i < n; i++) { var x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); } return c; }

  // ---------- building blocks (effects) ----------
  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
  }
  function osc(type, f0, f1, t, dur, vol, bus, a) {
    a = a || 0.003;
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    env(g, t, a, vol, dur); o.connect(g); g.connect(bus || sfxBus);
    o.start(t); o.stop(t + a + dur + 0.05);
  }
  function noise(t, dur, vol, ftype, f, q, f1, bus) {
    var s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.loop = true; fl.type = ftype || 'bandpass'; fl.frequency.setValueAtTime(f || 1000, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    fl.Q.value = q || 1; env(g, t, 0.002, vol, dur);
    s.connect(fl); fl.connect(g); g.connect(bus || sfxBus);
    s.start(t, Math.random() * 0.4); s.stop(t + dur + 0.05);
  }
  // metallic "ching": inharmonic partials of a struck bell
  function bell(t, f, vol, dur, bus) {
    [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]].forEach(function (p) {
      osc('sine', f * p[0], f * p[0], t, dur / Math.pow(p[0], 0.35), vol * p[1], bus, 0.002);
    });
  }
  function drum(t, f, vol) { osc('sine', f * 2.4, f, t, 0.55, vol, null, 0.002); noise(t, 0.09, vol * 0.45, 'lowpass', 500); }
  function horn(t, freqs, dur, vol) {
    freqs.forEach(function (f) {
      [0.995, 1.005].forEach(function (dt) {
        var o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain(), v = vol / freqs.length;
        o.type = 'sawtooth'; o.frequency.value = f * dt; fl.type = 'lowpass';
        fl.frequency.setValueAtTime(180, t); fl.frequency.linearRampToValueAtTime(1700, t + dur * 0.3); fl.frequency.linearRampToValueAtTime(380, t + dur);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.22); g.gain.linearRampToValueAtTime(v * 0.7, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(fl); fl.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.1);
      });
    });
  }
  // formant voice burst, for the skull's laugh and roars
  function voice(t, f0, f1, dur, vol, formants, bus) {
    var o = ac.createOscillator(), mix = ac.createGain(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    o.connect(mix); mix.gain.value = 1;
    formants.forEach(function (fm) { var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fm[0]; bp.Q.value = fm[1]; mix.connect(bp); bp.connect(g); });
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.setValueAtTime(vol, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }

  // ---------- music voices ----------
  // E: gain envelope into dest (+ optional send); O: oscillator; LP: lowpass; N: filtered noise
  function E(t, a, peak, hold, rel, dest, send, sendAmt) {
    var gn = ac.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(peak, t + a);
    if (hold > 0) gn.gain.setValueAtTime(peak, t + a + hold);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + a + Math.max(0, hold) + rel);
    gn.connect(dest);
    if (send) { if (sendAmt && sendAmt !== 1) { var sg = ac.createGain(); sg.gain.value = sendAmt; gn.connect(sg); sg.connect(send); } else gn.connect(send); }
    return gn;
  }
  function O(type, f, t, end, dest, det) { var o = ac.createOscillator(); if (type === 'pulse') o.setPeriodicWave(pulse25); else o.type = type; o.frequency.setValueAtTime(f, t); if (det) o.detune.value = det; o.connect(dest); o.start(t); o.stop(end); return o; }
  function LP(f, q, dest) { var fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = f; fl.Q.value = q || 0.7; fl.connect(dest); return fl; }
  function N(t, dur, vol, type, f, q, f1, dest, rev) {
    var s = ac.createBufferSource(), fl = ac.createBiquadFilter(); s.buffer = noiseBuf; s.loop = true;
    fl.type = type; fl.frequency.setValueAtTime(f, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur); fl.Q.value = q || 0.8;
    var gn = E(t, 0.002, vol, 0, dur, dest, rev ? revIn : null, rev); s.connect(fl); fl.connect(gn); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  function ev(t, k) {
    if (RENDER) { RENDER.ev.push([t, k]); return; }
    if (BAKING) return;
    if (k === 'kick') { if (t - lastKickEv < 0.11) return; lastKickEv = t; }
    evq.push([t, k]); if (evq.length > 400) evq.splice(0, 100);
  }
  // sidechain: synths dip on every kick in the electronic songs
  function duck(t, gap) { if (BAKING || !song || !song.duck) return; var p = synthBus.gain; p.cancelScheduledValues(t); p.setValueAtTime(0.28, t); p.linearRampToValueAtTime(1, t + Math.min(0.24, gap * 0.85)); }

  // drums: each one is rendered once into a sample at startup and replayed; the live versions are the fallback
  function play(name, t, vol, rate, dest, stopAt, send, ret) {
    var b = BANK[name]; if (!b || BAKING) return false;
    var src = ac.createBufferSource(), g = ac.createGain(), v = vol == null ? 1 : vol; src.buffer = b;
    if (rate && rate !== 1) src.playbackRate.value = rate;
    g.gain.value = v; src.connect(g); g.connect(dest || drumBus);
    if (send && revIn) { var sg = ac.createGain(); sg.gain.value = send; g.connect(sg); sg.connect(revIn); }
    src.start(t);
    if (stopAt) { g.gain.setValueAtTime(v, Math.max(t, stopAt - 0.015)); g.gain.linearRampToValueAtTime(0.0001, stopAt); src.stop(stopAt + 0.02); }
    return ret ? { s: src, g: g } : true;
  }
  // kill sounds that are still ringing: past 14, the oldest fades out
  var KQ = [];
  function kq(v) {
    if (!v || v === true) return; KQ.push(v);
    v.s.onended = function () { var i = KQ.indexOf(v); if (i >= 0) KQ.splice(i, 1); try { v.g.disconnect(); } catch (e) { } };
    while (KQ.length > 14) { var o = KQ.shift(), t = ac.currentTime; try { o.g.gain.cancelScheduledValues(t); o.g.gain.setValueAtTime(o.g.gain.value, t); o.g.gain.linearRampToValueAtTime(0.0001, t + 0.12); o.s.stop(t + 0.15); } catch (e) { } }
  }
  function lKick(t, len) {
    O('sine', 165, t, t + len + 0.05, E(t, 0.002, 0.95, 0, len, drumBus)).frequency.exponentialRampToValueAtTime(46, t + Math.min(0.12, len * 0.6));
    O('square', 1200, t, t + 0.03, E(t, 0.001, 0.07, 0, 0.012, drumBus)).frequency.exponentialRampToValueAtTime(220, t + 0.012);
  }
  function lK808(t, f, len) { O('sine', f * 2.2, t, t + len + 0.05, E(t, 0.002, 0.9, len * 0.3, len * 0.7, drumBus)).frequency.exponentialRampToValueAtTime(f, t + 0.07); N(t, 0.012, 0.25, 'highpass', 3000, 0.7, null, drumBus); }
  function lKHard(t, len) { O('sine', 210, t, t + len + 0.05, E(t, 0.002, 2.4, len * 0.45, len * 0.55, distIn)).frequency.exponentialRampToValueAtTime(48, t + Math.min(0.16, len * 0.5)); N(t, 0.015, 0.25, 'highpass', 2500, 0.7, null, drumBus); }
  function lGabber(t, len) { O('triangle', 240, t, t + len + 0.05, E(t, 0.002, 2.6, len * 0.35, len * 0.65, distIn)).frequency.exponentialRampToValueAtTime(52, t + Math.min(0.14, len * 0.55)); N(t, 0.02, 0.22, 'highpass', 3000, 0.7, null, drumBus); }
  function lKMetal(t, vol) { O('sine', 150, t, t + 0.16, E(t, 0.001, vol, 0, 0.12, drumBus)).frequency.exponentialRampToValueAtTime(52, t + 0.05); N(t, 0.012, vol * 0.4, 'highpass', 3500, 0.7, null, drumBus); }
  function lClap(t, vol) { for (var k = 0; k < 3; k++) N(t + k * 0.011, 0.018, vol, 'bandpass', 1300, 1.1, null, drumBus); N(t + 0.033, 0.18, vol * 0.85, 'bandpass', 1150, 0.9, null, drumBus, 0.6); }
  function lSnare(t, vol, p) { N(t, 0.13, vol, 'bandpass', 1900 * p, 0.7, null, drumBus, 0.25); O('triangle', 220 * p, t, t + 0.12, E(t, 0.001, vol * 0.6, 0, 0.08, drumBus)).frequency.exponentialRampToValueAtTime(150 * p, t + 0.08); }
  function lSnareA(t, vol) { N(t, 0.2, vol, 'bandpass', 2400, 0.55, null, drumBus, 0.35); N(t, 0.06, vol * 0.5, 'highpass', 5000, 0.7, null, drumBus); O('triangle', 205, t, t + 0.12, E(t, 0.001, vol * 0.7, 0, 0.09, drumBus)).frequency.exponentialRampToValueAtTime(165, t + 0.09); }
  function lSnareG(t, vol) { N(t, 0.26, vol, 'bandpass', 1700, 0.6, null, drumBus, 0.9); O('triangle', 190, t, t + 0.14, E(t, 0.001, vol * 0.6, 0, 0.1, drumBus)); }
  function lHat(t, open, vol) { N(t, open ? 0.13 : 0.028, vol, 'highpass', open ? 7200 : 9500, 0.7, null, drumBus); }
  function lRide(t, vol) { N(t, 0.42, vol, 'highpass', 6200, 0.6, null, drumBus); O('square', 3400, t, t + 0.3, E(t, 0.001, vol * 0.18, 0, 0.25, drumBus)); }
  function lCrash(t, vol) { N(t, 1.7, vol, 'highpass', 4500, 0.5, null, drumBus, 0.5); N(t, 0.6, vol * 0.6, 'bandpass', 8000, 0.7, null, drumBus); }
  function lChina(t, vol) { N(t, 1, vol, 'bandpass', 3600, 0.8, 2400, drumBus, 0.3); N(t, 0.35, vol * 0.7, 'highpass', 7000, 0.7, null, drumBus); }
  function lTom(t, f) { O('sine', f * 1.7, t, t + 0.3, E(t, 0.002, 0.4, 0, 0.24, drumBus, revIn, 0.3)).frequency.exponentialRampToValueAtTime(f, t + 0.16); }
  function lTimp(t, f, vol) { O('sine', f * 1.04, t, t + 1.3, E(t, 0.003, vol, 0, 1.15, drumBus, revIn, 0.45)).frequency.exponentialRampToValueAtTime(f, t + 0.15); N(t, 0.35, vol * 0.3, 'lowpass', 500, 0.7, null, drumBus); }
  function lShaker(t, vol) { N(t, 0.035, vol, 'bandpass', 6500, 1.6, null, drumBus); }
  function lAnvil(t, vol) { bell(t, 2350, vol, 0.35, drumBus); N(t, 0.05, vol * 2.4, 'highpass', 4000, 0.7, null, drumBus); }
  function lHeart(t, vol) { O('sine', 58, t, t + 0.25, E(t, 0.004, vol, 0, 0.2, drumBus)); O('sine', 52, t + 0.17, t + 0.45, E(t + 0.17, 0.004, vol * 0.7, 0, 0.22, drumBus)); }
  function lChip(t, snare) { N(t, snare ? 0.09 : 0.05, snare ? 0.16 : 0.22, snare ? 'highpass' : 'lowpass', snare ? 2500 : 400, 0.6, null, drumBus); if (!snare) O('triangle', 180, t, t + 0.08, E(t, 0.001, 0.5, 0, 0.06, drumBus)).frequency.exponentialRampToValueAtTime(50, t + 0.06); }
  var TIMP_BASE = 50, F808 = 31;
  function vKick(t, len, gap) { len = len || 0.4; if (!play('kick', t, 1, 1, drumBus, len < 0.41 ? t + len : 0)) lKick(t, len); duck(t, gap || STEP * 4); ev(t, 'kick'); }
  function vK808(t, m, len) { len = len || 0.7; var f = mf(m || F808); if (!play('k808', t, 1, f / mtof(F808), drumBus, len < 0.69 ? t + len : 0)) lK808(t, f, len); duck(t, STEP * 4); ev(t, 'kick'); }
  function vKHard(t, len) { len = Math.min(len || 0.32, STEP * 3.8); if (!play('khard', t, 1, 1, drumBus, len < 0.39 ? t + len : 0)) lKHard(t, len); duck(t, STEP * 4); ev(t, 'kick'); }
  function vGabber(t, len, gap) { len = Math.min(len || 0.3, (gap || STEP * 4) * 0.95); if (!play('gabber', t, 1, 1, drumBus, len < 0.29 ? t + len : 0)) lGabber(t, len); duck(t, gap || STEP * 4); ev(t, 'kick'); }
  function vKMetal(t, vol) { vol = vol || 0.75; if (!play('kmetal', t, vol)) lKMetal(t, vol); ev(t, 'kick'); }
  function vClap(t, vol) { if (!play('clap', t, vol, 1, drumBus, 0, 0.35)) lClap(t, vol); ev(t, 'snare'); }
  function vSnare(t, vol, p) { p = p || 1; if (!play('snare', t, vol, p, drumBus, 0, 0.25)) lSnare(t, vol, p); if (vol > 0.12) ev(t, 'snare'); }
  function vSnareA(t, vol) { if (!play('snareA', t, vol, 1, drumBus, 0, 0.35)) lSnareA(t, vol); if (vol > 0.12) ev(t, 'snare'); }
  function vSnareG(t, vol) { if (!play('snareG', t, vol, 1, drumBus, 0, 0.9)) lSnareG(t, vol); ev(t, 'snare'); }
  function vHat(t, open, vol) { if (!play(open ? 'hatO' : 'hatC', t, vol)) lHat(t, open, vol); if (open) ev(t, 'hat'); }
  function vRide(t, vol) { if (!play('ride', t, vol)) lRide(t, vol); }
  function vCrash(t, vol) { vol = vol || 0.13; if (!play('crash', t, vol, 1, drumBus, 0, 0.5)) lCrash(t, vol); }
  function vChina(t) { if (!play('china', t, 0.13, 1, drumBus, 0, 0.3)) lChina(t, 0.13); ev(t, 'snare'); }
  function vTom(t, f) { if (!play('tom', t, 1, f / 140, drumBus, 0, 0.3)) lTom(t, f); }
  function vTimp(t, m, vol) { vol = vol || 0.55; var f = mf(m); if (!play('timp', t, vol, f / mtof(TIMP_BASE), drumBus, 0, 0.45)) lTimp(t, f, vol); ev(t, 'kick'); }
  function vShaker(t, vol) { if (!play('shaker', t, vol)) lShaker(t, vol); }
  function vAnvil(t, vol) { vol = vol || 0.05; if (!play('anvil', t, vol / 0.05)) lAnvil(t, vol); }
  function vHeart(t, vol) { vol = vol || 0.7; if (!play('heart', t, vol)) lHeart(t, vol); ev(t, 'kick'); }
  function vChipNoise(t, snare) { if (!play(snare ? 'chipS' : 'chipK', t, 1)) lChip(t, snare); ev(t, snare ? 'snare' : 'kick'); }
  function vRiser(t, dur) {
    var s = ac.createBufferSource(), fl = ac.createBiquadFilter(), gn = ac.createGain(); s.buffer = noiseBuf; s.loop = true;
    fl.type = 'bandpass'; fl.Q.value = 1.4; fl.frequency.setValueAtTime(300, t); fl.frequency.exponentialRampToValueAtTime(7000, t + dur);
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.13, t + dur); gn.gain.linearRampToValueAtTime(0.0001, t + dur + 0.03);
    s.connect(fl); fl.connect(gn); gn.connect(drumBus); gn.connect(revIn); s.start(t); s.stop(t + dur + 0.1);
  }
  function vImpact(t) {
    vCrash(t);
    O('sine', 95, t, t + 1.3, E(t, 0.003, 0.75, 0, 1.2, drumBus)).frequency.exponentialRampToValueAtTime(30, t + 1.1);
    N(t, 0.9, 0.16, 'lowpass', 900, 0.8, 120, drumBus, 0.4);
  }
  function vGong(t, m) { bell(t, mf(m || 36), 0.12, 4, bellBus); N(t, 2, 0.05, 'bandpass', 500, 2, 200, drumBus, 0.6); }

  // bass
  function vBass(m, t, dur, vol) {
    var gn = E(t, 0.004, vol || 0.2, dur * 0.5, dur * 0.5, synthBus), fl = LP(1700, 2, gn);
    fl.frequency.setValueAtTime(1800, t); fl.frequency.exponentialRampToValueAtTime(260, t + dur);
    O('sawtooth', mf(m + 12), t, t + dur + 0.05, fl); O('sine', mf(m), t, t + dur + 0.05, gn);
  }
  function vBassDist(m, t, dur) { O('sawtooth', mf(m + 12), t, t + dur + 0.05, E(t, 0.01, 0.9, dur * 0.6, dur * 0.4, distIn)).frequency.exponentialRampToValueAtTime(mf(m + 12) * 1.02, t + dur); }
  function vWobble(m, t, dur, rate) {
    var gn = E(t, 0.006, 0.16, dur * 0.7, dur * 0.3, synthBus), fl = LP(1500, 9, gn);
    var lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = rate; lg.gain.value = 1300;
    lfo.connect(lg); lg.connect(fl.frequency); lfo.start(t); lfo.stop(t + dur + 0.05);
    O('sawtooth', mf(m + 12), t, t + dur + 0.05, fl); O('square', mf(m + 12), t, t + dur + 0.05, fl, 12);
    O('sine', mf(m), t, t + dur + 0.05, E(t, 0.006, 0.15, dur * 0.7, dur * 0.3, synthBus));
  }
  function vReese(m, t, dur) {
    var gn = E(t, 0.03, 0.14, dur * 0.75, dur * 0.25, synthBus), fl = LP(700, 2.5, gn);
    var lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.7; lg.gain.value = 350; lfo.connect(lg); lg.connect(fl.frequency); lfo.start(t); lfo.stop(t + dur + 0.05);
    O('sawtooth', mf(m + 12), t, t + dur + 0.05, fl, -22); O('sawtooth', mf(m + 12), t, t + dur + 0.05, fl, 22);
    O('sine', mf(m), t, t + dur + 0.05, E(t, 0.02, 0.14, dur * 0.75, dur * 0.25, synthBus));
  }
  function vSub(m, t, dur, vol) { O('sine', mf(m), t, t + dur + 0.3, E(t, 0.03, vol || 0.16, dur * 0.6, dur * 0.4, synthBus)); }
  function vAcid(m, t, len, acc) {
    var gn = E(t, 0.003, acc ? 0.08 : 0.048, len * 0.5, len * 0.5, synthBus, dlyIn, 0.3), fl = LP(300, 15, gn);
    fl.frequency.setValueAtTime(acc ? 3200 : 1400, t); fl.frequency.exponentialRampToValueAtTime(220, t + len * 0.9);
    O('sawtooth', mf(m), t, t + len + 0.05, fl);
  }
  function vBassGtr(m, t, len) { var gn = E(t, 0.003, 0.2, len * 0.6, len * 0.4, musBus), fl = LP(900, 1.2, gn); O('sawtooth', mf(m), t, t + len + 0.05, fl); O('square', mf(m), t, t + len + 0.05, fl, 5); }
  function vChipTri(m, t, len) { O('triangle', mf(m), t, t + len + 0.05, E(t, 0.002, 0.3, len * 0.7, len * 0.3, synthBus)); }

  // synths
  function vPad(ch, t, dur, cut, vol) {
    var gn = ac.createGain(), v = vol || 0.036;
    gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(v, t + Math.min(0.4, dur * 0.3)); gn.gain.setValueAtTime(v, t + dur * 0.85); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35);
    gn.connect(synthBus); var sg = ac.createGain(); sg.gain.value = 0.5; gn.connect(sg); sg.connect(revIn);
    var fl = LP(cut || 1400, 0.7, gn);
    ch.forEach(function (m) { O('sawtooth', mf(m), t, t + dur + 0.4, fl, -9); O('sawtooth', mf(m), t, t + dur + 0.4, fl, 9); });
  }
  function vGate(ch, t, len, vol) { var fl = LP(2600, 0.8, E(t, 0.004, vol || 0.04, len * 0.5, len * 0.5, synthBus, revIn, 0.3)); ch.forEach(function (m) { O('sawtooth', mf(m), t, t + len + 0.05, fl, -10); O('sawtooth', mf(m), t, t + len + 0.05, fl, 10); }); }
  function vLead(m, t, dur, vol) {
    var gn = E(t, 0.008, vol || 0.052, Math.max(0.01, dur - 0.05), 0.12, synthBus, revIn, 0.35);
    var sg = ac.createGain(); sg.gain.value = 0.3; gn.connect(sg); sg.connect(dlyIn);
    var fl = LP(4200, 1, gn);
    O('sawtooth', mf(m), t, t + dur + 0.2, fl, -16); O('sawtooth', mf(m), t, t + dur + 0.2, fl); O('sawtooth', mf(m), t, t + dur + 0.2, fl, 16);
  }
  function vArp(m, t, len, vol) {
    var gn = E(t, 0.002, vol || 0.042, 0, len, synthBus, dlyIn, 0.6), fl = LP(3200, 4, gn);
    fl.frequency.setValueAtTime(3600, t); fl.frequency.exponentialRampToValueAtTime(500, t + len);
    O('square', mf(m), t, t + len + 0.05, fl);
  }
  function vSawArp(m, t, len) { var gn = E(t, 0.002, 0.04, 0, len, synthBus, dlyIn, 0.5), fl = LP(4000, 2, gn); fl.frequency.setValueAtTime(5000, t); fl.frequency.exponentialRampToValueAtTime(700, t + len); O('sawtooth', mf(m), t, t + len + 0.05, fl, -12); O('sawtooth', mf(m), t, t + len + 0.05, fl, 12); }
  function vPluck(m, t, vol) { O('triangle', mf(m), t, t + 1, E(t, 0.003, vol || 0.06, 0, 0.9, musBus, revIn, 0.6)); O('sine', mf(m + 12), t, t + 0.4, E(t, 0.002, (vol || 0.06) * 0.4, 0, 0.3, musBus)); }
  function vPiano(m, t, vol) { vol = vol || 0.05; O('triangle', mf(m), t, t + 1.5, E(t, 0.002, vol, 0, 1.4, musBus, revIn, 0.4)); O('sine', mf(m + 12), t, t + 0.7, E(t, 0.002, vol * 0.5, 0, 0.6, musBus)); O('sine', mf(m + 19), t, t + 0.3, E(t, 0.001, vol * 0.15, 0, 0.2, musBus)); }
  function vPianoCh(ch, t, vol) { for (var i = 0; i < ch.length; i++) vPiano(ch[i], t, vol || 0.035); }
  function vHoover(m, t, dur) {
    var gn = E(t, 0.01, 0.055, dur * 0.6, dur * 0.4, synthBus, revIn, 0.4), fl = LP(2800, 1.5, gn);
    [-22, -7, 7, 22].forEach(function (d) { var o = O('sawtooth', mf(m - 5), t, t + dur + 0.05, fl, d); o.frequency.exponentialRampToValueAtTime(mf(m), t + 0.08); o.frequency.setValueAtTime(mf(m), t + dur * 0.7); o.frequency.exponentialRampToValueAtTime(mf(m - 2), t + dur); });
  }
  function vScreech(m, t, dur) {
    var gn = E(t, 0.005, 0.5, dur * 0.7, dur * 0.3, distIn), fl = ac.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 1800; fl.Q.value = 1.2; fl.connect(gn);
    var o = O('sawtooth', mf(m + 7), t, t + dur + 0.05, fl); o.frequency.exponentialRampToValueAtTime(mf(m), t + 0.06); o.frequency.setValueAtTime(mf(m), t + dur * 0.6); o.frequency.exponentialRampToValueAtTime(mf(m - 12), t + dur);
  }
  function vChip(m, t, dur, vol) { O('pulse', mf(m), t, t + dur + 0.02, E(t, 0.002, vol || 0.05, dur * 0.8, dur * 0.2, synthBus, dlyIn, 0.25)); }
  function vOrgan(ch, t, dur, vol) {
    var v = vol || 0.022, gn = ac.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(v, t + 0.04); gn.gain.setValueAtTime(v, t + dur * 0.9); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.3);
    gn.connect(synthBus); gn.connect(revIn);
    ch.forEach(function (m) { [1, 2, 3, 4, 6].forEach(function (h, k) { O('sine', mf(m - 12) * h, t, t + dur + 0.35, k ? (function () { var g2 = ac.createGain(); g2.gain.value = [1, 0.7, 0.45, 0.35, 0.2][k]; g2.connect(gn); return g2; })() : gn); }); });
  }
  function vSiren(t, dur) {
    var gn = E(t, 0.3, 0.034, Math.max(0.1, dur - 0.6), 0.3, synthBus, revIn, 0.5), fl = LP(2400, 1, gn);
    var o = O('sawtooth', 620, t, t + dur + 0.05, fl), lfo = ac.createOscillator(), lg = ac.createGain();
    lfo.frequency.value = 2 / dur; lg.gain.value = 260; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.05);
  }
  function vGlitch(ch, t) {
    for (var k = 0; k < 8; k++) { var tt = t + k * STEP / 4, m = ch[k % ch.length] + 24 + (k % 3 === 2 ? 12 : 0); O('square', mf(m), tt, tt + STEP / 4, E(tt, 0.001, 0.034, 0, STEP / 4 * 0.8, synthBus)); }
  }

  // orchestra
  function vStrings(ch, t, dur, vol) {
    var v = vol || 0.03, gn = ac.createGain();
    gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(v, t + Math.min(0.35, dur * 0.3)); gn.gain.setValueAtTime(v, t + dur * 0.85); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.45);
    gn.connect(musBus); var sg = ac.createGain(); sg.gain.value = 0.6; gn.connect(sg); sg.connect(revIn);
    var fl = LP(2300, 0.5, gn), lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 5.4; lg.gain.value = 9; lfo.connect(lg); lfo.start(t); lfo.stop(t + dur + 0.5);
    ch.forEach(function (m) { [-11, 0, 11].forEach(function (d) { var o = O('sawtooth', mf(m), t, t + dur + 0.5, fl, d); lg.connect(o.detune); }); });
  }
  function vStac(ch, t, vol) { var len = Math.min(0.16, STEP * 1.6), fl = LP(2600, 0.6, E(t, 0.006, vol || 0.03, len * 0.3, len * 0.7, musBus, revIn, 0.5)); ch.forEach(function (m) { O('sawtooth', mf(m), t, t + len + 0.05, fl, -8); O('sawtooth', mf(m), t, t + len + 0.05, fl, 8); }); }
  function vTremStr(m, t, vol) { var len = STEP * 0.9, fl = LP(2800, 0.6, E(t, 0.004, vol || 0.025, len * 0.4, len * 0.6, musBus, revIn, 0.5)); O('sawtooth', mf(m), t, t + len + 0.05, fl, -7); O('sawtooth', mf(m), t, t + len + 0.05, fl, 7); }
  function vBrass(ch, t, dur, vol) {
    var v = vol || 0.035, gn = E(t, 0.05, v, dur * 0.6, dur * 0.4, musBus, revIn, 0.45), fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 1.2; fl.connect(gn);
    fl.frequency.setValueAtTime(300, t); fl.frequency.linearRampToValueAtTime(2600, t + 0.08); fl.frequency.linearRampToValueAtTime(1300, t + dur);
    ch.forEach(function (m) { O('sawtooth', mf(m), t, t + dur + 0.1, fl, -6); O('sawtooth', mf(m), t, t + dur + 0.1, fl, 6); });
  }
  function vChoir(ch, t, dur, vol) {
    var gn = ac.createGain(), v = vol || 0.05;
    gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(v, t + Math.min(0.5, dur * 0.35)); gn.gain.setValueAtTime(v, t + dur * 0.8); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
    gn.connect(synthBus); gn.connect(revIn);
    var f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.frequency.value = 780; f2.frequency.value = 1180; f1.Q.value = 5; f2.Q.value = 6;
    f1.connect(gn); f2.connect(gn);
    var mix = ac.createGain(); mix.gain.value = 1.6; mix.connect(f1); mix.connect(f2);
    ch.forEach(function (m, k) { O('sawtooth', mf(m), t, t + dur + 0.45, mix, (k - 1) * 7); });
  }
  function vHarp(m, t) { O('triangle', mf(m), t, t + 0.9, E(t, 0.002, 0.045, 0, 0.8, musBus, revIn, 0.6)); }

  // guitars (through the amp buses)
  function vChug(r, t, len, vol) { len = Math.min(len || 0.11, STEP * 1.8); var fl = LP(1100, 1, E(t, 0.002, vol || 0.28, len * 0.4, len * 0.6, gtrIn)); O('sawtooth', mf(r), t, t + len + 0.05, fl, -6); O('sawtooth', mf(r + 7), t, t + len + 0.05, fl, 6); O('square', mf(r + 12), t, t + len + 0.05, fl); }
  function vPower(r, t, dur, vol) { var fl = LP(3600, 0.8, E(t, 0.004, vol || 0.26, dur * 0.7, dur * 0.3, gtrIn)); O('sawtooth', mf(r), t, t + dur + 0.05, fl, -7); O('sawtooth', mf(r + 7), t, t + dur + 0.05, fl, 7); O('sawtooth', mf(r + 12), t, t + dur + 0.05, fl); }
  function vTrem(m, t, vol) { var len = STEP * 0.92, fl = LP(3800, 0.8, E(t, 0.002, vol || 0.22, len * 0.5, len * 0.5, gtrIn)); O('sawtooth', mf(m), t, t + len + 0.05, fl, -5); O('sawtooth', mf(m + 12), t, t + len + 0.05, fl, 5); }
  function vLeadG(m, t, dur, vol) {
    var gn = E(t, 0.006, vol || 0.3, dur * 0.8, dur * 0.2 + 0.08, leadIn), fl = LP(4200, 0.8, gn);
    var o = O('sawtooth', mf(m) * 0.985, t, t + dur + 0.15, fl); o.frequency.exponentialRampToValueAtTime(mf(m), t + 0.04);
    if (dur > 0.22) { var lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 6.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(28, t + Math.min(0.3, dur * 0.6)); lfo.connect(lg); lg.connect(o.detune); lfo.start(t); lfo.stop(t + dur + 0.15); }
  }

  // ---------- patterns the radio styles borrow ----------
  var ACID = [0, null, 12, 0, null, 3, 0, 10, 0, null, 7, 12, 0, 3, null, 5];
  var ACC = [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1];
  var WOB = [2, 3, 4, 6];
/*__RADIO__*/

  function envf(dt, k) { return dt < 0 ? 0 : Math.exp(-dt * k); }
  // ---------- custom-track beat tracking ----------
  // Loud, heavily-limited songs peg a plain level meter, so the old detector rarely fired. This one watches each
  // band's level in dB and fires when it jumps well above its own average over the last ~130 ms, with a threshold
  // that adapts to how busy the song is. That works at any loudness. Kicks drive the beat and bar pulses.
  var OB = [
    { lo: 1, hi: 4, k: 2, fl: 3.5, ref: 0.12, m: 0, v: 0, t: -9, pk: -40 },    // ~45-190 Hz: kicks
    { lo: 4, hi: 40, k: 2.5, fl: 2.5, ref: 0.1, m: 0, v: 0, t: -9, pk: -40 },  // ~0.2-1.9 kHz: snares
    { lo: 60, hi: 200, k: 2, fl: 2.5, ref: 0.07, m: 0, v: 0, t: -9, pk: -40 }  // ~2.8-9.4 kHz: hats
  ], onN = 0, onT = -1, kickRun = 0, OH = [];
  function onsets(now, B) {
    if (now - onT < 0.003) return;                                   // same audio block as last frame
    onAn.getFloatFrequencyData(onSpec);
    var dt = onT < 0 ? 0.016 : Math.min(0.1, now - onT); onT = now; onN++;
    var E = [0, 0, 0], A = [0, 0, 0], cnt = 0, j, q, k;
    for (j = 0; j < 3; j++) {
      var o = OB[j], e = 0;
      for (k = o.lo; k < o.hi; k++) { var d = onSpec[k]; e += d > -110 ? d : -110; }   // silence reads -Infinity
      E[j] = e / (o.hi - o.lo);
      o.pk = Math.max(E[j], o.pk - dt * 4);                           // automatic gain: level vs recent peak
    }
    for (q = OH.length - 1; q >= 0 && now - OH[q][0] <= 0.135; q--) { cnt++; for (j = 0; j < 3; j++) A[j] += OH[q][j + 1]; }
    OH.push([now, E[0], E[1], E[2]]); if (OH.length > 32) OH.shift();
    VIZ.bass = Math.max(0, Math.min(1, (E[0] - OB[0].pk + 24) / 24));
    VIZ.mid = Math.max(0, Math.min(1, (E[1] - OB[1].pk + 24) / 24));
    VIZ.high = 0.85 * Math.max(0, Math.min(1, (E[2] - OB[2].pk + 24) / 24));
    if (cnt < 2 || onN < 8) return;
    for (j = 0; j < 3; j++) {
      var b = OB[j], rise = Math.max(0, E[j] - A[j] / cnt), sd = Math.sqrt(Math.max(0, b.v));
      var hit = rise > Math.max(b.m + b.k * sd, b.fl) && E[j] > -80 && now - b.t > b.ref;
      var a = Math.min(0.2, dt * 3); b.m += a * (rise - b.m); b.v += a * ((rise - b.m) * (rise - b.m) - b.v);
      if (!hit) continue;
      b.t = now;
      if (j === 0) {
        lastKick = now; VIZ.kickN++;
        if (now - lastBeat > 0.3) {
          lastBeat = now; VIZ.beatN++; bi = (bi + 1) % 4; B[bi] = now;
          if (++kickRun >= 4 || now - lastBar > 2.6) { kickRun = 0; lastBar = now; }
        }
      } else if (j === 1) lastSnare = now;
      else lastHat = now;
    }
  }
  function viz() {
    var c = RD.ctx; if (!c) return VIZ;
    var now = c.currentTime - (c.outputLatency || c.baseLatency || 0.02), B = VIZ.beats;
    VIZ.now = now;
    while (evq.length && evq[0][0] <= now) {
      var e = evq.shift(), et = e[0];
      switch (e[1]) {
        case 'kick': lastKick = et; VIZ.kickN++; break;
        case 'snare': lastSnare = et; break;
        case 'hat': lastHat = et; break;
        case 'beat': lastBeat = et; VIZ.beatN++; bi = (bi + 1) % 4; B[bi] = et; break;
        case 'bar': lastBar = et; break;
        case 'impact': lastImpact = et; break;
      }
    }
    var live = c.state === 'running' && !RD.muted && RD.on && (RD.mode === 'bt' ? RD.bt.cur >= 0 : RD.mode === 'radio');
    if (live) {
      RD.an.getByteFrequencyData(spec);
      var b = 0, m = 0, h = 0, i;
      for (i = 1; i <= 5; i++) b += spec[i];
      for (i = 6; i < 48; i++) m += spec[i];
      for (i = 48; i < 200; i++) h += spec[i];
      b /= 5 * 255; m /= 42 * 255; h /= 152 * 255;
      VIZ.bass = b; VIZ.mid = m; VIZ.high = h;
      if (RD.mode === 'bt' && onAn) onsets(now, B);
    } else VIZ.bass = VIZ.mid = VIZ.high = 0;
    var cur = RD.mode === 'radio' ? rCur() : null, bpm = cur ? cur.song.bpm : 0;
    VIZ.kick = envf(now - lastKick, bpm > 200 ? 3.5 : 8); VIZ.snare = envf(now - lastSnare, 7); VIZ.hat = envf(now - lastHat, 12);
    VIZ.beat = envf(now - lastBeat, 5); VIZ.bar = envf(now - lastBar, 2.5); VIZ.impact = envf(now - lastImpact, 1.5);
    VIZ.tBar = now - lastBar; VIZ.tImpact = now - lastImpact;
    VIZ.bpm = bpm; VIZ.live = live;
    return VIZ;
  }

  // ---------- pre-rendered effects ----------
  // Frequent sounds are rendered once into samples and replayed (2 audio nodes per sound instead of 10-20),
  // which keeps phones from overloading the audio thread when gunfire, kills and a fast song all overlap.
  // a reverb for one baked sound: returns its input (the dry signal goes straight through, the wet into a fresh hall)
  function verbBus(sec, wet) {
    if (!BAKING) return sfxBus;   // the live fallback (before the samples are ready) skips the hall
    var input = ac.createGain(), cv = ac.createConvolver(), wg = ac.createGain();
    cv.buffer = impulse(sec); wg.gain.value = wet; input.connect(sfxBus); input.connect(cv); cv.connect(wg); wg.connect(sfxBus);
    return input;
  }
  // the GAU-8 Avenger: 65 rounds a second, each a crack and a thump, over a torn sawtooth growl and a sub, then the
  // echoes coming back off the buildings and a long distant reverb
  function gau8(t, fire) {
    var out = ac.createGain(), mx = ac.createGain(); out.connect(sfxBus); mx.connect(out);
    [[0.21, 0.42, 2200], [0.47, 0.3, 1400], [0.86, 0.19, 900], [1.32, 0.11, 650]].forEach(function (e) {
      var dl = ac.createDelay(2), lp = ac.createBiquadFilter(), g = ac.createGain(); dl.delayTime.value = e[0]; lp.type = 'lowpass'; lp.frequency.value = e[2]; g.gain.value = e[1];
      mx.connect(dl); dl.connect(lp); lp.connect(g); g.connect(out);
    });
    var cv = ac.createConvolver(), cl = ac.createBiquadFilter(), cg = ac.createGain(); cv.buffer = impulse(2.8); cl.type = 'lowpass'; cl.frequency.value = 1500; cg.gain.value = 0.34;
    mx.connect(cv); cv.connect(cl); cl.connect(cg); cg.connect(out);
    var n = Math.round(fire * 65), k, tk, v;
    for (k = 0; k < n; k++) {
      tk = t + k / 65 + (Math.random() - 0.5) * 0.0012; v = 0.75 + Math.random() * 0.25; if (k > n - 8) v *= (n - k) / 8;
      noise(tk, 0.012, 0.4 * v, 'lowpass', 2400 + Math.random() * 900, 0.7, null, mx);
      osc('sine', 155, 42, tk, 0.032, 0.5 * v, mx, 0.0008);
    }
    var o = ac.createOscillator(), sh = ac.createWaveShaper(), lp2 = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(66, t); o.frequency.setValueAtTime(66, t + fire - 0.15); o.frequency.linearRampToValueAtTime(48, t + fire);
    sh.curve = distCurve(35); lp2.type = 'lowpass'; lp2.frequency.value = 1500;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.4, t + 0.03); g.gain.setValueAtTime(0.4, t + fire - 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + fire + 0.12);
    o.connect(sh); sh.connect(lp2); lp2.connect(g); g.connect(mx); o.start(t); o.stop(t + fire + 0.2);
    var sb = ac.createOscillator(), sg = ac.createGain(); sb.type = 'sine'; sb.frequency.value = 33;
    sg.gain.setValueAtTime(0.0001, t); sg.gain.linearRampToValueAtTime(0.5, t + 0.04); sg.gain.setValueAtTime(0.5, t + fire); sg.gain.exponentialRampToValueAtTime(0.0001, t + fire + 0.25);
    sb.connect(sg); sg.connect(mx); sb.start(t); sb.stop(t + fire + 0.3);
    var ns = ac.createBufferSource(), bp = ac.createBiquadFilter(), am = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(), ng = ac.createGain();
    ns.buffer = noiseBuf; ns.loop = true; bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.7;
    lfo.type = 'square'; lfo.frequency.value = 65; lg.gain.value = 0.5; am.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
    ng.gain.setValueAtTime(0.0001, t); ng.gain.linearRampToValueAtTime(0.32, t + 0.03); ng.gain.setValueAtTime(0.32, t + fire); ng.gain.exponentialRampToValueAtTime(0.0001, t + fire + 0.2);
    ns.connect(bp); bp.connect(am); am.connect(ng); ng.connect(mx); ns.start(t); ns.stop(t + fire + 0.3); lfo.start(t); lfo.stop(t + fire + 0.3);
  }
  // the rounds landing first: a dense crackle of small explosions in a short reverb
  function heiHits(t, dur) {
    var out = ac.createGain(), cv = ac.createConvolver(), cg = ac.createGain(); out.connect(sfxBus); cv.buffer = impulse(1.6); cg.gain.value = 0.3; out.connect(cv); cv.connect(cg); cg.connect(sfxBus);
    for (var i = 0; i < 150; i++) { var tk = t + Math.random() * dur, v = 0.08 + Math.random() * 0.22; noise(tk, 0.02, v, 'bandpass', 500 + Math.random() * 2600, 1.1, null, out); if (i % 6 === 0) osc('sine', 130, 48, tk, 0.07, 0.32, out, 0.001); }
  }
  var FX = {
    // the kill: three parts, one after another — dog tags clinking on their chain, a ping, then a deep pop in a big
    // reverb. The ping climbs with each kill in a tier; every 25 chained kills is a new tier and the whole thing gets
    // more epic: a sub thump, a fifth over the ping, a longer hall, rumble, an octave under, and at the top a choir swell.
    killTags: function (t, v) {
      var parts = [[3150, 1], [4720, 0.7], [6890, 0.48], [8370, 0.32], [10900, 0.18]], sh = [1, 1.045, 0.962][v % 3];
      [0, 0.026 + v * 0.007].forEach(function (dt, h) {      // tag against tag, then the bounce back
        var tt = t + dt, g = h ? 0.5 : 1, s2 = sh * (h ? 1.06 : 1);
        parts.forEach(function (p) { var f = p[0] * s2; osc('sine', f, f, tt, 0.04 + 0.1 * Math.sqrt(3150 / f), 0.075 * p[1] * g, null, 0.0007); });
        noise(tt, 0.01, 0.22 * g, 'highpass', 6500, 0.7);
      });
      for (var i = 0; i < 6; i++) noise(t + 0.05 + i * 0.014 + i * i * 0.0025, 0.006, 0.08 * (1 - i / 7), 'bandpass', 6800 + i * 350 + v * 200, 3);   // the ball chain rattles
    },
    killPing: function (t, k) {
      var bus = verbBus(1 + k * 0.25, 0.3 + k * 0.04), f = 1568;
      osc('sine', f, f, t, 0.55 + k * 0.08, 0.15, bus, 0.001); osc('sine', f * 2.005, f * 2.005, t, 0.2, 0.035, bus, 0.001); osc('sine', f * 3.01, f * 3.01, t, 0.08, 0.02, bus, 0.001);
      if (k >= 2) osc('sine', f * 1.5, f * 1.5, t + 0.012, 0.5, 0.055, bus, 0.002);       // a fifth above joins
      if (k >= 4) osc('triangle', f / 2, f / 2, t, 0.8, 0.06, bus, 0.002);              // then an octave below
    },
    killPop: function (t, k) {
      var bus = verbBus(1.3 + k * 0.38, 0.32 + k * 0.07), dz = BAKING ? distIn : null;
      osc('sine', 160 / (1 + k * 0.13), 44 / (1 + k * 0.1), t, 0.2 + k * 0.035, 0.62, bus, 0.002);   // the deep pop
      osc('triangle', 360, 95, t, 0.05, 0.22, bus); noise(t, 0.028, 0.3, 'bandpass', 950, 1.1, null, bus);
      if (k >= 1) osc('sine', 64, 30, t, 0.42 + k * 0.08, 0.36 + k * 0.03, bus, 0.003);   // sub thump
      if (k >= 2) noise(t, 0.09, 0.14, 'lowpass', 1600, 0.8, 300, bus);
      if (k >= 3) { noise(t, 0.4, 0.16, 'lowpass', 650, 0.8, 90, bus); bell(t, 98, 0.07, 1.6, bus); }   // rumble and a low bell
      if (k >= 4) [82.4, 123.5, 164.8].forEach(function (pf, i) { osc('sawtooth', pf, pf * 0.985, t, 0.3, [0.13, 0.09, 0.05][i], dz); });
      if (k >= 5) {                                                                   // the top tier: a boom and a choir swell
        osc('sine', 46, 27, t, 0.8, 0.5, bus, 0.004);
        [220, 261.6, 329.6].forEach(function (cf) { [0.996, 1.004].forEach(function (d) { osc('sawtooth', cf * d, cf * d, t + 0.02, 0.9, 0.022, bus, 0.12); }); });
      }
    },
    shot: function (t, kind) {
      switch (kind) {
        case 'shotgun': noise(t, 0.24, 0.42, 'lowpass', 1800, 0.7, 260); osc('sine', 110, 36, t, 0.22, 0.45); break;
        case 'sniper': noise(t, 0.32, 0.38, 'lowpass', 3200, 0.6, 380); noise(t, 0.04, 0.3, 'highpass', 4200); osc('sine', 92, 30, t, 0.3, 0.45); break;
        case 'revolver': noise(t, 0.17, 0.34, 'bandpass', 1400, 0.8, 480); osc('sine', 140, 44, t, 0.15, 0.38); break;
        case 'launcher': osc('sine', 190, 60, t, 0.18, 0.38); noise(t, 0.12, 0.16, 'lowpass', 800); break;
        case 'flamer': noise(t, 0.22, 0.14, 'lowpass', 900, 0.5, 380); break;
        case 'smg': case 'lmg': noise(t, 0.05, 0.17, 'bandpass', kind === 'lmg' ? 1300 : 2100, 0.9); osc('sine', 150, 60, t, 0.05, 0.16); break;
        default: noise(t, 0.07, 0.21, 'bandpass', 1700, 0.9); osc('sine', 170, 55, t, 0.07, 0.22);
      }
    },
    boom: function (t, big) { noise(t, big ? 0.75 : 0.35, big ? 0.6 : 0.36, 'lowpass', big ? 900 : 1500, 0.7, 110); osc('sine', big ? 72 : 105, 28, t, big ? 0.6 : 0.3, big ? 0.7 : 0.45); },
    hurt: function (t) { osc('sawtooth', 170, 60, t, 0.16, 0.16); noise(t, 0.12, 0.26, 'lowpass', 700); },
    dash: function (t) { noise(t, 0.22, 0.26, 'bandpass', 600, 1.2, 2600); },
    zap: function (t) { osc('sawtooth', 1500, 300, t, 0.08, 0.1); noise(t, 0.06, 0.12, 'highpass', 5000); },
    heal: function (t) { osc('triangle', 660, 660, t, 0.1, 0.16); osc('triangle', 990, 990, t + 0.08, 0.16, 0.14); },
    jam: function (t) { osc('square', 230, 180, t, 0.05, 0.12); osc('square', 180, 150, t + 0.07, 0.05, 0.12); },
    alarm: function (t) { osc('square', 520, 900, t, 0.25, 0.1); osc('square', 520, 900, t + 0.3, 0.25, 0.1); },
    grab: function (t) { noise(t, 0.35, 0.5, 'lowpass', 900, 1, 150); osc('sine', 90, 35, t, 0.35, 0.6); noise(t + 0.05, 0.15, 0.3, 'bandpass', 2500, 2); },
    tap: function (t) { osc('sine', 500, 260, t, 0.07, 0.3); noise(t, 0.04, 0.2, 'highpass', 3000); },
    escape: function (t) { noise(t, 0.4, 0.3, 'bandpass', 500, 1, 4000); bell(t + 0.12, 1318.5, 0.1, 0.8); bell(t + 0.2, 1975.5, 0.08, 0.9); },
    crush: function (t) { noise(t, 0.5, 0.6, 'lowpass', 1200, 1, 100); osc('sine', 70, 25, t, 0.5, 0.7); noise(t, 0.2, 0.35, 'bandpass', 3000, 3); },
    cardIn: function (t) { noise(t, 0.18, 0.12, 'bandpass', 700, 1.5, 3000); osc('triangle', 330, 330, t + 0.05, 0.1, 0.05); },
    cardShot: function (t) { noise(t, 0.22, 0.55, 'bandpass', 1500, 0.8, 450); osc('sine', 140, 40, t, 0.2, 0.5); noise(t + 0.03, 0.18, 0.28, 'bandpass', 3200, 2, 700); osc('sine', 1500, 240, t + 0.15, 0.85, 0.05); },
    click: function (t) { osc('square', 900, 600, t, 0.025, 0.05); },
    refuse: function (t) { osc('sine', 300, 90, t, 0.5, 0.25); noise(t, 0.4, 0.2, 'lowpass', 800, 1, 200); },
    impacts: function (t) { noise(t, 0.12, 0.22, 'lowpass', 1400, 0.8, 300); osc('sine', 120, 45, t, 0.12, 0.18); },
    gulp: function (t) { osc('sine', 300, 80, t, 0.12, 0.16); noise(t, 0.08, 0.1, 'lowpass', 800); }
  };
  var FXDUR = { hurt: 0.25, dash: 0.3, zap: 0.15, heal: 0.3, jam: 0.2, alarm: 0.6, grab: 0.45, tap: 0.15, escape: 1.15, crush: 0.6, cardIn: 0.25, cardShot: 1.05, click: 0.06, refuse: 0.55, impacts: 0.2, gulp: 0.2 };
  var SHOTS = ['pistol', 'shotgun', 'sniper', 'revolver', 'launcher', 'flamer', 'smg', 'lmg'];
  function bake(name, dur, fn, cap) {
    var sr = ac.sampleRate, off;
    try { off = new OfflineAudioContext(1, Math.ceil(sr * dur), sr); } catch (e) { return; }
    var save = [ac, sfxBus, drumBus, synthBus, musBus, revIn, distIn];
    var d = off.createWaveShaper(), dg = off.createGain(); d.curve = distCurve(60); dg.gain.value = 0.3; d.connect(dg); dg.connect(off.destination);
    ac = off; sfxBus = drumBus = synthBus = musBus = off.destination; revIn = null; distIn = d; BAKING = true;
    try { fn(0); } catch (e) { /* a sound that fails to bake keeps its live version */ }
    ac = save[0]; sfxBus = save[1]; drumBus = save[2]; synthBus = save[3]; musBus = save[4]; revIn = save[5]; distIn = save[6]; BAKING = false;
    off.startRendering().then(function (b) {
      // cap: keep a layered sound's peak in check so the heavier versions get bigger without slamming the limiter
      if (cap) { var d = b.getChannelData(0), pk = 0; for (var i = 0; i < d.length; i++) { var a = d[i] < 0 ? -d[i] : d[i]; if (a > pk) pk = a; } if (pk > cap) { var g = cap / pk; for (var j = 0; j < d.length; j++) d[j] *= g; } }
      BANK[name] = b;
    }, function () {});
  }
  function bakeAll() {
    if (!ac || typeof OfflineAudioContext === 'undefined') return;
    bake('kick', 0.5, function (t) { lKick(t, 0.42); });
    bake('k808', 0.8, function (t) { lK808(t, mtof(F808), 0.7); });
    bake('khard', 0.5, function (t) { lKHard(t, 0.4); });
    bake('gabber', 0.4, function (t) { lGabber(t, 0.3); });
    bake('kmetal', 0.2, function (t) { lKMetal(t, 1); });
    bake('clap', 0.3, function (t) { lClap(t, 1); });
    bake('snare', 0.2, function (t) { lSnare(t, 1, 1); });
    bake('snareA', 0.26, function (t) { lSnareA(t, 1); });
    bake('snareG', 0.32, function (t) { lSnareG(t, 1); });
    bake('hatC', 0.06, function (t) { lHat(t, false, 1); });
    bake('hatO', 0.18, function (t) { lHat(t, true, 1); });
    bake('ride', 0.48, function (t) { lRide(t, 1); });
    bake('crash', 1.8, function (t) { lCrash(t, 1); });
    bake('china', 1.1, function (t) { lChina(t, 1); });
    bake('tom', 0.32, function (t) { lTom(t, 140); });
    bake('timp', 1.35, function (t) { lTimp(t, mtof(TIMP_BASE), 1); });
    bake('shaker', 0.06, function (t) { lShaker(t, 1); });
    bake('anvil', 0.4, function (t) { lAnvil(t, 0.05); });
    bake('heart', 0.5, function (t) { lHeart(t, 1); });
    bake('chipK', 0.1, function (t) { lChip(t, false); });
    bake('chipS', 0.12, function (t) { lChip(t, true); });
    for (var v = 0; v < 3; v++) (function (v) { bake('kt' + v, 0.26, function (t) { FX.killTags(t, v); }, 0.5); })(v);
    for (var k = 0; k <= 5; k++) (function (k) {
      bake('kp' + k, 1.4 + k * 0.3, function (t) { FX.killPing(t, k); }, 0.42 + k * 0.03);
      bake('kb' + k, 1.8 + k * 0.42, function (t) { FX.killPop(t, k); }, 0.62 + k * 0.08);
    })(k);
    SHOTS.forEach(function (sh) { bake('s_' + sh, 0.4, function (t) { FX.shot(t, sh); }); });
    bake('boom0', 0.45, function (t) { FX.boom(t, false); }); bake('boom1', 0.85, function (t) { FX.boom(t, true); });
    bake('brrt', 3.7, function (t) { gau8(t, 1.05); }, 0.95); bake('brrt2', 2.9, function (t) { gau8(t, 0.45); }, 0.9); bake('hits', 2.6, function (t) { heiHits(t, 1.15); }, 0.8);
    Object.keys(FXDUR).forEach(function (n) { bake('x_' + n, FXDUR[n], function (t) { FX[n](t); }); });
  }
  function jit() { return 0.95 + Math.random() * 0.1; }
  function sfx(name, rate) { return play(name, ac.currentTime, 1, rate || jit(), sfxBus); }
  function fx(n, rate) { if (!sfx('x_' + n, rate)) FX[n](ac.currentTime); }
  function bell2(t, f, vol, dur) { osc('sine', f, f, t, dur, vol, null, 0.002); osc('sine', f * 2.76, f * 2.76, t, dur * 0.7, vol * 0.45, null, 0.002); }

  // ---------- intro routing ----------
  var IB = null, LAUGH_IR = null, LASTSHOT = null;
  function introBus() {
    if (!IB) {
      IB = { sfx: ac.createGain(), mus: ac.createGain(), synth: ac.createGain(), drum: ac.createGain() };
      IB.sfx.connect(sfxBus); IB.mus.connect(musBus); IB.synth.connect(IB.mus); IB.drum.gain.value = 0.9; IB.drum.connect(IB.mus);
    }
    return IB;
  }
  function viaIntro(fn) {
    var b = introBus(), sv = [sfxBus, musBus, synthBus, drumBus, bellBus];
    sfxBus = b.sfx; musBus = b.mus; synthBus = b.synth; drumBus = b.drum; bellBus = b.mus;
    try { return fn(); } finally { sfxBus = sv[0]; musBus = sv[1]; synthBus = sv[2]; drumBus = sv[3]; bellBus = sv[4]; }
  }
  // a recorded track for the "made with" card (decoded once, played through the intro bus)
  var ITRACK = { b64: '', buf: null, busy: false, gain: 1 };
  function decodeIntroTrack() {
    if (!ac || !ITRACK.b64 || ITRACK.buf || ITRACK.busy) return;
    ITRACK.busy = true;
    try {
      var bin = atob(ITRACK.b64), n = bin.length, u = new Uint8Array(n);
      for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
      var done = function (b) { ITRACK.buf = b; ITRACK.busy = false; }, fail = function () { ITRACK.busy = false; ITRACK.b64 = ''; };
      var pr = ac.decodeAudioData(u.buffer, done, fail);
      if (pr && pr.then) pr.then(done, fail);
    } catch (e) { ITRACK.busy = false; ITRACK.b64 = ''; }
  }
  function introCut() {
    if (!IB || !ac) return; var b = IB, t = ac.currentTime; IB = null;
    b.sfx.gain.setTargetAtTime(0, t, 0.04); b.mus.gain.setTargetAtTime(0, t, 0.04);
    setTimeout(function () { try { b.sfx.disconnect(); b.mus.disconnect(); } catch (e) { } }, 600);
  }

  // ---------- self-repair ----------
  // Phones sometimes leave an audio clock frozen (a Bluetooth headset switch, a call, the OS reclaiming the device).
  // heal() runs every couple of seconds for both engines: it resumes a suspended one and rebuilds a frozen one.
  function vizReset() {
    evq.length = 0; lastKick = lastKickEv = lastSnare = lastHat = lastBeat = lastBar = lastImpact = -9;
    for (var b = 0; b < 4; b++) VIZ.beats[b] = -9;
    onT = -1; OH.length = 0; for (var j = 0; j < OB.length; j++) OB[j].t = -9;
  }
  function rebuild() {
    var old = ac; ac = null; BANK = {}; IB = null; HB.ct = -1; HB.stuck = 0; rebuilds++;
    try { if (old) old.close(); } catch (e) { }
    init();
  }
  function selfHeal(visible) {
    var r = rHeal(visible);
    if (!ac || !visible) { HB.ct = -1; HB.stuck = 0; return r; }
    if (ac.state === 'closed') { rebuild(); return 'rebuilt'; }
    if (ac.state !== 'running') { ac.resume().catch(function () { }); return r || 'resumed'; }
    if (HB.ct >= 0 && ac.currentTime === HB.ct) { if (++HB.stuck >= 2) { rebuild(); return 'rebuilt'; } }
    else HB.stuck = 0;
    HB.ct = ac.currentTime;
    return r;
  }
  function setQuality(q) {
    AQ = q; RSR = q >= 2 ? 44100 : 32000;
    for (var i = 0; i < SHAPERS.length; i++) { try { SHAPERS[i].oversample = q >= 1 ? '2x' : 'none'; } catch (e) { } }
  }

  var api = {
    tick: function () { rPump(); },
    selfHeal: selfHeal, rebuild: rebuild, setQuality: setQuality,
    health: function () { return { state: ac ? ac.state : 'off', rebuilds: rebuilds, late: lateN, quality: AQ, radio: RD.ctx ? RD.ctx.state : 'off', radioRebuilds: RD.heal.rebuilds, radioLate: RD.late, radioErrors: RD.errs }; },
    init: init,
    unlocked: function () { return ready(); },
    setSfx: function (on) { sfxOn = !!on; },
    sfxOn: function () { return sfxOn; },
    // the radio, FM 66.6: see radioApi in the radio section
    fm: radioApi,
    setMusicMode: function (m) { rSetMode(m === 'builtin' ? 'radio' : m === 'custom' ? 'bt' : m); },
    musicMode: function () { return RD.mode; },
    hasCustom: function () { return RD.bt.list.length > 0; },
    // the game tells the sound which screen it is on; the music only cares that the studio intro is over
    setScene: function (sc) {
      if (sc !== 'intro' && !RD.on && !RD.startT) RD.startT = setTimeout(rStart, scene === 'intro' ? 1400 : 200);
      scene = sc;
    },
    // the old boss remixes and fight music are gone: the radio plays on through everything
    setBoss: function () { },
    setQte: function () { },
    songInfo: function () { return null; },
    nowPlaying: function () { var i = rInfo(); return { name: i.song, genre: i.genre, bpm: i.bpm }; },
    viz: viz,
    _dbg: function () { return { late: lateN, ac: ac, master: master, musOut: musComp, sfxOut: sfxComp, scene: scene, bank: BANK, lastShot: LASTSHOT, radio: radioApi._dbg() }; },
    suspend: function () {
      if (ac && ac.state === 'running') ac.suspend().catch(function () {});
      if (RD.ctx && RD.ctx.state === 'running') RD.ctx.suspend().catch(function () {});
      RD.bt.els.forEach(function (el) { try { el.pause(); } catch (e) { } });
    },
    resume: function () {
      if (ac && ac.state === 'suspended') ac.resume().catch(function () {});
      if (RD.ctx && RD.ctx.state === 'suspended') RD.ctx.resume().catch(function () {});
      var B = RD.bt; if (RD.mode === 'bt' && B.cur >= 0 && B.els[B.cur]) { var pr = B.els[B.cur].play(); if (pr && pr.catch) pr.catch(function () { }); }
    },
    loadCustom: function (list) { radioApi.btSet(list); return true; },

    // ---------- studio intro ----------
    // a chunky block being set into the road: low thock, body knock and a bright click
    introBlock: function (k) {
      if (!ok()) return; return viaIntro(function () { var t = ac.currentTime, p = [1, 1.12, 1.26, 1.5, 1.68][k % 5] * (0.96 + Math.random() * 0.08);
      osc('sine', 230 * p, 95 * p, t, 0.09, 0.5); osc('square', 460 * p, 300 * p, t, 0.025, 0.06);
      noise(t, 0.05, 0.35, 'lowpass', 1400 * p, 0.8); noise(t, 0.012, 0.16, 'highpass', 4200, 0.7);
      if (k % 6 === 5) { osc('sine', 120, 50, t, 0.2, 0.45); noise(t, 0.12, 0.2, 'lowpass', 500); }
      });
    },
    introSettle: function () { if (!ok()) return; return viaIntro(function () { var t = ac.currentTime; osc('sine', 90, 34, t, 0.5, 0.7); noise(t, 0.4, 0.3, 'lowpass', 700, 0.7, 120); noise(t, 0.06, 0.2, 'bandpass', 2400, 2);  }); },
    introPaint: function () { if (!ok()) return; return viaIntro(function () { var t = ac.currentTime; noise(t, 0.55, 0.12, 'highpass', 2600, 0.7, 7000); noise(t + 0.05, 0.4, 0.06, 'bandpass', 5200, 3);  }); },
    // the stampede: rolling low rumble with footfalls and a crowd of groans, swelling and passing
    introStampede: function (dur) {
      if (!ok()) return; return viaIntro(function () {
        var t = ac.currentTime; dur = dur || 3.2;
        var src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(), am = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
        src.buffer = noiseBuf; src.loop = true; fl.type = 'lowpass'; fl.frequency.value = 150; fl.Q.value = 1.1;
        lfo.type = 'triangle'; lfo.frequency.value = 6.5; lg.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain); am.gain.value = 0.6;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1.3, t + dur * 0.35); g.gain.setValueAtTime(1.3, t + dur * 0.62); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(fl); fl.connect(am); am.connect(g); g.connect(sfxBus); src.start(t); src.stop(t + dur + 0.1); lfo.start(t); lfo.stop(t + dur + 0.1);
        osc('sine', 36, 30, t, dur, 0.45, null, dur * 0.3); osc('triangle', 48, 40, t, dur, 0.12, null, dur * 0.35);
        var F = [[480, 5], [820, 6], [2200, 8]];
        for (var i = 0; i < 26; i++) { var tt = t + dur * (0.12 + Math.random() * 0.72), f = 70 + Math.random() * 70; voice(tt, f * 1.2, f * 0.7, 0.45 + Math.random() * 0.55, 0.045 + Math.random() * 0.05, F); }
      });
    },
    // one heavy footfall in the stampede: a deep thud, a dirt crunch, placed left-to-right where the zombie is
    introStomp: function (pan, k, big) {
      if (!ok()) return; return viaIntro(function () {
        var t = ac.currentTime + Math.random() * 0.015, g = ac.createGain(), out = g;
        g.gain.value = k;
        if (ac.createStereoPanner) { var p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(sfxBus); } else g.connect(sfxBus);
        var f = (big ? 44 : 58) + Math.random() * 24;
        osc('sine', f * 1.9, f * 0.5, t, 0.17 + Math.random() * 0.08 + (big ? 0.1 : 0), 0.55, out, 0.002);
        noise(t, 0.08, 0.32, 'lowpass', 340 + Math.random() * 220, 0.9, 80, out);
        if (Math.random() < 0.55) noise(t + 0.004, 0.035, 0.1, 'bandpass', 700 + Math.random() * 1100, 1.4, null, out);
        setTimeout(function () { try { g.disconnect(); } catch (e) { } }, 900);
      });
    },
    // the eyes: everything else goes dark with a deep drop and a low choir; then a bright metal "shing" as the name lands
    introEyes: function () {
      if (!ok()) return; return viaIntro(function () {
        var t = ac.currentTime;
        osc('sine', 88, 26, t, 1.6, 0.7, null, 0.01); noise(t, 1.2, 0.14, 'lowpass', 420, 1, 90);
        vChoir([38, 45, 50], t, 2.6, 0.045); vStrings([26, 33, 38], t, 2.8, 0.03); vGong(t + 0.05, 26);
      });
    },
    introShing: function () {
      if (!ok()) return; return viaIntro(function () {
        var t = ac.currentTime;
        bell(t, 1318, 0.09, 2.2); bell(t + 0.01, 1975, 0.05, 1.8); osc('sine', 3951, 3951, t, 0.9, 0.025, null, 0.002);
        noise(t, 0.5, 0.11, 'highpass', 3200, 0.8, 9000); noise(t, 0.08, 0.18, 'bandpass', 2400, 2);
        osc('sine', 110, 40, t, 0.6, 0.45, null, 0.004); vTimp(t, 38, 0.6);
      });
    },
    // the freeze: impact, a low brass and choir stab, a ringing gong
    introSting: function () {
      if (!ok()) return; return viaIntro(function () { var t = ac.currentTime;
      vImpact(t); vGong(t, 31); vBrass([38, 45, 50, 53], t, 1.6, 0.06); vChoir([62, 65, 69], t, 1.8, 0.05); vTimp(t, 38, 0.9);
      osc('sawtooth', 55, 41, t, 1.6, 0.12, null, 0.01); noise(t, 1.6, 0.14, 'highpass', 6000, 0.7);
      });
    },
    // "made with" card: an orchestral cue in D minor that resolves to D major. Returns its length in seconds.
    introScore: function () {
      if (!ok()) return 0; return viaIntro(function () { var t = ac.currentTime + 0.05, i;
      vStrings([38, 45, 50], t, 2.3, 0.032); vSub(26, t, 2.2, 0.14);
      for (i = 0; i < 16; i++) vTimp(t + i * (0.14 - i * 0.004), 38, 0.18 + i * 0.028);   // timpani roll, crescendo
      vRiser(t + 0.7, 1.45); vChoir([62, 65, 69], t + 0.9, 1.3, 0.035);
      var h = t + 2.2;   // the reveal
      vImpact(h); vGong(h, 38); vTimp(h, 38, 0.95); vSub(26, h, 1.4, 0.18);
      vBrass([50, 57, 62, 65], h, 1.3, 0.055); vStrings([50, 57, 62, 65, 69], h, 1.4, 0.036); vChoir([62, 65, 69, 74], h, 1.5, 0.05);
      var seq = [[3.6, [46, 53, 58, 62], [58, 62, 65, 70], 34], [4.7, [48, 55, 60, 64], [60, 64, 67, 72], 36]];
      seq.forEach(function (c) {
        var s0 = t + c[0]; vBrass(c[1], s0, 1.0, 0.05); vStrings(c[2], s0, 1.1, 0.034); vTimp(s0, c[3], 0.7); vTimp(s0 + 0.55, c[3], 0.45);
        for (var k = 0; k < 4; k++) vStac([c[2][1] + 12, c[2][2] + 12], s0 + k * 0.275, 0.026);
      });
      var f = t + 5.8;   // the final chord turns major
      vImpact(f); vGong(f, 38); vTimp(f, 38, 1); vSub(26, f, 2.4, 0.18);
      vBrass([50, 57, 62, 66, 69], f, 2.2, 0.06); vStrings([62, 66, 69, 74, 78], f, 2.4, 0.04); vChoir([62, 66, 69, 74], f, 2.4, 0.055);
      [62, 66, 69, 74, 78, 81].forEach(function (m, k) { vHarp(m, f + 0.05 + k * 0.07); });
      return 8.4;
      });
    },

    introCut: introCut,
    setIntroTrack: function (b64, gain) { ITRACK.b64 = b64 || ''; ITRACK.gain = gain || 1; decodeIntroTrack(); },
    introTrackReady: function () { decodeIntroTrack(); return !!ITRACK.buf; },
    introTrack: function (offset) {
      if (!ok() || !ITRACK.buf) return 0;
      offset = Math.max(0, offset || 0); if (offset >= ITRACK.buf.duration - 0.1) return 0;
      return viaIntro(function () {
        var t = ac.currentTime + 0.03, src = ac.createBufferSource(), g = ac.createGain();
        src.buffer = ITRACK.buf; g.gain.value = ITRACK.gain; src.connect(g); g.connect(musBus); src.start(t, offset);
        return ITRACK.buf.duration;
      });
    },

    // ---------- effects ----------
    // dog tags, a ping, a deep pop. The ping climbs through each tier of 25 kills (about two thirds of an octave);
    // the next tier starts it over, bigger. Old tails fade out once too many are ringing at once.
    kill: function (chain) {
      if (!ok() || !throttle('kill', 40)) return; var t = ac.currentTime;
      var tier = Math.floor(chain / 25), inTier = chain % 25, tb = Math.min(5, tier), rate = Math.pow(2, inTier * 0.65 / 24);
      if (!BANK['kp' + tb]) { FX.killTags(t, 0); FX.killPing(t + 0.03, tb); FX.killPop(t + 0.06, tb); return; }
      var lv = 0.62 + tb * 0.08;   // the whole sound gets louder as well as bigger with each tier
      kq(play('kt' + Math.floor(Math.random() * 3), t, 0.85, jit(), sfxBus, 0, 0, true));
      kq(play('kp' + tb, t + 0.03, 0.75, rate, sfxBus, 0, 0, true));
      kq(play('kb' + tb, t + 0.06, lv, 0.97 + Math.random() * 0.06, sfxBus, 0, 0, true));
      if (inTier >= 10 && inTier % 5 === 0) kq(play('kp' + tb, t + 0.1, 0.55, rate * 1.5, sfxBus, 0, 0, true));   // a double ping every 5th kill late in a tier
    },
    tierUp: function (tier) {
      if (!ok()) return; var t = ac.currentTime, low = 1 + Math.min(tier, 6) * 0.12;
      drum(t, 60 / low, 1); drum(t + 0.18, 50 / low, 1); drum(t + 0.36, 42 / low, 1.1);
      horn(t + 0.05, [73.4 / low, 110 / low, 146.8 / low], 1.6, 0.4);
      bell(t + 0.05, 392 / low, 0.14, 2.2); bell(t + 0.05, 196 / low, 0.12, 2.6);
      noise(t, 1, 0.12, 'bandpass', 1200, 3, 200);
    },
    skull: function () {
      if (!ok()) return; var t = ac.currentTime;
      osc('sine', 70, 28, t, 2.2, 0.9, null, 0.05);
      var s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noiseBuf; fl.type = 'bandpass'; fl.frequency.setValueAtTime(300, t); fl.frequency.exponentialRampToValueAtTime(5000, t + 1.1); fl.Q.value = 1.5;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 1.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      s.connect(fl); fl.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + 1.3);
      [38.9, 46.2, 58.3, 77.8].forEach(function (f) { [0.993, 1.007].forEach(function (d) {
        var o = ac.createOscillator(), lp = ac.createBiquadFilter(), gg = ac.createGain();
        o.type = 'sawtooth'; o.frequency.value = f * d; lp.type = 'lowpass'; lp.frequency.value = 700;
        gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(0.06, t + 0.9); gg.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
        o.connect(lp); lp.connect(gg); gg.connect(sfxBus); o.start(t); o.stop(t + 3.3);
      }); });
      drum(t + 1.1, 36, 1.2); bell(t + 1.1, 98, 0.16, 3);
    },
    jaw: function () {
      if (!ok()) return; var t = ac.currentTime;
      osc('sawtooth', 95, 55, t, 0.55, 0.16, null, 0.05); noise(t, 0.5, 0.25, 'bandpass', 420, 4, 260);
      noise(t + 0.25, 0.9, 0.45, 'lowpass', 900, 0.8, 140); osc('sawtooth', 70, 40, t + 0.25, 0.9, 0.2);
      bell(t + 0.3, 1568, 0.05, 1.6); bell(t + 0.38, 2349, 0.04, 1.6);
    },
    refuse: function () { if (!ok()) return; fx('refuse', 1); },
    shot: function (kind) {
      if (!ok() || !throttle('shot', kind === 'smg' || kind === 'lmg' ? 55 : kind === 'flamer' ? 110 : 40)) return;
      var k = SHOTS.indexOf(kind) >= 0 ? kind : 'pistol', t = ac.currentTime, buf = BANK['s_' + k];
      if (LASTSHOT) { var o = LASTSHOT; LASTSHOT = null; try { o.g.gain.cancelScheduledValues(t); o.g.gain.setValueAtTime(o.g.gain.value, t); o.g.gain.linearRampToValueAtTime(0.0001, t + 0.012); o.s.stop(t + 0.02); } catch (e) { } }
      if (!buf) { FX.shot(t, k); return; }
      var src = ac.createBufferSource(), g = ac.createGain(); src.buffer = buf; src.playbackRate.value = jit(); src.connect(g); g.connect(sfxBus); src.start(t);
      var me = { s: src, g: g }; LASTSHOT = me; src.onended = function () { if (LASTSHOT === me) LASTSHOT = null; try { g.disconnect(); } catch (e) { } };
    },
    boom: function (big) { if (!ok() || !throttle('boom', 90)) return; if (!sfx('boom' + (big ? 1 : 0))) FX.boom(ac.currentTime, big); },
    hurt: function () { if (!ok() || !throttle('hurt', 160)) return; fx('hurt'); },
    dash: function () { if (!ok()) return; fx('dash'); },
    zap: function () { if (!ok() || !throttle('zap', 70)) return; fx('zap'); },
    heal: function () { if (!ok()) return; fx('heal', 1); },
    jam: function () { if (!ok() || !throttle('jam', 300)) return; fx('jam', 1); },
    waveStart: function (boss) {
      if (!ok()) return; var t = ac.currentTime + 0.02;
      drum(t, 62, 0.85); drum(t + 0.32, 52, 0.95); if (boss) drum(t + 0.64, 44, 1);
      horn(t + 0.05, boss ? [36.7, 55, 73.4] : [73.4, 110, 146.8], boss ? 2.4 : 1.6, boss ? 0.42 : 0.32);
      noise(t, 1.2, 0.13, 'bandpass', 900, 3, 300);
    },
    waveClear: function () { if (!ok()) return; var t = ac.currentTime; [587.3, 698.5, 880, 1174.7].forEach(function (f, i) { bell(t + i * 0.09, f, 0.11, 0.9); }); },
    roar: function () {
      if (!ok()) return; var t = ac.currentTime;
      [55, 58.3, 82.4].forEach(function (f) { osc('sawtooth', f * 1.3, f * 0.8, t, 1.4, 0.16, null, 0.15); });
      noise(t, 1.3, 0.3, 'lowpass', 500, 1, 200);
    },
    alarm: function () { if (!ok() || !throttle('alarm', 250)) return; fx('alarm', 1); },
    grab: function () { if (!ok()) return; fx('grab', 1); },
    tap: function (n) { if (!ok()) return; fx('tap', (500 + n * 90) / 500); },
    escape: function () { if (!ok()) return; fx('escape', 1); },
    crush: function () { if (!ok()) return; fx('crush', 1); },
    cardIn: function (i) { if (!ok()) return; fx('cardIn', 1 + i * 0.3); },
    cardShot: function () { if (!ok()) return; fx('cardShot', 1); },
    rare: function (r) { if (!ok() || r < 3) return; var t = ac.currentTime + 0.25; var base = r >= 5 ? 220 : 880; [0, 4, 7, 12].forEach(function (s, i) { bell(t + i * 0.06, base * Math.pow(2, s / 12), r >= 5 ? 0.06 : 0.07, 0.9); }); if (r >= 5) osc('sawtooth', 55, 45, t, 0.8, 0.12, null, 0.1); },
    discover: function (r) { if (!ok() || !throttle('disc', 200)) return; var t = ac.currentTime + 0.05; for (var i = 0; i <= Math.min(4, r); i++) bell(t + i * 0.05, 1568 * Math.pow(2, [0, 4, 7, 12, 16][i] / 12), 0.05, 0.6); },
    unlock: function () { if (!ok()) return; var t = ac.currentTime; [523.3, 659.3, 784, 1046.5].forEach(function (f, i) { osc('square', f, f, t + i * 0.08, 0.14, 0.06); bell(t + i * 0.08, f * 2, 0.05, 0.6); }); },
    milestone: function () { if (!ok()) return; var t = ac.currentTime; horn(t, [146.8, 220], 0.7, 0.18); bell(t, 2093, 0.08, 1); },
    death: function () { if (!ok()) return; var t = ac.currentTime; osc('sawtooth', 220, 40, t, 1.4, 0.22, null, 0.02); noise(t, 1, 0.3, 'lowpass', 600, 1, 80); drum(t + 0.1, 40, 0.9); },
    click: function () { if (!ok()) return; fx('click', 1); }
,
    // ---------- new effects ----------
    // A-10 flyover: engine whine and roar sweeping past, with a doppler drop
    // A-10 flyover: the roar sweeping past left to right, the TF34 "hog whistle" with a doppler drop, a low rumble at the pass
    a10Jet: function (dur, mini) {
      if (!ok()) return; var t = ac.currentTime; dur = dur || 2.8;
      var bus = ac.createGain(); bus.gain.value = mini ? 0.7 : 1;
      if (ac.createStereoPanner) { var pn = ac.createStereoPanner(); pn.pan.setValueAtTime(-0.85, t); pn.pan.linearRampToValueAtTime(0.85, t + dur); bus.connect(pn); pn.connect(loudBus); } else bus.connect(loudBus);
      var s = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf; s.loop = true;
      bp.type = 'bandpass'; bp.Q.value = 0.8; bp.frequency.setValueAtTime(800, t); bp.frequency.exponentialRampToValueAtTime(2800, t + dur * 0.45); bp.frequency.exponentialRampToValueAtTime(340, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.62, t + dur * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(bp); bp.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.1);
      [3140, 3195].forEach(function (f) {
        var o = ac.createOscillator(), og = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f * 1.08, t); o.frequency.linearRampToValueAtTime(f, t + dur * 0.45); o.frequency.exponentialRampToValueAtTime(f * 0.72, t + dur);
        og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.03, t + dur * 0.45); og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(og); og.connect(bus); o.start(t); o.stop(t + dur + 0.1);
      });
      var w = ac.createOscillator(), wg = ac.createGain(); w.type = 'sawtooth'; w.frequency.setValueAtTime(2300, t); w.frequency.exponentialRampToValueAtTime(2900, t + dur * 0.45); w.frequency.exponentialRampToValueAtTime(1300, t + dur);
      wg.gain.setValueAtTime(0.0001, t); wg.gain.exponentialRampToValueAtTime(0.02, t + dur * 0.45); wg.gain.exponentialRampToValueAtTime(0.0001, t + dur); w.connect(wg); wg.connect(bus); w.start(t); w.stop(t + dur + 0.1);
      noise(t + dur * 0.3, dur * 0.7, 0.45, 'lowpass', 500, 0.8, 80, bus);
      osc('sine', 52, 38, t + dur * 0.35, dur * 0.5, 0.35, bus, dur * 0.12);
    },
    // the GAU-8: the rounds' crackle lands first, then the BRRRT and its echoes (baked once; a live version until then)
    a10Brrt: function (delay, dur, mini) {
      if (!ok()) return; var t = ac.currentTime + (delay || 0); dur = dur || 1.1;
      var b = BANK[mini ? 'brrt2' : 'brrt'];
      if (b) {
        var src = ac.createBufferSource(), g0 = ac.createGain(); src.buffer = b; g0.gain.value = mini ? 1.1 : 1.6; src.connect(g0); g0.connect(loudBus); src.start(t);
        var h = BANK.hits; if (h) { var hs = ac.createBufferSource(), hg = ac.createGain(); hs.buffer = h; hg.gain.value = mini ? 0.5 : 0.9; hs.connect(hg); hg.connect(sfxBus); hs.start(ac.currentTime); }
        return;
      }
      var o = ac.createOscillator(), sh = ac.createWaveShaper(), lp = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(68, t); o.frequency.linearRampToValueAtTime(62, t + dur);
      sh.curve = distCurve(40); lp.type = 'lowpass'; lp.frequency.value = 2200;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.04); g.gain.setValueAtTime(0.5, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
      o.connect(sh); sh.connect(lp); lp.connect(g); g.connect(loudBus); o.start(t); o.stop(t + dur + 0.3);
      noise(t + dur * 0.2, dur + 0.6, 0.18, 'lowpass', 700, 0.7, 120);
    },
    // a different sound for each kind of dash, layered over the usual whoosh
    dashKind: function (k) {
      if (!ok()) return; fx('dash'); var t = ac.currentTime, i;
      switch (k) {
        case 'shield': drum(t, 70, 0.6); break;
        case 'slide': noise(t, 0.3, 0.2, 'lowpass', 900, 0.8, 300); break;
        case 'smoke': noise(t, 0.6, 0.3, 'lowpass', 700, 0.8, 200); break;
        case 'heart': drum(t, 62, 0.7); drum(t + 0.18, 58, 0.6); break;
        case 'flake': bell(t, 2637, 0.05, 0.6); bell(t + 0.05, 3520, 0.04, 0.5); noise(t, 0.4, 0.1, 'highpass', 6000, 0.7); break;
        case 'flame': noise(t, 0.45, 0.32, 'bandpass', 500, 0.7, 2200); osc('sawtooth', 90, 60, t, 0.4, 0.06); break;
        case 'bolt': case 'storm': osc('sawtooth', 1500, 200, t, 0.15, 0.1); noise(t + 0.05, 0.6, 0.35, 'lowpass', 1600, 0.7, 120); drum(t + 0.06, 45, 0.7); break;
        case 'drop': for (i = 0; i < 5; i++) osc('sine', 400 + Math.random() * 600, 900 + Math.random() * 600, t + i * 0.05, 0.05, 0.06); break;
        case 'blink': osc('sine', 300, 2400, t, 0.12, 0.12); osc('sine', 2400, 600, t + 0.12, 0.15, 0.08); break;
        case 'ghost': noise(t, 0.6, 0.12, 'bandpass', 900, 3, 1800); osc('sine', 440, 330, t, 0.6, 0.04, null, 0.2); break;
        case 'quake': drum(t + 0.15, 40, 1); noise(t + 0.15, 0.5, 0.3, 'lowpass', 400, 0.8, 90); break;
        case 'fang': noise(t, 0.12, 0.3, 'bandpass', 3000, 2, 900); break;
        case 'well': osc('sine', 300, 40, t, 0.7, 0.3); noise(t, 0.7, 0.12, 'bandpass', 2000, 2, 200); break;
        case 'holo': for (i = 0; i < 4; i++) osc('square', 800 + i * 400, 800 + i * 400, t + i * 0.05, 0.04, 0.04); break;
        case 'rocket': noise(t, 0.4, 0.45, 'lowpass', 1800, 0.7, 400); osc('sawtooth', 70, 40, t, 0.4, 0.15); break;
        case 'clock': osc('square', 1800, 1800, t, 0.02, 0.06); osc('square', 1400, 1400, t + 0.16, 0.02, 0.06); osc('sine', 600, 120, t, 0.8, 0.12); break;
        case 'axe': osc('sawtooth', 110, 70, t, 0.3, 0.14); drum(t, 55, 0.7); break;
        case 'halo': [523.3, 659.3, 784].forEach(function (f) { bell(t, f, 0.05, 1.2); }); break;
        case 'star': noise(t, 0.18, 0.25, 'bandpass', 4000, 3, 1500); noise(t + 0.1, 0.5, 0.2, 'lowpass', 600, 0.8, 150); break;
        case 'meteor': noise(t, 0.4, 0.3, 'bandpass', 300, 0.8, 3000); break;
        case 'dragon': osc('sawtooth', 180, 70, t + 0.15, 0.6, 0.18); noise(t + 0.15, 0.6, 0.35, 'lowpass', 1400, 0.8, 300); break;
        case 'rift': osc('sawtooth', 220, 40, t, 0.6, 0.12); noise(t, 0.6, 0.2, 'bandpass', 600, 4, 120); break;
      }
    },
    impacts: function () { if (!ok() || !throttle('imp', 70)) return; fx('impacts'); },
    airReady: function () { if (!ok()) return; var t = ac.currentTime; [0, 0.12, 0.24].forEach(function (d, i) { osc('square', 1200 + i * 200, 1200 + i * 200, t + d, 0.07, 0.05); }); noise(t, 0.4, 0.05, 'bandpass', 2500, 4); },
    radio: function () { if (!ok()) return; var t = ac.currentTime; noise(t, 0.5, 0.08, 'bandpass', 1800, 3); osc('square', 900, 900, t + 0.05, 0.1, 0.04); osc('square', 900, 900, t + 0.25, 0.1, 0.04); },
    // the wheel
    wheelTick: function (k) { if (!ok()) return; var t = ac.currentTime; osc('square', 1500 + (k || 0) * 30, 900, t, 0.02, 0.06); noise(t, 0.015, 0.08, 'highpass', 5000); },
    wheelLand: function (bad) {
      if (!ok()) return; var t = ac.currentTime;
      if (bad) { drum(t, 40, 1.1); osc('sawtooth', 110, 55, t, 1.4, 0.2); bell(t, 98, 0.16, 3); }
      else { [0, 4, 7, 12, 16].forEach(function (st, i) { bell(t + i * 0.06, 784 * Math.pow(2, st / 12), 0.07, 1); }); }
    },
    // the skull laughs: "HA HA HA HA" falling in pitch, with a growl under it
    // the skull's laugh: a deep demonic "HA HA HA ... HAAA" in three voices (the laugh, an octave below, a fifth above),
    // over a growl and a sub boom, sent into its own cavernous reverb
    laugh: function () {
      if (!ok()) return; var t = ac.currentTime;
      var bus = ac.createGain(), rv = ac.createConvolver(), rg = ac.createGain();
      if (!LAUGH_IR) LAUGH_IR = impulse(2.8);
      rv.buffer = LAUGH_IR; rg.gain.value = 0.5; bus.connect(sfxBus); bus.connect(rv); rv.connect(rg); rg.connect(sfxBus);
      setTimeout(function () { try { bus.disconnect(); rv.disconnect(); rg.disconnect(); } catch (e) { } }, 6000);
      var F = [[520, 4], [880, 5], [2350, 8]], Fd = [[380, 3], [700, 4], [1900, 6]];
      var at = [0, 0.2, 0.38, 0.55, 0.71, 0.87, 1.04];
      at.forEach(function (o, i) {
        var last = i === at.length - 1, tt = t + o, f = 112 - i * 3, d = last ? 0.62 : 0.16, v = 0.26 + i * 0.025;
        voice(tt, f * 1.12, f * 0.8, d, v, F, bus); voice(tt, f * 0.5, f * 0.4, d, v * 0.85, Fd, bus); voice(tt, f * 1.5, f * 1.15, d, v * 0.22, F, bus);
        noise(tt, 0.05, 0.1, 'bandpass', 1300, 1.2, null, bus);
      });
      osc('sawtooth', 50, 36, t, 1.9, 0.15, bus, 0.18); osc('sine', 62, 24, t, 0.9, 0.65, bus, 0.005);
      noise(t, 1.9, 0.09, 'lowpass', 260, 1, 110, bus); osc('sine', 38, 29, t + 1.04, 1.1, 0.42, bus, 0.04);
    },
    // the bite: a huge chomp and cracking glass
    bite: function () {
      if (!ok()) return; var t = ac.currentTime;
      noise(t, 0.35, 0.8, 'lowpass', 1600, 0.8, 200); osc('sine', 110, 30, t, 0.6, 0.9);
      noise(t + 0.02, 0.25, 0.4, 'bandpass', 2600, 3); noise(t + 0.05, 0.9, 0.25, 'highpass', 5000, 0.8);
      for (var i = 0; i < 6; i++) osc('square', 2000 + Math.random() * 3000, 800, t + 0.06 + i * 0.03, 0.03, 0.05);
    },
    // the Overlord: a long layered roar, then everything getting sucked in
    overlordRoar: function () {
      if (!ok()) return; var t = ac.currentTime;
      [41, 43.6, 55, 61.7].forEach(function (f, i) { osc('sawtooth', f * 1.5, f * 0.75, t + i * 0.04, 2.8, 0.13, null, 0.25); });
      voice(t, 120, 70, 2.6, 0.3, [[500, 4], [900, 5], [2200, 8]]);
      noise(t, 2.8, 0.4, 'lowpass', 600, 1, 120); noise(t + 0.1, 2, 0.12, 'bandpass', 2400, 2, 800);
      drum(t, 34, 1.2); bell(t, 73.4, 0.15, 4);
    },
    absorb: function (dur) {
      if (!ok()) return; var t = ac.currentTime; dur = dur || 1.6;
      noise(t, dur, 0.35, 'bandpass', 4000, 2, 180);
      osc('sine', 60, 240, t, dur, 0.25, null, dur * 0.8); osc('sawtooth', 45, 180, t, dur, 0.08, null, dur * 0.8);
    },
    gulp: function () { if (!ok() || !throttle('gulp', 60)) return; fx('gulp'); },
    // a boss mutating into its next form
    mutate: function () {
      if (!ok()) return; var t = ac.currentTime;
      var s = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf; s.loop = true;
      bp.type = 'bandpass'; bp.Q.value = 2; bp.frequency.setValueAtTime(200, t); bp.frequency.exponentialRampToValueAtTime(4000, t + 1);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
      s.connect(bp); bp.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + 1.2);
      voice(t + 0.9, 140, 60, 1.4, 0.3, [[600, 4], [1000, 5]]); drum(t + 1, 38, 1.1); noise(t + 1, 0.8, 0.4, 'lowpass', 900, 0.8, 100);
    },
    // the Overlord's first health bar breaking
    barBreak: function () {
      if (!ok()) return; var t = ac.currentTime;
      noise(t, 0.6, 0.5, 'highpass', 3000, 0.7); for (var i = 0; i < 10; i++) osc('square', 1800 + Math.random() * 4000, 700, t + i * 0.025, 0.04, 0.05);
      drum(t, 36, 1.2); [[146.8, 174.6, 220], [155.6, 196, 233]].forEach(function (c, k) { horn(t + 0.4 + k * 0.6, c, 1.2, 0.4); });
    },
    // the armory keeper's little noises
    keeper: function (k) {
      if (!ok()) return; var t = ac.currentTime, i;
      switch (k) {
        case 'snore': noise(t, 1.2, 0.1, 'lowpass', 420, 2.5, 220); osc('sawtooth', 64, 52, t + 0.1, 1, 0.035, null, 0.4); break;
        case 'jolt': osc('square', 280, 920, t, 0.12, 0.05); noise(t, 0.05, 0.12, 'bandpass', 1500, 1); break;
        case 'flick': osc('sine', 2300, 3100, t, 0.05, 0.07); noise(t, 0.02, 0.1, 'highpass', 6000); break;
        case 'catch': noise(t, 0.04, 0.2, 'lowpass', 1200); bell(t, 2800, 0.025, 0.25); break;
        case 'click': osc('square', 1500, 600, t, 0.02, 0.1); noise(t, 0.03, 0.2, 'bandpass', 2500, 2); osc('square', 1100, 500, t + 0.07, 0.02, 0.09); noise(t + 0.07, 0.04, 0.25, 'bandpass', 1800, 2); break;
        case 'shing': bell(t, 3300, 0.035, 0.45); noise(t, 0.22, 0.07, 'highpass', 5000, 0.7, 9000); break;
        case 'slap': noise(t, 0.07, 0.55, 'bandpass', 1700, 0.8); osc('sine', 190, 80, t, 0.08, 0.3); break;
        case 'bell': bell(t, 2093, 0.1, 1.4); bell(t + 0.004, 3136, 0.035, 1); break;
        case 'flicker': for (i = 0; i < 4; i++) noise(t + i * 0.07 + Math.random() * 0.03, 0.03, 0.1, 'bandpass', 900, 3); osc('square', 120, 120, t, 0.32, 0.015); break;
        case 'applause': for (i = 0; i < 34; i++) noise(t + Math.random() * 1.9, 0.03, 0.05 + Math.random() * 0.05, 'bandpass', 1400 + Math.random() * 1400, 1.4); break;
        case 'glitch': for (i = 0; i < 12; i++) { var tt = t + i * 0.035 + Math.random() * 0.02; osc('square', 200 + Math.random() * 2400, 100 + Math.random() * 600, tt, 0.03, 0.05); } noise(t, 0.45, 0.16, 'bandpass', 3000, 0.6, 400); break;
        case 'buzz':
          var o = ac.createOscillator(), g = ac.createGain(), lf = ac.createOscillator(), lg = ac.createGain();
          o.type = 'sawtooth'; o.frequency.value = 230; lf.frequency.value = 7; lg.gain.value = 40; lf.connect(lg); lg.connect(o.frequency);
          g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.012, t + 0.3); g.gain.setValueAtTime(0.012, t + 4); g.gain.linearRampToValueAtTime(0.0001, t + 4.4);
          o.connect(g); g.connect(sfxBus); o.start(t); lf.start(t); o.stop(t + 4.5); lf.stop(t + 4.5); break;
      }
    },
    bossIntro: function () { if (!ok()) return; var t = ac.currentTime; drum(t, 44, 1); drum(t + 0.25, 40, 1); horn(t, [55, 82.4, 110], 2, 0.4); bell(t, 110, 0.1, 2.5); }

  };
  return api;
})();
