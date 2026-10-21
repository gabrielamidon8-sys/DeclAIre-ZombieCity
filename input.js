/* ================= input: touch, keyboard and mouse, controller =================
   The game works out what you are playing with from the last thing you used and switches on the spot:
   a finger on the screen means touch (joystick, the gun aims itself), a key or the mouse means keyboard and mouse
   (aim with the mouse, fire with the button), and a button or stick on a controller means controller (twin sticks).
   Keys, mouse buttons and controller buttons can all be reassigned in Settings > Controls. */
const ACTIONS = [
  { id: 'up', label: 'Move up', kb: ['KeyW', 'ArrowUp'], pad: null },
  { id: 'down', label: 'Move down', kb: ['KeyS', 'ArrowDown'], pad: null },
  { id: 'left', label: 'Move left', kb: ['KeyA', 'ArrowLeft'], pad: null },
  { id: 'right', label: 'Move right', kb: ['KeyD', 'ArrowRight'], pad: null },
  { id: 'fire', label: 'Fire', kb: ['Mouse0', ''], pad: ['b7', ''] },
  { id: 'dash', label: 'Dodge roll (hold to sprint out of it)', kb: ['Space', ''], pad: ['b0', ''] },
  { id: 'sprint', label: 'Sprint (the gun comes down)', kb: ['ShiftLeft', ''], pad: ['b10', 'b6'] },
  { id: 'reload', label: 'Reload (with a full gun: check it)', kb: ['KeyR', ''], pad: ['b2', ''] },
  { id: 'swap', label: 'Swap primary and secondary', kb: ['KeyX', ''], pad: ['b1', ''] },
  { id: 'air', label: 'A-10 airstrike', kb: ['KeyQ', 'KeyF'], pad: ['b3', 'b5'] },
  { id: 'free', label: 'Break free when grabbed', kb: ['KeyE', 'Enter'], pad: ['', ''] },
  { id: 'mark', label: 'Mark a spot for your team (co-op)', kb: ['KeyG', ''], pad: ['b4', ''] },
  { id: 'aim', label: 'Auto-aim on or off', kb: ['KeyV', ''], pad: ['b11', ''] },
  { id: 'pause', label: 'Pause', kb: ['KeyP', ''], pad: ['b9', 'b8'] },
  { id: 'mute', label: 'Mute the radio', kb: ['KeyM', ''], pad: ['b13', ''] },
  { id: 'next', label: 'Next song', kb: ['KeyN', ''], pad: ['b15', ''] },
  { id: 'chDown', label: 'Radio channel down', kb: ['BracketLeft', ''], pad: ['b14', ''] },
  { id: 'chUp', label: 'Radio channel up', kb: ['BracketRight', ''], pad: ['b12', ''] }
];
const NO_ACTS = [];
const BIND = (function () {
  const saved = store.get('zc_binds', null) || {}, b = { kb: {}, pad: {} };
  // 1.9.993: the dash became the dodge roll and Shift became sprint; old default bindings move over (your own stay)
  const OLD = { kb: { dash: 'Space,ShiftLeft', free: 'KeyE,Enter' }, pad: { dash: 'b0,b6', free: 'b2,' } };
  for (const k of ['kb', 'pad']) if (saved[k]) for (const id in OLD[k]) if (Array.isArray(saved[k][id]) && saved[k][id].join(',') === OLD[k][id] && !saved.v993) delete saved[k][id];
  for (const a of ACTIONS) for (const k of ['kb', 'pad']) {
    if (!a[k]) continue;
    const s = saved[k] && saved[k][a.id];
    b[k][a.id] = Array.isArray(s) && s.length === 2 && s.every(v => typeof v === 'string' && v.length < 24) ? s.slice() : a[k].slice();
  }
  return b;
})();
let KB_MAP = {}, PAD_MAP = {};
function remapBinds() {
  KB_MAP = {}; PAD_MAP = {};
  for (const a of ACTIONS) {
    for (const c of BIND.kb[a.id]) if (c) (KB_MAP[c] = KB_MAP[c] || []).push(a.id);
    if (BIND.pad[a.id]) for (const c of BIND.pad[a.id]) if (c) (PAD_MAP[c] = PAD_MAP[c] || []).push(a.id);
  }
}
remapBinds();
function saveBinds() { BIND.v993 = 1; store.set('zc_binds', BIND); remapBinds(); updGlyphs(); updDevUi(); }

/* ---------- names for keys and buttons ---------- */
const KEY_NAMES = { Space: 'Space', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift', ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'L-Alt', AltRight: 'R-Alt', MetaLeft: 'L-Win', MetaRight: 'R-Win',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc', Enter: 'Enter', NumpadEnter: 'Num Enter', Tab: 'Tab', Backspace: 'Backspace', CapsLock: 'Caps',
  BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`', IntlBackslash: '\\',
  Insert: 'Ins', Delete: 'Del', Home: 'Home', End: 'End', PageUp: 'PgUp', PageDown: 'PgDn', ContextMenu: 'Menu',
  Mouse0: 'Left click', Mouse1: 'Middle click', Mouse2: 'Right click', Mouse3: 'Mouse 4', Mouse4: 'Mouse 5' };
function keyLabel(c) {
  if (!c) return '';
  if (KEY_NAMES[c]) return KEY_NAMES[c];
  let m = /^Key([A-Z])$/.exec(c); if (m) return m[1];
  m = /^Digit(\d)$/.exec(c); if (m) return m[1];
  m = /^Numpad(.+)$/.exec(c); if (m) return 'Num ' + m[1].replace('Decimal', '.').replace('Add', '+').replace('Subtract', '-').replace('Multiply', '*').replace('Divide', '/');
  m = /^F(\d+)$/.exec(c); if (m) return c;
  return c.replace(/(Left|Right)$/, '');
}
const PAD_NAMES = {
  xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →', 'Xbox'],
  ps: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →', 'PS'],
  nin: ['B', 'A', 'Y', 'X', 'L', 'R', 'ZL', 'ZR', '−', '+', 'LS', 'RS', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →', 'Home']
};
function padLabel(c) { if (!c) return ''; const i = +c.slice(1), n = PAD_NAMES[DEV.padType] || PAD_NAMES.xbox; return n[i] || 'Button ' + (i + 1); }
const PAD_A = () => padLabel('b0'), PAD_B = () => padLabel('b1');
function bindName(kind, c) { return c ? (kind === 'pad' ? padLabel(c) : keyLabel(c)) : '—'; }
function firstBind(kind, id) { const b = BIND[kind][id]; return b ? (b[0] || b[1] || '') : ''; }
const DEV_NAMES = { touch: 'Touch screen', kbm: 'Keyboard and mouse', pad: 'Controller' };

/* ---------- which device ---------- */
const FINE = !!(window.matchMedia && matchMedia('(any-pointer: fine)').matches);
const DEV = {
  kind: TOUCH ? 'touch' : 'kbm',
  seen: { touch: TOUCH, kbm: !TOUCH || FINE, pad: !!store.get('zc_padseen', false) },
  keys: {}, pad: false, padIdx: -1, padId: '', padType: 'xbox', btn: [], prev: [], ls: { x: 0, y: 0 }, rs: { x: 0, y: 0 },
  mx: 0, my: 0, mIn: false, mAcc: 0, fireOn: false, aimFlip: false, lastPadT: -1e9, listen: null, rsT: -9,
  nav: { dir: '', t: 0 }, useT: { touch: 0, kbm: 0, pad: 0 }, latch: [], latchT: 0
};
const PLATFORM = window.ZC_DESKTOP || window.ZCDesktop ? 'win' : IS_APP ? 'app' : 'web';
function markDev(kind) {
  if (kind === 'kbm' && performance.now() - DEV.lastPadT < 400) return;   // some controllers send key presses too
  let fresh = false;
  if (!DEV.seen[kind]) { DEV.seen[kind] = true; fresh = true; if (kind === 'pad') store.set('zc_padseen', true); }
  if (DEV.kind === kind) { if (fresh) refreshControlsTab(); return; }
  DEV.kind = kind; applyDev(); refreshControlsTab();
  if (G.mode === 'play') toast('Now playing with', DEV_NAMES[kind], '#29e6ff');
}
function applyDev() {
  const app = $('app'); app.classList.remove('dev-touch', 'dev-kbm', 'dev-pad'); app.classList.add('dev-' + DEV.kind);
  if (DEV.kind !== 'touch') { joy.active = false; joy.id = null; joy.dx = joy.dy = 0; }
  if (DEV.kind !== 'kbm') DEV.fireOn = false;
  updGlyphs(); updDevUi();
}
function refreshControlsTab() { if (!$('settings').hidden && SP.mode === 'advanced' && SP.tab === 'controls' && !DEV.listen) renderSettings(true); }
// the device used most during a run goes on the leaderboard with the score
function runDevice() { const u = DEV.useT; return u.pad > u.kbm && u.pad > u.touch ? 'pad' : u.kbm > u.touch ? 'kbm' : u.touch > 0 ? 'touch' : DEV.kind; }

/* ---------- keyboard ---------- */
// the physical key: e.code, or worked out from e.key for the odd keyboard (or synthetic event) that leaves code empty
const KEY_CODE = { ' ': 'Space', Shift: 'ShiftLeft', Control: 'ControlLeft', Alt: 'AltLeft', '[': 'BracketLeft', ']': 'BracketRight', ';': 'Semicolon', "'": 'Quote', ',': 'Comma', '.': 'Period', '/': 'Slash', '\\': 'Backslash', '-': 'Minus', '=': 'Equal', '`': 'Backquote', Esc: 'Escape' };
function keyCode(e) {
  if (e.code) return e.code;
  const k = String(e.key || '');
  if (KEY_CODE[k]) return KEY_CODE[k];
  if (/^[a-z]$/i.test(k)) return 'Key' + k.toUpperCase();
  if (/^[0-9]$/.test(k)) return 'Digit' + k;
  return k;
}
const isTyping = t => !!t && (t.tagName === 'TEXTAREA' || t.isContentEditable || (t.tagName === 'INPUT' && !/^(range|checkbox|radio|button|submit)$/.test(t.type)));
function held(id) {
  const kb = BIND.kb[id]; if ((kb[0] && DEV.keys[kb[0]]) || (kb[1] && DEV.keys[kb[1]])) return true;
  const pd = BIND.pad[id]; if (pd && DEV.pad) for (const c of pd) if (c && DEV.btn[+c.slice(1)]) return true;
  return false;
}
// one place that turns an action into what it does, for keys, mouse buttons and controller buttons alike
function doActions(A, repeat) {
  const has = id => A.indexOf(id) >= 0, play = G.mode === 'play' && !menuOpen();
  if (play && G.grab && (has('free') || has('dash') || has('fire'))) { qteHit(); return true; }
  let used = false;
  if (has('dash') && play && !(repeat && G.p && G.p.arm)) { tryDash(); used = true; }   // (held, the roll does not repeat: he sprints out of it)
  if (repeat) return used;
  if (has('reload') && play && G.p && G.p.arm) { armsReload(G.p); used = true; }
  if (has('swap') && play && G.p && G.p.arm) { armsSwap(G.p); used = true; }
  if (has('sprint') && play && G.p && G.p.arm && DEV.kind === 'pad') { G.p.arm.latch = !G.p.arm.latch; used = true; }   // (a stick click latches the sprint until you stop)
  if (has('air') && play) { callAirstrike(); used = true; }
  if (has('aim') && play) { toggleAutoAim(); used = true; }
  if (has('mark') && play && NET.started) { netMark(); used = true; }
  if (has('fire') && play && DEV.kind === 'kbm' && SET.fireKbm === 'toggle') { DEV.fireOn = !DEV.fireOn; used = true; }
  if (has('mute')) { SFX.fm.mute(); used = true; } if (has('next')) { SFX.fm.skip(); used = true; }
  if (has('chDown')) { SFX.fm.step(-1); used = true; } if (has('chUp')) { SFX.fm.step(1); used = true; }
  return used;
}
// Esc (and the pause key) closes whatever is on top, or pauses and resumes the run
function goBack(esc) {
  if (!$('settings').hidden) { closeSettings(); return; }
  if (!$('radioPanel').hidden) { closeRadio(); return; }
  if (legendCover()) { lgsBack(); return; }
  if (!$('hudRadio').hidden && esc) { toggleHudRadio(false); return; }
  if (!$('blDetail').hidden) { $('blDetail').hidden = true; return; }
  if (!$('bosslog').hidden) { closeBossLog(); return; }
  if (!$('arDetail').hidden) { $('arDetail').hidden = true; return; }
  if (!$('armory').hidden) { closeArmory(); return; }
  if (!$('cxDetail').hidden) { closeDetail(); return; }
  if (!$('codex').hidden) { closeCodex(); return; }
  if (!$('lb').hidden) { closeLB(); return; }
  if (!$('coop').hidden) { closeCoop(); return; }
  if (G.mode === 'play') pauseGame(); else if (G.mode === 'pause') resumeGame();
}
window.addEventListener('keydown', e => {
  if (DEV.listen) return;   // handled by the capture listener below
  if (isTyping(e.target)) return;
  if (typeof INTRO !== 'undefined' && INTRO.on) return;   // the intro has its own skip keys
  const code = keyCode(e);
  if (!e.repeat) markDev('kbm');
  DEV.keys[code] = true;
  const A = KB_MAP[code] || NO_ACTS;
  if (doActions(A, e.repeat) && G.mode === 'play') { e.preventDefault(); }
  if (e.repeat) return;
  if (code === 'Escape' || A.indexOf('pause') >= 0) { goBack(code === 'Escape'); return; }
  if (G.mode === 'upgrade' || G.mode === 'skull') { const n = /^(?:Digit|Numpad)([123])$/.exec(code); if (n) { (G.mode === 'upgrade' ? chooseCard : chooseForbidden)(+n[1] - 1, null); return; } }
  // arrow keys move between buttons in the menus (left and right still slide a focused slider)
  if (/^Arrow/.test(code) && menuOpen() && !(e.target && e.target.type === 'range' && /Left|Right/.test(code))) { navMove(code.slice(5).toLowerCase()); e.preventDefault(); }
});
window.addEventListener('keyup', e => { const code = keyCode(e); DEV.keys[code] = false; });
window.addEventListener('blur', () => { DEV.keys = {}; });

/* ---------- mouse ---------- */
window.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const r = cv.getBoundingClientRect(); DEV.mx = e.clientX - r.left; DEV.my = e.clientY - r.top;
  if (!DEV.mIn) { DEV.mIn = true; if (DEV.kind === 'kbm') updDevUi(); }   // the first mouse movement turns on mouse aim, so the hints change
  if (DEV.kind !== 'kbm') { DEV.mAcc += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0); if (DEV.mAcc > 30) { DEV.mAcc = 0; markDev('kbm'); } }
}, { passive: true });
window.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch' || e.pointerType === 'pen') markDev('touch');
  else if (e.pointerType === 'mouse') { DEV.mAcc = 0; markDev('kbm'); }
}, true);
cv.addEventListener('mousedown', e => {
  if (DEV.listen) return;
  const r = cv.getBoundingClientRect(); DEV.mx = e.clientX - r.left; DEV.my = e.clientY - r.top; DEV.mIn = true;
  const code = 'Mouse' + e.button; DEV.keys[code] = true;
  if (e.button === 1) e.preventDefault();   // no auto-scroll on a middle click
  doActions(KB_MAP[code] || NO_ACTS, false);
});
window.addEventListener('mouseup', e => { DEV.keys['Mouse' + e.button] = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());
// the mouse wheel swaps guns in a run
cv.addEventListener('wheel', e => { if (G.mode !== 'play' || menuOpen() || !G.p || !G.p.arm || Math.abs(e.deltaY) < 4) return; e.preventDefault(); const t = performance.now(); if (t - (DEV.wheelT || 0) < 260) return; DEV.wheelT = t; armsSwap(G.p); }, { passive: false });

/* ---------- controller ---------- */
function padKind(id) { id = String(id || ''); return /xbox|xinput|045e/i.test(id) ? 'xbox' : /054c|playstation|dualsense|dualshock|wireless controller/i.test(id) ? 'ps' : /057e|nintendo|switch|pro controller|joy-con/i.test(id) ? 'nin' : 'xbox'; }
function padName() { return DEV.padType === 'ps' ? 'PlayStation controller' : DEV.padType === 'nin' ? 'Switch controller' : /xbox|xinput|045e/i.test(DEV.padId) ? 'Xbox controller' : 'Controller'; }
function livePads() { try { return navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(g => g && g.connected) : []; } catch (e) { return []; } }
// a quick tap can start and end between two frames on a slow device, so a fast timer notes every press until the next frame reads it
function padLatch() {
  if (!DEV.pad) { clearInterval(DEV.latchT); DEV.latchT = 0; return; }
  const g = livePads().find(x => x.index === DEV.padIdx); if (!g) return;
  for (let i = 0, n = Math.min(20, g.buttons.length); i < n; i++) { const b = g.buttons[i]; if (b && (b.pressed || b.value > 0.4)) DEV.latch[i] = 1; }
}
function usePad(g) { DEV.pad = true; DEV.padIdx = g.index; if (!DEV.latchT) DEV.latchT = setInterval(padLatch, 10); if (g.id !== DEV.padId) { DEV.padId = g.id; DEV.padType = padKind(g.id); updGlyphs(); updDevUi(); } }
window.addEventListener('gamepadconnected', e => {
  DEV.lastPadT = performance.now(); usePad(e.gamepad); markDev('pad');
  toast('Controller connected', padName(), '#7dff4a');
});
window.addEventListener('gamepaddisconnected', e => {
  if (e.gamepad.index !== DEV.padIdx) return;
  const rest = livePads(); if (rest.length) { usePad(rest[0]); return; }
  DEV.pad = false; DEV.padIdx = -1; DEV.btn = []; DEV.prev = []; DEV.ls.x = DEV.ls.y = DEV.rs.x = DEV.rs.y = 0;
  toast('Controller disconnected', 'Plug it back in or keep going', '#e5484d');
  if (DEV.kind === 'pad') { DEV.kind = TOUCH && !FINE ? 'touch' : 'kbm'; applyDev(); refreshControlsTab(); if (G.mode === 'play') pauseGame(); }
});
function stickRead(ax, ay, dz, out) {
  ax = +ax || 0; ay = +ay || 0; const m = Math.hypot(ax, ay);
  if (m < dz) { out.x = 0; out.y = 0; return; }
  const k = Math.min(1, (m - dz) / (1 - dz)) / m; out.x = ax * k; out.y = ay * k;
}
// read the controller once a frame: buttons, sticks, menu navigation and button presses
function padPoll(dt) {
  const pads = livePads(); if (!pads.length) { if (DEV.pad) { DEV.pad = false; DEV.btn = []; } return; }
  let gp = pads.find(g => g.index === DEV.padIdx);
  // a second controller takes over as soon as a button on it is pressed
  for (const g of pads) if (g !== gp && g.buttons.some(b => b && b.pressed)) { gp = g; break; }
  if (!gp) gp = pads[0];
  if (gp.index !== DEV.padIdx || !DEV.pad || gp.id !== DEV.padId) usePad(gp);
  const B = DEV.btn, P = DEV.prev, n = Math.min(20, gp.buttons.length);
  for (let i = 0; i < n; i++) { P[i] = !!B[i]; const b = gp.buttons[i]; B[i] = (!!b && (b.pressed || b.value > 0.4)) || !!DEV.latch[i]; DEV.latch[i] = 0; }
  const dz = clamp(SET.padDead, 2, 60) / 100;
  stickRead(gp.axes[0], gp.axes[1], dz, DEV.ls); stickRead(gp.axes[2], gp.axes[3], dz, DEV.rs);
  let active = false;
  for (let i = 0; i < n; i++) if (B[i] && !P[i]) { active = true; break; }
  if (!active && (Math.hypot(DEV.ls.x, DEV.ls.y) > 0.5 || Math.hypot(DEV.rs.x, DEV.rs.y) > 0.5)) active = true;
  if (active) { DEV.lastPadT = performance.now(); markDev('pad'); }
  if (DEV.listen) {
    if (DEV.listen.kind === 'pad') for (let i = 0; i < n; i++) if (B[i] && !P[i]) { assignBind('b' + i); break; }
    if (DEV.listen && performance.now() - DEV.listen.t > 9000) stopListen();
    return;
  }
  if (DEV.kind !== 'pad') return;
  const intro = typeof INTRO !== 'undefined' && INTRO.on;
  for (let i = 0; i < n; i++) if (B[i] && !P[i]) padDown(i, intro);
  if (!intro && menuOpen()) padNav(dt);
}
function padDown(i, intro) {
  if (intro) { if (i === 0 || i === 1 || i === 9) introSkip(); return; }
  if (G.mode === 'cine') return;
  if (!menuOpen()) { doActions(PAD_MAP['b' + i] || NO_ACTS, false); if ((PAD_MAP['b' + i] || NO_ACTS).indexOf('pause') >= 0) pauseGame(); return; }
  if (i === 0) { navPress(); return; }
  if (i === 1) { if (window.zcBack) window.zcBack(); SFX.click(); return; }
  if (i === 9) { if (G.mode === 'pause' && !sheetOpen()) resumeGame(); else if (G.mode === 'title' && !sheetOpen()) $('playBtn').click(); return; }
  if (i === 4 || i === 5) { navTab(i === 5 ? 1 : -1); return; }
  if (i === 2 && G.mode === 'skull' && !$('skullRefuse').hidden) { $('skullRefuse').click(); return; }
}
function padRumble(ms) {
  if (!SET.padRumble || !DEV.pad) return;
  try {
    const g = livePads().find(x => x.index === DEV.padIdx), va = g && g.vibrationActuator;
    if (va && va.playEffect) va.playEffect('dual-rumble', { startDelay: 0, duration: Math.min(450, ms * 2.4 + 40), strongMagnitude: clamp(ms / 120, 0.15, 1), weakMagnitude: clamp(ms / 70, 0.25, 1) }).catch(() => {});
  } catch (e) { /* no rumble on this controller */ }
}

/* ---------- menus with a controller (and arrow keys) ---------- */
const LAYERS = ['engWarn', 'engRoom', 'settings', 'radioPanel', 'legends', 'blDetail', 'arDetail', 'cxDetail', 'bosslog', 'armory', 'codex', 'lb', 'coop', 'acct', 'skull', 'upgrade', 'pause', 'over', 'title'];
const shown = e => !!e && !e.hidden && e.getClientRects().length > 0;
function sheetOpen() { return shown($('engWarn')) || shown($('engRoom')) || shown($('settings')) || shown($('radioPanel')) || shown($('legends')) || shown($('armory')) || shown($('codex')) || shown($('bosslog')) || shown($('lb')) || shown($('coop')) || shown($('acct')); }
function menuOpen() { if (typeof INTRO !== 'undefined' && INTRO.on) return false; return (G.mode !== 'play' && G.mode !== 'cine') || shown($('settings')) || shown($('radioPanel')) || shown($('engRoom')) || shown($('engWarn')); }
function menuLayer() { for (const id of LAYERS) { const e = $(id); if (shown(e)) return e; } return null; }
function focusables(L) {
  return Array.from(L.querySelectorAll('button, input, select, a[href], [tabindex]:not([tabindex="-1"])'))
    .filter(e => !e.disabled && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden]') && (L.id === 'arDetail' || L.id === 'cxDetail' || L.id === 'blDetail' || !e.closest('.detail')));
}
function scrollBox(e) { while (e && e !== document.body) { if (e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY)) return e; e = e.parentElement; } return null; }
function focusEl(e) {
  if (!e) return; try { e.focus({ preventScroll: true }); } catch (x) { e.focus(); }
  e.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const sb = scrollBox(e.parentElement); if (sb) { const r = e.getBoundingClientRect(), br = sb.getBoundingClientRect(), head = sb.querySelector(':scope > .sheet-inner > .sheet-head'), hh = head ? head.getBoundingClientRect().height : 0; if (r.top < br.top + hh + 6) sb.scrollTop -= br.top + hh + 6 - r.top; }
}
function preferred(items) {
  return items.find(e => e.classList.contains('primary')) || items.find(e => e.classList.contains('on') && !isTyping(e)) || items.find(e => !isTyping(e) && !e.classList.contains('icon-btn')) || items[0];
}
function focusFirst(L) { const it = focusables(L); if (it.length) focusEl(preferred(it)); }
function navMove(dir) {
  const L = menuLayer(); if (!L) return;
  const items = focusables(L); if (!items.length) { const sb = scrollBox(L) || L; if (dir === 'up' || dir === 'down') sb.scrollTop += dir === 'up' ? -160 : 160; return; }
  const cur = document.activeElement;
  if (!cur || !L.contains(cur) || items.indexOf(cur) < 0) { focusEl(preferred(items)); return; }
  if (cur.type === 'range' && (dir === 'left' || dir === 'right')) {
    const st = +cur.step || 1, v = clamp(+cur.value + (dir === 'right' ? st : -st), +cur.min, +cur.max);
    if (v !== +cur.value) { cur.value = v; cur.dispatchEvent(new Event('input', { bubbles: true })); cur.dispatchEvent(new Event('change', { bubbles: true })); }
    return;
  }
  const r0 = cur.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
  let best = null, bs = Infinity;
  for (const e of items) {
    if (e === cur) continue;
    const r = e.getBoundingClientRect(), ex = r.left + r.width / 2, ey = r.top + r.height / 2;
    let main, cross;
    if (dir === 'right' || dir === 'left') {
      main = dir === 'right' ? ex - cx : cx - ex; if (main < 4) continue;
      cross = r.bottom > r0.top + 2 && r.top < r0.bottom - 2 ? 0 : Math.abs(ey - cy);
    } else {
      main = dir === 'down' ? ey - cy : cy - ey; if (main < 4) continue;
      cross = r.right > r0.left + 2 && r.left < r0.right - 2 ? Math.abs(ex - cx) * 0.3 : Math.abs(ex - cx);
    }
    const s = main + cross * 2.4;
    if (s < bs) { bs = s; best = e; }
  }
  if (best) { focusEl(best); SFX.click(); }
  else if (dir === 'up' || dir === 'down') { const sb = scrollBox(L); if (sb) sb.scrollTop += dir === 'up' ? -200 : 200; }
}
function navPress() {
  const L = menuLayer(); if (!L) return;
  const a = document.activeElement;
  if (!a || !L.contains(a) || a === document.body) { focusFirst(L); return; }
  if (a.type === 'range') return;
  if (isTyping(a)) { a.focus(); return; }
  a.click();
}
// LB and RB flip through tabs: the settings tabs, weapon types, specimen series, leaderboard tabs
function navTab(d) {
  const L = menuLayer(); if (!L) return;
  const tabs = Array.from(L.querySelectorAll('.tab, .chip, [role="tab"]')).filter(e => e.getClientRects().length && !e.closest('[hidden]'));
  const groups = new Map(); for (const t of tabs) { const g = t.parentElement; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(t); }
  let grp = null; for (const [, list] of groups) if (list.length > 1 && (!grp || list.length > grp.length)) grp = list;
  if (!grp) return;
  let i = grp.findIndex(t => t.classList.contains('on') || t.getAttribute('aria-selected') === 'true' || t.getAttribute('aria-pressed') === 'true'); if (i < 0) i = 0;
  const nx = grp[(i + d + grp.length) % grp.length], key = nx.textContent;
  nx.click();
  // the click may rebuild the tab row, so find the new button by its label
  setTimeout(() => { const L2 = menuLayer(); if (!L2) return; const again = Array.from(L2.querySelectorAll('.tab, .chip, [role="tab"]')).find(t => t.textContent === key); if (again) focusEl(again); }, 0);
}
function padNav(dt) {
  const B = DEV.btn; let dir = '';
  if (B[12]) dir = 'up'; else if (B[13]) dir = 'down'; else if (B[14]) dir = 'left'; else if (B[15]) dir = 'right';
  else { const x = DEV.ls.x, y = DEV.ls.y; if (Math.max(Math.abs(x), Math.abs(y)) > 0.55) dir = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up'); }
  const N = DEV.nav;
  if (!dir) N.dir = '';
  else if (dir !== N.dir) { N.dir = dir; N.t = 0.36; navMove(dir); }
  else { N.t -= dt; if (N.t <= 0) { N.t = 0.1; navMove(dir); } }
  const L = menuLayer(); if (!L) return;
  if (Math.abs(DEV.rs.y) > 0.15) { const sb = scrollBox(L) || L; sb.scrollTop += DEV.rs.y * 1100 * dt; }
  const a = document.activeElement;
  if (!a || a === document.body || !L.contains(a)) focusFirst(L);
}

/* ---------- aiming and firing ---------- */
function aimMode() {
  if (DEV.kind === 'touch') return 'auto';
  if (DEV.kind === 'kbm' && !DEV.mIn) return 'auto';   // keys but no mouse yet (a tablet with a keyboard): the gun aims itself
  const m = DEV.kind === 'pad' ? SET.aimPad : SET.aimKbm;
  return DEV.aimFlip ? (m === 'auto' ? 'manual' : 'auto') : m;
}
function toggleAutoAim() { DEV.aimFlip = !DEV.aimFlip; toast('Aim', aimMode() === 'auto' ? 'Auto-aim on' : 'You aim', '#f2cc3a'); SFX.click(); }
function aimStick() { return SET.padSwap ? DEV.ls : DEV.rs; }
function moveStick() { return SET.padSwap ? DEV.rs : DEV.ls; }
function moveInput() {
  let x = 0, y = 0;
  if (held('left')) x -= 1; if (held('right')) x += 1; if (held('up')) y -= 1; if (held('down')) y += 1;
  if (DEV.pad) { const s = moveStick(); x += s.x; y += s.y; }
  if (joy.active) { x += joy.dx; y += joy.dy; }
  return [x, y];
}
// the direction you are aiming yourself, or null when you are not aiming (mouse not over the game, stick let go)
function aimInput(p) {
  if (DEV.kind === 'kbm') {
    if (!DEV.mIn) return null;
    const wx = cam.x + (DEV.mx - W / 2) / ZOOM, wy = cam.y + (DEV.my - H / 2) / ZOOM;
    if (Math.abs(wx - p.x) + Math.abs(wy - p.y) < 3) return null;
    return Math.atan2(wy - p.y, wx - p.x);
  }
  if (DEV.kind === 'pad') { const s = aimStick(); if (Math.hypot(s.x, s.y) > 0.28) { DEV.rsT = G.time; return Math.atan2(s.y, s.x); } }
  return null;
}
// the zombie closest to a line from you at angle `ang` (within `cone` radians, big ones count as wider), or null
function coneTarget(p, ang, cone) {
  let best = null, bs = Infinity;
  const rg = p.S.range, vw = W / ZOOM / 2 + 10, vh = H / ZOOM / 2 + 10;
  for (const z of G.zs) {
    if (z.dead || z.st.under || z.st.down > 0) continue;
    const ex = z.x - p.x, ey = z.y - p.y; if (Math.abs(ex) > vw || Math.abs(ey) > vh) continue;
    const d = Math.hypot(ex, ey); if (d > rg + z.r) continue;
    if (z.m.S.p.camo && d > 230) continue;
    const da = Math.abs(((Math.atan2(ey, ex) - ang + Math.PI) % TAU + TAU) % TAU - Math.PI), slack = Math.atan2(z.r, Math.max(d, 1));
    if (da > cone + slack) continue;
    const s = d * (1 + 3 * Math.max(0, da - slack));
    if (s < bs) { bs = s; best = z; }
  }
  return best;
}
function wantFire(p) {
  if (DEV.kind === 'kbm') { const f = SET.fireKbm; if (f === 'toggle') return DEV.fireOn || held('fire'); if (held('fire')) return true; return f === 'auto' && !!coneTarget(p, p.aim, 0.08); }
  if (DEV.kind === 'pad') { const f = SET.firePad; if (held('fire')) return true; if (f === 'stick') { const s = aimStick(); return Math.hypot(s.x, s.y) > 0.55; } return f === 'auto' && !!coneTarget(p, p.aim, 0.1); }
  return false;
}
const XCOL = { yellow: '#f2cc3a', white: '#f4f1e8', green: '#7dff4a', cyan: '#29e6ff', red: '#ff5a4a' };
// the crosshair: at the mouse, or out along the aim with a controller (screen space)
function drawAim() {
  const p = G.p, play = G.mode === 'play', k = DEV.kind;
  const cur = play && k === 'kbm' && aimMode() !== 'auto' && SET.xhair !== 'off' ? 'none' : '';
  if (cv.style.cursor !== cur) cv.style.cursor = cur;
  if (!p || !play || k === 'touch' || G.grab) return;
  if (G.hintT > 0 && SET.hints) {
    const a = clamp(G.hintT, 0, 1), txt = ctrlLine().toUpperCase();
    ctx.font = "13px 'Share Tech Mono', monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = Math.min(W - 24, ctx.measureText(txt).width + 28);
    ctx.fillStyle = 'rgba(8,10,13,' + 0.72 * a + ')'; ctx.fillRect(W / 2 - tw / 2, H - 60, tw, 30);
    ctx.fillStyle = 'rgba(242,204,58,' + 0.9 * a + ')'; ctx.fillRect(W / 2 - tw / 2, H - 60, 3, 30);
    ctx.fillStyle = 'rgba(235,229,214,' + 0.92 * a + ')'; ctx.fillText(txt, W / 2, H - 45, W - 40);
  }
  const am = aimMode(); if (am === 'auto' || SET.xhair === 'off') return;
  const col = XCOL[SET.xhairColor] || XCOL.yellow, sz = SET.xhairSize / 100;
  const px = (p.x - cam.x) * ZOOM + W / 2, py = (p.y - cam.y) * ZOOM + H / 2, ca = Math.cos(p.aim), sa = Math.sin(p.aim);
  let x, y, hot;
  if (k === 'kbm') {
    x = DEV.mx; y = DEV.my;
    const wx = cam.x + (x - W / 2) / ZOOM, wy = cam.y + (y - H / 2) / ZOOM;
    hot = G.zs.some(z => !z.dead && !z.st.under && Math.hypot(z.x - wx, z.y - wy) < z.r + 6);
  } else {
    const d = clamp(p.S.range * ZOOM * 0.5, 90, 190); x = px + ca * d; y = py + sa * d;
    hot = !!coneTarget(p, p.aim, 0.05);
    ctx.save(); ctx.strokeStyle = hexA(col, 0.22); ctx.setLineDash([3, 7]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px + ca * 30, py + sa * 30); ctx.lineTo(x - ca * 14 * sz, y - sa * 14 * sz); ctx.stroke(); ctx.restore();
  }
  const c = p.jamT > 0 ? '#9a968c' : hot ? '#ff5a4a' : col, R = 9 * sz, gap = 4 * sz, len = 6 * sz;
  const shape = (lw, stroke) => {
    ctx.strokeStyle = stroke; ctx.fillStyle = stroke; ctx.lineWidth = lw; ctx.beginPath();
    if (SET.xhair === 'cross') { ctx.moveTo(x - gap - len, y); ctx.lineTo(x - gap, y); ctx.moveTo(x + gap, y); ctx.lineTo(x + gap + len, y); ctx.moveTo(x, y - gap - len); ctx.lineTo(x, y - gap); ctx.moveTo(x, y + gap); ctx.lineTo(x, y + gap + len); }
    else if (SET.xhair === 'circle') ctx.arc(x, y, R, 0, TAU);
    else ctx.arc(x, y, R * 0.75, 0, TAU);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, SET.xhair === 'dot' ? 2.6 * sz + lw / 4 : 1.4 * sz + lw / 4, 0, TAU); ctx.fill();
  };
  ctx.globalAlpha = SET.xhair === 'dot' ? 0.9 : 1;
  shape(4, 'rgba(0,0,0,0.55)'); shape(2, c);
  ctx.globalAlpha = 1;
  // slow guns show how long until the next shot
  const cdMax = 1 / (p.S.rof * dashRofMul(p)), left = clamp(p.fireCd / cdMax, 0, 1);
  if (cdMax > 0.3 && left > 0.02) { ctx.strokeStyle = hexA(c, 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, R + 6 * sz, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - left)); ctx.stroke(); }
  if (k === 'kbm' && SET.fireKbm === 'toggle' && DEV.fireOn) { ctx.fillStyle = c; ctx.fillRect(x - 3, y + R + 7 * sz, 6, 3); }
}

/* ---------- rebinding (Settings > Controls) ---------- */
function bindTable(kind) {
  const box = el('div', 'binds'); box.dataset.kind = kind;
  for (const a of ACTIONS) {
    if (!BIND[kind][a.id]) continue;
    const row = el('div', 'bind-row'); row.append(el('span', 'bind-name', a.label));
    for (let s = 0; s < 2; s++) {
      const code = BIND[kind][a.id][s], b = el('button', 'bind-key' + (code ? '' : ' empty'), bindName(kind, code)); b.type = 'button';
      b.dataset.a = a.id; b.dataset.s = s; b.dataset.k = kind;
      b.setAttribute('aria-label', a.label + ', ' + (s ? 'second' : 'first') + (kind === 'pad' ? ' button: ' : ' key: ') + (code ? bindName(kind, code) : 'none'));
      b.addEventListener('click', () => startListen(kind, a.id, s, b));
      row.append(b);
    }
    box.append(row);
  }
  const foot = el('div', 'bind-foot');
  foot.append(el('p', 'set-note', kind === 'pad'
    ? 'Choose a box, then press the button for it. If that button is already used, the two swap. In the menus ' + PAD_A() + ' always chooses and ' + PAD_B() + ' goes back; the left stick moves and the right stick aims.'
    : 'Click a box, then press a key or a mouse button. If it is already used, the two swap. Backspace clears a box, Esc cancels, and Esc always pauses.'));
  const r = el('button', 'btn small ghost', kind === 'pad' ? 'Reset buttons' : 'Reset keys'); r.type = 'button';
  r.addEventListener('click', () => { for (const a of ACTIONS) if (a[kind]) BIND[kind][a.id] = a[kind].slice(); saveBinds(); SFX.click(); toast('Controls', kind === 'pad' ? 'Buttons back to the defaults' : 'Keys back to the defaults', '#f2cc3a'); renderSettings(true); });
  foot.append(r); box.append(foot);
  return box;
}
function startListen(kind, id, slot, btn) {
  stopListen();
  DEV.listen = { kind: kind, id: id, slot: slot, btn: btn, t: performance.now() };
  btn.classList.add('listen'); btn.textContent = kind === 'pad' ? 'Press a button' : 'Press a key';
  SFX.click();
}
function stopListen() {
  const L = DEV.listen; if (!L) return; DEV.listen = null;
  if (L.btn && L.btn.isConnected) { L.btn.classList.remove('listen'); L.btn.textContent = bindName(L.kind, BIND[L.kind][L.id][L.slot]); }
}
function assignBind(code) {
  const L = DEV.listen; if (!L) return;
  const Bk = BIND[L.kind], old = Bk[L.id][L.slot]; let swapped = null;
  if (code) for (const a of ACTIONS) { if (!Bk[a.id]) continue; for (let s = 0; s < 2; s++) if (Bk[a.id][s] === code && !(a.id === L.id && s === L.slot)) { Bk[a.id][s] = old; swapped = a; } }
  Bk[L.id][L.slot] = code;
  DEV.listen = null; saveBinds(); SFX.click();
  if (swapped) toast('Swapped', swapped.label + ': ' + (old ? bindName(L.kind, old) : 'nothing'), '#f2cc3a');
  renderSettings(true);
  const again = document.querySelector('.bind-key[data-k="' + L.kind + '"][data-a="' + L.id + '"][data-s="' + L.slot + '"]'); if (again) focusEl(again);
}
// while a box is waiting for a key, that key goes to the box and nowhere else
window.addEventListener('keydown', e => {
  if (!DEV.listen) return;
  e.preventDefault(); e.stopPropagation();
  const code = keyCode(e);
  if (code === 'Escape') { stopListen(); return; }
  if (DEV.listen.kind !== 'kb') return;
  if (code === 'Backspace' || code === 'Delete') { assignBind(''); return; }
  assignBind(code);
}, true);
window.addEventListener('mousedown', e => {
  if (!DEV.listen) return;
  e.preventDefault(); e.stopPropagation();
  if (DEV.listen.kind !== 'kb') { stopListen(); return; }
  assignBind('Mouse' + e.button);
}, true);
window.addEventListener('contextmenu', e => { if (DEV.listen) e.preventDefault(); }, true);

/* ---------- what the screen says about the controls ---------- */
function kbList(id, n) { const b = BIND.kb[id]; return b.filter(Boolean).slice(0, n || 2).map(keyLabel).join(' or '); }
function moveKeys() { const ids = ['up', 'left', 'down', 'right'].map(i => firstBind('kb', i)); return ids.join(',') === 'KeyW,KeyA,KeyS,KeyD' ? 'WASD' : ids.map(keyLabel).join(' '); }
// one line for the first seconds of a run
function ctrlLine() {
  const am = aimMode(), parts = [];
  if (DEV.kind === 'pad') {
    const f = SET.firePad, fire = padLabel(firstBind('pad', 'fire'));
    if (am === 'auto') parts.push('Left stick moves, the gun aims and fires on its own');
    else { parts.push(f === 'stick' ? 'Right stick aims and fires' : 'Right stick aims'); if (f === 'auto') parts.push('it fires when the aim is on a zombie'); else if (f === 'trigger' && fire) parts.push('hold ' + fire + ' to fire'); }
    parts.push(padLabel(firstBind('pad', 'dash')) + ' dashes');
    return parts.join(' · ');
  }
  const f = SET.fireKbm, fire = keyLabel(firstBind('kb', 'fire')) || 'the fire key';
  if (am === 'auto') return moveKeys() + ' to move, the gun aims and fires on its own';
  return 'Aim with the mouse · ' + (f === 'toggle' ? fire + ' starts and stops firing' : f === 'auto' ? 'it fires when a zombie is under the crosshair' : 'hold ' + fire + ' to fire');
}
// the title screen hint
function ctrlHintText() {
  if (DEV.kind === 'touch') return 'Drag on the ' + (SET.lefty ? 'right' : 'left') + ' side to move. Your gun aims and fires on its own. Tap the other side to roll; hold the roll button to sprint. Reload with the reload button; tap your gun to swap.';
  if (DEV.kind === 'pad') {
    const am = aimMode();
    const f = SET.firePad, fire = padLabel(firstBind('pad', 'fire'));
    return 'Left stick to move. ' + (am === 'auto' ? 'Your gun aims and fires on its own. ' : 'Right stick to aim' + (f === 'stick' ? ' and fire' : f === 'auto' ? ', it fires when the aim is on a zombie' : fire ? ', hold ' + fire + ' to fire' : '') + '. ')
      + padLabel(firstBind('pad', 'dash')) + ' to roll, ' + padLabel(firstBind('pad', 'sprint')) + ' to sprint, ' + padLabel(firstBind('pad', 'reload')) + ' to reload, ' + padLabel(firstBind('pad', 'swap')) + ' to swap guns, ' + padLabel(firstBind('pad', 'air')) + ' for the A-10, ' + padLabel(firstBind('pad', 'pause')) + ' to pause.';
  }
  const am = aimMode();
  return 'Move with ' + moveKeys() + '. ' + (am === 'auto' ? 'Your gun aims and fires on its own. ' : ctrlLine().replace(' · ', ', ') + '. ') + kbList('dash', 1) + ' to roll, ' + kbList('sprint', 1) + ' to sprint, ' + kbList('reload', 1) + ' to reload, ' + kbList('swap', 1) + ' or the wheel to swap guns, ' + kbList('air', 1) + ' for the A-10, Esc to pause.';
}
// the little key or button names on the HUD buttons
function updGlyphs() {
  const k = DEV.kind, set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  if (k === 'pad') { set('dashKey', padLabel(firstBind('pad', 'dash'))); set('airKey', padLabel(firstBind('pad', 'air'))); set('pauseKey', padLabel(firstBind('pad', 'pause')) || padLabel('b9')); set('reloadKey', padLabel(firstBind('pad', 'reload'))); }
  else { set('dashKey', keyLabel(firstBind('kb', 'dash'))); set('airKey', keyLabel(firstBind('kb', 'air'))); set('pauseKey', 'Esc'); set('reloadKey', keyLabel(firstBind('kb', 'reload'))); }
}
const DEV_SVG = {
  touch: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10.5 18.5h3"/></svg>',
  kbm: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4" width="19" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/></svg>',
  pad: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10a5 5 0 0 1 4.6 7l-1 2.3a2.4 2.4 0 0 1-4 .6L15 15H9l-1.6 1.9a2.4 2.4 0 0 1-4-.6l-1-2.3A5 5 0 0 1 7 7z"/><path d="M7.5 10v3M6 11.5h3"/><circle cx="16" cy="10.6" r=".6"/><circle cx="17.6" cy="12.4" r=".6"/></svg>'
};
function devIcon(kind) { const s = el('span', 'dev-ic dev-ic-' + kind); s.innerHTML = DEV_SVG[kind] || DEV_SVG.kbm; return s; }
const DEV_SHORT = { touch: 'Phone', kbm: 'PC', pad: 'Controller' };
function devLine() {
  const plat = PLATFORM === 'win' ? 'Windows app' : PLATFORM === 'app' ? 'Android app' : 'Web';
  return DEV.kind === 'pad' ? padName() + ' · ' + plat : DEV.kind === 'kbm' ? 'Keyboard and mouse · ' + plat : 'Touch screen · ' + plat;
}
function updDevUi() {
  const h = $('ctrlHint'); if (h) h.textContent = ctrlHintText();
  const b = $('devBadge'); if (b) { b.textContent = ''; b.append(devIcon(DEV.kind), el('span', null, devLine())); }
  const hi = $('hudDev'); if (hi) { hi.textContent = ''; hi.append(devIcon(DEV.kind)); }
  if (G.mode === 'title') renderTitlePanel();
}
