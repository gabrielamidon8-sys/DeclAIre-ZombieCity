const TAU = Math.PI * 2; const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const SET = { legend: 'operator', legendClass: 'attack' }; const G = { time: 0, mode: 'title' };
function coreHurt(n, e) { console.error('HURT', n, e && e.message || e); } function coreCost() {} function coreRepaired(n, w) { console.log('REPAIRED', w); } function coreLog() {}
const ZR_DEFS = [{ key: 'cook', skin: '#a08a78', cloth: '#ece8df', cloth2: '#303030', acc: '#c9c2b4', hair: 'short', hairCol: '#1e1612', eye: '#f6e0a0', top: 'chef', bottom: 'check' }, { key: 'exec', skin: '#7d7468', cloth: '#22252c', cloth2: '#22252c', acc: '#b8a24a', hair: 'slick', hairCol: '#15110e', eye: '#ffe08a', top: 'suit', tie: 1, bottom: 'slacks' }];
const GUN_LEN = { pistol: 16, rifle: 26 }; let SPR = 2, PK = 1;
const PERF = { tier: 3 }; const TUNE = {}; let RM = false; function coreEmit() { return 0; }
function coreDefine() {} const SCL = 1, SCALE_REAL = 1; function engFloor() {} const store = { get: (k, d) => d, set: () => {} };
// 1.9.997: the arms table the run clips read the reload technique from (weapons.js, kept in step by hand here)
const ARMS_BY = {};
for (const [k, kind, empty] of [['m4a1', 'ar', 2.55], ['ak74m', 'ak', 2.85], ['mk17', 'scar', 3.0], ['m1014', 'tube', 0.95], ['pp19', 'helix', 3.1], ['m17', 'pistol', 1.85], ['m9', 'pistol', 1.95], ['m1911', 'p1911', 1.85], ['m1917', 'moon', 3.0], ['aps', 'pistol', 2.05], ['mp5a3', 'mp5', 2.3], ['m249', 'belt', 7.0], ['mk14', 'ebr', 2.9], ['m590a1', 'pump', 1.5], ['aug', 'bullpup', 2.9], ['g17', 'pistol', 1.75], ['deagle', 'pistol', 2.5], ['m29', 'speed', 2.8], ['fiveseven', 'pistol', 1.75], ['coach', 'break', 3.0]]) ARMS_BY[k] = { arms: { key: k, reload: { kind: kind, empty: empty } } };
