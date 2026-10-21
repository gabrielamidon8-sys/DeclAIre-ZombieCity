/* ================= Wi-Fi co-op: up to 4 players on the same network =================
   One PC hosts (the Windows app runs a small relay server, desktop/lan.js). The host's game runs the zombies, waves,
   bosses and the score; every player moves, aims and shoots for themselves and tells the host what they hit. The host
   sends everyone the state of the street 15 times a second, and each player's own hits and hurts are sent to them.
   Phones (the Android app) and other PCs join by picking the game from the list or typing the host's address. */
const NET = {
  role: null, ws: null, me: 1, status: 'off', err: '', hostName: '', port: 0, ips: [], token: '',
  peers: new Map(), others: new Map(), zmap: new Map(), lobby: [],
  started: false, zid: 0, spawning: false, cosmetic: false, lastHitBy: 1, finishing: false, local: null,
  sendT: 0, snapT: 0, hudT: 0, scanT: 0, hold: 0, md: 0,
  hits: [], zfx: [], shots: [], kills: [], evs: [], blastsDone: new Set(), cardsAt: 0, picked: new Set(), found: [], shotSfx: new Map(),
  // 1.9.90: card rounds, ping, reconnects
  round: 0, roundDl: 0, acked: new Set(), cardsT: 0, myRound: 0, myPicked: 0, roundPicked: [],
  marks: [], markAt: 0, rtt: 0, pings: new Map(), piT: 0, pgT: 0, lastRx: 0, key: '', target: null, recon: 0, reconT: 0, hostVer: '',
  // 1.9.970: compact snapshots for big crowds (what each zombie is, sent once; where it is, every time)
  zsent: new Map(), zst: new Map(), snapN: 0
};
const NET_PORT = 47777, NET_MAX = 4;
const NET_PICK_SECS = 30, NET_AWAY_SECS = 30, NET_RECON_SECS = 25;
// players on different versions would see different zombies, weapons and cards, so the host only lets in its own version
const netVerOk = v => String(v || '') === ZC_VERSION;
const NET_COLS = ['#f2cc3a', '#29e6ff', '#ff3df2', '#7dff4a'];
const NET_SK = ['acid', 'wisp', 'shard', 'spike', 'fire', 'ice', 'void', 'shock', 'spirit', 'web', 'bolt', 'wrench'];
const NET_HK = ['acid', 'fire', 'sludge', 'ice', 'spore', 'vortex'];
const netCol = id => NET_COLS[(Math.max(1, id) - 1) % NET_COLS.length];
// On Android the game is a secure (https) page and WebView won't let it open a plain ws:// connection to a PC on the
// Wi-Fi, so the app makes the connection (ZCNative.wsOpen) and this wraps it to look like a WebSocket.
const netNativeWs = () => !!(window.ZCNative && window.ZCNative.wsOpen);
class NativeWS {
  constructor(url) {
    this.readyState = 0; this.onopen = this.onmessage = this.onclose = null;
    this.id = +window.ZCNative.wsOpen(String(url)) || 0;
    if (!this.id) { setTimeout(() => this._closed(1006), 0); return; }
    NativeWS.all.set(this.id, this); NativeWS.pump();
  }
  send(s) { if (this.readyState === 1) window.ZCNative.wsSend(this.id, String(s)); }
  close() { if (this.readyState >= 2) return; this.readyState = 2; if (this.id) try { window.ZCNative.wsClose(this.id); } catch (e) { } setTimeout(() => this._closed(1000), 0); }
  _closed(code) { if (this.readyState === 3) return; this.readyState = 3; NativeWS.all.delete(this.id); if (this.onclose) this.onclose({ code: code }); }
  static pump() {
    if (NativeWS.t) return;
    NativeWS.t = setInterval(() => {
      if (!NativeWS.all.size) { clearInterval(NativeWS.t); NativeWS.t = 0; return; }
      let evs; try { evs = JSON.parse(window.ZCNative.wsPoll() || '[]'); } catch (e) { return; }
      for (const ev of evs) {
        const w = NativeWS.all.get(ev[0]); if (!w || w.readyState === 3) continue;
        if (ev[1] === 'o') { if (w.readyState === 0) { w.readyState = 1; if (w.onopen) w.onopen({}); } }
        else if (ev[1] === 'm') { if (w.readyState === 1 && w.onmessage) w.onmessage({ data: ev[2] }); }
        else if (ev[1] === 'c') w._closed(ev[2] || 1006);
      }
    }, 16);
  }
}
NativeWS.all = new Map(); NativeWS.t = 0;
const netCan = {
  host: () => !!(window.ZCDesktop && window.ZCDesktop.lanHost),
  // browsers block a secure page from talking to a plain local address, so the web page can't join; the apps can
  join: () => (netNativeWs() || (typeof WebSocket !== 'undefined' && (IS_APP || PLATFORM === 'win' || location.protocol === 'file:' || location.protocol === 'http:'))),
  scan: () => !!((window.ZCDesktop && window.ZCDesktop.lanScan) || (window.ZCNative && window.ZCNative.lanScan))
};
function netReset() {
  if (NET.ws) { try { NET.ws.onclose = null; NET.ws.close(); } catch (e) { } }
  Object.assign(NET, { role: null, ws: null, me: 1, status: 'off', started: false, hold: 0, md: 0, local: null, finishing: false, hits: [], zfx: [], shots: [], kills: [], evs: [],
    round: 0, roundDl: 0, myRound: 0, myPicked: 0, roundPicked: [], rtt: 0, recon: 0, reconT: 0, target: null, hostVer: '', hostOk: false, hostNonce: '', lobbyRaw: [], snapAt: 0, ivMs: 0, jitMs: null });
  NET.peers.clear(); NET.others.clear(); NET.zmap.clear(); NET.zsent.clear(); NET.zst.clear(); NET.snapN = 0; NET.picked.clear(); NET.acked.clear(); NET.blastsDone.clear(); NET.pings.clear(); NET.marks = []; NET.lobby = [];
  $('app').classList.remove('coop'); netReconBanner(false);
}

/* ---------- connecting ---------- */
async function netHost() {
  if (!netCan.host()) return;
  NET.err = ''; NET.status = 'starting'; renderCoop();
  let r;
  try { r = await window.ZCDesktop.lanHost(getTag(), NET_PORT); } catch (e) { r = { ok: false, error: String(e && e.message || e) }; }
  if (!r || !r.ok) { NET.status = 'off'; NET.err = 'Could not start hosting: ' + ((r && r.error) || 'unknown error'); renderCoop(); return; }
  NET.port = r.port; NET.ips = r.ips || []; NET.token = r.token;
  const ws = new WebSocket('ws://127.0.0.1:' + r.port + '/?host=' + r.token);
  NET.ws = ws;
  ws.onopen = () => { NET.role = 'host'; NET.me = 1; NET.status = 'lobby'; NET.lobby = [{ id: 1, name: getTag(), dev: DEV.kind }]; $('app').classList.add('coop'); renderCoop(); };
  ws.onmessage = e => { try { netHostRecv(e.data); } catch (err) { perfError(err); } };
  ws.onclose = () => { if (NET.role === 'host') netEnd('The co-op server stopped.'); else { NET.status = 'off'; NET.err = 'Could not open the co-op server.'; renderCoop(); } };
}
function netJoin(ip, port) {
  if (!netCan.join()) return;
  ip = String(ip || '').trim(); if (!ip) return;
  const m = /^(\[[^\]]+\]|[^:]+)(?::(\d+))?$/.exec(ip); if (!m) { NET.err = 'That does not look like an address.'; renderCoop(); return; }
  const host = m[1], prt = +(port || m[2] || NET_PORT);
  store.set('zc_lastip', ip);
  NET.err = ''; NET.status = 'connecting'; renderCoop();
  // a fresh key for this game: if the Wi-Fi drops, the same key gets this player their slot back
  NET.key = Array.from(crypto.getRandomValues(new Uint8Array(9)), b => b.toString(16).padStart(2, '0')).join('');
  NET.target = { host: host, port: prt };
  netConnect(false);
}
// opens the connection to the host; again=true when the Wi-Fi dropped mid-game and this player is coming back
function netConnect(again) {
  const T = NET.target; if (!T) return;
  let ws;
  const url = 'ws://' + T.host + ':' + T.port + '/?name=' + encodeURIComponent(getTag()) + '&dev=' + DEV.kind + '&ver=' + encodeURIComponent(ZC_VERSION) + '&key=' + NET.key + (myAcct() ? '&acct=' + myAcct() : '');
  try { ws = netNativeWs() ? new NativeWS(url) : new WebSocket(url); }
  catch (e) { if (again) return; NET.status = 'off'; NET.err = 'Could not connect to ' + T.host + '.'; renderCoop(); return; }
  NET.ws = ws; let opened = false;
  const giveUp = setTimeout(() => { if (!opened) { try { ws.close(); } catch (e) { } } }, 5000);
  ws.onopen = () => { opened = true; clearTimeout(giveUp); NET.role = 'client'; NET.lastRx = performance.now(); if (!again) NET.status = 'joining'; renderCoop(); };
  ws.onmessage = e => { NET.lastRx = performance.now(); let m; try { m = JSON.parse(e.data); } catch (err) { return; } try { netClientRecv(m); } catch (err) { perfError(err); } };
  ws.onclose = () => { clearTimeout(giveUp); netDropped(ws, opened, again); };
}
// the connection closed (or got stuck and was dropped)
function netDropped(ws, opened, again) {
  {
    const T = NET.target || {};
    if (NET.ws !== ws) return;
    NET.ws = null; ws.onclose = ws.onmessage = null;
    if (!opened && !again && !NET.started) { NET.status = 'off'; NET.err = 'Could not reach a game at ' + T.host + '. Check that the host is hosting, you are on the same Wi-Fi, and Windows allowed Zombie City through its firewall.'; renderCoop(); return; }
    // mid-game: keep trying for a while before giving up (phones drop off the Wi-Fi for a moment, or go to sleep)
    if (NET.role === 'client' && NET.started) { if (!NET.recon) { NET.recon = performance.now(); netReconBanner(true); } NET.reconT = 1.2; return; }
    if (NET.role === 'client') netEnd('Lost the connection to the host.');
  }
}
function netReconBanner(on) {
  const b = $('netRecon'); if (!b) return;
  b.hidden = !on;
  if (on) b.textContent = 'Connection lost. Reconnecting to ' + (NET.hostName || 'the host') + '…';
}
// mid-game reconnecting, run each frame on a teammate's game
function netReconTick(rdt) {
  if (NET.role !== 'client') return;
  const now = performance.now();
  // nothing from the host for a while: the connection is stuck, so drop it and connect again
  if (NET.started && NET.ws && NET.ws.readyState === 1 && now - NET.lastRx > 5000) { const w = NET.ws; NET.lastRx = now; try { w.close(); } catch (e) { } netDropped(w, true, true); }
  if (!NET.recon) return;
  if (now - NET.recon > NET_RECON_SECS * 1000) { NET.recon = 0; netEnd('Lost the connection to ' + (NET.hostName || 'the host') + '.'); return; }
  if (NET.ws) return;
  NET.reconT -= rdt; if (NET.reconT > 0) return;
  NET.reconT = 2; netConnect(true);
}
function netLeave() {
  const wasHost = NET.role === 'host';
  if (NET.role === 'client' && NET.ws && NET.ws.readyState === 1) try { NET.ws.send(JSON.stringify({ t: 'bye' })); } catch (e) { }
  netReset();
  if (wasHost && window.ZCDesktop && window.ZCDesktop.lanStop) window.ZCDesktop.lanStop();
  renderCoop();
}
function netEnd(why) {
  const inRun = G.mode !== 'title' && G.p;
  netLeave();
  if (inRun) { toTitle(); }
  NET.err = why || ''; toast('Co-op', why || 'The game ended', '#e5484d');
  if (!$('coop').hidden) renderCoop();
}
function hostSend(to, obj) { if (NET.ws && NET.ws.readyState === 1) NET.ws.send(to + '|' + JSON.stringify(obj)); }
function netSend(obj) { if (NET.ws && NET.ws.readyState === 1) NET.ws.send(JSON.stringify(obj)); }

/* ---------- players ---------- */
// every player the host knows about: its own (local) player and a stand-in (proxy) for each teammate
function netPlayers() {
  const out = []; const L = NET.local || G.p; if (L) out.push(L);
  for (const pr of NET.peers.values()) if (pr.p && !pr.away) out.push(pr.p);
  return out;
}
function netAlive() { return netPlayers().filter(p => !p.down); }
function netTarget(z) {
  let best = null, bd = Infinity;
  for (const p of netPlayers()) { if (p.down) continue; const d = (p.x - z.x) * (p.x - z.x) + (p.y - z.y) * (p.y - z.y); if (d < bd) { bd = d; best = p; } }
  return best || NET.local || G.p;
}
function netNearD2(x, y) { let bd = Infinity; for (const p of netPlayers()) { const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y); if (d < bd) bd = d; } return bd; }
function netAnchor() { const a = netAlive(); return a.length ? a[(Math.random() * a.length) | 0] : (NET.local || G.p); }
// run fn for every standing player, with G.p pointing at them (host); just the local player otherwise
function netEach(fn) {
  if (NET.role !== 'host') { if (G.p && !G.p.down) fn(G.p); return; }
  const keep = G.p;
  for (const p of netPlayers()) { if (p.down) continue; G.p = p; fn(p); }
  G.p = keep;
}
function netProxy(peer) {
  if (peer.p) return peer.p;
  const p = newPlayer(); p.remote = true; p.nid = peer.id; p.tx = p.x = (NET.local || G.p || WORLD.start).x; p.ty = p.y = (NET.local || G.p || WORLD.start).y;
  p.out = { h: [], dot: 0, heal: 0, fx: null, kv: [0, 0], rev: 0, heavy: 0 }; p.rv = 0; p.name = peer.name; p.acct = peer.acct; p.col = peer.col; p.lg = peer.lg || 'operator'; p.lc = peer.lc || 'attack';
  peer.p = p; return p;
}
// zombies hit a teammate's stand-in: the hit is sent to that player's game, which applies it (dodges, armor, dashes)
function netHurtProxy(p, a) {
  if (p.down || p.iframe > 0 || p.dashT > 0 || G.mode !== 'play') return false;
  p.iframe = 0.32; p.out.h.push(Math.round(a * 10) / 10); return true;
}
function netDotProxy(p, a) { if (!p.down) p.out.dot += a; }
function netHeavy(p, z) {
  p.out.heavy = Math.max(p.out.heavy, Math.round(p.maxHp * 0.25)); p.iframe = 1.2;
  const S = z.snatch || z.rb; if (S) { S.state = 'recover'; S.t = 1.2; }
  ring(p.x, p.y, 10, 70, 0.4, '229,72,77', 5); shakeIt(6);
}

/* ---------- the host ---------- */
function netHostRecv(str) {
  const i = str.indexOf('|'); if (i < 0) return;
  const from = +str.slice(0, i); let m; try { m = JSON.parse(str.slice(i + 1)); } catch (e) { return; }
  if (from === 0) {
    if (m.t === 'join') {
      if (!netVerOk(m.ver)) { hostSend(m.id, { t: 'kick', why: 'Version mismatch: ' + getTag() + ' has Zombie City ' + ZC_VERSION + (m.ver ? ' and you have ' + String(m.ver).slice(0, 12) : '') + '. Update so you both have the same version, then join again.' }); return; }
      // the same player coming back after their Wi-Fi dropped: they get their slot (and their spot in the run) back
      const back = m.key ? Array.from(NET.peers.values()).find(p => p.key && p.key === m.key) : null;
      if (back) {
        NET.peers.delete(back.id); back.id = m.id; back.away = 0; if (back.p) { back.p.nid = m.id; back.p.away = false; }
        NET.peers.set(m.id, back);
        hostSend(m.id, { t: 'hello', id: m.id, slot: back.slot, host: getTag(), ver: ZC_VERSION, started: NET.started, back: 1 });
        netLobby(); toast('Co-op', back.name + ' is back', back.col);
        if (NET.started) { netSendStart(m.id); if (G.mode === 'upgrade' && NET.round) netSendCards(m.id); }
        return;
      }
      if (NET.peers.size >= NET_MAX - 1) { hostSend(m.id, { t: 'kick', why: 'The game is full.' }); return; }
      const used = new Set([1, ...Array.from(NET.peers.values()).map(p => p.slot)]); let slot = 2; while (used.has(slot)) slot++;
      const peer = { id: m.id, slot: slot, name: cleanTag(m.name), dev: m.dev || 'kbm', col: NET_COLS[slot - 1], p: null, key: String(m.key || '').slice(0, 24), away: 0, rtt: 0, claim: String(m.acct || ''), acct: null };
      NET.peers.set(m.id, peer);
      if (String(m.name || '').toUpperCase() === ADMIN_TAG && isAdmin(peer.claim)) netAskProof(peer);
      hostSend(m.id, { t: 'hello', id: m.id, slot: slot, host: getTag(), ver: ZC_VERSION, started: NET.started });
      netLobby(); toast('Co-op', peer.name + ' joined', peer.col); SFX.click();
      if (NET.started) { netSendStart(m.id); if (G.mode === 'upgrade' && NET.round) netSendCards(m.id); }
    } else if (m.t === 'leave') {
      const peer = NET.peers.get(m.id); if (!peer) return;
      // mid-run, a dropped player keeps their slot for a while in case they come back
      if (NET.started && !peer.bye) {
        peer.away = performance.now(); if (peer.p) peer.p.away = true;
        toast('Co-op', peer.name + ' lost connection. Waiting for them to come back', '#8f959e');
      } else { NET.peers.delete(m.id); toast('Co-op', peer.name + ' left', '#8f959e'); }
      NET.picked.delete(m.id); NET.pings.delete(m.id); netLobby();
      if (G.mode === 'upgrade') netCheckPicks();
    }
    return;
  }
  const peer = NET.peers.get(from); if (!peer) return;
  switch (m.t) {
    case 'p': {
      const p = netProxy(peer);
      p.tx = +m.x || 0; p.ty = +m.y || 0; p.aim = +m.a || 0; p.hp = +m.hp || 0; p.maxHp = +m.mh || 100; p.walk = +m.wk || 0;
      const wasDown = p.down; p.down = !!m.dn; if (p.down && !wasDown) { p.rv = 0; burst(p.x, p.y, 30, '#9e1c22', 200, 6, 0.8); toast('Co-op', peer.name + ' is down. Stand next to them to revive.', peer.col); }
      p.dashT = m.d ? 0.1 : 0; p.dashK = m.dk || p.dashK; if (m.w != null && WEAPONS[m.w]) p.weapon = WEAPONS[m.w];
      if (Math.hypot(p.tx - p.x, p.ty - p.y) > 220) { p.x = p.tx; p.y = p.ty; }
      if (m.ar) armsNetApply(p, m.ar);   // their ready, reload and sprint, and their magazines falling here (arms.js)
      break;
    }
    case 'sh': if (typeof swarmHear === 'function' && WEAPONS[m.w]) swarmHear(+m.x || 0, +m.y || 0, WEAPONS[m.w].F.key); netCosShot(from, m.x, m.y, m.a, m.w, m.n, m.s, m.r, m.sp); NET.shots.push([from, m.x, m.y, m.a, m.w, m.n, m.s, m.r, m.sp]); if (peer.p) peer.p.flashT = 0.05; break;
    case 'h':
      for (const h of m.h || []) {
        const z = NET.zmap.get(h[0]); if (!z || z.dead) continue;
        const fl = h[7] | 0;
        NET.lastHitBy = from; hurtZombie(z, Math.min(+h[1] || 0, 99999), { src: h[5] || 'bullet', crit: !!h[2], kx: +h[3] || 0, ky: +h[4] || 0, reg: NET_REG[h[6] | 0] || undefined, kill: !!(fl & 1), cripple: !!(fl & 2), deflect: !!(fl & 4), P: (+h[8] || 0) / 10 }); NET.lastHitBy = 1;
      }
      break;
    case 'zf':
      for (const f of m.f || []) {
        const z = NET.zmap.get(f[0]); if (!z || z.dead) continue;
        if (f[1] > 0) { z.burnT = Math.max(z.burnT || 0, f[1]); z.burnDps = Math.max(z.burnDps || 0, f[2] || 0); }
        if (f[3] > 0) { z.poisonT = Math.max(z.poisonT || 0, f[3]); z.poisonDps = Math.max(z.poisonDps || 0, f[4] || 0); }
        if (f[5] > 0) { z.slowT = Math.max(z.slowT, f[5]); z.slowMul = Math.min(z.slowMul || 1, f[6] || 1); }
        if (f[7] > 0 && !z.boss) { z.stun = Math.max(z.stun, f[7]); if (f[8]) z.frozen = 1; }
        if (f[9] || f[10]) { z.kvx += f[9] || 0; z.kvy += f[10] || 0; }
      }
      break;
    case 'kz': { const z = NET.zmap.get(m.z); if (z && !z.dead) { NET.lastHitBy = from; killZombie(z); NET.lastHitBy = 1; } break; }
    // a joiner calls the team's A-10: the host flies it from where they stand, and everyone (the caller too) sees it
    case 'air': if (peer.p && G.air > 0 && G.mode === 'play') { const keep = G.p; G.p = peer.p; callAirstrike(); G.p = keep; } break;
    case 'airv': launchStrafe(+m.cx, +m.cy, +m.a, { mini: true, cos: true }); NET.evs.push(['air', +m.cx, +m.cy, +m.a, 1, from]); break;
    case 'pick': if (!m.r || m.r === NET.round) { NET.picked.add(from); NET.acked.add(from); netCardStatus(); netCheckPicks(); } break;
    case 'ack': if (m.r === NET.round) { NET.acked.add(from); if (m.p) NET.picked.add(from); netCardStatus(); netCheckPicks(); } break;
    case 'pi': hostSend(from, { t: 'po', c: m.c }); if (NUM(m.r)) { peer.rtt = clamp(Math.round(m.r), 0, 9999); NET.pings.set(from, peer.rtt); } break;
    case 'mk': if (NUM(m.x) && NUM(m.y)) { netAddMark(from, m.x, m.y); hostSend('*', { t: 'mk', id: from, x: Math.round(m.x), y: Math.round(m.y) }); } break;
    case 'bye': peer.bye = true; break;
    // 1.9.992: which legend a teammate plays (and in which class), so everyone sees the right character
    case 'lg': { const lg = netLegendOk(m.lg, m.lc); peer.lg = lg[0]; peer.lc = lg[1]; if (peer.p) { peer.p.lg = lg[0]; peer.p.lc = lg[1]; } netLobby(); break; }
    // a teammate checking that the host's admin name is real: the host's account writes the note they asked for
    case 'prove': if (meAdmin() && typeof m.n === 'string' && m.n.length <= 40) AcctCore.prove(m.n).then(ok => { if (ok) hostSend(from, { t: 'proved', n: m.n }); }).catch(() => { }); break;
    case 'proved': if (peer.nonce && m.n === peer.nonce) netCheckProof(peer); break;
  }
}
// a legend from the wire: only ones this build knows, otherwise the Operator
function netLegendOk(lg, lc) {
  lg = lg === 'none' ? 'none' : (typeof LG_MAKERS !== 'undefined' && LG_MAKERS[lg] && lg !== 'zombie' && lg !== 'alley' && lg !== 'alleyGround' && lg !== 'studio' && lg !== 'studioGround') ? lg : 'operator';
  lc = typeof LG_CLASS_BY !== 'undefined' && LG_CLASS_BY[lc] ? lc : 'attack';
  return [lg, lc];
}
// the deployed legend changed (or we just joined): the host updates the lobby, a client tells the host
function netLegendChanged() {
  if (!NET.role) return;
  if (NET.role === 'host') { if (NET.status === 'lobby' || NET.started) netLobby(); }
  else if (NET.me) netSend({ t: 'lg', lg: SET.legend || 'operator', lc: SET.legendClass || 'attack' });
}
function netLobby() {
  NET.lobby = [{ id: 1, name: getTag(), dev: DEV.kind, col: NET_COLS[0], ping: 0, acct: meAdmin() ? ADMIN_ID : undefined, lg: SET.legend || 'operator', lc: SET.legendClass || 'attack' }].concat(Array.from(NET.peers.values()).map(p => ({ id: p.id, name: p.name, dev: p.dev, col: p.col, ping: p.rtt || 0, away: p.away ? 1 : 0, acct: p.acct || undefined, lg: p.lg || 'operator', lc: p.lc || 'attack' })));
  hostSend('*', { t: 'lobby', pl: NET.lobby, started: NET.started });
  renderCoop();
}
// the admin name in co-op is only shown once Wix confirms the player is really logged in to the admin account
function netNonce() { return Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join(''); }
function netAskProof(peer) { peer.nonce = netNonce(); hostSend(peer.id, { t: 'prove', n: peer.nonce }); }
async function netCheckProof(peer) {
  try {
    const owner = await AcctCore.proofOwner(peer.nonce);
    if (!isAdmin(owner) || owner !== peer.claim || !NET.peers.has(peer.id)) return;
    peer.acct = owner; peer.name = ADMIN_TAG; if (peer.p) { peer.p.name = ADMIN_TAG; peer.p.acct = owner; }
    netLobby();
  } catch (e) { /* no connection to Wix: the name stays plain */ }
}
// a teammate's view of the lobby: names as they may be shown (the host's admin name only once checked)
function netLobbyView(pl) {
  NET.lobbyRaw = pl || NET.lobbyRaw || [];
  NET.lobby = NET.lobbyRaw.map(p => { const acct = p.id === 1 ? (NET.hostOk ? p.acct : null) : p.acct; return Object.assign({}, p, { acct: acct || undefined, name: cleanTag(p.name, acct) }); });
  const h = NET.lobbyRaw.find(p => p.id === 1);
  if (h && isAdmin(h.acct) && String(h.name).toUpperCase() === ADMIN_TAG && !NET.hostOk && !NET.hostNonce) { NET.hostNonce = netNonce(); netSend({ t: 'prove', n: NET.hostNonce }); }
  if (NET.hostOk && h) NET.hostName = ADMIN_TAG;
}
function netSendStart(to) {
  NET.snapN = 0;   // the next snapshot is a full one, so whoever (re)joined knows every zombie at once
  hostSend(to, { t: 'start', seed: WORLD.lastSeed, mix: WORLD.mix, season: WORLD.season, scale: SCL, wave: G.wave, wx: WX.kind, hour: Math.round(luxHourNow() * 100) / 100, host: getTag(), x: Math.round((NET.local || G.p).x), y: Math.round((NET.local || G.p).y), mode: G.mode });
}
// the host presses Start: a normal run, and everyone else starts in the same city
function netHostRun() {
  if (NET.role !== 'host') return;
  NET.started = true; if (window.ZCDesktop && window.ZCDesktop.lanInfo) window.ZCDesktop.lanInfo({ run: true });
  for (const peer of NET.peers.values()) { peer.p = null; }
  $('coop').hidden = true;
  newRun(); NET.zsent.clear();
  NET.local = G.p; NET.picked.clear();
  for (const peer of NET.peers.values()) { const p = netProxy(peer); const a = peer.slot * 1.7; p.x = p.tx = G.p.x + Math.cos(a) * 40; p.y = p.ty = G.p.y + Math.sin(a) * 40; }
  netSendStart('*'); netLobby();
}
// called each host frame after its own player moved, before the zombies
function netHostPre(dt) {
  NET.local = G.p;
  for (const peer of NET.peers.values()) {
    const p = peer.p; if (!p) continue;
    const k = Math.min(1, dt * 16); p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k;
    p.iframe -= dt; if (p.flashT > 0) p.flashT -= dt;
    for (const f of ['poisonT', 'burnT', 'slowT', 'jamT', 'weakT', 'frozenT', 'rootT', 'blindT', 'bleedT']) if (p[f] > 0) p[f] = Math.max(0, p[f] - dt);
    p._b = [p.poisonT, p.burnT, p.slowT, p.jamT, p.weakT, p.frozenT, p.rootT, p.blindT, p.bleedT, p.slowMul];
    p.kvx = p.kvy = 0; p.extX = p.extY = 0;
    if (p.down) continue;
    // enemy shots, hazards and health packs, for teammates (the host's own player is handled as before)
    for (const s of G.eshots) {
      if (s.dead || Math.hypot(p.x - s.x, p.y - s.y) > s.r + p.r) continue;
      s.dead = true; const keep = G.p; G.p = p;
      if (hurtPlayer(s.dmg)) {
        if (s.k === 'acid') p.poisonT = Math.max(p.poisonT, 1.5); else if (s.k === 'fire') p.burnT = Math.max(p.burnT, 2);
        else if (s.k === 'ice') { p.slowT = Math.max(p.slowT, 1.5); p.slowMul = Math.min(p.slowMul, 0.6); } else if (s.k === 'void') p.weakT = Math.max(p.weakT, 2.5); else if (s.k === 'shock') p.jamT = Math.max(p.jamT, 0.5);
      }
      if (s.k === 'web') p.rootT = Math.max(p.rootT, 1.1);
      G.p = keep; burst(s.x, s.y, 5, SHOT_COL[s.k] || '#d9cfb4', 100, 3, 0.3);
    }
    for (const h of G.haz) {
      const d = Math.hypot(p.x - h.x, p.y - h.y); if (d > h.r) continue;
      if (h.k === 'acid' || h.k === 'fire') p.out.dot += h.dps * dt;
      else if (h.k === 'sludge') { p.slowT = Math.max(p.slowT, 0.2); p.slowMul = Math.min(p.slowMul, 0.55); }
      else if (h.k === 'ice') { p.slowT = Math.max(p.slowT, 0.25); p.slowMul = Math.min(p.slowMul, 0.42); p.out.dot += h.dps * 0.4 * dt; }
      else if (h.k === 'spore') p.poisonT = Math.max(p.poisonT, 1.2);
      else if (h.k === 'vortex') { const f = (1 - d / h.r) * 230 + 50; p.out.kv[0] += (h.x - p.x) / (d || 1) * f * dt; p.out.kv[1] += (h.y - p.y) / (d || 1) * f * dt; }
    }
    for (const k of G.picks) if (!k.dead && Math.hypot(p.x - k.x, p.y - k.y) < p.r + 16) { k.dead = true; p.out.heal += 25; SFX.heal(); ring(k.x, k.y, 6, 40, 0.35, '110,230,120', 3); }
  }
  // reviving: stand next to a downed teammate for a couple of seconds
  const all = netPlayers();
  for (const d of all) {
    if (!d.down) { d.rv = 0; continue; }
    const helper = all.some(a => !a.down && a !== d && Math.hypot(a.x - d.x, a.y - d.y) < 80);
    d.rv = helper ? (d.rv || 0) + dt : Math.max(0, (d.rv || 0) - dt * 0.5);
    if (d.rv >= 2.4) netRevive(d, 0.4);
  }
}
function netRevive(p, frac) {
  p.rv = 0;
  if (p.remote) { p.out.rev = Math.max(p.out.rev, Math.round(p.maxHp * frac)); p.down = false; }
  else if (p.down) { p.down = false; p.hp = Math.max(1, p.maxHp * frac); p.iframe = 2; banner('Back on your feet', ''); SFX.escape(); }
  ring(p.x, p.y, 8, 90, 0.5, '110,230,120', 5); burst(p.x, p.y, 20, '#7bd88a', 180, 4, 0.6);
}
// called each host frame after everything moved: what happened to each teammate goes back to them
function netHostPost() {
  if (NET.local) G.p = NET.local;
  const F = ['poisonT', 'burnT', 'slowT', 'jamT', 'weakT', 'frozenT', 'rootT', 'blindT', 'bleedT'];
  for (const peer of NET.peers.values()) {
    const p = peer.p; if (!p || !p._b) continue;
    let fx = null;
    for (let i = 0; i < F.length; i++) if (p[F[i]] > p._b[i] + 0.01) { fx = fx || {}; fx[F[i]] = Math.round(p[F[i]] * 100) / 100; }
    if (p.slowMul < p._b[9] - 0.001) { fx = fx || {}; fx.slowMul = p.slowMul; }
    if (fx) p.out.fx = Object.assign(p.out.fx || {}, fx);
    if (p.kvx || p.kvy) { p.out.kv[0] += p.kvx; p.out.kv[1] += p.kvy; p.kvx = p.kvy = 0; }
    if (p.extX || p.extY) { p.out.kv[0] += p.extX * 0.016; p.out.kv[1] += p.extY * 0.016; }
  }
  // everyone down: the run is over for the whole team
  if (G.mode === 'play' && G.time > 1) { const pl = netPlayers(); if (pl.length && pl.every(p => p.down)) netGameOver(); }
}
function netGameOver() {
  const msg = { t: 'over', sc: G.score, w: G.wave, k: G.kills, bc: G.bestChain, n: 1 + NET.peers.size };
  hostSend('*', msg); netFinish(msg);
}
// wave cleared: everyone picks a card, and the next wave starts once all have. Each round has a number and a deadline:
// the cards are sent again until every player has them (someone in the pause menu still gets them), anyone who has not
// picked when time runs out gets a card picked for them, so one player can never hold up the team.
function netCardsOpen() {
  NET.picked.clear(); NET.acked.clear(); NET.cardsAt = performance.now();
  NET.round = (NET.round || 0) + 1; NET.roundDl = performance.now() + NET_PICK_SECS * 1000; NET.cardsT = 1.5;
  NET.myRound = NET.round; NET.myPicked = 0;
  for (const peer of NET.peers.values()) if (peer.p && peer.p.down) netRevive(peer.p, 0.5);
  if (G.p.down) netRevive(G.p, 0.5);
  netSendCards('*');
}
function netSendCards(to) { hostSend(to, { t: 'cards', w: G.wave, r: NET.round, dl: Math.max(1, Math.round((NET.roundDl - performance.now()) / 1000)) }); }
// who has picked, for everyone's waiting screen
function netCardStatus() {
  if (NET.role !== 'host' || G.mode !== 'upgrade') return;
  hostSend('*', { t: 'cs', r: NET.round, pk: Array.from(NET.picked), dl: Math.max(0, Math.round((NET.roundDl - performance.now()) / 1000)) });
  NET.roundPicked = Array.from(NET.picked); netUpWait();
}
function netPicked() {
  NET.myPicked = NET.myRound;
  if (NET.role === 'host') { NET.picked.add(1); netCardStatus(); netCheckPicks(); }
  else netSend({ t: 'pick', r: NET.myRound });
  $('upGrid').classList.add('waiting'); netUpWait();
}
// the players a round waits for: everyone connected and in the run
function netNeed() { return [1].concat(Array.from(NET.peers.values()).filter(p => p.p && !p.away).map(p => p.id)); }
function netCheckPicks() {
  if (NET.role !== 'host' || G.mode !== 'upgrade' || !NET.round) return;
  const need = netNeed(), late = performance.now() > NET.roundDl;
  if (!need.every(id => NET.picked.has(id)) && !late) return;
  // time is up: the host's own card is picked for it if needed; the others pick theirs when 'go' arrives
  if (!NET.picked.has(1) || NET.myPicked !== NET.myRound) netAutoPick();
  NET.picked.clear(); NET.acked.clear(); NET.round && (NET.lastRound = NET.round); NET.roundDl = 0;
  $('upGrid').classList.remove('waiting');
  showOv(null); startWave(G.wave + 1);
  hostSend('*', { t: 'go', w: G.wave, r: NET.lastRound });
  NET.round = 0;
}
// a card picked for a player who ran out of time (or never saw the cards)
function netAutoPick() {
  if (NET.myPicked === NET.myRound) return;
  NET.myPicked = NET.myRound;
  const ch = (G.upChoices && G.upChoices.length) ? G.upChoices[(Math.random() * G.upChoices.length) | 0] : (rollCards() || [])[0];
  if (ch) { try { applyChoice(ch); } catch (e) { perfError(e); } toast('Co-op', 'Time ran out: picked ' + (ch.card ? ch.card.name : ch.w ? ch.w.name : ch.d ? ch.d.name : 'a card') + ' for you', '#f2cc3a'); }
  G.upChoices = null; G.picking = false;
}
// the line under the cards while the team picks: who is still choosing, and the time left
function netUpWait() {
  const box = $('upTeam'); if (!box) return;
  if (!NET.started || G.mode !== 'upgrade') { box.hidden = true; return; }
  const picked = new Set(NET.role === 'host' ? Array.from(NET.picked) : NET.roundPicked);
  if (NET.myPicked === NET.myRound) picked.add(NET.role === 'host' ? 1 : NET.me);
  const list = NET.lobby.length ? NET.lobby.filter(l => !l.away) : [{ id: 1, name: getTag(), col: NET_COLS[0] }];
  const left = Math.max(0, Math.ceil((NET.roundDl - performance.now()) / 1000));
  const key = list.map(l => l.id + (picked.has(l.id) ? 'y' : 'n')).join() + '|' + left;
  if (box.dataset.k === key) return; box.dataset.k = key;
  box.textContent = '';
  for (const l of list) { const c = el('span', 'up-tm' + (picked.has(l.id) ? ' done' : '')); c.style.setProperty('--tc', l.col || netCol(l.id)); c.append(nameEl(l.name, l.acct), el('i', null, picked.has(l.id) ? 'Picked' : 'Choosing')); box.append(c); }
  box.append(el('em', 'up-left', left + 's'));
  box.hidden = false;
}
function netTickHost(rdt) {
  const now = performance.now();
  // everyone's ping, once a second (in the lobby too)
  NET.pgT -= rdt;
  if (NET.pgT <= 0 && NET.peers.size) {
    NET.pgT = 1;
    hostSend('*', { t: 'pg', p: Array.from(NET.peers.values()).filter(p => !p.away).map(p => [p.id, p.rtt || 0]) });
    if (!$('coop').hidden) renderCoop();
  }
  // players who dropped and did not come back in time give up their slot
  for (const peer of Array.from(NET.peers.values())) if (peer.away && now - peer.away > NET_AWAY_SECS * 1000) {
    NET.peers.delete(peer.id); toast('Co-op', peer.name + ' left', '#8f959e'); netLobby(); if (G.mode === 'upgrade') netCheckPicks();
  }
  if (!NET.started) return;
  // a card round: send the cards again to anyone who has not answered, and end the round when time is up
  if (G.mode === 'upgrade' && NET.round) {
    NET.cardsT -= rdt;
    if (NET.cardsT <= 0) {
      NET.cardsT = 1.5;
      const miss = netNeed().filter(id => id !== 1 && !NET.acked.has(id));
      if (miss.length) netSendCards(miss.join(','));
      netCardStatus();
    }
    netCheckPicks(); netUpWait();
  }
  NET.snapT -= rdt;
  // a slow connection gets fewer snapshots instead of a growing queue (each one replaces the last anyway)
  if (NET.snapT <= 0) { NET.snapT = 1 / 15; if (!NET.ws || NET.ws.bufferedAmount < 512 * 1024) netSnapshot(); }
  // each teammate's own hits, hurts and pickups
  for (const peer of NET.peers.values()) {
    const p = peer.p; if (!p) continue; const o = p.out;
    if (!o.h.length && !o.dot && !o.heal && !o.fx && !o.kv[0] && !o.kv[1] && !o.rev && !o.heavy) continue;
    const u = { t: 'u' };
    if (o.h.length) u.h = o.h; if (o.dot) u.dot = Math.round(o.dot * 100) / 100; if (o.heal) u.heal = o.heal; if (o.fx) u.fx = o.fx;
    if (o.kv[0] || o.kv[1]) u.kv = [Math.round(o.kv[0]), Math.round(o.kv[1])]; if (o.rev) u.rev = o.rev; if (o.heavy) u.heavy = o.heavy;
    hostSend(peer.id, u);
    p.out = { h: [], dot: 0, heal: 0, fx: null, kv: [0, 0], rev: 0, heavy: 0 };
  }
}
function zFlags(z) {
  return (z.boss ? 1 : 0) | (z.fly ? 2 : 0) | (z.minion ? 4 : 0) | (z.child ? 8 : 0) | (z.illusion ? 16 : 0) | (z.st.under ? 32 : 0) | (z.st.down > 0 ? 64 : 0) | (z.st.phased ? 128 : 0)
    | (z.frozen && z.stun > 0 ? 256 : 0) | (z.burnT > 0 ? 512 : 0) | (z.poisonT > 0 ? 1024 : 0) | (z.slowT > 0 ? 2048 : 0) | (z.buffT > 0 ? 4096 : 0) | (z.warn > 0 ? 8192 : 0) | (z.st.fuse > 0 ? 16384 : 0) | (z.st.surgeT > 0 ? 32768 : 0)
    // the 2.0 zombies' animation cues: swinging, mid-leap or charging, a limp, a crawl
    | (z.atkW > G.time - 0.3 ? 65536 : 0) | (z.leapK || z.st.charge > 0 || z.st.lt > 0 ? 131072 : 0) | (z.legK >= 2 ? 524288 : z.legK ? 262144 : 0) | (z.windK ? 1048576 : 0);
}
const NUM = v => typeof v === 'number' && isFinite(v);
function plainNums(o) { const r = {}; if (!o) return r; for (const k in o) { const v = o[k]; if (NUM(v)) r[k] = Math.round(v * 100) / 100; else if (typeof v === 'boolean') r[k] = v; else if (Array.isArray(v) && v.length < 40 && v.every(NUM)) r[k] = v.map(x => Math.round(x * 10) / 10); } return r; }
// Zombies go out in two parts so hundreds fit: what each one is (its mutation, size, shield and kind) only when it is new
// or changed, and every snapshot where it is (positions from the host, angle, health, status) as small whole numbers.
// Zombies far from every player go out 5 times a second instead of 15, and every 2 seconds everything is sent again.
function netSnapshot() {
  const r1 = v => Math.round(v);
  NET.zmap.clear(); NET.snapN++;
  const key = NET.snapN % 30 === 1, all = key || NET.snapN % 3 === 0, ax = r1(G.p ? G.p.x : cam.x), ay = r1(G.p ? G.p.y : cam.y);
  const hw = W / ZOOM / 2, far2 = (hw * hw + (H / ZOOM / 2) * (H / ZOOM / 2)) * 1.6, zd = [], zst = [], zg = [], sent = NET.zsent;
  let prev = 0;
  for (const z of G.zs) {
    if (z.dead) continue; NET.zmap.set(z.nid, z);
    const fl = zFlags(z), sh = z.shield > 1 ? r1(z.shield / z.shieldMax * 100) : 0, r10 = r1(z.r * 10), sig = z.m.id * 64 + (fl & 31) + r10 * 65536 + sh * 1e9;
    const was = sent.get(z.nid);
    if (was !== sig || key) { zst.push(z.nid, z.m.id, r10, sh, fl & 31); sent.set(z.nid, sig); }
    if (!all && was === sig && !z.boss && netNearD2(z.x, z.y) > far2) continue;
    zd.push(z.nid - prev, r1(z.x - ax), r1(z.y - ay), Math.round(((z.ang % TAU) + TAU) % TAU * 10), r1(clamp(z.hp / z.maxHp, 0, 1) * 100), fl >> 5);
    prev = z.nid;
  }
  for (const id of Array.from(sent.keys())) if (!NET.zmap.has(id)) { zg.push(id); sent.delete(id); }
  const b = G.boss && !G.boss.dead ? G.boss : null; let B = null;
  if (b) {
    B = { id: b.nid, ab2: b.abs[1] || '' };
    if (b.rb) { const rb = b.rb; B.rb = { d: rb.def.id, f: rb.form, s: rb.state, mv: rb.mv, t: Math.round(rb.t * 100) / 100, mut: Math.round(rb.mutT * 100) / 100, hide: !!rb.hide, al: rb.alpha, sh: rb.shieldT > 0 ? 1 : 0, roam: !!rb.roam, D: plainNums(rb.d), seg: rb.seg ? rb.seg.map(s => [r1(s[0]), r1(s[1])]) : null }; }
    if (b.snatch) B.sn = plainNums(b.snatch), B.sn.state = b.snatch.state;
  }
  const pl = netPlayers().map(p => [p.remote ? p.nid : 1, r1(p.x), r1(p.y), r1(p.aim * 100), r1(p.hp), r1(p.maxHp), p.down ? 1 : 0, p.dashT > 0 ? 1 : 0, p.weapon ? p.weapon.id : 0, r1((p.rv || 0) / 2.4 * 100), p.dashK || '', r1(p.walk * 10) % 10000, p.arm ? armsNetCode(p) : 0]);
  const s = {
    t: 's', tm: Math.round(G.time * 100) / 100, hr: Math.round(LUX.hour * 100) / 100, w: G.wave, wt: [Math.round((G.waveT || 0) * 10), G.waveMax | 0, Math.round((G.breakT || 0) * 10), zLeft(), G.boss && !G.boss.dead ? 1 : 0], sc: G.score, k: G.kills, ch: G.chain, bc: G.bestChain, air: G.air || 0, md: ['play', 'upgrade', 'skull', 'pause', 'cine', 'over'].indexOf(G.mode),
    wx: WX.kind, ss: WORLD.season, warp: G.warpT > 0 ? 1 : 0, z: zd, zs: zst, zg: zg, zk: key ? 1 : 0, ax: ax, ay: ay, B: B, pl: pl,
    e: G.eshots.filter(q => !q.dead).slice(0, 160).map(q => [r1(q.x), r1(q.y), r1(q.vx), r1(q.vy), NET_SK.indexOf(q.k), q.r]),
    hz: G.haz.slice(0, 60).map(h => [NET_HK.indexOf(h.k), r1(h.x), r1(h.y), r1(h.r), Math.round(h.life * 10) / 10, h.max]),
    pk: G.picks.filter(k => !k.dead).map(k => [r1(k.x), r1(k.y), Math.round(k.life * 10) / 10]),
    bl: G.blasts.slice(0, 40).map(q => [q.nid || (q.nid = ++NET.zid), r1(q.x), r1(q.y), r1(q.r), Math.round(q.t * 100) / 100, q.max, q.kind || '', q.col || '', q.haz || ''])
  };
  if (NET.kills.length) { s.kl = NET.kills; NET.kills = []; }
  if (NET.shots.length) { s.sh = NET.shots; NET.shots = []; }
  if (NET.evs.length) { s.ev = NET.evs; NET.evs = []; }
  if (typeof swarmNetVeh === 'function' && SWDYN.size) { const vh = swarmNetVeh(key); if (vh.length) s.vh = vh; }   // vehicles the crowd moved
  hostSend('*', s);
}

/* ---------- a teammate's game (client) ---------- */
function netClientRecv(m) {
  switch (m.t) {
    case 'hello':
      if (m.ver && !netVerOk(m.ver)) { const why = 'Version mismatch: the host has Zombie City ' + String(m.ver).slice(0, 12) + ' and you have ' + ZC_VERSION + '. Update so you both have the same version.'; if (G.mode !== 'title' && G.p) netEnd(why); else { netLeave(); NET.err = why; renderCoop(); } return; }
      NET.me = m.id; NET.slot = m.slot; NET.hostName = cleanTag(m.host); NET.hostVer = m.ver || ''; NET.status = 'lobby'; $('app').classList.add('coop');
      if (NET.recon) { NET.recon = 0; netReconBanner(false); toast('Co-op', 'Back in ' + NET.hostName + '’s game', '#7bd88a'); }
      NET.piT = 0; renderCoop(); netLegendChanged(); break;
    case 'lobby': netLobbyView(m.pl || []); for (const l of NET.lobby) if (l.id !== NET.me) NET.pings.set(l.id, l.ping || 0); renderCoop(); netUpWait(); break;
    // the host asks us to prove our admin name, or answers our check of theirs
    case 'prove': if (meAdmin() && typeof m.n === 'string' && m.n.length <= 40) AcctCore.prove(m.n).then(ok => { if (ok) netSend({ t: 'proved', n: m.n }); }).catch(() => { }); break;
    case 'proved':
      if (NET.hostNonce && m.n === NET.hostNonce) AcctCore.proofOwner(m.n).then(o => { if (isAdmin(o)) { NET.hostOk = true; netLobbyView(); renderCoop(); } }).catch(() => { });
      break;
    case 'kick': { const why = m.why || 'The host closed the door.'; if (G.mode !== 'title' && G.p) netEnd(why); else { netLeave(); NET.err = why; renderCoop(); } break; }
    case 'end': netEnd('The host ended the game.'); break;
    case 'start': netClientStart(m); break;
    case 's': if (NET.started) netApply(m); break;
    case 'u': if (NET.started) netYou(m); break;
    case 'po': if (NUM(m.c)) { const r = performance.now() - m.c; NET.rtt = NET.rtt ? NET.rtt * 0.7 + r * 0.3 : r; } break;
    case 'pg': for (const q of m.p || []) if (q[0] !== NET.me) NET.pings.set(q[0], q[1] | 0); if (!$('coop').hidden) renderCoop(); break;
    case 'cards': netClientCards(m); break;
    case 'mk': if (m.id !== NET.me && NUM(m.x) && NUM(m.y)) netAddMark(m.id, m.x, m.y); break;
    case 'cs': if (m.r === NET.myRound) { NET.roundPicked = m.pk || []; NET.roundDl = performance.now() + (m.dl | 0) * 1000; netUpWait(); } break;
    case 'go':
      if (!NET.started) break;
      // the round ended: a card is picked for this player if they had not picked one
      if (G.mode === 'upgrade' && NET.myPicked !== NET.myRound) netAutoPick();
      $('upGrid').classList.remove('waiting'); if (G.mode === 'upgrade') showOv(null);
      G.wave = m.w; G.mode = 'play'; NET.myRound = 0; netUpWait();
      { const bw = m.w % 5 === 0 && !(typeof ZR_BOSSES_OFF !== 'undefined' && ZR_BOSSES_OFF); if (m.up && SFX.timeUp) SFX.timeUp(); SFX.waveStart(bw); banner('Wave ' + m.w, m.up ? 'Time is up' : bw ? 'A boss is coming' : 'Hold the line'); G.breakT = 0; }
      break;
    // the wave is cleared and the next one is a few seconds off (the card rounds are switched off for now)
    case 'brk':
      if (!NET.started || !G.p || G.mode === 'over' || G.mode === 'title') break;
      G.eshots = []; SFX.waveClear(); G.breakT = (m.s | 0) || 7; clearPop(m.w | 0, (m.w | 0) * 100, m.b | 0, m.l | 0);
      break;
    case 'over': if (NET.started) netFinish(m); break;
  }
}
// the host says the wave is cleared: show this round's cards (closing the pause menu if it is open), and say we have them
function netClientCards(m) {
  if (!NET.started || !G.p || G.mode === 'over' || G.mode === 'title') return;
  if (m.r && m.r === NET.myRound) { netSend({ t: 'ack', r: m.r, p: NET.myPicked === m.r ? 1 : 0 }); return; }   // already showing them
  if (G.mode === 'pause' || G.mode === 'skull' || G.mode === 'cine') { G.mode = 'play'; showOv(null); }
  NET.myRound = m.r || 0; NET.myPicked = 0; NET.roundPicked = []; NET.roundDl = performance.now() + (m.dl || NET_PICK_SECS) * 1000;
  G.eshots = []; if (G.p.down) netYouRevive(Math.round(G.p.maxHp * 0.5));
  SFX.waveClear(); openCards(); netUpWait();
  netSend({ t: 'ack', r: m.r });
}
function netClientStart(m) {
  // back after a dropped connection, in the same run: carry on where we were
  const resume = NET.started && G.p && G.mode !== 'title' && G.mode !== 'over' && WORLD.lastSeed === m.seed;
  NET.started = true; NET.hostName = m.host ? cleanTag(m.host) : NET.hostName;
  $('coop').hidden = true;
  if (resume) { banner('Co-op', 'Back in ' + NET.hostName + "'s game"); return; }
  NET.zmap.clear(); NET.others.clear(); NET.blastsDone.clear(); NET.zst.clear();
  newRun({ client: true, world: { seed: m.seed, mix: m.mix, season: m.season, scale: m.scale == null ? 1 : m.scale }, wave: m.wave, at: { x: m.x, y: m.y } });
  WX.kind = m.wx || WX.kind; WX.t = 999;
  // the same hour of the day as the host (the sun, the shadows and the night come with it)
  if (typeof m.hour === 'number' && isFinite(m.hour)) { LUX.h0 = ((m.hour - G.time / 24) % 24 + 24) % 24; LUX.h0s = WORLD.seed; }
  banner('Co-op', 'In ' + NET.hostName + "'s game · wave " + m.wave);
}
function netMakePuppet(e, B) {
  const [nid, mid, x, y] = e, f = e[6];
  let z = null; NET.spawning = true;
  try {
    if (mid === -1) { z = spawnZombie(SNATCHER, x, y, { boss: true }); z.abs = []; z.snatch = { state: 'idle', t: 0, grabCd: 10, slamCd: 4, zx: 0, zy: 0, zr: 0, lx: 0, ly: 0 }; G.boss = z; SFX.roar(); banner('The Snatcher', 'Stay out of the red circle'); }
    else if (mid <= -100) { const def = ROSTER_BY_ID.get(-100 - mid); if (!def) return null; z = spawnRoster(def, !!(B && B.rb && B.rb.roam), { x: x, y: y }); }
    else {
      const m = MUTS[mid]; if (!m) return null;
      z = spawnZombie(m, x, y, { boss: !!(f & 1), fly: !!(f & 2), minion: !!(f & 4), child: !!(f & 8), illusion: !!(f & 16) });
      if (f & 1) { G.boss = z; if (B && B.ab2) z.abs.push(B.ab2); SFX.roar(); banner('Alpha ' + m.name, B && B.ab2 ? 'Extra mutation: ' + ((ABILITIES.find(a => a.key === B.ab2) || {}).name || '') : ''); }
    }
  } finally { NET.spawning = false; }
  z.puppet = true; z.nid = nid; z.tx = x; z.ty = y; z.ang = e[4] / 100; z.tang = z.ang; z.maxHp = 1000; z.hp = e[5] || 1;
  if (z.illusion) z.life = 1;
  NET.zmap.set(nid, z); return z;
}
const ZSTAT = ['burnT', 'poisonT', 'slowT', 'stun'];
function netApply(s) {
  netSnapClock();
  NET.md = s.md; NET.hold = s.md === 2 || s.md === 3 || s.md === 4 ? s.md : 0;
  G.wave = s.w; G.score = s.sc; G.kills = s.k; G.bestChain = Math.max(G.bestChain, s.bc || 0);
  // the host's wave clock (a teammate's game counts it down between snapshots)
  if (Array.isArray(s.wt)) { G.waveT = (+s.wt[0] || 0) / 10; G.waveMax = +s.wt[1] || 0; G.breakT = (+s.wt[2] || 0) / 10; G.zLeftN = +s.wt[3] || 0; G.clockHold = !!s.wt[4]; }
  if (s.ch > G.chain || (s.ch && s.ch < G.chain)) G.lastKill = G.time;
  G.chain = s.ch; G.air = s.air; G.warpT = s.warp ? 0.2 : 0;
  if (s.wx && WX.kind !== s.wx) WX.kind = s.wx; WX.t = 999;
  if (s.ss != null && WORLD.season !== s.ss) setSeason(s.ss, true);
  // the host's hour of the day: keeps the sun, the shadows and the night in step if this device fell behind (a pause, a slow frame)
  if (typeof s.hr === 'number' && isFinite(s.hr)) { const h0 = ((s.hr - G.time / 24) % 24 + 24) % 24, d = Math.abs(h0 - LUX.h0); if (Math.min(d, 24 - d) > 0.04) { LUX.h0 = h0; LUX.h0s = WORLD.seed; } }
  // zombies: move the ones we have toward where the host has them, make new ones, drop the gone ones
  const seen = s.zk ? new Set() : null, ax = s.ax || 0, ay = s.ay || 0, ZS = s.zs || [], ZD = s.z || [];
  for (let i = 0; i + 4 < ZS.length; i += 5) {
    NET.zst.set(ZS[i], [ZS[i + 1], ZS[i + 2], ZS[i + 3], ZS[i + 4]]);
    const z = NET.zmap.get(ZS[i]); if (z && !z.dead) { z.r = ZS[i + 2] / 10; if (ZS[i + 3]) { z.shieldMax = z.shieldMax || 100; z.shield = ZS[i + 3] / 100 * z.shieldMax; } else z.shield = 0; }
  }
  let nid = 0;
  for (let i = 0; i + 5 < ZD.length; i += 6) {
    nid += ZD[i]; const st = NET.zst.get(nid); if (!st) continue;   // not introduced yet: it comes with the next full update
    const x = ZD[i + 1] + ax, y = ZD[i + 2] + ay, f = st[3] | (ZD[i + 5] << 5);
    let z = NET.zmap.get(nid);
    if (!z || z.dead) { z = netMakePuppet([nid, st[0], x, y, ZD[i + 3] * 10, ZD[i + 4] * 10, f, st[1], st[2]], s.B); if (!z) continue; z.r = st[1] / 10; if (st[2]) { z.shieldMax = 100; z.shield = st[2]; } }
    if (seen) seen.add(nid);
    netVel(z, x, y); z.tx = x; z.ty = y; z.tang = ZD[i + 3] / 10; z.hp = ZD[i + 4] * 10;
    if (Math.hypot(z.tx - z.x, z.ty - z.y) > 260) { z.x = z.tx; z.y = z.ty; z.nvx = z.nvy = 0; }
    z.st.under = !!(f & 32); z.st.down = f & 64 ? 1 : 0; z.st.phased = !!(f & 128);
    z.frozen = f & 256 ? 1 : 0; z.stun = f & 256 ? 0.2 : 0; z.burnT = f & 512 ? 1 : 0; z.poisonT = f & 1024 ? 1 : 0; z.slowT = f & 2048 ? 0.2 : 0; z.buffT = f & 4096 ? 1 : 0;
    z.warn = f & 8192 ? 0.2 : 0; z.st.fuse = f & 16384 ? 0.3 : 0; z.st.surgeT = f & 32768 ? 1 : 0;
    if (z.m.v2) { const atk = !!(f & 65536); if (atk && !z.atkOn) z.atkT = G.time; z.atkOn = atk; z.leapK = f & 131072 ? 1 : 0; z.windK = f & 1048576 ? 1 : 0; z.legK = f & 524288 ? 2 : f & 262144 ? 1 : 0; }
    z.kvx = z.kvy = 0; z.slowMul = 1; z.burnDps = z.poisonDps = 0;
    z.nb = [z.burnT, z.poisonT, z.slowT, z.stun];
  }
  for (const k of s.kl || []) { const z = NET.zmap.get(k[0]); if (z && !z.dead) netKillFx(z, k[1], k); }
  // gone without a kill (an illusion fading, a bomber going off), and on a full update anything the host no longer has
  for (const g of s.zg || []) { const z = NET.zmap.get(g); if (z && !z.dead) { z.dead = true; NET.zmap.delete(g); } NET.zst.delete(g); }
  if (seen) for (const z of G.zs) if (!z.dead && z.puppet && !seen.has(z.nid)) { z.dead = true; NET.zmap.delete(z.nid); }
  if (s.vh && typeof swarmVehNet === 'function') for (let i = 0; i + 2 < s.vh.length; i += 3) swarmVehNet(s.vh[i], s.vh[i + 1], s.vh[i + 2]);
  // the boss's moves and telegraphs
  if (s.B) {
    const z = NET.zmap.get(s.B.id);
    if (z && !z.dead) {
      G.boss = z;
      if (s.B.rb && z.rb) { const R = s.B.rb, rb = z.rb; if (rb.form !== R.f) { rb.form = R.f; applyForm(z); } rb.state = R.s; rb.mv = R.mv; rb.t = R.t; rb.mutT = R.mut; rb.hide = R.hide; rb.alpha = R.al == null ? 1 : R.al; rb.shieldT = R.sh ? 1 : 0; rb.d = Object.assign(rb.d || {}, R.D); if (R.seg) rb.seg = R.seg; }
      if (s.B.sn && z.snatch) Object.assign(z.snatch, s.B.sn);
    }
  }
  if (G.boss && G.boss.dead) G.boss = null;
  // enemy shots, hazards, health packs and boss blasts are drawn as the host has them
  G.eshots = (s.e || []).map(q => ({ x: q[0], y: q[1], vx: q[2], vy: q[3], k: NET_SK[q[4]] || 'spike', r: q[5], life: 1, dmg: 0 }));
  G.haz = (s.hz || []).map(h => ({ k: NET_HK[h[0]] || 'acid', x: h[1], y: h[2], r: h[3], life: h[4], max: h[5], dps: 0 }));
  G.picks = (s.pk || []).map(k => ({ x: k[0], y: k[1], life: k[2], k: 'med' }));
  const bl = []; for (const q of s.bl || []) if (!NET.blastsDone.has(q[0])) bl.push({ nid: q[0], x: q[1], y: q[2], r: q[3], t: q[4], max: q[5], kind: q[6] || undefined, col: q[7] || undefined, haz: q[8] || undefined });
  G.blasts = bl;
  // teammates (and the host)
  const live = new Set();
  for (const q of s.pl || []) {
    const id = q[0]; if (id === NET.me) { const me = G.p; if (me && q[9] != null) me.rv = q[9] / 100 * 2.4; continue; }
    live.add(id);
    let o = NET.others.get(id);
    if (!o) { o = { id: id, x: q[1], y: q[2], r: 12, aim: 0, walk: 0, iframe: 0, dashT: 0, dashK: 'sprint', db: { stealthT: 0 }, flashT: 0, frozenT: 0, rootT: 0, jamT: 0, weapon: WEAPONS[0], col: netCol(id) }; NET.others.set(id, o); }
    const info = NET.lobby.find(l => l.id === id); o.name = info ? info.name : 'SURVIVOR'; o.acct = info ? info.acct : undefined; o.col = info && info.col ? info.col : netCol(id); { const lg = netLegendOk(info && info.lg, info && info.lc); o.lg = lg[0]; o.lc = lg[1]; }
    netVel(o, q[1], q[2]); o.tx = q[1]; o.ty = q[2]; o.aim = q[3] / 100; o.hp = q[4]; o.maxHp = q[5]; o.down = !!q[6]; o.dashT = q[7] ? 0.1 : 0; o.weapon = WEAPONS[q[8]] || o.weapon; o.rv = q[9] / 100 * 2.4; o.dashK = q[10] || 'sprint'; o.walk = q[11] / 10;
    if (q[12]) armsNetApply(o, q[12]);
    if (Math.hypot(o.tx - o.x, o.ty - o.y) > 260) { o.x = o.tx; o.y = o.ty; }
  }
  for (const id of Array.from(NET.others.keys())) if (!live.has(id)) NET.others.delete(id);
  for (const q of s.sh || []) if (q[0] !== NET.me) { netCosShot(q[0], q[1], q[2], q[3], q[4], q[5], q[6], q[7], q[8]); const o = NET.others.get(q[0]); if (o) o.flashT = 0.05; }
  for (const e of s.ev || []) if (e[0] === 'horde' && typeof swarmHordeFx === 'function') swarmHordeFx(e[1], e[2], e[3]);
  for (const e of s.ev || []) if (e[0] === 'air' && e[5] !== NET.me) { launchStrafe(e[1], e[2], e[3], { mini: !!e[4], cos: true }); if (!e[4]) { SFX.radio(); SFX.a10Jet(2.8); banner('A-10 inbound', 'Danger close'); } }
}
// a puppet zombie the host says is dead: blood, the specimen log, and the boss's end
function netKillFx(z, by, k) {
  // a 2.0 zombie falls the way the host saw it fall (the same death)
  if (z.m.v2 && k && k.length > 2 && typeof animaDeath === 'function') { z.hitA = (+k[3] || 0) / 100; if (k[4] != null) z.ang = k[4] / 100; animaDeath(z, k[2] | 0); }
  z.dead = true; NET.zmap.delete(z.nid);
  const m = z.m, gore = m.S.gore;
  if (z.illusion) { burst(z.x, z.y, 10, '#efe9dc', 120, 4, 0.4); return; }
  burst(z.x, z.y, z.boss ? 40 : z.fly ? 3 : 10, gore, z.boss ? 260 : 150, z.fly ? 2 : 5, 0.6);
  if (!z.fly) { if (typeof goreKill === 'function' && goreOk()) goreKill(z, by); else splat(z.x, z.y, z.r * rand(0.9, 1.4), gore); netChainFx(); }
  coreEmit('kill', { z: z, by: by });
  if (!z.fly && !z.minion && !m.unique) discover(m);
  if (by === NET.me && !z.fly) dashOnKill();
  if (z.boss) {
    shakeIt(14); G.boss = null;
    if (z.rb && !z.rb.def.overlord) { bossKilled.add(z.rb.def.id); saveBosses(); }
    banner(z.rb ? z.rb.def.name + ' destroyed' : m.unique ? 'The Snatcher is down' : 'Alpha down', '');
  }
}
function netChainFx() {
  const c = G.chain; SFX.kill(Math.max(1, c));
  if (c >= 25 && c % 25 === 0 && netChainFx.last !== c) { netChainFx.last = c; SFX.tierUp(c / 25); G.tierFlash = 1; }
}
// what happened to this player on the host: hits, burns and pushes, health packs, a revive
function netYou(m) {
  const p = G.p; if (!p) return;
  if (m.rev) netYouRevive(m.rev);
  if (p.down) return;
  if (m.heavy) { p.iframe = 0; hurtPlayer(m.heavy); p.rootT = Math.max(p.rootT, 0.9); shakeIt(12); G.hurtFlash = 0.5; }
  if (m.h) for (const a of m.h) hurtPlayer(+a || 0);
  if (m.dot) dotPlayer(+m.dot || 0);
  if (m.heal) { healPlayer(m.heal); SFX.heal(); G.texts.push({ x: p.x, y: p.y - 20, t: 0, life: 0.8, s: '+' + m.heal, c: '#7bd88a' }); }
  if (m.fx) for (const k in m.fx) { if (!(k in p)) continue; if (k === 'slowMul') p.slowMul = Math.min(p.slowMul, m.fx[k]); else p[k] = Math.max(p[k] || 0, m.fx[k]); }
  if (m.kv) { p.kvx += m.kv[0] || 0; p.kvy += m.kv[1] || 0; }
}
function netYouRevive(hp) { const p = G.p; if (!p || !p.down) return; p.down = false; p.hp = Math.max(1, hp); p.iframe = 2; banner('Back on your feet', ''); SFX.escape(); ring(p.x, p.y, 8, 90, 0.5, '110,230,120', 5); }
// a teammate's game each frame: your own player moves and shoots; zombies follow the host
function netClientUpdate(dt) {
  G.time += dt; if (G.hintT > 0) G.hintT -= dt; if (G.cineT > 0) G.cineT -= dt; DEV.useT[DEV.kind] += dt;
  if (G.mode === 'play' || G.mode === 'pause') {
    if (G.breakT > 0) { const t0 = G.breakT; G.breakT = Math.max(0, G.breakT - dt); waveCount(t0, G.breakT); }
    else if (G.waveT > 0 && !G.clockHold) { const t0 = G.waveT; G.waveT = Math.max(0, G.waveT - dt); waveCount(t0, G.waveT); }
  }
  const p = G.p;
  if (!NET.hold) updPlayer(dt);
  else if (p) { p.fireCd -= dt; }
  // (CORE v3: each zombie and teammate is drawn a little ahead along the way it was moving, by about as long as the
  // next snapshot takes on this link, and followed more softly when the link is jittery: smooth instead of stepping)
  const k = Math.min(1, dt * netFollowK()), lead = netLead();
  for (const z of G.zs) {
    if (z.dead) continue;
    const tx = z.tx + (z.nvx || 0) * lead, ty = z.ty + (z.nvy || 0) * lead;
    z.x += (tx - z.x) * k; z.y += (ty - z.y) * k; z.ang = angLerp(z.ang, z.tang, k); z.flash = Math.max(0, z.flash - dt);
    if (z.illusion) z.life = 1;
  }
  for (const o of NET.others.values()) { const tx = o.tx + (o.nvx || 0) * lead, ty = o.ty + (o.nvy || 0) * lead; o.x += (tx - o.x) * k; o.y += (ty - o.y) * k; if (o.flashT > 0) o.flashT -= dt; }
  for (const s of G.eshots) { s.x += s.vx * dt; s.y += s.vy * dt; }
  for (const h of G.haz) h.life -= dt;
  for (const q of G.picks) q.life -= dt;
  buildGrid();
  if (typeof swarmClient === 'function') swarmClient(dt);   // vehicles the host's crowd is pushing
  updBullets(dt); updDash(dt);
  NET.cosmetic = true;
  try { updJets(dt); netBlastsFx(dt); } finally { NET.cosmetic = false; }
  updAirFx(dt); updWorld(dt);
  netZDiff();
  G.zs = G.zs.filter(z => !z.dead);
  updFx(dt);
  if (G.boss && G.boss.dead) G.boss = null;
  const t = p && p.down ? (Array.from(NET.others.values()).find(o => !o.down) || p) : p;
  if (t) { const c = Math.min(1, dt * 7); cam.x += (t.x - cam.x) * c; cam.y += (t.y - cam.y) * c; }
}
// boss blasts land on a teammate's screen too (the damage was the host's call)
function netBlastsFx(dt) {
  for (const b of G.blasts) {
    b.t -= dt; if (b.t > 0 || NET.blastsDone.has(b.nid)) continue;
    NET.blastsDone.add(b.nid); b.dead = true; const col = b.col || '#ff8a3a';
    if (b.kind === 'bolt') { bolt(b.x + rand(-30, 30), b.y - 320, b.x, b.y, '#fff36b'); SFX.zap(); } else SFX.boom(b.kind === 'meteor');
    ring(b.x, b.y, 6, b.r * 1.15, 0.4, hexRgb(col), 4); burst(b.x, b.y, 14, col, 200, 5, 0.5); shakeIt(b.kind === 'meteor' ? 5 : 3);
  }
  G.blasts = G.blasts.filter(b => !b.dead);
  if (NET.blastsDone.size > 400) NET.blastsDone.clear();
}
// status effects this player put on puppets (burning, freezing, pushing) go to the host
function netZDiff() {
  for (const z of G.zs) {
    if (z.dead || !z.puppet || !z.nb) continue;
    let ch = false; for (let i = 0; i < ZSTAT.length; i++) if ((z[ZSTAT[i]] || 0) > z.nb[i] + 0.05) { ch = true; break; }
    if (!ch && Math.abs(z.kvx) < 1 && Math.abs(z.kvy) < 1) continue;
    NET.zfx.push([z.nid, z.burnT > z.nb[0] ? Math.round(z.burnT * 10) / 10 : 0, Math.round((z.burnDps || 0) * 10) / 10, z.poisonT > z.nb[1] ? Math.round(z.poisonT * 10) / 10 : 0, Math.round((z.poisonDps || 0) * 10) / 10,
      z.slowT > z.nb[2] ? Math.round(z.slowT * 10) / 10 : 0, Math.round((z.slowMul || 1) * 100) / 100, z.stun > z.nb[3] ? Math.round(z.stun * 10) / 10 : 0, z.frozen ? 1 : 0, Math.round(z.kvx), Math.round(z.kvy)]);
    z.nb = [z.burnT || 0, z.poisonT || 0, z.slowT || 0, z.stun || 0]; z.kvx = z.kvy = 0;
  }
}
// a hit on a puppet: shown at once, applied by the host
const NET_REG = ['', 'head', 'torso', 'armL', 'armR', 'legL', 'legR'];
function netHit(z, dmg, o) {
  if (z.dead) return false;
  NET.hits.push([z.nid, Math.round(dmg * 10) / 10, o.crit ? 1 : 0, Math.round(o.kx || 0), Math.round(o.ky || 0), o.src && o.src !== 'bullet' ? o.src : 0, NET_REG.indexOf(o.reg || ''), (o.kill ? 1 : 0) | (o.cripple ? 2 : 0) | (o.deflect ? 4 : 0), Math.round((o.P || 0) * 10)]);
  z.flash = 0.09;
  // the puppet flinches here at once (the host decides the rest)
  if (z.m.v2 && o.reg) { z.hitReg = o.reg; z.hitP = o.P || 0.6; z.hitT = G.time; if (o.kx || o.ky) z.hitA = Math.atan2(o.ky, o.kx); }
  if ((o.src === 'blast' || o.src === 'a10') && typeof goreBlastHit === 'function') goreBlastHit(z, Math.atan2(o.ky || 0, o.kx || 0), dmg);
  if (o.crit) G.texts.push({ x: z.x + rand(-6, 6), y: z.y - z.r, t: 0, life: 0.6, s: String(Math.round(dmg)), c: '#f2cc3a' });
  return true;
}
function netTickClient(rdt) {
  netReconTick(rdt);
  if (!NET.ws || NET.ws.readyState !== 1) return;
  // ping: the host answers at once, and we tell it what we measured so everyone sees everyone's ping
  NET.piT -= rdt;
  if (NET.piT <= 0) { NET.piT = 1; netSend({ t: 'pi', c: Math.round(performance.now() * 10) / 10, r: Math.round(NET.rtt) }); }
  if (!NET.started || !G.p) return;
  NET.sendT -= rdt;
  if (NET.hits.length) { netSend({ t: 'h', h: NET.hits }); NET.hits = []; }
  if (NET.zfx.length) { netSend({ t: 'zf', f: NET.zfx }); NET.zfx = []; }
  if (NET.sendT <= 0) {
    NET.sendT = 1 / 20; const p = G.p;
    netSend({ t: 'p', x: Math.round(p.x), y: Math.round(p.y), a: Math.round(p.aim * 100) / 100, hp: Math.round(p.hp), mh: Math.round(p.maxHp), dn: p.down ? 1 : 0, d: p.dashT > 0 ? 1 : 0, dk: p.dashK, w: p.weapon.id, wk: Math.round(p.walk * 10) / 10, ar: p.arm ? armsNetCode(p) : undefined });
  }
}
// called every frame from the game loop, whatever the screen
function netTick(rdt) {
  if (NET.role === 'host') netTickHost(rdt);
  else if (NET.role === 'client') netTickClient(rdt);
  NET.hudT -= rdt; if (NET.hudT <= 0) { NET.hudT = 0.2; if (NET.started && G.p) netHud(); }
  if (!$('coop').hidden) { NET.scanT -= rdt; if (NET.scanT <= 0) { NET.scanT = 1; netScan(); } }
}

/* ---------- shots from teammates (drawn, no damage) ---------- */
function netShot(a, x, y, n, S, w) {
  const B = typeof BAL_GUN !== 'undefined' && w.kind === 'bullet' && !S.homing && !S.boomerang && balUp() ? BAL_GUN[w.F.key] : null, u = 32 * SCL / SCALE_REAL;
  const m = { t: 'sh', x: Math.round(x), y: Math.round(y), a: Math.round(a * 1000) / 1000, w: w.id, n: n, s: Math.round(B ? B.v * u : S.speed), r: Math.round(B ? BAL.maxD * u : S.range), sp: Math.round(S.spread * 1000) / 1000 };
  if (NET.role === 'client') netSend(m); else NET.shots.push([1, m.x, m.y, m.a, m.w, m.n, m.s, m.r, m.sp]);
}
function netCosShot(pid, x, y, a, wid, n, spd, rng, spr) {
  const w = WEAPONS[wid] || WEAPONS[0]; n = clamp(n | 0, 1, 12); spd = spd || w.speed; rng = rng || w.range;
  if (G.bullets.length > 600) return;
  NET.cosN = (NET.cosN || 0) + n;   // how many of a teammate's rounds this screen has flown
  const cone = w.F.key === 'shotgun' || w.kind === 'flame', gap = 0.11 * Math.min(1, 6 / Math.max(1, n));
  for (let i = 0; i < n; i++) {
    let ang = a; if (n > 1) ang += cone ? (i / (n - 1) - 0.5) * spr : (i - (n - 1) / 2) * gap;
    ang += rand(-1, 1) * (w.kind === 'flame' ? spr * 0.5 : spr * 0.35);
    const sp = spd * (w.kind === 'flame' ? rand(0.75, 1.15) : 1), life = rng / sp;
    G.bullets.push({ cos: true, x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: life, max: life, kind: w.kind, col: w.color, dmg: 0, pierce: 0, bounce: 0, split: 0, hit: null, fk: w.F.key, mk: w.M.key, heavy: w.F.key === 'sniper', pid: pid });
    if (typeof tracerTag === 'function') tracerTag(G.bullets[G.bullets.length - 1]);
  }
  // the teammate's muzzle flash, its light, smoke and brass, from the end of their gun
  if (typeof muzzleShot === 'function') { const o = NET.role === 'host' ? (NET.peers.get(pid) || {}).p : NET.others.get(pid); muzzleShot(o || null, w, a, x, y); }
  const now = performance.now(), last = NET.shotSfx.get(pid) || 0;
  if (now - last > 110 && G.p && Math.hypot(x - G.p.x, y - G.p.y) < 700) { NET.shotSfx.set(pid, now); SFX.shot(w.F.key, w.M.key); }
}
function netCosBullet(b, dt) {
  if (b.kind === 'bullet' && typeof balCos === 'function' && b.vx * b.vx + b.vy * b.vy > 9e6) { balCos(b, dt); return; }   // a real round: the same ray as the shooter's
  b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
  if (b.life <= 0) { b.dead = true; return; }
  const wall = pointInRect(b.x, b.y); if (wall) { b.dead = true; if (b.kind !== 'flame' && typeof tracerImpact === 'function') tracerImpact(b, wall); return; }
  if (b.kind === 'flame') return;
  // a teammate's shot reaching a zombie: the same blood on this screen (cosmetic: the damage is the host's business)
  near(b.x, b.y, 40, z => { if (b.dead || z.dead || Math.hypot(z.x - b.x, z.y - b.y) > z.r + 3) return; b.dead = true; burst(b.x, b.y, 2, z.m.S.gore, 80, 3, 0.25); if (typeof goreHit === 'function') goreHit(z, b.vx, b.vy, 12, b); return false; });
}

/* ---------- drawing teammates ---------- */
function netDrawOne(o, isMe) {
  const col = o.col || netCol(o.id);
  ctx.strokeStyle = hexA(col, 0.75); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(o.x, o.y + 4, 17, 13, 0, 0, TAU); ctx.stroke();
  if (o.down) {
    ctx.save(); ctx.globalAlpha = 0.55; ctx.translate(o.x, o.y); ctx.rotate(1.3); ctx.translate(-o.x, -o.y); drawPlayer(o); ctx.restore(); ctx.globalAlpha = 1;
    const f = clamp((o.rv || 0) / 2.4, 0, 1);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(o.x, o.y, 30, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#7bd88a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(o.x, o.y, 30, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
    if (!isMe) { ctx.fillStyle = '#ff6a6a'; ctx.font = "bold 11px 'Share Tech Mono', monospace"; ctx.textAlign = 'center'; ctx.fillText('DOWN · STAND HERE', o.x, o.y + 46); }
  } else if (!isMe) drawPlayer(o);
  if (isMe) return;
  const name = o.name || 'SURVIVOR', adm = name === ADMIN_TAG && isAdmin(o.acct);
  ctx.font = (adm ? 'bold ' : '') + "12px 'Share Tech Mono', monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(name).width + (adm ? 18 : 12);
  ctx.fillStyle = 'rgba(8,10,13,0.72)'; ctx.fillRect(o.x - w / 2, o.y - 40, w, 16);
  ctx.fillStyle = col; ctx.fillRect(o.x - w / 2, o.y - 40, 2, 16); drawName(name, o.acct, o.x + 1, o.y - 31.5, 12);
  if (o.maxHp && !o.down) { const f = clamp(o.hp / o.maxHp, 0, 1); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(o.x - 16, o.y - 22, 32, 3); ctx.fillStyle = f > 0.35 ? '#7bd88a' : '#e5484d'; ctx.fillRect(o.x - 16, o.y - 22, 32 * f, 3); }
}
function netDrawPlayers() {
  if (!NET.started) return;
  netDrawMarks(Math.min(0.05, (performance.now() - (netDrawPlayers.t || performance.now())) / 1000)); netDrawPlayers.t = performance.now();
  if (NET.role === 'host') { for (const peer of NET.peers.values()) if (peer.p) netDrawOne(peer.p, false); }
  else for (const o of NET.others.values()) netDrawOne(o, false);
  if (G.p) { const me = G.p; me.col = netCol(NET.role === 'host' ? 1 : (NET.slot || NET.me)); if (me.down) netDrawOne(me, true); else { ctx.strokeStyle = hexA(me.col, 0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(me.x, me.y + 4, 17, 13, 0, 0, TAU); ctx.stroke(); } }
}
// the team on the HUD, under your name (with each one's ping when "Show ping" is on)
function netHud() {
  const box = $('hudTeam'); if (!box) return;
  const showPing = SET.netPing !== false;
  const rows = NET.role === 'host' ? Array.from(NET.peers.values()).filter(p => p.p && !p.away).map(p => ({ id: p.id, name: p.name, col: p.col, hp: p.p.hp, mh: p.p.maxHp, down: p.p.down, acct: p.acct }))
    : Array.from(NET.others.values()).map(o => ({ id: o.id, name: o.name, col: o.col, hp: o.hp, mh: o.maxHp, down: o.down, acct: o.acct }));
  const pingOf = id => id === 1 && NET.role === 'client' ? Math.round(NET.rtt) : NET.pings.get(id) || 0;
  const key = rows.map(r => r.name + (r.down ? 'D' : Math.round(clamp(r.hp / (r.mh || 1), 0, 1) * 20)) + (showPing ? '~' + Math.round(pingOf(r.id) / 10) : '')).join('|') + NET.hold + (showPing && NET.role === 'client' ? Math.round(NET.rtt / 10) : '');
  if (box.dataset.k === key) return; box.dataset.k = key;
  box.textContent = '';
  if (showPing && NET.role === 'client') { const me = el('div', 'tm-me'); me.append(el('span', null, 'Your ping'), pingEl(NET.rtt)); box.append(me); }
  for (const r of rows) {
    const d = el('div', 'tm' + (r.down ? ' down' : '')); d.style.setProperty('--tc', r.col);
    const bar = el('i'); const fill = el('s'); fill.style.width = (r.down ? 0 : clamp(r.hp / (r.mh || 1), 0, 1) * 100) + '%'; bar.append(fill);
    d.append(nameEl(r.name, r.acct, 'b'), bar, el('em', null, r.down ? 'DOWN' : Math.max(0, Math.round(r.hp)) + ''));
    if (showPing) d.append(pingEl(pingOf(r.id)));
    box.append(d);
  }
  if (NET.hold) box.append(el('div', 'tm-hold', NET.hold === 2 ? 'The skull is with ' + NET.hostName : NET.hold === 3 ? NET.hostName + ' paused the game' : 'Boss incoming'));
  box.hidden = !rows.length && !NET.hold;
}
// a ping reading: green under 60 ms, yellow under 150, red above
function pingEl(ms) {
  ms = Math.round(ms || 0);
  const e = el('span', 'ping ' + (ms < 60 ? 'good' : ms < 150 ? 'ok' : 'bad'));
  const bars = el('span', 'pb'); for (let i = 0; i < 3; i++) bars.append(el('b')); e.append(bars, document.createTextNode(ms ? ms + ' ms' : '— ms'));
  return e;
}
/* ---------- marking a spot for the team ---------- */
// G on the keyboard, LB on a controller, the pin button on a phone: a marker the whole team sees for a few seconds
function netMark() {
  if (!NET.started || !G.p || G.mode !== 'play') return;
  const now = performance.now(); if (now - NET.markAt < 1000) return; NET.markAt = now;
  let x = G.p.x, y = G.p.y;
  if (DEV.kind !== 'touch' && aimMode() !== 'auto' && DEV.mIn) { x = cam.x + (DEV.mx - W / 2) / ZOOM; y = cam.y + (DEV.my - H / 2) / ZOOM; }
  x = Math.round(x); y = Math.round(y);
  if (NET.role === 'host') { netAddMark(1, x, y); hostSend('*', { t: 'mk', id: 1, x: x, y: y }); }
  else { netAddMark(NET.me, x, y); netSend({ t: 'mk', x: x, y: y }); }
}
function netWho(id) {
  if (NET.role === 'host') { if (id === 1) return { name: getTag(), col: NET_COLS[0], acct: myAcct() }; const p = NET.peers.get(id); return p ? { name: p.name, col: p.col, acct: p.acct } : { name: 'SURVIVOR', col: netCol(id) }; }
  const l = NET.lobby.find(q => q.id === id); return l ? { name: l.name, col: l.col || netCol(id), acct: l.acct } : { name: id === NET.me ? getTag() : 'SURVIVOR', col: netCol(id) };
}
function netAddMark(id, x, y) {
  const w = netWho(id);
  NET.marks = NET.marks.filter(k => k.id !== id);
  NET.marks.push({ id: id, x: x, y: y, t: 0, life: 8, name: w.name, col: w.col });
  const mine = NET.role === 'host' ? id === 1 : id === NET.me;
  if (!mine) { toast('Co-op', w.name + ' marked a spot', w.col); SFX.click(); }
}
function netDrawMarks(dt) {
  for (const k of NET.marks) k.t += dt;
  NET.marks = NET.marks.filter(k => k.t < k.life);
  for (const k of NET.marks) {
    const f = k.t / k.life, a = f > 0.8 ? (1 - f) / 0.2 : 1, pr = (k.t * 1.4) % 1;
    ctx.globalAlpha = a * (1 - pr); ctx.strokeStyle = k.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(k.x, k.y, 10 + pr * 46, 0, TAU); ctx.stroke();
    ctx.globalAlpha = a; ctx.fillStyle = k.col;
    ctx.beginPath(); ctx.moveTo(k.x, k.y); ctx.lineTo(k.x - 9, k.y - 18); ctx.arc(k.x, k.y - 22, 10, Math.PI * 0.8, Math.PI * 2.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(8,10,13,0.85)'; ctx.beginPath(); ctx.arc(k.x, k.y - 22, 4, 0, TAU); ctx.fill();
    ctx.font = "bold 11px 'Share Tech Mono', monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lb = k.name + ': over here', tw = ctx.measureText(lb).width + 10;
    ctx.fillStyle = 'rgba(8,10,13,0.72)'; ctx.fillRect(k.x - tw / 2, k.y - 50, tw, 15); ctx.fillStyle = k.col; ctx.fillText(lb, k.x, k.y - 42);
    ctx.globalAlpha = 1;
  }
}
// arrows on the edge of the screen pointing at teammates who are off screen, with their name and how far away they are
function netDrawPointers() {
  if (!NET.started || !G.p || SET.netArrows === false) return;
  const list = NET.role === 'host' ? Array.from(NET.peers.values()).filter(p => p.p && !p.away).map(p => ({ x: p.p.x, y: p.p.y, name: p.name, col: p.col, down: p.p.down }))
    : Array.from(NET.others.values()).map(o => ({ x: o.x, y: o.y, name: o.name, col: o.col, down: o.down }));
  for (const k of NET.marks) list.push({ x: k.x, y: k.y, name: k.name + '’s mark', col: k.col, mark: true });
  const cx = W / 2, cy = H / 2, pad = 34, me = G.p;
  ctx.save(); ctx.font = "bold 11px 'Share Tech Mono', monospace"; ctx.textBaseline = 'middle';
  for (const o of list) {
    const sx = (o.x - cam.x) * ZOOM + cx, sy = (o.y - cam.y) * ZOOM + cy;
    if (sx > 8 && sx < W - 8 && sy > 8 && sy < H - 8) continue;   // on screen: the name tag shows where they are
    const dx = sx - cx, dy = sy - cy, k = Math.min((cx - pad) / Math.abs(dx || 1e-6), (cy - pad) / Math.abs(dy || 1e-6));
    const px = cx + dx * k, py = cy + dy * k, a = Math.atan2(dy, dx);
    const col = o.down ? '#ff4a4a' : o.col, pulse = o.down ? 0.6 + 0.4 * Math.sin(G.time * 8) : o.mark ? 0.55 + 0.35 * Math.sin(G.time * 6) : 1;
    ctx.globalAlpha = pulse;
    ctx.translate(px, py); ctx.rotate(a); ctx.scale(1.4, 1.4);
    ctx.fillStyle = 'rgba(8,10,13,0.75)'; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-9, -11); ctx.lineTo(-4, 0); ctx.lineTo(-9, 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-6, -8); ctx.lineTo(-2, 0); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill();
    ctx.scale(1 / 1.4, 1 / 1.4); ctx.rotate(-a); ctx.translate(-px, -py);
    // the label sits on the inside of the arrow
    const m = Math.round(Math.hypot(o.x - me.x, o.y - me.y) / 40), label = (o.down ? 'DOWN · ' : '') + o.name + ' · ' + m + 'm';
    const lx = clamp(px - Math.cos(a) * 34, 50, W - 50), ly = clamp(py - Math.sin(a) * 28, 14, H - 14), tw = ctx.measureText(label).width + 10;
    ctx.fillStyle = 'rgba(8,10,13,0.7)'; ctx.fillRect(clamp(lx - tw / 2, 4, W - tw - 4), ly - 8, tw, 16);
    ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.fillText(label, clamp(lx, tw / 2 + 4, W - tw / 2 - 4), ly + 0.5);
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
// when the host's window is minimized the browser stops drawing frames; the run (and everyone's connection) keeps going
const netBg = { t: 0 };
setInterval(() => {
  if (!document.hidden || !NET.role) { netBg.t = 0; return; }
  const now = performance.now(), rdt = netBg.t ? Math.min(0.1, (now - netBg.t) / 1000) : 0.05; netBg.t = now;
  try { netTick(rdt); if (NET.role === 'host' && NET.started && G.mode === 'play') update(Math.min(0.05, rdt)); } catch (e) { perfError(e); }
}, 50);

/* ---------- down, not out ---------- */
function netDown() {
  const p = G.p; if (!p || p.down) return;
  p.down = true; p.hp = 0; p.rv = 0; p.dashT = 0; p.kvx = p.kvy = 0;
  if (G.grab) endGrab(false);
  SFX.death(); burst(p.x, p.y, 30, '#9e1c22', 200, 6, 0.8); shakeIt(12);
  banner("You're down", 'A teammate can revive you: they stand next to you');
}
// the whole team is down: the normal end screen, with the team's score
function netFinish(m) {
  const p = G.p; if (!p) return;
  G.score = m.sc; G.wave = m.w; G.kills = m.k; G.bestChain = Math.max(G.bestChain, m.bc || 0);
  p.down = false; p.cs.phoenix = 0; NET.finishing = true; G.mode = 'play'; p.iframe = 0;
  try { die(); } finally { NET.finishing = false; }
  if (G.lastEntry) G.lastEntry.co = m.n || 2;
  const ag = $('againBtn');
  if (NET.role === 'client') { ag.disabled = true; ag.textContent = 'Waiting for ' + NET.hostName; }
  NET.started = NET.role === 'client' ? false : NET.started;
  $('ovEyebrow').textContent = 'Co-op run over · ' + (m.n || 2) + ' players';
}

/* ---------- finding games on the Wi-Fi ---------- */
function netScan() {
  let list = [];
  try {
    if (window.ZCDesktop && window.ZCDesktop.lanScan) { window.ZCDesktop.lanScan().then(l => { NET.found = l || []; renderCoopFound(); }).catch(() => { }); return; }
    // the app passes on each host's announcement as it heard it; only the expected fields are kept
    if (window.ZCNative && window.ZCNative.lanScan) for (const f of JSON.parse(window.ZCNative.lanScan() || '[]')) {
      try {
        const m = typeof f.b === 'string' ? JSON.parse(f.b) : f; if (!m || m.zc !== 'lan' || !/^[\d.]{7,15}$/.test(f.ip)) continue;
        list.push({ ip: f.ip, port: (m.port | 0) || NET_PORT, name: ZCF.safe(String(m.name || '').slice(0, 20), 'Zombie City'), n: m.n | 0, max: m.max | 0, run: !!m.run });
      } catch (e) { }
    }
  } catch (e) { list = []; }
  NET.found = list; renderCoopFound();
}

/* ---------- the co-op screen ---------- */
function openCoop() {
  $('coop').hidden = false; $('coop').scrollTop = 0; renderCoop(); SFX.click();
  if (window.ZCDesktop && window.ZCDesktop.lanScanStart) window.ZCDesktop.lanScanStart();
  if (window.ZCNative && window.ZCNative.lanScanStart) try { window.ZCNative.lanScanStart(); } catch (e) { }
  NET.scanT = 0;
}
function closeCoop() {
  $('coop').hidden = true;
  if (window.ZCDesktop && window.ZCDesktop.lanScanStop) window.ZCDesktop.lanScanStop();
  if (window.ZCNative && window.ZCNative.lanScanStop) try { window.ZCNative.lanScanStop(); } catch (e) { }
}
function renderCoop() {
  const sec = $('coop'); if (!sec) return;
  const host = NET.role === 'host', cl = NET.role === 'client';
  // hosting
  const hc = $('coopHostCard'), hb = $('coopHostBtn'), hi = $('coopHostInfo');
  hc.classList.toggle('off', !netCan.host() || cl);
  $('coopHostNote').textContent = !netCan.host() ? 'Hosting needs the PC version of Zombie City (the Windows launcher). Phones and the web page can join a PC that hosts.'
    : cl ? 'You are in someone else’s game.' : host ? 'Your game is open. Tell the others to pick it from their list, or to type this address:' : 'Open a game on this PC that phones and other PCs on the same Wi-Fi can join. If Windows asks, allow Zombie City on private networks.';
  hb.hidden = host || cl || !netCan.host(); hb.disabled = NET.status === 'starting'; hb.textContent = NET.status === 'starting' ? 'Starting' : 'Start hosting';
  hi.hidden = !host;
  if (host) {
    $('coopAddr').textContent = (NET.ips[0] || 'this PC') + (NET.port !== NET_PORT ? ':' + NET.port : '');
    $('coopAddrMore').textContent = NET.ips.length > 1 ? 'Also: ' + NET.ips.slice(1).join(', ') : '';
    renderCoopLobby($('coopHostPlayers'));
    const st = $('coopStartBtn'); st.textContent = NET.started ? (G.mode === 'over' ? 'Play again' : 'Run in progress') : 'Start the run'; st.disabled = NET.started && G.mode !== 'over';
  }
  // joining
  const jc = $('coopJoinCard');
  jc.classList.toggle('off', host || !netCan.join());
  $('coopJoinNote').textContent = !netCan.join() ? 'This web page can’t join Wi-Fi games: browsers block secure pages from talking to devices on your network. Use the Android app or the PC launcher to join.'
    : host ? 'You are hosting.' : cl ? (NET.status === 'lobby' ? 'Connected to ' + NET.hostName + '’s game. Waiting for them to start the run.' : 'Joining') : NET.status === 'connecting' ? 'Connecting' : 'Pick a game from the list, or type the address the host sees on their screen.';
  $('coopJoinForm').hidden = host || cl || !netCan.join();
  $('coopFound').hidden = host || cl || !netCan.join() || !netCan.scan();
  const lob = $('coopLobby'); lob.hidden = !cl; if (cl) renderCoopLobby(lob);
  $('coopLeave').hidden = !(host || cl);
  $('coopLeave').textContent = host ? 'Stop hosting' : 'Leave the game';
  $('coopErr').textContent = NET.err || ''; $('coopErr').hidden = !NET.err;
  const ip = $('coopIp'); if (ip && !ip.value) ip.value = store.get('zc_lastip', '');
  renderCoopFound();
}
function renderCoopLobby(box) {
  box.textContent = '';
  const list = NET.lobby.length ? NET.lobby : [{ id: 1, name: getTag(), dev: DEV.kind, col: NET_COLS[0] }];
  for (const p of list) {
    const r = el('div', 'coop-pl' + (p.away ? ' away' : '')); r.style.setProperty('--tc', p.col || netCol(p.id));
    const you = p.id === NET.me && NET.role === 'client', ms = p.id === 1 ? (NET.role === 'client' ? NET.rtt : 0) : you ? NET.rtt : NET.pings.get(p.id) || p.ping || 0;
    r.append(devIcon(p.dev || 'kbm'), nameEl(p.name, p.acct, 'b'), el('em', null, p.away ? 'Reconnecting' : p.id === 1 ? 'Host' : you ? 'You' : ''), p.id === 1 && NET.role === 'host' ? el('span', 'ping host') : pingEl(ms));
    box.append(r);
  }
  for (let i = list.length; i < NET_MAX; i++) { const r = el('div', 'coop-pl empty'); r.append(el('b', null, 'Open slot')); box.append(r); }
}
function renderCoopFound() {
  const box = $('coopFound'); if (!box || box.hidden) return;
  const key = JSON.stringify(NET.found.map(f => [f.ip, f.port, f.n, f.run]));
  if (box.dataset.k === key) return; box.dataset.k = key;
  box.textContent = '';
  if (!NET.found.length) { box.append(el('p', 'coop-none', 'Looking for games on your Wi-Fi…')); return; }
  for (const f of NET.found) {
    const b = el('button', 'coop-game'); b.type = 'button';
    b.append(el('b', null, f.name || 'Zombie City'), el('span', null, f.ip + ' · ' + f.n + '/' + (f.max || 4) + ' players' + (f.run ? ' · run in progress' : '')));
    b.disabled = f.n >= (f.max || 4);
    b.addEventListener('click', () => netJoin(f.ip, f.port));
    box.append(b);
  }
}
// the pause menu's quick switch for the ping readout (the same as Settings > Gameplay > Show ping)
function netPingBtn() { const b = $('pausePing'); if (!b) return; b.hidden = !NET.started; b.textContent = 'Show ping: ' + (SET.netPing !== false ? 'on' : 'off'); }
$('pausePing').addEventListener('click', () => { setSetting('netPing', SET.netPing === false); netPingBtn(); $('hudTeam').dataset.k = ''; netHud(); SFX.click(); });
$('markBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); netMark(); });
$('coopBtn').addEventListener('click', openCoop);
$('coopClose').addEventListener('click', closeCoop);
$('coopHostBtn').addEventListener('click', netHost);
$('coopStartBtn').addEventListener('click', () => { if (NET.role === 'host') netHostRun(); });
$('coopLeave').addEventListener('click', () => { if (G.mode !== 'title' && G.p) toTitle(); else netLeave(); });
$('coopJoinForm').addEventListener('submit', e => { e.preventDefault(); netJoin($('coopIp').value); });
/* CORE v3: what co-op learns about the link. A teammate's game measures how often the host's snapshots really arrive
   and how much that wobbles (the jitter); it draws each zombie and teammate a little ahead along the way it was moving,
   by about as long as the next snapshot takes, and follows more softly on a jittery link. That is only how the
   joiner's screen shows things: the host still decides every position, hit and kill. What it learned about this
   network is kept, so the next game starts from it. */
function netSnapClock() {
  const t = performance.now();
  if (NET.snapAt) {
    const iv = t - NET.snapAt;
    if (iv > 5 && iv < 1000) { NET.ivMs = NET.ivMs ? NET.ivMs * 0.92 + iv * 0.08 : iv; const dv = Math.abs(iv - NET.ivMs); NET.jitMs = NET.jitMs != null ? NET.jitMs * 0.92 + dv * 0.08 : dv; }
    NET.snapDt = clamp(iv / 1000, 0.02, 0.4);
  } else {
    NET.snapDt = 0.066;
    if (typeof LEARN !== 'undefined' && LEARN.ready && CORE.by.NET) { const o = learnOwn('NET'); if (o.iv) { NET.ivMs = o.iv; NET.jitMs = o.jit || 0; } }
  }
  NET.snapAt = t;
  if (typeof LEARN !== 'undefined' && LEARN.ready && CORE.by.NET && t - (NET.learnT || 0) > 30000 && NET.ivMs) {
    NET.learnT = t; const o = learnOwn('NET'); o.iv = o.iv ? o.iv * 0.7 + NET.ivMs * 0.3 : NET.ivMs; o.jit = o.jit != null ? o.jit * 0.7 + (NET.jitMs || 0) * 0.3 : (NET.jitMs || 0); o.rtt = NET.rtt || o.rtt; learnDirty();
  }
}
// how fast something was moving between the last two snapshots (units a second, capped at a sprint)
function netVel(o, x, y) {
  if (o.tx == null || !(NET.snapDt > 0)) { o.nvx = o.nvy = 0; return; }
  o.nvx = clamp((x - o.tx) / NET.snapDt, -900, 900); o.nvy = clamp((y - o.ty) / NET.snapDt, -900, 900);
}
// how far ahead to draw (seconds): the time since the last snapshot, up to one snapshot interval plus twice the
// jitter, never more than 0.16 s, and nothing once the link has gone quiet for half a second
function netLead() {
  if (!NET.snapAt) return 0;
  const age = (performance.now() - NET.snapAt) / 1000; if (age > 0.5) return 0;
  return Math.min(0.16, age, ((NET.ivMs || 66) + 2 * (NET.jitMs || 0)) / 1000) * 0.85;
}
function netFollowK() { return clamp(14 - (NET.jitMs || 0) * 0.12, 9, 14); }
coreMeta('NET', { ver: 2, adapts: 'how a teammate\'s screen follows the host, by the link', provides: ['coop'], feats: { want: ['websocket'], without: 'co-op runs through the app instead (the Android app brings its own)' },
  learned: () => { const o = learnOwn('NET'); return o.iv ? ['On this network the host\'s snapshots arrive every ' + Math.round(o.iv) + ' ms with ' + Math.round(o.jit || 0) + ' ms of jitter' + (o.rtt ? ' and a ' + Math.round(o.rtt) + ' ms ping' : '') + '; a teammate\'s screen draws ' + Math.round(Math.min(160, (o.iv + 2 * (o.jit || 0))) * 0.85) + ' ms ahead to hide it.'] : ['Learns the link the first time this device joins a co-op game.']; },
  check: () => NET.started && NET.role === 'client' && NET.snapAt && !(NET.ivMs >= 0) ? 'its snapshot clock went bad' : '',
  repair: () => { NET.ivMs = 66; NET.jitMs = 0; NET.snapAt = 0; } });
