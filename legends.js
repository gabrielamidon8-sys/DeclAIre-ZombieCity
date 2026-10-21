/* ================= the Legends screen (v1), and LEGEND / MIMATIC / VFXRAY joining the ecosystem =================
   Main menu > Legends: a hub with the Characters tab (Cards arrive later). Characters goes through a cinematic fade into
   the selection: the five classes as columns over a live cinematic of the line-up (each class's Operator standing in
   the rain behind its column). Hovering (or focusing, or tapping) a legend plays its cinematic behind the columns with
   its score; leaving returns to the line-up. Choosing it opens its page: the model in a studio, front-on, then the
   camera tilts up and over to look straight down as the game sees him; Front, Top-down and Orbit (drag to turn,
   wheel or pinch to zoom); every one of his fifty animations to play; the class (patch, visor, kit); and Deploy, which
   makes him the survivor in a run (and what teammates see in co-op). */
const LGS = { open: false, view: 'hub', cls: null, hoverCls: null, hoverT: 0, watching: false, lineRt: 0, anim: 'idle_ready', speed: 1, armed: null, built: false, w: 0, h: 0, dpr: 1, drag: null, pinch: null, titleT: 0 };
function legendCover() { return LGS.open && !$('legends').hidden; }
function lgsDpr() { return Math.min(window.devicePixelRatio || 1, PERF.tier >= 3 ? 2 : PERF.tier >= 2 ? 1.5 : 1.25); }
// the game's loop calls this instead of drawing the city while the screen is up
function legendFrame(rdt) {
  const st = $('lgStage'); if (!st) return;
  const r = st.getBoundingClientRect(), d = lgsDpr(), w = Math.max(32, Math.round(r.width * d)), h = Math.max(32, Math.round(r.height * d));
  LGS.w = w; LGS.h = h; LGS.dpr = d;
  const cv = mimCanvas(); if (cv && cv.parentNode !== st) { st.textContent = ''; st.appendChild(cv); }
  if (cv) { cv.style.width = '100%'; cv.style.height = '100%'; }
  // real time, not the game's clamped step: on a slow device the cinematic skips frames to stay with its score
  const now = performance.now(), real = LGS.lastT && now - LGS.lastT < 1000 ? Math.min(0.5, (now - LGS.lastT) / 1000) : Math.min(rdt, 0.05); LGS.lastT = now;
  mimFrame(real, w, h);
  // on his page the model stands in the part of the stage the side panel leaves free (to its left on a wide screen,
  // above it on a phone held upright): the lens is shifted there and pulled back to fit
  MIM.free = null;
  if (LGS.view === 'detail') {
    const sd = document.querySelector('#lgDetail .lg-side'), top = document.querySelector('#legends .lg-top');
    if (sd && r.width > 0 && r.height > 0) {
      const q = sd.getBoundingClientRect(), tb = top ? top.getBoundingClientRect().bottom - r.top : 0;
      let x0 = 0, x1 = r.width, y0 = Math.max(0, tb), y1 = r.height;
      if (q.top - r.top > r.height * 0.25) y1 = Math.min(y1, q.top - r.top); else if (q.left - r.left > r.width * 0.3) x1 = Math.min(x1, q.left - r.left);
      const fw = Math.max(1, x1 - x0), fh = Math.max(1, y1 - y0);
      MIM.free = { sx: ((x0 + x1) / 2 / r.width - 0.5) * 2, sy: -((y0 + y1) / 2 / r.height - 0.5) * 2, kh: fh / r.height, kw: fw / r.width };
    }
  }
  // the view buttons follow the camera (the automatic tilt to top-down included)
  if (LGS.view === 'detail' && MIM.studio.view !== LGS.shownV) { LGS.shownV = MIM.studio.view; lgsViews(); }
  lgsGovern(real);
}
// the screen's own governor (PERF only watches the city): when the cinematic runs slow, the effects step down first,
// then the director's resolution, then the characters; when there is room again they climb back in the other order
const LGS_GOV = { ft: 16.7, slow: 0, fast: 0, t0: 0, steps: 0 };
function lgsGovern(rdt) {
  const G2 = LGS_GOV, now = performance.now();
  if (!G2.t0) G2.t0 = now;
  if (now - G2.t0 < 1500 || LG.atlasBusy || !(rdt > 0) || LGS.noGov) return;   // the fade and the texture painting are not the cinematic's fault
  G2.ft += (Math.min(rdt, 0.1) * 1000 - G2.ft) * 0.08;
  if (G2.ft > 24) { G2.slow += rdt; G2.fast = 0; } else if (G2.ft < 14.5) { G2.fast += rdt; G2.slow = 0; } else { G2.slow = Math.max(0, G2.slow - rdt); G2.fast = Math.max(0, G2.fast - rdt); }
  const order = [['VFXRAY', VX], ['MIMATIC', MIM], ['LEGEND', LG]], floor = { VFXRAY: -3, MIMATIC: -3, LEGEND: -2 };
  if (G2.slow > 1.2) {
    G2.slow = 0;
    // in rounds: the effects one step, the director one step, the characters one step, then the next round down
    let done = false;
    for (let d = -1; d >= -3 && !done; d--) for (const [n, o] of order) { if (coreEff(n).effort !== 'auto') continue; if (o.adapt > d && o.adapt > floor[n]) { o.adapt--; G2.steps++; coreLog(n + ' stepped down: the Legends screen was running slow'); done = true; break; } }
  } else if (G2.fast > 5) {
    G2.fast = 0;
    // back up from the lowest one, characters first
    let lo = null; for (const [n, o] of order.slice().reverse()) if (o.adapt < 0 && (!lo || o.adapt < lo[1].adapt)) lo = [n, o];
    if (lo) { lo[1].adapt++; G2.steps++; coreLog(lo[0] + ' stepped back up: the Legends screen has room'); }
  }
}

/* ---------- opening and closing ---------- */
function openLegends() {
  if (LGS.open) return; LGS.open = true; LGS.target = null; lgsBuild();
  $('legends').hidden = false; $('legends').classList.remove('watching');
  lgsView('hub', true);
  mimSetup(); lgsMount();
  // textures: a bigger atlas for the screen (painted a few tiles a frame behind the fade)
  lgAtlasGet([128, 128, 256, 512][lgLevel()]).then(() => { for (const m of LG.models.values()) m.cpu = null; });
  mimStart('hub'); LGS.lineRt = 0; LGS_GOV.t0 = 0; LGS_GOV.ft = 16.7; LGS_GOV.slow = LGS_GOV.fast = 0;
  try { SFX.cineAmb(true); SFX.fm.hold(true, 0.16); SFX.cine('uiTransition'); } catch (e) { }
  lgsFade(0.9, 0);
  coreEmit('legends', { open: true });
}
function closeLegends() {
  if (!LGS.open) return; LGS.open = false; LGS.watching = false; LGS.target = null;
  mimStop(); try { SFX.cineStop(); SFX.cineAmb(false); SFX.fm.hold(false); } catch (e) { }
  $('legends').hidden = true; $('lgTitle').hidden = true; refreshTitle(); lgsMenuTile();
  coreEmit('legends', { open: false });
}
function lgsMount() { const cv = mimCanvas(), st = $('lgStage'); if (cv && cv.parentNode !== st) { st.textContent = ''; st.appendChild(cv); } }
// the cinematic fade between views: to black, switch, back
function lgsFade(dur, holdMs, fn) { const f = $('lgFade'); f.style.transitionDuration = (dur / 2) + 's'; f.classList.add('on'); setTimeout(() => { if (fn) fn(); setTimeout(() => f.classList.remove('on'), holdMs || 60); }, dur * 500); }
function lgsView(v, quick) {
  LGS.view = v; const L = $('legends'); L.dataset.view = v;
  $('lgHub').hidden = v !== 'hub'; $('lgSelect').hidden = v !== 'select'; $('lgDetail').hidden = v !== 'detail';
  $('lgCrumb').textContent = v === 'hub' ? '' : v === 'select' ? 'Characters' : 'Characters / ' + LG_LEGENDS[0].name;
  if (!quick) setTimeout(() => { const f = focusables($('legends')); const p = v === 'hub' ? $('lgEnter') : v === 'select' ? document.querySelector('.lg-card') : $('lgDeploy'); if (p && DEV.kind === 'pad') focusEl(p); }, 30);
}
// hub > characters: the cinematic flow into the selection
// a move between views: the screen knows where it is heading at once (so a second press during the fade goes one
// step further instead of repeating this one), and switches behind the fade
function lgsGo(v, dur, hold, fn) { LGS.target = v; lgsFade(dur, hold, () => { if (!LGS.open || LGS.target !== v) return; LGS.target = null; fn(); }); }
function lgsEnterCharacters() {
  if ((LGS.target || LGS.view) !== 'hub') return;
  try { SFX.cine('uiTransition'); } catch (e) { }
  lgsGo('select', 1.1, 120, () => { lgsView('select'); mimStart('lineup'); LGS.lineRt = 0; });
}
function lgsBack() {
  if (!LGS.open) return false;
  const v = LGS.target || LGS.view;
  if (v === 'detail') { try { SFX.cine('uiBack'); } catch (e) { } lgsGo('select', 0.7, 60, () => { lgsView('select'); mimStart('lineup'); MIM.rt = LGS.lineRt; }); return true; }
  if (v === 'select') { try { SFX.cine('uiBack'); } catch (e) { } lgsStopWatch(true); lgsGo('hub', 0.7, 60, () => { lgsView('hub'); mimStart('hub'); }); return true; }
  try { SFX.cine('uiBack'); } catch (e) { } closeLegends(); return true;
}

/* ---------- the selection: five class columns over the line-up ---------- */
const LG_CLASS_ICON = {
  attack: '<path d="M12 3l6 11-6-3-6 3z"/><circle cx="12" cy="12" r="9.2"/>', defense: '<path d="M12 3c3 1 5 1.2 7 1.2 0 8-2.6 13-7 16-4.4-3-7-8-7-16 2 0 4-.2 7-1.2z"/>',
  engineer: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  medic: '<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z"/>', magic: '<path d="M12 2.5l2.1 6.4 6.6.1-5.3 4 2 6.4L12 15.5l-5.4 3.9 2-6.4-5.3-4 6.6-.1z"/>'
};
function lgsIcon(cls) { return '<svg viewBox="0 0 24 24" aria-hidden="true" class="lg-ic">' + (LG_CLASS_ICON[cls] || '') + '</svg>'; }
function lgsBuild() {
  if (LGS.built) return; LGS.built = true;
  // hub
  const hub = $('lgHub'); hub.textContent = '';
  const hero = el('div', 'lg-hero'); hero.append(el('p', 'lg-eye', 'Zombie City 2.0'), el('h2', 'lg-h', 'Legends'), el('p', 'lg-sub', 'Characters and their whole rig. Pick a class, meet the legend, and take him into the city.'));
  const panels = el('div', 'lg-panels');
  const enter = el('button', 'lg-panel lg-panel-main'); enter.id = 'lgEnter'; enter.type = 'button';
  enter.innerHTML = '<span class="lg-p-eye">Tab</span><b>Characters</b><span class="lg-p-sub">Five classes · the Operator · fifty animations</span><i class="lg-p-go" aria-hidden="true"></i>';
  enter.addEventListener('click', () => lgsEnterCharacters());
  enter.addEventListener('pointerenter', () => { try { SFX.cine('uiHover'); } catch (e) { } });
  const cards = el('div', 'lg-panel lg-panel-lock'); cards.innerHTML = '<span class="lg-p-eye">Tab</span><b>Cards</b><span class="lg-p-sub">Card modifications on the front view arrive in a later update.</span>';
  panels.append(enter, cards); hub.append(hero, panels);
  // the selection
  const box = $('lgClasses'); box.textContent = '';
  LG_CLASSES.forEach((c, i) => {
    const col = el('div', 'lg-col'); col.style.setProperty('--cc', c.col); col.style.setProperty('--cg', c.glow); col.dataset.cls = c.id;
    const head = el('div', 'lg-col-head'); head.innerHTML = lgsIcon(c.id) + '<b>' + c.name + '</b><small>' + c.tag + '</small>';
    // 1.9.993: a small square card with his face, nothing else; hovering it plays the stoop behind the columns
    const card = el('button', 'lg-card lg-face'); card.type = 'button'; card.dataset.cls = c.id; card.setAttribute('aria-label', 'Operator, ' + c.name + ' class. Base legend. Open his page.'); card.title = 'Operator · ' + c.name;
    card.innerHTML = '<span class="lg-card-art" aria-hidden="true"><canvas width="192" height="192"></canvas></span><b class="lg-card-name">Operator</b>';
    card.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') lgsHover(c.id); });
    card.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') lgsUnhover(c.id); });
    card.addEventListener('focus', () => { if (DEV.kind === 'pad' || DEV.kind === 'kbm') lgsHover(c.id, 450); });
    card.addEventListener('blur', () => lgsUnhover(c.id));
    card.addEventListener('click', e => {
      const touch = e.pointerType === 'touch' || (e.detail === 0 ? false : LGS.lastPointer === 'touch');
      if (touch && LGS.armed !== c.id) { LGS.armed = c.id; lgsHover(c.id, 0, true); return; }
      lgsOpenLegend(c.id);
    });
    card.addEventListener('pointerdown', e => { LGS.lastPointer = e.pointerType; });
    const locks = el('div', 'lg-locks'); for (let k = 0; k < 2; k++) { const l = el('div', 'lg-lock'); l.innerHTML = '<span class="lg-lock-art" aria-hidden="true"></span><b>Classified</b><small>A ' + c.name.toLowerCase() + ' legend is coming</small>'; locks.append(l); }
    col.append(head, card, el('p', 'lg-col-blurb', c.blurb), locks); box.append(col);
    col.addEventListener('pointerenter', () => { MIM.focus = i; }); col.addEventListener('pointerleave', () => { if (MIM.focus === i) MIM.focus = null; });
  });
  // the legend's page
  const D = $('lgDetail'); D.textContent = '';
  const side = el('div', 'lg-side');
  const top = el('div', 'lg-d-top'); top.innerHTML = '<p class="lg-eye">Base legend · for beginners</p><h2 class="lg-d-name">Operator</h2><p class="lg-d-line">' + LG_LEGENDS[0].line + '</p>';
  const chips = el('div', 'lg-chips'); chips.setAttribute('role', 'tablist'); chips.setAttribute('aria-label', 'Class');
  LG_CLASSES.forEach(c => { const b = el('button', 'lg-chip'); b.type = 'button'; b.dataset.cls = c.id; b.style.setProperty('--cc', c.col); b.innerHTML = lgsIcon(c.id) + '<span>' + c.name + '</span>'; b.setAttribute('role', 'tab'); b.addEventListener('click', () => lgsSetClass(c.id)); chips.append(b); });
  const note = el('p', 'lg-note', 'Classes do not change how he plays yet: that arrives with the class update. Today your class sets his patch, his visor and his kit.');
  const views = el('div', 'lg-views'); views.setAttribute('role', 'group'); views.setAttribute('aria-label', 'View');
  [['front', 'Front'], ['top', 'Top-down'], ['orbit', 'Orbit']].forEach(([k, t]) => { const b = el('button', 'lg-vbtn'); b.type = 'button'; b.dataset.v = k; b.textContent = t; b.addEventListener('click', () => { mimStudioView(k); lgsViews(); try { SFX.cine('uiTab'); } catch (e) { } }); views.append(b); });
  const viewNote = el('p', 'lg-vnote', 'Front view is where card modifications will be fitted, in a later update. Top-down is how he looks in a run. Drag to turn him; wheel or pinch to zoom.');
  // the fifty, by kind
  const anim = el('div', 'lg-anim'), aHead = el('div', 'lg-anim-head'), aCats = el('div', 'lg-anim-cats'), aList = el('div', 'lg-anim-list'), aInfo = el('div', 'lg-anim-info');
  aHead.innerHTML = '<b>Animations</b><span id="lgAnimCount">' + lgsFifty().length + '</span>';
  const cats = []; for (const a of lgsFifty()) if (cats.indexOf(a.cat) < 0) cats.push(a.cat);
  cats.forEach((c, i) => { const b = el('button', 'lg-acat tab' + (i === 0 ? ' on' : '')); b.type = 'button'; b.textContent = c; b.dataset.cat = c; b.addEventListener('click', () => { LGS.cat = c; lgsAnimList(); try { SFX.cine('uiTab'); } catch (e) { } }); aCats.append(b); });
  LGS.cat = cats[0];
  const ctr = el('div', 'lg-anim-ctr');
  [['0.25', '¼×'], ['0.5', '½×'], ['1', '1×']].forEach(([k, t]) => { const b = el('button', 'lg-spd' + (k === '1' ? ' on' : '')); b.type = 'button'; b.dataset.s = k; b.textContent = t; b.addEventListener('click', () => { LGS.speed = +k; const a = MIM.actors[0]; if (a && a.player) a.player.sp = LGS.speed; ctr.querySelectorAll('.lg-spd').forEach(x => x.classList.toggle('on', x === b)); }); ctr.append(b); });
  const rep = el('button', 'lg-spd'); rep.type = 'button'; rep.textContent = 'Replay'; rep.addEventListener('click', () => lgsPlayAnim(LGS.anim)); ctr.append(rep);
  anim.append(aHead, aCats, aList, aInfo, ctr);
  // story, personality and kit
  const story = el('details', 'lg-story'); story.innerHTML = '<summary>His story, his manner, his kit</summary><p>' + LG_LEGENDS[0].bio + '</p><ul class="lg-traits">' + LG_LEGENDS[0].personality.map(p => '<li>' + p + '</li>').join('') + '</ul><ul class="lg-gear">' + LG_LEGENDS[0].gear.map(g => '<li>' + g + '</li>').join('') + '</ul>';
  const dep = el('button', 'btn primary lg-deploy'); dep.id = 'lgDeploy'; dep.type = 'button'; dep.addEventListener('click', lgsDeploy);
  side.append(top, chips, note, views, viewNote, anim, story, dep); D.append(side);
  // dragging and zooming the studio
  const st = $('lgStage');
  st.addEventListener('pointerdown', e => { if (LGS.view !== 'detail') return; LGS.drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { st.setPointerCapture(e.pointerId); } catch (x) { } });
  st.addEventListener('pointermove', e => { if (!LGS.drag || LGS.drag.id !== e.pointerId) return; const dx = e.clientX - LGS.drag.x, dy = e.clientY - LGS.drag.y; LGS.drag.x = e.clientX; LGS.drag.y = e.clientY; mimStudioDrag(dx, dy); lgsViews(); });
  st.addEventListener('pointerup', () => { LGS.drag = null; }); st.addEventListener('pointercancel', () => { LGS.drag = null; });
  st.addEventListener('wheel', e => { if (LGS.view !== 'detail') return; e.preventDefault(); mimStudioZoom(e.deltaY); lgsViews(); }, { passive: false });
  st.addEventListener('touchmove', e => { if (LGS.view !== 'detail' || e.touches.length !== 2) return; const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (LGS.pinch) mimStudioZoom((LGS.pinch - d) * 3); LGS.pinch = d; e.preventDefault(); }, { passive: false });
  st.addEventListener('touchend', () => { LGS.pinch = null; });
  $('lgBack').addEventListener('click', () => lgsBack());
  $('lgWatchAll').addEventListener('click', () => { const c = LGS.hoverCls || SET.legendClass || 'attack'; lgsWatchFight(c); });
  lgsPortraits();
}
// small portraits on the cards: the Operator painted once per class on the processor (front, a little from the side)
function lgsPortraits() {
  const go = () => {
    document.querySelectorAll('.lg-card').forEach(card => {
      const cls = card.dataset.cls, c = card.querySelector('canvas'); if (!c || c.dataset.done) return;
      try {
        // his face, close, the mask down (the same face as the stoop's), a little from his right, lit from above
        const m = lgModel('operator', 1, cls + '|idle'), P = lgPose(); lgEvalClip(LG_ANIM_BY.idle_ready, 0.6, P, {}); P.mask = 0; P.glow = 0.4;
        const L = lgLocalNew(), W = lgWorldNew(); lgSolve(P, L, W, lgRootM(P));
        const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
        const h = LGB.head * 16, H = [W[h + 12], W[h + 13], W[h + 14] + 0.07];
        const cam = lgCam(); cam.eye = [H[0] + 0.66, H[1] - 0.2, H[2] + 0.02]; cam.tgt = [H[0], H[1], H[2] - 0.01]; cam.fov = 0.42;
        const col = lgHex((LG_CLASS_BY[cls] || LG_CLASSES[0]).col);
        lg2DScene(g, { cam: cam, items: [{ m: m, W: W, acc: col, glow: 1, hide: mimHideCarbine() }], key: { dir: [0.5, -0.3, 0.9], col: [1.45, 1.3, 1.1] }, rim: { dir: [-0.8, 0.6, 0.3], col: col.map(v => v * 1.8) }, sky: [0.2, 0.22, 0.28], gnd: [0.06, 0.06, 0.07], clear: [0, 0, 0] }, c.width, c.height);
        // keep the background transparent: the painter cleared to black, so knock the black out
        const d = g.getImageData(0, 0, c.width, c.height), a = d.data; for (let i = 0; i < a.length; i += 4) if (a[i] + a[i + 1] + a[i + 2] < 6) a[i + 3] = 0; g.putImageData(d, 0, 0);
        c.dataset.done = '1';
      } catch (e) { lgHurt(e); }
    });
  };
  lgAtlasGet(128).then(() => setTimeout(go, 30));
}
// hovering a legend: its cinematic plays behind the columns (after a short settle so a passing mouse does not trigger it)
function lgsHover(cls, delay, now) {
  if (LGS.view !== 'select') return;
  clearTimeout(LGS.hoverT); LGS.hoverCls = cls;
  LGS.hoverT = setTimeout(() => {
    if (LGS.view !== 'select' || LGS.hoverCls !== cls) return;
    if (LGS.watching && MIM.cls === cls && (MIM.scene === 'alley' || MIM.scene === 'stoop')) return;
    if (MIM.scene === 'lineup') LGS.lineRt = MIM.rt;
    LGS.watching = true; $('legends').classList.add('watching'); document.querySelectorAll('.lg-col').forEach(c => c.classList.toggle('hot', c.dataset.cls === cls));
    try { SFX.cine('uiSelect'); SFX.cineAmbDuck(0.8); } catch (e) { }
    // the stoop: he sits under a bulb sharpening his knife, mask down (legidle.js); it plays as long as you stay
    mimStart('stoop', { cls: cls });
  }, now ? 0 : (delay == null ? 220 : delay));
}
// "Watch the cinematic": the alley fight, with its score and its title card
function lgsWatchFight(cls) {
  if (LGS.view !== 'select') return;
  clearTimeout(LGS.hoverT); LGS.hoverCls = cls; LGS.armed = cls;
  if (MIM.scene === 'lineup') LGS.lineRt = MIM.rt;
  LGS.watching = true; $('legends').classList.add('watching'); document.querySelectorAll('.lg-col').forEach(c => c.classList.toggle('hot', c.dataset.cls === cls));
  try { SFX.cine('uiSelect'); SFX.cineAmbDuck(0.35); } catch (e) { }
  mimStart('alley', { cls: cls, onEnd: () => lgsStopWatch(), onCue: lgsCue });
}
function lgsUnhover(cls) {
  if (LGS.hoverCls !== cls) return; clearTimeout(LGS.hoverT);
  LGS.hoverT = setTimeout(() => { if (LGS.hoverCls === cls) LGS.hoverCls = null; if (LGS.armed && LGS.armed === cls) return; lgsStopWatch(); }, 160);
}
function lgsStopWatch(silent) {
  clearTimeout(LGS.hoverT);
  if (!LGS.watching) return; LGS.watching = false; LGS.armed = null;
  $('legends').classList.remove('watching'); document.querySelectorAll('.lg-col.hot').forEach(c => c.classList.remove('hot')); $('lgTitle').hidden = true;
  try { SFX.cineStop(); SFX.cineAmbDuck(1); } catch (e) { }
  if (!silent && LGS.view === 'select') { lgsFade(0.5, 30, () => { if (LGS.view !== 'select' || LGS.watching) return; mimStart('lineup'); MIM.rt = LGS.lineRt; }); }
}
// the title card lands on the frozen frame
function lgsCue(c) {
  if (c === 'title') { const t = $('lgTitle'), cl = LG_CLASS_BY[MIM.cls] || LG_CLASSES[0]; t.style.setProperty('--cc', cl.col); t.querySelector('.lg-t-cls').textContent = cl.name; t.hidden = false; t.classList.remove('in'); void t.offsetWidth; t.classList.add('in'); }
  if (c === 'end' || c === 'fadeOut') { if (c === 'end') $('lgTitle').hidden = true; }
}

/* ---------- the legend's page ---------- */
function lgsOpenLegend(cls) {
  lgsStopWatch(true); LGS.cls = cls; LGS.anim = 'idle_ready'; LGS.speed = 1;
  try { SFX.cine('uiSelect'); } catch (e) { }
  lgsGo('detail', 0.8, 80, () => { lgsView('detail'); mimStart('studio', { cls: cls, anim: 'mask_tap' }); setTimeout(() => { if (LGS.view === 'detail') lgsPlayAnim('idle_ready', true); }, 2600); lgsSetClass(cls, true); lgsAnimList(); lgsViews(); lgsDeployLabel(); });
}
function lgsSetClass(cls, quiet) {
  LGS.cls = cls; mimStudioClass(cls);
  document.querySelectorAll('.lg-chip').forEach(b => { b.classList.toggle('on', b.dataset.cls === cls); b.setAttribute('aria-selected', b.dataset.cls === cls ? 'true' : 'false'); });
  $('lgDetail').style.setProperty('--cc', LG_CLASS_BY[cls].col); lgsDeployLabel();
  if (!quiet) try { SFX.cine('uiTab'); } catch (e) { }
}
function lgsViews() { const v = MIM.studio.view; document.querySelectorAll('.lg-vbtn').forEach(b => b.classList.toggle('on', b.dataset.v === v)); }
// the fifty (the scene-only clips of the cinematic and the dead are not in the browser)
function lgsFifty() { return LG_ANIMS.filter(a => a.cat !== 'Actors' && a.cat !== 'Cinematic'); }
function lgsAnimList() {
  const list = document.querySelector('.lg-anim-list'); if (!list) return; list.textContent = '';
  document.querySelectorAll('.lg-acat').forEach(b => b.classList.toggle('on', b.dataset.cat === LGS.cat));
  lgsFifty().forEach((a, i) => {
    if (a.cat !== LGS.cat) return;
    const b = el('button', 'lg-abtn' + (a.id === LGS.anim ? ' on' : '')); b.type = 'button'; b.dataset.a = a.id;
    b.innerHTML = '<em>' + String(i + 1).padStart(2, '0') + '</em><span>' + a.name + '</span>' + (a.loop ? '<i title="Loops">∞</i>' : '');
    b.addEventListener('click', () => lgsPlayAnim(a.id)); list.append(b);
  });
  lgsAnimInfo();
}
function lgsAnimInfo() {
  const a = LG_ANIM_BY[LGS.anim], box = document.querySelector('.lg-anim-info'); if (!box || !a) return;
  const i = lgsFifty().indexOf(a) + 1;
  box.innerHTML = '<b>' + (i ? i + '. ' : '') + a.name + '</b><p>' + a.desc + '</p>' + (a.ref ? '<small>Referenced: ' + a.ref + '</small>' : '');
}
function lgsPlayAnim(id, quiet) {
  LGS.anim = id; mimStudioPlay(id); const a = MIM.actors[0]; if (a && a.player) a.player.sp = LGS.speed;
  document.querySelectorAll('.lg-abtn').forEach(b => b.classList.toggle('on', b.dataset.a === id)); lgsAnimInfo();
  if (!quiet) try { SFX.cine('uiTab'); } catch (e) { }
}
function lgsDeployLabel() {
  const b = $('lgDeploy'); if (!b) return; const c = LG_CLASS_BY[LGS.cls || 'attack'], on = SET.legend === 'operator' && SET.legendClass === c.id;
  b.textContent = on ? 'Deployed: Operator · ' + c.name : 'Deploy as Operator · ' + c.name; b.classList.toggle('done', on);
}
function lgsDeploy() {
  const c = LG_CLASS_BY[LGS.cls || 'attack'];
  SET.legend = 'operator'; SET.legendClass = c.id; saveSettings(); LG.sprites.clear();
  try { SFX.cine('uiDeploy'); } catch (e) { }
  lgsDeployLabel(); lgsMenuTile(); toast('Legends', 'Operator · ' + c.name + ' deployed', c.col);
  if (typeof netLegendChanged === 'function') netLegendChanged();
  mimStudioPlay('mask_tap');
}
function lgsMenuTile() { const e = $('legendsEm'); if (!e) return; const c = LG_CLASS_BY[SET.legendClass] || LG_CLASSES[0]; e.textContent = (SET.legend === 'none' ? 'Off' : 'Operator · ' + c.name); }
$('legendsBtn').addEventListener('click', () => { SFX.click(); openLegends(); });
lgsMenuTile();

/* ---------- LEGEND, MIMATIC and VFXRAY in the ecosystem ---------- */
// the three draw the screen together on one renderer: the processor if any of them is set to it in the engine room
function lgsProc(o, proc) {
  if (proc === o.procWant) return; o.procWant = proc;
  const want = [LG, MIM, VX].some(x => x.procWant === 'cpu') ? '2d' : 'gl';
  if (!LGS.open && MIM.mode !== 'none' && MIM.mode !== want) { MIM.mode = 'none'; MIM.cv2 = null; MIM.g2 = null; }
}
function lgLevel() { return LG.lvl = clamp(([1, 2, 2, 3][clamp(PERF.tier | 0, 0, 3)]) + LG.adapt + (TUNE.LEGEND || 0), 0, 3); }
// a rig test: random poses keep every bone its length; the hand reaches the grip it was sent to
function lgSelfTest() {
  let n = 0, pass = 0, why = '';
  try {
    const P = lgPose(), L = lgLocalNew(), W = lgWorldNew(), R = lgRng(7);
    for (let k = 0; k < 6; k++) { lgPoseReset(P); for (let i = 0; i < LG_NB * 3; i++) P.r[i] = (R() - 0.5) * 1.2; lgSolve(P, L, W, lgM4()); let ok = true; for (let i = 1; i < 34; i++) { const p = LG_PAR[i]; if (p < 0) continue; const d = Math.hypot(W[i * 16 + 12] - W[p * 16 + 12], W[i * 16 + 13] - W[p * 16 + 13], W[i * 16 + 14] - W[p * 16 + 14]), e = Math.hypot(LG_OFF[i * 3], LG_OFF[i * 3 + 1], LG_OFF[i * 3 + 2]); if (Math.abs(d - e) > 1e-4) ok = false; } n++; if (ok) pass++; else why = 'a bone changed length'; }
    // both hands on the pistol in the isosceles stance, and on the carbine aimed (grip and handguard)
    for (const [fn, post, prop, sR, sL] of [[lgPistolAt, LG_POST.iso, 'pistol', LG_SOCK.gripR, LG_SOCK.gripL], [lgCarbineAt, LG_POST.raim, 'carbine', LG_SOCK.cgripR, LG_SOCK.cgripL]]) {
      lgPoseReset(P); fn(P, post); lgSolve(P, L, W, lgM4()); const PM = W.subarray(LGB[prop] * 16, LGB[prop] * 16 + 16);
      for (const [hn, so] of [['handR', sR], ['handL', sL]]) { const Gm = lgMul(lgM4(), PM, so), h = LGB[hn] * 16, miss = Math.hypot(W[h + 12] - Gm[12], W[h + 13] - Gm[13], W[h + 14] - Gm[14]); n++; if (miss < 0.002) pass++; else why = why || 'a hand missed its grip on the ' + prop + ' by ' + (miss * 1000).toFixed(1) + ' mm'; }
    }
    n++; if (LG_ANIMS.filter(a => ['Actors', 'Cinematic', 'Idle', 'Arms'].indexOf(a.cat) < 0).length === 50) pass++; else why = why || 'the fifty are not all there';
    // 1.9.993: the stoop's seated idles (the sharpening, the can, and at least twenty-five more) and the ARMS moves
    n++; if (LG_ANIMS.filter(a => a.cat === 'Idle').length >= 27 && LG_ANIMS.filter(a => a.cat === 'Arms').length >= 12) pass++; else why = why || 'the idle or arms animations are not all there';
    // the knife: in the reverse grip the blade leaves the little-finger side of the fist; in the forward grip the thumb side
    { lgPoseReset(P); lgBase(P, {}); P.knife.at = 'handL'; P.grip.L = 'knife'; lgHandTo(P, 'L', 'chest', [0.5, 0.3, 0.05], [0, 0, 0], [-0.3, 0.8, -0.4]); lgSolve(P, L, W, lgM4());
      const Hi = lgInv(lgM4(), W.subarray(LGB.handL * 16, LGB.handL * 16 + 16)), K = W.subarray(LGB.knife * 16, LGB.knife * 16 + 16), tip = lgPt(Hi, ...lgPt(K, 0.152, 0, 0));
      n++; if (tip[0] < -0.05) pass++; else why = why || 'the knife is held backwards'; }
  } catch (e) { why = String(e && e.message || e); }
  return { ok: pass === n, n: n, pass: pass, why: why };
}
coreDefine({ name: 'LEGEND', kind: 'render', ver: 2, does: 'The legends: real 3D characters built from shapes on a 47-bone rig, with procedural textures, reach (IK), a hundred and seven animations and two renderers; in a run the survivor is three frames (legs, upper body and gun, head) that turn on their own with weight, each rebuilt gun modelled with its own grips, and it corrects its own grips and strides.',
  provides: ['characters', 'rig', 'animation', 'playerSprite'], needs: ['CORE'], covers: [], feats: { want: ['webgl'], without: 'characters are painted on the processor: the same meshes and animation, simpler shading' }, climb: true,
  state: () => (LGS.open ? 'on screen' : LG.sprites.size ? 'in the run' : 'ready'), level: () => (LGR.ok ? 'GPU' : 'processor') + ' · ' + LG.models.size + ' models · ' + LG.sprites.size + ' run frames',
  lv: () => lgLevel(), adaptGet: () => LG.adapt, loadNow: () => LG.sprites.size, loadName: 'frames kept',
  canTrim: () => LG.adapt > -2, trim: () => { if (LG.adapt <= -2) return false; LG.adapt--; if (LG.sprites.size > 120) { const k = Array.from(LG.sprites.keys()).slice(0, 60); k.forEach(x => LG.sprites.delete(x)); } return true; },
  boost: () => { if (LG.adapt >= 0) return false; LG.adapt++; return true; },
  alive: () => LGS.open && performance.now() - (LG.beatT || 0) < 3000, beatOwn: true, stallS: 6,
  check: () => LG.offUntil > performance.now() ? 'resting after errors' : LG.sprites.size > 400 ? 'too many run frames kept' : '',
  repair: () => { LG.sprites.clear(); LG.errT.length = 0; LG.offUntil = 0; },
  reset: () => { LG.sprites.clear(); for (const m of LG.models.values()) { lgGLFree(m); m.cpu = null; } LG.models.clear(); LG.errT.length = 0; LG.offUntil = 0; },
  selfTest: () => lgSelfTest(),
  learned: () => { const o = learnOwn('LEGEND'), out = []; if (LG.spriteMade) out.push('A run frame of a legend takes about ' + (LG.spriteMs / LG.spriteMade).toFixed(1) + ' ms to paint here (' + LG.spriteMade + ' painted, kept for reuse).');
    const fx = Object.keys(LGV.fix || {}); if (fx.length) out.push('It moved ' + fx.length + ' gun posture' + (fx.length > 1 ? 's' : '') + ' in after the support hand missed its grip, and checked again (' + fx.slice(0, 4).map(k => k.replace(':', ' ') + ' ' + Math.round(-LGV.fix[k][0] * 1000) + ' mm, now ' + Math.round((LGV.miss[k] || 0) * 1000) + ' mm off').join('; ') + (fx.length > 4 ? '; …' : '') + ').');
    const st = Object.keys(LGV.stuck || {}); if (st.length) out.push('In ' + st.length + ' posture' + (st.length > 1 ? 's' : '') + ' moving the gun did not bring the hand closer, so it put them back and left them.');
    const sk = Object.keys(LGV.stride || {}).filter(k => LGV.stride[k] > 0); if (sk.length) out.push('It measured how far a planted foot really travels in ' + sk.length + ' walk' + (sk.length > 1 ? 's' : '') + ' and paces the steps by that (' + sk.slice(0, 3).map(k => (LG_ANIM_BY[k] ? LG_ANIM_BY[k].name.toLowerCase() : k) + ' ' + LGV.stride[k].toFixed(2) + ' m').join(', ') + ' a cycle).');
    return out; },
  on: { run: () => { LG.spriteBudget = 0; }, lowMemory: () => { LG.sprites.clear(); } },
  spec: { files: ['legend', 'legmodel', 'leggun', 'leganim', 'legrun'], parts: ['shape builder', 'procedural atlas (20 textures)', '47-bone rig', 'two-bone reach (legs first)', 'poses and blends', 'fifty animations', 'thirty-two seated idles', 'thirteen arms moves', 'the Operator, his kit and his face', 'the exotech mask', 'ten gun models with their own grips', 'layered run frames', 'head-led turning', 'weight and recoil springs', 'corner lean', 'self-corrected grips and strides', 'GPU renderer', 'processor painter'], procs: ['gpu', 'cpu'],
    hard: 'keeps more run frames and paints them sharper', eco: 'keeps fewer run frames and paints them at a lower detail',
    apply: (k, proc) => { engFloor(LG, 'adapt', k); lgsProc(LG, proc); },
    stats: () => [['Renderer', LGR.ok ? 'GPU' : 'processor'], ['Models', LG.models.size], ['Run frames', LG.sprites.size], ['Textures', LG.atlas ? LG.atlas.T + ' px tiles' : 'not yet'], ['Animations', LG_ANIMS.filter(a => a.cat !== 'Actors' && a.cat !== 'Cinematic').length]] }
});
coreDefine({ name: 'MIMATIC', kind: 'render', ver: 2, does: 'The director: film techniques from a library, chosen and blended from a beat sheet into shots, a time curve and cues; the stoop (an idle scene directed live from twenty-seven moves, a can kicked in the dark); weight on every actor; the alley alive (physics props, neon, passing lights); the run\'s camera (lead room, focus, recoil); it checks its own framing and corrects it.',
  provides: ['cinematics', 'director'], needs: ['LEGEND', 'VFXRAY'], feats: { want: ['webgl'], without: 'cinematics are painted on the processor at a lower detail' }, climb: true,
  state: () => MIM.scene ? (MIM.playing ? 'playing ' + MIM.scene : MIM.scene) : 'idle', level: () => (MIM.mode === 'none' ? 'not started' : MIM.mode.toUpperCase()) + ' · scale ' + Math.round(MIMQ[mimLevel()].scale * 100) + '%',
  lv: () => mimLevel(), adaptGet: () => MIM.adapt, loadNow: () => MIM.actors.length, loadName: 'actors on stage',
  canTrim: () => MIM.adapt > -3, trim: () => { if (MIM.adapt <= -3) return false; MIM.adapt--; return true; }, boost: () => { if (MIM.adapt >= 0) return false; MIM.adapt++; return true; },
  alive: () => LGS.open && MIM.playing && performance.now() - (LG.beatT || 0) < 3000, beatOwn: true, stallS: 6,
  check: () => MIM.offUntil > performance.now() ? 'resting after errors' : MIM.playing && !(MIM.rt >= 0) ? 'its clock went bad' : '',
  repair: () => { MIM.errT.length = 0; MIM.offUntil = 0; if (!(MIM.rt >= 0)) MIM.rt = 0; },
  reset: () => { mimStop(); MIM.errT.length = 0; MIM.offUntil = 0; },
  selfTest: () => { let n = 0, p = 0, why = ''; try { const d = mimDirectOperator(); n++; let ok = d.shots.every((s, i) => i === 0 || s.t0 === d.shots[i - 1].t1); if (ok) p++; else why = 'a gap between shots'; n++; let mono = true, last = -1; for (let t = 0; t < d.dur; t += 0.05) { const s = d.warp.st(t); if (s < last - 1e-6) mono = false; last = s; } if (mono) p++; else why = why || 'time ran backwards'; n++; const tech = new Set(); d.shots.forEach(s => s.tech.forEach(x => tech.add(x))); if ([...tech].every(x => MIM_REFS[x])) p++; else why = why || 'a shot uses an unknown technique'; } catch (e) { why = String(e && e.message || e); } return { ok: p === n, n: n, pass: p, why: why }; },
  learned: () => { const out = MIM.frames ? ['A cinematic frame takes about ' + MIM.msAvg.toFixed(1) + ' ms here at ' + Math.round(MIMQ[mimLevel()].scale * 100) + '% resolution.'] : []; const L = MIM.learn || {}, fixed = Object.keys(L).filter(k => L[k].w || L[k].u); if (fixed.length) out.push('It reframed ' + fixed.length + ' shot' + (fixed.length > 1 ? 's' : '') + ' of the alley after the subject left the frame or lost his headroom.'); return out; },
  spec: { files: ['mimatic', 'legidle', 'gamecam'], parts: ['technique library', 'beat sheet', 'director', 'framing rules', 'framing that corrects itself', 'camera paths', 'speed ramps and freezes', 'cues and hit points', 'weight springs on actors', 'the alley (props, neon, traffic)', 'the line-up', 'the studio', 'the stoop and its idle director', 'the run camera'], procs: ['gpu', 'cpu'],
    hard: 'renders the cinematics at a higher resolution', eco: 'renders them at a lower resolution',
    apply: (k, proc) => { engFloor(MIM, 'adapt', k); lgsProc(MIM, proc); },
    stats: () => [['Scene', MIM.scene || 'none'], ['Frame', MIM.msAvg ? MIM.msAvg.toFixed(1) + ' ms' : '…'], ['Resolution', Math.round(MIMQ[mimLevel()].scale * 100) + '%'], ['Techniques', Object.keys(MIM_REFS).length]] }
});
coreDefine({ name: 'VFXRAY', kind: 'render', ver: 2, does: 'The last pass: rain that slows and freezes with scene time, splashes, muzzle flashes, smoke, brass, mist, steam, lightning, and the post chain (bloom, film halation, anamorphic streak, fringing, a filmic shoulder, split tone, grain, vignette, letterbox, motion blur, grade); it learns its own cost and thins the rain when it runs heavy.',
  provides: ['rain', 'lightning', 'post'], needs: ['LEGEND'], feats: { want: ['webgl'], without: 'rain, flashes, grain, vignette and bars are drawn on the processor' }, climb: true,
  state: () => VX.ok ? (MIM.playing ? 'running' : 'ready') : 'processor', level: () => VXQ[vfxLevel()].rain + ' drops · bloom ' + VXQ[vfxLevel()].bloom + (VXQ[vfxLevel()].streak ? ' · streak' : ''),
  lv: () => vfxLevel(), adaptGet: () => VX.adapt, loadNow: () => VX.sp.length, loadName: 'sprites alive',
  canTrim: () => VX.adapt > -3, trim: () => { if (VX.adapt <= -3) return false; VX.adapt--; return true; }, boost: () => { if (VX.adapt >= 0) return false; VX.adapt++; return true; },
  alive: () => LGS.open && MIM.playing && performance.now() - (VX.beatT || 0) < 3000, beatOwn: true, stallS: 6,
  check: () => VX.sp.length > 950 ? 'its sprites piled up' : VX.offUntil > performance.now() ? 'resting after errors' : '',
  repair: () => { VX.sp.length = 0; VX.errT.length = 0; VX.offUntil = 0; }, reset: () => { vfxReset(); VX.errT.length = 0; VX.offUntil = 0; },
  selfTest: () => { let n = 0, p = 0, why = ''; try { const save = [VX.flashT, VX.flashPat, VX.bolts]; vfxLightning(0, [0, 0, 30], [0, 0, 5]); n++; let flips = 0, prev = 0, up = false; for (let t = 0; t <= 1.2; t += 0.005) { const f = vfxFlashAt(t); if (f > prev + 1e-4 && !up) { flips++; up = true; } else if (f < prev - 1e-4) up = false; prev = f; } if (flips <= 3) p++; else why = 'lightning flashes more than three times a second'; VX.flashT = save[0]; VX.flashPat = save[1]; VX.bolts = save[2]; n++; if (VXQ.every(q => q.rain > 0)) p++; else why = why || 'a quality step has no rain'; } catch (e) { why = String(e && e.message || e); } return { ok: p === n, n: n, pass: p, why: why }; },
  learned: () => { const out = VX.frames ? ['The effects take about ' + VX.msAvg.toFixed(1) + ' ms of a cinematic frame here (' + VXQ[vfxLevel()].rain + ' drops, ' + VXQ[vfxLevel()].bloom + ' bloom steps).'] : []; if (VX.rainK != null && VX.rainK < 1) out.push('It keeps the rain at ' + Math.round(VX.rainK * 100) + '% here: at full it cost more than this device had room for.'); return out; },
  spec: { files: ['vfxray'], parts: ['rain in scene time', 'splashes and ripples', 'sprites (flash, smoke, brass, mist, steam)', 'lightning with a safe flash pattern', 'bloom', 'film halation', 'anamorphic streak', 'fringing, grain, vignette', 'filmic shoulder and split tone', 'letterbox', 'motion blur', 'grade', 'rain that learns its cost', 'processor fallback'], procs: ['gpu', 'cpu'],
    hard: 'more rain, the anamorphic streak and motion blur', eco: 'less rain and fewer bloom steps',
    apply: (k, proc) => { engFloor(VX, 'adapt', k); lgsProc(VX, proc); },
    stats: () => [['Drops', VXQ[vfxLevel()].rain], ['Sprites', VX.sp.length], ['Bloom steps', VXQ[vfxLevel()].bloom], ['Lightning', SET.flash ? 'soft (reduced flashing)' : 'full']] }
});
