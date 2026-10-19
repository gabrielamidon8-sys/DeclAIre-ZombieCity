/* ================= settings =================
   One place for every option. "Basic" shows the handful most people want (quality, volume, weather, shake);
   "Advanced" opens everything, grouped into Graphics, Sound, Gameplay, Controls, Accessibility and System.
   Every change applies at once and is saved on the device. Graphics options default to "Auto", which follows the
   quality governor (perf.js) as it adapts to the device; picking a value pins that one feature. */
const SET_DEF = {
  quality: 'auto', res: 'auto', fps: 60, weather: 'auto', particles: 100, veg: 'auto', water: 'auto', light: 'auto', lux: 'auto', bloom: true, tod: 'cycle', nightDark: 'gentle', fog: 'auto',
  decals: 'normal', life: true, grade: true, vis: 'full', zoom: 100, fpsShow: false,
  sfxOn: true, volMaster: 100, volMusic: 80, volSfx: 90, volGun: 90, volAmb: 70, volUi: 70, aq: 'auto', night: false, mono: false, duck: true, steps: true,
  wxPlay: true, wxMode: 'dynamic', season: 'auto', world: 'mixed', scale: 'real', seedMode: 'random', seed: 0, ftext: true, districts: true, hints: true, vibrate: true, shake: 100,
  joy: 'float', joySize: 100, dashTap: true, lefty: false,
  aimKbm: 'manual', fireKbm: 'hold', aimPad: 'assist', firePad: 'stick', padDead: 18, padSwap: false, padRumble: true, xhair: 'cross', xhairSize: 100, xhairColor: 'yellow',
  motion: 'auto', flash: false, hudScale: 100, contrast: false,
  saver: 'auto', netPing: true, netArrows: true
};
const SYS_RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const SET = Object.assign({}, SET_DEF, { flash: SYS_RM }, (function () {
  // first launch of 1.9.50: carry over the old performance and sound choices
  const old = store.get('zc_settings', null); if (old) return old;
  const m = {}, ps = store.get('zc_perf', {}) || {}, au = store.get('zc_audio', null);
  if (ps.mode != null) m.quality = ps.mode; if (ps.cap != null) m.fps = ps.cap; if (ps.saver) m.saver = ps.saver;
  if (au) { m.sfxOn = au.sfx !== false; if (au.vis) m.vis = au.vis; }
  return m;
})());
function saveSettings() { store.set('zc_settings', SET); }

/* ---------- applying ---------- */
function applyAll() {
  PERF.mode = SET.quality; PERF.cap = +SET.fps; PERF.saverMode = SET.saver;
  PERF.resLock = SET.res === 'auto' ? null : +SET.res / 100;
  PERF.partMul = SET.particles / 100;
  AUD.sfx = SET.sfxOn; AUD.vis = SET.vis; SFX.setSfx(SET.sfxOn);
  RM = SET.motion === 'on' || (SET.motion === 'auto' && SYS_RM);
  applySound(); applyLook();
}
function applySound() {
  SFX.setVolumes({ master: SET.volMaster / 100, music: SET.volMusic / 100, sfx: SET.volSfx / 100, gun: SET.volGun / 100, amb: SET.volAmb / 100, ui: SET.volUi / 100 });
  SFX.setMix({ night: SET.night, mono: SET.mono });
  SFX.setQuality(SET.aq === 'auto' ? Q.audio : SET.aq === 'low' ? 0 : 2);
}
function applyLook() {
  const app = $('app');
  app.style.setProperty('--hud-scale', (SET.hudScale / 100).toFixed(2));
  app.classList.toggle('hi-contrast', !!SET.contrast);
  app.classList.toggle('lefty', !!SET.lefty);
  $('fpsBox').hidden = !SET.fpsShow;
  const h = $('ctrlHint'); if (h) h.hidden = !SET.hints;
}
// the governor's tier is the baseline; these settings scale or pin parts of it
function applyOverrides() {
  const pm = PERF.partMul || 1;
  Q.parts = Math.round(Q.parts * pm); Q.burst = Q.burst * pm;
  const dk = SET.decals === 'low' ? 0.4 : SET.decals === 'high' ? 1.6 : 1;
  Q.splats = Math.round(Q.splats * dk);
  if (SET.aq !== 'auto') Q.audio = SET.aq === 'low' ? 0 : 2;
}
function setSetting(k, v) {
  SET[k] = v; saveSettings();
  switch (k) {
    case 'quality': setMode(v); break;
    case 'res': PERF.resLock = v === 'auto' ? null : +v / 100; resize(); break;
    case 'fps': PERF.cap = +v; PERF.holdT = performance.now() + 1500; savePerf(); break;
    case 'saver': PERF.saverMode = v; savePerf(); perfTicks = 4; perfCare(); break;
    case 'particles': PERF.partMul = v / 100; applyRung(PERF.rung, 'setting'); break;
    case 'decals': case 'aq': applyRung(PERF.rung, 'setting'); applySound(); break;
    case 'zoom': resize(); break;
    case 'vis': AUD.vis = v; store.set('zc_audio', AUD); break;
    case 'sfxOn': AUD.sfx = v; store.set('zc_audio', AUD); SFX.setSfx(v); break;
    case 'motion': RM = v === 'on' || (v === 'auto' && SYS_RM); break;
    case 'season': if (G.mode !== 'title' && v !== 'cycle') setSeason(seasonFromSetting()); else if (G.mode === 'title') { WORLD.season = seasonFromSetting(); for (const c of chunks.values()) c.stale = 1; WSPR.clear(); } break;
    case 'wxMode': if (v !== 'dynamic') { WX.kind = v; WX.t = 60; } else WX.t = Math.min(WX.t, 20); break;
    case 'life': if (!v) for (const b of WD.birds) b.st = 2; break;
    case 'veg': case 'water': WSPR.clear(); break;
    case 'lux': for (const c of chunks.values()) c.stale = 1; LUX.adapt = 0; LUX.offUntil = 0; LUX.errT.length = 0; LUX.A = null; break;
    case 'aimKbm': case 'aimPad': case 'fireKbm': case 'firePad': DEV.fireOn = false; DEV.aimFlip = false; updDevUi(); break;
    case 'lefty': applyLook(); updDevUi(); break;
    default:
      if (/^vol|^night$|^mono$/.test(k)) applySound();
      if (k === 'hudScale' || k === 'contrast' || k === 'lefty' || k === 'fpsShow' || k === 'hints') applyLook();
  }
}

/* ---------- what is in the panel ---------- */
const ON_OFF = [[true, 'On'], [false, 'Off']];
const AUTO_LH = [['auto', 'Auto'], ['off', 'Off'], ['low', 'Light'], ['full', 'Full']];
const SET_TABS = [['graphics', 'Graphics'], ['sound', 'Sound'], ['gameplay', 'Gameplay'], ['controls', 'Controls'], ['access', 'Accessibility'], ['system', 'System']];
const SET_ROWS = [
  // graphics
  { tab: 'graphics', group: 'Quality' },
  { id: 'quality', tab: 'graphics', basic: true, type: 'seg', label: 'Graphics quality', desc: 'Auto watches your frame rate and adjusts resolution and detail as you play.', opts: [['auto', 'Auto'], ['0', 'Low'], ['1', 'Medium'], ['2', 'High'], ['3', 'Ultra']] },
  { id: 'res', tab: 'graphics', type: 'seg', label: 'Resolution', desc: 'Lower draws fewer pixels, the biggest saving on a slow phone.', opts: [['auto', 'Auto'], ['100', '100%'], ['85', '85%'], ['72', '72%'], ['60', '60%'], ['50', '50%']] },
  { id: 'fps', tab: 'graphics', type: 'seg', label: 'Frame rate limit', desc: 'A lower limit saves battery and keeps the phone cooler.', opts: [[30, '30'], [45, '45'], [60, '60'], [90, '90'], [120, '120'], [0, 'Max']] },
  { id: 'zoom', tab: 'graphics', type: 'slider', label: 'Camera zoom', desc: 'Zoom out to see more of the street.', min: 85, max: 115, step: 5, fmt: v => v + '%' },
  { tab: 'graphics', group: 'World' },
  { id: 'weather', tab: 'graphics', basic: true, type: 'seg', label: 'Weather effects', desc: 'Rain, snow, sand, ash, leaves and lightning.', opts: AUTO_LH },
  { id: 'veg', tab: 'graphics', type: 'seg', label: 'Trees and bushes', desc: 'Light draws them still; Full lets them sway and shake.', opts: AUTO_LH },
  { id: 'water', tab: 'graphics', type: 'seg', label: 'Animated water', desc: 'Glints drifting on rivers and ponds.', opts: [['auto', 'Auto'], ['on', 'On'], ['off', 'Off']] },
  { id: 'fog', tab: 'graphics', type: 'seg', label: 'Fog and haze', desc: 'Drifting clouds of fog over the street.', opts: [['auto', 'Auto'], ['on', 'On'], ['off', 'Off']] },
  { id: 'lux', tab: 'graphics', basic: true, type: 'seg', label: 'Ray-traced lighting', desc: 'Real shadows from buildings, cars and zombies, with bloom, lit gunfire and lit windows. Auto adapts to your device and repairs itself.', opts: [['auto', 'Auto'], ['off', 'Off'], ['basic', 'Basic'], ['full', 'Full'], ['ultra', 'Ultra']] },
  { id: 'bloom', tab: 'graphics', type: 'seg', label: 'Bloom', desc: 'A soft glow around lamps, fires, gunfire and explosions.', opts: ON_OFF },
  { id: 'tod', tab: 'graphics', type: 'seg', label: 'Time of day', desc: 'A run starts in the morning; Cycle moves through dusk and night.', opts: [['cycle', 'Cycle'], ['day', 'Day'], ['dusk', 'Dusk'], ['night', 'Night'], ['real', 'Clock']] },
  { id: 'nightDark', tab: 'graphics', type: 'seg', label: 'Night darkness', desc: 'How dark the night gets.', opts: [['gentle', 'Gentle'], ['deep', 'Deep']] },
  { id: 'light', tab: 'graphics', type: 'seg', label: 'Light glows', desc: 'Glow sprites on fires, police lights and flickering lamps, on top of the ray-traced lighting.', opts: [['auto', 'Auto'], ['simple', 'Simple'], ['full', 'Full']] },
  { id: 'life', tab: 'graphics', type: 'seg', label: 'Birds', desc: 'Crows and pigeons that take off when you get close.', opts: ON_OFF },
  { tab: 'graphics', group: 'Effects' },
  { id: 'particles', tab: 'graphics', type: 'slider', label: 'Particles', desc: 'Blood, sparks, smoke and debris.', min: 25, max: 150, step: 25, fmt: v => v + '%' },
  { id: 'decals', tab: 'graphics', type: 'seg', label: 'Marks on the ground', desc: 'Bloodstains, bullet holes and footprints.', opts: [['low', 'Few'], ['normal', 'Normal'], ['high', 'Lots']] },
  { id: 'grade', tab: 'graphics', type: 'seg', label: 'Color grading', desc: 'Each district and the weather tint the screen.', opts: ON_OFF },
  { id: 'vis', tab: 'graphics', type: 'seg', label: 'Light show', desc: 'The city pulses to the radio.', opts: [['full', 'Full'], ['low', 'Low'], ['off', 'Off']] },
  { id: 'fpsShow', tab: 'graphics', type: 'seg', label: 'Show frame rate', desc: 'A small counter in the corner.', opts: ON_OFF },
  // sound
  { tab: 'sound', group: 'Volume' },
  { id: 'volMaster', tab: 'sound', type: 'slider', label: 'Master', desc: 'Everything at once.', min: 0, max: 100, step: 5, fmt: v => v + '%' },
  { id: 'volMusic', tab: 'sound', basic: true, type: 'slider', label: 'Music', desc: 'The radio and your own songs.', min: 0, max: 100, step: 5, fmt: v => v + '%' },
  { id: 'volSfx', tab: 'sound', basic: true, type: 'slider', label: 'Sound effects', desc: 'Gunfire, kills, explosions and bosses.', min: 0, max: 100, step: 5, fmt: v => v + '%' },
  { id: 'volGun', tab: 'sound', type: 'slider', label: 'Gunfire', desc: 'Your gun, as a share of the effects volume.', min: 0, max: 100, step: 5, fmt: v => v + '%' },
  { id: 'volAmb', tab: 'sound', type: 'slider', label: 'Weather and ambience', desc: 'Rain, wind, thunder, rivers and fire.', min: 0, max: 100, step: 5, fmt: v => v + '%' },
  { id: 'volUi', tab: 'sound', type: 'slider', label: 'Menus', desc: 'Clicks and taps.', min: 0, max: 100, step: 5, fmt: v => v + '%' },
  { tab: 'sound', group: 'Options' },
  { id: 'sfxOn', tab: 'sound', type: 'seg', label: 'Sound effects', desc: 'Turn every effect off, leaving only the music.', opts: ON_OFF },
  { id: 'steps', tab: 'sound', type: 'seg', label: 'Footsteps', desc: 'Your steps on snow, sand, water and asphalt.', opts: ON_OFF },
  { id: 'duck', tab: 'sound', type: 'seg', label: 'Music dips for the A-10', desc: 'The radio drops under the cannon so it hits harder.', opts: ON_OFF },
  { id: 'night', tab: 'sound', type: 'seg', label: 'Night mode', desc: 'Evens out loud and quiet sounds, for headphones or late at night.', opts: ON_OFF },
  { id: 'mono', tab: 'sound', type: 'seg', label: 'Mono audio', desc: 'Both ears hear everything.', opts: ON_OFF },
  { id: 'aq', tab: 'sound', type: 'seg', label: 'Audio quality', desc: 'Low uses less processing on older phones.', opts: [['auto', 'Auto'], ['low', 'Low'], ['high', 'High']] },
  { tab: 'sound', action: 'radio', label: 'Radio', desc: 'Channels, songs and Bluetooth music.', btn: 'Open the radio' },
  // gameplay
  { tab: 'gameplay', group: 'World' },
  { id: 'wxMode', tab: 'gameplay', type: 'seg', label: 'Weather', desc: 'Changing weather, or keep one kind all the time.', opts: [['dynamic', 'Changing'], ['clear', 'Clear'], ['rain', 'Rain'], ['storm', 'Storms'], ['snow', 'Snow'], ['fog', 'Fog'], ['sand', 'Sand']] },
  { id: 'wxPlay', tab: 'gameplay', type: 'seg', label: 'Weather affects play', desc: 'Fog and sand cut how far you see, blizzards slow everyone, lightning strikes.', opts: ON_OFF },
  { id: 'season', tab: 'gameplay', type: 'seg', label: 'Season', desc: 'Real date follows the calendar; Turning changes every 5 waves.', opts: [['auto', 'Real date'], ['cycle', 'Turning'], ['spring', 'Spring'], ['summer', 'Summer'], ['fall', 'Fall'], ['winter', 'Winter']] },
  { id: 'scale', tab: 'gameplay', basic: true, type: 'seg', label: 'World scale', desc: 'Real-world: people, zombies, cars and buildings in true proportion. Classic: the old, smaller city. Applies from the next run.', opts: [['real', 'Real-world'], ['classic', 'Classic']] },
  { id: 'world', tab: 'gameplay', type: 'seg', label: 'Map', desc: 'What the city is made of. Applies from the next run.', opts: [['mixed', 'Everything'], ['city', 'City only'], ['wild', 'More wilds']] },
  { id: 'seedMode', tab: 'gameplay', type: 'seg', label: 'Same map every run', desc: 'Keep the map from your last run so you can learn it.', opts: [['random', 'Off'], ['fixed', 'On']] },
  { tab: 'gameplay', group: 'Screen' },
  { id: 'shake', tab: 'gameplay', basic: true, type: 'slider', label: 'Screen shake', desc: 'How hard explosions and hits shake the view.', min: 0, max: 150, step: 25, fmt: v => v ? v + '%' : 'Off' },
  { id: 'ftext', tab: 'gameplay', type: 'seg', label: 'Floating text', desc: 'Pickups, dodges and jams written above you.', opts: ON_OFF },
  { id: 'districts', tab: 'gameplay', type: 'seg', label: 'District names', desc: 'A note when you walk into a new part of the city.', opts: ON_OFF },
  { id: 'hints', tab: 'gameplay', type: 'seg', label: 'Hints', desc: 'Tips on the title screen and the movement guide.', opts: ON_OFF },
  { id: 'vibrate', tab: 'gameplay', type: 'seg', label: 'Vibration', desc: 'A buzz on big hits, explosions and lightning.', opts: ON_OFF, touch: true },
  { tab: 'gameplay', group: 'Wi-Fi co-op' },
  { id: 'netPing', tab: 'gameplay', type: 'seg', label: 'Show ping', desc: 'Each player’s connection speed next to their name during a co-op run. The lobby always shows it.', opts: ON_OFF },
  { id: 'netArrows', tab: 'gameplay', type: 'seg', label: 'Teammate arrows', desc: 'Arrows on the edge of the screen point to teammates who are off screen, with how far away they are.', opts: ON_OFF },
  // controls: each device has its own section, shown once the game has seen that device (the one in use comes first)
  { tab: 'controls', info: 'devnow' },
  { tab: 'controls', group: 'Keyboard and mouse', dev: 'kbm' },
  { id: 'aimKbm', tab: 'controls', basic: 'kbm', dev: 'kbm', type: 'seg', label: 'Aiming', desc: 'Aim with the mouse, get a small nudge onto zombies, or let the gun aim itself like on a phone.', opts: [['manual', 'Mouse'], ['assist', 'Mouse + assist'], ['auto', 'Auto-aim']] },
  { id: 'fireKbm', tab: 'controls', basic: 'kbm', dev: 'kbm', type: 'seg', label: 'Firing', desc: 'Hold the fire button, click once to keep firing, or fire on its own when a zombie is under the crosshair.', opts: [['hold', 'Hold'], ['toggle', 'Click on/off'], ['auto', 'On target']] },
  { tab: 'controls', info: 'binds-kb', dev: 'kbm', label: 'Keys and mouse buttons' },
  { tab: 'controls', group: 'Controller', dev: 'padgroup' },
  { tab: 'controls', info: 'nopad', dev: 'nopad' },
  { id: 'aimPad', tab: 'controls', basic: 'pad', dev: 'pad', type: 'seg', label: 'Aiming', desc: 'Aim with the right stick, with a small nudge onto zombies, or let the gun aim itself.', opts: [['manual', 'Stick'], ['assist', 'Stick + assist'], ['auto', 'Auto-aim']] },
  { id: 'firePad', tab: 'controls', basic: 'pad', dev: 'pad', type: 'seg', label: 'Firing', desc: 'Fire whenever you push the aim stick, only while you hold the fire button, or on its own when the aim is on a zombie.', opts: [['stick', 'Aim to fire'], ['trigger', 'Button'], ['auto', 'On target']] },
  { id: 'padDead', tab: 'controls', dev: 'pad', type: 'slider', label: 'Stick dead zone', desc: 'Raise it if you drift with the sticks let go.', min: 4, max: 40, step: 2, fmt: v => v + '%' },
  { id: 'padSwap', tab: 'controls', dev: 'pad', type: 'seg', label: 'Swap sticks', desc: 'Move with the right stick and aim with the left.', opts: ON_OFF },
  { id: 'padRumble', tab: 'controls', dev: 'pad', type: 'seg', label: 'Rumble', desc: 'The controller shakes on big hits, explosions and lightning.', opts: ON_OFF },
  { tab: 'controls', info: 'binds-pad', dev: 'pad', label: 'Buttons' },
  { tab: 'controls', group: 'Crosshair', dev: 'aim' },
  { id: 'xhair', tab: 'controls', dev: 'aim', type: 'seg', label: 'Crosshair', desc: 'It turns red over a zombie and shows the reload on slow guns.', opts: [['cross', 'Cross'], ['dot', 'Dot'], ['circle', 'Circle'], ['off', 'Off']] },
  { id: 'xhairSize', tab: 'controls', dev: 'aim', type: 'slider', label: 'Crosshair size', desc: 'How big the crosshair is drawn.', min: 60, max: 160, step: 10, fmt: v => v + '%' },
  { id: 'xhairColor', tab: 'controls', dev: 'aim', type: 'seg', label: 'Crosshair color', desc: 'Pick one that stands out on your screen.', opts: [['yellow', 'Yellow'], ['white', 'White'], ['green', 'Green'], ['cyan', 'Cyan'], ['red', 'Red']] },
  { tab: 'controls', group: 'Touch', dev: 'touch' },
  { id: 'joy', tab: 'controls', dev: 'touch', type: 'seg', label: 'Joystick', desc: 'Floating appears where your thumb lands; Fixed stays in the corner.', opts: [['float', 'Floating'], ['fixed', 'Fixed']] },
  { id: 'joySize', tab: 'controls', dev: 'touch', type: 'slider', label: 'Joystick size', desc: 'How far you drag for full speed.', min: 70, max: 140, step: 10, fmt: v => v + '%' },
  { id: 'dashTap', tab: 'controls', dev: 'touch', type: 'seg', label: 'Tap to dash', desc: 'Tap the other side of the screen to dash, or use only the button.', opts: [[true, 'Tap + button'], [false, 'Button only']] },
  { id: 'lefty', tab: 'controls', dev: 'touch', type: 'seg', label: 'Left-handed', desc: 'Move on the right, dash on the left.', opts: ON_OFF },
  // accessibility
  { tab: 'access', group: 'Comfort' },
  { id: 'motion', tab: 'access', type: 'seg', label: 'Reduce motion', desc: 'Fewer animations and no screen shake. Auto follows your device.', opts: [['auto', 'Auto'], ['on', 'On'], ['off', 'Off']] },
  { id: 'flash', tab: 'access', type: 'seg', label: 'Reduce flashing', desc: 'Softens lightning and other bright flashes.', opts: ON_OFF },
  { tab: 'access', group: 'Display' },
  { id: 'hudScale', tab: 'access', type: 'slider', label: 'HUD size', desc: 'Health, wave, score and the buttons.', min: 80, max: 140, step: 10, fmt: v => v + '%' },
  { id: 'contrast', tab: 'access', type: 'seg', label: 'High-contrast HUD', desc: 'Solid backgrounds behind the HUD text.', opts: ON_OFF },
  // system
  { tab: 'system', group: 'This device' },
  { tab: 'system', info: 'device' },
  { id: 'saver', tab: 'system', basic: true, type: 'seg', label: 'Battery saver', desc: 'Caps the game at 30 fps and Medium quality. Auto turns on when the battery is low.', opts: [['auto', 'Auto'], ['on', 'On'], ['off', 'Off']] },
  { tab: 'system', action: 'fullscreen', desk: true, basic: 'kbm', label: 'Full screen', desc: 'Fill the whole screen, or play in a window. F11 or Alt+Enter also switch.', btn: 'Switch' },
  { tab: 'system', action: 'cache', label: 'Refresh cache', desc: 'Frees the graphics the game has stored. They rebuild as needed.', btn: 'Refresh' },
  { tab: 'system', action: 'recheck', label: 'Check the device again', desc: 'Re-runs the quick speed test and picks a new starting quality.', btn: 'Check' },
  { tab: 'system', action: 'reset', label: 'Reset all settings', desc: 'Back to the defaults. Your weapons, specimens and scores are kept.', btn: 'Reset', danger: true }
];
const SP = { mode: store.get('zc_setmode', 'basic'), tab: 'graphics', built: false, from: null };

/* ---------- building the panel ---------- */
function openSettings(tab) {
  if (tab) { SP.tab = tab; if (tab !== 'graphics' && SP.mode === 'basic') SP.mode = 'advanced'; }
  renderSettings(); $('settings').hidden = false; $('settings').scrollTop = 0; SFX.click();
}
function closeSettings() { stopListen(); $('settings').hidden = true; renderPerfBtn(); updDevUi(); }
// whether a row belongs on screen: each device's options appear once the game has seen that device
function rowOn(r) {
  if (r.touch && !TOUCH) return false;
  if (r.desk && !window.ZCDesktop) return false;
  switch (r.dev) {
    case 'kbm': return DEV.seen.kbm;
    case 'pad': return DEV.seen.pad;
    case 'nopad': return !DEV.seen.pad;
    case 'padgroup': return true;
    case 'aim': return DEV.seen.kbm || DEV.seen.pad;
    case 'touch': return TOUCH || DEV.seen.touch;
  }
  return true;
}
function renderSettings(keep) {
  const sheet = $('settings'), top = sheet.scrollTop;
  const box = $('setBody'); box.textContent = '';
  const adv = SP.mode === 'advanced';
  $('setMode').querySelectorAll('button').forEach(b => { const on = b.dataset.m === SP.mode; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  const nav = $('setTabs'); nav.hidden = !adv; nav.textContent = ''; nav.parentNode.classList.toggle('adv', adv);
  if (adv) for (const [k, label] of SET_TABS) {
    const b = el('button', 'tab' + (k === SP.tab ? ' on' : ''), label); b.type = 'button'; b.setAttribute('aria-pressed', k === SP.tab);
    b.addEventListener('click', () => { SP.tab = k; SFX.click(); stopListen(); renderSettings(); }); nav.append(b);
  }
  let rows = adv ? SET_ROWS.filter(r => r.tab === SP.tab) : SET_ROWS.filter(r => r.basic === true || r.basic === DEV.kind);
  rows = rows.filter(rowOn);
  if (adv && SP.tab === 'controls') {
    // the device in use goes first
    const secs = [[]]; for (const r of rows) { if (r.group) secs.push([]); secs[secs.length - 1].push(r); }
    const rank = sec => { const d = sec[0] && sec[0].dev; return d === DEV.kind || (d === 'padgroup' && DEV.kind === 'pad') ? 0 : d === 'aim' ? (DEV.kind === 'touch' ? 3 : 1) : 2; };
    const head = secs.shift(); secs.sort((a, b) => rank(a) - rank(b)); rows = head.concat.apply(head, secs);
  }
  if (!adv) box.append(setNote('The most useful options. Switch to Advanced for everything, from rain density to ' + (DEV.kind === 'touch' ? 'the joystick.' : DEV.kind === 'pad' ? 'your controller buttons.' : 'your key bindings.')));
  for (const r of rows) {
    if (r.group) { box.append(el('h3', 'set-group', r.group)); continue; }
    if (r.info === 'device') { box.append(deviceInfo()); continue; }
    if (r.info === 'devnow') { box.append(devNow()); continue; }
    if (r.info === 'nopad') { box.append(setNote('Plug in or pair a controller and press any button on it. The game switches to it on its own, and its aiming options and button layout show up here.')); continue; }
    if (r.info === 'binds-kb' || r.info === 'binds-pad') { const h = el('h4', 'set-sub', r.label); box.append(h, bindTable(r.info === 'binds-pad' ? 'pad' : 'kb')); continue; }
    box.append(r.action ? actionRow(r) : settingRow(r));
  }
  if (!adv) { const more = el('button', 'btn small ghost set-more', 'All settings'); more.type = 'button'; more.addEventListener('click', () => { SP.mode = 'advanced'; store.set('zc_setmode', 'advanced'); SFX.click(); renderSettings(); }); box.append(more); }
  if (adv && SP.tab === 'gameplay') box.append(setNote('Map seed ' + (SET.seedMode === 'fixed' && SET.seed ? SET.seed : WORLD.lastSeed || 0) + (SET.seedMode === 'fixed' ? ' (kept)' : '') + ' · ' + (WORLD.cur ? WORLD.cur.name + ', ' + BIO[WORLD.cur.bio].name : '')));
  if (keep) sheet.scrollTop = top;
}
// which device the game thinks you are on right now
function devNow() {
  const box = el('div', 'set-devnow');
  box.append(devIcon(DEV.kind));
  const t = el('div'); t.append(el('b', null, 'Playing with: ' + (DEV.kind === 'pad' ? padName() : DEV_NAMES[DEV.kind])), el('p', null, 'Picked on its own from what you used last. Touch the screen, the keyboard or a controller and it switches.'));
  box.append(t); return box;
}
function setNote(t) { return el('p', 'set-note', t); }
function settingRow(r) {
  const row = el('div', 'set-row'), txt = el('div', 'set-txt'), id = 'set_' + r.id;
  const lab = el('label', null, r.label); lab.htmlFor = id; txt.append(lab, el('p', null, r.desc));
  row.append(txt);
  const ctl = el('div', 'set-ctl');
  if (r.type === 'seg') {
    const seg = el('div', 'seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', r.label); seg.id = id;
    for (const [v, label] of r.opts) {
      const on = String(SET[r.id]) === String(v), b = el('button', on ? 'on' : '', label); b.type = 'button'; b.setAttribute('aria-pressed', on);
      b.addEventListener('click', () => {
        const val = typeof v === 'boolean' ? v : typeof SET_DEF[r.id] === 'number' ? +v : v;
        if (r.id === 'seedMode' && val === 'fixed') SET.seed = WORLD.lastSeed || ((Math.random() * 1e9) | 0);
        setSetting(r.id, val); SFX.click();
        seg.querySelectorAll('button').forEach(x => { const o = x === b; x.classList.toggle('on', o); x.setAttribute('aria-pressed', o); });
        if (r.id === 'seedMode' || r.id === 'quality') renderSettings();
      });
      seg.append(b);
    }
    ctl.append(seg);
  } else if (r.type === 'slider') {
    const wrap = el('div', 'slide'), inp = document.createElement('input'), out = el('output', null, r.fmt(SET[r.id]));
    inp.type = 'range'; inp.min = r.min; inp.max = r.max; inp.step = r.step; inp.value = SET[r.id]; inp.id = id;
    const paint = () => wrap.style.setProperty('--v', ((inp.value - r.min) / (r.max - r.min) * 100).toFixed(1) + '%');
    inp.addEventListener('input', () => { const v = +inp.value; out.textContent = r.fmt(v); paint(); setSetting(r.id, v); });
    inp.addEventListener('change', () => { SFX.click(); if (r.id === 'volGun' || r.id === 'volSfx') SFX.shot(G.p ? G.p.weapon.F.key : 'pistol'); });
    paint(); wrap.append(inp, out); ctl.append(wrap);
  }
  row.append(ctl);
  return row;
}
function actionRow(r) {
  const row = el('div', 'set-row'), txt = el('div', 'set-txt');
  txt.append(el('b', null, r.label), el('p', null, r.desc)); row.append(txt);
  const b = el('button', 'btn small' + (r.danger ? ' danger' : ''), r.btn); b.type = 'button';
  b.addEventListener('click', () => settingsAction(r.action, b));
  const ctl = el('div', 'set-ctl'); ctl.append(b); row.append(ctl);
  return row;
}
function settingsAction(a, b) {
  SFX.click();
  if (a === 'radio') { openRadio(); return; }
  if (a === 'fullscreen') { if (window.ZCDesktop) window.ZCDesktop.fullscreen(); return; }
  if (a === 'cache') { const before = cacheBytes().total; trimCaches(2); WSPR.clear(); toast('Cache refreshed', 'Freed ' + fmtMB(Math.max(0, before - cacheBytes().total)), '#7dff4a'); renderSettings(); return; }
  if (a === 'recheck') {
    try { const bm = PERF.bench = benchmark(), sc = scoreTier(PERF.prof, bm); PS.bench = bm; PS.learned = null; PERF.score = sc.score; PERF.start = sc.tier; PERF.ceil = deviceCeil(PERF.prof, sc.tier); savePerf(); if (PERF.mode === 'auto') applyRung(Math.max(ceilRung(), firstRung(PERF.start)), 'device check'); toast('Device checked', 'Starting at ' + TIER_NAMES[PERF.start], '#29e6ff'); } catch (e) { }
    renderSettings(); return;
  }
  if (a === 'reset') {
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Tap again to reset'; setTimeout(() => { b.dataset.sure = ''; b.textContent = 'Reset'; }, 3000); return; }
    const keep = { seed: SET.seed };
    Object.assign(SET, SET_DEF, { flash: SYS_RM }, keep); saveSettings(); applyAll(); setMode(SET.quality); resize();
    for (const a of ACTIONS) for (const k of ['kb', 'pad']) if (a[k]) BIND[k][a.id] = a[k].slice();
    saveBinds(); toast('Settings reset', 'Back to the defaults', '#f2cc3a'); renderSettings();
  }
}
function deviceInfo() {
  const p = PERF.prof || {}, cb = cacheBytes(), box = el('div', 'set-device');
  const dl = el('dl', 'build-stats'); dl.id = 'setStats';
  const add = (k, v) => { const d = el('div'); d.append(el('dt', '', k), el('dd', '', v)); dl.appendChild(d); };
  add('Running', TIER_NAMES[PERF.tier] + ' · ' + Math.round(RES_STEPS[PERF.res] * 100 * (PERF.resLock ? PERF.resLock / RES_STEPS[PERF.res] : 1)) + '%');
  add('Frame rate', PERF.fps ? Math.round(PERF.fps) + ' fps' : '…');
  add('Screen', Math.round(PERF.hz) + ' Hz · ' + (Math.round((p.dpr || 1) * 100) / 100) + 'x');
  add('CPU', p.cores ? p.cores + ' cores' : 'Unknown');
  add('Memory', p.mem ? p.mem + ' GB' : 'Unknown');
  add('Cache', fmtMB(cb.total));
  const dev = [p.model, p.gpu && p.gpu !== 'unknown' ? friendlyGpu(p.gpu) : '', p.os, p.browser].filter(Boolean).join(' · ');
  const notes = [];
  if (PERF.mode === 'auto') notes.push('Auto adjusts every few seconds and remembers the best level for this device.');
  if (PERF.wxScale < 1) notes.push('Weather detail trimmed to ' + Math.round(PERF.wxScale * 100) + '% to keep things smooth.');
  if (PERF.saver) notes.push('Battery saver is on: 30 fps and at most Medium quality.');
  if (PERF.thermal >= 2) notes.push('Your phone is warm, so quality is lowered until it cools down.');
  if (PERF.repairs) notes.push('Fixed itself ' + PERF.repairs + (PERF.repairs === 1 ? ' time' : ' times') + ' this session. Latest: ' + PERF.log[PERF.log.length - 1].what.toLowerCase() + '.');
  box.append(el('p', 'pf-device', dev), dl);
  if (notes.length) box.append(el('p', 'pf-note', notes.join(' ')));
  return box;
}
$('setClose').addEventListener('click', closeSettings);
$('setMode').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { SP.mode = b.dataset.m; store.set('zc_setmode', SP.mode); SFX.click(); renderSettings(); }));
// the old performance panel now opens the System tab
function openPerf() { openSettings('system'); }
function closePerf() { closeSettings(); }
function renderPerfPanel() { if (!$('settings').hidden && SP.mode === 'advanced' && SP.tab === 'system') { const s = $('setStats'); if (s) s.parentNode.replaceWith(deviceInfo()); } }
for (const id of ['titlePerf', 'pausePerf']) { const b = $(id); if (b) { b.replaceWith(b.cloneNode(true)); $(id).addEventListener('click', () => openSettings()); } }
function renderPerfBtn() { for (const id of ['titlePerf', 'pausePerf']) { const b = $(id); if (b) b.textContent = 'Settings'; } }

// the frame-rate counter
let fpsT = 0;
function updFpsBox(now) {
  if (!SET.fpsShow || now - fpsT < 500) return; fpsT = now;
  $('fpsBox').textContent = (PERF.fps ? Math.round(PERF.fps) : '--') + ' fps · ' + TIER_NAMES[PERF.tier] + ' ' + Math.round(RES_STEPS[PERF.res] * 100) + '%';
}
applyAll();
renderPerfBtn();
