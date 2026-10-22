  // ================= 1.9.993: ARMS foley: reloads, ready-ups, draws, the dodge, and things landing =================
  // Synthesized like every other sound in the game. A magazine release is a hard little click; a magazine leaving the
  // well is a short metal slide; seating one is a low thunk with a latch click on top; a bolt going home is a heavy
  // clack with a short ring. The AK's charging handle is a long rasp and a slam; the SCAR's reciprocating handle a
  // shorter one; a pistol slide a bright snap. The shotgun's shells go in with a push and a click, the revolver's
  // cylinder swings out with a soft clack, its ejector throws six empties that ring as they fall, and two half-moon
  // clips drop in with two clicks before the crane snaps shut. Cases that land ring (brass) or click (steel); a shotgun
  // hull thuds; a magazine clatters. A dodge roll is cloth and gear hitting the street.
  var ARMSFX = { last: {} };
  function aThr(k, ms) { var t = performance.now(); if (ARMSFX.last[k] && t - ARMSFX.last[k] < ms) return false; ARMSFX.last[k] = t; return true; }
  function aOut(vol, pan) {
    var g = ac.createGain(); g.gain.value = vol;
    if (pan && ac.createStereoPanner) { var p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(sfxBus); }
    else g.connect(sfxBus);
    setTimeout(function () { try { g.disconnect(); } catch (e) { } }, 2500);
    return g;
  }
  function aClick(t, f, vol, bus) { noise(t, 0.012, vol, 'highpass', f || 3200, 0.8, null, bus); osc('square', (f || 3200) * 0.9, (f || 3200) * 0.6, t, 0.01, vol * 0.25, bus); }
  function aSlide(t, f0, f1, dur, vol, bus) { noise(t, dur, vol, 'bandpass', f0, 2.2, f1, bus); }
  function aThunk(t, f, vol, bus) { osc('sine', f * 2, f, t, 0.07, vol, bus, 0.002); noise(t, 0.03, vol * 0.5, 'lowpass', 900, 0.7, null, bus); }
  function aClack(t, vol, bus, bright) {
    noise(t, 0.045, vol, 'bandpass', bright ? 3400 : 2400, 2.4, null, bus); osc('triangle', bright ? 1400 : 900, bright ? 600 : 380, t, 0.06, vol * 0.5, bus, 0.001);
    [[1, 0.25], [2.71, 0.12], [5.2, 0.05]].forEach(function (p) { osc('sine', (bright ? 2100 : 1500) * p[0], (bright ? 2100 : 1500) * p[0], t + 0.004, 0.16 / Math.sqrt(p[0]), vol * p[1], bus, 0.001); });
  }
  function aCloth(t, dur, vol, f, bus) { noise(t, dur, vol, 'lowpass', f || 900, 0.5, (f || 900) * 0.6, bus); }
  function aRattle(t, n, vol, bus) { for (var i = 0; i < n; i++) aClick(t + i * (0.025 + Math.random() * 0.03), 2200 + Math.random() * 1800, vol * (0.5 + Math.random() * 0.5), bus); }
  function aRing(t, f, vol, bus) { [[1, 1], [2.32, 0.5], [4.1, 0.25]].forEach(function (p) { osc('sine', f * p[0], f * p[0] * 0.995, t, 0.09 / Math.sqrt(p[0]), vol * p[1], bus, 0.001); }); }
  // name: which sound; rate: pitch and speed (a heavier gun plays lower), pan: left/right, vol
  function armsSound(name, rate, pan, vol) {
    if (!ok()) return;
    var t = ac.currentTime, r = rate || 1, b = aOut((vol == null ? 0.9 : vol) * (VOL.sfx == null ? 1 : 1), pan);
    switch (name) {
      case 'magRelease': aClick(t, 3600 / r, 0.35, b); break;
      case 'magOut': aClick(t, 3000 / r, 0.3, b); aSlide(t + 0.01, 2200 / r, 1200 / r, 0.09, 0.32, b); break;
      case 'magIn': aSlide(t, 1500 / r, 2400 / r, 0.06, 0.22, b); aThunk(t + 0.05, 140 / r, 0.65, b); aClick(t + 0.07, 2800 / r, 0.4, b); break;
      case 'magTap': aThunk(t, 120 / r, 0.4, b); break;
      case 'boltCatch': aClick(t, 2600, 0.3, b); aClack(t + 0.03, 0.62 / r, b); break;
      case 'chargeBack': aSlide(t, 1100 / r, 3200 / r, 0.12, 0.42, b); aClick(t + 0.12, 2400 / r, 0.4, b); break;
      case 'chargeHome': aClack(t, 0.7 / r, b); break;
      case 'slideRack': aSlide(t, 1800, 3800, 0.06, 0.3, b); aClack(t + 0.07, 0.5, b, true); break;
      case 'slideDrop': aClack(t, 0.55, b, true); break;
      case 'decock': aClick(t, 2000, 0.4, b); aClick(t + 0.03, 3000, 0.25, b); break;
      case 'shellIn': aClick(t, 2100, 0.28, b); aSlide(t + 0.01, 900, 1500, 0.05, 0.25, b); aClick(t + 0.06, 3200, 0.32, b); break;
      case 'portLoad': aThunk(t, 180, 0.4, b); aClick(t + 0.02, 2600, 0.3, b); break;
      case 'boltRelease': aClick(t, 3000, 0.3, b); aClack(t + 0.02, 0.75, b); break;
      case 'cylOpen': aClick(t, 2400, 0.35, b); aClack(t + 0.04, 0.35, b, true); break;
      case 'eject': aThunk(t, 160, 0.35, b); for (var i = 0; i < 6; i++) aRing(t + 0.12 + Math.random() * 0.22, 3600 + Math.random() * 1500, 0.08 + Math.random() * 0.05, b); break;
      case 'moonIn': aClick(t, 2200, 0.35, b); aThunk(t + 0.02, 220, 0.25, b); break;
      case 'cylClose': aClack(t, 0.6, b, true); aClick(t + 0.03, 3600, 0.3, b); break;
      case 'holster': aCloth(t, 0.14, 0.2, 1100, b); aThunk(t + 0.12, 170, 0.45, b); aClick(t + 0.14, 2600, 0.35, b); break;
      case 'draw': aClick(t, 2400, 0.3, b); aCloth(t + 0.01, 0.16, 0.22, 1300, b); break;
      case 'sling': aCloth(t, 0.22, 0.2, 800, b); aRattle(t + 0.08, 3, 0.2, b); break;
      case 'readyUp': aCloth(t, 0.12, 0.18, 1200, b); aRattle(t + 0.03, 2, 0.16, b); break;
      case 'readyDown': aCloth(t, 0.16, 0.14, 900, b); aRattle(t + 0.06, 1, 0.12, b); break;
      case 'sprintStep': if (aThr('sprintStep', 200)) aRattle(t, 2, 0.14, b); break;
      case 'dodge': aCloth(t, 0.34, 0.38, 700, b); noise(t + 0.02, 0.3, 0.2, 'bandpass', 600, 1.2, 180, b); aThunk(t + 0.2, 90, 0.6, b); aRattle(t + 0.22, 4, 0.22, b); aCloth(t + 0.32, 0.12, 0.2, 500, b); break;
      // 1.9.997: the ten more guns' handling
      case 'paddle': aClick(t, 4200 / r, 0.3, b); aRing(t + 0.002, 3800, 0.06, b); break;
      case 'hkSlap': aCloth(t, 0.04, 0.2, 1400, b); aClack(t + 0.03, 0.75 / r, b); aRing(t + 0.035, 1900 / r, 0.14, b); aRing(t + 0.05, 2600 / r, 0.06, b); break;
      case 'coverOpen': aClick(t, 2600, 0.35, b); aSlide(t + 0.04, 400, 900, 0.26, 0.18, b); aThunk(t + 0.3, 150, 0.3, b); break;
      case 'coverClose': aThunk(t, 110 / r, 0.9, b); aClack(t + 0.01, 0.8 / r, b); aRing(t + 0.02, 1400 / r, 0.18, b); aRattle(t + 0.05, 3, 0.2, b); break;
      case 'pouchOff': aClick(t, 2800, 0.25, b); aCloth(t + 0.02, 0.2, 0.3, 700, b); aRattle(t + 0.06, 4, 0.22, b); break;
      case 'pouchOn': aCloth(t, 0.16, 0.28, 800, b); aClick(t + 0.12, 3000, 0.35, b); aThunk(t + 0.13, 160, 0.4, b); break;
      case 'beltLay': aRattle(t, 7, 0.26, b); aClick(t + 0.28, 3200, 0.3, b); break;
      case 'oprodBack': aSlide(t, 900 / r, 2600 / r, 0.16, 0.42, b); aRing(t + 0.14, 2100 / r, 0.22, b); aClick(t + 0.15, 2400 / r, 0.35, b); break;
      case 'oprodHome': aClack(t, 0.85 / r, b); aRing(t + 0.01, 1700 / r, 0.3, b); aRing(t + 0.02, 3300 / r, 0.12, b); break;
      case 'pumpBack': aClick(t, 2200 / r, 0.3, b); aSlide(t + 0.01, 700 / r, 1900 / r, 0.14, 0.45, b); aThunk(t + 0.13, 170 / r, 0.4, b); aRing(t + 0.13, 1200 / r, 0.1, b); break;
      case 'pumpHome': aSlide(t, 1900 / r, 800 / r, 0.1, 0.4, b); aClack(t + 0.1, 0.8 / r, b); aRing(t + 0.11, 1000 / r, 0.14, b); break;
      case 'loaderIn': aRattle(t, 5, 0.2, b); aClick(t + 0.14, 2600, 0.3, b); aThunk(t + 0.15, 240, 0.25, b); break;
      case 'loaderOff': aClick(t, 2200, 0.25, b); aCloth(t + 0.01, 0.08, 0.15, 1200, b); break;
      case 'breakOpen': aClick(t, 3000, 0.4, b); aThunk(t + 0.06, 140, 0.6, b); aSlide(t + 0.08, 500, 300, 0.18, 0.2, b); break;
      case 'hullPull': aSlide(t, 1200, 2200, 0.08, 0.26, b); aClick(t + 0.08, 2000, 0.2, b); break;
      case 'breakClose': aThunk(t, 120, 0.8, b); aClack(t + 0.01, 0.95, b); aClick(t + 0.09, 2600, 0.3, b); aClick(t + 0.14, 2600, 0.3, b); break;
      case 'dry': aClick(t, 2600, 0.42, b); break;
      case 'empty': aClick(t, 2000, 0.3, b); aClack(t + 0.02, 0.25, b); break;
    }
  }
  // something landing in the street: brass rings, steel clicks, a hull thuds, a magazine clatters
  function armsDrop(kind, pan, k) {
    if (!ok() || !aThr('drop' + kind, kind === 'mag' ? 90 : 35)) return;
    var t = ac.currentTime, v = Math.max(0.05, Math.min(1, k == null ? 0.6 : k)), b = aOut(0.9 * v, pan);
    if (kind === 'brass') { var cs = BANK['case' + Math.floor(Math.random() * 3)]; if (cs && Math.random() < 0.6) { var s = ac.createBufferSource(); s.buffer = cs; s.playbackRate.value = 0.95 + Math.random() * 0.2; s.connect(b); s.start(t); } else { aRing(t, 4200 + Math.random() * 1600, 0.16, b); aRing(t + 0.05 + Math.random() * 0.04, 3900 + Math.random() * 1200, 0.08, b); } }
    else if (kind === 'steel') { aClick(t, 2300 + Math.random() * 700, 0.3, b); aRing(t + 0.002, 2600 + Math.random() * 500, 0.06, b); }
    else if (kind === 'shell') { var sh = BANK['shell' + Math.floor(Math.random() * 3)]; if (sh) { var s2 = ac.createBufferSource(); s2.buffer = sh; s2.playbackRate.value = 0.92 + Math.random() * 0.15; s2.connect(b); s2.start(t); } else { aThunk(t, 210, 0.35, b); aRing(t + 0.01, 2600, 0.06, b); } }
    else if (kind === 'mag') { noise(t, 0.07, 0.42, 'lowpass', 1000, 0.8, 500, b); aThunk(t, 110, 0.55, b); aRattle(t + 0.03, 2, 0.25, b); }
  }
  var apiArms = {
    arms: function (n, rate, pan, vol) { try { armsSound(n, rate, pan, vol); } catch (e) { } },
    drop: function (kind, pan, k) { try { armsDrop(kind, pan, k); } catch (e) { } }
  };
