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
  hits: [], zfx: [], shots: [], kills: [], evs: [], blastsDone: new Set(), cardsAt: 0, picked: new Set(), found: [], shotSfx: new Map()
};
const NET_PORT = 47777, NET_MAX = 4;
const NET_COLS = ['#f2cc3a', '#29e6ff', '#ff3df2', '#7dff4a'];
const NET_SK = ['acid', 'wisp', 'shard', 'spike', 'fire', 'ice', 'void', 'shock', 'spirit', 'web', 'bolt'];
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
  Object.assign(NET, { role: null, ws: null, me: 1, status: 'off', started: false, hold: 0, md: 0, local: null, finishing: false, hits: [], zfx: [], shots: [], kills: [], evs: [] });
  NET.peers.clear(); NET.others.clear(); NET.zmap.clear(); NET.picked.clear(); NET.blastsDone.clear(); NET.lobby = [];
  $('app').classList.remove('coop');
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
  let ws;
  const url = 'ws://' + host + ':' + prt + '/?name=' + encodeURIComponent(getTag()) + '&dev=' + DEV.kind + '&ver=' + encodeURIComponent(ZC_VERSION);
  try { ws = netNativeWs() ? new NativeWS(url) : new WebSocket(url); }
  catch (e) { NET.status = 'off'; NET.err = 'Could not connect to ' + host + '.'; renderCoop(); return; }
  NET.ws = ws; let opened = false;
  const giveUp = setTimeout(() => { if (!opened) { try { ws.close(); } catch (e) { } } }, 6000);
  ws.onopen = () => { opened = true; clearTimeout(giveUp); NET.role = 'client'; NET.status = 'joining'; renderCoop(); };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (err) { return; } try { netClientRecv(m); } catch (err) { perfError(err); } };
  ws.onclose = () => {
    clearTimeout(giveUp);
    if (!opened) { NET.ws = null; NET.status = 'off'; NET.err = 'Could not reach a game at ' + host + '. Check that the host is hosting, you are on the same Wi-Fi, and Windows allowed Zombie City through its firewall.'; renderCoop(); return; }
    if (NET.role === 'client') netEnd('Lost the connection to the host.');
  };
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
  for (const pr of NET.peers.values()) if (pr.p) out.push(pr.p);
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
  p.out = { h: [], dot: 0, heal: 0, fx: null, kv: [0, 0], rev: 0, heavy: 0 }; p.rv = 0; p.name = peer.name; p.col = peer.col;
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
      if (NET.peers.size >= NET_MAX - 1) { hostSend(m.id, { t: 'kick', why: 'The game is full.' }); return; }
      const used = new Set([1, ...Array.from(NET.peers.values()).map(p => p.slot)]); let slot = 2; while (used.has(slot)) slot++;
      const peer = { id: m.id, slot: slot, name: cleanTag(m.name), dev: m.dev || 'kbm', col: NET_COLS[slot - 1], p: null };
      NET.peers.set(m.id, peer);
      hostSend(m.id, { t: 'hello', id: m.id, slot: slot, host: getTag(), started: NET.started });
      netLobby(); toast('Co-op', peer.name + ' joined', peer.col); SFX.click();
      if (NET.started) netSendStart(m.id);
    } else if (m.t === 'leave') {
      const peer = NET.peers.get(m.id); if (!peer) return;
      NET.peers.delete(m.id); NET.picked.delete(m.id); netLobby();
      toast('Co-op', peer.name + ' left', '#8f959e');
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
      break;
    }
    case 'sh': netCosShot(from, m.x, m.y, m.a, m.w, m.n, m.s, m.r, m.sp); NET.shots.push([from, m.x, m.y, m.a, m.w, m.n, m.s, m.r, m.sp]); if (peer.p) peer.p.flashT = 0.05; break;
    case 'h':
      for (const h of m.h || []) {
        const z = NET.zmap.get(h[0]); if (!z || z.dead) continue;
        NET.lastHitBy = from; hurtZombie(z, Math.min(+h[1] || 0, 99999), { src: h[5] || 'bullet', crit: !!h[2], kx: +h[3] || 0, ky: +h[4] || 0 }); NET.lastHitBy = 1;
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
    case 'pick': NET.picked.add(from); netCheckPicks(); break;
    case 'bye': break;
  }
}
function netLobby() {
  NET.lobby = [{ id: 1, name: getTag(), dev: DEV.kind, col: NET_COLS[0] }].concat(Array.from(NET.peers.values()).map(p => ({ id: p.id, name: p.name, dev: p.dev, col: p.col })));
  hostSend('*', { t: 'lobby', pl: NET.lobby, started: NET.started });
  renderCoop();
}
function netSendStart(to) {
  hostSend(to, { t: 'start', seed: WORLD.lastSeed, mix: WORLD.mix, season: WORLD.season, wave: G.wave, wx: WX.kind, host: getTag(), x: Math.round((NET.local || G.p).x), y: Math.round((NET.local || G.p).y), mode: G.mode });
}
// the host presses Start: a normal run, and everyone else starts in the same city
function netHostRun() {
  if (NET.role !== 'host') return;
  NET.started = true; if (window.ZCDesktop && window.ZCDesktop.lanInfo) window.ZCDesktop.lanInfo({ run: true });
  for (const peer of NET.peers.values()) { peer.p = null; }
  $('coop').hidden = true;
  newRun();
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
// wave cleared: everyone picks a card, and the next wave starts once all have
function netCardsOpen() {
  NET.picked.clear(); NET.cardsAt = performance.now();
  for (const peer of NET.peers.values()) if (peer.p && peer.p.down) netRevive(peer.p, 0.5);
  if (G.p.down) netRevive(G.p, 0.5);
  hostSend('*', { t: 'cards', w: G.wave });
}
function netPicked() {
  if (NET.role === 'host') { NET.picked.add(1); netCheckPicks(); }
  else netSend({ t: 'pick' });
  $('upSub').textContent = 'Waiting for your team to pick';
  $('upGrid').classList.add('waiting');
}
function netCheckPicks() {
  if (NET.role !== 'host' || G.mode !== 'upgrade') return;
  const need = [1].concat(Array.from(NET.peers.values()).filter(p => p.p).map(p => p.id));
  const late = performance.now() - NET.cardsAt > 45000;
  if (!(need.every(id => NET.picked.has(id)) || (late && NET.picked.has(1)))) return;
  NET.picked.clear(); $('upGrid').classList.remove('waiting');
  showOv(null); startWave(G.wave + 1);
  hostSend('*', { t: 'go', w: G.wave });
}
function netTickHost(rdt) {
  if (!NET.started) return;
  NET.snapT -= rdt;
  if (NET.snapT <= 0) { NET.snapT = 1 / 15; netSnapshot(); }
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
    | (z.frozen && z.stun > 0 ? 256 : 0) | (z.burnT > 0 ? 512 : 0) | (z.poisonT > 0 ? 1024 : 0) | (z.slowT > 0 ? 2048 : 0) | (z.buffT > 0 ? 4096 : 0) | (z.warn > 0 ? 8192 : 0) | (z.st.fuse > 0 ? 16384 : 0) | (z.st.surgeT > 0 ? 32768 : 0);
}
const NUM = v => typeof v === 'number' && isFinite(v);
function plainNums(o) { const r = {}; if (!o) return r; for (const k in o) { const v = o[k]; if (NUM(v)) r[k] = Math.round(v * 100) / 100; else if (typeof v === 'boolean') r[k] = v; else if (Array.isArray(v) && v.length < 40 && v.every(NUM)) r[k] = v.map(x => Math.round(x * 10) / 10); } return r; }
function netSnapshot() {
  const r1 = v => Math.round(v);
  NET.zmap.clear();
  const zs = [];
  for (const z of G.zs) { if (z.dead) continue; NET.zmap.set(z.nid, z); zs.push([z.nid, z.m.id, r1(z.x), r1(z.y), r1(z.ang * 100), r1(clamp(z.hp / z.maxHp, 0, 1) * 1000), zFlags(z), r1(z.r * 10), z.shield > 1 ? r1(z.shield / z.shieldMax * 100) : 0]); }
  const b = G.boss && !G.boss.dead ? G.boss : null; let B = null;
  if (b) {
    B = { id: b.nid, ab2: b.abs[1] || '' };
    if (b.rb) { const rb = b.rb; B.rb = { d: rb.def.id, f: rb.form, s: rb.state, mv: rb.mv, t: Math.round(rb.t * 100) / 100, mut: Math.round(rb.mutT * 100) / 100, hide: !!rb.hide, al: rb.alpha, sh: rb.shieldT > 0 ? 1 : 0, roam: !!rb.roam, D: plainNums(rb.d), seg: rb.seg ? rb.seg.map(s => [r1(s[0]), r1(s[1])]) : null }; }
    if (b.snatch) B.sn = plainNums(b.snatch), B.sn.state = b.snatch.state;
  }
  const pl = netPlayers().map(p => [p.remote ? p.nid : 1, r1(p.x), r1(p.y), r1(p.aim * 100), r1(p.hp), r1(p.maxHp), p.down ? 1 : 0, p.dashT > 0 ? 1 : 0, p.weapon ? p.weapon.id : 0, r1((p.rv || 0) / 2.4 * 100), p.dashK || '', r1(p.walk * 10) % 10000]);
  const s = {
    t: 's', tm: Math.round(G.time * 100) / 100, w: G.wave, sc: G.score, k: G.kills, ch: G.chain, bc: G.bestChain, air: G.air || 0, md: ['play', 'upgrade', 'skull', 'pause', 'cine', 'over'].indexOf(G.mode),
    wx: WX.kind, ss: WORLD.season, warp: G.warpT > 0 ? 1 : 0, z: zs, B: B, pl: pl,
    e: G.eshots.filter(q => !q.dead).slice(0, 160).map(q => [r1(q.x), r1(q.y), r1(q.vx), r1(q.vy), NET_SK.indexOf(q.k), q.r]),
    hz: G.haz.slice(0, 60).map(h => [NET_HK.indexOf(h.k), r1(h.x), r1(h.y), r1(h.r), Math.round(h.life * 10) / 10, h.max]),
    pk: G.picks.filter(k => !k.dead).map(k => [r1(k.x), r1(k.y), Math.round(k.life * 10) / 10]),
    bl: G.blasts.slice(0, 40).map(q => [q.nid || (q.nid = ++NET.zid), r1(q.x), r1(q.y), r1(q.r), Math.round(q.t * 100) / 100, q.max, q.kind || '', q.col || '', q.haz || ''])
  };
  if (NET.kills.length) { s.kl = NET.kills; NET.kills = []; }
  if (NET.shots.length) { s.sh = NET.shots; NET.shots = []; }
  if (NET.evs.length) { s.ev = NET.evs; NET.evs = []; }
  hostSend('*', s);
}

/* ---------- a teammate's game (client) ---------- */
function netClientRecv(m) {
  switch (m.t) {
    case 'hello': NET.me = m.id; NET.slot = m.slot; NET.hostName = cleanTag(m.host); NET.status = 'lobby'; $('app').classList.add('coop'); renderCoop(); break;
    case 'lobby': NET.lobby = (m.pl || []).map(p => Object.assign({}, p, { name: cleanTag(p.name) })); renderCoop(); break;
    case 'kick': NET.err = m.why || 'The host closed the door.'; netLeave(); break;
    case 'end': netEnd('The host ended the game.'); break;
    case 'start': netClientStart(m); break;
    case 's': if (NET.started) netApply(m); break;
    case 'u': if (NET.started) netYou(m); break;
    case 'cards': if (NET.started && G.mode === 'play' && G.p) { G.eshots = []; if (G.p.down) netYouRevive(Math.round(G.p.maxHp * 0.5)); SFX.waveClear(); openCards(); } break;
    case 'go': if (NET.started) { $('upGrid').classList.remove('waiting'); if (G.mode === 'upgrade') showOv(null); G.wave = m.w; G.mode = 'play'; SFX.waveStart(m.w % 5 === 0); banner('Wave ' + m.w, m.w % 5 === 0 ? 'A boss is coming' : 'Hold the line'); } break;
    case 'over': if (NET.started) netFinish(m); break;
  }
}
function netClientStart(m) {
  NET.started = true; NET.hostName = m.host ? cleanTag(m.host) : NET.hostName; NET.zmap.clear(); NET.others.clear(); NET.blastsDone.clear();
  $('coop').hidden = true;
  newRun({ client: true, world: { seed: m.seed, mix: m.mix, season: m.season }, wave: m.wave, at: { x: m.x, y: m.y } });
  WX.kind = m.wx || WX.kind; WX.t = 999;
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
  NET.md = s.md; NET.hold = s.md === 2 || s.md === 3 || s.md === 4 ? s.md : 0;
  G.wave = s.w; G.score = s.sc; G.kills = s.k; G.bestChain = Math.max(G.bestChain, s.bc || 0);
  if (s.ch > G.chain || (s.ch && s.ch < G.chain)) G.lastKill = G.time;
  G.chain = s.ch; G.air = s.air; G.warpT = s.warp ? 0.2 : 0;
  if (s.wx && WX.kind !== s.wx) WX.kind = s.wx; WX.t = 999;
  if (s.ss != null && WORLD.season !== s.ss) setSeason(s.ss, true);
  // zombies: move the ones we have toward where the host has them, make new ones, drop the gone ones
  const seen = new Set();
  for (const e of s.z) {
    let z = NET.zmap.get(e[0]);
    if (!z || z.dead) { z = netMakePuppet(e, s.B); if (!z) continue; }
    seen.add(e[0]);
    z.tx = e[2]; z.ty = e[3]; z.tang = e[4] / 100; z.hp = e[5]; const f = e[6];
    if (Math.hypot(z.tx - z.x, z.ty - z.y) > 260) { z.x = z.tx; z.y = z.ty; }
    z.r = e[7] / 10; z.st.under = !!(f & 32); z.st.down = f & 64 ? 1 : 0; z.st.phased = !!(f & 128);
    z.frozen = f & 256 ? 1 : 0; z.stun = f & 256 ? 0.2 : 0; z.burnT = f & 512 ? 1 : 0; z.poisonT = f & 1024 ? 1 : 0; z.slowT = f & 2048 ? 0.2 : 0; z.buffT = f & 4096 ? 1 : 0;
    z.warn = f & 8192 ? 0.2 : 0; z.st.fuse = f & 16384 ? 0.3 : 0; z.st.surgeT = f & 32768 ? 1 : 0;
    if (e[8]) { z.shieldMax = z.shieldMax || 100; z.shield = e[8] / 100 * z.shieldMax; } else z.shield = 0;
    z.kvx = z.kvy = 0; z.slowMul = 1; z.burnDps = z.poisonDps = 0;
    z.nb = [z.burnT, z.poisonT, z.slowT, z.stun];
  }
  for (const k of s.kl || []) { const z = NET.zmap.get(k[0]); if (z && !z.dead) netKillFx(z, k[1]); }
  for (const z of G.zs) if (!z.dead && z.puppet && !seen.has(z.nid)) { z.dead = true; NET.zmap.delete(z.nid); }
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
    const info = NET.lobby.find(l => l.id === id); o.name = info ? info.name : 'SURVIVOR'; o.col = info && info.col ? info.col : netCol(id);
    o.tx = q[1]; o.ty = q[2]; o.aim = q[3] / 100; o.hp = q[4]; o.maxHp = q[5]; o.down = !!q[6]; o.dashT = q[7] ? 0.1 : 0; o.weapon = WEAPONS[q[8]] || o.weapon; o.rv = q[9] / 100 * 2.4; o.dashK = q[10] || 'sprint'; o.walk = q[11] / 10;
    if (Math.hypot(o.tx - o.x, o.ty - o.y) > 260) { o.x = o.tx; o.y = o.ty; }
  }
  for (const id of Array.from(NET.others.keys())) if (!live.has(id)) NET.others.delete(id);
  for (const q of s.sh || []) if (q[0] !== NET.me) { netCosShot(q[0], q[1], q[2], q[3], q[4], q[5], q[6], q[7], q[8]); const o = NET.others.get(q[0]); if (o) o.flashT = 0.05; }
  for (const e of s.ev || []) if (e[0] === 'air' && e[5] !== NET.me) { launchStrafe(e[1], e[2], e[3], { mini: !!e[4], cos: true }); if (!e[4]) { SFX.radio(); SFX.a10Jet(2.8); banner('A-10 inbound', 'Danger close'); } }
}
// a puppet zombie the host says is dead: blood, the specimen log, and the boss's end
function netKillFx(z, by) {
  z.dead = true; NET.zmap.delete(z.nid);
  const m = z.m, gore = m.S.gore;
  if (z.illusion) { burst(z.x, z.y, 10, '#efe9dc', 120, 4, 0.4); return; }
  burst(z.x, z.y, z.boss ? 40 : z.fly ? 3 : 10, gore, z.boss ? 260 : 150, z.fly ? 2 : 5, 0.6);
  if (!z.fly) { splat(z.x, z.y, z.r * rand(0.9, 1.4), gore); netChainFx(); }
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
  const p = G.p;
  if (!NET.hold) updPlayer(dt);
  else if (p) { p.fireCd -= dt; }
  const k = Math.min(1, dt * 14);
  for (const z of G.zs) {
    if (z.dead) continue;
    z.x += (z.tx - z.x) * k; z.y += (z.ty - z.y) * k; z.ang = angLerp(z.ang, z.tang, k); z.flash = Math.max(0, z.flash - dt);
    if (z.illusion) z.life = 1;
  }
  for (const o of NET.others.values()) { o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k; if (o.flashT > 0) o.flashT -= dt; }
  for (const s of G.eshots) { s.x += s.vx * dt; s.y += s.vy * dt; }
  for (const h of G.haz) h.life -= dt;
  for (const q of G.picks) q.life -= dt;
  buildGrid();
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
function netHit(z, dmg, o) {
  if (z.dead) return false;
  NET.hits.push([z.nid, Math.round(dmg * 10) / 10, o.crit ? 1 : 0, Math.round(o.kx || 0), Math.round(o.ky || 0), o.src && o.src !== 'bullet' ? o.src : 0]);
  z.flash = 0.09;
  if (o.crit) G.texts.push({ x: z.x + rand(-6, 6), y: z.y - z.r, t: 0, life: 0.6, s: String(Math.round(dmg)), c: '#f2cc3a' });
  return true;
}
function netTickClient(rdt) {
  if (!NET.started || !G.p || NET.ws.readyState !== 1) return;
  NET.sendT -= rdt;
  if (NET.hits.length) { netSend({ t: 'h', h: NET.hits }); NET.hits = []; }
  if (NET.zfx.length) { netSend({ t: 'zf', f: NET.zfx }); NET.zfx = []; }
  if (NET.sendT <= 0) {
    NET.sendT = 1 / 20; const p = G.p;
    netSend({ t: 'p', x: Math.round(p.x), y: Math.round(p.y), a: Math.round(p.aim * 100) / 100, hp: Math.round(p.hp), mh: Math.round(p.maxHp), dn: p.down ? 1 : 0, d: p.dashT > 0 ? 1 : 0, dk: p.dashK, w: p.weapon.id, wk: Math.round(p.walk * 10) / 10 });
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
  const m = { t: 'sh', x: Math.round(x), y: Math.round(y), a: Math.round(a * 1000) / 1000, w: w.id, n: n, s: Math.round(S.speed), r: Math.round(S.range), sp: Math.round(S.spread * 1000) / 1000 };
  if (NET.role === 'client') netSend(m); else NET.shots.push([1, m.x, m.y, m.a, m.w, m.n, m.s, m.r, m.sp]);
}
function netCosShot(pid, x, y, a, wid, n, spd, rng, spr) {
  const w = WEAPONS[wid] || WEAPONS[0]; n = clamp(n | 0, 1, 12); spd = spd || w.speed; rng = rng || w.range;
  if (G.bullets.length > 600) return;
  const cone = w.F.key === 'shotgun' || w.kind === 'flame', gap = 0.11 * Math.min(1, 6 / Math.max(1, n));
  for (let i = 0; i < n; i++) {
    let ang = a; if (n > 1) ang += cone ? (i / (n - 1) - 0.5) * spr : (i - (n - 1) / 2) * gap;
    ang += rand(-1, 1) * (w.kind === 'flame' ? spr * 0.5 : spr * 0.35);
    const sp = spd * (w.kind === 'flame' ? rand(0.75, 1.15) : 1), life = rng / sp;
    G.bullets.push({ cos: true, x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: life, max: life, kind: w.kind, col: w.color, dmg: 0, pierce: 0, bounce: 0, split: 0, hit: null });
  }
  const now = performance.now(), last = NET.shotSfx.get(pid) || 0;
  if (now - last > 110 && G.p && Math.hypot(x - G.p.x, y - G.p.y) < 700) { NET.shotSfx.set(pid, now); SFX.shot(w.F.key, w.M.key); }
}
function netCosBullet(b, dt) {
  b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
  if (b.life <= 0 || pointInRect(b.x, b.y)) { b.dead = true; return; }
  if (b.kind === 'flame') return;
  near(b.x, b.y, 40, z => { if (b.dead || z.dead || Math.hypot(z.x - b.x, z.y - b.y) > z.r + 3) return; b.dead = true; burst(b.x, b.y, 2, z.m.S.gore, 80, 3, 0.25); return false; });
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
  ctx.font = "12px 'Share Tech Mono', monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const name = o.name || 'SURVIVOR', w = ctx.measureText(name).width + 12;
  ctx.fillStyle = 'rgba(8,10,13,0.72)'; ctx.fillRect(o.x - w / 2, o.y - 40, w, 16);
  ctx.fillStyle = col; ctx.fillRect(o.x - w / 2, o.y - 40, 2, 16); ctx.fillText(name, o.x + 1, o.y - 31.5);
  if (o.maxHp && !o.down) { const f = clamp(o.hp / o.maxHp, 0, 1); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(o.x - 16, o.y - 22, 32, 3); ctx.fillStyle = f > 0.35 ? '#7bd88a' : '#e5484d'; ctx.fillRect(o.x - 16, o.y - 22, 32 * f, 3); }
}
function netDrawPlayers() {
  if (!NET.started) return;
  if (NET.role === 'host') { for (const peer of NET.peers.values()) if (peer.p) netDrawOne(peer.p, false); }
  else for (const o of NET.others.values()) netDrawOne(o, false);
  if (G.p) { const me = G.p; me.col = netCol(NET.role === 'host' ? 1 : (NET.slot || NET.me)); if (me.down) netDrawOne(me, true); else { ctx.strokeStyle = hexA(me.col, 0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(me.x, me.y + 4, 17, 13, 0, 0, TAU); ctx.stroke(); } }
}
// the team on the HUD, under your name
function netHud() {
  const box = $('hudTeam'); if (!box) return;
  const rows = NET.role === 'host' ? Array.from(NET.peers.values()).filter(p => p.p).map(p => ({ name: p.name, col: p.col, hp: p.p.hp, mh: p.p.maxHp, down: p.p.down }))
    : Array.from(NET.others.values()).map(o => ({ name: o.name, col: o.col, hp: o.hp, mh: o.maxHp, down: o.down }));
  const key = rows.map(r => r.name + (r.down ? 'D' : Math.round(clamp(r.hp / (r.mh || 1), 0, 1) * 20))).join('|') + NET.hold;
  if (box.dataset.k === key) return; box.dataset.k = key;
  box.textContent = '';
  for (const r of rows) {
    const d = el('div', 'tm' + (r.down ? ' down' : '')); d.style.setProperty('--tc', r.col);
    const bar = el('i'); const fill = el('s'); fill.style.width = (r.down ? 0 : clamp(r.hp / (r.mh || 1), 0, 1) * 100) + '%'; bar.append(fill);
    d.append(el('b', null, r.name), bar, el('em', null, r.down ? 'DOWN' : Math.max(0, Math.round(r.hp)) + ''));
    box.append(d);
  }
  if (NET.hold) box.append(el('div', 'tm-hold', NET.hold === 2 ? 'The skull is with ' + NET.hostName : NET.hold === 3 ? NET.hostName + ' paused the game' : 'Boss incoming'));
  box.hidden = !rows.length && !NET.hold;
}

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
    const r = el('div', 'coop-pl'); r.style.setProperty('--tc', p.col || netCol(p.id));
    r.append(devIcon(p.dev || 'kbm'), el('b', null, p.name), el('em', null, p.id === 1 ? 'Host' : p.id === NET.me && NET.role === 'client' ? 'You' : ''));
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
$('coopBtn').addEventListener('click', openCoop);
$('coopClose').addEventListener('click', closeCoop);
$('coopHostBtn').addEventListener('click', netHost);
$('coopStartBtn').addEventListener('click', () => { if (NET.role === 'host') netHostRun(); });
$('coopLeave').addEventListener('click', () => { if (G.mode !== 'title' && G.p) toTitle(); else netLeave(); });
$('coopJoinForm').addEventListener('submit', e => { e.preventDefault(); netJoin($('coopIp').value); });
