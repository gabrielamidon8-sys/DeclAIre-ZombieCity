/* ================= the maintenance screen: a construction site =================
   While the game is shut for an update, the maintenance card shows the crew building it: zombie workers in hard hats
   carrying planks, hammering on the scaffold, wheeling bones about, welding "a fine zombie" together on the bench
   (who sits up and waves now and then), one asleep on a crate, and the crane swinging the new version's sign.
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
  let W = 0, H = 0, dpr = 1, cv = null, cx = null, sky = null, sparks = [], zzz = [], dust = [], prog = 0, progHold = 0, stage = 0, lastTink = 0;
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

  /* ---------- the scene ---------- */
  function size() {
    if (!cv) return;
    const w = cv.clientWidth || 300, short = innerHeight < 520;
    const h = Math.round(Math.max(130, Math.min(short ? innerHeight * 0.4 : 230, w * (short ? 0.5 : w < 520 ? 0.5 : 0.38))));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w === W && h === H && cv.width === Math.round(w * dpr)) return;
    W = w; H = h; cv.style.height = h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    sky = null;
  }
  // the skyline behind the site, drawn once per size (same city every time)
  function drawSky() {
    sky = document.createElement('canvas'); sky.width = cv.width; sky.height = cv.height;
    const c = sky.getContext('2d'); c.scale(dpr, dpr);
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#10151c'); g.addColorStop(0.62, '#1d1a1d'); g.addColorStop(1, '#3a2418');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(235,229,214,.55)'; c.beginPath(); c.arc(W * 0.12, H * 0.2, Math.max(6, H * 0.05), 0, 7); c.fill();
    c.fillStyle = '#10151c'; c.beginPath(); c.arc(W * 0.12 + H * 0.02, H * 0.19, Math.max(6, H * 0.05), 0, 7); c.fill();
    let r = 7; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    const gy = H * 0.86;
    for (let pass = 0; pass < 2; pass++) {
      let x = -10;
      while (x < W + 10) {
        const bw = (pass ? 22 : 16) + rnd() * (pass ? 40 : 30), bh = H * (pass ? 0.18 : 0.28) + rnd() * H * (pass ? 0.3 : 0.32);
        c.fillStyle = pass ? '#0c0f13' : '#151a21';
        c.fillRect(x, gy - bh, bw, bh + 2);
        if (rnd() < 0.3) { c.fillRect(x + bw * 0.3, gy - bh - 8, 2, 8); }        // antenna
        if (rnd() < 0.35) { c.fillStyle = pass ? '#0c0f13' : '#151a21'; c.beginPath(); c.moveTo(x + bw * 0.6, gy - bh); c.lineTo(x + bw, gy - bh + 7); c.lineTo(x + bw, gy - bh); c.fill(); } // broken top
        for (let wy = gy - bh + 6; wy < gy - 6; wy += 8) for (let wx = x + 4; wx < x + bw - 4; wx += 7)
          if (rnd() < (pass ? 0.06 : 0.035)) { c.fillStyle = rnd() < 0.7 ? 'rgba(255,196,90,.55)' : 'rgba(255,90,60,.5)'; c.fillRect(wx, wy, 2.5, 3); }
        x += bw + rnd() * 6;
      }
    }
    // the ground
    c.fillStyle = '#1b1915'; c.fillRect(0, gy, W, H - gy);
    c.fillStyle = '#2b2720'; c.fillRect(0, gy, W, 2);
    for (let i = 0; i < W / 3; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(80,70,55,.5)' : 'rgba(0,0,0,.35)'; c.fillRect(rnd() * W, gy + 3 + rnd() * (H - gy - 4), 2, 1.5); }
  }

  // a zombie worker: hard hat, hi-vis vest, arms out (or busy)
  function mWorker(c, x, gy, s, dir, walk, pose, k) {
    c.save(); c.translate(x, gy); c.scale(dir * s, s);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const sw = Math.sin(walk), bob = pose === 'sit' ? 0 : Math.abs(Math.cos(walk)) * 1.5;
    c.translate(0, -bob);
    // legs
    c.strokeStyle = '#2b3240'; c.lineWidth = 5;
    if (pose === 'sit') { c.beginPath(); c.moveTo(-3, -20); c.lineTo(10, -20); c.lineTo(11, -4); c.moveTo(1, -20); c.lineTo(14, -18); c.lineTo(16, -3); c.stroke(); }
    else { c.beginPath(); c.moveTo(-2, -21); c.lineTo(-2 + sw * 6, 0); c.moveTo(2, -21); c.lineTo(2 - sw * 6, 0); c.stroke(); }
    c.fillStyle = '#16181c'; if (pose !== 'sit') { c.fillRect(-5 + sw * 6, -2, 7, 3); c.fillRect(-1 - sw * 6, -2, 7, 3); }
    // the back arm
    const sh = { x: 2, y: -40 };
    c.strokeStyle = '#6f8a5c'; c.lineWidth = 3.6;
    const arm = (ax, ay) => { c.beginPath(); c.moveTo(sh.x, sh.y); c.lineTo(ax, ay); c.stroke(); };
    if (pose === 'walk') arm(16, -38 + Math.sin(walk * 0.5) * 2);
    // body: torn shirt under a hi-vis vest
    c.fillStyle = '#4b5a63'; c.fillRect(-8, -44, 16, 25);
    c.fillStyle = '#ff8a1a'; c.beginPath(); c.moveTo(-8, -44); c.lineTo(-2, -44); c.lineTo(1, -32); c.lineTo(4, -44); c.lineTo(8, -44); c.lineTo(8, -20); c.lineTo(-8, -20); c.closePath(); c.fill();
    c.fillStyle = '#f4f1d0'; c.fillRect(-8, -30, 16, 2); c.fillRect(-8, -25, 16, 2);
    c.strokeStyle = '#1a1210'; c.lineWidth = 1; c.strokeRect(-8, -44, 16, 24);
    // head
    c.save(); if (pose === 'sit') { c.translate(2, -46); c.rotate(0.45); c.translate(-2, 46); }
    c.fillStyle = '#7f9a6a'; c.strokeStyle = '#1a1210'; c.lineWidth = 1.4;
    c.beginPath(); c.arc(2, -51, 7.5, 0, 7); c.fill(); c.stroke();
    if (pose === 'weld') { c.fillStyle = '#20252b'; c.fillRect(1, -56, 9, 10); c.fillStyle = 'rgba(120,200,255,.8)'; c.fillRect(4, -53, 5, 2); }
    else if (pose === 'sit') { c.strokeStyle = '#1a1210'; c.beginPath(); c.moveTo(4, -51); c.lineTo(8, -51); c.stroke(); }
    else { c.fillStyle = '#ffdf7a'; c.beginPath(); c.arc(6, -52, 1.4, 0, 7); c.fill(); c.strokeStyle = '#3b2c20'; c.beginPath(); c.moveTo(4, -47); c.lineTo(8, -47); c.moveTo(-2, -52); c.lineTo(-1, -48); c.stroke(); }
    // hard hat (tipped over the eyes when asleep)
    c.fillStyle = '#f2cc3a'; c.strokeStyle = '#1a1210'; c.lineWidth = 1.2;
    c.beginPath(); c.arc(2, -54, 8.5, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
    c.fillRect(-8, -55, 21, 2.6); c.strokeRect(-8, -55, 21, 2.6);
    c.restore();
    // the front arm and whatever it's holding
    c.strokeStyle = '#7f9a6a'; c.lineWidth = 3.6;
    if (pose === 'walk') arm(17, -36 + Math.sin(walk * 0.5 + 1) * 2);
    else if (pose === 'carry') { arm(10, -47); arm(14, -46); }
    else if (pose === 'push') { arm(16, -30); arm(17, -29); }
    else if (pose === 'weld') { arm(15, -36); c.strokeStyle = '#2a2d33'; c.lineWidth = 3; c.beginPath(); c.moveTo(15, -36); c.lineTo(22, -32); c.stroke(); }
    else if (pose === 'sit') { arm(8, -26); }
    else if (pose === 'hammer') {
      arm(14, -34);
      const a = -1.9 + (0.5 + 0.5 * Math.sin(k)) * 2.1, hx = sh.x + Math.cos(a) * 12, hy = sh.y + Math.sin(a) * 12;
      c.strokeStyle = '#7f9a6a'; arm(hx, hy);
      c.save(); c.translate(hx, hy); c.rotate(a + Math.PI / 2);
      c.strokeStyle = '#8a5a2b'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -10); c.stroke();
      c.fillStyle = '#9aa3ad'; c.fillRect(-4, -13, 8, 4);
      c.restore();
    }
    c.restore();
  }
  function mPlank(c, x, y, s, dir) { c.save(); c.translate(x, y); c.scale(dir * s, s); c.fillStyle = '#b07a3e'; c.strokeStyle = '#3a2412'; c.lineWidth = 1; c.fillRect(-22, -51, 50, 5); c.strokeRect(-22, -51, 50, 5); c.restore(); }
  function mBarrow(c, x, gy, s, dir) {
    c.save(); c.translate(x, gy); c.scale(dir * s, s); c.lineWidth = 1.4; c.strokeStyle = '#1a1210';
    c.fillStyle = '#5b6b78'; c.beginPath(); c.moveTo(18, -22); c.lineTo(46, -22); c.lineTo(40, -10); c.lineTo(22, -10); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#e8dfc8'; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(24 + i * 5.5, -23 - (i % 2) * 2, 4, 1.8, (i - 1.5) * 0.4, 0, 7); c.fill(); c.stroke(); }
    c.beginPath(); c.arc(36, -27, 3.6, 0, 7); c.fill(); c.stroke(); // a little skull on top
    c.fillStyle = '#1a1210'; c.fillRect(34.5, -28, 1.2, 1.2); c.fillRect(37, -28, 1.2, 1.2);
    c.strokeStyle = '#3a3f46'; c.lineWidth = 2; c.beginPath(); c.moveTo(16, -29); c.lineTo(24, -12); c.moveTo(40, -10); c.lineTo(42, -4); c.stroke();
    c.fillStyle = '#22262b'; c.beginPath(); c.arc(42, -4, 4, 0, 7); c.fill();
    c.restore();
  }

  function draw(dt) {
    const c = cx; if (!c) return;
    if (!sky) drawSky();
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(sky, 0, 0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gy = H * 0.86, s = H / 190;
    // crane: tower, jib, trolley and the swinging sign
    const tx = W * 0.86, jy = H * 0.1, jx0 = W * 0.38, jx1 = Math.min(W - 4, W * 0.95);
    c.strokeStyle = '#c99a1f'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(tx - 5, gy); c.lineTo(tx - 5, jy); c.moveTo(tx + 5, gy); c.lineTo(tx + 5, jy);
    for (let y = gy, i = 0; y > jy + 8; y -= 10, i++) { c.moveTo(tx - 5, y); c.lineTo(tx + 5, y - 10); }
    c.moveTo(jx0, jy); c.lineTo(jx1, jy); c.moveTo(jx0 + 10, jy + 7); c.lineTo(jx1, jy + 7);
    for (let x = jx0 + 10; x < jx1 - 8; x += 10) { c.moveTo(x, jy + 7); c.lineTo(x + 5, jy); c.lineTo(x + 10, jy + 7); }
    c.moveTo(tx, jy); c.lineTo(tx, jy - 12); c.lineTo(jx0 + 10, jy); c.moveTo(tx, jy - 12); c.lineTo(jx1, jy);
    c.stroke();
    c.fillStyle = '#3b4148'; c.fillRect(jx1 - 16, jy + 7, 14, 10);
    c.fillStyle = '#f2cc3a'; c.fillRect(tx - 8, jy + 7, 16, 11); c.fillStyle = 'rgba(160,220,255,.55)'; c.fillRect(tx - 5, jy + 9, 7, 5);
    if (Math.sin(t * 3) > 0.6) { c.fillStyle = '#ff3b2f'; c.beginPath(); c.arc(tx, jy - 13, 2, 0, 7); c.fill(); }
    const trol = W * 0.6 + Math.sin(t * 0.22) * W * 0.08, len = H * 0.13 + Math.sin(t * 0.37) * H * 0.04, sw = Math.sin(t * 1.25) * 0.07;
    c.fillStyle = '#3b4148'; c.fillRect(trol - 6, jy + 6, 12, 5);
    const hx = trol + Math.sin(sw) * len, hy = jy + 11 + Math.cos(sw) * len;
    c.strokeStyle = '#8b9096'; c.lineWidth = 1; c.beginPath(); c.moveTo(trol - 2, jy + 11); c.lineTo(hx - 2, hy); c.moveTo(trol + 2, jy + 11); c.lineTo(hx + 2, hy); c.stroke();
    c.save(); c.translate(hx, hy); c.rotate(sw * 0.6);
    const pw = 64 * s, ph = 30 * s;
    c.strokeStyle = '#8b9096'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-pw * 0.4, 6 * s); c.moveTo(0, 0); c.lineTo(pw * 0.4, 6 * s); c.stroke();
    c.fillStyle = '#1b1f24'; c.fillRect(-pw / 2, 6 * s, pw, ph);
    c.save(); c.beginPath(); c.rect(-pw / 2, 6 * s, pw, ph); c.clip();
    c.fillStyle = '#f2cc3a'; for (let i = -6; i < 10; i++) { c.beginPath(); c.moveTo(-pw / 2 + i * 9 * s, 6 * s); c.lineTo(-pw / 2 + i * 9 * s + 4.5 * s, 6 * s); c.lineTo(-pw / 2 + i * 9 * s - 6 * s, 6 * s + ph); c.lineTo(-pw / 2 + i * 9 * s - 10.5 * s, 6 * s + ph); c.fill(); }
    c.fillStyle = '#1b1f24'; c.fillRect(-pw / 2 + 4 * s, 10 * s, pw - 8 * s, ph - 8 * s);
    c.restore();
    c.fillStyle = '#f2cc3a'; c.font = Math.round(19 * s) + 'px "Saira Stencil One", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(NEXT, 0, 6 * s + ph / 2 + 1);
    c.restore();

    // scaffold with a worker hammering on top
    const sx0 = W * 0.05, sx1 = W * 0.05 + 70 * s, l1 = gy - 38 * s, l2 = gy - 76 * s;
    c.strokeStyle = '#7d858e'; c.lineWidth = 1.6;
    c.beginPath();
    [sx0, (sx0 + sx1) / 2, sx1].forEach(x => { c.moveTo(x, gy); c.lineTo(x, l2 - 16 * s); });
    c.moveTo(sx0, gy); c.lineTo((sx0 + sx1) / 2, l1); c.lineTo(sx1, gy); c.moveTo(sx0, l1); c.lineTo((sx0 + sx1) / 2, l2); c.lineTo(sx1, l1);
    c.moveTo(sx0, l2 - 14 * s); c.lineTo(sx1, l2 - 14 * s);
    c.stroke();
    c.fillStyle = '#9c6b35'; c.fillRect(sx0 - 4, l1, sx1 - sx0 + 8, 3.5 * s); c.fillRect(sx0 - 4, l2, sx1 - sx0 + 8, 3.5 * s);
    // a half-built brick wall next to it, growing as the bar fills
    const bw = 9 * s, bh = 5 * s, rows = Math.max(2, Math.round(8 * Math.min(1, 0.3 + prog / 100)));
    for (let r = 0; r < rows; r++) for (let i = 0; i < 4; i++) {
      c.fillStyle = (r + i) % 3 ? '#7a3b2a' : '#8c4632'; c.fillRect(sx1 + 6 + i * bw + (r % 2 ? bw / 2 : 0), gy - (r + 1) * bh, bw - 1, bh - 1);
    }
    const hk = t * 7;
    mWorker(c, sx0 + 26 * s, l2, s, 1, 0, 'hammer', hk);
    if (Math.sin(hk) < -0.92 && t - lastTink > 0.4) { lastTink = t; for (let i = 0; i < 5; i++) sparks.push({ x: sx0 + 26 * s + 13 * s, y: l2 - 2, vx: (Math.random() - 0.3) * 60, vy: -40 - Math.random() * 50, life: 0.35, hot: 0 }); }

    // the bench: a fine zombie being welded together under a work lamp
    const bx = W * 0.5, by = gy - 20 * s, bwid = 72 * s;
    c.fillStyle = 'rgba(255,230,150,.08)'; c.beginPath(); c.moveTo(bx - 4 * s, gy - 70 * s); c.lineTo(bx - bwid * 0.75, by + 2); c.lineTo(bx + bwid * 0.6, by + 2); c.closePath(); c.fill();
    c.strokeStyle = '#4a4f55'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(bx - bwid * 0.55, gy); c.lineTo(bx - bwid * 0.55, gy - 74 * s); c.lineTo(bx - 4 * s, gy - 72 * s); c.stroke();
    c.fillStyle = '#e8dcae'; c.beginPath(); c.arc(bx - 4 * s, gy - 70 * s, 3 * s, 0, 7); c.fill();
    c.fillStyle = '#3d3a35'; c.fillRect(bx - bwid / 2, by, bwid, 4 * s);
    c.strokeStyle = '#2a2723'; c.lineWidth = 2.4 * s; c.beginPath(); c.moveTo(bx - bwid / 2 + 4 * s, by + 4 * s); c.lineTo(bx - bwid / 2 + 4 * s, gy); c.moveTo(bx + bwid / 2 - 4 * s, by + 4 * s); c.lineTo(bx + bwid / 2 - 4 * s, gy); c.stroke();
    // the fine zombie: lying down, sitting up to wave every 13 s or so
    const cyc = t % 13, up = cyc > 9 && cyc < 12 ? Math.sin(Math.min(1, (cyc - 9) / 0.5, (12 - cyc) / 0.5) * Math.PI / 2) : 0;
    c.save(); c.translate(bx + 6 * s, by); c.scale(s, s); c.lineCap = 'round';
    c.strokeStyle = '#3e4a6b'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, -3); c.lineTo(24, -3); c.moveTo(0, -1); c.lineTo(24, -1); c.stroke(); // legs
    c.fillStyle = '#16181c'; c.fillRect(23, -7, 4, 7);
    c.rotate(up * 1.35);
    c.fillStyle = '#6d4a7a'; c.fillRect(-26, -9, 26, 9); // shirt
    c.strokeStyle = '#1a1210'; c.lineWidth = 1; c.strokeRect(-26, -9, 26, 9);
    c.strokeStyle = '#e8dfc8'; c.lineWidth = 0.9; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-22 + i * 6, -9); c.lineTo(-22 + i * 6, 0); c.stroke(); } // stitches
    c.fillStyle = '#86a271'; c.strokeStyle = '#1a1210'; c.lineWidth = 1.2; c.beginPath(); c.arc(-32, -5, 7, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#9aa3ad'; c.fillRect(-27, -3, 4, 2); c.fillRect(-27, -9, 4, 2); // neck bolts
    c.strokeStyle = '#1a1210'; c.beginPath(); c.moveTo(-36, -7); c.lineTo(-33, -6); c.moveTo(-31, -7); c.lineTo(-28, -6); c.stroke();
    if (up > 0.5) { c.fillStyle = '#ffdf7a'; c.beginPath(); c.arc(-34, -7, 1.1, 0, 7); c.arc(-30, -7, 1.1, 0, 7); c.fill(); }
    c.strokeStyle = '#86a271'; c.lineWidth = 3.4;
    const wave = up > 0.5 ? Math.sin(t * 12) * 0.5 : 0;
    c.beginPath(); c.moveTo(-14, -8); c.lineTo(-14 - Math.cos(1.2 + wave * up) * 14 * (0.3 + up), -8 - Math.sin(1.2 + wave * up) * 14 * up - 2); c.stroke();
    c.restore();
    // the welder and his sparks
    const wx = bx + bwid / 2 + 16 * s;
    mWorker(c, wx, gy, s, -1, 0, 'weld', 0);
    const welding = up === 0 && (t % 3) < 2.2;
    if (welding) {
      const tipx = wx - 22 * s, tipy = gy - 32 * s;
      const fl = 0.6 + Math.random() * 0.4, rg = c.createRadialGradient(tipx, tipy, 0, tipx, tipy, 22 * s);
      rg.addColorStop(0, 'rgba(200,235,255,' + (0.55 * fl) + ')'); rg.addColorStop(1, 'rgba(120,190,255,0)');
      c.fillStyle = rg; c.beginPath(); c.arc(tipx, tipy, 22 * s, 0, 7); c.fill();
      if (Math.random() < 0.7) sparks.push({ x: tipx, y: tipy, vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 60, life: 0.4 + Math.random() * 0.4, hot: 1 });
    }

    // the sleeper on a crate, by the crane
    const zx = Math.min(W * 0.78, tx - 30 * s);
    c.fillStyle = '#7a5530'; c.fillRect(zx - 12 * s, gy - 18 * s, 26 * s, 18 * s); c.strokeStyle = '#3a2412'; c.lineWidth = 1; c.strokeRect(zx - 12 * s, gy - 18 * s, 26 * s, 18 * s);
    c.beginPath(); c.moveTo(zx - 12 * s, gy - 18 * s); c.lineTo(zx + 14 * s, gy); c.stroke();
    mWorker(c, zx - 4 * s, gy - 16 * s, s, 1, 0, 'sit', 0);
    if (Math.random() < dt * 0.9) zzz.push({ x: zx + 4 * s, y: gy - 62 * s, a: 0 });

    // two on the ground: one carrying a plank, one wheeling bones
    const span = W * 0.7, p1 = (t * 18 * s) % (span * 2), d1 = p1 < span ? 1 : -1, x1 = W * 0.1 + (p1 < span ? p1 : span * 2 - p1);
    mPlank(c, x1, gy, s, d1); mWorker(c, x1, gy, s, d1, t * 6, 'carry', 0);
    if (W > 360) {
      const span2 = W * 0.5, p2 = (t * 11 * s + span2 * 0.7) % (span2 * 2), d2 = p2 < span2 ? -1 : 1, x2 = W * 0.22 + (p2 < span2 ? span2 - p2 : p2 - span2);
      mBarrow(c, x2, gy, s, d2); mWorker(c, x2, gy, s, d2, t * 4.5, 'push', 0);
      if (Math.random() < dt * 3) dust.push({ x: x2 + d2 * 42 * s, y: gy - 2, a: 0.5, r: 2 });
    }

    // cones and a striped barrier up front
    const cone = x => { c.fillStyle = '#ff6a1a'; c.beginPath(); c.moveTo(x, gy - 15 * s); c.lineTo(x + 6 * s, gy); c.lineTo(x - 6 * s, gy); c.closePath(); c.fill(); c.fillStyle = '#f4f1d0'; c.fillRect(x - 3.4 * s, gy - 8 * s, 6.8 * s, 2.4 * s); c.fillStyle = '#2a2723'; c.fillRect(x - 8 * s, gy - 1.5, 16 * s, 2); };
    cone(W * 0.035); cone(W * 0.965); cone(W * 0.68);
    const bx0 = W * 0.27, bw2 = 40 * s;
    if (W > 300) {
      c.strokeStyle = '#3a3f46'; c.lineWidth = 2; c.beginPath(); c.moveTo(bx0 + 3, gy); c.lineTo(bx0 + 6, gy - 13 * s); c.moveTo(bx0 + bw2 - 3, gy); c.lineTo(bx0 + bw2 - 6, gy - 13 * s); c.stroke();
      c.save(); c.beginPath(); c.rect(bx0, gy - 18 * s, bw2, 6 * s); c.clip(); c.fillStyle = '#f4f1d0'; c.fillRect(bx0, gy - 18 * s, bw2, 6 * s);
      c.fillStyle = '#e8401c'; for (let i = -1; i < 8; i++) { c.beginPath(); c.moveTo(bx0 + i * 8 * s, gy - 12 * s); c.lineTo(bx0 + i * 8 * s + 4 * s, gy - 18 * s); c.lineTo(bx0 + i * 8 * s + 8 * s, gy - 18 * s); c.lineTo(bx0 + i * 8 * s + 4 * s, gy - 12 * s); c.fill(); }
      c.restore();
    }

    // particles: sparks, Zzz and dust
    sparks = sparks.filter(p => (p.life -= dt) > 0);
    sparks.forEach(p => { p.vy += 160 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > gy) { p.y = gy; p.vy *= -0.3; } c.fillStyle = p.hot ? 'rgba(255,' + (200 + Math.round(55 * Math.random())) + ',140,' + Math.min(1, p.life * 3) + ')' : 'rgba(255,240,190,' + Math.min(1, p.life * 4) + ')'; c.fillRect(p.x, p.y, 1.6, 1.6); });
    zzz = zzz.filter(z => (z.a += dt * 0.35) < 1);
    c.font = Math.round(9 * s) + 'px "Share Tech Mono", monospace'; c.textAlign = 'left';
    zzz.forEach(z => { c.fillStyle = 'rgba(235,229,214,' + (0.75 * (1 - z.a)) + ')'; c.fillText('z', z.x + z.a * 10 * s + Math.sin(z.a * 7) * 2, z.y - z.a * 22 * s); });
    dust = dust.filter(d => (d.a -= dt * 0.8) > 0);
    dust.forEach(d => { d.r += dt * 8; c.fillStyle = 'rgba(140,120,95,' + (d.a * 0.5) + ')'; c.beginPath(); c.arc(d.x, d.y - d.r * 0.4, d.r, 0, 7); c.fill(); });
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
    prog = 8 + Math.random() * 20; t = Math.random() * 20; W = 0; size();
    hintCount(); buildDeck(); next();
    if (reduce()) { draw(0); progTick(0); }
    else kick();
  }
  function stop() {
    on = false; finishing = false; clearTimeout(msgT); clearInterval(typeT);
    if (raf) cancelAnimationFrame(raf); raf = 0;
    const box = el('mScene'); if (box) box.hidden = true;
    sparks = []; zzz = []; dust = [];
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
