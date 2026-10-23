/* DeclAIre Studios site, the retro layer: a boot screen, the 2.0 progress board, the update log (filters, search,
   open all), the screenshot gallery with a lightbox, a before/after slider, and one secret. Data is in zc-data.js. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const D = window.ZC_DATA || { log: [], shots: [], eras: {} };
  const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ss = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } } };
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };

  /* ---------- boot screen (once a session; any key or click skips) ---------- */
  function boot() {
    const el = $('boot'); if (!el) return;
    if (calm || ss.get('zc_booted')) { el.remove(); return; }
    ss.set('zc_booted', '1');
    const out = el.querySelector('pre'), lines = [
      'DECLAIRE BIOS v2.0  (C) 2026 DECLAIRE STUDIOS',
      'MEMORY TEST ............ 640K OK',
      'LOADING QUARANTINE ZONE  [##########] 100%',
      ('BUILD ' + ((D.log[0] || {}).v || '') + ' ').padEnd(24, '.') + ' OK',
      '2.0 SLICES SHIPPED ..... 15',
      'ENGINES ONLINE ......... 35/35',
      'CORNERS CUT ............ 0',
      '',
      'STILL WORKING ON IT. PRESS ANY KEY'];
    let i = 0, j = 0, done = false;
    const end = () => { if (done) return; done = true; el.classList.add('off'); setTimeout(() => el.remove(), 450); removeEventListener('keydown', end); };
    el.addEventListener('click', end); addEventListener('keydown', end);
    (function type() {
      if (done) return;
      if (i >= lines.length) { setTimeout(end, 900); return; }
      const L = lines[i];
      if (j <= L.length) { out.textContent = lines.slice(0, i).join('\n') + (i ? '\n' : '') + L.slice(0, j); j += 3; setTimeout(type, 12); }
      else { i++; j = 0; setTimeout(type, 60); }
    })();
  }

  /* ---------- counters and loading bars that run when they come into view ---------- */
  function watch(sel, fn) {
    const els = document.querySelectorAll(sel); if (!els.length) return;
    if (!('IntersectionObserver' in window) || calm) { els.forEach(e => fn(e, true)); return; }
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { fn(en.target); io.unobserve(en.target); } }), { threshold: 0.35 });
    els.forEach(e => io.observe(e));
  }
  function counters() {
    watch('[data-count]', (e, now) => {
      const to = +e.dataset.count, t0 = performance.now(), dur = 1200;
      if (now) { e.textContent = to.toLocaleString(); return; }
      (function step(t) { const k = Math.min(1, (t - t0) / dur), v = Math.round(to * (1 - Math.pow(1 - k, 3))); e.textContent = v.toLocaleString(); if (k < 1) requestAnimationFrame(step); })(t0);
    });
    watch('.zbar', e => e.classList.add('go'));
  }

  /* ---------- the update log ---------- */
  function buildLog() {
    const list = $('logList'); if (!list) return;
    const tag = e => typeof e.slice === 'string' ? 'BUG FIX ' + e.slice.replace(/\D/g, '').padStart(2, '0') : e.slice ? 'SLICE ' + String(e.slice).padStart(2, '0') : (e.era === 'road' ? 'ROAD TO 2.0' : 'CLASSIC');
    D.log.forEach((e, n) => {
      const d = h('details', 'lg-e era-' + e.era.replace('.', '') + (n === 0 ? ' latest' : ''));
      d.dataset.era = e.era; d.dataset.text = (e.v + ' ' + e.title + ' ' + e.bullets.join(' ')).toLowerCase();
      if (n === 0) d.open = true;
      const s = h('summary');
      s.append(h('b', 'v', 'v' + e.v), h('span', 'dt', e.date.toUpperCase()), h('span', 'tg', tag(e)), h('span', 'tt', e.title));
      if (n === 0) s.append(h('span', 'new', '● LATEST'));
      const ul = h('ul'); e.bullets.forEach(b => ul.append(h('li', null, b)));
      d.append(s, ul); list.append(d);
    });
    const q = $('logQ'), tabs = document.querySelectorAll('.lg-tab'), count = $('logCount');
    let era = 'all';
    const apply = () => {
      const s = (q.value || '').trim().toLowerCase(); let n = 0;
      list.querySelectorAll('details').forEach(d => { const ok = (era === 'all' || d.dataset.era === era) && (!s || d.dataset.text.includes(s)); d.hidden = !ok; if (ok) { n++; if (s) d.open = true; } });
      count.textContent = n + (n === 1 ? ' version' : ' versions');
    };
    tabs.forEach(t => t.addEventListener('click', () => { era = t.dataset.era; tabs.forEach(x => x.classList.toggle('on', x === t)); apply(); }));
    q.addEventListener('input', apply);
    $('logOpen').addEventListener('click', () => { const all = [...list.querySelectorAll('details:not([hidden])')], open = all.some(d => !d.open); all.forEach(d => d.open = open); $('logOpen').textContent = open ? 'Close all' : 'Open all'; });
    apply();
  }

  /* ---------- screenshots and the lightbox ---------- */
  function buildShots() {
    const grid = $('shotGrid'); if (!grid) return;
    D.shots.forEach((s, i) => {
      const b = h('button', 'shot'); b.type = 'button'; b.setAttribute('aria-label', 'Open screenshot: ' + s.cap);
      const img = h('img'); img.src = s.src; img.alt = s.alt; img.loading = 'lazy'; img.decoding = 'async';
      b.append(img, h('span', 'cap', s.cap)); b.addEventListener('click', () => openBox(i)); grid.append(b);
    });
    const box = $('lbox'), im = $('lbImg'), cap = $('lbCap'); let at = 0;
    function show(i) { at = (i + D.shots.length) % D.shots.length; const s = D.shots[at]; im.src = s.src; im.alt = s.alt; cap.textContent = (at + 1) + ' / ' + D.shots.length + '  ·  ' + s.cap; }
    function openBox(i) { show(i); box.hidden = false; document.body.classList.add('lb-on'); $('lbClose').focus(); }
    function close() { box.hidden = true; document.body.classList.remove('lb-on'); }
    $('lbPrev').addEventListener('click', () => show(at - 1)); $('lbNext').addEventListener('click', () => show(at + 1)); $('lbClose').addEventListener('click', close);
    box.addEventListener('click', e => { if (e.target === box) close(); });
    addEventListener('keydown', e => { if (box.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(at - 1); if (e.key === 'ArrowRight') show(at + 1); });
    let x0 = null; box.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(at + (dx < 0 ? 1 : -1)); x0 = null; });
  }

  /* ---------- before and after ---------- */
  function compare() {
    document.querySelectorAll('.cmp').forEach(c => {
      const r = c.querySelector('input'), top = c.querySelector('.cmp-a');
      const set = v => { c.style.setProperty('--x', v + '%'); };
      r.addEventListener('input', () => set(r.value)); set(r.value);
    });
  }

  /* ---------- the scanlines can be switched off ---------- */
  function crt() {
    const b = $('crtBtn'); if (!b) return;
    const apply = on => { document.documentElement.classList.toggle('no-crt', !on); b.textContent = on ? 'CRT: ON' : 'CRT: OFF'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); };
    let on = ls.get('zc_crt') !== '0'; apply(on);
    b.addEventListener('click', () => { on = !on; ls.set('zc_crt', on ? '1' : '0'); apply(on); });
  }

  /* ---------- up up down down left right left right b a ---------- */
  function secret() {
    const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']; let k = 0;
    addEventListener('keydown', e => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      k = key === code[k] ? k + 1 : (key === code[0] ? 1 : 0);
      if (k === code.length) {
        k = 0; document.documentElement.classList.add('horde');
        const t = h('div', 'horde-msg', 'THE HORDE HEARD THAT'); document.body.append(t);
        setTimeout(() => { document.documentElement.classList.remove('horde'); t.remove(); }, 3200);
      }
    });
  }

  function go() { boot(); counters(); buildLog(); buildShots(); compare(); crt(); secret(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
