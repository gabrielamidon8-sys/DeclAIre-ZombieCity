  // ================= 1.9.997: a voice for each of the twenty guns =================
  // Every ARMS gun has its own shot, built the way sound designers layer a real one (the notes in SP/research14_guns.md,
  // part D): a mechanical click a few milliseconds BEFORE the report (the striker, or an open bolt slamming home), the
  // crack (the supersonic N-wave: 2–6 kHz, 5–20 ms, loud on 5.56 and 5.7×28, gone on .45 ACP and buckshot), the body
  // (the report: a band at the calibre's own centre that falls as the gas cools, with a 300–800 Hz knock under it), a
  // short tight sub for the heavy rounds, the action cycling after the shot (an AR's buffer spring, an AK's carrier run,
  // the MP5's rollers in their tube, the Mk 14's op-rod ring, a steel or a polymer slide, a revolver's frame ringing), and
  // a tail of echo whose length follows the gun's size. The magnums add the cylinder-gap side blast and a long frame
  // ring. The belt gun, the SMGs and the carbines are hard-trimmed per shot and the long tail plays once, when the burst
  // ends. A parallel copy of the body goes through a saturator so the punch has harmonics that read on a phone speaker.
  // Each gun is rendered in three takes (timing and pitch jittered) the first time it is loaded, so a stream never sounds
  // like one sample repeating, and nothing is rendered for guns that are never carried.
  //   ck: crack [hp Hz, dur, vol]   bd: body [Hz, dur, vol, end Hz]   kn: knock [Hz, dur, vol]   sb: sub [f0, f1, dur, vol]
  //   mech: the action (pre: what happens before the shot)   tl: tail per shot [dur, vol, lp Hz]   tlL: the long tail
  //   rg: frame ring [Hz, vol]   gp: cylinder-gap blast   sat: saturated body share   dur: sample length   cap: peak
  //   stream: trimmed per shot, long tail at burst end (gap: the gun's cycle)   duck: how far the radio dips   vol: level at play
  //   (a 5.56 carbine is a few dB louder than a 9 mm pistol at the shooter's ear; the stream guns also play at 0.85 a round)
  var G20 = {
    // ---- 5.56 / 5.45: hard crack, bright report, light sub ----
    m4a1: { ck: [3400, 0.012, 0.9], bd: [1700, 0.09, 0.5, 600], kn: [600, 0.06, 0.2], sb: [150, 45, 0.1, 0.3], mech: 'buffer', tl: [0.2, 0.12, 1100], tlL: [0.5, 0.16, 1100], sat: 0.2, dur: 0.42, cap: 0.76, stream: 1, gap: 0.075, duck: 0.26, vol: 1.2 },
    ak74m: { ck: [3000, 0.012, 0.75], bd: [1300, 0.1, 0.52, 500], kn: [500, 0.07, 0.26], sb: [140, 45, 0.1, 0.32], mech: 'akrun', tl: [0.22, 0.13, 1000], tlL: [0.52, 0.17, 1000], sat: 0.24, dur: 0.45, cap: 0.76, stream: 1, gap: 0.092, duck: 0.26, vol: 1.2 },
    aug: { ck: [3300, 0.011, 0.85], bd: [1700, 0.08, 0.45, 600], kn: [600, 0.06, 0.18], sb: [150, 46, 0.09, 0.28], mech: 'bullpup', tl: [0.2, 0.11, 1100], tlL: [0.48, 0.15, 1100], sat: 0.18, dur: 0.42, cap: 0.76, stream: 1, gap: 0.086, duck: 0.26, vol: 1.2 },
    m249: { ck: [3300, 0.012, 0.85], bd: [1600, 0.085, 0.5, 560], kn: [560, 0.06, 0.2], sb: [145, 45, 0.09, 0.3], mech: 'belt', tl: [0.16, 0.1, 1000], tlL: [0.6, 0.18, 1000], sat: 0.22, dur: 0.36, cap: 0.76, stream: 1, gap: 0.07, duck: 0.28, vol: 1.2 },
    // ---- 7.62×51: fuller low-mids, longer tails ----
    mk17: { ck: [2800, 0.013, 0.72], bd: [1000, 0.15, 0.7, 420], kn: [450, 0.08, 0.32], sb: [110, 35, 0.2, 0.6], mech: 'piston', tl: [0.6, 0.22, 900], sat: 0.3, dur: 0.85, cap: 0.82, duck: 0.34, vol: 1.08 },
    mk14: { ck: [2900, 0.013, 0.72], bd: [1050, 0.15, 0.7, 430], kn: [460, 0.09, 0.32], sb: [112, 36, 0.21, 0.6], mech: 'oprod', tl: [0.65, 0.22, 900], sat: 0.3, dur: 0.9, cap: 0.82, duck: 0.34, vol: 1.08 },
    // ---- 9×19 / 9×18 SMGs: snappy, short, closed or simple blowback ----
    mp5a3: { ck: [3900, 0.008, 0.6], bd: [1800, 0.055, 0.42, 700], kn: [700, 0.04, 0.14], sb: [165, 58, 0.055, 0.2], mech: 'mp5', tl: [0.14, 0.07, 1200], tlL: [0.36, 0.12, 1200], sat: 0.12, dur: 0.3, cap: 0.72, stream: 1, gap: 0.075, duck: 0.16 },
    pp19: { ck: [4000, 0.008, 0.55], bd: [2000, 0.05, 0.4, 800], kn: [700, 0.04, 0.14], sb: [160, 60, 0.05, 0.18], mech: 'blowback', tl: [0.14, 0.07, 1200], tlL: [0.34, 0.11, 1200], sat: 0.12, dur: 0.3, cap: 0.72, stream: 1, gap: 0.086, duck: 0.16 },
    aps: { ck: [3800, 0.008, 0.52], bd: [1700, 0.055, 0.38, 700], kn: [680, 0.04, 0.13], sb: [170, 60, 0.05, 0.18], mech: 'blowback', tl: [0.14, 0.07, 1200], tlL: [0.32, 0.1, 1200], sat: 0.1, dur: 0.3, cap: 0.7, stream: 1, gap: 0.08, duck: 0.14 },
    // ---- 9 mm pistols: a 600–1000 Hz report with a real crack ----
    m17: { ck: [3600, 0.009, 0.55], bd: [1500, 0.075, 0.45, 600], kn: [650, 0.05, 0.18], sb: [180, 55, 0.07, 0.24], mech: 'slideP', tl: [0.3, 0.12, 1100], sat: 0.14, dur: 0.5, cap: 0.72, duck: 0.18 },
    g17: { ck: [3650, 0.009, 0.55], bd: [1550, 0.072, 0.45, 620], kn: [660, 0.05, 0.17], sb: [182, 56, 0.07, 0.24], mech: 'slideP', tl: [0.3, 0.12, 1100], sat: 0.14, dur: 0.5, cap: 0.72, duck: 0.18 },
    m9: { ck: [3500, 0.009, 0.53], bd: [1450, 0.078, 0.46, 580], kn: [640, 0.05, 0.18], sb: [178, 54, 0.072, 0.24], mech: 'slideS', rf: 1900, rv: 0.035, tl: [0.3, 0.12, 1100], sat: 0.14, dur: 0.5, cap: 0.72, duck: 0.18 },
    fiveseven: { ck: [4400, 0.008, 0.8], bd: [2100, 0.055, 0.38, 800], kn: [800, 0.04, 0.12], sb: [190, 70, 0.05, 0.16], mech: 'slideP', tl: [0.28, 0.1, 1300], sat: 0.1, dur: 0.46, cap: 0.7, duck: 0.16, vol: 1.12 },
    // ---- .45 ACP: subsonic, no crack, a slower boom ----
    m1911: { ck: [2600, 0.01, 0.3], bd: [900, 0.11, 0.6, 380], kn: [420, 0.08, 0.4], sb: [130, 42, 0.12, 0.5], mech: 'slideS', rf: 1500, rv: 0.05, tl: [0.4, 0.16, 950], sat: 0.22, dur: 0.62, cap: 0.76, duck: 0.22 },
    m1917: { ck: [2600, 0.01, 0.3], bd: [900, 0.12, 0.62, 380], kn: [420, 0.09, 0.42], sb: [128, 42, 0.13, 0.5], mech: 'frame', rg: [2100, 0.05], gp: 0.22, tl: [0.46, 0.17, 950], sat: 0.22, dur: 0.68, cap: 0.76, duck: 0.22 },
    // ---- the magnums: the loudest handguns, a crack up at 2 kHz over a long low boom, and a frame that rings ----
    deagle: { ck: [2600, 0.014, 0.55], bd: [900, 0.19, 0.85, 350], kn: [380, 0.13, 0.5], sb: [105, 34, 0.24, 0.95], mech: 'slideS', rf: 1300, rv: 0.08, late: 1, tl: [0.7, 0.28, 850], sat: 0.34, dur: 0.95, cap: 0.86, duck: 0.4, vol: 1.1 },
    m29: { ck: [2900, 0.016, 1.0], bd: [2000, 0.06, 0.6, 700], kn: [150, 0.2, 0.6], sb: [95, 32, 0.28, 0.95], mech: 'frame', rg: [2400, 0.09], gp: 0.35, tl: [0.8, 0.3, 850], sat: 0.34, dur: 1.05, cap: 0.86, duck: 0.4, vol: 1.1 },
    // ---- 12 gauge: broadband, slow rise, almost no crack, a huge tail ----
    m1014: { ck: [2300, 0.014, 0.4], bd: [850, 0.24, 0.8, 300], kn: [300, 0.2, 0.5], sb: [100, 32, 0.26, 0.95], mech: 'inertia', tl: [0.7, 0.3, 700], sat: 0.3, dur: 0.95, cap: 0.86, duck: 0.38, vol: 1.06 },
    m590a1: { ck: [2300, 0.014, 0.38], bd: [820, 0.24, 0.8, 290], kn: [290, 0.2, 0.5], sb: [98, 32, 0.26, 0.95], mech: 'none', tl: [0.7, 0.3, 700], sat: 0.3, dur: 0.95, cap: 0.86, duck: 0.38, vol: 1.06 },
    coach: { ck: [2000, 0.016, 0.45], bd: [700, 0.26, 0.9, 260], kn: [240, 0.22, 0.55], sb: [90, 30, 0.28, 1], mech: 'none', tl: [0.8, 0.32, 650], sat: 0.36, dur: 1.1, cap: 0.88, duck: 0.42, vol: 1.1 }
  };
  // a struck piece of steel: inharmonic partials that die at different rates
  function gRing(t, f, vol, dur, b) { [[1, 1], [2.32, 0.5], [4.1, 0.25], [6.7, 0.1]].forEach(function (p) { osc('sine', f * p[0], f * p[0] * 0.996, t, dur / Math.sqrt(p[0]), vol * p[1], b, 0.001); }); }
  function gClack(t, f, vol, b, ring) { noise(t, 0.028, vol, 'bandpass', f, 2.4, null, b); osc('triangle', f * 0.55, f * 0.22, t, 0.04, vol * 0.4, b, 0.001); if (ring) gRing(t + 0.003, ring, vol * 0.3, 0.12, b); }
  function gClick(t, f, vol, b) { noise(t, 0.01, vol, 'highpass', f, 0.8, null, b); }
  // the action: what the shooter hears of the gun itself, before and after the report
  function gMech(t, D, R, b, j) {
    var k = D.mech;
    // before the shot: the striker or hammer; the open bolt of the belt gun slams home first
    if (k === 'belt') { gClack(t - 0.025, 2300, 0.18, b); osc('sine', 400, 250, t - 0.025, 0.03, 0.1, b, 0.001); noise(t - 0.02, 0.02, 0.06, 'bandpass', 1400, 1.5, 2200, b); }
    else if (k === 'frame' || k === 'none') gClick(t - 0.008, 3000, 0.12, b);
    else gClick(t - 0.006, 4000, 0.08, b);
    switch (k) {
      case 'buffer':      // the AR: the carrier back over the buffer spring (a tonal "sproing"), then home with a clack and a ring
        noise(t + 0.025, 0.03, 0.08, 'bandpass', 1500, 1.5, 2400, b); osc('triangle', j(420), 360, t + 0.03, 0.14, 0.055, b, 0.004);
        gClack(t + 0.09, 2400, 0.12, b, 1500); break;
      case 'akrun':       // the AK: a heavier steel rasp, a loose rattle, the carrier slamming home
        noise(t + 0.02, 0.08, 0.1, 'bandpass', j(900), 1.2, 1400, b); noise(t + 0.1, 0.03, 0.14, 'lowpass', 700, 0.7, null, b); osc('sine', 220, 160, t + 0.1, 0.04, 0.08, b, 0.001);
        gClick(t + 0.12, 2600, 0.05, b); gClick(t + 0.145, 3200, 0.03, b); break;
      case 'piston':      // the Mk 17: a short piston stroke and a bright carrier
        noise(t + 0.02, 0.06, 0.1, 'bandpass', j(1300), 1.4, 2000, b); gClack(t + 0.085, 2300, 0.13, b, 1700); break;
      case 'mp5':         // the MP5: rollers in their tube, a "ting" off the receiver, the bolt home
        noise(t + 0.02, 0.02, 0.08, 'bandpass', 2000, 2, null, b); osc('sine', j(3100), 3090, t + 0.02, 0.12, 0.035, b, 0.001);
        gClack(t + 0.065, 2600, 0.1, b, 1900); break;
      case 'blowback':    // a light fast slide
        noise(t + 0.015, 0.02, 0.08, 'bandpass', 3000, 2, null, b); gClack(t + 0.045, 2800, 0.1, b, 2300); break;
      case 'oprod':       // the Mk 14: the operating rod rings down the stock, then the bolt
        gRing(t + 0.015, j(1800), 0.06, 0.18, b); noise(t + 0.02, 0.05, 0.08, 'bandpass', 1200, 1.4, 1800, b); gClack(t + 0.09, 2200, 0.12, b, 1400); gClick(t + 0.11, 3600, 0.04, b); break;
      case 'belt':        // the M249: the carrier back, links rattling on the feed tray
        noise(t + 0.02, 0.05, 0.08, 'bandpass', j(1200), 1.4, 1800, b); gClick(t + 0.03, 2500, 0.05, b); gClick(t + 0.05, 3400, 0.04, b); gClick(t + 0.075, 4000, 0.03, b); break;
      case 'slideP':      // a polymer pistol: a dull "tok" when the slide comes home
        noise(t + 0.02, 0.025, 0.1, 'bandpass', 2600, 2, 3400, b); gClack(t + 0.06, 1800, 0.12, b); osc('sine', 700, 500, t + 0.06, 0.025, 0.06, b, 0.001); break;
      case 'slideS':      // a steel pistol: the slide rings (the Desert Eagle's gas action is later and heavier)
        var dl = D.late ? 0.012 : 0;
        noise(t + 0.025 + dl, 0.03, 0.12, 'bandpass', 2400, 2, 3200, b); gClack(t + 0.075 + dl, 2400, D.late ? 0.18 : 0.15, b); gRing(t + 0.078 + dl, j(D.rf || 1600), D.rv || 0.05, 0.14, b); break;
      case 'bullpup':     // the AUG: the action next to the ear, the polymer stock answering with a low "tok"
        noise(t + 0.02, 0.04, 0.14, 'bandpass', j(1600), 1.4, 2200, b); osc('sine', 320, 240, t + 0.02, 0.04, 0.1, b, 0.001);
        gClack(t + 0.085, 2200, 0.16, b); osc('sine', 300, 220, t + 0.085, 0.05, 0.08, b, 0.001); break;
      case 'inertia':     // the M1014: the bolt back and home, the shell lifter
        noise(t + 0.04, 0.05, 0.16, 'bandpass', j(1400), 1.4, 2000, b); gClack(t + 0.12, 2000, 0.2, b, 1200); gClick(t + 0.14, 3000, 0.05, b); break;
      case 'frame':       // a revolver: the frame rings from the first instant
        gRing(t + 0.003, j(D.rg[0]), D.rg[1], 0.25, b); break;
    }
  }
  // a tail's noise: it decays 60 dB over its length (a room's RT60), not the 80 dB of the short sounds' envelope, and its
  // level is raised to make up for what the low-pass takes out of white noise, so a long tail is really heard
  function gTailNoise(t, dur, vol, f0, f1, b) {
    var s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(), v = vol * 1.3 * Math.sqrt(20000 / Math.max(300, f0));
    s.buffer = noiseBuf; s.loop = true; fl.type = 'lowpass'; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur); fl.Q.value = 0.5;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(v * 0.001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(b); s.start(t, Math.random() * 0.4); s.stop(t + dur + 0.02);
  }
  // the tail: the street answering, with discrete slaps off the near and the far wall
  function gTail(t, tl, R, b, j) {
    gTailNoise(t + 0.012, tl[0], tl[1], tl[2], tl[2] * 0.3, b);
    noise(t + j(0.1), 0.05, tl[1] * 0.9, 'lowpass', tl[2] * 1.2, 0.7, tl[2] * 0.5, b); if (tl[0] >= 0.3) noise(t + j(0.23), 0.06, tl[1] * 0.5, 'lowpass', tl[2] * 0.9, 0.7, tl[2] * 0.45, b);
    if (tl[0] > 0.5) noise(t + j(0.42), 0.08, tl[1] * 0.3, 'lowpass', tl[2] * 0.8, 0.7, tl[2] * 0.4, b);
  }
  function gunRound20(t, D, R, b) {
    var j = function (x) { return x * jr(R, 0.1); }, ck = D.ck, bd = D.bd, kn = D.kn, sb = D.sb;
    gMech(t, D, R, b, j);
    // the crack (and the N-wave tick of a supersonic round)
    noise(t, ck[1], ck[2], 'highpass', j(ck[0]), 0.7, null, b); if (ck[2] >= 0.45) noise(t, 0.003, ck[2] * 0.8, 'highpass', 6000, 0.7, null, b);
    // the body and its knock, with a share through the saturator for harmonics
    noise(t, bd[1], bd[2], 'bandpass', j(bd[0]), 0.8, bd[3], b); noise(t + 0.003, kn[1], kn[2], 'bandpass', j(kn[0]), 1.2, kn[0] * 0.6, b);
    if (D.sat && BAKING && distIn) noise(t + 0.001, bd[1] * 0.7, bd[2] * D.sat, 'bandpass', bd[0] * 0.9, 0.9, bd[3], distIn);
    osc('sine', j(sb[0]), sb[1], t, sb[2], sb[3], b, 0.0015);
    if (D.gp) noise(t + 0.002, 0.02, D.gp, 'bandpass', 2200, 0.5, null, b);     // the cylinder gap: a broadband side blast
    gTail(t, D.tl, R, b, j);
  }
  var G20_BAKED = {};
  // render a gun's three takes (and its burst tail) the first time it is carried
  function gunPrep(key) {
    var D = G20[key]; if (!D || G20_BAKED[key] || !ac || typeof OfflineAudioContext === 'undefined') return; G20_BAKED[key] = 1;
    var seed = 0; for (var i = 0; i < key.length; i++) seed = seed * 31 + key.charCodeAt(i);
    for (var v = 0; v < 3; v++) (function (v) { bake('g_' + key + v, D.dur + 0.3, function (t) { gunRound20(t + 0.03, D, Z2(seed + v * 977), sfxBus); }, D.cap || 0.76); })(v);
    if (D.stream && D.tlL) bake('gt_' + key, D.tlL[0] + 0.4, function (t) { var R = Z2(seed + 5); gTail(t, D.tlL, R, sfxBus, function (x) { return x * jr(R, 0.1); }); }, 0.5);
  }
  function gunPrepAll() { for (var k in G20) gunPrep(k); }
