/* ================= DeclAIre Studios accounts: the shared core =================
   One account works everywhere: the game in a browser, the Android app, the Windows launcher and the account page on
   the web. Accounts live in a Wix Headless project (DeclAIre Studios); Wix checks passwords and stores only a one-way
   hash of each one, never the password itself. On top of that, every account's save is encrypted with its own random
   256-bit key (AES-GCM). That key is locked with the player's password (PBKDF2-SHA256, 600,000 rounds, a salt made
   for that account) before it leaves the device, so the save in the cloud can only be opened by someone who knows the
   password: not other players, and not the studio either.
   Used by the game (account.js) and the account page. No dependencies; the page or app plugs in how to reach the
   network (setHttp) where a plain fetch can't (the Android app and the Windows launcher). */
const ACCT_CFG = {
  clientId: 'faefb3f0-8b4f-4401-8dc5-0421e699b869',
  api: 'https://www.wixapis.com',
  site: 'https://headless-iilujwebfcb-gabrielamidon8-140e.wix-site-host.com',
  saves: 'PlayerSaves',
  scores: 'Scores',
  kdfIter: 600000
};
const AcctCore = (function () {
  const C = ACCT_CFG;
  /* ---------- storage (one key per thing, prefixed so it never collides with the game's own keys) ---------- */
  const ls = {
    get(k, d) { try { const v = localStorage.getItem('dcl_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { if (v == null) localStorage.removeItem('dcl_' + k); else localStorage.setItem('dcl_' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  };

  /* ---------- the network ---------- */
  // http(method, url, headers, body) -> { status, text }. A page uses fetch; the apps swap in their native bridge.
  let http = async (method, url, headers, body) => {
    const r = await fetch(url, { method: method, headers: headers, body: body, credentials: 'omit', cache: 'no-store' });
    return { status: r.status, text: await r.text() };
  };
  let nativeHttp = false;
  function setHttp(fn) { http = fn; nativeHttp = true; }

  class AcctError extends Error {
    constructor(message, status, code, details) { super(message); this.status = status; this.code = code; this.details = details; }
  }
  const parse = t => { try { return t ? JSON.parse(t) : null; } catch (e) { return null; } };

  /* ---------- tokens: an anonymous visitor until login, then the member ---------- */
  // { accessToken, refreshToken, expiresAt, role: 'visitor' | 'member' }
  let tok = ls.get('tokens', null);
  function saveTokens(t) { tok = t; ls.set('tokens', t); }
  async function mint(body, role) {
    const r = await http('POST', C.api + '/oauth2/token', { 'Content-Type': 'application/json' }, JSON.stringify(Object.assign({ clientId: C.clientId }, body)));
    const d = parse(r.text);
    if (r.status !== 200 || !d || !d.access_token) throw new AcctError('Could not reach DeclAIre accounts (' + r.status + ').', r.status, d && d.error);
    return { accessToken: d.access_token, refreshToken: d.refresh_token, expiresAt: Date.now() + (d.expires_in || 14400) * 1000, role: role };
  }
  let minting = null;
  async function accessToken() {
    if (tok && tok.accessToken && tok.expiresAt - 60000 > Date.now()) return tok.accessToken;
    if (minting) return minting;
    minting = (async () => {
      let fresh = null;
      if (tok && tok.refreshToken) {
        try { fresh = await mint({ grantType: 'refresh_token', refreshToken: tok.refreshToken }, tok.role || 'visitor'); }
        catch (e) { if (tok.role === 'member' && e.status >= 400 && e.status < 500) { ls.set('member', null); signedOut('expired'); } }
      }
      if (!fresh) fresh = await mint({ grantType: 'anonymous' }, 'visitor');
      saveTokens(fresh);
      return fresh.accessToken;
    })();
    try { return await minting; } finally { minting = null; }
  }
  let onSignedOut = null;
  function signedOut(why) { if (onSignedOut) try { onSignedOut(why); } catch (e) { /* the page's handler failed; the tokens are gone either way */ } }

  // every Wix call: the raw access token in Authorization (no "Bearer")
  async function wix(path, opts) {
    opts = opts || {};
    const url = C.api + path + (opts.query ? '?' + new URLSearchParams(opts.query).toString() : '');
    const headers = { Authorization: await accessToken(), 'Content-Type': 'application/json' };
    const r = await http(opts.method || 'POST', url, headers, opts.body === undefined ? undefined : JSON.stringify(opts.body));
    const d = parse(r.text);
    if (r.status < 200 || r.status >= 300) {
      throw new AcctError((d && d.message) || ('Request failed (' + r.status + ').'), r.status, d && d.details && d.details.applicationError && d.details.applicationError.code, d && d.details);
    }
    return d;
  }

  /* ---------- signing in ---------- */
  const CODES = { '-19971': 'captcha', '-19970': 'captcha', '-19995': 'exists', '-19976': 'password', '-19973': 'reset' };
  // a login/registration/verification answer -> { state: 'ok' | 'verify' | 'pending' | 'fail', reason?, message?, stateToken? }
  async function authCall(path, body) {
    let d;
    try { d = await wix(path, { body: body }); }
    catch (e) {
      const reason = CODES[e.code] || (e.details && e.details.validationError ? 'invalid' : e.status === 404 || e.status === 401 ? 'notfound' : e.status >= 500 || !e.status ? 'network' : 'unknown');
      return { state: 'fail', reason: reason, message: e.message };
    }
    const st = d && d.state;
    if (st === 'SUCCESS' && d.sessionToken) {
      await finishLogin(d.sessionToken);
      return { state: 'ok', identity: d.identity || null };
    }
    if (st === 'REQUIRE_EMAIL_VERIFICATION') return { state: 'verify', stateToken: d.stateToken };
    if (st === 'REQUIRE_OWNER_APPROVAL') return { state: 'pending' };
    return { state: 'fail', reason: 'unknown', message: 'Sign-in did not finish.' };
  }
  function captcha(t) { return t ? { captchaTokens: [t.visible ? { Recaptcha: t.token } : { InvisibleRecaptcha: t.token }] } : {}; }
  const login = (email, password, cap) => authCall('/_api/iam/authentication/v2/login', Object.assign({ loginId: { email: email }, password: password }, captcha(cap)));
  const register = (email, password, nickname, cap) => authCall('/_api/iam/authentication/v2/register', Object.assign({ loginId: { email: email }, password: password, profile: nickname ? { nickname: nickname } : undefined }, captcha(cap)));
  const verifyEmail = (code, stateToken) => authCall('/_api/iam/verification/v1/auth/verify', { code: String(code).trim(), stateToken: stateToken });

  // the one-shot session token -> the member's own access and refresh tokens (PKCE, as the Wix docs order it)
  const b64url = bytes => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const randStr = () => b64url(crypto.getRandomValues(new Uint8Array(32)));
  async function finishLogin(sessionToken) {
    const verifier = randStr(), state = randStr();
    const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
    const rs = await wix('/headless/v1/redirect-session', { body: { auth: { authRequest: {
      clientId: C.clientId, codeChallenge: challenge, codeChallengeMethod: 'S256', responseMode: 'web_message',
      responseType: 'code', scope: 'offline_access', state: state, sessionToken: sessionToken }, prompt: 'none' } } });
    const url = rs && rs.redirectSession && rs.redirectSession.fullUrl;
    if (!url) throw new AcctError('Login could not finish: no authorization address came back.');
    const code = await authorizationCode(url, state);
    saveTokens(await mint({ grantType: 'authorization_code', code: code, codeVerifier: verifier }, 'member'));
  }
  // The authorization page hands back { code, state, error }: read straight from the page where the network allows
  // it (the apps' native bridge, or the account page, which is on the same site), otherwise through a hidden frame.
  async function authorizationCode(url, state) {
    const sameSite = typeof location !== 'undefined' && new URL(url).origin === location.origin;
    if (nativeHttp || sameSite || typeof document === 'undefined') {
      const r = await http('GET', url, { Accept: 'text/html' });
      const field = n => { const m = r.text.match(new RegExp("'" + n + "':\\s*'([^']*)'")); return m ? m[1] : undefined; };
      if (field('error')) throw new AcctError('Login was refused: ' + field('error'));
      const code = field('code');
      if (!code || field('state') !== state) throw new AcctError('Login could not finish (no authorization code, status ' + r.status + ').');
      return code;
    }
    return new Promise((resolve, reject) => {
      const frame = document.createElement('iframe');
      frame.style.display = 'none'; frame.setAttribute('aria-hidden', 'true');
      const done = () => { window.removeEventListener('message', onMsg); clearTimeout(timer); frame.remove(); };
      const onMsg = e => {
        const d = e.data;
        if (!d || typeof d !== 'object' || d.state !== state) return;
        done();
        if (d.error) reject(new AcctError('Login was refused: ' + d.error));
        else if (d.code) resolve(d.code);
        else reject(new AcctError('Login could not finish: no authorization code.'));
      };
      const timer = setTimeout(() => { done(); reject(new AcctError('Login timed out. Check your connection and try again.')); }, 45000);
      window.addEventListener('message', onMsg);
      frame.src = url;
      document.body.appendChild(frame);
    });
  }
  function signOut() { saveTokens(null); ls.set('member', null); }
  const isMember = () => !!(tok && tok.role === 'member' && tok.refreshToken);
  async function sendReset(email, returnUrl) {
    await wix('/_api/iam/recovery/v1/send-email', { body: { email: email, redirect: { url: returnUrl || (C.site + '/'), clientId: C.clientId } } });
  }
  const changePassword = pw => wix('/_api/iam/authentication/v2/change-password', { body: { newPassword: pw } });
  const deleteMe = () => wix('/members/v1/members/my', { method: 'DELETE' });

  /* ---------- the account key ---------- */
  const enc = new TextEncoder(), dec = new TextDecoder();
  const toB64 = buf => { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  const fromB64 = s => { const bin = atob(s), b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; };
  async function kek(password, saltB64, iter) {
    const base = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(saltB64), iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function seal(keyObj, bytes, aad) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: enc.encode(aad || '') }, keyObj, bytes);
    const out = new Uint8Array(12 + ct.byteLength); out.set(iv, 0); out.set(new Uint8Array(ct), 12);
    return toB64(out);
  }
  async function open(keyObj, b64, aad) {
    const all = fromB64(b64);
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.subarray(0, 12), additionalData: enc.encode(aad || '') }, keyObj, all.subarray(12)));
  }
  const dataKeyObj = b64 => crypto.subtle.importKey('raw', fromB64(b64), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  // a brand-new account key, locked with the password
  async function newKeys(password) {
    const dk = crypto.getRandomValues(new Uint8Array(32)), salt = toB64(crypto.getRandomValues(new Uint8Array(16)));
    const k = await kek(password, salt, C.kdfIter);
    return { dataKey: toB64(dk), kdfSalt: salt, kdfIter: C.kdfIter, wrappedKey: await seal(k, dk, 'dcl-key') };
  }
  // open the account key with the password; null when the password doesn't fit (it was reset since)
  async function unlockKey(password, rec) {
    try { const k = await kek(password, rec.kdfSalt, rec.kdfIter || C.kdfIter); return toB64(await open(k, rec.wrappedKey, 'dcl-key')); }
    catch (e) { return null; }
  }
  // the same account key, locked again with a new password (new salt too)
  async function relock(password, dataKey) {
    const salt = toB64(crypto.getRandomValues(new Uint8Array(16)));
    const k = await kek(password, salt, C.kdfIter);
    return { kdfSalt: salt, kdfIter: C.kdfIter, wrappedKey: await seal(k, fromB64(dataKey), 'dcl-key') };
  }
  // the save itself, bound to the account it belongs to
  async function encryptSave(dataKey, obj, owner) { return seal(await dataKeyObj(dataKey), enc.encode(JSON.stringify(obj)), 'dcl-save:' + owner); }
  async function decryptSave(dataKey, b64, owner) {
    if (!b64) return null;
    try { return JSON.parse(dec.decode(await open(await dataKeyObj(dataKey), b64, 'dcl-save:' + owner))); } catch (e) { return undefined; }
  }

  /* ---------- the player's record (only its owner can read or change it) ---------- */
  async function myRecord() {
    const d = await wix('/wix-data/v2/items/query', { body: { dataCollectionId: C.saves, query: { paging: { limit: 5 } } } });
    const items = (d && d.dataItems) || [];
    if (!items.length) return null;
    items.sort((a, b) => (b.data.updatedAt || 0) - (a.data.updatedAt || 0));
    return { id: items[0].id || items[0].data._id, data: items[0].data };
  }
  async function writeRecord(rec, data) {
    if (rec && rec.id) {
      const merged = Object.assign({}, rec.data, data, { _id: rec.id });
      const d = await wix('/wix-data/v2/items/' + encodeURIComponent(rec.id), { method: 'PUT', body: { dataCollectionId: C.saves, dataItem: { id: rec.id, data: merged } } });
      return { id: rec.id, data: d.dataItem.data };
    }
    const d = await wix('/wix-data/v2/items', { body: { dataCollectionId: C.saves, dataItem: { data: data } } });
    return { id: d.dataItem.id || d.dataItem.data._id, data: d.dataItem.data };
  }
  const newTag = () => String(1000 + (crypto.getRandomValues(new Uint16Array(1))[0] % 9000));

  /* ---------- the global board (anyone can read it; members post their own best) ---------- */
  async function board(season, limit) {
    const d = await wix('/wix-data/v2/items/query', { body: { dataCollectionId: C.scores, query: { filter: { season: { $eq: season } }, sort: [{ fieldName: 'score', order: 'DESC' }], paging: { limit: limit || 50 } } } });
    return ((d && d.dataItems) || []).map(it => ({ id: it.data._owner, item: it.id, tag: it.data.tag, score: it.data.score | 0, wave: it.data.wave | 0, kills: it.data.kills | 0, dev: it.data.dev, plat: it.data.plat, at: it.data.at }));
  }
  // one entry per player per season: their best run. Returns 'posted' or 'kept'.
  async function postScore(season, owner, entry) {
    const d = await wix('/wix-data/v2/items/query', { body: { dataCollectionId: C.scores, query: { filter: { season: { $eq: season }, _owner: { $eq: owner } }, paging: { limit: 1 } } } });
    const cur = d && d.dataItems && d.dataItems[0];
    const data = { season: season, tag: entry.tag, score: entry.score | 0, wave: entry.wave | 0, kills: entry.kills | 0, dev: entry.dev || '', plat: entry.plat || '', at: entry.at || Date.now() };
    if (cur) {
      if ((cur.data.score | 0) >= data.score) {
        if (cur.data.tag !== entry.tag) await wix('/wix-data/v2/items/' + encodeURIComponent(cur.id), { method: 'PUT', body: { dataCollectionId: C.scores, dataItem: { id: cur.id, data: Object.assign({}, cur.data, { tag: entry.tag }) } } });
        return 'kept';
      }
      await wix('/wix-data/v2/items/' + encodeURIComponent(cur.id), { method: 'PUT', body: { dataCollectionId: C.scores, dataItem: { id: cur.id, data: Object.assign({}, cur.data, data) } } });
      return 'posted';
    }
    await wix('/wix-data/v2/items', { body: { dataCollectionId: C.scores, dataItem: { data: data } } });
    return 'posted';
  }
  async function renameScores(owner, tag) {
    const d = await wix('/wix-data/v2/items/query', { body: { dataCollectionId: C.scores, query: { filter: { _owner: { $eq: owner } }, paging: { limit: 50 } } } });
    for (const it of (d && d.dataItems) || []) if (it.data.tag !== tag) await wix('/wix-data/v2/items/' + encodeURIComponent(it.id), { method: 'PUT', body: { dataCollectionId: C.scores, dataItem: { id: it.id, data: Object.assign({}, it.data, { tag: tag }) } } });
  }

  return {
    CFG: C, ls: ls, AcctError: AcctError, setHttp: setHttp, wix: wix, accessToken: accessToken,
    login: login, register: register, verifyEmail: verifyEmail, signOut: signOut, isMember: isMember, sendReset: sendReset,
    changePassword: changePassword, deleteMe: deleteMe, set onSignedOut(fn) { onSignedOut = fn; },
    newKeys: newKeys, unlockKey: unlockKey, relock: relock, encryptSave: encryptSave, decryptSave: decryptSave,
    myRecord: myRecord, writeRecord: writeRecord, newTag: newTag,
    board: board, postScore: postScore, renameScores: renameScores
  };
})();
