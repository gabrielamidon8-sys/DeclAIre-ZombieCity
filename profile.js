/* ================= your name, your record and the main menu's side panel =================
   You type your name on the main menu once; it shows at the top left of the screen during a run and goes on the
   leaderboard with your scores, together with what you played on (phone, PC or controller). The global board on
   the web page is one board for every device. */
function hasName() { return !!store.get('zc_tag', ''); }
// returns the saved name, or null when the name filter turned it down (the reason shows under the name box)
function setName(v) {
  const chk = ZCF.check(v);
  if (!chk.ok) { nameErr(chk.msg); return null; }
  nameErr('');
  const t = cleanTag(v); store.set('zc_tag', t);
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
  $('hudName').hidden = !named; $('hudNameTxt').textContent = named ? tag : '';
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
$('nameInput').addEventListener('input', e => { const v = e.target.value.toUpperCase().replace(/[^A-Z0-9 _.\-]/g, ''); if (v !== e.target.value) e.target.value = v; });
$('nameInput').addEventListener('blur', () => {
  const v = $('nameInput').value.trim();
  if (v && v === nameRejected) return;
  if (v && cleanTag(v) !== getTag()) { if (!setName(v)) { nameRejected = v; $('nameInput').value = hasName() ? getTag() : ''; } }
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
function renderTitlePanel() {
  const P = $('titlePanel'); if (!P) return;
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
  rows.forEach((r, i) => { const li = el('li', live && r.id === LB.uid ? 'me' : ''); li.append(el('span', 'rk', '#' + (i + 1)), el('span', 'tg', cleanTag(r.tag)), el('span', 'sc', Number(r.score || 0).toLocaleString())); if (r.dev) li.append(devIcon(r.dev)); ol.append(li); });
  bd.append(ol, el('p', 'tp-note', live ? 'One board for phone, PC and controller.' : LB.status === 'loading' ? 'Connecting to the global board.' : LB.src === 'wix' ? 'No connection to the global board right now.' : 'The global board is not available on this page.'));
  // what's new
  const n = card('tp-new', 'New in 1.9.80');
  const nl = el('ul');
  ['DeclAIre accounts: your progress saved to the cloud, on every device', 'One global board for the website, Android and Windows', 'A name filter that keeps the board clean (and has opinions)', 'Wi-Fi co-op for 2 to 4 players'].forEach(t => nl.append(el('li', null, t)));
  n.append(nl);
}

// the Windows app can be closed from the main menu
if (window.ZCDesktop) { const q = $('quitApp'); q.hidden = false; q.addEventListener('click', () => { SFX.click(); window.ZCDesktop.quit(); }); }
// the launcher (news and updates) is one click away from the main menu
if (window.ZCDesktop && window.ZCDesktop.launcher) { const b = $('toLauncher'); b.hidden = false; b.addEventListener('click', () => { SFX.click(); if (NET.role) netLeave(); window.ZCDesktop.launcher(); }); }
