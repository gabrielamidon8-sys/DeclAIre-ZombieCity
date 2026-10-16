/* ================= the armory keeper (1.9.01) =================
   He runs through 15 acts while the armory is open, picking a different one each time, with a short rest between.
   CSS (keeper.css) moves the rig; this file times his faces, speech, sounds and props. Tap the cage window and he
   reacts; equip a weapon and he gives you a thumbs up. Once in 100,000 visits (0.001%) his head glitches into the skull. */
const KEEP = (() => {
  const POEMS = [
    ["Shall I compare thee to a zombie horde?", "Thou art more rotten, and thou smell'st of feet.", "Rough winds do shake the darling buds of May...", "and also shake thine arm off. Mind the street."],
    ["To reload, or not to reload:", "that is the question.", "Whether 'tis nobler to suffer the bites and scratches...", "Eh. I'll reload."],
    ["Alas, poor Yorick! I knew him, Horatio.", "A fellow of infinite jest.", "He owed me forty bucks.", "I'm keeping his boots."],
    ["But soft! What light through yonder window breaks?", "It is the east, and the A-10 is the sun.", "Arise, fair zombies, and...", "no. Actually, please stay down."],
    ["Friends, survivors, countrymen,", "lend me your ears.", "Not literally. Put that down.", "I come to sell you shotguns, not to bury you."],
    ["Double, double, toil and trouble,", "fire burn and zombies bubble.", "Eye of newt and toe of frog...", "that'll be twelve bucks for the shells."],
    ["All the world's a stage,", "and all the men and women merely zombies.", "They have their exits and their entrances.", "Mostly entrances. Through my window."],
    ["Now is the winter of our discontent", "made glorious summer by this LMG.", "Parting is such sweet sorrow...", "It's on sale, by the way."]
  ];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const K = { on: false, act: '', last: '', timers: [], typer: 0, next: 0, sayId: 0, poem: Math.floor(Math.random() * POEMS.length), glitch: 0, busy: false };
  const box = () => $('keeper');
  function later(ms, fn) { const t = setTimeout(() => { K.timers = K.timers.filter(x => x !== t); fn(); }, ms); K.timers.push(t); return t; }
  function clearAll() { K.timers.forEach(clearTimeout); K.timers = []; clearTimeout(K.next); clearInterval(K.typer); clearInterval(K.glitch); }
  function set(attr, v) { const k = box(); if (!k) return; if (v == null) k.removeAttribute('data-' + attr); else k.setAttribute('data-' + attr, v); }
  function face(m, e, b) { set('mouth', m); set('eyes', e); set('brows', b); }
  // speech bubble beside his head, typed out; his mouth moves while it types
  function say(text, ms, verse) {
    const k = box(), s = k.querySelector('.kp-say'), p = s.querySelector('p'), h = k.querySelector('.kp-head');
    clearInterval(K.typer); s.hidden = false; s.classList.toggle('verse', !!verse); p.textContent = '';
    const kr = k.getBoundingClientRect(), hr = h.getBoundingClientRect();
    const room = kr.right - hr.right, left = room < Math.min(250, kr.width * 0.46) + 24;
    s.classList.toggle('left', left);
    s.style.top = Math.max(6, hr.top - kr.top + hr.height * 0.35) + 'px';
    if (left) { s.style.left = 'auto'; s.style.right = (kr.right - hr.left + 12) + 'px'; } else { s.style.right = 'auto'; s.style.left = (hr.right - kr.left + 12) + 'px'; }
    s.style.animation = 'none'; void s.offsetWidth; s.style.animation = '';
    let i = 0; const prev = k.getAttribute('data-mouth');
    set('mouth', 'talk');
    K.typer = setInterval(() => { i += 1; p.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(K.typer); set('mouth', prev === 'talk' ? null : prev); } }, 32);
    const id = ++K.sayId;
    later(ms || Math.max(1800, text.length * 32 + 1300), () => { if (K.sayId === id) s.hidden = true; });
  }
  function hush() { const s = box().querySelector('.kp-say'); s.hidden = true; clearInterval(K.typer); }
  function snd(kind) { try { SFX.keeper(kind); } catch (e) { } }
  function radioLine() {
    try { const i = SFX.fm.info(); if (i.mode === 'radio' && !i.muted) return 'Mm. ' + i.chName + '. My jam.'; if (i.mode === 'bt' && !i.muted) return 'Ooh, your playlist. Not bad.'; } catch (e) { }
    return 'Too quiet in here. Hm hm hmm...';
  }
  // the fifteen acts: [length in ms, what happens along the way]
  const ACTS = {
    clean: [6000, () => { face('flat'); later(2400, () => say(pick(['Clean gun, happy gun.', 'A little oil, a little love.', 'Spotless. Like my record.']))); }],
    sleep: [9500, () => {
      later(700, () => face('o', 'shut'));
      [1600, 3800, 6000].forEach(t => later(t, () => snd('snore')));
      later(8150, () => { face('o', 'wide', 'up'); snd('jolt'); });
      later(8500, () => say("I'm up! I'm up!", 1300));
    }],
    bard: [0, () => {}],
    coffee: [5500, () => {
      later(990, () => set('cup', 'hand'));
      later(2400, () => face('o', 'shut'));
      later(3600, () => face('smile', null));
      later(3700, () => say(pick(['Ahh. Battery acid.', 'Best coffee in the apocalypse.', 'Tastes like regret. Perfect.']), 1500));
      later(4540, () => set('cup', null));
    }],
    aim: [5200, () => { later(800, () => face('flat', 'wink', 'cross')); later(3500, () => say('Pew.', 1100)); later(4300, () => face(null, null, null)); }],
    coin: [4200, () => { later(1000, () => snd('flick')); later(1300, () => face('o', 'wide')); later(2700, () => { face('smile'); snd('catch'); say(pick(['Heads. You live.', 'Tails... we don\'t talk about tails.'])); }); }],
    reload: [4600, () => { later(1300, () => set('mag', 'hand')); later(2620, () => { set('mag', null); snd('click'); }); later(3200, () => { face('smile'); say('Locked and loaded.', 1300); }); }],
    paper: [7500, () => {
      const t = box().querySelector('.kp-paper text:nth-of-type(2)');
      if (t) t.textContent = 'ZOMBIES: STILL A PROBLEM';
      later(3220, () => { if (t) t.textContent = pick(['LOCAL MAN STILL IN CAGE', 'SHOTGUN SALE: NO REFUNDS', 'HOROSCOPE: YOU WILL BE BITTEN']); });
      later(4800, () => { face('flat', null, 'up'); say(pick(["...What? I'm on break.", 'Says here we\'re doomed. Again.']), 1700); });
      later(6400, () => face(null, null, null));
    }],
    wave: [3600, () => { face('smile', null, 'up'); later(400, () => say(pick(['Back for more?', 'Welcome to the cage.', 'Browse. Don\'t touch.', 'Hey there, survivor.']), 2400)); }],
    tunes: [7200, () => { face('smile', null); later(900, () => say(radioLine(), 2600)); later(3800, () => face('smile', 'shut')); }],
    sharpen: [6200, () => {
      [1250, 2150, 3050, 3950, 4850].forEach(t => later(t, () => snd('shing')));
      later(5200, () => say('Sharp enough to split a hair. Or a zombie.', 1700));
    }],
    fly: [7400, () => {
      later(300, () => snd('buzz'));
      later(1400, () => { face('flat', null, 'cross'); say('Hold still...', 1500); });
      later(4580, () => { face('o', 'wide'); snd('slap'); });
      later(5000, () => { face('flat', 'shut', 'up'); say('...Ow.', 1600); });
      later(6800, () => face(null, null, null));
    }],
    juggle: [7000, () => { face('grin'); later(800, () => say("Don't try this at home.", 2000)); later(6200, () => face('smile')); }],
    blackout: [4800, () => { later(100, () => snd('flicker')); later(700, () => face('grin')); later(3900, () => say('Boo.', 1100)); }],
    thumbs: [3200, (o) => { face('grin', 'wink'); later(500, () => say(o && o.line || pick(['Good choice.', 'Fine piece of steel.', "She'll treat you right."]), 2200)); }]
  };
  const ROTATION = Object.keys(ACTS);
  function end() {
    hush(); set('act', null); set('cup', null); set('mag', null); face(null, null, null);
    K.act = ''; K.busy = false;
    if (K.on) K.next = setTimeout(nextAct, 2600 + Math.random() * 3200);
  }
  function play(name, opts) {
    const k = box(); if (!k || !K.on) return;
    clearAll(); hush(); set('act', null); face(null, null, null); void k.offsetWidth;
    K.act = name; K.last = name; K.busy = true;
    if (name === 'bard') return bard();
    const a = ACTS[name]; set('act', name); a[1](opts);
    later(a[0], end);
  }
  // the bard: "Ahem.", four lines of verse, then a bow
  function bard() {
    const poem = POEMS[K.poem]; K.poem = (K.poem + 1) % POEMS.length;
    let t = 1500; const times = [];
    poem.forEach(line => { times.push(t); t += line.length * 32 + 1700; });
    const dur = t + 400; box().style.setProperty('--dur', dur + 'ms');
    set('act', 'bard'); face(null, null, 'up');
    later(250, () => say('Ahem.', 1100));
    poem.forEach((line, i) => later(times[i], () => { face(null, i % 2 ? 'shut' : null, 'up'); say(line, line.length * 32 + 1550, true); }));
    later(dur, () => { set('act', 'bardbow'); face('smile', 'shut'); say(pick(['Thank you. Thank you. No refunds.', "I'm here all apocalypse.", 'Hold your applause. Literally, you might drop something.']), 2500); snd('applause'); });
    later(dur + 2700, end);
  }
  // a shuffled deck: every act plays once before any repeats
  let deck = [];
  function nextAct() {
    if (!K.on) return;
    if (!deck.length) { deck = ROTATION.slice().sort(() => Math.random() - 0.5); if (deck[0] === K.last) deck.push(deck.shift()); }
    play(deck.shift());
  }
  // the 0.001% one: his head tears apart into the skull, laughs, then he's back and none the wiser
  function skull() {
    const k = box(); if (!k) return;
    K.on = true; clearAll(); hush(); face(null, null, null); set('act', 'skull'); K.act = 'skull'; K.busy = true;
    const gT = k.querySelector('#kpGT'), gD = k.querySelector('#kpGD'), gR = k.querySelector('#kpGR'), gB = k.querySelector('#kpGB');
    const bars = [...k.querySelectorAll('.kp-glitch i')], err = k.querySelector('.kp-glitch b');
    const t0 = performance.now(); let headSkull = false;
    const lvl = s => s < 0.7 ? 0.3 : s < 1.15 ? 1 : s < 4.0 ? (Math.random() < 0.09 ? 0.8 : 0.05) : s < 4.8 ? 1 : 0;
    k.classList.add('glitching'); snd('glitch');
    K.glitch = setInterval(() => {
      const s = (performance.now() - t0) / 1000, L = lvl(s), r = Math.random;
      gD.setAttribute('scale', (L * (8 + r() * 34)).toFixed(1));
      gT.setAttribute('baseFrequency', '0.0015 ' + (0.15 + r() * 1.1).toFixed(2)); gT.setAttribute('seed', String((r() * 99) | 0));
      const o = L * (2 + r() * 7); gR.setAttribute('dx', o.toFixed(1)); gB.setAttribute('dx', (-o).toFixed(1));
      k.style.setProperty('--gx', ((r() - 0.5) * L * 10).toFixed(1) + 'px');
      bars.forEach(b => { const on = r() < L * 0.7; b.style.opacity = on ? (0.25 + r() * 0.5).toFixed(2) : '0'; if (on) { b.style.top = (r() * 96).toFixed(1) + '%'; b.style.height = (2 + r() * 14).toFixed(0) + 'px'; b.style.background = pick(['#00e5ff', '#ff00c8', '#ffffff', '#ff3b4f']); b.style.transform = 'translateX(' + ((r() - 0.5) * 40).toFixed(0) + 'px)'; } });
      err.style.opacity = s > 1.2 && s < 4.0 && r() < 0.75 ? '1' : '0';
      // the head flickers between the two, then stays a skull
      const want = s < 0.6 ? r() < 0.15 : s < 1.15 ? r() < 0.55 : s < 4.1 ? true : s < 4.75 ? r() < 0.5 : false;
      if (want !== headSkull) { headSkull = want; set('head', want ? 'skull' : null); }
      if (s > 5.6) {
        clearInterval(K.glitch); k.classList.remove('glitching'); set('head', null); k.style.removeProperty('--gx');
        bars.forEach(b => { b.style.opacity = '0'; }); err.style.opacity = '0'; gD.setAttribute('scale', '0'); gR.setAttribute('dx', '0'); gB.setAttribute('dx', '0');
        set('act', null); face('flat', 'wide', 'up'); say('...Did the lights just flicker?', 2200);
        later(2600, end);
      }
    }, 55);
    later(1250, () => SFX.laugh());
    later(4050, () => snd('glitch'));
    store.set('zc_keeper', (store.get('zc_keeper', 0) | 0) + 1);
  }
  function start() {
    const k = box(); if (!k) return;
    K.on = true; clearAll(); set('act', null); face(null, null, null);
    // the clock on the wall shows the real time
    const d = new Date(), m = d.getMinutes() + d.getSeconds() / 60, h = (d.getHours() % 12) + m / 60;
    const hm = k.querySelector('.kp-clk-m'), hh = k.querySelector('.kp-clk-h'), hs = k.querySelector('.kp-clk-s');
    if (hm) hm.style.setProperty('--r0', (m * 6).toFixed(1) + 'deg'); if (hh) hh.style.transform = 'rotate(' + (h * 30).toFixed(1) + 'deg)'; if (hs) hs.style.setProperty('--r0', (d.getSeconds() * 6) + 'deg');
    if (Math.random() < 0.00001) { later(1200 + Math.random() * 2500, skull); return; }
    K.next = setTimeout(nextAct, 900 + Math.random() * 1400);
  }
  function stop() { K.on = false; K.act = ''; K.busy = false; clearAll(); const k = box(); if (!k) return; hush(); k.classList.remove('glitching'); ['act', 'cup', 'mag', 'head', 'mouth', 'eyes', 'brows'].forEach(a => set(a, null)); }
  function poke() {
    snd('bell');
    if (!K.on || K.busy) return;
    play(pick(['wave', 'thumbs', 'coin', 'aim', 'blackout', 'fly', 'tunes']));
  }
  function approve() { if (K.on && K.act !== 'skull') play('thumbs', { line: pick(['Good choice.', 'Excellent taste.', 'That one bites back.']) }); }
  return { start, stop, play, skull, poke, approve, acts: ROTATION.slice(), state: () => ({ on: K.on, act: K.act }) };
})();
