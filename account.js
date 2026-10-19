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
    devices: acctDevices(cloud.devices, local.devices), lb: lbOut
  };
}
// each device's totals: the larger of what the cloud and the device have
function acctDevices(a, b) {
  const out = Object.assign({}, a || {});
  for (const [id, d] of Object.entries(b || {})) {
    const c = out[id];
    out[id] = !c ? d : { runs: Math.max(c.runs | 0, d.runs | 0), kills: Math.max(c.kills | 0, d.kills | 0), time: Math.max(c.time | 0, d.time | 0), plat: d.plat || c.plat, at: Math.max(c.at || 0, d.at || 0) };
  }
  return out;
}
// whose progress is on this device: the account that last saved it ('' while it is a guest's)
const acctOwner = () => store.get('zc_owner', '');
// A different account logging in on this device starts from its own cloud save. The progress the last player left here
// is already in their own account; a copy is also kept on the device in case it hadn't finished saving, and goes back
// into their account the next time they log in here. Nothing of theirs ends up in someone else's account.
function acctPutAway(owner) {
  try { store.set('zc_away_' + owner, acctSnapshot()); } catch (e) { /* storage full: the cloud copy still has it */ }
  found.clear(); saveFound(); guns.clear(); guns.add(0); saveGuns(); dashes.clear(); dashes.add('sprint'); saveDashes();
  bossSeen.clear(); bossKilled.clear(); saveBosses();
  store.set('zc_overlord', 0); store.set('zc_keeper', 0); store.set('zc_loadout', 0); store.set('zc_dash', 'sprint');
  Object.assign(STATS, { runs: 0, kills: 0, time: 0, bestWave: 0, bestChain: 0, bestScore: 0 }); store.set('zc_stats', STATS);
  store.set('zc_lb_' + SEASON, []);
}
// this account's progress that was put away on this device earlier (when someone else logged in here)
function acctTakeBack(id) {
  const k = 'zc_away_' + id, s = store.get(k, null); if (!s) return false;
  acctApply(acctMerge(s, acctSnapshot())); return true;
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
  // this device's own totals for this account (after switching accounts here, they come back from the cloud)
  const mine = (s.devices || {})[DEVID];
  if (mine && ((mine.runs | 0) > STATS.runs || (mine.kills | 0) > STATS.kills || (mine.time | 0) > STATS.time)) {
    STATS.runs = Math.max(STATS.runs, mine.runs | 0); STATS.kills = Math.max(STATS.kills, mine.kills | 0); STATS.time = Math.max(STATS.time, mine.time | 0);
    store.set('zc_stats', STATS); changed = true;
  }
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
      const upd = { save: blob, saveVer: ((rec && rec.data.saveVer) | 0) + 1, summary: JSON.stringify(acctSummary(merged)), updatedAt: Date.now() };
      // the account name: a rename made here while offline goes up; otherwise a rename made elsewhere comes down
      const pend = ACCT.member.pendingName;
      if (pend) upd.username = pend;
      else if (rec && rec.data.username && rec.data.username !== ACCT.member.username) { ACCT.member.username = rec.data.username; AcctCore.ls.set('member', ACCT.member); store.set('zc_tag', cleanTag(ACCT.member.username, ACCT.member.id)); updNameUi(); }
      ACCT.rec = await AcctCore.writeRecord(rec, upd);
      if (pend) { delete ACCT.member.pendingName; AcctCore.ls.set('member', ACCT.member); AcctCore.renameScores(ACCT.member.id, pend).catch(() => { }); }
      ACCT.lastSync = Date.now(); AcctCore.ls.set('synced', ACCT.lastSync);
      // the progress on this device now belongs to this account (a copy put away for it earlier is no longer needed)
      store.set('zc_owner', ACCT.member.id); store.set('zc_away_' + ACCT.member.id, null);
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
  // someone else's progress is on this device: put it away before anything is saved to this account
  const owner = acctOwner(); ACCT.switched = false;
  if (owner && owner !== ACCT.member.id) { acctPutAway(owner); ACCT.switched = true; }
  acctTakeBack(ACCT.member.id);
  if (!dk) { ACCT.status = 'locked'; ACCT.dk = null; ACCT.pwNow = password; renderAcct(); updAcctUi(); return; }
  ACCT.dk = dk; AcctCore.ls.set('dk', dk); ACCT.status = 'in';
  store.set('zc_tag', cleanTag(ACCT.member.username, ACCT.member.id)); nameErr(''); updNameUi();
  ACCT.msg = { t: ACCT.switched ? 'Welcome, ' + ACCT.member.username + '. This device now has your progress; the last player’s progress stays in their own account.' : 'Welcome, ' + ACCT.member.username + '. Your progress is saving to the cloud.' };
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
  store.set('zc_tag', cleanTag(ACCT.member.username, ACCT.member.id)); updNameUi();
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
  ACCT.member.username = tag; delete ACCT.member.pendingName; AcctCore.ls.set('member', ACCT.member);
  try { ACCT.rec = await AcctCore.writeRecord(ACCT.rec || await AcctCore.myRecord(), { username: tag, updatedAt: Date.now() }); await AcctCore.renameScores(ACCT.member.id, tag); lbRefresh(true); }
  catch (e) { ACCT.member.pendingName = tag; AcctCore.ls.set('member', ACCT.member); /* renamed here; the cloud catches up on the next save */ }
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
    const id = el('p', 'acct-id'); id.append(nameEl(cleanTag(ACCT.member.username, ACCT.member.id), ACCT.member.id, 'b'), el('span', null, ACCT.member.tag ? ' #' + ACCT.member.tag : '')); c.firstChild.replaceWith(id);
    if (meAdmin()) c.append(el('p', 'acct-admin', 'Admin account: your name shows in admin colors, and you can play during maintenance and get test builds.'));
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
  const em = $('acctBtnEm'); if (em) { em.textContent = ''; if (ACCT.status === 'in') em.append(nameEl(cleanTag(ACCT.member.username, ACCT.member.id), ACCT.member.id)); else em.textContent = ACCT.status === 'locked' ? 'Locked' : 'Log in'; }
  const b = $('acctBtn'); if (b) b.classList.toggle('acct-on', ACCT.status === 'in');
  if (G.mode === 'title') renderTitlePanel();
}
$('acctBtn').addEventListener('click', () => { SFX.click(); openAcct(); });
$('acctClose').addEventListener('click', closeAcct);
updAcctUi();
// signed in from before: check in with the cloud shortly after the game starts
if (ACCT.status === 'in') setTimeout(() => acctSync('start'), 6000);

/* ---------- maintenance and update phases ----------
   One switch on the DeclAIre server (the GameStatus collection on Wix) runs every update:
   - maintenance on: the game shows "Down for maintenance" (with a message and when it's back) instead of starting runs.
     A run already going gets to finish first. The admin account can still play, to test the new version.
   - minVer: anyone on an older version is asked to update before playing.
   - stable / test: which version is published, and which one is being tested (the launcher's test channel and the
     test copy of the web version get it first). The game shows a "Test build" tag when it is the test version.
   Offline, none of this applies: the game plays as normal. */
const STATUS = { maint: false, msg: '', until: 0, stable: '', test: '', minVer: '', testerHash: '', ok: false, t: 0 };
const vcmpG = (a, b) => { const x = String(a || '0').split('.').map(Number), y = String(b || '0').split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0 ? 1 : -1; } return 0; };
async function statusCheck() {
  try {
    const d = await AcctCore.wix('/wix-data/v2/items/query', { body: { dataCollectionId: ACCT_CFG.status, query: { filter: { key: { $eq: 'live' } }, paging: { limit: 1 } } } });
    const it = d && d.dataItems && d.dataItems[0]; if (!it || !it.data) return;
    const s = it.data;
    Object.assign(STATUS, { maint: !!s.maintenance, msg: String(s.message || '').slice(0, 300), until: +s.until || 0, stable: String(s.stable || ''), test: String(s.test || ''), minVer: String(s.minVer || ''), testerHash: String(s.testerHash || '').toLowerCase(), ok: true, t: Date.now() });
  } catch (e) { /* no connection: play on */ }
  statusApply();
}
const statusOutdated = () => !!(STATUS.ok && STATUS.minVer && vcmpG(ZC_VERSION, STATUS.minVer) < 0);
// ?maintpreview shows the maintenance screen on this device (even for the admin); "Check again" ends the preview
let MAINT_PREVIEW = /[?&]maintpreview/.test(location.search);
function statusBlocked() { return MAINT_PREVIEW || (STATUS.ok && !meAdmin() && !testerOn() && (STATUS.maint || statusOutdated())); }
/* Tester code: a tester who is not on the admin account gets past maintenance with a code typed on the maintenance
   screen. The game never holds the code itself, only a PBKDF2-SHA256 hash of it (150,000 rounds, its own salt); Game
   Status can carry a newer hash (testerHash, same salt) to change the code without an update, which also locks every
   device that used the old one. A device that unlocked remembers it until the tester leaves tester mode (Settings >
   System) or the code changes. Five wrong tries in a row and the box waits 30 seconds. */
const TESTER = { salt: 'ddc699bd4d5a20ce9699d75931abbc57', iter: 150000, hash: '5e4f2e6dae507d370c9dd309db2a11a6bedd91763ab5cf94eeba68e5d7fd3d3e', fails: 0, waitUntil: 0 };
const testerHash = () => (STATUS.testerHash && /^[0-9a-f]{64}$/.test(STATUS.testerHash) ? STATUS.testerHash : TESTER.hash);
function testerOn() { return store.get('zc_tester', '') === testerHash(); }
async function testerCheck(code) {
  const clean = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
  if (clean.length < 6 || !(window.crypto && crypto.subtle)) return false;
  const enc = new TextEncoder(), salt = new Uint8Array(TESTER.salt.match(/../g).map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', enc.encode(clean), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: TESTER.iter }, key, 256));
  const hex = Array.from(bits, b => b.toString(16).padStart(2, '0')).join('');
  return hex === testerHash() ? hex : false;
}
function testerLeave() { store.set('zc_tester', ''); statusApply(); toast('Tester mode off', 'This device follows maintenance again', '#29e6ff'); }
const statusInRun = () => ['play', 'pause', 'upgrade', 'skull', 'cine', 'loading'].indexOf(G.mode) >= 0;
function statusApply() {
  const ov = $('maint'); if (!ov) return;
  const tb = $('testBadge'), isTest = STATUS.ok && STATUS.test === ZC_VERSION && STATUS.stable !== ZC_VERSION;
  tb.hidden = !isTest || statusInRun(); if (isTest) tb.textContent = 'Test build ' + ZC_VERSION;
  const tester = testerOn() && !meAdmin();
  $('maintAdmin').hidden = !(STATUS.ok && (STATUS.maint || statusOutdated()) && (meAdmin() || tester));
  $('maintAdmin').textContent = tester ? 'Maintenance is on · tester mode' : 'Maintenance is on · you can play as admin';
  const out = !MAINT_PREVIEW && statusOutdated();
  if (!statusBlocked()) {
    $('maintSoon').hidden = true;
    // maintenance just ended while the card was up: the foreman says it's done, then the card goes
    if (!ov.hidden && MaintScene.on) { if (!MaintScene.finishing) MaintScene.done(() => { ov.hidden = true; }); return; }
    MaintScene.stop(); ov.hidden = true; return;
  }
  if (statusInRun()) { const s = $('maintSoon'); s.hidden = false; s.textContent = out ? 'A required update is out. Finish this run, then update.' : 'Maintenance is starting. Finish this run; new runs open again soon.'; ov.hidden = true; return; }
  $('maintSoon').hidden = true;
  if (G.mode === 'intro') return;
  $('maintTitle').textContent = out ? 'Update needed' : 'Under construction';
  $('maintMsg').textContent = out ? 'You have version ' + ZC_VERSION + '. Version ' + STATUS.minVer + ' or newer is needed to play.' : (STATUS.msg || 'Zombie City is getting an update. It will be back shortly.');
  const left = STATUS.until - Date.now();
  $('maintWhen').textContent = !out && left > 0 ? 'Back in about ' + (left > 3600000 ? Math.round(left / 3600000) + ' hours' : Math.max(1, Math.round(left / 60000)) + ' minutes') : '';
  const up = $('maintUpdate'); up.hidden = !out;
  up.textContent = window.ZCDesktop && window.ZCDesktop.launcher ? 'Open the launcher' : IS_APP ? 'Download the update' : 'Reload';
  if (ov.hidden) { ov.hidden = false; SFX.click(); }
  if (out) MaintScene.stop(); else MaintScene.start();
}
$('maintRetry').addEventListener('click', () => { MAINT_PREVIEW = false; $('maintRetry').textContent = 'Checking'; statusCheck().finally(() => { $('maintRetry').textContent = 'Check again'; }); });
$('maintSite').addEventListener('click', () => openWeb('https://declairestudios.wordpress.com'));
$('maintTester').addEventListener('click', () => { const r = $('maintCodeRow'); r.hidden = !r.hidden; if (!r.hidden) setTimeout(() => $('maintCode').focus(), 30); });
async function testerSubmit() {
  const inp = $('maintCode'), msg = $('maintCodeMsg'), now = Date.now();
  if (now < TESTER.waitUntil) { msg.textContent = 'Too many tries. Wait ' + Math.ceil((TESTER.waitUntil - now) / 1000) + ' seconds.'; return; }
  msg.textContent = 'Checking';
  let ok = false; try { ok = await testerCheck(inp.value); } catch (e) { ok = false; }
  if (ok) {
    TESTER.fails = 0; store.set('zc_tester', ok); inp.value = ''; msg.textContent = ''; $('maintCodeRow').hidden = true;
    toast('Tester mode on', 'You can play while maintenance is on. Settings > System turns it off.', '#29e6ff');
    statusApply();
  } else {
    TESTER.fails++; if (TESTER.fails >= 5) { TESTER.fails = 0; TESTER.waitUntil = now + 30000; }
    msg.textContent = 'That code did not work.'; SFX.refuse && SFX.refuse();
  }
}
$('maintCodeGo').addEventListener('click', testerSubmit);
$('maintCode').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); testerSubmit(); } e.stopPropagation(); });
$('maintUpdate').addEventListener('click', () => {
  if (window.ZCDesktop && window.ZCDesktop.launcher) window.ZCDesktop.launcher();
  else if (IS_APP) openWeb('https://github.com/gabrielamidon8-sys/DeclAIre-ZombieCity/releases/latest/download/ZombieCity-Android.apk');
  else location.reload();
});
// first check soon after starting, then every few minutes (every minute while the game is shut)
setTimeout(statusCheck, 2500);
setInterval(() => { if (Date.now() - STATUS.t > (statusBlocked() ? 60000 : 180000)) statusCheck(); else if (STATUS.ok) statusApply(); }, 5000);
