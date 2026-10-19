/* ================= the maintenance screen: a construction site =================
   While the game is shut for an update, the maintenance card shows the crew building it. The workers are jointed
   puppets that shamble, breathe, blink (one eye wanders) and wear springy hard hats, and each has a running gag:
   the hammerer smashes his thumb, Kevin's plank bonks Gary the crispy flagger, the welder bonks the fine zombie back
   down when he sits up to wave, the napper's snot bubble pops, someone peeks out of the porta-potty, the wheelbarrow
   hits a bump, and a crow lands on the crane's sign. The foreman skull laughs at each one.
   The skull is the foreman: he wears a hard hat, talks through 100 lines (24 of them hints about what's coming) and
   says so when it's done, just before the city opens again. Tap him for the next line.
   The hints you've seen are counted on this device. The progress bar is made up, and says so.
   Nothing here runs unless the card is showing; with reduced motion the scene holds still and the lines just change. */
const MaintScene = (function () {
  const NEXT = '2.0';
  // 24 hints about the next big update
  const HINTS = [
    'Five classes. Five ways to survive the city. Choose wisely.',
    'One of the new classes only knows one direction: forward. Fast, loud and very sharp.',
    'Somebody keeps building walls out of riot shields. Says it\'s for "holding the line".',
    'One of the survivors showed up with a toolbox. I didn\'t ask what it builds. I\'m scared to.',
    'Someone on site keeps patching up the crew. Finally, a use for all these bandages.',
    'One of the five classes doesn\'t use guns. Their hands glow. HR is looking into it.',
    'Attack. Defense. Engineer. Medic. Magic. You didn\'t hear it from me.',
    'A full squad might want one of each class. Just saying.',
    'New faces are moving into the city. Not all of them are zombies. Yet.',
    'We\'re casting new characters. Survivors only. Pulse required.',
    'Every survivor has a story now. Some of them even have names.',
    'One of the new characters refused to wear the hard hat. Said it ruins the look.',
    'Weapon mod cards: slot one in and watch your gun get ideas.',
    'Character mod cards are coming. Your survivor is about to get a lot more... you.',
    'Found a stack of cards in the office. Some are for weapons. Some are for people. All of them are shiny.',
    'Collect the cards. Mix the cards. Break the game a little. We\'ll allow it.',
    'Some combinations of mod cards should probably be illegal.',
    'The crew is teaching everyone to move properly. Running, shooting, falling apart: all smoother.',
    'New animations are coming. The zombies have been practising their shamble in the mirror.',
    'The map designers have been up all night. The city won\'t look the same.',
    'New map designs: more places to hide. More places to get cornered.',
    'Someone asked the architects for "a better city". They took it personally.',
    'Something new was spotted at the edge of the city. It might not be a zombie.',
    'The zombies might not be the only ones out there for much longer.'
  ];
  // 76 jokes and crew talk (the first one always opens)
  const JOKES = [
    'Welcome to the construction site. I\'m the foreman. Tap me if I\'m boring you.',
    'It\'ll be done when it\'s done. Then it\'ll be done-er.',
    'Working on a fine zombie. Very fine. Hand-stitched.',
    'Please do not feed the construction crew. They bite.',
    'Hard hats required. Brains optional.',
    'Our workers are in a union. The union is the undead.',
    'Lunch break is two hours. Lunch is whoever walks by.',
    'We hired more workers. They used to be the old workers.',
    'Measure twice, cut once, bite three times.',
    'The welder says he\'s almost done. He\'s been saying that since 1.9.925.',
    'This progress bar is for emotional support only.',
    'I have no body. That\'s why I\'m management.',
    'I\'d lend a hand, but I don\'t have any.',
    'I\'m the head of this operation. Literally. Just the head.',
    'Do not tap the glass. The zombies are concentrating.',
    'Safety first. Safety second. Safety is the zombie on bench three.',
    'One worker dropped his arm in the cement. We\'re calling it a feature.',
    'The crane operator is new. Also dead. Mostly dead.',
    'The coffee machine is broken. Morale is at an all-time undead.',
    'We ran out of nails. Using teeth now.',
    'Somebody left a brain in the microwave again.',
    'The workers asked for a raise. We raised them. From the dead.',
    'Day 1: going great. Day 2: someone ate the blueprints.',
    'The blueprints were delicious, apparently.',
    'Current status: hammering. Loudly. With enthusiasm.',
    'Our quality inspector only has one eye, but it\'s a really good eye.',
    'This update is 40% code, 30% coffee and 30% screaming.',
    'Zombies make terrible electricians. Ask Gary. Actually, don\'t. Gary is crispy now.',
    'Gary\'s back. Gary\'s always back. That\'s kind of the whole problem with Gary.',
    'Every time you refresh, a worker loses a finger. Not really. Probably.',
    'Building a better apocalypse, one shamble at a time.',
    'Please hold. Your apocalypse is important to us.',
    'Your saves are safe. We locked them in the bone vault.',
    'The crew is on schedule. The schedule is on fire.',
    'Estimated time remaining: yes.',
    'Reticulating spleens...',
    'Sharpening teeth...',
    'Polishing bones...',
    'Counting zombies. Lost count. Starting over.',
    'Rotting... rotting... almost rotten enough.',
    'Calibrating the shamble...',
    'Defrosting the freezer zombies...',
    'Teaching the zombies to moan in harmony...',
    'Repainting the blood. Red was getting old. We kept it red.',
    'Installing extra doors for dramatic slamming.',
    'Adding more fog. You can never have enough fog.',
    'Testing new screams. The neighbours have complained.',
    'The new guy asked about dental. We all laughed. With our teeth.',
    'A body has 206 bones. This site has about 1,400. Don\'t ask.',
    'Somebody put a hard hat on a zombie and now he thinks he\'s the boss. Wait.',
    'Union rule 12: no eating coworkers during business hours.',
    'Union rule 13: after business hours is a grey area.',
    'The game is closed. The zombies didn\'t get the memo. They ate the memo.',
    'Watch your step. Watch your back. Watch your neck especially.',
    'Our generator runs on screams. Very renewable.',
    'Note from the foreman: whoever keeps stealing the left arms, stop.',
    'Lost and found: one jaw, slightly used. Ask at the front desk.',
    'You want it fast or you want it good? We\'re zombies, so: slow and good.',
    'While you wait, practise your aim on a pillow. Pillows rarely bite.',
    'The update is coming along like a zombie: slowly, but it will get there.',
    'We\'d give you a date, but the last guy who gave a date got eaten.',
    'Brains were harmed in the making of this update.',
    'Noise complaint received. Responded with more noise.',
    'The crew voted on a name for the update. "Two Point Oh No" lost narrowly.',
    'Out of duct tape. Using caution tape. Same thing, more yellow.',
    'This is a hard hat zone. That means you, Kevin.',
    'Kevin is a zombie. Kevin cannot read signs. We tell him anyway.',
    'Do not lick the wet paint. We know it was you, Kevin.',
    'Pouring the concrete. Hopefully nobody falls in this time.',
    'Still faster than the DMV.',
    'Every bolt hand-tightened by a guy with three fingers.',
    'Almost done! (This message has been here since the start.)',
    'The guy on the crate is not dead. Well. He is. But he\'s also asleep.',
    'The fine zombie on the bench keeps waving at you. He thinks you\'re his ride.',
    'We tried turning it off and on again. It got up and walked away.',
    'If you hear hammering, that\'s us. If you hear chewing, that\'s also us.'
  ];
  const STAGES = ['Pouring concrete', 'Welding', 'Stitching zombies', 'Hammering', 'Painting blood', 'Testing screams', 'Wiring the city', 'Tightening bolts', 'Fogging the streets', 'Waking the crew'];
  const DONE_LINE = 'It\'s done! The city is open. Go on, get out of here.';
  const KEY = 'zc_mhints';
  const reduce = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const el = id => document.getElementById(id);
  let on = false, finishing = false, deck = [], at = 0, msgT = 0, typeT = 0, raf = 0, last = 0, t = 0;
  let W = 0, H = 0, dpr = 1, cv = null, cx = null, sky = null, prog = 0, progHold = 0, stage = 0;
  let seen = [];
  try { seen = JSON.parse(localStorage.getItem(KEY) || '[]') || []; if (!Array.isArray(seen)) seen = []; } catch (e) { seen = []; }

  function buildDeck() {
    const all = HINTS.map((s, i) => ({ s, hint: i })).concat(JOKES.slice(1).map(s => ({ s, hint: -1 })));
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const k = all[i]; all[i] = all[j]; all[j] = k; }
    // a hint you haven't seen comes second, so the first visit already gets one
    const fresh = all.findIndex(m => m.hint >= 0 && seen.indexOf(m.hint) < 0), h = fresh >= 0 ? fresh : all.findIndex(m => m.hint >= 0);
    if (h > 0) all.unshift(all.splice(h, 1)[0]);
    deck = [{ s: JOKES[0], hint: -1 }].concat(all); at = 0;
  }
  function hintCount() {
    const n = seen.length, c = el('mHints'); if (!c) return;
    c.textContent = n >= HINTS.length ? 'All ' + HINTS.length + ' hints found. You know too much.' : 'Hints found: ' + n + ' / ' + HINTS.length;
  }
  function say(m) {
    clearTimeout(msgT); clearInterval(typeT);
    const line = el('mLine'), sr = el('mSr'), tag = el('mTag'), sk = el('mSkull'), bub = el('mBubble');
    if (!line) return;
    const hint = m.hint >= 0;
    tag.hidden = !hint; bub.classList.toggle('hint', hint); sk.classList.toggle('hint', hint);
    if (hint && seen.indexOf(m.hint) < 0) { seen.push(m.hint); try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) { } hintCount(); }
    sr.textContent = (hint ? 'Hint: ' : '') + m.s;
    bub.classList.remove('pop'); void bub.offsetWidth; bub.classList.add('pop');
    const hold = Math.max(4800, m.s.length * 62) + (hint ? 1800 : 0);
    if (reduce()) { line.textContent = m.s; msgT = setTimeout(next, hold + 2500); return; }
    let n = 0; line.textContent = ''; sk.classList.add('talk');
    typeT = setInterval(() => {
      n = Math.min(m.s.length, n + 2); line.textContent = m.s.slice(0, n);
      if (n >= m.s.length) { clearInterval(typeT); sk.classList.remove('talk'); if (!finishing) msgT = setTimeout(next, hold); }
    }, 45);
  }
  function next() {
    if (!on || finishing) return;
    if (at >= deck.length) buildDeck();
    say(deck[at++]);
  }

  /* ---------- the scene ----------
     Everything is drawn on a 640-wide stage (560 on narrow phones, cropped at the sides) and scaled to the canvas.
     GY is the ground line. Workers are jointed puppets: rig() draws legs, torso, arms and head from a pose, and each
     worker's own update decides the pose and runs its gag. */
  const OUT = '#16110f';
  const rnd = Math.random;
  const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const lerp = (a, b, u) => a + (b - a) * u;
  let VW = 640, VX = 0, VIS = 640, K = 1, VH = 256, GY = 232, S = null;
  const FX = { sparks: [], puffs: [], words: [], bones: [] };
  function shade(h, f) { const n = parseInt(h.slice(1), 16); return 'rgb(' + Math.min(255, ((n >> 16) & 255) * f | 0) + ',' + Math.min(255, ((n >> 8) & 255) * f | 0) + ',' + Math.min(255, (n & 255) * f | 0) + ')'; }
  function mkZ(o) {
    const z = Object.assign({ x: 0, y: 0, dir: 1, sc: 1, skin: '#7f9a6a', shirt: '#4b5a63', vest: '#ff8a1a', pants: '#2f3a4d', hy: 0, hv: 0, hatOn: true, seed: rnd() * 10, bt: -9, blinkAt: rnd() * 3, dizzy: 0, flies: false }, o);
    z.skinD = shade(z.skin, 0.78); z.shirtD = shade(z.shirt, 0.72); z.pantsD = shade(z.pants, 0.7); z.vestD = shade(z.vest, 0.82);
    return z;
  }
  function newScene() {
    S = {
      ham: mkZ({ x: 48, skin: '#86a173', shirt: '#5a4a63', hp: 0, ouch: 0, nextOuch: 8 + rnd() * 6, hits: 0 }),
      kev: mkZ({ x: 260, dir: 1, sc: 0.9, skin: '#8fa36b', shirt: '#3f5f6e', walk: 0, turn: 0, flipped: false, turns: 1, q: 0, flies: true }),
      gary: mkZ({ x: 478, dir: -1, skin: '#5f6e4c', shirt: '#6b4a3a', crispy: true, flip: 0, sign: 0, flipAt: 5, flies: true, wisp: 0 }),
      bar: mkZ({ x: 150, dir: 1, sc: 1, skin: '#6f8f7d', shirt: '#55606b', walk: 0, tray: 0, trayV: 0 }),
      wel: mkZ({ x: 370, dir: -1, skin: '#7d9168', shirt: '#4a4f5a', vest: '#e8681a', mask: 1, wipe: 0, wipeAt: 6 + rnd() * 4 }),
      bench: { z: mkZ({ skin: '#86a271', shirt: '#6d4a7a', hatOn: false }), ph: 'lie', pt: 0, up: 0, next: 7 + rnd() * 5, stars: 0, wrench: 0 },
      nap: mkZ({ x: 520, skin: '#8a9a7c', shirt: '#4a5568', popAt: 10 + rnd() * 6, lastPop: 0, awake: 0 }),
      potty: { z: mkZ({ skin: '#93a06a', shirt: '#6a6a40' }), ph: 'shut', pt: 0, o: 0, next: 4 + rnd() * 5, shake: 0 },
      crow: { st: 'away', pt: 0, next: 9 + rnd() * 6, x: 0, y: 0, x0: 0, y0: 0 },
      op: mkZ({ skin: '#7f9a6a' }),
      bats: { t0: -99, next: 3 + rnd() * 5 },
      sign: { x: 360, y: 80, a: 0 }
    };
    S.bar.bones = [0, 1, 2, 3, 4].map(i => ({ ox: 24 + i * 4.6, oy: 0, vy: 0, r: (i - 2) * 0.5, vr: 0, sk: i === 2 }));
    S.wins = [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ x: 40 + i * 74 + rnd() * 30, y: rnd(), on: rnd() < 0.6, at: rnd() * 4 }));
    FX.sparks = []; FX.puffs = []; FX.words = [];
  }
  function word(s, x, y, col, size) { FX.words.push({ s, x, y, col: col || '#f2cc3a', size: size || 12, t: 0, life: 1.15, rot: (rnd() - 0.5) * 0.4 }); }
  function pop(z, v) { z.hv = v; }
  let laughT = 0;
  function laugh() {
    const sk = el('mSkull'); if (!sk || finishing || sk.classList.contains('talk')) return;
    sk.classList.add('laugh'); clearTimeout(laughT); laughT = setTimeout(() => sk.classList.remove('laugh'), 1100);
  }

  function size() {
    if (!cv) return;
    const w = cv.clientWidth || 300, short = innerHeight < 520;
    const h = Math.round(Math.max(140, short ? Math.min(innerHeight * 0.5, w * 0.48) : Math.min(250, w * (w < 520 ? 0.52 : 0.385))));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w === W && h === H && cv.width === Math.round(w * dpr)) return;
    W = w; H = h; cv.style.height = h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    // fit the stage across (cropping a little on narrow phones) and make sure the crane fits top to bottom
    VW = w < 480 ? 560 : 640; K = Math.min(W / VW, H / 236); VIS = W / K; VX = (640 - VIS) / 2; VH = H / K; GY = VH - 22;
    sky = null;
  }

  // the sky, the moon and the skyline behind the site, drawn once per size (the same city every time)
  function drawSky() {
    sky = document.createElement('canvas'); sky.width = cv.width; sky.height = cv.height;
    const c = sky.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, sky.height); g.addColorStop(0, '#0d1219'); g.addColorStop(0.55, '#1a1a22'); g.addColorStop(0.86, '#3a2620'); g.addColorStop(1, '#1b1915');
    c.fillStyle = g; c.fillRect(0, 0, sky.width, sky.height);
    c.setTransform(dpr * K, 0, 0, dpr * K, -VX * dpr * K, 0);
    let r = 11; const rr = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    const x0 = VX - 12, x1 = VX + VIS + 12;
    for (let i = 0; i < 80; i++) { c.fillStyle = 'rgba(235,229,214,' + (0.15 + rr() * 0.5) + ')'; c.fillRect(x0 + rr() * (x1 - x0), rr() * (GY - 90), 1.1, 1.1); }
    const my = Math.max(26, GY - 186);
    const mg = c.createRadialGradient(78, my, 4, 78, my, 40); mg.addColorStop(0, 'rgba(240,230,200,.25)'); mg.addColorStop(1, 'rgba(240,230,200,0)');
    c.fillStyle = mg; c.beginPath(); c.arc(78, my, 40, 0, 7); c.fill();
    c.fillStyle = '#e8e0c8'; c.beginPath(); c.arc(78, my, 12, 0, 7); c.fill();
    c.fillStyle = 'rgba(160,150,125,.5)'; [[74, my - 3, 2.6], [83, my + 3, 2], [76, my + 5, 1.4], [84, my - 5, 1.2]].forEach(a => { c.beginPath(); c.arc(a[0], a[1], a[2], 0, 7); c.fill(); });
    for (let pass = 0; pass < 2; pass++) {
      let x = x0;
      while (x < x1) {
        const bw = (pass ? 24 : 18) + rr() * (pass ? 42 : 30), bh = (pass ? 40 : 66) + rr() * (pass ? 70 : 80);
        c.fillStyle = pass ? '#0c0f13' : '#151a21';
        c.fillRect(x, GY - bh, bw, bh + 2);
        if (rr() < 0.3) c.fillRect(x + bw * 0.3, GY - bh - 10, 1.6, 10);
        if (rr() < 0.25) c.fillRect(x + bw * 0.55, GY - bh - 5, 6, 5);
        if (rr() < 0.35) { c.beginPath(); c.moveTo(x + bw * 0.6, GY - bh); c.lineTo(x + bw, GY - bh + 8); c.lineTo(x + bw, GY - bh); c.fillStyle = '#1b1915'; c.fill(); }
        for (let wy = GY - bh + 6; wy < GY - 8; wy += 8) for (let wx = x + 4; wx < x + bw - 4; wx += 7)
          if (rr() < (pass ? 0.05 : 0.03)) { c.fillStyle = rr() < 0.7 ? 'rgba(255,196,90,.5)' : 'rgba(255,90,60,.45)'; c.fillRect(wx, wy, 2.5, 3); }
        x += bw + rr() * 6;
      }
    }
    c.fillStyle = 'rgba(255,140,80,.06)'; c.fillRect(x0, GY - 30, x1 - x0, 30);
    c.fillStyle = '#1d1a16'; c.fillRect(x0, GY, x1 - x0, VH - GY + 2);
    c.fillStyle = '#2d2820'; c.fillRect(x0, GY, x1 - x0, 1.6);
    for (let i = 0; i < 300; i++) { c.fillStyle = rr() < 0.5 ? 'rgba(90,78,60,.55)' : 'rgba(0,0,0,.35)'; c.fillRect(x0 + rr() * (x1 - x0), GY + 2 + rr() * (VH - GY), 1.8 + rr() * 2, 1.2); }
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, GY + 9); c.lineTo(x1, GY + 9); c.stroke();
  }

  /* ---------- the puppet ---------- */
  function limb(c, x, y, a1, bend, l1, l2, w1, w2, c1, c2) {
    const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1, a2 = a1 + bend, ex = kx + Math.sin(a2) * l2, ey = ky + Math.cos(a2) * l2;
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = OUT; c.lineWidth = Math.max(w1, w2) + 2.2; c.beginPath(); c.moveTo(x, y); c.lineTo(kx, ky); c.lineTo(ex, ey); c.stroke();
    c.strokeStyle = c2; c.lineWidth = w2; c.beginPath(); c.moveTo(kx, ky); c.lineTo(ex, ey); c.stroke();
    c.strokeStyle = c1; c.lineWidth = w1; c.beginPath(); c.moveTo(x, y); c.lineTo(kx, ky); c.stroke();
    return { kx, ky, ex, ey, a: a2 };
  }
  function leg(c, z, x, L, back) {
    const col = back ? z.pantsD : z.pants;
    const r = limb(c, x, 0, L[0], -L[1], 12.5, 12.5, 5.8, 5, col, col);
    c.save(); c.translate(r.ex, r.ey);
    c.fillStyle = back ? '#1d140e' : '#2e2016'; c.strokeStyle = OUT; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(-2.8, -2.6); c.lineTo(3, -2.6); c.quadraticCurveTo(6.8, -2.4, 6.8, 0.7); c.lineTo(-2.8, 1); c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
  function arm(c, z, A, back) {
    const r = limb(c, 1.5, -17.5, A[0], A[1], 9.5, 9, 4.9, 3.9, back ? z.shirtD : z.shirt, back ? z.skinD : z.skin);
    const sk = back ? z.skinD : z.skin;
    c.strokeStyle = sk; c.lineWidth = 1.5; c.beginPath();
    for (let i = -1; i <= 1; i++) { const a = r.a + i * 0.45; c.moveTo(r.ex, r.ey); c.lineTo(r.ex + Math.sin(a) * 3.6, r.ey + Math.cos(a) * 3.6); }
    c.stroke();
    c.fillStyle = sk; c.strokeStyle = OUT; c.lineWidth = 1.1; c.beginPath(); c.arc(r.ex, r.ey, 2.3, 0, 7); c.fill(); c.stroke();
    return r;
  }
  function torso(c, z, P) {
    const br = P.br || 0;
    c.save(); c.scale(1 + br * 0.035, 1 + br * 0.02);
    c.fillStyle = z.vest; c.strokeStyle = OUT; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(-7.5, 1); c.lineTo(8, 1); c.quadraticCurveTo(9.6, -10, 8.5, -19); c.quadraticCurveTo(1, -22.5, -6.5, -19); c.quadraticCurveTo(-8.8, -10, -7.5, 1); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = z.shirt; c.beginPath(); c.moveTo(-1.4, -20); c.lineTo(4.6, -19.8); c.lineTo(1.6, -11.5); c.closePath(); c.fill();
    c.fillStyle = '#efeacc'; c.fillRect(-8, -9.6, 17.3, 1.8); c.fillRect(-8, -14.6, 17.1, 1.8);
    c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.moveTo(-7.5, 1); c.lineTo(-3.5, 1); c.lineTo(-3, -19.6); c.lineTo(-6.5, -19); c.quadraticCurveTo(-8.8, -10, -7.5, 1); c.fill();
    c.fillStyle = z.vestD; c.fillRect(3, -13, 4.2, 3.4); c.fillStyle = '#d9e2ea'; c.fillRect(4.1, -14.8, 0.9, 2.3);
    c.fillStyle = '#5a3b22'; c.fillRect(-8, -2.4, 17.6, 3); c.fillStyle = '#c9a54a'; c.fillRect(0.6, -2.2, 2.6, 2.6);
    if (z.crispy) { c.fillStyle = 'rgba(15,10,8,.6)'; [[-3, -6, 2.4], [5, -4, 1.8], [2, -16, 1.6]].forEach(a => { c.beginPath(); c.arc(a[0], a[1], a[2], 0, 7); c.fill(); }); }
    c.restore();
  }
  function eyes(c, z, m) {
    const E = [[3.6, -2.4, 3.5], [8.1, -1.8, 2.4]], mood = m.mood || '';
    c.lineWidth = 1;
    if (mood === 'dizzy') {
      E.forEach((e, i) => {
        c.fillStyle = '#f2edcf'; c.strokeStyle = OUT; c.beginPath(); c.arc(e[0], e[1], e[2], 0, 7); c.fill(); c.stroke();
        c.beginPath(); for (let a = 0; a < 10; a += 0.5) { const rr = a / 10 * e[2] * 0.9, an = a * 1.4 + t * (i ? -9 : 9); c.lineTo(e[0] + Math.cos(an) * rr, e[1] + Math.sin(an) * rr); } c.stroke();
      });
      return;
    }
    if (mood === 'pain') {
      c.strokeStyle = OUT; c.lineWidth = 1.4; c.beginPath();
      c.moveTo(1.2, -4.6); c.lineTo(4.6, -2.4); c.lineTo(1.2, -0.4); c.moveTo(10, -3.8); c.lineTo(7.4, -1.9); c.lineTo(10, 0); c.stroke();
      return;
    }
    if (mood === 'happy') {
      c.strokeStyle = OUT; c.lineWidth = 1.4; c.beginPath(); c.arc(3.6, -1.6, 2.6, Math.PI * 1.1, Math.PI * 1.9); c.moveTo(6.4, -1.2); c.arc(8.2, -1.2, 1.8, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      return;
    }
    const lk = m.look || 0, ly = m.lookY || 0, bl = Math.max(m.blink || 0, m.lid || 0);
    E.forEach((e, i) => {
      const ry = e[2] * (mood === 'wide' ? 1.25 : 1.05);
      c.fillStyle = '#f2edcf'; c.strokeStyle = OUT; c.lineWidth = 1; c.beginPath(); c.ellipse(e[0], e[1], e[2], ry, 0, 0, 7); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(200,60,60,.45)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(e[0] - e[2] * 0.9, e[1]); c.lineTo(e[0] - e[2] * 0.4, e[1] + 0.4); c.stroke();
      const l2 = i ? lk + Math.sin(t * 1.9 + z.seed) * 0.55 : lk;   // the small eye wanders on its own
      const pr = mood === 'wide' ? e[2] * 0.26 : e[2] * 0.44, px = e[0] + l2 * e[2] * 0.45, py = e[1] + ly * e[2] * 0.4;
      c.fillStyle = '#1a1210'; c.beginPath(); c.arc(px, py, pr, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(px - pr * 0.55, py - pr * 0.65, pr * 0.5, pr * 0.5);
      if (bl > 0.02) {
        c.save(); c.beginPath(); c.ellipse(e[0], e[1], e[2] + 0.5, ry + 0.5, 0, 0, 7); c.clip();
        c.fillStyle = z.skinD; c.fillRect(e[0] - e[2] - 1, e[1] - ry - 1, e[2] * 2 + 2, (ry * 2 + 2) * bl);
        c.strokeStyle = OUT; c.lineWidth = 0.9; c.beginPath(); c.moveTo(e[0] - e[2] - 1, e[1] - ry - 1 + (ry * 2 + 2) * bl); c.lineTo(e[0] + e[2] + 1, e[1] - ry - 1 + (ry * 2 + 2) * bl); c.stroke();
        c.restore();
      }
    });
    const b = m.brow || 0, up = mood === 'wide' ? 1.6 : 0;
    c.strokeStyle = OUT; c.lineWidth = 1.3; c.beginPath();
    c.moveTo(0.4, -6.9 - up + b * 0.8); c.lineTo(6.1, -6.6 - up - b * 0.6); c.moveTo(6.9, -5.4 - up + b * 0.5); c.lineTo(10.2, -4.6 - up - b * 0.3); c.stroke();
  }
  function star(c, x, y, r, col) {
    c.fillStyle = col; c.strokeStyle = OUT; c.lineWidth = 0.8; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fill(); c.stroke();
  }
  function hat(c, z, m) {
    c.save(); c.translate(0.5, -6.2 - Math.max(0, z.hy || 0)); c.rotate((z.hv || 0) * 0.002 + (m.hatTilt || 0) + Math.max(0, z.hy || 0) * 0.02);
    if (m.hatTip) { c.translate(1.6, 4.4); c.rotate(0.22); }
    c.fillStyle = '#f2cc3a'; c.strokeStyle = OUT; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(-9.8, 0); c.bezierCurveTo(-10, -12.5, 11, -12.5, 10.8, 0); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#c99a1f'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0.6, -9); c.lineTo(0.6, -0.6); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-4.2, -5.6, 2.4, 1.2, -0.6, 0, 7); c.fill();
    c.fillStyle = '#e0b52a'; c.strokeStyle = OUT; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-12, -1.2); c.lineTo(13.6, -1.2); c.lineTo(13.6, 1.8); c.lineTo(-12, 1.8); c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
  function head(c, z, m) {
    c.strokeStyle = OUT;
    c.fillStyle = z.skinD; c.lineWidth = 1.2; c.beginPath(); c.ellipse(-7.2, 1, 2.2, 3, 0, 0, 7); c.fill(); c.stroke();
    if (m.phones) { c.fillStyle = '#20242a'; c.beginPath(); c.ellipse(-7, 0.5, 3, 3.8, 0, 0, 7); c.fill(); c.stroke(); }
    c.fillStyle = z.skin; c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, 0, 9.6, 9.2, 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = 'rgba(40,60,30,.35)'; c.beginPath(); c.ellipse(-3.6, 3.6, 2.6, 1.8, 0.3, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.ellipse(-2, -5, 4.5, 2.4, -0.3, 0, 7); c.fill();
    c.strokeStyle = '#3b2c20'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(-5.2, -6.2); c.lineTo(-0.4, -7.6);
    for (let i = 0; i < 4; i++) { const sx = -4.6 + i * 1.3, sy = -6.4 - i * 0.4; c.moveTo(sx, sy - 1); c.lineTo(sx + 0.3, sy + 1); }
    c.stroke();
    if (z.crispy) {
      c.strokeStyle = '#120d0a'; c.lineWidth = 1.3; c.beginPath();
      for (let i = 0; i < 5; i++) { const a = -2.6 + i * 0.35; c.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); c.lineTo(Math.cos(a) * 12.5, Math.sin(a) * 12.5 + (i % 2) * 1.5); }
      c.stroke(); c.fillStyle = 'rgba(15,10,8,.45)'; c.beginPath(); c.ellipse(5, 3, 3, 2, 0, 0, 7); c.fill();
    }
    const j = m.jaw || 0, mh = 0.9 + j * 3.6, my = 4.6 + j * 0.8;
    c.fillStyle = '#2a0c0c'; c.beginPath(); c.ellipse(5.4, my, 3.3, mh, 0, 0, 7); c.fill();
    c.fillStyle = '#ece3c4'; c.fillRect(3.4, my - mh, 1.5, 1.8); c.fillRect(6.4, my - mh, 1.4, 1.3);
    if (m.tongue) { c.fillStyle = '#d0607a'; c.strokeStyle = OUT; c.lineWidth = 0.7; c.beginPath(); c.ellipse(6.8, my + mh * 0.5 + m.tongue * 1.6, 1.7, 1 + m.tongue * 1.8, 0, 0, 7); c.fill(); c.stroke(); }
    eyes(c, z, m);
    c.fillStyle = z.skinD; c.strokeStyle = OUT; c.lineWidth = 0.9; c.beginPath(); c.ellipse(9.6, 1.2, 1.6, 1.3, 0, 0, 7); c.fill(); c.stroke();
    if (m.snot > 0.3) {
      const r = m.snot;
      c.fillStyle = 'rgba(170,225,150,.4)'; c.strokeStyle = 'rgba(215,255,200,.85)'; c.lineWidth = 0.8;
      c.beginPath(); c.arc(10.8 + r * 0.7, 2.6, r, 0, 7); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.arc(10.8 + r * 0.4, 2.6 - r * 0.45, r * 0.22, 0, 7); c.fill();
    }
    if (m.mask !== undefined) {
      c.save(); c.translate(1, -6); c.rotate((1 - m.mask) * -1.7);
      c.fillStyle = '#2b3037'; c.strokeStyle = OUT; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(1, 0); c.lineTo(11.5, 1); c.quadraticCurveTo(12.6, 7, 11, 13); c.lineTo(2, 13.5); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = m.glow ? 'rgba(130,220,255,.95)' : 'rgba(80,140,170,.8)'; c.fillRect(5, 4, 6, 2.6);
      c.restore();
    }
    if (z.hatOn) hat(c, z, m);
    if (m.phones) { c.strokeStyle = '#20242a'; c.lineWidth = 1.8; c.beginPath(); c.arc(-1, -4, 10, Math.PI * 0.95, Math.PI * 1.75); c.stroke(); }
    if (z.flies) {
      for (let i = 0; i < 3; i++) {
        const a = t * (4.6 + i * 0.9) + z.seed * 3 + i * 2.1, fx = Math.cos(a) * (14 + i * 2.5), fy = -9 + Math.sin(a * 1.37) * 7;
        c.fillStyle = 'rgba(210,225,240,.55)'; c.beginPath(); c.ellipse(fx - 0.6, fy - 1, 1.1, 0.5 + 0.4 * Math.abs(Math.sin(t * 60 + i)), 0.5, 0, 7); c.fill();
        c.fillStyle = '#0b0b0b'; c.beginPath(); c.arc(fx, fy, 0.9, 0, 7); c.fill();
      }
    }
    if (z.dizzy > 0) for (let i = 0; i < 3; i++) { const a = t * 7 + i * 2.09; star(c, Math.cos(a) * 12, -21 + Math.sin(a) * 3.5, 2.6, '#ffe066'); }
  }
  // one worker from a pose: legs [thigh, knee bend], arms [upper, elbow], lean, bob, head tilt, face
  function rig(c, z, P, it) {
    it = it || {};
    const sx = (z.sx !== undefined ? z.sx : z.dir) * z.sc, sy = z.sc * (P.sq || 1);
    c.save(); c.translate(z.x, z.y);
    if (!P.noShadow) { c.fillStyle = 'rgba(0,0,0,.33)'; c.beginPath(); c.ellipse(0, 0.6, 15 * z.sc * Math.max(0.6, 1 - (P.bob || 0) * 0.04), 3.2 * z.sc, 0, 0, 7); c.fill(); }
    c.scale(sx, sy);
    c.translate(0, -(P.hip !== undefined ? P.hip : 25) - (P.bob || 0));
    const L = P.legs, A = P.arms, ln = P.lean || 0;
    leg(c, z, -1.5, L[1], true);
    c.save(); c.rotate(ln); const hb = arm(c, z, A[1], true); if (it.back) it.back(c, hb); c.restore();
    c.save(); c.rotate(ln); torso(c, z, P); c.restore();
    leg(c, z, 1.5, L[0], false);
    c.save(); c.rotate(ln);
    c.save(); c.translate(2, -20); c.rotate(P.head || 0); c.fillStyle = z.skinD; c.fillRect(-2.3, -3.2, 4.6, 4.4); c.translate(1.5, -9.2); head(c, z, P); c.restore();
    const hf = arm(c, z, A[0], false); if (it.front) it.front(c, hf);
    if (it.over) it.over(c);
    c.restore();
    c.restore();
  }
  function blinkOf(z) {
    if (t > z.blinkAt) { z.bt = t; z.blinkAt = t + 1.8 + rnd() * 3.6; if (rnd() < 0.2) z.blinkAt = t + 0.25; }
    const u = (t - z.bt) / 0.17; return u >= 0 && u <= 1 ? Math.sin(u * Math.PI) : 0;
  }
  function springs(z, dt) {
    z.hv += (-z.hy * 200 - z.hv * 7) * dt; z.hy += z.hv * dt;
    if (z.dizzy > 0) z.dizzy -= dt;
  }
  function walkPose(ph, limp, arms) {
    const s = Math.sin(ph), co = Math.cos(ph);
    return {
      bob: Math.abs(co) * 1.8 - (limp && s < 0 ? 1.4 : 0), lean: 0.1 + (limp ? s * 0.06 : 0),
      legs: [[s * 0.48, Math.max(0, co) * 0.95], [-s * (limp ? 0.3 : 0.48), Math.max(0, -co) * (limp ? 0.35 : 0.95)]],
      arms: arms || [[1.45 + s * 0.1, -0.15], [1.35 - s * 0.1, -0.1]],
      head: Math.sin(ph * 0.5) * 0.08 + (limp ? 0.06 : 0), jaw: 0.35 + 0.2 * Math.sin(ph * 1.3)
    };
  }

  /* ---------- the props ---------- */
  function crane(c) {
    const tx = 566, jy = GY - 198, j0 = 238, j1 = 630;
    c.lineCap = 'butt';
    c.strokeStyle = '#7a5f12'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(tx - 6, GY); c.lineTo(tx - 6, jy); c.moveTo(tx + 6, GY); c.lineTo(tx + 6, jy); c.stroke();
    c.strokeStyle = '#d6a72a'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(tx - 6, GY); c.lineTo(tx - 6, jy); c.moveTo(tx + 6, GY); c.lineTo(tx + 6, jy);
    for (let y = GY; y > jy + 8; y -= 11) { c.moveTo(tx - 6, y); c.lineTo(tx + 6, y - 11); c.moveTo(tx - 6, y); c.lineTo(tx + 6, y); }
    c.moveTo(j0, jy); c.lineTo(j1, jy); c.moveTo(j0 + 12, jy + 8); c.lineTo(j1, jy + 8);
    for (let x = j0 + 12; x < j1 - 10; x += 11) { c.moveTo(x, jy + 8); c.lineTo(x + 5.5, jy); c.lineTo(x + 11, jy + 8); }
    c.moveTo(tx, jy); c.lineTo(tx, jy - 18); c.stroke();
    c.strokeStyle = 'rgba(214,167,42,.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(tx, jy - 18); c.lineTo(j0 + 16, jy); c.moveTo(tx, jy - 18); c.lineTo(j1 - 2, jy); c.stroke();
    c.fillStyle = '#4a4f55'; c.fillRect(j1 - 22, jy + 8, 9, 12); c.fillRect(j1 - 12, jy + 8, 9, 12);
    c.fillStyle = '#5a5650'; c.fillRect(tx - 16, GY - 7, 32, 7);
    if (Math.sin(t * 3.2) > 0.55) { c.fillStyle = '#ff3b2f'; c.beginPath(); c.arc(tx, jy - 19, 2.2, 0, 7); c.fill(); c.fillStyle = 'rgba(255,60,40,.25)'; c.beginPath(); c.arc(tx, jy - 19, 6, 0, 7); c.fill(); }
    // the cab, and the operator nodding along to his headphones
    c.fillStyle = '#e2b437'; c.strokeStyle = OUT; c.lineWidth = 1.2; c.fillRect(tx - 15, jy + 8, 20, 17); c.strokeRect(tx - 15, jy + 8, 20, 17);
    c.save(); c.beginPath(); c.rect(tx - 13, jy + 10, 12, 10); c.clip();
    c.fillStyle = '#20303c'; c.fillRect(tx - 13, jy + 10, 12, 10);
    c.save(); c.translate(tx - 7, jy + 19 + Math.abs(Math.sin(t * 4.2)) * 1.6); c.scale(0.55, 0.55); c.rotate(Math.sin(t * 4.2) * 0.12);
    head(c, S.op, { jaw: 0.3 + 0.3 * Math.abs(Math.sin(t * 4.2)), look: 0.6, blink: blinkOf(S.op), phones: true });
    c.restore();
    c.fillStyle = 'rgba(160,220,255,.22)'; c.fillRect(tx - 13, jy + 10, 12, 10);
    c.restore();
    // trolley, cable and the swinging sign
    const trol = 372 + Math.sin(t * 0.21) * 74, len = 38 + Math.sin(t * 0.33) * 8, sw = Math.sin(t * 1.2) * 0.08 + Math.sin(t * 0.53) * 0.03;
    c.fillStyle = '#3b4148'; c.fillRect(trol - 7, jy + 6, 14, 5);
    const hx = trol + Math.sin(sw) * len, hy = jy + 11 + Math.cos(sw) * len, a = sw * 0.7;
    c.strokeStyle = '#8b9096'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(trol - 2, jy + 11); c.lineTo(hx - 1.5, hy); c.moveTo(trol + 2, jy + 11); c.lineTo(hx + 1.5, hy); c.stroke();
    S.sign = { x: hx, y: hy, a };
    c.save(); c.translate(hx, hy); c.rotate(a);
    c.strokeStyle = '#3b4148'; c.lineWidth = 1.8; c.beginPath(); c.arc(0, 2, 2.4, 0, Math.PI * 1.4); c.stroke();
    const pw = 66, ph = 30;
    c.strokeStyle = '#8b9096'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(0, 4); c.lineTo(-pw * 0.42, 9); c.moveTo(0, 4); c.lineTo(pw * 0.42, 9); c.stroke();
    c.fillStyle = '#1b1f24'; c.fillRect(-pw / 2, 9, pw, ph);
    c.save(); c.beginPath(); c.rect(-pw / 2, 9, pw, ph); c.clip();
    c.fillStyle = '#f2cc3a'; for (let i = -6; i < 12; i++) { const x = -pw / 2 + i * 9; c.beginPath(); c.moveTo(x, 9); c.lineTo(x + 4.5, 9); c.lineTo(x - 6, 9 + ph); c.lineTo(x - 10.5, 9 + ph); c.fill(); }
    c.fillStyle = '#1b1f24'; c.fillRect(-pw / 2 + 4, 13, pw - 8, ph - 8);
    c.restore();
    c.strokeStyle = OUT; c.lineWidth = 1.2; c.strokeRect(-pw / 2, 9, pw, ph);
    c.fillStyle = '#9aa3ad'; [[-pw / 2 + 2.5, 11.5], [pw / 2 - 2.5, 11.5], [-pw / 2 + 2.5, 6.5 + ph], [pw / 2 - 2.5, 6.5 + ph]].forEach(p => c.fillRect(p[0] - 0.8, p[1] - 0.8, 1.6, 1.6));
    c.fillStyle = '#f2cc3a'; c.font = '20px "Saira Stencil One", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(NEXT, 0, 9 + ph / 2 + 1);
    if (S.crow.st === 'perch') crowDraw(c, pw * 0.22, 9, -1, null);
    c.restore();
  }
  function signTop() { const s = S.sign, lx = 66 * 0.22, ly = 9; return { x: s.x + Math.cos(s.a) * lx - Math.sin(s.a) * ly, y: s.y + Math.sin(s.a) * lx + Math.cos(s.a) * ly }; }
  function crowDraw(c, x, y, dir, flap) {
    const C = S.crow, cawing = C.st === 'perch' && ((C.pt > 1.4 && C.pt < 1.8) || (C.pt > 3.2 && C.pt < 3.7)), bob = C.st === 'perch' ? Math.max(0, Math.sin(C.pt * 5)) * 1.2 : 0;
    c.save(); c.translate(x, y); c.scale(dir, 1);
    c.strokeStyle = '#2a2a2e'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(-1, -1); c.lineTo(-1.5, 0); c.moveTo(1.5, -1); c.lineTo(1.5, 0); c.stroke();
    c.fillStyle = '#121216'; c.beginPath(); c.ellipse(0.5, -4.6, 5.6, 3.6, 0.15, 0, 7); c.fill();
    c.beginPath(); c.moveTo(5, -5); c.lineTo(10.5, -2.6); c.lineTo(5, -3); c.fill();
    c.beginPath(); c.arc(-4.4, -8 + bob, 2.9, 0, 7); c.fill();
    c.fillStyle = '#e8b83a'; c.beginPath();
    if (cawing) { c.moveTo(-6.8, -8.8 + bob); c.lineTo(-11, -10.6 + bob); c.lineTo(-6.8, -8 + bob); c.moveTo(-6.8, -7.8 + bob); c.lineTo(-10.4, -6 + bob); c.lineTo(-6.6, -7.2 + bob); }
    else { c.moveTo(-6.8, -8.8 + bob); c.lineTo(-10.6, -8 + bob); c.lineTo(-6.8, -7.2 + bob); }
    c.fill();
    c.fillStyle = '#fff'; c.fillRect(-5.4, -9 + bob, 1, 1);
    if (flap !== null) { c.fillStyle = '#1c1c22'; c.beginPath(); c.moveTo(-1, -5.5); c.lineTo(4, -5.5 - flap * 9); c.lineTo(7, -5 - flap * 4); c.closePath(); c.fill(); }
    else { c.fillStyle = '#1e1e26'; c.beginPath(); c.ellipse(1.5, -4.8, 4, 2, 0.2, 0, 7); c.fill(); }
    c.restore();
  }
  function scaffold(c) {
    const x0 = 12, x1 = 96, d1 = GY - 46, d2 = GY - 92;
    c.lineCap = 'round';
    const poles = () => { c.beginPath(); [x0, (x0 + x1) / 2, x1].forEach(x => { c.moveTo(x, GY); c.lineTo(x, d2 - 22); }); c.moveTo(x0, GY); c.lineTo((x0 + x1) / 2, d1); c.lineTo(x1, GY); c.moveTo(x0, d1); c.lineTo((x0 + x1) / 2, d2); c.lineTo(x1, d1); c.moveTo(x0, d1 - 16); c.lineTo(x1, d1 - 16); c.moveTo(x0, d2 - 18); c.lineTo(x1, d2 - 18); c.stroke(); };
    c.strokeStyle = '#2b2f34'; c.lineWidth = 3.6; poles(); c.strokeStyle = '#8f98a2'; c.lineWidth = 2; poles();
    [d1, d2].forEach(d => {
      c.fillStyle = '#a8743c'; c.strokeStyle = OUT; c.lineWidth = 1; c.fillRect(x0 - 5, d, x1 - x0 + 10, 4.5); c.strokeRect(x0 - 5, d, x1 - x0 + 10, 4.5);
      c.strokeStyle = 'rgba(70,40,15,.6)'; c.beginPath(); for (let x = x0; x < x1 + 5; x += 17) { c.moveTo(x, d + 0.5); c.lineTo(x, d + 4); } c.stroke();
    });
    // a bucket on the lower deck, a ladder and the board being nailed up top
    c.fillStyle = '#7d858e'; c.strokeStyle = OUT; c.beginPath(); c.moveTo(24, d1); c.lineTo(22.5, d1 - 9); c.lineTo(33.5, d1 - 9); c.lineTo(32, d1); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.arc(28, d1 - 9, 5.5, Math.PI, 0); c.stroke();
    c.strokeStyle = '#8a5a2b'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x1 - 12, GY); c.lineTo(x1 - 12, d1); c.moveTo(x1 - 4, GY); c.lineTo(x1 - 4, d1); for (let y = GY - 6; y > d1; y -= 7) { c.moveTo(x1 - 12, y); c.lineTo(x1 - 4, y); } c.stroke();
    c.fillStyle = '#c08a4a'; c.strokeStyle = OUT; c.lineWidth = 1; c.fillRect(56, d2 - 24, 40, 5); c.strokeRect(56, d2 - 24, 40, 5);
  }
  function wall(c) {
    const rows = Math.max(3, Math.round(10 * Math.min(1, 0.3 + prog / 100))), bw = 9, bh = 5.5;
    for (let r = 0; r < rows; r++) for (let i = 0; i < 5; i++) {
      const x = 102 + i * bw + (r % 2 ? bw / 2 : 0); if (x > 102 + 4.6 * bw) continue;
      c.fillStyle = (r * 3 + i) % 4 ? '#7a3b2a' : '#8c4632'; c.fillRect(x, GY - (r + 1) * bh, bw - 1, bh - 1);
      c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(x, GY - (r + 1) * bh, bw - 1, 1);
    }
    c.fillStyle = '#6a6a6a'; c.strokeStyle = OUT; c.lineWidth = 1; c.beginPath(); c.ellipse(140, GY - 1, 7, 2.5, 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#9a958a'; c.beginPath(); c.ellipse(140, GY - 2, 5, 1.6, 0, 0, 7); c.fill();
  }
  function potty(c) {
    const P = S.potty, sh = P.shake > 0 ? Math.sin(t * 70) * 1.4 * P.shake / 0.4 : 0;
    c.save(); c.translate(168 + sh, GY);
    c.fillStyle = '#2f6db0'; c.strokeStyle = OUT; c.lineWidth = 1.3; c.fillRect(-15, -47, 30, 47); c.strokeRect(-15, -47, 30, 47);
    c.fillStyle = '#3c84cf'; c.fillRect(-16.5, -52, 33, 6); c.strokeRect(-16.5, -52, 33, 6);
    c.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 3; i++) c.fillRect(-12 + i * 3, -44, 1.5, 6);
    c.fillStyle = '#0b0f16'; c.fillRect(-11, -42, 22, 41);
    if (P.o > 0.3) {
      // whoever's in there leans out for a look
      const pz = P.z, lean = ease((P.o - 0.3) / 0.7) * 7, lookDir = P.pt < 1.1 ? -1 : 1;
      c.save(); c.translate(6 + lean, -30); c.scale(lookDir * 0.95, 0.95);
      head(c, pz, { jaw: 0.25, look: 0.6, lookY: 0.1, blink: blinkOf(pz), mood: P.pt > 2 ? 'wide' : '', brow: P.pt > 2 ? -1 : 0.5 });
      c.restore();
      c.save(); c.translate(6 + lean, -14); c.fillStyle = pz.skin; c.strokeStyle = OUT; c.lineWidth = 1.1; c.beginPath(); c.arc(-8, -2, 2.6, 0, 7); c.fill(); c.stroke(); c.restore();
    }
    const dw = 22 * Math.cos(P.o * Math.PI / 2 * 0.92), sk = P.o * 5;
    c.fillStyle = '#2a62a0'; c.strokeStyle = OUT; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-11, -42); c.lineTo(-11 + dw, -42 - sk); c.lineTo(-11 + dw, -1 + sk); c.lineTo(-11, -1); c.closePath(); c.fill(); c.stroke();
    if (dw > 8) {
      c.fillStyle = '#0b0f16'; c.beginPath(); c.arc(-11 + dw * 0.5, -34, 3, 0, 7); c.fill(); c.fillStyle = '#2a62a0'; c.beginPath(); c.arc(-11 + dw * 0.5 + 1.4, -35, 2.6, 0, 7); c.fill();
      c.fillStyle = '#d33'; c.fillRect(-11 + dw - 6, -24, 4, 2.5); c.fillStyle = '#ccc'; c.fillRect(-11 + dw - 3.5, -20, 1.8, 4);
    }
    c.strokeStyle = 'rgba(150,200,90,.5)'; c.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) { const ph = (t * 0.6 + i / 3) % 1, x = -8 + i * 8; c.globalAlpha = Math.sin(ph * Math.PI); c.beginPath(); for (let y = 0; y < 12; y += 2) c.lineTo(x + Math.sin(y * 0.6 + t * 4 + i) * 2, -54 - ph * 14 - y); c.stroke(); }
    c.globalAlpha = 1;
    for (let i = 0; i < 2; i++) { const a = t * (5 + i) + i * 3; c.fillStyle = '#0b0b0b'; c.beginPath(); c.arc(Math.cos(a) * 12, -50 + Math.sin(a * 1.4) * 5, 0.9, 0, 7); c.fill(); }
    c.restore();
  }
  function mixer(c) {
    c.save(); c.translate(220 + Math.sin(t * 42) * 0.45, GY + Math.cos(t * 37) * 0.3);
    c.fillStyle = '#5c6670'; c.strokeStyle = OUT; c.lineWidth = 1.2; c.fillRect(-24, -13, 48, 6); c.strokeRect(-24, -13, 48, 6);
    [-15, 15].forEach(x => { c.fillStyle = '#1e2126'; c.beginPath(); c.arc(x, -4.5, 4.8, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#8b9096'; c.beginPath(); c.arc(x, -4.5, 1.6, 0, 7); c.fill(); });
    c.fillStyle = '#d8a023'; c.fillRect(-26, -28, 13, 15); c.strokeRect(-26, -28, 13, 15);
    c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 0.8; c.beginPath(); for (let i = 0; i < 4; i++) { c.moveTo(-24, -25 + i * 3); c.lineTo(-15, -25 + i * 3); } c.stroke();
    c.strokeStyle = '#2b2f34'; c.lineWidth = 2; c.beginPath(); c.moveTo(-22, -28); c.lineTo(-22, -36); c.stroke();
    c.save(); c.translate(6, -26); c.rotate(-0.38);
    c.beginPath(); c.ellipse(0, 0, 16, 11.5, 0, 0, 7); c.save(); c.clip();
    c.fillStyle = '#e4e2da'; c.fillRect(-17, -12, 34, 24);
    c.fillStyle = '#e8401c'; for (let i = 0; i < 8; i++) { const x = ((i * 8 + t * 16) % 64) - 32; c.beginPath(); c.moveTo(x, -12); c.lineTo(x + 4, -12); c.lineTo(x + 10, 12); c.lineTo(x + 6, 12); c.fill(); }
    c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(-17, 4, 34, 8);
    c.restore();
    c.strokeStyle = OUT; c.lineWidth = 1.3; c.stroke();
    c.fillStyle = '#3a3a3a'; c.beginPath(); c.ellipse(15.5, -3, 2.6, 5, 0, 0, 7); c.fill(); c.stroke();
    c.restore();
    c.fillStyle = '#efeacc'; c.font = '5px "Share Tech Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BRAIN MIX', 4, -10);
    c.restore();
  }
  function benchZ(c) {
    const B = S.bench, z = B.z, up = ease(B.up);
    c.save(); c.translate(328, GY - 23);
    c.fillStyle = z.pants; c.strokeStyle = OUT; c.lineWidth = 1.1;
    c.fillRect(0, -6, 22, 3.6); c.strokeRect(0, -6, 22, 3.6); c.fillRect(0, -2.6, 22, 3.6); c.strokeRect(0, -2.6, 22, 3.6);
    const tw = Math.max(0, Math.sin(t * 9)) * (Math.sin(t * 0.7) > 0.7 ? 0.5 : 0);
    c.save(); c.translate(23, -3); c.rotate(-0.3 - tw); c.fillStyle = '#2e2016'; c.fillRect(-1, -7, 4, 9); c.strokeRect(-1, -7, 4, 9); c.restore();
    c.rotate(up * 1.3);
    // the fine zombie: stitched together, bolts in his neck
    c.fillStyle = z.shirt; c.fillRect(-25, -10, 25, 10); c.strokeRect(-25, -10, 25, 10);
    c.strokeStyle = '#e8dfc8'; c.lineWidth = 0.9; c.beginPath(); for (let i = 0; i < 4; i++) { c.moveTo(-21 + i * 6, -10); c.lineTo(-21 + i * 6, 0); c.moveTo(-22 + i * 6, -5); c.lineTo(-20 + i * 6, -5); } c.stroke();
    c.fillStyle = '#9aa3ad'; c.strokeStyle = OUT; c.lineWidth = 0.8; c.fillRect(-28, -2, 4, 2.2); c.strokeRect(-28, -2, 4, 2.2); c.fillRect(-28, -10, 4, 2.2); c.strokeRect(-28, -10, 4, 2.2);
    const wave = B.ph === 'wave' ? Math.sin(t * 13) * 0.45 : 0, aa = lerp(Math.PI / 2, 2.4 + 1.3 + wave, ease((B.up - 0.4) / 0.6));
    limb(c, -19, -9, aa, B.ph === 'wave' ? 0.4 : 0, 8, 7.5, 3.8, 3.4, z.shirt, z.skin);
    c.save(); c.translate(-34, -5); c.rotate(-Math.PI / 2 + up * 0.25);
    head(c, z, { jaw: B.ph === 'wave' ? 0.7 : 0.25 + 0.1 * Math.sin(t * 2), mood: B.stars > 0 ? 'dizzy' : B.ph === 'wave' ? 'happy' : '', tongue: B.stars > 0 ? 1 : 0, look: 0.2, blink: B.ph === 'lie' ? 1 : 0 });
    if (B.stars > 0) for (let i = 0; i < 3; i++) { const a = t * 7 + i * 2.09; star(c, Math.cos(a) * 12, -14 + Math.sin(a) * 3, 2.4, '#ffe066'); }
    c.restore();
    c.restore();
  }
  function lampAndBench(c, lampOn) {
    const bx = 318, top = GY - 20, w = 76;
    c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(272, GY); c.lineTo(272, GY - 84); c.lineTo(302, GY - 84); c.stroke();
    c.strokeStyle = '#4a4f55'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(272, GY); c.lineTo(272, GY - 84); c.lineTo(302, GY - 84); c.stroke();
    c.fillStyle = '#3b4148'; c.beginPath(); c.moveTo(296, GY - 84); c.lineTo(308, GY - 84); c.lineTo(311, GY - 77); c.lineTo(293, GY - 77); c.closePath(); c.fill();
    if (lampOn) {
      const g = c.createLinearGradient(0, GY - 77, 0, top);
      g.addColorStop(0, 'rgba(255,225,150,.22)'); g.addColorStop(1, 'rgba(255,225,150,.04)');
      c.fillStyle = g; c.beginPath(); c.moveTo(294, GY - 77); c.lineTo(310, GY - 77); c.lineTo(bx + w * 0.6, top); c.lineTo(bx - w * 0.62, top); c.closePath(); c.fill();
      const rg = c.createRadialGradient(302, GY - 76, 0, 302, GY - 76, 14); rg.addColorStop(0, 'rgba(255,240,190,.9)'); rg.addColorStop(1, 'rgba(255,220,150,0)');
      c.fillStyle = rg; c.beginPath(); c.arc(302, GY - 76, 14, 0, 7); c.fill();
      for (let i = 0; i < 9; i++) { const ph = (t * 0.05 + i * 0.13) % 1, x = 290 + ((i * 37) % 40) + Math.sin(t * 0.7 + i) * 4, y = GY - 72 + ph * 50; c.fillStyle = 'rgba(255,240,200,' + (0.5 * Math.sin(ph * Math.PI)) + ')'; c.fillRect(x, y, 1, 1); }
      const ma = t * 3.1, mx = 302 + Math.cos(ma) * 8 + Math.sin(ma * 2.3) * 3, my = GY - 75 + Math.sin(ma * 1.7) * 5;
      c.fillStyle = 'rgba(230,220,190,.85)'; c.beginPath(); c.ellipse(mx, my, 1.4, 0.6 + 0.6 * Math.abs(Math.sin(t * 40)), 0, 0, 7); c.fill();
    }
    c.fillStyle = lampOn ? '#fff4c8' : '#6a6658'; c.beginPath(); c.arc(302, GY - 76.5, 2.4, 0, 7); c.fill();
    c.fillStyle = '#4a4e55'; c.strokeStyle = OUT; c.lineWidth = 1.2; c.fillRect(bx - w / 2, top, w, 4.5); c.strokeRect(bx - w / 2, top, w, 4.5);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(bx - w / 2 + 2, top + 0.6, w - 4, 1);
    c.strokeStyle = '#2a2723'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(bx - w / 2 + 5, top + 4.5); c.lineTo(bx - w / 2 + 5, GY); c.moveTo(bx + w / 2 - 5, top + 4.5); c.lineTo(bx + w / 2 - 5, GY); c.stroke();
    c.fillStyle = '#b8322a'; c.strokeStyle = OUT; c.lineWidth = 1; c.fillRect(bx - 12, GY - 9, 20, 9); c.strokeRect(bx - 12, GY - 9, 20, 9);
    c.fillStyle = '#d9d2c0'; c.fillRect(bx - 4, GY - 11, 4, 2);
  }
  function crate(c, x) {
    c.fillStyle = '#7a5530'; c.strokeStyle = OUT; c.lineWidth = 1.1; c.fillRect(x - 14, GY - 19, 28, 19); c.strokeRect(x - 14, GY - 19, 28, 19);
    c.strokeStyle = 'rgba(40,24,10,.7)'; c.beginPath(); c.moveTo(x - 14, GY - 19); c.lineTo(x + 14, GY); c.moveTo(x - 14, GY - 9.5); c.lineTo(x + 14, GY - 9.5); c.stroke();
    c.fillStyle = 'rgba(230,60,40,.75)'; c.font = '4.5px "Share Tech Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('FRAGILE', x, GY - 4.5);
  }
  function cone(c, x, y) {
    c.fillStyle = '#ff6a1a'; c.strokeStyle = OUT; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 1.6, y - 17); c.lineTo(x + 1.6, y - 17); c.lineTo(x + 6.5, y - 1); c.lineTo(x - 6.5, y - 1); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#f4f1d0'; c.beginPath(); c.moveTo(x - 3.6, y - 10); c.lineTo(x + 3.6, y - 10); c.lineTo(x + 4.4, y - 7); c.lineTo(x - 4.4, y - 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.moveTo(x - 1, y - 16); c.lineTo(x - 0.2, y - 16); c.lineTo(x - 3, y - 2); c.lineTo(x - 4.2, y - 2); c.fill();
    c.fillStyle = '#2a2723'; c.fillRect(x - 9, y - 2, 18, 2.4);
  }
  function workSign(c) {
    const x = 612, y = GY + 6;
    c.strokeStyle = '#3a3f46'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x, y - 30); c.lineTo(x + 8, y); c.stroke();
    c.save(); c.translate(x, y - 34); c.rotate(Math.PI / 4 + Math.sin(t * 1.3) * 0.02);
    c.fillStyle = '#ff8a1a'; c.strokeStyle = OUT; c.lineWidth = 1.2; c.fillRect(-11, -11, 22, 22); c.strokeRect(-11, -11, 22, 22);
    c.strokeStyle = '#17140b'; c.lineWidth = 0.8; c.strokeRect(-9.5, -9.5, 19, 19);
    c.restore();
    c.fillStyle = '#17140b'; c.font = '4.4px "Share Tech Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('ZOMBIES', x, y - 37); c.fillText('AT WORK', x, y - 31);
    c.beginPath(); c.arc(x, y - 44, 1.6, 0, 7); c.fill(); c.strokeStyle = '#17140b'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(x, y - 42.5); c.lineTo(x, y - 40.5); c.moveTo(x - 2.6, y - 42); c.lineTo(x + 2.8, y - 42); c.stroke();
  }

  /* ---------- the crew: what each one is doing ---------- */
  function hammerer(c, dt) {
    const z = S.ham, d2 = GY - 92; z.y = d2; springs(z, dt);
    let P;
    if (z.ouch > 0) {
      z.ouch -= dt; if (z.ouch <= 0) z.nextOuch = t + 13 + rnd() * 10;
      const s = Math.sin(t * 13);
      P = { bob: Math.abs(s) * 7, lean: -0.1, legs: [[0.35 * s, 0.7], [-0.35 * s, 0.7]], arms: [[2.7 + Math.sin(t * 9) * 0.5, 0.4], [2.2 + Math.sin(t * 25) * 0.35, 1.3]], mood: 'pain', jaw: 1, head: -0.15 };
      if (rnd() < dt * 1.6) word('#@$%!', z.x + 6, d2 - 82, '#ff7b6b', 10);
    } else {
      const prev = z.hp; z.hp = (z.hp + dt * 1.35) % 1;
      const p = z.hp, up = Math.PI * 0.98, dn = Math.PI * 0.36;
      const u = p < 0.55 ? lerp(dn, up, ease(p / 0.55)) : p < 0.68 ? lerp(up, dn, Math.pow((p - 0.55) / 0.13, 2)) : dn;
      if (prev < 0.68 && p >= 0.68) {
        z.hits++;
        if (t > z.nextOuch) { z.ouch = 2.4; pop(z, 130); word('OUCH!', z.x + 10, d2 - 70, '#ff7b6b', 13); laugh(); }
        else { for (let i = 0; i < 6; i++) FX.sparks.push({ x: z.x + 20, y: d2 - 21, vx: (rnd() - 0.2) * 70, vy: -30 - rnd() * 60, life: 0.35, hot: 0 }); if (z.hits % 5 === 0) word('tink', z.x + 26, d2 - 34, '#efeacc', 8); }
      }
      const imp = p >= 0.68 && p < 0.78 ? 1 - (p - 0.68) / 0.1 : 0;
      P = { bob: -imp * 1.2, lean: 0.22 + imp * 0.06, legs: [[0.18, 0.15], [-0.14, 0.1]], arms: [[u, p < 0.55 ? 0.5 : 0.1], [0.95, 0.75]], head: 0.28 + imp * 0.08, jaw: 0.15, tongue: 0.7 + Math.sin(t * 3) * 0.3, look: 0.6, lookY: 0.8, sq: 1 - imp * 0.05 };
    }
    P.blink = blinkOf(z);
    rig(c, z, P, {
      front: (c, h) => { c.save(); c.translate(h.ex, h.ey); c.rotate(-h.a); c.strokeStyle = '#8a5a2b'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -2); c.lineTo(0, 10); c.stroke(); c.fillStyle = '#9aa3ad'; c.strokeStyle = OUT; c.lineWidth = 0.9; c.fillRect(-4.5, 9, 9, 4.2); c.strokeRect(-4.5, 9, 9, 4.2); c.restore(); },
      back: (c, h) => { if (z.ouch > 0) return; c.strokeStyle = '#cfd5db'; c.lineWidth = 1; c.beginPath(); c.moveTo(h.ex + 1, h.ey); c.lineTo(h.ex + 1, h.ey + 4); c.stroke(); }
    });
  }
  function kevin(c, dt) {
    const z = S.kev; z.y = GY - 7; springs(z, dt);
    if (z.turn > 0) {
      z.turn += dt / 0.8;
      if (z.turn >= 0.5 && !z.flipped) {
        z.dir *= -1; z.flipped = true;
        if (z.x > 400) { z.turns++; { const g = S.gary; g.dizzy = 2.8; pop(g, 150); word('BONK!', g.x - 4, GY - 74, '#f2cc3a', 15); laugh(); z.q = 1.8; } }
      }
      if (z.turn >= 1) { z.turn = 0; z.flipped = false; }
      const d0 = z.flipped ? -z.dir : z.dir, cs = Math.cos(Math.PI * z.turn);
      z.sx = d0 * (Math.abs(cs) < 0.12 ? 0.12 * Math.sign(cs || 1) : cs);
    } else {
      z.sx = undefined; z.walk += dt * 5.4; z.x += z.dir * 25 * dt;
      if ((z.dir > 0 && z.x >= 444) || (z.dir < 0 && z.x <= 196)) z.turn = 0.0001;
      const st = Math.floor(z.walk / Math.PI); if (st !== z.step) { z.step = st; FX.puffs.push({ x: z.x + z.dir * 3, y: z.y - 1, vx: -z.dir * 6, vy: -3, r: 1.2, life: 0.6, max: 0.6, col: '120,104,82' }); }
    }
    if (z.q > 0) z.q -= dt;
    const P = z.turn > 0 ? { bob: 0, lean: 0.05, legs: [[0.1, 0.1], [-0.1, 0.1]], arms: [[2.0, 0.6], [2.25, 0.5]], jaw: 0.4 } : walkPose(z.walk, true, [[2.0 + Math.sin(z.walk) * 0.05, 0.6], [2.25, 0.5]]);
    P.blink = blinkOf(z); P.look = z.q > 0 ? -1 : 0.5; P.brow = z.q > 0 ? -1 : 0; P.tongue = 0.4;
    rig(c, z, P, { back: c => { c.fillStyle = '#b07a3e'; c.strokeStyle = OUT; c.lineWidth = 1; c.fillRect(-30, -26, 66, 4.6); c.strokeRect(-30, -26, 66, 4.6); c.strokeStyle = 'rgba(70,40,15,.55)'; c.beginPath(); c.moveTo(-26, -25); c.lineTo(-10, -25); c.moveTo(6, -24.5); c.lineTo(30, -24.5); c.stroke(); } });
    if (z.q > 0) { c.fillStyle = '#efeacc'; c.font = '12px "Saira Stencil One", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', z.x, z.y - 74 + Math.sin(t * 6) * 1.5); }
  }
  function gary(c, dt) {
    const z = S.gary; z.y = GY + 5; springs(z, dt);
    if (t > z.flipAt && z.dizzy <= 0) { z.flip = 0.0001; z.flipAt = t + 6 + rnd() * 5; }
    if (z.flip > 0) { z.flip += dt / 0.5; if (z.flip >= 0.5 && !z.flipped) { z.sign = 1 - z.sign; z.flipped = true; } if (z.flip >= 1) { z.flip = 0; z.flipped = false; } }
    if (rnd() < dt * 2.2) FX.puffs.push({ x: z.x - 2 + rnd() * 6, y: GY - 66, vx: (rnd() - 0.5) * 4, vy: -10 - rnd() * 6, r: 1.5, life: 1.6, max: 1.6, col: '120,115,110' });
    const dz = z.dizzy > 0, sw = dz ? Math.sin(t * 5) * 0.18 : Math.sin(t * 1.3) * 0.04;
    const P = { bob: 0, lean: sw, legs: [[0.08 + (dz ? Math.sin(t * 5) * 0.2 : 0), 0.05], [-0.08, 0.05]], arms: [[1.15, 0.5], [0.2 + Math.sin(t * 1.1) * 0.08, 0.25]], head: dz ? Math.sin(t * 5 + 1) * 0.25 : Math.sin(t * 0.9) * 0.05, jaw: dz ? 0.9 : 0.3, mood: dz ? 'dizzy' : '', tongue: dz ? 1 : 0, look: Math.sin(t * 0.6) * 0.8, blink: blinkOf(z) };
    rig(c, z, P, {
      front: (c, h) => {
        c.save(); c.translate(h.ex, h.ey); c.rotate(-(P.lean) + (dz ? Math.sin(t * 6) * 0.5 : 0));
        c.strokeStyle = '#6b6f75'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 6); c.lineTo(0, -26); c.stroke();
        c.translate(0, -32); const fx = z.flip > 0 ? Math.abs(Math.cos(z.flip * Math.PI)) : 1; c.scale(Math.max(0.08, fx), 1);
        if (z.sign === 0) {
          c.fillStyle = '#c8261e'; c.strokeStyle = OUT; c.lineWidth = 1; c.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; c.lineTo(Math.cos(a) * 7.5, Math.sin(a) * 7.5); } c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#fff'; c.font = '4.6px "Share Tech Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.scale(-1, 1); c.fillText('STOP', 0, 0.3);
        } else {
          c.rotate(Math.PI / 4); c.fillStyle = '#ff8a1a'; c.strokeStyle = OUT; c.lineWidth = 1; c.fillRect(-5.6, -5.6, 11.2, 11.2); c.strokeRect(-5.6, -5.6, 11.2, 11.2); c.rotate(-Math.PI / 4);
          c.fillStyle = '#17140b'; c.font = '4.2px "Share Tech Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.scale(-1, 1); c.fillText('SLOW', 0, 0.3);
        }
        c.restore();
      }
    });
  }
  function barrow(c, dt) {
    const z = S.bar; z.y = GY + 6; springs(z, dt);
    const px = z.x; z.walk += dt * 4.2; z.x += z.dir * 15 * dt;
    if (z.x > 236) z.dir = -1; if (z.x < 112) z.dir = 1;
    const st = Math.floor(z.walk / Math.PI); if (st !== z.step) { z.step = st; FX.puffs.push({ x: z.x, y: z.y - 1, vx: -z.dir * 5, vy: -3, r: 1.2, life: 0.6, max: 0.6, col: '120,104,82' }); }
    if (z.dir > 0 && px < 180 && z.x >= 180) {
      z.trayV = -70; pop(z, 90); word('BOING', z.x + 30, GY - 46, '#efeacc', 9);
      z.bones.forEach(b => { b.vy = -(60 + rnd() * 50); b.vr = (rnd() - 0.5) * 14; });
    }
    z.trayV += (-z.tray * 420 - z.trayV * 12) * dt; z.tray += z.trayV * dt;
    z.bones.forEach(b => { if (b.oy < 0 || b.vy < 0) { b.vy += 300 * dt; b.oy += b.vy * dt; b.r += b.vr * dt; if (b.oy >= 0) { b.oy = 0; b.vy = 0; b.vr = 0; } } });
    const P = walkPose(z.walk, false, [[0.95, 0.12], [0.85, 0.15]]); P.lean = 0.28; P.blink = blinkOf(z); P.look = 0.8; P.lookY = 0.5; P.jaw = 0.5;
    rig(c, z, P, {
      front: (c, h) => {
        const ty = 5 + z.tray;
        c.strokeStyle = OUT; c.lineWidth = 2.4; c.beginPath(); c.moveTo(h.ex, h.ey); c.lineTo(24, ty + 2); c.stroke();
        c.strokeStyle = '#5a5f66'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(h.ex, h.ey); c.lineTo(24, ty + 2); c.stroke();
        z.bones.forEach(b => {
          c.save(); c.translate(b.ox, ty - 1 + b.oy); c.rotate(b.r); c.fillStyle = '#e8dfc8'; c.strokeStyle = OUT; c.lineWidth = 0.8;
          if (b.sk) { c.beginPath(); c.arc(0, -2, 3.6, 0, 7); c.fill(); c.stroke(); c.fillStyle = OUT; c.fillRect(-1.8, -2.6, 1.2, 1.4); c.fillRect(0.8, -2.6, 1.2, 1.4); }
          else { c.beginPath(); c.ellipse(0, -1, 4.2, 1.3, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.arc(-4, -1.6, 1.3, 0, 7); c.arc(4, -0.4, 1.3, 0, 7); c.fill(); }
          c.restore();
        });
        c.fillStyle = '#5b6b78'; c.strokeStyle = OUT; c.lineWidth = 1.3; c.beginPath(); c.moveTo(20, ty - 2); c.lineTo(50, ty - 2); c.lineTo(44, ty + 10); c.lineTo(26, ty + 10); c.closePath(); c.fill(); c.stroke();
        c.strokeStyle = '#2b2f34'; c.lineWidth = 2; c.beginPath(); c.moveTo(42, ty + 10); c.lineTo(44, 21); c.stroke();
        c.fillStyle = '#1e2126'; c.strokeStyle = OUT; c.lineWidth = 1; c.beginPath(); c.arc(44, 21, 4.4, 0, 7); c.fill(); c.stroke();
        c.strokeStyle = '#555'; c.beginPath(); const wa = z.x * 0.3; c.moveTo(44 + Math.cos(wa) * 3.4, 21 + Math.sin(wa) * 3.4); c.lineTo(44 - Math.cos(wa) * 3.4, 21 - Math.sin(wa) * 3.4); c.stroke();
      }
    });
  }
  function benchCrew(c, dt) {
    const B = S.bench, z = S.wel; z.y = GY; springs(z, dt);
    B.pt += dt;
    if (B.stars > 0) B.stars -= dt;
    if (B.ph === 'lie' && t > B.next && z.wipe <= 0) { B.ph = 'rise'; B.pt = 0; }
    else if (B.ph === 'rise') { B.up = Math.min(1, B.pt / 0.5); if (B.pt > 0.5) { B.ph = 'wave'; B.pt = 0; } }
    else if (B.ph === 'wave' && B.pt > 2.2) { B.ph = 'wind'; B.pt = 0; }
    else if (B.ph === 'wind' && B.pt > 0.4) { B.ph = 'hit'; B.pt = 0; }
    else if (B.ph === 'hit' && B.pt > 0.1) { B.ph = 'fall'; B.pt = 0; B.stars = 2; word('BONK!', 300, GY - 62, '#f2cc3a', 15); laugh(); }
    else if (B.ph === 'fall') { B.up = Math.max(0, 1 - B.pt / 0.22); if (B.pt > 0.22) { B.ph = 'lie'; B.next = t + 15 + rnd() * 8; } }
    if (z.wipe > 0) z.wipe -= dt; else if (t > z.wipeAt && B.ph === 'lie') { z.wipe = 1.8; z.wipeAt = t + 9 + rnd() * 5; }
    const busy = B.ph !== 'lie' || z.wipe > 0, welding = !busy && (t % 3.2) < 2.3;
    let arms = [[1.55, 0.15], [0.35, 0.5]], mask = 1, mood = '', look = 0.4, jaw = 0.2, head = 0.08;
    if (z.wipe > 0) { arms = [[2.75, 2.1], [0.3, 0.4]]; mask = 0; mood = ''; jaw = 0.6; head = -0.1; }
    if (B.ph === 'wave' || B.ph === 'rise') { mask = 0; look = 0.9; mood = ''; jaw = 0.1; }
    if (B.ph === 'wind') { mask = 0; arms = [[3.0, 0.5], [0.4, 0.4]]; jaw = 0.8; }
    if (B.ph === 'hit' || B.ph === 'fall') { mask = 0; arms = [[1.25, 0.05], [0.4, 0.4]]; jaw = 0.8; }
    z.mask = lerp(z.mask, mask, Math.min(1, dt * 10));
    const P = { bob: Math.sin(t * 1.6) * 0.4, lean: 0.12, legs: [[0.14, 0.1], [-0.12, 0.08]], arms, head, jaw, mood, look, brow: B.ph === 'wave' ? 1 : 0, mask: z.mask, glow: welding, blink: blinkOf(z), br: Math.sin(t * 1.6) };
    lampAndBench(c, !(t % 7 < 0.1 || (t % 7 > 0.18 && t % 7 < 0.24)));
    benchZ(c);
    const wrench = B.ph === 'wind' || B.ph === 'hit' || B.ph === 'fall';
    rig(c, z, P, {
      front: (c, h) => {
        c.save(); c.translate(h.ex, h.ey); c.rotate(-h.a);
        if (wrench) { c.fillStyle = '#a7b0ba'; c.strokeStyle = OUT; c.lineWidth = 0.9; c.fillRect(-1.2, -1, 2.4, 13); c.strokeRect(-1.2, -1, 2.4, 13); c.beginPath(); c.arc(0, 13.5, 3.2, 0.5, Math.PI * 2.2); c.stroke(); }
        else { c.fillStyle = '#2a2d33'; c.strokeStyle = OUT; c.lineWidth = 0.9; c.fillRect(-1.6, -1, 3.2, 8); c.strokeRect(-1.6, -1, 3.2, 8); c.fillStyle = '#b8a14a'; c.fillRect(-1, 7, 2, 3); }
        c.restore();
      },
      back: (c, h) => { c.strokeStyle = '#1f2226'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(h.ex, h.ey); c.quadraticCurveTo(h.ex + 6, h.ey + 14, h.ex - 8, h.ey + 22); c.stroke(); }
    });
    if (welding) {
      const tx = z.x - 24, ty = GY - 37;
      if (rnd() < 0.8) FX.sparks.push({ x: tx, y: ty, vx: (rnd() - 0.3) * 90, vy: -25 - rnd() * 60, life: 0.4 + rnd() * 0.5, hot: 1 });
      S.flash = { x: tx, y: ty, a: 0.6 + rnd() * 0.4 };
    } else S.flash = null;
  }
  function napper(c, dt) {
    const z = S.nap; z.y = GY; springs(z, dt);
    if (t > z.popAt && z.awake <= 0) { z.awake = 2.4; z.lastPop = t; z.popAt = t + 17 + rnd() * 8; pop(z, 110); word('POP!', z.x + 14, GY - 56, '#c8f0a8', 11); laugh(); }
    const br = Math.sin(t * 1.5), aw = z.awake > 0;
    if (aw) z.awake -= dt;
    const grow = Math.min(1, (t - z.lastPop - 0.6) / 7);
    const P = {
      hip: 19, bob: aw ? Math.max(0, Math.sin((2.4 - z.awake) * 9)) * 3 * Math.max(0, z.awake - 1.6) : br * 0.5, lean: aw ? 0.05 : -0.12 + br * 0.03, legs: [[1.25, 1.25], [1.1, 1.15]],
      arms: aw ? [[1.2 + Math.sin(t * 8) * 0.3, 0.6], [0.8, 0.5]] : [[0.25, 1.3], [0.15, 1.35]], head: aw ? -0.05 : 0.55 + br * 0.04, jaw: aw ? 0.7 : 0.45 + br * 0.3,
      mood: aw ? 'wide' : '', lid: aw ? 0 : 1, look: aw ? Math.sin(t * 7) : 0, brow: aw ? -1 : 0, hatTip: !aw, br, snot: aw ? 0 : grow > 0 ? (1 + (br + 1) * 1.6) * grow + 0.6 * grow : 0
    };
    crate(c, z.x + 2);
    if (!aw && rnd() < dt * 0.9) FX.words.push({ s: 'z', x: z.x + 10, y: GY - 62, col: '#efeacc', size: 8, t: 0, life: 2.4, rot: 0, drift: 1 });
    rig(c, z, P);
  }
  function crowTick(dt) {
    const C = S.crow; C.pt += dt;
    if (C.st === 'away' && t > C.next) { C.st = 'in'; C.pt = 0; C.x0 = 690; C.y0 = GY - 170; }
    else if (C.st === 'in') { const tp = signTop(), u = Math.min(1, C.pt / 2.2); C.x = lerp(C.x0, tp.x, ease(u)); C.y = lerp(C.y0, tp.y, ease(u)) - Math.sin(u * Math.PI) * 26; if (u >= 1) { C.st = 'perch'; C.pt = 0; } }
    else if (C.st === 'perch') { if ((C.pt > 1.4 && C.pt - dt <= 1.4) || (C.pt > 3.2 && C.pt - dt <= 3.2)) { const tp = signTop(); word('CAW!', tp.x - 10, tp.y - 14, '#efeacc', 9); } if (C.pt > 5) { const tp = signTop(); C.st = 'out'; C.pt = 0; C.x0 = tp.x; C.y0 = tp.y; } }
    else if (C.st === 'out') { const u = Math.min(1, C.pt / 2.4); C.x = lerp(C.x0, -40, u); C.y = lerp(C.y0, GY - 210, u) + Math.sin(u * Math.PI) * 8; if (u >= 1) { C.st = 'away'; C.next = t + 18 + rnd() * 10; } }
  }
  function pottyTick(dt) {
    const P = S.potty; P.pt += dt; if (P.shake > 0) P.shake -= dt;
    if (P.ph === 'shut' && t > P.next) { P.ph = 'open'; P.pt = 0; }
    else if (P.ph === 'open') { P.o = Math.min(1, P.pt / 0.45); if (P.pt > 0.45) { P.ph = 'peek'; P.pt = 0; } }
    else if (P.ph === 'peek') { if (P.pt > 2.6) { P.ph = 'close'; P.pt = 0; } }
    else if (P.ph === 'close') { P.o = Math.max(0, 1 - P.pt / 0.12); if (P.pt > 0.12) { P.ph = 'shut'; P.shake = 0.4; P.next = t + 14 + rnd() * 7; word('SLAM!', 168, GY - 64, '#efeacc', 11); } }
  }
  function bats(c) {
    const B = S.bats;
    if (t > B.next) { B.t0 = t; B.next = t + 13 + rnd() * 8; }
    const u = (t - B.t0) / 6; if (u < 0 || u > 1) return;
    const my = Math.max(26, GY - 186);
    for (let i = 0; i < 3; i++) {
      const x = -20 + (u - i * 0.04) * 700, y = my + 8 + Math.sin(u * 14 + i * 2) * 6 + i * 5, f = Math.sin(t * 24 + i * 1.7);
      c.fillStyle = '#07090c'; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 5, y - 3 * f); c.lineTo(x - 2.4, y + 0.6); c.lineTo(x, y + 1.6); c.lineTo(x + 2.4, y + 0.6); c.lineTo(x + 5, y - 3 * f); c.closePath(); c.fill();
    }
  }
  function skyLife(c) {
    for (let i = 0; i < 6; i++) { const x = (i * 113 + 37) % 640, y = ((i * 71) % Math.max(40, GY - 100)) + 8, a = 0.25 + 0.5 * Math.max(0, Math.sin(t * (1.3 + i * 0.4) + i)); c.fillStyle = 'rgba(235,229,214,' + a + ')'; c.fillRect(x, y, 1.4, 1.4); }
    S.wins.forEach(w => { if (t > w.at) { w.on = !w.on; w.at = t + 2 + rnd() * 6; } if (w.on) { c.fillStyle = 'rgba(255,200,110,.55)'; c.fillRect(w.x, GY - 30 - w.y * 50, 2.6, 3); } });
  }

  function draw(dt) {
    const c = cx; if (!c || !S) return;
    if (!sky) drawSky();
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(sky, 0, 0);
    c.setTransform(dpr * K, 0, 0, dpr * K, -VX * dpr * K, 0);
    crowTick(dt); pottyTick(dt);
    skyLife(c); bats(c);
    crane(c);
    if (S.crow.st === 'in' || S.crow.st === 'out') crowDraw(c, S.crow.x, S.crow.y, 1, Math.sin(t * 22));
    scaffold(c); wall(c); hammerer(c, dt);
    potty(c); mixer(c);
    if (rnd() < dt * 2) FX.puffs.push({ x: 198, y: GY - 37, vx: -3 + rnd() * 2, vy: -14 - rnd() * 6, r: 2, life: 2, max: 2, col: '90,90,95' });
    kevin(c, dt);
    benchCrew(c, dt);
    napper(c, dt);
    barrow(c, dt); gary(c, dt);
    cone(c, 10, GY + 10); cone(c, 398, GY + 12); cone(c, 546, GY + 11);
    workSign(c);
    // sparks, smoke and the comic words
    FX.sparks = FX.sparks.filter(p => (p.life -= dt) > 0);
    FX.sparks.forEach(p => { p.vy += 170 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > GY + 2) { p.y = GY + 2; p.vy *= -0.35; p.vx *= 0.6; } c.fillStyle = p.hot ? 'rgba(255,' + (200 + (rnd() * 55 | 0)) + ',140,' + Math.min(1, p.life * 3) + ')' : 'rgba(255,240,190,' + Math.min(1, p.life * 4) + ')'; c.fillRect(p.x, p.y, 1.4, 1.4); });
    FX.puffs = FX.puffs.filter(p => (p.life -= dt) > 0);
    FX.puffs.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 4; c.fillStyle = 'rgba(' + p.col + ',' + (0.35 * p.life / p.max) + ')'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); });
    if (S.flash) {
      const f = S.flash; c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, 70); g.addColorStop(0, 'rgba(120,190,255,' + (0.22 * f.a) + ')'); g.addColorStop(1, 'rgba(120,190,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(f.x, f.y, 70, 0, 7); c.fill();
      c.fillStyle = 'rgba(230,245,255,' + (0.9 * f.a) + ')'; c.beginPath(); c.arc(f.x, f.y, 2.2, 0, 7); c.fill();
      c.globalCompositeOperation = 'source-over';
    }
    FX.words = FX.words.filter(w => (w.t += dt) < w.life);
    FX.words.forEach(w => {
      const u = w.t, sc = w.drift ? 1 : u < 0.12 ? (u / 0.12) * 1.25 : 1.25 - Math.min(0.25, (u - 0.12) * 2), al = Math.min(1, (w.life - u) / 0.35);
      c.save(); c.globalAlpha = al * (w.drift ? 0.8 : 1);
      c.translate(w.x + (w.drift ? u * 8 + Math.sin(u * 4) * 2 : 0), w.y - u * (w.drift ? 14 : 10)); c.rotate(w.rot); c.scale(sc, sc);
      c.font = w.size + 'px "Saira Stencil One", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (!w.drift) { c.lineWidth = 3; c.strokeStyle = OUT; c.lineJoin = 'round'; c.strokeText(w.s, 0, 0); }
      c.fillStyle = w.col; c.fillText(w.s, 0, 0);
      c.restore();
    });
  }

  // the made-up progress bar: creeps up, stalls, and sometimes someone trips over the cable
  function progTick(dt) {
    if (finishing) { prog = Math.min(100, prog + dt * 120); }
    else if (progHold > 0) progHold -= dt;
    else {
      prog += dt * (0.6 + Math.random() * 2.4);
      if (Math.random() < dt * 0.15) progHold = 1 + Math.random() * 3;
      if (prog > 96 + Math.random() * 3) { prog = 55 + Math.random() * 20; stage = -1; }
    }
    const bar = el('mBar'), st = el('mStatus');
    if (bar) bar.style.width = prog.toFixed(1) + '%';
    if (st) {
      if (finishing) st.textContent = 'Done!';
      else if (stage === -1) { st.textContent = 'Someone tripped over the cable'; if (prog > 62) stage = 0; }
      else { const i = Math.floor(t / 7) % STAGES.length; st.textContent = STAGES[i] + '...'; }
    }
  }
  function frame(now) {
    raf = 0;
    if (!on) return;
    const dt = Math.min(0.1, (now - (last || now)) / 1000);
    if (now - last >= 30 || !last) {   // about 30 frames a second is plenty for this
      last = now; t += dt;
      size(); draw(dt); progTick(dt);
    }
    if (!document.hidden) raf = requestAnimationFrame(frame);
  }
  function kick() { if (on && !raf && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }

  function start() {
    const box = el('mScene'); if (!box) return;
    box.hidden = false;
    if (on) return;
    on = true; finishing = false; cv = el('mCanvas'); cx = cv.getContext('2d');
    el('mSkull').classList.remove('done');
    prog = 8 + Math.random() * 20; t = 0; W = 0; size(); newScene();
    hintCount(); buildDeck(); next();
    if (reduce()) { t = 3; draw(0); progTick(0); }
    else kick();
  }
  function stop() {
    on = false; finishing = false; clearTimeout(msgT); clearInterval(typeT);
    if (raf) cancelAnimationFrame(raf); raf = 0;
    const box = el('mScene'); if (box) box.hidden = true;
    FX.sparks = []; FX.puffs = []; FX.words = [];
  }
  // maintenance is over: the skull says so, the bar fills, then the card goes
  function done(after) {
    if (!on || finishing) { if (!on && after) after(); return; }
    finishing = true; clearTimeout(msgT); clearInterval(typeT);
    const sk = el('mSkull'); sk.classList.remove('hint'); sk.classList.add('done');
    el('mTag').hidden = true; el('mBubble').classList.remove('hint');
    el('mLine').textContent = DONE_LINE; el('mSr').textContent = DONE_LINE;
    if (reduce()) progTick(0);
    setTimeout(() => { stop(); if (after) after(); }, 3400);
  }
  document.addEventListener('visibilitychange', kick);
  addEventListener('resize', () => { if (on) { size(); if (reduce()) draw(0); } });
  const skBtn = el('mSkull');
  if (skBtn) skBtn.addEventListener('click', () => { if (on && !finishing) { if (typeof SFX !== 'undefined' && SFX.click) SFX.click(); next(); } });
  return { start, stop, done, get on() { return on; }, get finishing() { return finishing; }, hints: HINTS.length, lines: HINTS.length + JOKES.length };
})();
