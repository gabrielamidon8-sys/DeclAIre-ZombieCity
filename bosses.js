/* Zombie City — the boss roster. 50 named bosses, each with 2 or 3 forms: when a boss is hurt enough it mutates
   into its next form with a new body, new parts, new attacks and more speed. Bodies and parts are drawn procedurally
   (top-down, facing +x). Global: ZB. */
var ZB = (function () {
  'use strict';
  var TAU = Math.PI * 2;
  // elements: base colors [body, accent, glow], projectile, ground hazard, remix layers for the music
  var EL = {
    blood: { c: ['#6a1e26', '#d9b08c', '#ff4040'], shot: 'spike', haz: null, mus: ['timpani', 'guitar'] },
    rot: { c: ['#4f5c2a', '#a9bb5c', '#e8ff6a'], shot: 'acid', haz: 'acid', mus: ['organ', 'reese'] },
    bone: { c: ['#cfc4a8', '#6f6655', '#ff9a3a'], shot: 'spike', haz: null, mus: ['organ', 'gong'] },
    void: { c: ['#2b2040', '#7b5cff', '#e0ccff'], shot: 'void', haz: null, mus: ['choir', 'heartbeat'] },
    ice: { c: ['#6fa6c9', '#e8f6ff', '#7af4ff'], shot: 'ice', haz: 'ice', mus: ['bells', 'strings'] },
    fire: { c: ['#7a2a12', '#ff8a2a', '#ffe27a'], shot: 'fire', haz: 'fire', mus: ['brass', 'timpani'] },
    metal: { c: ['#565d66', '#b9c0c7', '#ff4a3a'], shot: 'shard', haz: null, mus: ['guitar', 'blast'] },
    shock: { c: ['#2d3a5c', '#7af0ff', '#fff36b'], shot: 'shock', haz: null, mus: ['arp', 'glitch'] },
    acid: { c: ['#3d5c1f', '#a5f03a', '#e8ff6a'], shot: 'acid', haz: 'acid', mus: ['acid', 'hoover'] },
    spirit: { c: ['#b9c6db', '#7f93ba', '#7af4ff'], shot: 'spirit', haz: null, mus: ['choir', 'bells'] }
  };
  var EXTRA = ['siren', 'screech', 'blast', 'hoover', 'strings', 'brass'];
  // name | title | tier | element | forms ("Name|body|parts|moves|speed|size")
  var RAW = [
    ['Gorehound', 'Leader of the pack', 1, 'blood', ['Gorehound|hound|spikes,tail|charge,howl|1.15|1', 'Skinless Gorehound|hound|spikes,ribs,tail,flames|charge,leap,howl|1.35|1.1']],
    ['Bloat Queen', 'Mother of rot', 1, 'rot', ['Bloat Queen|blob|eyes|volley,summon|0.8|1.1', 'Burst Queen|blob|eyes,mushrooms,glow|nova,summon,bombs|0.95|1.25']],
    ['Rattlebones', 'The restless dead', 1, 'bone', ['Rattlebones|brute|ribs|slam,volley|1|1', 'Bone Storm|wraith|ribs,spikes,halo|nova,blades,teleport|1.2|1.1']],
    ['Sewer King', 'Lord of the drains', 1, 'rot', ['Sewer King|serpent|crown|burrow,volley|1|1', 'King of Filth|serpent|crown,mushrooms,glow|burrow,summon,nova,trail|1.2|1.15']],
    ['Night Stalker', 'The unseen', 1, 'void', ['Night Stalker|hound|smoke|teleport,charge|1.2|0.95', 'Shadow Stalker|wraith|eyes,smoke|teleport,clones,volley|1.35|1.05']],
    ['Iron Maw', 'Jaws of the city', 1, 'metal', ['Iron Maw|golem|maw|charge,slam|0.9|1.05', 'Maw Unbound|golem|maw,plates,spikes|charge,quake,volley|1.1|1.2']],
    ['Hive Mother', 'The swarm made flesh', 1, 'rot', ['Hive Mother|insect|eyes|summon,web|0.95|1', 'Hive Ascendant|insect|wings,eyes,glow|summon,spiral,web|1.15|1.15']],
    ['Frostbite', 'The cold hunger', 1, 'ice', ['Frostbite|brute|ice|frost,volley|0.95|1', 'Glacier Heart|golem|ice,crystals|frost,nova,shield|0.9|1.25']],
    ['Pyre', 'The burning man', 1, 'fire', ['Pyre|brute|flames|volley,slam,trail|1|1', 'Inferno|wraith|flames,halo|meteor,nova,trail|1.2|1.15']],
    ['Butcher Bill', 'Closed for business', 1, 'blood', ['Butcher Bill|brute|chains|charge,slam|1|1.05', 'Bill Unchained|brute|chains,blades,spikes|blades,charge,grab|1.2|1.15']],
    ['Widowmaker', 'Eight legs of murder', 2, 'void', ['Widowmaker|spider|eyes|web,summon,leap|1.1|1', 'Black Widow|spider|eyes,spikes,glow|web,leap,spiral|1.3|1.15']],
    ['The Choir', 'Voices of the drowned', 2, 'spirit', ['The Choir|wraith|halo|howl,volley,teleport|1|1', 'Choir of Screams|wraith|heads2,halo,eyes|howl,nova,clones|1.15|1.15']],
    ['Gutter Rex', 'Apex of the alleys', 2, 'bone', ['Gutter Rex|hound|tail,maw|charge,leap|1.1|1.15', 'Rex Reborn|hound|armor,tail,spikes,maw|charge,quake,howl|1.25|1.3']],
    ['Static', 'The living outage', 2, 'shock', ['Static|eye|circuits|lightning,beam|0.9|1', 'Overcharge|eye|circuits,halo,crystals|lightning,sweep,nova|1|1.15']],
    ['Mother Moss', 'Rooted in the dead', 2, 'rot', ['Mother Moss|horror|mushrooms|pull,summon,web|0.8|1.05', 'Overgrowth|horror|mushrooms,spikes,glow|pull,spiral,trail,summon,regen|0.95|1.25']],
    ['Sludgeback', 'The walking spill', 2, 'acid', ['Sludgeback|blob|eyes|volley,trail,bombs|0.85|1.1', 'Acid Titan|blob|crystals,glow,eyes|bombs,nova,trail|1|1.3']],
    ['Tinman', 'Heart of scrap', 2, 'metal', ['Tinman|golem|plates|beam,slam|0.9|1', 'Scrap Colossus|golem|circuits,blades,plates|sweep,blades,summon|1|1.25']],
    ['The Weeping', 'Grief with teeth', 2, 'spirit', ['The Weeping|wraith|chains|teleport,volley|1.05|1', 'Grief Incarnate|wraith|eyes,chains,smoke|teleport,spiral,pull|1.2|1.15']],
    ['Carrion Crow', 'Feast of the fallen', 2, 'blood', ['Carrion Crow|insect|wings|charge,volley|1.25|1', 'Murder King|insect|wings,crown,heads2|summon,spiral,charge|1.35|1.15']],
    ['Mr. Stitches', 'Sewn from many', 2, 'bone', ['Mr. Stitches|brute|chains,ribs|web,slam|1|1.05', 'Stitched Horror|horror|ribs,chains,eyes|grab,web,nova|1.05|1.25']],
    ['Leviathan', 'Rising from the flood', 3, 'ice', ['Leviathan|serpent|spikes|burrow,nova|1.1|1.1', 'Deep One|serpent|crown,ice,spikes|burrow,frost,spiral|1.2|1.2', 'Abyssal Leviathan|horror|eyes,ice,crown|pull,meteor,sweep|1.1|1.4']],
    ['Brimstone', 'The furnace walks', 3, 'fire', ['Brimstone|golem|flames|meteor,slam|0.9|1.05', 'Brimstone Core|golem|flames,crystals,plates|meteor,quake,trail|1|1.2', 'Living Sun|eye|flames,halo,glow|nova,spiral,sweep|1.05|1.35']],
    ['Plague Doctor', 'The cure is death', 3, 'rot', ['Plague Doctor|brute|maw,smoke|bombs,volley|1|1', 'Doctor of Death|wraith|mushrooms,smoke,halo|bombs,clones,trail,teleport|1.2|1.15']],
    ['The Twins', 'Two hearts, one hunger', 3, 'blood', ['The Twins|brute|heads2|charge,volley|1.05|1.05', 'Siamese Horror|horror|heads2,eyes,spikes|charge,clones,nova|1.2|1.25']],
    ['Gravewyrm', 'Worm of the ossuary', 3, 'bone', ['Gravewyrm|serpent|ribs|burrow,volley|1.1|1.05', 'Ossuary Wyrm|serpent|spikes,ribs,horns|burrow,nova,quake|1.2|1.2', 'Bone Dragon|insect|wings,horns,ribs,spikes|charge,meteor,spiral|1.3|1.4']],
    ['Voltaic', 'Thunder on four legs', 3, 'shock', ['Voltaic|hound|circuits|charge,lightning|1.3|1', 'Thunder Beast|hound|circuits,halo,spikes|charge,lightning,sweep|1.45|1.15']],
    ['Pale Bride', 'Till death, and after', 3, 'spirit', ['Pale Bride|wraith|halo|teleport,howl,volley|1.05|1', 'Widow in White|wraith|halo,chains|clones,spiral,grab|1.2|1.1', 'Bride of Ruin|horror|eyes,halo,crown|pull,nova,teleport|1.15|1.35']],
    ['Juggernaut Prime', 'Unstoppable', 3, 'metal', ['Juggernaut Prime|golem|armor,plates|charge,shield,slam|0.95|1.15', 'Prime Unshelled|brute|ribs,flames,spikes|charge,blades,quake|1.3|1.25']],
    ['Myconid', 'The spreading', 3, 'rot', ['Myconid|blob|mushrooms|summon,trail,volley|0.85|1.05', 'Sporelord|blob|mushrooms,eyes,glow|bombs,pull,spiral|0.95|1.2', 'Fungal God|horror|mushrooms,crown,glow|meteor,summon,nova|1|1.4']],
    ['Razorback', 'All edges', 3, 'metal', ['Razorback|hound|blades,spikes|charge,blades|1.3|1.05', 'Razor Tempest|hound|blades,plates,spikes|blades,charge,spiral|1.45|1.2']],
    ['Cerberus', 'Hound of the gate', 4, 'fire', ['Cerberus|hound|heads2,tail|charge,volley,howl|1.25|1.15', 'Hellhound|hound|heads2,flames,tail|charge,meteor,howl|1.4|1.25', 'Gatekeeper|brute|heads2,flames,chains|grab,nova,quake|1.25|1.45']],
    ['The Hollow King', 'Ruler of nothing', 4, 'void', ['The Hollow King|brute|crown|summon,beam|1|1.1', 'King of Nothing|wraith|crown,eyes|teleport,sweep,pull|1.2|1.2', 'Void Monarch|eye|crown,halo,glow|spiral,meteor,pull|1.1|1.4']],
    ['Arachnoth', 'The web of the world', 4, 'acid', ['Arachnoth|spider|eyes,spikes|web,volley,leap|1.2|1.15', 'Spider Queen|spider|crown,eyes,spikes|summon,web,spiral|1.3|1.25', 'Arachnoth Ascended|spider|wings,crystals,glow|leap,nova,bombs|1.4|1.4']],
    ['Tesla', 'The grid made flesh', 4, 'shock', ['Tesla|golem|circuits|beam,lightning|0.95|1.1', 'Tesla Prime|golem|circuits,halo,plates|sweep,lightning,shield|1.05|1.25', 'Storm Engine|eye|circuits,blades,halo|spiral,sweep,lightning|1.1|1.4']],
    ['Wendigo', 'The starving one', 4, 'ice', ['Wendigo|hound|horns|charge,howl,frost|1.3|1.1', 'Starving Wendigo|hound|horns,ribs,ice|leap,frost,howl|1.45|1.2', 'Ancient Hunger|wraith|horns,ice,smoke|teleport,frost,nova|1.35|1.4']],
    ['Magma Titan', 'The mountain wakes', 4, 'fire', ['Magma Titan|golem|flames,plates|slam,trail,volley|0.9|1.2', 'Erupting Titan|golem|flames,crystals,spikes|meteor,quake,trail|1|1.35', 'Molten Core|blob|flames,glow,crystals|nova,spiral,trail|1.1|1.45']],
    ['Lady Thorn', 'Beauty bleeds', 4, 'blood', ['Lady Thorn|horror|spikes|web,volley,pull|1|1.1', 'Briar Queen|horror|spikes,crown|pull,spiral,summon|1.1|1.25', 'Rose of Ruin|horror|spikes,halo,eyes,crown|nova,sweep,summon|1.15|1.4']],
    ['The Conductor', 'Maestro of the end', 4, 'spirit', ['The Conductor|wraith|halo|howl,volley,teleport|1.05|1.05', 'Maestro of Death|wraith|halo,chains,heads2|spiral,clones,howl|1.2|1.2', 'Symphony of Screams|eye|halo,heads2,glow|nova,sweep,howl|1.15|1.4']],
    ['Nightmare', 'It sees you sleeping', 4, 'void', ['Nightmare|eye|eyes|beam,teleport|1|1.1', 'Waking Nightmare|eye|eyes,smoke,halo|sweep,clones,pull|1.1|1.25', 'Night Terror|horror|eyes,smoke,horns|spiral,meteor,grab|1.2|1.45']],
    ['Goliath', 'The last giant', 4, 'metal', ['Goliath|brute|armor|slam,charge|0.9|1.3', 'Goliath Enraged|brute|armor,spikes,flames|quake,charge,bombs|1.1|1.4', 'Goliath Unbound|golem|flames,horns,plates|quake,meteor,blades|1.2|1.55']],
    ['Apex', 'Perfect predator', 5, 'blood', ['Apex|hound|spikes,tail|charge,leap,howl|1.4|1.15', 'Apex Predator|hound|spikes,tail,armor|charge,clones,leap|1.55|1.25', 'Perfect Organism|horror|eyes,spikes,wings|spiral,teleport,grab,nova|1.4|1.45']],
    ['The Archivist', 'Keeper of every death', 5, 'spirit', ['The Archivist|eye|halo|beam,summon,volley|1|1.15', 'Keeper of Names|eye|halo,chains,eyes|sweep,spiral,summon|1.1|1.3', 'The Last Page|wraith|eyes,halo,crown|meteor,nova,teleport,sweep|1.25|1.45']],
    ['Locust Emperor', 'The sky goes dark', 5, 'rot', ['Locust Emperor|insect|wings|summon,charge,volley|1.3|1.15', 'Swarm Emperor|insect|wings,crown,eyes|summon,spiral,web|1.4|1.3', 'Plague of Wings|insect|wings,heads2,glow,crown|meteor,sweep,summon|1.5|1.45']],
    ['Cryo Tyrant', 'Winter without end', 5, 'ice', ['Cryo Tyrant|golem|ice,crown|frost,beam,volley|0.95|1.2', 'Tyrant of Winter|golem|ice,crown,crystals|frost,sweep,shield|1.05|1.35', 'Absolute Zero|eye|ice,halo,crystals|nova,spiral,frost,meteor|1.15|1.5']],
    ['Hydra', 'Cut one, two return', 5, 'acid', ['Hydra|serpent|heads2|volley,burrow|1.15|1.15', 'Three-Headed Hydra|serpent|heads2,spikes,crown|spiral,nova,burrow|1.25|1.3', 'Hydra Unending|horror|heads2,eyes,spikes|meteor,sweep,summon,nova|1.3|1.5']],
    ['Demon Lord', 'Hell has a king', 5, 'fire', ['Demon Lord|brute|horns,flames|meteor,charge,volley|1.1|1.2', 'Lord of Flames|brute|horns,wings,flames|nova,leap,meteor|1.25|1.35', 'Archdemon|horror|horns,wings,flames,crown|spiral,sweep,grab,meteor|1.3|1.55']],
    ['The Machine', 'Built to end us', 5, 'metal', ['The Machine|golem|circuits,plates|beam,summon,volley|1|1.2', 'Machine War|golem|circuits,blades,plates,armor|sweep,bombs,shield|1.1|1.35', 'Deus Ex Machina|eye|circuits,halo,blades|spiral,meteor,sweep,lightning|1.2|1.5']],
    ['Reaper', 'Your time is up', 5, 'void', ['Reaper|wraith|blades|teleport,blades,volley|1.25|1.15', 'Grim Harvester|wraith|blades,chains,smoke|teleport,clones,sweep|1.4|1.3', 'Death Itself|wraith|halo,eyes,smoke,crown|spiral,pull,grab,meteor|1.35|1.5']],
    ['Chimera', 'Every nightmare at once', 5, 'blood', ['Chimera|hound|heads2,wings|charge,volley,howl|1.35|1.2', 'Twisted Chimera|hound|heads2,wings,tail,spikes|leap,meteor,charge|1.5|1.35', 'Chimera Prime|horror|heads2,wings,spikes,eyes|spiral,nova,sweep,grab|1.4|1.55']],
    ['Patient Zero', 'Where it all began', 5, 'rot', ['Patient Zero|brute|glow|summon,howl,volley|1.1|1.15', 'The Source|blob|eyes,mushrooms,glow|pull,spiral,summon,regen|1.15|1.35', 'Origin of the Plague|horror|eyes,crown,glow,mushrooms|meteor,sweep,nova,grab|1.25|1.6']]
  ];
  function hsl(hex) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [h, s, l];
  }
  function hex(h, s, l) {
    h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    var f = function (v) { return ('0' + Math.round((v + m) * 255).toString(16)).slice(-2); };
    return '#' + f(r) + f(g) + f(b);
  }
  function shift(col, dh, ds, dl) { var q = hsl(col); return hex(q[0] + dh, q[1] + ds, q[2] + dl); }
  var ROSTER = RAW.map(function (a, i) {
    var id = i + 1, el = EL[a[3]], dh = ((id * 47) % 50) - 25;
    var forms = a[4].map(function (f, k) {
      var p = f.split('|');
      var moves = p[3].split(','), passive = moves.indexOf('trail') >= 0;
      return {
        name: p[0], body: p[1], parts: p[2] ? p[2].split(',') : [], moves: moves.filter(function (m) { return m !== 'trail'; }), trail: passive,
        spd: +p[4], size: +p[5],
        col: [shift(el.c[0], dh + k * 8, k * 0.06, -k * 0.04), shift(el.c[1], dh, 0, k * 0.03), shift(el.c[2], dh * 0.5, 0.1, 0.02 * k)]
      };
    });
    var mus = el.mus.slice();
    return {
      id: id, name: a[0], title: a[1], tier: a[2], el: a[3], shot: el.shot, haz: el.haz, forms: forms,
      music: function (form) {
        var add = mus.slice(0, 1 + Math.min(1, form));
        if (form >= 1) add.push(EXTRA[id % EXTRA.length]);
        if (form >= 2) add.push('gong', 'choir');
        if (id === 38) add = ['strings', 'brass', 'choir', 'timpani'].concat(form >= 1 ? ['bells'] : []).concat(form >= 2 ? ['gong'] : []);
        return { tr: -(id % 3), tempo: 1.03 + a[2] * 0.01 + form * 0.04, add: add };
      }
    };
  });

  /* ---------- drawing ---------- */
  var NOBLINK = false;
  // Level of detail: 2 = everything, 1 = drops a few purely decorative layers, 0 = silhouette parts only.
  // Portraits always draw at full detail.
  var DETAIL = 2, SKIP = [{ glow: 1, smoke: 1, flames: 1, chains: 1, plates: 1, circuits: 1, eyes: 1, mushrooms: 1 }, { smoke: 1, chains: 1, plates: 1 }, {}];
  var GLOW = {};
  function glowImg(col) {          // the soft glow, rendered once per colour instead of a fresh gradient every frame
    var c = GLOW[col]; if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = 96;
    var g = c.getContext('2d'), gr = g.createRadialGradient(48, 48, 48 * 0.18, 48, 48, 48);
    gr.addColorStop(0, hexA(col, 1)); gr.addColorStop(1, hexA(col, 0)); g.fillStyle = gr; g.fillRect(0, 0, 96, 96);
    GLOW[col] = c; return c;
  }
  var HEAD = { brute: 0.45, hound: 0.95, spider: 0.35, serpent: 0.1, wraith: 0.3, blob: 0.25, insect: 0.6, golem: 0.75, horror: 0, eye: 0 };
  function seeded(n) { var x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0.5, r), 0, TAU); g.fill(); }
  function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot || 0, 0, TAU); g.fill(); }
  function eyes2(g, x, y, s, col) { g.fillStyle = col; circ(g, x, y - s, s * 0.55); circ(g, x, y + s, s * 0.55); g.fillStyle = 'rgba(255,255,255,0.85)'; circ(g, x + s * 0.15, y - s - s * 0.15, s * 0.18); circ(g, x + s * 0.15, y + s - s * 0.15, s * 0.18); }

  var BODY = {
    brute: function (g, r, C, T, w) {
      var sw = Math.sin(w * 0.12) * r * 0.18;
      g.strokeStyle = shade(C[0], -0.1); g.lineCap = 'round'; g.lineWidth = r * 0.36;
      g.beginPath(); g.moveTo(0, -r * 0.72); g.quadraticCurveTo(r * 0.4, -r * 1.05, r * 0.9 + sw, -r * 0.82); g.moveTo(0, r * 0.72); g.quadraticCurveTo(r * 0.4, r * 1.05, r * 0.9 - sw, r * 0.82); g.stroke();
      g.fillStyle = C[1]; circ(g, r * 0.95 + sw, -r * 0.82, r * 0.25); circ(g, r * 0.95 - sw, r * 0.82, r * 0.25);
      g.fillStyle = C[0]; ell(g, -r * 0.1, 0, r * 0.82, r * 1.0);
      g.fillStyle = shade(C[0], 0.08); ell(g, -r * 0.2, 0, r * 0.55, r * 0.72);
      g.fillStyle = shade(C[0], 0.12); circ(g, r * 0.45, 0, r * 0.36);
      eyes2(g, r * 0.66, 0, r * 0.12, C[2]);
    },
    hound: function (g, r, C, T, w) {
      g.strokeStyle = shade(C[0], -0.15); g.lineCap = 'round'; g.lineWidth = r * 0.16;
      for (var i = 0; i < 4; i++) { var fx = i < 2 ? r * 0.45 : -r * 0.55, sd = i % 2 ? 1 : -1, ph = Math.sin(w * 0.25 + i * 1.7) * r * 0.3; g.beginPath(); g.moveTo(fx, sd * r * 0.35); g.lineTo(fx + ph, sd * r * 0.85); g.stroke(); }
      g.lineWidth = r * 0.14; g.beginPath(); g.moveTo(-r * 0.95, 0); g.quadraticCurveTo(-r * 1.4, Math.sin(T * 6) * r * 0.4, -r * 1.7, Math.sin(T * 6 + 1) * r * 0.25); g.stroke();
      g.fillStyle = C[0]; ell(g, -r * 0.1, 0, r * 1.0, r * 0.55);
      g.fillStyle = shade(C[0], 0.07); ell(g, -r * 0.15, 0, r * 0.7, r * 0.32);
      var jaw = 0.18 + Math.max(0, Math.sin(T * 7)) * 0.25;
      g.fillStyle = shade(C[0], 0.1); ell(g, r * 0.95, 0, r * 0.42, r * 0.32);
      g.fillStyle = C[1]; g.beginPath(); g.moveTo(r * 1.15, -r * 0.08); g.lineTo(r * 1.55, -r * jaw); g.lineTo(r * 1.2, -r * 0.24); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(r * 1.15, r * 0.08); g.lineTo(r * 1.55, r * jaw); g.lineTo(r * 1.2, r * 0.24); g.closePath(); g.fill();
      eyes2(g, r * 1.05, 0, r * 0.13, C[2]);
    },
    spider: function (g, r, C, T, w) {
      g.strokeStyle = shade(C[0], -0.12); g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = r * 0.11;
      [0.5, 1.0, 1.6, 2.2].forEach(function (a, i) {
        for (var sd = -1; sd <= 1; sd += 2) {
          var bob = Math.sin(w * 0.3 + i * 1.3 + sd) * 0.18, an = sd * (a + bob);
          var jx = Math.cos(an) * r * 1.05, jy = Math.sin(an) * r * 1.05, fx = Math.cos(an + sd * 0.35) * r * 1.8, fy = Math.sin(an + sd * 0.35) * r * 1.8;
          g.beginPath(); g.moveTo(Math.cos(an) * r * 0.3, Math.sin(an) * r * 0.3); g.lineTo(jx * 1.1, jy * 1.1 - 0); g.lineTo(fx, fy); g.stroke();
        }
      });
      g.fillStyle = C[0]; ell(g, -r * 0.55, 0, r * 0.78, r * 0.66);
      g.fillStyle = C[2]; g.beginPath(); g.moveTo(-r * 0.8, -r * 0.2); g.lineTo(-r * 0.55, 0); g.lineTo(-r * 0.8, r * 0.2); g.lineTo(-r * 0.3, r * 0.2); g.lineTo(-r * 0.55, 0); g.lineTo(-r * 0.3, -r * 0.2); g.closePath(); g.fill();
      g.fillStyle = shade(C[0], 0.1); circ(g, r * 0.35, 0, r * 0.42);
      g.fillStyle = C[2]; for (var k = 0; k < 6; k++) circ(g, r * (0.55 + (k % 2) * 0.1), (k - 2.5) * r * 0.09, r * 0.06);
      g.fillStyle = C[1]; g.beginPath(); g.moveTo(r * 0.7, -r * 0.12); g.lineTo(r * 0.98, -r * 0.05); g.lineTo(r * 0.72, -r * 0.02); g.fill(); g.beginPath(); g.moveTo(r * 0.7, r * 0.12); g.lineTo(r * 0.98, r * 0.05); g.lineTo(r * 0.72, r * 0.02); g.fill();
    },
    serpent: function (g, r, C, T) {
      g.fillStyle = C[0]; ell(g, 0, 0, r * 0.75, r * 0.52);
      g.fillStyle = shade(C[0], 0.1); ell(g, -r * 0.1, 0, r * 0.45, r * 0.28);
      var jaw = 0.12 + Math.max(0, Math.sin(T * 5)) * 0.22;
      g.fillStyle = C[1]; g.beginPath(); g.moveTo(r * 0.55, -r * 0.1); g.lineTo(r * 1.05, -r * jaw); g.lineTo(r * 0.6, -r * 0.3); g.fill(); g.beginPath(); g.moveTo(r * 0.55, r * 0.1); g.lineTo(r * 1.05, r * jaw); g.lineTo(r * 0.6, r * 0.3); g.fill();
      eyes2(g, r * 0.35, 0, r * 0.2, C[2]);
    },
    wraith: function (g, r, C, T) {
      g.globalAlpha *= 0.9;
      g.fillStyle = C[0]; g.beginPath(); g.moveTo(r * 0.75, 0);
      g.quadraticCurveTo(r * 0.6, -r * 0.75, -r * 0.2, -r * 0.8);
      for (var i = 0; i <= 6; i++) { var y = -r * 0.8 + i * r * 0.267, x = -r * 1.25 - Math.sin(T * 5 + i * 1.3) * r * 0.22 - (i % 2) * r * 0.2; g.lineTo(x, y); }
      g.quadraticCurveTo(r * 0.6, r * 0.75, r * 0.75, 0); g.fill();
      g.fillStyle = shade(C[0], -0.25); circ(g, r * 0.32, 0, r * 0.42);
      g.fillStyle = 'rgba(0,0,0,0.75)'; ell(g, r * 0.4, 0, r * 0.28, r * 0.3);
      eyes2(g, r * 0.5, 0, r * 0.12, C[2]);
      g.fillStyle = C[1]; g.beginPath(); g.moveTo(r * 0.55, -r * 0.6); g.lineTo(r * 1.0, -r * 0.7 + Math.sin(T * 4) * r * 0.1); g.lineTo(r * 0.7, -r * 0.45); g.fill(); g.beginPath(); g.moveTo(r * 0.55, r * 0.6); g.lineTo(r * 1.0, r * 0.7 - Math.sin(T * 4) * r * 0.1); g.lineTo(r * 0.7, r * 0.45); g.fill();
    },
    blob: function (g, r, C, T, w, id) {
      g.fillStyle = C[0]; g.beginPath();
      for (var k = 0; k <= 28; k++) { var a = k / 28 * TAU, rr = r * (1 + 0.08 * Math.sin(a * 3 + T * 3) + 0.05 * Math.sin(a * 5 - T * 2)); if (k) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.fill();
      g.fillStyle = shade(C[0], 0.1); circ(g, -r * 0.2, -r * 0.2, r * 0.45); g.fillStyle = shade(C[0], -0.08); circ(g, r * 0.2, r * 0.3, r * 0.35);
      for (var e = 0; e < 3; e++) { var ex = (seeded(id * 9 + e) - 0.3) * r * 1.1, ey = (seeded(id * 7 + e * 3) - 0.5) * r * 1.2, es = r * (0.12 + seeded(id + e) * 0.1); g.fillStyle = '#efe6d2'; circ(g, ex, ey, es); g.fillStyle = C[2]; circ(g, ex + es * 0.3, ey, es * 0.55); g.fillStyle = '#000'; circ(g, ex + es * 0.4, ey, es * 0.25); }
    },
    insect: function (g, r, C, T, w) {
      g.strokeStyle = shade(C[0], -0.15); g.lineWidth = r * 0.07; g.lineCap = 'round';
      for (var i = 0; i < 3; i++) for (var sd = -1; sd <= 1; sd += 2) { var x = r * (0.25 - i * 0.3), ph = Math.sin(w * 0.35 + i * 2 + sd) * r * 0.2; g.beginPath(); g.moveTo(x, sd * r * 0.25); g.lineTo(x + ph, sd * r * 0.75); g.lineTo(x + ph - r * 0.15, sd * r * 1.0); g.stroke(); }
      g.fillStyle = C[0]; ell(g, -r * 0.75, 0, r * 0.7, r * 0.45);
      g.strokeStyle = shade(C[0], 0.15); g.lineWidth = r * 0.06; for (var s = 0; s < 3; s++) { g.beginPath(); g.ellipse(-r * 0.75, 0, r * (0.2 + s * 0.17), r * 0.45, 0, -1.2, 1.2); g.stroke(); }
      g.fillStyle = shade(C[0], 0.08); circ(g, 0, 0, r * 0.38);
      g.fillStyle = shade(C[0], 0.12); circ(g, r * 0.55, 0, r * 0.3);
      g.fillStyle = C[2]; ell(g, r * 0.62, -r * 0.2, r * 0.13, r * 0.16); ell(g, r * 0.62, r * 0.2, r * 0.13, r * 0.16);
      var m = Math.sin(T * 9) * 0.15; g.strokeStyle = C[1]; g.lineWidth = r * 0.08;
      g.beginPath(); g.moveTo(r * 0.75, -r * 0.12); g.quadraticCurveTo(r * 1.05, -r * (0.3 + m), r * 1.05, -r * (0.02 + m)); g.moveTo(r * 0.75, r * 0.12); g.quadraticCurveTo(r * 1.05, r * (0.3 + m), r * 1.05, r * (0.02 + m)); g.stroke();
    },
    golem: function (g, r, C, T, w) {
      var sw = Math.sin(w * 0.1) * r * 0.12;
      g.fillStyle = shade(C[0], -0.08); rr(g, -r * 0.2 + sw, -r * 1.25, r * 1.0, r * 0.45, r * 0.1); rr(g, -r * 0.2 - sw, r * 0.8, r * 1.0, r * 0.45, r * 0.1);
      g.fillStyle = C[0]; rr(g, -r * 0.9, -r * 0.82, r * 1.55, r * 1.64, r * 0.18);
      g.strokeStyle = shade(C[0], -0.2); g.lineWidth = r * 0.05; g.beginPath(); g.moveTo(-r * 0.4, -r * 0.82); g.lineTo(-r * 0.4, r * 0.82); g.moveTo(-r * 0.9, 0); g.lineTo(r * 0.1, 0); g.stroke();
      g.fillStyle = shade(C[0], 0.1); rr(g, r * 0.5, -r * 0.3, r * 0.45, r * 0.6, r * 0.08);
      g.fillStyle = C[2]; g.globalAlpha *= 1; rr(g, r * 0.82, -r * 0.2, r * 0.08, r * 0.12, 1); rr(g, r * 0.82, r * 0.08, r * 0.08, r * 0.12, 1);
      var p = 0.6 + Math.sin(T * 4) * 0.3; g.fillStyle = C[2]; g.globalAlpha *= p; circ(g, -r * 0.25, 0, r * 0.2); g.globalAlpha /= p;
    },
    horror: function (g, r, C, T) {
      g.lineCap = 'round';
      for (var i = 0; i < 8; i++) {
        var a = i / 8 * TAU + Math.sin(T * 1.5 + i) * 0.15, wv = Math.sin(T * 3 + i * 1.7) * 0.6;
        var x1 = Math.cos(a) * r * 0.6, y1 = Math.sin(a) * r * 0.6, cx = Math.cos(a + wv * 0.5) * r * 1.3, cy = Math.sin(a + wv * 0.5) * r * 1.3, x2 = Math.cos(a + wv) * r * 1.9, y2 = Math.sin(a + wv) * r * 1.9;
        g.strokeStyle = shade(C[0], -0.1); g.lineWidth = r * 0.26; g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo(cx, cy, (cx + x2) / 2, (cy + y2) / 2); g.stroke();
        g.lineWidth = r * 0.12; g.beginPath(); g.moveTo((cx + x2) / 2, (cy + y2) / 2); g.lineTo(x2, y2); g.stroke();
        g.fillStyle = C[1]; circ(g, x2, y2, r * 0.06);
      }
      g.fillStyle = C[0]; circ(g, 0, 0, r * 0.8);
      g.fillStyle = shade(C[0], 0.08); circ(g, -r * 0.15, -r * 0.1, r * 0.5);
      var mo = r * (0.3 + Math.sin(T * 4) * 0.06); g.fillStyle = '#1a0608'; circ(g, r * 0.1, 0, mo);
      g.fillStyle = '#efe6d2'; for (var k = 0; k < 10; k++) { var ta = k / 10 * TAU; g.beginPath(); g.moveTo(r * 0.1 + Math.cos(ta) * mo, Math.sin(ta) * mo); g.lineTo(r * 0.1 + Math.cos(ta + 0.18) * mo * 0.55, Math.sin(ta + 0.18) * mo * 0.55); g.lineTo(r * 0.1 + Math.cos(ta + 0.36) * mo, Math.sin(ta + 0.36) * mo); g.fill(); }
    },
    eye: function (g, r, C, T, w, id, look) {
      g.strokeStyle = shade(C[0], -0.1); g.lineCap = 'round'; g.lineWidth = r * 0.14;
      for (var i = 0; i < 6; i++) { var a = Math.PI + (i - 2.5) * 0.4 + Math.sin(T * 2 + i) * 0.15; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); g.quadraticCurveTo(Math.cos(a + 0.3) * r * 1.3, Math.sin(a + 0.3) * r * 1.3, Math.cos(a - 0.1) * r * 1.75, Math.sin(a - 0.1) * r * 1.75); g.stroke(); }
      g.fillStyle = C[0]; circ(g, 0, 0, r * 1.02);
      g.fillStyle = '#ece4d4'; circ(g, 0, 0, r * 0.88);
      g.strokeStyle = 'rgba(190,30,40,0.6)'; g.lineWidth = r * 0.03;
      for (var v = 0; v < 7; v++) { var va = v / 7 * TAU + 0.3; g.beginPath(); g.moveTo(Math.cos(va) * r * 0.86, Math.sin(va) * r * 0.86); g.quadraticCurveTo(Math.cos(va + 0.2) * r * 0.6, Math.sin(va + 0.2) * r * 0.6, Math.cos(va + 0.05) * r * 0.45, Math.sin(va + 0.05) * r * 0.45); g.stroke(); }
      var lx = Math.cos(look) * r * 0.32, ly = Math.sin(look) * r * 0.32;
      g.fillStyle = C[1]; circ(g, lx, ly, r * 0.44); g.fillStyle = C[2]; circ(g, lx, ly, r * 0.3);
      g.fillStyle = '#050304'; circ(g, lx * 1.1, ly * 1.1, r * 0.19); g.fillStyle = 'rgba(255,255,255,0.8)'; circ(g, lx - r * 0.1, ly - r * 0.12, r * 0.07);
      var bl = NOBLINK ? 0 : Math.max(0, Math.sin(T * 0.9 + id) * 12 - 11);
      if (bl > 0) { g.fillStyle = C[0]; ell(g, 0, 0, r * 0.9, r * 0.9 * bl); }
    }
  };
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill(); }
  function shade(col, dl) { return shift(col, 0, 0, dl); }

  // parts drawn under (u) or over (o) the body
  var UNDER = { wings: 1, blades: 1, glow: 1, smoke: 1, tail: 1, flames: 0 };
  var PART = {
    wings: function (g, r, C, T) {
      var f = 0.75 + Math.sin(T * 7) * 0.25; g.fillStyle = shade(C[0], -0.12); g.globalAlpha *= 0.92;
      for (var sd = -1; sd <= 1; sd += 2) {
        g.beginPath(); g.moveTo(r * 0.1, sd * r * 0.35); g.lineTo(-r * 0.2, sd * r * 2.2 * f); g.lineTo(-r * 0.6, sd * r * 1.7 * f); g.lineTo(-r * 0.9, sd * r * 2.0 * f); g.lineTo(-r * 1.1, sd * r * 1.3 * f); g.lineTo(-r * 0.6, sd * r * 0.4); g.closePath(); g.fill();
      }
      g.globalAlpha /= 0.92; g.strokeStyle = C[1]; g.lineWidth = r * 0.05;
      for (var s2 = -1; s2 <= 1; s2 += 2) { g.beginPath(); g.moveTo(r * 0.1, s2 * r * 0.35); g.lineTo(-r * 0.2, s2 * r * 2.2 * f); g.moveTo(r * 0.05, s2 * r * 0.4); g.lineTo(-r * 0.9, s2 * r * 2.0 * f); g.stroke(); }
    },
    blades: function (g, r, C, T, z) {
      var n = 2, R = r * (z && z.rb && z.rb.bladesT > 0 ? 2.1 : 1.6);
      for (var i = 0; i < n; i++) {
        var a = T * 5 + i * Math.PI, x = Math.cos(a) * R, y = Math.sin(a) * R;
        g.save(); g.translate(x, y); g.rotate(T * 20);
        g.fillStyle = '#9aa1a8'; g.beginPath(); for (var k = 0; k < 16; k++) { var ra = k % 2 ? r * 0.32 : r * 0.42, aa = k / 16 * TAU; g.lineTo(Math.cos(aa) * ra, Math.sin(aa) * ra); } g.closePath(); g.fill();
        g.fillStyle = '#3a3f45'; circ(g, 0, 0, r * 0.1); g.restore();
      }
    },
    glow: function (g, r, C, T) { var a = g.globalAlpha; g.globalAlpha = a * (0.35 + Math.sin(T * 3) * 0.1); g.drawImage(glowImg(C[2]), -r * 2.2, -r * 2.2, r * 4.4, r * 4.4); g.globalAlpha = a; },
    smoke: function (g, r, C, T) { g.fillStyle = 'rgba(10,8,14,0.35)'; for (var i = 0; i < 5; i++) { var k = (T * 0.8 + i / 5) % 1; circ(g, -r * (0.8 + k * 1.6), Math.sin(i * 2.1 + T) * r * 0.5, r * (0.35 + k * 0.4)); } },
    tail: function (g, r, C, T) { g.fillStyle = shade(C[0], -0.05); for (var i = 0; i < 6; i++) { var x = -r * (0.9 + i * 0.28), y = Math.sin(T * 5 - i * 0.6) * r * 0.08 * i; circ(g, x, y, r * (0.22 - i * 0.025)); g.fillStyle = C[1]; g.beginPath(); g.moveTo(x, y - r * 0.15); g.lineTo(x - r * 0.08, y - r * 0.3); g.lineTo(x - r * 0.12, y - r * 0.12); g.fill(); g.fillStyle = shade(C[0], -0.05); } },
    spikes: function (g, r, C) { g.fillStyle = C[1]; for (var i = 0; i < 10; i++) { var a = i / 10 * TAU + 0.3; g.beginPath(); g.moveTo(Math.cos(a - 0.12) * r * 0.85, Math.sin(a - 0.12) * r * 0.85); g.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3); g.lineTo(Math.cos(a + 0.12) * r * 0.85, Math.sin(a + 0.12) * r * 0.85); g.fill(); } },
    horns: function (g, r, C, T, z, hx) { g.fillStyle = '#e8dcc0'; for (var sd = -1; sd <= 1; sd += 2) { g.beginPath(); g.moveTo(r * (hx + 0.05), sd * r * 0.15); g.quadraticCurveTo(r * (hx - 0.1), sd * r * 0.7, r * (hx - 0.55), sd * r * 0.75); g.quadraticCurveTo(r * (hx - 0.2), sd * r * 0.45, r * (hx - 0.12), sd * r * 0.12); g.fill(); } },
    crown: function (g, r, C, T, z, hx) { g.fillStyle = '#f2cc3a'; g.beginPath(); var x = r * (hx - 0.05); g.moveTo(x - r * 0.18, -r * 0.3); for (var i = 0; i <= 4; i++) { var y = -r * 0.3 + i * r * 0.15; g.lineTo(x + (i % 2 ? -r * 0.05 : -r * 0.42), y); g.lineTo(x - r * 0.18, y + r * 0.075); } g.lineTo(x - r * 0.18, r * 0.3); g.lineTo(x + r * 0.05, r * 0.3); g.lineTo(x + r * 0.05, -r * 0.3); g.closePath(); g.fill(); g.fillStyle = C[2]; circ(g, x - r * 0.06, 0, r * 0.06); },
    heads2: function (g, r, C, T) { for (var sd = -1; sd <= 1; sd += 2) { var y = sd * r * 0.85, x = r * 0.3 + Math.sin(T * 3 + sd) * r * 0.06; g.fillStyle = shade(C[0], 0.1); circ(g, x, y, r * 0.3); eyes2(g, x + r * 0.15, y, r * 0.08, C[2]); g.fillStyle = C[1]; g.beginPath(); g.moveTo(x + r * 0.22, y - r * 0.06); g.lineTo(x + r * 0.45, y); g.lineTo(x + r * 0.22, y + r * 0.06); g.fill(); } },
    armor: function (g, r, C) { g.strokeStyle = C[1]; g.lineWidth = r * 0.16; g.lineCap = 'butt'; for (var i = 0; i < 3; i++) { g.beginPath(); g.arc(-r * 0.25, 0, r * (0.35 + i * 0.22), Math.PI * 0.6, Math.PI * 1.4); g.stroke(); } },
    ribs: function (g, r, C) { g.strokeStyle = '#e8dcc0'; g.lineWidth = r * 0.06; g.lineCap = 'round'; for (var i = 0; i < 4; i++) { var x = -r * (0.55 - i * 0.22); g.beginPath(); g.moveTo(x, -r * 0.55); g.quadraticCurveTo(x - r * 0.15, 0, x, r * 0.55); g.stroke(); } g.beginPath(); g.moveTo(-r * 0.75, 0); g.lineTo(r * 0.2, 0); g.stroke(); },
    eyes: function (g, r, C, T, z) { var id = z && z.rb ? z.rb.def.id : 3; for (var i = 0; i < 7; i++) { var a = seeded(id * 3 + i) * TAU, d = r * (0.25 + seeded(id + i * 5) * 0.55), x = Math.cos(a) * d, y = Math.sin(a) * d, s = r * (0.07 + seeded(i * 11 + id) * 0.06); g.fillStyle = '#efe6d2'; circ(g, x, y, s); g.fillStyle = C[2]; circ(g, x + s * 0.3, y, s * 0.6); g.fillStyle = '#000'; circ(g, x + s * 0.35, y, s * 0.28); } },
    maw: function (g, r, C, T, z, hx) { var o = r * (0.18 + Math.max(0, Math.sin(T * 6)) * 0.12), x = r * (hx + 0.32); g.fillStyle = '#1a0608'; ell(g, x, 0, r * 0.22, o + r * 0.1); g.fillStyle = '#efe6d2'; for (var i = 0; i < 6; i++) { var y = -o - r * 0.06 + i * (o * 2 + r * 0.12) / 5; g.beginPath(); g.moveTo(x - r * 0.12, y); g.lineTo(x + r * 0.05, y + r * 0.04); g.lineTo(x - r * 0.12, y + r * 0.08); g.fill(); } },
    halo: function (g, r, C, T) { g.strokeStyle = hexA(C[2], 0.75 + Math.sin(T * 4) * 0.2); g.lineWidth = r * 0.09; g.beginPath(); g.ellipse(-r * 0.1, 0, r * 1.25, r * 1.25, 0, 0, TAU); g.stroke(); g.strokeStyle = hexA(C[2], 0.25); g.lineWidth = r * 0.25; g.stroke(); },
    flames: function (g, r, C, T) { var gc = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter'; for (var i = 0; i < 9; i++) { var a = i / 9 * TAU + T * 0.5, fl = 0.8 + Math.sin(T * 14 + i * 2.3) * 0.25, x = Math.cos(a) * r * 0.8, y = Math.sin(a) * r * 0.8; g.fillStyle = i % 2 ? 'rgba(255,140,40,0.55)' : 'rgba(255,220,90,0.45)'; g.beginPath(); g.moveTo(x + Math.cos(a + 1.57) * r * 0.18, y + Math.sin(a + 1.57) * r * 0.18); g.quadraticCurveTo(x + Math.cos(a) * r * 0.7 * fl, y + Math.sin(a) * r * 0.7 * fl, x - Math.cos(a + 1.57) * r * 0.18, y - Math.sin(a + 1.57) * r * 0.18); g.fill(); } g.globalCompositeOperation = gc; },
    crystals: function (g, r, C) { for (var i = 0; i < 6; i++) { var a = i / 6 * TAU + 0.5, x = Math.cos(a) * r * 0.7, y = Math.sin(a) * r * 0.7; g.fillStyle = C[2]; g.beginPath(); g.moveTo(x + Math.cos(a + 1.57) * r * 0.12, y + Math.sin(a + 1.57) * r * 0.12); g.lineTo(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6); g.lineTo(x - Math.cos(a + 1.57) * r * 0.12, y - Math.sin(a + 1.57) * r * 0.12); g.fill(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5); g.lineTo(x + Math.cos(a + 1.57) * r * 0.06, y + Math.sin(a + 1.57) * r * 0.06); g.fill(); } },
    chains: function (g, r, C, T) { g.strokeStyle = '#8b8f94'; g.lineWidth = r * 0.05; for (var sd = -1; sd <= 1; sd += 2) for (var i = 0; i < 6; i++) { var sw = Math.sin(T * 3 + sd) * 0.3, x = -r * 0.1 - i * r * 0.2 * Math.cos(sw), y = sd * (r * 0.75 + i * r * 0.18) + Math.sin(sw) * i * r * 0.1; g.beginPath(); g.ellipse(x, y, r * 0.09, r * 0.05, i % 2 ? 0 : 1.57, 0, TAU); g.stroke(); } },
    plates: function (g, r, C) { g.fillStyle = 'rgba(255,255,255,0.18)'; for (var i = 0; i < 8; i++) { var a = i / 8 * TAU; circ(g, Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.05); } g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = r * 0.04; g.beginPath(); g.arc(0, 0, r * 0.5, 0, TAU); g.stroke(); },
    mushrooms: function (g, r, C, T, z) { var id = z && z.rb ? z.rb.def.id : 5; for (var i = 0; i < 4; i++) { var x = (seeded(id + i * 13) - 0.6) * r * 1.0, y = (seeded(id * 2 + i * 7) - 0.5) * r * 1.2, s = r * (0.18 + seeded(i + id) * 0.12); g.fillStyle = i % 2 ? '#b8322c' : '#8a5a3a'; circ(g, x, y, s); g.fillStyle = '#f0e6cf'; circ(g, x - s * 0.3, y - s * 0.2, s * 0.18); circ(g, x + s * 0.3, y + s * 0.2, s * 0.14); } },
    ice: function (g, r, C, T) { g.fillStyle = 'rgba(220,245,255,0.85)'; for (var i = 0; i < 8; i++) { var a = i / 8 * TAU + Math.sin(T) * 0.1, x = Math.cos(a) * r * 0.95, y = Math.sin(a) * r * 0.95; g.beginPath(); g.moveTo(x + Math.cos(a + 1.57) * r * 0.08, y + Math.sin(a + 1.57) * r * 0.08); g.lineTo(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45); g.lineTo(x - Math.cos(a + 1.57) * r * 0.08, y - Math.sin(a + 1.57) * r * 0.08); g.fill(); } },
    circuits: function (g, r, C, T) { g.strokeStyle = hexA(C[2], 0.6 + Math.sin(T * 6) * 0.3); g.lineWidth = r * 0.05; g.beginPath(); g.moveTo(-r * 0.6, -r * 0.3); g.lineTo(-r * 0.2, -r * 0.3); g.lineTo(0, -r * 0.1); g.lineTo(r * 0.3, -r * 0.1); g.moveTo(-r * 0.6, r * 0.35); g.lineTo(-r * 0.1, r * 0.35); g.lineTo(r * 0.1, r * 0.15); g.moveTo(-r * 0.3, -r * 0.6); g.lineTo(-r * 0.3, r * 0.6); g.stroke(); g.fillStyle = C[2]; circ(g, r * 0.3, -r * 0.1, r * 0.06); circ(g, r * 0.1, r * 0.15, r * 0.06); circ(g, -r * 0.3, 0, r * 0.07); }
  };
  function hexA(h, a) { var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }

  // draw a boss at its position. z: { x, y, ang, r, rb: { def, form, look, seg, lift, mutT, alpha }, flash, walk }
  function draw(g, z, T) {
    var rb = z.rb, def = rb.def, F = def.forms[rb.form], r = z.r, C = F.col, hx = HEAD[F.body] || 0;
    var lift = rb.lift || 0, mut = rb.mutT > 0 ? rb.mutT : 0;
    g.save(); g.translate(z.x, z.y);
    g.globalAlpha = (rb.alpha == null ? 1 : rb.alpha);
    g.fillStyle = 'rgba(0,0,0,' + (0.4 - lift * 0.2) + ')'; ell(g, 6 + lift * 16, 9 + lift * 26, r * 1.15, r * 0.95);
    if (F.body === 'serpent' && rb.seg) {
      g.restore(); g.save(); g.globalAlpha = (rb.alpha == null ? 1 : rb.alpha);
      for (var i = rb.seg.length - 1; i >= 0; i--) { var sg = rb.seg[i], k = 1 - i / (rb.seg.length + 2); g.fillStyle = i % 2 ? C[0] : shade(C[0], 0.06); circ(g, sg[0], sg[1], r * 0.62 * k + 2); if (F.parts.indexOf('spikes') >= 0 && i % 2 === 0) { g.fillStyle = C[1]; circ(g, sg[0], sg[1], r * 0.18 * k); } }
      g.translate(z.x, z.y);
    }
    var sc = 1 + lift * 0.35 + (mut ? Math.sin(T * 40) * 0.05 + (1.6 - mut) * 0.08 : 0);
    if (mut) g.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
    g.rotate(z.ang); g.scale(sc, sc);
    var look = (rb.look == null ? 0 : rb.look) - z.ang;
    var p, j, sk = NOBLINK ? SKIP[2] : SKIP[DETAIL];
    for (j = 0; j < F.parts.length; j++) { p = F.parts[j]; if (UNDER[p] && PART[p] && !sk[p]) PART[p](g, r, C, T, z, hx); }
    BODY[F.body](g, r, C, T, z.walk || 0, def.id, look);
    for (j = 0; j < F.parts.length; j++) { p = F.parts[j]; if (!UNDER[p] && PART[p] && !sk[p]) PART[p](g, r, C, T, z, hx); }
    if (z.flash > 0 || mut) { var gc = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,255,255,' + Math.min(0.5, (z.flash || 0) * 5 + (mut ? 0.25 + Math.sin(T * 30) * 0.2 : 0)) + ')'; circ(g, 0, 0, r * 1.1); g.globalCompositeOperation = gc; }
    g.restore();
  }
  // a still portrait for the boss log
  function portrait(g, def, form, size, sil) {
    var z = { x: size / 2, y: size / 2, ang: -Math.PI / 2, r: size * 0.22, walk: 3, flash: 0, rb: { def: def, form: form, look: -Math.PI / 2, seg: null, alpha: 1 } };
    var F = def.forms[form];
    if (F.body === 'serpent') { z.rb.seg = []; for (var i = 1; i <= 7; i++) z.rb.seg.push([size / 2 + Math.sin(i * 0.9) * size * 0.08, size / 2 + i * size * 0.07]); }
    NOBLINK = true;
    if (sil) {
      var c = document.createElement('canvas'); c.width = c.height = size; var cg = c.getContext('2d');
      draw(cg, z, 1.3); cg.globalCompositeOperation = 'source-in'; cg.fillStyle = '#2a2f36'; cg.fillRect(0, 0, size, size);
      g.drawImage(c, 0, 0); NOBLINK = false; return;
    }
    draw(g, z, 1.3); NOBLINK = false;
  }
  // the Overlord: summoned only by the skull's wheel. Two health bars, two forms.
  var OVERLORD = {
    id: 51, name: 'The Overlord', title: 'Death do us part', tier: 6, el: 'void', shot: 'void', haz: 'fire', overlord: true,
    forms: [
      { name: 'The Overlord', body: 'brute', parts: ['glow', 'crown', 'horns', 'heads2', 'chains', 'flames'], moves: ['grab', 'slam', 'nova', 'charge', 'meteor'], trail: false, spd: 1.3, size: 1, col: ['#3a0d16', '#d9b08c', '#ff2d4a'] },
      { name: 'Overlord Unchained', body: 'horror', parts: ['glow', 'wings', 'crown', 'horns', 'eyes', 'flames', 'spikes'], moves: ['grab', 'quake', 'meteor', 'spiral', 'charge', 'nova'], trail: true, spd: 1.6, size: 1.18, col: ['#1c0610', '#f2cc3a', '#ff2d4a'] }
    ],
    music: function () { return null; }
  };
  return { ROSTER: ROSTER, OVERLORD: OVERLORD, EL: EL, draw: draw, portrait: portrait, hexA: hexA,
    setDetail: function (d) { DETAIL = Math.max(0, Math.min(2, d | 0)); }, clearCache: function () { GLOW = {}; } };
})();
