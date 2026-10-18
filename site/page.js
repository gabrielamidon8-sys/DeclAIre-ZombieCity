/* DeclAIre Studios account page: create an account (with Wix's robot check), log in, see your cloud save, change
   your name or password, delete your account, and the global board. Uses the same acct-core.js and filter.js as
   the game. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const SEASON = (d => d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'))(new Date());
  const SEASON_NAME = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const GAME_SITE = 'https://declairestudios.wordpress.com';
  const S = { member: AcctCore.ls.get('member', null), rec: null, me: null, locked: false, msg: null, busy: false, view: 'login', pending: null, pwNow: null };
  const cleanName = s => String(s || '').toUpperCase().replace(/[^A-Z0-9 _.\-]/g, '').trim().slice(0, 14);
  const fmtTime = s => { s = s | 0; const hh = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return hh ? hh + 'h ' + String(m).padStart(2, '0') + 'm' : m + 'm ' + String(s % 60).padStart(2, '0') + 's'; };
  const num = n => Number(n || 0).toLocaleString();
  // the game opens this page with ?join=1#email=...&name=... ; read it once, then tidy the address (the email shouldn't linger in it)
  const HINT = (() => { const q = new URLSearchParams(location.hash.replace(/^#/, '')); return { email: q.get('email') || '', name: q.get('name') || '', join: /[?&]join=1/.test(location.search) }; })();
  if (location.search || (location.hash && !/^#(privacy|board)$/.test(location.hash))) history.replaceState(null, '', location.pathname + (/^#(privacy|board)$/.test(location.hash) ? location.hash : ''));

  /* ---------- the name filter's word list (the public list, pinned to one version) ---------- */
  const LIST = 'https://cdn.jsdelivr.net/gh/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words@5faf2ba42d7b1c0977169ec3611df25a3c08eb13/en';
  const PF = window.ZCF_PAGE;
  const squash = s => s.normalize('NFKD').toLowerCase().replace(/[^a-z]/g, '');
  const filterReady = (async () => {
    try {
      const r = await fetch(LIST, { cache: 'force-cache' });
      const txt = await r.text();
      const all = txt.split('\n').map(s => s.trim()).filter(Boolean).concat(PF.extra).map(squash).filter(s => s.length >= 3);
      const entries = Array.from(new Set(all)).sort();
      let fnv = 2166136261 >>> 0;
      for (const ch of entries.join('\n')) fnv = Math.imul(fnv ^ ch.charCodeAt(0), 16777619) >>> 0;
      const same = entries.length === PF.count && fnv === PF.fnv;
      const sub = [], word = [];
      entries.forEach((e, i) => { if (same && PF.modes[i] === '1' && e.length >= 4) sub.push(e); else word.push(e); });
      ZCF.setWords(sub, word, PF.mask);
      return true;
    } catch (e) { return false; }
  })();
  async function nameProblem(raw) {
    const n = cleanName(raw);
    if (n.length < 3) return 'Pick a name with at least 3 letters or numbers.';
    await Promise.race([filterReady, new Promise(r => setTimeout(r, 6000))]);
    const c = ZCF.check(raw);
    return c.ok ? '' : c.msg;
  }

  /* ---------- Wix's robot check (reCAPTCHA Enterprise with Wix's own site keys) ---------- */
  const RC = { inv: '6LdoPaUfAAAAAJphvHoUoOob7mx0KDlXyXlgrx5v', vis: '6Ld0J8IcAAAAANyrnxzrRlX1xrrdXsOmsepUYosy', p: null };
  function loadRc() {
    if (RC.p) return RC.p;
    RC.p = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://www.google.com/recaptcha/enterprise.js?render=' + RC.inv; s.async = true;
      s.onload = () => window.grecaptcha.enterprise.ready(resolve);
      s.onerror = () => { RC.p = null; reject(new Error('The robot check could not load. Check your connection or ad blocker and try again.')); };
      document.head.append(s);
      setTimeout(() => reject(new Error('The robot check took too long to load. Try again.')), 20000);
    });
    return RC.p;
  }
  async function invisibleToken(action) { await loadRc(); return { token: await window.grecaptcha.enterprise.execute(RC.inv, { action: action }), visible: false }; }
  function visibleToken(box) {
    return loadRc().then(() => new Promise((resolve) => {
      box.hidden = false; box.textContent = '';
      const holder = h('div'); box.append(h('p', 'rc-note', 'One more step: tick the box below.'), holder);
      window.grecaptcha.enterprise.render(holder, { sitekey: RC.vis, theme: 'dark', callback: t => { box.hidden = true; resolve({ token: t, visible: true }); } });
    }));
  }
  // try without, then the quiet check, then the box to tick
  async function withRobotCheck(fn, action, box) {
    let r = await fn(null);
    if (r.state !== 'fail' || r.reason !== 'captcha') return r;
    try { r = await fn(await invisibleToken(action)); } catch (e) { say(e.message, true); return r; }
    if (r.state !== 'fail' || r.reason !== 'captcha') return r;
    say('Tick the robot check to continue.');
    return fn(await visibleToken(box));
  }

  /* ---------- messages and busy buttons ---------- */
  function say(t, bad) { S.msg = t ? { t: t, bad: !!bad } : null; const m = $('msg'); m.hidden = !S.msg; if (S.msg) { m.textContent = S.msg.t; m.classList.toggle('bad', !!bad); m.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }
  const TEXT = {
    password: 'Wrong email or password.', notfound: 'Wrong email or password.', unknown: 'Wrong email or password.',
    exists: 'There is already an account with that email. Log in instead.', invalid: 'That email or password was not accepted. Passwords need at least 6 characters.',
    reset: 'This account needs a new password. Use "Forgot password" to set one.', network: 'Could not reach DeclAIre accounts. Check your internet and try again.',
    captcha: 'The robot check did not pass. Try again.'
  };
  function busy(btn, fn) {
    return async e => {
      if (e) e.preventDefault();
      if (S.busy) return;
      S.busy = true; const t = btn.textContent; btn.disabled = true; btn.textContent = 'Working\u2026';
      try { await fn(); } catch (err) { say(err && err.message ? err.message : 'Something went wrong. Try again.', true); }
      finally { S.busy = false; btn.disabled = false; btn.textContent = t; }
    };
  }
  function input(label, type, name, auto, extra) {
    const l = h('label', 'field'); l.append(h('span', null, label));
    const i = document.createElement('input'); i.type = type; i.name = name; i.autocomplete = auto; i.spellcheck = false; i.required = true;
    Object.assign(i, extra || {}); l.append(i); return [l, i];
  }

  /* ---------- after any sign-in: the player's record ---------- */
  async function afterAuth(email, password, wantName) {
    let rec = await AcctCore.myRecord();
    if (!rec) {
      const keys = await AcctCore.newKeys(password);
      const name = cleanName(wantName) || 'SURVIVOR';
      rec = await AcctCore.writeRecord(null, { username: name, tag: AcctCore.newTag(), kdfSalt: keys.kdfSalt, kdfIter: keys.kdfIter, wrappedKey: keys.wrappedKey, save: '', saveVer: 0, summary: '{}', updatedAt: Date.now() });
      S.locked = false;
    } else {
      S.locked = !(await AcctCore.unlockKey(password, rec.data));
      S.pwNow = S.locked ? password : null;
    }
    S.rec = rec;
    S.member = { id: rec.data._owner, email: email, username: rec.data.username || 'SURVIVOR', tag: rec.data.tag || '' };
    AcctCore.ls.set('member', S.member);
    try { const me = await AcctCore.wix('/members/v1/members/my', { method: 'GET', query: { fieldsets: 'FULL' } }); S.me = me && me.member; } catch (e) { S.me = null; }
    render(); loadBoard();
  }
  async function refreshSignedIn() {
    try {
      S.rec = await AcctCore.myRecord();
      if (!S.rec) { AcctCore.signOut(); S.member = null; render(); return; }
      S.member = Object.assign({}, S.member, { id: S.rec.data._owner, username: S.rec.data.username, tag: S.rec.data.tag });
      try { const me = await AcctCore.wix('/members/v1/members/my', { method: 'GET', query: { fieldsets: 'FULL' } }); S.me = me && me.member; } catch (e) { S.me = null; }
    } catch (e) {
      if (!AcctCore.isMember()) { S.member = null; say('Your sign-in expired. Log in again.', true); }
      else say('Could not load your account right now. Check your connection.', true);
    }
    render();
  }
  AcctCore.onSignedOut = () => { S.member = null; S.rec = null; render(); };

  /* ---------- the account panel ---------- */
  function render() {
    const P = $('panel'); P.textContent = '';
    const hint = HINT.email, hintName = HINT.name;
    if (S.member && AcctCore.isMember() && S.rec) { HINT.join = false; return renderMe(P); }
    if (S.view === 'verify' && S.pending) {
      const c = h('section', 'card'); P.append(c);
      c.append(h('h2', null, 'Check your email'), h('p', null, 'We sent a code to ' + S.pending.email + '. Type it here to finish.'));
      const f = h('form', 'form'); const [l, i] = input('Code', 'text', 'code', 'one-time-code', { inputMode: 'numeric', maxLength: 10 });
      const b = h('button', 'btn primary', 'Finish'); b.type = 'submit'; f.append(l, b); c.append(f);
      f.addEventListener('submit', busy(b, async () => {
        const r = await AcctCore.verifyEmail(i.value, S.pending.stateToken);
        if (r.state === 'ok') { const p = S.pending; S.pending = null; S.view = 'login'; await afterAuth(p.email, p.password, p.name); say('You are in. Welcome to DeclAIre Studios.'); }
        else say('That code did not work. Check the email and try again.', true);
      }));
      return;
    }
    const join = HINT.join;
    const tabs = h('div', 'tabs'); P.append(tabs);
    const tLogin = h('button', 'tab' + (join ? '' : ' on'), 'Log in'), tJoin = h('button', 'tab' + (join ? ' on' : ''), 'Create account');
    tLogin.type = tJoin.type = 'button'; tabs.append(tLogin, tJoin);
    const lc = h('section', 'card'), jc = h('section', 'card'); P.append(lc, jc);
    lc.hidden = join; jc.hidden = !join;
    tLogin.addEventListener('click', () => { lc.hidden = false; jc.hidden = true; tLogin.classList.add('on'); tJoin.classList.remove('on'); });
    tJoin.addEventListener('click', () => { lc.hidden = true; jc.hidden = false; tJoin.classList.add('on'); tLogin.classList.remove('on'); });
    // log in
    lc.append(h('h2', null, 'Welcome back'));
    const lf = h('form', 'form'); lf.autocomplete = 'on';
    const [le, ei] = input('Email', 'email', 'email', 'username', { value: hint }), [lp, pi] = input('Password', 'password', 'password', 'current-password');
    const lbox = h('div', 'rc'); lbox.hidden = true;
    const lb = h('button', 'btn primary', 'Log in'); lb.type = 'submit';
    lf.append(le, lp, lbox, lb); lc.append(lf);
    lf.addEventListener('submit', busy(lb, async () => {
      say('');
      const email = ei.value.trim(), pw = pi.value;
      const r = await withRobotCheck(cap => AcctCore.login(email, pw, cap), 'login', lbox);
      if (r.state === 'ok') { await afterAuth(email, pw); say('Logged in.'); return; }
      if (r.state === 'verify') { S.pending = { stateToken: r.stateToken, email: email, password: pw }; S.view = 'verify'; render(); return; }
      if (r.state === 'pending') { say('Your account is waiting for approval.', true); return; }
      say(TEXT[r.reason] || r.message || 'Could not log in.', true);
    }));
    const forgot = h('button', 'link', 'Forgot password?'); forgot.type = 'button'; lc.append(forgot);
    forgot.addEventListener('click', busy(forgot, async () => {
      const em = ei.value.trim();
      if (!/^\S+@\S+\.\S+$/.test(em)) { say('Type your email first, then press Forgot password.', true); ei.focus(); return; }
      await AcctCore.sendReset(em, AcctCore.CFG.site + '/');
      say('If there is an account for ' + em + ', a link to set a new password is on its way.');
    }));
    // create an account
    jc.append(h('h2', null, 'Join DeclAIre Studios'), h('p', 'muted', 'Free. One account for Zombie City on the web, Android and Windows.'));
    const jf = h('form', 'form'); jf.autocomplete = 'on';
    const [jn, ni] = input('Name on the board', 'text', 'nickname', 'nickname', { maxLength: 14, autocapitalize: 'characters', value: cleanName(hintName) });
    const [je, ji] = input('Email', 'email', 'email', 'username', { value: hint });
    const [jp, jpi] = input('Password (6 or more characters)', 'password', 'new-password', 'new-password', { minLength: 6 });
    const [jp2, jpi2] = input('Password again', 'password', 'new-password-2', 'new-password', { minLength: 6 });
    const age = h('label', 'check'); const ab = document.createElement('input'); ab.type = 'checkbox'; ab.required = true;
    const pl = h('a', null, 'privacy policy'); pl.href = '#privacy';
    const at = h('span'); at.append('I am 13 or older and agree to the ', pl, '.'); age.append(ab, at);
    const jbox = h('div', 'rc'); jbox.hidden = true;
    const jb = h('button', 'btn primary', 'Create account'); jb.type = 'submit';
    ni.addEventListener('input', () => { const v = ni.value.toUpperCase().replace(/[^A-Z0-9 _.\-]/g, ''); if (v !== ni.value) ni.value = v; });
    jf.append(jn, je, jp, jp2, age, jbox, jb); jc.append(jf);
    jf.addEventListener('submit', busy(jb, async () => {
      say('');
      const prob = await nameProblem(ni.value); if (prob) { say(prob, true); ni.focus(); return; }
      if (jpi.value.length < 6) { say('Passwords need at least 6 characters.', true); return; }
      if (jpi.value !== jpi2.value) { say('The two passwords do not match.', true); jpi2.focus(); return; }
      const email = ji.value.trim(), pw = jpi.value, name = cleanName(ni.value);
      const r = await withRobotCheck(cap => AcctCore.register(email, pw, name, cap), 'signup', jbox);
      if (r.state === 'ok') { await afterAuth(email, pw, name); say('Account created. Now log in from the game with the same email and password, and your progress starts saving.'); return; }
      if (r.state === 'verify') { S.pending = { stateToken: r.stateToken, email: email, password: pw, name: name }; S.view = 'verify'; render(); return; }
      if (r.state === 'pending') { say('Your account was created and is waiting for approval.', true); return; }
      say(TEXT[r.reason] || r.message || 'Could not create the account.', true);
    }));
  }

  function renderMe(P) {
    const d = S.rec.data, sum = (() => { try { return JSON.parse(d.summary || '{}'); } catch (e) { return {}; } })();
    const c = h('section', 'card me'); P.append(c);
    const top = h('div', 'me-top');
    const nm = h('h2', 'me-name'); nm.append(S.member.username, h('span', null, S.member.tag ? ' #' + S.member.tag : ''));
    top.append(nm, h('p', 'muted', S.member.email || (S.me && S.me.loginEmail) || ''));
    if (S.me && S.me.createdDate) top.append(h('p', 'muted small', 'Member since ' + new Date(S.me.createdDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })));
    c.append(top);
    if (S.locked) {
      const w = h('div', 'warn');
      w.append(h('b', null, 'Your cloud save is locked with your old password.'), h('p', null, 'This happens after a password reset. Type your old password once to move it to your new one, or open the game and start a new cloud save from your progress there.'));
      const f = h('form', 'form row'); const [l, i] = input('Old password', 'password', 'old-password', 'current-password');
      const b = h('button', 'btn', 'Unlock'); b.type = 'submit'; f.append(l, b); w.append(f);
      f.addEventListener('submit', busy(b, async () => {
        const rec = await AcctCore.myRecord(), dk = rec && await AcctCore.unlockKey(i.value, rec.data);
        if (!dk) { say('That password does not open the save.', true); return; }
        if (S.pwNow) S.rec = await AcctCore.writeRecord(rec, Object.assign(await AcctCore.relock(S.pwNow, dk), { updatedAt: Date.now() }));
        S.locked = false; S.pwNow = null; render(); say('Unlocked. Your save now opens with your current password.');
      }));
      c.append(w);
    }
    // the save at a glance
    const played = !!sum.runs || !!sum.weapons;
    const g = h('dl', 'stats');
    const stat = (k, v) => { const x = h('div'); x.append(h('dt', null, k), h('dd', null, v)); g.append(x); };
    if (played) {
      stat('Best wave', sum.bestWave ? String(sum.bestWave) : '\u2014'); stat('Best score', sum.bestScore ? num(sum.bestScore) : '\u2014');
      stat('Runs', num(sum.runs)); stat('Kills', num(sum.kills)); stat('Time alive', sum.time ? fmtTime(sum.time) : '\u2014'); stat('Best chain', sum.bestChain ? 'x' + sum.bestChain : '\u2014');
      stat('Weapons', (sum.weapons || 1) + ' / 250'); stat('Specimens', (sum.specimens || 0) + ' / 1000'); stat('Bosses', (sum.bosses || 0) + ' / 50');
      stat('Devices', String(sum.devices || 1)); stat('Last saved', d.updatedAt ? new Date(d.updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '\u2014'); stat('Game version', sum.version || '\u2014');
      c.append(h('h3', null, 'Your cloud save'), g, h('p', 'muted small', 'The save itself is encrypted; these numbers are the summary the game shares with this page.'));
    } else {
      const e = h('div', 'empty');
      e.append(h('b', null, 'Your cloud save starts the first time you log in from the game.'), h('p', null, 'Open Zombie City, press Account on the main menu and log in with this email and password. Everything you have unlocked on that device comes with you.'));
      const play = h('a', 'btn primary', 'Get Zombie City'); play.href = GAME_SITE; e.append(play); c.append(e);
    }
    // name
    const nc = h('section', 'card'); P.append(nc);
    nc.append(h('h3', null, 'Name on the board'));
    const nf = h('form', 'form row'); const [nl, ni] = input('New name', 'text', 'nickname', 'nickname', { maxLength: 14, value: S.member.username, autocapitalize: 'characters' });
    ni.addEventListener('input', () => { const v = ni.value.toUpperCase().replace(/[^A-Z0-9 _.\-]/g, ''); if (v !== ni.value) ni.value = v; });
    const nb = h('button', 'btn', 'Save name'); nb.type = 'submit'; nf.append(nl, nb); nc.append(nf);
    nf.addEventListener('submit', busy(nb, async () => {
      const prob = await nameProblem(ni.value); if (prob) { say(prob, true); return; }
      const name = cleanName(ni.value);
      S.rec = await AcctCore.writeRecord(await AcctCore.myRecord(), { username: name, updatedAt: Date.now() });
      await AcctCore.renameScores(S.member.id, name);
      S.member.username = name; AcctCore.ls.set('member', S.member);
      render(); loadBoard(); say('Name saved. The game picks it up the next time it saves.');
    }));
    // password
    const pc = h('section', 'card'); P.append(pc);
    pc.append(h('h3', null, 'Change password'), h('p', 'muted small', 'Your save key is locked again with the new password, so your progress stays readable only by you.'));
    const pf = h('form', 'form'); pf.autocomplete = 'on';
    const [p1l, p1] = input('Current password', 'password', 'current', 'current-password'), [p2l, p2] = input('New password', 'password', 'new', 'new-password', { minLength: 6 }), [p3l, p3] = input('New password again', 'password', 'new2', 'new-password', { minLength: 6 });
    const pb = h('button', 'btn', 'Change password'); pb.type = 'submit'; pf.append(p1l, p2l, p3l, pb); pc.append(pf);
    pf.addEventListener('submit', busy(pb, async () => {
      if (p2.value.length < 6) { say('Passwords need at least 6 characters.', true); return; }
      if (p2.value !== p3.value) { say('The new passwords do not match.', true); return; }
      const email = S.member.email || (S.me && S.me.loginEmail);
      const chk = await AcctCore.login(email, p1.value);
      if (chk.state !== 'ok') { say(chk.reason === 'captcha' ? 'Log out and back in first, then try again.' : 'Your current password is not right.', true); return; }
      const rec = await AcctCore.myRecord(), dk = rec && await AcctCore.unlockKey(p1.value, rec.data);
      await AcctCore.changePassword(p2.value);
      if (dk) { S.rec = await AcctCore.writeRecord(rec, Object.assign(await AcctCore.relock(p2.value, dk), { updatedAt: Date.now() })); }
      p1.value = p2.value = p3.value = '';
      say(dk ? 'Password changed. Use the new one in the game too.' : 'Password changed. Your cloud save is still locked with an older password; unlock it above or in the game.');
      render();
    }));
    // delete
    const dc = h('section', 'card danger-zone'); P.append(dc);
    dc.append(h('h3', null, 'Delete account'), h('p', 'muted small', 'Deletes your account, your cloud save and your board entries. Your progress on each device stays on that device. This cannot be undone.'));
    const df = h('form', 'form row'); const [dl, di] = input('Type DELETE to confirm', 'text', 'confirm', 'off');
    const db = h('button', 'btn danger', 'Delete my account'); db.type = 'submit'; df.append(dl, db); dc.append(df);
    df.addEventListener('submit', busy(db, async () => {
      if (di.value.trim().toUpperCase() !== 'DELETE') { say('Type DELETE in the box to confirm.', true); return; }
      const owner = S.member.id;
      const q = await AcctCore.wix('/wix-data/v2/items/query', { body: { dataCollectionId: AcctCore.CFG.scores, query: { filter: { _owner: { $eq: owner } }, paging: { limit: 50 } } } });
      for (const it of (q && q.dataItems) || []) await AcctCore.wix('/wix-data/v2/items/' + encodeURIComponent(it.id), { method: 'DELETE', query: { dataCollectionId: AcctCore.CFG.scores } });
      const qs = await AcctCore.wix('/wix-data/v2/items/query', { body: { dataCollectionId: AcctCore.CFG.saves, query: { paging: { limit: 10 } } } });
      for (const it of (qs && qs.dataItems) || []) await AcctCore.wix('/wix-data/v2/items/' + encodeURIComponent(it.id), { method: 'DELETE', query: { dataCollectionId: AcctCore.CFG.saves } });
      try { await AcctCore.deleteMe(); } catch (e) { say('Your save and board entries are deleted, but the sign-in itself could not be removed (' + e.message + '). Contact us through the website and we will finish it.', true); AcctCore.signOut(); S.member = null; render(); return; }
      AcctCore.signOut(); S.member = null; S.rec = null; render(); loadBoard(); say('Your account and everything in it are deleted.');
    }));
    const out = h('button', 'btn ghost', 'Log out'); out.type = 'button'; P.append(out);
    out.addEventListener('click', () => { AcctCore.signOut(); S.member = null; S.rec = null; render(); say('Logged out.'); });
  }

  /* ---------- the global board ---------- */
  const DEV = { touch: 'Phone', kbm: 'PC', pad: 'Controller' };
  async function loadBoard() {
    const B = $('boardList'); $('boardSeason').textContent = SEASON_NAME;
    try {
      const rows = await AcctCore.board(SEASON, 25);
      await Promise.race([filterReady, new Promise(r => setTimeout(r, 4000))]);
      B.textContent = '';
      if (!rows.length) { B.append(h('li', 'empty', 'No scores yet this season. Be the first.')); return; }
      rows.forEach((r, i) => {
        const li = h('li', i < 3 ? 'top' : ''); if (S.member && r.id === S.member.id) li.classList.add('me');
        li.append(h('span', 'rk', '#' + (i + 1)), h('span', 'tg', ZCF.safe(cleanName(r.tag)) + (S.member && r.id === S.member.id ? ' (you)' : '')), h('span', 'sc', num(r.score)), h('span', 'wv', 'W' + (r.wave || 0)), h('span', 'dv', DEV[r.dev] || ''));
        B.append(li);
      });
    } catch (e) { B.textContent = ''; B.append(h('li', 'empty', 'The board could not load right now.')); }
  }

  render();
  if (S.member && AcctCore.isMember()) refreshSignedIn();
  loadBoard();
  const left = () => { const d = new Date(), end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1), ms = end - Date.now(); return Math.floor(ms / 864e5) + 'd ' + Math.floor(ms % 864e5 / 36e5) + 'h'; };
  $('boardLeft').textContent = left();
})();
