/* ================= name filter =================
   Every name a player types (their callsign, their DeclAIre account name, the name teammates see in co-op) and every
   name shown from someone else (the global board) goes through here. It catches slurs, swearing, sexual words and
   threats even when they are hidden with numbers or symbols, spaces, dots or stretched letters, without tripping on
   ordinary words that happen to contain one. It also keeps personal details out of public names (emails, phone
   numbers, links) and keeps names that pretend to be the DeclAIre team for the team.
   Someone who keeps trying gets a different joke each time, 50 of them. The word data is in filterdata.js.
   Shared by the game and the account page. */
const ZCF = (function () {
  const unpack = s => { try { return atob(s).replace(/[a-z]/g, c => String.fromCharCode((c.charCodeAt(0) - 84) % 26 + 97)).split(' ').filter(Boolean); } catch (e) { return []; } };
  const D = typeof ZCF_DATA !== 'undefined' ? ZCF_DATA : { sub: '', word: '', mask: '' };
  let SUB = unpack(D.sub), WORD = new Set(unpack(D.word)), MASK = unpack(D.mask).sort((a, b) => b.length - a.length);
  // the account page has no built-in list: it loads the public list and hands the words over here
  function setWords(sub, word, mask) { SUB = sub.slice(); WORD = new Set(word); MASK = mask.slice().sort((a, b) => b.length - a.length); }
  // look-alike characters, two readings where a character can stand for two letters
  const LEET_A = { '0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a', '5': 's', '6': 'g', '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's', '!': 'i', '|': 'i', '+': 't', '\u20ac': 'e', '\u00a3': 'l', '\u00a1': 'i' };
  const LEET_B = Object.assign({}, LEET_A, { '1': 'l', '|': 'l', '!': 'l', '9': 'q', '6': 'b' });
  function letters(raw, map) {
    const s = String(raw || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    let out = '';
    for (const ch of s) out += map[ch] || ch;
    return out;
  }
  const squash = s => s.replace(/[^a-z]/g, '');
  const unmask = s => { for (const m of MASK) if (s.includes(m)) s = s.split(m).join('#'); return s; };
  // words in the name: split on anything that isn't a letter, then glue runs of single letters back together (A.S.S, F U)
  function tokens(s) {
    const parts = s.split(/[^a-z]+/).filter(Boolean), out = parts.slice();
    let run = '';
    for (const p of parts.concat([''])) { if (p.length === 1) run += p; else { if (run.length > 1) out.push(run); run = ''; } }
    return out;
  }
  // letters stretched out (FUUUUN) are read both squeezed to one and to two, so ordinary double letters stay as they are
  function rudeIn(s0) {
    for (const s of [s0, s0.replace(/([a-z])\1{2,}/g, '$1'), s0.replace(/([a-z])\1{2,}/g, '$1$1')]) {
      const sq = squash(s), um = unmask(sq);
      for (const w of SUB) if (um.includes(w)) return true;
      const tk = tokens(s); tk.push(sq);
      for (const t of tk) if (WORD.has(t)) return true;
    }
    return false;
  }
  function isRude(raw) { return rudeIn(letters(raw, LEET_A)) || rudeIn(letters(raw, LEET_B)); }

  // personal details: emails, links, phone numbers, social handles
  function personal(raw) {
    const s = String(raw || '').toLowerCase(), sq = squash(letters(raw, LEET_A));
    if (/[a-z0-9]@[a-z0-9]/.test(s) || /(^|[^a-z])(at|dot)([^a-z]|$).*(com|net|org)/.test(s)) return true;
    if (/(https?|www)|\.(com|net|org|gg|io|tv|co|me|xyz|ly)\b/.test(s)) return true;
    if ((s.match(/\d/g) || []).length >= 7) return true;
    return /(gmail|yahoo|hotmail|outlook|icloud|protonmail|discordgg|snapchat|instagram|tiktok|whatsapp|telegram|onlyfans)/.test(sq);
  }
  // names that pretend to speak for the studio. "admin" and "declaire" are caught in any spelling: look-alike numbers
  // and symbols (4DM1N, D3CL4!RE), stretched or doubled letters (AADMIIN), gaps and dots (A.D.M.I.N), a dropped vowel
  // (ADMN, DECLAR) and both readings of 1, | and ! (i or l). Only the admin's own account gets past this (see cleanTag).
  const STUDIO = /(adm[i]?n|admln|moderator|d[e]?cl[a]?[i]?r|anthropic|official|gamemaster|customersupport|supportteam|devteam|staffmember)/;
  function reserved(raw) {
    for (const map of [LEET_A, LEET_B]) {
      const s = letters(raw, map), sq = squash(s).replace(/badminton/g, '');
      for (const v of [sq, sq.replace(/([a-z])\1+/g, '$1')]) if (STUDIO.test(v)) return true;
      if (tokens(s).some(t => t === 'mod' || t === 'mods' || t === 'staff' || t === 'support')) return true;
    }
    return false;
  }

  const REMARKS = [
    'Whoa there. Zombies have tiny ears. Try a cleaner name.',
    'That name got bitten and turned. Pick another one.',
    'Our name scanner just fainted. Try something else.',
    'Nice try. The armory keeper spat out his coffee.',
    "That word isn't allowed in the bunker.",
    "Even the zombies think that's rude, and they eat people.",
    'Denied. The radio DJ had to bleep that.',
    'Rejected. Your survivor file is blushing.',
    'The A-10 refuses to fly for that callsign.',
    "Let's keep the apocalypse family friendly.",
    'Your keyboard needs a bar of soap.',
    'Bold move. Wrong move.',
    'The armory keeper just wrote your name in his naughty book.',
    "Zombies can't read, but if they could, they'd be offended.",
    "That's a hard no from the whole horde.",
    'Put that on the leaderboard and the leaderboard would quit.',
    'Error 404: clean name not found.',
    'Our filter has seen things. That was one of them.',
    "That name is banned on all 7 radio channels.",
    'The skull laughed. Then it said no.',
    'Somewhere, a grandma just felt a disturbance.',
    'The Overlord has rejected your offering.',
    'Mutation detected: Potty Mouth. Not a playable strain.',
    'Plot twist: the filter is the final boss.',
    'Try a name your mom could yell across a parking lot.',
    'We fed that name to a zombie. It spat it back out.',
    'The keeper is now reciting Shakespeare at you. Out of spite.',
    "That's not a callsign, that's a cry for soap.",
    'Our lawyers (two raccoons in a trench coat) said no.',
    "Achievement unlocked: absolutely nothing.",
    'The filter is getting tired. Please let it rest.',
    'Every time you try that, a pixel in the city cries.',
    'Your persistence is impressive. Your vocabulary, less so.',
    "Fun fact: SIR CHOMPS-A-LOT is still available.",
    'Attempt number {n}. The horde is taking notes.',
    "Try DEFINITELY_NOT_RUDE. It's free.",
    "The bunker's swear jar is full. It's a swear barrel now.",
    "This message is the filter rolling its eyes at you.",
    "We reported you to the authorities. The authorities are a pigeon. It doesn't care.",
    'You could be shooting zombies right now. Just saying.',
    "OK, at this point we're just two friends who argue.",
    'The filter has started a support group because of you.',
    'Still no. But we admire the stamina.',
    'Insert clever rejection #44 here. We are running low.',
    'The zombies have formed a union and demand that you stop.',
    "Fine. Your name is now PERSISTENT CHAOS. Kidding. Pick a real one.",
    'Even the lag thinks this is too much.',
    "We're writing a song about your attempts. It's called \"No.\"",
    'Second to last joke. After this, the jokes get recycled.',
    "That's 50. You've heard every joke we have. Now pick a name that won't scare the zombies."
  ];
  const tries = () => { try { return +localStorage.getItem('zc_naughty') || 0; } catch (e) { return 0; } };
  function nextRemark() {
    let n = tries() + 1;
    try { localStorage.setItem('zc_naughty', String(n)); } catch (e) { /* storage blocked: the jokes still rotate this session */ }
    if (n > REMARKS.length) n = REMARKS.length + 1 + Math.floor(Math.random() * REMARKS.length);   // after 50, a random rerun
    const i = (n - 1) % REMARKS.length;
    return REMARKS[i].replace('{n}', String(n));
  }

  return {
    REMARKS: REMARKS,
    setWords: setWords,
    unpack: unpack,
    get ready() { return SUB.length > 0 || WORD.size > 0; },
    isRude: isRude,
    personal: personal,
    reserved: reserved,
    // check(name) -> { ok: true } or { ok: false, kind: 'rude' | 'personal' | 'reserved', msg }
    check(raw) {
      const s = String(raw || '');
      if (!s.trim()) return { ok: true };
      if (isRude(s)) return { ok: false, kind: 'rude', msg: nextRemark() };
      if (personal(s)) return { ok: false, kind: 'personal', msg: "For your safety, keep emails, phone numbers and links out of your name." };
      if (reserved(s)) return { ok: false, kind: 'reserved', msg: 'That name is saved for the DeclAIre Studios team. Pick your own.' };
      return { ok: true };
    },
    // a name from someone else, safe to show: unchanged when clean, otherwise a stand-in
    safe(raw, stand) { const s = String(raw || ''); return !s || isRude(s) || personal(s) || reserved(s) ? (stand || 'SURVIVOR') : s; }
  };
})();
