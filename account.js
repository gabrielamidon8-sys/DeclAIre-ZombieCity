/* ================= your DeclAIre account in the game =================
   Log in (or create a free account) from the main menu and your progress follows you: weapons, dashes, specimens,
   bosses, your best runs and your record, merged across every phone and PC you play on. It saves on its own after
   every run and whenever the game goes to the background. Your name on the global board is your account name.
   The talking to Wix and the encryption are in acct-core.js; this file is the screen and the merging. */
const ACCT = { member: AcctCore.ls.get('member', null), dk: AcctCore.ls.get('dk', null), status: 'out', busy: false, lastSync: AcctCore.ls.get('synced', 0), msg: null, view: 'login', pending: null, rec: null, others: null };
ACCT.status = ACCT.member && ACCT.dk && AcctCore.isMember() ? 'in' : 'out';
if (ACCT.status === 'out' && ACCT.member) { ACCT.member = null; AcctCore.ls.set('member', null); }
const ACCT_PAGE = ACCT_CFG.site + '/';
let DEVID = store.get('zc_devid', ''); if (!DEVID) { DEVID = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join(''); store.set('zc_devid', DEVID); }

/* ---------- reaching the network from the apps ---------- */
// The Windows launcher and the Android app make the account calls themselves (a page there can't call Wix directly).
if (window.ZCDesktop && window.ZCDesktop.http) AcctCore.setHttp(async (m, u, h, b) => {
  const r = await window.ZCDesktop.http({ method: m, url: u, headers: h, body: b });
  if (!r || (!r.status && r.error)) throw new AcctCore.AcctError(r && r.error === 'blocked' ? 'That address is not allowed.' : 'No connection. Check your internet and try again.', 0);
  return r;
});
else if (window.ZCNative && typeof window.ZCNative.httpStart === 'function') {
  AcctCore.setHttp((m, u, h, b) => new Promise((resolve, reject) => {
    const id = window.ZCNative.httpStart(m, u, JSON.stringify(h || {}), b == null ? '' : String(b));
    if (id < 0) { reject(new AcctCore.AcctError('That address is not allowed.')); return; }
    const t0 = Date.now();
    const poll = () => {
      const r = window.ZCNative.httpPoll(id);
      if (r) { const o = JSON.parse(r); if (o.error) reject(new AcctCore.AcctError('No connection. Check your internet and try again.', 0)); else resolve({ status: o.status, text: o.text }); return; }
      if (Date.now() - t0 > 40000) { reject(new AcctCore.AcctError('The connection timed out.', 0)); return; }
      setTimeout(poll, 60);
    };
    setTimeout(poll, 30);
  }));
}
function openWeb(url) {
  if (window.ZCDesktop && window.ZCDesktop.open) window.ZCDesktop.open(url);
  else if (window.ZCNative && window.ZCNative.openUrl) window.ZCNative.openUrl(url);
  else window.open(url, '_blank', 'noopener');
}
AcctCore.onSignedOut = why => { ACCT.member = null; ACCT.dk = null; ACCT.status = 'out'; AcctCore.ls.set('dk', null); if (why === 'expired') ACCT.msg = { t: 'Your sign-in expired. Log in again to keep saving to the cloud.', bad: true }; renderAcct(); updAcctUi(); };

/* ---------- your progress as one save ---------- */
function acctSnapshot() {
  return {
    v: 1, found: Array.from(found), guns: Array.from(guns), dashes: Array.from(dashes), bosses: Array.from(bossSeen), bossk: Array.from(bossKilled),
    overlord: store.get('zc_overlord', 0) | 0, keeper: store.get('zc_keeper', 0) | 0, loadout: store.get('zc_loadout', 0), dash: store.get('zc_dash', 'sprint'),
    best: { wave: STATS.bestWave | 0, chain: STATS.bestChain | 0, score: STATS.bestScore | 0 },
    devices: { [DEVID]: { runs: STATS.runs | 0, kills: STATS.kills | 0, time: STATS.time | 0, plat: PLATFORM, at: Date.now() } },
    lb: { [SEASON]: store.get('zc_lb_' + SEASON, []) }
  };
}
// cloud + this device → one save: everything unlocked anywhere stays unlocked, bests are the best, each device keeps its own totals
function acctMerge(cloud, local) {
  cloud = cloud || {};
  const u = (a, b) => Array.from(new Set([].concat(a || [], b || [])));
  const lb = {};
  for (const src of [cloud.lb || {}, local.lb || {}]) for (const k of Object.keys(src)) { lb[k] = (lb[k] || []).concat(src[k] || []); }
  const keep = Object.keys(lb).sort().slice(-2), lbOut = {};
  for (const k of keep) { const seen = new Set(); lbOut[k] = lb[k].filter(e => e && !seen.has(e.at + ':' + e.score) && seen.add(e.at + ':' + e.score)).sort((a, b) => b.score - a.score).slice(0, 25); }
  const cb = cloud.best || {}, lbst = local.best || {};
  return {
    v: 1, found: u(cloud.found, local.found), guns: u(cloud.guns, local.guns), dashes: u(cloud.dashes, local.dashes), bosses: u(cloud.bosses, local.bosses), bossk: u(cloud.bossk, local.bossk),
    overlord: Math.max(cloud.overlord | 0, local.overlord | 0), keeper: Math.max(cloud.keeper | 0, local.keeper | 0),
    loadout: local.loadout != null ? local.loadout : cloud.loadout, dash: local.dash || cloud.dash,
    best: { wave: Math.max(cb.wave | 0, lbst.wave | 0), chain: Math.max(cb.chain | 0, lbst.chain | 0), score: Math.max(cb.score | 0, lbst.score | 0) },
    devices: Object.assign({}, cloud.devices || {}, local.devices || {}), lb: lbOut
  };
}
// put a merged save into the game (only ever adds)
function acctApply(s) {
  let changed = false;
  const add = (set, arr, save) => { let n = 0; for (const x of arr || []) if (!set.has(x)) { set.add(x); n++; } if (n) { save(); changed = true; } };
  add(found, s.found, saveFound); add(guns, s.guns, saveGuns); add(dashes, s.dashes, saveDashes);
  add(bossSeen, s.bosses, saveBosses); add(bossKilled, s.bossk, saveBosses);
  if ((s.overlord | 0) > (store.get('zc_overlord', 0) | 0)) { store.set('zc_overlord', s.overlord | 0); changed = true; }
  if ((s.keeper | 0) > (store.get('zc_keeper', 0) | 0)) store.set('zc_keeper', s.keeper | 0);
  const b = s.best || {};
  if (b.wave > STATS.bestWave || b.chain > STATS.bestChain || b.score > STATS.bestScore) {
    STATS.bestWave = Math.max(STATS.bestWave, b.wave | 0); STATS.bestChain = Math.max(STATS.bestChain, b.chain | 0); STATS.bestScore = Math.max(STATS.bestScore, b.score | 0);
    store.set('zc_stats', STATS); changed = true;
  }
  const cur = (s.lb || {})[SEASON];
  if (cur && cur.length) { const k = 'zc_lb_' + SEASON, had = store.get(k, []); if (cur.length !== had.length || (cur[0] && had[0] && cur[0].score !== had[0].score) || (cur[0] && !had[0])) { store.set(k, cur); changed = true; } }
  ACCT.others = Object.entries(s.devices || {}).filter(([id]) => id !== DEVID).map(([, d]) => d);
  return changed;
}
// runs, kills and time played across every device on the account (this device counted live)
function acctTotals() {
  const t = { runs: STATS.runs | 0, kills: STATS.kills | 0, time: STATS.time | 0, devices: 1 };
  if (ACCT.status === 'in' && ACCT.others) for (const d of ACCT.others) { t.runs += d.runs | 0; t.kills += d.kills | 0; t.time += d.time | 0; t.devices++; }
  return t;
}
function acctSummary(s) {
  const t = acctTotals();
  return { bestWave: s.best.wave, bestScore: s.best.score, bestChain: s.best.chain, runs: t.runs, kills: t.kills, time: t.time, devices: t.devices,
    weapons: s.guns.length, dashes: s.dashes.length, specimens: s.found.length, bosses: s.bosses.length, version: ZC_VERSION, plat: PLATFORM };
}

/* ---------- saving to the cloud ---------- */
let acctSyncing = null, acctSyncTimer = 0;
function acctSoon(ms) { if (ACCT.status !== 'in') return; clearTimeout(acctSyncTimer); acctSyncTimer = setTimeout(() => acctSync('auto'), ms || 3000); }
async function acctSync(why) {
  if (ACCT.status !== 'in' || !ACCT.member || !ACCT.dk) return false;
  if (acctSyncing) return acctSyncing;
  acctSyncing = (async () => {
    try {
      const rec = await AcctCore.myRecord();
      const cloud = rec ? await AcctCore.decryptSave(ACCT.dk, rec.data.save, ACCT.member.id) : null;
      if (cloud === undefined) { ACCT.status = 'locked'; ACCT.rec = rec; renderAcct(); updAcctUi(); return false; }
      const merged = acctMerge(cloud, acctSnapshot());
      const changed = acctApply(merged);
      const blob = await AcctCore.encryptSave(ACCT.dk, merged, ACCT.member.id);
      ACCT.rec = await AcctCore.writeRecord(rec, { save: blob, saveVer: ((rec && rec.data.saveVer) | 0) + 1, summary: JSON.stringify(acctSummary(merged)), updatedAt: Date.now() });
      ACCT.lastSync = Date.now(); AcctCore.ls.set('synced', ACCT.lastSync);
      if (ACCT.msg && ACCT.msg.sync) ACCT.msg = null;
      if (changed && G.mode === 'title') refreshTitle();
      return true;
    } catch (e) {
      if (why !== 'auto' || !ACCT.msg) ACCT.msg = { t: e.status === 0 || !e.status ? 'Could not reach the cloud save. Your progress is safe on this device and saves next time.' : 'Cloud save failed: ' + e.message, bad: true, sync: true };
      return false;
    } finally { acctSyncing = null; if (ACCT.status === 'in' || ACCT.status === 'locked') renderAcct(); else acctMsgShow(); updAcctUi(); }
  })();
  return acctSyncing;
}
document.addEventListener('visibilitychange', () => { if (document.hidden && ACCT.status === 'in') acctSync('auto'); });

/* ---------- signing in ---------- */
const AUTH_TEXT = {
  password: 'Wrong email or password.', notfound: 'Wrong email or password.', unknown: 'Wrong email or password.',
  exists: 'There is already an account with that email. Log in instead.', invalid: 'That email or password was not accepted. Passwords need at least 6 characters.',
  reset: 'This account needs a new password. Use "Forgot password" to set one.', network: 'Could not reach DeclAIre accounts. Check your internet and try again.',
  captcha: 'One quick robot check is needed, and it only works on the website.'
};
let acctFails = 0, acctWait = 0;
async function acctAfterAuth(email, password, wantName) {
  let rec = await AcctCore.myRecord(), dk;
  if (!rec) {
    const keys = await AcctCore.newKeys(password);
    dk = keys.dataKey;
    const name = cleanTag(wantName || (hasName() ? getTag() : 'SURVIVOR'));
    rec = await AcctCore.writeRecord(null, { username: name, tag: AcctCore.newTag(), kdfSalt: keys.kdfSalt, kdfIter: keys.kdfIter, wrappedKey: keys.wrappedKey, save: '', saveVer: 0, summary: '{}', updatedAt: Date.now() });
  } else {
    dk = await AcctCore.unlockKey(password, rec.data);
  }
  ACCT.member = { id: rec.data._owner, email: email, username: rec.data.username || 'SURVIVOR', tag: rec.data.tag || '' };
  AcctCore.ls.set('member', ACCT.member);
  ACCT.rec = rec;
  if (!dk) { ACCT.status = 'locked'; ACCT.dk = null; ACCT.pwNow = password; renderAcct(); updAcctUi(); return; }
  ACCT.dk = dk; AcctCore.ls.set('dk', dk); ACCT.status = 'in';
  store.set('zc_tag', cleanTag(ACCT.member.username)); nameErr(''); updNameUi();
  ACCT.msg = { t: 'Welcome, ' + ACCT.member.username + '. Your progress is saving to the cloud.' };
  await acctSync('login');
  lbRefresh(true);
}
async function acctLogin(email, password) {
  if (Date.now() < acctWait) { acctSay('Too many tries. Wait ' + Math.ceil((acctWait - Date.now()) / 1000) + ' seconds.', true); return; }
  const r = await AcctCore.login(email, password);
  if (r.state === 'ok') { acctFails = 0; await acctAfterAuth(email, password); return; }
  if (r.state === 'verify') { ACCT.pending = { stateToken: r.stateToken, email: email, password: password }; ACCT.view = 'verify'; acctSay('We emailed you a code. Type it below to finish logging in.'); return; }
  if (r.state === 'pending') { acctSay('Your account is waiting for approval. Try again later.', true); return; }
  if (++acctFails >= 5) { acctWait = Date.now() + 30000; acctFails = 0; }
  if (r.reason === 'captcha') { ACCT.view = 'captcha'; ACCT.pending = { email: email, mode: 'login' }; renderAcct(); return; }
  acctSay(AUTH_TEXT[r.reason] || r.message || 'Could not log in.', true);
}
async function acctRegister(name, email, password) {
  const r = await AcctCore.register(email, password, name);
  if (r.state === 'ok') { await acctAfterAuth(email, password, name); return; }
  if (r.state === 'verify') { ACCT.pending = { stateToken: r.stateToken, email: email, password: password, name: name }; ACCT.view = 'verify'; acctSay('We emailed you a code. Type it below to finish.'); return; }
  if (r.state === 'pending') { acctSay('Your account was created and is waiting for approval.', true); return; }
  if (r.reason === 'captcha') { ACCT.view = 'captcha'; ACCT.pending = { email: email, name: name, mode: 'signup' }; renderAcct(); return; }
  acctSay(AUTH_TEXT[r.reason] || r.message || 'Could not create the account.', true);
}
async function acctVerify(code) {
  const p = ACCT.pending; if (!p) return;
  const r = await AcctCore.verifyEmail(code, p.stateToken);
  if (r.state === 'ok') { ACCT.pending = null; ACCT.view = 'login'; await acctAfterAuth(p.email, p.password, p.name); return; }
  acctSay(r.state === 'fail' ? 'That code did not work. Check the email and try again.' : 'Could not finish. Try logging in again.', true);
}
// Unlock with the password the save was locked with. If that was an old password (from before a reset), the key is
// locked again with the current one, so the other devices open it with the password they know.
async function acctUnlock(password) {
  const rec = await AcctCore.myRecord() || ACCT.rec;
  const dk = rec && await AcctCore.unlockKey(password, rec.data);
  if (!dk) { acctSay('That password does not open this save.', true); return; }
  if (ACCT.pwNow && ACCT.pwNow !== password) ACCT.rec = await AcctCore.writeRecord(rec, Object.assign(await AcctCore.relock(ACCT.pwNow, dk), { updatedAt: Date.now() }));
  ACCT.pwNow = null;
  ACCT.dk = dk; AcctCore.ls.set('dk', dk); ACCT.status = 'in'; ACCT.msg = { t: 'Save unlocked.' };
  store.set('zc_tag', cleanTag(ACCT.member.username)); updNameUi();
  await acctSync('unlock');
}
// the old password is gone: start a new key, and the cloud save is rebuilt from this device's progress
async function acctFreshKey(password) {
  const rec = ACCT.rec || await AcctCore.myRecord();
  const keys = await AcctCore.newKeys(password);
  ACCT.rec = await AcctCore.writeRecord(rec, { kdfSalt: keys.kdfSalt, kdfIter: keys.kdfIter, wrappedKey: keys.wrappedKey, save: '', updatedAt: Date.now() });
  ACCT.dk = keys.dataKey; AcctCore.ls.set('dk', keys.dataKey); ACCT.status = 'in'; ACCT.pwNow = null; ACCT.msg = { t: 'New cloud save started from this device.' };
  await acctSync('fresh');
}
async function acctLogout() {
  if (ACCT.status === 'in') await acctSync('logout');
  AcctCore.signOut(); AcctCore.ls.set('dk', null);
  ACCT.member = null; ACCT.dk = null; ACCT.pwNow = null; ACCT.status = 'out'; ACCT.others = null; ACCT.view = 'login';
  ACCT.msg = { t: 'Logged out. Your progress stays on this device too.' };
  renderAcct(); updAcctUi(); lbRefresh(true);
}
// a new name while logged in renames the account and its board entries too
async function acctRename(tag) {
  if (ACCT.status !== 'in' || !ACCT.member || ACCT.member.username === tag) return;
  ACCT.member.username = tag; AcctCore.ls.set('member', ACCT.member);
  try { ACCT.rec = await AcctCore.writeRecord(ACCT.rec || await AcctCore.myRecord(), { username: tag, updatedAt: Date.now() }); await AcctCore.renameScores(ACCT.member.id, tag); lbRefresh(true); }
  catch (e) { /* renamed here; the cloud catches up on the next save */ }
}

/* ---------- the account sheet ---------- */
// a message under the heading; the forms stay as typed
function acctSay(t, bad) { ACCT.msg = { t: t, bad: !!bad }; acctMsgShow(); }
function acctMsgShow() { const m = $('acctMsg'); if (!m) return; m.hidden = !ACCT.msg; if (ACCT.msg) { m.textContent = ACCT.msg.t; m.classList.toggle('bad', !!ACCT.msg.bad); } }
const acctKey = () => ACCT.status + '|' + ACCT.view;
function openAcct(view) { if (view) ACCT.view = view; $('acct').hidden = false; $('acct').scrollTop = 0; renderAcct(); if (ACCT.status === 'in') acctSync('open'); }
function closeAcct() { $('acct').hidden = true; if (G.mode === 'title') refreshTitle(); }
function field(label, type, name, auto, extra) {
  const l = el('label', 'acct-field'); l.append(el('span', null, label));
  const i = document.createElement('input'); i.type = type; i.name = name; i.autocomplete = auto; i.spellcheck = false; i.required = true;
  Object.assign(i, extra || {}); l.append(i); return [l, i];
}
function busyRun(btn, fn) {
  return async e => {
    if (e) e.preventDefault();
    if (ACCT.busy) return;
    ACCT.busy = true; const t = btn.textContent, k0 = acctKey(); btn.disabled = true; btn.textContent = 'Working';
    try { await fn(); } catch (err) { acctSay(err && err.message ? err.message : 'Something went wrong. Try again.', true); }
    finally { ACCT.busy = false; btn.disabled = false; btn.textContent = t; if (acctKey() !== k0 || ACCT.status === 'in') renderAcct(); else acctMsgShow(); updAcctUi(); }
  };
}
function renderAcct() {
  const body = $('acctBody'); if (!body || $('acct').hidden) return;
  body.textContent = '';
  acctMsgShow();
  const card = (title, cls) => { const c = el('section', 'coop-card acct-card' + (cls ? ' ' + cls : '')); c.append(el('h3', null, title)); body.append(c); return c; };
  if (ACCT.status === 'in') {
    const c = card(ACCT.member.username);
    const id = el('p', 'acct-id'); id.append(el('b', null, ACCT.member.username), el('span', null, ACCT.member.tag ? ' #' + ACCT.member.tag : '')); c.firstChild.replaceWith(id);
    c.append(el('p', null, ACCT.member.email));
    const t = acctTotals();
    const dl = el('dl', 'acct-stats');
    [['Cloud save', ACCT.lastSync ? 'Saved ' + new Date(ACCT.lastSync).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Not yet'], ['Devices', String(t.devices)], ['Runs', fmtK(t.runs)], ['Best wave', String(STATS.bestWave || '—')]]
      .forEach(([k, v]) => { const d = el('div'); d.append(el('dt', null, k), el('dd', null, v)); dl.append(d); });
    c.append(dl);
    const row = el('div', 'acct-row');
    const sync = el('button', 'btn primary', 'Save now'); sync.type = 'button'; sync.addEventListener('click', busyRun(sync, async () => { if (await acctSync('manual')) acctSay('Saved to the cloud.'); }));
    const web = el('button', 'btn', 'Manage on the website'); web.type = 'button'; web.addEventListener('click', () => openWeb(ACCT_PAGE));
    const out = el('button', 'btn ghost', 'Log out'); out.type = 'button'; out.addEventListener('click', busyRun(out, acctLogout));
    row.append(sync, web, out); c.append(row);
    c.append(el('p', 'acct-note', 'Change your name on the main menu; it changes here and on the global board. Change your password or delete your account on the website.'));
    return;
  }
  if (ACCT.status === 'locked') {
    const c = card('Unlock your save', 'warn');
    c.append(el('p', null, ACCT.pwNow
      ? 'Your cloud save is still locked with your old password, from before it was reset. Type the old password once to open it; it is then locked with your new one. Or start a new cloud save from the progress on this device.'
      : 'Your cloud save was locked again on another device. Type your current account password to open it here.'));
    const f = document.createElement('form'); f.className = 'acct-form';
    const [l1, p1] = field(ACCT.pwNow ? 'Old password' : 'Account password', 'password', 'password', 'current-password');
    const go = el('button', 'btn primary', 'Unlock'); go.type = 'submit';
    f.append(l1, go); f.addEventListener('submit', busyRun(go, () => acctUnlock(p1.value))); c.append(f);
    const f2 = document.createElement('form'); f2.className = 'acct-form';
    const [l2, p2] = field('Your current password', 'password', 'newpw', 'current-password');
    const fresh = el('button', 'btn danger', 'Start a new cloud save'); fresh.type = 'submit';
    f2.append(l2, fresh); f2.addEventListener('submit', busyRun(fresh, async () => {
      const r = await AcctCore.login(ACCT.member.email, p2.value);
      if (r.state !== 'ok') { acctSay('That is not your current password.', true); return; }
      await acctFreshKey(p2.value);
    }));
    c.append(el('p', 'acct-note', 'Starting a new cloud save replaces the old locked one. Everything on this device is kept and uploaded.'), f2);
    const out = el('button', 'btn ghost', 'Log out'); out.type = 'button'; out.addEventListener('click', busyRun(out, acctLogout)); c.append(out);
    return;
  }
  if (ACCT.view === 'verify' && ACCT.pending) {
    const c = card('Check your email');
    c.append(el('p', null, 'We sent a code to ' + ACCT.pending.email + '.'));
    const f = document.createElement('form'); f.className = 'acct-form';
    const [l, i] = field('Code', 'text', 'code', 'one-time-code', { inputMode: 'numeric', maxLength: 10 });
    const go = el('button', 'btn primary', 'Finish'); go.type = 'submit';
    f.append(l, go); f.addEventListener('submit', busyRun(go, () => acctVerify(i.value))); c.append(f);
    const back = el('button', 'btn ghost', 'Back'); back.type = 'button'; back.addEventListener('click', () => { ACCT.view = 'login'; ACCT.pending = null; ACCT.msg = null; renderAcct(); }); c.append(back);
    return;
  }
  if (ACCT.view === 'captcha' && ACCT.pending) {
    const c = card(ACCT.pending.mode === 'signup' ? 'Finish on the website' : 'Log in on the website once');
    c.append(el('p', null, ACCT.pending.mode === 'signup'
      ? 'New accounts need a quick robot check, and the game can\'t show one. Open the account page, create your account there (it takes a minute), then come back and log in here with the same email and password.'
      : 'Wix asked for a quick robot check before this login. Open the account page and log in there once, then come back and log in here.'));
    const open = el('button', 'btn primary', 'Open the account page'); open.type = 'button';
    open.addEventListener('click', () => openWeb(ACCT_PAGE + (ACCT.pending.mode === 'signup' ? '?join=1' : '') + '#email=' + encodeURIComponent(ACCT.pending.email || '') + (ACCT.pending.name ? '&name=' + encodeURIComponent(ACCT.pending.name) : '')));
    const back = el('button', 'btn ghost', 'Back to log in'); back.type = 'button'; back.addEventListener('click', () => { ACCT.view = 'login'; ACCT.msg = null; renderAcct(); });
    const row = el('div', 'acct-row'); row.append(open, back); c.append(row);
    return;
  }
  // logged out: log in, or create an account
  const grid = el('div', 'coop-grid'); body.append(grid);
  const lc = el('section', 'coop-card acct-card'); lc.append(el('h3', null, 'Log in')); grid.append(lc);
  const lf = document.createElement('form'); lf.className = 'acct-form'; lf.autocomplete = 'on';
  const [le, ei] = field('Email', 'email', 'email', 'username'), [lp, pi] = field('Password', 'password', 'password', 'current-password');
  const lb = el('button', 'btn primary', 'Log in'); lb.type = 'submit';
  lf.append(le, lp, lb); lf.addEventListener('submit', busyRun(lb, () => acctLogin(ei.value.trim(), pi.value))); lc.append(lf);
  const forgot = el('button', 'acct-link', 'Forgot password?'); forgot.type = 'button';
  forgot.addEventListener('click', busyRun(forgot, async () => {
    const em = ei.value.trim(); if (!/^\S+@\S+\.\S+$/.test(em)) { acctSay('Type your email above first, then press Forgot password.', true); ei.focus(); return; }
    await AcctCore.sendReset(em, ACCT_PAGE);
    acctSay('If there is an account for ' + em + ', a link to set a new password is on its way. Check your email.');
  }));
  lc.append(forgot);
  const rc = el('section', 'coop-card acct-card'); rc.append(el('h3', null, 'Create a free account')); grid.append(rc);
  const rf = document.createElement('form'); rf.className = 'acct-form'; rf.autocomplete = 'on';
  const [rn, ni] = field('Name on the board', 'text', 'nickname', 'nickname', { maxLength: 14, autocapitalize: 'characters', value: hasName() ? getTag() : '' });
  const [re, ri] = field('Email', 'email', 'email', 'username'), [rp, rpi] = field('Password (6 or more characters)', 'password', 'new-password', 'new-password', { minLength: 6 });
  const age = el('label', 'acct-check'); const ab = document.createElement('input'); ab.type = 'checkbox'; ab.required = true;
  age.append(ab, el('span', null, 'I am 13 or older and agree to the privacy policy.'));
  const pol = el('button', 'acct-link', 'Read the privacy policy'); pol.type = 'button'; pol.addEventListener('click', () => openWeb(ACCT_PAGE + '#privacy'));
  const rb = el('button', 'btn primary', 'Create account'); rb.type = 'submit';
  ni.addEventListener('input', () => { const v = ni.value.toUpperCase().replace(/[^A-Z0-9 _.\-]/g, ''); if (v !== ni.value) ni.value = v; });
  rf.append(rn, re, rp, age, rb); rc.append(rf, pol);
  rf.addEventListener('submit', busyRun(rb, async () => {
    const name = cleanTag(ni.value);
    const chk = ZCF.check(ni.value);
    if (!chk.ok) { acctSay(chk.msg, true); ni.focus(); return; }
    if (ni.value.trim().length < 3) { acctSay('Pick a name with at least 3 characters.', true); return; }
    if (rpi.value.length < 6) { acctSay('Passwords need at least 6 characters.', true); return; }
    await acctRegister(name, ri.value.trim(), rpi.value);
  }));
}
function updAcctUi() {
  const em = $('acctBtnEm'); if (em) em.textContent = ACCT.status === 'in' ? ACCT.member.username : ACCT.status === 'locked' ? 'Locked' : 'Log in';
  const b = $('acctBtn'); if (b) b.classList.toggle('acct-on', ACCT.status === 'in');
  if (G.mode === 'title') renderTitlePanel();
}
$('acctBtn').addEventListener('click', () => { SFX.click(); openAcct(); });
$('acctClose').addEventListener('click', closeAcct);
updAcctUi();
// signed in from before: check in with the cloud shortly after the game starts
if (ACCT.status === 'in') setTimeout(() => acctSync('start'), 6000);
