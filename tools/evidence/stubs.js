const TAU = Math.PI * 2; const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const SET = { legend: 'operator', legendClass: 'attack' }; const G = { time: 0, mode: 'title' };
function coreHurt(n, e) { console.error('HURT', n, e && e.message || e); } function coreCost() {} function coreRepaired(n, w) { console.log('REPAIRED', w); } function coreLog() {}
const ZR_DEFS = [{ key: 'cook', skin: '#a08a78', cloth: '#ece8df', cloth2: '#303030', acc: '#c9c2b4', hair: 'short', hairCol: '#1e1612', eye: '#f6e0a0', top: 'chef', bottom: 'check' }, { key: 'exec', skin: '#7d7468', cloth: '#22252c', cloth2: '#22252c', acc: '#b8a24a', hair: 'slick', hairCol: '#15110e', eye: '#ffe08a', top: 'suit', tie: 1, bottom: 'slacks' }];
const GUN_LEN = { pistol: 16, rifle: 26 }; let SPR = 2, PK = 1;
const PERF = { tier: 3 }; const TUNE = {}; let RM = false; function coreEmit() { return 0; }
function coreDefine() {} const SCL = 1, SCALE_REAL = 1; function engFloor() {} const store = { get: (k, d) => d, set: () => {} };
