/* ================= ANIMA: the rig and animation engine for the 2.0 zombies =================
   Every new zombie is a jointed body, not a picture. A pose is 32 numbers (lean, twist, head, jaw, each arm's angle and
   elbow, each foot's stride and lift, a fall, a spin and so on); forward kinematics turns a pose into a skeleton in three
   dimensions (x forward, y to the right, z up, in units of the zombie's radius) and the look engine (anilook.js) draws it
   seen from above, things higher up drawn a little bigger, so a falling body really stretches out along the ground.
   Each zombie has 50 animations of its own: 10 ways of moving, 8 idles, 10 attacks, 8 hit reactions, 8 deaths and 6
   specials. They are built from motion families shaped by the zombie's personality (its gait, how it holds its arms,
   how it carries its head, its build, injuries, what it holds, and a seed that gives every zombie its own timing,
   amplitudes and quirks), so the Night Jogger's sprint, the Mail Carrier's march and the Rotter's one-armed drag share
   nothing but the names. Transitions cross-fade with the walk cycle's phase kept, attacks play on the upper body while
   the legs keep walking, hits are layered on top, and a death starts from whatever pose the zombie was in.
   Near the camera zombies are drawn live (every joint, every frame); further out from cached frames of their walk cycle
   (made a few per frame, nearest first); the dead stay as corpses for a while (fewer when the frame is busy). */
const AP = { lean: 0, leanS: 1, twist: 2, hipY: 3, bob: 4, crouch: 5, hunch: 6, headY: 7, headP: 8, headR: 9, jaw: 10,
  alY: 11, alP: 12, alE: 13, arY: 14, arP: 15, arE: 16, llS: 17, llL: 18, llW: 19, lrS: 20, lrL: 21, lrW: 22,
  fall: 23, fallA: 24, spin: 25, rise: 26, offX: 27, offY: 28, shake: 29, grip: 30, sq: 31 };
const AN = 32;
// the pose every animation starts from: standing, arms hanging, looking ahead
const AP_REST = new Float32Array(AN);
AP_REST[AP.alP] = AP_REST[AP.arP] = -1.25; AP_REST[AP.alE] = AP_REST[AP.arE] = 0.3; AP_REST[AP.alY] = AP_REST[AP.arY] = 0.32;
// which numbers an upper-body animation (an attack) takes over while the legs keep walking
const AM_UP = new Float32Array(AN), AM_FULL = new Float32Array(AN).fill(1);
for (const k of ['twist', 'hunch', 'headY', 'headP', 'headR', 'jaw', 'alY', 'alP', 'alE', 'arY', 'arP', 'arE', 'grip', 'shake', 'sq']) AM_UP[AP[k]] = 1;
AM_UP[AP.lean] = 0.75; AM_UP[AP.leanS] = 0.4; AM_UP[AP.crouch] = 0.5; AM_UP[AP.offX] = 1; AM_UP[AP.offY] = 1;
// the joints the skeleton is made of (each three numbers; fdir and hup are directions: where the face points and the top of the head)
const JN = { root: 0, pel: 1, chest: 2, neck: 3, head: 4, shL: 5, elL: 6, haL: 7, shR: 8, elR: 9, haR: 10, hipL: 11, knL: 12, ftL: 13, hipR: 14, knR: 15, ftR: 16, toeL: 17, toeR: 18, fdir: 19, hup: 20, belly: 21, sc: 22 };
const NJ = 23;
const A_PERSP = 0.1;   // how much bigger the top of a standing zombie is drawn than its feet (seen from above)

// the 50 animation slots every zombie has (each zombie's are its own; these are the slots)
const AC = { walk: 0, walkFast: 1, run: 2, strafeL: 3, strafeR: 4, turn: 5, stumble: 6, limp: 7, crawl: 8, back: 9,
  idle: 10, idleLook: 11, idleTwitch: 12, idleSniff: 13, idleScratch: 14, idleSway: 15, idleGroan: 16, idleFeed: 17,
  swipeR: 18, swipeL: 19, bite: 20, grab: 21, lunge: 22, slam: 23, headbutt: 24, shove: 25, combo: 26, signature: 27,
  hitHead: 28, hitFront: 29, hitBack: 30, hitArmL: 31, hitArmR: 32, hitLegL: 33, hitLegR: 34, stagger: 35,
  dieHead: 36, dieFwd: 37, dieBack: 38, dieSpin: 39, dieKnees: 40, dieCollapse: 41, dieBlast: 42, dieSide: 43,
  emerge: 44, windup: 45, action: 46, recover: 47, roar: 48, getUp: 49 };
const AC_N = 50;
const AC_KIND = []; const AC_GROUP = [];
for (let i = 0; i < AC_N; i++) { AC_KIND[i] = i < 18 ? 'loop' : i < 28 ? 'once' : i < 35 ? 'add' : i === 35 ? 'once' : i < 44 ? 'death' : i === 45 || i === 46 ? 'hold' : 'once'; AC_GROUP[i] = i < 10 ? 'Moving' : i < 18 ? 'Idle' : i < 28 ? 'Attacks' : i < 36 ? 'Hit reactions' : i < 44 ? 'Deaths' : 'Specials'; }

const ANIMA = {
  live: 0, liveCap: 14, cached: 0, made: 0, hits: 0, miss: 0, ms: 0, msAvg: 0, adapt: 0, good: 0, watchT: 0,
  cache: new Map(), corpses: [], corpseCap: 80, bud: 0, statsF: 0, errT: [], offUntil: 0, bad: 0, badWhy: '',
  J: new Float32Array(NJ * 3), P2: new Float32Array(NJ * 3), tmp: new Float32Array(AN), tmp2: new Float32Array(AN), tmp3: new Float32Array(AN),
  shadowN: 0, deadN: 0, lastCorpseClean: 0
};
const A_SIN = Math.sin, A_COS = Math.cos;
const aSm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const aSeg = (u, a, b) => u <= a ? 0 : u >= b ? 1 : (u - a) / (b - a);
// attack/release envelope: up over a, down from b to 1
const aEnv = (u, a, b) => u < a ? aSm(u / a) : u > b ? 1 - aSm((u - b) / (1 - b)) : 1;
// a little organic noise (two sines with the zombie's own seed)
const aN = (t, s) => A_SIN(t * 1.7 + s) * 0.6 + A_SIN(t * 3.13 + s * 2.3) * 0.4;
function animaUp() { return !(ANIMA.offUntil && performance.now() < ANIMA.offUntil); }

/* ---------- each zombie's body and personality ---------- */
const A_BODY = {
  avg: { H: 5.6, shW: 0.76, chW: 0.95, chD: 0.52, belly: 0.12, limb: 0.34, leg: 0.4, head: 0.42, arm: 1 },
  thin: { H: 5.75, shW: 0.7, chW: 0.86, chD: 0.44, belly: 0, limb: 0.28, leg: 0.33, head: 0.4, arm: 1.02 },
  small: { H: 5.05, shW: 0.7, chW: 0.86, chD: 0.48, belly: 0.1, limb: 0.3, leg: 0.34, head: 0.42, arm: 0.96 },
  heavy: { H: 5.5, shW: 0.8, chW: 0.98, chD: 0.6, belly: 0.42, limb: 0.38, leg: 0.45, head: 0.42, arm: 0.98 },
  stocky: { H: 5.3, shW: 0.84, chW: 1, chD: 0.58, belly: 0.2, limb: 0.4, leg: 0.45, head: 0.43, arm: 0.98 },
  lanky: { H: 6.2, shW: 0.72, chW: 0.88, chD: 0.46, belly: 0, limb: 0.29, leg: 0.34, head: 0.4, arm: 1.14 },
  hunch: { H: 5.4, shW: 0.76, chW: 0.94, chD: 0.54, belly: 0.1, limb: 0.33, leg: 0.38, head: 0.42, arm: 1.03, hunch: 0.45 },
  buff: { H: 5.7, shW: 0.86, chW: 1.04, chD: 0.62, belly: 0.05, limb: 0.46, leg: 0.48, head: 0.41, arm: 1.02 },
  legless: { H: 5.6, shW: 0.76, chW: 0.94, chD: 0.52, belly: 0.05, limb: 0.32, leg: 0.4, head: 0.44, arm: 1.05, legless: 1 },
  bloat: { H: 5.5, shW: 0.8, chW: 0.98, chD: 0.68, belly: 0.95, limb: 0.38, leg: 0.47, head: 0.36, arm: 0.96 },
  brute: { H: 5.9, shW: 0.88, chW: 1.06, chD: 0.68, belly: 0.25, limb: 0.58, leg: 0.56, head: 0.35, arm: 1.12, hunch: 0.35 }
};
function animaDims(def) {
  const B = A_BODY[def.body] || A_BODY.avg, H = B.H;
  const D = { H: H, shW: B.shW, chW: B.chW, chD: B.chD, belly: B.belly, limb: B.limb, fore: B.limb * 0.85, leg: B.leg, shin: B.leg * 0.82,
    headR: B.head, hunch0: B.hunch || 0, legless: !!B.legless, spine: 0.3 * H, neck: 0.075 * H, shDrop: 0.05 * H,
    hipW: B.shW * 0.5, legL: 0.52 * H, armU: 0.19 * H * B.arm, armF: 0.235 * H * B.arm, foot: 0.13 * H, hand: B.limb * 0.62 };
  D.thigh = D.legL * 0.53; D.shinL = D.legL * 0.53;
  if (D.legless) D.legL = 0.5;
  if ((def.feat || []).indexOf('bigarm') >= 0) D.bigArm = 1;
  if ((def.feat || []).indexOf('noarmL') >= 0) D.noArmL = 1;
  if ((def.feat || []).indexOf('longfingers') >= 0 || (def.feat || []).indexOf('claws') >= 0) D.claws = 1;
  if (def.feat && def.feat.indexOf('belly') >= 0) D.belly = Math.max(D.belly, 0.7);
  return D;
}
const A_GAIT = {
  shamble: { stride: 0.85, bob: 0.011, sway: 0.1, lean: 0.12, hunch: 0.22, twist: 0.16, armSw: 0.2, asym: 0.45, stiff: 0.3, lift: 0.1, drag: 0.55, jerk: 0.08, hip: 0.08 },
  sprint: { stride: 1.6, bob: 0.024, sway: 0.05, lean: 0.34, hunch: 0.08, twist: 0.28, armSw: 0.9, asym: 0.08, stiff: 0.1, lift: 0.55, drag: 0, jerk: 0, hip: 0.12 },
  march: { stride: 1.15, bob: 0.009, sway: 0.03, lean: 0.02, hunch: 0, twist: 0.1, armSw: 0.3, asym: 0.04, stiff: 0.8, lift: 0.28, drag: 0, jerk: 0, hip: 0.06 },
  waddle: { stride: 0.7, bob: 0.014, sway: 0.24, lean: -0.04, hunch: 0.05, twist: 0.07, armSw: 0.25, asym: 0.1, stiff: 0.4, lift: 0.12, drag: 0, jerk: 0, hip: 0.04, wide: 0.24 },
  stomp: { stride: 1.05, bob: 0.03, sway: 0.11, lean: 0.15, hunch: 0.18, twist: 0.2, armSw: 0.3, asym: 0.12, stiff: 0.5, lift: 0.36, drag: 0, jerk: 0, hip: 0.08, wide: 0.08 },
  lope: { stride: 1.4, bob: 0.02, sway: 0.08, lean: 0.2, hunch: 0.12, twist: 0.25, armSw: 0.5, asym: 0.15, stiff: 0.1, lift: 0.3, drag: 0, jerk: 0, hip: 0.12 },
  drag: { stride: 0.8, bob: 0.016, sway: 0.15, lean: 0.2, hunch: 0.32, twist: 0.2, armSw: 0.2, asym: 0.85, stiff: 0.3, lift: 0.12, drag: 1, jerk: 0.05, hip: 0.14 },
  crawl: { stride: 0.6, bob: 0, sway: 0.08, lean: 1.3, hunch: 0, twist: 0.2, armSw: 1, asym: 0.2, stiff: 0, lift: 0, drag: 1, jerk: 0.05, hip: 0.1 },
  jerk: { stride: 0.95, bob: 0.012, sway: 0.08, lean: 0.1, hunch: 0.1, twist: 0.2, armSw: 0.3, asym: 0.3, stiff: 0.6, lift: 0.25, drag: 0, jerk: 0.85, hip: 0.1 },
  glide: { stride: 0.9, bob: 0.002, sway: 0.02, lean: 0.24, hunch: 0.14, twist: 0.04, armSw: 0.06, asym: 0.05, stiff: 0.9, lift: 0.05, drag: 0.2, jerk: 0, hip: 0.02 },
  stagger: { stride: 0.9, bob: 0.014, sway: 0.24, lean: 0.12, hunch: 0.2, twist: 0.22, armSw: 0.35, asym: 0.5, stiff: 0.2, lift: 0.15, drag: 0.3, jerk: 0.3, hip: 0.1 },
  scuttle: { stride: 1.0, bob: 0.01, sway: 0.06, lean: 1.2, hunch: 0, twist: 0.24, armSw: 1, asym: 0.1, stiff: 0, lift: 0.25, drag: 0, jerk: 0.1, hip: 0.14 },
  hop: { stride: 1.2, bob: 0.05, sway: 0.03, lean: 0.25, hunch: 0.1, twist: 0.08, armSw: 0.4, asym: 0.05, stiff: 0.2, lift: 0.5, drag: 0, jerk: 0, hip: 0.04 },
  limp: { stride: 0.8, bob: 0.02, sway: 0.16, lean: 0.12, hunch: 0.15, twist: 0.18, armSw: 0.3, asym: 0.9, stiff: 0.5, lift: 0.2, drag: 0.4, jerk: 0, hip: 0.1 }
};
const A_GAIT_NAME = { shamble: 'Shamble', sprint: 'Sprint', march: 'March', waddle: 'Waddle', stomp: 'Stomp', lope: 'Lope', drag: 'Drag', crawl: 'Crawl', jerk: 'Jerking walk', glide: 'Glide', stagger: 'Stagger', scuttle: 'Scuttle', hop: 'Bound', limp: 'Limp' };
function animaPersona(m) {
  const d = m.def, R = Z.mulberry32((m.seed ^ 0xa11ce) >>> 0), G0 = A_GAIT[d.gait] || A_GAIT.shamble, v = (b, k) => b * (1 + (R() - 0.5) * 2 * (k || 0.18));
  const P = { gait: d.gait, arms: d.arms, look: d.look, body: d.body, ab: d.ab, prop: d.hold || null,
    stride: v(G0.stride), bob: v(G0.bob, 0.3), sway: v(G0.sway, 0.3), lean: G0.lean + (R() - 0.5) * 0.08, hunch: G0.hunch + (R() - 0.5) * 0.08,
    twist: v(G0.twist, 0.3), armSw: v(G0.armSw, 0.3), asym: Math.min(1, G0.asym * (0.8 + R() * 0.5)), stiff: G0.stiff, lift: v(G0.lift, 0.25),
    drag: G0.drag, jerk: G0.jerk, hip: v(G0.hip, 0.3), wide: G0.wide || 0, side: R() < 0.5 ? -1 : 1,
    tempo: v(1, 0.22), headK: v(1, 0.3), seed: R() * 100, rnd: new Float32Array(64) };
  for (let i = 0; i < 64; i++) P.rnd[i] = R();
  if (d.feat && d.feat.indexOf('noarmL') >= 0) P.side = -1;   // the missing arm is the weak side
  if (d.body === 'legless') { P.gait = 'crawl'; Object.assign(P, { lean: 1.3, stride: 0.6 }); }
  return P;
}
// what each zombie calls its animations (the slot names, made its own)
const A_SIG = { cleaver: 'Cleaver chop', iceaxe: 'Ice axe swing', wrench: 'Wrench smash', hook: 'Hook slash', mop: 'Mop sweep', briefcase: 'Briefcase swing', bag: 'Mailbag swing',
  camera: 'Camera smash', medbag: 'Medbag swing', shield: 'Shield bash', scalpel: 'Scalpel stabs', bouquet: 'Bridal embrace', whistle: 'Rescue tackle' };
const A_ABN = { pounce: ['Crouch', 'Pounce'], sprinter: ['Set', 'Burst'], charger: ['Paw the ground', 'Charge'], spitter: ['Gather acid', 'Spit'], screamer: ['Draw breath', 'Scream'], bomber: ['Swell', 'Burst'],
  shocker: ['Build charge', 'Discharge'], thrower: ['Wind up', 'Throw'], medic: ['Reach out', 'Mend'], magnet: ['Swing the hook', 'Reel in'], carrier: ['Heave', 'Shed crawlers'], hive: ['Shudder', 'Release swarm'],
  oozer: ['Drip', 'Ooze'], regrower: ['Knit', 'Regrow'], berserker: ['Seethe', 'Frenzy'], chiller: ['Frost breath', 'Freeze'], relentless: ['Fix on you', 'Press on'], swimmer: ['Dive', 'Swim'], none: ['Brace', 'Lurch'] };
function animaNames(m) {
  const P = m.an, g = A_GAIT_NAME[P.gait] || 'Walk', ab = A_ABN[P.ab] || A_ABN.none, sig = A_SIG[P.prop] || (P.arms === 'claw' ? 'Claw rake' : P.arms === 'hug' ? 'Embrace' : 'Double rake');
  const legless = P.gait === 'crawl';
  return [g, legless ? 'Fast crawl' : 'Hurried ' + g.toLowerCase(), legless ? 'Scramble' : P.gait === 'sprint' ? 'Flat-out sprint' : 'Run', legless ? 'Crawl left' : 'Sidestep left', legless ? 'Crawl right' : 'Sidestep right',
    'Turn', 'Stumble', legless ? 'Drag' : 'Limp', legless ? 'Belly crawl' : 'Crawl', legless ? 'Recoil' : 'Back away',
    'Idle', 'Look around', 'Twitch', 'Sniff the air', 'Scratch', 'Sway', 'Groan', 'Feed',
    'Right swipe', 'Left swipe', 'Bite', 'Grab', 'Lunge', 'Slam', 'Headbutt', 'Shove', 'Combo', sig,
    'Head hit', 'Body hit (front)', 'Body hit (back)', 'Left arm hit', 'Right arm hit', 'Left leg hit', 'Right leg hit', 'Stagger',
    'Head shot death', 'Falls forward', 'Falls backward', 'Spinning fall', 'Drops to its knees', 'Collapses', 'Blown off its feet', 'Falls sideways',
    'Rise', ab[0], ab[1], 'Recover', 'Roar', 'Get back up'];
}
// clip lengths in seconds (loops: one cycle at walking pace, used for idles; the walk itself follows the ground)
function animaDur(m, ci) {
  const P = m.an, k = 1 / P.tempo;
  if (ci < 10) return 1.1 * k;
  if (ci < 18) return [3.2, 4.6, 2.6, 3.4, 3.8, 4.2, 3.6, 2.8][ci - 10] * k;
  if (ci < 28) return [0.62, 0.62, 0.58, 0.66, 0.72, 0.85, 0.6, 0.6, 1.05, 0.8][ci - 18] * (P.stiff > 0.6 ? 1.1 : 1) * k;
  if (ci < 35) return 0.42;
  if (ci === 35) return 0.8;
  if (ci < 44) return [1.25, 1.45, 1.4, 1.6, 1.9, 1.3, 1.5, 1.4][ci - 36];
  return [1.3, 0.5, 0.6, 0.7, 1.6, 1.5][ci - 44];
}
function animaBuildAll(list) {
  for (const m of list) {
    m.an = animaPersona(m); m.ad = animaDims(m.def); m.anames = animaNames(m);
    m.adur = new Float32Array(AC_N); for (let i = 0; i < AC_N; i++) m.adur[i] = animaDur(m, i);
    if (typeof lookBuild === 'function') m.al = lookBuild(m);
  }
}

/* ---------- the motion families (each zombie's personality shapes every one) ---------- */
// the legs, hips and torso of a walk cycle: ph 0..1 through one cycle (two steps), k how hard it goes
function aGait(o, ph, t, P, D, k, dir) {
  const g = P.gait, a = ph * Math.PI * 2, s = P.stride * (0.55 + 0.45 * k) * (dir || 1), weak = P.side;
  let sw = P.sway, bob = P.bob * (0.6 + 0.6 * k), lift = P.lift * (0.6 + 0.6 * k);
  if (g === 'crawl') { aCrawl(o, ph, t, P, D, k); return; }
  if (g === 'scuttle') { aScuttle(o, ph, t, P, D, k); return; }
  let aw = a;
  if (P.jerk > 0.5) { const q = 7; aw = Math.floor(ph * q + 0.5) / q * Math.PI * 2 + A_SIN(ph * q * Math.PI * 2) * 0.12; }
  else if (P.jerk > 0) aw = a + A_SIN(a * 3 + P.seed) * P.jerk;
  const cL = A_COS(aw), sL = A_SIN(aw), cR = -cL, sR = -sL;
  // feet: forward and back, lifted on the way forward; the weak side shorter, lower, dragged
  const wkS = 1 - P.asym * 0.45, wkL = 1 - P.drag * 0.85;
  const sLk = weak < 0 ? wkS : 1, sRk = weak > 0 ? wkS : 1, lLk = weak < 0 ? wkL : 1, lRk = weak > 0 ? wkL : 1;
  if (g === 'hop') {
    // bounding: both feet together, the body in the air between landings
    const air = Math.max(0, A_SIN(a)), land = Math.max(0, -A_SIN(a));
    o[AP.llS] = o[AP.lrS] = s * 0.6 * A_COS(a); o[AP.llL] = o[AP.lrL] = air * lift * 0.6;
    o[AP.rise] = air * 0.06 * k; o[AP.crouch] = land * 0.45 * k + 0.1; o[AP.lean] = P.lean + air * 0.15;
    o[AP.alP] = o[AP.arP] = -0.9 + air * 0.9; o[AP.alE] = o[AP.arE] = 0.7;
    o[AP.headP] = -air * 0.2 + 0.1; return;
  }
  o[AP.llS] = s * cL * sLk; o[AP.lrS] = s * cR * sRk;
  o[AP.llL] = Math.max(0, -sL) * lift * lLk; o[AP.lrL] = Math.max(0, -sR) * lift * lRk;
  if (P.drag > 0.6) { if (weak < 0) { o[AP.llS] = -s * 0.45 + s * 0.25 * cL; o[AP.llL] = 0; } else { o[AP.lrS] = -s * 0.45 + s * 0.25 * cR; o[AP.lrL] = 0; } }
  const wide = P.wide || 0; o[AP.llW] = wide; o[AP.lrW] = wide;
  // hips rise and fall twice a cycle, rock toward the foot on the ground, turn with the stride; the shoulders turn back
  let bb = -bob * A_COS(2 * aw);
  if (g === 'stomp') bb = -bob * (1 - Math.abs(A_SIN(aw)) * 2) - (Math.abs(A_COS(aw)) > 0.96 ? bob * 0.6 : 0);
  if (g === 'limp' || g === 'drag') bb += (weak < 0 ? Math.max(0, sL) : Math.max(0, sR)) * -bob * 1.6;
  o[AP.bob] = bb;
  if (g === 'waddle') sw *= 1.4;
  o[AP.leanS] = -sw * sL * (g === 'glide' ? 0.3 : 1) + (P.asym > 0.4 ? weak * P.asym * 0.07 : 0);
  if (g === 'stagger') o[AP.leanS] += aN(t * 0.9, P.seed) * 0.16;
  o[AP.hipY] = P.hip * cL * (P.stiff > 0.7 ? 0.5 : 1);
  o[AP.twist] = -P.twist * cL - o[AP.hipY];
  o[AP.lean] = P.lean + (k - 1) * 0.12 + (g === 'stomp' ? Math.abs(A_SIN(aw)) * 0.05 : 0);
  o[AP.hunch] = P.hunch;
  o[AP.crouch] = (g === 'stomp' ? 0.12 : g === 'lope' ? 0.1 : g === 'sprint' ? 0.08 : 0.04) + (P.stiff > 0.7 ? -0.03 : 0);
}
// the arms in motion, by how the zombie holds them
function aArms(o, ph, t, P, D, k) {
  if (P.gait === 'crawl' || P.gait === 'scuttle') return;   // on all fours (or hauling itself along) the gait moves the arms
  const a = ph * Math.PI * 2, sw = P.armSw * (0.5 + 0.5 * k), c = A_COS(a), s1 = P.seed, n1 = aN(t * 0.8, s1), n2 = aN(t * 0.8, s1 + 3);
  const set = (side, y, p, e) => { if (side < 0) { o[AP.alY] = y; o[AP.alP] = p; o[AP.alE] = e; } else { o[AP.arY] = y; o[AP.arP] = p; o[AP.arE] = e; } };
  // hanging arms swing past the vertical both ways (a pitch beyond -90 degrees points back), elbow bending on the way forward
  const dangle = side => set(side, 0.34 + (side < 0 ? n1 : n2) * 0.04, -1.36 + sw * 0.5 * (side < 0 ? -c : c) * (P.stiff > 0.7 ? 0.6 : 1), 0.3 + 0.22 * Math.max(0, side < 0 ? -c : c));
  const reach = (side, low) => set(side, 0.2 + (side < 0 ? n1 : n2) * 0.06, -0.34 - (low || 0) + 0.1 * (side < 0 ? c : -c) + (side < 0 ? n1 : n2) * 0.05, 0.42 + (side < 0 ? n2 : n1) * 0.08);
  switch (P.arms) {
    case 'reach': reach(-1, P.side < 0 ? P.asym * 0.5 : 0); reach(1, P.side > 0 ? P.asym * 0.5 : 0); o[AP.grip] = 0.4; break;
    case 'pump': set(-1, 0.1, -1.5 - 0.62 * c * Math.min(1.4, k), 1.65); set(1, 0.1, -1.5 + 0.62 * c * Math.min(1.4, k), 1.65); o[AP.grip] = 0.8; break;
    case 'claw': set(-1, 0.34 + n1 * 0.05, -0.55 + 0.1 * c, 1.2 + n2 * 0.1); set(1, 0.34 + n2 * 0.05, -0.55 - 0.1 * c, 1.2 + n1 * 0.1); o[AP.grip] = 0; break;
    case 'flail': set(-1, 0.4 + 0.42 * A_SIN(t * 2.3 + s1), -0.8 + 0.6 * A_SIN(t * 3.1 + s1), 0.5 + 0.4 * A_SIN(t * 4.2)); set(1, 0.4 + 0.42 * A_SIN(t * 2.7 + s1 + 1), -0.8 + 0.6 * A_SIN(t * 2.9 + s1 + 2), 0.5 + 0.4 * A_SIN(t * 3.7 + 1)); break;
    case 'one': dangle(-1); reach(1, 0); o[AP.grip] = 0.3; break;
    case 'carry': dangle(-1); set(1, 0.1 + 0.05 * c, -1.05 + 0.06 * A_SIN(a * 2), 1.15); o[AP.grip] = 1; break;
    case 'wide': set(-1, 0.52, -1.05 + 0.16 * c, 0.55); set(1, 0.52, -1.05 - 0.16 * c, 0.55); o[AP.grip] = 0.7; break;
    case 'hug': set(-1, -0.1 + n1 * 0.04, -0.06 + 0.06 * c, 0.62); set(1, -0.1 + n2 * 0.04, -0.06 - 0.06 * c, 0.62); o[AP.grip] = 0.2; break;
    case 'hook': reach(-1, 0.1); set(1, 0.32, 0.2 + 0.08 * c, 1.5); o[AP.grip] = 1; break;
    case 'shield': set(-1, -0.45, -0.32 + 0.04 * c, 1.5); set(1, 0.16, -1.15 + 0.15 * c, 0.6); o[AP.grip] = 1; break;
    default: dangle(-1); dangle(1);
  }
  if (D.noArmL) { o[AP.alP] = -1.3 + 0.2 * c; o[AP.alE] = 0; }
}
// the head, by how the zombie carries it
function aHead(o, t, P, k) {
  const s = P.seed, h = P.headK;
  switch (P.look) {
    case 'loll': o[AP.headR] = 0.34 * A_SIN(t * 0.9 + s) * h; o[AP.headP] = -0.22 + 0.15 * A_SIN(t * 0.7 + s); o[AP.headY] = 0.25 * A_SIN(t * 0.5 + s * 2); break;
    case 'scan': o[AP.headY] = 0.75 * A_SIN(t * 0.6 + s); o[AP.headP] = 0.05; break;
    case 'low': o[AP.headP] = -0.45 + 0.06 * A_SIN(t * 1.1 + s); o[AP.headY] = 0.12 * aN(t * 0.4, s); break;
    case 'tilt': o[AP.headR] = 0.42 * (P.rnd[3] < 0.5 ? -1 : 1) + 0.08 * A_SIN(t * 0.8 + s); o[AP.headY] = 0.1 * aN(t * 0.5, s); break;
    case 'up': o[AP.headP] = 0.32 + 0.08 * A_SIN(t * 2.4 + s); o[AP.headY] = 0.15 * aN(t * 0.6, s); break;
    case 'jerk': { const q = Math.floor(t * 1.3 + s), f = (t * 1.3 + s) - q, prev = A_SIN(q * 12.9898 + s) * 0.7, cur = A_SIN((q + 1) * 12.9898 + s) * 0.7; o[AP.headY] = prev + (cur - prev) * aSm(f * 6); o[AP.headR] = 0.15 * A_SIN(q * 7.1); break; }
    case 'twitch': o[AP.headY] = 0.1 * aN(t * 6, s) + (A_SIN(t * 0.9 + s) > 0.93 ? 0.5 : 0); o[AP.headR] = 0.1 * aN(t * 7, s + 2); o[AP.shake] = 0.25; break;
    default: o[AP.headY] = 0.08 * aN(t * 0.5, s); o[AP.headP] = 0.04 * A_SIN(t * 1.3);
  }
  o[AP.jaw] = Math.max(0, 0.18 + 0.2 * aN(t * 1.4, s + 5));
}
// legless: hauls itself along on its arms, the torso flat to the ground and the head up. Each arm reaches out ahead
// (lifted, opening), plants, and drags the body past it (the hand sweeping back to the side, the elbow folding); the
// two arms take turns and the shoulders roll toward the one that is reaching
function aCrawl(o, ph, t, P, D, k) {
  const a = ph * Math.PI * 2, sn = A_SIN(a);
  o[AP.lean] = 1.32; o[AP.hunch] = -0.1; o[AP.headP] = 1.1 + 0.1 * A_SIN(a * 2); o[AP.crouch] = 0;
  for (let side = -1; side <= 1; side += 2) {
    const q = (ph + (side > 0 ? 0.5 : 0)) % 1, b = side < 0 ? AP.alY : AP.arY;
    if (q < 0.42) { const f = aSm(q / 0.42); o[b] = 1.0 - 0.8 * f; o[b + 1] = -0.55 + 0.45 * f + 0.15 * A_SIN(f * Math.PI); o[b + 2] = 1.1 - 0.85 * f; }
    else { const f = aSm((q - 0.42) / 0.58); o[b] = 0.2 + 0.85 * f; o[b + 1] = -0.1 - 0.75 * f; o[b + 2] = 0.25 + 0.9 * f; }
  }
  o[AP.twist] = 0.28 * sn; o[AP.hipY] = -0.12 * sn; o[AP.leanS] = 0.07 * sn;
  o[AP.offX] = -0.1 * Math.abs(A_COS(a)) * k; o[AP.llS] = -0.4; o[AP.lrS] = -0.4; o[AP.grip] = 0.7; o[AP.jaw] = 0.25 + 0.2 * Math.abs(sn);
}
// on all fours: the arms become front legs
function aScuttle(o, ph, t, P, D, k) {
  const a = ph * Math.PI * 2, c = A_COS(a), sn = A_SIN(a), s = P.stride * (0.6 + 0.4 * k);
  o[AP.lean] = 1.15; o[AP.hunch] = 0.05; o[AP.headP] = 0.95 + 0.06 * A_SIN(a * 2); o[AP.crouch] = 0.5;
  o[AP.llS] = -0.6 + s * c; o[AP.lrS] = -0.6 - s * c; o[AP.llL] = Math.max(0, -sn) * 0.3; o[AP.lrL] = Math.max(0, sn) * 0.3; o[AP.llW] = o[AP.lrW] = 0.15;
  o[AP.alY] = 0.25; o[AP.arY] = 0.25; o[AP.alP] = -1.2 - 0.35 * c; o[AP.arP] = -1.2 + 0.35 * c; o[AP.alE] = 0.25 + 0.2 * Math.max(0, sn); o[AP.arE] = 0.25 + 0.2 * Math.max(0, -sn);
  o[AP.bob] = -0.012 * A_COS(a * 2); o[AP.twist] = 0.16 * c; o[AP.grip] = 0.5;
}
// standing still: weight shifting, breathing, the arms settling
function aIdle(o, t, P, D) {
  const s = P.seed, br = A_SIN(t * 1.6 + s);
  o[AP.bob] = 0.004 * br; o[AP.lean] = P.lean * 0.8 + 0.03 * br; o[AP.hunch] = P.hunch + 0.02 * br;
  o[AP.leanS] = 0.05 * A_SIN(t * 0.45 + s) + P.side * P.asym * 0.05; o[AP.hipY] = 0.06 * A_SIN(t * 0.35 + s);
  o[AP.llS] = 0.12 + P.rnd[5] * 0.12; o[AP.lrS] = -0.08 - P.rnd[6] * 0.12; o[AP.llW] = o[AP.lrW] = 0.05 + P.wide * 0.8;
  if (P.gait === 'crawl') { aCrawl(o, 0.25, t, P, D, 0); o[AP.offX] = 0; o[AP.headP] = 1.0 + 0.1 * br; }
  else if (P.gait === 'scuttle') { aScuttle(o, 0.25, t, P, D, 0); o[AP.headP] = 0.9 + 0.08 * br; }
  aArms(o, 0.25 + 0.04 * br, t, P, D, 0.15); aHead(o, t, P, 0);
}

/* ---------- evaluating an animation: every slot, for this zombie ---------- */
// writes the pose of animation ci at u (a loop's phase, or how far through a one-off it is) at time t into o
function animaEval(o, m, ci, u, t) {
  o.set(AP_REST);
  const P = m.an, D = m.ad, R = P.rnd, sd = P.side;
  if (ci < 10) {
    switch (ci) {
      case AC.walk: aGait(o, u, t, P, D, 1); aArms(o, u, t, P, D, 1); aHead(o, t, P, 1); break;
      case AC.walkFast: aGait(o, u, t, P, D, 1.35); aArms(o, u, t, P, D, 1.4); aHead(o, t, P, 1.2); o[AP.lean] += 0.06; break;
      case AC.run: {
        aGait(o, u, t, P, D, 1.9); aHead(o, t, P, 1.5);
        if (P.arms === 'reach' || P.arms === 'claw' || P.arms === 'hug') { aArms(o, u, t, P, D, 1.6); o[AP.alP] += 0.15; o[AP.arP] += 0.15; o[AP.alY] += 0.1; o[AP.arY] += 0.1; }
        else if (P.arms === 'carry' || P.arms === 'shield' || P.arms === 'hook') aArms(o, u, t, P, D, 1.6);
        else { const P2 = P.arms; P.arms = 'pump'; aArms(o, u, t, P, D, 1.6); P.arms = P2; }
        o[AP.lean] += 0.18; o[AP.headP] += 0.15; o[AP.jaw] = 0.45 + 0.2 * A_SIN(t * 7); break;
      }
      case AC.strafeL: case AC.strafeR: {
        const sg = ci === AC.strafeL ? -1 : 1, a = u * Math.PI * 2;
        aGait(o, u, t, P, D, 0.6); aArms(o, u, t, P, D, 0.6); aHead(o, t, P, 1);
        if (P.gait !== 'crawl' && P.gait !== 'scuttle') {
          o[AP.llS] *= 0.25; o[AP.lrS] *= 0.25;
          o[AP.llW] = 0.06 + sg * 0.22 * A_COS(a); o[AP.lrW] = 0.06 - sg * 0.22 * A_COS(a);
        }
        o[AP.leanS] += sg * 0.12; o[AP.twist] += sg * 0.18; o[AP.headY] -= sg * 0.25; break;
      }
      case AC.turn: {
        const a = u * Math.PI * 2; aIdle(o, t, P, D);
        o[AP.llS] = 0.15 * A_COS(a); o[AP.lrS] = -0.15 * A_COS(a); o[AP.llL] = Math.max(0, A_SIN(a)) * 0.15; o[AP.lrL] = Math.max(0, -A_SIN(a)) * 0.15;
        o[AP.twist] = 0.3 * sd; o[AP.headY] = 0.55 * sd; o[AP.leanS] = 0.06 * A_SIN(a); break;
      }
      case AC.stumble: {
        aGait(o, u, t, P, D, 0.9); aArms(o, u, t, P, D, 1); aHead(o, t, P, 1);
        const lur = Math.max(0, A_SIN(u * Math.PI * 2 + R[7] * 6)) ** 4;
        o[AP.lean] += 0.2 + lur * 0.35; o[AP.leanS] += (R[8] - 0.5) * 0.4 * lur + aN(t * 1.3, P.seed) * 0.12; o[AP.headP] -= 0.25; o[AP.headR] += 0.2 * aN(t, P.seed + 1);
        o[AP.alP] += lur * 0.5; o[AP.arP] += lur * 0.4; o[AP.alY] += lur * 0.4; o[AP.arY] += lur * 0.4; break;
      }
      case AC.limp: {
        const p2 = P.gait, d2 = P.drag, a2 = P.asym; if (P.gait !== 'crawl') { P.gait = 'limp'; P.drag = Math.max(0.5, d2); P.asym = 0.9; }
        aGait(o, u, t, P, D, 0.75); P.gait = p2; P.drag = d2; P.asym = a2;
        aArms(o, u, t, P, D, 0.8); aHead(o, t, P, 1); o[AP.lean] += 0.12; o[AP.hunch] += 0.1; break;
      }
      case AC.crawl: {
        const p2 = P.gait; P.gait = 'crawl'; aCrawl(o, u, t, P, D, 1); P.gait = p2;
        o[AP.llS] = -0.7; o[AP.lrS] = -0.9; o[AP.llW] = 0.15; o[AP.lrW] = 0.25; o[AP.jaw] = 0.3 + 0.2 * A_SIN(t * 3); break;
      }
      case AC.back: {
        aGait(o, 1 - u, t, P, D, 0.7, -1); aArms(o, u, t, P, D, 0.7); aHead(o, t, P, 1);
        o[AP.lean] -= 0.12; o[AP.headP] += 0.1; break;
      }
    }
    return;
  }
  if (ci < 18) {
    aIdle(o, t, P, D);
    const s = P.seed;
    switch (ci) {
      case AC.idleLook: o[AP.headY] = 0.9 * A_SIN(t * 0.75 + s) * (A_SIN(t * 0.3) > -0.2 ? 1 : 0.3); o[AP.twist] = o[AP.headY] * 0.3; break;
      case AC.idleTwitch: { const sp = Math.max(0, A_SIN(t * 2.1 + s)) ** 12; o[AP.headY] += sp * 0.6 * (R[9] - 0.5) * 2; o[AP.headR] += sp * 0.5; o[AP.alP] += sp * 0.6; o[AP.shake] = 0.3 + sp * 0.6; o[AP.leanS] += sp * 0.12; break; }
      case AC.idleSniff: o[AP.headP] = 0.55 + 0.1 * A_SIN(t * 9); o[AP.headY] = 0.4 * A_SIN(t * 0.5 + s); o[AP.lean] -= 0.08; o[AP.jaw] = 0.1; o[AP.hunch] -= 0.1; break;
      case AC.idleScratch: { const sc = A_SIN(t * 11) * 0.12, side = R[10] < 0.5 ? -1 : 1; if (side > 0 || !D.noArmL) { const y = side < 0 ? AP.alY : AP.arY; o[y] = -0.6; o[y + 1] = -0.2 + sc; o[y + 2] = 2.1 + sc; } o[AP.headR] = side * -0.2; o[AP.headP] = -0.2; break; }
      case AC.idleSway: o[AP.leanS] = 0.16 * A_SIN(t * 0.8 + s); o[AP.lean] += 0.06 * A_SIN(t * 0.55 + s); o[AP.alP] += 0.2 * A_SIN(t * 0.8 + s + 1); o[AP.arP] += 0.2 * A_SIN(t * 0.8 + s + 1.5); o[AP.headR] = 0.25 * A_SIN(t * 0.8 + s + 0.5); break;
      case AC.idleGroan: { const gr = Math.max(0, A_SIN(t * 1.4 + s)); o[AP.headP] += gr * 0.5; o[AP.jaw] = 0.2 + gr * 0.8; o[AP.lean] -= gr * 0.1; o[AP.alP] += gr * 0.25; o[AP.arP] += gr * 0.25; o[AP.shake] = gr * 0.3; break; }
      case AC.idleFeed: { const ch = A_SIN(t * 6) * 0.5 + 0.5; o[AP.crouch] = 0.85; o[AP.lean] = 0.8; o[AP.hunch] += 0.3; o[AP.headP] = -0.4 - ch * 0.25; o[AP.jaw] = ch; o[AP.alP] = -1.0 - ch * 0.2; o[AP.arP] = -0.95; o[AP.alE] = o[AP.arE] = 1.3; o[AP.alY] = o[AP.arY] = 0.1; o[AP.llS] = 0.35; o[AP.lrS] = -0.35; break; }
    }
    return;
  }
  if (ci < 28) { aAttack(o, m, ci, u, t); return; }
  if (ci < 36) { aHit(o, m, ci, u, t); return; }
  if (ci < 44) { aDeath(o, m, ci, u, t); return; }
  aSpecial(o, m, ci, u, t);
}
// attacks: a tell, the strike, the follow-through (only the upper body: the legs keep doing what they were)
function aAttack(o, m, ci, u, t) {
  const P = m.an, D = m.ad, R = P.rnd;
  aIdle(o, t, P, D); o[AP.headY] = 0; o[AP.headP] = 0.05;
  const an = aSeg(u, 0, 0.38), st = aSeg(u, 0.38, 0.56), rc = aSeg(u, 0.56, 1), w = aSm(an) * (1 - aSm(rc));
  const k = 1 + (R[11] - 0.5) * 0.3, stiff = P.stiff;
  const arm = (side, y, p, e) => { const b = side < 0 ? AP.alY : AP.arY; o[b] = y; o[b + 1] = p; o[b + 2] = e; };
  const sw = (side) => {
    // a swipe: drawn back and out, then raked across the body
    const y0 = 0.95 * k, y1 = -0.55 * k, yy = an < 1 ? 0.2 + (y0 - 0.2) * aSm(an) : y0 + (y1 - y0) * aSm(st), p = an < 1 ? -0.4 + 0.75 * aSm(an) : 0.35 - 0.55 * aSm(st);
    arm(side, yy + (0.2 - yy) * aSm(rc), p + (-0.3 - p) * aSm(rc), 0.9 - 0.6 * aSm(st) + 0.4 * aSm(rc));
    o[AP.twist] = side * (0.42 * aSm(an) - 0.95 * aSm(st)) * (1 - aSm(rc)) * k; o[AP.lean] += 0.3 * aSm(st) * (1 - aSm(rc)); o[AP.jaw] = 0.3 + 0.6 * aSm(st) * (1 - rc);
    o[AP.grip] = 0;
  };
  switch (ci) {
    case AC.swipeR: sw(1); arm(-1, 0.2, -0.6, 0.5); break;
    case AC.swipeL: if (D.noArmL) { sw(1); break; } sw(-1); arm(1, 0.2, -0.6, 0.5); break;
    case AC.bite: {
      arm(-1, 0.25 - 0.3 * aSm(st), -0.15 + 0.1 * w, 0.6 + 0.4 * aSm(st)); arm(1, 0.25 - 0.3 * aSm(st), -0.15 + 0.1 * w, 0.6 + 0.4 * aSm(st));
      o[AP.lean] += -0.12 * aSm(an) + 0.5 * aSm(st) * (1 - aSm(rc)); o[AP.hunch] += 0.35 * aSm(st) * (1 - aSm(rc)); o[AP.headP] = 0.3 * aSm(an) - 0.35 * aSm(st);
      o[AP.jaw] = u < 0.5 ? aSm(u / 0.5) : 1 - aSm((u - 0.5) / 0.12); o[AP.shake] = 0.3 * aSm(st) * (1 - rc); break;
    }
    case AC.grab: {
      const y = 0.85 * aSm(an) - 1.1 * aSm(st); arm(-1, y + 0.2, -0.1, 0.4 + 0.6 * aSm(st)); arm(1, y + 0.2, -0.1, 0.4 + 0.6 * aSm(st));
      o[AP.lean] += 0.35 * aSm(st) * (1 - aSm(rc)); o[AP.jaw] = 0.7 * aSm(st); o[AP.grip] = aSm(st); break;
    }
    case AC.lunge: {
      arm(-1, 0.15, -0.6 + 0.65 * aSm(st), 0.3); arm(1, 0.15, -0.6 + 0.65 * aSm(st), 0.3);
      o[AP.lean] += -0.15 * aSm(an) + 0.6 * aSm(st) * (1 - aSm(rc)); o[AP.crouch] = 0.35 * aSm(an) * (1 - aSm(st)); o[AP.offX] = 0.55 * aSm(st) * (1 - aSm(rc));
      o[AP.jaw] = 0.9 * aSm(st) * (1 - rc); o[AP.headP] = 0.25 * aSm(st); break;
    }
    case AC.slam: {
      const p = -0.8 + 2.1 * aSm(an) - 2.2 * aSm(st); arm(-1, 0.25, p, 0.35); arm(1, 0.25, p, 0.35);
      o[AP.lean] += -0.2 * aSm(an) + 0.55 * aSm(st) * (1 - aSm(rc)); o[AP.crouch] = 0.35 * aSm(st) * (1 - aSm(rc)); o[AP.headP] = 0.4 * aSm(an) - 0.4 * aSm(st); o[AP.jaw] = 0.8 * aSm(st) * (1 - rc); o[AP.grip] = 1; break;
    }
    case AC.headbutt: {
      o[AP.lean] += -0.3 * aSm(an) + 0.75 * aSm(st) * (1 - aSm(rc)); o[AP.headP] = 0.55 * aSm(an) - 0.6 * aSm(st); o[AP.hunch] += 0.3 * aSm(st) * (1 - rc);
      arm(-1, 0.6, -0.9, 0.6); arm(1, 0.6, -0.9, 0.6); o[AP.offX] = 0.3 * aSm(st) * (1 - aSm(rc)); break;
    }
    case AC.shove: {
      const e = 1.6 * aSm(an) * (1 - aSm(st)) + 0.1, p = -0.45 + 0.4 * aSm(st); arm(-1, 0.1, p, e); arm(1, 0.1, p, e);
      o[AP.lean] += -0.1 * aSm(an) + 0.45 * aSm(st) * (1 - aSm(rc)); o[AP.offX] = 0.3 * aSm(st) * (1 - aSm(rc)); o[AP.grip] = 0.2; break;
    }
    case AC.combo: {
      const u1 = Math.min(1, u * 1.8), u2 = Math.max(0, (u - 0.42) * 1.72);
      const P1 = AT_TMP; if (u < 0.55) { aAttack(P1, m, AC.swipeR, u1, t); } else { aAttack(P1, m, D.noArmL ? AC.swipeR : AC.swipeL, u2, t); }
      o.set(P1); break;
    }
    case AC.signature: aSignature(o, m, u, an, st, rc, arm, k); break;
  }
  if (stiff > 0.7) o[AP.twist] *= 0.6;
}
const AT_TMP = new Float32Array(AN);
// the attack that is the zombie's own (what it holds decides it)
function aSignature(o, m, u, an, st, rc, arm, k) {
  const P = m.an, pr = P.prop;
  if (pr === 'cleaver' || pr === 'iceaxe' || pr === 'wrench' || pr === 'hook') {
    // an overhead chop: raised high, brought down hard
    const p = -0.6 + 2.0 * aSm(an) - 2.4 * aSm(st) + 1.0 * aSm(rc) * 0.6;
    arm(1, 0.35 - 0.45 * aSm(st), p, 1.3 * (1 - aSm(st)) + 0.25); arm(-1, 0.3, -0.7, 0.6);
    o[AP.twist] = 0.5 * aSm(an) - 0.6 * aSm(st) * (1 - aSm(rc)); o[AP.lean] += -0.15 * aSm(an) + 0.5 * aSm(st) * (1 - aSm(rc)); o[AP.jaw] = 0.8 * aSm(st) * (1 - rc);
  } else if (pr === 'shield') {
    // the shield driven forward, the body behind it
    arm(-1, -0.45 + 0.45 * aSm(st), -0.35 + 0.3 * aSm(st), 1.5 - 1.2 * aSm(st)); arm(1, 0.2, -0.9, 0.7);
    o[AP.lean] += -0.1 * aSm(an) + 0.45 * aSm(st) * (1 - aSm(rc)); o[AP.offX] = 0.5 * aSm(st) * (1 - aSm(rc)); o[AP.twist] = -0.3 * aSm(an) + 0.3 * aSm(st);
  } else if (pr === 'scalpel') {
    // two quick stabs
    const s1 = aEnv(aSeg(u, 0.25, 0.5), 0.4, 0.6), s2 = aEnv(aSeg(u, 0.55, 0.85), 0.4, 0.6);
    arm(1, 0.05, -0.3 + 0.25 * Math.max(s1, s2), 1.4 - 1.2 * Math.max(s1, s2)); arm(-1, 0.4, -0.5, 1.1);
    o[AP.lean] += 0.25 * Math.max(s1, s2); o[AP.twist] = -0.25 * Math.max(s1, s2);
  } else if (pr === 'bouquet') {
    // the bride's embrace: arms wide, then closing round you
    const y = 1.0 * aSm(an) - 1.25 * aSm(st); arm(-1, y, -0.05, 0.5 + 0.5 * aSm(st)); arm(1, y, -0.05, 0.5 + 0.5 * aSm(st));
    o[AP.lean] += 0.4 * aSm(st) * (1 - aSm(rc)); o[AP.headR] = 0.4 * aSm(st); o[AP.jaw] = 0.5 * aSm(st);
  } else if (pr) {
    // a wide sideways swing with whatever it carries
    const y = 1.0 * aSm(an) - 1.85 * aSm(st) + 0.85 * aSm(rc); arm(1, y, -0.35 + 0.1 * aSm(an), 0.4); arm(-1, 0.25, -0.75, 0.5);
    o[AP.twist] = 0.55 * aSm(an) - 0.9 * aSm(st) * (1 - aSm(rc)); o[AP.lean] += 0.25 * aSm(st) * (1 - aSm(rc));
  } else {
    // both claws raked down at once
    const p = -0.4 + 1.3 * aSm(an) - 1.7 * aSm(st); arm(-1, 0.35, p, 0.9 - 0.5 * aSm(st)); arm(1, 0.35, p, 0.9 - 0.5 * aSm(st));
    o[AP.lean] += -0.15 * aSm(an) + 0.5 * aSm(st) * (1 - aSm(rc)); o[AP.jaw] = 0.9 * aSm(st) * (1 - rc); o[AP.grip] = 0;
  }
}
// hit reactions: layered on top of whatever the zombie is doing (these are the deltas; 'stagger' is a whole move)
function aHit(o, m, ci, u, t) {
  const P = m.an, R = P.rnd, e = u < 0.12 ? aSm(u / 0.12) : 1 - aSm((u - 0.12) / 0.88);
  o.fill(0);
  if (ci === AC.stagger) {
    o.set(AP_REST); aIdle(o, t, P, m.ad);
    const a = u * Math.PI * 2 * 1.5, k = 1 - aSm(u);
    o[AP.lean] = -0.45 * k + 0.1; o[AP.offX] = -0.7 * aSm(Math.min(1, u * 1.6)); o[AP.llS] = 0.4 * A_SIN(a) * k; o[AP.lrS] = -0.4 * A_SIN(a) * k; o[AP.llL] = Math.max(0, A_COS(a)) * 0.3 * k; o[AP.lrL] = Math.max(0, -A_COS(a)) * 0.3 * k;
    o[AP.alP] = 0.2 * k - 0.9 * (1 - k); o[AP.arP] = 0.1 * k - 0.9 * (1 - k); o[AP.alY] = o[AP.arY] = 0.9 * k + 0.2; o[AP.headP] = 0.5 * k; o[AP.leanS] = (R[12] - 0.5) * 0.4 * k; o[AP.crouch] = 0.2 * k;
    return;
  }
  switch (ci) {
    case AC.hitHead: o[AP.headP] = 0.75 * e; o[AP.headR] = (R[13] - 0.5) * 0.7 * e; o[AP.headY] = (R[14] - 0.5) * 0.6 * e; o[AP.lean] = -0.16 * e; o[AP.jaw] = 0.5 * e; break;
    case AC.hitFront: o[AP.lean] = -0.34 * e; o[AP.hunch] = -0.1 * e; o[AP.alP] = 0.35 * e; o[AP.arP] = 0.35 * e; o[AP.alY] = 0.3 * e; o[AP.arY] = 0.3 * e; o[AP.headP] = 0.3 * e; o[AP.offX] = -0.16 * e; o[AP.jaw] = 0.4 * e; break;
    case AC.hitBack: o[AP.lean] = 0.36 * e; o[AP.headP] = -0.35 * e; o[AP.alP] = 0.2 * e; o[AP.arP] = 0.2 * e; o[AP.offX] = 0.16 * e; break;
    case AC.hitArmL: o[AP.alY] = 0.7 * e; o[AP.alP] = 0.45 * e; o[AP.alE] = -0.15 * e; o[AP.twist] = -0.38 * e; o[AP.leanS] = -0.1 * e; break;
    case AC.hitArmR: o[AP.arY] = 0.7 * e; o[AP.arP] = 0.45 * e; o[AP.arE] = -0.15 * e; o[AP.twist] = 0.38 * e; o[AP.leanS] = 0.1 * e; break;
    case AC.hitLegL: o[AP.crouch] = 0.38 * e; o[AP.leanS] = -0.3 * e; o[AP.llS] = -0.25 * e; o[AP.alY] = 0.3 * e; o[AP.alP] = 0.3 * e; break;
    case AC.hitLegR: o[AP.crouch] = 0.38 * e; o[AP.leanS] = 0.3 * e; o[AP.lrS] = -0.25 * e; o[AP.arY] = 0.3 * e; o[AP.arP] = 0.3 * e; break;
  }
}
// deaths: from the pose the zombie was in to a body on the ground (a gravity fall with a small bounce)
function aFallK(u, u0, u1) {
  if (u <= u0) return 0; if (u < u1) { const f = (u - u0) / (u1 - u0); return f * f; }
  const b = (u - u1) / (1 - u1); return 1 - 0.07 * A_SIN(Math.min(1, b * 1.6) * Math.PI) * (1 - b);
}
function aDeath(o, m, ci, u, t) {
  const P = m.an, D = m.ad, R = P.rnd, s = R[15] < 0.5 ? -1 : 1, lim = 1 - aSm(aSeg(u, 0.55, 1)) * 0.0;
  // the limbs of a body on the ground, splayed its own way
  const splay = (k, side) => { o[AP.alY] = (0.9 + R[16] * 0.7) * k + o[AP.alY] * (1 - k); o[AP.arY] = (0.9 + R[17] * 0.7) * k + o[AP.arY] * (1 - k); o[AP.alP] = (-0.1 - R[18] * 0.5) * k + o[AP.alP] * (1 - k); o[AP.arP] = (-0.1 - R[19] * 0.5) * k + o[AP.arP] * (1 - k); o[AP.alE] = (0.2 + R[20] * 0.9) * k; o[AP.arE] = (0.2 + R[21] * 0.9) * k; o[AP.llW] = (0.15 + R[22] * 0.35) * k; o[AP.lrW] = (0.15 + R[23] * 0.35) * k; o[AP.llS] = (R[24] - 0.5) * 0.8 * k; o[AP.lrS] = (R[25] - 0.5) * 0.8 * k; o[AP.jaw] = 0.3 + R[26] * 0.6; o[AP.grip] = 0.3; };
  o[AP.crouch] = 0; o[AP.jaw] = 0.3;
  switch (ci) {
    case AC.dieHead: {
      const sn = aSm(aSeg(u, 0, 0.08)), bk = aSm(aSeg(u, 0.05, 0.3));
      o[AP.headP] = 0.95 * sn - 0.3 * aSm(aSeg(u, 0.6, 1)); o[AP.headR] = s * 0.4 * sn; o[AP.lean] = -0.25 * sn; o[AP.crouch] = 0.55 * bk * (1 - aSm(aSeg(u, 0.4, 0.6)));
      o[AP.alP] = -1.4 + 2.0 * sn - 1.5 * aSm(aSeg(u, 0.3, 0.6)); o[AP.arP] = o[AP.alP]; o[AP.alY] = o[AP.arY] = 0.5 + 0.6 * sn;
      o[AP.fall] = aFallK(u, 0.14, 0.56); o[AP.fallA] = Math.PI + s * (0.25 + R[27] * 0.3); splay(aSm(aSeg(u, 0.45, 0.8)));
      o[AP.offX] = -0.35 * aSm(aSeg(u, 0, 0.4)); break;
    }
    case AC.dieFwd: {
      const lr = aSm(aSeg(u, 0, 0.25));
      o[AP.lean] = 0.25 * lr; o[AP.hunch] = 0.3 * lr; o[AP.headP] = -0.6 * lr; o[AP.crouch] = 0.3 * lr * (1 - aSm(aSeg(u, 0.3, 0.55)));
      o[AP.alP] = -1.4 + 1.2 * aSm(aSeg(u, 0.3, 0.55)); o[AP.arP] = o[AP.alP]; o[AP.alY] = o[AP.arY] = 0.25;
      o[AP.llS] = 0.35 * lr; o[AP.fall] = aFallK(u, 0.2, 0.62); o[AP.fallA] = (R[28] - 0.5) * 0.6; splay(aSm(aSeg(u, 0.55, 0.85)) * 0.7);
      o[AP.offX] = 0.4 * aSm(aSeg(u, 0, 0.5)); break;
    }
    case AC.dieBack: {
      const kb = aSm(aSeg(u, 0, 0.3));
      o[AP.lean] = -0.4 * kb; o[AP.headP] = 0.5 * kb; o[AP.offX] = -0.9 * aSm(aSeg(u, 0, 0.55)); o[AP.llS] = -0.45 * kb; o[AP.lrS] = 0.2 * kb; o[AP.lrL] = 0.25 * kb * (1 - kb);
      o[AP.alP] = -1.4 + 1.6 * kb; o[AP.arP] = -1.4 + 1.7 * kb; o[AP.alY] = o[AP.arY] = 0.4 + 0.8 * kb;
      o[AP.fall] = aFallK(u, 0.2, 0.6); o[AP.fallA] = Math.PI + (R[29] - 0.5) * 0.5; splay(aSm(aSeg(u, 0.5, 0.85))); break;
    }
    case AC.dieSpin: {
      const sp = aSm(aSeg(u, 0, 0.55));
      o[AP.spin] = s * (1.6 + R[30] * 1.4) * sp; o[AP.twist] = s * 0.6 * aSm(aSeg(u, 0, 0.2)) * (1 - sp); o[AP.alY] = o[AP.arY] = 1.1 * aSm(aSeg(u, 0, 0.3)); o[AP.alP] = o[AP.arP] = -0.3 - 0.9 * aSm(aSeg(u, 0.4, 0.7));
      o[AP.headR] = s * 0.5 * sp; o[AP.crouch] = 0.4 * aSm(aSeg(u, 0.2, 0.45));
      o[AP.fall] = aFallK(u, 0.35, 0.72); o[AP.fallA] = s * Math.PI / 2; splay(aSm(aSeg(u, 0.6, 0.9))); break;
    }
    case AC.dieKnees: {
      const kn = aSm(aSeg(u, 0, 0.32)), tp = aSm(aSeg(u, 0.5, 0.62));
      o[AP.crouch] = 1.25 * kn; o[AP.llS] = -0.7 * kn; o[AP.lrS] = -0.75 * kn; o[AP.llL] = o[AP.lrL] = 0.12 * kn;
      o[AP.hunch] = 0.3 * kn; o[AP.headP] = 0.3 * kn - 0.9 * tp; o[AP.alP] = -1.45 - 0.0 * kn; o[AP.arP] = -1.45; o[AP.alE] = o[AP.arE] = 0.4 * kn;
      o[AP.jaw] = 0.6 * kn; o[AP.lean] = 0.1 * kn; o[AP.shake] = 0.4 * kn * (1 - tp);
      o[AP.fall] = aFallK(u, 0.55, 0.82); o[AP.fallA] = (R[31] - 0.5) * 0.4; splay(aSm(aSeg(u, 0.7, 0.95)) * 0.6); break;
    }
    case AC.dieCollapse: {
      const cl = aSm(aSeg(u, 0, 0.35));
      o[AP.crouch] = 1.3 * cl; o[AP.hunch] = 0.9 * cl; o[AP.headP] = -0.7 * cl; o[AP.lean] = 0.3 * cl;
      o[AP.llS] = 0.3 * cl; o[AP.lrS] = -0.2 * cl; o[AP.llW] = o[AP.lrW] = 0.35 * cl;
      o[AP.alP] = -1.45; o[AP.arP] = -1.45; o[AP.alY] = o[AP.arY] = 0.5 * cl;
      o[AP.fall] = aFallK(u, 0.25, 0.6) * 0.92; o[AP.fallA] = s * (0.7 + R[32] * 0.8); splay(aSm(aSeg(u, 0.5, 0.85)) * 0.8); break;
    }
    case AC.dieBlast: {
      const up = aSeg(u, 0, 0.45), arc = 4 * up * (1 - up);
      o[AP.rise] = arc * 0.16; o[AP.offX] = -2.2 * aSm(aSeg(u, 0, 0.7)); o[AP.offY] = s * 0.5 * aSm(aSeg(u, 0, 0.7)); o[AP.spin] = s * (0.9 + R[33]) * aSm(aSeg(u, 0, 0.7));
      o[AP.alY] = o[AP.arY] = 1.2; o[AP.alP] = 0.6 * (1 - up) + 0.2; o[AP.arP] = 0.4; o[AP.llL] = 0.6 * arc; o[AP.lrL] = 0.4 * arc; o[AP.llS] = 0.5 * arc; o[AP.lrS] = -0.4 * arc;
      o[AP.headP] = 0.8 * arc; o[AP.fall] = aFallK(u, 0.0, 0.48); o[AP.fallA] = Math.PI + (R[34] - 0.5) * 0.8; splay(aSm(aSeg(u, 0.45, 0.8))); break;
    }
    case AC.dieSide: {
      const ls = aSm(aSeg(u, 0, 0.28));
      o[AP.leanS] = s * 0.35 * ls; o[AP.crouch] = 0.35 * ls; o[AP.headR] = s * 0.5 * ls; o[AP.alY] = o[AP.arY] = 0.3 + 0.5 * ls;
      if (s > 0) o[AP.lrS] = -0.3 * ls; else o[AP.llS] = -0.3 * ls;
      o[AP.fall] = aFallK(u, 0.22, 0.6); o[AP.fallA] = s * (Math.PI / 2 + (R[35] - 0.5) * 0.4); splay(aSm(aSeg(u, 0.5, 0.85)) * 0.75); break;
    }
  }
  if (D.legless) { o[AP.fall] = Math.max(o[AP.fall], 0.8); o[AP.lean] = 0; o[AP.crouch] = 0; }
}
// the specials: rising, an ability's tell and its move, recovering, a roar, getting back up
function aSpecial(o, m, ci, u, t) {
  const P = m.an, D = m.ad, R = P.rnd, ab = P.ab, s = P.seed;
  aIdle(o, t, P, D);
  const arm = (side, y, p, e) => { const b = side < 0 ? AP.alY : AP.arY; o[b] = y; o[b + 1] = p; o[b + 2] = e; };
  switch (ci) {
    case AC.emerge: {
      // from the ground: hands push, it rises jerkily and its head comes up last
      const r = aSm(aSeg(u, 0.1, 0.85)), j = A_SIN(u * 30) * 0.06 * (1 - r);
      o[AP.crouch] = 1.2 * (1 - r); o[AP.hunch] += 0.6 * (1 - r); o[AP.lean] = 0.9 * (1 - r) + P.lean * r;
      arm(-1, 0.4, -1.3 + 0.4 * r + j, 0.3); arm(1, 0.4, -1.3 + 0.4 * r - j, 0.3); o[AP.headP] = -0.7 * (1 - aSm(aSeg(u, 0.5, 1))) + 0.3 * aSm(aSeg(u, 0.7, 1));
      o[AP.llS] = 0.3 * (1 - r); o[AP.lrS] = -0.4 * (1 - r); o[AP.jaw] = 0.6 * aSm(aSeg(u, 0.7, 0.9)); o[AP.shake] = 0.3 * (1 - r);
      if (D.legless) { o[AP.lean] = 1.3; o[AP.crouch] = 0; o[AP.headP] = 1.0 * r; }
      break;
    }
    case AC.windup: aWind(o, m, u, t, arm); break;
    case AC.action: aAct(o, m, u, t, arm); break;
    case AC.recover: {
      const r = aSm(u); aIdle(o, t, P, D);
      o[AP.headY] = 0.35 * A_SIN(u * 18) * (1 - r); o[AP.lean] += 0.2 * (1 - r); o[AP.crouch] = 0.2 * (1 - r); o[AP.alP] += 0.3 * (1 - r); o[AP.arP] += 0.3 * (1 - r); break;
    }
    case AC.roar: {
      const r = aEnv(u, 0.25, 0.7), sh = A_SIN(u * 60) * 0.05 * r;
      arm(-1, 0.95 * r + 0.15, -1.4 + 1.6 * r, 0.5); arm(1, 0.95 * r + 0.15, -1.4 + 1.6 * r, 0.5);
      o[AP.headP] = 0.65 * r + sh; o[AP.jaw] = r; o[AP.lean] = -0.25 * r; o[AP.crouch] = 0.25 * r; o[AP.shake] = 0.5 * r; o[AP.twist] = sh * 2; break;
    }
    case AC.getUp: {
      // the reverse of a fall: from the ground onto hands and knees, then up
      const f = 1 - aSm(aSeg(u, 0, 0.55)), r = aSm(aSeg(u, 0.4, 1));
      o[AP.fall] = f; o[AP.fallA] = R[36] < 0.5 ? 0.2 : Math.PI - 0.2; o[AP.crouch] = 1.1 * (1 - r); o[AP.hunch] += 0.4 * (1 - r);
      arm(-1, 0.5, -1.2, 0.3); arm(1, 0.5, -1.2, 0.3); o[AP.headP] = -0.5 * (1 - r) + 0.2 * r; o[AP.shake] = 0.3 * (1 - r); break;
    }
  }
}
// an ability's tell (held while the game says the zombie is winding up)
function aWind(o, m, u, t, arm) {
  const P = m.an, ab = P.ab, j = A_SIN(t * 40) * 0.04;
  switch (ab) {
    case 'pounce': case 'sprinter':
      o[AP.crouch] = 0.85; o[AP.lean] = 0.62; arm(-1, 0.55, -0.7 + j, 0.8); arm(1, 0.55, -0.7 - j, 0.8); o[AP.headP] = 0.75; o[AP.llS] = 0.4; o[AP.lrS] = -0.5; o[AP.shake] = 0.3; o[AP.jaw] = 0.5;
      if (P.gait === 'scuttle' || P.gait === 'crawl') { o[AP.lean] = 1.25; o[AP.headP] = 1.1; arm(-1, 0.5, -1.25, 0.6); arm(1, 0.5, -1.25, 0.6); }
      break;
    case 'charger': o[AP.lean] = 0.65; o[AP.headP] = -0.4; o[AP.twist] = 0.35; arm(-1, 0.7, -0.9, 0.5); arm(1, 0.7, -0.9, 0.5); o[AP.lrS] = 0.3 * A_SIN(t * 14); o[AP.lrL] = Math.max(0, A_SIN(t * 14)) * 0.2; o[AP.crouch] = 0.35; o[AP.jaw] = 0.6; o[AP.shake] = 0.4; break;
    case 'spitter': o[AP.headP] = 0.95; o[AP.lean] = -0.2; o[AP.jaw] = 0.35 + j; o[AP.sq] = 0.5 + 0.5 * u; o[AP.shake] = 0.35; break;
    case 'screamer': arm(-1, 1.0, 0, 0.3); arm(1, 1.0, 0, 0.3); o[AP.headP] = 0.8; o[AP.lean] = -0.3; o[AP.jaw] = 0.5; o[AP.sq] = 0.5; break;
    case 'bomber': arm(-1, 0.8, -0.6, 0.3); arm(1, 0.8, -0.6, 0.3); o[AP.shake] = 1; o[AP.sq] = 1; o[AP.jaw] = 0.8; o[AP.headP] = 0.4; break;
    case 'shocker': arm(-1, 0.45, 0.2 + j * 3, 0.4); arm(1, 0.45, 0.2 - j * 3, 0.4); o[AP.shake] = 0.8; o[AP.headP] = 0.3; o[AP.jaw] = 0.6; o[AP.grip] = 0; break;
    case 'thrower': arm(1, 1.05, 0.6, 1.25); arm(-1, 0.1, -0.2, 0.4); o[AP.twist] = 0.65; o[AP.lean] = -0.2; o[AP.headY] = -0.3; break;
    default: o[AP.crouch] = 0.4; o[AP.lean] = 0.3; arm(-1, 0.7, -0.5, 0.6); arm(1, 0.7, -0.5, 0.6); o[AP.jaw] = 0.8; o[AP.headP] = 0.4; o[AP.shake] = 0.4;
  }
}
// an ability's move: the leap, the charge, the spit, the scream, the throw
function aAct(o, m, u, t, arm) {
  const P = m.an, D = m.ad, ab = P.ab;
  switch (ab) {
    case 'pounce':
      o[AP.lean] = 0.5; arm(-1, 0.2, 0.15, 0.35); arm(1, 0.2, 0.15, 0.35); o[AP.llS] = 0.5; o[AP.lrS] = -0.7; o[AP.llL] = 0.6; o[AP.lrL] = 0.35; o[AP.crouch] = 0.25;
      o[AP.rise] = 0.06 + 0.04 * A_SIN(u * Math.PI); o[AP.headP] = 0.35; o[AP.jaw] = 0.9; o[AP.grip] = 0;
      if (P.gait === 'scuttle') { o[AP.lean] = 0.9; o[AP.rise] = 0.05; }
      break;
    case 'charger': case 'sprinter': {
      const ph = (t * 3.2) % 1; aGait(o, ph, t, P, D, 2.1); o[AP.lean] = 0.62; o[AP.headP] = -0.35; o[AP.twist] += 0.2;
      arm(-1, 0.6, -0.85, 0.5); arm(1, 0.6, -0.85, 0.5); o[AP.jaw] = 0.7; if (ab === 'sprinter') { const P2 = P.arms; aArms(o, ph, t, P, D, 2); } break;
    }
    case 'spitter': { const k = aEnv(u, 0.2, 0.55); o[AP.lean] = 0.35 * k; o[AP.hunch] += 0.3 * k; o[AP.headP] = -0.15 * k + 0.3 * (1 - k); o[AP.jaw] = k; o[AP.sq] = 1 - k; break; }
    case 'screamer': { const k = aEnv(u, 0.1, 0.8); arm(-1, 0.9, -0.3, 0.4); arm(1, 0.9, -0.3, 0.4); o[AP.jaw] = k; o[AP.lean] = 0.2 * k; o[AP.headP] = 0.15 * k; o[AP.shake] = 0.6 * k; break; }
    case 'thrower': { const k = aSm(aSeg(u, 0, 0.35)); arm(1, 1.05 - 1.5 * k, 0.6 - 1.1 * k, 1.25 - 1.0 * k); o[AP.twist] = 0.65 - 1.25 * k; o[AP.lean] = -0.2 + 0.45 * k; break; }
    case 'shocker': arm(-1, 0.2, 0.0, 0.1); arm(1, 0.2, 0.0, 0.1); o[AP.shake] = 1; o[AP.headP] = 0.5; o[AP.jaw] = 1; o[AP.grip] = 0; break;
    case 'medic': { const k = aEnv(u, 0.3, 0.7); arm(-1, 0.7, -1.2 + 1.6 * k, 0.4); arm(1, 0.7, -1.2 + 1.6 * k, 0.4); o[AP.headP] = 0.4 * k; break; }
    case 'magnet': { const k = aSm(aSeg(u, 0, 0.3)), back = aSm(aSeg(u, 0.4, 1)); arm(1, 0.3 - 0.4 * k + 0.6 * back, 0.3 - 0.4 * k, 1.4 - 1.2 * k + 1.0 * back); o[AP.twist] = 0.4 - 0.8 * k + 0.5 * back; o[AP.lean] = 0.3 * k - 0.3 * back; break; }
    case 'carrier': case 'hive': o[AP.hunch] += 0.4; o[AP.shake] = 0.8; o[AP.crouch] = 0.3; o[AP.jaw] = 0.6; o[AP.sq] = 0.6; break;
    default: { const k = aEnv(u, 0.2, 0.6); o[AP.lean] = 0.45 * k; arm(-1, 0.3, -0.2 * k, 0.4); arm(1, 0.3, -0.2 * k, 0.4); o[AP.jaw] = k; }
  }
}

/* ---------- forward kinematics: a pose becomes a skeleton ---------- */
function aSetJ(J, i, x, y, z) { const k = i * 3; J[k] = x; J[k + 1] = y; J[k + 2] = z; }
function animaFK(D, p, J) {
  const H = D.H, crouch = p[AP.crouch], lean = p[AP.lean], leanS = p[AP.leanS], hunch = D.hunch0 + p[AP.hunch];
  const hipY = p[AP.hipY], yawU = hipY + p[AP.twist];
  let hipH = D.legless ? 0.55 + 0.25 * (1 - Math.min(1, lean)) : D.legL * (1 - 0.4 * Math.min(1.3, Math.max(-0.2, crouch)));
  hipH += (p[AP.bob] + p[AP.rise]) * H;
  const c1 = A_COS(hipY), s1 = A_SIN(hipY), c2 = A_COS(yawU), s2 = A_SIN(yawU);
  const sl = A_SIN(leanS), cl = A_COS(leanS);
  aSetJ(J, JN.root, 0, 0, 0);
  aSetJ(J, JN.pel, 0, 0, hipH);
  // the spine in two parts: the lower leans, the upper leans more and hunches
  const a1 = lean * 0.55, a2 = a1 + lean * 0.45 + hunch * 0.85, L1 = D.spine * 0.5 * (1 - 0.08 * hunch), L2 = D.spine * 0.5;
  const v1x = A_SIN(a1) * c1 - sl * A_COS(a1) * s1, v1y = A_SIN(a1) * s1 + sl * A_COS(a1) * c1, v1z = A_COS(a1) * cl;
  const cx = v1x * L1, cy = v1y * L1, cz = hipH + v1z * L1; aSetJ(J, JN.chest, cx, cy, cz);
  const v2x = A_SIN(a2) * c2 - sl * A_COS(a2) * s2, v2y = A_SIN(a2) * s2 + sl * A_COS(a2) * c2, v2z = A_COS(a2) * cl;
  const nx = cx + v2x * L2, ny = cy + v2y * L2, nz = cz + v2z * L2; aSetJ(J, JN.neck, nx, ny, nz);
  // shoulders across the top of the chest (the one you lean toward a little lower)
  const scx = nx - v2x * D.shDrop, scy = ny - v2y * D.shDrop, scz = nz - v2z * D.shDrop; aSetJ(J, JN.sc, scx, scy, scz);
  const lx = -s2, ly = c2;
  aSetJ(J, JN.shL, scx - lx * D.shW, scy - ly * D.shW, scz + sl * D.shW * 0.6);
  aSetJ(J, JN.shR, scx + lx * D.shW, scy + ly * D.shW, scz - sl * D.shW * 0.6);
  // the head on its neck, pushed forward by a hunch, back by looking up
  const ah = a2 + 0.25 * hunch - p[AP.headP] * 0.35;
  const hx = nx + (A_SIN(ah) * c2) * D.neck + c2 * D.headR * 0.12, hy = ny + (A_SIN(ah) * s2) * D.neck + s2 * D.headR * 0.12, hz = nz + A_COS(ah) * D.neck + D.headR * 0.55 * A_COS(ah);
  aSetJ(J, JN.head, hx, hy, hz);
  const yawF = yawU + p[AP.headY], pitF = p[AP.headP] - a2 * 0.8, cf = A_COS(pitF);
  const fdx = A_COS(yawF) * cf, fdy = A_SIN(yawF) * cf, fdz = A_SIN(pitF);
  aSetJ(J, JN.fdir, fdx, fdy, fdz);
  const sp = A_SIN(pitF), ux0 = -A_COS(yawF) * sp, uy0 = -A_SIN(yawF) * sp, uz0 = cf, rr = p[AP.headR], cr = A_COS(rr), sr = A_SIN(rr), lfx = -A_SIN(yawF), lfy = A_COS(yawF);
  aSetJ(J, JN.hup, ux0 * cr + lfx * sr, uy0 * cr + lfy * sr, uz0 * cr);
  // arms: each from its shoulder (the angles are about the world, as gravity is), the forearm bending up and in
  for (let side = -1; side <= 1; side += 2) {
    const b = side < 0 ? AP.alY : AP.arY, si = side < 0 ? JN.shL : JN.shR, ei = si + 1, hi = si + 2, k3 = si * 3;
    const hA = yawU + side * p[b], pt = p[b + 1], e = p[b + 2], cp = A_COS(pt);
    let au = D.armU, af = D.armF; if (side < 0 && D.noArmL) { au *= 0.38; af = 0.01; } if (side > 0 && D.bigArm) { au *= 1.1; af *= 1.12; }
    const ex = J[k3] + A_COS(hA) * cp * au, ey = J[k3 + 1] + A_SIN(hA) * cp * au, ez = J[k3 + 2] + A_SIN(pt) * au;
    aSetJ(J, ei, ex, ey, ez);
    const fa = pt + e, hA2 = hA - side * e * 0.3, cfa = A_COS(fa);
    aSetJ(J, hi, ex + A_COS(hA2) * cfa * af, ey + A_SIN(hA2) * cfa * af, ez + A_SIN(fa) * af);
  }
  // legs: the foot where the pose puts it, the knee found between hip and foot, bending forward
  for (let side = -1; side <= 1; side += 2) {
    const hiI = side < 0 ? JN.hipL : JN.hipR, b = side < 0 ? AP.llS : AP.lrS;
    const hpx = -s1 * side * D.hipW, hpy = c1 * side * D.hipW, hpz = hipH - 0.04 * H;
    aSetJ(J, hiI, hpx, hpy, hpz);
    const fx0 = p[b], fy0 = side * (D.hipW + p[b + 2]), fz = Math.max(0, p[b + 1]);
    let fx = fx0 * c1 - fy0 * s1, fy = fx0 * s1 + fy0 * c1;
    if (D.legless) {
      // stumps: short, trailing
      aSetJ(J, hiI + 1, hpx - c1 * 0.35, hpy - s1 * 0.35, hpz - 0.1); aSetJ(J, hiI + 2, hpx - c1 * 0.5, hpy - s1 * 0.5, Math.max(0.1, hpz - 0.25));
      aSetJ(J, side < 0 ? JN.toeL : JN.toeR, hpx - c1 * 0.5, hpy - s1 * 0.5, Math.max(0.1, hpz - 0.25)); continue;
    }
    let dx = fx - hpx, dy = fy - hpy, dz = fz - hpz; const Lt = D.thigh, Ls = D.shinL, maxL = (Lt + Ls) * 0.999;
    let L = Math.hypot(dx, dy, dz); if (L > maxL) { const k = maxL / L; dx *= k; dy *= k; dz *= k; fx = hpx + dx; fy = hpy + dy; L = maxL; }
    aSetJ(J, hiI + 2, fx, fy, hpz + dz);
    const a = (Lt * Lt - Ls * Ls + L * L) / (2 * L || 1), hh = Math.sqrt(Math.max(0, Lt * Lt - a * a));
    const ux = dx / (L || 1), uy = dy / (L || 1), uz = dz / (L || 1);
    // bend direction: forward, made square to the leg
    let bx = c1, by = s1, bz = 0; const dt = bx * ux + by * uy + bz * uz; bx -= ux * dt; by -= uy * dt; bz -= uz * dt; const bl = Math.hypot(bx, by, bz) || 1;
    aSetJ(J, hiI + 1, hpx + ux * a + bx / bl * hh, hpy + uy * a + by / bl * hh, hpz + uz * a + bz / bl * hh);
    const ta = hipY + side * 0.14, tz = hpz + dz;
    aSetJ(J, side < 0 ? JN.toeL : JN.toeR, fx + A_COS(ta) * D.foot, fy + A_SIN(ta) * D.foot, tz + (fz > 0.05 ? -0.05 : 0));
  }
  aSetJ(J, JN.belly, J[3] * 0.55 + cx * 0.45 + c1 * D.belly * 0.35, J[4] * 0.55 + cy * 0.45 + s1 * D.belly * 0.35, J[5] * 0.5 + cz * 0.5);
  // falling: the whole body tips over its feet toward the fall's direction; nothing goes below the ground
  const fall = p[AP.fall];
  if (fall > 0.001) {
    const ph = fall * Math.PI / 2 * 0.98, cf2 = A_COS(ph), sf = A_SIN(ph), fA = p[AP.fallA], fdxx = A_COS(fA), fdyy = A_SIN(fA);
    for (let i = 0; i < NJ; i++) {
      const k = i * 3, x = J[k], y = J[k + 1], z = J[k + 2], al = x * fdxx + y * fdyy, pr = -x * fdyy + y * fdxx;
      const al2 = al * cf2 + z * sf; let z2 = -al * sf + z * cf2;
      if (i !== JN.fdir && i !== JN.hup) { const mn = i === JN.head ? D.headR * 0.85 : i === JN.chest || i === JN.belly || i === JN.pel || i === JN.sc || i === JN.neck ? D.chD * 0.6 : 0.12; if (z2 < mn) z2 = mn + (z2 - mn) * 0.1; }
      J[k] = al2 * fdxx - pr * fdyy; J[k + 1] = al2 * fdyy + pr * fdxx; J[k + 2] = z2;
    }
  }
  // spinning, sliding, shaking
  const spn = p[AP.spin], ox = p[AP.offX], oy = p[AP.offY], shk = p[AP.shake];
  if (spn || ox || oy || shk) {
    const cs = A_COS(spn), ss = A_SIN(spn);
    for (let i = 0; i < NJ; i++) {
      const k = i * 3, x = J[k], y = J[k + 1];
      if (i === JN.fdir || i === JN.hup) { J[k] = x * cs - y * ss; J[k + 1] = x * ss + y * cs; continue; }
      let jx = 0, jy = 0; if (shk && J[k + 2] > H * 0.4) { jx = (Math.random() - 0.5) * shk * 0.08; jy = (Math.random() - 0.5) * shk * 0.08; }
      J[k] = x * cs - y * ss + ox + jx; J[k + 1] = x * ss + y * cs + oy + jy;
    }
  }
}

/* ---------- each zombie's animation state ---------- */
function animaState(z) {
  if (z.an) return z.an;
  const R = z.m.an;
  z.an = { base: AC.idle, prev: AC.idle, bk: 1, bt: 0.25, ph: Math.random(), t0: Math.random() * 20, one: -1, ou: 0, od: 1, oin: 0.1, oout: 0.15,
    add: -1, au: 0, ad: 0.4, ak: 1, pose: new Float32Array(AN), pA: new Float32Array(AN), pB: new Float32Array(AN), pO: new Float32Array(AN), pD: new Float32Array(AN),
    lastHit: 0, lastAtk: 0, lastCast: 0, lastCd: 0, idleT: rand(3, 8), idleC: AC.idle, vx: 0, vy: 0, px: z.x, py: z.y, hy: 0, emerge: 0, getUp: 0, wasDown: false,
    lastWarn: 0, frame: -1, upF: -1 };
  if (z.emT) { z.an.one = AC.emerge; z.an.ou = 0; z.an.od = z.m.adur[AC.emerge]; z.an.oin = 0.01; }
  return z.an;
}
function animaPlay(z, ci, o) {
  const A = animaState(z), m = z.m; if (!m.v2) return;
  if (AC_KIND[ci] === 'add') { A.add = ci; A.au = 0; A.ad = m.adur[ci] * (o && o.k ? 0.8 + 0.4 * o.k : 1); A.ak = o && o.k != null ? Math.min(1.6, 0.6 + o.k) : 1; return; }
  // a move that is already playing is not restarted by a weaker one
  if (A.one >= 0 && A.ou < 0.6 && (ci === A.one || (A.one === AC.emerge || A.one === AC.getUp))) return;
  A.one = ci; A.ou = 0; A.od = m.adur[ci] * (o && o.speed ? 1 / o.speed : 1); A.oin = AC_KIND[ci] === 'hold' ? 0.12 : ci === AC.stagger ? 0.05 : 0.08; A.oout = 0.18;
}
// the zombie's way of moving right now, from how fast and which way it is going
function aPickBase(z, A, dt) {
  const m = z.m, P = m.an, sp = Math.hypot(A.vx, A.vy), base = 68 * m.spd * Math.min(1.3, 1 + 0.012 * ((G.wave || 1) - 1)), rel = sp / Math.max(20, base);
  const legHurt = z.legK || 0, hurt = z.hp < z.maxHp * 0.35;
  if (P.gait === 'crawl' || legHurt >= 2) return sp < 6 ? AC.idle : AC.crawl;
  if (sp < 7) {
    // standing: idles change now and then (feeding when there is a body close, sniffing the air, groaning)
    A.idleT -= dt;
    if (A.idleT <= 0) { A.idleT = rand(3, 7); const r = Math.random(); A.idleC = r < 0.35 ? AC.idle : r < 0.5 ? AC.idleLook : r < 0.6 ? AC.idleSniff : r < 0.7 ? AC.idleTwitch : r < 0.78 ? AC.idleScratch : r < 0.88 ? AC.idleSway : AC.idleGroan; if (z.feedT > 0) A.idleC = AC.idleFeed; }
    return A.idleC;
  }
  const fa = Math.atan2(A.vy, A.vx), d = ((fa - z.ang + Math.PI) % TAU + TAU) % TAU - Math.PI;
  if (Math.abs(d) > 2.3) return AC.back;
  if (Math.abs(d) > 0.95) return d < 0 ? AC.strafeL : AC.strafeR;
  if (legHurt >= 1) return AC.limp;
  if (hurt && P.gait !== 'sprint') return AC.stumble;
  return rel > 1.55 ? AC.run : rel > 1.15 ? AC.walkFast : AC.walk;
}
// steps a zombie's animation on by dt and (when full) leaves its pose in A.pose; a zombie drawn from cached frames
// only needs its timers and which loop it is in
function animaTick(z, dt, full) {
  const A = animaState(z), m = z.m, P = m.an, D = m.ad;
  if (A.upF === frameNo && (!full || A.fullF === frameNo)) return A;
  const again = A.upF === frameNo; A.upF = frameNo; if (full) A.fullF = frameNo;
  if (again) dt = 0;
  const t = G.time + A.t0;
  // how fast it is really moving (a teammate's game only has positions)
  if (z.puppet || !(z.vx === z.vx)) { const ivx = (z.x - A.px) / Math.max(1e-3, dt), ivy = (z.y - A.py) / Math.max(1e-3, dt); A.vx += (ivx - A.vx) * Math.min(1, dt * 6); A.vy += (ivy - A.vy) * Math.min(1, dt * 6); }
  else { A.vx += (z.vx - A.vx) * Math.min(1, dt * 10); A.vy += (z.vy - A.vy) * Math.min(1, dt * 10); }
  A.px = z.x; A.py = z.y;
  // what the game tells the animation: an attack starting, a hit, an ability's tell and move, getting back up
  if (z.atkT && z.atkT !== A.lastAtk) { A.lastAtk = z.atkT; animaPlay(z, aPickAttack(z)); }
  if (z.hitT && z.hitT !== A.lastHit) { A.lastHit = z.hitT; aOnHit(z, A); }
  const st = z.st;
  if (st) {
    const cd = st.cd || 0; if (cd > A.lastCd + 0.5 && A.lastCd >= 0 && G.time > 0.5) { if (P.ab !== 'pounce' && P.ab !== 'charger' && P.ab !== 'sprinter') animaPlay(z, AC.action); } A.lastCd = cd;
    if (st.castT && st.castT !== A.lastCast) { A.lastCast = st.castT; animaPlay(z, AC.action); }
    if (st.down > 0) { A.wasDown = true; }
    else if (A.wasDown) { A.wasDown = false; animaPlay(z, AC.getUp); }
  }
  // the base: a loop, cross-faded when it changes (the walk cycle keeps its phase, so the feet never jump)
  const nb = aPickBase(z, A, dt);
  if (nb !== A.base) { A.prev = A.base; A.base = nb; A.bk = 0; A.bt = (nb >= 10) !== (A.prev >= 10) ? 0.3 : 0.2; }
  if (A.bk < 1) A.bk = Math.min(1, A.bk + dt / A.bt);
  const sp = Math.hypot(A.vx, A.vy), cyc = 4 * P.stride * Math.max(0.5, z.r);
  if (A.base < 10) A.ph = (A.ph + dt * Math.max(0.25, sp / Math.max(4, cyc)) * (A.base === AC.back ? 1 : 1)) % 1;
  else A.ph = (A.ph + dt / m.adur[AC.walk] * 0.3) % 1;
  const idleU = (t / m.adur[A.base >= 10 ? A.base : AC.idle]) % 1;
  // holds: an ability's tell or move for as long as the game says
  const warnOn = z.warn > 0 || (st && (st.fuse > 0 || st.wind > 0 || st.zap > 0 || st.lw > 0)) || z.windK;
  const actOn = z.leapK || (st && (st.charge > 0 || st.lt > 0));
  if (!full) {
    // timers only: one-offs and hits run out on time even while the zombie is a cached picture
    if (A.one >= 0) { A.ou += dt / A.od; if (A.ou >= 1 && !(A.one === AC.action && actOn) && !(A.one === AC.windup && warnOn)) A.one = -1; }
    if (A.add >= 0) { A.au += dt / A.ad; if (A.au >= 1) A.add = -1; }
    return A;
  }
  animaEval(A.pA, m, A.base, A.base < 10 ? A.ph : idleU, t);
  if (A.bk < 1) { animaEval(A.pB, m, A.prev, A.prev < 10 ? A.ph : idleU, t); const k = aSm(A.bk); for (let i = 0; i < AN; i++) A.pA[i] = A.pB[i] + (A.pA[i] - A.pB[i]) * k; }
  if (actOn) { if (A.one !== AC.action) { A.one = AC.action; A.ou = 0; A.od = 0.6; A.oin = 0.06; A.oout = 0.2; } A.ou = Math.min(0.5, A.ou); }
  else if (warnOn) { if (A.one !== AC.windup) { A.one = AC.windup; A.ou = 0; A.od = 0.5; A.oin = 0.1; A.oout = 0.15; } A.ou = Math.min(0.5, A.ou); }
  // a one-off on top: blended in and out; attacks only take the upper body
  const pose = A.pose; pose.set(A.pA);
  if (st && st.down > 0) {
    // knocked down (it will get up): lying where it fell
    animaEval(A.pO, m, AC.dieCollapse, Math.min(1, (1.4 - st.down) * 1.5 + 0.4), t); pose.set(A.pO);
  } else if (A.one >= 0) {
    A.ou += dt / A.od;
    if (A.ou >= 1 && !(A.one === AC.action && actOn) && !(A.one === AC.windup && warnOn)) A.one = -1;
    else {
      const ci = A.one, u = Math.min(1, A.ou); animaEval(A.pO, m, ci, AC_KIND[ci] === 'hold' ? (ci === AC.action ? (t * 0.8) % 1 : u) : u, t);
      const w = Math.min(aSm(Math.min(1, u * A.od / A.oin)), AC_KIND[ci] === 'hold' && (actOn || warnOn) ? 1 : aSm(Math.min(1, (1 - u) * A.od / A.oout)));
      const M = (ci >= 18 && ci < 28) || ci === AC.recover || ci === AC.roar || (ci === AC.action && (P.ab === 'spitter' || P.ab === 'screamer' || P.ab === 'thrower' || P.ab === 'medic' || P.ab === 'magnet' || P.ab === 'shocker')) || (ci === AC.windup && (P.ab === 'spitter' || P.ab === 'screamer' || P.ab === 'thrower' || P.ab === 'shocker')) ? AM_UP : AM_FULL;
      for (let i = 0; i < AN; i++) { const k = w * M[i]; if (k) pose[i] += (A.pO[i] - pose[i]) * k; }
    }
  }
  // hits, layered on
  if (A.add >= 0) {
    A.au += dt / A.ad;
    if (A.au >= 1) A.add = -1;
    else { animaEval(A.pD, m, A.add, A.au, t); const k = A.ak; for (let i = 0; i < AN; i++) pose[i] += A.pD[i] * k; }
  }
  // the head turns toward its prey (the nearest player), within what a neck allows
  const tg = aTarget(z);
  if (tg && !(st && st.down > 0)) {
    const want = clamp((((Math.atan2(tg.y - z.y, tg.x - z.x) - z.ang) + Math.PI) % TAU + TAU) % TAU - Math.PI, -1.1, 1.1);
    A.hy += (want - A.hy) * Math.min(1, dt * (P.look === 'jerk' ? 14 : 5));
    pose[AP.headY] = pose[AP.headY] * 0.45 + A.hy * 0.55 - pose[AP.twist] * 0.5;
  }
  // crippled legs and arms show
  if (z.armK & 1) { pose[AP.alP] = -1.45 + Math.sin(t * 3) * 0.08; pose[AP.alE] = 0.05; pose[AP.alY] = 0.2; }
  if (z.armK & 2) { pose[AP.arP] = -1.45 + Math.sin(t * 3 + 1) * 0.08; pose[AP.arE] = 0.05; pose[AP.arY] = 0.2; }
  if (z.buffT > 0) pose[AP.jaw] = Math.max(pose[AP.jaw], 0.7);
  if (z.frozen && z.stun > 0) { pose.set(A.pose); }
  return A;
}
function aTarget(z) {
  if (G.mode === 'title' || !G.p) return null;
  if (NET.started) { let best = null, bd = 1e12; const consider = q => { if (!q || q.down) return; const d = (q.x - z.x) ** 2 + (q.y - z.y) ** 2; if (d < bd) { bd = d; best = q; } }; consider(G.p); if (NET.role === 'host') for (const pr of NET.peers.values()) consider(pr.p); else for (const q of NET.others.values()) consider(q); return bd < 600 * 600 ? best : null; }
  const d2 = (G.p.x - z.x) ** 2 + (G.p.y - z.y) ** 2; return d2 < 600 * 600 ? G.p : null;
}
// which attack: its arms, its weapon and a little chance decide (and never the same one three times running)
function aPickAttack(z) {
  const P = z.m.an, A = z.an, r = Math.random();
  let ci;
  if (P.prop && P.prop !== 'whistle' && r < 0.45) ci = AC.signature;
  else if (P.arms === 'claw' || P.arms === 'flail') ci = r < 0.35 ? AC.swipeR : r < 0.65 ? AC.swipeL : r < 0.8 ? AC.combo : AC.bite;
  else if (P.arms === 'reach' || P.arms === 'hug') ci = r < 0.35 ? AC.grab : r < 0.65 ? AC.bite : r < 0.8 ? AC.lunge : AC.swipeR;
  else if (P.arms === 'wide') ci = r < 0.35 ? AC.slam : r < 0.6 ? AC.shove : r < 0.8 ? AC.swipeR : AC.headbutt;
  else if (P.gait === 'crawl' || P.gait === 'scuttle') ci = r < 0.5 ? AC.bite : AC.swipeR;
  else ci = [AC.swipeR, AC.swipeL, AC.bite, AC.grab, AC.lunge, AC.slam, AC.headbutt, AC.shove, AC.combo, AC.signature][(Math.random() * 10) | 0];
  if (ci === AC.signature && !P.prop && P.arms !== 'claw') ci = AC.combo;
  if (z.m.ad.noArmL && ci === AC.swipeL) ci = AC.swipeR;
  if (A.a1 === ci && A.a2 === ci) ci = ci === AC.bite ? AC.swipeR : AC.bite;
  A.a2 = A.a1; A.a1 = ci;
  return ci;
}
// a hit: which reaction, from where the bullet struck and which way it was going
function aOnHit(z, A) {
  const reg = z.hitReg || 'torso', rel = ((((z.hitA || 0) - z.ang) + Math.PI) % TAU + TAU) % TAU - Math.PI, fromFront = Math.abs(rel) > Math.PI / 2, pw = z.hitP || 0.5;
  let ci = AC.hitFront;
  if (reg === 'head') ci = AC.hitHead;
  else if (reg === 'armL') ci = AC.hitArmL; else if (reg === 'armR') ci = AC.hitArmR;
  else if (reg === 'legL') ci = AC.hitLegL; else if (reg === 'legR') ci = AC.hitLegR;
  else ci = fromFront ? AC.hitFront : AC.hitBack;
  if (pw > 1.4 && z.hp > 0 && !(A.one >= 0 && A.one !== AC.stagger)) animaPlay(z, AC.stagger);
  else animaPlay(z, ci, { k: pw });
}
// which death: where the last bullet went and what killed it
function animaDeathClip(z) {
  const reg = z.hitReg || 'torso', src = z.lastSrc || 'bullet', rel = ((((z.hitA || 0) - z.ang) + Math.PI) % TAU + TAU) % TAU - Math.PI, front = Math.abs(rel) > Math.PI / 2, pw = z.hitP || 0.5, r = Math.random();
  if (z.m.ad.legless) return r < 0.5 ? AC.dieFwd : AC.dieCollapse;
  if (src === 'blast' || src === 'a10' || src === 'car') return pw > 0.6 || r < 0.7 ? AC.dieBlast : AC.dieSpin;
  if (src === 'fire' || src === 'burn') return r < 0.6 ? AC.dieKnees : AC.dieCollapse;
  if (src === 'dash' || src === 'melee') return r < 0.5 ? AC.dieSpin : AC.dieSide;
  if (reg === 'head') return pw > 1.3 && r < 0.4 ? AC.dieBack : r < 0.75 ? AC.dieHead : AC.dieCollapse;
  if (reg === 'legL' || reg === 'legR') return r < 0.5 ? AC.dieSide : AC.dieFwd;
  if (reg === 'armL' || reg === 'armR') return r < 0.6 ? AC.dieSpin : AC.dieSide;
  if (pw > 1.5) return front ? AC.dieBack : AC.dieFwd;
  return front ? (r < 0.4 ? AC.dieBack : r < 0.7 ? AC.dieKnees : AC.dieCollapse) : (r < 0.6 ? AC.dieFwd : AC.dieKnees);
}

/* ---------- corpses: the dead stay a while ---------- */
function animaDeath(z, forceCi) {
  if (!z.m || !z.m.v2 || !animaUp()) return -1;
  try {
    const A = animaState(z); A.upF = -1; animaTick(z, 0.0001, true);
    const ci = forceCi >= 36 && forceCi < 44 ? forceCi : animaDeathClip(z), C = { m: z.m, x: z.x, y: z.y, ang: z.ang, r: z.r, ci: ci, t: 0, dur: z.m.adur[ci] * rand(0.92, 1.1), start: new Float32Array(A.pose), pose: new Float32Array(AN), done: false, life: 0, off: 0, seed: Math.random() * 100,
      vx: (z.vx || 0) * 0.35 + Math.cos(z.hitA || 0) * (z.hitP || 0.5) * 22, vy: (z.vy || 0) * 0.35 + Math.sin(z.hitA || 0) * (z.hitP || 0.5) * 22, burn: z.burnT > 0 || z.lastSrc === 'fire' ? 1 : 0, frost: z.frostK || 0, char: z.charK || 0, minion: !!z.minion, spr: null };
    ANIMA.corpses.push(C); ANIMA.deadN++;
    const cap = ANIMA.corpseCap; if (ANIMA.corpses.length > cap) ANIMA.corpses.splice(0, ANIMA.corpses.length - cap);
    return ci;
  } catch (e) { animaHurt(e, 'corpse'); return -1; }
}
const A_CORPSE_LIFE = 26;
function animaCorpses(dt) {
  const L = ANIMA.corpses; if (!L.length) return;
  const vis = typeof goreSeen === 'function' ? goreSeen : null;
  for (let i = L.length - 1; i >= 0; i--) {
    const C = L[i];
    if (!C.done) {
      C.t += dt;
      const u = Math.min(1, C.t / C.dur);
      // sliding with whatever carried it (a bullet's push, its own run), slowing on the ground
      const fr = Math.exp(-4 * dt); C.x += C.vx * dt; C.y += C.vy * dt; C.vx *= fr; C.vy *= fr;
      if (u >= 1) { C.done = true; C.vx = C.vy = 0; }
    } else {
      C.life += dt;
      // off every screen for a while (all players' in co-op), or old: it goes
      if (vis && !vis(C.x, C.y, C.r * 6)) C.off += dt; else C.off = 0;
      if (C.life > A_CORPSE_LIFE || C.off > 6) { L.splice(i, 1); continue; }
    }
  }
}
// the pose of a corpse right now: from where it was standing into the death, then lying still
function aCorpsePose(C) {
  const m = C.m, u = Math.min(1, C.t / C.dur);
  animaEval(C.pose, m, C.ci, u, C.seed + C.t);
  const k = aSm(Math.min(1, u / 0.14)), P = C.pose, S = C.start;
  if (k < 1) for (let i = 0; i < AN; i++) if (i !== AP.fall && i !== AP.fallA && i !== AP.spin && i !== AP.offX && i !== AP.offY) P[i] = S[i] + (P[i] - S[i]) * k;
  P[AP.shake] = 0;
  return P;
}
function animaDrawCorpses(vis) {
  const L = ANIMA.corpses; if (!L.length || !animaUp()) return;
  const T = ctx.getTransform(), s = T.a, e = T.e, f = T.f;
  let live = 0; const liveCap = ANIMA.liveCap;
  for (const C of L) {
    if (!vis(C.x, C.y, C.r * 6)) continue;
    const fade = C.done ? clamp((A_CORPSE_LIFE - C.life) / 3, 0, 1) : 1;
    if (fade <= 0) continue;
    const co = Math.cos(C.ang) * s * C.r, si = Math.sin(C.ang) * s * C.r;
    if (!C.done || !C.spr) {
      if (C.done) {
        // lying still: its picture is made once and reused
        C.spr = aCorpseSprite(C);
      }
      if (!C.done && live < liveCap + 6) {
        live++; ctx.setTransform(co, si, -si, co, e + C.x * s, f + C.y * s); ctx.globalAlpha = fade;
        lookDraw(ctx, C.m, aCorpsePose(C), { lod: 1, dead: 1, burn: C.burn, minion: C.minion, t: G.time });
        continue;
      }
      if (!C.spr) continue;
    }
    const sp = C.spr, kz = C.r / sp.rq;
    ctx.setTransform(co / C.r, si / C.r, -si / C.r, co / C.r, e + C.x * s, f + C.y * s); ctx.globalAlpha = fade * (C.life > A_CORPSE_LIFE - 8 ? 0.85 : 1);
    ctx.drawImage(sp.c, sp.x0 * kz, sp.y0 * kz, sp.w * kz, sp.h * kz);
  }
  ctx.globalAlpha = 1; ctx.setTransform(T.a, T.b, T.c, T.d, T.e, T.f);
}
function aCorpseSprite(C) {
  const m = C.m, rq = Math.max(3, Math.round(C.r)), key = 'c' + m.idx + '|' + C.ci + '|' + rq + '|' + (C.burn ? 1 : 0) + '|' + (C.minion ? 1 : 0);
  let sp = ANIMA.cache.get(key); if (sp) { ANIMA.cache.delete(key); ANIMA.cache.set(key, sp); return sp; }
  const P = new Float32Array(AN); C.t = C.dur; aCorpsePose(C); P.set(C.pose);
  sp = aBake(m, P, rq, aKp(1), { lod: 1, dead: 1, burn: C.burn, minion: C.minion }, 4.2);
  if (sp) { ANIMA.cache.set(key, sp); aTrim(); }
  return sp;
}

/* ---------- cached frames for the crowd ---------- */
function aKp(q) { return q ? clamp(DPR * ZOOM * 0.62, 0.7, 2.2) : SPR; }
// draws a pose into a small canvas (cropped to a box round the body) once, for reuse
// the box a pose fills (from its skeleton, with room for limbs, hats, the shadow and what it holds), in radii
const A_BJ = new Float32Array(NJ * 3);
function aBounds(m, pose) {
  animaFK(m.ad, pose, A_BJ); let x0 = -1.25, y0 = -1.15, x1 = 1.25, y1 = 1.15;
  for (let j = 0; j < NJ; j++) { if (j === JN.fdir || j === JN.hup) continue; const k = 1 + A_PERSP * A_BJ[j * 3 + 2] / m.ad.H, x = A_BJ[j * 3] * k, y = A_BJ[j * 3 + 1] * k; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const pad = 0.75 + (m.ad.headR > 0.4 ? 0.15 : 0), d = m.def, H = d.hold, F = m.al ? m.al.F : {};
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  if (H === 'mop') x0 = Math.min(x0, -3.1); if (H === 'cleaver' || H === 'iceaxe' || H === 'wrench' || H === 'hook') { x1 += 0.8; y0 -= 0.5; y1 += 0.5; }
  if (H === 'shield') { y0 -= 0.6; y1 += 0.6; x1 += 0.4; }
  if (d.head === 'straw' || d.head === 'veil' || d.hair === 'long' || d.hair === 'ponytail' || F.entrails) { x0 -= 0.7; y0 -= 0.4; y1 += 0.4; }
  return [x0, y0, x1, y1];
}
function aBake(m, pose, rq, kp, o, ext) {
  const Bx = aBounds(m, pose), x0 = Bx[0] * rq, y0 = Bx[1] * rq, w = (Bx[2] - Bx[0]) * rq, h = (Bx[3] - Bx[1]) * rq, S = Math.max(8, Math.ceil(w * kp));
  const c = document.createElement('canvas'); c.width = S; c.height = Math.max(8, Math.ceil(h * kp));
  const g = c.getContext('2d'); if (!g) return null;
  g.setTransform(kp * rq, 0, 0, kp * rq, -x0 * kp, -y0 * kp); g.lineCap = 'round'; g.lineJoin = 'round';
  lookDraw(g, m, pose, o);
  ANIMA.made++;
  return { c: c, x0: x0, y0: y0, w: w, h: h, rq: rq };
}
const A_FR = [12, 10, 8, 6];
// the cached frame of a zombie's walk (or idle) for this moment
function aFrame(z, A, lod) {
  const m = z.m, ci = A.base, q = lod >= 2 ? 1 : 0, F = A_FR[Math.min(3, lod)], rq = Math.max(3, Math.round(z.r / (q ? 2 : 1)) * (q ? 2 : 1));
  const u = ci < 10 ? A.ph : ((G.time + A.t0) / m.adur[ci]) % 1, fi = Math.floor(u * F) % F;
  const key = 'f' + m.idx + '|' + ci + '|' + fi + '|' + F + '|' + rq + '|' + q + '|' + (z.minion ? 1 : 0);
  let sp = ANIMA.cache.get(key);
  if (sp) { ANIMA.hits++; if ((frameNo & 7) === 0) { ANIMA.cache.delete(key); ANIMA.cache.set(key, sp); } A.fk = key; A.fs = sp; return sp; }
  ANIMA.miss++;
  if (ANIMA.bud > 0) {
    ANIMA.bud--;
    const P = ANIMA.tmp; animaEval(P, m, ci, (fi + 0.5) / F, (fi + 0.5) / F * m.adur[ci < 10 ? AC.walk : ci]);
    sp = aBake(m, P, rq, aKp(q), { lod: q ? 2 : 1, minion: z.minion }, 3.1);
    if (sp) { ANIMA.cache.set(key, sp); aTrim(); A.fk = key; A.fs = sp; return sp; }
  }
  // not made yet: the last frame it had (any clip), so it never pops to nothing
  return A.fs || null;
}
function aTrim() { const cap = ANIMA.cacheCap || 900; while (ANIMA.cache.size > cap) ANIMA.cache.delete(ANIMA.cache.keys().next().value); }
function animaForget() { ANIMA.cache.clear(); for (const C of ANIMA.corpses) C.spr = null; for (const z of G.zs) if (z.an) { z.an.fs = null; z.an.fk = ''; } }

/* ---------- drawing a zombie (the crowd engine hands each one over, nearest first) ---------- */
// returns false when it could not draw it (the crowd engine's own pictures cover)
function animaDraw(z, lod, rank, s, e, f, a) {
  if (!animaUp() || !z.m.v2) return false;
  try {
    // the nearest few are always drawn live (every joint, every frame), on any device; the rest from cached frames
    const live = rank < ANIMA.liveCap && lod <= 2;
    const A = animaTick(z, G.rdt || 0.016, live);
    let x = z.x, y = z.y; if (z.warn > 0 && z.m.an.ab === 'bomber') { x += rand(-1, 1); y += rand(-1, 1); }
    const co = Math.cos(z.ang) * s * z.r, si = Math.sin(z.ang) * s * z.r;
    ctx.globalAlpha = a;
    if (live) {
      ctx.setTransform(co, si, -si, co, e + x * s, f + y * s);
      lookDraw(ctx, z.m, A.pose, { lod: lod, t: G.time, z: z, light: aLight(z), flash: z.flash, minion: z.minion, burn: z.burnT > 0, frost: z.frostK, glow: 1 });
      // its skeleton, kept for the lighting engine (the shadow of this exact pose)
      (A.J || (A.J = new Float32Array(NJ * 3))).set(ANIMA.J); A.jF = frameNo;
      ANIMA.live++;
      return true;
    }
    const sp = aFrame(z, A, lod);
    if (!sp) return false;
    const kz = z.r / sp.rq;
    ctx.setTransform(co / z.r, si / z.r, -si / z.r, co / z.r, e + x * s, f + y * s);
    ctx.drawImage(sp.c, sp.x0 * kz, sp.y0 * kz, sp.w * kz, sp.h * kz);
    if (z.flash > 0 && lod < 3) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, z.flash * 9) * 0.5 * a; ctx.drawImage(sp.c, sp.x0 * kz, sp.y0 * kz, sp.w * kz, sp.h * kz); ctx.globalCompositeOperation = 'source-over'; }
    ANIMA.cached++;
    return true;
  } catch (err) { animaHurt(err, 'draw'); return false; }
}
// the light that falls on a zombie, turned into its own frame: the strongest lamp near it at night, the sun by day
const A_LT = { x: -0.5, y: -0.6, c: '255,244,220', k: 0.5, rim: 0 };
function aLight(z) {
  const L = A_LT, F = CORE.frame, day = F.day == null ? 1 : F.day; let lx = -0.55, ly = -0.65, col = '255,244,220', k = 0.45, rim = 0.25;
  if (typeof LUX !== 'undefined' && LUX.live) {
    const S = F.sun;
    if (S && S.on && S.k > 0.05) { lx = -S.dx; ly = -S.dy; const ll = Math.hypot(lx, ly) || 1; lx /= ll; ly /= ll; if (S.col) col = Math.round(S.col[0] * 255) + ',' + Math.round(S.col[1] * 255) + ',' + Math.round(S.col[2] * 255); k = 0.25 + 0.4 * S.k; rim = 0.15 + 0.3 * S.k; }
    else { k = 0.3; rim = 0.15; col = '150,170,220'; }
    if (day < 0.9 && LUX.lights && LUX.n) {
      // the brightest light close by wins (a street lamp, a fire, the flashlight, a muzzle flash)
      let best = 0, bx = 0, by = 0, bc = null;
      for (let i = 0; i < Math.min(LUX.n, 48); i++) {
        const Lt = LUX.lights[i]; if (!Lt) continue; const dx = Lt.x - z.x, dy = Lt.y - z.y, d2 = dx * dx + dy * dy, rr = (Lt.r || 100); if (d2 > rr * rr) continue;
        const w = (Lt.i || 1) * (1 - Math.sqrt(d2) / rr); if (w > best) { best = w; const dl = Math.sqrt(d2) || 1; bx = dx / dl; by = dy / dl; bc = Lt; }
      }
      if (bc && best * (1 - day) > 0.06) { lx = bx; ly = by; col = Math.round(clamp(bc.c0, 0, 255)) + ',' + Math.round(clamp(bc.c1, 0, 255)) + ',' + Math.round(clamp(bc.c2, 0, 255)); k = Math.min(0.9, 0.35 + best * 0.6); rim = Math.min(1, 0.4 + best * 0.9); }
    }
  }
  // into the zombie's frame (it is drawn turned to face its way)
  const c = Math.cos(-z.ang), s = Math.sin(-z.ang);
  L.x = lx * c - ly * s; L.y = lx * s + ly * c; L.c = col; L.k = k; L.rim = rim;
  return L;
}

// the shadow a posed zombie throws: each part of its skeleton moved along the light by its height (the lighting engine
// adds these to its shadow shape; ux, uy is the shadow's offset per metre of height)
const A_SHJ = [[JN.pel, JN.chest, 0.62], [JN.chest, JN.sc, 0.7], [JN.sc, JN.head, 0.4], [JN.shL, JN.elL, 0.2], [JN.elL, JN.haL, 0.17], [JN.shR, JN.elR, 0.2], [JN.elR, JN.haR, 0.17], [JN.hipL, JN.knL, 0.24], [JN.knL, JN.ftL, 0.2], [JN.hipR, JN.knR, 0.24], [JN.knR, JN.ftR, 0.2]];
function animaShadow(g, z, ux, uy, UPM) {
  const J = z.an.J; if (!J) return;
  const c = Math.cos(z.ang), s = Math.sin(z.ang), r = z.r, k = r / UPM;
  for (const sg of A_SHJ) {
    const a = sg[0] * 3, b = sg[1] * 3, rad = sg[2] * r;
    for (let t = 0; t <= 1.001; t += 0.5) {
      const jx = J[a] + (J[b] - J[a]) * t, jy = J[a + 1] + (J[b + 1] - J[a + 1]) * t, jz = J[a + 2] + (J[b + 2] - J[a + 2]) * t;
      const wx = z.x + (jx * c - jy * s) * r + ux * jz * k, wy = z.y + (jx * s + jy * c) * r + uy * jz * k;
      g.moveTo(wx + rad, wy); g.arc(wx, wy, rad, 0, TAU);
    }
  }
}

/* ---------- each frame ---------- */
function animaFrame(dt) {
  if (!animaUp()) return;
  const t0 = performance.now();
  try {
    const tier = clamp(PERF.tier | 0, 0, 3);
    ANIMA.liveCap = Math.max(2, [5, 10, 16, 24][tier] + ANIMA.adapt * 2 + (SET.crowd === 'high' ? 6 : SET.crowd === 'low' ? -3 : 0));
    ANIMA.bud = [3, 4, 6, 9][tier] + (ANIMA.adapt < 0 ? ANIMA.adapt : 0);
    ANIMA.cacheCap = [500, 700, 1000, 1400][tier];
    ANIMA.corpseCap = Math.max(16, [36, 56, 90, 130][tier] + ANIMA.adapt * 12);
    ANIMA.live = 0; ANIMA.cached = 0;
    animaCorpses(dt);
  } catch (e) { animaHurt(e, 'corpse'); }
  ANIMA.ms = performance.now() - t0;
}
// keeping its own cost in check (the crowd engine's watch adds this to its own)
function animaWatch(ms) {
  ANIMA.msAvg = ANIMA.msAvg * 0.9 + ms * 0.1;
  const now = performance.now(); if (now < ANIMA.watchT) return; ANIMA.watchT = now + 600;
  const budget = 1000 / targetFps() * 0.22, slow = PERF.fps && PERF.fps < targetFps() * 0.9;
  if (ANIMA.msAvg > budget && slow) { ANIMA.good = 0; if (ANIMA.adapt > -3) ANIMA.adapt--; }
  else if (ANIMA.msAvg < budget * 0.5 && !slow) { if (++ANIMA.good >= 5) { ANIMA.good = 0; if (ANIMA.adapt < 0) ANIMA.adapt++; } }
  else ANIMA.good = 0;
}
function animaReset() { ANIMA.corpses.length = 0; ANIMA.deadN = 0; }
function animaHurt(e, part) {
  const now = performance.now(); coreHurt('ANIMA', e); try { console.error(e); } catch (x) { }
  ANIMA.errT.push(now); while (ANIMA.errT.length && now - ANIMA.errT[0] > 10000) ANIMA.errT.shift();
  if (ANIMA.errT.length >= 6) { ANIMA.offUntil = now + 30000; ANIMA.errT.length = 0; coreRepaired('ANIMA', 'Animation engine paused for 30 seconds after errors (the crowd pictures cover)'); }
}
function animaCheck() {
  if (ANIMA.bad) { const w = ANIMA.badWhy; ANIMA.bad = 0; return w; }
  for (const C of ANIMA.corpses) if (!(C.x === C.x && C.y === C.y)) return 'a corpse lost its place';
  if (ANIMA.cache.size > 2400) return 'too many cached frames';
  for (const z of G.zs) if (z.an && !(z.an.pose[0] === z.an.pose[0])) return 'a pose went bad';
  return '';
}
function animaRepair() {
  ANIMA.corpses = ANIMA.corpses.filter(C => C.x === C.x && C.y === C.y);
  for (const z of G.zs) if (z.an && !(z.an.pose[0] === z.an.pose[0])) z.an = null;
  animaForget(); ANIMA.errT.length = 0; ANIMA.offUntil = 0;
}

/* ---------- the codex: watching any of a zombie's animations ---------- */
const A_PREV = { raf: 0, m: null, ci: 0, t0: 0, cv: null, auto: true };
function animaPreview(cv, m, ci) {
  A_PREV.cv = cv; A_PREV.m = m; A_PREV.ci = ci == null ? A_PREV.ci : ci; A_PREV.t0 = performance.now();
  A_PREV.box = aPrevBox(m, A_PREV.ci);
  if (!A_PREV.raf) A_PREV.raf = requestAnimationFrame(aPrevFrame);
}
// the box the whole animation stays inside (so a fall or a lunge is framed, not cut off)
function aPrevBox(m, ci) {
  const P = new Float32Array(AN), J = new Float32Array(NJ * 3); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i <= 16; i++) {
    const u = i / 16; animaEval(P, m, ci, AC_KIND[ci] === 'add' ? u : u, u * m.adur[ci]);
    if (AC_KIND[ci] === 'add') { const B = new Float32Array(AN); animaEval(B, m, AC.idle, 0, 0); for (let k = 0; k < AN; k++) P[k] += B[k]; }
    animaFK(m.ad, P, J);
    for (let j = 0; j < NJ; j++) { if (j === JN.fdir || j === JN.hup) continue; const x = J[j * 3], y = J[j * 3 + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { x0: x0 - 0.9, y0: y0 - 0.9, x1: x1 + 0.9, y1: y1 + 0.9 };
}
function animaPreviewStop() { if (A_PREV.raf) cancelAnimationFrame(A_PREV.raf); A_PREV.raf = 0; A_PREV.cv = null; }
function aPrevFrame(now) {
  A_PREV.raf = 0; const cv = A_PREV.cv, m = A_PREV.m; if (!cv || !m || !cv.isConnected) return;
  try {
    const g = cv.getContext('2d'), W2 = cv.width, H2 = cv.height, ci = A_PREV.ci, t = (now - A_PREV.t0) / 1000, dur = m.adur[ci], kind = AC_KIND[ci];
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W2, H2);
    // the floor: a soft disc and a grid that moves under a walking zombie
    const B = A_PREV.box || { x0: -2, y0: -2, x1: 3, y1: 2 }, bw = B.x1 - B.x0, bh = B.y1 - B.y0;
    const r = Math.min(Math.min(W2, H2) / 7.5, W2 * 0.88 / bw, H2 * 0.88 / bh), cx = W2 / 2 - (B.x0 + bw / 2) * r, cy = H2 / 2 - (B.y0 + bh / 2) * r;
    g.fillStyle = 'rgba(255,255,255,0.04)'; g.beginPath(); g.arc(W2 / 2, cy, Math.min(W2, H2) * 0.46, 0, TAU); g.fill();
    let u, P = ANIMA.tmp2;
    const loop = kind === 'loop', hold = kind === 'hold', cyc = loop && ci < 10 ? dur : dur;
    if (loop) u = (t / cyc) % 1; else u = Math.min(1, (t % (dur + 0.9)) / dur);
    if (kind === 'add') { animaEval(P, m, AC.idle, 0, t); const add = ANIMA.tmp3; animaEval(add, m, ci, u, t); for (let i = 0; i < AN; i++) P[i] += add[i]; }
    else if (kind === 'once' && ci >= 18 && ci < 28) { animaEval(P, m, AC.walk, (t / dur * 0.6) % 1, t); const o = ANIMA.tmp3; animaEval(o, m, ci, u, t); for (let i = 0; i < AN; i++) P[i] += (o[i] - P[i]) * AM_UP[i]; }
    else animaEval(P, m, ci, hold ? (t / dur) % 1 : u, t);
    if (loop && ci < 10) {
      // the floor slides back under it so the walk reads as a walk
      const sp = (4 * m.an.stride * r) / cyc * (ci === AC.back ? -1 : 1), off = (t * sp) % (r * 2);
      g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 1; g.beginPath();
      for (let x = -r * 2; x < W2 + r * 2; x += r * 2) { const xx = x - off; g.moveTo(xx, 0); g.lineTo(xx, H2); }
      g.stroke();
    }
    g.setTransform(r, 0, 0, r, cx, cy); g.lineCap = 'round'; g.lineJoin = 'round';
    lookDraw(g, m, P, { lod: 0, t: t, light: A_LT_PREV, glow: 1, preview: 1 });
  } catch (e) { animaHurt(e, 'preview'); }
  A_PREV.raf = requestAnimationFrame(aPrevFrame);
}
const A_LT_PREV = { x: -0.6, y: -0.55, c: '255,240,215', k: 0.55, rim: 0.5 };

coreAdd({
  name: 'ANIMA', kind: 'render', ver: 1, needs: ['TEXEL', 'PERF'], provides: ['zombieRig', 'zombieAnimation', 'corpses'],
  does: 'Rig and animation engine for the 2.0 zombies: every zombie a jointed body (32-number poses, 3D forward kinematics seen from above) with 50 animations of its own (10 ways of moving, 8 idles, 10 attacks, 8 hit reactions, 8 deaths, 6 specials) shaped by its gait, arms, head, build and seed; cross-faded transitions that keep the walk in step, attacks on the upper body while the legs walk, hit reactions layered on top, deaths from whatever pose it was in, corpses that stay a while; live joints near you, cached frames for the crowd.',
  state: () => animaUp() ? 'on' : 'off',
  level: () => ANIMA.live + ' live, ' + ANIMA.cached + ' cached, ' + ANIMA.corpses.length + ' corpses, ' + ANIMA.cache.size + ' frames' + (ANIMA.adapt ? ', detail ' + ANIMA.adapt : ''),
  canTrim: () => ANIMA.adapt > -3, trim: () => { if (ANIMA.adapt <= -3) return false; ANIMA.adapt--; return true; }, boost: () => { if (ANIMA.adapt >= 0) return false; ANIMA.adapt++; return true; },
  check: animaCheck, repair: animaRepair, isolate: () => { ANIMA.offUntil = performance.now() + 60000; }, restore: () => { ANIMA.offUntil = 0; },
  save: () => ANIMA.adapt, load: v => { ANIMA.adapt = clamp(v | 0, -3, 0); },
  on: { run: () => animaReset(), lowMemory: () => { animaForget(); if (ANIMA.corpses.length > 20) ANIMA.corpses.splice(0, ANIMA.corpses.length - 20); } }
});
// what it does for the others: lets go of its frames when the crowd engine or the texture engine need memory back
coreMeta('ANIMA', { helps: { SWARM: () => animaForget(), TEXEL: () => animaForget() } });
