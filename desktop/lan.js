'use strict';
// Wi-Fi co-op relay for Zombie City. The PC that hosts runs this inside the Windows app: a tiny WebSocket server on the
// local network that passes messages between the host's game and up to three other players, and a UDP beacon so other
// devices on the same Wi-Fi can find the game without typing an address. It has no game logic of its own: the host's
// game runs the zombies and this only relays. No external modules; WebSocket framing is done by hand (RFC 6455).
const http = require('http'), crypto = require('crypto'), os = require('os'), dgram = require('dgram');

const BEACON_PORT = 47778, MAX_CLIENTS = 3, MAX_FRAME = 4 * 1024 * 1024;
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function frame(str, op) {
  const data = Buffer.from(str, 'utf8'), n = data.length; let h;
  if (n < 126) h = Buffer.from([0x80 | (op || 1), n]);
  else if (n < 65536) { h = Buffer.alloc(4); h[0] = 0x80 | (op || 1); h[1] = 126; h.writeUInt16BE(n, 2); }
  else { h = Buffer.alloc(10); h[0] = 0x80 | (op || 1); h[1] = 127; h.writeBigUInt64BE(BigInt(n), 2); }
  return Buffer.concat([h, data]);
}
class Peer {
  constructor(sock, id, role, info, onText, onClose) {
    this.sock = sock; this.id = id; this.role = role; this.info = info; this.buf = Buffer.alloc(0); this.parts = []; this.dead = false;
    this.onText = onText; this.onClose = onClose;
    sock.setNoDelay(true);
    sock.on('data', d => this.data(d));
    sock.on('close', () => this.close());
    sock.on('error', () => this.close());
  }
  data(d) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
    for (;;) {
      const b = this.buf; if (b.length < 2) return;
      const fin = b[0] & 0x80, op = b[0] & 15, masked = b[1] & 0x80; let len = b[1] & 127, off = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
      if (len > MAX_FRAME) { this.kill(); return; }
      const mk = masked ? 4 : 0; if (b.length < off + mk + len) return;
      let p = Buffer.from(b.subarray(off + mk, off + mk + len));
      if (masked) { const m = b.subarray(off, off + 4); for (let i = 0; i < p.length; i++) p[i] ^= m[i & 3]; }
      this.buf = b.subarray(off + mk + len);
      if (op === 8) { this.write(frame('', 8)); this.kill(); return; }
      if (op === 9) { this.write(Buffer.concat([Buffer.from([0x8a, p.length]), p.subarray(0, 125)])); continue; }
      if (op === 10) continue;
      if (op === 1 || op === 0) {
        this.parts.push(p);
        if (fin) { const s = Buffer.concat(this.parts).toString('utf8'); this.parts = []; this.onText(this, s); }
      }
    }
  }
  write(buf) { if (!this.dead) try { this.sock.write(buf); } catch (e) { this.close(); } }
  send(str) { this.write(frame(str)); }
  kill() { if (this.dead) return; try { this.sock.end(); this.sock.destroy(); } catch (e) { } this.close(); }
  close() { if (this.dead) return; this.dead = true; this.onClose(this); }
}

// the addresses other devices can reach this PC at (private IPv4 on Wi-Fi or Ethernet)
function lanAddresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) for (const a of list || []) {
    if (a.family !== 'IPv4' && a.family !== 4) continue; if (a.internal) continue;
    const ip = a.address; if (!/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.)/.test(ip)) continue;
    const ipn = ip.split('.').map(Number), mk = (a.netmask || '255.255.255.0').split('.').map(Number);
    out.push({ ip: ip, name: name, bcast: ipn.map((v, i) => (v & mk[i]) | (~mk[i] & 255)).join('.') });
  }
  out.sort((a, b) => (/wi-?fi|wlan|wireless/i.test(b.name) ? 1 : 0) - (/wi-?fi|wlan|wireless/i.test(a.name) ? 1 : 0) || (a.ip.startsWith('192.168.') ? -1 : 1));
  return out;
}

function createServer(opts) {
  opts = opts || {};
  const S = { port: 0, token: crypto.randomBytes(12).toString('hex'), host: null, clients: new Map(), nextId: 2, name: String(opts.name || 'Zombie City').slice(0, 20), players: 1, run: false, beacon: null, http: null };
  const clean = s => String(s || '').replace(/[^A-Za-z0-9 _.\-]/g, '').slice(0, 14);
  function toHost(str) { if (S.host) S.host.send(str); }
  function onText(peer, s) {
    if (peer.role === 'host') {
      const i = s.indexOf('|'); if (i < 0) return;
      const to = s.slice(0, i), msg = s.slice(i + 1);
      if (to === '*') { for (const c of S.clients.values()) c.send(msg); }
      else for (const id of to.split(',')) { const c = S.clients.get(+id); if (c) c.send(msg); }
      if (msg.startsWith('{"t":"kick"')) { const id = +to; const c = S.clients.get(id); if (c) setTimeout(() => c.kill(), 50); }
    } else toHost(peer.id + '|' + s);
  }
  function onClose(peer) {
    if (peer.role === 'host') { S.host = null; for (const c of S.clients.values()) { c.send('{"t":"end","why":"host"}'); c.kill(); } }
    else if (S.clients.get(peer.id) === peer) { S.clients.delete(peer.id); toHost('0|' + JSON.stringify({ t: 'leave', id: peer.id })); }
  }
  S.http = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('Zombie City Wi-Fi co-op server\n'); });
  S.http.on('upgrade', (req, sock) => {
    const key = req.headers['sec-websocket-key'], u = new URL(req.url, 'http://x'), remote = sock.remoteAddress || '';
    if (!key || req.headers.upgrade.toLowerCase() !== 'websocket') { sock.destroy(); return; }
    const isHost = u.searchParams.get('host') === S.token && /127\.0\.0\.1|::1|::ffff:127\.0\.0\.1/.test(remote);
    if (!isHost && (!S.host || S.clients.size >= MAX_CLIENTS)) { sock.end('HTTP/1.1 503 Busy\r\n\r\n'); return; }
    if (isHost && S.host) { sock.end('HTTP/1.1 409 Conflict\r\n\r\n'); return; }
    sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + crypto.createHash('sha1').update(key + GUID).digest('base64') + '\r\n\r\n');
    if (isHost) { S.host = new Peer(sock, 1, 'host', {}, onText, onClose); return; }
    const id = S.nextId++, info = { name: clean(u.searchParams.get('name')) || 'SURVIVOR', dev: clean(u.searchParams.get('dev')) || 'kbm', ver: clean(u.searchParams.get('ver')) };
    const p = new Peer(sock, id, 'client', info, onText, onClose);
    S.clients.set(id, p);
    toHost('0|' + JSON.stringify({ t: 'join', id: id, name: info.name, dev: info.dev, ver: info.ver, ip: remote.replace('::ffff:', '') }));
  });
  S.start = () => new Promise((resolve, reject) => {
    S.http.once('error', reject);
    S.http.listen(opts.port || 0, '0.0.0.0', () => {
      S.port = S.http.address().port;
      try {
        const u = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        u.on('error', () => { });
        u.bind(() => { try { u.setBroadcast(true); } catch (e) { } });
        S.beaconSock = u;
        S.beacon = setInterval(() => {
          const msg = Buffer.from(JSON.stringify({ zc: 'lan', v: 1, name: S.name, port: S.port, n: 1 + S.clients.size, max: 1 + MAX_CLIENTS, run: S.run }));
          const targets = new Set(['255.255.255.255']); for (const a of lanAddresses()) targets.add(a.bcast);
          for (const t of targets) try { u.send(msg, BEACON_PORT, t); } catch (e) { }
        }, 1000);
      } catch (e) { /* no beacon: players can still type the address */ }
      resolve({ port: S.port, token: S.token, ips: lanAddresses().map(a => a.ip) });
    });
  });
  S.stop = () => {
    clearInterval(S.beacon); S.beacon = null;
    try { S.beaconSock && S.beaconSock.close(); } catch (e) { }
    for (const c of S.clients.values()) c.kill(); S.clients.clear();
    if (S.host) S.host.kill();
    try { S.http.close(); } catch (e) { }
  };
  S.setInfo = (o) => { if (o.name) S.name = String(o.name).slice(0, 20); if (o.run != null) S.run = !!o.run; };
  return S;
}

// listening for other hosts' beacons, so the Join list fills itself in
function createScanner() {
  const found = new Map(); let sock = null;
  return {
    start() {
      if (sock) return;
      sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      sock.on('error', () => { try { sock.close(); } catch (e) { } sock = null; });
      sock.on('message', (buf, r) => {
        try { const m = JSON.parse(buf.toString('utf8')); if (m.zc !== 'lan') return; found.set(r.address + ':' + m.port, { ip: r.address, port: m.port | 0, name: String(m.name || '').slice(0, 20), n: m.n | 0, max: m.max | 0, run: !!m.run, at: Date.now() }); } catch (e) { }
      });
      try { sock.bind(BEACON_PORT); } catch (e) { }
    },
    list() { const now = Date.now(), out = []; for (const [k, v] of found) { if (now - v.at > 4000) found.delete(k); else out.push(v); } return out; },
    stop() { try { sock && sock.close(); } catch (e) { } sock = null; found.clear(); }
  };
}

module.exports = { createServer, createScanner, lanAddresses, BEACON_PORT };

// `node lan.js` runs a server on its own (used by the automated tests); it prints the port and host token
if (require.main === module) {
  const s = createServer({ name: process.argv[2] || 'Test host', port: +process.argv[3] || 0 });
  s.start().then(r => { console.log(JSON.stringify(r)); });
  process.on('SIGTERM', () => { s.stop(); process.exit(0); });
}
