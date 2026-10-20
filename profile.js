/* ================= your name, your record and the main menu's side panel =================
   You type your name on the main menu once; it shows at the top left of the screen during a run and goes on the
   leaderboard with your scores, together with what you played on (phone, PC or controller). The global board on
   the web page is one board for every device. */
function hasName() { return !!store.get('zc_tag', ''); }
// a player's name as an element. The admin's name (on the admin's account only) gets its own look: ADMIN in cracked,
// glowing red and DECLAIRE underlined in orange.
function nameEl(name, acct, tag, cls) {
  const e = el(tag || 'span', cls || null);
  if (name === ADMIN_TAG && isAdmin(acct)) {
    e.classList.add('nm-admin'); e.setAttribute('aria-label', 'ADMIN DECLAIRE');
    e.append(el('span', 'nm-a', 'ADMIN'), el('span', 'nm-bar', '|'), el('span', 'nm-d', 'DECLAIRE'));
    return e;
  }
  e.textContent = name; return e;
}
// the same on the canvas (name tags over teammates in co-op), centred on x, y
const CRACKS = [[0.16, 0.05, 0.22, 0.5, 0.15, 0.95], [0.62, 0.1, 0.68, 0.45, 0.78, 0.55, 0.74, 0.95]];
function drawName(name, acct, x, y, px) {
  if (!(name === ADMIN_TAG && isAdmin(acct))) { ctx.fillText(name, x, y); return; }
  const fA = "bold " + px + "px 'Share Tech Mono', monospace";
  ctx.font = fA; const wa = ctx.measureText('ADMIN').width, wb = ctx.measureText('|').width, wd = ctx.measureText('DECLAIRE').width, gap = px * 0.15;
  let sx = x - (wa + wb + wd + gap * 2) / 2;
  const al = ctx.textAlign; ctx.textAlign = 'left';
  // ADMIN: red, glowing, cracked
  ctx.save(); ctx.shadowColor = 'rgba(255,30,30,0.9)'; ctx.shadowBlur = px * 0.8; ctx.fillStyle = '#ff2a2a'; ctx.fillText('ADMIN', sx, y); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(sx, y - px * 0.55, wa, px * 1.1); ctx.clip(); ctx.strokeStyle = 'rgba(40,0,0,0.85)'; ctx.lineWidth = Math.max(1, px * 0.08);
  for (const c of CRACKS) { ctx.beginPath(); for (let i = 0; i < c.length; i += 2) { const cx = sx + c[i] * wa, cy = y - px * 0.5 + c[i + 1] * px; i ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy); } ctx.stroke(); }
  ctx.restore();
  sx += wa + gap; ctx.fillStyle = '#8f959e'; ctx.fillText('|', sx, y); sx += wb + gap;
  // DECLAIRE: underlined in orange
  ctx.save(); ctx.shadowColor = 'rgba(255,138,26,0.7)'; ctx.shadowBlur = px * 0.5; ctx.fillStyle = '#f1ead8'; ctx.fillText('DECLAIRE', sx, y);
  ctx.fillStyle = '#ff8a1a'; ctx.fillRect(sx, y + px * 0.48, wd, Math.max(1.5, px * 0.13)); ctx.restore();
  ctx.textAlign = al;
}
// returns the saved name, or null when the name filter turned it down (the reason shows under the name box)
function setName(v) {
  // the admin's own name is the one exception to the name filter, and only on the admin's account
  const adminName = String(v || '').trim().toUpperCase() === ADMIN_TAG && meAdmin();
  const chk = adminName ? { ok: true } : ZCF.check(v);
  if (!chk.ok) { nameErr(chk.msg); return null; }
  const t0 = adminName ? ADMIN_TAG : cleanTag(v); if (t0 !== store.get('zc_tag', '')) nameErr('');
  const t = adminName ? ADMIN_TAG : cleanTag(v);
  if (t === store.get('zc_tag', '') && hasName()) return t;   // unchanged (and a message just shown stays up)
  store.set('zc_tag', t);
  updNameUi(); syncNameOnline(t); acctRename(t);
  return t;
}
let nameErrTimer = 0, nameRejected = '';
function nameErr(msg) {
  const e = $('nameErr'); if (!e) return;
  e.textContent = msg; e.hidden = !msg; clearTimeout(nameErrTimer);
  if (msg) { e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); nameErrTimer = setTimeout(() => { e.hidden = true; }, 7000); }
}
// the leaderboard keeps one entry per player; a new name renames it there too
async function syncNameOnline(tag) {
  if (!LB.db || !LB.uid || LB.ro) return;
  try {
    const ref = LB.db.collection('scores').doc(LB.uid), cur = await ref.get();
    if (cur.exists && cur.data().tag !== tag) await ref.update({ tag: tag });
  } catch (e) { if (e && e.code === 'invalid_argument') LB.ro = true; }
}
// signed in on a new device: pick up the name you used before
async function adoptOnlineName() {
  if (hasName() || !LB.db || !LB.uid) return;
  try { const cur = await LB.db.collection('scores').doc(LB.uid).get(); const t = cur.exists && cur.data().tag; if (t && !hasName()) { store.set('zc_tag', cleanTag(t)); updNameUi(); } } catch (e) { /* keep it local */ }
}
function updNameUi() {
  const named = hasName(), tag = getTag();
  const inp = $('nameInput'); if (inp && document.activeElement !== inp) inp.value = named ? tag : '';
  $('nameForm').classList.toggle('unnamed', !named);
  $('hudName').hidden = !named; const hn = $('hudNameTxt'); hn.textContent = ''; if (named) hn.append(nameEl(tag, myAcct()));
  if (G.mode === 'title') renderTitlePanel();
}
$('nameForm').addEventListener('submit', e => {
  e.preventDefault();
  const inp = $('nameInput'), raw = inp.value.trim();
  if (!raw) { inp.focus(); return; }
  const t = setName(raw);
  if (!t) { nameRejected = raw; inp.value = hasName() ? getTag() : ''; inp.focus(); return; }
  inp.value = t; inp.blur();
  const b = $('nameSave'); b.textContent = 'Saved'; b.classList.add('ok'); SFX.click();
  setTimeout(() => { b.textContent = 'Save'; b.classList.remove('ok'); }, 1400);
});
$('nameInput').addEventListener('input', e => { const v = e.target.value.toUpperCase().replace(/[^A-Z0-9 _.|\-]/g, ''); if (v !== e.target.value) e.target.value = v; });
$('nameInput').addEventListener('blur', () => {
  const v = $('nameInput').value.trim();
  if (v && v === nameRejected) return;
  if (v && (v.toUpperCase() === ADMIN_TAG ? ADMIN_TAG : cleanTag(v)) !== getTag()) { if (!setName(v)) { nameRejected = v; $('nameInput').value = hasName() ? getTag() : ''; } }
  else if (!v) updNameUi();
});

/* ---------- your record across runs ---------- */
const STATS = Object.assign({ runs: 0, kills: 0, time: 0, bestWave: 0, bestChain: 0, bestScore: 0, sid: 0 }, store.get('zc_stats', {}) || {});
if (!STATS.sid) { STATS.sid = 1 + Math.floor(Math.random() * 9998); store.set('zc_stats', STATS); }
function recordRun() {
  if (!G.p || G.recorded) return; G.recorded = true;
  STATS.runs++; STATS.kills += G.kills || 0; STATS.time += Math.floor(G.time || 0);
  STATS.bestWave = Math.max(STATS.bestWave, G.wave || 0); STATS.bestChain = Math.max(STATS.bestChain, G.bestChain || 0); STATS.bestScore = Math.max(STATS.bestScore, G.score || 0);
  store.set('zc_stats', STATS);
  acctSoon(2500);
}
function fmtTime(s) { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? h + 'h ' + String(m).padStart(2, '0') + 'm' : m + 'm ' + String(s % 60).padStart(2, '0') + 's'; }
function fmtK(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'k' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n); }

/* ---------- the side panel on wide screens ---------- */
function keycap(txt, wide) { return el('kbd', wide ? 'kc wide' : 'kc', txt); }
function ctrlRows() {
  const k = DEV.kind, rows = [];
  if (k === 'touch') {
    rows.push([[SET.lefty ? 'Right side' : 'Left side'], 'Drag to move'], [['Auto'], 'Aims and fires'], [['Dash'], 'Button or tap'], [['A-10'], 'Airstrike button']);
    return rows;
  }
  const am = aimMode();
  if (k === 'pad') {
    const L = firstBind;
    rows.push([[SET.padSwap ? 'R-stick' : 'L-stick'], 'Move']);
    if (am !== 'auto') rows.push([[SET.padSwap ? 'L-stick' : 'R-stick'], SET.firePad === 'stick' ? 'Aim and fire' : 'Aim']);
    if (am !== 'auto' && SET.firePad !== 'stick') rows.push([[padLabel(L('pad', 'fire'))], SET.firePad === 'auto' ? 'Fire (or on target)' : 'Fire']);
    if (am === 'auto') rows.push([['Auto'], 'Aims and fires']);
    rows.push([[padLabel(L('pad', 'dash'))], 'Dash'], [[padLabel(L('pad', 'air'))], 'A-10'], [[padLabel(L('pad', 'aim'))], 'Auto-aim'], [[padLabel(L('pad', 'pause'))], 'Pause']);
    return rows;
  }
  const mv = ['up', 'left', 'down', 'right'].map(i => keyLabel(firstBind('kb', i)));
  rows.push([mv, 'Move']);
  if (am !== 'auto') rows.push([['Mouse'], 'Aim'], [[keyLabel(firstBind('kb', 'fire'))], SET.fireKbm === 'toggle' ? 'Fire on/off' : SET.fireKbm === 'auto' ? 'Fire (or on target)' : 'Fire']);
  else rows.push([['Auto'], 'Aims and fires']);
  rows.push([[keyLabel(firstBind('kb', 'dash'))], 'Dash'], [[keyLabel(firstBind('kb', 'air'))], 'A-10'], [[keyLabel(firstBind('kb', 'aim'))], 'Auto-aim'], [['Esc'], 'Pause']);
  return rows;
}
/* ---------- the main menu's status bar: the studio, the version, the engines, the wave timer, the clock ---------- */
const WT_NAMES = { short: 'Short', normal: 'Normal', long: 'Long', off: 'Off' };
function renderTitleBar() { try { titleBar(); } catch (e) { /* (at start-up some of what it reads is not there yet; the next second fills it) */ } }
const statusTest = () => { try { return STATUS.test === ZC_VERSION && STATUS.stable !== ZC_VERSION; } catch (e) { return false; } };
function titleBar() {
  const B = $('mxBar'); if (!B) return;
  const st = typeof coreStatus === 'function' ? coreStatus() : [], down = st.filter(e => e.state === 'resting').length, now = new Date();
  const locked = typeof CORE !== 'undefined' ? CORE.list.filter(e => e.lockUntil > performance.now()).length : 0;
  B.textContent = '';
  const brand = el('div', 'mx-brand'); brand.append(el('b', null, 'DeclAIre Studios'), el('span', null, 'Zombie City 2.0')); B.append(brand);
  const chips = el('div', 'mx-chips');
  const chip = (k, v, cls) => { const c = el('span', 'mx-chip' + (cls ? ' ' + cls : '')); c.append(el('small', null, k), el('b', null, v)); chips.append(c); };
  chip('Version', ZC_VERSION + (statusTest() ? ' · test' : ''));
  chip('Engines', st.length + (down ? ' · ' + down + ' resting' : locked ? ' · ' + locked + ' locked' : ' · all sound'), down ? 'warn' : '');
  chip('Wave timer', WT_NAMES[SET.waveTimer] || 'Normal');
  chip('Network', navigator.onLine === false ? 'Offline' : 'Online', navigator.onLine === false ? 'warn' : 'ok');
  B.append(chips);
  const clk = el('div', 'mx-clock'); clk.append(el('b', null, String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')), el('span', null, now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }))); B.append(clk);
  const ps = $('playSub'); if (ps) { const t = typeof waveTime === 'function' ? waveTime(1) : 0; ps.textContent = 'Wave 1 · ' + (t ? fmtClock(t) + ' on the clock' : 'no wave timer') + ' · the first ' + (typeof ZR !== 'undefined' ? ZR.length : 50) + ' of 2.0'; }
}
setInterval(() => { if (G.mode === 'title' && !$('title').hidden) renderTitleBar(); }, 1000);
function renderTitlePanel() {
  const P = $('titlePanel'); if (!P) return;
  renderTitleBar();
  P.textContent = '';
  if (!P.dataset.once && G.mode === 'title' && $('intro').hidden) { P.dataset.once = '1'; P.classList.add('fresh'); setTimeout(() => P.classList.remove('fresh'), 1200); }   // the cards rise in once, not on every update
  const card = (cls, title, sub) => { const c = el('section', 'tp-card ' + cls), h = el('div', 'tp-head'); h.append(el('span', null, title)); if (sub) h.append(el('em', null, sub)); c.append(h); P.append(c); return c; };
  // survivor file
  const signed = ACCT.status === 'in', T = acctTotals();
  const f = card('tp-file', 'Survivor file', signed && ACCT.member.tag ? '#' + ACCT.member.tag : 'No. ' + String(STATS.sid).padStart(4, '0'));
  const id = el('div', 'tp-id'); const nm = el('b', 'tp-name' + (hasName() ? '' : ' none'), hasName() ? getTag() : 'No name yet'); id.append(nm, devIcon(DEV.kind)); f.append(id);
  f.append(el('p', 'tp-dev', devLine()));
  const ac = el('button', 'tp-acct' + (signed ? ' on' : ACCT.status === 'locked' ? ' warn' : ''), signed ? 'Cloud save on' + (T.devices > 1 ? ' · ' + T.devices + ' devices' : '') : ACCT.status === 'locked' ? 'Cloud save locked: tap to unlock' : 'Log in to save your progress to the cloud');
  ac.type = 'button'; ac.addEventListener('click', () => { SFX.click(); openAcct(); }); f.append(ac);
  const dl = el('dl', 'tp-stats');
  [['Runs', fmtK(T.runs)], ['Best wave', STATS.bestWave || '—'], ['Kills', fmtK(T.kills)], ['Time alive', T.time ? fmtTime(T.time) : '—'], ['Best chain', STATS.bestChain ? 'x' + STATS.bestChain : '—'], ['Best score', STATS.bestScore ? STATS.bestScore.toLocaleString() : '—']]
    .forEach(([k, v]) => { const d = el('div'); d.append(el('dt', null, k), el('dd', null, String(v))); dl.append(d); });
  f.append(dl);
  // controls for the device in use
  const c = card('tp-ctrl', 'Controls', DEV.kind === 'pad' ? padName() : DEV_NAMES[DEV.kind]);
  const ul = el('ul', 'tp-keys');
  for (const [caps, what] of ctrlRows()) { const li = el('li'); const ks = el('span', 'kcs'); caps.forEach(t => ks.append(keycap(t || '—', (t || '').length > 3))); li.append(ks, el('span', 'kw', what)); ul.append(li); }
  c.append(ul);
  if (DEV.kind !== 'touch') { const b = el('button', 'btn small ghost tp-btn', DEV.kind === 'pad' ? 'Change buttons' : 'Change keys'); b.type = 'button'; b.addEventListener('click', () => { SP.mode = 'advanced'; openSettings('controls'); }); c.append(b); }
  // the board
  const live = LB.status === 'live', rows = (live ? LB.rows : store.get('zc_lb_' + SEASON, [])).slice(0, 3);
  const bd = card('tp-board', live ? 'Top of the board' : 'Your best runs', SEASON_NAME);
  const ol = el('ol', 'tp-rows');
  if (!rows.length) ol.append(el('li', 'tp-empty', 'No scores yet this season. Be the first.'));
  rows.forEach((r, i) => { const li = el('li', live && r.id === LB.uid ? 'me' : ''); li.append(el('span', 'rk', '#' + (i + 1)), nameEl(cleanTag(r.tag, r.id), r.id, 'span', 'tg'), el('span', 'sc', Number(r.score || 0).toLocaleString())); if (r.dev) li.append(devIcon(r.dev)); ol.append(li); });
  bd.append(ol, el('p', 'tp-note', live ? 'One board for phone, PC and controller.' : LB.status === 'loading' ? 'Connecting to the global board.' : LB.src === 'wix' ? 'No connection to the global board right now.' : 'The global board is not available on this page.'));
  // what's new
  const n = card('tp-new', 'New in ' + ZC_VERSION, 'Zombie City 2.0');
  const nl = el('ul');
  ['Wave timers: beat the clock, or the next wave lands on top of you', 'A new HUD, menus and pause screen on every device', 'The engine room: every engine\'s live numbers, and which runs harder (Settings > Accessibility)', 'The first 50 rebuilt zombies, real guns and bullets'].forEach(t => nl.append(el('li', null, t)));
  n.append(nl);
}

// the Windows app can be closed from the main menu
if (window.ZCDesktop) { const q = $('quitApp'); q.hidden = false; q.addEventListener('click', () => { SFX.click(); window.ZCDesktop.quit(); }); }
// the launcher (news and updates) is one click away from the main menu
if (window.ZCDesktop && window.ZCDesktop.launcher) { const b = $('toLauncher'); b.hidden = false; b.addEventListener('click', () => { SFX.click(); if (NET.role) netLeave(); window.ZCDesktop.launcher(); }); }
