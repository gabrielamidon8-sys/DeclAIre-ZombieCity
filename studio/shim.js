/* The Cinematic Studio runs the five film engines on their own, outside the game: what the game's hub (CORE) and its
   settings would provide, given here plainly. */
const TAU = Math.PI * 2; const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const SET = { legend: 'operator', legendClass: 'attack', flash: false }; const G = { time: 0, mode: 'studio' };
function coreHurt(n, e) { try { console.error('[studio] ' + n + ': ' + (e && e.message || e)); } catch (x) { } }
function coreCost() { } function coreRepaired() { } function coreLog() { } function coreEmit() { return 0; } function coreDefine() { } function engFloor() { }
const ZR_DEFS = [{ key: 'cook', skin: '#a08a78', cloth: '#ece8df', cloth2: '#303030', acc: '#c9c2b4', hair: 'short', hairCol: '#1e1612', eye: '#f6e0a0', top: 'chef', bottom: 'check' }];
const GUN_LEN = { pistol: 16, rifle: 26 }; let SPR = 2, PK = 1;
const PERF = { tier: 3 }; const TUNE = {}; let RM = false; const SCL = 1, SCALE_REAL = 1;
// what the engines keep between visits (the course results), in this browser only
const store = { get: (k, d) => { try { const v = localStorage.getItem('studio_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('studio_' + k, JSON.stringify(v)); } catch (e) { } } };
